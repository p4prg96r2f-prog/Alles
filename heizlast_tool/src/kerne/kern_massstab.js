/* ===========================================================================
 * kern_massstab.js — Maßstab eines Grundrisses automatisch bestimmen
 * ===========================================================================
 * Ein falscher Maßstab verfälscht jede Fläche und damit die gesamte Heizlast,
 * ohne dass es später auffällt. Deshalb gilt hier durchgehend: lieber keine
 * Angabe als eine geratene. Das Modul liefert nie einen Wert ohne Konfidenz
 * und verweigert die Bestimmung, sobald die Belege sich widersprechen.
 *
 * Drei Wege, die gegeneinander geprüft werden:
 *
 *   A) MASSKETTE. Eine Maßzahl im Plan ("6,00") gehört zu einer Maßlinie
 *      bekannter Pixellänge. Text und ungefähre Lage der Maßzahl liefert das
 *      Modell (Endpunkt plan-auslesen). Dieses Modul sucht die zugehörige
 *      Maßlinie im Bild, findet die begrenzenden Maßhilfslinien und rechnet
 *      Pixel je Meter. Mehrere Maßketten werden gegeneinander geprüft.
 *      Das ist der einzige Weg, der auch bei Bildschirmfotos, Scans und
 *      Handyaufnahmen gilt, weil er nur die Zeichnung selbst benutzt.
 *
 *   B) MASSSTABSANGABE im Plankopf ("M 1:100") zusammen mit der bekannten
 *      Bildauflösung in Punkten je Zoll. Gültig nur unter den Bedingungen,
 *      die weiter unten bei GUELTIGKEIT_B ausführlich stehen — bei einem
 *      Bildschirmfoto ist die Auflösung unbekannt, dann taugt der Weg nicht.
 *
 *   C) PLAUSIBILITÄT über typische Raum- und Gebäudegrößen. Grenzt den
 *      Maßstab grob ein, BESTIMMT ihn nicht. Fehlen A und B, sagt das Modul
 *      klar, dass der Bearbeiter den Maßstab von Hand setzen muss.
 *
 * Eingabe wie bei kern_planpruefung.js: ein Objekt wie ImageData, also
 * { data: Uint8ClampedArray (RGBA), width, height }. Keine Abhängigkeiten,
 * damit das Modul in Node und im Browser gleich läuft.
 *
 * Ergebnis:  handlung = "uebernehmen"  Wert ist doppelt belegt, darf gesetzt werden
 *            handlung = "bestaetigen"  Vorschlag da, Bearbeiter muss ihn prüfen
 *            handlung = "von_hand"     keine belastbare Grundlage, Bearbeiter setzt
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_MASSSTAB = M;
})(this, function () {

  /* Deutsche Zahlform. Bis zum 26.08.2026 lief jede Zahl dieses Moduls ueber
     toFixed() und stand mit PUNKT in den Meldungen: "69.4 Pixel je Meter",
     "1:126.9", "242.0 Prozent" — im selben Fenster daneben schrieb das
     Kontrollblatt Komma. Gerechnet wird unveraendert mit Punktzahlen; nur
     der Text ist deutsch. */
  const de = (x, n) => {
    const k = n === undefined ? 1 : n;
    return Number.isFinite(Number(x))
      ? Number(x).toFixed(k).replace(".", ",") : String(x);
  };

  /* ------------------------------------------------------------------
   * Schwellen. Jede mit Begründung, damit sie nachvollziehbar bleibt.
   * ------------------------------------------------------------------ */
  const S = {
    /* Zwei Maßketten dürfen um höchstens zwei Prozent auseinanderliegen.
     * Zwei Prozent Längenfehler sind vier Prozent Flächenfehler und damit
     * rund vier Prozent Fehler in der Transmissionsheizlast. Das ist die
     * Grenze, bis zu der ein Ergebnis noch als eine Aussage gelten kann.
     *
     * WICHTIG: Diese Grenze gilt für den Abstand der Kandidaten
     * UNTEREINANDER, also für (groesster / kleinster − 1). Sie darf nicht
     * als Abstand zum Median geprüft werden: zwei Werte, die je zwei Prozent
     * nach oben und unten vom Median abweichen, liegen vier Prozent
     * auseinander und wären damit acht Prozent Flächenfehler. Der
     * Medianfilter läuft zusätzlich, aber er ersetzt die Spannweitenprobe
     * nicht. */
    ABWEICHUNG_MAX: 0.02,

    /* Eigene, WEITERE Grenze fuer den Vergleich SCHRIFTFELD gegen MESSUNG.
     *
     * Warum nicht dieselben zwei Prozent: ABWEICHUNG_MAX oben gilt fuer den
     * Abstand mehrerer Messungen UNTEREINANDER. Sie beschreibt, wie genau
     * dieselbe Groesse zweimal getroffen wird. Der Vergleich mit dem
     * Schriftfeld ist eine andere Frage: er soll herausfinden, ob das Blatt
     * VERKLEINERT vorliegt. Das ist kein stetiger Fehler, sondern ein
     * Sprung — zwischen zwei DIN-A-Formaten liegt der Faktor 1,41, die
     * kleinste am Kopierer ueberhaupt einstellbare Verkleinerung ist 94
     * Prozent, also 6 Prozent.
     *
     * Mit zwei Prozent wurde deshalb Messrauschen als Formatfehler gemeldet:
     * an schnitt_bb.pdf stand im Schriftfeld 1:50, gemessen wurden 1:48,8,
     * das sind 2,4 Prozent — und das Werkzeug sperrte den Massstab mit der
     * Aussage, das Blatt liege nicht in Originalgroesse vor. Diese Aussage
     * war falsch: 2,4 Prozent sind kein Formatschritt.
     *
     * Zusaetzlich kann der Vergleich nie genauer sein als die Messung selbst.
     * Streuen die Massketten untereinander, gilt das Doppelte dieser
     * Streuung (Spannweite ueber beide Enden), mindestens aber diese 6
     * Prozent. Festlegung dieses Werkzeugs, kein Normwert. */
    ABWEICHUNG_KOPF: 0.06,

    /* Eine Maßzahl steht mittig über dem Abschnitt, den sie bemaßt. Sitzt
     * sie deutlich außermittig, ist der Abschnitt falsch abgegrenzt — etwa
     * weil eine Maßhilfslinie nicht gefunden wurde und der übernächste
     * Teiler genommen worden ist. Zugelassen ist ein Versatz von 15 Prozent
     * der Abschnittslänge; die Lage der Maßzahl kommt vom Modell und ist
     * nur ungefähr, deshalb nicht enger. Annahme, kein Normwert. */
    MITTIG_MAX: 0.15,

    /* Zwei Funde gelten als dieselbe Messung, wenn Richtung, Zeile und
     * Spanne bis auf diese Pixelzahl übereinstimmen. */
    DUBLETTE_PX: 6,

    /* Sicherheitsfaktor für die Gegenprobe über Weg C. Die Spanne aus Weg C
     * beruht auf Annahmen über Gebäudegrößen und ist bewusst weit; erst wenn
     * der bestimmte Wert um mehr als diesen Faktor daneben liegt, ist er
     * grob unplausibel. Ein Einheitenfehler um Faktor zehn fällt damit auf,
     * ein sauber gemessener Randfall nicht. */
    C_SICHERHEIT: 2,

    /* Kürzere Strecken taugen nicht als Grundlage: der unvermeidliche
     * Ablesefehler von rund einem Pixel je Ende ist bei 60 Pixel schon
     * gut drei Prozent und damit größer als die zugelassene Abweichung. */
    PX_MIN_SEGMENT: 60,

    /* Sinnvoller Bereich einer einzelnen Maßzahl in Metern. Kleinere Werte
     * sind Wanddicken und Anschlagmaße, größere sind Gesamtmaße von
     * Geländeplänen, beides taugt hier nicht. Annahme, kein Normwert. */
    METER_MIN: 0.30,
    METER_MAX: 60,

    /* Pixel je Meter: dieselbe Untergrenze wie in kern_planpruefung.js,
     * darunter lässt sich kein Raum mehr brauchbar umfahren. */
    PXM_MIN: 15,
    PXM_MAX: 3000,

    /* Die Zeichnung muss ein Gebäude zeigen können. Bei einem Blatt, das
     * rechnerisch weniger als 1,5 m oder mehr als 400 m abdeckt, stimmt
     * etwas nicht. Annahme, dient nur als grobes Netz. */
    ABDECKUNG_MIN_M: 1.5,
    ABDECKUNG_MAX_M: 400,

    /* Ab dieser Güte gilt ein Maßketten-Fund als sauber, das heißt: Maßlinie
     * eindeutig, beidseitig durch Maßhilfslinien begrenzt, dünn gezeichnet. */
    GUETE_SAUBER: 0.70,

    /* Für die automatische Übernahme sind zwei unabhängige Belege nötig. */
    BELEGE_MIN: 2,

    /* Typische Größen für Weg C. Ausdrücklich ANNAHMEN aus der Bearbeitung
     * von Wohngebäudeplänen, keine Normwerte. Sie dürfen deshalb nur
     * eingrenzen, niemals bestimmen. */
    C_GEBAEUDE_MIN_M: 4,
    C_GEBAEUDE_MAX_M: 40,
    C_RAUM_MIN_M2: 6,
    C_RAUM_MAX_M2: 40,
  };

  /* Übliche Zeichnungsmaßstäbe im Hochbau (DIN 1356-1 bzw. ISO 5455).
   * Ein Nenner außerhalb dieser Reihe ist nicht verboten, aber verdächtig
   * und wird als Einschränkung gemeldet. */
  const NENNER_UEBLICH = [1, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

  /* Wann Weg B gilt — dieser Text wird im Ergebnis mitgeliefert, damit im
   * Bericht nachlesbar ist, worauf sich die Bestimmung stützt. */
  const GUELTIGKEIT_B =
    "Der Weg über die Maßstabsangabe im Plankopf gilt nur, wenn alle vier "
    + "Bedingungen erfüllt sind: (1) die Bildauflösung in Punkten je Zoll ist "
    + "bekannt, weil das Bild aus einem PDF mit bekannter Renderstufe stammt "
    + "oder der Scanner sie in die Datei geschrieben hat; (2) das Bild wurde "
    + "danach nicht mehr skaliert, also nicht verkleinert, zugeschnitten und "
    + "wieder hochgerechnet; (3) das Blatt liegt in der Größe vor, in der es "
    + "gezeichnet wurde, ist also keine verkleinerte Kopie (A1 auf A3 kopiert "
    + "macht die Angabe im Plankopf falsch); (4) die Angabe im Plankopf gilt "
    + "für die gezeigte Zeichnung und nicht nur für einen Detailausschnitt. "
    + "Bei einem Bildschirmfoto ist Bedingung (1) verletzt, weil die Anzeige "
    + "beliebig gezoomt sein kann. Weg B scheidet dann aus.";

  /* ==================================================================
   * 1  Textauswertung: Maßzahl und Maßstabsangabe
   * ================================================================== */

  /** Bedeutungen, die das Modell melden kann und die KEINE Länge sind.
   *  Schlüssel bewusst ASCII, weil sie über den Endpunkt laufen. */
  const BEDEUTUNG_KEINE_LAENGE = [
    "raumflaeche", "flaeche", "wohnflaeche", "nutzflaeche",
    "hoehenkote", "kote", "okff", "raumnummer", "nummer",
    "stueckzahl", "neigung", "grad", "prozent", "temperatur",
  ];

  /** Wandelt eine abgelesene Maßzahl in Meter.
   *  Gibt { meter, einheit, sicher, grund } zurück. Ist die Einheit nicht
   *  eindeutig, wird meter=null geliefert — eine falsch angenommene Einheit
   *  wäre ein Faktor 10 oder 100 auf die gesamte Heizlast.
   *
   *  Genauso streng wird geprüft, ob der Text überhaupt eine Länge IST. In
   *  einem Grundriss steht sehr viel mit Dezimaltrenner, was keine Maßkette
   *  bemaßt: Raumflächen ("23,45 m²"), Höhenkoten ("OKFF +2,80"),
   *  Öffnungsmaße ("1,01/2,26"), Neigungen ("5,5 %"). Würde davon auch nur
   *  eine Angabe als Länge genommen, entstünde ein Maßstab, der sich nicht
   *  als falsch zu erkennen gibt. Alles, was nicht zweifelsfrei eine reine
   *  Maßangabe ist, wird deshalb verworfen. */
  function textZuMeter(text, einheit, bedeutung) {
    const roh = String(text === undefined || text === null ? "" : text);
    const bed = String(bedeutung || "").toLowerCase();
    if (bed && BEDEUTUNG_KEINE_LAENGE.indexOf(bed) >= 0) {
      return { meter: null, einheit: null, sicher: false,
               grund: "als \"" + bed + "\" gemeldet, das ist keine Maßkette" };
    }
    let t = roh.replace(/\s+/g, "").toLowerCase();
    if (!t) return { meter: null, einheit: null, sicher: false, grund: "leerer Text" };

    const eRoh = String(einheit === undefined || einheit === null ? "" : einheit)
      .replace(/\s+/g, "").toLowerCase();

    /* 1  Flächenangabe. "m²", "m2", "qm" — auch in der Einheit vom Modell. */
    if (/(m²|m2|qm|㎡|cm²|cm2)/.test(t) || /(m²|m2|qm|㎡)/.test(eRoh)) {
      return { meter: null, einheit: null, sicher: false,
               grund: "Flächenangabe \"" + roh + "\", keine Länge" };
    }
    /* 2  Höhenkote oder Bezugshöhe. Sie beschreibt eine Lage über einem
     *    Nullpunkt, nicht die Länge einer Maßlinie. Erkennbar am Vorzeichen
     *    und an den üblichen Kürzeln. */
    if (/^[+\-±]/.test(t) || /(okff|okrf|okfb|ukrd|oberkante|unterkante|ffb|ü\.nn|ünn|nn\+|\+nn)/.test(t)
        || /^(ok|uk)[.\-:]/.test(t)) {
      return { meter: null, einheit: null, sicher: false,
               grund: "Höhenkote oder Bezugshöhe \"" + roh + "\", keine Länge" };
    }
    /* 3  Neigung, Anteil, Winkel, Stückzahl. */
    if (/[%°]/.test(t) || /(stk|stck)/.test(t)) {
      return { meter: null, einheit: null, sicher: false,
               grund: "keine Maßangabe: \"" + roh + "\"" };
    }
    /* 4  Öffnungsmaß oder Formatangabe: zwei Zahlen, verbunden durch x
     *    oder Schrägstrich ("1,01/2,26"). Beide Zahlen sind Längen, aber
     *    keine gehört zu der Maßlinie, an der die Angabe steht. */
    if (/\d\s*[x×\/]\s*\d/.test(t)) {
      return { meter: null, einheit: null, sicher: false,
               grund: "Öffnungs- oder Formatangabe \"" + roh + "\", nicht einer Maßlinie zuzuordnen" };
    }

    // Einheit aus dem Text herauslösen, falls sie mitgeschrieben ist
    let ausText = null;
    const m = t.match(/(mm|cm|dm|m)$/);
    if (m) { ausText = m[1]; t = t.slice(0, t.length - m[1].length); }

    /* 5  Was übrig bleibt, muss eine einzelne Zahl sein: Ziffern mit
     *    höchstens einem Trenner, sonst nichts. Frühere Fassungen haben alle
     *    störenden Zeichen weggeschnitten; aus "23,45 m2" wurde dabei
     *    23,452 m. Es wird deshalb nicht mehr geputzt, sondern geprüft. */
    if (!/^(\d+([.,]\d+)?|[.,]\d+)$/.test(t)) {
      return { meter: null, einheit: null, sicher: false,
               grund: "keine reine Maßzahl: \"" + roh + "\"" };
    }

    // Deutsches Komma und angelsächsischer Punkt gelten beide als Trenner.
    // Ein Tausenderpunkt kommt in Maßketten nicht vor, deshalb eindeutig.
    const hatTrenner = /[.,]/.test(t);
    const zahl = parseFloat(t.replace(",", "."));
    if (!isFinite(zahl) || zahl <= 0) {
      return { meter: null, einheit: null, sicher: false, grund: "keine auswertbare Zahl: " + roh };
    }

    const e = (einheit && einheit !== "unklar") ? String(einheit) : ausText;
    if (e === "m") return fertig(zahl, "m");
    if (e === "cm") return fertig(zahl / 100, "cm");
    if (e === "mm") return fertig(zahl / 1000, "mm");
    if (e === "dm") return fertig(zahl / 10, "dm");

    /* Keine Einheit angegeben. In deutschen Bauzeichnungen werden Meter mit
     * zwei Nachkommastellen geschrieben ("6,00", ",85"), Zentimeter dagegen
     * ohne Trenner ("620"). Nur der erste Fall ist eindeutig genug. */
    if (hatTrenner) return fertig(zahl, "m (aus Schreibweise mit Trenner)");
    if (zahl >= S.METER_MIN && zahl <= S.METER_MAX && zahl < 100) {
      // "6" oder "12" ohne Trenner: könnte Meter sein, könnte Zentimeter sein.
      return { meter: null, einheit: null, sicher: false,
               grund: "Einheit nicht eindeutig: \"" + roh + "\" kann Meter oder Zentimeter sein" };
    }
    return { meter: null, einheit: null, sicher: false,
             grund: "Einheit nicht eindeutig: \"" + roh + "\" ohne Trenner und ohne Einheit" };

    function fertig(v, bez) {
      if (v < S.METER_MIN || v > S.METER_MAX) {
        return { meter: null, einheit: bez, sicher: false,
                 grund: "unplausible Länge " + de(v, 3) + " m aus \"" + roh + "\"" };
      }
      return { meter: v, einheit: bez, sicher: true, grund: "" };
    }
  }

  /** Liest den Maßstabsnenner aus einem Plankopftext. "M 1:100" ergibt 100. */
  function nennerAusText(text) {
    const t = String(text || "");
    // Auf einen Doppelpunkt oder Schrägstrich zwischen 1 und Nenner prüfen.
    const treffer = t.match(/(?:^|[^0-9])1\s*[:\/]\s*(\d{1,4})(?![0-9])/);
    if (!treffer) return { nenner: null, ueblich: false, fundstelle: "" };
    const n = parseInt(treffer[1], 10);
    if (!isFinite(n) || n <= 0) return { nenner: null, ueblich: false, fundstelle: "" };
    return {
      nenner: n,
      ueblich: NENNER_UEBLICH.indexOf(n) >= 0,
      fundstelle: treffer[0].trim(),
    };
  }

  /** Pixel je Meter aus Maßstabsnenner und Auflösung.
   *  1 m Wirklichkeit sind auf dem Blatt 1000/nenner Millimeter, und ein
   *  Millimeter sind dpi/25,4 Bildpunkte. */
  function pxJeMeterAusNenner(nenner, dpi) {
    if (!nenner || !dpi || nenner <= 0 || dpi <= 0) return null;
    return dpi * 1000 / (25.4 * nenner);
  }

  /** Umkehrung dazu: welcher Maßstab liegt der gemessenen Pixelzahl je Meter
   *  zugrunde, wenn die Auflösung bekannt ist. Gebraucht für den Abgleich mit
   *  der Angabe im Schriftfeld: die Maßketten liefern Pixel je Meter, das
   *  Schriftfeld einen Nenner; vergleichen lässt sich beides erst, wenn eine
   *  Seite in die Sprache der anderen übersetzt ist. Ergebnis bewusst nicht
   *  gerundet — gerundet würde aus 1:87 ein 1:100 und der Befund verschwände. */
  function nennerAusPxJeMeter(pxm, dpi) {
    if (!pxm || !dpi || pxm <= 0 || dpi <= 0) return null;
    return dpi * 1000 / (25.4 * pxm);
  }

  /* ==================================================================
   * 1b  Der Maßstab, den das Modell vom Blatt abgelesen hat
   * ==================================================================
   * Der erste und billigste Weg an den Maßstab ist nicht die Bildauswertung,
   * sondern das Schriftfeld: auf fast jedem Plan steht er dort. Die
   * Betriebsart "raeume" des Ausleseendpunkts liefert ihn seitdem mit.
   *
   * DIE FALLE, gegen die dieser Abschnitt gebaut ist:
   * Ein Plan wird verkleinert gedruckt (A1 auf A3 kopiert), beschnitten oder
   * als Bildschirmfoto weitergegeben. Im Schriftfeld steht danach immer noch
   * "1:100", für die vorliegende Unterlage stimmt das aber nicht mehr. Der
   * abgelesene Nenner ist deshalb ALLEIN kein Beleg. Er wird erst zu einem,
   * wenn die Blattgröße gesichert ist: die im Schriftfeld angeschriebene
   * Blattgröße muss zu der Größe passen, in der das Blatt tatsächlich
   * vorliegt. Bei einem Foto oder Bildschirmfoto gibt es diese Größe nicht,
   * dann bleibt der Wert ein Vorschlag und muss am Bild nachgemessen werden.
   *
   * Diese Unterscheidung wird hier NICHT weggerechnet, sondern in "guete"
   * und in den Befunden festgehalten, damit sie im Werkzeug sichtbar bleibt.
   */

  /* Papierformate der A-Reihe nach DIN EN ISO 216, in Millimetern.
   * Nur zum Vergleich der angeschriebenen mit der vorliegenden Blattgröße. */
  const DIN_A = {
    A0: [841, 1189], A1: [594, 841], A2: [420, 594],
    A3: [297, 420], A4: [210, 297],
  };

  /* Zugelassene Abweichung beim Formatvergleich. Aus einem PDF gerechnete
   * Blattmaße treffen die Nennmaße auf Bruchteile eines Millimeters; ein
   * beschnittener Scan weicht mehr ab. Fünf Millimeter lassen Rundung und
   * Scanrand durch und trennen A3 (297 mm) sicher von A4 (210 mm). */
  const FORMAT_TOLERANZ_MM = 5;

  /** Sucht zu einem Blattmaß in Millimetern das DIN-A-Format.
   *  Hoch- und Querformat gelten gleich. Ohne Treffer: null. */
  function formatAusMass(breite_mm, hoehe_mm) {
    const b = Number(breite_mm), h = Number(hoehe_mm);
    if (!isFinite(b) || !isFinite(h) || b <= 0 || h <= 0) return null;
    const kurz = Math.min(b, h), lang = Math.max(b, h);
    const namen = Object.keys(DIN_A);
    for (let i = 0; i < namen.length; i++) {
      const s = DIN_A[namen[i]];
      if (Math.abs(kurz - s[0]) <= FORMAT_TOLERANZ_MM
          && Math.abs(lang - s[1]) <= FORMAT_TOLERANZ_MM) return namen[i];
    }
    return null;
  }

  /**
   * Wertet den Maßstabsblock aus, den die Planauslese geliefert hat.
   *
   * eingabe = {
   *   massstab: {                     Block aus der Betriebsart "raeume"
   *     angaben: [{ wortlaut, nenner, fundstelle, gilt_fuer, lesbarkeit }],
   *     nenner_grundriss, mehrere_massstaebe,
   *     blattgroesse, blattgroesse_wortlaut, bemasst, masszahlen: [...]
   *   },
   *   blatt: { breite_mm, hoehe_mm, herkunft }    optional, aus der Unterlage
   *           herkunft: "pdf" | "bild" | "unbekannt"
   * }
   *
   * Ergebnis = {
   *   nenner            Nenner für den Grundriss, oder null
   *   guete             "belegt" | "vorlaeufig" | "widerspruch" | "unbekannt"
   *   quelle            kurzer Satz für die Seitenliste
   *   wortlaut          was wörtlich dastand
   *   fundstelle        wo es stand
   *   gilt_fuer         welchem Zeichnungsteil es zugeordnet ist
   *   mehrere           mehrere verschiedene Maßstäbe auf dem Blatt
   *   angaben           alle gelesenen Angaben, geprüft
   *   blattgroesse      angeschrieben, oder null
   *   blattmass_gesichert  liegt das Blatt nachweislich in Originalgröße vor
   *   bemasst           Maßketten vorhanden
   *   masszahlen        für bestimmeMassstab (Weg A) aufbereitet
   *   handlung          "uebernehmen" | "bestaetigen" | "messen" | "von_hand"
   *   befunde           [{ id, titel, stufe, text, wert }]
   * }
   */
  function ausAuslese(eingabe) {
    const e = eingabe || {};
    const m = e.massstab || {};
    const blatt = e.blatt || {};
    const befunde = [];
    const erg = {
      nenner: null, guete: "unbekannt", quelle: "", wortlaut: "", fundstelle: "",
      gilt_fuer: "", mehrere: false, angaben: [], blattgroesse: null,
      blattmass_gesichert: false, bemasst: false, masszahlen: [],
      handlung: "von_hand", befunde: befunde,
    };

    /* ---------- 1  Die abgelesenen Angaben prüfen ---------- */
    /* Der Nenner kommt zweimal: als Zahl und im Wortlaut. Beide laufen durch
       nennerAusText, damit eine verlesene Zahl auffällt. Weicht die Zahl vom
       Wortlaut ab, gilt der Wortlaut, denn er ist das Abgeschriebene. */
    const rohAngaben = Array.isArray(m.angaben) ? m.angaben : [];
    for (let i = 0; i < rohAngaben.length; i++) {
      const a = rohAngaben[i] || {};
      const wortlaut = String(a.wortlaut || "");
      const ausText = nennerAusText(wortlaut);
      const alsZahl = (a.nenner === null || a.nenner === undefined) ? null : Number(a.nenner);
      const zahlGueltig = alsZahl !== null && isFinite(alsZahl) && alsZahl > 0
        && alsZahl <= 5000 && alsZahl === Math.round(alsZahl);
      let nenner = null, quelle = "";
      if (ausText.nenner) {
        nenner = ausText.nenner;
        quelle = "aus dem Wortlaut \"" + wortlaut + "\"";
        if (zahlGueltig && alsZahl !== ausText.nenner) {
          befunde.push(bef("massstab_gelesen_uneins", "Maßstabsangabe", "einschraenkung",
            "Die Angabe \"" + wortlaut + "\" wurde als 1:" + alsZahl + " gemeldet, im "
            + "Wortlaut steht aber 1:" + ausText.nenner + ". Es gilt der Wortlaut; die "
            + "Angabe ist vor dem Übernehmen am Plan zu prüfen.", ausText.nenner));
        }
      } else if (zahlGueltig) {
        nenner = alsZahl;
        quelle = "als Zahl gemeldet, im Wortlaut nicht wiederzufinden";
      }
      erg.angaben.push({
        wortlaut: wortlaut,
        nenner: nenner,
        ueblich: nenner !== null && NENNER_UEBLICH.indexOf(nenner) >= 0,
        fundstelle: String(a.fundstelle || ""),
        gilt_fuer: String(a.gilt_fuer || ""),
        lesbarkeit: a.lesbarkeit === "unsicher" ? "unsicher" : "sicher",
        herkunft: quelle,
      });
    }

    /* ---------- 2  Mehrere Maßstäbe auf einem Bogen ---------- */
    /* Grundriss 1:100 und Detail 1:20 auf demselben Blatt ist der Regelfall
       bei Ausführungsplänen. Welcher Nenner zu welcher Zeichnung gehört, steht
       nur in gilt_fuer; ohne diese Zuordnung ist die Angabe wertlos. */
    const verschiedene = [];
    erg.angaben.forEach(function (a) {
      if (a.nenner !== null && verschiedene.indexOf(a.nenner) < 0) verschiedene.push(a.nenner);
    });
    erg.mehrere = m.mehrere_massstaebe === true || verschiedene.length > 1;

    /* ---------- 3  Welcher Nenner gilt für den Grundriss ---------- */
    const gemeldet = (m.nenner_grundriss === null || m.nenner_grundriss === undefined)
      ? null : Number(m.nenner_grundriss);
    /* Der Rückfall auf die einzige Angabe ist eng gefasst, und zwar wegen
       eines Falls, der am Erdgeschossplan der Mälzerstraße von 1936
       aufgetreten ist: Auf dem Bogen steht als einziger Maßstab "LAGEPLAN
       M 1:500". Ein Rückfall, der einfach die erste lesbare Angabe nimmt,
       hätte den Grundriss darüber mit 1:500 gerechnet, also fünffach zu groß.
       Übernommen wird eine Angabe deshalb nur dann ohne ausdrückliche
       Zuordnung durch das Modell, wenn sie erkennbar für das ganze Blatt
       gilt. Nennt sie einen anderen Zeichnungsteil, bleibt der Maßstab
       offen. */
    const FUER_GRUNDRISS = /ganzes blatt|grundri|geschoss|^$/i;
    let treffer = null;
    if (gemeldet !== null && isFinite(gemeldet) && gemeldet > 0) {
      treffer = erg.angaben.filter(function (a) { return a.nenner === gemeldet; })[0] || null;
      erg.nenner = gemeldet;
    } else if (!erg.mehrere && erg.angaben.length) {
      const mitNenner = erg.angaben.filter(function (a) { return a.nenner !== null; });
      const passend = mitNenner.filter(function (a) {
        return FUER_GRUNDRISS.test(String(a.gilt_fuer || "").trim());
      });
      if (mitNenner.length === 1 && passend.length === 1) {
        treffer = passend[0];
        erg.nenner = treffer.nenner;
      } else if (mitNenner.length) {
        befunde.push(bef("massstab_anderer_teil", "Maßstabsangabe", "einschraenkung",
          "Der einzige Maßstab auf dem Blatt ist 1:" + mitNenner[0].nenner + " und gehört "
          + "zu \"" + (mitNenner[0].gilt_fuer || "einem anderen Zeichnungsteil")
          + "\". Für den Grundriss gilt er nicht und wird deshalb nicht übernommen.",
          mitNenner[0].nenner));
      }
    }
    if (treffer) {
      erg.wortlaut = treffer.wortlaut;
      erg.fundstelle = treffer.fundstelle;
      erg.gilt_fuer = treffer.gilt_fuer;
    }
    if (erg.mehrere) {
      befunde.push(bef("massstab_mehrere", "Maßstabsangabe", "einschraenkung",
        "Auf dem Blatt stehen " + (verschiedene.length > 1
          ? verschiedene.map(function (n) { return "1:" + n; }).join(" und ")
          : "mehrere Maßstäbe")
        + ". Übernommen wird nur der Maßstab des Grundrisses"
        + (erg.gilt_fuer ? " (" + erg.gilt_fuer + ")" : "")
        + "; für Details und Lagepläne gilt er nicht.", verschiedene.length));
    }
    if (erg.mehrere && erg.nenner === null && erg.angaben.length) {
      befunde.push(bef("massstab_zuordnung_offen", "Maßstabsangabe", "sperre",
        "Es stehen mehrere Maßstäbe auf dem Blatt, aber keiner ist dem Grundriss "
        + "zuzuordnen. Welcher gilt, muss am Plan entschieden werden.", null));
    }

    /* ---------- 4  Unüblicher Nenner ---------- */
    if (erg.nenner !== null && NENNER_UEBLICH.indexOf(erg.nenner) < 0) {
      befunde.push(bef("massstab_kopf", "Maßstabsangabe", "einschraenkung",
        "Gelesen wurde 1:" + erg.nenner + ". Das ist kein üblicher Zeichnungsmaßstab; "
        + "die Angabe kann verlesen sein und zählt deshalb nicht als Beleg.", erg.nenner));
    }
    const unsicherGelesen = !!(treffer && treffer.lesbarkeit === "unsicher");
    if (unsicherGelesen) {
      befunde.push(bef("massstab_lesbarkeit", "Maßstabsangabe", "einschraenkung",
        "Die Angabe \"" + erg.wortlaut + "\" war nur unsicher lesbar.", null));
    }

    /* ---------- 5  Die Blattgröße, und damit die Falle ---------- */
    const angeschrieben = (m.blattgroesse && m.blattgroesse !== "keine_angabe"
                           && m.blattgroesse !== "andere") ? String(m.blattgroesse) : null;
    erg.blattgroesse = angeschrieben;
    const vorliegend = formatAusMass(blatt.breite_mm, blatt.hoehe_mm);
    const hatBlattmass = Number(blatt.breite_mm) > 0 && Number(blatt.hoehe_mm) > 0;

    let widerspruch = false;
    if (angeschrieben && vorliegend && angeschrieben === vorliegend) {
      erg.blattmass_gesichert = true;
    } else if (angeschrieben && vorliegend && angeschrieben !== vorliegend) {
      widerspruch = true;
      befunde.push(bef("massstab_verkleinert", "Maßstabsangabe", "sperre",
        "Das Schriftfeld nennt " + (m.blattgroesse_wortlaut
          ? "\"" + String(m.blattgroesse_wortlaut) + "\"" : angeschrieben)
        + ", die Unterlage liegt aber in " + vorliegend + " vor. Das Blatt ist "
        + "verkleinert oder vergrößert kopiert; die Maßstabsangabe "
        + (erg.nenner ? "1:" + erg.nenner + " " : "") + "gilt für diese Unterlage "
        + "NICHT mehr. Der Maßstab muss an einer Maßkette im Bild gemessen werden.",
        null));
    } else if (angeschrieben && !hatBlattmass) {
      befunde.push(bef("massstab_blattmass_offen", "Maßstabsangabe", "einschraenkung",
        "Das Schriftfeld nennt " + angeschrieben + ". In welcher Größe die Unterlage "
        + "vorliegt, ist bei einem Bild oder Bildschirmfoto nicht feststellbar. Ob der "
        + "Maßstab noch stimmt, lässt sich damit nicht sagen.", null));
    } else if (erg.nenner !== null) {
      befunde.push(bef("massstab_blattmass_fehlt", "Maßstabsangabe", "einschraenkung",
        "Im Schriftfeld steht keine Blattgröße. Ob das Blatt in der Größe vorliegt, in "
        + "der es gezeichnet wurde, ist deshalb nicht belegt. Eine verkleinerte Kopie "
        + "sähe genauso aus und würde 1:" + erg.nenner + " falsch machen.", null));
    }

    /* ---------- 6  Maßzahlen für den Messweg aufbereiten ---------- */
    /* Genau die Form, die bestimmeMassstab erwartet: Lage als linke obere Ecke
       des Textkästchens. Das Modell liefert Anteile der Bildkante, deshalb
       wird die Angabe ausdrücklich als "relativ" gekennzeichnet, statt sich
       auf das Erraten in kastenNormieren zu verlassen. */
    erg.bemasst = m.bemasst === true;
    const rohZahlen = Array.isArray(m.masszahlen) ? m.masszahlen : [];
    for (let i = 0; i < rohZahlen.length; i++) {
      const z = rohZahlen[i] || {};
      const x = Number(z.x), y = Number(z.y);
      if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x > 1 || y > 1) continue;
      const br = Number(z.breite), ho = Number(z.hoehe);
      erg.masszahlen.push({
        text: String(z.text === undefined || z.text === null ? "" : z.text),
        einheit: ["m", "cm", "mm"].indexOf(z.einheit) >= 0 ? z.einheit : "unklar",
        bedeutung: String(z.bedeutung || ""),
        x: x, y: y,
        breite: (isFinite(br) && br > 0 && br <= 1) ? br : undefined,
        hoehe: (isFinite(ho) && ho > 0 && ho <= 1) ? ho : undefined,
        koordinaten: "relativ",
      });
    }
    if (erg.bemasst && !erg.masszahlen.length) {
      befunde.push(bef("massstab_masszahlen_ohne_lage", "Maßketten", "einschraenkung",
        "Das Blatt ist bemaßt, es kam aber keine Maßzahl mit brauchbarer Lage an. Am "
        + "Bild nachmessen lässt sich der Maßstab damit nicht selbsttätig.", null));
    }

    /* ---------- 7  Güte und Handlung ---------- */
    /* Der Kern der Sache: Ein aus dem Schriftfeld gelesener Nenner ist ein
       Vorschlag, kein Messwert. "belegt" wird er nur, wenn die Blattgröße
       zusammenpasst und die Angabe sauber gelesen ist. Er wird nie
       "abgesichert" — das bleibt dem Fall vorbehalten, dass eine im Bild
       gemessene Maßkette dasselbe ergibt (siehe bestimmeMassstab). */
    const sauber = erg.nenner !== null
      && NENNER_UEBLICH.indexOf(erg.nenner) >= 0
      && !unsicherGelesen;

    if (widerspruch) {
      erg.guete = "widerspruch";
      erg.handlung = "messen";
      erg.quelle = "Schriftfeld widerspricht der Blattgröße";
    } else if (erg.nenner === null) {
      erg.guete = "unbekannt";
      erg.handlung = erg.masszahlen.length ? "messen" : "von_hand";
      erg.quelle = erg.angaben.length
        ? "auf dem Blatt gelesen, aber nicht dem Grundriss zuzuordnen"
        : "auf dem Blatt steht kein Maßstab";
    } else if (erg.blattmass_gesichert && sauber) {
      erg.guete = "belegt";
      erg.handlung = "bestaetigen";
      erg.quelle = "aus dem Blatt gelesen: \"" + erg.wortlaut + "\""
        + (erg.fundstelle ? ", " + erg.fundstelle : "")
        + "; Blattgröße " + erg.blattgroesse + " bestätigt";
    } else {
      erg.guete = "vorlaeufig";
      erg.handlung = erg.masszahlen.length ? "messen" : "bestaetigen";
      erg.quelle = "aus dem Blatt gelesen: \"" + erg.wortlaut + "\""
        + (erg.fundstelle ? ", " + erg.fundstelle : "")
        + "; Blattgröße nicht gesichert";
    }
    return erg;
  }

  /* ==================================================================
   * 2  Bildauswertung für Weg A
   * ================================================================== */

  function grau(bild) {
    const n = bild.width * bild.height;
    const g = new Float32Array(n);
    const d = bild.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
    }
    return g;
  }

  /** Schwelle nach Otsu, wie in kern_planpruefung.js: bei Strichzeichnungen
   *  ist der Tintenanteil klein und schwankt stark, feste Schwellen taugen
   *  deshalb nicht. */
  function otsu(g) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < g.length; i++) {
      const v = g[i] < 0 ? 0 : (g[i] > 255 ? 255 : g[i]);
      hist[Math.round(v)]++;
    }
    const n = g.length;
    let summe = 0;
    for (let v = 0; v < 256; v++) summe += v * hist[v];
    let bestS = 128, bestV = -1, wB = 0, sB = 0;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = n - wB;
      if (wF === 0) break;
      sB += t * hist[t];
      const mB = sB / wB, mF = (summe - sB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > bestV) { bestV = v; bestS = t; }
    }
    return bestS;
  }

  /** Binärmaske: 1 = Tinte. */
  function maskeAusBild(bild) {
    const g = grau(bild);
    const t = otsu(g);
    const m = new Uint8Array(g.length);
    for (let i = 0; i < g.length; i++) m[i] = g[i] <= t ? 1 : 0;
    return m;
  }

  /** Spiegelt die Maske an der Hauptdiagonale. Damit wird die senkrechte
   *  Maßkette mit demselben Code behandelt wie die waagerechte. */
  function transponiere(maske, w, h) {
    const t = new Uint8Array(maske.length);
    for (let y = 0; y < h; y++) {
      const z = y * w;
      for (let x = 0; x < w; x++) t[x * h + y] = maske[z + x];
    }
    return t;
  }

  /** Größter zusammenhängender Tintenlauf in einer Zeile, der die Spalte xs
   *  enthält. Kleine Lücken werden überbrückt; der Kasten der Maßzahl darf
   *  frei übersprungen werden, weil manche Zeichnungen die Maßlinie dort
   *  unterbrechen und die Zahl hineinsetzen. */
  function laufInZeile(maske, w, y, xs, luecke, x0, x1, sprung) {
    const z = y * w;
    const frei = function (x) { return sprung && x >= sprung.von && x <= sprung.bis; };
    let sx = -1;
    const suchweite = Math.max(luecke, sprung ? (sprung.bis - sprung.von) + luecke : luecke);
    for (let d = 0; d <= suchweite && sx < 0; d++) {
      if (xs - d >= x0 && maske[z + xs - d]) sx = xs - d;
      else if (xs + d <= x1 && maske[z + xs + d]) sx = xs + d;
    }
    if (sx < 0) return null;
    let links = sx, l = 0;
    for (let x = sx - 1; x >= x0; x--) {
      if (frei(x)) continue;
      if (maske[z + x]) { links = x; l = 0; } else if (++l > luecke) break;
    }
    let rechts = sx, r = 0;
    for (let x = sx + 1; x <= x1; x++) {
      if (frei(x)) continue;
      if (maske[z + x]) { rechts = x; r = 0; } else if (++r > luecke) break;
    }
    return { von: links, bis: rechts, laenge: rechts - links };
  }

  /** Senkrechte Ausdehnung der Tinte durch den Punkt (x,y). */
  function strichdicke(maske, w, h, x, y) {
    if (!maske[y * w + x]) return 0;
    let d = 1;
    for (let yy = y - 1; yy >= 0 && maske[yy * w + x]; yy--) d++;
    for (let yy = y + 1; yy < h && maske[yy * w + x]; yy++) d++;
    return d;
  }

  function median(a) {
    if (!a.length) return 0;
    const s = a.slice().sort(function (p, q) { return p - q; });
    const i = Math.floor(s.length / 2);
    return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
  }

  /** Sucht die Maßhilfslinien, die eine Maßlinie unterteilen.
   *
   *  Eine Maßhilfslinie oder ein Begrenzungsstrich KREUZT die Maßlinie: sie
   *  hinterlässt Tinte oberhalb UND unterhalb, auf schmaler Breite. Eine
   *  Beschriftung steht dagegen nur auf EINER Seite und über eine breite
   *  Fläche. Genau daran werden beide unterschieden.
   *
   *  Diese Unterscheidung ist der Kern der Sicherheit dieses Moduls. Die Lage
   *  der Maßzahl kommt vom Modell und ist nur ungefähr; verließe man sich auf
   *  das Aussparen des angegebenen Kastens, würden bei einem Versatz die
   *  Ziffernstriche als Begrenzung gelesen. Weil derselbe Versatz alle
   *  Maßzahlen eines Plans gleich trifft, wären die falschen Werte auch noch
   *  untereinander stimmig, und der Abgleich der Maßketten würde den Fehler
   *  nicht bemerken. Der Kasten wird deshalb nur zusätzlich ausgespart.
   *
   *  Der 45-Grad-Schrägstrich, der in Bauzeichnungen oft statt eines Pfeils
   *  gesetzt wird, liegt oberhalb der Maßlinie links und unterhalb rechts.
   *  Er ergibt zwei getrennte Cluster; deshalb werden nahe beieinander
   *  liegende Cluster zu einer Gruppe verschmolzen und deren Mitte genommen.
   */
  function teilerSuchen(maske, w, h, y0, von, bis, dickeLinie, th, kaestenAlle) {
    const abstand = Math.max(2, Math.round(dickeLinie)) + 1;
    const fenster = Math.max(4, Math.round(th * 0.8));
    /* Nur Kästen sperren, die auch WIRKLICH an dieser Maßlinie liegen.
     * Früher wurde bloß der Bereich längs der Linie verglichen; eine Maßzahl
     * am anderen Ende des Blatts konnte damit eine Maßhilfslinie verdecken,
     * der Abschnitt wurde doppelt so lang gemessen und das Ergebnis galt
     * trotzdem als sauber. Deshalb muss der Kasten das Suchfenster quer zur
     * Linie überlappen. */
    const q0 = y0 - (abstand + fenster), q1 = y0 + (abstand + fenster);
    const kaesten = [];
    for (let i = 0; i < kaestenAlle.length; i++) {
      const k = kaestenAlle[i];
      if (k.quer0 === undefined || (k.quer1 >= q0 && k.quer0 <= q1)) kaesten.push(k);
    }
    /* Breiter als das Suchfenster hoch ist kann keine Begrenzung sein:
     * ein Schrägstrich reicht in der Breite höchstens so weit wie in der Höhe. */
    const maxGruppe = Math.max(8, Math.round(1.5 * (abstand + fenster)));
    const verschmelz = Math.max(12, Math.round(th));
    const rand = Math.max(2, Math.round(th * 0.3));
    const gesperrt = function (x) {
      for (let i = 0; i < kaesten.length; i++) {
        if (x >= kaesten[i].von - rand && x <= kaesten[i].bis + rand) return true;
      }
      return false;
    };

    /* 1  Spaltenweise prüfen, ob ober- und unterhalb der Maßlinie Tinte liegt.
     *    Der Bereich reicht über die Enden der Maßlinie hinaus, weil ein
     *    Schrägstrich an einem Kettenende zur Hälfte neben der Linie liegt.
     *    Ohne diesen Überstand würde er nur einseitig gesehen und verworfen. */
    const a0 = Math.max(0, von - maxGruppe), a1 = Math.min(w - 1, bis + maxGruppe);
    const roh = [];
    let akt = null;
    for (let x = a0; x <= a1 + 1; x++) {
      let oben = false, unten = false;
      if (x <= a1 && !gesperrt(x)) {
        for (let o = abstand; o <= abstand + fenster; o++) {
          const yo = y0 - o, yu = y0 + o;
          if (!oben && yo >= 0 && maske[yo * w + x]) oben = true;
          if (!unten && yu < h && maske[yu * w + x]) unten = true;
          if (oben && unten) break;
        }
      }
      if (oben || unten) {
        if (!akt) akt = { von: x, bis: x, oben: false, unten: false };
        akt.bis = x; akt.oben = akt.oben || oben; akt.unten = akt.unten || unten;
      } else if (akt) { roh.push(akt); akt = null; }
    }

    // 2  Nahe beieinander liegende Cluster gehören zu einer Begrenzung
    const gruppen = [];
    for (let i = 0; i < roh.length; i++) {
      const letzte = gruppen[gruppen.length - 1];
      if (letzte && roh[i].von - letzte.bis <= verschmelz) {
        letzte.bis = roh[i].bis;
        letzte.oben = letzte.oben || roh[i].oben;
        letzte.unten = letzte.unten || roh[i].unten;
      } else {
        gruppen.push({ von: roh[i].von, bis: roh[i].bis,
                       oben: roh[i].oben, unten: roh[i].unten });
      }
    }

    // 3  Einordnen: kreuzend, einseitig oder zu breit (dann Beschriftung)
    const beidseitig = [], einseitig = [];
    let breit = 0;
    for (let i = 0; i < gruppen.length; i++) {
      const g = gruppen[i];
      if (g.bis - g.von > maxGruppe) { breit++; continue; }
      const mitte = (g.von + g.bis) / 2;
      if (g.oben && g.unten) beidseitig.push(mitte); else einseitig.push(mitte);
    }
    return { beidseitig: beidseitig, einseitig: einseitig, beschriftung: breit,
             gesperrt: kaesten, rand: rand };
  }

  /** Wertet eine einzelne Maßzahl in einer Richtung aus.
   *  maske/w/h sind bereits so gedreht, dass die gesuchte Maßlinie
   *  waagerecht liegt. kaesten sind die x-Bereiche aller Maßzahlen. */
  function messeInRichtung(maske, w, h, kasten, kaesten, richtung) {
    const th = Math.max(6, kasten.hoehe);
    const cx = Math.round(kasten.x + kasten.breite / 2);
    const cy = Math.round(kasten.y + kasten.hoehe / 2);
    const band = Math.max(60, Math.round(th * 4));
    const luecke = Math.max(3, Math.round(th * 0.6));
    const minLauf = Math.max(S.PX_MIN_SEGMENT, Math.round(kasten.breite * 1.5));
    const sprung = { von: Math.round(kasten.x) - 2, bis: Math.round(kasten.x + kasten.breite) + 2 };

    /* Kandidatenzeilen im Suchband sammeln. Die Zeilen durch die Maßzahl
     * werden NICHT übersprungen: manche Zeichnungen unterbrechen die Maßlinie
     * und setzen die Zahl hinein, dann liegt die Linie genau dort. Die Ziffern
     * selbst können keine Zeile gewinnen, weil ihre Striche kurz sind und der
     * Kasten beim Ablaufen ohnehin übersprungen wird. */
    const y0 = Math.max(1, cy - band), y1 = Math.min(h - 2, cy + band);
    const zeilen = [];
    for (let y = y0; y <= y1; y++) {
      const l = laufInZeile(maske, w, y, cx, luecke, 0, w - 1, sprung);
      if (l && l.laenge >= minLauf) zeilen.push({ y: y, lauf: l });
    }
    if (!zeilen.length) return null;

    // Benachbarte Zeilen gehören zur selben Linie: je Gruppe nur die beste.
    zeilen.sort(function (a, b) { return b.lauf.laenge - a.lauf.laenge; });
    const gewaehlt = [];
    for (let i = 0; i < zeilen.length && gewaehlt.length < 6; i++) {
      let nah = false;
      for (let j = 0; j < gewaehlt.length; j++) {
        if (Math.abs(gewaehlt[j].y - zeilen[i].y) <= 4) { nah = true; break; }
      }
      if (!nah) gewaehlt.push(zeilen[i]);
    }

    let bester = null;
    for (let i = 0; i < gewaehlt.length; i++) {
      const zy = gewaehlt[i].y, lauf = gewaehlt[i].lauf;

      // Strichdicke der mutmaßlichen Maßlinie, gemessen an vielen Stellen,
      // damit die Kreuzungen mit den Maßhilfslinien nicht durchschlagen.
      const proben = [];
      for (let k = 0; k <= 20; k++) {
        const px = Math.round(lauf.von + (lauf.bis - lauf.von) * k / 20);
        if (px >= sprung.von && px <= sprung.bis) continue;
        const d = strichdicke(maske, w, h, px, zy);
        if (d > 0) proben.push(d);
      }
      const dickeLinie = proben.length ? median(proben) : 1;

      const t = teilerSuchen(maske, w, h, zy, lauf.von, lauf.bis, dickeLinie, th, kaesten);

      /* Kreuzende Begrenzungen sind die verlässlichen. Gibt es davon
       * mindestens zwei, werden einseitige Funde verworfen — das sind dann
       * Beschriftung, Schraffur oder Möblierung. Nur wenn die Zeichnung ihre
       * Maßhilfslinien nicht durchzieht, wird auf die einseitigen
       * zurückgegriffen, und der Fund gilt als weniger belastbar. */
      let teiler = t.beidseitig, art = "kreuzend";
      if (teiler.length < 2) {
        teiler = t.beidseitig.concat(t.einseitig)
          .sort(function (p, q) { return p - q; });
        art = "einseitig";
      }

      let links = null, rechts = null;
      for (let k = 0; k < teiler.length; k++) {
        if (teiler[k] <= cx - 2 && (links === null || teiler[k] > links)) links = teiler[k];
        if (teiler[k] >= cx + 2 && (rechts === null || teiler[k] < rechts)) rechts = teiler[k];
      }

      let pixel, begrenzt, von, bis;
      if (links !== null && rechts !== null) {
        pixel = rechts - links; begrenzt = true; von = links; bis = rechts;
      } else {
        pixel = lauf.laenge; begrenzt = false; art = "Linienenden";
        von = lauf.von; bis = lauf.bis;
      }

      /* Zwei Proben auf einen falsch abgegrenzten Abschnitt. Sie sind nötig,
       * weil der bloße Griff nach dem nächsten Teiler links und rechts eine
       * doppelt so lange Spanne genauso sauber aussehen lässt wie die
       * richtige, sobald eine Maßhilfslinie übersehen wurde.
       *
       * (a) MITTIGKEIT. Eine Maßzahl steht über der Mitte ihres Abschnitts.
       *     Liegt sie weit außermittig, gehört sie nicht zu dieser Spanne.
       * (b) VERDECKUNG. Liegt innerhalb der Spanne ein Bereich, der wegen
       *     einer anderen Beschriftung von der Teilersuche ausgenommen war,
       *     kann dort eine Maßhilfslinie stehen, die nicht gesehen wurde.
       *     Der eigene Kasten zählt nicht mit, er liegt immer innen. */
      let mittig = true, verdeckt = false;
      if (begrenzt) {
        const versatz = Math.abs(cx - (von + bis) / 2) / Math.max(1, bis - von);
        mittig = versatz <= S.MITTIG_MAX;
        for (let g = 0; g < t.gesperrt.length; g++) {
          const s = t.gesperrt[g];
          if (s.eigen) continue;
          if (s.von - t.rand > von + 2 && s.bis + t.rand < bis - 2) { verdeckt = true; break; }
        }
      }

      /* Zwei Kennzahlen, beide ausdrücklich keine Wahrscheinlichkeiten.
       *
       * struktur sagt, wie eindeutig der Fund in sich ist: sauber begrenzt,
       * dünn gezeichnet, lang genug. Davon hängt ab, ob der Wert als Beleg
       * taugt.
       *
       * guete gewichtet zusätzlich, wie nah die gefundene Linie an der vom
       * Modell gemeldeten Lage der Maßzahl liegt. Das dient nur der Auswahl
       * unter mehreren in Frage kommenden Zeilen. Es darf NICHT in die
       * Belastbarkeit einfließen: die Lage kommt vom Modell und ist nur
       * ungefähr, eine um zwanzig Pixel danebenliegende Schätzung macht eine
       * sauber vermessene Maßkette nicht schlechter. */
      const abstand = Math.abs(zy - cy);
      const naehe = 1 - 0.5 * Math.min(1, abstand / band);
      let struktur = begrenzt ? (art === "kreuzend" ? 0.95 : 0.65) : 0.45;
      if (dickeLinie > Math.max(4, th * 0.5)) struktur *= 0.6;  // zu fett für eine Maßlinie
      if (pixel < S.PX_MIN_SEGMENT) struktur *= 0.5;
      if (teiler.length > 60) struktur *= 0.7;                  // wirkt eher wie Schraffur
      if (!mittig) struktur *= 0.5;                             // Abschnitt passt nicht zur Zahl
      if (verdeckt) struktur *= 0.5;                            // Teiler kann verdeckt sein

      const fund = {
        richtung: richtung, zeile: zy, pixel: pixel, begrenzt: begrenzt, art: art,
        von: von, bis: bis, mittig: mittig, verdeckt: verdeckt,
        teiler: teiler.length, dicke: dickeLinie,
        struktur: struktur, guete: struktur * naehe,
        lauf: lauf.laenge, abstand: abstand,
      };
      if (!bester || fund.guete > bester.guete) bester = fund;
    }
    return bester;
  }

  /** Bestimmt zu einer Maßzahl die Pixellänge ihrer Maßlinie.
   *  Probiert beide Richtungen und nimmt die eindeutigere. */
  function messeMasszahl(bilddaten, mz, alle) {
    const w = bilddaten.width, h = bilddaten.height;
    const kasten = kastenNormieren(mz, w, h);
    if (!kasten) return null;

    /* Alle Beschriftungskästen, jeweils längs der gesuchten Maßlinie (von/bis)
     * und quer dazu (quer0/quer1). Ohne die Querlage würde eine Maßzahl am
     * anderen Ende des Blatts eine Maßhilfslinie sperren. */
    const kaestenW = [], kaestenS = [];
    for (let i = 0; i < alle.length; i++) {
      const k = kastenNormieren(alle[i], w, h);
      if (!k) continue;
      const eigen = (k.x === kasten.x && k.y === kasten.y
                     && k.breite === kasten.breite && k.hoehe === kasten.hoehe);
      kaestenW.push({ von: k.x, bis: k.x + k.breite,             // waagerecht: x-Bereich
                      quer0: k.y, quer1: k.y + k.hoehe, eigen: eigen });
      kaestenS.push({ von: k.y, bis: k.y + k.hoehe,              // senkrecht: y-Bereich
                      quer0: k.x, quer1: k.x + k.breite, eigen: eigen });
    }

    const a = messeInRichtung(bilddaten.maske, w, h, kasten, kaestenW, "waagerecht");
    const kastenT = { x: kasten.y, y: kasten.x, breite: kasten.hoehe, hoehe: kasten.breite };
    const b = messeInRichtung(bilddaten.maskeT, h, w, kastenT, kaestenS, "senkrecht");

    if (a && b) return a.guete >= b.guete ? a : b;
    return a || b;
  }

  /** Bringt die Lageangabe einer Maßzahl auf Bildpunkte.
   *  Erlaubt sind Pixel oder Anteile der Bildkante (0 bis 1). */
  function kastenNormieren(mz, w, h) {
    if (!mz) return null;
    let x = mz.x, y = mz.y, br = mz.breite, ho = mz.hoehe;
    if (x === undefined || y === undefined || x === null || y === null) return null;
    const relativ = mz.koordinaten === "relativ"
      || (mz.koordinaten !== "pixel" && x <= 1 && y <= 1
          && (br === undefined || br <= 1) && (ho === undefined || ho <= 1));
    if (relativ) {
      x *= w; y *= h;
      br = (br === undefined || br === null) ? 0 : br * w;
      ho = (ho === undefined || ho === null) ? 0 : ho * h;
    }
    if (!br || br <= 0) br = Math.max(12, Math.round(Math.min(w, h) * 0.02));
    if (!ho || ho <= 0) ho = Math.max(8, Math.round(Math.min(w, h) * 0.012));
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    return { x: x, y: y, breite: Math.round(br), hoehe: Math.round(ho) };
  }

  /** Sucht in den bisherigen Funden eine Messung an derselben Stelle.
   *  Gleiche Richtung, gleiche Zeile, gleiche Spanne heißt: dieselbe
   *  Messung, unabhängig davon, welcher Text daneben stand. */
  function findeDublette(liste, k) {
    const g = S.DUBLETTE_PX;
    for (let i = 0; i < liste.length; i++) {
      const a = liste[i];
      if (a.richtung !== k.richtung) continue;
      if (Math.abs(a.zeile - k.zeile) > g) continue;
      if (Math.abs(a.von - k.von) > g) continue;
      if (Math.abs(a.bis - k.bis) > g) continue;
      return a;
    }
    return null;
  }

  /** Summenprobe. Trägt eine Zeichnung ein Gesamtmaß über mehreren
   *  Teilmaßen — der Regelfall bei zwei übereinanderliegenden Maßketten —,
   *  dann muss die Summe der Teilmaße das Gesamtmaß ergeben. Diese Probe
   *  greift genau dort, wo der Abgleich der Pixelwerte blind ist: wird eine
   *  Maßzahl dem falschen Abschnitt zugeordnet, sind die einzelnen Werte in
   *  sich stimmig, die Summe stimmt aber nicht mehr.
   *  Sie läuft nur, wenn die Teilmaße das Gesamtmaß lückenlos abdecken;
   *  eine unvollständig beschriftete Kette wird nicht bewertet. */
  function summenprobe(kandidaten, befunde) {
    for (let i = 0; i < kandidaten.length; i++) {
      const g = kandidaten[i];
      if (!g.begrenzt) continue;
      const laenge = g.bis - g.von;
      const tol = Math.max(S.DUBLETTE_PX, laenge * S.ABWEICHUNG_MAX);
      const teile = [];
      for (let j = 0; j < kandidaten.length; j++) {
        if (j === i) continue;
        const t = kandidaten[j];
        if (!t.begrenzt || t.richtung !== g.richtung) continue;
        if (t.von < g.von - tol || t.bis > g.bis + tol) continue;
        if (laenge - (t.bis - t.von) <= tol) continue;      // gleich lang: kein Teilmaß
        teile.push(t);
      }
      if (teile.length < 2) continue;
      teile.sort(function (a, b) { return a.von - b.von; });
      let lueckenlos = Math.abs(teile[0].von - g.von) <= tol
        && Math.abs(teile[teile.length - 1].bis - g.bis) <= tol;
      for (let k = 1; k < teile.length && lueckenlos; k++) {
        if (Math.abs(teile[k].von - teile[k - 1].bis) > tol) lueckenlos = false;
      }
      if (!lueckenlos) continue;

      let summe = 0;
      for (let k = 0; k < teile.length; k++) summe += teile[k].meter;
      const abw = Math.abs(summe - g.meter) / g.meter;
      const beteiligt = teile.concat([g]);
      if (abw > S.ABWEICHUNG_MAX) {
        beteiligt.forEach(function (k) {
          k.widerspruch = true; k.sauber = false; k.summenprobe = "gescheitert";
        });
        befunde.push(bef("massstab_summe", "Maßketten", "sperre",
          "Die Teilmaße dieser Maßkette ergeben zusammen " + de(summe, 2)
          + " m, das zugehörige Gesamtmaß nennt aber " + de(g.meter, 2) + " m ("
          + de((abw * 100), 1) + " Prozent Unterschied). Mindestens eine Maßzahl "
          + "ist dem falschen Abschnitt zugeordnet. Die Kette wird nicht verwendet.",
          abw));
      } else {
        beteiligt.forEach(function (k) {
          if (k.summenprobe !== "gescheitert") k.summenprobe = "bestanden";
        });
        befunde.push(bef("massstab_summe", "Maßketten", "gut",
          "Summenprobe bestanden: die Teilmaße ergeben " + de(summe, 2)
          + " m, das Gesamtmaß nennt " + de(g.meter, 2) + " m.", abw));
      }
    }
  }

  /** Zuordnungsprobe. Eine Maßkette mit mehr Abschnitten als zugeordneten
   *  Maßzahlen lässt eine Lücke, die sich mit dem Bild allein nicht schließen
   *  lässt: sitzt eine Zahl mittig über einem Abschnitt, ist sie geometrisch
   *  von einer Zahl nicht zu unterscheiden, die das Modell versehentlich dem
   *  Nachbarabschnitt zugeordnet hat. Auffangen lässt sich das nur durch eine
   *  zweite Zahl auf derselben Kette oder durch das Gesamtmaß. Fehlt beides,
   *  wird die Lücke wenigstens ausgewiesen, damit der Bearbeiter am Plan
   *  hinsieht, statt einen Vorschlag zu bestätigen.
   *
   *  Bewusst nur ein Hinweis und keine Sperre: unbeschriftete Abschnitte
   *  (Wanddicken, Anschlagmaße) sind in Bauzeichnungen der Regelfall. */
  function zuordnungsprobe(kandidaten, befunde) {
    const ketten = [];
    for (let i = 0; i < kandidaten.length; i++) {
      const k = kandidaten[i];
      if (!k.begrenzt || k.teiler < 2 || k.teiler > 20) continue;
      let kette = null;
      for (let j = 0; j < ketten.length; j++) {
        if (ketten[j].richtung === k.richtung
            && Math.abs(ketten[j].zeile - k.zeile) <= S.DUBLETTE_PX) { kette = ketten[j]; break; }
      }
      if (!kette) {
        kette = { richtung: k.richtung, zeile: k.zeile, abschnitte: k.teiler - 1, zahlen: 0 };
        ketten.push(kette);
      }
      kette.abschnitte = Math.max(kette.abschnitte, k.teiler - 1);
      kette.zahlen++;
    }
    for (let i = 0; i < ketten.length; i++) {
      const kt = ketten[i];
      if (kt.abschnitte <= kt.zahlen) continue;
      befunde.push(bef("massstab_zuordnung", "Maßketten", "einschraenkung",
        "Die " + kt.richtung + "e Maßkette hat " + kt.abschnitte + " Abschnitte, "
        + "zugeordnet ist " + (kt.zahlen === 1 ? "nur eine Maßzahl" : kt.zahlen + " Maßzahlen")
        + ". Welche Zahl zu welchem Abschnitt gehört, lässt sich am Bild nicht "
        + "gegenprüfen; eine dem falschen Abschnitt zugeordnete Zahl misst dann eine "
        + "stimmig aussehende, aber falsche Länge. Vor dem Übernehmen am Plan prüfen.",
        kt.abschnitte));
    }
  }

  /* ==================================================================
   * 3  Hauptfunktion
   * ================================================================== */

  /**
   * eingabe = {
   *   bild:        { data, width, height }        für Weg A und C
   *   masszahlen:  [{ text, einheit, x, y, breite, hoehe, bedeutung }]
   *   plankopf:    "M 1:100"  oder { text, nenner }
   *   aufloesung:  { dpi, herkunft, nachtraeglich_skaliert }
   *                herkunft: "pdf-render" | "scan-metadaten"
   *                        | "bildschirmfoto" | "foto" | "unbekannt"
   *   raumflaechen_px2: [ ... ]                   optional, für Weg C
   * }
   */
  function bestimmeMassstab(eingabe) {
    const e = eingabe || {};
    const befunde = [];
    const kandidaten = [];      // alles, was einen Zahlenwert liefert
    const verworfen = [];
    /* Die Binärmaske des Bildes wird nur einmal gerechnet und von Weg A und
     * Weg C gemeinsam benutzt; bei einem gescannten A3-Blatt sind das rund
     * vier Millionen Bildpunkte. */
    let gemeinsameMaske = null;

    /* ---------- Weg A: Maßketten im Bild ---------- */
    const wegA = { moeglich: false, kandidaten: [], hinweis: "" };
    const mzListe = Array.isArray(e.masszahlen) ? e.masszahlen : [];
    const mitLage = mzListe.filter(function (m) {
      return m && m.x !== undefined && m.x !== null && m.y !== undefined && m.y !== null;
    });

    if (!e.bild) {
      wegA.hinweis = "Kein Bild übergeben, Maßketten können nicht gesucht werden.";
    } else if (!mitLage.length) {
      wegA.hinweis = mzListe.length
        ? "Zu den " + mzListe.length + " abgelesenen Maßzahlen fehlt die Lage im Bild."
        : "Es wurden keine Maßzahlen übergeben.";
    } else {
      wegA.moeglich = true;
      gemeinsameMaske = maskeAusBild(e.bild);
      const bd = {
        width: e.bild.width, height: e.bild.height,
        maske: gemeinsameMaske,
      };
      bd.maskeT = transponiere(bd.maske, bd.width, bd.height);

      for (let i = 0; i < mitLage.length; i++) {
        const mz = mitLage[i];
        const um = textZuMeter(mz.text, mz.einheit, mz.bedeutung);
        if (!um.meter) {
          verworfen.push({ weg: "A", text: String(mz.text), grund: um.grund });
          continue;
        }
        const fund = messeMasszahl(bd, mz, mitLage);
        if (!fund) {
          verworfen.push({ weg: "A", text: String(mz.text),
            grund: "keine Maßlinie in der Nähe der Maßzahl gefunden" });
          continue;
        }
        const pxm = fund.pixel / um.meter;
        if (!(pxm >= S.PXM_MIN && pxm <= S.PXM_MAX)) {
          verworfen.push({ weg: "A", text: String(mz.text),
            grund: "ergibt " + de(pxm, 1) + " Pixel je Meter, das ist außerhalb des "
              + "brauchbaren Bereichs von " + S.PXM_MIN + " bis " + S.PXM_MAX });
          continue;
        }
        const k = {
          weg: "A", text: String(mz.text), bedeutung: mz.bedeutung || "",
          meter: um.meter, einheit: um.einheit, pixel: fund.pixel,
          px_je_meter: pxm, richtung: fund.richtung, begrenzt: fund.begrenzt,
          zeile: fund.zeile, von: fund.von, bis: fund.bis,
          mittig: fund.mittig, verdeckt: fund.verdeckt,
          teiler: fund.teiler, guete: fund.guete, struktur: fund.struktur, art: fund.art,
          sauber: fund.struktur >= S.GUETE_SAUBER,
          herleitung: de(um.meter, 2) + " m auf " + de(fund.pixel, 0) + " Pixel ("
            + (fund.art === "kreuzend"
                ? "Maßlinie beidseitig durch kreuzende Maßhilfslinien begrenzt"
                : fund.art === "einseitig"
                  ? "Maßlinie durch einseitige Begrenzungen abgeteilt, weniger belastbar"
                  : "Maßlinie nur über ihre Enden abgegrenzt") + ", "
            + fund.richtung
            + (fund.mittig === false ? ", Maßzahl sitzt außermittig über der Spanne" : "")
            + (fund.verdeckt ? ", eine Beschriftung verdeckt einen Teil der Spanne" : "")
            + ")",
        };

        /* Entdoppeln. Zwei Belege sind erst dann zwei Belege, wenn sie zwei
         * MESSUNGEN sind. Liefert das Modell dieselbe Maßzahl zweimal, oder
         * fallen zwei Zahlen auf dieselbe Spanne derselben Maßlinie, ist das
         * eine einzige Messung. Ohne diese Probe genügte ein doppelt
         * geliefertes Feld, um den Maßstab selbsttätig setzen zu lassen. */
        const dub = findeDublette(wegA.kandidaten, k);
        if (dub) {
          verworfen.push({ weg: "A", text: String(mz.text),
            grund: "misst dieselbe Stelle wie \"" + dub.text + "\" (" + k.richtung
              + ", Zeile " + k.zeile + ", Spanne " + Math.round(k.von) + " bis "
              + Math.round(k.bis) + "). Zwei Angaben zu einer Messung sind ein Beleg, "
              + "nicht zwei." });
          if (Math.abs(dub.px_je_meter - k.px_je_meter) / dub.px_je_meter > S.ABWEICHUNG_MAX) {
            dub.widerspruch = true;
            befunde.push(bef("massstab_dublette", "Maßketten", "sperre",
              "Zwei verschiedene Maßzahlen (\"" + dub.text + "\" und \"" + k.text
              + "\") beziehen sich auf dieselbe Spanne und schließen einander aus.",
              null));
          }
          continue;
        }

        wegA.kandidaten.push(k);
        kandidaten.push(k);
      }

      /* Summenprobe: Teilmaße gegen das Gesamtmaß derselben Kette. */
      summenprobe(wegA.kandidaten, befunde);
      zuordnungsprobe(wegA.kandidaten, befunde);
    }

    /* ---------- Weg B: Plankopf und Auflösung ---------- */
    const wegB = { moeglich: false, nenner: null, dpi: null, hinweis: "",
                   gueltigkeit: GUELTIGKEIT_B };
    const kopfText = typeof e.plankopf === "string" ? e.plankopf
      : (e.plankopf && e.plankopf.text) || "";
    /* Der Nenner kann aus dem Text gelesen oder vom Modell als Zahl geliefert
     * werden. Beide Wege laufen durch DIESELBE Prüfung. Früher lief die vom
     * Modell gelieferte Zahl daran vorbei, sodass ein unüblicher Nenner wie
     * 1:37 ohne jeden Hinweis durchging. */
    const kopfAusText = nennerAusText(kopfText);
    const kopfDirekt = (e.plankopf && e.plankopf.nenner) ? Number(e.plankopf.nenner) : null;
    let kopfNenner = null, kopfQuelle = "";
    if (kopfDirekt !== null && isFinite(kopfDirekt)
        && kopfDirekt > 0 && kopfDirekt <= 5000 && kopfDirekt === Math.round(kopfDirekt)) {
      kopfNenner = kopfDirekt; kopfQuelle = "als Zahl übergeben";
    } else if (kopfAusText.nenner) {
      kopfNenner = kopfAusText.nenner; kopfQuelle = "aus dem Text \"" + kopfAusText.fundstelle + "\"";
    }
    const kopfUeblich = kopfNenner !== null && NENNER_UEBLICH.indexOf(kopfNenner) >= 0;
    if (kopfNenner !== null && !kopfUeblich) {
      befunde.push(bef("massstab_kopf", "Maßstabsangabe", "einschraenkung",
        "Der Plankopf nennt 1:" + kopfNenner + " (" + kopfQuelle + "). Das ist kein "
        + "üblicher Zeichnungsmaßstab; die Angabe kann falsch gelesen sein und zählt "
        + "deshalb nicht als eindeutiger Beleg.", kopfNenner));
    }

    const aufl = e.aufloesung || {};
    const dpi = Number(aufl.dpi || aufl.punkte_je_zoll || 0);
    const herkunft = String(aufl.herkunft || "unbekannt");
    /* "nicht bekannt" ist nicht dasselbe wie "nicht skaliert". Fehlt die
     * Angabe, ob das Bild nachträglich skaliert wurde, ist Weg B ungültig:
     * ein verkleinertes und wieder hochgerechnetes Bild sieht genauso aus
     * wie ein unverändertes, macht die Punkte je Zoll aber wertlos. Wer den
     * Weg nutzen will, muss ausdrücklich nachtraeglich_skaliert: false
     * mitgeben. */
    const skaliertGeklaert = aufl.nachtraeglich_skaliert === false;
    const dpiTauglich = (herkunft === "pdf-render" || herkunft === "scan-metadaten")
      && dpi > 0 && skaliertGeklaert;

    if (!kopfNenner) {
      wegB.hinweis = "Im Plankopf steht keine auswertbare Maßstabsangabe.";
    } else if (!dpiTauglich) {
      wegB.nenner = kopfNenner;
      wegB.hinweis = "Der Plankopf nennt 1:" + kopfNenner + ", aber "
        + (dpi <= 0 ? "die Bildauflösung ist unbekannt"
           : (herkunft !== "pdf-render" && herkunft !== "scan-metadaten")
             ? "die Bildauflösung stammt aus einer Quelle, der nicht zu trauen ist ("
               + herkunft + ")"
           : aufl.nachtraeglich_skaliert === true
             ? "das Bild wurde nachträglich skaliert"
             : "es ist nicht angegeben, ob das Bild nachträglich skaliert wurde")
        + ". Ohne belastbare Punkte je Zoll lässt sich daraus kein Maßstab rechnen.";
    } else {
      const pxm = pxJeMeterAusNenner(kopfNenner, dpi);
      const abd = Math.max(e.bild ? e.bild.width : 0, e.bild ? e.bild.height : 0) / pxm;
      if (!(pxm >= S.PXM_MIN && pxm <= S.PXM_MAX)) {
        wegB.hinweis = "1:" + kopfNenner + " bei " + dpi + " dpi ergibt " + de(pxm, 1)
          + " Pixel je Meter und ist damit unbrauchbar.";
      } else if (e.bild && (abd < S.ABDECKUNG_MIN_M || abd > S.ABDECKUNG_MAX_M)) {
        wegB.hinweis = "1:" + kopfNenner + " bei " + dpi + " dpi würde bedeuten, dass das Blatt "
          + de(abd, 1) + " m abdeckt. Das passt nicht zu einem Grundriss.";
      } else {
        wegB.moeglich = true;
        wegB.nenner = kopfNenner;
        wegB.dpi = dpi;
        const k = {
          weg: "B", text: "1:" + kopfNenner, meter: null, pixel: null,
          px_je_meter: pxm, guete: herkunft === "pdf-render" ? 0.9 : 0.7,
          /* Ein Plankopfwert gilt nur dann als eindeutiger Beleg, wenn die
           * Auflösung aus dem eigenen Rendern stammt UND der Nenner ein
           * üblicher Zeichnungsmaßstab ist. */
          sauber: herkunft === "pdf-render" && kopfUeblich,
          ueblich: kopfUeblich, quelle: kopfQuelle,
          herleitung: "Plankopf 1:" + kopfNenner + " bei " + dpi + " Punkten je Zoll ("
            + herkunft + "): 1 m entspricht " + de((1000 / kopfNenner), 1)
            + " mm auf dem Blatt, das sind " + de(pxm, 1) + " Pixel.",
        };
        wegB.kandidat = k;
        kandidaten.push(k);
      }
    }

    /* ---------- Abgleich der Belege ---------- */
    const werte = kandidaten.map(function (k) { return k.px_je_meter; });
    let wert = null, streuung = null, konflikte = [], anhalt = null;
    let spanne = null, spanneOk = true;
    let stufe = "unbestimmt", handlung = "von_hand", konfidenz = 0, bestimmt = false;

    if (werte.length) {
      const mid = median(werte);
      const drin = [], drauss = [];
      for (let i = 0; i < kandidaten.length; i++) {
        const abw = Math.abs(kandidaten[i].px_je_meter - mid) / mid;
        kandidaten[i].abweichung = abw;
        /* Der Plankopf (Weg B) ist keine Messung derselben Art, sondern der
         * NENNWERT. Sein Abstand zu den Messungen sagt nicht "eine Messung
         * ist falsch", sondern "das Blatt liegt vielleicht verkleinert vor",
         * und genau diese Frage beantwortet weiter unten die Probe
         * Schriftfeld gegen Masskette mit ihrer eigenen, groeberen Grenze.
         * Mit der engen Grenze wurde derselbe Unterschied zweimal bestraft:
         * an schnitt_bb.pdf sperrten 2,4 Prozent zwischen 1:50 und den
         * gemessenen 1:48,8 den Massstab, obwohl 2,4 Prozent keinem
         * Verkleinerungsschritt entsprechen. */
        const grenze = kandidaten[i].weg === "B"
          ? Math.max(S.ABWEICHUNG_MAX, S.ABWEICHUNG_KOPF) : S.ABWEICHUNG_MAX;
        if (abw <= grenze) drin.push(kandidaten[i]); else drauss.push(kandidaten[i]);
      }
      konflikte = drauss;
      let summe = 0, gew = 0;
      for (let i = 0; i < drin.length; i++) {
        const g = Math.max(0.1, drin[i].guete);
        summe += drin[i].px_je_meter * g; gew += g;
      }
      wert = gew ? summe / gew : mid;

      /* SPANNWEITE, nicht Abstand zum Median. Der Median liegt zwischen den
       * Kandidaten; misst man nur gegen ihn, ist faktisch die doppelte
       * Grenze zugelassen. Zwei Ketten mit 3,9 Prozent Unterschied lagen so
       * je 1,9 Prozent vom Median entfernt und wurden als "stimmen auf 1,9
       * Prozent überein" durchgewinkt — bei vier Prozent Längenfehler sind
       * das acht Prozent Fläche und Transmissionsheizlast. Maßgeblich ist
       * deshalb (groesster / kleinster − 1) über alle behaltenen Werte. */
      /* Aus demselben Grund zaehlt der Plankopf hier nicht mit, solange es
         ueberhaupt Messungen gibt: die Spannweite soll sagen, wie einig sich
         die MESSUNGEN sind. Gibt es keine, steht der Plankopf allein und
         seine Spannweite ist null. */
      const fuerSpanne = drin.filter(function (k) { return k.weg !== "B"; });
      const spannliste = fuerSpanne.length ? fuerSpanne : drin;
      let kleinster = Infinity, groesster = 0;
      for (let i = 0; i < spannliste.length; i++) {
        if (spannliste[i].px_je_meter < kleinster) kleinster = spannliste[i].px_je_meter;
        if (spannliste[i].px_je_meter > groesster) groesster = spannliste[i].px_je_meter;
      }
      spanne = spannliste.length ? (groesster / kleinster - 1) : 0;
      spanneOk = spanne <= S.ABWEICHUNG_MAX;
      streuung = spanne;
      if (!spanneOk) {
        befunde.push(bef("massstab_spanne", "Maßketten", "sperre",
          "Die verwertbaren Angaben liegen " + de((spanne * 100), 1)
          + " Prozent auseinander (" + de(kleinster, 1) + " bis "
          + de(groesster, 1) + " Pixel je Meter). Zugelassen sind "
          + de((S.ABWEICHUNG_MAX * 100), 0) + " Prozent, weil sich der Längenfehler "
          + "in der Fläche verdoppelt. Der Maßstab wird nicht selbsttätig gesetzt.",
          spanne));
      }

      /* Belege zählen heißt MESSUNGEN zählen: nur eindeutig begrenzte Funde,
       * und die Dubletten sind vorher aussortiert worden. */
      const saubere = drin.filter(function (k) { return k.sauber && !k.widerspruch; });
      const sauber = saubere.length;
      const wegeDrin = {};
      saubere.forEach(function (k) { wegeDrin[k.weg] = true; });

      if (sauber === 0) {
        /* Kein einziger Fund ist in sich eindeutig. Übrig bleiben Werte, die
         * nur aus den Enden einer Linie geschätzt sind oder aus einer
         * Maßstabsangabe stammen, der nicht zu trauen ist.
         *
         * Solche Werte werden NICHT als Vorschlag angeboten. Zwei aus
         * Linienenden geschätzte Längen können sich gegenseitig bestätigen
         * und trotzdem beide falsch sein — an einer handgezeichneten
         * Bauzeichnung ist das der Regelfall, weil die Maßlinie
         * unterbrochen ist und der Lauf zu kurz gerät. Ein Vorschlag, der
         * plausibel aussieht, würde bestätigt statt geprüft. Der gemessene
         * Wert wird deshalb nur als Anhalt ausgewiesen. */
        bestimmt = false; stufe = "unbestimmt"; handlung = "von_hand"; konfidenz = 0.15;
        anhalt = wert; wert = null;
      } else if (sauber >= S.BELEGE_MIN && !konflikte.length && spanneOk) {
        /* Erst hier darf selbsttätig gesetzt werden: mindestens zwei
         * eindeutig begrenzte Messungen an verschiedenen Stellen, keine
         * widersprechende Angabe, und die Werte liegen untereinander
         * innerhalb der zugelassenen Spanne. */
        bestimmt = true; stufe = "sicher"; handlung = "uebernehmen";
        konfidenz = Math.min(0.97, 0.80 + 0.05 * Math.min(3, sauber - 1)
          + (wegeDrin.A && wegeDrin.B ? 0.05 : 0));
      } else if (konflikte.length || !spanneOk) {
        bestimmt = false; stufe = "unsicher"; handlung = "bestaetigen";
        konfidenz = spanneOk ? 0.55 : 0.4;
      } else {
        bestimmt = false; stufe = "wahrscheinlich"; handlung = "bestaetigen";
        konfidenz = 0.6;
      }
      // Der Wert muss auch für sich stehen können.
      if (wert !== null && e.bild) {
        const abd = Math.max(e.bild.width, e.bild.height) / wert;
        if (abd < S.ABDECKUNG_MIN_M || abd > S.ABDECKUNG_MAX_M) {
          bestimmt = false; stufe = "unbestimmt"; handlung = "von_hand"; konfidenz = 0.1;
          anhalt = wert; wert = null;
          befunde.push(bef("massstab_abdeckung", "Plausibilität", "sperre",
            "Mit dem gefundenen Maßstab würde das Bild " + de(abd, 1)
            + " m abdecken. Das ist kein Grundriss. Der Maßstab wird nicht übernommen.", abd));
        }
      }
    }

    /* ---------- Weg C: eingrenzen und IMMER gegenhalten ----------
     * Weg C bestimmt nichts. Er läuft aber immer, auch wenn A oder B einen
     * Wert geliefert haben, denn er ist die einzige Probe, die von den
     * abgelesenen Zahlen unabhängig ist.
     *
     * Der Grund: die Einheit kommt vom Modell und ist ein GEMEINSAMER
     * Fehler aller Maßketten. Liest das Modell durchgehend Millimeter als
     * Zentimeter, sind alle Ketten um denselben Faktor zehn verschoben,
     * stimmen untereinander perfekt überein und bestehen jede Probe, die nur
     * die Ketten miteinander vergleicht. Lief Weg C nur bei Misserfolg, war
     * er als Gegenprobe wertlos. */
    const wegC = { moeglich: false, spanne: null, hinweis: "", gegenprobe: "nicht moeglich" };
    if (e.bild) {
      const sp = grobeEingrenzung(e.bild, e.raumflaechen_px2, gemeinsameMaske);
      if (sp) {
        wegC.moeglich = true;
        wegC.spanne = sp;
        wegC.hinweis = "Über typische Gebäude- und Raumgrößen lässt sich der Maßstab nur "
          + "eingrenzen auf " + de(sp.von, 0) + " bis " + de(sp.bis, 0)
          + " Pixel je Meter. Das ist eine Bandbreite von Faktor "
          + de((sp.bis / sp.von), 1) + " und taugt nicht zum Rechnen. "
          + "Die zugrunde liegenden Größen sind Annahmen, keine Normwerte.";
        const pruefwert = wert !== null ? wert : anhalt;
        if (pruefwert !== null) {
          const unten = sp.von / S.C_SICHERHEIT, oben = sp.bis * S.C_SICHERHEIT;
          if (pruefwert < unten || pruefwert > oben) {
            wegC.gegenprobe = "widerspruch";
            const faktor = pruefwert > oben ? pruefwert / sp.bis : sp.von / pruefwert;
            befunde.push(bef("massstab_c", "Plausibilität", "sperre",
              "Gegenprobe über typische Gebäudegrößen: der ermittelte Wert von "
              + de(pruefwert, 1) + " Pixel je Meter liegt um Faktor "
              + de(faktor, 1) + " außerhalb der Spanne " + de(sp.von, 0) + " bis "
              + de(sp.bis, 0) + ". So etwas entsteht, wenn die Einheit der Maßzahlen "
              + "falsch gelesen wurde, etwa Millimeter als Zentimeter. Der Maßstab wird "
              + "nicht übernommen.", pruefwert));
            bestimmt = false; stufe = "unbestimmt"; handlung = "von_hand";
            konfidenz = 0.1;
            if (wert !== null) { anhalt = wert; wert = null; }
          } else {
            wegC.gegenprobe = "unauffaellig";
          }
        }
      }
    }
    /* Die Einheit ist der gemeinsame Fehler aller Ketten. Stammt sie bei
     * jeder Maßzahl aus derselben Quelle, wird das ausgewiesen. */
    if (wegA.kandidaten.length && wegA.kandidaten.every(function (k) {
      return /Schreibweise/.test(String(k.einheit));
    })) {
      befunde.push(bef("massstab_einheit", "Einheit", "einschraenkung",
        "Bei allen Maßzahlen wurde die Einheit Meter aus der Schreibweise mit "
        + "Dezimaltrenner erschlossen, nicht abgelesen. Ein durchgehender Irrtum "
        + "würde alle Ketten gleichsinnig verschieben und fiele beim Abgleich "
        + "untereinander nicht auf. Gegenprobe über Weg C: " + wegC.gegenprobe + ".",
        wegA.kandidaten.length));
    }

    /* ---------- Schriftfeld gegen Maßkette ----------
     * Der eigentliche Grund, warum sich der Aufwand dieses Weges lohnt.
     *
     * Das Schriftfeld sagt, in welchem Maßstab GEZEICHNET wurde. Die
     * Maßketten sagen, in welchem Maßstab das Blatt JETZT vorliegt. Beides
     * fällt auseinander, sobald ein A1-Blatt auf A3 kopiert, ein Plan
     * beschnitten oder ein Ausschnitt weitergereicht wurde. Jede der beiden
     * Angaben sieht für sich genommen unauffällig aus; erst der Vergleich
     * zeigt den Fehler. Ein Blatt, das 1:100 behauptet und 1:141 misst, ist
     * genau der Fall, in dem eine Flächenberechnung um den Faktor zwei
     * danebenliegt, ohne dass es später noch auffällt.
     *
     * Die Probe braucht eine belastbare Auflösung, denn nur mit ihr lässt
     * sich der gemessene Wert in einen Nenner übersetzen. Es gelten dieselben
     * Bedingungen wie für Weg B (siehe GUELTIGKEIT_B); ist das Bild
     * nachträglich skaliert worden, ist der Vergleich bedeutungslos. */
    let nennerGemessen = null;
    let schriftfeldProbe = "nicht moeglich";
    const gemesseneKetten = wegA.kandidaten.filter(function (k) { return !k.widerspruch; });
    if (gemesseneKetten.length && dpiTauglich) {
      nennerGemessen = nennerAusPxJeMeter(median(gemesseneKetten.map(function (k) {
        return k.px_je_meter;
      })), dpi);
    }
    if (kopfNenner !== null && nennerGemessen !== null) {
      const abwKopf = Math.abs(nennerGemessen - kopfNenner) / kopfNenner;
      const gemessenText = "1:" + de(nennerGemessen, nennerGemessen < 100 ? 1 : 0);
      /* Siehe ABWEICHUNG_KOPF: der Vergleich sucht einen Formatsprung, nicht
         die Messgenauigkeit, und kann nie genauer sein als die Messung. */
      const kopfGrenze = Math.max(S.ABWEICHUNG_KOPF, 2 * (spanne || 0));
      if (abwKopf <= kopfGrenze) {
        schriftfeldProbe = "stimmt";
        befunde.push(bef("massstab_kopf_kette", "Abgleich", "gut",
          "Das Schriftfeld nennt 1:" + kopfNenner + ", die im Bild gemessenen Maßketten "
          + "ergeben " + gemessenText + ". Der Unterschied von "
          + de((abwKopf * 100), 1) + " Prozent liegt innerhalb der Messgenauigkeit "
          + "(zugelassen " + de((kopfGrenze * 100), 1) + " Prozent) und entspricht "
          + "keinem Verkleinerungsschritt. Das Blatt liegt damit in der Größe vor, in "
          + "der es gezeichnet wurde.", kopfNenner));
      } else {
        schriftfeldProbe = "widerspruch";
        const faktor = nennerGemessen / kopfNenner;
        befunde.push(bef("massstab_kopf_kette", "Abgleich", "sperre",
          "Das Schriftfeld nennt 1:" + kopfNenner + ", die im Bild gemessenen Maßketten "
          + "ergeben " + gemessenText + ". Das sind " + de((abwKopf * 100), 1)
          + " Prozent Unterschied, zugelassen sind " + de((kopfGrenze * 100), 1)
          + " Prozent. Das entspricht dem Faktor " + de(faktor, 2) + ", die "
          + "Zeichnung liegt also "
          + (faktor > 1 ? "verkleinert" : "vergrößert")
          + " vor — etwa weil das Blatt kopiert oder beschnitten wurde. Trifft das zu, "
          + "gilt die Angabe im Schriftfeld für diese Unterlage nicht mehr und "
          + "maßgeblich ist die Zeichnung selbst. Der Maßstab wird nicht selbsttätig "
          + "gesetzt.",
          nennerGemessen));
        if (bestimmt) {
          bestimmt = false; stufe = "unsicher"; handlung = "bestaetigen";
          konfidenz = Math.min(konfidenz, 0.5);
        }
      }
    }

    /* ---------- Befunde formulieren ---------- */
    if (wegA.kandidaten.length) {
      const liste = wegA.kandidaten.map(function (k) {
        return k.text + " → " + de(k.px_je_meter, 1);
      }).join(", ");
      if (konflikte.length) {
        befunde.push(bef("massstab_a", "Maßketten", "einschraenkung",
          wegA.kandidaten.length + " Maßketten ausgewertet (" + liste + " Pixel je Meter). "
          + konflikte.length + " davon weichen um mehr als "
          + de((S.ABWEICHUNG_MAX * 100), 0) + " Prozent ab: "
          + konflikte.map(function (k) {
              return k.text + " (" + de((k.abweichung * 100), 1) + " Prozent)";
            }).join(", ")
          + ". Solange das nicht geklärt ist, wird der Maßstab nicht selbsttätig gesetzt.",
          wegA.kandidaten.length));
      } else if (wegA.kandidaten.length >= 2) {
        befunde.push(bef("massstab_a", "Maßketten", spanneOk ? "gut" : "einschraenkung",
          wegA.kandidaten.length + " Maßketten ausgewertet (" + liste + " Pixel je Meter). "
          + "Größter Abstand der Werte untereinander: "
          + de(((spanne || 0) * 100), 1) + " Prozent.",
          wegA.kandidaten.length));
      } else {
        befunde.push(bef("massstab_a", "Maßketten", "einschraenkung",
          "Nur eine Maßkette auswertbar (" + liste + " Pixel je Meter). Eine einzelne "
          + "Maßkette kann nicht gegengeprüft werden; der Wert ist zu bestätigen.", 1));
      }
    } else if (wegA.hinweis) {
      befunde.push(bef("massstab_a", "Maßketten", "einschraenkung", wegA.hinweis, 0));
    }
    if (wegB.moeglich) {
      befunde.push(bef("massstab_b", "Plankopf", "gut", wegB.kandidat.herleitung,
        wegB.kandidat.px_je_meter));
    } else if (wegB.hinweis) {
      befunde.push(bef("massstab_b", "Plankopf", "einschraenkung", wegB.hinweis, 0));
    }
    if (verworfen.length) {
      befunde.push(bef("massstab_verworfen", "Nicht verwertbar", "einschraenkung",
        verworfen.map(function (v) { return v.text + ": " + v.grund; }).join("; "),
        verworfen.length));
    }
    if (!bestimmt) {
      befunde.push(bef("massstab", "Maßstab", "sperre",
        handlung === "bestaetigen"
          ? "Vorschlag " + de(wert, 1) + " Pixel je Meter (1 Pixel = "
            + de((100 / wert), 1) + " cm). Der Vorschlag ist nicht doppelt belegt und "
            + "muss am Plan bestätigt werden, bevor gerechnet wird."
          : "Der Maßstab lässt sich aus dieser Unterlage nicht bestimmen. "
            + "Der Bearbeiter muss ihn an einer bekannten Maßkette von Hand setzen."
            + (anhalt !== null
                ? " Gemessen wurden " + de(anhalt, 1) + " Pixel je Meter, aber keine "
                  + "einzige Maßkette war eindeutig genug begrenzt, um darauf zu bauen. "
                  + "Der Wert ist nur ein Anhalt und ausdrücklich kein Vorschlag."
                : "")
            + (wegC.hinweis ? " " + wegC.hinweis : ""),
        anhalt));
    } else {
      befunde.push(bef("massstab", "Maßstab", "gut",
        de(wert, 1) + " Pixel je Meter (1 Pixel = " + de((100 / wert), 1)
        + " cm), belegt durch " + kandidaten.length + " unabhängige Angaben.", wert));
    }

    return {
      bestimmt: bestimmt,
      px_je_meter: wert,
      meter_je_px: wert ? 1 / wert : null,
      /* Gemessen, aber nicht belastbar. Nur zur Anzeige, nie zum Vorbelegen
       * eines Eingabefelds — sonst wird er bestätigt statt geprüft. */
      anhalt_px_je_meter: anhalt,
      stufe: stufe,
      handlung: handlung,
      konfidenz: Math.round(konfidenz * 100) / 100,
      /* Spannweite der verwerteten Werte untereinander, in Prozent:
       * (groesster / kleinster − 1). Ausdrücklich NICHT der Abstand zum
       * Median, der wäre nur die Hälfte davon. */
      streuung_prozent: streuung === null ? null : Math.round(streuung * 1000) / 10,
      spanne_prozent: spanne === null ? null : Math.round(spanne * 1000) / 10,
      spanne_eingehalten: spanneOk,
      abweichung_grenze_prozent: S.ABWEICHUNG_MAX * 100,
      /* Abgleich Schriftfeld gegen Maßkette: "stimmt", "widerspruch" oder
       * "nicht moeglich". Der Nenner aus der Messung ist bewusst nicht auf
       * einen üblichen Maßstab gerundet — gerundet würde aus 1:87 wieder
       * 1:100 und der Befund verschwände. */
      schriftfeld_probe: schriftfeldProbe,
      nenner_schriftfeld: kopfNenner,
      nenner_gemessen: nennerGemessen === null
        ? null : Math.round(nennerGemessen * 10) / 10,
      kandidaten: kandidaten,
      konflikte: konflikte,
      verworfen: verworfen,
      wege: { A: wegA, B: wegB, C: wegC },
      befunde: befunde,
      text: kurzfassung(bestimmt, handlung, wert, kandidaten.length, konflikte.length),
    };
  }

  function bef(id, titel, stufe, text, wert) {
    return { id: id, titel: titel, stufe: stufe, text: text, wert: wert };
  }

  function kurzfassung(bestimmt, handlung, wert, n, k) {
    if (bestimmt) {
      return "Maßstab bestimmt: " + de(wert, 1) + " Pixel je Meter, belegt durch "
        + n + (n === 1 ? " Angabe." : " Angaben.");
    }
    if (handlung === "bestaetigen") {
      return "Maßstab nicht gesichert. Vorschlag " + de(wert, 1) + " Pixel je Meter"
        + (k ? ", " + k + " widersprechende Angabe" + (k > 1 ? "n" : "") : "")
        + ". Bitte am Plan bestätigen.";
    }
    return "Maßstab nicht bestimmbar. Bitte an einer bekannten Maßkette von Hand setzen.";
  }

  /** Weg C. Grenzt über die bezeichnete Ausdehnung der Zeichnung und, falls
   *  vorhanden, über die Größe der umfahrenen Räume ein. Liefert bewusst nur
   *  eine Spanne: eine Zeichnung ohne Maßangabe enthält die Information
   *  schlicht nicht, aus der ein Maßstab folgen könnte. */
  function grobeEingrenzung(bild, raumflaechenPx2, maskeFertig) {
    const w = bild.width, h = bild.height;
    const maske = maskeFertig || maskeAusBild(bild);
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) {
      const z = y * w;
      for (let x = 0; x < w; x++) {
        if (maske[z + x]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const kante = Math.max(x1 - x0, y1 - y0);
    if (kante < 20) return null;
    // Annahme: die gezeichnete Ausdehnung entspricht einem Gebäude zwischen
    // C_GEBAEUDE_MIN_M und C_GEBAEUDE_MAX_M Metern Kantenlänge.
    let von = kante / S.C_GEBAEUDE_MAX_M;
    let bis = kante / S.C_GEBAEUDE_MIN_M;

    if (Array.isArray(raumflaechenPx2) && raumflaechenPx2.length) {
      const mid = median(raumflaechenPx2.filter(function (a) { return a > 0; }));
      if (mid > 0) {
        // Annahme: der mittlere Raum liegt zwischen C_RAUM_MIN_M2 und
        // C_RAUM_MAX_M2 Quadratmetern. px je Meter = Wurzel(px2 / m2).
        const rv = Math.sqrt(mid / S.C_RAUM_MAX_M2);
        const rb = Math.sqrt(mid / S.C_RAUM_MIN_M2);
        von = Math.max(von, rv);
        bis = Math.min(bis, rb);
      }
    }
    von = Math.max(von, S.PXM_MIN);
    if (!(bis > von)) return null;
    return { von: von, bis: bis, grundlage: "Annahme, keine Normwerte" };
  }

  /* ==================================================================
   * 4  Selbsttest
   * ================================================================== */
  function selbsttest() {
    const f = [];
    let geprueft = 0;
    const pruefe = function (bedingung, meldung) {
      geprueft++;
      if (!bedingung) f.push(meldung);
    };

    /* ---- Testbild: künstlicher Grundriss mit bekannten 100 px je Meter ----
     * Aufbau:
     *   Gebäudeumriss                    x 150..1250, y 120..780
     *   innere Maßkette (waagerecht)     y 880, Teiler bei 150/530/950/1250
     *                                    → 3,80 m / 4,20 m / 3,00 m
     *   äußere Maßkette (Gesamtmaß)      y 930, Teiler bei 150/1250 → 11,00 m
     *   senkrechte Maßkette              x  80, Teiler bei 120/450/780
     *                                    → 3,30 m / 3,30 m
     * Die Maßzahlen werden als schmale Striche gezeichnet, so wie Ziffern
     * wirken. Damit prüft der Test zugleich, dass die Beschriftung nicht
     * als Maßhilfslinie missverstanden wird. */
    const W = 1400, H = 1000, PXM = 100;
    function neuesBild() {
      const d = new Uint8ClampedArray(W * H * 4).fill(255);
      return { data: d, width: W, height: H };
    }
    function punkt(b, x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      b.data[i] = b.data[i + 1] = b.data[i + 2] = 0;
    }
    function waagerecht(b, x0, x1, y, dick) {
      for (let x = x0; x <= x1; x++) for (let k = 0; k < dick; k++) punkt(b, x, y + k);
    }
    function senkrecht(b, x, y0, y1, dick) {
      for (let y = y0; y <= y1; y++) for (let k = 0; k < dick; k++) punkt(b, x + k, y);
    }
    /* Ziffernblock: vier schmale senkrechte Striche, wie eine Maßzahl. */
    function zahlWaagerecht(b, cx, cy, breite, hoehe) {
      const x0 = Math.round(cx - breite / 2), y0 = Math.round(cy - hoehe / 2);
      for (let s = 0; s < 4; s++) senkrecht(b, x0 + s * Math.round(breite / 4), y0, y0 + hoehe, 2);
      return { x: x0, y: y0, breite: breite, hoehe: hoehe };
    }
    function zahlSenkrecht(b, cx, cy, breite, hoehe) {
      const x0 = Math.round(cx - breite / 2), y0 = Math.round(cy - hoehe / 2);
      for (let s = 0; s < 4; s++) waagerecht(b, x0, x0 + breite, y0 + s * Math.round(hoehe / 4), 2);
      return { x: x0, y: y0, breite: breite, hoehe: hoehe };
    }

    const bild = neuesBild();
    // Gebäude
    waagerecht(bild, 150, 1250, 120, 8);
    waagerecht(bild, 150, 1250, 780, 8);
    senkrecht(bild, 150, 120, 780, 8);
    senkrecht(bild, 1250, 120, 780, 8);
    // innere Maßkette
    waagerecht(bild, 150, 1250, 880, 2);
    [150, 530, 950, 1250].forEach(function (x) { senkrecht(bild, x, 860, 900, 2); });
    const k1 = zahlWaagerecht(bild, 340, 871, 36, 14);
    const k2 = zahlWaagerecht(bild, 740, 871, 36, 14);
    const k3 = zahlWaagerecht(bild, 1100, 871, 36, 14);
    // äußere Maßkette
    waagerecht(bild, 150, 1250, 930, 2);
    [150, 1250].forEach(function (x) { senkrecht(bild, x, 910, 950, 2); });
    const k4 = zahlWaagerecht(bild, 700, 921, 48, 14);
    // senkrechte Maßkette
    senkrecht(bild, 80, 120, 780, 2);
    [120, 450, 780].forEach(function (y) { waagerecht(bild, 60, 100, y, 2); });
    const k5 = zahlSenkrecht(bild, 91, 285, 14, 36);
    const k6 = zahlSenkrecht(bild, 91, 615, 14, 36);

    const mz = function (kasten, text) {
      return { text: text, einheit: "m", x: kasten.x, y: kasten.y,
               breite: kasten.breite, hoehe: kasten.hoehe, koordinaten: "pixel" };
    };

    /* 1  Textauswertung */
    pruefe(textZuMeter("6,00", "m").meter === 6, "6,00 m wird nicht als 6 m gelesen");
    pruefe(textZuMeter("12.49", "unklar").meter === 12.49, "12.49 wird nicht als Meter gelesen");
    pruefe(Math.abs(textZuMeter(",85", "unklar").meter - 0.85) < 1e-9, ",85 wird nicht gelesen");
    pruefe(textZuMeter("620", "cm").meter === 6.2, "620 cm werden nicht zu 6,20 m");
    pruefe(textZuMeter("3750", "mm").meter === 3.75, "3750 mm werden nicht zu 3,75 m");
    pruefe(textZuMeter("620", "unklar").meter === null,
      "620 ohne Einheit muss verworfen werden statt geraten");
    pruefe(textZuMeter("6", "unklar").meter === null,
      "6 ohne Trenner und Einheit muss verworfen werden");
    pruefe(textZuMeter("900,00", "m").meter === null, "900 m sind keine plausible Maßkette");

    /* 2  Plankopf */
    pruefe(nennerAusText("M 1:100").nenner === 100, "M 1:100 wird nicht gelesen");
    pruefe(nennerAusText("Maßstab 1 : 50").nenner === 50, "1 : 50 wird nicht gelesen");
    pruefe(nennerAusText("Grundriss EG").nenner === null, "Text ohne Maßstab liefert einen Wert");
    pruefe(nennerAusText("1:37").ueblich === false, "1:37 gilt fälschlich als üblich");
    pruefe(Math.abs(pxJeMeterAusNenner(100, 300) - 118.11) < 0.01,
      "1:100 bei 300 dpi ergibt nicht 118,11 px/m");

    /* 3  Weg A, zwei Maßketten waagerecht */
    const a1 = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k1, "3,80"), mz(k2, "4,20"), mz(k3, "3,00"), mz(k4, "11,00")] });
    pruefe(a1.wege.A.kandidaten.length >= 3,
      "waagerechte Maßketten nicht gefunden, nur " + a1.wege.A.kandidaten.length);
    pruefe(a1.px_je_meter !== null && Math.abs(a1.px_je_meter - PXM) / PXM <= 0.02,
      "waagerecht: " + (a1.px_je_meter === null ? "kein Wert" : a1.px_je_meter.toFixed(2))
      + " statt " + PXM);
    pruefe(a1.bestimmt === true, "vier übereinstimmende Maßketten müssen den Maßstab bestimmen");
    pruefe(a1.handlung === "uebernehmen", "Handlung müsste uebernehmen sein, ist " + a1.handlung);

    /* 4  Weg A, senkrechte Maßkette */
    const a2 = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k5, "3,30"), mz(k6, "3,30")] });
    pruefe(a2.wege.A.kandidaten.length === 2,
      "senkrechte Maßketten nicht gefunden, nur " + a2.wege.A.kandidaten.length);
    pruefe(a2.px_je_meter !== null && Math.abs(a2.px_je_meter - PXM) / PXM <= 0.02,
      "senkrecht: " + (a2.px_je_meter === null ? "kein Wert" : a2.px_je_meter.toFixed(2))
      + " statt " + PXM);
    pruefe(a2.wege.A.kandidaten.every(function (k) { return k.richtung === "senkrecht"; }),
      "Richtung der senkrechten Maßkette falsch erkannt");

    /* 5  Eine einzelne Maßkette darf nicht durchgehen */
    const a3 = bestimmeMassstab({ bild: bild, masszahlen: [mz(k2, "4,20")] });
    pruefe(a3.bestimmt === false, "eine einzelne Maßkette darf nicht bestimmen");
    pruefe(a3.handlung === "bestaetigen", "einzelne Maßkette: Handlung " + a3.handlung);
    pruefe(a3.px_je_meter !== null && Math.abs(a3.px_je_meter - PXM) / PXM <= 0.02,
      "einzelne Maßkette liefert falschen Vorschlag");

    /* 6  Widersprüchliche Maßzahl muss auffallen */
    const a4 = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k1, "3,80"), mz(k2, "4,20"), mz(k3, "5,00")] });
    pruefe(a4.konflikte.length === 1, "der Widerspruch wird nicht gemeldet, konflikte="
      + a4.konflikte.length);
    pruefe(a4.bestimmt === false, "bei Widerspruch darf nicht bestimmt werden");
    pruefe(a4.handlung === "bestaetigen", "bei Widerspruch: Handlung " + a4.handlung);

    /* 7  Weg B allein, aus einem PDF gerendert */
    const b1 = bestimmeMassstab({ bild: bild, plankopf: "Grundriss EG   M 1:100",
      aufloesung: { dpi: 300, herkunft: "pdf-render", nachtraeglich_skaliert: false } });
    pruefe(b1.wege.B.moeglich === true, "Weg B aus PDF-Render wird nicht anerkannt");
    pruefe(b1.px_je_meter !== null && Math.abs(b1.px_je_meter - 118.11) < 0.1,
      "Weg B rechnet falsch");
    pruefe(b1.bestimmt === false,
      "Weg B allein ist nur ein Beleg und darf nicht selbsttätig gesetzt werden");

    /* 8  Weg B beim Bildschirmfoto: ungültig */
    const b2 = bestimmeMassstab({ bild: bild, plankopf: "M 1:100",
      aufloesung: { herkunft: "bildschirmfoto" } });
    pruefe(b2.wege.B.moeglich === false, "Bildschirmfoto darf Weg B nicht erlauben");
    pruefe(b2.handlung === "von_hand", "ohne gültigen Weg: Handlung " + b2.handlung);
    pruefe(/unbekannt/.test(b2.wege.B.hinweis), "Grund für den Ausschluss fehlt");

    /* 9  Nachträglich skaliertes Bild: Weg B ungültig */
    const b3 = bestimmeMassstab({ bild: bild, plankopf: "M 1:100",
      aufloesung: { dpi: 300, herkunft: "scan-metadaten", nachtraeglich_skaliert: true } });
    pruefe(b3.wege.B.moeglich === false, "skaliertes Bild darf Weg B nicht erlauben");

    /* 10  A und B zusammen, stimmig: das ist der starke Fall.
     *     Das Testbild hat 100 px/m; dazu passt 1:100 bei 254 dpi
     *     (254 * 1000 / (25,4 * 100) = 100,0). */
    const ab = bestimmeMassstab({ bild: bild, masszahlen: [mz(k2, "4,20")],
      plankopf: "M 1:100",
      aufloesung: { dpi: 254, herkunft: "pdf-render", nachtraeglich_skaliert: false } });
    pruefe(ab.bestimmt === true, "Maßkette und Plankopf zusammen müssen bestimmen");
    pruefe(ab.konfidenz >= 0.85, "Konfidenz zu niedrig: " + ab.konfidenz);

    /* 11  A und B widersprechen sich um mehr als zwei Prozent */
    const ab2 = bestimmeMassstab({ bild: bild, masszahlen: [mz(k2, "4,20")],
      plankopf: "M 1:100",
      aufloesung: { dpi: 300, herkunft: "pdf-render", nachtraeglich_skaliert: false } });
    pruefe(ab2.bestimmt === false, "widersprechende Wege dürfen nicht bestimmen");
    pruefe(ab2.konflikte.length >= 1, "Widerspruch zwischen A und B wird nicht gemeldet");

    /* 12  Weg C allein */
    const c1 = bestimmeMassstab({ bild: bild });
    pruefe(c1.bestimmt === false, "ohne Beleg darf nichts bestimmt werden");
    pruefe(c1.handlung === "von_hand", "ohne Beleg: Handlung " + c1.handlung);
    pruefe(c1.wege.C.spanne !== null, "Weg C liefert keine Eingrenzung");
    pruefe(c1.wege.C.spanne.von <= PXM && c1.wege.C.spanne.bis >= PXM,
      "die Eingrenzung schließt den wahren Maßstab aus");
    pruefe(/von Hand/.test(c1.text), "der Hinweis auf das Setzen von Hand fehlt");

    /* 13  Gar keine Eingabe */
    const leer = bestimmeMassstab({});
    pruefe(leer.bestimmt === false && leer.px_je_meter === null,
      "leere Eingabe liefert einen Wert");
    pruefe(leer.handlung === "von_hand", "leere Eingabe: Handlung " + leer.handlung);

    /* 14  Maßzahl ohne Lage ist für Weg A unbrauchbar */
    const ohneLage = bestimmeMassstab({ bild: bild,
      masszahlen: [{ text: "4,20", einheit: "m" }] });
    pruefe(ohneLage.wege.A.moeglich === false, "Maßzahl ohne Lage wird fälschlich verwendet");
    pruefe(/Lage/.test(ohneLage.wege.A.hinweis), "Grund für die fehlende Lage fehlt");

    /* 15  Unplausibler Maßstab wird abgewiesen: 4,20 m auf 420 px wären
     *     100 px/m; wird die Maßzahl als 0,42 m gelesen, kämen 1000 px/m
     *     heraus, das Blatt deckte dann 1,4 m ab. */
    const unpl = bestimmeMassstab({ bild: bild, masszahlen: [mz(k2, "0,42")] });
    pruefe(unpl.bestimmt === false, "unplausibler Maßstab wird übernommen");

    /* 16  Relative Koordinaten */
    const relativ = bestimmeMassstab({ bild: bild, masszahlen: [
      { text: "4,20", einheit: "m", x: k2.x / W, y: k2.y / H,
        breite: k2.breite / W, hoehe: k2.hoehe / H, koordinaten: "relativ" }] });
    pruefe(relativ.px_je_meter !== null
      && Math.abs(relativ.px_je_meter - PXM) / PXM <= 0.02,
      "relative Koordinaten werden nicht umgerechnet");

    /* ---- Härtefälle aus echten Zeichnungen ----------------------------
     * Diese vier Fälle haben beim Bau des Moduls je einen Fehler aufgedeckt
     * und stehen deshalb dauerhaft im Selbsttest. */

    /* 17  Begrenzung durch 45-Grad-Schrägstriche statt durch durchgezogene
     *     Maßhilfslinien. In Bauzeichnungen ist das der Regelfall. Der
     *     Schrägstrich liegt links oberhalb und rechts unterhalb der
     *     Maßlinie und ergibt zwei getrennte Spuren, die zusammengehören.
     *     Die Striche an den Kettenenden liegen zur Hälfte neben der Linie. */
    function schraegstrich(b, cx, cy, laenge) {
      for (let t = -laenge; t <= laenge; t++) { punkt(b, cx + t, cy - t); punkt(b, cx + t + 1, cy - t); }
    }
    const bS = neuesBild();
    waagerecht(bS, 150, 1250, 780, 8);
    waagerecht(bS, 150, 1250, 880, 2);
    [150, 530, 950, 1250].forEach(function (x) { schraegstrich(bS, x, 881, 7); });
    const s1 = zahlWaagerecht(bS, 340, 871, 36, 14);
    const s2 = zahlWaagerecht(bS, 740, 871, 36, 14);
    const s3 = zahlWaagerecht(bS, 1100, 871, 36, 14);
    const rS = bestimmeMassstab({ bild: bS,
      masszahlen: [mz(s1, "3,80"), mz(s2, "4,20"), mz(s3, "3,00")] });
    pruefe(rS.px_je_meter !== null && Math.abs(rS.px_je_meter - PXM) / PXM <= 0.02,
      "Schrägstriche: " + (rS.px_je_meter === null ? "kein Wert" : rS.px_je_meter.toFixed(2))
      + " statt " + PXM);
    pruefe(rS.bestimmt === true, "Schrägstriche werden nicht als Begrenzung erkannt");

    /* 18  DER GEFÄHRLICHSTE FALL. Die Lage der Maßzahl kommt vom Modell und
     *     kann um einige Pixel danebenliegen. Der Versatz trifft alle
     *     Maßzahlen eines Plans gleichermaßen. Würden die Ziffernstriche als
     *     Begrenzung gelesen, wären alle Maßketten gleichsinnig falsch — und
     *     der Abgleich untereinander würde nichts merken. Ein solcher Fehler
     *     ginge unbemerkt in die Heizlast ein. Deshalb wird hier geprüft,
     *     dass ein Versatz den Wert NICHT verfälscht. */
    [[12, 0], [-15, 8], [0, -25], [30, 20]].forEach(function (v) {
      const r = bestimmeMassstab({ bild: bild, masszahlen: [
        { text: "3,80", einheit: "m", x: k1.x + v[0], y: k1.y + v[1],
          breite: k1.breite, hoehe: k1.hoehe, koordinaten: "pixel" },
        { text: "4,20", einheit: "m", x: k2.x + v[0], y: k2.y + v[1],
          breite: k2.breite, hoehe: k2.hoehe, koordinaten: "pixel" },
        { text: "3,00", einheit: "m", x: k3.x + v[0], y: k3.y + v[1],
          breite: k3.breite, hoehe: k3.hoehe, koordinaten: "pixel" }] });
      const falsch = r.px_je_meter === null
        || Math.abs(r.px_je_meter - PXM) / PXM > 0.02;
      pruefe(!(r.bestimmt && falsch),
        "Lageversatz " + v[0] + "/" + v[1] + " führt zu einem still falschen Maßstab: "
        + (r.px_je_meter === null ? "kein Wert" : r.px_je_meter.toFixed(1)));
      pruefe(!falsch, "Lageversatz " + v[0] + "/" + v[1] + " verfälscht den Wert: "
        + (r.px_je_meter === null ? "kein Wert" : r.px_je_meter.toFixed(1)));
    });

    /* 19  Maßzahl sitzt in einer Lücke der Maßlinie, wie es viele
     *     CAD-Ausgaben zeichnen. Die Linie muss über die Lücke hinweg
     *     verfolgt werden. */
    const bL = neuesBild();
    waagerecht(bL, 150, 1250, 780, 8);
    waagerecht(bL, 150, 320, 880, 2); waagerecht(bL, 360, 720, 880, 2);
    waagerecht(bL, 760, 1080, 880, 2); waagerecht(bL, 1120, 1250, 880, 2);
    [150, 530, 950, 1250].forEach(function (x) { senkrecht(bL, x, 860, 900, 2); });
    const l1 = zahlWaagerecht(bL, 340, 880, 36, 14);
    const l2 = zahlWaagerecht(bL, 740, 880, 36, 14);
    const l3 = zahlWaagerecht(bL, 1100, 880, 36, 14);
    const rL = bestimmeMassstab({ bild: bL,
      masszahlen: [mz(l1, "3,80"), mz(l2, "4,20"), mz(l3, "3,00")] });
    pruefe(rL.px_je_meter !== null && Math.abs(rL.px_je_meter - PXM) / PXM <= 0.02,
      "unterbrochene Maßlinie: "
      + (rL.px_je_meter === null ? "kein Wert" : rL.px_je_meter.toFixed(2)));

    /* 20  Scanrauschen. Die Schwelle nach Otsu muss das wegstecken.
     *     Der Zufallszahlengeber ist fest eingestellt, damit der Test
     *     bei jedem Lauf dasselbe Bild prüft. */
    const bR = neuesBild();
    waagerecht(bR, 150, 1250, 780, 8);
    waagerecht(bR, 150, 1250, 880, 2);
    [150, 530, 950, 1250].forEach(function (x) { senkrecht(bR, x, 860, 900, 2); });
    const r1 = zahlWaagerecht(bR, 340, 871, 36, 14);
    const r2 = zahlWaagerecht(bR, 740, 871, 36, 14);
    const r3 = zahlWaagerecht(bR, 1100, 871, 36, 14);
    let saat = 12345;
    for (let i = 0; i < bR.data.length; i += 4) {
      saat = (saat * 1103515245 + 12345) & 0x7fffffff;
      const n = ((saat >> 16) % 61) - 30;
      const v = Math.max(0, Math.min(255, bR.data[i] + n));
      bR.data[i] = v; bR.data[i + 1] = v; bR.data[i + 2] = v;
    }
    const rR = bestimmeMassstab({ bild: bR,
      masszahlen: [mz(r1, "3,80"), mz(r2, "4,20"), mz(r3, "3,00")] });
    pruefe(rR.px_je_meter !== null && Math.abs(rR.px_je_meter - PXM) / PXM <= 0.02,
      "Scanrauschen: " + (rR.px_je_meter === null ? "kein Wert" : rR.px_je_meter.toFixed(2)));

    /* 21  Nachgestellt aus der echten Bauzeichnung Mälzerstraße 59 von 1936
     *     (quellen/zeichnungen-1.png, 2339x1653, 1:100 bei 200 dpi, also
     *     78,7 Pixel je Meter). Dort sind die Maßlinien von Hand gezogen,
     *     unterbrochen und ohne erkennbare Begrenzung. Beide Maßketten
     *     ließen sich nur über die Enden ihres Linienstücks schätzen und
     *     kamen dabei auf rund 60 statt 79 Pixel je Meter — zwei Werte, die
     *     sich gegenseitig auf gut ein Prozent bestätigten und trotzdem
     *     beide um ein Viertel danebenlagen.
     *
     *     Genau dagegen richtet sich diese Prüfung: stützt sich kein
     *     einziger Fund auf eine eindeutig begrenzte Maßlinie, darf gar
     *     kein Vorschlag herauskommen. Ein Vorschlag würde bestätigt statt
     *     geprüft, und der Fehler ginge in die Heizlast ein.
     *     Hier nachgestellt durch zwei Linienstücke ohne jede Begrenzung. */
    const bH = neuesBild();
    waagerecht(bH, 150, 1250, 780, 8);
    waagerecht(bH, 150, 530, 880, 2);      // Stück 1, keine Maßhilfslinien
    waagerecht(bH, 600, 1020, 880, 2);     // Stück 2, keine Maßhilfslinien
    const h1 = zahlWaagerecht(bH, 340, 862, 36, 14);
    const h2 = zahlWaagerecht(bH, 810, 862, 36, 14);
    const rH = bestimmeMassstab({ bild: bH,
      masszahlen: [mz(h1, "3,80"), mz(h2, "4,20")] });
    pruefe(rH.kandidaten.length === 2 && rH.kandidaten.every(function (k) {
      return k.art === "Linienenden";
    }), "Aufbau des Tests stimmt nicht: es müssen zwei Funde über Linienenden sein");
    pruefe(rH.kandidaten.every(function (k) { return !k.sauber; }),
      "ein Fund über bloße Linienenden darf nicht als sauber gelten");
    pruefe(rH.bestimmt === false,
      "zwei übereinstimmende, aber unbegrenzte Funde dürfen nicht bestimmen");
    pruefe(rH.handlung === "von_hand",
      "ohne einen einzigen eindeutigen Fund: Handlung " + rH.handlung);
    pruefe(rH.px_je_meter === null,
      "ohne eindeutigen Fund darf kein Vorschlag angeboten werden, angeboten wurde "
      + rH.px_je_meter);
    pruefe(rH.anhalt_px_je_meter !== null,
      "der gemessene Anhalt muss zur Nachvollziehbarkeit trotzdem ausgewiesen werden");


    /* ==================================================================
     * Prüfungen aus der adversarischen Durchsicht (sechs Befunde).
     * Jeder Fall hat vor der Reparatur einen still falschen Maßstab
     * durchgelassen und steht deshalb dauerhaft hier.
     * ================================================================== */

    /* 22  BEFUND 1: Die Zwei-Prozent-Regel muss den Abstand der Kandidaten
     *     UNTEREINANDER prüfen. Zwei Ketten mit 3,8 Prozent Unterschied
     *     liegen je 1,9 Prozent vom Median entfernt; wird nur gegen den
     *     Median gemessen, gilt das als Übereinstimmung auf 1,9 Prozent und
     *     der Maßstab wird selbsttätig gesetzt. Vier Prozent Länge sind acht
     *     Prozent Fläche und Transmissionsheizlast. */
    const sp1 = bestimmeMassstab({ bild: bild, masszahlen: [
      mz(k1, "3,80"),                                   // 380 px → 100,0 px/m
      { text: "3,115", einheit: "m", x: k3.x, y: k3.y,  // 300 px →  96,3 px/m
        breite: k3.breite, hoehe: k3.hoehe, koordinaten: "pixel" }] });
    pruefe(sp1.kandidaten.length === 2, "Aufbau: es müssen zwei Kandidaten entstehen");
    pruefe(sp1.spanne_prozent !== null && sp1.spanne_prozent > 3.5,
      "die Spannweite wird zu klein ausgewiesen: " + sp1.spanne_prozent + " Prozent");
    pruefe(sp1.spanne_eingehalten === false, "3,8 Prozent Spannweite gelten als eingehalten");
    pruefe(sp1.bestimmt === false,
      "zwei um 3,8 Prozent auseinanderliegende Ketten dürfen nicht bestimmen");
    pruefe(sp1.handlung === "bestaetigen", "Spannweitenverstoß: Handlung " + sp1.handlung);
    pruefe(sp1.befunde.some(function (b) { return b.id === "massstab_spanne"; }),
      "der Spannweitenverstoß wird nicht als Befund gemeldet");

    /* 22b  Drei Ketten mit 98 / 100 / 102 Pixel je Meter: jede liegt zwei
     *      Prozent vom Median entfernt, die Spanne ist aber vier Prozent. */
    const sp2 = bestimmeMassstab({ bild: bild, masszahlen: [
      { text: "3,7255", einheit: "m", x: k1.x, y: k1.y, breite: 36, hoehe: 14,
        koordinaten: "pixel" },
      mz(k2, "4,20"),
      { text: "3,0612", einheit: "m", x: k3.x, y: k3.y, breite: 36, hoehe: 14,
        koordinaten: "pixel" }] });
    pruefe(sp2.kandidaten.length === 3, "Aufbau: drei Kandidaten erwartet");
    pruefe(sp2.bestimmt === false, "98/100/102 px/m dürfen nicht selbsttätig gesetzt werden");

    /* 23  BEFUND 2a: Mittigkeit. Wird eine Maßhilfslinie nicht gefunden,
     *     greift der nächste Teiler dahinter und der Abschnitt wird zu lang.
     *     Die Maßzahl sitzt dann nicht mehr über der Mitte der Spanne.
     *     Hier fehlen die inneren Teiler ganz: beide Zahlen messen die volle
     *     Kette und sitzen weit außermittig. */
    const bM = neuesBild();
    waagerecht(bM, 150, 1250, 780, 8);
    waagerecht(bM, 150, 1250, 880, 2);
    [150, 1250].forEach(function (x) { senkrecht(bM, x, 860, 900, 2); });
    const m1 = zahlWaagerecht(bM, 340, 871, 36, 14);
    const rM = bestimmeMassstab({ bild: bM, masszahlen: [mz(m1, "3,80")] });
    pruefe(rM.kandidaten.length === 1, "Aufbau: ein Kandidat erwartet");
    pruefe(rM.kandidaten[0].mittig === false,
      "eine Maßzahl bei 340 über der Spanne 150 bis 1250 gilt als mittig");
    pruefe(rM.kandidaten[0].sauber === false,
      "ein außermittig sitzender Fund darf nicht als sauber gelten");
    pruefe(rM.px_je_meter === null,
      "aus einem außermittigen Fund darf kein Vorschlag werden, angeboten wurde "
      + rM.px_je_meter);

    /* 24  BEFUND 2b: verdeckte Teiler. Eine Beschriftung auf der Maßlinie
     *     kann eine Maßhilfslinie überdecken. Dann werden zwei Abschnitte
     *     als einer gemessen — und weil das an mehreren Stellen gleich
     *     passiert, stimmen die falschen Werte untereinander überein.
     *     Kette: Teiler 150/430/710/990/1270, vier Abschnitte zu 280 px. */
    function ketteMitVier() {
      const b = neuesBild();
      waagerecht(b, 150, 1270, 780, 8);
      waagerecht(b, 150, 1270, 880, 2);
      [150, 430, 710, 990, 1270].forEach(function (x) { senkrecht(b, x, 860, 900, 2); });
      return b;
    }
    const bV = ketteMitVier();
    const v1 = zahlWaagerecht(bV, 290, 871, 32, 14);   // Abschnitt 150..430
    const v2 = zahlWaagerecht(bV, 850, 871, 32, 14);   // Abschnitt 710..990
    // Kontrolle: ohne störende Beschriftung wird richtig gemessen
    const rVok = bestimmeMassstab({ bild: bV,
      masszahlen: [mz(v1, "2,80"), mz(v2, "2,80")] });
    pruefe(rVok.px_je_meter !== null && Math.abs(rVok.px_je_meter - PXM) / PXM <= 0.02,
      "Kontrolle: die ungestörte Kette müsste " + PXM + " px/m ergeben, ergibt "
      + (rVok.px_je_meter === null ? "nichts" : rVok.px_je_meter.toFixed(1)));
    // Nun zwei Flächenangaben genau über den Teilern 430 und 990
    const stoerer = [
      { text: "23,45 m²", einheit: "unklar", bedeutung: "raumflaeche",
        x: 414, y: 864, breite: 32, hoehe: 14, koordinaten: "pixel" },
      { text: "18,60 m²", einheit: "unklar", bedeutung: "raumflaeche",
        x: 974, y: 864, breite: 32, hoehe: 14, koordinaten: "pixel" }];
    const rV = bestimmeMassstab({ bild: bV,
      masszahlen: [mz(v1, "2,80"), mz(v2, "2,80")].concat(stoerer) });
    pruefe(rV.kandidaten.length === 2, "Aufbau: die Flächenangaben dürfen keine Kandidaten sein");
    pruefe(rV.kandidaten[0].pixel === rV.kandidaten[1].pixel,
      "Aufbau: beide Ketten müssen gleich lang gemessen werden, damit der Abgleich "
      + "untereinander den Fehler gerade NICHT bemerkt");
    pruefe(rV.kandidaten.every(function (k) { return k.verdeckt === true; }),
      "die verdeckte Maßhilfslinie innerhalb der Spanne wird nicht bemerkt");
    pruefe(rV.kandidaten.every(function (k) { return k.sauber === false; }),
      "ein Fund mit verdecktem Teiler darf nicht als sauber gelten");
    pruefe(rV.bestimmt === false,
      "zwei gleichsinnig verfälschte Ketten dürfen den Maßstab nicht bestimmen");
    pruefe(rV.px_je_meter === null,
      "aus verdeckten Teilern darf kein Vorschlag werden, angeboten wurde " + rV.px_je_meter);

    /* 25  BEFUND 2c: Summenprobe. Teilmaße müssen das Gesamtmaß derselben
     *     Kette ergeben. Ohne diese Probe fällt eine falsch zugeordnete
     *     Maßzahl nicht auf, solange sie für sich stimmig gemessen wird. */
    const summeFalsch = bestimmeMassstab({ bild: bild, masszahlen: [
      mz(k1, "3,80"), mz(k2, "4,20"), mz(k3, "3,00"), mz(k4, "12,00")] });
    pruefe(summeFalsch.befunde.some(function (b) {
      return b.id === "massstab_summe" && b.stufe === "sperre";
    }), "die gescheiterte Summenprobe wird nicht gemeldet");
    pruefe(summeFalsch.bestimmt === false,
      "eine Kette, deren Teilmaße das Gesamtmaß nicht ergeben, darf nicht bestimmen");
    pruefe(a1.befunde.some(function (b) {
      return b.id === "massstab_summe" && b.stufe === "gut";
    }), "die bestandene Summenprobe wird bei der stimmigen Kette nicht ausgewiesen");

    /* 25b  Bleibt die Zuordnung ungeprüft, weil die Kette mehr Abschnitte
     *      als Maßzahlen hat, muss das ausgewiesen werden. Genau so entsteht
     *      der Fall, den geometrisch niemand aufklären kann: eine Zahl, die
     *      mittig über dem falschen Abschnitt sitzt. */
    const bZ = neuesBild();
    waagerecht(bZ, 150, 1250, 780, 8);
    waagerecht(bZ, 150, 1250, 880, 2);
    [150, 530, 1250].forEach(function (x) { senkrecht(bZ, x, 860, 900, 2); });
    const z1 = zahlWaagerecht(bZ, 890, 871, 36, 14);   // mittig über 530..1250
    const rZ = bestimmeMassstab({ bild: bZ, masszahlen: [mz(z1, "3,80")] });
    pruefe(rZ.befunde.some(function (b) { return b.id === "massstab_zuordnung"; }),
      "die ungeprüfte Zuordnung von Maßzahl zu Abschnitt wird verschwiegen");
    pruefe(rZ.bestimmt === false, "eine Kette mit ungeprüfter Zuordnung bestimmt");
    pruefe(a1.befunde.every(function (b) { return b.id !== "massstab_zuordnung"; }),
      "die vollständig beschriftete Kette wird fälschlich beanstandet");

    /* 26  BEFUND 3: Zwei Belege sind zwei MESSUNGEN. Dieselbe Maßzahl
     *     doppelt geliefert — beim Modellaufruf keine Seltenheit — ergab
     *     vorher zwei Kandidaten, keinen Konflikt und Konfidenz 0,85 aus
     *     einer einzigen Messung. */
    const dop = bestimmeMassstab({ bild: bild, masszahlen: [mz(k2, "4,20"), mz(k2, "4,20")] });
    pruefe(dop.kandidaten.length === 1,
      "dieselbe Messung wird doppelt gezählt: " + dop.kandidaten.length + " Kandidaten");
    pruefe(dop.verworfen.some(function (v) { return /dieselbe Stelle/.test(v.grund); }),
      "die Dublette wird nicht als solche ausgewiesen");
    pruefe(dop.bestimmt === false, "eine Messung darf nicht als zwei Belege gelten");
    pruefe(dop.handlung === "bestaetigen", "Dublette: Handlung " + dop.handlung);

    /* 26b  Ein sauberer Fund und ein Fund über bloße Linienenden sind
     *      zusammen ebenfalls keine zwei tragfähigen Belege. */
    const bE = neuesBild();
    waagerecht(bE, 150, 1250, 780, 8);
    waagerecht(bE, 150, 1250, 880, 2);
    [150, 530].forEach(function (x) { senkrecht(bE, x, 860, 900, 2); });
    waagerecht(bE, 200, 700, 940, 2);                  // freies Linienstück, 500 px
    const e1 = zahlWaagerecht(bE, 340, 871, 36, 14);
    const e2 = zahlWaagerecht(bE, 450, 955, 36, 14);
    const rE = bestimmeMassstab({ bild: bE, masszahlen: [mz(e1, "3,80"), mz(e2, "5,00")] });
    pruefe(rE.kandidaten.length === 2 && rE.kandidaten.filter(function (k) {
      return k.sauber; }).length === 1,
      "Aufbau: genau ein sauberer und ein unbegrenzter Fund erwartet");
    pruefe(rE.bestimmt === false,
      "ein sauberer Fund plus ein Fund über Linienenden darf nicht bestimmen");

    /* 27  BEFUND 4: Die Einheit kommt vom Modell und ist ein GEMEINSAMER
     *     Fehler aller Ketten. Deshalb muss die Plausibilitätsprobe immer
     *     laufen, auch wenn schon ein Wert gefunden ist — vorher lief sie
     *     nur, wenn nichts bestimmt wurde, und taugte damit nie als
     *     Gegenprobe. */
    pruefe(a1.wege.C.moeglich === true,
      "Weg C läuft nicht, wenn bereits ein Maßstab bestimmt wurde");
    pruefe(a1.wege.C.gegenprobe === "unauffaellig",
      "die Gegenprobe wird beim bestimmten Wert nicht ausgewiesen: " + a1.wege.C.gegenprobe);

    /* 27b  Alle Maßzahlen um Faktor zehn zu klein gelesen (Millimeter als
     *      Zentimeter). Die Ketten stimmen untereinander perfekt überein;
     *      nur die von den Zahlen unabhängige Gegenprobe kann das fangen. */
    const zehn = bestimmeMassstab({ bild: bild, masszahlen: [
      { text: "0,380", einheit: "m", x: k1.x, y: k1.y, breite: 36, hoehe: 14,
        koordinaten: "pixel" },
      { text: "0,420", einheit: "m", x: k2.x, y: k2.y, breite: 36, hoehe: 14,
        koordinaten: "pixel" }] });
    pruefe(zehn.spanne_prozent === 0,
      "Aufbau: der Einheitenfehler muss beide Ketten gleich treffen");
    pruefe(zehn.wege.C.gegenprobe === "widerspruch",
      "die Gegenprobe schlägt beim Faktor-zehn-Fehler nicht an");
    pruefe(zehn.befunde.some(function (b) { return b.id === "massstab_c"; }),
      "der Widerspruch zur Plausibilitätsspanne wird nicht gemeldet");
    pruefe(zehn.bestimmt === false && zehn.px_je_meter === null,
      "ein um Faktor zehn falscher Maßstab wird übernommen");

    /* 27c  Derselbe Fehler an einer kleinen Zeichnung, bei der die grobe
     *      Abdeckungsprüfung noch nicht anschlägt: 400 statt 40 Pixel je
     *      Meter. Das Blatt deckte damit 3,5 m ab, was die Abdeckung
     *      durchgehen ließe; die Zeichnung selbst wäre aber nur 1,5 m breit. */
    const bK = neuesBild();
    waagerecht(bK, 150, 750, 700, 8);
    waagerecht(bK, 150, 750, 880, 2);
    [150, 350, 550, 750].forEach(function (x) { senkrecht(bK, x, 860, 900, 2); });
    const kk1 = zahlWaagerecht(bK, 250, 871, 30, 14);
    const kk2 = zahlWaagerecht(bK, 650, 871, 30, 14);
    const klein = bestimmeMassstab({ bild: bK, masszahlen: [mz(kk1, "0,50"), mz(kk2, "0,50")] });
    pruefe(klein.wege.C.gegenprobe === "widerspruch",
      "die Gegenprobe an der kleinen Zeichnung schlägt nicht an: " + klein.wege.C.gegenprobe);
    pruefe(klein.bestimmt === false, "400 statt 40 Pixel je Meter werden übernommen");
    // Kontrolle: mit richtig gelesener Einheit muss dieselbe Zeichnung tragen
    const kleinOk = bestimmeMassstab({ bild: bK,
      masszahlen: [mz(kk1, "5,00"), mz(kk2, "5,00")] });
    pruefe(kleinOk.bestimmt === true && Math.abs(kleinOk.px_je_meter - 40) < 1,
      "Kontrolle: dieselbe Zeichnung mit richtiger Einheit muss 40 px/m ergeben, ergibt "
      + (kleinOk.px_je_meter === null ? "nichts" : kleinOk.px_je_meter.toFixed(1)));

    /* 28  BEFUND 5: Nicht jeder Text mit Dezimaltrenner ist eine Länge.
     *     In einem Grundriss stehen Raumflächen, Höhenkoten, Öffnungsmaße
     *     und Neigungen — alle mit Komma geschrieben. */
    pruefe(textZuMeter("23,45 m²", "unklar").meter === null,
      "eine Raumfläche wird als Länge gelesen");
    pruefe(textZuMeter("23,45 m2", "unklar").meter === null,
      "\"23,45 m2\" wird als Länge gelesen (früher als 23,452 m)");
    pruefe(textZuMeter("23,45", "m2").meter === null,
      "die Einheit m2 vom Modell wird nicht als Fläche erkannt");
    pruefe(textZuMeter("OKFF +2,80", "unklar").meter === null,
      "eine Höhenkote wird als Länge gelesen");
    pruefe(textZuMeter("+2,80", "m").meter === null,
      "eine Kote mit Vorzeichen wird als Länge gelesen");
    pruefe(textZuMeter("±0,00", "m").meter === null, "±0,00 wird als Länge gelesen");
    pruefe(textZuMeter("1,01/2,26", "m").meter === null,
      "ein Öffnungsmaß wird als Länge gelesen");
    pruefe(textZuMeter("1,20 x 2,10", "m").meter === null,
      "ein Format mit x wird als Länge gelesen");
    pruefe(textZuMeter("5,5 %", "unklar").meter === null, "eine Neigung wird als Länge gelesen");
    pruefe(textZuMeter("3,80", "m", "raumflaeche").meter === null,
      "die gemeldete Bedeutung raumflaeche wird übergangen");
    pruefe(textZuMeter("3.80.5", "m").meter === null,
      "ein Text mit zwei Trennern wird ausgewertet");
    // und die gültigen Fälle bleiben gültig
    pruefe(textZuMeter("3,80", "m").meter === 3.8, "eine gültige Maßzahl wird verworfen");
    pruefe(Math.abs(textZuMeter(",85", "unklar").meter - 0.85) < 1e-9,
      ",85 wird durch die neue Prüfung verworfen");
    pruefe(textZuMeter("3,80 m", "unklar").meter === 3.8,
      "eine Maßzahl mit angehängter Einheit wird verworfen");
    const flaeche = bestimmeMassstab({ bild: bild, masszahlen: [
      mz(k2, "4,20"),
      { text: "23,45 m²", einheit: "unklar", x: k1.x, y: k1.y, breite: 36, hoehe: 14,
        koordinaten: "pixel" }] });
    pruefe(flaeche.kandidaten.length === 1, "die Flächenangabe wird als Maßkette verwertet");
    pruefe(flaeche.verworfen.some(function (v) { return /Fläche/.test(v.grund); }),
      "der Grund für das Verwerfen der Flächenangabe fehlt");

    /* 29  BEFUND 6: Der Plankopf-Weg darf nicht am Prüfpfad vorbeiführen.
     *     Ein direkt vom Modell gelieferter Nenner lief vorher an der Probe
     *     auf einen üblichen Zeichnungsmaßstab vorbei. */
    const kopf37 = bestimmeMassstab({ bild: bild, plankopf: { nenner: 37 },
      aufloesung: { dpi: 254, herkunft: "pdf-render", nachtraeglich_skaliert: false } });
    pruefe(kopf37.befunde.some(function (b) { return b.id === "massstab_kopf"; }),
      "ein unüblicher Nenner direkt vom Modell wird nicht beanstandet");
    pruefe(kopf37.wege.B.kandidat && kopf37.wege.B.kandidat.sauber === false,
      "ein unüblicher Nenner gilt als eindeutiger Beleg");
    pruefe(kopf37.bestimmt === false, "1:37 vom Modell bestimmt den Maßstab");

    /* 29b  "nicht bekannt" ist nicht "nicht skaliert". Fehlt die Angabe,
     *      ob nachträglich skaliert wurde, ist Weg B ungültig. */
    const ohneAngabe = bestimmeMassstab({ bild: bild, plankopf: "M 1:100",
      aufloesung: { dpi: 254, herkunft: "pdf-render" } });
    pruefe(ohneAngabe.wege.B.moeglich === false,
      "Weg B gilt, obwohl unbekannt ist, ob das Bild skaliert wurde");
    pruefe(/skaliert/.test(ohneAngabe.wege.B.hinweis),
      "der Grund für den Ausschluss nennt die fehlende Angabe nicht");
    const mitA = bestimmeMassstab({ bild: bild, masszahlen: [mz(k2, "4,20")],
      plankopf: "M 1:100", aufloesung: { dpi: 254, herkunft: "pdf-render" } });
    pruefe(mitA.bestimmt === false,
      "ein Plankopf ohne geklärte Skalierung trägt zusammen mit einer Maßkette");

    /* ================================================================
     * 29c bis 29e  Schriftfeld gegen Maßkette
     * ================================================================
     * Die Probe, wegen der dieser Weg überhaupt gebaut wurde. Ein Blatt, das
     * 1:100 behauptet und 1:141 misst, ist eine A1-Zeichnung auf A3 kopiert.
     * Fällt das nicht auf, liegt jede Fläche um den Faktor zwei daneben. */

    /* 29c  Beide sagen dasselbe: 380 px auf 3,80 m sind 100 px/m, und bei
     *      254 dpi entspricht 1:100 genau 100 px/m. */
    const KOPF_DPI = { dpi: 254, herkunft: "pdf-render", nachtraeglich_skaliert: false };
    const einig = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k1, "3,80"), mz(k2, "4,20")],
      plankopf: "M 1:100", aufloesung: KOPF_DPI });
    pruefe(einig.schriftfeld_probe === "stimmt",
      "Schriftfeld und Maßkette stimmen überein, gemeldet wird: " + einig.schriftfeld_probe);
    pruefe(einig.nenner_gemessen !== null && Math.abs(einig.nenner_gemessen - 100) < 1,
      "der gemessene Nenner trifft 1:100 nicht: " + einig.nenner_gemessen);
    pruefe(einig.bestimmt === true, "zwei Maßketten und ein passendes Schriftfeld tragen nicht");
    pruefe(einig.befunde.some(function (b) {
      return b.id === "massstab_kopf_kette" && b.stufe === "gut";
    }), "die bestandene Probe wird nicht als Befund ausgewiesen");

    /* 29d  Dieselbe Zeichnung, aber die Maßzahlen sagen, dass dieselben
     *      Pixel längere Strecken bedeuten: 380 px auf 5,36 m sind 70,9 px/m
     *      und damit 1:141 — genau eine von A1 auf A3 verkleinerte Kopie.
     *      Das Schriftfeld behauptet weiter 1:100. */
    const verkleinert = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k1, "5,36"), mz(k2, "5,92")],
      plankopf: "M 1:100", aufloesung: KOPF_DPI });
    pruefe(verkleinert.schriftfeld_probe === "widerspruch",
      "die verkleinerte Kopie wird nicht erkannt: " + verkleinert.schriftfeld_probe);
    pruefe(verkleinert.nenner_gemessen !== null
      && Math.abs(verkleinert.nenner_gemessen - 141) < 2,
      "der gemessene Nenner trifft 1:141 nicht: " + verkleinert.nenner_gemessen);
    pruefe(verkleinert.nenner_schriftfeld === 100,
      "der Nenner aus dem Schriftfeld fehlt im Ergebnis");
    pruefe(verkleinert.bestimmt === false,
      "ein Blatt mit widersprüchlichem Schriftfeld setzt den Maßstab selbsttätig");
    const bWider = verkleinert.befunde.filter(function (b) { return b.id === "massstab_kopf_kette"; })[0];
    pruefe(!!bWider && bWider.stufe === "sperre",
      "der Widerspruch zwischen Schriftfeld und Maßkette wird nicht gesperrt");
    pruefe(!!bWider && /1:100/.test(bWider.text) && /verkleinert/.test(bWider.text),
      "der Befund nennt nicht beide Zahlen und die Richtung der Abweichung");

    /* 29d2  Messrauschen ist KEIN Formatfehler.
     *       Am echten Blatt schnitt_bb.pdf standen im Schriftfeld 1:50 und
     *       gemessen wurden 1:48,8 — 2,4 Prozent. Mit der alten Grenze von
     *       zwei Prozent sperrte das Werkzeug den Maßstab und behauptete, das
     *       Blatt liege nicht in Originalgröße vor. Das war falsch: der
     *       kleinste am Kopierer einstellbare Schritt sind 6 Prozent.
     *       Nachgestellt: 3,80 m auf 380 px bei 254 dpi sind genau 1:100;
     *       3,71 m auf denselben 380 px sind 1:97,6, also dieselben 2,4
     *       Prozent daneben. */
    const rauschen = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k1, "3,71"), mz(k2, "4,10")],
      plankopf: "M 1:100", aufloesung: KOPF_DPI });
    pruefe(rauschen.schriftfeld_probe === "stimmt",
      "2,4 Prozent Unterschied sind Messrauschen und duerfen nicht sperren, gemeldet: "
      + rauschen.schriftfeld_probe + " bei 1:" + rauschen.nenner_gemessen);
    pruefe(rauschen.bestimmt === true,
      "ein Blatt mit 2,4 Prozent Messrauschen muss weiter tragen");
    const bRausch = rauschen.befunde.filter(function (b) {
      return b.id === "massstab_kopf_kette"; })[0];
    pruefe(!!bRausch && !/nicht in Originalgr/.test(bRausch.text),
      "der Befund darf nicht behaupten, das Blatt liege nicht in Originalgroesse vor");
    /* Die Gegenprobe muss weiter greifen: ein echter Formatschritt sperrt. */
    pruefe(verkleinert.schriftfeld_probe === "widerspruch",
      "der Formatschritt A1 auf A3 muss weiter gesperrt werden");

    /* 29e  Ohne belastbare Auflösung lässt sich der gemessene Wert nicht in
     *      einen Nenner übersetzen. Dann darf die Probe nicht so tun, als
     *      hätte sie stattgefunden — der häufigste Fall ist das
     *      Bildschirmfoto. */
    const ohneDpi = bestimmeMassstab({ bild: bild,
      masszahlen: [mz(k1, "3,80"), mz(k2, "4,20")], plankopf: "M 1:100" });
    pruefe(ohneDpi.schriftfeld_probe === "nicht moeglich",
      "ohne bekannte Auflösung wird eine Probe behauptet: " + ohneDpi.schriftfeld_probe);
    pruefe(ohneDpi.nenner_gemessen === null,
      "ohne Auflösung wird ein gemessener Nenner ausgewiesen");
    pruefe(ohneDpi.nenner_schriftfeld === 100,
      "der abgelesene Nenner geht verloren, obwohl er dastand");

    /* ================================================================
     * 30  Der vom Modell abgelesene Maßstab (ausAuslese)
     * ================================================================
     * Das ist der erste und billigste Weg: der Maßstab steht im Schriftfeld.
     * Geprüft wird vor allem, dass die Falle erhalten bleibt — ein gelesener
     * Nenner darf nie als Messwert durchgehen, solange die Blattgröße nicht
     * gesichert ist. */

    // Formatzuordnung: A3 quer wie hoch, A4 nicht verwechselt
    pruefe(formatAusMass(420, 297) === "A3", "420 x 297 mm wird nicht als A3 erkannt");
    pruefe(formatAusMass(297, 420) === "A3", "A3 hochkant wird nicht erkannt");
    pruefe(formatAusMass(210, 297) === "A4", "210 x 297 mm wird nicht als A4 erkannt");
    pruefe(formatAusMass(841, 1189) === "A0", "A0 wird nicht erkannt");
    pruefe(formatAusMass(500, 700) === null, "ein Sondermaß wird einem Format zugeordnet");
    pruefe(formatAusMass(0, 0) === null, "ein leeres Blattmaß liefert ein Format");

    const blockA3 = function (zusatz) {
      return Object.assign({
        angaben: [{ wortlaut: "M 1:100", nenner: 100,
                    fundstelle: "Schriftfeld unten rechts",
                    gilt_fuer: "ganzes Blatt", lesbarkeit: "sicher" }],
        nenner_grundriss: 100, mehrere_massstaebe: false,
        blattgroesse: "A3", blattgroesse_wortlaut: "A3",
        bemasst: true, masszahlen: [],
      }, zusatz || {});
    };

    // a) Blattgröße angeschrieben UND vorliegend gleich -> belegt
    const gut = ausAuslese({ massstab: blockA3(),
                             blatt: { breite_mm: 420, hoehe_mm: 297, herkunft: "pdf" } });
    pruefe(gut.nenner === 100, "1:100 aus dem Schriftfeld kommt nicht an");
    pruefe(gut.blattmass_gesichert === true, "die bestätigte Blattgröße gilt nicht als gesichert");
    pruefe(gut.guete === "belegt", "eine bestätigte Blattgröße ergibt nicht 'belegt', sondern " + gut.guete);
    pruefe(gut.guete !== "abgesichert",
      "ein bloß gelesener Maßstab darf nie 'abgesichert' heißen, das setzt eine Messung voraus");
    pruefe(/Schriftfeld unten rechts/.test(gut.quelle), "die Fundstelle fehlt in der Herkunft");

    // b) DIE FALLE: A1-Plan auf A3 kopiert. Nenner darf nicht als Beleg gelten.
    const kopie = ausAuslese({
      massstab: blockA3({ blattgroesse: "A1", blattgroesse_wortlaut: "Format A1" }),
      blatt: { breite_mm: 420, hoehe_mm: 297, herkunft: "pdf" } });
    pruefe(kopie.guete === "widerspruch",
      "eine verkleinerte Kopie wird nicht als Widerspruch erkannt, sondern als " + kopie.guete);
    pruefe(kopie.handlung === "messen", "bei verkleinerter Kopie wird nicht aufs Messen verwiesen");
    pruefe(kopie.befunde.some(function (b) { return b.id === "massstab_verkleinert"; }),
      "der Befund zur verkleinerten Kopie fehlt");
    pruefe(kopie.befunde.some(function (b) { return b.stufe === "sperre"; }),
      "die verkleinerte Kopie sperrt nicht");

    // c) Bildschirmfoto: Schriftfeld sagt A3, Blattgröße gibt es nicht mehr
    const foto = ausAuslese({ massstab: blockA3(), blatt: { herkunft: "bild" } });
    pruefe(foto.nenner === 100, "beim Bildschirmfoto geht der gelesene Nenner verloren");
    pruefe(foto.guete === "vorlaeufig",
      "ohne Blattgröße darf der Maßstab nicht 'belegt' heißen, ist: " + foto.guete);
    pruefe(foto.blattmass_gesichert === false, "ohne Blattmaß gilt die Größe als gesichert");
    pruefe(foto.befunde.some(function (b) { return b.id === "massstab_blattmass_offen"; }),
      "der Hinweis auf die fehlende Blattgröße fehlt");

    // d) PDF ohne Blattgrößenangabe im Schriftfeld: bleibt vorläufig
    const ohneAngabeGroesse = ausAuslese({
      massstab: blockA3({ blattgroesse: "keine_angabe", blattgroesse_wortlaut: "" }),
      blatt: { breite_mm: 420, hoehe_mm: 297, herkunft: "pdf" } });
    pruefe(ohneAngabeGroesse.guete === "vorlaeufig",
      "ohne angeschriebene Blattgröße darf nichts belegt sein");
    pruefe(ohneAngabeGroesse.befunde.some(function (b) {
      return b.id === "massstab_blattmass_fehlt"; }),
      "der Hinweis auf die fehlende Angabe im Schriftfeld fehlt");

    // e) Zwei Maßstäbe auf einem Bogen: Grundriss 1:100, Detail 1:20
    const zwei = ausAuslese({ massstab: {
      angaben: [
        { wortlaut: "1:100", nenner: 100, fundstelle: "unter dem Grundriss",
          gilt_fuer: "Grundriss EG", lesbarkeit: "sicher" },
        { wortlaut: "M 1:20", nenner: 20, fundstelle: "neben dem Detail",
          gilt_fuer: "Detail Fensteranschluss", lesbarkeit: "sicher" }],
      nenner_grundriss: 100, mehrere_massstaebe: true,
      blattgroesse: "A1", blattgroesse_wortlaut: "A1", bemasst: true, masszahlen: [],
    }, blatt: { breite_mm: 841, hoehe_mm: 594, herkunft: "pdf" } });
    pruefe(zwei.nenner === 100, "bei zwei Maßstäben wird nicht der des Grundrisses genommen");
    pruefe(zwei.mehrere === true, "mehrere Maßstäbe werden nicht gemeldet");
    pruefe(zwei.gilt_fuer === "Grundriss EG", "die Zuordnung des Maßstabs geht verloren");
    pruefe(zwei.befunde.some(function (b) { return b.id === "massstab_mehrere"; }),
      "der Befund zu mehreren Maßstäben fehlt");
    pruefe(zwei.guete === "belegt", "A1 auf A1 muss belegt sein, ist: " + zwei.guete);

    // f) Zwei Maßstäbe, keiner dem Grundriss zuzuordnen -> nichts übernehmen
    const zweiOffen = ausAuslese({ massstab: {
      angaben: [
        { wortlaut: "1:100", nenner: 100, fundstelle: "Schriftfeld", gilt_fuer: "",
          lesbarkeit: "sicher" },
        { wortlaut: "1:20", nenner: 20, fundstelle: "Schriftfeld", gilt_fuer: "",
          lesbarkeit: "sicher" }],
      nenner_grundriss: null, mehrere_massstaebe: true,
      blattgroesse: "keine_angabe", blattgroesse_wortlaut: "", bemasst: false, masszahlen: [],
    }, blatt: {} });
    pruefe(zweiOffen.nenner === null,
      "bei ungeklärter Zuordnung wird trotzdem ein Maßstab gesetzt");
    pruefe(zweiOffen.handlung === "von_hand", "ohne Zuordnung und ohne Maßzahlen bleibt nur die Hand");
    pruefe(zweiOffen.befunde.some(function (b) { return b.id === "massstab_zuordnung_offen"; }),
      "der Befund zur offenen Zuordnung fehlt");

    // g) Kein Maßstab auf dem Blatt
    const keiner = ausAuslese({ massstab: {
      angaben: [], nenner_grundriss: null, mehrere_massstaebe: false,
      blattgroesse: "keine_angabe", blattgroesse_wortlaut: "", bemasst: true,
      masszahlen: [{ text: "4,20", einheit: "m", bedeutung: "teilmass",
                     x: 0.31, y: 0.52, breite: 0.02, hoehe: 0.01 }],
    }, blatt: {} });
    pruefe(keiner.nenner === null, "ohne Angabe wird ein Maßstab erfunden");
    pruefe(keiner.guete === "unbekannt", "ohne Angabe ist die Güte nicht unbekannt");
    pruefe(keiner.handlung === "messen",
      "mit brauchbaren Maßzahlen muss aufs Messen verwiesen werden, nicht auf die Hand");
    pruefe(keiner.masszahlen.length === 1, "die Maßzahl kommt nicht durch");
    pruefe(keiner.masszahlen[0].koordinaten === "relativ",
      "die Lageangabe wird nicht als relativ gekennzeichnet");

    // h) Die aufbereiteten Maßzahlen müssen bestimmeMassstab wirklich passen.
    //    Das ist der Punkt, an dem eine falsche Form still durchginge.
    const durchgereicht = ausAuslese({ massstab: {
      angaben: [], nenner_grundriss: null, mehrere_massstaebe: false,
      blattgroesse: "keine_angabe", blattgroesse_wortlaut: "", bemasst: true,
      masszahlen: [
        /* k1 bemasst 380 px, k2 bemasst 420 px; bei 100 px je Meter sind das
           3,80 m und 4,20 m. Die Lage wird als Anteil der Bildkante
           uebergeben, genau so, wie das Modell sie liefert. */
        { text: "3,80", einheit: "m", bedeutung: "teilmass",
          x: k1.x / W, y: k1.y / H, breite: k1.breite / W, hoehe: k1.hoehe / H },
        { text: "4,20", einheit: "m", bedeutung: "teilmass",
          x: k2.x / W, y: k2.y / H, breite: k2.breite / W, hoehe: k2.hoehe / H }],
    }, blatt: {} });
    const ausMz = bestimmeMassstab({ bild: bild, masszahlen: durchgereicht.masszahlen });
    pruefe(ausMz.wege.A.moeglich === true,
      "die aus der Auslese aufbereiteten Maßzahlen taugen nicht für Weg A");
    pruefe(ausMz.kandidaten.length >= 2,
      "aus den durchgereichten Maßzahlen entstehen keine zwei Kandidaten, sondern "
      + ausMz.kandidaten.length);
    pruefe(ausMz.px_je_meter !== null && Math.abs(ausMz.px_je_meter - 100) < 3,
      "die durchgereichten Maßzahlen ergeben nicht rund 100 Pixel je Meter, sondern "
      + (ausMz.px_je_meter === null ? "nichts" : ausMz.px_je_meter.toFixed(1)));

    // i) Unplausible Lageangaben werden verworfen, nicht durchgereicht
    const krumm = ausAuslese({ massstab: {
      angaben: [], nenner_grundriss: null, mehrere_massstaebe: false,
      blattgroesse: "keine_angabe", blattgroesse_wortlaut: "", bemasst: true,
      masszahlen: [
        { text: "4,20", einheit: "m", bedeutung: "teilmass", x: 340, y: 871,
          breite: 36, hoehe: 14 },
        { text: "3,60", einheit: "m", bedeutung: "teilmass", x: -0.1, y: 0.5,
          breite: 0.02, hoehe: 0.01 },
        { text: "5,00", einheit: "m", bedeutung: "teilmass", x: 0.4, y: 0.6,
          breite: 0.02, hoehe: 0.01 }],
    }, blatt: {} });
    pruefe(krumm.masszahlen.length === 1,
      "Lageangaben ausserhalb von 0 bis 1 werden nicht verworfen, durchgelassen: "
      + krumm.masszahlen.length);

    // j) Unüblicher Nenner aus dem Schriftfeld gilt nicht als Beleg
    const krummerNenner = ausAuslese({ massstab: blockA3({
      angaben: [{ wortlaut: "M 1:37", nenner: 37, fundstelle: "Schriftfeld",
                  gilt_fuer: "ganzes Blatt", lesbarkeit: "sicher" }],
      nenner_grundriss: 37 }),
      blatt: { breite_mm: 420, hoehe_mm: 297, herkunft: "pdf" } });
    pruefe(krummerNenner.guete === "vorlaeufig",
      "1:37 aus dem Schriftfeld gilt als belegt");
    pruefe(krummerNenner.befunde.some(function (b) { return b.id === "massstab_kopf"; }),
      "der unübliche Nenner wird nicht beanstandet");

    // k) Wortlaut und gemeldete Zahl uneins: der Wortlaut gilt
    const uneins = ausAuslese({ massstab: blockA3({
      angaben: [{ wortlaut: "M 1:50", nenner: 100, fundstelle: "Schriftfeld",
                  gilt_fuer: "ganzes Blatt", lesbarkeit: "sicher" }],
      nenner_grundriss: 50 }),
      blatt: { breite_mm: 420, hoehe_mm: 297, herkunft: "pdf" } });
    pruefe(uneins.angaben[0].nenner === 50,
      "gegen den Wortlaut wird die gemeldete Zahl genommen");
    pruefe(uneins.befunde.some(function (b) { return b.id === "massstab_gelesen_uneins"; }),
      "der Widerspruch zwischen Wortlaut und gemeldeter Zahl fällt nicht auf");

    /* m) BEFUND AUS DER ECHTEN UNTERLAGE, Mälzerstraße 59, Blatt von 1936:
     *    Auf dem Bogen stehen ein Erdgeschossgrundriss und darunter ein
     *    Lageplan. Der einzige Maßstab des Blattes ist "LAGEPLAN M 1:500".
     *    Eine frühere Fassung nahm bei nur einer Angabe einfach diese und
     *    rechnete den Grundriss fünffach zu groß. */
    const lageplan = ausAuslese({ massstab: {
      angaben: [{ wortlaut: "LAGEPLAN M 1:500", nenner: 500,
                  fundstelle: "unter dem Lageplan", gilt_fuer: "Lageplan",
                  lesbarkeit: "sicher" }],
      nenner_grundriss: null, mehrere_massstaebe: false,
      blattgroesse: "keine_angabe", blattgroesse_wortlaut: "", bemasst: true,
      masszahlen: [{ text: "8,50", einheit: "m", bedeutung: "aussenmass",
                     x: 0.36, y: 0.28, breite: 0.02, hoehe: 0.01 }],
    }, blatt: { herkunft: "bild" } });
    pruefe(lageplan.nenner === null,
      "der Maßstab des Lageplans wird für den Grundriss übernommen: 1:" + lageplan.nenner);
    pruefe(lageplan.befunde.some(function (b) { return b.id === "massstab_anderer_teil"; }),
      "es wird nicht gesagt, dass die einzige Angabe zu einem anderen Zeichnungsteil gehört");
    pruefe(lageplan.handlung === "messen",
      "bei bemaßtem Blatt ohne gültigen Maßstab muss aufs Messen verwiesen werden");

    // n) Eine einzelne Angabe fürs ganze Blatt darf weiter zurückfallen
    const ganzes = ausAuslese({ massstab: {
      angaben: [{ wortlaut: "M 1:100", nenner: 100, fundstelle: "Schriftfeld",
                  gilt_fuer: "ganzes Blatt", lesbarkeit: "sicher" }],
      nenner_grundriss: null, mehrere_massstaebe: false,
      blattgroesse: "keine_angabe", blattgroesse_wortlaut: "", bemasst: false,
      masszahlen: [],
    }, blatt: {} });
    pruefe(ganzes.nenner === 100,
      "eine Angabe fuer das ganze Blatt wird nicht mehr uebernommen");

    // l) Leere Eingabe darf nicht werfen
    const leerAuslese = ausAuslese({});
    pruefe(leerAuslese.nenner === null && leerAuslese.guete === "unbekannt"
      && leerAuslese.handlung === "von_hand",
      "eine leere Eingabe liefert kein sauberes 'unbekannt'");

    return { ok: f.length === 0, fehler: f, anzahl: geprueft };
  }

  return {
    bestimmeMassstab: bestimmeMassstab,
    ausAuslese: ausAuslese,
    formatAusMass: formatAusMass,
    textZuMeter: textZuMeter,
    nennerAusText: nennerAusText,
    pxJeMeterAusNenner: pxJeMeterAusNenner,
    selbsttest: selbsttest,
    SCHWELLEN: S,
    GUELTIGKEIT_B: GUELTIGKEIT_B,
    NENNER_UEBLICH: NENNER_UEBLICH,
  };
});
