/* ===========================================================================
 * modul_bericht.js — prüfbarer Heizlastbericht als Druckseite und Word-Datei
 * ===========================================================================
 * Kapitelaufbau nach SPEZIFIKATION_BERICHT.md, Messlatte ist der Bericht
 * heizlast_maelzerstr59/Bericht_Heizlast_Maelzerstr59.pdf.
 *
 * Kapitel:  Deckblatt · 1 Ergebnis · 2 Objekt · 3 Planunterlagen ·
 *           4 Berechnungsgrundlagen · 5 Bauteile und U-Werte ·
 *           6 Unbeheizte Bereiche · 7 Raumweise Heizlast ·
 *           8 Offene Punkte · 9 Plausibilitätsprüfungen ·
 *           10 Quellen, Annahmen und Konfidenz · Anlage 1
 * Die Variantenrechnung und die Wärmepumpen-Empfehlung des Referenzberichts
 * sind ausdrücklich nicht Teil dieses Berichts.
 *
 * DREI GRÖSSEN BILDET DIESES MODUL SELBST, weil der Rechenkern sie nicht
 * herausgibt (Anhang der Spezifikation). Der Kern bleibt dafür unangetastet:
 * seine 14 Selbsttests und die Validierung gegen das geprüfte Python-Modell
 * behalten damit ihre Aussage, und keine der drei Größen geht in ein
 * Rechenergebnis ein — sie werden nur berichtet.
 *   1. Anteil des Wärmebrückenzuschlags   -> wbZuschlagAnteil()
 *   2. H je Wärmestromrichtung einer Zone -> zonenBilanz()
 *   3. Temperaturkorrekturfaktor f        -> fFaktor()
 * Alle drei sind DOM-frei und werden von selbsttest() gegen von Hand
 * gerechnete Beispiele geprüft. zonenBilanz() rechnet zusätzlich das
 * gewichtete Mittel nach; weicht es von e.zonen ab, wird der Bericht
 * blockiert.
 *
 * [MODELL]-Textbausteine (fachliche Bewertungen) stehen in p.texte. Fehlen
 * sie, entfällt der Absatz. Es wird nichts formuliert, was nicht belegt ist.
 * =========================================================================== */
"use strict";

(function () {
  /* Die Freigabe steht am Projekt, nicht im Quelltext. Vorher war sie eine
     Konstante auf false: jeder ausgelieferte Bericht trug damit auf jeder
     Seite "Entwurf" und ließ sich gar nicht freigeben. Gesetzt wird sie im
     Werkzeug unter "Bericht und Unterschrift". */
  function freigegeben() {
    const A = typeof window !== "undefined" ? window.App : null;
    return jaNein(A && A.p && A.p.meta && A.p.meta.freigegeben) === true;
  }

  /* Abweichung, ab der die Gegenrechnung der Zonenbilanz den Bericht sperrt */
  const ZONEN_TOLERANZ_K = 0.05;

  /* Griff auf die stehende Pop-up-Warnung, damit sie zurueckgenommen werden
     kann, sobald ein Berichtsfenster wieder aufgeht (Begruendung unten). */
  let popupWarnung = null;

  /* ------------------------------------------------------------------ *
   * 0  Format und Kleinkram
   * ------------------------------------------------------------------ */
  const e2 = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const f = (x, n) => (Number.isFinite(x) ? x.toLocaleString("de-DE",
    { minimumFractionDigits: n === undefined ? 0 : n,
      maximumFractionDigits: n === undefined ? 0 : n }) : "–");

  /** Leistung in kW mit zwei Nachkommastellen, wie im Referenzbericht. */
  const kw = (w) => (Number.isFinite(w) ? f(w / 1000, 2) + " kW" : "–");

  /** Belegsaetze des Rechenkerns zu einem Bereich ausgeben. Der Kern liefert
   *  sie samt Fundstelle in e.hinweise; der Bericht haengt sie an das
   *  zugehoerige Kapitel, damit keine Vereinfachung unerwaehnt bleibt.
   *  In der DRUCKFASSUNG gilt je Hinweis der druckfaehige Wortlaut
   *  text_druck, sofern der Kern einen mitliefert: derselbe methodische
   *  Inhalt, ohne Guete- und Quellenvokabular. Fehlt er, wird der volle
   *  Text gesetzt — die druckSuche in build.py 5b faengt dann jedes Wort,
   *  das dort nicht hingehoert. */
  const kernHinweise = (e, bereich, druck) => ((e && e.hinweise) || [])
    .filter((x) => x.bereich === bereich)
    .map((x) => '<p class="klein">'
      + e2(druck && x.text_druck ? x.text_druck : x.text) + "</p>").join("");

  /** Auswahlfelder der Oberfläche liefern Zeichenketten, ältere Projekte
   *  echte Wahrheitswerte. Beides muss dasselbe bedeuten. Ohne Angabe: null,
   *  damit "nicht beantwortet" nicht als "nein" durchgeht. */
  function jaNein(x) {
    if (x === true) return true;
    if (x === false) return false;
    const s = String(x == null ? "" : x).trim().toLowerCase();
    if (s === "ja") return true;
    if (s === "nein") return false;
    return null;
  }

  const zahl = (x, d) => {
    const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (d === undefined ? 0 : d);
  };

  const heute = () => new Date().toLocaleDateString("de-DE",
    { day: "2-digit", month: "long", year: "numeric" });

  /** Ein gespeichertes Datum ist ISO („2026-08-25"), ein deutscher Bericht
   *  schreibt „25.08.2026". Befund der Ziolkowski-Prüfung 25.08.2026: auf dem
   *  Deckblatt stand „Stand 2026-08-25" und „Entwurf vom 2026-08-25".
   *  Alles, was nicht nach ISO aussieht, geht unverändert durch — ein von
   *  Hand eingetragener Stand („Mai 2026") bleibt, wie er ist. */
  function datumDeutsch(s) {
    const t = String(s == null ? "" : s).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    return m ? m[3] + "." + m[2] + "." + m[1] : t;
  }

  /** Aufzählung sprachlich verbinden: a, b und c */
  function undListe(arr) {
    const a = (arr || []).filter(Boolean).map(String);
    if (!a.length) return "";
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(", ") + " und " + a[a.length - 1];
  }

  /** Ein Zählwort mit richtiger Mehrzahl. "1 Warnungen" liest sich wie ein
   *  Fehler des Werkzeugs und wirft ein schlechtes Licht auf den ganzen
   *  Bericht. */
  function anzahlWort(n, ein, viele) {
    return f(n, 0) + " " + (n === 1 ? ein : viele);
  }

  /** Die Stufe eines Befunds als Wort. Die Liste stand früher an genau einer
   *  Stelle mitten im Kapitel und kannte nur drei der fünf Stufen; für die
   *  übrigen druckte der Bericht das Wort „undefined". Sie steht deshalb
   *  hier, wird an der Druckstelle mit einem Rückfall benutzt und ist
   *  einzeln prüfbar. */
  /* Die Stufe "warnung" kommt seit dem 25.08.2026 nicht mehr an — die
     Selbstprüfung legt sie am Sammelpunkt mit "hinweis" zusammen
     (Kundenwort: was kein Fehler ist, ist ein Hinweis). Der Eintrag bleibt
     als Rückfall, damit ein alter Stand nie "undefined" druckt — und dann
     mit dem Kundenwort. */
  const STUFENWORT = { fehler: "Fehler", warnung: "Hinweis",
                       offen: "Offene Frage", hinweis: "Hinweis",
                       bestaetigt: "Zur Kenntnis genommen", gut: "ohne Befund" };

  /** Was die Ampel der Selbstprüfung für den Leser bedeutet. Eine Farbe ohne
   *  Erklärung ist für den Auftraggeber wertlos.
   *
   *  „durchgesehen" ist die Zahl der Punkte, die der Bearbeiter zur Kenntnis
   *  genommen hat. Bei Grün darf dann nicht mehr dastehen, keine Prüfung
   *  habe einen Befund ergeben: Befunde gab es, ein Fachmann hat sie
   *  beurteilt. Der Unterschied ist genau der zwischen einem sauberen und
   *  einem geschönten Bericht. */
  function ampelSatz(ampel, durchgesehen) {
    if (ampel === "rot") {
      return "Nicht belastbar heißt: mindestens eine Pflichtangabe fehlt oder eine "
        + "Prüfung ist nicht bestanden. Die Zahlen dieses Berichts sind in diesem "
        + "Zustand nicht zur Auslegung eines Wärmeerzeugers geeignet.";
    }
    if (ampel === "gelb") {
      /* Seit dem 25.08.2026 hängt Gelb nur noch an offenen Fragen: Hinweise
         halten die Freigabe nicht auf, und ein Ergebnis nur mit Annahmen
         trägt die Stufe „annahme". Der Satz nennt deshalb die Fragen. */
      return "Mit Einschränkung belastbar heißt: die Rechnung ist in sich schlüssig, "
        + "aber es stehen noch Fragen offen, die nur ein Bearbeiter am Plan "
        + "beantworten kann. Solange sie offen sind, gilt das Ergebnis nur mit "
        + "Einschränkung; die Fragen stehen einzeln im Prüfkapitel.";
    }
    if (ampel === "annahme") {
      return "Belastbar unter genannten Annahmen heißt: keine Prüfung ist "
        + "durchgefallen, und es fehlt keine Pflichtangabe. Einzelne Eingaben "
        + "standen aber nicht in den Unterlagen und sind aus ihnen abgeleitet "
        + "worden. Sie sind unten in der Annahmenliste einzeln aufgeführt, "
        + "jede mit ihrer Herleitung und der Richtung, in die sie danebenliegen "
        + "kann. Solange sie gelten, trägt diese Rechnung; sind sie zu "
        + "berichtigen, ist sie zu wiederholen.";
    }
    if (ampel === "gruen") {
      return "Belastbar heißt: "
        + (durchgesehen
          ? "keine Prüfung hat einen Befund ergeben, der offen geblieben wäre. "
          : "keine der Prüfungen hat einen Befund ergeben. ")
        + "Die Annahmen, auf denen die Rechnung beruht, bleiben davon unberührt und "
        + "sind im Kapitel zu Quellen und Konfidenz einzeln aufgeführt.";
    }
    return "";
  }

  /** Ein Zeitpunkt „2026-08-21 16:54" als deutscher Zeitpunkt. Was nicht so
   *  aussieht, wird unverändert durchgereicht statt umgedeutet. */
  function zeitpunkt(roh) {
    const t = String(roh == null ? "" : roh).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(t);
    if (!m) return t;
    return m[3] + "." + m[2] + "." + m[1] + (m[4] ? ", " + m[4] + " Uhr" : "");
  }

  /** Der eine Satz, der von den zur Kenntnis genommenen Punkten übrig bleibt.
   *
   *  Er ist kein Hinweis, sondern eine Tatsache über dieses Dokument: ein
   *  Fachmann hat die Punkte gesehen und beurteilt. Ohne ihn liest sich ein
   *  Bericht ohne Befundliste so, als hätte das Werkzeug nichts gefunden.
   *  Das wäre die stärkere und die falsche Aussage. Mit ihm steht da, was
   *  wirklich geschehen ist, und die aufgeräumte Ausgabe wird dadurch
   *  belastbar statt bloß aufgeräumt.
   *
   *  Erfunden wird nichts. Fehlt der Name, steht „Der Bearbeiter"; fehlt der
   *  Zeitpunkt, entfällt das Datum, statt eines zu raten.
   *
   *  „offenAnzahl" ist die Zahl der Zeilen, die trotzdem noch in der Tabelle
   *  darüber stehen. Ist sie null, hat ein Mensch alles abgehakt und der
   *  Bericht kommt ohne die Hinweise aus. */
  function durchgesehenKasten(bz, offenAnzahl) {
    if (!bz || !bz.bestaetigt) return "";
    const offen = Number(offenAnzahl) || 0;
    const wer = (bz.namen && bz.namen.length) ? undListe(bz.namen) : "Der Bearbeiter";
    const wann = bz.stand ? (bz.tage > 1 ? " bis zum " + bz.stand : " am " + bz.stand) : "";
    const vermerk = bz.vermerke
      ? " Zu " + (bz.vermerke === 1 ? "einem Punkt" : bz.vermerke + " Punkten")
        + " hat der Bearbeiter einen Vermerk hinterlegt; "
        + (bz.vermerke === 1 ? "er steht" : "sie stehen") + " in Anlage 2."
      : "";
    if (offen) {
      const eins = bz.bestaetigt === 1;
      return '<div class="kasten"><b>' + anzahlWort(bz.bestaetigt, "Punkt", "Punkte")
        + " von " + f(bz.gesamt, 0) + (eins ? " ist" : " sind") + " durchgesehen</b><br>"
        + e2(wer) + " hat " + (eins ? "ihn" : "sie") + wann
        + " geprüft und zur Kenntnis genommen. " + (eins ? "Er steht" : "Sie stehen")
        + " deshalb nicht mehr in der Tabelle darüber. "
        + (offen === 1
          ? "Der übrige Punkt ist dort aufgeführt."
          : "Die übrigen " + f(offen, 0) + " Punkte sind dort aufgeführt.")
        + e2(vermerk) + "</div>";
    }
    return '<div class="kasten" style="border-color:#2C6E2A">'
      + "<b>Durchgesehen und zur Kenntnis genommen</b><br>"
      + "Die Selbstprüfung hat zu diesem Projekt "
      + anzahlWort(bz.bestaetigt, "Punkt", "Punkte") + " aufgeworfen: Fragen an die "
      + "Planunterlagen, gekennzeichnete Annahmen und Einordnungen einzelner Werte. "
      + e2(wer) + " hat " + (bz.bestaetigt === 1 ? "ihn" : "jeden davon") + wann
      + " geprüft und zur Kenntnis genommen. "
      + (bz.bestaetigt === 1 ? "Er steht" : "Keiner der Punkte steht")
      + " der Berechnung entgegen; "
      + (bz.bestaetigt === 1 ? "er ist" : "sie sind")
      + " deshalb in diesem Bericht nicht einzeln aufgeführt." + e2(vermerk) + "</div>";
  }

  /** Was mit einem Bauteil geschieht, wenn es die Anforderung verfehlt.
   *  Fenster und Türen werden getauscht, nicht dicker gedämmt. Ohne diese
   *  Unterscheidung steht im Bericht eine Handlungsanweisung, die es für das
   *  Bauteil gar nicht gibt. */
  function austauschBauteil(z) {
    const id = z && z.anforderung ? z.anforderung.id : null;
    if (id === "fenster" || id === "haustuer") return true;
    return /[Ff]enster|Verglasung|[Tt]ür/.test(String((z && z.kurz) || ""));
  }

  /** Anteil des Transmissionswärmestroms, der auf Bauteilen ohne belegten
   *  U-Wert beruht. Dieselbe Rechnung wie in der Selbstprüfung, hier aber
   *  ohne Umweg über window.App, damit sie im Selbsttest prüfbar ist und
   *  schon auf dem Deckblatt zur Verfügung steht. */
  function annahmeAnteil(e) {
    /* Typologie- und Referenzgebäude-Werte tragen annahme === false
       (Kundenvorgabe 24.08.2026: sie gelten als angesetzt) und zählen hier
       nicht als Annahme. Ihr Anteil reist als prozent_typologie mit, damit
       der Ortstermin-Kasten die Herkunft neutral benennen kann. */
    let annahme = 0, typo = 0, gesamt = 0;
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (b) {
        if (b.kat === "innen") return;
        gesamt += Math.abs(b.phi);
        if (b.annahme) annahme += Math.abs(b.phi);
        else if (b.typologie) typo += Math.abs(b.phi);
      });
    });
    if (!(gesamt > 0)) return null;
    return { prozent: annahme / gesamt * 100, phi_annahme: annahme, phi_gesamt: gesamt,
             prozent_typologie: typo / gesamt * 100 };
  }

  /** Die eine Frage, die der Auftraggeber auf Seite 1 beantwortet haben will:
   *  muss vor der Bestellung noch jemand ins Haus. Beantwortet aus dem Anteil
   *  der Annahmen, in einem Satz, ohne Verweis auf ein späteres Kapitel. */
  function ortsterminSatz(an) {
    if (!an) return "";
    /* DIE FRAGE STEHT VOR DER ANTWORT. Befund Hasenberg 25.08.2026: unter
       der Überschrift „Worauf diese Zahlen stehen" begann der Kasten mit
       „Nein. Die U-Werte…" — eine Antwort auf eine Frage, die nirgends
       stand. Sie steht jetzt im Satz selbst; die Selbsttests prüfen weiter,
       dass Ja und Nein an der Datenlage hängen. */
    const frage = "Muss vor der Bestellung des Wärmeerzeugers noch jemand "
      + "ins Haus? ";
    if (an.prozent < 0.5) {
      /* Stammen U-Werte aus der Gebäudetypologie oder dem Referenzgebäude,
         gelten sie als angesetzt (Kundenvorgabe 24.08.2026) — die Entwarnung
         darf sie dann nicht als „belegt" ausgeben, sondern benennt die
         Herkunft neutral. */
      if ((an.prozent_typologie || 0) >= 0.5) {
        return frage + "Nein. Die U-Werte dieser Rechnung sind belegt oder aus der "
          + "Gebäudetypologie beziehungsweise dem Referenzgebäude angesetzt; "
          + "diese Ansätze gelten. Für die Auslegung des Wärmeerzeugers ist "
          + "kein weiterer Ortstermin nötig.";
      }
      return frage + "Nein. Die U-Werte dieser Rechnung sind belegt; für die Auslegung "
        + "des Wärmeerzeugers ist kein weiterer Ortstermin nötig.";
    }
    return frage + "Ja. " + f(an.prozent, 0) + " Prozent des Transmissionswärmestroms beruhen "
      + "auf Bauteilen, deren Aufbau angenommen und nicht belegt ist. Diese Aufbauten "
      + "sind vor der Bestellung des Wärmeerzeugers am Gebäude zu bestätigen, "
      + "durch Bauteilöffnung oder Endoskopie.";
  }

  /** Wie genau die Zahl auf dem Deckblatt genannt werden darf. Beruht der
   *  Wärmestrom überwiegend auf Annahmen, ist die zweite Nachkommastelle
   *  Rechengenauigkeit und keine Aussagegenauigkeit. Sie dann trotzdem groß
   *  hinzuschreiben, wäre eine Genauigkeit, die die Datenlage nicht hergibt.
   *  Der gerechnete Wert verschwindet nicht, er steht als Zusatz daneben. */
  function deckZahl(phi, an) {
    const genau = f(phi / 1000, 2);
    if (an && an.prozent > 30) {
      return { wert: "rd. " + f(phi / 1000, 1), gerechnet: genau };
    }
    return { wert: genau, gerechnet: "" };
  }

  /** Wie die Version des Rechenkerns im Ausdruck genannt wird. Intern heißt
   *  sie „1.0.0-RC1"; das ist eine Angabe für die Entwicklung, nicht für den
   *  Auftraggeber, und „RC1" liest sich in einem unterschriebenen Bericht wie
   *  ein Vorabstand. Genannt werden deshalb Haupt- und Nebenstelle derselben
   *  Kennung als „Berechnungsversion". Die Version wird nicht geändert, nur
   *  anders geschrieben; gibt es keine, entfällt die Angabe. */
  function berechnungsversion() {
    const v = String((typeof window !== "undefined" && window.KERN_HEIZLAST_NORM
      && window.KERN_HEIZLAST_NORM.version) || "");
    const m = v.match(/^(\d+)\.(\d+)/);
    return m ? ", Berechnungsversion " + m[1] + "." + m[2] : "";
  }

  /* =========================================================================
   * DIE SPANNE GEHÖRT NEBEN DIE ZAHL — UND SIE WAR AUS DEM BERICHT VERSCHWUNDEN
   * =========================================================================
   * KERN_BANDBREITE rechnet zu jedem Ergebnis eine Spanne: welche nicht
   * belegten Größen mit welcher Wirkung darin stecken, und was daraus für ein
   * Bereich um den Punktwert folgt. Auf dem Bildschirm stand sie
   * (app.js, bandbreiteKasten); im BERICHT stand sie nirgends. Gedruckt wurde
   * damit eine einzelne gerundete Zahl, und der einzige Ort, an dem das Wort
   * „Bandbreite" im Bericht überhaupt vorkam, war der Satz in der
   * Baujahr-Gegenrechnung, der auf eine Spanne verweist, die niemand sieht.
   *
   * Sebastians Vorgabe ist Punktwert PLUS Spanne. Beides steht deshalb jetzt
   * an beiden Stellen, an denen die große Zahl steht — Deckblatt und
   * Kapitel 1 —, und beide holen den Wortlaut aus dieser einen Funktion.
   * Zwei Formulierungen desselben Vorbehalts wären zwei Aussagen.
   *
   * Was hier NICHT passiert: es wird nichts gerechnet und nichts gerundet
   * dazuerfunden. Die Zahlen kommen aus App.bandbreite, also aus demselben
   * Lauf wie die Zahl darüber; liegt keine Spanne vor, entfällt der Satz. */
  function bandbreite() {
    const b = (typeof window !== "undefined" && window.App)
      ? window.App.bandbreite : null;
    return (b && b.ok && Number.isFinite(b.unten_w) && Number.isFinite(b.oben_w))
      ? b : null;
  }

  /** Ein Satz: Punktwert, Spanne, worauf sie beruht. Ohne Spanne leer. */
  function bandbreiteSatz(b) {
    if (!b) return "";
    const stufentext = { schmal: "belastbar", mittel: "brauchbar", breit: "grob" };
    return "Geschätzte Spanne " + f(b.unten_w / 1000, 1) + " bis "
      + f(b.oben_w / 1000, 1) + " kW ("
      + (stufentext[b.stufe] || String(b.stufe)) + "). Das ist die plausible "
      + "Bandbreite unter den getroffenen Annahmen und nicht der schlechteste "
      + "denkbare Fall; sie beruht auf " + b.anzahl_groessen + " nicht belegten "
      + "Größen und ist aus " + b.laeufe + " Rechenläufen gebildet.";
  }

  /** Ausgewertete Unterlagen. Die Oberfläche liefert sie als Textfeld mit
   *  einer Unterlage je Zeile, ältere Projekte als Liste. */
  function unterlagen(meta) {
    const m = meta || {};
    if (Array.isArray(m.grundlagen)) return m.grundlagen.filter(Boolean).map(String);
    return String(m.grundlagen || "").split(/[\r\n]+/)
      .map(function (s) { return s.replace(/^[-•*\s]+/, "").trim(); })
      .filter(Boolean);
  }

  /** Text aus p.texte holen. Fehlt er, liefert die Funktion null und der
   *  aufrufende Baustein entfällt. Nichts wird ersatzweise erfunden. */
  function text(p, pfad) {
    const t = (p && p.texte) || {};
    const teile = String(pfad).split(".");
    let x = t;
    for (let i = 0; i < teile.length; i++) {
      if (x == null || typeof x !== "object") return null;
      x = x[teile[i]];
    }
    return typeof x === "string" && x.trim() ? x.trim() : null;
  }

  /** Fehlt ein [MODELL]-Baustein, steht dort nichts. Kein Platzhalter, kein
   *  eckiger Klammertext. Ein Bericht, für den jemand bezahlt hat, darf keine
   *  Baustelle zeigen; entweder steht da ein Satz oder der Abschnitt entfällt
   *  mitsamt seiner Überschrift. Was noch fehlt, sagt das Kontrollblatt im
   *  Werkzeug, nicht das Papier beim Auftraggeber.
   *  Die Funktion bleibt bestehen, damit jede Aufrufstelle sichtbar macht,
   *  welcher Absatz hier stünde. */
  function offenerText() {
    return "";
  }

  function standort() {
    const S = (typeof window !== "undefined" && window.STANDORTE) || {};
    const k = (typeof window !== "undefined" && window.App && window.App.p.standort)
      || "paderborn";
    return S[k] || S.paderborn || { ersteller: {}, erstellort: "" };
  }
  function briefkopf(art) {
    const A = (typeof window !== "undefined" && window.ASSETS) || {};
    const k = (typeof window !== "undefined" && window.App && window.App.p.standort)
      || "paderborn";
    const b = A.briefkoepfe && A.briefkoepfe[k];
    return b && b[art] ? b[art] : null;
  }

  /* ------------------------------------------------------------------ *
   * 1  Abgeleitete Größen, die der Rechenkern nicht liefert
   * ------------------------------------------------------------------ */

  /** Anteil des pauschalen Wärmebrückenzuschlags an der Heizlast, in W.
   *  Summe über alle Hüllbauteile von A * (U_eff - U) * (theta_i - theta_j).
   *  Nur Bauteile der Kategorie "huelle" tragen den Zuschlag; erdberührte,
   *  Nachbar- und Innenbauteile bekommen ihn im Kern nicht. */
  function wbZuschlagAnteil(e) {
    let s = 0;
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat !== "huelle") return;
        s += bt.A * (bt.U_eff - bt.U) * (r.theta_i - bt.theta_j);
      });
    });
    return s;
  }

  /** Temperaturkorrekturfaktor f eines Bauteils.
   *  Regelfall (theta_i - theta_j) / (theta_i - theta_e).
   *  Erdberührt F_G1 * f_g2 * G_W, weil dort das Verfahren nach
   *  DIN EN 12831-1 Abschn. 6.2 an die Stelle der Temperaturdifferenz tritt. */
  function fFaktor(r, bt, e) {
    if (bt.kat === "erdreich") {
      return e.norm.F_G1 * zahl(bt.f_g2, 0) * e.norm.G_W;
    }
    const nenner = r.theta_i - e.klima.theta_e;
    if (!Number.isFinite(nenner) || nenner === 0) return 0;
    return (r.theta_i - bt.theta_j) / nenner;
  }

  /** Wärmestrombilanz einer unbeheizten Zone, aufgeschlüsselt nach Richtung.
   *  Bildet die Regel des Kerns nach (Abschnitt 4 dort): H = A * U OHNE
   *  Wärmebrückenzuschlag, es sei denn p.optionen.wbz_in_zonenbilanz ist
   *  gesetzt. Nur so trifft das gewichtete Mittel e.zonen[id].
   *  Rückgabe je Zone: {id, name, modus, gruppen[], mittel, ergebnis, abweichung} */
  function zonenBilanz(p, e) {
    const dU = zahl(e.norm && e.norm.DELTA_U_WB, 0);
    const mitZuschlag = !!(p.optionen && p.optionen.wbz_in_zonenbilanz);
    const theta_e = e.klima.theta_e;
    const theta_e_m = Number.isFinite(e.klima.theta_e_m) ? e.klima.theta_e_m : theta_e;

    return (p.zonen || []).map(function (z) {
      const gruppen = [];
      const index = {};
      function add(schluessel, label, H, theta, teilname) {
        if (!Number.isFinite(H) || H === 0) { if (H !== 0) return; }
        if (!index[schluessel]) {
          index[schluessel] = { label: label, H: 0, theta: theta, teile: [] };
          gruppen.push(index[schluessel]);
        }
        index[schluessel].H += H;
        if (teilname && index[schluessel].teile.indexOf(teilname) < 0) {
          index[schluessel].teile.push(teilname);
        }
      }

      // a) Bauteile beheizter Räume, die an diese Zone grenzen
      ((e && e.raeume) || []).forEach(function (r) {
        (r.bauteile || []).forEach(function (bt) {
          const g = bt.grenzt_an || {};
          if (g.typ !== "zone" || g.ref !== z.id) return;
          const H = bt.A * (bt.U + (mitZuschlag ? dU : 0));
          add("raum_" + r.theta_i.toFixed(1),
              "beheizte Räume (" + f(r.theta_i, 1) + " °C)", H, r.theta_i, r.geschoss);
        });
      });

      // b) eigene Hüllbauteile der Zone
      (z.huelle || []).forEach(function (bt) {
        const H = zahl(bt.A, 0) * zahl(bt.U, 0);
        const g = bt.grenzt_an || { typ: "aussen" };
        const nam = bt.name || "Bauteil";
        if (g.typ === "aussen") {
          add("aussen", "Außenluft", H, theta_e, nam);
        } else if (g.typ === "erdreich") {
          add("erdreich", "Erdreich", H, theta_e_m, nam);
        } else if (g.typ === "zone") {
          const t = zahl(e.zonen[g.ref], theta_e);
          const nachbar = (p.zonen || []).find(function (x) { return x.id === g.ref; });
          add("zone_" + g.ref, (nachbar ? nachbar.name : g.ref)
            + " (" + f(t, 1) + " °C)", H, t, nam);
        } else if (g.typ === "fest") {
          const t = zahl(g.theta, theta_e);
          add("fest_" + t.toFixed(1),
              "fest vorgegebene Nachbartemperatur (" + f(t, 1) + " °C)", H, t, nam);
        } else {
          add("sonst", "sonstige Nachbarschaft", H, theta_e, nam);
        }
      });

      let sumH = 0, sumHT = 0;
      gruppen.forEach(function (g) { sumH += g.H; sumHT += g.H * g.theta; });
      const mittel = sumH > 0 ? sumHT / sumH : theta_e;
      const ergebnis = z.modus === "fest"
        ? zahl(z.theta_fest, theta_e) : zahl(e.zonen[z.id], mittel);
      /* Wann ist die Abweichung zwischen Bilanz und Kern überhaupt eine
         Aussage? Nur dann, wenn der Kern selbst bilanziert hat.
         Vorgegeben ist die Temperatur bei "fest", beim Pauschalwert f_1 und
         bei einer gewählten Lage nach DIN/TS 12831-1:2020-04, Tabelle 5 —
         dort ist die Bilanz Vergleichswert und nicht Maßstab. Und ohne eigene
         Hüllbauteile besteht die Bilanz allein aus den angrenzenden beheizten
         Räumen: sie ergibt zwangsläufig deren 20 °C.
         GEMESSEN am 22.08.2026: ein Projekt mit automatisch angelegtem Keller
         (5,2 °C) und Dachraum (-6,6 °C) lieferte hier 14,8 K Abweichung, und
         erzeugen() verweigerte daraufhin den Bericht — bei einer Selbstprüfung
         ohne einen einzigen Fehler. Der Rechenkern kennt die Unterscheidung
         bereits (zonenBefund: herkunft, ohne_huelle); hier stand die zweite,
         gröbere Wahrheit. */
      const eigeneHuelle = (z.huelle || []).some(function (bt) {
        return zahl(bt.A, 0) > 0; });
      const vorgegeben = z.modus === "fest" || z.modus === "f1" || z.modus === "lage";
      const vergleichbar = !vorgegeben && eigeneHuelle;
      return {
        id: z.id, name: z.name || z.id, modus: z.modus || "bilanz",
        gruppen: gruppen, H_gesamt: sumH, mittel: mittel, ergebnis: ergebnis,
        vergleichbar: vergleichbar,
        abweichung: vergleichbar ? Math.abs(mittel - ergebnis) : 0,
      };
    });
  }

  /** Wurde für mindestens einen unbeheizten Bereich wirklich eine Wärmebilanz
   *  geführt? Ohne eigene Hüllbauteile und bei vorgegebener Lage oder festem
   *  Eintrag ist keine Bilanz möglich. Gleiche Bedingung wie `vergleichbar` in
   *  zonenBilanz(), damit die Abschnitte 2.1, 4.1 und 6 dasselbe sagen und der
   *  Bericht nirgends eine Herleitung behauptet, die nicht stattgefunden hat. */
  function zonenBilanziert(p) {
    return ((p && p.zonen) || []).some(function (z) {
      const vorgegeben = z.modus === "fest" || z.modus === "f1" || z.modus === "lage";
      const eigeneHuelle = (z.huelle || []).some(function (bt) {
        return zahl(bt.A, 0) > 0; });
      return !vorgegeben && eigeneHuelle;
    });
  }

  /** Geschosse in der Reihenfolge ihres Auftretens im Raumbuch. */
  function geschossReihenfolge(e) {
    const g = [];
    ((e && e.raeume) || []).forEach(function (r) {
      const k = r.geschoss || "-";
      if (g.indexOf(k) < 0) g.push(k);
    });
    return g;
  }

  /** Bauteilnamen, unter denen rechne() U-Werte zusammenfasst, die gar nicht
   *  gleich sind. rechne() gruppiert über name.split(" (")[0] und behält den
   *  U-Wert des zuerst gefundenen Bauteils; hier wird das aufgedeckt, damit
   *  Kapitel 7.2 „gemischt" statt einer falschen Zahl druckt. */
  function bilanzGemischt(e) {
    const gesehen = {};
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat === "innen") return;
        const k = String(bt.name).split(" (")[0];
        if (!gesehen[k]) gesehen[k] = {};
        gesehen[k][bt.U.toFixed(4)] = true;
      });
    });
    const raus = {};
    Object.keys(gesehen).forEach(function (k) {
      if (Object.keys(gesehen[k]).length > 1) raus[k] = true;
    });
    return raus;
  }

  /** Anzeigename eines Bauteils, das an einen unbeheizten Bereich grenzt.
   *  Der Typname allein sagt nicht, wogegen gerechnet wurde: „Dach" liest
   *  sich wie Außenluft, obwohl der Raum an einen unbeheizten Dachraum
   *  grenzt und mit dessen Temperatur gerechnet ist. Nennt der Name den
   *  Bereich schon selbst („Kellerdecke" gegen „Unbeheizter Keller"), bleibt
   *  er, wie er ist — sonst wird die Tabelle nur länger, ohne klarer zu
   *  werden. Rein sprachlich: Fläche, U-Wert, Temperatur und Wärmestrom
   *  bleiben unverändert. */
  function mitBereich(name, ref, p) {
    if (!ref) return name;
    const z = ((p && p.zonen) || []).find(function (x) { return x.id === ref; });
    const zn = String((z && z.name) || ref);
    const kern = zn.replace(/^Unbeheizte[rs]?\s+/, "");
    if (kern.length > 3
      && String(name).toLowerCase().indexOf(kern.toLowerCase()) >= 0) return name;
    /* „Unbeheizter Dachraum" → „gegen unbeheizten Dachraum". Passt die Endung
       nicht, bleibt der Bereichsname unverändert stehen: einen frei
       eingegebenen Namen zu beugen, ginge öfter schief als gut. */
    const gebeugt = /^Unbeheizter\s+/.test(zn)
      ? zn.replace(/^Unbeheizter\s+/, "unbeheizten ")
      : (/^Unbeheizte(s)?\s+/.test(zn) ? zn.charAt(0).toLowerCase() + zn.slice(1) : zn);
    return name + " gegen " + gebeugt;
  }

  /** Je Bauteilname der unbeheizte Bereich, an den er grenzt — aber nur,
   *  wenn ALLE Zeilen dieses Namens an denselben Bereich grenzen. Sonst
   *  stünde an der zusammengefassten Zeile der Bauteilbilanz eine Grenze,
   *  die für einen Teil ihrer Fläche nicht gilt. */
  function bauteilGrenzbereich(e) {
    const raus = {}, mehrdeutig = {};
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat === "innen") return;
        const k = String(bt.name).split(" (")[0];
        const g = bt.grenzt_an || {};
        const ref = g.typ === "zone" ? g.ref : "";
        if (!(k in raus)) raus[k] = ref;
        else if (raus[k] !== ref) mehrdeutig[k] = true;
      });
    });
    Object.keys(mehrdeutig).forEach(function (k) { raus[k] = ""; });
    return raus;
  }

  /** Nachbarschaften, die in Kapitel 7.1 in der Fußnote aufzuzählen sind. */
  function nachbarschaften(p, e) {
    const l = [];
    let aussen = false, nachbar = false, erdreich = false;
    const zonen = [];
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        const g = bt.grenzt_an || {};
        if (bt.kat === "erdreich" || g.typ === "erdreich") erdreich = true;
        else if (bt.kat === "nachbar") nachbar = true;
        else if (g.typ === "zone") {
          const z = (p.zonen || []).find(function (x) { return x.id === g.ref; });
          const n = "\u201E" + (z ? z.name : g.ref) + "\u201C";
          if (zonen.indexOf(n) < 0) zonen.push(n);
        } else if (g.typ === "aussen") aussen = true;
      });
    });
    if (aussen) l.push("an Außenluft");
    zonen.forEach(function (n) { l.push("an " + n); });
    if (erdreich) l.push("an das Erdreich");
    if (nachbar) l.push("an das Nachbargebäude");
    return l;
  }

  /** Feste Nachbartemperaturen aus den Bauteilen, ohne die, die schon über
   *  eine verwendete Raumart belegt sind. Sonst stünde die Temperatur des
   *  Bades zweimal in der Tabelle: einmal als Raumart, einmal als
   *  Nachbartemperatur der Innenwand. */
  function festeNachbarn(p, e) {
    const DR = (typeof window !== "undefined" && window.DATEN_RAUMARTEN) || null;
    const ausRaumart = {};
    (p.raeume || []).forEach(function (r) {
      const a = DR && DR.RAUMARTEN[r.art];
      if (a && a.theta_i != null) ausRaumart[a.theta_i.toFixed(1)] = true;
    });
    const raus = {};
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        const g = bt.grenzt_an || {};
        if (g.typ !== "fest") return;
        const k = zahl(g.theta, 0).toFixed(1);
        if (ausRaumart[k]) return;
        if (!raus[k]) raus[k] = bt.name;
      });
    });
    return raus;
  }

  /* ------------------------------------------------------------------ *
   * 2  Bauteiltypen: U-Wert, Schichtnachweis, BEG-Anforderung
   * ------------------------------------------------------------------ */

  /** Verwendete Bauteiltypen mit allem, was Kapitel 5 und 10 brauchen. */
  function bauteilZeilen(p, e) {
    const DB = (typeof window !== "undefined" && window.DATEN_BAUTEILE) || null;
    const BEG = (typeof window !== "undefined" && window.DATEN_BEG_ANFORDERUNGEN) || null;
    const genutzt = {};
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        const k = String(bt.name).split(" (")[0];
        if (!genutzt[k]) genutzt[k] = { phi: 0, A: 0, huelle: 0, innen: 0 };
        if (bt.kat !== "innen") { genutzt[k].phi += bt.phi; genutzt[k].huelle++; }
        else genutzt[k].innen++;
        genutzt[k].A += bt.A;
      });
    });

    /* EIN BAUTEIL, DAS WAERME TRAEGT, STEHT IM BERICHT.
     *
     * GEMESSEN am 26.08.2026 an "BV 2-0887 Ziolkowski": das Modell rechnete
     * 78,0 m² "Kellerwand gegen Erdreich" mit U 0,27 und 324 W -- 7,0 % des
     * Transmissionsanteils. Als Bauteil-TYP war sie nie angelegt (angelegt
     * und unbenutzt war stattdessen "Kellerdecke"). Diese Aufstellung geht
     * ueber p.bauteiltypen, und so fehlte die Zeile in Abschnitt 4 wie in
     * Abschnitt 5: der Bericht wies fuenf U-Werte aus und rechnete mit
     * sechs. Ergaenzt wird deshalb jedes benutzte Bauteil, fuer das es
     * keinen Typ gibt -- mit dem U-Wert, mit dem gerechnet wurde. */
    const bekannt = {};
    (p.bauteiltypen || []).forEach(function (t) {
      bekannt[String(t.name || "").split(" (")[0]] = true;
    });
    const ohneTyp = [];
    Object.keys(genutzt).forEach(function (kurz) {
      if (bekannt[kurz]) return;
      let uSum = 0, aSum = 0, art = null;
      ((e && e.raeume) || []).forEach(function (r) {
        (r.bauteile || []).forEach(function (bt) {
          if (String(bt.name).split(" (")[0] !== kurz) return;
          const a = zahl(bt.A, 0);
          uSum += zahl(bt.U, 0) * a; aSum += a;
          if (!art) art = bt.art || null;
        });
      });
      ohneTyp.push({ id: "ohne_typ_" + kurz, name: kurz, art: art,
                     U: aSum > 0 ? uSum / aSum : 0, ohne_typ: true });
    });

    return (p.bauteiltypen || []).concat(ohneTyp).map(function (t) {
      const kurz = String(t.name || "").split(" (")[0];
      const nutzung = genutzt[kurz] || null;
      const schichten = (t.schichten || []).length ? t.schichten : null;
      const nachweis = (schichten && DB)
        ? DB.uWert(schichten, t.uebergang || "wand_aussen", zahl(t.zuschlag, 0)) : null;
      const uIst = nachweis ? nachweis.u : zahl(t.U, NaN);
      const lambdaMin = BEG ? BEG.kleinstesLambda(t, DB ? DB.lambdaVon : null) : null;
      const anf = BEG ? BEG.zuBauteil(t) : { u_max: null, lambda_max: null, text: null,
                                             herkunft: null, sicher: false, quelle: null };
      const bew = BEG ? BEG.bewertung(t, uIst, anf, lambdaMin)
                      : { text: "", erfuellt: null };
      return {
        typ: t, name: t.name || "Bauteil", kurz: kurz,
        verwendet: !!nutzung, phi: nutzung ? nutzung.phi : 0, A: nutzung ? nutzung.A : 0,
        nur_innen: !!nutzung && nutzung.huelle === 0 && nutzung.innen > 0,
        u: uIst, nachweis: nachweis, uebergang: t.uebergang || null,
        lambda_min: lambdaMin, anforderung: anf, bewertung: bew,
      };
    });
  }

  /** Konfidenzklasse des U-Werts eines Bauteils. Bildet genau die Regeln
   *  nach, nach denen konfidenz() denselben Wert einsortiert; beide Stellen
   *  dürfen nicht auseinanderlaufen, sonst steht in Kapitel 5 eine andere
   *  Klasse als in der Konfidenztabelle. Deshalb ist das hier eine Funktion
   *  und keine zweite Regelabschrift. selbsttest() prüft den Gleichlauf. */
  /** Führt dieses Ergebnis überhaupt ein erdberührtes Bauteil? Danach richtet
   *  sich, ob der Bericht das Verfahren für Erdreich überhaupt erwähnt. Eine
   *  Formel ohne Anwendungsfall liest sich, als sei sie angewandt worden. */
  function hatErdreichBauteil(e) {
    return ((e && e.raeume) || []).some(function (r) {
      return (r.bauteile || []).some(function (bt) { return bt.kat === "erdreich"; });
    });
  }

  function uKlasse(z) {
    const t = (z && z.typ) || {};
    if (z && z.nachweis && t.belegt !== false) return "B";
    if (t.konfidenz === "B") return "B";
    if (t.konfidenz === "C" || t.typologie === true || t.belegt === false) return "C";
    return t.quelle ? "A" : "C";
  }

  /** Fest vorgegebene Temperaturen hinter den Hüllbauteilen unbeheizter
   *  Zonen. Sie tragen die Zonenbilanz mit, standen aber weder bei den
   *  Randbedingungen noch in der Konfidenztabelle: festeNachbarn() sieht nur
   *  die Bauteile beheizter Räume, nicht z.huelle. Rückgabe je Temperatur:
   *  {theta, teile:[Bauteilname], zonen:[Zonenname]} */
  function festeZonenTemperaturen(p) {
    const raus = [];
    (p.zonen || []).forEach(function (z) {
      (z.huelle || []).forEach(function (bt) {
        const g = bt.grenzt_an || {};
        if (g.typ !== "fest") return;
        const th = zahl(g.theta, NaN);
        if (!Number.isFinite(th)) return;
        let x = raus.find(function (y) { return y.theta.toFixed(1) === th.toFixed(1); });
        if (!x) { x = { theta: th, teile: [], zonen: [] }; raus.push(x); }
        const n = bt.name || "Bauteil";
        if (x.teile.indexOf(n) < 0) x.teile.push(n);
        const zn = z.name || z.id;
        if (x.zonen.indexOf(zn) < 0) x.zonen.push(zn);
      });
    });
    return raus;
  }

  /** Abschirmkoeffizient e, gruppiert nach Wert, mit den Räumen dazu.
   *  Der Bericht nannte bisher nur die Spanne „0,00 bis 0,03" ohne zu sagen,
   *  welcher Raum welchen Wert trägt und woraus er folgt. */
  function abschirmklassen(p, e) {
    const raus = [];
    ((e && e.raeume) || []).forEach(function (r) {
      const roh = (p.raeume || []).find(function (x) { return x.id === r.id; }) || {};
      const k = zahl(r.e, 0).toFixed(2);
      let x = raus.find(function (y) { return y.k === k; });
      if (!x) {
        x = { k: k, e: zahl(r.e, 0), anzahl: 0, exponiert: [], raeume: [],
              wieOft: {}, zuordnung: [], eigene: false };
        raus.push(x);
      }
      x.anzahl++;
      /* Namen der Räume, nicht nur ihre Anzahl. „6 Räume" beantwortet die
         Frage nicht, welcher Raum in welcher Stufe liegt; genau die war
         beanstandet. Mit Geschoss, weil „Diele" sonst mehrfach vorkommt. */
      const nam = ((r.geschoss ? r.geschoss + " " : "") + (r.raum || r.id || "")).trim();
      if (nam && x.raeume.indexOf(nam) < 0) x.raeume.push(nam);
      /* ANZAHL UND LISTE MÜSSEN SICH DECKEN (Sebastian, Punkt 16).
         Die Spalte „Räume" zählte 13, die Spalte „Zuordnung" nannte 12
         Namen: zwei Räume des Hasenberg-Stands heißen beide „EG Flur", und
         die Namensliste führt jeden Namen nur einmal. Gezählt wird weiter
         jeder Raum; wie oft ein Name vorkommt, wird mitgeführt, damit die
         Zuordnung es ausweisen kann. */
      if (nam) x.wieOft[nam] = (x.wieOft[nam] || 0) + 1;
      if (Number.isFinite(zahl(roh.e, NaN))) x.eigene = true;
      const n = roh.n_exponiert;
      if (Number.isFinite(zahl(n, NaN)) && x.exponiert.indexOf(zahl(n)) < 0) {
        x.exponiert.push(zahl(n));
      }
    });
    raus.sort(function (a, b) { return a.e - b.e; });
    raus.forEach(function (x) {
      x.exponiert.sort(function (a, b) { return a - b; });
      /* Die Liste, die gedruckt wird: gleichnamige Räume einmal genannt und
         mit ihrer Zahl dahinter. Damit summieren sich die Einträge auf die
         Zahl in der Spalte „Räume", und keiner fehlt. */
      x.zuordnung = x.raeume.map(function (n) {
        const k = x.wieOft[n] || 1;
        return k > 1 ? n + " (" + k + " Räume)" : n;
      });
    });
    return raus;
  }

  /** Additionsprobe: die Gebäudeheizlast ein zweites Mal bilden, und zwar
   *  ausschließlich aus den Spalten, die in Anlage 1 gedruckt sind.
   *
   *  Das ist bewusst KEINE Umformung der Kernformel. Für jede gedruckte Zeile
   *  wird Phi_T = A * U_eff * f * (theta_i - theta_e) neu gerechnet — dieselbe
   *  Formel, die im Kopf von Anlage 1 steht und die der Leser von Hand
   *  nachrechnen kann. Sie gilt für erdberührte Bauteile mit, weil dort
   *  f = f_g1 * f_g2 * G_w gedruckt wird. Dazu kommen Lüftung und
   *  Aufheizleistung je Raum. Innenbauteile bleiben draußen.
   *
   *  Die Probe schlägt an, wenn eine Zeile fehlt, doppelt steht, falsch
   *  kategorisiert ist oder wenn eine gedruckte Spalte nicht zu ihrer Zeile
   *  passt. Der frühere „Bilanzschluss" konnte das nicht: er verglich
   *  Summe(phi_raum) - Summe(phi_T_innen) mit Summe(phi_gebaeude), und der
   *  Kern bildet phi_gebaeude je Raum als genau diese Differenz. Die Zeile
   *  war damit eine Identität und immer bestanden. */
  function additionsprobe(e) {
    const dte = function (r) { return r.theta_i - e.klima.theta_e; };
    let summe = 0, zeilen = 0;
    ((e && e.raeume) || []).forEach(function (r) {
      const d = dte(r);
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat === "innen") return;
        zeilen++;
        summe += Math.abs(d) < 1e-9
          ? (bt.kat === "erdreich" ? 0 : bt.A * bt.U_eff * (r.theta_i - bt.theta_j))
          : bt.A * bt.U_eff * fFaktor(r, bt, e) * d;
      });
      summe += zahl(r.phi_V, 0) + zahl(r.phi_RH, 0);
    });
    return { summe: summe, zeilen: zeilen };
  }

  /* ------------------------------------------------------------------ *
   * 3  Konfidenzklassen A / B / C
   * ------------------------------------------------------------------ */

  /** Vergaberegeln nach SPEZIFIKATION_BERICHT.md 10.3.
   *  Rückgabe {eintraege: [{klasse, angabe, quelle, schluessel, phi, leit,
   *  alternativ}], leitparameter}. Sortiert A, B, C; innerhalb der Klasse
   *  in Erfassungsreihenfolge, C mit dem Leitparameter zuerst. */
  function konfidenz(p, e, zeilen) {
    const ein = [];
    const DK = (typeof window !== "undefined" && window.DATEN_KLIMA) || null;
    const DR = (typeof window !== "undefined" && window.DATEN_RAUMARTEN) || null;

    function push(klasse, angabe, quelle, opt) {
      ein.push(Object.assign({ klasse: klasse, angabe: angabe, quelle: quelle,
        schluessel: "", phi: 0, leit: false, alternativ: null }, opt || {}));
    }

    /* --- A: aus einer benannten Unterlage ------------------------------ */
    const mq = (p.meta && p.meta.quellen) || {};
    const metaFelder = [
      ["baujahr", "Baujahr " + (p.meta && p.meta.baujahr || "")
        + (p.meta && p.meta.modernisierung ? ", letzte Modernisierung "
           + p.meta.modernisierung : "")],
      ["gebaeudetyp", p.meta && p.meta.gebaeudetyp],
      ["aussenmasse", p.meta && p.meta.aussenmasse ? "Außenmaße " + p.meta.aussenmasse : ""],
      ["geschosshoehe", p.meta && p.meta.geschosshoehe
        ? "Geschosshöhe " + p.meta.geschosshoehe : ""],
      ["dach", p.meta && p.meta.dach ? "Drempel, Dachneigung " + p.meta.dach : ""],
      ["oberer_abschluss", p.meta && p.meta.oberer_abschluss],
      ["wohnflaeche", p.meta && p.meta.wohnflaeche
        ? "Wohnfläche " + f(zahl(p.meta.wohnflaeche), 2) + " m²" : ""],
      ["volumen", p.meta && p.meta.volumen ? "Gebäudevolumen " + p.meta.volumen : ""],
    ];
    metaFelder.forEach(function (x) {
      if (!x[1]) return;
      // Die Wohnfläche führt ihre Quelle in einem eigenen Feld, weil sie auch
      // in Kapitel 2 und in der Prüftabelle mit dieser Fundstelle erscheint.
      const quelle = x[0] === "wohnflaeche"
        ? ((p.meta && p.meta.wohnflaeche_quelle) || mq[x[0]]) : mq[x[0]];
      /* Eine ANGENOMMENE Angabe ist etwas anderes als eine ohne Fundstelle
         eingetragene, und der Unterschied gehört in den Bericht. Bisher
         stand unter einem aus dem Plandatum abgeleiteten Baujahr „Eingabe
         ohne Quellenangabe" — als hätte jemand es getippt und die Fundstelle
         vergessen. Steht die Angabe in p.annahmen, wird ihre Herleitung
         gedruckt: woher sie kommt, wie weit sie tragen kann und in welche
         Richtung sie danebenliegen kann. Klasse bleibt C. */
      const an = (p.annahmen || {})[x[0]];
      if (quelle) push("A", String(x[1]), String(quelle), { schluessel: "meta." + x[0] });
      else if (an && an.begruendung) {
        push("C", String(x[1]), "Angenommen, nicht eingetragen. " + an.begruendung
          + (an.richtung ? " " + an.richtung : ""), { schluessel: "meta." + x[0] });
      } else push("C", String(x[1]), "Eingabe ohne Quellenangabe. Erst mit Fundstelle "
        + "wird daraus Klasse A.", { schluessel: "meta." + x[0] });
    });

    /* Geometrie. Bisher waren U-Werte und Temperaturen klassifiziert, die
       Flächen aber nicht — ausgerechnet die Größen, die linear in jeden
       Wärmestrom eingehen und in der Summe die Rechnung tragen. Ohne sie war
       die Zusage, jede Eingabe sei einzeln mit ihrer Herkunft aufgeführt,
       nicht eingelöst. */
    /* VORSICHT: bt.quelle taugt hier nicht. app.js setzt dieses Feld aus der
       Quelle des BAUTEILTYPS, es belegt also den U-Wert und nicht die Fläche.
       Wer es hier verwendet, macht aus „U-Wert aus dem Referenzprojekt" ein
       „Fläche belegt" und schreibt eine Klasse A hin, die es nicht gibt. Die
       Fläche hat ihre eigene Herkunft; sie steht in meta.quellen. */
    /* Die Zeilenzahl gehörte hier zur Hüllfläche daneben, gezählt wurden aber
       alle Zeilen einschließlich der Innenbauteile. Es stand also „383,6 m²
       Hülle in 100 Bauteilzeilen", während die Additionsprobe im Prüfkapitel
       für dieselbe Hülle 60 Zeilen ausweist. Zwei Seiten auseinander, zwei
       Zahlen, ein Sachverhalt. Gezählt wird jetzt getrennt, und beide Zahlen
       werden benannt, statt eine davon stillschweigend mitzuführen. */
    let huelleZahl = 0, innenZahl = 0, btFlaeche = 0, huelleFlaeche = 0;
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        btFlaeche += zahl(bt.A, 0);
        if (bt.kat !== "innen") { huelleZahl++; huelleFlaeche += zahl(bt.A, 0); }
        else innenZahl++;
      });
    });
    const btZahl = huelleZahl + innenZahl;
    /* DIE FUNDSTELLE STEHT AM RAUM, NICHT IN meta.quellen. Befund Hasenberg
       25.08.2026: diese Tabelle stufte „Raummaße" und „Bauteilflächen" als
       „Ohne genannte Fundstelle" (Klasse C) ein, während die Selbstprüfung
       und das Kapitel Unterlagen dieselben Flächen als „im Plan
       angeschrieben, als Text gelesen" führten — zwei Aussagen über
       dieselbe Sache. Grund: meta.quellen.raummasse/bauteilflaechen setzt
       niemand; die tatsächliche Herkunft trägt jeder Raum selbst
       (herkunft.flaeche_quelle, gesetzt bei der Übernahme aus dem Plan).
       Sie wird hier gelesen. Gemischte Herkunft bleibt ehrlich Klasse C,
       mit der Zählung im Text. */
    const rrAlle = (p.raeume || []);
    const rrBelegt = rrAlle.filter(function (x) {
      return x && x.herkunft && String(x.herkunft.flaeche_quelle || "").trim();
    });
    const alleBelegt = rrAlle.length > 0 && rrBelegt.length === rrAlle.length;
    if (btZahl > 0) {
      const qF = mq.bauteilflaechen;
      push(qF ? "A" : (alleBelegt ? "B" : "C"),
        "Bauteilflächen, " + f(huelleFlaeche, 1) + " m² Hülle in "
          + anzahlWort(huelleZahl, "Bauteilzeile", "Bauteilzeilen")
          + (innenZahl > 0
            ? "; dazu " + anzahlWort(innenZahl, "Zeile", "Zeilen")
              + " für Bauteile zwischen Räumen, zusammen " + f(btFlaeche, 1) + " m²"
            : ""),
        qF ? String(qF)
          : alleBelegt
          ? "Aus den im Plan angeschriebenen Raummaßen und den lichten Höhen "
            + "abgeleitet — dieselbe Herkunft, die die Selbstprüfung je Raum "
            + "ausweist. Ein abgeleiteter Wert, keine Originalangabe: die "
            + "Wandflächen sind nicht einzeln am Bau aufgemessen."
          : "Ohne genannte Fundstelle eingetragen"
            + (rrBelegt.length
              ? " (" + rrBelegt.length + " von " + rrAlle.length + " Räumen tragen "
                + "eine Fundstelle aus dem Plan, die übrigen nicht)"
              : "")
            + ". Die Fläche geht linear in den "
            + "Wärmestrom ein: 10 % Flächenfehler sind 10 % Fehler im "
            + "Transmissionsanteil des Bauteils. Damit ist sie eine der tragenden "
            + "Eingaben und nicht durch die Quelle des U-Werts belegt. Sie ist am "
            + "Bau aufzumessen oder an einer bemaßten Zeichnung abzugreifen.",
        { schluessel: "flaechen_bauteile" });
    }
    const rZahl = (p.raeume || []).length;
    if (rZahl > 0) {
      const qR = mq.raummasse;
      push(qR ? "A" : (alleBelegt ? "A" : "C"),
        "Raummaße, " + anzahlWort(rZahl, "Raum", "Räume") + " mit zusammen "
          + f(zahl(e.A_gesamt, 0), 1) + " m² Grundfläche",
        qR ? String(qR)
          : alleBelegt
          ? "Im Plan angeschriebene Raumflächen, als Text aus der Zeichnung "
            + "gelesen — dieselbe Herkunft, die die Selbstprüfung je Raum "
            + "ausweist (herkunft der Räume)."
          : "Ohne genannte Fundstelle eingetragen"
            + (rrBelegt.length
              ? " (" + rrBelegt.length + " von " + rrAlle.length + " Räumen tragen "
                + "eine Fundstelle aus dem Plan, die übrigen nicht)"
              : "")
            + ". Grundfläche und lichte Höhe "
            + "bestimmen das Luftvolumen und damit die Lüftungsheizlast unmittelbar. "
            + "Sie sind am Objekt aufzumessen oder gegen eine bemaßte Zeichnung zu "
            + "prüfen.",
        { schluessel: "flaechen_raeume" });
    }

    /* Klima. Vorher Klasse A mit der Begründung, der Referenzbericht führe die
       Werte so. Das hält nicht: A heißt „aus einer Originalunterlage". Die
       Originalunterlage wäre der Normtext. Was hier vorliegt, ist eine
       Veröffentlichung Dritter, die die Normtabelle wiedergibt, gegengeprüft
       an einer zweiten Veröffentlichung. Das ist ein abgeleiteter
       Tabellenwert, also B. Dazu kommt, dass die Zuordnung über die
       Postleitzahl lief und die Zuordnungseinheit der Norm nicht am Normtext
       geprüft ist. Beides gehört in die Begründung, nicht in eine Fußnote.
       Die Standorthöhe steht hier nicht mehr: sie geht in keinen
       Rechenschritt ein und ist damit keine klassifizierbare Eingabe. */
    const ort = DK && p.meta ? DK.findePlz(p.meta.plz) : null;
    if (Number.isFinite(e.klima.theta_e)) {
      /* Auch eine im Projekt eingetragene Quelle ist fast immer eine
         Klimakarte, nicht der Normtext. Deshalb hängt die Klasse nicht daran,
         WER die Quelle geliefert hat, sondern daran, OB gegen den Normtext
         geprüft wurde. Ohne diese Prüfung bleibt es ein abgeleiteter
         Tabellenwert, also B. */
      const basis = (p.klima && p.klima.quelle) || (ort && ort.quelle) || null;
      const geprueft = !!(p.klima && p.klima.normtext_geprueft);
      const q = basis
        ? basis + (geprueft
          ? ". Gegen den Normtext geprüft."
          : ". Zugeordnet über die Postleitzahl. Die genannte Veröffentlichung "
            + "gibt die Normtabelle wieder, sie ist selbst keine normative "
            + "Quelle. Dass der Anhang der DIN/TS 12831-1:2020-04 nach "
            + "Postleitgebieten und nicht nach Gemeinden gegliedert ist, "
            + "beschreiben zwei Fachveröffentlichungen zu dieser Norm "
            + "übereinstimmend, Markert und Jagnow/Wolff; die Fundstellen "
            + "stehen im Kapitel Berechnungsgrundlagen. Auch sie sind "
            + "Wiedergaben. Am Normtext geprüft ist weder der Wert noch die "
            + "Zuordnung. Erst diese Prüfung macht daraus Klasse A.")
        : null;
      /* Ohne Postleitzahl auf dem Blatt setzt das Werkzeug die Klimadaten
         aus dem Ort an (KERN_ANNAHMEN.klima). Das ist ein Tabellenwert, aber
         für eine ANDERE Postleitzahl als die des Grundstücks — also keine
         Zuordnung, sondern eine Annahme. Klasse C, mit der Spanne im Ort. */
      const anK = (p.annahmen || {}).klima;
      if (anK && anK.begruendung) {
        push("C", "Norm-Außentemperatur " + f(e.klima.theta_e, 1) + " °C"
          + (Number.isFinite(e.klima.theta_e_m)
             ? ", Jahresmittel " + f(e.klima.theta_e_m, 1) + " °C" : ""),
          "Angenommen, nicht aus der Postleitzahl des Grundstücks zugeordnet. "
          + anK.begruendung + (anK.richtung ? " " + anK.richtung : ""),
          { schluessel: "klima" });
      } else push(q ? (geprueft ? "A" : "B") : "C",
        "Norm-Außentemperatur " + f(e.klima.theta_e, 1) + " °C"
        + (Number.isFinite(e.klima.theta_e_m)
           ? ", Jahresmittel " + f(e.klima.theta_e_m, 1) + " °C" : ""),
        q || "Klimawerte ohne Fundstelle eingetragen.", { schluessel: "klima" });
    }

    (p.abgleiche || []).forEach(function (a) {
      push("A", a.bezeichnung || "Abgleich", a.quelle || "Fremdbeleg ohne Quellenangabe",
        { schluessel: "abgleich" });
    });

    (p.planbefunde || []).forEach(function (b) {
      if (b.konfidenz === "sicher" && b.herleitung) {
        push("A", (b.thema ? b.thema + ": " : "") + (b.aussage || ""), b.herleitung,
          { schluessel: "planbefund" });
      }
    });

    /* --- B: normativer Tabellenwert ------------------------------------ */
    const arten = {};
    (p.raeume || []).forEach(function (r) { if (r.art) arten[r.art] = true; });
    const belegteArten = Object.keys(arten).filter(function (k) {
      return DR && DR.RAUMARTEN[k] && DR.RAUMARTEN[k].belegt;
    });
    if (belegteArten.length) {
      const temps = belegteArten.map(function (k) { return f(DR.RAUMARTEN[k].theta_i, 0); });
      /* Fundstelle über DR.fundstelle(): sie hält Normstelle und Auslegung
         auseinander. Vorher stand beides in einem String, mit dem Zusatz in
         Klammern; das liest sich wie Normtext und ist keiner. */
      push("B", "Norm-Innentemperaturen " + temps.join(" / ") + " °C",
        DR.fundstellen(belegteArten, "theta_i"), { schluessel: "raumarten" });
      const nmin = belegteArten.map(function (k) { return DR.RAUMARTEN[k].n_min; });
      const einheitlich = nmin.every(function (x) { return x === nmin[0]; });
      if (einheitlich) {
        /* Der Mindestluftwechsel hat eine eigene Fundstelle. Hier stand die
           des ERSTEN belegten Raumtyps, also die Innentemperaturzeile Tab. 32
           Zeile 1. Die trägt den Zahlenwert nicht. n_min steht in Tabelle 12,
           und wo die passende Zeile nicht geprüft ist, sagt der Eintrag es.
           Ist eine der verwendeten Raumarten nicht belegt, sinkt die Klasse:
           ein Wert ohne geprüfte Zeile ist keine Klasse B. */
        const alleBelegt = belegteArten.every(function (k) {
          return DR.RAUMARTEN[k].n_min_belegt === true;
        });
        push(alleBelegt ? "B" : "C",
          "Mindestluftwechsel n_min = " + f(nmin[0], 1) + " 1/h für alle Räume",
          DR.fundstellen(belegteArten, "n_min"), { schluessel: "n_min" });
      }
    }
    push("B", "Wärmebrückenzuschlag " + f(e.norm.DELTA_U_WB, 2) + " W/(m²·K)",
      "DIN/TS 12831-1 pauschal ohne gesonderten Nachweis", { schluessel: "wb" });

    // Feste Nachbartemperaturen. Temperaturen, die schon über eine Raumart
    // belegt sind (Innenwand gegen Bad, gegen Treppenhaus), stehen dort und
    // werden hier nicht ein zweites Mal aufgeführt.
    /* Eine von Hand eingetragene Nachbartemperatur ist keine Normangabe. Die
       Norm nennt Werte für bestimmte Fälle; ob der hier vorliegende Fall dazu
       gehört, entscheidet der Bearbeiter, nicht das Werkzeug. Ohne genannte
       Quelle bleibt der Wert deshalb Klasse C, und die Fundstelle wird nicht
       erfunden. */
    const feste = festeNachbarn(p, e);
    Object.keys(feste).forEach(function (t) {
      const eigene = p.meta && p.meta.quellen && p.meta.quellen["theta_" + t];
      push(eigene ? "A" : "C",
        "Nachbartemperatur " + f(parseFloat(t), 1) + " °C (" + feste[t] + ")",
        eigene || "vom Bearbeiter eingetragen, ohne genannte Fundstelle. Die "
          + "Norm nennt Anhaltswerte für angrenzende Gebäude und unbeheizte Räume; "
          + "welcher davon hier zutrifft, ist am Objekt zu belegen.",
        { schluessel: "theta_fest_" + t });
    });

    /* Die fest vorgegebenen Temperaturen hinter den Hüllbauteilen der
       unbeheizten Zonen fehlten hier ganz: festeNachbarn() sieht nur die
       Bauteile beheizter Räume. Damit stand die Erdreichtemperatur, die die
       Kellerbilanz und über sie jedes Bauteil gegen den Keller trägt, in
       keiner Klasse. */
    festeZonenTemperaturen(p).forEach(function (x) {
      const s = x.theta.toFixed(1);
      const eigene = p.meta && p.meta.quellen && p.meta.quellen["theta_" + s];
      push(eigene ? "A" : "C",
        "Temperatur " + f(x.theta, 1) + " °C hinter " + undListe(x.teile)
          + " (" + undListe(x.zonen) + ")",
        eigene || "Fest vorgegeben, ohne genannte Fundstelle. Der Wert bestimmt die "
          + "errechnete Temperatur der Zone mit und wirkt darüber auf jedes Bauteil, "
          + "das an sie grenzt. Er ist am Objekt oder aus einer Fundstelle zu "
          + "belegen.",
        { schluessel: "theta_zone_" + s });
    });

    /* U-Werte der verwendeten Bauteile. Jeder einzelne muss hier auftauchen.
       Vorher fiel ein Bauteil, das als belegt gekennzeichnet war, aus allen
       drei Klassen heraus und stand nirgends im Bericht: ausgerechnet die
       Werte, die die Heizlast tragen, waren dann ohne Quelle. */
    const ausSchichten = (zeilen || []).filter(function (z) {
      return z.verwendet && z.nachweis && z.typ.belegt !== false;
    });
    if (ausSchichten.length) {
      push("B", "U-Werte der Bauteile mit Schichtaufbau ("
        + undListe(ausSchichten.map(function (z) { return z.kurz; })) + ")",
        "Schichtrechnung nach DIN EN ISO 6946, Nachweis in Kapitel 5",
        { schluessel: "u_schicht" });
    }
    (zeilen || []).forEach(function (z) {
      if (!z.verwendet) return;
      const t = z.typ;
      if (ausSchichten.indexOf(z) >= 0) return;   // steht schon im B-Sammeleintrag
      if (t.konfidenz === "B") return;            // ausdrücklich als Normwert gesetzt
      // Alles, was unten ohnehin als Annahme erscheint, hier nicht doppeln
      if (t.konfidenz === "C" || t.typologie === true || t.belegt === false) return;
      if (t.quelle) {
        push("A", z.name + " U = " + f(z.u, 2) + " W/(m²·K)", String(t.quelle),
          { schluessel: "bauteil:" + t.id, phi: z.phi });
      } else {
        /* Als belegt gekennzeichnet, aber ohne Fundstelle: das ist kein Beleg.
           Der Wert bleibt eine Annahme und wird auch so ausgewiesen. */
        push("C", z.name + " U = " + f(z.u, 2) + " W/(m²·K)",
          "Im Projekt als belegt gekennzeichnet, aber ohne genannte Fundstelle. "
          + "Ohne Fundstelle bleibt der Wert eine Annahme.",
          { schluessel: "bauteil:" + t.id, phi: z.phi,
            alternativ: Number.isFinite(zahl(t.alternativ_U, NaN))
              ? { art: "bauteil_u", typ_id: t.id, wert: zahl(t.alternativ_U),
                  quelle: t.alternativ_quelle || null } : null });
      }
    });

    /* --- C: fachliche Annahme ------------------------------------------ */
    (zeilen || []).forEach(function (z) {
      if (!z.verwendet) return;
      const t = z.typ;
      const istC = t.konfidenz === "C" || t.typologie === true || t.belegt === false;
      if (!istC || t.konfidenz === "A" || t.konfidenz === "B") return;
      /* Die Fundstelle geht vor. Seit dem 24.08.2026 setzen DREI Quellen
         typologie = true: die IWU-Gebäudetypologie (Baujahr bis 2022), das
         Referenzgebäude des Gebäudemodernisierungsgesetzes (ab 2023) und der
         Rückfallwert für ein Nichtwohngebäude im Bestand. Der feste Satz
         behauptete für alle drei „Gebäudetypologie nach Baujahr". Für einen
         Neubau von 2025 war das sachlich falsch, und der Hinweis, dass das
         Referenzgebäude eine OBERGRENZE ist und die wirkliche Heizlast
         darunter liegt, fiel mit der weggeworfenen Fundstelle weg. Der feste
         Satz trägt jetzt nur noch den Fall ohne Fundstelle. */
      const grund = t.quelle
        ? String(t.quelle)
        : (t.typologie
            ? "Vorbelegung aus der Gebäudetypologie nach Baujahr, "
              + "Baualtersklasse des eingetragenen Baujahrs; gilt als "
              + "angesetzt und bleibt überschreibbar"
            : "Eingabe ohne Nachweis");
      push("C", z.name + " U = " + f(z.u, 2) + " W/(m²·K)", grund,
        { schluessel: "bauteil:" + t.id, phi: z.phi,
          alternativ: Number.isFinite(zahl(t.alternativ_U, NaN))
            ? { art: "bauteil_u", typ_id: t.id, wert: zahl(t.alternativ_U),
                quelle: t.alternativ_quelle || null } : null });
    });

    Object.keys(arten).forEach(function (k) {
      if (!DR || !DR.RAUMARTEN[k] || DR.RAUMARTEN[k].belegt) return;
      push("C", "Innentemperatur " + DR.RAUMARTEN[k].label + " "
        + f(DR.RAUMARTEN[k].theta_i, 0) + " °C", DR.fundstelle(k, "theta_i"),
        { schluessel: "raumart:" + k });
    });

    if (p.luftdichtheit && p.luftdichtheit.kategorie !== "messung") {
      push("C", "Luftdichtheit n50 = " + f(zahl(p.luftdichtheit.n50), 1) + " 1/h",
        (p.luftdichtheit.quelle || "Annahme") + ". n50 ist eine Annahme, keine Messung.",
        { schluessel: "n50" });
    }

    /* Höhenkorrekturfaktor und Aufheizleistung. Beide stehen in den Formeln
       des Kapitels Berechnungsgrundlagen und tragen dort einen Vorgabewert.
       Ein Vorgabewert ist eine Entscheidung und gehört damit in diese
       Tabelle; sonst stimmt die Zusage nicht, jede Eingabe sei einzeln mit
       ihrer Herkunft aufgeführt. Klasse C, weil für beide keine Fundstelle
       vorliegt, sondern eine Voreinstellung. */
    const epsAlle = ((e && e.raeume) || []).map(function (r) { return zahl(r.epsilon, 1); });
    if (epsAlle.length) {
      const gleich = epsAlle.every(function (x) { return x === epsAlle[0]; });
      push("C", "Höhenkorrekturfaktor ε = "
        + (gleich ? f(epsAlle[0], 2)
           : f(Math.min.apply(null, epsAlle), 2) + " bis "
             + f(Math.max.apply(null, epsAlle), 2)),
        /* Die Begründung im Einzelnen steht bei den Randbedingungen im Kapitel
           Berechnungsgrundlagen. Hier stand sie noch einmal fast wortgleich;
           zwei Fassungen desselben Absatzes im selben Bericht laufen mit der
           Zeit auseinander. Diese Zeile trägt deshalb nur die Einstufung. */
        "Voreinstellung des Rechenkerns, nicht je Raum belegt; sie wirkt nur in "
        + "Räumen, in denen die Infiltration maßgebend ist. Begründung bei den "
        + "Randbedingungen im Kapitel Berechnungsgrundlagen.",
        { schluessel: "epsilon" });
    }
    if (e && Number.isFinite(zahl(e.phi_RH_gebaeude, NaN))) {
      const prh = zahl(e.phi_RH_gebaeude, 0);
      push("C", "Aufheizleistung Φ_RH = " + f(prh, 0) + " W",
        prh === 0
          ? "Auf null gesetzt, weil weder Absenkdauer noch Wiederaufheizzeit "
            + "vereinbart sind. Begründung und Folgen bei den Randbedingungen im "
            + "Kapitel Berechnungsgrundlagen."
          : "Je Raum aus Fläche und f_RH gebildet. Absenkdauer und "
            + "Wiederaufheizzeit sind zu bestätigen.",
        { schluessel: "phi_rh" });
    }

    (p.zonen || []).forEach(function (z) {
      (z.huelle || []).forEach(function (bt) {
        if (bt.quelle) return;
        push("C", (z.name || z.id) + ": " + (bt.name || "Bauteil") + ", "
          + f(zahl(bt.A), 1) + " m², U = " + f(zahl(bt.U), 2),
          "Eingabe ohne Nachweis", { schluessel: "zone:" + z.id });
      });
    });

    (p.planbefunde || []).forEach(function (b) {
      if (b.konfidenz === "sicher" || b.bestaetigt) return;
      push("C", (b.thema ? b.thema + ": " : "") + (b.aussage || ""),
        (b.herleitung || "aus der Planauslese") + ". Im Kontrollblatt nicht mit "
        + "Quelle bestätigt.", { schluessel: "planbefund" });
    });

    /* --- Leitparameter: größter Anteil an der Transmission -------------- */
    let leit = null;
    ein.forEach(function (x) {
      if (x.klasse !== "C") return;
      if (!leit || x.phi > leit.phi) leit = x;
    });
    if (leit && leit.phi > 0) leit.leit = true;

    const rang = { A: 0, B: 1, C: 2 };
    const sortiert = ein.slice().sort(function (a, b) {
      if (rang[a.klasse] !== rang[b.klasse]) return rang[a.klasse] - rang[b.klasse];
      if (a.klasse === "C" && a.leit !== b.leit) return a.leit ? -1 : 1;
      return 0;
    });
    return { eintraege: sortiert, leitparameter: leit && leit.leit ? leit : null };
  }

  /* ------------------------------------------------------------------ *
   * 4  Offene Punkte und ihre Wirkung auf die Heizlast
   * ------------------------------------------------------------------ */

  /** Eine Änderung auf eine Kopie des Projekts anwenden.
   *  Liefert false, wenn nichts getroffen wurde — dann gibt es kein Delta. */
  function aenderungAnwenden(p2, w) {
    if (!w || !w.art) return false;
    if (w.art === "bauteil_u") {
      const t = (p2.bauteiltypen || []).find(function (x) {
        return x.id === w.typ_id || x.name === w.name;
      });
      if (!t) return false;
      t.U = w.wert; t.schichten = [];
      return true;
    }
    if (w.art === "raum_theta") {
      let treffer = false;
      (p2.raeume || []).forEach(function (r) {
        if (w.raum_id ? r.id === w.raum_id : r.art === w.raum_art) {
          r.theta_i = w.wert; treffer = true;
        }
      });
      return treffer;
    }
    if (w.art === "zone_theta") {
      const z = (p2.zonen || []).find(function (x) { return x.id === w.zone_id; });
      if (!z) return false;
      z.modus = "fest"; z.theta_fest = w.wert;
      return true;
    }
    if (w.art === "norm") {
      p2.norm = p2.norm || {};
      p2.norm[w.feld] = w.wert;
      return true;
    }
    return false;
  }

  /** Empfindlichkeit eines offenen Punktes: rechne() ein zweites Mal mit
   *  genau einem geänderten Parameter. Reine Kernrechnung im Browser, keine
   *  Variantenberatung — es wird nur das Delta in W ausgewiesen. */
  function wirkung(p, e, w, kern, konv) {
    if (!w) return null;
    const K = kern || (typeof window !== "undefined" ? window.KERN_HEIZLAST_NORM : null);
    const C = konv || (typeof window !== "undefined" && window.App
      && window.App.projektFuerKern) || null;
    if (!K || !C) return null;
    let p2;
    try { p2 = JSON.parse(JSON.stringify(p)); } catch (x) { return null; }
    if (!aenderungAnwenden(p2, w)) return null;
    let e3;
    try { e3 = K.rechne(C(p2)); } catch (x) { return null; }
    if (!e3 || !Number.isFinite(e3.phi_gebaeude)) return null;
    return e3.phi_gebaeude - e.phi_gebaeude;
  }

  /** Text der Spalte „Wirkung auf die Heizlast". */
  function wirkungText(delta, zusatz) {
    if (delta === null || delta === undefined) {
      return "nicht beziffert" + (zusatz ? ", " + zusatz : "");
    }
    const kern = Math.abs(delta) < 10
      ? "unter 0,01 kW"
      : f(Math.abs(delta) / 1000, 2) + " kW " + (delta > 0 ? "mehr" : "weniger");
    return kern + (zusatz ? ", " + zusatz : "");
  }

  /** Zeilen für Kapitel 8. Quellen: Konfidenz C, Eingaben des Bearbeiters,
   *  jede nicht erfüllte BEG-Anforderung. */
  function offenePunkte(p, e, zeilen, kf, kern, konv) {
    const zeilenAus = [];

    /* Der eigentliche offene Punkt zuerst: solange kein U-Wert belegt ist,
       steht jede Zahl darunter auf Annahmen. Das ist kein Förderthema und
       stand deshalb bisher in dieser Liste gar nicht. */
    const an = annahmeAnteil(e);
    /* Typologie-/Referenzgebäudewerte gelten als angesetzt (Kundenvorgabe
       24.08.2026) und gehören nicht in die Liste der zu belegenden Bauteile;
       der Punkt entsteht nur noch für von Hand angesetzte Werte ohne Beleg. */
    const ohneBeleg = (zeilen || []).filter(function (z) {
      return z.verwendet && !z.nur_innen && z.typ && z.typ.belegt === false
        && z.typ.typologie !== true;
    }).map(function (z) { return z.kurz; });
    if (an && an.prozent >= 0.5) {
      zeilenAus.push({
        zuerst: true,
        titel: "Aufbau der Bauteile am Gebäude belegen"
          + (ohneBeleg.length && ohneBeleg.length <= 6
            ? ": " + undListe(ohneBeleg) : ""),
        /* Wortwahl (Kundenvorgabe 24.08.2026): „ohne belegten U-Wert" ist
           aus allen Nutzertexten heraus; der Punkt selbst bleibt für von
           Hand angesetzte Werte ohne Beleg. */
        warum: f(an.prozent, 0) + " Prozent des Transmissionswärmestroms beruhen auf "
          + "Bauteilen, deren U-Wert nicht belegt ist. Bauteilöffnung oder Endoskopie an je "
          + "einer Stelle je Bauteil klärt das. Bis dahin ist die Heizlast eine "
          + "gerechnete Annahme und kein Nachweis, und die Zeilen darunter stehen "
          + "unter demselben Vorbehalt.",
        delta: null,
        zusatz: null,
        aenderung: null,
      });
    }

    kf.eintraege.forEach(function (x) {
      if (x.klasse !== "C" || !x.alternativ) return;
      zeilenAus.push({
        titel: (x.leit ? "Leitparameter: " : "") + x.angabe
          + " vor Ausführung bestätigen (Bauteilöffnung oder Endoskopie)",
        warum: text(p, "offene_punkte." + x.schluessel)
          || ("Der Wert ist eine Annahme der Konfidenzklasse C."
              + (x.alternativ.quelle ? " Alternative: " + x.alternativ.quelle : "")),
        delta: wirkung(p, e, x.alternativ, kern, konv),
        zusatz: null,
        aenderung: x.alternativ,
      });
    });

    /* KEINE BAUEMPFEHLUNG AUS EINEM ANGENOMMENEN U-WERT.
     *
     * Gemessen am 23.08.2026 an „BV 2-0887 Ziolkowski", echter Durchlauf:
     * ein Neubau, auf 2022 datiert, bekam in Kapitel 8 fünf Punkte der Art
     * „Dämmstärke Dach erhöhen, bis U ≤ 0,14 W/(m²·K) erreicht ist". Keiner
     * der verglichenen U-Werte war belegt — alle sechs stammten aus der
     * Gebäudetypologie, also aus einer Tabelle typischer Gebäude, und die
     * Typologie endet bei der Klasse „2016 und später".
     *
     * Verglichen wurde damit nicht das Gebäude mit der Anforderung, sondern
     * eine Tabelle mit einer Anforderung. Daraus folgt keine Aussage über
     * dieses Dach und erst recht keine Baumaßnahme. Der offene Punkt, der
     * hier wirklich offen ist, steht schon oben in dieser Liste: den Aufbau
     * der Bauteile am Gebäude belegen.
     *
     * Der Vergleich verschwindet damit nicht — er steht weiter in Kapitel 5
     * in der Bauteiltabelle, wo neben jedem U-Wert seine Konfidenzklasse
     * steht. Was verschwindet, ist die Handlungsempfehlung ohne Grundlage.
     * Sobald ein U-Wert belegt ist (Schichtaufbau oder Bauteilöffnung),
     * entsteht die Zeile wieder, und dann trägt sie. */
    const begOhneBeleg = (zeilen || []).filter(function (z) {
      return z.verwendet && z.bewertung && z.bewertung.erfuellt === false
        && !(z.typ && z.typ.belegt === true);
    });
    (zeilen || []).forEach(function (z) {
      if (!z.verwendet || z.bewertung.erfuellt !== false) return;
      if (!(z.typ && z.typ.belegt === true)) return;
      const ziel = z.anforderung.u_max;
      const begAend = Number.isFinite(ziel)
        ? { art: "bauteil_u", typ_id: z.typ.id, wert: ziel } : null;
      const begDelta = begAend ? wirkung(p, e, begAend, kern, konv) : null;
      zeilenAus.push({
        titel: (austauschBauteil(z)
            ? z.kurz + " austauschen oder ertüchtigen, bis U ≤ "
            : "Dämmstärke " + z.kurz + " erhöhen, bis U ≤ ")
          + f(ziel, 2) + " W/(m²·K) erreicht ist",
        /* Hier stand „und die Maßnahme ist nicht förderfähig". Das war ein
           Urteil, das dem Werkzeug nicht zusteht: über die Förderfähigkeit
           entscheidet die prüfende Stelle, nicht der Bericht. Es widersprach
           außerdem der eigenen Fußnote in Kapitel 5, nach der die Anforderung
           nur über den Bauteilnamen zugeordnet und noch zu bestätigen ist.
           Der Bericht nennt jetzt nur noch den Sachverhalt: gerechneter Wert
           gegen hinterlegten Anforderungswert.
           Der Satz, dass über die Folgen die prüfende Stelle entscheidet, stand
           hier in jeder einzelnen Zeile wortgleich. Bei vier Bauteilen fuellte er
           eine halbe Seite mit derselben Aussage. Er steht jetzt einmal unter der
           Tabelle; die Marke beg sagt kapitel8(), dass er dazugehoert. */
        beg: true,
        /* Der Kurzname wird für den Kasten am Kapitelende gebraucht: dort ist
           aufzuzählen, was gebaut sein muss, bevor nach der zweiten Zahl
           ausgelegt werden darf. Aus dem Zeilentitel wäre das nur durch
           Zurückschneiden eines Satzes zu gewinnen. */
        kurz: z.kurz,
        warum: text(p, "offene_punkte.beg:" + z.typ.id)
          || ("Der gerechnete U-Wert liegt über dem hinterlegten "
              + "Anforderungswert von " + f(ziel, 2) + " W/(m²·K)"
              + (z.anforderung.herkunft === "name"
                 ? ", der über den Bauteilnamen zugeordnet und noch nicht "
                   + "bestätigt ist" : "")
              + "."),
        delta: begDelta,
        /* Der Zusatz gehört nur hinter "nicht beziffert". Hinter einer Zahl
           liest sich das "aber" wie ein Widerspruch, den es nicht gibt; dass
           der Punkt förderrechtlich zählt, steht ohnehin in Spalte zwei. */
        zusatz: begDelta === null ? "förderrechtlich aber entscheidend" : null,
        aenderung: begAend,
      });
    });

    /* Was an die Stelle der gestrichenen Dämmempfehlungen tritt: der offene
       Punkt, der wirklich offen ist. Steht die Zeile „Aufbau der Bauteile am
       Gebäude belegen" schon oben, bekommt sie den Satz angehängt statt einer
       zweiten Zeile über dieselbe Sache. */
    if (begOhneBeleg.length) {
      const namen = undListe(begOhneBeleg.map(function (z) { return z.kurz; }));
      const satz = "Bei " + (begOhneBeleg.length === 1 ? "diesem Bauteil"
          : "diesen " + begOhneBeleg.length + " Bauteilen") + " (" + namen
        + ") liegt der angesetzte U-Wert über dem hinterlegten "
        + "Anforderungswert. Der angesetzte Wert stammt "
        + (begOhneBeleg.length === 1 ? "" : "in jedem dieser Fälle ")
        + "aus der Gebäudetypologie und nicht aus diesem Gebäude; die "
        + "Gegenüberstellung sagt deshalb etwas über die Tabelle und nichts "
        + "über den vorhandenen Aufbau. Eine Empfehlung, die Dämmstärke zu "
        + "erhöhen, ist daraus nicht abzuleiten und steht deshalb nicht in "
        + "dieser Liste. Sobald ein U-Wert belegt ist, wird der Vergleich "
        + "belastbar und der Punkt erscheint hier mit seiner Wirkung.";
      const ersteZeile = zeilenAus.length && zeilenAus[0].zuerst ? zeilenAus[0] : null;
      if (ersteZeile) ersteZeile.warum = ersteZeile.warum + " " + satz;
      else {
        zeilenAus.push({
          zuerst: true,
          titel: "U-Werte am Gebäude belegen, bevor über die Anforderungswerte "
            + "geurteilt wird: " + namen,
          warum: satz, delta: null, zusatz: null, aenderung: null,
        });
      }
    }

    (p.offene_punkte || []).forEach(function (o) {
      zeilenAus.push({
        titel: o.titel || "",
        warum: o.warum || text(p, "offene_punkte." + (o.id || o.titel)) || "",
        delta: o.wirkung ? wirkung(p, e, o.wirkung, kern, konv) : null,
        zusatz: o.zusatz || null,
        ohne_wirkung: o.ohne_wirkung || null,
        aenderung: o.wirkung || null,
      });
    });

    /* Befunde der Selbstprüfung, die auf die Handlungsliste gehören.
     *
     * Die Selbstprüfung schrieb ihre Befunde bisher ausschließlich in ihr
     * eigenes Kapitel. Ein Befund der Stufe Fehler, etwa ein Raum ohne ein
     * einziges Hüllbauteil, tauchte damit nirgends auf, wo abgearbeitet wird.
     * Er stand fünf Seiten hinter der Liste, in die er gehört.
     *
     * Die Trennlinie verläuft an der Stufe, und sie verläuft dort aus einem
     * Grund. Fehler heißt: eine Eingabe fehlt oder widerspricht sich, die
     * Rechnung steht auf einer Lücke. Das ist vor der Beauftragung zu klären,
     * und genau das ist die Überschrift dieses Kapitels. Warnung und Hinweis
     * heißen: die Eingaben sind vollständig, ein Wert liegt außerhalb des
     * üblichen Bereichs oder verdient eine Erläuterung. Das ist eine
     * Einordnung und keine offene Aufgabe; solche Befunde blieben hier eine
     * Liste, die man wegklickt. Sie stehen weiter im Prüfkapitel.
     *
     * Beziffert wird nichts davon. Was ein fehlendes Bauteil an Heizlast
     * ausmacht, weiß erst, wer es erfasst hat. */
    const pruef = (typeof window !== "undefined" && window.App
      && window.App.pruefung) || null;
    ((pruef && pruef.pruefungen) || []).forEach(function (x) {
      if (x.stufe !== "fehler") return;
      zeilenAus.push({
        titel: x.titel || "Befund der Selbstprüfung",
        warum: (x.text || "") + " Befund der Selbstprüfung, Stufe Fehler.",
        delta: null,
        /* Kein Zusatz: wirkungText() setzt vor jeden Zusatz bereits „nicht
           beziffert", und „nicht beziffert, erst nach Klärung bezifferbar"
           sagt zweimal dasselbe. */
        zusatz: null,
        aenderung: null,
        pruefbefund: true,
      });
    });

    return sortiereNachWirkung(zeilenAus);
  }

  /** Nach Wirkung sortieren, größte zuerst. Vorher stand "1,47 kW weniger"
   *  als dritte von vier Zeilen neben "0,04 kW weniger" und sah genauso
   *  wichtig aus. Was als "zuerst" markiert ist, bleibt oben: der Beleg der
   *  Bauteile bedingt alle anderen Punkte. Punkte ohne bezifferte Wirkung
   *  stehen am Ende, ihre Reihenfolge untereinander bleibt unverändert. */
  function sortiereNachWirkung(liste) {
    const a = (liste || []).slice();
    const rang = function (x) {
      if (x.zuerst) return 0;
      return Number.isFinite(x.delta) ? 1 : 2;
    };
    return a.map(function (x, i) { return { x: x, i: i }; })
      .sort(function (u, v) {
        const ru = rang(u.x), rv = rang(v.x);
        if (ru !== rv) return ru - rv;
        if (ru === 1) {
          const d = Math.abs(v.x.delta) - Math.abs(u.x.delta);
          if (Math.abs(d) > 0.5) return d;
        }
        return u.i - v.i;
      })
      .map(function (u) { return u.x; });
  }

  /* Schwelle, ab der ein Bauteil in einer nach Wirkung geordneten Liste nicht
     mehr stillschweigend fehlen darf: ein Hundertstel des
     Transmissionswärmestroms über die Hülle, mindestens aber 50 W. Beides
     zusammen, damit die Schwelle beim kleinen Gebäude nicht auf ein paar Watt
     fällt und beim großen nicht auf ein halbes Kilowatt steigt. */
  const LUECKE_ANTEIL = 0.01;
  const LUECKE_MIN_W = 50;

  /** Bauteile mit nennenswertem Wärmestrom, aus denen kein Punkt für Kapitel 8
   *  entstehen konnte.
   *
   *  Warum es diese Prüfung gibt: In der Fassung vor dieser standen vier
   *  Außenwände in der Bauteiltabelle mit "kein Wert hinterlegt", weil in der
   *  Anforderungsdatei bei der Außenwand u_max null war. bewertung() liefert
   *  dann "Bauteil bleibt" mit erfuellt = null, offenePunkte() erzeugt daraus
   *  keine Zeile, und damit fielen rund 1,1 kW aus einer Liste, über der steht,
   *  sie sei nach ihrer Wirkung geordnet, der größte zuerst. Der Fehler war in
   *  der Datei, aber unsichtbar wurde er hier. Diese Funktion macht ihn
   *  sichtbar, unabhängig davon, warum der Wert fehlt.
   *
   *  Drei Gruppen, weil der Leser sie unterscheiden muss:
   *    ohne_wert       die Bauteilart ist erkannt, aber es ist kein Wert
   *                    hinterlegt. Das ist die Lücke, die den Sperrbefund
   *                    ausgelöst hat, und sie liegt im Werkzeug.
   *    ohne_art        das Bauteil ließ sich keiner Zeile der Tabelle
   *                    zuordnen, etwa eine Trennwand zum Nachbargebäude. Ob
   *                    dafür eine Anforderung gilt, entscheidet die prüfende
   *                    Stelle; ein Hebel steht trotzdem nicht in der Liste.
   *    ohne_punkt      eine Anforderung ist hinterlegt, aber es kam kein
   *                    Punkt heraus, etwa weil das Bauteil ausdrücklich
   *                    unverändert bleiben soll oder der Nachweis über λ
   *                    noch aussteht. */
  function wirkungsLuecken(zeilen) {
    const huelle = (zeilen || []).filter(function (z) {
      return z && z.verwendet && !z.nur_innen; });
    let summe = 0;
    huelle.forEach(function (z) { summe += Math.abs(zahl(z.phi, 0)); });
    const schwelle = Math.max(LUECKE_MIN_W, summe * LUECKE_ANTEIL);
    const ohneWert = [], ohneArt = [], ohnePunkt = [];
    huelle.forEach(function (z) {
      const phi = Math.abs(zahl(z.phi, 0));
      if (phi < schwelle) return;
      /* erfuellt true oder false ist ein Befund und steht im Bericht:
         true braucht keinen Punkt, false erzeugt einen. Nur null ist stumm. */
      if (!z.bewertung || z.bewertung.erfuellt !== null) return;
      const a = z.anforderung || {};
      const eintrag = { kurz: z.kurz, name: z.name, phi: phi,
                        grund: (z.bewertung && z.bewertung.text) || "" };
      if (Number.isFinite(a.u_max) || Number.isFinite(a.lambda_max)) ohnePunkt.push(eintrag);
      else if (a.herkunft) ohneWert.push(eintrag);
      else ohneArt.push(eintrag);
    });
    const nach = function (a, b) { return b.phi - a.phi; };
    ohneWert.sort(nach); ohneArt.sort(nach); ohnePunkt.sort(nach);
    const alle = ohneWert.concat(ohneArt, ohnePunkt);
    let fehlend = 0;
    alle.forEach(function (x) { fehlend += x.phi; });
    return { schwelle: schwelle, summe: summe, fehlend: fehlend,
             ohne_wert: ohneWert, ohne_art: ohneArt, ohne_punkt: ohnePunkt,
             alle: alle, anzahl: alle.length };
  }

  /** Was am Ende herauskommt, wenn alle bezifferten Punkte umgesetzt sind.
   *  Alle Änderungen werden gemeinsam in eine Kopie des Projekts eingetragen
   *  und der Rechenkern läuft ein zweites Mal. Es wird nichts addiert: die
   *  Einzelwirkungen sind nicht additiv, und eine aufsummierte Zahl wäre
   *  falsch. Liefert null, wenn nichts zu rechnen ist. */
  function wirkungGesamt(p, e, punkte, kern, konv) {
    const aend = (punkte || []).filter(function (x) {
      return x.aenderung && Number.isFinite(x.delta); })
      .map(function (x) { return x.aenderung; });
    if (aend.length < 2) return null;
    const K = kern || (typeof window !== "undefined" ? window.KERN_HEIZLAST_NORM : null);
    const C = konv || (typeof window !== "undefined" && window.App
      && window.App.projektFuerKern) || null;
    if (!K || !C) return null;
    let p2;
    try { p2 = JSON.parse(JSON.stringify(p)); } catch (x) { return null; }
    let n = 0;
    aend.forEach(function (w) { if (aenderungAnwenden(p2, w)) n++; });
    if (n !== aend.length) return null;
    let e3;
    try { e3 = K.rechne(C(p2)); } catch (x) { return null; }
    if (!e3 || !Number.isFinite(e3.phi_gebaeude)) return null;
    return { anzahl: n, phi: e3.phi_gebaeude, delta: e3.phi_gebaeude - e.phi_gebaeude };
  }

  /* ------------------------------------------------------------------ *
   * 5  Plausibilitätsprüfungen, die die Automatik selbst erzeugt
   * ------------------------------------------------------------------ */
  /* K ist der Kapitelplan und darf fehlen; dann entfällt nur der Verweis auf
     die Abschnittsnummer, nicht die Aussage. */
  function pruefzeilen(p, e, zb, zeilen, K) {
    const r = [];
    const pr = (typeof window !== "undefined" && window.App && window.App.pruefung) || null;
    const st = (s) => (s ? "bestanden" : "Abweichung");

    /* Additionsprobe statt des früheren „Bilanzschlusses". Der verglich eine
       Größe mit sich selbst (Begründung an additionsprobe()) und war deshalb
       immer bestanden. Hier wird die Heizlast aus den gedruckten Spalten der
       Anlage 1 neu addiert und gegen das Ergebnis des Rechenkerns gestellt. */
    const ap = additionsprobe(e);
    r.push({ pruefung: "Additionsprobe Anlage 1, " + f(ap.zeilen, 0)
        + " Bauteilzeilen, Lüftung und Aufheizleistung",
      /* Der Weg zum Ergebnis gehört in die Zeile, nicht nur in einen Satz
         unter die Tabelle. Zwei gleiche Zahlen nebeneinander wirken sonst
         auch dann wie ein Selbstvergleich, wenn sie es nicht sind. Kurz
         halten: die Spalte ist schmal, ein Satz sprengt die Zeile. */
      weg: "aus den Spalten der Anlage 1 neu addiert",
      ist: ap.summe, soll: e.phi_gebaeude,
      quelle: "Rechenkern DIN EN 12831-1, Gesamtergebnis Φ_Gebäude",
      kriterium: "Abweichung < 0,5 W, hier "
        + f(Math.abs(ap.summe - e.phi_gebaeude), 3) + " W",
      status: st(Math.abs(ap.summe - e.phi_gebaeude) < 0.5), nk: 2, einheit: " W" });

    zb.forEach(function (z) {
      /* Verglichen wird nur, wo es etwas zu vergleichen gibt: bei einer fest
         eingetragenen, über f_1 oder über die Lage vorgegebenen Temperatur
         ist die Bilanz kein Maßstab, und ohne eigene Hüllbauteile besteht sie
         nur aus den angrenzenden beheizten Räumen. Eine Zeile „20,0 gegen
         5,2 °C, Abweichung 0,000 K, bestanden" wäre eine Falschaussage in
         beiden Spalten. */
      if (!z.vergleichbar) return;
      /* Ergebnis ist die Gegenrechnung dieses Berichts, Sollwert der Wert des
         Rechenkerns. Beide entstehen auf verschiedenen Wegen: der Kern löst
         iterativ, der Bericht bildet das gewichtete Mittel in einem Zug. Die
         Spalten hießen bisher umgekehrt, dadurch las sich die Zeile wie ein
         Vergleich mit sich selbst. */
      /* Der Zusatz „Gegenrechnung des Berichts" steht jetzt in der Zeile
         darunter, wo auch die Formel steht. Zweimal dasselbe macht die
         schmale Spalte nur höher. */
      r.push({ pruefung: "Zonentemperatur " + z.name,
        weg: "Σ(H·θ) / ΣH aus der Bilanztabelle des Berichts",
        ist: z.mittel, soll: z.ergebnis,
        quelle: "Rechenkern, iterative stationäre Bilanz DIN/TS 12831-1",
        kriterium: "Abweichung ≤ " + f(ZONEN_TOLERANZ_K, 2) + " K, hier "
          + f(z.abweichung, 3) + " K",
        status: st(z.abweichung <= ZONEN_TOLERANZ_K), nk: 2, einheit: " °C" });
    });

    const quer = pr && pr.pruefungen
      ? pr.pruefungen.find(function (x) { return x.id === "quer"; }) : null;
    if (quer && quer.zahl && Number.isFinite(quer.zahl.erwartet)) {
      const TY = (typeof window !== "undefined" && window.DATEN_TYPOLOGIE) || null;
      const aufWfl = !!quer.zahl.auf_wohnflaeche;
      /* Toleranzband und Bezug stehen im Rechenkern (kern_pruefung.js,
         Prüfung „quer"): ohne Wohnflächenbezug 35 % Hinweis, 65 % Warnung. */
      const band = aufWfl ? 25 : 35;
      /* Die Baualtersklasse ist die Zeile aus HEIZLAST_KENNWERT, in die das
         Baujahr fällt. Das Baujahr allein zu nennen wäre keine Klasse. */
      const bj = parseInt(p.meta && p.meta.baujahr, 10);
      const kl = (TY && Number.isFinite(bj))
        ? TY.HEIZLAST_KENNWERT.find(function (x) { return bj >= x.von && bj <= x.bis; })
        : null;
      const klText = kl
        ? (kl.von === -Infinity ? "bis " + kl.bis
           : (kl.bis === Infinity ? "ab " + kl.von : kl.von + " bis " + kl.bis))
        : null;
      /* ACHTUNG bei der Quelle: DATEN_TYPOLOGIE.quelle belegt die U-Werte aus
         Anhang C.1, nicht die Heizlast-Kennwerte. Die haben in
         daten_typologie.js ihre eigene, andere Herkunft. Die hier zu nennen
         wäre eine falsche Fundstelle. */
      /* Kein „bestanden". Kapitel 2 sagt, dass dieses Gebäude wegen der
         gemischten Nutzung nicht über einen Kennwert je Quadratmeter zu
         beurteilen ist. Ein Häkchen an dieser Zeile würde dem widersprechen.
         Der Quervergleich ist eine Grobeinordnung, kein Nachweis, und wird
         auch so beschriftet. */
      r.push({ pruefung: "Spezifische Heizlast je m² "
          + (aufWfl ? "Wohnfläche" : "Raumfläche")
          + (klText ? ", Baualtersklasse " + klText : ""),
        /* Kapitel 2 sagt, dass dieses Gebäude nicht über einen Kennwert je
           Quadratmeter Wohnfläche zu beurteilen ist. Genau das täte diese
           Zeile, wenn sie den Unterschied der Bezugsflächen verschweigt.
           Deshalb steht er als Fußnote unter der Tabelle. */
        hinweis: aufWfl ? null
          : "Zur Zeile „Spezifische Heizlast“: hier stehen zwei verschiedene "
            + "Bezugsflächen nebeneinander. Gerechnet ist je Quadratmeter "
            + "Raumfläche, der Kennwert der Typologie bezieht sich auf die "
            + "Wohnfläche. Die Summe der Raumflächen liegt üblicherweise über der "
            + "Wohnfläche, der gerechnete Wert fällt dadurch günstiger aus. Ein "
            + "Vergleich der beiden Zahlen ist deshalb kein Nachweis, sondern eine "
            + "Grobeinordnung, und das Toleranzband ist dafür erweitert. Solange "
            + "keine Wohnfläche belegt ist, lässt sich das nicht auflösen. "
            /* Ohne diesen Satz stehen zwei Aussagen im selben Bericht, die
               sich zu widersprechen scheinen: dort „nicht vergleichbar", hier
               eine Zeile, die genau das vergleicht. */
            + "Abschnitt " + ((K && K.objekt) || "Objekt und Datengrundlage")
            + " sagt aus demselben Grund, dass dieses Gebäude nicht über einen "
            + "Kennwert je Quadratmeter Wohnfläche zu beurteilen ist. Diese Zeile "
            /* Der Schlusssatz nennt die Einstufung, die tatsächlich in der
               Statusspalte steht. Vorher stand hier fest „im
               Erwartungsbereich"; bei einer auffälligen Abweichung sagte die
               Fußnote damit das Gegenteil der Zeile darüber. */
            + "hält dem nicht entgegen; sie ordnet grob ein und trägt deshalb "
            + "kein „bestanden“, sondern die Einstufung "
            + (quer.stufe === "gut" ? "im Erwartungsbereich" : "als Abweichung")
            + ".",
        weg: "Heizlast geteilt durch die "
          + (aufWfl ? "Wohnfläche" : "Summe der Raumflächen"),
        ist: quer.zahl.ist, soll: quer.zahl.erwartet,
        quelle: "IWU TABULA 2015, Heizlast-Kennwert je Baualtersklasse, "
          + "verbrauchskalibrierter Ist-Zustand"
          + (kl ? " (Klassenwert " + f(kl.wm2, 0) + " W/m²)" : "")
          + (quer.zahl.angepasst
             ? ", angepasst mit Faktor " + f(quer.zahl.faktor, 2)
               + " aus den eingetragenen Bauteilen" : ""),
        kriterium: "Grobeinordnung, kein Nachweis. Auffällig ab "
          + f(band, 0) + " % Abweichung, hier "
          + (quer.zahl.abw >= 0 ? "+" : "") + f(quer.zahl.abw, 0) + " %",
        status: quer.stufe === "gut" ? "im Erwartungsbereich"
          : (quer.stufe === "fehler" ? "nicht bestanden" : "Abweichung"), nk: 2,
        einheit: " W/m²" });
    }

    (zeilen || []).forEach(function (z) {
      if (!z.verwendet || !z.nachweis) return;
      const soll = zahl(z.typ.U, NaN);
      if (!Number.isFinite(soll)) return;
      r.push({ pruefung: "U-Wert-Nachweis " + z.kurz,
        weg: "aus den Schichten gerechnet, 1 / Σ R",
        ist: z.nachweis.u, soll: soll, quelle: "Im Projekt geführter U-Wert des Bauteils",
        kriterium: "Abweichung < 0,005 W/(m²·K)",
        status: st(Math.abs(z.nachweis.u - soll) < 0.005), nk: 2,
        einheit: " W/(m²·K)" });
    });

    const wfl = zahl(p.meta && p.meta.wohnflaeche, 0);
    if (wfl > 0) {
      const abw = (e.A_gesamt - wfl) / wfl * 100;
      r.push({ pruefung: "Summe der Raumflächen gegen Wohnfläche",
        weg: "Grundflächen aus dem Raumbuch summiert",
        ist: e.A_gesamt, soll: wfl,
        quelle: (p.meta && p.meta.wohnflaeche_quelle) || "Wohnflächenangabe ohne Quelle",
        kriterium: "Summe der Raumflächen zwischen 12 % unter und 45 % über der "
          + "Wohnfläche, hier " + (abw >= 0 ? "+" : "") + f(abw, 0) + " %",
        status: (abw >= -12 && abw <= 45) ? "bestanden" : "Abweichung", nk: 2,
        einheit: " m²" });
    }

    /* Der Rechenkern-Selbsttest stand hier als Zeile „14 von 14". Er konnte
       nie etwas anderes zeigen: erzeugen() bricht ab, wenn der Selbsttest
       nicht besteht, ein Bericht mit einer roten Zeile an dieser Stelle
       existiert also gar nicht. Damit war es keine Prüfung dieses Gebäudes,
       sondern eine Selbstbescheinigung der Software. Sie steht jetzt als
       Fließtext unter der Tabelle und ist dort als das benannt, was sie ist. */

    (p.abgleiche || []).forEach(function (a) {
      r.push({ pruefung: a.bezeichnung || "Abgleich gegen Fremdbeleg",
        weg: a.weg || "im Projekt eingetragen",
        ist: zahl(a.ist, NaN), soll: zahl(a.soll, NaN),
        quelle: a.quelle || "Fremdbeleg ohne Quellenangabe",
        kriterium: "Abweichung ≤ " + f(zahl(a.toleranz, 0.05) * 100, 0) + " %",
        status: a.status || (Number.isFinite(zahl(a.ist, NaN))
          && Number.isFinite(zahl(a.soll, NaN))
          && Math.abs(zahl(a.ist) - zahl(a.soll)) / Math.max(Math.abs(zahl(a.soll)), 1e-9)
             <= zahl(a.toleranz, 0.05) ? "bestanden" : "Abweichung"),
        nk: 2, einheit: a.einheit || "" });
    });

    return r;
  }

  /* ------------------------------------------------------------------ *
   * 6  Kapitelnummern vorab festlegen
   * ------------------------------------------------------------------ *
   * Seit dem 24.08.2026 gibt es zwei Fassungen desselben Berichts:
   *   intern  der Vollbericht mit Herkunft, Konfidenz, offenen Punkten und
   *           Prüfungen — unverändert der bisherige Bericht.
   *   druck   die Fassung für den Auftraggeber. Sebastians Vorgabe: im
   *           Ausdruck steht KEINE Aussage darüber, wie gut oder belastbar
   *           eine Zahl ist. Es entfallen: Bandbreite/Spanne, Konfidenz-
   *           klassen und Quellenspalten, BEG-Bewertungen, die Kapitel
   *           Unbeheizte Bereiche (Gegenrechnung), Offene Punkte,
   *           Plausibilitätsprüfungen sowie Quellen/Annahmen/Konfidenz.
   *           Was Eingangsgröße der Rechnung ist (Baujahr, Klima), bleibt
   *           als Wert stehen; seine EINSTUFUNG als Annahme steht intern.
   * Ein Kapitel, das entfällt, bekommt hier null; die übrigen nummerieren
   * sich lückenlos neu durch, und jeder Verweis prüft auf null. */
  function kapitelPlan(p, fassung) {
    const druck = fassung === "druck";
    /* Auch ein wiederhergestellter Stand OHNE Abbildungen hat ein Kapitel
       Planunterlagen: es zählt die Blätter auf und sagt, dass die
       Abbildungen nicht mehr vorlagen (Befund Hasenberg 25.08.2026 — das
       Kapitel fiel sonst stillschweigend weg). */
    const hatPlan = !!(((p.plan && p.plan.bilder) || []).length
      || ((p.plan && p.plan.seiten) || []).some(function (s) {
           return s && s.nurDaten && s.verwenden !== false; }));
    const hatZonen = !!(p.zonen || []).length;
    let n = 0;
    const k = {};
    k.ergebnis = ++n;
    k.objekt = ++n;
    k.plan = hatPlan ? ++n : null;
    k.grundlagen = ++n;
    k.bauteile = ++n;
    k.zonen = hatZonen && !druck ? ++n : null;
    k.raeume = ++n;
    /* Teillast. Steht hinter der raumweisen Heizlast, weil sie darauf aufbaut,
       und vor den offenen Punkten. Inhalt in modul_teillast.js. */
    k.teillast = ++n;
    k.offen = druck ? null : ++n;
    k.pruefung = druck ? null : ++n;
    k.konfidenz = druck ? null : ++n;
    return k;
  }

  /* ------------------------------------------------------------------ *
   * 7  Dokument bauen
   * ------------------------------------------------------------------ */
  /** opt.fassung: "druck" für den Ausdruck an den Auftraggeber, sonst die
   *  interne Vollfassung. Ohne Angabe bleibt es beim bisherigen Verhalten
   *  (intern), damit Selbsttests und Prüfläufe unverändert laufen; die
   *  Knöpfe der Oberfläche geben die Fassung ausdrücklich mit. */
  function dokument(opt) {
    const druck = !!(opt && opt.fassung === "druck");
    const A = window.App, p = A.p, e = A.ergebnis;
    const st = standort();
    const kopf = briefkopf("header"), fuss = briefkopf("footer");
    const K = kapitelPlan(p, druck ? "druck" : "intern");
    const unter = {};
    const U = (kap) => { unter[kap] = (unter[kap] || 0) + 1; return kap + "." + unter[kap]; };

    const zeilen = bauteilZeilen(p, e);
    const zb = zonenBilanz(p, e);
    const kf = konfidenz(p, e, zeilen);
    const punkte = offenePunkte(p, e, zeilen, kf);
    const pz = pruefzeilen(p, e, zb, zeilen, K);
    const wbAnteil = wbZuschlagAnteil(e);
    const gemischt = bilanzGemischt(e);
    const geschosse = geschossReihenfolge(e);

    const bil = Object.keys(e.bilanz || {}).map(function (k) {
      return Object.assign({ name: k }, e.bilanz[k]);
    }).sort(function (a, b) { return b.phi - a.phi; });

    const laufkopf = "Norm-Heizlast " + [p.meta.strasse,
      [p.meta.plz, p.meta.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const stand = datumDeutsch(p.meta.stand || p.meta.bearbeitet) || heute();
    /* Fußzeile jeder Seite: Ersteller, Datum und im Entwurf der Hinweis
     * darauf. Die Seitenzahl setzt @page unten rechts. */
    const lauffuss = [(st.ersteller || {}).firma || "WERK.E Energie-Effizienz-Beratung",
      stand, freigegeben() ? "" : "Entwurf"].filter(Boolean).join(" · ");

    /* Satzregeln aus modul_berichtsatz.js: Rahmen, Verzeichnis, Kennzahlen,
     * Nachziehen der Tabellenkopfzeilen. */
    const S = window.MODUL_BERICHTSATZ;

    /* --------------------------------------------------------------- *
     * Druck-CSS
     * --------------------------------------------------------------- *
     * Seitenzahl: counter(page) trägt nur in den Randfeldern von @page.
     * Chrome setzt sie, ältere Safari-Fassungen lassen sie weg; falsch wird
     * sie dadurch nie. Auf dem Deckblatt bleibt das Feld leer.
     * Kopf- und Fußzeile laufen über thead/tfoot der Rahmentabelle, weil
     * position:fixed im Druck an falscher Stelle landet: im alten Bericht
     * stand die Kopfzeile quer über der ersten Überschrift.
     * Briefkopfbild nur aufs Deckblatt. Auf fünfzehn Seiten wiederholt frisst
     * der Bogen zu viel Satzspiegel und der Bericht sieht aus wie Briefpapier;
     * die Folgeseiten tragen eine schlanke Textzeile. */
    const css = S.seitenregel("druck") + `
      #dok{font-family:Calibri,'Segoe UI',sans-serif;font-size:10.5pt;color:#272425;
        line-height:1.45}
      #dok p{margin:0 0 3.2mm;orphans:3;widows:3}
      #dok h1{font-size:24pt;font-weight:600;line-height:1.12;margin:0;letter-spacing:-.3pt}
      #dok h2{font-size:13pt;font-weight:600;line-height:1.25;margin:9mm 0 3mm;
        padding-bottom:1.6mm;border-bottom:1pt solid #5DB55A;
        break-after:avoid;page-break-after:avoid}
      #dok h3{font-size:10.8pt;font-weight:600;margin:5.5mm 0 1.8mm;
        break-after:avoid;page-break-after:avoid}
      #dok h4{font-size:10pt;font-weight:600;margin:4mm 0 1.2mm;
        break-after:avoid;page-break-after:avoid}
      #dok h2+*,#dok h3+*,#dok h4+*{break-before:avoid;page-break-before:avoid}
      #dok table{width:100%;border-collapse:collapse;font-size:9.5pt;margin:2.5mm 0 4mm;
        font-variant-numeric:tabular-nums}
      /* Spaltenabstand als Steg links, nicht als Polster rechts. So bleiben
       * linke und rechte Satzkante buendig und rechtsbuendige Zahlenspalten
       * kleben nicht am Nachbartext. */
      #dok th{text-align:left;font-weight:600;padding:1.5mm 0;
        border-bottom:.9pt solid #272425;vertical-align:bottom;background:none}
      #dok td{padding:1.5mm 0;border-bottom:.35pt solid #DDE1DE;vertical-align:top}
      #dok th+th,#dok td+td{padding-left:6mm}
      #dok td.n,#dok th.n{text-align:right}
      #dok tbody tr:last-child td{border-bottom:.9pt solid #272425}
      #dok thead{display:table-header-group}
      /* Ein tfoot wiederholt sich im Druck von Haus aus auf jeder Seite. Bei
       * einer Summenzeile ist das falsch: auf Seite 7 stuende die Gesamtsumme
       * schon unter den ersten vier Raeumen. Inhaltstabellen setzen ihren Fuss
       * deshalb einmal ans Ende; nur der Rahmen darf wiederholen. */
      #dok tfoot{display:table-row-group}
      #dok table.rahmen>tfoot{display:table-footer-group}
      #dok tr{break-inside:avoid;page-break-inside:avoid}
      /* Kurze Tabellen bleiben zusammen. Eine Tabelle mit zwei Zeilen, von der
         eine allein am Seitenende steht und die andere auf der nächsten Seite
         anfängt, sieht nach Fehler aus. Ab etwa sechs Zeilen wird das Umbrechen
         wieder sinnvoller als das Zusammenhalten; die Grenze zieht die
         aufrufende Stelle, nicht das Stylesheet. */
      #dok table.kurz{break-inside:avoid;page-break-inside:avoid}
      #dok .kopfbild{width:100%;display:block;margin:0 0 6mm}
      #dok .fussbild{width:100%;display:block;margin-top:8mm}
      #dok .schluss{margin-top:8mm;break-inside:avoid;page-break-inside:avoid}
      #dok .zusammen{break-inside:avoid;page-break-inside:avoid}
      #dok .umbruch{break-before:page;page-break-before:always}
      #dok .kasten,#dok .warn,#dok .sperr{padding:3mm 4mm;margin:4mm 0;border:0;
        break-inside:avoid;page-break-inside:avoid}
      #dok .kasten{border-left:2.4pt solid #5DB55A;background:#F3F8F3}
      #dok .warn{border-left:2.4pt solid #F5C542;background:#FDF8EA}
      #dok .sperr{border-left:2.4pt solid #B00020;background:#FBF1F2}
      #dok .klein{font-size:8.5pt;line-height:1.35;color:#5B605C}
      #dok .fussnote{font-size:8.5pt;line-height:1.35;color:#5B605C;margin:-2mm 0 4mm;
        break-before:avoid;page-break-before:avoid}
      #dok .offen{font-size:8.5pt;color:#8A6D00;font-style:italic;margin:1.5mm 0 3mm;
        padding:1.6mm 3mm;border-left:1.2pt dashed #E0C060;background:#FDFAF0}
      #dok .punkt{margin:0 0 4.5mm;padding-left:8mm;break-inside:avoid;
        page-break-inside:avoid}
      #dok .punkt b{display:block;margin-left:-8mm;margin-bottom:1.2mm;font-size:10.8pt}
      #dok .zahl{font-variant-numeric:tabular-nums}
      /* Ein hervorgehobener Zahlenwert darf nicht zwischen Zahl und Einheit
         umbrechen. In Kapitel 1 stand „13,62" und in der Zeile darunter
         „kW", sobald die Textspalte daneben breiter wurde. */
      #dok table td.n b{white-space:nowrap}
      #dok .leit{color:#B00020;font-weight:600}

      /* Rahmen: trägt Kopf- und Fußzeile auf jeder Seite */
      #dok table.rahmen{border-collapse:collapse;width:100%;margin:0;font-size:inherit}
      #dok table.rahmen>thead>tr>td.lkopf{border:0;border-bottom:.4pt solid #DDE1DE;
        padding:0 0 2.2mm;font-size:8pt;color:#7A807C;text-align:right}
      #dok table.rahmen>tfoot>tr>td.lfuss{border:0;border-top:.4pt solid #DDE1DE;
        padding:2.2mm 0 0;font-size:8pt;color:#7A807C}
      #dok table.rahmen>tbody>tr>td.lsatz{border:0;padding:5mm 0 0;vertical-align:top}
      #dok table.rahmen>tbody>tr{break-inside:auto;page-break-inside:auto}

      /* Deckblatt */
      #dok .deck{break-after:page;page-break-after:always}
      /* Enge Fassung. Das Deckblatt hat einen festen Seitenumbruch. Kommt der
         Kasten der nicht bestandenen Selbstpruefung dazu, passt der letzte
         Kasten nicht mehr darauf und faellt auf eine zweite, sonst leere
         Seite. Statt einen Kasten wegzulassen, ruecken alle enger. */
      #dok .deck.eng .kasten,#dok .deck.eng .warn,#dok .deck.eng .sperr{
        padding:2.4mm 4mm;margin:3mm 0}
      #dok .deck.eng .deckstrich{margin:4mm 0 4mm}
      #dok .deck.eng table.deckliste th{padding:1.1mm 6mm 1.1mm 0}
      #dok .deck.eng table.deckliste td{padding:1.1mm 0}
      #dok .deck.eng .deckerg{margin-top:4mm;padding:3mm 6mm}
      #dok .deck.eng .deckfuss{margin-top:4mm}
      #dok .deckauge{font-size:9pt;letter-spacing:1.8pt;text-transform:uppercase;
        color:#5B605C;margin:0 0 3mm}
      #dok .deckort{font-size:13pt;color:#272425;margin:3mm 0 0}
      #dok .deckanschrift{font-size:11pt;color:#5B605C;margin:1.2mm 0 0}
      #dok .deckstrich{height:2.4pt;background:#5DB55A;width:26mm;margin:5mm 0 6mm}
      #dok table.deckliste{margin:0;font-size:10pt}
      #dok table.deckliste th{width:44mm;font-weight:400;color:#5B605C;
        border-bottom:.35pt solid #EBEEEC;vertical-align:top;padding:1.6mm 6mm 1.6mm 0}
      #dok table.deckliste td{border-bottom:.35pt solid #EBEEEC;padding:1.6mm 0}
      #dok table.deckliste tbody tr:last-child td{border-bottom:.35pt solid #EBEEEC}
      #dok .deckerg{margin:6mm 0 0;padding:4mm 6mm;background:#F6F8F6;
        border-left:2.4pt solid #5DB55A;break-inside:avoid}
      #dok .deckerg .b{font-size:9pt;letter-spacing:1.2pt;text-transform:uppercase;
        color:#5B605C}
      #dok .deckerg .w{font-size:27pt;font-weight:600;line-height:1.05;
        letter-spacing:-.6pt;margin:1.5mm 0 0;font-variant-numeric:tabular-nums}
      #dok .deckerg .w span{font-size:12pt;font-weight:400;margin-left:2.5mm;
        letter-spacing:0;color:#4A504C}
      #dok .deckerg-bez{font-size:11pt;color:#4A504C;margin-top:1.6mm;line-height:1.3}
      #dok .deckerg-zus{font-size:8.5pt;color:#5B605C;margin-top:2.2mm;line-height:1.35}

      /* Unterschriftsblock auf dem Schlussblatt */
      #dok .unterschrift{margin:0 0 8mm}
      #dok .unterschrift .ubort{font-size:10pt;margin:0 0 12mm}
      #dok .unterschrift .ubreihe{display:table;width:100%;table-layout:fixed;
        margin-bottom:9mm}
      #dok .unterschrift .ubfeld{display:table-cell;padding-right:10mm;
        vertical-align:bottom}
      #dok .unterschrift .ubreihe .ubfeld:last-child{padding-right:0}
      #dok .unterschrift .ublinie{border-bottom:.6pt solid #272425;padding-bottom:1.2mm;
        font-size:10pt;min-height:5mm}
      #dok .unterschrift .ubbez{font-size:8.5pt;color:#5B605C;margin-top:1.4mm}
      #dok .unterschrift .ubfirma{font-size:9pt;color:#4A504C;margin-top:2mm}
      #dok .deckfuss{margin-top:6mm;display:table;width:100%;table-layout:fixed;
        font-size:9pt;color:#4A504C;line-height:1.4}
      #dok .deckfuss>div{display:table-cell;padding-right:8mm;vertical-align:top}

      /* Inhaltsverzeichnis */
      #dok .ivz{margin:1mm 0 0}
      #dok .ivzz{padding:2.2mm 0;border-bottom:.35pt solid #EBEEEC;
        break-inside:avoid;page-break-inside:avoid}
      #dok .ivzz a{color:inherit;text-decoration:none}
      #dok .ivznr{display:inline-block;width:13mm;color:#5B605C;
        font-variant-numeric:tabular-nums}
      #dok .ivzt{font-weight:600}

      /* Kennzahlenspiegel in Kapitel 1 */
      #dok .kzreihe{display:table;width:100%;table-layout:fixed;border-collapse:collapse;
        margin:1mm 0 6mm;break-inside:avoid;page-break-inside:avoid}
      #dok .kz{display:table-cell;vertical-align:top;padding:3.5mm 6mm 0 0;
        border-top:1pt solid #272425}
      #dok .kz+.kz{padding-left:6mm;border-left:.35pt solid #DDE1DE}
      #dok .kz:last-child{padding-right:0}
      #dok .kzw{font-size:21pt;font-weight:600;line-height:1;letter-spacing:-.5pt;
        font-variant-numeric:tabular-nums}
      #dok .kzw .kze{font-size:10.5pt;font-weight:400;color:#5B605C;margin-left:1.6mm;
        letter-spacing:0}
      #dok .kzb{font-size:9.5pt;margin-top:2.4mm;line-height:1.3}
      #dok .kzh{font-size:8.5pt;color:#7A807C;margin-top:.8mm;line-height:1.3}

      /* Am Bildschirm derselbe Satzspiegel wie im Druck. Sonst laufen die
       * Zeilen ueber die ganze Fensterbreite und das Fenster, das der Kunde
       * am Rechner zu sehen bekommt, sieht anders aus als sein PDF. */
      @media screen{#dok{max-width:166mm;margin:0 auto;padding:12mm 0 24mm}}
    `;

    /* --------------------------------------------------------------- *
     * Kapitel einsammeln; dabei entsteht das Inhaltsverzeichnis
     * --------------------------------------------------------------- *
     * Erzwungene Seitenwechsel gibt es nur noch vor Kapitel 1 und vor der
     * Anlage. Vorher standen sechs davon im Bericht und hinterliessen halb
     * leere Seiten. Dass keine Überschrift allein am Seitenende steht,
     * regelt break-after:avoid. */
    const ivz = [];
    function ueberschrift(nr, titel, id, neueSeite) {
      ivz.push({ nr: nr == null ? "" : String(nr), titel: titel, id: id });
      return '<h2 id="' + id + '"' + (neueSeite ? ' class="umbruch"' : "") + ">"
        + (nr == null ? "" : e2(nr) + " ") + e2(titel) + "</h2>";
    }

    let t = "";

    /* 1 Ergebnis auf einen Blick */
    t += ueberschrift(K.ergebnis, "Ergebnis auf einen Blick", "kap-ergebnis", true)
      + kapitel1(p, e, geschosse, druck);

    /* 2 Objekt und Datengrundlage. Eigene Seite: das Kapitel begann sonst
       unter der Fußnote von Kapitel 1 mitten auf der Seite. */
    t += ueberschrift(K.objekt, "Objekt und Datengrundlage", "kap-objekt", true)
      + kapitel2(p, e, K, U, druck);

    /* 3 Planunterlagen */
    if (K.plan) t += planKapitel(K.plan, U, ueberschrift, druck);

    /* 4 Berechnungsgrundlagen */
    t += ueberschrift(K.grundlagen, "Berechnungsgrundlagen", "kap-grundlagen")
      + kapitel4(p, e, K, U, wbAnteil, zeilen, druck);

    /* 5 Bauteile und U-Werte */
    t += ueberschrift(K.bauteile, "Bauteile und U-Werte", "kap-bauteile")
      + kapitel5(p, e, K, U, zeilen, druck);

    /* 6 Unbeheizte Bereiche. Im Druck entfällt das Kapitel (K.zonen ist
       null): es besteht aus Gegenrechnung und Herleitung, also aus genau
       dem Prüfinhalt, der intern bleibt. Die Zonentemperaturen selbst
       stehen weiter in Anlage 1 (Spalte θ_j). */
    if (K.zonen) {
      t += ueberschrift(K.zonen, "Unbeheizte Bereiche", "kap-zonen")
        + kapitel6(p, e, zb);
    }

    /* 7 Raumweise Heizlast */
    t += ueberschrift(K.raeume, "Raumweise Heizlast", "kap-raeume")
      + kapitel7(p, e, K, U, bil, gemischt, zeilen, druck);

    /* Heizlast über der Außentemperatur, siehe modul_teillast.js */
    if (window.MODUL_TEILLAST) {
      t += ueberschrift(K.teillast, "Heizlast über der Außentemperatur", "kap-teillast")
        /* K mitgeben: das Kapitel verweist auf die Raumtabelle, auf die
           offenen Punkte und auf die Konfidenztabelle. Ohne den Kapitelplan
           nennt es sie beim Namen statt bei der Nummer, statt eine Nummer
           zu raten. Im Druck entfallen die Verweise auf entfallene Kapitel
           im Modul selbst (letzter Parameter). */
        + window.MODUL_TEILLAST.kapitel(p, e, U, K.teillast, K, druck);
    }

    /* 8 Offene Punkte — nur intern */
    if (K.offen) {
      t += ueberschrift(K.offen, "Offene Punkte vor der Beauftragung", "kap-offen")
        + kapitel8(punkte, kf, K, wirkungGesamt(p, e, punkte), e,
                   wirkungsLuecken(zeilen));
    }

    /* 9 Plausibilitätsprüfungen — nur intern */
    if (K.pruefung) {
      t += ueberschrift(K.pruefung, "Plausibilitätsprüfungen", "kap-pruefung")
        + kapitel9(p, e, pz, K, U);
    }

    /* 10 Quellen, Annahmen, Konfidenz — nur intern */
    if (K.konfidenz) {
      t += ueberschrift(K.konfidenz, "Quellen, Annahmen und Konfidenz", "kap-konfidenz")
        + kapitel10(p, e, kf, K, punkte);
    }

    /* Anlage 1 */
    t += ueberschrift(null, "Anlage 1 Bauteilweise Berechnung je Raum", "anl-1", true)
      + anlage1(p, e, zeilen, druck);

    /* Anlage 2 nur, wenn der Bearbeiter beim Abhaken etwas dazugeschrieben
     * hat. Sie ist die Antwort auf die Frage, wohin diese Vermerke gehören.
     *
     * Nicht verwerfen: der Vermerk ist die Begründung dafür, dass ein
     * aufgeworfener Punkt keiner ist, und damit das Einzige, was aus dem
     * Vorgang ein Fachurteil macht. Nicht in den Fließtext: dort holte er
     * die Hinweise zurück, die der Bearbeiter gerade abgeräumt hat. In die
     * Anlage: der Bericht bleibt vorne sauber, und wer nachfragt, findet
     * hinten den Satz des Menschen, der unterschrieben hat.
     *
     * Gedruckt wird ausschließlich SEIN Text, nicht der des Werkzeugs. Die
     * Frage ist beantwortet; die Antwort gehört ins Papier, die Frage nicht.
     *
     * Nur intern: die Vermerke begründen abgehakte Punkte der Selbstprüfung,
     * und die steht im Ausdruck nicht. Was im Ausdruck bleibt, ist der eine
     * Satz über die Durchsicht (kenntnisnahmeDruck unten). */
    const anl2 = druck ? "" : anlage2();
    if (anl2) {
      t += ueberschrift(null, "Anlage 2 Vermerke des Bearbeiters", "anl-2", true) + anl2;
    }

    /* Im Druck bleibt die Erklärung des Ausstellers erhalten: dass ein
       Fachmann die von der Selbstprüfung aufgeworfenen Punkte durchgesehen
       und zur Kenntnis genommen hat. Das ist keine Unsicherheitsangabe,
       sondern eine Tatsache über dieses Dokument (Sebastians Vorgabe). Sie
       steht unmittelbar vor der Unterschrift, ohne Verweis auf Kapitel, die
       es im Ausdruck nicht gibt. */
    if (druck) t += kenntnisnahmeDruck();

    /* Schlussblatt: Unterschrift, Ansprechpartner, Impressumsbogen. Sie
     * gehoeren zusammen und duerfen nicht auf zwei Seiten fallen. Ein Bericht
     * ohne Unterzeichner ist nicht abnahmefaehig; die Angaben dazu stammen
     * aus dem Projekt und dem Standort, erfunden wird keine. */
    const er2 = st.ersteller || {};
    /* Geltungsbereich. Das steht hier, weil es die letzte Seite ist, die
       jemand liest, bevor er bestellt.

       Es ist eine fachliche Leistungsabgrenzung und kein Haftungsausschluss:
       der erste Absatz sagt, wofür das Ergebnis gilt und wann es neu zu
       rechnen ist, der zweite, welche Planungsschritte nicht darin stecken.
       Der frühere Satz "Er dient der Auslegung des Wärmeerzeugers und der
       Heizflächen" ist entfallen — die Norm-Heizlast ist eine Grundlage der
       Anlagenplanung, nicht die Auslegung selbst, und die Heizflächen legt
       dieser Bericht ohnehin nicht aus.

       Über die Förderfähigkeit entscheidet die bewilligende Stelle, nicht
       dieses Papier und erst recht nicht das Werkzeug, das es gesetzt hat. */
    t += '<div class="schluss">'
      + '<p class="klein" style="margin-bottom:2.4mm"><b>Geltungsbereich</b><br>'
      + "Diese Berechnung beschreibt die Norm-Heizlast nach DIN EN 12831-1 für den in "
      + "Abschnitt " + K.objekt + " dokumentierten Gebäudezustand und die zugrunde "
      + "gelegten Randbedingungen. Änderungen an Geometrie, Bauteilen, Nutzung oder "
      + "Auslegungstemperaturen können das Ergebnis verändern; die Berechnung ist dann "
      + "zu wiederholen.</p>"
      + '<p class="klein" style="margin-bottom:8mm">Auswahl und Dimensionierung von '
      + "Wärmeerzeuger, Heizflächen, Trinkwarmwasserbereitung, Speicher, Hydraulik, "
      + "Regelung und elektrischer Anschlussleistung sind nicht Bestandteil dieses "
      + "Berichts, soweit nicht gesondert ausgewiesen."
      /* Der Fördersatz gehört zur BEG-Bewertung und steht nur intern: im
         Druck gibt es die Anforderungsspalte nicht, auf die er sich bezieht. */
      + (druck ? ""
        : " Ob eine Maßnahme gefördert wird, entscheidet die "
          + "bewilligende Stelle; die Angaben zu den Anforderungen in Abschnitt "
          + K.bauteile + " sind eine fachliche Einschätzung und keine Zusage.")
      + "</p>"
      + S.unterschriftsblock({
        ort: p.meta.erstellort || st.erstellort,
        datum: stand,
        name: p.meta.bearbeiter || er2.person || "",
        funktion: p.meta.bearbeiter_funktion || er2.rolle1 || "",
        eee: p.meta.eee_nummer || "",
        firma: er2.firma || "",
        kontakt: [er2.tel ? "Telefon " + er2.tel : "", er2.mail]
          .filter(Boolean).join(" · "),
      })
      /* Die Version des Rechenkerns lautet intern „1.0.0-RC1". Im Bericht an
         den Auftraggeber hat ein Kennzeichen wie „RC1" nichts zu suchen: es
         sagt dem Leser nichts über die Rechnung und liest sich wie ein
         Vorabstand. Die Version selbst bleibt unangetastet; gedruckt wird
         im Ausdruck die Berechnungsversion aus Haupt- und Nebenstelle,
         intern weiter die vollständige Kennung. */
      + '<p class="klein">Erstellt mit dem WERK.E Heizlast-Werkzeug'
      + (druck
        ? berechnungsversion()
        : ", Rechenkern Version "
          + e2((window.KERN_HEIZLAST_NORM || {}).version || "?"))
      + ". Rückfragen zu diesem Bericht beantwortet der Unterzeichner.</p>"
      + (fuss ? '<img class="fussbild" src="data:image/png;base64,' + fuss + '" alt="">' : "")
      + "</div>";

    /* --------------------------------------------------------------- *
     * Zusammensetzen: Deckblatt frei, alles Weitere im Rahmen
     * --------------------------------------------------------------- */
    const inhaltsseite = '<h2 id="ivz" style="margin-top:0">Inhalt</h2>'
      + S.verzeichnis(ivz)
      + '<p class="klein" style="margin-top:6mm">Im PDF führt jeder Eintrag '
      + "per Klick zum Kapitel. Die Seitenzahl steht unten rechts.</p>";

    /* Kein gedrehtes Wasserzeichen mehr. Es lag im Druck an wechselnden
     * Stellen quer ueber den Tabellen und war schlechter lesbar als der
     * klare Weg: Feld "Fassung" auf dem Deckblatt und "Entwurf" in der
     * Fusszeile jeder einzelnen Seite. */
    let h = '<div id="dok">';
    h += deckblatt(p, e, st, K, stand, kopf, druck);
    h += S.rahmen(laufkopf, lauffuss, inhaltsseite + S.kopfzeilenEinziehen(t));
    h += "</div>";
    return { html: h, css: css, sperren: zb.filter(function (z) {
      return z.vergleichbar && z.abweichung > ZONEN_TOLERANZ_K; }) };
  }

  /* ---------------- Deckblatt ---------------- *
   * Ein Deckblatt beantwortet sechs Fragen, bevor jemand blättert: was ist
   * das, welches Objekt, für wen, wann, von wem, in welcher Fassung. Dazu
   * das Ergebnis, weil genau danach zuerst gesucht wird. Die Reihenfolge der
   * Felder liegt in modul_berichtsatz.js und ist dort geprüft. */
  function deckblatt(p, e, st, K, stand, kopf, druck) {
    const S = window.MODUL_BERICHTSATZ;
    const er = st.ersteller || {};
    const anschrift = [p.meta.strasse,
      [p.meta.plz, p.meta.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const grundlagen = unterlagen(p.meta);
    const an = annahmeAnteil(e);

    const felder = S.deckblattFelder({
      /* Die Anschrift steht schon als Zeile unter dem Titel. Das Feld Objekt
       * traegt deshalb nur die Bauart und wiederholt sie nicht.
       * Das Baujahr hat eine eigene Zeile: "Objekt: Baujahr 1936" beschreibt
       * kein Objekt, sondern beschriftet eine Jahreszahl falsch. */
      objekt: p.meta.gebaeudetyp || "",
      baujahr: p.meta.baujahr
        ? String(p.meta.baujahr)
          + (p.meta.modernisierung ? ", letzte Modernisierung " + p.meta.modernisierung : "")
        : "",
      auftraggeber: p.meta.bauherr,
      projektnr: p.meta.projektnr,
      grundlage: "DIN EN 12831-1:2017-09 in Verbindung mit DIN/TS 12831-1:2020-04",
      zustand: p.meta.zustand,
      klima: Number.isFinite(e.klima.theta_e)
        ? f(e.klima.theta_e, 1) + " °C" + (p.meta.plz ? " (PLZ " + p.meta.plz + ")" : "")
        : "",
      stand: stand,
      ersteller: [p.meta.bearbeiter || er.person,
        p.meta.bearbeiter_funktion || er.rolle1].filter(Boolean).join(", "),
      fassung: S.fassung(freigegeben(), stand),
    });

    /* Der rote Kasten der Selbstpruefung kommt nur manchmal dazu. Wenn ja,
       ruecken die Bloecke des Deckblatts enger zusammen, damit alles auf die
       eine Seite passt, die das Deckblatt hat. */
    const prRot = !!(typeof window !== "undefined" && window.App && window.App.pruefung
      && window.App.pruefung.ampel === "rot");
    let h = '<div class="deck' + (prRot ? " eng" : "") + '">';
    if (kopf) h += '<img class="kopfbild" src="data:image/png;base64,' + kopf + '" alt="">';
    /* WAS UNTER DEM TITEL STEHEN MUSS: DAS OBJEKT.
     *
     * Hier stand `anschrift || bezeichnung` — die Anschrift ODER der Name,
     * je nachdem, was zuerst gefüllt war. Am 23.08.2026 an
     * „BV 2-0887 Ziolkowski" gemessen: Straße und Postleitzahl fehlten, Ort
     * war „Paderborn", also gewann die „Anschrift" und auf dem Deckblatt
     * stand als Objektzeile nur „Paderborn". Zusammen mit dem Feld
     * „Projektnummer 300" war das die ganze Kennzeichnung des Objekts. So
     * unterschreibt niemand ein Dokument.
     *
     * Jetzt steht die Bezeichnung IMMER da, und die Anschrift darunter. Was
     * fehlt, wird benannt statt weggelassen: eine leere Zeile liest sich wie
     * eine Angabe, die es nicht gibt, während „in den Unterlagen nicht
     * angegeben" eine Auskunft ist. */
    const bez = String(p.meta.bezeichnung || "").trim();
    h += '<p class="deckauge">Norm-Heizlast nach DIN EN 12831-1</p>'
      + "<h1>Heizlastberechnung</h1>"
      + '<p class="deckort">'
      + e2(bez || "Objekt in den Unterlagen nicht bezeichnet") + "</p>"
      + '<p class="deckort deckanschrift">'
      + e2(anschrift || "Anschrift in den Unterlagen nicht angegeben") + "</p>"
      + '<div class="deckstrich"></div>'
      + '<table class="deckliste">'
      + felder.map(function (x) {
        return "<tr><th>" + e2(x.bez) + "</th><td>" + e2(x.wert) + "</td></tr>";
      }).join("")
      + "</table>";

    /* Die Zahl und im selben Kasten, was sie trägt. Eine harte Zahl vorn und
       die Auflösung auf Seite zehn, dass sie auf Annahmen steht, liest sich
       zu Recht wie Beschönigung. */
    const dz = deckZahl(e.phi_gebaeude, an);
    /* „Auslegungswert für den Wärmeerzeuger" stand hier als Bezeichnung der
       Zahl und ging damit weiter, als die Rechnung trägt: die Norm-Heizlast
       ist die Leistung für die Raumheizung beim Auslegungspunkt, nicht die
       Nennleistung eines Geräts. Die Zahl bleibt unverändert; benannt wird
       sie jetzt nach dem, was sie ist, samt Auslegungspunkt. Der Bezug steht
       als eigene Zeile unter der Zahl und nicht hinter ihr, weil er dort im
       Druck in die zweite Zeile der 27-pt-Zeile umbräche. */
    const teDeck = e && e.klima && Number.isFinite(e.klima.theta_e)
      ? f(e.klima.theta_e, 1) : null;
    h += '<div class="deckerg"><div class="b">Norm-Heizlast des Gebäudes</div>'
      + '<div class="w">' + dz.wert + "<span>kW</span></div>"
      + '<div class="deckerg-bez">für Raumheizung'
      + (teDeck ? " bei " + teDeck + " °C Norm-Außentemperatur" : "")
      + "</div>"
      + (dz.gerechnet
        /* Im Druck bleibt die Rundung als Tatsache stehen, die Begründung
           über die Datenlage bleibt intern: sie ist eine Aussage darüber,
           wie belastbar die Zahl ist. */
        ? '<div class="deckerg-zus">Gerechnet sind ' + dz.gerechnet + " kW"
          + (druck ? ", angegeben auf 0,1 kW gerundet.</div>"
            : ". Auf eine zweite Nachkommastelle gibt die Datenlage die Zahl "
              + "nicht her; sie ist deshalb auf 0,1 kW gerundet angegeben.</div>")
        : "")
      /* Punktwert PLUS Spanne, auf derselben Seite wie die Zahl. Eine harte
         Zahl allein sagt nicht, wie weit sie tragen kann. NUR INTERN:
         Sebastians Vorgabe vom 24.08.2026, im Ausdruck keine Spanne. */
      + (!druck && bandbreite()
        ? '<div class="deckerg-zus">' + e2(bandbreiteSatz(bandbreite())) + "</div>"
        : "")
      /* Wofür die Zahl auf dem Deckblatt taugt und wofür nicht. Sie steht
         unmittelbar bei der Zahl, weil sie sonst niemand liest, der nur das
         Deckblatt abfotografiert und danach ein Gerät bestellt. */
      + '<div class="deckerg-zus">Die Norm-Heizlast bildet eine Grundlage für '
      + "die weitere Anlagenplanung. Sie ist nicht ohne Berücksichtigung von "
      + "Betriebsweise, Trinkwarmwasserbereitung und Anlagenkonzept mit der "
      + "erforderlichen Nennleistung eines Wärmeerzeugers gleichzusetzen.</div>"
      + "</div>";

    /* Steht die Selbstprüfung auf Rot, darf das Deckblatt die Zahl nicht
       kommentarlos zeigen. Wer die Warnung erst zehn Seiten später findet,
       hat sie zu spät gefunden. Der Kasten steht unmittelbar unter der Zahl,
       auf die er sich bezieht. Am Ende des Deckblatts fiel er auf eine
       zweite, sonst leere Seite: das Deckblatt hat einen festen
       Seitenumbruch, und drei Zeilen mehr passten nicht darauf. */
    const pr = (typeof window !== "undefined" && window.App && window.App.pruefung) || null;
    if (prRot && pr) {
      /* Der rote Kasten bleibt auch im Druck: einen Bericht, der in diesem
         Zustand nicht trägt, als sauber zu übergeben wäre keine
         Zurückhaltung, sondern eine Fälschung. Er ist die eine begründete
         Ausnahme von der Regel, dass der Ausdruck keine Prüfaussagen trägt
         (Ausnahmeliste der druckSuche).
         PUNKT 14 (Sebastian, 26.08.2026): im Ausdruck ohne Zähler und ohne
         das Wort Selbstprüfung — was der Auftraggeber wissen muss, ist, dass
         dieser Stand nicht zur Auslegung taugt, nicht wie viele Befunde die
         Maschine dazu geführt hat. Intern bleibt der Kasten unverändert
         beziffert und verweist auf das Befundkapitel. */
      h += '<div class="sperr selbstpruefung">'
        + (druck
          ? "Dieser Bericht ist in diesem Bearbeitungsstand nicht zur "
            + "Auslegung eines Wärmeerzeugers geeignet und nicht zur "
            + "Weitergabe bestimmt.</div>"
          : "Die Selbstprüfung dieses Berichts ist nicht bestanden: "
            + anzahlWort(pr.zaehl.fehler, "Befund", "Befunde")
            + " der Stufe Fehler. Diese Heizlast ist in diesem Zustand nicht "
            + "zur Auslegung eines Wärmeerzeugers geeignet. Die Befunde "
            + "stehen einzeln in Abschnitt " + K.pruefung + ".</div>");
    }

    /* Die Frage, mit der der Auftraggeber den Bericht aufschlägt, gehört auf
       dieselbe Seite wie die Zahl und nicht zehn Seiten weiter. NUR INTERN:
       der Kasten beziffert, wie viel der Rechnung auf Annahmen steht, und
       genau diese Aussage soll im Ausdruck nicht stehen. Ein neutraler Rest
       bliebe nicht übrig — auch die Entwarnung („die U-Werte sind belegt")
       ist eine Güteaussage. */
    const ots = druck ? "" : ortsterminSatz(an);
    if (ots) {
      /* ortsterminSatz trägt die Frage inzwischen selbst (Kapitel 1 braucht
         sie, dort fehlte sie). Hier steht sie fett in der Überschrift —
         zweimal hintereinander wäre sie eine zu viel. */
      h += '<div class="' + (an && an.prozent >= 0.5 ? "warn" : "kasten") + '">'
        + '<b>Muss vor der Bestellung noch jemand ins Haus?</b><br>'
        + e2(ots.replace(/^Muss [^?]*\?\s*/, "")) + "</div>";
    }

    h += '<div class="deckfuss"><div>' + e2(er.firma || "") + "<br>"
      + e2([er.strasse, er.ort].filter(Boolean).join(", ")) + "<br>"
      + e2([er.tel ? "Telefon " + er.tel : "", er.mail].filter(Boolean).join(" · "))
      + "</div><div><b>Aufgestellt von</b><br>"
      + e2(p.meta.bearbeiter || er.person || "") + "<br>"
      + e2(p.meta.bearbeiter_funktion || er.rolle1 || "")
      + "</div></div>";

    const satz2 = p.meta.aufmass_vor_ort === true
      ? "" : " Ein Aufmaß vor Ort hat nicht stattgefunden.";
    /* Ohne Liste der Unterlagen darf hier nicht auf ein Kapitel verwiesen
       werden, in dem dann auch keine steht. Der Leser sucht sonst eine Angabe,
       die es im Bericht gar nicht gibt. */
    /* Die frühere Fassung dieses Satzes las sich, als hätte niemand in die
       Unterlagen gesehen. Fehlt die Liste, fehlt die Liste; die Herkunft jeder
       einzelnen Eingabe steht trotzdem im Bericht, und genau das gehört
       dahin. */
    /* Im Druck bleibt der Kasten nur, wenn er etwas Positives zu sagen hat:
       die Liste der ausgewerteten Unterlagen ist Datengrundlage. Der
       Fehlens-Hinweis samt Aufmaß-Satz ist eine Aussage über die Güte der
       Grundlage und bleibt intern. */
    if (druck) {
      if (grundlagen.length) {
        h += '<div class="kasten" style="margin-top:5mm">Ausgewertet wurden '
          + e2(undListe(grundlagen)) + ".</div>";
      }
    } else {
      h += '<div class="kasten" style="margin-top:5mm">'
        + (grundlagen.length
          ? "Ausgewertet wurden " + e2(undListe(grundlagen)) + "."
          : "Eine zusammenfassende Liste der ausgewerteten Unterlagen ist zu diesem "
            + "Bericht nicht hinterlegt. Woher jede einzelne Eingabe stammt, steht in "
            + "Abschnitt " + K.konfidenz + ", Angabe für Angabe.")
        + satz2 + "</div>";
    }

    return h + "</div>";
  }

  /* ---------------- 1 Ergebnis auf einen Blick ---------------- */
  function kapitel1(p, e, geschosse, druck) {
    const S = window.MODUL_BERICHTSATZ;
    const wfl = zahl(p.meta.wohnflaeche, 0);

    /* Kennzahlenspiegel: die drei Zahlen, nach denen zuerst gesucht wird.
     * Nur Werte, die die Rechnung hergibt; nichts wird abgeleitet oder
     * gerundet dazuerfunden. */
    const spez = wfl > 0 && Number.isFinite(e.spez_wohnflaeche)
      ? { wert: f(e.spez_wohnflaeche, 1), einheit: "W/m²",
          bez: "spezifische Heizlast",
          hinweis: "bezogen auf " + f(wfl, 2) + " m² Wohnfläche" }
      : (Number.isFinite(e.spez_raumflaeche)
        ? { wert: f(e.spez_raumflaeche, 1), einheit: "W/m²",
            bez: "spezifische Heizlast",
            hinweis: "bezogen auf " + f(e.A_gesamt, 2) + " m² Raumfläche" }
        : null);
    /* Dieselbe Rundungsregel wie auf dem Deckblatt. Stünde hier groß 9,05 kW,
       während vorne rd. 9,1 kW steht, sähe die Seite so aus, als würde eine
       der beiden Zahlen etwas verschweigen. Der gerechnete Wert steht in der
       Tabelle darunter, dort ist er am Platz. */
    const dz1 = deckZahl(e.phi_gebaeude, annahmeAnteil(e));
    let h = S.kennzahlreihe([
      { wert: dz1.wert, einheit: "kW",
        bez: "Norm-Heizlast des Gebäudes",
        /* Dieselbe Benennung wie auf dem Deckblatt: Raumheizung beim
           Auslegungspunkt, Grundlage der Anlagenplanung — und nicht die
           Nennleistung eines Wärmeerzeugers. */
        hinweis: "Raumheizung, Grundlage der weiteren Wärmeerzeugerauslegung"
          + (dz1.gerechnet ? ", gerechnet " + dz1.gerechnet + " kW" : "") },
      spez,
      Number.isFinite(e.klima.theta_e)
        ? { wert: f(e.klima.theta_e, 1), einheit: "°C",
            bez: "Norm-Außentemperatur",
            hinweis: p.meta.plz ? "PLZ " + p.meta.plz : "" }
        : null,
    ]);

    /* Die Spanne unmittelbar unter der Zahl, aus demselben Satzbaustein wie
       auf dem Deckblatt. Die größten Posten stehen daneben: sie sagen, welche
       EINE Angabe am meisten bringt, wenn die Spanne enger werden soll. */
    /* NUR INTERN: Spanne, Ortstermin-Vorbehalt, Annahmenliste und
       Baujahr-Gegenrechnung sind Aussagen darüber, wie belastbar die Zahl
       ist. Sebastians Vorgabe vom 24.08.2026: intern sichtbar, im Ausdruck
       nichts davon. */
    const bb = druck ? null : bandbreite();
    if (bb) {
      const gross = (bb.beitraege || [])
        .filter(function (x) { return (x.anteil || 0) >= 0.03; }).slice(0, 4);
      h += '<div class="kasten"><b>Wie belastbar ist diese Zahl?</b><br>'
        + e2(bandbreiteSatz(bb))
        + (gross.length
          ? "<br>Den größten Anteil daran "
            + (gross.length === 1 ? "hat " : "haben ")
            + gross.map(function (x) {
                /* Die Kennung aus dem Rechenkern heißt „ΔU_WB". Im Druck ist
                   der Unterstrich ein Programmierrest; gesetzt wird derselbe
                   Index wie in Kapitel 7. */
                return e2(x.label).replace(/_WB\b/, "<sub>WB</sub>")
                  + " (" + f((x.anteil || 0) * 100, 0)
                  + " Prozent, " + f(x.wirkung_w || 0, 0) + " W)";
              }).join(", ")
            + ". Wer die Spanne enger haben will, misst dort zuerst nach."
          : "")
        + "</div>";
    }

    /* Das Deckblatt trägt den Vorbehalt, Kapitel 1 trug ihn nicht. Wer den
       Bericht bei Kapitel 1 aufschlägt, und das tun die meisten, las bis hier
       drei harte Zahlen ohne ein Wort dazu, worauf sie stehen. Derselbe Satz
       aus derselben Funktion wie vorn: zwei Formulierungen desselben
       Vorbehalts wären zwei Aussagen. */
    const anK1 = annahmeAnteil(e);
    const otsK1 = druck ? "" : ortsterminSatz(anK1);
    if (otsK1) {
      h += '<div class="' + (anK1 && anK1.prozent >= 0.5 ? "warn" : "kasten") + '">'
        + "<b>Worauf diese Zahlen stehen</b><br>" + e2(otsK1) + "</div>";
    }

    /* ANGENOMMENE EINGABEN GEHÖREN NACH VORN.
     *
     * Steht eine Eingabe nicht in den Unterlagen und ist aus ihnen abgeleitet
     * worden, dann trägt die große Zahl darüber diese Ableitung. Das erst auf
     * Seite zehn zu sagen heißt, es dem zu sagen, der ohnehin bis dorthin
     * liest. Hier steht es, wo die Zahl steht — mit Wert, Herleitung und der
     * Richtung, in die sie danebenliegen kann. Der Wortlaut kommt aus
     * p.annahmen, also aus derselben Quelle wie das Werkzeug; zwei
     * Formulierungen desselben Vorbehalts wären zwei Aussagen. */
    const anListe = druck ? [] : Object.keys((p.annahmen) || {})
      .filter(function (k) { return k !== "baujahr_nicht"; })
      .map(function (k) { return p.annahmen[k]; })
      .filter(function (a) { return a && a.begruendung; });
    if (anListe.length) {
      h += '<div class="warn"><b>Diese Berechnung steht auf '
        + (anListe.length === 1 ? "einer Annahme" : anListe.length + " Annahmen")
        + "</b><br>"
        + anListe.map(function (a) {
            return "<b>" + e2(a.kurz || "Angenommener Wert") + ".</b> "
              + e2(a.begruendung)
              + (a.richtung ? " <i>" + e2(a.richtung) + "</i>" : "");
          }).join("<br>")
        + "<br>Die Angaben sind überschreibbar; mit einer belegten Angabe ist "
        + "die Rechnung zu wiederholen. Alle Annahmen dieses Berichts stehen "
        + "zusammen in der Annahmenliste.</div>";
    }

    /* DIE GEGENRECHNUNG ZUM ANGENOMMENEN BAUJAHR — NEBEN DER ZAHL, NICHT
     * DREI KAPITEL WEITER.
     *
     * Aus dem Baujahr kommen die U-Werte. Ist es angenommen, hängt die große
     * Zahl oben an dieser einen Annahme, und zwar nicht ein bisschen: dasselbe
     * Gebäude in einer anderen Baualtersklasse ergibt ein Vielfaches. Die
     * Bandbreite daneben deckt das ausdrücklich NICHT ab, sie streut nur
     * innerhalb der angesetzten Klasse.
     *
     * Bisher stand darüber kein Wort und keine Zahl. Der Leser sah „5,98 kW,
     * Spanne 5,44 bis 6,77" und daneben „Baujahr aus dem Plandatum
     * angenommen" — zwei Angaben, deren Zusammenhang er selbst hätte rechnen
     * müssen. Gerechnet hat sie KERN_BAUJAHRPROBE, in Millisekunden; hier
     * steht das Ergebnis. */
    const bp = (!druck && typeof window !== "undefined" && window.App)
      ? window.App.baujahrprobe : null;
    if (bp && bp.ok && bp.angenommen && (bp.stufen || []).length) {
      const hoch = bp.stufen.reduce(function (a, b) { return b.w > a.w ? b : a; }, bp.stufen[0]);
      h += '<div class="warn"><b>Was am angenommenen Baujahr hängt</b><br>'
        + e2(bp.text)
        + "<br>Diese Gegenrechnung ist nötig, weil das Baujahr die U-Werte "
        + "bestimmt UND den Erwartungswert, gegen den die Plausibilitätsprüfung "
        + "vergleicht. Beide Seiten dieses Vergleichs stammen damit aus "
        + "derselben Annahme; er kann sie nicht prüfen. Die Bandbreite des "
        + "Ergebnisses deckt die Wahl der Baualtersklasse ebenfalls nicht ab — "
        + "sie streut die U-Werte nur innerhalb der angesetzten Klasse."
        + "</div>"
        + '<table><tr><th style="width:44%">Baualtersklasse</th>'
        + '<th class="n">Norm-Heizlast</th><th class="n">spezifisch</th>'
        + "<th>gegen die angesetzte Klasse</th></tr>"
        + bp.stufen.slice().reverse().map(function (st) {
            const eig = st.eigene_klasse;
            return "<tr><td>" + (eig ? "<b>" : "") + e2(st.label)
              + (eig ? " (angesetzt)</b>" : "") + "</td>"
              + '<td class="n">' + kw(st.w) + "</td>"
              + '<td class="n">' + (st.spez === null ? "–" : f(st.spez, 1) + " W/m²") + "</td>"
              + "<td>" + (eig ? "–"
                  : (st.abweichung_prozent >= 0 ? "+" : "") + f(st.abweichung_prozent, 0)
                    + " Prozent") + "</td></tr>";
          }).join("")
        + "</table>"
        + '<p class="fussnote">Verändert ist ausschließlich das Baujahr, also die '
        + "U-Werte der Bauteile aus der Gebäudetypologie ("
        + f(bp.flaeche_typologie, 2) + " m² von " + f(bp.flaeche_huelle, 2)
        + " m² Hüllfläche). Flächen, Höhen, Volumen, Norm-Außentemperatur, "
        + "Luftdichtheit und Wärmebrückenzuschlag bleiben unverändert. Die "
        + "Jahreszahlen sind die Klassengrenzen der Quelle, nicht gewählt: "
        + e2(bp.quelle) + ". Höchstwert " + kw(hoch.w) + " in der Klasse "
        + e2(hoch.label) + ".</p>"
        + (bp.hinweise || []).map(function (x) {
            return '<p class="fussnote">' + e2(x) + "</p>";
          }).join("");
    }

    h += '<table><tr><th style="width:44%">Größe</th><th class="n">Wert</th>'
      + "<th>Verwendung</th></tr>";
    function z(g, w, v) { return "<tr><td>" + g + '</td><td class="n">' + w + "</td><td>"
      + v + "</td></tr>"; }
    h += z("Norm-Heizlast des Gebäudes, Raumheizung", "<b>" + kw(e.phi_gebaeude) + "</b>",
        "Grundlage der weiteren Wärmeerzeugerauslegung")
      + z("davon Transmission", kw(e.phi_T_gebaeude),
        f(e.phi_gebaeude ? e.phi_T_gebaeude / e.phi_gebaeude * 100 : 0, 0) + " Prozent")
      + z("davon Lüftung", kw(e.phi_V_gebaeude),
        f(e.phi_gebaeude ? e.phi_V_gebaeude / e.phi_gebaeude * 100 : 0, 0) + " Prozent")
      + (e.phi_RH_gebaeude > 0
        ? z("davon Aufheizleistung", kw(e.phi_RH_gebaeude),
            f(e.phi_gebaeude ? e.phi_RH_gebaeude / e.phi_gebaeude * 100 : 0, 0) + " Prozent")
        : "")
      + z("Summe der Raumheizlasten", kw(e.phi_raeume_summe),
        "Grundlage der raumweisen Heizflächenauslegung");
    if (wfl > 0 && Number.isFinite(e.spez_wohnflaeche)) {
      h += z("spezifische Heizlast", f(e.spez_wohnflaeche, 1) + " W/m²",
        "bezogen auf " + f(wfl, 2) + " m² Wohnfläche");
    }
    geschosse.forEach(function (g, i) {
      const jg = e.je_geschoss[g];
      if (!jg) return;
      // ACHTUNG: Gebäudeanteil, nicht Raumheizlast. Die interne Übertragung
      // zwischen Räumen hebt sich in der Gebäudebilanz auf.
      /* "43 W/m² je m² Geschossfläche" ohne die Geschossfläche selbst ist
         eine Zahl, die niemand nachrechnen kann. Sie steht deshalb in
         derselben Zeile. */
      h += z("Heizlast " + e2(g), kw(jg.phi_gebaeude),
        f(jg.A > 0 ? jg.phi_gebaeude / jg.A : 0, 0) + " W/m²"
        + (jg.A > 0 ? " bei " + f(jg.A, 2) + " m² Geschossfläche" : ""));
    });
    h += "</table>";

    /* 9,05 kW und 9,10 kW stehen zwei Zeilen auseinander. Die Erklärung
       gehört daneben und nicht fünf Seiten später. */
    const spreiz = e.phi_raeume_summe - e.phi_gebaeude;
    if (Math.abs(spreiz) >= 10) {
      h += '<p class="fussnote">Die Summe der Raumheizlasten liegt um '
        + f(Math.abs(spreiz), 0) + " W "
        + (spreiz > 0 ? "über" : "unter") + " der Heizlast des Gebäudes. Der "
        + "Unterschied ist der Wärmeaustausch zwischen Räumen verschiedener "
        + "Temperatur: jede Heizfläche muss ihn abdecken, in der Bilanz des ganzen "
        + "Gebäudes hebt er sich auf. Für den Wärmeerzeuger gilt die kleinere Zahl, "
        + "für die Heizkörper die größere.</p>";
    }

    const flaechen = geschosse.map(function (g) {
      return e.je_geschoss[g] ? e.je_geschoss[g].A : 0; });
    const gleich = flaechen.every(function (x) { return Math.abs(x - flaechen[0]) < 0.01; });
    if (wfl > 0 && Number.isFinite(e.spez_wohnflaeche)) {
      h += '<p class="fussnote">Die Geschossflächen sind Flächen innerhalb der '
        + "Umfassungswände" + (gleich ? " und in allen Geschossen gleich" : "")
        + ". Die spezifische Heizlast des "
        + "Gebäudes bezieht sich dagegen auf die Wohnfläche nach der "
        + "Wohnflächenberechnung, damit sie mit üblichen Kennwerten vergleichbar "
        + "bleibt.</p>";
    } else {
      /* Die Zahl selbst steht schon in der Kennzahlenreihe zwei Zeilen weiter
         oben, samt Bezugsfläche. Hier gehört nur hin, was dort nicht steht:
         worauf der Kennwert bezogen ist und womit er deshalb nicht
         vergleichbar ist.

         Gestrichen ist die Wertung „liegt üblicherweise über der Wohnfläche;
         der Kennwert fällt dadurch günstiger aus". Sie war eine Behauptung
         über eine Fläche, die diesem Bericht gar nicht vorliegt, und in
         welche Richtung der Kennwert danebenliegt, gibt die Datenlage nicht
         her. Es bleibt die Bezugsfläche und die Grenze der
         Vergleichbarkeit. */
      /* Oben steht „bezogen auf 280,76 m² Raumfläche", vier Zeilen tiefer
         „bei 182,60 m² Geschossfläche". Das ist dieselbe Fläche, einmal ganz
         und einmal je Geschoss; ohne den Halbsatz stehen sie wie zwei
         Bezugsgrößen nebeneinander. Er kommt nur, wenn die Geschossflächen
         sich auch wirklich zur Raumfläche summieren. */
      const summeG = flaechen.reduce(function (a, b) { return a + b; }, 0);
      const deckung = summeG > 0 && Number.isFinite(e.A_gesamt)
        && Math.abs(summeG - e.A_gesamt) < 0.05;
      h += '<p class="fussnote">Eine Wohnflächenangabe lag nicht vor. Der spezifische '
        + "Kennwert wird daher auf die Summe der beheizten Raumflächen von "
        + f(e.A_gesamt, 2) + " m² bezogen. Dieser Kennwert ist nicht unmittelbar "
        + "mit Heizlastkennwerten vergleichbar, die sich auf eine Wohnfläche nach "
        + "wohnflächenrechtlichen Regeln beziehen."
        + (deckung
          ? " Es ist dieselbe Fläche, die in dieser Tabelle je Geschoss "
            + "ausgewiesen ist."
          : "")
        + "</p>";
    }

    /* Überschrift nur mit Text darunter. Eine Überschrift, unter der nichts
       steht, ist schlimmer als ein fehlender Abschnitt: sie kündigt genau das
       an, was der Leser sucht, und liefert es nicht. */
    const punkte = (p.texte && p.texte.kap1_punkte) || null;
    /* Die Kernaussage traegt den Punkt; die Begruendung ist Zugabe. Wurde
       nur sie beanstandet (unbelegte Zahl), steht die Kernaussage trotzdem
       -- siehe modul_bewertung.js, uebernehmen(). */
    const gute = (Array.isArray(punkte) ? punkte : []).filter(function (x) {
      return x && String(x.kern || "").trim(); });
    if (gute.length) {
      h += "<h3>" + (gute.length === 3 ? "Die drei Punkte, auf die es ankommt"
        : "Worauf es ankommt") + "</h3>";
      h += gute.slice(0, 3).map(function (x, i) {
        const begr = String(x.text || "").trim();
        return '<p class="punkt"><b>' + (i + 1) + ". " + e2(x.kern || "") + "</b>"
          + (begr ? e2(begr) : "") + "</p>";
      }).join("");
    } else {
      offenerText("die drei Kernaussagen dieses Berichts");
    }
    return h;
  }

  /** Woher die tragenden Eingangsgrößen stammen — als Tatsachenaufstellung,
   *  ohne Güte- und Herkunftsvokabular, damit sie auch im Ausdruck steht.
   *  Liefert Zeilenpaare [Größe, Herkunft]; leer heißt: alles steht in den
   *  Unterlagen und es gibt nichts zu sagen. */
  function herkunftZeilen(p, e) {
    const z = [];
    const an = (p && p.annahmen) || {};
    const mq = (p && p.meta && p.meta.quellen) || {};

    /* Baujahr. Es entscheidet über sämtliche U-Werte der Typologie. */
    if (p.meta && p.meta.baujahr) {
      if (mq.baujahr) {
        z.push(["Baujahr " + e2(String(p.meta.baujahr)),
          "eingetragen nach " + String(mq.baujahr)]);
      } else if (an.baujahr) {
        const bl = an.baujahr.blatt ? " des Blattes „" + an.baujahr.blatt + "“" : "";
        z.push(["Baujahr " + String(p.meta.baujahr),
          "aus dem Datum" + bl + " abgeleitet, nicht am Gebäude erhoben"]);
      } else {
        z.push(["Baujahr " + String(p.meta.baujahr), "von Hand eingetragen"]);
      }
    }

    /* U-Werte. Gezählt werden die Bauteiltypen, die auch in der Rechnung
       vorkommen — dieselbe Auswahl wie in Kapitel „Bauteile und U-Werte". */
    const zeilen = bauteilZeilen(p, e);
    const benutzt = zeilen.filter(function (x) { return x.verwendet && !x.nur_innen; });
    const liste = benutzt.length ? benutzt
      : zeilen.filter(function (x) { return !x.nur_innen; });
    const typo = liste.filter(function (x) { return x.typ && x.typ.typologie === true; });
    if (liste.length && typo.length) {
      /* Die Baualtersklasse aus der Fundstelle, ohne den ganzen Satz. */
      let klasse = "";
      typo.some(function (x) {
        const m = String((x.typ && x.typ.quelle) || "").match(/Klasse\s+([0-9]{4}[^.,;]*)/);
        if (m) { klasse = m[1].trim(); return true; }
        return false;
      });
      z.push([typo.length === liste.length
          ? "U-Werte aller " + liste.length + " Bauteile"
          : "U-Werte von " + typo.length + " der " + liste.length + " Bauteile",
        "aus der Gebäudetypologie des Instituts Wohnen und Umwelt"
          + (klasse ? ", Baualtersklasse " + klasse : "")
          + " — am Gebäude wurde kein Bauteil geöffnet und kein U-Wert gemessen"]);
    }

    /* Lichte Höhen. Sie gehen in jedes Luftvolumen und in jede Wandfläche. */
    if (an.hoehe && an.hoehe.wert) {
      const gs = Array.isArray(an.hoehe.geschosse) ? an.hoehe.geschosse.join(", ") : "";
      z.push(["Lichte Raumhöhe " + f(zahl(an.hoehe.wert), 2) + " m",
        "im Plan nicht angeschrieben; einheitlich angesetzt"
          + (gs ? " für " + gs : "")]);
    }

    /* Fensterflächen. Der Anteil, der nicht aus abgelesenen Breiten kommt. */
    const fb = (p.fensterbefunde || []).find(function (x) {
      return x && x.id === "breiten_ungelesen"; });
    if (fb && fb.text) {
      const m = String(fb.text).match(/([0-9]+(?:[.,][0-9]+)?)\s*Prozent/);
      z.push(["Fensterflächen",
        m ? m[1].replace(".", ",") + " Prozent der Fensterfläche sind nicht aus "
              + "abgelesenen Fensterbreiten gebildet, sondern über den "
              + "Fensterflächenanteil der Raumart angesetzt"
          : "teilweise über den Fensterflächenanteil der Raumart angesetzt"]);
    }

    /* MINDESTLUFTWECHSEL FUER RAUMARTEN OHNE EIGENE ZEILE.
     *
     * GEMESSEN am 26.08.2026 an "1754 BA 2018-03-13" (Moebelwerkstatt mit
     * Showroom): saemtliche Raeume rechneten mit n_min = 0,5 1/h -- auch
     * Werkstatt, Verkauf, Lager und WC. Die Datei sagt fuer diese Raumarten
     * selbst, dass die Zeile der Normtabelle nicht zugeordnet ist
     * (n_min_belegt: false); im Bericht stand davon nichts. Erfunden wird
     * hier keine Zahl -- gesagt wird, dass fuer diese Raumarten der Wert der
     * Daueraufenthaltsraeume angesetzt ist. */
    const DRk = (typeof window !== "undefined" && window.DATEN_RAUMARTEN) || null;
    if (DRk && DRk.RAUMARTEN) {
      const arten = {};
      ((e && e.raeume) || []).forEach(function (r) { if (r.art) arten[r.art] = true; });
      const ohneZeile = Object.keys(arten).filter(function (k) {
        const a = DRk.RAUMARTEN[k];
        return a && a.n_min_belegt === false;
      }).map(function (k) { return DRk.RAUMARTEN[k].label; });
      if (ohneZeile.length) {
        z.push(["Mindestluftwechsel 0,5 1/h",
          "für " + ohneZeile.join(", ") + " führt die Normtabelle keine eigene "
            + "Zeile; angesetzt ist der Wert der Daueraufenthaltsräume"]);
      }
    }

    /* AUSSENWANDLAENGE JE RAUM: GEMESSEN ODER VERTEILT?
     *
     * GEMESSEN am 26.08.2026 an "BV 2-0887 Ziolkowski", zwei Laeufe
     * derselben Datei mit demselben Bau: GAST/ARBEITEN 11,72 → 21,61 m²
     * Aussenwand, SCHLAFEN 32,84 → 22,45 m², Raumheizlasten 409 → 517 W und
     * 805 → 697 W. Die Gebaeudesumme blieb auf 2,5 % stabil -- verteilt wird
     * ein hochgerechneter Geschossumfang, und wie er sich auf die Raeume
     * verteilt, haengt an der Lesung. Genau diese Spalte nennt der Bericht
     * "massgebend fuer die raumweise Heizflaechenauslegung". Wer sie so
     * benutzt, muss wissen, woher sie kommt. */
    const ua = (p.umfangsabgleich || []).filter(function (x) {
      return x && x.art === "hochrechnung"; });
    if (ua.length) {
      const gs = ua.map(function (x) { return String(x.geschoss || ""); })
        .filter(Boolean);
      z.push(["Außenwandlänge je Raum",
        "für " + (gs.length ? gs.join(", ") : "die betroffenen Geschosse")
          + " ist der Geschossumfang aus den Raumflächen hochgerechnet und "
          + "auf die Räume verteilt, nicht je Raum am Plan abgegriffen; die "
          + "Summe je Geschoss trägt, die einzelne Raumzahl ist eine "
          + "Aufteilung"]);
    }

    /* Raumflächen ohne angeschriebenen Stempel. */
    const raeume = (p.raeume || []);
    const ohneStempel = raeume.filter(function (r) {
      const hk = r && r.herkunft;
      return hk && hk.flaeche_gelesen === false;
    }).length;
    if (raeume.length && ohneStempel > 0) {
      z.push([ohneStempel === raeume.length
          ? "Grundflächen aller " + raeume.length + " Räume"
          : "Grundflächen von " + ohneStempel + " der " + raeume.length + " Räume",
        "im Plan nicht als Zahl angeschrieben; aus Maßen des Blattes gebildet"]);
    }
    return z;
  }

  /* ---------------- 2 Objekt und Datengrundlage ---------------- */
  function kapitel2(p, e, K, U, druck) {
    let h = "";
    const einl = text(p, "kap2_einleitung");
    if (einl) h += "<p>" + e2(einl) + "</p>";
    else offenerText("beschreibender Absatz zu Gebäudetyp und Bauart");

    const q = (p.meta && p.meta.quellen) || {};
    const rows = [];
    const fehlt = [];
    /* Im Druck ohne Quellenspalte: die Werte sind Eingangsdaten der Rechnung
       und bleiben stehen, ihre Herkunft und Einstufung steht intern. Ein
       angenommenes Baujahr steht damit als Wert da, nicht als Tatsachen-
       behauptung über eine Unterlage — der Bericht sagt in diesem Kapitel,
       dass dies die Kenngrößen sind, MIT denen gerechnet wurde. */
    function z(kg, wert, quelle) {
      if (!wert) { fehlt.push(kg); return; }
      if (druck) {
        rows.push("<tr><td>" + e2(kg) + "</td><td>" + wert + "</td></tr>");
        return;
      }
      rows.push("<tr><td>" + e2(kg) + "</td><td>" + wert + "</td><td>"
        + (quelle ? e2(quelle) : '<span style="color:#B00">Quelle nicht angegeben</span>')
        + "</td></tr>");
    }
    z("Baujahr, letzte Modernisierung",
      [p.meta.baujahr, p.meta.modernisierung].filter(Boolean).map(e2).join(" / "),
      q.baujahr);
    z("Gebäudetyp", e2(p.meta.gebaeudetyp), q.gebaeudetyp);
    /* AUSSENMASSE AUS DER EINGABE JE GESCHOSS.
     *
     * Gemessen am 24.08.2026: der Bearbeiter trägt in der Rückfrage zu den
     * Außenwänden 8,00 × 12,50 m ein und tippt unter „Woher stammt die
     * Zahl?" seine Quelle — und der Bericht führte „Außenmaße" trotzdem
     * unter den fehlenden Kenngrößen; die Quelle stand in keiner Fassung.
     * Die Maße liegen in p.geschossmasse je Geschoss. Steht kein
     * meta.aussenmasse von Hand da, kommen sie von dort — samt der
     * eingetippten Quelle in der internen Spalte. */
    let amWert = e2(p.meta.aussenmasse);
    let amQuelle = q.aussenmasse;
    if (!p.meta.aussenmasse) {
      const gm = p.geschossmasse || {};
      const gs = Object.keys(gm).filter(function (g) {
        return zahl(gm[g] && gm[g].breite_m, 0) > 0
          && zahl(gm[g] && gm[g].tiefe_m, 0) > 0;
      });
      if (gs.length) {
        amWert = gs.map(function (g) {
          return e2(g) + " " + f(zahl(gm[g].breite_m), 2) + " × "
            + f(zahl(gm[g].tiefe_m), 2) + " m";
        }).join(" · ");
        const quellen = [];
        gs.forEach(function (g) {
          const qq = gm[g].quelle && String(gm[g].quelle).trim();
          if (qq && quellen.indexOf(qq) < 0) quellen.push(qq);
        });
        amQuelle = quellen.length
          ? "je Geschoss eingetragen; laut Bearbeiter: „"
            + quellen.join("“, „") + "“"
          : null;
      }
    }
    z("Außenmaße", amWert, amQuelle);
    /* Der Rückfall auf den Bauteilnamen ist hier ersatzlos entfallen. Er
       druckte eine Zeile, die in der Spalte Wert eine Bezeichnung und in der
       Spalte Quelle den Satz führte, dass ein Wandaufbau gar nicht erfasst
       wurde. Eine Zeile, die als einzige Auskunft ihr eigenes Fehlen meldet,
       gehört nicht in die Tabelle, sondern in die Liste der fehlenden
       Kenngrößen darunter. Genau dort landet sie jetzt, weil z() jeden leeren
       Wert dorthin schiebt. */
    z("Wandaufbau", e2(p.meta.wandaufbau || ""), q.wandaufbau);
    z("Geschosshöhe", e2(p.meta.geschosshoehe), q.geschosshoehe);
    z("Drempel, Dachneigung", e2(p.meta.dach), q.dach);
    z("Oberer Abschluss", e2(p.meta.oberer_abschluss), q.oberer_abschluss);
    z("Wohnfläche", p.meta.wohnflaeche
      ? e2(p.meta.wohnflaeche_teile ? p.meta.wohnflaeche_teile + " = " : "")
        + f(zahl(p.meta.wohnflaeche), 2) + " m²" : "", p.meta.wohnflaeche_quelle);
    z("Gebäudevolumen", p.meta.volumen ? "rd. " + e2(p.meta.volumen) : "", q.volumen);
    if (rows.length) {
      h += druck
        ? '<table><tr><th style="width:30%">Kenngröße</th><th>Wert</th></tr>'
          + rows.join("") + "</table>"
        : '<table><tr><th style="width:30%">Kenngröße</th><th style="width:36%">Wert</th>'
          + "<th>Quelle</th></tr>" + rows.join("") + "</table>";
    }
    /* Eine Kenngröße, die einfach fehlt, sieht aus wie ein vergessener Punkt.
       Wer den Bericht bezahlt hat, soll lesen können, was nicht erfasst wurde
       und ob das für sein Ergebnis eine Rolle spielt. Die Aufzählung des
       Fehlenden ist eine Aussage über die Datengrundlage und steht nur
       intern; der Wohnflächen-Absatz bleibt auch im Druck, weil ohne ihn die
       spezifische Heizlast falsch gelesen wird (Bezugsfläche). */
    const wflFehlt = fehlt.indexOf("Wohnfläche") >= 0;
    const rest = druck ? [] : fehlt.filter(function (x) { return x !== "Wohnfläche"; });
    if (rest.length) {
      h += "<p>Zu folgenden Kenngrößen liegt keine Angabe vor: "
        + e2(rest.join(" · ")) + ". Sie beschreiben das Gebäude und gehen nicht in "
        + "die Heizlastrechnung ein; gerechnet wird mit den Raummaßen und "
        + "Bauteilflächen aus Abschnitt " + K.raeume + " und der Anlage. Ihr Fehlen "
        + "ändert das Ergebnis nicht, macht den Bericht aber schwerer "
        + "nachvollziehbar.</p>";
    }
    if (wflFehlt) {
      /* Der Vorbehalt zur Vergleichbarkeit steht vollständig in Abschnitt
         „Ergebnis", unmittelbar unter dem Kennwert, auf den er sich bezieht.
         Hier gehört nur hin, was dieses Kapitel angeht: dass die Angabe
         fehlt und dass sie nicht in die Rechnung eingeht. */
      h += "<p>Eine Wohnflächenangabe liegt nicht vor. Sie geht nicht in die "
        + "Berechnung ein; der spezifische Kennwert in Abschnitt " + K.ergebnis
        + " ist deshalb auf die Summe der beheizten Raumflächen bezogen.</p>";
    }

    /* Das Kapitel heißt „Objekt und Datengrundlage" und bestand bisher aus dem
       Objektteil allein. Fehlten die beschreibenden Kenngrößen, blieben zwei
       Tabellenzeilen stehen und darunter eine leere Seite, obwohl die
       eigentliche Datengrundlage die ganze Zeit vorlag: die Räume, die
       Bauteile, die Flächen, mit denen gerechnet wird. Die stehen jetzt hier,
       und zwar gezählt aus dem Rechenergebnis, nicht aus einer zweiten
       Erfassung. Sie beschreiben nicht das Gebäude, sondern das Modell. */
    let huZahl = 0, inZahl = 0, huF = 0, inF = 0;
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat === "innen") { inZahl++; inF += zahl(bt.A, 0); }
        else { huZahl++; huF += zahl(bt.A, 0); }
      });
    });
    if (huZahl > 0) {
      h += "<h3>" + U(K.objekt) + " Woraus gerechnet wird</h3>"
        + "<p>Nicht die Kenngrößen oben tragen das Ergebnis, sondern das Modell "
        + "darunter. Es umfasst:</p>";
      const gz = (geschossReihenfolge(e) || []).length;
      const mz = [];
      mz.push("<tr><td>Beheizte Räume</td><td>" + anzahlWort((p.raeume || []).length,
          "Raum", "Räume")
        + (gz ? " in " + anzahlWort(gz, "Geschoss", "Geschossen") : "")
        + "</td><td>je Raum eine eigene Heizlast, siehe Abschnitt " + K.raeume
        + "</td></tr>");
      mz.push("<tr><td>Unbeheizte Bereiche</td><td>"
        + ((p.zonen || []).length
          ? e2((p.zonen || []).map(function (z) { return z.name; }).join(" · "))
          : "keine angelegt")
        + "</td><td>" + ((p.zonen || []).length
          /* Nicht jede Zone wird bilanziert: eine über die Lage nach
             DIN/TS 12831-1 Tabelle 5 oder über f_1 vorgegebene Temperatur ist
             keine Bilanz. Diese Zelle nennt deshalb keine Methode — sie sagt,
             dass der Bereich eine eigene Grenztemperatur hat. Wie sie zustande
             kam, steht in Abschnitt 6, wo Platz für die Unterscheidung ist. */
          ? "eigene Grenztemperatur, im Berechnungsmodell ermittelt bzw. hinterlegt"
            + (K.zonen ? ", siehe Abschnitt " + K.zonen : "")
          : "alle Bauteile grenzen an Außenluft, Erdreich oder beheizte Räume")
        + "</td></tr>");
      mz.push("<tr><td>Bauteile gegen außen, unbeheizt oder Erdreich</td><td>"
        + anzahlWort(huZahl, "Zeile", "Zeilen") + " mit " + f(huF, 1)
        + " m²</td><td>tragen den Transmissionsanteil</td></tr>");
      if (inZahl > 0) {
        mz.push("<tr><td>Bauteile zwischen Räumen</td><td>"
          + anzahlWort(inZahl, "Zeile", "Zeilen") + " mit " + f(inF, 1)
          + " m²</td><td>wirken auf die Raumheizlast, in der Gebäudebilanz heben "
          + "sie sich auf</td></tr>");
      }
      /* GEZÄHLT WIRD, WAS IM BERICHT AUCH STEHT.
         Hier stand die Zahl der angelegten Bauteiltypen — im Beispiel sechs —,
         während Abschnitt „Bauteile und U-Werte" vier Zeilen führt: zwei Typen
         waren angelegt, aber an keinem Raum verwendet. Der Verweis „siehe
         Abschnitt 5" zeigte damit auf eine kürzere Liste als die Zahl davor.
         Gezählt werden deshalb dieselben Typen, die dort erscheinen; die
         Auswahlregel ist die von kapitel5() und darf nicht auseinanderlaufen.
         An der Rechnung ändert das nichts: unbenutzte Typen tragen keinen
         Wärmestrom. */
      const btZ = bauteilZeilen(p, e);
      const btVerw = btZ.filter(function (z) { return z.verwendet && !z.nur_innen; });
      const btAnz = btVerw.length
        ? btVerw.length
        : btZ.filter(function (z) { return !z.nur_innen; }).length;
      mz.push("<tr><td>Bauteiltypen</td><td>"
        + anzahlWort(btAnz, "Typ", "Typen")
        + "</td><td>je Typ ein U-Wert, siehe Abschnitt " + K.bauteile + "</td></tr>");
      h += '<table><tr><th style="width:30%">Bestandteil</th><th style="width:36%">Umfang</th>'
        + "<th>Wofür er zählt</th></tr>" + mz.join("") + "</table>";
      /* Der Umfang allein sagt nichts über die Belastbarkeit. Die eine Zahl,
         die das tut, steht sonst erst in Kapitel 8 und 10. NUR INTERN. */
      const an2 = druck ? null : annahmeAnteil(e);
      if (an2) {
        h += '<p class="fussnote">Von diesem Modell beruhen ' + f(an2.prozent, 0)
          + " Prozent des Transmissionswärmestroms auf Bauteilen, deren Aufbau "
          + "angenommen und nicht belegt ist. Welche das sind und was daraus folgt, "
          + "steht in Abschnitt " + K.offen + " und Abschnitt " + K.konfidenz
          + ".</p>";
      }
    }

    /* WOHER DIE EINGANGSWERTE STAMMEN — AUCH IM AUSDRUCK.
     *
     * GEMESSEN am 26.08.2026 an "Hasenberg 10": im Kundenbericht kamen
     * "Typologie", "IWU", "Annahme", "angenommen" und "Rueckfallwert" je
     * NULL Mal vor -- waehrend 100 % der U-Werte aus der IWU-Typologie
     * stammten (die Aussenwand allein 55,7 % des Transmissionsanteils) und
     * die lichte Hoehe durchgaengig mit 2,60 m angesetzt war. Der Leser
     * konnte dem Papier nicht entnehmen, dass keiner dieser Werte am
     * Gebaeude erhoben wurde. Am selben Tag an "1754 BA 2018-03-13": das
     * Titelblatt nannte "Baujahr 2018" ohne jeden Hinweis darauf, dass das
     * das Datum des Blattes ist.
     *
     * WARUM DAS KEIN WIDERSPRUCH ZUR DRUCKREINHEIT IST (Vorgabe vom
     * 24.08.2026): verboten ist die GUETEAUSSAGE -- wie belastbar, wie
     * sicher, welche Klasse. Hier steht keine. Hier steht, WORAUS gerechnet
     * wurde: eine Tatsache ueber die Rechnung, so nachpruefbar wie jede
     * Flaeche. Der Wortlaut kommt ohne das gesperrte Vokabular aus, und
     * druckSuche laeuft in Schritt 5b des Baus darueber. */
    const hk = herkunftZeilen(p, e);
    if (hk.length) {
      h += "<h3>" + U(K.objekt) + " Woraus gerechnet wurde</h3>"
        + "<p>Nicht jede Zahl dieser Berechnung steht in den Unterlagen. Die "
        + "folgende Aufstellung nennt für die tragenden Eingangsgrößen, woher "
        + "der gerechnete Wert stammt.</p>"
        + '<table><tr><th style="width:30%">Eingangsgröße</th><th>Woher der '
        + "gerechnete Wert stammt</th></tr>"
        + hk.map(function (z) {
            return "<tr><td>" + e2(z[0]) + "</td><td>" + e2(z[1]) + "</td></tr>";
          }).join("") + "</table>";
    }

    // 2.3 nur mit bestandenem Fremdbeleg
    const bestanden = (p.abgleiche || []).filter(function (a) {
      return a.status ? a.status === "bestanden" : true; });
    /* Jede Unterüberschrift erst dann, wenn feststeht, dass darunter auch
       etwas steht. Der Zähler U() darf deshalb nicht vorher laufen, sonst
       fehlt in der Nummerierung eine Ziffer. */
    /* Beide Unterabschnitte sind Güteaussagen über die Datengrundlage
       („warum belastbar", „was nicht belegt ist") und stehen NUR INTERN. */
    const tGeo = !druck && bestanden.length ? text(p, "kap2_geometrie") : null;
    if (tGeo) {
      h += "<h3>" + U(K.objekt) + " Warum die Geometrie belastbar ist</h3>"
        + "<p>" + e2(tGeo) + "</p>";
    } else if (!druck && bestanden.length) {
      offenerText("Bewertung der " + bestanden.length + " Fremdbeleg-Abgleiche");
    }

    const ohneAufmass = !druck && jaNein(p.meta.aufmass_vor_ort) !== true;
    const t4 = druck ? null : text(p, "kap2_nicht_belegt");
    if (ohneAufmass || t4) {
      h += "<h3>" + U(K.objekt) + " Was nicht aus Unterlagen stammt</h3>";
      if (ohneAufmass) h += "<p>Ein Aufmaß vor Ort hat nicht stattgefunden.</p>";
      if (t4) h += "<p>" + e2(t4) + "</p>";
      else offenerText("Prosa-Aufzählung der Konfidenz-C-Punkte");
    }
    return h;
  }

  /* ---------------- 3 Planunterlagen ---------------- */
  function planKapitel(nr, U, ueberschrift, druck) {
    const A = window.App, p = A.p;
    const bilder = (p.plan && p.plan.bilder) || [];
    /* NACH EINER WIEDERHERSTELLUNG KANN DAS BLATT FEHLEN, DER BERICHT DARF
       ES NICHT VERSCHWEIGEN. Befund Hasenberg 25.08.2026: nach einem
       Tab-Verlust stellte die Sicherung alles wieder her — nur die
       Abbildungen nicht (sie sind der große Brocken und bleiben mit Absicht
       draußen, siehe projektFuerAblage). Der Bericht ließ daraufhin das
       ganze Kapitel Planunterlagen stillschweigend weg. Jetzt: das Kapitel
       bleibt, es zählt die ausgewerteten Blätter auf und sagt ausdrücklich,
       dass die Abbildungen bei Berichtserstellung nicht mehr vorlagen. */
    const seitenOhneBild = ((p.plan && p.plan.seiten) || []).filter(function (s) {
      return s && s.nurDaten && s.verwenden !== false;
    });
    const nutzbar = bilder.filter(function (b) {
      return b && b.abbildung && !b.abbildung_entfallen;
    });
    const entfallen = bilder.length - nutzbar.length;
    if (!bilder.length && !seitenOhneBild.length) return "";
    /* AUFWAND DER AUSWERTUNG — NUR INTERN.
       Vier der fuenf Pruefprotokolle vom 26.08.2026 vermissen die Endsumme
       im Bericht. Sie gehoert zur Nachvollziehbarkeit des Vorgangs, nicht in
       die Unterlage fuer den Auftraggeber (Sebastians Vorgabe zur
       Druckfassung). Gedruckt wird deshalb ausschliesslich intern, und zwar
       dort, wo auch steht, welche Blaetter ausgewertet wurden. */
    const vb = !druck && p.verbrauch && p.verbrauch.lesungen > 0 ? p.verbrauch : null;
    const befunde = p.planbefunde || [];
    const g = p.plangebaeude || null;
    let n = 0;
    let h = ueberschrift(nr, "Planunterlagen", "kap-plan")
      + (nutzbar.length
        ? "<p>Grundlage der Berechnung sind die nachfolgend abgebildeten Planunterlagen. "
          + "Sie wurden für diesen Bericht mit den Maßen und Flächen beschriftet, die in die "
          + "Rechnung eingegangen sind. <b>Die grünen Eintragungen stammen aus dieser "
          + "Auswertung, alles Übrige ist Originalbestand der Zeichnung.</b>"
          + (nutzbar.some(function (b) { return b.aufbereitet; })
             ? " Die Zeichnungen sind Blaupausen; sie wurden für diesen Bericht im Kontrast "
               + "aufbereitet." : "")
        : "<p>Grundlage der Berechnung sind die nachfolgend aufgeführten Planunterlagen.")
      + "</p>";

    if (!nutzbar.length || entfallen > 0) {
      const namen = seitenOhneBild.map(function (s) {
        return s.bezeichnung || s.name || s.datei || "";
      }).filter(Boolean);
      const nl = namen.length
        ? " Ausgewertet wurden: " + namen.map(function (x) {
            return "„" + e2(x) + "“"; }).join(", ") + "."
        : "";
      /* SO AUSFÜHRLICH WIE NÖTIG (Sebastian, Punkt 20). Im Ausdruck zählt
         die Tatsache: welche Blätter ausgewertet wurden und dass die
         Zeichnungen nicht beiliegen. Woher der Stand stammt und was zu tun
         ist, damit die Abbildungen wieder mitkommen, ist Werkstattbericht
         und bleibt in der internen Fassung. */
      h += druck
        ? '<div class="warn"><b>Die Planabbildungen sind diesem Bericht nicht '
          + "beigefügt.</b>" + nl + "</div>"
        : '<div class="warn"><b>Die Planabbildungen lagen bei Erstellung dieses '
          + "Berichts nicht mehr vor.</b> Dieser Stand wurde aus dem Zwischenspeicher "
          + "wiederhergestellt; die Auswertungsergebnisse der Blätter (Räume, Maße, "
          + "Blattköpfe) sind vollständig erhalten, die Abbildungen selbst sind es "
          + "nicht und sind dem Bericht deshalb nicht beigefügt." + nl
          + " Für einen Bericht mit Abbildungen die Blätter erneut ablegen.</div>";
    }

    h += nutzbar.map(function (b) {
      n++;
      const fl = (b.raeume || []).length
        ? " Ausgewertet wurden " + b.raeume.length + " Räume mit zusammen "
          + f((b.raeume || []).reduce(function (s, r) { return s + r.flaeche; }, 0), 2)
          + " m²." : "";
      const mst = b.massstab_m_je_px
        ? " Der Maßstab wurde an einer bekannten Maßkette gesetzt." : "";
      const bu = text(p, "kap3_bild." + n);
      return '<div style="margin:4mm 0 6mm">'
        + '<img src="data:image/jpeg;base64,' + b.abbildung
        + '" style="width:100%;border:.4pt solid #C8CCC9" alt="">'
        + '<p class="klein" style="margin-top:1.5mm"><b>Abbildung ' + n + ".</b> "
        + e2(b.bezeichnung) + "." + fl + mst + (bu ? " " + e2(bu) : "") + "</p>"
        + (bu ? "" : offenerText("Bildunterschrift Abbildung " + n)) + "</div>";
    }).join("");

    /* 3.1 UND 3.2 STEHEN NUR INTERN (Sebastian, Punkte 16 und 20).
     *
     * Beide Tabellen sind Leseergebnisse der Planauswertung, keine Eingabe
     * und kein Ergebnis der Rechnung: sie tragen „vermutlich", „ca." und
     * „in etwa", 3.2 zusätzlich eine Spalte Sicherheit. Im Ausdruck stellten
     * sie sich gegen die eigene Berechnung — 3.1 nannte als Geschosse
     * „Erdgeschoss (lt. Plankopf); weitere Geschosse nicht dargestellt",
     * während der Bericht EG und OG rechnet, und führte den Raum „Abst." als
     * ggf. unbeheizt, obwohl er in der Raumtabelle mit 15 °C beheizt steht;
     * 3.2 hielt einen Keller für unwahrscheinlich, während Abschnitt 6
     * 182,6 m² Kellerdecke gegen den unbeheizten Keller rechnet.
     *
     * Kein Wert wird dadurch verändert: die Blätter, aus denen gerechnet
     * wurde, stehen weiter oben in diesem Kapitel. Intern bleiben beide
     * Tabellen vollständig, denn dort dokumentieren sie, wie der Plan
     * gelesen wurde. */
    if (g && !druck) {
      h += "<h3>" + U(nr) + " Was den Unterlagen zu entnehmen ist</h3>"
        + '<table><tr><th style="width:32%">Angabe</th><th>Aus dem Plan</th></tr>'
        + (g.geschosse ? "<tr><td>Geschosse</td><td>" + e2(g.geschosse) + "</td></tr>" : "")
        + (g.bauweise ? "<tr><td>Bauweise</td><td>" + e2(g.bauweise) + "</td></tr>" : "")
        + (g.dachform ? "<tr><td>Dachform</td><td>" + e2(g.dachform) + "</td></tr>" : "")
        + ((g.unbeheizte_bereiche || []).length
            ? "<tr><td>Unbeheizte Bereiche</td><td>"
              + e2(g.unbeheizte_bereiche.join(", ")) + "</td></tr>" : "")
        + "</table>";
    }
    if (befunde.length && !druck) {
      h += "<h3>" + U(nr) + " Aus den Unterlagen abgeleitet</h3>"
        + "<p>Die folgenden Angaben stehen nicht als Zahl in der Zeichnung, sondern "
        + "folgen aus ihr. Die Herleitung ist jeweils genannt, damit sie nachvollziehbar "
        + "bleibt.</p>"
        + '<table><tr><th style="width:20%">Thema</th><th style="width:26%">Ergibt sich</th>'
        + '<th>Herleitung</th><th style="width:13%">Sicherheit</th></tr>'
        + befunde.map(function (x) {
            return "<tr><td>" + e2(x.thema) + "</td><td><b>" + e2(x.aussage)
              + "</b></td><td>" + e2(x.herleitung) + "</td><td>"
              + e2(x.konfidenz || "unsicher") + "</td></tr>";
          }).join("") + "</table>";
    }
    /* Beide Kästen sind Aussagen über die Güte der Unterlagen: NUR INTERN. */
    if (!druck && p.planFreigabeGrund) {
      h += '<div class="warn"><b>Hinweis zur Eignung der Unterlagen.</b> Die maschinelle '
        + "Eignungsprüfung dieser Unterlage wurde nicht bestanden. Die Bearbeitung "
        + "erfolgte dennoch, begründet wie folgt: " + e2(p.planFreigabeGrund) + "</div>";
    }
    if (!druck && (p.planluecken || []).length) {
      h += '<div class="warn"><b>In den Unterlagen nicht enthalten</b> und deshalb ergänzt '
        + 'oder angenommen:<ul style="margin:2mm 0 0">'
        + p.planluecken.map(function (x) { return "<li>" + e2(x) + "</li>"; }).join("")
        + "</ul></div>";
    }
    if (vb) {
      h += '<p class="klein">Aufwand der Auswertung: '
        + anzahlWort(vb.lesungen, "Lesung", "Lesungen") + " in "
        + anzahlWort((vb.laeufe || []).length, "Lauf", "Läufen")
        + ", zusammen rund " + f(zahl(vb.kosten, 0), 2)
        + " US-Dollar Modellkosten.</p>";
    }
    return h;
  }

  /* ---------------- 4 Berechnungsgrundlagen ---------------- */
  function kapitel4(p, e, K, U, wbAnteil, zeilen, druck) {
    const DR = window.DATEN_RAUMARTEN || { RAUMARTEN: {} };
    let h = "<h3>" + U(K.grundlagen) + " Verfahren</h3>"
      + "<p>Die Norm-Heizlast wird raumweise nach DIN EN 12831-1:2017-09 in Verbindung mit "
      + "DIN/TS 12831-1:2020-04 berechnet. Die Raumheizlast setzt sich zusammen aus:</p>"
      + '<table><tr><th style="width:38%">Größe</th><th>Berechnung</th></tr>'
      + "<tr><td>Norm-Heizlast eines Raums</td><td>&Phi;<sub>HL,i</sub> = &Phi;<sub>T,i</sub> "
      + "+ &Phi;<sub>V,i</sub> + &Phi;<sub>RH,i</sub></td></tr>"
      + "<tr><td>Transmission</td><td>&Phi;<sub>T,i</sub> = &sum; A<sub>k</sub> · "
      + "(U<sub>k</sub> + &Delta;U<sub>WB</sub>) · (&theta;<sub>int,i</sub> &minus; "
      + "&theta;<sub>j,k</sub>)</td></tr>"
      + "<tr><td>Lüftung</td><td>&Phi;<sub>V,i</sub> = 0,34 · V&#775;<sub>i</sub> · "
      + "(&theta;<sub>int,i</sub> &minus; &theta;<sub>e</sub>)</td></tr>"
      + "<tr><td>maßgebender Volumenstrom</td><td>V&#775;<sub>i</sub> = max ( n<sub>min</sub> · "
      + "V<sub>i</sub> ; 2 · V<sub>i</sub> · n<sub>50</sub> · e<sub>i</sub> · &epsilon;<sub>i</sub> )"
      + "</td></tr>"
      /* Die beiden letzten Zeilen nur, wenn der Fall im Projekt vorkommt. Eine
         Formel für erdberührte Bauteile in einem Bericht ohne ein einziges
         erdberührtes Bauteil sieht aus, als sei sie angewandt worden. */
      + (hatErdreichBauteil(e)
        ? "<tr><td>erdberührte Bauteile</td><td>H<sub>T,ig</sub> = f<sub>g1</sub> · "
          + "f<sub>g2</sub> · &sum; (A<sub>k</sub> · U<sub>equiv,k</sub>) · G<sub>w</sub>, "
          + "mit f<sub>g2</sub> = (&theta;<sub>int</sub> &minus; &theta;<sub>e,m</sub>) / "
          + "(&theta;<sub>int</sub> &minus; &theta;<sub>e</sub>)</td></tr>"
        : "")
      /* Die Bilanzformel nur dann, wenn der Rechengang sie auch benutzt hat.
         Vorher stand sie bei jedem Projekt mit unbeheiztem Bereich und
         behauptete eine Herleitung, die ohne eigene Hüllbauteile gar nicht
         möglich ist. */
      + ((p.zonen || []).length
        ? (zonenBilanziert(p)
          ? "<tr><td>unbeheizte Bereiche</td><td>&theta;<sub>u</sub> = &sum; (H<sub>n</sub> · "
            + "&theta;<sub>n</sub>) / &sum; H<sub>n</sub> (stationäre Wärmebilanz)</td></tr>"
          : "<tr><td>unbeheizte Bereiche</td><td>&theta;<sub>u</sub>: die im "
            + "Berechnungsmodell ermittelte bzw. hinterlegte Grenztemperatur des "
            + "Bereichs</td></tr>")
        : "")
      + "</table>";

    /* 4.2 Klima und Innentemperaturen */
    const DK = window.DATEN_KLIMA;
    const ort = DK ? DK.findePlz(p.meta.plz) : null;
    /* Steht im Projekt keine Quelle, kommt der Wert aus der mitgelieferten
       Klimatabelle. Das gehört dazugeschrieben, sonst liest es sich, als habe
       jemand die Fundstelle geprüft. Die Selbstprüfung nennt diesen Fall
       zugleich als fehlende Pflichtangabe; ohne den Zusatz widersprächen sich
       die beiden Kapitel. */
    /* Zur Zuordnungseinheit. Der Einwand, die Norm ordne die
       Norm-Außentemperatur der Gemeinde und nicht der Postleitzahl zu, ist an
       zwei Fachveröffentlichungen zu dieser Norm nachgesehen worden. Beide
       beschreiben den Anhang übereinstimmend als Liste von Postleitgebieten:
         Markert, Praxis Heizlastberechnung (Kommentar zur DIN EN 12831-1),
         Tabelle 9: "In DIN/TS 12831-1:2020-04 sind die meteorologischen Werte
         einem elektronischen Anhang zu entnehmen. In diesem elektronischen
         Anhang sind alle 8199 deutschen Postleitgebiete mit PLZ, Ortsname,
         der Außentemperatur, der mittleren Außentemperatur und der realen
         Höhe des Referenzortes aufgenommen."
         Jagnow/Wolff, Manuskript Recknagel/Sprenger 2020: "Der Nationale
         Anhang enthält für Deutschland tabellarisch Werte der
         Referenzaußentemperatur theta_e,Ref für 8199 Orte, sortiert nach
         Postleitzahlen."
       Beides sind Wiedergaben, nicht der Normtext. Der Bericht nennt deshalb
       den Befund samt Herkunft und verlangt weiter die Bestätigung am
       Normtext, statt eine der beiden Zuordnungen zu behaupten. */
    /* Der Vorbehalt gilt auch dann, wenn die Quelle aus dem Projekt kommt:
       auch dort steht in aller Regel eine Klimakarte und nicht der Normtext.
       Wer den Wert wirklich am Normtext geprüft hat, hält das im Projekt
       fest; nur dann entfällt der Zusatz. */
    const kqBasis = (p.klima && p.klima.quelle) || (ort && ort.quelle) || null;
    const normGeprueft = !!(p.klima && p.klima.normtext_geprueft);
    /* Die Begründung steht als Fußnote unter der Tabelle, nicht in der Zelle.
       Sieben Zeilen Fließtext in einer Spalte „Fundstelle" drücken die ganze
       Tabelle auseinander und man findet die Randbedingung daneben nicht
       mehr. */
    const kq = kqBasis
      ? kqBasis + (normGeprueft
        ? ". Gegen den Normtext geprüft."
        : ". Zugeordnet über die Postleitzahl, siehe Fußnote.")
      : null;
    /* Im Druck ohne Fundstellenspalte: Sebastians Vorgabe, keine Quellen-
       und Herkunftsangaben im Ausdruck. Die Werte selbst sind Eingangs-
       größen der Rechnung und bleiben vollständig stehen; die beiden
       Zellen mit Handlungswissen (ε, Φ_RH) wandern in Fußnoten unter der
       Tabelle, damit nichts Fachliches verloren geht. */
    h += "<h3>" + U(K.grundlagen)
      + " Klima, Temperaturen und weitere Randbedingungen</h3>"
      + (druck
        ? '<table><tr><th style="width:60%">Größe</th><th class="n">Wert</th></tr>'
        : '<table><tr><th style="width:40%">Größe</th><th class="n">Wert</th>'
          + "<th>Fundstelle</th></tr>");
    function zz(g, w, q) {
      if (druck) return "<tr><td>" + g + '</td><td class="n">' + w + "</td></tr>";
      return "<tr><td>" + g + '</td><td class="n">' + w + "</td><td>"
        + (q ? e2(q) : '<span style="color:#B00">Quelle nicht angegeben</span>')
        + "</td></tr>";
    }
    if (Number.isFinite(e.klima.theta_e)) {
      h += zz("Norm-Außentemperatur &theta;<sub>e</sub>", f(e.klima.theta_e, 1) + " °C", kq);
    } else {
      h += zz("Norm-Außentemperatur &theta;<sub>e</sub>", "nicht gesetzt",
        "Ohne Norm-Außentemperatur ist keine Heizlast zu rechnen. Der Wert ist "
        + "nachzutragen, bevor dieser Bericht verwendet wird.");
    }
    if (Number.isFinite(e.klima.theta_e_m)) {
      h += zz("Jahresmitteltemperatur &theta;<sub>e,m</sub>",
        f(e.klima.theta_e_m, 1) + " °C", kq ? "dto." : null);
    }
    /* Die Standorthöhe stand hier als eigene Zeile. Sie ist keine
       Randbedingung dieser Rechnung: kein Rechenschritt greift auf sie zu.
       Sie gehört zum Datensatz, aus dem die Klimawerte stammen, und steht
       deshalb unter der Tabelle als Angabe zum Datensatz. */

    /* Temperaturen hinter den Hüllbauteilen der unbeheizten Zonen. Sie tragen
       die Zonenbilanz und damit jedes Bauteil gegen diese Zone; ohne sie ist
       die Kellertemperatur nicht nachzurechnen. */
    festeZonenTemperaturen(p).forEach(function (x) {
      h += zz("Temperatur hinter " + e2(undListe(x.teile))
        + " (" + e2(undListe(x.zonen)) + ")", f(x.theta, 1) + " °C",
        (p.meta.quellen && p.meta.quellen["theta_" + x.theta.toFixed(1)]) || null);
    });

    // Raumarten, gleiche Temperatur zusammenfassen
    const nachTemp = {};
    (p.raeume || []).forEach(function (r) {
      const a = DR.RAUMARTEN[r.art];
      if (!a || a.theta_i == null) return;
      const k = a.theta_i.toFixed(1);
      if (!nachTemp[k]) nachTemp[k] = { theta: a.theta_i, labels: [], quellen: [] };
      if (nachTemp[k].labels.indexOf(a.label) < 0) nachTemp[k].labels.push(a.label);
      /* Normstelle und Auslegung getrennt: DR.fundstelle() setzt den Verweis
         und hängt die Zuordnung dieses Berichts als eigenen Satz an. Vorher
         stand die Auslegung als Klammerzusatz mitten im Zitat. */
      const q = DR.fundstelle(r.art, "theta_i");
      if (q && nachTemp[k].quellen.indexOf(q) < 0) nachTemp[k].quellen.push(q);
    });
    Object.keys(nachTemp).sort(function (a, b) { return parseFloat(a) - parseFloat(b); })
      .forEach(function (k) {
        const x = nachTemp[k];
        h += zz(e2(x.labels.join(", ")), f(x.theta, 0) + " °C", x.quellen.join(" "));
      });

    const feste = festeNachbarn(p, e);
    Object.keys(feste).forEach(function (t) {
      h += zz("Nachbartemperatur " + e2(feste[t]), f(parseFloat(t), 1) + " °C",
        (p.meta.quellen && p.meta.quellen["theta_" + t]) || null);
    });

    /* Epsilon und Phi_RH standen in den Formeln von 4.1, aber in keiner
       Tabelle. Eine Größe, die in der Formel steht und im Bericht nie
       genannt wird, ist für den Prüfer eine Lücke, auch wenn sie 1,00 oder 0
       ist. Gerade dann: 1,00 und 0 sind Entscheidungen, keine Selbstläufer. */
    const epsWerte = (e.raeume || []).map(function (r) { return zahl(r.epsilon, 1); });
    const epsGleich = epsWerte.length
      && epsWerte.every(function (x) { return x === epsWerte[0]; });
    h += zz("Höhenkorrekturfaktor &epsilon;",
      (epsGleich ? f(epsWerte[0], 2)
       : f(Math.min.apply(null, epsWerte), 2) + " bis "
         + f(Math.max.apply(null, epsWerte), 2))
      + (epsGleich && epsWerte[0] === 1 ? " (ohne Korrektur)" : ""),
      /* Hier stand „Voreinstellung des Rechenkerns für Räume bis 10 m über
         Gelände". Die 10 m sind im Rechenkern nur ein Kommentar; am Normtext
         geprüft ist die Schwelle nicht. Eine Zahl, die wie eine Normgrenze
         aussieht und keine belegte Fundstelle hat, gehört nicht in eine
         Spalte „Fundstelle". Was bleibt, ist die belegbare Aussage: der Kern
         setzt den Faktor durchgehend auf seinen Vorgabewert. */
      "Voreinstellung des Rechenkerns, für alle Räume gleich. Der Faktor "
      + "korrigiert die Lage eines Raums über Gelände; das Werkzeug erkennt "
      + "die Höhe eines Raums nicht selbst und führt sie deshalb nicht nach. "
      + "Bei Räumen in großer Höhe ist der Faktor je Raum von Hand zu setzen.");

    const phiRH = zahl(e.phi_RH_gebaeude, 0);
    h += zz("Aufheizleistung &Phi;<sub>RH</sub>", f(phiRH, 0) + " W",
      phiRH === 0
        ? "Kein Aufheizzuschlag angesetzt. Er gilt dem Wiederaufheizen nach einer "
          + "Absenkung und setzt eine vereinbarte Absenkdauer und Wiederaufheizzeit "
          + "voraus. Beides ist für dieses Objekt nicht vereinbart. Wird der "
          + "Betrieb abgesenkt gefahren, ist der Zuschlag nachzutragen; die "
          + "Heizlast steigt dann."
        : "Je Raum aus Fläche und f_RH gebildet, siehe Anlage 1.");
    h += "</table>";
    /* Im Druck: die beiden Erläuterungen, die in der Fundstellenspalte
       standen und Handlungswissen tragen, als Fußnoten. */
    if (druck) {
      h += '<p class="fussnote">Der Höhenkorrekturfaktor ε korrigiert die Lage '
        + "eines Raums über Gelände und ist hier für alle Räume gleich angesetzt. "
        + "Bei Räumen in großer Höhe ist der Faktor je Raum zu setzen.</p>";
      if (phiRH === 0) {
        h += '<p class="fussnote">Kein Aufheizzuschlag angesetzt. Er gilt dem '
          + "Wiederaufheizen nach einer Absenkung und setzt eine vereinbarte "
          + "Absenkdauer und Wiederaufheizzeit voraus; beides ist für dieses "
          + "Objekt nicht vereinbart. Wird der Betrieb abgesenkt gefahren, ist "
          + "der Zuschlag nachzutragen; die Heizlast steigt dann.</p>";
      } else {
        h += '<p class="fussnote">Die Aufheizleistung ist je Raum aus Fläche und '
          + "f_RH gebildet, siehe Anlage 1.</p>";
      }
    }
    /* Fußnote zur Herkunft der Klimawerte. Sie beantwortet drei Fragen, die
       sonst offen bleiben: woher der Wert kommt, ob die genannte Quelle eine
       normative ist, und nach welcher Einheit zugeordnet wurde. NUR INTERN:
       beide Fußnoten dieses Blocks sind Quellen- und Gütediskussion. */
    if (!druck && kqBasis && !normGeprueft) {
      h += '<p class="fussnote">Zur Herkunft der Klimawerte: die genannte '
        + "Veröffentlichung gibt die Tabelle der Norm wieder, sie ist selbst keine "
        + "normative Quelle. Zur Zuordnungseinheit beschreiben zwei "
        + "Fachveröffentlichungen zu dieser Norm den elektronischen Anhang der "
        + "DIN/TS 12831-1:2020-04 übereinstimmend als Liste von 8.199 deutschen "
        + "Postleitgebieten mit Ortsname, Auslegungsaußentemperatur, "
        + "Jahresmitteltemperatur und Referenzhöhe: Markert, Praxis "
        + "Heizlastberechnung, Tabelle 9, und Jagnow/Wolff, Manuskript "
        + "Recknagel/Sprenger 2020. Die Zuordnung über die Postleitzahl folgt "
        + "diesem Befund. Auch diese beiden sind Wiedergaben und nicht der "
        + "Normtext; Wert und Zuordnung sind vor Verwendung in einem Nachweis am "
        + "Normtext zu bestätigen. Bis dahin führt Abschnitt " + K.konfidenz
        + " die Klimawerte in Klasse B und nicht in A.</p>";
    }
    if (!druck && ort && ort.hoehe) {
      /* Die Höhe ist die Referenzhöhe des Klimadatensatzes, nicht die Höhe
         des Gebäudes. Was sie bedeutet, ist damit sagbar, statt es bei
         „weicht deutlich ab" zu belassen: sie ist der Bezugspunkt der
         Höhenkorrektur. Deren Schwelle ist am Kommentarwerk belegt, nicht am
         Normtext, und wird auch so gekennzeichnet. NUR INTERN: die Fußnote
         besteht aus Quellenangaben und Geltungsvorbehalten. */
      h += '<p class="fussnote">Zum Klimadatensatz: für diese Postleitzahl ist eine '
        + "Referenzhöhe von " + f(ort.hoehe, 0) + " m ü. NN hinterlegt. Sie ist der "
        + "Bezugspunkt einer möglichen Höhenkorrektur der Norm-Außentemperatur, "
        + "nicht die Höhe dieses Gebäudes. Nach Markert, Praxis "
        + "Heizlastberechnung, Tabelle 10, wiedergegeben aus Tabelle 30 der "
        + "DIN/TS 12831-1:2020-04, wird die Korrektur erst ab einem Betrag der "
        + "Höhendifferenz von 200 m angesetzt, darunter ist der Temperaturgradient "
        + "null. Liegt das Gebäude weniger als 200 m über oder unter der "
        + "Referenzhöhe, geht die Höhe in keinen Rechenschritt ein; deshalb steht "
        + "sie nicht in der Tabelle der Randbedingungen. Liegt sie weiter "
        + "auseinander, ist die Korrektur nachzutragen; dieses Werkzeug führt sie "
        + "nicht selbst aus.</p>";
    }

    /* 4.3 Lüftung */
    const rr = e.raeume || [];
    const nmin = rr.map(function (r) { return r.n_min; });
    const nminEinheitlich = nmin.length && nmin.every(function (x) { return x === nmin[0]; });
    const es = rr.map(function (r) { return r.e; });
    const eEinheitlich = es.length && es.every(function (x) { return x === es[0]; });
    const ninf = rr.map(function (r) { return r.V > 0 ? r.v_inf / r.V : 0; });
    const alleMin = rr.length && rr.every(function (r) {
      return r.massgebend === "Mindestluftwechsel"; });
    h += "<h3>" + U(K.grundlagen) + " Lüftung</h3><p>Der Lüftungswärmeverlust wird nach "
      + "DIN EN 12831-1, Abschnitt 6.3, aus dem größeren der beiden Volumenströme aus "
      + "hygienischem Mindestluftwechsel und Infiltration gebildet. Der Mindestluftwechsel "
      + "beträgt " + (nminEinheitlich ? "für alle Räume " + f(nmin[0], 1)
        : f(Math.min.apply(null, nmin), 1) + " bis " + f(Math.max.apply(null, nmin), 1))
      + " pro Stunde. Die Infiltration erreicht bei n50 = "
      + f(zahl(p.luftdichtheit.n50), 1) + " pro Stunde und einem Abschirmkoeffizienten von "
      /* Die nackte Spanne war der Anlass der Beanstandung. Sie darf hier
         stehen bleiben; der Verweis auf die Tabelle folgt als eigener Satz,
         eingeschoben zerreißt er den Satzbau. */
      + (eEinheitlich ? f(es[0], 2)
        : "zwischen " + f(Math.min.apply(null, es), 2) + " und "
          + f(Math.max.apply(null, es), 2))
      + " nur " + (ninf.length
        ? (Math.abs(Math.max.apply(null, ninf) - Math.min.apply(null, ninf)) < 0.005
           ? f(ninf[0], 2)
           : f(Math.min.apply(null, ninf), 2) + " bis " + f(Math.max.apply(null, ninf), 2))
        : "–")
      + " pro Stunde. "
      + (eEinheitlich ? "" : "Welche Stufe des Abschirmkoeffizienten für welchen "
        + "Raum gilt, steht in der Tabelle darunter. ")
      + (alleMin
        ? "Damit ist in allen Räumen der Mindestluftwechsel maßgebend. Die Wahl von n50 hat "
          + "deshalb keinen Einfluss auf das Ergebnis."
        : "")
      + "</p>";
    /* Fundstelle des Mindestluftwechsels. Sie fehlte hier ganz, und in der
       Konfidenztabelle stand die Zeile der Innentemperatur. n_min steht in
       Tabelle 12, nicht in Tabelle 32. Wo die passende Zeile nicht am
       Normtext geprüft ist, sagt der Satz es und nennt keine Zeile. */
    const nArten = [];
    (p.raeume || []).forEach(function (r) {
      if (r.art && DR && DR.RAUMARTEN[r.art] && nArten.indexOf(r.art) < 0) nArten.push(r.art);
    });
    /* Herkunft des Mindestluftwechsels: Quellen- und Konfidenzangabe,
       NUR INTERN. */
    if (!druck && nArten.length) {
      /* Nach Verweis gruppiert, siehe daten_raumarten.js: alle verwendeten
         Raumarten verweisen hier auf dieselbe Tabelle, und sie dreimal
         hintereinander zu drucken liest sich wie ein Fehler. */
      const nQ = DR.fundstellen(nArten, "n_min");
      const offen = nArten.filter(function (k) {
        return DR.RAUMARTEN[k].n_min_belegt !== true;
      }).map(function (k) { return DR.RAUMARTEN[k].label; });
      if (nQ) {
        h += '<p class="klein">Herkunft des Mindestluftwechsels: ' + e2(nQ)
          /* Die ungeprüfte Zeile steht schon in der Zuordnung darüber. Hier
             fehlt nur noch, was daraus folgt. */
          + (offen.length
            ? " Abschnitt " + K.konfidenz + " führt den Wert deshalb nicht in "
              + "Klasse B."
            : "")
          + "</p>";
      }
    }
    if (!alleMin) {
      const inf = rr.filter(function (r) { return r.massgebend === "Infiltration"; });
      const mehr = inf.reduce(function (s, r) {
        return s + 0.34 * (r.v_inf - r.v_min) * (r.theta_i - e.klima.theta_e); }, 0);
      /* DER SATZ MUSS ZU SEINER EIGENEN ZAHL PASSEN (Sebastian, Punkt 16).
         Hier stand „sie erhöht die Lüftungsheizlast dieser Räume um zusammen
         0 W" — eine Behauptung, die die Zahl in derselben Zeile widerlegt.
         Beim Hasenberg-Stand sind die beiden Räume Garderoben ohne Fläche
         und ohne Volumen; Infiltration und Mindestluftwechsel sind dort
         beide null, und der Kern stuft den Gleichstand als Infiltration ein.
         Die Zahl bleibt unverändert stehen, benannt wird sie jetzt als das,
         was sie ist: die Mehrlast, gegebenenfalls null.
         ABNAHME: Der Satz davor nennt die Luftwechselraten (Infiltration
         0,00 bis 0,18 gegen 0,5 pro Stunde Mindestluftwechsel). Daraus las
         sich „Infiltration maßgebend" wie ein Widerspruch. Verglichen werden
         aber Volumenströme, nicht Raten; das steht jetzt im Satz. */
      h += "<p>In " + inf.length + " von " + rr.length + " Räumen ist der "
        + "Infiltrationsvolumenstrom nicht kleiner als der des Mindestluftwechsels "
        + "und deshalb maßgebend. Die Mehrlast gegenüber dem Mindestluftwechsel "
        + "beträgt in diesen Räumen zusammen " + f(mehr, 0) + " W.</p>";
    }
    /* NUR INTERN: die Einstufung von n50 als Annahme ist eine Güteaussage.
       Der Wert selbst steht mit im Lüftungsabsatz darüber. */
    if (!druck && p.luftdichtheit.kategorie !== "messung") {
      h += '<p class="klein">n50 ist eine Annahme, keine Messung.</p>';
    }

    /* Der Abschirmkoeffizient stand nur als Spanne „0,00 bis 0,03" im Text.
       Damit war weder zu sehen, welche Klassen es gibt, noch welcher Raum in
       welcher liegt. Beides gehört in den Bericht, weil e in die Infiltration
       eingeht. */
    const ak = abschirmklassen(p, e);
    if (ak.length) {
      /* Zahlwörter, damit „keine · eine · 2" nicht aus der Reihe fällt.
         Darüber hinaus bleibt es bei der Ziffer. */
      const zw = ["keine", "eine", "zwei", "drei", "vier", "fünf", "sechs"];
      h += '<table><tr><th style="width:30%">Stufe</th>'
        + '<th class="n">e</th><th class="n">Räume</th>'
        + "<th>Zuordnung</th></tr>";
      ak.forEach(function (x) {
        const lage = x.exponiert.length
          ? undListe(x.exponiert.map(function (n) {
              return n <= 1 ? (zw[n] || f(n, 0)) + " exponierte Fassade"
                : (zw[n] || f(n, 0)) + " exponierte Fassaden"; }))
          /* „NICHT EINGETRAGEN" WAR EINE FALSCHE AUSKUNFT.
             Beanstandet am 26.08.2026: beide Zeilen der Tabelle trugen diese
             Beschriftung, obwohl daneben 0,00 bzw. 0,03 stand — also sehr
             wohl eine Anzahl dahintersteckte. Sie ist nur nicht von Hand
             eingetragen, sondern vom Rechenkern aus den Hüllbauteilen des
             Raums gezählt (kern_heizlast_norm, zaehleExponierte). Genau das
             steht hier jetzt; die Klassentabelle darunter nennt zu jedem e
             seine Fassadenzahl, damit sich beides zusammenlesen lässt. */
          : "Aus den Hüllbauteilen der Räume gezählt, nicht von Hand "
            + "eingetragen";
        /* Welcher Raum in welcher Stufe liegt, war der eigentliche Einwand.
           Eine Anzahl beantwortet ihn nicht. Woher der Wert kommt, steht in
           der Fußnote und wird hier nur genannt, wenn er von Hand gesetzt
           wurde; sonst stünde dreimal derselbe Satz untereinander. */
        h += "<tr><td>" + e2(lage) + '</td><td class="n">' + f(x.e, 2)
          + '</td><td class="n">' + f(x.anzahl, 0) + "</td><td>"
          + (x.eigene ? "je Raum von Hand gesetzt. " : "")
          + (x.zuordnung.length ? e2(undListe(x.zuordnung)) : "keine Räume zugeordnet")
          + "</td></tr>";
      });
      h += "</table>";
      /* Die drei Stufen nicht abschreiben, sondern beim Rechenkern erfragen.
         Eine zweite Abschrift läuft irgendwann auseinander, und dann steht im
         Bericht eine andere Tabelle als die, mit der gerechnet wurde. */
      const KN = window.KERN_HEIZLAST_NORM;
      if (KN && KN.eFaktor) {
        h += '<p class="fussnote">e ist der Abschirmkoeffizient der Infiltration. '
          + "Für die Infiltrationsberechnung wird die Exposition des jeweiligen "
          + "Raums berücksichtigt, in drei Stufen nach der Anzahl exponierter "
          + "Fassaden: " + f(KN.eFaktor(0), 2) + " ohne, " + f(KN.eFaktor(1), 2)
          + " bei einer und " + f(KN.eFaktor(2), 2) + " bei mehreren exponierten "
          /* SO KURZ WIE MÖGLICH (Sebastian, Punkt 20). Gestrichen ist der
             Satz, den die Spaltenüberschrift schon sagt („die Spalte
             Zuordnung nennt die Räume, für die die jeweilige Stufe gilt")
             und die Wiederholung, dass die Stufe aus der Anzahl exponierter
             Fassaden folgt — das steht einen Satz vorher. Die Anweisung, e
             von Hand zu setzen, richtet sich an den Bearbeiter und nicht an
             den Empfänger des Berichts; sie bleibt in der internen Fassung. */
          + "Fassaden; abweichende Werte sind in der Tabelle vermerkt."
          /* Die Lage im Gelände geht in diese Stufen nicht ein. Das gehört
             gesagt, sonst liest sich die Tabelle wie eine vollständige
             Abschirmungseinstufung. */
          + " Eine Abschirmungsklasse nach der Lage im Gelände, also freistehend, "
          + "in offener oder in geschlossener Bebauung, ist darin nicht enthalten; "
          + "maßgebend ist allein die Anzahl der exponierten Fassaden."
          + (druck ? "" : " Steht das Gebäude ungewöhnlich frei oder ungewöhnlich "
            + "geschützt, ist e je Raum von Hand zu setzen.")
          + (alleMin
            ? " Auf das Ergebnis dieses Berichts wirkt e nicht, weil in allen Räumen "
              + "der Mindestluftwechsel maßgebend ist."
            : "") + "</p>";
      }
    }

    /* 4.4 Wärmebrücken */
    /* Inhalt unverändert: pauschaler Zuschlag, Geltungsbereich, Einfluss.
       Geglättet ist nur die Sprache — „Das entspricht dem Ansatz ohne
       gesonderten Nachweis" sagte nicht, wovon, und „macht rd. X der
       Heizlast aus" ließ offen, auf welche Heizlast es sich bezieht. */
    h += "<h3>" + U(K.grundlagen) + " Wärmebrücken</h3><p>Die Wärmebrücken sind "
      + "pauschal berücksichtigt: Auf alle Bauteile gegen Außenluft und gegen "
      + "unbeheizte Bereiche ist ein Zuschlag von &Delta;U<sub>WB</sub> = "
      + f(e.norm.DELTA_U_WB, 2) + " W/(m²·K) auf den U-Wert angesetzt. Das ist der "
      + "Ansatz ohne gesonderten Wärmebrückennachweis. Auf die Norm-Heizlast des "
      + "Gebäudes wirkt er sich mit rund " + kw(wbAnteil) + " aus.</p>";
    const kern = (zeilen || []).some(function (z) {
      return /Kerndämmung|kerngedämmt/.test(z.name); });
    const tw = text(p, "kap4_wb_kerndaemmung");
    if (kern && tw) h += "<p>" + e2(tw) + "</p>";

    /* 4.5 Erdberührte Bauteile. Verfahren und Vereinfachung stehen als
       Belegsatz im Rechenkern und werden nur ausgegeben, wenn es im Projekt
       überhaupt erdberührte Bauteile gibt. */
    const erd = kernHinweise(e, "erdreich", druck);
    if (erd) {
      h += "<h3>" + U(K.grundlagen) + " Erdberührte Bauteile</h3>" + erd;
    }

    /* 4.6 Maßbezug */
    h += "<h3>" + U(K.grundlagen) + " Maßbezug</h3><p>Gerechnet wird mit Innenmaßen. Die "
      + "dadurch nicht erfassten Wandanschlüsse und Ecken sind im Wärmebrückenzuschlag "
      + "enthalten. Die Bauteilflächen dieses Berichts sind daher kleiner als die "
      + "Außenmaßflächen.</p>";
    return h;
  }

  /** Schichtblätter der nachgewiesenen Bauteile. Ein Baustein für beide
   *  Fassungen: der Rechenweg eines U-Werts ist keine Güteaussage und steht
   *  deshalb auch im Ausdruck; zwei Abschriften desselben Blocks liefen
   *  auseinander. */
  function schichtblaetter(mitSchicht, DB) {
    return mitSchicht.map(function (z) {
      const n = z.nachweis;
      const ue = DB && DB.UEBERGANG[z.uebergang || "wand_aussen"];
      let t = "<h4>" + e2(z.name) + "</h4>"
        + '<table><tr><th style="width:52%">Schicht</th><th class="n">d [m]</th>'
        + '<th class="n">λ</th><th class="n">R [m²·K/W]</th></tr>'
        + '<tr><td>Wärmeübergang innen R<sub>si</sub></td><td class="n"></td>'
        + '<td class="n"></td><td class="n">' + f(n.rsi, 3) + "</td></tr>";
      t += n.zeilen.map(function (s) {
        return "<tr><td>" + e2(s.label) + '</td><td class="n">' + f(s.d, 3)
          + '</td><td class="n">' + f(s.lambda, 3) + '</td><td class="n">'
          + f(s.r, 3) + "</td></tr>";
      }).join("");
      t += '<tr><td>Wärmeübergang außen R<sub>se</sub></td><td class="n"></td>'
        + '<td class="n"></td><td class="n">' + f(n.rse, 3) + "</td></tr>"
        + '<tr><th>Summe R</th><th class="n"></th><th class="n"></th>'
        + '<th class="n">' + f(n.r_gesamt, 3) + "</th></tr>"
        + "<tr><th>U-Wert = 1 / Summe R"
        + (n.zuschlag ? " + " + f(n.zuschlag, 2) : "")
        + '</th><th class="n"></th><th class="n"></th><th class="n">'
        + f(n.u, 3) + " W/(m²·K)</th></tr></table>";
      const zusatz = [];
      if (n.zuschlag && z.typ.zuschlag_grund) {
        zusatz.push("Zuschlag " + f(n.zuschlag, 2) + " W/(m²·K) "
          + z.typ.zuschlag_grund);
      } else if (n.zuschlag) {
        zusatz.push("Zuschlag " + f(n.zuschlag, 2) + " W/(m²·K) ohne hinterlegte "
          + "Begründung");
      }
      if (ue) zusatz.push(ue.label);
      if (zusatz.length) t += '<p class="fussnote">' + e2(zusatz.join(" · ")) + "</p>";
      return t;
    }).join("");
  }

  /* ---------------- 5 Bauteile und U-Werte ---------------- */
  function kapitel5(p, e, K, U, zeilen, druck) {
    const BEG = window.DATEN_BEG_ANFORDERUNGEN;
    const DB = window.DATEN_BAUTEILE;
    /* Der Referenzbericht führt in dieser Tabelle die Bauteile der
       Gebäudehülle. Innenbauteile stehen mit U-Wert, Fläche und Wärmestrom
       vollständig in Anlage 1; sie hier zu wiederholen macht die Tabelle
       dreimal so lang, ohne etwas zu belegen. */
    const verwendet = zeilen.filter(function (z) { return z.verwendet && !z.nur_innen; });
    const liste = verwendet.length ? verwendet
      : zeilen.filter(function (z) { return !z.nur_innen; });
    const innen = zeilen.filter(function (z) { return z.verwendet && z.nur_innen; });
    let unsicher = false;
    /* Ein Strich in der Anforderungsspalte sieht nach Lücke aus. Es gibt zwei
       ganz verschiedene Gründe dafür, und der Leser muss sie unterscheiden
       können: entweder ist die Bauteilart bekannt und für sie steht in dieser
       Fassung kein Wert in der Datei, oder die Bauteilart ließ sich gar nicht
       zuordnen. Beides wird benannt, statt es hinter einem Strich zu
       verstecken. */
    const ohneWert = [];      // Bauteilart erkannt, kein Anforderungswert hinterlegt
    const ohneArt = [];       // keine Bauteilart der Anforderungsliste zuzuordnen

    /* DRUCKFASSUNG: nur Bauteil und U-Wert. Herkunft (Konfidenzklasse),
       BEG-Anforderung und Bewertung sind Güte- und Förderaussagen; sie
       stehen intern (Sebastians Vorgabe vom 24.08.2026). Ebenso entfallen
       im Druck sämtliche Fußnoten dieser Tabelle und der Abschnitt zu den
       Ausnahmen der Technischen Mindestanforderungen. */
    if (druck) {
      let hd = '<table' + (liste.length <= 6 ? ' class="kurz"' : "")
        + '><tr><th style="width:60%">Bauteil</th>'
        + '<th class="n">U [W/(m²·K)]</th></tr>'
        + liste.map(function (z) {
            return "<tr><td>" + e2(z.name) + '</td><td class="n">' + f(z.u, 2)
              + "</td></tr>";
          }).join("") + "</table>";
      const mitSchichtD = liste.filter(function (z) { return z.nachweis; });
      if (mitSchichtD.length) {
        hd += "<h3>" + U(K.bauteile) + " Schichtaufbauten</h3>"
          + schichtblaetter(mitSchichtD, DB);
      }
      const ohneSchichtD = liste.filter(function (z) { return !z.nachweis && z.verwendet; });
      if (ohneSchichtD.length) {
        hd += '<p class="klein">Für diese Bauteile wurde der U-Wert als Gesamtwert '
          + "vorgegeben und nicht aus einem hinterlegten Schichtaufbau berechnet: "
          + e2(undListe(ohneSchichtD.map(function (z) { return z.kurz; })))
          + ".</p>";
      }
      const innenD = zeilen.filter(function (z) { return z.verwendet && z.nur_innen; });
      if (innenD.length) {
        hd += '<p class="klein">Bauteile zwischen Räumen unterschiedlicher Temperatur '
          + "gehen nicht in die Gebäudeheizlast ein. Angesetzt sind: "
          + e2(innenD.map(function (z) { return z.kurz + " " + f(z.u, 2); }).join(" · "))
          + " W/(m²·K). Flächen und Wärmeströme stehen in Anlage 1.</p>";
      }
      return hd;
    }

    /* Feste Breiten für alle fünf Spalten. Vorher waren nur zwei gesetzt; die
       Bewertung bekam 19 % und brach „sofern das Bauteil im Zuge der Maßnahme
       gedämmt wird" auf sechs Zeilen mit je einem Wort um. */
    let h = '<table' + (liste.length <= 6 ? ' class="kurz"' : "")
      + '><tr><th style="width:31%">Bauteil</th>'
      + '<th class="n" style="width:12%">U [W/(m²·K)]</th>'
      + '<th class="n" style="width:10%">Herkunft</th>'
      + '<th class="n" style="width:15%">BEG EM Anforderung</th>'
      + '<th style="width:32%">Bewertung</th></tr>';
    h += liste.map(function (z) {
      const a = z.anforderung;
      let anf = "";
      if (a.text) anf = e2(a.text);
      else if (Number.isFinite(a.u_max)) {
        anf = f(a.u_max, 2) + (a.herkunft === "name" ? "<sup>1</sup>" : "");
        if (a.herkunft === "name") unsicher = true;
      } else if (a.herkunft) {
        anf = 'kein Wert hinterlegt<sup>2</sup>';
        ohneWert.push(z);
      } else {
        anf = 'keine Bauteilart zugeordnet<sup>3</sup>';
        ohneArt.push(z);
      }
      const bwKlasse = z.bewertung.erfuellt === false ? ' style="color:#B00020;font-weight:600"' : "";
      /* Konfidenzklasse je Zeile. Ohne sie steht der belegte U-Wert neben dem
         angenommenen, ohne dass man die beiden unterscheiden kann; dass 100 %
         der Transmission auf Annahmen beruhen, war nur zwei Kapitel weiter in
         einer grauen Tabelle zu finden. */
      const kl = uKlasse(z);
      return "<tr><td>" + e2(z.name) + '</td><td class="n">' + f(z.u, 2)
        + '</td><td class="n"' + (kl === "C" ? ' style="font-weight:600"' : "")
        + ">" + kl
        + '</td><td class="n">' + anf + "</td><td" + bwKlasse + ">"
        + e2(z.bewertung.text)
        + (z.bewertung.vorbehalt
          ? '<br><span style="font-weight:400;color:#555;font-size:8.5pt">'
            + e2(z.bewertung.vorbehalt) + "</span>" : "")
        + "</td></tr>";
    }).join("") + "</table>";

    /* Der Anteil gehört hierher, nicht nur in die Konfidenztabelle. Wer die
       U-Werte liest, muss an dieser Stelle sehen, wie viel von der Rechnung
       auf Annahmen steht. */
    let phiAlle = 0, phiC = 0;
    (zeilen || []).forEach(function (z) {
      if (!z.verwendet || z.nur_innen) return;
      phiAlle += Math.abs(z.phi);
      if (uKlasse(z) === "C") phiC += Math.abs(z.phi);
    });
    h += '<p class="fussnote">Spalte Herkunft: A aus einer Originalunterlage, '
      + "B Schichtrechnung oder normativer Tabellenwert, C fachliche Annahme. Die "
      + "Begründung steht für jedes Bauteil einzeln in Abschnitt " + K.konfidenz + "."
      + (phiAlle > 0
        ? " Auf Bauteilen der Klasse C beruhen " + f(phiC / phiAlle * 100, 0)
          + " % des Transmissionswärmestroms."
          + (phiC / phiAlle > 0.5
            ? " Die Heizlast dieses Berichts steht damit überwiegend auf Annahmen, "
              + "nicht auf belegten Werten."
            : "")
        : "") + "</p>";

    h += '<p class="fussnote">' + e2(BEG ? BEG.fussnote()
      : "Anforderungswerte nicht hinterlegt.") + "</p>";
    if (unsicher) {
      h += '<p class="fussnote"><sup>1</sup> Die Anforderung wurde über den Bauteilnamen '
        + "zugeordnet, nicht ausdrücklich gewählt. Vor Verwendung in einem Förderantrag "
        + "im Kontrollblatt bestätigen.</p>";
    }
    if (ohneWert.length) {
      h += '<p class="fussnote"><sup>2</sup> Für '
        + e2(undListe(ohneWert.map(function (z) { return z.kurz; })))
        + " führt diese Fassung der hinterlegten Anforderungen keinen Soll-U-Wert. "
        + "Das heißt nicht, dass keine Anforderung besteht, sondern dass das Werkzeug "
        + "keine nennen kann, ohne sie zu erfinden. Der gerechnete U-Wert in der "
        + "Spalte daneben bleibt davon unberührt; für einen Förderantrag ist der "
        + "Sollwert aus der geltenden Fassung der Technischen Mindestanforderungen "
        + "nachzutragen.</p>";
    }
    if (ohneArt.length) {
      h += '<p class="fussnote"><sup>3</sup> '
        + e2(undListe(ohneArt.map(function (z) { return z.kurz; })))
        + (ohneArt.length > 1 ? " ließen" : " ließ")
        + " sich keiner Bauteilart der Technischen Mindestanforderungen zuordnen. "
        + "Das sind in aller Regel Bauteile, die nicht gegen Außenluft oder Erdreich "
        + "liegen, etwa eine Trennwand zum Nachbargebäude. Ob für sie eine Anforderung "
        + "gilt, entscheidet die prüfende Stelle im Förderverfahren, nicht dieser "
        + "Bericht. In die Heizlast gehen sie mit dem angesetzten U-Wert vollständig "
        + "ein.</p>";
    }

    /* Ausnahmen der Technischen Mindestanforderungen.
     *
     * Die Ausnahmen kommen jetzt aus daten_beg_anforderungen.js und nicht mehr
     * aus diesem Text. Dort steht jede bedingt geltende Zeile der Tabelle mit
     * Wert, Voraussetzung und Fundstelle; zugeordnet wird über die
     * Kategorie-Kennung des Bauteils. Vorher entschied hier ein Namensausdruck
     * über "Dach", welche Ausnahme im Bericht landete. Die Ausnahmen der
     * Bauteilgruppe Außenwände, also Baudenkmal 0,45 und Sichtfachwerk 0,65,
     * kamen darin gar nicht vor.
     *
     * WICHTIG und unverändert: Die Ausnahmen hängen am Status des Gebäudes
     * oder an der Bauart, NICHT am Baujahr. Ein altes Haus mit Dachschräge
     * erfüllt die Voraussetzung nicht schon deshalb. Der Bericht behauptet
     * nichts, er nennt die Zeile und ihre Voraussetzung. */
    const verfehlt = liste.filter(function (z) { return z.bewertung.erfuellt === false; });
    if (verfehlt.length) {
      const gesammelt = [];
      verfehlt.forEach(function (z) {
        ((z.anforderung && z.anforderung.ausnahmen) || []).forEach(function (a) {
          let g = gesammelt.find(function (x) { return x.a.id === a.id; });
          if (!g) { g = { a: a, teile: [] }; gesammelt.push(g); }
          if (g.teile.indexOf(z.kurz) < 0) g.teile.push(z.kurz);
        });
      });
      h += "<h3>" + U(K.bauteile) + " Ausnahmen der Technischen Mindestanforderungen</h3>"
        + "<p>Wird ein Anforderungswert verfehlt, heißt das nicht ohne Weiteres, dass "
        + "die Maßnahme durchfällt. Die Tabelle der Technischen Mindestanforderungen "
        + "führt für einen Teil der Bauteile eigene Zeilen mit milderen Werten. Sie "
        + "gelten nur unter einer Voraussetzung, und ob die hier erfüllt ist, prüft "
        + "dieser Bericht nicht: die Angaben dazu liegen ihm nicht vor.</p>";
      if (gesammelt.length) {
        h += '<table><tr><th style="width:20%">Betrifft</th>'
          + '<th class="n" style="width:13%">Wert der Ausnahme</th>'
          + '<th style="width:35%">Voraussetzung</th>'
          + '<th style="width:32%">Zeile der Tabelle</th></tr>'
          + gesammelt.map(function (g) {
            const a = g.a;
            const wert = Number.isFinite(a.u_max)
              ? f(a.u_max, 2) + " W/(m²·K)"
              : (Number.isFinite(a.lambda_max)
                ? "λ &le; " + f(a.lambda_max, 3) + " W/(m·K)" : "");
            return "<tr><td>" + e2(undListe(g.teile)) + '</td><td class="n">' + wert
              + "</td><td>" + e2(a.bedingung) + "</td><td>" + e2(a.zeile) + "</td></tr>";
          }).join("") + "</table>"
          + '<p class="fussnote">Alle Zeilen dieser Tabelle stehen im Wortlaut der '
          + "unter der Bauteiltabelle genannten Fassung. Sie sind hier weder "
          + "angewendet noch geprüft, sondern nachgewiesen. Über die Förderfähigkeit "
          + "entscheidet die prüfende Stelle.</p>";
      }
      h += "<ul><li>Lässt sich für eine Teilfläche eines Bauteils die Anforderung aus "
        + "technischen Gründen nicht einhalten, kann die Maßnahme an dieser Teilfläche "
        + "dennoch mitgefördert werden, wenn der flächengewichtete mittlere U-Wert "
        + "über die gesamte nachträglich gedämmte Bauteilfläche den Anforderungswert "
        + "erfüllt. Dieser Bericht führt keine flächengewichteten Mittelwerte je "
        + "Bauteilgruppe. Fundstelle: Liste der technischen FAQ BEG EM, Version 7.0 "
        + "(06/2026), Nummer 3.12. Diese Fundstelle ist eine FAQ des Durchführers "
        + "und nicht der Richtlinientext; ob sie zur Fassung vom "
        + e2(BEG && BEG.FASSUNG ? BEG.FASSUNG.datum : "ohne Angabe")
        + " fortgeschrieben ist, war hier nicht zu klären.</li></ul>";
    }

    /* 5.2 Schichtaufbauten */
    const mitSchicht = liste.filter(function (z) { return z.nachweis; });
    if (mitSchicht.length) {
      h += "<h3>" + U(K.bauteile) + " Schichtaufbauten</h3>"
        + schichtblaetter(mitSchicht, DB);
    }
    const ohneSchicht = liste.filter(function (z) { return !z.nachweis && z.verwendet; });
    if (ohneSchicht.length) {
      h += '<p class="klein">Für diese Bauteile wurde der U-Wert als Gesamtwert '
        + "vorgegeben und nicht aus einem hinterlegten Schichtaufbau berechnet: "
        + e2(undListe(ohneSchicht.map(function (z) { return z.kurz; })))
        + ". Woher er stammt und wie sicher er ist, steht für jedes dieser Bauteile in "
        + "Abschnitt " + K.konfidenz + ".</p>";
    }
    if (innen.length) {
      h += '<p class="klein">Bauteile zwischen Räumen unterschiedlicher Temperatur '
        + "gehen nicht in die Gebäudeheizlast ein und haben keine BEG-Anforderung. "
        + "Angesetzt sind: "
        + e2(innen.map(function (z) { return z.kurz + " " + f(z.u, 2); }).join(" · "))
        + " W/(m²·K). Flächen und Wärmeströme stehen in Anlage 1.</p>";
    }
    return h;
  }

  /* ---------------- 6 Unbeheizte Bereiche ---------------- */
  function kapitel6(p, e, zb) {
    /* Drei Fälle, nicht zwei: bilanziert, fest eingetragen, und — seit die
       Bereiche automatisch entstehen — über eine Lage nach DIN/TS 12831-1
       Tabelle 5 vorgegeben. Der dritte Fall stand vorher im Satz der
       bilanzierten Bereiche: der Bericht behauptete eine Wärmebilanz, wo eine
       Tabellenlage angesetzt war. */
    const bilanzZonen = zb.filter(function (z) { return z.vergleichbar; });
    const festZonen = zb.filter(function (z) { return z.modus === "fest"; });
    const vorgabeZonen = zb.filter(function (z) {
      return !z.vergleichbar && z.modus !== "fest"; });
    let h = "";
    if (bilanzZonen.length) {
      h += "<p>" + e2(undListe(bilanzZonen.map(function (z) { return z.name; })))
        + (bilanzZonen.length > 1 ? " sind" : " ist") + " nicht Teil der beheizten Hülle. "
        + (bilanzZonen.length > 1 ? "Ihre Temperatur" : "Die Temperatur")
        + " unter Auslegungsbedingungen wurde nach DIN/TS 12831-1 aus einer stationären "
        + "Wärmebilanz bestimmt und nicht pauschal angenommen.</p>";
    }
    if (festZonen.length) {
      h += "<p>" + e2(undListe(festZonen.map(function (z) { return z.name; })))
        + ": Temperatur fest vorgegeben, nicht aus einer Bilanz bestimmt.</p>";
    }
    if (vorgabeZonen.length) {
      h += "<p>" + e2(undListe(vorgabeZonen.map(function (z) { return z.name; })))
        + ": Die Temperatur ist über die Lage des Bereichs nach "
        + "DIN/TS 12831-1:2020-04 bzw. über den Pauschalwert f<sub>1</sub> "
        + "vorgegeben und nicht aus einer Wärmebilanz bestimmt. Eine Bilanz ist "
        + "hier auch nicht zu führen: "
        + (vorgabeZonen.length > 1 ? "diese Bereiche haben" : "der Bereich hat")
        + " keine eigenen Hüllbauteile; sie bestünde allein aus den angrenzenden "
        + "beheizten Räumen und ergäbe deren Raumtemperatur. Die unten "
        + "aufgeführten Wärmeströme sind deshalb Bestandsaufnahme, nicht "
        + "Herleitung.</p>";
    }

    h += '<table><tr><th style="width:20%">Bereich</th><th>Wärmestrom nach</th>'
      + '<th class="n">H [W/K]</th><th class="n">Temperatur</th>'
      + '<th class="n">Ergebnis</th></tr>';
    zb.forEach(function (z) {
      if (z.modus === "fest") {
        h += "<tr><td>" + e2(z.name) + "</td><td>fest vorgegeben</td>"
          + '<td class="n"></td><td class="n"></td><td class="n">'
          + f(z.ergebnis, 1) + " °C</td></tr>";
        return;
      }
      z.gruppen.forEach(function (g, i) {
        h += "<tr><td>" + (i === 0 ? e2(z.name) : "") + "</td><td>" + e2(g.label)
          + (g.teile.length ? " (" + e2(g.teile.join(", ")) + ")" : "")
          + '</td><td class="n">' + f(g.H, 1) + '</td><td class="n">'
          + f(g.theta, 1) + ' °C</td><td class="n"></td></tr>';
      });
      h += "<tr><td></td><td><i>" + (z.vergleichbar
          ? "gewichtetes Mittel"
          : "vorgegebene Temperatur, nicht aus diesen Strömen gebildet")
        + '</i></td><td class="n"></td>'
        + '<td class="n"></td><td class="n"><b>' + f(z.ergebnis, 1) + " °C</b></td></tr>";
      if (z.vergleichbar && z.abweichung > ZONEN_TOLERANZ_K) {
        h += '<tr><td></td><td colspan="4" style="color:#B00020">Gegenrechnung weicht um '
          + f(z.abweichung, 3) + " K vom Rechenkern ab. Der Bericht ist nicht "
          + "freizugeben.</td></tr>";
      }
    });
    h += "</table>";

    /* Temperaturkorrekturfaktoren der trennenden Bauteile.
       Wichtig: f hängt an der Raumtemperatur. Dasselbe Bauteil hat gegen einen
       Raum mit 24 Grad einen anderen Faktor als gegen einen mit 15 Grad. Einen
       einzigen Wert zu nennen, ohne die Bezugstemperatur dazuzuschreiben, wäre
       eine Angabe, die man nicht nachrechnen kann. */
    const fk = [];
    (e.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        const g = bt.grenzt_an || {};
        if (g.typ !== "zone") return;
        const name = String(bt.name).split(" (")[0];
        const k = name + "|" + g.ref + "|" + r.theta_i;
        if (fk.some(function (x) { return x.k === k; })) return;
        fk.push({ k: k, name: name, zone: g.ref, theta_i: r.theta_i,
                  f: fFaktor(r, bt, e) });
      });
    });
    if (fk.length) {
      const proBauteil = [];
      fk.forEach(function (x) {
        let g = proBauteil.find(function (y) { return y.name === x.name; });
        if (!g) { g = { name: x.name, werte: [] }; proBauteil.push(g); }
        g.werte.push(x);
      });
      const stueck = proBauteil.map(function (g) {
        const sortiert = g.werte.slice().sort(function (a, b) {
          return a.theta_i - b.theta_i; });
        return g.name + " " + undListe(sortiert.map(function (x) {
          return f(x.f, 2) + " bei " + f(x.theta_i, 0) + " °C";
        })) + " Raumtemperatur";
      });
      h += '<p class="fussnote">Temperaturkorrekturfaktoren der trennenden Bauteile, '
        + "gebildet als f = (θ<sub>i</sub> − θ<sub>u</sub>) / (θ<sub>i</sub> − θ<sub>e</sub>) "
        + "mit θ<sub>e</sub> = " + f(e.klima.theta_e, 1) + " °C: "
        + e2(stueck.join(" · "))
        + ". Weil θ<sub>i</sub> im Zähler und im Nenner steht, ist f je Raumtemperatur "
        + "verschieden; deshalb steht die Bezugstemperatur jeweils dabei. Die Werte "
        + "folgen aus den Zonentemperaturen dieses Abschnitts und treten an die "
        + "Stelle der häufig pauschal verwendeten Tabellenwerte.</p>";
    }
    h += kernHinweise(e, "zonen");
    const t = text(p, "kap6_bewertung");
    h += t ? "<p>" + e2(t) + "</p>"
      : offenerText("Einordnung der errechneten Zonentemperaturen");
    return h;
  }

  /* ---------------- 7 Raumweise Heizlast ---------------- */
  function kapitel7(p, e, K, U, bil, gemischt, zeilen, druck) {
    const mitRH = e.phi_RH_gebaeude > 0;
    /* Bauteilnamen, die den pauschalen Wärmebrückenzuschlag nicht tragen. */
    const ohneZuschlag = [];
    (e.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat === "innen" || bt.kat === "huelle") return;
        const n = String(bt.name).split(" (")[0];
        if (ohneZuschlag.indexOf(n) < 0) ohneZuschlag.push(n);
      });
    });
    /* RAUMWEISE HEIZLAST UND EINE ANGENOMMENE VERTEILUNG — DIE FALSCHE STELLE
     * FÜR SCHWEIGEN.
     *
     * Ist das Gebäude nur zum Teil unterkellert und sagt die Unterlage nicht,
     * WELCHE Räume auf dem Erdreich stehen, verteilt das Werkzeug die belegte
     * Fläche flächenanteilig über alle Räume des Geschosses. Für die
     * Gebäudeheizlast ist das richtig: die Summe stimmt. Für die Zeile eines
     * einzelnen Raumes ist es falsch — der Raum über dem Keller bekommt einen
     * Anteil Bodenplatte, den er nicht hat, der Raum auf dem Erdreich zu
     * wenig. Genau diese Zeilen liest aber, wer eine Heizfläche auslegt.
     *
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski", echter Durchlauf 23.08.2026:
     * 35,53 m² auf dem Erdreich, verteilt als 47,6 Prozent jeder EG-Raumfläche
     * — „WC" bekam 1,03 m² Bodenplatte, „DIELE" 5,75 m². Die Tabelle zeigte
     * beide Zahlen mit zwei Nachkommastellen und ohne ein Wort dazu.
     *
     * Die Räume tragen deshalb eine Marke, und die Fußnote sagt, was sie
     * bedeutet. Die Zahlen selbst bleiben unverändert: sie sind die beste
     * verfügbare Aufteilung, und null anzusetzen wäre die sicher falsche. */
    const tu = p.teilunterkellerung;
    const tuNaeherung = !!(tu && tu.gilt && !tu.unbeziffert && !tu.benannt
                           && (tu.raeume || []).length);
    const tuMarke = {};
    if (tuNaeherung) {
      (tu.raeume || []).forEach(function (x) {
        tuMarke[String(x.geschoss) + "|" + String(x.name)] = x;
      });
    }
    const tuBetroffen = [];

    let h = "<h3>" + U(K.raeume) + " Raumtabelle</h3>"
      + "<table><thead><tr><th>Gesch.</th><th>Raum</th>"
      + '<th class="n">&theta;<sub>i</sub></th><th class="n">A [m²]</th>'
      + '<th class="n">h [m]</th><th class="n">V [m³]</th>'
      + '<th class="n">V&#775; [m³/h]</th><th class="n">&Phi;<sub>T</sub> Hülle [W]</th>'
      + '<th class="n">&Phi;<sub>T</sub> innen [W]</th><th class="n">&Phi;<sub>V</sub> [W]</th>'
      + (mitRH ? '<th class="n">&Phi;<sub>RH</sub> [W]</th>' : "")
      + '<th class="n">&Phi;<sub>HL</sub> [W]</th></tr></thead><tbody>';
    h += (e.raeume || []).map(function (r) {
      const mk = tuMarke[String(r.geschoss) + "|" + String(r.raum)];
      if (mk) tuBetroffen.push(mk);
      return "<tr><td>" + e2(r.geschoss) + "</td><td>" + e2(r.raum)
        + (mk ? " <b>*</b>" : "") + "</td>"
        + '<td class="n">' + f(r.theta_i, 0) + '</td><td class="n">' + f(r.A, 2)
        + '</td><td class="n">' + f(r.h, 2) + '</td><td class="n">' + f(r.V, 1)
        + '</td><td class="n">' + f(r.v_dot, 1) + '</td><td class="n">'
        + f(r.phi_T_huelle, 0) + '</td><td class="n">' + f(r.phi_T_innen, 0)
        + '</td><td class="n">' + f(r.phi_V, 0) + "</td>"
        + (mitRH ? '<td class="n">' + f(r.phi_RH, 0) + "</td>" : "")
        + '<td class="n"><b>' + f(r.phi_raum, 0) + "</b></td></tr>";
    }).join("");
    const sumVdot = (e.raeume || []).reduce(function (s, r) { return s + r.v_dot; }, 0);
    const sumInnen = (e.raeume || []).reduce(function (s, r) { return s + r.phi_T_innen; }, 0);
    h += '</tbody><tfoot><tr><th colspan="3">Summe</th><th class="n">' + f(e.A_gesamt, 2)
      + '</th><th class="n"></th><th class="n">' + f(e.V_gesamt, 1)
      + '</th><th class="n">' + f(sumVdot, 1) + '</th><th class="n">'
      + f(e.phi_T_gebaeude, 0) + '</th><th class="n">' + f(sumInnen, 0)
      + '</th><th class="n">' + f(e.phi_V_gebaeude, 0) + "</th>"
      + (mitRH ? '<th class="n">' + f(e.phi_RH_gebaeude, 0) + "</th>" : "")
      + '<th class="n">' + f(e.phi_raeume_summe, 0) + "</th></tr></tfoot></table>";

    /* Die Fußnote hat zweierlei behauptet, was zu dieser Tabelle nicht
       passen muss: dass in der Spalte etwas steht, und dass die
       Gebäudeheizlast von der Summe der Raumheizlasten abweicht. Ist die
       Spalte durchweg 0 W, sind beide Sätze falsch — und der zweite
       widerspricht dann der Zeile „Summe der Raumheizlasten" in Kapitel 1.
       Beides hängt jetzt an den Zahlen, die in dieser Tabelle stehen. */
    const alleInnenNull = (e.raeume || []).every(function (r) {
      return Math.round(zahl(r.phi_T_innen, 0)) === 0; });
    const gleicheSumme = f(e.phi_gebaeude, 0) === f(e.phi_raeume_summe, 0);
    h += '<p class="fussnote">&Phi;<sub>T</sub> Hülle enthält die Verluste '
      + e2(undListe(nachbarschaften(p, e))) + ". &Phi;<sub>T</sub> innen erfasst den "
      + "Wärmeaustausch zwischen Räumen unterschiedlicher Auslegungstemperatur. Er "
      + "gehört zur raumweisen Betrachtung und geht nicht in gleicher Weise in die "
      + "Gebäudebilanz ein wie die Verluste über die Gebäudehülle."
      + (alleInnenNull
        ? " In dieser Berechnung ist er in allen Räumen 0 W."
        : " Ein negativer Wert bedeutet, dass der Raum von Nachbarräumen Wärme erhält.")
      + (gleicheSumme
        ? " Die Heizlast des Gebäudes beträgt " + f(e.phi_gebaeude, 0)
          + " W und entspricht hier der Summe der Raumheizlasten."
        : " Die Heizlast des Gebäudes ist deshalb nicht die Summe der Raumheizlasten, "
          + "sondern " + f(e.phi_gebaeude, 0) + " W.")
      + "</p>";

    if (tuBetroffen.length) {
      /* Diese Fußnote bleibt AUCH IM DRUCK: sie verhindert, dass eine
         Heizfläche nach einer flächenanteilig verteilten Bodenplatte
         bemessen wird. Im Druck ohne die Wörter „belegt" und „Annahme" —
         die Warnung ist Gebrauchsanweisung, keine Güteaussage. */
      h += '<p class="fussnote"><b>*</b> Das Gebäude ist nur zum Teil '
        + "unterkellert. Auf dem Erdreich stehen " + f(tu.A_erdreich, 2)
        + " m² von „" + e2(tu.geschoss) + "“; diese Summe "
        + (druck ? "folgt aus dem" : "ist aus dem")
        + " Flächenvergleich der beiden untersten Geschosse"
        + (druck ? "" : " belegt") + ". WELCHE Räume "
        + "darauf stehen, sagt die Unterlage nicht. Angesetzt sind deshalb "
        + f(tu.anteil * 100, 1) + " Prozent jeder Raumgrundfläche als "
        + "Bodenplatte gegen Erdreich: "
        + tuBetroffen.map(function (x) {
            return e2(x.name) + " " + f(x.A_boden, 2) + " m²";
          }).join(", ")
        + ". Die Heizlast des Gebäudes ist davon unberührt, die Aufteilung auf "
        + "die einzelnen Räume ist "
        + (druck ? "rechnerisch und nicht am Plan abgelesen" : "eine Annahme")
        + ". Die mit <b>*</b> gekennzeichneten "
        + "Zeilen sind deshalb nicht geeignet, die Heizfläche des jeweiligen "
        + "Raumes zu bemessen; dafür ist am Plan abzulesen, welche Räume nicht "
        + "unterkellert sind, und die Bodenplatte ist ihnen mit voller "
        + "Raumfläche zuzuordnen.</p>";
    }

    /* Herkunft des U-Werts auch hier, aus derselben Quelle wie in der
       Bauteiltabelle und in Anlage 1. Wer die Bauteilbilanz nach dem größten
       Posten durchsieht, soll in derselben Zeile sehen, ob dessen U-Wert
       belegt ist oder angenommen. */
    const klasseBil = {};
    (zeilen || []).forEach(function (z) { klasseBil[z.kurz] = uKlasse(z); });
    /* Die Spalte Herk. (Konfidenzklasse) steht NUR INTERN. */
    h += "<h3>" + U(K.raeume) + " Bauteilbilanz des Gebäudes</h3>"
      + "<table" + (bil.length <= 6 ? ' class="kurz"' : "")
      + '><thead><tr><th style="width:38%">Bauteil</th><th class="n">Fläche [m²]</th>'
      + '<th class="n">U [W/(m²·K)]</th><th class="n">&Phi;<sub>T</sub> [W]</th>'
      + '<th class="n">Anteil [%]</th>'
      + (druck ? "" : '<th class="n">Herk.</th>') + "</tr></thead><tbody>";
    let sumA = 0;
    const grenzeBil = bauteilGrenzbereich(e);
    h += bil.map(function (b) {
      sumA += b.A;
      return "<tr><td>"
        + e2(mitBereich(b.name, grenzeBil[String(b.name).split(" (")[0]] || "", p))
        + '</td><td class="n">' + f(b.A, 1)
        + '</td><td class="n">' + (gemischt[b.name] ? "gemischt" : f(b.U, 2))
        + '</td><td class="n">' + f(b.phi, 0) + '</td><td class="n">'
        + f(e.phi_T_gebaeude ? b.phi / e.phi_T_gebaeude * 100 : 0, 1)
        + (druck ? "</td>"
          : '</td><td class="n">' + (klasseBil[String(b.name).split(" (")[0]] || "–")
            + "</td>")
        + "</tr>";
    }).join("");
    h += '</tbody><tfoot><tr><th>Transmission gesamt</th><th class="n">' + f(sumA, 1)
      + '</th><th class="n"></th><th class="n">' + f(e.phi_T_gebaeude, 0)
      + '</th><th class="n">100,0</th>'
      + (druck ? "" : '<th class="n"></th>') + "</tr></tfoot></table>"
      /* Der Zuschlag liegt nicht auf allen Bauteilen. Der Kern setzt ihn nur
         auf die Kategorie "huelle", also gegen Außenluft und gegen unbeheizte
         Bereiche. Erdberührte Bauteile und die Trennwand zum Nachbargebäude
         tragen ihn nicht. Die frühere Fassung dieser Fußnote hat das Gegenteil
         behauptet; wer die Zeile nachrechnet, fällt darüber. */
      + '<p class="fussnote">Die Flächen sind Innenmaßflächen, die U-Werte ohne '
      + "Wärmebrückenzuschlag angegeben. Im Wärmestrom ist der Zuschlag von "
      + f(e.norm.DELTA_U_WB, 2) + " W/(m²·K) enthalten, angesetzt allerdings nur bei "
      + "den Bauteilen gegen Außenluft und gegen unbeheizte Bereiche"
      + (ohneZuschlag.length
        ? ". " + (ohneZuschlag.length > 1 ? "In den Zeilen " : "In der Zeile ")
          + e2(undListe(ohneZuschlag)) + " ist er deshalb nicht enthalten; dort ist "
          + "mit U gerechnet, nicht mit U + ΔU<sub>WB</sub>."
        : ".")
      + (Object.keys(gemischt).length
        ? " Bei „gemischt“ führt der Bauteilname Flächen mit unterschiedlichen "
          + "U-Werten zusammen; die Einzelwerte stehen in Anlage 1." : "")
      + (druck ? ""
        : " Spalte Herk.: Konfidenzklasse des U-Werts, A belegt, B Schichtrechnung "
          + "oder Tabellenwert, C Annahme, wie in Abschnitt " + K.bauteile + ".")
      + "</p>";
    return h;
  }

  /* ---------------- 8 Offene Punkte ---------------- */
  function kapitel8(punkte, kf, K, ges, e, luecken) {
    /* lk darf fehlen, dann trifft das Kapitel keine Aussage über
       Vollständigkeit, statt eine falsche zu treffen. */
    const lk = luecken || null;
    const hatLuecke = !!(lk && lk.anzahl);
    if (!punkte.length) {
      /* Vorsicht mit dieser Aussage: "keine offenen Punkte" heißt nur, dass die
         Liste leer ist. Ob wirklich alles belegt ist, sagt allein das
         Konfidenzkapitel. Steht dort auch nur ein Eintrag der Klasse C, wäre
         eine Unbedenklichkeitserklärung an dieser Stelle falsch. */
      const cAnzahl = ((kf && kf.eintraege) || []).filter(function (x) {
        return x.klasse === "C"; }).length;
      return '<div class="kasten">In dieser Liste ist kein Punkt verzeichnet, der vor '
        + "der Beauftragung zu klären wäre."
        + (cAnzahl
          ? " Das bedeutet nicht, dass alle Werte belegt sind: Abschnitt " + K.konfidenz
            + " führt " + cAnzahl + " Angaben der Klasse C, also Annahmen ohne Nachweis."
          : "")
        + "</div>"
        /* Eine leere Liste ist der Fall, in dem eine Lücke am meisten anrichtet:
           sie liest sich als Unbedenklichkeitsbescheinigung. */
        + (hatLuecke
          ? '<div class="warn"><b>Die Liste ist leer, aber nicht vollständig.</b> '
            + "Ohne eigenen Punkt bleiben "
            + e2(undListe(lk.alle.map(function (x) {
                return x.kurz + " (" + f(x.phi, 0) + " W)"; })))
            + ". Für diese Bauteile ist entweder kein Anforderungswert hinterlegt "
            + "oder es kam keine Bewertung zustande.</div>"
          : "");
    }
    /* Sortiert ist nach Wirkung, das muss auch dastehen: sonst liest sich die
       Reihenfolge wie Zufall. */
    /* Steht der Beleg der Bauteile oben, ist er unbeziffert und widerspricht
       dem Satz "was sich nicht beziffern lässt, steht am Ende". Dann muss
       dastehen, warum er trotzdem oben steht. */
    /* Wonach die Liste gebildet ist, gehört über die Liste. Ohne diesen Satz
       liest sich eine nach Wirkung geordnete Aufzählung als Aufzählung aller
       Hebel am Gebäude, und genau das ist sie nicht: sie ist die Aufzählung
       der Hebel, für die eine Anforderung oder eine Alternative hinterlegt
       ist. Der Unterschied hat vier Außenwände verschluckt. */
    let h = "<p>Diese Liste enthält: jede Angabe der Konfidenzklasse C, zu der eine "
      + "Alternative hinterlegt ist, jedes Bauteil der Bauteiltabelle, dessen "
      + "gerechneter U-Wert den dort hinterlegten Anforderungswert überschreitet, "
      + "und die vom Bearbeiter eingetragenen Punkte. Sie enthält keine Maßnahme, "
      + "die sich nicht aus einer dieser drei Quellen ergibt.</p>";
    h += "<p>" + (punkte[0] && punkte[0].zuerst
      ? "Der erste Punkt steht oben, weil alle anderen unter seinem Vorbehalt "
        + "stehen. Danach sind die Punkte nach ihrer Wirkung auf die Heizlast "
        + "geordnet, der größte zuerst; was sich nicht beziffern lässt, steht "
        + "am Ende."
      : "Die Punkte stehen nach ihrer Wirkung auf die Heizlast, der größte "
        + "zuerst. Was sich nicht beziffern lässt, steht am Ende.") + "</p>";
    h += '<table><thead><tr><th style="width:32%">Punkt</th><th>Warum er zählt</th>'
      + '<th style="width:24%">Wirkung auf die Heizlast</th></tr></thead><tbody>';
    h += punkte.map(function (x) {
      const w = x.ohne_wirkung
        ? "keine, aber maßgebend für " + e2(x.ohne_wirkung)
        : e2(wirkungText(x.delta, x.zusatz));
      return "<tr><td>" + e2(x.titel) + "</td><td>"
        + (x.warum ? e2(x.warum) : "")
        + "</td><td>" + w + "</td></tr>";
    }).join("");
    h += "</tbody></table>";

    /* Die Lücken der Liste, benannt und beziffert. Ein Bauteil, das oben nicht
       steht, obwohl es Wärme trägt, verschwindet sonst spurlos: die Tabelle
       darüber ist nach Wirkung geordnet, und wer sie liest, hält sie für die
       Reihenfolge aller Hebel. Genau das war der Sperrbefund. */
    if (hatLuecke) {
      const nenne = function (arr) {
        return undListe(arr.map(function (x) {
          return x.kurz + " (" + f(x.phi, 0) + " W)"; }));
      };
      const mehrere = lk.anzahl > 1;
      h += '<div class="warn"><b>Diese Liste ist nicht vollständig.</b> '
        + (lk.ohne_wert.length
          ? "Für " + e2(nenne(lk.ohne_wert)) + " ist die Bauteilart erkannt, aber "
            + "kein Anforderungswert hinterlegt. Ohne Wert entsteht kein bezifferter "
            + "Punkt, deshalb "
            + (lk.ohne_wert.length === 1 ? "fehlt das Bauteil" : "fehlen die Bauteile")
            + " oben. Das ist eine Lücke des Werkzeugs, keine Aussage über das "
            + "Gebäude: was hier keinen Sollwert hat, ist damit nicht "
            + "anforderungsfrei. "
          : "")
        + (lk.ohne_art.length
          ? "Für " + e2(nenne(lk.ohne_art)) + " führt die Tabelle der Technischen "
            + "Mindestanforderungen keine passende Zeile. Ob dafür eine Anforderung "
            + "gilt, entscheidet die prüfende Stelle; ein Hebel dafür steht "
            + "jedenfalls nicht in der Liste oben. "
          : "")
        + (lk.ohne_punkt.length
          ? "Für " + e2(nenne(lk.ohne_punkt)) + " ist ein Anforderungswert "
            + "hinterlegt, es kam aber kein Punkt heraus: "
            + e2(undListe(lk.ohne_punkt.map(function (x) {
                return x.kurz + " " + (x.grund || "ohne Bewertung"); })))
            + ". "
          : "")
        /* Bei einem einzigen Bauteil steht der Wattwert schon im Namen davor.
           Ihn zu wiederholen liest sich wie zwei verschiedene Zahlen. */
        + (mehrere ? "Zusammen tragen diese Bauteile " + f(lk.fehlend, 0)
            + " W, das sind " : "Das sind ")
        + f(lk.summe > 0 ? lk.fehlend / lk.summe * 100 : 0, 0)
        + " Prozent des Transmissionswärmestroms über die Hülle. Die Reihenfolge "
        + "oben ist damit die Reihenfolge der aufgeführten Punkte, nicht die aller "
        + "Hebel am Gebäude.</div>"
        + '<p class="fussnote">Aufgeführt wird hier jedes Hüllbauteil ohne eigenen '
        + "Punkt, dessen Wärmestrom mindestens " + f(lk.schwelle, 0) + " W beträgt. "
        + "Die Schwelle ist ein Hundertstel des Transmissionswärmestroms über die "
        + "Hülle, mindestens " + f(LUECKE_MIN_W, 0) + " W.</p>";
    }

    /* Einmal statt in jeder Zeile: der Vorbehalt gilt für alle Punkte, die aus
       einem verfehlten Anforderungswert stammen. Bei vier Bauteilen stand er
       vorher viermal wortgleich in der Tabelle. */
    if (punkte.some(function (x) { return x.beg; })) {
      h += '<p class="fussnote">Zu den Punkten, die einen Anforderungswert nennen: '
        + "was daraus förderrechtlich folgt, entscheidet die prüfende Stelle. "
        + "Dieser Bericht stellt es nicht fest.</p>";
    }

    /* Wer einen Befund der Selbstprüfung hier findet und einen zweiten nur im
       Prüfkapitel, muss lesen können, wonach die beiden getrennt wurden. */
    if (punkte.some(function (x) { return x.pruefbefund; })) {
      h += '<p class="fussnote">Diese Liste enthält aus der Selbstprüfung nur die '
        + "Befunde der Stufe Fehler: dort fehlt eine Eingabe oder sie widerspricht "
        + "sich, die Rechnung steht auf einer Lücke. Hinweise ordnen "
        + "vorhandene Werte ein und sind keine offene Aufgabe; sie stehen "
        + (K && K.pruefung ? "in Abschnitt " + K.pruefung : "im Prüfkapitel")
        + ".</p>";
    }

    /* Was am Ende herauskommt. Eine Liste von Einzelwirkungen ohne Summe
       lässt den Leser rechnen, und zwar möglicherweise falsch.
       Hier stand vorher pauschal, die Einzelwirkungen addierten sich nicht.
       Im Regelfall stimmt das, aber eben nicht immer, und wo es nicht stimmt,
       widerspricht der Satz der Tabelle direkt darüber: 1,47 + 0,09 + 0,04 +
       0,04 kW sind auf zwei Nachkommastellen genau die 1,64 kW des Kastens.
       Der Grund ist die Sache selbst. Der Transmissionswärmestrom ist linear
       im U-Wert, solange keine zwei Änderungen an derselben Größe angreifen.
       Greifen sie es doch, etwa über die Temperatur eines unbeheizten
       Bereichs, den beide berühren, dann ändert die erste die Grundlage der
       zweiten und die Summe stimmt nicht mehr. Der Bericht behauptet deshalb
       weder das eine noch das andere, sondern rechnet nach und schreibt hin,
       was herauskam. */
    if (ges && e) {
      const einzelSumme = (punkte || []).filter(function (x) {
        return Number.isFinite(x.delta); })
        .reduce(function (a, x) { return a + x.delta; }, 0);
      const abw = einzelSumme - ges.delta;
      /* "alle bezifferten Punkte" las sich als Vollständigkeit: als sei die
         Zahl die Restheizlast nach allem, was am Gebäude möglich ist. Sie ist
         das Ergebnis der Punkte dieser Liste, mehr nicht. Solange die Liste
         eine Lücke hat, steht das ausdrücklich dabei. */
      h += '<div class="kasten"><b>Werden die ' + f(ges.anzahl, 0)
        + " bezifferten Punkte dieser Liste umgesetzt, liegt die Norm-Heizlast des "
        + "Gebäudes bei "
        + kw(ges.phi) + " statt " + kw(e.phi_gebaeude) + ".</b> "
        + (hatLuecke
          ? "Das ist keine Restheizlast des Gebäudes: die Liste ist nach dem Kasten "
            + "darüber unvollständig, und was dort fehlt, ist in dieser Zahl nicht "
            + "enthalten. "
          : "Weiter kommt man über die Bauteilanforderungen nicht: die Liste führt "
            + "jedes Bauteil, dessen U-Wert die hinterlegte Anforderung überschreitet, "
            + "und kein Hüllbauteil mit nennenswertem Wärmestrom fehlt darin. ")
        + "Das sind "
        + f(Math.abs(ges.delta) / 1000, 2) + " kW "
        + (ges.delta < 0 ? "weniger" : "mehr")
        + ". Die Zahl ist ein zweiter Durchlauf des Rechenkerns mit allen "
        + "Änderungen zugleich, nicht die aufaddierte Spalte. "
        + (Math.abs(abw) < 10
          ? "Hier führt beides zum selben Ergebnis: die Einzelwirkungen greifen an "
            + "verschiedenen Bauteilen an, und der Transmissionswärmestrom ist im "
            + "U-Wert linear. Verlassen kann man sich darauf nicht. Sobald zwei "
            + "Änderungen denselben unbeheizten Bereich berühren, verschiebt die "
            + "erste die Temperatur, gegen die die zweite rechnet."
          : "Die Spalte aufaddiert ergäbe " + f(Math.abs(einzelSumme) / 1000, 2)
            + " kW und damit " + f(Math.abs(abw), 0) + " W "
            + (Math.abs(einzelSumme) > Math.abs(ges.delta) ? "zu viel" : "zu wenig")
            + ". Die Änderungen greifen ineinander; maßgebend ist der zweite "
            + "Durchlauf.")
        + "</div>";

      /* Die Zahl entscheidet über den Wärmeerzeuger und stand bisher ohne
         Bedingung da. Sie gilt für ein Gebäude, das es noch nicht gibt. Wer
         danach bestellt, bevor gebaut ist, kauft zu klein. */
      const gebaut = (punkte || []).filter(function (x) {
        return x.kurz && Number.isFinite(x.delta); })
        .map(function (x) { return x.kurz; });
      /* Der Kasten gehört an den grünen darüber. Fiel er auf die nächste
         Seite, stand die Zahl auf der einen Seite und die Bedingung, unter
         der sie gilt, auf der anderen. */
      h += '<div class="warn" style="break-before:avoid;page-break-before:avoid">'
        + "<b>Nach " + kw(ges.phi)
        + " ausgelegt wird erst, wenn gebaut ist.</b> Der Wert beschreibt einen "
        + "Zustand, den dieses Gebäude heute nicht hat. Bis "
        + (gebaut.length
          ? undListe(gebaut) + " " + (gebaut.length === 1 ? "ausgeführt und der "
              + "erreichte U-Wert belegt ist" : "ausgeführt und die erreichten "
              + "U-Werte belegt sind")
          : "die genannten Änderungen ausgeführt und belegt sind")
        + ", gilt für die Bestellung des Wärmeerzeugers " + kw(e.phi_gebaeude)
        + ". Wird vorher nach der kleineren Zahl bestellt und eine der Maßnahmen "
        + "entfällt oder fällt schwächer aus als angesetzt, ist der Wärmeerzeuger "
        + "zu klein. Nach Ausführung ist die Heizlast mit den belegten Werten neu "
        + "zu rechnen.</div>";
    }
    return h;
  }

  /* ---------------- 9 Plausibilitätsprüfungen ---------------- */
  /* ------------------------------------------------------------------ *
   * Gegenproben und Grenzen des Kontrollblatts
   * ------------------------------------------------------------------ *
   * Das Kontrollblatt teilt seine Zeilen in drei Gruppen (siehe den Kopf von
   * modul_kontrollblatt.js): Befunde und Prüfungen stehen in der Liste zum
   * Abarbeiten, Grenzen stehen HIER. Eine Grenze ist eine Frage, die das
   * Werkzeug auf jedem Projekt stellen und nie selbst beantworten kann —
   * „gegen welche zweite Zahl ist das geprüft?", wenn es keine zweite Zahl
   * gibt. In einer Liste zum Abarbeiten ist so eine Zeile wertlos und
   * schädlich: sie steht immer da und erzieht dazu, die Liste zu
   * überblättern. Im Bericht ist sie das Gegenteil — sie sagt dem Leser
   * genau, wie weit diese Berechnung trägt.
   *
   * Beide Abschnitte kommen aus MODUL_KONTROLLBLATT, damit Blatt und Bericht
   * nicht zwei verschiedene Wahrheiten drucken.
   *
   * Der erste Abschnitt ist die Gegenprobe: was gegen was gerechnet wurde und
   * was dabei herauskam. Ohne ihn wäre „alle Proben bestanden" eine
   * Behauptung ohne Beleg — der Leser sieht nur die Befunde, nie die Proben,
   * die keinen ergaben. */
  function gegenprobenKapitel(p, K, U) {
    const KB = typeof window !== "undefined" && window.MODUL_KONTROLLBLATT;
    if (!KB || typeof KB.gegenproben !== "function") return "";
    let gp = [], gr = [];
    try {
      gp = KB.gegenproben(p) || [];
      gr = KB.grenzen(p) || [];
    } catch (x) { return ""; }
    if (!gp.length && !gr.length) return "";

    const nk = function (z) { return z.einheit === "m²" ? 2 : 0; };
    const zahlTxt = function (v, z) {
      return v === null || v === undefined ? "–" : f(v, nk(z));
    };
    const ERGEBNIS = { gut: "bestanden", bestaetigt: "zur Kenntnis genommen",
                       hinweis: "Hinweis", warnung: "angeschlagen",
                       offen: "angeschlagen", fehler: "angeschlagen" };
    let h = "";
    if (gp.length) {
      const bestanden = gp.filter(function (z) {
        return z.stufe === "gut" || z.stufe === "bestaetigt"; }).length;
      h += "<h3>" + U(K.pruefung) + " Gegenproben des Kontrollblatts</h3>"
        + "<p>Jede Zeile hält eine Zahl dieser Berechnung gegen eine zweite, die "
        + "auf einem anderen Weg entstanden ist. " + anzahlWort(gp.length, "Probe",
          "Proben") + (gp.length === 1 ? " ist" : " sind") + " gelaufen, "
        + bestanden + " davon ohne Beanstandung. "
        + "Eine Probe, die nichts findet, ist eine Aussage und keine "
        + "Selbstverständlichkeit; sie steht deshalb mit hier.</p>"
        + '<table><thead><tr><th style="width:26%">Probe</th>'
        + '<th class="n" style="width:12%">erfasst</th>'
        + '<th class="n" style="width:12%">gegengezählt</th>'
        + '<th style="width:32%">Woher die zweite Zahl stammt</th>'
        + '<th style="width:18%">Ergebnis</th></tr></thead><tbody>'
        + gp.map(function (z) {
            const gut = z.stufe === "gut" || z.stufe === "bestaetigt";
            return "<tr><td>" + e2(z.titel) + '</td><td class="n">'
              + zahlTxt(z.ist, z) + e2(z.einheit ? " " + z.einheit : "")
              + '</td><td class="n">' + zahlTxt(z.soll, z)
              + e2(z.soll === null ? "" : (z.einheit ? " " + z.einheit : ""))
              + "</td><td>" + e2(z.quelle_soll || "aus dem Projekt selbst")
              + "</td><td" + (gut ? "" : ' style="color:#B00020"') + ">"
              + e2(ERGEBNIS[z.stufe] || String(z.stufe)) + "</td></tr>";
          }).join("")
        + "</tbody></table>";
    }
    if (gr.length) {
      h += "<h3>" + U(K.pruefung) + " Was diese Berechnung nicht belegt</h3>"
        + "<p>Diese Punkte sind keine Beanstandungen und keine offenen Aufgaben. "
        + "Es sind die Stellen, an denen den Unterlagen nichts entgegenzuhalten "
        + "war: eine zweite Zahl fehlt, oder das Werkzeug hat an ihrer Stelle "
        + "eine benannte Annahme gesetzt. Sie stehen hier und nicht in einer "
        + "Liste zum Abarbeiten, weil weder Verfasser noch Bearbeiter sie am "
        + "Bildschirm schließen können — nur eine weitere Unterlage kann das. "
        + "Was genau, steht jeweils im letzten Satz.</p>"
        + '<table><thead><tr><th style="width:26%">Punkt</th>'
        + "<th>Wogegen nicht geprüft werden konnte</th>"
        + '<th style="width:28%">Was die Grenze aufheben würde</th>'
        + "</tr></thead><tbody>"
        + gr.map(function (z) {
            return "<tr><td>" + e2(z.titel) + "</td><td>" + e2(z.text)
              + "</td><td>" + e2(z.abhilfe || "keine Unterlage benannt")
              + "</td></tr>";
          }).join("")
        + "</tbody></table>";
    }
    return h;
  }

  function kapitel9(p, e, pz, K, U) {
    const kern = window.KERN_HEIZLAST_NORM;
    /* Jede Zeile nennt jetzt ihr Kriterium. Ohne Kriterium ist „bestanden"
       eine Behauptung: der Leser kann nicht sehen, woran gemessen wurde und
       wie weit die Zahl vom Anschlagen entfernt war. */
    let h = '<table><thead><tr><th style="width:29%">Prüfung</th>'
      + '<th class="n" style="width:10%">Ergebnis</th>'
      + '<th class="n" style="width:10%">Verglichen mit</th>'
      + '<th style="width:18%">Herkunft des Vergleichswerts</th>'
      + '<th style="width:20%">Kriterium</th>'
      + '<th style="width:13%">Status</th></tr></thead><tbody>';
    h += pz.map(function (x) {
      const gut = x.status === "bestanden" || x.status === "im Erwartungsbereich";
      const farbe = gut ? "" : ' style="color:#B00020"';
      /* Unter dem Namen der Prüfung steht, wie die Zahl in der Spalte
         „Ergebnis" zustande kam. Ohne das stehen zwei gleiche Zahlen
         nebeneinander und der Leser kann nicht sehen, ob sie auf zwei Wegen
         entstanden sind oder ob sich hier eine Zahl selbst bestätigt. */
      return "<tr><td>" + e2(x.pruefung)
        + (x.weg ? '<br><span class="klein">Ergebnis: ' + e2(x.weg) + "</span>" : "")
        + '</td><td class="n">'
        + f(x.ist, x.nk === undefined ? 2 : x.nk) + e2(x.einheit || "")
        + '</td><td class="n">' + f(x.soll, x.nk === undefined ? 2 : x.nk)
        + e2(x.einheit || "") + "</td><td>" + e2(x.quelle) + "</td><td>"
        + e2(x.kriterium || "kein Kriterium hinterlegt") + "</td><td" + farbe + ">"
        + e2(x.status) + "</td></tr>";
    }).join("");
    h += "</tbody></table>";
    h += '<p class="klein">Die Spalte „Ergebnis“ und die Spalte „Verglichen mit“ '
      + "führen in jeder Zeile zwei Größen, die auf verschiedenen Wegen entstanden "
      + "sind; unter dem Namen der Prüfung steht, auf welchem. Stimmen sie überein, "
      + "ist das eine Aussage und keine Selbstverständlichkeit. Die Additionsprobe "
      + "schlägt an, wenn in der Anlage eine Bauteilzeile fehlt, doppelt steht oder "
      + "eine ihrer Spalten nicht zur Zeile passt. Die Zonentemperatur schlägt an, "
      + "wenn die Iteration des Rechenkerns nicht ausgelaufen ist oder wenn die "
      + "beiden Aufstellungen der Wärmeströme nicht dieselben Bauteile führen. Eine "
      + "Zeile, die eine Zahl mit sich selbst vergleicht, kann nicht anschlagen und "
      + "steht deshalb nicht in dieser Tabelle.</p>";
    /* Die Hinweise der einzelnen Zeilen wurden bisher gesetzt, aber nie
       gedruckt. Damit fehlte im Bericht genau der Satz, der den Widerspruch
       zum Kapitel Objekt und Datengrundlage auflöst: dort steht, dass dieses
       Gebäude nicht über einen Kennwert je Quadratmeter zu beurteilen ist. */
    pz.forEach(function (x) {
      if (x.hinweis) h += '<p class="fussnote">' + e2(x.hinweis) + "</p>";
    });

    const pr = window.App && window.App.pruefung;
    if (pr) {
      const bz = pr.bestaetigung || null;
      const ampel = { rot: ["Nicht belastbar", "#B00020"],
                      gelb: ["Mit Einschränkung belastbar", "#8A6D00"],
                      annahme: ["Belastbar unter genannten Annahmen", "#8A6D00"],
                      gruen: ["Belastbar", "#2C6E2A"] }[pr.ampel] || ["", "#555"];
      /* Die offenen Fragen des Kontrollblatts (Stufe „offen") wurden bisher
         in der Tabelle darunter gedruckt, aber in dieser Zeile nicht
         gezählt. Bei sieben offenen Fragen stand oben „1 Fehler, 3
         Warnungen, 6 Hinweise" und darunter siebzehn Zeilen. */
      const teile = [anzahlWort(pr.zaehl.fehler, "Fehler", "Fehler")];
      if (pr.zaehl.offen) {
        teile.push(anzahlWort(pr.zaehl.offen, "offene Frage", "offene Fragen"));
      }
      teile.push(anzahlWort(pr.zaehl.hinweis, "Hinweis", "Hinweise"));
      if (pr.zaehl.bestaetigt) {
        teile.push(anzahlWort(pr.zaehl.bestaetigt, "zur Kenntnis genommener Punkt",
          "zur Kenntnis genommene Punkte"));
      }
      const ampelKasten = '<div class="kasten" style="border-color:' + ampel[1]
        + '"><b style="color:' + ampel[1] + '">Gesamtergebnis: ' + ampel[0] + "</b><br>"
        + e2(teile.join(", ")) + " und "
        + anzahlWort(pr.zaehl.gut, "Prüfung", "Prüfungen") + " ohne Befund.<br>"
        + '<span style="font-weight:400">'
        + e2(ampelSatz(pr.ampel, bz && bz.bestaetigt)) + "</span></div>";
      h += "<h3>" + U(K.pruefung) + " Befunde der Selbstprüfung</h3>";
      /* Was der Bearbeiter zur Kenntnis genommen hat, steht nicht mehr in
         dieser Tabelle. Sonst wächst der Bericht mit jedem Haken, statt
         ruhiger zu werden: siebzehn Zeilen bekamen siebzehnmal denselben
         Nachsatz angehängt. Ihre Stelle nimmt der Kasten darunter ein. */
      const rel = pr.pruefungen.filter(function (x) {
        return x.stufe !== "gut" && x.stufe !== "bestaetigt";
      });
      let tabelle = "";
      if (rel.length) {
        tabelle = '<table><thead><tr><th style="width:14%">Stufe</th>'
          + '<th style="width:26%">Befund</th><th>Text</th></tr></thead><tbody>'
          + rel.map(function (x) {
              /* Ohne den Rückfall stand für jede Stufe, die diese Liste
                 nicht kennt, das Wort „undefined" im unterschriebenen
                 Bericht. Genau das tat die Stufe „offen" des
                 Kontrollblatts, und zwar ohne dass irgendetwas bestätigt
                 sein musste. */
              const t = STUFENWORT[x.stufe] || String(x.stufe || "Befund");
              return "<tr><td>" + e2(t) + "</td><td>" + e2(x.titel) + "</td><td>"
                + e2(x.text) + "</td></tr>";
            }).join("") + "</tbody></table>";
        h = h + ampelKasten + tabelle;
      } else if (!(bz && bz.bestaetigt)) {
        h += ampelKasten
          + '<div class="kasten">Keine Befunde. Alle Prüfungen sind ohne Beanstandung.</div>';
      } else {
        /* Die saubere Ausgabe. Der Kasten mit dem Satz über die Durchsicht
           erklärt die Zahl im Ampelkasten unmittelbar darüber; ein
           Seitenumbruch dazwischen ließe auf der einen Seite „Belastbar, 17
           zur Kenntnis genommene Punkte" stehen und die Auflösung erst auf
           der nächsten. Beide gehen deshalb gemeinsam auf die nächste
           Seite, statt getrennt zu werden.
           Nur hier, nicht im Zwischenstand: dort steht darüber eine Tabelle,
           die durchaus umbrechen darf und auch muss. */
        h += '<div class="zusammen">' + ampelKasten
          + durchgesehenKasten(bz, 0) + "</div>";
      }
      if (rel.length) h += durchgesehenKasten(bz, rel.length);
    }
    h += gegenprobenKapitel(p, K, U);
    if (kern && kern.selbsttest) {
      const s = kern.selbsttest();
      /* Ohne den zweiten Satz liest sich das wie eine bestandene Prüfung
         dieses Gebäudes. Es ist keine: die Selbsttests prüfen den Rechenweg
         der Software an eigenen Beispielen, nicht die Eingaben dieses
         Projekts. Und sie können hier gar nicht rot sein, weil ein Bericht
         mit gescheitertem Selbsttest nicht ausgegeben wird. */
      h += "<h3>" + U(K.pruefung) + " Selbsttest der Software</h3>"
        + "<p>Der Rechenkern prüft bei jedem Start " + s.anzahl + " eigene Rechenbeispiele "
        + "nach, deren Ergebnis von Hand gerechnet im Quelltext hinterlegt ist. Sie waren "
        + "zum Zeitpunkt dieser Berechnung "
        + (s.ok ? "vollständig bestanden." : '<span style="color:#B00020">NICHT '
           + "vollständig bestanden.</span>")
        + " Das ist eine Aussage über den Rechenweg der Software, nicht über dieses "
        + "Gebäude: geprüft werden die Formeln an bekannten Beispielen, nicht die "
        + "Eingaben dieses Projekts. Der Satz steht deshalb nicht in der Prüftabelle "
        + "oben. Er kann an dieser Stelle auch nie negativ ausfallen, weil das Werkzeug "
        + "bei gescheitertem Selbsttest überhaupt keinen Bericht ausgibt.</p>";
    }
    return h;
  }

  /* ---------------- 10 Quellen, Annahmen und Konfidenz ---------------- */
  function kapitel10(p, e, kf, K, punkte) {
    let h = '<p class="klein">A bedeutet: aus einer Originalunterlage entnommen oder '
      + "maßstäblich abgegriffen. B bedeutet: normativer Tabellenwert oder daraus "
      + "abgeleitet. C bedeutet: fachliche Annahme, die vor der Ausführung zu bestätigen "
      + "ist.</p>";
    /* Die Begründung je Eintrag, an einer Stelle gebildet, damit das Bündeln
       weiter unten denselben Text vergleicht, der auch gedruckt wird. */
    const an10 = annahmeAnteil(e);
    function grundVon(x) {
      const zusatz = text(p, "konfidenz." + x.schluessel);
      let grund = x.quelle || "";
      if (zusatz) grund += (grund ? " " : "") + zusatz;
      return grund;
    }
    /* „LEITPARAMETER." stand hier in Großbuchstaben, genau einmal im ganzen
       Bericht, und wurde an keiner Stelle erklärt. Ein Wort, das nur der
       kennt, der den Quelltext gelesen hat, ist im Bericht ein vergessener
       Werkstattzettel. Es steht jetzt als Satz da, der sich selbst erklärt,
       und trägt die Zahl mit, aus der die Einstufung stammt: der Anteil am
       Transmissionswärmestrom, nach dem der Leitparameter bestimmt wird
       (größtes phi unter den Einträgen der Klasse C). */
    function leitSatz(x) {
      const anteil = an10 && an10.phi_gesamt > 0 && Number.isFinite(x.phi)
        ? f(Math.abs(x.phi) / an10.phi_gesamt * 100, 0) : null;
      return "Leitparameter dieser Berechnung: unter allen Annahmen ohne Nachweis "
        + "wirkt diese am stärksten auf das Ergebnis"
        + (anteil !== null
          ? "; auf sie entfallen " + anteil + " Prozent des Transmissionswärmestroms"
          : "")
        + ". Wird nur ein Wert dieser Liste am Gebäude belegt, dann dieser.";
    }

    /* Zwanzig Zeilen mit wortgleicher Begründung sind zwanzigmal dieselbe
       Auskunft und kosteten drei Seiten. Gleiche Klasse und wortgleiche
       Begründung werden deshalb zu einer Zeile zusammengefasst; die Angaben
       selbst bleiben vollständig und einzeln lesbar, nur der Satz daneben
       steht einmal statt zwanzigmal. Ab drei Vorkommen lohnt das, darunter
       zerreißt es die Tabelle mehr, als es spart. Der Leitparameter bleibt
       immer allein stehen: seine Begründung ist eine andere. */
    const zaehler = {};
    kf.eintraege.forEach(function (x) {
      if (x.leit) return;
      const k = x.klasse + " " + grundVon(x);
      zaehler[k] = (zaehler[k] || 0) + 1;
    });
    const erledigt = {};

    h += '<table><thead><tr><th style="width:8%">Klasse</th><th style="width:40%">Angabe</th>'
      + "<th>Quelle bzw. Begründung</th></tr></thead><tbody>";
    h += kf.eintraege.map(function (x) {
      const grund = grundVon(x);
      if (x.leit) {
        return '<tr><td class="leit">' + x.klasse + "</td><td>" + e2(x.angabe)
          + '</td><td><b class="leit">' + e2(leitSatz(x)) + "</b> " + e2(grund)
          + "</td></tr>";
      }
      const k = x.klasse + " " + grund;
      if (zaehler[k] >= 3) {
        if (erledigt[k]) return "";
        erledigt[k] = true;
        const gruppe = kf.eintraege.filter(function (y) {
          return !y.leit && y.klasse + " " + grundVon(y) === k; });
        return "<tr><td>" + x.klasse + "</td><td>"
          + gruppe.map(function (y) { return e2(y.angabe); }).join("<br>")
          + "</td><td>" + e2(grund) + '<br><span class="klein">Diese Begründung gilt '
          + "für alle " + f(gruppe.length, 0) + " Angaben dieser Zeile gleichermaßen. "
          + "Sie stehen zusammen, weil sie dieselbe Quelle haben, nicht weil sie "
          + "zusammen bewertet würden.</span></td></tr>";
      }
      return "<tr><td>" + x.klasse + "</td><td>" + e2(x.angabe) + "</td><td>"
        + e2(grund) + "</td></tr>";
    }).join("") + "</tbody></table>";

    const bezifferbar = punkte.some(function (x) { return x.delta !== null; });
    /* Kein Werkzeug bescheinigt sich selbst, dass sein Erzeugnis einer
       Förderanforderung genügt. Das entscheidet die prüfende Stelle. Der
       Bericht sagt deshalb, was er ist, und überlässt die Bewertung dem
       Fachplaner, der ihn zeichnet. */
    h += '<div class="kasten">Diese Berechnung ersetzt keinen hydraulischen Abgleich und '
      + "keine Heizflächenauslegung. Sie ist die Grundlage dafür. Sie folgt dem Verfahren "
      + "nach DIN EN 12831-1; ob sie im Einzelfall den Anforderungen eines Förderprogramms "
      + "oder eines Nachweises genügt, beurteilt die prüfende Stelle. Die verwendeten "
      + "Annahmen sind in der Tabelle oben offengelegt"
      + (punkte.length ? ", die vor einer Beauftragung zu klärenden Punkte in Abschnitt "
          + K.offen + "." : ".")
      + "</div>";
    if (!bezifferbar && punkte.length) {
      /* Vorsicht mit der Begründung: es kann auch an einer nicht durchführbaren
         Vergleichsrechnung liegen, nicht nur am fehlenden Alternativwert. */
      h += '<p class="klein">Für keinen der offenen Punkte ließ sich die Wirkung auf '
        + "die Heizlast beziffern. Dazu müsste zu jedem Punkt ein belastbarer "
        + "Alternativwert vorliegen, mit dem die Rechnung ein zweites Mal geführt "
        + "werden kann. Die Punkte bleiben trotzdem zu klären; ohne Zahl daneben ist "
        + "nur offen, wie stark sie wirken.</p>";
    }
    return h;
  }

  /* ---------------- Anlage 2 ---------------- */
  /** Die Vermerke, die der Bearbeiter beim Abhaken dazugeschrieben hat.
   *  Leer, solange keiner geschrieben wurde: eine Anlage mit einer leeren
   *  Tabelle ist schlimmer als keine. */
  function vermerkzeilen() {
    const pr = (typeof window !== "undefined" && window.App
      && window.App.pruefung) || null;
    return ((pr && pr.pruefungen) || []).filter(function (x) {
      return x.bestaetigt && String(x.bestaetigt.grund || "").trim();
    }).map(function (x) {
      return { titel: x.titel || "Punkt der Selbstprüfung",
               grund: String(x.bestaetigt.grund).trim(),
               wer: String(x.bestaetigt.wer || "").trim(),
               zeit: zeitpunkt(x.bestaetigt.zeit) };
    });
  }

  function anlage2() {
    const v = vermerkzeilen();
    if (!v.length) return "";
    return "<p>Die Selbstprüfung des Werkzeugs wirft Punkte auf, die am Plan oder am "
      + "Gebäude zu entscheiden sind. Zu den folgenden Punkten hat der Unterzeichner "
      + "beim Durchsehen einen Vermerk hinterlegt. Der Wortlaut stammt von ihm, nicht "
      + "vom Werkzeug; er ist die fachliche Begründung dafür, dass der Punkt der "
      + "Berechnung nicht entgegensteht.</p>"
      + '<table><thead><tr><th style="width:26%">Punkt</th>'
      + '<th>Vermerk des Bearbeiters</th>'
      + '<th style="width:24%">Aufgenommen</th></tr></thead><tbody>'
      + v.map(function (x) {
          return "<tr><td>" + e2(x.titel) + "</td><td>" + e2(x.grund) + "</td><td>"
            + e2([x.wer, x.zeit].filter(Boolean).join(", ")) + "</td></tr>";
        }).join("")
      + "</tbody></table>";
  }

  /** Der Abschnitt „Prüfung" der DRUCKFASSUNG, unmittelbar vor der
   *  Unterschrift.
   *
   *  Sebastians Vorgabe vom 26.08.2026 (Punkt 14): im Bericht an den
   *  Auftraggeber steht KEIN Satz über die Selbstprüfung des Werkzeugs und
   *  keine Zahl aufgeworfener Punkte. Was bleibt, ist die Erklärung des
   *  Ausstellers: ein Fachmann hat die Berechnung durchgesehen. Das ist eine
   *  Tatsache über dieses Dokument, keine interne Warnung — deshalb bleibt
   *  auch der Name des Bearbeiters und der Zeitpunkt stehen. Was
   *  verschwunden ist: das Wort Selbstprüfung, der Zähler der Punkte und der
   *  Verweis auf die interne Fassung.
   *
   *  Die Klasse „kenntnisnahme" ist die Marke, über die die druckSuche
   *  diesen Kasten als begründete Ausnahme kennt: der Wortstamm „prüf"
   *  steht hier zwangsläufig. */
  function kenntnisnahmeDruck() {
    const pr = (typeof window !== "undefined" && window.App)
      ? window.App.pruefung : null;
    const bz = (pr && pr.bestaetigung) || null;
    if (!bz || !bz.bestaetigt) return "";
    const wer = (bz.namen && bz.namen.length) ? undListe(bz.namen) : "";
    const wann = bz.stand ? (bz.tage > 1 ? " bis zum " + bz.stand : " am " + bz.stand) : "";
    return '<div class="kasten kenntnisnahme"><b>Prüfung</b><br>'
      + "Die Berechnung wurde durch den Bearbeiter auf Plausibilität und "
      + "Vollständigkeit der für den dargestellten Berechnungszustand "
      + "hinterlegten Angaben geprüft."
      + (wer ? " Durchgesehen von " + e2(wer) + e2(wann) + "." : "")
      + "</div>";
  }

  /* ---------------- Anlage 1 ---------------- */
  function anlage1(p, e, zeilen, druck) {
    const hatErdreich = hatErdreichBauteil(e);
    let h = "<p>Vollständige Aufstellung aller Bauteile. f ist der "
      + "Temperaturkorrekturfaktor (&theta;<sub>i</sub> minus &theta;<sub>j</sub>) geteilt "
      + "durch (&theta;<sub>i</sub> minus &theta;<sub>e</sub>)."
      + (hatErdreich
        ? " Bei den erdberührten Bauteilen steht in dieser Spalte nicht dieser Quotient, "
          + "sondern das Produkt f<sub>g1</sub> · f<sub>g2</sub> · G<sub>w</sub> nach "
          + "DIN EN 12831-1 Abschnitt 6.2; dort tritt dieses Verfahren an die Stelle der "
          + "reinen Temperaturdifferenz. Deshalb passt der Wert dieser Zeilen nicht zu "
          + "&theta;<sub>i</sub> und &theta;<sub>j</sub> daneben."
        : "")
      + " U<sub>eff</sub> enthält den Wärmebrückenzuschlag bei allen Bauteilen gegen "
      + "Außenluft und gegen unbeheizte Bereiche. Bei erdberührten Bauteilen, bei "
      + "Innenbauteilen und gegen ein Nachbargebäude ist er nicht angesetzt; dort steht "
      + "in der Spalte U<sub>eff</sub> derselbe Wert wie in der Spalte U.</p>"
      + '<table><thead><tr><th style="width:16%">Raum</th><th>Bauteil</th>'
      + '<th class="n">A [m²]</th><th class="n">U</th><th class="n">U<sub>eff</sub></th>'
      + '<th class="n">&theta;<sub>i</sub></th><th class="n">&theta;<sub>j</sub></th>'
      + '<th class="n">f</th><th class="n">&Phi;<sub>T</sub> [W]</th>'
      + (druck ? "" : '<th class="n">Herk.</th>')
      + "</tr></thead><tbody>";
    /* Herkunft des U-Werts je Zeile, damit auch in der vollständigen
       Aufstellung belegter Wert und Annahme auseinanderzuhalten sind.
       Die Spalte samt Legende steht NUR INTERN. */
    const klasseVon = {};
    (zeilen || []).forEach(function (z) { klasseVon[z.kurz] = uKlasse(z); });
    (e.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt, i) {
        const kl = klasseVon[String(bt.name).split(" (")[0]] || "–";
        const g1 = bt.grenzt_an || {};
        h += "<tr><td>" + (i === 0 ? e2((r.geschoss ? r.geschoss + " " : "") + r.raum) : "")
          + "</td><td>"
          + e2(mitBereich(bt.name, g1.typ === "zone" ? g1.ref : "", p))
          + '</td><td class="n">' + f(bt.A, 2)
          + '</td><td class="n">' + f(bt.U, 2) + '</td><td class="n">' + f(bt.U_eff, 2)
          + '</td><td class="n">' + f(r.theta_i, 0) + '</td><td class="n">'
          + f(bt.theta_j, 1) + '</td><td class="n">' + f(fFaktor(r, bt, e), 3)
          + '</td><td class="n">' + f(bt.phi, 0)
          + (druck ? "</td>" : '</td><td class="n">' + kl + "</td>") + "</tr>";
      });
    });
    return h + "</tbody></table>"
      + (druck ? ""
        : '<p class="fussnote">Spalte Herk.: Konfidenzklasse des U-Werts, A belegt, '
          + "B Schichtrechnung oder Tabellenwert, C Annahme. Ein Strich heißt, dass zu "
          + "diesem Bauteilnamen kein Bauteiltyp gefunden wurde. Die Begründung je Bauteil "
          + "steht im Kapitel zu Quellen und Konfidenz. Die Flächen dieser Tabelle sind "
          + "davon nicht erfasst; ihre Herkunft ist dort gesondert ausgewiesen.</p>");
  }

  /* ------------------------------------------------------------------ *
   * 8  Ausgabe
   * ------------------------------------------------------------------ */
  /* MELDEN, OHNE DEN TAB ANZUHALTEN.
   *
   * Bis zum 23.08.2026 stand vor dem Bericht zweimal confirm() und danach
   * ein Aufbau, der mit Planabbildungen über eine Minute braucht — ohne
   * jede Anzeige. Ein Prüfer hielt das Werkzeug deswegen drei Minuten lang
   * für abgestürzt, und beim automatisierten Nachstellen desselben Klicks
   * blieb der Tab so fest stehen, dass er nur noch zu schließen war.
   *
   * Jetzt: Meldungen in der Seite, Rückfragen als Zusage, und über dem
   * Aufbau ein laufender Hinweis „Der Bericht wird aufgebaut". Zwischen
   * Anzeige und Arbeit liegt ein warten(); ohne das malt der Browser die
   * Anzeige erst, wenn die Arbeit schon vorbei ist. */
  function melde(text, opt) {
    const D = window.MODUL_DIALOG;
    if (D) return D.sagen(text, opt);
    if (window.console) window.console.log(text);
    return { weg() {} };
  }

  /** Blaettert zum wartenden Vorschlag der bewertenden Absaetze (die Karte
   *  traegt die Kennung bewVorschlag, modul_bewertung). Der Aufschub laesst
   *  dem Browser einen Bildaufbau, damit die Karte schon gezeichnet ist. */
  function zumVorschlag() {
    setTimeout(function () {
      const ziel = document.getElementById("bewVorschlag");
      if (!ziel || !ziel.scrollIntoView) return;
      /* Erst weich, dann NACHGEPRUEFT: in der Abnahme am 24.08.2026 lief
         "smooth" im automatisierten Chrome gar nicht an (und in einem
         Reiter im Hintergrund laeuft es nie) — die Seite blieb oben stehen.
         Wer nach 400 ms noch nicht unterwegs ist, springt hart. Ankommen
         schlaegt Eleganz. */
      ziel.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () {
        const r = ziel.getBoundingClientRect();
        if (r.top < -80 || r.top > window.innerHeight * 0.9) {
          ziel.scrollIntoView({ block: "start" });
        }
      }, 400);
    }, 80);
  }
  function frage(opt) {
    const D = window.MODUL_DIALOG;
    return D ? D.fragen(opt) : Promise.resolve(false);
  }

  /** opt.fassung: "intern" für den Vollbericht mit Herkunft und Prüfungen.
   *  Ohne Angabe entsteht die DRUCKFASSUNG — der Knopf „Bericht" liefert
   *  das Dokument, das an den Auftraggeber geht. */
  function erzeugen(opt) {
    const fassung = (opt && opt.fassung) === "intern" ? "intern" : "druck";
    const A = window.App;
    if (!A.ergebnis || A.ergebnis.fehlerhaft) {
      melde("Es liegt kein Rechenergebnis vor.", { stufe: "warnung" });
      return Promise.resolve(false);
    }
    if (!A.p.raeume.length) {
      melde("Das Raumbuch ist leer.", { stufe: "warnung" });
      return Promise.resolve(false);
    }

    const kern = window.KERN_HEIZLAST_NORM;
    if (kern && kern.selbsttest && !kern.selbsttest().ok) {
      melde("Der Selbsttest des Rechenkerns ist nicht bestanden. Es wird kein "
        + "Bericht ausgegeben.", { stufe: "fehler" });
      return Promise.resolve(false);
    }
    const offen = [];
    if (!A.p.meta.bezeichnung) offen.push("Objektbezeichnung");
    if (A.p.klima.theta_e == null) offen.push("Norm-Außentemperatur");
    /* Eine Freigabe ohne Unterzeichner ist keine. Wer freigibt, unterschreibt. */
    if (freigegeben()) {
      const st0 = standort();
      if (!(A.p.meta.bearbeiter || (st0.ersteller || {}).person)) {
        offen.push("Unterzeichner");
      }
      if (!String(A.p.meta.eee_nummer || "").trim()) {
        offen.push("Nummer in der Energieeffizienz-Expertenliste "
          + "(sonst bleibt auf dem Schlussblatt eine Schreiblinie)");
      }
    }
    const schrittEins = offen.length
      ? frage({ titel: "Es fehlen noch Angaben",
          text: offen.join(", ") + ".\n\nBericht trotzdem erzeugen?",
          jaText: "Trotzdem erzeugen", neinText: "Erst ergänzen" })
      : Promise.resolve(true);

    return schrittEins.then(function (weiter) {
      if (!weiter) return false;
      /* Die bewertenden Absätze sind kein Zubehör. Ohne sie bleibt Kapitel 1
         ohne die drei Kernaussagen, also ohne den Abschnitt, den der
         Auftraggeber zuerst aufschlägt. */
      const B = window.MODUL_BEWERTUNG;
      if (!(B && B.fehlt(A.p) && B.knopf(A.p, A.ergebnis))) return null;
      /* LIEGT SCHON EIN VORSCHLAG DA, WIRD KEIN ZWEITER BEZAHLT.
         GEMESSEN in der Live-Abnahme am 24.08.2026: nach „Jetzt schreiben
         lassen" stand der fertige Vorschlag weit unten auf der Seite, ohne
         Hinweis und ohne Scrollen — und ein zweiter Klick auf „Bericht"
         zeigte denselben Dialog erneut, als wäre nichts geschehen. Wer dort
         wieder „schreiben lassen" wählte, bezahlte den Aufruf ein zweites
         Mal. Jetzt führt der Dialog zum wartenden Vorschlag. */
      if (B.zustand && B.zustand.ergebnis) {
        return frage({ titel: "Ein Vorschlag wartet auf Übernahme",
          text: "Die bewertenden Absätze sind bereits geschrieben und stehen "
            + "als Vorschlag unter dem Ergebnis. Sie sind nur noch nicht in "
            + "den Bericht übernommen.",
          jaText: "Zum Vorschlag",
          neinText: "Bericht ohne diese Absätze" }).then(function (hin) {
          if (!hin) return null;
          A.schritt = "ergebnis";
          window.render();
          zumVorschlag();
          return false;
        });
      }
      return frage({ titel: "Bewertende Absätze fehlen",
        text: "Für diesen Bericht sind die bewertenden Absätze noch nicht "
          + "geschrieben. Kapitel 1 bleibt dann ohne die drei Kernaussagen, und "
          + "Kapitel 2 ohne die Einordnung der Datengrundlage.",
        jaText: "Jetzt schreiben lassen",
        neinText: "Bericht ohne diese Absätze" }).then(function (jetzt) {
        if (!jetzt) return null;
        A.schritt = "ergebnis";
        window.render();
        B.erzeugen();
        return false;
      });
    }).then(function (abbruch) {
      if (abbruch === false) return false;
      return ausgeben(fassung);
    });
  }

  /** Der lange Teil: Dokument bauen und Fenster füllen, mit Anzeige. */
  function ausgeben(fassung) {
    const A = window.App;
    const D = window.MODUL_DIALOG;
    const lauf = D ? D.arbeit("Der Bericht wird aufgebaut …")
      : { text() {}, fertig() {}, warten() { return Promise.resolve(); } };
    return lauf.warten().then(function () {
      let d;
      try {
        d = dokument({ fassung: fassung });
      } finally {
        lauf.fertig();
      }
      if (d.sperren && d.sperren.length) {
        melde("Die Gegenrechnung der Zonenbilanz weicht bei "
          + d.sperren.map(function (z) { return z.name; }).join(", ")
          + " um mehr als " + ZONEN_TOLERANZ_K + " K vom Rechenkern ab. Der "
          + "Bericht wird nicht ausgegeben. Bitte die Zonen und ihre Bauteile "
          + "prüfen.", { stufe: "fehler", titel: "Bericht gesperrt" });
        return false;
      }
      const w = window.open("", "_blank");
      if (!w) {
        /* Die Warnung merkt sich ihren Griff: sobald ein Berichtsfenster
           WIRKLICH aufgeht, wird sie zurueckgenommen. GEMESSEN in der
           Live-Abnahme am 24.08.2026: die Meldung stand ueber drei Projekte
           hinweg, obwohl die Pop-ups laengst erlaubt waren und die Berichte
           oeffneten — eine Warnung, die dem Bildschirm widerspricht. */
        if (popupWarnung) popupWarnung.weg();
        popupWarnung = melde("Der Browser hat das Fenster blockiert. Bitte "
          + "Pop-ups für diese Seite erlauben und noch einmal auf „Bericht“ "
          + "klicken.", { stufe: "warnung" });
        return false;
      }
      if (popupWarnung) { popupWarnung.weg(); popupWarnung = null; }
      /* Der Fenstertitel unterscheidet die beiden Fassungen, damit im
         Browser nicht die falsche gedruckt wird. In den Bericht selbst
         druckt er nicht. */
      const titel = "Heizlast " + (A.p.meta.projektnr || A.p.meta.bezeichnung || "")
        + (fassung === "intern" ? " — interne Fassung" : "");
      w.document.write("<!doctype html><html lang=de><head><meta charset=utf-8><title>"
        + e2(titel) + "</title><style>" + d.css + "</style></head><body>" + d.html
        + '<div style="position:fixed;top:8px;right:8px" class="keindruck">'
        + '<button onclick="window.print()" style="padding:8px 14px;border-radius:8px;'
        + 'border:1px solid #123A63;background:#123A63;color:#fff;cursor:pointer">'
        + "Drucken / als PDF sichern</button></div>"
        + "<style>@media print{.keindruck{display:none}}</style></body></html>");
      w.document.close();
      return true;
    }).catch(function (x) {
      lauf.fertig();
      melde("Der Bericht ist beim Aufbau abgebrochen: "
        + String((x && x.message) || x) + " Bitte Sebastian Hund melden.",
        { stufe: "fehler" });
      return false;
    });
  }

  /* Word-Export als Webarchiv, Muster aus dem Lüftungstool */
  function word() {
    const A = window.App;
    if (!A.ergebnis) return;
    const d = dokument();
    const kopfzeile = "MIME-Version: 1.0\nContent-Type: text/html; charset=\"utf-8\"\n\n";
    const html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "
      + "xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'>"
      /* Die Seitenregel im Ganzen tauschen, nicht per Regulaerausdruck: sie
       * enthaelt ein verschachteltes Randfeld fuer die Seitenzahl. */
      + "<style>" + d.css.split(window.MODUL_BERICHTSATZ.seitenregel("druck"))
        .join(window.MODUL_BERICHTSATZ.seitenregel("word"))
      + "</style></head><body>" + d.html + "</body></html>";
    const blob = new Blob([kopfzeile + html], { type: "application/msword" });
    const name = "Heizlast_" + (A.p.meta.projektnr || A.p.meta.bezeichnung || "Bericht")
      .replace(/[^\wäöüÄÖÜß -]/g, "_").slice(0, 60) + ".doc";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ------------------------------------------------------------------ *
   * 8b  Baustellensuche im fertigen Bericht
   * ------------------------------------------------------------------ *
   * An diesem Bericht arbeiten mehrere Bearbeiter gleichzeitig. Was dabei
   * durchrutscht, sind immer dieselben Sorten von Spuren: eine Überschrift
   * ohne Text darunter, ein Rest aus einer Vorlage, ein "undefined" aus einer
   * Zahl, die es nicht gab, ein doppeltes Leerzeichen aus zwei Textstücken,
   * die aneinandergeraten sind. Sie fallen im Quelltext nicht auf, im
   * gedruckten Bericht dagegen sofort.
   * Deshalb wird nicht der Quelltext durchsucht, sondern das Erzeugnis.
   * baustellenSuche() bekommt das fertige HTML und gibt eine Liste von
   * Befunden zurück. build.py laesst sie ueber den Demo-Bericht und ueber
   * einen absichtlich duennen Bericht laufen; selbsttest() prueft an
   * Beispielen, dass jede Regel wirklich anschlaegt.
   * Was NICHT beanstandet wird und warum:
   *   [W], [m²] usw.  Einheiten in Tabellenkoepfen, eine feste Liste.
   *   "null"          deutsches Zahlwort ("der Gradient ist null"). Nur der
   *                   Programmierrest wird gesucht, also der Wert allein in
   *                   einer Zelle oder unmittelbar vor einer Einheit.
   *   Geschuetztes Leerzeichen. Es steht bewusst um das Trennzeichen herum
   *                   und ist kein doppeltes Leerzeichen. */

  /** Erlaubte Klammerinhalte: Einheiten in Tabellenkoepfen. */
  const EINHEITEN_KLAMMER = ["W", "kW", "K", "%", "°C", "m", "m²", "m³", "m³/h",
    "W/K", "W/(m²·K)", "W/m²", "1/h", "h", "kWh", "kWh/(m²·a)"];

  /** HTML auf sichtbaren Text bringen. Blockenden Marken werden zu
   *  Zeilenumbruechen, damit zwei benachbarte Tabellenzellen nicht zu einem
   *  Wort verschmelzen. &nbsp; bleibt ein eigenes Zeichen (U+00A0) und zaehlt
   *  ausdruecklich nicht als Leerzeichen. */
  function nurText(html) {
    return String(html == null ? "" : html)
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<(?:br|\/p|\/div|\/td|\/th|\/tr|\/h[1-6]|\/li|\/table)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  /** Sucht im fertigen Bericht nach allem, was nach Baustelle aussieht.
   *  Rueckgabe: Liste von { regel, stelle }. Leer heisst sauber. */
  function baustellenSuche(html) {
    const roh = String(html == null ? "" : html);
    const txt = nurText(roh);
    const b = [];
    const melde = (regel, stelle) => {
      if (b.length < 200) b.push({ regel: regel, stelle: String(stelle).slice(0, 120) });
    };

    /* 1  Reste aus der Werkstatt */
    const marken = /\b(TODO|FIXME|TBD|WIP|LOREM IPSUM|PLATZHALTER|DUMMY|BEISPIELTEXT|XXX)\b/gi;
    let m;
    while ((m = marken.exec(txt))) melde("Werkstattmarke " + m[1], umfeld(txt, m.index));
    /* MODELL nur in Großbuchstaben: "Modellrechnung" ist ein Fachwort. */
    const modell = /\bMODELL\b/g;
    while ((m = modell.exec(txt))) melde("MODELL", umfeld(txt, m.index));

    /* 2  Programmierreste */
    const undef = /\bundefined\b|\bNaN\b|\[object [A-Za-z]+\]|\bInfinity\b/g;
    while ((m = undef.exec(txt))) melde("Programmierrest " + m[0], umfeld(txt, m.index));
    /* null nur dort, wo es ein Wert sein soll, nicht als deutsches Zahlwort. */
    const nullwert = /(^|\n)\s*null\s*(?=\n|$)|[=:]\s*null\b|\bnull\s(?:W|kW|K|°C|m²|m³|%|kWh)\b/g;
    while ((m = nullwert.exec(txt))) melde("null als Wert", umfeld(txt, m.index));

    /* 3  Eckige Klammern, die keine Einheit sind */
    const kl = /\[([^\]\n]*)\]/g;
    while ((m = kl.exec(txt))) {
      if (EINHEITEN_KLAMMER.indexOf(m[1].trim()) < 0) {
        melde("eckige Klammer ohne Einheit", umfeld(txt, m.index));
      }
    }

    /* 4  Doppelte Leerzeichen im sichtbaren Text */
    const dopp = /\S {2,}\S/g;
    while ((m = dopp.exec(txt))) melde("doppeltes Leerzeichen", umfeld(txt, m.index));

    /* 5  Gemischte Anfuehrungszeichen und gerade Zollzeichen */
    const anf = /„[^„“\n]{0,120}"/g;
    while ((m = anf.exec(txt))) melde("Anführung mit geradem Zeichen geschlossen",
      umfeld(txt, m.index));
    const gerade = /"[^"\n]{1,60}"/g;
    while ((m = gerade.exec(txt))) melde("gerade Anführungszeichen", umfeld(txt, m.index));

    /* 6  Kennzahlen ohne Einheit. Jede grosse Zahl der Kennzahlenreihe und
     *    des Deckblatts traegt ihre Einheit in einem eigenen Feld; fehlt es,
     *    steht auf der Seite eine nackte Zahl. */
    const kzw = /<div class="kzw">([\s\S]*?)<\/div>/g;
    while ((m = kzw.exec(roh))) {
      const inhalt = m[1];
      const wert = nurText(inhalt.replace(/<span class="kze">[\s\S]*?<\/span>/g, "")).trim();
      const einheit = /<span class="kze">([\s\S]*?)<\/span>/.exec(inhalt);
      if (!wert) melde("Kennzahl ohne Wert", nurText(inhalt).trim());
      else if (!einheit || !nurText(einheit[1]).trim()) {
        melde("Kennzahl ohne Einheit", wert);
      }
    }

    /* 7  Überschrift ohne Text darunter.
     *    Erlaubt bleibt der eine Fall, der kein Loch ist: eine Kapitel-
     *    überschrift, unter der sofort ihr erster Unterabschnitt beginnt
     *    ("6 Raumweise Heizlast" gefolgt von "6.1 Raumtabelle"). Nicht
     *    erlaubt ist alles andere, also Überschrift auf Überschrift gleicher
     *    oder höherer Ebene und Überschrift am Ende ohne Inhalt. */
    const stuecke = roh.split(/<h([1-6])\b[^>]*>/);
    const kopf = [];
    for (let i = 1; i + 1 < stuecke.length; i += 2) {
      const ebene = Number(stuecke[i]);
      const rest = stuecke[i + 1];
      const schnitt = rest.indexOf("</h" + stuecke[i] + ">");
      kopf.push({
        ebene: ebene,
        titel: nurText(schnitt < 0 ? rest : rest.slice(0, schnitt)).trim(),
        danach: nurText(schnitt < 0 ? "" : rest.slice(schnitt)).replace(/\s+/g, " ").trim(),
      });
    }
    kopf.forEach(function (k, i) {
      if (!k.titel) { melde("leere Überschrift", "h" + k.ebene); return; }
      if (k.danach.length >= 20) return;
      const naechste = kopf[i + 1];
      if (naechste && naechste.ebene > k.ebene) return;
      melde("Überschrift ohne Text darunter", k.titel);
    });

    /* 8  Leere Zelle in einer Wertespalte einer Kennzahlentabelle faellt
     *    unter 6; hier bleibt der Strich, den f() bei fehlender Zahl setzt.
     *    Er ist erlaubt, aber nicht als einziger Inhalt einer ganzen Zeile. */
    const strichzeile = /<tr>(?:\s*<t[dh][^>]*>\s*(?:–|-|&ndash;)?\s*<\/t[dh]>\s*)+<\/tr>/g;
    while ((m = strichzeile.exec(roh))) melde("Tabellenzeile ohne Inhalt", "leere Zeile");

    /* 9  Ersatzschreibung statt Umlaut.
     *    Auf dem Ergebnisblatt stand "Wärmeströme der Gebäudehuelle". Im
     *    Quelltext faellt so etwas nicht auf, weil daneben Kennungen stehen,
     *    die ASCII sein MUESSEN (kat: "huelle", class="tabhuelle"). Deshalb
     *    wird hier nur der sichtbare Text gelesen, und nur gegen Wortteile,
     *    die es im Deutschen ohne Umlaut nicht gibt. Namen, die der
     *    Bearbeiter selbst eintraegt, koennen davon getroffen werden -- dann
     *    ist auch das ein Befund, denn sie stehen im unterschriebenen
     *    Bericht. Netzadressen bleiben ausgenommen. */
    const ersatz = new RegExp("([A-Za-zÄÖÜäöüß]*(?:Gebaeude|[Rr]aeume|[Ff]laeche"
      + "|[Ww]aerme|[Mm]assstab|[Hh]oehe|[Tt]uer|[Aa]ussen|[Gg]roesse|[Pp]ruef"
      + "|[Ww]aende|[Uu]eber|[Oo]effnung|[Hh]uelle|[Ss]chraege|[Zz]aehler"
      + "|[Ll]oesch|[Bb]ruecke|zulaessig|vollstaendig|urspruenglich|koennen"
      + "|muessen|moeglich|naechste|laesst|haelt|waere|gehoert)"
      + "[A-Za-zÄÖÜäöüß]*)", "g");
    while ((m = ersatz.exec(txt))) {
      if (/^\.(de|com|org|eu|net)\b/.test(txt.slice(m.index + m[0].length))) continue;
      melde("Ersatzschreibung statt Umlaut: " + m[1], umfeld(txt, m.index));
    }

    return b;
  }

  function umfeld(txt, i) {
    return txt.slice(Math.max(0, i - 40), i + 60).replace(/\s+/g, " ");
  }

  /* ------------------------------------------------------------------ *
   * 8c  Reinheit der Druckfassung
   * ------------------------------------------------------------------ *
   * Sebastians Vorgabe vom 24.08.2026: der Ausdruck an den Auftraggeber
   * enthält KEINE Aussage darüber, wie gut, belastbar oder belegt eine Zahl
   * ist — keine Spanne, keine Konfidenz, keine Quellen, keine BEG-Bewertung,
   * keine offenen Punkte, keine Prüfungen. Diese Suche läuft in build.py
   * Schritt 5b über jede erzeugte Druckfassung und hält die Vorgabe
   * dauerhaft: taucht eines der Wörter wieder auf, bricht der Bau.
   *
   * BEGRÜNDETE AUSNAHMEN — die einzigen, und warum:
   *   1  Der Kasten „Durchsicht durch den Bearbeiter" (Klasse kenntnisnahme).
   *      Sebastians ausdrückliche Vorgabe: die Erklärung des Ausstellers,
   *      dass er die aufgeworfenen Punkte geprüft und zur Kenntnis genommen
   *      hat, bleibt im Ausdruck. Sie enthält zwangsläufig „Selbstprüfung"
   *      und „geprüft".
   *   2  Der rote Kasten einer NICHT BESTANDENEN Selbstprüfung auf dem
   *      Deckblatt (Klasse selbstpruefung). Ihn zu unterdrücken hieße, einem
   *      Auftraggeber eine gescheiterte Berechnung als sauber zu übergeben.
   *   3  Der Normtitel „Prüfverfahren und Leistungsangabe" (DIN EN 442-2 im
   *      Teillast-Kapitel). Ein Zitat des Normtitels, keine Prüfaussage.
   * Alles andere ist ein Befund. */
  const DRUCK_VERBOTEN = [
    ["Spanne/Bandbreite", /[Ss]panne|[Bb]andbreite/g],
    ["Konfidenz", /[Kk]onfidenz/g],
    ["Konfidenzklasse A/B/C", /Klasse [ABC]\b/g],
    ["BEG", /\bBEG\b/g],
    ["belegt/Beleg", /[Bb]eleg/g],
    ["Annahme/angenommen", /[Aa]nnahme|[Aa]ngenommen/g],
    ["Prüfung/geprüft", /[Pp]rüf/g],
    ["Quelle", /[Qq]uelle/g],
    ["Sicherheit/unsicher", /[Ss]icherheit|[Uu]nsicher/g],
    /* FÖRDERAUSSAGEN GEHÖREN NICHT IN EINEN HEIZLASTBERICHT.
       GEMESSEN am 26.08.2026 an „Hasenberg 10": der einzige überlebende
       bewertende Absatz maß die Bauteile an „der für die Förderung
       geprüften Anforderung (0,20 / 0,14 / 0,25 / 0,95)". Eine Norm-Heizlast
       nach DIN EN 12831-1 sagt über Förderfähigkeit nichts, und ein Satz,
       der sie im selben Bericht behauptet, ist als Zusage lesbar. */
    ["Förderung", /[Ff]örder/g],
  ];

  /** Sucht in der fertigen DRUCKFASSUNG nach Güte- und Herkunftsvokabular.
   *  Rückgabe wie baustellenSuche: Liste von { regel, stelle }, leer heißt
   *  sauber. Die drei begründeten Ausnahmen (oben) werden vor der Suche
   *  entfernt, alles Übrige wird gemeldet. */
  function druckSuche(html) {
    let roh = String(html == null ? "" : html)
      .replace(/<div class="kasten kenntnisnahme">[\s\S]*?<\/div>/g, "")
      .replace(/<div class="sperr selbstpruefung">[\s\S]*?<\/div>/g, "");
    const txt = nurText(roh)
      .replace(/Prüfverfahren und Leistungsangabe/g, "");
    const b = [];
    DRUCK_VERBOTEN.forEach(function (regel) {
      let m;
      regel[1].lastIndex = 0;
      while ((m = regel[1].exec(txt))) {
        if (b.length >= 200) return;
        b.push({ regel: "Druckfassung: " + regel[0],
                 stelle: umfeld(txt, m.index) });
      }
    });
    return b;
  }

  /* ------------------------------------------------------------------ *
   * 9  Selbsttest der abgeleiteten Größen
   * ------------------------------------------------------------------ *
   * Geprüft wird nur, was dieses Modul selbst rechnet. Die Kernrechnung
   * hat ihre eigenen 14 Tests; hier geht es um die drei Größen aus dem
   * Anhang der Spezifikation, um die Konfidenzvergabe und um die
   * Kapitelnummerierung. Alles DOM-frei. */
  function selbsttest() {
    const fh = [];
    function pruefe(name, ist, soll, tol) {
      const t = tol === undefined ? 1e-6 : tol;
      if (!(Math.abs(ist - soll) <= t)) {
        fh.push(name + ": ist " + ist + ", soll " + soll);
      }
    }

    /* --- T1  Wärmebrückenanteil ---------------------------------------
     * Ein Hüllbauteil 10 m², U 1,0, U_eff 1,1, 20 gegen -10 Grad:
     * 10 * 0,10 * 30 = 30 W. Ein Innenbauteil trägt nichts bei. */
    const eT1 = { raeume: [{ theta_i: 20, bauteile: [
      { kat: "huelle", A: 10, U: 1.0, U_eff: 1.1, theta_j: -10 },
      { kat: "innen", A: 5, U: 1.0, U_eff: 1.0, theta_j: 15 },
      { kat: "erdreich", A: 20, U: 0.3, U_eff: 0.3, theta_j: 10 },
    ] }] };
    pruefe("T1 Wärmebrückenanteil", wbZuschlagAnteil(eT1), 30, 1e-9);

    /* --- T2  f-Faktor Regelfall, Kontrollwert aus dem Referenzbericht ---
     * Kellerdecke EG: (20 - 3,53) / (20 - (-9,6)) = 0,5564 */
    const eT2 = { klima: { theta_e: -9.6, theta_e_m: 10.1 },
                  norm: { F_G1: 1.45, G_W: 1.0 } };
    pruefe("T2 f Kellerdecke",
      fFaktor({ theta_i: 20 }, { kat: "huelle", theta_j: 3.53 }, eT2), 0.5564, 0.0005);
    pruefe("T2 f Außenluft",
      fFaktor({ theta_i: 20 }, { kat: "huelle", theta_j: -9.6 }, eT2), 1.0, 1e-9);
    // negatives f bei wärmerem Nachbarraum: (20-24)/(20+9,6) = -0,1351
    pruefe("T2 f gegen Bad",
      fFaktor({ theta_i: 20 }, { kat: "innen", theta_j: 24 }, eT2), -0.1351, 0.0005);
    // erdberührt: F_G1 * f_g2 * G_W = 1,45 * 0,3333 * 1,0
    pruefe("T2 f erdberührt",
      fFaktor({ theta_i: 20 }, { kat: "erdreich", f_g2: 1 / 3 }, eT2), 1.45 / 3, 1e-9);

    /* --- T3  Zonenbilanz gegen den Rechenkern --------------------------
     * Dieselbe Aufgabe wie Selbsttest T5 des Kerns: Raum 20 Grad über eine
     * Decke A=10 U=0,5 an den Keller, Keller gegen außen A=10 U=1,0.
     * Erwartung: H 5 und 10, Mittel 0,0 Grad. */
    const pT3 = {
      optionen: {},
      zonen: [{ id: "keller", name: "Keller", modus: "bilanz",
        huelle: [{ name: "Kellerwand", A: 10, U: 1.0, grenzt_an: { typ: "aussen" } }] }],
    };
    const eT3 = {
      klima: { theta_e: -10, theta_e_m: 10 }, norm: { DELTA_U_WB: 0.10 },
      zonen: { keller: 0.0 },
      raeume: [{ geschoss: "EG", theta_i: 20, bauteile: [
        { name: "Kellerdecke", A: 10, U: 0.5, kat: "huelle",
          grenzt_an: { typ: "zone", ref: "keller" } }] }],
    };
    const zb = zonenBilanz(pT3, eT3);
    if (zb.length !== 1) fh.push("T3 eine Zone erwartet");
    else {
      pruefe("T3 H beheizte Räume", zb[0].gruppen[0].H, 5.0, 1e-9);
      pruefe("T3 H Außenluft", zb[0].gruppen[1].H, 10.0, 1e-9);
      pruefe("T3 gewichtetes Mittel", zb[0].mittel, 0.0, 1e-9);
      pruefe("T3 Abweichung zum Kern", zb[0].abweichung, 0.0, 1e-9);
      if (zb[0].gruppen[0].H !== 5.0) fh.push("T3 Zuschlag darf nicht eingerechnet sein");
    }
    // mit wbz_in_zonenbilanz: H der Decke wird A*(U+dU) = 10*0,6 = 6
    const zb2 = zonenBilanz(Object.assign({}, pT3, { optionen: { wbz_in_zonenbilanz: true } }),
      eT3);
    pruefe("T3 H mit Zuschlag", zb2[0].gruppen[0].H, 6.0, 1e-9);

    /* --- T4  Abweichung der Gegenrechnung wird erkannt ------------------ */
    const eT4 = JSON.parse(JSON.stringify(eT3));
    eT4.zonen.keller = 3.0;
    const zb4 = zonenBilanz(pT3, eT4);
    if (!(zb4[0].abweichung > ZONEN_TOLERANZ_K)) {
      fh.push("T4 abweichende Zonentemperatur muss auffallen");
    }
    if (!zb4[0].vergleichbar) fh.push("T4 eine bilanzierte Zone ist vergleichbar");

    /* --- T4b  Vorgegebene Zonentemperatur ist keine Abweichung ----------
     * GEMESSEN am 22.08.2026 im Browser: ein Projekt mit automatisch
     * angelegtem Keller (Lage nach DIN/TS 12831-1 Tabelle 5, 5,2 °C) und
     * Dachraum (-6,6 °C) hatte null Fehler in der Selbstprüfung, und
     * erzeugen() gab trotzdem keinen Bericht aus: die Gegenrechnung bildete
     * das Mittel über die angrenzenden beheizten Räume, also 20,0 °C, und
     * meldete 14,8 K Abweichung. Ohne eigene Hüllbauteile gibt es keine
     * Bilanz, gegen die sich vergleichen ließe. */
    const pT4b = { optionen: {}, zonen: [{ id: "keller", name: "Unbeheizter Keller",
      modus: "lage", lage: "keller_mit_oeffnung", huelle: [] }] };
    const eT4b = { klima: { theta_e: -10, theta_e_m: 10 }, norm: { DELTA_U_WB: 0.10 },
      zonen: { keller: 5.2 },
      raeume: [{ geschoss: "EG", theta_i: 20, bauteile: [
        { name: "Kellerdecke", A: 100, U: 0.45, kat: "huelle",
          grenzt_an: { typ: "zone", ref: "keller" } }] }] };
    const zb4b = zonenBilanz(pT4b, eT4b);
    if (zb4b[0].vergleichbar) {
      fh.push("T4b eine Zone ohne eigene Hüllbauteile ist nicht vergleichbar");
    }
    if (zb4b[0].abweichung !== 0) {
      fh.push("T4b eine vorgegebene Temperatur ergibt keine Abweichung, ist: "
        + zb4b[0].abweichung);
    }
    /* Und mit eigenen Hüllbauteilen im Bilanzmodus wird wieder verglichen. */
    const pT4c = { optionen: {}, zonen: [{ id: "keller", name: "K", modus: "bilanz",
      huelle: [{ name: "Kellerwand", A: 10, U: 1.0, grenzt_an: { typ: "aussen" } }] }] };
    if (!zonenBilanz(pT4c, eT4b)[0].vergleichbar) {
      fh.push("T4c mit eigenen Hüllbauteilen wird wieder verglichen");
    }

    /* --- T5  Geschossreihenfolge und gemischte U-Werte ------------------ */
    const eT5 = { raeume: [
      { geschoss: "OG", bauteile: [{ name: "Fenster", U: 0.95, kat: "huelle" }] },
      { geschoss: "EG", bauteile: [{ name: "Fenster", U: 2.70, kat: "huelle" }] },
      { geschoss: "OG", bauteile: [{ name: "Kellerdecke", U: 0.29, kat: "huelle" }] },
    ] };
    const g5 = geschossReihenfolge(eT5);
    if (g5.join(",") !== "OG,EG") fh.push("T5 Geschossreihenfolge ist " + g5.join(","));
    const gm = bilanzGemischt(eT5);
    if (!gm.Fenster) fh.push("T5 unterschiedliche U-Werte unter einem Namen müssen auffallen");
    if (gm.Kellerdecke) fh.push("T5 einheitlicher U-Wert darf nicht als gemischt gelten");

    /* --- T6  Kapitelnummern ------------------------------------------- */
    const kVoll = kapitelPlan({ plan: { bilder: [{}] }, zonen: [{ id: "k" }] });
    if (kVoll.plan !== 3 || kVoll.zonen !== 6 || kVoll.teillast !== 8
        || kVoll.konfidenz !== 11) {
      fh.push("T6 volle Nummerierung falsch: " + JSON.stringify(kVoll));
    }
    const kOhne = kapitelPlan({ plan: { bilder: [] }, zonen: [] });
    if (kOhne.plan !== null || kOhne.zonen !== null || kOhne.teillast !== 6
        || kOhne.konfidenz !== 9) {
      fh.push("T6 Nummerierung ohne Plan und ohne Zonen falsch: " + JSON.stringify(kOhne));
    }
    /* Wiederhergestellter Stand: Abbildungen weg, Blattdaten da — das
       Kapitel Planunterlagen bleibt (Befund Hasenberg 25.08.2026). */
    const kWieder = kapitelPlan({ plan: { bilder: [],
      seiten: [{ nurDaten: true }] }, zonen: [] });
    if (kWieder.plan !== 3) {
      fh.push("T6 nach Wiederherstellung ohne Bilder muss das Plankapitel bleiben");
    }
    if (kVoll.teillast !== kVoll.raeume + 1 || kVoll.offen !== kVoll.teillast + 1) {
      fh.push("T6 die Teillast gehört zwischen Raumheizlast und offene Punkte");
    }
    /* Druckfassung: die entfallenden Kapitel bekommen null, der Rest
       nummeriert lückenlos durch. Mit Plan und Zonen: 1 Ergebnis, 2 Objekt,
       3 Plan, 4 Grundlagen, 5 Bauteile, 6 Räume, 7 Teillast — Zonen, offene
       Punkte, Prüfung und Konfidenz entfallen. */
    const kDruck = kapitelPlan({ plan: { bilder: [{}] }, zonen: [{ id: "k" }] }, "druck");
    if (kDruck.plan !== 3 || kDruck.zonen !== null || kDruck.raeume !== 6
        || kDruck.teillast !== 7 || kDruck.offen !== null
        || kDruck.pruefung !== null || kDruck.konfidenz !== null) {
      fh.push("T6 Druck-Nummerierung falsch: " + JSON.stringify(kDruck));
    }

    /* --- T7  Wirkungstext ---------------------------------------------- */
    if (wirkungText(500) !== "0,50 kW mehr") fh.push("T7 positives Delta");
    if (wirkungText(-1471) !== "1,47 kW weniger") fh.push("T7 negatives Delta");
    if (wirkungText(4) !== "unter 0,01 kW") fh.push("T7 kleines Delta");
    if (wirkungText(null, "förderrechtlich aber entscheidend")
        !== "nicht beziffert, förderrechtlich aber entscheidend") fh.push("T7 ohne Delta");

    /* --- T8  Änderung anwenden ----------------------------------------- */
    const p8 = { bauteiltypen: [{ id: "t1", name: "Dach", U: 2.0, schichten: [{ d: 1 }] }],
                 raeume: [{ id: "r1", art: "treppenhaus", theta_i: 15 }],
                 zonen: [{ id: "z1", modus: "bilanz" }], norm: {} };
    if (!aenderungAnwenden(p8, { art: "bauteil_u", typ_id: "t1", wert: 0.14 })
        || p8.bauteiltypen[0].U !== 0.14 || p8.bauteiltypen[0].schichten.length !== 0) {
      fh.push("T8 bauteil_u wirkt nicht");
    }
    if (!aenderungAnwenden(p8, { art: "raum_theta", raum_id: "r1", wert: 20 })
        || p8.raeume[0].theta_i !== 20) fh.push("T8 raum_theta wirkt nicht");
    if (!aenderungAnwenden(p8, { art: "zone_theta", zone_id: "z1", wert: 5 })
        || p8.zonen[0].modus !== "fest") fh.push("T8 zone_theta wirkt nicht");
    if (aenderungAnwenden(p8, { art: "bauteil_u", typ_id: "gibtsnicht", wert: 1 })) {
      fh.push("T8 unbekanntes Bauteil darf nicht treffen");
    }
    if (aenderungAnwenden(p8, null)) fh.push("T8 leere Änderung darf nicht treffen");

    /* --- T9  Nachbarschaften und Aufzählung ----------------------------- */
    const p9 = { zonen: [{ id: "keller", name: "Unbeheizter Keller" }] };
    const e9 = { raeume: [{ bauteile: [
      { kat: "huelle", grenzt_an: { typ: "aussen" } },
      { kat: "huelle", grenzt_an: { typ: "zone", ref: "keller" } },
      { kat: "nachbar", grenzt_an: { typ: "fest", theta: 14 } },
      { kat: "innen", grenzt_an: { typ: "fest", theta: 15 } },
    ] }] };
    const nb = nachbarschaften(p9, e9);
    if (nb.join(" | ") !== "an Außenluft | an „Unbeheizter Keller“ | "
        + "an das Nachbargebäude") {
      fh.push("T9 Nachbarschaften: " + nb.join(" | "));
    }
    if (undListe(["a", "b", "c"]) !== "a, b und c") fh.push("T9 undListe");
    if (undListe(["a"]) !== "a") fh.push("T9 undListe einzeln");
    if (undListe([]) !== "") fh.push("T9 undListe leer");

    /* --- T10  Konfidenzvergabe und Leitparameter ------------------------ */
    const p10 = {
      meta: { baujahr: 1936, plz: "", quellen: { baujahr: "Objektakte" } },
      klima: { quelle: "" }, luftdichtheit: { n50: 4, kategorie: "annahme" },
      raeume: [{ art: "wohnen" }], zonen: [], bauteiltypen: [],
    };
    const e10 = { klima: { theta_e: -9.6, theta_e_m: 10.1 }, norm: { DELTA_U_WB: 0.1 },
                  raeume: [], phi_T_gebaeude: 6446 };
    const zeilen10 = [
      { verwendet: true, name: "Dachschräge", kurz: "Dachschräge", u: 2.0, phi: 1661,
        nachweis: null, typ: { id: "t1", name: "Dachschräge", belegt: false, U: 2.0 } },
      { verwendet: true, name: "Kellerdecke", kurz: "Kellerdecke", u: 0.29, phi: 424,
        nachweis: null, typ: { id: "t2", name: "Kellerdecke", belegt: false, U: 0.29 } },
      { verwendet: true, name: "Fenster", kurz: "Fenster", u: 0.95, phi: 1051,
        nachweis: { u: 0.95 }, typ: { id: "t3", name: "Fenster", belegt: true, U: 0.95 } },
    ];
    const kf10 = konfidenz(p10, e10, zeilen10);
    const klassen = kf10.eintraege.map(function (x) { return x.klasse; }).join("");
    if (!/^A*B*C*$/.test(klassen)) fh.push("T10 Sortierung A vor B vor C: " + klassen);
    if (!kf10.leitparameter) fh.push("T10 kein Leitparameter vergeben");
    else if (kf10.leitparameter.schluessel !== "bauteil:t1") {
      fh.push("T10 falscher Leitparameter: " + kf10.leitparameter.schluessel);
    }
    const cIndex = kf10.eintraege.findIndex(function (x) { return x.klasse === "C"; });
    if (cIndex < 0 || !kf10.eintraege[cIndex].leit) {
      fh.push("T10 Leitparameter muss der erste C-Eintrag sein");
    }
    if (!kf10.eintraege.some(function (x) {
      return x.klasse === "A" && /1936/.test(x.angabe); })) {
      fh.push("T10 Baujahr mit Quelle muss Klasse A sein");
    }
    // ohne Quelle darf aus demselben Feld kein A werden
    const p10b = JSON.parse(JSON.stringify(p10));
    p10b.meta.quellen = {};
    const kf10b = konfidenz(p10b, e10, zeilen10);
    if (kf10b.eintraege.some(function (x) {
      return x.klasse === "A" && /1936/.test(x.angabe); })) {
      fh.push("T10 Baujahr ohne Quelle darf nicht Klasse A sein");
    }
    if (!kf10b.eintraege.some(function (x) {
      return x.klasse === "C" && /n50/.test(x.angabe); })) {
      fh.push("T10 n50 als Annahme muss Klasse C sein");
    }

    /* --- T11  Textbausteine dürfen nichts erfinden ---------------------- */
    if (text({ texte: { a: { b: "hallo" } } }, "a.b") !== "hallo") fh.push("T11 text() liest nicht");
    if (text({ texte: {} }, "a.b") !== null) fh.push("T11 fehlender Text muss null sein");
    if (text({ texte: { a: "   " } }, "a") !== null) fh.push("T11 Leerraum zählt nicht als Text");
    if (text({}, "a") !== null) fh.push("T11 ohne texte muss null herauskommen");

    /* --- T12  Mehrzahl ------------------------------------------------- *
     * "1 Hinweise" im Kundendokument liest sich wie ein Fehler des
     * Werkzeugs. */
    if (anzahlWort(1, "Hinweis", "Hinweise") !== "1 Hinweis") fh.push("T12 Einzahl");
    if (anzahlWort(0, "Hinweis", "Hinweise") !== "0 Hinweise") fh.push("T12 null");
    if (anzahlWort(3, "Hinweis", "Hinweise") !== "3 Hinweise") fh.push("T12 Mehrzahl");

    /* --- T13  Fenster und Türen werden getauscht, nicht gedämmt ---------- */
    if (!austauschBauteil({ kurz: "Fenster", anforderung: { id: "fenster" } })) {
      fh.push("T13 Fenster muss als Austauschbauteil gelten");
    }
    if (!austauschBauteil({ kurz: "Haustür", anforderung: { id: "haustuer" } })) {
      fh.push("T13 Haustür muss als Austauschbauteil gelten");
    }
    if (austauschBauteil({ kurz: "Dachschräge", anforderung: { id: "dach" } })) {
      fh.push("T13 Dachschräge wird gedämmt, nicht getauscht");
    }
    // ohne Kategorie greift die Notbremse über den Namen
    if (!austauschBauteil({ kurz: "Dachflächenfenster", anforderung: { id: null } })) {
      fh.push("T13 Fenster muss auch ohne Kategorie erkannt werden");
    }

    /* --- T14  Ampeltexte ------------------------------------------------ */
    ["rot", "gelb", "annahme", "gruen"].forEach(function (x) {
      if (!ampelSatz(x)) fh.push("T14 kein Text zur Ampel " + x);
    });
    if (ampelSatz("annahme").indexOf("Annahmenliste") < 0) {
      fh.push("T14 die Annahmenstufe muss auf die Annahmenliste verweisen");
    }
    if (ampelSatz("gibtsnicht") !== "") fh.push("T14 unbekannte Ampel muss leer bleiben");
    if (ampelSatz("rot").indexOf("nicht zur Auslegung") < 0) {
      fh.push("T14 Rot muss sagen, dass die Zahl nicht zur Auslegung taugt");
    }

    /* --- T14b  Außenmaße je Geschoss kommen in Kapitel 2 an -------------- *
     * Gemessen am 24.08.2026: 8,00 × 12,50 m samt Quelle „am Plan abgezählt"
     * in der Rückfrage eingetragen — und der Bericht führte „Außenmaße"
     * unter den fehlenden Kenngrößen; die Quelle stand in keiner Fassung. */
    {
      const k14 = kapitelPlan({ plan: { bilder: [] }, zonen: [] });
      const p14 = { meta: {}, texte: {}, raeume: [], zonen: [], bauteiltypen: [],
        geschossmasse: { EG: { breite_m: 8, tiefe_m: 12.5,
          quelle: "am Plan abgezählt" } } };
      const u14 = function () { return "2.x"; };
      const t14b = kapitel2(p14, { raeume: [] }, k14, u14, false);
      if (t14b.indexOf("8,00 × 12,50 m") < 0) {
        fh.push("T14b die eingetragenen Außenmaße fehlen in Kapitel 2 intern");
      }
      if (t14b.indexOf("am Plan abgezählt") < 0) {
        fh.push("T14b die Quellenangabe des Bearbeiters fehlt in Kapitel 2 intern");
      }
      if (/keine Angabe vor:[^<]*Außenmaße/.test(t14b)) {
        fh.push("T14b Außenmaße dürfen nicht zugleich als fehlend gelistet sein");
      }
      /* Druckfassung: der Wert steht, die Quellenspalte gibt es dort nicht. */
      const t14d = kapitel2(p14, { raeume: [] }, k14, u14, true);
      if (t14d.indexOf("8,00 × 12,50 m") < 0) {
        fh.push("T14b die Außenmaße fehlen in der Druckfassung");
      }
      if (t14d.indexOf("am Plan abgezählt") >= 0) {
        fh.push("T14b die Herkunftsangabe gehört nicht in die Druckfassung");
      }
      /* Ein von Hand gesetztes meta.aussenmasse behält Vorrang. */
      const p14b = { meta: { aussenmasse: "10,0 x 9,0 m" }, texte: {}, raeume: [],
        zonen: [], bauteiltypen: [], geschossmasse: p14.geschossmasse };
      if (kapitel2(p14b, { raeume: [] }, k14, u14, false)
          .indexOf("10,0 x 9,0 m") < 0) {
        fh.push("T14b ein von Hand gesetztes Außenmaß muss Vorrang behalten");
      }
    }

    /* --- T15  Kapitel 8 ohne offene Punkte darf nicht abstürzen ---------- *
     * Der Verweis auf das Konfidenzkapitel brauchte K, das nicht übergeben
     * wurde. Der Bericht ließ sich dann gar nicht erzeugen. */
    const k15 = kapitelPlan({ plan: { bilder: [] }, zonen: [] });
    const t15 = kapitel8([], { eintraege: [{ klasse: "C" }, { klasse: "A" }] }, k15);
    if (t15.indexOf(String(k15.konfidenz)) < 0) {
      fh.push("T15 leere Liste muss auf das Konfidenzkapitel verweisen");
    }
    if (kapitel8([], { eintraege: [] }, k15).indexOf("Klasse C") >= 0) {
      fh.push("T15 ohne C-Eintrag darf nicht von Klasse C die Rede sein");
    }

    /* --- T16  Konfidenz: jeder verwendete U-Wert muss auftauchen --------- *
     * Vorher fiel ein als belegt gekennzeichnetes Bauteil aus allen drei
     * Klassen heraus und stand nirgends im Bericht. */
    const p16 = { meta: { quellen: {} }, klima: {}, luftdichtheit: { kategorie: "messung" },
                  raeume: [], zonen: [], bauteiltypen: [] };
    const e16 = { klima: { theta_e: -10, theta_e_m: 10 }, norm: { DELTA_U_WB: 0.1 },
                  raeume: [], phi_T_gebaeude: 1000 };
    const z16 = [
      { verwendet: true, name: "Dach", kurz: "Dach", u: 2.0, phi: 500, nachweis: null,
        typ: { id: "a", name: "Dach", belegt: true, quelle: "Bauzeichnung 1936" } },
      { verwendet: true, name: "Wand", kurz: "Wand", u: 1.4, phi: 300, nachweis: null,
        typ: { id: "b", name: "Wand", belegt: true } },
      { verwendet: false, name: "Tür", kurz: "Tür", u: 3.0, phi: 0, nachweis: null,
        typ: { id: "c", name: "Tür", belegt: true, quelle: "Aufmaß" } },
    ];
    const kf16 = konfidenz(p16, e16, z16);
    const dach = kf16.eintraege.find(function (x) { return x.schluessel === "bauteil:a"; });
    if (!dach || dach.klasse !== "A") fh.push("T16 belegter U-Wert mit Quelle gehört in A");
    const wand = kf16.eintraege.find(function (x) { return x.schluessel === "bauteil:b"; });
    if (!wand || wand.klasse !== "C") {
      fh.push("T16 als belegt gekennzeichnet, aber ohne Fundstelle: bleibt Annahme");
    }
    if (kf16.eintraege.some(function (x) { return x.schluessel === "bauteil:c"; })) {
      fh.push("T16 nicht verwendetes Bauteil gehört nicht in die Tabelle");
    }

    /* --- T17 Anteil der Annahmen --------------------------------------- */
    const eA = { raeume: [
      { bauteile: [{ kat: "huelle", phi: 600, annahme: true },
                   { kat: "huelle", phi: 400, annahme: false },
                   { kat: "innen", phi: 900, annahme: true }] }] };
    const an17 = annahmeAnteil(eA);
    if (!an17 || Math.abs(an17.prozent - 60) > 1e-9) {
      fh.push("T17 Anteil der Annahmen muss 60 % sein, ist "
        + (an17 ? an17.prozent : "null"));
    }
    if (annahmeAnteil({ raeume: [] }) !== null) {
      fh.push("T17 ohne Bauteile darf kein Anteil entstehen");
    }
    if (annahmeAnteil({ raeume: [{ bauteile: [{ kat: "innen", phi: 500,
        annahme: true }] }] }) !== null) {
      fh.push("T17 Innenbauteile gehören nicht in den Anteil");
    }

    /* --- T18 Deckblattzahl und Ortstermin ------------------------------- */
    if (deckZahl(9050, { prozent: 100 }).wert !== "rd. 9,1") {
      fh.push("T18 bei unbelegter Datenlage darf das Deckblatt keine zweite "
        + "Nachkommastelle zeigen");
    }
    if (deckZahl(9050, { prozent: 100 }).gerechnet !== "9,05") {
      fh.push("T18 der gerechnete Wert muss trotzdem genannt sein");
    }
    if (deckZahl(9050, { prozent: 0 }).wert !== "9,05") {
      fh.push("T18 bei belegter Datenlage bleiben zwei Nachkommastellen");
    }
    if (ortsterminSatz({ prozent: 100 }).indexOf("? Ja.") < 0) {
      fh.push("T18 unbelegte U-Werte müssen mit Ja beantwortet werden");
    }
    if (ortsterminSatz({ prozent: 0 }).indexOf("? Nein.") < 0) {
      fh.push("T18 belegte U-Werte müssen mit Nein beantwortet werden");
    }
    if (!/^Muss /.test(ortsterminSatz({ prozent: 0 }))) {
      fh.push("T18 die Frage muss vor der Antwort stehen");
    }
    if (ortsterminSatz(null) !== "") fh.push("T18 ohne Datenlage kein Satz");
    /* Ein gespeicherter ISO-Stand druckt deutsch; Handeingaben bleiben. */
    if (datumDeutsch("2026-08-25") !== "25.08.2026") {
      fh.push("T18 ISO-Datum muss deutsch gedruckt werden");
    }
    if (datumDeutsch("Mai 2026") !== "Mai 2026") {
      fh.push("T18 ein von Hand eingetragener Stand bleibt unverändert");
    }
    if (datumDeutsch("") !== "" || datumDeutsch(null) !== "") {
      fh.push("T18 ohne Stand greift heute()");
    }
    /* Deckblatt und Kapitel 1 nennen dieselbe Zahl. Beide holen sie aus
       deckZahl, damit vorne keine andere Genauigkeit steht als hinten. */
    const eA18 = { raeume: [{ bauteile: [
      { kat: "huelle", phi: 1000, annahme: true },
      { kat: "huelle", phi: 1000, annahme: true }] }] };
    if (deckZahl(9050, annahmeAnteil(eA18)).wert !== "rd. 9,1") {
      fh.push("T18 Kapitel 1 muss dieselbe Rundung zeigen wie das Deckblatt");
    }

    /* --- T19 Reihenfolge der offenen Punkte ----------------------------- */
    const s19 = sortiereNachWirkung([
      { titel: "klein", delta: -40 },
      { titel: "ohne", delta: null },
      { titel: "gross", delta: -1470 },
      { titel: "beleg", delta: null, zuerst: true },
      { titel: "mittel", delta: -300 },
    ]).map(function (x) { return x.titel; }).join(",");
    if (s19 !== "beleg,gross,mittel,klein,ohne") {
      fh.push("T19 falsche Reihenfolge der offenen Punkte: " + s19);
    }
    /* Der Einleitungssatz muss zur tatsächlichen Reihenfolge passen. Steht
       ein unbezifferter Punkt oben, darf dort nicht stehen, Unbeziffertes
       käme ans Ende. */
    if (!sortiereNachWirkung([{ titel: "a", delta: -40 },
        { titel: "b", delta: null, zuerst: true }])[0].zuerst) {
      fh.push("T19 der als zuerst markierte Punkt muss oben stehen");
    }

    /* --- T20 Platzhalter --------------------------------------------- */
    if (offenerText("irgendetwas") !== "") {
      fh.push("T20 ein Bericht darf keinen Platzhalter enthalten");
    }

    /* --- T21 Unterlagen und ja/nein ------------------------------------ */
    const u21 = unterlagen({ grundlagen: "Bauzeichnung 1936\n- Aufmaßplan\n\n" });
    if (u21.length !== 2 || u21[1] !== "Aufmaßplan") {
      fh.push("T21 Unterlagen je Zeile: " + JSON.stringify(u21));
    }
    if (unterlagen({ grundlagen: ["A", ""] }).length !== 1) {
      fh.push("T21 alte Listenform muss weiter gehen");
    }
    if (jaNein("Ja") !== true || jaNein("nein") !== false || jaNein("") !== null) {
      fh.push("T21 ja/nein wird falsch gelesen");
    }

    /* --- T22 uKlasse läuft mit konfidenz() gleich ----------------------- *
     * Kapitel 5 druckt die Klasse je Zeile, konfidenz() sortiert dieselben
     * Bauteile in dieselben Klassen. Laufen die beiden Regeln auseinander,
     * steht in Kapitel 5 ein A neben einem C in der Konfidenztabelle. Der
     * Test vergleicht deshalb nicht Text mit Text, sondern beide Wege. */
    const z22 = [
      { verwendet: true, name: "Dach", kurz: "Dach", u: 2.0, phi: 500, nachweis: null,
        typ: { id: "a", name: "Dach", belegt: true, quelle: "Bauzeichnung 1936" } },
      { verwendet: true, name: "Wand", kurz: "Wand", u: 1.4, phi: 300, nachweis: null,
        typ: { id: "b", name: "Wand", belegt: true } },
      { verwendet: true, name: "Decke", kurz: "Decke", u: 0.3, phi: 200,
        nachweis: { u: 0.3 }, typ: { id: "d", name: "Decke" } },
      { verwendet: true, name: "Boden", kurz: "Boden", u: 1.1, phi: 100, nachweis: null,
        typ: { id: "f", name: "Boden", typologie: true } },
    ];
    const erwartet22 = { Dach: "A", Wand: "C", Decke: "B", Boden: "C" };
    z22.forEach(function (z) {
      if (uKlasse(z) !== erwartet22[z.kurz]) {
        fh.push("T22 " + z.kurz + " muss Klasse " + erwartet22[z.kurz]
          + " sein, ist " + uKlasse(z));
      }
    });
    const p22 = { meta: { quellen: {} }, klima: {}, luftdichtheit: { kategorie: "messung" },
                  raeume: [], zonen: [], bauteiltypen: [] };
    const e22 = { klima: { theta_e: -10, theta_e_m: 10 }, norm: { DELTA_U_WB: 0.1 },
                  raeume: [], A_gesamt: 0 };
    const kf22 = konfidenz(p22, e22, z22);
    ["a", "b"].forEach(function (id) {
      const t = kf22.eintraege.find(function (x) { return x.schluessel === "bauteil:" + id; });
      const z = z22.find(function (x) { return x.typ.id === id; });
      if (t && t.klasse !== uKlasse(z)) {
        fh.push("T22 Kapitel 5 und Konfidenztabelle uneins über " + z.kurz
          + ": " + uKlasse(z) + " gegen " + t.klasse);
      }
    });

    /* --- T23 Additionsprobe schlägt an, wenn eine Zeile fehlt ----------- *
     * Eine Prüfzeile, die immer besteht, ist wertlos. Deshalb wird hier
     * beides geprüft: dass die Probe bei heiler Rechnung aufgeht UND dass
     * sie bei einer manipulierten Anlage 1 anschlägt. */
    const e23 = { klima: { theta_e: -10 }, norm: { DELTA_U_WB: 0.1, F_G1: 1.45, G_W: 1 },
      raeume: [{ theta_i: 20, phi_V: 100, phi_RH: 0, bauteile: [
        { kat: "huelle", A: 10, U: 1.0, U_eff: 1.1, theta_j: -10, phi: 330 },
        { kat: "innen", A: 5, U: 1.0, U_eff: 1.0, theta_j: 24, phi: -20 },
      ] }] };
    const ap23 = additionsprobe(e23);
    if (Math.abs(ap23.summe - 430) > 1e-6) {
      fh.push("T23 Additionsprobe muss 430 W ergeben, ergibt " + ap23.summe);
    }
    if (ap23.zeilen !== 1) fh.push("T23 Innenbauteile zählen nicht mit");
    const e23b = JSON.parse(JSON.stringify(e23));
    e23b.raeume[0].bauteile[0].A = 9;      // eine Fläche verstellt
    if (Math.abs(additionsprobe(e23b).summe - 430) < 0.5) {
      fh.push("T23 die Probe muss anschlagen, wenn eine Fläche nicht stimmt");
    }

    /* --- T24 feste Temperaturen der Zonenhülle ------------------------- */
    const fz24 = festeZonenTemperaturen({ zonen: [
      { id: "k", name: "Keller", huelle: [
        { name: "Kellerwand erdberührt", A: 40, U: 0.8, grenzt_an: { typ: "fest", theta: 7 } },
        { name: "Kellerboden", A: 70, U: 0.35, grenzt_an: { typ: "fest", theta: 7 } },
        { name: "Kellerfenster", A: 3, U: 2.8, grenzt_an: { typ: "aussen" } },
      ] }] });
    if (fz24.length !== 1 || fz24[0].teile.length !== 2 || fz24[0].theta !== 7) {
      fh.push("T24 die 7 °C der Kellerbilanz müssen mit beiden Bauteilen erscheinen");
    }
    if (festeZonenTemperaturen({ zonen: [] }).length !== 0) {
      fh.push("T24 ohne Zonen darf nichts entstehen");
    }

    /* --- T25 keine Prüfzeile darf ihre eigene Zahl vergleichen ---------- *
     * Der frühere „Bilanzschluss" verglich Summe(phi_raum) minus interne
     * Übertragung mit Summe(phi_gebaeude); der Kern bildet phi_gebaeude je
     * Raum als genau diese Differenz. Die Zeile war damit eine Identität.
     * Dieser Test hält fest, dass sie nicht zurückkommt, und verlangt für
     * jede Zeile ein Kriterium. */
    const pz25 = pruefzeilen({ meta: {}, abgleiche: [] },
      { raeume: [], klima: { theta_e: -10 }, norm: { DELTA_U_WB: 0.1 },
        phi_gebaeude: 0, phi_raeume_summe: 0, A_gesamt: 0 }, [], []);
    pz25.forEach(function (x) {
      if (!x.kriterium) fh.push("T25 Prüfzeile ohne Kriterium: " + x.pruefung);
      /* Ohne die Angabe, wie das Ergebnis entstanden ist, sieht jede Zeile mit
         zwei gleichen Zahlen wie ein Selbstvergleich aus. */
      if (!x.weg) fh.push("T25 Prüfzeile ohne Weg zum Ergebnis: " + x.pruefung);
      if (/Bilanzschluss/.test(x.pruefung)) {
        fh.push("T25 der Bilanzschluss war eine Identität und darf nicht zurückkommen");
      }
      if (/Selbsttest/.test(x.pruefung)) {
        fh.push("T25 der Selbsttest der Software ist keine Prüfung dieses Gebäudes");
      }
    });

    /* --- T26 Randbedingungen, die in keiner Formel fehlen dürfen -------- *
     * Beanstandet war, dass e, Epsilon und Phi_RH in den Formeln stehen, im
     * Bericht aber nirgends genannt sind, und dass die Räume zu den e-Stufen
     * fehlten. Geprüft wird deshalb: die Stufen führen ihre Räume mit
     * Geschoss, und Epsilon wie Phi_RH stehen in der Konfidenztabelle. */
    const p26 = { raeume: [
      { id: "r1", n_exponiert: 0 }, { id: "r2", n_exponiert: 2 },
      { id: "r3", e: 0.05 }],
      meta: { quellen: {} }, klima: {}, luftdichtheit: { kategorie: "messung" },
      zonen: [], bauteiltypen: [] };
    const e26 = { klima: { theta_e: -10, theta_e_m: 10 }, norm: { DELTA_U_WB: 0.1 },
      phi_RH_gebaeude: 0, A_gesamt: 0, raeume: [
        { id: "r1", geschoss: "EG", raum: "Diele", e: 0.00, epsilon: 1 },
        { id: "r2", geschoss: "OG", raum: "Diele", e: 0.03, epsilon: 1 },
        { id: "r3", geschoss: "DG", raum: "Bad", e: 0.05, epsilon: 1 }] };
    const ak26 = abschirmklassen(p26, e26);
    if (ak26.length !== 3) fh.push("T26 drei e-Stufen erwartet, " + ak26.length);
    const st0 = ak26.find(function (x) { return x.k === "0.00"; });
    if (!st0 || st0.raeume.join(",") !== "EG Diele") {
      fh.push("T26 die Stufe muss ihre Räume mit Geschoss nennen");
    }
    const st5 = ak26.find(function (x) { return x.k === "0.05"; });
    if (!st5 || !st5.eigene) fh.push("T26 ein von Hand gesetztes e muss auffallen");
    const kf26 = konfidenz(p26, e26, []);
    ["epsilon", "phi_rh"].forEach(function (s) {
      const t = kf26.eintraege.find(function (x) { return x.schluessel === s; });
      if (!t) fh.push("T26 " + s + " fehlt in der Konfidenztabelle");
      else if (t.klasse !== "C") {
        fh.push("T26 " + s + " ist eine Voreinstellung und damit Klasse C, nicht "
          + t.klasse);
      }
    });

    /* --- T27 der Hinweis einer Prüfzeile muss gedruckt werden ---------- *
     * Der Hinweis zur spezifischen Heizlast war gesetzt, wurde aber nie
     * ausgegeben. Damit fehlte im Bericht der Satz, der den Widerspruch zum
     * Kapitel Objekt und Datengrundlage auflöst. */
    const k27 = kapitelPlan({ plan: { bilder: [] }, zonen: [] });
    const t27 = kapitel9({ meta: {} }, { raeume: [] }, [
      { pruefung: "Beispiel", weg: "Weg", ist: 1, soll: 1, quelle: "Q",
        kriterium: "K", status: "bestanden", nk: 0, einheit: "",
        hinweis: "DIESER SATZ MUSS ERSCHEINEN" }], k27, function (n) { return n; });
    if (t27.indexOf("DIESER SATZ MUSS ERSCHEINEN") < 0) {
      fh.push("T27 der Hinweis einer Prüfzeile wird nicht gedruckt");
    }
    if (t27.indexOf("Ergebnis: Weg") < 0) {
      fh.push("T27 der Weg zum Ergebnis wird nicht gedruckt");
    }

    /* --- T28 die Baustellensuche muss jede ihrer Regeln finden --------- *
     * Ein Prüfer, der nie anschlägt, ist schlimmer als keiner: er bescheinigt
     * Sauberkeit, die er gar nicht messen kann. Deshalb bekommt jede Regel
     * hier ein Beispiel, an dem sie anschlagen MUSS, und die saubere Fassung
     * derselben Stelle, an der sie schweigen muss. Über den echten Bericht
     * läuft dieselbe Funktion in build.py, Schritt 5b. */
    const treffer = (h) => baustellenSuche(h).map(function (x) { return x.regel; });
    const mussFinden = [
      ["<p>Hier fehlt noch TODO der Rest.</p>", "Werkstattmarke"],
      ["<p>Der Wert ist [Platzhalter] geblieben.</p>", "Werkstattmarke"],
      ["<p>Zwischenstand aus dem MODELL übernommen.</p>", "MODELL"],
      ["<p>Die Heizlast beträgt undefined kW.</p>", "Programmierrest"],
      ["<p>Es sind NaN Räume erfasst.</p>", "Programmierrest"],
      ["<p>Norm-Außentemperatur: null</p>", "null als Wert"],
      ["<p>Die Leistung ist null kW.</p>", "null als Wert"],
      ["<p>Fläche [Bauteil hier eintragen] fehlt.</p>", "eckige Klammer"],
      ["<p>Zwei  Leerzeichen mitten im Satz.</p>", "doppeltes Leerzeichen"],
      ['<p>Die Spalte „Ergebnis" trägt zwei Zeichen.</p>', "Anführung"],
      ['<p>Raum "OG Diele" ohne Hüllbauteil.</p>', "gerade Anführungszeichen"],
      ['<div class="kzw">9,1</div>', "Kennzahl ohne Einheit"],
      ['<div class="kzw"><span class="kze">kW</span></div>', "Kennzahl ohne Wert"],
      ["<h2>4 Bauteile und U-Werte</h2><h2>5 Weiter</h2><p>Text, lang genug für die "
        + "Regel.</p>", "Überschrift ohne Text darunter"],
      ["<h3></h3><p>Ein Absatz, der lang genug ist, um die Regel zu erfüllen.</p>",
        "leere Überschrift"],
      /* Genau der Satz, der auf dem Ergebnisblatt stand. */
      ["<p>Wärmeströme der Gebäudehuelle, ohne Bauteile zwischen Räumen.</p>",
        "Ersatzschreibung"],
      ["<p>Die Raeume sind vollstaendig erfasst.</p>", "Ersatzschreibung"],
    ];
    mussFinden.forEach(function (fall) {
      if (!treffer(fall[0]).some(function (r) { return r.indexOf(fall[1]) >= 0; })) {
        fh.push("T28 die Baustellensuche findet " + fall[1] + " nicht in: " + fall[0]);
      }
    });
    /* Und nichts erfinden: eine saubere Seite muss ohne Befund bleiben. */
    const sauber = '<h2>1 Ergebnis auf einen Blick</h2>'
      + '<div class="kzw">9,1<span class="kze">kW</span></div>'
      + "<p>Die Norm-Heizlast des Gebäudes beträgt 9,05 kW bei &minus;9,6 °C. "
      + "Der Temperaturgradient ist unterhalb von 200 m null. Auf null gesetzt "
      + "ist auch die Aufheizleistung.</p>"
      + '<table><tr><th>Bauteil</th><th>A [m²]</th><th>&Phi;<sub>T</sub> [W]</th>'
      + "<th>H [W/K]</th><th>U [W/(m²·K)]</th></tr>"
      + "<tr><td>Fenster</td><td>34,2</td><td>1.051</td><td>36</td><td>0,95</td></tr>"
      + "</table>"
      + "<p>Die Fußzeile trennt mit &nbsp;·&nbsp; und das ist kein doppeltes "
      + "Leerzeichen. Die Spalte „Ergebnis“ ist richtig gesetzt.</p>"
      /* Eine Netzadresse bleibt ASCII und ist deshalb kein Befund. */
      + "<p>Quelle: BWP-Klimakarte, waermepumpe.de, Stand 21.08.2026.</p>";
    const rest = baustellenSuche(sauber);
    if (rest.length) {
      fh.push("T28 saubere Seite falsch beanstandet: "
        + rest.map(function (x) { return x.regel + " (" + x.stelle + ")"; }).join(" | "));
    }

    /* --- T28b die Druckfassungs-Suche muss jede ihrer Regeln finden ------ *
     * Gleiche Logik wie T28: jede Regel bekommt ein Beispiel, an dem sie
     * anschlagen MUSS, die Ausnahmen ein Beispiel, an dem sie schweigen
     * muss. Über die echte Druckfassung läuft druckSuche in build.py 5b. */
    const dTreffer = (h) => druckSuche(h).map(function (x) { return x.regel; });
    [
      ["<p>Geschätzte Spanne 7,4 bis 14,3 kW.</p>", "Spanne"],
      ["<p>Die plausible Bandbreite der Zahl.</p>", "Spanne"],
      ["<p>Konfidenzklasse C, siehe unten.</p>", "Konfidenz"],
      ["<p>Der Wert liegt in Klasse B der Tabelle.</p>", "Konfidenzklasse"],
      ["<p>Die BEG EM Anforderung ist 0,24.</p>", "BEG"],
      ["<p>Der U-Wert ist nicht belegt.</p>", "belegt"],
      ["<p>Das Baujahr ist eine Annahme.</p>", "Annahme"],
      ["<p>Das Baujahr wurde angenommen.</p>", "Annahme"],
      ["<p>Die Plausibilitätsprüfung ist bestanden.</p>", "Prüfung"],
      ["<p>Quelle: Klimakarte des BWP.</p>", "Quelle"],
      ["<p>Spalte Sicherheit: unsicher.</p>", "Sicherheit"],
    ].forEach(function (fall) {
      if (!dTreffer(fall[0]).some(function (r) { return r.indexOf(fall[1]) >= 0; })) {
        fh.push("T28b druckSuche findet " + fall[1] + " nicht in: " + fall[0]);
      }
    });
    /* Die drei begründeten Ausnahmen bleiben stumm: Kenntnisnahme-Kasten,
       roter Kasten der nicht bestandenen Selbstprüfung, Normtitel der
       DIN EN 442-2. Alles außerhalb der Marken wird weiter gefunden. */
    const dSauber = '<div class="kasten kenntnisnahme"><b>Durchsicht durch den '
      + "Bearbeiter</b><br>Die Selbstprüfung des Werkzeugs hat zu diesem Projekt "
      + "17 Punkte aufgeworfen. Sebastian Hund hat jeden davon geprüft und zur "
      + "Kenntnis genommen.</div>"
      + '<div class="sperr selbstpruefung">Die Selbstprüfung dieses Berichts ist '
      + "nicht bestanden: 2 Befunde der Stufe Fehler.</div>"
      + "<p>Norm-Wärmeleistung nach DIN EN 442-2:2015-03 „Radiatoren und "
      + "Konvektoren, Teil 2: Prüfverfahren und Leistungsangabe“.</p>"
      + "<p>Die Norm-Heizlast des Gebäudes beträgt 9,05 kW bei −9,6 °C, "
      + "angesetzt für durchgehenden Heizbetrieb.</p>";
    const dRest = druckSuche(dSauber);
    if (dRest.length) {
      fh.push("T28b Ausnahme falsch beanstandet: "
        + dRest.map(function (x) { return x.regel + " (" + x.stelle + ")"; }).join(" | "));
    }
    if (!druckSuche(dSauber + "<p>Dazu die Konfidenz je Wert.</p>").length) {
      fh.push("T28b außerhalb der Ausnahmen muss weiter gefunden werden");
    }

    /* --- T29 Kapitel 1 trägt denselben Vorbehalt wie das Deckblatt ------ *
     * Das Deckblatt sagte, dass die Aufbauten vor der Bestellung zu
     * bestätigen sind; Kapitel 1 zeigte drei harte Zahlen und schwieg. Beide
     * müssen denselben Satz führen, und zwar aus derselben Funktion. */
    const e29 = { klima: { theta_e: -10 }, A_gesamt: 100, phi_gebaeude: 9000,
      phi_T_gebaeude: 6000, phi_V_gebaeude: 3000, phi_RH_gebaeude: 0,
      phi_raeume_summe: 9000, spez_raumflaeche: 90, je_geschoss: {},
      raeume: [{ theta_i: 20, geschoss: "EG", raum: "R1", bauteile: [
        { kat: "huelle", A: 10, U: 1, U_eff: 1.1, theta_j: -10, phi: 330,
          annahme: true, name: "Wand" }] }] };
    /* Der Selbsttest läuft im Build ohne den Satzbaukasten: dort wird dieses
       Modul allein geladen. Geprüft wird hier der Vorbehaltskasten und die
       Fußnote, nicht das Setzen der Kennzahlenreihe; die steht im Selbsttest
       von modul_berichtsatz.js. Für die Dauer der Prüfung tritt deshalb ein
       Platzhalter an ihre Stelle, sofern der echte fehlt. */
    const satzMerk = window.MODUL_BERICHTSATZ;
    if (!satzMerk) window.MODUL_BERICHTSATZ = { kennzahlreihe: function () { return ""; } };
    function kap1(p, e, g) {
      try { return kapitel1(p, e, g); }
      catch (x) { fh.push("T29 kapitel1 bricht ab: " + (x && x.message)); return ""; }
    }
    const k29 = kap1({ meta: {}, texte: {} }, e29, []);
    const satz29 = ortsterminSatz(annahmeAnteil(e29));
    if (k29.indexOf(satz29) < 0) {
      fh.push("T29 Kapitel 1 muss den Vorbehalt des Deckblatts wortgleich tragen");
    }
    /* Und er darf nicht erfunden werden, wo es nichts zu bemängeln gibt:
       ohne Annahme bleibt der Kasten nicht leer, sondern sagt Nein. */
    const e29b = JSON.parse(JSON.stringify(e29));
    e29b.raeume[0].bauteile[0].annahme = false;
    if (kap1({ meta: {}, texte: {} }, e29b, []).indexOf("Nein.") < 0) {
      fh.push("T29 ohne Annahmen muss Kapitel 1 die Entwarnung tragen");
    }

    /* --- T30 Raumfläche und Geschossfläche sind eine Größe -------------- *
     * Oben "206,04 m² Raumfläche", vier Zeilen tiefer dreimal "68,68 m²
     * Geschossfläche". Deckt sich die Summe, muss das dastehen; deckt sie
     * sich nicht, darf es nicht dastehen. */
    const e30 = JSON.parse(JSON.stringify(e29));
    e30.A_gesamt = 200;
    e30.je_geschoss = { EG: { phi_gebaeude: 4500, A: 100 },
                        OG: { phi_gebaeude: 4500, A: 100 } };
    const k30 = kap1({ meta: {}, texte: {} }, e30, ["EG", "OG"]);
    if (k30.indexOf("dieselbe Fläche") < 0) {
      fh.push("T30 deckende Geschossflächen müssen als dieselbe Größe benannt sein");
    }
    const e30b = JSON.parse(JSON.stringify(e30));
    e30b.je_geschoss.OG.A = 60;
    if (kap1({ meta: {}, texte: {} }, e30b, ["EG", "OG"]).indexOf("dieselbe Fläche") >= 0) {
      fh.push("T30 bei nicht deckenden Flächen darf keine Gleichheit behauptet werden");
    }
    if (!satzMerk) delete window.MODUL_BERICHTSATZ;
    else window.MODUL_BERICHTSATZ = satzMerk;

    /* --- T31 Kapitel 8: die Zahl im Kasten wird nicht behauptet --------- *
     * Der Kasten sagte pauschal, die Einzelwirkungen addierten sich nicht,
     * und stand damit gegen die Tabelle darüber, sobald sie es doch tun.
     * Geprüft wird beides: der additive Fall und der nicht additive. */
    const p31 = { meta: {}, texte: {} };
    const e31 = { phi_gebaeude: 9000 };
    const pk31 = [{ titel: "A", warum: "x", delta: -1000, aenderung: {}, kurz: "Dach" },
                  { titel: "B", warum: "y", delta: -600, aenderung: {}, kurz: "Haustür" }];
    const k31 = kapitel8(pk31, { eintraege: [] }, k15,
      { anzahl: 2, phi: 7400, delta: -1600 }, e31);
    if (k31.indexOf("beides zum selben Ergebnis") < 0) {
      fh.push("T31 der additive Fall muss als solcher benannt werden");
    }
    const k31b = kapitel8(pk31, { eintraege: [] }, k15,
      { anzahl: 2, phi: 7600, delta: -1400 }, e31);
    if (k31b.indexOf("aufaddiert ergäbe") < 0
        || k31b.indexOf("200 W") < 0) {
      fh.push("T31 der nicht additive Fall muss die Abweichung beziffern");
    }
    /* Und die Zahl darf nicht ohne die Bedingung dastehen, unter der sie
       gilt: die Bauteile müssen gebaut und belegt sein. */
    if (k31.indexOf("erst, wenn gebaut ist") < 0
        || k31.indexOf("Dach und Haustür") < 0) {
      fh.push("T31 der Auslegungsvorbehalt samt Bauteilen fehlt im Kasten");
    }

    /* --- T32 Fehler der Selbstprüfung erreichen die Handlungsliste ------ *
     * Ein Raum ohne Hüllbauteil ist ein Fehler und stand nur im Prüfkapitel,
     * nicht dort, wo abgearbeitet wird. Hinweise und Bestandenes bleiben
     * draußen — auch die Altstufe "warnung", falls ein gespeicherter Stand
     * sie noch trägt. */
    const merk32 = window.App;
    window.App = { pruefung: { pruefungen: [
      { stufe: "fehler", titel: "Räume ohne Bauteil zur Hülle",
        text: "OG Diele hat kein einziges Bauteil gegen Außenluft." },
      { stufe: "warnung", titel: "Belegte Werte gegen Annahmen", text: "w" },
      { stufe: "hinweis", titel: "Absicherung des Maßstabs", text: "h" },
      { stufe: "gut", titel: "Alles gut", text: "g" },
    ] } };
    let pk32 = [];
    try {
      pk32 = offenePunkte({ meta: {}, texte: {}, offene_punkte: [] },
        { raeume: [] }, [], { eintraege: [] });
    } finally { window.App = merk32; }
    const titel32 = pk32.map(function (x) { return x.titel; });
    if (titel32.indexOf("Räume ohne Bauteil zur Hülle") < 0) {
      fh.push("T32 ein Fehler der Selbstprüfung muss auf die Handlungsliste");
    }
    if (titel32.indexOf("Belegte Werte gegen Annahmen") >= 0
        || titel32.indexOf("Absicherung des Maßstabs") >= 0
        || titel32.indexOf("Alles gut") >= 0) {
      fh.push("T32 Hinweise und bestandene Prüfungen gehören nicht dorthin");
    }

    /* --- T33 Kapitel 10: keine Werkstattmarke, keine Wiederholung ------- *
     * "LEITPARAMETER." stand in Großbuchstaben und wurde nirgends erklärt.
     * Und zwanzig wortgleiche Begründungen kosteten drei Seiten. */
    const p33 = { meta: {}, texte: {} };
    const e33 = { raeume: [{ theta_i: 20, bauteile: [
      { kat: "huelle", A: 10, U: 2, U_eff: 2.1, theta_j: -10, phi: 600, annahme: true },
      { kat: "huelle", A: 10, U: 1, U_eff: 1.1, theta_j: -10, phi: 400, annahme: true },
    ] }] };
    const gleich33 = "Aus dem Referenzprojekt übernommen.";
    const kf33 = { eintraege: [
      { klasse: "C", angabe: "Dach U = 2,00", quelle: gleich33, schluessel: "a",
        phi: 600, leit: true },
      { klasse: "C", angabe: "Wand U = 0,47", quelle: gleich33, schluessel: "b", phi: 0 },
      { klasse: "C", angabe: "Fenster U = 0,95", quelle: gleich33, schluessel: "c", phi: 0 },
      { klasse: "C", angabe: "Haustür U = 3,00", quelle: gleich33, schluessel: "d", phi: 0 },
      { klasse: "C", angabe: "Luftdichtheit n50 = 4,0", quelle: "Eigener Satz.",
        schluessel: "e", phi: 0 },
    ] };
    const k33 = kapitel10(p33, e33, kf33, k15, []);
    if (k33.indexOf("LEITPARAMETER") >= 0) {
      fh.push("T33 die Werkstattmarke LEITPARAMETER darf nicht mehr gedruckt werden");
    }
    if (k33.indexOf("Leitparameter dieser Berechnung") < 0
        || k33.indexOf("60 Prozent") < 0) {
      fh.push("T33 der Leitparameter muss an Ort und Stelle erklärt und beziffert sein");
    }
    /* Dreimal derselbe Satz wird einmal gedruckt, der einmalige bleibt. */
    const wieOft33 = k33.split(gleich33).length - 1;
    if (wieOft33 !== 2) {
      fh.push("T33 die wortgleiche Begründung darf nur beim Leitparameter und einmal "
        + "gebündelt stehen, gefunden " + wieOft33 + " mal");
    }
    ["Wand U = 0,47", "Fenster U = 0,95", "Haustür U = 3,00",
     "Luftdichtheit n50 = 4,0"].forEach(function (a) {
      if (k33.indexOf(a) < 0) fh.push("T33 gebündelt heißt nicht weggelassen: " + a);
    });
    /* Unter drei Vorkommen wird nicht gebündelt: dann zerreißt es mehr,
       als es spart. */
    const kf33b = { eintraege: [
      { klasse: "C", angabe: "Wand", quelle: gleich33, schluessel: "b", phi: 0 },
      { klasse: "C", angabe: "Fenster", quelle: gleich33, schluessel: "c", phi: 0 },
    ] };
    if (kapitel10(p33, e33, kf33b, k15, []).split(gleich33).length - 1 !== 2) {
      fh.push("T33 zwei gleiche Begründungen bleiben zwei Zeilen");
    }

    /* --- T34 Kapitel 8 verschweigt keinen Hebel ------------------------- *
     * Der Sperrbefund in Zahlen: vier Außenwände mit zusammen rund 2,3 kW
     * Wärmestrom standen in der Bauteiltabelle ohne Anforderungswert, fielen
     * damit aus der nach Wirkung geordneten Liste, und der Abschlusskasten
     * las sich trotzdem wie eine Restheizlast. Geprüft wird beides: dass die
     * Lücke gefunden und benannt wird, und dass der Kasten dann keine
     * Vollständigkeit mehr behauptet. */
    const zl = function (kurz, phi, anf, bew) {
      return { verwendet: true, nur_innen: false, kurz: kurz, name: kurz,
               phi: phi, anforderung: anf, bewertung: bew };
    };
    /* herkunft gesetzt und trotzdem kein Wert: die Bauteilart ist erkannt,
       die Datei führt nur nichts dazu. Genau dieser Zustand lag beim
       Sperrbefund vor. */
    const ohneWert34 = { u_max: null, lambda_max: null, herkunft: "name" };
    const ohneArt34 = { u_max: null, lambda_max: null, herkunft: null };
    const mitAnf = { u_max: 0.20, lambda_max: null, herkunft: "name" };
    const zeilen34 = [
      zl("Außenwand Giebel", 957, ohneWert34, { text: "Bauteil bleibt", erfuellt: null }),
      zl("Außenwand Garten", 573, ohneWert34, { text: "Bauteil bleibt", erfuellt: null }),
      zl("Haustrennwand", 509, ohneArt34, { text: "Bauteil bleibt", erfuellt: null }),
      zl("Dachschräge", 1500, mitAnf, { text: "NICHT erfüllt", erfuellt: false }),
      zl("Fenster", 800, mitAnf, { text: "erfüllt", erfuellt: true }),
      zl("Kleinkram", 12, ohneArt34, { text: "Bauteil bleibt", erfuellt: null }),
    ];
    const lk34 = wirkungsLuecken(zeilen34);
    if (lk34.ohne_wert.length !== 2) {
      fh.push("T34 beide Wände ohne Anforderungswert müssen als Lücke erscheinen, "
        + "gefunden: " + lk34.ohne_wert.length);
    }
    if (lk34.ohne_art.length !== 1) {
      fh.push("T34 die Haustrennwand gehört in die Gruppe ohne Bauteilart");
    }
    if (lk34.ohne_wert[0] && lk34.ohne_wert[0].kurz !== "Außenwand Giebel") {
      fh.push("T34 die Lücken stehen nach Wärmestrom, die größte zuerst");
    }
    if (Math.abs(lk34.fehlend - 2039) > 1) {
      fh.push("T34 die fehlende Summe muss 2039 W sein, ist " + lk34.fehlend);
    }
    if (lk34.ohne_punkt.length) {
      fh.push("T34 ein erfülltes und ein verfehltes Bauteil sind keine Lücke");
    }
    /* Das kleine Bauteil unter der Schwelle bleibt draußen, sonst steht der
       Kasten bei jedem Bericht. */
    if (lk34.alle.some(function (x) { return x.kurz === "Kleinkram"; })) {
      fh.push("T34 unterhalb der Schwelle gehört nichts in die Lückenliste");
    }
    const k34 = kapitel8(pk31, { eintraege: [] }, k15,
      { anzahl: 2, phi: 7400, delta: -1600 }, e31, lk34);
    if (k34.indexOf("nicht vollständig") < 0 || k34.indexOf("Außenwand Giebel") < 0
        || k34.indexOf("957 W") < 0) {
      fh.push("T34 die Lücke muss im Kapitel benannt und beziffert werden");
    }
    if (k34.indexOf("keine Restheizlast") < 0) {
      fh.push("T34 bei einer Lücke darf der Kasten keine Restheizlast behaupten");
    }
    if (k34.indexOf("Werden alle ") >= 0) {
      fh.push("T34 der Kasten darf nicht mehr von allen Punkten sprechen");
    }
    /* Ohne Lücke bleibt die Aussage stehen, sonst wäre die Warnung wertlos. */
    const k34b = kapitel8(pk31, { eintraege: [] }, k15,
      { anzahl: 2, phi: 7400, delta: -1600 }, e31,
      wirkungsLuecken(zeilen34.filter(function (z) {
        return z.kurz === "Dachschräge" || z.kurz === "Fenster"; })));
    if (k34b.indexOf("nicht vollständig") >= 0) {
      fh.push("T34 ohne Lücke darf keine Unvollständigkeit behauptet werden");
    }
    if (k34b.indexOf("kein Hüllbauteil mit nennenswertem Wärmestrom fehlt") < 0) {
      fh.push("T34 ohne Lücke gehört die Vollständigkeit ausdrücklich hin");
    }
    /* Und die leere Liste darf sich nicht als Unbedenklichkeit lesen. */
    const k34c = kapitel8([], { eintraege: [] }, k15, null, e31, lk34);
    if (k34c.indexOf("leer, aber nicht vollständig") < 0) {
      fh.push("T34 auch die leere Liste muss ihre Lücken nennen");
    }

    /* --- T35 Die Außenwand trägt wieder ihren Anforderungswert ---------- *
     * Die Ursache des Sperrbefunds lag in daten_beg_anforderungen.js. Hier
     * wird sie von der Seite des Berichts aus festgenagelt: aus einer
     * Außenwand mit 0,47 muss ein bezifferter Punkt entstehen. */
    const BEG35 = window.DATEN_BEG_ANFORDERUNGEN;
    if (BEG35) {
      const a35 = BEG35.zuBauteil({ name: "Außenwand Giebel" });
      if (a35.u_max !== 0.20) {
        fh.push("T35 die Außenwand muss 0,20 W/(m²·K) bekommen, ist " + a35.u_max);
      }
      if (BEG35.bewertung({}, 0.47, a35).erfuellt !== false) {
        fh.push("T35 eine Außenwand mit 0,47 muss die Anforderung verfehlen");
      }
      if (!a35.quelle || !a35.bedingung) {
        fh.push("T35 der Wert muss mit Fundstelle und Bedingung kommen");
      }
    }

    /* --- T36 Die saubere Ausgabe, wenn ein Mensch alles abgehakt hat ---- *
     * Der Auftrag des Kunden, wörtlich: "wenn überall ein hacken dran ist
     * durch den nutzer möchte ich eine fehlerfreie ausgabe ohne die hinweise
     * wenn ein mensch das abgehackt hat". Genau das wird hier festgenagelt,
     * in beide Richtungen: die Hinweise müssen verschwinden, UND der Satz
     * über die Durchsicht muss stehen bleiben. Ohne ihn läse sich der
     * Bericht, als hätte das Werkzeug nichts gefunden. */
    const k36 = kapitelPlan({ plan: { bilder: [] }, zonen: [] });
    const pz36 = [{ pruefung: "Beispiel", weg: "Weg", ist: 1, soll: 1, quelle: "Q",
      kriterium: "K", status: "bestanden", nk: 0, einheit: "" }];
    const merk36 = window.App;
    const HINWEISTEXT = "Im Raumbuch stehen 6 Raeume, die Sollzahl ist unbekannt.";
    const bau36 = function (stufen, stand) {
      /* stufen: je Zeile die Stufe. Bestätigte tragen einen Eintrag. */
      const pruefungen = stufen.map(function (st, i) {
        const z = { id: "z" + i, titel: "Punkt " + i, stufe: st, text: HINWEISTEXT };
        if (st === "bestaetigt") {
          z.bestaetigt = { wer: "Sebastian Hund", zeit: "2026-08-21 16:54",
                           grund: i === 0 ? "Ist ein innen liegender Flur." : "" };
        }
        return z;
      });
      const zaehl = { fehler: 0, warnung: 0, offen: 0, hinweis: 0, bestaetigt: 0, gut: 2 };
      pruefungen.forEach(function (x) { zaehl[x.stufe] = (zaehl[x.stufe] || 0) + 1; });
      const offen = zaehl.fehler + zaehl.warnung + zaehl.offen + zaehl.hinweis;
      return { pruefungen: pruefungen, zaehl: zaehl,
        ampel: zaehl.fehler ? "rot" : ((zaehl.warnung || zaehl.offen) ? "gelb" : "gruen"),
        belastbar: zaehl.fehler === 0,
        bestaetigung: { offen: offen, bestaetigt: zaehl.bestaetigt,
          gesamt: offen + zaehl.bestaetigt, alles: offen === 0 && zaehl.bestaetigt > 0,
          namen: zaehl.bestaetigt ? ["Sebastian Hund"] : [],
          stand: stand === undefined ? "21.08.2026" : stand, tage: 1,
          vermerke: zaehl.bestaetigt ? 1 : 0 } };
    };
    const mit36 = function (pr, fn) {
      window.App = { pruefung: pr };
      try { return fn(); } finally { window.App = merk36; }
    };

    /* a) Sebastians Fall vorher: ein Fehler, offene Fragen, Hinweise. */
    const roh36 = bau36(["fehler", "offen", "offen", "hinweis", "warnung"]);
    const vor36 = mit36(roh36, function () {
      return kapitel9({ meta: {} }, { raeume: [] }, pz36, k36, function (n) { return n; });
    });
    if (vor36.indexOf(HINWEISTEXT) < 0) {
      fh.push("T36 solange nichts abgehakt ist, müssen die Befunde im Bericht stehen");
    }
    if (vor36.indexOf("undefined") >= 0) {
      fh.push("T36 die Stufe „offen" + '"' + " darf nicht als undefined gedruckt werden");
    }
    if (vor36.indexOf("Offene Frage") < 0) {
      fh.push("T36 die Stufe „offen" + '"' + " braucht ein Wort in der Tabelle");
    }
    if (vor36.indexOf("2 offene Fragen") < 0) {
      fh.push("T36 offene Fragen müssen auch im Kopf gezählt werden");
    }
    if (vor36.indexOf("durchgesehen") >= 0 || vor36.indexOf("zur Kenntnis genommen") >= 0) {
      fh.push("T36 ohne Bestätigung darf kein Satz über eine Durchsicht dastehen");
    }

    /* b) Sebastians Fall nachher: alles abgehakt. */
    const alles36 = bau36(["bestaetigt", "bestaetigt", "bestaetigt",
                           "bestaetigt", "bestaetigt"]);
    const nach36 = mit36(alles36, function () {
      return kapitel9({ meta: {} }, { raeume: [] }, pz36, k36, function (n) { return n; });
    });
    if (nach36.indexOf(HINWEISTEXT) >= 0) {
      fh.push("T36 abgehakte Punkte dürfen im Bericht nicht mehr einzeln dastehen");
    }
    if (nach36.indexOf("undefined") >= 0) fh.push("T36 undefined im sauberen Bericht");
    if (nach36.indexOf("Sebastian Hund") < 0 || nach36.indexOf("21.08.2026") < 0) {
      fh.push("T36 der Satz muss Bearbeiter und Datum nennen");
    }
    if (nach36.indexOf("zur Kenntnis genommen") < 0) {
      fh.push("T36 der Satz über die Durchsicht fehlt");
    }
    /* Der falsche Freispruch: es gab Befunde, ein Mensch hat sie beurteilt.
       "Keine Befunde" wäre die stärkere und die unwahre Aussage. */
    if (nach36.indexOf("Keine Befunde") >= 0) {
      fh.push("T36 ein durchgesehener Bericht darf nicht „keine Befunde" + '"' + " behaupten");
    }
    if (nach36.indexOf("keine der Prüfungen hat einen Befund ergeben") >= 0) {
      fh.push("T36 der Ampelsatz darf die durchgesehenen Befunde nicht wegreden");
    }
    if (nach36.indexOf("Anlage 2") < 0) {
      fh.push("T36 der Verweis auf die Vermerke fehlt");
    }
    /* Kürzer muss er auch werden, sonst ist nichts gewonnen. */
    if (!(nach36.length < vor36.length)) {
      fh.push("T36 die saubere Ausgabe muss kürzer sein als die mit den Hinweisen");
    }

    /* c) Teilweise abgehakt: die Abgehakten fallen aus der Tabelle, die
          offenen bleiben, und beides wird benannt. */
    const teil36 = bau36(["bestaetigt", "offen", "hinweis"]);
    const zw36 = mit36(teil36, function () {
      return kapitel9({ meta: {} }, { raeume: [] }, pz36, k36, function (n) { return n; });
    });
    if (zw36.indexOf("1 Punkt von 3 sind durchgesehen") >= 0) {
      fh.push("T36 Einzahl und Mehrzahl im Zwischenstand passen nicht");
    }
    if (zw36.indexOf("sind durchgesehen") < 0 && zw36.indexOf("ist durchgesehen") < 0) {
      fh.push("T36 der Zwischenstand muss dastehen");
    }
    if (zw36.indexOf(HINWEISTEXT) < 0) {
      fh.push("T36 die noch offenen Punkte müssen in der Tabelle bleiben");
    }
    if (zw36.indexOf("2 Punkte sind dort aufgeführt") < 0) {
      fh.push("T36 der Zwischenstand muss die offenen Punkte beziffern");
    }

    /* d) Kein Name, kein Datum: nichts erfinden. */
    const ohne36 = bau36(["bestaetigt"], null);
    ohne36.bestaetigung.namen = [];
    const on36 = mit36(ohne36, function () { return durchgesehenKasten(ohne36.bestaetigung, 0); });
    if (on36.indexOf("Der Bearbeiter") < 0) {
      fh.push("T36 ohne Namen muss neutral „Der Bearbeiter" + '"' + " stehen");
    }
    if (/\d{2}\.\d{2}\.\d{4}/.test(on36)) {
      fh.push("T36 ohne Zeitpunkt darf kein Datum erfunden werden");
    }
    if (durchgesehenKasten(null, 0) !== "" ) {
      fh.push("T36 ohne Bestätigungen darf kein Kasten entstehen");
    }

    /* e) Anlage 2 trägt den Satz des Menschen, nicht den des Werkzeugs. */
    const a36 = mit36(alles36, function () { return anlage2(); });
    if (a36.indexOf("Ist ein innen liegender Flur.") < 0) {
      fh.push("T36 der Vermerk des Bearbeiters fehlt in Anlage 2");
    }
    if (a36.indexOf(HINWEISTEXT) >= 0) {
      fh.push("T36 Anlage 2 darf den Hinweistext des Werkzeugs nicht zurückholen");
    }
    if (a36.indexOf("21.08.2026, 16:54 Uhr") < 0) {
      fh.push("T36 Anlage 2 muss den Zeitpunkt der Aufnahme führen");
    }
    /* Ein Klick ohne Vermerk erzeugt keine Zeile, und ohne jeden Vermerk
       entsteht die Anlage gar nicht. Eine Anlage mit leerer Tabelle wäre
       schlimmer als keine. */
    const nurKlicks = bau36(["bestaetigt", "bestaetigt"]);
    nurKlicks.pruefungen.forEach(function (x) { x.bestaetigt.grund = ""; });
    if (mit36(nurKlicks, function () { return anlage2(); }) !== "") {
      fh.push("T36 ohne Vermerk darf keine Anlage 2 entstehen");
    }
    if (mit36(alles36, function () { return vermerkzeilen().length; }) !== 1) {
      fh.push("T36 nur Punkte mit Vermerk gehören in Anlage 2");
    }

    /* f) Jede Stufe, die die Selbstprüfung kennt, braucht ein Wort. */
    ["fehler", "warnung", "offen", "hinweis", "bestaetigt", "gut"].forEach(function (st) {
      if (!STUFENWORT[st]) fh.push("T36 keine Beschriftung für die Stufe " + st);
    });
    if (zeitpunkt("2026-08-21 16:54") !== "21.08.2026, 16:54 Uhr") {
      fh.push("T36 der Zeitpunkt wird falsch gesetzt: " + zeitpunkt("2026-08-21 16:54"));
    }
    if (zeitpunkt("") !== "" || zeitpunkt("gestern") !== "gestern") {
      fh.push("T36 was kein Zeitpunkt ist, darf nicht umgedeutet werden");
    }

    /* --- T37 Der Ausdruck nennt keine Prüfpunkte und keine Zähler ------- *
     * Sebastians Punkt 14 vom 26.08.2026: „Die Selbstprüfung des Werkzeugs
     * hat 3 Punkte aufgeworfen ..." darf im externen Bericht NICHT stehen.
     * Was bleibt, ist der Abschnitt „Prüfung" mit der Erklärung des
     * Ausstellers — sie ist keine interne Warnung, sondern eine Tatsache
     * über dieses Dokument, und trägt deshalb weiter Name und Zeitpunkt.
     * Geprüft wird beides, damit weder der Zähler zurückfällt noch die
     * Erklärung verlorengeht. */
    const kd37 = mit36(alles36, function () { return kenntnisnahmeDruck(); });
    if (kd37.indexOf("Die Berechnung wurde durch den Bearbeiter auf "
        + "Plausibilität und Vollständigkeit") < 0) {
      fh.push("T37 der Ausdruck braucht die Erklärung des Ausstellers wörtlich");
    }
    if (kd37.indexOf("<b>Prüfung</b>") < 0) {
      fh.push("T37 der Abschnitt vor der Unterschrift heißt „Prüfung" + '"');
    }
    ["Selbstprüfung", "aufgeworfen", "Punkte", "Befund", "interne Fassung",
     "zur Kenntnis genommen"].forEach(function (w) {
      if (kd37.indexOf(w) >= 0) {
        fh.push("T37 im Ausdruck darf „" + w + '" nicht stehen');
      }
    });
    if (/\d/.test(nurText(kd37).replace(/\d{2}\.\d{2}\.\d{4}/, ""))) {
      fh.push("T37 außer dem Datum darf im Kasten keine Zahl stehen: " + kd37);
    }
    if (kd37.indexOf("Sebastian Hund") < 0 || kd37.indexOf("21.08.2026") < 0) {
      fh.push("T37 Bearbeiter und Zeitpunkt der Durchsicht müssen dastehen");
    }
    if (druckSuche(kd37).length) {
      fh.push("T37 der Prüfungskasten muss begründete Ausnahme der druckSuche bleiben");
    }
    /* Ohne Bestätigung entsteht der Kasten nicht — nichts wird behauptet. */
    const leer37 = bau36(["offen"]);
    if (mit36(leer37, function () { return kenntnisnahmeDruck(); }) !== "") {
      fh.push("T37 ohne Durchsicht darf kein Prüfungskasten entstehen");
    }

    /* --- T38 Anzahl und Zuordnung der e-Stufen decken sich ------------- *
     * Sebastians Punkt 16: die Spalte „Räume" zählte 13, die Spalte
     * „Zuordnung" nannte 12 Namen — zwei Räume heißen gleich. Geprüft wird
     * die Deckung als Regel, nicht am Einzelfall: die Einträge der
     * Zuordnung müssen sich auf die gezählte Anzahl summieren. */
    const p38 = { raeume: [{ id: "a" }, { id: "b" }, { id: "c" }] };
    const e38 = { raeume: [
      { id: "a", geschoss: "EG", raum: "Flur", e: 0 },
      { id: "b", geschoss: "EG", raum: "Flur", e: 0 },
      { id: "c", geschoss: "OG", raum: "Bad", e: 0 }] };
    const ak38 = abschirmklassen(p38, e38);
    ak38.forEach(function (x) {
      const summe = x.zuordnung.reduce(function (n, t) {
        const m = /\((\d+) Räume\)$/.exec(t);
        return n + (m ? Number(m[1]) : 1);
      }, 0);
      if (summe !== x.anzahl) {
        fh.push("T38 Stufe e=" + x.k + ": " + x.anzahl + " gezählt, "
          + summe + " zugeordnet");
      }
    });
    if (!ak38.length || ak38[0].zuordnung.indexOf("EG Flur (2 Räume)") < 0) {
      fh.push("T38 gleichnamige Räume müssen in der Zuordnung beziffert werden");
    }
    if (ak38.length && ak38[0].zuordnung.indexOf("OG Bad") < 0) {
      fh.push("T38 ein einzelner Raum darf keine Zahl bekommen");
    }

    /* --- T39 Der Ausdruck trägt keine Planauslegung -------------------- *
     * Sebastians Punkte 16 und 20: „vermutlich kein Keller" stand im
     * Kundenbericht neben 182,6 m² Kellerdecke, und „Erdgeschoss, weitere
     * Geschosse nicht dargestellt" neben einer Rechnung über EG und OG. Die
     * beiden Lesetabellen des Plankapitels gehören deshalb in die interne
     * Fassung. Die ausgewerteten Blätter selbst bleiben im Ausdruck — sie
     * sind die Datengrundlage. Geprüft wird beides. */
    const merk39 = window.App;
    const p39 = { plan: { bilder: [],
        seiten: [{ nurDaten: true, bezeichnung: "Blatt 1" }] },
      plangebaeude: { geschosse: "Erdgeschoss (lt. Plankopf)" },
      planbefunde: [{ thema: "Keller", aussage: "vermutlich kein Keller",
        herleitung: "Der Plan zeigt nur das Erdgeschoss.", konfidenz: "unsicher" }],
      raeume: [], zonen: [], texte: {} };
    const ub39 = function (n, t) { return "<h2>" + n + " " + t + "</h2>"; };
    const un39 = function (n) { return n + ".1"; };
    let d39 = "", i39 = "";
    window.App = { p: p39 };
    try {
      d39 = planKapitel(3, un39, ub39, true);
      i39 = planKapitel(3, un39, ub39, false);
    } finally { window.App = merk39; }
    if (d39.indexOf("Blatt 1") < 0) {
      fh.push("T39 die ausgewerteten Blätter müssen im Ausdruck stehen");
    }
    ["Was den Unterlagen zu entnehmen ist", "Aus den Unterlagen abgeleitet",
     "vermutlich kein Keller", "Erdgeschoss (lt. Plankopf)"].forEach(function (w) {
      if (d39.indexOf(w) >= 0) {
        fh.push("T39 im Ausdruck darf „" + w + '" nicht stehen');
      }
    });
    ["Was den Unterlagen zu entnehmen ist", "Aus den Unterlagen abgeleitet",
     "vermutlich kein Keller", "Erdgeschoss (lt. Plankopf)",
     "unsicher"].forEach(function (w) {
      if (i39.indexOf(w) < 0) {
        fh.push("T39 der internen Fassung fehlt „" + w + '"');
      }
    });
    if (!(d39.length < i39.length)) {
      fh.push("T39 das Plankapitel des Ausdrucks muss kürzer sein als das interne");
    }
    if (druckSuche(d39).length) {
      fh.push("T39 das Plankapitel des Ausdrucks trägt Gütevokabular: "
        + druckSuche(d39).map(function (x) { return x.regel; }).join(", "));
    }

    /* --- T40 Keine Methode behaupten, die nicht stattgefunden hat ------ *
     * Sebastians Punkte 4 und 5. Der Bericht schrieb „stationäre
     * Wärmebilanz" auch dort, wo die Temperatur eines unbeheizten Bereichs
     * über seine Lage vorgegeben war — und nannte ein Bauteil „Dach",
     * obwohl der Raum an einen unbeheizten Dachraum grenzt und mit dessen
     * Temperatur gerechnet ist. Beides sind Ausgabetexte; geprüft wird, dass
     * sie an den Daten hängen und nicht an einer Annahme. */
    const zLage = { id: "d", name: "Unbeheizter Dachraum", modus: "lage", huelle: [] };
    const zBil = { id: "k", name: "Unbeheizter Keller", modus: "bilanz",
      huelle: [{ name: "Kellerwand", A: 12, U: 1.2, grenzt_an: { typ: "aussen" } }] };
    if (zonenBilanziert({ zonen: [zLage] })) {
      fh.push("T40 eine über die Lage vorgegebene Temperatur ist keine Bilanz");
    }
    if (!zonenBilanziert({ zonen: [zLage, zBil] })) {
      fh.push("T40 ein Bereich mit eigenen Hüllbauteilen wird bilanziert");
    }
    if (zonenBilanziert({ zonen: [] })) {
      fh.push("T40 ohne unbeheizte Bereiche gibt es keine Bilanz");
    }
    /* Gleichlauf mit zonenBilanz(): laufen die beiden auseinander, sagt
       Abschnitt 4.1 etwas anderes als Abschnitt 6. */
    const e40 = { klima: { theta_e: -10, theta_e_m: 3 }, norm: { DELTA_U_WB: 0.1 },
      zonen: { d: -7.6, k: 4.7 }, raeume: [] };
    const zb40 = zonenBilanz({ zonen: [zLage, zBil] }, e40);
    if (zb40.some(function (x) { return x.vergleichbar; })
        !== zonenBilanziert({ zonen: [zLage, zBil] })) {
      fh.push("T40 zonenBilanziert() und zonenBilanz() dürfen nicht auseinanderlaufen");
    }
    const p40 = { zonen: [zLage, zBil] };
    if (mitBereich("Dach", "d", p40) !== "Dach gegen unbeheizten Dachraum") {
      fh.push("T40 ein Bauteil gegen den Dachraum darf nicht bloß „Dach" + '" heißen: '
        + mitBereich("Dach", "d", p40));
    }
    if (mitBereich("Kellerdecke", "k", p40) !== "Kellerdecke") {
      fh.push("T40 nennt der Name den Bereich schon, bleibt er unverändert: "
        + mitBereich("Kellerdecke", "k", p40));
    }
    if (mitBereich("Außenwand", "", p40) !== "Außenwand") {
      fh.push("T40 ein Bauteil gegen Außenluft bekommt keinen Zusatz");
    }
    /* Nur wenn ALLE Zeilen desselben Namens an denselben Bereich grenzen,
       darf die zusammengefasste Zeile der Bauteilbilanz das dazuschreiben. */
    const eG = { raeume: [{ bauteile: [
      { name: "Dach", kat: "huelle", grenzt_an: { typ: "zone", ref: "d" } },
      { name: "Wand", kat: "huelle", grenzt_an: { typ: "zone", ref: "d" } },
      { name: "Wand", kat: "huelle", grenzt_an: { typ: "aussen" } }] }] };
    const gb = bauteilGrenzbereich(eG);
    if (gb.Dach !== "d") fh.push("T40 ein eindeutiger Grenzbereich muss erkannt werden");
    if (gb.Wand) fh.push("T40 ein uneindeutiger Grenzbereich darf nicht dastehen");

    return { ok: fh.length === 0, fehler: fh, anzahl: 45 };
  }

  window.MODUL_BERICHT = {
    erzeugen: erzeugen, word: word, dokument: dokument, selbsttest: selbsttest,
    freigegeben: freigegeben,
    /* für Prüfzwecke und für das Kontrollblatt offengelegt */
    rechenhilfen: {
      wbZuschlagAnteil: wbZuschlagAnteil, zonenBilanz: zonenBilanz, fFaktor: fFaktor,
      konfidenz: konfidenz, bauteilZeilen: bauteilZeilen, offenePunkte: offenePunkte,
      annahmeAnteil: annahmeAnteil, ortsterminSatz: ortsterminSatz, deckZahl: deckZahl,
      unterlagen: unterlagen, sortiereNachWirkung: sortiereNachWirkung,
      wirkungGesamt: wirkungGesamt, wirkungsLuecken: wirkungsLuecken, jaNein: jaNein,
      pruefzeilen: pruefzeilen, kapitelPlan: kapitelPlan, wirkung: wirkung,
      wirkungText: wirkungText, geschossReihenfolge: geschossReihenfolge,
      bilanzGemischt: bilanzGemischt, nachbarschaften: nachbarschaften,
      /* uKlasse ist auch für Kapitel 7.2 gedacht: die Bauteilbilanz soll je
         Zeile dieselbe Klasse zeigen wie Kapitel 5, und zwar aus derselben
         Funktion, nicht aus einer zweiten Regelabschrift. */
      uKlasse: uKlasse, additionsprobe: additionsprobe,
      baustellenSuche: baustellenSuche, druckSuche: druckSuche, nurText: nurText,
      kenntnisnahmeDruck: kenntnisnahmeDruck,
      durchgesehenKasten: durchgesehenKasten, vermerkzeilen: vermerkzeilen,
      anlage2: anlage2, ampelSatz: ampelSatz, zeitpunkt: zeitpunkt,
      STUFENWORT: STUFENWORT,
      festeZonenTemperaturen: festeZonenTemperaturen,
      abschirmklassen: abschirmklassen,
      ZONEN_TOLERANZ_K: ZONEN_TOLERANZ_K,
    },
  };
})();
