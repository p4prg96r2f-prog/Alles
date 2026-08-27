/* ===========================================================================
 * modul_pdf.js — Pläne in jedem üblichen Format annehmen
 * ===========================================================================
 * Ersetzt die Absage in modul_plan.js: PDF wird jetzt gelesen, nicht abgewiesen.
 *
 * Warum das mehr ist als „PDF rastern":
 * Bei einem Vektor-PDF steht die Geometrie exakt im Dokument. Maßzahlen,
 * Raumnamen und Linienzüge kommen millimetergenau heraus, ohne dass jemand
 * etwas aus Bildpunkten schätzt. Die Messung in SPEZIFIKATION_FORMATE.md § 7.1
 * hat für ein gezeichnetes Außenmaß von 12,49 × 8,74 m eine Abweichung von
 * null ergeben. Darauf baut dieses Modul auf:
 *
 *   Textlayer  ->  Maßzahlen mit Lage, Raumstempel, Maßstabsvermerk
 *   Pfade      ->  Linienzüge als Koordinaten, daraus Strecken und Flächen
 *   Blattmaß   ->  Seitengröße in Millimetern ist bekannt
 *
 * Daraus folgt der Maßstab auf ZWEI voneinander unabhängigen Wegen:
 *   Weg 1  Maßstabsvermerk im Blattkopf („M 1:100")
 *   Weg 2  gelesene Maßzahl geteilt durch die Länge der zugehörigen Linie
 * Die Wege teilen keine gemeinsame Annahme. Stimmen sie überein, ist der
 * Maßstab abgesichert; weichen sie ab, ist das ein echter Befund und keine
 * Bestätigung derselben Rechnung. Genau die Sorte Gegenprobe, die
 * kern_massstabsprobe.js verlangt.
 *
 * Aufbau der Datei:
 *   Teil A  reine Umrechnungen und Regeln, ohne pdf.js, ohne DOM, testbar
 *   Teil B  Textauswertung (Maßzahl, Vermerk, Raumstempel, Blattkopf)
 *   Teil C  Pfadauswertung (Linienzüge, Strecken, Rechtecke, Flächen)
 *   Teil D  Maßstabsbestimmung aus beiden Wegen
 *   Teil E  Bibliothek einrichten, Datei öffnen, Seiten rendern
 *   Teil F  selbsttest
 *
 * Teil A bis D laufen in Node ohne jede Abhängigkeit. Teil E braucht pdf.js.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.MODUL_PDF = M;
})(this, function () {

  /* =========================================================================
   * Teil A — Konstanten und reine Umrechnungen
   * =======================================================================*/

  const PT_JE_ZOLL = 72;            // PDF-Punkt, Definition
  const MM_JE_ZOLL = 25.4;          // Zoll, Definition

  /* Bildverarbeitung der Schnittstelle. Quelle: SPEZIFIKATION_FORMATE.md § 5.3,
   * dort belegt mit platform.claude.com/docs/en/build-with-claude/vision:
   * jedes Bild wird in Bildfelder von 28x28 Bildpunkten zerlegt, die
   * hochauflösende Stufe lässt 4.784 Bildtoken zu. */
  const BILDFELD_PX = 28;
  const TOKEN_GRENZE = 4784;

  /* Nutzbares Quadrat und Überlappung. Quelle: SPEZIFIKATION_FORMATE.md § 5.5.
   * 1932 px sind 69x69 Bildfelder = 4.761 Token, knapp unter der Grenze. */
  const KACHEL_PX = 1932;
  const UEBERLAPPUNG_PX = 120;

  /* Zielgröße für die kleinste Schrift und Deckel für die Renderauflösung.
   * Quelle: SPEZIFIKATION_FORMATE.md § 5.2. Bei 28 px Versalhöhe bekommt jede
   * Textzeile mindestens eine eigene Feldzeile. */
  const ZIEL_PX_VERSAL = 28;
  const DPI_DECKEL = 356;

  /* Verhältnis Versalhöhe zu Schriftgröße. Quelle: SPEZIFIKATION_FORMATE.md
   * § 5.1, dort an Helvetica gemessen (7,91 pt ergaben die eingezeichneten
   * 2,00 mm). Deckt sich mit der Adobe-Metrik für Helvetica, CapHeight 718. */
  const VERSAL_FAKTOR = 0.717;

  /* Preis je Million Eingabetoken in USD für claude-sonnet-5.
   * Quelle: SPEZIFIKATION_FORMATE.md § 5.5, dort belegt mit
   * platform.claude.com/docs/en/about-claude/models/overview. */
  const PREIS_JE_MIO_TOKEN_USD = 2;

  /* Befehlscodes im flachen Pfadfeld von pdf.js. Nicht geraten, sondern aus
   * dem Quelltext der eingebundenen Fassung: pdfjs-dist 6.2.108,
   * legacy/build/pdf.mjs Z. 6366 (const DrawOPS) und Z. 7833
   * (makePathFromDrawOPS, dort die Zahl der Folgeargumente). */
  const ZEICHENBEFEHL = {
    hin: 0,        // moveTo            2 Zahlen
    linie: 1,      // lineTo            2 Zahlen
    kurve: 2,      // curveTo           6 Zahlen
    kurve2: 3,     // quadraticCurveTo  4 Zahlen
    zu: 4,          // closePath         0 Zahlen
  };
  const BEFEHL_ARGUMENTE = { 0: 2, 1: 2, 2: 6, 3: 4, 4: 0 };

  /* Ab wie vielen Pfaden eine Seite als Zeichnung gilt.
   * ANNAHME. Die Messreihe in SPEZIFIKATION_FORMATE.md § 6.1 zeigt 12 Pfade
   * auf der Vektorseite und 0 auf Scan- und Textseiten; der echte A1-Plan hat
   * 6.463. Zwischen 0 und 12 liegt kein gemessener Fall, 8 ist gesetzt und
   * nicht belegt. Ein Blattrahmen allein soll die Seite nicht zur Zeichnung
   * machen. */
  const MIN_PFADE_ZEICHNUNG = 8;

  /* Übliche Maßstäbe im Hochbau. Dienen nur als Fangraster für die
   * Gegenprobe, nie als Ersatz für einen gelesenen Wert. */
  const MASSSTAEBE = [10, 20, 25, 50, 100, 200, 250, 500, 1000];

  const ptZuMm = (pt) => pt * MM_JE_ZOLL / PT_JE_ZOLL;
  const mmZuPt = (mm) => mm * PT_JE_ZOLL / MM_JE_ZOLL;
  const dpiZuSkala = (dpi) => dpi / PT_JE_ZOLL;
  const skalaZuDpi = (skala) => skala * PT_JE_ZOLL;

  /** Versalhöhe in Millimetern aus der Schriftgröße in Punkt. */
  function versalhoeheMm(groesse_pt, faktor) {
    const f = (typeof faktor === "number" && faktor > 0) ? faktor : VERSAL_FAKTOR;
    return ptZuMm(groesse_pt * f);
  }

  /** Bildtoken eines Bildes nach der 28er-Feldregel. */
  function bildtoken(breite_px, hoehe_px) {
    return Math.ceil(breite_px / BILDFELD_PX) * Math.ceil(hoehe_px / BILDFELD_PX);
  }

  /**
   * Renderauflösung festlegen.
   * Zwei Bedingungen, beide aus SPEZIFIKATION_FORMATE.md § 5.2:
   *   - die kleinste Schrift soll ZIEL_PX_VERSAL Bildpunkte hoch werden
   *   - höher rendern als der Scan aufgelöst ist, bringt nichts
   * Gedeckelt auf DPI_DECKEL.
   */
  function renderauflösung(o) {
    o = o || {};
    let dpi = DPI_DECKEL;
    let grund = "Deckel " + DPI_DECKEL + " dpi";
    if (typeof o.kleinste_versalhoehe_mm === "number" && o.kleinste_versalhoehe_mm > 0) {
      const noetig = ZIEL_PX_VERSAL * MM_JE_ZOLL / o.kleinste_versalhoehe_mm;
      if (noetig < dpi) {
        dpi = noetig;
        grund = "kleinste Schrift " + o.kleinste_versalhoehe_mm.toFixed(2) + " mm";
      }
    }
    if (typeof o.dpi_nativ === "number" && o.dpi_nativ > 0 && o.dpi_nativ < dpi) {
      dpi = o.dpi_nativ;
      grund = "native Auflösung des Scans " + Math.round(o.dpi_nativ) + " dpi";
    }
    return { dpi: dpi, skala: dpiZuSkala(dpi), grund: grund };
  }

  /**
   * Kachelraster für ein gerendertes Blatt.
   * Reproduziert die drei gemessenen Fälle aus SPEZIFIKATION_FORMATE.md § 5.5
   * (A3 bei 254 dpi = 6 Kacheln, A3 bei 356 dpi = 12, A1 bei 254 dpi = 20).
   */
  function kachelplan(o) {
    o = o || {};
    const B = Math.max(1, Math.round(o.breite_px || 0));
    const H = Math.max(1, Math.round(o.hoehe_px || 0));
    const K = Math.max(1, Math.round(o.kachel_px || KACHEL_PX));
    const U = Math.max(0, Math.round(
      o.ueberlappung_px === undefined ? UEBERLAPPUNG_PX : o.ueberlappung_px));
    const schritt = Math.max(1, K - U);
    const anzahl = (laenge) => laenge <= K ? 1 : Math.ceil((laenge - K) / schritt) + 1;
    const spalten = anzahl(B), zeilen = anzahl(H);
    const kacheln = [];
    for (let z = 0; z < zeilen; z++) {
      for (let s = 0; s < spalten; s++) {
        const x = Math.min(s * schritt, Math.max(0, B - K));
        const y = Math.min(z * schritt, Math.max(0, H - K));
        kacheln.push({
          nr: kacheln.length + 1, spalte: s + 1, zeile: z + 1,
          x: x, y: y,
          breite: Math.min(K, B - x), hoehe: Math.min(K, H - y),
        });
      }
    }
    const token = kacheln.reduce((s, k) => s + bildtoken(k.breite, k.hoehe), 0);
    return {
      spalten: spalten, zeilen: zeilen, anzahl: kacheln.length,
      kacheln: kacheln, bildtoken: token,
      kosten_usd: token / 1e6 * PREIS_JE_MIO_TOKEN_USD,
    };
  }

  /**
   * Native Auflösung eines eingebetteten Scans.
   * Aus den Bildaufrufen: Bildpunkte geteilt durch die gezeichnete Breite.
   * Der Weg über die Transformationsmatrix trifft laut
   * SPEZIFIKATION_FORMATE.md § 5.2 die echten 300 dpi genau, die grobe
   * Flächenwurzel nicht.
   */
  function nativeAufloesung(bilder) {
    if (!bilder || !bilder.length) return null;
    let beste = null;
    for (const b of bilder) {
      if (!b || !(b.breite_px > 0) || !(b.breite_pt > 0)) continue;
      const dpi = b.breite_px / (b.breite_pt / PT_JE_ZOLL);
      if (!isFinite(dpi) || dpi <= 0) continue;
      const flaeche = (b.breite_px || 0) * (b.hoehe_px || 0);
      if (!beste || flaeche > beste.flaeche) beste = { dpi: dpi, flaeche: flaeche };
    }
    return beste ? beste.dpi : null;
  }

  /**
   * Punkt aus dem PDF-Koordinatensystem in die Ansicht umrechnen.
   * PDF zählt von unten links, die Ansicht von oben links, und /Rotate dreht.
   * Die Formeln folgen der Viewport-Matrix von pdf.js; der Selbsttest hält sie
   * für alle vier Drehungen gegen pdf.js' eigenes convertToViewportPoint.
   */
  function nachAnsicht(x, y, o) {
    o = o || {};
    const s = o.skala === undefined ? 1 : o.skala;
    const x0 = o.x0 || 0, y0 = o.y0 || 0;
    const x1 = o.x1 === undefined ? (o.breite_pt || 0) : o.x1;
    const y1 = o.y1 === undefined ? (o.hoehe_pt || 0) : o.y1;
    const r = ((o.drehung || 0) % 360 + 360) % 360;
    switch (r) {
      case 90:  return { x: s * (y - y0),  y: s * (x - x0) };
      case 180: return { x: s * (x1 - x),  y: s * (y - y0) };
      case 270: return { x: s * (y1 - y),  y: s * (x1 - x) };
      default:  return { x: s * (x - x0),  y: s * (y1 - y) };
    }
  }

  /* =========================================================================
   * Teil B — Textauswertung
   * =======================================================================*/

  /**
   * Maßstabsvermerk aus einem Text lesen: „M 1:100", „1:50", „Maßstab 1:100".
   * Gibt den Nenner zurück oder null.
   */
  function massstabAusVermerk(text) {
    if (!text) return null;
    const t = String(text).replace(/\s+/g, " ");
    const m = t.match(/(?:^|[^\d])1\s*[:\/]\s*(\d{1,4})(?!\d)/);
    if (!m) return null;
    const nenner = parseInt(m[1], 10);
    if (!(nenner >= 5 && nenner <= 5000)) return null;
    return nenner;
  }

  /**
   * Eine Maßzahl aus einem Textstück lesen.
   * Bauzeichnungen schreiben Längen in mehreren Formen. Sicher ist nur, was
   * eine Einheit trägt oder der CAD-Schreibweise mit zwei Nachkommastellen
   * folgt. Alles andere wird als unsicher zurückgegeben und darf den Maßstab
   * nicht allein tragen.
   */
  function masszahlLesen(text) {
    if (text === null || text === undefined) return null;
    const roh = String(text).trim();
    if (!roh) return null;

    // mit ausdrücklicher Einheit
    let m = roh.match(/^([0-9]*[.,]?[0-9]+)\s*(mm|cm|dm|m)$/i);
    if (m) {
      const wert = parseFloat(m[1].replace(",", "."));
      const faktor = { mm: 0.001, cm: 0.01, dm: 0.1, m: 1 }[m[2].toLowerCase()];
      if (isFinite(wert)) {
        return { roh: roh, wert_m: wert * faktor, sicher: true, form: "mit Einheit" };
      }
    }
    // CAD-Schreibweise: zwei Nachkommastellen, Meter, führende Null darf fehlen
    m = roh.match(/^([0-9]{0,2})[.,]([0-9]{2})$/);
    if (m) {
      const wert = parseFloat((m[1] || "0") + "." + m[2]);
      if (isFinite(wert) && wert > 0) {
        return { roh: roh, wert_m: wert, sicher: true, form: "Meter mit zwei Nachkommastellen" };
      }
    }
    // drei Nachkommastellen, ebenfalls Meter
    m = roh.match(/^([0-9]{1,2})[.,]([0-9]{3})$/);
    if (m) {
      const wert = parseFloat(m[1] + "." + m[2]);
      if (isFinite(wert) && wert > 0) {
        return { roh: roh, wert_m: wert, sicher: true, form: "Meter mit drei Nachkommastellen" };
      }
    }
    // reine ganze Zahl: kann Zentimeter sein (25, 30, 80) oder etwas ganz
    // anderes (Raumnummer, Blattnummer). Nie sicher.
    m = roh.match(/^([0-9]{1,4})$/);
    if (m) {
      const zahl = parseInt(m[1], 10);
      if (zahl >= 5 && zahl <= 2000) {
        return { roh: roh, wert_m: zahl / 100, sicher: false,
                 form: "ganze Zahl, als Zentimeter gedeutet" };
      }
    }
    return null;
  }

  /**
   * Raumstempel lesen: Fläche und Umfang, wie sie in CAD-Plänen stehen.
   * Beispiel aus SPEZIFIKATION_FORMATE.md § 5.4:
   *   „Masch. R. Aufzug A=3,42m² U=7,70m"
   */
  /** Eine Zahl in deutscher Schreibweise deuten.
   *
   *  Der Punkt ist in Deutschland der Tausendertrenner, nicht das Komma.
   *  Gemessen am Blatt „1.00 BA_2 Lageplan.pdf": dort steht „GRUNDSTÜCKE
   *  GESAMT ca. 4.289m²". Als Dezimalpunkt gelesen sind das 4,289 m² statt
   *  4.289 m² — der Faktor 1000. Genau drei Ziffern hinter einem Punkt sind
   *  bei einer Fläche nie Nachkommastellen; eine Fläche auf den
   *  Quadratmillimeter genau anzuschreiben kommt nicht vor. */
  function zahlDeutsch(roh) {
    let t = String(roh == null ? "" : roh).trim();
    if (!t) return null;
    if (/,/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^[0-9]{1,3}(\.[0-9]{3})+$/.test(t)) t = t.replace(/\./g, "");
    const z = parseFloat(t);
    return isFinite(z) ? z : null;
  }

  function raumstempelLesen(text) {
    if (!text) return null;
    const t = String(text).replace(/\s+/g, " ").trim();
    const erg = { roh: t, name: null, A_m2: null, U_m: null };

    let m = t.match(/(?:^|[^A-Za-z])A\s*[=:]\s*([0-9]+(?:[.,][0-9]+)*)\s*m[²2]/i);
    if (m) erg.A_m2 = zahlDeutsch(m[1]);
    if (erg.A_m2 === null) {
      m = t.match(/([0-9]+(?:[.,][0-9]+)+)\s*m[²2](?![a-zA-Z])/);
      if (m) erg.A_m2 = zahlDeutsch(m[1]);
    }
    m = t.match(/(?:^|[^A-Za-z])U\s*[=:]\s*([0-9]+(?:[.,][0-9]+)*)\s*m(?![²2a-zA-Z])/i);
    if (m) erg.U_m = zahlDeutsch(m[1]);

    let name = t.split(/\s+A\s*[=:]|\s+U\s*[=:]|[0-9]+[.,][0-9]+\s*m[²2]/)[0]
      .replace(/[\s=:,;.-]+$/, "").trim();
    /* EINE FLÄCHENBESCHRIFTUNG IST KEIN RAUMNAME.
       „A=" wurde oben schon abgeschnitten, „NGF:" bisher nicht: aus
       „NGF: 6,76 m²" wurde der Raumname „NGF". Der greift dann in
       SAMMELSTEMPEL, und der Block fliegt raus.
       GEMESSEN am 27.08.2026 am Blatt „Hasenberg_10_Grundrisse_290425.pdf":
       dort steht über JEDER Fläche der echte Raumname als eigene Zeile
       („Empfang", darunter „NGF: 6,76 m²"). Alle 20 Räume gingen so verloren.
       Bleibt nach dem Abschneiden nichts übrig, sucht raumbloeckeLesen die
       Zeile darüber -- genau dafür ist die Suche gebaut.
       Ein echter Summenstempel verliert dadurch nichts: steht über ihm
       „Wohnfläche gesamt", greift SAMMELSTEMPEL an dieser Zeile; steht gar
       nichts darüber, bleibt der Name leer und der Block wird ohnehin
       verworfen (app.js, stempelraeumeDesBlatts). */
    const FLAECHENBESCHRIFTUNG = /^(ngf|nrf|nf|bgf|wfl|wf|fl|fläche|flaeche|a)$/i;
    if (FLAECHENBESCHRIFTUNG.test(name)) name = "";
    // Mindestens zwei Buchstaben, sonst ist es kein Raumname, sondern der
    // Rest einer Formel wie „A=".
    if (/[A-Za-zÄÖÜäöüß]{2,}/.test(name)) erg.name = name;

    if (erg.A_m2 === null && erg.U_m === null && !erg.name) return null;
    return erg;
  }

  /**
   * Blattkopf deuten: Geschoss, Maßstab, Blattnummer.
   * Kostet keinen Modellaufruf, siehe SPEZIFIKATION_FORMATE.md § 6.2.
   */
  const GESCHOSSWORTE = [
    { schluessel: "kg", muster: /kellergeschoss|untergeschoss|\bKG\b|\bUG\b/i, name: "Kellergeschoss" },
    { schluessel: "eg", muster: /erdgeschoss|\bEG\b/i, name: "Erdgeschoss" },
    { schluessel: "dg", muster: /dachgeschoss|\bDG\b/i, name: "Dachgeschoss" },
    { schluessel: "sp", muster: /spitzboden|dachboden/i, name: "Spitzboden" },
    { schluessel: "og", muster: /obergeschoss|\b(\d)\.\s?OG\b|\bOG\b/i, name: "Obergeschoss" },
  ];

  /* =========================================================================
   * Raumbeschriftungen als Block lesen
   * =========================================================================
   * Der Befund, der das nötig macht: Auf einer Vektorzeichnung steht die
   * Raumfläche als Text im Dokument, also auf zwei Nachkommastellen genau.
   * Trotzdem wurde sie bisher nirgends abgeholt. `raumstempelLesen` findet
   * zwar die Zahl, aber ohne Namen — denn CAD setzt Name und Fläche als
   * ZWEI Textstücke ab, untereinander:
   *
   *     680,2 | 450,3 | 10,0 pt | "Studio"          <- Name
   *     680,2 | 441,8 |  8,0 pt | "45,96 m²"        <- Fläche darunter
   *
   * Gemessen am Blatt „260514 - Dumach 1 - Grundrisse M 1.100.pdf" (A1,
   * 25 Räume auf drei Geschossen): 25 Flächenstücke, 25 Namen, alle als
   * eigenes Stück. Ohne Zusammenführung ist keines davon zu gebrauchen.
   *
   * Zusammengeführt wird über die LAGE, nicht über die Nähe zu irgendeinem
   * Namen: Name und Fläche stehen im selben Beschriftungsblock, also linksbündig
   * (gleiche Laufkoordinate) und höchstens eine Zeile auseinander. Ein
   * Geschossstempel oder eine Wohnflächensumme steht in keinem solchen Block
   * und wird deshalb keinem Raum zugeschlagen.
   *
   * Gedrehte Beschriftung: auf Blättern mit /Rotate laufen die Zeilen nicht
   * waagerecht. Deshalb wird nicht in x und y gerechnet, sondern in der
   * Laufrichtung des Textes (u) und quer dazu (v). Am Blatt
   * „25_Maas_Langner_VE1_OG.pdf" (Drehung 90) liegen Name und Fläche bei
   * gleichem y und 11,2 pt Abstand in x — in u/v gerechnet ist das derselbe
   * Block wie oben.
   * ======================================================================= */

  /** Laufrichtung (u) und Querrichtung (v) eines Textstücks. v wächst nach
   *  oben, eine Folgezeile hat also ein kleineres v. */
  function textAchsen(s) {
    const w = Number(s && s.winkel_rad) || 0;
    const c = Math.cos(w), si = Math.sin(w);
    const x = Number(s && s.x_pt) || 0, y = Number(s && s.y_pt) || 0;
    return { u: x * c + y * si, v: -x * si + y * c, winkel: w };
  }

  /* Was keine Raumbeschriftung ist, sondern eine Summe über mehrere Räume.
     Solche Stempel tragen dieselbe Schreibweise „123,45 m²" und würden sonst
     als Raum ins Raumbuch wandern. */
  const SAMMELSTEMPEL = /(wohnfl|nutzfl|grundfl|geschossfl|verkehrsfl|nettoraumfl|brutto|\bbgf\b|\bngf\b|\bwfl\b|summe|gesamt|insgesamt|zusammen)/i;

  /** Ein Textstück, das nur eine Fläche trägt und keinen Namen. */
  function istReineFlaeche(text) {
    const r = raumstempelLesen(text);
    return !!(r && r.A_m2 !== null && !r.name);
  }

  /**
   * Raumbeschriftungen eines Blattes als Block lesen.
   *
   * Liefert je Block: Name (aus bis zu drei Zeilen über der Fläche), Fläche
   * in m², Umfang in m falls angeschrieben, die Lage des Flächenstücks und
   * die Angabe, ob es sich um eine Summe handelt.
   *
   * Genauigkeit: die Fläche ist GELESEN, nicht gemessen. Sie hängt an keinem
   * Maßstab und an keinem Bildpunkt.
   */
  function raumbloeckeLesen(stuecke) {
    const alle = (stuecke || []).filter(function (s) { return s && s.text; });
    const achsen = alle.map(textAchsen);
    const bloecke = [];

    for (let i = 0; i < alle.length; i++) {
      const s = alle[i];
      const rs = raumstempelLesen(s.text);
      if (!rs || rs.A_m2 === null) continue;

      const zeilen = [];
      if (rs.name) {
        // Name und Fläche im selben Stück — der Block ist schon vollständig.
        zeilen.push(rs.name);
      } else {
        /* Nach oben suchen: höchstens drei Zeilen, jede höchstens 2,2
           Zeilenhöhen über der vorigen und in derselben Laufkoordinate. */
        let bezug = i;
        for (let n = 0; n < 3; n++) {
          const a = achsen[bezug], b = alle[bezug];
          const hoehe = Math.max(Number(b.groesse_pt) || 0, 4);
          const tolU = Math.max(2.5, 0.5 * Math.max(Number(b.breite_pt) || 0, 8));
          let best = -1, bestDv = Infinity;
          for (let j = 0; j < alle.length; j++) {
            if (j === bezug) continue;
            const k = alle[j], ak = achsen[j];
            if (Math.abs(ak.winkel - a.winkel) > 0.05) continue;
            const dv = ak.v - a.v;
            if (dv <= 0.3 * hoehe || dv > 2.2 * hoehe) continue;
            if (Math.abs(ak.u - a.u) > tolU + 0.5 * (Number(k.breite_pt) || 0)) continue;
            /* Nur Schrift derselben Groessenordnung gehoert zum Block.
               Gemessen am Blatt „25_Maas_Langner_VE1_OG.pdf": ueber dem
               Raumnamen „Galerie" (8,4 pt) steht die Bauteilbeschriftung
               „Gelaender" (6,0 pt) knapp innerhalb des Zeilenabstands. Ohne
               diese Schranke hiess der Raum „Gelaender Galerie". */
            const hk = Number(k.groesse_pt) || 0;
            if (!(hk >= 0.75 * hoehe && hk <= 1.6 * hoehe)) continue;
            if (dv < bestDv) { bestDv = dv; best = j; }
          }
          if (best < 0) break;
          const t = String(alle[best].text).trim();
          // Eine zweite Fläche oder eine nackte Maßzahl beendet den Block.
          if (istReineFlaeche(t)) break;
          if (!/[A-Za-zÄÖÜäöüß]{2,}/.test(t)) break;
          zeilen.unshift(t);
          bezug = best;
        }
      }

      const name = zeilen.join(" ").replace(/\s+/g, " ").replace(/[\s\/,;.-]+$/, "").trim();
      bloecke.push({
        name: name || null,
        namenzeilen: zeilen.slice(),
        A_m2: rs.A_m2,
        U_m: rs.U_m,
        text: String(s.text).trim(),
        x_pt: Number(s.x_pt) || 0, y_pt: Number(s.y_pt) || 0,
        winkel_rad: Number(s.winkel_rad) || 0,
        sammel: !!(name && SAMMELSTEMPEL.test(name)),
        quelle: "Textstand der Zeichnung",
      });
    }
    return bloecke;
  }

  /**
   * Geschossüberschriften mit ihrer Lage.
   *
   * Warum mit Lage: Auf dem A1-Blatt „Dumach 1" liegen drei Grundrisse
   * nebeneinander auf EINEM Bogen, überschrieben mit „Grundriss EG",
   * „Grundriss OG" und „Grundriss DG". `blattkopfLesen` liefert genau ein
   * Geschoss je Blatt; alle 25 Räume kämen damit in dasselbe Geschoss.
   * Mit den Lagen lässt sich jeder Raumstempel dem nächstgelegenen
   * Geschosstitel zuordnen.
   *
   * Ein Titel ist nur, was deutlich größer gesetzt ist als der Grundtext des
   * Blattes; sonst würde jede Maßangabe „1.OG" zum Geschosstitel.
   */
  function geschosstitelLesen(stuecke) {
    const alle = (stuecke || []).filter(function (s) {
      return s && s.text && /[A-Za-zÄÖÜäöüß]{2,}/.test(String(s.text));
    });
    if (!alle.length) return [];
    const groessen = alle.map(function (s) { return Number(s.groesse_pt) || 0; })
      .filter(function (g) { return g > 0; }).sort(function (a, b) { return a - b; });
    const mittel = groessen.length ? groessen[Math.floor(groessen.length / 2)] : 0;
    const raus = [];
    for (const s of alle) {
      const t = String(s.text);
      if ((Number(s.groesse_pt) || 0) < 1.2 * mittel) continue;
      for (const g of GESCHOSSWORTE) {
        if (!g.muster.test(t)) continue;
        raus.push({ kuerzel: g.schluessel, name: g.name, text: t.trim(),
                    x_pt: Number(s.x_pt) || 0, y_pt: Number(s.y_pt) || 0,
                    groesse_pt: Number(s.groesse_pt) || 0 });
        break;
      }
    }
    return raus;
  }

  /** Den nächstgelegenen Geschosstitel zu einer Lage bestimmen. */
  function geschossZuLage(titel, x_pt, y_pt) {
    let best = null, bestD = Infinity;
    for (const t of (titel || [])) {
      const d = Math.hypot(t.x_pt - x_pt, t.y_pt - y_pt);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best ? { kuerzel: best.kuerzel, name: best.name, titel: best.text,
                    abstand_pt: bestD } : null;
  }

  /**
   * Textstücke, die auf derselben Zeile nebeneinander stehen, zu Zeilen
   * zusammenfassen.
   *
   * Warum das nötig ist: Viele CAD-Ausgaben setzen jeden Textabschnitt einzeln
   * ab. Aus "Maßstab 1 : 100" werden dann vier Stücke — "Maßstab", "1", ":",
   * "100" — jedes für sich ohne Aussage. Wer nur die einzelnen Stücke prüft,
   * findet den Vermerk nie und meldet "Maßstab unbekannt", obwohl er groß im
   * Schriftfeld steht. Genau das ist bei einem der Prüfpläne passiert.
   *
   * Gleiche Zeile heißt: die Grundlinien liegen weniger als eine halbe
   * Schriftgröße auseinander. Nebeneinander heißt: die Lücke ist kleiner als
   * zwei Schriftgrößen — weiter auseinander sind es zwei Spalten des
   * Schriftfelds und keine Fortsetzung.
   */
  function zeilenBilden(stuecke) {
    const liste = (stuecke || []).filter(function (s) { return s && s.text; })
      .slice().sort(function (a, b) {
        const dy = (b.y_pt || 0) - (a.y_pt || 0);
        return Math.abs(dy) > 0.5 ? dy : (a.x_pt || 0) - (b.x_pt || 0);
      });
    const zeilen = [];
    let jetzt = null;
    for (let i = 0; i < liste.length; i++) {
      const s = liste[i];
      const gr = Math.max(1, Number(s.groesse_pt) || 8);
      const passt = jetzt
        && Math.abs((s.y_pt || 0) - jetzt.y_pt) <= gr * 0.5
        && (s.x_pt || 0) - jetzt.x_ende <= gr * 2;
      if (passt) {
        jetzt.text += (((s.x_pt || 0) - jetzt.x_ende) > gr * 0.2 ? " " : "") + s.text;
        jetzt.x_ende = (s.x_pt || 0) + (Number(s.breite_pt) || 0);
      } else {
        jetzt = { text: s.text, x_pt: s.x_pt, y_pt: s.y_pt,
                  x_ende: (s.x_pt || 0) + (Number(s.breite_pt) || 0) };
        zeilen.push(jetzt);
      }
    }
    return zeilen;
  }

  function blattkopfLesen(stuecke) {
    const texte = (stuecke || []).map((s) => (s && s.text) || "").filter(Boolean);
    const erg = { massstab_nenner: null, geschoss: null, geschoss_name: null,
                  blattart: null, fundstellen: [] };

    /* Erst die einzelnen Stücke — dort steht der Vermerk am häufigsten und
       punktgenau. Findet sich nichts, die zusammengesetzten Zeilen. */
    for (const s of (stuecke || [])) {
      const n = massstabAusVermerk(s && s.text);
      if (n) {
        erg.massstab_nenner = n;
        erg.fundstellen.push({ was: "Maßstabsvermerk", text: s.text,
                               x_pt: s.x_pt, y_pt: s.y_pt });
        break;
      }
    }
    if (erg.massstab_nenner === null) {
      for (const z of zeilenBilden(stuecke)) {
        const n = massstabAusVermerk(z.text);
        if (n) {
          erg.massstab_nenner = n;
          erg.fundstellen.push({ was: "Maßstabsvermerk", text: z.text,
                                 x_pt: z.x_pt, y_pt: z.y_pt,
                                 aus_zeile: true });
          break;
        }
      }
    }
    /* EINE HOEHENKOTE NENNT KEIN BLATTGESCHOSS. Befund „Am Gunnebach 9"
       (25.08.2026): auf den OG- und DG-Blaettern steht die Bezugszeile
       „OKFF EG = ±0,00" — das „EG" darin ist der HOEHENBEZUG (Fussboden
       Erdgeschoss), nicht das Geschoss des Blattes. Die Suche ueber den
       ganzen Textstand machte daraus „EG" und erzeugte einen falschen
       Geschoss-Widerspruch je Blatt. Textstuecke mit Hoehenbezugs-Kennung
       werden fuer die Geschosserkennung uebersprungen; fuer alles andere
       (Massstab, Blattart) zaehlen sie weiter. */
    const HOEHENBEZUG = /\b(okff|okrf|okf|ukff|ukrf|ffb|fbok|rfb|brh)\b|ok\s?ff|ok\s?rf/i;
    const fuerGeschoss = texte.filter((t) => !HOEHENBEZUG.test(t));
    const ganzGeschoss = fuerGeschoss.join(" ");
    for (const g of GESCHOSSWORTE) {
      if (g.muster.test(ganzGeschoss)) {
        erg.geschoss = g.schluessel;
        erg.geschoss_name = g.name;
        const treffer = fuerGeschoss.find((t) => g.muster.test(t));
        if (treffer) erg.fundstellen.push({ was: "Geschoss", text: treffer });
        break;
      }
    }
    /* Die Blattart. GEMESSEN am 22.08.2026 an echten Blaettern, und der Grund
       fuer die Wortgrenzen: der Erdgeschossplan "4.1.1.13 BT 3 - EG" traegt
       das Wort "SCHNITTLINIE", der Plan "4.1.1.26 SchnittBB" den Satz
       "Ansichtskante Fenstersturz". Ohne Wortgrenzen wurde daraus einmal
       "Schnitt" und einmal "Ansicht", und ein Erdgeschossplan galt als
       Schnitt. Zusaetzlich muss das Wort als kurze Beschriftung dastehen und
       nicht in einem Satz: eine Bauanweisung ist keine Blattart.
       Was damit NICHT geloest ist, und was der Aufrufer wissen muss: eine
       Schnittlinie im Grundriss ist mit "SCHNITT H" beschriftet und sieht aus
       wie der Titel eines Schnittblattes. "schnitt" ist deshalb ein Verdacht,
       kein Befund; wer daraus schliesst, auf dem Blatt seien keine Raeume,
       liegt regelmaessig falsch. */
    const KURZ = 40;
    const alsBeschriftung = function (muster) {
      return texte.some(function (t) {
        return t.length <= KURZ && muster.test(t);
      });
    };
    if (alsBeschriftung(/(^|[^a-zäöüßA-ZÄÖÜ])grundriss([^a-zäöüßA-ZÄÖÜ]|$)/i)) {
      erg.blattart = "grundriss";
    } else if (alsBeschriftung(/(^|[^a-zäöüßA-ZÄÖÜ])schnitt([^a-zäöüßA-ZÄÖÜ]|$)/i)) {
      erg.blattart = "schnitt";
    } else if (alsBeschriftung(/(^|[^a-zäöüßA-ZÄÖÜ])ansicht(en)?([^a-zäöüßA-ZÄÖÜ]|$)/i)) {
      erg.blattart = "ansicht";
    } else if (alsBeschriftung(/(^|[^a-zäöüßA-ZÄÖÜ])lageplan([^a-zäöüßA-ZÄÖÜ]|$)/i)) {
      erg.blattart = "lageplan";
    }
    return erg;
  }

  /* =========================================================================
   * Objektangaben aus dem Schriftfeld
   * =========================================================================
   * Warum das hier steht und nicht im Modell:
   * Adresse, Bauvorhaben, Bauherr und Projektnummer stehen bei fast jedem
   * Bauplan im Schriftfeld. Bei einer Vektorzeichnung liegen sie als Text im
   * Dokument. Sie hier zu lesen kostet nichts, kein Netz, keinen Modellaufruf,
   * und geschieht in dem Augenblick, in dem die Datei abgelegt wird. Die
   * Postleitzahl ist die wertvollste davon: an ihr haengt der Klimadatensatz,
   * und damit faellt eine Eingabe weg, die sonst jedes Mal von Hand kommt.
   *
   * Die eine Falle, an der ein einfacher Griff scheitert: auf einem Blatt
   * stehen bis zu DREI Anschriften nebeneinander — die des Bauvorhabens, die
   * des Bauherrn und die des Architekturbueros. An echten Blaettern nachgesehen:
   *   7_AnsichtNO_SchnittC-C.pdf  Architekt 20354 Hamburg, Bauherr 14532
   *                               Kleinmachnow, Bauvorhaben 63688 Gedern
   *   3_08-Schnitt-Keller.pdf     Bauherr 48165 Muenster, Planverfasser 49074
   *                               Osnabrueck, Bauvorhaben 49186 Bad Iburg
   * Wer die erste Postleitzahl im Blatt nimmt, rechnet das Gebaeude mit dem
   * Klima der Stadt, in der das Architekturbuero sitzt. Deshalb wird nicht nach
   * Postleitzahlen gesucht, sondern nach BESCHRIFTUNGEN, und der Wert wird
   * ueber die Lage zugeordnet: er steht rechts neben der Beschriftung oder
   * unter ihr. Findet sich keine Beschriftung, bleibt das Feld leer. Lieber
   * leer als die falsche Stadt.
   * ======================================================================= */

  /* Beschriftungen des Schriftfelds. Die Reihenfolge entscheidet bei
     Ueberschneidungen. */
  const KOPFFELDER = [
    { feld: "bauvorhaben", muster: /^(bauvorhaben|bauvorh\.|b\.?v\.?\s*:|projekt|objekt|vorhaben|bauma(ss|ß)nahme)\b/i },
    { feld: "adresse",     muster: /^(adresse|anschrift|bauort|baustelle|grundst(ü|ue)ck|objektanschrift|lage)\b/i },
    { feld: "bauherr",     muster: /^(bauherr(in|schaft)?|auftraggeber|eigent(ü|ue)mer)\b/i },
    { feld: "planer",      muster: /^(planverfasser|architekt|planung|entwurfsverfasser|planer|ingenieurb(ü|ue)ro)\b/i },
    { feld: "projektnr",   muster: /^(proj(ekt)?\s*\.?\s*-?\s*nr|projektnummer|auftrags?\s*-?\s*nr|kommission)\b/i },
    { feld: "datum",       muster: /^(datum|dat\.)\b/i },
  ];

  /* Ligaturen ohne Zuordnung.
   * Manche CAD-Ausgaben setzen die Ligaturen "st" und "ct" als eigenes
   * Zeichen ohne brauchbare Rueckuebersetzung ab; pdf.js liefert dann ein
   * Steuerzeichen. Am Blatt Cheruskerstrasse 23 steht dadurch woertlich
   * "Cheruskerraße 23" und "Maßab 1 : 100".
   *
   * Geraten wird hier nichts. Die Bedeutung wird AUS DEM BLATT SELBST
   * hergeleitet: es gibt eine Handvoll Woerter, die auf einem deutschen
   * Schriftfeld praktisch immer vorkommen und eine dieser Ligaturen
   * enthalten. Deckt sich ein Stueck mit genau einem dieser Woerter, sobald
   * man das Steuerzeichen durch eine Buchstabenfolge ersetzt, dann ist damit
   * belegt, wofuer das Zeichen steht. Ohne Beleg wird das Zeichen entfernt
   * und der Wert als unsicher gekennzeichnet, nicht erraten. */
  const ANKERWOERTER = ["massstab", "maßstab", "bestand", "bestandsgebaeude",
                        "bestandsgebäude", "flurstück", "flurstuck",
                        "straße", "strasse", "grundstück", "grundstuck",
                        "ansicht", "schnitt", "architektur", "objekt", "projekt",
                        "erdgeschoss", "dachgeschoss", "obergeschoss", "kellergeschoss",
                        "ost", "west"];
  const LIGATURKANDIDATEN = ["st", "ct", "ff", "fi", "fl", "ffi", "ffl", "tt", "tz", "sp"];
  const STEUERZEICHEN = /[\u0001-\u001F]/;
  const STEUERZEICHEN_G = /[\u0001-\u001F]/g;

  function hatSteuerzeichen(t) { return STEUERZEICHEN.test(String(t || "")); }

  /**
   * Aus den Textstuecken eines Blattes ableiten, wofuer die vorkommenden
   * Steuerzeichen stehen. Liefert eine Zuordnung Zeichen -> Buchstabenfolge,
   * die nur Eintraege enthaelt, die durch ein Ankerwort belegt sind.
   */
  function ligaturenLernen(stuecke) {
    const karte = {};
    const gegen = {};
    ANKERWOERTER.forEach(function (w) {
      gegen[w.toLowerCase().replace(/ß/g, "ss").replace(/[^a-zäöü]/g, "")] = w;
    });
    (stuecke || []).forEach(function (s) {
      const t = String((s && s.text) || "");
      if (!hatSteuerzeichen(t)) return;
      /* Nur Stuecke mit genau einem Steuerzeichen taugen als Beleg: bei
         zweien liesse sich nicht sagen, welches wofuer steht. */
      const treffer = t.match(STEUERZEICHEN_G) || [];
      if (treffer.length !== 1) return;
      const zeichen = treffer[0];
      if (karte[zeichen]) return;
      for (const kand of LIGATURKANDIDATEN) {
        const ersetzt = t.split(zeichen).join(kand).toLowerCase()
          .replace(/ß/g, "ss").replace(/[^a-zäöü]/g, "");
        if (gegen[ersetzt]) { karte[zeichen] = kand; break; }
      }
    });
    return karte;
  }

  /** Wendet die gelernte Zuordnung an. Unbelegte Steuerzeichen fallen weg. */
  function ligaturenAnwenden(text, karte) {
    let t = String(text || "");
    Object.keys(karte || {}).forEach(function (z) { t = t.split(z).join(karte[z]); });
    return t.replace(STEUERZEICHEN_G, "");
  }

  /* Weitere Woerter des Schriftfelds, die selbst nie ein Wert sind. Sie
     stehen auf vielen Blaettern als waagerechte Reihe nebeneinander
     ("BAUHERR  INDEX  DATUM  GEZ.  AENDERUNG  PROJEKT  PLANBEZ. ..."); ohne
     diese Liste wird die naechste Beschriftung als Wert der vorigen gelesen.
     An 4.1.1.26 SchnittBB.pdf aufgefallen: "PROJEKT" bekam "PLANBEZ." als Wert. */
  const SCHRIFTFELDWORTE = /^(index|(ä|ae)nderung|planbez\.?|plan\.?\s*stand|ma(ss|ß)stab|ma(ss|ß)st\.|gez\.?|pl\.?\s*nr\.?|dat\.?|bl\.?\s*gr\.?|blatt|blatt\s*-?\s*nr|phase|gemarkung|flur|flurst(ü|ue)ck|plan|ma(ss|ß)e|zeichnung|gepr(ü|ue)ft|freigabe|revision|status|nordpfeil|legende|zeichn\.?\s*-?\s*nr|zeichnungs?\s*-?\s*nr|format|bauabschnitt|bauteil|inhalt|planinhalt|bearbeiter|erstellt|ge(ä|ae)ndert|ma(ss|ß)e\s*in|gezeichnet|antrags?steller|aufgestellt|unterschrift|kontrolliert|ma(ss|ß)st(ä|ae)be)\b[\s:.\-]*$/i;

  /* Zweckvermerke. Sie stehen als Ueberschrift auf dem Blatt und sagen, WOZU
     der Plan gezeichnet wurde -- nicht, wer der Bauherr ist. Am Blatt
     25_Maas_Langner_VE1_OG.pdf steht "BAUANTRAGSPLANUNG" in 26 pt schraeg
     ueber dem Schriftfeld; die Beschriftung "EIGENTÜMER:" hat 8,1 pt. Der
     Zweckvermerk landete dadurch als meta.bauherr im Projekt und von dort
     auf dem Deckblatt des Berichts. */
  const ZWECKVERMERKE = /^(bauantrags?planung|bauantrag|bauvorlage|bauvorlagen|bauge(n|nehmigungs)?planung|genehmigungsplanung|eingabeplanung|entwurfsplanung|vorentwurf(splanung)?|ausf(ü|ue)hrungsplanung|werkplanung|werkstattplanung|bestandsplanung|bestandsplan|vorabzug|planung|entwurf|abbruchantrag|nutzungs(ä|ae)nderung)\b[\s:.\-]*$/i;

  /* Blattbezeichnungen. Sie sagen, WAS gezeichnet ist. Auch sie sind nie ein
     Bauherr, eine Anschrift oder eine Projektnummer. Am Blatt
     25_Maas_Langner_VE1_OG.pdf stand "ÜBERSICHTSPLAN" unter der Beschriftung
     "EIGENTÜMER:", weil die Werte dieses Schriftfelds weit rechts stehen und
     die Blattbezeichnung naeher lag. */
  const BLATTBEZEICHNUNGEN = /^((ü|ue)bersichtsplan|lageplan|amtlicher\s+lageplan|grundriss|grundrisse|schnitt|schnitte|ansicht|ansichten|detail|details|deckenplan|dachaufsicht|draufsicht|perspektive|isometrie|freifl(ä|ae)chenplan|abstandsfl(ä|ae)chenplan|berechnungen?|nachweis(e)?)\b[\s:.\-]*$/i;

  /* Ein Wert ist alles, was nicht selbst eine Beschriftung ist. */
  function istBeschriftung(t) {
    const s = String(t || "").trim();
    if (!s) return true;
    if (SCHRIFTFELDWORTE.test(s)) return true;
    return KOPFFELDER.some(function (k) { return k.muster.test(s); });
  }

  /**
   * Die Textstuecke, die zu einer Beschriftung gehoeren: rechts daneben auf
   * derselben Grundlinie, oder darunter im selben senkrechten Streifen.
   * Die Masse sind in Vielfachen der Schriftgroesse angegeben, damit sie
   * unabhaengig von der Blattgroesse gelten.
   */
  function werteZuBeschriftung(marke, alle) {
    const gr = Math.max(1, Number(marke.groesse_pt) || 8);
    const w = Number(marke.winkel_rad) || 0;
    const ux = Math.cos(w), uy = Math.sin(w);      // Leserichtung
    const nx = -Math.sin(w), ny = Math.cos(w);     // senkrecht dazu, nach oben
    const breite = Number(marke.breite_pt) || 0;
    /* Wie viel groesser als seine Beschriftung darf ein Wert gesetzt sein?
       Schriftfelder setzen die Beschriftung klein und den Wert groesser; an
       4.1.1.26_SchnittBB.pdf steht "PROJ. NR." in 4,0 pt und "2002.04" in
       9,9 pt, also das Zweieinhalbfache. Eine Blattueberschrift liegt
       darueber: an 25_Maas_Langner_VE1_OG.pdf hat "EIGENTÜMER:" 8,1 pt und
       der Vermerk "BAUANTRAGSPLANUNG" 26 pt, das Dreifache -- und er landete
       als Bauherr im Bericht. Die Grenze liegt deshalb beim Dreifachen:
       oberhalb der groessten in echten Schriftfeldern gemessenen Spanne und
       unterhalb der Ueberschrift. Festlegung dieses Werkzeugs. */
    const GROESSE_MAX = 3.0;
    const rechts = [], unten = [];
    (alle || []).forEach(function (s) {
      if (s === marke) return;
      /* Nur Stuecke derselben Leserichtung. Ein gedrehtes Schriftfeld hat
         gedrehte Werte; waagerechter Text daneben gehoert zur Zeichnung. */
      const dw = Math.abs(((Number(s.winkel_rad) || 0) - w + Math.PI) % (2 * Math.PI) - Math.PI);
      if (dw > 0.26) return;                       // rund 15 Grad
      if ((Number(s.groesse_pt) || 0) > gr * GROESSE_MAX) return;
      const dx = (s.x_pt || 0) - (marke.x_pt || 0);
      const dy = (s.y_pt || 0) - (marke.y_pt || 0);
      const laengs = dx * ux + dy * uy - breite;   // Abstand hinter dem Ende
      const quer = -(dx * nx + dy * ny);           // groesser null heisst darunter
      if (Math.abs(quer) <= gr * 0.6 && laengs >= -gr * 0.2 && laengs <= gr * 16) {
        rechts.push({ s: s, rang: laengs });
      } else if (quer > 0 && quer <= gr * 40
                 && dx * ux + dy * uy >= -gr * 2.5
                 && dx * ux + dy * uy <= gr * 16) {
        unten.push({ s: s, rang: quer });
      }
    });
    /* Rechts daneben zuerst, dann die Spalte darunter. Beides wird gebraucht:
       manche Schriftfelder setzen den Wert neben die Beschriftung, andere
       darunter, und die Anschrift steht haeufig mehrere Zeilen unter der
       Zeile, die neben der Beschriftung steht (3_08-Schnitt-Keller.pdf:
       "Bauvorhaben:" oben, die Anschrift elf Zeilen tiefer).

       Die Spalte endet an der naechsten Beschriftung oder an einer Luecke von
       mehr als drei Zeilen. Ohne diese Grenzen liefe die Suche in das Feld
       darunter hinein und holte die Anschrift des Bauherrn als Anschrift des
       Bauvorhabens. */
    const nachOben = function (a, b) { return a.rang - b.rang; };
    const liste = rechts.sort(nachOben).map(function (x) { return x.s; });
    const spalte = [];
    let vorher = 0;
    for (const x of unten.sort(nachOben)) {
      if (istBeschriftung(x.s.text)) break;
      if (spalte.length && x.rang - vorher > gr * 3) break;
      vorher = x.rang;
      spalte.push(x.s);
    }
    return liste.filter(function (s) { return !istBeschriftung(s.text); })
      .concat(spalte).slice(0, 14);
  }

  /* Ob ein Textstueck ueberhaupt als Wert taugt. An echten Blaettern
     entstanden sonst diese drei Sorten Unsinn:
       "Nr."           Rest einer Beschriftung (26.02.17_AP_Gelato ...)
       "*in"           Rest der Paarform "Bauherr*in" (13_BA 03_EG.pdf)
       "Detmold, den"  Ortszeile vor dem Datum (25.03.31 Vorabzug EG.pdf) */
  function istWert(t) {
    const x = String(t || "").trim();
    if (x.length < 3 || x.length > 120) return false;
    if (!/[A-Za-zÄÖÜäöüß]{3,}/.test(x)) return false;
    if (/^[*:\/\-\s]*in$/i.test(x)) return false;
    if (/,\s*den\s*$/i.test(x)) return false;
    if (SCHRIFTFELDWORTE.test(x)) return false;
    if (ZWECKVERMERKE.test(x)) return false;
    if (BLATTBEZEICHNUNGEN.test(x)) return false;
    return true;
  }

  const PLZ_ORT = /^(?:D\s*-\s*)?(\d{5})\s+([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.\- ]{1,40})$/;
  const STRASSE = /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.\- ]{2,50}?)\s+(\d{1,4}\s*[a-zA-Z]?(?:\s*[-\/]\s*\d{1,4}\s*[a-zA-Z]?)?)$/;

  /**
   * Objektangaben aus dem Schriftfeld lesen.
   *
   * Liefert nur, was belegt ist. Jeder Wert traegt seine Fundstelle, damit im
   * Kontrollblatt nachvollziehbar bleibt, woher er kommt. Nichts wird
   * geschaetzt und nichts vervollstaendigt.
   */
  function objektangabenLesen(stuecke) {
    const karte = ligaturenLernen(stuecke);
    const rein = (stuecke || []).filter(function (s) { return s && s.text; })
      .map(function (s) {
        return Object.assign({}, s, {
          text: ligaturenAnwenden(s.text, karte).trim(),
          luecke: hatSteuerzeichen(s.text) && !Object.keys(karte).length,
        });
      })
      .filter(function (s) { return s.text; });

    const erg = { bauvorhaben: null, strasse: null, plz: null, ort: null,
                  bauherr: null, projektnr: null, datum: null,
                  fundstellen: [], unsicher: [] };

    /* Je Beschriftung die zugehoerigen Werte einsammeln. */
    const gruppen = {};
    rein.forEach(function (s) {
      for (const k of KOPFFELDER) {
        if (!k.muster.test(s.text)) continue;
        /* Steht der Wert in demselben Stueck wie die Beschriftung
           ("Bauherr: Meier"), wird er dort abgetrennt. */
        const inline = s.text.replace(k.muster, "").replace(/^[\s:.\-]+/, "").trim();
        if (!gruppen[k.feld]) gruppen[k.feld] = [];
        if (inline) gruppen[k.feld].push(Object.assign({}, s, { text: inline }));
        gruppen[k.feld] = gruppen[k.feld].concat(werteZuBeschriftung(s, rein));
        return;
      }
    });

    function ausGruppe(name) { return gruppen[name] || []; }
    function merken(feld, wert, quelle, stueck) {
      if (erg[feld] || !wert) return;
      erg[feld] = wert;
      erg.fundstellen.push({ feld: feld, text: wert, beschriftung: quelle,
                             x_pt: stueck && stueck.x_pt, y_pt: stueck && stueck.y_pt });
      if (stueck && stueck.luecke && erg.unsicher.indexOf(feld) < 0) erg.unsicher.push(feld);
    }

    /* Die Anschrift des Bauvorhabens. Zuerst unter "Adresse"/"Bauort",
       sonst unter "Bauvorhaben" — dort steht sie auf vielen Blaettern mit in
       derselben Spalte. Die Anschrift des Bauherrn und die des Planers werden
       ausdruecklich NICHT herangezogen. */
    ["adresse", "bauvorhaben"].forEach(function (name) {
      ausGruppe(name).forEach(function (s) {
        const mp = s.text.match(PLZ_ORT);
        if (mp) { merken("plz", mp[1], name, s); merken("ort", mp[2].trim(), name, s); }
        if (STRASSE.test(s.text)) merken("strasse", s.text.trim(), name, s);
      });
    });
    /* Das Bauvorhaben selbst: die erste Zeile unter der Beschriftung, die
       keine Anschrift ist. */
    ausGruppe("bauvorhaben").forEach(function (s) {
      if (PLZ_ORT.test(s.text) || STRASSE.test(s.text)) return;
      if (!istWert(s.text)) return;
      merken("bauvorhaben", s.text.trim(), "bauvorhaben", s);
    });
    ausGruppe("bauherr").forEach(function (s) {
      if (PLZ_ORT.test(s.text) || STRASSE.test(s.text)) return;
      if (!istWert(s.text)) return;
      merken("bauherr", s.text.trim(), "bauherr", s);
    });
    ausGruppe("projektnr").forEach(function (s) {
      if (!/[0-9]/.test(s.text) || s.text.length > 30) return;
      merken("projektnr", s.text.trim(), "projektnr", s);
    });
    ausGruppe("datum").forEach(function (s) {
      if (!/\d{1,2}\s*[.\/]\s*\d{1,2}\s*[.\/]\s*\d{2,4}|\d{1,2}\.\s*[A-Za-zÄÖÜäöü]+\s*\d{4}/.test(s.text)) return;
      merken("datum", s.text.trim(), "datum", s);
    });
    return erg;
  }

  /**
   * Rohe Textstücke von pdf.js in eine handliche Form bringen.
   * item.transform ist [a,b,c,d,e,f]; e und f sind die Lage in PDF-Punkten,
   * item.height ist die Schriftgröße in Punkt.
   */
  function textstueckeOrdnen(items) {
    const raus = [];
    for (const it of (items || [])) {
      if (!it || typeof it.str !== "string") continue;
      const text = it.str.trim();
      if (!text) continue;                       // pdf.js liefert Leerstücke mit
      const t = it.transform || [1, 0, 0, 1, 0, 0];
      const groesse = it.height || Math.hypot(t[2], t[3]) || 0;
      /* Leserichtung des Stuecks. Auf grossen Blaettern steht das Schriftfeld
         haeufig hochkant am rechten Rand; dann laufen Beschriftung und Wert
         nicht waagerecht, sondern gedreht nebeneinander. Ohne diesen Winkel
         liesse sich "rechts daneben" und "darunter" dort nicht bestimmen. */
      const winkel = Math.atan2(t[1], t[0]);
      raus.push({
        text: text,
        x_pt: t[4], y_pt: t[5],
        breite_pt: it.width || 0,
        groesse_pt: groesse,
        winkel_rad: winkel,
        versalhoehe_mm: versalhoeheMm(groesse),
        x_mm: ptZuMm(t[4]), y_mm: ptZuMm(t[5]),
      });
    }
    return hochstellungenAnfuegen(raus);
  }

  /** Hochgestellte Ziffern an ihr Textstück anfügen.
   *
   *  WARUM DAS SEIN MUSS, und was es kostet, wenn es fehlt.
   *  Ein CAD-Programm setzt das Quadratzeichen in „6,76 m²" nicht als Zeichen,
   *  sondern als eigenen, kleiner gesetzten und höher stehenden Textlauf. Im
   *  Textstand kommt dann an:
   *      "Empfang"       5,8 pt   x=419,3  y=392,5
   *      "NGF: 6,76 m"   4,9 pt   x=419,3  y=385,3
   *      "2"             3,2 pt   x=447,1  y=387,0
   *  Das Stück endet also auf „m". GEMESSEN am 27.08.2026 am Blatt
   *  „Hasenberg_10_Grundrisse_290425.pdf": alle 20 Raumflächen des Vorhabens
   *  stehen dort im Textstand, zusammen 280,76 m², und das Werkzeug hat KEINE
   *  EINZIGE davon gesehen. raumstempelLesen verlangt „m" und das Hochzeichen
   *  im selben Stück und gab null zurück; damit entstand nicht einmal ein
   *  Raumblock. Der Plan wurde deshalb vom Modell abgelesen und geschätzt,
   *  obwohl die genauen Zahlen im Dokument standen.
   *  Derselbe Bruch trifft die Maßzahlen von der anderen Seite: „30,28 m"
   *  ohne Hochzeichen ist keine Fläche mehr, sondern sieht aus wie eine
   *  Länge von 30 Metern und ging als solche in die Maßketten.
   *
   *  Erkannt wird eine Hochstellung geometrisch, nicht am Zeichen: deutlich
   *  kleiner gesetzt, unmittelbar rechts anschließend und höher stehend. Die
   *  Schranken sind bewusst eng; ein normal gesetztes „2" hinter einem Wort
   *  erfüllt sie nicht. */
  const HOCHZEICHEN = { "2": "²", "²": "²", "3": "³", "³": "³" };
  function hochstellungenAnfuegen(stuecke) {
    const n = stuecke.length;
    const verbraucht = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      const s = stuecke[i];
      if (verbraucht[i]) continue;
      /* Nur dort ansetzen, wo eine Hochstellung überhaupt etwas bedeutet:
         hinter einer Einheit. Sonst würde aus „Haus 2" ein „Haus²". */
      if (!/[0-9]\s*m$/i.test(s.text) && !/\bm$/i.test(s.text)) continue;
      const gr = Number(s.groesse_pt) || 0;
      if (!(gr > 0)) continue;
      /* Rechte Kante und Grundlinie des Trägerstücks. Bei gedrehter Schrift
         gilt dasselbe in Leserichtung; hier genügt der waagerechte Fall,
         weil Raumstempel praktisch nie hochkant stehen. */
      const rechts = (Number(s.x_pt) || 0) + (Number(s.breite_pt) || 0);
      for (let j = 0; j < n; j++) {
        if (j === i || verbraucht[j]) continue;
        const k = stuecke[j];
        const zeichen = HOCHZEICHEN[String(k.text).trim()];
        if (!zeichen) continue;
        if (Math.abs((Number(k.winkel_rad) || 0) - (Number(s.winkel_rad) || 0)) > 0.05) continue;
        const grk = Number(k.groesse_pt) || 0;
        if (!(grk > 0 && grk < 0.9 * gr)) continue;          // deutlich kleiner
        const dx = (Number(k.x_pt) || 0) - rechts;
        if (!(dx > -0.35 * gr && dx < 0.9 * gr)) continue;   // schließt rechts an
        const dy = (Number(k.y_pt) || 0) - (Number(s.y_pt) || 0);
        if (!(dy > 0.05 * gr && dy < 0.75 * gr)) continue;   // steht höher
        s.text = s.text + zeichen;
        s.breite_pt = (Number(s.breite_pt) || 0) + (Number(k.breite_pt) || 0);
        s.hochstellung_angefuegt = true;
        verbraucht[j] = true;
        break;
      }
    }
    /* Das verbrauchte Stück fällt weg: als eigenes „2" wäre es weder Name
       noch Maßzahl, würde aber in jeder Zählung mitlaufen. */
    return stuecke.filter(function (s, i) { return !verbraucht[i]; });
  }

  /** Kleinste vorkommende Versalhöhe, für die Wahl der Renderauflösung. */
  function kleinsteVersalhoehe(stuecke) {
    let klein = null;
    for (const s of (stuecke || [])) {
      if (!(s.versalhoehe_mm > 0.2)) continue;   // Ausreißer nach unten sperren
      if (klein === null || s.versalhoehe_mm < klein) klein = s.versalhoehe_mm;
    }
    return klein;
  }

  /* =========================================================================
   * Teil C — Pfadauswertung
   * =======================================================================*/

  /**
   * Das flache Zahlenfeld eines Pfades in Linienzüge auflösen.
   * Die Zahl der Folgeargumente je Befehl steht in BEFEHL_ARGUMENTE; ein
   * unbekannter Befehl bricht die Auswertung dieses Pfades ab, statt still
   * falsch weiterzuzählen.
   */
  function pfadAufloesen(feld) {
    const f = feld && feld.length !== undefined ? feld : [];
    const zuege = [];
    let aktuell = null;
    let i = 0;
    let abgebrochen = false;
    while (i < f.length) {
      const befehl = f[i++];
      const n = BEFEHL_ARGUMENTE[befehl];
      if (n === undefined || i + n > f.length) { abgebrochen = true; break; }
      if (befehl === ZEICHENBEFEHL.hin) {
        aktuell = { punkte: [{ x: f[i], y: f[i + 1] }], geschlossen: false, kurven: 0 };
        zuege.push(aktuell);
      } else if (!aktuell) {
        // Zeichenbefehl ohne vorangehendes Hinbewegen: Pfad ist unbrauchbar
        abgebrochen = true; break;
      } else if (befehl === ZEICHENBEFEHL.linie) {
        aktuell.punkte.push({ x: f[i], y: f[i + 1] });
      } else if (befehl === ZEICHENBEFEHL.kurve) {
        aktuell.punkte.push({ x: f[i + 4], y: f[i + 5] });
        aktuell.kurven++;
      } else if (befehl === ZEICHENBEFEHL.kurve2) {
        aktuell.punkte.push({ x: f[i + 2], y: f[i + 3] });
        aktuell.kurven++;
      } else if (befehl === ZEICHENBEFEHL.zu) {
        aktuell.geschlossen = true;
      }
      i += n;
    }
    return { zuege: zuege, abgebrochen: abgebrochen };
  }

  /**
   * Einen Linienzug mit der laufenden Transformationsmatrix in den
   * Seitenraum umrechnen.
   *
   * Das ist keine Feinheit, sondern Pflicht. CAD-Ausgaben zeichnen ihre Pfade
   * regelmäßig in einem eigenen, viel größeren Koordinatenraum und stellen ihn
   * per „cm" klein. Am echten A1-Plan des BLB NRW steht vor jedem Pfad eine
   * Matrix mit dem Faktor 0,06; die rohen Koordinaten laufen dort bis 38.786,
   * während das Blatt nur 2.384 Punkte hoch ist. Wer die Rohwerte nimmt,
   * bekommt Strecken, die länger sind als das Blatt, und jede daraus
   * gerechnete Länge ist um den Faktor der Matrix falsch.
   */
  function zugUmrechnen(zug, ctm) {
    if (!ctm) return zug;
    const [a, b, c, d, e, f] = ctm;
    return {
      geschlossen: zug.geschlossen,
      kurven: zug.kurven,
      punkte: zug.punkte.map(function (p) {
        return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
      }),
    };
  }

  /** Gerade Strecken aus Linienzügen, Länge in PDF-Punkten. */
  function streckenAus(zuege, mindestlaenge_pt) {
    const min = mindestlaenge_pt === undefined ? 3 : mindestlaenge_pt;
    const raus = [];
    for (const z of (zuege || [])) {
      const p = z.punkte || [];
      const bis = z.geschlossen ? p.length : p.length - 1;
      for (let i = 0; i < bis; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        const laenge = Math.hypot(b.x - a.x, b.y - a.y);
        if (laenge < min) continue;
        raus.push({
          a: a, b: b, laenge_pt: laenge, laenge_mm: ptZuMm(laenge),
          mitte: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          winkel: Math.atan2(b.y - a.y, b.x - a.x),
          waagerecht: Math.abs(b.y - a.y) < 0.5,
          senkrecht: Math.abs(b.x - a.x) < 0.5,
        });
      }
    }
    return raus;
  }

  /** Gauß'sche Trapezformel, Fläche in Quadrat-Punkten. */
  function flaechePt2(punkte) {
    const p = punkte || [];
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) / 2;
  }

  function umfangPt(punkte) {
    const p = punkte || [];
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      s += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return s;
  }

  /**
   * Aus einem geschlossenen Linienzug eine echte Fläche machen.
   * Ist der Maßstab bekannt, ist die Fläche gerechnet und nicht geschätzt.
   */
  function flaecheAusZug(zug, nenner) {
    if (!zug || !zug.punkte || zug.punkte.length < 3) return null;
    const p = zug.punkte.slice();
    // ein durch closePath geschlossener Zug wiederholt den Anfangspunkt nicht
    if (p.length > 3) {
      const erst = p[0], letzt = p[p.length - 1];
      if (Math.hypot(erst.x - letzt.x, erst.y - letzt.y) < 0.01) p.pop();
    }
    const a_pt2 = flaechePt2(p);
    const u_pt = umfangPt(p);
    const erg = {
      ecken: p.length,
      flaeche_mm2_papier: ptZuMm(ptZuMm(a_pt2)),
      umfang_mm_papier: ptZuMm(u_pt),
      rechtwinklig: istAchsparallel(p),
    };
    if (nenner > 0) {
      erg.nenner = nenner;
      erg.flaeche_m2 = erg.flaeche_mm2_papier * nenner * nenner / 1e6;
      erg.umfang_m = erg.umfang_mm_papier * nenner / 1000;
      erg.exakt = true;    // aus Dokumentkoordinaten, nicht aus Bildpunkten
    }
    return erg;
  }

  function istAchsparallel(punkte) {
    const p = punkte || [];
    if (p.length < 3) return false;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      if (Math.abs(a.x - b.x) > 0.5 && Math.abs(a.y - b.y) > 0.5) return false;
    }
    return true;
  }

  /** Rechteck erkennen und ausmessen. */
  function rechteckAusZug(zug, nenner) {
    const g = flaecheAusZug(zug, nenner);
    if (!g || g.ecken !== 4 || !g.rechtwinklig) return null;
    const p = zug.punkte.slice(0, 4);
    const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
    const b_pt = Math.max.apply(null, xs) - Math.min.apply(null, xs);
    const h_pt = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    const erg = { breite_mm_papier: ptZuMm(b_pt), hoehe_mm_papier: ptZuMm(h_pt) };
    if (nenner > 0) {
      erg.breite_m = erg.breite_mm_papier * nenner / 1000;
      erg.hoehe_m = erg.hoehe_mm_papier * nenner / 1000;
      erg.flaeche_m2 = erg.breite_m * erg.hoehe_m;
      erg.umfang_m = 2 * (erg.breite_m + erg.hoehe_m);
      erg.exakt = true;
    }
    return erg;
  }

  /* =========================================================================
   * Teil D — Maßstab aus zwei unabhängigen Wegen
   * =======================================================================*/

  /* Kürzeste Linie, die als Maßlinie in Frage kommt: rund 10 mm auf dem Blatt.
   * ANNAHME, aber eine belegte: am echten A1-Plan XA_EG.PDF des BLB NRW wurde
   * der Maßstab zunächst mit 1:1000 statt 1:100 bestimmt, weil Maßhilfslinien
   * und Begrenzungsstriche von rund 6 pt (2 mm) massenhaft vorkommen und jede
   * Maßzahl mit einem solchen Strich ein beliebiges Ergebnis liefert. Bei
   * kurzen Linien schlägt schon ein kleiner absoluter Fehler voll auf den
   * Nenner durch. Maßketten, auf die es ankommt, sind deutlich länger. */
  const MIN_MASSLINIE_PT = 28;

  /** Abstand eines Punktes zur Strecke, nicht zu deren Mitte. */
  function abstandZuStrecke(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    if (L2 === 0) return Math.hypot(px - a.x, py - a.y);
    let t = ((px - a.x) * dx + (py - a.y) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  }

  /** Nenner aus einer Maßzahl und der Länge der zugehörigen Linie. */
  function massstabAusKette(o) {
    o = o || {};
    if (!(o.wert_m > 0) || !(o.laenge_pt > 0)) return null;
    const papier_mm = ptZuMm(o.laenge_pt);
    if (!(papier_mm > 0)) return null;
    return o.wert_m * 1000 / papier_mm;
  }

  /** Auf einen üblichen Maßstab einrasten, wenn er nah genug liegt. */
  function einrasten(nenner, toleranz) {
    const t = toleranz === undefined ? 0.03 : toleranz;
    let beste = null;
    for (const n of MASSSTAEBE) {
      const abw = Math.abs(nenner - n) / n;
      if (abw <= t && (!beste || abw < beste.abweichung)) {
        beste = { nenner: n, abweichung: abw };
      }
    }
    return beste;
  }

  /**
   * Weg 2: Maßstab aus der Geometrie.
   * Jede sichere Maßzahl wird mit den Strecken in ihrer Nähe gepaart. Jedes
   * Paar ergibt einen Nenner. Der Maßstab, auf den die meisten Paare fallen,
   * gewinnt. Ein einzelnes Paar genügt nicht — es könnte eine Maßzahl an der
   * falschen Linie sein, genau der Fehler, den kern_massstabsprobe.js als
   * Weg 2 beschreibt.
   */
  function massstabAusGeometrie(o) {
    o = o || {};
    const masszahlen = o.masszahlen || [];
    const maxAbstand = o.max_abstand_pt === undefined ? 45 : o.max_abstand_pt;
    const minLinie = o.min_linie_pt === undefined ? MIN_MASSLINIE_PT : o.min_linie_pt;
    const strecken = (o.strecken || []).filter((s) => s.laenge_pt >= minLinie);
    const gewicht = {};
    const paare = [];

    for (const mz of masszahlen) {
      if (!mz || !mz.zahl || !mz.zahl.sicher || !(mz.zahl.wert_m > 0)) continue;
      for (const st of strecken) {
        const abstand = abstandZuStrecke(mz.x_pt, mz.y_pt, st.a, st.b);
        if (abstand > maxAbstand) continue;
        const nenner = massstabAusKette({ wert_m: mz.zahl.wert_m, laenge_pt: st.laenge_pt });
        if (!nenner) continue;
        const rast = einrasten(nenner);
        if (!rast) continue;
        paare.push({ text: mz.text, wert_m: mz.zahl.wert_m, laenge_pt: st.laenge_pt,
                     nenner_roh: nenner, nenner: rast.nenner,
                     abweichung: rast.abweichung, abstand_pt: abstand,
                     x_pt: mz.x_pt, y_pt: mz.y_pt });
        // Nach Linienlänge gewichten: eine lange Maßkette ist ein besserer
        // Zeuge als ein kurzer Strich, weil derselbe absolute Zeichenfehler
        // dort viel weniger auf den Nenner durchschlägt.
        gewicht[rast.nenner] = (gewicht[rast.nenner] || 0) + st.laenge_pt;
      }
    }
    const rang = Object.keys(gewicht).sort((a, b) => gewicht[b] - gewicht[a]);
    if (!rang.length) return { nenner: null, paare: paare, belege: 0 };

    const sieger = rang[0];
    const zweiter = rang[1];
    /* Wenn der zweitbeste Maßstab fast genauso gut belegt ist, ist die Lage
     * nicht geklärt. Dann lieber nichts liefern als das Falsche: der Blattkopf
     * bekäme sonst einen erfundenen Widerspruch vorgehalten. */
    if (zweiter && gewicht[zweiter] > 0.5 * gewicht[sieger]) {
      return { nenner: null, paare: paare, belege: 0, uneindeutig: true,
               kandidaten: rang.slice(0, 3).map((n) => ({ nenner: +n, gewicht: gewicht[n] })) };
    }
    const eigene = paare.filter((p) => String(p.nenner) === String(sieger));
    /* Belege sind verschiedene Maßzahlen an verschiedenen Stellen. Zwei Linien
     * an derselben Zahl sind kein zweiter Beleg, und dieselbe Zahl an zwei
     * Stellen des Blattes sehr wohl. */
    const stellen = {};
    eigene.forEach(function (p) {
      stellen[p.text + "@" + Math.round(p.x_pt) + "/" + Math.round(p.y_pt)] = true;
    });
    return {
      nenner: parseInt(sieger, 10),
      belege: Object.keys(stellen).length,
      paare: eigene,
      gewicht_pt: gewicht[sieger],
      mittlere_abweichung: eigene.reduce((s, p) => s + p.abweichung, 0) / eigene.length,
    };
  }

  /**
   * Beide Wege zusammenführen und gegeneinander halten.
   * Güte:
   *   abgesichert  beide Wege da und einig
   *   belegt       ein Weg mit mehreren Belegen
   *   vorlaeufig   nur ein Weg mit einem Beleg
   *   widerspruch  beide Wege da und uneinig -> nichts übernehmen
   */
  function massstabBestimmen(o) {
    o = o || {};
    const wegVermerk = o.nenner_vermerk || null;
    const geo = o.geometrie || { nenner: null, belege: 0 };
    const wegGeo = geo.nenner || null;
    const erg = {
      nenner: null, guete: "unbekannt", belastbar: false,
      weg_vermerk: wegVermerk, weg_geometrie: wegGeo,
      belege_geometrie: geo.belege || 0, befunde: [],
    };

    if (wegVermerk && wegGeo) {
      const abw = Math.abs(wegVermerk - wegGeo) / wegVermerk;
      if (abw <= 0.02) {
        erg.nenner = wegVermerk;
        erg.guete = "abgesichert";
        erg.belastbar = true;
        erg.befunde.push({ stufe: "gut", text: "Maßstabsvermerk 1:" + wegVermerk
          + " und gelesene Maßkette stimmen überein." });
      } else {
        erg.guete = "widerspruch";
        erg.befunde.push({ stufe: "fehler", text: "Der Blattkopf nennt 1:" + wegVermerk
          + ", die Maßketten ergeben 1:" + wegGeo + ". Das Blatt ist vermutlich "
          + "verkleinert kopiert oder beschnitten. Maßstab von Hand setzen." });
      }
      return erg;
    }
    if (wegGeo) {
      erg.nenner = wegGeo;
      erg.belastbar = geo.belege >= 2;
      erg.guete = geo.belege >= 2 ? "belegt" : "vorlaeufig";
      erg.befunde.push({ stufe: geo.belege >= 2 ? "gut" : "warnung",
        text: "Maßstab 1:" + wegGeo + " aus " + geo.belege + " gelesenen Maßzahlen. "
          + "Kein Maßstabsvermerk im Blattkopf gefunden." });
      return erg;
    }
    if (wegVermerk) {
      erg.nenner = wegVermerk;
      erg.guete = "vorlaeufig";
      erg.befunde.push({ stufe: "warnung", text: "Nur der Blattkopf nennt 1:" + wegVermerk
        + ". Keine Maßkette zum Gegenrechnen gefunden. Bei einer verkleinerten "
        + "Kopie wäre dieser Vermerk falsch." });
      return erg;
    }
    erg.befunde.push({ stufe: "warnung",
      text: "Kein Maßstab aus dem Dokument ableitbar. Bitte von Hand setzen." });
    return erg;
  }

  /* =========================================================================
   * Teil D2 — Außenbemaßung: die Gebäudekontur aus den Maßketten
   * =========================================================================
   * Warum es das gibt:
   * Im Kontrollblatt stand auf jedem Projekt dreimal dieselbe Zeile — „eine
   * Gebäudekontur zum Gegenrechnen liegt nicht vor". Die Kontur steht aber auf
   * fast jedem Bauplan: als äußerste Maßkette rund um das Gebäude. Sie wurde
   * nur nie gelesen. Dieser Abschnitt liest sie aus dem Textstand, also ohne
   * jeden Modellaufruf und ohne Bild — der billigste der drei Wege.
   *
   * Der Unterschied zu massstabAusGeometrie: dort ist der Maßstab gesucht und
   * die Länge der Linie das Mittel. Hier ist der Maßstab bereits bekannt und
   * die LAGE der Linie das Ziel. Deshalb wird eine Maßzahl nur dann einer
   * Strecke zugeordnet, wenn deren Papierlänge mal Nenner die Maßzahl auch
   * ergibt. Die reine Nähe genügt nicht: neben einer Maßzahl liegen auf einem
   * Bauplan Dutzende Striche.
   *
   * Aus den zugeordneten Abschnitten entstehen Ketten: gleiche Richtung,
   * gleiche Zeile, lückenlos aneinander. Die Kette mit der größten Spanne in
   * ihrer Richtung ist die Außenbemaßung.
   *
   * Belegt oder nicht — das ist hier die entscheidende Unterscheidung. Eine
   * einzelne Kette kann etwas ganz anderes messen als das Gebäude, etwa den
   * Abstand zur Grundstücksgrenze oder einen Anbau. Gemessen am Blatt
   * „Bauantrag_EG_24.07.2024" liefert die längste waagerechte Kette 30,00 m,
   * das Gebäude ist aber 26,00 m breit; die 4,00 m sind ein Vorbau. Belegt ist
   * ein Maß deshalb erst, wenn eine ZWEITE, unabhängige Kette derselben
   * Richtung auf denselben Wert kommt — auf jenem Blatt kommt 26,00 sowohl aus
   * 7,50 + 12,50 + 6,00 als auch aus 5,20 + 5,20 + 4,40 + 5,20 + 6,00.
   * Unbelegte Maße werden mitgeliefert, aber als unbelegt gekennzeichnet; wer
   * sie verwendet, muss das verantworten.
   * =======================================================================*/

  /* Zwei Ketten gelten als derselbe Wert, wenn sie sich um weniger als das
   * unterscheiden. Nicht gegriffen: kern_massstabsprobe.js lässt zwischen zwei
   * unabhängigen Maßketten genau zwei Prozent zu und sperrt darüber. Dieselbe
   * Toleranz hier zu verwenden hält beide Proben widerspruchsfrei. */
  const KETTE_TOLERANZ = 0.02;
  /* Zwei Abschnitte liegen auf derselben Kette, wenn ihre Maßlinien in der
   * Querrichtung weniger als das auseinanderliegen. 3 pt sind rund 1 mm auf
   * dem Blatt; enger geht nicht, weil CAD-Ausgaben die Maßlinie einer Kette
   * gern in Abschnitten mit minimal versetzten Endpunkten zeichnen. */
  const KETTE_ZEILE_PT = 3;

  /** Maßzahlen den Maßlinien zuordnen, bei bekanntem Maßstab. */
  function abschnitteAusTextstand(o) {
    o = o || {};
    const nenner = o.nenner;
    if (!(nenner > 0)) return [];
    const maxAbstand = o.max_abstand_pt === undefined ? 45 : o.max_abstand_pt;
    const strecken = (o.strecken || []).filter(function (s) {
      return s.laenge_pt >= MIN_MASSLINIE_PT && (s.waagerecht || s.senkrecht);
    });
    const raus = [];
    for (const mz of (o.masszahlen || [])) {
      if (!mz || !mz.zahl || !mz.zahl.sicher || !(mz.zahl.wert_m > 0)) continue;
      const soll_pt = mmZuPt(mz.zahl.wert_m * 1000 / nenner);
      if (!(soll_pt >= MIN_MASSLINIE_PT)) continue;
      let beste = null;
      for (const st of strecken) {
        /* Die Linie muss die Zahl auch hergeben. 2 pt Sockel, weil die
           Maßlinie an den Maßhilfsstrichen um Strichbreiten übersteht. */
        if (Math.abs(st.laenge_pt - soll_pt) > Math.max(2, soll_pt * KETTE_TOLERANZ)) continue;
        const d = abstandZuStrecke(mz.x_pt, mz.y_pt, st.a, st.b);
        if (d > maxAbstand) continue;
        if (!beste || d < beste.d) beste = { d: d, st: st };
      }
      if (!beste) continue;
      const st = beste.st;
      const waag = !!st.waagerecht;
      raus.push({
        text: mz.text, meter: mz.zahl.wert_m,
        richtung: waag ? "waagerecht" : "senkrecht",
        von: waag ? Math.min(st.a.x, st.b.x) : Math.min(st.a.y, st.b.y),
        bis: waag ? Math.max(st.a.x, st.b.x) : Math.max(st.a.y, st.b.y),
        zeile: waag ? st.a.y : st.a.x,
        abstand_pt: beste.d,
      });
    }
    return raus;
  }

  /** Abschnitte zu Ketten zusammenlegen. */
  function kettenAusAbschnitten(abschnitte, nenner) {
    const gruppen = [];
    for (const a of (abschnitte || [])) {
      let g = null;
      for (const x of gruppen) {
        if (x.richtung === a.richtung && Math.abs(x.zeile - a.zeile) <= KETTE_ZEILE_PT) {
          g = x; break;
        }
      }
      if (!g) { g = { richtung: a.richtung, zeile: a.zeile, teile: [] }; gruppen.push(g); }
      g.teile.push(a);
    }
    const raus = [];
    for (const g of gruppen) {
      g.teile.sort(function (p, q) { return p.von - q.von; });
      let lauf = null;
      for (const s of g.teile) {
        if (lauf && Math.abs(s.von - lauf.bis) <= KETTE_ZEILE_PT) {
          lauf.bis = Math.max(lauf.bis, s.bis);
          lauf.summe += s.meter;
          lauf.teile.push(s);
        } else if (lauf && s.von < lauf.bis - KETTE_ZEILE_PT
                   && s.bis <= lauf.bis + KETTE_ZEILE_PT) {
          continue;              // liegt innerhalb: gehört zu einer anderen Kette
        } else {
          if (lauf) raus.push(lauf);
          lauf = { richtung: g.richtung, zeile: g.zeile, von: s.von, bis: s.bis,
                   summe: s.meter, teile: [s] };
        }
      }
      if (lauf) raus.push(lauf);
    }
    /* Spanne aus der Zeichnung, unabhängig von den abgelesenen Zahlen. Weichen
       Summe und Spanne voneinander ab, ist eine Zahl falsch zugeordnet. */
    raus.forEach(function (k) {
      k.spanne_m = ptZuMm(k.bis - k.von) * nenner / 1000;
      k.stimmig = Math.abs(k.summe - k.spanne_m) <= Math.max(0.05, k.summe * KETTE_TOLERANZ);
    });
    return raus;
  }

  /**
   * Die Außenbemaßung eines Blattes.
   * Ergebnis in derselben Form, die die zweite Lesung im Ausleseendpunkt
   * liefert (SCHEMA_GEGENPROBE.aussenbemassung), damit das Kontrollblatt beide
   * Wege ohne Umrechnung gegeneinander halten kann.
   */
  function aussenbemassungAusTextstand(o) {
    o = o || {};
    const leer = { vorhanden: false, breite_m: null, tiefe_m: null, wortlaut: "",
                   quelle: "Textstand des PDF", belegt: false, ketten: [] };
    const nenner = o.nenner;
    if (!(nenner > 0)) return leer;
    const ketten = kettenAusAbschnitten(
      abschnitteAusTextstand({ masszahlen: o.masszahlen, strecken: o.strecken,
                               nenner: nenner }), nenner)
      .filter(function (k) { return k.stimmig; });
    if (!ketten.length) return leer;

    /* Genommen wird die LÄNGSTE Kette der Richtung, nicht die am besten
       belegte. Die äußerste Maßkette ist definitionsgemäß die längste; eine
       kürzere misst einen Ausschnitt. Diese Reihenfolge ist die sichere: ein
       zu großer Umriss lässt die Restfläche wachsen und führt allenfalls zu
       einer Nachfrage, ein zu kleiner macht aus einer richtigen Raumsumme
       einen roten Fehler. Gemessen am Blatt „Cheruskerstraße_23_Grundrisse"
       S2 lieferte die zuerst gebaute Fassung, die die belegte Kette bevorzugt,
       5,44 m statt 9,75 m Tiefe — und damit genau diesen Fehlalarm. */
    function beste(richtung) {
      const eigene = ketten.filter(function (k) { return k.richtung === richtung; })
        .sort(function (a, b) { return b.summe - a.summe; });
      if (!eigene.length) return null;
      function zeugenFuer(k) {
        return eigene.filter(function (x) {
          return x !== k && Math.abs(x.zeile - k.zeile) > KETTE_ZEILE_PT
            && Math.abs(x.summe - k.summe) <= k.summe * KETTE_TOLERANZ;
        }).length;
      }
      const k = eigene[0];
      const zeugen = zeugenFuer(k);
      /* Steht die längste Kette ALLEIN da, eine KÜRZERE ist dagegen doppelt
         bemaßt, dann lässt sich am Textstand nicht entscheiden, welche das
         Gebäude misst: auf „Bauantrag_EG_24.07.2024" ist die belegte 26,00 m
         richtig und die einzelne 30,00 m fasst einen Vorbau mit, auf
         „Cheruskerstraße_23" S2 ist es umgekehrt und die längste ist richtig.
         Zwei Fälle, die sich in den Zahlen nicht unterscheiden. Geliefert wird
         trotzdem die längste — sie ist nie zu klein und damit als OBERGRENZE
         immer brauchbar —, sie gilt dann aber nicht als belegt und darf die
         Restflächenprobe nicht tragen.

         HAT die längste Kette dagegen selbst einen Zeugen, ist nichts
         strittig. GEMESSEN am Blatt „Hasenberg_10_Grundrisse" (echter Lauf,
         25.08.2026): die äußerste Kette 8,11 + 10,84 = 18,95 m steht oben,
         unten bestätigt 7,50 + 11,44 = 18,94 m dieselbe Gebäudeseite — und
         trotzdem stand konkurrenz auf true, weil ein RAUMMASS von 4,17 m auf
         beiden Maßkettenzeilen vorkam und damit als „belegte kürzere Kette"
         zählte. Auf jedem normal bemaßten Plan wiederholen sich Innenmaße
         zwischen den Kettenzeilen; die alte Regel erklärte damit fast jede
         echte Außenbemaßung für strittig, und der Bearbeiter tippte vier
         Zahlen ab, die im Fragetext schon standen. Ein kurzes Raummaß ist
         kein Konkurrent einer bezeugten Gesamtkette — Konkurrenz gibt es nur
         GEGEN eine unbezeugte. */
      const konkurrenz = !zeugen && eigene.some(function (x) {
        return x !== k && x.summe < k.summe * (1 - KETTE_TOLERANZ) && zeugenFuer(x) > 0;
      });
      return { kette: k, belegt: !!zeugen && !konkurrenz, zeugen: zeugen,
               konkurrenz: konkurrenz };
    }

    const w = beste("waagerecht");
    const s = beste("senkrecht");
    if (!w && !s) return leer;
    const worte = [];
    if (w) worte.push(w.kette.teile.map(function (t) { return t.text; }).join(" + "));
    if (s) worte.push(s.kette.teile.map(function (t) { return t.text; }).join(" + "));
    return {
      vorhanden: true,
      breite_m: w ? Math.round(w.kette.summe * 1000) / 1000 : null,
      tiefe_m: s ? Math.round(s.kette.summe * 1000) / 1000 : null,
      wortlaut: worte.join("  |  "),
      quelle: "Textstand des PDF",
      belegt: !!(w && w.belegt) && !!(s && s.belegt),
      belegt_breite: !!(w && w.belegt),
      belegt_tiefe: !!(s && s.belegt),
      zeugen_breite: w ? w.zeugen : 0,
      zeugen_tiefe: s ? s.zeugen : 0,
      teile_breite: w ? w.kette.teile.length : 0,
      teile_tiefe: s ? s.kette.teile.length : 0,
      konkurrenz: !!((w && w.konkurrenz) || (s && s.konkurrenz)),
      ketten: ketten.length,
    };
  }

  /* =========================================================================
   * Teil E — Bibliothek, Dateien, Seiten
   * =======================================================================*/

  const S = { lib: null, einrichtung: null };

  const istKnoten = (typeof document === "undefined");

  /** Wartet, bis der eingebettete pdf.js-Modulblock globalThis.pdfjsLib gesetzt hat.
   *
   *  Seit dem 24.08.2026 liegt die Hauptbibliothek inert in der Seite
   *  (text/plain) und wird erst hier, beim ersten Bedarf, als Blob-Modul
   *  geladen — pdfjsHauptLaden() in der Auslieferungsdatei. Das spart beim
   *  Öffnen der Seite das Übersetzen und Ausführen von rund 0,5 MB
   *  Bibliothek, die ohne abgelegte Datei nie gebraucht würde. Der alte
   *  Warteweg bleibt als Rückfall für Fassungen ohne den Lader. */
  function libFinden(frist_ms) {
    const frist = frist_ms === undefined ? 15000 : frist_ms;
    if (globalThis.pdfjsLib && globalThis.pdfjsLib.getDocument) {
      return Promise.resolve(globalThis.pdfjsLib);
    }
    if (typeof window !== "undefined" && typeof window.pdfjsHauptLaden === "function") {
      return window.pdfjsHauptLaden().then(function () {
        if (globalThis.pdfjsLib && globalThis.pdfjsLib.getDocument) {
          return globalThis.pdfjsLib;
        }
        throw new Error("Die PDF-Bibliothek hat sich nach dem Laden nicht "
          + "angemeldet (pdfjsLib fehlt).");
      });
    }
    return new Promise(function (gut, schlecht) {
      const start = Date.now();
      let fertigSeit = null;
      (function schauen() {
        if (globalThis.pdfjsLib && globalThis.pdfjsLib.getDocument) return gut(globalThis.pdfjsLib);
        if (globalThis.__pdfjsFehler) {
          return schlecht(new Error("Die PDF-Bibliothek konnte nicht geladen werden: "
            + globalThis.__pdfjsFehler));
        }
        /* Modulblöcke laufen unmittelbar nach dem Auswerten der Seite. Ist die
         * Seite fertig und hat sich nichts gemeldet, kommt auch nichts mehr;
         * dann muss nicht die volle Frist abgewartet werden. */
        if (!istKnoten && document.readyState === "complete") {
          if (fertigSeit === null) fertigSeit = Date.now();
          else if (Date.now() - fertigSeit > 500) {
            return schlecht(new Error("Die PDF-Bibliothek fehlt in dieser Datei. "
              + "Vermutlich ist die Auslieferungsdatei unvollständig kopiert worden."));
          }
        }
        if (Date.now() - start > frist) {
          return schlecht(new Error("Die PDF-Bibliothek ist nicht verfügbar. "
            + "Bitte die Datei neu laden."));
        }
        setTimeout(schauen, 40);
      })();
    });
  }

  /**
   * Arbeiter einrichten.
   * Über HTTPS entsteht ein echter Worker aus der eingebetteten Quelle, über
   * file:// lehnt der Browser das ab; dann wird dieselbe Quelle als Modul im
   * Hauptthread geladen. Der Worker-Build von pdf.js meldet sich dabei selbst
   * unter globalThis.pdfjsWorker an, siehe SPEZIFIKATION_FORMATE.md § 3.2.
   */
  function arbeiterEinrichten(lib) {
    if (istKnoten) return Promise.resolve("Node, Arbeiter bereits gesetzt");
    if (globalThis.pdfjsWorker || (lib.GlobalWorkerOptions && lib.GlobalWorkerOptions.workerPort)) {
      return Promise.resolve("bereits eingerichtet");
    }
    const el = document.getElementById("pdfworkerquelle");
    if (!el || !el.textContent) {
      return Promise.reject(new Error("Die Arbeiterquelle für pdf.js fehlt in der Datei."));
    }
    const adresse = URL.createObjectURL(
      new Blob([el.textContent], { type: "text/javascript" }));
    return new Promise(function (gut) {
      let entschieden = false;
      let w = null;
      try {
        w = new Worker(adresse, { type: "module" });
      } catch (e) {
        return gut(hauptthread());
      }
      w.onerror = function () {
        if (entschieden) return;
        entschieden = true;
        try { w.terminate(); } catch (e) {}
        gut(hauptthread());
      };
      setTimeout(function () {
        if (entschieden) return;
        entschieden = true;
        lib.GlobalWorkerOptions.workerPort = w;
        gut("echter Arbeiter");
      }, 700);

      function hauptthread() {
        // Ohne echten Worker läuft pdf.js im Hauptthread weiter. Das ist
        // langsamer, aber vollständig: gemessen in § 3.3 der Spezifikation.
        return import(adresse).then(function (modul) {
          if (!globalThis.pdfjsWorker) globalThis.pdfjsWorker = modul;
          return "Hauptthread";
        });
      }
    });
  }

  function bibliothekLaden() {
    if (S.lib) return Promise.resolve(S.lib);
    if (!S.einrichtung) {
      S.einrichtung = libFinden()
        .then(function (lib) {
          return arbeiterEinrichten(lib).then(function (art) {
            S.lib = lib;
            S.arbeiterart = art;
            return lib;
          });
        })
        .catch(function (e) { S.einrichtung = null; throw e; });
    }
    return S.einrichtung;
  }

  /* --- Dateiarten ------------------------------------------------------- */

  const BILDARTEN = /^image\/(jpeg|png|webp|gif)$/i;

  /* Klartext statt stiller Fehlschläge, siehe SPEZIFIKATION_FORMATE.md § 8. */
  const ABSAGEN = [
    { muster: /\.dwg$/i, text: "DWG kann das Werkzeug nicht lesen. Bitte im CAD als PDF "
      + "ausgeben (Blattgröße und Maßstab beibehalten). Das dauert zwei Minuten und "
      + "liefert ein besseres Ergebnis, weil das PDF genau das Blatt zeigt, das gemeint ist." },
    { muster: /\.dxf$/i, text: "DXF kann das Werkzeug noch nicht lesen. Bitte im CAD als "
      + "PDF ausgeben (Blattgröße und Maßstab beibehalten)." },
    { muster: /\.(heic|heif)$/i, text: "HEIC zeigt außer Safari kein Browser an. Bitte am "
      + "iPhone unter Einstellungen, Kamera, Formate auf „Maximale Kompatibilität\" stellen "
      + "oder das Bild vorher als JPEG sichern." },
    { muster: /\.tiff?$/i, text: "TIFF kann das Werkzeug nicht lesen. Bitte als PDF oder "
      + "JPEG ablegen; bei mehrseitigen Scans vom Kopierer ist PDF die bessere Wahl." },
  ];

  function dateiArt(name, typ, kopfbytes) {
    const n = String(name || "");
    if (kopfbytes && kopfbytes.length >= 5) {
      const magie = String.fromCharCode.apply(null, Array.prototype.slice.call(kopfbytes, 0, 5));
      if (magie === "%PDF-") return { art: "pdf" };
    }
    if (/^application\/pdf$/i.test(typ || "") || /\.pdf$/i.test(n)) return { art: "pdf" };
    if (BILDARTEN.test(typ || "") || /\.(jpe?g|png|webp|gif)$/i.test(n)) return { art: "bild" };
    for (const a of ABSAGEN) {
      if (a.muster.test(n)) return { art: "abgelehnt", meldung: a.text };
    }
    return { art: "abgelehnt", meldung: "Dieses Dateiformat kann das Werkzeug nicht lesen. "
      + "Bitte den Plan als PDF, JPEG oder PNG ablegen." };
  }

  function alsBytes(quelle) {
    if (!quelle) return Promise.resolve(new Uint8Array(0));
    if (quelle instanceof Uint8Array) return Promise.resolve(quelle);
    if (typeof ArrayBuffer !== "undefined" && quelle instanceof ArrayBuffer) {
      return Promise.resolve(new Uint8Array(quelle));
    }
    if (typeof quelle.arrayBuffer === "function") {
      return quelle.arrayBuffer().then(function (p) { return new Uint8Array(p); });
    }
    return Promise.reject(new Error("Die Datei lässt sich nicht lesen."));
  }

  /** Fehlermeldungen von pdf.js in Klartext übersetzen. */
  function fehlerKlartext(e) {
    const name = (e && (e.name || (e.constructor && e.constructor.name))) || "";
    const text = (e && e.message) || "";
    if (/Password/i.test(name)) {
      return "Das PDF ist passwortgeschützt. Bitte den Schutz im Ausgabeprogramm "
        + "entfernen oder eine ungeschützte Fassung anfordern.";
    }
    if (/InvalidPDF/i.test(name) || /Invalid PDF|empty/i.test(text)) {
      return "Die Datei ist beschädigt oder kein gültiges PDF. Bitte neu ausgeben "
        + "und noch einmal hochladen.";
    }
    if (/Missing PDF|Unexpected server/i.test(text)) {
      return "Die Datei konnte nicht vollständig gelesen werden.";
    }
    return "Das PDF konnte nicht geöffnet werden: " + (text || name || "unbekannter Fehler");
  }

  /* --- Seiten ----------------------------------------------------------- */

  /**
   * Eine hochgeladene Datei in eine Liste von Seiten verwandeln.
   * Bilder ergeben genau eine Seite, damit der Rest des Werkzeugs beide
   * Fälle gleich behandeln kann.
   */
  function dateiOeffnen(datei, optionen) {
    const opt = optionen || {};
    const name = datei && (datei.name || opt.name) || "";
    const typ = datei && (datei.type || opt.typ) || "";
    return alsBytes(datei).then(function (bytes) {
      const art = dateiArt(name, typ, bytes);
      if (art.art === "abgelehnt") {
        return { ok: false, art: "abgelehnt", meldung: art.meldung, seiten: [] };
      }
      if (art.art === "bild") return bildAlsSeite(datei, name, typ, bytes);
      return pdfOeffnen(bytes, name, opt);
    }).catch(function (e) {
      return { ok: false, art: "fehler", meldung: fehlerKlartext(e), seiten: [] };
    });
  }

  function bildAlsSeite(datei, name, typ, bytes) {
    return new Promise(function (gut) {
      const seite = {
        nr: 1, quelle: "bild", name: name, typ: "scan",
        typBefund: "Bilddatei, kein Dokument mit Textlayer. Maßzahlen und "
          + "Raumnamen müssen aus dem Bild gelesen werden, der Maßstab von Hand.",
        breite_mm: null, hoehe_mm: null, drehung: 0,
        hatTextlayer: false, bytes: bytes,
        // Ein Bild bringt keine Geometrie mit; alles kommt aus der Bildauslese.
        kacheln_noetig: true,
        textstuecke: [], masszahlen: [], raumstempel: [], raumbloecke: [],
        geschosstitel: [], strecken: [], zuege: [],
        pfadzahl: 0, bilder: [], blattkopf: blattkopfLesen([]),
        objektangaben: objektangabenLesen([]),
        massstab: massstabBestimmen({}),
        kachelplan: function () { return kachelplan({ breite_px: 0, hoehe_px: 0 }); },
        flaechen: function () { return []; },
        /* Ein Bild hat keine Dokumentkoordinaten; es gibt hier nichts
           umzurechnen. Die Funktion steht trotzdem, damit der Aufrufer nicht
           je Seitenart eine andere Fallunterscheidung braucht. */
        lageAnteil: function () { return null; },
      };
      if (istKnoten || typeof URL === "undefined" || typeof Image === "undefined") {
        seite.rendern = function () {
          return Promise.reject(new Error("Bilder rendern nur im Browser."));
        };
        return gut({ ok: true, art: "bild", seiten: [seite], meldung: null });
      }
      const url = URL.createObjectURL(datei);
      const bild = new Image();
      bild.onload = function () {
        seite.breite_px = bild.naturalWidth;
        seite.hoehe_px = bild.naturalHeight;
        seite.kachelplan = function () {
          return kachelplan({ breite_px: bild.naturalWidth, hoehe_px: bild.naturalHeight });
        };
        seite.vorschau = function () { return Promise.resolve(url); };
        seite.rendern = function () {
          return Promise.resolve({ bild: bild, breite: bild.naturalWidth,
                                   hoehe: bild.naturalHeight, dataUrl: url });
        };
        gut({ ok: true, art: "bild", seiten: [seite], meldung: null });
      };
      bild.onerror = function () {
        gut({ ok: false, art: "fehler", seiten: [],
              meldung: "Das Bild konnte nicht gelesen werden." });
      };
      bild.src = url;
    });
  }

  function pdfOeffnen(bytes, name, opt) {
    return bibliothekLaden().then(function (lib) {
      const parameter = { data: bytes, isEvalSupported: false };
      if (opt.passwort) parameter.password = opt.passwort;
      // Nachladbare Decoder nur dort anmelden, wo es ein Netz gibt.
      // Ohne Netz betrifft das nach der Erhebung in § 8.1 kein einziges
      // der 1.541 gefundenen Bilder (JBIG2 und JPEG 2000 kamen nie vor).
      if (!istKnoten && opt.wasmUrl) parameter.wasmUrl = opt.wasmUrl;

      const auftrag = lib.getDocument(parameter);
      if (auftrag.onPassword !== undefined && typeof opt.passwortGeber === "function") {
        auftrag.onPassword = function (weiter, grund) {
          const p = opt.passwortGeber(grund);
          if (p) weiter(p); else auftrag.destroy();
        };
      }
      return auftrag.promise.then(function (dok) {
        const auftraege = [];
        for (let i = 1; i <= dok.numPages; i++) auftraege.push(seiteLesen(lib, dok, i));
        return Promise.all(auftraege).then(function (seiten) {
          return { ok: true, art: "pdf", name: name, dokument: dok,
                   seitenzahl: dok.numPages, seiten: seiten, meldung: null };
        });
      });
    });
  }

  /** Eine Seite untersuchen: Maß, Typ, Text, Pfade — alles ohne Modellaufruf. */
  function seiteLesen(lib, dok, nr) {
    return dok.getPage(nr).then(function (p) {
      const sicht = p.getViewport({ scale: 1 });
      const seite = {
        nr: nr, quelle: "pdf", pdfSeite: p, drehung: p.rotate || 0,
        breite_pt: sicht.width, hoehe_pt: sicht.height,
        breite_mm: ptZuMm(sicht.width), hoehe_mm: ptZuMm(sicht.height),
        format: blattformat(ptZuMm(sicht.width), ptZuMm(sicht.height)),
      };
      return Promise.all([p.getTextContent(), p.getOperatorList()])
        .then(function (beides) {
          const stuecke = textstueckeOrdnen(beides[0].items);
          const inhalt = operatorenAuswerten(lib, beides[1]);

          seite.textstuecke = stuecke;
          seite.hatTextlayer = stuecke.length > 0;
          seite.pfadzahl = inhalt.pfade;
          seite.bilder = inhalt.bilder;
          seite.zuege = inhalt.zuege;
          seite.strecken = streckenAus(inhalt.zuege);

          const t = seitentypBestimmen({
            textstuecke: stuecke.length, pfade: inhalt.pfade,
            bilder: inhalt.bilder.length,
          });
          seite.typ = t.typ;
          seite.typBefund = t.befund;
          seite.kacheln_noetig = t.kacheln_noetig;

          seite.blattkopf = blattkopfLesen(stuecke);
          /* Objektangaben aus dem Schriftfeld. Kostet nichts und geschieht
             beim Oeffnen; die Postleitzahl schaltet damit den Klimadatensatz
             frei, bevor ueberhaupt ein Modellaufruf stattgefunden hat. */
          seite.objektangaben = objektangabenLesen(stuecke);
          seite.kleinste_versalhoehe_mm = kleinsteVersalhoehe(stuecke);
          seite.dpi_nativ = nativeAufloesung(inhalt.bilder);
          seite.aufloesung = renderauflösung({
            kleinste_versalhoehe_mm: seite.kleinste_versalhoehe_mm,
            dpi_nativ: seite.dpi_nativ,
          });

          seite.masszahlen = stuecke.map(function (s) {
            const z = masszahlLesen(s.text);
            return z ? { text: s.text, x_pt: s.x_pt, y_pt: s.y_pt, zahl: z } : null;
          }).filter(Boolean);
          seite.raumstempel = stuecke.map(function (s) {
            const r = raumstempelLesen(s.text);
            return (r && (r.A_m2 !== null || r.U_m !== null))
              ? { x_pt: s.x_pt, y_pt: s.y_pt, stempel: r } : null;
          }).filter(Boolean);

          /* Raumbeschriftungen als Block: Name plus angeschriebene Fläche.
             Kostet nichts, geschieht beim Ablegen und ist die einzige
             Flächenangabe im ganzen Werkzeug, die weder gemessen noch
             geschätzt ist. */
          seite.raumbloecke = raumbloeckeLesen(stuecke);
          seite.geschosstitel = geschosstitelLesen(stuecke);

          seite.geometrie_massstab = massstabAusGeometrie({
            masszahlen: seite.masszahlen, strecken: seite.strecken,
          });
          seite.massstab = massstabBestimmen({
            nenner_vermerk: seite.blattkopf.massstab_nenner,
            geometrie: seite.geometrie_massstab,
          });

          /* Die Außenbemaßung fällt beim Öffnen mit an und kostet nichts: die
             Maßzahlen und die Strecken liegen ohnehin da. Sie muss HIER
             entstehen, denn beides wird nicht mit dem Projekt gespeichert
             (SEITENFELDER in app.js); nach dem Wiederherstellen gäbe es sie
             nicht mehr. Gerechnet wird mit dem bestimmten Maßstab, ersatzweise
             mit dem Vermerk im Schriftfeld. */
          seite.aussenbemassung = aussenbemassungAusTextstand({
            masszahlen: seite.masszahlen, strecken: seite.strecken,
            nenner: seite.massstab.nenner || seite.blattkopf.massstab_nenner,
          });

          /* DOKUMENTKOORDINATEN IN ANTEILE DES GERENDERTEN BLATTES.
           *
           * Alles, was MODUL_PDF an Lage liefert -- Textstücke, Flächen-
           * stempel, Linienzüge -- steht in PDF-Punkten mit Ursprung links
           * UNTEN und ohne Rücksicht auf die Drehung der Seite. Das gerenderte
           * Bild hat seinen Ursprung links OBEN und ist gedreht. Wer beides
           * verwechselt, legt seine Marken spiegelverkehrt auf den Plan, und
           * bei einem quer eingescannten Bogen um 90 Grad daneben.
           *
           * Umgerechnet wird deshalb nicht von Hand, sondern von pdf.js
           * selbst: die Sicht kennt die Drehung und rechnet sie mit. Sie wird
           * einmal geholt und gemerkt, weil diese Umrechnung bei einer
           * Vektorzeichnung mit zwanzigtausend Pfaden hunderttausendfach
           * läuft.
           *
           * Das Ergebnis sind ANTEILE (0 bis 1). Sie gelten für jede
           * Auflösung und lassen sich mit dem Projekt speichern; Bildpunkte
           * gelten nur für die Auflösung, bei der sie entstanden sind. */
          let sichtEins = null;
          seite.lageAnteil = function (x_pt, y_pt) {
            if (!(Number.isFinite(x_pt) && Number.isFinite(y_pt))) return null;
            if (!sichtEins) {
              try { sichtEins = p.getViewport({ scale: 1 }); } catch (e) { return null; }
            }
            if (!sichtEins || !(sichtEins.width > 0 && sichtEins.height > 0)) return null;
            const q = sichtEins.convertToViewportPoint(x_pt, y_pt);
            return { x: q[0] / sichtEins.width, y: q[1] / sichtEins.height };
          };

          seite.vorschau = function (skala) { return seiteMalen(p, { skala: skala || 0.25 }); };
          seite.rendern = function (o) { return seiteMalen(p, o || {}); };
          seite.kachelplan = function (dpi) {
            const s = dpiZuSkala(dpi || seite.aufloesung.dpi);
            return kachelplan({ breite_px: Math.ceil(seite.breite_pt * s),
                                hoehe_px: Math.ceil(seite.hoehe_pt * s) });
          };
          seite.flaechen = function () {
            const n = seite.massstab.belastbar ? seite.massstab.nenner : null;
            return (inhalt.zuege || [])
              .filter(function (z) { return z.geschlossen && z.punkte.length >= 4; })
              .map(function (z) { return flaecheAusZug(z, n); })
              .filter(Boolean);
          };
          return seite;
        });
    });
  }

  /**
   * Operatorliste auszählen: Pfade, Bilder mit ihrer gezeichneten Größe.
   * Die Transformationsmatrix wird mitgeführt, weil nur so die native
   * Auflösung eines Scans herauskommt (SPEZIFIKATION_FORMATE.md § 5.2).
   */
  function operatorenAuswerten(lib, liste) {
    const OPS = lib.OPS;
    const zuege = [];
    const bilder = [];
    let pfade = 0;
    let ctm = [1, 0, 0, 1, 0, 0];
    const stapel = [];

    for (let i = 0; i < liste.fnArray.length; i++) {
      const fn = liste.fnArray[i];
      const args = liste.argsArray[i];
      if (fn === OPS.save) { stapel.push(ctm.slice()); continue; }
      if (fn === OPS.restore) { ctm = stapel.pop() || [1, 0, 0, 1, 0, 0]; continue; }
      if (fn === OPS.transform) { ctm = matrixMal(ctm, args); continue; }
      /* Ein Form-XObject bringt eine eigene Matrix mit. pdf.js sichert dabei
       * den Zustand und wendet die Matrix an (pdf.min.mjs, paintFormXObjectBegin:
       * save, dann transform); hier wird genau das nachgezogen. */
      if (fn === OPS.paintFormXObjectBegin) {
        stapel.push(ctm.slice());
        if (args && args[0]) ctm = matrixMal(ctm, args[0]);
        continue;
      }
      if (fn === OPS.paintFormXObjectEnd) {
        ctm = stapel.pop() || [1, 0, 0, 1, 0, 0];
        continue;
      }
      if (fn === OPS.constructPath) {
        pfade++;
        const feld = args && args[1] && args[1][0];
        if (feld && feld.length) {
          const a = pfadAufloesen(feld);
          for (const z of a.zuege) zuege.push(zugUmrechnen(z, ctm));
        }
        continue;
      }
      if (fn === OPS.paintImageXObject || fn === OPS.paintImageMaskXObject
          || fn === OPS.paintInlineImageXObject) {
        const b = bildmass(fn, args, ctm, OPS);
        if (b) bilder.push(b);
      }
    }
    return { pfade: pfade, zuege: zuege, bilder: bilder };
  }

  function matrixMal(m, n) {
    // [a b c d e f] als 2x3-Matrix, n wird auf m angewandt
    return [
      n[0] * m[0] + n[1] * m[2],
      n[0] * m[1] + n[1] * m[3],
      n[2] * m[0] + n[3] * m[2],
      n[2] * m[1] + n[3] * m[3],
      n[4] * m[0] + n[5] * m[2] + m[4],
      n[4] * m[1] + n[5] * m[3] + m[5],
    ];
  }

  function bildmass(fn, args, ctm, OPS) {
    // Ein Bild wird immer ins Einheitsquadrat gezeichnet; die gezeichnete
    // Größe steckt deshalb vollständig in der laufenden Matrix.
    const breite_pt = Math.hypot(ctm[0], ctm[1]);
    const hoehe_pt = Math.hypot(ctm[2], ctm[3]);
    let breite_px = 0, hoehe_px = 0;
    if (fn === OPS.paintInlineImageXObject) {
      const bild = args && args[0];
      breite_px = (bild && bild.width) || 0;
      hoehe_px = (bild && bild.height) || 0;
    } else {
      breite_px = (args && args[1]) || 0;
      hoehe_px = (args && args[2]) || 0;
    }
    if (!(breite_px > 0) || !(breite_pt > 0)) return null;
    return { breite_px: breite_px, hoehe_px: hoehe_px,
             breite_pt: breite_pt, hoehe_pt: hoehe_pt };
  }

  /**
   * Seitentyp ohne Modellaufruf.
   * Regel nach SPEZIFIKATION_FORMATE.md § 6.1 und § 7.4.
   */
  function seitentypBestimmen(z) {
    z = z || {};
    const text = z.textstuecke || 0;
    const pfade = z.pfade || 0;
    const bilder = z.bilder || 0;
    const vielePfade = pfade >= MIN_PFADE_ZEICHNUNG;

    if (vielePfade && bilder > 0) {
      return { typ: "mischblatt", kacheln_noetig: true,
        befund: "Zeichnung mit eingebettetem Bild (" + pfade + " Pfade, " + bilder
          + " Bilder). Wird wie eine Vektorzeichnung ausgewertet und zusätzlich gekachelt." };
    }
    if (vielePfade && text > 0) {
      return { typ: "vektorplan", kacheln_noetig: false,
        befund: "Vektorzeichnung mit Textlayer (" + pfade + " Pfade, " + text
          + " Textstücke). Geometrie und Maßzahlen kommen exakt aus dem Dokument." };
    }
    if (vielePfade) {
      return { typ: "vektorplan_ohne_text", kacheln_noetig: true,
        befund: "Vektorzeichnung ohne Textlayer (" + pfade + " Pfade). Die Schrift wurde "
          + "beim Ausgeben in Kurven gewandelt; Maßzahlen müssen aus dem Bild gelesen werden." };
    }
    if (bilder > 0) {
      return { typ: "scan", kacheln_noetig: true,
        befund: "Gescannte Seite (" + bilder + " Bild" + (bilder === 1 ? "" : "er")
          + ", keine Zeichnungspfade). Wird gekachelt ausgelesen." };
    }
    if (text > 0) {
      return { typ: "textseite", kacheln_noetig: false,
        befund: "Textseite (" + text + " Textstücke, keine Zeichnung). Kein Plan; der Text "
          + "geht als Bauteilangabe in den Fragebogen, nicht ins Raumbuch." };
    }
    return { typ: "leer", kacheln_noetig: false,
      befund: "Die Seite enthält weder Text noch Zeichnung noch ein lesbares Bild. "
        + "Möglich ist eine ungewöhnliche Bildkompression; dann bitte das PDF neu ausgeben." };
  }

  function blattformat(b_mm, h_mm) {
    const lang = Math.max(b_mm, h_mm), kurz = Math.min(b_mm, h_mm);
    const reihe = [["A0", 1189, 841], ["A1", 841, 594], ["A2", 594, 420],
                   ["A3", 420, 297], ["A4", 297, 210], ["A5", 210, 148]];
    for (const [name, l, k] of reihe) {
      if (Math.abs(lang - l) <= 3 && Math.abs(kurz - k) <= 3) {
        return name + (b_mm >= h_mm ? " quer" : " hoch");
      }
    }
    return Math.round(b_mm) + " x " + Math.round(h_mm) + " mm";
  }

  /**
   * Eine Seite malen, wahlweise als Kachel mit versetztem Ursprung.
   * intent "print" ist Pflicht und kein Beiwerk: mit dem Standardwert benutzt
   * pdf.js requestAnimationFrame, und in einem verdeckten Fenster hält der
   * Browser das an — das Rendern bleibt dann ohne Fehlermeldung stehen
   * (SPEZIFIKATION_FORMATE.md § 3.4 b, pdf.mjs Z. 22083).
   */
  /**
   * Masse fuer einen Ausschnitt: welche Skala und welcher Bildausschnitt
   * gemalt werden muessen, damit das Rechteck die laengste verwertbare Kante
   * ausfuellt. Reine Rechnung, ohne Canvas, damit der Selbsttest sie prueft.
   *
   * @param vb, vh   Blattmasse bei Skala 1 (Punkte)
   * @param a        {x, y, x2, y2} in Anteilen der Blattkante
   * @param kante    laengste Kante des Ergebnisses in Bildpunkten
   */
  function ausschnittMasse(vb, vh, a, kante) {
    const k = kante || 2576;
    const ax = Math.max(0, Math.min(1, a.x)), ay = Math.max(0, Math.min(1, a.y));
    const bx = Math.max(0.02, Math.min(1, a.x2) - ax);
    const by = Math.max(0.02, Math.min(1, a.y2) - ay);
    const sk = k / Math.max(vb * bx, vh * by);
    return { skala: sk,
             x: Math.round(vb * sk * ax), y: Math.round(vh * sk * ay),
             breite: Math.round(vb * sk * bx), hoehe: Math.round(vh * sk * by),
             ausschnittGemalt: true };
  }

  function seiteMalen(p, o) {
    if (istKnoten) return Promise.reject(new Error("Rendern braucht einen Browser."));
    /* AUSSCHNITT: ein Rechteck in Anteilen der Blattkante, {x, y, x2, y2}.
       Es wird so gross gemalt, dass seine laengere Kante die vom Modell
       hoechstens verwertbare Kante ausfuellt. Genau darin liegt der Gewinn:
       ein Bogen, auf dem die Zeichnung ein Drittel der Breite einnimmt,
       verschenkt sonst zwei Drittel der Bildpunkte an weisses Papier.
       GEMESSEN am A1-Bogen "Dumach 1": das ganze Blatt kommt mit 78 dpi an,
       ein einzelnes Geschossfeld daraus mit 215 bis 282 dpi. */
    /* Die Kennzeichnung MUSS festgehalten werden, BEVOR o umgeschrieben wird.
       Sie stand einmal danach und las das bereits ersetzte o -- der Aufrufer
       bekam ausschnittGemalt false und schnitt aus dem schon zugeschnittenen
       Bild ein zweites Mal denselben Anteil heraus. Am Bogen "Dumach 1" kamen
       dadurch statt 25 nur 7 Raeume an. Deshalb kommt beides jetzt aus einer
       Hand: ausschnittMasse() rechnet und sagt zugleich, dass geschnitten
       wurde, und der Selbsttest prueft genau das. */
    const hatAusschnitt = !!(o && o.ausschnitt);
    if (hatAusschnitt) {
      const voll = p.getViewport({ scale: 1 });
      o = ausschnittMasse(voll.width, voll.height, o.ausschnitt, o.maxKante);
    }
    const skala = o.skala || dpiZuSkala(o.dpi || 150);
    const sicht = p.getViewport({ scale: skala });
    const versatzX = o.x || 0, versatzY = o.y || 0;
    const breite = Math.max(1, Math.round(o.breite || (sicht.width - versatzX)));
    const hoehe = Math.max(1, Math.round(o.hoehe || (sicht.height - versatzY)));

    const c = document.createElement("canvas");
    c.width = breite; c.height = hoehe;
    const ctx = c.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, breite, hoehe);

    return p.render({
      canvasContext: ctx, viewport: sicht, intent: "print",
      transform: [1, 0, 0, 1, -versatzX, -versatzY],
    }).promise.then(function () {
      return {
        canvas: c, breite: breite, hoehe: hoehe, skala: skala,
        dpi: skalaZuDpi(skala),
        /* Sagt dem Aufrufer, dass der Ausschnitt hier schon beruecksichtigt
           ist und nicht noch einmal aus dem Bild geschnitten werden darf.
           Eine Bilddatei kann das nicht und wird oben zugeschnitten. */
        ausschnittGemalt: hatAusschnitt,
        dataUrl: function (guete) {
          return c.toDataURL("image/jpeg", guete === undefined ? 0.85 : guete);
        },
      };
    });
  }

  /** Kostenrahmen vor dem Auslesen, siehe SPEZIFIKATION_FORMATE.md § 6.3. */
  function kostenrahmen(seiten) {
    let kacheln = 0, token = 0;
    for (const s of (seiten || [])) {
      if (!s || !s.kacheln_noetig) continue;
      const plan = typeof s.kachelplan === "function" ? s.kachelplan() : null;
      if (!plan) continue;
      kacheln += plan.anzahl;
      token += plan.bildtoken;
    }
    // je bestätigter Planseite zusätzlich ein Übersichtsdurchlauf, § 5.6
    const uebersichten = (seiten || []).filter(function (s) { return s && s.kacheln_noetig; }).length;
    token += uebersichten * TOKEN_GRENZE;
    return {
      kacheln: kacheln, uebersichten: uebersichten, bildtoken: token,
      kosten_usd: token / 1e6 * PREIS_JE_MIO_TOKEN_USD,
    };
  }

  /* =========================================================================
   * Teil F — Selbsttest
   * =======================================================================*/

  /**
   * Ein minimales, gültiges PDF als Zeichenkette bauen.
   * pdf.js kann nur lesen, nicht schreiben; das Prüfstück entsteht deshalb von
   * Hand, mit richtig gerechneten xref-Versätzen.
   *
   * Gezeichnet ist ein Rechteck von 354,1 x 247,7 pt. Das sind 124,92 x 87,39 mm
   * und im Maßstab 1:100 genau die 12,49 x 8,74 m aus der Messung in
   * SPEZIFIKATION_FORMATE.md § 7.1.
   *
   * Dazu kommen acht offene Innenwandlinien. Sie sind kein Beiwerk: ohne sie
   * bliebe das Blatt bei einem einzigen Pfad und würde von der Regel aus § 6.1
   * als Textseite eingeordnet. Ihre Mitten liegen alle weiter als 45 pt von
   * den beiden Maßzahlen entfernt, damit die Maßstabsbestimmung sie nicht
   * fälschlich als zugehörige Maßlinie greift.
   */
  function pruefPdf(o) {
    o = o || {};
    const drehung = o.drehung || 0;
    /* Mit „ctm" wird die Zeichnung in einem eigenen, größeren Koordinatenraum
     * abgelegt und per cm verkleinert — genau so, wie es echte CAD-Ausgaben
     * tun. Am Ergebnis darf sich dadurch nichts ändern. */
    const c = o.ctm || 1;
    const k = (n) => (n / c).toFixed(4);
    const striche = [
      // Außenwand, geschlossen: 354,1 x 247,7 pt
      k(198.4) + " " + k(367.4) + " m " + k(552.5) + " " + k(367.4) + " l "
        + k(552.5) + " " + k(615.1) + " l " + k(198.4) + " " + k(615.1) + " l h S",
      // Innenwände, jede ein eigener Pfad
      k(380) + " " + k(367.4) + " m " + k(380) + " " + k(615.1) + " l S",
      k(198.4) + " " + k(500) + " m " + k(380) + " " + k(500) + " l S",
      k(380) + " " + k(450) + " m " + k(552.5) + " " + k(450) + " l S",
      k(470) + " " + k(367.4) + " m " + k(470) + " " + k(450) + " l S",
      k(230) + " " + k(540) + " m " + k(300) + " " + k(540) + " l S",
      k(300) + " " + k(540) + " m " + k(300) + " " + k(615.1) + " l S",
      k(420) + " " + k(500) + " m " + k(420) + " " + k(615.1) + " l S",
      k(420) + " " + k(560) + " m " + k(552.5) + " " + k(560) + " l S",
    ];
    const zeichnung = c === 1
      ? striche.join("\n")
      : "q " + c + " 0 0 " + c + " 0 0 cm\n" + striche.join("\n") + "\nQ";
    const inhalt = [
      "1 w 0 G",
      zeichnung,
      // Beschriftung
      "BT /F1 8.1 Tf 350 355 Td (12,49) Tj ET",
      "BT /F1 8.1 Tf 560 480 Td (8,74) Tj ET",
      "BT /F1 20.25 Tf 56.7 780 Td (M 1:100) Tj ET",
      "BT /F1 9.9 Tf 300 500 Td (Wohnen) Tj ET",
      "BT /F1 8.1 Tf 300 486 Td (A=109,16m2 U=42,46m) Tj ET",
      "BT /F1 12 Tf 700 800 Td (Grundriss Erdgeschoss) Tj ET",
    ].join("\n");
    const objekte = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1190.55 841.89] /Rotate " + drehung
        + " /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      "<< /Length " + inhalt.length + " >>\nstream\n" + inhalt + "\nendstream",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let pdf = "%PDF-1.4\n";
    const versatz = [0];
    objekte.forEach(function (ob, i) {
      versatz.push(pdf.length);
      pdf += (i + 1) + " 0 obj\n" + ob + "\nendobj\n";
    });
    const xref = pdf.length;
    pdf += "xref\n0 " + (objekte.length + 1) + "\n0000000000 65535 f \n";
    for (let i = 1; i <= objekte.length; i++) {
      pdf += String(versatz[i]).padStart(10, "0") + " 00000 n \n";
    }
    pdf += "trailer\n<< /Size " + (objekte.length + 1) + " /Root 1 0 R >>\nstartxref\n"
      + xref + "\n%%EOF\n";
    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return bytes;
  }

  const nah = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 1e-6 : t);

  /** Reine Prüfungen, ohne pdf.js und ohne Browser. */
  function selbsttest() {
    const f = [];
    let n = 0;
    const pruefe = (bedingung, meldung) => { n++; if (!bedingung) f.push(meldung); };

    /* --- Umrechnungen --- */
    pruefe(nah(ptZuMm(72), 25.4, 1e-9), "72 pt müssen 25,4 mm sein");
    pruefe(nah(mmZuPt(25.4), 72, 1e-9), "25,4 mm müssen 72 pt sein");
    // § 5.1: 7,91 pt Helvetica ergeben die eingezeichneten 2,00 mm Versalhöhe
    pruefe(nah(versalhoeheMm(7.91), 2.0, 0.01),
      "7,91 pt müssen 2,00 mm Versalhöhe ergeben, sind " + versalhoeheMm(7.91).toFixed(3));

    /* --- Renderauflösung, § 5.2 --- */
    const a1 = renderauflösung({ kleinste_versalhoehe_mm: 2.0 });
    pruefe(nah(a1.dpi, 355.6, 0.5), "2,0 mm brauchen 356 dpi, sind " + a1.dpi.toFixed(1));
    const a2 = renderauflösung({ kleinste_versalhoehe_mm: 1.3 });
    pruefe(nah(a2.dpi, DPI_DECKEL, 0.01), "1,3 mm müssen auf den Deckel 356 dpi laufen");
    const a3 = renderauflösung({ kleinste_versalhoehe_mm: 2.0, dpi_nativ: 300 });
    pruefe(nah(a3.dpi, 300, 0.01), "Ein 300-dpi-Scan darf nicht höher gerendert werden");
    pruefe(/native/.test(a3.grund), "Der Grund muss den Scan nennen");
    const a4 = renderauflösung({ kleinste_versalhoehe_mm: 5.0 });
    pruefe(a4.dpi < 200, "5 mm Schrift brauchen keine 356 dpi");

    /* --- Bildtoken und Kachelplan, § 5.5 --- */
    pruefe(bildtoken(1932, 1932) === 4761, "1932 px ergeben 69x69 = 4761 Bildtoken");
    pruefe(bildtoken(1932, 1932) < TOKEN_GRENZE, "Eine Kachel muss unter 4784 Token bleiben");
    // A3 quer bei 254 dpi -> 6 Kacheln
    const k254 = kachelplan({ breite_px: Math.ceil(1190.55 * 254 / 72),
                              hoehe_px: Math.ceil(841.89 * 254 / 72) });
    pruefe(k254.anzahl === 6, "A3 bei 254 dpi muss 6 Kacheln ergeben, sind " + k254.anzahl);
    // A3 quer bei 356 dpi -> 12 Kacheln
    const k356 = kachelplan({ breite_px: Math.ceil(1190.55 * 356 / 72),
                              hoehe_px: Math.ceil(841.89 * 356 / 72) });
    pruefe(k356.anzahl === 12, "A3 bei 356 dpi muss 12 Kacheln ergeben, sind " + k356.anzahl);
    // A1 quer bei 254 dpi -> 20 Kacheln, 95.220 Bildtoken, rund 0,19 USD
    const kA1 = kachelplan({ breite_px: Math.ceil(mmZuPt(841) * 254 / 72),
                             hoehe_px: Math.ceil(mmZuPt(594) * 254 / 72) });
    pruefe(kA1.anzahl === 20, "A1 bei 254 dpi muss 20 Kacheln ergeben, sind " + kA1.anzahl);
    pruefe(nah(kA1.kosten_usd, 0.19, 0.02),
      "A1 muss rund 0,19 USD kosten, sind " + kA1.kosten_usd.toFixed(3));
    // Ein Blatt kleiner als eine Kachel bleibt eine Kachel
    pruefe(kachelplan({ breite_px: 800, hoehe_px: 600 }).anzahl === 1,
      "Ein kleines Blatt braucht genau eine Kachel");
    // Kacheln müssen das Blatt lückenlos decken
    const deckung = kachelplan({ breite_px: 5000, hoehe_px: 3000 });
    let luecke = false;
    for (let i = 1; i < deckung.spalten; i++) {
      const links = deckung.kacheln[i - 1], rechts = deckung.kacheln[i];
      if (rechts.x > links.x + links.breite) luecke = true;
    }
    pruefe(!luecke, "Zwischen den Kacheln darf keine Lücke bleiben");

    /* --- Kostenrahmen, § 5.5 und § 6.3 --- */
    const a3plan = () => kachelplan({ breite_px: 4203, hoehe_px: 2972 });
    const kr = kostenrahmen([
      { kacheln_noetig: true, kachelplan: a3plan },
      { kacheln_noetig: false, kachelplan: a3plan },   // Vektorplan, wird nicht gekachelt
    ]);
    pruefe(kr.kacheln === 6, "Nur die bestätigte Planseite wird gekachelt, sind " + kr.kacheln);
    pruefe(kr.uebersichten === 1, "Je gekachelter Seite ein Übersichtsdurchlauf");
    pruefe(kr.bildtoken === 6 * 4761 + TOKEN_GRENZE,
      "6 Kacheln plus Übersicht ergeben " + (6 * 4761 + TOKEN_GRENZE) + " Bildtoken, sind "
        + kr.bildtoken);
    pruefe(nah(kr.kosten_usd, kr.bildtoken / 1e6 * 2, 1e-9), "Der Preis muss 2 USD je Mio sein");
    pruefe(kostenrahmen([]).kacheln === 0, "Ohne Seiten keine Kosten");
    pruefe(kostenrahmen(null).kacheln === 0, "null darf nicht werfen");

    /* --- native Auflösung, § 5.2 --- */
    // 3510 px auf 297 mm gezeichnet sind 300 dpi
    const dpiN = nativeAufloesung([{ breite_px: 3510, hoehe_px: 2480, breite_pt: mmZuPt(297),
                                     hoehe_pt: mmZuPt(210) }]);
    pruefe(nah(dpiN, 300, 0.5), "3510 px auf 297 mm sind 300 dpi, sind " + (dpiN || 0).toFixed(1));
    pruefe(nativeAufloesung([]) === null, "Ohne Bilder gibt es keine native Auflösung");
    pruefe(nativeAufloesung([{ breite_px: 0, breite_pt: 100 }]) === null,
      "Ein Bild ohne Bildpunkte darf keine Auflösung ergeben");

    /* --- Seitentyp, § 6.1 --- */
    pruefe(seitentypBestimmen({ textstuecke: 47, bilder: 0, pfade: 12 }).typ === "vektorplan",
      "47 Textstücke und 12 Pfade sind ein Vektorplan");
    pruefe(seitentypBestimmen({ textstuecke: 0, bilder: 1, pfade: 0 }).typ === "scan",
      "Ein Bild ohne Text ist ein Scan");
    pruefe(seitentypBestimmen({ textstuecke: 3, bilder: 0, pfade: 0 }).typ === "textseite",
      "Text ohne Pfade und ohne Bild ist eine Textseite");
    pruefe(seitentypBestimmen({ textstuecke: 0, bilder: 0, pfade: 0 }).typ === "leer",
      "Eine leere Seite muss als leer gelten");
    pruefe(seitentypBestimmen({ textstuecke: 20, bilder: 2, pfade: 900 }).typ === "mischblatt",
      "Pfade und Bild zusammen sind ein Mischblatt");
    pruefe(seitentypBestimmen({ textstuecke: 20, bilder: 2, pfade: 900 }).kacheln_noetig,
      "Ein Mischblatt muss zusätzlich gekachelt werden");
    pruefe(seitentypBestimmen({ textstuecke: 0, bilder: 0, pfade: 6463 }).typ
      === "vektorplan_ohne_text", "Viele Pfade ohne Text: Schrift wurde in Kurven gewandelt");
    pruefe(!seitentypBestimmen({ textstuecke: 47, bilder: 0, pfade: 12 }).kacheln_noetig,
      "Ein Vektorplan mit Textlayer muss nicht gekachelt werden");

    /* --- Blattformat --- */
    pruefe(blattformat(420, 297) === "A3 quer", "420x297 mm ist A3 quer");
    pruefe(blattformat(210, 297) === "A4 hoch", "210x297 mm ist A4 hoch");
    pruefe(blattformat(841, 594) === "A1 quer", "841x594 mm ist A1 quer");
    pruefe(/mm/.test(blattformat(500, 400)), "Ein krummes Maß wird in mm ausgegeben");

    /* --- Maßstabsvermerk --- */
    pruefe(massstabAusVermerk("M 1:100") === 100, "M 1:100 muss 100 ergeben");
    pruefe(massstabAusVermerk("Maßstab 1:50") === 50, "Maßstab 1:50 muss 50 ergeben");
    pruefe(massstabAusVermerk("M1:200") === 200, "M1:200 muss 200 ergeben");
    pruefe(massstabAusVermerk("1 : 100") === 100, "1 : 100 mit Leerzeichen muss gehen");
    pruefe(massstabAusVermerk("Blatt 1 von 3") === null,
      "„Blatt 1 von 3\" darf kein Maßstab sein");
    pruefe(massstabAusVermerk("Wohnen") === null, "Ein Raumname ist kein Maßstab");
    pruefe(massstabAusVermerk("1:99999") === null, "Ein unsinniger Nenner muss abgewiesen werden");

    /* --- Der Vermerk, der auf vier Textstücke verteilt ist ---
       Genau so liegt er in Brackweder_Straße_74_Grundrisse.pdf: "Maßstab",
       "1", ":", "100" einzeln abgesetzt. Vorher blieb der Maßstab dort offen,
       obwohl er im Schriftfeld steht. */
    const st4 = [
      { text: "Maßstab", x_pt: 1040, y_pt: 639, groesse_pt: 8, breite_pt: 30 },
      { text: "1", x_pt: 1083, y_pt: 639, groesse_pt: 8, breite_pt: 4 },
      { text: ":", x_pt: 1088, y_pt: 639, groesse_pt: 8, breite_pt: 2 },
      { text: "100", x_pt: 1091, y_pt: 639, groesse_pt: 8, breite_pt: 12 },
      { text: "EG", x_pt: 1040, y_pt: 660, groesse_pt: 8, breite_pt: 10 },
    ];
    const z4 = zeilenBilden(st4);
    pruefe(z4.length === 2, "Zwei Grundlinien ergeben zwei Zeilen, sind: " + z4.length);
    pruefe(/1\s*:\s*100/.test(z4[1].text),
      "Die zerstückelte Zeile muss wieder zusammenfinden, ist: " + z4[1].text);
    pruefe(blattkopfLesen(st4).massstab_nenner === 100,
      "Der auf vier Stücke verteilte Vermerk muss gefunden werden");
    /* Zwei Spalten des Schriftfelds duerfen nicht zu einer Zeile verschmelzen:
       sonst entsteht aus "Blatt 1" und "von 3" ein Maßstab, den es nicht gibt. */
    const weit = [
      { text: "Pos. 1", x_pt: 100, y_pt: 500, groesse_pt: 8, breite_pt: 20 },
      { text: ": 60", x_pt: 400, y_pt: 500, groesse_pt: 8, breite_pt: 15 },
    ];
    pruefe(zeilenBilden(weit).length === 2,
      "Weit auseinanderstehende Stücke bleiben getrennt");
    pruefe(blattkopfLesen(weit).massstab_nenner === null,
      "Aus zwei Spalten darf kein Maßstab zusammengesetzt werden");
    pruefe(zeilenBilden([]).length === 0, "Ohne Stücke keine Zeilen");

    /* --- Maßzahlen --- */
    const mz1 = masszahlLesen("12,49");
    pruefe(mz1 && mz1.sicher && nah(mz1.wert_m, 12.49, 1e-9), "12,49 muss 12,49 m ergeben");
    const mz2 = masszahlLesen("3.48");
    pruefe(mz2 && mz2.sicher && nah(mz2.wert_m, 3.48, 1e-9), "3.48 mit Punkt muss gehen");
    const mz3 = masszahlLesen(".85");
    pruefe(mz3 && mz3.sicher && nah(mz3.wert_m, 0.85, 1e-9),
      ".85 in CAD-Schreibweise muss 0,85 m ergeben");
    const mz4 = masszahlLesen("2,375");
    pruefe(mz4 && nah(mz4.wert_m, 2.375, 1e-9), "2,375 muss drei Nachkommastellen können");
    const mz5 = masszahlLesen("80");
    pruefe(mz5 && !mz5.sicher && nah(mz5.wert_m, 0.8, 1e-9),
      "Die ganze Zahl 80 wird als 80 cm gedeutet, aber nie als sicher");
    const mz6 = masszahlLesen("36,5 cm");
    pruefe(mz6 && mz6.sicher && nah(mz6.wert_m, 0.365, 1e-9), "36,5 cm muss 0,365 m ergeben");
    pruefe(masszahlLesen("Wohnen") === null, "Ein Raumname ist keine Maßzahl");
    pruefe(masszahlLesen("") === null, "Leerer Text ist keine Maßzahl");
    pruefe(masszahlLesen(null) === null, "null ist keine Maßzahl");

    /* --- Raumstempel, § 5.4 --- */
    const rs = raumstempelLesen("Masch. R. Aufzug A=3,42m² U=7,70m");
    pruefe(rs && nah(rs.A_m2, 3.42, 1e-9), "A=3,42m² muss als Fläche gelesen werden");
    pruefe(rs && nah(rs.U_m, 7.70, 1e-9), "U=7,70m muss als Umfang gelesen werden");
    pruefe(rs && /Aufzug/.test(rs.name || ""), "Der Raumname muss übrig bleiben");
    const rs2 = raumstempelLesen("24,50 m²");
    pruefe(rs2 && nah(rs2.A_m2, 24.5, 1e-9), "Eine nackte Flächenangabe muss gehen");
    pruefe(raumstempelLesen("12,49") === null, "Eine Maßzahl ist kein Raumstempel");

    /* --- Raumbeschriftung als Block ---------------------------------------
       Alle Koordinaten sind AM ECHTEN BLATT GEMESSEN, nicht erfunden:
       „260514 - Dumach 1 - Grundrisse M 1.100.pdf" (A1, Drehung 0, 25 Räume
       auf drei Geschossen) und „25_Maas_Langner_VE1_OG.pdf" (Drehung 90,
       Beschriftung um 90 Grad gedreht). */
    const dum = [
      { text: "45,96 m²", x_pt: 680.2, y_pt: 441.8, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
      { text: "Studio", x_pt: 680.2, y_pt: 450.3, groesse_pt: 10.0, breite_pt: 28, winkel_rad: 0 },
      { text: "29,84 m²", x_pt: 684.5, y_pt: 1953.7, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
      { text: "Wohnen", x_pt: 684.5, y_pt: 1962.1, groesse_pt: 10.0, breite_pt: 32, winkel_rad: 0 },
      { text: "Kochen/ Essen/", x_pt: 684.5, y_pt: 1972.1, groesse_pt: 10.0, breite_pt: 60, winkel_rad: 0 },
      { text: "Grundriss EG", x_pt: 617.2, y_pt: 1658.4, groesse_pt: 14.0, breite_pt: 70, winkel_rad: 0 },
      { text: "Grundriss DG", x_pt: 617.2, y_pt: 237.1, groesse_pt: 14.0, breite_pt: 70, winkel_rad: 0 },
    ];
    const bd = raumbloeckeLesen(dum);
    pruefe(bd.length === 2, "Zwei Flächenstempel erwartet, sind " + bd.length);
    const studio = bd.find(function (b) { return b.A_m2 === 45.96; });
    pruefe(!!studio && studio.name === "Studio",
      "Der Name über der Fläche gehört zum Block, ist: " + (studio && studio.name));
    const koch = bd.find(function (b) { return b.A_m2 === 29.84; });
    pruefe(!!koch && koch.name === "Kochen/ Essen/ Wohnen",
      "Zwei Namenszeilen gehören zusammen, sind: " + (koch && koch.name));
    pruefe(!!koch && !koch.sammel, "Ein Raumstempel ist keine Summe");
    /* Die Geschossüberschriften stehen UNTER ihrem Grundriss; drei Grundrisse
       auf einem Bogen lassen sich nur über die Lage trennen. */
    const gt = geschosstitelLesen(dum);
    pruefe(gt.length === 2, "Zwei Geschosstitel erwartet, sind " + gt.length);
    pruefe(geschossZuLage(gt, 684.5, 1953.7).kuerzel === "eg",
      "Der Stempel bei y=1954 gehört zum Erdgeschoss");
    pruefe(geschossZuLage(gt, 680.2, 441.8).kuerzel === "dg",
      "Der Stempel bei y=442 gehört zum Dachgeschoss");
    /* Gedrehte Beschriftung: gleiche Laufkoordinate ist hier gleiches y. */
    const maas = [
      { text: "53.04 m²", x_pt: 292.4, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 34, winkel_rad: Math.PI / 2 },
      { text: "Schlafen / Bad", x_pt: 281.2, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 52, winkel_rad: Math.PI / 2 },
      { text: "3.03 m²", x_pt: 319.4, y_pt: 557.1, groesse_pt: 8.4, breite_pt: 30, winkel_rad: Math.PI / 2 },
      { text: "Galerie", x_pt: 308.2, y_pt: 557.1, groesse_pt: 8.4, breite_pt: 28, winkel_rad: Math.PI / 2 },
      { text: "Geländer", x_pt: 289.7, y_pt: 541.1, groesse_pt: 6.0, breite_pt: 30, winkel_rad: Math.PI / 2 },
    ];
    const bm = raumbloeckeLesen(maas);
    pruefe(bm.length === 2, "Auch gedreht zwei Blöcke, sind " + bm.length);
    pruefe(bm.some(function (b) { return b.A_m2 === 53.04 && b.name === "Schlafen / Bad"; }),
      "Gedrehte Beschriftung muss zusammenfinden");
    /* Die kleinere Bauteilbeschriftung „Geländer" steht knapp im Zeilenabstand
       über „Galerie" und darf nicht Teil des Raumnamens werden. */
    pruefe(bm.some(function (b) { return b.A_m2 === 3.03 && b.name === "Galerie"; }),
      "Kleinere Schrift gehört nicht zum Block, gelesen: "
        + JSON.stringify(bm.map(function (b) { return b.name; })));
    /* Eine Summe ist kein Raum. Wortlaut vom Blatt „1.00 BA_2 Lageplan.pdf". */
    const summe = raumbloeckeLesen([
      { text: "4.289 m²", x_pt: 100, y_pt: 100, groesse_pt: 8, breite_pt: 30, winkel_rad: 0 },
      { text: "GRUNDSTÜCKE GESAMT ca.", x_pt: 100, y_pt: 109, groesse_pt: 8, breite_pt: 90, winkel_rad: 0 },
    ]);
    pruefe(summe.length === 1 && summe[0].sammel === true,
      "„GESAMT\" muss als Summe erkannt werden");
    pruefe(summe.length === 1 && summe[0].A_m2 === 4289,
      "Der Punkt ist der Tausendertrenner, gelesen: " + (summe[0] && summe[0].A_m2));
    pruefe(zahlDeutsch("1.234,56") === 1234.56, "1.234,56 sind tausendzweihundert");
    pruefe(zahlDeutsch("53.04") === 53.04, "53.04 bleibt 53,04");
    pruefe(raumbloeckeLesen([]).length === 0, "Ohne Stücke keine Blöcke");
    /* Ein Flächenstempel ohne Namen bleibt ohne Namen -- geraten wird nicht. */
    const ohne = raumbloeckeLesen([
      { text: "12,00 m²", x_pt: 100, y_pt: 100, groesse_pt: 8, breite_pt: 30, winkel_rad: 0 },
      { text: "5,20", x_pt: 100, y_pt: 109, groesse_pt: 8, breite_pt: 20, winkel_rad: 0 },
    ]);
    pruefe(ohne.length === 1 && ohne[0].name === null,
      "Eine Maßzahl über der Fläche ist kein Raumname");

    /* --- Blattkopf, § 6.2 --- */
    const bk = blattkopfLesen([{ text: "Grundriss Dachgeschoss" }, { text: "M 1:100" },
                               { text: "Blatt 1 von 3" }]);
    pruefe(bk.massstab_nenner === 100, "Der Blattkopf muss 1:100 hergeben");
    pruefe(bk.geschoss === "dg", "„Dachgeschoss\" muss als DG erkannt werden");
    pruefe(bk.blattart === "grundriss", "„Grundriss\" muss als Blattart erkannt werden");
    pruefe(blattkopfLesen([{ text: "Schnitt A-A" }]).blattart === "schnitt",
      "„Schnitt A-A\" muss ein Schnitt sein");
    pruefe(blattkopfLesen([{ text: "Grundriss EG" }]).geschoss === "eg",
      "Die Abkürzung EG muss reichen");
    /* Der Hoehenbezug „OKFF EG" nennt den Fussboden des Erdgeschosses und
       nicht das Geschoss des Blattes (Befund „Am Gunnebach 9", 25.08.2026:
       falscher Geschoss-Widerspruch auf jedem OG/DG-Blatt). */
    pruefe(blattkopfLesen([{ text: "OKFF EG = ±0,00" },
                           { text: "Grundriss Obergeschoss" }]).geschoss === "og",
      "„OKFF EG\" darf das Blattgeschoss nicht stellen");
    pruefe(blattkopfLesen([{ text: "OKFF EG +0,00" }]).geschoss === null,
      "Eine Hoehenkote allein ergibt kein Blattgeschoss");
    /* Die Wortgrenzen. Alle drei Zeichenketten stehen so auf echten Blaettern
       und machten aus einem Erdgeschossplan einen Schnitt bzw. eine Ansicht. */
    pruefe(blattkopfLesen([{ text: "SCHNITTLINIE" }]).blattart === null,
      "„SCHNITTLINIE\" ist keine Blattart (echter EG-Plan 4.1.1.13 BT 3)");
    pruefe(blattkopfLesen([{ text: "Ansichtskante Fenstersturz" }]).blattart === null,
      "„Ansichtskante\" ist keine Blattart");
    pruefe(blattkopfLesen([{ text: "Querschnitt" }]).blattart === null,
      "„Querschnitt\" allein ist keine Blattart");
    pruefe(blattkopfLesen([{ text: "Treppenläufe auszuführen gemäß Schnitt CC und "
      + "Detail 4, siehe Beiblatt zur Ausführungsplanung" }]).blattart === null,
      "Ein ganzer Satz ist keine Blattbeschriftung");
    pruefe(blattkopfLesen([{ text: "Ansichten" }]).blattart === "ansicht",
      "Die Mehrzahl „Ansichten\" zählt mit");
    pruefe(blattkopfLesen([{ text: "SCHNITTLINIE" }, { text: "Grundriss EG" }])
      .blattart === "grundriss",
      "Steht beides da, gewinnt der Grundriss");

    /* --- Objektangaben aus dem Schriftfeld ---------------------------------
       Die Lagen sind aus den echten Blaettern uebernommen, nicht erfunden:
       Cheruskerstrasse_23_Ansichten_211124.pdf (waagerechtes Schriftfeld),
       3_08-Schnitt-Keller.pdf (Anschrift elf Zeilen unter der Beschriftung,
       zwei weitere Anschriften auf demselben Blatt) und 4.1.1.26 SchnittBB.pdf
       (hochkant stehendes Schriftfeld). */
    const t = function (text, x, y, gr, b, w) {
      return { text: text, x_pt: x, y_pt: y, groesse_pt: gr || 10,
               breite_pt: b == null ? text.length * (gr || 10) * 0.5 : b,
               winkel_rad: w || 0 };
    };

    const cheru = [
      t("Bauvorhaben", 60, 200, 6), t("Aufmaß Bestandsgebäude", 60, 190, 6),
      t("Adresse", 60, 170, 6), t("Cheruskerstraße 23", 60, 160, 6),
      t("33102 Paderborn", 60, 152, 6),
      t("Bauherrschaft", 60, 135, 6), t("Gratian Grecu", 60, 125, 6),
      t("Cäcilienstraße 4", 60, 117, 6), t("33104 Paderborn", 60, 109, 6),
      t("Planung", 60, 92, 6), t("Thomas Kran", 60, 82, 6),
      t("Detmolder Straße 168", 60, 74, 6), t("33100 Paderborn", 60, 66, 6),
    ];
    const oc = objektangabenLesen(cheru);
    pruefe(oc.plz === "33102", "Die Postleitzahl des Bauvorhabens ist 33102, nicht "
      + oc.plz);
    pruefe(oc.ort === "Paderborn", "Der Ort muss Paderborn sein");
    pruefe(oc.strasse === "Cheruskerstraße 23", "Die Anschrift des Bauvorhabens "
      + "muss die Cheruskerstraße sein, ist " + oc.strasse);
    pruefe(oc.bauherr === "Gratian Grecu", "Der Bauherr steht unter Bauherrschaft");
    pruefe(oc.bauvorhaben === "Aufmaß Bestandsgebäude", "Das Bauvorhaben muss "
      + "übernommen werden");

    /* Die Anschrift des Bauherrn und die des Planers duerfen NIE als Anschrift
       des Gebaeudes durchgehen: daran haengt der Klimadatensatz. */
    const nurBauherr = [
      t("Bauherrschaft", 60, 135, 6), t("Gratian Grecu", 60, 125, 6),
      t("Cäcilienstraße 4", 60, 117, 6), t("33104 Paderborn", 60, 109, 6),
    ];
    pruefe(objektangabenLesen(nurBauherr).plz === null,
      "Ohne Beschriftung des Bauvorhabens darf keine Postleitzahl entstehen");

    /* Ligaturen: dasselbe Blatt, aber mit dem Steuerzeichen, das pdf.js dort
       fuer die st-Ligatur liefert. Die Bedeutung muss aus dem Blatt selbst
       hergeleitet werden, hier ueber das Wort "Maßstab". */
    const lig = String.fromCharCode(31);
    const mitLig = [
      t("Maß" + lig + "ab 1 : 100", 60, 220, 6),
      t("Adresse", 60, 170, 6), t("Cherusker" + lig + "raße 23", 60, 160, 6),
      t("33102 Paderborn", 60, 152, 6),
    ];
    const karte = ligaturenLernen(mitLig);
    pruefe(karte[lig] === "st", "Aus \"Maßstab\" muss folgen, dass das Zeichen "
      + "für st steht, gelernt wurde " + JSON.stringify(karte));
    pruefe(objektangabenLesen(mitLig).strasse === "Cheruskerstraße 23",
      "Mit der gelernten Ligatur muss die Straße lesbar sein, ist "
      + objektangabenLesen(mitLig).strasse);
    pruefe(ligaturenLernen([t("Xyz" + lig + "qrs", 0, 0, 6)])[lig] === undefined,
      "Ohne Ankerwort darf keine Bedeutung erfunden werden");

    /* Anschrift weit unter der Beschriftung, mit zwei weiteren Anschriften
       darunter — der Aufbau von 3_08-Schnitt-Keller.pdf. */
    const keller = [
      t("Bauvorhaben:", 1076, 715, 14, 75), t("Nutzungsänderung, Umbau", 1059, 696, 12, 110),
      t("und Sanierung Gebäude", 1065, 681, 12, 97),
      t("einer Gaststätte Altes", 1069, 667, 12, 89),
      t("Gasthaus \" Fischer-Eymann\".", 1054, 652, 12, 119),
      t("Einbau von 5 Wohneinheiten.", 1056, 638, 12, 116),
      t("Abbruch des rückwärtigen", 1061, 620, 12, 108),
      t("massiven Anbaus am", 1070, 606, 12, 87),
      t("denkmalgeschützte", 1074, 591, 12, 80),
      t("Fachwerkgebäude.", 1075, 577, 12, 76),
      t("Schloßstraße 1", 1084, 551, 12, 60), t("49186 Bad Iburg", 1082, 537, 12, 64),
      t("Bauherr:", 1090, 499, 14, 47), t("Bövingloh Bauträger GmbH", 1059, 480, 12, 110),
      t("Hohe Geest 30-34", 1060, 452, 12, 80), t("48165 Münster", 1060, 438, 12, 70),
      t("Planverfasser:", 1074, 356, 14, 79), t("Schloßstraße 9", 1083, 310, 12, 62),
      t("49074 Osnabrück", 1083, 296, 12, 70),
    ];
    const ok2 = objektangabenLesen(keller);
    pruefe(ok2.plz === "49186", "Von drei Anschriften auf dem Blatt muss die des "
      + "Bauvorhabens gelten (49186), gefunden " + ok2.plz);
    pruefe(ok2.strasse === "Schloßstraße 1", "Die Anschrift ist Schloßstraße 1, ist "
      + ok2.strasse);
    pruefe(ok2.bauherr === "Bövingloh Bauträger GmbH", "Der Bauherr muss getrennt "
      + "davon gelesen werden");

    /* Hochkant stehendes Schriftfeld: Beschriftung und Wert liegen auf
       derselben Hoehe und laufen in x auseinander (4.1.1.26 SchnittBB.pdf). */
    const halb = Math.PI / 2;
    const hoch = [
      t("BAUHERR", 389, 692, 4, 19, halb), t("PROJEKT", 430, 692, 4, 18, halb),
      t("PLANBEZ.", 471, 692, 4, 20, halb), t("MASSTAB", 526, 692, 4, 19, halb),
      t("THOMAS HOPPE", 397, 714, 6.9, 36, halb),
      t("Dahlienstr. 29", 411, 714, 6.9, 42, halb),
      t("30926 Garbsen", 419, 714, 6.9, 40, halb),
      t("LAATZENER TURMCENTER", 442, 714, 6.9, 62, halb),
      t("Hildesheimer Str. 47", 450, 714, 6.9, 62, halb),
      t("1:50", 531, 714, 6.9, 11, halb),
    ];
    const oh = objektangabenLesen(hoch);
    pruefe(oh.bauvorhaben === "LAATZENER TURMCENTER",
      "Im hochkant stehenden Schriftfeld muss das Projekt gefunden werden, ist "
      + oh.bauvorhaben);
    pruefe(oh.strasse === "Hildesheimer Str. 47",
      "Auch die Anschrift des Projekts, ist " + oh.strasse);
    pruefe(oh.plz === null, "Die Postleitzahl des Bauherrn (30926) darf nicht als "
      + "die des Gebäudes gelten, gefunden " + oh.plz);

    /* Der Zweckvermerk ist kein Bauherr.
       Gefunden an 25_Maas_Langner_VE1_OG.pdf: die Beschriftung "EIGENTÜMER:"
       hat 8,1 pt, quer darueber steht in 26 pt "BAUANTRAGSPLANUNG" -- der
       Vermerk, WOZU der Plan gezeichnet wurde. Er landete als meta.bauherr
       im Projekt und von dort auf dem Deckblatt des Berichts. Zwei Sperren
       greifen: die Schriftgroesse (das Dreifache der Beschriftung ist keine
       Feldeingabe mehr) und die Wortliste. */
    const zweck = [
      t("EIGENTÜMER:", 497, 1175, 8.1, 45, halb),
      t("BAUANTRAGSPLANUNG", 539, 1241, 26, 240, halb),
    ];
    pruefe(objektangabenLesen(zweck).bauherr === null,
      "Ein Zweckvermerk ist kein Bauherr, gefunden: "
      + objektangabenLesen(zweck).bauherr);
    /* Auch in Normalschrift, also ohne die Groessensperre. */
    pruefe(objektangabenLesen([t("Bauherr:", 60, 100, 8), t("Genehmigungsplanung", 60, 90, 8)])
      .bauherr === null, "Auch klein gesetzt ist ein Zweckvermerk kein Bauherr");
    /* Eine Blattbezeichnung ebenso wenig. */
    pruefe(objektangabenLesen([t("Bauherr:", 60, 100, 8), t("Übersichtsplan", 60, 90, 8)])
      .bauherr === null, "Eine Blattbezeichnung ist kein Bauherr");
    /* Und die Sperre darf keinen echten Wert wegnehmen: an SchnittBB steht
       die Beschriftung in 4,0 pt und der Wert in 9,9 pt. */
    const klein = [
      t("PROJ. NR.", 553, 692, 4.0, 21, halb), t("2002.04", 567, 714, 9.9, 30, halb),
    ];
    pruefe(objektangabenLesen(klein).projektnr === "2002.04",
      "Ein Wert im Zweieinhalbfachen der Beschriftungsgroesse bleibt ein Wert, ist: "
      + objektangabenLesen(klein).projektnr);

    /* Reste von Beschriftungen sind keine Werte. */
    pruefe(objektangabenLesen([t("Bauherr*in", 60, 100, 8), t("*in", 60, 90, 8)])
      .bauherr === null, "\"*in\" ist kein Bauherr");
    pruefe(objektangabenLesen([t("Projekt", 60, 100, 8), t("Nr.", 60, 90, 8)])
      .bauvorhaben === null, "\"Nr.\" ist kein Bauvorhaben");
    pruefe(objektangabenLesen([]).plz === null, "Ohne Text keine Angaben");

    /* --- Pfade auflösen --- */
    const p1 = pfadAufloesen([0, 198.4, 367.4, 1, 552.5, 367.4, 1, 552.5, 615.1,
                              1, 198.4, 615.1, 4]);
    pruefe(p1.zuege.length === 1, "Ein Rechteck ist ein Linienzug");
    pruefe(p1.zuege[0].punkte.length === 4, "Das Rechteck hat vier Punkte");
    pruefe(p1.zuege[0].geschlossen, "Der Zug muss als geschlossen gelten");
    pruefe(!p1.abgebrochen, "Ein gültiger Pfad darf nicht abbrechen");
    // Kurven: 6 bzw. 4 Folgezahlen, nur der Endpunkt zählt
    const p2 = pfadAufloesen([0, 0, 0, 2, 1, 1, 2, 2, 3, 3, 3, 5, 5, 6, 6, 4]);
    pruefe(p2.zuege.length === 1 && p2.zuege[0].punkte.length === 3,
      "Kubische und quadratische Kurve müssen je einen Endpunkt beitragen");
    pruefe(p2.zuege[0].kurven === 2, "Beide Kurven müssen gezählt werden");
    pruefe(!p2.abgebrochen, "Der Kurvenpfad darf nicht abbrechen");
    // zwei Unterpfade
    const p3 = pfadAufloesen([0, 0, 0, 1, 10, 0, 0, 20, 20, 1, 30, 20]);
    pruefe(p3.zuege.length === 2, "Zwei Hinbewegungen ergeben zwei Züge");
    // abgeschnittenes Feld darf nicht still falsch zählen
    pruefe(pfadAufloesen([0, 5, 5, 1, 9]).abgebrochen,
      "Ein abgeschnittenes Feld muss als abgebrochen gelten");
    pruefe(pfadAufloesen([99, 1, 2]).abgebrochen,
      "Ein unbekannter Befehl muss abbrechen statt weiterzuzählen");
    pruefe(pfadAufloesen([]).zuege.length === 0, "Ein leeres Feld ergibt keine Züge");
    pruefe(pfadAufloesen(null).zuege.length === 0, "null darf nicht werfen");

    /* --- Matrix auf Pfade anwenden --- */
    // Der Fall vom echten A1-Plan: Zeichenraum 1/0,06, per cm verkleinert.
    const rohzug = pfadAufloesen([0, 3306.667, 6123.333, 1, 9208.333, 6123.333]);
    const umgerechnet = zugUmrechnen(rohzug.zuege[0], [0.06, 0, 0, 0.06, 0, 0]);
    pruefe(nah(umgerechnet.punkte[0].x, 198.4, 0.01) && nah(umgerechnet.punkte[0].y, 367.4, 0.01),
      "Die Matrix muss den Rohpunkt in den Seitenraum bringen");
    pruefe(nah(streckenAus([umgerechnet])[0].laenge_pt, 354.1, 0.01),
      "Nach der Matrix muss die Strecke 354,1 pt lang sein, ist "
        + streckenAus([umgerechnet])[0].laenge_pt.toFixed(2));
    // Verschiebung und Drehung müssen ebenfalls greifen
    const verschoben = zugUmrechnen({ punkte: [{ x: 0, y: 0 }], geschlossen: false },
                                    [1, 0, 0, 1, 50, 70]);
    pruefe(nah(verschoben.punkte[0].x, 50) && nah(verschoben.punkte[0].y, 70),
      "Eine reine Verschiebung muss greifen");
    const gedreht = zugUmrechnen({ punkte: [{ x: 10, y: 0 }], geschlossen: false },
                                 [0, 1, -1, 0, 0, 0]);
    pruefe(nah(gedreht.punkte[0].x, 0) && nah(gedreht.punkte[0].y, 10),
      "Eine Drehung um 90 Grad muss greifen");
    pruefe(zugUmrechnen(rohzug.zuege[0], null) === rohzug.zuege[0],
      "Ohne Matrix bleibt der Zug unverändert");

    /* --- Strecken und Flächen --- */
    const st = streckenAus(p1.zuege);
    pruefe(st.length === 4, "Das geschlossene Rechteck hat vier Strecken, sind " + st.length);
    const laengste = st.slice().sort((a, b) => b.laenge_pt - a.laenge_pt)[0];
    pruefe(nah(laengste.laenge_pt, 354.1, 0.01), "Die lange Seite misst 354,1 pt");
    pruefe(nah(laengste.laenge_mm, 124.92, 0.01),
      "354,1 pt sind 124,92 mm, sind " + laengste.laenge_mm.toFixed(2));
    pruefe(laengste.waagerecht, "Die lange Seite verläuft waagerecht");

    // § 7.1: 354,1 x 247,7 pt sind im Maßstab 1:100 genau 12,49 x 8,74 m
    const re = rechteckAusZug(p1.zuege[0], 100);
    pruefe(re !== null, "Das Rechteck muss als Rechteck erkannt werden");
    pruefe(re && nah(re.breite_m, 12.49, 0.005),
      "Die Breite muss 12,49 m sein, ist " + (re ? re.breite_m.toFixed(4) : "-"));
    pruefe(re && nah(re.hoehe_m, 8.74, 0.005),
      "Die Höhe muss 8,74 m sein, ist " + (re ? re.hoehe_m.toFixed(4) : "-"));
    pruefe(re && nah(re.flaeche_m2, 12.49 * 8.74, 0.06), "Die Fläche muss gerechnet sein");
    pruefe(re && re.exakt === true, "Aus Dokumentkoordinaten gerechnet gilt als exakt");
    const gz = flaecheAusZug(p1.zuege[0], 100);
    pruefe(gz && nah(gz.umfang_m, 2 * (12.49 + 8.74), 0.02), "Der Umfang muss stimmen");
    pruefe(gz && gz.rechtwinklig, "Das Rechteck ist achsparallel");
    // schiefes Dreieck ist kein Rechteck
    const drei = { punkte: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }],
                   geschlossen: true };
    pruefe(rechteckAusZug(drei, 100) === null, "Ein Dreieck ist kein Rechteck");
    pruefe(nah(flaechePt2(drei.punkte), 4000, 1e-6), "Die Dreiecksfläche muss stimmen");
    pruefe(flaecheAusZug({ punkte: [{ x: 0, y: 0 }] }, 100) === null,
      "Ein einzelner Punkt hat keine Fläche");

    /* --- Maßstab aus der Kette, § 7.1 --- */
    const nk = massstabAusKette({ wert_m: 12.49, laenge_pt: 354.1 });
    pruefe(nah(nk, 100, 0.05), "12,49 m auf 354,1 pt sind 1:100, sind " + nk.toFixed(3));
    pruefe(nah(massstabAusKette({ wert_m: 8.74, laenge_pt: 247.7 }), 100, 0.05),
      "Die zweite Kette muss ebenfalls 1:100 ergeben");
    pruefe(massstabAusKette({ wert_m: 0, laenge_pt: 100 }) === null,
      "Ohne Maßzahl kein Maßstab");
    pruefe(massstabAusKette({ wert_m: 5, laenge_pt: 0 }) === null, "Ohne Länge kein Maßstab");
    pruefe(einrasten(99.985) && einrasten(99.985).nenner === 100, "99,985 rastet auf 100 ein");
    pruefe(einrasten(140) === null, "1:140 ist kein üblicher Maßstab und rastet nicht ein");

    /* --- Maßstab aus der Geometrie --- */
    const masszahlen = [
      { text: "12,49", x_pt: 350, y_pt: 355, zahl: masszahlLesen("12,49") },
      { text: "8,74", x_pt: 560, y_pt: 480, zahl: masszahlLesen("8,74") },
    ];
    const geo = massstabAusGeometrie({ masszahlen: masszahlen, strecken: st });
    pruefe(geo.nenner === 100, "Aus der Geometrie muss 1:100 kommen, ist " + geo.nenner);
    pruefe(geo.belege === 2, "Zwei verschiedene Maßzahlen sind zwei Belege, sind " + geo.belege);
    // eine Maßzahl weit weg von jeder Linie darf nichts beitragen
    const geoLeer = massstabAusGeometrie({
      masszahlen: [{ text: "12,49", x_pt: 5000, y_pt: 5000, zahl: masszahlLesen("12,49") }],
      strecken: st });
    pruefe(geoLeer.nenner === null, "Eine Maßzahl fern jeder Linie darf nichts ergeben");
    // unsichere Zahlen dürfen den Maßstab nicht tragen
    const geoUnsicher = massstabAusGeometrie({
      masszahlen: [{ text: "80", x_pt: 350, y_pt: 355, zahl: masszahlLesen("80") }],
      strecken: st });
    pruefe(geoUnsicher.nenner === null, "Eine unsichere Zahl darf den Maßstab nicht setzen");

    /* Der Fall aus XA_EG.PDF: Maßhilfsstriche von rund 6 pt liegen massenhaft
     * neben den Maßzahlen und ergaben früher 1:1000 statt 1:100. */
    const striche = [];
    for (let i = 0; i < 40; i++) {
      striche.push({ a: { x: 348 + i * 0.2, y: 350 }, b: { x: 348 + i * 0.2, y: 356 },
                     laenge_pt: 6, mitte: { x: 348 + i * 0.2, y: 353 },
                     waagerecht: false, senkrecht: true });
    }
    const geoStriche = massstabAusGeometrie({ masszahlen: masszahlen,
                                              strecken: st.concat(striche) });
    pruefe(geoStriche.nenner === 100,
      "Kurze Maßhilfsstriche dürfen die Maßkette nicht überstimmen, ergeben "
        + geoStriche.nenner);
    pruefe(massstabAusGeometrie({ masszahlen: masszahlen, strecken: striche }).nenner === null,
      "Aus lauter 6-pt-Strichen darf gar kein Maßstab kommen");

    /* Punktabstand zur Strecke, nicht zu deren Mitte: eine Maßzahl am Anfang
     * einer langen Kette ist von der Mitte weit weg, liegt aber auf der Linie. */
    pruefe(nah(abstandZuStrecke(210, 372, { x: 198.4, y: 367.4 }, { x: 552.5, y: 367.4 }),
      4.6, 0.01), "Der Abstand muss zur Strecke gemessen werden, nicht zur Mitte");
    const geoRand = massstabAusGeometrie({
      masszahlen: [{ text: "12,49", x_pt: 210, y_pt: 372, zahl: masszahlLesen("12,49") }],
      strecken: st });
    pruefe(geoRand.nenner === 100,
      "Eine Maßzahl am Anfang der Kette muss trotzdem greifen");

    /* Zwei gleich gut belegte Maßstäbe: dann lieber nichts sagen. */
    // Zwei gleich lange Linien weit auseinander, jede mit eigener Maßzahl:
    // 3,53 m auf 100 pt ergibt 1:100, 7,06 m auf 100 pt ergibt 1:200.
    const zwei = [
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, laenge_pt: 100,
        mitte: { x: 50, y: 0 }, waagerecht: true, senkrecht: false },
      { a: { x: 0, y: 500 }, b: { x: 100, y: 500 }, laenge_pt: 100,
        mitte: { x: 50, y: 500 }, waagerecht: true, senkrecht: false },
    ];
    const geoZwei = massstabAusGeometrie({
      masszahlen: [
        { text: "3,53", x_pt: 50, y_pt: 5, zahl: masszahlLesen("3,53") },
        { text: "7,06", x_pt: 50, y_pt: 505, zahl: masszahlLesen("7,06") },
      ],
      strecken: zwei });
    pruefe(geoZwei.nenner === null && geoZwei.uneindeutig === true,
      "Bei zwei gleich starken Kandidaten darf kein Maßstab behauptet werden");

    /* --- Außenbemaßung: die Kette nach ihrer LAGE ------------------------
     * Nachgestellt ist der Fall vom echten Blatt „Bauantrag_EG_24.07.2024":
     * unten läuft eine Kette 7,50 + 12,50 + 6,00 = 26,00 m, darunter eine
     * zweite 5,20 + 5,20 + 4,40 + 5,20 + 6,00 = 26,00 m, und ganz außen eine
     * einzelne Linie über 30,00 m, die zusätzlich einen 4,00 m breiten Vorbau
     * fasst. Die längste Kette ist damit NICHT die Gebäudebreite. Belegt ist
     * nur die 26,00, weil zwei unabhängige Ketten sie hergeben. */
    function linie(x0, x1, y) {
      return { a: { x: x0, y: y }, b: { x: x1, y: y }, laenge_pt: Math.abs(x1 - x0),
               mitte: { x: (x0 + x1) / 2, y: y }, waagerecht: true, senkrecht: false };
    }
    function mz(t, x, y) { return { text: t, x_pt: x, y_pt: y, zahl: masszahlLesen(t) }; }
    const P = mmZuPt(1000 / 100);        // 1 m bei 1:100 in PDF-Punkten
    const kb = { masszahlen: [], strecken: [] };
    // Kette 1 (Zeile y=100): 7,50 + 12,50 + 6,00
    [[0, 7.5, "7,50"], [7.5, 20, "12,50"], [20, 26, "6,00"]].forEach(function (a) {
      kb.strecken.push(linie(a[0] * P, a[1] * P, 100));
      kb.masszahlen.push(mz(a[2], (a[0] + a[1]) / 2 * P, 104));
    });
    // Kette 2 (Zeile y=120): 5,20 + 5,20 + 4,40 + 5,20 + 6,00
    let x = 0;
    ["5,20", "5,20", "4,40", "5,20", "6,00"].forEach(function (t) {
      const b = x + parseFloat(t.replace(",", "."));
      kb.strecken.push(linie(x * P, b * P, 120));
      kb.masszahlen.push(mz(t, (x + b) / 2 * P, 124));
      x = b;
    });
    // Kette 3 (Zeile y=140): eine einzelne Linie über 30,00 m
    kb.strecken.push(linie(-4 * P, 26 * P, 140));
    kb.masszahlen.push(mz("30,00", 11 * P, 144));
    // eine senkrechte Kette 23,00, zweimal belegt
    [[100, 23, "23,00"], [140, 23, "23,00"]].forEach(function (a) {
      kb.strecken.push({ a: { x: a[0], y: 0 }, b: { x: a[0], y: a[1] * P },
                         laenge_pt: a[1] * P, mitte: { x: a[0], y: a[1] * P / 2 },
                         waagerecht: false, senkrecht: true });
      kb.masszahlen.push(mz(a[2], a[0] + 4, a[1] * P / 2));
    });
    const abm = aussenbemassungAusTextstand({ masszahlen: kb.masszahlen,
                                              strecken: kb.strecken, nenner: 100 });
    pruefe(nah(abm.breite_m, 30.0, 0.01),
      "Geliefert wird die längste Kette, nie eine kürzere, ist " + abm.breite_m);
    pruefe(abm.belegt_breite === false && abm.konkurrenz === true,
      "Längste Kette 30,00 gegen belegte 26,00: das ist eine Obergrenze, kein Beleg");
    pruefe(nah(abm.tiefe_m, 23.0, 0.01),
      "Die unbestrittene Tiefe bleibt davon unberührt, ist " + abm.tiefe_m);
    pruefe(abm.belegt === false, "Eine unbelegte Richtung macht das Ganze unbelegt");
    /* Ohne die einzelne 30,00-Linie ist die belegte 26,00 die längste. */
    const ohneVorbau = aussenbemassungAusTextstand({
      masszahlen: kb.masszahlen.filter(function (m) { return m.text !== "30,00"; }),
      strecken: kb.strecken, nenner: 100 });
    pruefe(ohneVorbau.vorhanden === true && nah(ohneVorbau.breite_m, 26.0, 0.01),
      "Ohne den Vorbau muss 26,00 m herauskommen, ist " + ohneVorbau.breite_m);
    pruefe(ohneVorbau.belegt_breite === true && ohneVorbau.zeugen_breite >= 1,
      "Zwei Ketten auf 26,00 m sind ein Beleg");
    pruefe(nah(ohneVorbau.tiefe_m, 23.0, 0.01),
      "Die Tiefe muss 23,00 m sein, ist " + ohneVorbau.tiefe_m);
    pruefe(ohneVorbau.belegt === true, "Beide Richtungen belegt heißt belegt");
    /* Steht die 30,00 allein und ist auch keine kürzere Kette belegt, dann ist
       nichts strittig: sie wird geliefert, aber ausdrücklich als unbelegt. */
    const nurEine = aussenbemassungAusTextstand({
      masszahlen: kb.masszahlen.filter(function (m) {
        return !/^(5,20|4,40|7,50|12,50|6,00)$/.test(m.text); }),
      strecken: kb.strecken, nenner: 100 });
    pruefe(nurEine.vorhanden === true && nah(nurEine.breite_m, 30.0, 0.01),
      "Allein stehend wird die 30,00 m geliefert, ist " + nurEine.breite_m);
    pruefe(nurEine.belegt_breite === false,
      "Ohne zweite Kette darf die Breite nicht als belegt gelten");
    pruefe(nurEine.konkurrenz === false,
      "Eine allein stehende Kette ohne belegten Widerspruch ist EINDEUTIG, "
        + "nicht strittig — nur so darf sie als Umfangsquelle dienen");
    /* Der Fall „Hasenberg_10_Grundrisse" (echter Lauf 25.08.2026),
       nachgestellt: die längste Kette hat einen ZEUGEN auf der
       gegenüberliegenden Kettenzeile, und zusätzlich wiederholt sich ein
       kurzes Raummaß zwischen den Zeilen (dort 4,17 m). Die bezeugte
       Gesamtkette ist dann belegt; das wiederholte Raummaß macht sie nicht
       strittig. Vorher: konkurrenz true, und die Umfangsfrage verlangte vier
       Zahlen, die im Fragetext schon standen. */
    const kbZeuge = { masszahlen: kb.masszahlen.slice(), strecken: kb.strecken.slice() };
    // Zeuge der 30,00: eine zweite Kette 12,00 + 18,00 auf eigener Zeile
    [[-4, 8, "12,00"], [8, 26, "18,00"]].forEach(function (a) {
      kbZeuge.strecken.push(linie(a[0] * P, a[1] * P, 170));
      kbZeuge.masszahlen.push(mz(a[2], (a[0] + a[1]) / 2 * P, 174));
    });
    const bezeugt = aussenbemassungAusTextstand({ masszahlen: kbZeuge.masszahlen,
      strecken: kbZeuge.strecken, nenner: 100 });
    pruefe(nah(bezeugt.breite_m, 30.0, 0.01)
      && bezeugt.belegt_breite === true && bezeugt.konkurrenz === false,
      "Eine bezeugte Gesamtkette ist belegt, auch wenn kürzere Raummaße "
        + "doppelt vorkommen (Fall Hasenberg), ist belegt="
        + bezeugt.belegt_breite + " konkurrenz=" + bezeugt.konkurrenz);
    /* Eine falsch zugeordnete Zahl bricht die Kette: Summe und gezeichnete
       Spanne gehen auseinander, die Kette wird verworfen. */
    const schief = kettenAusAbschnitten(abschnitteAusTextstand({
      masszahlen: [mz("7,50", 3.75 * P, 104), mz("12,50", 13.75 * P, 104)],
      strecken: [linie(0, 7.5 * P, 100), linie(7.5 * P, 20 * P, 100)], nenner: 100 }), 100);
    pruefe(schief.length === 1 && schief[0].stimmig === true,
      "Eine stimmige Kette muss stimmig heißen");
    pruefe(aussenbemassungAusTextstand({ masszahlen: kb.masszahlen,
      strecken: kb.strecken, nenner: null }).vorhanden === false,
      "Ohne Maßstab gibt es keine Außenbemaßung");

    /* --- beide Wege zusammen --- */
    const mb1 = massstabBestimmen({ nenner_vermerk: 100, geometrie: geo });
    pruefe(mb1.guete === "abgesichert" && mb1.nenner === 100 && mb1.belastbar,
      "Vermerk und Geometrie einig ergibt abgesichert");
    const mb2 = massstabBestimmen({ nenner_vermerk: 100,
      geometrie: { nenner: 50, belege: 2 } });
    pruefe(mb2.guete === "widerspruch" && !mb2.belastbar,
      "Vermerk 1:100 gegen Geometrie 1:50 muss ein Widerspruch sein");
    pruefe(mb2.nenner === null, "Bei Widerspruch darf kein Maßstab übernommen werden");
    const mb3 = massstabBestimmen({ nenner_vermerk: null, geometrie: geo });
    pruefe(mb3.guete === "belegt" && mb3.belastbar, "Zwei Belege ohne Vermerk sind belegt");
    const mb4 = massstabBestimmen({ nenner_vermerk: 100, geometrie: { nenner: null, belege: 0 } });
    pruefe(mb4.guete === "vorlaeufig" && !mb4.belastbar,
      "Nur der Blattkopf ist vorläufig und nicht belastbar");
    const mb5 = massstabBestimmen({});
    pruefe(mb5.nenner === null && !mb5.belastbar, "Ohne alles gibt es keinen Maßstab");

    /* --- Ansicht --- */
    const a0 = nachAnsicht(0, 841.89, { drehung: 0, breite_pt: 1190.55, hoehe_pt: 841.89 });
    pruefe(nah(a0.x, 0, 1e-6) && nah(a0.y, 0, 1e-6),
      "Ohne Drehung liegt die linke obere Ecke bei 0,0");

    /* --- Dateiarten --- */
    pruefe(dateiArt("plan.pdf", "application/pdf").art === "pdf", "PDF muss erkannt werden");
    pruefe(dateiArt("plan.PDF", "").art === "pdf", "Die Endung allein muss reichen");
    const magie = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    pruefe(dateiArt("ohneEndung", "", magie).art === "pdf",
      "Die Kennung %PDF- muss auch ohne Endung greifen");
    pruefe(dateiArt("plan.jpg", "image/jpeg").art === "bild", "JPEG muss ein Bild sein");
    const dwg = dateiArt("plan.dwg", "");
    pruefe(dwg.art === "abgelehnt" && /CAD/.test(dwg.meldung),
      "DWG muss mit einer Handlungsanweisung abgelehnt werden");
    pruefe(dateiArt("scan.tif", "").art === "abgelehnt", "TIFF muss abgelehnt werden");
    pruefe(dateiArt("foto.heic", "").art === "abgelehnt", "HEIC muss abgelehnt werden");
    pruefe(/Kompatibilität/.test(dateiArt("foto.heic", "").meldung),
      "Die HEIC-Meldung muss sagen, was zu tun ist");
    pruefe(dateiArt("tabelle.xlsx", "").art === "abgelehnt", "Unbekanntes muss abgelehnt werden");

    /* --- Fehlermeldungen --- */
    pruefe(/passwortgeschützt/.test(fehlerKlartext({ name: "PasswordException" })),
      "Ein Passwortfehler muss Klartext ergeben");
    pruefe(/beschädigt/.test(fehlerKlartext({ name: "InvalidPDFException",
      message: "Invalid PDF structure." })), "Ein kaputtes PDF muss Klartext ergeben");
    pruefe(fehlerKlartext({ message: "irgendwas" }).length > 10,
      "Auch ein unbekannter Fehler braucht Text");

    /* --- Prüf-PDF --- */
    const roh = pruefPdf();
    pruefe(roh.length > 400, "Das Prüf-PDF muss Inhalt haben");
    pruefe(String.fromCharCode.apply(null, Array.prototype.slice.call(roh, 0, 5)) === "%PDF-",
      "Das Prüf-PDF muss mit %PDF- beginnen");

    /* --- Ausschnitt: Masse und Kennzeichnung ---------------------------
       Der Fehler, der das noetig machte: die Kennzeichnung "ausschnittGemalt"
       las eine Variable, die vorher ueberschrieben worden war, und meldete
       false. Der Aufrufer schnitt daraufhin aus dem schon zugeschnittenen
       Bild ein zweites Mal denselben Anteil heraus. Am A1-Bogen "Dumach 1"
       kamen dadurch statt 25 nur 7 Raeume an -- ohne jede Fehlermeldung. */
    {
      // A1 hoch: 1683,78 x 2383,94 pt. Oberes Drittel, quer beschnitten.
      const m = ausschnittMasse(1683.78, 2383.94,
        { x: 0.2587, y: 0.0294, x2: 0.7393, y2: 0.3906 }, 2576);
      pruefe(m.ausschnittGemalt === true,
        "ausschnittMasse muss sagen, dass geschnitten wurde");
      pruefe(Math.abs(m.hoehe - 2576) <= 1,
        "Die laengere Kante des Ausschnitts muss die 2576 Bildpunkte ausfuellen, "
        + "ist " + m.hoehe);
      pruefe(m.breite > 2300 && m.breite < 2500,
        "Die kuerzere Kante folgt dem Seitenverhaeltnis, ist " + m.breite);
      pruefe(m.skala > 2.5 && m.skala < 3.5,
        "Aus einem Drittel eines A1-Bogens werden rund 215 dpi, Skala " + m.skala);
      // Der Versatz muss den Ausschnitt wirklich treffen.
      pruefe(Math.abs(m.x - Math.round(1683.78 * m.skala * 0.2587)) <= 1,
        "Der Versatz links muss zum Anteil passen");
      pruefe(Math.abs(m.y - Math.round(2383.94 * m.skala * 0.0294)) <= 1,
        "Der Versatz oben muss zum Anteil passen");
    }
    {
      // Ein liegender Ausschnitt: dann fuellt die BREITE die Kante.
      const m = ausschnittMasse(1000, 1000, { x: 0, y: 0.4, x2: 1, y2: 0.6 }, 1000);
      pruefe(Math.abs(m.breite - 1000) <= 1, "Bei liegendem Ausschnitt fuellt die Breite");
      pruefe(Math.abs(m.hoehe - 200) <= 2, "Die Hoehe folgt, ist " + m.hoehe);
    }
    {
      // Unsinnige Anteile duerfen keine Nullflaeche und keinen Absturz ergeben.
      const m = ausschnittMasse(1000, 1000, { x: -1, y: 2, x2: 5, y2: -3 }, 800);
      pruefe(m.breite > 0 && m.hoehe > 0 && isFinite(m.skala),
        "Auch bei unsinnigen Anteilen entsteht eine malbare Flaeche");
    }

    return { ok: f.length === 0, fehler: f, anzahl: n };
  }

  /**
   * Selbsttest mit der echten Bibliothek am selbst erzeugten PDF.
   * Erst hier zeigt sich, ob die Annahmen über pdf.js stimmen: Befehlscodes im
   * Pfadfeld, Lage und Schriftgröße im Textlayer, Drehung, Fehlerarten.
   */
  function selbsttestPdf() {
    const rein = selbsttest();
    const f = rein.fehler.slice();
    let n = rein.anzahl;
    const pruefe = (bedingung, meldung) => { n++; if (!bedingung) f.push(meldung); };

    return bibliothekLaden().then(function (lib) {
      return lib.getDocument({ data: pruefPdf(), isEvalSupported: false }).promise
        .then(function (dok) {
          pruefe(dok.numPages === 1, "Das Prüf-PDF hat eine Seite");
          return seiteLesen(lib, dok, 1);
        })
        .then(function (s) {
          /* Blattmaß */
          pruefe(nah(s.breite_mm, 420, 0.5),
            "Die Seite muss 420 mm breit sein, ist " + s.breite_mm.toFixed(1));
          pruefe(s.format === "A3 quer", "Das Format muss A3 quer sein, ist " + s.format);

          /* Textlayer mit Lage und Schriftgröße */
          pruefe(s.hatTextlayer, "Der Textlayer muss gefunden werden");
          pruefe(s.textstuecke.length === 6,
            "Sechs Textstücke erwartet, sind " + s.textstuecke.length);
          pruefe(s.textstuecke.every((x) => x.text.trim().length > 0),
            "pdf.js liefert Leerstücke mit, die müssen herausfallen");
          const t1249 = s.textstuecke.find((x) => x.text === "12,49");
          pruefe(!!t1249, "Die Maßzahl 12,49 muss im Textlayer stehen");
          pruefe(t1249 && nah(t1249.x_pt, 350, 0.5) && nah(t1249.y_pt, 355, 0.5),
            "Die Maßzahl muss an ihrer Lage stehen");
          pruefe(t1249 && nah(t1249.groesse_pt, 8.1, 0.05),
            "Die Schriftgröße muss 8,1 pt sein, ist " + (t1249 ? t1249.groesse_pt : "-"));
          pruefe(t1249 && nah(t1249.versalhoehe_mm, 2.05, 0.05),
            "8,1 pt sind rund 2,05 mm Versalhöhe");

          /* Seitentyp ohne Modellaufruf */
          pruefe(s.typ === "vektorplan", "Die Seite muss ein Vektorplan sein, ist " + s.typ);
          pruefe(s.pfadzahl === 9,
            "Neun Pfade erwartet (Außenwand und acht Innenwände), sind " + s.pfadzahl);
          pruefe(!s.kacheln_noetig, "Ein Vektorplan mit Textlayer braucht keine Kacheln");
          pruefe(s.bilder.length === 0, "Auf der Seite ist kein Bild");
          pruefe(s.dpi_nativ === null, "Ohne Bild gibt es keine native Auflösung");

          /* Blattkopf */
          pruefe(s.blattkopf.massstab_nenner === 100, "Der Blattkopf nennt 1:100");
          pruefe(s.blattkopf.geschoss === "eg", "Das Erdgeschoss muss erkannt werden");
          pruefe(s.blattkopf.blattart === "grundriss", "Die Blattart muss Grundriss sein");

          /* Geometrie aus den Pfaden */
          pruefe(s.zuege.length === 9, "Neun Linienzüge erwartet, sind " + s.zuege.length);
          pruefe(s.strecken.length === 12,
            "Vier Außen- und acht Innenwandstrecken erwartet, sind " + s.strecken.length);
          const lang = s.strecken.slice().sort((a, b) => b.laenge_pt - a.laenge_pt)[0];
          pruefe(nah(lang.laenge_pt, 354.1, 0.01),
            "Die lange Seite misst 354,1 pt, misst " + lang.laenge_pt.toFixed(3));
          pruefe(s.zuege.filter((z) => z.geschlossen).length === 1,
            "Nur die Außenwand ist ein geschlossener Zug");

          /* Der Kern: Maßstab auf zwei unabhängigen Wegen, Abweichung null */
          pruefe(s.geometrie_massstab.nenner === 100,
            "Aus den Maßketten muss 1:100 kommen, kommt " + s.geometrie_massstab.nenner);
          pruefe(s.geometrie_massstab.belege === 2,
            "Zwei Maßzahlen müssen tragen, sind " + s.geometrie_massstab.belege);
          pruefe(s.massstab.guete === "abgesichert",
            "Beide Wege müssen abgesichert ergeben, ergeben " + s.massstab.guete);
          pruefe(s.massstab.nenner === 100 && s.massstab.belastbar,
            "Der Maßstab muss belastbar 1:100 sein");

          /* Und daraus die exakte Fläche, § 7.1: Abweichung null */
          const fl = s.flaechen();
          pruefe(fl.length === 1, "Eine geschlossene Fläche erwartet, sind " + fl.length);
          pruefe(fl[0] && nah(fl[0].flaeche_m2, 12.49 * 8.74, 0.06),
            "Die Fläche muss 109,16 m² sein, ist "
              + (fl[0] ? fl[0].flaeche_m2.toFixed(2) : "-"));
          pruefe(fl[0] && fl[0].exakt === true, "Die Fläche muss als exakt gelten");

          /* Die Außenbemaßung: dieselben zwei Maßzahlen, aber nach ihrer LAGE
           * ausgewertet statt nach ihrer Länge. Heraus muss die Kontur kommen,
           * die im Kontrollblatt bisher fehlte. */
          const ab = s.aussenbemassung;
          pruefe(ab && ab.vorhanden === true,
            "Aus den zwei Maßketten muss eine Außenbemaßung entstehen");
          pruefe(ab && nah(ab.breite_m, 12.49, 0.005),
            "Die Breite muss 12,49 m sein, ist " + (ab ? ab.breite_m : "-"));
          pruefe(ab && nah(ab.tiefe_m, 8.74, 0.005),
            "Die Tiefe muss 8,74 m sein, ist " + (ab ? ab.tiefe_m : "-"));
          pruefe(ab && ab.belegt === false,
            "Eine EINZELNE Kette je Richtung darf nicht als belegt gelten");
          pruefe(ab && nah(ab.breite_m * ab.tiefe_m, fl[0].flaeche_m2, 0.06),
            "Die Kontur aus der Bemaßung muss die gerechnete Fläche treffen: "
              + (ab ? (ab.breite_m * ab.tiefe_m).toFixed(2) : "-") + " gegen "
              + fl[0].flaeche_m2.toFixed(2));

          /* Raumstempel gegen die gerechnete Geometrie halten. Zwei Angaben aus
           * derselben Zeichnung, aber auf verschiedenen Wegen gewonnen: die
           * eine hat der Planverfasser hingeschrieben, die andere kommt aus den
           * Koordinaten. Stimmen sie, ist die Auslese in sich schlüssig. */
          pruefe(s.raumstempel.length === 1,
            "Ein Raumstempel erwartet, sind " + s.raumstempel.length);
          const stempel = s.raumstempel[0] && s.raumstempel[0].stempel;
          pruefe(stempel && nah(stempel.A_m2, 109.16, 0.005),
            "Der Stempel muss 109,16 m² hergeben, gibt " + (stempel ? stempel.A_m2 : "-"));
          pruefe(stempel && nah(stempel.U_m, 42.46, 0.005),
            "Der Stempel muss 42,46 m Umfang hergeben, gibt " + (stempel ? stempel.U_m : "-"));
          pruefe(stempel && fl[0] && nah(stempel.A_m2, fl[0].flaeche_m2, 0.01),
            "Stempelfläche und gerechnete Fläche müssen übereinstimmen: "
              + (stempel ? stempel.A_m2 : "-") + " gegen "
              + (fl[0] ? fl[0].flaeche_m2.toFixed(3) : "-"));
          pruefe(stempel && fl[0] && nah(stempel.U_m, fl[0].umfang_m, 0.01),
            "Stempelumfang und gerechneter Umfang müssen übereinstimmen");

          /* Renderauflösung aus der kleinsten Schrift */
          pruefe(nah(s.kleinste_versalhoehe_mm, 2.05, 0.05),
            "Die kleinste Versalhöhe muss rund 2,05 mm sein");
          pruefe(s.aufloesung.dpi > 300 && s.aufloesung.dpi <= DPI_DECKEL,
            "2 mm Schrift muss eine hohe Auflösung verlangen, verlangt "
              + s.aufloesung.dpi.toFixed(0));
          pruefe(s.kachelplan(254).anzahl === 6, "A3 bei 254 dpi ergibt 6 Kacheln");
          return lib;
        });
    }).then(function (lib) {
      /* Drehung: pdf.js dreht selbst, und nachAnsicht muss dasselbe rechnen */
      const proben = [0, 90, 180, 270].map(function (r) {
        return lib.getDocument({ data: pruefPdf({ drehung: r }), isEvalSupported: false })
          .promise.then(function (d) { return d.getPage(1); })
          .then(function (p) {
            const v = p.getViewport({ scale: 1 });
            const meins = nachAnsicht(198.4, 367.4, {
              drehung: r, x0: p.view[0], y0: p.view[1], x1: p.view[2], y1: p.view[3], skala: 1 });
            const pdfjs = v.convertToViewportPoint(198.4, 367.4);
            pruefe(nah(meins.x, pdfjs[0], 0.01) && nah(meins.y, pdfjs[1], 0.01),
              "nachAnsicht muss bei " + r + " Grad dasselbe rechnen wie pdf.js ("
                + meins.x.toFixed(1) + "/" + meins.y.toFixed(1) + " gegen "
                + pdfjs[0].toFixed(1) + "/" + pdfjs[1].toFixed(1) + ")");
            if (r === 90 || r === 270) {
              pruefe(nah(v.width, 841.89, 0.5),
                "Bei " + r + " Grad muss pdf.js das Blatt gedreht melden");
            }
          });
      });
      return Promise.all(proben).then(function () { return lib; });
    }).then(function (lib) {
      /* Dasselbe Blatt, aber in einem eigenen Koordinatenraum abgelegt und per
       * cm verkleinert — so gibt jede CAD-Ausgabe ihre Pläne aus. Am echten
       * A1-Plan des BLB NRW steht dort der Faktor 0,06. Ohne Anwenden der
       * Matrix kämen Strecken heraus, die länger sind als das Blatt. */
      return lib.getDocument({ data: pruefPdf({ ctm: 0.06 }), isEvalSupported: false })
        .promise
        .then(function (d) { return seiteLesen(lib, d, 1); })
        .then(function (s) {
          const lang = s.strecken.slice().sort((a, b) => b.laenge_pt - a.laenge_pt)[0];
          pruefe(lang && lang.laenge_pt < s.breite_pt,
            "Keine Strecke darf länger sein als das Blatt breit ist ("
              + (lang ? lang.laenge_pt.toFixed(0) : "-") + " gegen "
              + s.breite_pt.toFixed(0) + " pt)");
          pruefe(lang && nah(lang.laenge_pt, 354.1, 0.05),
            "Auch mit Matrix muss die lange Seite 354,1 pt messen, misst "
              + (lang ? lang.laenge_pt.toFixed(2) : "-"));
          pruefe(s.strecken.length === 12, "Auch mit Matrix zwölf Strecken");
          pruefe(s.massstab.guete === "abgesichert" && s.massstab.nenner === 100,
            "Auch mit Matrix muss 1:100 abgesichert herauskommen, kommt "
              + s.massstab.nenner + "/" + s.massstab.guete);
          const fl = s.flaechen();
          pruefe(fl.length === 1 && nah(fl[0].flaeche_m2, 12.49 * 8.74, 0.06),
            "Auch mit Matrix muss die Fläche 109,16 m² sein, ist "
              + (fl[0] ? fl[0].flaeche_m2.toFixed(2) : "-"));
          return lib;
        });
    }).then(function (lib) {
      /* Sauber abfallen: kaputt, leer, kein PDF */
      const kaputt = lib.getDocument({ data: new Uint8Array([1, 2, 3, 4, 5]) }).promise
        .then(function () { pruefe(false, "Eine kaputte Datei muss einen Fehler werfen"); },
              function (e) {
                pruefe(/beschädigt|gültiges PDF/.test(fehlerKlartext(e)),
                  "Die kaputte Datei muss Klartext ergeben, ergibt " + fehlerKlartext(e));
              });
      const leer = lib.getDocument({ data: new Uint8Array(0) }).promise
        .then(function () { pruefe(false, "Eine leere Datei muss einen Fehler werfen"); },
              function (e) {
                pruefe(/beschädigt|gültiges PDF/.test(fehlerKlartext(e)),
                  "Die leere Datei muss Klartext ergeben");
              });
      return Promise.all([kaputt, leer]);
    }).then(function () {
      /* Und derselbe Weg über dateiOeffnen, wie ihn die Oberfläche geht */
      return dateiOeffnen(pruefPdf(), { name: "pruef.pdf" }).then(function (r) {
        pruefe(r.ok === true, "dateiOeffnen muss das Prüf-PDF annehmen");
        pruefe(r.art === "pdf" && r.seiten.length === 1, "Eine Seite muss herauskommen");
        pruefe(r.seiten[0].massstab.nenner === 100, "Auch über dateiOeffnen kommt 1:100");
      });
    }).then(function () {
      return dateiOeffnen(new Uint8Array([9, 9, 9]), { name: "kaputt.pdf" }).then(function (r) {
        pruefe(r.ok === false, "Eine kaputte Datei darf nicht ok melden");
        pruefe(/beschädigt|gültiges PDF/.test(r.meldung || ""),
          "dateiOeffnen muss den Klartext durchreichen");
        pruefe(Array.isArray(r.seiten) && r.seiten.length === 0,
          "Bei einem Fehler darf keine Seite herauskommen");
      });
    }).then(function () {
      return dateiOeffnen(new Uint8Array([0, 1]), { name: "plan.dwg" }).then(function (r) {
        pruefe(r.ok === false && r.art === "abgelehnt", "DWG muss abgelehnt werden");
        pruefe(/CAD/.test(r.meldung || ""), "Die DWG-Absage muss den Ausweg nennen");
      });
    }).then(function () {
      return { ok: f.length === 0, fehler: f, anzahl: n };
    }).catch(function (e) {
      f.push("Der Selbsttest ist abgebrochen: " + (e && e.message || e));
      return { ok: false, fehler: f, anzahl: n };
    });
  }

  /* =========================================================================
   * Ausgabe
   * =======================================================================*/

  return {
    // Bibliothek und Dateien
    bibliothekLaden: bibliothekLaden,
    dateiOeffnen: dateiOeffnen,
    dateiArt: dateiArt,
    fehlerKlartext: fehlerKlartext,
    kostenrahmen: kostenrahmen,

    // Seiten und Rendern
    seitentypBestimmen: seitentypBestimmen,
    renderaufloesung: renderauflösung,
    kachelplan: kachelplan,
    bildtoken: bildtoken,
    nativeAufloesung: nativeAufloesung,
    blattformat: blattformat,
    nachAnsicht: nachAnsicht,

    // Text
    textstueckeOrdnen: textstueckeOrdnen,
    kleinsteVersalhoehe: kleinsteVersalhoehe,
    versalhoeheMm: versalhoeheMm,
    massstabAusVermerk: massstabAusVermerk,
    masszahlLesen: masszahlLesen,
    raumstempelLesen: raumstempelLesen,
    zahlDeutsch: zahlDeutsch,
    raumbloeckeLesen: raumbloeckeLesen,
    hochstellungenAnfuegen: hochstellungenAnfuegen,
    geschosstitelLesen: geschosstitelLesen,
    geschossZuLage: geschossZuLage,
    textAchsen: textAchsen,
    blattkopfLesen: blattkopfLesen,
    zeilenBilden: zeilenBilden,
    objektangabenLesen: objektangabenLesen,
    ligaturenLernen: ligaturenLernen,
    ligaturenAnwenden: ligaturenAnwenden,

    // Geometrie
    pfadAufloesen: pfadAufloesen,
    streckenAus: streckenAus,
    zugUmrechnen: zugUmrechnen,
    flaecheAusZug: flaecheAusZug,
    rechteckAusZug: rechteckAusZug,
    flaechePt2: flaechePt2,
    umfangPt: umfangPt,

    // Maßstab
    massstabAusKette: massstabAusKette,
    massstabAusGeometrie: massstabAusGeometrie,
    massstabBestimmen: massstabBestimmen,
    einrasten: einrasten,

    // Außenbemaßung, daraus die Gebäudekontur
    abschnitteAusTextstand: abschnitteAusTextstand,
    kettenAusAbschnitten: kettenAusAbschnitten,
    aussenbemassungAusTextstand: aussenbemassungAusTextstand,

    // Umrechnung
    ptZuMm: ptZuMm, mmZuPt: mmZuPt, dpiZuSkala: dpiZuSkala, skalaZuDpi: skalaZuDpi,

    // Prüfung
    pruefPdf: pruefPdf,
    selbsttest: selbsttest,
    selbsttestPdf: selbsttestPdf,

    // Kennwerte, damit die Oberfläche dieselben Zahlen nennt
    KACHEL_PX: KACHEL_PX, UEBERLAPPUNG_PX: UEBERLAPPUNG_PX,
    DPI_DECKEL: DPI_DECKEL, TOKEN_GRENZE: TOKEN_GRENZE,
  };
});
