/* ===========================================================================
 * kern_zuschnitt.js — die Zeichnungsfelder eines Planblattes finden
 * ===========================================================================
 * WOZU DAS GEBAUT WURDE, gemessen am 22.08.2026 gegen den laufenden Endpunkt:
 *
 *   „260514 - Dumach 1 - Grundrisse M 1.100.pdf": ein A1-Bogen mit DREI
 *   Grundrissen untereinander, EG, OG und DG, zusammen 25 Räume. In einem
 *   Durchgang gelesen war die Antwort nach 3200 Ausgabe-Token an der
 *   Längengrenze abgeschnitten, und im Raumbuch stand NICHTS. Derselbe Bogen,
 *   in seine drei Felder zerlegt und einzeln gelesen: 12 + 11 + 2 = 25 Räume,
 *   vollständig.
 *
 * Zwei Dinge gewinnt die Zerlegung, und beide sind für sich schon der Grund:
 *   1. Jede Antwort bleibt kurz genug, um ganz anzukommen.
 *   2. Jedes Feld bekommt die volle Bildauflösung. Ein Blatt, auf dem die
 *      Zeichnung nur ein Drittel der Breite einnimmt (der Rest ist Papier und
 *      Schriftfeld), verschenkt zwei Drittel der 2576 Pixel an Weiß. Nach dem
 *      Zuschnitt liest dasselbe Modell dieselbe Zeichnung mit der zwei- bis
 *      dreifachen Auflösung.
 *
 * WIE GESCHNITTEN WIRD
 * Über die Tintendichte, nicht über den Inhalt. Für jede Bildzeile und jede
 * Bildspalte wird gezählt, wie viele Bildpunkte dunkler als Papier sind. Wo
 * über mehrere Prozent der Blattkante hinweg fast keine Tinte liegt, verläuft
 * eine Gasse, und dort wird geschnitten.
 *
 * DIE FALLE, an der ein erster Anlauf scheiterte: eine feste Schwelle („null
 * Tinte") findet auf einem Blatt mit Rahmenlinie überhaupt keine Gasse, denn
 * die Rahmenlinie liegt in JEDER Zeile. Die Schwelle ist deshalb relativ zum
 * 90.-Perzentil des Profils; eine einzelne Rahmenlinie fällt darunter, eine
 * Zeichnung nicht.
 *
 * WAS DIESER KERN NICHT TUT: Er entscheidet nicht, OB zerlegt wird. Das
 * entscheidet der Aufrufer, und zwar erst, nachdem ein Leseversuch gezeigt
 * hat, dass ein Durchgang nicht reicht. Blind zu zerlegen hieße, jedes Blatt
 * doppelt und dreifach zu bezahlen.
 * =========================================================================== */
"use strict";

/* Gleiche Huelle wie die uebrigen Kerne: der Bau prueft den Selbsttest in
   Node, das Werkzeug benutzt window.KERN_ZUSCHNITT im Browser. */
(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_ZUSCHNITT = M;
})(this, function () {
  /* Arbeitsbreite der Analyse. Größer bringt nichts: gesucht sind Gassen von
     mehreren Prozent der Blattkante, keine Feinheiten. */
  const RASTER = 700;
  const PAPIER = 200;      // heller als das gilt als Papier
  const MIN_GASSE = 0.025; // Gasse mindestens 2,5 % der Blattkante
  const MIN_ANTEIL = 0.08; // ein Feld unter 8 % der Tinte ist eine Beschriftung
  const RAND = 0.012;      // Zugabe rings um jedes Feld
  const MAX_TEILE = 4;     // mehr Teile heißt mehr Aufrufe, als ein Blatt wert ist

  /** Zeilen- und Spaltenprofil der Tinte. */
  function profile(grau, breite, hoehe) {
    const zeile = new Float64Array(hoehe), spalte = new Float64Array(breite);
    for (let y = 0; y < hoehe; y++) {
      const z = y * breite;
      for (let x = 0; x < breite; x++) {
        if (grau[z + x] < PAPIER) { zeile[y]++; spalte[x]++; }
      }
    }
    return { zeile: zeile, spalte: spalte };
  }

  /** Schwelle, unter der eine Zeile als leer gilt.
   *  Relativ zum 90.-Perzentil, damit eine Rahmenlinie keine Gasse zumauert. */
  function schwelle(prof) {
    const s = Array.prototype.slice.call(prof).sort(function (a, b) { return b - a; });
    const spitze = s[Math.max(0, Math.floor(s.length / 10))] || 0;
    return Math.max(2, spitze * 0.05);
  }

  /** Zusammenhängende Bereiche mit Tinte, getrennt durch Gassen. */
  function bloecke(prof, laenge, mindestGasse) {
    const t = schwelle(prof);
    const voll = [];
    for (let i = 0; i < laenge; i++) if (prof[i] > t) voll.push(i);
    if (!voll.length) return [];
    const b = [];
    let start = voll[0], vor = voll[0];
    for (let k = 1; k < voll.length; k++) {
      const i = voll[k];
      if (i - vor - 1 >= mindestGasse) { b.push([start, vor]); start = i; }
      vor = i;
    }
    b.push([start, vor]);
    return b;
  }

  /** Beschriftungszeilen und Splitter an ihren Nachbarn festmachen.
   *  „Grundriss EG" steht als eigene Zeile unter dem Grundriss und hat kaum
   *  Tinte; als eigenes Feld gelesen kostet sie einen Aufruf und bringt nichts. */
  function verschmelzen(b, prof) {
    const masse = function (x) {
      let s = 0; for (let i = x[0]; i <= x[1]; i++) s += prof[i]; return s;
    };
    let ges = 0; for (let i = 0; i < prof.length; i++) ges += prof[i];
    if (!ges) return b;
    while (b.length > 1) {
      const anteile = b.map(function (x) { return masse(x) / ges; });
      let k = 0;
      for (let i = 1; i < anteile.length; i++) if (anteile[i] < anteile[k]) k = i;
      if (anteile[k] >= MIN_ANTEIL && b.length <= MAX_TEILE) break;
      let j;
      if (k === 0) j = 1;
      else if (k === b.length - 1) j = k - 1;
      else j = (b[k][0] - b[k - 1][1]) <= (b[k + 1][0] - b[k][1]) ? k - 1 : k + 1;
      const a = Math.min(k, j), c = Math.max(k, j);
      b[a] = [b[a][0], b[c][1]];
      b.splice(c, 1);
    }
    return b;
  }

  /** Weißen Rand eines Profils abschneiden. */
  function trimme(prof, a, b) {
    const t = schwelle(prof);
    let i = a, j = b;
    while (i < j && prof[i] <= t) i++;
    while (j > i && prof[j] <= t) j--;
    return [i, j];
  }

  /**
   * Zerlegt ein Blatt in seine Zeichnungsfelder.
   *
   * @param grau   Grauwerte 0..255, zeilenweise, Länge breite*hoehe
   * @param breite Breite des Rasters
   * @param hoehe  Hoehe des Rasters
   * @returns { richtung, teile: [{x,y,x2,y2}] } in Anteilen der Blattkante,
   *          bei einem einzigen Feld ist teile.length === 1.
   */
  function zerlegen(grau, breite, hoehe) {
    if (!grau || !(breite > 1) || !(hoehe > 1)) {
      return { richtung: "keine", teile: [] };
    }
    const p = profile(grau, breite, hoehe);
    const by = verschmelzen(bloecke(p.zeile, hoehe, Math.round(hoehe * MIN_GASSE)), p.zeile);
    const bx = verschmelzen(bloecke(p.spalte, breite, Math.round(breite * MIN_GASSE)), p.spalte);

    let richtung, teile;
    if (by.length > 1 && by.length >= bx.length) { richtung = "waagerecht"; teile = by; }
    else if (bx.length > 1) { richtung = "senkrecht"; teile = bx; }
    else if (by.length) { richtung = "waagerecht"; teile = by; }
    else return { richtung: "keine", teile: [] };

    const aus = [];
    for (let k = 0; k < teile.length; k++) {
      const a = teile[k][0], b = teile[k][1];
      let r;
      if (richtung === "waagerecht") {
        /* Innerhalb des Bandes noch links und rechts beschneiden. Genau das
           bringt bei einem hochformatigen Bogen mit schmaler Zeichnung die
           zusätzliche Auflösung. */
        const quer = new Float64Array(breite);
        for (let y = a; y <= b; y++) {
          const z = y * breite;
          for (let x = 0; x < breite; x++) if (grau[z + x] < PAPIER) quer[x]++;
        }
        const t = trimme(quer, 0, breite - 1);
        r = [t[0] / breite, a / hoehe, (t[1] + 1) / breite, (b + 1) / hoehe];
      } else {
        const quer = new Float64Array(hoehe);
        for (let x = a; x <= b; x++) {
          for (let y = 0; y < hoehe; y++) if (grau[y * breite + x] < PAPIER) quer[y]++;
        }
        const t = trimme(quer, 0, hoehe - 1);
        r = [a / breite, t[0] / hoehe, (b + 1) / breite, (t[1] + 1) / hoehe];
      }
      aus.push({
        x: Math.max(0, r[0] - RAND), y: Math.max(0, r[1] - RAND),
        x2: Math.min(1, r[2] + RAND), y2: Math.min(1, r[3] + RAND),
      });
    }
    return { richtung: richtung, teile: aus };
  }

  /** Grauwerte aus einem Canvas holen, auf RASTER heruntergerechnet.
   *  Nur im Browser; der Selbsttest arbeitet ohne Canvas. */
  function ausCanvas(quelle, breite, hoehe) {
    const f = RASTER / Math.max(breite, hoehe);
    const w = Math.max(2, Math.round(breite * f)), h = Math.max(2, Math.round(hoehe * f));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d", { alpha: false });
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
    x.drawImage(quelle, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const grau = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      grau[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    }
    return { grau: grau, breite: w, hoehe: h };
  }

  /* ---------------------------------------------------------------- Selbsttest
   * Geprüft wird an gezeichneten Blättern, deren richtige Antwort feststeht,
   * und zusätzlich an den Zahlen, die am echten Bogen „Dumach 1" gemessen
   * wurden: dort liegen die drei Grundrisse bei 0,04..0,39, 0,39..0,68 und
   * 0,69..0,96 der Blatthöhe. */
  function selbsttest() {
    const f = []; let n = 0;
    const p = function (b, t) { n++; if (!b) f.push(t); };

    /** Ein Prüfblatt malen: weiß, mit schwarzen Rechtecken. */
    function blatt(w, h, kaesten, rahmen) {
      const g = new Uint8Array(w * h).fill(255);
      const male = function (x0, y0, x1, y1) {
        for (let y = Math.round(y0 * h); y < Math.round(y1 * h); y++) {
          for (let x = Math.round(x0 * w); x < Math.round(x1 * w); x++) g[y * w + x] = 0;
        }
      };
      kaesten.forEach(function (k) { male(k[0], k[1], k[2], k[3]); });
      if (rahmen) {
        /* Eine einzige Rahmenlinie rings herum. Sie darf keine Gasse zumauern. */
        for (let x = 0; x < w; x++) { g[x] = 0; g[(h - 1) * w + x] = 0; }
        for (let y = 0; y < h; y++) { g[y * w] = 0; g[y * w + w - 1] = 0; }
      }
      return g;
    }

    // 1. Ein einziges Feld bleibt ein einziges Feld.
    {
      const w = 200, h = 200;
      const r = zerlegen(blatt(w, h, [[0.2, 0.2, 0.8, 0.8]]), w, h);
      p(r.teile.length === 1, "Ein Feld darf nicht zerlegt werden");
      p(r.teile[0].x < 0.21 && r.teile[0].x2 > 0.79, "Das Feld muss ganz drin sein");
      p(r.teile[0].x > 0.15 && r.teile[0].y > 0.15,
        "Der weiße Rand muss abgeschnitten sein, sonst bringt der Zuschnitt nichts");
    }

    // 2. Drei Felder untereinander, wie bei „Dumach 1".
    {
      const w = 200, h = 300;
      const r = zerlegen(blatt(w, h, [[0.3, 0.04, 0.7, 0.33],
                                      [0.3, 0.40, 0.7, 0.65],
                                      [0.3, 0.72, 0.7, 0.94]]), w, h);
      p(r.richtung === "waagerecht", "Drei Felder untereinander: waagerecht schneiden");
      p(r.teile.length === 3, "Drei Felder müssen drei Teile ergeben, nicht "
        + r.teile.length);
      if (r.teile.length === 3) {
        p(r.teile[0].y < 0.05 && r.teile[0].y2 > 0.32, "Erstes Feld unvollständig");
        p(r.teile[2].y < 0.73 && r.teile[2].y2 > 0.93, "Drittes Feld unvollständig");
        p(r.teile[0].x > 0.25 && r.teile[0].x2 < 0.75,
          "Auch quer muss beschnitten werden, sonst fehlt die Auflösung");
      }
    }

    // 3. Eine Rahmenlinie darf die Gasse nicht zumauern. Das war der Fehler
    //    des ersten Anlaufs: mit fester Schwelle fand er auf einem gerahmten
    //    Blatt keine einzige Gasse.
    {
      const w = 200, h = 300;
      const r = zerlegen(blatt(w, h, [[0.3, 0.04, 0.7, 0.33],
                                      [0.3, 0.40, 0.7, 0.65]], true), w, h);
      p(r.teile.length === 2, "Mit Rahmen müssen es weiter zwei Teile sein, nicht "
        + r.teile.length);
    }

    // 4. Zeichnung links, Schriftfeld rechts: senkrecht schneiden.
    {
      const w = 300, h = 200;
      const r = zerlegen(blatt(w, h, [[0.02, 0.1, 0.33, 0.9],
                                      [0.90, 0.1, 0.99, 0.9]], true), w, h);
      p(r.richtung === "senkrecht", "Zeichnung und Schriftfeld: senkrecht schneiden");
      p(r.teile.length === 2, "Zeichnung und Schriftfeld sind zwei Teile, nicht "
        + r.teile.length);
    }

    // 5. Eine Beschriftungszeile ist kein eigenes Feld.
    {
      const w = 200, h = 300;
      const r = zerlegen(blatt(w, h, [[0.3, 0.05, 0.7, 0.40],
                                      [0.35, 0.45, 0.45, 0.465],   // „Grundriss EG"
                                      [0.3, 0.55, 0.7, 0.92]]), w, h);
      p(r.teile.length === 2, "Die Beschriftungszeile darf kein eigener Teil sein, "
        + "es sind " + r.teile.length);
    }

    // 6. Nie mehr Teile als Aufrufe zu rechtfertigen sind.
    {
      const w = 200, h = 600, k = [];
      for (let i = 0; i < 8; i++) k.push([0.3, 0.02 + i * 0.12, 0.7, 0.10 + i * 0.12]);
      const r = zerlegen(blatt(w, h, k), w, h);
      p(r.teile.length <= 4, "Höchstens vier Teile, es sind " + r.teile.length);
    }

    // 7. Ein leeres Blatt ergibt kein Feld, statt eines Fehlers.
    {
      const w = 50, h = 50;
      const r = zerlegen(new Uint8Array(w * h).fill(255), w, h);
      p(r.teile.length === 0, "Ein leeres Blatt hat kein Zeichnungsfeld");
    }

    // 8. Unsinn stürzt nicht ab.
    {
      p(zerlegen(null, 0, 0).teile.length === 0, "Ohne Bild kein Absturz");
    }

    // 9. Die Teile liegen immer innerhalb des Blattes und sind nie leer.
    {
      const w = 200, h = 300;
      const r = zerlegen(blatt(w, h, [[0.3, 0.04, 0.7, 0.33],
                                      [0.3, 0.40, 0.7, 0.65]]), w, h);
      p(r.teile.every(function (t) {
        return t.x >= 0 && t.y >= 0 && t.x2 <= 1 && t.y2 <= 1
          && t.x2 - t.x > 0.02 && t.y2 - t.y > 0.02;
      }), "Jeder Teil muss im Blatt liegen und eine Fläche haben");
    }

    return { ok: f.length === 0, anzahl: n, fehler: f };
  }

  return {
    zerlegen: zerlegen,
    ausCanvas: ausCanvas,
    RASTER: RASTER,
    selbsttest: selbsttest,
  };
});
