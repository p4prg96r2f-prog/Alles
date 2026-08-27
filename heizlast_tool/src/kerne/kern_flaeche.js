/* ===========================================================================
 * kern_flaeche.js — die Grundfläche eines Raums, wenn sie nirgends steht
 * ===========================================================================
 * WARUM ES DIESES MODUL GIBT
 *
 * GEMESSEN am Blatt „Bauantrag Soethe 1312.2021.pdf" (echter Kundenlauf,
 * 26.08.2026): 14 Räume, alle mit A = 0. Auf keiner der sechs Seiten kommt
 * „m²", „m2", „qm" oder „Fläche" auch nur einmal vor. Das war kein Lesefehler
 * — auf dem Blatt steht keine Fläche. Der Ausleseendpunkt hat richtig
 * geantwortet, indem er nichts lieferte.
 *
 * Die Folgen hingen daran wie an einer Kette:
 *   keine Fläche  →  KERN_ZUORDNUNG.bauteileFuerRaum steigt aus, 0 Bauteile
 *                 →  Gebäudeheizlast 0,00 kW
 *                 →  KERN_ZUORDNUNG.wandlaengenJeGeschoss filtert auf A > 0,
 *                    findet keinen Raum und verteilt die gelesenen 38,60 m
 *                    Fassade auf niemanden.
 * Wer die Fläche löst, löst drei Befunde. Dafür ist dieses Modul da.
 *
 * DIE QUELLENKETTE, VON STARK NACH SCHWACH
 *
 *   a) FLÄCHENSTEMPEL im Textstand der Zeichnung. Gemessen, im Dokument
 *      geschrieben, nicht aus einem Bild abgelesen. Das macht app.js über
 *      flaecheAusStempel; hier steht die Stufe nur der Vollständigkeit halber
 *      in der Kette, damit die Reihenfolge an EINER Stelle nachlesbar ist.
 *   b) ANGESCHRIEBENE BREITE MAL TIEFE. Ebenfalls gemessen, aber das Produkt
 *      ist die Rechteckfläche; bei einem Raum mit Vorsprung liegt sie zu hoch.
 *   c) AUS DEN AUSSENMASSEN VERTEILT. Steht die Außenkontur des Geschosses
 *      fest, ist die Fläche INNERHALB der Außenwände gerechnet, und daraus
 *      bekommt jeder Raum seinen Anteil. Das ist eine ANNAHME, keine Messung,
 *      und sie heißt hier auch so.
 *   d) AUS EINEM ANDEREN GESCHOSS DESSELBEN GEBÄUDES. Fehlt die Kontur dieses
 *      Geschosses, aber ein anderes Geschoss hat eine, wird dessen Innenfläche
 *      übernommen. Das unterstellt, dass beide Geschosse gleich groß sind —
 *      bei einem Vollgeschoss über einem Vollgeschoss der Regelfall, bei einem
 *      Staffel- oder Dachgeschoss falsch, und zwar nach oben. Deshalb ist es
 *      die letzte Stufe und trägt die Richtung des Fehlers im Text mit.
 *   e) DANACH NICHTS MEHR. Ohne Stempel, ohne Raummaß und ohne eine einzige
 *      Außenbemaßung im ganzen Projekt gibt es keinen ableitbaren Vorschlag.
 *      Dann steht das Feld leer — und der Grund steht daneben. Das ist die
 *      Ausnahme, die begründet werden muss, nicht der Normalfall.
 *
 * BRUTTO IST NICHT NETTO — DER WANDABZUG
 *
 * Die Außenbemaßung misst die AUSSENKANTE. Für ein Rechteck gilt exakt
 *
 *       A_innen = A − U·d + 4·d²
 *
 * mit der Wanddicke d. Diese Zeile ist NICHT neu: sie steht seit dem
 * 23.08.2026 in MODUL_KONTROLLBLATT (Zähler Z2, Restflächenprobe) und wird
 * von dort samt Wanddickenspanne übernommen — dieselbe Rechnung, dieselbe
 * Quelle, dieselben Enden. Zwei Wege für dieselbe Sache driften auseinander;
 * deshalb rechnet dieses Modul den Wandabzug nicht selbst, sondern nimmt die
 * Wanddicke als Übergabe entgegen (KERN_FLAECHE.innenflaeche).
 *
 * WAS DER ABZUG NICHT ENTHÄLT, und das gehört gesagt: die INNENWÄNDE. Der
 * Ausdruck oben zieht nur den Ring der Außenwände ab. Was zwischen den Räumen
 * steht — Trennwände, Schächte, der Treppenlauf —, bleibt in der verteilten
 * Fläche enthalten, weil auf diesem Blatt keine Innenwanddicke steht und eine
 * gesetzte Zahl hier eine erfundene wäre. Die verteilten Flächen sind deshalb
 * eher zu groß als zu klein. GEMESSEN am Blatt „BV 2-0887 Ziolkowski":
 * 100,00 m² Kontur, 85,57 m² innerhalb der Außenwände, 74,72 m² Raumfläche
 * laut Stempeln — die Innenwände und die Treppe sind dort 10,85 m², also
 * 12,7 % der Innenfläche. In dieser Größenordnung ist der verbleibende
 * Überhang, und er läuft über KERN_BANDBREITE mit.
 *
 * DIE VERTEILREGEL — GEMESSEN, NICHT GESETZT
 *
 * Gleichmäßig verteilen hieße: das WC ist so groß wie das Wohnzimmer. Das ist
 * nachweislich falsch. Verteilt wird deshalb nach dem, was das Werkzeug über
 * jeden Raum schon weiß — und welches Merkmal davon wirklich trägt, ist an
 * echten Plänen ausgezählt worden, statt es zu behaupten.
 *
 * DER PRÜFSATZ: 51 Räume aus 8 Geschossen dreier Gebäude, deren Flächen im
 * Plan ANGESCHRIEBEN und gelesen sind bzw. aus einem geprüften Rechenmodell
 * stammen — „Hasenberg 10" (Echtlauf 25.08.2026), „BV 2-0887 Ziolkowski"
 * (Echtlauf 25.08.2026), „Mälzerstraße 59" (geprüftes WERK.E-Rechenmodell,
 * validierung/faelle/maelzerstr59.json). Je Geschoss ist jede Raumfläche
 * durch die MITTLERE Raumfläche dieses Geschosses geteilt; die Tabelle unten
 * ist der Median dieser Verhältniszahlen je Raumart. Damit ist sie
 * maßstabsfrei: sie sagt nichts über Quadratmeter, nur darüber, um wie viel
 * ein Raum dieser Art größer oder kleiner ist als der Durchschnittsraum
 * seines Geschosses.
 *
 * WAS GEPRÜFT UND VERWORFEN WURDE. Gegen denselben Prüfsatz gerechnet
 * (mittlerer relativer Fehler je Raum, Median über alle 51 Räume):
 *
 *      gleichmäßig verteilt                     25,7 %
 *      nach Raumart verteilt                    14,0 %
 *      Raumart und Fensterzahl                  14,0 %   (kein Gewinn)
 *      Raumart und Zahl der Außenwände          12,8 %   (Mittelwert schlechter)
 *
 * Die Raumart halbiert den Fehler. Die FENSTERZAHL bringt an diesem Prüfsatz
 * nichts — nicht weil sie nichts sagt, sondern weil sie auf diesen Blättern
 * zu unzuverlässig gelesen wird (die drei größten Räume des Prüfsatzes kamen
 * mit „0 Fenster" zurück). Die Zahl der AUSSENWÄNDE verbessert den Median und
 * verschlechtert den Mittelwert, sie verschiebt den Fehler also nur. Beide
 * bleiben deshalb draußen. Das ist eine Aussage über diesen Prüfsatz, und sie
 * ist zu wiederholen, sobald er wächst.
 *
 * WAS BLEIBT — die GELESENE FASSADENLÄNGE. Steht die Außenwandlänge eines
 * Raums in der Maßkette des Blattes (r.aussenwand_m), ist sie ein MASS und
 * kein Merkmal. Zwei Räume derselben Raumart auf demselben Geschoss teilen
 * sich in aller Regel dieselbe Raumtiefe; dann verhalten sich ihre Flächen
 * wie ihre Fassadenlängen. GEMESSEN am Blatt Soethe, Obergeschoss: „Kind 1"
 * trägt 4,85 m Fassade, „Kind 2" 3,22 m — nach der Raumart allein wären beide
 * gleich groß, was dem Blatt widerspricht. Dieser Faktor ist deshalb der
 * einzige, der auf die Raumart aufgesetzt wird, und er wirkt nur innerhalb
 * derselben Raumart desselben Geschosses.
 *
 * DREI SCHRANKEN HALTEN DAS EHRLICH
 *   1. Eine belegte Fläche wird NIE ersetzt. Räume mit Fläche ziehen ihren
 *      Anteil vorweg ab; verteilt wird allein der Rest.
 *   2. Jede so entstandene Fläche trägt Herkunft, Herleitung und Spanne mit
 *      sich und ist als Annahme gekennzeichnet.
 *   3. Gesetzt wird hier nichts. Dieses Modul RECHNET einen Vorschlag; ob er
 *      gilt, entscheidet der Bearbeiter am Knopf.
 * ======================================================================== */

"use strict";

(function (global) {

  function zahl(x, d) {
    const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (d === undefined ? 0 : d);
  }
  function rnd(x, n) { const f = Math.pow(10, n || 0); return Math.round(x * f) / f; }
  function de(x, n) {
    const k = n === undefined ? 1 : n;
    return (Math.round(x * Math.pow(10, k)) / Math.pow(10, k)).toFixed(k).replace(".", ",");
  }

  /* ------------------------------------------------------------------ *
   * 1  Die gemessene Größentabelle
   * ------------------------------------------------------------------ *
   * wert  Median der Verhältniszahl Raumfläche / mittlere Raumfläche des
   *       Geschosses, über den Prüfsatz
   * min   kleinster, max größter beobachteter Wert dieser Raumart
   * n     Zahl der Räume, g die Zahl der GEBÄUDE dahinter. Steht nur ein
   *       Gebäude hinter einer Zeile, ist der Wert eine Beobachtung und keine
   *       Verteilung; das sagt die Zeile von sich, und die Spanne wird dafür
   *       auf die Spanne des ganzen Prüfsatzes geweitet.
   * ------------------------------------------------------------------ */
  const PRUEFSATZ = {
    raeume: 51, geschosse: 8, gebaeude: 3,
    quelle: "51 Räume aus 8 Geschossen von \u201EHasenberg 10\u201C "
      + "(Echtlauf 25.08.2026), \u201EBV 2-0887 Ziolkowski\u201C (Echtlauf "
      + "25.08.2026) und \u201EMälzerstraße 59\u201C (geprüftes "
      + "WERK.E-Rechenmodell). Alle Flächen sind im Plan angeschrieben und "
      + "gelesen oder im Rechenmodell belegt.",
    /* Median des relativen Fehlers je Raum, wenn allein nach der Raumart
       verteilt wird. Das ist die Streuung, mit der eine verteilte Fläche in
       die Bandbreite geht — gerechnet, nicht gesetzt. */
    fehler_median: 0.140,
    fehler_mittel: 0.224,
    fehler_gleichmaessig: 0.257,
  };

  /* Die Spanne des ganzen Prüfsatzes: kleinster und größter beobachteter
     Verhältniswert über alle 51 Räume. Sie gilt dort, wo eine Raumart nur
     von einem Gebäude belegt ist oder gar nicht vorkommt. */
  const SPANNE_GESAMT = { min: 0.17, max: 2.72 };

  const GROESSEN = {
    kueche:        { wert: 1.35, min: 1.08, max: 1.35, n: 4,  g: 2 },
    wohnen:        { wert: 1.32, min: 0.92, max: 2.72, n: 21, g: 3 },
    treppenhaus:   { wert: 1.06, min: 1.06, max: 1.06, n: 3,  g: 1 },
    flur:          { wert: 0.79, min: 0.36, max: 1.08, n: 9,  g: 3 },
    buero:         { wert: 0.70, min: 0.52, max: 1.00, n: 4,  g: 1 },
    bad:           { wert: 0.45, min: 0.39, max: 0.98, n: 6,  g: 3 },
    lager_beheizt: { wert: 0.34, min: 0.34, max: 0.34, n: 1,  g: 1 },
    nebenraum:     { wert: 0.29, min: 0.29, max: 0.29, n: 1,  g: 1 },
    wc:            { wert: 0.25, min: 0.17, max: 0.32, n: 2,  g: 2 },
  };

  /** Die Größenzahl einer Raumart samt Spanne und Beleglage. Eine Raumart,
   *  die im Prüfsatz nicht vorkommt (verkauf, werkstatt, frei), bekommt die
   *  1,0 des Durchschnittsraums — und sagt, dass sie nichts weiß. */
  function groesse(art) {
    const a = String(art || "").toLowerCase();
    const g = GROESSEN[a];
    if (!g) {
      return { wert: 1, min: SPANNE_GESAMT.min, max: SPANNE_GESAMT.max,
        n: 0, gebaeude: 0, belegt: false,
        grund: "Für die Raumart „" + (a || "ohne Angabe") + "“ liegt im "
          + "Prüfsatz kein Raum vor. Angesetzt ist der Durchschnittsraum des "
          + "Geschosses (Faktor 1,00); die Spanne ist die des ganzen "
          + "Prüfsatzes" };
    }
    const einGebaeude = g.g < 2;
    return {
      wert: g.wert,
      min: einGebaeude ? SPANNE_GESAMT.min : g.min,
      max: einGebaeude ? SPANNE_GESAMT.max : g.max,
      n: g.n, gebaeude: g.g, belegt: !einGebaeude,
      grund: "Faktor " + de(g.wert, 2) + " zum Durchschnittsraum des "
        + "Geschosses, Median über " + g.n + " Räume dieser Raumart aus "
        + g.g + (g.g === 1 ? " Gebäude" : " Gebäuden") + " des Prüfsatzes"
        + (einGebaeude
          ? ". Nur EIN Gebäude belegt diese Zeile; der Wert ist eine "
            + "Beobachtung und keine Verteilung, die Spanne ist deshalb auf "
            + "die des ganzen Prüfsatzes geweitet"
          : ""),
    };
  }

  /* ------------------------------------------------------------------ *
   * 2  Die Fläche innerhalb der Außenwände
   * ------------------------------------------------------------------ */

  /**
   * A_innen = A − U·d + 4·d² — die Zeile aus MODUL_KONTROLLBLATT, Zähler Z2.
   * @param kontur    { A, U, quelle }  Außenkante des Geschosses
   * @param wanddicke { d, unten, oben, quelle, annahme } wie
   *                  MODUL_KONTROLLBLATT.wanddicke() sie liefert. Fehlt sie,
   *                  gibt es keinen Wandabzug und die Kontur ist eine reine
   *                  Obergrenze; das steht dann auch so im Text.
   */
  function innenflaeche(kontur, wanddicke) {
    const k = kontur || {}, w = wanddicke || {};
    const A = zahl(k.A, 0), U = zahl(k.U, 0);
    if (!(A > 0)) return null;
    const quelle = String(k.quelle || "Außenbemaßung des Blattes");
    if (!(U > 0)) {
      return { wert: rnd(A, 2), min: rnd(A * 0.7, 2), max: rnd(A, 2),
        d: null, abzug: 0, obergrenze: true, annahme: true,
        quelle: quelle,
        herleitung: "Die Außenkontur misst " + de(A, 2) + " m². Ohne den "
          + "Umfang lässt sich der Ring der Außenwände nicht abziehen; die "
          + "Zahl ist eine reine OBERGRENZE. Die Untergrenze unterstellt, "
          + "dass die Wände drei Zehntel der Kontur einnehmen — das ist keine "
          + "Rechnung, sondern die Grenze, unterhalb derer die Kontur nicht "
          + "mehr zu diesem Geschoss gehören kann" };
    }
    const innen = function (d) { return A - U * d + 4 * d * d; };
    const dFest = zahl(w.d, 0);
    const dU = dFest > 0 ? dFest : zahl(w.unten, 0);
    const dO = dFest > 0 ? dFest : zahl(w.oben, 0);
    if (!(dU > 0) || !(dO > 0)) {
      return { wert: rnd(A, 2), min: rnd(A * 0.7, 2), max: rnd(A, 2),
        d: null, abzug: 0, obergrenze: true, annahme: true, quelle: quelle,
        herleitung: "Die Außenkontur misst " + de(A, 2) + " m². Eine "
          + "Wanddicke liegt nicht vor, auch nicht als Spanne; ohne sie ist "
          + "die Kontur eine reine Obergrenze" };
    }
    /* Die dünne Wand ergibt die größte Innenfläche, die dicke die kleinste —
       dieselbe Leserichtung wie im Kontrollblatt. */
    const max = innen(dU), min = innen(dO);
    const wert = dFest > 0 ? max : (min + max) / 2;
    return {
      wert: rnd(wert, 2), min: rnd(min, 2), max: rnd(max, 2),
      d: dFest > 0 ? dFest : null, d_unten: dU, d_oben: dO,
      abzug: rnd(A - wert, 2), obergrenze: false, annahme: !(dFest > 0),
      quelle: quelle,
      herleitung: "Aus der Außenkontur " + de(A, 2) + " m² mit " + de(U, 2)
        + " m Umfang (" + quelle + ") ist der Ring der Außenwände abgezogen: "
        + "A − U·d + 4·d², dieselbe Zeile, mit der das Kontrollblatt seine "
        + "Restflächenprobe rechnet. "
        + (dFest > 0
          ? "Die Wanddicke " + de(dFest, 3) + " m ist belegt ("
            + String(w.quelle || "Bauteilaufbau") + "); die Innenfläche ist "
            + "damit " + de(max, 2) + " m²."
          : "Die Wanddicke steht nirgends; angesetzt ist die Spanne "
            + de(dU, 2) + " bis " + de(dO, 2) + " m (ANNAHME, Baurichtmaße "
            + "nach DIN 4172), also " + de(min, 2) + " bis " + de(max, 2)
            + " m² innerhalb der Außenwände, gerechnet wird mit der Mitte "
            + de(wert, 2) + " m².")
        + " Die INNENWÄNDE sind darin noch enthalten — für sie steht auf dem "
        + "Blatt keine Dicke, und eine gesetzte wäre eine erfundene. Die "
        + "verteilten Flächen sind dadurch eher zu groß als zu klein.",
    };
  }

  /* ------------------------------------------------------------------ *
   * 3  Die Gewichte
   * ------------------------------------------------------------------ */

  /** Mittlere gelesene Fassadenlänge je Raumart auf DIESEM Geschoss. Nur
   *  Räume, deren Länge wirklich in der Maßkette steht, zählen mit. */
  function fassadenmittel(raeume) {
    const s = {}, n = {};
    (raeume || []).forEach(function (r) {
      const l = zahl(r && r.aussenwand_m, 0);
      if (!(l > 0)) return;
      const a = String((r && r.art) || "").toLowerCase();
      s[a] = (s[a] || 0) + l; n[a] = (n[a] || 0) + 1;
    });
    const m = {};
    Object.keys(s).forEach(function (a) { if (n[a] >= 2) m[a] = s[a] / n[a]; });
    return m;
  }

  /**
   * Das Gewicht eines Raums in der Verteilung.
   * @returns { w, w_min, w_max, art, faktor, grund }
   */
  function gewicht(raum, mittel) {
    const r = raum || {};
    const g = groesse(r.art);
    const a = String(r.art || "").toLowerCase();
    const l = zahl(r.aussenwand_m, 0);
    const mm = (mittel || {})[a] || 0;
    let faktor = 1, grund = g.grund;
    if (l > 0 && mm > 0) {
      /* Die gelesene Fassadenlänge sticht — innerhalb derselben Raumart
         desselben Geschosses. Sie ist ein Maß aus der Maßkette und kein
         Merkmal; zwei Räume derselben Art teilen sich in aller Regel die
         Raumtiefe, dann verhalten sich ihre Flächen wie ihre Fassaden. */
      faktor = l / mm;
      grund = g.grund + ". Dazu die GELESENE Fassadenlänge " + de(l, 2)
        + " m aus der Maßkette des Blattes ("
        + String(r.aussenwand_quelle || "bemasst") + "): sie liegt beim "
        + de(faktor, 2) + "-fachen der mittleren Fassadenlänge der Räume "
        + "gleicher Raumart auf diesem Geschoss (" + de(mm, 2) + " m). Bei "
        + "gleicher Raumtiefe verhalten sich die Flächen wie die Fassaden";
    }
    return {
      w: g.wert * faktor,
      w_min: g.min * faktor,
      w_max: g.max * faktor,
      art: a, faktor: rnd(faktor, 3), belegt: g.belegt, grund: grund,
    };
  }

  /* ------------------------------------------------------------------ *
   * 4  Verteilen
   * ------------------------------------------------------------------ */

  /**
   * Die Innenfläche eines Geschosses auf seine Räume verteilen.
   * @param raeume  ALLE Räume des Geschosses — auch die mit Fläche. Sie
   *                ziehen ihren Anteil vorweg ab, verteilt wird der Rest.
   * @param innen   Ergebnis von innenflaeche()
   * @returns { je_raum: { id: {A, A_min, A_max, gewicht, grund} },
   *            rest, belegt, offen, faktor, warnung }
   */
  function verteilen(raeume, innen) {
    const erg = { je_raum: {}, rest: 0, belegt: 0, offen: 0, faktor: 0,
                  warnung: null };
    const liste = (raeume || []).filter(function (r) { return !!r; });
    if (!liste.length || !innen || !(zahl(innen.wert, 0) > 0)) return erg;
    let belegt = 0;
    const offen = [];
    liste.forEach(function (r) {
      const A = zahl(r.A, 0);
      if (A > 0) { belegt += A; return; }
      offen.push(r);
    });
    erg.belegt = rnd(belegt, 2);
    erg.offen = offen.length;
    if (!offen.length) return erg;
    const rest = zahl(innen.wert, 0) - belegt;
    erg.rest = rnd(rest, 2);
    if (!(rest > 0)) {
      erg.warnung = "Die Räume mit belegter Fläche füllen die Innenfläche des "
        + "Geschosses (" + de(zahl(innen.wert, 0), 2) + " m²) bereits aus ("
        + de(belegt, 2) + " m²). Für die " + offen.length + " Räume ohne "
        + "Fläche bleibt nichts übrig — entweder ist eine gelesene Fläche zu "
        + "groß oder die Außenkontur zu klein.";
      return erg;
    }
    const mittel = fassadenmittel(liste);
    const gew = offen.map(function (r) { return gewicht(r, mittel); });
    let summe = 0;
    gew.forEach(function (g) { summe += g.w; });
    if (!(summe > 0)) return erg;
    erg.faktor = rnd(rest / summe, 4);
    /* Die Spanne je Raum: die Streuung der Raumart, aber die SUMME bleibt.
       Ein Raum, der ans obere Ende seiner Art rückt, nimmt den anderen etwas
       weg — deshalb wird die Spanne über die Summe der jeweils anderen
       Gewichte gerechnet und nicht einfach das Gewicht skaliert. */
    offen.forEach(function (r, i) {
      const g = gew[i];
      const rest_w = summe - g.w;
      const A = rest * g.w / summe;
      const A_min = rest * g.w_min / (g.w_min + rest_w);
      const A_max = rest * g.w_max / (g.w_max + rest_w);
      erg.je_raum[String(r.id || r.name)] = {
        A: rnd(A, 2),
        A_min: rnd(Math.min(A_min, A), 2),
        A_max: rnd(Math.max(A_max, A), 2),
        gewicht: rnd(g.w, 3), art: g.art, faktor: g.faktor,
        belegt: g.belegt, grund: g.grund,
      };
    });
    return erg;
  }

  /* ------------------------------------------------------------------ *
   * 5  Die ganze Kette
   * ------------------------------------------------------------------ */

  /**
   * Für alle Räume ohne Fläche einen Vorschlag rechnen — Stufe c und d der
   * Quellenkette. Die Stufen a und b liegen VOR diesem Modul: was ein
   * Flächenstempel oder ein angeschriebenes Maß liefert, steht bereits in
   * r.A, und ein Raum mit A > 0 kommt hier nicht mehr vor.
   *
   * @param raeume    alle Räume des Projekts
   * @param opt.kontur    function(geschoss) → { A, U, quelle } | null
   * @param opt.wanddicke { d, unten, oben, quelle } (MODUL_KONTROLLBLATT)
   * @returns { geschosse: [ … ], je_raum: { id: {…} }, ohne: [ … ] }
   *   je_raum[id] = { A, A_min, A_max, geschoss, stufe, herkunft, herleitung }
   *   ohne        = Geschosse, für die es keinen Vorschlag gibt, mit Grund
   */
  function kette(raeume, opt) {
    const o = opt || {};
    const holeKontur = typeof o.kontur === "function" ? o.kontur : function () { return null; };
    const raus = { geschosse: [], je_raum: {}, ohne: [] };
    const jeG = {}, folge = [];
    (raeume || []).forEach(function (r) {
      const g = String((r && r.geschoss) || "");
      if (!jeG[g]) { jeG[g] = []; folge.push(g); }
      jeG[g].push(r);
    });
    /* Erst alle eigenen Konturen einsammeln — Stufe d braucht sie. */
    const innenJeG = {};
    folge.forEach(function (g) {
      const k = holeKontur(g);
      const i = innenflaeche(k, o.wanddicke);
      if (i) innenJeG[g] = i;
    });
    folge.forEach(function (g) {
      const rs = jeG[g];
      const offen = rs.filter(function (r) { return !(zahl(r.A, 0) > 0); });
      if (!offen.length) return;
      let innen = innenJeG[g] || null;
      let stufe = "kontur", fremd = null;
      if (!innen) {
        /* Stufe d: ein anderes Geschoss desselben Gebäudes. Genommen wird das
           mit der GRÖSSTEN Innenfläche — sie ist die Obergrenze, und ein zu
           großer Vorschlag fällt in der Rückfrage auf, ein zu kleiner nicht. */
        Object.keys(innenJeG).forEach(function (h) {
          if (h === g) return;
          if (!fremd || zahl(innenJeG[h].wert, 0) > zahl(innenJeG[fremd].wert, 0)) fremd = h;
        });
        if (fremd) { innen = innenJeG[fremd]; stufe = "geschwister"; }
      }
      if (!innen) {
        raus.ohne.push({ geschoss: g, raeume: offen.length,
          grund: "auf keinem Blatt eine Außenbemaßung steht, aus der sich die "
            + "Fläche eines Geschosses ergäbe, und in den Räumen kein "
            + "Flächenstempel gelesen wurde. Ohne eines von beidem lässt sich "
            + "eine Grundfläche nicht ableiten — sie muss am Plan abgegriffen "
            + "oder eingetragen werden." });
        return;
      }
      const v = verteilen(rs, innen);
      const eintrag = { geschoss: g, stufe: stufe, fremd: fremd, innen: innen,
        offen: v.offen, belegt: v.belegt, rest: v.rest, warnung: v.warnung,
        je_raum: v.je_raum };
      raus.geschosse.push(eintrag);
      if (v.warnung) return;
      Object.keys(v.je_raum).forEach(function (id) {
        const t = v.je_raum[id];
        const herkunft = stufe === "kontur"
          ? "aus den Außenmaßen verteilt"
          : "aus den Außenmaßen des Geschosses " + fremd + " verteilt";
        raus.je_raum[id] = {
          A: t.A, A_min: t.A_min, A_max: t.A_max, geschoss: g, stufe: stufe,
          herkunft: herkunft,
          herleitung: innen.herleitung
            + (stufe === "geschwister"
              ? " Für „" + g + "“ liegt keine eigene Außenbemaßung vor; "
                + "übernommen ist die des Geschosses „" + fremd + "“. Das "
                + "unterstellt, dass beide Geschosse gleich groß sind — bei "
                + "einem Staffel- oder Dachgeschoss ist das falsch, und zwar "
                + "nach oben."
              : "")
            + " Von der Innenfläche " + de(zahl(innen.wert, 0), 2) + " m² sind "
            + de(v.belegt, 2) + " m² durch Räume mit belegter Fläche vergeben; "
            + de(v.rest, 2) + " m² werden auf " + v.offen
            + (v.offen === 1 ? " Raum" : " Räume") + " verteilt. Für diesen "
            + "Raum: " + t.grund + ". Ergebnis " + de(t.A, 2) + " m² (Spanne "
            + de(t.A_min, 2) + " bis " + de(t.A_max, 2) + " m²). VERTEILUNG, "
            + "kein gemessener Raumwert.",
        };
      });
    });
    return raus;
  }

  /* ------------------------------------------------------------------ *
   * 6  Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    let n = 0;
    function pruef(b, t) { n++; if (!b) f.push(t); }

    /* --- Innenfläche: die Zeile des Kontrollblatts --------------------- */
    const i1 = innenflaeche({ A: 100, U: 41, quelle: "Probe" }, { d: 0.365 });
    pruef(Math.abs(i1.wert - (100 - 41 * 0.365 + 4 * 0.365 * 0.365)) < 0.01,
      "A - U*d + 4d^2 muss exakt gerechnet werden");
    pruef(i1.annahme === false, "Eine belegte Wanddicke ist keine Annahme");
    const i2 = innenflaeche({ A: 88.5, U: 38.6, quelle: "Soethe EG" },
      { unten: 0.24, oben: 0.50, annahme: true });
    pruef(i2.max > i2.wert && i2.wert > i2.min,
      "Ohne belegte Dicke liegt der Ansatz zwischen den Enden der Spanne");
    pruef(i2.annahme === true, "Ohne belegte Dicke ist die Innenflaeche Annahme");
    pruef(i2.max > 79 && i2.max < 80,
      "Soethe EG mit 0,24 m Wand: rund 79,5 m^2 innerhalb der Aussenwaende");
    const i3 = innenflaeche({ A: 60, U: 0, quelle: "ohne Umfang" }, { d: 0.365 });
    pruef(i3.obergrenze === true, "Ohne Umfang bleibt die Kontur Obergrenze");
    pruef(innenflaeche({ A: 0, U: 10 }, { d: 0.3 }) === null,
      "Ohne Konturflaeche gibt es keine Innenflaeche");

    /* --- Groessentabelle ---------------------------------------------- */
    pruef(groesse("wohnen").wert > groesse("wc").wert,
      "Ein Wohnraum ist groesser als ein WC");
    pruef(groesse("wohnen").belegt === true,
      "wohnen ist von drei Gebaeuden belegt");
    pruef(groesse("nebenraum").belegt === false,
      "nebenraum steht auf einem Gebaeude und gilt als unbelegt");
    pruef(groesse("nebenraum").min === SPANNE_GESAMT.min,
      "Eine unbelegte Zeile bekommt die Spanne des ganzen Pruefsatzes");
    pruef(groesse("gibtesnicht").wert === 1,
      "Eine unbekannte Raumart bekommt den Durchschnittsraum");

    /* --- Verteilen ----------------------------------------------------- */
    const rs = [
      { id: "a", name: "Wohnen", art: "wohnen" },
      { id: "b", name: "WC", art: "wc" },
      { id: "c", name: "Bad", art: "bad" },
    ];
    const v = verteilen(rs, { wert: 60 });
    let s = 0;
    Object.keys(v.je_raum).forEach(function (k) { s += v.je_raum[k].A; });
    pruef(Math.abs(s - 60) < 0.05, "Die Summe der verteilten Flaechen ist die Innenflaeche");
    pruef(v.je_raum.a.A > v.je_raum.c.A && v.je_raum.c.A > v.je_raum.b.A,
      "Wohnen > Bad > WC, nicht gleichmaessig");
    pruef(v.je_raum.a.A_max > v.je_raum.a.A && v.je_raum.a.A_min < v.je_raum.a.A,
      "Jede verteilte Flaeche traegt eine Spanne");

    /* Eine belegte Flaeche wird nie ersetzt und zieht ihren Anteil ab. */
    const rs2 = [
      { id: "a", name: "Wohnen", art: "wohnen", A: 30 },
      { id: "b", name: "WC", art: "wc" },
    ];
    const v2 = verteilen(rs2, { wert: 60 });
    pruef(v2.je_raum.a === undefined, "Ein Raum mit Flaeche bekommt keinen Vorschlag");
    pruef(Math.abs(v2.je_raum.b.A - 30) < 0.05,
      "Der Rest nach Abzug der belegten Flaeche geht an den offenen Raum");

    /* Belegte Flaechen groesser als die Kontur: Warnung statt stiller Null. */
    const v3 = verteilen([{ id: "a", art: "wohnen", A: 70 }, { id: "b", art: "wc" }],
      { wert: 60 });
    pruef(!!v3.warnung && !v3.je_raum.b, "Kein Rest heisst Warnung, kein Vorschlag");

    /* --- Gelesene Fassadenlaenge sticht innerhalb der Raumart ---------- */
    const og = [
      { id: "k1", art: "wohnen", aussenwand_m: 4.85 },
      { id: "k2", art: "wohnen", aussenwand_m: 3.22 },
      { id: "fl", art: "flur" },
    ];
    const v4 = verteilen(og, { wert: 60 });
    pruef(v4.je_raum.k1.A > v4.je_raum.k2.A * 1.4,
      "Die laengere gelesene Fassade ergibt den groesseren Raum");
    pruef(Math.abs(v4.je_raum.k1.A / v4.je_raum.k2.A - 4.85 / 3.22) < 0.01,
      "Die Flaechen verhalten sich wie die gelesenen Fassadenlaengen");
    /* Ein einzelner Raum mit Laenge hat keinen Vergleich und darf nicht
       verschoben werden. */
    const v5 = verteilen([{ id: "x", art: "wohnen", aussenwand_m: 4.85 },
                          { id: "y", art: "wohnen" }], { wert: 40 });
    pruef(Math.abs(v5.je_raum.x.A - v5.je_raum.y.A) < 0.01,
      "Eine einzelne gelesene Laenge ohne Vergleich verschiebt nichts");

    /* --- Die Kette ----------------------------------------------------- */
    const p = [
      { id: "e1", art: "wohnen", geschoss: "EG" },
      { id: "e2", art: "wc", geschoss: "EG" },
      { id: "o1", art: "wohnen", geschoss: "OG" },
    ];
    const k1 = kette(p, {
      kontur: function (g) {
        return g === "EG" ? { A: 88.5, U: 38.6, quelle: "Aussenbemassung EG" } : null;
      },
      wanddicke: { unten: 0.24, oben: 0.50, annahme: true },
    });
    pruef(!!k1.je_raum.e1 && !!k1.je_raum.e2, "EG wird aus der eigenen Kontur verteilt");
    pruef(k1.je_raum.e1.stufe === "kontur", "Stufe c heisst kontur");
    pruef(k1.je_raum.o1 && k1.je_raum.o1.stufe === "geschwister",
      "Ohne eigene Kontur greift Stufe d, das Geschwistergeschoss");
    pruef(/Geschosses EG/.test(k1.je_raum.o1.herkunft),
      "Die Herkunft nennt das fremde Geschoss");
    const k2 = kette(p, { kontur: function () { return null; } });
    pruef(k2.ohne.length === 2 && Object.keys(k2.je_raum).length === 0,
      "Ohne jede Kontur gibt es keinen Vorschlag, sondern einen Grund");
    pruef(/abgegriffen/.test(k2.ohne[0].grund), "Und der Grund sagt, was zu tun ist");

    /* Ein Raum mit Flaeche taucht in der Kette nicht auf. */
    const k3 = kette([{ id: "z", art: "wohnen", geschoss: "EG", A: 20 }], {
      kontur: function () { return { A: 88.5, U: 38.6, quelle: "x" }; },
      wanddicke: { d: 0.365 },
    });
    pruef(Object.keys(k3.je_raum).length === 0,
      "Ein Raum mit belegter Flaeche bekommt keinen Vorschlag");

    return { ok: f.length === 0, fehler: f, anzahl: n };
  }

  const AUSGANG = {
    GROESSEN: GROESSEN,
    PRUEFSATZ: PRUEFSATZ,
    SPANNE_GESAMT: SPANNE_GESAMT,
    groesse: groesse,
    innenflaeche: innenflaeche,
    gewicht: gewicht,
    fassadenmittel: fassadenmittel,
    verteilen: verteilen,
    kette: kette,
    selbsttest: selbsttest,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = AUSGANG;
  if (global) global.KERN_FLAECHE = AUSGANG;
})(typeof window !== "undefined" ? window : null);
