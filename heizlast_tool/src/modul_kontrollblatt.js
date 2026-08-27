/* ===========================================================================
 * modul_kontrollblatt.js — die eine Seite, auf der geprüft wird
 * ===========================================================================
 * Zwischen Auswertung und Bericht steht genau ein Prüfschritt. Was hier
 * durchrutscht, steht später mit zwei Nachkommastellen im Bericht und sieht
 * dort belegt aus. Deshalb entscheidet dieses Blatt über die Verlässlichkeit
 * des ganzen Werkzeugs.
 *
 * Der Einwand, der den Aufbau bestimmt hat:
 *
 *     Ein Kontrollblatt zeigt Gefundenes, nie Fehlendes.
 *
 * Ein nicht erkannter Raum, ein übersehenes Fenster, eine nicht angelegte
 * unbeheizte Zone erzeugen keine Zeile. Sie fehlen still. Die Heizlast wird
 * dadurch zu KLEIN — und zu klein fällt niemandem auf: die spezifische
 * Heizlast in W/m² bleibt unauffällig, weil Zähler und Nenner gemeinsam
 * schrumpfen. Jede Prüfung, die in W/m² rechnet, schweigt dazu, auch der
 * Quervergleich gegen die Typologie in kern_pruefung.js
 * (SPEZIFIKATION_STAPEL.md, Abschnitt 9).
 *
 * Darum steht oben auf diesem Blatt nicht die Liste des Gefundenen, sondern
 * eine Reihe von ZÄHLERN. Jeder vergleicht, was im Werkzeug steht, mit einer
 * unabhängig gewonnenen Sollzahl. Fehlt die Sollzahl, ist das selbst ein
 * Befund und eine gelbe Zeile mit einer Eingabe daneben — nicht Schweigen.
 *
 * Sechs Zähler:
 *   Z1  Räume je Geschoss          gegen die im Plan beschrifteten Räume
 *   Z2  Summe der Raumflächen      gegen Gebäudekontur abzüglich Wandanteil
 *   Z3  Fenster je Fassade         gegen die Ansicht
 *   Z4  Geschosszahl               gegen Schnitt, Ansicht und Treppentest
 *   Z5  unbeheizte Bereiche        benannt gegen angelegt
 *   Z6  Räume ohne Hüllbauteil     ein Raum ohne Verlustfläche ist ein Fehler
 *
 * Keine Schwelle in diesem Modul ist geraten. Wo eine Grenze nötig ist, wird
 * sie aus dem Projekt selbst gebildet — die Flächenprüfung schlägt an, wenn in
 * die nicht belegte Restfläche ein weiterer Raum von der Größe des kleinsten
 * bereits erfassten Raumes passt. Damit braucht es keinen erfundenen
 * Innenwandanteil.
 *
 * DREI GRUPPEN, UND NUR ZWEI DAVON STEHEN IN DER LISTE
 *
 * Eine Frage, die das Werkzeug auf JEDEM Projekt stellt und NIE selbst
 * beantworten kann, ist keine Prüfung. Sie steht immer da, gleich wie gut das
 * Projekt bearbeitet ist, und erzieht damit dazu, die ganze Liste zu
 * überblättern. Gemessen an „BV 2-0887 Ziolkowski": zwölf offene Fragen, und
 * elf davon sagten im Kern dasselbe — „gegen nichts geprüft". Das ist kein
 * Befund über das Gebäude, sondern einer über die Unterlagenlage.
 *
 * Jede Zeile dieses Blattes gehört deshalb in genau eine von drei Gruppen,
 * und die Gruppe steht als `art` an der Zeile:
 *
 *   befund    Etwas stimmt nachweislich nicht: zwei Zahlen widersprechen
 *             sich, oder ein Zustand ist geometrisch unmöglich. Bleibt in
 *             der Liste, immer, und hält den Bericht auf.
 *   pruefung  Es gibt eine Gegenprobe. Sie kann bestehen oder anschlagen.
 *             Besteht sie, sagt sie das in einem Satz und hält niemanden
 *             auf; schlägt sie an, ist die Zeile ein Befund.
 *   grenze    Es gibt keine Gegenprobe und aus diesen Unterlagen wird auch
 *             keine. Solche Zeilen stehen NICHT in der Liste zum Abarbeiten,
 *             sondern im Bericht unter „Was diese Berechnung nicht belegt".
 *             Dort gehören sie hin: der Leser des Berichts muss wissen,
 *             wogegen nicht geprüft wurde, der Bearbeiter kann daran nichts
 *             abhaken.
 *
 * zaehler() liefert befund und pruefung, grenzen() liefert die dritte Gruppe.
 * Keine Zeile fällt dabei weg: was aus der Liste geht, steht im Bericht.
 *
 * ERST ANTWORTEN, DANN FRAGEN
 * Eine offene Frage ist teuer: sie hält den Bericht auf und kostet den
 * Bearbeiter einen Gang zum Plan. Sie darf deshalb nur stehen bleiben, wenn
 * eine falsche Antwort die Heizlast wirklich verfälscht UND das Werkzeug sie
 * wirklich nicht beantworten kann. Alles andere wird beantwortet oder als
 * gekennzeichnete Annahme gesetzt. Was das hier heißt:
 *
 *   beantwortet   Die Planauslese hat das Blatt gelesen; ihre Rohantwort liegt
 *                 noch auf der Seite. Räume je Geschoss und Fenster je Raum
 *                 kommen daher, ohne dass jemand nachzählt. Weil dieselbe
 *                 Lesung auch das Raumbuch erzeugt hat, ist das KEINE
 *                 unabhängige Probe: sie findet einen verlorenen Raum, nicht
 *                 einen übersehenen. Solche Zeilen werden deshalb Hinweis und
 *                 nicht „gut", und der Text sagt den Unterschied.
 *   angenommen    Ein kleinerer Keller, ein kleineres Dachgeschoss, ein Flur
 *                 ohne Fenster. Der Regelfall wird gesetzt und als ANNAHME
 *                 benannt, statt danach zu fragen.
 *   erschlossen   Die Folge KG, EG, OG, DG trägt eine Reihenfolge in sich.
 *                 Eine Lücke darin ist ein echter Befund und braucht keinen
 *                 Schnitt (KERN_ZUORDNUNG.geschossfolge).
 *   bleibt offen  Nur, wo gar nichts vorliegt: kein ausgelesener Plan, keine
 *                 Kontur, keine deutbare Geschossfolge.
 *
 * Die Himmelsrichtung eines Fensters gehört ausdrücklich NICHT zu den
 * erheblichen Angaben. Nachgeprüft am Normtext, nicht übernommen:
 * DIN EN 12831-1:2017-09 rechnet den Auslegungsfall ohne Wärmegewinne — der
 * nationale Anhang stellt ausdrücklich fest, dass Gewinne aus Personen,
 * Maschinen und Sonneneinstrahlung nicht angesetzt werden dürfen. Damit gibt
 * es in der ganzen Rechnung keinen nach Himmelsrichtung unterschiedenen Wert.
 * Von der Lage geht allein die ZAHL der exponierten Fassaden ein, über den
 * Abschirmkoeffizienten e (kern_heizlast_norm.js, eFaktor; DIN/TS 12831-1:
 * 2020-04). Eine Zahl, keine Richtung. Die fehlende Richtung kostet deshalb
 * nur eines: den Abgleich Fassade für Fassade gegen eine Ansicht. Liegt keine
 * Ansicht vor, kostet sie gar nichts, und dann entsteht auch keine Zeile.
 *
 * Herkunft und Konfidenz: jeder Wert trägt eine von sechs Herkünften
 * (SPEZIFIKATION_KI.md, Regel G6) und daraus die Konfidenzklasse A, B oder C
 * nach SPEZIFIKATION_BERICHT.md, Abschnitt 10.3. Eine Überschreibung durch den
 * Bearbeiter gilt nur mit genannter Quelle als belegt; ohne Quelle bleibt sie
 * Annahme, also Klasse C.
 *
 * Aufbau wie src/modul_plan.js: eine Datei, ein IIFE, kein Fremdcode,
 * DOM-freier Rechenteil mit selbsttest().
 * =========================================================================== */
"use strict";

(function () {

  /* ---------------------------------------------------------------------
   * Kleine Helfer
   * ------------------------------------------------------------------ */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* Zahl mit Hauptwort in der richtigen Zahlform. „1 Räume", „1 Seiten":
     ein Zähler, der nicht zählen kann, macht misstrauisch gegen jede
     andere Zahl auf dem Blatt. mz(1, "Raum", "Räume") -> "1 Raum". */
  const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);

/* ORTSZEIT, NICHT WELTZEIT. toISOString() liefert UTC: eine Ablehnung um
     15:29 MESZ wurde als "2026-08-26 13:29" vermerkt und wanderte so in den
     Bericht, der auf derselben Seite lokal datiert ist (Prueflaeufe vom
     26.08.2026, alle fuenf Plaene). Die Form bleibt sortierbar
     (JJJJ-MM-TT hh:mm) — sie wird an anderer Stelle wieder ausgelesen —,
     nur die Uhr ist jetzt die des Bearbeiters. */
  function ortszeitStempel() {
    const d = new Date();
    const z = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-"
      + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
  }

  const de = (x, n) => (Number.isFinite(x)
    ? Number(x).toLocaleString("de-DE", { minimumFractionDigits: n === undefined ? 0 : n,
                                          maximumFractionDigits: n === undefined ? 0 : n })
    : "–");

  const zahl = (x, ers) => {
    const v = typeof x === "string" ? parseFloat(x.replace(/\./g, "").replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (ers === undefined ? null : ers);
  };

  /* Reihenfolge der Zeilen: rot zuerst, dann gelb, dann die offenen Fragen,
     dann Vermerke, zuletzt das Bestandene. Grund siehe SPEZIFIKATION_STAPEL
     10.2: die frühen Antworten machen spätere Fragen oft überflüssig. */
  const RANG = { fehler: 0, warnung: 1, offen: 2, hinweis: 3, bestaetigt: 4, gut: 5 };
  const SYMBOL = { fehler: "!", warnung: "!", offen: "?", hinweis: "i",
                   bestaetigt: "\u2713", gut: "OK" };
  const CSS = { fehler: "fehler", warnung: "warnung", offen: "warnung",
                hinweis: "hinweis", bestaetigt: "gut", gut: "gut" };

  /** Der Prüfkern. Er hält die Bestätigungen des Bearbeiters und rechnet die
   *  Ampel im Kopf. Beides darf es nur einmal geben, sonst sagt das Blatt
   *  etwas anderes als der Kopf — genau der Fehler, der behoben wurde. */
  let KERN = null;
  function kern() {
    if (KERN) return KERN;
    if (typeof window !== "undefined" && window.KERN_PRUEFUNG) KERN = window.KERN_PRUEFUNG;
    else if (typeof require === "function") {
      try { KERN = require("./kerne/kern_pruefung.js"); } catch (x) { KERN = null; }
    }
    return KERN;
  }

  /** Der Gegenprobe-Kern. Er hält die beiden Lesungen eines Blattes
   *  gegeneinander und zieht die Ebenen und die unbeheizten Bereiche aller
   *  Blätter zusammen. Fehlt er, bleibt jede Frage stehen wie vorher: eine
   *  fehlende Gegenprobe darf niemals als bestandene Prüfung durchgehen. */
  let GEG = null;
  function gegenprobeKern() {
    if (GEG) return GEG;
    if (typeof window !== "undefined" && window.KERN_GEGENPROBE) GEG = window.KERN_GEGENPROBE;
    else if (typeof require === "function") {
      try { GEG = require("./kerne/kern_gegenprobe.js"); } catch (x) { GEG = null; }
    }
    return GEG;
  }

  /** Was die zweite Lesung je GESCHOSS gezählt hat, über alle Blätter.
   *
   *  Der Schlüssel ist das gedeutete Geschosskürzel, nicht der Wortlaut:
   *  „GRUNDRISS ERDGESCHOSS" auf dem Blatt und „EG" im Raumbuch sind dasselbe
   *  Geschoss. Was sich nicht deuten lässt, fällt heraus — eine Zahl dem
   *  falschen Geschoss zuzuordnen wäre schlimmer als keine Zahl.
   *
   *  Kommt dieselbe Ebene auf mehreren Blättern vor, gilt die GRÖSSERE Zahl.
   *  Bei der Vollständigkeit ist der Fehler einseitig: eine Zählung, die
   *  einen Raum mehr sieht, hat fast immer recht. */
  function gegenprobeRaeume(p) {
    const Z = zuordnung();
    const je = {};
    ((p.plan && p.plan.seiten) || []).forEach(function (s, i) {
      if (s.verwenden === false) return;
      (s.gegenprobeEbenen || []).forEach(function (e) {
        const d = Z && Z.geschossAusText ? Z.geschossAusText(e.ebene) : null;
        if (!d || !d.kuerzel || !(e.n > 0)) return;
        const alt = je[d.kuerzel];
        if (alt && alt.n >= e.n) return;
        je[d.kuerzel] = { n: e.n, namen: e.namen || [], fenster: e.fenster,
                          blatt: s.bezeichnung || s.name || ("Blatt " + (i + 1)),
                          wortlaut: e.ebene };
      });
    });
    return je;
  }

  /** Alle Blätter, die eine zweite Lesung tragen, in der Form, die der
   *  Gegenprobe-Kern erwartet. */
  function blaetterMitGegenprobe(p) {
    return ((p.plan && p.plan.seiten) || []).filter(function (s) {
      return s.gegenprobe && s.verwenden !== false;
    }).map(function (s, i) {
      return { name: s.bezeichnung || s.name || ("Blatt " + (i + 1)),
               gegenprobe: s.gegenprobe };
    });
  }

  /** Die Zuordnung. Sie deutet Raumarten und Geschossbezeichnungen und
   *  beantwortet damit zwei Fragen, die dieses Blatt sonst weiterreichen
   *  müsste: ob ein Raum ohne Fenster der Regelfall ist und ob die Folge der
   *  Geschosse eine Lücke hat. Fehlt das Modul, wird nicht geraten — dann
   *  bleibt die Frage stehen wie bisher. */
  let ZUO = null;
  /* KERN_HUELLENDECKUNG auf demselben Weg wie KERN_ZUORDNUNG: im Browser
     über window, in Node über require. Fehlt es, unterbleiben die beiden
     Zeilen, die daraus entstehen — sie tun dann nichts, statt zu raten. */
  let HDM = null;
  function huellendeckung() {
    if (HDM) return HDM;
    if (typeof window !== "undefined" && window.KERN_HUELLENDECKUNG) {
      HDM = window.KERN_HUELLENDECKUNG;
    } else if (typeof require === "function") {
      try { HDM = require("./kerne/kern_huellendeckung.js"); } catch (x) { HDM = null; }
    }
    return HDM;
  }

  function zuordnung() {
    if (ZUO) return ZUO;
    if (typeof window !== "undefined" && window.KERN_ZUORDNUNG) ZUO = window.KERN_ZUORDNUNG;
    else if (typeof require === "function") {
      try { ZUO = require("./kerne/kern_zuordnung.js"); } catch (x) { ZUO = null; }
    }
    return ZUO;
  }

  /* Meldungen und Rueckfragen ueber modul_dialog.js. alert()/confirm()/
     prompt() halten den ganzen Tab an; auf diesem Blatt ist das besonders
     schaedlich, weil hinter jeder Bestaetigung ein Neurechnen und ein
     Neuzeichnen steht, das der Bearbeiter sehen soll. */
  function melde(text, opt) {
    const D = (typeof window !== "undefined") && window.MODUL_DIALOG;
    if (D) return D.sagen(text, opt);
    return { weg() {} };
  }
  function frage(opt) {
    const D = (typeof window !== "undefined") && window.MODUL_DIALOG;
    return D ? D.fragen(opt) : Promise.resolve(false);
  }
  function eingebe(opt) {
    const D = (typeof window !== "undefined") && window.MODUL_DIALOG;
    return D ? D.eingabe(opt) : Promise.resolve(null);
  }
  function neuzeichnen() {
    if (typeof window !== "undefined" && typeof window.render === "function") {
      window.render();
    }
  }

  /** Wer bestätigt, steht in den Objektangaben als Unterzeichner. */
  function bearbeiter(p) {
    return String((p && p.meta && p.meta.bearbeiter) || "").trim();
  }

  function vermerkText(b) {
    if (!b) return "";
    return "zur Kenntnis genommen" + (b.wer ? " von " + b.wer : "")
      + (b.zeit ? " am " + b.zeit : "");
  }

  /** STELLT DIESE ZEILE ZWEI BEZIFFERTE AUSSAGEN GEGENEINANDER?
   *
   *  Am 23.08.2026 an „BV 2-0887 Ziolkowski" gemessen: die Zeile
   *  „Beheizt oder unbeheizt: KELLERGESCHOSS" — Plan sagt unbeheizt,
   *  Raumbuch führt 39,19 m² mit voller Innentemperatur — ließ sich mit
   *  einem Häkchen wegnehmen, und die Ampel sprang von Gelb auf „belastbar
   *  unter genannten Annahmen". Weggenommen war damit nicht der
   *  Widerspruch, sondern seine Anzeige: die Fläche blieb im Nenner, die
   *  Kellerdecke blieb aus der Rechnung.
   *
   *  Ein Widerspruch zwischen zwei Zahlen ist kein Sachverhalt, den man
   *  „zur Kenntnis nimmt". Eine der beiden stimmt, und wer weitergeht, muss
   *  sagen welche. Solche Zeilen sind deshalb nie mit einem Klick und nie
   *  mit dem Sammelknopf abzuräumen — sie verlangen den geschriebenen
   *  Vermerk, der im Bericht steht.
   *
   *  Erkennungsmerkmal, mechanisch und ohne Liste von Kennungen: die Zeile
   *  nennt eine eigene Zahl (`ist`), eine zweite Zahl aus einer BENANNTEN
   *  Quelle (`soll` mit `quelle_soll`), und die beiden gehen auseinander.
   *  Eine Liste einzelner Kennungen wäre bei der nächsten neuen Zeile
   *  wieder unvollständig; diese Regel greift von selbst. */
  function widersprichtSich(o) {
    if (o.stufe === "gut" || o.stufe === "bestaetigt") return false;
    const i = Number(o.ist), s = Number(o.soll);
    if (o.ist === null || o.ist === undefined || o.soll === null
        || o.soll === undefined) return false;
    if (!Number.isFinite(i) || !Number.isFinite(s)) return false;
    if (Math.abs(i - s) < 1e-9) return false;
    return !!String(o.quelle_soll || "").trim();
  }

  /** Eine Zeile des Blattes.
   *
   *  `art` ist die Einordnung nach der Regel im Kopf dieser Datei:
   *  "befund" | "pruefung" | "grenze". Sie ist Pflicht — der Rückfall auf
   *  "befund" ist die sichere Seite, denn dabei kann keine Zeile still aus
   *  der Liste verschwinden. Nur "grenze" nimmt eine Zeile aus der Liste, und
   *  das darf nie aus Versehen passieren.
   *
   *  `abhilfe` steht nur an Grenzen: die eine Unterlage, die die Grenze
   *  aufheben würde. Sie erscheint im Bericht, nicht als Aufgabe im Blatt. */
  /* SATZZEICHEN GERADEZIEHEN. Die Zeilentexte entstehen aus Bausteinen:
     ein fester Satz und eine QUELLE, die klein geschrieben ist und
     gelegentlich ihren eigenen Punkt mitbringt. Herausgekommen ist beides,
     was ein Korrektor anstreicht — "Es fehlen 8 Räume. im Kontrollblatt
     gezählt …" und "… nahe der Straße an.. Im Kontrollblatt" (Prüfläufe
     Hasenberg und P2211, 26.08.2026). Gerichtet wird an EINER Stelle, statt
     an dreissig Bausteinen einzeln: doppelte Satzpunkte fallen weg, und
     was nach einem Punkt beginnt, beginnt gross. Angefasst wird nur die
     Zeichensetzung — kein Wort, keine Zahl. */
  function satzform(t) {
    if (typeof t !== "string" || !t) return t;
    return t
      /* ".." und ". ." zu einem Punkt; Punkt vor Komma/Semikolon weg. */
      .replace(/\.\s*\.(?!\.)/g, ".")
      .replace(/\.\s*([,;])/g, "$1")
      /* Kleinbuchstabe nach Satzende: gross. Abkuerzungen wie "z. B." und
         "ca." haben nach dem Punkt ein Leerzeichen und einen Kleinbuchstaben,
         darum wird nur nach einem Wort mit mindestens zwei Zeichen
         grossgeschrieben — "B. " und "ca. " bleiben unangetastet. */
      .replace(/([a-zäöüß]{2,}|[)\d”“"])\.\s+([a-zäöü])/g,
        function (_, vor, klein) {
          return vor + ". " + klein.toUpperCase();
        });
  }

  function zeile(o) {
    return {
      id: o.id, gruppe: o.gruppe || "zaehler", titel: o.titel,
      /* Zweitschlüssel für Bestätigungen, die noch unter einer früheren
         Kennung dieser Zeile gespeichert sind (zaehlerOffeneFragen). */
      alt_id: o.alt_id || null,
      art: o.art || "befund",
      ist: o.ist === undefined ? null : o.ist,
      soll: o.soll === undefined ? null : o.soll,
      einheit: o.einheit || "",
      quelle_soll: o.quelle_soll || null,
      stufe: o.stufe, text: satzform(o.text),
      abhilfe: satzform(o.abhilfe) || null,
      frage: o.frage || null,
      aktionen: o.aktionen || [],
      /* Die Regel „zwei benannte Zahlen, die sich widersprechen, sind nicht
         mit einem Klick zu erledigen" gilt weiter als VORGABE. Sie ist aber
         seit dem 24.08.2026 in beide Richtungen überschreibbar, und zwar nur
         ausdrücklich: `aufhebbar: false` verschärft (auch ohne Zahlenpaar),
         `aufhebbar: true` lockert. Gelockert wird genau dort, wo die Zeile
         selbst einen begründeten Weg mitbringt — ein Geschoss, dessen Fläche
         das Werkzeug aus dem Blatt ableiten kann, ist kein Fall für eine
         schriftliche Begründung, sondern für einen Knopf. */
      aufhebbar: o.aufhebbar === false ? false
        : (o.aufhebbar === true ? true : !widersprichtSich(o)),
      /* Was der Bearbeiter beim schriftlichen Bestätigen gefragt wird. Ohne
         eigenen Text steht dort die allgemeine Frage; eine Zeile, die zwei
         benannte Quellen gegeneinanderstellt, fragt besser nach der einen
         Sache, um die es geht — welche der beiden stimmt. */
      begruendung_frage: o.begruendung_frage || null,
      begruendung_knopf: o.begruendung_knopf || null,
    };
  }

  /* ---------------------------------------------------------------------
   * Herkunft und Konfidenzklasse
   * ------------------------------------------------------------------ */
  /* Die sechs zulässigen Herkünfte nach SPEZIFIKATION_KI.md G6. Schlüssel in
     ASCII, Anzeigetext mit Umlauten. */
  const HERKUENFTE = {
    plan_gerechnet: "aus der Geometrie gemessen",
    plan_gelesen: "aus dem Plan gelesen",
    plan_text: "aus dem Blatttext gelesen",
    typologie: "aus der Typologie vorbelegt",
    eingabe: "von Hand eingetragen",
    norm: "Normwert",
  };

  /** Konfidenzklasse eines Wertes nach SPEZIFIKATION_BERICHT.md 10.3.
   *  A  aus einer Originalunterlage entnommen oder maßstäblich abgegriffen
   *  B  normativer Tabellenwert oder daraus abgeleitet
   *  C  fachliche Annahme, vor der Ausführung zu bestätigen
   *
   *  Zwei Festlegungen, die in der Spezifikation zwischen den Zeilen stehen
   *  und hier ausgesprochen sind:
   *  - Eine Überschreibung durch den Bearbeiter ist nur MIT Quellentext
   *    belegt. Ohne Quelle bleibt sie Annahme (Abschnitt 10.3, Klasse A).
   *  - Eine gemessene Polygonfläche ist nur so gut wie der Maßstab. Ist der
   *    Maßstab nicht abgesichert (kern_massstabsprobe), bleibt sie Klasse C,
   *    weil ein gleichmäßiger Maßstabsfehler quadratisch in jede Fläche
   *    eingeht und von keiner Prüfung in W/m² gefunden wird. */
  function klasse(h, opt) {
    const o = opt || {};
    if (!h || !h.herkunft) return "C";
    if (h.herkunft === "norm") return "B";
    if (h.herkunft === "typologie") return "C";
    if (h.herkunft === "eingabe") {
      return h.quelle && String(h.quelle).trim().length >= 3 ? "A" : "C";
    }
    if (h.herkunft === "plan_gerechnet") {
      return o.massstab_guete === "abgesichert" ? "A" : "C";
    }
    /* plan_gelesen, plan_text */
    if (h.konfidenz === "sicher" && h.fundstelle
        && String(h.fundstelle).trim().length >= 3) return "A";
    return "C";
  }

  const KLASSENTEXT = {
    A: "aus einer Unterlage belegt",
    B: "Normwert oder daraus abgeleitet",
    C: "Annahme, vor der Ausführung zu bestätigen",
  };

  function herkunftLesen(p, pfad) {
    return (p && p.herkunft && p.herkunft[pfad]) || null;
  }

  /* ---------------------------------------------------------------------
   * Quellen im Projekt: Blätter, Geschosse, Kontur
   * ------------------------------------------------------------------ */
  function normArt(t) {
    const s = String(t || "").toLowerCase();
    if (/grundriss/.test(s)) return "grundriss";
    if (/schnitt/.test(s)) return "schnitt";
    if (/ansicht/.test(s)) return "ansicht";
    if (/lageplan/.test(s)) return "lageplan";
    return s || null;
  }

  /** Alle Blätter in einer Form, die die heutige Ablage (p.plan.bilder) und
   *  die künftige (p.stapel.blaetter nach SPEZIFIKATION_STAPEL 2.3) abdeckt.
   *  Fehlt eine Angabe, bleibt sie null und wird nie ersetzt. */
  function blaetter(p) {
    const raus = [];
    ((p.plan && p.plan.bilder) || []).forEach(function (b, i) {
      raus.push({
        id: b.id || ("bild_" + i),
        name: b.bezeichnung || ("Blatt " + (i + 1)),
        art: normArt(b.art || (b.sichtung && b.sichtung.klasse)),
        geschoss: b.geschoss || null,
        raeume_erkennbar: zahl(b.raeume_erkennbar, null),
        ebenen_erkennbar: zahl(b.ebenen_erkennbar, null),
        treppe: b.treppe || (b.sichtung && b.sichtung.treppe) || null,
        polygone: (b.raeume || []).length,
      });
    });
    /* Die zweite Lesung der Planauslese (KERN_GEGENPROBE).
     *
     * Sie ist der Grund, warum die Zähler dieses Blattes nicht mehr auf jedem
     * Projekt "gegen nichts geprüft" sagen müssen. Sie hat dasselbe Blatt
     * gelesen wie die Auslese, aber mit einer anderen Aufgabe — zählen statt
     * auswerten — und ohne deren Ergebnis zu kennen. Damit ist sie ein
     * unabhängiger Zähler im Sinne von Z1: sie kann die Vollständigkeit nicht
     * nur widerlegen, sondern auch belegen.
     *
     * DIE EINE EINSCHRÄNKUNG, und sie ist wichtig: die Zahl gilt für das
     * BLATT, nicht für ein Geschoss. Trägt ein Bogen zwei Grundrisse — EG und
     * OG nebeneinander —, dann zählt die Gegenprobe beide zusammen, während
     * das Blatt genau einem Geschoss zugeordnet ist. Die Zahl gegen dieses
     * eine Geschoss zu halten hieße, einen Fehler zu melden, den es nicht
     * gibt. Deshalb wird sie nur übernommen, wenn die Gegenprobe genau EINE
     * gezeichnete Ebene gesehen hat. */
    ((p.plan && p.plan.seiten) || []).forEach(function (s, i) {
      const gp = s.gegenprobe;
      if (!gp) return;
      const art = normArt(s.art || gp.blattart);
      raus.push({
        id: s.id || ("seite_" + i),
        name: s.bezeichnung || s.name || ("Blatt " + (i + 1)),
        art: art,
        geschoss: s.geschoss || null,
        /* Die Raumzahl kommt NICHT von hier. Sie gehört einer EBENE und nicht
           einem Blatt; ein A3-Bogen trägt drei Grundrisse mit drei Zahlen.
           Z1 holt sie über gegenprobeRaeume(). */
        raeume_erkennbar: null,
        ebenen_erkennbar: (gp.ebenen || []).length || null,
        treppe: null,
        polygone: 0,
        zweite_lesung: true,
      });
    });
    ((p.stapel && p.stapel.blaetter) || []).forEach(function (b) {
      const s = b.sichtung || {};
      const z = s.zeichnungen || [];
      const gr = z.filter((x) => x.art === "grundriss");
      const sa = z.filter((x) => x.art === "schnitt" || x.art === "ansicht");
      raus.push({
        id: b.id,
        name: (s.blatt && s.blatt.titel_text) || b.id,
        art: normArt(s.klasse),
        geschoss: (gr[0] && gr[0].geschoss_text) || null,
        raeume_erkennbar: gr.length
          ? gr.reduce((m, x) => Math.max(m, zahl(x.raeume_erkennbar, 0)), 0) : null,
        ebenen_erkennbar: sa.length
          ? sa.reduce((m, x) => Math.max(m, zahl(x.ebenen_erkennbar, 0)), 0) : null,
        treppe: s.treppe || null,
        polygone: 0,
      });
    });
    return raus;
  }

  /** Was die Planauslese je Geschoss an Räumen gelesen hat, Blatt für Blatt.
   *
   *  app.js hebt die Rohantwort der Auslese auf dem Blatt auf (seite.auslese)
   *  und setzt danach seite.uebernommen. Damit liegen ZWEI Zahlen vor: was
   *  gelesen wurde und was im Raumbuch steht. Gehen sie auseinander, ist auf
   *  dem Weg ins Raumbuch ein Raum verloren gegangen — durch eine Auswahl,
   *  ein Löschen oder einen Fehlgriff. Das ist genau der Fehler, der sonst
   *  nirgends auffällt.
   *
   *  Das ist ausdrücklich KEINE unabhängige Zählung: übersieht die Auslese
   *  einen Raum, fehlt er auf beiden Seiten. Deshalb trägt das Ergebnis
   *  unabhaengig: false, und der Zähler sagt das auch. */
  function ausleseRaeume(p) {
    const je = {};
    ((p.plan && p.plan.seiten) || []).forEach(function (s, i) {
      const a = s.auslese;
      if (!a || !(a.raeume || []).length) return;
      const blatt = s.bezeichnung || s.name || ("Blatt " + (i + 1));
      a.raeume.forEach(function (r) {
        const g = String(r.geschoss || s.geschoss || "").trim() || "ohne Geschoss";
        if (!je[g]) je[g] = { n: 0, blaetter: [] };
        je[g].n++;
        if (je[g].blaetter.indexOf(blatt) < 0) je[g].blaetter.push(blatt);
      });
    });
    return je;
  }

  /** Geschosse aus dem Raumbuch, in der Reihenfolge ihres Auftretens. */
  function geschosse(p) {
    const map = {};
    const folge = [];
    (p.raeume || []).forEach(function (r) {
      const g = String(r.geschoss || "").trim() || "ohne Geschoss";
      if (!map[g]) { map[g] = { name: g, raeume: [], A: 0 }; folge.push(map[g]); }
      map[g].raeume.push(r);
      map[g].A += zahl(r.A, 0);
    });
    return folge;
  }

  /** Wanddicke der Außenwand in Metern.
   *
   *  Drei belegte Quellen, danach eine benannte Spanne. Die dritte ist die
   *  wichtigste und lag bisher ungenutzt im Projekt: wer den U-Wert der
   *  Außenwand über den Schichtaufbau nach DIN EN ISO 6946 eingegeben hat, hat
   *  damit auch die Dicke eingegeben — die Summe der Schichtdicken IST die
   *  Wanddicke. Sie musste nie erfragt werden.
   *
   *  Ist keine Quelle da, wird nicht geraten und auch nicht auf die Kontur als
   *  reine Obergrenze zurückgefallen. Stattdessen wird die Wanddicke als
   *  SPANNE angesetzt und die Flächenprobe mit beiden Enden gerechnet. Das ist
   *  ehrlicher als ein einzelner Schätzwert: das Ergebnis ist dann selbst eine
   *  Spanne, und die Prüfung schlägt nur an, wenn sie AUF IHRER GANZEN BREITE
   *  nicht mehr zu erklären ist.
   *
   *  Die Enden der Spanne, gekennzeichnet als Erfahrungswerte, gebildet aus den
   *  Baurichtmaßen nach DIN 4172 (Oktametersystem, 11,5 / 17,5 / 24 / 30 /
   *  36,5 cm):
   *    unten 0,24 m — die ungedämmte 24er-Wand des Altbestandes; dünner ist
   *                   keine Außenwand eines beheizten Gebäudes.
   *    oben  0,50 m — 36,5 cm Mauerwerk mit 14 cm Dämmung, oder 24er Wand mit
   *                   Kerndämmung und Vormauerschale.
   *  Beide Enden sind überschreibbar: der Zähler „wanddicke" im Kontrollblatt
   *  setzt einen festen Wert und die Spanne fällt weg. */
  const WANDDICKE_UNTEN = 0.24;
  const WANDDICKE_OBEN = 0.50;

  function wanddicke(p) {
    const fest = function (d, q) {
      return { d: d, unten: d, oben: d, quelle: q, annahme: false };
    };
    const eig = zahl(kbZaehler(p, "wanddicke"), null);
    if (eig > 0) return fest(eig, "im Kontrollblatt eingetragen");
    const gem = zahl(p.plan && p.plan.gemessen && p.plan.gemessen.wanddicke_m, null);
    if (gem > 0) return fest(gem, "im Plan gemessen");

    /* Aus dem Schichtaufbau der Außenwand. Genommen wird der Bauteiltyp, der
       nach Namen eine Außenwand ist UND Schichten trägt; ohne Schichten steht
       dort nur ein U-Wert und keine Dicke. Mehrere Außenwandtypen (etwa Giebel
       und Regelwand): die dickste zählt, sie umschreibt die Kontur. */
    let ausSchichten = null, wovon = "";
    (p.bauteiltypen || []).forEach(function (t) {
      if (!/au(ß|ss)enwand|aussenwand/i.test(String(t.name || ""))) return;
      const s = t.schichten || [];
      if (!s.length) return;
      let d = 0;
      s.forEach(function (x) { d += zahl(x.d, 0); });
      if (d > 0.05 && d < 2 && (ausSchichten === null || d > ausSchichten)) {
        ausSchichten = d; wovon = t.name;
      }
    });
    if (ausSchichten !== null) {
      return fest(ausSchichten, "Summe der Schichtdicken von „" + wovon + "“");
    }
    return { d: null, unten: WANDDICKE_UNTEN, oben: WANDDICKE_OBEN,
             quelle: null, annahme: true };
  }

  /* --- Wie viel Restfläche ist erklärt, ohne dass ein Raum fehlt? ---------
   *
   * Die Summe der Raumflächen ist IMMER kleiner als die Fläche innerhalb der
   * Außenwände. Was dazwischen liegt, sind die Innenwände und die Flächen, die
   * kein Raum sind: der Treppenlauf, Schächte, der Schornstein. Eine Differenz
   * ist also der Normalfall und für sich genommen kein Befund.
   *
   * Die Vorgängerfassung verglich die Restfläche mit dem KLEINSTEN erfassten
   * Raum („hätte da noch ein Raum Platz?"). Das ist nicht eine zu enge
   * Schwelle, sondern die falsche Frage, und sie wird hier nicht entschärft,
   * sondern ersetzt: die Restfläche BESTEHT aus Wand- und Verkehrsfläche, ein
   * Vergleich mit einer Raumfläche fragt danach, ob ein Raum in die Wände
   * passt. Gemessen an „BV 2-0887 Ziolkowski": Erdgeschoss 100,00 m² Kontur,
   * 74,72 m² Raumfläche, kleinster Raum das WC mit 2,17 m². Die Restfläche
   * liegt zwangsläufig darüber, und die Zeile stand auf jedem normal gebauten
   * Haus da. Eine Prüfung, die immer anschlägt, prüft nichts.
   *
   * Hergeleitet wird die zulässige Restfläche stattdessen aus dem, woraus sie
   * besteht. Beide Summanden als Spanne, weil beide nur eingegrenzt und nicht
   * gemessen sind:
   *
   * 1 INNENWÄNDE.  n Räume in einem Geschoss brauchen mindestens n-1 Trennungen.
   *   Jede Trennung ist höchstens so lang wie die längere Gebäudeseite. Damit
   *   ist die Innenwandlänge nach oben durch (n-1) · max(B,T) begrenzt — das
   *   ist Geometrie, keine Annahme. Nach unten wird derselbe Schnitt mit der
   *   kürzeren Seite angesetzt. Die Dicke kommt aus den Baurichtmaßen nach
   *   DIN 4172: 0,115 m ist die nichttragende Trennwand, 0,24 m die tragende
   *   Innenwand. Beide Enden sind Erfahrungswerte für die WAHL der Grenzen,
   *   die Maße selbst sind genormt.
   *
   * 2 TREPPENLAUF.  Hat das Gebäude mehr als ein Geschoss, geht durch jedes
   *   eine Treppe, und ihr Lauf ist auf dem Grundriss keine Raumfläche. Maße
   *   nach DIN 18065 für die notwendige Treppe in Gebäuden mit bis zu zwei
   *   Wohnungen: nutzbare Laufbreite mindestens 0,80 m, Steigung 0,14 bis
   *   0,20 m, Auftritt 0,23 bis 0,37 m. Aus der Geschosshöhe h folgt die Zahl
   *   der Steigungen h/s und daraus die Lauflänge (h/s - 1) · a. Die obere
   *   Laufbreite ist mit 1,10 m angesetzt (Erfahrungswert für das freistehende
   *   Wohnhaus). Ist keine Raumhöhe bekannt, wird h von 2,50 bis 3,20 m
   *   angesetzt — die Spanne, in der Wohngeschosse liegen (Erfahrungswert).
   *
   * Ein einläufiges Podest, ein Installationsschacht oder ein Kamin fallen
   * zusätzlich an und sind hier NICHT enthalten. Die Spanne ist damit eher zu
   * eng als zu weit; das ist die vorsichtige Richtung, weil ein zu enger Rahmen
   * höchstens zu einer Nachfrage führt und nie dazu, dass ein fehlender Raum
   * durchrutscht. */
  const INNENWAND_DUENN = 0.115;      // nichttragende Trennwand, DIN 4172
  const INNENWAND_DICK = 0.24;        // tragende Innenwand, DIN 4172
  const STEIGUNG_KLEIN = 0.14;        // DIN 18065, Grenzen der Steigung
  const STEIGUNG_GROSS = 0.20;
  const AUFTRITT_KLEIN = 0.23;        // DIN 18065, Grenzen des Auftritts
  const AUFTRITT_GROSS = 0.37;
  const LAUFBREITE_KLEIN = 0.80;      // DIN 18065, notwendige Treppe, Mindestmaß
  const LAUFBREITE_GROSS = 1.10;      // Erfahrungswert, freistehendes Wohnhaus
  const GESCHOSSHOEHE_KLEIN = 2.50;   // Erfahrungswert, Wohngeschoss
  const GESCHOSSHOEHE_GROSS = 3.20;

  /* Seitenverhältnis, bis zu dem ein Raum als Raum gilt. Aus ihm folgt der
     Umfang aus der Fläche: ein Rechteck der Fläche A mit dem Verhältnis r hat
     den Umfang 2·Wurzel(A)·(Wurzel(r) + 1/Wurzel(r)). Bei 1:5 sind das
     5,37·Wurzel(A). Erfahrungswert, gekennzeichnet: schmaler als 1:5 ist ein
     Flur, kein Zimmer, und selbst ein Flur wird selten schmaler. */
  const RAUM_VERHAELTNIS = 5;

  /** Geschosshöhe als Spanne, aus der lichten Raumhöhe des Geschosses.
   *  Deckenaufbau 0,25 bis 0,40 m: Stahlbetondecke 0,18 bis 0,25 m plus
   *  Estrich und Aufbau. ERFAHRUNGSWERT, gekennzeichnet. Ohne Raumhöhe bleibt
   *  die allgemeine Spanne des Wohngeschosses stehen. */
  const DECKENAUFBAU_KLEIN = 0.25;
  const DECKENAUFBAU_GROSS = 0.40;

  function geschosshoehe(g) {
    let h = 0;
    ((g && g.raeume) || []).forEach(function (r) {
      const x = zahl(r.h, 0);
      if (x > 1.5 && x < 8 && x > h) h = x;
    });
    if (!(h > 0)) return { unten: 0, oben: 0 };
    return { unten: h + DECKENAUFBAU_KLEIN, oben: h + DECKENAUFBAU_GROSS };
  }

  /** Zulässige Restfläche eines Geschosses als Spanne, mit Herleitungstext. */
  function restrahmen(o) {
    const n = Math.max(1, zahl(o.raeume, 1));
    const kurz = zahl(o.kurz_m, 0), lang = zahl(o.lang_m, 0);
    const teile = [];
    let unten = 0, oben = 0;

    if (kurz > 0 && lang > 0 && n > 1) {
      /* Zwei Obergrenzen für die Innenwandlänge, die schärfere gilt.
         (a) n Räume brauchen mindestens n-1 Trennungen, jede höchstens so
             lang wie die längere Gebäudeseite.
         (b) Aus den Raumflächen: die Summe aller Raumumfänge abzüglich des
             Außenumfangs ist das Doppelte der Innenwandlänge, weil jede
             Innenwand zu zwei Räumen gehört. Den Umfang je Raum liefert seine
             Fläche über das angesetzte Seitenverhältnis. Diese Grenze ist auf
             einem normalen Wohngeschoss die deutlich schärfere; ohne sie wäre
             der Rahmen so weit, dass ein ganzes Zimmer darin verschwände. */
      const wurzelsumme = (o.flaechen || []).reduce(function (s, A) {
        return s + Math.sqrt(Math.max(0, zahl(A, 0)));
      }, 0);
      const faktor = 2 * (Math.sqrt(RAUM_VERHAELTNIS) + 1 / Math.sqrt(RAUM_VERHAELTNIS));
      const ausUmfang = wurzelsumme > 0 && zahl(o.umfang_m, 0) > 0
        ? Math.max(0, (faktor * wurzelsumme - zahl(o.umfang_m)) / 2) : Infinity;
      const ausSchnitten = (n - 1) * lang;
      const L = Math.min(ausSchnitten, ausUmfang);
      const u = (n - 1) * kurz * INNENWAND_DUENN;
      const ob = L * INNENWAND_DICK;
      unten += u; oben += Math.max(u, ob);
      teile.push("Innenwände " + de(u, 1) + " bis " + de(Math.max(u, ob), 1) + " m² ("
        + mz(n - 1, "Trennung", "Trennungen") + ", höchstens " + de(L, 1)
        + " m Wandlänge, 0,115 bis 0,24 m dick nach DIN 4172)");
    }
    if (o.treppe) {
      const hU = zahl(o.hoehe_unten, 0) > 0 ? zahl(o.hoehe_unten) : GESCHOSSHOEHE_KLEIN;
      const hO = zahl(o.hoehe_oben, 0) > 0 ? zahl(o.hoehe_oben) : GESCHOSSHOEHE_GROSS;
      const lU = Math.max(1, hU / STEIGUNG_GROSS - 1) * AUFTRITT_KLEIN;
      /* Der Lauf kann nicht länger sein als das Gebäude tief ist. */
      const lO = Math.min(lang > 0 ? lang : Infinity,
                          Math.max(1, hO / STEIGUNG_KLEIN - 1) * AUFTRITT_GROSS);
      const u = lU * LAUFBREITE_KLEIN;
      const ob = lO * LAUFBREITE_GROSS;
      unten += u; oben += ob;
      teile.push("Treppenlauf " + de(u, 1) + " bis " + de(ob, 1) + " m² (DIN 18065: "
        + "Laufbreite ab 0,80 m, Steigung 0,14 bis 0,20 m, Auftritt 0,23 bis 0,37 m; "
        + "Geschosshöhe " + de(hU, 2) + " bis " + de(hO, 2) + " m)");
    }
    return { unten: unten, oben: oben, wie: teile.join(", "), teile: teile.length };
  }

  /** Gebäudekontur eines Geschosses: Fläche und Umfang der Außenkante. */
  function kontur(p, g) {
    const eig = zahl(kbZaehler(p, "kontur_" + g), null);
    if (eig > 0) return { A: eig, U: null, quelle: "im Kontrollblatt eingetragen" };
    const st = ((p.stapel && p.stapel.geschosse) || [])
      .find((x) => String(x.name || "").trim() === String(g).trim());
    if (st && st.kontur && zahl(st.kontur.flaeche_m2, 0) > 0) {
      return { A: zahl(st.kontur.flaeche_m2), U: zahl(st.kontur.umfang_m, null),
               quelle: "Umriss aus " + (st.kontur.quelle || "der Auswertung") };
    }
    /* Die Außenbemaßung, die die zweite Lesung von genau diesem Geschoss
       abgelesen hat. Sie steht auf fast jedem Bauplan als äußerste Maßkette
       und war der billigste Weg zu einer Kontur, nach dem nur nie jemand
       gefragt hat. Solange sie fehlte, stand hier auf jedem Projekt "eine
       Gebäudekontur zum Gegenrechnen liegt nicht vor".

       Sie ist das umschreibende RECHTECK und damit eine Obergrenze; bei einem
       L-förmigen Grundriss liegt sie über der wirklichen Grundfläche. Das
       Merkmal rechteckig sagt das weiter, und die Prüfung unten zieht daraus
       die richtige Folgerung: die harte Richtung (Raumsumme größer als die
       Kontur) bleibt ein Fehler, die weiche wird ein Hinweis. */
    const gp = [];
    ((p.plan && p.plan.seiten) || []).forEach(function (x) {
      const blatt = x.bezeichnung || x.name || "einem Blatt";
      /* Ein Blatt, ein Geschoss: die Kontur hängt an der Seite. */
      if (x.gegenprobeKontur
          && String(x.geschoss || "").trim() === String(g).trim()) {
        gp.push({ k: x.gegenprobeKontur, blatt: blatt });
      }
      /* Ein Bogen mit mehreren Grundrissen: je gezeichneter Ebene eine Kontur
         (KERN_GEGENPROBE.konturenAusBlatt). Zugeordnet wird über den Namen der
         Ebene, wie er auf dem Blatt steht — „GRUNDRISS ERDGESCHOSS" gehört zu
         „EG". Das kann nur die Zuordnung, nicht ein Zeichenvergleich. */
      (x.gegenprobeKonturen || []).forEach(function (k) {
        if (!k || !(zahl(k.A, 0) > 0)) return;
        if (!gleichesGeschoss(k.ebene, g)) return;
        gp.push({ k: k, blatt: blatt });
      });
    });
    if (gp.length) {
      /* Mehrere Blätter desselben Geschosses: das KLEINSTE Rechteck gilt.
         Eine Obergrenze wird durch die schärfste der vorliegenden gebildet;
         die größere wäre nur großzügiger und würde einen echten Widerspruch
         verdecken. */
      const beste = gp.reduce(function (m2, x) {
        return (m2 && m2.k.A <= x.k.A) ? m2 : x;
      }, null);
      const k = beste.k;
      const t = textstandKontur(p, g);
      return { A: k.A, U: k.U, breite_m: k.breite_m, tiefe_m: k.tiefe_m,
               rechteckig: true, obergrenze: true,
               textstand: t, wortlaut: k.wortlaut || "",
               quelle: k.quelle + ", zweite Lesung von " + beste.blatt };
    }
    /* Der billigste Weg zuletzt in der Rangfolge, aber zuerst im Ablauf: die
       äußerste Maßkette aus dem TEXTSTAND des PDF (MODUL_PDF, Teil D2). Sie
       kostet keinen Modellaufruf und liegt beim Öffnen der Datei schon da.
       Sie steht hinter der zweiten Lesung, weil sie nur bei Vektorplänen
       anfällt und die zweite Lesung dasselbe Blatt zusätzlich gesehen hat. */
    const ts = textstandKontur(p, g);
    if (ts) {
      /* EINE SAUBERE ÄUSSERSTE MASSKETTE IST DIE UMFANGSQUELLE.
         Bis zum 25.08.2026 galt jede unbelegte Kette pauschal als „nur eine
         Kette — als Obergrenze zu lesen". Die Vorsicht stammt aus dem Fall
         „Bauantrag_EG_24.07.2024": längste Kette 30,00 m allein, eine
         kürzere 26,00 m doppelt bemaßt — dort weiß das Werkzeug wirklich
         nicht, welche gilt. GEMESSEN am Blatt „Hasenberg_10_Grundrisse"
         (echter Lauf) stand aber dieselbe Vorsicht vor einer Kette, der
         nichts widerspricht: 18,95 m mal 16,62 m auf beiden Seiten — und das
         Werkzeug fragte den Bearbeiter nach genau den vier Zahlen, die es
         selbst im Fragetext nannte. Die Unterscheidung liefert MODUL_PDF
         längst (konkurrenz): nur die MEHRKETTIG-STRITTIGE Lesung bleibt eine
         bloße Obergrenze, die einkettig-eindeutige ist der Umfang. Für die
         FLÄCHE bleibt obergrenze bestehen — das umschreibende Rechteck eines
         Rücksprungs ist immer zu groß, egal wie eindeutig die Kette ist. */
      return { A: ts.A, U: ts.U, breite_m: ts.breite_m, tiefe_m: ts.tiefe_m,
               rechteckig: true, obergrenze: true, textstand: ts,
               strittig: !ts.belegt && !!ts.konkurrenz,
               quelle: ts.quelle
                 + (ts.belegt ? ", durch eine zweite Kette belegt"
                   : (ts.konkurrenz
                     ? ", eine kürzere Kette ist doppelt bemaßt — strittig, "
                       + "nur als Obergrenze zu lesen"
                     : ", die einzige äußerste Kette, ohne Widerspruch — "
                       + "sie ist der Umfang")) };
    }
    const m = String((p.meta && p.meta.aussenmasse) || "")
      .match(/([\d.,]+)\s*[x×*]\s*([\d.,]+)/);
    if (m) {
      const b = zahl(m[1], 0), t = zahl(m[2], 0);
      if (b > 0 && t > 0) {
        return { A: b * t, U: 2 * (b + t), breite_m: b, tiefe_m: t,
                 rechteckig: true, obergrenze: true,
                 quelle: "Außenmaße " + m[1] + " x " + m[2] + " m aus den Objektangaben" };
      }
    }
    return { A: null, U: null, quelle: null };
  }

  /** Meinen zwei Bezeichnungen dasselbe Geschoss? „GRUNDRISS ERDGESCHOSS" und
   *  „EG" tun das, ein Zeichenvergleich sieht es nicht. */
  function gleichesGeschoss(a, b) {
    const x = String(a || "").trim(), y = String(b || "").trim();
    if (!x || !y) return false;
    if (x.toLowerCase() === y.toLowerCase()) return true;
    const Z = zuordnung();
    if (!Z || typeof Z.geschossAusText !== "function") return false;
    const ga = Z.geschossAusText(x), gb = Z.geschossAusText(y);
    return !!(ga && gb && ga.rang === gb.rang);
  }

  /** Die Außenbemaßung, die MODUL_PDF beim Öffnen aus dem Textstand gelesen
   *  hat. Ohne Geschossangabe gilt sie für das Blatt; deshalb wird nur ein
   *  Blatt genommen, das genau diesem Geschoss zugeordnet ist. */
  function textstandKontur(p, g) {
    const treffer = ((p.plan && p.plan.seiten) || []).filter(function (x) {
      const a = x.aussenbemassung;
      return a && a.vorhanden && zahl(a.breite_m, 0) > 0 && zahl(a.tiefe_m, 0) > 0
        && String(x.geschoss || "").trim() === String(g).trim();
    });
    if (!treffer.length) return null;
    /* Auch hier das kleinste Rechteck: die schärfste Obergrenze. */
    let beste = null;
    treffer.forEach(function (x) {
      const a = x.aussenbemassung;
      const A = zahl(a.breite_m) * zahl(a.tiefe_m);
      if (!beste || A < beste.A) {
        beste = { A: Math.round(A * 100) / 100,
                  U: Math.round(2 * (zahl(a.breite_m) + zahl(a.tiefe_m)) * 100) / 100,
                  breite_m: zahl(a.breite_m), tiefe_m: zahl(a.tiefe_m),
                  belegt: !!a.belegt,
                  /* MODUL_PDF unterscheidet im Kern zwei Fälle, die hier
                     bisher zusammengeworfen wurden: eine EINZELNE äußerste
                     Kette ohne Widerspruch (eindeutig) und eine längste
                     Kette, gegen die eine kürzere doppelt bemaßte steht
                     (strittig, Fall „Bauantrag" 30 m gegen 26 m). Nur der
                     zweite Fall ist eine bloße Obergrenze. */
                  konkurrenz: !!a.konkurrenz,
                  quelle: "äußerste Maßkette im Textstand von "
                    + (x.bezeichnung || x.name) + ", " + de(zahl(a.breite_m), 2)
                    + " m mal " + de(zahl(a.tiefe_m), 2) + " m"
                    + (a.wortlaut ? " („" + a.wortlaut + "“)" : "") };
      }
    });
    return beste;
  }

  function kbZaehler(p, id) {
    return p && p.kontrollblatt && p.kontrollblatt.zaehler
      ? p.kontrollblatt.zaehler[id] : undefined;
  }

  /** Ist dieses Bauteil ein Fenster? Der Rechenkern kennt keine eigene
   *  Kategorie dafür; erkannt wird am Namen des Bauteiltyps. */
  function istFenster(name) {
    return /fenster|verglas/i.test(String(name || ""));
  }

  const RICHTUNGEN = [
    { id: "nord", text: "Nord", re: /^n$|nord/i },
    { id: "ost", text: "Ost", re: /^o$|ost/i },
    { id: "sued", text: "Süd", re: /^s$|sued|süd/i },
    { id: "west", text: "West", re: /^w$|west/i },
  ];
  function richtung(t) {
    const s = String(t || "");
    const tr = RICHTUNGEN.find((r) => r.re.test(s));
    return tr ? tr.id : null;
  }

  /** Hat das Bauteil Kontakt zur Hülle? Ein beheizter Raum ohne ein solches
   *  Bauteil verliert nur über die Lüftung Wärme. */
  function istHuelle(b) {
    const k = b.kat || "";
    const t = (b.grenzt_an && b.grenzt_an.typ) || "";
    return k === "huelle" || k === "erdreich" || k === "nachbar"
      || t === "aussen" || t === "erdreich" || t === "zone" || t === "fest";
  }

  /* =====================================================================
   * Die Zähler
   * =====================================================================
   * Jeder Zähler liefert IMMER mindestens eine Zeile. Auch dann, wenn er
   * nichts vergleichen kann — gerade dann. Eine fehlende Sollzahl ist der
   * Befund „nicht unabhängig geprüft" und keine stille Null.
   * ================================================================== */

  /** Welche Namen stehen nur im Raumbuch, welche nur in der zweiten Lesung?
   *
   *  Verglichen wird mit der Regel von KERN_GEGENPROBE: Groß- und
   *  Kleinschreibung, Leerzeichen, Trennzeichen und Umlautschreibung spielen
   *  keine Rolle, „Kind 1" und „KIND I" sind derselbe Name. Fehlt das Modul,
   *  wird nicht verglichen und auch nichts behauptet. */
  function namensabweichung(raeume, planNamen) {
    const G = gegenprobeKern();
    if (!G || typeof G.normName !== "function") return null;
    const zaehlt = typeof G.zaehltAlsRaum === "function"
      ? G.zaehltAlsRaum : function () { return true; };
    const buch = (raeume || []).map(function (r) { return String(r.name || ""); })
      .filter(zaehlt);
    const plan = (planNamen || []).map(String).filter(zaehlt);
    /* Vielfachheit zählt mit: zwei „Kind" im Raumbuch gegen ein „Kind" im
       Plan ist ein Unterschied, auch wenn der Name auf beiden Seiten
       vorkommt. */
    const rest = plan.map(G.normName);
    const nurBuch = [];
    buch.forEach(function (n) {
      const i = rest.indexOf(G.normName(n));
      if (i < 0) nurBuch.push(n); else rest.splice(i, 1);
    });
    const nurPlan = [];
    const gebraucht = buch.map(G.normName);
    plan.forEach(function (n) {
      const i = gebraucht.indexOf(G.normName(n));
      if (i < 0) nurPlan.push(n); else gebraucht.splice(i, 1);
    });
    return { nurBuch: nurBuch, nurPlan: nurPlan };
  }

  function nenneNamen(liste) {
    const G = gegenprobeKern();
    if (G && typeof G.nenne === "function") return G.nenne(liste);
    return (liste || []).map(function (x) { return "„" + x + "“"; }).join(", ");
  }

  /* --- Z1  Räume je Geschoss ------------------------------------------ */
  function zaehlerRaeume(p) {
    const raus = [];
    const gs = geschosse(p);
    const bl = blaetter(p);
    const al = ausleseRaeume(p);

    gs.forEach(function (g) {
      const eig = zahl(kbZaehler(p, "raeume_" + g.name), null);
      const passend = bl.filter(function (b) {
        return b.art === "grundriss" || b.raeume_erkennbar != null;
      }).filter(function (b) {
        return !b.geschoss || String(b.geschoss).trim() === g.name;
      });
      /* Sollzahl ist das Maximum aller Zähler, nicht der Mittelwert: bei der
         Vollständigkeit ist der Fehler einseitig, und ein Zähler, der einen
         Raum mehr sieht, hat fast immer recht (SPEZIFIKATION_STAPEL 9.3).

         unabhaengig sagt, ob der Zähler das Raumbuch NICHT mit erzeugt hat.
         Nur ein unabhängiger Zähler kann die Vollständigkeit bestätigen; die
         Planauslese kann sie nur widerlegen. Der Unterschied entscheidet über
         die Stufe der Zeile, nicht über ihren Inhalt. */
      const kandidaten = [];
      if (eig > 0) kandidaten.push({ n: eig, q: "im Kontrollblatt gezählt",
                                     unabhaengig: true });
      passend.forEach(function (b) {
        if (b.raeume_erkennbar > 0) {
          kandidaten.push({ n: b.raeume_erkennbar, unabhaengig: true,
                            q: (b.zweite_lesung
                                 ? "zweite, unabhängige Lesung von " + b.name
                                 : "Sichtung von " + b.name)
                               + ": " + b.raeume_erkennbar
                               + " beschriftete Räume" });
        }
        if (b.polygone > 0) {
          kandidaten.push({ n: b.polygone, unabhaengig: true,
                            q: b.name + ": " + b.polygone + " umfahrene Flächen" });
        }
      });
      /* Die ZWEITE LESUNG desselben Blattes. Sie hat gezählt, was beschriftet
         ist, ohne das Ergebnis der ersten Lesung zu kennen — und ist damit der
         einzige unabhängige Zähler, den das Werkzeug selbst erzeugen kann. Er
         BELEGT die Vollständigkeit; die Auslese kann sie nur widerlegen. */
      const gpr = gegenprobeRaeume(p)[g.name];
      if (gpr && gpr.n > 0) {
        kandidaten.push({ n: gpr.n, unabhaengig: true,
          q: "zweite, unabhängige Lesung von " + gpr.blatt + " („" + gpr.wortlaut
             + "“): " + gpr.n + " beschriftete Räume" });
      }
      /* Die Planauslese beantwortet die Frage nach den beschrifteten Räumen
         selbst. Sie hat das Blatt gelesen, ihre Rohantwort liegt noch vor,
         und der Vergleich gegen das Raumbuch findet jeden Raum, der auf dem
         Weg dorthin verloren gegangen ist. Was sie nicht kann: einen Raum
         finden, den sie selbst übersehen hat. Deshalb unabhaengig: false. */
      const a = al[g.name];
      if (a && a.n > 0) {
        kandidaten.push({ n: a.n, unabhaengig: false,
                          q: "Planauslese von " + a.blaetter.join(", ") + ": " + a.n
                             + " beschriftete Räume gelesen" });
      }
      /* EIN UNABHAENGIGER ZAEHLER SCHLAEGT IMMER EINEN ABHAENGIGEN.
       *
       * Hier stand das Maximum ueber ALLE Kandidaten. Damit konnte die
       * Planauslese -- also die Lesung, aus der das Raumbuch selbst
       * entstanden ist -- eine zweite, unabhaengige Lesung verdraengen, sobald
       * ihre Zahl nur groesser war. Die Zeile pruefte dann eine Lesung gegen
       * sich selbst und wurde dabei gruen, waehrend drei Absaetze tiefer im
       * selben Blatt "nur eine Lesung" stand. Zwei Saetze, die sich
       * widersprechen, auf einer Seite.
       *
       * Zuerst wird deshalb entschieden, OB ein unabhaengiger Zaehler da ist.
       * Nur unter Gleichrangigen gilt danach das Maximum -- das bleibt
       * richtig: bei der Vollstaendigkeit ist der Fehler einseitig. */
      const groesster = function (liste) {
        return liste.reduce(function (m, k) { return (m && m.n >= k.n ? m : k); }, null);
      };
      const best = groesster(kandidaten.filter(function (k) { return k.unabhaengig; }))
        || groesster(kandidaten);
      const ist = g.raeume.length;

      if (!best) {
        /* GRENZE. Für dieses Geschoss liegt keine zweite Zahl vor und aus
           diesen Unterlagen entsteht auch keine: kein ausgelesener Plan,
           keine umfahrene Fläche, keine zweite Lesung. Das ist eine Aussage
           über die Unterlagenlage, nicht über das Gebäude, und sie steht
           deshalb im Bericht statt in der Liste. Abzuhaken gibt es hier
           nichts — es gibt nichts zu tun außer nachzuzählen, und das kann
           nur ein Mensch am Plan. */
        raus.push(zeile({
          id: "raeume_" + g.name, titel: "Räume in " + g.name, art: "grenze",
          ist: ist, soll: null, einheit: "Räume", stufe: "offen",
          text: "Im Raumbuch " + (ist === 1 ? "steht 1 Raum" : "stehen " + ist + " Räume")
            + ". Für " + g.name + " ist weder ein Plan ausgelesen noch eine Fläche "
            + "umfahren noch eine zweite Lesung gelaufen; wie viele Räume auf dem Plan "
            + "beschriftet sind, ist damit nicht gegengezählt. Ein nicht erkannter "
            + "Raum erzeugt keine Zeile und macht die Heizlast zu klein, ohne dass es "
            + "am Ergebnis auffällt.",
          abhilfe: "Den Grundriss von " + g.name + " auslesen lassen, oder die Räume "
            + "am Plan abzählen und die Zahl im Kontrollblatt eintragen.",
          frage: { pfad: "zaehler.raeume_" + g.name,
                   label: "Beschriftete Räume auf dem Plan", einheit: "Räume" },
        }));
        return;
      }
      if (ist < best.n) {
        raus.push(zeile({
          id: "raeume_" + g.name, titel: "Räume in " + g.name, art: "befund",
          ist: ist, soll: best.n, einheit: "Räume", quelle_soll: best.q, stufe: "fehler",
          text: (best.n - ist === 1 ? "Es fehlt 1 Raum. " : "Es fehlen " + (best.n - ist)
            + " Räume. ") + best.q + ", im Raumbuch "
            + "stehen " + ist + ". Jeder fehlende Raum senkt die Gebäudeheizlast und "
            + "bleibt in Watt je Quadratmeter unsichtbar. Entweder den Raum nachtragen "
            + "oder hier die Zahl der Räume berichtigen.",
          frage: { pfad: "zaehler.raeume_" + g.name,
                   label: "Beschriftete Räume auf dem Plan", einheit: "Räume" },
        }));
      } else if (ist > best.n) {
        /* EINE WIDERLEGTE ZAEHLUNG WIRD NICHT ZUM VORSCHLAG.
         *
         * GEMESSEN am 26.08.2026 an "Hasenberg 10": das Raumbuch fuehrte im
         * Erdgeschoss 14 Raeume, JEDER mit einem aus dem Textstand des
         * Blattes gelesenen Flaechenstempel. Die zweite Lesung zaehlte 12.
         * Angeboten wurde "12 Raeume als richtig anerkennen" -- ein Klick,
         * und die widerlegte Zahl der schwaecheren Lesung stand als
         * abgezaehlt im Bericht, waehrend das Raumbuch unveraendert 14 fuehrte.
         *
         * Ein Flaechenstempel ist der staerkere Beleg: er steht als Text auf
         * dem Blatt und ist nachzulesen. Tragen ALLE Raeume des Geschosses
         * einen, wird kein Sollwert mehr ausgewiesen (soll = null) -- damit
         * entsteht auch kein Ein-Klick-Vorschlag, der ihn anerkennt. Die
         * Zeile bleibt als Hinweis stehen und sagt, was zu pruefen ist. */
        const gestempelt = g.raeume.filter(function (r) {
          const hk = (r && r.herkunft) || {};
          return hk.flaeche_gelesen === true
            || /stempel|angeschrieben/i.test(String(hk.flaeche_quelle || hk.quelle || ""));
        }).length;
        const alleGestempelt = ist > 0 && gestempelt === ist;
        raus.push(zeile({
          id: "raeume_" + g.name, titel: "Räume in " + g.name, art: "befund",
          ist: ist, soll: alleGestempelt ? null : best.n, einheit: "Räume",
          quelle_soll: alleGestempelt ? null : best.q, stufe: "warnung",
          text: "Im Raumbuch " + (ist - best.n === 1 ? "steht 1 Raum" : "stehen "
            + (ist - best.n) + " Räume") + " mehr als auf dem Plan "
            + "gezählt wurden (" + best.q + "). "
            + (alleGestempelt
              ? "Alle " + ist + " Räume tragen eine im Plan angeschriebene Fläche; "
                + "die niedrigere Zählung wird deshalb nicht als richtig angeboten. "
                + "Zu prüfen ist, ob unter den " + ist + " eine Dublette steht."
              : "Möglich ist eine Dublette oder eine "
                + "Fläche, die doppelt übernommen wurde."),
          /* Ein Raum ZU VIEL macht die Heizlast zu groß, und er steht mit
             Namen und Fläche im Raumbuch. Das ist im Raumbuch nachzusehen
             und mit einem Klick zu beantworten; die gefährliche Richtung —
             ein Raum zu WENIG — bleibt eine Sperre. */
          aufhebbar: true,
        }));
      } else if (best.unabhaengig) {
        /* GLEICHE ZAHL, ANDERE NAMEN.
         *
         * Die Zahl stimmt, und trotzdem kann eine Lesung danebenliegen: der
         * NAME setzt die Raumart und die Raumart setzt die Raumtemperatur.
         * „Bad" rechnet mit 24 °C, „Abstellraum" mit 15 °C — bei sonst
         * gleicher Geometrie sind das über 50 % Unterschied im
         * Transmissionsanteil dieses Raums, und die Zeile sähe vollständig
         * aus. Der Blattabgleich (KERN_GEGENPROBE.abgleich) kennt diesen
         * Vergleich seit langem, aber sein Ergebnis landete nur in den
         * Vermerken des Blattes; im Kontrollblatt stand die Zeile grün.
         * Verglichen wird mit derselben Regel wie dort (normName), sonst
         * melden zwei Vergleiche verschiedene Unterschiede an derselben
         * Zeichnung. */
        const abw = gpr && gpr.namen && gpr.namen.length === best.n
          ? namensabweichung(g.raeume, gpr.namen) : null;
        if (abw && (abw.nurBuch.length || abw.nurPlan.length)) {
          raus.push(zeile({
            id: "raeume_" + g.name, titel: "Räume in " + g.name, art: "befund",
            ist: ist, soll: best.n, einheit: "Räume", quelle_soll: best.q,
            stufe: "warnung",
            text: "Beide Lesungen zählen " + mz(ist, "Raum", "Räume") + " in " + g.name
              + ", benennen sie aber verschieden: im Raumbuch steht "
              + nenneNamen(abw.nurBuch) + ", die zweite Lesung liest "
              + nenneNamen(abw.nurPlan) + ". Der Name entscheidet über die Raumart "
              + "und damit über die Raumtemperatur; ein Bad rechnet mit 24 °C, ein "
              + "Abstellraum mit 15 °C. Am Plan nachsehen, welcher Name dasteht.",
          }));
          return;
        }
        raus.push(zeile({
          id: "raeume_" + g.name, titel: "Räume in " + g.name, art: "pruefung",
          ist: ist, soll: best.n, einheit: "Räume", quelle_soll: best.q, stufe: "gut",
          text: "Raumbuch und Plan zählen übereinstimmend " + mz(ist, "Raum", "Räume") + " ("
            + best.q + ")"
            + (abw ? ", und es sind dieselben Namen" : "") + ".",
        }));
      } else {
        /* Angekommen, aber nicht unabhängig gegengezählt.
           Die Prüfung selbst ist BESTANDEN: auf dem Weg vom Plan ins Raumbuch
           ist kein Raum verloren gegangen, und genau das war die Frage. Was
           sie nicht abdeckt — ein Raum, den schon die Auslese übersehen hat —
           ist keine offene Aufgabe des Bearbeiters, sondern eine Grenze
           dieser einen Lesung. Sie steht als eigene Zeile im Bericht.
           Vorher war das eine Zeile der Stufe „Hinweis", die auf jedem
           Projekt dastand und im Kopf als offene Frage mitzählte. */
        /* DER TITEL MUSS SAGEN, WAS GEPRUEFT IST.
         *
         * Hier stand "Räume in EG · 6 von 6 · Planauslese von … Seite 1",
         * gruen, als bestandene Gegenprobe gezaehlt -- und drei Absaetze
         * tiefer im selben Blatt: "Räume in EG: nur eine Lesung". Beides
         * gleichzeitig, und der Titel der gruenen Zeile behauptete das
         * Groessere von beidem.
         *
         * Geprueft ist hier ausschliesslich die UEBERGABE: was die Auslese
         * gelesen hat, steht auch im Raumbuch. Das ist eine echte Probe, sie
         * kann anschlagen, und sie faengt genau den Fehler, den sonst niemand
         * sieht -- einen Raum, der beim Uebernehmen verlorengeht. Was sie
         * NICHT ist: eine Aussage darueber, ob der Plan vollstaendig gelesen
         * wurde. Der Titel sagt das jetzt, und die Zeile verweist auf die
         * Grenze, statt ihr zu widersprechen. */
        raus.push(zeile({
          id: "raeume_" + g.name,
          titel: "Räume in " + g.name + ": vollständig ins Raumbuch übernommen",
          art: "pruefung",
          ist: ist, soll: best.n, einheit: "Räume", quelle_soll: best.q, stufe: "gut",
          text: best.q.charAt(0).toUpperCase() + best.q.slice(1)
            + "; ebenso viele stehen im Raumbuch. Auf dem Weg vom Plan ins Raumbuch "
            + "ist kein Raum verloren gegangen. Dass der Plan vollständig gelesen "
            + "wurde, ist damit nicht gezeigt — beide Zahlen stammen aus derselben "
            + "Lesung. Das steht unten als Grenze.",
        }));
        raus.push(zeile({
          id: "raeume_nur_eine_lesung_" + g.name, art: "grenze",
          titel: "Räume in " + g.name + ": nur eine Lesung",
          ist: ist, soll: null, einheit: "Räume", quelle_soll: best.q,
          stufe: "hinweis",
          text: "Die Zahl der Räume in " + g.name + " stammt aus einer einzigen "
            + "Lesung des Plans. Auslese und Raumbuch gehen darauf zurück; ein Raum, "
            + "den diese Lesung übersehen hat, fehlt in beiden und fällt nirgends "
            + "auf. Was geprüft ist: kein Raum ist auf dem Weg ins Raumbuch verloren "
            + "gegangen. Was nicht geprüft ist: ob die Lesung vollständig war.",
          abhilfe: "Eine zweite, unabhängige Lesung desselben Blattes laufen lassen "
            + "(sie zählt die Beschriftungen, ohne das erste Ergebnis zu kennen), "
            + "oder die Räume am Plan abzählen und die Zahl hier eintragen.",
          frage: { pfad: "zaehler.raeume_" + g.name,
                   label: "Beschriftete Räume auf dem Plan", einheit: "Räume" },
        }));
      }
    });
    return raus;
  }

  /* --- Z2  Fläche gegen Kontur abzüglich Wandanteil -------------------- */
  /* Der Vergleich braucht keinen angenommenen Innenwandanteil. Die Frage ist
     nicht „wie viel Prozent sind Wand", sondern die einzige, auf die es
     ankommt: Hätte in der nicht belegten Restfläche noch ein Raum Platz?
     Das Maß dafür liefert das Projekt selbst — der kleinste bereits erfasste
     Raum desselben Geschosses. */
  function zaehlerFlaeche(p, z1) {
    const raus = [];
    const gs = geschosse(p);
    const wd = wanddicke(p);
    const groesstes = gs.reduce((m, g) => (m && m.A >= g.A ? m : g), null);
    const Z = zuordnung();

    /* Ist die Raumzahl dieses Geschosses beantwortet? Dann ist die fehlende
       Kontur keine offene Frage mehr, sondern nur noch der Verzicht auf eine
       zweite, unabhängige Probe. Die Zeilen von Z1 stehen dafür bereit. */
    const raumzahlGeklaert = function (name) {
      const z = (z1 || []).find(function (x) { return x.id === "raeume_" + name; });
      return !!z && (z.stufe === "gut" || z.stufe === "hinweis"
                     || z.stufe === "bestaetigt");
    };

    /* WANN DAS RAUMBUCH BELEGT IST — strenger als „geklärt".
       Nur eine zweite, vom Raumbuch unabhängige Lesung, die dieselbe Zahl UND
       dieselben Namen zählt, belegt die Raumliste eines Geschosses. Ein
       Zähler, den der Bearbeiter selbst eingetragen oder abgehakt hat, tut
       das nicht. Diese Unterscheidung entscheidet weiter unten darüber, wer
       bei einem Widerspruch der schwächere Zeuge ist. */
    const raumzahlBelegt = function (name) {
      const z = (z1 || []).find(function (x) { return x.id === "raeume_" + name; });
      return !!z && z.art === "pruefung" && z.stufe === "gut"
        && /unabhängige Lesung/.test(String(z.quelle_soll || ""));
    };

    /* WARUM EINE KONTUR WIDERLEGT SEIN KANN.
     *
     * Raumsumme groesser als die Aussenkontur ist geometrisch unmoeglich:
     * eine der beiden Zahlen ist falsch. Bisher hat die Zeile daraus einen
     * roten Befund GEGEN DAS RAUMBUCH gemacht und die Kontur nur als
     * moegliche Ursache erwaehnt. Am Blatt „BV 2-0887 Ziolkowski" war das
     * die falsche Richtung.
     *
     * GEMESSEN am 22.08.2026, echter Durchlauf gegen den Endpunkt: das
     * Erdgeschoss kam als 11,5 mal 6,0 m zurueck, Wortlaut
     * „3.50 + 8.00 / 6.00" — eine Summe, in der die 3,50 die Terrasse ist.
     * Wahr sind 8,00 mal 12,50 m. Die sechs Raumflaechen dagegen stammen aus
     * sechs einzelnen Flaechenstempeln und wurden von der zweiten Lesung
     * namentlich bestaetigt (6 von 6, dieselben Namen).
     *
     * Ein Zeuge, den eine unabhaengige Lesung Name fuer Name bestaetigt hat,
     * wiegt schwerer als eine einzelne Masskette. Ist das Raumbuch so
     * belegt, wird die Kontur widerlegt — und die Zeile sagt das, statt das
     * Raumbuch zu beschuldigen. Aufgeweicht wird dabei nichts: die
     * Flaechenprobe dieses Geschosses ist dann NICHT gelaufen, und genau das
     * steht als Grenze da, mit beiden Zahlen. */
    const konturWiderlegt = function (g, k) {
      if (!raumzahlBelegt(g.name)) return null;
      const gruende = [];
      const wl = String(k.wortlaut || "");
      if (/\+/.test(wl)) {
        gruende.push("die Maßkette ist eine Summe mehrerer Teilmaße („" + wl
          + "“); ein Teilmaß, das nicht zum Gebäude gehört — eine Terrasse, "
          + "ein Vordach, ein Balkon —, wandert dabei unbemerkt in die Kontur");
      }
      /* Ein Geschoss, dessen Aussenmass in einer Richtung KLEINER ist als das
         eines anderen Geschosses, dessen Grundflaeche zugleich kleiner ist,
         widerspricht sich mit jenem. Zwei Konturen desselben Gebaeudes, die
         einander so widersprechen, koennen nicht beide stimmen. */
      const kurzG = Math.min(zahl(k.breite_m, 0), zahl(k.tiefe_m, 0));
      const langG = Math.max(zahl(k.breite_m, 0), zahl(k.tiefe_m, 0));
      if (kurzG > 0) {
        gs.forEach(function (a) {
          if (a.name === g.name || !(a.A > 0) || a.A >= g.A) return;
          const ka = kontur(p, a.name);
          if (!ka || !(zahl(ka.breite_m, 0) > 0)) return;
          const kurzA = Math.min(zahl(ka.breite_m, 0), zahl(ka.tiefe_m, 0));
          const langA = Math.max(zahl(ka.breite_m, 0), zahl(ka.tiefe_m, 0));
          if (kurzA > kurzG + 0.05 || langA > langG + 0.05) {
            gruende.push("das kleinere Geschoss " + a.name + " misst nach "
              + "derselben Lesung " + de(langA, 2) + " mal " + de(kurzA, 2)
              + " m und ist damit in einer Richtung größer als dieses hier ("
              + de(langG, 2) + " mal " + de(kurzG, 2) + " m); zwei Konturen "
              + "desselben Gebäudes, die einander so widersprechen, können "
              + "nicht beide stimmen");
          }
        });
      }
      return gruende.length ? gruende : null;
    };

    gs.forEach(function (g) {
      const k = kontur(p, g.name);
      const kleinster = g.raeume.reduce(
        (m, r) => (m === null || zahl(r.A, 0) < m ? zahl(r.A, 0) : m), null);

      if (k.A > 0) {
        /* DIE INNENFLÄCHE ALS SPANNE, nicht als eine Zahl.
           Bei rechteckiger Kontur gilt exakt A_innen = A - U*d + 4*d². Die
           Wanddicke d ist aber nur selten belegt. Sie deswegen wegzulassen und
           die Konturfläche als reine Obergrenze zu nehmen, war der teuerste
           Verzicht in diesem Zähler: bei „BV 2-0887 Ziolkowski" sind das 100,00
           statt 85,57 m² und damit 14 m² Restfläche, die es gar nicht gibt.
           Gerechnet wird deshalb mit BEIDEN Enden der Wanddickenspanne. Die
           dünne Wand ergibt die größte Innenfläche, die dicke die kleinste.
           Alles Weitere wird mit beiden Enden geprüft, und ein Befund entsteht
           nur, wenn er auf der GANZEN Spanne steht. */
        const dU = wd.d > 0 ? wd.d : wd.unten;
        const dO = wd.d > 0 ? wd.d : wd.oben;
        const innen = function (d) {
          return k.U > 0 ? k.A - k.U * d + 4 * d * d : k.A;
        };
        const innenMax = innen(dU);          // dünne Wand, größte Innenfläche
        const innenMin = innen(dO);          // dicke Wand, kleinste Innenfläche
        let brutto = innenMax, wie = "";
        if (k.U > 0 && wd.d > 0) {
          wie = "Die Fläche innerhalb der Außenwände beträgt " + de(innenMax, 2)
            + " m² (Kontur " + de(k.A, 2) + " m², Umfang " + de(k.U, 2)
            + " m, Wanddicke " + de(wd.d, 3) + " m " + wd.quelle + "). ";
        } else if (k.U > 0) {
          /* "Die Wanddicke steht nirgends" war eine Tatsachenbehauptung ueber
             die Zeichnung -- und am 26.08.2026 an "Bauantrag Soethe falsch:
             die Massketten weisen 30 cm Aussenwand und 13/22 cm Innenwaende
             aus, das Blatt war gelesen. Der Satz sagt jetzt, was zutrifft:
             das Werkzeug hat keine, und wo eine steht, gehoert sie
             eingetragen. */
          wie = "Die Außenkontur misst " + de(k.A, 2) + " m². Eine Wanddicke "
            + "liegt dem Werkzeug nicht vor; angesetzt sind 0,24 bis 0,50 m "
            + "(ANNAHME, Baurichtmaße nach DIN 4172). Steht eine Wanddicke in "
            + "einer Maßkette des Plans, ist sie im Kontrollblatt einzutragen "
            + "und ersetzt die Spanne. Damit liegt die Fläche innerhalb der "
            + "Außenwände zwischen "
            + de(innenMin, 2) + " und " + de(innenMax, 2) + " m². ";
        } else {
          wie = "Die Außenkontur misst " + de(k.A, 2) + " m². Ohne Umfang lässt sich "
            + "der Wandanteil nicht abziehen; das ist eine reine Obergrenze. ";
        }

        /* Seitenlängen. Stehen sie nicht da, aber Fläche und Umfang, dann
           liefert das flächen- und umfangsgleiche Rechteck sie: aus x+y = U/2
           und x·y = A folgt x,y = U/4 ± Wurzel((U/4)² - A). Bei einem Umriss,
           der kein Rechteck ist, gibt es keine reelle Lösung; dann bleibt das
           Quadrat gleicher Fläche als Ersatz, und der Rahmen wird dadurch
           enger, nicht weiter. */
        let kurz = Math.min(zahl(k.breite_m, 0), zahl(k.tiefe_m, 0));
        let lang = Math.max(zahl(k.breite_m, 0), zahl(k.tiefe_m, 0));
        if (!(kurz > 0) && k.U > 0 && k.A > 0) {
          const halb = k.U / 4;
          const wurzel = halb * halb - k.A;
          lang = wurzel > 0 ? halb + Math.sqrt(wurzel) : Math.sqrt(k.A);
          kurz = k.A / lang;
        }

        /* Wie viel von der Restfläche ist erklärt? */
        const rahmen = restrahmen({
          raeume: g.raeume.length,
          flaechen: g.raeume.map(function (r) { return zahl(r.A, 0); }),
          umfang_m: k.U > 0 ? k.U : 0,
          kurz_m: kurz,
          lang_m: lang,
          treppe: gs.length > 1,
          hoehe_unten: geschosshoehe(g).unten,
          hoehe_oben: geschosshoehe(g).oben,
        });
        const restMin = innenMin - g.A;      // die vorsichtige Restfläche
        const restMax = innenMax - g.A;
        const rest = restMax;
        const toleranz = brutto * 0.01;   // Rundung der Flächen auf zwei Stellen
        /* Ab welcher übersehenen Fläche schlägt die Probe an? Genau dann, wenn
           die vorsichtige Restfläche den erklärten Rahmen übersteigt. Das ist
           die Auflösung dieser Prüfung, und sie gehört in die Zeile: eine Probe,
           die einen vergessenen Abstellraum nicht findet, darf nicht so tun. */
        const unerklaert = restMin - rahmen.oben;
        const aufloesung = Math.max(0, -unerklaert + (kleinster === null ? 0 : kleinster));

        const widerlegt = (g.A > brutto + toleranz) ? konturWiderlegt(g, k) : null;
        if (widerlegt) {
          /* DIE KONTUR IST DER SCHWAECHERE ZEUGE — und das steht jetzt da.
             Die Flaechenprobe dieses Geschosses ist damit NICHT gelaufen.
             Das ist keine Entwarnung und kein Haken: es ist eine Grenze, sie
             nennt beide Zahlen, den Grund und die Unterlage, die sie aufhebt.
             Sie zaehlt nicht als bestandene Gegenprobe. */
          raus.push(zeile({
            id: "flaeche_" + g.name, titel: "Außenkontur " + g.name + " widerlegt",
            art: "grenze", ist: g.A, soll: null, einheit: "m²",
            quelle_soll: k.quelle, stufe: "hinweis",
            text: "Die abgelesene Außenkontur ergibt " + de(k.A, 2) + " m² brutto, "
              + "innerhalb der Außenwände höchstens " + de(brutto, 2) + " m². Die "
              + de(g.raeume.length, 0) + " Räume dieses Geschosses summieren sich "
              + "auf " + de(g.A, 2) + " m². Räume, die zusammen mehr Fläche haben "
              + "als die Hülle, in der sie liegen, kann es nicht geben — eine der "
              + "beiden Zahlen ist falsch. Für das Raumbuch spricht, dass eine "
              + "zweite, vom Raumbuch unabhängige Lesung dieselben "
              + de(g.raeume.length, 0) + " Räume mit denselben Namen gezählt hat "
              + "(siehe „Räume in " + g.name + "“) und dass jede Fläche aus einem "
              + "eigenen Flächenstempel stammt. Gegen die Kontur spricht: "
              + widerlegt.join("; ") + ". Die Kontur wird deshalb für dieses "
              + "Geschoss nicht als Sollwert verwendet; die Flächenprobe ist hier "
              + "nicht gelaufen. Ein übersehener Raum in " + g.name + " bliebe "
              + "damit unentdeckt, soweit ihn die Raumzahl nicht schon ausschließt.",
            abhilfe: "Die äußere Maßkette von " + g.name + " am Plan ablesen und die "
              + "Kontur hier eintragen; dann läuft die Flächenprobe.",
            frage: { pfad: "zaehler.kontur_" + g.name,
                     label: "Außenkontur dieses Geschosses", einheit: "m²" },
          }));
        } else if (g.A > brutto + toleranz) {
          /* DREI MÖGLICHE SCHULDIGE, NICHT ZWEI.
           *
           * Hier stand: „Das ist geometrisch unmöglich. Entweder ist der
           * Maßstab zu groß angesetzt oder eine Fläche wurde doppelt
           * übernommen." Beide genannten Ursachen liegen im Raumbuch. Die
           * dritte, die nicht dastand, ist die KONTUR selbst — und sie war es
           * im gemessenen Fall.
           *
           * GEMESSEN am 22.08.2026 an „BV 2-0887 Ziolkowski", Erdgeschoss:
           * die zweite Lesung gab die Außenbemaßung in sechs von sechs Läufen
           * übereinstimmend mit 11,50 mal 6,00 m an, Wortlaut
           * „3.50 + 8.00 / 6.00". Auf dem Plan ist das Gebäude 8,00 mal
           * 12,50 m: die 3,50 gehören zur Terrasse davor, und die Tiefe steht
           * in zwei Ketten (6,50 und 6,00), von denen nur eine genommen wurde.
           * Sechs gleiche Lesungen sind also ein Beleg für Reproduzierbarkeit
           * und keiner für Richtigkeit.
           *
           * Die Zeile bleibt rot: zwei Zahlen dieses Projekts widersprechen
           * sich, und darauf darf kein unterschriebener Bericht stehen. Was
           * sich ändert, ist, dass sie den Schuldigen nicht mehr benennt,
           * bevor sie ihn kennt — und dass sie den Wortlaut der Maßkette zum
           * Nachsehen anbietet, denn dort ist der Fehler zu sehen. */
          raus.push(zeile({
            id: "flaeche_" + g.name, titel: "Flächensumme " + g.name, art: "befund",
            ist: g.A, soll: brutto, einheit: "m²", quelle_soll: k.quelle, stufe: "fehler",
            text: wie + "Die Summe der Raumflächen ist mit " + de(g.A, 2) + " m² um "
              + de(g.A - brutto, 2) + " m² GRÖSSER. Beides zusammen kann nicht "
              + "stimmen. Drei Ursachen kommen in Frage, und die erste ist die "
              + "häufigste: die Außenbemaßung ist falsch gelesen — eine Maßkette, die "
              + "eine Terrasse oder einen Vorbau mitnimmt, oder eine Tiefe, die in "
              + "zwei Ketten steht und von der nur eine genommen wurde. Dann der "
              + "Maßstab, wenn er zu groß angesetzt ist. Und zuletzt eine Fläche, die "
              + "doppelt ins Raumbuch kam. Am schnellsten zu prüfen ist die Kontur: "
              + "sie steht als " + k.quelle + " und ist am Plan nachzusehen.",
            abhilfe: "Die äußere Maßkette von " + g.name + " am Plan ablesen und die "
              + "Kontur hier eintragen; stimmt sie, die Raumflächen durchsehen.",
          }));
        } else if (rahmen.teile && kleinster !== null && unerklaert > kleinster) {
          /* DER EIGENTLICHE BEFUND: die Restfläche ist auch dann noch zu groß,
             wenn man die Wände so dick und die Treppe so groß ansetzt, wie sie
             überhaupt sein können. Dann ist da Platz, den nichts erklärt.

             Und WARUM DAS NICHT MEHR GEGEN DEN KLEINSTEN RAUM GEHT: der
             Vorgänger verglich die ganze Restfläche mit dem kleinsten
             erfassten Raum. Das ist keine zu enge Schwelle, sondern die
             falsche Frage — die Restfläche BESTEHT aus Wand- und
             Verkehrsfläche, ein Vergleich mit einer Raumfläche fragt danach,
             ob ein Raum in die Wände passt. Bei „BV 2-0887 Ziolkowski" ist der
             kleinste Raum das WC mit 2,17 m², die Innenwände und der
             Treppenlauf machen aber rund 11 m². Die Zeile stand deshalb auf
             jedem normal gebauten Haus da, und eine Prüfung, die immer
             anschlägt, prüft nichts.
             Der Vergleich mit dem kleinsten Raum ist damit nicht falsch — er
             stand nur an der falschen Stelle. Er gilt weiter, aber für den
             UNERKLÄRTEN Teil der Restfläche: erst wenn übrig bleibt, was
             weder Wand noch Treppe ist, UND dieser Überschuss so groß ist wie
             ein Raum dieses Geschosses, ist von einem fehlenden Raum die Rede.
             Die Prüfung wird dadurch nicht schwächer, sondern schärfer: der
             vergessene Raum, den sie vorher im Rauschen der Wandflächen nicht
             mehr zeigen konnte, fällt jetzt auf. */
          /* ZWEI Erklärungen bleiben für eine unerklärte Restfläche: ein
             Rücksprung der Kontur oder ein fehlender Raum. Zur Grenze wird die
             Zeile nur, wenn BEIDE Bedingungen zutreffen — die Kontur ist bloß
             das umschreibende Rechteck (Rücksprung möglich) UND die Raumzahl
             ist durch eine zweite, unabhängige Zählung belegt (fehlender Raum
             ausgeschlossen). Fehlt eines von beidem, bleibt es ein Befund. */
          const rechteck = !!k.obergrenze && raumzahlGeklaert(g.name);
          raus.push(zeile({
            id: "flaeche_" + g.name, titel: "Flächensumme " + g.name,
            /* Ist die Kontur nur das umschreibende Rechteck, kann ein
               Rücksprung — L-Form, eingezogener Eingang, Terrasse — die
               Restfläche ebenso erklären. Dann ist die Frage aus DIESER
               Unterlage nicht zu entscheiden: eine Grenze, keine Aufgabe. */
            art: rechteck ? "grenze" : "befund",
            abhilfe: rechteck
              ? ("Die Kontur von " + g.name + " im Plan umfahren oder ihre Fläche "
                 + "hier eintragen; dann entscheidet die Restflächenprüfung.")
              : null,
            ist: g.A, soll: brutto, einheit: "m²", quelle_soll: k.quelle,
            stufe: rechteck ? "hinweis" : "warnung",
            text: wie + "Belegt sind davon " + de(g.A, 2) + " m². Die Restfläche liegt "
              + "damit zwischen " + de(restMin, 1) + " und " + de(restMax, 1)
              + " m². Erklärt sind davon höchstens " + de(rahmen.oben, 1) + " m²: "
              + rahmen.wie + ". Selbst mit den größten dieser Maße bleiben "
              + de(unerklaert, 1) + " m² übrig, die nichts erklärt — mehr als der "
              + "kleinste erfasste Raum dieses Geschosses (" + de(kleinster, 2)
              + " m²). "
              + (rechteck
                ? "ABER: diese Kontur ist aus zwei Außenmaßen gebildet und damit das "
                  + "umschreibende Rechteck. Ein Rücksprung — L-Form, eingezogener "
                  + "Eingang, überbaute Terrasse — erklärt die Restfläche genauso gut "
                  + "wie ein fehlender Raum. Zwischen beidem entscheidet diese "
                  + "Unterlage nicht; deshalb steht das hier als Grenze und nicht als "
                  + "Beanstandung."
                : (k.obergrenze
                  ? "Diese Kontur ist zwar nur das umschreibende Rechteck, ein "
                    + "Rücksprung könnte die Fläche also mit erklären. Ausgeschlossen "
                    + "ist der fehlende Raum damit aber nicht: die Raumzahl von "
                    + g.name + " ist durch keine zweite, unabhängige Zählung belegt. "
                    + "Bitte am Plan nachsehen."
                  : "Die Kontur ist die wirkliche Außenkante, ein Rücksprung scheidet "
                    + "damit aus. Hier fehlt ein Raum. Bitte am Plan nachsehen.")),
            frage: rechteck
              ? { pfad: "zaehler.kontur_" + g.name,
                  label: "Außenkontur dieses Geschosses", einheit: "m²" }
              : null,
          }));
        } else if (!rahmen.teile && kleinster !== null && rest > kleinster) {
          /* Ohne Breite und Tiefe lässt sich kein Rahmen herleiten — dann
             bleibt nur der alte, grobe Vergleich, und er wird auch als grob
             ausgewiesen. */
          raus.push(zeile({
            id: "flaeche_" + g.name, titel: "Flächensumme " + g.name, art: "grenze",
            abhilfe: "Außenmaße (Breite mal Tiefe) eintragen; daraus folgt der "
              + "erklärbare Wand- und Treppenanteil und die Prüfung entscheidet.",
            ist: g.A, soll: brutto, einheit: "m²", quelle_soll: k.quelle,
            stufe: "hinweis",
            text: wie + "Belegt sind davon " + de(g.A, 2) + " m², es bleiben "
              + de(rest, 1) + " m². Wie viel davon Innenwand und Treppenlauf sind, "
              + "lässt sich ohne Breite und Tiefe der Kontur nicht herleiten. Damit "
              + "ist nur die harte Richtung geprüft: die Raumsumme liegt nicht über "
              + "der Kontur, das wäre geometrisch unmöglich.",
            frage: { pfad: "zaehler.kontur_" + g.name,
                     label: "Außenkontur dieses Geschosses", einheit: "m²" },
          }));
        } else {
          /* WIE FEIN LÖST DIESE PROBE AUF — UND WANN IST SIE DAMIT KEINE?
           *
           * `aufloesung` ist die Fläche, die ein übersehener Raum haben
           * dürfte, ohne dass die Probe anschlägt: der Abstand zwischen der
           * vorsichtigen Restfläche und dem, was Wanddicke, Innenwände und
           * Treppe erklären können, plus dem kleinsten erfassten Raum. Ist
           * sie so groß wie der kleinste Raum dieses Geschosses oder größer,
           * dann würde ein vollständiger, vergessener Raum in der Spanne
           * verschwinden — und dann hat diese Probe nichts belegt.
           *
           * GEMESSEN am Blatt „BV 2-0887 Ziolkowski", echter Durchlauf
           * 23.08.2026, Kellergeschoss: Kontur 56,00 m², innerhalb der Wände
           * 42,00 bis 49,03 m², belegt 39,19 m². Die Zeile stand grün, und
           * im selben Satz stand, dass sie rund 25 m² auflöst — bei einem
           * kleinsten erfassten Raum von 17,99 m². Ein grüner Haken neben
           * zwei Zahlen, die um ein Fünftel auseinanderliegen, und mit einer
           * Auflösung, die größer ist als das Gesuchte.
           *
           * Das ist kein neuer Schwellenwert: gerechnet wird mit denselben
           * Zahlen wie vorher, nur wird jetzt ausgesprochen, was sie sagen.
           * Grün bleibt der Fall, in dem eine POSITIVE Restfläche übrig ist,
           * die kleiner ist als der kleinste erfasste Raum — dort ist der
           * übersehene Raum wirklich ausgeschlossen. Deckt die Spanne aus
           * Wand-, Innenwand- und Treppenmaßen die Restfläche dagegen
           * vollständig ab, ist nichts ausgeschlossen, sondern nur nichts
           * mehr messbar: eine Grenze, und sie gehört in den Bericht. */
          const traegt = kleinster !== null && unerklaert > 0
                         && aufloesung < kleinster;
          if (!traegt) {
            raus.push(zeile({
              id: "flaeche_" + g.name,
              titel: "Flächensumme " + g.name + ": nicht auflösbar",
              art: "grenze",
              ist: g.A, soll: null, einheit: "m²", quelle_soll: k.quelle,
              stufe: "hinweis",
              text: wie + "Belegt sind " + de(g.A, 2) + " m², es bleiben "
                + (restMin === restMax ? de(restMin, 1) + " m²"
                  : (restMin <= 0 ? "höchstens " + de(restMax, 1) + " m²"
                    : de(restMin, 1) + " bis " + de(restMax, 1) + " m²"))
                + ". Innenwände und Treppenlauf machen hier " + de(rahmen.unten, 1)
                + " bis " + de(rahmen.oben, 1) + " m² aus (" + rahmen.wie + "). "
                + "Diese Spanne deckt die Restfläche ab. Daraus folgt KEINE "
                + "Entwarnung: die Probe löst rund " + de(aufloesung, 0)
                + " m² auf"
                + (kleinster === null ? ""
                  : ", und der kleinste erfasste Raum dieses Geschosses hat "
                    + de(kleinster, 2) + " m²")
                + ". Ein übersehener Raum bliebe damit in der Spanne aus "
                + "Wanddicke, Innenwänden und Treppenmaßen unentdeckt, und "
                + "seine Fläche fehlte mitsamt ihrer Hülle in der Heizlast. "
                + "Die Flächenprobe ist für " + g.name + " damit gelaufen, "
                + "aber ohne Aussage; sie zählt nicht als bestandene "
                + "Gegenprobe.",
              abhilfe: "Die Wanddicke von " + g.name + " am Plan ablesen und "
                + "eintragen — damit wird aus der Spanne 0,24 bis 0,50 m eine "
                + "Zahl und die Restfläche schmaler. Oder die Raumflächen "
                + "gegen die Flächenstempel des Grundrisses durchzählen.",
              frage: { pfad: "zaehler.kontur_" + g.name,
                       label: "Außenkontur dieses Geschosses", einheit: "m²" },
            }));
            return;
          }
          raus.push(zeile({
            id: "flaeche_" + g.name, titel: "Flächensumme " + g.name,
            art: "pruefung",
            ist: g.A, soll: brutto, einheit: "m²", quelle_soll: k.quelle, stufe: "gut",
            text: wie + "Belegt sind " + de(g.A, 2) + " m², es bleiben "
              /* Eine negative untere Grenze heißt: mit der dicksten
                 angenommenen Wand gingen die Räume nicht mehr hinein. Das ist
                 kein Fehler, sondern ein Hinweis darauf, dass die Wand dünner
                 ist als das obere Ende der Annahme — und als Zahl im Text
                 nur verwirrend. Genannt wird deshalb die Obergrenze. */
              + (restMin === restMax ? de(restMin, 1) + " m²"
                : (restMin <= 0 ? "höchstens " + de(restMax, 1) + " m² (die dickste "
                    + "angenommene Wand scheidet damit aus)"
                  : de(restMin, 1) + " bis " + de(restMax, 1) + " m²"))
              + ". Innenwände und Treppenlauf machen hier " + de(rahmen.unten, 1)
              + " bis " + de(rahmen.oben, 1) + " m² aus (" + rahmen.wie + "). "
              + (unerklaert > 0
                ? "Unerklärt bleiben davon " + de(unerklaert, 1) + " m², weniger als "
                  + "der kleinste erfasste Raum (" + de(kleinster === null ? 0 : kleinster, 2)
                  + " m²); ein übersehener Raum ist darin nicht unterzubringen."
                : "Damit ist die Restfläche vollständig erklärt; für einen "
                  + "übersehenen Raum bleibt nichts übrig.")
              + (aufloesung > 0
                ? " Die Probe löst rund " + de(aufloesung, 0) + " m² auf: eine kleinere "
                  + "übersehene Fläche verschwindet in der Spanne von Wanddicke, "
                  + "Innenwänden und Treppenmaßen."
                : ""),
          }));
        }
        return;
      }

      /* Ohne eigene Kontur: gegen das größte Geschoss halten. Ein Rücksprung
         ist entweder baulich (Drempel, Dachschräge, Terrasse) oder es fehlt
         ein Raum (SPEZIFIKATION_STAPEL 7.4).

         Zwei Geschosse müssen dafür nicht gefragt werden, weil die Antwort
         der Regelfall ist: ein Keller ist häufig nur unter einem Teil des
         Hauses ausgeführt, und ein Dachgeschoss steht unter der Schräge und
         ist damit fast immer kleiner als das Vollgeschoss darunter. Beides
         wird als Annahme angesetzt und als Annahme benannt. Sie ist zudem
         die vorsichtige Richtung: sie erklärt eine ZU KLEINE Fläche in einem
         Geschoss, das ohnehin an das Erdreich oder an das Dach grenzt.
         Bei einem Vollgeschoss zwischen anderen bleibt die Frage stehen —
         dort ist der fehlende Raum die wahrscheinlichere Erklärung. */
      if (groesstes && groesstes.name !== g.name && groesstes.A - g.A > 0
          && kleinster !== null && groesstes.A - g.A > kleinster) {
        const rg = Z ? Z.geschossAusText(g.name) : null;
        const regel = rg && rg.rang < 0
          ? { was: "Keller", warum: "ein Keller ist häufig nur unter einem Teil des "
              + "Hauses ausgeführt" }
          : (rg && rg.rang >= 9
            ? { was: "Dachgeschoss", warum: "ein Dachgeschoss steht unter der "
                + "Dachschräge und ist damit kleiner als das Vollgeschoss darunter" }
            : null);
        raus.push(zeile({
          id: "flaeche_" + g.name, titel: "Flächensumme " + g.name,
          /* Mit Regel ist es eine benannte ANNAHME des Werkzeugs, die sich
             aus diesen Unterlagen nicht bestätigen lässt — eine Grenze.
             Ohne Regel ist der Rücksprung unerklärt und damit ein echter,
             projektbezogener Befund; er bleibt in der Liste. */
          art: regel ? "grenze" : "befund",
          abhilfe: regel
            ? ("Die Kontur von " + g.name + " eintragen oder umfahren; dann wird "
               + "aus der Annahme eine Rechnung.")
            : null,
          ist: g.A, soll: groesstes.A, einheit: "m²",
          quelle_soll: "größtes Geschoss " + groesstes.name,
          stufe: regel ? "hinweis" : "offen",
          text: g.name + " hat " + de(g.A, 2) + " m², das größte Geschoss ("
            + groesstes.name + ") hat " + de(groesstes.A, 2) + " m². Die Differenz von "
            + de(groesstes.A - g.A, 2) + " m² ist größer als der kleinste Raum dieses "
            + "Geschosses (" + de(kleinster, 2) + " m²). "
            + (regel
              ? "ANNAHME des Werkzeugs: der Rücksprung ist baulich, denn " + regel.warum
                + ". Ein " + regel.was + " kleiner als das Vollgeschoss ist der "
                + "Regelfall und keine Auffälligkeit. Trifft das hier nicht zu, ist "
                + "die Kontur einzutragen oder ein Raum nachzutragen."
              : "Ist der Rücksprung baulich — Drempel, Dachschräge, Luftraum — oder "
                + "fehlt ein Raum?"),
          aktionen: [
            { aktion: "kbBaulich", text: "baulich erklärt", data: { g: g.name } },
          ],
          frage: { pfad: "zaehler.kontur_" + g.name,
                   label: "Außenkontur dieses Geschosses", einheit: "m²" },
        }));
        return;
      }
      /* Keine Kontur, kein Rücksprung. Eine Kontur aus den erfassten Räumen
         zu bilden hilft hier nicht: die Räume sind das, was geprüft wird,
         und eine aus ihnen gebildete Hüllfläche bestätigt sich selbst. Auch
         der Umweg über einen angenommenen Innenwandanteil scheidet aus, er
         wäre eine erfundene Zahl (siehe Kopf dieses Zählers).

         Was bleibt, ist die ehrliche Einordnung: Wird die Frage nach den
         Räumen dieses Geschosses bereits beantwortet — durch die Auslese,
         eine Sichtung oder eine eigene Zählung — dann ist die fehlende
         Kontur keine Lücke mehr, sondern nur der Verzicht auf einen zweiten
         Weg zum selben Befund. Steht die Raumzahl dagegen ebenfalls offen,
         ist das Geschoss gegen gar nichts geprüft, und die Frage bleibt. */
      const geklaert = raumzahlGeklaert(g.name);
      raus.push(zeile({
        id: "flaeche_" + g.name, titel: "Flächensumme " + g.name,
        /* GRENZE, in beiden Fällen. Ohne Kontur gibt es nichts zu
           entscheiden und nichts abzuhaken: die Zeile stand auf jedem
           Projekt gleichlautend da und war nie zu schließen. Sie gehört in
           den Bericht, damit der Leser weiß, wogegen nicht geprüft wurde.
           Der Weg dorthin steht in `abhilfe`. */
        art: "grenze",
        abhilfe: "Die Außenmaße des Gebäudes (Breite mal Tiefe) in den "
          + "Objektangaben eintragen, die Kontur im Plan umfahren, oder eine "
          + "zweite Lesung des Blattes laufen lassen; sie liest die "
          + "Außenbemaßung ab.",
        ist: g.A, soll: null, einheit: "m²", stufe: geklaert ? "hinweis" : "offen",
        text: "Die Raumflächen von " + g.name + " summieren sich auf " + de(g.A, 2)
          + " m². Eine Gebäudekontur zum Gegenrechnen liegt nicht vor. Aus den "
          + "erfassten Räumen lässt sich keine bilden: sie sind der Prüfgegenstand, "
          + "eine aus ihnen gebildete Fläche würde sich selbst bestätigen. "
          + (geklaert
            ? "Für " + g.name + " ist ein Plan gelesen worden, das Geschoss ist also "
              + "nicht geschätzt, und die Zeile „Räume in " + g.name + "“ zeigt, dass "
              + "dabei kein Raum verloren ging. Ungeprüft bleibt der eine Fall, den "
              + "auch jene Zeile nicht abdeckt: ein Raum, den die Auslese ganz "
              + "übersehen hat."
            : "Damit ist die Summe gegen nichts geprüft, und die Raumzahl dieses "
              + "Geschosses steht ebenfalls offen."),
        frage: { pfad: "zaehler.kontur_" + g.name,
                 label: "Außenkontur dieses Geschosses", einheit: "m²" },
      }));
    });
    return raus;
  }

  /** Die Fenster, die die ZWEITE Lesung auf den Grundrissen gezählt hat.
   *
   *  Gezählt wird nur über Grundrisse, und das ist der ganze Trick: jeder
   *  Grundriss zeigt ein anderes Geschoss, ihre Fenster überschneiden sich
   *  nicht, also darf man sie addieren. Ein Schnitt und eine Ansicht zeigen
   *  DIESELBEN Fenster noch einmal von der Seite; sie mitzuzählen ergäbe die
   *  doppelte Zahl und damit einen Fehlalarm auf jedem Projekt mit Schnitt.
   *  Die Ansicht bleibt deshalb den eigenen Zeilen je Fassade vorbehalten,
   *  wo sie hingehört. */
  function fensterAusGegenprobe(p) {
    const Z = zuordnung();
    /* Gezählt wird je GESCHOSS, und jedes Geschoss zählt einmal. Trägt ein
       Bogen drei Grundrisse, sind das drei Beiträge von einem Blatt; liegt
       dasselbe Geschoss auf zwei Blättern, gilt die größere Zahl. */
    const je = {};
    const blaetter = [];
    ((p.plan && p.plan.seiten) || []).forEach(function (s, i) {
      if (s.verwenden === false || !s.uebernommen) return;
      const name = s.bezeichnung || s.name || ("Blatt " + (i + 1));
      let beitrag = false;
      (s.gegenprobeEbenen || []).forEach(function (e) {
        const d = Z && Z.geschossAusText ? Z.geschossAusText(e.ebene) : null;
        const k = (d && d.kuerzel) || e.ebene;
        const n = zahl(e.fenster, 0);
        if (!(n >= 0)) return;
        if (je[k] === undefined || je[k] < n) je[k] = n;
        beitrag = true;
      });
      if (beitrag && blaetter.indexOf(name) < 0) blaetter.push(name);
    });
    const schluessel = Object.keys(je);
    if (!schluessel.length) return null;
    const n = schluessel.reduce(function (m, k) { return m + je[k]; }, 0);
    return { n: n, blaetter: blaetter,
             quelle: "zweite, unabhängige Lesung von " + blaetter.join(", ")
               + ": " + n + " Fenstersymbole in "
               + mz(schluessel.length, "Grundriss", "Grundrissen") };
  }

  /* --- Z3  Fenster je Fassade ----------------------------------------- */
  function zaehlerFenster(p) {
    const raus = [];
    const typ = {};
    (p.bauteiltypen || []).forEach(function (t) { typ[t.id] = t; });

    const ist = { nord: 0, ost: 0, sued: 0, west: 0 };
    let ohneRichtung = 0, gesamt = 0;
    (p.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (b) {
        const t = typ[b.typ_id];
        if (!istFenster(b.name || (t && t.name))) return;
        /* Gezählt werden FENSTER, nicht Zeilen. Eine Zeile, die aus der
           Planauslese entsteht, fasst alle Fenster eines Raums zusammen und
           trägt ihre Zahl in b.anzahl. Ohne diese Unterscheidung stand bei
           fünf gelesenen Fenstern in drei Räumen rot „als Bauteil angelegt
           sind 3, es fehlen 2" — obwohl keines fehlte. Eine von Hand
           angelegte Zeile ohne Angabe zählt weiterhin als ein Fenster. */
        const n = Math.max(1, Math.round(zahl(b.anzahl, 1)));
        gesamt += n;
        const ri = richtung(b.lage);
        if (ri) ist[ri] += n; else ohneRichtung += n;
      });
    });

    /* Sollzahlen aus der Ansicht. Das Feld p.ansichten[] wird von der
       Ansichtsauslese gefüllt (SPEZIFIKATION_SICHTUNG 3: „Fensteranzahl als
       Gegenprobe zum Grundriss") und kann hier von Hand ergänzt werden. */
    const ansichten = (p.ansichten || (p.plan && p.plan.ansichten) || []);
    /* WANN DER ABGLEICH FASSADE FÜR FASSADE ÜBERHAUPT GEHT.
     *
     * Er vergleicht zwei Zahlen je Fassade. Die eine kommt aus der Ansicht,
     * die andere aus dem Raumbuch — und die zweite gibt es nur, wenn die
     * Fenster des Raumbuchs ihre Fassade tragen. Tun sie es nicht, steht auf
     * jeder Fassade eine Null, und die Zeile meldet leuchtend rot alle
     * Fenster dieser Ansicht als fehlend, obwohl sie sämtlich im Raumbuch
     * stehen — nur ohne Himmelsrichtung. Dasselbe bei einer halb
     * zugeordneten Hülle: was noch keine Fassade hat, fehlt scheinbar.
     *
     * Der Abgleich läuft deshalb nur bei VOLLSTÄNDIGER Zuordnung. Was sonst
     * möglich ist, geht nicht verloren: die Ansicht wird gegen die
     * Gesamtzahl gehalten (unten, „Ansichten gegen die Gesamtzahl"), und
     * dass die Verteilung ungeprüft bleibt, steht als Grenze im Bericht.
     * Die Prüfung wird damit nicht entschärft — sie wird von einer Zahl
     * befreit, die keine Aussage über das Gebäude trägt. */
    const zuordnungVollstaendig = gesamt > 0 && ohneRichtung === 0;
    /* KEINE BEHAUPTUNG ÜBER EINE FASSADE, DIE DIE LESUNG NICHT BENANNT HAT.
     *
     * Gemessen am 24.08.2026 an „BV 2-0887 Ziolkowski": hier stand „Fassade
     * West: 8" — auf dem Blatt gibt es nur die Ansichten Nord, Ost und Süd.
     * Die Bezeichnung kam aus der zweiten Lesung, ohne dass eine Beschriftung
     * auf dem Blatt sie stützt. Seitdem trägt jede Ansicht fassade_belegt
     * (KERN_GEGENPROBE.fassadeBelegt: die Himmelsrichtung muss im Wortlaut
     * der Blattbeschriftung stehen). Nur BELEGTE Bezeichnungen gehen in den
     * Abgleich je Fassade; eine unbelegte Ansicht behält ihre Fensterzahl
     * und zählt gegen die Gesamtzahl — als „Ansicht ohne belegte
     * Bezeichnung", nicht als „Fassade West". Ein von Hand gezählter Wert
     * (kbZaehler fenster_<richtung>) bleibt davon unberührt. */
    const belegt = function (a) { return a.fassade_belegt === true; };
    const unbelegte = ansichten.filter(function (a) {
      return !belegt(a) && zahl(a.fenster, 0) > 0;
    });
    const ansichtenOhneZuordnung = [];
    let gefragt = 0;
    RICHTUNGEN.forEach(function (r) {
      const ans = ansichten.find((a) => belegt(a) && richtung(a.fassade) === r.id);
      const eig = zahl(kbZaehler(p, "fenster_" + r.id), null);
      const soll = eig > 0 ? eig : (ans ? zahl(ans.fenster, null) : null);
      if (soll === null) return;
      if (!zuordnungVollstaendig) {
        ansichtenOhneZuordnung.push({ label: "Fassade " + r.text, soll: soll,
          blatt: (ans && ans.blatt) || null, eigen: eig > 0 });
        return;
      }
      gefragt++;
      const q = eig > 0 ? "im Kontrollblatt gezählt"
        : ("Ansicht " + (ans.blatt || r.text) + ", " + soll + " Fenster");
      if (ist[r.id] < soll) {
        raus.push(zeile({
          id: "fenster_" + r.id, titel: "Fenster Fassade " + r.text, art: "befund",
          ist: ist[r.id], soll: soll, einheit: "Fenster", quelle_soll: q, stufe: "fehler",
          text: "Auf der Fassade " + r.text + " zeigt die Ansicht " + soll
            + " Fenster, im Raumbuch " + (ist[r.id] === 1 ? "steht 1" : "stehen "
            + ist[r.id]) + ". Es "
            + (soll - ist[r.id] === 1 ? "fehlt eines" : "fehlen " + (soll - ist[r.id]))
            + ". Ein übersehenes Fenster senkt die Heizlast um "
            + "seine Fläche mal der Differenz der U-Werte von Fenster und Wand.",
        }));
      } else if (ist[r.id] > soll) {
        raus.push(zeile({
          id: "fenster_" + r.id, titel: "Fenster Fassade " + r.text, art: "befund",
          ist: ist[r.id], soll: soll, einheit: "Fenster", quelle_soll: q, stufe: "warnung",
          text: "Auf der Fassade " + r.text
            + (ist[r.id] === 1 ? " steht 1 Fenster" : " stehen " + ist[r.id] + " Fenster")
            + " im Raumbuch, die Ansicht zeigt " + soll + ". Zu prüfen ist, ob ein Fenster "
            + "der falschen Fassade zugeordnet wurde.",
          /* Ein Fenster ZU VIEL auf einer Fassade ist meist eines, das auf
             einer anderen fehlt — die Gesamtzahl bleibt gleich, die Heizlast
             ändert sich kaum, und die Zuordnung steht im Raumbuch. Die
             Gegenrichtung, ein Fenster zu wenig, sperrt weiterhin. */
          aufhebbar: true,
        }));
      } else {
        raus.push(zeile({
          id: "fenster_" + r.id, titel: "Fenster Fassade " + r.text, art: "pruefung",
          ist: ist[r.id], soll: soll, einheit: "Fenster", quelle_soll: q, stufe: "gut",
          text: "Fassade " + r.text + ": " + soll + " Fenster in der Ansicht und im "
            + "Raumbuch.",
        }));
      }
    });

    /* WAS BEI UNZUGEORDNETEN FENSTERN TROTZDEM PRÜFBAR IST.
     *
     * Eine Ansicht zeigt eine Fassade. Auf einer Fassade können nie mehr
     * Fenster stehen als im ganzen Gebäude, und liegen Ansichten mehrerer
     * Fassaden vor, gilt dasselbe für ihre Summe. Zeigen sie zusammen mehr,
     * als das Raumbuch führt, ist mindestens eines nicht angelegt — und das
     * ist ein echter Befund, unabhängig von jeder Himmelsrichtung.
     * Das ist die schärfste Aussage, die ohne Zuordnung zu halten ist. */
    /* Unbelegte Ansichten zählen IMMER in die Summenprobe — auch bei
       vollständiger Zuordnung, denn am Abgleich je Fassade dürfen sie nicht
       teilnehmen. Ihre Fensterzahl ist eine Lesung der Zeichnung; nur die
       Fassadenbezeichnung ist es nicht. */
    const summenposten = ansichtenOhneZuordnung.concat(
      unbelegte.map(function (a) {
        return { label: "eine Ansicht (Fassadenbezeichnung unbelegt, Lesung „"
            + String(a.fassade) + "“)", soll: zahl(a.fenster, 0),
          blatt: a.blatt || null, eigen: false };
      }));
    if (summenposten.length) {
      const summe = summenposten.reduce(function (m, x) {
        return m + x.soll; }, 0);
      const wo = summenposten.map(function (x) {
        return x.label + ": " + x.soll; }).join(", ");
      const q = "Ansichten, Fenster je Fassade (" + wo + ")";
      if (summe > gesamt) {
        raus.push(zeile({
          id: "fenster_ansichtsumme", titel: "Ansichten gegen die Gesamtzahl",
          art: "befund", ist: gesamt, soll: summe, einheit: "Fenster",
          quelle_soll: q, stufe: folgeStufe(p),
          text: "Die ausgewerteten Ansichten zeigen zusammen " + summe
            + " Fenster (" + wo + "), im Raumbuch sind " + gesamt + " als Bauteil "
            + "angelegt. Eine Fassade kann nie mehr Fenster tragen als das ganze "
            + "Gebäude; es " + (summe - gesamt === 1 ? "fehlt eines" : "fehlen "
            + (summe - gesamt)) + ". Ein übersehenes Fenster senkt die Heizlast um "
            + "seine Fläche mal der Differenz der U-Werte von Fenster und Wand."
            + folgeVermerk(p),
        }));
      } else {
        /* KEIN GRÜNER HAKEN AUF EINER UNTEREN SCHRANKE.
         *
         * Diese Zeile stand als bestandene Gegenprobe da und zählte im Kopf
         * unter „Gegenproben bestanden" mit. Sie vergleicht aber die Summe
         * der AUSGEWERTETEN Ansichten mit der Gesamtzahl des Gebäudes. Liegt
         * nur eine Ansicht vor — der Regelfall —, heißt das: die größte
         * Einzelfassade gegen das ganze Haus. Gemessen am 23.08.2026 an
         * „BV 2-0887 Ziolkowski": neun Fenster im Raumbuch, vier auf der
         * einen ausgewerteten Ansicht. Fünf Fenster ließen sich löschen,
         * ohne dass die Zeile ihre Farbe wechselte.
         *
         * Sie kann eine Fensterzahl WIDERLEGEN, aber nicht bestätigen. Der
         * widerlegende Fall bleibt oben als Befund stehen; dieser hier ist
         * eine Grenze und gehört in den Bericht, nicht als bestandene Probe
         * in den Kopf. Was in dieser Lage wirklich prüft, ist die Zeile
         * „Aufenthaltsräume ohne Fenster": sie sieht jeden Raum einzeln an. */
        /* Nur eine BELEGTE Ansicht deckt ihre Fassade ab — eine unbelegte
           Bezeichnung darf hier nicht so tun, als läge die Ansicht vor. */
        const fehlend = RICHTUNGEN.filter(function (r) {
          return !ansichten.some(function (a) {
            return a.fassade_belegt === true && richtung(a.fassade) === r.id; });
        }).map(function (r) { return r.text; });
        raus.push(zeile({
          id: "fenster_ansichtsumme", titel: "Fensterzahl: nicht gegengezählt",
          art: "grenze", ist: gesamt, soll: summe, einheit: "Fenster",
          quelle_soll: q, stufe: "hinweis",
          text: "Die ausgewerteten Ansichten zeigen zusammen " + summe
            + " Fenster (" + wo + "). Im Raumbuch sind " + gesamt + " angelegt, also "
            + (summe === gesamt ? "genauso viele" : "mindestens ebenso viele")
            + "; mehr als das ganze Gebäude kann eine Fassade nicht tragen. Das ist "
            + "eine untere Schranke und keine Gegenprobe: sie kann die Zahl "
            + "widerlegen, nicht bestätigen."
            + (fehlend.length
              ? " Für " + (fehlend.length === 1 ? "die Fassade " : "die Fassaden ")
                + fehlend.join(", ") + " liegt keine Ansicht vor; wie viele "
                + "Fenster dort stehen, ist ungeprüft."
              : "")
            + " Auch die Zuordnung auf die Fassaden fehlt; auf die Heizlast "
            + "wirkt sich das nicht aus.",
          abhilfe: "Die fehlenden Ansichten auswerten lassen — sie zählen die "
            + "Öffnungen von außen und je Fassade getrennt — oder die Fenster je "
            + "Fassade am Plan abzählen und hier eintragen.",
        }));
      }
    }

    if (!gefragt) {
      /* Ohne Ansicht ist die Zahl nicht gegen NICHTS geprüft. Der Grundriss
         ist beim Auslesen zweimal gelesen worden: einmal je Raum als Zahl
         (raum.fenster) und einmal beim Anlegen der Bauteile. Gehen die beiden
         auseinander, ist ein gelesenes Fenster nicht zum Bauteil geworden —
         und genau das senkt die Heizlast, ohne eine Zeile zu erzeugen.
         Die Ansicht bleibt die bessere Unterlage, weil sie unabhängig vom
         Grundriss zählt; sie wird deshalb weiterhin angeboten. */
      /* DER NENNER DIESER PROBE — und warum er vorher zu klein war.
       *
       * Verglichen wird, was die Lesung an Fenstern gezählt hat, mit dem, was
       * als Bauteil angelegt ist. Gezählt wurde bisher `gelesen` nur über die
       * Räume MIT Fensterangabe, `gesamt` dagegen über ALLE Räume — auch über
       * die, in denen das Werkzeug die Fensterfläche nach Musterbauordnung
       * § 47 Abs. 2 selbst angesetzt hat. Zwei verschiedene Mengen auf zwei
       * Seiten desselben Gleichheitszeichens: ein angenommenes Fenster konnte
       * ein verlorenes ausgleichen, und die Zeile meldete „vollständig
       * übernommen". Verglichen wird deshalb nur noch innerhalb derselben
       * Menge, und wie viele Räume sie NICHT enthält, steht im Text.
       * `gesamt` bleibt daneben stehen, weil die Grenzen darunter die Zahl
       * des ganzen Gebäudes brauchen. */
      let gelesen = 0, mitAngabe = 0, angelegtMitAngabe = 0;
      const ohneAngabe = [];
      (p.raeume || []).forEach(function (r) {
        const n = zahl(r.fenster, null);
        if (n === null) { ohneAngabe.push(r); return; }
        mitAngabe++;
        gelesen += n;
        (r.bauteile || []).forEach(function (b) {
          const t = typ[b.typ_id];
          if (!istFenster(b.name || (t && t.name))) return;
          angelegtMitAngabe += Math.max(1, Math.round(zahl(b.anzahl, 1)));
        });
      });

      /* Die ZWEITE LESUNG zaehlt die Fenstersymbole desselben Grundrisses
         noch einmal, ohne das Ergebnis der ersten zu kennen. Damit liegt
         zum ersten Mal eine vom Raumbuch unabhaengige Fensterzahl vor, auch
         ohne Ansicht -- und Ansichten liegen in der Praxis fast nie bei.
         Die Zeile ersetzt den bisherigen Befund "gegen nichts geprueft":
         nicht, weil die Frage weggeschoben wurde, sondern weil sie
         beantwortet ist. */
      const gp = fensterAusGegenprobe(p);
      if (gp) {
        /* WAS DIE ZWEITE LESUNG UEBER FENSTER SAGEN KANN: NICHTS.
         *
         * Hier stand ein Abgleich mit vier Stufen: gleiche Zahl gruen,
         * Unterschied von eins als begruendete Grenze, groesserer Unterschied
         * rot. Die Begruendung der Toleranz war richtig, ihre Voraussetzung
         * nicht -- sie setzte voraus, dass die zweite Lesung Fenster
         * ueberhaupt reproduzierbar zaehlt.
         *
         * GEMESSEN am 22.08.2026, neun Lesungen desselben Blattes
         * "BV 2-0887 Ziolkowski" gegen den laufenden Endpunkt, jedes Mal
         * dasselbe Bild: das Erdgeschoss kam mit 4, 6, 8, 6, 5 und 8 Fenstern
         * zurueck, das Obergeschoss mit 3, 4, 6, 4, 6 und 6. Auf dem Plan sind
         * es im Erdgeschoss fuenf. In vier von sechs Laeufen haette diese
         * Zeile an einem einwandfreien Gebaeude rot geleuchtet.
         *
         * Die Raumnamen desselben Blattes waren in allen neun Lesungen
         * wortgleich. Der Unterschied liegt nicht am Zufall, sondern daran,
         * dass hinter einem Raum eine BESCHRIFTUNG steht und hinter einem
         * Fenster nur eine Zahl. Eine Zahl, die sich am Plan nicht
         * wiederfinden laesst, kann weder belegen noch widerlegen.
         *
         * Die Zeile bleibt stehen, aber als GRENZE und nicht als Probe: sie
         * nennt beide Zahlen, sagt, dass daraus kein Urteil folgt, und nennt
         * die zwei Wege, die eines erlauben. Sie zaehlt damit nicht mehr als
         * bestandene Gegenprobe -- und genau das war die Luege. */
        raus.push(zeile({
          id: "fenster_gesamt", titel: "Fenster: nicht gegengezählt",
          art: "grenze",
          ist: gesamt, soll: null, einheit: "Fenster", stufe: "hinweis",
          text: "Angelegt sind " + gesamt + " Fenster; die zweite Lesung derselben "
            + "Grundrisse zählt " + gp.n + " Fenstersymbole (" + gp.quelle + "). "
            + "Daraus folgt bewusst kein Urteil: an neun Lesungen desselben Blattes "
            + "gemessen schwankte diese Zahl für ein einziges Geschoss zwischen vier "
            + "und acht, während die Raumnamen jedes Mal dieselben waren. Ein "
            + "Fenstersymbol trägt keine Beschriftung, an der es sich am Plan "
            + "wiederfinden ließe. Die Fensterzahl dieses Gebäudes ist damit nicht "
            + "gegengezählt. Jedes fehlende Fenster senkt die Heizlast um seine "
            + "Fläche mal der Differenz der U-Werte von Fenster und Wand.",
          abhilfe: "Eine Ansicht auswerten lassen — sie zeigt dieselben Öffnungen von "
            + "außen und je Fassade getrennt — oder die Fenster je Fassade am Plan "
            + "abzählen und hier eintragen.",
          frage: { pfad: "zaehler.fenster_nord", label: "Fenster auf der Nordfassade",
                   einheit: "Fenster" },
        }));
        /* Der Weg vom Grundriss ins Raumbuch bleibt zusaetzlich geprueft. Das
           ist eine ANDERE Frage als die oben: dort geht es darum, ob richtig
           gezaehlt wurde, hier darum, ob eine gezaehlte Oeffnung auch zum
           Bauteil geworden ist. Ein gelesenes, aber nicht angelegtes Fenster
           faellt sonst durch beide Netze. */
        if (mitAngabe > 0 && angelegtMitAngabe < gelesen) {
          raus.push(zeile({
            id: "fenster_uebernahme", titel: "Fenster auf dem Weg ins Raumbuch",
            art: "befund",
            ist: angelegtMitAngabe, soll: gelesen, einheit: "Fenster",
            quelle_soll: "Planauslese, Fenster je Raum aus "
              + mz(mitAngabe, "Raum", "Räumen"),
            stufe: folgeStufe(p),
            text: "Die Planauslese hat für " + mz(mitAngabe, "Raum", "Räume")
              + " zusammen " + gelesen + " Fenster gelesen; als Bauteil angelegt sind "
              + "in denselben Räumen " + angelegtMitAngabe + ". Es fehlen "
              + (gelesen - angelegtMitAngabe) + " auf dem Weg ins "
              + "Raumbuch — nicht beim Ablesen, sondern beim Übernehmen."
              + folgeVermerk(p),
          }));
        }
      } else if (mitAngabe > 0 && angelegtMitAngabe < gelesen) {
        raus.push(zeile({
          id: "fenster_gesamt", titel: "Fenster gegen den Grundriss",
          art: "befund",
          ist: angelegtMitAngabe, soll: gelesen, einheit: "Fenster",
          quelle_soll: "Planauslese, Fenster je Raum aus " + mz(mitAngabe, "Raum", "Räumen"),
          stufe: "fehler",
          text: "Die Planauslese hat für " + mz(mitAngabe, "Raum", "Räume")
            + " die Fenster gezählt, "
            + "zusammen " + gelesen + "; als Bauteil angelegt sind in denselben "
            + "Räumen " + angelegtMitAngabe
            + ". Es fehlen "
            + (gelesen - angelegtMitAngabe) + ". Ein gelesenes, aber nicht angelegtes Fenster "
            + "senkt die Heizlast um seine Fläche mal der Differenz der U-Werte von "
            + "Fenster und Wand und erzeugt dabei keine Zeile." + folgeVermerk(p),
          frage: { pfad: "zaehler.fenster_nord", label: "Fenster auf der Nordfassade",
                   einheit: "Fenster" },
        }));
      } else if (mitAngabe > 0) {
        /* Zwei Aussagen, zwei Zeilen. Die Übernahme ist geprüft und
           bestanden; dass beide Zahlen aus derselben Lesung stammen, ist
           eine Grenze und keine Aufgabe. Vorher stand das als ein einziger
           Hinweis in der Liste, auf jedem Projekt, und war nie abzuhaken. */
        /* WIE VIELE RÄUME DIESE PROBE ÜBERHAUPT ANSIEHT.
           Sie prüft die Übernahme in den Räumen, für die eine Fensterzahl
           gelesen wurde. Räume ohne gelesene Zahl kann sie nicht prüfen —
           dort steht keine Sollzahl. Bis zum 23.08.2026 stand über beide
           Mengen hinweg „vollständig übernommen"; genau die ungeprüften
           Räume sind aber die, in denen etwas fehlen kann. Sie stehen jetzt
           mit Zahl und Namen im Satz, und solange es sie gibt, ist die Zeile
           ein Hinweis und kein Haken. */
        raus.push(zeile({
          id: "fenster_gesamt",
          titel: ohneAngabe.length
            ? "Fenster: nur für einen Teil der Räume gegengezählt"
            : "Fenster: vollständig ins Raumbuch übernommen",
          art: "pruefung",
          ist: angelegtMitAngabe, soll: gelesen, einheit: "Fenster",
          quelle_soll: "Planauslese, Fenster je Raum aus " + mz(mitAngabe, "Raum", "Räumen"),
          stufe: ohneAngabe.length ? "hinweis" : "gut",
          /* EINE BESTANDENE PRÜFUNG SPERRT NICHT.
             Diese Zeile sagt, dass die Übernahme vollständig war; der
             Hinweis betrifft nur den Teil der Räume, für den die Auslese gar
             keine Fensterzahl geliefert hat. Sie trug trotzdem eine Sperre,
             weil ihr Zahlenpaar auseinanderging — nach oben, also im
             harmlosen Sinn. Der gefährliche Fall steht eine Zeile höher
             (fenster_gesamt als Fehler) und sperrt weiter. */
          aufhebbar: true,
          text: "Die Planauslese hat für " + mz(mitAngabe, "Raum", "Räume")
            + " von " + (p.raeume || []).length + " im Raumbuch die Fenster gezählt, "
            + "zusammen " + gelesen + "; als Bauteil angelegt sind in denselben "
            + "Räumen " + angelegtMitAngabe + ". Auf dem Weg vom Grundriss ins "
            + "Raumbuch ist dort kein Fenster verloren gegangen. "
            + (ohneAngabe.length
              ? "Für " + mz(ohneAngabe.length, "Raum", "Räume") + " gibt es keine "
                + "gelesene Fensterzahl; " + (ohneAngabe.length === 1 ? "er ist"
                  : "sie sind") + " hier nicht geprüft: " + nenne(ohneAngabe) + ". "
                + "Wo das Werkzeug die Fensterfläche selbst angesetzt hat, steht "
                + "das in der Zeile „Fensterflächen angenommen“. "
              : "")
            + "Ob die Lesung alle Öffnungen gesehen hat, "
            + "ist damit nicht geprüft — beide Zahlen stammen aus derselben Lesung. "
            + "Das steht unten als Grenze.",
        }));
        raus.push(zeile({
          id: "fenster_nur_eine_lesung", art: "grenze",
          titel: "Fenster: nur eine Lesung",
          ist: gesamt, soll: null, einheit: "Fenster",
          quelle_soll: "Planauslese, Fenster je Raum aus " + mz(mitAngabe, "Raum", "Räumen"),
          stufe: "hinweis",
          text: "Die Zahl der Fenster stammt aus einer einzigen Lesung desselben "
            + "Grundrisses. Ein dort übersehenes Fenster fehlt in beiden Zahlen und "
            + "fällt nirgends auf. Jedes fehlende Fenster senkt die Heizlast um seine "
            + "Fläche mal der Differenz der U-Werte von Fenster und Wand.",
          abhilfe: "Eine zweite, unabhängige Lesung der Grundrisse laufen lassen, "
            + "eine Ansicht auswerten, oder die Fenster je Fassade abzählen und hier "
            + "eintragen.",
          frage: { pfad: "zaehler.fenster_nord", label: "Fenster auf der Nordfassade",
                   einheit: "Fenster" },
        }));
      } else {
        raus.push(zeile({
          id: "fenster_gesamt", titel: "Fenster gegen die Ansicht", art: "grenze",
          ist: gesamt, soll: null, einheit: "Fenster", stufe: "offen",
          text: "Im Raumbuch " + (gesamt === 1 ? "steht 1 Fenster" : "stehen " + gesamt
            + " Fenster") + ". Weder eine ausgewertete Ansicht noch eine zweite "
            + "Lesung noch eine Fensterzahl aus der Planauslese liegt vor; die Zahl "
            + "ist damit nicht gegengezählt.",
          abhilfe: "Eine Ansicht auswerten — sie zählt Fenster unabhängig vom "
            + "Grundriss —, eine zweite Lesung der Grundrisse laufen lassen, oder die "
            + "Fenster je Fassade abzählen und hier eintragen.",
          frage: { pfad: "zaehler.fenster_nord", label: "Fenster auf der Nordfassade",
                   einheit: "Fenster" },
        }));
      }
    }
    /* DIE HIMMELSRICHTUNG: am Normtext nachgeprüft, nicht übernommen.
     *
     * Frage: ist die Himmelsrichtung eines Fensters für die Heizlast nach
     * DIN EN 12831-1 überhaupt erheblich? Antwort: nein.
     *   - Die Norm-Heizlast rechnet den Auslegungsfall OHNE Wärmegewinne.
     *     Der nationale Anhang stellt ausdrücklich fest, dass Gewinne aus
     *     Personen, Maschinen und Sonneneinstrahlung nicht anzusetzen sind.
     *     Damit gibt es in der ganzen Rechnung keine nach Himmelsrichtung
     *     unterschiedene Größe.
     *   - Das Einzige, was von der Lage eingeht, ist die ZAHL der
     *     exponierten Fassaden über den Abschirmkoeffizienten e
     *     (DIN/TS 12831-1:2020-04; kern_heizlast_norm.js, eFaktor:
     *     0,00 / 0,02 / 0,03). Eine Zahl, keine Richtung.
     * Gegengeprüft am eigenen Rechenkern: rechne() liest ausschließlich
     * raum.n_exponiert bzw. zaehleExponierte(raum); b.lage kommt in keiner
     * Formel vor.
     *
     * Folge für dieses Blatt: eine fehlende Himmelsrichtung kann keine Zahl
     * dieses Berichts falsch machen. Sie kostet genau eines — den Abgleich
     * Fassade für Fassade gegen eine Ansicht. Liegt eine Ansicht vor, ist das
     * eine GRENZE und steht im Bericht. Liegt keine vor, ist gar nichts
     * verloren, und dann entsteht auch keine Zeile.
     *
     * Das ist keine entschärfte Prüfung: es war nie eine. Die Zeile hat auf
     * keinem Projekt je einen Missstand gefunden, weil es keinen gibt, den
     * sie finden könnte. Was sie fand, war die Abwesenheit einer Unterlage. */
    if (ohneRichtung > 0 && ansichten.length > 0) {
      raus.push(zeile({
        id: "fenster_ohne_lage", titel: "Fenster ohne Himmelsrichtung",
        art: "grenze",
        ist: ohneRichtung, soll: null, einheit: "Fenster", stufe: "hinweis",
        text: ohneRichtung + " von " + gesamt + " Fenstern tragen keine "
          + "Himmelsrichtung. Für die Heizlast ist das ohne Belang: "
          + "DIN EN 12831-1 rechnet den Auslegungsfall ohne solare Gewinne und "
          + "kennt keinen nach Himmelsrichtung unterschiedenen Wert; von der Lage "
          + "geht allein die Zahl der exponierten Fassaden über den "
          + "Abschirmkoeffizienten e ein. Was fehlt, ist der Abgleich Fassade für "
          + "Fassade gegen die vorliegende Ansicht. Die Gesamtzahl der Fenster "
          + "bleibt prüfbar, die Verteilung auf die Fassaden nicht.",
        abhilfe: "Den Fenstern ihre Fassade zuordnen, dann läuft der Abgleich "
          + "gegen die Ansicht Fassade für Fassade.",
      }));
    }
    return raus;
  }

  /* =====================================================================
   * DIE BLATTANGABE ZUR GESCHOSSZAHL LESEN
   * =====================================================================
   * Hier stand ein Einzeiler: nach Komma, Semikolon, Schrägstrich und „und"
   * trennen und die Stücke zählen. Auf einer sauberen Angabe („KG, EG, OG,
   * DG") stimmt das. Auf einer echten nicht.
   *
   * GEMESSEN an einer echten Auslese: „nicht sicher ablesbar, vermutlich
   * EG + OG + zurückgesetztes Dachgeschoss/Staffelgeschoss". Der Einzeiler
   * machte daraus DREI Ebenen — und zwar aus „nicht sicher ablesbar",
   * „vermutlich EG + OG + zurückgesetztes Dachgeschoss" und
   * „Staffelgeschoss". Zwei Fehler, die sich zufällig zur richtigen Zahl
   * addierten: der Vorbehalt wurde als Geschoss gezählt, das Pluszeichen
   * nicht als Trenner erkannt, und dieselbe oberste Ebene stand unter zwei
   * Namen. Bei „EG + OG + Staffelgeschoss" hätte derselbe Einzeiler EINE
   * Ebene gezählt und ein fehlendes Geschoss durchgelassen.
   *
   * Gezählt wird deshalb, was sich als Geschoss DEUTEN lässt, und jedes nur
   * einmal. Was kein Geschoss benennt, zählt nicht. Eine Angabe der Form
   * „3 Vollgeschosse" ist eine Zahl und keine Aufzählung und wird als Zahl
   * gelesen.
   * ================================================================== */
  const GESCHOSSWORT = /geschoss|etage|ebene|keller|souterrain|parterre|boden\b/i;
  function geschosseAusBlattangabe(text, Z) {
    const t = String(text || "").trim();
    if (!t) return { n: 0, ebenen: [] };
    const bloss = t.match(/^(\d{1,2})$/);
    if (bloss) return { n: Number(bloss[1]), ebenen: [] };
    const teile = t.split(/[,;/+&]|\bund\b/).map(function (x) {
      return x.replace(/[()]/g, " ").trim();
    }).filter(Boolean);
    const gesehen = {};
    const ebenen = [];
    let ausZahl = 0;
    teile.forEach(function (frag) {
      /* „3 Vollgeschosse" nennt eine Anzahl, keinen Namen. */
      const za = frag.match(/^(\d{1,2})\s*(voll)?(geschoss|etage|ebene)/i);
      if (za) { ausZahl = Math.max(ausZahl, Number(za[1])); return; }
      const d = (Z && Z.geschossAusText) ? Z.geschossAusText(frag) : null;
      if (!d && !GESCHOSSWORT.test(frag)) return;
      const k = d && d.kuerzel ? d.kuerzel
        : frag.toLowerCase().replace(/\s+/g, " ");
      if (gesehen[k]) return;
      gesehen[k] = true;
      ebenen.push({ kuerzel: d && d.kuerzel ? d.kuerzel : frag, wortlaut: frag });
    });
    return { n: Math.max(ebenen.length, ausZahl), ebenen: ebenen };
  }

  /* =====================================================================
   * DAS VERMUTETE GESCHOSS — WEDER ERFINDEN NOCH SPERREN
   * =====================================================================
   * Das Blatt sagt „vermutlich EG + OG + zurückgesetztes Dachgeschoss". Das
   * ist eine LESUNG und keine Lücke: die Unterlagen behaupten die Ebene, nur
   * ein Grundriss dazu fehlt. Bis zum 24.08.2026 hielt das Werkzeug daraufhin
   * die ganze Rechnung an, „nur mit schriftlicher Begründung zu bestätigen".
   *
   * DIE ENTSCHEIDUNG, UND WARUM SO.
   * Ein erfundenes Geschoss mit erfundener Fläche wäre eine Zahl aus dem
   * Nichts. Ein weggelassenes Geschoss ergibt eine zu kleine Heizlast, und
   * die fällt am Ergebnis nicht auf — der teurere der beiden Fehler, weil er
   * unsichtbar ist. Beides ist hier vermeidbar, denn die Fläche muss gar
   * nicht geraten werden:
   *
   *   1. Hat die zweite Lesung für die Ebene Aussenmasse gelesen (Schnitt,
   *      Ansicht), ist die Fläche GEMESSEN: Breite mal Tiefe.
   *   2. Sonst wird die Fläche des VOLLGESCHOSSES DARUNTER angesetzt, und
   *      zwar ausdrücklich als OBERGRENZE. Ein zurückgesetztes Geschoss ist
   *      kleiner als das Vollgeschoss darunter — das ist keine Schätzung,
   *      sondern was „zurückgesetzt" bedeutet. Die Rechnung liegt damit
   *      zwischen „ohne dieses Geschoss" (zu klein) und diesem Wert (zu
   *      gross), und beide Enden stehen im Klartext in der Zeile.
   *   3. Gibt es weder Masse noch ein Geschoss darunter, entsteht KEINE
   *      Annahme. Dann bleibt die Sperre, denn dann gibt es nichts
   *      abzuleiten.
   *
   * Angelegt wird EIN Raum, nicht ein Grundriss. Räume, die niemand gesehen
   * hat, entstehen dabei nicht: es ist eine Fläche mit einem Namen, der sagt,
   * was sie ist. Sie trägt angenommen, steht als Annahme im Bericht, ihre
   * Wirkung wird beziffert, und ein Klick nimmt sie wieder heraus.
   * ================================================================== */

  /** Die Ebenen, die eine unabhängige Lesung benennt, mit Wortlaut und —
   *  soweit gelesen — den Aussenmassen. */
  function benannteEbenenMitMass(p, Z) {
    const GK = gegenprobeKern();
    const raus = [], nach = {};
    const nimm = function (wortlaut, quelle, b, t) {
      const w = String(wortlaut || "").trim();
      if (!w) return;
      const d = (Z && Z.geschossAusText) ? Z.geschossAusText(w) : null;
      const kAnz = (d && d.kuerzel) ? d.kuerzel : schluessel(w);
      if (!kAnz) return;
      /* Gesammelt wird nach Rang: "OG" und "1.OG" sind EINE Ebene. */
      const k = ebenenSchluessel(w, Z);
      if (!nach[k]) {
        nach[k] = { kuerzel: kAnz, wortlaut: w, quelle: quelle,
                    rang: d ? d.rang : null, breite: 0, tiefe: 0 };
        raus.push(nach[k]);
      }
      if (zahl(b, 0) > 0 && zahl(t, 0) > 0 && !(nach[k].breite > 0)) {
        nach[k].breite = zahl(b, 0);
        nach[k].tiefe = zahl(t, 0);
      }
    };
    /* Aus der zweiten Lesung, roh gelesen — ebenenVereinigen() reicht die
       Aussenmasse nicht durch, und genau die sind hier das Wertvolle. */
    if (GK) {
      blaetterMitGegenprobe(p).forEach(function (bl) {
        ((bl.gegenprobe && bl.gegenprobe.ebenen) || []).forEach(function (e) {
          nimm(e && e.bezeichnung, "zweite Lesung von " + (bl.name || "einem Blatt"),
            e && e.aussen_breite_m, e && e.aussen_tiefe_m);
        });
      });
    }
    const gtext = String((p.plangebaeude && p.plangebaeude.geschosse) || "").trim();
    geschosseAusBlattangabe(gtext, Z).ebenen.forEach(function (e) {
      nimm(e.wortlaut, "Blattangabe „" + gtext + "“", 0, 0);
    });
    return raus;
  }

  /** Ebenen, die in den Unterlagen benannt sind, im Raumbuch aber fehlen und
   *  auch durch keine Zone vertreten werden. Je Eintrag steht dabei, woher
   *  die Fläche käme — gemessen oder als Obergrenze aus dem Geschoss
   *  darunter. Ohne beides entsteht kein Eintrag. */
  function fehlendeGeschosse(p, opt) {
    const pr = p || {};
    const ohneSperrliste = !!(opt && opt.auch_entfernte);
    const Z = zuordnung();
    if (!Z || !Z.geschossAusText) return [];
    const gs = geschosse(pr);
    const belegt = {};
    gs.forEach(function (g) { belegt[ebenenSchluessel(g.name, Z)] = true; });
    (pr.zonen || []).forEach(function (z) {
      if (zoneIstEbene(z)) belegt[ebenenSchluessel(z.name || "", Z)] = true;
    });
    const entfernt = (pr.geschosse_entfernt || []).map(function (x) {
      return ebenenSchluessel(x, Z); });
    /* Die Fläche des nächsten erfassten Geschosses UNTER der Ebene. */
    const unterFlaeche = function (rang) {
      let best = null;
      gs.forEach(function (g) {
        const d = Z.geschossAusText(g.name);
        const r = d ? d.rang : null;
        if (r === null || !(g.A > 0)) return;
        if (rang !== null && r >= rang) return;
        if (best === null || r > best.rang) best = { rang: r, A: g.A, name: g.name };
      });
      /* Kein Rang deutbar oder keiner darunter: dann das flächengrößte
         erfasste Geschoss — es ist die Obergrenze für jedes andere. */
      if (best) return best;
      let gr = null;
      gs.forEach(function (g) { if (g.A > 0 && (!gr || g.A > gr.A)) gr = { rang: null, A: g.A, name: g.name }; });
      return gr;
    };
    return benannteEbenenMitMass(pr, Z).filter(function (e) {
      const es = ebenenSchluessel(e.kuerzel, Z);
      if (belegt[es]) return false;
      if (!ohneSperrliste && entfernt.indexOf(es) >= 0) return false;
      /* NUR DEUTBARE EBENEN. GEMESSEN am 24.08.2026 am Bogen "260514 -
         Dumach 1": die zweite Lesung lieferte eine Ebene mit der
         Bezeichnung "ebenen dargestellt" -- ein Textfragment, kein
         Geschoss. geschossAusText fand keinen Rang, als Flaeche kam die
         Obergrenze des Dachgeschosses (91,92 m²), und im Raumbuch stand
         still ein 26. Raum "Angenommenes Geschoss ebenen dargestellt".
         Eine Ebene, deren Name sich NICHT als Geschoss deuten laesst und
         fuer die auch kein Aussenmass gelesen wurde, legt kein Geschoss
         an -- weder selbsttaetig noch als Vorschlag. */
      if ((e.rang === null || e.rang === undefined)
          && !(e.breite > 0 && e.tiefe > 0)) return false;
      /* WAS HIER NICHT HINGEHÖRT: eine Ebene, die nach ihrem Namen ein
         UNBEHEIZTER Bereich ist — Kellergeschoss, Spitzboden, Dachraum. Die
         gehört als Zone geführt und nicht als beheiztes Geschoss angesetzt,
         und Z5 legt sie längst selbst an. Sie hier zusätzlich als beheizte
         Fläche anzusetzen wäre der grobe Fehler in die andere Richtung: ein
         unbeheizter Keller mit 20 °C und voller Wohnfläche. */
      return !artAusName(e.wortlaut);
    }).map(function (e) {
      if (e.breite > 0 && e.tiefe > 0) {
        return { kuerzel: e.kuerzel, wortlaut: e.wortlaut, quelle: e.quelle,
                 A: e.breite * e.tiefe, gemessen: true,
                 grund: "Aussenmass der Ebene aus der zweiten Lesung: "
                   + de(e.breite, 2) + " m mal " + de(e.tiefe, 2) + " m" };
      }
      const u = unterFlaeche(e.rang);
      if (!u) return null;
      return { kuerzel: e.kuerzel, wortlaut: e.wortlaut, quelle: e.quelle,
               A: u.A, gemessen: false, unter: u.name,
               grund: "Obergrenze: die Fläche des Geschosses " + u.name + " ("
                 + de(u.A, 2) + " m²). Ein zurückgesetztes oder ausgebautes "
                 + "Geschoss ist kleiner als das Vollgeschoss darunter, größer "
                 + "kann es nicht sein" };
    }).filter(Boolean);
  }

  /** Das angenommene Geschoss anlegen: EIN Raum mit abgeleiteter Fläche.
   *  Idempotent, DOM-frei, von Hand und selbsttätig aufrufbar. */
  function geschossAnlegen(p, kand, automatisch) {
    if (!p || !kand || !(kand.A > 0)) return null;
    if (!p.raeume) p.raeume = [];
    const k = String(kand.kuerzel || "").trim();
    if (!k) return null;
    const ks = ebenenSchluessel(k);
    if (p.raeume.some(function (r) { return ebenenSchluessel(r.geschoss) === ks; })) {
      return null;
    }
    if (automatisch && (p.geschosse_entfernt || []).some(function (x) {
      return ebenenSchluessel(x) === ks; })) {
      return null;
    }
    if (!automatisch && Array.isArray(p.geschosse_entfernt)) {
      p.geschosse_entfernt = p.geschosse_entfernt.filter(function (x) {
        return ebenenSchluessel(x) !== ks;
      });
    }
    const vorbild = (p.raeume || [])[0] || {};
    const raum = {
      id: "r_kb_geschoss_" + schluessel(k).replace(/[^a-z0-9]+/g, "_"),
      geschoss: k,
      name: "Angenommenes Geschoss " + k,
      art: "wohnen",
      A: Math.round(kand.A * 100) / 100,
      h: null,
      we: ((p.einheiten || [])[0] || {}).name || vorbild.we || "",
      bauteile: [],
      angenommen: true,
      herkunft: {
        quelle: kand.quelle,
        konfidenz: kand.gemessen ? "sicher" : "unsicher",
        flaeche_gelesen: !!kand.gemessen,
        flaeche_quelle: kand.grund,
        geschoss_angenommen: true,
      },
    };
    p.raeume.push(raum);
    p.geschosse_angenommen = p.geschosse_angenommen || [];
    if (!p.geschosse_angenommen.some(function (x) {
      return schluessel(x.kuerzel) === schluessel(k); })) {
      p.geschosse_angenommen.push({
        kuerzel: k, wortlaut: kand.wortlaut, quelle: kand.quelle,
        A: raum.A, gemessen: !!kand.gemessen, grund: kand.grund,
        raum_id: raum.id, automatisch: !!automatisch,
      });
    }
    return raum;
  }

  /** Die Annahme wieder herausnehmen — ein Klick, und sie bleibt draussen. */
  function geschossEntfernen(p, kuerzel) {
    if (!p) return false;
    const k = schluessel(kuerzel);
    if (!k) return false;
    const vorher = (p.raeume || []).length;
    p.raeume = (p.raeume || []).filter(function (r) {
      return !(r.angenommen && schluessel(r.geschoss) === k);
    });
    p.geschosse_angenommen = (p.geschosse_angenommen || []).filter(function (x) {
      return schluessel(x.kuerzel) !== k;
    });
    p.geschosse_entfernt = p.geschosse_entfernt || [];
    if (p.geschosse_entfernt.map(schluessel).indexOf(k) < 0) {
      p.geschosse_entfernt.push(String(kuerzel));
    }
    return (p.raeume || []).length !== vorher;
  }

  /* --- Z4  Geschosszahl und Treppentest -------------------------------- */
  function zaehlerGeschosse(p) {
    const raus = [];
    const gs = geschosse(p);
    const bl = blaetter(p);
    const Z = zuordnung();
    /* NUR EBENEN ZÄHLEN ALS EBENEN.
       Ein Keller und ein Spitzboden sind Geschosse und gehören in diese
       Zählung. Eine Garage, ein Schuppen und ein außen liegendes Treppenhaus
       gehören nicht hinein: sie liegen neben dem Stapel. Seit das Werkzeug
       benannte unbeheizte Bereiche selbst anlegt, ist das nicht mehr bloß
       ungenau, sondern gefährlich — eine selbsttätig angelegte Garagenzone
       hätte sonst ein fehlendes Geschoss rechnerisch ausgeglichen und den
       Befund weggenommen, ohne dass das Geschoss da wäre. */
    const zonenAlleN = (p.zonen || []).length;
    const zonen = (p.zonen || []).filter(zoneIstEbene).length;
    const zonenDaneben = zonenAlleN - zonen;
    const ist = gs.length + zonen;

    const kandidaten = [];
    const eig = zahl(kbZaehler(p, "geschosse"), null);
    if (eig > 0) kandidaten.push({ n: eig, q: "im Kontrollblatt gezählt" });
    bl.forEach(function (b) {
      if (b.ebenen_erkennbar > 0 && (b.art === "schnitt" || b.art === "ansicht")) {
        kandidaten.push({ n: b.ebenen_erkennbar,
                          q: (b.art === "schnitt" ? "Schnitt " : "Ansicht ") + b.name
                             + ": " + b.ebenen_erkennbar + " Ebenen" });
      }
    });
    /* Die zweite Lesung nennt je Blatt, welche Ebenen es zeigt oder benennt.
       Über alle Blätter zusammengezogen ist das die einzige Zählung der
       Geschosse, die nicht aus dem Raumbuch selbst stammt: ein Schnitt, der
       einen Spitzboden benennt, für den kein Grundriss vorliegt, wird damit
       zu einem Befund statt zu einer Frage an den Bearbeiter.

       Gezählt werden nur Ebenen, die auch WOHNRAUM tragen können — die reine
       Nennung reicht. Eine Kellerdecke, die als Linie im Schnitt steht, ohne
       dass der Keller benannt wäre, erzeugt keine Ebene; die zweite Lesung
       trägt nur ein, was sie benannt gesehen hat. */
    const GK = gegenprobeKern();
    if (GK) {
      const eb = GK.ebenenVereinigen(blaetterMitGegenprobe(p),
        Z ? Z.geschossAusText : null);
      if (eb.length > 0) {
        /* „der Blätter: DG, OG, EG, KG" las sich, als hießen die BLÄTTER so.
           Es sind die Ebenen, die die zweite Lesung auf ihnen gefunden hat —
           auf einem A3-Bogen sind das vier auf einem Blatt. */
        kandidaten.push({ n: eb.length,
          q: "zweite, unabhängige Lesung; sie nennt die Ebenen "
             + eb.map(function (x) { return x.kuerzel; }).join(", ") });
      }
    }
    const gtext = String((p.plangebaeude && p.plangebaeude.geschosse) || "").trim();
    const gAngabe = geschosseAusBlattangabe(gtext, Z);
    if (gAngabe.n > 0) {
      kandidaten.push({ n: gAngabe.n, q: "Blattangabe „" + gtext + "“",
                        ebenen: gAngabe.ebenen });
    }
    const best = kandidaten.reduce((m, k) => (m && m.n >= k.n ? m : k), null);

    const gezaehlt = gs.length + (gs.length === 1 ? " beheiztes Geschoss" : " beheizte Geschosse")
      + " und " + zonen + (zonen === 1 ? " unbeheizter Bereich" : " unbeheizte Bereiche")
      + (zonenDaneben
        ? " (dazu " + mz(zonenDaneben, "unbeheizter Bereich", "unbeheizte Bereiche")
          + " neben dem Gebäude, "
          + (zonenDaneben === 1 ? "der keine Ebene ist" : "die keine Ebene sind") + ")"
        : "");
    if (!best) {
      /* Ohne Schnitt ist die Geschossfolge trotzdem prüfbar. Die Bezeichnungen
         KG, EG, OG, DG tragen eine Reihenfolge in sich; KERN_ZUORDNUNG kennt
         sie bereits, weil es damit die Blätter einordnet. Fehlt zwischen dem
         untersten und dem obersten erfassten Vollgeschoss ein Rang, dann fehlt
         ein Geschoss — das ist ein echter Befund und braucht keinen Schnitt.
         Ist die Folge dagegen geschlossen, ist die Frage beantwortet, soweit
         sie aus den Unterlagen beantwortbar ist. Was die Probe nicht kann:
         ein Geschoss finden, das OBEN oder UNTEN fehlt, weil dafür kein
         Blatt existiert. Genau das sagt der Text. */
      const f = Z ? Z.geschossfolge(gs.map(function (x) { return x.name; })) : null;
      const namen = f ? f.folge.map(function (x) { return x.kuerzel; }).join(", ") : "";
      if (f && f.pruefbar && f.luecken.length) {
        raus.push(zeile({
          id: "geschosse", titel: "Zahl der Geschosse", art: "befund",
          ist: ist, soll: ist + f.luecken.length, einheit: "Ebenen",
          quelle_soll: "Folge der Geschossbezeichnungen: " + namen,
          stufe: "fehler",
          text: "In der Folge der erfassten Geschosse (" + namen + ") fehlen "
            + f.luecken.length + " Ebenen dazwischen. Zwischen dem untersten und dem "
            + "obersten erfassten Geschoss kann keine Ebene ausgelassen sein; das "
            + "Gebäude wäre sonst nicht begehbar. Entweder fehlt ein Grundriss oder "
            + "die Ebene ist als unbeheizter Bereich zu führen.",
          aufhebbar: false,
          aktionen: [
            { aktion: "kbZoneAnlegen", text: "als unbeheizten Bereich anlegen",
              data: { name: "Nicht gezeichnetes Geschoss" } },
          ],
        }));
      } else if (f && f.pruefbar) {
        /* Die Folgeprobe ist eine echte Prüfung, und sie ist BESTANDEN:
           zwischen dem untersten und dem obersten erfassten Geschoss fehlt
           keine Ebene. Das ist eine Aussage, kein Zwischenstand.
           Was sie nicht abdeckt — eine Ebene ÜBER oder UNTER der Folge, für
           die kein Blatt vorliegt — kann sie grundsätzlich nicht abdecken.
           Das ist eine Grenze und steht im Bericht. Vorher war beides eine
           Zeile der Stufe „Hinweis", die auf jedem Projekt ohne Schnitt
           dastand und im Kopf als offene Frage zählte. */
        raus.push(zeile({
          id: "geschosse", titel: "Zahl der Geschosse", art: "pruefung",
          /* soll bleibt leer, und das ist Absicht: verglichen wird hier
             nicht Zahl gegen Zahl, sondern die Folge gegen sich selbst auf
             Lücken. Eine Zahl neben dieselbe Zahl zu stellen sähe nach einer
             Gegenrechnung aus, die es an dieser Stelle nicht gibt. */
          ist: ist, soll: null, einheit: "Ebenen",
          quelle_soll: "Folge der Geschossbezeichnungen: " + namen,
          stufe: "gut",
          text: "Erfasst sind " + gezaehlt + ". Die Folge der Bezeichnungen "
            + namen + " ist lückenlos: zwischen dem untersten und dem obersten "
            + "erfassten Geschoss fehlt keine Ebene. Ein Gebäude, in dem eine "
            + "Zwischenebene ausgelassen wäre, wäre nicht begehbar.",
        }));
        raus.push(zeile({
          id: "geschosse_rand", art: "grenze",
          titel: "Ebene über oder unter der Folge",
          ist: ist, soll: null, einheit: "Ebenen",
          quelle_soll: "Folge der Geschossbezeichnungen: " + namen,
          stufe: "hinweis",
          text: "Ob über " + namen.split(", ").slice(-1)[0] + " oder unter "
            + namen.split(", ")[0] + " noch eine Ebene liegt, für die kein Blatt "
            + "vorliegt — ein nicht gezeichneter Spitzboden etwa —, ist aus den "
            + "Grundrissen nicht zu entscheiden. Ein fehlendes Geschoss ergibt eine "
            + "widerspruchsfreie, plausibel aussehende und zu kleine Heizlast.",
          abhilfe: "Einen Schnitt auswerten oder eine zweite Lesung laufen lassen; "
            + "beide zählen die Ebenen unabhängig vom Raumbuch. Ersatzweise die "
            + "Zahl der Ebenen hier eintragen.",
          frage: { pfad: "zaehler.geschosse",
                   label: "Ebenen einschließlich Keller und Dachgeschoss",
                   einheit: "Ebenen" },
        }));
      } else {
        raus.push(zeile({
          id: "geschosse", titel: "Zahl der Geschosse", art: "grenze",
          abhilfe: "Einen Schnitt auswerten, eine zweite Lesung laufen lassen, oder "
            + "die Zahl der Ebenen hier eintragen.",
          ist: ist, soll: null, einheit: "Ebenen", stufe: "offen",
          text: "Erfasst sind " + gezaehlt + ". Ein Schnitt oder eine Ansicht, die die "
            + "Ebenen unabhängig zählt, liegt nicht vor, und die Bezeichnungen der "
            + "Geschosse ergeben keine prüfbare Folge"
            + (f && f.unklar.length
              ? " (nicht gedeutet: " + f.unklar.join(", ") + ")" : "")
            + ". Ein fehlendes Geschoss ergibt eine widerspruchsfreie, plausibel "
            + "aussehende und zu kleine Heizlast.",
          frage: { pfad: "zaehler.geschosse",
                   label: "Ebenen einschließlich Keller und Dachgeschoss",
                   einheit: "Ebenen" },
        }));
      }
    } else if (ist < best.n) {
      /* KANN DAS WERKZEUG DAS GESCHOSS BENENNEN UND SEINE FLÄCHE ABLEITEN?
         Dann ist es kein Fall für eine Sperre, sondern für eine Annahme —
         siehe den Kopf von fehlendeGeschosse(). Nur wenn beides nicht geht,
         bleibt die Sperre: dann sagt eine Zählung, dass eine Ebene fehlt,
         und niemand kann sagen, welche. */
      const koennen = fehlendeGeschosse(p);
      /* Ein von Hand entferntes Geschoss steht in einer EIGENEN Zeile weiter
         unten (geschoss_entfernt_*). Sie hängt nicht an dieser Zählung, denn
         die Zählung findet den Fall nicht zuverlässig: eine Blattangabe, die
         den Keller nicht mitnennt, oder eine Dachraumzone, die den Platz des
         entfernten Geschosses einnimmt, bringen die Zahl wieder zum Stimmen,
         während das Geschoss weiter fehlt. */
      const zurueck = [];
      raus.push(zeile({
        id: "geschosse", titel: "Zahl der Geschosse", art: "befund",
        ist: ist, soll: best.n, einheit: "Ebenen", quelle_soll: best.q,
        stufe: koennen.length ? "warnung" : "fehler",
        text: "Es fehlt vermutlich ein Geschoss. " + best.q + ", erfasst sind "
          + gezaehlt + "."
          + (koennen.length
            ? " Das Werkzeug kann "
              + koennen.map(function (x) { return "„" + x.wortlaut + "“"; }).join(", ")
              + " mit einer abgeleiteten Fläche ansetzen ("
              + koennen.map(function (x) { return x.grund; }).join("; ")
              + "). Bis dahin ist die Rechnung ohne dieses Geschoss und damit zu "
              + "klein."
            : (zurueck.length
              ? " Die Annahme für "
                + zurueck.map(function (x) { return "„" + x.wortlaut + "“"; }).join(", ")
                + " ist von Hand entfernt worden. Die Rechnung läuft damit ohne "
                + "dieses Geschoss und fällt zu klein aus, ohne dass man es dem "
                + "Ergebnis ansieht. Entweder kommt die Annahme zurück, oder es "
                + "gehört begründet, warum das Geschoss nicht mitzurechnen ist."
              : " Solange das offen ist, wird nicht gerechnet: eine "
                + "Berechnung ohne dieses Geschoss ergibt eine zu kleine Heizlast, "
                + "und das fällt am Ergebnis nicht auf. Zwei Wege sind vorgesehen: "
                + "Grundriss nachreichen oder das Geschoss als unbeheizten Bereich "
                + "führen.")),
        aufhebbar: koennen.length ? true : false,
        begruendung_frage: zurueck.length
          ? "Die Unterlagen benennen "
            + zurueck.map(function (x) { return "„" + x.wortlaut + "“"; }).join(", ")
            + ", die Annahme dazu ist entfernt.\n\nWarum ist dieses Geschoss "
            + "nicht mitzurechnen? Die Begründung erscheint im Bericht.\n\n"
            + "Beispiel: Dachgeschoss nicht ausgebaut und unbeheizt, am Objekt "
            + "geprüft am " + new Date().toLocaleDateString("de-DE") + "."
          : null,
        aktionen: (koennen.length ? koennen : zurueck).length
          ? (koennen.length ? koennen : zurueck).map(function (x) {
              return { aktion: "kbGeschossAnnehmen",
                text: (koennen.length ? "" : "wieder ")
                  + "„" + x.wortlaut + "“ mit " + de(x.A, 2) + " m² ansetzen",
                data: { name: x.kuerzel } };
            })
          : [{ aktion: "kbZoneAnlegen", text: "als unbeheizten Bereich anlegen",
               data: { name: "Nicht gezeichnetes Geschoss" } }],
      }));
    } else {
      /* KEIN GRÜNER HAKEN AUF EINER ANNAHME.
         Steht in der Zählung ein Geschoss, das das Werkzeug selbst angesetzt
         hat, dann deckt sich die Zahl nur deshalb. Grün hiesse dann: „die
         unabhängige Zählung bestätigt das Raumbuch" — und bestätigt wird in
         Wahrheit die eigene Annahme. */
      const ang = (p.geschosse_angenommen || []);
      /* ZONEN SIND KEINE EBENEN DES RAUMBUCHS.
       *
       * Ob eine Ebene DOPPELT geführt wird, entscheidet sich an den
       * beheizten Geschossen — nur die stehen mit Räumen im Raumbuch. Die
       * unbeheizten Zonen (Keller, Dachraum) legt das Werkzeug selbst als
       * Grenzflächen über und unter dem Stapel an; sie gegen die gezählten
       * Ebenen zu halten vergleicht Äpfel mit Birnen.
       * GEMESSEN am echten Lauf „Hasenberg 10" (25.08.2026): 2 beheizte
       * Geschosse (EG, OG) plus die beiden selbst angelegten Zonen Keller
       * und Dachraum standen als „4 gegen 2" da, und die Zeile verlangte zu
       * prüfen, ob eine Ebene doppelt geführt wird — auf einem Projekt, auf
       * dem nichts doppelt war. Der Kunde dazu: „da kann einfach angenommen
       * werden dass es ok ist."
       * Die Gegenrichtung bleibt scharf: ein DRITTES beheiztes Geschoss
       * gegen zwei gezählte Ebenen ist weiter ein Befund (Abschnitt 2 in
       * validierung/hasenberg_echtlauf_test.js), und zu WENIG erfasste
       * Ebenen fängt der Zweig darüber (ist < best.n) unverändert. */
      const zuViel = gs.length > best.n;
      raus.push(zeile({
        id: "geschosse", titel: "Zahl der Geschosse",
        art: (zuViel || ang.length) ? "befund" : "pruefung",
        /* Angezeigt wird die Zahl, um die es geht: bei einem Verdacht die
           beheizten Geschosse, bei Deckung die gedeckte Ebenenzahl — die
           Zonen zählen in keiner der beiden Richtungen als Ebene. */
        ist: zuViel ? gs.length : Math.min(ist, best.n),
        soll: best.n, einheit: "Ebenen", quelle_soll: best.q,
        stufe: zuViel ? "warnung" : (ang.length ? "hinweis" : "gut"),
        /* MEHR BEHEIZTE GESCHOSSE ALS GEZÄHLTE EBENEN — DIE SICHTBARE
           FEHLERRICHTUNG. Eine Ebene zu viel macht die Heizlast zu GROSS,
           und sie steht mit Namen im Raumbuch: man sieht sie. Das ist kein
           Fall für eine schriftliche Begründung, sondern für einen Blick
           und einen Klick — die Kenntnisnahme ist der eine, das Entfernen
           einer selbst angesetzten Ebene der andere. */
        aufhebbar: zuViel ? true : undefined,
        aktionen: zuViel && ang.length
          ? ang.map(function (x) {
              return { aktion: "kbGeschossEntfernen",
                text: "Annahme „" + (x.wortlaut || x.kuerzel) + "“ entfernen",
                data: { name: x.kuerzel } };
            })
          : undefined,
        text: zuViel
          ? ("Im Raumbuch stehen " + gs.length + " beheizte Geschosse, unabhängig "
             + "gezählt wurden nur " + best.n + " Ebenen (" + best.q + "). Zu prüfen "
             + "ist, ob eine Ebene doppelt geführt wird"
             + (ang.length
               ? " — darunter "
                 + ang.map(function (x) {
                     return "„" + (x.wortlaut || x.kuerzel) + "“"; }).join(", ")
                 + ", " + (ang.length === 1 ? "das" : "die")
                 + " das Werkzeug selbst angesetzt hat"
               : "")
             + ". Eine Ebene zu viel macht die Heizlast zu groß; sie steht "
             + "namentlich im Raumbuch und ist mit einem Klick zu entfernen "
             + "oder mit einem Klick zur Kenntnis zu nehmen.")
          : ("Erfasst sind " + gezaehlt + ". Die beheizten Geschosse decken sich "
             + "mit der unabhängigen Zählung: " + best.q + "."
             + (ist > best.n
               ? " Die unbeheizten Bereiche sind keine eigenen Ebenen des "
                 + "Raumbuchs: sie liegen als Grenzflächen über, unter oder "
                 + "neben den gezählten Geschossen."
               : "")
             + (ang.length
               ? " Die Deckung beruht allerdings auf "
                 + (ang.length === 1
                   ? "einem Geschoss, das" : ang.length + " Geschossen, die")
                 + " das Werkzeug selbst angesetzt hat ("
                 + ang.map(function (x) { return "„" + (x.wortlaut || x.kuerzel) + "“"; })
                     .join(", ")
                 + "). Ein Grundriss dazu liegt nicht vor; die eigene Zeile darunter "
                 + "sagt, was das am Ergebnis ausmacht."
               : "")),
      }));
    }

    /* EIN VON HAND ENTFERNTES GESCHOSS.
     *
     * Die Rechnung läuft dann WISSENTLICH ohne eine Ebene, die die
     * Unterlagen benennen — und das ist die eine Lage, in der die härteste
     * Stufe wirklich gebraucht wird: ein Klick ohne Wort gäbe ein Ergebnis
     * frei, von dem beide Seiten wissen, dass es zu klein ist, und man sieht
     * es ihm nicht an. GEMESSEN am echten Blattsatz „BA 01–08" ohne das
     * DG-Blatt (24.08.2026): mit der Annahme 25,83 kW, ohne sie 19,57 kW.
     *
     * Diese Zeile hängt bewusst NICHT an der Zählung der Ebenen. Die Zählung
     * fand den Fall nicht: die Blattangabe „EG + OG + DG" nennt das
     * vorhandene Kellergeschoss gar nicht, und die Dachraumzone rückte an
     * die Stelle des entfernten Geschosses — die Zahl stimmte wieder, und
     * 6,3 kW waren still verschwunden. */
    (fehlendeGeschosse(p, { auch_entfernte: true }) || []).forEach(function (x) {
      const weg = (p.geschosse_entfernt || []).map(schluessel);
      if (weg.indexOf(schluessel(x.kuerzel)) < 0) return;
      raus.push(zeile({
        id: "geschoss_entfernt_" + schluessel(x.kuerzel).replace(/[^a-z0-9]+/g, "_"),
        titel: "Entferntes Geschoss „" + x.wortlaut + "“",
        art: "befund", stufe: "fehler",
        ist: 0, soll: 1, einheit: "Geschoss",
        quelle_soll: x.quelle,
        aufhebbar: false,
        text: "Die Unterlagen benennen „" + x.wortlaut + "“, im Raumbuch steht es "
          + "nicht und die Annahme dazu ist von Hand entfernt worden. Die Rechnung "
          + "läuft damit ohne dieses Geschoss und fällt um dessen Anteil zu klein "
          + "aus — das sieht man dem Ergebnis nicht an. Entweder kommt die Annahme "
          + "zurück (" + de(x.A, 2) + " m², " + x.grund + "), oder es gehört "
          + "begründet, warum das Geschoss nicht mitzurechnen ist.",
        begruendung_frage: "Die Unterlagen benennen „" + x.wortlaut + "“, das "
          + "Raumbuch kennt es nicht.\n\nWarum ist dieses Geschoss nicht "
          + "mitzurechnen? Die Begründung erscheint im Bericht.\n\nBeispiel: "
          + "Dachgeschoss nicht ausgebaut, kein Heizkörper, am Objekt geprüft am "
          + new Date().toLocaleDateString("de-DE") + ".",
        aktionen: [{ aktion: "kbGeschossAnnehmen",
          text: "wieder „" + x.wortlaut + "“ mit " + de(x.A, 2) + " m² ansetzen",
          data: { name: x.kuerzel } }],
      }));
    });

    /* EIN ANGENOMMENES GESCHOSS DARF NICHT UNTER EINEM HAKEN VERSCHWINDEN.
       Sobald es angelegt ist, deckt sich die Zählung wieder — und genau
       deshalb braucht es eine eigene Zeile. Sie ist gelb und nicht grün: die
       Fläche ist abgeleitet, nicht gelesen, und sie treibt das Ergebnis nach
       oben. Ein Klick nimmt sie zur Kenntnis, ein Knopf nimmt sie heraus. */
    (p.geschosse_angenommen || []).forEach(function (a) {
      const w = zahl(a.wirkung_w, null);
      raus.push(zeile({
        id: "geschoss_angenommen_" + schluessel(a.kuerzel).replace(/[^a-z0-9]+/g, "_"),
        titel: "Angenommenes Geschoss „" + (a.wortlaut || a.kuerzel) + "“",
        art: "befund", stufe: "warnung",
        ist: zahl(a.A, 0), soll: null, einheit: "m²",
        quelle_soll: a.quelle || null,
        text: "Die Unterlagen benennen dieses Geschoss, ein Grundriss dazu liegt "
          + "nicht vor. Das Werkzeug rechnet es mit " + de(zahl(a.A, 0), 2)
          + " m² mit. " + a.grund + ". "
          + (a.gemessen
            ? "Die Fläche ist damit gelesen und nicht geraten."
            : "Der wahre Wert liegt zwischen der Rechnung OHNE dieses Geschoss "
              + "(zu klein) und dieser Rechnung (zu groß).")
          + (w !== null
            ? " Es trägt " + de(w / 1000, 2) + " kW zur Heizlast bei; ohne die "
              + "Annahme fiele das Ergebnis um diesen Betrag kleiner aus."
            : "")
          + " Es sind keine einzelnen Räume erfunden: angelegt ist EINE Fläche "
          + "mit einem Namen, der sagt, was sie ist.",
        abhilfe: "Den Grundriss dieses Geschosses nachreichen und auswerten "
          + "lassen; dann tritt die gelesene Fläche an die Stelle der Annahme.",
        aktionen: [{ aktion: "kbGeschossEntfernen", text: "Annahme entfernen",
                     data: { name: a.kuerzel } }],
      }));
    });

    /* Treppentest: rein lokal aus den Grundrissen, ohne Schnitt. Es muss genau
       ein Blatt mit einer Treppe ohne Abgang geben (das unterste Geschoss) und
       genau eines ohne Aufgang (das oberste). SPEZIFIKATION_STAPEL 9.2. */
    const mitTreppe = bl.filter((b) => b.treppe);
    if (mitTreppe.length >= 2) {
      const auf = mitTreppe.filter((b) => b.treppe === "nur_auf").length;
      const ab = mitTreppe.filter((b) => b.treppe === "nur_ab").length;
      const meld = [];
      if (auf === 0) meld.push("Kein Blatt zeigt eine Treppe ohne Abgang. Das unterste "
        + "Geschoss fehlt, häufig der Keller.");
      if (ab === 0) meld.push("Kein Blatt zeigt eine Treppe ohne Aufgang. Das oberste "
        + "Geschoss fehlt, häufig Dachgeschoss oder Spitzboden.");
      if (auf > 1) meld.push(auf + " Blätter zeigen eine Treppe ohne Abgang. Das "
        + "spricht für zwei Gebäude oder zwei Bauabschnitte im Stapel.");
      raus.push(zeile({
        id: "treppentest", titel: "Treppentest über die Grundrisse",
        art: meld.length ? "befund" : "pruefung",
        ist: mitTreppe.length, soll: null, einheit: "Blätter",
        quelle_soll: "Treppenläufe auf " + mitTreppe.length + " Grundrissen",
        stufe: meld.length ? "fehler" : "gut",
        text: meld.length
          ? meld.join(" ") + " Der Test versagt bei Gebäuden mit Außentreppe; dann ist "
            + "er mit Begründung aufzuheben."
          : "Genau ein Grundriss zeigt eine Treppe ohne Abgang, genau einer eine ohne "
            + "Aufgang. Die Geschossfolge ist damit oben und unten geschlossen.",
      }));
    }
    return raus;
  }

  /* --- Z5  unbeheizte Bereiche: benannt gegen angelegt ----------------- */
  /* =====================================================================
   * Eine Zone anlegen — EINE Stelle, zwei Aufrufer
   * =====================================================================
   * Bisher stand das Anlegen nur im Klickpfad des Knopfes. Damit hing die
   * Behebung eines Befundes, den das Werkzeug selbst erhebt und selbst
   * begruenden kann, an einer Handbewegung. Diese Funktion ist der
   * Rechenteil davon: DOM-frei, ohne Meldung, idempotent. Der Knopf ruft sie
   * auf, und der automatische Durchgang in app.js ruft dieselbe.
   *
   * Geraten wird nichts: nur wo DATEN_ZONENLAGEN den Namen einer Lage nach
   * DIN/TS 12831-1 Tabelle 5 zuordnen kann, entsteht eine Zone mit belegter
   * Temperatur. Sie ist als ANNAHME gekennzeichnet und traegt ihre
   * Fundstelle; ohne Zuordnung bleibt es beim Bilanzweg. */
  /* Die Art eines Bereichs aus seinem Namen — modulweit, weil zwei Stellen
     sie brauchen: der Abgleich Plan gegen Zone und die Frage, ob das Werkzeug
     einen Bereich selbst anlegen darf. */
  const ART_AUS_NAME = [
    { art: "dachraum",
      re: /spitzboden|dachraum|dachboden|dachgeschoss\s*unbeheizt|abseite|kaltdach|speicher/i },
    { art: "keller",
      re: /keller|untergeschoss|souterrain|kriechkeller|kriechraum/i },
    { art: "garage", re: /garage|carport|tiefgarage|stellplatz\s*ueberdacht/i },
    { art: "nebenbau", re: /scheune|stall|schuppen|remise/i },
    { art: "treppenhaus", re: /treppenhaus|treppenraum/i },
  ];
  function artAusName(s) {
    const t = String(s || "");
    const tr = ART_AUS_NAME.find(function (x) { return x.re.test(t); });
    return tr ? tr.art : null;
  }

  /* Welche Arten sind EBENEN und welche stehen NEBEN dem Haus.
     Ein Spitzboden und ein Keller sind Geschosse und zählen in Z4 als Ebene
     mit. Eine Garage, ein Schuppen und ein außen liegendes Treppenhaus sind
     es nicht: sie liegen neben oder an dem Stapel, nicht darin. Ohne diese
     Unterscheidung machte eine selbsttätig angelegte Garagenzone ein
     fehlendes Geschoss rechnerisch weg — die Zählung stimmte wieder, und das
     Geschoss fehlte weiter. */
  const ARTEN_OHNE_EBENE = { garage: true, nebenbau: true, treppenhaus: true };
  function zoneIstEbene(z) {
    return !ARTEN_OHNE_EBENE[artAusName(z && z.name) || artAusName(z && z.id)];
  }

  /* =====================================================================
   * ZWEI LESUNGEN DESSELBEN BEREICHS ODER ZWEI BEREICHE?
   * =====================================================================
   * GEMESSEN an einem echten Durchlauf: die Gebäudeauslese meldete
   * „vermutlich Garage rechts im Bild", die zweite Lesung desselben Hauses
   * meldete „Garage". Das Werkzeug machte daraus ZWEI rote Sperren für EIN
   * Bauwerk und verlangte zwei Zonen. Kein Bearbeiter kann das auflösen,
   * ohne gegen den eigenen Augenschein anzulegen.
   *
   * Die Zusammenführung nach ART, die es schon gab, half hier nicht: sie
   * vergleicht die benannten Bereiche nur gegen die BEREITS ANGELEGTEN
   * Zonen. Waren gar keine angelegt, verglich sie nichts.
   *
   * WORAN MAN EINEN DOPPELT GELESENEN BEREICH VON ZWEI ECHTEN UNTERSCHEIDET.
   * Nicht am Wortlaut — „Garage" und „Garage" können zwei sein, „GARAGE" und
   * „vermutlich Garage rechts im Bild" ein und dieselbe. Sondern an der
   * QUELLE. Jede Quelle ist eine eigene, vollständige Aufzählung desselben
   * Gebäudes: die Gebäudeauslese zählt alle unbeheizten Bereiche auf, und
   * jede Blattlesung zählt alle auf, die ihr Blatt zeigt. Daraus folgt:
   *
   *   Die Zahl der Bereiche einer Art ist die GRÖSSTE Zahl, die EINE
   *   einzelne Quelle für sich gezählt hat — nicht die Summe über die
   *   Quellen.
   *
   * Zwei echte Garagen stehen deshalb weiter als zwei da, sobald irgendeine
   * Quelle zwei aufzählt („Garage Nord" und „Garage Süd" auf einem Blatt).
   * Zwei Quellen mit je einer Garage sind eine Garage, zweimal gesehen.
   *
   * Zählt eine Quelle mehr als einen, ist SIE die Aufzählung; die Nennungen
   * der übrigen Quellen werden ihr über Unterscheidungsmerkmale (links,
   * rechts, Nord, 1, 2 …) zugeordnet. Wo das Merkmal nicht entscheidet,
   * bleibt die Nennung ein eigener Bereich — eine Zeile zu viel, über die
   * jemand nachdenkt, ist besser als ein stillschweigend verschluckter
   * Bereich.
   * ================================================================== */
  const MERKMALE = [
    /\blinks?\b/i, /\brechts?\b/i, /\bvorne?\b/i, /\bhinten\b/i,
    /\bnord(en|lich|seitig)?\b/i, /\bs[üu]e?d(en|lich|seitig)?\b/i,
    /\bost(en|lich|seitig)?\b/i, /\bwest(en|lich|seitig)?\b/i,
    /\b1\b|\bi\b|\berste[rns]?\b/i, /\b2\b|\bii\b|\bzweite[rns]?\b/i,
    /\b3\b|\biii\b|\bdritte[rns]?\b/i,
  ];
  function merkmaleVon(s) {
    const t = String(s || "");
    const raus = [];
    MERKMALE.forEach(function (re, i) { if (re.test(t)) raus.push(i); });
    return raus;
  }
  /* Ein Vorbehalt macht aus einer Benennung eine Beschreibung. „vermutlich
     Garage rechts im Bild" benennt keine rechte Garage, sondern beschreibt,
     wo die Leserin etwas gesehen hat. */
  const VORBEHALT = new RegExp(
    "vermutlich|vermutet|wohl|evtl|eventuell|m[öo]glicherweise|unklar|"
    + "offenbar|scheinbar|vielleicht|ggf|\\?", "i");
  function schluessel(s) {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  /** DIE IDENTITAET EINER EBENE IST IHR RANG, NICHT IHR NAME.
   *
   *  GEMESSEN am 26.08.2026 an "1754 BA 2018-03-13": auf denselben vier
   *  Ebenen standen sechs Bezeichnungen nebeneinander -- "OG", "1.OG",
   *  "2.OG", "2. OG", dazu "EG" und "KG". KERN_ZUORDNUNG fuehrt "OG" und
   *  "1.OG" als ZWEI Kuerzel mit demselben Rang 1. Wer nach Kuerzel
   *  vergleicht, findet fuer "1.OG" kein Raumbuch, obwohl die Raeume unter
   *  "OG" laengst dastehen -- und legt ein fuenftes, erfundenes Geschoss an
   *  ("Angenommenes Geschoss 1.OG", 1.830,32 m², mit 305,05 m² Fenster,
   *  gedruckt in der Kundenfassung).
   *
   *  Verglichen wird deshalb ueber den Rang, sobald einer deutbar ist; nur
   *  was sich gar nicht einordnen laesst ("Spitzboden Nord"), behaelt seinen
   *  Namen als Schluessel. Angezeigt wird weiter der gelesene Wortlaut --
   *  hier geht es um Gleichheit, nicht um Beschriftung. */
  function ebenenSchluessel(text, Z) {
    const zz = Z || zuordnung();
    const d = (zz && zz.geschossAusText) ? zz.geschossAusText(text) : null;
    if (d && d.rang !== null && d.rang !== undefined) return "rang:" + d.rang;
    if (d && d.kuerzel) return schluessel(d.kuerzel);
    return schluessel(text);
  }

  /** Alle in den Unterlagen benannten unbeheizten Bereiche, je Bereich EIN
   *  Eintrag, mit allen Lesungen, die ihn belegen.
   *  Rückgabe: [{ name, art, lesungen: [text], quellen: [quelle] }] */
  function bereicheZusammenfuehren(p) {
    const pr = p || {};
    const roh = [];
    const nach = {};
    /* WAS IM FREIEN LIEGT, IST KEIN UNBEHEIZTER BEREICH.
     *
     * GEMESSEN am 26.08.2026 an "Hasenberg 10": die Selbstpruefung verlangte
     * eine Zone fuer "Terrasse (unbeheizt, aussen)" -- und sagte im selben
     * Wort, dass sie AUSSEN liegt. Die daraufhin angelegte Zone trug null
     * Bauteile, blieb rechnerisch wirkungslos und stand trotzdem in der
     * KUNDENFASSUNG unter "Unbeheizte Bereiche".
     *
     * Ein unbeheizter Bereich im Sinn der Norm ist ein UMSCHLOSSENER Raum
     * mit eigener Grenztemperatur (DIN EN 12831-1, Abschnitt 6.3.2). Eine
     * Terrasse, ein Balkon, ein Freisitz, ein Vordach hat keine: die Wand
     * dahinter grenzt an Aussenluft, und genau so wird sie ohnehin gerechnet.
     * Erkannt wird es am Namen ODER an der Lesung, die "aussen"/"im Freien"
     * ausdruecklich dazuschreibt. */
    const IM_FREIEN = /^(terrasse|dachterrasse|balkon|loggia|freisitz|vordach|podest|austritt|frei ?fl(ä|ae)che|hof|garten|stellplatz|pkw-?stellplatz|zufahrt)\b/i;
    const SAGT_AUSSEN = /\b(au(ß|ss)en|im freien|freiliegend|nicht umschlossen|ungedeckt)\b/i;
    const nimm = function (text, quelle) {
      const t = String(text == null ? "" : text).trim();
      if (!t) return;
      if (IM_FREIEN.test(t) || (SAGT_AUSSEN.test(t) && IM_FREIEN.test(t.replace(/^[^A-Za-zÄÖÜäöü]+/, "")))) return;
      if (IM_FREIEN.test(t.replace(/^[\s(„"']+/, ""))) return;
      const k = schluessel(t);
      if (!nach[k]) {
        nach[k] = { name: t, art: artAusName(t), lesungen: [t], quellen: [] };
        roh.push(nach[k]);
      }
      if (nach[k].quellen.indexOf(quelle) < 0) nach[k].quellen.push(quelle);
    };
    /* Die Flächenstempel eines Blattes sind eine EIGENE Lesung. Sie landen
       zwar in derselben Liste wie die Gebäudeauslese, stammen aber aus dem
       Textstand der Zeichnung und nicht aus deren Antwort. Ohne diese
       Trennung teilten sich beide eine Quelle, die Quelle zählte damit zwei
       Garagen — und aus zwei Lesungen derselben Garage wären wieder zwei
       Bereiche geworden. GEMESSEN am Blattsatz „BA 01–08" am 24.08.2026. */
    const ausStempel = {};
    (pr.stempelbereiche || []).forEach(function (x) {
      ausStempel[schluessel(x)] = true;
    });
    ((pr.plangebaeude && pr.plangebaeude.unbeheizte_bereiche) || [])
      .forEach(function (x) {
        nimm(x, ausStempel[schluessel(x)] ? "stempel" : "gebaeude");
      });
    (pr.planzonen || []).forEach(function (z) {
      nimm(z.bezeichnung || z.name || "", "planzonen");
    });
    blaetterMitGegenprobe(pr).forEach(function (b, i) {
      ((b.gegenprobe && b.gegenprobe.unbeheizt_benannt) || [])
        .forEach(function (x) { nimm(x, "lesung:" + (b.name || i)); });
    });
    benannteNichtGezeichneteEbenen(pr).forEach(function (x) {
      nimm(x, "ebenen");
    });

    /* Nach Art gruppieren. Was sich nicht einordnen lässt, bleibt für sich —
       ohne Art gibt es keinen Grund, zwei Nennungen für dasselbe zu halten. */
    const gruppen = {}, folge = [];
    roh.forEach(function (e) {
      if (!e.art) { folge.push([e]); return; }
      if (!gruppen[e.art]) { gruppen[e.art] = []; folge.push(gruppen[e.art]); }
      gruppen[e.art].push(e);
    });

    const raus = [];
    folge.forEach(function (gruppe) {
      if (gruppe.length <= 1) { raus.push(gruppe[0]); return; }
      /* Wie viele hat die ergiebigste EINZELNE Quelle gezählt? */
      const jeQuelle = {};
      gruppe.forEach(function (e) {
        e.quellen.forEach(function (q) { jeQuelle[q] = (jeQuelle[q] || 0) + 1; });
      });
      let leit = null, n = 1;
      Object.keys(jeQuelle).forEach(function (q) {
        if (jeQuelle[q] > n || (jeQuelle[q] === n && leit === null)) {
          n = jeQuelle[q]; leit = q;
        }
      });
      if (n >= gruppe.length) { gruppe.forEach(function (e) { raus.push(e); }); return; }
      if (n <= 1) { raus.push(verschmelzen(gruppe)); return; }
      /* Mehr als einer, aber weniger als Nennungen: die Leitquelle zählt
         die Bereiche, die übrigen Nennungen werden zugeordnet. */
      const kerne = gruppe.filter(function (e) { return e.quellen.indexOf(leit) >= 0; });
      const rest = gruppe.filter(function (e) { return e.quellen.indexOf(leit) < 0; });
      const eimer = kerne.map(function (e) { return [e]; });
      rest.forEach(function (e) {
        const m = merkmaleVon(e.name);
        let treffer = -1, anzahl = 0;
        kerne.forEach(function (k, i) {
          const gemeinsam = merkmaleVon(k.name)
            .filter(function (x) { return m.indexOf(x) >= 0; }).length;
          if (gemeinsam > 0) { anzahl++; treffer = i; }
        });
        if (anzahl === 1) eimer[treffer].push(e);
        else raus.push(e);
      });
      eimer.forEach(function (b) { raus.push(verschmelzen(b)); });
    });
    return raus;
  }

  /** Aus mehreren Lesungen eines Bereichs eine machen. Der angezeigte Name
   *  ist die Lesung, die am ehesten der Beschriftung im Plan entspricht:
   *  ohne Vorbehalt, aus einer Blattlesung (die ist wörtlich), und von
   *  denen die kürzeste. */
  function verschmelzen(liste) {
    if (liste.length === 1) return liste[0];
    const punkte = function (e) {
      let s = 0;
      if (!VORBEHALT.test(e.name)) s += 100;
      if (e.quellen.some(function (q) { return q.indexOf("lesung:") === 0; })) s += 10;
      return s - Math.min(String(e.name).length, 9);
    };
    const best = liste.slice().sort(function (a, b) { return punkte(b) - punkte(a); })[0];
    const lesungen = [], quellen = [];
    liste.forEach(function (e) {
      e.lesungen.forEach(function (x) { if (lesungen.indexOf(x) < 0) lesungen.push(x); });
      e.quellen.forEach(function (q) { if (quellen.indexOf(q) < 0) quellen.push(q); });
    });
    return { name: best.name, art: best.art, lesungen: lesungen, quellen: quellen,
             verschmolzen: lesungen.length > 1 };
  }

  /** Ebenen, die die zweite Lesung BENENNT, aber als nicht gezeichnet meldet,
   *  deren Name ein unbeheizter Bereich ist und die im Raumbuch nicht als
   *  beheiztes Geschoss stehen. Das ist der eine Fall, in dem der Plan die
   *  Existenz des Bereichs UND das Fehlen eines Grundrisses dazu belegt. */
  function benannteNichtGezeichneteEbenen(p) {
    const GK = gegenprobeKern();
    const ZZ = zuordnung();
    if (!GK) return [];
    const kuerzel = {};
    geschosse(p).forEach(function (g) {
      const d = ZZ && ZZ.geschossAusText ? ZZ.geschossAusText(g.name) : null;
      if (d && d.kuerzel) kuerzel[d.kuerzel] = g.name;
    });
    const raus = [];
    GK.ebenenVereinigen(blaetterMitGegenprobe(p),
      ZZ ? ZZ.geschossAusText : null).forEach(function (e) {
      if (e.gezeichnet) return;
      const w = String(e.wortlaut || "").trim();
      if (!w || !artAusName(w)) return;
      const d = ZZ && ZZ.geschossAusText ? ZZ.geschossAusText(w) : null;
      if (d && d.kuerzel && kuerzel[d.kuerzel]) return;
      raus.push(w);
    });
    return raus;
  }

  function zoneAnlegen(p, name, automatisch) {
    if (!p) return null;
    const bez = String(name || "").trim() || "Unbeheizter Bereich";
    if (!p.zonen) p.zonen = [];
    /* Wer den Bereich von Hand wieder anlegt, nimmt seine Löschung zurück.
       Ohne das bliebe der Name für immer gesperrt und das selbsttätige
       Ergänzen wäre für ihn dauerhaft aus. */
    if (!automatisch && Array.isArray(p.zonen_entfernt)) {
      p.zonen_entfernt = p.zonen_entfernt.filter(function (x) {
        return String(x).trim().toLowerCase() !== bez.toLowerCase();
      });
    }
    const gleich = String(bez).trim().toLowerCase();
    const artB = artAusName(bez);
    const merkB = merkmaleVon(bez);
    const schon = p.zonen.some(function (z) {
      if (String(z.name || "").trim().toLowerCase() === gleich) return true;
      /* Derselbe Bereich unter zwei Namen — „SPITZBODEN" und „Unbeheizter
         Dachraum" — darf nicht zweimal entstehen. */
      if (!artB || (artAusName(z.name) !== artB && artAusName(z.id) !== artB)) {
        return false;
      }
      /* ABER: gleiche Art heisst nicht gleicher Bereich. „GARAGE NORD" und
         „GARAGE SUED" sind zwei Garagen, und ein Haus kann zwei haben. Ohne
         diese Ausnahme sperrte die Angleichung, die Doppelnennungen
         zusammenfasst, zugleich jeden zweiten echten Bereich derselben Art
         aus — und der fehlte dann samt trennender Wand in der Rechnung.
         Entschieden wird über die unterscheidenden Merkmale (Himmelsrichtung,
         Seite, Nummer): TRAGEN BEIDE NAMEN DIESELBEN, ist es derselbe
         Bereich. Trägt einer eines, das der andere nicht hat, sind es zwei.
         „SPITZBODEN" und „Unbeheizter Dachraum" tragen beide keines und
         bleiben damit eine Sache; „Garage" und „Garage Nord" nicht.

         Die eigentliche Entdopplung steht nicht hier, sondern in
         bereicheZusammenfuehren(): sie weiss, aus welcher Quelle ein Name
         stammt, und nur daran ist zu erkennen, ob zweimal dasselbe gelesen
         wurde. Diese Stelle ist der letzte Rückhalt für den Fall, dass jemand
         von Hand zweimal denselben Namen anlegt. */
      const merkZ = merkmaleVon(z.name);
      const gleicheMerkmale = merkB.length === merkZ.length
        && merkB.every(function (x) { return merkZ.indexOf(x) >= 0; });
      return gleicheMerkmale;
    });
    if (schon) return null;
    const DZ = (typeof window !== "undefined") && window.DATEN_ZONENLAGEN;
    const t = (DZ && DZ.lageFuerBereich) ? DZ.lageFuerBereich(bez) : null;
    /* DIE ZONE MUSS DIE KENNUNG TRAGEN, AUF DIE DIE BAUTEILE ZEIGEN.
       bauteileErgaenzen legt Kellerdecke und oberste Geschossdecke mit
       grenzt_an {typ:"zone", ref:"keller"} bzw. "dachraum" an und erzeugt
       fehlende Zonen unter genau diesen Kennungen nach. Eine hier unter
       einer eigenen Kennung angelegte Zone waere daneben eine zweite fuer
       denselben Bereich — angelegt und von keinem Bauteil beruehrt. Mit der
       kanonischen Kennung treffen sich beide Wege: die Zone ist da, BEVOR
       die Bauteile entstehen, und die Bauteile zeigen auf sie. */
    const art = artAusName(bez);
    const kanon = { dachraum: "dachraum", keller: "keller" }[art];
    const frei = !kanon || !p.zonen.some(function (z) { return z.id === kanon; });
    const neu = { id: (kanon && frei) ? kanon
                    : "z_kb_" + Date.now() + "_" + p.zonen.length,
                  name: bez, huelle: [] };
    if (t) {
      neu.modus = "lage";
      neu.lage = t.lage;
      neu.lage_angenommen = true;
    } else {
      neu.modus = "bilanz";
    }
    if (automatisch) neu.automatisch = true;
    p.zonen.push(neu);
    if (t) {
      p.offeneFragen = p.offeneFragen || [];
      const frage = "Für „" + bez + "“ ist die Lage „" + t.name
        + "“ angenommen (" + t.fundstelle + "). Die Temperatur des Bereichs "
        + "folgt daraus und geht in jede angrenzende Fläche ein."
        + (automatisch
          ? " Die Zone hat das Werkzeug selbst angelegt, weil der Plan den "
            + "Bereich benennt und kein Grundriss dazu vorliegt."
          : "");
      if (!p.offeneFragen.some(function (x) { return x.frage === frage; })) {
        p.offeneFragen.push({ thema: "Unbeheizter Bereich", art: "grenze",
          frage: frage,
          abhilfe: "Die Lage des Bereichs im Expertenmodus prüfen, oder "
            + "seine eigenen Bauteile eintragen; dann wird statt der Tabelle "
            + "bilanziert." });
      }
    }
    /* EIN GESCHOSS, DAS UNBEHEIZT WIRD, VERLAESST DAS BEHEIZTE RAUMBUCH.
     *
     * GEMESSEN am 26.08.2026 an "BV 2-0887 Ziolkowski", beide Laeufe: die
     * Rueckfrage sagt zu, der unbeheizte Fall "nimmt diese Flaeche aus der
     * beheizten Huelle heraus". Der Klick legte die Zone an -- und liess KG
     * KELLER und KG FLUR mit 20 Grad und zusammen 1,02 kW im Raumbuch
     * stehen. Die KUNDENFASSUNG fuehrte den Keller danach in Abschnitt 2.1
     * als unbeheizten Bereich UND in Abschnitt 5.1 mit 20 Grad beheizt.
     * Zwei Saetze ueber dasselbe Geschoss, die sich widersprechen, in einem
     * unterschriebenen Bericht.
     *
     * Nur bei einer von Hand getroffenen Entscheidung (automatisch !== true)
     * und nur fuer eine Zone, deren Name eine EBENE benennt. Die Raeume
     * werden nicht geloescht, sondern nach p.raeume_unbeheizt gelegt: der
     * Vorgang bleibt umkehrbar und nachvollziehbar. */
    if (!automatisch && zoneIstEbene(neu)) {
      const Z = zuordnung();
      const zk = ebenenSchluessel(bez, Z);
      const bleiben = [], raus = [];
      (p.raeume || []).forEach(function (r) {
        if (r && ebenenSchluessel(r.geschoss, Z) === zk) raus.push(r);
        else bleiben.push(r);
      });
      if (raus.length && bleiben.length) {
        p.raeume = bleiben;
        p.raeume_unbeheizt = (p.raeume_unbeheizt || []).concat(
          raus.map(function (r) {
            return Object.assign({}, r, { unbeheizt_zone: neu.id,
              unbeheizt_zeit: Date.now() });
          }));
        p.offeneFragen = p.offeneFragen || [];
        p.offeneFragen.push({ thema: "Unbeheizter Bereich", art: "grenze",
          frage: "„" + bez + "“ ist als unbeheizt festgelegt worden. "
            + (raus.length === 1 ? "Ein Raum dieses Geschosses" : raus.length
              + " Räume dieses Geschosses")
            + " (" + raus.map(function (r) { return String(r.name || "Raum"); })
                .join(", ") + ") "
            + (raus.length === 1 ? "steht" : "stehen")
            + " deshalb nicht mehr im beheizten Raumbuch.",
          abhilfe: "Ist einer davon doch beheizt, im Raumbuch wieder anlegen "
            + "und die Zone entfernen." });
      }
    }
    return neu;
  }

  /** Die Bereiche, die der Plan benennt und zu denen keine Zone existiert —
   *  genau die Liste, aus der zaehlerZonen seine roten Zeilen macht. Sie
   *  wird aus denselben Zeilen gelesen und kann deshalb nicht auseinander
   *  laufen. */
  /* =====================================================================
   * WAS DIE LESUNGEN ÜBER DIE LAGE EINES BEREICHS SAGEN.
   * =====================================================================
   * Die Auslese schreibt oft mehr als den Namen: „vermutlich Garage rechts
   * im Bild", „Garage (angebaut)", „freistehende Garage". Dieses Wissen lag
   * bisher brach — die Zeile „ohne trennendes Bauteil" fragte den
   * Bearbeiter, was das Werkzeug längst gelesen hatte (Kundenbefund vom
   * 24.08.2026: „das muss er auch selber lösen").
   *
   * Verglichen wird über die ART (artAusName), nicht über den Wortlaut:
   * „GARAGE" und „vermutlich Garage rechts im Bild" meinen denselben Bau.
   * Was keine Aussage trägt, bleibt null — dann wird gefragt, nicht
   * geraten. */
  function zonenLageWissen(p, z) {
    const art = artAusName(z && z.name) || artAusName(z && z.id);
    if (!art) return null;
    const texte = [];
    ((((p || {}).plangebaeude) || {}).unbeheizte_bereiche || [])
      .forEach(function (t) { texte.push(t); });
    ((p || {}).stempelbereiche || []).forEach(function (t) { texte.push(t); });
    (((p || {}).plan || {}).seiten || []).forEach(function (s) {
      ((s.gegenprobe && s.gegenprobe.unbeheizt_benannt) || [])
        .forEach(function (t) { texte.push(t); });
    });
    texte.push(String((z && z.name) || ""));
    const zug = texte.filter(function (t) { return artAusName(t) === art; });
    const frei = zug.find(function (t) {
      return /freisteh|frei\s+steh|nicht\s+angebaut|losgel[öo]st|abseits|alleinstehend|allein\s*stehend/i
        .test(String(t));
    });
    if (frei) return { urteil: "frei", beleg: String(frei) };
    const an = zug.find(function (t) {
      return /angebaut|\bangrenzend|direkt\s+am\s|\bam\s+haus\b|\bans\s+haus\b|\banbau\b/i
        .test(String(t));
    });
    if (an) return { urteil: "angebaut", beleg: String(an) };
    return null;
  }

  /** Der plausibelste angrenzende Raum für einen angebauten Bereich: ein
   *  Nebenraum im untersten beheizten Geschoss — Garagen docken an HWR,
   *  Technik oder Flur an, nicht ans Schlafzimmer. Findet sich keiner,
   *  kommt null zurück und es entsteht KEINE Wand: lieber eine Frage als
   *  eine erfundene Fläche. */
  function nachbarraumFuerZone(p, z) {
    const rs = (p && p.raeume) || [];
    if (!rs.length) return null;
    const Z = zuordnung();
    const RANG = { KG: 0, UG: 0, EG: 1, OG: 2, DG: 3, ZG: 4 };
    let unten = null, untenRang = 99;
    rs.forEach(function (r) {
      const d = Z && Z.geschossAusText ? Z.geschossAusText(r.geschoss) : null;
      const k = d && d.kuerzel ? String(d.kuerzel).replace(/^\d+\.\s*/, "") : null;
      const rang = (k && RANG[k] !== undefined) ? RANG[k] : 9;
      if (rang < untenRang) { untenRang = rang; unten = r.geschoss; }
    });
    const kandidaten = rs.filter(function (r) {
      return r.geschoss === unten && zahl(r.A, 0) > 0;
    });
    const REIHE = [/hwr|hauswirtschaft/i, /technik|heizraum/i, /abstell|vorrat|speis/i,
      /garderobe|windfang|diele/i, /flur/i, /\bwc\b/i];
    for (let i = 0; i < REIHE.length; i++) {
      const treffer = kandidaten.filter(function (r) {
        return REIHE[i].test(String(r.name || "") + " " + String(r.art || ""));
      });
      if (treffer.length) {
        /* Der grösste der gleichartigen: die längere gemeinsame Wand ist
           die vorsichtige Richtung. */
        return treffer.sort(function (a, b) { return zahl(b.A, 0) - zahl(a.A, 0); })[0];
      }
    }
    return null;
  }

  /* =====================================================================
   * DIE TRENNENDE WAND ZU EINEM ANGEBAUTEN BEREICH — SELBST ANGELEGT.
   * =====================================================================
   * Läuft in automatischErgaenzen (app.js) nach bauteileErgaenzen. Angelegt
   * wird nur, wo DREI Dinge zusammenkommen: die Zone berührt kein Bauteil,
   * die Lage ist belegt (Lesung sagt „angebaut" oder der Bearbeiter hat
   * [Angebaut an: Raum] geantwortet), und ein angrenzender Raum mit
   * belegter Fläche ist da. Die Fläche der Wand ist eine GEKENNZEICHNETE
   * Annahme (kürzere Raumkante mal Raumhöhe), steht mit Herleitung und
   * Richtungshinweis am Bauteil und ist im Expertenmodus überschreibbar.
   * Eine Nutzereingabe wird nie überschrieben: das Bauteil trägt
   * automatisch:true und wird nur vom Werkzeug selbst nachgeführt. */
  function zonenWaendeErgaenzen(p) {
    if (!p || !((p.zonen || []).length) || !((p.bauteiltypen || []).length)) {
      return false;
    }
    const tWand = (p.bauteiltypen || []).find(function (t) {
      return /außenwand|aussenwand|wand/i.test(String(t.name || ""));
    });
    if (!tWand) return false;
    const beruehrt = {};
    (p.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (b) {
        if (b && b.grenzt_an && b.grenzt_an.typ === "zone" && b.grenzt_an.ref) {
          beruehrt[String(b.grenzt_an.ref)] = true;
        }
      });
    });
    let getan = false;
    (p.zonen || []).forEach(function (z) {
      if (beruehrt[String(z.id)] || z.freistehend) return;
      const wissen = zonenLageWissen(p, z);
      const antwort = z.angebaut_an
        ? (p.raeume || []).find(function (r) {
            return r.id === z.angebaut_an || r.name === z.angebaut_an;
          })
        : null;
      if (!antwort && !(wissen && wissen.urteil === "angebaut")) return;
      const raum = antwort || nachbarraumFuerZone(p, z);
      if (!raum || !(zahl(raum.A, 0) > 0)) return;
      const h = zahl(raum.h, 0) > 0 ? zahl(raum.h, 0) : 2.6;
      const laenge = Math.round(Math.sqrt(zahl(raum.A, 0)) * 100) / 100;
      const A = Math.round(laenge * h * 100) / 100;
      if (!(A > 0)) return;
      raum.bauteile = raum.bauteile || [];
      raum.bauteile.push({
        typ_id: tWand.id,
        name: "Trennwand zu „" + (z.name || z.id) + "“",
        A: A, kat: "huelle", art: "aussenwand",
        grenzt_an: { typ: "zone", ref: String(z.id) },
        automatisch: true, sicher: false,
        herkunft: "Trennwand als Annahme angelegt: "
          + (antwort
            ? "der Bearbeiter hat geantwortet, der Bereich ist angebaut an „"
              + (raum.name || raum.id) + "“."
            : "die Lesung sagt, der Bereich ist angebaut („" + wissen.beleg
              + "“); als angrenzender Raum ist „" + (raum.name || raum.id)
              + "“ angenommen — ein Nebenraum im untersten Geschoss.")
          + " Fläche angenommen als kürzere Raumkante mal Raumhöhe: "
          + de(laenge, 2) + " m × " + de(h, 2) + " m = " + de(A, 2) + " m². "
          + "Am Plan abgreifen und ersetzen. Ohne diese Wand ginge der Bereich "
          + "mit 0 W ein und die Heizlast wäre zu klein — die Annahme ist die "
          + "vorsichtige Richtung. U-Wert der Außenwand, weil die Trennwand "
          + "zu einem kalten Bereich in der Typologie keine eigene Zeile hat.",
      });
      getan = true;
    });
    return getan;
  }

  function fehlendeBereiche(p) {
    const pr = p || {};
    /* WARUM HIER KEINE ZWEITE HÜRDE MEHR STEHT.
     *
     * Bis zum 24.08.2026 legte das Werkzeug nur Bereiche selbst an, die als
     * benannte, aber NICHT GEZEICHNETE EBENE dastanden — ein Spitzboden aus
     * dem Schnitt. Alles andere blieb roter Befund, mit der Begründung, eine
     * bloß genannte Garage könne auf einem noch nicht abgelegten Blatt
     * gezeichnet sein.
     *
     * Diese Begründung trägt nicht. Ob die Garage irgendwo gezeichnet ist,
     * ändert nichts daran, DASS sie da ist und dass ihre trennende Wand in
     * die Rechnung gehört. Eine Garage ist ohnehin keine Ebene, konnte diese
     * Hürde also nie nehmen — der Befund blieb dauerhaft rot und war „nur mit
     * schriftlicher Begründung zu bestätigen", obwohl das Werkzeug den Namen,
     * die Lage nach DIN/TS 12831-1 Tabelle 5 und die Fundstelle dazu kennt.
     * Ein Werkzeug, das die Antwort hat, darf nicht die Frage stellen.
     *
     * Die Vorsicht steckt jetzt dort, wo sie hingehört, und zwar dreifach:
     *   - Angelegt wird nur, was in den Unterlagen BENANNT ist und wozu keine
     *     Zone existiert (genau die Liste der roten Zeilen; sie wird von dort
     *     gelesen und nicht nachgebaut).
     *   - Angelegt wird nur, wozu DATEN_ZONENLAGEN eine Lage kennt (geprüft
     *     an der Aufrufstelle in app.js). Sonst wird nichts geraten.
     *   - Die Zone trägt automatisch und lage_angenommen, steht als Annahme
     *     mit Fundstelle im Bericht und ist mit „Zone weg" wieder heraus.
     *
     * Was ein Bereich ist, den NIEMAND benannt hat, bleibt davon unberührt:
     * den findet zonen_unbenannt aus der Zählung der zweiten Lesung, und der
     * wird weiterhin nicht selbsttätig angelegt. */
    return zaehlerZonen(pr)
      .filter(function (z) { return String(z.id).indexOf("zone_fehlt_") === 0; })
      .map(function (z) {
        const a = (z.aktionen || [])[0];
        return (a && a.data && a.data.name) || null;
      })
      .filter(Boolean);
  }

  function zaehlerZonen(p) {
    const raus = [];
    const GK = gegenprobeKern();
    /* Ein Bereich gilt auch dann als berücksichtigt, wenn er als BEHEIZTES
       Geschoss im Raumbuch steht.
       Das ist keine Aufweichung, sondern die Behebung eines falschen Befundes:
       ein Keller, der mit eigenen Räumen und eigener Temperatur gerechnet
       wird, fehlt der Rechnung nicht — er ist nur anders geführt als über eine
       Zone. Ohne diese Unterscheidung meldete jedes Haus mit ausgebautem und
       beheiztem Kellergeschoss rot „Keller ist benannt, keine Zone angelegt",
       obwohl der Keller vollständig in der Rechnung steht. Der Befund, um den
       es wirklich geht — ein Bereich, der NIRGENDS vorkommt —, bleibt
       unverändert rot. */
    const ZZ = zuordnung();
    const alsGeschossKuerzel = {};
    geschosse(p).forEach(function (g) {
      const d = ZZ && ZZ.geschossAusText ? ZZ.geschossAusText(g.name) : null;
      if (d && d.kuerzel) alsGeschossKuerzel[d.kuerzel] = g.name;
    });
    const imRaumbuch = (p.raeume || []).map((r) => String(r.name || "").toLowerCase())
      .filter(Boolean);
    /* „Keller" und „KG" sind dasselbe Geschoss, „Spitzboden" und „DG" auch.
       Der Namensvergleich allein findet das nicht; die Deutung von
       KERN_ZUORDNUNG findet es. Ohne sie meldete jedes Haus mit ausgebautem
       Kellergeschoss rot einen fehlenden Keller. */
    const istBeheiztesGeschoss = function (name) {
      const d = ZZ && ZZ.geschossAusText ? ZZ.geschossAusText(name) : null;
      return !!(d && d.kuerzel && alsGeschossKuerzel[d.kuerzel]);
    };

    /* DIE ART EINES BEREICHS.
     *
     * Grobkörnig und mit Absicht so: nur wo Plan und Zone dasselbe Bauteil
     * meinen, gilt der Bereich als geführt. Eine Garage wird von einem
     * Dachraum NICHT gedeckt, ein Keller nicht von einer Garage. Was sich
     * nicht einordnen lässt, fällt auf den Zeichenvergleich zurück und
     * bleibt damit ein Befund — die vorsichtige Seite.
     *
     * Die Liste steht hier oben, weil sie an zwei Stellen gebraucht wird:
     * beim Abgleich Plan gegen Zone und schon davor beim Einsammeln der
     * benannten Bereiche. */
    /* ART_AUS_NAME und artAusName stehen modulweit weiter oben. */

    /* WOHER DIE BENANNTEN BEREICHE KOMMEN — VIER WEGE, NICHT EINER.
     *
     * Bis hierher hing dieser Zähler an EINEM Feld: unbeheizt_benannt aus der
     * zweiten Lesung (und, falls vorhanden, aus der Gebäudeauslese). Kam es
     * leer zurück — und ein Modell kann dasselbe Blatt beim zweiten Mal
     * anders lesen —, meldete das Kontrollblatt in Grün „die Auslese hat
     * keinen unbeheizten Bereich benannt". Ein einziger stochastischer
     * Rückgabewert entschied damit über einen grünen Haken.
     *
     * Der vierte Weg ist der belastbarste und wurde bisher weggeworfen,
     * obwohl er längst erhoben wird: die EBENEN. Die zweite Lesung führt
     * jede Ebene auf, die ein Blatt zeigt ODER benennt, und sagt zu jeder,
     * ob sie als Grundriss gezeichnet ist. Eine Ebene, die
     *   - benannt, aber nicht gezeichnet ist,
     *   - nach ihrem Namen ein unbeheizter Bereich ist (Spitzboden, Keller,
     *     Abseite …) und
     *   - im Raumbuch nicht als beheiztes Geschoss geführt wird,
     * ist genau das: ein unbeheizter Bereich, den der Plan beim Namen nennt.
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": der Schnitt A-A beschriftet
     * den SPITZBODEN, ein Grundriss dazu liegt nicht vor.
     *
     * Eine Ebene ohne solchen Namen — „2. OG" etwa — wird hier NICHT
     * eingesammelt; ein nicht gezeichnetes Vollgeschoss ist ein fehlender
     * Grundriss und Sache von Z4. */
    /* (Eingesammelt wird sie in bereicheZusammenfuehren() weiter oben.) */
    /* AUSDRÜCKLICH ALS UNBEHEIZT BENANNT — und woher das kommt.
     *
     * Nicht jeder Name in der Liste unten ist gleich stark belegt. Eine nur
     * benannte, nicht gezeichnete Ebene ist ein Verdacht. „Das
     * Kellergeschoss ist unbeheizt" dagegen ist eine AUSSAGE, und zwar aus
     * den beiden Quellen, die genau danach gefragt werden: dem Feld
     * unbeheizte_bereiche der Gebäudeauslese und dem Feld unbeheizt_benannt
     * der zweiten Lesung. Steht dieselbe Ebene zugleich als beheiztes
     * Geschoss im Raumbuch, ist das kein Häkchen, sondern ein Widerspruch —
     * siehe weiter unten. */
    const ausdruecklichUnbeheizt = {};
    []
      .concat((p.plangebaeude && p.plangebaeude.unbeheizte_bereiche) || [])
      .concat(GK ? GK.unbeheiztVereinigen(blaetterMitGegenprobe(p)) : [])
      .forEach(function (x) {
        const k = String(x || "").trim().toLowerCase().replace(/\s+/g, " ");
        if (k) ausdruecklichUnbeheizt[k] = true;
      });
    /* Doppelt genannt heißt nicht doppelt vorhanden: „SPITZBODEN" aus der
       Ebenenliste und aus unbeheizt_benannt ist ein Spitzboden. Ohne diese
       Zusammenfassung stünde derselbe Bereich zweimal als Fehler da. */
    /* Die Zusammenführung steht in bereicheZusammenfuehren(): sie sammelt
       dieselben vier Quellen ein und macht aus mehreren Lesungen desselben
       Bereichs EINEN Eintrag. Der Zeichenvergleich allein reichte dafür
       nicht — „Garage" und „vermutlich Garage rechts im Bild" haben keinen
       gemeinsamen Wortlaut und sind trotzdem eine Garage. */
    const bereicheAlle = bereicheZusammenfuehren(p);
    /* EINBAUTEILE SIND AUCH KEINE BEREICHE (Kundenbefund vom 24.08.2026:
       „das sind keine räume sondern einbauteile und dem flur zuzurechnen").
       Liest eine Auslese die Garderobe nicht als Raum, sondern als
       „unbeheizten Bereich", entstand hier dieselbe Pflichtfrage, die am
       Raumbuch schon abgestellt ist — durch die Hintertür, als „Zone
       anlegen". Die EINE Erkennung dafür steht in MODUL_KI (istEinbauteil);
       hier wird sie nur angewandt, kein zweiter Filter. Ein Einbauteil ist
       kein Bereich: keine Zone, keine Frage, ein stiller Vermerk — seine
       Fläche steckt im Raum, in dem es steht (bei einer Garderobe im
       Regelfall der Flur). Echte Bereiche (Garage, Keller, Wintergarten)
       bleiben scharf; die Gegenprobe dazu steht im Selbsttest.
       GEMESSEN am echten Lauf „Hasenberg 10" am 25.08.2026: zwei
       Sperr-Fragen „Unbeheizter Bereich Garderobe/Schrank" bzw. „Garderobe
       (kleiner Raum bei Treppe)", beide ohne Gegenstand. */
    const kiEinbau = (typeof window !== "undefined" && window.MODUL_KI
      && window.MODUL_KI.istEinbauteil) ? window.MODUL_KI.istEinbauteil
      : function () { return false; };
    const bereiche = bereicheAlle.filter(function (b) { return !kiEinbau(b.name); });
    bereicheAlle.filter(function (b) { return kiEinbau(b.name); })
      .forEach(function (b, i) {
        raus.push(zeile({
          id: "zone_einbauteil" + (i ? "_" + i : ""),
          titel: "„" + b.name + "“ ist ein Einbauteil", art: "grenze",
          ist: 0, soll: null, einheit: "Bereiche", stufe: "hinweis",
          quelle_soll: "benannt in: " + (b.quellen || []).join(", "),
          text: "In den Unterlagen wurde „" + b.name + "“ als unbeheizter "
            + "Bereich genannt. Das ist ein Einbauteil und kein Raum oder "
            + "Bereich; seine Fläche steckt im Raum, in dem es steht (bei "
            + "einer Garderobe im Regelfall der Flur). Es wird nicht als "
            + "Zone geführt und erzeugt keine Frage.",
        }));
      });
    const lesungenZu = {};
    bereiche.forEach(function (b) { lesungenZu[schluessel(b.name)] = b.lesungen; });
    const benannt = bereiche.map(function (b) { return b.name; });
    const angelegt = (p.zonen || []).map((z) => String(z.name || "").toLowerCase());

    /* GESEHEN, ABER NICHT BESCHRIFTET.
     *
     * Die zweite Lesung zählt zusätzlich, wie viele umschlossene Flächen an
     * oder in der Gebäudekontur ohne Beschriftung stehen — der angebaute
     * Raum ohne Namen, die Garage ohne Wort. Der Endpunkt fragt danach, der
     * Kern reicht die Zahl durch, und GELESEN hat sie bisher niemand. Eine
     * gebaute Fähigkeit ohne Aufrufer.
     *
     * Sie steht bewusst als Warnung und nicht als Fehler: die Fläche kann
     * ein Vordach, ein Podest oder eine Terrasse sein. Was sie nicht darf,
     * ist stillschweigend verschwinden — und sie darf erst recht nicht neben
     * einem grünen Haken stehen, der behauptet, es gebe keinen unbeheizten
     * Bereich. */
    let unbenannt = 0, unbenanntBlatt = "";
    blaetterMitGegenprobe(p).forEach(function (b) {
      const n = zahl(b.gegenprobe && b.gegenprobe.unbeheizt_unbenannt, 0);
      if (n > unbenannt) { unbenannt = n; unbenanntBlatt = b.name || ""; }
    });
    if (unbenannt > 0) {
      raus.push(zeile({
        id: "zonen_unbenannt", titel: "Bereiche ohne Beschriftung",
        art: "befund",
        ist: (p.zonen || []).length, soll: null, einheit: "Bereiche",
        quelle_soll: "zweite Lesung von " + (unbenanntBlatt || "einem Blatt"),
        stufe: "warnung",
        text: "Die zweite Lesung sieht "
          + mz(unbenannt, "umschlossene Fläche", "umschlossene Flächen")
          + " an oder in der Gebäudekontur ohne Beschriftung. Solche Flächen sind "
          + "häufig ein unbeheizter Anbau: eine Garage, ein Windfang, ein "
          + "Abstellraum. Ein nicht angelegter unbeheizter Bereich fehlt mitsamt "
          + "der trennenden Wand und Decke in der Rechnung, und die Heizlast wird "
          + "dadurch zu klein.",
        abhilfe: "Am Plan nachsehen, was dort steht. Ist es beheizter Raum, gehört "
          + "er ins Raumbuch; ist es ein unbeheizter Anbau, gehört er als Zone "
          + "angelegt; ist es Vordach oder Terrasse, genügt ein Haken hier.",
      }));
    }

    if (!benannt.length) {
      /* „Keine Liste ausgewertet" und „die Auslese hat keine gefunden" sind
         zwei verschiedene Befunde. Die Gebäudeauslese liefert das Feld
         unbeheizte_bereiche immer mit; ist es leer und lag eine Auslese vor,
         dann ist das eine Antwort und keine Lücke.

         Unabhängig davon prüft das Werkzeug den Umkehrfall, den eine leere
         Liste nicht abdeckt: ein Raum, der nach seinem Namen unbeheizt ist,
         aber als beheizter Raum im Raumbuch steht. Der ist mit voller
         Innentemperatur angesetzt und treibt die Heizlast nach oben, während
         die trennende Decke fehlt. */
      const ausgelesen = !!(p.plangebaeude
        && Object.prototype.hasOwnProperty.call(p.plangebaeude, "unbeheizte_bereiche"));
      const UNBEHEIZT = new RegExp(
        "garage|carport|spitzboden|dachboden(?!treppe)|abseite|kaltdach|"
        + "scheune|stall|schuppen|lager\\s*kalt|tiefgarage", "i");
      const verdaechtig = (p.raeume || []).filter(function (r) {
        return UNBEHEIZT.test(String(r.name || ""));
      });
      if (verdaechtig.length) {
        raus.push(zeile({
          id: "zonen_verdacht", titel: "Als beheizt geführte Nebenräume",
          art: "befund",
          ist: verdaechtig.length, soll: 0, einheit: "Räume",
          quelle_soll: "Raumnamen aus dem Raumbuch", stufe: "warnung",
          text: nenne(verdaechtig) + (verdaechtig.length === 1 ? " steht" : " stehen")
            + " als beheizter Raum im Raumbuch, obwohl der Name auf einen unbeheizten "
            + "Bereich deutet. Dann wird mit voller Innentemperatur gerechnet und die "
            + "trennende Decke fehlt. Entweder ist der Raum wirklich beheizt, dann "
            + "genügt ein Haken hier, oder er gehört als unbeheizter Bereich geführt.",
          /* DIE ZEILE MUSS HALTEN, WAS IHR EIGENER TEXT VERSPRICHT.
             Sie sagt „dann genügt ein Haken hier" — und war zugleich eine
             Sperre, die nur mit schriftlicher Begründung wegging, weil ihr
             Zahlenpaar (1 Raum gegen 0) die allgemeine Regel auslöste. Ein
             Text, der einen Haken anbietet, und ein Knopf, der eine
             Begründung verlangt: das ist ein Widerspruch im Werkzeug selbst.
             Und die Frage ist mit einem Klick beantwortbar — ob der Raum
             beheizt ist, sieht man am Plan, nicht an einer Rechnung. Die
             Richtung des möglichen Fehlers ist ausserdem die sichtbare: ein
             mitgerechneter Nebenraum macht die Heizlast zu GROSS und steht
             namentlich im Raumbuch. */
          aufhebbar: true,
          aktionen: verdaechtig.map(function (r) {
            return { aktion: "kbZoneAnlegen",
              text: "„" + (r.name || r.id) + "“ als unbeheizten Bereich anlegen",
              data: { name: r.name || r.id } };
          }),
        }));
      }
      /* WANN „KEINER GEFUNDEN" EINE ANTWORT IST — UND WANN NICHT.
       *
       * Hier stand ein grüner Haken: „Die Auslese hat in den Unterlagen
       * keinen unbeheizten Bereich benannt; das ist eine Antwort und keine
       * Lücke." Das war falsch, und zwar auf die gefährlichste Art. Der
       * Haken beruhte nicht auf einem Beleg, sondern auf dem FEHLEN eines
       * Belegs: ein Feld kam leer zurück, und das leere Feld wurde als
       * Aussage über das Gebäude gelesen. Am Blatt „BV 2-0887 Ziolkowski"
       * steht im Schnitt A-A das Wort SPITZBODEN; eine Lesung, die es
       * übersieht, erzeugte damit einen grünen Haken auf einer Aussage, die
       * der Plan widerlegt. Die Folge ist keine Kleinigkeit: die oberste
       * Geschossdecke grenzt dann gegen die falsche Temperatur, und die
       * Heizlast fällt zu klein aus — in die unsichere Richtung.
       *
       * Grün gibt es hier nur noch gegen eine AUFZÄHLUNG. Die zweite Lesung
       * führt die Ebenen jedes Blattes auf. Sind alle aufgezählten Ebenen
       * gezeichnet und stehen alle als beheiztes Geschoss im Raumbuch, dann
       * ist die Frage beantwortet, weil hingesehen und abgezählt wurde —
       * nicht, weil nichts gemeldet wurde. Fehlt diese Aufzählung, bleibt
       * die Frage offen und steht als Grenze im Bericht.
       *
       * Der Umkehrfall, den auch eine vollständige Aufzählung nicht abdeckt,
       * bleibt unverändert geprüft: ein Raum, der nach seinem Namen
       * unbeheizt ist, aber als beheizter Raum im Raumbuch steht. */
      const ebenenAlle = GK
        ? GK.ebenenVereinigen(blaetterMitGegenprobe(p),
            ZZ ? ZZ.geschossAusText : null)
        : [];
      const offeneEbenen = ebenenAlle.filter(function (e) {
        return !e.gezeichnet || !istBeheiztesGeschoss(e.wortlaut);
      });
      const aufgezaehlt = ebenenAlle.length > 0 && offeneEbenen.length === 0
        && unbenannt === 0;
      if (aufgezaehlt) {
        raus.push(zeile({
          id: "zonen", titel: "Unbeheizte Bereiche", art: "pruefung",
          ist: (p.zonen || []).length, soll: 0, einheit: "Bereiche",
          quelle_soll: "zweite Lesung, Ebenen der Blätter: "
            + ebenenAlle.map(function (e) { return e.wortlaut; }).join(", "),
          stufe: "gut",
          text: "Angelegt sind " + (p.zonen || []).length + " unbeheizte Bereiche. "
            + "Die zweite Lesung hat die Ebenen der Blätter einzeln aufgezählt ("
            + ebenenAlle.map(function (e) { return e.wortlaut; }).join(", ")
            + "); jede davon ist als Grundriss gezeichnet und steht als beheiztes "
            + "Geschoss im Raumbuch. Eine Ebene, die nur benannt und nicht "
            + "gezeichnet wäre — ein Spitzboden im Schnitt etwa —, ist nicht "
            + "darunter, und unbeschriftete Flächen hat sie ebenfalls keine "
            + "gesehen."
            + (verdaechtig.length
              ? " Die Zeile darüber nennt Räume, deren Name dagegen spricht." : ""),
        }));
      } else if (ausgelesen) {
        raus.push(zeile({
          id: "zonen", titel: "Unbeheizte Bereiche", art: "grenze",
          ist: (p.zonen || []).length, soll: null, einheit: "Bereiche",
          quelle_soll: "Planauslese, Feld unbeheizte Bereiche", stufe: "hinweis",
          text: "Angelegt sind " + (p.zonen || []).length + " unbeheizte Bereiche. "
            + "Die Auslese hat in den Unterlagen keinen benannt. Das ist KEIN "
            + "Nachweis, dass es keinen gibt: die Auslese findet einen unbeheizten "
            + "Bereich nur, wenn der Plan ihn beschriftet und die Lesung das Wort "
            + "erfasst. Ein Spitzboden ohne Beschriftung, eine Abseite hinter einer "
            + "Drempelwand oder ein Kriechkeller bleiben damit unentdeckt. Ein nicht "
            + "angelegter unbeheizter Bereich fehlt mitsamt der trennenden Decke in "
            + "der Rechnung, und die Heizlast wird dadurch zu klein."
            + (ebenenAlle.length
              ? " Aufgezählt sind die Ebenen "
                + ebenenAlle.map(function (e) { return e.wortlaut; }).join(", ")
                + "; nicht abgedeckt "
                + (offeneEbenen.length === 1 ? "ist " : "sind ")
                + offeneEbenen.map(function (e) {
                    return "„" + e.wortlaut + "“ ("
                      + (e.gezeichnet ? "gezeichnet, aber nicht im Raumbuch"
                        : "nur benannt, kein Grundriss") + ")"; }).join(", ")
              : " Eine Aufzählung der Ebenen, gegen die sich das halten ließe, "
                + "liegt nicht vor."),
          abhilfe: "Einen Schnitt auswerten — dort steht der Spitzboden fast immer "
            + "benannt — oder den Bereich von Hand als unbeheizte Zone anlegen.",
        }));
      } else {
        raus.push(zeile({
          id: "zonen", titel: "Unbeheizte Bereiche", art: "grenze",
          ist: (p.zonen || []).length, soll: null, einheit: "Bereiche",
          stufe: "offen",
          text: "Angelegt sind " + (p.zonen || []).length + " unbeheizte Bereiche. "
            + "Aus den Unterlagen ist keine Liste unbeheizter Bereiche ausgewertet "
            + "worden; die Zahl ist damit nicht gegengeprüft. Ein nicht angelegter "
            + "Keller oder Spitzboden fehlt mitsamt der trennenden Decke in der "
            + "Rechnung.",
          abhilfe: "Einen Schnitt oder das Gebäudeblatt auswerten lassen, oder eine "
            + "zweite Lesung laufen lassen; sie nennt die unbeheizten Bereiche jedes "
            + "Blattes beim Namen.",
        }));
      }
      return raus;
    }
    const passt = function (liste, s) {
      return liste.some(function (a) {
        return a && (a.indexOf(s) >= 0 || s.indexOf(a) >= 0);
      });
    };
    /* DERSELBE BEREICH UNTER ZWEI NAMEN.
     *
     * Der Plan schreibt „SPITZBODEN", das Werkzeug legt die Zone
     * „Unbeheizter Dachraum" an — dasselbe Bauteil, dieselbe Temperatur,
     * zwei Wörter ohne einen gemeinsamen Buchstaben. Der Zeichenvergleich
     * darüber sieht das nicht und meldete rot einen fehlenden Bereich, der
     * vollständig in der Rechnung steht. GEMESSEN am Blatt „BV 2-0887
     * Ziolkowski": ein Fehler, der jeden Bericht aufhielt, obwohl das
     * Dachgeschoss richtig gerechnet war.
     *
     * Verglichen wird deshalb zusätzlich die ART des Bereichs — siehe
     * ART_AUS_NAME weiter oben in dieser Funktion.
     *
     * Die Art einer angelegten Zone kommt aus drei Quellen, und die
       belastbarste zuerst: die gewählte Lage nach DIN/TS 12831-1 Tabelle 5
       (ihre Gruppe „Keller", „Dachraum", „Treppenhaus" ist genau diese
       Angabe), danach die Kennung, zuletzt der angezeigte Name. */
    const DZ = (typeof window !== "undefined") && window.DATEN_ZONENLAGEN;
    const GRUPPE_ZU_ART = { "Keller": "keller", "Dachraum": "dachraum",
                            "Treppenhaus": "treppenhaus" };
    const artDerZone = function (z) {
      const l = (DZ && DZ.finde && z.lage) ? DZ.finde(z.lage) : null;
      if (l && GRUPPE_ZU_ART[l.gruppe]) return GRUPPE_ZU_ART[l.gruppe];
      return artAusName(z.id) || artAusName(z.name);
    };
    const artenAngelegt = (p.zonen || []).map(artDerZone).filter(Boolean);
    const alsGeschoss = [];
    const widerspruch = [];
    const nachArt = [];
    const fehlend = benannt.filter(function (b) {
      const s = b.toLowerCase();
      if (passt(angelegt, s)) return false;
      const art = artAusName(b);
      if (art && artenAngelegt.indexOf(art) >= 0) {
        const z = (p.zonen || []).find(function (x) { return artDerZone(x) === art; });
        nachArt.push("„" + b + "“ als " + (z && z.name ? "„" + z.name + "“" : art));
        return false;
      }
      if (istBeheiztesGeschoss(b)) {
        const k = ZZ.geschossAusText(b).kuerzel;
        /* WIDERSPRUCH statt Häkchen.
           Die Unterlagen sagen ausdrücklich „unbeheizt", das Raumbuch führt
           dasselbe Geschoss mit 20 °C. Beides zusammen geht nicht. Bis hier
           landete das im grünen Satz „das ist zulässig und die genauere
           Rechnung, solange der Bereich wirklich beheizt wird" — ein Haken,
           dessen Bedingung der Plan gerade widerlegt. */
        if (ausdruecklichUnbeheizt[s]) {
          /* Ein Geschoss, eine Zeile. Derselbe Keller steht in den Unterlagen
             gern zweimal — einmal als „KELLERGESCHOSS", einmal als
             „Kellergeschoss (KELLER, FLUR, ...)". Zwei Zeilen mit derselben
             Kennung wären zwei Haken fuer eine Entscheidung. */
          const vorh = widerspruch.find(function (x) { return x.kuerzel === k; });
          if (vorh) { if (vorh.namen.indexOf(b) < 0) vorh.namen.push(b); }
          else {
            widerspruch.push({ namen: [b], kuerzel: k,
                               geschoss: alsGeschossKuerzel[k] || b });
          }
          return false;
        }
        alsGeschoss.push(b + " (Geschoss " + alsGeschossKuerzel[k] + ")");
        return false;
      }
      if (passt(imRaumbuch, s)) { alsGeschoss.push(b); return false; }
      return true;
    });

    /* Die Zeile zum Widerspruch. Sie sperrt NICHT: das Werkzeug kann nicht
       wissen, welche der beiden Aussagen stimmt, und ein Ergebnis soll
       trotzdem herauskommen. Sie sagt dafür, was auf dem Spiel steht — die
       Größenordnung ist am Blatt „BV 2-0887 Ziolkowski" gemessen. */
    widerspruch.forEach(function (w) {
      const drin = (p.raeume || []).filter(function (r) {
        const d = ZZ && ZZ.geschossAusText ? ZZ.geschossAusText(r.geschoss || "") : null;
        return d && d.kuerzel === w.kuerzel;
      });
      const flaeche = drin.reduce(function (s2, r) { return s2 + zahl(r.A, 0); }, 0);
      raus.push(zeile({
        id: "zone_widerspruch_" + w.kuerzel,
        titel: "Beheizt oder unbeheizt: „" + w.namen[0] + "“",
        art: "befund",
        ist: drin.length, soll: 0, einheit: "Räume",
        quelle_soll: "die Unterlagen nennen den Bereich ausdrücklich unbeheizt",
        stufe: "warnung",
        text: "Die Unterlagen nennen "
          + w.namen.map(function (n) { return "„" + n + "“"; }).join(" und ")
          + " ausdrücklich als "
          + (w.namen.length === 1 ? "unbeheizten Bereich" : "unbeheizte Bereiche")
          + " — dasselbe Geschoss " + w.geschoss + ". Im Raumbuch "
          + (drin.length === 1
            ? "steht dazu 1 Raum" : "stehen dazu " + drin.length + " Räume")
          + " mit zusammen " + flaeche.toFixed(2).replace(".", ",") + " m² als BEHEIZT, also mit "
          + "voller Innentemperatur" + (drin.length ? " (" + nenne(drin) + ")" : "")
          + ". Beides zusammen kann nicht stimmen, und der Unterschied ist "
          + "groß: der unbeheizte Fall nimmt diese Fläche aus der beheizten "
          + "Hülle heraus und legt dafür die trennende Decke zum Geschoss "
          + "darüber ein. Solange der Widerspruch steht, ist die Fläche je "
          + "Quadratmeter nicht mit einem Kennwert vergleichbar — der Bezug "
          + "der Typologie ist die beheizte Wohnfläche.",
        abhilfe: "Am Plan nachsehen, ob dort Heizkörper, Heizkreise oder eine "
          + "Nutzung als Aufenthaltsraum eingetragen sind. Ist der Bereich "
          + "beheizt, gehört das mit Fundstelle hier vermerkt. Ist er es "
          + "nicht, gehören seine Räume aus dem Raumbuch heraus und der "
          + "Bereich als unbeheizte Zone angelegt.",
        /* KEIN HAKEN AUF EINEM WIDERSPRUCH.
           Bis zum 23.08.2026 stand hier ein Kästchen „zur Kenntnis
           genommen". Ein Klick nahm die Zeile weg und hob die Ampel — ohne
           dass irgendwo stand, welche der beiden Aussagen gilt. Jetzt gibt
           es zwei Wege, und beide sagen es: entweder wird der Bereich mit
           Fundstelle als beheizt vermerkt, oder er wird als unbeheizte Zone
           angelegt. Die Zeile bleibt, bis eines von beidem geschehen ist. */
        aufhebbar: false,
        begruendung_knopf: "beheizt — mit Fundstelle vermerken",
        begruendung_frage: "Die Unterlagen nennen „" + w.namen[0] + "“ "
          + "unbeheizt, das Raumbuch führt "
          + (drin.length === 1 ? "1 Raum" : drin.length + " Räume")
          + " mit " + flaeche.toFixed(2).replace(".", ",")
          + " m² als beheizt. Eine der beiden Aussagen stimmt.\n\n"
          + "Wenn der Bereich beheizt ist: woran ist das am Plan zu sehen? "
          + "Der Vermerk erscheint im Bericht.\n\nBeispiel: Heizkreise im "
          + "Kellergrundriss eingetragen, Blatt 1, am 23.08.2026 geprüft.",
        aktionen: [{ aktion: "kbZoneAnlegen",
          text: "unbeheizt — Bereich anlegen",
          data: { name: w.namen[0] } }],
      }));
    });

    /* ANGELEGT UND WIRKUNGSLOS.
     *
     * Eine Zone, auf die kein einziges Bauteil zeigt, ist nicht in der
     * Rechnung — sie liefert 0 W, und der grüne Haken unten behauptet
     * trotzdem, der Bereich stehe drin. GEMESSEN am echten Blattsatz „BA
     * 01–08, Am Gunnebach 9" am 24.08.2026: die Garage war als Zone da, mit
     * belegter Lage, und kein Raum hatte eine Wand zu ihr. Der rote Befund
     * war weg und die trennende Wand fehlte weiter.
     *
     * Die Wand lässt sich nicht ausrechnen — ihre Länge steht in keiner
     * Zahl, die das Werkzeug hat, und eine geschätzte Länge wäre eine
     * erfundene Fläche. Was das Werkzeug kann, ist es SAGEN. Die Zeile ist
     * mit einem Klick zu erledigen, denn eine freistehende Garage berührt
     * die beheizte Hülle wirklich nicht; dann ist 0 W richtig. */
    const beruehrt = {};
    (p.raeume || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (b) {
        if (b && b.grenzt_an && b.grenzt_an.typ === "zone" && b.grenzt_an.ref) {
          beruehrt[String(b.grenzt_an.ref)] = true;
        }
      });
    });
    const wirkungslos = (p.zonen || []).filter(function (z) {
      return !beruehrt[String(z.id)];
    });
    /* DAS WERKZEUG LÖST DEN FALL SELBST, SOWEIT ES IHN WEISS.
     *
     * Drei Lagen, drei Wege (Kundenbefund vom 24.08.2026: „das muss er auch
     * selber lösen"):
     *   frei      Die Lesungen sagen freistehend, oder der Bearbeiter hat
     *             [Steht frei] geklickt: 0 W ist richtig, die Zeile ist
     *             still grün.
     *   angebaut  Die Lesungen sagen angebaut: die trennende Wand legt
     *             zonenWaendeErgaenzen() als gekennzeichnete Annahme an,
     *             und diese Zeile entsteht gar nicht mehr (die Zone ist
     *             dann berührt). Konnte keine Wand entstehen, bleibt die
     *             Frage — mit dem Beleg im Text.
     *   unbekannt EIN-Klick-Frage mit den zwei Antworten [Angebaut an:
     *             Raumwahl] und [Steht frei]. Die vorsichtige Richtung
     *             steht dabei: eine fehlende Trennwand macht die Heizlast
     *             zu klein. */
    wirkungslos.forEach(function (z, i) {
      const id = "zone_ohne_bauteil" + (i ? "_" + i : "");
      const nm = z.name || z.id;
      const wissen = zonenLageWissen(p, z);
      if (z.freistehend || (wissen && wissen.urteil === "frei")) {
        raus.push(zeile({
          id: id, titel: "Bereich „" + nm + "“ steht frei",
          art: "pruefung", stufe: "gut",
          ist: 0, soll: 0, einheit: "Bauteile",
          quelle_soll: z.freistehend
            ? "vom Bearbeiter bestätigt: freistehend"
            : "aus der Lesung: „" + wissen.beleg + "“",
          text: "„" + nm + "“ ist freistehend"
            + (z.freistehend
              ? " (mit einem Klick bestätigt)"
              : " — das sagt die Lesung („" + wissen.beleg + "“)")
            + ": der Bereich berührt die beheizte Hülle nicht, kein Bauteil "
            + "grenzt an ihn, und 0 W sind richtig.",
          aktionen: z.freistehend
            ? [{ aktion: "kbZoneFreiZurueck",
                 text: "doch angebaut — Antwort zurücknehmen",
                 data: { name: String(z.id) } }]
            : undefined,
        }));
        return;
      }
      raus.push(zeile({
        id: id, titel: "Bereich „" + nm + "“ ohne trennendes Bauteil",
        art: "befund", stufe: "warnung",
        ist: 0, soll: 1, einheit: "Bauteile",
        quelle_soll: "Bauteile der Räume, die auf diese Zone zeigen",
        aufhebbar: true,
        text: "„" + nm + "“ ist als unbeheizter Bereich angelegt, aber kein "
          + "Bauteil eines Raumes zeigt darauf. Damit geht der Bereich mit 0 W "
          + "in die Heizlast ein — angelegt und wirkungslos. "
          + (wissen && wissen.urteil === "angebaut"
            ? "Die Lesung sagt, er ist angebaut („" + wissen.beleg + "“); eine "
              + "trennende Wand liess sich aber nicht anlegen, weil kein "
              + "angrenzender Raum mit belegter Fläche zu finden ist. "
            : "")
          + "Ist der Bereich angebaut, fehlt die trennende Wand oder Decke — "
          + "und die Heizlast ist ohne sie zu klein. Steht er frei, ist 0 W "
          + "richtig. Ein Klick genügt.",
        abhilfe: "Die Länge der gemeinsamen Wand am Plan abgreifen und beim "
          + "angrenzenden Raum als Bauteil gegen diesen Bereich eintragen.",
        aktionen: [
          { aktion: "kbZoneAngebaut", text: "Angebaut an: Raum wählen",
            data: { name: String(z.id) } },
          { aktion: "kbZoneFrei", text: "Steht frei — 0 W ist richtig",
            data: { name: String(z.id) } },
        ],
      }));
    });

    /* WORAUF DER HAKEN UNTEN BERUHEN DARF.
     *
     * Gedeckt ist ein benannter Bereich nur dann, wenn er entweder als Zone
     * angelegt ist, unter anderem Namen als dieselbe Art geführt wird oder
     * als beheiztes Geschoss mit eigenen Räumen in der Rechnung steht. Ein
     * Bereich, der oben als Widerspruch geführt wird, ist keines von beidem:
     * über ihn sagen Plan und Raumbuch Verschiedenes, und welche der beiden
     * Aussagen gilt, ist offen. Er gehört deshalb weder in den Zähler noch in
     * den Nenner dieser Zeile.
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski", echter Durchlauf 23.08.2026:
     * angelegt war EINE Zone, benannt waren ZWEI Bereiche, und die Zeile
     * stand grün mit „1 von 2" und nannte im Satz beide beim Namen —
     * darunter das Kellergeschoss, das die Zeile darüber als ungeklärt
     * führte. */
    const strittigK = {};
    widerspruch.forEach(function (w) {
      w.namen.forEach(function (n) {
        strittigK[String(n).toLowerCase().replace(/\s+/g, " ")] = true;
      });
    });
    const strittig = [];
    const gedeckt = [];
    benannt.forEach(function (b) {
      const k = String(b).toLowerCase().replace(/\s+/g, " ");
      if (strittigK[k]) strittig.push(b); else gedeckt.push(b);
    });

    if (fehlend.length) {
      fehlend.forEach(function (b, i) {
        /* Steht der Bereich in mehreren Lesungen, gehören alle in die Zeile.
           Sonst behauptet sie eine Zusammenführung, die niemand nachprüfen
           kann — und ein Bearbeiter, der zwei Garagen kennt, sähe nicht, dass
           das Werkzeug nur eine führt. */
        const les = (lesungenZu[schluessel(b)] || []).filter(function (x) {
          return schluessel(x) !== schluessel(b);
        });
        raus.push(zeile({
          id: "zone_fehlt_" + i, titel: "Unbeheizter Bereich „" + b + "“",
          art: "befund",
          ist: 0, soll: 1, einheit: "Bereich",
          quelle_soll: "in den Unterlagen benannt", stufe: "fehler",
          text: "„" + b + "“ ist in den Unterlagen als unbeheizter Bereich benannt, im "
            + "Werkzeug ist dazu keine Zone angelegt. Ohne Zone fehlen die trennenden "
            + "Bauteile in der Rechnung oder sie sind gegen die falsche Temperatur "
            + "angesetzt."
            + (les.length
              ? " Dieselbe Sache steht in den Unterlagen noch als "
                + les.map(function (x) { return "„" + x + "“"; }).join(" und ")
                + "; das Werkzeug führt sie als EINEN Bereich, weil keine einzelne "
                + "Aufzählung mehr als einen nennt. Sind es in Wirklichkeit mehrere, "
                + "gehört jeder weitere unter „Unbeheizte Bereiche" + "“ von Hand "
                + "angelegt."
              : ""),
          aktionen: [{ aktion: "kbZoneAnlegen", text: "Zone anlegen", data: { name: b } }],
        }));
      });
    } else if (benannt.length) {
      raus.push(zeile({
        id: "zonen", titel: "Unbeheizte Bereiche", art: "pruefung",
        /* Der NENNER ist die Zahl der benannten Bereiche, nicht die Zahl der
           bestandenen Fälle. Ein Nenner, der nur die Treffer enthält, meldet
           immer „n von n". */
        ist: gedeckt.length, soll: benannt.length, einheit: "Bereiche",
        quelle_soll: "in den Unterlagen benannt: " + benannt.join(", "),
        stufe: strittig.length ? "hinweis" : "gut",
        /* EINE ZUSAMMENFASSUNG SPERRT NICHT ZWEIMAL.
           Steht ein Bereich strittig da, geht das Zahlenpaar dieser Zeile
           auseinander und sie wurde damit selbst zur Sperre — für genau
           denselben Sachverhalt, den die Zeile „Beheizt oder unbeheizt"
           darüber schon sperrt. Zwei Sperren für eine Entscheidung sind eine
           zu viel: der Bearbeiter begründet zweimal dasselbe und weiß beim
           zweiten Mal nicht, was er beantwortet. */
        aufhebbar: true,
        text: (strittig.length
          ? "Von " + mz(benannt.length, "benannten unbeheizten Bereich",
                        "benannten unbeheizten Bereichen") + " "
            + (gedeckt.length === 1 ? "steht 1 in der Rechnung"
              : gedeckt.length + " in der Rechnung")
            + (gedeckt.length ? ": " : ". ")
          : "Jeder in den Unterlagen benannte unbeheizte Bereich ist als Bereich "
            + "geführt: ")
          + (gedeckt.length ? gedeckt.join(", ") + "." : "")
          /* Wenn Plan und Zone verschieden heißen, muss die Zuordnung
             dastehen. Sonst behauptet die grüne Zeile eine Deckung, die
             niemand nachprüfen kann. */
          + (nachArt.length
            ? " Geführt " + (nachArt.length === 1 ? "wird " : "werden ")
              + nachArt.join(", ") + "; die Namen unterscheiden sich, der "
              + "Bereich ist derselbe."
            : "")
          + (alsGeschoss.length
            ? " Davon " + (alsGeschoss.length === 1 ? "ist " : "sind ")
              + alsGeschoss.map(function (x) { return "„" + x + "“"; }).join(", ")
              + " als beheiztes Geschoss mit eigenen Räumen geführt und nicht als "
              + "unbeheizte Zone. Das ist zulässig und die genauere Rechnung, "
              + "solange der Bereich wirklich beheizt wird."
            : "")
          /* WAS DIESE ZEILE NICHT MITTRÄGT.
             Ein Bereich, über den zwei Unterlagen Verschiedenes sagen, ist
             nicht gedeckt. Er stand bis zum 23.08.2026 trotzdem in diesem
             Satz — der Widerspruchszweig oben nahm ihn aus `fehlend`, aber
             niemand nahm ihn aus dem grünen Text. Der Haken behauptete damit
             eine Deckung, die zwei Zeilen darüber ausdrücklich offen ist. */
          + (strittig.length
            ? " Nicht mitgezählt " + (strittig.length === 1 ? "ist " : "sind ")
              + strittig.map(function (x) { return "„" + x + "“"; }).join(", ")
              + ": dort widersprechen sich Plan und Raumbuch, und das steht in "
              + "einer eigenen Zeile."
            : ""),
      }));
    }
    return raus;
  }

  /* --- Z6  Räume ohne Hüllbauteil, Räume ohne Fenster ------------------ */
  /** Die offenen Fragen, die beim Einlesen der Pläne entstanden sind.
   *
   *  app.js sammelt sie unter p.offeneFragen: welches Geschoss ein Blatt
   *  zeigt, welche Höhe ein Geschoss hat, welcher unbeheizte Bereich noch
   *  keine eigene Hülle hat, ob eine Auslese abgeschnitten war. Gelesen hat
   *  sie bisher NIEMAND. Das Kontrollblatt kannte sie nicht, der Bericht
   *  auch nicht -- und trotzdem meldete app.js nach dem Erzeugen der
   *  Bauteile "N Punkte stehen im Kontrollblatt". Dort stand keiner davon.
   *
   *  Sie stehen als "offen" und nicht als "fehler": es sind Fragen, keine
   *  Widersprüche. Beantwortet werden sie über den Haken wie jede andere
   *  Zeile, dann verlieren sie die Sperrwirkung.
   *
   *  MIT EINER AUSNAHME. Wer die Frage aufwirft, sagt jetzt dazu, ob sie
   *  überhaupt zu beantworten ist: `art: "grenze"` an der Frage heißt, dass
   *  weder Werkzeug noch Bearbeiter sie am Bildschirm schließen können —
   *  eine benannte Annahme mit Fundstelle etwa, oder ein abgebrochener
   *  Auslesedurchgang. Solche Fragen gehören in den Bericht und nicht in die
   *  Liste; sie standen sonst auf jedem Projekt gleichlautend da.
   *  Wer nichts angibt, bekommt "befund": das ist die sichere Seite, denn
   *  dabei kann keine Frage still aus der Liste verschwinden. */
  /** Die Kennung einer offenen Frage kommt aus ihrem TEXT, nie aus ihrer
   *  Position. Vorher stand der Listenindex in der Kennung („frage_6_…"),
   *  und p.offeneFragen wird bei jedem Durchlauf umgebaut (bauteileErgaenzen
   *  nimmt seine Themen heraus und hängt sie neu an). GEMESSEN am 24.08.2026
   *  im Browser am Echtlauf-Stand Ziolkowski: „Außenwände EG/OG" zur
   *  Kenntnis genommen (frage_6, frage_7) → nächstes Zeichnen schiebt eine
   *  Fensterzeile davor → dieselben Zeilen heißen frage_7/frage_8, die
   *  Bestätigung greift ins Leere, die abgenickte Frage steht wieder da —
   *  und frage_7 bestätigt jetzt die FALSCHE Zeile. Genau die Befunde
   *  „beantwortete Frage bleibt stehen" und „abgenickte Fragen tauchen
   *  wieder auf (8→9)" der Abnahme. Ändert sich der Text, ändert sich die
   *  Kennung — dann hat sich die Grundlage geändert, und die Frage kommt zu
   *  Recht wieder. */
  function frageKennung(text) {
    let h = 0;
    for (let j = 0; j < text.length; j++) {
      h = (h * 31 + text.charCodeAt(j)) % 2176782336;   // 36^6
    }
    return "frage_" + text.slice(0, 24).replace(/[^A-Za-z0-9]+/g, "_")
      + "_" + h.toString(36);
  }

  function zaehlerOffeneFragen(p) {
    const fragen = (p && p.offeneFragen) || [];
    const gesehen = {};
    const raus = [];
    fragen.forEach(function (x, i) {
      const text = String((x && x.frage) || "").trim();
      if (!text || gesehen[text]) return;
      gesehen[text] = true;
      raus.push(zeile({
        id: frageKennung(text),
        /* Die alte, indexgebundene Kennung als Zweitschlüssel: unter ihr
           liegen die Bestätigungen bereits gespeicherter Projekte. Der
           Prüfkern schlägt sie nach (bestaetigungenAnwenden, alt_id), damit
           kein schon abgenickter Punkt durch den Kennungswechsel wieder
           aufsteht. */
        alt_id: "frage_" + i + "_" + text.slice(0, 24).replace(/[^A-Za-z0-9]+/g, "_"),
        gruppe: "zaehler",
        art: (x && x.art === "grenze") ? "grenze" : "befund",
        titel: (x.thema || "Offene Frage") + (x.blatt ? " · " + x.blatt : ""),
        ist: null, soll: null,
        /* DREI STUFEN, NICHT ZWEI.
           „grenze"      -> Hinweis, nicht zu beantworten.
           „widerspruch" -> FEHLER. Zwei Angaben desselben Blattes schließen
                            einander aus; das ist keine Frage, sondern ein
                            Widerspruch, und er sperrt den Bericht. app.js
                            hatte das für die Höhenbefunde immer so gemeint
                            („Ein Widerspruch bleibt eine offene Zeile und
                            sperrt"), nur kam die Kennzeichnung hier nie an:
                            jeder Widerspruch landete auf „offen". GEMESSEN
                            am 23.08.2026 im Browser: alle Geschosshöhen um
                            0,50 m kleiner -> vier Höhenbefunde in der Liste,
                            Kopf trotzdem „0 Fehler", Bericht frei.
           alles Übrige  -> offene Frage, abhakbar. */
        stufe: (x && x.art === "grenze") ? "hinweis"
             : ((x && x.art === "widerspruch") ? "fehler" : "offen"),
        text: text,
        abhilfe: (x && x.abhilfe) || null,
      }));
    });
    return raus;
  }

  function zaehlerHuelle(p) {
    const raus = [];
    const rs = (p.raeume || []);
    if (!rs.length) return raus;
    const typ = {};
    (p.bauteiltypen || []).forEach(function (t) { typ[t.id] = t; });

    /* ZWEI FRAGEN, DIE HIER EINMAL EINE WAREN
     *
     * Bis hierher stand hier eine Zeile: „Räume ohne Bauteil zur Hülle". Sie
     * fragte in Wahrheit zwei Dinge auf einmal und beantwortete beide falsch:
     *
     *   senkrecht   Hat der Raum eine Außenwand? Das entscheidet der
     *               Grundriss und sonst nichts. Ein innenliegender Flur hat
     *               keine, auch nicht im obersten Geschoss.
     *   waagerecht  Hat der Raum eine Fläche gegen kalt nach oben oder unten?
     *               Das entscheidet das GESCHOSS, für alle seine Räume
     *               gemeinsam.
     *
     * Beides zusammen ergab zwei falsche Ergebnisse. Erstens: „OG FLUR hat
     * kein Bauteil zur Hülle" — rot, obwohl der Raum nachweislich in der
     * Mitte des Obergeschosses liegt (Blatt BV 2-0887 Ziolkowski) und
     * richtigerweise keine Außenwand hat. Zweitens, und das ist der teurere
     * Fehler: ein Raum MIT Außenwand, dem die Geschossdecke gegen den
     * Spitzboden fehlt, kam gar nicht vor — die Außenwand ließ ihn als
     * „hat Hüllbauteil" durchgehen. Genau die stille Sorte Fehler, für die
     * dieses Blatt gebaut ist.
     *
     * Deshalb jetzt zwei getrennte Zähler. Keiner ist milder als der alte,
     * der zweite ist deutlich schärfer. */
    const ZH = zuordnung();
    const geschosseH = [];
    rs.forEach(function (r) {
      if (r.geschoss && geschosseH.indexOf(r.geschoss) < 0) geschosseH.push(r.geschoss);
    });
    /* SENKRECHTE HÜLLE, nicht „grenzt an Außenluft".
     *
     * Hier stand allein `typ === "aussen"`. Seit die Wand eines
     * Kellergeschosses gegen das ERDREICH rechnet (app.js, bauteileErgaenzen),
     * traf das jeden Kellerraum: KG KELLER und KG FLUR des Blattes
     * „BV 2-0887 Ziolkowski" standen rot als „Raum ohne Außenwand", obwohl
     * beide eine 22 bzw. 24 m² große Wand haben — sie liegt nur im Erdreich.
     * Gefragt ist, ob der Raum eine senkrechte Hüllfläche hat, nicht wogegen
     * sie rechnet. Die WAAGERECHTE erdberührte Fläche (Bodenplatte, Sohle)
     * gilt weiterhin NICHT als Außenwand; sonst hätte jeder Raum des
     * untersten Geschosses eine. */
    const hatAussenwand = function (r) {
      return (r.bauteile || []).some(function (b) {
        const t = (b.grenzt_an && b.grenzt_an.typ) || "";
        if (t === "aussen") return true;
        if (t !== "erdreich") return false;
        return b.art === "aussenwand" || /wand/i.test(b.name || "");
      });
    };

    /* --- Z6a  Raum ohne Außenwand, obwohl er eine haben müsste ---------- */
    /* WORAUF STÜTZT SICH „der Raum liegt innen"?
     *
     * Auf zwei sehr verschiedene Dinge, und das stand bisher in einem Satz.
     *   gelesen      In der Raumzeile steht eine ausdrückliche Null. Die hat
     *                jemand am Plan gezählt — die Auslese oder der
     *                Bearbeiter. Das ist eine Ablesung.
     *   aus dem Namen  Der Plan sagt nichts, und „WC", „Flur", „Abstellraum"
     *                liegen üblicherweise innen. Das ist eine Erfahrung.
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": das EG WC kam in einer Lesung
     * mit null Außenwänden zurück, in einer anderen mit einer; im Grundriss
     * liegt es an der Nordfassade, mit Fenstersturz darüber. Die Zeile
     * schrieb dazu „grenzt in der Fläche rundum an beheizte Räume" und stand
     * grün. Ein grüner Haken auf einer Erfahrung ist der teuerste Satz in
     * diesem Blatt; deshalb trägt ihn nur noch die Ablesung, und auch die mit
     * dem Verweis auf die Umfangsprobe, die sie von außen prüft. */
    const ohneAussenwand = [], innenGelesen = [], innenAusName = [];
    const nullGelesen = function (r) {
      const n = Number(r && r.aussenwaende);
      return Number.isFinite(n) && Math.round(n) === 0;
    };
    rs.filter(function (r) { return !hatAussenwand(r); }).forEach(function (r) {
      const zul = (ZH && ZH.innenraumZulaessig)
        ? ZH.innenraumZulaessig(r, geschosseH) : { ja: false };
      if (!zul.ja) { ohneAussenwand.push(r); return; }
      (nullGelesen(r) ? innenGelesen : innenAusName).push(r);
    });
    const innenOk = innenGelesen.concat(innenAusName);
    if (ohneAussenwand.length) {
      raus.push(zeile({
        id: "ohne_huelle", titel: "Räume ohne Außenwand", art: "befund",
        ist: ohneAussenwand.length, soll: 0, einheit: "Räume", stufe: folgeStufe(p),
        quelle_soll: "Raumart und Raumname sprechen für eine Außenwand",
        text: nenne(ohneAussenwand) + (ohneAussenwand.length === 1 ? " hat" : " haben")
          + " kein Bauteil gegen Außenluft. Nach Raumart und Raumname "
          + (ohneAussenwand.length === 1 ? "ist das kein" : "sind das keine")
          + " innenliegende" + (ohneAussenwand.length === 1 ? "r" : "n")
          + " Nebenraum, also müsste dort eine Außenwand liegen. Eine vergessene "
          + "Außenwand fällt am Ergebnis nicht auf: die Raumzeile sieht gefüllt aus "
          + "und die Heizlast ist zu klein. Entweder die Wand nachtragen oder in der "
          + "Raumzeile null Außenwände eintragen, dann gilt der Raum als "
          + "innenliegend." + folgeVermerk(p),
      }));
    } else {
      raus.push(zeile({
        id: "ohne_huelle", titel: "Räume ohne Außenwand", art: "pruefung",
        ist: 0, soll: 0, einheit: "Räume", stufe: "gut",
        quelle_soll: "Raumart, Raumname und Angabe im Plan",
        text: (rs.length === 1 ? "Der eine Raum hat" : "Alle " + rs.length
            + " Räume haben")
          + " eine Außenwand, oder "
          + (rs.length === 1 ? "er ist" : "sie sind")
          + " als innenliegender Nebenraum ausgewiesen."
          + (innenGelesen.length
            ? " Ohne Außenwand " + (innenGelesen.length === 1 ? "ist " : "sind ")
              + nenne(innenGelesen) + "; dort "
              + (innenGelesen.length === 1 ? "steht" : "stehen")
              + " in der Raumzeile ausdrücklich null Außenwände, es ist also am "
              + "Plan gezählt worden. Der Transmissionsanteil der Wände ist dann "
              + "tatsächlich null. Ob die Zählung stimmt, prüft von außen die "
              + "Zeile „Außenwände gegen den Umfang“."
            : ""),
      }));
    }
    /* KEIN GRÜNER HAKEN AUF EINER ERFAHRUNG. Diese Räume liegen innen, weil
       ihr Name das nahelegt und der Plan schweigt. Trifft es nicht zu, fehlt
       die ganze Außenwand des Raums in der Rechnung. */
    if (innenAusName.length) {
      raus.push(zeile({
        id: "innen_aus_name", titel: "Innenliegend nach Raumname",
        art: "grenze",
        ist: innenAusName.length, soll: null, einheit: "Räume", stufe: "hinweis",
        quelle_soll: "eine im Plan gezählte Zahl der Außenwände",
        text: nenne(innenAusName) + (innenAusName.length === 1 ? " hat" : " haben")
          + " kein Bauteil gegen Außenluft, und der Plan gibt für "
          + (innenAusName.length === 1 ? "diesen Raum" : "diese Räume")
          + " keine Zahl der Außenwände her. ANNAHME des Werkzeugs: Raumart und "
          + "Raumname weisen "
          + (innenAusName.length === 1 ? "den Raum" : "sie")
          + " als innenliegenden Nebenraum aus, und Flure, Dielen, WCs, "
          + "Abstellräume und Technikräume liegen üblicherweise innen. Das ist "
          + "eine Erfahrung und kein Beleg aus der Unterlage. Trifft sie nicht zu, "
          + "fehlt die ganze Außenwand dieses Raums in der Rechnung, die Raumzeile "
          + "sieht gefüllt aus und die Heizlast ist zu klein.",
        abhilfe: "Am Grundriss nachsehen, ob der Raum an der Fassade liegt, und die "
          + "Zahl der Außenwände in der Raumzeile eintragen. Eine eingetragene "
          + "Null ist eine Ablesung und keine Annahme mehr.",
      }));
    }

    /* --- Z6b  Abschluss des Randgeschosses nach oben und unten ----------
       Unter dem untersten beheizten Geschoss liegt Erdreich oder ein
       unbeheizter Keller, über dem obersten das Dach oder ein unbeheizter
       Dachraum. Das ist keine Annahme, sondern eine Selbstverständlichkeit;
       ein Haus ohne Boden und ohne Dach gibt es nicht. Fehlt die Fläche bei
       einem Raum dieses Geschosses, fehlt sie in der Rechnung — und zwar
       ohne dass eine einzige Zahl auffällig würde.
       Zwischengeschosse werden nicht geprüft: dort grenzt oben und unten
       beheizter Raum an beheizten Raum, und diese Flächen gehören nach
       DIN EN 12831-1 nicht in die Gebäudeheizlast. */
    if (ZH && ZH.geschossabschluss && geschosseH.length) {
      const nachRichtung = function (r, wo) {
        return (r.bauteile || []).some(function (b) {
          const t = (b.grenzt_an && b.grenzt_an.typ) || "";
          if (t !== "aussen" && t !== "zone" && t !== "erdreich" && t !== "fest") {
            return false;
          }
          const s = String(b.name || "") + " " + String(b.art || "");
          /* EINE WAND IST KEIN BODEN.
             Hier stand für „unten" allein `t === "erdreich"`. Seit die Wand
             eines Kellergeschosses gegen das Erdreich rechnet, erfüllte
             damit die KELLERWAND die Frage nach der Fläche nach unten:
             GEMESSEN am 23.08.2026, echter Durchlauf „BV 2-0887
             Ziolkowski" — beiden Kellerräumen wurde die Bodenplatte
             weggenommen, und die Zeile meldete weiter „2 Räume haben eines".
             Gefragt ist eine WAAGERECHTE Fläche; erkennbar an der Bauteilart
             oder am Namen. */
          const waagerecht = String(b.art || "") === "boden"
            || /boden|sohle|grundplatte|kellerdecke/i.test(String(b.name || ""));
          return wo === "unten"
            ? (waagerecht && (t === "erdreich" || t === "zone" || t === "aussen"
                              || t === "fest"))
            /* „Kellerdecke" trägt das Wort Decke und liegt trotzdem UNTEN.
               Ohne diesen Ausschluss zählte sie im untersten Geschoss auch
               als Abschluss nach oben. */
            : (!/kellerdecke/i.test(s) && /dach|decke|geschossdecke/i.test(s));
        });
      };
      [["unten", "nach unten", "gegen Erdreich oder gegen einen unbeheizten Keller"],
       ["oben", "nach oben", "gegen das Dach oder gegen einen unbeheizten Dachraum"]]
        .forEach(function (w) {
          const wo = w[0];
          const betroffen = [];
          let mitFlaeche = 0, gesamtRaeume = 0;
          /* WER GEHÖRT IN DEN NENNER?
           *
           * Bisher: die Räume des Randgeschosses, und sonst niemand. Das war
           * ein Nenner, der nur die unauffälligen Fälle zählte. GEMESSEN am
           * Blatt „BV 2-0887 Ziolkowski", echter Durchlauf 23.08.2026: das
           * Haus ist nur zum Teil unterkellert, 35,53 m² Erdgeschossboden
           * liegen auf dem Erdreich und hatten kein Bauteil — geprüft wurden
           * die zwei Kellerräume, und die Zeile stand grün auf „2 von 2".
           * Zwei von dreizehn Räumen, und der Haken sah aus wie alle.
           *
           * Dazu kommen jetzt die Räume, die über der NICHT unterkellerten
           * Fläche liegen. Welche das sind, steht in p.teilunterkellerung
           * (KERN_HUELLENDECKUNG, abgelegt von bauteileErgaenzen) — dieselbe
           * Feststellung, aus der auch das Bauteil entsteht. */
          const tu = (wo === "unten" && p.teilunterkellerung
                      && p.teilunterkellerung.gilt) ? p.teilunterkellerung : null;
          const tuIds = {};
          if (tu && tu.benannt) {
            (tu.raeume || []).forEach(function (x) {
              if (x && x.id) tuIds[x.id] = true;
            });
          }
          geschosseH.forEach(function (gname) {
            const ab = ZH.geschossabschluss(gname, geschosseH);
            const rand = !!(ab.pruefbar && ab[wo]);
            const teil = !!(tu && tu.geschoss === gname);
            if (!rand && !teil) return;
            rs.filter(function (r) { return r.geschoss === gname; })
              .forEach(function (r) {
                /* Sind die Räume namentlich benannt, gehören nur sie in den
                   Nenner; sonst steht ein Raum über dem Keller neben einem
                   über dem Erdreich und beide würden gleich beurteilt. */
                if (!rand && tu.benannt && !tuIds[r.id]) return;
                gesamtRaeume++;
                if (nachRichtung(r, wo)) mitFlaeche++; else betroffen.push(r);
              });
          });
          if (!gesamtRaeume) return;
          /* WAS DIESE ZEILE NICHT PRÜFT, steht in ihr drin. Ein „n von n"
             ohne den Umfang des Nenners liest sich wie „alle Räume". */
          const ungeprueft = rs.length - gesamtRaeume;
          const umfang = " Geprüft " + (gesamtRaeume === 1 ? "ist 1 Raum" : "sind "
              + gesamtRaeume + " Räume") + " von " + rs.length + " im Raumbuch"
            + (ungeprueft > 0
              ? "; die übrigen " + ungeprueft + " liegen auf Geschossen, unter und "
                + "über denen beheizter Raum liegt — dort gehört nach "
                + "DIN EN 12831-1 keine Fläche in die Gebäudeheizlast."
              : ".");
          if (betroffen.length && mitFlaeche > 0) {
            /* BEFUND. Im selben Geschoss haben Räume die Fläche und andere
               nicht. Das ist ein Widerspruch innerhalb eines Geschosses und
               nicht wegzuerklären: entweder ist sie bei den einen zu viel
               oder bei den anderen zu wenig. */
            const A = betroffen.reduce(function (t, r) { return t + zahl(r.A, 0); }, 0);
            raus.push(zeile({
              id: "abschluss_" + wo,
              titel: "Abschluss " + w[1] + " im Randgeschoss", art: "befund",
              ist: mitFlaeche, soll: gesamtRaeume, einheit: "Räume", stufe: "fehler",
              quelle_soll: "die übrigen Räume desselben Geschosses",
              text: nenne(betroffen) + (betroffen.length === 1 ? " hat" : " haben")
                + " kein Bauteil " + w[1] + " " + w[2] + ", "
                + mz(mitFlaeche, "Raum", "Räume") + " desselben Geschosses "
                + (mitFlaeche === 1 ? "hat" : "haben") + " eines. "
                + "Entweder ist die Fläche dort zu viel oder hier zu wenig; beides "
                + "kann nicht stimmen. "
                /* EINE SPERRE, DIE UM 0,00 m² GEHT, MUSS DAS AUCH SAGEN.
                   GEMESSEN am 26.08.2026 an "Hasenberg 10" und "Dumach 1":
                   die Sperre begruendete sich mit "Es geht um 0,00 m², die
                   in der Rechnung fehlen oder zu viel darin stehen". Die
                   betroffenen Zeilen waren Einbauteile ohne Flaeche
                   ("Garderobe/Schrank"). Rechnerisch geht es dann um nichts
                   -- die Zeile gehoert trotzdem geklaert, aber der Satz
                   darf keine Flaeche behaupten, die es nicht gibt. */
                + (A > 0.005
                  ? "Es geht um " + de(A, 2) + " m², die in der Rechnung fehlen "
                    + "oder zu viel darin stehen — am Ergebnis in Watt je "
                    + "Quadratmeter fällt das nicht auf."
                  : (betroffen.length === 1 ? "Diese Zeile trägt" : "Diese Zeilen tragen")
                    + " keine Fläche; rechnerisch fehlt damit nichts. Zu klären "
                    + "bleibt, ob es überhaupt "
                    + (betroffen.length === 1 ? "ein Raum ist" : "Räume sind")
                    + " — ein Einbauteil gehört nicht ins Raumbuch.")
                + umfang,
            }));
          } else if (betroffen.length) {
            /* GRENZE. In diesem Geschoss hat KEIN Raum eine Fläche nach
               oben bzw. unten. Zwei Erklärungen sind möglich, und aus den
               Unterlagen ist keine auszuschließen:
                 - die Geschossdecke fehlt in der Rechnung, dann ist die
                   Heizlast um die ganze Geschossfläche zu klein;
                 - über oder unter dem Geschoss liegt beheizter Raum, der
                   nicht Gegenstand dieser Berechnung ist — eine Wohnung im
                   Geschossstapel, ein Reihenmittelhaus, ein Bauabschnitt.
               Ein Befund wäre hier eine Behauptung. Deshalb steht die Sache
               benannt und beziffert im Bericht, statt als Aufgabe in der
               Liste. */
            const A = betroffen.reduce(function (t, r) { return t + zahl(r.A, 0); }, 0);
            raus.push(zeile({
              id: "abschluss_" + wo,
              titel: "Abschluss " + w[1] + " im Randgeschoss", art: "grenze",
              ist: 0, soll: gesamtRaeume, einheit: "Räume", stufe: "hinweis",
              quelle_soll: "Lage des Geschosses im Stapel",
              text: "In " + (wo === "unten" ? "dem untersten" : "dem obersten")
                + " erfassten Geschoss hat kein Raum ein Bauteil " + w[1] + " "
                + w[2] + "; zusammen sind das " + de(A, 2) + " m² Grundfläche. "
                + "Zwei Erklärungen sind möglich, und aus diesen Unterlagen ist "
                + "keine auszuschließen: entweder fehlt die Geschossdecke in der "
                + "Rechnung — dann ist die Heizlast um diese Fläche zu klein —, "
                + "oder " + (wo === "unten" ? "unter" : "über")
                + " dem Geschoss liegt beheizter Raum, der nicht Gegenstand dieser "
                + "Berechnung ist, etwa bei einer Wohnung im Geschossstapel oder "
                + "einem Reihenmittelhaus." + umfang,
              abhilfe: "Das Bauteil " + w[1] + " bei den Räumen dieses Geschosses "
                + "anlegen, oder in den Objektangaben festhalten, dass "
                + (wo === "unten" ? "darunter" : "darüber")
                + " beheizter Raum liegt.",
            }));
          } else {
            raus.push(zeile({
              id: "abschluss_" + wo,
              titel: "Abschluss " + w[1] + (tu ? " im Randgeschoss und über der "
                  + "nicht unterkellerten Fläche" : " im Randgeschoss"),
              art: "pruefung",
              ist: mitFlaeche, soll: gesamtRaeume, einheit: "Räume", stufe: "gut",
              quelle_soll: "jeder Raum ohne beheizten Raum darunter oder darüber",
              text: "Alle " + mz(gesamtRaeume, "Raum", "Räume")
                + ", " + (wo === "unten" ? "unter " : "über ")
                + (gesamtRaeume === 1 ? "dem" : "denen")
                + " kein beheizter Raum liegt, "
                + (gesamtRaeume === 1 ? "hat" : "haben") + " ein Bauteil " + w[1]
                + " " + w[2] + "." + umfang
                + (tu ? " Wie die nicht unterkellerte Fläche auf die Räume "
                    + "verteilt ist, steht in der Zeile „Teilunterkellerung“; "
                    + "dass sie da ist, ist hier geprüft, wo sie liegt nicht." : ""),
            }));
          }
        });
    }

    /* --- Z6c  Teilunterkellerung ----------------------------------
       Steht nur da, wenn das Haus nur zum Teil unterkellert ist. Die
       Feststellung selbst kommt aus KERN_HUELLENDECKUNG und liegt am
       Projekt; hier wird sie gelesen, nicht ein zweites Mal gebildet.

       KEIN GRÜNER HAKEN. Belegt ist die SUMME der Fläche auf dem
       Erdreich, nicht ihre Verteilung auf die Räume. Solange der Plan
       die Räume nicht beim Namen nennt, ist die Verteilung eine
       Annahme — und eine Annahme ist keine bestandene Prüfung.
       Dieselbe Trennung wie bei „Nebenräume ohne Fenster". */
    const tuP = p.teilunterkellerung;
    if (tuP && tuP.gilt) {
      if (tuP.unbeziffert) {
        raus.push(zeile({
          id: "teilunterkellert", titel: "Teilunterkellerung", art: "befund",
          ist: 0, soll: null, einheit: "m²", stufe: "fehler",
          quelle_soll: "Planbefund der Auslese",
          text: "Die Planauslese hält fest, dass das Gebäude nur zum Teil "
            + "unterkellert ist: " + (tuP.quellen || []).join(". ") + ". "
            + "Wie groß die nicht unterkellerte Fläche ist, geben die "
            + "erfassten Räume nicht her — „" + tuP.geschoss + "“ hat "
            + de(tuP.A_geschoss, 2) + " m², „" + tuP.unten + "“ darunter "
            + de(tuP.A_unten, 2) + " m². Deshalb steht dort kein Bauteil "
            + "gegen Erdreich, und die Heizlast ist um diese Fläche zu "
            + "klein. Eine gegriffene Zahl wäre hier schädlicher als keine.",
          abhilfe: "Am Plan ablesen, welche Räume von „" + tuP.geschoss
            + "“ nicht unterkellert sind, und bei ihnen eine Bodenplatte "
            + "gegen Erdreich anlegen.",
        }));
      } else if (tuP.benannt) {
        raus.push(zeile({
          id: "teilunterkellert", titel: "Teilunterkellerung", art: "pruefung",
          ist: tuP.raeume.length, soll: tuP.raeume.length, einheit: "Räume",
          stufe: "gut", quelle_soll: "im Planbefund namentlich genannt",
          text: "Das Gebäude ist nur zum Teil unterkellert. Der Befund nennt "
            + "die Räume beim Namen: "
            + nenne(tuP.raeume)
            + ". Sie stehen mit zusammen " + de(tuP.A_erdreich, 2)
            + " m² auf dem Erdreich und haben dort eine Bodenplatte. "
            + (tuP.quellen || []).join(". ") + ".",
        }));
      } else {
        raus.push(zeile({
          id: "teilunterkellert", titel: "Teilunterkellerung", art: "grenze",
          ist: tuP.A_erdreich, soll: null, einheit: "m²", stufe: "warnung",
          quelle_soll: "Flächenvergleich der beiden untersten Geschosse",
          text: "Das Gebäude ist nur zum Teil unterkellert: „" + tuP.geschoss
            + "“ hat " + de(tuP.A_geschoss, 2) + " m², das Geschoss darunter "
            + "nur " + de(tuP.A_unten, 2) + " m². " + de(tuP.A_erdreich, 2)
            + " m² stehen damit auf dem Erdreich. Diese Summe ist belegt. "
            + "WELCHE Räume darauf stehen, sagt die Unterlage nicht; "
            + "angesetzt sind deshalb " + de(tuP.anteil * 100, 1)
            + " Prozent jeder Raumgrundfläche des Geschosses als Bodenplatte "
            + "gegen Erdreich. ANNAHME des Werkzeugs: die Gebäudeheizlast "
            + "stimmt damit, die raumweise Heizlast dieser "
            + mz(tuP.raeume.length, "Raum ist", "Räume ist")
            + " eine Näherung."
            /* DIE ZAHLEN, UM DIE ES GEHT, GEHÖREN HIERHIN.
               Bis zum 23.08.2026 stand hier „6 Räume" und ein Prozentsatz.
               Wer den Bericht raumweise liest, sieht dort eine Bodenplatte
               unter einem Raum, der nach Plan über dem Keller liegt, und
               keine unter einem, der auf dem Erdreich steht — beide mit zwei
               Nachkommastellen. Welche Fläche auf welchen Raum gelegt wurde,
               muss deshalb hier stehen, Raum für Raum, sonst ist die Annahme
               nicht nachzuprüfen. */
            + (tuP.raeume.length
              ? " Angesetzt sind im Einzelnen: "
                + tuP.raeume.map(function (r) {
                    return "„" + r.name + "“ " + de(r.A_boden, 2) + " von "
                      + de(zahl(r.A, 0), 2) + " m²";
                  }).join(", ")
                + ". Keine dieser Zahlen steht so im Plan. Für die Auslegung "
                + "der Heizfläche eines einzelnen Raumes sind sie deshalb "
                + "nicht zu verwenden."
              : "")
            + " " + (tuP.quellen || []).join(". ") + ".",
          abhilfe: "Am Plan ablesen, welche Räume von „" + tuP.geschoss
            + "“ nicht unterkellert sind, und bei ihnen die Bodenplatte auf "
            + "die volle Raumfläche setzen; bei den übrigen auf null. Dann "
            + "gilt der Plan und nicht die Verteilung.",
        }));
      }
    }

    /* --- Z6d  Deckt das Raumbuch den Umfang des Geschosses ab? -----
       DIE EINZIGE UNABHÄNGIGE PROBE AUF DIE LAGE EINES RAUMES.
       Ob ein Raum innen liegt, hängt heute an einer einzigen gelesenen
       Zahl (aussenwaende). Der Umfang des Geschosses aus der äußersten
       Maßkette ist davon unabhängig: die Außenwände aller Räume müssen
       ihn zusammen ergeben. Bleiben sie deutlich darunter, gehört
       Fassade keinem Raum — und genau so sieht eine zu niedrig gelesene
       Außenwandzahl aus.
       GEMESSEN am Blatt „BV 2-0887 Ziolkowski", 23.08.2026: das
       Kellergeschoss misst nach der zweiten Lesung 8,00 mal 7,00 m,
       also 30 m Umfang; seine beiden Räume tragen zusammen 13,09 m
       Außenwand. */
    const HD = huellendeckung();
    if (HD && HD.fassadendeckung) {
      HD.fassadendeckung({
        raeume: rs, rangVon: ZH && ZH.rangVon,
        kontur: function (g) { return kontur(p, g); },
      }).forEach(function (fd) {
        /* DIE PROBE GILT IN BEIDE RICHTUNGEN.
         *
         * `auffaellig` schlägt nur an, wenn den Räumen Fassade FEHLT. Tragen
         * sie zusammen MEHR Außenwand, als der Umfang des Geschosses hergibt,
         * stand hier trotzdem grün „Die Fassade ist damit den Räumen
         * zugeordnet" — neben zwei Zahlen, die einander widersprechen.
         * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" im Browser, 23.08.2026:
         * Erdgeschoss 41,34 m Raumaußenwand gegen 35,00 m Umfang, grün.
         * Zu viel Außenwand macht die Heizlast zu GROSS; das ist die
         * ungefährlichere Richtung, aber kein Grund für einen Haken.
         *
         * Ein Überschuss ist allerdings nicht immer ein Fehler: ist die
         * Kontur nur das umschreibende Rechteck, hat das wirkliche Gebäude
         * bei einem Rücksprung mehr Umfang als sie. Dann ist es eine Grenze
         * und keine Beanstandung — dieselbe Unterscheidung wie bei der
         * Flächensumme. Die Schwelle ist dieselbe wie in der Gegenrichtung
         * (KERN_HUELLENDECKUNG, UMFANG_MIN_M und UMFANG_MIN_ANTEIL); eine
         * zweite Zahl wäre eine zweite Wahrheit. */
        const kFd = kontur(p, fd.geschoss);
        const ueber = -zahl(fd.fehlend, 0);
        const zuviel = !fd.auffaellig && ueber > 2 && fd.U > 0
                       && ueber / fd.U > 0.20;
        if (zuviel) {
          const rechteck = !!(kFd && kFd.obergrenze);
          raus.push(zeile({
            id: "fassade_" + fd.geschoss,
            titel: "Außenwände in " + fd.geschoss + " über dem Umfang",
            art: rechteck ? "grenze" : "befund",
            ist: fd.laenge, soll: fd.U, einheit: "m",
            stufe: rechteck ? "hinweis" : "warnung", quelle_soll: fd.quelle,
            /* MEHR Wand als Umfang macht die Heizlast zu GROSS. Der Fehler
               ist sichtbar und am Plan mit einem Blick zu entscheiden. Die
               Gegenrichtung — Fassade, die keinem Raum gehört — sperrt
               weiter, denn dort fällt Wand aus der Rechnung heraus und die
               Raumzeile sieht trotzdem gefüllt aus. */
            aufhebbar: true,
            text: "Die Räume von " + fd.geschoss + " tragen zusammen "
              + de(fd.laenge, 2) + " m Außenwand, der Umfang des Geschosses "
              + "ist nur " + de(fd.U, 2) + " m (" + fd.quelle + "). "
              + de(ueber, 2) + " m Außenwand mehr, als die Kontur hergibt, das "
              + "sind " + de(ueber / fd.U * 100, 0) + " Prozent. Eine Wand, die "
              + "es nicht gibt, führt Wärme nach außen ab: die Heizlast fällt "
              + "dadurch zu GROSS aus. "
              + (rechteck
                ? "ABER: diese Kontur ist aus zwei Außenmaßen gebildet und "
                  + "damit das umschreibende Rechteck. Ein Rücksprung — L-Form, "
                  + "eingezogener Eingang — gibt dem wirklichen Gebäude mehr "
                  + "Umfang als ihr. Zwischen beidem entscheidet diese "
                  + "Unterlage nicht; deshalb steht das hier als Grenze."
                : "Entweder ist die Zahl der Außenwände bei einem Raum zu hoch "
                  + "gelesen, oder die Kontur ist zu klein abgelesen."),
            abhilfe: "Am Grundriss von " + fd.geschoss + " abzählen, an wie "
              + "vielen Seiten jeder Raum außen liegt, und die äußere Maßkette "
              + "gegenlesen.",
          }));
          return;
        }
        if (!fd.auffaellig) {
          /* IST DIE LÜCKE ZU, WEIL SIE VERTEILT WURDE? Dann ist diese Zeile
             keine unabhängige Gegenprobe mehr: der Umfangsabgleich hat die
             Wandlängen auf GENAU diesen Umfang verteilt, und die Probe
             verglich danach die Verteilung mit ihrer eigenen Quelle. Ein
             grüner Haken stünde auf einer Annahme. Die Zeile wird deshalb
             eine stille Grenze: sie sagt, was übernommen und was verteilt
             wurde, verlangt aber weder Eingabe noch Begründung. GEMESSEN am
             Blatt „Hasenberg_10_Grundrisse" (echter Lauf): die Frage
             „Außenwände in EG und OG gegen den Umfang" verlangte vier
             Außenmaß-Felder und nannte im selben Text die gelesene Kette
             18,95 m mal 16,62 m. */
          const uaZ = ((p.umfangsabgleich) || []).find(function (x) {
            return gleichesGeschoss(x.geschoss, fd.geschoss);
          });
          const verteilt = uaZ && uaZ.art === "kontur"
            ? Math.max(0, zahl(uaZ.U_soll, 0) - zahl(uaZ.U_roh, 0)) : 0;
          if (verteilt > 0.005) {
            raus.push(zeile({
              id: "fassade_" + fd.geschoss,
              titel: "Außenwände in " + fd.geschoss + " gegen den Umfang",
              art: "grenze", ist: fd.laenge, soll: fd.U, einheit: "m",
              stufe: "hinweis", quelle_soll: fd.quelle,
              text: "Der Umfang von " + fd.geschoss + " ist aus der gelesenen "
                + "Kontur übernommen: " + de(fd.U, 2) + " m (" + fd.quelle
                + "). Aus eigener Lesung trugen die Räume " + de(zahl(uaZ.U_roh, 0), 2)
                + " m Außenwand; die fehlenden " + de(verteilt, 2) + " m Fassade "
                + "sind rechnerisch auf die Räume mit Außenlage verteilt — "
                + "ANNAHME des Werkzeugs, je Raum über die Außenwandlänge in "
                + "der Raumzeile überschreibbar. Innenliegende Räume (WC, "
                + "Abstellraum, HWR, Flur ohne Außenlage) bekommen dabei "
                + "nichts, es sei denn, die Lesung nennt dort eine Außenwand. "
                + "Diese Zeile ist damit keine unabhängige Gegenprobe: die "
                + "Wandlängen wurden auf genau diesen Umfang verteilt. Zu tun "
                + "ist hier nichts.",
              abhilfe: "Wer die Verteilung ersetzen will, trägt die "
                + "Außenwandlänge je Raum in der Raumzeile ein oder die "
                + "Außenmaße des Geschosses unter „Objekt und Klima“; eine "
                + "eigene Eingabe geht der Annahme immer vor.",
            }));
            return;
          }
          raus.push(zeile({
            id: "fassade_" + fd.geschoss,
            titel: "Außenwände in " + fd.geschoss + " gegen den Umfang",
            art: "pruefung", ist: fd.laenge, soll: fd.U, einheit: "m",
            stufe: "gut", quelle_soll: fd.quelle,
            /* WAS DIESER HAKEN HEISST — UND WAS NICHT.
               „Die Fassade ist damit den Räumen zugeordnet" stand hier auch
               bei 41,34 m Wand gegen 35,00 m Umfang: 18 Prozent Unterschied,
               grün, weil die Auflösung dieser Probe bei 20 Prozent liegt.
               Der Haken ist richtig — die Probe kann darunter nichts mehr
               unterscheiden —, der Satz war es nicht. Beide Zahlen und die
               Auflösung gehören deshalb in die Zeile. */
            text: "Die Räume von " + fd.geschoss + " tragen zusammen "
              + de(fd.laenge, 2) + " m Außenwand; der Umfang des Geschosses "
              + "ist " + de(fd.U, 2) + " m (" + fd.quelle + "). "
              + (Math.abs(zahl(fd.fehlend, 0)) < 0.005
                ? "Beide Zahlen stimmen überein; die Fassade ist damit den "
                  + "Räumen zugeordnet."
                : "Der Unterschied von " + de(Math.abs(zahl(fd.fehlend, 0)), 2)
                  + " m ("
                  + de(Math.abs(zahl(fd.fehlend, 0)) / fd.U * 100, 0)
                  + " Prozent) liegt unter der Auflösung dieser Probe: sie "
                  + "schlägt erst ab 20 Prozent an, weil jeder Raum als "
                  + "Rechteck gerechnet wird und schon das den Unterschied "
                  + "macht. Bis dahin ist die Fassade den Räumen zugeordnet; "
                  + "eine kleinere Abweichung kann diese Zeile weder "
                  + "bestätigen noch widerlegen.")
              + " Das ist die einzige Probe "
              + "auf die Zahl der Außenwände, die nicht aus derselben Lesung "
              + "stammt wie sie selbst.",
          }));
          return;
        }
        /* DIE MASSKETTE, DIE DER UMFANGSABGLEICH SELBST VERWORFEN HAT, IST
           HIER KEIN SOLL. Das OG des Blattes „Hasenberg_10_Grundrisse"
           (echter Lauf 25.08.2026): die äußerste Maßkette umschreibt das
           GANZE Gebäude (314,95 m² Rechteck), das Geschoss trägt 98,16 m²
           Raumfläche — der Umfangsabgleich hat die Kette deshalb verworfen
           und den Umfang aus dem EG hochgerechnet (52,16 m), und die Räume
           tragen genau diese Länge. Diese Zeile verglich danach gegen die
           verworfene Kette (71,14 m) und machte aus der eigenen, bewussten
           Entscheidung des Werkzeugs eine Pflichtfrage mit Vermerk
           (Kundenbefund: „das kann er so als korrekt annehmen"). Passen die
           Räume zur Umfangsquelle des Abgleichs und ist die Kette nur das
           umschreibende Rechteck, ist das eine GRENZE — die vorsichtige
           Richtung steht dabei. Passen sie auch zur eigenen Quelle NICHT,
           bleibt die Warnung: das ist die Gegenprobe. */
        const uaF = ((p.umfangsabgleich) || []).find(function (x) {
          return gleichesGeschoss(x.geschoss, fd.geschoss);
        });
        const uaU = zahl(uaF && uaF.U_soll, 0);
        const passtZurQuelle = uaU > 0
          && Math.abs(zahl(fd.laenge, 0) - uaU) <= Math.max(0.5, uaU * 0.02);
        if (passtZurQuelle && kFd && kFd.obergrenze && fd.U > uaU) {
          raus.push(zeile({
            id: "fassade_" + fd.geschoss,
            titel: "Außenwände in " + fd.geschoss + " gegen den Umfang",
            art: "grenze", ist: fd.laenge, soll: uaU, einheit: "m",
            stufe: "hinweis", quelle_soll: (uaF.quelle || "Umfangsabgleich"),
            text: "Die Räume von " + fd.geschoss + " tragen zusammen "
              + de(fd.laenge, 2) + " m Außenwand und decken damit den Umfang, "
              + "den der Umfangsabgleich für dieses Geschoss angesetzt hat ("
              + de(uaU, 2) + " m, " + (uaF.art === "hochrechnung"
                ? "hochgerechnet — ANNAHME, je Raum über die Außenwandlänge "
                  + "in der Raumzeile überschreibbar" : "übernommen") + "). "
              + "Die äußerste Maßkette des Blattes (" + de(fd.U, 2) + " m aus "
              + "dem umschreibenden Rechteck) gilt hier nicht als Soll: sie "
              + "umschreibt das ganze Gebäude, und die Raumfläche dieses "
              + "Geschosses füllt das Rechteck erkennbar nicht. Sie bleibt "
              + "eine Obergrenze. Ist das Geschoss in Wirklichkeit größer "
              + "als seine erfassten Räume, ist die Heizlast zu KLEIN — das "
              + "fängt diese Zeile nicht, sondern die Flächenprobe des "
              + "Geschosses.",
            abhilfe: "Wer es genau will, trägt die Außenmaße des Geschosses "
              + "unter „Objekt und Klima“ ein; eine eigene Eingabe geht der "
              + "Hochrechnung immer vor.",
          }));
          return;
        }
        raus.push(zeile({
          id: "fassade_" + fd.geschoss,
          titel: "Außenwände in " + fd.geschoss + " gegen den Umfang",
          art: "befund", ist: fd.laenge, soll: fd.U, einheit: "m",
          stufe: "warnung", quelle_soll: fd.quelle,
          text: "Die Räume von " + fd.geschoss + " tragen zusammen "
            + de(fd.laenge, 2) + " m Außenwand, der Umfang des Geschosses ist "
            + de(fd.U, 2) + " m (" + fd.quelle + "). " + de(fd.fehlend, 2)
            + " m Fassade gehören damit keinem Raum, das sind "
            + de(fd.anteil * 100, 0) + " Prozent. Die Zahl der Außenwände je "
            + "Raum stammt aus einer einzigen Lesung des Grundrisses; wo sie "
            + "zu niedrig gelesen ist, fällt die Wand aus der Rechnung und "
            + "die Raumzeile sieht trotzdem gefüllt aus."
            + (fd.raeume_ohne_wand.length
              ? " Ohne jede Außenwand " + (fd.raeume_ohne_wand.length === 1
                  ? "ist " : "sind ") + nenne(fd.raeume_ohne_wand)
                + " — dort zuerst nachsehen."
              : "")
            + " Wo die Lücke liegt, sagt diese Probe nicht; dass sie da ist, "
            + "schon.",
          abhilfe: "Am Grundriss von " + fd.geschoss + " abzählen, an wie "
            + "vielen Seiten jeder Raum außen liegt, und die Zahl in der "
            + "Raumzeile eintragen.",
        }));
      });
    }

    const ohneFenster = rs.filter(function (r) {
      const bt = (r.bauteile || []);
      const hatAussen = bt.some(function (b) {
        return (b.grenzt_an && b.grenzt_an.typ === "aussen")
          && !istFenster(b.name || (typ[b.typ_id] && typ[b.typ_id].name));
      });
      const hatFenster = bt.some((b) => istFenster(b.name || (typ[b.typ_id] && typ[b.typ_id].name)));
      return hatAussen && !hatFenster;
    });
    /* Eine Zeile, die ihren eigenen Befund im nächsten Satz zurücknimmt
       („bei Fluren ist das richtig"), ist keine Prüfung. Sie wird deshalb
       nach Raumart getrennt. Drei Fälle, drei verschiedene Aussagen:

       Regelfall   Flur, Diele, WC, Abstellraum, Keller, Technik. Dass dort
                   kein Fenster ist, ist die Norm. KERN_ZUORDNUNG führt die
                   Liste bereits, weil es damit die Außenwände erschließt;
                   eine zweite Liste hier hieße zwei Wahrheiten.
       Abgelesen   Aufenthaltsraum, für den die Planauslese ausdrücklich null
                   Fenster gezählt hat. Dann hat jemand hingesehen. Das ist
                   ein Ergebnis und keine offene Frage.
       Ungeprüft   Aufenthaltsraum, für den niemand gezählt hat. Hier fehlt
                   möglicherweise das Fenster und mit ihm der größte U-Wert
                   des Raumes. Das bleibt eine Warnung. */
    const Z = zuordnung();
    const regel = [], abgelesen = [], ungeprueft = [];
    ohneFenster.forEach(function (r) {
      const u = Z ? Z.ohneFensterUeblich(r) : { ja: false };
      if (u.ja) { regel.push(r); return; }
      if (zahl(r.fenster, null) === 0) { abgelesen.push(r); return; }
      ungeprueft.push(r);
    });

    if (regel.length) {
      /* KEIN GRÜNER HAKEN AUF EINER ANNAHME.
         Diese Zeile stand als bestandene Prüfung da und sagte im selben Satz
         „ANNAHME des Werkzeugs". Beides zusammen geht nicht: geprüft ist
         hier nichts. Der Plan hat für diese Räume keine Fensterzahl
         hergegeben; die Regel „bei Fluren und WCs liegt üblicherweise keins"
         ist eine Erfahrung, kein Beleg aus der Unterlage. Der Unterschied
         zur Zeile darunter (ohne_fenster_gelesen) ist genau der: dort hat
         die Auslese ausdrücklich null gezählt, hier hat niemand hingesehen.
         Deshalb steht das jetzt als Grenze im Bericht und nicht als
         bestandene Gegenprobe im Kopf. */
      raus.push(zeile({
        id: "ohne_fenster_regel", titel: "Nebenräume ohne Fenster",
        art: "grenze",
        ist: regel.length, soll: null, einheit: "Räume",
        quelle_soll: "Raumart und Raumname", stufe: "hinweis",
        text: nenne(regel) + (regel.length === 1 ? " hat" : " haben")
          + " eine Außenwand, aber kein Fenster, und der Plan gibt für "
          + (regel.length === 1 ? "diesen Raum" : "diese Räume")
          + " keine Fensterzahl her. ANNAHME des Werkzeugs: das ist hier der "
          + "Regelfall. Raumart und Raumname weisen "
          + (regel.length === 1 ? "den Raum" : "diese Räume")
          + " als Nebenraum aus, und bei Fluren, Dielen, Abstellräumen, WCs, Kellern "
          + "und Technikräumen liegt üblicherweise kein Fenster. Das ist eine "
          + "Erfahrung und kein Beleg aus der Unterlage. Trifft sie nicht zu, fehlt "
          + "das Fenster mit dem größten U-Wert des Raumes und die Heizlast ist zu "
          + "klein.",
        abhilfe: "Am Plan nachsehen und das Fenster gegebenenfalls nachtragen, oder "
          + "in der Raumzeile null Fenster eintragen; dann ist es abgelesen und "
          + "nicht angenommen.",
      }));
    }
    if (abgelesen.length) {
      raus.push(zeile({
        id: "ohne_fenster_gelesen", titel: "Räume ohne Fenster laut Plan",
        /* KEIN HAKEN AUF EINER SELBSTAUSKUNFT.
         *
         * Diese Zeile stand grün mit „1 von 1" — und die 1 im Nenner war
         * dieselbe 1 wie im Zähler: gezählt wurden die Räume, für die die
         * Lesung null Fenster gemeldet hat, und geprüft wurde, dass die
         * Lesung null gemeldet hat. Eine Prüfung, deren Sollwert aus dem
         * Prüfgegenstand stammt, kann nicht anschlagen.
         *
         * Dazu kommt der sachliche Einwand: es sind Aufenthaltsräume — die
         * Nebenräume sind eine Zeile darüber abgezweigt. Für Aufenthaltsräume
         * verlangt die Musterbauordnung Fenster von mindestens einem Achtel
         * der Netto-Grundfläche (§ 47 Abs. 2), und dieselbe Fundstelle löst
         * eine Zeile weiter unten einen Fehler aus. Hier griff sie nicht.
         *
         * Sie bleibt deshalb stehen, aber als GRENZE: der Plan sagt null, die
         * Bauordnung erwartet eines, und aus dieser Unterlage ist zwischen
         * beidem nicht zu entscheiden. */
        art: "grenze",
        ist: abgelesen.length, soll: null, einheit: "Räume",
        quelle_soll: "Planauslese, Fenster je Raum gezählt", stufe: "hinweis",
        text: nenne(abgelesen) + (abgelesen.length === 1 ? " hat" : " haben")
          + " eine Außenwand, aber kein Fenster. Die Planauslese hat für "
          + (abgelesen.length === 1 ? "diesen Raum" : "diese Räume")
          + " ausdrücklich null Fenster gezählt, es ist also am Plan hingesehen "
          + "worden. Das ist keine Gegenprobe: die Null stammt aus derselben "
          + "Lesung, die auch das Raumbuch erzeugt hat, und eine zweite Zahl, "
          + "gegen die sie sich halten ließe, gibt es nicht. "
          + (abgelesen.length === 1 ? "Es ist ein Aufenthaltsraum"
            : "Es sind Aufenthaltsräume")
          + " — die Nebenräume, bei denen ein fehlendes Fenster der Regelfall "
          + "ist, stehen in einer eigenen Zeile. Für Aufenthaltsräume verlangt "
          + "die Musterbauordnung Fenster von mindestens einem Achtel der "
          + "Netto-Grundfläche (§ 47 Abs. 2)"
          + (abgelesen.some(function (r) { return r.art === "kueche"; })
            ? "; für Küchen und Kochnischen lässt sie fensterlose Ausführung "
              + "bei wirksamer Lüftung ausdrücklich zu (§ 48 Abs. 2)"
            : "")
          + ". Trifft die Null nicht zu, fehlt das Bauteil mit dem größten "
          + "U-Wert des Raumes und die Heizlast ist zu klein.",
        abhilfe: "Eine Ansicht der betreffenden Fassade auswerten lassen — sie "
          + "zeigt die Öffnungen von außen und unabhängig vom Grundriss — oder "
          + "am Grundriss nachsehen und die Fensterzahl von Hand eintragen.",
      }));
    }
    /* Angenommene Fensterflächen — eine GRENZE, keine Beanstandung.
       Wo der Plan keine Fensterzahl hergibt, setzt das Werkzeug die
       Fensterfläche aus der Raumgrundfläche an (Musterbauordnung § 47 Abs. 2).
       Sonst fehlte in jedem dieser Räume der schlechteste U-Wert der Hülle.

       Bis hierher stand das als Warnung in der Liste. Das war falsch
       eingeordnet, und zwar aus einem sachlichen Grund: es gibt nichts
       abzuarbeiten. Der Plan sagt an dieser Stelle nichts, das Werkzeug hat
       daraufhin einen benannten, mit Fundstelle belegten Ersatzwert gesetzt,
       und weder Werkzeug noch Bearbeiter können daran am Bildschirm etwas
       ändern — nur ein Blick in den Plan kann das, und den kann niemand
       erzwingen. Eine Zeile, die auf jedem Grundriss ohne Fensterbeschriftung
       gleich lautet und nie abzuhaken ist, gehört nicht in die Liste, sondern
       in den Bericht.
       Verloren geht dabei nichts: die Zeile steht mit Fläche, Fundstelle und
       den betroffenen Räumen unter „Was diese Berechnung nicht belegt". */
    const angenommen = rs.filter(function (r) {
      return r.herkunft && r.herkunft.fenster_angenommen;
    });
    if (angenommen.length) {
      const AF = angenommen.reduce(function (s, r) {
        return s + (r.bauteile || []).reduce(function (t, b) {
          return t + (istFenster(b.name || (typ[b.typ_id] && typ[b.typ_id].name))
            ? zahl(b.A, 0) : 0);
        }, 0);
      }, 0);
      raus.push(zeile({
        id: "fenster_angenommen", titel: "Fensterflächen angenommen",
        art: "grenze",
        ist: angenommen.length, soll: null, einheit: "Räume", stufe: "hinweis",
        quelle_soll: "im Plan angeschriebene Fenster",
        text: "In " + mz(angenommen.length, "Raum", "Räumen") + " steht im Plan "
          + "keine Fensterzahl. Angesetzt sind dort zusammen "
          + AF.toFixed(2).replace(".", ",") + " m² Fensterfläche, hergeleitet aus "
          + "der Raumgrundfläche nach dem bauordnungsrechtlichen Mindestmaß von "
          + "einem Achtel der Netto-Grundfläche für Aufenthaltsräume "
          + "(Musterbauordnung § 47 Abs. 2). Betroffen: " + nenne(angenommen)
          + ". Das ist eine Annahme und keine Ablesung: sie trägt den größten "
          + "U-Wert der Hülle und geht voll in die Heizlast ein.",
        abhilfe: "Die Fenster je Raum am Plan abzählen und in der Raumzeile "
          + "eintragen. Dann gilt die Zählung und die Annahme entfällt.",
      }));
    }
    if (ungeprueft.length) {
      /* DIE FENSTERPRÜFUNG, DIE WIRKLICH ANSCHLÄGT.
       *
       * Bis zum 23.08.2026 stand diese Zeile als Warnung da, und daneben
       * hielt „Ansichten gegen die Gesamtzahl" die Stellung — eine Zeile,
       * die nur prüft, ob die größte Einzelfassade mehr Fenster zeigt als
       * das ganze Gebäude hat. Gemessen: aus einem Haus mit neun Fenstern
       * ließen sich fünf entfernen, ohne dass diese Zeile ansprang; erst
       * beim sechsten. Das ist eine untere Schranke und keine Prüfung der
       * Fenster.
       *
       * Diese Zeile hier ist die Prüfung: sie sieht jeden einzelnen Raum an.
       * Ein Aufenthaltsraum mit Außenwand und ohne Fenster ist kein
       * Randfall, sondern entweder ein übersehenes Fenster oder ein Raum,
       * der keiner ist — und beides ist zu klären, bevor gerechnet wird.
       * Die Musterbauordnung verlangt für Aufenthaltsräume Fenster von
       * mindestens einem Achtel der Netto-Grundfläche (§ 47 Abs. 2); dieses
       * Werkzeug setzt dieselbe Fundstelle bereits an, wenn es Fensterflächen
       * annimmt. Was hier fehlt, fehlt mit dem größten U-Wert des Raumes und
       * macht die Heizlast zu klein, ohne in W/m² aufzufallen.
       *
       * Kein neuer Schwellenwert, keine geschätzte Größe: gezählt werden
       * Räume, für die weder die Auslese noch ein Mensch eine Fensterzahl
       * hergegeben hat und deren Raumart ein Fenster erwarten lässt. Wer
       * weiß, dass dort keines ist, trägt in der Raumzeile null Fenster ein;
       * dann ist es abgelesen und die Zeile entfällt. */
      const AF = ungeprueft.reduce(function (t, r) { return t + zahl(r.A, 0); }, 0);
      raus.push(zeile({
        id: "ohne_fenster", titel: "Aufenthaltsräume ohne Fenster",
        art: "befund",
        ist: 0, soll: ungeprueft.length, einheit: "Räume",
        quelle_soll: "Aufenthaltsräume brauchen ein Fenster "
          + "(Musterbauordnung § 47 Abs. 2)",
        stufe: folgeStufe(p),
        text: nenne(ungeprueft) + (ungeprueft.length === 1
          ? " hat eine Außenwand, aber kein Fenster."
          : " haben Außenwände, aber kein Fenster.")
          + " Das sind Aufenthaltsräume mit zusammen " + de(AF, 2) + " m² "
          + "Grundfläche, und für sie hat niemand die Fenster am Plan gezählt. "
          + "Entweder ist ein Fenster übersehen worden, dann fehlt der größte "
          + "U-Wert des Raumes und die Heizlast fällt zu klein aus; oder der "
          + "Raum ist kein Aufenthaltsraum, dann gehört seine Raumart "
          + "berichtigt. Eines von beidem ist zu klären." + folgeVermerk(p),
        abhilfe: "Am Plan nachsehen. Ist ein Fenster da, nachtragen. Ist keines "
          + "da, in der Raumzeile null Fenster eintragen — dann ist es "
          + "abgelesen und nicht angenommen.",
      }));
    }
    return raus;
  }

  /* --- Z7  Raumhöhen unter dem bauordnungsrechtlichen Mindestmaß --------
   *
   * GEMESSEN am 23.08.2026 an „Werkvertragsverzeichnung BV 2-0887
   * Ziolkowski": werden alle dreizehn Raumhöhen um 0,50 m verkleinert, sinkt
   * die Gebäudeheizlast von 6,95 kW auf 5,91 kW — und im Kopf standen
   * unverändert 0 Fehler, 5 Warnungen und 10 von 12 bestandenen Gegenproben.
   * Die Erdgeschossräume standen mit 2,02 m lichter Höhe im Raumbuch, und
   * keine Zeile sagte etwas dazu.
   *
   * Die Ursache ist nicht, dass die Höhe niemanden interessiert, sondern WO
   * das Werkzeug hinsieht. KERN_ZUORDNUNG kennt die Grenze bereits
   * (RAUMHOEHE_MIN = 2,30 m) und benutzt sie beim LESEN: sie trennt die
   * lichte Raumhöhe von der Höhe einer Tür- oder Fensteröffnung. Sie sitzt
   * damit am Eingang. Was auf einem anderen Weg ins Raumbuch kommt — von
   * Hand geändert, aus einer alten Projektdatei geladen, aus einem Geschoss
   * übernommen — läuft an ihr vorbei, und danach prüft es niemand mehr.
   *
   * Diese Zeile prüft das fertige Raumbuch. Kein neuer Schwellenwert: es ist
   * dieselbe Zahl aus demselben Kern, und die Fundstelle ist dieselbe, die
   * KERN_BANDBREITE für die Höhenspanne nennt. Gezählt werden nur
   * Aufenthaltsräume — für Keller, Technik und Abstellräume gilt das Maß
   * nicht, und die Unterscheidung trifft nicht diese Datei, sondern
   * KERN_ZUORDNUNG.ohneFensterUeblich, dieselbe Stelle wie bei den Fenstern.
   *
   * Die Richtung des Fehlers ist die unsichere: eine zu kleine Höhe macht
   * Wandfläche und Luftvolumen zu klein, die Heizlast fällt zu niedrig aus,
   * und weil die Bezugsfläche die Grundfläche ist, fällt es in W/m² auf. */
  const RAUMHOEHE_MINDEST = 2.30;
  const RAUMHOEHE_FUNDSTELLE =
    "Aufenthaltsräume haben mindestens 2,40 m lichte Höhe "
    + "(Musterbauordnung § 47 Abs. 1); im Bestand kommen 2,30 m vor";

  function zaehlerRaumhoehe(p) {
    const raus = [];
    const rs = (p && p.raeume) || [];
    if (!rs.length) return raus;
    const Z = zuordnung();
    const aufenthalt = rs.filter(function (r) {
      const u = Z ? Z.ohneFensterUeblich(r) : { ja: false };
      return !u.ja;
    });
    if (!aufenthalt.length) return raus;
    const zuNiedrig = aufenthalt.filter(function (r) {
      const h = zahl(r.h, 0);
      return h > 0 && h < RAUMHOEHE_MINDEST;
    });
    if (!zuNiedrig.length) return raus;
    const kleinste = zuNiedrig.reduce(function (m, r) {
      const h = zahl(r.h, 0);
      return (m === null || h < m) ? h : m;
    }, null);
    raus.push(zeile({
      id: "raumhoehe_unter_mindestmass",
      titel: "Raumhöhen unter dem Mindestmaß",
      art: "befund",
      ist: aufenthalt.length - zuNiedrig.length,
      soll: aufenthalt.length,
      einheit: "Räume",
      quelle_soll: RAUMHOEHE_FUNDSTELLE,
      stufe: "warnung",
      text: nenne(zuNiedrig) + (zuNiedrig.length === 1
        ? " steht mit einer lichten Höhe unter " : " stehen mit lichten Höhen unter ")
        + de(RAUMHOEHE_MINDEST, 2) + " m im Raumbuch, die kleinste mit "
        + de(kleinste, 2) + " m. Für Aufenthaltsräume verlangt die "
        + "Musterbauordnung 2,40 m; im Bestand kommen 2,30 m vor, darunter "
        + "nichts. Entweder ist die Raumart falsch — dann ist es kein "
        + "Aufenthaltsraum — oder die Höhe stimmt nicht. Eine zu kleine Höhe "
        + "macht Wandfläche und Luftvolumen zu klein und die Heizlast damit "
        + "zu niedrig.",
      abhilfe: "Im Schnitt nachsehen, welches Maß die lichte Raumhöhe ist "
        + "(Türhöhen liegen bei 2,00 bis 2,25 m und werden leicht dafür "
        + "gehalten), und die Höhe in der Raumzeile berichtigen. Ist der Raum "
        + "kein Aufenthaltsraum, die Raumart berichtigen.",
    }));
    return raus;
  }

  /* Räume beim Namen nennen — und zwar unterscheidbar.
     Ein Grundriss hat drei Flure im Erdgeschoss. „eg Flur“, „eg Flur“,
     „eg Flur“ liest sich wie dieselbe Meldung dreimal, und der Bearbeiter
     weiß nicht, welchen Raum er aufmachen soll. Tragen zwei genannte Räume
     denselben Namen, kommt deshalb die Fläche dazu; sie steht im Raumbuch in
     derselben Zeile und macht den Raum auffindbar. */
  function nenne(liste) {
    const wieOft = {};
    (liste || []).forEach(function (r) {
      const k = (r.geschoss || "") + "|" + (r.name || "");
      wieOft[k] = (wieOft[k] || 0) + 1;
    });
    const namen = liste.slice(0, 4).map(function (r) {
      const k = (r.geschoss || "") + "|" + (r.name || "");
      const zusatz = (wieOft[k] > 1 && zahl(r.A, 0) > 0)
        ? " (" + zahl(r.A, 0).toFixed(2).replace(".", ",") + " m²)" : "";
      return "„" + (r.geschoss ? r.geschoss + " " : "") + (r.name || "ohne Namen")
        + zusatz + "“";
    });
    const rest = liste.length - namen.length;
    return namen.join(", ")
      + (rest === 1 ? " und ein weiterer" : rest > 1 ? " und " + rest + " weitere" : "");
  }

  /* ---------------------------------------------------------------------
   * Z0  Hat das Projekt überhaupt ein Bauteil?
   * ---------------------------------------------------------------------
   * WARUM DIESE ZEILE ES GEBEN MUSS, gemessen am Blatt „BV 2-0887
   * Ziolkowski": Das Kontrollblatt meldete sieben Fehler — „Fenster gegen den
   * Grundriss 0 von 9", „Räume ohne Außenwand 12" und weitere. Alle sieben
   * beschrieben dieselbe eine Ursache aus sieben Blickwinkeln: es war KEIN
   * EINZIGES Bauteil angelegt, im ganzen Projekt nicht. Wer die Liste von
   * oben abarbeitet, sucht zwölf vergessene Außenwände und neun verlorene
   * Fenster — und findet nichts, weil nichts verlorengegangen ist.
   *
   * Die Ursache steht am Anfang der Kette: bauteileErgaenzen() legt kein
   * Bauteil an, solange keine Bauteiltypen mit U-Werten da sind, und die
   * entstehen erst mit dem Baujahr. Ein fehlendes Baujahr erzeugt also
   * sieben Fehlermeldungen, von denen keine das Wort Baujahr enthält.
   *
   * Diese Zeile sagt es in einem Satz und nennt das Feld. Sie ist NICHT
   * milder als die sieben — sie ist genauso ein Fehler und hält den Bericht
   * genauso auf. Sie ordnet nur zu, was Ursache ist und was Folge.
   * ------------------------------------------------------------------ */

  /** Zahl aller angelegten Bauteile über alle Räume. */
  function bauteileGesamt(p) {
    return ((p && p.raeume) || []).reduce(function (s, r) {
      return s + ((r.bauteile || []).length);
    }, 0);
  }

  /** Warum es kein einziges Bauteil gibt — oder null, wenn es welche gibt.
   *  Nennt die Ursache am Anfang der Kette, nicht ihre Auswirkung. */
  function keinBauteilGrund(p) {
    const pr = p || {};
    if (!((pr.raeume || []).length)) return null;
    if (bauteileGesamt(pr) > 0) return null;
    if (!((pr.bauteiltypen || []).length)) {
      /* DIESER SATZ WAR EINE FALSCHE FÄHRTE.
       *
       * Bis zum 24.08.2026 stand hier „Für das eingetragene Baujahr gibt die
       * Typologie keine Werte her". Das war zwar richtig beschrieben, aber
       * die falsche Schlussfolgerung: die Typologie endete bei 2022, und für
       * ein Baujahr ab 2023 entstand deshalb GAR NICHTS. Seit die Startwerte
       * für Neubauten aus dem Referenzgebäude des GModG kommen, gibt es zu
       * jedem auswertbaren Baujahr Startwerte. Bleibt die Bibliothek trotzdem
       * leer, hat jemand sie geleert — und dann muss hier das stehen und
       * nicht ein Hinweis auf eine Tabellenlücke, die es nicht mehr gibt. */
      return (pr.meta && String(pr.meta.baujahr || "").trim())
        ? "Es ist kein Bauteiltyp mit U-Wert angelegt, obwohl ein Baujahr "
          + "eingetragen ist. Zu jedem Baujahr gibt es Startwerte — bis 2022 "
          + "aus der Gebäudetypologie, ab 2023 aus dem Referenzgebäude des "
          + "Gebäudemodernisierungsgesetzes. Die Bauteilbibliothek ist also "
          + "geleert worden. Im Schritt „Objekt“ die Startwerte erneut setzen "
          + "oder die U-Werte aus dem Nachweis eintragen."
        : "Es ist kein Bauteiltyp mit U-Wert angelegt, weil das Baujahr fehlt. "
          + "Aus dem Baujahr kommen die U-Werte, aus den U-Werten die Bauteile.";
    }
    return "Bauteiltypen sind angelegt, aber keinem Raum ist ein Bauteil "
      + "zugeordnet. Die Bauteile sind noch nicht gebildet worden.";
  }

  /** Ein Satz zum Anhängen an jede Folge-Zeile, damit niemand die Folge für
   *  die Ursache hält. Leer, sobald es Bauteile gibt. */
  /* EINE URSACHE, EINE ROTE ZEILE.
   *
   * Diese drei Zeilen -- fehlende Aussenwaende, nicht uebernommene Fenster,
   * Ansichtssumme gegen null -- sagten in ihrem eigenen Text bereits „das
   * sind Folgen derselben Ursache und keine getrennten Fehler" und zaehlten
   * sich trotzdem einzeln als Fehler. Am 22.08.2026 stand im Kopf deshalb
   * „6 Fehler", wo es eine einzige fehlende Angabe war: das Baujahr.
   *
   * Das ist keine Aufweichung. Gesperrt bleibt der Bericht unveraendert --
   * durch „Bauteile im Projekt", die Ursachenzeile, die nicht abhakbar ist.
   * Die Folgen bleiben vollstaendig sichtbar, mit Zahl und Namen, und sie
   * werden gedruckt. Sie hoeren nur auf, dieselbe Sperre ein zweites, drittes
   * und viertes Mal zu zaehlen. Gibt es Bauteile, ist jede von ihnen wieder
   * ein eigener Fehler -- dann steht dahinter auch eine eigene Ursache. */
  function folgeStufe(p) {
    return keinBauteilGrund(p) ? "hinweis" : "fehler";
  }

  function folgeVermerk(p) {
    return keinBauteilGrund(p)
      ? " Diese Zeile ist eine Folge, keine eigene Ursache: im ganzen Projekt "
        + "ist kein einziges Bauteil angelegt. Siehe „Bauteile im Projekt“."
      : "";
  }

  function zaehlerBauteilbestand(p) {
    const grund = keinBauteilGrund(p);
    const n = ((p && p.raeume) || []).length;
    /* KEIN HAKEN OHNE SOLLZAHL.
     *
     * Hier stand bis zum 23.08.2026 eine grüne Zeile „Über alle 13 Räume sind
     * 35 Bauteile angelegt" — ist: 35, soll: null. Grün allein dafür, DASS es
     * Bauteile gibt. Eine Zahl ohne zweite Zahl ist keine Gegenprobe, und sie
     * zählte trotzdem in der Kachel „Gegenproben n von n bestanden" mit.
     *
     * Was diese Zeile im Guten sagen wollte, prüfen andere Zeilen wirklich,
     * jede gegen eine benannte zweite Quelle: „Räume ohne Außenwand" (jeder
     * Raum trägt eine Hülle), „Abschluss nach oben/unten" (jedes Randgeschoss
     * ist geschlossen) und „Außenwände gegen den Umfang" (die Hülle deckt die
     * Fassade). Die Zahl der Bauteile selbst steht im Bericht, Kapitel
     * Bauteile und U-Werte, und im Raumbuch.
     *
     * Der rote Zweig bleibt unverändert: kein einziges Bauteil im Projekt ist
     * eine Ursache mit einer klaren Sollzahl — ein beheizter Raum hat
     * mindestens ein Bauteil — und hält den Bericht auf. */
    if (!grund) return [];
    const datum = p && p.meta_herkunft && p.meta_herkunft.plandatum;
    return [zeile({
      id: "bauteile_bestand", titel: "Bauteile im Projekt", art: "befund",
      ist: 0, soll: null, einheit: "Bauteile", stufe: "fehler",
      quelle_soll: "ein beheizter Raum hat mindestens ein Bauteil",
      text: "Im ganzen Projekt ist kein einziges Bauteil angelegt, über alle "
        + n + " Räume nicht. Deshalb steht die Gebäudeheizlast auf 0,00 kW. "
        + "Diese eine Ursache erzeugt zugleich die Zeilen „Räume ohne "
        + "Außenwand“, „Fenster auf dem Weg ins Raumbuch“ und „Ansichten "
        + "gegen die Gesamtzahl“. Sie stehen unten als Hinweis, mit ihren "
        + "Zahlen, und werden gedruckt; als Fehler zählt nur diese Zeile "
        + "hier, denn es ist ein Versäumnis und nicht vier. " + grund
        + (datum && datum.wert
          ? " Ein Baujahr steht auf dem Blatt nicht; datiert ist es auf den "
            + datum.wert + ". Das Datum des Blattes ist nicht das Baujahr des "
            + "Gebäudes — die Angabe gehört von Hand eingetragen."
          : ""),
      abhilfe: "Im Schritt „Objekt“ das Baujahr eintragen. Danach entstehen die "
        + "Bauteiltypen aus dem Baujahr — bis 2022 aus der Gebäudetypologie, "
        + "ab 2023 aus dem Referenzgebäude des Gebäudemodernisierungsgesetzes — "
        + "und daraus die Bauteile je Raum. Beides sind Startwerte und im "
        + "Bericht als Annahme ausgewiesen; liegt ein Nachweis vor, gehören "
        + "seine U-Werte an ihre Stelle.",
      aufhebbar: false,
    })];
  }

  /* --- alle Zähler ----------------------------------------------------- */
  /** Alle Zeilen, die die Zähler erzeugen — vor der Trennung in Liste und
   *  Bericht. Genau eine Stelle, an der gerechnet wird; zaehler() und
   *  grenzen() sind nur zwei Sichten darauf. */
  function alleZeilen(p, opt) {
    const pr = p || {};
    const mo = opt || {};
    if (!(pr.raeume || []).length) {
      return [zeile({
        id: "leer", titel: "Noch kein Raum erfasst", art: "befund",
        ist: 0, soll: null,
        einheit: "Räume", stufe: "offen",
        text: "Solange kein Raum erfasst ist, kann das Kontrollblatt nichts "
          + "gegenrechnen. Pläne ablegen oder Räume von Hand anlegen.",
      })];
    }
    /* Z1 zuerst: die Flächenprobe braucht sein Ergebnis. Ist die Raumzahl
       eines Geschosses beantwortet, ist die fehlende Gebäudekontur keine
       offene Frage mehr, sondern der Verzicht auf einen zweiten Weg zum
       selben Befund. Das ist die frühe Antwort, die eine spätere Frage
       überflüssig macht (SPEZIFIKATION_STAPEL 10.2). */
    const z1 = zaehlerRaeume(pr);
    const alle = [].concat(
      zaehlerBauteilbestand(pr),
      zaehlerGeschosse(pr), z1, zaehlerFlaeche(pr, z1),
      zaehlerFenster(pr), zaehlerZonen(pr), zaehlerHuelle(pr),
      zaehlerRaumhoehe(pr),
      zaehlerOffeneFragen(pr),
      zaehlerMassstab(pr, mo));
    /* Was der Bearbeiter zur Kenntnis genommen hat, bleibt vollständig
       sichtbar, verliert aber die Sperrwirkung. Angewendet wird das vom
       Prüfkern — von demselben Code, der die Ampel im Kopf rechnet. */
    const K = kern();
    if (K) K.bestaetigungenAnwenden(pr, alle);
    return alle.sort(function (a, b) {
      const d = RANG[a.stufe] - RANG[b.stufe];
      return d !== 0 ? d : String(a.id).localeCompare(String(b.id), "de");
    });
  }

  /** Die Liste zum Abarbeiten: Befunde und Prüfungen, ohne die Grenzen.
   *
   *  Was hier NICHT mehr herauskommt, ist nicht verschwunden — es steht in
   *  grenzen() und von dort im Bericht. Der Unterschied ist die Wirkung:
   *  eine Grenze hält den Bericht nicht auf, zählt nicht in die Ampel und
   *  lässt sich nicht abhaken, weil es daran nichts abzuhaken gibt. */
  function zaehler(p, opt) {
    return alleZeilen(p, opt).filter(function (z) { return z.art !== "grenze"; });
  }

  /** Was diese Berechnung nicht belegt.
   *
   *  Jede Zeile nennt, wogegen nicht geprüft werden konnte, warum nicht, und
   *  was daran hinge, wenn es falsch wäre. In `abhilfe` steht die eine
   *  Unterlage, die die Grenze aufheben würde — als Auskunft, nicht als
   *  Aufgabe. Gedruckt wird das in Kapitel 9 des Berichts. */
  function grenzen(p, opt) {
    return alleZeilen(p, opt).filter(function (z) { return z.art === "grenze"; });
  }

  /** Die Gegenproben: jede Zeile, die eine Sollzahl hat und damit anschlagen
   *  konnte. Bestanden oder nicht — beides gehört in den Bericht, sonst ist
   *  „alle Proben bestanden" eine Behauptung ohne Beleg. */
  function gegenproben(p, opt) {
    return alleZeilen(p, opt).filter(function (z) {
      return z.art === "pruefung" || (z.art === "befund" && z.soll !== null);
    });
  }

  /** Hängt in diesem Projekt überhaupt eine Fläche am Maßstab?
   *
   *  Eine im Plan umfahrene Fläche hängt daran: sie entsteht aus Bildpunkten
   *  mal Maßstab. Eine im Plan ANGESCHRIEBENE Fläche hängt nicht daran, eine
   *  von Hand eingetragene erst recht nicht. Umfahrene Räume tragen die
   *  Kantenlängen der Umfahrung (plan_kanten, siehe modul_plan.übernehmen);
   *  daran sind sie zu erkennen. */
  function massstabTraegtFlaechen(p) {
    return ((p && p.raeume) || []).some(function (r) {
      return !!(r.plan_kanten && r.plan_kanten.length) || !!(r.plan_umfang > 0);
    });
  }

  /** Der Maßstab als eigene Zeile im Blatt — nicht mehr nur im Sperrfall.
   *
   *  EINE SPERRE MUSS ETWAS SPERREN KÖNNEN.
   *
   *  Diese Zeile hielt den Bericht auch dann auf, wenn im ganzen Projekt
   *  keine einzige Fläche aus dem Maßstab stammt. Am Blatt „BV 2-0887
   *  Ziolkowski" sind alle dreizehn Raumflächen im Plan angeschrieben und
   *  werden als Zahl gelesen; ein falscher Maßstab kann an ihnen nichts
   *  verschieben. Eine Sperre ist berechtigt, wenn das Ergebnis ohne sie
   *  GROB FALSCH wäre — nicht, wenn eine Angabe unsicher ist, die in die
   *  Rechnung gar nicht eingeht.
   *
   *  Sie bleibt unverändert eine Sperre, sobald auch nur eine Fläche
   *  umfahren wurde. Sonst steht sie in derselben Liste, mit demselben Text
   *  und einer Warnung statt eines Fehlers — sichtbar, druckbar, aber nicht
   *  im Weg. Weggelassen wird sie nie. */
  function zaehlerMassstab(p, o) {
    if (!o || o.massstab_guete !== "nicht belastbar") return [];
    const traegt = massstabTraegtFlaechen(p);
    return [zeile({
      id: "massstab", titel: "Maßstab nicht belastbar", art: "befund",
      ist: null, soll: null,
      stufe: traegt ? "fehler" : "warnung",
      text: "Die Maßstabsproben sind nicht bestanden. "
        + (traegt
          ? "In diesem Projekt sind Flächen im Plan umfahren; sie entstehen "
            + "aus dem Maßstab. Solange er nicht gesichert ist, ist keine "
            + "dieser Flächen belastbar und damit keine Heizlast."
          : "In diesem Projekt hängt keine Fläche am Maßstab: alle "
            + "Raumflächen sind angeschrieben oder eingetragen. Der unsichere "
            + "Maßstab bleibt ein Mangel der Unterlage, er verschiebt aber "
            + "keine Zahl dieser Rechnung. Er hält den Bericht deshalb nicht "
            + "auf."),
      abhilfe: "Den Maßstab an einer bekannten Maßkette setzen oder das Blatt "
        + "in besserer Auflösung beschaffen.",
      aufhebbar: false })];
  }

  /** Was hält den Bericht auf? Nur Zeilen, die tatsächlich falsch würden. */
  function sperren(p, opt) {
    const o = opt || {};
    return zaehler(p, o).filter(function (z) { return z.stufe === "fehler"; });
  }

  /* =====================================================================
   * Änderungen zurück ins Projekt
   * =====================================================================
   * Ein Pfad ist entweder
   *     raum.<id>.<feld>          Raumbuch, über die Kennung, nicht über den
   *                               Index — Indizes verschieben sich
   *     bauteiltyp.<id>.<feld>    Bauteilbibliothek
   *     zaehler.<id>              Sollzahl, die der Bearbeiter abzählt
   *     meta.x / klima.x / ...    alles Übrige, gepunktet wie in app.js
   * ================================================================== */
  const NUMERISCH = /^zaehler\.|\.(A|h|U|wohnflaeche|theta_e|theta_e_m|n50|delta_u_wb|baujahr)$/;

  function ziel(p, pfad) {
    const t = String(pfad || "").split(".");
    if (t[0] === "raum") {
      const r = (p.raeume || []).find((x) => x.id === t[1]);
      return r ? { o: r, k: t.slice(2).join(".") } : null;
    }
    if (t[0] === "bauteiltyp") {
      const b = (p.bauteiltypen || []).find((x) => x.id === t[1]);
      return b ? { o: b, k: t.slice(2).join(".") } : null;
    }
    if (t[0] === "zaehler") {
      if (!p.kontrollblatt) p.kontrollblatt = {};
      if (!p.kontrollblatt.zaehler) p.kontrollblatt.zaehler = {};
      return { o: p.kontrollblatt.zaehler, k: t.slice(1).join(".") };
    }
    let o = p;
    for (let i = 0; i < t.length - 1; i++) {
      if (o[t[i]] === undefined || o[t[i]] === null) o[t[i]] = {};
      o = o[t[i]];
    }
    return { o: o, k: t[t.length - 1] };
  }

  /** Schreibt einen vom Bearbeiter geänderten Wert zurück und protokolliert
   *  die Herkunft. Ohne Quellentext bleibt die Angabe eine Annahme — so steht
   *  es in SPEZIFIKATION_BERICHT.md 10.3, und das ist der einzige Grund,
   *  warum eine Überschreibung überhaupt eine Klasse ändern darf. */
  function schreiben(p, pfad, wert, quelle) {
    const z = ziel(p, pfad);
    if (!z) return { ok: false, grund: "Pfad nicht gefunden: " + pfad };
    const num = NUMERISCH.test(pfad);
    const v = num ? zahl(wert, null) : (wert === undefined ? null : wert);
    if (num && wert !== "" && wert != null && v === null) {
      return { ok: false, grund: "Keine Zahl: " + wert };
    }
    z.o[z.k] = v;
    if (!p.herkunft) p.herkunft = {};
    const q = quelle == null ? "" : String(quelle).trim();
    const h = {
      herkunft: "eingabe",
      quelle: q || null,
      konfidenz: q.length >= 3 ? "sicher" : "unsicher",
      fundstelle: q || null,
      zeit: ortszeitStempel(),
    };
    p.herkunft[pfad] = h;
    if (!p.kontrollblatt) p.kontrollblatt = {};
    if (!p.kontrollblatt.gesehen) p.kontrollblatt.gesehen = {};
    /* Eine abgezaehlte Sollzahl ist keine durchgegangene Zeile des Raumbuchs. */
    if (!/^zaehler\./.test(pfad)) {
      p.kontrollblatt.gesehen[pfad] = h.zeit;
      p.kontrollblatt.gesehen[pfad.replace(/^(raum\.[^.]+)\..*$/, "$1")] = h.zeit;
    }
    return { ok: true, wert: v, herkunft: h, klasse: klasse(h) };
  }

  /** Durchgesehen, ohne zu ändern. Ohne Quelle hebt das die Konfidenzklasse
   *  ausdrücklich NICHT an: gesehen ist keine Quelle. */
  function bestaetigen(p, pfad, quelle) {
    if (!p.kontrollblatt) p.kontrollblatt = {};
    if (!p.kontrollblatt.gesehen) p.kontrollblatt.gesehen = {};
    const zeit = ortszeitStempel();
    p.kontrollblatt.gesehen[pfad] = zeit;
    const q = quelle == null ? "" : String(quelle).trim();
    if (q.length >= 3) {
      if (!p.herkunft) p.herkunft = {};
      const alt = p.herkunft[pfad] || {};
      p.herkunft[pfad] = {
        herkunft: "eingabe", quelle: q, konfidenz: "sicher", fundstelle: q,
        zeit: zeit, vorher: alt.herkunft || null,
      };
      return { ok: true, klasse: "A" };
    }
    return { ok: true, klasse: null, hinweis: "ohne Quelle bleibt die Angabe Annahme" };
  }

  /* Ein Pfad zeigt auf eine Raum- oder Wertzeile, alles andere auf einen
     Befund unter „Was fehlen könnte". */
  const PFAD = /^(raum|bauteiltyp|meta|klima|luftdichtheit|norm|zaehler|plan)\./;

  /** Zur Kenntnis genommen — der eine Vorgang dieses Blattes.
   *
   *  Bis hierher gab es zwei: bestaetigen() setzte still einen Haken an eine
   *  Raum- oder Wertzeile, sperreAufheben() verlangte für einen Befund eine
   *  getippte Begründung. Bei zwölf offenen Zeilen ist das eine Zumutung, und
   *  es war der Grund, warum der Zähler auf „0 von 21" stehen blieb.
   *
   *  Jetzt gilt für beides dasselbe: ein Klick genügt, eine Bemerkung darf
   *  man dazuschreiben. Verlangt wird sie nur dort, wo die Zeile eine echte
   *  Sperre ist (grund_pflicht). Bei einer Raum- oder Wertzeile ist die
   *  Bemerkung zugleich die Quelle und hebt die Konfidenzklasse auf A; bei
   *  einem Befund ist sie der Vermerk, der im Bericht erscheint. */
  /** Trägt eine Zeile ihre eigene Kennung? Gebraucht wird das, um die
   *  Begründungspflicht an der ZEILE festzumachen und nicht an der
   *  aufrufenden Stelle. Ist die Kennung unbekannt, gilt die alte Regel:
   *  ein Klick genügt. */
  function zeileAufhebbar(p, id) {
    let alle = [];
    try { alle = alleZeilen(p) || []; } catch (x) { alle = []; }
    const z = alle.find(function (x) { return x.id === id; });
    if (z) return z.aufhebbar !== false;
    const pr = (typeof window !== "undefined" && window.App && window.App.pruefung)
      || null;
    const y = ((pr && pr.pruefungen) || []).find(function (x) {
      return x.id === id || x.kb_id === id; });
    return y ? y.aufhebbar !== false : true;
  }

  function zurKenntnis(p, ziel, bemerkung, opt) {
    const o = opt || {};
    if (PFAD.test(String(ziel || ""))) return bestaetigen(p, ziel, bemerkung);
    const K = kern();
    if (!K) return { ok: false, grund: "Prüfkern nicht geladen" };
    /* OB EIN KLICK GENÜGT, ENTSCHEIDET DIE ZEILE — NICHT DER AUFRUFER.
       Bis zum 23.08.2026 setzte jede aufrufende Stelle grund_pflicht selbst.
       Der Sammelknopf und das Häkchen setzten es nie, und damit war jede
       Zeile über diesen Weg mit einem Klick abzuräumen, auch ein
       Widerspruch zwischen zwei Zahlen. Jetzt liest die Sperre an der Zeile,
       und keine aufrufende Stelle kann sie versehentlich umgehen. */
    const pflicht = o.grund_pflicht !== undefined
      ? !!o.grund_pflicht : !zeileAufhebbar(p, ziel);
    return K.bestaetigungEintragen(p, ziel, {
      grund: bemerkung,
      grund_pflicht: pflicht,
      wer: o.wer === undefined ? bearbeiter(p) : o.wer,
    });
  }

  /** Die freiwillige Bemerkung nachtraeglich aendern. Zeitpunkt und Name der
   *  urspruenglichen Bestaetigung bleiben stehen — sonst datiert sich eine
   *  Bestaetigung durch blosses Tippen selbst um. */
  function bemerkungSchreiben(p, id, text) {
    const K = kern();
    /* Dieser Grund landet als Meldung in der Seite vor den Augen des
       Bearbeiters. */
    if (!K) return { ok: false, grund: "Das Prüfmodul ist in dieser Fassung nicht "
      + "geladen. Die Bemerkung lässt sich deshalb nicht speichern; bitte Sebastian "
      + "Hund melden." };
    const alt = K.bestaetigungen(p)[id];
    if (!alt) return { ok: false, grund: "noch nicht zur Kenntnis genommen" };
    return K.bestaetigungEintragen(p, id,
      { grund: text, zeit: alt.zeit, wer: alt.wer });
  }

  function zurKenntnisZurueck(p, ziel) {
    if (PFAD.test(String(ziel || ""))) {
      if (p.kontrollblatt && p.kontrollblatt.gesehen) delete p.kontrollblatt.gesehen[ziel];
      return { ok: true };
    }
    const K = kern();
    return K ? K.bestaetigungZuruecknehmen(p, ziel) : { ok: false };
  }

  /** Eine echte Sperre: dieselbe Ablage, aber mit Begründungspflicht. */
  function sperreAufheben(p, id, grund) {
    return zurKenntnis(p, id, grund, { grund_pflicht: true });
  }

  /** Alle Befunde, die noch niemand zur Kenntnis genommen hat — die Zähler
   *  dieses Blattes und die Befunde der Selbstprüfung in einer Liste. Genau
   *  diese Liste beschriftet den Sammelknopf und wird von ihm bestätigt,
   *  damit die angezeigte Zahl und die Wirkung dieselbe Menge meinen. */
  function offeneBefunde(zn, pr) {
    const raus = (zn || []).filter(function (z) {
      return z.stufe !== "gut" && !z.bestaetigt;
    }).map(function (z) {
      return { id: z.id, titel: z.titel, aufhebbar: z.aufhebbar !== false };
    });
    ((pr && pr.pruefungen) || []).forEach(function (x) {
      if (x.gruppe === "kontrollblatt") return;      // steht schon in zn
      if (x.stufe === "gut" || x.stufe === "bestaetigt" || x.bestaetigt) return;
      raus.push({ id: x.id, titel: x.titel, aufhebbar: x.aufhebbar !== false });
    });
    return raus;
  }

  /* =====================================================================
   * Werte mit Herkunft
   * ================================================================== */
  /** Die Objektwerte, die das Ergebnis tragen, mit ihrer Herkunft. Ein Wert
   *  ohne hinterlegte Herkunft gilt als Annahme, nie als belegt. */
  function werte(p, opt) {
    const raus = [];
    const nimm = function (pfad, label, wert, einheit, ers) {
      const h = herkunftLesen(p, pfad) || ers || null;
      raus.push({ pfad: pfad, label: label, wert: wert, einheit: einheit || "",
                  herkunft: h, klasse: klasse(h, opt),
                  gesehen: !!(p.kontrollblatt && p.kontrollblatt.gesehen
                              && p.kontrollblatt.gesehen[pfad]) });
    };
    const m = p.meta || {}, k = p.klima || {}, l = p.luftdichtheit || {};
    nimm("meta.baujahr", "Baujahr", m.baujahr, "");
    nimm("meta.aussenmasse", "Außenmaße", m.aussenmasse, "m");
    nimm("meta.wohnflaeche", "Wohnfläche", m.wohnflaeche, "m²",
      m.wohnflaeche_quelle ? { herkunft: "eingabe", quelle: m.wohnflaeche_quelle } : null);
    nimm("klima.theta_e", "Norm-Außentemperatur", k.theta_e, "°C",
      k.quelle ? { herkunft: "norm", quelle: k.quelle } : null);
    nimm("klima.theta_e_m", "Jahresmitteltemperatur", k.theta_e_m, "°C",
      k.quelle ? { herkunft: "norm", quelle: k.quelle } : null);
    nimm("luftdichtheit.n50", "Luftwechsel n50", l.n50, "1/h",
      { herkunft: l.kategorie === "messung" ? "eingabe" : "typologie",
        quelle: l.quelle || null, konfidenz: l.kategorie === "messung" ? "sicher" : "geraten" });
    nimm("norm.delta_u_wb", "Wärmebrückenzuschlag", (p.norm || {}).delta_u_wb, "W/(m²·K)",
      { herkunft: "norm", quelle: "pauschaler Ansatz ohne gesonderten Nachweis" });
    const wd = wanddicke(p);
    nimm("zaehler.wanddicke", "Dicke der Außenwand", wd.d, "m",
      wd.d ? { herkunft: wd.quelle === "im Plan gemessen" ? "plan_gerechnet" : "eingabe",
               quelle: wd.quelle } : null);
    return raus;
  }

  /** Räume mit Herkunft je Wert. Unsichere zuerst — das ist die Reihenfolge,
   *  in der durchgegangen wird. */
  function raumzeilen(p, opt) {
    const typ = {};
    (p.bauteiltypen || []).forEach(function (t) { typ[t.id] = t; });
    const zs = (p.raeume || []).map(function (r) {
      /* WOHER DIE FLÄCHE WIRKLICH KOMMT.
       *
       * Hier fiel jeder aus einem Plan übernommene Raum auf
       * „plan_gerechnet" — „aus der Geometrie gemessen" — durch, weil nur
       * das alte Feld ki_herkunft abgefragt wurde. Die Übernahme aus der
       * Planauslese schreibt aber r.herkunft mit flaeche_gelesen und
       * flaeche_quelle („im Plan angeschrieben"). Folge, gemessen am
       * 22.08.2026 an „BV 2-0887 Ziolkowski": alle 13 Raumflächen standen
       * als gemessen und in Klasse C da, obwohl jede einzelne als
       * Flächenstempel im Plan steht. Das ist nicht nur ein falsches Wort:
       * eine gemessene Fläche hängt am Maßstab, eine angeschriebene nicht. */
      const rh = r.herkunft || null;
      const hA = herkunftLesen(p, "raum." + r.id + ".A")
        || (r.ki_herkunft
            ? { herkunft: "plan_gelesen", konfidenz: r.ki_herkunft.konfidenz,
                fundstelle: r.ki_herkunft.fundstellen, quelle: r.ki_herkunft.quelle }
            : (rh && rh.flaeche_gelesen
              ? { herkunft: "plan_gelesen", konfidenz: rh.konfidenz,
                  fundstelle: rh.flaeche_quelle || "im Plan angeschrieben",
                  quelle: [rh.quelle, rh.blatt].filter(Boolean).join(" · ") }
              : { herkunft: "plan_gerechnet" }));
      /* Dasselbe für die Höhe: „aus der Typologie vorbelegt" stand auch dort,
         wo der Schnitt sie hergegeben hat, und auch dort, wo das Werkzeug
         sie ausdrücklich als nicht ablesbar vermerkt hat. */
      const hH = herkunftLesen(p, "raum." + r.id + ".h")
        || (rh && rh.hoehe_quelle
          ? (rh.hoehe_angenommen
            ? { herkunft: "typologie", quelle: rh.hoehe_quelle }
            : { herkunft: "plan_gelesen", konfidenz: rh.konfidenz,
                fundstelle: rh.hoehe_quelle, quelle: rh.hoehe_quelle })
          : { herkunft: "typologie", quelle: "Vorbelegung nach Baualtersklasse" });
      const huelle = (r.bauteile || []).filter(istHuelle).length;
      const fenster = (r.bauteile || []).filter(function (b) {
        return istFenster(b.name || (typ[b.typ_id] && typ[b.typ_id].name));
      }).length;
      const kA = klasse(hA, opt), kH = klasse(hH, opt);
      const maengel = [];
      if (!(zahl(r.A, 0) > 0)) maengel.push("keine Fläche");
      if (!(zahl(r.h, 0) > 0)) maengel.push("keine Höhe");
      if (!huelle) maengel.push("kein Hüllbauteil");
      if (!r.we) maengel.push("keine Nutzungseinheit");
      return {
        raum: r, hA: hA, hH: hH, klasseA: kA, klasseH: kH,
        huelle: huelle, fenster: fenster, maengel: maengel,
        gesehen: !!(p.kontrollblatt && p.kontrollblatt.gesehen
                    && p.kontrollblatt.gesehen["raum." + r.id]),
        rang: maengel.length ? 0 : (kA === "C" || kH === "C" ? 1 : 2),
      };
    });
    return zs.sort(function (a, b) {
      if (a.rang !== b.rang) return a.rang - b.rang;
      const g = String(a.raum.geschoss || "").localeCompare(String(b.raum.geschoss || ""), "de");
      return g !== 0 ? g : String(a.raum.name || "").localeCompare(String(b.raum.name || ""), "de");
    });
  }

  /* =====================================================================
   * Zustand der Bedienung
   * ================================================================== */
  const S = {
    nurOffen: false,     // Filter: nur, was noch nicht durchgegangen ist
    fokus: null,         // Zeile, die nach dem Neuzeichnen den Fokus bekommt
    verdrahtet: false,
    hilfe: false,
  };

  function projekt() { return window.App ? window.App.p : null; }

  /** Maßstabsgüte aus kern_massstabsprobe. Dieselbe Zuordnung wie in
   *  kern_pruefung.pruefeMassstab, damit beide dasselbe sagen. */
  function massstab(p, e) {
    const MP = typeof window !== "undefined" && window.KERN_MASSSTABSPROBE;
    if (!MP || !e || !e.raeume) return null;
    try {
      return MP.pruefe({
        kette: (p.plan && p.plan.masskette) || null,
        kandidaten_px_je_meter: (p.plan && p.plan.kandidaten_px_je_meter) || [],
        gemessen: (p.plan && p.plan.gemessen) || {},
        px_je_meter_aus_papier: p.plan && p.plan.px_je_meter_aus_papier,
        px_je_meter_aus_kette: p.plan && p.plan.px_je_meter_aus_kette,
        raeume: e.raeume,
        wohnflaeche: p.meta && p.meta.wohnflaeche,
        summe_raumflaechen: e.A_gesamt,
        /* DIE HERKUNFT DER FLÄCHEN MUSS MIT.
           Ohne sie fällt kern_massstabsprobe auf den Satz „Die Flächen sind
           von Hand eingetragen" zurück — und das stand hier auf jedem
           Projekt, dessen Flächen aus dem Plan gelesen sind. Der Bericht
           sagte an derselben Stelle das Richtige. Zwei Auskünfte über
           dieselbe Rechnung, und die falsche stand da, wo hingesehen wird. */
        flaechen_herkunft: (kern() && kern().flaechenHerkunft)
          ? kern().flaechenHerkunft(p) : null,
      });
    } catch (x) { return null; }
  }

  /* =====================================================================
   * Oberfläche
   * ================================================================== */
  const STIL = '<style>'
    + '#kontrollblatt .kbz{cursor:default;outline:0}'
    + '#kontrollblatt .kbz:focus{box-shadow:0 0 0 2px var(--blau)}'
    + '#kontrollblatt .kbz .zahl{font-variant-numeric:tabular-nums;font-weight:600;'
    + 'white-space:nowrap}'
    + '#kontrollblatt .kbwerk{display:flex;flex-wrap:wrap;gap:6px;align-items:center;'
    + 'margin-top:8px}'
    + '#kontrollblatt .kbwerk input{padding:4px 7px;font-size:13px;border:1px solid '
    + 'var(--linie);border-radius:6px;background:var(--weiss)}'
    /* Rot bleibt kraeftig, weil es selten ist. Annahme faerbt fast jede Zeile
       eines Altbauprojekts; in voller Staerke war die Tabelle eine gelbe Wand
       und der eine rote Mangel darin verschwand. Darum nur ein Hauch. */
    + '#kontrollblatt tr.mangel > td{background:var(--rot-bg)}'
    + '#kontrollblatt tr.annahme > td{background:#FEFBF2}'
    + '#kontrollblatt tr.annahme > td:first-child{box-shadow:inset 3px 0 0 var(--warn)}'
    + '#kontrollblatt tr.mangel > td:first-child{box-shadow:inset 3px 0 0 var(--rot)}'
    + '#kontrollblatt tr.gesehen > td{background:var(--neutral);color:var(--mute)}'
    + '#kontrollblatt .kbkopf{display:grid;gap:10px;margin-bottom:18px;'
    + 'grid-template-columns:repeat(auto-fit,minmax(172px,1fr))}'
    /* Farbige Flaechen bekommen nach dem Markenbuch eine 1-px-Kontur, keinen
       vier Pixel breiten Balken an der Seite. */
    + '#kontrollblatt .kbkachel{background:var(--neutral);border:1px solid var(--linie);'
    + 'border-radius:var(--r-k);padding:11px 13px;display:flex;flex-direction:column;gap:1px}'
    + '#kontrollblatt .kbkachel.warnung{background:var(--warn-bg);'
    + 'border-color:var(--warn-linie);color:#6B4D00}'
    + '#kontrollblatt .kbkachel.fehler{background:var(--rot-bg);'
    + 'border-color:var(--rot-linie);color:#6E1329}'
    + '#kontrollblatt .kbkachel.gut{background:var(--ok-bg);border-color:var(--ok-linie);'
    + 'color:#245229}'
    + '#kontrollblatt .kbkachel .mark{font-size:11.5px;text-transform:uppercase;'
    + 'letter-spacing:.04em;opacity:.8;font-weight:600}'
    + '#kontrollblatt .kbkachel b{display:block;font-size:17px;'
    + 'font-family:var(--schrift-h);line-height:1.25}'
    + '#kontrollblatt .kbkachel .unten{font-size:12px;opacity:.85;line-height:1.35}'
    /* Der Knopf "durchgegangen" war mit "b" beschriftet, dem Tastenkuerzel.
       Ein Buchstabe ist kein Sinnbild; jetzt traegt er einen gezeichneten
       Haken und einen Namen fuer das Vorleseprogramm. */
    + '#kontrollblatt .kbgesehen{width:30px;height:26px;padding:0;justify-content:center;'
    + 'color:var(--mute-2)}'
    + '#kontrollblatt .kbgesehen .ikon{width:15px;height:15px;stroke-width:2.4}'
    + '#kontrollblatt .kbgesehen[aria-pressed="true"]{background:var(--ok-bg);'
    + 'border-color:var(--ok);color:var(--ok)}'
    + '#kontrollblatt .kbtasten{font-size:12px;color:var(--mute);margin:6px 0 0}'
    + '#kontrollblatt .kbhaken{display:inline-flex;align-items:center;gap:6px;'
    + 'font-size:13px;font-weight:600;cursor:pointer;padding:3px 8px;border:1px solid '
    + 'var(--linie);border-radius:6px;background:var(--weiss)}'
    + '#kontrollblatt .kbhaken input{width:15px;height:15px;cursor:pointer}'
    + '#kontrollblatt .kbwer{font-size:12px;color:var(--mute)}'
    /* Die Grenzen sind bewusst ruhiger gesetzt als die Liste darueber: sie
       verlangen nichts, sie erklaeren. */
    + '#kontrollblatt .kbgrenze{background:var(--neutral);border-color:var(--linie)}'
    + '#kontrollblatt .kbabhilfe{display:inline-block;margin-top:5px;font-size:12.5px;'
    + 'color:var(--mute)}'
    + '</style>';

  /* Text an der Wortgrenze kuerzen. Ein harter Schnitt nach n Zeichen endete
     mitten im Wort ("Ein Massstabsfehler i") und sah nach einem Fehler aus.
     Der volle Wortlaut bleibt im title erreichbar. */
  function kuerzen(text, hoechstens) {
    const t = String(text == null ? "" : text).trim();
    if (t.length <= hoechstens) return t;
    const teil = t.slice(0, hoechstens);
    const luecke = teil.lastIndexOf(" ");
    return (luecke > hoechstens * 0.5 ? teil.slice(0, luecke) : teil).replace(/[,;:.\s]+$/, "")
      + "…";
  }

  function kachel(titel, wert, unten, stufe) {
    const voll = String(unten == null ? "" : unten).trim();
    const kurz = kuerzen(voll, 132);
    return '<div class="kbkachel' + (stufe ? " " + stufe : "") + '">'
      + '<span class="mark">' + esc(titel) + "</span><b>" + esc(wert) + "</b>"
      + '<span class="unten"' + (kurz !== voll ? ' title="' + esc(voll) + '"' : "")
      + ">" + esc(kurz) + "</span></div>";
  }

  /* Die Einheit eines Zaehlers steht hinter seiner Zahl. Bei genau eins stand
     dort "1 Räume", "1 Bereiche", "1 Blätter". Ein Zaehler, der nicht zaehlen
     kann, macht misstrauisch gegen jede andere Zahl auf dem Blatt. */
  const EINHEIT_EINZAHL = {
    "Räume": "Raum", "Bereiche": "Bereich", "Bereich": "Bereich",
    "Blätter": "Blatt", "Ebenen": "Ebene", "Fenster": "Fenster",
    "Zeilen": "Zeile", "m²": "m²", "Bauteile": "Bauteil", "m": "m",
    "Geschoss": "Geschoss", "Geschosse": "Geschoss",
  };
  function einheitZu(anzahl, einheit) {
    const e = String(einheit == null ? "" : einheit);
    if (Number(anzahl) !== 1) return e;
    return EINHEIT_EINZAHL[e] || e;
  }

  /* Zahl UND Einheit in einem Text. Eine Stueckzahl hat keine
     Nachkommastellen: "17,00 Fenster als richtig anerkennen", "1,00
     Bereich", "2,00 Ebenen" und "0,00 Räume" standen so auf den Knoepfen der
     Rueckfragen (Prueflaeufe vom 26.08.2026, vier von fuenf Plaenen). Zwei
     Nachkommastellen hinter einer Anzahl behaupten eine Genauigkeit, die es
     bei Stueckzahlen nicht gibt, und lesen sich wie ein Messwert.
     Masseinheiten behalten ihre zwei Stellen. */
  const MASSEINHEITEN = { "m": 1, "m²": 1, "m³": 1, "W": 1, "kW": 1,
                          "W/m²": 1, "°C": 1, "K": 1, "%": 1 };
  function zaehleinheit(einheit) {
    const e = String(einheit == null ? "" : einheit).trim();
    return e !== "" && !MASSEINHEITEN[e];
  }
  function mengeText(anzahl, einheit) {
    const n = Number(anzahl);
    const e = String(einheit == null ? "" : einheit).trim();
    if (!Number.isFinite(n)) return "";
    if (!zaehleinheit(e)) return de(n, 2) + (e ? " " + e : "");
    const g = Math.round(n);
    return de(g, 0) + " " + einheitZu(g, e);
  }

  /** Eine Grenze im Blatt: zum Lesen, nicht zum Abhaken.
   *
   *  Bewusst OHNE Haken, ohne Eingabefeld und ohne Knopf. Ein Bedienelement
   *  an einer Zeile ist ein Versprechen, dass sich etwas tun lässt; an einer
   *  Grenze wäre das ein falsches Versprechen. Was die Grenze aufheben würde,
   *  steht als Satz da — als Auskunft, nicht als Aufgabe. */
  function grenzeZeileHtml(z, p) {
    const nk = z.einheit === "m²" ? 2 : 0;
    const chip = z.ist === null ? ""
      : ' <span class="zahl">' + esc(de(z.ist, nk)) + " "
        + esc(einheitZu(z.ist, z.einheit)) + "</span>";
    /* Das Eingabefeld bleibt — der Haken nicht. Der Unterschied ist genau der
       Punkt: abhaken hieße, eine Frage für erledigt zu erklären, ohne dass
       sich etwas geändert hat. Eine Zahl eintragen dagegen HEBT die Grenze
       wirklich auf: sie ist die fehlende zweite Quelle, und die Zeile
       verschwindet danach von selbst und wird zu einer Prüfung. Ohne das Feld
       stünde hier „die Kontur hier eintragen" neben einer Zeile, in der man
       nichts eintragen kann. */
    const feld = (z.frage && p)
      ? '<div class="kbwerk"><input type="text" inputmode="decimal" size="6" '
        + 'data-kb-pfad="' + esc(z.frage.pfad) + '" value="'
        + esc(kbZaehler(p, z.frage.pfad.replace(/^zaehler\./, "")) == null ? ""
              : kbZaehler(p, z.frage.pfad.replace(/^zaehler\./, "")))
        + '" placeholder="' + esc(z.frage.label) + '" title="' + esc(z.frage.label)
        + '" aria-label="' + esc(z.frage.label) + '">'
        + '<span style="font-size:12px;color:var(--mute)">' + esc(z.frage.label)
        + (z.frage.einheit ? " [" + esc(z.frage.einheit) + "]" : "") + "</span></div>"
      : "";
    return '<div class="meldung hinweis kbgrenze"><span class="sym">i</span><div>'
      + "<b>" + esc(z.titel) + "</b>" + chip + "<br>" + esc(z.text)
      + (z.abhilfe
        ? '<br><span class="kbabhilfe">Aufheben ließe sich das so: '
          + esc(z.abhilfe) + "</span>"
        : "")
      + feld
      + "</div></div>";
  }

  function zaehlerZeileHtml(z, p, bestaetigtVon) {
    if (bestaetigtVon && !z.bestaetigt) { z.bestaetigt = bestaetigtVon; z.stufe = "bestaetigt"; }
    const nk = z.einheit === "m²" ? 2 : 0;
    const chip = z.ist === null ? ""
      : '<span class="zahl">' + esc(de(z.ist, nk)) + " " + esc(einheitZu(z.ist, z.einheit))
        + (z.soll === null ? ""
          : (z.soll === 0 ? ", zulässig sind 0"
            : " von " + esc(de(z.soll, nk)))) + "</span>";
    const werk = [];
    if (z.frage) {
      werk.push('<input type="text" inputmode="decimal" size="6" data-kb-pfad="'
        + esc(z.frage.pfad) + '" value="'
        + esc(kbZaehler(p, z.frage.pfad.replace(/^zaehler\./, "")) == null ? ""
              : kbZaehler(p, z.frage.pfad.replace(/^zaehler\./, "")))
        + '" placeholder="' + esc(z.frage.label) + '" title="' + esc(z.frage.label)
        + '" aria-label="' + esc(z.frage.label) + '">'
        + '<span style="font-size:12px;color:var(--mute)">' + esc(z.frage.label)
        + (z.frage.einheit ? " [" + esc(z.frage.einheit) + "]" : "") + "</span>");
    }
    (z.aktionen || []).forEach(function (a) {
      werk.push('<button class="btn klein" data-aktion="' + esc(a.aktion) + '" data-kb-id="'
        + esc(z.id) + '"' + (a.data && a.data.name ? ' data-kb-name="' + esc(a.data.name) + '"' : "")
        + (a.data && a.data.g ? ' data-kb-g="' + esc(a.data.g) + '"' : "")
        + ">" + esc(a.text) + "</button>");
    });
    /* Der Haken. Ein Klick genügt; die Bemerkung ist freiwillig und erscheint
       erst, wenn der Haken sitzt — sie ist ein Zusatz, keine Bedingung.
       Zeilen, die eine echte Sperre sind (aufhebbar === false), bleiben beim
       geschriebenen Grund: ein fehlendes Geschoss oder ein ungesicherter
       Maßstab lässt sich nicht mit einem Klick beurteilen. */
    if (z.stufe !== "gut") {
      if (z.bestaetigt) {
        werk.push('<label class="kbhaken"><input type="checkbox" checked '
          + 'data-aktion="kbZurKenntnis" data-kb-id="' + esc(z.id)
          + '"> zur Kenntnis genommen</label>');
        werk.push('<input type="text" size="30" data-kb-bemerkung="' + esc(z.id)
          + '" aria-label="Bemerkung zur Bestätigung" placeholder="Bemerkung, freiwillig"'
          + ' value="' + esc(z.bestaetigt.grund || "") + '">');
        werk.push('<span class="kbwer">' + esc(vermerkText(z.bestaetigt)) + "</span>");
      } else if (z.aufhebbar) {
        werk.push('<label class="kbhaken"><input type="checkbox" '
          + 'data-aktion="kbZurKenntnis" data-kb-id="' + esc(z.id)
          + '"> zur Kenntnis genommen</label>');
      } else {
        werk.push('<button class="btn klein" data-aktion="kbSperreAufheben" data-kb-id="'
          + esc(z.id) + '">'
          + esc(z.begruendung_knopf || "nur mit schriftlicher Begründung zu bestätigen")
          + "</button>");
      }
    }
    return '<div class="kbz meldung ' + CSS[z.stufe] + '" data-kb-zeile="' + esc(z.id)
      + '" tabindex="0"><span class="sym">' + SYMBOL[z.stufe] + "</span><div>"
      + "<b>" + esc(z.titel) + "</b> " + chip
      + (z.quelle_soll ? ' <span class="chip">' + esc(z.quelle_soll) + "</span>" : "")
      + "<div>" + esc(z.text) + "</div>"
      + (werk.length ? '<div class="kbwerk">' + werk.join("") + "</div>" : "")
      + "</div></div>";
  }

  function herkunftChip(h, kl) {
    const t = h && HERKUENFTE[h.herkunft] ? HERKUENFTE[h.herkunft] : "ohne Herkunft";
    const css = kl === "A" ? "belegt" : (kl === "B" ? "" : "annahme");
    return '<span class="chip ' + css + '" title="' + esc(KLASSENTEXT[kl] || "")
      + (h && h.quelle ? " — " + esc(h.quelle) : "") + '">' + esc(t) + " · " + kl + "</span>";
  }

  function raumTabelle(p, opt) {
    const zs = raumzeilen(p, opt).filter(function (x) {
      return !S.nurOffen || raumOffen(x);
    });
    if (!zs.length) {
      return '<div class="meldung gut"><span class="sym">OK</span><div>Alle Räume sind '
        + "durchgegangen.</div></div>";
    }
    return '<div style="overflow-x:auto"><table class="tab"><thead><tr>'
      + '<th style="width:66px">Gesch.</th><th style="min-width:130px">Raum</th>'
      + '<th style="width:82px" class="num">A [m²]</th>'
      + '<th style="width:74px" class="num">h [m]</th>'
      + '<th style="width:118px" class="num">Bauteile</th>'
      + "<th>Herkunft der Fläche</th><th>Quelle, gilt für diese Zeile</th>"
      + '<th style="width:52px">Gesehen</th></tr></thead><tbody>'
      + zs.map(function (x) {
          const r = x.raum;
          const kl = raumAmpel(x);
          const pA = "raum." + r.id + ".A", pH = "raum." + r.id + ".h";
          return '<tr class="' + kl + '" data-kb-zeile="raum.' + esc(r.id)
            + '" tabindex="0"><td>' + esc(r.geschoss || "–") + "</td>"
            + "<td>" + esc(r.name || "ohne Namen")
            + (x.maengel.length ? '<br><span style="font-size:12px;color:var(--rot)">'
                + esc(x.maengel.join(", ")) + "</span>" : "")
            + "</td>"
            + '<td class="num"><input type="text" inputmode="decimal" size="6" '
            + 'data-kb-pfad="' + pA + '" aria-label="Fläche" value="'
            + esc(zahl(r.A, 0) ? de(zahl(r.A), 2) : "") + '"></td>'
            + '<td class="num"><input type="text" inputmode="decimal" size="5" '
            + 'data-kb-pfad="' + pH + '" aria-label="Höhe" value="'
            + esc(zahl(r.h, 0) ? de(zahl(r.h), 2) : "") + '"></td>'
            + '<td class="num" style="white-space:nowrap">' + x.huelle + " Hülle · "
            + x.fenster + " Fenster</td>"
            + "<td>" + herkunftChip(x.hA, x.klasseA) + "</td>"
            + '<td><input type="text" size="16" data-kb-quelle="raum.' + esc(r.id)
            + '" aria-label="Quelle für diese Zeile" placeholder="woher die Werte stammen"'
            + ' value="' + esc((herkunftLesen(p, pA) && herkunftLesen(p, pA).quelle)
                               || (x.hA && x.hA.quelle) || "") + '"></td>'
            + '<td><button class="btn klein kbgesehen" data-aktion="kbGesehen" '
            + 'data-kb-pfad="raum.' + esc(r.id) + '" aria-pressed="'
            + (x.gesehen ? "true" : "false") + '" title="'
            + (x.gesehen ? "Durchgegangen, klicken hebt es auf" : "Als durchgegangen markieren")
            + ' (Taste b)" aria-label="' + esc(r.name || "Raum")
            + ' als durchgegangen markieren">' + window.ikon("haken")
            + "</button></td></tr>";
        }).join("")
      + "</tbody></table></div>";
  }

  /* Was der Schalter „nur Offene zeigen" meint — an einer Stelle festgelegt,
     damit er in allen drei Listen dasselbe verspricht und dasselbe tut. */
  function befundOffen(z) { return z.stufe !== "gut" && !z.bestaetigt; }

  /** Die Ampel einer Raumzeile, an EINER Stelle festgelegt.
   *
   *  Das Prüfblatt färbt seine Marken auf dem Plan damit ein, und die Tabelle
   *  hier färbt ihre Zeilen damit ein. Wären es zwei Regeln, könnte ein Raum
   *  auf dem Plan grün und in der Liste rot sein — und der Bearbeiter hätte
   *  keinen Anhalt, welcher der beiden Bildschirme lügt.
   *
   *  Reihenfolge und Bedeutung:
   *    mangel   Etwas fehlt, mit dem sich nicht rechnen lässt: Fläche, Höhe,
   *             Hüllbauteil, Nutzungseinheit. Rot.
   *    gesehen  Der Bearbeiter ist die Zeile durchgegangen. Das schlägt die
   *             Annahme — er hat sie gesehen und stehen lassen.
   *    annahme  Fläche ODER Höhe ist nicht belegt (Klasse C). Gelb, zu prüfen.
   *    ""       Beides belegt. Grün.
   *
   *  DIE HÖHE GEHÖRT DAZU, und sie stand bis zum 23.08.2026 nicht drin.
   *  GEMESSEN im echten Durchlauf mit „14_BA 04_OG.pdf": vierzehn Räume, jede
   *  Fläche als Flächenstempel im Plan belegt (Klasse A), jede Höhe die
   *  Vorbelegung 2,60 m aus der Baualtersklasse (Klasse C). Die Kopfzeile des
   *  Prüfblatts las sich daraufhin „14 Räume erkannt · nichts mehr zu prüfen",
   *  und im Kontrollblatt stand keine einzige gelbe Zeile — während rechts
   *  daneben „Lichte Höhe 2,60 m angenommen" stand.
   *  Die Höhe ist kein Nebenwert: sie geht über das Raumvolumen unmittelbar in
   *  die Lüftungsheizlast und über die Wandflächen in die Transmission. Ein
   *  Bildschirm, der eine angenommene Höhe grün zeigt, meldet Ruhe, wo keine
   *  ist. Zurück auf Grün kommt die Zeile auf zwei Wegen, und beide sind
   *  richtig: die Höhe belegen (Schnitt, eigene Angabe mit Quelle) oder sie
   *  ausdrücklich durchgehen und stehen lassen.
   */
  function raumAmpel(x) {
    if (!x) return "";
    if (x.maengel && x.maengel.length) return "mangel";
    if (x.gesehen) return "gesehen";
    if (x.klasseA === "C" || x.klasseH === "C") return "annahme";
    return "";
  }

  /** Warum eine Zeile gelb ist — im Klartext, für die Anzeige daneben.
   *  Eine gelbe Marke ohne Grund ist eine Aufforderung ohne Auftrag. */
  function annahmegrund(x) {
    const g = [];
    if (!x) return g;
    if (x.klasseA === "C") g.push("Fläche nicht belegt");
    if (x.klasseH === "C") g.push("Höhe nicht belegt");
    return g;
  }
  function raumOffen(x) { return !x.gesehen || x.maengel.length > 0; }
  function wertOffen(w) {
    const leer = w.wert === null || w.wert === undefined || w.wert === "";
    return leer || w.klasse === "C" || !w.gesehen;
  }

  function werteTabelle(p, opt) {
    const ws = werte(p, opt).filter(function (w) {
      return !S.nurOffen || wertOffen(w);
    });
    if (!ws.length) {
      return '<div class="meldung gut"><span class="sym">OK</span><div>Alle Werte sind '
        + "durchgegangen und belegt.</div></div>";
    }
    return '<div style="overflow-x:auto"><table class="tab"><thead><tr>'
      + "<th>Angabe</th><th>Wert</th><th>Herkunft und Klasse</th>"
      + '<th>Quelle für die Überschreibung</th><th style="width:52px">Gesehen</th>'
      + "</tr></thead><tbody>"
      + ws.map(function (w) {
          const leer = w.wert === null || w.wert === undefined || w.wert === "";
          return '<tr class="' + (leer ? "mangel" : (w.klasse === "C" ? "annahme"
            : (w.gesehen ? "gesehen" : ""))) + '" data-kb-zeile="' + esc(w.pfad)
            + '" tabindex="0"><td>' + esc(w.label) + "</td>"
            + '<td><input type="text" size="10" data-kb-pfad="' + esc(w.pfad)
            + '" aria-label="' + esc(w.label) + '" value="' + esc(leer ? "" : w.wert)
            + '">' + (w.einheit ? ' <span style="font-size:12px;color:var(--mute)">'
              + esc(w.einheit) + "</span>" : "")
            + (leer ? '<br><span style="font-size:12px;color:var(--rot)">fehlt</span>' : "")
            + "</td>"
            + "<td>" + herkunftChip(w.herkunft, w.klasse) + "</td>"
            + '<td><input type="text" size="18" data-kb-quelle="' + esc(w.pfad)
            + '" aria-label="Quelle" placeholder="woher der Wert stammt" value="'
            + esc((w.herkunft && w.herkunft.quelle) || "") + '"></td>'
            + '<td><button class="btn klein kbgesehen" data-aktion="kbGesehen" data-kb-pfad="'
            + esc(w.pfad) + '" aria-pressed="' + (w.gesehen ? "true" : "false")
            + '" title="' + (w.gesehen ? "Durchgegangen, klicken hebt es auf"
                : "Als durchgegangen markieren") + ' (Taste b)" aria-label="'
            + esc(w.label) + ' als durchgegangen markieren">' + window.ikon("haken")
            + "</button></td></tr>";
        }).join("")
      + "</tbody></table></div>";
  }

  function html() {
    const p = projekt();
    if (!p) return '<div class="karte">Kein Projekt geladen.</div>';
    const A = window.App;
    const e = A.ergebnis || null;
    const pr = A.pruefung || null;
    const ms = massstab(p, e);
    const opt = { massstab_guete: ms ? ms.guete : null };

    const zn = zaehler(p, opt);
    const gr = grenzen(p, opt);
    const gp = gegenproben(p, opt);
    const gpGut = gp.filter(function (z) {
      return z.stufe === "gut" || z.stufe === "bestaetigt"; }).length;
    const sp = zn.filter((z) => z.stufe === "fehler");
    /* Eine Liste, ein Zaehler. „sammel" ist genau die Menge, die der
       Sammelknopf beschriftet UND bestaetigt; „nurSchriftlich" sind die
       Zeilen, die er bewusst auslaesst. */
    const alleOffen = offeneBefunde(zn, pr);
    const sammel = alleOffen.filter(function (b) { return b.aufhebbar; });
    const nurSchriftlich = alleOffen.filter(function (b) { return !b.aufhebbar; });
    const bz = (pr && pr.bestaetigung)
      || { offen: alleOffen.length, bestaetigt: 0, gesamt: alleOffen.length };
    const znSicht = S.nurOffen ? zn.filter(befundOffen) : zn;
    const befunde = ((pr && pr.pruefungen) || []).filter(function (x) {
      if (x.gruppe === "kontrollblatt" || x.stufe === "gut") return false;
      return !S.nurOffen || befundOffen(x);
    });
    const gs = (p.kontrollblatt && p.kontrollblatt.gesehen) || {};
    const zuSehenPfade = (p.raeume || []).map((r) => "raum." + r.id)
      .concat(werte(p, opt).map((w) => w.pfad));
    const gesehen = zuSehenPfade.filter((x) => gs[x]).length;
    const zuSehen = zuSehenPfade.length;

    /* Vier Stufen, siehe kern_pruefung: "annahme" liegt zwischen Gelb und
       Gruen und ist der haeufigste Zustand -- die Rechnung traegt, solange
       die genannten Annahmen gelten. */
    const ampelText = { rot: "Nicht belastbar", gelb: "Mit Einschränkung belastbar",
                        annahme: "Belastbar unter genannten Annahmen",
                        gruen: "Belastbar" };
    /* Stufe statt Farbwert: die Kachel bekommt die Flaeche ihrer Stufe, damit
       die wichtigste Aussage auch die auffaelligste ist. */
    const ampelStufe = { rot: "fehler", gelb: "warnung", annahme: "warnung",
                         gruen: "gut" };
    const msStufe = { "abgesichert": "gut", "einfach belegt": "warnung",
                      "nur grob geprüft": "warnung", "nicht belastbar": "fehler" };

    const gesperrt = sp.length > 0 || (ms && ms.guete === "nicht belastbar");

    return STIL + '<div class="karte" id="kontrollblatt">'
      + '<h2><span class="nr">3</span>Kontrollblatt</h2>'
      + '<p class="hinweis">Das ist der einzige Prüfschritt vor dem Bericht. Oben steht '
      + "nicht, was gefunden wurde, sondern was fehlen könnte: ein nicht erkannter Raum, "
      + "ein übersehenes Fenster, ein nicht angelegter unbeheizter Bereich. Sie machen die "
      + "Heizlast zu klein und bleiben in Watt je Quadratmeter unsichtbar.</p>"

      + '<div class="kbkopf">'
      + kachel("Selbstprüfung", pr ? ampelText[pr.ampel] : "–",
          pr ? (mz(pr.zaehl.fehler, "Fehler", "Fehler")
            + (pr.zaehl.offen
              ? " · " + mz(pr.zaehl.offen, "offene Frage", "offene Fragen") : "")
            + " · " + mz(pr.zaehl.hinweis, "Hinweis", "Hinweise")) : "",
          pr ? ampelStufe[pr.ampel] : null)
      + kachel("Maßstab", ms ? ms.guete : "nicht geprüft",
          ms ? ms.hinweis_guete : "keine Probe gelaufen",
          ms ? msStufe[ms.guete] : null)
      /* WAS EIN KOLLEGE HIER LESEN SOLL.
         Hier stand „Zur Kenntnis genommen · 0 von 34 · 32 Zeilen noch offen"
         auf einem Projekt, an dem sachlich nichts falsch war. Das ist die
         falsche Frage: es zaehlte, wie viel der Bearbeiter weggeklickt hat,
         nicht, wie gut geprueft ist. Jetzt steht hier, was tatsaechlich
         geschehen ist — wie viele Gegenproben gelaufen sind und was sie
         ergaben — und daneben, wie weit diese Pruefung ueberhaupt tragen
         kann. Ist alles in Ordnung, liest der Kollege „alle Proben
         bestanden"; ist es das nicht, steht die Zahl der angeschlagenen
         Proben da, und zwar in Rot. */
      + kachel("Gegenproben",
          gp.length ? (gpGut + " von " + gp.length + " bestanden") : "keine gelaufen",
          gp.length
            ? (gpGut === gp.length
              ? "jede erfasste Zahl gegen eine zweite gerechnet"
              : mz(gp.length - gpGut, "Probe hat", "Proben haben")
                + " angeschlagen")
            : "keine Zahl dieses Projekts ist gegengerechnet",
          gp.length ? (gpGut === gp.length ? "gut" : "warnung") : "warnung")
      + kachel("Grenzen", gr.length ? mz(gr.length, "benannt", "benannt") : "keine",
          gr.length
            ? "was diese Berechnung nicht belegt — steht im Bericht, nicht in "
              + "der Liste"
            : "alles, was gefragt wurde, ist auch beantwortet",
          gr.length ? null : "gut")
      /* Diese Kachel zaehlt keine Befunde, sondern die freiwillige Durchsicht
         des Bearbeiters. Sie stand mit „0 von 21" neben lauter bestandenen
         Proben und las sich wie ein Rueckstand; jetzt sagt sie, dass sie
         nichts aufhaelt. */
      + kachel("Raumbuch durchgesehen", gesehen + " von " + zuSehen,
          gesehen >= zuSehen
            ? "jede Zeile einmal angesehen"
            : "freiwillige Durchsicht, hält den Bericht nicht auf",
          gesehen >= zuSehen ? "gut" : null)
      + "</div>"

      + '<h3 style="font-size:15px">Was fehlen könnte</h3>'
      + '<p style="font-size:13px;color:var(--mute);margin:-2px 0 8px">Jede Zeile ist ein '
      + "Zähler: erfasst gegen unabhängig gezählt. Hier steht nur, was eine Gegenprobe "
      + "hat — bestanden oder angeschlagen. Wogegen sich gar nicht prüfen ließ, steht "
      + "weiter unten unter „Grenzen dieser Berechnung“ und ist nicht abzuhaken; es "
      + "wäre auf jedem Projekt dasselbe. Keine Zeile hier behauptet einen Rechenfehler; "
      + "sie nennt einen Widerspruch, den nur der Plan auflöst. Ein Haken ist dein "
      + "Fachurteil: die Zeile bleibt mit Namen und Zeitpunkt im Bericht stehen und "
      + "sperrt nicht mehr.</p>"
      + '<div class="kbwerk" style="margin:0 0 10px">'
      + '<button class="btn klein' + (sammel.length ? " primaer" : "")
      + '" data-aktion="kbAlleZurKenntnis"'
      + (sammel.length ? "" : " disabled")
      + ">" + (sammel.length === 0 ? "Keine Zeile mehr offen"
          : (sammel.length === 1 ? "Die eine offene Zeile zur Kenntnis nehmen"
            : "Alle " + sammel.length + " offenen Zeilen zur Kenntnis nehmen"))
      + "</button>"
      /* Ein Schalter muss zeigen, ob er an ist. Vorher wechselte nur die
         Beschriftung; wer die Liste nicht kannte, sah dem Knopf nicht an,
         dass gerade gefiltert wird. */
      + '<button class="btn klein' + (S.nurOffen ? " an" : "")
      + '" data-aktion="kbNurOffen" aria-pressed="' + (S.nurOffen ? "true" : "false")
      + '">' + (S.nurOffen ? window.ikon("haken") + "nur Offene" : "nur Offene zeigen")
      + "</button>"
      + '<span style="font-size:12px;color:var(--mute)">' + bz.bestaetigt + " von "
      + mz(bz.gesamt, "Zeile", "Zeilen") + " bestätigt"
      + (nurSchriftlich.length ? " · " + nurSchriftlich.length
          + " davon nur mit schriftlicher Begründung" : "") + "</span></div>"
      + (znSicht.length
        ? znSicht.map((z) => zaehlerZeileHtml(z, p)).join("")
        : '<div class="meldung gut"><span class="sym">OK</span><div>Keine offene Zeile '
          + "mehr. Über „alle Zeilen zeigen“ stehen die bestätigten wieder da.</div></div>")

      /* GRENZEN. Sie stehen unter der Liste und nicht darin, weil sie eine
         andere Art von Aussage sind: nicht „hier stimmt etwas nicht", sondern
         „so weit trägt diese Berechnung". Wortgleich gedruckt werden sie in
         Kapitel 9 des Berichts; das Blatt zeigt sie hier, damit niemand erst
         den Bericht bauen muss, um sie zu sehen. */
      + (gr.length
        ? '<h3 style="font-size:15px;margin-top:22px">Grenzen dieser Berechnung</h3>'
          + '<p style="font-size:13px;color:var(--mute);margin:-2px 0 8px">'
          + mz(gr.length, "Punkt", "Punkte") + ", an "
          + (gr.length === 1 ? "dem" : "denen") + " den Unterlagen nichts "
          + "entgegenzuhalten war. Das sind keine Aufgaben und nichts zum Abhaken: "
          + "das Werkzeug kann sie nicht beantworten, und am Bildschirm kann es "
          + "auch niemand sonst — dafür braucht es eine weitere Unterlage. Jeder "
          + "Punkt sagt, welche. Sie stehen wortgleich im Bericht, damit der "
          + "Leser weiß, wie weit diese Berechnung trägt.</p>"
          + gr.map(function (z) { return grenzeZeileHtml(z, p); }).join("")
        : "")

      + '<h3 style="font-size:15px;margin-top:22px">Räume</h3>'
      + '<p style="font-size:13px;color:var(--mute);margin:-2px 0 8px">Rote Zeilen zuerst, '
      + "dann Annahmen, dann Bestätigtes. Eine Überschreibung gilt nur mit Quelle als "
      + "belegt; ohne Quelle bleibt sie Annahme und erscheint im Bericht als Klasse C."
      + (S.nurOffen ? " Der Schalter „nur Offene zeigen“ ist gesetzt und wirkt auch hier."
          : "") + "</p>"
      + raumTabelle(p, opt)

      + '<h3 style="font-size:15px;margin-top:22px">Werte und ihre Herkunft</h3>'
      + werteTabelle(p, opt)

      /* Die Befunde der Selbstpruefung gehoeren in denselben Zaehler und
         brauchen darum dasselbe Kaestchen. Ohne das koennte der Bearbeiter
         die angezeigten „x von y" nie erreichen. */
      + (befunde.length
        ? '<h3 style="font-size:15px;margin-top:22px">Befunde der Selbstprüfung</h3>'
          + '<p style="font-size:13px;color:var(--mute);margin:-2px 0 8px">Dieselbe '
          + "Zählung wie oben: auch diese Zeilen lassen sich zur Kenntnis nehmen.</p>"
          + befunde.map(function (x) { return zaehlerZeileHtml(zeile({
              id: x.id, titel: x.titel, stufe: x.stufe, text: x.text,
              aufhebbar: x.aufhebbar !== false }), p, x.bestaetigt); }).join("")
        : "")

      + '<p class="kbtasten">Tastatur: <b>Pfeil hoch/runter</b> oder <b>j</b>/<b>k</b> '
      + "zwischen den Zeilen · <b>Eingabe</b> in das erste Feld der Zeile · <b>q</b> in "
      + "das Quellenfeld · <b>b</b> Zeile als durchgegangen markieren und weiter · "
      + "<b>Esc</b> zurück zur Zeile.</p>"

      + '<div style="display:flex;gap:10px;align-items:center;margin-top:16px;'
      + 'border-top:1px solid var(--linie);padding-top:16px">'
      + '<button class="btn cta" data-aktion="kbBericht"' + (gesperrt ? " disabled" : "")
      + ">Bericht erzeugen</button>"
      + '<button class="btn klein" data-aktion="kbAlleGesehen">Alle Zeilen ohne Mangel '
      + "als durchgegangen markieren</button>"
      + '<span style="font-size:13px;color:var(--mute)">'
      + (gesperrt
        ? "Gesperrt: " + mz(sp.length, "Zähler ist", "Zähler sind")
          + " nicht in Ordnung. Erst klären oder "
          + "mit Begründung aufheben."
        : "Keine Sperre offen.") + "</span></div>"
      + "</div>";
  }

  /* =====================================================================
   * Bedienung: Tastatur, Eingaben, Aktionen
   * =====================================================================
   * Das Blatt muss sich zügig durchgehen lassen. Deshalb bekommt jede Zeile
   * den Fokus, jede Eingabe wird beim Verlassen geschrieben und beim
   * Hineinspringen vorgewählt, und „durchgegangen" springt weiter zur
   * nächsten offenen Zeile.
   * ================================================================== */
  /* Der Bereich, in dem die Verdrahtung dieses Moduls gilt.
     Seit dem Prüfblatt gibt es zwei: dort stehen dieselben Raumzeilen mit
     denselben data-kb-Merkmalen neben dem Plan. Sie sollen sich auch genauso
     verhalten — dasselbe Schreiben, dasselbe Springen, derselbe Haken. Ein
     zweiter Satz Ereignisbehandlung dafür wäre der sichere Weg zu zwei
     Bildschirmen, die sich mit der Zeit auseinanderentwickeln. */
  function blatt() {
    return document.getElementById("kontrollblatt")
      || document.getElementById("planblatt");
  }

  function zeilen() {
    const b = blatt();
    return b ? Array.prototype.slice.call(b.querySelectorAll("[data-kb-zeile]")) : [];
  }

  function springe(von, richtungsschritt) {
    const alle = zeilen();
    if (!alle.length) return;
    const i = alle.indexOf(von);
    const n = alle[Math.min(alle.length - 1, Math.max(0, (i < 0 ? -1 : i) + richtungsschritt))];
    if (n) { n.focus(); S.fokus = n.dataset.kbZeile; }
  }

  function zeileVon(el) {
    return el && el.closest ? el.closest("[data-kb-zeile]") : null;
  }

  /** Das Quellenfeld einer Zeile gilt für alle Werte dieser Zeile. Genau das
   *  erwartet der Bearbeiter, wenn er eine Fundstelle einträgt, und genau das
   *  entscheidet nach SPEZIFIKATION_BERICHT 10.3 über die Konfidenzklasse. */
  function quelleDerZeile(z, pfad) {
    if (!z) return null;
    const genau = z.querySelector('[data-kb-quelle="' + pfad + '"]');
    const irgend = genau || z.querySelector("[data-kb-quelle]");
    return irgend ? irgend.value : null;
  }

  function herkunftEintragen(p, pfad, quelle) {
    const q = String(quelle == null ? "" : quelle).trim();
    if (!p.herkunft) p.herkunft = {};
    const vorher = p.herkunft[pfad] || {};
    p.herkunft[pfad] = { herkunft: "eingabe", quelle: q || null,
      konfidenz: q.length >= 3 ? "sicher" : "unsicher", fundstelle: q || null,
      zeit: ortszeitStempel(),
      vorher: vorher.herkunft || null };
  }

  function schreibeFeld(el) {
    const p = projekt();
    if (!p) return;
    const pfad = el.dataset.kbPfad;
    if (pfad) {
      const z = zeileVon(el);
      const r = schreiben(p, pfad, el.value, quelleDerZeile(z, pfad));
      if (!r.ok) { melde(r.grund, { stufe: "warnung" }); return; }
    } else if (el.dataset.kbQuelle) {
      /* Nur die Quelle geändert: die Werte bleiben, ihre Herkunft wird neu
         bewertet — für jeden Wert dieser Zeile. */
      const z = zeileVon(el);
      const pfade = z ? Array.prototype.slice.call(z.querySelectorAll("[data-kb-pfad]"))
        .map((x) => x.dataset.kbPfad) : [];
      if (pfade.indexOf(el.dataset.kbQuelle) < 0) pfade.push(el.dataset.kbQuelle);
      pfade.forEach(function (pf) { herkunftEintragen(p, pf, el.value); });
    } else return;
    const z = zeileVon(el);
    S.fokus = z ? z.dataset.kbZeile : null;
    if (window.render) window.render();
  }

  function tastatur(ev) {
    const b = blatt();
    if (!b || !b.contains(ev.target)) return;
    const inFeld = /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName);
    const z = zeileVon(ev.target);

    if (inFeld) {
      if (ev.key === "Escape" && z) { ev.preventDefault(); z.focus(); }
      if (ev.key === "Enter") { ev.preventDefault(); ev.target.blur(); if (z) z.focus(); }
      return;
    }
    if (!z) return;
    switch (ev.key) {
      case "ArrowDown": case "j": ev.preventDefault(); springe(z, 1); break;
      case "ArrowUp": case "k": ev.preventDefault(); springe(z, -1); break;
      case "Enter": {
        ev.preventDefault();
        const f = z.querySelector("[data-kb-pfad]");
        if (f) f.focus();
        break;
      }
      case "q": {
        ev.preventDefault();
        const f = z.querySelector("[data-kb-quelle]");
        if (f) f.focus();
        break;
      }
      case "b": {
        ev.preventDefault();
        const p = projekt();
        if (p) {
          bestaetigen(p, z.dataset.kbZeile, null);
          const alle = zeilen();
          const i = alle.indexOf(z);
          S.fokus = (alle[i + 1] || z).dataset.kbZeile;
          if (window.render) window.render();
        }
        break;
      }
      default: break;
    }
  }

  function aktivieren() {
    if (!S.verdrahtet) {
      document.addEventListener("change", function (ev) {
        const b = blatt();
        if (!b || !b.contains(ev.target)) return;
        if (ev.target.dataset.kbBemerkung) {
          const p = projekt();
          if (p) {
            bemerkungSchreiben(p, ev.target.dataset.kbBemerkung, ev.target.value);
            S.fokus = ev.target.dataset.kbBemerkung;
            /* Neu zeichnen, sonst steht im Befundtext noch der alte Vermerk. */
            if (window.render) window.render();
          }
          return;
        }
        if (ev.target.dataset.kbPfad || ev.target.dataset.kbQuelle) schreibeFeld(ev.target);
      });
      document.addEventListener("focusin", function (ev) {
        const b = blatt();
        if (!b || !b.contains(ev.target)) return;
        if (ev.target.tagName === "INPUT" && ev.target.select) ev.target.select();
      });
      document.addEventListener("keydown", tastatur);
      S.verdrahtet = true;
    }
    /* Nach dem Neuzeichnen dorthin zurück, wo gearbeitet wurde. */
    if (S.fokus) {
      const el = document.querySelector('#kontrollblatt [data-kb-zeile="'
        + String(S.fokus).replace(/"/g, "") + '"]');
      if (el) el.focus();
    }
  }

  function aktion(name, el) {
    const p = projekt();
    if (!p) return false;
    switch (name) {
      case "kbNurOffen": S.nurOffen = !S.nurOffen; return true;
      case "kbGesehen": {
        bestaetigen(p, el.dataset.kbPfad, null);
        S.fokus = el.dataset.kbPfad;
        return true;
      }
      case "kbAlleGesehen": {
        const opt = {};
        let n = 0;
        raumzeilen(p, opt).forEach(function (x) {
          if (!x.maengel.length) { bestaetigen(p, "raum." + x.raum.id, null); n++; }
        });
        werte(p, opt).forEach(function (w) {
          if (w.wert !== null && w.wert !== undefined && w.wert !== "") {
            bestaetigen(p, w.pfad, null); n++;
          }
        });
        melde("Das ist keine Quellenangabe: die Konfidenzklassen bleiben "
          + "unverändert.", { stufe: "hinweis",
            titel: mz(n, "Zeile", "Zeilen") + " als durchgegangen markiert" });
        return true;
      }
      /* Der eine Klick. Sitzt der Haken schon, nimmt derselbe Klick ihn
         zurueck — eine Bestaetigung muss widerrufbar bleiben. Eine im Feld
         daneben getippte Bemerkung wird mitgenommen, ist aber nicht noetig. */
      case "kbZurKenntnis": {
        const id = el.dataset.kbId;
        const K = kern();
        const schon = K && K.bestaetigungen(p)[id];
        if (schon) { zurKenntnisZurueck(p, id); return true; }
        const bem = document.querySelector('[data-kb-bemerkung="'
          + String(id).replace(/"/g, "") + '"]');
        zurKenntnis(p, id, bem ? bem.value : "");
        S.fokus = id;
        return true;
      }
      /* Der Sammelknopf. Er zeigt vorher, was er bestaetigt, und verlangt eine
         zweite Handlung. Zeilen mit aufhebbar === false bleiben ausgenommen:
         das sind keine Fragen an den Plan, sondern Widersprueche in der
         Erfassung (fehlendes Geschoss, ungesicherter Massstab). Sie machen die
         Heizlast zu klein, ohne dass man es in W/m2 sieht, und brauchen darum
         den geschriebenen Vermerk, der im Bericht steht. */
      case "kbAlleZurKenntnis": {
        const pr = window.App ? window.App.pruefung : null;
        const offen = offeneBefunde(zaehler(p, {}), pr)
          .filter(function (b) { return b.aufhebbar; });
        if (!offen.length) {
          melde("Es ist keine Zeile mehr offen.", { stufe: "gut" });
          return true;
        }
        const liste = offen.slice(0, 12).map(function (b) { return "\u2022 " + b.titel; })
          .join("\n") + (offen.length > 12 ? "\n\u2022 und " + (offen.length - 12)
            + " weitere" : "");
        frage({ titel: (offen.length === 1 ? "Eine Zeile" : offen.length + " Zeilen")
            + " zur Kenntnis nehmen?",
          text: (offen.length === 1 ? "Diese Zeile wird" : "Diese Zeilen werden")
            + " auf deinen Namen zur Kenntnis genommen und mit Zeitpunkt im "
            + "Bericht ausgewiesen:\n\n" + liste
            + "\n\nDas ist ein Fachurteil, kein Wegklicken.",
          jaText: "Zur Kenntnis nehmen", neinText: "Abbrechen" }).then(function (ja) {
          if (!ja) return;
          offen.forEach(function (b) { zurKenntnis(p, b.id, ""); });
          neuzeichnen();
        });
        return true;
      }
      case "kbSperreAufheben": {
        /* Die Frage steht an der ZEILE, nicht hier. Eine Zeile, die zwei
           Zahlen gegeneinanderstellt, fragt nach der einen Sache, um die es
           geht — welche der beiden stimmt. Ohne eigene Frage bleibt es bei
           der allgemeinen. */
        const id = el.dataset.kbId;
        const z = alleZeilen(p).find(function (x) { return x.id === id; }) || {};
        eingebe({ titel: z.titel || "Mit Begründung bestätigen",
          text: z.begruendung_frage
            || ("Diese Zeile verhindert einen Bericht, der zu wenig Heizlast "
              + "ausweist.\n\nWenn du sie bestätigen willst, begründe das bitte. "
              + "Die Begründung erscheint im Bericht und in der "
              + "Selbstprüfung.\n\nBeispiel: Der Raum ist ein Abstellraum außerhalb "
              + "der beheizten Hülle, am Objekt geprüft am 20.08.2026."),
          wert: "", feldname: "Begründung",
          jaText: "Bestätigen" }).then(function (t) {
          if (t === null) return;
          const r = sperreAufheben(p, id, t);
          if (!r.ok) {
            melde("Bitte eine Begründung mit mindestens zehn Zeichen angeben.",
              { stufe: "warnung" });
            return;
          }
          neuzeichnen();
        });
        return true;
      }
      case "kbBaulich": {
        const g = el.dataset.kbG;
        eingebe({ titel: "Rücksprung baulich begründen",
          text: "Woraus ergibt sich der Rücksprung baulich? Die Begründung "
            + "erscheint im Bericht.\n\nBeispiel: Drempel 0,85 m, Dachschräge "
            + "45 Grad laut Schnitt.",
          wert: "", feldname: "Begründung", jaText: "Bestätigen" }).then(function (t) {
          if (t === null) return;
          const r = sperreAufheben(p, "flaeche_" + g, t);
          if (!r.ok) {
            melde("Bitte eine Begründung mit mindestens zehn Zeichen angeben.",
              { stufe: "warnung" });
            return;
          }
          neuzeichnen();
        });
        return true;
      }
      case "kbZoneAnlegen": {
        /* DIE ZONE MUSS IN DER RECHNUNG ANKOMMEN.
         *
         * Hier entstand bisher eine Zone mit modus "bilanz" und leerer
         * Hülle. Der Bilanzweg besteht dann allein aus den angrenzenden
         * beheizten Räumen, ergibt genau deren Innentemperatur und damit
         * 0 W durch die trennende Decke. Der rote Befund verschwand, die
         * Heizlast blieb dieselbe — angelegt und wirkungslos.
         *
         * Jetzt wird die Lage aus dem Namen bestimmt (DIN/TS 12831-1
         * Tabelle 5, daten_zonenlagen.js). Damit steht sofort eine belegte
         * Temperatur da. Sie ist eine ANNAHME und wird als solche
         * gekennzeichnet: lage_angenommen und eine Grenze im Bericht mit
         * Fundstelle. Nur wo sich der Name nicht einordnen lässt, bleibt es
         * beim Bilanzweg — dann wird nicht geraten. */
        const name = el.dataset.kbName || "Unbeheizter Bereich";
        const neu = zoneAnlegen(p, name, false);
        const DZ = (typeof window !== "undefined") && window.DATEN_ZONENLAGEN;
        const t = (neu && neu.modus === "lage" && DZ && DZ.finde)
          ? DZ.finde(neu.lage) : null;
        melde((t ? 'Lage „' + t.name + '" nach DIN/TS 12831-1 Tabelle 5 '
                 + "(Annahme, im Expertenmodus zu prüfen). " : "")
          + "Die trennenden Bauteile der angrenzenden Räume müssen noch auf "
          + "diesen Bereich zeigen, sonst geht er in keine Fläche ein.",
          { stufe: "warnung",
            titel: 'Die Zone „' + name + '" ist '
              + (neu ? "angelegt" : "bereits vorhanden") });
        /* EINE RÜCKFRAGE-ANTWORT BLEIBT IM RÜCKFRAGEN-SCHRITT.
           Bis zum 24.08.2026 sprang dieser Fall IMMER in den Expertenmodus
           (schritt = "zonen") — auch mitten aus den Rückfragen heraus:
           „‚unbeheizt — Bereich anlegen' wirft in den Expertenmodus (Zonen)
           statt in den Rückfragen zu bleiben" (Abnahmebefund). Der Vollzug
           passiert im Hintergrund; steht danach noch etwas offen (trennende
           Bauteile), stellt die Prüfung dazu ihre eigene Frage. Nur wer
           schon im Kontrollblatt arbeitet, wird weiter zu den Zonen
           geführt — dort ist der Expertenmodus der Arbeitsplatz. */
        if (window.App.schritt === "kontrolle") window.App.schritt = "zonen";
        return true;
      }
      case "kbGeschossAnnehmen": {
        const k = el.dataset.kbName || "";
        const kand = fehlendeGeschosse(p, { auch_entfernte: true })
          .find(function (x) { return schluessel(x.kuerzel) === schluessel(k); });
        const neu = kand ? geschossAnlegen(p, kand, false) : null;
        melde(neu
          ? "Die Fläche ist abgeleitet und keine Messung: " + kand.grund
            + ". Sie steht als Annahme im Bericht und ist mit „Annahme entfernen“ "
            + "wieder heraus."
          : "Für dieses Geschoss lässt sich keine Fläche ableiten.",
          { stufe: "warnung",
            titel: neu ? "Geschoss „" + k + "“ angesetzt"
              : "Nichts angesetzt" });
        return true;
      }
      case "kbGeschossEntfernen": {
        const k = el.dataset.kbName || "";
        geschossEntfernen(p, k);
        melde("Das angenommene Geschoss „" + k + "“ ist aus der Rechnung heraus. "
          + "Das Ergebnis ist damit um seinen Anteil kleiner — die Zeile „Zahl der "
          + "Geschosse“ sagt wieder, dass eine Ebene fehlt.",
          { stufe: "warnung", titel: "Annahme entfernt" });
        return true;
      }
      /* Die zwei Antworten der Zeile „Bereich ohne trennendes Bauteil".
         EIN Klick, keine Begründungspflicht — die Antwort selbst IST die
         Begründung und steht mit Name und Zeitpunkt im Projekt. */
      case "kbZoneFrei": {
        const zid = el.dataset.kbName || "";
        const z = (p.zonen || []).find(function (x) {
          return String(x.id) === String(zid); });
        if (!z) {
          /* Stiller Abbruch war hier ein toter Knopf (25.08.2026, Gunnebach-
             Echtlauf): die Zeile trug eine Kennung, zu der keine Zone
             stand. Wer klickt, muss hoeren, warum nichts passiert. */
          melde("Dieser Bereich steht nicht mehr im Projekt — die Zeile ist "
            + "veraltet. Unter Expertenmodus → Unbeheizte Bereiche steht "
            + "der aktuelle Stand.", { stufe: "warnung" });
          return true;
        }
        z.freistehend = { wer: bearbeiter(p) || "",
          zeit: new Date().toISOString() };
        delete z.angebaut_an;
        melde("„" + (z.name || z.id) + "“ steht frei: der Bereich berührt die "
          + "beheizte Hülle nicht, 0 W sind richtig. Die Antwort steht im "
          + "Bericht und ist mit einem Klick widerrufbar.",
          { stufe: "gut", titel: "Freistehend bestätigt" });
        return true;
      }
      case "kbZoneFreiZurueck": {
        const zid = el.dataset.kbName || "";
        const z = (p.zonen || []).find(function (x) {
          return String(x.id) === String(zid); });
        if (z) delete z.freistehend;
        melde("Die Antwort ist zurückgenommen; die Frage zum Bereich steht "
          + "wieder offen.", { stufe: "hinweis", titel: "Zurückgenommen" });
        return true;
      }
      case "kbZoneAngebaut": {
        const zid = el.dataset.kbName || "";
        const z = (p.zonen || []).find(function (x) {
          return String(x.id) === String(zid); });
        if (!z) {
          /* Stiller Abbruch war hier ein toter Knopf (25.08.2026, Gunnebach-
             Echtlauf): die Zeile trug eine Kennung, zu der keine Zone
             stand. Wer klickt, muss hoeren, warum nichts passiert. */
          melde("Dieser Bereich steht nicht mehr im Projekt — die Zeile ist "
            + "veraltet. Unter Expertenmodus → Unbeheizte Bereiche steht "
            + "der aktuelle Stand.", { stufe: "warnung" });
          return true;
        }
        const namen = (p.raeume || []).map(function (r) { return r.name || r.id; });
        eingebe({ titel: "Angebaut an welchen Raum?",
          text: "An welchen Raum grenzt „" + (z.name || z.id) + "“? Die "
            + "trennende Wand wird bei diesem Raum angelegt, mit dem Bereich "
            + "als Gegenseite; die Fläche ist eine gekennzeichnete Annahme "
            + "und im Expertenmodus zu ersetzen.\n\nRäume: "
            + namen.join(", "),
          wert: "", feldname: "Raumname", jaText: "Wand anlegen" })
          .then(function (t) {
            if (t === null || !String(t || "").trim()) return;
            const wunsch = String(t).trim().toLowerCase();
            const raum = (p.raeume || []).find(function (r) {
              return String(r.name || r.id).toLowerCase() === wunsch;
            }) || (p.raeume || []).find(function (r) {
              return String(r.name || r.id).toLowerCase().indexOf(wunsch) >= 0;
            });
            if (!raum) {
              melde("Ein Raum mit diesem Namen steht nicht im Raumbuch.",
                { stufe: "warnung" });
              return;
            }
            z.angebaut_an = raum.id || raum.name;
            delete z.freistehend;
            zonenWaendeErgaenzen(p);
            melde("Die Trennwand zu „" + (z.name || z.id) + "“ ist bei „"
              + (raum.name || raum.id) + "“ angelegt — als gekennzeichnete "
              + "Annahme, im Expertenmodus zu ersetzen.",
              { stufe: "gut", titel: "Wand angelegt" });
            neuzeichnen();
          });
        return true;
      }
      case "kbBericht": {
        window.App.schritt = "ergebnis";
        return true;
      }
      default: return false;
    }
  }

  /* =====================================================================
   * Selbsttest — geprüft wird die Zählerlogik, nicht die Anzeige
   * ================================================================== */
  function selbsttest() {
    const f = [];
    /* Die Zahl der Pruefungen wird gezaehlt, nicht gepflegt. Eine von Hand
       nachgetragene Zahl driftet und behauptet dann eine Deckung, die es
       nicht gibt. */
    let n = 0;
    const pruef = (bed, txt) => { n++; if (!bed) f.push(txt); };
    const finde = (liste, id) => liste.find((z) => z.id === id) || null;
    /* Nach der Einordnung stehen manche Zeilen nicht mehr in der Liste zum
       Abarbeiten, sondern im Bericht. Diese Proben suchen deshalb in BEIDEN
       Sichten und prüfen die Einordnung ausdrücklich mit — sonst könnte eine
       Zeile still verschwinden und der Selbsttest bliebe grün. */
    const alleZ = (pp) => alleZeilen(pp);
    /* Steht die Zeile im Bericht und NICHT in der Liste? */
    const istGrenze = (pp, id) => {
      const g = finde(grenzen(pp), id);
      return !!g && !finde(zaehler(pp), id) && !!g.abhilfe;
    };

    /* --- Konfidenzklassen ------------------------------------------- */
    pruef(klasse({ herkunft: "eingabe", quelle: "Aufmaß vor Ort 12.08.2026" }) === "A",
      "Überschreibung mit Quelle muss Klasse A ergeben");
    pruef(klasse({ herkunft: "eingabe", quelle: "" }) === "C",
      "Überschreibung ohne Quelle muss Annahme bleiben");
    pruef(klasse({ herkunft: "typologie", quelle: "IWU" }) === "C",
      "Typologiewert ist ausnahmslos Klasse C");
    pruef(klasse({ herkunft: "norm", quelle: "DIN/TS 12831-1 Tab. 12" }) === "B",
      "Normwert ist Klasse B");
    pruef(klasse({ herkunft: "plan_gelesen", konfidenz: "sicher",
                   fundstelle: "Raumstempel Mitte" }) === "A",
      "sicher gelesen mit Fundstelle ist Klasse A");
    pruef(klasse({ herkunft: "plan_gelesen", konfidenz: "sicher" }) === "C",
      "ohne Fundstelle darf nicht Klasse A werden");
    pruef(klasse({ herkunft: "plan_gerechnet" }, { massstab_guete: "abgesichert" }) === "A",
      "gemessene Fläche bei abgesichertem Maßstab ist Klasse A");
    pruef(klasse({ herkunft: "plan_gerechnet" }, { massstab_guete: "nur grob geprüft" }) === "C",
      "gemessene Fläche ohne abgesicherten Maßstab bleibt Klasse C");

    /* --- Z1 Räume ---------------------------------------------------- */
    const raum = (id, g, A, bt) => ({ id: id, geschoss: g, name: id, A: A, h: 2.5,
      we: "WE 1", bauteile: bt === undefined
        ? [{ name: "Außenwand", A: 10, kat: "huelle", grenzt_an: { typ: "aussen" } }] : bt });
    const p1 = { raeume: [raum("r1", "EG", 20), raum("r2", "EG", 15), raum("r3", "EG", 10),
                          raum("r4", "EG", 8), raum("r5", "EG", 6)],
                 plan: { bilder: [{ bezeichnung: "Blatt 1", art: "grundriss",
                                    geschoss: "EG", raeume_erkennbar: 7 }] } };
    const z1 = finde(zaehler(p1), "raeume_EG");
    pruef(z1 && z1.stufe === "fehler" && z1.soll === 7 && z1.ist === 5,
      "fünf erfasste gegen sieben beschriftete Räume muss ein Fehler sein");

    const p2 = JSON.parse(JSON.stringify(p1));
    p2.plan.bilder[0].raeume_erkennbar = 5;
    pruef((finde(zaehler(p2), "raeume_EG") || {}).stufe === "gut",
      "gleiche Zahl muss bestehen");

    /* Ohne jede Gegenzahl ist das keine Aufgabe, sondern eine GRENZE: das
       Werkzeug kann sie auf keinem Projekt selbst beantworten. Sie steht im
       Bericht, mit dem Weg, der sie aufhebt — und nicht mehr in der Liste. */
    const p3 = { raeume: p1.raeume, plan: { bilder: [] } };
    const z3 = finde(alleZ(p3), "raeume_EG");
    pruef(z3 && z3.art === "grenze" && z3.soll === null && z3.frage,
      "ohne Gegenzahl gehört die Raumzahl als Grenze in den Bericht");
    pruef(istGrenze(p3, "raeume_EG"),
      "sie darf dann nicht mehr in der Liste zum Abarbeiten stehen");

    /* --- Die zweite Lesung als unabhängige Quelle --------------------
       Die Probe gegen die Krankheit dieses Hauses: eine gebaute Fähigkeit
       ohne Weg dorthin. KERN_GEGENPROBE liest die Blätter ein zweites Mal;
       hier wird geprüft, dass das Ergebnis auch WIRKT — dass aus „gegen
       nichts geprüft" tatsächlich eine belegte Zeile wird und dass eine
       Abweichung tatsächlich einen Befund erzeugt.

       Gerechnet wird mit dem echten Blatt „BV 2-0887 Ziolkowski": EIN A3-Bogen
       mit DREI Grundrissen, einem Schnitt und einer Ansicht. Genau daran
       entscheidet sich, ob die Zahlen der Ebene und nicht dem Blatt gehören. */
    const gpEbene = (name, o) => Object.assign({ ebene: name, n: 0, namen: [],
      fenster: 0 }, o);
    const gpSeite = (o) => Object.assign({
      bezeichnung: "BV 2-0887", geschoss: "EG", art: "grundriss",
      uebernommen: true,
    }, o);
    const gpLesung = (o) => Object.assign({
      blattart: "grundriss", raeume_beschriftet: 0, raumnamen: [],
      fenster_gesamt: 0, ebenen: [], unbeheizt_benannt: [], unbeheizt_unbenannt: 0,
      nordpfeil: { vorhanden: false, richtung: "unbekannt" },
    }, o);

    /* 1. Zwei Lesungen, die übereinstimmen, beantworten die Frage — und zwar
          je Geschoss, obwohl beide Grundrisse auf EINEM Blatt stehen. */
    const bogen = {
      raeume: [raum("r1", "EG", 20), raum("r2", "EG", 15), raum("r3", "EG", 10),
               raum("r4", "EG", 8), raum("r5", "EG", 6),
               raum("o1", "OG", 18), raum("o2", "OG", 12)],
      plan: { bilder: [], seiten: [gpSeite({
        gegenprobeEbenen: [gpEbene("GRUNDRISS ERDGESCHOSS", { n: 5, fenster: 7 }),
                           gpEbene("GRUNDRISS OBERGESCHOSS", { n: 2, fenster: 7 })],
        gegenprobe: gpLesung({ raeume_beschriftet: 7,
          ebenen: [{ bezeichnung: "GRUNDRISS ERDGESCHOSS", gezeichnet: true },
                   { bezeichnung: "GRUNDRISS OBERGESCHOSS", gezeichnet: true }] }) })] },
    };
    const zb1 = finde(alleZeilen(bogen), "raeume_EG");
    const zb2 = finde(alleZeilen(bogen), "raeume_OG");
    pruef(zb1 && zb1.stufe === "gut" && zb1.soll === 5,
      "die zweite Lesung muss die Raumzahl je Geschoss belegen koennen");
    pruef(zb2 && zb2.stufe === "gut" && zb2.soll === 2,
      "auch das zweite Geschoss desselben Bogens bekommt seine eigene Zahl");
    pruef(zb1 && /zweite/.test(zb1.quelle_soll || ""),
      "die Zeile muss sagen, woher die unabhaengige Zahl stammt");

    /* 2. Der Fall, um den es geht: die zweite Lesung sieht einen Raum mehr. */
    const bogen2 = JSON.parse(JSON.stringify(bogen));
    bogen2.plan.seiten[0].gegenprobeEbenen[0].n = 6;
    pruef((finde(alleZeilen(bogen2), "raeume_EG") || {}).stufe === "fehler",
      "ein Raum mehr in der zweiten Lesung muss ein Fehler sein");
    pruef((finde(alleZeilen(bogen2), "raeume_OG") || {}).stufe === "gut",
      "und er darf das andere Geschoss desselben Bogens nicht mitreissen");

    /* 3. Eine Ebene, die sich nicht deuten laesst, wird KEINEM Geschoss
          zugeordnet — lieber keine Zahl als die dem falschen Geschoss. */
    const bogen3 = JSON.parse(JSON.stringify(bogen));
    bogen3.plan.seiten[0].gegenprobeEbenen[0].ebene = "Bauteil A";
    const zb3 = finde(alleZeilen(bogen3), "raeume_EG");
    pruef(zb3 && zb3.art === "grenze",
      "eine nicht deutbare Ebene darf keine Raumzahl behaupten");

    /* 4. Die Aussenbemassung liefert die Kontur — je Ebene ihre eigene.
          Am echten Blatt: Erdgeschoss 8,00 x 12,50, davon unterkellert nur
          8,00 x 7,00. Eine Kontur je BLATT wuerde 100 m² gegen 56 m² rechnen. */
    const konturBogen = {
      raeume: [raum("k1", "KG", 17.99), raum("k2", "KG", 21.20),
               raum("e1", "EG", 30), raum("e2", "EG", 25)],
      plan: { bilder: [], gemessen: { wanddicke_m: 0.30 }, seiten: [gpSeite({
        gegenprobeEbenen: [gpEbene("GRUNDRISS KELLERGESCHOSS", { n: 2 }),
                           gpEbene("GRUNDRISS ERDGESCHOSS", { n: 2 })],
        gegenprobeKonturen: [
          { A: 56, U: 30, breite_m: 8, tiefe_m: 7, rechteckig: true,
            ebene: "GRUNDRISS KELLERGESCHOSS",
            quelle: "Außenbemaßung GRUNDRISS KELLERGESCHOSS, 8 m mal 7 m" },
          { A: 100, U: 41, breite_m: 8, tiefe_m: 12.5, rechteckig: true,
            ebene: "GRUNDRISS ERDGESCHOSS",
            quelle: "Außenbemaßung GRUNDRISS ERDGESCHOSS, 8 m mal 12,5 m" }],
        gegenprobe: gpLesung({ raeume_beschriftet: 4 }) })] },
    };
    const zk = alleZeilen(konturBogen);
    const zkKG = finde(zk, "flaeche_KG"), zkEG = finde(zk, "flaeche_EG");
    pruef(zkKG && /7 m|7,00/.test(zkKG.quelle_soll || ""),
      "das Kellergeschoss muss seine eigene Kontur bekommen: " + (zkKG && zkKG.quelle_soll));
    pruef(zkEG && /12,5|12.5/.test(zkEG.quelle_soll || ""),
      "das Erdgeschoss die seine");
    /* Jede Zeile rechnet gegen IHRE Kontur. Geprueft wird das an der Zahl im
       Text und nicht mehr an `soll`: eine Flaechenprobe, deren Aufloesung
       groesser ist als der kleinste erfasste Raum, gibt seit dem 23.08.2026
       keine Sollzahl mehr aus, sondern steht als Grenze im Bericht. */
    pruef(zkKG && /56,00/.test(zkKG.text || "") && !/100,00/.test(zkKG.text || ""),
      "das Kellergeschoss muss gegen 56 m² rechnen, nicht gegen 100");
    pruef(zkEG && /100,00/.test(zkEG.text || "") && !/56,00/.test(zkEG.text || ""),
      "das Erdgeschoss gegen 100 m², nicht gegen 56");

    /* 5. Die harte Richtung bleibt hart: mehr Raumflaeche als Kontur ist
          geometrisch unmoeglich und bleibt ein Fehler, auch beim Rechteck. */
    const zuGross = JSON.parse(JSON.stringify(konturBogen));
    zuGross.raeume = [raum("k1", "KG", 40), raum("k2", "KG", 30)];
    pruef((finde(alleZeilen(zuGross), "flaeche_KG") || {}).stufe === "fehler",
      "Raumsumme ueber der Kontur muss auch beim Rechteck sperren");

    /* 6. Fenster: die zweite Lesung ersetzt die fehlende Ansicht. */
    const gpFensterRaum = (id, n) => ({ id: id, geschoss: "EG", name: id, A: 20,
      h: 2.5, we: "WE 1", fenster: n, bauteile: [
        { name: "Außenwand", A: 10, kat: "huelle", grenzt_an: { typ: "aussen" } },
        { name: "Fenster", A: 1.5, anzahl: n, kat: "huelle",
          grenzt_an: { typ: "aussen" } }] });
    const gpFensterP = (angelegt, gezaehlt) => ({
      raeume: [gpFensterRaum("r1", angelegt)],
      plan: { bilder: [], seiten: [gpSeite({
        gegenprobeEbenen: [gpEbene("EG", { n: 1, fenster: gezaehlt })],
        gegenprobe: gpLesung({ raeume_beschriftet: 1 }) })] } });
    /* DIESE DREI PROBEN VERLANGTEN EIN URTEIL, DAS ES NICHT MEHR GIBT.
     *
     * Sie stammen aus der Zeit, in der die zweite Lesung Fenster gegen das
     * Raumbuch stellen durfte: gleiche Zahl gruen, drei Unterschied rot. Die
     * Messung vom 22.08.2026 (neun Lesungen desselben Blattes, Erdgeschoss
     * mit 4, 6, 8, 6, 5 und 8 Fenstern) hat diese Voraussetzung widerlegt,
     * und zaehlerFenster fuehrt die Zeile seitdem als GRENZE. Die Proben
     * blieben stehen und behaupteten weiter das alte Verhalten — ein Test,
     * der etwas anderes verlangt, als der Code tut, und dabei rot ist, sagt
     * nichts ueber das Werkzeug. Sie pruefen jetzt, was gilt.
     *
     * Wichtig ist, dass die Zeile NICHT verschwindet: beide Zahlen muessen
     * dastehen, und sie darf nicht als bestandene Gegenprobe zaehlen. */
    [[5, 5], [5, 6], [5, 8], [2, 3]].forEach(function (x) {
      const zf = finde(alleZeilen(gpFensterP(x[0], x[1])), "fenster_gesamt");
      pruef(zf && zf.art === "grenze" && zf.stufe === "hinweis",
        "die Fensterzahl der zweiten Lesung darf kein Urteil tragen ("
          + x[0] + " angelegt, " + x[1] + " gezählt), ist: "
          + (zf ? zf.art + "/" + zf.stufe : "keine Zeile"));
      pruef(zf && zf.text.indexOf(String(x[1])) >= 0
        && zf.text.indexOf(String(x[0])) >= 0,
        "beide Zahlen müssen trotzdem in der Zeile stehen");
      pruef(!gegenproben({ raeume: gpFensterP(x[0], x[1]).raeume,
        plan: gpFensterP(x[0], x[1]).plan }).some(function (z) {
        return z.id === "fenster_gesamt"; }),
        "und sie darf nicht als bestandene Gegenprobe mitzählen");
    });

    /* 7. Unbeheizte Bereiche: benannt, aber nirgends gefuehrt -> Fehler.
          Als beheiztes Geschoss gefuehrt -> kein Fehler, aber benannt. */
    const zonenP = (raeume) => ({
      raeume: raeume,
      plan: { bilder: [], seiten: [gpSeite({
        gegenprobeEbenen: [gpEbene("EG", { n: raeume.length })],
        gegenprobe: gpLesung({ raeume_beschriftet: raeume.length,
          unbeheizt_benannt: ["Keller"] }) })] } });
    const zz1 = alleZeilen(zonenP([raum("r1", "EG", 20)]));
    pruef(!!zz1.find((z) => z.stufe === "fehler" && /Keller/.test(z.titel || "")),
      "ein benannter, nirgends gefuehrter Keller muss sperren");
    const zz2 = alleZeilen(zonenP([raum("r1", "EG", 20), raum("r2", "KG", 18)]));
    pruef(!zz2.find((z) => z.stufe === "fehler" && /Keller/.test(z.titel || "")),
      "ein als beheiztes Geschoss gefuehrter Keller fehlt der Rechnung nicht");
    /* ABER: beantwortet ist die Zeile damit NICHT. Die Unterlagen nennen den
       Keller ausdruecklich unbeheizt, das Raumbuch fuehrt ihn mit 20 Grad C.
       Genau dafuer gibt es die Zeile zone_widerspruch_*. Bis zum 23.08.2026
       stand daneben trotzdem ein gruener Haken „1 von 1", der denselben
       Keller als gedeckt zaehlte und ihn im Satz beim Namen nannte. */
    const zz2z = finde(zz2, "zonen") || {};
    pruef(zz2z.stufe !== "gut" && zz2z.ist === 0 && zz2z.soll === 1,
      "ein strittiger Bereich darf nicht als gedeckt zaehlen, zaehlt: "
        + zz2z.ist + " von " + zz2z.soll + " (" + zz2z.stufe + ")");
    pruef(!!zz2.find(function (z) { return /^zone_widerspruch_/.test(z.id || ""); }),
      "und der Widerspruch muss eine eigene Zeile haben");

    /* 8. Ebenen: der SPITZBODEN steht im Schnitt des echten Blattes, ohne
          eigenen Grundriss und ohne Zone. Das ist ein Befund und keine Frage. */
    const ebenenP = { raeume: [raum("r1", "EG", 20), raum("r2", "OG", 20)],
      plan: { bilder: [], seiten: [
        gpSeite({ bezeichnung: "BV 2-0887", art: "grundriss", geschoss: "EG",
          gegenprobe: gpLesung({ ebenen: [
            { bezeichnung: "KELLERGESCHOSS", gezeichnet: true },
            { bezeichnung: "ERDGESCHOSS", gezeichnet: true },
            { bezeichnung: "OBERGESCHOSS", gezeichnet: true },
            { bezeichnung: "SPITZBODEN", gezeichnet: false }] }) })] } };
    const ze = finde(alleZeilen(ebenenP), "geschosse");
    pruef(ze && ze.stufe === "fehler" && ze.soll === 4,
      "eine nur im Schnitt benannte Ebene muss als fehlendes Geschoss auffallen");

    /* --- Z2 Fläche --------------------------------------------------- */
    const konturP = (flaechen) => ({
      meta: { aussenmasse: "10,00 x 8,00" },
      plan: { bilder: [], gemessen: { wanddicke_m: 0.30 } },
      raeume: flaechen.map((A, i) => raum("r" + i, "EG", A)),
    });
    /* brutto = 80 - 36*0,30 + 4*0,09 = 69,56 m² */
    pruef((finde(zaehler(konturP([50, 30])), "flaeche_EG") || {}).stufe === "fehler",
      "Raumflächen größer als die Innenfläche der Außenwände muss sperren");
    pruef((finde(zaehler(konturP([30, 10])), "flaeche_EG") || {}).stufe === "warnung",
      "Restfläche größer als der kleinste Raum muss warnen");
    pruef((finde(zaehler(konturP([30, 25])), "flaeche_EG") || {}).stufe === "gut",
      "Restfläche kleiner als der kleinste Raum ist unauffällig");

    /* --- Z2 Restflächenrahmen: Wanddicke, Innenwände, Treppenlauf -------
       Nachgestellt ist „BV 2-0887 Ziolkowski": Erdgeschoss 8,00 x 12,50 m,
       sechs Räume mit zusammen 74,72 m², kein Wert für die Wanddicke. Auf
       diesem Blatt stand die Flächenzeile bisher immer da. */
    const ziolRaeume = function (ohne) {
      return [["GAST / ARBEITEN", 12.16], ["WC", 2.17], ["DIELE", 12.10],
              ["KOCHEN", 13.41], ["ESSEN", 16.20], ["WOHNEN", 18.68]]
        .filter(function (x) { return x[0] !== ohne; })
        .map(function (x, i) {
          const r2 = raum("z" + i, "EG", x[1]); r2.name = x[0]; r2.h = 2.52; return r2;
        });
    };
    const ziolP = function (ohne, gezaehlt) {
      return {
        meta: {}, plan: { bilder: [], seiten: [gpSeite({
          geschoss: "EG",
          gegenprobe: gpLesung({ raeume_beschriftet: gezaehlt,
            ebenen: [{ bezeichnung: "EG", gezeichnet: true }],
            aussenbemassung: { vorhanden: true, breite_m: 8, tiefe_m: 12.5,
                               wortlaut: "8,00" } }),
          gegenprobeKontur: { A: 100, U: 41, breite_m: 8, tiefe_m: 12.5,
            rechteckig: true, quelle: "Außenbemaßung des Blattes, 8 m mal 12,5 m" },
        })] },
        raeume: ziolRaeume(ohne),
      };
    };
    /* 74,72 m² in einer Kontur von 100 m², Wanddicke unbekannt: das ergibt
       keinen Befund — aber auch keinen Haken. Die Spanne aus Wanddicke,
       Innenwaenden und Treppe deckt die ganze Restflaeche ab; ein
       uebersehener Raum verschwaende darin. Die Probe ist gelaufen und ohne
       Aussage, also eine Grenze. Bis zum 23.08.2026 stand hier gruen „gut"
       und im selben Satz, dass die Probe rund 25 m² aufloest. */
    const zZiol = finde(grenzen(ziolP(null, 6)), "flaeche_EG");
    pruef(!finde(zaehler(ziolP(null, 6)), "flaeche_EG"),
      "eine Flaechenprobe ohne Aufloesung darf nicht in der Liste stehen");
    pruef(zZiol && zZiol.stufe === "hinweis" && zZiol.soll === null && !!zZiol.abhilfe,
      "Ziolkowski EG: die Probe loest hier nichts auf und ist eine Grenze, ist "
        + (zZiol ? zZiol.stufe + "/" + zZiol.soll : "keine Zeile"));
    pruef(zZiol && /0,24 bis 0,50/.test(zZiol.text),
      "die angenommene Wanddickenspanne muss in der Zeile stehen");
    pruef(zZiol && /DIN 4172/.test(zZiol.text),
      "die Herleitung des Rahmens muss ihre Fundstelle nennen");
    pruef(zZiol && /löst rund/.test(zZiol.text),
      "die Auflösung der Probe gehört in die Zeile (Grenze im Bericht)");
    /* Und der Fall, für den es die Probe gibt: ein Raum fehlt im Raumbuch,
       die zweite Lesung zählt ihn aber. */
    const zFehlt = finde(zaehler(ziolP("WOHNEN", 6)), "flaeche_EG");
    pruef(zFehlt && zFehlt.stufe === "warnung",
      "fehlt ein Raum von 18,68 m², muss die Flächenprobe anschlagen, tut "
        + (zFehlt ? zFehlt.stufe : "nichts"));
    pruef(zFehlt && /fehlt ein Raum|nachsehen/.test(zFehlt.text),
      "der Befund muss sagen, wonach zu sehen ist");
    /* Ist die Wanddicke aus dem Schichtaufbau bekannt, fällt die Annahme weg
       und die Probe wird schärfer. */
    const pSchicht = ziolP(null, 6);
    pSchicht.bauteiltypen = [{ id: "aw", name: "Außenwand",
      schichten: [{ mat: "putz", d: 0.015 }, { mat: "ziegel", d: 0.365 }] }];
    const zSchicht = finde(zaehler(pSchicht), "flaeche_EG");
    pruef(zSchicht && zSchicht.stufe === "gut" && /Summe der Schichtdicken/.test(zSchicht.text),
      "die Wanddicke aus dem Schichtaufbau muss genommen und benannt werden");
    pruef(zSchicht && !/ANNAHME/.test(zSchicht.text),
      "mit belegter Wanddicke darf keine Annahme mehr dastehen");
    /* Der Rahmen selbst, gegen die Hand nachgerechnet. */
    const rr = restrahmen({ raeume: 6, flaechen: [12.16, 2.17, 12.10, 13.41, 16.20, 18.68],
      umfang_m: 41, kurz_m: 8, lang_m: 12.5, treppe: true,
      hoehe_unten: 2.77, hoehe_oben: 2.92 });
    pruef(rr.unten > 0 && rr.oben > rr.unten && rr.oben < 25,
      "der Rahmen muss eine sinnvolle Spanne sein, ist " + rr.unten.toFixed(1)
        + " bis " + rr.oben.toFixed(1));
    pruef(/DIN 18065/.test(rr.wie) && /DIN 4172/.test(rr.wie),
      "beide Fundstellen müssen in der Herleitung stehen");
    pruef(restrahmen({ raeume: 6, flaechen: [12.16, 2.17, 12.10, 13.41, 16.20, 18.68],
      umfang_m: 41, kurz_m: 8, lang_m: 12.5, treppe: false }).oben < rr.oben,
      "ohne Treppe muss der Rahmen enger sein als mit");
    pruef(restrahmen({ raeume: 6, flaechen: [], umfang_m: 0, kurz_m: 0, lang_m: 0,
      treppe: false }).teile === 0,
      "ohne Seitenlängen darf kein Rahmen behauptet werden");
    /* Ein Bogen mit drei Grundrissen: je Ebene eine eigene Kontur. Ohne diese
       Zuordnung liefe die Kontur des Erdgeschosses (100 m²) gegen den
       Keller (56 m²) und erzeugte einen roten Befund über ein einwandfreies
       Gebäude. Der Name der Ebene steht dabei so da, wie er auf dem Blatt
       steht — „GRUNDRISS KELLERGESCHOSS" muss zu „KG" finden. */
    const kellerRaum = raum("k1", "KG", 17.99); kellerRaum.h = 2.32;
    const kellerRaum2 = raum("k2", "KG", 21.20); kellerRaum2.h = 2.32;
    const bogenP = {
      meta: {}, raeume: ziolRaeume(null).concat([kellerRaum, kellerRaum2]),
      plan: { bilder: [], seiten: [{
        id: "s1", bezeichnung: "BV 2-0887 Blatt 1", geschoss: "EG",
        art: "grundriss", uebernommen: true, verwenden: true,
        gegenprobeKonturen: [
          { A: 100, U: 41, breite_m: 8, tiefe_m: 12.5, rechteckig: true,
            ebene: "GRUNDRISS ERDGESCHOSS", quelle: "Außenbemaßung ERDGESCHOSS" },
          { A: 56, U: 30, breite_m: 8, tiefe_m: 7, rechteckig: true,
            ebene: "GRUNDRISS KELLERGESCHOSS", quelle: "Außenbemaßung KELLERGESCHOSS" },
        ],
      }] },
    };
    const zBogenKG = finde(zaehler(bogenP).concat(grenzen(bogenP)), "flaeche_KG");
    pruef(zBogenKG && /KELLERGESCHOSS/.test(zBogenKG.quelle_soll || "")
      && /56,00/.test(zBogenKG.text || ""),
      "der Keller muss gegen SEINE Kontur laufen (56 m²), nicht gegen die des "
        + "Erdgeschosses, läuft gegen " + (zBogenKG ? zBogenKG.quelle_soll : "nichts"));
    pruef(zBogenKG && zBogenKG.stufe !== "fehler",
      "der richtig zugeordnete Keller darf keinen Fehler erzeugen, erzeugt "
        + (zBogenKG ? zBogenKG.stufe : "keine Zeile"));
    const p4 = { raeume: [raum("r1", "EG", 20)], plan: { bilder: [] }, meta: {} };
    const z4 = finde(alleZ(p4), "flaeche_EG");
    pruef(z4 && z4.art === "grenze" && z4.soll === null && z4.abhilfe,
      "ohne Kontur ist die Flächensumme eine Grenze und nennt den Weg dorthin");
    pruef(istGrenze(p4, "flaeche_EG"),
      "sie darf dann nicht mehr in der Liste zum Abarbeiten stehen");

    /* --- Z6d Fassadendeckung: die Probe gilt in BEIDE Richtungen ------ *
     * Zu wenig Außenwand war immer ein Befund. Zu viel stand gruen da und
     * sagte „die Fassade ist damit den Raeumen zugeordnet" — neben zwei
     * Zahlen, die einander widersprechen. Gemessen im Browser am Blatt
     * „BV 2-0887 Ziolkowski", 23.08.2026: 41,34 m Raumaussenwand gegen
     * 35,00 m Umfang, gruen. Jeder Raum traegt hier 10 m² Aussenwand bei
     * 2,5 m Hoehe, also 4,00 m Wandlaenge. */
    function pFassade(umfang, n) {
      const rs = [];
      for (let i = 0; i < n; i++) rs.push(raum("f" + i, "EG", 20));
      return { meta: {}, raeume: rs, plan: { bilder: [], seiten: [{
        id: "s1", bezeichnung: "Blatt 1", geschoss: "EG", art: "grundriss",
        uebernommen: true, verwenden: true,
        gegenprobeKonturen: [{ A: umfang * umfang / 16, U: umfang,
          breite_m: umfang / 4, tiefe_m: umfang / 4, rechteckig: true,
          ebene: "GRUNDRISS ERDGESCHOSS",
          quelle: "Außenbemaßung ERDGESCHOSS" }],
      }] } };
    }
    /* 4 Raeume mal 4,00 m = 16,00 m Wand gegen 10,00 m Umfang: 60 Prozent
       mehr Wand, als die Kontur hergibt. Kein Haken. */
    const pFzuviel = pFassade(10, 4);
    const zFzuviel = finde(zaehler(pFzuviel).concat(grenzen(pFzuviel)), "fassade_EG");
    pruef(zFzuviel && zFzuviel.stufe !== "gut" && /über dem Umfang/.test(zFzuviel.titel)
      && /zu GROSS/.test(zFzuviel.text) && !!zFzuviel.abhilfe,
      "mehr Raumaussenwand als Umfang darf keinen Haken bekommen, ist: "
        + (zFzuviel ? zFzuviel.stufe + " / " + zFzuviel.titel : "keine Zeile"));
    /* Und die Gegenrichtung: passt es, bleibt der Haken. 4 Raeume mal 4,00 m
       gegen 16,00 m Umfang. Sonst waere die Probe nur strenger und nicht
       richtiger. */
    const pFpasst = pFassade(16, 4);
    const zFpasst = finde(zaehler(pFpasst), "fassade_EG");
    pruef(zFpasst && zFpasst.stufe === "gut",
      "deckt sich die Wandlaenge mit dem Umfang, bleibt es eine bestandene "
        + "Probe, ist: " + (zFpasst ? zFpasst.stufe : "keine Zeile"));

    /* --- Die aeusserste Masskette im Textstand als Umfangsquelle ------- *
     * Fall „Hasenberg_10_Grundrisse" (echter Lauf): das Werkzeug las die
     * Kette 18,95 x 16,62 m, nannte sie im Fragetext — und verlangte
     * dieselben vier Zahlen vom Bearbeiter. EINE saubere Kette ohne
     * Widerspruch IST der Umfang; nur die mehrkettig-strittige Lesung
     * (Fall „Bauantrag", 30 m gegen belegte 26 m) bleibt eine Obergrenze. */
    function pTextstand(o) {
      const rs = [];
      for (let i = 0; i < o.n; i++) rs.push(raum("t" + i, "EG", 20));
      const p2 = { meta: {}, raeume: rs, plan: { bilder: [], seiten: [{
        id: "s1", bezeichnung: "Blatt 1", geschoss: "EG", art: "grundriss",
        uebernommen: true, verwenden: true,
        aussenbemassung: { vorhanden: true, breite_m: o.b, tiefe_m: o.t,
          wortlaut: o.wortlaut || "", belegt: !!o.belegt,
          konkurrenz: !!o.konkurrenz },
      }] } };
      if (o.umfangsabgleich) p2.umfangsabgleich = o.umfangsabgleich;
      return p2;
    }
    /* Einkettig-eindeutig, Wandlaengen decken den Umfang: gruen, und die
       Quelle sagt, dass die Kette der Umfang IST — keine Obergrenze. */
    const zTsGut = finde(zaehler(pTextstand({ n: 4, b: 4, t: 4 })), "fassade_EG");
    pruef(zTsGut && zTsGut.stufe === "gut"
      && /ohne Widerspruch/.test(zTsGut.quelle_soll || ""),
      "die einzige eindeutige Masskette ist der Umfang, ist: "
        + (zTsGut ? zTsGut.stufe + " / " + zTsGut.quelle_soll : "keine Zeile"));
    /* GEGENPROBE: zwei konkurrierende Ketten — die Frage bleibt. Zwei Raeume
       mit 8 m Wand gegen 20 m Umfang, die Kette strittig: der Befund bleibt
       eine Warnung in der Liste zum Abarbeiten. */
    const zTsStreit = finde(zaehler(pTextstand({ n: 2, b: 5, t: 5,
      konkurrenz: true })), "fassade_EG");
    pruef(zTsStreit && zTsStreit.stufe === "warnung"
      && /strittig/.test(zTsStreit.quelle_soll || ""),
      "bei konkurrierenden Ketten bleibt die Fassadenluecke eine Warnung und "
        + "die Quelle nennt den Streit, ist: "
        + (zTsStreit ? zTsStreit.stufe + " / " + zTsStreit.quelle_soll : "keine Zeile"));

    /* --- Verteilte Fassade: stille Grenze statt gruenem Haken --------- *
     * Hat der Umfangsabgleich die Luecke auf die Raeume verteilt, prueft
     * die Fassadenzeile ihre eigene Quelle. Sie wird eine Grenze, die sagt,
     * was uebernommen und was verteilt wurde — ohne Eingabefeld, ohne
     * Begruendungspflicht, ohne Platz in der Liste zum Abarbeiten. */
    const pVerteilt = pTextstand({ n: 4, b: 4, t: 4, umfangsabgleich: [
      { geschoss: "EG", art: "kontur", U_soll: 16, U_roh: 12.5, faktor: 1.28 },
    ] });
    const zVerteilt = finde(grenzen(pVerteilt), "fassade_EG");
    pruef(zVerteilt && zVerteilt.stufe === "hinweis"
      && /verteilt/.test(zVerteilt.text) && /3,50/.test(zVerteilt.text)
      && /ANNAHME/.test(zVerteilt.text),
      "verteilte Fassade wird als benannte Annahme berichtet (3,50 m), ist: "
        + (zVerteilt ? zVerteilt.stufe + " / " + zVerteilt.text.slice(0, 80)
          : "keine Zeile"));
    pruef(istGrenze(pVerteilt, "fassade_EG"),
      "die verteilte Fassade darf nicht in der Liste zum Abarbeiten stehen");
    /* GEGENPROBE: ohne Verteilung (Faktor 1) bleibt der echte gruene Haken —
       dort haben zwei unabhaengige Zahlen wirklich uebereingestimmt. */
    const zUnverteilt = finde(zaehler(pTextstand({ n: 4, b: 4, t: 4,
      umfangsabgleich: [{ geschoss: "EG", art: "kontur", U_soll: 16,
        U_roh: 16, faktor: 1 }] })), "fassade_EG");
    pruef(zUnverteilt && zUnverteilt.stufe === "gut",
      "ohne Verteilung bleibt die bestandene Probe gruen, ist: "
        + (zUnverteilt ? zUnverteilt.stufe : "keine Zeile"));

    /* --- Die verworfene Masskette ist kein Soll (Fall Hasenberg OG) --- *
     * Der Umfangsabgleich hat die Kette als unpassend verworfen (Rechteck
     * umschreibt das ganze Gebaeude) und hochgerechnet; die Raeume tragen
     * genau diesen Umfang. Dann ist die Fassadenzeile eine stille Grenze
     * mit der vorsichtigen Richtung im Text — keine Pflichtfrage. */
    const pVerworfen = pTextstand({ n: 2, b: 5, t: 5, umfangsabgleich: [
      { geschoss: "EG", art: "hochrechnung", U_soll: 8, U_roh: 6.3,
        faktor: 1.27, quelle: "hochgerechnet aus dem OG" },
    ] });
    const zVerworfen = finde(grenzen(pVerworfen), "fassade_EG");
    pruef(zVerworfen && zVerworfen.stufe === "hinweis"
      && /Obergrenze/.test(zVerworfen.text)
      && /zu KLEIN/.test(zVerworfen.text),
      "passt die Wandlaenge zur eigenen Umfangsquelle des Abgleichs, ist die "
        + "verworfene Masskette eine Grenze mit Richtungshinweis, ist: "
        + (zVerworfen ? zVerworfen.stufe + " / "
          + zVerworfen.text.slice(0, 80) : "keine Zeile"));
    pruef(!finde(zaehler(pVerworfen), "fassade_EG"),
      "diese Grenze darf nicht in der Liste zum Abarbeiten stehen");
    /* GEGENPROBE: passen die Raeume auch zur EIGENEN Quelle des Abgleichs
       nicht, bleibt die Warnung — die Luecke ist dann echt. */
    const zVerfehlt = finde(zaehler(pTextstand({ n: 2, b: 5, t: 5,
      umfangsabgleich: [{ geschoss: "EG", art: "hochrechnung", U_soll: 12,
        U_roh: 9.5, faktor: 1.26 }] })), "fassade_EG");
    pruef(zVerfehlt && zVerfehlt.stufe === "warnung",
      "verfehlen die Raeume auch die eigene Umfangsquelle, bleibt die "
        + "Warnung, ist: " + (zVerfehlt ? zVerfehlt.stufe : "keine Zeile"));

    /* --- Z4 Geschosse und Treppentest -------------------------------- */
    const p5 = { raeume: [raum("r1", "EG", 20), raum("r2", "OG", 20)], zonen: [],
                 plan: { bilder: [{ bezeichnung: "Schnitt", art: "schnitt",
                                    ebenen_erkennbar: 4 }] } };
    const z5 = finde(zaehler(p5), "geschosse");
    pruef(z5 && z5.stufe === "fehler" && z5.soll === 4 && z5.aufhebbar === false,
      "vier Ebenen im Schnitt gegen zwei Geschosse muss sperren und darf nicht "
      + "einfach aufhebbar sein");
    const p6 = JSON.parse(JSON.stringify(p5));
    p6.zonen = [{ id: "z1", name: "Keller" }, { id: "z2", name: "Spitzboden" }];
    pruef((finde(zaehler(p6), "geschosse") || {}).stufe === "gut",
      "unbeheizte Bereiche müssen als Ebenen mitzählen");
    const p7 = { raeume: [raum("r1", "EG", 20)], zonen: [],
                 plan: { bilder: [{ bezeichnung: "EG", art: "grundriss", treppe: "auf_und_ab" },
                                  { bezeichnung: "OG", art: "grundriss", treppe: "nur_ab" }] } };
    const z7 = finde(zaehler(p7), "treppentest");
    pruef(z7 && z7.stufe === "fehler" && /unterste/.test(z7.text),
      "fehlende Treppe ohne Abgang muss das unterste Geschoss anmahnen");

    /* --- Z3 Fenster --------------------------------------------------- */
    const fenster = (n, lage) => Array.from({ length: n }, () =>
      ({ name: "Fenster", A: 1.5, kat: "huelle", lage: lage, grenzt_an: { typ: "aussen" } }));
    const p8 = { raeume: [raum("r1", "EG", 20, fenster(4, "Nord")
                    .concat([{ name: "Außenwand", A: 20, kat: "huelle",
                               grenzt_an: { typ: "aussen" } }]))],
                 plan: { bilder: [] }, ansichten: [{ fassade: "Nord", fenster: 5,
                                                     fassade_belegt: true,
                                                     blatt: "Ansicht Nord" }] };
    const z8 = finde(zaehler(p8), "fenster_nord");
    pruef(z8 && z8.stufe === "fehler" && z8.ist === 4 && z8.soll === 5,
      "ein Fenster weniger als in der Ansicht muss auffallen");
    const p9 = JSON.parse(JSON.stringify(p8));
    p9.ansichten = [];
    const z9 = finde(alleZ(p9), "fenster_gesamt");
    pruef(z9 && z9.art === "grenze" && z9.abhilfe,
      "ohne jede Gegenzahl ist die Fensterprobe eine Grenze mit benanntem Weg");
    pruef(istGrenze(p9, "fenster_gesamt"),
      "sie darf dann nicht mehr in der Liste zum Abarbeiten stehen");
    /* KEINE BEHAUPTUNG ÜBER EINE UNBELEGTE FASSADE. Gemessen am 24.08.2026:
       „Fassade West: 8" gemeldet, auf dem Blatt gibt es nur Nord/Ost/Süd.
       Ohne fassade_belegt darf keine Zeile „Fenster Fassade West" entstehen;
       die Fensterzahl bleibt und zählt gegen die Gesamtzahl, ohne die
       Himmelsrichtung zu behaupten. */
    const p8u = JSON.parse(JSON.stringify(p8));
    p8u.ansichten = [{ fassade: "West", fenster: 8, blatt: "Blatt 1" }];
    const z8u = alleZ(p8u);
    pruef(!finde(z8u, "fenster_west"),
      "eine unbelegte Fassadenbezeichnung darf keine Fassadenzeile erzeugen");
    const z8s = finde(z8u, "fenster_ansichtsumme");
    pruef(z8s && z8s.soll === 8 && /unbelegt/.test(z8s.quelle_soll || z8s.text || ""),
      "die Fensterzahl der unbelegten Ansicht muss gegen die Gesamtzahl laufen "
        + "und als unbelegt benannt sein: " + (z8s && z8s.quelle_soll));
    pruef(!/Fassade West: 8/.test((z8s && z8s.text) || ""),
      "der Summentext darf die unbelegte Fassade nicht behaupten: "
        + (z8s && z8s.text));
    /* Mit Wortlaut-Beleg entsteht die Fassadenzeile wieder — dieselbe
       Prüfschärfe, jetzt mit Grundlage. */
    const p8b = JSON.parse(JSON.stringify(p8));
    p8b.ansichten = [{ fassade: "Nord", fenster: 5, fassade_belegt: true,
      fassade_wortlaut: "ANSICHT NORD", blatt: "Ansicht Nord" }];
    pruef(!!finde(zaehler(p8b), "fenster_nord"),
      "eine belegte Fassadenbezeichnung muss weiter je Fassade geprüft werden");

    /* --- Z5 unbeheizte Bereiche --------------------------------------- */
    const p10 = { raeume: [raum("r1", "EG", 20)], zonen: [], plan: { bilder: [] },
                  plangebaeude: { unbeheizte_bereiche: ["Spitzboden"] } };
    const z10 = zaehler(p10).filter((z) => /^zone_fehlt_/.test(z.id));
    pruef(z10.length === 1 && z10[0].stufe === "fehler" && z10[0].aktionen.length === 1,
      "ein benannter, aber nicht angelegter unbeheizter Bereich muss eine eigene "
      + "Zeile mit Anlegen-Knopf erzeugen");
    const p11 = JSON.parse(JSON.stringify(p10));
    p11.zonen = [{ id: "z1", name: "Spitzboden über dem OG" }];
    pruef(!zaehler(p11).some((z) => /^zone_fehlt_/.test(z.id)),
      "eine angelegte Zone darf nicht als fehlend gemeldet werden");

    /* --- Z6 Räume ohne Hüllbauteil ------------------------------------ */
    const p12 = { raeume: [raum("r1", "EG", 20, []), raum("r2", "EG", 15)],
                  plan: { bilder: [] } };
    const z12 = finde(zaehler(p12), "ohne_huelle");
    pruef(z12 && z12.stufe === "fehler" && z12.ist === 1 && /r1/.test(z12.text),
      "ein Raum ohne Bauteil zur Hülle muss namentlich gemeldet werden");

    /* --- Was das Werkzeug selbst beantwortet ---------------------------
       Jede dieser Zeilen war einmal eine offene Frage an den Bearbeiter.
       Geprüft wird hier beides: dass die Antwort kommt UND dass sie an der
       richtigen Stelle ausbleibt. Eine Annahme, die immer greift, wäre keine
       Annahme mehr, sondern eine Übertünchung. */

    /* Z1 gegen die Planauslese */
    const seite = (n, g) => ({ bezeichnung: "Grundriss " + g, geschoss: g,
      auslese: { raeume: Array.from({ length: n }, (x, i) => ({ bezeichnung: "R" + i })) } });
    const p20 = { raeume: [raum("r1", "EG", 20), raum("r2", "EG", 15),
                           raum("r3", "EG", 10)],
                  plan: { bilder: [], seiten: [seite(3, "EG")] } };
    /* ZWEI AUSSAGEN, ZWEI ZEILEN. Die Übernahme ist geprüft und bestanden;
       dass beide Zahlen aus derselben Lesung stammen, ist eine Grenze. Vorher
       war beides eine Zeile der Stufe „Hinweis", die auf jedem Projekt in der
       Liste stand und dort nie zu schließen war. */
    const z20 = finde(zaehler(p20), "raeume_EG");
    pruef(z20 && z20.stufe === "gut" && z20.soll === 3 && z20.ist === 3,
      "die Planauslese muss die Frage nach den beschrifteten Räumen beantworten");
    const z20g = finde(grenzen(p20), "raeume_nur_eine_lesung_EG");
    pruef(z20g && /einzigen Lesung/.test(z20g.text) && z20g.abhilfe,
      "die fehlende Unabhängigkeit muss als Grenze im Bericht stehen");
    const p21 = JSON.parse(JSON.stringify(p20));
    p21.plan.seiten = [seite(4, "EG")];
    const z21 = finde(zaehler(p21), "raeume_EG");
    pruef(z21 && z21.stufe === "fehler" && z21.soll === 4,
      "ein zwischen Auslese und Raumbuch verlorener Raum muss auffallen");
    const p22 = JSON.parse(JSON.stringify(p20));
    p22.plan.bilder = [{ bezeichnung: "Blatt 1", art: "grundriss", geschoss: "EG",
                         raeume_erkennbar: 3 }];
    pruef((finde(zaehler(p22), "raeume_EG") || {}).stufe === "gut",
      "erst eine unabhängige Zählung macht die Zeile grün");

    /* Z2 ohne Kontur: geklärte Raumzahl entschärft die Frage */
    pruef((finde(alleZ(p20), "flaeche_EG") || {}).art === "grenze",
      "ist die Raumzahl beantwortet, ist die fehlende Kontur keine offene Frage");
    /* Kein Ringschluss: die Raumzahl darf sich nicht auf die Flächensumme
       berufen, während die Flächensumme sich auf die Raumzahl beruft. Zwei
       Zeilen, die einander decken, decken nichts. */
    pruef(!/Flächensumme/.test((finde(alleZ(p20), "raeume_EG") || {}).text || ""),
      "die Raumzahl darf sich nicht auf die Flächensumme berufen");
    pruef(/Außenmaße/.test((finde(alleZ(p20), "flaeche_EG") || {}).abhilfe || ""),
      "die Flächensumme muss den Weg nennen, der die Lücke wirklich schließt");
    const p23 = { raeume: p20.raeume, plan: { bilder: [] }, meta: {} };
    pruef((finde(alleZ(p23), "flaeche_EG") || {}).stufe === "offen",
      "ohne jede Antwort muss die Flächenprobe offen bleiben");

    /* Z2 Rücksprung: Keller und Dachgeschoss sind der Regelfall */
    const rueck = (kuerzel) => ({ meta: {}, plan: { bilder: [] },
      raeume: [raum("e1", "EG", 40), raum("e2", "EG", 35),
               raum("k1", kuerzel, 20)] });
    const zKG = finde(alleZ(rueck("KG")), "flaeche_KG");
    pruef(zKG && zKG.art === "grenze" && /ANNAHME/.test(zKG.text),
      "ein kleinerer Keller ist der Regelfall und wird als Annahme gesetzt");
    const zDG = finde(alleZ(rueck("DG")), "flaeche_DG");
    pruef(zDG && zDG.art === "grenze" && /Dachschräge/.test(zDG.text),
      "ein kleineres Dachgeschoss ist der Regelfall");
    /* Bei einem Vollgeschoss zwischen anderen bleibt es ein Befund in der
       Liste: dort ist der fehlende Raum die wahrscheinlichere Erklärung, und
       den kann der Bearbeiter am Plan entscheiden. */
    const zOG = finde(zaehler(rueck("OG")), "flaeche_OG");
    pruef(zOG && zOG.art === "befund" && zOG.stufe === "offen",
      "ein kleineres Vollgeschoss bleibt eine Frage, dort fehlt eher ein Raum");

    /* Z3 Fenster gegen den Grundriss, wenn keine Ansicht vorliegt */
    const fz = (n) => Array.from({ length: n }, () => ({ name: "Fenster", A: 1.5,
      kat: "huelle", grenzt_an: { typ: "aussen" } }));
    const wand = { name: "Außenwand", A: 20, kat: "huelle", grenzt_an: { typ: "aussen" } };
    const fensterP = (angelegt, gelesen) => ({ plan: { bilder: [] }, raeume: [
      Object.assign(raum("r1", "EG", 20, fz(angelegt).concat([wand])),
                    { fenster: gelesen })] });
    const z24 = finde(zaehler(fensterP(1, 3)), "fenster_gesamt");
    pruef(z24 && z24.stufe === "fehler" && z24.soll === 3 && z24.ist === 1,
      "ein gelesenes, aber nicht angelegtes Fenster muss auffallen");
    const z25 = finde(zaehler(fensterP(3, 3)), "fenster_gesamt");
    pruef(z25 && z25.stufe === "gut" && z25.art === "pruefung",
      "stimmen gelesene und angelegte Fenster überein, ist die Frage beantwortet");
    const z25g = finde(grenzen(fensterP(3, 3)), "fenster_nur_eine_lesung");
    pruef(z25g && /einzigen Lesung/.test(z25g.text) && z25g.abhilfe,
      "dass beide Zahlen aus einer Lesung stammen, gehört als Grenze in den Bericht");

    /* Z3 Himmelsrichtung: für die Heizlast ohne Belang, am Normtext geprüft.
       DIN EN 12831-1 rechnet ohne solare Gewinne; von der Lage geht allein
       die ZAHL der exponierten Fassaden über den Abschirmkoeffizienten e ein.
       Ohne Ansicht ist deshalb GAR NICHTS verloren, und dann darf auch keine
       Zeile entstehen. Mit Ansicht fehlt der Abgleich Fassade für Fassade —
       das ist eine Grenze und keine Beanstandung. */
    pruef(!finde(alleZ(fensterP(3, 3)), "fenster_ohne_lage"),
      "ohne Ansicht kostet die fehlende Himmelsrichtung nichts und erzeugt "
      + "deshalb keine Zeile");
    const pLage = JSON.parse(JSON.stringify(fensterP(3, 3)));
    pLage.ansichten = [{ fassade: "Nord", fenster: 3, fassade_belegt: true, blatt: "Ansicht Nord" }];
    const z26 = finde(alleZ(pLage), "fenster_ohne_lage");
    pruef(z26 && z26.art === "grenze",
      "mit Ansicht fehlt der fassadenweise Abgleich: eine Grenze, keine Warnung");
    pruef(z26 && /12831/.test(z26.text) && /exponierten Fassaden/.test(z26.text),
      "der Grund muss am Normtext genannt werden, nicht behauptet");

    /* Z4 Geschossfolge ohne Schnitt */
    const folgeP = (namen) => ({ plan: { bilder: [] }, zonen: [],
      raeume: namen.map((g, i) => raum("r" + i, g, 20)) });
    const z27 = finde(zaehler(folgeP(["EG", "2.OG"])), "geschosse");
    pruef(z27 && z27.stufe === "fehler" && /fehlen 1 Ebenen/.test(z27.text),
      "eine Lücke in der Geschossfolge muss auch ohne Schnitt auffallen");
    const z28 = finde(zaehler(folgeP(["KG", "EG", "OG"])), "geschosse");
    pruef(z28 && z28.stufe === "gut" && /lückenlos/.test(z28.text),
      "eine geschlossene Geschossfolge ist eine bestandene Probe");
    const z28g = finde(grenzen(folgeP(["KG", "EG", "OG"])), "geschosse_rand");
    pruef(z28g && z28g.abhilfe,
      "was die Probe nicht abdecken kann, gehört als Grenze in den Bericht");
    const z29 = finde(alleZ(folgeP(["EG"])), "geschosse");
    pruef(z29 && z29.art === "grenze" && z29.stufe === "offen",
      "ein einzelnes Geschoss ergibt keine prüfbare Folge");

    /* Z5 EINE LEERE LISTE IST KEINE ANTWORT.
     *
     * Hier stand: „eine ausgewertete, aber leere Liste ist eine Antwort und
     * keine Lücke". Damit hielt der Selbsttest genau den Fehler fest, um den
     * es geht — er war grün, weil er das Falsche verlangte. Ein grüner Haken
     * auf einem leeren Feld beruht nicht auf einem Beleg, sondern auf dem
     * Fehlen eines Belegs. Grün gibt es nur gegen eine Aufzählung. */
    const p30 = { raeume: [raum("r1", "EG", 20)], zonen: [], plan: { bilder: [] },
                  plangebaeude: { unbeheizte_bereiche: [] } };
    const z30 = finde(alleZ(p30), "zonen");
    pruef(z30 && z30.art === "grenze" && z30.stufe === "hinweis" && !!z30.abhilfe,
      "eine leere Liste ohne Aufzählung der Ebenen darf nicht grün sein, ist: "
        + (z30 ? z30.art + "/" + z30.stufe : "keine Zeile"));
    pruef(!finde(zaehler(p30), "zonen"),
      "ohne Beleg gehört die Frage in den Bericht und nicht in die Liste");
    pruef(z30 && /KEIN Nachweis/.test(z30.text),
      "die Zeile muss sagen, dass eine leere Liste nichts beweist");

    /* Grün gegen eine Aufzählung: die zweite Lesung führt beide Ebenen auf,
       beide sind gezeichnet und stehen im Raumbuch. Jetzt ist hingesehen
       und abgezählt worden — das ist ein Beleg. */
    const p30b = {
      raeume: [raum("r1", "EG", 20), raum("o1", "OG", 18)], zonen: [],
      plangebaeude: { unbeheizte_bereiche: [] },
      plan: { bilder: [], seiten: [gpSeite({ gegenprobe: gpLesung({
        raeume_beschriftet: 2,
        ebenen: [{ bezeichnung: "GRUNDRISS ERDGESCHOSS", gezeichnet: true },
                 { bezeichnung: "GRUNDRISS OBERGESCHOSS", gezeichnet: true }] }) })] },
    };
    const z30b = finde(zaehler(p30b), "zonen");
    pruef(z30b && z30b.stufe === "gut" && /aufgezählt/.test(z30b.text),
      "eine vollständige Aufzählung gezeichneter Ebenen ist ein Beleg, ist: "
        + (z30b ? z30b.stufe : "keine Zeile"));

    /* DER FALL ZIOLKOWSKI, IN SEINER GEFÄHRLICHEN FASSUNG.
       Der Schnitt benennt den SPITZBODEN, ein Grundriss dazu liegt nicht vor
       — und die Lesung hat ihn NICHT nach unbeheizt_benannt geschrieben. Bis
       hierher entstand daraus ein grüner Haken. Jetzt trägt die Ebenenliste
       den Befund allein. */
    const p30c = {
      raeume: [raum("r1", "EG", 20), raum("o1", "OG", 18)], zonen: [],
      plangebaeude: { unbeheizte_bereiche: [] },
      plan: { bilder: [], seiten: [gpSeite({ gegenprobe: gpLesung({
        raeume_beschriftet: 2, unbeheizt_benannt: [],
        ebenen: [{ bezeichnung: "GRUNDRISS ERDGESCHOSS", gezeichnet: true },
                 { bezeichnung: "GRUNDRISS OBERGESCHOSS", gezeichnet: true },
                 { bezeichnung: "SPITZBODEN", gezeichnet: false }] }) })] },
    };
    const z30c = finde(zaehler(p30c), "zone_fehlt_0");
    pruef(z30c && z30c.stufe === "fehler" && /SPITZBODEN/.test(z30c.titel),
      "ein nur im Schnitt benannter Spitzboden muss auch ohne unbeheizt_benannt "
        + "auffallen. Zeilen: "
        + zaehler(p30c).map(function (x) { return x.id + "/" + x.stufe; }).join(", "));
    pruef(!finde(zaehler(p30c), "zonen"),
      "neben dem Fehlbefund darf keine grüne Zeile „keine Bereiche“ stehen");
    pruef(z30c && (z30c.aktionen || []).some(function (a) {
      return a.aktion === "kbZoneAnlegen"; }),
      "der Befund muss den Weg zur Zone mitliefern");

    /* Derselbe Bogen, aber der Spitzboden IST als Zone angelegt: dann ist es
       ein Beleg und kein Fehler. Ohne diese Probe wäre die vorige mit einer
       Zeile zu erfüllen, die immer rot ist. */
    const p30d = JSON.parse(JSON.stringify(p30c));
    p30d.zonen = [{ id: "z1", name: "Unbeheizter Dachraum", modus: "lage",
                    lage: "dach_geschlossen_undicht", huelle: [] }];
    const z30d = finde(zaehler(p30d), "zonen");
    pruef(z30d && z30d.stufe === "gut" && /SPITZBODEN/.test(z30d.text),
      "ist der Bereich angelegt, ist die Zeile grün und nennt die Zuordnung");

    /* Doppelt genannt ist nicht doppelt vorhanden. */
    const p30e = JSON.parse(JSON.stringify(p30c));
    p30e.plan.seiten[0].gegenprobe.unbeheizt_benannt = ["Spitzboden"];
    pruef(zaehler(p30e).filter(function (x) {
      return /^zone_fehlt_/.test(x.id); }).length === 1,
      "derselbe Bereich aus zwei Quellen darf nur einen Befund ergeben");

    /* EINBAUTEIL ALS „UNBEHEIZTER BEREICH" GELESEN (Kundenbefund, echter
       Lauf Hasenberg 10 am 25.08.2026): eine Garderobe erzeugt KEINE
       Zone-anlegen-Frage, sondern einen stillen Vermerk. Die Erkennung
       kommt aus MODUL_KI — im Selbsttest muss das Modul geladen sein. */
    if (typeof window !== "undefined" && window.MODUL_KI
        && window.MODUL_KI.istEinbauteil) {
      const p30g = JSON.parse(JSON.stringify(p30c));
      p30g.plan.seiten[0].gegenprobe.ebenen =
        p30g.plan.seiten[0].gegenprobe.ebenen.slice(0, 2);
      p30g.plan.seiten[0].gegenprobe.unbeheizt_benannt =
        ["Garderobe/Schrank", "Garderobe (kleiner Raum bei Treppe)"];
      const zg = zaehler(p30g);
      pruef(!zg.some(function (x) { return /^zone_fehlt_/.test(x.id); }),
        "eine als unbeheizter Bereich gelesene Garderobe darf keine "
          + "Zone-anlegen-Frage erzeugen. Zeilen: "
          + zg.map(function (x) { return x.id + "/" + x.stufe; }).join(", "));
      /* Der Vermerk ist eine GRENZE — er steht im Bericht, nicht in den
         Fragen; zaehler() filtert Grenzen mit Absicht heraus. */
      const ze = grenzen(p30g).filter(function (x) {
        return /^zone_einbauteil/.test(x.id); });
      pruef(ze.length === 2 && ze.every(function (x) {
        return x.art === "grenze" && x.stufe === "hinweis"; }),
        "beide Garderoben stehen als stiller Einbauteil-Vermerk, ist: "
          + ze.map(function (x) { return x.id + "/" + x.stufe; }).join(", "));
      /* GEGENPROBE: eine echte Garage bleibt scharf — die Lockerung gilt
         nur dem Einbau-Etikett. */
      const p30h = JSON.parse(JSON.stringify(p30g));
      p30h.plan.seiten[0].gegenprobe.unbeheizt_benannt = ["Garage"];
      const zh = zaehler(p30h);
      pruef(zh.some(function (x) {
        return /^zone_fehlt_/.test(x.id) && /Garage/.test(x.titel); }),
        "eine benannte Garage ohne Zone muss weiter auffallen");
      pruef(!zh.some(function (x) { return /^zone_einbauteil/.test(x.id); }),
        "eine Garage ist kein Einbauteil");
    }

    /* Eine nicht gezeichnete Ebene OHNE Bereichsnamen ist ein fehlender
       Grundriss und Sache von Z4, nicht von Z5. */
    const p30f = JSON.parse(JSON.stringify(p30c));
    p30f.plan.seiten[0].gegenprobe.ebenen[2].bezeichnung = "2. OBERGESCHOSS";
    pruef(!zaehler(p30f).some(function (x) { return /^zone_fehlt_/.test(x.id); }),
      "ein fehlendes Vollgeschoss darf nicht als unbeheizter Bereich gemeldet werden");
    /* Es muss als fehlendes Geschoss auffallen. Seit dem 24.08.2026 sperrt
       das nicht mehr, WENN das Werkzeug die Ebene benennen und ihre Fläche
       ableiten kann — dann steht statt der Sperre ein benanntes Angebot. Die
       Probe verlangt beides: dass die Zeile nicht grün wird UND dass sie das
       Geschoss beim Namen nennt. Ein blosses „nicht gruen" waere schwaecher
       als vorher. */
    const z30fg = finde(zaehler(p30f), "geschosse") || {};
    pruef(z30fg.stufe === "warnung" && z30fg.soll === 3,
      "es muss stattdessen als fehlendes Geschoss auffallen, ist: "
        + z30fg.stufe + " / soll " + z30fg.soll);
    pruef((z30fg.aktionen || []).some(function (a) {
      return a.aktion === "kbGeschossAnnehmen" && /2\.OG/.test(a.data.name); }),
      "und den Weg zur begründeten Annahme mitliefern, statt nur zu sperren");

    /* Gesehen, aber nicht beschriftet: die angebaute Garage ohne Wort. */
    const p30g = {
      raeume: [raum("r1", "EG", 20)], zonen: [],
      plangebaeude: { unbeheizte_bereiche: [] },
      plan: { bilder: [], seiten: [gpSeite({ gegenprobe: gpLesung({
        raeume_beschriftet: 1, unbeheizt_unbenannt: 1,
        ebenen: [{ bezeichnung: "GRUNDRISS ERDGESCHOSS",
                   gezeichnet: true }] }) })] },
    };
    const z30g = finde(zaehler(p30g), "zonen_unbenannt");
    pruef(z30g && z30g.stufe === "warnung",
      "eine gesehene, aber unbeschriftete Fläche muss eine Zeile erzeugen");
    pruef(!finde(zaehler(p30g), "zonen"),
      "neben einer unbeschrifteten Fläche darf kein grüner Haken stehen");
    const p31 = { raeume: [raum("r1", "EG", 20)], zonen: [], plan: { bilder: [] } };
    const z31 = finde(alleZ(p31), "zonen");
    pruef(z31 && z31.art === "grenze" && z31.stufe === "offen" && z31.abhilfe,
      "ohne jede Auswertung ist die Zahl der unbeheizten Bereiche eine Grenze");
    const p32 = JSON.parse(JSON.stringify(p30));
    p32.raeume.push(raum("r2", "EG", 18));
    p32.raeume[1].name = "Garage";
    const z32 = finde(zaehler(p32), "zonen_verdacht");
    pruef(z32 && z32.stufe === "warnung" && /Garage/.test(z32.text),
      "ein als beheizt geführter Nebenraum muss trotz leerer Liste auffallen");

    /* Z6 fensterlose Räume nach Raumart getrennt */
    const fensterlos = (name, art, gelesen) => {
      const r = raum("x_" + name, "EG", 12);
      r.name = name; r.art = art;
      if (gelesen !== undefined) r.fenster = gelesen;
      return r;
    };
    const p33 = { plan: { bilder: [] }, raeume: [
      fensterlos("OG FLUR", "flur"), fensterlos("KG KELLER", "wohnen"),
      fensterlos("GAST / ARBEITEN", "wohnen", 0),
      fensterlos("Wohnzimmer", "wohnen")] };
    const zn33 = zaehler(p33);
    /* Flur und Keller ohne Fenster sind der Regelfall und keine Warnung —
       aber eben auch keine bestandene Prüfung. Der Plan hat für sie nichts
       hergegeben; die Zeile ist eine benannte Annahme und gehört in den
       Bericht. Vorher stand sie als grüner Haken in der Liste und zählte im
       Kopf als bestandene Gegenprobe mit. */
    const zr = finde(grenzen(p33), "ohne_fenster_regel");
    pruef(zr && zr.stufe === "hinweis" && zr.ist === 2 && /ANNAHME/.test(zr.text)
      && !!zr.abhilfe,
      "eine Annahme über fensterlose Nebenräume ist eine Grenze, kein Haken, ist: "
        + (zr ? zr.stufe : "keine Zeile"));
    pruef(!finde(zn33, "ohne_fenster_regel"),
      "und sie darf nicht als Warnung in der Liste stehen");
    /* Ein am Plan gezaehltes Null-Fenster ist ein Ergebnis, aber keine
       bestandene Gegenprobe: der Sollwert waere dieselbe Lesung. Die Zeile
       gehoert deshalb in den Bericht und nicht in die Liste — und sie nennt
       die Fundstelle, die anderswo einen Fehler ausloest. */
    pruef(!finde(zn33, "ohne_fenster_gelesen"),
      "eine Selbstauskunft der Lesung darf nicht in der Liste stehen");
    const zg = finde(grenzen(p33), "ohne_fenster_gelesen");
    pruef(zg && zg.stufe === "hinweis" && zg.ist === 1 && zg.soll === null
      && /47 Abs\. 2/.test(zg.text) && !!zg.abhilfe,
      "sie ist eine Grenze mit Fundstelle und Abhilfe, ist: "
        + (zg ? zg.stufe + "/" + zg.soll : "keine Zeile"));
    /* EIN AUFENTHALTSRAUM OHNE FENSTER IST EIN FEHLER, KEINE WARNUNG.
       Bis zum 23.08.2026 stand hier „bleibt eine Warnung". Das war die
       Zeile, die als einzige jedes einzelne übersehene Fenster findet, und
       sie ging in der Liste der Warnungen unter — während daneben eine
       untere Schranke („Ansichten gegen die Gesamtzahl") grün stand.
       Entweder fehlt ein Fenster, oder die Raumart stimmt nicht; beides ist
       zu klären, bevor gerechnet wird. */
    const zu = finde(zn33, "ohne_fenster");
    pruef(zu && zu.stufe === "fehler" && zu.soll === 1 && /Wohnzimmer/.test(zu.text),
      "ein ungeprüfter Aufenthaltsraum ohne Fenster ist ein Fehler, ist: "
        + (zu ? zu.stufe : "keine Zeile"));
    pruef(zu && zu.aufhebbar === false,
      "und er ist nicht mit einem Klick abzuräumen: es steht die Bauordnung "
      + "dagegen, und welche der beiden Angaben stimmt, muss jemand sagen");
    pruef(zu && /47 Abs. 2/.test(String(zu.quelle_soll || "")),
      "die Fundstelle für die Fensterpflicht gehört an die Zeile");
    pruef(!zn33.some((z) => z.id === "ohne_fenster" && /Flur/.test(z.text)),
      "die Zeile darf ihren eigenen Befund nicht mehr im nächsten Satz zurücknehmen");

    /* --- Wie eine Grenze im Blatt aussieht -----------------------------
       Zwei Dinge muessen stimmen, und beide sind der Kern der Sache: kein
       Haken (es gibt nichts abzuhaken) und trotzdem das Eingabefeld (die
       fehlende Zahl HEBT die Grenze auf). Ohne diese Probe waere die
       Zeile entweder eine Zumutung oder eine Sackgasse. */
    const pGr = { raeume: [raum("r1", "EG", 20)], plan: { bilder: [] }, meta: {} };
    const zGr = finde(grenzen(pGr), "flaeche_EG");
    const hGr = zGr ? grenzeZeileHtml(zGr, pGr) : "";
    pruef(!!zGr, "Ohne Kontur muss eine Grenze zur Flaechensumme entstehen");
    pruef(hGr.indexOf("kbZurKenntnis") < 0,
      "Eine Grenze darf keinen Haken zum Abhaken tragen");
    pruef(hGr.indexOf('data-kb-pfad="zaehler.kontur_EG"') >= 0,
      "Eine Grenze mit Rueckfrage muss das Eingabefeld behalten");
    pruef(/Aufheben ließe sich das so/.test(hGr),
      "Der Weg aus der Grenze heraus muss in der Zeile stehen");
    /* Und der Beweis, dass das Feld wirkt: mit eingetragener Kontur ist die
       Zeile keine Grenze mehr, sondern eine Pruefung in der Liste. Die Kontur
       liegt dabei knapp ueber der Raumsumme, damit die Probe auch bestehen
       KANN -- bliebe eine Restflaeche von der Groesse eines ganzen Raumes,
       waere die Zeile zu Recht wieder offen. */
    const pGr2 = { raeume: [raum("r1", "EG", 70)], plan: { bilder: [] }, meta: {} };
    schreiben(pGr2, "zaehler.kontur_EG", "76", "am Plan abgegriffen");
    const zGr2 = finde(zaehler(pGr2), "flaeche_EG");
    pruef(!finde(grenzen(pGr2), "flaeche_EG") && !!zGr2 && zGr2.art === "pruefung"
      && zGr2.stufe === "gut",
      "Mit eingetragener Kontur wird aus der Grenze eine bestandene Pruefung");

    /* --- Z0 Bauteilbestand: Ursache vor Folge ------------------------- *
     * Nachgestellt ist hier nur das Projekt, nicht das Ergebnis: das Muster
     * stammt vom Blatt „BV 2-0887 Ziolkowski", wo dreizehn gelesene Räume auf
     * null Bauteile trafen. Der Beweis bleibt der Durchlauf im Browser. */
    const pOhneBauteil = {
      raeume: [raum("r1", "EG", 20, []), raum("r2", "EG", 15, [])],
      bauteiltypen: [], meta: {},
      meta_herkunft: { plandatum: { wert: "17.05.2022", blatt: "Blatt 1" } },
    };
    const z0 = finde(zaehler(pOhneBauteil), "bauteile_bestand");
    pruef(!!z0 && z0.stufe === "fehler",
      "kein einziges Bauteil im Projekt muss den Bericht aufhalten");
    pruef(!!z0 && /Baujahr/.test(z0.text),
      "die Zeile muss das fehlende Baujahr als Ursache benennen");
    pruef(!!z0 && /17\.05\.2022/.test(z0.text),
      "das Datum des Blattes muss genannt werden, ohne Baujahr zu werden");
    pruef(!!z0 && z0.aufhebbar === false,
      "eine fehlende Hülle darf sich nicht wegbestätigen lassen");
    const z0Huelle = finde(zaehler(pOhneBauteil), "ohne_huelle");
    pruef(!!z0Huelle && /Folge/.test(z0Huelle.text),
      "die Folgezeile muss sich als Folge zu erkennen geben");
    /* Und umgekehrt: sobald Bauteile da sind, verschwindet die Zeile als
       Ursache und der Folgevermerk mit ihr — nicht durch Lockern, sondern
       weil die Ursache weg ist. */
    /* Und mit Bauteilen: KEINE Zeile mehr. Eine Zahl ohne Sollzahl ist keine
       Gegenprobe, und sie darf die Kachel „Gegenproben n von n bestanden"
       nicht füllen. Was hier geprüft gehört, prüfen „Räume ohne Außenwand"
       und „Abschluss nach oben/unten" gegen eine benannte zweite Quelle. */
    pruef(!finde(zaehler(p1), "bauteile_bestand")
      && !finde(grenzen(p1), "bauteile_bestand"),
      "mit Bauteilen darf die Bestandszeile keinen Haken mehr setzen");
    pruef(folgeVermerk(p1) === "",
      "mit Bauteilen darf keine Zeile mehr als Folge markiert sein");

    /* EINE URSACHE, EINE ROTE ZEILE — und die Gegenrichtung dazu.
       Am 22.08.2026 stand im Kopf „6 Fehler" fuer eine einzige fehlende
       Angabe. Gesperrt bleibt es trotzdem: ueber die Ursachenzeile. */
    const rotOhne = zaehler(pOhneBauteil).filter(function (z) {
      return z.stufe === "fehler"; });
    pruef(rotOhne.length === 1 && rotOhne[0].id === "bauteile_bestand",
      "Ohne ein einziges Bauteil darf genau EINE Zeile rot sein — die "
        + "Ursache. Rot sind: " + rotOhne.map(function (z) { return z.id; }).join(", "));
    pruef(!!z0Huelle && z0Huelle.stufe === "hinweis",
      "Die Folgezeile bleibt sichtbar, zaehlt aber nicht als eigener Fehler");
    pruef(sperren(pOhneBauteil, {}).length === 1,
      "Der Bericht muss trotzdem gesperrt bleiben, ueber die Ursachenzeile");
    pruef(!!z0 && /Räume ohne Außenwand/.test(z0.text),
      "Die Ursachenzeile muss ihre Folgen beim Namen nennen");
    /* Und die Gegenprobe: mit Bauteilen im Projekt ist eine fehlende
       Aussenwand wieder ein eigener Fehler. Sonst waere das Aufweichen. */
    const pMitBauteil = {
      bauteiltypen: [{ id: "t1", name: "Außenwand", U: 0.3 }],
      meta: { baujahr: "1995" },
      raeume: [
        { id: "r1", geschoss: "EG", name: "WOHNEN", art: "wohnen", we: "WE 1",
          A: 20, h: 2.5, bauteile: [{ typ_id: "t1", name: "Außenwand", A: 12,
            grenzt_an: { typ: "aussen" } }] },
        { id: "r2", geschoss: "EG", name: "KOCHEN", art: "kueche", we: "WE 1",
          A: 12, h: 2.5, bauteile: [] }],
    };
    const zMit = finde(zaehler(pMitBauteil), "ohne_huelle");
    pruef(!!zMit && zMit.stufe === "fehler",
      "Mit Bauteilen im Projekt ist ein Raum ohne Aussenwand wieder ein "
        + "eigener Fehler, ist: " + (zMit ? zMit.stufe : "keine Zeile"));

    /* --- Reihenfolge und Leerfall ------------------------------------- */
    const sortiert = zaehler(p1);
    pruef(sortiert.every(function (z, i) {
      return i === 0 || RANG[sortiert[i - 1].stufe] <= RANG[z.stufe];
    }), "rote Zeilen müssen zuerst stehen");
    const leer = zaehler({ raeume: [] });
    pruef(leer.length === 1 && leer[0].id === "leer",
      "ein leeres Projekt darf nicht wie ein geprüftes aussehen");

    /* --- Zurückschreiben ---------------------------------------------- */
    const p13 = { raeume: [raum("r1", "EG", 20)], bauteiltypen: [], meta: {} };
    const s1 = schreiben(p13, "raum.r1.A", "12,50", "Aufmaß vor Ort 12.08.2026");
    pruef(s1.ok && p13.raeume[0].A === 12.5, "Komma-Zahl muss als Zahl ankommen");
    pruef(s1.klasse === "A", "Überschreibung mit Quelle muss belegt sein");
    const s2 = schreiben(p13, "raum.r1.h", "2,60", "");
    pruef(s2.ok && s2.klasse === "C", "Überschreibung ohne Quelle bleibt Annahme");
    pruef(!schreiben(p13, "raum.gibtsnicht.A", "5", "x").ok,
      "ein unbekannter Pfad darf nicht still schreiben");
    const s3 = schreiben(p13, "zaehler.raeume_EG", "7", null);
    pruef(s3.ok && p13.kontrollblatt.zaehler.raeume_EG === 7,
      "eine abgezählte Sollzahl muss im Kontrollblatt landen");
    pruef(bestaetigen(p13, "raum.r1", null).klasse === null,
      "durchgegangen ohne Quelle darf keine Klasse vergeben");
    pruef(bestaetigen(p13, "raum.r1", "Wohnflächenberechnung 2020").klasse === "A",
      "durchgegangen mit Quelle ist belegt");
    pruef(!sperreAufheben(p13, "geschosse", "kurz").ok,
      "eine Begründung unter zehn Zeichen darf keine Sperre aufheben");

    /* --- Sperren ------------------------------------------------------- */
    pruef(sperren(p1, {}).length >= 1, "ein fehlender Raum muss den Bericht sperren");
    /* Der Maßstab sperrt genau dann, wenn eine Fläche an ihm hängt.
       Umfahren (plan_kanten) heißt: sie hängt daran. Angeschrieben oder
       eingetragen heißt: sie hängt nicht daran, und dann darf die Zeile
       zwar mahnen, aber nicht sperren. */
    const rUmfahren = raum("r1", "EG", 20);
    rUmfahren.plan_kanten = [{ i: 0, laenge: 4 }, { i: 1, laenge: 5 }];
    rUmfahren.plan_umfang = 18;
    pruef(sperren({ raeume: [rUmfahren], plan: { bilder: [] } },
      { massstab_guete: "nicht belastbar" }).some((z) => z.id === "massstab"),
      "bei umfahrener Fläche muss ein nicht belastbarer Maßstab sperren");
    const oM = { massstab_guete: "nicht belastbar" };
    const pM = { raeume: [raum("r1", "EG", 20)], plan: { bilder: [] } };
    pruef(!sperren(pM, oM).some((z) => z.id === "massstab"),
      "ohne umfahrene Fläche darf der Maßstab den Bericht nicht sperren");
    pruef(zaehler(pM, oM).some(function (z) {
      return z.id === "massstab" && z.stufe === "warnung";
    }), "die Maßstabszeile muss trotzdem im Blatt stehen, als Warnung");
    const p14 = JSON.parse(JSON.stringify(p1));
    p14.kontrollblatt = { aufgehoben: { raeume_EG: "Der fünfte Raum ist der Abstellraum "
      + "außerhalb der beheizten Hülle, am Objekt geprüft." } };
    pruef(!sperren(p14, {}).some((z) => z.id === "raeume_EG"),
      "eine mit Begründung aufgehobene Sperre darf den Bericht nicht mehr halten");

    /* --- Sebastians Fall, von vorne bis hinten -----------------------
       Ein Projekt mit „OG FLUR" ohne Huellbauteil und mehreren offenen
       Fragen. Genau der Fall, in dem oben „Nicht belastbar · 1 Fehler"
       stand, obwohl die Zeile bestaetigt war. */
    const K = kern();
    pruef(!!K, "Der Pruefkern muss geladen sein");
    if (K) {
      /* Aussenwand UND Fenster. Das Fenster ist neu: seit dem 23.08.2026 ist
         ein Aufenthaltsraum mit Aussenwand und ohne Fenster ein Fehler
         (Musterbauordnung § 47 Abs. 2). Diese Probe prueft den Weg einer
         roten Zeile durch Kopf, Sammelknopf, Bestaetigung und Widerruf; sie
         soll nicht nebenbei an einer zweiten roten Zeile haengenbleiben. */
      const wand = [{ name: "Außenwand", A: 12, kat: "huelle",
                      grenzt_an: { typ: "aussen" } },
                    { name: "Fenster", A: 2, kat: "huelle", anzahl: 1,
                      grenzt_an: { typ: "aussen" } }];
      const p30 = {
        meta: { bezeichnung: "Sebastians Fall", baujahr: 1936,
                bearbeiter: "Sebastian Hund" },
        klima: { theta_e: -10, quelle: "DIN/TS 12831-1" },
        bauteiltypen: [{ id: "t1", name: "Wand", U: 1.0, belegt: true }],
        raeume: [
          { id: "r1", geschoss: "EG", name: "GAST", we: "WE 1", A: 20, h: 2.5,
            bauteile: wand },
          /* Der rote Ankerbefund dieses Durchlaufs. Bis hierher war das ein
             „OG FLUR" ohne Bauteile — der ist seit der Trennung von
             Aussenwand und Geschossabschluss RICHTIGERWEISE kein Fehler mehr
             (siehe den Vermerk bei pOben weiter oben). Damit dieser Durchlauf
             weiter das prueft, was er pruefen soll — den Weg einer roten
             Zeile durch Kopf, Sammelknopf, Bestaetigung und Widerruf —,
             steht hier jetzt ein Raum, der wirklich falsch ist: ein
             Aufenthaltsraum ohne jede Aussenwand. */
          { id: "r2", geschoss: "OG", name: "KIND", art: "schlafen", we: "WE 1",
            A: 6, h: 2.5, bauteile: [] },
          { id: "r3", geschoss: "OG", name: "BAD", we: "WE 1", A: 8, h: 2.5,
            bauteile: wand }],
        plan: { bilder: [] },
      };
      const raumE = (id, n, A) => ({ id: id, raum: n, A: A, h: 2.5, spez: 115,
        bauteile: [{ kat: "huelle", A: 12, phi: 900, annahme: false }] });
      const e30 = { A_gesamt: 34, phi_gebaeude: 3910, spez_wohnflaeche: 115,
        raeume: [raumE("r1", "GAST", 20), raumE("r2", "KIND", 6),
                 raumE("r3", "BAD", 8)], warnungen: [] };
      const opt30 = { kontrollblatt: { zaehler: zaehler } };

      const zn30 = zaehler(p30);
      const oh = finde(zn30, "ohne_huelle");
      pruef(oh && oh.stufe === "fehler" && /KIND/.test(oh.text),
        "Ein Aufenthaltsraum ohne Aussenwand muss als Fehler mit Namen erscheinen");

      const v30 = K.pruefeAlles(p30, e30, opt30);
      pruef(!v30.belastbar && v30.ampel === "rot",
        "Vor der Bestaetigung muss der Kopf rot und nicht belastbar sein");
      pruef(v30.pruefungen.some((x) => x.id === "kb_ohne_huelle"),
        "Die Zeile des Kontrollblatts muss im Kopf ankommen");
      pruef(v30.bestaetigung.bestaetigt === 0 && v30.bestaetigung.gesamt > 1,
        "Der Zaehler muss zu Beginn „0 von n“ zeigen");

      /* Ein Klick, ohne getippte Begruendung. */
      const offen30 = offeneBefunde(zn30, v30);
      pruef(offen30.length === v30.bestaetigung.offen,
        "Die Liste des Sammelknopfs und der Zaehler im Kopf muessen dieselbe "
        + "Menge meinen: " + offen30.length + " gegen " + v30.bestaetigung.offen);
      pruef(offen30.some((b) => b.id === "ohne_huelle"),
        "Die Huellenzeile muss in der Liste des Sammelknopfs stehen");
      /* EIN WIDERSPRUCH BRAUCHT DEN GESCHRIEBENEN GRUND.
         „1 Raum ohne Aussenwand, zulaessig sind 0, Quelle: Raumart und
         Raumname" stellt zwei Aussagen gegeneinander. Seit dem 23.08.2026
         entscheidet die ZEILE, ob ein Klick genuegt — nicht die aufrufende
         Stelle. Der Klick allein muss hier scheitern. */
      pruef(!zurKenntnis(p30, "ohne_huelle", "").ok,
        "Ein Widerspruch darf sich nicht mit einem blossen Klick abraeumen lassen");
      const eins = zurKenntnis(p30, "ohne_huelle",
        "Innen liegender Flur, am Grundriss geprüft.");
      pruef(eins.ok, "Mit geschriebenem Grund muss die Bestaetigung durchgehen");
      const abl = p30.kontrollblatt.aufgehoben.ohne_huelle;
      pruef(abl && abl.zeit && abl.wer === "Sebastian Hund",
        "Die Bestaetigung muss Zeitpunkt und den Unterzeichner tragen");
      pruef(!K.pruefeAlles(p30, e30, opt30).pruefungen
        .some((x) => x.id === "kb_ohne_huelle" && x.stufe === "fehler"),
        "Die bestaetigte Zeile darf nicht mehr als Fehler zaehlen");

      /* Der Sammelknopf: dieselbe Menge, die er beschriftet. */
      const rest = offeneBefunde(zaehler(p30), K.pruefeAlles(p30, e30, opt30));
      rest.filter((b) => b.aufhebbar)
        .forEach(function (b) { zurKenntnis(p30, b.id, ""); });
      /* Was der Sammelknopf bewusst auslaesst, wird hier einzeln und mit
         geschriebenem Grund bestaetigt — genau der Weg, den die Oberflaeche
         ueber „nur mit schriftlicher Begruendung" anbietet. */
      rest.filter((b) => !b.aufhebbar).forEach(function (b) {
        pruef(!zurKenntnis(p30, b.id, "").ok,
          "„" + b.titel + "“ darf sich nicht mit einem blossen Klick abraeumen lassen");
        pruef(sperreAufheben(p30, b.id,
          "Am Plan geprüft, Fundstelle im Vermerk.").ok,
          "„" + b.titel + "“ muss sich mit geschriebenem Grund bestaetigen lassen");
      });
      const nach = K.pruefeAlles(p30, e30, opt30);
      pruef(nach.belastbar && nach.ampel === "gruen",
        "Alles zur Kenntnis genommen muss belastbar und gruen sein, ist "
        + nach.ampel + ": " + nach.pruefungen.filter((x) => x.stufe !== "gut"
          && x.stufe !== "bestaetigt").map((x) => x.titel).join(", "));
      pruef(nach.bestaetigung.offen === 0
        && nach.bestaetigung.bestaetigt === nach.bestaetigung.gesamt,
        "Der Zaehler „x von y“ muss danach aufgehen");
      pruef(!zaehler(p30).some((z) => z.stufe !== "gut" && !z.bestaetigt),
        "„nur Offene zeigen“ darf danach keine Zeile mehr uebriglassen");
      pruef(!sperren(p30, {}).length, "Nach der Bestaetigung darf nichts mehr sperren");

      /* Die Bemerkung ist ein Zusatz und datiert die Bestaetigung nicht um. */
      /* Zeitpunkt kuenstlich altern lassen, sonst faellt ein Umdatieren in
         derselben Minute nicht auf. */
      p30.kontrollblatt.aufgehoben.ohne_huelle.zeit = "2026-08-20 09:15";
      pruef(bemerkungSchreiben(p30, "ohne_huelle", "Ist ein Flur.").ok,
        "Eine Bemerkung muss sich nachtragen lassen");
      const nachB = p30.kontrollblatt.aufgehoben.ohne_huelle;
      pruef(nachB.grund === "Ist ein Flur." && nachB.zeit === "2026-08-20 09:15"
        && nachB.wer === "Sebastian Hund",
        "Die Bemerkung darf Zeitpunkt und Namen nicht ueberschreiben");
      pruef(!bemerkungSchreiben(p30, "gibtsnicht", "x").ok,
        "Zu einer nicht bestaetigten Zeile gibt es keine Bemerkung");

      /* Widerruf: eine Bestaetigung ist kein Einbahnweg. */
      zurKenntnisZurueck(p30, "ohne_huelle");
      pruef(!K.pruefeAlles(p30, e30, opt30).belastbar,
        "Zurueckgenommen muss die Zeile wieder sperren");
    }

    /* --- Der Schalter „nur Offene zeigen" ---------------------------- */
    pruef(befundOffen({ stufe: "fehler" }) && befundOffen({ stufe: "offen" }),
      "Eine unbeantwortete Zeile ist offen");
    pruef(!befundOffen({ stufe: "gut" })
      && !befundOffen({ stufe: "bestaetigt", bestaetigt: { zeit: "x" } }),
      "Bestandenes und Bestaetigtes ist nicht mehr offen");
    pruef(raumOffen({ gesehen: false, maengel: [] })
      && raumOffen({ gesehen: true, maengel: ["Fläche fehlt"] })
      && !raumOffen({ gesehen: true, maengel: [] }),
      "Ein Raum ist offen, solange er nicht durchgegangen ist oder einen Mangel hat");
    pruef(wertOffen({ wert: "", klasse: "A", gesehen: true })
      && wertOffen({ wert: 12, klasse: "C", gesehen: true })
      && wertOffen({ wert: 12, klasse: "A", gesehen: false })
      && !wertOffen({ wert: 12, klasse: "A", gesehen: true }),
      "Ein Wert ist offen, solange er leer, Annahme oder nicht durchgegangen ist");
    /* Und der Schalter muss in der Ausgabe ankommen, nicht nur im Prädikat. */
    const p41 = { meta: { baujahr: 1936, wohnflaeche: 120 }, klima: { theta_e: -10 },
                  luftdichtheit: {}, norm: {}, raeume: [], plan: { bilder: [] } };
    const zeilenZahl = (h) => (h.match(/<tr class=/g) || []).length;
    const merk = S.nurOffen;
    S.nurOffen = false;
    const alleW = zeilenZahl(werteTabelle(p41, {}));
    S.nurOffen = true;
    const offeneW = zeilenZahl(werteTabelle(p41, {}));
    werte(p41, {}).forEach(function (w) { bestaetigen(p41, w.pfad, "Aufmaß 12.08.2026"); });
    const nachW = zeilenZahl(werteTabelle(p41, {}));
    S.nurOffen = merk;
    pruef(alleW > 0 && offeneW === alleW,
      "Solange nichts durchgegangen ist, blendet der Schalter nichts aus");
    pruef(nachW < offeneW,
      "Durchgegangene und belegte Werte muss der Schalter ausblenden, "
      + offeneW + " gegen " + nachW);

    /* Zahlform der Einheit hinter dem Zaehler. Gefunden am eigenen Blatt:
       "Aufenthaltsräume ohne Fenster  1 Räume". */
    pruef(einheitZu(1, "Räume") === "Raum", "1 Räume muss 1 Raum heissen");
    pruef(einheitZu(2, "Räume") === "Räume", "2 Räume bleibt 2 Räume");
    pruef(einheitZu(0, "Räume") === "Räume", "0 Räume bleibt 0 Räume");
    pruef(einheitZu(1, "Blätter") === "Blatt", "1 Blätter muss 1 Blatt heissen");
    pruef(einheitZu(1, "Bereiche") === "Bereich", "1 Bereiche muss 1 Bereich heissen");
    pruef(einheitZu(1, "Ebenen") === "Ebene", "1 Ebenen muss 1 Ebene heissen");
    pruef(einheitZu(1, "Fenster") === "Fenster", "Fenster bleibt Fenster");
    /* Satzzeichen der Zeilentexte. */
    pruef(satzform("Es fehlen 8 Räume. im Kontrollblatt gezählt, im Raumbuch 12.")
      === "Es fehlen 8 Räume. Im Kontrollblatt gezählt, im Raumbuch 12.",
      "nach einem Satzpunkt wird gross weitergeschrieben");
    pruef(satzform("… nahe der Straße an.. Im Kontrollblatt steht 1.")
      === "… nahe der Straße an. Im Kontrollblatt steht 1.",
      "zwei Satzpunkte werden zu einem");
    pruef(satzform("Nimm z. B. den Flur.") === "Nimm z. B. den Flur.",
      "Abkuerzungen wie z. B. bleiben unangetastet");
    /* Nach einem EINZELNEN Buchstaben wird NICHT grossgeschrieben: dort
       stehen die Abkuerzungen "u. a.", "d. h.", "z. B." — und ein Eingriff
       dort machte aus "u. a." ein "u. A.". Lieber eine Kleinschreibung zu
       wenig gerichtet als eine Abkuerzung verdorben. */
    pruef(satzform("Gilt fuer Flur u. a. raeume.") === "Gilt fuer Flur u. a. raeume.",
      "nach einem einzelnen Buchstaben bleibt alles, wie es ist");
    pruef(satzform("Gemessen 3,55 m.. Zulaessig sind 3,00 m.")
      === "Gemessen 3,55 m. Zulaessig sind 3,00 m.",
      "doppelter Punkt hinter einer Zahl faellt weg");
    /* Stueckzahlen ohne Nachkommastellen — der Knopftext der Rueckfrage. */
    pruef(mengeText(17, "Fenster") === "17 Fenster",
      "17,00 Fenster muss 17 Fenster heissen");
    pruef(mengeText(1, "Bereich") === "1 Bereich",
      "1,00 Bereich muss 1 Bereich heissen");
    pruef(mengeText(0, "Räume") === "0 Räume",
      "0,00 Räume muss 0 Räume heissen");
    pruef(mengeText(2, "Ebenen") === "2 Ebenen",
      "2,00 Ebenen muss 2 Ebenen heissen");
    pruef(mengeText(1, "Räume") === "1 Raum",
      "1 Räume muss 1 Raum heissen");
    pruef(mengeText(38.6, "m") === "38,60 m",
      "eine Masseinheit behaelt ihre zwei Stellen");
    pruef(mengeText(74.83, "m²") === "74,83 m²",
      "Quadratmeter bleiben zweistellig");
    pruef(einheitZu(1, "m²") === "m²", "Eine Einheit wird nicht gebeugt");
    /* Dass JEDE im Modul vergebene Einheit eine Einzahl kennt, prueft der Bau
       am Quelltext (build.py, Schritt 3c) -- von hier aus ist er nicht
       lesbar. */
    pruef(/1 Raum/.test(zaehlerZeileHtml(
      { id: "x", titel: "T", ist: 1, soll: null, einheit: "Räume", stufe: "warnung",
        text: "t" }, { raeume: [] }, null)),
      "Die gezeichnete Zeile muss die Einzahl tragen");
    /* Und die Aufzaehlung dahinter ebenso. */
    pruef(/ein weiterer/.test(nenne([{ name: "A" }, { name: "B" }, { name: "C" },
      { name: "D" }, { name: "E" }])),
      "Ein einzelner Rest heisst 'ein weiterer', nicht '1 weitere'");

    /* Gleichnamige Raeume muessen unterscheidbar sein. Dumach 1 hat drei
       Raeume "Flur" im Erdgeschoss; dreimal "eg Flur" liest sich wie eine
       dreifach ausgegebene Meldung. */
    const drei = nenne([{ geschoss: "eg", name: "Flur", A: 6.86 },
                        { geschoss: "eg", name: "Flur", A: 6.7 },
                        { geschoss: "eg", name: "Flur", A: 5.94 }]);
    pruef(/6,86/.test(drei) && /6,70/.test(drei) && /5,94/.test(drei),
      "Gleichnamige Raeume werden ueber die Flaeche unterscheidbar: " + drei);
    pruef(!/\(/.test(nenne([{ geschoss: "eg", name: "Bad", A: 9.39 },
                            { geschoss: "og", name: "Bad", A: 9.28 }])),
      "Verschiedene Raeume brauchen keinen Zusatz");

    /* Angenommene Fensterflaechen: eine GRENZE, mit Flaeche und Fundstelle.
       Sie stand einmal als Warnung in der Liste. Das ist falsch eingeordnet:
       es gibt nichts abzuarbeiten. Der Plan sagt nichts, das Werkzeug hat
       einen benannten Ersatzwert gesetzt, und nur ein Blick in den Plan
       kann daran etwas aendern. Die Zeile ist damit nicht weg, sondern
       steht im Bericht -- geprueft wird beides. */
    const pFen = { meta: {}, klima: {}, luftdichtheit: {}, norm: {},
      bauteiltypen: [{ id: "t1", name: "Fenster", U: 1.3 },
                     { id: "t2", name: "Außenwand", U: 0.3 }],
      zonen: [], einheiten: [{ name: "WE 1" }], plan: { bilder: [] },
      raeume: [{ name: "Wohnen", art: "wohnen", A: 24, h: 2.5, we: "WE 1",
                 geschoss: "eg",
                 herkunft: { quelle: "Flächenstempel im Plan", fenster_angenommen: true },
                 bauteile: [{ typ_id: "t2", name: "Außenwand", A: 9,
                              grenzt_an: { typ: "aussen" } },
                            { typ_id: "t1", name: "Fenster", A: 4,
                              grenzt_an: { typ: "aussen" } }] }] };
    const zeileFen = finde(grenzen(pFen, {}), "fenster_angenommen");
    pruef(!!zeileFen && zeileFen.art === "grenze" && !!zeileFen.abhilfe,
      "Eine angenommene Fensterflaeche gehoert als Grenze in den Bericht");
    pruef(!finde(zaehler(pFen, {}), "fenster_angenommen"),
      "und damit nicht mehr in die Liste zum Abarbeiten");
    pruef(!!zeileFen && /4,00 m²/.test(zeileFen.text) && /§ 47 Abs. 2/.test(zeileFen.text),
      "Die Zeile nennt Flaeche und Fundstelle: " + (zeileFen && zeileFen.text));
    pFen.raeume[0].herkunft.fenster_angenommen = false;
    pruef(!zaehler(pFen, {}).some(function (x) { return x.id === "fenster_angenommen"; }),
      "Ohne Annahme entsteht die Zeile nicht");

    /* Raum ohne Huellbauteil: Fehler, ausser beim innenliegenden Nebenraum
       auf einem Zwischengeschoss. Gemessen an Dumach 1: zwei Flure im OG. */
    const pInnen = { meta: {}, klima: {}, luftdichtheit: {}, norm: {},
      bauteiltypen: [{ id: "t2", name: "Außenwand", U: 0.3 }],
      zonen: [], einheiten: [{ name: "WE 1" }], plan: { bilder: [] },
      raeume: [
        { name: "Flur", art: "flur", geschoss: "og", A: 6.86, h: 2.5, we: "WE 1",
          bauteile: [] },
        { name: "Wohnen", art: "wohnen", geschoss: "og", A: 20, h: 2.5, we: "WE 1",
          bauteile: [] },
        { name: "Bad", art: "bad", geschoss: "eg", A: 8, h: 2.5, we: "WE 1",
          bauteile: [{ typ_id: "t2", name: "Außenwand", A: 5,
                       grenzt_an: { typ: "aussen" } }] },
        { name: "Studio", art: "wohnen", geschoss: "dg", A: 30, h: 2.5, we: "WE 1",
          bauteile: [{ typ_id: "t2", name: "Außenwand", A: 5,
                       grenzt_an: { typ: "aussen" } }] }] };
    const zInnen = zaehler(pInnen, {});
    const zHuelle = zInnen.find(function (x) { return x.id === "ohne_huelle"; });
    pruef(!!zHuelle && zHuelle.stufe === "fehler" && /Wohnen/.test(zHuelle.text)
      && !/Flur/.test(zHuelle.text),
      "Nur der Wohnraum ohne Aussenwand ist ein Fehler: " + (zHuelle && zHuelle.text));
    /* UND JETZT DER FALL, UM DEN ES GEHT.
       Derselbe Flur auf dem OBERSTEN Geschoss war bis hierher ein Fehler:
       „dort liegt eine Flaeche nach oben und muss erfasst sein". Der Satz
       stimmt fuer das Geschoss und nicht fuer den Raum -- eine Decke ist
       keine Aussenwand. Gemessen am Blatt BV 2-0887 Ziolkowski: „OG FLUR"
       liegt in der Mitte des Obergeschosses, hat richtigerweise keine
       Aussenwand und stand trotzdem rot.
       Die Frage nach der Decke ist nicht verloren, sie steht jetzt im
       Zaehler „Abschluss nach oben" -- und zwar fuer ALLE Raeume des
       Randgeschosses, auch fuer die mit Aussenwand. Vorher fielen die
       durch, weil ihre Aussenwand sie als „hat Huellbauteil" durchgehen
       liess. */
    const pOben = JSON.parse(JSON.stringify(pInnen));
    pOben.raeume = [pOben.raeume[0], pOben.raeume[2]];   // Flur im OG, Bad im EG
    const zOben = zaehler(pOben, {});
    pruef((finde(zOben, "ohne_huelle") || {}).stufe === "gut",
      "Ein innenliegender Flur im obersten Geschoss ist kein Fehler mehr");
    /* GENANNT WIRD ER WEITERHIN — aber in der Zeile, die zu ihm passt.
       Der Plan sagt fuer diesen Flur nichts ueber Aussenwaende; dass er
       innen liegt, folgt allein aus seinem Namen. Das ist eine Erfahrung
       und kein Beleg, also traegt es keinen gruenen Haken, sondern die
       Grenze "Innenliegend nach Raumname". Gemessen am EG WC des Blattes
       BV 2-0887 Ziolkowski: es kam einmal mit null Aussenwaenden zurueck,
       einmal mit einer, und liegt im Grundriss an der Nordfassade. */
    pruef(!/Flur/.test((finde(zOben, "ohne_huelle") || {}).text || ""),
      "Ohne gelesene Zahl darf der gruene Haken den Flur nicht nennen");
    const zName = finde(grenzen(pOben, {}), "innen_aus_name");
    pruef(!!zName && zName.art === "grenze" && /Flur/.test(zName.text || ""),
      "Der Flur steht als Grenze da, mit Namen und Begruendung: "
      + (zName && zName.text));
    pruef(!!zName && !!zName.abhilfe,
      "Die Grenze sagt, wie sie aufzuheben ist: eine Zahl in die Raumzeile");
    /* Und mit einer im Plan GELESENEN Null ist es eine Ablesung. Dann steht
       der Flur wieder in der gruenen Zeile, und die nennt die Quelle. */
    const pGelesen = JSON.parse(JSON.stringify(pOben));
    pGelesen.raeume[0].aussenwaende = 0;
    const zG = finde(zaehler(pGelesen, {}), "ohne_huelle");
    pruef(!!zG && zG.stufe === "gut" && /Flur/.test(zG.text || "")
      && /null Aussenwaende|null Außenwände/.test(zG.text || ""),
      "Eine gelesene Null ist eine Ablesung und traegt den Haken: "
      + (zG && zG.text));
    pruef(!finde(grenzen(pGelesen, {}), "innen_aus_name"),
      "Ist die Zahl gelesen, entsteht keine Grenze aus dem Raumnamen");
    /* Derselbe Flur MIT einem Nachbarn, der die Decke hat: dann ist das
       Fehlen ein Widerspruch innerhalb eines Geschosses und ein Fehler. */
    const pDecke = JSON.parse(JSON.stringify(pOben));
    pDecke.raeume.push({ name: "Kind", art: "schlafen", geschoss: "og", A: 14,
      h: 2.5, we: "WE 1", bauteile: [
        { typ_id: "t2", name: "Außenwand", A: 8, grenzt_an: { typ: "aussen" } },
        { typ_id: "t2", name: "Dach", A: 14, grenzt_an: { typ: "zone", ref: "dachraum" } }] });
    const zD = finde(zaehler(pDecke, {}), "abschluss_oben");
    pruef(!!zD && zD.stufe === "fehler" && /Flur/.test(zD.text),
      "Fehlt dem Flur die Decke, waehrend der Nachbar eine hat, ist das ein Fehler");
    /* Hat KEIN Raum des Randgeschosses eine Decke, kann das auch eine
       Wohnung im Geschossstapel sein. Dann ist es eine Grenze, kein Befund --
       eine Behauptung waere hier nicht zu halten. */
    const zK = finde(grenzen(pOben, {}), "abschluss_oben");
    pruef(!!zK && /Wohnung im Geschossstapel/.test(zK.text) && !!zK.abhilfe,
      "Hat kein Raum des Randgeschosses eine Decke, steht das als Grenze da");

    /* --- EINE KELLERWAND IST KEIN BODEN -------------------------------
       GEMESSEN am 23.08.2026 im Browser, echter Durchlauf „BV 2-0887
       Ziolkowski": beiden Kellerraeumen wurde die Bodenplatte weggenommen,
       und „Abschluss nach unten" meldete weiter, zwei Raeume haetten eine.
       Grund war, dass jedes Bauteil gegen Erdreich als Flaeche nach unten
       zaehlte -- auch die senkrechte Kellerwand, seit sie gegen Erdreich
       rechnet. Der teuerste Weg, eine fehlende Sohle zu verdecken. */
    const pWand = { meta: {}, klima: {}, luftdichtheit: {}, bauteiltypen: [],
      zonen: [], einheiten: [{ name: "WE 1" }], plan: { bilder: [] },
      raeume: [
        { name: "KELLER", art: "keller", geschoss: "kg", A: 18, h: 2.3, we: "WE 1",
          aussenwaende: 2, bauteile: [{ typ_id: "t2", name: "Kellerwand gegen Erdreich",
            art: "aussenwand", A: 20, grenzt_an: { typ: "erdreich" } }] },
        { name: "LAGER", art: "keller", geschoss: "kg", A: 12, h: 2.3, we: "WE 1",
          aussenwaende: 1, bauteile: [
            { typ_id: "t2", name: "Kellerwand gegen Erdreich", art: "aussenwand",
              A: 10, grenzt_an: { typ: "erdreich" } },
            { typ_id: "t5", name: "Bodenplatte", art: "boden", A: 12,
              grenzt_an: { typ: "erdreich" } }] }] };
    const zW = finde(zaehler(pWand, {}), "abschluss_unten");
    pruef(!!zW && zW.stufe === "fehler" && zW.ist === 1 && zW.soll === 2
      && /KELLER/.test(zW.text || ""),
      "Die Kellerwand gegen Erdreich darf die fehlende Sohle nicht decken: "
      + (zW && zW.stufe + " " + zW.ist + "/" + zW.soll));
    /* Und die Gegenrichtung: mit Sohle bei beiden ist es eine bestandene
       Probe -- die Zeile muss auch gruen werden koennen. */
    const pSohle = JSON.parse(JSON.stringify(pWand));
    pSohle.raeume[0].bauteile.push({ typ_id: "t5", name: "Bodenplatte",
      art: "boden", A: 18, grenzt_an: { typ: "erdreich" } });
    const zS = finde(zaehler(pSohle, {}), "abschluss_unten");
    pruef(!!zS && zS.stufe === "gut" && zS.ist === 2 && zS.soll === 2,
      "Mit Sohle bei beiden ist die Probe bestanden");
    /* Und der Nenner sagt, wie viele Raeume er umfasst. Ein „n von n" ohne
       diese Angabe liest sich wie „alle Raeume des Projekts". */
    pruef(!!zS && /von 2 im Raumbuch/.test(zS.text || ""),
      "Die Zeile nennt den Umfang ihres Nenners: " + (zS && zS.text));

    /* --- Derselbe unbeheizte Bereich unter zwei Namen ----------------
     * Der Plan schreibt „SPITZBODEN", das Werkzeug fuehrt die Zone
     * „Unbeheizter Dachraum". Zwei Woerter ohne einen gemeinsamen
     * Buchstaben, ein Bauteil. Der Zeichenvergleich meldete dafuer einen
     * fehlenden Bereich und hielt jeden Bericht auf.
     * Die Gegenrichtung steht gleich daneben: eine GARAGE deckt der
     * Dachraum NICHT ab. Ohne diese zweite Probe waere die erste eine
     * Aufweichung statt einer Berichtigung. */
    {
      const basis = function (benannt, zonen) {
        return {
          raeume: [
            { name: "Wohnen", art: "wohnen", geschoss: "eg", A: 20, h: 2.5, we: "WE 1",
              bauteile: [{ typ_id: "t1", name: "Außenwand", A: 12,
                           grenzt_an: { typ: "aussen" } }] },
          ],
          zonen: zonen,
          plangebaeude: { unbeheizte_bereiche: benannt },
        };
      };
      const dach = [{ id: "dachraum", name: "Unbeheizter Dachraum",
                      modus: "lage", lage: "dach_geschlossen_undicht" }];
      const zSpitz = finde(alleZ(basis(["SPITZBODEN"], dach)), "zonen");
      pruef(!!zSpitz && zSpitz.stufe === "gut",
        "SPITZBODEN und Unbeheizter Dachraum sind derselbe Bereich");
      pruef(!!zSpitz && /SPITZBODEN/.test(zSpitz.text)
        && /Unbeheizter Dachraum/.test(zSpitz.text),
        "Die Zeile muss beide Namen nennen; sonst behauptet sie eine Deckung, "
          + "die niemand nachpruefen kann");
      const zGarage = alleZ(basis(["GARAGE"], dach))
        .filter(function (z) { return /^zone_fehlt/.test(z.id); });
      pruef(zGarage.length === 1 && zGarage[0].stufe === "fehler",
        "Eine Garage wird von einem Dachraum nicht gedeckt");
      const zBeides = alleZ(basis(["SPITZBODEN", "GARAGE"], dach))
        .filter(function (z) { return /^zone_fehlt/.test(z.id); });
      pruef(zBeides.length === 1 && /GARAGE/.test(zBeides[0].titel),
        "Von zwei benannten Bereichen fehlt genau der eine, den es nicht gibt");
      /* Und ein Bereich, der sich gar nicht einordnen laesst, bleibt beim
         Zeichenvergleich -- also weiterhin ein Befund. Die vorsichtige Seite. */
      const zFremd = alleZ(basis(["Nebenraum kalt"], dach))
        .filter(function (z) { return /^zone_fehlt/.test(z.id); });
      pruef(zFremd.length === 1,
        "Ein nicht einzuordnender Bereich bleibt ein Befund");
    }

    /* --- Gleiche Zahl, andere Namen ----------------------------------
     * Die Raumzahl stimmt, ein Name nicht. Der Name setzt die Raumart und
     * die Raumart die Raumtemperatur: „Baden" rechnet mit 24 Grad,
     * „Abstell" mit 15. Vorher stand die Zeile gruen da. */
    {
      const mitNamen = function (namen) {
        return {
          raeume: [
            { name: "SCHLAFEN", art: "schlafen", geschoss: "OG", A: 14, h: 2.5,
              we: "WE 1", bauteile: [{ typ_id: "t1", name: "Außenwand", A: 8,
                                       grenzt_an: { typ: "aussen" } }] },
            { name: namen, art: "bad", geschoss: "OG", A: 11, h: 2.5, we: "WE 1",
              bauteile: [{ typ_id: "t1", name: "Außenwand", A: 7,
                           grenzt_an: { typ: "aussen" } }] },
          ],
          plan: { seiten: [{ bezeichnung: "Blatt 1", uebernommen: true,
            gegenprobe: { blattart: "grundriss" },
            gegenprobeEbenen: [{ ebene: "OG", n: 2,
              namen: ["SCHLAFEN", "BADEN"], fenster: 0 }] }] },
        };
      };
      const gleich = finde(alleZ(mitNamen("BADEN")), "raeume_OG");
      pruef(!!gleich && gleich.stufe === "gut",
        "Zwei Lesungen mit denselben Namen sind ein Beleg");
      pruef(!!gleich && /dieselben Namen/.test(gleich.text),
        "Die gruene Zeile sagt, dass auch die Namen uebereinstimmen");
      const anders = finde(alleZ(mitNamen("ABSTELL")), "raeume_OG");
      pruef(!!anders && anders.stufe === "warnung",
        "Gleiche Zahl, anderer Name: das ist eine Warnung, keine gruene Zeile");
      pruef(!!anders && /ABSTELL/.test(anders.text) && /BADEN/.test(anders.text),
        "Die Warnung nennt beide Lesarten beim Namen");
      /* Schreibweise ist kein Unterschied: „Kind 1" und „KIND I" sind
         derselbe Raum. Sonst meldet die Zeile auf jedem Plan etwas. */
      const schreib = {
        raeume: [{ name: "Kind 1", art: "schlafen", geschoss: "OG", A: 14, h: 2.5,
          we: "WE 1", bauteile: [{ typ_id: "t1", name: "Außenwand", A: 8,
                                   grenzt_an: { typ: "aussen" } }] }],
        plan: { seiten: [{ bezeichnung: "Blatt 1", uebernommen: true,
          gegenprobe: { blattart: "grundriss" },
          gegenprobeEbenen: [{ ebene: "OG", n: 1, namen: ["KIND 1"], fenster: 0 }] }] },
      };
      const zS = finde(alleZ(schreib), "raeume_OG");
      pruef(!!zS && zS.stufe === "gut",
        "Gross- und Kleinschreibung ist kein Namensunterschied");
    }

    /* --- Fenster gegen die Ansicht -----------------------------------
     * Der Abgleich Fassade fuer Fassade braucht Fenster, die ihre Fassade
     * tragen. Ohne Zuordnung steht auf jeder Fassade eine Null, und die
     * Zeile meldete saemtliche Fenster der Ansicht als fehlend. Statt
     * dessen laeuft die schaerfste Aussage, die ohne Zuordnung zu halten
     * ist: eine Fassade traegt nie mehr Fenster als das ganze Gebaeude. */
    {
      const mitAnsicht = function (ansichtFenster, lage) {
        return {
          raeume: [{ name: "Wohnen", art: "wohnen", geschoss: "eg", A: 20, h: 2.5,
            we: "WE 1", bauteile: [
              { typ_id: "t1", name: "Außenwand", A: 12, grenzt_an: { typ: "aussen" } },
              { typ_id: "t2", name: "Fenster", A: 3, anzahl: 4, lage: lage,
                grenzt_an: { typ: "aussen" } }] }],
          ansichten: [{ fassade: "West", fenster: ansichtFenster, fassade_belegt: true, blatt: "Blatt 1" }],
        };
      };
      const ohneLage = alleZ(mitAnsicht(3, null));
      pruef(!finde(ohneLage, "fenster_west"),
        "Ohne zugeordnete Fassade darf kein Abgleich Fassade fuer Fassade laufen");
      /* KEIN GRUENER HAKEN AUF EINER UNTEREN SCHRANKE.
         Bis zum 23.08.2026 stand hier „das ist stimmig" und die Zeile
         zaehlte im Kopf als bestandene Gegenprobe mit. Sie vergleicht aber
         die eine ausgewertete Ansicht mit dem GANZEN Gebaeude: an
         „BV 2-0887 Ziolkowski" gemessen liessen sich fuenf von neun Fenstern
         loeschen, ohne dass sie die Farbe wechselte. Sie kann widerlegen,
         nicht bestaetigen — und steht deshalb als Grenze im Bericht. */
      const summe = finde(ohneLage, "fenster_ansichtsumme");
      pruef(!!summe && summe.stufe === "hinweis" && summe.art === "grenze",
        "Eine untere Schranke ist keine bestandene Gegenprobe, ist: "
          + (summe ? summe.stufe + "/" + summe.art : "keine Zeile"));
      pruef(!!summe && /untere Schranke/.test(summe.text),
        "und sie sagt selbst, dass sie nur widerlegen kann");
      pruef(!finde(zaehler(mitAnsicht(3, null)), "fenster_ansichtsumme"),
        "als Grenze gehoert sie in den Bericht und nicht in die Liste");
      const zuViel = finde(alleZ(mitAnsicht(9, null)), "fenster_ansichtsumme");
      pruef(!!zuViel && zuViel.stufe === "fehler",
        "Mehr Fenster auf einer Fassade als im ganzen Gebaeude ist ein Fehler");
      /* Sind die Fenster zugeordnet, laeuft der Abgleich wie bisher. */
      const mitLage = alleZ(mitAnsicht(4, "West"));
      const west = finde(mitLage, "fenster_west");
      pruef(!!west && west.stufe === "gut",
        "Mit zugeordneter Fassade laeuft der Abgleich und besteht");
      pruef(!finde(mitLage, "fenster_ansichtsumme"),
        "Dann steht die Summenzeile nicht zusaetzlich da: zweimal dasselbe "
          + "waere eine Zeile zu viel");
      const westFehlt = finde(alleZ(mitAnsicht(6, "West")), "fenster_west");
      pruef(!!westFehlt && westFehlt.stufe === "fehler",
        "Zeigt die Ansicht mehr Fenster als die zugeordnete Fassade, ist das ein "
          + "Fehler");
    }

    /* --- Ein Widerspruch ist nicht wegzuklicken ------------------------
     * Die Regel haengt nicht an einer Liste von Kennungen, sondern an der
     * Form der Zeile: eigene Zahl, zweite Zahl aus benannter Quelle, beide
     * gehen auseinander. Deshalb wird sie hier an der Form geprueft und
     * nicht an Beispielen — sonst faellt die naechste neue Zeile durch. */
    {
      const w1 = zeile({ id: "x1", titel: "T", art: "befund", stufe: "warnung",
        ist: 13, soll: 0, einheit: "Räume", quelle_soll: "die Unterlagen",
        text: "t" });
      pruef(w1.aufhebbar === false,
        "Zwei bezifferte Aussagen, die auseinandergehen, sind nicht wegzuklicken");
      const w2 = zeile({ id: "x2", titel: "T", art: "befund", stufe: "warnung",
        ist: 13, soll: 13, einheit: "Räume", quelle_soll: "die Unterlagen",
        text: "t" });
      pruef(w2.aufhebbar === true,
        "Zwei Zahlen, die uebereinstimmen, sind kein Widerspruch");
      const w3 = zeile({ id: "x3", titel: "T", art: "befund", stufe: "warnung",
        ist: 13, soll: 0, einheit: "Räume", text: "t" });
      pruef(w3.aufhebbar === true,
        "Ohne benannte Quelle fuer die zweite Zahl bleibt es beim Haken");
      const w4 = zeile({ id: "x4", titel: "T", art: "befund", stufe: "warnung",
        ist: 3, soll: null, einheit: "Räume", quelle_soll: "die Unterlagen",
        text: "t" });
      pruef(w4.aufhebbar === true,
        "Eine Zeile ohne Vergleichszahl ist kein Widerspruch");
      const w5 = zeile({ id: "x5", titel: "T", art: "pruefung", stufe: "gut",
        ist: 13, soll: 0, einheit: "Räume", quelle_soll: "die Unterlagen",
        text: "t" });
      pruef(w5.aufhebbar === true,
        "Eine bestandene Zeile wird von der Regel nicht angefasst");
    }

    /* --- Beheizt oder unbeheizt: die Entscheidung, nicht der Haken -----
     * Gemessen am 23.08.2026 an „BV 2-0887 Ziolkowski": diese Zeile war mit
     * einem Klick wegzunehmen, und die Ampel sprang dabei von Gelb auf
     * „belastbar unter genannten Annahmen" — waehrend die 39,19 m² weiter im
     * Nenner standen und die Kellerdecke weiter fehlte. */
    {
      const pW = {
        meta: {}, klima: {}, bauteiltypen: [{ id: "t1", name: "Wand", U: 1.0 }],
        zonen: [],
        raeume: [
          { id: "r1", geschoss: "KG", name: "KELLER", art: "keller", we: "WE 1",
            A: 18, h: 2.3, bauteile: [{ typ_id: "t1", name: "Außenwand", A: 10,
              grenzt_an: { typ: "aussen" } }] },
          { id: "r2", geschoss: "EG", name: "WOHNEN", art: "wohnen", we: "WE 1",
            A: 20, h: 2.5, bauteile: [{ typ_id: "t1", name: "Außenwand", A: 12,
              grenzt_an: { typ: "aussen" } }] }],
        plangebaeude: { unbeheizte_bereiche: ["KELLERGESCHOSS"] },
        plan: { seiten: [] },
      };
      const zw = alleZ(pW).find(function (x) {
        return /^zone_widerspruch_/.test(x.id); });
      if (!zw) {
        pruef(false, "Der Widerspruch beheizt/unbeheizt muss ueberhaupt entstehen");
      } else {
        pruef(zw.aufhebbar === false,
          "Beheizt oder unbeheizt ist nicht mit einem Haken zu beantworten");
        pruef(!!zw.begruendung_frage
          && /Eine der beiden Aussagen stimmt/.test(zw.begruendung_frage),
          "Die Zeile fragt, WELCHE der beiden Aussagen stimmt");
        pruef((zw.aktionen || []).some(function (a) {
          return a.aktion === "kbZoneAnlegen"; }),
          "Und sie bietet den anderen Weg an: den Bereich als unbeheizt anlegen");
        pruef(!/genügt ein Haken/.test(String(zw.abhilfe || "")),
          "Die Abhilfe darf nicht mehr auf einen Haken verweisen");
        /* Der Sammelknopf laesst sie aus, und der einzelne Klick auch. */
        pruef(!offeneBefunde(zaehler(pW), null)
          .filter(function (b) { return b.aufhebbar; })
          .some(function (b) { return b.id === zw.id; }),
          "Der Sammelknopf darf einen Widerspruch nicht mit abraeumen");
        pW.meta.bearbeiter = "Sebastian Hund";
        pruef(!zurKenntnis(pW, zw.id, "").ok,
          "Ein Klick ohne Grund darf den Widerspruch nicht wegnehmen");
        pruef(sperreAufheben(pW, zw.id,
          "Heizkreise im Kellergrundriss eingetragen, Blatt 1.").ok,
          "Mit geschriebener Fundstelle geht er weg");
      }
    }

    /* --- Eine geloeschte Zone bleibt geloescht ------------------------- */
    {
      const pZ = { meta: {}, klima: {}, zonen: [], raeume: [],
        zonen_entfernt: ["SPITZBODEN"] };
      pruef(zoneAnlegen(pZ, "SPITZBODEN", false) !== null,
        "Von Hand angelegt entsteht der Bereich wieder");
      pruef((pZ.zonen_entfernt || []).length === 0,
        "und seine Loeschung ist damit zurueckgenommen");
      /* Derselbe Bereich unter zwei Namen entsteht nicht zweimal ... */
      pruef(zoneAnlegen(pZ, "Unbeheizter Dachraum", false) === null,
        "„SPITZBODEN“ und „Unbeheizter Dachraum“ bleiben EIN Bereich");
      /* ... eine zweite ECHTE Garage von Hand aber schon. */
      const pZ2 = { meta: {}, klima: {}, zonen: [], raeume: [] };
      pruef(zoneAnlegen(pZ2, "Garage", false) !== null
        && zoneAnlegen(pZ2, "Garage Nord", false) !== null
        && pZ2.zonen.length === 2,
        "Eine zweite Garage mit eigenem Merkmal muss sich anlegen lassen, Zonen: "
          + pZ2.zonen.map(function (z) { return z.name; }).join(", "));
      pruef(zoneAnlegen(pZ2, "GARAGE", false) === null,
        "Derselbe Name ein zweites Mal entsteht nicht");
    }

    /* =================================================================
     * ZWEI LESUNGEN ODER ZWEI BEREICHE — die Unterscheidung selbst
     * ================================================================= */
    {
      const mitQ = function (gebaeude, jeBlatt) {
        return {
          raeume: [raum("r1", "EG", 20)], zonen: [], plan: { bilder: [],
            seiten: (jeBlatt || []).map(function (liste, i) {
              return gpSeite({ bezeichnung: "Blatt " + (i + 1),
                gegenprobe: gpLesung({ unbeheizt_benannt: liste }) });
            }) },
          plangebaeude: { unbeheizte_bereiche: gebaeude || [] },
        };
      };
      const namen = function (p) {
        return bereicheZusammenfuehren(p).map(function (b) { return b.name; });
      };

      /* DER GEMESSENE FALL. Die Gebaeudeauslese beschreibt, die Blattlesung
         benennt — zwei Quellen, je EINE Garage. Vorher: zwei rote Sperren
         fuer ein Bauwerk. */
      const eine = mitQ(["vermutlich Garage rechts im Bild"], [["GARAGE"]]);
      pruef(namen(eine).length === 1,
        "Zwei Quellen mit je einer Garage sind EINE Garage, sind: "
          + namen(eine).join(" | "));
      pruef(namen(eine)[0] === "GARAGE",
        "Der angezeigte Name ist die woertliche Blattlesung, ist: " + namen(eine)[0]);
      pruef(bereicheZusammenfuehren(eine)[0].lesungen.length === 2,
        "Beide Lesungen bleiben am Bereich haengen und stehen in der Zeile");

      /* DIE GEGENPROBE. Zaehlt EINE Quelle zwei auf, hat das Gebaeude zwei. */
      const zwei = mitQ([], [["GARAGE NORD", "GARAGE SUED"]]);
      pruef(namen(zwei).length === 2,
        "Zwei aus EINER Aufzaehlung bleiben zwei, sind: " + namen(zwei).join(" | "));
      const zweiQ = mitQ(["Garage Nord", "Garage Sued"], [["GARAGE NORD"]]);
      pruef(namen(zweiQ).length === 2,
        "Auch mit einer zweiten, aermeren Quelle bleiben es zwei, sind: "
          + namen(zweiQ).join(" | "));

      /* Verschiedene ART wird nie zusammengelegt. */
      const gemischt = mitQ([], [["GARAGE", "SPITZBODEN"]]);
      pruef(namen(gemischt).length === 2,
        "Eine Garage ist kein Dachraum, sind: " + namen(gemischt).join(" | "));

      /* Ohne deutbare Art wird nichts zusammengelegt — die vorsichtige Seite. */
      const ohneArt = mitQ(["Wintergarten unbeheizt"], [["Kaltbereich hinten"]]);
      pruef(namen(ohneArt).length === 2,
        "Was sich nicht einordnen laesst, bleibt fuer sich stehen, sind: "
          + namen(ohneArt).join(" | "));

      /* DER FLAECHENSTEMPEL IST EINE EIGENE LESUNG.
         Er landet in derselben Liste wie die Gebaeudeauslese. Zaehlten beide
         als EINE Quelle, haette diese Quelle zwei Garagen aufgezaehlt — und
         aus zwei Lesungen derselben Garage waeren wieder zwei Bereiche
         geworden. Gemessen am Blattsatz „BA 01-08" am 24.08.2026. */
      const gemischtQ = mitQ(["Garage", "vermutlich Garage rechts im Bild"], []);
      gemischtQ.stempelbereiche = ["Garage"];
      pruef(namen(gemischtQ).length === 1,
        "Stempel und Gebaeudeauslese sind zwei Quellen, nicht eine, sind: "
          + namen(gemischtQ).join(" | "));
      /* Ohne die Kennzeichnung als Stempel bleibt es bei zwei — dieselbe
         Liste, eine Quelle, zwei Nennungen. Das haelt fest, dass die Probe
         oben wirklich an der Quellentrennung haengt. */
      const ohneKennung = mitQ(["Garage", "vermutlich Garage rechts im Bild"], []);
      pruef(namen(ohneKennung).length === 2,
        "Zwei Nennungen EINER Quelle bleiben zwei, sind: "
          + namen(ohneKennung).join(" | "));
    }

    /* =================================================================
     * DIE BLATTANGABE ZUR GESCHOSSZAHL
     * ================================================================= */
    {
      const ZZ = zuordnung();
      const n = function (t) { return geschosseAusBlattangabe(t, ZZ).n; };
      pruef(n("nicht sicher ablesbar, vermutlich EG + OG + zurückgesetztes "
        + "Dachgeschoss/Staffelgeschoss") === 3,
        "Der echte Wortlaut nennt DREI Ebenen, gezaehlt: "
          + n("nicht sicher ablesbar, vermutlich EG + OG + zurückgesetztes "
              + "Dachgeschoss/Staffelgeschoss"));
      pruef(n("EG + OG + Staffelgeschoss") === 3,
        "Auch ohne das Wort Dachgeschoss sind es drei, gezaehlt: "
          + n("EG + OG + Staffelgeschoss"));
      pruef(n("KG, EG, OG, DG") === 4,
        "Die saubere Aufzaehlung bleibt bei vier, gezaehlt: " + n("KG, EG, OG, DG"));
      pruef(n("3") === 3 && n("3 Vollgeschosse") === 3,
        "Eine Zahl ist eine Zahl und keine Aufzaehlung");
      pruef(n("nicht ablesbar") === 0,
        "Ein Vorbehalt allein ist kein Geschoss, gezaehlt: " + n("nicht ablesbar"));
    }

    /* =================================================================
     * WELCHE ZEILE EINE SPERRE VERDIENT — UND WELCHE NICHT
     * =================================================================
     * „Nur mit schriftlicher Begruendung zu bestaetigen" ist die haerteste
     * Stufe dieses Blattes. Sie ist berechtigt, wenn ein Klick ohne Wort ein
     * grob falsches Ergebnis freigeben wuerde — und das heisst bei einer
     * Heizlast: ein ZU KLEINES, denn das sieht man dem Ergebnis nicht an.
     * Ein zu grosses Ergebnis steht dagegen mit Namen und Flaeche im
     * Raumbuch und ist mit einem Blick zu pruefen.
     *
     * Die allgemeine Regel (zwei benannte Zahlen, die auseinandergehen)
     * kannte diese Richtung nicht und sperrte beide Seiten gleich hart. Die
     * folgenden Proben halten die Trennung fest — in BEIDE Richtungen, damit
     * die Lockerung nicht zur Abschaltung wird.
     * ================================================================= */
    {
      const raeumeMit = function (erkennbar) {
        return { raeume: [raum("a", "EG", 20), raum("b", "EG", 15),
                          raum("c", "EG", 10), raum("d", "EG", 8)],
          plan: { bilder: [{ bezeichnung: "Blatt 1", art: "grundriss",
            geschoss: "EG", raeume_erkennbar: erkennbar }] } };
      };
      const zZuWenig = finde(zaehler(raeumeMit(6)), "raeume_EG");
      pruef(!!zZuWenig && zZuWenig.stufe === "fehler" && zZuWenig.aufhebbar === false,
        "Zu WENIG Raeume ist die unsichtbare Richtung und bleibt eine Sperre, ist: "
          + (zZuWenig ? zZuWenig.stufe + "/" + zZuWenig.aufhebbar : "keine Zeile"));
      const zZuViel = finde(zaehler(raeumeMit(2)), "raeume_EG");
      pruef(!!zZuViel && zZuViel.stufe === "warnung" && zZuViel.aufhebbar === true,
        "Zu VIEL ist sichtbar und mit einem Klick zu beantworten, ist: "
          + (zZuViel ? zZuViel.stufe + "/" + zZuViel.aufhebbar : "keine Zeile"));

      const fensterMit = function (inAnsicht) {
        const f = Array.from({ length: 4 }, function () {
          return { name: "Fenster", A: 1.5, kat: "huelle", lage: "Nord",
                   grenzt_an: { typ: "aussen" } }; });
        return { raeume: [raum("r1", "EG", 20, f.concat([{ name: "Außenwand", A: 20,
                    kat: "huelle", grenzt_an: { typ: "aussen" } }]))],
          plan: { bilder: [] },
          ansichten: [{ fassade: "Nord", fenster: inAnsicht, fassade_belegt: true, blatt: "Ansicht Nord" }] };
      };
      const fW = finde(zaehler(fensterMit(6)), "fenster_nord");
      pruef(!!fW && fW.stufe === "fehler" && fW.aufhebbar === false,
        "Ein fehlendes Fenster senkt die Heizlast und bleibt eine Sperre, ist: "
          + (fW ? fW.stufe + "/" + fW.aufhebbar : "keine Zeile"));
      const fV = finde(zaehler(fensterMit(2)), "fenster_nord");
      pruef(!!fV && fV.stufe === "warnung" && fV.aufhebbar === true,
        "Ein Fenster zu viel auf einer Fassade ist eine Zuordnungsfrage, ist: "
          + (fV ? fV.stufe + "/" + fV.aufhebbar : "keine Zeile"));

      /* Und die Zusammenfassung der unbeheizten Bereiche sperrt nicht noch
         einmal fuer dasselbe, was die Widerspruchszeile schon sperrt. */
      const pS = { meta: {}, klima: {}, zonen: [],
        raeume: [{ id: "k1", geschoss: "KG", name: "KELLER", art: "keller",
          we: "WE 1", A: 18, h: 2.3, bauteile: [{ name: "Außenwand", A: 10,
            kat: "huelle", grenzt_an: { typ: "aussen" } }] },
          { id: "e1", geschoss: "EG", name: "WOHNEN", art: "wohnen", we: "WE 1",
            A: 20, h: 2.5, bauteile: [{ name: "Außenwand", A: 12, kat: "huelle",
              grenzt_an: { typ: "aussen" } }] }],
        plangebaeude: { unbeheizte_bereiche: ["KELLERGESCHOSS"] },
        plan: { seiten: [] } };
      const zSum = finde(zaehler(pS), "zonen");
      const zWid = zaehler(pS).find(function (x) {
        return /^zone_widerspruch_/.test(x.id); });
      pruef(!!zWid && zWid.aufhebbar === false,
        "Der Widerspruch selbst sperrt weiter");
      pruef(!zSum || zSum.aufhebbar === true,
        "Die Zusammenfassung daneben sperrt nicht noch einmal, ist: "
          + (zSum ? String(zSum.aufhebbar) : "keine Zeile"));
    }

    /* =================================================================
     * ANGELEGT UND WIRKUNGSLOS
     * ================================================================= */
    {
      const pW2 = { raeume: [raum("r1", "EG", 20)], plan: { bilder: [] },
        zonen: [{ id: "z_g", name: "Garage", modus: "lage", lage: "allg_3aw",
                  huelle: [] }],
        plangebaeude: { unbeheizte_bereiche: ["Garage"] } };
      const zw2 = finde(zaehler(pW2), "zone_ohne_bauteil");
      pruef(!!zw2 && zw2.stufe === "warnung" && /0 W/.test(zw2.text)
        && zw2.aufhebbar === true,
        "Eine Zone, auf die kein Bauteil zeigt, muss als wirkungslos auffallen, ist: "
          + (zw2 ? zw2.stufe + "/" + zw2.aufhebbar : "keine Zeile"));
      /* Und die Gegenrichtung: zeigt ein Bauteil darauf, gibt es die Zeile
         nicht. Sonst waere sie nur laestig und nicht richtig. */
      const pW3 = JSON.parse(JSON.stringify(pW2));
      pW3.raeume[0].bauteile = [{ name: "Wand zur Garage", A: 12, kat: "huelle",
        grenzt_an: { typ: "zone", ref: "z_g" } }];
      pruef(!finde(zaehler(pW3), "zone_ohne_bauteil"),
        "Zeigt ein Bauteil auf die Zone, ist die Zeile weg");
      /* Ohne Lagewissen traegt die Zeile die zwei EIN-Klick-Antworten. */
      pruef(!!zw2 && (zw2.aktionen || []).some(function (a) {
          return a.aktion === "kbZoneFrei"; })
        && (zw2.aktionen || []).some(function (a) {
          return a.aktion === "kbZoneAngebaut"; }),
        "Die Zeile ohne Lagewissen bietet [Steht frei] und [Angebaut an]");
      /* Sagt die Lesung freistehend, ist die Zeile still gruen. */
      const pW4 = JSON.parse(JSON.stringify(pW2));
      pW4.plangebaeude.unbeheizte_bereiche = ["freistehende Garage"];
      const zw4 = finde(zaehler(pW4), "zone_ohne_bauteil");
      pruef(!!zw4 && zw4.stufe === "gut" && /freistehend/.test(zw4.text),
        "Eine laut Lesung freistehende Garage ist still gruen, ist: "
          + (zw4 ? zw4.stufe : "keine Zeile"));
      /* Und die Antwort [Steht frei] wirkt genauso. */
      const pW5 = JSON.parse(JSON.stringify(pW2));
      pW5.zonen[0].freistehend = { wer: "", zeit: "2026-08-25" };
      const zw5 = finde(zaehler(pW5), "zone_ohne_bauteil");
      pruef(!!zw5 && zw5.stufe === "gut",
        "Nach [Steht frei] ist die Zeile gruen");
    }

    /* =================================================================
     * DIE TRENNENDE WAND ZUM ANGEBAUTEN BEREICH ENTSTEHT SELBST
     * ================================================================= */
    {
      const pA = { raeume: [raum("HWR", "EG", 6, []), raum("Wohnen", "OG", 24)],
        bauteiltypen: [{ id: "bt_aw", name: "Außenwand", U: 1.0 }],
        zonen: [{ id: "z_g", name: "Garage", modus: "lage", lage: "allg_3aw",
                  huelle: [] }],
        plan: { seiten: [] },
        plangebaeude: { unbeheizte_bereiche: ["Garage (angebaut)"] } };
      pruef(zonenWaendeErgaenzen(pA) === true,
        "Angebaut laut Lesung: die Wand wird angelegt");
      const wA = (pA.raeume[0].bauteile || []).find(function (b) {
        return b.grenzt_an && b.grenzt_an.typ === "zone"
          && b.grenzt_an.ref === "z_g"; });
      pruef(!!wA && wA.A > 0 && wA.sicher === false
        && /Annahme/.test(wA.herkunft || "") && /zu klein/.test(wA.herkunft || ""),
        "Die Wand ist eine gekennzeichnete Annahme mit Richtungshinweis");
      pruef(!finde(zaehler(pA), "zone_ohne_bauteil"),
        "Mit der Wand ist die Frage zur Garage erledigt");
      pruef(zonenWaendeErgaenzen(pA) === false,
        "Ein zweiter Lauf legt keine zweite Wand an");
      /* Gegenprobe: ohne Lagewissen entsteht KEINE Wand — die Frage bleibt. */
      const pB = JSON.parse(JSON.stringify(pA));
      pB.raeume[0].bauteile = [];
      pB.plangebaeude.unbeheizte_bereiche = ["Garage"];
      pruef(zonenWaendeErgaenzen(pB) === false,
        "Ohne Lagewissen wird keine Wandflaeche erfunden");
      const zB = finde(zaehler(pB), "zone_ohne_bauteil");
      pruef(!!zB && zB.stufe === "warnung",
        "Ohne Lagewissen bleibt die EIN-Klick-Frage stehen");
    }

    /* =================================================================
     * ZONEN SIND KEINE EBENEN DES RAUMBUCHS (Kundenbefund 24.08.2026)
     * ================================================================= */
    {
      const pE = { raeume: [raum("Wohnen", "EG", 20), raum("Schlafen", "OG", 18)],
        zonen: [{ id: "keller", name: "Unbeheizter Keller", huelle: [] },
                { id: "dachraum", name: "Unbeheizter Dachraum", huelle: [] }],
        plan: { seiten: [] },
        plangebaeude: { geschosse: "EG + OG" } };
      const zE = finde(zaehler(pE), "geschosse");
      pruef(!!zE && zE.stufe === "gut" && zE.art === "pruefung",
        "2 beheizte Geschosse gegen 2 gezaehlte Ebenen sind still gruen, auch "
          + "mit 2 Zonen daneben, ist: " + (zE ? zE.stufe : "keine Zeile"));
      pruef(!!zE && /keine eigenen Ebenen/.test(zE.text),
        "Der Text sagt, dass die Zonen keine Raumbuch-Ebenen sind");
      /* Gegenprobe: ein DRITTES beheiztes Geschoss faellt weiter auf. */
      const pE2 = JSON.parse(JSON.stringify(pE));
      pE2.raeume.push(raum("Doppelt", "DG", 15));
      const zE2 = finde(zaehler(pE2), "geschosse");
      pruef(!!zE2 && zE2.art === "befund" && zE2.stufe === "warnung"
        && zE2.aufhebbar === true,
        "3 beheizte Geschosse gegen 2 gezaehlte Ebenen bleiben ein Befund "
          + "mit EIN-Klick-Weg, ist: " + (zE2 ? zE2.stufe : "keine Zeile"));
    }

    /* Ein als beheizt gefuehrter Nebenraum ist mit einem Klick zu
       beantworten — die Zeile sagt das selbst, und bis zum 24.08.2026 war
       sie trotzdem eine Sperre mit Begruendungszwang. */
    {
      const pN = { raeume: [raum("r1", "EG", 20), raum("Garage", "EG", 38)],
        zonen: [], plan: { bilder: [] },
        plangebaeude: { unbeheizte_bereiche: [] } };
      const zN = finde(zaehler(pN), "zonen_verdacht");
      pruef(!!zN && zN.aufhebbar === true
        && (zN.aktionen || []).some(function (a) { return a.aktion === "kbZoneAnlegen"; }),
        "Der als beheizt gefuehrte Nebenraum braucht Haken UND Weg zur Zone, ist: "
          + (zN ? zN.stufe + "/" + zN.aufhebbar : "keine Zeile"));
      pruef(!!zN && zN.stufe === "warnung",
        "gefunden werden muss er weiterhin");
    }

    /* Eine Garage ist keine Ebene, ein Keller schon. */
    pruef(zoneIstEbene({ name: "Unbeheizter Keller" })
      && zoneIstEbene({ name: "Spitzboden" })
      && !zoneIstEbene({ name: "Garage" })
      && !zoneIstEbene({ name: "Carport" })
      && !zoneIstEbene({ name: "Treppenhaus" }),
      "Nur was im Stapel liegt, zaehlt als Ebene");

    /* =================================================================
     * DAS VERMUTETE GESCHOSS: ANNAHME STATT SPERRE
     * ================================================================= */
    {
      const pG = function () {
        return { raeume: [raum("r1", "EG", 60), raum("r2", "OG", 50)], zonen: [],
          plan: { bilder: [] },
          plangebaeude: { geschosse: "EG + OG + zurückgesetztes Dachgeschoss" } };
      };
      const p0 = pG();
      const k0 = fehlendeGeschosse(p0);
      pruef(k0.length === 1 && k0[0].kuerzel === "DG",
        "Das benannte, nicht gezeichnete Dachgeschoss muss erkannt werden, ist: "
          + k0.map(function (x) { return x.kuerzel; }).join(", "));
      pruef(k0.length === 1 && k0[0].A === 50 && k0[0].gemessen === false
        && /Obergrenze/.test(k0[0].grund),
        "Seine Flaeche ist die OBERGRENZE aus dem Vollgeschoss darunter, ist: "
          + (k0[0] ? k0[0].A + " / " + k0[0].grund : "nichts"));
      /* Vor dem Anlegen ist es ein Befund — aber kein Sperrbefund mehr. */
      const zv = finde(zaehler(p0), "geschosse");
      pruef(zv && zv.stufe === "warnung" && zv.aufhebbar === true
        && (zv.aktionen || []).some(function (a) {
          return a.aktion === "kbGeschossAnnehmen"; }),
        "Wo eine begruendete Annahme moeglich ist, gibt es keine Sperre, ist: "
          + (zv ? zv.stufe + "/" + zv.aufhebbar : "keine Zeile"));

      /* EIN TEXTFRAGMENT IST KEIN GESCHOSS. GEMESSEN am 24.08.2026 am Bogen
         "260514 - Dumach 1": die zweite Lesung nannte eine Ebene "ebenen
         dargestellt" (ohne Aussenmass, ohne deutbaren Rang) — daraus wurde
         still ein 26. Raum "Angenommenes Geschoss ebenen dargestellt" mit
         91,92 m². Ohne Rang und ohne Mass entsteht kein Kandidat. */
      const pFrag = pG();
      pFrag.plan = { bilder: [], seiten: [{ name: "B1", verwenden: true,
        gegenprobe: { ebenen: [{ bezeichnung: "ebenen dargestellt",
          gezeichnet: false, raeume_beschriftet: 2 }] } }] };
      pruef(!fehlendeGeschosse(pFrag).some(function (x) {
        return /ebenen dargestellt/i.test(x.kuerzel + " " + (x.wortlaut || "")); }),
        "Eine Ebene ohne deutbaren Rang und ohne Aussenmass wird kein "
          + "Geschoss-Kandidat");

      const neu = geschossAnlegen(p0, k0[0], true);
      pruef(!!neu && neu.angenommen === true && neu.geschoss === "DG" && neu.A === 50,
        "Angelegt wird EIN Raum mit abgeleiteter Flaeche");
      pruef((p0.raeume || []).filter(function (r) {
        return r.geschoss === "DG"; }).length === 1,
        "und keine erfundene Raumaufteilung");
      pruef(geschossAnlegen(p0, k0[0], true) === null,
        "Ein zweiter Durchgang legt nichts nach");
      const za = finde(zaehler(p0), "geschoss_angenommen_dg");
      pruef(!!za && za.stufe === "warnung"
        && (za.aktionen || []).some(function (a) {
          return a.aktion === "kbGeschossEntfernen"; }),
        "Die Annahme bekommt eine eigene Zeile mit einem Klick zum Entfernen");
      const zn = finde(zaehler(p0), "geschosse");
      pruef(!!zn && zn.stufe !== "gut",
        "Und die Zaehlung darf davon nicht gruen werden, ist: "
          + (zn ? zn.stufe : "keine Zeile"));

      /* Entfernen heisst entfernen — und bleibt entfernt. */
      pruef(geschossEntfernen(p0, "DG") === true,
        "Ein Klick nimmt die Annahme wieder heraus");
      pruef(!(p0.raeume || []).some(function (r) { return r.geschoss === "DG"; }),
        "Der Raum ist danach weg");
      pruef(fehlendeGeschosse(p0).length === 0,
        "und wird nicht selbsttaetig wieder angelegt");
      /* DANACH IST ES WIEDER EINE SPERRE, UND ZU RECHT: die Rechnung laeuft
         jetzt WISSENTLICH ohne ein Geschoss, das die Unterlagen benennen.
         Ein Klick ohne Wort wuerde ein Ergebnis freigeben, von dem beide
         Seiten wissen, dass es zu klein ist. */
      const zw = finde(zaehler(p0), "geschoss_entfernt_dg");
      pruef(!!zw && zw.stufe === "fehler" && zw.aufhebbar === false
        && !!zw.begruendung_frage,
        "Nach dem Entfernen steht dafuer eine eigene Sperre mit Frage, ist: "
          + (zw ? zw.stufe + "/" + zw.aufhebbar : "keine Zeile"));
      pruef(!!zw && (zw.aktionen || []).some(function (a) {
        return a.aktion === "kbGeschossAnnehmen" && /wieder/.test(a.text); }),
        "und bietet den Rueckweg an, statt nur zu sperren");
      /* Die Zeile darf NICHT an der Zaehlung haengen: eine Blattangabe, die
         ein vorhandenes Geschoss nicht mitnennt, oder eine Zone, die an die
         Stelle rueckt, bringen die Zahl wieder zum Stimmen — und 6,3 kW
         waeren still verschwunden. Gemessen am echten Blattsatz. */
      const p0b = JSON.parse(JSON.stringify(p0));
      p0b.zonen = [{ id: "dachraum", name: "Unbeheizter Dachraum", modus: "lage",
                     lage: "dach_geschlossen_undicht", huelle: [] }];
      const zb = finde(zaehler(p0b), "geschosse");
      pruef(!!zb && zb.stufe !== "fehler",
        "Die Zaehlung allein findet den Fall nicht mehr (Zone ruecht an die Stelle)");
      pruef(!!finde(zaehler(p0b), "geschoss_entfernt_dg"),
        "und genau deshalb haengt die Sperre nicht an ihr");
      pruef(fehlendeGeschosse(p0, { auch_entfernte: true }).length === 1,
        "Von Hand ist das Geschoss weiter ansetzbar");

      /* GEMESSEN SCHLAEGT ABGELEITET. */
      const pM = pG();
      pM.plan.seiten = [gpSeite({ gegenprobe: gpLesung({ ebenen: [
        { bezeichnung: "DACHGESCHOSS", gezeichnet: false,
          aussen_breite_m: 6, aussen_tiefe_m: 5 }] }) })];
      const kM = fehlendeGeschosse(pM);
      pruef(kM.length === 1 && kM[0].gemessen === true && kM[0].A === 30,
        "Gelesene Aussenmasse gehen der Obergrenze vor, ist: "
          + (kM[0] ? kM[0].A + " / " + kM[0].gemessen : "nichts"));

      /* GEGENPROBE: ein unbeheizter Bereich wird NICHT als beheiztes
         Geschoss angesetzt. Sonst stuende ein Keller mit 20 Grad und voller
         Wohnflaeche in der Rechnung — der grobe Fehler in die andere
         Richtung. */
      const pU = pG();
      pU.plangebaeude.geschosse = "EG + OG + Spitzboden";
      pruef(fehlendeGeschosse(pU).length === 0,
        "Ein Spitzboden gehoert als Zone gefuehrt und nicht als beheiztes Geschoss");

      /* GEGENPROBE: ohne Anhaltspunkt keine Annahme und damit weiter Sperre. */
      const pL = { raeume: [], zonen: [], plan: { bilder: [] },
        plangebaeude: { geschosse: "EG + OG + Dachgeschoss" } };
      pruef(fehlendeGeschosse(pL).length === 0,
        "Ohne ein erfasstes Geschoss laesst sich nichts ableiten");
    }

    /* --- Z7 Raumhoehe unter dem Mindestmass ---------------------------- */
    {
      const rH = (name, h) => ({ id: name, geschoss: "EG", name: name, A: 16, h: h,
        we: "WE 1", fenster: 1,
        bauteile: [{ name: "Außenwand", A: 10, kat: "huelle",
                     grenzt_an: { typ: "aussen" } },
                   { name: "Fenster", A: 2, kat: "huelle",
                     grenzt_an: { typ: "aussen" } }] });
      const pOK = { raeume: [rH("WOHNEN", 2.52), rH("KOCHEN", 2.52)] };
      pruef(!finde(alleZ(pOK), "raumhoehe_unter_mindestmass"),
        "2,52 m ist in Ordnung und darf keine Zeile erzeugen");

      const pTief = { raeume: [rH("WOHNEN", 2.02), rH("KOCHEN", 2.52)] };
      const zT = finde(alleZ(pTief), "raumhoehe_unter_mindestmass");
      pruef(zT && zT.stufe === "warnung",
        "2,02 m lichte Hoehe in einem Aufenthaltsraum muss anschlagen");
      pruef(zT && zT.soll === 2 && zT.ist === 1,
        "gezaehlt wird gegen die Zahl der Aufenthaltsraeume");
      pruef(zT && /2,02/.test(String(zT.text)),
        "die kleinste gefundene Hoehe steht in der Zeile");
      pruef(zT && /47 Abs\. 1/.test(String(zT.quelle_soll)),
        "die Fundstelle der Musterbauordnung steht an der Sollzahl");

      /* Ein Keller ist kein Aufenthaltsraum. Die Unterscheidung kommt aus
         KERN_ZUORDNUNG und nicht aus dieser Datei; ohne den Kern (Knoten
         ohne Fenster-Regel) gilt jeder Raum als Aufenthaltsraum, dann
         greift diese Probe nicht und wird uebersprungen. */
      const Zk = zuordnung();
      if (Zk && Zk.ohneFensterUeblich({ name: "KELLER", geschoss: "KG" }).ja) {
        const pK = { raeume: [{ id: "k", geschoss: "KG", name: "KELLER", A: 18,
          h: 2.02, we: "WE 1", bauteile: [{ name: "Außenwand", A: 10,
            kat: "huelle", grenzt_an: { typ: "aussen" } }] }] };
        pruef(!finde(alleZ(pK), "raumhoehe_unter_mindestmass"),
          "im Keller gilt das Mindestmass nicht");
      }
    }

    return { ok: f.length === 0, fehler: f, anzahl: n };
  }

  /* =====================================================================
   * Ausgang
   * ================================================================== */
  window.MODUL_KONTROLLBLATT = {
    html: html,
    aktivieren: aktivieren,
    aktion: aktion,
    /* Rechenteil, DOM-frei und einzeln prüfbar */
    zaehler: zaehler,
    /* Die Wanddicke samt Spanne. KERN_FLAECHE rechnet mit derselben Zahl
       den Wandabzug fuer seine Flaechenvorschlaege; zwei Wege fuer
       dieselbe Sache driften auseinander. */
    wanddicke: wanddicke,
    zoneAnlegen: zoneAnlegen,
    zonenLageWissen: zonenLageWissen,
    zonenWaendeErgaenzen: zonenWaendeErgaenzen,
    fehlendeBereiche: fehlendeBereiche,
    bereicheZusammenfuehren: bereicheZusammenfuehren,
    artAusName: artAusName,
    /* Zahlform hinter einem Zaehler — auch die Rueckfragen in app.js
       schreiben Stueckzahlen ueber diesen einen Weg. */
    mengeText: mengeText,
    einheitZu: einheitZu,
    zaehleinheit: zaehleinheit,
    fehlendeGeschosse: fehlendeGeschosse,
    geschossAnlegen: geschossAnlegen,
    geschossEntfernen: geschossEntfernen,
    grenzen: grenzen,
    gegenproben: gegenproben,
    sperren: sperren,
    schreiben: schreiben,
    bestaetigen: bestaetigen,
    sperreAufheben: sperreAufheben,
    zurKenntnis: zurKenntnis,
    zurKenntnisZurueck: zurKenntnisZurueck,
    offeneBefunde: offeneBefunde,
    bemerkungSchreiben: bemerkungSchreiben,
    klasse: klasse,
    werte: werte,
    raumzeilen: raumzeilen,
    raumAmpel: raumAmpel,
    annahmegrund: annahmegrund,
    herkunftChip: herkunftChip,
    zustand: S,
    selbsttest: selbsttest,
  };
})();
