/* ===========================================================================
 * kern_baujahrprobe.js — was das angenommene Baujahr an der Zahl ändert
 * ===========================================================================
 * WERK.E Energie-Effizienz-Beratung. DOM-frei, ohne Abhängigkeiten, in Node
 * und im Browser lauffähig.
 *
 * WARUM ES DIESES MODUL GIBT
 *
 * Auf dem Blatt „BV 2-0887 Ziolkowski" steht kein Baujahr. Das Werkzeug leitet
 * es aus dem Plandatum ab (2022), holt daraus die U-Werte der Typologie und
 * rechnet 5,98 kW. Daneben stand bisher zweierlei, und beides war zu leise:
 *
 *   1. Der Quervergleich verglich diese 5,98 kW gegen den Typologie-Kennwert
 *      DERSELBEN Baualtersklasse und meldete „im Erwartungsbereich". Sollwert
 *      und Istwert kamen aus derselben Annahme. Eine solche Zeile prüft
 *      nichts, sie bestätigt.
 *   2. Die Bandbreite daneben (5,44 bis 6,77 kW) deckt die Streuung INNERHALB
 *      einer Baualtersklasse ab. Ist die Klasse falsch gewählt, liegt das
 *      Ergebnis ausserhalb dieser Spanne, und zwar um ein Vielfaches ihrer
 *      Breite. Die Spanne sagt das nicht von selbst.
 *
 * Die Wirkung des angenommenen Baujahrs gehört deshalb nicht beschrieben,
 * sondern gerechnet. Das kostet einen Kernlauf je Baualtersklasse, also
 * Millisekunden, und liefert den einen Satz, der dem Kollegen fehlt:
 *
 *      „Wäre das Gebäude aus der Klasse X, wären es Y kW statt Z."
 *
 * Die Zahlen dafür rechnet dieses Modul; hier steht keine, weil eine Zahl
 * über ein Haus aus dem Durchlauf kommt und nicht aus einem Kommentar.
 *
 * WAS GENAU VERÄNDERT WIRD, UND WAS NICHT
 *
 * Verändert wird ausschliesslich der U-Wert jener Bauteile, deren U-Wert aus
 * der Typologie stammt (Kennzeichen `typologie === true`, gesetzt beim Anlegen
 * der Bauteiltypen aus DATEN_TYPOLOGIE.startwerte). Alles andere bleibt, wie
 * es ist: Flächen, Höhen, Volumen, Norm-Aussentemperatur, Luftdichtheit,
 * Wärmebrückenzuschlag, Raumtemperaturen, unbeheizte Bereiche. Das ist genau
 * das, was im Werkzeug geschieht, wenn jemand das Baujahrfeld ändert — nicht
 * mehr und nicht weniger.
 *
 * Ein Bauteil mit belegtem U-Wert (Schichtaufbau, Nachweis, von Hand
 * eingetragen) wird NICHT umgestellt. Es trägt sein Baujahr nicht in sich,
 * sondern seinen Aufbau. Wie viel Fläche davon unberührt bleibt, steht im
 * Ergebnis (`flaeche_typologie` gegen `flaeche_huelle`) — sonst läse sich der
 * Fächer breiter, als er ist.
 *
 * WOHER DIE JAHRESZAHLEN KOMMEN
 *
 * Erfunden wird keine. Gerechnet wird gegen JEDE Baualtersklasse der
 * hinterlegten Typologie, vertreten durch ihr letztes Jahr (die Klasse
 * „2016 und später" durch das Ende der Geltung, DATEN_TYPOLOGIE.GELTUNG_BIS).
 * Die Klassengrenzen stehen in der Quelle, nicht hier.
 *
 * DIE PROBE AUF SICH SELBST
 *
 * Die Klasse, in der das angesetzte Baujahr liegt, muss im Fächer exakt den
 * Punktwert der laufenden Rechnung ergeben — dasselbe Projekt, dieselben
 * U-Werte, derselbe Kern. Tut sie es nicht, ist an einem Bauteil von Hand
 * etwas geändert worden, das noch als Typologiewert gekennzeichnet ist. Dann
 * steht die Abweichung im Ergebnis (`basis_abweichung_w`) statt still im Weg.
 * ======================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_BAUJAHRPROBE = M;
})(this, function () {

  function zahl(x, d) {
    const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (d === undefined ? 0 : d);
  }
  function rnd(x, n) { const f = Math.pow(10, n || 0); return Math.round(x * f) / f; }
  function kopie(o) { return JSON.parse(JSON.stringify(o)); }
  function de(x, n) {
    const k = n === undefined ? 1 : n;
    return (Math.round(x * Math.pow(10, k)) / Math.pow(10, k)).toFixed(k).replace(".", ",");
  }
  function jetzt() {
    return (typeof performance !== "undefined" && performance.now)
      ? performance.now() : Date.now();
  }

  function holeKern(opt) {
    if (opt && opt.kern) return opt.kern;
    if (typeof window !== "undefined" && window.KERN_HEIZLAST) return window.KERN_HEIZLAST;
    try { return require("./kern_heizlast_norm.js"); } catch (e) { return null; }
  }
  function holeTypologie(opt) {
    if (opt && opt.typologie) return opt.typologie;
    if (typeof window !== "undefined" && window.DATEN_TYPOLOGIE) return window.DATEN_TYPOLOGIE;
    try { return require("../daten/daten_typologie.js"); } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------ *
   * 1  Die Baualtersklassen, gegen die gerechnet wird
   * ------------------------------------------------------------------ */

  /** Je Klasse der Typologie ein Vertreter: ihr letztes Jahr. Die offene
   *  jüngste Klasse wird durch das Ende der Geltung vertreten — weiter reicht
   *  die Tabelle nicht, und weiter zu rechnen hiesse, sie zu verlängern. */
  function vertreter(DT) {
    const raus = [];
    (DT && DT.TYPOLOGIE_EFH ? DT.TYPOLOGIE_EFH : []).forEach(function (t) {
      let j = null;
      if (Number.isFinite(t.bis)) j = t.bis;
      else if (Number.isFinite(DT.GELTUNG_BIS)) j = DT.GELTUNG_BIS;
      else if (Number.isFinite(t.von)) j = t.von;
      if (j === null) return;
      raus.push({ jahr: j, code: t.code, label: t.label });
    });
    return raus;
  }

  /** U-Werte einer Klasse, nach dem Namen des Bauteiltyps.
   *  Die Namen sind dieselben, unter denen DATEN_TYPOLOGIE.startwerte die
   *  Bauteiltypen anlegt; damit trifft die Umstellung genau die Typen, die aus
   *  der Typologie entstanden sind. */
  function uNachName(DT, jahr, art) {
    const satz = DT.zumBaujahr(jahr, art);
    const sw = (satz && DT.startwerte) ? DT.startwerte(satz) : [];
    const karte = {};
    sw.forEach(function (x) { if (karte[x.name] === undefined) karte[x.name] = x.U; });
    return { satz: satz, u: karte, anzahl: sw.length };
  }

  /* ------------------------------------------------------------------ *
   * 2  Ein Projekt auf ein anderes Baujahr umstellen
   * ------------------------------------------------------------------ */

  /** Alle Bauteile eines Kernprojekts, mit dem Ort, an dem sie stehen. */
  function alleBauteile(p) {
    const raus = [];
    (p.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) { raus.push(bt); });
    });
    (p.zonen || []).forEach(function (z) {
      (z.huelle || []).forEach(function (bt) { raus.push(bt); });
    });
    return raus;
  }

  /** Trägt dieses Bauteil einen U-Wert aus der Typologie? */
  function ausTypologie(bt) {
    return bt && (bt.typologie === true || bt.typ_typologie === true);
  }

  /** Der Name, unter dem der U-Wert in der Typologie nachzuschlagen ist.
   *  Massgebend ist der Name des BAUTEILTYPS, nicht der des einzelnen
   *  Bauteils: der Typ ist aus startwerte() entstanden und heisst wie dort,
   *  das Bauteil kann im Raumbuch umbenannt worden sein. */
  function schluesselname(bt) {
    return String((bt && (bt.typ_name || bt.name)) || "").trim();
  }

  /** Setzt in einer Kopie die U-Werte aller Typologie-Bauteile auf die Werte
   *  der genannten Klasse. Liefert die Zahl der geänderten Bauteile. */
  function umstellen(ziel, karte) {
    let n = 0;
    alleBauteile(ziel).forEach(function (bt) {
      if (!ausTypologie(bt)) return;
      const u = karte[schluesselname(bt)];
      if (!Number.isFinite(u)) return;
      bt.U = u;
      n += 1;
    });
    return n;
  }

  /* ------------------------------------------------------------------ *
   * 3  Der Fächer
   * ------------------------------------------------------------------ */

  /**
   * Rechnet dasselbe Projekt gegen jede Baualtersklasse der Typologie.
   *
   * optionen:
   *   kern        Rechenkern (sonst global / require)
   *   typologie   Typologiedaten (sonst global / require)
   *   baujahr     angesetztes Baujahr (sonst p.meta.baujahr)
   *   gebaeudeart sonst p.meta.gebaeudeart
   *   angenommen  true, wenn das Baujahr eine Annahme ist (nur für den Text)
   *   herkunft    kurzer Satz, woher die Annahme stammt (nur für den Text)
   *   ohne_baujahr  true, wenn GAR KEIN Baujahr bekannt ist und `baujahr` nur
   *               die Rückfallklasse vertritt (daten_typologie.ohneBaujahr).
   *               Ändert allein den ersten Satz: es steht dann kein Baujahr
   *               da, das jemand angesetzt hätte, sondern eine Klasse, mit
   *               der ersatzweise gerechnet wird. Gerechnet wird identisch.
   */
  function faecher(projekt, optionen) {
    const opt = optionen || {};
    const t0 = jetzt();
    const K = holeKern(opt);
    const DT = holeTypologie(opt);
    const p = projekt || {};
    if (!K || typeof K.rechne !== "function") {
      return { ok: false, grund: "kein_kern", text: "Der Rechenkern ist nicht erreichbar." };
    }
    if (!DT || typeof DT.zumBaujahr !== "function") {
      return { ok: false, grund: "keine_typologie",
               text: "Die Gebäudetypologie ist nicht erreichbar." };
    }
    const art = String(opt.gebaeudeart || (p.meta && p.meta.gebaeudeart) || "efh").toLowerCase();
    const jahr = parseInt(opt.baujahr !== undefined ? opt.baujahr
                          : (p.meta && p.meta.baujahr), 10);
    if (!Number.isFinite(jahr)) {
      return { ok: false, grund: "kein_baujahr",
               text: "Ohne angesetztes Baujahr gibt es nichts gegenzurechnen." };
    }
    /* Für ein Nichtwohngebäude nennt eine Wohngebäudetypologie keine U-Werte.
       Dann ist der Fächer nicht schmal, sondern es gibt ihn nicht. */
    const eigen = DT.zumBaujahr(jahr, art);
    if (!eigen || eigen.gilt !== true) {
      return { ok: false, grund: (eigen && eigen.grund) || "ausserhalb_geltung",
               text: (eigen && eigen.fundstelle)
                 || "Für dieses Gebäude sind keine Typologiewerte hinterlegt." };
    }

    const basis = K.rechne(p);
    const punkt = zahl(basis.phi_gebaeude, 0);
    const A = zahl(basis.A_gesamt, 0);
    const wfl = zahl(p.meta && p.meta.wohnflaeche, 0);
    const bezugFlaeche = wfl > 0 ? wfl : A;
    const bezug = wfl > 0 ? "Wohnfläche" : "Summe der Raumflächen";

    /* Wie viel Fläche hängt überhaupt am Baujahr? Alles andere trägt seinen
       eigenen U-Wert und bewegt sich im Fächer nicht mit. */
    let flaecheTypologie = 0, flaecheGesamt = 0, unbekannt = {};
    alleBauteile(p).forEach(function (bt) {
      const a = zahl(bt.A, 0);
      if (bt.kat === "innen") return;
      flaecheGesamt += a;
      if (ausTypologie(bt)) flaecheTypologie += a;
    });

    const stufen = [];
    let laeufe = 1;
    vertreter(DT).forEach(function (v) {
      const k = uNachName(DT, v.jahr, art);
      if (!k.anzahl) return;
      const kop = kopie(p);
      const n = umstellen(kop, k.u);
      /* Ein Typologie-Bauteil, dessen Name in der Klasse nicht vorkommt,
         wäre eine stille Lücke. Er wird gezählt und genannt. */
      alleBauteile(kop).forEach(function (bt) {
        if (!ausTypologie(bt)) return;
        if (Number.isFinite(k.u[schluesselname(bt)])) return;
        unbekannt[schluesselname(bt) || "ohne Namen"] = true;
      });
      const erg = K.rechne(kop);
      laeufe += 1;
      const w = zahl(erg.phi_gebaeude, 0);
      stufen.push({
        jahr: v.jahr, code: v.code, label: v.label,
        eigene_klasse: v.code === eigen.code,
        w: rnd(w, 1), kw: rnd(w / 1000, 2),
        spez: bezugFlaeche > 0 ? rnd(w / bezugFlaeche, 1) : null,
        umgestellt: n,
      });
    });
    if (!stufen.length) {
      return { ok: false, grund: "keine_klassen",
               text: "Die Typologie liefert keine Klasse zum Gegenrechnen." };
    }

    /* Der Bezugspunkt des Fächers ist die eigene Klasse, gerechnet auf
       demselben Weg wie alle anderen Zeilen. Nur so sind die Prozente
       untereinander vergleichbar. */
    const eigeneZeile = stufen.find(function (s) { return s.eigene_klasse; }) || null;
    const bezugW = eigeneZeile ? eigeneZeile.w : punkt;
    stufen.forEach(function (s) {
      s.faktor = bezugW > 0 ? rnd(s.w / bezugW, 4) : null;
      s.abweichung_prozent = bezugW > 0 ? rnd((s.w - bezugW) / bezugW * 100, 0) : null;
    });

    const werte = stufen.map(function (s) { return s.w; });
    const min = Math.min.apply(null, werte);
    const max = Math.max.apply(null, werte);
    const aeltest = stufen[0];
    const abwBasis = eigeneZeile ? rnd(eigeneZeile.w - punkt, 1) : null;

    /* Der eine Satz, der neben der Zahl stehen muss. Ist gar kein Baujahr
       bekannt, darf dort NICHT „Angesetzt ist Baujahr 1978" stehen — das
       Jahr vertritt nur die Rückfallklasse, gesetzt hat es niemand. */
    const ohneBj = opt.ohne_baujahr === true;
    const schlimmste = stufen.reduce(function (a, b) { return b.w > a.w ? b : a; }, stufen[0]);
    let text = (ohneBj
        ? "Ein Baujahr ist nicht bekannt; gerechnet ist mit den Bestandswerten "
          + "der Klasse " + eigen.label + ", daraus "
        : "Angesetzt ist Baujahr " + jahr + " (Klasse " + eigen.label + "), daraus ")
      + de(bezugW / 1000, 2) + " kW. ";
    if (schlimmste.w > bezugW) {
      text += "Wäre das Gebäude aus der Klasse " + schlimmste.label + ", wären es "
        + de(schlimmste.w / 1000, 2) + " kW, also "
        + (schlimmste.abweichung_prozent >= 0 ? "+" : "")
        + schlimmste.abweichung_prozent + " Prozent. ";
    }
    text += "Verändert ist dabei nur das Baujahrfeld: die U-Werte der "
      + stufen[0].umgestellt + " Bauteile aus der Typologie. Flächen, Höhen, "
      + "Norm-Außentemperatur und Luftdichtheit bleiben unverändert.";

    const hinweise = [];
    if (flaecheGesamt > 0 && flaecheTypologie / flaecheGesamt < 0.999) {
      hinweise.push(de(flaecheTypologie, 1) + " m² von " + de(flaecheGesamt, 1)
        + " m² Hüllfläche hängen am Baujahr. Die übrige Fläche trägt einen "
        + "belegten U-Wert und bewegt sich in dieser Rechnung nicht mit; der "
        + "Fächer ist insoweit schmaler als das Baujahr allein bewirken würde.");
    }
    if (Object.keys(unbekannt).length) {
      hinweise.push("Für " + Object.keys(unbekannt).join(", ") + " nennt die "
        + "Typologie in mindestens einer Klasse keinen Wert; diese Bauteile "
        + "bleiben in den betroffenen Zeilen unverändert stehen.");
    }
    if (abwBasis !== null && Math.abs(abwBasis) >= 0.5) {
      hinweise.push("Die eigene Klasse ergibt in dieser Gegenrechnung "
        + de(eigeneZeile.w, 0) + " W, die laufende Rechnung " + de(punkt, 0)
        + " W. Der Unterschied von " + de(Math.abs(abwBasis), 0) + " W heißt: an "
        + "mindestens einem Bauteil ist der U-Wert von Hand geändert worden, "
        + "obwohl es noch als Typologiewert geführt wird. Die Prozente unten "
        + "beziehen sich auf die Gegenrechnung, nicht auf die laufende Zahl.");
    }

    return {
      ok: true,
      baujahr: jahr, klasse: eigen.label, code: eigen.code,
      gebaeudeart: art,
      angenommen: opt.angenommen === true,
      ohne_baujahr: ohneBj,
      herkunft: opt.herkunft || null,
      punkt_w: rnd(punkt, 1),
      basis_w: rnd(bezugW, 1),
      basis_abweichung_w: abwBasis,
      min_w: rnd(min, 1), max_w: rnd(max, 1),
      faktor_max: bezugW > 0 ? rnd(max / bezugW, 3) : null,
      aeltest_w: rnd(aeltest.w, 1),
      aeltest_label: aeltest.label,
      bezug: bezug, bezugsflaeche: rnd(bezugFlaeche, 2),
      flaeche_typologie: rnd(flaecheTypologie, 2),
      flaeche_huelle: rnd(flaecheGesamt, 2),
      stufen: stufen,
      hinweise: hinweise,
      text: text,
      quelle: DT.quelle || "",
      laeufe: laeufe, ms: rnd(jetzt() - t0, 1),
    };
  }

  /* ------------------------------------------------------------------ *
   * 4  Selbsttest
   * ------------------------------------------------------------------ *
   * ACHTUNG: Dieser Test rechnet mit einem AUSGEDACHTEN Beispielgebäude. Er
   * beweist, dass der Fächer das tut, was er behauptet — er beweist keine
   * einzige Zahl über ein wirkliches Haus. Zahlen über ein Haus stammen aus
   * dem Durchlauf im Browser, nirgends sonst.
   * ------------------------------------------------------------------ */
  /** Das Beispielgebäude bekommt seine U-Werte AUS der Typologie, nicht aus
   *  dem Kopf des Verfassers. Sonst prüfte T2 nur, ob zwei erfundene Zahlen
   *  zufällig gleich sind. */
  function beispiel(DT) {
    const k = uNachName(DT, 2022, "efh").u;
    const bt = function (name, A, kat, grenz) {
      return { name: name, typ_name: name, A: A, U: k[name],
               typologie: true, kat: kat, grenzt_an: { typ: grenz } };
    };
    return {
      meta: { baujahr: "2022", gebaeudeart: "efh" },
      klima: { theta_e: -10, theta_e_m: 9 },
      norm: {}, luftdichtheit: { n50: 3.0 },
      optionen: {},
      zonen: [],
      raeume: [
        { id: "r1", name: "Wohnen", art: "wohnen", we: "WE 1", theta_i: 20,
          A: 40, h: 2.5, n_min: 0.5,
          bauteile: [
            bt("Außenwand", 40, "huelle", "aussen"),
            bt("Fenster", 8, "huelle", "aussen"),
            bt("Dach", 40, "huelle", "aussen"),
            bt("Bodenplatte", 40, "erdreich", "erdreich"),
            { name: "Wand mit Nachweis", A: 10, U: 0.15,
              typologie: false, kat: "huelle", grenzt_an: { typ: "aussen" } },
          ] },
      ],
      raumarten: { wohnen: { theta_i: 20, n_min: 0.5 } },
    };
  }

  function selbsttest(optionen) {
    const f = [];
    const K = holeKern(optionen);
    const DT = holeTypologie(optionen);
    const opt = { kern: K, typologie: DT };
    if (!K || !DT) return { ok: false, fehler: ["Kern oder Typologie fehlen"], anzahl: 0 };

    const p = beispiel(DT);
    const r = faecher(p, opt);
    if (!r.ok) f.push("Der Fächer läuft nicht: " + r.grund);

    if (r.ok) {
      /* T1  Jede Klasse der Typologie kommt genau einmal vor. */
      const soll = DT.TYPOLOGIE_EFH.length;
      if (r.stufen.length !== soll) {
        f.push("T1 es müssen " + soll + " Klassen sein, sind " + r.stufen.length);
      }
      const codes = {};
      r.stufen.forEach(function (s) { codes[s.code] = (codes[s.code] || 0) + 1; });
      if (Object.keys(codes).length !== r.stufen.length) f.push("T1b eine Klasse doppelt");

      /* T2  DIE PROBE AUF SICH SELBST. Die eigene Klasse muss exakt den
             Punktwert der laufenden Rechnung ergeben. Weicht sie ab, stellt
             der Fächer etwas anderes um als das Baujahrfeld. */
      if (Math.abs(r.basis_w - r.punkt_w) > 0.5) {
        f.push("T2 eigene Klasse muss den Punktwert treffen: " + r.basis_w
               + " gegen " + r.punkt_w);
      }
      if (r.basis_abweichung_w !== null && Math.abs(r.basis_abweichung_w) > 0.5) {
        f.push("T2b unbegründete Abweichung der eigenen Klasse");
      }

      /* T3  Älter heisst mehr. Die Typologie wird über die Klassen hinweg
             besser; ein älteres Haus muss eine höhere Heizlast ergeben. */
      const jung = r.stufen[r.stufen.length - 1];
      const alt = r.stufen[0];
      if (!(alt.w > jung.w)) {
        f.push("T3 die älteste Klasse muss die höchste Last ergeben: "
               + alt.w + " gegen " + jung.w);
      }
      /* T3b  Der Fächer ist NICHT durchgehend fallend, und das ist richtig so:
             die Quelltabelle ist es auch nicht (EFH_K nennt eine Bodenplatte
             mit 0,45, die vorhergehende Klasse eine Kellerdecke mit 0,30;
             EFH_L nennt ein Dach mit 0,24 gegen 0,20 der Klasse davor).
             Geprüft wird deshalb die Ursache: steigt der Fächer von einer
             Klasse zur nächstjüngeren, muss in der Tabelle ein U-Wert
             mitgestiegen sein. Steigt er ohne einen solchen Grund, stellt das
             Modul etwas anderes um als die Typologie. */
      for (let i = 1; i < r.stufen.length; i++) {
        const a = r.stufen[i - 1], b = r.stufen[i];
        if (!(b.w > a.w + 0.5)) continue;
        const ua = uNachName(DT, a.jahr, "efh").u;
        const ub = uNachName(DT, b.jahr, "efh").u;
        const grund = Object.keys(ub).some(function (n) {
          return Number.isFinite(ua[n]) && ub[n] > ua[n];
        });
        if (!grund) {
          f.push("T3b " + b.label + " liegt über " + a.label
                 + ", ohne dass ein U-Wert der Tabelle gestiegen wäre");
        }
      }

      /* T4  Der Fächer muss weiter sein als eine gewöhnliche Bandbreite.
             Das ist der ganze Grund, warum es ihn gibt. */
      if (!(r.faktor_max > 1.25)) {
        f.push("T4 der Fächer ist unglaubwürdig schmal: Faktor " + r.faktor_max);
      }

      /* T5  Belegte Bauteile bleiben unberührt. */
      if (!(r.flaeche_typologie < r.flaeche_huelle)) {
        f.push("T5 das belegte Bauteil hätte unberührt bleiben müssen");
      }
      if (!r.hinweise.some(function (h) { return /Hüllfläche hängen am Baujahr/.test(h); })) {
        f.push("T5b der unberührte Anteil muss genannt werden");
      }

      /* T6  Der Text nennt eine Zahl, keine Beschreibung. */
      if (!/\d/.test(r.text) || !/Prozent/.test(r.text)) {
        f.push("T6 der Satz neben der Zahl muss die Wirkung beziffern");
      }
    }

    /* T7  Ohne Baujahr, ausserhalb der Geltung und für ein Nichtwohngebäude
           entsteht KEIN Fächer — und zwar mit Grund, nicht schweigend. */
    const ohne = faecher(Object.assign(kopie(p), { meta: { gebaeudeart: "efh" } }), opt);
    if (ohne.ok || ohne.grund !== "kein_baujahr") f.push("T7 ohne Baujahr kein Fächer");

    /* T7a  ABER: trägt die RÜCKFALLKLASSE die Rechnung (Baujahr völlig
           unbekannt, daten_typologie.ohneBaujahr), muss der Fächer laufen —
           gerade dann ist er die einzige Zahl, die die Rückfallklasse in
           Frage stellt. Und sein erster Satz darf kein Baujahr behaupten,
           das niemand angesetzt hat. */
    {
      const ohneP = Object.assign(kopie(p), { meta: { gebaeudeart: "efh" } });
      const rf = faecher(ohneP, Object.assign({}, opt,
        { baujahr: 1978, ohne_baujahr: true, angenommen: true }));
      if (!rf.ok) {
        f.push("T7a der Fächer muss für die Rückfallklasse laufen: " + rf.grund);
      } else {
        if (/Angesetzt ist Baujahr/.test(rf.text)) {
          f.push("T7a1 ohne Baujahr darf der Text kein angesetztes Baujahr behaupten");
        }
        if (!/Ein Baujahr ist nicht bekannt/.test(rf.text)) {
          f.push("T7a2 der Text muss sagen, dass kein Baujahr bekannt ist");
        }
        if (rf.ohne_baujahr !== true) f.push("T7a3 das Ergebnis muss die Kennung tragen");
        if (!(rf.stufen || []).some(function (s) { return s.eigene_klasse; })) {
          f.push("T7a4 die Rückfallklasse muss im Fächer als eigene Klasse stehen");
        }
      }
    }
    const nwg = kopie(p); nwg.meta.gebaeudeart = "nwg";
    const rn = faecher(nwg, opt);
    if (rn.ok || rn.grund !== "nichtwohngebaeude") {
      f.push("T7b Nichtwohngebäude: " + (rn.grund || "Fächer entstanden"));
    }
    const neu = kopie(p); neu.meta.baujahr = "2026";
    const rneu = faecher(neu, opt);
    if (rneu.ok || rneu.grund !== "ausserhalb_geltung") {
      f.push("T7c Baujahr hinter der Geltung: " + (rneu.grund || "Fächer entstanden"));
    }

    /* T8  Ein Projekt ganz ohne Typologie-Bauteile: der Fächer ist flach.
           Eine Zahl, die sich nicht bewegt, darf nicht als Bandbreite
           erscheinen. */
    const belegt = kopie(p);
    belegt.raeume[0].bauteile.forEach(function (b) { b.typologie = false; });
    const rb = faecher(belegt, opt);
    if (rb.ok && rb.faktor_max !== 1) {
      f.push("T8 ohne Typologie-Bauteile darf sich nichts bewegen: " + rb.faktor_max);
    }

    return { ok: f.length === 0, fehler: f, anzahl: 18 };
  }

  return {
    faecher: faecher,
    vertreter: vertreter,
    selbsttest: selbsttest,
    _beispiel: beispiel,
  };
});
