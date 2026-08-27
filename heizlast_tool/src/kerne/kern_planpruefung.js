/* ===========================================================================
 * kern_planpruefung.js — Eignungsprüfung einer Planunterlage
 * ===========================================================================
 * Prüft VOR der Arbeit, ob sich mit dieser Unterlage überhaupt rechnen lässt.
 * Ein Plan, aus dem Maße nicht sicher abgelesen werden können, führt zu einer
 * Heizlast, deren Fehler später niemand mehr sieht. Deshalb sperrt das
 * Werkzeug in diesem Fall, statt zu warnen.
 *
 * Läuft vollständig lokal auf den Bilddaten, ohne Netz und ohne Modell.
 * Eingabe ist ein Objekt wie ImageData: { data: Uint8ClampedArray (RGBA),
 * width, height }. Damit ist die Prüfung in Node testbar.
 *
 * Urteile:  geeignet         Arbeit kann beginnen
 *           eingeschraenkt   nutzbar, aber mit benannten Einschränkungen
 *           ungeeignet       das Werkzeug sperrt
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_PLANPRUEFUNG = M;
})(this, function () {

  /* Schwellen. Kalibriert an Testbildern, siehe validierung/planpruefung_test.js */
  const S = {
    KANTE_MIN: 600,          // kürzeste zulässige Bildkante in Pixel
    KANTE_GUT: 900,
    SCHAERFE_MIN: 12,        // Varianz der Laplace-Antwort
    SCHAERFE_GUT: 40,
    KONTRAST_MIN: 90,        // Spanne zwischen 2. und 98. Helligkeitsperzentil
    KONTRAST_GUT: 150,
    TINTE_MIN: 0.004,        // Anteil dunkler Pixel: darunter ist nichts drauf
    TINTE_MAX: 0.55,         // darüber ist es kein Plan, sondern eine Fläche
    SCHRAEG_MAX: 1.5,        // Grad Abweichung von der Waagerechten
    SCHRAEG_GUT: 0.6,
    PXM_MIN: 15,             // Pixel je Meter nach dem Setzen des Maßstabs
    PXM_GUT: 30,
  };

  function grau(bild) {
    const n = bild.width * bild.height;
    const g = new Float32Array(n);
    const d = bild.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
    }
    return g;
  }

  /** Varianz der Laplace-Antwort: das übliche Maß für Bildschärfe. */
  function schaerfe(g, w, h) {
    let summe = 0, summeQ = 0, n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const l = -4 * g[i] + g[i - 1] + g[i + 1] + g[i - w] + g[i + w];
        summe += l; summeQ += l * l; n++;
      }
    }
    if (!n) return 0;
    const m = summe / n;
    return summeQ / n - m * m;
  }

  /** Kontrast als Abstand zwischen Tinte und Papier.
   *  Weder Standardabweichung noch Perzentile taugen bei Strichzeichnungen:
   *  über neunzig Prozent der Fläche sind Papier, der Tintenanteil schwankt
   *  je nach Zeichnung zwischen einem und zehn Prozent. Deshalb wird die
   *  Schwelle nach Otsu bestimmt, die Helligkeit beider Klassen gemittelt
   *  und deren Abstand als Kontrast gewertet. Das misst genau das, worauf es
   *  ankommt: wie deutlich sich die Linien vom Untergrund abheben. */
  function kontrastUndTinte(g) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < g.length; i++) {
      const v = g[i] < 0 ? 0 : (g[i] > 255 ? 255 : g[i]);
      hist[Math.round(v)]++;
    }
    const n = g.length;
    let summeAlle = 0;
    for (let v = 0; v < 256; v++) summeAlle += v * hist[v];

    // Otsu: die Schwelle mit der größten Varianz zwischen den Klassen
    let bestS = 128, bestV = -1, wB = 0, sB = 0;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = n - wB;
      if (wF === 0) break;
      sB += t * hist[t];
      const mB = sB / wB, mF = (summeAlle - sB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > bestV) { bestV = v; bestS = t; }
    }
    let nD = 0, sD = 0, nH = 0, sH = 0;
    for (let v = 0; v < 256; v++) {
      if (v <= bestS) { nD += hist[v]; sD += v * hist[v]; }
      else { nH += hist[v]; sH += v * hist[v]; }
    }
    const mD = nD ? sD / nD : 0, mH = nH ? sH / nH : 255;
    return { kontrast: mH - mD, tinte: nD / n, mittel: summeAlle / n,
             schwelle: bestS, tinteHell: mD, papier: mH };
  }

  /** Schräglage: Wie stark weichen die dominanten Linien von der Waagerechten ab?
   *  Gemessen über die Zeilen- und Spaltenenergie bei kleinen Drehwinkeln. */
  /** Liefert { grad, rand }.
   *  rand = true heisst: das Maximum liegt am Rand des Suchbereichs, die
   *  Schaetzung ist damit NICHT aussagekraeftig.
   *
   *  WARUM DIESE UNTERSCHEIDUNG NOETIG IST (27.08.2026, aus der unabhaengigen
   *  Durchsicht): die Schaetzung sucht das Maximum der Zeilenvarianz. Ein Blatt
   *  ohne Linienstruktur -- leeres Deckblatt, Foto gegen das Licht,
   *  durchgelaufener Scan -- hat kein Maximum; die Suche liefert dann den Rand
   *  ihres Bereichs, und daraus wurde der Satz "steht um rund 3,0 Grad schief"
   *  samt Rat, den Plan gerade einzuscannen. Eine erfundene Gradzahl.
   *  Der erste Versuch hing die Unterdrueckung am Tintenanteil. Das griff nur
   *  beim zu HELLEN Blatt: ein gleichmaessig dunkles Blatt hat nach Otsu einen
   *  Tintenanteil um 48 Prozent und lief damit durch.
   *  Der Suchbereich reicht deshalb jetzt bis 4 Grad, beurteilt aber nur bis
   *  3 Grad. Eine echte Schraeglage von 3 Grad liegt damit INNEN und wird
   *  gefunden; Rauschen laeuft in den Rand bei 4 Grad und wird als nicht
   *  beurteilbar gekennzeichnet. */
  function schraeglage(g, w, h) {
    const winkel = [-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0,
                    0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
    const RAND = 4;
    let bester = 0, besteEnergie = -1;
    const schritt = Math.max(1, Math.floor(Math.min(w, h) / 400));
    for (const grad of winkel) {
      const t = Math.tan(grad * Math.PI / 180);
      const zeilen = new Float64Array(h);
      for (let y = 0; y < h; y += schritt) {
        let s = 0;
        for (let x = 0; x < w; x += schritt) {
          const yy = Math.round(y + (x - w / 2) * t);
          if (yy < 0 || yy >= h) continue;
          s += 255 - g[yy * w + x];
        }
        zeilen[y] = s;
      }
      // Energie = Varianz der Zeilensummen: bei gerader Ausrichtung am größten
      let sum = 0, n = 0;
      for (let y = 0; y < h; y += schritt) { sum += zeilen[y]; n++; }
      const m = sum / Math.max(1, n);
      let v = 0;
      for (let y = 0; y < h; y += schritt) v += (zeilen[y] - m) * (zeilen[y] - m);
      v /= Math.max(1, n);
      if (v > besteEnergie) { besteEnergie = v; bester = grad; }
    }
    return { grad: Math.abs(bester), rand: Math.abs(bester) >= RAND - 1e-9 };
  }

  /* ------------------------------------------------------------------ */
  function pruefeBild(bild) {
    const w = bild.width, h = bild.height;
    const befunde = [];
    const g = grau(bild);
    const kt = kontrastUndTinte(g);
    const sch = schaerfe(g, w, h);
    const sg = schraeglage(g, w, h);
    const kurz = Math.min(w, h);

    function befund(id, titel, stufe, text, wert) {
      befunde.push({ id: id, titel: titel, stufe: stufe, text: text, wert: wert });
    }

    // Auflösung
    if (kurz < S.KANTE_MIN) {
      befund("aufloesung", "Auflösung", "sperre",
        "Die kürzere Bildkante hat nur " + kurz + " Pixel. Unter " + S.KANTE_MIN
        + " Pixel sind Maßketten nicht sicher lesbar. Plan größer einscannen oder "
        + "das Bildschirmfoto größer aufnehmen.", kurz);
    } else if (kurz < S.KANTE_GUT) {
      befund("aufloesung", "Auflösung", "einschraenkung",
        "Die kürzere Bildkante hat " + kurz + " Pixel. Das reicht für Raumumrisse, "
        + "kleine Maßzahlen können aber schwer lesbar sein.", kurz);
    } else {
      befund("aufloesung", "Auflösung", "gut", kurz + " Pixel kürzere Kante.", kurz);
    }

    // Inhalt überhaupt vorhanden
    if (kt.tinte < S.TINTE_MIN) {
      befund("inhalt", "Bildinhalt", "sperre",
        "Das Bild ist fast vollständig hell. Es ist keine Zeichnung erkennbar.",
        kt.tinte);
    } else if (kt.tinte > S.TINTE_MAX) {
      befund("inhalt", "Bildinhalt", "sperre",
        "Das Bild ist überwiegend dunkel. Das ist typisch für ein Foto oder einen "
        + "misslungenen Scan, nicht für eine Zeichnung.", kt.tinte);
    } else {
      befund("inhalt", "Bildinhalt", "gut",
        Math.round(kt.tinte * 1000) / 10 + " Prozent Zeichnungsanteil.", kt.tinte);
    }

    // Schärfe
    if (sch < S.SCHAERFE_MIN) {
      befund("schaerfe", "Schärfe", "sperre",
        "Das Bild ist zu unscharf (Kennwert " + Math.round(sch) + ", nötig mindestens "
        + S.SCHAERFE_MIN + "). Linien und Maßzahlen lassen sich nicht zuverlässig "
        + "unterscheiden.", sch);
    } else if (sch < S.SCHAERFE_GUT) {
      befund("schaerfe", "Schärfe", "einschraenkung",
        "Das Bild ist weich (Kennwert " + Math.round(sch) + "). Maßzahlen vor der "
        + "Übernahme einzeln gegenlesen.", sch);
    } else {
      befund("schaerfe", "Schärfe", "gut", "Kennwert " + Math.round(sch) + ".", sch);
    }

    // Kontrast
    if (kt.kontrast < S.KONTRAST_MIN) {
      befund("kontrast", "Kontrast", "sperre",
        "Der Kontrast ist zu gering (Kennwert " + Math.round(kt.kontrast)
        + "). Bei Blaupausen hilft es, den Scan im Kontrast aufzubereiten.",
        kt.kontrast);
    } else if (kt.kontrast < S.KONTRAST_GUT) {
      befund("kontrast", "Kontrast", "einschraenkung",
        "Der Kontrast ist schwach (Kennwert " + Math.round(kt.kontrast) + ").",
        kt.kontrast);
    } else {
      befund("kontrast", "Kontrast", "gut", "Kennwert " + Math.round(kt.kontrast) + ".",
        kt.kontrast);
    }

    /* Schräglage. Auf einem Blatt ohne Zeichnung ist sie nicht beurteilbar:
     * die Schätzung sucht das Maximum der Zeilenvarianz, und ohne Tinte gibt es
     * keins — sie liefert dann den Rand des Suchbereichs. Ein leeres Deckblatt
     * bekam deshalb den Satz "steht um rund 3,0 Grad schief" samt Rat, den Plan
     * gerade einzuscannen. Gesperrt war es ohnehin wegen des fehlenden
     * Bildinhalts; die Zeile war nur irreführend. Ohne Tinte wird die
     * Ausrichtung daher nicht beurteilt, statt eine Zahl zu erfinden. */
    if (sg.rand) {
      /* kein Befund zur Ausrichtung: nicht beurteilbar.
         Die Bedingung haengt an der AUSSAGEKRAFT der Schaetzung (Maximum am
         Rand des Suchbereichs), nicht am Tintenanteil. Begruendung und
         Vorgeschichte stehen bei schraeglage(). Solche Blaetter sind ohnehin
         gesperrt -- wegen Bildinhalt oder Kontrast --, nur eben nicht mit
         einer erfundenen Gradzahl. */
    } else if (sg.grad > S.SCHRAEG_MAX) {
      befund("schraeg", "Ausrichtung", "sperre",
        "Die Zeichnung steht um rund " + sg.grad.toFixed(1) + " Grad schief. Beim Umfahren "
        + "von Räumen verzerrt das die Flächen. Plan gerade einscannen oder das Bild "
        + "vorher drehen.", sg.grad);
    } else if (sg.grad > S.SCHRAEG_GUT) {
      befund("schraeg", "Ausrichtung", "einschraenkung",
        "Die Zeichnung steht leicht schief (rund " + sg.grad.toFixed(1)
        + " Grad).", sg.grad);
    } else {
      befund("schraeg", "Ausrichtung", "gut", "gerade ausgerichtet.", sg.grad);
    }

    return zusammenfassen(befunde);
  }

  /** Prüft zusätzlich den gesetzten Maßstab. */
  function pruefeMassstab(pxProMeter) {
    const befunde = [];
    if (!pxProMeter || !isFinite(pxProMeter) || pxProMeter <= 0) {
      befunde.push({ id: "massstab", titel: "Maßstab", stufe: "sperre",
        text: "Es ist kein Maßstab gesetzt. Ohne ihn hat keine Fläche eine Bedeutung.",
        wert: 0 });
    } else if (pxProMeter < S.PXM_MIN) {
      befunde.push({ id: "massstab", titel: "Maßstab", stufe: "sperre",
        text: "Nur " + pxProMeter.toFixed(0) + " Pixel je Meter. Ein Pixel entspricht "
          + (100 / pxProMeter).toFixed(0) + " Zentimetern; damit lassen sich Räume nicht "
          + "brauchbar umfahren.", wert: pxProMeter });
    } else if (pxProMeter < S.PXM_GUT) {
      befunde.push({ id: "massstab", titel: "Maßstab", stufe: "einschraenkung",
        text: pxProMeter.toFixed(0) + " Pixel je Meter, ein Pixel entspricht "
          + (100 / pxProMeter).toFixed(0) + " Zentimetern. Für Raumflächen ausreichend, "
          + "für einzelne Bauteilbreiten grenzwertig.", wert: pxProMeter });
    } else {
      befunde.push({ id: "massstab", titel: "Maßstab", stufe: "gut",
        text: pxProMeter.toFixed(0) + " Pixel je Meter (" + (100 / pxProMeter).toFixed(1)
          + " Zentimeter je Pixel).", wert: pxProMeter });
    }
    return zusammenfassen(befunde);
  }

  function zusammenfassen(befunde) {
    const sperren = befunde.filter(function (b) { return b.stufe === "sperre"; });
    const eins = befunde.filter(function (b) { return b.stufe === "einschraenkung"; });
    return {
      befunde: befunde,
      sperren: sperren,
      urteil: sperren.length ? "ungeeignet" : (eins.length ? "eingeschraenkt" : "geeignet"),
      nutzbar: sperren.length === 0,
    };
  }

  /** Führt mehrere Teilprüfungen zusammen. */
  function verbinden() {
    const alle = [];
    for (let i = 0; i < arguments.length; i++) {
      if (arguments[i] && arguments[i].befunde) alle.push.apply(alle, arguments[i].befunde);
    }
    return zusammenfassen(alle);
  }

  /* ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    /* Testbilder werden künstlich erzeugt, damit der Test ohne Datei auskommt. */
    function bild(w, h, maler) {
      const d = new Uint8ClampedArray(w * h * 4).fill(255);
      for (let i = 3; i < d.length; i += 4) d[i] = 255;
      const setz = function (x, y, v) {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = (y * w + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
      };
      maler(setz, w, h);
      return { data: d, width: w, height: h };
    }
    /* Ein Plan: scharfe waagerechte und senkrechte Linien */
    function plan(w, h, dicke, wert, versatz) {
      return bild(w, h, function (setz) {
        const d = dicke || 3, v = wert === undefined ? 0 : wert, sv = versatz || 0;
        for (let x = 40; x < w - 40; x++) {
          for (let k = 0; k < d; k++) {
            const dy = Math.round((x - w / 2) * Math.tan(sv * Math.PI / 180));
            setz(x, 60 + k + dy, v); setz(x, h - 60 + k + dy, v);
            setz(x, Math.round(h / 2) + k + dy, v);
          }
        }
        for (let y = 60; y < h - 60; y++) {
          for (let k = 0; k < d; k++) {
            setz(40 + k, y, v); setz(w - 40 + k, y, v); setz(Math.round(w / 2) + k, y, v);
          }
        }
      });
    }

    // 1  guter Plan
    const gut = pruefeBild(plan(1400, 1000, 3, 0, 0));
    if (gut.urteil !== "geeignet") {
      f.push("Guter Plan wird nicht als geeignet erkannt: "
        + gut.befunde.filter((b) => b.stufe !== "gut").map((b) => b.titel + " " + b.stufe).join(", "));
    }

    // 2  zu klein
    const klein = pruefeBild(plan(500, 380, 2, 0, 0));
    if (klein.nutzbar) f.push("Zu kleines Bild muss sperren");
    if (!klein.sperren.some((b) => b.id === "aufloesung")) f.push("Auflösungssperre fehlt");

    // 3  leeres Blatt
    const leer = pruefeBild(bild(1200, 900, function () {}));
    if (leer.nutzbar) f.push("Leeres Blatt muss sperren");

    // 4  kontrastarm (helles Grau auf Weiß)
    const blass = pruefeBild(plan(1400, 1000, 3, 225, 0));
    if (blass.nutzbar) f.push("Kontrastarmes Bild muss sperren");

    // 5  schief
    const schief = pruefeBild(plan(1400, 1000, 3, 0, 2.5));
    if (schief.nutzbar) f.push("Um 2,5 Grad verdrehtes Bild muss sperren");
    if (!schief.sperren.some((b) => b.id === "schraeg")) {
      f.push("Schräglage wird nicht erkannt, gemeldet: "
        + schief.befunde.map((b) => b.id + ":" + b.stufe).join(","));
    }

    // 6  Maßstab
    if (pruefeMassstab(null).nutzbar) f.push("Fehlender Maßstab muss sperren");
    if (pruefeMassstab(8).nutzbar) f.push("8 Pixel je Meter muss sperren");
    if (pruefeMassstab(20).urteil !== "eingeschraenkt") f.push("20 Pixel je Meter ist eingeschränkt");
    if (pruefeMassstab(50).urteil !== "geeignet") f.push("50 Pixel je Meter ist geeignet");

    // 7  Zusammenführen
    const v = verbinden(gut, pruefeMassstab(50));
    if (!v.nutzbar) f.push("Guter Plan mit gutem Maßstab muss nutzbar sein");
    const v2 = verbinden(gut, pruefeMassstab(5));
    if (v2.nutzbar) f.push("Guter Plan mit unbrauchbarem Maßstab muss sperren");

    return { ok: f.length === 0, fehler: f, anzahl: 12 };
  }

  return { pruefeBild: pruefeBild, pruefeMassstab: pruefeMassstab,
           verbinden: verbinden, selbsttest: selbsttest, SCHWELLEN: S };
});
