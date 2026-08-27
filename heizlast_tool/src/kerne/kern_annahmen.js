/* ===========================================================================
 * kern_annahmen.js — begründete Annahmen für Angaben, die auf dem Blatt fehlen
 * ===========================================================================
 * WARUM ES DIESES MODUL GIBT
 *
 * Gemessen an Sebastians Blatt „BV 2-0887 Ziolkowski", echter Durchlauf gegen
 * den echten Endpunkt: das Schriftfeld kam mit lauter null zurück, gelesen
 * wurde allein das Plandatum 17.05.2022. Ergebnis im Werkzeug: 0,00 kW,
 * „Nicht belastbar", Bericht gesperrt. Zwei fehlende Angaben — Baujahr und
 * Postleitzahl — hielten die ganze Rechnung an.
 *
 * Das ist der falsche Umgang mit einer Lücke. Ein Werkzeug, das eine
 * begründete Annahme treffen kann und stattdessen eine Null zeigt, hilft
 * niemandem. Es gibt genau drei Bedingungen, unter denen eine Annahme
 * zulässig ist, und dieses Modul hält alle drei ein:
 *
 *   1. Sie ist AUS DEM BLATT ODER AUS EINER TABELLE ABGELEITET, nicht
 *      erfunden. Jede Zahl hier stammt entweder vom Blatt (Plandatum, Ort)
 *      oder aus der hinterlegten Klimatabelle nach DIN/TS 12831-1.
 *   2. Sie trägt ihre BEGRÜNDUNG und ihre BANDBREITE mit sich, in einem Satz,
 *      der im Werkzeug und im Bericht steht.
 *   3. Sie ist ÜBERSCHREIBBAR, und sobald jemand sie überschreibt, ist sie
 *      keine Annahme mehr.
 *
 * WELCHE RICHTUNG IST DIE VORSICHTIGE?
 *
 * Bei einer Heizlast sind die beiden Fehlerrichtungen nicht gleich teuer.
 * Zu klein gerechnet heißt: der Wärmeerzeuger ist zu klein, das Haus wird am
 * Auslegungstag nicht warm, und das fällt erst im Betrieb auf. Zu groß
 * gerechnet heißt: die Anlage kostet mehr und taktet. Die vorsichtige
 * Richtung ist deshalb die zur höheren Last — also zum älteren Baujahr und
 * zur kälteren Norm-Außentemperatur. Wo dieses Modul zwischen zwei belegten
 * Werten wählen darf, wählt es den kälteren bzw. den älteren.
 *
 * WAS ES AUSDRÜCKLICH NICHT TUT
 *
 * Es rät nichts. Fehlt der Anhaltspunkt, entsteht keine Annahme, sondern die
 * Auskunft, warum keine möglich ist. Und es überschreibt nie etwas, das
 * eingetragen oder aus einer Unterlage belegt ist.
 * ======================================================================== */
(function () {
  "use strict";

  /* Die Typologie endet 2022 (DATEN_TYPOLOGIE.GELTUNG_BIS). Der Wert wird zur
     Laufzeit aus dem Modul gelesen; die Zahl hier ist nur der Rückfall für
     den nackten Selbsttest. */
  const GELTUNG_BIS_RUECKFALL = 2022;

  function typologiemodul(o) {
    return (o && Object.prototype.hasOwnProperty.call(o, "typologie"))
      ? o.typologie
      : ((typeof window !== "undefined" && window.DATEN_TYPOLOGIE) || null);
  }
  function klimamodul(o) {
    return (o && Object.prototype.hasOwnProperty.call(o, "klima"))
      ? o.klima
      : ((typeof window !== "undefined" && window.DATEN_KLIMA) || null);
  }

  function komma(x, n) {
    return Number(x).toFixed(n === undefined ? 1 : n).replace(".", ",");
  }

  /* =====================================================================
   * 1  Baujahr aus dem Plandatum
   * =====================================================================
   * HERLEITUNG, UND WO SIE ENDET
   *
   * Ein Plandatum sagt über das Baujahr genau eine Sache, und die hängt an
   * der Art des Blattes:
   *
   *   Neubauplanung — das Gebäude entsteht nach dem Blatt, in aller Regel
   *     innerhalb von ein bis zwei Jahren. Das Plandatum ist dann eine gute
   *     Näherung des Baujahrs. Es ist zugleich die UNTERE Grenze: gebaut wird
   *     nicht vor der Planung. Und weil ein später fertiggestelltes Gebäude
   *     eher besser gedämmt ist als ein früheres, ist das Plandatum unter
   *     allen möglichen Baujahren zugleich das mit der HÖCHSTEN Heizlast —
   *     also die vorsichtige Wahl innerhalb der Spanne. Natürliche und
   *     vorsichtige Wahl fallen hier zusammen.
   *
   *   Bestandsaufnahme, Sanierungs- oder Umbauplanung — das Blatt bildet ein
   *     Gebäude ab, das schon steht. Das Plandatum ist das Aufnahmedatum und
   *     sagt über das Baujahr NICHTS außer: das Gebäude ist nicht jünger.
   *     Hier wäre „Baujahr = Plandatum" der teuerste denkbare Fehler; er
   *     setzt für ein Haus von 1960 die U-Werte eines Neubaus an und rechnet
   *     die Heizlast um mehr als die Hälfte zu klein. Deshalb entsteht in
   *     diesem Fall KEINE Annahme.
   *
   * Welcher der beiden Fälle vorliegt, steht auf dem Blatt und wird gelesen
   * (objekt.planungsart im Endpunkt, mit dem Wortlaut als Beleg). Findet die
   * Auslese kein Merkmal, ist die Angabe „unklar". Dann wird das Plandatum
   * zwar angesetzt, damit überhaupt eine Zahl entsteht — aber ausdrücklich
   * als OBERGRENZE, mit der Richtung des möglichen Fehlers im Klartext und
   * einer Vergleichsrechnung daneben. Der Kollege sieht dann: „so viel, wenn
   * es ein Neubau ist; so viel, wenn das Haus von 1970 ist."
   * ================================================================== */

  /** Findet die Jahreszahl in einem Plandatum. Nur 1900 bis heute + 3 Jahre;
   *  „M 1:100" und „Blatt 2 von 5" sind keine Jahreszahlen. */
  function jahrAusDatum(text, heute) {
    const s = String(text == null ? "" : text);
    const jetzt = Number.isFinite(heute) ? heute : new Date().getFullYear();
    const treffer = s.match(/\b(19\d{2}|20\d{2})\b/g);
    if (!treffer) return null;
    /* Ein Datum kann mehrere Jahreszahlen tragen („Stand 2019, geändert
       2022"). Die späteste ist die des Blattes. */
    let best = null;
    treffer.forEach(function (t) {
      const j = parseInt(t, 10);
      if (j >= 1900 && j <= jetzt + 3 && (best === null || j > best)) best = j;
    });
    return best;
  }

  /* Wortlisten für den Fall, dass die Auslese kein Urteil abgibt.
   *
   * WARUM ES DIESEN ZWEITEN WEG GIBT. Die Frage „plant das Blatt oder bildet
   * es ab" wird im Endpunkt gestellt (objekt.planungsart). Antwortet er
   * „unklar" — oder ist er noch die ältere Fassung —, steht die Auskunft
   * trotzdem oft schon im Haus: in der Blattbezeichnung, im Dateinamen, im
   * Bauvorhaben, im Plankopf. Sebastians Datei heißt
   * „Werkvertragsverzeichnung BV 2-0887 Ziolkowski"; ein Werkvertrag wird vor
   * dem Bauen geschlossen, nicht danach.
   *
   * Das ist kein Raten: gefunden wird ein Wort, und das gefundene Wort steht
   * als Beleg in der Begründung. Findet sich aus beiden Listen etwas, bleibt
   * es bei „unklar" — ein Blatt, das Umbau UND Neubau nennt, beantwortet die
   * Frage nicht. */
  const WORT_NEUBAU = [
    "neubau", "neuerrichtung", "errichtung", "bauantrag", "baugesuch",
    "bauvorlage", "genehmigungsplanung", "entwurfsplanung", "werkplanung",
    "werkvertrag", "ausführungsplanung", "ausfuehrungsplanung", "rohbau",
    "siehe statik", "baubeschreibung",
  ];
  const WORT_BESTAND = [
    "bestand", "aufmaß", "aufmass", "sanierung", "modernisierung", "umbau",
    "umnutzung", "denkmal", "instandsetzung", "altbau", "bestandsaufnahme",
    "abbruch", "rückbau", "rueckbau", "revisionsplan", "nutzungsänderung",
    "nutzungsaenderung",
  ];

  /** Sucht in allem, was das Werkzeug ohnehin über das Blatt weiß, nach einem
   *  Merkmal für Neubau oder Bestand.
   *  @param texte Array beliebiger Zeichenketten (Dateiname, Bauvorhaben,
   *               Plankopf, Blattbezeichnung).
   *  @return {art, beleg} — art ist "neubau", "bestand" oder "unklar". */
  function planungsartAusText(texte) {
    const alle = (texte || []).filter(Boolean).map(function (x) { return String(x); });
    const gefunden = function (liste) {
      for (let i = 0; i < alle.length; i++) {
        const klein = alle[i].toLowerCase();
        for (let j = 0; j < liste.length; j++) {
          if (klein.indexOf(liste[j]) >= 0) return { wort: liste[j], text: alle[i] };
        }
      }
      return null;
    };
    const n = gefunden(WORT_NEUBAU), b = gefunden(WORT_BESTAND);
    if (n && b) return { art: "unklar", beleg: null };
    if (n) return { art: "neubau", beleg: "„" + n.text.trim() + "“" };
    if (b) return { art: "bestand", beleg: "„" + b.text.trim() + "“" };
    return { art: "unklar", beleg: null };
  }

  /** Die Annahme zum Baujahr.
   *  @param q {plandatum, planungsart, planungsart_beleg, gebaeudeart, heute}
   *  @return null, wenn gar kein Plandatum vorliegt; sonst ein Satz mit
   *          wert (null = keine Annahme möglich) und Begründung. */
  function baujahr(q, opt) {
    const o = q || {};
    const jahr = jahrAusDatum(o.plandatum, o.heute);
    if (jahr === null) return null;
    let art = (o.planungsart === "neubau" || o.planungsart === "bestand")
      ? o.planungsart : "unklar";
    let beleg = String(o.planungsart_beleg || "").trim();
    /* Was die Auslese offenlässt, steht vielleicht schon im Blattnamen. */
    if (art === "unklar") {
      const aus = planungsartAusText(o.texte);
      if (aus.art !== "unklar") { art = aus.art; beleg = aus.beleg; }
    }

    if (art === "bestand") {
      return {
        feld: "meta.baujahr", wert: null, stufe: "nicht_moeglich",
        plandatum_jahr: jahr,
        kurz: "Baujahr aus dem Plandatum nicht ableitbar",
        begruendung: "Das Blatt ist als Bestandsunterlage gelesen worden"
          + (beleg ? " (" + beleg + ")" : "")
          + ". Sein Datum " + jahr + " ist das Aufnahmedatum und nicht das "
          + "Baujahr; das Gebäude ist nur nicht jünger als " + jahr + ". Eine "
          + "Annahme aus diesem Datum würde die Heizlast bei einem älteren "
          + "Haus um ein Vielfaches zu klein rechnen. Das Baujahr ist "
          + "einzutragen.",
        richtung: null, alternativ: null,
      };
    }

    const DT = typologiemodul(opt);
    const grenze = (DT && DT.GELTUNG_BIS) || GELTUNG_BIS_RUECKFALL;
    /* GEKAPPT WIRD NICHT MEHR — und warum das die Berichtigung eines Fehlers
       und keine Aufweichung ist.

       Bis zum 24.08.2026 wurde ein Plandatum jenseits von 2022 auf 2022
       heruntergesetzt, weil die Gebäudetypologie dort endete und ein
       jüngeres Baujahr überhaupt keine U-Werte hergab. Das Baujahr wurde
       also verbogen, damit die Tabelle noch traf. Zwei Dinge waren daran
       falsch: im Bericht stand ein Baujahr, das das Gebäude nicht hat, und
       wer die Zahl von Hand auf 2025 berichtigte, bekam gar keine Bauteile
       mehr — genau der Fall, der Sebastians Blatt auf 0,00 kW gestellt hat.

       Seit die Startwerte für ein Baujahr ab 2023 aus dem Referenzgebäude
       des GModG kommen (DATEN_TYPOLOGIE, zweite Quelle), gibt es keinen
       Grund mehr zu kappen. Angesetzt wird das Plandatum selbst; die Quelle
       der U-Werte richtet sich danach und sagt selbst, woher sie stammt.
       Gekappt wird nur noch, wenn das Typologiemodul die zweite Quelle nicht
       kennt — das ist der Rückfall für eine ältere Fassung. */
    const zweiteQuelleDa = !!(DT && DT.NEUBAU
      && Number.isFinite(DT.NEUBAU.ab) && jahr >= DT.NEUBAU.ab);
    const gekappt = jahr > grenze && !zweiteQuelleDa;
    const wert = gekappt ? grenze : jahr;

    if (art === "neubau") {
      return {
        feld: "meta.baujahr", wert: wert, stufe: "abgeleitet",
        plandatum_jahr: jahr,
        kurz: "Baujahr " + wert + " aus dem Plandatum angenommen",
        begruendung: "Das Blatt ist als Neubauplanung gelesen worden"
          + (beleg ? " (" + beleg + ")" : "")
          + " und auf " + jahr + " datiert. Gebaut wird nach der Planung, in "
          + "aller Regel innerhalb von ein bis zwei Jahren; das Plandatum ist "
          + "damit zugleich das früheste mögliche Baujahr und unter allen "
          + "möglichen das mit der höchsten Heizlast."
          + (gekappt
            ? " Die hinterlegte Gebäudetypologie endet bei " + grenze
              + "; angesetzt ist deshalb ihre jüngste Klasse. Die "
              + "Anforderungen sind seither strenger, der Ansatz liegt also "
              + "auf der sicheren Seite."
            : zweiteQuelleDa
            ? " Die Gebäudetypologie endet bei " + grenze + "; die U-Werte "
              + "kommen für dieses Baujahr aus dem Referenzgebäude des "
              + "Gebäudemodernisierungsgesetzes. Das sind Obergrenzen, ein "
              + "Neubau ist in aller Regel besser gedämmt."
            : ""),
        richtung: "Ein später fertiggestelltes Gebäude ist besser gedämmt; die "
          + "wirkliche Heizlast liegt dann niedriger, nicht höher.",
        alternativ: null,
      };
    }

    /* art === "unklar" */
    return {
      feld: "meta.baujahr", wert: wert, stufe: "offen",
      plandatum_jahr: jahr,
      kurz: "Baujahr " + wert + " als Obergrenze aus dem Plandatum",
      begruendung: "Auf dem Blatt steht kein Baujahr, und es ist auch kein "
        + "Merkmal zu finden, das es als Neubauplanung oder als "
        + "Bestandsunterlage ausweist. Angesetzt ist das Plandatum " + jahr
        + (gekappt
          ? " (gekappt auf " + grenze + ", weiter reicht die Gebäudetypologie "
            + "nicht)" : "")
        + ". Es begrenzt das Baujahr nach OBEN: älter kann das Gebäude sein, "
        + "jünger nicht.",
      richtung: "Ist das Blatt eine Bestandsaufnahme, ist das Gebäude älter "
        + "und die wirkliche Heizlast HÖHER als die hier gerechnete. Diese "
        + "Zahl ist damit die untere Kante.",
      /* Womit die Gegenrechnung zu führen ist, damit „höher" eine Zahl "
         bekommt statt eines Gefühls. Die älteste Klasse der Typologie. */
      alternativ: 1918,
    };
  }

  /* =====================================================================
   * 2  Norm-Außentemperatur ohne Postleitzahl
   * =====================================================================
   * An der Postleitzahl hängt allein das Klima. Zwei Anhaltspunkte kommen
   * in Frage, in dieser Reihenfolge:
   *
   *   1. Der ORT, den die Auslese aus dem Schriftfeld gelesen hat. Auf
   *      Sebastians Blatt steht er: die zweite Seite ist der Bebauungsplan
   *      300 „Springbach Höfe" der Stadt Paderborn, und die Auslese gibt
   *      ort = „Paderborn" zurück. Das ist eine gelesene Angabe, keine
   *      Vermutung.
   *   2. Der STANDORT des Bearbeiters, den das Werkzeug ohnehin dauerhaft
   *      speichert (Paderborn, Kassel, Dortmund). Ein Objekt, das in
   *      Paderborn bearbeitet wird, liegt weit überwiegend in der Gegend
   *      von Paderborn.
   *
   * WIE BELASTBAR IST DAS? Die Norm-Außentemperatur ist nach
   * DIN/TS 12831-1:2020-04 postleitzahlgenau. Innerhalb EINES Ortes streut
   * sie trotzdem, weil sie an der Höhenlage hängt. Gemessen an der
   * hinterlegten Tabelle:
   *
   *     Paderborn   5 Postleitzahlen   -9,6 bis -10,7 °C   Spanne 1,1 K
   *     Dortmund   27 Postleitzahlen   -7,5 bis  -9,1 °C   Spanne 1,6 K
   *     Kassel     12 Postleitzahlen  -10,1 bis -12,4 °C   Spanne 2,3 K
   *
   * Über die ganze Leitregion 33 (Ostwestfalen, rund 40 km) sind es 2,7 K,
   * über die Leitregion 34 sogar 3,1 K. Bei einer Auslegungsdifferenz von
   * rund 30 K sind 1 K etwa 3,3 Prozent Heizlast. Die Ortsannahme kostet in
   * Paderborn also höchstens rund 3,7 Prozent, in Kassel rund 7,7 Prozent —
   * der weitere Umkreis kostet das Doppelte. Deshalb wird der Ort genommen
   * und nicht die Region, und deshalb ist die Angabe der Spanne Pflicht.
   *
   * Gewählt wird die KÄLTESTE Postleitzahl des Ortes. Das ist ein belegter
   * Tabellenwert, kein Zuschlag, und es ist die vorsichtige Richtung: eine zu
   * warm angesetzte Außentemperatur rechnet die Anlage zu klein.
   * ================================================================== */

  /** Alle Postleitzahlen, deren Ortsname genau diesem Ort entspricht. */
  function plzZumOrt(ort, opt) {
    const DK = klimamodul(opt);
    const name = String(ort || "").trim();
    if (!DK || !DK.sucheOrt || name.length < 3) return [];
    const gesucht = name.toLowerCase();
    return (DK.sucheOrt(name, 200) || []).filter(function (x) {
      return String(x.ort || "").split(/[,/]/).some(function (teil) {
        return teil.trim().toLowerCase() === gesucht;
      });
    });
  }

  /** Die Spanne der Norm-Außentemperatur innerhalb eines Ortes. */
  function ortSpanne(ort, opt) {
    const treffer = plzZumOrt(ort, opt);
    if (!treffer.length) return null;
    let kalt = treffer[0], warm = treffer[0];
    treffer.forEach(function (x) {
      if (x.theta_e < kalt.theta_e) kalt = x;
      if (x.theta_e > warm.theta_e) warm = x;
    });
    return {
      ort: String(ort).trim(), anzahl: treffer.length,
      kalt: kalt, warm: warm,
      spanne_k: Math.round((warm.theta_e - kalt.theta_e) * 10) / 10,
    };
  }

  /** Die Annahme zu Klima und Postleitzahl.
   *  @param q {ort, standort_ort}
   *  @return null, wenn kein Anhaltspunkt trägt. */
  function klima(q, opt) {
    const o = q || {};
    const wege = [
      { ort: o.ort, herkunft: "plan" },
      { ort: o.standort_ort, herkunft: "standort" },
    ];
    for (let i = 0; i < wege.length; i++) {
      const w = wege[i];
      if (!String(w.ort || "").trim()) continue;
      const s = ortSpanne(w.ort, opt);
      if (!s) continue;
      const k = s.kalt;
      /* DIE BEGRÜNDUNG MUSS ZUM DATENSTAND PASSEN.
       *
       * Hier stand über dem Standortweg pauschal „Auf dem Plan steht weder
       * Postleitzahl noch Ort." Das ist an zwei Stellen falsch:
       *   - Wenn ein Ort gelesen wurde, der nur nicht in der Klimatabelle
       *     steht, dann steht sehr wohl ein Ort auf dem Plan. Der Satz
       *     bestreitet dann den eigenen Datenstand.
       *   - Am 23.08.2026 an „BV 2-0887 Ziolkowski" gemessen: der Satz stand
       *     im Bericht, während meta.ort = „Paderborn" im Projekt stand,
       *     gelesen vom zweiten Blatt. Die Zahl stimmte zufällig, weil das
       *     Büro in Paderborn sitzt.
       * Der Satz sagt jetzt, was wirklich der Fall ist, und nennt den
       * gelesenen Ort, wenn es einen gibt. */
      const planOrt = String(o.ort || "").trim();
      const woher = w.herkunft === "plan"
        ? "Der Ort „" + s.ort + "“ steht im Schriftfeld des Plans; eine "
          + "Postleitzahl steht dort nicht."
        : (planOrt
          ? "Auf dem Plan steht keine Postleitzahl, und der gelesene Ort "
            + "„" + planOrt + "“ ist in der Klimatabelle nicht zu finden. "
            + "Angesetzt ist deshalb der Standort des Bearbeiters ("
            + s.ort + "), an dem das Objekt bearbeitet wird. Das ist ein "
            + "Ersatz und keine Angabe über das Grundstück."
          : "Auf dem Plan steht weder Postleitzahl noch Ort. Angesetzt ist "
            + "der Standort des Bearbeiters (" + s.ort + "), an dem das "
            + "Objekt bearbeitet wird.");
      return {
        feld: "klima.theta_e", stufe: "abgeleitet",
        herkunft: w.herkunft,
        plz: k.plz, ort: s.ort,
        theta_e: k.theta_e, theta_e_m: k.theta_e_m,
        spanne_k: s.spanne_k, anzahl_plz: s.anzahl,
        von: s.kalt.theta_e, bis: s.warm.theta_e,
        kurz: "Norm-Außentemperatur " + komma(k.theta_e, 1) + " °C angenommen "
          + "(" + s.ort + ", PLZ " + k.plz + ")",
        begruendung: woher + " " + s.ort + " umfasst "
          + s.anzahl + (s.anzahl === 1 ? " Postleitzahl" : " Postleitzahlen")
          + " mit Norm-Außentemperaturen von " + komma(s.kalt.theta_e, 1)
          + " bis " + komma(s.warm.theta_e, 1) + " °C, also einer Spanne von "
          + komma(s.spanne_k, 1) + " K"
          + (s.anzahl === 1 ? "" : ". Angesetzt ist die kälteste davon (PLZ "
              + k.plz + "), weil eine zu warm angesetzte Außentemperatur die "
              + "Anlage zu klein rechnet")
          + ". Bei rund 30 K Auslegungsdifferenz entspricht die Spanne etwa "
          + komma(s.spanne_k / 30 * 100, 1) + " Prozent Heizlast.",
        richtung: "Die wirkliche Norm-Außentemperatur des Grundstücks liegt "
          + "innerhalb dieser Spanne; sie kann bis zu " + komma(s.spanne_k, 1)
          + " K wärmer sein, dann liegt die Heizlast entsprechend niedriger.",
        quelle_text: k.quelle,
      };
    }
    return null;
  }

  /* =====================================================================
   * 3  Selbsttest
   * ================================================================== */
  function selbsttest() {
    const f = [];
    const pruefe = function (bed, text) { if (!bed) f.push(text); };

    /* --- Jahreszahl aus dem Datum --------------------------------------- */
    pruefe(jahrAusDatum("17.05.2022", 2026) === 2022, "17.05.2022 muss 2022 ergeben");
    pruefe(jahrAusDatum("Oktober 2016", 2026) === 2016, "Oktober 2016 muss 2016 ergeben");
    pruefe(jahrAusDatum("Stand 2019, geändert 2022", 2026) === 2022,
      "Von zwei Jahreszahlen muss die spätere gelten");
    pruefe(jahrAusDatum("M 1:100", 2026) === null, "Ein Maßstab ist kein Datum");
    pruefe(jahrAusDatum("Blatt 2 von 5", 2026) === null, "Eine Blattnummer ist kein Datum");
    pruefe(jahrAusDatum("2090", 2026) === null, "Ein Jahr weit in der Zukunft zählt nicht");
    pruefe(jahrAusDatum(null, 2026) === null, "null darf kein Jahr ergeben");

    /* --- Baujahr -------------------------------------------------------- */
    const ohne = baujahr({ plandatum: null }, { typologie: null });
    pruefe(ohne === null, "Ohne Plandatum darf keine Annahme entstehen");

    const neu = baujahr({ plandatum: "17.05.2022", planungsart: "neubau",
      planungsart_beleg: "FUNDAMENTE SIEHE STATIK!", heute: 2026 }, { typologie: null });
    pruefe(neu && neu.wert === 2022, "Neubau 2022 muss Baujahr 2022 ergeben");
    pruefe(neu && neu.stufe === "abgeleitet", "Neubau muss die Stufe abgeleitet tragen");
    pruefe(neu && neu.begruendung.indexOf("FUNDAMENTE SIEHE STATIK!") >= 0,
      "Der Beleg vom Blatt muss in der Begründung stehen");

    const best = baujahr({ plandatum: "17.05.2022", planungsart: "bestand",
      planungsart_beleg: "Aufmaß Bestand", heute: 2026 }, { typologie: null });
    pruefe(best && best.wert === null,
      "Bei einer Bestandsunterlage darf aus dem Plandatum KEIN Baujahr werden");
    pruefe(best && best.stufe === "nicht_moeglich",
      "Die Bestandsunterlage muss als nicht ableitbar gemeldet werden");

    /* --- Merkmal aus dem Blattnamen ------------------------------------- */
    const pText = planungsartAusText(["Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf"]);
    pruefe(pText.art === "neubau", "„Werkvertrag“ im Blattnamen muss Neubau ergeben");
    pruefe(pText.beleg && pText.beleg.indexOf("Werkvertrag") >= 0,
      "Der Beleg muss den Fundort wörtlich nennen");
    pruefe(planungsartAusText(["Aufmaß Bestand Erdgeschoss"]).art === "bestand",
      "„Aufmaß Bestand“ muss Bestand ergeben");
    pruefe(planungsartAusText(["Neubau Anbau an Bestandsgebäude"]).art === "unklar",
      "Merkmale aus beiden Listen müssen unklar bleiben");
    pruefe(planungsartAusText(["Grundriss EG", null, ""]).art === "unklar",
      "Ohne Merkmal muss unklar herauskommen");
    pruefe(planungsartAusText([]).art === "unklar", "Ohne Text muss unklar herauskommen");
    const ausName = baujahr({ plandatum: "17.05.2022", planungsart: "unklar",
      texte: ["Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf"], heute: 2026 },
      { typologie: null });
    pruefe(ausName && ausName.stufe === "abgeleitet",
      "Ein Merkmal im Blattnamen muss die Annahme tragen");

    const unk = baujahr({ plandatum: "17.05.2022", planungsart: "unklar", heute: 2026 },
      { typologie: null });
    pruefe(unk && unk.wert === 2022 && unk.stufe === "offen",
      "Ohne Merkmal muss das Plandatum als Obergrenze gelten");
    pruefe(unk && /HÖHER/.test(unk.richtung),
      "Die Richtung des möglichen Fehlers muss im Klartext dastehen");
    pruefe(unk && unk.alternativ === 1918,
      "Für die Gegenrechnung muss ein Alternativbaujahr genannt sein");

    /* KAPPEN NUR NOCH IM RÜCKFALL. Kennt das Typologiemodul die zweite
       Quelle (Referenzgebäude ab 2023) nicht, bleibt es beim alten
       Verhalten; kennt es sie, steht das Plandatum unverändert da. Beides
       ist geprüft, sonst kippt die eine Fassung die andere still um. */
    const jungAlt = baujahr({ plandatum: "01.03.2025", planungsart: "neubau", heute: 2026 },
      { typologie: { GELTUNG_BIS: 2022 } });
    pruefe(jungAlt && jungAlt.wert === 2022,
      "Ohne zweite Quelle muss auf die jüngste Klasse gekappt werden");
    pruefe(jungAlt && jungAlt.plandatum_jahr === 2025,
      "Das gelesene Plandatum muss trotzdem erhalten bleiben");
    const jung = baujahr({ plandatum: "01.03.2025", planungsart: "neubau", heute: 2026 },
      { typologie: { GELTUNG_BIS: 2022, NEUBAU: { ab: 2023 } } });
    pruefe(jung && jung.wert === 2025,
      "Mit zweiter Quelle darf das Baujahr nicht mehr gekappt werden, ist: "
        + (jung && jung.wert));
    pruefe(jung && /Referenzgebäude/.test(jung.begruendung),
      "Die Begründung muss sagen, woher die U-Werte dann kommen");
    /* Die Grenze bleibt eine Grenze: 2022 kommt weiter aus der Typologie. */
    const knapp = baujahr({ plandatum: "01.03.2022", planungsart: "neubau", heute: 2026 },
      { typologie: { GELTUNG_BIS: 2022, NEUBAU: { ab: 2023 } } });
    pruefe(knapp && knapp.wert === 2022 && !/Referenzgebäude/.test(knapp.begruendung),
      "Baujahr 2022 bleibt Sache der Typologie");

    /* --- Klima ---------------------------------------------------------- */
    const DK = (typeof window !== "undefined" && window.DATEN_KLIMA) || null;
    if (DK && DK.sucheOrt) {
      const pb = ortSpanne("Paderborn");
      pruefe(pb && pb.anzahl === 5, "Paderborn muss 5 Postleitzahlen haben, hat "
        + (pb ? pb.anzahl : "keine"));
      pruefe(pb && Math.abs(pb.spanne_k - 1.1) < 0.001,
        "Die Spanne in Paderborn muss 1,1 K sein, ist " + (pb ? pb.spanne_k : "-"));
      pruefe(pb && pb.kalt.plz === "33100" && pb.kalt.theta_e === -10.7,
        "Die kälteste Paderborner PLZ muss 33100 mit -10,7 Grad C sein");

      const kPlan = klima({ ort: "Paderborn", standort_ort: "Kassel" });
      pruefe(kPlan && kPlan.herkunft === "plan",
        "Der gelesene Ort hat Vorrang vor dem Standort");
      pruefe(kPlan && kPlan.theta_e === -10.7,
        "Angesetzt werden muss die kälteste PLZ des Ortes");
      pruefe(kPlan && kPlan.begruendung.indexOf("1,1 K") >= 0,
        "Die Spanne muss in der Begründung stehen");

      const kSt = klima({ ort: null, standort_ort: "Kassel" });
      pruefe(kSt && kSt.herkunft === "standort" && kSt.theta_e === -12.4,
        "Ohne Ort muss der Standort greifen, mit seiner kältesten PLZ");

      pruefe(klima({ ort: "Nirgendwo im Nichts", standort_ort: null }) === null,
        "Ein unbekannter Ort darf keine Annahme erzeugen");
      pruefe(klima({}) === null, "Ohne jeden Anhaltspunkt darf nichts entstehen");

      /* KEINE BEGRÜNDUNG, DIE DEM EIGENEN DATENSTAND WIDERSPRICHT.
         Der Satz „Auf dem Plan steht weder Postleitzahl noch Ort" darf nur
         fallen, wenn wirklich kein Ort gelesen wurde. Steht einer da, der
         nur nicht in der Tabelle ist, muss die Begründung genau das sagen
         und ihn nennen. */
      pruefe(kSt && kSt.begruendung.indexOf("weder Postleitzahl noch Ort") >= 0,
        "Ohne gelesenen Ort darf der Satz „weder Postleitzahl noch Ort“ stehen");
      const kFremd = klima({ ort: "Nirgendwo im Nichts", standort_ort: "Kassel" });
      pruefe(kFremd && kFremd.herkunft === "standort",
        "Ein nicht auffindbarer Ort muss auf den Standort zurückfallen");
      pruefe(kFremd && kFremd.begruendung.indexOf("weder Postleitzahl noch Ort") < 0,
        "Mit gelesenem Ort darf die Begründung NICHT behaupten, es stehe kein "
        + "Ort auf dem Plan");
      pruefe(kFremd && kFremd.begruendung.indexOf("Nirgendwo im Nichts") >= 0,
        "Die Begründung muss den gelesenen Ort nennen, den sie verwirft");
    }

    return { ok: f.length === 0, fehler: f, anzahl: 39 };
  }

  const KERN_ANNAHMEN = {
    jahrAusDatum: jahrAusDatum,
    planungsartAusText: planungsartAusText,
    baujahr: baujahr,
    klima: klima,
    ortSpanne: ortSpanne,
    selbsttest: selbsttest,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = KERN_ANNAHMEN;
  if (typeof window !== "undefined") window.KERN_ANNAHMEN = KERN_ANNAHMEN;
})();
