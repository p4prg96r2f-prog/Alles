/* ===========================================================================
 * app.js — Oberflaeche des WERK.E Heizlast-Tools
 * ===========================================================================
 * Zustand, Navigation, Raumbuch. Rechnen macht kern_heizlast_norm.js.
 * =========================================================================== */
"use strict";

const VERSION = "1.0.0-RC1";
const K = window.KERN_HEIZLAST_NORM;
const DR = window.DATEN_RAUMARTEN;
const DK = window.DATEN_KLIMA;
const DB = window.DATEN_BAUTEILE;
const DT = window.DATEN_TYPOLOGIE;
const KP = window.KERN_PRUEFUNG;

/* --------------------------------------------------------------------------
 * Hilfsfunktionen
 * ----------------------------------------------------------------------- */
const $ = (s, w) => (w || document).querySelector(s);
const $$ = (s, w) => Array.from((w || document).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (x, d) => {
  const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
  return Number.isFinite(v) ? v : (d === undefined ? 0 : d);
};
const fmt = (x, n) => (Number.isFinite(x) ? x.toLocaleString("de-DE",
  { minimumFractionDigits: n === undefined ? 0 : n, maximumFractionDigits: n === undefined ? 0 : n }) : "–");
const uid = (() => { let i = 0; return (p) => (p || "id") + "_" + (++i) + "_" + Math.floor(Math.random() * 1e6); })();
/* Zahl mit Hauptwort in der richtigen Zahlform.
   „1 Seiten auswerten lassen", „1 Räume ohne Bauteil": die Erstnutzerin hat
   das an einem Arbeitstag ein Dutzend Mal gelesen. Ein Zähler, der nicht
   zählen kann, macht misstrauisch gegen jede andere Zahl auf dem Blatt.
   mz(1, "Raum", "Räume") -> "1 Raum". */
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

/* Der gespeicherte Zeitstempel ist sortierbar, gelesen wird er deutsch:
   "2026-08-26 15:29" steht dem Bearbeiter als "26.08.2026 15:29" da. */
function zeitDe(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(String(t || ""));
  return m ? m[3] + "." + m[2] + "." + m[1] + " " + m[4] : String(t || "");
}

const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);

/* Sinnbilder liegen als gezeichnete Formen im Blattkopf (template.html) und
   werden ueber window.ikon() eingesetzt; hier nur der kurze Name. */
const ikon = window.ikon;

/* --------------------------------------------------------------------------
 * Meldungen und Rueckfragen — modul_dialog.js
 * --------------------------------------------------------------------------
 * KEIN alert(), KEIN confirm(), KEIN prompt() mehr in diesem Werkzeug.
 * Alle drei halten den ganzen Tab an: kein Neuzeichnen, kein Fortschritt,
 * keine laufende Auswertung. Am 23.08.2026 hielt ein Pruefer das Werkzeug
 * deswegen drei Minuten lang fuer abgestuerzt, und beim automatisierten
 * Nachstellen blieb der Tab so fest stehen, dass er nur noch zu schliessen
 * war.
 *
 * sagen()   meldet in der Seite und kehrt sofort zurueck.
 * fragen()  und eingabe() liefern ein Promise. Wer sie benutzt, macht in
 *           .then() weiter und ruft dort render(); der Klickverteiler ist
 *           da laengst durch.
 * Fehlt das Modul, faellt sagen() auf die Konsole zurueck und fragen()
 * antwortet mit Nein — nie mit Ja: eine unbeantwortete Rueckfrage darf
 * keine Handlung ausloesen.
 * ----------------------------------------------------------------------- */
function sagen(text, opt) {
  const D = window.MODUL_DIALOG;
  if (D) return D.sagen(text, opt);
  if (window.console) window.console.log(text);
  return { weg() {} };
}
function fragen(opt) {
  const D = window.MODUL_DIALOG;
  return D ? D.fragen(opt) : Promise.resolve(false);
}
function eingabe(opt) {
  const D = window.MODUL_DIALOG;
  return D ? D.eingabe(opt) : Promise.resolve(null);
}
function arbeit(text) {
  const D = window.MODUL_DIALOG;
  return D ? D.arbeit(text)
    : { text() {}, fertig() {}, warten() { return Promise.resolve(); } };
}
window.sagen = sagen;
window.fragen = fragen;
window.eingabe = eingabe;
window.arbeit = arbeit;

/* --------------------------------------------------------------------------
 * Leeres Projekt
 * ----------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
 * Angaben zur Person, nicht zum Projekt
 * --------------------------------------------------------------------------
 * Gemessen: bei sechs von sechs Unterlagensätzen tippt der Bearbeiter seinen
 * Namen, seine Funktion und seine Nummer in der Energieeffizienz-Expertenliste
 * neu ein. Diese Angaben ändern sich von Projekt zu Projekt nicht — sie
 * gehören zur Person und zum Rechner, nicht in die Projektdatei. Ohne sie
 * bleiben im Bericht Schreiblinien stehen und die Fassung bleibt „Entwurf".
 *
 * Gespeichert wird wie schon beim Standort: im Browser, unter einem eigenen
 * Schlüssel. Die Projektdatei bekommt die Werte weiterhin mit, damit ein an
 * einen Kollegen weitergegebenes Projekt vollständig bleibt.
 * ----------------------------------------------------------------------- */
const BEARBEITER_SCHLUESSEL = "werke_hl_bearbeiter";
const BEARBEITERFELDER = ["bearbeiter", "bearbeiter_funktion", "eee_nummer",
                          "erstellort"];

function bearbeiterGemerkt() {
  try {
    const o = JSON.parse(localStorage.getItem(BEARBEITER_SCHLUESSEL) || "{}");
    return (o && typeof o === "object") ? o : {};
  } catch (e) { return {}; }
}

/** Merkt ein Feld, sobald es geändert wurde. Ein geleertes Feld wird auch
 *  geleert gemerkt: sonst käme der alte Wert beim nächsten Projekt zurück. */
function bearbeiterMerken() {
  const o = {};
  BEARBEITERFELDER.forEach(function (k) {
    const v = App.p.meta[k];
    if (v !== undefined && v !== null && String(v) !== "") o[k] = String(v);
  });
  try { localStorage.setItem(BEARBEITER_SCHLUESSEL, JSON.stringify(o)); } catch (e) {}
}

function bearbeiterIstGemerkt() {
  return Object.keys(bearbeiterGemerkt()).length > 0;
}

function bearbeiterVergessen() {
  try { localStorage.removeItem(BEARBEITER_SCHLUESSEL); } catch (e) {}
  BEARBEITERFELDER.forEach(function (k) { App.p.meta[k] = ""; });
}

function leeresProjekt() {
  return {
    version: 2,
    /* Die Angaben zur Person stehen mit in der Grundform, damit ein Projekt
       immer dieselbe Gestalt hat; gefuellt werden sie aus dem Browser. */
    /* gebaeudeart steht ausdruecklich drin. Ohne Vorbelegung zeigte das
       Auswahlfeld "Ein- oder Zweifamilienhaus" an, gespeichert war aber
       nichts -- der Bearbeiter las einen Wert, den das Werkzeug nicht
       kannte. Es rechnete an allen Stellen ohnehin mit "efh" als Ersatz;
       jetzt steht dasselbe auch im Projekt. */
    meta: Object.assign({ bezeichnung: "", strasse: "", plz: "", ort: "", bauherr: "",
            projektnr: "", baujahr: "", gebaeudeart: "efh",
            bearbeiter: "", bearbeiter_funktion: "",
            eee_nummer: "", erstellort: "",
            bearbeitet: new Date().toISOString().slice(0, 10) },
            bearbeiterGemerkt()),
    /* Woher ein Feld unter meta stammt, wenn es nicht von Hand kam. Steht ein
       Eintrag darin, zeigt das Formular unter dem Feld, aus welchem Blatt der
       Wert kommt; ueberschrieben werden darf er jederzeit. */
    meta_herkunft: {},
    /* Was das Werkzeug vorgeschlagen hat und wie darüber entschieden wurde.
       ABGELEHNT heißt: derselbe Vorschlag kommt nicht wieder (Regel 5).
       ÜBERNOMMEN hält fest, welche Zahl aus welcher Herleitung stammt —
       damit im Bericht keine Zahl steht, deren Herkunft niemand mehr kennt.
       Beide wandern mit dem Projekt in die Datei und die Sicherung. */
    vorschlaege_abgelehnt: {},
    vorschlaege_uebernommen: {},
    standort: "paderborn",
    klima: { theta_e: null, theta_e_m: null, quelle: "" },
    luftdichtheit: { n50: 3.0, kategorie: "annahme", quelle: "" },
    norm: { delta_u_wb: 0.10 },
    optionen: { f_RH: 0 },
    einheiten: [{ id: uid("we"), name: "WE 1", personen: 2 }],
    zonen: [],
    bauteiltypen: [],
    raeume: [],
    plan: { bilder: [], seiten: [] },
    geschosshoehen: {},
    /* Aussenmasse ueber alles je Geschoss, von Hand eingetragen. Sie gehen
       in den Umfangsabgleich und schlagen jede gelesene Kontur. */
    geschossmasse: {},
    /* Welche Aussenmasse in den gebauten Bauteilen stecken (massstandJetzt).
       Der Vergleich dieser Zeichenkette mit dem heutigen Stand ist die
       einzige Stelle, an der ein GEÄNDERTES GESCHOSSMASS die Bauteile neu
       bilden lässt — die Weiche je Raum sieht nur Fläche, Höhe und Fenster.
       Leer heisst: es steckt noch keines darin. */
    bauteile_massstand: "",
  };
}

/* --------------------------------------------------------------------------
 * Zustand
 * ----------------------------------------------------------------------- */
const App = {
  p: leeresProjekt(),
  schritt: "start",
  ergebnis: null,
  offenerRaum: null,
  /* Der beim Start wiedergefundene Zwischenstand, solange niemand entschieden
     hat, ob daran weitergearbeitet wird. Siehe sicherungAnbieten(). */
  sicherungAngebot: null,
  /* Ein Fund, der zur Seite gelegt wurde, weil in diesem Reiter eigene
     Arbeit liegt (oder weil ?frisch=1 gesetzt war). Er ist nicht gelöscht;
     siehe sicherungBeiseiteLegen(). */
  sicherungBeiseite: null,
};
window.App = App;
/* Das Berichtsmodul rechnet die Empfindlichkeit offener Punkte, indem es
   rechne() ein zweites Mal mit genau einem geaenderten Parameter aufruft.
   Dafuer braucht es denselben Weg vom UI-Modell ins Kern-Modell. */
App.projektFuerKern = function (p) { return projektFuerKern(p || App.p); };

/* DREI SCHRITTE, NICHT FUENF.
 *
 * Der Normalablauf fragt den Bearbeiter nicht mehr durch die Pruefmaschine:
 * Unterlagen ablegen, die Analyse laeuft von selbst, danach steht ein Urteil.
 * Was wirklich fehlt oder widerspruechlich ist, wird zur Rueckfrage — eine
 * Ursache, eine Frage, mit Vorschlag zum Bestaetigen. Erst dann das Ergebnis.
 *
 * Die frueheren Pflichtschritte „Objekt und Klima", „Plan pruefen" und
 * „Kontrollblatt" sind NICHT geloescht: sie leben vollstaendig als
 * Expertenbereiche weiter (SCHRITTE_DETAIL) und bleiben ueber den klar
 * getrennten Zugang „Expertenmodus" erreichbar. Ihre Wahrheit — kern_pruefung,
 * die Zaehler des Kontrollblatts, die Annahmen — speist Urteil und
 * Rueckfragen; hier wird nichts neu erhoben, nur uebersetzt. */
const SCHRITTE = [
  { id: "start",       nr: 1, titel: "Unterlagen" },
  { id: "rueckfragen", nr: 2, titel: "Rückfragen" },
  { id: "ergebnis",    nr: 3, titel: "Ergebnis" },
];

/* Expertenmodus: die heutigen Bereiche, vollstaendig und unveraendert. Das
   Umfahren-Werkzeug („Plan von Hand umfahren") steht nur noch hier und an
   seinem Rettungsfall im Urteil — nicht mehr im Normalablauf. */
const SCHRITTE_DETAIL = [
  { id: "projekt",    titel: "Objekt und Klima" },
  { id: "pruefblatt", titel: "Plan prüfen" },
  { id: "kontrolle",  titel: "Kontrollblatt" },
  { id: "raeume",     titel: "Raumbuch" },
  { id: "bauteile",   titel: "Bauteile und U-Werte" },
  { id: "zonen",      titel: "Unbeheizte Bereiche" },
  { id: "plan",       titel: "Plan von Hand umfahren" },
  { id: "pruefung",   titel: "Selbstprüfung im Einzelnen" },
];

/* Bis zu wie vielen Blaettern die Analyse OHNE Rueckfrage von selbst startet.
 *
 * Automatisch Geld ausgeben braucht eine Grenze, und sie muss vom
 * SCHLECHTESTEN gemessenen Blatt her gerechnet sein, nicht vom Mittelwert.
 * GEMESSEN am 24.08.2026, zwei echte Durchlaeufe gegen den laufenden
 * Endpunkt (_verbrauch, also Token-genau):
 *   „BV 2-0887 Ziolkowski" (2 Blaetter, eines davon ein Bogen mit drei
 *   Grundrissen, feldweise gelesen):  0,561 $  =  0,28 $ je Blatt
 *   Plansatz KG/EG/OG/DG + Schnitt (5 Blaetter):  1,008 $  =  0,20 $ je Blatt
 * Der Deckel je Bericht liegt laut SPEZIFIKATION_ABLAUF bei 2 $. Mit dem
 * schlechtesten gemessenen Blattpreis traegt der Deckel 2 / 0,28 = 7
 * Blaetter (7 x 0,28 = 1,96 $). Ab dem achten Blatt startet die Analyse
 * deshalb nicht von selbst, sondern wartet auf genau einen Klick mit
 * Kostenvorschau (stapelKnopf). */
const AUTO_ANALYSE_GRENZE = 7;

/* --------------------------------------------------------------------------
 * UI-Modell -> Kern-Modell
 * ----------------------------------------------------------------------- */
function typFinden(id) {
  return App.p.bauteiltypen.find((t) => t.id === id) || null;
}

function projektFuerKern(p) {
  /* Die Herkunft der Raumhöhe muss mitreisen.
   *
   * Der Kern selbst braucht sie nicht — KERN_BANDBREITE schon. Sie liest sie
   * bislang aus p.herkunft und r.herkunft, und beides wird hier abgestreift.
   * GEMESSEN am 23.08.2026 an „BV 2-0887 Ziolkowski": 30 Größen in der
   * Bandbreite, keine einzige davon eine Höhe — obwohl das Modul eine Art
   * „angenommene Raumhöhe" führt. Sie fand nur nie ein Kennzeichen. Die Höhe
   * geht linear in Luftvolumen UND jede Außenwandfläche ein; sie ausgerechnet
   * aus der Spanne zu lassen, macht die Spanne unehrlich. */
  const hz = (p.hoehenStand && p.hoehenStand.zuordnung) || {};
  const raeume = (p.raeume || []).map(function (r) {
    const bts = (r.bauteile || []).map(function (b) {
      const t = (p.bauteiltypen || []).find((x) => x.id === b.typ_id);
      return {
        name: b.name || (t ? t.name : "Bauteil"),
        A: num(b.A, 0),
        U: t ? num(t.U, 0) : num(b.U, 0),
        grenzt_an: b.grenzt_an || { typ: "aussen" },
        kat: b.kat || undefined,
        quelle: t ? t.quelle : null,
        /* EINSTUFUNG DER U-WERT-QUELLEN (Kundenvorgabe Sebastian, 24.08.2026):
           Werte aus der Gebäudetypologie (IWU) und aus dem Referenzgebäude
           des GModG (beide tragen typologie: true) GELTEN als korrekt
           angesetzt. Sie sind keine bestätigungsbedürftige Annahme mehr und
           zählen deshalb hier nicht als annahme. Von Hand eingetragene Werte
           ohne Beleg bleiben Annahme (wie bisher); ein Bauteil ganz ohne
           Bauteiltyp bleibt Annahme und fällt in der Prüfung als Fehler auf.
           Die Herkunft bleibt über typologie/quelle sichtbar (Annahmenkarte,
           Konfidenztabelle, Spanne) — als Information, ohne Warncharakter. */
        annahme: t ? (!t.belegt && t.typologie !== true) : true,
        /* Woher der U-Wert kommt, muss mitreisen. Ohne diese beiden Felder
           sieht jedes Modul hinter dem Kern nur noch "annahme: true" und kann
           einen Typologiewert nicht mehr von einem geschaetzten unterscheiden.
           KERN_BANDBREITE fiel deshalb still in die groebere Streuung, und die
           Baujahrprobe fand kein einziges umzustellendes Bauteil. */
        typologie: t ? t.typologie === true : false,
        typ_name: t ? t.name : null,
        lage: b.lage || "",
      };
    });
    const art = DR.RAUMARTEN[r.art];
    return {
      id: r.id, geschoss: r.geschoss, name: r.name, art: r.art, we: r.we,
      theta_i: Number.isFinite(num(r.theta_i, NaN)) ? num(r.theta_i)
               : (art && art.theta_i != null ? art.theta_i : null),
      A: num(r.A, 0), h: num(r.h, 0),
      V: Number.isFinite(num(r.V, NaN)) && num(r.V) > 0 ? num(r.V) : undefined,
      n_min: Number.isFinite(num(r.n_min, NaN)) ? num(r.n_min) : (art ? art.n_min : 0.5),
      n_exponiert: Number.isFinite(num(r.n_exponiert, NaN)) ? num(r.n_exponiert) : undefined,
      f_RH: num(r.f_RH, num(p.optionen && p.optionen.f_RH, 0)),
      /* Der Kern warnt bei einem Raum ohne Hüllbauteil. Für einen
         innenliegenden Nebenraum ist das falsch, und die Entscheidung
         darüber gehört nicht in den Kern, sondern hierher: KERN_ZUORDNUNG
         beurteilt die Lage, und dieselbe Auskunft benutzt das
         Kontrollblatt. Zwei Stellen, ein Urteil. */
      innenliegend: innenliegendLaut(p, r),
      /* Ist die Höhe angenommen, und wenn nicht: was klammert sie ein?
         h_geschosshoehe ist die Geschosshöhe aus den Höhenkoten desselben
         Schnitts. Aus ihr rechnet KERN_BANDBREITE die Spanne der lichten
         Höhe; ohne sie bleibt nur das bauordnungsrechtliche Maß. */
      h_annahme: r.herkunft && r.herkunft.hoehe_angenommen !== undefined
        ? r.herkunft.hoehe_angenommen === true
        : ((hz[r.geschoss] || {}).angenommen === true),
      h_geschosshoehe: num((hz[r.geschoss] || {}).geschosshoehe, 0) > 0
        ? num((hz[r.geschoss] || {}).geschosshoehe) : null,
      bauteile: bts,
    };
  });
  const raumarten = {};
  Object.keys(DR.RAUMARTEN).forEach(function (k) {
    raumarten[k] = { theta_i: DR.RAUMARTEN[k].theta_i, n_min: DR.RAUMARTEN[k].n_min };
  });
  return {
    meta: p.meta,
    klima: p.klima, norm: p.norm, luftdichtheit: p.luftdichtheit,
    optionen: p.optionen, zonen: p.zonen, raeume: raeume, raumarten: raumarten,
  };
}


/* --------------------------------------------------------------------------
 * Objektangaben aus dem Schriftfeld ins Projekt
 * --------------------------------------------------------------------------
 * Gemessen wurde: bei sechs von sechs Unterlagensätzen tippt der Bearbeiter
 * Bezeichnung, Straße, Postleitzahl und Ort ab, obwohl sie im Schriftfeld des
 * Blattes stehen und beim Öffnen bereits gelesen wurden. Die Postleitzahl ist
 * die teuerste davon: an ihr hängt der Klimadatensatz, und ohne sie steht die
 * ganze Rechnung.
 *
 * Grundsätze:
 *  - Nur leere Felder werden gefüllt. Was der Bearbeiter eingetragen hat oder
 *    was aus einem früheren Blatt stammt, bleibt stehen.
 *  - Jeder übernommene Wert trägt seine Herkunft und steht als Hinweis unter
 *    dem Feld. Er ist ganz gewöhnlich überschreibbar.
 *  - Nichts wird ergänzt oder geraten. Was nicht im Schriftfeld steht, bleibt
 *    leer.
 * ----------------------------------------------------------------------- */
/** Ist das ein Baujahr? Vierstellige Jahreszahl, nicht weiter als fünf Jahre
 *  in der Zukunft.
 *
 *  WARUM ES DIESEN WÄCHTER GIBT. In der Abnahme am 24.08.2026 stand das
 *  Baujahrfeld auf −1 (ein leeres Zahlenfeld und eine Pfeiltaste oder ein
 *  Mausrad genügen dafür), und damit war die Baujahr-Sperre verschluckt:
 *  „!p.meta.baujahr" hielt −1 für ein Baujahr, die Typologie fand zur −1
 *  ihre älteste Klasse („Außenwand U 2,00"), und aus 11,95 kW wurden ~30 —
 *  ohne dass irgendjemand gefragt worden wäre. Deshalb prüft jede Stelle,
 *  die wissen will, OB ein Baujahr vorliegt, gegen diese eine Funktion:
 *  die Sperre in den Rückfragen, die Pflichtfeldliste, die Schrittleiste
 *  und die Übernahme aus dem Schriftfeld. Ein unplausibler Wert gilt überall
 *  als „kein Baujahr" — die Sperre bleibt stehen und sagt, was im Feld
 *  steht. Zusätzlich liefert die Typologie (daten_typologie.zumBaujahr) für
 *  ein Nicht-Jahr gar keine U-Werte mehr. */
function baujahrGueltig(w) {
  const t = String(w == null ? "" : w).trim();
  if (!/^\d{4}$/.test(t)) return false;
  return parseInt(t, 10) <= new Date().getFullYear() + 5;
}

function objektangabenUebernehmen(o, blatt, blattart) {
  if (!o) return false;
  const m = App.p.meta;
  if (!App.p.meta_herkunft) App.p.meta_herkunft = {};
  let etwas = false;

  const setzeWenn = function (feld, wert) {
    if (wert === null || wert === undefined || String(wert).trim() === "") return;
    if (m[feld] !== undefined && String(m[feld] || "").trim() !== "") return;
    m[feld] = String(wert).trim();
    App.p.meta_herkunft[feld] = { blatt: blatt || null, art: "aus dem Plan" };
    etwas = true;
  };

  setzeWenn("strasse", o.strasse);
  /* EINE POSTLEITZAHL AUS DEM SCHRIFTFELD KANN DIE DES PLANVERFASSERS SEIN.
   *
   * GEMESSEN in der Live-Abnahme am 24.08.2026 (Blattsatz Maas/Langner):
   * das Schriftfeld gab die PLZ 35789 her — die Anschrift des
   * Architekturbüros, nicht des Gebäudes. Der Ort stand da schon auf
   * „Paderborn" (aus der Standort-Annahme), und die Anzeige kombinierte
   * beides zu „35789 Paderborn", während das Klima still auf der PLZ der
   * Annahme rechnete. Deshalb wird eine PLZ aus dem Plan gegen die
   * Klimatabelle gehalten: führt die Tabelle für sie einen ANDEREN Ort als
   * den, der im Projekt daneben stünde, wird sie nicht übernommen, sondern
   * als offene Frage gemeldet. */
  (function () {
    const plzNeu = String(o.plz == null ? "" : o.plz).trim();
    if (!plzNeu) return;
    if (String(m.plz || "").trim() !== "") return;   // nichts überschreiben
    const DK = window.DATEN_KLIMA;
    const satz = DK && DK.findePlz ? DK.findePlz(plzNeu) : null;
    /* GEGENGEHALTEN WIRD GEGEN DEN ORT AUS DEMSELBEN SCHRIFTFELD.
       Vorher stand hier `m.ort || o.ort`, also der Ort aus dem PROJEKT
       zuerst — und der konnte eine bloße Annahme sein (Standort des Büros).
       Am Blatt „Bauantrag Soethe" hielt das Werkzeug damit die richtige
       PLZ 37696 gegen den angenommenen Ort „Paderborn" und verwarf sie.
       Richtig ist der Ort, der NEBEN der Postleitzahl im selben Schriftfeld
       steht: passen beide zueinander, ist es die Anschrift des Gebäudes.
       Nur wenn das Schriftfeld keinen Ort hergibt, zählt der des Projekts. */
    const daneben = String(o.ort || m.ort || "").trim();
    const gleich = function (a, b) {
      const n = function (t) { return String(t || "").toLowerCase().trim(); };
      const x = n(a), y = n(b);
      return !!x && !!y && (x === y || x.indexOf(y) >= 0 || y.indexOf(x) >= 0);
    };
    if (!satz || !daneben || gleich(satz.ort, daneben)) {
      setzeWenn("plz", plzNeu);
      return;
    }
    App.p.meta_herkunft.plz_verworfen = { wert: plzNeu, blatt: blatt || null,
      grund: "Die Klimatabelle führt für " + plzNeu + " den Ort " + satz.ort
        + ", das Projekt steht auf " + daneben + "." };
    App.p.offeneFragen = App.p.offeneFragen || [];
    const frage = "Im Schriftfeld von \"" + (blatt || "einem Blatt")
      + "\" steht die PLZ " + plzNeu + " — laut Klimatabelle " + satz.ort
      + ", das Projekt steht aber auf " + daneben + ". Vermutlich ist das "
      + "die Anschrift des Planverfassers. Die PLZ wurde nicht übernommen; "
      + "bitte die PLZ des Gebäudes eintragen, an ihr hängt der Klimadatensatz.";
    if (!App.p.offeneFragen.some(function (x) { return x.frage === frage; })) {
      App.p.offeneFragen.push({ thema: "Postleitzahl", blatt: blatt || null,
        frage: frage, abhilfe: "PLZ des Gebäudes unter Objektangaben eintragen." });
    }
    etwas = true;
  })();
  setzeWenn("ort", o.ort);
  setzeWenn("bauherr", o.bauherr);
  /* EIN BEBAUUNGSPLAN IST KEIN BAUVORHABEN.
   *
   * Gemessen am 23.08.2026 an „BV 2-0887 Ziolkowski", echter Durchlauf: Blatt
   * 1 trägt die drei Grundrisse und gibt im Schriftfeld weder Bauvorhaben
   * noch Projektnummer her. Blatt 2 ist der Bebauungsplan der Stadt
   * Paderborn und liefert „Bebauungsplan 300 Springbach Höfe" und die Nummer
   * „300". Beides wanderte in die Objektangaben, und der Bericht war danach
   * überschrieben mit „Paderborn · Projektnummer 300" — der Name einer
   * städtischen Satzung und ihre Nummer, nicht das Gebäude, das gerechnet
   * wurde.
   *
   * Das ist keine Ungenauigkeit, sondern eine Verwechslung von Gegenständen:
   * ein Bebauungsplan nach BauGB benennt ein Plangebiet, kein Bauvorhaben.
   * Seine Bezeichnung und seine Nummer werden deshalb hier verworfen. Was
   * bleibt — der Ort — ist eine Angabe über das Grundstück und gilt weiter.
   *
   * Verworfen wird nur, was sich selbst als Plangebiet ausweist. Ein
   * Deckblatt oder ein Schnitt ohne Grundriss darf sein Schriftfeld
   * weiterhin beisteuern. */
  const planwerk = /^\s*(b[\s-]?plan|bebauungsplan|flächennutzungsplan|flaechennutzungsplan|lageplan|liegenschaftskarte|flurkarte|katasterauszug)\b/i;
  const istPlangebiet = planwerk.test(String(o.bauvorhaben || ""));
  if (istPlangebiet) {
    App.p.meta_herkunft.bauvorhaben_verworfen = {
      wert: String(o.bauvorhaben).trim(), blatt: blatt || null,
      grund: "benennt ein Plangebiet, kein Bauvorhaben",
    };
  }
  /* Der Endpunkt nennt das Feld "projektnummer" (SCHEMA_RAEUME, Pflichtliste),
     gelesen wurde "projektnr". Ein Schreibfehler, den nichts meldet: die Zeile
     lief durch, das Feld blieb leer. Beide Schreibweisen gelten jetzt, damit
     auch eine ältere gesicherte Auslese noch ankommt. */
  if (!istPlangebiet) setzeWenn("projektnr", o.projektnummer || o.projektnr);
  /* Ein Baujahr aus dem Schriftfeld nur, wenn es eines IST. Eine Auslese,
     die „-1" oder Freitext liefert, darf die Baujahr-Sperre nicht
     verschlucken — was kein Jahr ist, bleibt draußen, und die Sperre fragt. */
  if (baujahrGueltig(o.baujahr)) setzeWenn("baujahr", o.baujahr);
  /* o.gebaeudeart kommt als Fließtext ("Einfamilienhaus"), meta.gebaeudeart ist
     ein Schlüssel aus einer Auswahlliste und ist mit "efh" vorbelegt. Ein
     roher Übertrag ergäbe eine Gebäudeart, die keine Liste kennt. Die Angabe
     wird deshalb nur mitgeführt und im Kontrollblatt genannt, nicht gesetzt. */
  if (o.gebaeudeart) App.p.meta_herkunft.gebaeudeart_gelesen = String(o.gebaeudeart).trim();
  /* Das Datum des Blattes ist NICHT das Baujahr, und es wird auch nicht dazu
     gemacht (siehe die Beschreibung im Endpunkt). Es wird nur aufbewahrt,
     damit die Meldung „Baujahr fehlt" sagen kann, worauf das Blatt datiert
     ist. Die Entscheidung trifft der Bearbeiter.

     DIE DATUMSWAHL GEWICHTET NACH BLATTART. Gemessen am 24.08.2026 an
     „BV 2-0887 Ziolkowski": Blatt 1 (die Grundrisse) ist handschriftlich auf
     17.05.2022 datiert, Blatt 2 ist der Bebauungsplan der Stadt Paderborn
     von Oktober 2018. In einem Lauf kam das B-Plan-Datum zuerst an, und aus
     „Oktober 2018" wurde das angenommene Baujahr — das Datum einer
     städtischen Satzung, nicht des Gebäudes. Ein Bebauungsplan oder Lageplan
     datiert das PLANGEBIET; ein Grundriss datiert das Gebäude. Deshalb:
     ein Datum von einem Gebäudeblatt SCHLÄGT ein bereits gemerktes Datum
     von einem Plangebietsblatt, unabhängig von der Reihenfolge der Blätter.
     Gleichrangig gilt weiter das erste Blatt. */
  if (o.plandatum) {
    const plangebietsBlatt = istPlangebiet
      || /^(lageplan|bplan|bebauungsplan)$/i.test(String(blattart || ""));
    const rang = plangebietsBlatt ? 1 : 2;
    const alt = App.p.meta_herkunft.plandatum;
    if (!alt || (rang > (alt.rang || 2))) {
      App.p.meta_herkunft.plandatum = { wert: String(o.plandatum).trim(),
        blatt: blatt || null, rang: rang,
        blattart: plangebietsBlatt ? "plangebiet" : "gebaeude" };
      /* Ein besseres Datum muss das daraus angenommene Baujahr neu bilden
         dürfen — sonst bleibt die Zahl aus dem schlechteren Blatt stehen. */
      if (alt && App.p.annahmen && App.p.annahmen.baujahr) {
        delete App.p.annahmen.baujahr;
        m.baujahr = "";
      }
      if (alt && App.p.annahmen && App.p.annahmen.baujahr_nicht) {
        delete App.p.annahmen.baujahr_nicht;
      }
      etwas = true;
    }
  }
  /* Ob das Blatt ein Gebäude PLANT oder eines ABBILDET, entscheidet allein,
     ob aus dem Plandatum ein Baujahr werden darf. Die Angabe wird gelesen
     (objekt.planungsart) und hier aufbewahrt; KERN_ANNAHMEN wertet sie aus.
     Das erste Blatt mit einer Aussage gewinnt — „unklar" ist keine Aussage
     und überschreibt deshalb nichts. */
  if (o.planungsart && o.planungsart !== "unklar"
      && !(App.p.meta_herkunft.planungsart
           && App.p.meta_herkunft.planungsart.art !== "unklar")) {
    App.p.meta_herkunft.planungsart = {
      art: String(o.planungsart), beleg: o.planungsart_beleg || null,
      blatt: blatt || null,
    };
    etwas = true;
  }

  /* Die Bezeichnung des Projekts. Sie steht im Bericht auf dem Deckblatt und
     ist Pflichtfeld für Schritt 2. Erste Wahl ist das Bauvorhaben aus dem
     Schriftfeld, zweite die Anschrift des Gebäudes. Beides ist besser als ein
     leeres Feld, das den Weiterweg sperrt. */
  if (o.bauvorhaben && !istPlangebiet) setzeWenn("bezeichnung", o.bauvorhaben);
  else if (o.strasse) setzeWenn("bezeichnung", [o.strasse, o.ort].filter(Boolean).join(", "));

  /* Aus der Postleitzahl folgen die Klimadaten, aus dem Baujahr die Bauteile.
     Das geschieht ohne Knopfdruck, sonst wäre nichts gewonnen. */
  if (etwas) automatischErgaenzen();
  return etwas;
}

/** Sammelt die Objektangaben aller abgelegten Blätter ein. Das erste Blatt,
 *  das ein Feld hergibt, gewinnt; weitere Blätter füllen nur noch, was fehlt.
 *  So trägt ein Satz aus Grundriss, Schnitt und Ansicht zusammen mehr als
 *  jedes Blatt für sich. */
function objektangabenAusPlaenenSammeln() {
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  let etwas = false;
  seiten.forEach(function (seite) {
    const o = seite.objektangaben;
    if (!o) return;
    if (objektangabenUebernehmen(o, seite.bezeichnung || seite.name,
        seite.blattkopf && seite.blattkopf.blattart)) etwas = true;
  });
  return etwas;
}

/* --------------------------------------------------------------------------
 * Selbsttätiges Ergänzen
 * Grundhaltung: Das Werkzeug wartet nicht auf Knopfdrücke, sondern füllt aus,
 * was es plausibel ausfüllen kann, und sagt daneben, dass es eine Annahme war.
 * Es überschreibt dabei niemals etwas, das der Bearbeiter eingetragen hat oder
 * das aus dem Plan belegt ist.
 * ----------------------------------------------------------------------- */
let ergaenzenLaeuft = false;

/* --------------------------------------------------------------------------
 * Annahmen für das, was auf dem Blatt fehlt
 * --------------------------------------------------------------------------
 * Baujahr und Postleitzahl standen auf Sebastians Blatt nicht, und ohne sie
 * blieb die Rechnung auf 0,00 kW stehen: ohne Baujahr keine U-Werte, ohne
 * U-Werte keine Bauteile, ohne Bauteile keine Heizlast. Zwei fehlende
 * Angaben hielten alles an, obwohl das Blatt zu beiden einen Anhaltspunkt
 * trägt (Plandatum, Ort).
 *
 * Hergeleitet wird beides in KERN_ANNAHMEN, mit Begründung und Bandbreite.
 * Hier wird nur EINGESETZT, und zwar unter drei Bedingungen: nur in ein
 * leeres Feld, nur mit Vermerk in p.annahmen, und jederzeit überschreibbar.
 * Sobald jemand den Wert von Hand ändert, verschwindet der Vermerk
 * (annahmeVerwerfen) und die Zahl ist keine Annahme mehr.
 * ----------------------------------------------------------------------- */
function annahmenAnwenden() {
  const A = window.KERN_ANNAHMEN;
  const p = App.p;
  if (!A) return false;
  let etwas = false;
  if (!p.annahmen) p.annahmen = {};
  const mh = p.meta_herkunft || {};

  /* --- Baujahr aus dem Plandatum ------------------------------------- */
  if (!String(p.meta.baujahr || "").trim()) {
    const pa = mh.planungsart || {};
    /* Alles, was das Werkzeug über die Art des Blattes ohnehin weiß. Der
       Dateiname steht in der Bezeichnung der Seite; er ist auf Sebastians
       Fall die tragende Fundstelle („Werkvertragsverzeichnung"). */
    const texte = [p.meta.bezeichnung, mh.gebaeudeart_gelesen,
      p.plangebaeude && p.plangebaeude.plankopf]
      .concat(((p.plan && p.plan.seiten) || []).map(function (s) {
        return s.datei || s.bezeichnung || s.name;
      }));
    const a = A.baujahr({
      plandatum: mh.plandatum && mh.plandatum.wert,
      planungsart: pa.art || "unklar",
      planungsart_beleg: pa.beleg || null,
      gebaeudeart: p.meta.gebaeudeart,
      texte: texte,
    });
    if (a && a.wert) {
      p.meta.baujahr = String(a.wert);
      p.annahmen.baujahr = Object.assign({}, a, {
        blatt: (mh.plandatum && mh.plandatum.blatt) || null,
        pfad: "meta.baujahr", zeit: Date.now(),
      });
      etwas = true;
    } else if (a) {
      /* Aus einer Bestandsunterlage entsteht kein Baujahr. Warum nicht,
         gehört trotzdem gesagt — sonst steht der Kollege wieder vor einer
         Null ohne Auskunft. */
      p.annahmen.baujahr_nicht = a;
    }
  }

  /* --- Klima ohne Postleitzahl ---------------------------------------- */
  /* EINE BEGRÜNDUNG, DIE DEM EIGENEN DATENSTAND WIDERSPRICHT, IST SCHLIMMER
   * ALS KEINE.
   *
   * Gemessen am 23.08.2026 an „BV 2-0887 Ziolkowski", echter Durchlauf:
   * neben der Norm-Außentemperatur stand „Auf dem Plan steht weder
   * Postleitzahl noch Ort. Angesetzt ist der Standort des Bearbeiters
   * (Paderborn)" — während im selben Projekt meta.ort = „Paderborn" stand,
   * gelesen aus Blatt 2 („Bebauungsplan 300 Springbach Höfe, Stadt
   * Paderborn"). Die Zahl war zufällig richtig, weil der Standort des Büros
   * derselbe Ort ist. Der Satz war falsch.
   *
   * Die Ursache ist eine Reihenfolge: Blatt 1 fällt, hat keinen Ort, die
   * Annahme entsteht über den Standort. Blatt 2 fällt, bringt den Ort — und
   * die Annahme wird nicht mehr angefasst, weil theta_e schon steht.
   *
   * Deshalb wird eine Annahme, die auf dem STANDORT beruht, neu gebildet,
   * sobald ein Ort aus dem Plan vorliegt. Angefasst wird ausschließlich,
   * was das Werkzeug selbst angenommen hat (klima.angenommen); ein von Hand
   * gesetztes Klima bleibt unberührt. */
  const klimaAn = p.annahmen && p.annahmen.klima;
  const ortDa = String(p.meta.ort || "").trim();
  const nachbessern = !!(klimaAn && klimaAn.herkunft === "standort"
    && p.klima.angenommen && ortDa);
  if (!String(p.meta.plz || "").trim() && (p.klima.theta_e == null || nachbessern)) {
    const st = (window.STANDORTE || {})[p.standort];
    const a = A.klima({ ort: p.meta.ort, standort_ort: st && st.erstellort });
    /* Nur übernehmen, wenn dabei wirklich der Plan-Ort gewonnen hat. Sonst
       stünde dieselbe Begründung nur mit neuem Zeitstempel wieder da. */
    if (nachbessern && !(a && a.herkunft === "plan")) return etwas;
    if (a) {
      p.klima.theta_e = a.theta_e;
      p.klima.theta_e_m = a.theta_e_m;
      /* Die Quelle nennt die angesetzte Postleitzahl und sagt im selben Satz,
         dass sie angenommen ist. Ein Quellentext, der das verschweigt, macht
         aus der Annahme im Bericht einen Beleg. */
      p.klima.quelle = "Angenommen: " + a.quelle_text;
      p.klima.angenommen = true;
      /* DER ANGENOMMENE ORT GEHÖRT NICHT IN DIE OBJEKTANGABEN.
       *
       * Bis zum 26.08.2026 stand hier `if (!p.meta.ort && a.ort)
       * p.meta.ort = a.ort` — der Standort des Büros wanderte in die
       * Anschrift des GEBÄUDES. Drei Fehler auf einmal, gemessen am Blatt
       * „Bauantrag Soethe 1312.2021.pdf" (echter Lauf 26.08.2026, 6 Blätter):
       *  1. Deckblatt und Kolumnentitel lauteten „Norm-Heizlast Flur 12,
       *     Paderborn"; im Plan steht 18× „37696 Marienmünster" und 0×
       *     „Paderborn".
       *  2. Die Postleitzahl 37696 aus dem Schriftfeld wurde VERWORFEN, weil
       *     sie dem soeben angenommenen Ort widersprach (objektangaben-
       *     Uebernehmen, „plz_verworfen") — sechsmal, für jedes Blatt.
       *  3. Beim nächsten Durchlauf las diese Funktion ihren eigenen
       *     angenommenen Ort aus p.meta.ort zurück und schrieb die Annahme
       *     auf „Der Ort ‚Paderborn' steht im Schriftfeld des Plans" um. Aus
       *     einer Annahme wurde so ein Beleg, den es nie gab.
       * Folge für die Zahl: θe −10,7 statt −11,6 °C, Δθ 30,7 statt 31,6 K,
       * die Heizlast rund 2,9 Prozent zu klein.
       * Der angenommene Ort steht weiterhin in p.annahmen.klima (a.ort) und
       * wird dort mit seiner Herkunft angezeigt — aber die Objektangaben
       * bleiben leer, bis der Plan oder der Bearbeiter sie füllt. */
      p.annahmen.klima = Object.assign({}, a, {
        pfad: "klima.theta_e", zeit: Date.now(),
      });
      etwas = true;
    }
  }

  /* --- Bezeichnung des Objekts aus dem Dateinamen ---------------------- */
  /* SO UNTERSCHREIBT MAN KEIN DOKUMENT.
   *
   * Am 23.08.2026 an „BV 2-0887 Ziolkowski" gemessen: das Schriftfeld des
   * Blattes mit den drei Grundrissen gab kein Bauvorhaben her, und der
   * Bericht war danach nur noch über den Ort und eine Nummer zu erkennen.
   * Die Bezeichnung stand die ganze Zeit da — im Dateinamen der Unterlage,
   * „Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf".
   *
   * Der Dateiname ist eine schwächere Quelle als das Schriftfeld, deshalb
   * kommt er zuletzt und trägt seine Herkunft mit. Genommen wird der Name
   * des Blattes, das die Grundrisse trägt; ein Beiblatt benennt das Vorhaben
   * nicht. Erfunden wird nichts: liegt kein Blatt vor, bleibt das Feld leer
   * und der Bericht sagt das. */
  if (!String(p.meta.bezeichnung || "").trim()) {
    const seiten = (p.plan && p.plan.seiten) || [];
    const mitRaeumen = seiten.filter(function (x) {
      return x.verwenden !== false
        && ((x.auslese && (x.auslese.raeume || []).length) || x.ist_grundriss);
    });
    const quelle = mitRaeumen[0] || seiten.filter(function (x) {
      return x.verwenden !== false; })[0] || null;
    const roh = quelle ? String(quelle.name || quelle.bezeichnung || "") : "";
    const name = roh
      .replace(/,\s*Seite\s*\d+\s*$/i, "")
      .replace(/\.(pdf|png|jpe?g|tif?f|webp|heic)$/i, "")
      .replace(/[_]+/g, " ")
      .trim();
    if (name.length >= 3) {
      p.meta.bezeichnung = name;
      if (!p.meta_herkunft) p.meta_herkunft = {};
      p.meta_herkunft.bezeichnung = {
        blatt: quelle ? (quelle.bezeichnung || quelle.name) : null,
        art: "aus dem Dateinamen der Unterlage abgeleitet, weil das "
          + "Schriftfeld kein Bauvorhaben nennt",
      };
      etwas = true;
    }
  }
  return etwas;
}

/** Eine Annahme fällt weg, sobald jemand den Wert selbst setzt. */
function annahmeVerwerfen(pfad) {
  const an = App.p.annahmen;
  if (!an) return;
  Object.keys(an).forEach(function (k) {
    if (an[k] && an[k].pfad === pfad) delete an[k];
  });
  if (pfad === "meta.baujahr") delete an.baujahr_nicht;
  if (pfad === "klima.theta_e" || pfad === "meta.plz") {
    delete an.klima;
    if (App.p.klima) delete App.p.klima.angenommen;
  }
}

window.annahmeVerwerfen = annahmeVerwerfen;

/** Führt die aus der Typologie vorbelegten U-Werte einem geänderten Baujahr
 *  nach.
 *
 *  Ohne das wäre das Eingabefeld neben der Annahme eine Attrappe: die
 *  Bauteiltypen entstehen einmal (Schritt 1 legt nur an, wenn noch keine da
 *  sind), und wer danach das angenommene Baujahr 2022 auf 1965 berichtigt,
 *  bekäme weiter die U-Werte von 2022. Angefasst wird ausschließlich, was
 *  aus der Typologie stammt und seither niemand angerührt hat; die Kennung
 *  bleibt, damit die Zuordnung in den Räumen bestehen bleibt. */
function typologieNachfuehren() {
  const DT = window.DATEN_TYPOLOGIE;
  const p = App.p;
  if (!DT || !p.meta.baujahr || !p.bauteiltypen.length) return false;
  const t = DT.zumBaujahr(p.meta.baujahr, p.meta.gebaeudeart);
  if (!t) return false;
  /* Nachgeführt wird über DIESELBE Liste, aus der die Bauteiltypen entstehen
     (DATEN_TYPOLOGIE.startwerte). Vorher stand hier eine zweite Zuordnung aus
     t.u — und die lief genau dann leer, wenn die Startwerte nicht mehr aus
     der IWU-Tabelle kommen, sondern aus dem Referenzgebäude des Gesetzes.
     Wer sein Baujahr von 1965 auf 2025 berichtigte, behielt damit still die
     U-Werte von 1965, mitsamt ihrer Fundstelle. */
  const neu = DT.startwerte ? DT.startwerte(t) : [];
  if (!neu.length) return false;
  const nach = {};
  neu.forEach(function (x) { if (nach[x.name] === undefined) nach[x.name] = x; });
  let geaendert = false;
  p.bauteiltypen.forEach(function (b) {
    if (b.typologie !== true) return;             // von Hand belegt: bleibt
    const x = nach[b.name];
    if (!x) return;
    /* DIE GEGENPROBE ZUM RÜCKFALL OHNE BAUJAHR: sobald ein Baujahr da ist
       (diese Funktion läuft nur dann), verliert jeder Bauteiltyp seine
       Kennung ohne_baujahr — auch wenn die echte Klasse zufällig dieselben
       Zahlen trägt. Sonst hinge am Wert der echten Klasse noch das Etikett
       der Rückfallklasse. */
    if (b.ohne_baujahr) { delete b.ohne_baujahr; geaendert = true; }
    if (x.U === b.U && x.quelle === b.quelle) return;
    b.U = x.U; b.quelle = x.quelle;
    b.ersatzwert = x.ersatz || false;
    geaendert = true;
  });
  /* Und die Annahme dazu fällt weg — nicht nur, wenn jemand ins Feld tippt
     (das erledigt annahmeVerwerfen), sondern auch, wenn das Baujahr auf
     anderem Weg ankommt, etwa aus einem später gelesenen Blatt. */
  if (p.annahmen && p.annahmen.baujahr_klasse
      && baujahrGueltig(p.meta.baujahr)) {
    delete p.annahmen.baujahr_klasse;
    geaendert = true;
  }
  return geaendert;
}

/** Die Annahmen, die gerade tragen — für Blatt, Leiste und Bericht. */
function annahmenListe(p) {
  const an = (p && p.annahmen) || {};
  return Object.keys(an)
    .filter(function (k) { return k !== "baujahr_nicht" && an[k] && an[k].wert !== null; })
    .map(function (k) { return Object.assign({ schluessel: k }, an[k]); });
}
window.annahmenListe = annahmenListe;

function automatischErgaenzen() {
  if (ergaenzenLaeuft) return false;          // kein Wiedereintritt beim Rechnen
  ergaenzenLaeuft = true;
  let etwasGetan = false;
  try {
    const p = App.p;

    /* 0  Was auf dem Blatt fehlt, aber aus ihm folgt. Muss vor allem
          Weiteren stehen: aus dem Baujahr kommen die Bauteile, aus dem
          Klima die Temperaturdifferenz. */
    if (annahmenAnwenden()) etwasGetan = true;
    if (typologieNachfuehren()) etwasGetan = true;

    // 1  Bauteile mit U-Werten aus dem Baujahr, sobald es bekannt ist
    if (p.meta.baujahr && !p.bauteiltypen.length && window.DATEN_TYPOLOGIE) {
      /* Die Gebäudeart gehört in die Abfrage: die hinterlegte Reihe ist die
         der Einfamilienhäuser, und für ein Nichtwohngebäude oder einen
         Neubau hinter dem Ende der Tabelle gibt es gar keine Startwerte.
         Vorher entstanden hier stillschweigend Bauteile mit U-Werten aus
         2015 und einer Fundstelle, die von Einfamilienhäusern sprach. */
      const t = window.DATEN_TYPOLOGIE.zumBaujahr(p.meta.baujahr, p.meta.gebaeudeart);
      /* Die Liste der Startwerte steht in DATEN_TYPOLOGIE und nur dort. Hier
         stand sie ein zweites Mal, und beide Fassungen hatten dasselbe Loch:
         eine Klasse ohne Bodenplatte in der Quelle erzeugte gar keinen
         Bauteiltyp „Bodenplatte", und die Fläche auf dem Erdreich hieß danach
         „Kellerdecke". */
      const sw = window.DATEN_TYPOLOGIE.startwerte
        ? window.DATEN_TYPOLOGIE.startwerte(t) : [];
      if (sw.length) {
        sw.forEach(function (x) {
          p.bauteiltypen.push({ id: uid("bt"), name: x.name, U: x.U,
            kat_default: x.kat, schichten: [], belegt: false, typologie: true,
            quelle: x.quelle, ersatzwert: x.ersatz || false });
        });
        etwasGetan = true;
      }
    }

    /* 1b  KEIN auswertbares Baujahr: die Bestands-Rückfallklasse.
     *
     * Bis zum 25.08.2026 war das die letzte harte Sperre des Werkzeugs:
     * Bestandsplan ohne Baujahr → keine Bauteiltypen → 0,00 kW, Ampel rot,
     * Bericht gesperrt. Jetzt entstehen die Bauteiltypen aus der
     * Rückfallklasse EFH_F „1969 bis 1978" (DATEN_TYPOLOGIE.ohneBaujahr —
     * Begründung, Fundstelle und Fehlerrichtung stehen dort und an jedem
     * Bauteil), als Annahme in p.annahmen.baujahr_klasse vermerkt und mit
     * der Kennung ohne_baujahr am Bauteiltyp.
     *
     * Drei Grenzen, alle mit Absicht:
     *   - Nur wenn Räume da sind. Ein leeres Projekt, in dem jemand gerade
     *     erst zu tippen beginnt, bekommt keine ungefragte Bibliothek.
     *   - Nur in eine leere Bibliothek. Eine Nutzereingabe wird nie
     *     überschrieben.
     *   - Die Annahme hängt an pfad meta.baujahr: sobald jemand ein Baujahr
     *     einträgt, räumt annahmeVerwerfen sie ab und typologieNachfuehren
     *     ersetzt jeden Rückfallwert durch den der echten Klasse. */
    if (!baujahrGueltig(p.meta.baujahr) && window.DATEN_TYPOLOGIE
        && window.DATEN_TYPOLOGIE.ohneBaujahr) {
      const tOhne = window.DATEN_TYPOLOGIE.ohneBaujahr(p.meta.gebaeudeart);
      const swOhne = (tOhne && window.DATEN_TYPOLOGIE.startwerte)
        ? window.DATEN_TYPOLOGIE.startwerte(tOhne) : [];
      if (swOhne.length && !p.bauteiltypen.length && p.raeume.length) {
        swOhne.forEach(function (x) {
          p.bauteiltypen.push({ id: uid("bt"), name: x.name, U: x.U,
            kat_default: x.kat, schichten: [], belegt: false, typologie: true,
            ohne_baujahr: true, quelle: x.quelle,
            ersatzwert: x.ersatz || false });
        });
        etwasGetan = true;
      }
      /* Die Annahme steht, solange Rückfallwerte tragen — auch dann noch,
         wenn jemand danach etwas ins Baujahrfeld tippt, das kein Baujahr
         ist (annahmeVerwerfen räumt beim Tippen ab, die Rückfallwerte
         rechnen aber weiter). Erst ein GÜLTIGES Baujahr beendet beides,
         über typologieNachfuehren. */
      /* p.annahmen fehlt bei Projekten aus älteren Ständen und in den
         Prüfattrappen; ohne diese Zeile stirbt automatischErgaenzen an
         `undefined.baujahr_klasse` und mit ihm die ganze Anzeige. Genau die
         Klasse Fehler, die im Werkzeug nie wieder eine Rechnung anhalten
         soll: fehlt der Ablageort, wird er angelegt. */
      if (!p.annahmen || typeof p.annahmen !== "object") p.annahmen = {};
      if (tOhne && p.bauteiltypen.some(function (b) { return b.ohne_baujahr; })
          && !p.annahmen.baujahr_klasse) {
        const steht = String(p.meta.baujahr == null ? "" : p.meta.baujahr).trim();
        const nicht = p.annahmen.baujahr_nicht;
        p.annahmen.baujahr_klasse = {
          feld: "bauteiltypen", wert: tOhne.label, stufe: "offen",
          pfad: "meta.baujahr", zeit: Date.now(),
          kurz: "Baujahr unbekannt — U-Werte der Bestandsklasse "
            + tOhne.label + " angesetzt",
          begruendung: (steht
              ? "Im Baujahrfeld steht „" + steht + "“ — das ist kein Baujahr. "
              : "Ein Baujahr ist weder eingetragen noch aus den Unterlagen "
                + "ableitbar. ")
            + (nicht && nicht.begruendung
              ? String(nicht.begruendung).replace(/\s*Das Baujahr ist einzutragen\.\s*$/, "") + " "
              : "")
            + "Damit die Rechnung nicht stehen bleibt, sind die U-Werte der "
            + "Bestandsklasse " + tOhne.label + " angesetzt (" + "IWU-"
            + "Wohngebäudetypologie 2015; Größenordnung bestätigt durch die "
            + "Bekanntmachung der Regeln zur Datenaufnahme und Datenverwendung "
            + "im Wohngebäudebestand vom 08.10.2020, Tabelle 2). Jeder dieser "
            + "Werte ist als Rückfallwert gekennzeichnet und überschreibbar.",
          richtung: "Ist das Gebäude älter als 1969 und unsaniert, liegt die "
            + "wirkliche Heizlast HÖHER als die gerechnete; ist es jünger oder "
            + "saniert, liegt sie niedriger. Das eingetragene Baujahr ersetzt "
            + "alle Rückfallwerte — die Gegenrechnung über alle "
            + "Baualtersklassen steht neben dem Ergebnis.",
        };
        etwasGetan = true;
      }
    }

    // 2  Klimadaten aus der Postleitzahl
    /* Eine ANGENOMMENE Norm-Außentemperatur (aus Standort oder Ort) weicht,
       sobald die Postleitzahl des Gebäudes vorliegt: die Tabelle ist
       PLZ-genau, die Annahme war es nicht. Vorher stand die Anzeige auf der
       PLZ aus dem Plan, während das Klima still auf der PLZ der Annahme
       weiterrechnete — ohne dass irgendwo stand, dass beide auseinander
       liegen. Ein von Hand gesetztes Klima (klima.angenommen fehlt) bleibt
       unberührt. */
    if (p.meta.plz && window.DATEN_KLIMA
        && (p.klima.theta_e == null
            || (p.klima.angenommen && p.annahmen && p.annahmen.klima))) {
      const o = window.DATEN_KLIMA.findePlz(p.meta.plz);
      if (o && (p.klima.theta_e == null
                || Math.abs(num(p.klima.theta_e, 999) - o.theta_e) > 0.05
                || p.klima.angenommen)) {
        p.klima.theta_e = o.theta_e;
        p.klima.theta_e_m = o.theta_e_m;
        p.klima.quelle = o.quelle || (window.DATEN_KLIMA.abdeckung
          ? window.DATEN_KLIMA.abdeckung().quelle : "Klimatabelle");
        delete p.klima.angenommen;
        if (p.annahmen && p.annahmen.klima) delete p.annahmen.klima;
        if (!p.meta.ort && o.ort) p.meta.ort = o.ort;
        etwasGetan = true;
      }
    }

    /* 2b  Unbeheizte Bereiche, die der Plan beim Namen nennt.
     *
     * WARUM DAS HIER STEHT. Das Kontrollblatt erhebt diesen Befund selbst,
     * kennt den Namen des Bereichs, kennt seine Lage nach DIN/TS 12831-1
     * Tabelle 5 und kennt die Fundstelle dazu. Trotzdem hing das Anlegen an
     * einem Knopf. Am Blatt „BV 2-0887 Ziolkowski" ergab das zwei rote
     * Zeilen fuer eine einzige Tatsache: „Unbeheizter Bereich SPITZBODEN"
     * und „Zahl der Geschosse 3 von 4" — dieselbe nicht gezeichnete Ebene,
     * zweimal gezaehlt. Beide sind weg, sobald die Zone da ist.
     *
     * Geraten wird nichts. Angelegt wird nur, was
     *   - die zweite Lesung als unbeheizten Bereich benennt oder als
     *     benannte, nicht gezeichnete Ebene fuehrt (dieselbe Liste, aus der
     *     die roten Zeilen entstehen — sie wird von dort gelesen, nicht
     *     nachgebaut), und
     *   - sich einer Lage der Tabelle 5 zuordnen laesst.
     * Die Zone traegt lage_angenommen und automatisch; ihre Annahme steht
     * als Grenze im Bericht. Was sich nicht zuordnen laesst, bleibt roter
     * Befund und wartet auf den Bearbeiter. */
    const KB = window.MODUL_KONTROLLBLATT;
    if (KB && KB.fehlendeBereiche && KB.zoneAnlegen && p.raeume.length) {
      const DZ = window.DATEN_ZONENLAGEN;
      const entfernt = (p.zonen_entfernt || []).map(function (x) {
        return String(x).trim().toLowerCase(); });
      KB.fehlendeBereiche(p).forEach(function (name) {
        /* Was der Bearbeiter gelöscht hat, wird nicht wieder angelegt. Sonst
           lässt sich der Fall „unbeheizter Bereich fehlt" nicht erzwingen
           und damit auch nicht nachweisen, dass die Prüfung greift. */
        if (entfernt.indexOf(String(name).trim().toLowerCase()) >= 0) return;
        if (!(DZ && DZ.lageFuerBereich && DZ.lageFuerBereich(name))) return;
        if (KB.zoneAnlegen(p, name, true)) etwasGetan = true;
      });
    }

    /* 2c  Ein Geschoss, das die Unterlagen BENENNEN und zu dem kein Grundriss
     *     vorliegt.
     *
     * WARUM DAS EINE ANNAHME UND KEINE SPERRE IST. Am echten Blatt stand
     * „nicht sicher ablesbar, vermutlich EG + OG + zurückgesetztes
     * Dachgeschoss/Staffelgeschoss". Das Werkzeug hielt daraufhin die ganze
     * Rechnung an, „nur mit schriftlicher Begründung zu bestätigen". Es ist
     * aber eine LESUNG und keine Lücke: die Unterlagen behaupten die Ebene.
     *
     * Erfunden wird dabei nichts. Die Fläche kommt entweder aus den
     * Aussenmassen, die die zweite Lesung für diese Ebene gelesen hat, oder
     * als ausdrückliche OBERGRENZE aus dem Vollgeschoss darunter — ein
     * zurückgesetztes Geschoss ist kleiner als das darunter. Ohne beides
     * entsteht keine Annahme, und dann bleibt die Sperre stehen. Die
     * Herleitung steht in MODUL_KONTROLLBLATT.fehlendeGeschosse().
     *
     * Angelegt wird EIN Raum, keine Raumaufteilung. Er trägt angenommen,
     * bekommt eine eigene gelbe Zeile im Kontrollblatt, seine Wirkung wird
     * in Kilowatt beziffert, und ein Klick nimmt ihn wieder heraus. */
    /* VORHER AUFRÄUMEN: ein angenommenes Geschoss, dessen Raum der
       Bearbeiter im Raumbuch gelöscht hat, ist aus der Rechnung — der
       Eintrag in geschosse_angenommen darf dann nicht weiterbehaupten,
       „das Werkzeug rechnet es mit N m² mit". Abnahme-Befund vom
       24.08.2026: die Frage nannte 166,01 m² und 12,40 kW für einen längst
       gelöschten Raum. Das Löschen des Raums gilt als „Annahme entfernt",
       derselbe Stand wie über den Knopf (geschossEntfernen): der Eintrag
       geht, das Geschoss steht in geschosse_entfernt, und die Zeile
       „Entferntes Geschoss" sagt, was sich geändert hat. */
    if ((p.geschosse_angenommen || []).length) {
      const verwaist = p.geschosse_angenommen.filter(function (a2) {
        return !p.raeume.some(function (r) {
          return r.id === a2.raum_id
            || (r.angenommen && r.geschoss === a2.kuerzel);
        });
      });
      if (verwaist.length) {
        p.geschosse_angenommen = p.geschosse_angenommen.filter(function (a2) {
          return verwaist.indexOf(a2) < 0;
        });
        p.geschosse_entfernt = p.geschosse_entfernt || [];
        verwaist.forEach(function (a2) {
          if (p.geschosse_entfernt.indexOf(a2.kuerzel) < 0) {
            p.geschosse_entfernt.push(a2.kuerzel);
          }
        });
        etwasGetan = true;
      }
    }
    /* NACHZÜGLER SCHLAGEN DEN PLATZHALTER. Seit die Lesungen gleichzeitig
       laufen, kann das angenommene Geschoss VOR den echten Räumen desselben
       Geschosses entstehen: die zweite Lesung eines Blattes benennt die
       Ebene, der Platzhalter wird angelegt — und die Raumliste des
       Geschoss-Blattes trifft erst danach ein. GEMESSEN in der Live-Abnahme
       am 24.08.2026 (Maas/Langner): „Angenommenes Geschoss EG" mit 239,8 m²
       stand NEBEN sechs gelesenen EG-Räumen — das Erdgeschoss zählte
       doppelt. Der Platzhalter steht für ein Geschoss OHNE Räume; sobald
       gelesene Räume desselben Geschosses vorliegen, geht er wieder heraus,
       mit Vermerk statt still. */
    const platzhalterRaus = p.raeume.filter(function (r) {
      return r.angenommen && r.herkunft && r.herkunft.geschoss_angenommen
        && p.raeume.some(function (x) {
          return x !== r && !x.angenommen
            && geschossKanon(x.geschoss) === geschossKanon(r.geschoss);
        });
    });
    if (platzhalterRaus.length) {
      p.raeume = p.raeume.filter(function (r) {
        return platzhalterRaus.indexOf(r) < 0;
      });
      p.geschosse_angenommen = (p.geschosse_angenommen || []).filter(function (a2) {
        return !platzhalterRaus.some(function (r) {
          return geschossKanon(r.geschoss) === geschossKanon(a2.kuerzel);
        });
      });
      p.offeneFragen = p.offeneFragen || [];
      platzhalterRaus.forEach(function (r) {
        const t = "Das angenommene Geschoss " + r.geschoss + " ("
          + fmt(r.A, 2) + " m² Platzhalter) ist wieder aus dem Raumbuch: "
          + "inzwischen liegen gelesene Räume dieses Geschosses vor, der "
          + "Platzhalter hätte die Fläche doppelt gezählt.";
        if (!p.offeneFragen.some(function (x) { return x.frage === t; })) {
          p.offeneFragen.push({ thema: "Angenommenes Geschoss", art: "grenze",
                                frage: t });
        }
      });
      etwasGetan = true;
    }
    if (KB && KB.fehlendeGeschosse && KB.geschossAnlegen && p.raeume.length) {
      let neueGeschosse = 0;
      KB.fehlendeGeschosse(p).forEach(function (kand) {
        if (KB.geschossAnlegen(p, kand, true)) neueGeschosse++;
      });
      if (neueGeschosse) {
        etwasGetan = true;
        /* EIN NEUES GESCHOSS ÄNDERT DEN STAPEL, UND ZWAR FÜR ANDERE RÄUME.
           Wer bisher oben lag, liegt jetzt darunter: sein Dach wird zur
           Geschossdecke nach innen. bauteileErgaenzen() bildet das richtig
           ab, wird aber nur für Räume gerufen, deren Bauteile „fällig" sind —
           und die Räume darunter sind es nach ihren eigenen Maßstäben nicht.
           Ohne diesen Anstoß trüge das Haus zwei Dächer und die Heizlast
           wäre zu groß. Angefasst wird nur, was das Werkzeug selbst gebildet
           hat; von Hand eingetragene Bauteile bleiben stehen. */
        p.raeume.forEach(function (r) {
          if (!(r.bauteile || []).length) return;
          if (!r.bauteile.every(function (b) { return b.automatisch === true; })) return;
          r.bauteile = [];
          delete r.bauteile_stand;
        });
      }
    }

    // 3  Höhen: aus dem Schnitt, aus der Eingabe, sonst der Rückfallwert
    if (p.raeume.some(function (r) { return !(r.h > 0); })) {
      hoehenUebernehmen();
      etwasGetan = true;
    }

    /* 4  Bauteile je Raum: wo noch keine sind, und wo die vorhandenen aus
          einer inzwischen überholten Raumhöhe oder Raumfläche stammen. Ohne
          den zweiten Fall rechnete die Außenwand mit der Annahme 2,60 m
          weiter, nachdem der Bearbeiter längst 2,30 m eingetragen hatte. */
    /* Dritter Fall: die zweite Lesung hat dem Raum inzwischen ein Fenster
       mehr gegeben, das noch in keinem Bauteil steckt. Ohne ihn wurde
       bauteileErgaenzen() gar nicht erst gerufen, sobald jeder Raum einmal
       Bauteile hatte — die Zuteilung aus der zweiten Lesung lief dann ins
       Leere, weil sie erst DRINNEN entsteht. */
    const zusatzJetzt = fensterZusatzErmitteln(p).zusatz;
    const bauteileFaellig = function (r) {
      if (!(r.bauteile || []).length) return true;
      const s = r.bauteile_stand;
      if (!s) return false;
      /* Diese Weiche kann den Geschossumfang nicht selbst nachrechnen -- er
         entsteht erst in bauteileErgaenzen. Sie fragt deshalb nur, OB der
         Stand die Aussenwandlaenge ueberhaupt kennt. Wurde er vor dem
         23.08.2026 gebildet, kennt er sie nicht; dann sind seine Wandflaechen
         mit dem alten, zu kurzen Umfang gerechnet und gehoeren neu gebildet.
         Danach steht "wl" im Stand, und die Weiche schlaegt nicht wieder an. */
      if ((!Object.prototype.hasOwnProperty.call(s, "wl")
           || !Object.prototype.hasOwnProperty.call(s, "um"))
          && r.bauteile.every(function (b) { return b.automatisch === true; })) {
        return true;
      }
      /* Ein nachgetragener Umfang oder eine gelesene Aussenwandlaenge machen
         die Wandflaeche ueberholt. Neu gebildet wird aber nur, was das
         Werkzeug selbst gebildet hat -- von Hand Angelegtes bleibt. */
      if ((Math.abs(num(r.umfang_m, 0) - num(s.um, 0)) > 0.005
           || Math.abs(num(r.aussenwand_m, 0) - num(s.aw, 0)) > 0.005)
          && r.bauteile.every(function (b) { return b.automatisch === true; })) {
        return true;
      }
      return (Math.abs(num(r.A, 0) - s.A) > 0.005 || Math.abs(num(r.h, 0) - s.h) > 0.005
          || Math.max(0, num(zusatzJetzt[String(r.id || r.name)], 0))
             !== Math.max(0, num(s.fensterZusatz, 0)))
        && r.bauteile.every(function (b) { return b.automatisch === true; });
    };
    /* DIE AUSSENMASSE GEHÖREN IN DIE WEICHE.
       Ohne diesen Vergleich blieb ein übernommenes oder eingetragenes
       Geschossmaß folgenlos, sobald jeder Raum schon einmal Bauteile hatte:
       die Weiche darüber fragt nur nach Raumfläche, Raumhöhe, Umfang und
       Fensterzahl JE RAUM — der Umfang des GESCHOSSES steht dort nicht und
       kann dort auch nicht stehen, weil er erst in bauteileErgaenzen()
       entsteht. Verglichen wird deshalb der Fingerabdruck der Maße gegen
       den, der in den gebauten Bauteilen steckt (massstandJetzt). */
    const massAnders = !!p.bauteiltypen.length
      && massstandJetzt(p) !== String(p.bauteile_massstand || "");
    if (p.bauteiltypen.length && (massAnders || p.raeume.some(bauteileFaellig))) {
      if (bauteileErgaenzen()) etwasGetan = true;
    }

    /* 5  Trennwand zu einem angebauten unbeheizten Bereich.
          Sagen die Lesungen, dass eine Garage oder ein Nebenbau ANGEBAUT
          ist, oder hat der Bearbeiter [Angebaut an: Raum] geantwortet, legt
          das Werkzeug die trennende Wand selbst an — als gekennzeichnete
          Annahme beim angrenzenden Raum, mit der Zone als Gegenseite.
          Nach bauteileErgaenzen, weil das die Raum-Bauteile bei Bedarf erst
          neu bildet und die Wand sonst im selben Zug wieder verschwände.
          Herleitung und Schranken: MODUL_KONTROLLBLATT.zonenWaendeErgaenzen. */
    if (window.MODUL_KONTROLLBLATT
        && window.MODUL_KONTROLLBLATT.zonenWaendeErgaenzen) {
      if (window.MODUL_KONTROLLBLATT.zonenWaendeErgaenzen(p)) etwasGetan = true;
    }
  } finally {
    ergaenzenLaeuft = false;
  }
  return etwasGetan;
}

function rechnen() {
  /* ZWEI GETRENNTE FANGNETZE (Kehrwoche 25.08.2026). Vorher stand K.rechne
     mit KP.pruefeAlles in EINEM try: warf das Pruefmodul NACH einer fertigen
     Rechnung eine Ausnahme, ersetzte der catch das fertige Ergebnis durch
     { fehlerhaft: true, phi_gebaeude: 0 } — eine Pruefliste, die nur faerben
     soll, machte die ganze Zahl kaputt. Jetzt faellt bei einer Ausnahme im
     Pruefmodul nur die Pruefliste aus; die Heizlast bleibt stehen, und ein
     Hinweis im Ergebnis sagt, was fehlt. */
  try {
    App.ergebnis = K.rechne(projektFuerKern(App.p));
  } catch (e) {
    App.ergebnis = { fehlerhaft: true, meldung: String(e && e.message || e),
                     warnungen: [], raeume: [], phi_gebaeude: 0 };
  }
  try {
    App.pruefung = KP ? KP.pruefeAlles(App.p, App.ergebnis, {
      typologie: DT,
      /* DK.pruefeKlima stand bis hierher nur unter dem Eingabefeld im Schritt
         "Objekt". Wer den Schritt einmal ausgefuellt und nicht wieder
         geoeffnet hat, sah eine falsche Norm-Aussentemperatur nie -- sie geht
         aber linear in jede Zahl der Rechnung ein. */
      klima: DK,
      /* Die Zaehler des Kontrollblatts gehen in dieselbe Zaehlung wie alles
         andere. Sonst rechnet der Kopf eine Zahl und das Blatt eine zweite,
         und eine bestaetigte Zeile bleibt oben als Fehler stehen. */
      kontrollblatt: window.MODUL_KONTROLLBLATT || null,
      planEignung: window.MODUL_PLAN ? window.MODUL_PLAN.eignungGesamt() : null,
      kerne: App.kerneGeprueft ? null : [
        { name: "Rechenkern", modul: K },
        { name: "Bauteildaten", modul: DB },
        { name: "Typologie", modul: DT },
        { name: "Plandigitalisierung", modul: window.MODUL_PLAN },
      ],
    }) : null;
    App.kerneGeprueft = true;
  } catch (e) {
    App.pruefung = null;
    (App.ergebnis.warnungen = App.ergebnis.warnungen || []).push(
      "Die Prüfliste ist in diesem Lauf mit einer Ausnahme ausgefallen ("
      + String(e && e.message || e) + "). Die Heizlast selbst ist davon "
      + "unberührt; die Ampel- und Prüfzeilen fehlen, bis der Fehler behoben ist.");
  }
  /* Die vier Proben fangen ihre Ausnahmen selbst (jede hat ihr eigenes
     try/catch); hier stehen sie ausserhalb des Fangnetzes, damit ein Fehler
     in einer Probe nie mehr das Ergebnis oder die Pruefliste mitreisst. */
  bandbreiteRechnen();
  baujahrprobeRechnen();
  hoehenprobeRechnen();
  wirkungAngenommenerGeschosseRechnen();
  return App.ergebnis;
}

/* --------------------------------------------------------------------------
 * Bandbreite des Ergebnisses -- KERN_BANDBREITE
 * --------------------------------------------------------------------------
 * "9,1 kW" sieht gleich aus, ob dahinter zwanzig gemessene oder zwanzig
 * angenommene Werte stehen. KERN_BANDBREITE beziffert den Unterschied und
 * sagt zugleich, WAS zuerst nachzumessen ist -- nach Wirkung sortiert. Das
 * Modul war fertig (1144 Zeilen, eigene Gegenprobe auf Linearitaet) und wurde
 * von keiner Zeile aufgerufen.
 *
 * Nachgemessen am Referenzprojekt: 111 Kernlaeufe in 39 ms, Ergebnis
 * "9,1 kW, geschätzte Spanne 8,2 bis 10,1 kW"; die eigene Gegenprobe des
 * Moduls weicht um hoechstens 0,94 % von der linearen Vorhersage ab, worauf
 * das Zwei-Punkt-Verfahren beruht.
 *
 * 39 ms bei JEDEM Tastendruck waeren trotzdem zu viel: gezeichnet wird nach
 * jeder Eingabe. Deshalb der Fingerabdruck -- neu gerechnet wird nur, wenn
 * sich am Ergebnis oder am Umfang des Projekts etwas geaendert hat.
 * ----------------------------------------------------------------------- */
function bandbreiteRechnen() {
  const B = window.KERN_BANDBREITE;
  const e = App.ergebnis;
  if (!B || !e || e.fehlerhaft || !(e.phi_gebaeude > 0)) { App.bandbreite = null; return; }
  const bauteile = (App.p.raeume || []).reduce(function (s, r) {
    return s + ((r.bauteile || []).length);
  }, 0);
  const abdruck = [Math.round(e.phi_gebaeude * 10), (App.p.raeume || []).length, bauteile,
                   (App.p.bauteiltypen || []).length, App.p.meta.baujahr,
                   (App.p.zonen || []).length].join("|");
  if (App.bandbreite && App.bandbreite._abdruck === abdruck) return;
  try {
    const r = B.rechne(projektFuerKern(App.p), { kern: K, typologie: DT,
      /* Die Spanne streut innerhalb der Baualtersklasse. Ob die Klasse selbst
         nur angenommen ist, weiss das Modul nicht von allein -- und ohne diese
         Auskunft verspricht die Spanne mehr, als sie deckt. */
      baujahr_angenommen: bjAngenommen() });
    if (r && r.ok) { r._abdruck = abdruck; App.bandbreite = r; }
    else App.bandbreite = null;
  } catch (ex) {
    App.bandbreite = null;
  }
}

/* --------------------------------------------------------------------------
 * Was das angenommene Baujahr an der Zahl aendert -- KERN_BAUJAHRPROBE
 * --------------------------------------------------------------------------
 * Das Baujahr ist auf Sebastians Blatt nicht angegeben, sondern aus dem
 * Plandatum abgeleitet. Aus ihm kommen die U-Werte, aus den U-Werten die
 * Heizlast -- und aus demselben Baujahr kam bisher auch der Erwartungswert,
 * gegen den geprueft wurde. Der Kreis schloss sich selbst.
 *
 * Aufbrechen laesst er sich nicht durch einen besseren Erwartungswert, den es
 * nicht gibt, sondern nur dadurch, dass die WIRKUNG der Annahme beziffert
 * neben der Zahl steht. Genau das rechnet KERN_BAUJAHRPROBE: dasselbe Projekt
 * gegen jede Baualtersklasse, nur das Baujahrfeld veraendert.
 * ----------------------------------------------------------------------- */
function baujahrprobeRechnen() {
  const BP = window.KERN_BAUJAHRPROBE;
  const e = App.ergebnis;
  if (!BP || !e || e.fehlerhaft || !(e.phi_gebaeude > 0)) { App.baujahrprobe = null; return; }
  const an = (App.p.annahmen && App.p.annahmen.baujahr) || null;
  /* KEIN BAUJAHR HEISST NICHT KEIN FÄCHER (25.08.2026).
   *
   * Traegt die Rueckfallklasse die Rechnung (daten_typologie.ohneBaujahr,
   * „1969 bis 1978"), fand faecher() in p.meta.baujahr nichts und gab
   * „kein_baujahr" zurueck — ausgerechnet in dem Fall, in dem die
   * Gegenrechnung ueber alle Klassen die einzige Zahl ist, die die Annahme
   * beziffert. GEMESSEN im Browser am Stand „BV 2-0887 Ziolkowski" ohne
   * Baujahr: 14,38 kW auf der Seite, daneben kein Faecher.
   * Jetzt vertritt das letzte Jahr der Rueckfallklasse das fehlende Baujahr.
   * Gerechnet wird nichts anderes: die Bauteile tragen bereits die U-Werte
   * dieser Klasse, der Punktwert der eigenen Zeile trifft deshalb die
   * laufende Zahl. Nur der erste Satz sagt, dass hier niemand ein Baujahr
   * angesetzt hat (Option ohne_baujahr). */
  const rueck = (!baujahrGueltig(App.p.meta.baujahr)
    && App.p.annahmen && App.p.annahmen.baujahr_klasse
    && DT && DT.ohneBaujahr) ? DT.ohneBaujahr(App.p.meta.gebaeudeart) : null;
  const rueckJahr = rueck && Number.isFinite(rueck.bis) ? rueck.bis : null;
  const abdruck = [Math.round(e.phi_gebaeude * 10), (App.p.raeume || []).length,
                   (App.p.bauteiltypen || []).length, App.p.meta.baujahr,
                   App.p.meta.gebaeudeart, an ? "an" : "-",
                   rueckJahr === null ? "-" : "rf" + rueckJahr].join("|");
  if (App.baujahrprobe && App.baujahrprobe._abdruck === abdruck) return;
  try {
    const r = BP.faecher(projektFuerKern(App.p), {
      kern: K, typologie: DT,
      baujahr: rueckJahr === null ? undefined : rueckJahr,
      ohne_baujahr: rueckJahr !== null,
      angenommen: !!an || rueckJahr !== null,
      herkunft: an ? (an.kurz || null)
        : (rueck ? "Baujahr unbekannt — Rückfallklasse " + rueck.label : null),
    });
    if (r && r.ok) { r._abdruck = abdruck; App.baujahrprobe = r; }
    else App.baujahrprobe = r && r.grund ? Object.assign({ _abdruck: abdruck }, r) : null;
  } catch (ex) {
    App.baujahrprobe = null;
  }
}

/* --------------------------------------------------------------------------
 * Was die angenommene Höhe an der Zahl aendert
 * --------------------------------------------------------------------------
 * Dasselbe Verfahren wie bei der Baujahrprobe und aus demselben Grund: eine
 * Annahme, die man nicht beziffern kann, ist eine Behauptung. Gerechnet wird
 * dasselbe Projekt zweimal, nur mit den angenommenen Geschossen zwanzig
 * Zentimeter niedriger und zwanzig Zentimeter hoeher.
 *
 * DIE WANDFLAECHEN GEHEN MIT. Eine Aussenwand entsteht als Laenge mal Hoehe
 * abzueglich der Oeffnungen; wer nur die Raumhoehe aendert und die Wand
 * stehen laesst, misst nur den Lueftungsanteil und zeigt damit weniger als
 * die halbe Wirkung. Die Laenge laesst sich zurueckrechnen: Wandflaeche plus
 * Fenster plus Tuer geteilt durch die alte Hoehe. Fenster und Tueren bleiben,
 * wie sie sind -- ein Fenster waechst nicht mit dem Geschoss.
 *
 * KEINE ERFUNDENE ZAHL. Die zwanzig Zentimeter sind kein Vorschlag fuer eine
 * Hoehe, sondern ein Schritt: sie beziffern, wie stark diese eine Annahme
 * durchschlaegt. Welche Hoehe richtig ist, sagt allein der Plan.
 * ----------------------------------------------------------------------- */

/* Fuehrt die Aussenwandflaechen eines Raums einer neuen Hoehe nach -- EINE
 * Stelle fuer zwei Verwender: die Hoehenprobe unten rechnet damit ihre
 * Faecher, und hoehenUebernehmen() haelt damit die gebauten Bauteile aktuell.
 * Vorher stand die Umrechnung nur in der Probe: die Gegenrechnung wusste,
 * dass die Waende mitgehen, die eigentliche Rechnung nicht. Wer eine falsch
 * gelesene Geschosshoehe im Fenster berichtigte, korrigierte Volumen und
 * Lueftungsanteil -- die Transmission rechnete mit der alten Wandflaeche
 * weiter. GEMESSEN am Fall "BV 2-0887 Ziolkowski" (3 Geschosse, 13 Raeume):
 * die Transmission traegt dort rund 62 Prozent der Heizlast.
 *
 * nurAutomatische: im lebenden Projekt wird nur nachgefuehrt, was das
 * Werkzeug selbst gebildet hat (b.automatisch) -- eine von Hand eingetragene
 * Flaeche ist geprueft und gehoert dem Bearbeiter (der Eingabe-Verteiler
 * loescht das Kennzeichen, sobald jemand die Flaeche aendert). Die Probe
 * rechnet an einer Wegwerf-Kopie und darf alle Waende skalieren. */
function wandflaechenAnHoeheAnpassen(r, alt, neu, nurAutomatische) {
  if (!(alt > 0) || !(neu > 0) || Math.abs(neu - alt) < 0.0005) return;
  /* Senkrechte Huelle des Raums: die Wandflaeche vor Abzug der Oeffnungen
     ist Laenge mal Hoehe. Fenster und Tueren bleiben, wie sie sind -- ein
     Fenster waechst nicht mit dem Geschoss. */
  let wand = 0, oeffnung = 0;
  (r.bauteile || []).forEach(function (b) {
    if (b.art === "aussenwand") wand += num(b.A, 0);
    else if (b.art === "fenster" || b.art === "tuer") oeffnung += num(b.A, 0);
  });
  if (!(wand > 0)) return;
  const laenge = (wand + oeffnung) / alt;
  const anteil = Math.max(0, laenge * neu - oeffnung) / wand;
  (r.bauteile || []).forEach(function (b) {
    if (b.art !== "aussenwand") return;
    if (nurAutomatische && b.automatisch !== true) return;
    b.A = Math.round(num(b.A, 0) * anteil * 100) / 100;
  });
}

const HOEHENPROBE_SCHRITT = 0.20;
/* DIE PROBE LÄUFT IMMER, NICHT NUR ÜBER ANGENOMMENE GESCHOSSE.
 *
 * Sie hing an App.p.annahmen.hoehe und lief damit genau dann nicht, wenn die
 * Höhe als aus dem Schnitt gelesen geführt war. Eine gelesene Höhe ist aber
 * nicht sicherer als eine angenommene, sie ist nur anders begründet — GEMESSEN
 * am 23.08.2026 an „BV 2-0887 Ziolkowski": zwei Läufe derselben Datei gaben
 * dieselbe Maßkette einmal als lichte Höhe und einmal als Geschosshöhe zurück.
 * Genau die Größe, deren Lesung nicht wiederholbar ist, war die einzige, für
 * die keine Wirkung beziffert wurde. Jede Höhe fächert jetzt auf; welche davon
 * angenommen sind, steht daneben. */
/** WAS DIE ANNAHME „NICHT GEZEICHNETES GESCHOSS" AM ERGEBNIS AUSMACHT.
 *
 *  Eine Annahme, deren Wirkung niemand beziffert, ist eine versteckte Zahl.
 *  Hier wird sie sichtbar: dieselbe Rechnung ein zweites Mal, ohne die
 *  angenommenen Räume. Die Differenz steht danach an der Annahme und im
 *  Kontrollblatt. Gerechnet wird nur, wenn es überhaupt eine Annahme gibt —
 *  ein zweiter Durchgang auf jedem Projekt wäre Verschwendung. */
function wirkungAngenommenerGeschosseRechnen() {
  const liste = App.p.geschosse_angenommen || [];
  const e = App.ergebnis;
  if (!liste.length || !e || e.fehlerhaft || !(e.phi_gebaeude > 0)) return;
  try {
    const ids = {};
    liste.forEach(function (a) { if (a.raum_id) ids[a.raum_id] = true; });
    const ohne = (App.p.raeume || []).filter(function (r) { return !ids[r.id]; });
    if (!ohne.length || ohne.length === (App.p.raeume || []).length) return;
    const alle = App.p.raeume;
    let erg = null;
    try {
      App.p.raeume = ohne;
      erg = K.rechne(projektFuerKern(App.p));
    } finally {
      App.p.raeume = alle;
    }
    if (!erg || erg.fehlerhaft || !(erg.phi_gebaeude >= 0)) return;
    const d = e.phi_gebaeude - erg.phi_gebaeude;
    /* Eine Annahme: die ganze Differenz gehört ihr. Mehrere: sie wird nach
       Fläche aufgeteilt, und das steht auch so da — eine genauere Zuteilung
       gäbe es nur mit einem Lauf je Annahme. */
    const summeA = liste.reduce(function (s, a) { return s + num(a.A, 0); }, 0);
    liste.forEach(function (a) {
      a.wirkung_w = (liste.length === 1 || !(summeA > 0))
        ? d
        : d * (num(a.A, 0) / summeA);
      a.wirkung_geteilt = liste.length > 1;
    });
  } catch (ex) {
    liste.forEach(function (a) { delete a.wirkung_w; });
  }
}

function hoehenprobeRechnen() {
  const e = App.ergebnis;
  const an = (App.p.annahmen && App.p.annahmen.hoehe) || null;
  if (!e || e.fehlerhaft || !(e.phi_gebaeude > 0)) { App.hoehenfaecher = null; return; }
  const geschosse = [];
  (App.p.raeume || []).forEach(function (r) {
    if (!(num(r.h, 0) > 0)) return;
    const g = r.geschoss || "";
    if (geschosse.indexOf(g) < 0) geschosse.push(g);
  });
  if (!geschosse.length) { App.hoehenfaecher = null; return; }
  const angenommene = ((an && an.geschosse) || []).filter(function (k) {
    return geschosse.indexOf(k) >= 0; });
  const abdruck = [Math.round(e.phi_gebaeude * 10), (App.p.raeume || []).length,
                   geschosse.join(","), angenommene.join(","),
                   (App.p.raeume || []).map(function (r) {
                     return Math.round(num(r.h, 0) * 100); }).join(".")].join("|");
  if (App.hoehenfaecher && App.hoehenfaecher._abdruck === abdruck) return;
  try {
    const faecher = [-HOEHENPROBE_SCHRITT, HOEHENPROBE_SCHRITT].map(function (d) {
      /* NUR DIE RÄUME KOPIEREN, NICHT DAS GANZE PROJEKT.
       *
       * Hier stand JSON.parse(JSON.stringify(App.p)). Im Browser hängen an
       * App.p.plan.seiten die lebenden pdf.js-Objekte, und die sind im Kreis
       * verkettet: JSON.stringify wirft „Converting circular structure to
       * JSON". Der Wurf landete im catch weiter unten, App.hoehenfaecher
       * wurde still auf null gesetzt — die Probe hat im wirklichen Ablauf
       * NIE ein Ergebnis geliefert, weder für gelesene noch für angenommene
       * Höhen. GEMESSEN am 23.08.2026 im Browser am echten Durchlauf mit
       * „BV 2-0887 Ziolkowski": e = 6.949 W, drei Geschosse, und trotzdem
       * App.hoehenfaecher === null. In einem aus der Datei geladenen Projekt
       * fiel es nicht auf, weil dort keine lebenden Seiten hängen.
       *
       * Verändert werden ohnehin nur die Räume. Alles andere bleibt am
       * Original hängen und wird nicht angefasst. */
      const kopie = Object.assign({}, App.p, {
        raeume: JSON.parse(JSON.stringify(App.p.raeume || [])),
      });
      let beruehrt = 0;
      (kopie.raeume || []).forEach(function (r) {
        if (geschosse.indexOf(r.geschoss) < 0) return;
        const alt = num(r.h, 0);
        const neu = Math.round((alt + d) * 1000) / 1000;
        if (!(alt > 0) || !(neu > 0)) return;
        beruehrt++;
        wandflaechenAnHoeheAnpassen(r, alt, neu, false);
        r.h = neu;
        if (r.V) delete r.V;      // sonst bliebe das alte Volumen stehen
      });
      if (!beruehrt) return null;
      const erg = K.rechne(projektFuerKern(kopie));
      if (!erg || erg.fehlerhaft || !(erg.phi_gebaeude > 0)) return null;
      return { schritt: d, w: erg.phi_gebaeude,
               abweichung_prozent: (erg.phi_gebaeude - e.phi_gebaeude)
                 / e.phi_gebaeude * 100 };
    }).filter(Boolean);
    App.hoehenfaecher = faecher.length
      ? { ok: true, _abdruck: abdruck, basis_w: e.phi_gebaeude,
          geschosse: geschosse, angenommene: angenommene,
          alle_gelesen: angenommene.length === 0,
          schritt: HOEHENPROBE_SCHRITT, faecher: faecher }
      : { ok: false, _abdruck: abdruck, geschosse: geschosse,
          grund: "Die Vergleichsrechnung lieferte kein brauchbares Ergebnis." };
  } catch (ex) {
    /* EIN STILLES null IST DAS, WAS DEN BEFUND ÜBERHAUPT ERST MÖGLICH MACHTE.
       Hier stand nur App.hoehenfaecher = null. Die Probe konnte damit über
       Monate an jedem Durchlauf scheitern, ohne dass irgendwo ein Zeichen
       stand — sie sah aus wie „nichts zu melden". Der Grund geht jetzt mit
       und wird angezeigt. */
    App.hoehenfaecher = { ok: false, _abdruck: abdruck, geschosse: geschosse,
      grund: String((ex && ex.message) || ex) };
  }
}

/* --------------------------------------------------------------------------
 * Setzen eines Wertes ueber einen Pfad, z. B. "meta.bezeichnung"
 * ----------------------------------------------------------------------- */
function setzen(pfad, wert) {
  const teile = pfad.split(".");
  let o = App.p;
  for (let i = 0; i < teile.length - 1; i++) {
    if (o[teile[i]] === undefined || o[teile[i]] === null) o[teile[i]] = {};
    o = o[teile[i]];
  }
  o[teile[teile.length - 1]] = wert;
}
function holen(pfad) {
  return pfad.split(".").reduce(function (o, k) {
    return o === undefined || o === null ? undefined : o[k];
  }, App.p);
}

/* --------------------------------------------------------------------------
 * Bausteine für das Formular
 * ----------------------------------------------------------------------- */
function feld(label, pfad, opt) {
  const o = opt || {};
  const wert = holen(pfad);
  const v = wert === null || wert === undefined ? "" : wert;
  const typ = o.typ || "text";
  /* Ein rot umrandetes Pflichtfeld heißt „hier fehlt etwas, und es hält
     dich auf". Für die Postleitzahl stimmt der zweite Teil nicht mehr,
     sobald die Klimadaten aus dem Ort angenommen sind: die Rechnung läuft,
     die Annahme steht mit Begründung darüber und der Stern bleibt. Rot bliebe
     hier ein Widerspruch zur Leiste, die im selben Augenblick meldet, alle
     Pflichtangaben lägen vor. */
  const stillPflicht = pfad === "meta.plz"
    && !!(App.p.annahmen && App.p.annahmen.klima);
  const kl = o.pflicht && v === "" && !stillPflicht ? " fehlt" : "";
  const einheit = o.einheit
    ? '<span class="e">' + esc(o.einheit) + "</span>" : "";
  /* KEIN type="number" MEHR: ein solches Feld verwirft die deutsche
     Kommaeingabe „8,00" STUMM — der Browser meldet value "" und niemand
     sieht, dass nichts ankam (Abnahme-Befund vom 24.08.2026). Zahlenfelder
     sind deshalb Textfelder mit inputmode="decimal" (Ziffernblock auf dem
     Telefon); geparst wird überall über num(), das Komma und Punkt nimmt.
     Das erledigt zugleich das „Baujahr −1" aus der Abnahme: ohne Zahlenfeld
     gibt es keine Pfeiltasten und kein Mausrad, das ein leeres Feld auf −1
     springen lässt. min/max bleiben als Attribute stehen, falls ein Feld
     einmal ausdrücklich als Zahlenfeld zurückkommt. */
  const echterTyp = typ === "number" ? "text" : typ;
  return '<label class="feld"><span>' + esc(label)
    + (o.pflicht ? ' <b class="pflicht">*</b>' : "")
    + "</span>" + (o.einheit ? '<span class="einheit">' : "")
    + '<input class="' + kl + '" type="' + echterTyp + '" data-pfad="' + esc(pfad) + '"'
    + (typ === "number" ? ' inputmode="decimal"' : "")
    + (o.step ? ' step="' + o.step + '"' : "")
    + (o.min != null ? ' min="' + o.min + '"' : "")
    + (o.max != null ? ' max="' + o.max + '"' : "")
    + (o.platzhalter ? ' placeholder="' + esc(o.platzhalter) + '"' : "")
    + ' value="' + esc(v) + '">' + einheit
    + (o.einheit ? "</span>" : "")
    + (o.hilfe ? '<span style="font-size:12px;color:var(--mute);display:block;margin-top:3px">'
        + esc(o.hilfe) + "</span>" : "")
    + herkunftshinweis(pfad)
    + "</label>";
}

/** Zeigt unter einem Feld, woher sein Wert stammt, wenn er nicht von Hand
 *  eingetragen wurde. Der Wert bleibt überschreibbar; sobald jemand ihn
 *  ändert, verschwindet der Hinweis (siehe Eingabeverteiler). */
function herkunftshinweis(pfad) {
  const h = App.p.meta_herkunft || {};
  const k = /^meta\./.test(pfad) ? pfad.slice(5) : null;
  if (!k || !h[k]) return "";
  /* Kurz halten: auf Schritt 2 stehen fünf dieser Hinweise nebeneinander,
     und ein dreizeiliger Dateiname unter jedem Feld erschlägt das Formular.
     Das Blatt steht im Titel und erscheint beim Zeigen darauf. */
  return '<span class="herkunft"' + (h[k].blatt
      ? ' title="aus dem Schriftfeld von ' + esc(h[k].blatt) + '"' : "")
    + ">aus dem Plan, bitte prüfen</span>";
}

/** Mehrzeiliges Feld, zum Beispiel für die Liste der ausgewerteten
 *  Unterlagen. Bindet über denselben Pfadmechanismus wie feld(). */
function mehrzeile(label, pfad, platzhalter, hilfe) {
  const w = holen(pfad);
  const v = Array.isArray(w) ? w.join("\n") : (w === null || w === undefined ? "" : w);
  return '<label class="feld" style="display:block;margin-top:12px"><span>'
    + esc(label) + "</span>"
    + '<textarea rows="4" style="width:100%;font:inherit;padding:8px 10px;'
    + 'border:1px solid var(--linie);border-radius:8px;resize:vertical" '
    + 'data-pfad="' + esc(pfad) + '"'
    + (platzhalter ? ' placeholder="' + esc(platzhalter) + '"' : "")
    + ">" + esc(v) + "</textarea>"
    + (hilfe ? '<span style="font-size:12px;color:var(--mute);display:block;'
        + 'margin-top:3px">' + esc(hilfe) + "</span>" : "")
    + "</label>";
}

function auswahl(label, pfad, optionen, opt) {
  const o = opt || {};
  const wert = holen(pfad);
  return '<label class="feld"><span>' + esc(label)
    + (o.pflicht ? ' <b class="pflicht">*</b>' : "") + "</span>"
    + '<select data-pfad="' + esc(pfad) + '"' + (o.neurender ? ' data-neurender="1"' : "") + ">"
    + optionen.map(function (x) {
        return '<option value="' + esc(x.v) + '"'
          + (String(x.v) === String(wert) ? " selected" : "") + ">" + esc(x.t) + "</option>";
      }).join("")
    + "</select></label>";
}

/* --------------------------------------------------------------------------
 * Rendern
 * ----------------------------------------------------------------------- */
function render() {
  /* Erst ausfüllen, was sich ausfüllen lässt, dann rechnen. So steht nach
     jeder Eingabe sofort ein vollständiges Ergebnis da, statt einer Liste
     von Dingen, die noch fehlen. */
  if (automatischErgaenzen()) { /* die Rechnung unten sieht die Ergänzung */ }
  rechnen();
  sichern();
  const merk = fokusMerken();
  renderSchritte();
  renderInhalt();
  renderPanel();
  fokusZurueck(merk);
}
window.render = render;
/* MODUL_PLAN meldet eine von Hand gemessene Strecke hierüber zurück, damit
   die Maßstabsproben im Kontrollblatt sie sehen. Die Funktion wird direkt
   zugewiesen und nicht in eine zweite gewickelt: eine Hülle mit demselben
   Namen ruft sich selbst auf, weil der blosse Name auf window zeigt. */
window.massstabsprobeSpeisen = massstabsprobeSpeisen;

/* Neu zeichnen heisst: innerHTML austauschen. Das Feld, in dem gerade getippt
   wird, verschwindet dabei mitsamt Schreibmarke. Bei der Postleitzahl war das
   taeglich zu spueren: nach der ersten Ziffer war der Fokus weg und im Feld
   stand "3". Deshalb wird vor dem Zeichnen gemerkt, welches Feld den Fokus
   hatte und wo die Schreibmarke stand, und danach beides wiederhergestellt.
   Erkannt wird das Feld an seinen data-Merkmalen, nicht an der Position in der
   Seite; die Reihenfolge kann sich beim Zeichnen aendern. */
const FOKUS_MERKMALE = ["pfad", "liste", "i", "k", "rbt", "zonebt", "schicht",
                        "geschosshoehe", "kbPfad", "kbQuelle", "kiraum",
                        "rfPfad", "rfQuelle"];
function fokusMerken() {
  const el = document.activeElement;
  if (!el || !el.dataset) return null;
  if (["INPUT", "TEXTAREA", "SELECT"].indexOf(el.tagName) < 0) return null;
  const teile = FOKUS_MERKMALE
    .filter(function (m) { return el.dataset[m] !== undefined; })
    .map(function (m) { return "[data-" + m.replace(/[A-Z]/g, function (c) {
      return "-" + c.toLowerCase(); }) + '="' + String(el.dataset[m]).replace(/"/g, '\\"') + '"]'; });
  if (!teile.length) return null;
  let anfang = null, ende = null;
  try { anfang = el.selectionStart; ende = el.selectionEnd; } catch (e) {}
  return { wahl: el.tagName.toLowerCase() + teile.join(""), anfang: anfang, ende: ende };
}
function fokusZurueck(merk) {
  if (!merk) return;
  let el = null;
  try { el = document.querySelector(merk.wahl); } catch (e) { return; }
  if (!el || el === document.activeElement) return;
  el.focus({ preventScroll: true });
  if (merk.anfang != null) {
    try { el.setSelectionRange(merk.anfang, merk.ende); } catch (e) {}
  }
}

function renderSchritte() {
  const imDetail = SCHRITTE_DETAIL.some(function (x) { return x.id === App.schritt; });
  /* DER CHEVRON MUSS TUN, WAS ER ZEIGT.
   *
   * Bisher stand hier App.detailOffen ODER "wir sind in einem Detailschritt".
   * Wer im Expertenmodus stand und auf den Chevron klickte, schaltete zwar
   * App.detailOffen um — das ODER hielt die Liste aber offen, und auf dem
   * Bildschirm geschah nichts. Ein Pruefer hat das am 24.08.2026 als "zwei
   * tote Klicks" gemessen. Jetzt oeffnet das BETRETEN eines Detailschritts
   * die Liste genau einmal (schrittWechselMerken unten), und danach gilt
   * allein App.detailOffen: der Chevron klappt sichtbar zu und wieder auf,
   * auch mitten im Expertenmodus. */
  schrittWechselMerken(imDetail);
  const detailOffen = !!App.detailOffen;
  const stand = SCHRITTE.filter(function (s) { return schrittErledigt(s.id); }).length;
  $("#schritte").innerHTML =
    '<p class="schrittstand">' + (imDetail ? "Expertenmodus"
      : "Schritt " + aktuelleNummer() + " von " + SCHRITTE.length) + "</p>"
  + '<div class="schrittbalken" role="presentation"><span style="transform:scaleX('
  + (stand / SCHRITTE.length).toFixed(3) + ')"></span></div>'
  + SCHRITTE.map(function (s) {
    const erledigt = schrittErledigt(s.id);
    return '<a href="#" data-schritt="' + s.id + '"'
      + (App.schritt === s.id ? ' class="aktiv" aria-current="step"' : "") + '>'
      + '<span class="nr' + (erledigt ? " fertig" : "") + '">'
      + (erledigt ? ikon("haken") : s.nr) + "</span>"
      + '<span class="txt">' + esc(s.titel) + "</span></a>";
  }).join("")
  + '<div class="feingruppe">'
  + '<a href="#" class="feinschalter" data-aktion="detailUmschalten" '
  + 'aria-expanded="' + (detailOffen ? "true" : "false") + '">'
  + ikon(detailOffen ? "pfeil-unten" : "pfeil-rechts") + "<span>Expertenmodus</span></a>"
  + (detailOffen
    ? SCHRITTE_DETAIL.map(function (s) {
        return '<a href="#" class="fein' + (App.schritt === s.id ? " aktiv" : "") + '"'
          + (App.schritt === s.id ? ' aria-current="step"' : "")
          + ' data-schritt="' + s.id + '"><span class="txt">' + esc(s.titel) + "</span></a>";
      }).join("")
    : "")
  + "</div>";

  /* Auf schmalen Fenstern liegt die Leiste quer und rollt seitlich. Steht man
     auf Schritt 4, ist der Eintrag sonst rechts ausserhalb des Bildes und die
     Frage "wo bin ich" bleibt unbeantwortet. */
  const leiste = $("#schritte");
  const jetzt = $("a.aktiv", leiste);
  if (jetzt && leiste.scrollWidth > leiste.clientWidth + 4) {
    const l = jetzt.offsetLeft, r = l + jetzt.offsetWidth;
    if (l < leiste.scrollLeft || r > leiste.scrollLeft + leiste.clientWidth) {
      leiste.scrollLeft = Math.max(0, l - 16);
    }
  }
}

/** Öffnet die Expertenliste beim BETRETEN eines Detailschritts — egal auf
 *  welchem Weg (Leiste, Verweis in einer Karte, Aktion wie stempelUebernehmen,
 *  die App.schritt direkt setzt). Nur beim Wechsel, nicht bei jedem Zeichnen:
 *  sonst wäre der Chevron wieder tot. */
function schrittWechselMerken(imDetail) {
  if (App.schrittGezeichnet !== App.schritt) {
    App.schrittGezeichnet = App.schritt;
    if (imDetail) App.detailOffen = true;
  }
}

/** Nummer des Schritts, auf dem der Bearbeiter gerade steht. */
function aktuelleNummer() {
  const s = SCHRITTE.find(function (x) { return x.id === App.schritt; });
  return s ? s.nr : SCHRITTE.length;
}

/** Die Fussleiste jedes Schritts: zurueck, weiter, und auf dem letzten Schritt
 *  die eigentliche Handlung. Vorher war der einzige Weg vorwaerts die Leiste
 *  links; wer geradeaus arbeitet, sah nirgends, was als Naechstes kommt. */
/** Wohin „Zurück zum Ablauf" führt: zuletzt besuchter Hauptschritt,
 *  ersatzweise das Ergebnis, ohne Räume der Anfang. Eine Funktion für Kopf-
 *  UND Fußleiste, sonst zeigen zwei Knöpfe mit demselben Wort auf zwei Ziele. */
function rueckwegZiel() {
  return App.hauptZuletzt || (App.p.raeume.length ? "ergebnis" : "start");
}

/** Der Rückweg OBEN im Expertenmodus. Ein Prüfer hat am 24.08.2026 gemessen,
 *  dass der einzige Rückweg unter einer bildschirmlangen Tabelle lag —
 *  „unauffindbar". Der Knopf steht deshalb zusätzlich über dem Inhalt; die
 *  Fußleiste bleibt, wer unten ankommt, muss nicht wieder hochrollen. */
function schrittKopfleiste() {
  const imDetail = SCHRITTE_DETAIL.some(function (x) { return x.id === App.schritt; });
  if (!imDetail) return "";
  const s = SCHRITTE_DETAIL.find(function (x) { return x.id === App.schritt; });
  return '<nav class="fussleiste" aria-label="Zurück im Ablauf" '
    + 'style="margin:0 0 14px;padding:0;border:0">'
    + '<button class="btn" data-schritt="' + esc(rueckwegZiel()) + '">'
    + ikon("pfeil-links") + "Zurück zum Ablauf</button>"
    + '<span style="align-self:center;font-size:13px;color:var(--mute)">'
    + "Expertenmodus · " + esc(s ? s.titel : "") + "</span>"
    + '<div class="fuell"></div></nav>';
}

function schrittFussleiste() {
  const i = SCHRITTE.findIndex(function (x) { return x.id === App.schritt; });
  if (i < 0) {
    /* Expertenmodus: ein Weg zurueck in den Hauptlauf, sonst nichts. */
    return '<nav class="fussleiste" aria-label="Weiter im Ablauf">'
      + '<button class="btn" data-schritt="' + esc(rueckwegZiel()) + '">'
      + ikon("pfeil-links")
      + "Zurück zum Ablauf</button><div class=\"fuell\"></div></nav>";
  }
  const zurueck = i > 0 ? SCHRITTE[i - 1] : null;
  const weiter = i < SCHRITTE.length - 1 ? SCHRITTE[i + 1] : null;
  return '<nav class="fussleiste" aria-label="Weiter im Ablauf">'
    + (zurueck
      ? '<button class="btn" data-schritt="' + zurueck.id + '">' + ikon("pfeil-links")
        + esc(zurueck.titel) + "</button>"
      : "")
    + '<div class="fuell"></div>'
    + (weiter
      ? '<button class="btn primaer" data-schritt="' + weiter.id + '">'
        + esc(weiter.titel) + ikon("pfeil-rechts") + "</button>"
      /* Der gelbe Handlungsknopf steht auf der Ergebnisseite OBEN an der
         Zahl (ergebnisKopfKarte). Gelb ist im Markenbuch die EINE Handlung;
         hier unten steht derselbe Weg deshalb in Blau. */
      : '<button class="btn primaer" id="btnBerichtFuss" data-aktion="bericht" '
        + 'title="Druckfassung für den Auftraggeber: ohne Bandbreite, Konfidenz, '
        + 'Quellen, BEG-Bewertung, offene Punkte und Prüfungen">'
        + ikon("blatt") + "Bericht erstellen</button>"
        + '<button class="btn" data-aktion="berichtIntern" '
        + 'title="Vollbericht für die interne Ablage. Nicht für den Versand.">'
        + "Interne Fassung mit Herkunft und Prüfungen</button>")
    + "</nav>";
}

/** Ist dieser Schritt so weit, dass man weitergehen kann? */
function schrittErledigt(id) {
  const p = App.p;
  switch (id) {
    case "start":    return ((p.plan && (p.plan.seiten || []).length) > 0)
                        || ((p.plan && (p.plan.bilder || []).length) > 0)
                        || p.raeume.length > 0;
    /* Erledigt sind die Rueckfragen, wenn dieselbe Liste, die der Schritt
       stellt, leer ist — nicht ein zweiter Zaehler mit eigener Meinung. */
    case "rueckfragen": return p.raeume.length > 0 && rueckfragenListe().length === 0;
    case "projekt":  return !!(p.meta.bezeichnung && p.klima.theta_e != null
                               && baujahrGueltig(p.meta.baujahr));
    /* Erledigt ist das Prüfblatt, wenn jeder Raum entweder belegt oder
       ausdrücklich durchgegangen ist — also wenn seine Kopfzeile „nichts mehr
       zu prüfen" sagt. Gezählt wird mit derselben Funktion, die auch die
       Kopfzeile rechnet; ein zweiter Zähler an dieser Stelle wäre der sichere
       Weg zu einem Haken, der etwas anderes behauptet als die Zeile darüber. */
    case "pruefblatt": {
      if (!p.raeume.length) return false;
      const PB = window.MODUL_PRUEFBLATT;
      if (!PB) return false;
      return PB.stand(p, App.pruefung && App.pruefung.massstab
        ? { massstab_guete: App.pruefung.massstab.guete } : {}).pruefpunkte === 0;
    }
    case "kontrolle": return p.raeume.length > 0
                        && p.raeume.every(function (r) { return r.A > 0 && r.h > 0 && r.we; });
    default:         return false;
  }
}

/* Jeder Eintrag der beiden Leisten braucht hier einen Zeichner. Fehlt einer,
   fuehrt der Klick auf eine leere Seite; genau das war bei "pruefung" der Fall.
   validierung/oberflaeche_test.js geht die Leisten durch und verlangt fuer
   jeden Eintrag sichtbaren Inhalt. */
const ZEICHNER = {
  start: schrittStart, rueckfragen: schrittRueckfragen,
  projekt: schrittProjekt,
  pruefblatt: schrittPruefblatt, kontrolle: schrittKontrolle,
  ergebnis: schrittErgebnis,
  plan: schrittPlan, bauteile: schrittBauteile, zonen: schrittZonen,
  raeume: schrittRaeume, pruefung: schrittPruefung,
};
window.ZEICHNER = ZEICHNER;

function renderInhalt() {
  const f = ZEICHNER[App.schritt];
  $("#inhalt").innerHTML = sicherungsKarte() + schrittKopfleiste()
    + (f ? f() : "") + schrittFussleiste();
  if (App.schritt === "plan" && window.MODUL_PLAN) window.MODUL_PLAN.aktivieren();
  if (App.schritt === "kontrolle" && window.MODUL_KONTROLLBLATT) {
    window.MODUL_KONTROLLBLATT.aktivieren();
  }
  if (App.schritt === "pruefblatt" && window.MODUL_PRUEFBLATT) {
    /* Watt-Beschriftung und Ergebnis-Rückweg gehören der Ergebnisseite;
       das Prüfblatt zeigt Namen und Flächen. */
    window.MODUL_PRUEFBLATT.zustand.watt = null;
    window.MODUL_PRUEFBLATT.zustand.beiWahl = null;
    window.MODUL_PRUEFBLATT.aktivieren();
  }
  if (App.schritt === "ergebnis" && window.MODUL_PRUEFBLATT) {
    /* Derselbe Plan wie im Prüfblatt, an den Marken aber die Heizlast je
       Raum. Der Klick auf eine Marke öffnet die Zusammensetzung des Raums
       in der Tabelle daneben — derselbe Vorgang wie der Klick auf die Zeile. */
    const PBZ = window.MODUL_PRUEFBLATT.zustand;
    const karte = {};
    ((App.ergebnis && App.ergebnis.raeume) || []).forEach(function (r) {
      karte[r.id] = r.phi_raum;
    });
    PBZ.watt = karte;
    PBZ.beiWahl = function (id) {
      App.ergebnisRaum = App.ergebnisRaum === id ? null : id;
      PBZ.gewaehlt = App.ergebnisRaum;
      render();
    };
    window.MODUL_PRUEFBLATT.aktivieren();
  }
  if (App.schritt === "start") ablageVerdrahten();
}

/* --------------------------------------------------------------------------
 * Schritt 1: Projekt und Klima
 * ----------------------------------------------------------------------- */
/** Abschluss der Eckdaten: aus dem Erfassten die Bauteile bilden. */
/** Geschosshöhen: eine Zeile je Geschoss, mit Herkunft und Eingabefeld.
 *  Wird gebraucht, weil im Grundriss keine Höhe steht und der Schnitt oft
 *  fehlt; ohne Höhe kein Luftvolumen und damit keine Lüftungsheizlast. */
function geschosshoehenKarte() {
  const stand = App.p.hoehenStand;
  const geschosse = [];
  App.p.raeume.forEach(function (r) {
    if (r.geschoss && geschosse.indexOf(r.geschoss) < 0) geschosse.push(r.geschoss);
  });
  if (!geschosse.length) return "";
  const Z = window.KERN_ZUORDNUNG;
  const angenommen = geschosse.filter(function (k) {
    return stand && stand.zuordnung[k] && stand.zuordnung[k].angenommen; });
  /* AUSSENMASSE JE GESCHOSS. Warum sie hier stehen und nicht im Plan bleiben:
     der Umfangsabgleich braucht den Umfang des Geschosses, und wenn die zweite
     Lesung ihn nicht hergibt, rechnet er eine Schranke. GEMESSEN am Blatt
     "BV 2-0887 Ziolkowski" (echter Durchlauf 23.08.2026): fuer das Erdgeschoss
     kam 11,50 x 6,00 zurueck -- eine Kontur, die kleiner ist als die Raeume
     darin und deshalb verworfen wird. Auf demselben Blatt stehen 8,00 und
     1,00 + 5,50 + 6,00; wer den Plan vor sich hat, greift das in einer halben
     Minute ab. Bis hierher gab es dafuer kein Feld. */
  const umf = {};
  (App.p.umfangsabgleich || []).forEach(function (u) { umf[u.geschoss] = u; });
  const geschaetzt = geschosse.filter(function (k) {
    return umf[k] && umf[k].art && umf[k].art !== "kontur" && umf[k].art !== "keine"; });
  return '<div class="karte"><h2>Lichte Höhe und Außenmaße je Geschoss</h2>'
    + '<p class="hinweis">Die lichte Höhe geht unmittelbar in das Luftvolumen und damit '
    + "in die Lüftungsheizlast ein. Steht sie nicht im Plan, rechnet das Werkzeug "
    + "vorläufig mit " + fmt(Z ? Z.HOEHE_RUECKFALL : 2.6, 2) + " m weiter und weist das "
    + "als Annahme aus. Die Außenmaße über alles ergeben den Umfang des "
    + "Geschosses und damit die Außenwandfläche seiner Räume; ohne sie rechnet "
    + "der Umfangsabgleich eine Schranke, die zu klein ist. Beides lässt sich "
    + "hier je Geschoss überschreiben.</p>"
    + (angenommen.length
      ? '<div class="meldung warnung"><span class="sym">i</span><div>Für '
        + esc(angenommen.join(", ")) + " ist die Höhe angenommen. Sobald du sie "
        + "einträgst, gilt dein Wert.</div></div>" : "")
    + (geschaetzt.length
      ? '<div class="meldung warnung"><span class="sym">i</span><div>Für '
        + esc(geschaetzt.join(", ")) + " ist der Umfang nicht gemessen, sondern "
        + "geschätzt. Trag die Außenmaße über alles ein, dann rechnet das "
        + "Werkzeug mit dem Maß vom Blatt.</div></div>" : "")
    + '<div class="tabhuelle"><table class="tab"><thead><tr><th style="width:100px">Geschoss</th>'
    + '<th style="width:112px">Lichte Höhe m</th>'
    + '<th style="width:112px">Breite m</th><th style="width:112px">Tiefe m</th>'
    + "<th>Herkunft</th></tr></thead><tbody>"
    + geschosse.map(function (k) {
        const h = (stand && stand.zuordnung[k]) || {};
        const eigen = (App.p.geschosshoehen || {})[k];
        const m = (App.p.geschossmasse || {})[k] || {};
        const u = umf[k];
        return "<tr><td><b>" + esc(k) + "</b></td>"
          + '<td><input type="text" inputmode="decimal" step="0.01" data-geschosshoehe="' + esc(k)
          + '" value="' + esc(eigen != null ? eigen : (h.lichte_hoehe || "")) + '"'
          + (h.angenommen && eigen == null ? ' style="background:var(--warn-bg)"' : "")
          + "></td>"
          + '<td><input type="text" inputmode="decimal" step="0.01" data-geschossmass="' + esc(k)
          + ':breite_m" value="' + esc(m.breite_m != null ? m.breite_m : "") + '"'
          + (u && u.art && u.art !== "kontur" && u.art !== "keine"
            ? ' style="background:var(--warn-bg)"' : "") + "></td>"
          + '<td><input type="text" inputmode="decimal" step="0.01" data-geschossmass="' + esc(k)
          + ':tiefe_m" value="' + esc(m.tiefe_m != null ? m.tiefe_m : "") + '"'
          + (u && u.art && u.art !== "kontur" && u.art !== "keine"
            ? ' style="background:var(--warn-bg)"' : "") + "></td>"
          + '<td style="font-size:13px;color:var(--mute)">' + esc(h.quelle || "–")
          + (h.geschosshoehe ? " (Geschosshöhe " + fmt(h.geschosshoehe, 2) + " m)" : "")
          /* Woher der Umfang dieses Geschosses kommt, steht in derselben Zeile
             wie die Felder, mit denen er zu ersetzen ist. */
          + (u && u.U_soll > 0
            ? '<br><span style="color:'
              + (u.art === "kontur" ? "var(--mute)" : "var(--warn)") + '">Umfang '
              + fmt(u.U_soll, 2) + " m "
              + (u.art === "kontur" ? "aus dem Plan gemessen"
                : (u.art === "hochrechnung"
                  ? "hochgerechnet, nicht gemessen"
                  : "als Untergrenze gerechnet, nicht gemessen"))
              + "</span>" : "")
          + "</td></tr>";
      }).join("")
    + "</tbody></table></div></div>";
}

function weiterNachEckdaten() {
  const p = App.p;
  const brauchtDicke = (p.offeneFragen || []).some(function (x) {
    return x.thema === "Deckendicke"; });
  const hatRaeume = p.raeume.length > 0;
  const hatBauteile = p.bauteiltypen.length > 0;
  const schonErzeugt = p.raeume.some(function (r) { return (r.bauteile || []).length; });
  /* Woher die U-Werte kommen sollen, haengt am Gebaeude: bis 2022 aus der
     Gebaeudetypologie, ab 2023 aus dem Referenzgebaeude des Gesetzes. Beide
     Wege legen Startwerte an; nur ohne Baujahr entsteht gar nichts. */
  const typo = (DT && p.meta.baujahr)
    ? DT.zumBaujahr(p.meta.baujahr, p.meta.gebaeudeart) : null;
  const typoStart = !!(typo && DT.hatStartwerte && DT.hatStartwerte(typo));
  const uWeg = (typo && !typo.gilt && typoStart)
    ? "Bauteile mit U-Werten (Startwerte übernehmen)"
    : (typo && !typoStart)
    ? "Bauteile mit U-Werten (aus dem Nachweis eintragen)"
    : "Bauteile mit U-Werten (Typologie übernehmen)";
  const fehlt = [];
  if (!baujahrGueltig(p.meta.baujahr)) fehlt.push("Baujahr");
  if (p.klima.theta_e == null) fehlt.push("Norm-Außentemperatur");
  if (!hatBauteile) fehlt.push(uWeg);
  if (!hatRaeume) fehlt.push("Räume (Pläne auswerten oder von Hand anlegen)");

  if (schonErzeugt) {
    return '<div class="karte" style="text-align:center">'
      + '<span class="chip belegt">Bauteile sind erzeugt</span>'
      + "</div>";
  }
  if (brauchtDicke && !(p.meta.deckendicke > 0)) {
    const frage = (p.offeneFragen || []).find(function (x) {
      return x.thema === "Deckendicke"; });
    return '<div class="karte"><h2>Eine Angabe fehlt noch</h2>'
      + '<div class="meldung warnung" style="display:block"><b>Deckendicke</b><br>'
      + esc(frage.frage) + "</div>"
      + '<div class="feldreihe" style="max-width:22em">'
      + feld("Deckendicke einschließlich Fußbodenaufbau", "meta.deckendicke",
             { typ: "number", step: "0.01", einheit: "m",
               hilfe: "wird von der Geschosshöhe abgezogen" })
      + "</div></div>";
  }
  if (fehlt.length) {
    return '<div class="karte"><div class="meldung hinweis"><span class="sym">i</span>'
      + "<div><b>Noch nicht vollständig.</b> Es fehlt: " + esc(fehlt.join(", "))
      + ". Danach bildet das Werkzeug die Bauteile aus den Raumabmessungen"
      + (typo && !typo.gilt && typoStart
        ? " und den Startwerten des Referenzgebäudes.</div></div></div>"
        : typo && !typo.gilt
        ? " und den U-Werten aus der Bauteilbibliothek.</div></div></div>"
        : " und den Typologiewerten.</div></div></div>");
  }
  return '<div class="karte" style="text-align:center">'
    + '<button class="btn cta" data-aktion="bauteileErzeugen">'
    + "Bauteile aus den Plänen bilden</button>"
    + '<div style="font-size:12.5px;color:var(--mute);margin-top:8px">'
    + "Aus den angeschriebenen Raumabmessungen entstehen Außenwand-, Fenster-, "
    + "Decken- und Bodenflächen; die U-Werte kommen aus "
    + (typo && !typo.gilt && typoStart
      ? "dem Referenzgebäude des Gesetzes"
      : typo && !typo.gilt ? "der Bauteilbibliothek"
      : "der Typologie deines Baujahrs")
    + ". Alles Weitere fragt das Kontrollblatt ab.</div></div>";
}

function typologieKasten() {
  if (!DT || !App.p.meta.baujahr) return "";
  const t = DT.zumBaujahr(App.p.meta.baujahr, App.p.meta.gebaeudeart);
  if (!t) return "";

  /* Kein Startwert vorhanden: Nichtwohngebäude oder ein Baujahr hinter dem
     Ende der Tabelle. Dann steht hier eine Warnung mit Handlungsanweisung
     und keine Zahl. Vorher standen für einen Neubau 2026 die Werte von 2015
     grün und mit Fundstelle da; sie tragen durch die ganze Rechnung. */
  /* Bauteile, die einmal aus der Typologie kamen. Sie behalten ihren Wert
     und ihre Fundstelle, auch wenn Baujahr oder Gebäudeart danach geändert
     werden — genau das war der Befund: "Werte und Fundstelle ändern sich
     nicht". Ändern darf das Werkzeug sie nicht von sich aus, verschweigen
     aber auch nicht. */
  /* Die Startwerte einmal bilden — aus DATEN_TYPOLOGIE, nicht hier ein
     zweites Mal zusammengesucht. Sie sind zugleich der Maßstab dafür, was in
     der Bibliothek veraltet ist: verglichen wird die Fundstelle des einzelnen
     Bauteiltyps gegen die des gleichnamigen Startwerts. Vorher wurde gegen
     t.fundstelle verglichen, und das ging schief, sobald die Fundstelle je
     Bauteil eine eigene ist (Referenzgebäude, Nummer der Zeile). */
  const sw = (DT.startwerte ? DT.startwerte(t) : []);
  const swNach = {};
  sw.forEach(function (x) { if (swNach[x.name] === undefined) swNach[x.name] = x; });
  const ausTypologie = App.p.bauteiltypen.filter((x) => x.typologie);
  const veraltet = ausTypologie.filter(function (x) {
    const s = swNach[x.name];
    return s ? x.quelle !== s.quelle : x.quelle !== t.fundstelle;
  });

  if (!sw.length) {
    return '<div class="meldung warnung" style="display:block">'
      + "<b>Keine Typologie-Startwerte für dieses Gebäude</b><br>"
      + esc(t.fundstelle)
      + "<div style=\"margin-top:6px\">"
      + (t.grund === "nichtwohngebaeude"
        ? "Die hinterlegte Tabelle ist eine Wohngebäudetypologie. "
        : "Die hinterlegte Tabelle stammt von 2015 und endet mit dem Baujahr "
          + t.geltung_bis + "; für Neubauten ab 2023 gilt mit dem Effizienzhaus 55 "
          + "ein deutlich schärferes Anforderungsniveau. ")
      + "Die U-Werte sind dem GEG-Nachweis, dem Energieausweis oder den "
      + "Bauteilnachweisen zu entnehmen und in der "
      + '<a href="#" data-schritt="bauteile">Bauteilbibliothek</a> einzutragen — '
      + "entweder direkt oder über den Schichtaufbau nach DIN EN ISO 6946."
      + "</div>"
      + (ausTypologie.length
        ? '<div style="margin-top:6px"><b>Achtung:</b> In der Bauteilbibliothek '
          + "stehen noch " + mz(ausTypologie.length, "Bauteil", "Bauteile")
          + " aus der Typologie, angelegt zu einem früheren Baujahr oder einer "
          + "anderen Gebäudeart. "
          + (ausTypologie.length === 1 ? "Dieser Wert gilt" : "Diese Werte gelten")
          + " für dieses Gebäude nicht. Bitte in der "
          + '<a href="#" data-schritt="bauteile">Bauteilbibliothek</a> ersetzen '
          + "oder über „Weg“ entfernen.</div>"
        : "")
      + "</div>";
  }

  /* Drei Zustände, nicht zwei. Der gelbe Knopf ruft dazu auf, die Bibliothek
     zu füllen; steht dort schon etwas, ist er ein Aufruf ins Leere. Genau
     das passierte im Demo-Projekt: dessen Bauteile tragen die Kennung
     typologie nicht, und der Knopf leuchtete über einer vollen Bibliothek. */
  const bibliothekVoll = App.p.bauteiltypen.length > 0;
  const zeile = (n) => !swNach[n] ? "" :
    '<tr><td>' + n + '</td><td class="num">' + fmt(swNach[n].U, 2)
    + " W/(m²·K)</td></tr>";
  /* Woher die Zahlen kommen, steht in der Überschrift und nicht nur im
     Kleingedruckten. Ein Anforderungswert des Gesetzes ist etwas anderes als
     ein Kennwert typischer Bestandsgebäude, und ein Rückfallwert ist wieder
     etwas anderes. */
  const kopf = t.startquelle === "neubau_referenz"
    ? "Anforderung Referenzgebäude — Neubau " + esc(String(t.baujahr))
    : t.startquelle === "rueckfall_efh"
    ? "Rückfallwert " + esc(t.label) + " (kein Wert für Nichtwohngebäude)"
    : "Typologie " + esc(t.label) + (t.ersatz ? " (nächstgelegene Klasse)" : "");
  return '<div class="meldung '
    + (veraltet.length || t.startquelle === "rueckfall_efh" ? "warnung"
      : ausTypologie.length ? "gut" : "hinweis")
    + '" style="display:block">'
    + "<b>" + kopf + "</b><br><small>"
    + esc(t.fundstelle_startwerte || t.fundstelle) + "</small>"
    + '<table class="tab" style="margin-top:8px;max-width:420px">'
    + zeile("Außenwand") + zeile("Dach")
    + zeile("Kellerdecke") + zeile("Bodenplatte")
    + zeile("Fenster") + zeile("Außentür")
    + "</table>"
    + (t.startquelle === "neubau_referenz"
      ? '<div style="margin:6px 0;color:#7A5C00">Das sind <b>Obergrenzen</b>, '
        + "keine Erwartungswerte: ein Neubau darf nicht schlechter sein, ist "
        + "in aller Regel aber besser. Die Heizlast fällt damit eher zu hoch "
        + "als zu klein aus — die vorsichtige Richtung. Sobald der "
        + "GEG-Nachweis vorliegt, gehören seine U-Werte hierher.</div>" : "")
    + (t.ersatz && t.startquelle !== "neubau_referenz"
      ? '<div style="margin:6px 0;color:#7A5C00">Für dieses Baujahr ist in der '
        + "Quelle keine eigene Klasse eindeutig zuzuordnen. Verwendet wird die "
        + "nächstgelegene; die Werte sind besonders sorgfältig zu prüfen.</div>" : "")
    + '<div style="margin-top:8px">'
    + (veraltet.length
      ? '<span style="font-size:12.5px">In der '
        + '<a href="#" data-schritt="bauteile">Bauteilbibliothek</a> stehen '
        + mz(veraltet.length, "Bauteil", "Bauteile")
        + " aus einer früheren Baualtersklasse oder Gebäudeart. "
        + (veraltet.length === 1 ? "Sein Wert" : "Ihre Werte")
        + " und die Fundstelle passen nicht mehr zu den Angaben oben. "
        + '<button class="btn klein cta" data-aktion="typologieUebernehmen">'
        + "Auf diese Klasse setzen</button></span>"
      : ausTypologie.length
      ? '<span style="font-size:12.5px">Diese Werte stehen als Startwerte in der '
        + '<a href="#" data-schritt="bauteile">Bauteilbibliothek</a> und sind im Bericht '
        + "als Annahme ausgewiesen. "
        + '<button class="btn klein" data-aktion="typologieUebernehmen">Erneut setzen'
        + "</button></span>"
      : bibliothekVoll
      ? '<span style="font-size:12.5px">In der '
        + '<a href="#" data-schritt="bauteile">Bauteilbibliothek</a> '
        + (App.p.bauteiltypen.length === 1 ? "steht bereits 1 Bauteil"
          : "stehen bereits " + App.p.bauteiltypen.length + " Bauteile")
        + " aus anderer Quelle. Diese Startwerte werden nicht gebraucht. "
        + '<button class="btn klein" data-aktion="typologieUebernehmen">Trotzdem ergänzen'
        + "</button></span>"
      : '<button class="btn klein cta" data-aktion="typologieUebernehmen">'
        + "Als Startwerte in die Bauteilbibliothek</button>"
        + ' <span style="font-size:12px;color:var(--mute)">'
        + (t.startquelle === "neubau_referenz"
          ? "Anforderungswerte des Referenzgebäudes"
          : t.startquelle === "rueckfall_efh" ? "Rückfallwerte"
          : "Startwerte typischer Gebäude")
        + ", im Bericht als Annahme ausgewiesen.</span>")
    + "</div></div>";
}

/** Ablagefläche der Startseite: Klick, Ziehen und Einfügen. */
function ablageVerdrahten() {
  const feld = $("#ablage"), eingabe = $("#planDateien");
  if (!feld || !eingabe) return;
  feld.onclick = function () { eingabe.click(); };
  /* Die Ablage ist ein Knopf und muss sich auch ohne Maus bedienen lassen. */
  feld.onkeydown = function (ev) {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); eingabe.click(); }
  };
  eingabe.onchange = function () { dateienAufnehmen(this.files); this.value = ""; };
  ["dragenter", "dragover"].forEach(function (e) {
    feld.addEventListener(e, function (ev) {
      ev.preventDefault();
      feld.classList.add("bereit");
    });
  });
  ["dragleave", "drop"].forEach(function (e) {
    feld.addEventListener(e, function (ev) {
      ev.preventDefault();
      feld.classList.remove("bereit");
      if (e === "drop") dateienAufnehmen(ev.dataTransfer.files);
    });
  });
}

/** Nimmt abgelegte Dateien entgegen und wertet sie aus. */
async function dateienAufnehmen(dateien) {
  const liste = Array.from(dateien || []);
  if (!liste.length) return;
  const GRENZE = 40;
  if (liste.length > GRENZE) {
    sagen("Es sind " + mz(liste.length, "Datei", "Dateien") + " abgelegt. Verarbeitet "
      + "werden die ersten " + GRENZE + ". Bitte den Rest in einem zweiten Durchgang "
      + "nachreichen.", { stufe: "warnung", titel: "Zu viele Dateien auf einmal" });
  }
  const zuTun = liste.slice(0, GRENZE);

  if (!window.MODUL_PDF) {
    sagen("Das Modul zum Öffnen von Plänen fehlt in dieser Fassung.", { stufe: "fehler" });
    return;
  }
  if (!App.p.plan) App.p.plan = { bilder: [] };
  if (!App.p.plan.seiten) App.p.plan.seiten = [];

  App.auslese = { laeuft: true, gesamt: zuTun.length, fertig: 0,
                  was: "Unterlagen werden geöffnet", kosten: 0, abbrechen: false };
  /* Der Bericht der VORIGEN Auswertung hat hier nichts mehr zu suchen.
     GEMESSEN in der Live-Abnahme am 24.08.2026: während der Maas-Auswertung
     standen noch die Ziolkowski-Vermerke des vorherigen Projekts unter
     „Was die Auswertung getan hat". */
  App.ausleseBericht = null;
  render();

  const abgelehnt = [];
  const doppelt = [];
  for (const datei of zuTun) {
    if (App.auslese.abbrechen) break;
    /* Dieselbe Datei ein zweites Mal: bisher entstanden daraus kommentarlos
       ein zweiter Satz Blätter, doppelte Modellkosten und doppelte Räume im
       Raumbuch. Erkannt an Name und Größe zusammen — der Dateiinhalt liegt
       hier noch nicht vor, und zwei verschiedene Pläne mit gleichem Namen
       UND gleicher Byte-Zahl gibt es praktisch nicht. */
    if ((App.p.plan.seiten || []).some(function (x) {
      return x.datei === datei.name && x.dateigroesse === datei.size;
    })) {
      doppelt.push(datei.name);
      App.auslese.fertig++;
      renderInhalt();
      continue;
    }
    App.auslese.was = "Wird geöffnet: " + datei.name;
    renderInhalt();
    let erg;
    try {
      erg = await window.MODUL_PDF.dateiOeffnen(datei, { name: datei.name, typ: datei.type });
    } catch (e) {
      erg = { ok: false, meldung: String(e && e.message || e), seiten: [] };
    }
    if (!erg.ok) {
      abgelehnt.push({ name: datei.name, grund: erg.meldung || "unbekannter Grund" });
    } else {
      (erg.seiten || []).forEach(function (seite, i) {
        const abgelegt = Object.assign({}, seite, {
          datei: datei.name,
          dateigroesse: datei.size,
          bezeichnung: (erg.seiten.length > 1
            ? datei.name + ", Seite " + (i + 1) : datei.name),
        });
        App.p.plan.seiten.push(abgelegt);
        /* Sofort selbst versuchen, ohne dass jemand einen Knopf drückt.
           MODUL_PDF hat beim Öffnen bereits Schriftfeld und Maßketten aus der
           Geometrie ausgewertet; steht dabei ein belastbarer Maßstab fest, ist
           nichts mehr zu tun. Sonst wird im gerenderten Bild nachgemessen —
           das trägt genau dort, wo die Maßlinien nicht als Striche, sondern
           als gefüllte Flächen im Dokument stehen. Ohne Textstand (Scan,
           Bildschirmfoto) gibt es hier noch keine Maßzahlen; diese Seiten
           kommen erst nach der Planauslese an die Reihe. */
        if (!(abgelegt.massstab && abgelegt.massstab.belastbar)
            && abgelegt.typ !== "textseite" && abgelegt.typ !== "leer") {
          massstabNachmessenAnstellen(abgelegt);
        }
        /* Objektangaben aus dem Schriftfeld. Kostet nichts, braucht kein
           Netz und geschieht in dem Augenblick, in dem die Datei fällt.
           Damit stehen Anschrift, Postleitzahl und Klimadatensatz, bevor der
           Bearbeiter Schritt 2 überhaupt gesehen hat. */
        objektangabenUebernehmen(abgelegt.objektangaben,
          abgelegt.bezeichnung || abgelegt.name,
          abgelegt.blattkopf && abgelegt.blattkopf.blattart);
      });
    }
    App.auslese.fertig++;
    renderInhalt();
  }

  App.auslese.laeuft = false;
  render();

  /* Beides gehoert in die Seite, nicht in einen Dialog: ein alert() sperrt
     den ganzen Tab, und nach dem Wegklicken ist die Auskunft weg, welche
     Datei woran gescheitert ist. */
  const meldungen = [];
  if (doppelt.length) {
    meldungen.push({ blatt: doppelt.length === 1 ? "Datei schon im Stapel"
        : "Dateien schon im Stapel",
      text: doppelt.join(", ") + " — nicht noch einmal aufgenommen. Ein zweites "
        + "Mal auszuwerten würde doppelt kosten und die Räume doppelt ins "
        + "Raumbuch schreiben." });
  }
  abgelehnt.forEach(function (x) {
    meldungen.push({ blatt: "Nicht verwendbar: " + x.name, text: x.grund });
  });
  if (meldungen.length) {
    App.ausleseBericht = { zeit: Date.now(), blaetter: [], fehler: meldungen };
    render();
  }

  /* DIE ANALYSE STARTET VON SELBST — bis zur Kostengrenze.
     Der Prüfplan kommt aus der Blattart-Erkennung, die beim Öffnen schon
     gelaufen ist (Schriftfeld, Textstand): welches Blatt Räume bringen kann,
     welches nur Höhen, welches nur das Schriftfeld, sagt ertragErwartung()
     je Blatt, und genau so arbeitet stapelAuswerten den Stapel ab. Oberhalb
     von AUTO_ANALYSE_GRENZE Blättern wird genau einmal bestätigt (der
     vorhandene Knopf mit Kostenvorschau); ohne hinterlegten Zugangscode
     bleibt es ebenfalls beim Knopf, damit die Codeabfrage nicht ungefragt
     aufspringt. */
  const offenJetzt = (App.p.plan.seiten || []).filter(auswertbar);
  if (offenJetzt.length && !App.auslese.abbrechen
      && window.MODUL_KI && window.MODUL_KI.konfiguriert()
      && offenJetzt.length <= AUTO_ANALYSE_GRENZE) {
    stapelAuswerten();
  }
}

/** Ein Bild der Seite in der Größe erzeugen, die die Auslese verträgt.
 *  ZWEI Grenzen der Gegenstelle (Anthropic-Doku, Hochauflösungs-Stufe von
 *  claude-sonnet-5): längere Kante höchstens 2576 Pixel UND höchstens 4784
 *  Bildkacheln von 28 x 28 Pixeln. Ein A-Format mit 2576 Pixeln Kante hat
 *  rund 6000 Kacheln — die Gegenstelle verkleinert es dann selbst auf rund
 *  2290 Pixel Kante. Die überzähligen Pixel kauften also keine Auflösung,
 *  nur Upload: GEMESSEN am Blatt "BV 2-0887 Ziolkowski" 505 kB, an der
 *  Kachelgrenze gerendert wären es rund ein Fünftel weniger. Deshalb wird
 *  gleich auf die verlustfreie Obergrenze gerendert. */
const MAX_KANTE = 2576;
const MAX_KACHELN = 4784, KACHEL_PX = 28;

/** Der größte Faktor, mit dem ein Bild von qb x qh Pixeln gemalt werden darf,
 *  ohne eine der beiden Grenzen der Gegenstelle zu reißen. */
function bildFaktor(qb, qh) {
  let f = MAX_KANTE / Math.max(qb, qh);
  const kacheln = function (x) {
    return Math.ceil(qb * x / KACHEL_PX) * Math.ceil(qh * x / KACHEL_PX);
  };
  if (kacheln(f) > MAX_KACHELN) {
    f = Math.sqrt(MAX_KACHELN * KACHEL_PX * KACHEL_PX / (qb * qh));
    while (kacheln(f) > MAX_KACHELN && f > 0.01) f *= 0.995;
  }
  return f;
}

async function seiteAlsBild(seite, ausschnitt) {
  /* Mit Ausschnitt malt eine Vektorzeichnung das Rechteck selbst in voller
     Groesse; dann ist hier nichts mehr zu schneiden. Eine Bilddatei kann das
     nicht, dort wird unten aus dem Bild geschnitten. */
  const r = await seite.rendern(ausschnitt
    ? { ausschnitt: ausschnitt, maxKante: MAX_KANTE, dpi: 254 }
    : { dpi: 254 });
  const quelle = r.bild || r.canvas || r;
  const bw = r.breite || quelle.naturalWidth || quelle.width;
  const bh = r.hoehe || quelle.naturalHeight || quelle.height;

  /* Gegenprobe zur Kennzeichnung des Renderers. Meldet er faelschlich, den
     Ausschnitt NICHT gemalt zu haben, wuerde hier ein zweites Mal derselbe
     Anteil herausgeschnitten -- am Bogen "Dumach 1" kamen dadurch statt 25 nur
     7 Raeume an, ohne jede Fehlermeldung. Das laesst sich am Seitenverhaeltnis
     erkennen: ein zugeschnittenes Bild hat das des Ausschnitts, kein
     zugeschnittenes das des Blattes. */
  let schonGeschnitten = !!r.ausschnittGemalt;
  if (ausschnitt && !schonGeschnitten) {
    const bm = seite.breite_mm || seite.breite_px, hm = seite.hoehe_mm || seite.hoehe_px;
    if (bm > 0 && hm > 0) {
      const vAusschnitt = (bm * (ausschnitt.x2 - ausschnitt.x))
        / (hm * (ausschnitt.y2 - ausschnitt.y));
      const vBild = bw / bh;
      if (Math.abs(vBild - vAusschnitt) / vAusschnitt < 0.03
          && Math.abs(vBild - bm / hm) / (bm / hm) > 0.03) {
        schonGeschnitten = true;
      }
    }
  }
  let qx = 0, qy = 0, qb = bw, qh = bh;
  if (ausschnitt && !schonGeschnitten) {
    qx = Math.round(bw * Math.max(0, ausschnitt.x));
    qy = Math.round(bh * Math.max(0, ausschnitt.y));
    qb = Math.max(8, Math.round(bw * Math.min(1, ausschnitt.x2)) - qx);
    qh = Math.max(8, Math.round(bh * Math.min(1, ausschnitt.y2)) - qy);
  }
  /* Ohne Ausschnitt nur verkleinern, nie vergroessern. MIT Ausschnitt darf
     auch vergroessert werden: das Modell liest eine Beschriftung, die auf
     40 Bildpunkte gestreckt ist, besser als eine auf 15. Beide Wege enden
     an der Kachelgrenze der Gegenstelle (bildFaktor): was darueber liegt,
     verkleinert sie selbst wieder — es waere nur bezahlter Upload. */
  const f = ausschnitt
    ? bildFaktor(qb, qh)
    : Math.min(1, bildFaktor(qb, qh));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(qb * f));
  c.height = Math.max(1, Math.round(qh * f));
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(quelle, qx, qy, qb, qh, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.9).split(",")[1];
}

/** Die Zeichnungsfelder eines Blattes, aus dem gerenderten Bild bestimmt.
 *
 *  Kostet keinen Modellaufruf und kein Netz. Aufgerufen wird das erst, wenn
 *  ein Leseversuch gezeigt hat, dass ein Durchgang nicht reicht -- blind zu
 *  zerlegen hiesse, jedes Blatt zwei- und dreifach zu bezahlen. */
async function seiteZerlegen(seite) {
  const K = window.KERN_ZUSCHNITT;
  if (!K) return [];
  try {
    const r = await seite.rendern({ dpi: 100 });
    const quelle = r.bild || r.canvas || r;
    const bw = r.breite || quelle.naturalWidth || quelle.width;
    const bh = r.hoehe || quelle.naturalHeight || quelle.height;
    const g = K.ausCanvas(quelle, bw, bh);
    const z = K.zerlegen(g.grau, g.breite, g.hoehe);
    return z.teile || [];
  } catch (e) { return []; }
}

/** Wertet den abgelegten Stapel aus: je Seite ein Auslesedurchgang, danach
 *  werden die gefundenen Räume ins Raumbuch übernommen. Das ist der Schritt,
 *  der Geld kostet, deshalb wird er ausdrücklich angestoßen und nicht
 *  automatisch beim Ablegen. */
/** Hat die Antwort ueberhaupt etwas gebracht?
 *
 *  Der Endpunkt kann mit gueltigem JSON antworten, das nichts enthaelt --
 *  etwa wenn das Modell die Werkzeugantwort gar nicht erst begonnen hat.
 *  Fuer das Werkzeug ist das ein Fehlschlag und kein Ergebnis. Geprueft wird
 *  auf VORHANDENSEIN der tragenden Felder, nicht auf ihren Inhalt: ein Blatt
 *  ohne Raeume ist ein zulaessiges Ergebnis (Schnitt, Ansicht), eine Antwort
 *  ohne jede Aussage nicht. */
function inhaltReich(r) {
  if (!r || typeof r !== "object") return false;
  if (typeof r.ist_grundriss === "boolean") return true;
  if (Array.isArray(r.raeume) && r.raeume.length) return true;
  if (Array.isArray(r.hoehen) && r.hoehen.length) return true;
  if (Array.isArray(r.befunde) && r.befunde.length) return true;
  if (r.gebaeude && Object.keys(r.gebaeude).length) return true;
  if (r.massstab && (r.massstab.angaben || []).length) return true;
  return false;
}

/** Haelt fest, dass eine Antwort an der Laengengrenze abgeschnitten war.
 *
 *  Die Rettung im Endpunkt macht aus einem Totalverlust ein Teilergebnis --
 *  das ist die richtige Wahl, aber sie darf nicht wie ein vollstaendiges
 *  Ergebnis aussehen. Der Vermerk landet als offene Frage im Kontrollblatt,
 *  weil dort die Vollstaendigkeit des Raumbuchs ohnehin gegengerechnet wird. */
function abschnittMelden(seite, betriebsart, a) {
  const blatt = seite.bezeichnung || seite.name || "Blatt";
  seite.abgeschnitten = Object.assign({}, seite.abgeschnitten,
    { [betriebsart]: a });
  App.p.offeneFragen = App.p.offeneFragen || [];

  /* WELCHER Durchgang abgeschnitten wurde, entscheidet alles.
     GEMESSEN am 22.08.2026: der dritte Durchgang ("kunde", Befunde und
     Gebäudeangaben) läuft regelmäßig in seine Grenze, weil er Fließtext
     schreibt. Bisher stand danach im Kontrollblatt "Die Auslese ist an der
     Längengrenze abgeschnitten, bitte am Plan nachzählen, ob Räume fehlen" --
     bei drei von vier Blättern, deren Raumliste vollständig war. Eine Warnung,
     die dreimal grundlos kommt, wird beim vierten Mal überlesen. */
  if (betriebsart !== "raeume") {
    /* Typografische Anführungszeichen: der Satz landet über die offenen
       Fragen in der internen Berichtsfassung, und die eigene
       baustellenSuche() des Berichtsmoduls schlägt bei geraden
       Anführungszeichen an. GEMESSEN am 25.08.2026 im Härtetest -- zwei
       Treffer „gerade Anführungszeichen“, beide aus dieser Zeile. */
    const t2 = "Beim Blatt „" + blatt + "“ ist der Durchgang für die "
      + "Zusatzangaben an seiner Grenze abgebrochen. Die RAUMLISTE ist davon "
      + "nicht betroffen; es können einzelne Befunde oder Gebäudeangaben "
      + "fehlen.";
    if (!App.p.offeneFragen.some(function (x) { return x.frage === t2; })) {
      /* art: "grenze": der Durchgang ist abgebrochen, das laesst sich weder
         vom Werkzeug noch vom Bearbeiter am Bildschirm heilen. Es ist eine
         Aussage darueber, was diese Auswertung nicht abdeckt. */
      App.p.offeneFragen.push({ thema: "Zusatzangaben unvollständig",
                                art: "grenze", blatt: blatt, frage: t2 });
    }
    return;
  }

  const wieviel = a && a.raeume != null
    ? mz(a.raeume, "Raum ist", "Räume sind") + " angekommen, danach bricht die Antwort ab"
    : "die Antwort bricht mitten im Satz ab";
  const text = "Die Raumliste von \"" + blatt + "\" ist an der Längengrenze "
    + "abgeschnitten: " + wieviel + ". Ein zweiter Versuch mit demselben Bild "
    + "bringt dasselbe Ergebnis; das Werkzeug hat das Blatt deshalb selbst "
    + "zerlegt (Zeichnungsfelder, notfalls überlappende Hälften) und die Teile "
    + "einzeln gelesen — mindestens ein Teil blieb trotzdem unvollständig. "
    + "Bitte am Plan nachzählen, ob Räume fehlen, und sie von Hand ergänzen.";
  if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
    App.p.offeneFragen.push({ thema: "Raumliste unvollständig", blatt: blatt, frage: text });
  }
}

/* ===========================================================================
 * Wiederholen, zerlegen, und dem Kollegen sagen was geschah
 * ===========================================================================
 * DREI DINGE, die vorher fehlten, jedes gemessen am laufenden Endpunkt:
 *
 * 1. WIEDERHOLEN. Es gab keinen einzigen Wiederholversuch im Werkzeug. Stand
 *    "Bitte erneut versuchen" da, hiess das: der Mensch klickt noch einmal.
 *    Wiederholt wird jetzt genau dort, wo es hilft -- abgerissene Verbindung,
 *    ueberlastete Gegenstelle -- und ausdruecklich NICHT dort, wo es
 *    deterministisch scheitert: eine Laengengrenze kommt beim zweiten Mal
 *    genauso wieder.
 *
 * 2. ZERLEGEN. Ein A1-Bogen mit drei Grundrissen und 25 Raeumen
 *    ("260514 - Dumach 1") war in einem Durchgang nicht zu lesen: die Antwort
 *    lief in die Laengengrenze und im Raumbuch stand nichts. In seine drei
 *    Felder zerlegt und einzeln gelesen: 12 + 11 + 2 = 25 Raeume. Zerlegt wird
 *    erst, NACHDEM ein Durchgang gezeigt hat, dass einer nicht reicht; blind
 *    zerlegen hiesse jedes Blatt doppelt bezahlen.
 *
 * 3. SAGEN, WAS GESCHAH. Jeder Rettungsversuch schreibt einen Vermerk an das
 *    Blatt. Er steht danach im Stapel und im Kontrollblatt. Eine stille
 *    Rettung ist so schlecht wie ein stiller Fehlschlag.
 * ======================================================================== */

/** Kostet ein Modellaufruf, in Dollar, aus dem gemeldeten Verbrauch. */
function ausleseKostenAddieren(v) {
  if (!v) return;
  /* Preise je Token (claude-sonnet-5): Eingabe 3 $/Mio, Ausgabe 15 $/Mio.
     Der Prompt-Zwischenspeicher der Gegenstelle rechnet anders ab: das
     SCHREIBEN eines Eintrags kostet 25 % Aufschlag (3,75 $/Mio), das LESEN
     ein Zehntel (0,30 $/Mio). Der Endpunkt weist beide gesondert aus
     (cache_schreiben_token / cache_lesen_token); eingabe_token ist dann nur
     noch der ungepufferte Teil. Ohne diese Aufteilung zeigte die Anzeige
     bei warmem Speicher das Zehnfache der echten Kosten. */
  App.auslese.kosten += (v.eingabe_token || 0) * 3e-6
    + (v.cache_schreiben_token || 0) * 3.75e-6
    + (v.cache_lesen_token || 0) * 0.3e-6
    + (v.ausgabe_token || 0) * 15e-6;
}

/** WAS EIN LAUF GEKOSTET HAT, BLEIBT AM PROJEKT.
 *
 *  Vier der fünf Prüfprotokolle vom 26.08.2026 melden denselben Mangel, im
 *  Wortlaut: „Analysekosten erscheinen nur während des Laufs (‚ca. 0,29 $'
 *  bei 6 von 8 Lesungen), nach dem Urteil ist die Endsumme nirgends mehr
 *  abrufbar und wird auch nicht im Projekt gespeichert." Ein Prüfer musste
 *  die Zahl vom laufenden Bildschirm abschreiben, ein zweiter konnte sie gar
 *  nicht mehr beziffern. Ein Auftrag, dessen Aufwand nach dem Lauf niemand
 *  mehr nennen kann, lässt sich weder budgetieren noch nachrechnen.
 *
 *  Der Verbrauch gehört deshalb ins PROJEKT, nicht in den Lauf. Er steht am
 *  Projekt und ausdrücklich NICHT unter p.plan: projektFuerAblage() baut
 *  p.plan aus seiten und bilder neu auf, alles andere daran ginge beim
 *  Speichern und beim Zwischenspeichern verloren.
 *
 *  Addiert wird über alle Läufe desselben Projekts — eine Nachlesung, ein
 *  zweiter Stapel und ein „Als Grundriss lesen" kosten jeweils zusätzlich,
 *  und der Bearbeiter will die Summe des Auftrags sehen, nicht die des
 *  letzten Knopfdrucks. */
function verbrauchAblegen(blaetter, anlass) {
  const a = App.auslese || {};
  /* NUR DER ZUWACHS SEIT DER LETZTEN ABLAGE.
     GEMESSEN am 26.08.2026 an "Hasenberg 10": nach "Jetzt schreiben lassen"
     stand p.verbrauch unveraendert bei 11 Lesungen / 0,4361 $ -- die Aufrufe
     fuer die bewertenden Absaetze zaehlten nicht mit. Sie zaehlen jetzt mit,
     und damit das nicht zur Doppelbuchung fuehrt, bucht diese Funktion nur
     die Differenz zum bereits Abgelegten desselben App.auslese. */
  const lesungenGes = a.aufrufeFertig || a.aufrufe || 0;
  const kostenGes = num(a.kosten, 0);
  const lesungen = lesungenGes - num(a.abgelegt_lesungen, 0);
  const kosten = kostenGes - num(a.abgelegt_kosten, 0);
  if (!(lesungen > 0) && !(kosten > 0)) return;
  a.abgelegt_lesungen = lesungenGes;
  a.abgelegt_kosten = kostenGes;
  const v = (App.p.verbrauch && Array.isArray(App.p.verbrauch.laeufe))
    ? App.p.verbrauch : { laeufe: [] };
  v.laeufe.push({
    zeit: ortszeitStempel(),
    blaetter: blaetter || 0,
    anlass: anlass || "Planauslese",
    lesungen: lesungen,
    /* Auf vier Stellen gerundet abgelegt: die Anzeige zeigt zwei, die
       Summe über viele Läufe soll sich davon nicht wegdriften. */
    kosten: Math.round(kosten * 10000) / 10000,
  });
  v.lesungen = v.laeufe.reduce(function (s, x) { return s + (x.lesungen || 0); }, 0);
  v.kosten = v.laeufe.reduce(function (s, x) { return s + (x.kosten || 0); }, 0);
  App.p.verbrauch = v;
}

/** Woran ein zweiter Versuch mit DEMSELBEN Bild nichts aendert.
 *  Diese Meldungen sind deterministisch; sie noch einmal zu bezahlen waere
 *  reine Verbrennung. */
function aussichtslos(fehler) {
  if (fehler && fehler.aussichtslos) return true;
  /* Die Kennungen des Endpunkts: alle vier sind deterministisch. Sie werden
     nicht wiederholt, sondern lösen die Selbstzerlegung aus (stapelAuswerten,
     Rettung durch Zerlegen). */
  if (fehler && /^(laengengrenze|zeitgrenze|bild_zu_gross|paket_zu_gross)$/
      .test(String(fehler.kennung || ""))) return true;
  const m = String((fehler && fehler.message) || fehler || "");
  /* "Abbruchgrund: max_tokens" ist der Wortlaut des HEUTE VERTEILTEN
     Endpunkts ohne Kennungen. GEMESSEN am 24.08.2026 am Live-Endpunkt:
     Feld 2 des Bogens "BV 2-0887 Ziolkowski" scheiterte deterministisch an
     der Laengengrenze, und das Werkzeug bezahlte trotzdem einen zweiten,
     wortgleich scheiternden Anlauf. Ein Zeit-Abbruch ("Abbruchgrund: zeit")
     steht absichtlich NICHT hier: er ist nicht deterministisch. */
  return /Längengrenze|Zugangscode|Schlüssel|abgelehnt|zu groß|größer als|Kein Bild|Ungültig|Kontingent|Abbruchgrund:\s*max_tokens/i
    .test(m);
}

/* ===========================================================================
 * Gleichzeitige Auslese (der Planer)
 * ===========================================================================
 * GEMESSEN am 24.08.2026 am Live-Endpunkt (Ziolkowski, 2 Blaetter, 165 s;
 * Dumach, 1 Bogen, 126 s): ueber 90 % der Wartezeit ist Warten auf den
 * Endpunkt, und ALLE Aufrufe liefen strikt nacheinander -- raeume, Felder,
 * gegenprobe, hoehen, kunde, Blatt fuer Blatt. Die Durchgaenge haengen aber
 * nur am Bild, nicht aneinander; sie duerfen gleichzeitig laufen, auch ueber
 * Blaetter hinweg. Nacheinander bleibt nur, was ein Ergebnis des anderen
 * braucht: die Rettung (braucht die Raumliste) und die Hoehen-Weiche
 * (braucht Raumliste und Gegenprobe).
 *
 * OBERGRENZE DREI GLEICHZEITIG, begruendet: Netlify startet je Aufruf eine
 * eigene Funktion und traegt auch mehr; die Modell-Gegenstelle drosselt bei
 * zu vielen gleichzeitigen Anfragen aber mit 429, der Rechner des Kollegen
 * muss nebenher Seiten rendern und die Oberflaeche zeichnen, und jenseits
 * von drei wartet ohnehin fast immer nur noch der langsamste Durchgang.
 * Drei laesst nach beiden Seiten Luft.
 *
 * TOR JE BETRIEBSART (Prompt-Zwischenspeicher): der Endpunkt kennzeichnet
 * Systemtext und Werkzeug fuer den Zwischenspeicher der Gegenstelle
 * (cache_control, rund 12.000 statische Token je Betriebsart). Geschrieben
 * wird der Eintrag erst vom ERSTEN Aufruf einer Betriebsart; starteten alle
 * Erstaufrufe gleichzeitig, bezahlte JEDER das Schreiben (25 % Aufschlag)
 * statt des Lesens (90 % Nachlass). Deshalb laeuft je Betriebsart der erste
 * Aufruf allein; die uebrigen folgen parallel, sobald er beantwortet ist.
 * Der Eintrag lebt rund fuenf Minuten; nach vier Minuten ohne Antwort dieser
 * Betriebsart wird neu gewaermt statt blind auf ihn gebaut. */
const AUSLESE_GLEICHZEITIG = 3;
const PLANER = { laufen: 0, warten: [], torLauf: {}, torOffenSeit: {} };
const TOR_FRISCHE_MS = 4 * 60 * 1000;

function planerAnstossen() {
  for (let i = 0; i < PLANER.warten.length
       && PLANER.laufen < AUSLESE_GLEICHZEITIG; i++) {
    const a = PLANER.warten[i];
    if (PLANER.torLauf[a.betriebsart]) continue;   // Erstaufruf laeuft noch
    const warm = PLANER.torOffenSeit[a.betriebsart]
      && (Date.now() - PLANER.torOffenSeit[a.betriebsart]) < TOR_FRISCHE_MS;
    PLANER.warten.splice(i, 1); i--;
    PLANER.laufen++;
    const lauf = Promise.resolve().then(a.start);
    if (!warm) {
      /* Dieser Aufruf waermt das Tor seiner Betriebsart. Ob er gelingt oder
         scheitert: danach ist entschieden, und die uebrigen duerfen los. */
      PLANER.torLauf[a.betriebsart] = true;
      lauf.catch(function () {}).then(function () {
        PLANER.torLauf[a.betriebsart] = false;
        PLANER.torOffenSeit[a.betriebsart] = Date.now();
        planerAnstossen();
      });
    }
    lauf.then(a.aufl, a.abl);
    lauf.catch(function () {}).then(function () {
      PLANER.laufen--;
      /* Jede beantwortete Anfrage dieser Betriebsart erneuert den Eintrag der
         Gegenstelle (Lesen verlaengert die Lebenszeit). Ohne diese Zeile
         waere nach vier Minuten Dauerbetrieb grundlos neu gewaermt worden --
         ein Aufruf haette allein gewartet, obwohl der Speicher warm ist. */
      PLANER.torOffenSeit[a.betriebsart] = Date.now();
      planerAnstossen();
    });
  }
}

/** Reiht einen Auslese-Aufruf in den Planer ein. */
function einreihen(betriebsart, start) {
  return new Promise(function (aufl, abl) {
    PLANER.warten.push({ betriebsart: betriebsart, start: start,
                         aufl: aufl, abl: abl });
    planerAnstossen();
  });
}

/** Ein geplanter Auslese-Aufruf: laeuft durch den Planer, steht waehrend des
 *  Laufs in der Fortschrittsanzeige und bricht ab, wenn der Kollege abbricht.
 *  Schon GESTARTETE Aufrufe beendet MODUL_KI.abbrechen() sofort (der offene
 *  fetch wird abgeworfen); hier faellt zusaetzlich alles, was noch WARTET,
 *  ohne Kosten aus der Reihe. */
function aufrufGeplant(betriebsart, beschreibung, arbeit) {
  const a = App.auslese || {};
  a.aufrufe = (a.aufrufe || 0) + 1;
  return einreihen(betriebsart, async function () {
    if (a.abbrechen) {
      a.aufrufe--;
      const e = new Error("Die Auslese wurde abgebrochen.");
      e.abgebrochen = true;
      throw e;
    }
    a.aktiv = a.aktiv || [];
    a.aktiv.push(beschreibung);
    renderInhalt();
    try {
      return await arbeit();
    } finally {
      const ix = (a.aktiv || []).indexOf(beschreibung);
      if (ix >= 0) a.aktiv.splice(ix, 1);
      a.aufrufeFertig = (a.aufrufeFertig || 0) + 1;
      renderInhalt();
    }
  });
}

/** Ein Leseversuch mit hoechstens einer Wiederholung.
 *
 *  Wiederholt wird nur bei einem Fehlschlag, der voruebergehend sein kann:
 *  Netz weg, Endpunkt ueberlastet, Datenstrom abgerissen. Der Vermerk sagt
 *  hinterher, dass wiederholt wurde -- sonst sieht niemand, dass ein Blatt
 *  beim ersten Anlauf durchgefallen ist. */
async function leseVersuch(b64, modus, vermerke, was, zusatz) {
  let letzter = null;
  /* Die Gegenprobe bekommt NICHTS mitgeteilt -- weder den Projektkontext noch
     einen Zusatzhinweis. Sie ist nur so lange eine Probe, wie sie nichts von
     der ersten Lesung weiss; wer ihr etwas vorlegt, kauft sich eine
     Bestaetigung. Der Endpunkt haelt sich unabhaengig davon ebenfalls daran
     (plan-auslesen.mjs, Betriebsart "gegenprobe"); hier steht es ein zweites
     Mal, damit es an der Aufrufstelle sichtbar ist. */
  const hinweis = modus === "gegenprobe" ? "" : (zusatz
    ? (hinweisFuerAuslese() + " " + zusatz).trim() : hinweisFuerAuslese());
  for (let versuch = 1; versuch <= 2; versuch++) {
    try {
      const r = await window.MODUL_KI.auslesenBild(b64, hinweis, modus);
      ausleseKostenAddieren(r && r._verbrauch);
      /* Eine Antwort, in der nichts steht, ist kein Ergebnis -- und einen
         zweiten Anlauf wert. GEMESSEN: das Modell bedient die vorgegebene
         Struktur nicht immer; beim naechsten Aufruf tut es das meist. Vorher
         flog dieser Fall sofort als Fehler heraus, ohne Wiederholung. */
      if (modus === "raeume" && !inhaltReich(r)) {
        throw new Error("Der Ausleseendpunkt hat für dieses Blatt nichts "
          + "zurückgegeben.");
      }
      /* EINE ABGEBROCHENE ZAEHLUNG IST KEINE ZAEHLUNG.
       *
       * Bei der Raumliste ist ein abgeschnittenes Ergebnis etwas wert: zwoelf
       * von achtzehn Raeumen sind mehr als nichts, und der Vermerk sagt, dass
       * welche fehlen. Bei der GEGENPROBE ist es das Gegenteil. Sie liefert
       * Anzahlen, und eine halbe Anzahl liest sich wie eine ganze: aus einem
       * Abbruch nach den ersten Zeichen wurde "die zweite Lesung zaehlt null
       * Raeume", und das Werkzeug meldete dem Kollegen dreizehn fehlende
       * Raeume an einem vollstaendigen Raumbuch.
       * GEMESSEN am 22.08.2026 im echten Durchlauf mit Sebastians Blatt
       * "BV 2-0887 Ziolkowski": der Endpunkt gab Status 200 und einen Koerper
       * ohne eine einzige inhaltliche Angabe zurueck.
       *
       * Ein Abbruch aus der Zeitgrenze ist NICHT deterministisch -- dasselbe
       * Blatt kam in neun Messungen in 10,4 bis 12,6 Sekunden zurueck. Es
       * wird deshalb geworfen und damit ueber die vorhandene Wiederholung
       * noch einmal versucht, statt still als Null durchzugehen. */
      if (modus === "gegenprobe" && r && r._abgeschnitten) {
        throw new Error("Die zweite Lesung wurde abgebrochen ("
          + (r._abgeschnitten.grund === "zeit" ? "Zeitgrenze"
             : "Längengrenze") + "); eine angefangene Zählung ist keine Zählung.");
      }
      if (versuch > 1) {
        vermerke.push("Der erste Anlauf für " + was + " schlug fehl ("
          + kurzeMeldung(letzter) + "). Der zweite lief durch.");
      }
      return r;
    } catch (e) {
      letzter = e;
      /* Auch der gescheiterte Aufruf ist bezahlt; sein Verbrauch kommt seit
         dem 24.08.2026 am Fehler mit (modul_ki haengt d._verbrauch an). */
      ausleseKostenAddieren(e && e._verbrauch);
      if (e && e.codeFehlt) throw e;
      if (App.auslese.abbrechen) throw e;
      if (versuch === 2 || aussichtslos(e)) {
        if (versuch === 2) {
          vermerke.push("Zwei Anläufe für " + was + " sind gescheitert ("
            + kurzeMeldung(e) + ").");
        }
        throw e;
      }
      /* Kurz Luft lassen. Ein sofortiger zweiter Anlauf trifft dieselbe
         ueberlastete Gegenstelle. */
      await new Promise(function (w) { setTimeout(w, 1500); });
    }
  }
  throw letzter;
}

function kurzeMeldung(e) {
  return String((e && e.message) || e || "unbekannt").replace(/\s+/g, " ").slice(0, 120);
}

/* ===================================================================
 * VORAB-ZERLEGUNG: erkennen, dass ein Blatt in einem Aufruf nicht geht,
 * BEVOR der Aufruf 28 Sekunden dafuer verbraucht hat.
 * ===================================================================
 * Heute startet die Felderlesung erst, nachdem der Ganzblatt-Durchgang
 * gescheitert ist (warumNichtGenug weiter unten). Das kostet auf jedem
 * schwierigen Blatt einen vollen, bezahlten Fehlschlag und rund eine halbe
 * Minute -- und zwar genau auf den Blaettern, die es ohnehin nicht in einem
 * Zug schaffen.
 *
 * WICHTIG, und der Grund fuer den Zuschnitt dieser Funktion: Das
 * Ganzblatt-Ergebnis wird NICHT ersetzt. Es laeuft weiter, und die Felder
 * laufen daneben. Wer es ersetzt, bricht sieben Dinge, davon drei still:
 *   - Die Massstabsprobe. Das Modell gibt Koordinaten als Anteil des BILDES
 *     zurueck; das Messbild ist aber immer die GANZE Seite (messbildHolen).
 *     Kaemen die Koordinaten nur noch aus Feldausschnitten, wuerde eine
 *     fremde Masslinie vermessen und das Ergebnis traegt dann die Guete
 *     "abgesichert" mit dem Text "im Bild an N Massketten gemessen".
 *     Ein falscher Massstab mit dem Siegel des staerksten Belegs.
 *   - Der Rueckfall (zerlegt.kopf || r): sieht kein Feld den Massstabsblock,
 *     gaebe es ohne r gar keinen Massstab, kein Objekt, kein Plandatum.
 *   - raumKonsens braucht zwei Lesungen. Ohne die Ganzblatt-Liste faellt die
 *     Kennzeichnung "aus einer Lesung" fuer JEDEN Raum weg, und jeder
 *     Feldfehler stuende unwidersprochen im Raumbuch.
 * Deshalb: zusaetzlich, nicht anstelle. Das kostet ein Blatt mehr, und das
 * ist die ausdrueckliche Vorgabe -- es muss funktionieren.
 *
 * Beide Ausloeser stehen VOR dem ersten Aufruf fest und kosten nichts. */

/* Was beim Modell wirklich ankommt. Die Bildgrenze der Gegenstelle ist eine
   FLAECHENgrenze (MAX_KACHELN Kacheln zu je KACHEL_PX Punkten), nicht eine
   Kantengrenze. Deshalb kommt JEDES Ganzblatt mit derselben Punktzahl an,
   und die Aufloesung haengt allein an der Blattflaeche:
   A4 197 dpi, A3 139, A2 99, A1 70, A0 49. Gegen die Messung geprueft:
   der A3-Pruefplan kommt mit 2275x1609 = 138 dpi an, der A1-Bogen mit
   2293x1619 = 69 dpi (SPEZIFIKATION_FORMATE.md, Abschnitt 5.3). */
function ankommendDpi(seite) {
  const b = Number(seite && seite.breite_mm), h = Number(seite && seite.hoehe_mm);
  if (!(b > 0) || !(h > 0)) return null;
  return Math.sqrt(MAX_KACHELN * KACHEL_PX * KACHEL_PX / (b * h)) * 25.4;
}

/* Was das Blatt braucht. NICHT seite.aufloesung.dpi nehmen: das ist auf
   DPI_DECKEL gedeckelt und auf die native Scanaufloesung heruntergezogen --
   also genau dort blind, wo es darauf ankommt. */
const ZIEL_PX_VERSAL_HIER = 28;      // Spiegel von modul_pdf.js ZIEL_PX_VERSAL
function noetigDpi(seite) {
  const v = Number(seite && seite.kleinste_versalhoehe_mm);
  if (v > 0) return ZIEL_PX_VERSAL_HIER * 25.4 / v;
  const n = Number(seite && seite.dpi_nativ);
  if (n > 0) return n;               // reiner Scan: feiner ist nichts da
  return null;                       // nicht entscheidbar
}

/* Ab hier wird ein Ganzblatt unleserlich. GEMESSEN, nicht gesetzt:
   groesster Durchlaeufer 3,53 (Soethe A3, 1,45 mm Schrift, 7,9 Punkte
   Versalhoehe am Modell), kleinster Ausfall 6,29 (Hasenberg A3, 0,81 mm,
   4,4 Punkte). Dazu aus der Formatspezifikation 2,15 und 2,55 lesbar gegen
   7,86 unlesbar. 4,0 liegt dazwischen und haelt zusaetzlich die Grenze,
   dass ein A3 mit 1,3 mm Versalhoehe -- der kleinsten je an einem echten
   CAD-Plan gemessenen -- noch ungeteilt bleibt (3,93). */
const VERHAELTNIS_MAX = 4.0;
/* Ab hier wird die Antwort zu lang. Das Zeitbudget ist (28 s Frist minus
   3,2 s Anlauf) mal dem Durchsatz, der auf ECHTEN Blattlesungen gemessen
   wurde: 93 bis 101 Token je Sekunde, nicht die 135 aus zwei sehr kurzen
   Antworten. Also rund 2300 Ausgabe-Token. Ein Raum kostet im Median 91
   (gemessen an 75 zurueckgekommenen Raumobjekten), der Sockel rund 300.
   22 Raeume brauchen das Budget vollstaendig auf, 25 reissen es -- am
   A1-Bogen "Dumach 1" belegt, wo nach 12 Raeumen abbrach. 18 laesst Marge,
   weil die erwartete Zahl eine Schaetzung ist und ein abgeschnittener
   Aufruf doppelt bezahlt wird. */
const RAEUME_MAX_JE_AUFRUF = 18;
const RAEUME_JE_TEIL = 12;           // 12 Raeume ~ 1150 Token, halbes Budget

/** Entscheidet VOR dem ersten Aufruf, ob ein Blatt zusaetzlich feldweise
 *  gelesen werden soll. Gibt null zurueck, wenn ein Aufruf reicht --
 *  der Regelfall, denn ein gewoehnlicher Grundriss darf die Zerlegung
 *  weder bezahlen noch auf sie warten. */
/* Der GRUND allein, ohne die Frage nach den Zeichnungsfeldern.
   Getrennt, weil die Kostenvorschau ihn braucht: sie laeuft, BEVOR
   seiteZerlegen() gelaufen ist, kennt also seite.felder noch nicht. Frueher
   stand in der Vorschau, es lasse sich vorher nicht sagen, ob ein Bogen
   zerlegt werden muss. Fuer die beiden Ausloeser hier stimmt das nicht mehr,
   und eine Vorschau, die unter der Rechnung liegt, ueberrascht am
   Monatsende. */
function vorabGrund(seite) {
  if (!seite) return null;
  /* Blaetter ohne Raumertrag nie zerlegen: eine Ansicht oder ein Lageplan
     zahlte sonst die Zerlegung eines Grundrisses mit. */
  const art = (seite.blattkopf && seite.blattkopf.blattart) || null;
  if (art === "ansicht" || art === "lageplan") return null;
  if (seite.typ === "textseite" || seite.typ === "leer") return null;

  /* AUSLOESER 1: die Antwort wird zu lang.
     Nur, wenn die Raumzahl aus dem Dokument kommt und nicht geraten ist. */
  let erwartet = 0;
  try { erwartet = stempelraeumeDesBlatts(seite).length; } catch (e) { erwartet = 0; }
  if (erwartet >= RAEUME_MAX_JE_AUFRUF) {
    return {
      teile: Math.max(2, Math.ceil(erwartet / RAEUME_JE_TEIL)),
      grund: erwartet + " Flächenstempel stehen im Textstand des Blattes; ein "
        + "einzelner Durchgang trägt nach den Messungen höchstens 22 Räume.",
    };
  }

  /* AUSLOESER 2: die Schrift kommt nicht mehr an. */
  const nd = noetigDpi(seite), ad = ankommendDpi(seite);
  if (nd && ad) {
    const verhaeltnis = nd / ad;
    if (verhaeltnis > VERHAELTNIS_MAX) {
      const px = ZIEL_PX_VERSAL_HIER / verhaeltnis;
      return {
        teile: Math.max(2, Math.ceil(Math.pow(verhaeltnis / VERHAELTNIS_MAX, 2))),
        grund: "die kleinste Schrift des Blattes käme auf dem ganzen Blatt mit nur "
          + px.toFixed(1) + " Bildpunkten Versalhöhe an; lesbar ist sie ab etwa 7.",
      };
    }
  }
  return null;
}

function vorabFeldweise(seite) {
  const g = vorabGrund(seite);
  if (!g) return null;
  /* Ohne mindestens zwei Zeichnungsfelder gibt es keine Schnittkante, an der
     sich ohne Verlust teilen liesse. Und geschnitten wird an den Feldern,
     nicht an gedachten Kanten -- mehr Teile als Felder gibt es nicht. */
  const felder = (seite && seite.felder) || [];
  if (felder.length < 2) return null;
  return { teile: Math.min(felder.length, g.teile), grund: g.grund };
}

/** Warum ein Blatt einen zweiten, zerlegten Anlauf braucht -- oder keinen.
 *  Gibt null zurueck, wenn die Antwort trägt. */
function warumNichtGenug(r) {
  if (!r) return "Es kam nichts zurück.";
  /* Der Endpunkt konnte gar nichts retten (Kennung laengengrenze oder
     zeitgrenze): frueher stand danach eine Fehlermeldung mit der Bitte, das
     Blatt in zwei Haelften abzulegen. Jetzt ist es der Startschuss der
     Selbstzerlegung. */
  if (r._zuGross) {
    return r._zuGross === "zeit"
      ? "Die Antwort wurde von der Zeitgrenze abgeschnitten, bevor etwas ankam."
      : "Die Antwort lief in die Längengrenze, bevor etwas Verwertbares ankam.";
  }
  if (r._abgeschnitten) {
    return r._abgeschnitten.grund === "zeit"
      ? "Die Antwort wurde von der Zeitgrenze abgeschnitten."
      : "Die Antwort lief in die Längengrenze und ist unvollständig.";
  }
  if (r.ist_grundriss === true && !(r.raeume || []).length) {
    return "Das Blatt ist ein Grundriss, es kam aber kein einziger Raum zurück.";
  }
  return null;
}

/** Belege dafuer, dass ein Blatt ein Grundriss ist, UNABHAENGIG vom Modell.
 *
 *  MEHRFACH BEIM KUNDEN AUFGETRETEN: ein echter Grundriss kommt mit
 *  ist_grundriss=false und null Raeumen zurueck -- und fiel bisher STILL aus
 *  der Rechnung (warumNichtGenug liefert fuer diesen Fall null, weil eine
 *  echte Ansicht ohne Raeume ein gueltiges Ergebnis ist). Eine Heizlast ohne
 *  das Erdgeschoss ist still falsch. Deshalb wird das Urteil des Modells
 *  hier gegen das gehalten, was OHNE Modell ueber das Blatt bekannt ist:
 *  Blattkopf, Dateiname/Beschriftung, Flaechenstempel im Textstand.
 *  Liegt ein solcher Beleg vor, ist "kein Grundriss, null Raeume" kein
 *  Ergebnis, sondern ein Fall fuer die automatische Nachlesung. */
function blattWirktGrundriss(seite) {
  if (!seite) return null;
  const kopf = seite.blattkopf || {};
  if (kopf.blattart === "grundriss") {
    return "dem Blattkopf (Blattart „Grundriss“)";
  }
  /* Ein Blatt, das der Blattkopf ausdruecklich ANDERS einordnet, wird nicht
     umgedeutet -- ein Schnitt bleibt ein Schnitt. */
  if (kopf.blattart && kopf.blattart !== "grundriss") return null;
  /* Unterstrich, Punkt und Bindestrich sind in Dateinamen die Leerzeichen:
     "3_BA 1_Erdgeschoss.pdf" muss genauso zaehlen wie "Grundriss EG". */
  const t = [seite.bezeichnung || seite.name || "", seite.ueberschrift || ""]
    .join(" ").replace(/[_\-.]+/g, " ");
  /* EIN BLATT, DAS SICH SELBST SCHNITT ODER ANSICHT NENNT, WIRD NICHT ZUM
     GRUNDRISS ERKLAERT. Befund „Am Gunnebach 9" (25.08.2026): das
     Schnittblatt „16_BA 06_S AA.pdf" bekam ueber seine Beschriftungen eine
     Raumforderung — aus den Hoehenkoten eines Schnitts werden aber nie
     Raeume. „S AA" ist die uebliche Kurzform fuer „Schnitt A-A"
     (Kennbuchstabe verdoppelt). Nennt der Name das Blatt ausdruecklich
     Grundriss, gilt weiter der Grundriss-Zweig darueber. */
  const schnittName = !/grundriss/i.test(t)
    && /\bschnitt\b|\bansicht(en)?\b|\bs\s?([a-z])\s?\2\b/i.test(t);
  if (schnittName) return null;
  const muster = /grundriss|(?:erd|ober|keller|dach|unter)geschoss|\b(?:EG|OG|KG|DG|UG)\b/i;
  if (muster.test(t)) {
    /* WOHER DER NAME STAMMT, GEHÖRT IN DIE BEGRÜNDUNG.
       Prüflauf P2211 vom 26.08.2026: vier Blätter wurden „nach dem Namen des
       Blattes" als Grundriss geführt — der Name stammte aber aus der
       abgelegten DATEI („…Grundrisse.pdf"), während das Schriftfeld
       derselben Blätter „Lageplan", „Ansicht" und „Schnitt" nannte. Ein
       Dateiname gilt für alle Seiten einer Mappe gleich und sagt über das
       einzelne Blatt nichts. Die Einstufung bleibt, wie sie war; sie sagt
       jetzt aber, worauf sie beruht, damit der Bearbeiter sie nachrechnen
       und ihr widersprechen kann. */
    const kopfTeil = String(seite.ueberschrift || "").replace(/[_\-.]+/g, " ");
    const dateiTeil = String(seite.bezeichnung || seite.name || "")
      .replace(/[_\-.]+/g, " ");
    if (muster.test(kopfTeil)) {
      return "der Überschrift auf dem Blatt („" + kopfTeil.trim().slice(0, 60) + "“)";
    }
    if (muster.test(dateiTeil)) {
      return "der Bezeichnung der abgelegten Datei („"
        + dateiTeil.trim().slice(0, 60) + "“) — nicht aus dem Schriftfeld "
        + "dieses Blattes";
    }
    return "dem Namen des Blattes („" + t.trim().slice(0, 60) + "“)";
  }
  try {
    if (stempelraeumeDesBlatts(seite).length >= 2) {
      return "den Flächenstempeln im Textstand der Zeichnung";
    }
  } catch (e) {}
  return null;
}

/** Der Kosten-Deckel je Bericht, in Dollar. Eine Nachlesung ist billig (ein
 *  Feld), aber sie zaehlt in denselben Topf wie alles andere: jeder Aufruf
 *  laeuft ueber ausleseKostenAddieren. Ist der Deckel erreicht, wird nicht
 *  nachgelesen, sondern gefragt -- blindes Wiederholen ist keine Rettung.
 *  App.auslese.deckel darf den Wert ueberschreiben (Kosten-Waechter). */
const NACHLESE_DECKEL_USD = 2;
function nachlesungImBudget() {
  const a = App.auslese || {};
  const deckel = a.deckel > 0 ? a.deckel : NACHLESE_DECKEL_USD;
  return (a.kosten || 0) < deckel;
}

/** Der Schluessel, an dem sich zwei Raumzeilen als gleich erkennen lassen. */
function raumSchluessel(r) {
  return [String(r.bezeichnung || "").trim().toLowerCase(),
          r.flaeche_m2 == null ? "" : Number(r.flaeche_m2).toFixed(2),
          String(r.geschoss || "").trim().toLowerCase()].join("|");
}

/** Doppelt aussehende Zeilen in einer Raumliste zaehlen.
 *
 *  BEWUSST WIRD NICHTS GESTRICHEN. Ein erster Anlauf strich gleich aussehende
 *  Zeilen beim Zusammenfuegen der Felder -- und verlor damit am Bogen
 *  "Dumach 1" einen echten Raum: das Dachgeschoss hat ZWEI Studios von je
 *  45,96 m², und die sind nicht derselbe Raum. Dasselbe gilt fuer jedes
 *  gespiegelte Doppelhaus, in dem "HWR 1,83 m²" zweimal vorkommt.
 *  Ein zu viel gezaehlter Raum steht sichtbar im Raumbuch und faellt beim
 *  Durchsehen auf. Ein stillschweigend gestrichener faellt nie auf. Deshalb
 *  bleiben beide stehen und der Kollege bekommt einen Vermerk. */
function doppelteRaeume(liste) {
  const zaehler = {}, doppelt = [];
  (liste || []).forEach(function (r) {
    const k = raumSchluessel(r);
    if (k === "||") return;          // unbeschriftet und ohne Flaeche: kein Urteil
    zaehler[k] = (zaehler[k] || 0) + 1;
    if (zaehler[k] === 2) doppelt.push(r.bezeichnung || "unbeschriftet");
  });
  return doppelt;
}

/* ===========================================================================
 * Selbstzerlegung: Haelften mit Ueberlappung
 * ===========================================================================
 * GEMESSEN am 22.08.2026 mit Sebastians Blaettern am Live-Endpunkt: der Bogen
 * "BV 2-0887 Ziolkowski" lief als Ganzes in die Laengengrenze, und die
 * Zerlegung nach Zeichnungsfeldern half nur halb -- Feld 2 trug alle drei
 * Grundrisse und lief WIEDER in die Grenze. Zerlegt wurde bisher allein nach
 * Zeichnungsfeldern, nie nach Umfang. Die Haelften sind der fehlende zweite
 * Schritt: jedes Teil, das zu umfangreich bleibt, wird laengs seiner langen
 * Kante halbiert, mit Ueberlappung an der Schnittkante, hoechstens zweimal.
 * Die Meldung "bitte in zwei Haelften ablegen" an den MENSCHEN ist damit
 * ersetzt: das Werkzeug legt selbst in Haelften ab.
 * ======================================================================== */

/** Zwei ueberlappende Haelften eines Rechtecks (Anteile der Blattkante).
 *  Geteilt wird laengs der LANGEN Kante; die Ueberlappung von 4 % je Seite
 *  sorgt dafuer, dass ein Raumstempel auf der Schnittlinie in mindestens
 *  einer Haelfte vollstaendig steht. */
function haelftenVon(r) {
  r = r || { x: 0, y: 0, x2: 1, y2: 1 };
  const b = r.x2 - r.x, h = r.y2 - r.y;
  const u = 0.04 * Math.max(b, h);
  if (h >= b) {
    const m = r.y + h / 2;
    return [{ x: r.x, y: r.y, x2: r.x2, y2: Math.min(r.y2, m + u) },
            { x: r.x, y: Math.max(r.y, m - u), x2: r.x2, y2: r.y2 }];
  }
  const m = r.x + b / 2;
  return [{ x: r.x, y: r.y, x2: Math.min(r.x2, m + u), y2: r.y2 },
          { x: Math.max(r.x, m - u), y: r.y, x2: r.x2, y2: r.y2 }];
}

/** Fuegt die Ergebnisse UEBERLAPPENDER Teile zusammen.
 *
 *  Anders als bei den Zeichnungsfeldern (getrennte Rechtecke, dort wird NIE
 *  gestrichen) liegt hier dieselbe Schnittkante in beiden Teilen: ein Raum in
 *  der Ueberlappung kommt zweimal zurueck und ist EIN Raum. Entdoppelt wird
 *  ueber den vorhandenen raumSchluessel, aber nur bis auf die Hoechstzahl, die
 *  ein EINZELNES Teil gemeldet hat -- die zwei Studios des Bogens "Dumach 1"
 *  (zweimal 45,96 m² im selben Teil) bleiben also beide stehen. */
/** Vereint die Schriftfeld-Bloecke ("objekt") mehrerer Teil-Lesungen
 *  feldweise: das erste Teil, das ein Feld wirklich gelesen hat, gibt es her.
 *
 *  WARUM NICHT "EIN TEIL GEWINNT ALLES": Der "kopf" der Zerlegung wird nach
 *  dem Massstabsblock gewaehlt (das Teil mit den Masszahlen). GEMESSEN am
 *  24.08.2026 an "BV 2-0887 Ziolkowski": die eine Haelfte trug die
 *  Aussenbemassung und wurde kopf, die andere das Schriftfeld mit dem
 *  Plandatum "17.05.2022" -- und genau dieses Feld fiel weg. Ohne Plandatum
 *  kein angenommenes Baujahr, keine Bauteiltypen, 2,5 statt 6,9 kW. */
function objektVerbund(teile) {
  let aus = null;
  (teile || []).forEach(function (t) {
    if (!t || !t.objekt || typeof t.objekt !== "object") return;
    Object.keys(t.objekt).forEach(function (f) {
      const w = t.objekt[f];
      if (w === null || w === undefined || String(w).trim() === "") return;
      if (f === "planungsart" && String(w) === "unklar") return;
      aus = aus || {};
      if (aus[f] === null || aus[f] === undefined) aus[f] = w;
    });
  });
  return aus;
}

function haelftenVereinen(teile, vermerke) {
  const gueltig = (teile || []).filter(Boolean);
  let abgeschnitten = 0, grundriss = false, kopf = null;
  /* Der Schluessel der Entdopplung ist NAME plus GESCHOSS — ausdruecklich
     OHNE die Flaeche. GEMESSEN am 24.08.2026 am Live-Endpunkt (Messlauf an
     "BV 2-0887 Ziolkowski", Feld 2 in Haelften): ein Raum auf der
     Schnittkante kommt in der einen Haelfte MIT Flaechenstempel zurueck
     ("GAST / ARBEITEN, 12,16 m²") und in der anderen ohne (der Stempel lag
     jenseits des Schnitts). Mit der Flaeche im Schluessel sind das zwei
     Schluessel, die Dublette blieb stehen, und im Raumbuch standen 15 statt
     13 Raeume. Die Dumach-Regel bleibt erhalten: was ein EINZELNES Teil
     mehrfach meldet (zwei Studios je 45,96 m² im selben Teil), bleibt
     mehrfach — die Hoechstzahl je Teil deckelt, nicht der Schluessel. */
  const schluessel = function (r) {
    const roh = (r && typeof r.bezeichnung === "object" && r.bezeichnung)
      ? r.bezeichnung.wert : (r && r.bezeichnung);
    const name = String(roh == null ? "" : roh).trim();
    if (!name) return null;                    // unbenannt: kein Urteil
    const G = window.KERN_GEGENPROBE;
    const norm = G && G.normName ? G.normName(name)
      : name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "");
    const g = (r && typeof r.geschoss === "object" && r.geschoss)
      ? r.geschoss.wert : (r && r.geschoss);
    /* Kanonisiert: die eine Haelfte schreibt "KG", die andere
       "Kellergeschoss" — dasselbe Geschoss darf nicht zwei Schluessel geben. */
    return norm + "|" + geschossKanon(g).toLowerCase();
  };
  const ziel = {};
  gueltig.forEach(function (t) {
    const z = {};
    (t.raeume || []).forEach(function (r) {
      const k = schluessel(r);
      if (k) z[k] = (z[k] || 0) + 1;
    });
    Object.keys(z).forEach(function (k) { ziel[k] = Math.max(ziel[k] || 0, z[k]); });
  });
  /* Erst einsammeln, dann je Schluessel bis zur Hoechstzahl behalten —
     bevorzugt die Zeilen MIT Flaeche: die Dublette ohne Stempel ist die
     angeschnittene. Die Reihenfolge im Raumbuch bleibt die der Lesung. */
  const alle = [];
  gueltig.forEach(function (t) {
    if (t._abgeschnitten) abgeschnitten++;
    if (t.ist_grundriss === true) grundriss = true;
    if (!kopf && t.massstab && ((t.massstab.angaben || []).length
        || (t.massstab.masszahlen || []).length)) kopf = t;
    if (!kopf && t.objekt && Object.keys(t.objekt).some(function (k) {
      return t.objekt[k];
    })) kopf = t;
    (t.raeume || []).forEach(function (r) { alle.push(r); });
  });
  const stand = {}, gestrichen = [];
  const behalten = new Set();
  [true, false].forEach(function (mitFlaeche) {
    alle.forEach(function (r, i) {
      if (behalten.has(i)) return;
      const hatFlaeche = r.flaeche_m2 !== null && r.flaeche_m2 !== undefined
        && r.flaeche_m2 !== "";
      if (mitFlaeche !== hatFlaeche) return;
      const k = schluessel(r);
      if (!k) { behalten.add(i); return; }       // ohne Urteil: behalten
      stand[k] = (stand[k] || 0) + 1;
      if (stand[k] <= ziel[k]) behalten.add(i);
    });
  });
  /* EIN ANGESCHNITTENER RAUMNAME IST KEIN ZWEITER RAUM.
   *
   * GEMESSEN am 26.08.2026 an "BV 2-0887 Ziolkowski", zweiter Lauf: neben
   * "GAST / ARBEITEN" stand "ST / ARBEITEN" mit A = 0 im Raumbuch -- der
   * Rest der Beschriftung, den die zweite Haelfte jenseits der Schnittkante
   * noch erwischt hat. Das Urteil meldete daraufhin 14 statt 13 Raeumen. Der
   * Schluessel Name+Geschoss faengt das nicht: die beiden Namen sind
   * verschieden.
   *
   * Erkannt wird es an drei Bedingungen zugleich, damit kein echter Raum
   * faellt: die Zeile hat KEINE Flaeche, ihr Name ist mindestens vier
   * Zeichen lang, und er ist echtes Anfangs- oder Endstueck des Namens einer
   * anderen Zeile im selben Geschoss, die eine Flaeche traegt. "WC" und
   * "Bad" bleiben damit unangetastet; "Kind" neben "Kinderzimmer" ebenso,
   * denn "Kind" traegt seine eigene Flaeche. */
  const bruchstueck = new Set();
  {
    const G2 = window.KERN_GEGENPROBE;
    const norm2 = function (x) {
      const roh = (x && typeof x.bezeichnung === "object" && x.bezeichnung)
        ? x.bezeichnung.wert : (x && x.bezeichnung);
      const t = String(roh == null ? "" : roh).trim();
      return G2 && G2.normName ? G2.normName(t)
        : t.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "");
    };
    const gesch2 = function (x) {
      const g = (x && typeof x.geschoss === "object" && x.geschoss)
        ? x.geschoss.wert : (x && x.geschoss);
      return geschossKanon(g).toLowerCase();
    };
    const mitA = alle.filter(function (r) {
      return r.flaeche_m2 !== null && r.flaeche_m2 !== undefined && r.flaeche_m2 !== "";
    });
    alle.forEach(function (r, i) {
      if (!behalten.has(i)) return;
      const hatA = r.flaeche_m2 !== null && r.flaeche_m2 !== undefined
        && r.flaeche_m2 !== "";
      if (hatA) return;
      const n = norm2(r);
      if (n.length < 4) return;
      const g = gesch2(r);
      const traeger = mitA.some(function (x) {
        if (gesch2(x) !== g) return false;
        const m = norm2(x);
        return m.length > n.length
          && (m.slice(-n.length) === n || m.slice(0, n.length) === n);
      });
      if (traeger) bruchstueck.add(i);
    });
  }

  const raeume = [];
  const bruchNamen = [];
  alle.forEach(function (r, i) {
    const roh = (typeof r.bezeichnung === "object" && r.bezeichnung)
      ? (r.bezeichnung.wert || "unbeschriftet")
      : (r.bezeichnung || "unbeschriftet");
    if (bruchstueck.has(i)) { bruchNamen.push(roh); return; }
    if (behalten.has(i)) raeume.push(r);
    else gestrichen.push(roh);
  });
  if (bruchNamen.length) {
    vermerke.push(mz(bruchNamen.length, "Beschriftung war an der Schnittkante "
        + "abgeschnitten und wurde", "Beschriftungen waren an der Schnittkante "
        + "abgeschnitten und wurden")
      + " dem vollständigen Raum zugeordnet statt als eigener Raum übernommen ("
      + bruchNamen.slice(0, 4).join(", ")
      + (bruchNamen.length > 4 ? " und weitere" : "") + ").");
  }
  if (gestrichen.length) {
    vermerke.push("Die Hälften überlappen sich an der Schnittkante; "
      + mz(gestrichen.length, "dort doppelt gelesener Raum wurde",
           "dort doppelt gelesene Räume wurden") + " nur einmal übernommen ("
      + gestrichen.slice(0, 4).join(", ")
      + (gestrichen.length > 4 ? " und weitere" : "")
      + "). Bitte im Raumbuch prüfen, ob ein Raum fehlt.");
  }
  /* Das Schriftfeld haengt nicht am kopf-Teil: es wird ueber ALLE Teile
     feldweise vereint (objektVerbund), sonst verliert die Haelfte mit den
     Masszahlen das Plandatum der anderen. */
  const objektAlle = objektVerbund(gueltig);
  if (objektAlle) {
    kopf = Object.assign({}, kopf || {}, { objekt: objektAlle });
  }
  return { raeume: raeume, ist_grundriss: grundriss, kopf: kopf,
           abgeschnitten: abgeschnitten };
}

/* ===========================================================================
 * Budgetwaechter
 * ===========================================================================
 * Die Selbstzerlegung kostet zusaetzliche Aufrufe. Damit sie nicht still
 * teuer wird, laufen die Zusatzaufrufe gegen die Kostengrenze je Bericht.
 * Droht die Grenze zu reissen, wird GENAU EINMAL gefragt -- mit Kostenstand
 * und Vorschau -- und die Antwort gilt fuer den ganzen restlichen Lauf. */
const KOSTEN_GRENZE_USD = 2.0;
/* Je Aufruf, aus der Messung vom 22.08.2026: Eingabe 7,8-17,5 k Token zu
   3 $/Mio plus Ausgabe bis 3200 Token zu 15 $/Mio, zusammen rund 9 Cent. */
const KOSTEN_JE_AUFRUF_USD = 0.09;

async function budgetErlaubt(zusatzAufrufe) {
  const a = App.auslese;
  if (!a) return true;
  if (a.budgetFreigabe === true) return true;
  if (a.budgetFreigabe === false) return false;
  const n = Math.max(1, zusatzAufrufe || 1);
  if ((a.kosten || 0) + n * KOSTEN_JE_AUFRUF_USD <= KOSTEN_GRENZE_USD) return true;
  /* Seit die Rettungen gleichzeitig laufen, koennen zwei Teile die Grenze
     im selben Augenblick reissen. Die Frage laeuft deshalb als EIN geteilter
     Vorgang: wer waehrend der offenen Frage ankommt, wartet auf DIESELBE
     Antwort, statt einen zweiten Dialog zu oeffnen. */
  if (a.budgetFrage) {
    await a.budgetFrage;
    return a.budgetFreigabe === true;
  }
  let frageFertig;
  a.budgetFrage = new Promise(function (aufl) { frageFertig = aufl; });
  const weiter = await fragen({
    titel: "Kostengrenze erreicht",
    text: "Die Auslese hat bisher rund " + fmt(a.kosten || 0, 2)
      + " $ gekostet; die Grenze je Bericht liegt bei "
      + fmt(KOSTEN_GRENZE_USD, 2) + " $. Um das Blatt vollständig zu lesen, "
      + "will das Werkzeug es zerlegen — das braucht noch etwa "
      + mz(n, "Aufruf", "Aufrufe") + " (rund "
      + fmt(n * KOSTEN_JE_AUFRUF_USD, 2) + " $).\n\n"
      + "Ohne Weiterlesen bleibt das Blatt unvollständig; die Räume wären "
      + "dann von Hand zu ergänzen.",
    jaText: "Weiterlesen", neinText: "Hier stoppen",
  });
  a.budgetFreigabe = weiter === true;
  a.budgetFrage = null;
  frageFertig();
  return a.budgetFreigabe;
}

/** Liest EIN Teilrechteck eines Blattes.
 *
 *  Laeuft auch dieses Teil in die Laengen- oder Zeitgrenze, wird es einmal in
 *  zwei ueberlappende Haelften geteilt und erneut gelesen (tiefe begrenzt
 *  das auf eine Stufe). Das Gerettete des Endpunkts (jsonNotdurft) zaehlt
 *  dabei als Teilergebnis, nicht als Fehler: es steht als abgeschnittenes t
 *  da und wird nur ersetzt, wenn die Haelften mehr bringen. */
async function teilLesen(seite, rect, vermerke, name, zusatz, tiefe) {
  let t = null, zuGross = false;
  try {
    const bild = await seiteAlsBild(seite, rect);
    /* Auch die Rettung laeuft durch den Planer: sie zaehlt in derselben
       Fortschrittsanzeige und haelt die Obergrenze gleichzeitiger Aufrufe
       ein — sonst laegen bei mehreren Blaettern in Rettung mehr Anfragen
       an der Gegenstelle, als die Begruendung der Obergrenze traegt. */
    t = await aufrufGeplant("raeume",
      blattZeile(seite, "— " + name), function () {
        return leseVersuch(bild, "raeume", vermerke, name, zusatz);
      });
  } catch (e) {
    /* Die Kennungen kommen vom NEUEN Endpunkt; der heute verteilte alte
       meldet dieselben Faelle nur im Wortlaut ("Abbruchgrund: max_tokens",
       "an der Längengrenze abgeschnitten"). Beide muessen die Haelften
       ausloesen — sonst bleibt genau das Feld ungelesen, das alle
       Grundrisse traegt (GEMESSEN an Feld 2 des Bogens "BV 2-0887"). */
    const wl = String((e && e.message) || "");
    if ((e && (e.kennung === "laengengrenze" || e.kennung === "zeitgrenze"))
        || /Abbruchgrund:\s*max_tokens|an der Längengrenze abgeschnitten/.test(wl)) {
      zuGross = true;
    } else {
      vermerke.push(name + " ließ sich nicht lesen: " + kurzeMeldung(e));
      return null;
    }
  }
  if ((zuGross || (t && t._abgeschnitten)) && (tiefe || 0) < 2
      && !App.auslese.abbrechen && (await budgetErlaubt(2))) {
    vermerke.push(name + (t ? " kam abgeschnitten zurück"
        : " war für einen Durchgang zu umfangreich")
      + "; es wird in zwei überlappenden Hälften gelesen.");
    const h = haelftenVon(rect);
    /* Die beiden Haelften haengen nicht aneinander; sie laufen gleichzeitig
       durch den Planer (Obergrenze und Anzeige dort). Die Reihenfolge des
       Ergebnisses gibt das Array vor, nicht die Ankunft der Antworten. */
    const beide = await Promise.all([
      teilLesen(seite, h[0], vermerke, name + ", Hälfte 1",
        zusatz, (tiefe || 0) + 1),
      teilLesen(seite, h[1], vermerke, name + ", Hälfte 2",
        zusatz, (tiefe || 0) + 1),
    ]);
    const zam = haelftenVereinen(beide, vermerke);
    const besser = zam.raeume.length > ((t && t.raeume) || []).length
      || (!zam.abgeschnitten && zam.raeume.length > 0
          && zam.raeume.length >= ((t && t.raeume) || []).length);
    if (besser) {
      t = Object.assign({}, zam.kopf || t || {}, {
        ist_grundriss: zam.ist_grundriss === true
          || (t && t.ist_grundriss) === true,
        raeume: zam.raeume,
      });
      if (zam.abgeschnitten) {
        t._abgeschnitten = { grund: "max_tokens", raeume: zam.raeume.length };
      } else {
        delete t._abgeschnitten;
      }
    }
  }
  if (!t && zuGross) {
    vermerke.push(name + " blieb auch nach dem Teilen ohne Ergebnis.");
  }
  return t;
}

/** Liest ein Blatt Feld fuer Feld und fuegt die Antworten zusammen.
 *
 *  Die Felder haengen nicht aneinander; sie laufen GLEICHZEITIG durch den
 *  Planer (GEMESSEN am 24.08.2026, Bogen "260514 - Dumach 1": drei Felder
 *  nacheinander 22,7 + 22,0 + 12,0 s — gleichzeitig kostet die Rettung nur
 *  das laengste Feld). Zusammengefuegt wird in der Reihenfolge der FELDER,
 *  nicht der Antworten, damit das Raumbuch dieselbe Ordnung behaelt. */
async function feldweiseLesen(seite, teile, vermerke, zusatz) {
  let raeume = [], grundriss = false, kopf = null, abgeschnitten = 0;
  /* teilLesen faengt die Grenzfaelle selbst: ein Feld, das alle Grundrisse
     traegt und wieder in die Laengengrenze laeuft (gemessen an Feld 2 des
     Bogens "BV 2-0887 Ziolkowski"), wird in Haelften weitergelesen statt
     abgeschnitten stehenzubleiben. */
  const ergebnisse = await Promise.all(teile.map(function (feld, i) {
    if (App.auslese.abbrechen) return Promise.resolve(null);
    return teilLesen(seite, feld, vermerke, "Feld " + (i + 1), zusatz, 1);
  }));
  for (let i = 0; i < ergebnisse.length; i++) {
    const t = ergebnisse[i];
    if (!t) continue;
    if (t._abgeschnitten) abgeschnitten++;
    if (t.ist_grundriss === true) grundriss = true;
    raeume = raeume.concat(t.raeume || []);
    /* Der Massstabsblock und das Schriftfeld stehen nur in EINEM Feld, meist
       dem mit dem Schriftfeld. Genommen wird das erste, das etwas hergibt. */
    if (!kopf && t.massstab && ((t.massstab.angaben || []).length
        || (t.massstab.masszahlen || []).length)) kopf = t;
    if (!kopf && t.objekt && Object.keys(t.objekt).some(function (k) {
      return t.objekt[k];
    })) kopf = t;
  }
  const doppelt = doppelteRaeume(raeume);
  if (doppelt.length) {
    vermerke.push("Gleich aussehende Räume kamen mehrfach zurück ("
      + doppelt.slice(0, 4).join(", ")
      + (doppelt.length > 4 ? " und weitere" : "")
      + "). Sie bleiben stehen: ein gespiegelter Grundriss hat solche Räume "
      + "wirklich zweimal. Bitte im Raumbuch prüfen, ob eine Zeile zu viel ist.");
  }
  /* Wie in haelftenVereinen: das Schriftfeld kommt aus ALLEN Feldern
     feldweise zusammen, nicht nur aus dem kopf-Feld mit den Masszahlen. */
  const objektAlle = objektVerbund(ergebnisse);
  if (objektAlle) {
    kopf = Object.assign({}, kopf || {}, { objekt: objektAlle });
  }
  return { raeume: raeume, ist_grundriss: grundriss, kopf: kopf,
           abgeschnitten: abgeschnitten };
}

async function stapelAuswerten() {
  /* Ein zweiter Klick auf den gelben Knopf startete den ganzen Stapel ein
     zweites Mal: doppelte Modellaufrufe, doppelte Kosten, und die beiden
     Läufe schrieben abwechselnd in dieselbe Seite. Der Knopf ist während
     des Laufs zusätzlich ausgeschaltet (stapelKnopf); diese Sperre hier
     fängt den Weg über die Tastatur und über einen zweiten Klick ab, der
     zwischen Klick und Neuzeichnen liegt. */
  if (App.auslese && App.auslese.laeuft) return;
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  const zuTun = seiten.filter(auswertbar);
  /* Ein wiederhergestelltes Blatt hat seine Daten, aber kein Bild mehr.
     Es hier stillschweigend mitzunehmen hiesse: ein Fehler je Blatt und
     kein Hinweis, was zu tun ist. */
  const nurDaten = seiten.filter(function (x) {
    return !x.ausgewertet && x.verwenden !== false && x.nurDaten;
  });
  /* Meldungen dieses Ablaufs stehen IN DER SEITE. Ein tab-modales alert()
     laesst die Seite eingefroren wirken; ein Pruefer hielt das Werkzeug
     deswegen fuer abgestuerzt. */
  const inSeite = function (text) {
    App.ausleseBericht = { zeit: Date.now(), blaetter: [],
      fehler: [{ blatt: "Auswertung", text: text }] };
    render();
  };
  if (!zuTun.length) {
    inSeite(nurDaten.length
      ? mz(nurDaten.length, "Blatt stammt", "Blätter stammen")
        + " aus dem wiederhergestellten Stand und liegt nicht mehr als Datei vor. "
        + "Zum Auslesen bitte noch einmal ablegen."
      : "Es sind keine Seiten zur Auswertung vorgemerkt.");
    return;
  }
  if (!window.MODUL_KI) {
    inSeite("Das Auslesemodul fehlt in dieser Fassung.");
    return;
  }
  if (!window.MODUL_KI.konfiguriert()) {
    if (!window.MODUL_KI.codeErfragen()) return;
  }

  App.auslese = { laeuft: true, gesamt: zuTun.length, fertig: 0, kosten: 0,
                  budgetFreigabe: null, aufrufe: 0, aufrufeFertig: 0,
                  aktiv: [], laufendeSeiten: [],
                  abbrechen: false, was: "Analyse beginnt", laufendeSeite: null };
  /* Der Bericht der vorigen Auswertung ist mit dem Start der neuen erledigt;
     stehen bleiben duerfen nur Vermerke DIESES Laufs (stapelAbschliessen). */
  App.ausleseBericht = null;
  render();

  const fehler = [];
  /* ALLE Blaetter starten zugleich; wie viele Endpunkt-Aufrufe WIRKLICH
     gleichzeitig laufen, begrenzt der PLANER (drei, Begruendung dort). Das
     Rendern der spaeteren Blaetter geschieht damit, waehrend die ersten
     Antworten schon unterwegs sind. Die Reihenfolge der ANZEIGE bleibt die
     des Stapels: jedes Blatt schreibt nur in seine eigene Seite, und
     Raumbuch wie Abschlussbericht gehen den Stapel am Ende von vorn nach
     hinten durch — gleich, in welcher Reihenfolge die Antworten eintrafen.
     GEMESSEN vorher (alles nacheinander): Ziolkowski (2 Blaetter) 165 s,
     Dumach (1 Bogen) 126 s bis zum Urteil. */
  await Promise.all(zuTun.map(function (seite, pos) {
    return blattAuswerten(seite, seiten, pos, zuTun.length, fehler);
  }));
  stapelAbschliessen(zuTun, fehler);
}

/** Eine Zeile fuer die Fortschrittsanzeige: Blattname plus Taetigkeit. */
function blattZeile(seite, tun) {
  return (seite.bezeichnung || seite.name || "Blatt") + " " + (tun || "");
}

/** Warum die Hoehen-Lesung laufen soll — oder null, wenn auf dem Blatt kein
 *  Schnitt zu erwarten ist. Die Betriebsart "hoehen" liest ausdruecklich
 *  einen Schnitt; ein Blatt ohne Schnitt kostet nur Zeit und Geld (gemessen
 *  12,7 s auf einem reinen Grundriss-Bogen, 5,4 s auf einer Ansicht).
 *  Jeder Rueckgabetext ist ein BELEG fuer einen Schnitt; fehlt die
 *  Gegenprobe, gilt die alte, vorsichtige Regel weiter. */
function hoehenLesenGrund(seite, r, gp, kopfArt) {
  const beschriftung = [seite.bezeichnung || seite.name || "",
                        seite.ueberschrift || ""].join(" ");
  if (kopfArt === "schnitt") return "das Schriftfeld nennt die Blattart Schnitt";
  if (/schnitt/i.test(beschriftung)) {
    return "die Blattbeschriftung nennt einen Schnitt";
  }
  const felderZahl = (seite.felder || []).length;
  const alteRegel = r.ist_grundriss === false || felderZahl >= 2;
  const gpArt = (gp && typeof gp.blattart === "string") ? gp.blattart : null;
  const gpEbenen = (gp && Array.isArray(gp.ebenen)) ? gp.ebenen : null;
  /* Ohne zweite Lesung fehlt das unabhaengige Urteil ueber das Blatt; dann
     wird gelesen, wo frueher gelesen wurde. Lieber ein leerer Durchgang als
     eine verlorene Geschosshoehe. */
  if (!gpArt && !gpEbenen) {
    return alteRegel
      ? "ohne zweite Lesung bleibt es bei der vorsichtigen Regel "
        + "(kein Grundriss oder mehrere Zeichnungsfelder)" : null;
  }
  if (gpArt === "schnitt") {
    return "die zweite Lesung stuft das Blatt als Schnitt ein";
  }
  /* Eine Ansicht, ein Lageplan oder eine Tabelle traegt keinen Schnitt. */
  if (gpArt === "ansicht" || gpArt === "lageplan" || gpArt === "tabelle") {
    return null;
  }
  const gezeichnet = (gpEbenen || []).filter(function (e) {
    return e && e.gezeichnet === true;
  }).length;
  const benannt = (gpEbenen || []).some(function (e) {
    return e && e.gezeichnet === false;
  });
  /* Ebenen, die benannt, aber nicht gezeichnet sind: so sieht ein Schnitt
     aus, der Keller bis Spitzboden durchschneidet. */
  if (benannt) {
    return "die zweite Lesung nennt Ebenen, die auf dem Blatt nicht als "
      + "Grundriss gezeichnet sind";
  }
  /* Mehr Zeichnungsfelder als gezeichnete Grundrisse: eines der Felder kann
     ein Schnitt sein (so der Bogen "hi_schnitt-2" der Maelzerstrasse). */
  if (felderZahl >= 2 && gezeichnet < felderZahl) {
    return "der Bogen hat mehr Zeichnungsfelder als gezeichnete Grundrisse";
  }
  /* "Kein Grundriss", und die Gegenprobe kann nicht sagen, was stattdessen
     zu sehen ist (detail/sonstiges): vorsichtshalber lesen. */
  if (r.ist_grundriss === false && gpArt !== "grundriss") {
    return "keine der beiden Lesungen kann sagen, was das Blatt zeigt";
  }
  return null;
}

/** Der Satz fuer den Vermerk, wenn die Hoehen-Lesung begruendet entfaellt. */
function hoehenVerzichtsgrund(gp) {
  const gpArt = (gp && typeof gp.blattart === "string") ? gp.blattart : null;
  if (gpArt === "ansicht") {
    return "die zweite Lesung stuft das Blatt als Ansicht ein, und eine "
      + "Ansicht trägt keinen Schnitt";
  }
  if (gpArt === "lageplan") {
    return "die zweite Lesung stuft das Blatt als Lageplan ein, und ein "
      + "Lageplan trägt keinen Schnitt";
  }
  if (gpArt === "tabelle") {
    return "die zweite Lesung stuft das Blatt als Tabelle ein, und eine "
      + "Tabelle trägt keinen Schnitt";
  }
  if (gpArt === "grundriss") {
    return "die zweite Lesung sieht nur gezeichnete Grundrisse und keinen "
      + "Schnitt";
  }
  return null;
}

/** Wertet EIN Blatt vollstaendig aus: Raumliste, Gegenprobe, Hoehen,
 *  Zusatzangaben samt Rettungswegen. Die drei Durchgaenge, die nur am BILD
 *  haengen (Raumliste, Gegenprobe, Zusatzangaben), starten gleichzeitig;
 *  aufeinander warten nur die Schritte, die ein Ergebnis des anderen
 *  brauchen (Rettung und Hoehen-Weiche). */
async function blattAuswerten(seite, seiten, pos, gesamt, fehler) {
  if (App.auslese.abbrechen) return;
  const zeile = "Blatt " + (pos + 1) + " von " + gesamt + ": "
    + (seite.bezeichnung || seite.name);
  /* Welche Zeilen gerade dran sind, muss in der Liste selbst stehen. Sonst
     liest der Bearbeiter oben "3 Lesungen laufen" und sieht darunter keine
     Verbindung zu den Blaettern. */
  App.auslese.laufendeSeiten.push(seiten.indexOf(seite));
  renderInhalt();
  const vermerke = [];
  try {
      /* Die Zeichnungsfelder des Blattes. Kostet keinen Aufruf und kein Netz;
         das Ergebnis wird sowohl fuer die Rettung als auch fuer die Frage
         gebraucht, ob auf dem Blatt neben dem Grundriss noch etwas steht. */
      seite.felder = await seiteZerlegen(seite);

      const b64 = await seiteAlsBild(seite);
      /* Getrennte Durchgänge statt einem: ein einziger Aufruf, der Räume und
         alle Zusatzangaben zusammen liefert, überschreitet die Zeitgrenze der
         serverlosen Funktion (am Erdgeschossplan der Mälzerstraße gemessen:
         37 Sekunden, nichts kam an). Die getrennten Durchgänge hängen nur am
         BILD, nicht aneinander — sie starten deshalb GLEICHZEITIG über den
         Planer. GEMESSEN am 24.08.2026: nacheinander warteten Gegenprobe und
         Zusatzangaben grundlos auf die Raumliste, je Blatt 35 bis 60 s. */

      const nochmal = !!seite.nochmalAlsGrundriss;
      seite.nochmalAlsGrundriss = false;
      /* --- Die Weiche: kein Aufruf, der nichts bringen kann. --------------
         Nennt das Schriftfeld die Blattart "ansicht" oder "lageplan", fällt
         die RAUMLESUNG aus. Die Knopfvorschau sagt für genau diese Blätter
         seit jeher zu: "keine Räume ... Gelesen wird nur das Schriftfeld"
         (ertragErwartung) — gelesen wurde bisher trotzdem, GEMESSEN rund 9 s
         und ein bezahlter Aufruf je Ansicht für erwartungsgemäß null Räume.
         Drei Sicherungen gegen ein falsches Schriftfeld: der Knopf "Als
         Grundriss lesen" erzwingt die Lesung (nochmal); die GEGENPROBE läuft
         weiter und zählt beschriftete Räume — findet sie welche, liest die
         gezielte Nachlesung (gegenprobeNachlesen) sie nach; und der Vermerk
         am Blatt nennt den Verzicht ausdrücklich. */
      const kopfArt = (seite.blattkopf && seite.blattkopf.blattart) || null;
      const ohneRaumlesung = !nochmal
        && (kopfArt === "ansicht" || kopfArt === "lageplan");

      /* --- Schriftfeld-Weiche für die Zusatzangaben. ----------------------
         Für eine Ansicht oder einen Lageplan verspricht die Knopfvorschau
         seit jeher nur noch das Schriftfeld ("Gelesen wird nur das
         Schriftfeld", ertragErwartung). Hat die Sichtung das Schriftfeld
         aber längst aus dem Textstand gelesen (seite.objektangaben — kostet
         nichts und geschieht beim Ablegen), gibt es für den langsamsten
         Durchgang nichts mehr zu holen. GEMESSEN am 24.08.2026: die
         Zusatzangaben liefen auf JEDEM Blatt und rissen dreimal von dreimal
         die 24-s-Frist des Endpunkts (25,6 bis 29,0 s) — auf einer Ansicht
         für Angaben, die längst vorlagen. Bei einem Scan OHNE Textstand
         bleibt der Durchgang: dort ist er der einzige Weg zum Schriftfeld. */
      const schriftfeldLiegtVor = !!(seite.objektangaben
        && Object.keys(seite.objektangaben).some(function (kk) {
          const w = seite.objektangaben[kk];
          return w !== null && w !== undefined && String(w).trim() !== "";
        }));
      const ohneZusatz = ohneRaumlesung && schriftfeldLiegtVor;

      /* Die drei bildgebundenen Durchgänge zugleich anstoßen. Reihenfolge
         der Einreihung = Wichtigkeit: Raumliste vor Gegenprobe vor
         Zusatzangaben. Die Ablehnungen werden unten einzeln behandelt; der
         leere catch hier verhindert nur die "unhandled rejection", falls ein
         früher Fehler das Warten abbricht. */
      const pRaeume = ohneRaumlesung ? null
        : aufrufGeplant("raeume", zeile + " — Raumliste", function () {
            return leseVersuch(b64, "raeume", vermerke, "die Raumliste");
          });
      if (pRaeume) pRaeume.catch(function () {});

      /* VORAB-ZERLEGUNG, siehe vorabFeldweise().
         Auf einem Blatt, dem der eine Durchgang nachweislich nicht reicht,
         laufen die Zeichnungsfelder JETZT mit, statt erst nach einem
         gescheiterten und voll bezahlten Ganzblatt-Durchgang. Das Ganzblatt
         laeuft weiter daneben; es traegt Massstab, Schriftfeld und die
         Vergleichsliste fuer den Konsens, und ohne es braeche mehr, als die
         Zerlegung einbringt.
         Der Zusatzhinweis bleibt hier bewusst LEER: er darf nur mit hinaus,
         wenn es einen Grund AUSSERHALB des Modells gibt (ausdruecklicher
         zweiter Anlauf oder ein Beleg vom Blatt). Beides steht zu diesem
         Zeitpunkt noch nicht fest. */
      const vorab = ohneRaumlesung ? null : vorabFeldweise(seite);
      let pFelderVorab = null;
      if (vorab && !App.auslese.abbrechen) {
        if (await budgetErlaubt(vorab.teile)) {
          vermerke.push("Dieses Blatt wird von vornherein feldweise gelesen: "
            + vorab.grund + " Die " + mz(seite.felder.length, "Zeichnungsfeld",
              "Zeichnungsfelder") + " werden deshalb gleich mitgelesen, statt "
            + "erst nach einem Fehlschlag.");
          seite.vorabZerlegt = vorab;
          pFelderVorab = feldweiseLesen(seite, seite.felder, vermerke, "");
          pFelderVorab.catch(function () {});
        } else {
          vermerke.push("Dieses Blatt bräuchte von vornherein die feldweise "
            + "Lesung (" + vorab.grund + "); sie wurde an der Kostengrenze "
            + "gestoppt. Das Blatt läuft als einzelner Durchgang.");
        }
      }
      const pGegen = aufrufGeplant("gegenprobe", zeile + " — zweite Lesung",
        function () {
          return leseVersuch(b64, "gegenprobe", vermerke, "die Gegenprobe");
        });
      pGegen.catch(function () {});
      const pKunde = ohneZusatz ? null
        : aufrufGeplant("kunde", zeile + " — Zusatzangaben", function () {
            return leseVersuch(b64, "kunde", vermerke, "die Zusatzangaben");
          });
      if (pKunde) pKunde.catch(function () {});
      else if (ohneZusatz) {
        vermerke.push("Die Zusatzangaben-Lesung entfällt: das Schriftfeld "
          + "dieses Blattes ist bereits beim Ablegen aus dem Textstand "
          + "gelesen worden, und mehr verspricht die Auslese für "
          + (kopfArt === "lageplan" ? "einen Lageplan" : "eine Ansicht")
          + " nicht. Das spart den langsamsten Durchgang des Blattes.");
      }

      /* Erster Durchgang: die Raumliste. Sie entscheidet zugleich, ob das
         Blatt überhaupt ein Grundriss ist. */
      let r;
      try {
        if (ohneRaumlesung) {
          r = { ist_grundriss: false, raeume: [] };
          vermerke.push("Raumlesung übersprungen: das Schriftfeld nennt das "
            + "Blatt „" + (kopfArt === "lageplan" ? "Lageplan" : "Ansicht")
            + "“, dort sind keine Räume angeschrieben. Gegenprobe und "
            + "Schriftfeld werden trotzdem gelesen; zählt die Gegenprobe doch "
            + "Räume, liest das Werkzeug sie nach.");
        } else {
          r = await pRaeume;
        }
      } catch (eGrenze) {
        /* "Zu gross" ist KEIN Fehler mehr, den der Kollege sieht, sondern der
           Startschuss der Selbstzerlegung. Der Endpunkt meldet die Kennung
           (laengengrenze/zeitgrenze), wenn er selbst nichts retten konnte;
           ein aelterer Endpunkt ohne Kennung wird am Wortlaut erkannt. */
        const kg = String((eGrenze && eGrenze.kennung) || "");
        const wl = String((eGrenze && eGrenze.message) || "");
        /* "Abbruchgrund: max_tokens" ist der Wortlaut des HEUTE VERTEILTEN
           Endpunkts, wenn die Antwort an der Laengengrenze abriss und die
           Rettung leer blieb. GEMESSEN am 24.08.2026 (Messlauf 3 an
           "BV 2-0887 Ziolkowski"): ohne dieses Muster wurde daraus ein
           Blattfehler mit LEEREM Raumbuch statt des Startschusses der
           Selbstzerlegung — exakt der stille EG-Ausfall des Kunden. */
        if (kg === "laengengrenze" || kg === "zeitgrenze"
            || /Längengrenze|zu umfangreich|Abbruchgrund:\s*max_tokens/.test(wl)) {
          r = { raeume: [],
                _zuGross: (kg === "zeitgrenze" || /Sekunden abbrechen|länger, als der Endpunkt/.test(wl))
                  ? "zeit" : "laenge" };
          vermerke.push("Der ganze Bogen war für einen Durchgang zu umfangreich ("
            + kurzeMeldung(eGrenze) + ") — das Werkzeug zerlegt ihn jetzt selbst.");
        } else {
          throw eGrenze;
        }
      }
      /* Eine gueltige, aber leere Antwort ({}) ist KEINE Auswertung.
         Vorher wurde sie als eine gezaehlt: die Seite bekam ausgewertet=true,
         der Knopf verschwand, und im Stapel stand gruen "2 Blätter
         ausgewertet". Ein zweiter Versuch war danach nur ueber das Loeschen
         aller Blaetter moeglich. */

      /* ---- Rettung durch Zerlegen -------------------------------------
         Erst hier, und nur wenn der erste Durchgang gezeigt hat, dass einer
         nicht reicht. Der Bogen "Dumach 1" braucht das; ein gewoehnlicher
         Grundriss nie, und er bezahlt es deshalb auch nicht. */
      const felder = seite.felder || [];
      /* NULL RAEUME IST NIE EIN STILLES ERGEBNIS. Kommt ein Blatt, das nach
         Blattkopf, Dateinamen oder Textstand ein Grundriss ist, als "kein
         Grundriss" ohne einen Raum zurueck, ist das ein Fall fuer die
         automatische Nachlesung -- nicht fuer das stille Herausfallen.
         MEHRFACH BEIM KUNDEN: so verschwand das Erdgeschoss aus der
         Rechnung, und die Heizlast war still falsch. */
      const beleg = (r.ist_grundriss !== true && !(r.raeume || []).length)
        ? blattWirktGrundriss(seite) : null;
      seite.grundrissOhneRaeume = null;
      const mangel = warumNichtGenug(r)
        || (beleg ? "Nach " + beleg + " ist dieses Blatt ein Grundriss, die "
            + "Lesung kam aber als „kein Grundriss“ ohne einen einzigen Raum "
            + "zurück." : null)
        || (nochmal ? "Auf Wunsch noch einmal gelesen." : null);
      /* Der Zusatzhinweis geht nur mit hinaus, wenn es dafuer einen Grund
         AUSSERHALB des Modells gibt: den ausdruecklichen zweiten Anlauf des
         Bearbeiters oder einen Beleg vom Blatt selbst. Ihn immer
         mitzuschicken hiesse, dem Modell eine Antwort in den Mund zu
         legen -- dann wird aus jeder Ansicht ein Grundriss. */
      const zusatz = (nochmal || beleg)
        ? "Auf diesem Blatt ist ein Gebäudegrundriss zu erwarten; bitte die "
          + "Räume aufführen, die zu sehen sind." : "";
      /* Die Felderlesung kann bereits laufen (Vorab-Zerlegung, oben). Dann
         wird sie hier NUR noch abgeholt und geht durch dieselbe
         Konsensbildung wie die nachtraegliche -- ohne Bedingung "mangel",
         denn der Grund fuer die Zerlegung stand schon vor dem ersten Aufruf
         fest und haengt nicht daran, wie das Ganzblatt ausgegangen ist. */
      /* Lokal, NICHT ueber seite.rettungVersucht gesteuert: das Merkmal
         ueberlebt einen frueheren Durchgang desselben Blattes ("nochmal
         lesen"), und eine stehengebliebene Marke wuerde die Felderlesung
         beim zweiten Mal ohne Grund ausloesen. */
      let wegFelder = false;
      if (pFelderVorab && !App.auslese.abbrechen) {
        wegFelder = true;
        seite.rettungVersucht = "felder-vorab";
      } else if (mangel && !App.auslese.abbrechen && felder.length >= 2) {
        /* Der Budgetwaechter fragt EINMAL, wenn die Zusatzaufrufe die
           Kostengrenze reissen wuerden; ein Nein gilt fuer den Rest des
           Laufs. Still teuer werden darf die Selbstzerlegung nie. */
        if (!(await budgetErlaubt(felder.length))) {
          vermerke.push(mangel + " Die Zerlegung in "
            + mz(felder.length, "Zeichnungsfeld", "Zeichnungsfelder")
            + " wurde an der Kostengrenze gestoppt; das Blatt bleibt "
            + "unvollständig, die Räume sind von Hand zu ergänzen.");
        } else {
        vermerke.push(mangel + " Das Blatt trägt "
          + mz(felder.length, "Zeichnungsfeld", "Zeichnungsfelder")
          + "; sie werden jetzt einzeln gelesen.");
        seite.rettungVersucht = "felder";
        wegFelder = true;
        }
      }
      if (wegFelder) {
        const zerlegt = pFelderVorab
          ? await pFelderVorab
          : await feldweiseLesen(seite, felder, vermerke, zusatz);
        /* KONSENS STATT WUERFELN. Hier stand `zerlegt > erste`: nur eine
           LAENGERE Felderliste ersetzte das Erstergebnis. GEMESSEN am
           24.08.2026 an "BV 2-0887 Ziolkowski": die Felder brachten 13 = 13
           Raeume -- und das ABGESCHNITTENE Erstergebnis blieb samt Warnung
           "Raumliste unvollstaendig" stehen, obwohl die Felderlesung
           vollstaendig war. Jetzt fuehrt die vollstaendige Lesung, und ein
           Raum, den nur die andere hat, wird uebernommen und als "aus einer
           Lesung" gekennzeichnet (KERN_GEGENPROBE.raumKonsens). */
        const KG2 = window.KERN_GEGENPROBE;
        const erstZahl = (r.raeume || []).length;
        if (zerlegt.raeume.length
            && (zerlegt.raeume.length >= erstZahl || r._abgeschnitten)) {
          let raeumeNeu = zerlegt.raeume;
          if (KG2 && KG2.raumKonsens) {
            const kon = KG2.raumKonsens(zerlegt.raeume, r.raeume || [],
              { andereQuelle: "Erstlesung des ganzen Bogens" });
            raeumeNeu = kon.raeume;
            if (kon.nurAndere.length) {
              vermerke.push(mz(kon.nurAndere.length, "Raum steht", "Räume stehen")
                + " nur in der Erstlesung (" + kon.nurAndere.slice(0, 4).join(", ")
                + (kon.nurAndere.length > 4 ? " und weitere" : "")
                + "); sie bleiben im Raumbuch und sind als „aus einer Lesung“ "
                + "gekennzeichnet.");
            }
            kon.konflikte.forEach(function (kf) {
              vermerke.push("Für „" + kf.bezeichnung + "“ nennen die beiden "
                + "Lesungen verschiedene Flächen ("
                + kf.behalten.toLocaleString("de-DE") + " m² gegen "
                + kf.verworfen.toLocaleString("de-DE") + " m²). Es gilt die "
                + "Felderlesung; ein Flächenstempel im Plan schlägt beide.");
            });
          }
          const kopf = zerlegt.kopf || r;
          r = Object.assign({}, kopf, {
            ist_grundriss: zerlegt.ist_grundriss || r.ist_grundriss,
            raeume: raeumeNeu,
          });
          /* Die Warnung "abgeschnitten" gehoert zum verworfenen Erstergebnis.
             Sie bleibt nur, wenn auch die Felderlesung irgendwo abriss. */
          if (!zerlegt.abgeschnitten) delete r._abgeschnitten;
          else if (!r._abgeschnitten) {
            r._abgeschnitten = { grund: "max_tokens", raeume: raeumeNeu.length };
          }
          delete r._zuGross;
          seite.feldweise = felder.length;
          vermerke.push("Aus den " + felder.length + " Feldern zusammen "
            + mz(raeumeNeu.length, "Raum", "Räume") + ".");
        } else if (zerlegt.raeume.length) {
          vermerke.push("Die Felder brachten weniger als der ganze Bogen ("
            + zerlegt.raeume.length + " gegen " + erstZahl + "). Es bleibt "
            + "beim ersten Ergebnis.");
        } else {
          vermerke.push("Die Felder brachten nicht mehr als der ganze Bogen. "
            + "Es bleibt beim ersten Ergebnis.");
        }
      } else if (mangel && !App.auslese.abbrechen
                 && (r._zuGross || r._abgeschnitten) && felder.length <= 1) {
        /* ---- Zwei ueberlappende Haelften --------------------------------
           Der Durchgang scheiterte am UMFANG (Laengen- oder Zeitgrenze), und
           es gibt keine zwei Zeichnungsfelder, an denen sich schneiden
           liesse. Frueher stand hier die Bitte an den MENSCHEN, das Blatt
           "in zwei Haelften abzulegen" -- jetzt legt das Werkzeug selbst in
           Haelften ab: laengs der langen Kante, mit Ueberlappung an der
           Schnittkante, Dubletten dort ueber raumSchluessel entdoppelt
           (haelftenVereinen). Geteilt wird das einzelne Zeichnungsfeld,
           sonst das ganze Blatt. */
        if (!(await budgetErlaubt(2))) {
          vermerke.push(mangel + " Die Zerlegung in zwei Hälften wurde an der "
            + "Kostengrenze gestoppt; das Blatt bleibt unvollständig, die "
            + "Räume sind von Hand zu ergänzen.");
        } else {
          vermerke.push(mangel + " Das Blatt ist umfangreich — es wird jetzt "
            + "in zwei überlappenden Hälften gelesen.");
          seite.rettungVersucht = "haelften";
          const h = haelftenVon(felder.length === 1 ? felder[0] : null);
          /* Die Haelften haengen nicht aneinander: beide zugleich durch den
             Planer, zusammengefuegt in der Reihenfolge der Haelften. */
          const teileErg = await Promise.all(h.map(function (rect, hi) {
            if (App.auslese.abbrechen) return Promise.resolve(null);
            return teilLesen(seite, rect, vermerke, "Hälfte " + (hi + 1),
              zusatz, 1);
          }));
          const zerlegt = haelftenVereinen(teileErg, vermerke);
          const erstZahl = (r.raeume || []).length;
          if (zerlegt.raeume.length
              && (zerlegt.raeume.length >= erstZahl || r._abgeschnitten
                  || r._zuGross)) {
            const kopf = zerlegt.kopf || r;
            r = Object.assign({}, kopf, {
              ist_grundriss: zerlegt.ist_grundriss || r.ist_grundriss === true,
              raeume: zerlegt.raeume,
            });
            if (!zerlegt.abgeschnitten) delete r._abgeschnitten;
            else if (!r._abgeschnitten) {
              r._abgeschnitten = { grund: "max_tokens",
                                   raeume: zerlegt.raeume.length };
            }
            delete r._zuGross;
            seite.haelften = h.length;
            vermerke.push("Aus den zwei Hälften zusammen "
              + mz(zerlegt.raeume.length, "Raum", "Räume") + ".");
          } else {
            vermerke.push("Die Hälften brachten nicht mehr als der ganze "
              + "Bogen. Es bleibt beim ersten Ergebnis.");
          }
        }
      } else if (mangel && !App.auslese.abbrechen && felder.length === 1
                 && ((felder[0].x2 - felder[0].x) * (felder[0].y2 - felder[0].y) < 0.7
                     || beleg)) {
        /* Ein einziges Feld, das aber nur einen Teil des Bogens einnimmt: hier
           hilft kein Teilen, sondern Auflösung. Das Feld allein gerendert
           füllt die 2576 Bildpunkte, statt sie an weißes Papier zu verlieren.
           GEMESSEN am Blatt "4.1.1.13 BT 3 - EG": die Zeichnung kam mit 78 dpi
           an und nach dem Zuschnitt mit 393 dpi.
           Mit BELEG (das Blatt ist nach Blattkopf/Namen/Textstand ein
           Grundriss, kam aber ohne Raum zurueck) wird auch ein grosses Feld
           zugeschnitten: anderer Zuschnitt, hoehere Aufloesung, harter
           Hinweis im Auftrag -- der zweite Anlauf soll anders sein als der
           erste, nicht derselbe. */
        vermerke.push(mangel + " Die Zeichnung wird jetzt zugeschnitten ("
          + Math.round((felder[0].x2 - felder[0].x) * (felder[0].y2 - felder[0].y) * 100)
          + " % des Bogens) und in voller Auflösung noch einmal gelesen.");
        try {
          const bild2 = await seiteAlsBild(seite, felder[0]);
          const r2 = await aufrufGeplant("raeume",
            blattZeile(seite, "— zugeschnitten in voller Auflösung"),
            function () {
              return leseVersuch(bild2, "raeume", vermerke,
                "die zugeschnittene Zeichnung", zusatz);
            });
          if (r2 && (r2.raeume || []).length > (r.raeume || []).length) {
            r = r2;
            seite.zugeschnitten = true;
            vermerke.push("Der Zuschnitt brachte "
              + mz((r2.raeume || []).length, "Raum", "Räume") + ".");
          } else {
            vermerke.push("Auch zugeschnitten kam kein Raum mehr zurück. Auf "
              + "diesem Blatt ist offenbar keiner angeschrieben.");
          }
        } catch (e3) {
          vermerke.push("Der Zuschnitt ließ sich nicht lesen: " + kurzeMeldung(e3));
        }
      } else if (mangel && !App.auslese.abbrechen && beleg
                 && nachlesungImBudget()) {
        /* Kein Zeichnungsfeld, an dem sich schneiden liesse -- aber ein
           Beleg, dass dieses Blatt ein Grundriss ist. Dann wird das ganze
           Blatt EINMAL mit dem harten Hinweis nachgelesen. Ohne Beleg
           geschieht das nicht: sonst wuerde aus jeder Ansicht ein Grundriss
           herbeigefragt. */
        vermerke.push(mangel + " Das Blatt wird einmal mit dem ausdrücklichen "
          + "Hinweis nachgelesen, dass ein Grundriss zu erwarten ist.");
        try {
          const r3 = await aufrufGeplant("raeume",
            blattZeile(seite, "— Nachlesung als Grundriss"), function () {
              return leseVersuch(b64, "raeume", vermerke,
                "die Nachlesung als Grundriss", zusatz);
            });
          if (r3 && (r3.raeume || []).length > (r.raeume || []).length) {
            r = r3;
            vermerke.push("Die Nachlesung brachte "
              + mz((r3.raeume || []).length, "Raum", "Räume") + ".");
          } else {
            vermerke.push("Auch die Nachlesung mit Hinweis brachte keinen Raum.");
          }
        } catch (e4) {
          vermerke.push("Die Nachlesung ließ sich nicht lesen: " + kurzeMeldung(e4));
        }
      } else if (mangel) {
        vermerke.push(mangel + " Auf dem Blatt ist kein zweites Zeichnungsfeld "
          + "zu finden, an dem sich teilen ließe. Die Räume bitte am Plan "
          + "nachzählen und fehlende von Hand ergänzen.");
      }

      /* Blieb ein belegter Grundriss trotz aller Anlaeufe ohne Raum, wird
         das ein ROTER BEFUND mit "Im Plan anzeigen" -- nie ein leeres
         Raumbuch ohne Meldung (Rueckfrage "Grundriss ohne Räume"). */
      if (beleg && !(r.raeume || []).length) {
        seite.grundrissOhneRaeume = beleg;
        vermerke.push("Trotz Nachlesung kam für dieses Blatt kein Raum "
          + "zurück, obwohl es nach " + beleg + " ein Grundriss ist. Das "
          + "steht als roter Befund in den Rückfragen; die Räume sind am "
          + "Plan zu erfassen (Flächenstempel übernehmen oder umfahren).");
      }

      /* Blieb "zu gross" trotz Selbstzerlegung ohne einen einzigen Raum, ist
         das der EINZIGE Fall, in dem noch eine Meldung entsteht — und sie
         sagt, was das Werkzeug alles versucht hat (die Einzelheiten stehen
         in den Vermerken des Blattes) und was der Kollege jetzt tun kann. */
      if (r._zuGross && !(r.raeume || []).length) {
        const wie = seite.rettungVersucht === "felder"
          ? "es in seine " + mz((seite.felder || []).length, "Zeichnungsfeld",
              "Zeichnungsfelder") + " zerlegt (zu umfangreiche Felder weiter "
            + "in Hälften) und einzeln gelesen; auch das brachte keinen Raum"
          : seite.rettungVersucht === "haelften"
          ? "es in zwei überlappende Hälften zerlegt und einzeln gelesen; "
            + "auch das brachte keinen Raum"
          : "die Zerlegung auf Wunsch an der Kostengrenze gestoppt";
        throw new Error("Das Blatt war für einen Durchgang zu umfangreich ("
          + (r._zuGross === "zeit" ? "Zeitgrenze" : "Längengrenze")
          + " des Endpunkts). Das Werkzeug hat " + wie + ". "
          + "Was genau geschah, steht in den Vermerken des Blattes. Die Räume "
          + "bitte von Hand erfassen (Flächenstempel übernehmen oder im Plan "
          + "umfahren) oder das Blatt in besserer Auflösung ablegen.");
      }

      /* Der Endpunkt rettet eine an der Laengengrenze abgerissene Antwort und
         sagt dazu, dass sie abgeschnitten ist. Das darf nicht untergehen: was
         danach kam, fehlt, und niemand sieht es dem Raumbuch an. */
      if (r._abgeschnitten) abschnittMelden(seite, "raeume", r._abgeschnitten);

      /* ---- Die zweite Lesung -------------------------------------------
         Dasselbe Blatt, andere Blickrichtung: nicht "lies die Raeume aus",
         sondern "zaehl, was hier beschriftet ist". Sie laeuft von selbst mit,
         ohne zweiten Knopf, und sie kennt das Ergebnis der ersten nicht.
         Genau darin liegt ihr Wert: zwei unabhaengige Lesungen, die
         uebereinstimmen, sind ein Beleg; gehen sie auseinander, ist das ein
         Befund, den vorher niemand gesehen hat.

         Sie ist seit dem 24.08.2026 GLEICHZEITIG mit der Raumliste
         unterwegs (sie haengt nur am Bild); AUFGENOMMEN wird sie erst hier,
         weil der Vergleich die fertige Raumliste braucht.
         Ein Blatt ohne Grundriss bekommt sie ebenfalls: ein Schnitt zaehlt
         Ebenen, eine Ansicht zaehlt Fenster, und beides ist genau die
         unabhaengige Zahl, die dem Kontrollblatt bisher fehlte. */
      let gp = null;
      if (!App.auslese.abbrechen) {
        try {
          gp = await pGegen;
          gegenprobeAufnehmen(seite, r, gp, vermerke);
          /* DIE GEGENPROBE REPARIERT, SIE MELDET NICHT NUR. Zaehlt sie auf
             einer Ebene Raeume, die im Raumbuch fehlen -- oder eine Ebene,
             die ganz fehlt, wie das Erdgeschoss beim Kunden --, liest das
             Werkzeug GENAU DIESES FELD gezielt nach, mit den gezaehlten
             Namen als Suchliste. Erst danach entsteht ein Befund. */
          if (!App.auslese.abbrechen && (seite.gegenprobeEbenen || []).length) {
            r = await gegenprobeNachlesen(seite, r, gp, vermerke,
              function (tun) { App.auslese.was = blattZeile(seite, tun);
                               renderInhalt(); });
          }
        } catch (e2) {
          seite.gegenprobeFehler = kurzeMeldung(e2);
          vermerke.push("Die Gegenprobe ließ sich nicht lesen: " + kurzeMeldung(e2)
            + " Die Angaben dieses Blattes bleiben damit ungeprüft; das "
            + "Kontrollblatt fragt danach.");
        }
      }

      let h = null, k = null;

      /* Zweiter Durchgang fuer die Geschosshoehen — aber nur, wo ein SCHNITT
         zu erwarten ist. Die Betriebsart liest ausdruecklich einen Schnitt
         (SYSTEM_HOEHEN: "Ist das Blatt kein Schnitt: ... die Listen leer");
         auf einem Blatt ohne Schnitt kann sie nichts bringen. GEMESSEN am
         24.08.2026: sie lief per Regel "zwei Zeichnungsfelder" auch auf dem
         reinen Grundriss-Bogen "BV 2-0887 Ziolkowski" (drei Grundrisse, kein
         Schnitt, 12,7 s und 1328 Ausgabe-Token fuer leere Listen) und per
         Regel "kein Grundriss" auf der Ansicht desselben Satzes (5,4 s).
         Der Grund zum Lesen kommt jetzt aus hoehenLesenGrund: Schriftfeld,
         Blattbeschriftung, das Urteil der Gegenprobe oder ein Bogen mit
         mehr Zeichnungsfeldern als gezeichneten Grundrissen. Fehlt die
         Gegenprobe, gilt die alte, vorsichtige Regel weiter. Der Bogen
         "hi_schnitt-2" der Maelzerstrasse (Schnitt oben, angeschnittener
         Grundriss unten) bleibt ueber seine Beschriftung und ueber die
         Felderzahl im Lesepfad. */
      const hoehenGrund = hoehenLesenGrund(seite, r, gp, kopfArt);
      if (hoehenGrund && !App.auslese.abbrechen) {
        try {
          h = await aufrufGeplant("hoehen", zeile + " — Geschosshöhen",
            function () {
              return leseVersuch(b64, "hoehen", vermerke, "die Geschosshöhen");
            });
        } catch (e2) {
          if (!(e2 && e2.abgebrochen)) seite.hoehenFehler = kurzeMeldung(e2);
        }
      } else if (!hoehenGrund
                 && (r.ist_grundriss === false || (seite.felder || []).length >= 2)) {
        /* Frueher wurde hier gelesen; jetzt steht der Verzicht am Blatt. */
        vermerke.push("Die Höhen-Lesung entfällt: "
          + (hoehenVerzichtsgrund(gp) || "kein Anzeichen für einen Schnitt "
             + "auf dem Blatt") + ". Trägt das Blatt doch einen Schnitt, die "
          + "Geschosshöhen bitte im Schritt Rückfragen eintragen oder das "
          + "Blatt löschen und erneut auswerten lassen.");
      }

      /* Dritter Durchgang: Befunde, Lücken, Gebäudeangaben. Entbehrlich, wenn
         er scheitert; die Rechnung steht auch ohne ihn. Er ist seit dem
         24.08.2026 GLEICHZEITIG mit der Raumliste unterwegs (pKunde, oben) —
         hier wird nur noch sein Ergebnis abgeholt. Vorher stand hier ein
         ZWEITER leseVersuch mit demselben Bild: der geplante Aufruf lief,
         wurde bezahlt und nie abgeholt, und derselbe Durchgang lief danach
         noch einmal. Jedes Blatt bezahlte die Zusatzangaben damit doppelt,
         am Budgetwächter vorbei. */
      if (pKunde && !App.auslese.abbrechen) {
        try {
          k = await pKunde;
          if (k && k._abgeschnitten) abschnittMelden(seite, "kunde", k._abgeschnitten);
        } catch (e2) {
          if (!(e2 && e2.abgebrochen)) seite.kundeFehler = kurzeMeldung(e2);
        }
      }
      const d = ausleseZusammenfuehren(r, k, h);
      seite.auslese = d;
      seite.ausgewertet = true;
      massstabAusAusleseUebernehmen(seite, r);
      /* Jetzt liegen die Maßzahlen mit ihrer Lage vor. Damit lässt sich der
         Maßstab im Bild nachmessen und gegen das Schriftfeld halten. Das
         geschieht im Hintergrund: es braucht kein Netz, kostet nichts und
         soll die Auswertung der übrigen Seiten nicht aufhalten. */
      massstabNachmessenAnstellen(seite);
      if (r.ist_grundriss === false) seite.istGrundriss = false;
      if (d.gebaeude && d.gebaeude.geschosse && !seite.geschoss) {
        seite.geschoss = (d.raeume && d.raeume[0] && d.raeume[0].geschoss) || null;
      }
      /* Die Kosten werden inzwischen in leseVersuch mitgezaehlt, bei JEDEM
         Aufruf und damit auch bei den wiederholten und den feldweisen. Hier
         noch einmal zu addieren hiesse, sie doppelt zu zeigen. */
      /* Ein Blatt, das als "kein Grundriss" eingestuft wurde, verschwand
         bisher stillschweigend aus der Rechnung. Das ist der teuerste Fehler
         dieser Kette, weil ihn niemand sieht. Er steht jetzt am Blatt und
         laesst sich mit einem Klick umstossen. */
      if (r.ist_grundriss === false) {
        vermerke.push("Eingestuft als kein Grundriss, deshalb kein Raum "
          + "übernommen. Ist das falsch, hier noch einmal als Grundriss lesen "
          + "lassen.");
      }
      seite.vermerke = vermerke;
  } catch (e) {
    seite.vermerke = vermerke;
    if (!(e && e.abgebrochen)) {
      fehler.push({ blatt: seite.bezeichnung || seite.name, text: kurzeMeldung(e) });
    }
    /* Ohne Zugangscode scheitern alle Blaetter gleich; der Rest des Stapels
       wird deshalb angehalten (frueher: break der Schleife). */
    if (e && e.codeFehlt) App.auslese.abbrechen = true;
  }
  const ixL = App.auslese.laufendeSeiten.indexOf(seiten.indexOf(seite));
  if (ixL >= 0) App.auslese.laufendeSeiten.splice(ixL, 1);
  App.auslese.fertig++;
  renderInhalt();
}

/** Abschluss des Stapels: Bericht bauen, Raeume uebernehmen, zum Urteil. */
function stapelAbschliessen(zuTun, fehler) {
  App.auslese.laeuft = false;
  App.auslese.laufendeSeite = null;
  App.auslese.laufendeSeiten = [];
  App.auslese.aktiv = [];
  /* Der Verbrauch dieses Laufs wird festgehalten, BEVOR App.auslese beim
     nächsten Start zurückgesetzt wird — sonst ist die Endsumme wieder weg. */
  verbrauchAblegen(zuTun.length);
  raeumeAusAusleseUebernehmen();
  /* „Raumliste unvollständig" ist nach einer geglückten Zerlegung ein
     falscher Alarm; er wird hier gegen die zweite Lesung geprüft. */
  raumlisteWarnungNachpruefen(zuTun);

  /* Der Bericht an den Kollegen steht IN DER SEITE, nicht in einem Dialog.
     Ein tab-modales alert() friert die Seite ein; ein Pruefer hielt das
     Werkzeug deswegen fuer abgestuertzt. Ausserdem ist ein Dialog nach dem
     Wegklicken weg, und mit ihm die Auskunft, welches Blatt woran gescheitert
     ist. */
  App.ausleseBericht = {
    zeit: Date.now(),
    fehler: fehler,
    blaetter: zuTun.map(function (x) {
      return { blatt: x.bezeichnung || x.name,
               raeume: ((x.auslese && x.auslese.raeume) || []).length,
               feldweise: x.feldweise || 0,
               vermerke: x.vermerke || [] };
    }).filter(function (x) { return x.vermerke.length || x.feldweise; }),
  };
  /* Nach der Analyse kommt DAS URTEIL auf Schritt 1 — nicht mehr der Sprung
     ins Kontrollblatt. Das Kontrollblatt bleibt im Expertenmodus vollständig
     erhalten; sein Wissen fließt über kern_pruefung in Urteil und
     Rückfragen. Der Fragezeiger beginnt vorn: die Liste ist gerade neu. */
  App.schritt = "start";
  App.rueckfrageIndex = 0;
  render();
  window.scrollTo(0, 0);
}

/** „RAUMLISTE UNVOLLSTÄNDIG" IST NACH EINER GEGLÜCKTEN ZERLEGUNG EIN
 *  FALSCHER ALARM.
 *
 *  Prüflauf vom 26.08.2026, Bogen „260514 Dumach 1", A1: die erste Lesung
 *  lief in die Längengrenze, das Werkzeug zerlegte das Blatt selbst und
 *  setzte die Raumliste aus den Teilen zu 25 Räumen zusammen — von Hand am
 *  Plan nachgezählt vollständig (EG 12 + OG 11 + DG 2 = 25, Summe
 *  370,44 m²). In der Fragenliste stand trotzdem weiter „12 Räume sind
 *  angekommen, danach bricht die Antwort ab … mindestens ein Teil blieb
 *  unvollständig". Eine Warnung, die nach der geglückten Rettung stehen
 *  bleibt, wird beim nächsten Mal überlesen — und dann fehlen wirklich
 *  Räume.
 *
 *  Zurückgenommen wird sie NUR gegen einen unabhängigen Beleg: die zweite
 *  Lesung desselben Blattes zählt die beschrifteten Räume, ohne die erste zu
 *  kennen. Zählt sie keinen Raum mehr, der im Raumbuch fehlt, ist die Liste
 *  vollständig. Fehlt diese zweite Lesung, bleibt die Warnung stehen: nicht
 *  belegt ist nicht dasselbe wie widerlegt. */
function raumlisteWarnungNachpruefen(zuTun) {
  if (!(App.p.offeneFragen || []).length) return;
  const G = window.KERN_GEGENPROBE;
  if (!G || !G.fehltJeEbene) return;
  const istName = window.MODUL_KI
    && (window.MODUL_KI.istZaehlbarerRaumname || window.MODUL_KI.istRaumname);
  (zuTun || []).forEach(function (seite) {
    const blatt = seite.bezeichnung || seite.name || "";
    if (!blatt) return;
    const ebenen = seite.gegenprobeEbenen || [];
    if (!ebenen.length) return;
    const raeume = (seite.auslese && seite.auslese.raeume) || [];
    if (G.fehltJeEbene(ebenen, raeume, istName).length) return;
    const vorher = App.p.offeneFragen.length;
    App.p.offeneFragen = App.p.offeneFragen.filter(function (x) {
      return !(x.thema === "Raumliste unvollständig" && x.blatt === blatt);
    });
    if (App.p.offeneFragen.length === vorher) return;
    seite.vermerke = seite.vermerke || [];
    seite.vermerke.push("Die erste Lesung war an der Längengrenze "
      + "abgeschnitten; nach der Zerlegung zählt die zweite, unabhängige "
      + "Lesung keinen beschrifteten Raum mehr, der im Raumbuch fehlt. Die "
      + "Meldung „Raumliste unvollständig“ ist damit erledigt und steht "
      + "nicht mehr in den Rückfragen.");
  });
}

/* ===========================================================================
 * Die Gegenprobe repariert: gezielte Nachlesung fehlender Raeume
 * ===========================================================================
 * MEHRFACH BEIM KUNDEN AUFGETRETEN: die Raeume eines Geschosses (etwa das
 * Erdgeschoss) kamen gar nicht ins Raumbuch. Die Gegenprobe ZAEHLTE das
 * bereits -- sie zaehlt beschriftete Raeume je gezeichneter Ebene und nennt
 * ihre Namen --, aber sie MELDETE nur. Der Kollege bekam einen roten Befund
 * ueber Raeume, deren Namen das Werkzeug kannte und deren Feld auf dem Bogen
 * es kannte. Das ist ein Arbeitsauftrag an das Werkzeug, nicht an den
 * Menschen.
 *
 * Der Weg, in dieser Reihenfolge (erst billig, dann Konsens):
 *   1. KERN_GEGENPROBE.fehltJeEbene sagt, WELCHE Namen auf WELCHER Ebene
 *      fehlen (Multimenge ueber das ganze Blatt, nur benennbare Raeume).
 *   2. Je betroffener Ebene EINE gezielte Nachlesung: zugeschnitten auf das
 *      Zeichnungsfeld der Ebene, wenn sich Felder und Ebenen zuordnen
 *      lassen (gleiche Anzahl), sonst das ganze Blatt. Die gezaehlten Namen
 *      gehen als SUCHLISTE mit in den Auftrag.
 *   3. Uebernommen wird per Konsens (raumKonsens): nur Raeume, deren Name in
 *      der Fehlliste steht, kommen dazu -- als "aus einer Lesung"
 *      gekennzeichnet. Nichts Bestehendes wird ueberschrieben. Ein falsch
 *      zugeordnetes Feld ist damit harmlos: seine Raeume stehen schon im
 *      Raumbuch und fallen bei der Zuordnung heraus.
 *   4. Jede Nachlesung zaehlt in denselben Kosten-Topf (leseVersuch ->
 *      ausleseKostenAddieren) und laeuft nur, solange der Deckel es
 *      hergibt (nachlesungImBudget). Bei erreichtem Deckel und bei einer
 *      erfolglosen Nachlesung bleibt der Befund als offene Frage stehen --
 *      NIE ein leeres Geschoss ohne Meldung.
 * ======================================================================== */
/** Welche Ausschnitte eine gezielte Nachlesung versucht — und in welcher
 *  Reihenfolge.
 *
 *  WARUM NICHT EINFACH DAS GANZE BLATT. GEMESSEN am 26.08.2026 am Blattsatz
 *  „Hasenberg 10" (2 Blätter, Vektor): Blatt 1 trägt ZWEI Zeichnungsfelder,
 *  aber nur EINE gezeichnete Ebene (Erdgeschoss). Die Zuordnung Feld zu Ebene
 *  über die Reihenfolge greift dann nicht (2 ist nicht 1), und die Nachlesung
 *  fiel auf „das ganze Blatt" zurück — auf genau den Durchgang, der vorher an
 *  der Längengrenze abgerissen war und die Zerlegung überhaupt erst ausgelöst
 *  hatte. Sie brachte deshalb nichts: 8 gezählte Räume (99,61 m²) blieben als
 *  offene Frage stehen, und die Rechnung lief still mit 12 statt 20 Räumen
 *  weiter — 13,69 kW für ein Haus mit 280,76 m².
 *
 *  Nachgelesen wird deshalb in DERSELBEN Zerlegung, die dem Blatt schon
 *  einmal aufgeholfen hat: erst das zugeordnete Feld, dann die übrigen
 *  Felder, bei einem Bogen ohne Felder die zwei überlappenden Hälften — und
 *  das ganze Blatt zuletzt, weil es der Durchgang mit der geringsten Aussicht
 *  ist. Höchstens vier Versuche je Ebene, und die Kostenprüfung steht
 *  weiterhin vor JEDEM Versuch. */
const NACHLESE_VERSUCHE_MAX = 4;
function nachleseAusschnitte(seite, f, ebenenZahl) {
  const felder = (seite && seite.felder) || [];
  const raus = [];
  const dazu = function (rect, wo) { raus.push({ rect: rect || null, wo: wo }); };
  if (felder.length >= 2) {
    const zuerst = (felder.length === ebenenZahl && felder[f.index] != null)
      ? f.index : -1;
    if (zuerst >= 0) {
      dazu(felder[zuerst],
        "im Zeichnungsfeld " + (zuerst + 1) + " von " + felder.length);
    }
    felder.forEach(function (fd, i) {
      if (i === zuerst) return;
      dazu(fd, "im Zeichnungsfeld " + (i + 1) + " von " + felder.length);
    });
  } else if (felder.length === 1) {
    dazu(felder[0], "im Zeichnungsfeld des Bogens");
    haelftenVon(felder[0]).forEach(function (h, i) {
      dazu(h, "in Hälfte " + (i + 1) + " des Zeichnungsfelds");
    });
  } else if (seite && (seite.rettungVersucht === "haelften"
                       || seite.rettungVersucht === "felder")) {
    /* Der Bogen ist schon einmal an seinem Umfang gescheitert: das ganze
       Blatt noch einmal zu lesen hiesse, denselben Durchgang zu wiederholen. */
    haelftenVon(null).forEach(function (h, i) {
      dazu(h, "in Hälfte " + (i + 1) + " des Blattes");
    });
  }
  dazu(null, "auf dem ganzen Blatt");
  return raus.slice(0, NACHLESE_VERSUCHE_MAX);
}

async function gegenprobeNachlesen(seite, r, gp, vermerke, fortschritt) {
  const G = window.KERN_GEGENPROBE;
  if (!G || !G.fehltJeEbene || !G.raumKonsens) return r;
  const blatt = seite.bezeichnung || seite.name || "diesem Blatt";
  /* Fuer die Zaehlung gilt der ZAEHLBARE Raumname: ohne Vermassungen UND
     ohne Einbauteile (Garderobe, Schrank, Nische). Eine gezaehlte
     Garderobe, die das Raumbuch mit Absicht nicht fuehrt, waere sonst
     eine "fehlende" Zeile samt Nachlesung — Kundenbefund Hasenberg 10,
     25.08.2026. */
  const istName = window.MODUL_KI
    && (window.MODUL_KI.istZaehlbarerRaumname || window.MODUL_KI.istRaumname);
  const fehlt = G.fehltJeEbene(seite.gegenprobeEbenen || [],
    r.raeume || [], istName);
  if (!fehlt.length) return r;

  const felder = seite.felder || [];
  const ebenenZahl = (seite.gegenprobeEbenen || []).length;
  const frageStellen = function (f, warum) {
    App.p.offeneFragen = App.p.offeneFragen || [];
    const text = "Die zweite Lesung zählt auf „" + blatt + "“ ("
      + f.ebene + ") " + mz(f.fehlt.length, "beschrifteten Raum", "beschriftete Räume")
      + ", " + (f.fehlt.length === 1 ? "der" : "die") + " im Raumbuch "
      + (f.fehlt.length === 1 ? "fehlt" : "fehlen") + ": "
      + f.fehlt.join(", ") + ". " + warum
      + " Bitte am Plan nachsehen und die Räume ergänzen.";
    if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
      App.p.offeneFragen.push({ thema: "Räume laut Zählung fehlen",
                                blatt: blatt, frage: text });
    }
  };

  for (const f of fehlt) {
    if (App.auslese.abbrechen) break;
    if (!nachlesungImBudget()) {
      vermerke.push("Auf " + f.ebene + " fehlen laut Zählung "
        + mz(f.fehlt.length, "Raum", "Räume") + " (" + f.fehlt.join(", ")
        + "), aber der Kosten-Deckel dieses Laufs ist erreicht; es wird "
        + "nicht nachgelesen.");
      frageStellen(f, "Der Kosten-Deckel dieses Laufs war erreicht, deshalb "
        + "wurde nicht nachgelesen.");
      continue;
    }
    /* Die Reihenfolge der Ausschnitte steht in nachleseAusschnitte(): erst
       das der Ebene zugeordnete Zeichnungsfeld, dann die uebrigen Felder,
       das ganze Blatt zuletzt. Ein falscher Zuschnitt ist harmlos
       (Suchlisten-Filter, siehe Kopf); er kostet nur den naechsten Versuch. */
    const versuche = nachleseAusschnitte(seite, f, ebenenZahl);
    const wo = versuche[0].wo;
    vermerke.push("Die Zählung sieht auf " + f.ebene + " "
      + mz(f.fehlt.length, "Raum", "Räume") + ", "
      + (f.fehlt.length === 1 ? "der" : "die") + " im Raumbuch "
      + (f.fehlt.length === 1 ? "fehlt" : "fehlen") + " ("
      + f.fehlt.join(", ") + "). Das Werkzeug liest " + wo + " gezielt nach.");
    const zusatz = "Dieses Blatt zeigt den Grundriss „" + f.ebene + "“. "
      + "Laut unabhängiger Zählung stehen dort die Räume: "
      + f.alle.join(", ") + ". Bitte ALLE Räume dieses Grundrisses mit ihren "
      + "angeschriebenen Flächen aufführen.";

    let gefunden = [];
    /* Die Fehlliste steht AUSSERHALB der Versuche: jeder Versuch nimmt nur
       noch, was danach immer noch fehlt, und das Gefundene wird gesammelt
       statt ueberschrieben. Vorher endete die Suche nach dem ersten Versuch,
       der IRGENDETWAS brachte -- ein Feld mit zwei von acht fehlenden
       Raeumen liess die restlichen sechs liegen. Multimenge: ein Name, der
       zweimal fehlt, wird auch zweimal wieder aufgenommen. */
    const offen = f.fehlt.map(function (nm) { return G.normName(nm); });
    for (let v = 0; v < versuche.length; v++) {
      if (!offen.length) break;
      if (v > 0 && (!nachlesungImBudget() || App.auslese.abbrechen)) break;
      if (typeof fortschritt === "function") {
        fortschritt("— Nachlesung " + f.ebene + " (" + versuche[v].wo + ")");
      }
      try {
        const bildN = await seiteAlsBild(seite, versuche[v].rect);
        const rN = await aufrufGeplant("raeume",
          blattZeile(seite, "— Nachlesung " + f.ebene), function () {
            return leseVersuch(bildN, "raeume", vermerke,
              "die Nachlesung „" + f.ebene + "“", zusatz);
          });
        const kandidaten = (rN && rN.raeume) || [];
        const neue = kandidaten.filter(function (kr) {
          const nm = G.normName((kr && typeof kr.bezeichnung === "object"
            && kr.bezeichnung) ? kr.bezeichnung.wert : (kr && kr.bezeichnung));
          const i = offen.indexOf(nm);
          if (i < 0) return false;
          offen.splice(i, 1);
          return true;
        });
        gefunden = gefunden.concat(neue);
        if (neue.length) {
          vermerke.push("Die Nachlesung " + versuche[v].wo + " brachte "
            + mz(neue.length, "fehlenden Raum", "fehlende Räume") + "."
            + (offen.length ? " Es fehlen weiterhin " + offen.length + "." : ""));
        }
      } catch (eN) {
        vermerke.push("Die Nachlesung für " + f.ebene + " ließ sich nicht "
          + "lesen: " + kurzeMeldung(eN));
      }
    }
    if (gefunden.length) {
      /* Geschoss aus der Ebenenbezeichnung, wenn das Modell keines nennt. */
      gefunden.forEach(function (kr) {
        if (!kr.geschoss) kr.geschoss = geschossKanon(f.ebene);
      });
      const kon = G.raumKonsens(r.raeume || [], gefunden,
        { andereQuelle: "gezielte Nachlesung nach der Zählung" });
      r = Object.assign({}, r, { raeume: kon.raeume, ist_grundriss: true });
      seite.grundrissOhneRaeume = null;
      seite.nachgelesen = (seite.nachgelesen || 0) + 1;
      vermerke.push("Die Nachlesung brachte " + kon.nurAndere.length + " von "
        + f.fehlt.length + " fehlenden Räumen: " + kon.nurAndere.join(", ")
        + ". Sie stammen aus einer Lesung und sind so gekennzeichnet.");
      if (gefunden.length < f.fehlt.length) {
        const nameVon = function (kr) {
          return G.normName((kr && typeof kr.bezeichnung === "object"
            && kr.bezeichnung) ? kr.bezeichnung.wert : (kr && kr.bezeichnung));
        };
        const gefundenNamen = gefunden.map(nameVon);
        frageStellen(Object.assign({}, f, {
          fehlt: f.fehlt.filter(function (nm) {
            const i = gefundenNamen.indexOf(G.normName(nm));
            if (i >= 0) { gefundenNamen.splice(i, 1); return false; }
            return true;
          }),
        }), "Eine gezielte Nachlesung hat nur einen Teil davon gefunden.");
      }
    } else {
      frageStellen(f, "Eine gezielte Nachlesung " + wo + " hat sie nicht "
        + "gefunden.");
      vermerke.push("Die Nachlesung fand die fehlenden Räume nicht; sie "
        + "stehen als offene Frage im Kontrollblatt.");
    }
  }
  return r;
}

/* ===========================================================================
 * Die zweite Lesung aufnehmen
 * ===========================================================================
 * Was hier geschieht, und was ausdruecklich NICHT:
 *
 * Die zweite Lesung wird NICHT ins Raumbuch uebernommen. Sie zaehlt und
 * benennt, sie wertet nicht aus; ihre Namen tragen keine Flaeche, keine Hoehe
 * und keine Raumart. Wer sie ins Raumbuch schriebe, haette am Ende zwei
 * Saetze Raeume und keine Probe mehr.
 *
 * Sie wird zur QUELLE fuer die Zaehler des Kontrollblatts. Deren Fragen
 * lauteten bisher alle gleich -- "gegen nichts geprueft" --, weil sie keine
 * unabhaengige Sollzahl hatten. Genau die liefert sie jetzt:
 *
 *   Z1  Raeume je Geschoss     <- raeume_beschriftet
 *   Z2  Flaechensumme          <- Kontur aus der Aussenbemassung
 *   Z3  Fenster                <- fenster_gesamt
 *   Z4  Zahl der Geschosse     <- die benannten Ebenen aller Blaetter
 *   Z5  unbeheizte Bereiche    <- unbeheizt_benannt
 *
 * Die Schwellen dieser Zaehler bleiben unangetastet. Was sich aendert, ist
 * allein, dass sie endlich etwas zu vergleichen haben.
 * ======================================================================== */
function gegenprobeAufnehmen(seite, erste, roh, vermerke) {
  const G = window.KERN_GEGENPROBE;
  if (!G) return;
  const blatt = seite.bezeichnung || seite.name || "diesem Blatt";
  const ab = G.abgleich(erste, roh, {
    blatt: blatt,
    /* Beide Seiten mit DEMSELBEN Filter messen. Sonst zaehlt die eine
       "RH 2,28" als Raum und die andere nicht, und die Gegenprobe meldet
       einen Unterschied, den es nicht gibt. Gemessen wird mit dem
       ZAEHLBAREN Raumnamen: auch Einbauteile (Garderobe, Schrank, Nische)
       zaehlen auf keiner Seite mit — das Raumbuch fuehrt sie mit Absicht
       nicht (Kundenbefund Hasenberg 10, 25.08.2026). */
    istRaumname: window.MODUL_KI
      && (window.MODUL_KI.istZaehlbarerRaumname || window.MODUL_KI.istRaumname),
  });
  /* KEINE ANGABE IST KEINE LESUNG -- UND MUSS AUCH SO ANKOMMEN.
     Hier stand ein blankes return. Kam eine Antwort ohne inhaltliche Angabe
     zurueck, geschah danach gar nichts: kein Vermerk, kein Fehler am Blatt,
     kein Wort im Kontrollblatt. Der bezahlte Aufruf verschwand spurlos, und
     das Blatt sah aus wie eines, fuer das nie eine Gegenprobe vorgesehen war.
     Ein stiller Fehlschlag ist so schlecht wie ein falsches Ergebnis. */
  if (!ab.gelesen) {
    seite.gegenprobeFehler = "Die zweite Lesung kam ohne eine einzige Angabe "
      + "zurück; sie zählt damit nicht als gelaufen.";
    vermerke.push("Die Gegenprobe für " + blatt + " lief, kam aber ohne Angaben "
      + "zurück. Die Zahlen dieses Blattes bleiben ungeprüft; das Kontrollblatt "
      + "fragt danach.");
    return;
  }
  seite.gegenprobe = ab.zweite;
  seite.gegenprobeAbgleich = ab.merkmale;

  /* Die Konturen aus der Aussenbemassung, JE GEZEICHNETER EBENE eine. Sie
     sind das umschreibende Rechteck und damit eine Obergrenze; das steht im
     Merkmal und wird im Kontrollblatt auch so gesagt. Eine Obergrenze ist
     trotzdem unendlich viel mehr als das, was bisher dastand: nichts.

     Je Ebene und nicht je Blatt, weil ein A3-Bogen drei Grundrisse tragen
     kann -- so Sebastians Blatt "BV 2-0887 Ziolkowski". Eine Kontur je Blatt
     rechnete die 100 m² des Erdgeschosses gegen ein Kellergeschoss, das nur
     zur Haelfte unterkellert ist. */
  const konturen = G.konturenAusBlatt(ab.zweite);
  if (konturen.length) seite.gegenprobeKonturen = konturen;
  /* EINE ZAHL, DIE IHRER EIGENEN MASSKETTE WIDERSPRICHT, BLEIBT NICHT STILL.
     Die Kontur bleibt als Obergrenze stehen (KERN_GEGENPROBE entscheidet
     das), der Widerspruch wird aber benannt: aus ihm werden die
     hochgerechneten Aussenwandflaechen gebildet. GEMESSEN am Blattsatz
     „Hasenberg 10" (26.08.2026): 20,55 m verwendet, Kette ergibt 18,95 m. */
  konturen.forEach(function (k) {
    if (!k || !k.widerspruch) return;
    const w = k.widerspruch;
    const text = "Auf „" + (seite.bezeichnung || seite.name) + "“ nennt die "
      + "Lesung für " + k.ebene + " die Außenkante " + fmt(w.wert, 2)
      + " m und als Herkunft die Maßkette „" + w.wortlaut + "“. Die Kette "
      + "ergibt " + w.summen.map(function (s) { return fmt(s, 2); }).join(" bzw. ")
      + " m und trägt diese Zahl nicht. Aus der Kontur werden die "
      + "hochgerechneten Außenwandflächen gebildet; bitte das Außenmaß am "
      + "Plan bestätigen oder von Hand eintragen.";
    vermerke.push(text);
    App.p.offeneFragen = App.p.offeneFragen || [];
    if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
      App.p.offeneFragen.push({ thema: "Außenmaß ohne deckende Maßkette",
                                blatt: seite.bezeichnung, frage: text });
    }
  });
  /* Die Zaehlungen je Ebene. Das ist die Zahl, die das Kontrollblatt braucht:
     sie gilt fuer ein Geschoss und nicht fuer ein Blatt. Derselbe zaehlbare
     Filter wie im Abgleich oben: eine mitgezaehlte Garderobe stuende sonst
     als Sollzahl gegen ein Raumbuch, das sie mit Absicht nicht fuehrt. */
  const jeEbene = G.raeumeJeEbene(ab.zweite, window.MODUL_KI
    && (window.MODUL_KI.istZaehlbarerRaumname || window.MODUL_KI.istRaumname));
  if (jeEbene.length) seite.gegenprobeEbenen = jeEbene;

  /* DIE ANSICHT ZAEHLT EINE FASSADE.
   *
   * Die Fenster einer Ansicht sind dieselben, die im Grundriss stehen -- von
   * aussen gesehen. In die Gesamtzahl gehoeren sie deshalb nicht (das waere
   * doppelt gezaehlt), wohl aber in den Abgleich Fassade fuer Fassade. Den
   * gibt es im Kontrollblatt seit langem (Zaehler fenster_<Fassade>), er lief
   * nur nie: er speist sich aus App.p.ansichten, und das Feld hat bisher
   * niemand gefuellt. Ein gebauter Zaehler ohne Zulieferung ist derselbe
   * Fehler wie eine Faehigkeit ohne Aufrufer.
   *
   * Eine Fassade wird nur einmal gefuehrt; liegen zwei Ansichten derselben
   * Fassade vor, gilt die groessere Zahl -- bei der Vollstaendigkeit ist der
   * Fehler einseitig. */
  (ab.zweite.ansichten || []).forEach(function (a) {
    if (!a.fassade || !(a.fenster > 0)) return;
    App.p.ansichten = App.p.ansichten || [];
    const norm = function (s) { return String(s || "").trim().toLowerCase(); };
    const schon = App.p.ansichten.find(function (x) {
      return norm(x.fassade) === norm(a.fassade);
    });
    if (schon) {
      if (a.fenster > (Number(schon.fenster) || 0)) {
        schon.fenster = a.fenster;
        schon.blatt = blatt;
        schon.breite_bezug_m = a.breite_bezug_m || null;
        schon.oeffnungen = a.oeffnungen || [];
        schon.fassade_wortlaut = a.fassade_wortlaut || null;
        schon.fassade_belegt = a.fassade_belegt === true;
      /* Eine zweite Ansicht derselben Fassade kann dieselbe Zahl bringen und
         zusaetzlich die Masse. Dann ist sie die bessere Lesung, auch ohne
         mehr Fenster. */
      } else if (!(schon.oeffnungen || []).length && (a.oeffnungen || []).length) {
        schon.oeffnungen = a.oeffnungen;
        schon.breite_bezug_m = a.breite_bezug_m || schon.breite_bezug_m || null;
      }
      return;
    }
    /* Ob die Bezeichnung belegt ist (Wortlaut der Blattbeschriftung stuetzt
       sie), entscheidet KERN_GEGENPROBE.fassadeBelegt beim Normieren. Ohne
       Beleg wird die Zahl weitergefuehrt, die Fassade aber nicht behauptet —
       siehe Kontrollblatt Z3. */
    App.p.ansichten.push({ fassade: a.fassade, fenster: a.fenster, blatt: blatt,
      fassade_wortlaut: a.fassade_wortlaut || null,
      fassade_belegt: a.fassade_belegt === true,
      breite_bezug_m: a.breite_bezug_m || null,
      oeffnungen: a.oeffnungen || [],
      quelle: "zweite Lesung von " + blatt });
  });

  /* Was der Kollege sofort sehen muss: ein Widerspruch zwischen den beiden
     Lesungen. Eine Uebereinstimmung braucht keinen Vermerk -- sie steht im
     Kontrollblatt als gruene Zeile. */
  ab.merkmale.forEach(function (m) {
    if (m.stufe === "fehler" || m.stufe === "warnung") {
      vermerke.push("Zweite Lesung, " + m.titel + ": " + m.text);
    }
  });
  konturen.forEach(function (k) {
    vermerke.push("Aus der Außenbemaßung (" + k.quelle + ") ergibt sich eine "
      + "Gebäudekontur von " + k.A.toLocaleString("de-DE") + " m². Die "
      + "Flächensumme dieses Geschosses läuft jetzt dagegen.");
  });
}

/** Nimmt den Maßstab, den das Modell vom Blatt abgelesen hat, an der Seite auf.
 *
 *  Das ist der erste und billigste Weg an den Maßstab: er steht auf fast jedem
 *  Plan im Schriftfeld, und das Modell sieht das Schriftfeld ohnehin. Erst
 *  wenn dieser Weg nichts hergibt, wird gemessen oder von Hand gesetzt.
 *
 *  Ein von Hand gesetzter Maßstab wird NICHT überschrieben. Der Bearbeiter hat
 *  den Plan vor sich, das Modell hat nur ein Bild davon; wer das umdreht,
 *  nimmt dem Bearbeiter eine Entscheidung ab, die er schon getroffen hat.
 *  Ebenso wenig überschrieben wird ein aus dem PDF-Textstand abgeleiteter
 *  Maßstab, der bereits durch eine Maßkette abgesichert ist. */
function massstabAusAusleseUebernehmen(seite, r) {
  const K = window.KERN_MASSSTAB;
  if (!K || !r || !r.massstab) return;
  const bisher = seite.massstab || {};
  if (bisher.quelle === "vom Bearbeiter eingetragen") return;
  /* Ein am Bildschirm nachgemessener Maßstab ist die eigene Handlung des
     Bearbeiters an der tatsächlich vorliegenden Zeichnung. Ihn durch das zu
     ersetzen, was im Schriftfeld steht, hieße genau den Fehler wieder
     einzubauen, gegen den gemessen wurde. */
  if (bisher.herkunft === "gemessen") return;
  if (bisher.guete === "abgesichert") return;

  const gelesen = K.ausAuslese({
    massstab: r.massstab,
    blatt: { breite_mm: seite.breite_mm, hoehe_mm: seite.hoehe_mm,
             herkunft: seite.breite_mm > 0 ? "pdf" : "bild" },
  });
  seite.massstabGelesen = gelesen;

  /* Die aufbereiteten Maßzahlen bleiben auch dann liegen, wenn kein Nenner
     dabei herauskam: sie sind die Grundlage für das Nachmessen im Bild. */
  seite.masszahlenAusPlan = gelesen.masszahlen;

  if (gelesen.nenner === null) {
    if (!bisher.nenner) {
      seite.massstab = Object.assign({}, bisher, {
        guete: gelesen.guete, quelle: gelesen.quelle,
        handlung: gelesen.handlung, befunde: gelesen.befunde,
      });
    }
    return;
  }
  /* Steht schon ein Nenner aus dem PDF-Textstand da und stimmt er überein,
     ist das ein zweiter, unabhängiger Beleg. Weichen beide ab, wird nichts
     übernommen: dann ist unklar, welcher gilt. */
  if (bisher.nenner && bisher.nenner !== gelesen.nenner) {
    seite.massstab = Object.assign({}, bisher, {
      guete: "widerspruch",
      quelle: "Blattkopf nennt 1:" + bisher.nenner + ", abgelesen wurde 1:"
        + gelesen.nenner,
      handlung: "von_hand", befunde: gelesen.befunde,
    });
    return;
  }
  seite.massstab = Object.assign({}, bisher, {
    nenner: gelesen.guete === "widerspruch" ? bisher.nenner || null : gelesen.nenner,
    guete: gelesen.guete,
    quelle: gelesen.quelle,
    wortlaut: gelesen.wortlaut,
    fundstelle: gelesen.fundstelle,
    gilt_fuer: gelesen.gilt_fuer,
    mehrere: gelesen.mehrere,
    blattgroesse: gelesen.blattgroesse,
    blattmass_gesichert: gelesen.blattmass_gesichert,
    handlung: gelesen.handlung,
    befunde: gelesen.befunde,
    px_je_meter: null,
  });
}

/* ==========================================================================
 * Maßstab im Bild nachmessen — Weg A von KERN_MASSSTAB
 * ==========================================================================
 * Warum das sein muss, obwohl der Maßstab doch im Schriftfeld steht:
 *
 * Das Schriftfeld sagt, in welchem Maßstab GEZEICHNET wurde. Die Maßketten
 * sagen, in welchem Maßstab das Blatt JETZT vorliegt. Ein A1-Plan, der auf A3
 * kopiert wurde, trägt weiter "M 1:100" im Schriftfeld und misst 1:141. Wer
 * das nicht bemerkt, rechnet mit der halben Fläche und merkt es nie wieder.
 * Deshalb wird immer beides erhoben und gegeneinander gehalten.
 *
 * Die Reihenfolge ist bewusst so und nicht anders:
 *   1. Vektorzeichnung: MODUL_PDF liest Maßzahlen und Linienlängen aus dem
 *      Dokument. Genauer geht es nicht, kostet nichts und geschieht beim
 *      Öffnen. Ist dabei ein abgesicherter Maßstab herausgekommen, wird hier
 *      nicht noch einmal gemessen.
 *   2. Scan, Bildschirmfoto, Zeichnung ohne Textstand: das Modell liest die
 *      Maßzahlen mit ihrer Lage ab (Betriebsart "raeume"), und dieser Weg
 *      misst die zugehörige Maßlinie im Bild aus.
 *   3. Bleibt beides ohne Ergebnis, wird von Hand gesetzt oder im Plan
 *      nachgemessen. Ein geratener Maßstab entsteht nie.
 * ------------------------------------------------------------------------ */

/* Größe des Messbildes. Gemessen am Rechenkern selbst: ein A1-Plan mit 17,4
   Millionen Bildpunkten kostet 137 ms, ein A4-Scan mit 3,9 Millionen 51 ms.
   Die Bildauswertung ist also nicht das Teure — teuer ist das Rendern. Sechs
   Millionen Punkte sind bei A1 rund 90 dpi und bei A4 rund 300 dpi. Weiter
   herunter darf es nicht gehen: Maßhilfslinien sind dünn gezeichnet und
   verschwinden, dann findet der Weg nichts mehr. */
const MESS_PUNKTE_MAX = 6e6;
const MESS_DPI_MAX = 200;

/* Eine Seite nach der anderen. Zwei gleichzeitig gerenderte A1-Blätter
   belegen mehrere hundert Megabyte und lassen den Browser stehen. */
const Messen = { warteschlange: [], laeuft: false };

/** Auflösung, mit der für die Messung gerendert wird. Null heißt: die Seite
 *  hat kein Blattmaß, ist also eine Bilddatei — dann wird sie in ihrer
 *  eigenen Auflösung genommen und die Punkte je Zoll bleiben unbekannt. */
function messAufloesung(seite) {
  const bpt = Number(seite.breite_pt), hpt = Number(seite.hoehe_pt);
  if (!(bpt > 0) || !(hpt > 0)) return null;
  let dpi = Math.min(MESS_DPI_MAX,
    (seite.aufloesung && seite.aufloesung.dpi > 0) ? seite.aufloesung.dpi : MESS_DPI_MAX);
  const punkte = (bpt / 72 * dpi) * (hpt / 72 * dpi);
  if (punkte > MESS_PUNKTE_MAX) dpi *= Math.sqrt(MESS_PUNKTE_MAX / punkte);
  return Math.max(40, Math.round(dpi));
}

/** Rendert die Seite und gibt die Bildpunkte heraus, so wie KERN_MASSSTAB sie
 *  erwartet. Liefert zusätzlich, ob die Auflösung belastbar ist — nur dann
 *  darf aus dem Schriftfeld gerechnet werden. */
async function messbildHolen(seite) {
  const dpi = messAufloesung(seite);
  const r = await seite.rendern(dpi ? { dpi: dpi } : {});
  let breite = r.breite || 0, hoehe = r.hoehe || 0;
  let quelle = r.canvas || r.bild;
  if (!quelle) throw new Error("Die Seite ließ sich nicht darstellen.");
  if (!breite || !hoehe) {
    breite = quelle.naturalWidth || quelle.width;
    hoehe = quelle.naturalHeight || quelle.height;
  }
  /* Eine Bilddatei kommt in ihrer eigenen Größe; die kann sehr groß sein. */
  let f = 1;
  if (breite * hoehe > MESS_PUNKTE_MAX) f = Math.sqrt(MESS_PUNKTE_MAX / (breite * hoehe));
  const b = Math.max(1, Math.round(breite * f)), h = Math.max(1, Math.round(hoehe * f));

  let ctx;
  if (r.canvas && f === 1) {
    ctx = r.canvas.getContext("2d");
  } else {
    const c = document.createElement("canvas");
    c.width = b; c.height = h;
    ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, b, h);
    ctx.drawImage(quelle, 0, 0, b, h);
  }
  const daten = ctx.getImageData(0, 0, b, h);
  return {
    bild: { data: daten.data, width: daten.width, height: daten.height },
    /* Die Punkte je Zoll gelten nur, wenn sie aus dem eigenen Rendern eines
       Dokuments mit bekanntem Blattmaß stammen UND das Bild danach nicht mehr
       verkleinert wurde. Beides muss zusammen zutreffen, sonst ist der Weg
       über das Schriftfeld wertlos (siehe KERN_MASSSTAB.GUELTIGKEIT_B). */
    dpi: (dpi && f === 1) ? (r.dpi || dpi) : 0,
    /* Bildpunkte je PDF-Punkt. Damit lassen sich Lageangaben aus dem
       Textstand des Dokuments in Bildpunkte umrechnen. */
    skala: (r.skala || (dpi ? dpi / 72 : 0)) * f,
  };
}

/** Maßzahlen aus dem Textstand eines PDF für den Messweg aufbereiten.
 *
 *  Das ist der Fall "Zeichnung mit Textstand, aber MODUL_PDF findet keine
 *  Maßlinie dazu". Er kommt vor, wenn die Maßlinien nicht als Striche,
 *  sondern als gefüllte Flächen gezeichnet sind: in der Geometrie steht dann
 *  keine Strecke, im gerenderten Bild sieht man die Linie aber sehr wohl.
 *  Die Lage kommt hier aus dem Dokument und ist damit auf den Punkt genau —
 *  besser als alles, was ein Modell aus einem Bild ablesen kann.
 *
 *  Die Umrechnung von PDF-Koordinaten in Bildpunkte folgt der Ansichtsmatrix
 *  von pdf.js: das PDF zählt von unten links, das Bild von oben links, und
 *  /Rotate dreht das Blatt. */
function masszahlenAusTextstand(seite, skala) {
  const KM = window.KERN_MASSSTAB;
  const stuecke = (seite && seite.textstuecke) || [];
  if (!KM || !stuecke.length || !(skala > 0)) return [];
  const bpt = Number(seite.breite_pt) || 0, hpt = Number(seite.hoehe_pt) || 0;
  const drehung = ((Number(seite.drehung) || 0) % 360 + 360) % 360;
  /* Flächenstempel aussortieren.
     Gemessen: der Weg nahm die acht GRÖSSTEN Zahlen des Blattes. Auf einem
     Plan mit angeschriebenen Raumflächen sind das genau die Flächenstempel
     (23,64 · 40,45 · 22,38), und sie wurden anschließend als Längen
     vermessen. Eine Fläche ist keine Länge; wer sie als solche ansetzt,
     bekommt einen Maßstab, der um den Faktor der Raumtiefe danebenliegt.
     Drei Siebe, alle aus vorhandenen, geprüften Bausteinen:
       1. was MODUL_PDF als Raumstempel liest (A = 23,64 oder 23,64 m²),
       2. was an derselben Stelle steht wie ein erkannter Raumstempel,
       3. was Buchstaben enthält — eine Maßzahl an einer Maßlinie steht
          allein, "OKFFB +2,54" und "23,64 m²" sind keine. */
  const MP = window.MODUL_PDF;
  const stempelOrte = ((seite && seite.raumstempel) || []).map(function (r) {
    return { x: r.x_pt, y: r.y_pt };
  });
  const raus = [];
  for (let i = 0; i < stuecke.length; i++) {
    const s = stuecke[i];
    if (/[A-Za-zÄÖÜäöüß]/.test(String(s.text).replace(/\s*(m|cm|mm)\s*$/i, ""))) continue;
    if (MP && typeof MP.raumstempelLesen === "function") {
      const rs = MP.raumstempelLesen(s.text);
      if (rs && rs.A_m2 !== null) continue;
    }
    if (stempelOrte.some(function (o) {
      return Math.abs(o.x - s.x_pt) < 1 && Math.abs(o.y - s.y_pt) < 1;
    })) continue;
    const um = KM.textZuMeter(s.text, "unklar");
    if (!um || !um.meter) continue;
    const br = (s.breite_pt || 0) * skala;
    const ho = (s.groesse_pt || 0) * skala;
    let x, y;
    if (drehung === 90) { x = skala * s.y_pt; y = skala * s.x_pt; }
    else if (drehung === 180) { x = skala * (bpt - s.x_pt); y = skala * s.y_pt; }
    else if (drehung === 270) { x = skala * (hpt - s.y_pt); y = skala * (bpt - s.x_pt); }
    else { x = skala * s.x_pt; y = skala * (hpt - s.y_pt); }
    /* Der Ankerpunkt eines Textstücks sitzt auf der Grundlinie links. Das
       Kästchen beginnt eine Zeilenhöhe darüber. */
    raus.push({ text: String(s.text), einheit: "unklar", bedeutung: "",
                x: Math.round(x), y: Math.round(y - ho),
                breite: Math.round(br), hoehe: Math.round(ho),
                koordinaten: "pixel", meter: um.meter });
  }
  /* Die längsten Maße zuerst: derselbe Ablesefehler von einem Bildpunkt fällt
     bei einer langen Kette viel weniger ins Gewicht. Mehr als acht bringen
     nichts und kosten nur Suchzeit. */
  raus.sort(function (a, b) { return b.meter - a.meter; });
  return raus.slice(0, 8);
}

/** Misst den Maßstab dieser Seite im Bild nach und hält das Ergebnis gegen
 *  das, was im Schriftfeld steht. Läuft nur, wenn es etwas zu messen gibt. */
async function massstabNachmessen(seite) {
  const KM = window.KERN_MASSSTAB;
  if (!KM || !seite || typeof seite.rendern !== "function") return null;
  const bisher = seite.massstab || {};
  if (bisher.quelle === "vom Bearbeiter eingetragen") return null;
  /* Ebenso wenig wird ein von Hand nachgemessener Maßstab überschrieben. */
  if (bisher.herkunft === "gemessen") return null;

  /* Zwei Quellen für die Maßzahlen, in dieser Rangfolge:
     1. was das Modell vom Bild abgelesen hat (Scan, Bildschirmfoto),
     2. der Textstand des PDF (punktgenau, aber nur bei Vektorzeichnungen).
     Das Modell hat den Vorrang, weil es nur dort etwas liefert, wo der
     Textstand fehlt; liegen beide vor, ist der Textstand ohnehin schon über
     MODUL_PDF ausgewertet worden. */
  const ausPlan = Array.isArray(seite.masszahlenAusPlan) ? seite.masszahlenAusPlan : [];
  const ausText = ausPlan.length ? [] : masszahlenAusTextstand(seite, 1);
  const kopfNenner = (seite.massstabGelesen && seite.massstabGelesen.nenner)
    || (seite.blattkopf && seite.blattkopf.massstab_nenner) || null;
  /* Ohne Maßzahl und ohne Angabe im Schriftfeld gibt es nichts zu messen und
     nichts gegenzuhalten. Dann wird auch nicht gerendert — ein A1-Blatt zu
     rendern, um anschließend "nichts gefunden" zu melden, kostet Sekunden
     und bringt nichts. */
  if (!ausPlan.length && !ausText.length && !kopfNenner) return null;

  seite.massstabMessung = { laeuft: true };
  const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
  let mb;
  try {
    mb = await messbildHolen(seite);
  } catch (e) {
    seite.massstabMessung = { laeuft: false,
      fehler: String((e && e.message) || e) };
    return null;
  }
  const masszahlen = ausPlan.length ? ausPlan : masszahlenAusTextstand(seite, mb.skala);
  const eingabe = { bild: mb.bild, masszahlen: masszahlen };
  if (kopfNenner) eingabe.plankopf = { nenner: kopfNenner };
  if (mb.dpi > 0) {
    eingabe.aufloesung = { dpi: mb.dpi, herkunft: "pdf-render",
                           nachtraeglich_skaliert: false };
  }
  const erg = KM.bestimmeMassstab(eingabe);
  const jetzt = (window.performance && performance.now) ? performance.now() : Date.now();
  erg.dauer_ms = Math.round(jetzt - t0);
  erg.laeuft = false;
  erg.bildpunkte = mb.bild.width * mb.bild.height;
  erg.mess_dpi = mb.dpi || null;
  seite.massstabMessung = erg;
  massstabAusMessungUebernehmen(seite, erg);
  massstabsprobeSpeisen();
  return erg;
}

/* ==========================================================================
 * Die Maßstabsproben im Kontrollblatt mit Belegen versorgen
 * ==========================================================================
 * kern_massstabsprobe.js prüft Maßketten gegeneinander und hält den Vermerk
 * im Schriftfeld gegen die gemessene Kette. Dafür braucht es Zahlen unter
 * App.p.plan — und die hat bisher niemand dorthin geschrieben. Das Modul lief
 * damit immer auf leeren Eingaben und meldete folgerichtig nie etwas.
 *
 * Genommen wird EINE Seite und nicht der ganze Stapel: Ein Schnitt 1:50 und
 * ein Grundriss 1:100 haben verschiedene Maßstäbe. In einen Topf geworfen
 * ergäben sie hundert Prozent Abweichung und damit einen Fehlalarm bei jedem
 * normalen Plansatz. Maßgebend ist das Blatt, aus dem Flächen gemessen
 * werden: das gerade im Messwerkzeug geladene, sonst der Grundriss mit den
 * meisten Belegen.
 * ----------------------------------------------------------------------- */
function massstabsprobeSpeisen() {
  const KM = window.KERN_MASSSTAB;
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  if (!App.p.plan) return;

  let seite = null;
  const P = window.MODUL_PLAN && window.MODUL_PLAN.zustand;
  if (P && P.seitenIndex != null && P.messungen && P.messungen.length) {
    seite = seiten[P.seitenIndex] || null;
  }
  if (!seite) {
    seiten.forEach(function (x) {
      if (x.istGrundriss === false) return;
      const n = ((x.massstabMessung && x.massstabMessung.kandidaten) || []).length;
      const beste = ((seite && seite.massstabMessung
        && seite.massstabMessung.kandidaten) || []).length;
      if (n > beste) seite = x;
    });
  }
  if (!seite) return;

  const m = seite.massstab || {};
  const erg = seite.massstabMessung || {};
  /* Alle Werte müssen sich auf dieselbe Auflösung beziehen, sonst vergleicht
     die Probe Äpfel mit Birnen. */
  const dpi = (m.herkunft === "gemessen" ? m.px_je_meter_dpi : erg.mess_dpi) || null;
  const ausKette = (m.herkunft === "gemessen" ? m.px_je_meter : null)
    || erg.px_je_meter || erg.anhalt_px_je_meter || null;
  const nennerBlatt = erg.nenner_schriftfeld
    || (seite.massstabGelesen && seite.massstabGelesen.nenner)
    || (seite.blattkopf && seite.blattkopf.massstab_nenner) || null;
  const ausPapier = (KM && nennerBlatt > 0 && dpi > 0)
    ? KM.pxJeMeterAusNenner(nennerBlatt, dpi) : null;

  App.p.plan.massstab_blatt = seite.bezeichnung || seite.name || null;
  App.p.plan.kandidaten_px_je_meter = (erg.kandidaten || [])
    .map(function (k) { return k.px_je_meter; })
    .filter(function (x) { return x > 0; });
  App.p.plan.px_je_meter_aus_kette = ausKette;
  App.p.plan.px_je_meter_aus_papier = ausPapier;
}

/** Führt das Messergebnis mit dem zusammen, was schon an der Seite steht.
 *
 *  Die Regel dahinter: ein gemessener Wert schlägt einen abgelesenen, denn
 *  gemessen wird an der Zeichnung, die tatsächlich vorliegt. Übernommen wird
 *  er trotzdem nur, wenn KERN_MASSSTAB ihn für doppelt belegt hält. Alles
 *  andere wird angezeigt, aber nicht gesetzt — ein Vorschlag im Eingabefeld
 *  wird bestätigt statt geprüft. */
function massstabAusMessungUebernehmen(seite, erg) {
  const bisher = seite.massstab || {};
  /* Befunde aus dem Ablesen (mehrere Maßstäbe auf einem Bogen, Blattgröße
     widerspricht dem Schriftfeld) bleiben stehen — die Messung kennt sie
     nicht und ersetzt sie nicht. Doppelt gemeldet wird nichts: gleiche
     Kennung heißt gleiche Sache, dann gilt die neuere Fassung. */
  const neueIds = {};
  (erg.befunde || []).forEach(function (b) { neueIds[b.id] = true; });
  const befunde = (bisher.befunde || []).filter(function (b) {
    return !neueIds[b.id];
  }).concat(erg.befunde || []);

  if (erg.schriftfeld_probe === "widerspruch") {
    seite.massstab = Object.assign({}, bisher, {
      nenner: null, px_je_meter: null, guete: "widerspruch",
      quelle: "Schriftfeld 1:" + erg.nenner_schriftfeld + ", im Bild gemessen 1:"
        + erg.nenner_gemessen + " — das Blatt liegt nicht in Originalgröße vor",
      handlung: "von_hand", befunde: befunde,
      vorschlag_px_je_meter: erg.px_je_meter || erg.anhalt_px_je_meter || null,
    });
    return;
  }
  if (erg.bestimmt) {
    seite.massstab = Object.assign({}, bisher, {
      px_je_meter: erg.px_je_meter,
      px_je_meter_dpi: erg.mess_dpi,
      nenner: erg.nenner_gemessen && erg.schriftfeld_probe === "stimmt"
        ? erg.nenner_schriftfeld
        : (bisher.nenner || null),
      guete: "abgesichert",
      quelle: erg.schriftfeld_probe === "stimmt"
        ? "im Bild an " + mz(erg.kandidaten.length, "Angabe", "Angaben")
          + " gemessen, deckt sich mit dem Schriftfeld"
        : "im Bild an " + mz(erg.kandidaten.length, "Maßkette", "Maßketten") + " gemessen",
      handlung: "uebernehmen", befunde: befunde,
    });
    return;
  }
  /* Nicht bestimmt. Was gemessen wurde, bleibt sichtbar, wird aber nicht
     gesetzt: weder als Wert noch als Vorbelegung. */
  seite.massstab = Object.assign({}, bisher, {
    guete: bisher.nenner ? (bisher.guete || "vorlaeufig") : "unbekannt",
    quelle: bisher.quelle || erg.text,
    handlung: erg.handlung, befunde: befunde,
    vorschlag_px_je_meter: erg.handlung === "bestaetigen" ? erg.px_je_meter : null,
  });
}

/** Stellt eine Seite zum Nachmessen an. Der Bearbeiter soll weiterarbeiten
 *  können, während gemessen wird; deshalb läuft das im Hintergrund und eine
 *  Seite nach der anderen. */
function massstabNachmessenAnstellen(seite) {
  if (!seite || Messen.warteschlange.indexOf(seite) >= 0) return;
  Messen.warteschlange.push(seite);
  if (!Messen.laeuft) messWarteschlangeAbarbeiten();
}

async function messWarteschlangeAbarbeiten() {
  if (Messen.laeuft) return;
  Messen.laeuft = true;
  try {
    while (Messen.warteschlange.length) {
      const seite = Messen.warteschlange.shift();
      try { await massstabNachmessen(seite); }
      catch (e) {
        seite.massstabMessung = { laeuft: false, fehler: String((e && e.message) || e) };
      }
      renderInhalt();
      /* Dem Browser Luft lassen, damit Eingaben zwischendurch ankommen. */
      await new Promise(function (w) { setTimeout(w, 0); });
    }
  } finally {
    Messen.laeuft = false;
    renderInhalt();
  }
}

function hinweisFuerAuslese() {
  const m = App.p.meta;
  return [m.bezeichnung, m.baujahr ? "Baujahr " + m.baujahr : "",
          [m.plz, m.ort].filter(Boolean).join(" ")].filter(Boolean).join("; ");
}

/* ===========================================================================
 * Räume aus den angeschriebenen Flächenstempeln
 * ===========================================================================
 * Der Riegel, der vor jedem Ergebnis lag: Flächen. Gemessen an sechs echten
 * Unterlagensätzen kam bei keinem eine brauchbare Fläche ohne Handarbeit
 * heraus — obwohl sie bei jeder Vektorzeichnung als Text im Dokument steht,
 * auf zwei Nachkommastellen genau.
 *
 * Drei Wege zu einer Fläche, in dieser Reihenfolge:
 *   1. GELESEN  — sie steht als Zahl im Plan. Exakt, hängt an keinem Maßstab.
 *   2. GEMESSEN — der Raum wird umfahren. Nur so gut wie der Maßstab.
 *   3. EINGETRAGEN — der Bearbeiter weiß es besser.
 * Dieser Weg ist der erste. Er kostet keinen Modellaufruf und keine Sekunde
 * Netz: MODUL_PDF liest die Blöcke bereits beim Ablegen der Datei.
 *
 * Warum nicht das Modell fragen: das Modell sieht ein Bild und liest die Zahl
 * ab. Hier steht sie im Dokument. Eine abgelesene Zahl kann falsch sein, eine
 * gelesene nicht.
 * ======================================================================= */

/** Die verwertbaren Flächenstempel eines Blattes, jeder mit seinem Geschoss.
 *
 *  Aussortiert wird, was keinen Raum bezeichnet: Stempel ohne Namen, Summen
 *  („Wohnfläche gesamt"), Beschriftungen, die KERN/MODUL_KI als Vermaßung
 *  kennt, und Flächen außerhalb dessen, was ein Raum sein kann.
 *
 *  Geschoss: Liegen mehrere Grundrisse auf EINEM Bogen — am Blatt
 *  „Dumach 1" sind es drei mit zusammen 25 Räumen —, entscheidet die Lage;
 *  jeder Stempel gehört zum nächstgelegenen Geschosstitel. Steht nur EIN
 *  Geschoss auf dem Blatt, wird die Lage nicht befragt: eine einzelne
 *  Fundstelle kann auch eine Beschriftung im Schriftfeld sein. Am Blatt
 *  „1.04 BA_2 Grundriss DG.pdf" steht „...STÜTZWANDHÖHEN, EG HÖHEN GEPLANT"
 *  groß genug für einen Titel; über die Lage wären alle 83 Räume des
 *  Dachgeschosses im Erdgeschoss gelandet. */
/** Kanonische Schreibweise eines Geschosskürzels.
 *
 *  ZWEI WÖRTERBÜCHER FÜR DIESELBE SACHE. MODUL_PDF führt seine
 *  Geschossschlüssel klein („og", „eg"), KERN_ZUORDNUNG seine Kürzel groß
 *  („OG", „EG"). Der Stempelweg nimmt die kleinen, die Auslese die großen —
 *  und im Raumbuch standen danach ZWEI Obergeschosse, „OG" und „og", jede
 *  Flächensumme doppelt. GEMESSEN in der Abnahme am 24.08.2026: 39 Räume,
 *  „OG doppelt als ‚OG' und ‚og', 59,70 kW". Hier wird deshalb jede
 *  Schreibweise durch KERN_ZUORDNUNG auf das eine Kürzel gebracht, bevor sie
 *  ins Raumbuch gelangt. Was sich nicht einordnen lässt (z. B. „sp" für den
 *  Spitzboden), bleibt unverändert — es wird nichts erfunden. */
function geschossKanon(k) {
  const t = String(k == null ? "" : k).trim();
  if (!t) return "";
  const Z = window.KERN_ZUORDNUNG;
  const g = Z && Z.geschossAusText ? Z.geschossAusText(t) : null;
  return g && g.kuerzel ? g.kuerzel : t;
}

function stempelraeumeDesBlatts(seite) {
  const MP = window.MODUL_PDF;
  const bloecke = (seite && seite.raumbloecke) || [];
  if (!bloecke.length || !MP) return [];
  /* Ein Lageplan trägt Flächen von Grundstücken und Häusern, keine Räume. */
  if (seite.blattkopf && seite.blattkopf.blattart === "lageplan") return [];
  const titel = (seite.geschosstitel || []);
  const kuerzel = [];
  titel.forEach(function (t) { if (kuerzel.indexOf(t.kuerzel) < 0) kuerzel.push(t.kuerzel); });
  const mehrere = kuerzel.length >= 2;
  const raus = [];
  let ohneNamen = 0;
  bloecke.forEach(function (b, bi) {
    if (b.sammel) return;
    if (!(b.A_m2 > 0.5 && b.A_m2 < 500)) return;
    /* EINE FLÄCHE OHNE NAMEN IST KEIN GRUND, SIE WEGZUWERFEN.
       Bis zum 27.08.2026 stand hier `if (!b.name || b.sammel) return;`, und
       damit fiel jede angeschriebene Fläche heraus, über der das Zeichenbüro
       keinen lesbaren Raumnamen gesetzt hat. GEMESSEN am Blatt
       „Hasenberg_10_Grundrisse_290425.pdf": von 20 angeschriebenen Flächen
       traf das genau eine, „35,48 m²" im linken Baukörper -- und mit ihr
       fielen 35,48 der 280,76 m² still aus dem Raumbuch.
       Eine gelesene Zahl ohne Namen ist mehr wert als eine geratene Zahl mit
       Namen: sie stimmt, und was fehlt, ist am Plan in zwei Sekunden zu
       beantworten. Sie bekommt deshalb eine laufende Nummer und wandert als
       Rückfrage weiter, statt zu verschwinden.
       Der Schutz gegen Summenstempel bleibt vorgeschaltet (b.sammel), und
       die Flächenschranke ebenfalls. */
    const namenlos = !b.name;
    if (namenlos) ohneNamen++;
    if (!namenlos && window.MODUL_KI && window.MODUL_KI.istRaumname
        && !window.MODUL_KI.istRaumname(b.name)) return;
    let g = seite.geschoss || (seite.blattkopf && seite.blattkopf.geschoss) || "";
    let gq = "Geschoss des Blattes";
    if (mehrere) {
      const zu = MP.geschossZuLage(titel, b.x_pt, b.y_pt);
      if (zu) {
        g = zu.kuerzel;
        gq = "nächstgelegene Geschossüberschrift „" + zu.titel + "“";
      }
    }
    raus.push({ nr: bi,
                /* Laufende Nummer je Blatt, damit der Raum im Raumbuch und
                   in der Rückfrage denselben Namen trägt und am Plan
                   wiederzufinden ist. */
                name: namenlos ? ("Raum " + ohneNamen) : b.name,
                name_fehlt: namenlos || undefined,
                A: b.A_m2, U: b.U_m,
                geschoss: geschossKanon(g), geschoss_quelle: gq, block: b });
  });
  return raus;
}

/** Die Lage eines Textblocks als Anteil der Blattkante.
 *
 *  Umgerechnet wird von MODUL_PDF, weil nur dort die Drehung des Blattes
 *  bekannt ist. Fehlt die Umrechnung — bei einer Bilddatei, oder nach dem
 *  Wiederherstellen einer Sicherung, wo die lebende Seite fehlt —, gibt es
 *  keine Lage. Das ist ein Ergebnis und kein Fehler: der Raum steht dann im
 *  Prüfblatt unter „ohne Ort im Plan" und wird dort gezählt. */
function lageAusBlock(seite, block) {
  if (!seite || !block || typeof seite.lageAnteil !== "function") return null;
  const a = seite.lageAnteil(block.x_pt, block.y_pt);
  if (!a) return null;
  return { x: a.x, y: a.y, art: "beschriftung",
           blatt: seite.bezeichnung || seite.name || null,
           quelle: "Ort des Flächenstempels „" + String(block.text || block.name)
             + "“ im Textstand der Zeichnung" };
}

/** Beschriftungen eines Blattes, die als Ort für einen ausgelesenen Raum in
 *  Frage kommen — mit ihrer Lage in Anteilen.
 *
 *  Zwei Quellen: die Flächenstempel (Name UND angeschriebene Fläche, damit
 *  lassen sich gleichnamige Räume auseinanderhalten) und alle übrigen
 *  Textstücke, die als Raumname durchgehen. Beides steht im Dokument; es wird
 *  nichts aus dem Bild geschätzt. */
function markenDesBlatts(seite) {
  if (!seite || typeof seite.lageAnteil !== "function") return [];
  const raus = [];
  const gesehen = [];
  (seite.raumbloecke || []).forEach(function (b) {
    if (!b || !b.name) return;
    const a = seite.lageAnteil(b.x_pt, b.y_pt);
    if (!a) return;
    gesehen.push(b.x_pt + ":" + b.y_pt);
    raus.push({ name: b.name, A_m2: b.A_m2, x: a.x, y: a.y,
      quelle: "Ort des Flächenstempels „" + String(b.text)
        + "“ im Textstand der Zeichnung" });
  });
  const K = window.MODUL_KI;
  (seite.textstuecke || []).forEach(function (s) {
    if (!s || !s.text) return;
    if (gesehen.indexOf(s.x_pt + ":" + s.y_pt) >= 0) return;
    if (!(K && K.istRaumname && K.istRaumname(s.text))) return;
    const a = seite.lageAnteil(s.x_pt, s.y_pt);
    if (!a) return;
    raus.push({ name: String(s.text).trim(), A_m2: null, x: a.x, y: a.y,
      quelle: "Ort der Beschriftung „" + String(s.text).trim()
        + "“ im Textstand der Zeichnung" });
  });
  return raus;
}

/* Eine Außenfläche liegt außerhalb der beheizten Hülle und ist kein Raum.
   Die Regel gilt für BEIDE Wege ins Raumbuch — Flächenstempel aus dem
   Textstand und Raumliste der Modell-Auslese. GEMESSEN in der Live-Abnahme
   am 24.08.2026 (Blattsatz Maas/Langner): "Terrasse" kam über die Auslese
   als beheizter Raum mit 0 m² und 20 °C ins Raumbuch, weil nur der
   Stempel-Weg die Regel kannte. */
const AUSSENFLAECHE =
  /^(terrasse|balkon|loggia|dachterrasse|stellplatz|hof|weg|freisitz)\b/i;

/** Alle Flächenstempel eines Blattes ins Raumbuch übernehmen.
 *
 *  Das ist der Weg für jede Vektorzeichnung mit angeschriebenen Flächen und
 *  kommt ohne Modellaufruf aus. Der Bearbeiter sieht danach dieselben Zahlen
 *  im Raumbuch, die im Plan stehen — nachprüfbar Zeile für Zeile. */
function raeumeAusStempelnUebernehmen(i) {
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  const seite = seiten[i];
  if (!seite) return 0;
  const liste = stempelraeumeDesBlatts(seite);
  if (!liste.length) return 0;
  const we = (App.p.einheiten[0] || {}).name || "";
  const marke = Date.now();
  /* WAS EIN FLÄCHENSTEMPEL IST UND TROTZDEM KEIN BEHEIZTER RAUM.
   *
   * GEMESSEN am echten Blattsatz „BA 01–08, Am Gunnebach 9" (24.08.2026,
   * Textstand der PDF, ohne Modell): das Erdgeschoss trägt neben elf
   * Wohnräumen die Stempel „Garage 38,23 m²" und „Terrasse 27,82 m²". Beide
   * landeten als BEHEIZTE Räume mit 20 °C im Raumbuch. Die Folgen waren zwei
   * Sperren auf einmal: „Als beheizt geführte Nebenräume" (rot, nur mit
   * schriftlicher Begründung) und „Flächensumme og" — das Erdgeschoss war um
   * 66 m² zu groß, weil Garage und Terrasse mitzählten, und das Obergeschoss
   * sah dagegen aus wie ein Geschoss mit fehlenden Räumen.
   *
   * Der Auftrag an das Modell sagt genau das seit jeher („Eine GARAGE, ein
   * Carport, ein Schuppen oder eine Scheune sind keine Raeume in diesem Sinn;
   * sie gehoeren nach unbeheizt_benannt"). Nur der örtliche Weg über den
   * Textstand kannte die Regel nicht. Jetzt kennt er sie:
   *
   *   - Ein unbeheizter Bereich (Garage, Carport, Scheune, Spitzboden …) wird
   *     als BENANNTER Bereich vermerkt. Daraus legt Z5 die Zone an, mit Lage
   *     nach DIN/TS 12831-1 Tabelle 5 — samt trennender Wand statt 20 °C.
   *   - Eine Außenfläche (Terrasse, Balkon, Loggia, Stellplatz) liegt
   *     ausserhalb der Hülle und wird nicht mitgeführt.
   *
   * Nichts wird dabei stillschweigend verschluckt: beides steht als Vermerk
   * in den offenen Fragen, mit Name und Fläche, und die Zone erscheint im
   * Kontrollblatt. Und die Prüfung „Als beheizt geführte Nebenräume" bleibt
   * unverändert scharf für alles, was auf anderem Weg ins Raumbuch kommt. */
  const KBX = window.MODUL_KONTROLLBLATT;
  const nichtRaum = [];
  const bleiben = liste.filter(function (x) {
    const n = String(x.name || "");
    if (AUSSENFLAECHE.test(n)) {
      nichtRaum.push({ name: n, A: x.A, art: "aussen" });
      return false;
    }
    /* Ein Einbauteil (Garderobe, Schrank, Nische) unterhalb der Schwelle ist
       Möblierung, kein Raum — seine Fläche steckt im Raum, in dem es steht.
       GEMELDET am Lauf „Hasenberg 10" (25.08.2026). Ein Stempel MIT
       nennenswerter Fläche (begehbare Garderobe) bleibt Raum; Erkennung und
       Schwelle stehen in MODUL_KI, derselben Stelle, die auch die
       Auslese-Zeilen filtert. */
    if (window.MODUL_KI && window.MODUL_KI.istEinbauteil
        && window.MODUL_KI.istEinbauteil(n)
        && !(Number(x.A) >= window.MODUL_KI.EINBAU_SCHWELLE_M2)) {
      nichtRaum.push({ name: n, A: x.A, art: "einbau" });
      return false;
    }
    if (KBX && KBX.artAusName && KBX.artAusName(n)
        /* „Keller" und „Kellergeschoss" sind Geschossnamen und stehen als
           eigene Grundrisse im Satz; nur was NICHT als eigenes Geschoss
           erfasst ist, gehört in eine Zone. Deshalb hier nur Bereiche, die
           neben dem Stapel liegen. */
        && ["garage", "nebenbau"].indexOf(KBX.artAusName(n)) >= 0) {
      nichtRaum.push({ name: n, A: x.A, art: "unbeheizt" });
      return false;
    }
    return true;
  });
  if (nichtRaum.length) {
    App.p.plangebaeude = App.p.plangebaeude || {};
    const ub = App.p.plangebaeude.unbeheizte_bereiche
      = App.p.plangebaeude.unbeheizte_bereiche || [];
    App.p.offeneFragen = App.p.offeneFragen || [];
    /* Woher der Name stammt, muss mitlaufen: der Flächenstempel ist eine
       eigene Lesung neben der Gebäudeauslese. Nur so kann die
       Zusammenführung zwei Lesungen derselben Garage von zwei Garagen
       unterscheiden. */
    App.p.stempelbereiche = App.p.stempelbereiche || [];
    nichtRaum.forEach(function (x) {
      if (x.art === "unbeheizt" && ub.indexOf(x.name) < 0) ub.push(x.name);
      if (x.art === "unbeheizt" && App.p.stempelbereiche.indexOf(x.name) < 0) {
        App.p.stempelbereiche.push(x.name);
      }
      const frage = "Der Flächenstempel „" + x.name + " "
        + Number(x.A).toFixed(2).replace(".", ",") + " m²" + "“ auf "
        + (seite.bezeichnung || seite.name || "einem Blatt")
        + " steht nicht als beheizter Raum im Raumbuch: "
        + (x.art === "aussen"
          ? "eine Außenfläche liegt ausserhalb der beheizten Hülle."
          : x.art === "einbau"
          ? "ein Einbauteil ist Möblierung, seine Fläche steckt im Raum, in "
            + "dem es steht (bei einer Garderobe im Regelfall dem Flur)."
          : "als unbeheizter Bereich wird er über eine eigene Zone geführt, "
            + "mit trennendem Bauteil statt voller Innentemperatur.");
      if (!App.p.offeneFragen.some(function (y) { return y.frage === frage; })) {
        App.p.offeneFragen.push({ thema: "Flächenstempel", art: "grenze",
          frage: frage,
          abhilfe: "Ist die Fläche doch beheizt, im Raumbuch von Hand anlegen." });
      }
    });
  }
  if (!bleiben.length && !nichtRaum.length) return 0;
  /* ERSETZEN, NICHT ADDIEREN.
   *
   * GEMESSEN in der Abnahme am 24.08.2026: die Analyse hatte die Räume schon
   * ins Raumbuch übernommen, der Knopf „25 Räume übernehmen" stand trotzdem
   * noch da — und legte dieselben Räume ein zweites Mal an. Aus 13 Räumen
   * wurden 39, aus 11,95 kW wurden 59,70. „Wer dem Knopf glaubt, bestellt
   * den doppelten Kessel."
   *
   * Die Gegenrichtung (erst Stempel, dann Auslese) prüft ihr Doppel seit
   * jeher in raeumeAusAusleseUebernehmen. Hier fehlte dieselbe Prüfung.
   * Jetzt gilt in beide Richtungen dasselbe: steht der Raum dieses Blattes
   * schon im Raumbuch — gleicher Name, gleiches Geschoss in kanonischer
   * Schreibweise —, wird er NICHT neu angelegt, sondern um das ergänzt, was
   * nur der Stempel weiß: die im Textstand angeschriebene Fläche (sie
   * schlägt jede abgelesene) und den Umfang. Jeder vorhandene Raum wird
   * dabei höchstens einmal verbraucht; bei sieben Fluren auf einem Blatt
   * ersetzt der siebte Stempel nicht siebenmal denselben Raum. */
  const nnS = function (t) {
    return String(t == null ? "" : t).toLowerCase().replace(/[\s\/,.;:-]+/g, "");
  };
  const blattName = seite.bezeichnung || seite.name;
  const nochFrei = App.p.raeume.filter(function (r) {
    return r.herkunft && r.herkunft.blatt === blattName;
  });
  let ersetzt = 0;
  bleiben.forEach(function (x) {
    const gk = x.geschoss || "";
    /* GLEICHNAMIGE RÄUME PAART DIE FLÄCHE, NICHT DIE REIHENFOLGE.
       Befund „Am Gunnebach 9" (25.08.2026): zwei Räume „Abstell" (5,37 und
       8,51 m²) — find() nahm den ERSTEN Namenstreffer, der Stempel 8,51
       überschrieb den 5,37er-Raum, und die Selbstprüfung meldete eine
       Flächenabweichung, die es im Plan nicht gibt. Dieselbe Regel wie in
       kern_lage: die angeschriebene Fläche hält gleichnamige Räume
       auseinander. Bei mehreren Kandidaten gewinnt der mit der kleinsten
       Flächendifferenz; bei einem bleibt alles wie es war. */
    const kandidaten = nochFrei.filter(function (r) {
      return nnS(r.name) === nnS(x.name)
        && (!r.geschoss || !gk || geschossKanon(r.geschoss) === gk);
    });
    const schonDa = kandidaten.length <= 1 ? kandidaten[0] :
      kandidaten.slice().sort(function (a, b) {
        const da = Number.isFinite(Number(a.A)) ? Math.abs(Number(a.A) - Number(x.A)) : 1e9;
        const db = Number.isFinite(Number(b.A)) ? Math.abs(Number(b.A) - Number(x.A)) : 1e9;
        return da - db;
      })[0];
    if (schonDa) {
      nochFrei.splice(nochFrei.indexOf(schonDa), 1);
      /* Die Fläche aus dem Textstand schlägt das Bild — dieselbe Regel wie
         in der Gegenrichtung. Das kanonische Geschoss wird nachgezogen,
         damit „og" aus einer früheren Lesung nicht als zweites Geschoss
         neben „OG" stehen bleibt. */
      schonDa.A = Number(x.A);
      if (x.U != null) schonDa.umfang_m = Number(x.U);
      if (gk) schonDa.geschoss = gk;
      if (!schonDa.lage) schonDa.lage = lageAusBlock(seite, x.block);
      schonDa.herkunft = Object.assign({}, schonDa.herkunft, {
        konfidenz: "sicher",
        flaeche_gelesen: true,
        flaeche_quelle: "im Plan angeschrieben, aus dem Textstand der "
          + "Zeichnung gelesen („" + x.block.text + "“)",
        umfang_m: x.U == null
          ? (schonDa.herkunft ? schonDa.herkunft.umfang_m : null)
          : Number(x.U),
        geschoss_quelle: x.geschoss_quelle,
      });
      ersetzt++;
      return;
    }
    const artZ = window.MODUL_KI && window.MODUL_KI.artZuordnung
      ? window.MODUL_KI.artZuordnung(x.name)
      : { art: "wohnen", erkannt: false };
    /* WO DER RAUM AUF DEM BLATT LIEGT — hier ohne jede Zuordnung.
       Diese Zeile stammt aus genau einem Textblock, und der Block hat
       Koordinaten. Der Raum bekommt die Lage seines eigenen Blocks. Über den
       Namen zu suchen waere hier nicht nur unnoetig, sondern schaedlich: auf
       „1.04 BA_2 Grundriss DG" heissen 64 Stempel unter anderem zwoelfmal
       SCHLAFEN und siebenmal FLUR, und die Namenssuche kam am 23.08.2026
       gemessen auf 7 von 64 Lagen. Unmittelbar zugewiesen sind es 64. */
    App.p.raeume.push({
      id: "r_st_" + i + "_" + x.nr + "_" + marke,
      lage: lageAusBlock(seite, x.block),
      geschoss: x.geschoss || "",
      name: x.name,
      /* Eine angeschriebene Flaeche, ueber der kein Raumname stand. Sie
         traegt eine laufende Nummer und wartet auf ihren Namen; die
         Auslese fuellt ihn unten ueber die Flaeche nach, und was danach
         noch offen ist, wird gefragt. */
      name_fehlt: x.name_fehlt || undefined,
      art: artZ.art,
      A: Number(x.A),
      h: null,
      breite_m: null, tiefe_m: null,
      /* DER UMFANG AUS DEM FLÄCHENSTEMPEL.
       * Viele CAD-Stempel setzen neben die Fläche den Umfang: „KELLER
       * 22,06 m² U=19,80 m". MODUL_PDF liest ihn seit jeher mit (U_m), und
       * bis zum 23.08.2026 landete er ausschliesslich in herkunft.umfang_m —
       * einem Feld, das nur das Kontrollblatt anschaute. Die Rechnung sah ihn
       * nie und näherte denselben Raum als Quadrat an, obwohl sein Umfang im
       * Plan stand. Breite und Tiefe bleiben hier weiter null, und das ist
       * richtig: ein Flächenstempel nennt sie nicht. Der Umfang tut es. */
      umfang_m: x.U == null ? null : Number(x.U),
      aussenwand_m: null, ecken: null,
      aussenwaende: null, fenster: null, fensterliste: [],
      we: we,
      bauteile: [],
      herkunft: {
        quelle: "Flächenstempel im Plan",
        blatt: seite.bezeichnung || seite.name,
        konfidenz: "sicher",
        flaeche_gelesen: true,
        flaeche_quelle: "im Plan angeschrieben, aus dem Textstand der Zeichnung "
          + "gelesen („" + x.block.text + "“)",
        umfang_m: x.U == null ? null : Number(x.U),
        geschoss_quelle: x.geschoss_quelle,
        art_gelesen: x.name,
        art_angenommen: !artZ.erkannt,
      },
    });
  });
  seite.stempelUebernommen = bleiben.length;
  hoehenUebernehmen();
  App.uebernahme = { neu: bleiben.length - ersetzt, ersetzt: ersetzt,
                     ohneFlaeche: 0, ausStempeln: true,
                     nicht_raum: nichtRaum.length };
  return bleiben.length;
}

/** Was das Modell an Flächen gelesen hat, gegen den Textstand halten.
 *
 *  Das Modell liest Zahlen aus einem Bild ab; der Textstand hat sie im
 *  Dokument. Stimmt ein Raumname genau einmal mit einem Flächenstempel
 *  überein, gilt der Stempel — und zwar auch dann, wenn das Modell gar keine
 *  Fläche gefunden hat. Bei mehreren gleichnamigen Räumen auf einem Blatt
 *  („Flur" dreimal) wird nichts zugeordnet: eine falsch zugeordnete Fläche
 *  ist schlimmer als keine. */
function flaecheAusStempel(seite, name) {
  const liste = stempelraeumeDesBlatts(seite);
  if (!liste.length) return null;
  const norm = function (t) {
    return String(t == null ? "" : t).toLowerCase().replace(/[\s\/,.;:-]+/g, "");
  };
  const n = norm(name);
  if (!n) return null;
  const treffer = liste.filter(function (x) { return norm(x.name) === n; });
  return treffer.length === 1 ? treffer[0] : null;
}

/** Überträgt die ausgelesenen Räume ins Raumbuch und stellt die Bezüge her:
 *  Geschoss je Blatt, Höhen aus dem Schnitt, Bauteile je Raum. Alles
 *  deterministisch über KERN_ZUORDNUNG; was sich nicht belegen lässt, wird
 *  nicht geraten, sondern als Frage im Kontrollblatt gesammelt. */
/** Führt die drei Antworten eines Blattes zu einer Auslese zusammen.
 *
 *  DAS SCHRIFTFELD DARF NICHT VERLORENGEHEN.
 *
 *  Der erste Durchgang ("raeume") liefert es mit: SCHEMA_RAEUME führt
 *  "objekt" in seiner Pflichtliste, und der Endpunkt gibt es zurück. Darin
 *  stehen Bauvorhaben, Straße, Postleitzahl, Ort, Bauherr, Projektnummer,
 *  Gebäudeart, BAUJAHR und Plandatum.
 *
 *  Zusammengesetzt wurde die Auslese aber allein aus der Antwort des dritten
 *  Durchgangs (k, Betriebsart "kunde"), und die kennt kein "objekt". Aus r
 *  kamen nur Raumliste und Grundriss-Kennzeichen mit. r.objekt fiel damit auf
 *  jedem Blatt und bei jedem Durchlauf ersatzlos weg — und
 *  raeumeAusAusleseUebernehmen() las anschließend `d.objekt`, bekam undefined
 *  und stieg wieder aus. Ein bezahlter Modellaufruf, dessen Ergebnis nirgends
 *  ankam.
 *
 *  WAS DAS KOSTETE, gemessen am Blatt „BV 2-0887 Ziolkowski": ohne Baujahr
 *  legt automatischErgaenzen() keine Bauteiltypen an, ohne Bauteiltypen
 *  steigt bauteileErgaenzen() in seiner ersten Zeile aus, ohne ein einziges
 *  Bauteil steht die Gebäudeheizlast auf 0,00 kW. Ohne Postleitzahl fehlt
 *  zusätzlich der Klimadatensatz.
 *
 *  Vorrang hat, was der dritte Durchgang gefunden hat; er sieht dasselbe
 *  Blatt mit mehr Zeit. Fehlt er oder das Feld, gilt r.objekt.
 *
 *  Steht hier als eigene Funktion, damit der Selbsttest sie aufrufen kann.
 *  Solange sie in der Schleife stand, war sie nicht prüfbar, und genau
 *  darin konnte sich der Verlust ein Jahr lang halten.
 *
 *  @param r  Antwort der Betriebsart "raeume"
 *  @param k  Antwort der Betriebsart "kunde", darf fehlen
 *  @param h  Antwort der Betriebsart "hoehen", darf fehlen
 */
function ausleseZusammenfuehren(r, k, h) {
  const rr = r || {};
  /* DAS SCHRIFTFELD WIRD FELDWEISE VEREINT, NICHT ALS GANZES ERSETZT.
   *
   * GEMESSEN am 24.08.2026 in zwei echten Durchlaeufen an "BV 2-0887
   * Ziolkowski": der erste Durchgang lieferte objekt.plandatum "17.05.2022"
   * (aus einer vollstaendig gelesenen Haelfte des Bogens). Der dritte
   * Durchgang kennt am heute verteilten Endpunkt gar kein "objekt" --
   * objektFuellen (modul_ki.js) normalisiert seine Antwort deshalb zu einem
   * Objekt aus lauter null-Feldern. Mit `(k && k.objekt) || rr.objekt` stand
   * dieses Leergeruest VOR dem echten Schriftfeld: das Plandatum fiel weg,
   * daraus wurde kein Baujahr, ohne Baujahr keine Bauteiltypen, und die
   * Heizlast fiel von 6,9 auf 2,5 kW -- mit roter Sperre statt gelbem Urteil.
   * Jetzt gilt je FELD: was der dritte Durchgang wirklich gelesen hat,
   * schlaegt den ersten; ein null-Feld und die Verlegenheitsantwort "unklar"
   * schlagen nichts. */
  const objektVereint = (function () {
    const ro = rr.objekt || null;
    const ko = (k && k.objekt) || null;
    if (!ko) return ro;
    if (!ro) return ko;
    const aus = Object.assign({}, ro);
    Object.keys(ko).forEach(function (f) {
      const w = ko[f];
      if (w === null || w === undefined) return;
      if (String(w).trim() === "") return;
      if (f === "planungsart" && String(w) === "unklar") return;
      aus[f] = w;
    });
    return aus;
  })();
  return Object.assign({}, k || {}, {
    objekt: objektVereint,
    raeume: rr.ist_grundriss === false ? [] : (rr.raeume || []),
    ist_grundriss: rr.ist_grundriss,
    hoehen: (h && h.hoehen) || [],
    /* Die Hoehenkoten des Schnitts. Sie sind der Beleg, mit dem
       KERN_ZUORDNUNG selbst entscheidet, ob ein gelesenes Mass die lichte
       Hoehe oder die Geschosshoehe ist, und mit dem es die Deckendicke
       ableitet, statt nach ihr zu fragen. Ohne diese beiden Zeilen bleiben
       sie in der Antwort des Endpunkts liegen und kommen nirgends an. */
    hoehenkoten: (h && h.hoehenkoten) || [],
    deckendicken: (h && h.deckendicken) || [],
    dachneigung_grad: h && h.dachneigung_grad,
    drempel_m: h && h.drempel_m,
  });
}

function raeumeAusAusleseUebernehmen() {
  const Z = window.KERN_ZUORDNUNG;
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  App.p.offeneFragen = App.p.offeneFragen || [];
  let neu = 0, ohneFlaeche = 0;

  /* EIN FELD IN DER FALSCHEN FORM DARF NICHT DEN GANZEN DURCHLAUF KOSTEN.
   *
   * Gemessen am 23.08.2026, echter Durchlauf mit „BV 2-0887 Ziolkowski"
   * gegen den laufenden Endpunkt: das Modell lieferte `befunde` einmal nicht
   * als Liste, sondern als Objekt. `(d.befunde || []).forEach` warf,
   * raeumeAusAusleseUebernehmen brach mitten im ersten Blatt ab — und damit
   * fielen Plandatum, Planungsart und alle Objektangaben weg. Ohne Plandatum
   * kein angenommenes Baujahr, ohne Baujahr keine U-Werte, ohne U-Werte
   * 0,00 kW. Ein Feld in der falschen Form kostete das ganze Ergebnis, und
   * zu sehen war davon nur ein Eintrag in der Browserkonsole.
   *
   * GEMESSEN wurde am selben Tag auch, WORAN es lag: die Antwort zu Blatt 1
   * war abgeschnitten (_abgeschnitten: Zeit, 27 s), und die Reparatur liess
   * `befunde` als rohen JSON-Text stehen statt als Liste. Genau dieser Text
   * wird hier noch gelesen; was sich nicht lesen laesst, wird verworfen und
   * nicht als Schein-Eintrag weitergereicht.
   *
   * Erfunden wird nichts: aus einem Text wird nur dann eine Liste, wenn er
   * sich als solche lesen laesst. Sonst bleibt sie leer. */
  const alsListe = function (x, tiefe) {
    if (x === null || x === undefined) return [];
    if (Array.isArray(x)) return x;
    if (typeof x === "string") {
      const t = x.trim();
      if (!t || (tiefe || 0) > 0) return [];
      if (t.charAt(0) !== "[" && t.charAt(0) !== "{") return [];
      try { return alsListe(JSON.parse(t), 1); } catch (e) { return []; }
    }
    if (typeof x === "object") return Object.keys(x).map(function (k) { return x[k]; });
    return [];
  };
  /* Eintraege, die Datensaetze sein muessen: eine Zeichenkette ist kein
     Befund und keine Luecke, sie hat weder Thema noch Herleitung. */
  const alsSaetze = function (x) {
    return alsListe(x).filter(function (y) {
      return y && typeof y === "object" && !Array.isArray(y);
    });
  };

  const gestolpert = [];
  seiten.forEach(function (seite, si) {
    const d = seite.auslese;
    if (!d || seite.uebernommen) return;
    /* Ein Blatt darf die anderen nicht mitreissen. Bis zum 23.08.2026 stand
       hier kein try: ein einziges Feld in unerwarteter Form beendete die
       Uebernahme fuer den ganzen Stapel, und zu sehen war davon nichts
       ausser einer Zeile in der Browserkonsole. */
    try {

    /* DER TEXTSTAND GEHT VOR, UND ZWAR FUER DAS GANZE BLATT.
     *
     * GEMESSEN am 24.08.2026 am Blatt "260514 - Dumach 1 - Grundrisse"
     * (Vektorzeichnung, 25 Flaechenstempel, 370,44 m²): die Auslese brachte
     * weniger Raeume mit vom Bild abgelesenen Flaechen ins Raumbuch, und im
     * Urteil stand eine Kachel "3 Geschosse · 14 Raeume", waehrend die
     * Stempelkarte eine Handbreit darunter "25 Raeume, zusammen 370,44 m²"
     * anbot. Zwei Zahlen ueber dasselbe Blatt, und die schlechtere stand
     * oben: der Vorrang des Textstands galt bisher nur je NAMENSGLEICHEM
     * Raum (flaecheAusStempel), nicht fuer Raeume, die das Modell gar nicht
     * gesehen hat.
     *
     * Deshalb werden die Flaechenstempel eines Blattes VOR der Auslese
     * uebernommen. Die Auslese ergaenzt danach, was nur sie kennt (Fenster,
     * Aussenwaende, lichte Hoehe, Raeume ohne Stempel) — dieser Weg existiert
     * unten seit dem 24.08. und wird hier nur endlich erreicht. Urteilskachel
     * und Stempelzeile speisen sich damit aus demselben Raumbuch. */
    if (!seite.stempelUebernommen && stempelraeumeDesBlatts(seite).length) {
      raeumeAusStempelnUebernehmen(si);
    }

    // Geschoss des Blattes bestimmen
    let g = { kuerzel: seite.geschoss || null, sicher: false, quelle: null };
    if (Z) {
      g = Z.geschossFuerBlatt({
        name: seite.bezeichnung || seite.name,
        ueberschrift: seite.ueberschrift,
        blattkopf: seite.blattkopf,
        raeume: alsListe(d.raeume),
      });
      seite.geschoss = g.kuerzel;
      seite.geschossQuelle = g.quelle;
      if (g.frage) App.p.offeneFragen.push({ thema: "Geschoss", blatt: seite.bezeichnung,
                                             frage: g.frage });
    }

    /* Die auf diesem Blatt neu angelegten Räume, für die Ortsbestimmung
       weiter unten. Über die Kennung zu suchen wäre möglich, aber brüchig;
       die Liste steht daneben und kann nicht danebengreifen. */
    const neueDesBlatts = [];

    alsListe(d.raeume).forEach(function (r, ri) {
      const wert = function (x) { return (x && typeof x === "object") ? x.wert : x; };
      /* Nicht jede Beschriftung auf einem Grundriss ist ein Raum. "RH 2,28"
         ist eine Rohbauhöhe, "M 1:100" ein Maßstabsvermerk. Beide wurden
         bisher zu Räumen mit 0 m² und 20 °C. Aussortiert wird nur, was sich
         als Vermaßung belegen lässt; alles andere bleibt drin. Und
         aussortiert heißt nicht verschwiegen: es steht als offene Frage im
         Kontrollblatt. */
      const bez = wert(r.bezeichnung);
      if (window.MODUL_KI.istRaumname && !window.MODUL_KI.istRaumname(bez)) {
        const text = "Auf \"" + (seite.bezeichnung || seite.name) + "\" wurde \""
          + String(bez == null ? "" : bez) + "\" als Raum gelesen. Das ist eine "
          + "Beschriftung und kein Raum; die Zeile wurde nicht ins Raumbuch "
          + "übernommen. Falls es doch ein Raum ist, bitte von Hand anlegen.";
        if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
          App.p.offeneFragen.push({ thema: "Beschriftung statt Raum",
                                    blatt: seite.bezeichnung, frage: text });
        }
        return;
      }
      /* Eine Außenfläche ist kein beheizter Raum — dieselbe Regel, die der
         Stempel-Weg seit dem 24.08. kennt, gilt auch für die Auslese. */
      if (AUSSENFLAECHE.test(String(bez == null ? "" : bez))) {
        const text = "Auf \"" + (seite.bezeichnung || seite.name) + "\" wurde \""
          + String(bez) + "\" als Raum gelesen. Eine Außenfläche liegt "
          + "außerhalb der beheizten Hülle und wurde nicht ins Raumbuch "
          + "übernommen. Ist die Fläche doch beheizt (Wintergarten), bitte "
          + "von Hand anlegen.";
        if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
          App.p.offeneFragen.push({ thema: "Außenfläche", art: "grenze",
                                    blatt: seite.bezeichnung, frage: text });
        }
        return;
      }
      /* EINE GARAGE IST KEIN WOHNRAUM — dieselbe Regel, die der Stempelweg
         seit dem 24.08. kennt, galt hier nicht: am Satz „Am Gunnebach 9"
         (25.08.2026) stand die Garage mit 38,23 m² als Wohnraum 20 °C im
         Raumbuch UND daneben als unbeheizte Zone. Nur Bereiche, die NEBEN
         dem Stapel liegen (Garage, Nebenbau) — „Keller" ist ein
         Geschossname und bleibt drin. Nicht verschwiegen: offene Frage und
         benannter Bereich, aus dem Z5 die Zone anlegt. */
      const KBA = window.MODUL_KONTROLLBLATT;
      const artU = KBA && KBA.artAusName ? KBA.artAusName(String(bez == null ? "" : bez)) : null;
      if (artU && ["garage", "nebenbau"].indexOf(artU) >= 0) {
        App.p.plangebaeude = App.p.plangebaeude || {};
        const ubL = App.p.plangebaeude.unbeheizte_bereiche
          = App.p.plangebaeude.unbeheizte_bereiche || [];
        if (ubL.indexOf(String(bez)) < 0) ubL.push(String(bez));
        const text = "Auf \"" + (seite.bezeichnung || seite.name) + "\" wurde \""
          + String(bez) + "\" als beheizter Raum gelesen. Ein solcher Bereich "
          + "wird als unbeheizte Zone geführt, mit trennendem Bauteil statt "
          + "voller Innentemperatur; er wurde nicht ins Raumbuch übernommen. "
          + "Ist er doch beheizt, bitte von Hand anlegen.";
        if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
          App.p.offeneFragen.push({ thema: "Unbeheizter Bereich", art: "grenze",
                                    blatt: seite.bezeichnung, frage: text });
        }
        return;
      }
      /* EIN EINBAUTEIL IST KEIN RAUM. GEMELDET am echten Lauf „Hasenberg 10"
         (25.08.2026): „EG Garderobe/Schrank" und „EG Garderobe" standen als
         Räume ohne Fläche im Raumbuch und lösten die Sperre „Raumfläche
         fehlt" aus. Eine Garderobe, ein Einbauschrank, eine Nische ist
         Möblierung des Raums, in dem sie steht — bei Garderoben im Regelfall
         des Flurs; ihre Grundfläche steckt in dessen Fläche, dem Raumbuch
         fehlt dadurch nichts. Entschieden wird über die Fläche (Erkennung
         und Schwelle in MODUL_KI begründet): ein Etikett MIT nennenswerter
         eigener Fläche — etwa eine begehbare Garderobe mit 4 m² — bleibt ein
         Raum und läuft hier unverändert weiter. Gesucht wird die Fläche auf
         denselben drei Wegen wie unten bei der Übernahme: gelesene Zahl,
         Flächenstempel des Blattes, Breite mal Tiefe. */
      if (window.MODUL_KI.istEinbauteil && window.MODUL_KI.istEinbauteil(bez)) {
        const aE = (function () {
          const a = wert(r.flaeche_m2);
          if (a != null) return Number(a);
          const st = flaecheAusStempel(seite, bez);
          if (st) return Number(st.A);
          const b = Number(wert(r.breite_m)), t = Number(wert(r.tiefe_m));
          if (b > 0.8 && b < 30 && t > 0.8 && t < 30) return b * t;
          return null;
        })();
        if (!(aE >= window.MODUL_KI.EINBAU_SCHWELLE_M2)) {
          const text = "Auf \"" + (seite.bezeichnung || seite.name) + "\" wurde \""
            + String(bez) + "\" gelesen. Das ist ein Einbauteil und kein Raum; "
            + "seine Fläche steckt im Raum, in dem es steht (bei einer "
            + "Garderobe im Regelfall der Flur). Es wurde nicht ins Raumbuch "
            + "übernommen. Ist es doch ein eigener Raum (begehbar, mit "
            + "eigener Tür), bitte von Hand anlegen.";
          if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
            App.p.offeneFragen.push({ thema: "Einbauteil", art: "grenze",
                                      blatt: seite.bezeichnung, frage: text });
          }
          return;
        }
      }
      /* Steht der Raum schon aus dem Flaechenstempel im Raumbuch, darf ihn
         die Auslese nicht ein zweites Mal anlegen. Der Fall tritt ein, sobald
         jemand erst die angeschriebenen Flaechen uebernimmt und danach doch
         noch auslesen laesst -- beides ist erlaubt und sinnvoll, das Doppelte
         nicht. Raeume, die nur das Modell kennt (im Plan ohne Flaechenstempel,
         etwa "Ankleide"), kommen weiterhin dazu. */
      if (seite.stempelUebernommen) {
        const nn = function (t) {
          return String(t == null ? "" : t).toLowerCase().replace(/[\s\/,.;:-]+/g, "");
        };
        const blatt = seite.bezeichnung || seite.name;
        const schon = App.p.raeume.find(function (x) {
          return x.herkunft && x.herkunft.quelle === "Flächenstempel im Plan"
            && x.herkunft.blatt === blatt && nn(x.name) === nn(bez);
        });
        if (schon) {
          /* Nicht nur überspringen, sondern ergänzen.
           *
           * Der Flächenstempel liefert Name, Fläche und Geschoss — mehr steht
           * nicht darin. Fensterzahl, Zahl der Außenwände und die lichte Höhe
           * kann nur die Auslese lesen. Wer den Raum hier bloß übergeht,
           * wirft genau die Angaben weg, für die der Modellaufruf bezahlt
           * wurde: der Raum behielt keine Fensterzahl, und an ihre Stelle trat
           * die Annahme aus der Grundfläche. Die Fläche selbst bleibt
           * unangetastet, der Textstand des Plans schlägt das Bild. */
          const uebernehmen = function (feld, wert) {
            const v = wert;
            if (v == null || v === "") return false;
            if (schon[feld] != null && schon[feld] !== "") return false;
            schon[feld] = v;
            return true;
          };
          let ergaenzt = [];
          if (uebernehmen("fenster", r.fenster == null ? null : Number(r.fenster))) {
            ergaenzt.push("Fensterzahl");
          }
          if (uebernehmen("aussenwaende",
              r.aussenwaende == null ? null : Number(r.aussenwaende))) {
            ergaenzt.push("Zahl der Außenwände");
          }
          if (Array.isArray(r.fensterliste) && r.fensterliste.length
              && !(schon.fensterliste || []).length) {
            schon.fensterliste = r.fensterliste;
            ergaenzt.push("Fensterliste");
          }
          const hL = wert(r.lichte_hoehe_m);
          if (hL != null && !(schon.herkunft && schon.herkunft.hoehe_quelle
              === "im Plan angeschrieben")) {
            schon.h = Number(hL);
            schon.herkunft = schon.herkunft || {};
            schon.herkunft.hoehe_quelle = "im Plan angeschrieben";
            schon.herkunft.hoehe_angenommen = false;
            ergaenzt.push("lichte Höhe");
          }
          if (ergaenzt.length) {
            schon.herkunft = schon.herkunft || {};
            schon.herkunft.ergaenzt_aus_auslese = ergaenzt.join(", ");
          }
          /* Weicht die abgelesene Fläche vom Textstand ab, gilt der Plan --
             aber gesagt werden muss es. Sonst steht im Raumbuch eine Zahl,
             die das Modell an derselben Stelle anders gesehen hat. */
          const aM = wert(r.flaeche_m2);
          if (aM != null && schon.A > 0
              && Math.abs(Number(aM) - schon.A) > 0.02 * schon.A) {
            const fr = "Für \"" + String(bez) + "\" hat die Auslese "
              + Number(aM).toLocaleString("de-DE") + " m² gelesen, im Plan steht "
              + schon.A.toLocaleString("de-DE") + " m². Es gilt die Zahl aus dem "
              + "Plan; die Abweichung ist am Blatt zu klären.";
            if (!App.p.offeneFragen.some(function (x) { return x.frage === fr; })) {
              App.p.offeneFragen.push({ thema: "Fläche",
                blatt: seite.bezeichnung, frage: fr });
            }
          }
          return;
        }
      }
      let flaeche = wert(r.flaeche_m2);
      /* Fläche aus Breite mal Tiefe.
       *
       * Sehr viele Grundrisse schreiben in jeden Raum sein Maß, "3,79 m x
       * 4,53 m", aber keine Quadratmeterzahl. Beide Maße wurden von der
       * Auslese schon gelesen und in breite_m und tiefe_m abgelegt -- und
       * dort blieben sie liegen. Der Raum ging mit A = 0 ins Raumbuch, und
       * damit ohne Volumen und ohne Lüftungsheizlast.
       *
       * Das Produkt ist die Rechteckfläche. Bei einem L-förmigen Raum liegt
       * sie zu hoch; deshalb ist sie als abgeleitet gekennzeichnet, trägt
       * ihre Herleitung im Raumbuch und ist überschreibbar. Sie wird nur
       * angesetzt, wenn keine angeschriebene Fläche vorliegt -- eine im Plan
       * stehende Zahl ist immer die bessere Angabe.
       *
       * Die Schranken halten Ablesefehler heraus: unter 0,8 m oder über 30 m
       * Kantenlänge ist keine Raumseite, sondern eine verwechselte Maßkette. */
      let flaecheQuelle = flaeche != null ? "im Plan angeschrieben" : null;
      /* Vorrang fuer den Textstand.
         Das Modell liest die Flaeche aus einem BILD ab, MODUL_PDF hat sie aus
         dem DOKUMENT. Traegt das Blatt genau einen Flaechenstempel mit diesem
         Raumnamen, gilt dessen Zahl -- auch dann, wenn das Modell gar keine
         gefunden hat. Genau das war der haeufigste Grund fuer A = 0. */
      const stempel = flaecheAusStempel(seite, bez);
      /* Der Umfang aus dem Flaechenstempel. Er steht im Textstand des
         Dokuments und ist damit die bessere Quelle als alles, was ein Modell
         aus einem Bild abliest -- genau wie die Flaeche eine Zeile weiter. */
      let umfangStempel = null;
      if (stempel && Number(stempel.U) > 0) umfangStempel = Number(stempel.U);
      if (stempel) {
        const alt_A = flaeche == null ? null : Number(flaeche);
        if (alt_A !== null && Math.abs(alt_A - stempel.A) > 0.02 * stempel.A) {
          App.p.offeneFragen.push({ thema: "Fläche", blatt: seite.bezeichnung,
            frage: "Für \"" + String(bez) + "\" hat die Auslese "
              + alt_A.toLocaleString("de-DE") + " m² geliefert, im Plan steht \""
              + stempel.block.text + "\". Übernommen wurde die Zahl aus dem Plan." });
        }
        flaeche = stempel.A;
        flaecheQuelle = "im Plan angeschrieben, aus dem Textstand der Zeichnung "
          + "gelesen (\u201E" + stempel.block.text + "\u201C)";
      }
      const bm = Number(wert(r.breite_m)), tm = Number(wert(r.tiefe_m));
      if (flaeche == null && bm > 0.8 && bm < 30 && tm > 0.8 && tm < 30) {
        flaeche = Math.round(bm * tm * 100) / 100;
        flaecheQuelle = "aus dem angeschriebenen Maß " + bm.toLocaleString("de-DE")
          + " m mal " + tm.toLocaleString("de-DE") + " m gerechnet";
      }
      if (flaeche == null) ohneFlaeche++;
      /* Die Raumart entscheidet ueber die Raumtemperatur und damit unmittelbar
         ueber die Heizlast. Wurde die gelesene Bezeichnung keinem Muster
         zugeordnet, gilt der Rueckfall "wohnen" mit 20 Grad — das ist die
         sichere Seite, aber eine Annahme, und sie steht als solche in der
         Herkunft, damit sie im Kontrollblatt auffaellt. */
      const artZ = window.MODUL_KI.artZuordnung
        ? window.MODUL_KI.artZuordnung(r.raumart)
        : { art: window.MODUL_KI.artZuordnen(r.raumart), erkannt: true };
      const neuerRaum = {
        id: "r_pl_" + si + "_" + ri + "_" + Date.now(),
        geschoss: r.geschoss || g.kuerzel || "",
        name: r.bezeichnung || "Raum",
        art: artZ.art,
        A: flaeche == null ? 0 : Number(flaeche),
        h: wert(r.lichte_hoehe_m) == null ? null : Number(wert(r.lichte_hoehe_m)),
        breite_m: wert(r.breite_m) || null,
        tiefe_m: wert(r.tiefe_m) || null,
        /* Umfang, Aussenwandlaenge und Eckenzahl aus der Auslese. Sie sind
           der Weg aus dem groessten systematischen Fehler dieses Werkzeugs:
           ohne sie wird ein Raum als Quadrat gerechnet, und das Quadrat hat
           unter allen Rechtecken gleicher Flaeche den kleinsten Umfang. Ein
           Umfang aus dem Textstand des Blattes (Flaechenstempel) ist die
           bessere Quelle und ueberschreibt den gelesenen weiter unten. */
        umfang_m: umfangStempel || wert(r.umfang_m) || null,
        aussenwand_m: wert(r.aussenwand_m) || null,
        aussenwand_quelle: r.aussenwand_quelle || null,
        ecken: r.ecken == null ? null : Number(r.ecken),
        aussenwaende: r.aussenwaende == null ? null : Number(r.aussenwaende),
        fenster: r.fenster == null ? null : Number(r.fenster),
        /* Einzelne Fenster aus dem Plan: Lage, abgelesene Breite, Fenstertür.
           Daraus macht KERN_FENSTER die Fensterfläche mit Bandbreite. Ältere
           Auslesen kennen das Feld nicht; dann bleibt die Liste leer und der
           Rückfall über die Raumart greift. */
        fensterliste: Array.isArray(r.fensterliste) ? r.fensterliste : [],
        we: (App.p.einheiten[0] || {}).name || "",
        bauteile: [],
        herkunft: {
          quelle: "Planauslese", blatt: seite.bezeichnung || seite.name,
          konfidenz: r.konfidenz || "unsicher",
          /* Der Konsens zweier Lesungen: ein Raum, den nur EINE Lesung hat
             (abgeschnittene Erstlesung, Felderlesung oder gezielte
             Nachlesung), traegt das hier sichtbar -- der Kollege sieht im
             Raumbuch, welche Zeile auf einer einzigen Lesung steht. */
          aus_einer_lesung: !!(r.konsens && r.konsens.lesungen === 1),
          lesung_quelle: (r.konsens && r.konsens.quelle) || null,
          flaeche_gelesen: flaeche != null,
          flaeche_quelle: flaecheQuelle,
          geschoss_quelle: g.quelle,
          art_gelesen: r.raumart || null,
          art_angenommen: !artZ.erkannt,
          /* Eine im Plan angeschriebene lichte Höhe MUSS als solche vermerkt
             sein. hoehenUebernehmen() überschreibt sonst jede Raumhöhe mit
             dem Geschosswert und, wenn kein Schnitt vorliegt, mit dem
             Rückfall 2,60 m. GEMESSEN: die Auslese las 2,45 m, im Raumbuch
             standen danach 2,60 m — eine gelesene Zahl war durch eine
             Annahme ersetzt, ohne dass es irgendwo auffiel. */
          hoehe_quelle: wert(r.lichte_hoehe_m) == null
            ? null : "im Plan angeschrieben",
          hoehe_angenommen: wert(r.lichte_hoehe_m) == null,
        },
      };
      /* EINE NAMENLOSE FLAECHE UND EIN GELESENER RAUM SIND DERSELBE RAUM.
         Der Stempelweg legt eine angeschriebene Flaeche ohne Namen als
         "Raum N" an (stempelraeumeDesBlatts). Die Auslese liest denselben
         Raum mit Namen. Ueber den NAMEN finden sie nicht zueinander, und
         beide landeten im Raumbuch: GEMESSEN am 27.08.2026 an
         "Hasenberg_10_Grundrisse_290425.pdf" 21 Raeume mit 316,24 m2
         statt 20 mit 280,76 -- die 35,48 m2 des einen namenlosen Raums
         doppelt.
         Zusammengefuehrt wird deshalb ueber die FLAECHE im selben Geschoss:
         sie ist angeschrieben und damit die verlaesslichste Groesse, die
         beide Wege teilen. Der Platzhalter behaelt seine gelesene Flaeche
         und bekommt den Namen; die Auslese steuert bei, was nur sie hat.
         Die Schranke ist eng (5 cm2 oder 0,5 Prozent): zwei verschiedene
         Raeume mit auf den Quadratzentimeter gleicher Flaeche im selben
         Geschoss gibt es praktisch nicht, eine gerundete Anzeige dagegen
         schon. */
      const platzhalter = (flaeche != null) ? App.p.raeume.filter(function (q) {
        if (!q.name_fehlt) return false;
        if (!q.herkunft || q.herkunft.blatt !== (seite.bezeichnung || seite.name)) return false;
        const qg = geschossKanon(q.geschoss || ""), ng = geschossKanon(neuerRaum.geschoss || "");
        if (qg && ng && qg !== ng) return false;
        const d = Math.abs(Number(q.A) - Number(flaeche));
        return d <= Math.max(0.005, 0.005 * Number(flaeche));
      })[0] : null;
      if (platzhalter) {
        platzhalter.name = neuerRaum.name;
        delete platzhalter.name_fehlt;
        platzhalter.art = neuerRaum.art;
        /* Die Flaeche NICHT ersetzen: die angeschriebene schlaegt die
           abgelesene, das ist die Regel des Hauses. Alles andere, was nur
           die Auslese kennt, kommt hinzu, sofern der Stempel dort nichts
           hatte. */
        ["h", "breite_m", "tiefe_m", "aussenwand_m", "aussenwand_quelle",
         "ecken", "aussenwaende", "fenster"].forEach(function (f) {
          if (platzhalter[f] == null && neuerRaum[f] != null) platzhalter[f] = neuerRaum[f];
        });
        if (platzhalter.umfang_m == null && neuerRaum.umfang_m != null) {
          platzhalter.umfang_m = neuerRaum.umfang_m;
        }
        if (!(platzhalter.fensterliste || []).length
            && (neuerRaum.fensterliste || []).length) {
          platzhalter.fensterliste = neuerRaum.fensterliste;
        }
        platzhalter.herkunft = Object.assign({}, platzhalter.herkunft, {
          name_quelle: "aus der Planauslese nachgetragen; im Textstand stand "
            + "über dieser Fläche kein Raumname",
        });
        neueDesBlatts.push(platzhalter);
        return;
      }
      App.p.raeume.push(neuerRaum);
      neueDesBlatts.push(neuerRaum);
      neu++;
    });

    /* WO DIESE RÄUME AUF DEM BLATT LIEGEN.
     *
     * Das Modell liest aus einem BILD und gibt keine Koordinaten zurück; sein
     * Antwortschema kennt kein Lagefeld. Der Ort kann deshalb nur aus dem
     * DOKUMENT kommen: steht der gelesene Name im Textstand, ist die Lage
     * jenes Textstücks die Lage des Raumes. Bei einem reinen Scan gibt es
     * keinen Textstand und damit keine Lage — dann steht der Raum im
     * Prüfblatt unter „ohne Ort im Plan", gezählt und benannt.
     *
     * KERN_LAGE setzt keine Marke, die es nicht belegen kann: ein Name, der
     * zweimal dasteht, bekommt nur über seine angeschriebene Fläche eine
     * Zuordnung, sonst keine. Eine falsch gesetzte Marke führt den Bearbeiter
     * an die falsche Stelle des Plans, und dort hakt er einen Raum ab, den er
     * nicht angesehen hat. */
    const L = window.KERN_LAGE;
    if (L && neueDesBlatts.length) {
      const marken = markenDesBlatts(seite);
      if (marken.length) {
        const gefunden = L.lagen({ raeume: neueDesBlatts, marken: marken,
          blatt: seite.bezeichnung || seite.name });
        const nach = {};
        neueDesBlatts.forEach(function (x) { nach[x.id] = x; });
        gefunden.forEach(function (g) {
          if (nach[g.raum_id]) nach[g.raum_id].lage = g.lage;
        });
      }
    }

    // Höhen aus einem Schnitt merken
    if (alsListe(d.hoehen).length) {
      App.p.schnitthoehen = (App.p.schnitthoehen || []).concat(alsListe(d.hoehen));
    }
    if (alsListe(d.hoehenkoten).length) {
      App.p.schnittkoten = (App.p.schnittkoten || []).concat(alsListe(d.hoehenkoten));
    }
    if (!App.p.planbefunde) App.p.planbefunde = [];
    alsSaetze(d.befunde).forEach(function (b) { App.p.planbefunde.push(b); });
    if (alsSaetze(d.luecken).length) {
      App.p.planluecken = (App.p.planluecken || []).concat(alsSaetze(d.luecken));
    }
    if (d.gebaeude && !App.p.plangebaeude) App.p.plangebaeude = d.gebaeude;
    /* Objektangaben aus dem Schriftfeld, wie sie das Modell gelesen hat.
       Bei einer Vektorzeichnung standen sie meist schon beim Ablegen fest
       (MODUL_PDF.objektangabenLesen); bei einem Scan ist das hier die einzige
       Quelle. Gefuellt wird nur, was noch leer ist. */
    objektangabenUebernehmen(d.objekt, seite.bezeichnung || seite.name,
      (seite.gegenprobe && seite.gegenprobe.blattart)
        || (seite.blattkopf && seite.blattkopf.blattart));
    seite.uebernommen = true;
    } catch (x) {
      gestolpert.push({ blatt: seite.bezeichnung || seite.name,
                        grund: String((x && x.message) || x) });
    }
  });
  /* Was gestolpert ist, steht IN DER SEITE und nicht nur in der Konsole. */
  if (gestolpert.length) {
    App.ausleseBericht = App.ausleseBericht || { zeit: Date.now(), blaetter: [], fehler: [] };
    App.ausleseBericht.fehler = (App.ausleseBericht.fehler || []).concat(
      gestolpert.map(function (x) {
        return { blatt: "Übernahme unvollständig: " + x.blatt,
          text: "Die Antwort der Auslese hatte an einer Stelle eine unerwartete "
            + "Form (" + x.grund + "). Was bis dahin gelesen war, ist übernommen; "
            + "der Rest dieses Blattes fehlt. Bitte das Blatt noch einmal auslesen "
            + "lassen und, wenn es sich wiederholt, Sebastian Hund melden." };
      }));
  }

  hoehenUebernehmen();
  /* Abschliessend noch einmal ueber ALLE Blaetter gehen. Beim Ablegen wird
     jedes Blatt einzeln ausgewertet, aber ein Blatt, das damals nichts
     hergab, kann nach der Auslese Angaben tragen -- und ein Satz aus
     Grundriss, Schnitt und Ansicht traegt zusammen mehr als jedes Blatt fuer
     sich. Der Sammellauf fuellt nur leere Felder und ist damit beliebig oft
     wiederholbar. */
  objektangabenAusPlaenenSammeln();
  if (neu) App.uebernahme = { neu: neu, ohneFlaeche: ohneFlaeche };
}

/** Verteilt die im Schnitt gelesenen Höhen auf die Geschosse des Raumbuchs. */
function hoehenUebernehmen() {
  const Z = window.KERN_ZUORDNUNG;
  if (!Z) return;
  /* Auch ohne Schnitt weitermachen: dann greift der Rückfallwert. Die frühere
     Abkürzung hier war der Grund, warum Räume ohne Schnitt gar keine Höhe
     bekamen und damit kein Ergebnis entstand. */
  const geschosse = [];
  App.p.raeume.forEach(function (r) {
    if (r.geschoss && geschosse.indexOf(r.geschoss) < 0) geschosse.push(r.geschoss);
  });
  if (!geschosse.length) return;
  const erg = (App.p.schnitthoehen || []).length
    ? Z.hoehenZuordnen(App.p.schnitthoehen, geschosse,
        App.p.meta && App.p.meta.deckendicke, App.p.schnittkoten || [])
    : { zuordnung: {}, fragen: [] };
  /* Was beim Zuordnen aufgefallen ist, gehört ins KONTROLLBLATT.
     Nicht nach p.planbefunde: dorthin schreiben app.js und modul_ki.js zwar
     seit langem, aber gelesen wird die Liste von niemandem — weder vom
     Kontrollblatt noch vom Bericht. Gelesen wird p.offeneFragen
     (zaehlerOffeneFragen). Also geht es dorthin.
       „richtiggestellt" und „verworfen" sind Feststellungen und keine Fragen:
     sie stehen als art "grenze" und damit als Hinweis, der nicht sperrt, aber
     im Bericht auftaucht. Ein „widerspruch" bleibt eine offene Zeile und
     sperrt, denn dann ist der Plan mit sich uneins und das muss jemand
     entscheiden. */
  App.p.hoehenbefunde = erg.befunde || [];
  App.p.deckendickeAbgeleitet = erg.deckendicke_abgeleitet || {};
  App.p.offeneFragen = App.p.offeneFragen || [];
  (erg.befunde || []).forEach(function (b) {
    if (App.p.offeneFragen.some(function (x) { return x.frage === b.aussage; })) return;
    App.p.offeneFragen.push({
      thema: (b.thema || "Raumhöhe") + (b.geschoss ? " · " + b.geschoss : ""),
      frage: b.aussage,
      art: b.art === "widerspruch" ? "widerspruch" : "grenze",
      abhilfe: b.art === "widerspruch"
        ? "Die lichte Höhe dieses Geschosses am Schnitt nachmessen und unter "
          + "den Eckdaten je Geschoss eintragen."
        : null,
    });
  });
  /* Ergänzen, was der Schnitt nicht hergibt: eigene Eingabe je Geschoss hat
     Vorrang, sonst der Rückfallwert. So entsteht immer ein Ergebnis, und die
     Annahme steht sichtbar daneben. */
  const voll = Z.hoehenErgaenzen(erg.zuordnung, geschosse, App.p.geschosshoehen || {});
  App.p.hoehenStand = voll;
  /* DIE HÖHE GEGEN DEN SCHNITT HALTEN.
   *
   * Sie geht linear in das Luftvolumen und in jede Wandfläche ein und war
   * bis hierher die einzige tragende Zahl ohne Gegenprobe. GEMESSEN am
   * 23.08.2026 an „BV 2-0887 Ziolkowski": jede Höhe einen halben Meter
   * kleiner ergab 5,677 kW statt 6,564 kW — und ein Kontrollblatt, das mit
   * dem sauberen Lauf zeichengleich war. Die Probe rechnet ausschließlich
   * mit den Höhenkoten desselben Schnitts; sie braucht kein Baujahr und
   * keinen Erfahrungswert. Ihr Ergebnis geht denselben Weg wie die übrigen
   * Höhenbefunde: in die offenen Fragen und damit in Ampel und Bericht. */
  const gp = Z.hoehenGegenprobe
    ? Z.hoehenGegenprobe(voll.zuordnung, App.p.schnittkoten || [], geschosse)
    : { befunde: [], moeglich: false };
  App.p.hoehenprobe = gp;
  (gp.befunde || []).forEach(function (b) {
    if (App.p.offeneFragen.some(function (x) { return x.frage === b.aussage; })) return;
    App.p.offeneFragen.push({
      thema: (b.thema || "Raumhöhe") + (b.geschoss ? " · " + b.geschoss : ""),
      frage: b.aussage,
      /* „unmoeglich" und „widerspruch" sind keine Fragen: der Plan ist mit
         sich uneins, und niemand kann das am Bildschirm entscheiden. Sie
         gehen als Widerspruch hinaus und sperren damit den Bericht. Vorher
         standen sie als gewöhnliche offene Zeile da — abhakbar, den Kopf
         nicht verändernd. GEMESSEN am 23.08.2026 im Browser: alle Höhen
         0,50 m kleiner, vier Befunde in der Liste, Kopf „0 Fehler". */
      art: (b.art === "widerspruch" || b.art === "unmoeglich")
        ? "widerspruch" : undefined,
      abhilfe: b.abhilfe || null,
    });
  });
  App.p.raeume.forEach(function (r) {
    const h = voll.zuordnung[r.geschoss];
    if (!h || !(h.lichte_hoehe > 0)) return;
    /* Rangfolge der Raumhöhe, von oben:
         1. was der Bearbeiter selbst je Geschoss eingetragen hat,
         2. eine im Plan angeschriebene Höhe dieses Raums,
         3. die Höhe aus dem Schnitt,
         4. der Rückfallwert 2,60 m.
       Vorher galt nur „gelesen bleibt stehen" gegen „alles andere wird
       überschrieben" — und weil der Rückfall zu „allem anderen" gehörte, hat
       er eine gelesene Höhe von 2,45 m durch eine Annahme ersetzt. Umgekehrt
       muss eine ausdrückliche Eingabe des Bearbeiters durchschlagen: sie ist
       das jüngere und bewusstere Urteil. */
    const gelesen = r.herkunft && r.herkunft.hoehe_quelle === "im Plan angeschrieben";
    const vomBearbeiter = h.quelle === "vom Bearbeiter eingetragen";
    if (!gelesen || vomBearbeiter) {
      /* Erst die Außenwandflächen der neuen Höhe nachführen, dann die Höhe
         setzen. Ohne das wirkte eine nachträglich berichtigte Geschosshöhe
         nur auf Volumen und Lüftungsanteil; die Transmission über die
         Außenwände rechnete mit der alten Fläche weiter — am Fall Ziolkowski
         rund 62 Prozent der Heizlast. Von Hand geänderte Flächen bleiben
         stehen (wandflaechenAnHoeheAnpassen, nurAutomatische). */
      wandflaechenAnHoeheAnpassen(r, num(r.h, 0), h.lichte_hoehe, true);
      r.h = h.lichte_hoehe;
      if (!r.herkunft) r.herkunft = {};
      r.herkunft.hoehe_quelle = h.quelle;
      r.herkunft.hoehe_angenommen = !!h.angenommen;
      return;
    }
    /* DIESELBE FALLE, EINE EBENE TIEFER.
       Auch die Betriebsart „raeume" liefert je Raum eine lichte Höhe, und auch
       sie kann eine Türhöhe erwischt haben. Eine so gelesene Höhe bleibt
       stehen — sie ist die genauere Angabe, wenn sie stimmt. Weicht sie aber
       von der im Schnitt BELEGTEN Höhe des Geschosses um mehr als fünf
       Zentimeter ab, sagt das Werkzeug es, statt sie stillschweigend zu
       verwenden. Unter 2,30 m ist es kein Aufenthaltsraummaß mehr, und dann
       steht es ausdrücklich daneben. */
    if (!h.angenommen && Math.abs((r.h || 0) - h.lichte_hoehe) > 0.05) {
      const text = "Für „" + (r.name || "Raum") + "“ (" + r.geschoss + ") steht im "
        + "Grundriss die lichte Höhe " + (r.h || 0).toLocaleString("de-DE")
        + " m, der Schnitt belegt für dieses Geschoss "
        + h.lichte_hoehe.toLocaleString("de-DE") + " m."
        + ((r.h || 0) < 2.30
           ? " Unter 2,30 m ist das keine Aufenthaltsraumhöhe; meist ist eine "
             + "Tür- oder Fensteröffnung mitgelesen worden."
           : "")
        + " Gerechnet wird mit der Höhe aus dem Grundriss.";
      App.p.offeneFragen = App.p.offeneFragen || [];
      if (!App.p.offeneFragen.some(function (x) { return x.frage === text; })) {
        App.p.offeneFragen.push({ thema: "Raumhöhe · " + r.geschoss, frage: text,
          abhilfe: "Am Schnitt nachsehen, welche der beiden Höhen für diesen Raum "
            + "gilt, und die Raumhöhe im Raumbuch berichtigen." });
      }
    }
  });
  /* Die Fragen kommen bereits als Objekt mit Thema und Feld. Doppelte
     vermeiden: sonst sammelt sich bei jedem Durchlauf dieselbe Zeile an. */
  const vorhanden = {};
  (App.p.offeneFragen || []).forEach(function (x) { vorhanden[x.frage] = true; });
  App.p.offeneFragen = (App.p.offeneFragen || []).concat(
    (erg.fragen || []).filter(function (x) { return !vorhanden[x.frage]; }));
  hoehenannahmeFuehren(voll, geschosse);
}

/* --------------------------------------------------------------------------
 * Eine angenommene Höhe ist eine Annahme wie jede andere
 * --------------------------------------------------------------------------
 * Sie stand bisher nicht in p.annahmen. Dort standen Baujahr und Klima, und
 * nur was dort steht, taucht in der Annahmenkarte auf, in der Leiste unter
 * der großen Zahl, in der Prüfung („Angenommener Wert") und im Bericht.
 * GEMESSEN am 23.08.2026: das Kellergeschoss rechnete mit dem Ersatzwert
 * 2,60 m, und im Kopf des Werkzeugs stand als Annahme allein das Baujahr.
 * Die Höhe geht linear in das Luftvolumen und in jede Wandfläche ein — sie
 * ist die wirksamste aller angenommenen Zahlen und war die einzige unsichtbare.
 * ----------------------------------------------------------------------- */
function hoehenannahmeFuehren(voll, geschosse) {
  const p = App.p;
  if (!p.annahmen) p.annahmen = {};
  const offen = (voll && voll.angenommen) || [];
  if (!offen.length) { delete p.annahmen.hoehe; return; }
  const Z = window.KERN_ZUORDNUNG;
  const rueck = (voll && voll.rueckfall) || (Z && Z.HOEHE_RUECKFALL) || 2.6;
  const hoehen = offen.map(function (k) {
    return (voll.zuordnung[k] || {}).lichte_hoehe; });
  const gleich = hoehen.every(function (h) { return h === hoehen[0]; });
  const werte = gleich
    ? fmt(hoehen[0], 2) + " m"
    : offen.map(function (k, i) { return k + " " + fmt(hoehen[i], 2) + " m"; }).join(", ");
  /* Zwei Herkünfte, zwei Sätze. „Gibt weder der Plan eine lichte Höhe her"
     war eine falsche Behauptung, sobald die Geschosshöhe auf dem Schnitt
     stand — Abnahme-Befund vom 24.08.2026. Für abgeleitete Höhen sagt die
     Annahme jetzt die Herleitung, für die übrigen den Rückfallwert. */
  const hergeleitet = offen.filter(function (k) {
    return (voll.zuordnung[k] || {}).aus_geschosshoehe; });
  const nurRueckfall = offen.filter(function (k) {
    return !(voll.zuordnung[k] || {}).aus_geschosshoehe; });
  p.annahmen.hoehe = {
    feld: "geschosshoehen", wert: rueck, stufe: "offen",
    geschosse: offen.slice(),
    pfad: "geschosshoehen", zeit: Date.now(),
    kurz: "Lichte Höhe " + werte + " angenommen für " + offen.join(", "),
    begruendung:
      (hergeleitet.length
        ? "Für " + hergeleitet.join(", ") + " steht im Schnitt die Geschosshöhe; "
          + "die lichte Höhe ist daraus als Geschosshöhe minus übliches "
          + "Deckenpaket abgeleitet und bleibt eine Annahme, bis das Deckenpaket "
          + "bestätigt ist."
        : "")
      + (nurRueckfall.length
        ? (hergeleitet.length ? " Für " : "Für ")
          + (nurRueckfall.length === 1 && !hergeleitet.length
            ? "dieses Geschoss" : nurRueckfall.join(", "))
          /* DIE BEGRUENDUNG SAGT, WAS DAS WERKZEUG WEISS, NICHT WAS AUF DEM
             BLATT STEHT. Hier stand "gibt weder der Plan eine lichte Hoehe
             her" -- eine Tatsachenbehauptung ueber die Zeichnung. GEMESSEN
             am 26.08.2026 an "BV 2-0887 Ziolkowski": der Schnitt A-A bemasst
             die lichten Hoehen dreifach (2,52 / 2,52 / 2,32 m), und der
             ZWEITE Lauf derselben Datei hat sie auch gelesen. Am selben Tag
             an "Bauantrag Soethe": der Schnitt auf Blatt 4 bemasst 2,55 m,
             das Blatt war gelesen. Der Satz war beide Male falsch, und er
             ist die Art Satz, die einen Bearbeiter davon abhaelt, im Schnitt
             nachzusehen. Er sagt jetzt, was zutrifft: in den ausgelesenen
             Angaben steht keine -- und dass der Schnitt sie tragen kann. */
          + " ist unter den ausgelesenen Angaben keine lichte Höhe und keine "
          + "eingetragen. Angesetzt ist " + fmt(rueck, 2) + " m; das liegt "
          + "zwischen dem Altbaumaß und dem Mindestmaß der Landesbauordnungen. "
          + "Bemaßt ein Schnitt die lichte Höhe, ist sie von dort zu "
          + "übernehmen und ersetzt diesen Wert."
        : "")
      + " Die lichte Höhe geht unmittelbar in das Luftvolumen und in jede "
      + "Außenwandfläche ein; sie ist damit die wirksamste Zahl, die hier "
      + "nicht aus den Unterlagen übernommen werden konnte.",
    richtung: "Ist das Geschoss höher als angenommen, liegt die wirkliche "
      + "Heizlast über der gerechneten, ist es niedriger, darunter. Beide "
      + "Richtungen sind möglich; die Zahl daneben sagt, wie viel es ausmacht.",
    alternativ: null,
  };
}

/** Erzeugt die Bauteile aller Räume aus Abmessungen, Typologie und Lage.
 *  Wird nach den Eckdaten aufgerufen, weil erst dann die U-Werte feststehen. */
/** Von Hand angestoßen: erzeugt die Bauteile und meldet das Ergebnis. */
function bauteileErzeugen() {
  if (!window.KERN_ZUORDNUNG) {
    sagen("Das Zuordnungsmodul fehlt in dieser Fassung.", { stufe: "fehler" });
    return;
  }
  if (!App.p.bauteiltypen.length) {
    sagen("Es sind noch keine Bauteile mit U-Werten angelegt. Trage zuerst das Baujahr ein.",
      { stufe: "warnung" });
    App.schritt = "projekt"; render(); return;
  }
  const n = bauteileErgaenzen();
  App.schritt = "kontrolle";
  render();
  sagen(mz(n, "Bauteil", "Bauteile") + " erzeugt."
    + ((App.p.offeneFragen || []).length
      ? "\n" + mz(App.p.offeneFragen.length, "Punkt steht", "Punkte stehen")
        + " im Kontrollblatt."
      : ""), { stufe: "gut" });
}

/* FENSTER, DIE DIE ZWEITE LESUNG SIEHT UND DIE ERSTE NICHT.
 *
 * Die zweite Lesung zaehlt die Fenstersymbole je Grundriss, unabhaengig von
 * der ersten. Wo sie mehr zaehlt, fehlen der Rechnung Fenster, und ein
 * fehlendes Fenster senkt die Heizlast um seine Flaeche mal der Differenz
 * der U-Werte von Fenster und Wand.
 *
 * Eine gelesene Null bleibt sonst eine Null -- wer hingesehen hat, behaelt
 * recht. Hier hat aber ein ZWEITER hingesehen und mehr gezaehlt. Dann gilt
 * die groessere Zahl, so wie beim Widerspruch zwischen Fenster und
 * Aussenwand (KERN_ZUORDNUNG.aussenwaendeErschliessen) auch.
 *
 * WER DIE FEHLENDEN BEKOMMT, nach einer festen Reihenfolge und nie geraten:
 * nur Raeume mit Aussenwand; zuerst die, in denen ein Fenster der Regelfall
 * ist und die noch keines haben, groesste Flaeche zuerst; dann die uebrigen
 * ohne Fenster; erst danach ein zweites in einen Raum, der schon eines hat.
 * Die Zuteilung steht als Herkunft am Bauteil.
 *
 * WARUM DAS EINE EIGENE FUNKTION IST: die Zuteilung muss an ZWEI Stellen
 * bekannt sein. bauteileErgaenzen() braucht sie, um die Bauteile zu bilden;
 * die Faelligkeitsprobe in ergaenzeStillschweigend() braucht sie, um
 * bauteileErgaenzen() ueberhaupt aufzurufen. Stand sie nur drinnen, wurde
 * sie ausgerechnet, gebucht -- und nie angewandt, weil die Probe davor
 * schon "nichts zu tun" gemeldet hatte.
 *
 * Ohne Nebenwirkung: schreibt nichts an das Projekt. */
function fensterZusatzErmitteln(p) {
  const Z = window.KERN_ZUORDNUNG;
  const zusatz = {}, abgleich = [];
  if (!Z || !p || !(p.raeume || []).length) {
    return { zusatz: zusatz, abgleich: abgleich, fehler: null };
  }
  try {
    const zweite = {};
    ((p.plan && p.plan.seiten) || []).forEach(function (s) {
      if (s.verwenden === false || !s.uebernommen) return;
      (s.gegenprobeEbenen || []).forEach(function (e) {
        const g = Z.geschossAusText(e.ebene || "");
        const k = (g && g.kuerzel) || null;
        if (!k) return;
        const n = num(e.fenster, -1);
        if (!(n >= 0)) return;
        if (zweite[k] === undefined || zweite[k] < n) zweite[k] = n;
      });
    });
    const jeG = {};
    p.raeume.forEach(function (r) {
      const g = Z.geschossAusText(String(r.geschoss || ""));
      const k = (g && g.kuerzel) || null;
      if (!k) return;
      (jeG[k] = jeG[k] || []).push(r);
    });
    Object.keys(zweite).forEach(function (k) {
      const rs = jeG[k];
      if (!rs || !rs.length) return;
      const erste = rs.reduce(function (s, r) {
        return s + Math.max(0, num(r.fenster, 0));
      }, 0);
      const fehlend = Math.round(zweite[k]) - erste;
      if (!(fehlend > 0)) return;
      const mitWand = rs.filter(function (r) {
        return Z.aussenwaendeErschliessen(r, Math.max(0, num(r.fenster, 0))).anzahl > 0;
      });
      const nachFlaeche = function (a, b) { return num(b.A, 0) - num(a.A, 0); };
      const ohne = mitWand.filter(function (r) { return !(num(r.fenster, 0) > 0); });
      const reihe = ohne.filter(function (r) { return !Z.ohneFensterUeblich(r).ja; })
        .sort(nachFlaeche)
        .concat(ohne.filter(function (r) { return Z.ohneFensterUeblich(r).ja; })
          .sort(nachFlaeche))
        .concat(mitWand.slice().sort(nachFlaeche));
      let offen = fehlend;
      const vergeben = [];
      for (let i = 0; i < reihe.length && offen > 0; i++) {
        const id = String(reihe[i].id || reihe[i].name);
        zusatz[id] = (zusatz[id] || 0) + 1;
        vergeben.push(reihe[i].name || id);
        offen--;
      }
      abgleich.push({ geschoss: k, erste: erste,
        zweite: Math.round(zweite[k]), fehlend: fehlend, offen: offen,
        raeume: vergeben });
    });
  } catch (e) {
    return { zusatz: {}, abgleich: [], fehler: String((e && e.message) || e) };
  }
  return { zusatz: zusatz, abgleich: abgleich, fehler: null };
}

/** Still im Hintergrund: ergänzt fehlende Bauteile, ohne zu melden.
 *  Gibt die Zahl der erzeugten Bauteile zurück. */
function bauteileErgaenzen() {
  const Z = window.KERN_ZUORDNUNG;
  if (!Z || !App.p.bauteiltypen.length) return 0;
  const typFuer = function (muster) {
    return App.p.bauteiltypen.find(function (t) { return muster.test(t.name); });
  };
  const tWand = typFuer(/außenwand|aussenwand|wand/i);
  const tFenster = typFuer(/fenster/i);
  const tDach = typFuer(/dach|geschossdecke/i);
  /* Zwei verschiedene Bauteile, und sie waren bisher eines.
     Eine KELLERDECKE trennt einen beheizten Raum von einem unbeheizten
     Keller darunter. Eine BODENPLATTE liegt auf dem Erdreich. Sie haben
     verschiedene U-Werte und vor allem verschiedene Gegenseiten; welches
     von beiden gilt, entscheidet sich unten am Geschoss und nicht hier. */
  const tKellerdecke = typFuer(/kellerdecke/i) || typFuer(/boden/i);
  const tBodenplatte = typFuer(/bodenplatte|sohle|grundplatte/i)
    || typFuer(/boden/i) || tKellerdecke;
  const tTuer = typFuer(/außentür|aussentuer|haustür|haustuer|tür|tuer/i);

  // Welches Geschoss liegt unten, welches oben?
  const geschosse = [];
  App.p.raeume.forEach(function (r) {
    if (r.geschoss && geschosse.indexOf(r.geschoss) < 0) geschosse.push(r.geschoss);
  });
  /* Der Rang kommt aus KERN_ZUORDNUNG.rangVon und NICHT aus
     `geschossAusText(x).rang || 5`. Das Erdgeschoss hat den Rang 0, und die
     Null ist falsch: sie wurde durch das Oder zur 5 und schob das EG damit
     über das Obergeschoss. Gemessen am Blatt Dumach 1 (25 Räume, drei
     Geschosse): die Kellerdecke lag auf dem OG statt auf dem EG, und die
     zwölf Räume des Erdgeschosses hatten kein einziges Bauteil nach unten. */
  geschosse.sort(function (a, b) { return Z.rangVon(a) - Z.rangVon(b); });
  const unten = geschosse[0], oben = geschosse[geschosse.length - 1];

  /* LIEGT UNTER DEM UNTERSTEN GESCHOSS ÜBERHAUPT EIN KELLER?
   *
   * Bisher bekam das unterste Geschoss immer eine Fläche gegen die Zone
   * „Unbeheizter Keller". Das ist richtig, solange darunter einer liegt.
   * Ist das unterste Geschoss aber SELBST das Kellergeschoss, dann liegt
   * darunter das Erdreich, und die Rechnung bekam gleich drei Fehler auf
   * einmal: die Bodenplatte des Kellers rechnete gegen eine erfundene
   * Zonentemperatur statt gegen das Erdreich, das Werkzeug legte einen
   * unbeheizten Keller an, den es nicht gibt, und dieser Phantombereich
   * zählte in der Geschossprobe als eigene Ebene mit.
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": Kellergeschoss, Erdgeschoss,
   * Obergeschoss, dazu im Schnitt der Spitzboden — vier Ebenen. Das
   * Kontrollblatt zählte fünf und meldete eine Abweichung, die es nicht gab.
   *
   * Erkannt wird es an zwei voneinander unabhängigen Merkmalen: die
   * Geschossdeutung ordnet das unterste Geschoss UNTER das Erdgeschoss ein
   * (KERN_ZUORDNUNG.geschossAusText, rang < 0 — deckt Keller-, Unter- und
   * Souterraingeschoss ab), oder seine Räume tragen die Raumart „keller".
   * Eines von beiden genügt. Entschieden wird am Rang und nicht am Kürzel:
   * das Kürzel benennt, der Rang ordnet ein, und „liegt unter dem
   * Erdgeschoss" ist die Aussage, auf die es hier ankommt. */
  const untenIstKeller = (function () {
    const d = Z.geschossAusText ? Z.geschossAusText(unten || "") : null;
    if (d && d.rang < 0) {
      return "Geschossdeutung: „" + unten + "“ liegt unter dem Erdgeschoss";
    }
    const drin = App.p.raeume.filter(function (r) { return r.geschoss === unten; });
    if (drin.length && drin.some(function (r) { return r.art === "keller"; })) {
      return "Raumart „Keller“ im untersten Geschoss";
    }
    return null;
  })();

  /* SAGT DIE UNTERLAGE SELBST, DASS ES KEINEN KELLER GIBT?
   *
   * Bis zum 26.08.2026 bekam jedes unterste Geschoss, das nicht selbst das
   * Kellergeschoss war, eine Kellerdecke gegen die Zone „Unbeheizter
   * Keller" — auch dann, wenn die Auslese im selben Projekt das Gegenteil
   * festgestellt hatte. GEMESSEN am Blatt „Bauantrag Soethe 1312.2021.pdf"
   * (echter Lauf 26.08.2026): Planbefund mit Konfidenz „sicher", Thema
   * „Kellergeschoss", Aussage „Kein Keller vorhanden", Herleitung aus dem
   * Schnitt (±0,00 / −0,22 / −0,37). Angelegt wurden trotzdem eine Zone
   * mit 4,7 °C und 74,83 m² Kellerdecke über sieben Räume: 424 W, 6,4
   * Prozent der Heizlast, gegen einen Bereich, den der Schnitt ausschließt.
   *
   * NUR EIN BEFUND MIT KONFIDENZ „SICHER" ÄNDERT DAS BAUTEIL. Ein
   * „vermutlich kein Keller" (Hasenberg 10, Konfidenz unsicher) lässt es
   * beim bisherigen Ansatz und wird als Annahme benannt — das Werkzeug
   * tauscht keine Zahl gegen eine Vermutung. Gelesen wird der Befund in
   * KERN_HUELLENDECKUNG.kellerAussage; hier wird nur angewandt. */
  const HDB = window.KERN_HUELLENDECKUNG;
  const kellerBefund = (HDB && HDB.kellerAussage)
    ? HDB.kellerAussage(App.p.planbefunde) : null;
  const dachBefund = (HDB && HDB.dachAussage)
    ? HDB.dachAussage(App.p.planbefunde) : null;
  const keinKellerBelegt = (!untenIstKeller && kellerBefund
    && kellerBefund.art === "kein_keller"
    && String(kellerBefund.konfidenz).toLowerCase() === "sicher")
    ? kellerBefund : null;
  /* Ein Flachdach hat keinen Dachraum. Dieselbe Schranke: nur „sicher". */
  const flachdachBelegt = (dachBefund && dachBefund.art === "flachdach"
    && String(dachBefund.konfidenz).toLowerCase() === "sicher")
    ? dachBefund : null;

  /* WELCHE GESCHOSSE LIEGEN IM ERDREICH?
   *
   * Die senkrechte Hülle eines Kellergeschosses grenzt an das Erdreich, nicht
   * an die Außenluft. Bis hierher bekam JEDE Außenwand `{ typ: "aussen" }`,
   * auch die des Kellers; erdberührt war allein die Fläche nach unten.
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 22.08.2026, 13
   * Räume): KG KELLER 22,06 m² und KG FLUR 23,94 m², zusammen 46,0 m²
   * Wandfläche, rechneten gegen die Norm-Außentemperatur −10,7 °C statt nach
   * DIN EN 12831-1 gegen die Jahresmitteltemperatur.
   *
   * Erkannt wird es an derselben Deutung, die auch über die Fläche nach unten
   * entscheidet: dem Geschossrang aus KERN_ZUORDNUNG (rang < 0 deckt Keller-,
   * Unter- und Souterraingeschoss ab) und ersatzweise an der Erkennung des
   * untersten Geschosses. Zwei Wahrheiten über dieselbe Sache gibt es damit
   * nicht.
   *
   * ES IST EINE ANNAHME, und sie steht als solche am Bauteil: ob die Wand
   * wirklich ganz unter Geländeoberkante steht, sagt kein Grundriss. Ein
   * Souterrain oder eine Hanglage stellt der Bearbeiter am Bauteil auf
   * „Außenluft" zurück; die Auswahl gibt es dort. */
  const kellerGeschoss = {};
  App.p.raeume.forEach(function (r) {
    const d = Z.geschossAusText ? Z.geschossAusText(r.geschoss || "") : null;
    if (d && d.rang < 0) {
      kellerGeschoss[r.geschoss] = "Geschossbezeichnung „" + r.geschoss + "“";
    }
  });

  /* WO LIEGT DIE HAUSTÜR?
   *
   * Die Gebäudetypologie liefert für jede Baualtersklasse einen U-Wert der
   * Außentür, das Werkzeug legte den Bauteiltyp brav an — und kein einziger
   * Raum bekam je ein Bauteil daraus. Jedes gerechnete Haus war eines ohne
   * Haustür. GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf
   * 22.08.2026): die EG DIELE hatte 7,65 m² Außenwand und sonst nichts.
   *
   * Die Auslese fragt das Modell NICHT nach Türen — im Antwortschema des
   * Endpunkts gibt es kein Feld dafür. Der Raum wird deshalb über seinen
   * Namen im Erdgeschoss bestimmt (KERN_ZUORDNUNG.eingangsraum). Gibt es
   * mehrere, gilt der größte; gibt es keinen, bleibt es bei keiner Tür und
   * das Kontrollblatt fragt danach. Genommen wird genau EINE Tür je Gebäude. */
  const KFT = window.KERN_FENSTER;
  let eingang = null;
  if (KFT && KFT.haustuer && tTuer && Z.eingangsraum) {
    App.p.raeume.forEach(function (r) {
      if (!Z.eingangsraum(r).ja) return;
      if (!eingang || num(r.A, 0) > num(eingang.A, 0)) eingang = r;
    });
  }
  if (untenIstKeller && unten && !kellerGeschoss[unten]) {
    kellerGeschoss[unten] = untenIstKeller;
  }

  /* TEILUNTERKELLERT: WELCHE RÄUME STEHEN AUF DEM ERDREICH?
   *
   * Ein Bauteil nach unten bekam bisher allein das unterste erfasste
   * Geschoss. Ist das Haus nur zum Teil unterkellert, liegt unter einem Teil
   * des Geschosses DARÜBER kein Keller, sondern Erdreich — und diese Fläche
   * fiel ersatzlos aus der Rechnung.
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski", echter Durchlauf 23.08.2026:
   * die Auslese gab „Das Gebäude ist nur teilweise unterkellert", Konfidenz
   * sicher; im Raumbuch stehen KG 39,19 m² und EG 74,72 m². 35,53 m²
   * Erdgeschossboden hatten kein Bauteil, und das Kontrollblatt meldete dazu
   * grün „Abschluss nach unten · 2 Räume von 2".
   * Beurteilt wird das in KERN_HUELLENDECKUNG; hier wird es nur ausgeführt.
   * Das Ergebnis wird am Projekt abgelegt, damit Kontrollblatt und Bericht
   * dieselbe Feststellung lesen und nicht jeder seine eigene bildet. */
  const HD = window.KERN_HUELLENDECKUNG;
  let erdreich = null;
  if (HD && HD.aufErdreich) {
    erdreich = HD.aufErdreich({
      raeume: App.p.raeume, rangVon: Z.rangVon,
      planbefunde: App.p.planbefunde, untenIstKeller: untenIstKeller,
    });
  }
  /* Am Projekt liegt nur die Feststellung, nicht die Raumobjekte: sonst
     stünde jeder betroffene Raum zweimal in der Projektdatei und nach dem
     Laden wären es zwei verschiedene Objekte mit demselben Namen. */
  App.p.teilunterkellerung = erdreich ? {
    gilt: erdreich.gilt, unbeziffert: !!erdreich.unbeziffert,
    geschoss: erdreich.geschoss, unten: erdreich.unten,
    A_unten: erdreich.A_unten, A_geschoss: erdreich.A_geschoss,
    A_erdreich: erdreich.A_erdreich, anteil: erdreich.anteil,
    benannt: !!erdreich.benannt, quellen: erdreich.quellen || [],
    raeume: (erdreich.raeume || []).map(function (x) {
      return { id: x.raum.id, name: x.raum.name, geschoss: x.raum.geschoss,
               A: x.raum.A, A_boden: x.A_boden, ganz: !!x.ganz };
    }),
  } : null;
  const bodenAufErdreich = {};
  if (erdreich && erdreich.gilt && !erdreich.unbeziffert) {
    erdreich.raeume.forEach(function (x) {
      if (x && x.raum && x.A_boden > 0) bodenAufErdreich[x.raum.id] = x;
    });
  }

  let erzeugt = 0;
  const fragen = [];
  const neuGebildet = [];
  /* Fensterflaechen: KERN_FENSTER statt der Pauschale.
   *
   * Hier stand fuer jedes Fenster jedes Raums dieselbe Zahl: 1,6 m². Das ist
   * bequem und falsch. Ein Badfenster hat rund ein Fuenftel davon, eine
   * Terrassentuer das Doppelte, und der Fehler geht doppelt ein: das Fenster
   * hat den schlechtesten U-Wert der Huelle, und was ihm an Flaeche zufaellt,
   * geht der Wand ab.
   *
   * KERN_FENSTER war fuer genau diesen Zweck gebaut, hatte 697 Zeilen und
   * bestandene Selbsttests -- und wurde von keiner Zeile aufgerufen. Die
   * Daten, die es braucht, wurden sogar schon erhoben: raeumeAusAusleseUeber-
   * nehmen legt fensterliste je Raum ab, mit Wand, abgelesener Breite und der
   * Angabe, ob es eine Fenstertuer ist. Sie lagen bisher ungenutzt da.
   *
   * Es rechnet je Fenster aus abgelesener Breite und einer hergeleiteten
   * Hoehe (die steht in keinem Grundriss und ist immer eine Annahme), liefert
   * eine Bandbreite dazu und meldet, was unstimmig ist. Faellt es aus oder
   * kennt es den Raum nicht, bleibt es bei der Pauschale. */
  const KF = window.KERN_FENSTER;
  const fensterJeRaum = {};
  if (KF) {
    try {
      const fe = KF.fensterFuerProjekt(App.p.raeume, {});
      Object.keys(fe.je_raum || {}).forEach(function (k) { fensterJeRaum[k] = fe.je_raum[k]; });
      App.p.fensterbefunde = fe.befunde || [];
      (fe.befunde || []).forEach(function (b) {
        if (b.stufe !== "sperre" && b.stufe !== "warnung") return;
        fragen.push({ thema: "Fenster", frage: b.text || b.titel });
      });
    } catch (e) {
      App.p.fensterbefunde = [{ stufe: "hinweis", titel: "Fensterflächen",
        text: "Die Fensterflächen liessen sich nicht einzeln rechnen ("
          + String((e && e.message) || e) + "). Angesetzt ist die Pauschale von 1,60 m²." }];
    }
  }
  /* AUSSENWANDLAENGEN: DER UMFANGSABGLEICH JE GESCHOSS.
   *
   * Ohne ihn wird jeder Raum ohne angeschriebene Abmessungen als Quadrat
   * gerechnet, und das Quadrat hat unter allen Rechtecken gleicher Flaeche
   * den kleinsten Umfang. Die Wandflaeche ist dann die kleinstmoegliche und
   * der Fehler geht immer in dieselbe, unsichere Richtung.
   * GEMESSEN am Blatt "BV 2-0887 Ziolkowski" (echter Lauf 23.08.2026):
   * kein einziger Raum kam mit Breite und Tiefe zurueck. Das Kellergeschoss
   * trug 17,69 m Aussenwand, seine gelesene Aussenkontur 8,00 mal 7,00 m
   * dagegen 30,0 m Umfang.
   * Was der Abgleich rechnet und woher der Umfang kommt, steht in
   * KERN_ZUORDNUNG.wandlaengenJeGeschoss. Hier wird nur zugeliefert: die
   * Raeume je Geschoss und die Kontur, die die zweite Lesung fuer dieses
   * Geschoss gemeldet hat. */
  /* DAS SEITENVERHAELTNIS DES GEBAEUDES.
   * Es wird EINMAL ueber alle Raeume hergeleitet, nicht je Geschoss: je mehr
   * belegte Raeume eingehen, desto weniger haengt der Median an einem
   * einzelnen langen Flur. Hergeleitet wird es aus dem, was am Blatt steht --
   * angeschriebene Breite und Tiefe, oder angeschriebener Umfang samt Flaeche.
   * Gesetzt wird nichts; ohne zwei belegte Raeume bleibt es beim Quadrat, und
   * das steht dann auch im Bauteilvermerk. Siehe KERN_ZUORDNUNG. */
  const seitenverhaeltnis = Z.seitenverhaeltnisHerleiten
    ? Z.seitenverhaeltnisHerleiten(App.p.raeume) : null;
  App.p.seitenverhaeltnis = seitenverhaeltnis;
  const wandlaengeJeRaum = {}, wandlaengeGrund = {};
  /* Themen, fuer die DIESER Durchlauf zustaendig ist -- unabhaengig davon,
     ob er dazu diesmal einen Befund bildet. Ohne diese Liste bleibt eine
     Zeile stehen, deren Ursache weg ist: traegt jemand die Aussenmasse des
     Erdgeschosses von Hand ein, kommt der Umfang danach aus der Kontur und
     der Befund "hochgerechnet" entsteht gar nicht mehr -- geloescht wurde
     bis zum 23.08.2026 aber nur, was neu entstand, und so ueberlebte die
     alte Zeile die Korrektur. */
  const zustaendigeThemen = { "Außenwände": true };
  App.p.umfangsabgleich = [];
  try {
    const konturJeGeschoss = {};
    ((App.p.plan && App.p.plan.seiten) || []).forEach(function (s) {
      (s.gegenprobeKonturen || []).forEach(function (k) {
        const g = Z.geschossAusText(k.ebene || "");
        if (!g || !g.kuerzel) return;
        const alt = konturJeGeschoss[g.kuerzel];
        if (!alt || num(k.A, 0) > num(alt.A, 0)) konturJeGeschoss[g.kuerzel] = k;
      });
    });
    /* DIE ÄUSSERSTE MASSKETTE AUS DEM TEXTSTAND ALS UMFANGSQUELLE.
       Das Kontrollblatt kannte sie längst (MODUL_KONTROLLBLATT.kontur, dort
       seit dem 23.08.2026) — der Umfangsabgleich hier NICHT. GEMESSEN am
       Blatt „Hasenberg_10_Grundrisse" (echter Lauf): der Fragetext nannte
       selbst die gelesene Kette 18,95 m mal 16,62 m je Seite und verlangte
       dieselben vier Zahlen vom Bearbeiter, weil die Hochrechnung ohne diese
       Quelle lief und die Fassadenprobe danach Lücke meldete. Genommen wird
       die Kette nur, wenn sie EINDEUTIG ist: bei einer konkurrierenden,
       doppelt bemaßten kürzeren Kette (a.konkurrenz, Fall „Bauantrag" 30 m
       gegen 26 m) weiß das Werkzeug wirklich nicht, welche gilt — dann
       bleibt die Frage. Die zweite Lesung geht vor (sie hat das Blatt
       zusätzlich gesehen), von Hand Eingetragenes sowieso. */
    const massketteJeGeschoss = {};
    ((App.p.plan && App.p.plan.seiten) || []).forEach(function (s) {
      if (s.verwenden === false) return;
      const a = s.aussenbemassung;
      if (!a || !a.vorhanden || a.konkurrenz) return;
      const b = num(a.breite_m, 0), t = num(a.tiefe_m, 0);
      if (!(b > 0) || !(t > 0)) return;
      const g = Z.geschossAusText(s.geschoss || "");
      if (!g || !g.kuerzel) return;
      const A = Math.round(b * t * 100) / 100;
      const alt = massketteJeGeschoss[g.kuerzel];
      /* Mehrere Blätter desselben Geschosses: das KLEINSTE Rechteck ist die
         schärfste Obergrenze — dieselbe Regel wie im Kontrollblatt. */
      if (alt && alt.A <= A) return;
      massketteJeGeschoss[g.kuerzel] = {
        A: A, U: Math.round(2 * (b + t) * 100) / 100,
        quelle: "äußerste Maßkette im Textstand von "
          + (s.bezeichnung || s.name) + ", " + fmt(b, 2) + " m mal "
          + fmt(t, 2) + " m"
          + (a.wortlaut ? " („" + a.wortlaut + "“)" : "")
          + (a.belegt ? ", durch eine zweite Kette belegt"
            : ", die einzige äußerste Kette, ohne Widerspruch"),
      };
    });
    const jeGeschoss = {};
    App.p.raeume.forEach(function (r) {
      const g = String(r.geschoss || "");
      (jeGeschoss[g] = jeGeschoss[g] || []).push(r);
    });
    /* WAS DER BEARBEITER SELBST EINTRAEGT, GILT VOR JEDER LESUNG.
       Die zweite Lesung hat am Blatt "BV 2-0887 Ziolkowski" fuer das
       Erdgeschoss 11,50 x 6,00 gemeldet und damit eine Kontur, die kleiner
       ist als die Raeume darin. Wer den Plan vor sich hat, greift die
       richtigen 8,00 x 12,50 in einer halben Minute ab. Bis zum 23.08.2026
       gab es dafuer kein Feld -- das Werkzeug rechnete eine Schranke und
       liess niemanden sie ersetzen. */
    const eigen = App.p.geschossmasse || {};
    Object.keys(jeGeschoss).forEach(function (g) {
      const kg = Z.geschossAusText(g);
      const e = eigen[g] || (kg && kg.kuerzel ? eigen[kg.kuerzel] : null) || null;
      const eB = num(e && e.breite_m, 0), eT = num(e && e.tiefe_m, 0);
      const kontur = (eB > 0 && eT > 0)
        ? { A: Math.round(eB * eT * 100) / 100, U: Math.round(2 * (eB + eT) * 100) / 100,
            quelle: "von Hand eingetragenen Aussenmasse des Geschosses, "
              + fmt(eB, 2) + " m mal " + fmt(eT, 2) + " m"
              /* Die freiwillige Quellenangabe des Bearbeiters („Woher stammt
                 die Zahl?") reist im Herkunftstext mit — bis in die interne
                 Fassung. Vorher verpuffte sie: getippt, nirgends abgelegt. */
              + (e && e.quelle
                ? " (Quelle laut Bearbeiter: „" + String(e.quelle) + "“)" : "") }
        : ((kg && kg.kuerzel && konturJeGeschoss[kg.kuerzel])
          || (kg && kg.kuerzel && massketteJeGeschoss[kg.kuerzel]) || null);
      /* Das Bezugsgeschoss fuer die Hochrechnung: eines mit belegter Kontur,
         die zu SEINEN Raeumen passt. Unter mehreren gilt das mit der
         groessten Raumflaeche, denn hinter seinem Verhaeltnis stehen die
         meisten Flaechenstempel. Das Geschoss selbst scheidet aus -- haette
         es eine brauchbare Kontur, liefe es oben ueber "kontur". */
      let bezug = null;
      Object.keys(jeGeschoss).forEach(function (h) {
        if (h === g) return;
        const hk = Z.geschossAusText(h);
        const he = eigen[h] || (hk && hk.kuerzel ? eigen[hk.kuerzel] : null) || null;
        const hB = num(he && he.breite_m, 0), hT = num(he && he.tiefe_m, 0);
        const hkontur = (hB > 0 && hT > 0)
          ? { A: Math.round(hB * hT * 100) / 100,
              U: Math.round(2 * (hB + hT) * 100) / 100 }
          : ((hk && hk.kuerzel && konturJeGeschoss[hk.kuerzel])
            || (hk && hk.kuerzel && massketteJeGeschoss[hk.kuerzel]) || null);
        const hA = num(hkontur && hkontur.A, 0);
        if (!(hA > 0)) return;
        let hN = 0;
        jeGeschoss[h].forEach(function (r) { hN += num(r.A, 0); });
        if (!(hN > 0) || hA < hN * 0.98 || hA > hN * 2.0) return;
        if (!bezug || hN > bezug.A_netto) {
          /* Der UMFANG der Bezugskontur, nicht nur ihre Flaeche. Aus Umfang
             und Netto-Raumflaeche folgt die Beziehung k = U/Wurzel(A), und
             die traegt beides: den Verlust an Waenden und Treppe UND die Form
             des Geschosses. Ohne diese Zahl blieb nur der Zwischenschritt
             ueber den Raumanteil, an dessen Ende wieder ein Quadrat stand. */
          bezug = { geschoss: h, A_kontur: hA, A_netto: Math.round(hN * 100) / 100,
                    U_kontur: num(hkontur && hkontur.U, 0) };
        }
      });
      zustaendigeThemen["Außenwände " + g] = true;
      const ua = Z.wandlaengenJeGeschoss(jeGeschoss[g],
        { kontur: kontur, bezug: bezug, v: seitenverhaeltnis });
      App.p.umfangsabgleich.push(Object.assign({ geschoss: g }, ua));
      if (ua.befund) {
        fragen.push({ thema: "Außenwände " + g, frage: ua.befund,
                      abhilfe: ua.abhilfe || null });
      }
      Object.keys(ua.je_raum).forEach(function (id) {
        wandlaengeJeRaum[id] = ua.je_raum[id];
        wandlaengeGrund[id] = "Außenwandlänge aus dem Umfangsabgleich des "
          + "Geschosses " + g + ": " + ua.quelle + ". Der Raum trägt "
          + fmt(ua.je_raum[id], 2) + " m davon, im Verhältnis seiner Fläche zu "
          + "den übrigen Räumen des Geschosses (Faktor "
          + fmt(ua.faktor, 2) + " auf den als Quadrat gerechneten Wert)";
      });
    });
  } catch (e) {
    fragen.push({ thema: "Außenwände", frage: "Der Umfangsabgleich der "
      + "Geschosse ist fehlgeschlagen (" + String((e && e.message) || e)
      + "). Die Wandflächen stehen deshalb als Quadrat gerechnet da und sind "
      + "damit die kleinstmöglichen." });
  }
  /* Die Raeume so, wie sie gerechnet werden -- gefuellt in der Schleife
     unten, ausgewertet von der Huellenprobe danach. */
  const raeumeGerechnet = [];
  /* Die Fenster, die die zweite Lesung mehr zaehlt als die erste zugeordnet
     hat. Hergeleitet in fensterZusatzErmitteln (siehe dort); hier wird die
     Zuteilung nur angewandt und gebucht. */
  const zusatzErg = fensterZusatzErmitteln(App.p);
  const fensterZusatz = zusatzErg.zusatz;
  App.p.fensterabgleich = zusatzErg.abgleich;
  if (zusatzErg.fehler) {
    fragen.push({ thema: "Fenster", frage: "Der Abgleich der Fensterzahl gegen "
      + "die zweite Lesung ist fehlgeschlagen (" + zusatzErg.fehler
      + "). Es gilt allein die erste Lesung." });
  }
  App.p.raeume.forEach(function (r) {
    /* Veraltete Flächen neu bilden.
     *
     * Die Wandfläche eines Raums ist Wandlänge mal Raumhöhe. Beide stecken in
     * r.A und r.h — und beide ändern sich noch, nachdem die Bauteile gebildet
     * sind: der Bearbeiter trägt eine Geschosshöhe ein, oder der Schnitt
     * liefert sie nach. Bisher blieb die einmal gerechnete Fläche stehen. Aus
     * 2,60 m Annahme wurden 2,30 m aus dem Schnitt, und die Wand rechnete
     * weiter mit 2,60 m: ein zu großer Wärmestrom, der nirgends auffiel, weil
     * die Zeile gefüllt aussah.
     *
     * Neu gebildet wird nur, was das Werkzeug selbst gebildet hat und woran
     * niemand von Hand war (b.automatisch). Alles andere bleibt unberührt. */
    const bt = r.bauteile || [];
    if (bt.length) {
      const stand = r.bauteile_stand;
      /* DRITTER GRUND, WARUM EINE FLÄCHE ÜBERHOLT IST: die zweite Lesung hat
       * diesem Raum inzwischen ein Fenster mehr gegeben.
       *
       * Bisher zählten nur Raumfläche und Raumhöhe. Ein Raum, dessen A und h
       * sich nicht geändert hatten, stieg hier aus — und zwar VOR der Stelle,
       * an der der Zuschlag aus der zweiten Lesung angewandt wird. Die
       * Zuteilung wurde ausgerechnet, in App.p.fensterabgleich als erledigt
       * gebucht und dann von genau dieser Zeile übersprungen: angelegt wurde
       * kein einziges Fenster. GEMESSEN am Blatt „BV 2-0887 Ziolkowski"
       * (echter Lauf 23.08.2026): die zweite Lesung zählt EG 7 und OG 6, die
       * erste hatte 8 Fenster im ganzen Haus. Fünf Fenster fehlten der
       * Rechnung, und die Zeile darüber wusste es.
       *
       * Der gebaute Stand merkt sich deshalb, wie viele Zusatzfenster in ihm
       * stecken. Weicht die heutige Zuteilung davon ab, sind die Bauteile
       * überholt — nach derselben Regel wie bei A und h, und mit derselben
       * Schranke: neu gebildet wird nur, was das Werkzeug selbst gebildet hat
       * (b.automatisch). Von Hand Angelegtes bleibt unberührt. */
      const zusatzSoll = Math.max(0, num(fensterZusatz[String(r.id || r.name)], 0));
      const zusatzGebaut = Math.max(0, num(stand && stand.fensterZusatz, 0));
      /* VIERTER GRUND: der Umfangsabgleich hat diesem Raum inzwischen eine
       * andere Aussenwandlaenge zugeteilt. Die Wandflaeche ist Laenge mal
       * Hoehe; aendert sich die Laenge, ist die Flaeche ueberholt, genau wie
       * bei einer geaenderten Hoehe. Ohne diese Zeile bleibt jede Korrektur
       * am Geschossumfang folgenlos -- eingetragene Aussenmasse wuerden
       * gerechnet, angezeigt und nirgends verwendet. */
      const wlSoll = num(wandlaengeJeRaum[String(r.id || r.name)], 0);
      const wlGebaut = num(stand && stand.wl, 0);
      /* FUENFTER GRUND: an diesem Raum steht inzwischen ein Umfang oder eine
         gelesene Aussenwandlaenge. Beide gehen unmittelbar in die Wandlaenge
         und damit in die Wandflaeche; aendert sich eine, ist das Bauteil
         ueberholt. Ohne diese Zeile bliebe ein nachgetragener Umfang
         folgenlos -- er wuerde gelesen, gespeichert und nie gerechnet. */
      const umSoll = num(r.umfang_m, 0), umGebaut = num(stand && stand.um, 0);
      const awSoll = num(r.aussenwand_m, 0), awGebaut = num(stand && stand.aw, 0);
      /* SECHSTER GRUND: die HERKUNFT der Wandlaenge hat sich geaendert —
         etwa weil der Bearbeiter zu den Aussenmassen nachtraeglich eine
         Quelle eingetragen hat. Die Zahl bleibt gleich, aber der
         Herkunftstext im Bauteil (und damit in der internen Fassung) waere
         sonst der alte ohne Quelle. */
      const wlqSoll = String(wandlaengeGrund[String(r.id || r.name)] || "");
      const wlqGebaut = String((stand && stand.wlq) || "");
      const veraltet = stand
        && (Math.abs(num(r.A, 0) - stand.A) > 0.005
          || Math.abs(num(r.h, 0) - stand.h) > 0.005
          || Math.abs(wlSoll - wlGebaut) > 0.005
          || Math.abs(umSoll - umGebaut) > 0.005
          || Math.abs(awSoll - awGebaut) > 0.005
          || wlqSoll !== wlqGebaut
          || zusatzSoll !== zusatzGebaut);
      const alleAutomatisch = bt.every(function (b) { return b.automatisch === true; });
      if (!veraltet || !alleAutomatisch) {
        /* NICHT NEU GEBILDET HEISST NICHT „NICHT GERECHNET".
           Die Fensterprobe über das ganze Gebäude läuft unten über
           raeumeGerechnet. Wer hier aussteigt, stand bis zum 26.08.2026
           nicht darin — und war an einem Stand, an dem gar nichts neu zu
           bilden war, KEIN einziger Raum. Die Probe fiel dann still aus und
           im Projekt blieb ihr Ergebnis vom letzten Durchlauf stehen. */
        raeumeGerechnet.push(r);
        return;
      }
      r.bauteile = [];
      neuGebildet.push(r.name || r.id);
    }
    /* Je Raum die mittlere Einzelfensterflaeche aus KERN_FENSTER; ohne
       Fensterliste faellt das auf die alte Pauschale zurueck. */
    const fe = fensterJeRaum[String(r.id || r.name)];
    const mittel = (fe && fe.anzahl > 0 && fe.A_m2 > 0) ? fe.A_m2 / fe.anzahl : null;
    const u = { fenstergroesse: mittel != null ? Math.round(mittel * 100) / 100 : 1.6,
                seitenverhaeltnis: seitenverhaeltnis };
    /* Die Aussenwandlaenge aus dem Umfangsabgleich, falls es fuer diesen
       Raum eine gibt. Raeume mit angeschriebener Breite und Tiefe stehen
       nicht in der Liste; ihre Laenge ist gemessen und bleibt. */
    const wl = wandlaengeJeRaum[String(r.id || r.name)];
    if (wl > 0) {
      u.wandlaenge = wl;
      u.wandlaenge_herkunft = wandlaengeGrund[String(r.id || r.name)];
    }
    if (mittel != null) {
      if (!r.herkunft) r.herkunft = {};
      r.herkunft.fensterflaeche_quelle = fe.herkunft || "aus der Fensterliste gerechnet";
      r.herkunft.fensterflaeche_spanne = [fe.A_min_m2, fe.A_max_m2];
    }
    if (eingang && r === eingang) {
      const ht = KFT.haustuer();
      u.tuer = { A: ht.A_m2,
        herkunft: "Hauseingangstür angesetzt, weil dieser Raum der "
          + "Eingangsbereich ist (" + Z.eingangsraum(r).grund + "). Der Plan "
          + "wird auf Türen nicht ausgelesen. " + ht.quelle };
    }
    if (kellerGeschoss[r.geschoss] && tWand) {
      u.wand = {
        name: "Kellerwand gegen Erdreich", kat: "erdreich",
        grenzt_an: { typ: "erdreich" },
        herkunft: "gegen Erdreich gerechnet, weil der Raum im Kellergeschoss "
          + "liegt (" + kellerGeschoss[r.geschoss] + "). Erdberührte Bauteile "
          + "rechnen nach DIN EN 12831-1 über f_θann · f_GW · f_ig gegen die "
          + "Jahresmitteltemperatur, nicht gegen die Norm-Außentemperatur. "
          + "Angenommen ist, dass die Wand vollständig unter Geländeoberkante "
          + "steht; bei Souterrain oder Hanglage hier auf „Außenluft“ "
          + "zurückstellen. Der U-Wert ist der der Außenwand: einen eigenen "
          + "Wert für die Kellerwand nennt die Gebäudetypologie nicht",
      };
    }
    if (r.geschoss === unten && untenIstKeller && tBodenplatte) {
      /* Das unterste Geschoss ist der Keller: die Fläche nach unten liegt
         auf dem Erdreich. Keine Zone, keine angenommene Zonentemperatur. */
      u.unten = { name: tBodenplatte.name, kat: "erdreich",
                  grenzt_an: { typ: "erdreich" },
                  herkunft: "Bodenplatte gegen Erdreich; das unterste Geschoss "
                    + "ist selbst das Kellergeschoss (" + untenIstKeller + ")" };
    } else if (r.geschoss === unten && keinKellerBelegt && tBodenplatte) {
      /* Die Unterlage sagt selbst, dass es keinen Keller gibt. Dann liegt
         die Fläche nach unten auf dem Erdreich, und es entsteht keine Zone
         mit angenommener Temperatur. Der Beleg steht am Bauteil. */
      u.unten = { name: tBodenplatte.name, kat: "erdreich",
                  grenzt_an: { typ: "erdreich" },
                  herkunft: "Bodenplatte gegen Erdreich. Die Planauslese "
                    + "stellt mit Konfidenz „sicher“ fest: „"
                    + keinKellerBelegt.wortlaut + "“"
                    + (keinKellerBelegt.herleitung
                      ? " (" + keinKellerBelegt.herleitung + ")" : "")
                    + ". Ein unbeheizter Keller wird deshalb nicht angesetzt" };
    } else if (r.geschoss === unten && tKellerdecke) {
      /* KEIN BELEG IN BEIDE RICHTUNGEN: es bleibt beim unbeheizten Keller,
         und das ist eine ANNAHME. Sie steht jetzt am Bauteil, damit sie in
         der internen Fassung und in „Was diese Berechnung nicht belegt"
         auftaucht — vorher trug die Kellerdecke keinen Herkunftstext und
         las sich im Bericht wie ein Aufmaß. */
      u.unten = { name: tKellerdecke.name, kat: "huelle",
                  grenzt_an: { typ: "zone", ref: "keller" },
                  herkunft: "Unter dem untersten erfassten Geschoss ist ein "
                    + "unbeheizter Keller ANGENOMMEN; die Unterlage belegt "
                    + "ihn nicht"
                    + (kellerBefund
                      ? ". Dazu steht in den Planbefunden mit Konfidenz „"
                        + kellerBefund.konfidenz + "“: „" + kellerBefund.wortlaut
                        + "“ — das ist zu schwach, um die Fläche gegen das "
                        + "Erdreich zu rechnen"
                      : ". Die Auslese sagt zu einem Keller nichts")
                    + ". Liegt das Geschoss auf dem Erdreich, ist das Bauteil "
                    + "auf „Bodenplatte gegen Erdreich“ zu stellen" };
    } else if (bodenAufErdreich[r.id] && tBodenplatte) {
      /* Teilunterkellert: dieser Raum liegt über der nicht unterkellerten
         Fläche und steht damit auf dem Erdreich. Die Fläche ist NICHT die
         Raumfläche, sondern der auf ihn entfallende Anteil; sie kommt aus
         KERN_HUELLENDECKUNG und steht mit ihrer Herleitung am Bauteil. */
      const tu = bodenAufErdreich[r.id];
      u.unten = {
        name: tBodenplatte.name, kat: "erdreich",
        grenzt_an: { typ: "erdreich" }, A_m2: tu.A_boden,
        herkunft: "Bodenplatte gegen Erdreich, weil das Gebäude nur zum Teil "
          + "unterkellert ist. " + (erdreich.quellen || []).join(". ") + ". "
          + (tu.ganz
            ? "Dieser Raum ist im Befund namentlich genannt und steht mit "
              + "seiner ganzen Grundfläche auf dem Erdreich."
            : "WELCHE Räume des Geschosses darauf stehen, sagt die Unterlage "
              + "nicht. Angesetzt sind deshalb " + fmt(erdreich.anteil * 100, 1)
              + " Prozent jeder Raumgrundfläche des Geschosses, zusammen "
              + fmt(erdreich.A_erdreich, 2) + " m². Die Summe ist damit belegt, "
              + "die Verteilung auf die Räume ist eine Annahme: die "
              + "Gebäudeheizlast stimmt, die raumweise ist hier eine Näherung."),
      };
    }
    if (r.geschoss === oben && tDach) {
      /* EIN FLACHDACH HAT KEINEN DACHRAUM. Bis zum 26.08.2026 bekam das
         oberste Geschoss immer eine Fläche gegen die Zone „Unbeheizter
         Dachraum" (−7,2 °C nach DIN/TS 12831-1 Tabelle 5). GEMESSEN am
         Blattsatz „P2211 Baugenehmigung Grundrisse": der Schnitt zeigt ein
         Flachdach, das Werkzeug rechnete trotzdem gegen einen Dachraum,
         der nicht existiert — und damit gegen eine zu warme Gegenseite.
         Auch hier gilt nur ein Befund mit Konfidenz „sicher". */
      u.oben = flachdachBelegt
        ? { name: tDach.name, kat: "huelle", grenzt_an: { typ: "aussen" },
            herkunft: "Dach gegen Außenluft. Die Planauslese stellt mit "
              + "Konfidenz „sicher“ fest: „" + flachdachBelegt.wortlaut
              + "“. Ein Flachdach hat keinen unbeheizten Dachraum dazwischen" }
        : { name: tDach.name, kat: "huelle",
            grenzt_an: { typ: "zone", ref: "dachraum" },
            herkunft: "Über dem obersten erfassten Geschoss ist ein "
              + "unbeheizter Dachraum ANGENOMMEN; die Unterlage belegt ihn "
              + "nicht"
              + (dachBefund
                ? ". Dazu steht in den Planbefunden mit Konfidenz „"
                  + dachBefund.konfidenz + "“: „" + dachBefund.wortlaut + "“"
                : "")
              + ". Schließt das Geschoss unmittelbar an das Dach an, ist das "
              + "Bauteil auf „Außenluft“ zu stellen" };
    }
    /* Fenster, wenn im Plan keines gezählt ist.
     *
     * GEMESSEN am Blatt Dumach 1: aus dem Textstand kommen Raumname, Fläche
     * und Geschoss, aber keine Fensterzahl — die steht in keinem
     * Flächenstempel. Ohne sie entstand kein einziges Fenster, und damit
     * fehlte in sechzehn Räumen der schlechteste U-Wert der Hülle. Das
     * Ergebnis: 25,4 W/m² gegen einen Typologie-Erwartungswert von 60, also
     * 58 Prozent zu wenig, und eine Selbstprüfung, die rot stand.
     *
     * Angesetzt wird deshalb die Fensterfläche aus der Raumgrundfläche
     * (KERN_FENSTER.rueckfallFlaeche), verankert am bauordnungsrechtlichen
     * Mindestmaß von einem Achtel der Netto-Grundfläche für Aufenthaltsräume
     * (Musterbauordnung § 47 Abs. 2, gleichlautend § 46 Abs. 2 BauO NRW
     * 2018). Drei Schranken halten das ehrlich:
     *   - Nur wo der Plan NICHTS sagt (r.fenster == null). Eine gelesene
     *     Null bleibt eine Null; wer hingesehen hat, behält recht.
     *   - Nur Räume, in denen ein Fenster der Regelfall ist. Flur, WC,
     *     Abstellraum, HWR und Treppenhaus bleiben außen vor — dieselbe
     *     Liste, mit der KERN_ZUORDNUNG die Außenwände erschließt.
     *   - Nur Räume, die überhaupt eine Außenwand haben.
     * Die Annahme steht als Herkunft am Bauteil, als Vermerk am Raum, als
     * Warnung im Kontrollblatt und in der Annahmenliste des Berichts. */
    let fensterAnnahme = null;
    if (KF && r.fenster == null && !(r.fensterliste || []).length
        && Z.aussenwaendeErschliessen(r, 0).anzahl > 0
        && !Z.ohneFensterUeblich(r).ja) {
      const rf = KF.rueckfallFlaeche(r.art, r.A);
      if (rf && rf.A_m2 > 0) fensterAnnahme = rf;
    }
    /* Die Fenster, die die zweite Lesung mehr gezaehlt hat als die erste
       zugeordnet hat. Die Flaeche kommt aus derselben Quelle wie die der
       uebrigen Fenster dieses Raums: KERN_FENSTER teilt den Fenster-
       flaechenanteil des Raums auf ALLE seine Fenster auf. Ein Raum, der
       schon ein Fenster hat, bekommt dadurch keine zusaetzliche Flaeche,
       sondern dieselbe auf mehr Oeffnungen verteilt; Flaeche gewinnt nur
       ein Raum, der bisher gar keines hatte. Genau das ist der Fall, den
       die zweite Lesung aufdeckt. */
    const fZusatz = fensterAnnahme ? 0 : (fensterZusatz[String(r.id || r.name)] || 0);
    let rz = fensterAnnahme ? Object.assign({}, r, { fenster: 1 }) : r;
    if (fensterAnnahme) u.fenstergroesse = fensterAnnahme.A_m2;
    if (fZusatz > 0) {
      const nFenster = Math.max(0, num(r.fenster, 0)) + fZusatz;
      rz = Object.assign({}, r, { fenster: nFenster });
      if (KF) {
        try {
          const neu = KF.fensterFuerRaum(rz, {});
          if (neu && neu.anzahl > 0 && neu.A_m2 > 0) {
            u.fenstergroesse = Math.round((neu.A_m2 / neu.anzahl) * 100) / 100;
          }
        } catch (e) { /* dann bleibt es bei der bisherigen Grösse */ }
      }
      if (!r.herkunft) r.herkunft = {};
      r.herkunft.fenster_aus_gegenprobe = fZusatz;
      r.herkunft.fensterflaeche_quelle = (fZusatz === 1
        ? "Ein Fenster" : fZusatz + " Fenster")
        + " mehr als die erste Lesung diesem Raum gegeben hat: "
        + "die zweite, unabhängige Lesung zählt auf diesem Geschoss mehr "
        + "Fenstersymbole, als die erste Räumen zugeordnet hat. Die Fläche ist "
        + "der Fensterflächenanteil dieses Raums, auf alle seine Öffnungen "
        + "verteilt.";
    }
    /* Fuer die Huellenprobe: der Raum SO, wie er in die Bauteile gegangen
       ist -- also mit dem Zuschlag aus der zweiten Lesung. Wer stattdessen
       App.p.raeume nimmt, prueft eine Fensterzahl, die gar nicht gerechnet
       wurde. */
    raeumeGerechnet.push(rz);
    const erg = Z.bauteileFuerRaum(rz, u);
    erg.bauteile.forEach(function (b) {
      const typ = b.art === "fenster" ? tFenster
        : b.art === "tuer" ? tTuer
        : b.art === "aussenwand" ? tWand
        /* Der Bauteiltyp folgt dem Namen, den u.unten gesetzt hat: gegen
           Erdreich die Bodenplatte, gegen einen unbeheizten Keller die
           Kellerdecke. Beide haben verschiedene U-Werte. */
        : b.art === "boden"
          ? ((untenIstKeller ? tBodenplatte : tKellerdecke) || tKellerdecke)
          : tDach;
      if (!typ) return;
      let herkunft = b.herkunft, sicher = b.sicher;
      if (fensterAnnahme && b.art === "fenster") {
        herkunft = "Fensterfläche angenommen, im Plan ist für diesen Raum kein "
          + "Fenster angeschrieben: " + fmt(fensterAnnahme.anteil * 100, 1)
          + " Prozent der Grundfläche von " + fmt(r.A, 2) + " m², also "
          + fmt(fensterAnnahme.A_m2, 2) + " m² (Spanne "
          + fmt(fensterAnnahme.A_min_m2, 2) + " bis "
          + fmt(fensterAnnahme.A_max_m2, 2) + " m²). " + fensterAnnahme.quelle;
        sicher = false;
        if (!r.herkunft) r.herkunft = {};
        r.herkunft.fenster_angenommen = true;
        r.herkunft.fensterflaeche_quelle = herkunft;
        r.herkunft.fensterflaeche_spanne =
          [fensterAnnahme.A_min_m2, fensterAnnahme.A_max_m2];
      }
      r.bauteile.push({
        typ_id: typ.id, name: b.name, A: b.A, kat: b.kat,
        /* Wozu das Bauteil gehört — Wand, Fenster, Boden, Decke. Der Name
           allein trägt das nicht mehr, seit eine Kellerwand „Kellerwand gegen
           Erdreich" heißt; wer senkrecht von waagerecht unterscheiden will,
           musste bisher im Namen suchen. */
        art: b.art,
        grenzt_an: b.grenzt_an,
        /* Eine Fensterzeile fasst alle Fenster des Raums zusammen; die Zahl
           muss mitgehen, sonst zählt das Kontrollblatt Zeilen gegen Fenster. */
        anzahl: b.anzahl,
        /* Vom Werkzeug gebildet, nicht von Hand: nur solche Flächen werden
           nachgeführt, wenn sich Raumhöhe oder Raumfläche noch ändern. */
        automatisch: true,
        herkunft: herkunft, sicher: sicher,
      });
      erzeugt++;
    });
    if ((r.bauteile || []).length) {
      /* Die Aussenwandlaenge gehoert in den Stand.
         Bis zum 23.08.2026 standen hier nur Flaeche und Hoehe. Die Wandflaeche
         ist aber Laenge mal Hoehe, und die Laenge kommt aus dem
         Umfangsabgleich. Aenderte der sich -- weil eine Kontur dazukam oder
         der Bearbeiter die Aussenmasse des Geschosses eintrug --, blieb die
         alte Wandflaeche stehen: das neue Mass wurde gerechnet, angezeigt und
         nirgends verwendet. */
      /* Und die Zahl der Fenster aus der zweiten Lesung, die in diesem Stand
         stecken. Ohne sie kann die Probe oben nicht erkennen, dass eine
         inzwischen gewachsene Zuteilung noch nicht gebaut ist. */
      r.bauteile_stand = { A: num(r.A, 0), h: num(r.h, 0),
                           wl: num(wandlaengeJeRaum[String(r.id || r.name)], 0),
                           wlq: String(wandlaengeGrund[String(r.id || r.name)] || ""),
                           um: num(r.umfang_m, 0), aw: num(r.aussenwand_m, 0),
                           fensterZusatz: Math.max(0, num(fZusatz, 0)) };
    }
    (erg.fragen || []).forEach(function (t) {
      fragen.push({ thema: "Bauteile", raum: r.name, frage: t });
    });
  });

  /* DIE FENSTERPROBE UEBER DAS GANZE GEBAEUDE.
   *
   * Sie steht hier und nicht oben bei KF.fensterFuerProjekt, weil sie zwei
   * Dinge braucht, die es dort noch nicht gibt: die Wandlaengen aus dem
   * Umfangsabgleich (sonst rechnet sie die Fassade wieder aus derselben
   * Raumflaeche, aus der auch die Fensterflaeche stammt -- und prueft sich
   * selbst) und die Fenster, die die zweite Lesung nachtraegt.
   * Herleitung der Grenzen: KERN_FENSTER.huellenprobe. */
  if (KF && KF.huellenprobe && raeumeGerechnet.length) {
    try {
      /* Das Bezugsmass fuer die Ansicht: die groesste Aussenbreite, die die
         zweite Lesung an einem gezeichneten Grundriss abgelesen hat. Eine
         Ansicht zeigt die breiteste Seite des Gebaeudes, und die
         Aussenbemassung ist die einzige Strecke, die auf dem Blatt
         angeschrieben dasteht. Steht an der Ansicht selbst ein Mass, hat es
         Vorrang (breite_bezug_m). Ohne beides entsteht keine Flaeche und
         damit auch kein Befund -- geraten wird nichts. */
      let fassadenbreite = 0;
      ((App.p.plan && App.p.plan.seiten) || []).forEach(function (s) {
        if (s.verwenden === false || !s.uebernommen) return;
        (s.gegenprobeEbenen || []).forEach(function (e) {
          const bR = num(e.aussen_breite_m, 0);
          if (bR > fassadenbreite) fassadenbreite = bR;
        });
      });
      /* DIE GERECHNETEN FLAECHEN, NICHT ZWEI NEU GEBILDETE.
         Die Probe hat bis zum 26.08.2026 ihre Fensterflaeche und ihre
         Fassade selbst noch einmal hergeleitet und damit ein anderes
         Gebaeude geprueft als das, das im Ergebnis steht (Blatt „260514
         Dumach 1": 29,18 m² auf 215,93 m² gegen 45,8 m² auf 316,2 m²).
         Hier steht, was WIRKLICH gerechnet wird: die Bauteile der Raeume,
         Fenster und Tueren mitgezaehlt, wie sie in die Bilanz eingehen. */
      const gerechnetJeRaum = {};
      App.p.raeume.forEach(function (r) {
        let f = 0, w = 0;
        (r.bauteile || []).forEach(function (bt) {
          const A = num(bt.A, 0);
          if (!(A > 0)) return;
          const aussen = !bt.grenzt_an || bt.grenzt_an.typ === "aussen";
          if (bt.art === "fenster") { f += A; w += A; }
          else if (bt.art === "tuer" && aussen) { w += A; }
          else if (bt.art === "aussenwand" && aussen) { w += A; }
        });
        /* AUCH DIE NULL GEHOERT DAZU. Ein Kellerraum, dessen Waende alle
           gegen das Erdreich rechnen, hat KEINE Fassade — traegt er hier
           nichts ein, faellt er in den alten Weg zurueck und seine Waende
           zaehlen doch wieder mit (Ziolkowski: 69,6 m² Kellerwand in der
           Fassade der Fensterprobe, die im Modell keine Fassade ist). */
        if ((r.bauteile || []).length) {
          gerechnetJeRaum[String(r.id || r.name)] = { A_fenster: f, A_fassade: w };
        }
      });
      const hp = KF.huellenprobe(raeumeGerechnet,
        { wandlaenge_je_raum: wandlaengeJeRaum,
          gerechnet_je_raum: gerechnetJeRaum,
          ansichten: App.p.ansichten || [],
          fassadenbreite_m: fassadenbreite });
      App.p.huellenprobe = {
        A_fenster_m2: hp.A_fenster_m2, A_fassade_m2: hp.A_fassade_m2,
        anteil: hp.anteil, A_ngf_aufenthalt_m2: hp.A_ngf_aufenthalt_m2,
        A_fenster_aufenthalt_m2: hp.A_fenster_aufenthalt_m2,
        A_angenommen_m2: hp.A_angenommen_m2,
        raeume_ohne_fenster: hp.raeume_ohne_fenster,
      };
      App.p.fensterbefunde = (App.p.fensterbefunde || []).concat(hp.befunde);
      /* EIN HINWEIS IST KEINE OFFENE FRAGE.
       *
       * Hier landete jeder Befund der Huellenprobe, der nicht "gut" war, als
       * offene Frage in der Liste zum Abarbeiten -- auch der Befund
       * "breiten_ungelesen", der nur sagt, WORAUF die Fensterflaeche beruht:
       * auf dem angenommenen Flaechenanteil statt auf einer im Plan
       * gelesenen Breite. Steht im Plan keine Breite, kann daran am
       * Bildschirm niemand etwas aendern; die Zeile stand auf jedem solchen
       * Blatt und war nie zu schliessen. Genau dafuer gibt es art "grenze":
       * die Aussage geht nicht verloren, sie steht im Bericht unter "Was
       * diese Berechnung nicht belegt" statt in der Aufgabenliste.
       * Eine Sperre und eine Warnung bleiben Befunde -- dort ist etwas zu
       * tun, und dort hat es der Bearbeiter in der Hand.
       * Dieselbe Trennung gilt schon oben bei KF.fensterFuerProjekt. */
      (hp.befunde || []).forEach(function (b) {
        if (b.stufe === "gut") return;
        fragen.push({ thema: "Fenster", frage: b.text || b.titel,
                      art: (b.stufe === "hinweis") ? "grenze" : undefined });
      });
    } catch (e) {
      fragen.push({ thema: "Fenster", frage: "Die Fensterprobe über das ganze "
        + "Gebäude ist fehlgeschlagen (" + String((e && e.message) || e)
        + "). Es bleibt bei der Prüfung Raum für Raum, und die findet eine "
        + "fehlende Öffnung nicht." });
    }
  }

  // Unbeheizte Bereiche anlegen, wenn Bauteile darauf verweisen
  const brauchtZone = {};
  App.p.raeume.forEach(function (r) {
    (r.bauteile || []).forEach(function (b) {
      if (b.grenzt_an && b.grenzt_an.typ === "zone") brauchtZone[b.grenzt_an.ref] = true;
    });
  });
  Object.keys(brauchtZone).forEach(function (id) {
    if (App.p.zonen.some(function (z) { return z.id === id; })) return;
    /* Vorbelegt mit einer Lage aus DIN/TS 12831-1:2020-04, Tabelle 5, nicht
       mit dem Bilanzweg. Grund, gemessen: der Bilanzweg besteht bei einer
       Zone ohne eigene Hüllbauteile allein aus den angrenzenden beheizten
       Räumen, ergibt genau deren 20,0 °C und damit 0 W durch Kellerdecke und
       oberste Geschossdecke — an einem echten Projekt 118,1 m² mit 0 W.
       Mit einer Lage entsteht sofort ein plausibles Ergebnis; sie ist als
       Annahme gekennzeichnet und im Expertenmodus zu ändern. */
    const istKeller = id === "keller";
    App.p.zonen.push({
      id: id, modus: "lage", huelle: [],
      lage: istKeller ? "keller_mit_oeffnung" : "dach_geschlossen_undicht",
      lage_angenommen: true,
      name: istKeller ? "Unbeheizter Keller" : "Unbeheizter Dachraum",
    });
    /* art: "grenze" -- das ist eine benannte Annahme des Werkzeugs mit
       Fundstelle, keine Aufgabe fuer den Bearbeiter. Sie entsteht auf jedem
       Projekt, auf dem eine Zone selbsttaetig angelegt wird, und niemand
       kann sie am Bildschirm schliessen. Deshalb steht sie im Bericht unter
       "Was diese Berechnung nicht belegt" und nicht in der Liste zum
       Abarbeiten (modul_kontrollblatt, zaehlerOffeneFragen). */
    fragen.push({ thema: "Unbeheizter Bereich", art: "grenze",
      frage: "Für „" + (istKeller ? "Unbeheizter Keller" : "Unbeheizter Dachraum")
        + "“ ist die Lage „" + (istKeller ? "Keller mit Öffnungen nach außen"
          : "geschlossener, nicht luftdichter Dachraum") + "“ angenommen "
        + "(DIN/TS 12831-1:2020-04, Tabelle 5). Die Temperatur des Bereichs "
        + "folgt daraus und geht in jede angrenzende Fläche ein.",
      abhilfe: "Die Lage des Bereichs im Expertenmodus prüfen, oder seine "
        + "eigenen Bauteile eintragen; dann wird statt der Tabelle bilanziert." });
  });

  /* Fragen nur einmal sammeln, sonst wachsen sie bei jedem Durchlauf.
   *
   * DER ABGLEICH NACH THEMA, und warum der nach WORTLAUT nicht reicht.
   * Ein Befund, dessen Text sich aendert, stand danach zweimal da. GEMESSEN
   * im Browser am Blatt "BV 2-0887 Ziolkowski" (23.08.2026): nach Eintragen
   * der Aussenmasse des Erdgeschosses rechnete das Obergeschoss seinen
   * Umfang aus dem EG statt aus dem KG hoch. Der neue Befund nannte andere
   * Zahlen, der alte blieb stehen -- "Außenwände OG" zweimal, einmal mit
   * einer Herleitung, die nicht mehr gilt. Ein ueberholter Befund ist so
   * falsch wie ein fehlender.
   * Themen, die dieser Durchlauf neu bildet, werden deshalb vorher aus der
   * Liste genommen. Betroffen sind nur Themen, die HIER entstehen; alles
   * andere bleibt unberuehrt. */
  const neueThemen = {};
  fragen.forEach(function (x) { if (x && x.thema) neueThemen[x.thema] = true; });
  const behalten = (App.p.offeneFragen || []).filter(function (x) {
    return !(x && x.thema
      && (neueThemen[x.thema] || zustaendigeThemen[x.thema]));
  });
  const bekannt = {};
  behalten.forEach(function (x) { bekannt[x.frage] = true; });
  App.p.offeneFragen = behalten.concat(
    fragen.filter(function (x) { return !bekannt[x.frage]; }));
  /* WELCHE AUSSENMASSE IN DIESEN BAUTEILEN STECKEN.
     Die Weiche in automatischErgaenzen() kann den Geschossumfang nicht
     selbst nachrechnen — er entsteht erst hier. Sie vergleicht deshalb
     diesen Fingerabdruck: ändert sich das Außenmaß eines Geschosses, ist
     jede daraus gebildete Wandfläche überholt. Siehe massstandJetzt(). */
  App.p.bauteile_massstand = massstandJetzt(App.p);
  return erzeugt;
}

/** Der Fingerabdruck der Außenmaße, aus denen die Bauteile gebildet wurden.
 *
 *  WOZU. Ein übernommener Vorschlag „EG 8,00 × 12,50 m übernehmen" schrieb
 *  bis zum 26.08.2026 nur p.geschossmasse und war damit fertig. Neu gebildet
 *  wurden die Bauteile erst, wenn sich Raumfläche, Raumhöhe oder Fensterzahl
 *  eines Raums geändert hatten — der Geschossumfang steht in dieser Weiche
 *  nicht. GEMESSEN an vier Blattsätzen (Ziolkowski, Hasenberg 10, Dumach 1,
 *  P2211): der Vorschlag meldete „1 Geschoss mit den abgelesenen Außenmaßen
 *  belegt", Transmission und Heizlast blieben auf das Watt gleich. Der
 *  Handweg über die Maßfelder rief bauteileErgaenzen() ausdrücklich auf und
 *  wusste das (Kommentar dort); der Vorschlagsweg tat es nicht.
 *
 *  Verglichen wird der Wortlaut der Maße, nicht ihre Wirkung: das ist die
 *  Angabe, die der Bearbeiter ändert, und sie ist billig zu vergleichen. */
function massstandJetzt(p) {
  const gm = (p && p.geschossmasse) || {};
  return Object.keys(gm).sort().map(function (g) {
    const e = gm[g] || {};
    return g + ":" + num(e.breite_m, 0) + "x" + num(e.tiefe_m, 0);
  }).join("|");
}

/* --------------------------------------------------------------------------
 * Schritt 1: Pläne ablegen
 * ----------------------------------------------------------------------- */
/* ===========================================================================
 * Rückfragen — Schritt 2 des Normalablaufs
 * ===========================================================================
 * Die Produktregel: Jede Frage muss vorher die Prüfung bestehen — lässt sich
 * die Information aus den Unterlagen selbst ermitteln oder sinnvoll
 * vorbelegen? Wenn ja: nicht fragen (das erledigt automatischErgaenzen).
 * Wenn wahrscheinlich: Wert vorschlagen und bestätigen lassen. Nur wenn
 * nein: fragen. Und: EINE URSACHE = EINE FRAGE — nicht sieben Räume ohne
 * Höhe, sondern einmal „Raumhöhe Erdgeschoss, betrifft 7 Räume".
 *
 * Die Liste erfindet keine neue Wahrheit. Sie übersetzt, was kern_pruefung
 * (über App.pruefung, samt der Zähler des Kontrollblatts), die Höhenzuordnung
 * und die offenen Fragen der Auslese schon wissen, in Fragen an den
 * Bearbeiter. Standardwerte werden benannt, nicht abgefragt.
 * ======================================================================== */
/* Die Zeilen des Kontrollblatts mit allem, was eine Antwort braucht: frage
 * (das Eingabefeld samt Pfad), aktionen (die Knöpfe, die dort landen, wo sie
 * heute landen), ist/soll/quelle_soll (der Widerspruch) und aufhebbar. Der
 * Spiegel dieser Zeilen in kern_pruefung (gruppe "kontrollblatt") kennt davon
 * nichts — darum werden hier die Originale geholt. Hinweise fragen nichts und
 * bleiben draußen; Grenzen filtert zaehler() selbst. */
function rueckfragenKbZeilen() {
  const KB = window.MODUL_KONTROLLBLATT;
  if (!KB) return [];
  let zn = [];
  try { zn = KB.zaehler(App.p, {}) || []; } catch (e) { return []; }
  return zn.filter(function (z) {
    return z.stufe === "fehler" || z.stufe === "warnung" || z.stufe === "offen";
  });
}

/* Die Ordnung des Kunden: Sperren zuerst (ohne sie keine Rechnung), dann
 * Widersprüche (eine der beiden Angaben stimmt), dann offene Angaben, dann
 * bestätigbare Annahmen. */
const RF_RANG = { sperre: 0, widerspruch: 1, angabe: 2, annahme: 3 };

/** Ein Widerspruch ist mechanisch erkennbar: die Zeile stellt zwei bezifferte
 *  Aussagen aus benannten Quellen gegeneinander, oder das Kontrollblatt hat
 *  ihr den Ein-Klick-Weg bereits entzogen (aufhebbar false). Dieselbe Regel
 *  wie in modul_kontrollblatt.widersprichtSich — nicht nachgebaut, sondern
 *  über aufhebbar übernommen; der Zahlenvergleich hier fängt nur die Zeilen,
 *  die aufhebbar ausdrücklich gelockert haben. */
function rueckfragenKategorie(z) {
  if (z.stufe === "fehler") return "sperre";
  if (z.aufhebbar === false) return "widerspruch";
  const i2 = Number(z.ist), s2 = Number(z.soll);
  if (z.ist !== null && z.soll !== null && Number.isFinite(i2) && Number.isFinite(s2)
      && Math.abs(i2 - s2) > 1e-9 && String(z.quelle_soll || "").trim()) {
    return "widerspruch";
  }
  return "angabe";
}

/* EINE URSACHE = EINE FRAGE. Gebündelt wird IN DER FRAGENLISTE, nicht in den
 * Prüfzeilen: die interne Sicht (Kontrollblatt, Bericht) behält jede
 * Einzelzeile. Der Schlüssel ist der Zeilentitel ohne Geschosskürzel —
 * „Außenwände EG" und „Außenwände OG" sind dieselbe Ursache an zwei Orten
 * und werden EINE Frage „Außenwände EG und OG". */
const RF_GESCHOSS = /\b(?:\d+\.\s*)?(?:KG|UG|EG|OG|DG|ZG)\b/g;

function rueckfragenOrte(zs) {
  const raus = [];
  zs.forEach(function (z) {
    (String(z.titel || "").match(RF_GESCHOSS) || []).forEach(function (g) {
      if (raus.indexOf(g) < 0) raus.push(g);
    });
  });
  /* Von unten nach oben, wie man ein Haus liest — nicht in der zufälligen
     Reihenfolge, in der die Zeilen sortiert wurden. */
  const RANG_ORT = { KG: 0, UG: 0, EG: 1, OG: 2, DG: 3, ZG: 4 };
  return raus.sort(function (a, b) {
    const ka = (a.match(/KG|UG|EG|OG|DG|ZG/) || [""])[0];
    const kb = (b.match(/KG|UG|EG|OG|DG|ZG/) || [""])[0];
    const d = (RANG_ORT[ka] !== undefined ? RANG_ORT[ka] : 9)
            - (RANG_ORT[kb] !== undefined ? RANG_ORT[kb] : 9);
    return d !== 0 ? d : String(a).localeCompare(String(b), "de");
  });
}

/** Baut aus einem Ursachen-Bündel von Kontrollblattzeilen EINE Frage im
 *  Muster des Kunden: Kontext (was das Werkzeug weiß und woher — das sind
 *  die Zeilentexte selbst), dann Antworten zum Anklicken, die
 *  wahrscheinlichste zuerst. Die Antworten landen dort, wo sie heute schon
 *  landen: die Zeilen-Aktionen im Kontrollblatt-Verteiler (kbZoneAnlegen,
 *  kbGeschossAnnehmen, ...), das Wertfeld in MODUL_KONTROLLBLATT.schreiben,
 *  die Kenntnisnahme in zurKenntnis, die Entscheidung über einen Widerspruch
 *  in sperreAufheben — samt der Begründungsfrage, die die Zeile selbst
 *  stellt. Hier entsteht keine neue Datenhaltung, nur die Fassade. */
function rueckfrageAusZeilen(g) {
  const p = App.p;
  const zs = g.zeilen;
  const orte = rueckfragenOrte(zs);
  let titel = orte.length ? g.stamm.replace("*", orte.join(" und ")) : g.stamm;
  titel = titel.replace(/\s*\*\s*/g, " ").replace(/\s+/g, " ").trim();
  const antworten = [];
  /* Wahrscheinlichste Antwort zuerst: der Stand, den das Werkzeug schon hat,
     mit einem Klick bestätigt. Nur bei offenen Angaben — ein Widerspruch und
     eine Sperre sind kein Fall für „Passt so". */
  if (g.kategorie === "angabe" && zs.every(function (z) { return z.aufhebbar !== false; })) {
    antworten.push('<button class="btn primaer" data-aktion="rueckfrageKenntnis"'
      + ' data-rf-ids="' + esc(zs.map(function (z) { return z.id; }).join(",")) + '">'
      + "Passt so — zur Kenntnis genommen</button>");
  }
  zs.forEach(function (z) {
    (z.aktionen || []).forEach(function (a2) {
      antworten.push('<button class="btn" data-aktion="' + esc(a2.aktion)
        + '" data-kb-id="' + esc(z.id) + '"'
        + (a2.data && a2.data.name ? ' data-kb-name="' + esc(a2.data.name) + '"' : "")
        + (a2.data && a2.data.g ? ' data-kb-g="' + esc(a2.data.g) + '"' : "")
        + ">" + esc(a2.text) + "</button>");
    });
  });
  if (((p.plan && p.plan.seiten) || []).some(function (s) { return s.verwenden !== false; })) {
    antworten.push('<button class="btn" data-aktion="rueckfragePlan"'
      + (orte.length ? ' data-rf-geschoss="' + esc(orte[0]) + '"' : "")
      + ">Im Plan anzeigen</button>");
  }
  if (g.kategorie !== "angabe") {
    zs.forEach(function (z) {
      if (z.aufhebbar === false) {
        /* Die Entscheidung mit Vermerk. Der Dialog stellt die Frage der
           ZEILE (begruendung_frage) — bei einem Zahlenpaar also: welche der
           beiden stimmt. Genau der Weg, der heute im Kontrollblatt gilt. */
        /* ZWEI KNÖPFE MIT DEMSELBEN WORTLAUT sind einer zu viel: bei zwei
           gesperrten Zeilen in einer Gruppe stand „Entscheiden und mit
           Vermerk bestätigen" zweimal untereinander, ohne Unterschied
           (Prüflauf P2211). Wo mehr als eine Zeile in der Gruppe steht,
           nennt der Knopf seine Zeile — wie es der Weg „Zur Kenntnis
           nehmen" daneben schon tut. */
        antworten.push('<button class="btn" data-aktion="kbSperreAufheben" data-kb-id="'
          + esc(z.id) + '">'
          + esc(z.begruendung_knopf || "Entscheiden und mit Vermerk bestätigen")
          + (zs.length > 1 && !z.begruendung_knopf ? ": " + esc(z.titel) : "")
          + "</button>");
      } else {
        antworten.push('<button class="btn" data-aktion="rueckfrageKenntnis"'
          + ' data-rf-ids="' + esc(z.id) + '">Zur Kenntnis nehmen'
          + (zs.length > 1 ? ": " + esc(z.titel) : "") + "</button>");
      }
    });
  }
  /* Das Wertfeld der Zeile. Vorbefüllt wird NUR ein bereits abgezählter
     Wert, nie die eigene Zahl des Werkzeugs: diese Felder sind Gegenproben
     (Sollzahl vom Bearbeiter abgezählt), und eine Gegenprobe, die mit der
     ersten Zahl vorbefüllt ist, prüft nichts mehr. */
  let eingaben = zs.filter(function (z) { return z.frage; }).map(function (z) {
    const gespeichert = p.kontrollblatt && p.kontrollblatt.zaehler
      ? p.kontrollblatt.zaehler[z.frage.pfad.replace(/^zaehler\./, "")] : undefined;
    return '<label class="feld"><span>' + esc(z.frage.label)
      + (z.frage.einheit ? " [" + esc(z.frage.einheit) + "]" : "") + "</span>"
      + '<input type="text" inputmode="decimal" data-rf-pfad="' + esc(z.frage.pfad)
      + '" value="' + esc(gespeichert == null ? "" : String(gespeichert)) + '"></label>';
  }).join("");
  /* Geht es um den Geschossumfang (Außenwände aus der Hochrechnung), sind
     die Außenmaße des Geschosses die fehlende Angabe. Dieselben Felder wie
     in der Karte unter „Objekt und Klima" (data-geschossmass), derselbe
     Weg dahinter: bauteileErgaenzen bildet die Außenwandflächen neu. */
  if (/Außenwände/.test(g.stamm)) {
    eingaben += orte.map(function (o2) {
      const m = (p.geschossmasse || {})[o2] || {};
      return '<label class="feld"><span>Außenmaß ' + esc(o2)
        + ' Breite in m</span><input type="text" inputmode="decimal" step="0.01" data-geschossmass="'
        + esc(o2) + ':breite_m" value="'
        + esc(m.breite_m != null ? m.breite_m : "") + '"></label>'
        + '<label class="feld"><span>Außenmaß ' + esc(o2)
        + ' Tiefe in m</span><input type="text" inputmode="decimal" step="0.01" data-geschossmass="'
        + esc(o2) + ':tiefe_m" value="'
        + esc(m.tiefe_m != null ? m.tiefe_m : "") + '"></label>';
    }).join("");
  }
  return { id: "kb_" + zs.map(function (z) { return z.id; }).join("+"),
    kategorie: g.kategorie, titel: titel,
    /* Die Vorschlagspflicht auch hier: eine Sollzahl aus benannter Quelle
       wird zum Wertvorschlag, sonst die Entscheidung, die das Blatt selbst
       anbietet — und wenn zwei bezifferte Quellen einander widersprechen,
       die begründete Ausnahme. */
    vorschlag: vorschlagAusZeilen(g, zs, orte),
    /* ZWEI WORTGLEICHE ABSAETZE untereinander sind einer zu viel. Auf der
       Karte „Außenwände EG und OG" stand derselbe Satz zweimal, und keiner
       der beiden nannte sein Geschoss (Prüflauf Hasenberg, 26.08.2026).
       Gebündelt wird nach Ursache, gelesen wird je Ort: sobald mehr als
       eine Zeile in der Gruppe steht, trägt jeder Absatz den Titel seiner
       Zeile — und was danach immer noch Wort für Wort gleich ist, steht
       einmal. */
    texte: (function () {
      const raus = [], gesehen = {};
      zs.forEach(function (z) {
        const t = String(z.text == null ? "" : z.text).trim();
        if (!t) return;
        const kopf = zs.length > 1 && z.titel
          ? String(z.titel).trim().replace(/[:\s]+$/, "") + ": " : "";
        if (gesehen[kopf + t]) return;
        gesehen[kopf + t] = 1;
        raus.push(kopf + t);
      });
      return raus;
    })(),
    antworten: antworten.join(" "),
    eingabe: eingaben
      + (eingaben
        ? '<label class="feld"><span>Woher stammt die Zahl? (freiwillig)</span>'
          + '<input type="text" data-rf-quelle="1" '
          + 'placeholder="z. B. am Plan abgezählt"></label>'
        : ""),
    weg: [{ titel: "Im Kontrollblatt im Einzelnen", schritt: "kontrolle" }] };
}

/** Wertfelder JE RAUM für eine Rückfrage — dieselben Datenwege wie im
 *  Raumbuch (data-liste="raeume", data-i, data-k), damit eine hier
 *  getippte Zahl genau dort landet, wo die Tabelle sie auch hinschreibt.
 *  data-rf-render sorgt dafür, dass die Rückfragenliste danach neu
 *  gezeichnet wird — sonst bliebe die beantwortete Sperre stehen. */
function raumfelder(p, raeume, k, label) {
  return (raeume || []).map(function (r) {
    const i = (p.raeume || []).indexOf(r);
    if (i < 0) return "";
    const nam = (r.geschoss ? r.geschoss + " " : "") + (r.name || "Raum");
    const kopf = '<label class="feld"><span>' + esc(nam)
      + (label ? " — " + esc(label(r)) : "") + "</span>";
    if (k === "we") {
      return kopf + '<select data-liste="raeume" data-i="' + i
        + '" data-k="we" data-rf-render="1">'
        + '<option value="">– bitte wählen –</option>'
        + (p.einheiten || []).map(function (u) {
            return '<option value="' + esc(u.name) + '"'
              + (u.name === r.we ? " selected" : "") + ">" + esc(u.name)
              + "</option>";
          }).join("")
        + "</select></label>";
    }
    return kopf + '<input type="text" inputmode="decimal" step="0.01"'
      + ' data-liste="raeume" data-i="' + i + '" data-k="' + esc(k)
      + '" data-rf-render="1" value="'
      + esc(r[k] == null || r[k] === 0 ? "" : String(r[k])) + '"></label>';
  }).join("");
}

/** Das Eingabefeld einer bestätigbaren Annahme — dieselben Pfade wie in der
 *  Annahmenkarte unter „Objekt und Klima": wer den richtigen Wert kennt,
 *  trägt ihn ein, und die Annahme fällt weg (annahmeVerwerfen über den
 *  Eingabe-Verteiler). */
function annahmenFeld(a) {
  if (a.schluessel === "baujahr") {
    return feld("Baujahr, wenn bekannt", "meta.baujahr", { typ: "number", min: 1000 });
  }
  if (a.schluessel === "klima") {
    return feld("PLZ des Gebäudes, wenn bekannt", "meta.plz",
      { platzhalter: "fünfstellig, setzt das Klima neu" });
  }
  if (a.schluessel === "hoehe") {
    return (a.geschosse || []).map(function (k) {
      const eigen = (App.p.geschosshoehen || {})[k];
      const stand = (App.p.hoehenStand && App.p.hoehenStand.zuordnung[k]) || {};
      return '<label class="feld"><span>Lichte Höhe ' + esc(k)
        + ' in m</span><input type="text" inputmode="decimal" data-geschosshoehe="'
        + esc(k) + '" value="'
        + esc(eigen != null ? eigen : (stand.lichte_hoehe || "")) + '"></label>';
    }).join("");
  }
  return "";
}

/** Übernimmt Höhen-VORSCHLÄGE in geschosshoehen — und nur dorthin, wo keine
 *  eigene Eingabe steht. DIE HÄRTESTE REGEL DIESES WERKZEUGS: eine Eingabe
 *  des Bearbeiters wird von einem Vorschlag NIE überschrieben. In der
 *  Abnahme vom 24.08.2026 hat genau das gefehlt — die eigenen 2,40 m wurden
 *  vom 2,60-Vorschlag der Zwillingskarte überschrieben, weil der Knopf
 *  seinen beim Zeichnen eingefrorenen Wert bedingungslos schrieb.
 *  @return { uebernommen: [{g, wert}], behalten: [{g, eigen}] } */
function hoehenVorschlaegeUebernehmen(paare) {
  const uebernommen = [], behalten = [];
  App.p.geschosshoehen = App.p.geschosshoehen || {};
  (paare || []).forEach(function (v) {
    if (!v || !v.g || !(v.wert > 0)) return;
    const eigen = App.p.geschosshoehen[v.g];
    if (eigen != null && Math.abs(num(eigen, 0) - v.wert) > 1e-9) {
      behalten.push({ g: v.g, eigen: num(eigen, 0) });
      return;
    }
    App.p.geschosshoehen[v.g] = v.wert;
    uebernommen.push({ g: v.g, wert: v.wert });
  });
  return { uebernommen: uebernommen, behalten: behalten };
}

/* ===========================================================================
 * DIE VORSCHLAGSPFLICHT
 * ===========================================================================
 * Sebastian Hund am 26.08.2026, im Wortlaut: „ich möchte bei allen rückfragen
 * einen vorschlag angezeigt bekommen den man dann annehmen oder ablehnen kann
 * … das muss automatisch gehen."
 *
 * Daraus folgen fünf Regeln, und sie gelten für JEDE Frage:
 *
 *  1  Jede Frage trägt einen Vorschlag — einen konkreten WERT („88,50 m²")
 *     oder eine konkrete ENTSCHEIDUNG („alle der Einheit zuordnen"). Eine
 *     Frage ohne Vorschlag ist die begründete Ausnahme und muss sagen,
 *     warum nichts abzuleiten war (vorschlag.ohne).
 *  2  Zwei gleichwertige Knöpfe, beide ein Klick: [übernehmen] und
 *     [Ablehnen, selbst eintragen]. Ablehnen darf nicht schwerer sein als
 *     Annehmen — gleiche Zeile, gleiche Größe, keine Rückfrage dazwischen.
 *  3  Ein Vorschlag ist ein Vorschlag: er wird ANGEZEIGT, nicht still ins
 *     Feld geschrieben. Deshalb erscheint das Eingabefeld erst NACH dem
 *     Ablehnen. Vorher stünde die Zahl des Werkzeugs im Feld und niemand
 *     könnte sie von einer eigenen Eingabe unterscheiden.
 *  4  Der Vorschlag nennt seine HERKUNFT (Pflicht) und, wo bezifferbar,
 *     seine WIRKUNG: „übernehmen ändert die Heizlast um …". Die Zahl kommt
 *     aus einem zweiten Rechenlauf auf einer Kopie des Projekts — demselben
 *     Weg, den die Bandbreite ohnehin geht.
 *  5  Ein abgelehnter Vorschlag kommt nicht als derselbe Vorschlag wieder.
 *     Die Ablehnung steht mit Wert, Zeit und Bearbeiter in
 *     p.vorschlaege_abgelehnt und wandert mit dem Projekt.
 *
 * DIE HÄRTESTE REGEL DES WERKZEUGS GILT WEITER: ein Vorschlag überschreibt
 * NIE eine Eingabe des Bearbeiters. Jedes anwenden() prüft das selbst.
 * ======================================================================== */

/** Der Ablehnungsvermerk zu einem Vorschlag, oder null. */
function vorschlagAbgelehnt(p, vid) {
  return ((p && p.vorschlaege_abgelehnt) || {})[vid] || null;
}

/** Ein Vorschlag mit Wert. herkunft ist Pflicht — ein Wert ohne Herleitung
 *  ist genau die erfundene Zahl, die es hier nicht geben darf. */
function vorschlagWert(id, knopf, wert, herkunft, anwenden) {
  if (!herkunft) return null;
  return { id: id, art: "wert", knopf: knopf, wert: wert,
           herkunft: herkunft, anwenden: anwenden };
}

/** Ein Vorschlag, der keine Zahl setzt, sondern eine Entscheidung trifft. */
function vorschlagEntscheidung(id, knopf, herkunft, anwenden) {
  if (!herkunft) return null;
  return { id: id, art: "entscheidung", knopf: knopf, wert: knopf,
           herkunft: herkunft, anwenden: anwenden };
}

/** Die begründete Ausnahme: hier ist wirklich nichts abzuleiten. */
function vorschlagOhne(id, grund) {
  return { id: id, art: "ohne", ohne: grund };
}

/** Die Kontur eines Geschosses, wie die zweite Lesung sie von der
 *  Außenbemaßung abgelesen hat — mit Breite, Tiefe, Umfang, Fläche und dem
 *  Wortlaut der Maßkette. Genau die Zahlen, aus denen die Vorschläge für
 *  Außenmaße und Raumflächen entstehen; erfunden ist daran nichts. */
function vorschlagKontur(p, g) {
  let beste = null;
  ((p.plan && p.plan.seiten) || []).forEach(function (s) {
    if (s.verwenden === false) return;
    const blatt = s.bezeichnung || s.name || "einem Blatt";
    const nimm = function (k) {
      if (!k || !(num(k.A, 0) > 0)) return;
      if (!beste || num(k.A, 0) < num(beste.k.A, 0)) beste = { k: k, blatt: blatt };
    };
    if (s.gegenprobeKontur && String(s.geschoss || "").trim() === String(g).trim()) {
      nimm(s.gegenprobeKontur);
    }
    (s.gegenprobeKonturen || []).forEach(function (k) {
      const Z = window.KERN_ZUORDNUNG;
      const passt = String(s.geschoss || "").trim() === String(g).trim()
        || (Z && Z.geschossAusText && k.ebene
            && (Z.geschossAusText(k.ebene) || {}).kuerzel === g);
      if (passt) nimm(k);
    });
  });
  if (!beste) return null;
  const k = beste.k;
  return { A: num(k.A, 0), U: num(k.U, 0), breite_m: num(k.breite_m, 0),
           tiefe_m: num(k.tiefe_m, 0), rechteckig: k.rechteckig !== false,
           blatt: beste.blatt,
           quelle: (k.quelle || "Außenbemaßung") + ", " + beste.blatt };
}

/** Die WIRKUNG eines Vorschlags auf die Heizlast — der zweite Rechenlauf.
 *  Gerechnet wird auf einer KOPIE: App.p wird getauscht, der Vorschlag
 *  angewandt, die Bauteile neu gebildet und der Kern gefragt; danach steht
 *  der echte Stand unverändert zurück (finally). Nichts davon wird
 *  gespeichert, nichts gezeichnet — es ist eine Probe, kein Vollzug.
 *  Gerechnet wird NUR für die gerade angezeigte Frage; 23 Kernläufe je
 *  Tastendruck wären so teuer wie sinnlos. */
function vorschlagWirkung(v) {
  const e0 = App.ergebnis;
  if (!v || v.art === "ohne" || typeof v.anwenden !== "function") return null;
  if (!e0 || e0.fehlerhaft) return null;
  const sicher = App.p;
  let raus = null;
  try {
    const klon = JSON.parse(JSON.stringify(projektFuerAblage(sicher, true)));
    App.p = Object.assign(leeresProjekt(), klon);
    const erg = v.anwenden(App.p, true);
    if (erg && erg.ok !== false) {
      /* DER GANZE WEG, NICHT NUR DIE BAUTEILE JE RAUM.
       *
       * Hier stand allein bauteileErgaenzen(). Das bildet die Bauteile eines
       * Raums aus den VORHANDENEN Bauteiltypen — es rührt die U-Werte nicht
       * an. Ein Vorschlag, der das BAUJAHR setzt, ändert aber genau die:
       * über die Typologie hängt an ihm jeder U-Wert der Hülle. Auf dem Klon
       * blieb die alte Typologie stehen, die Probe fand keinen Unterschied,
       * und darunter stand „Übernehmen ändert die Heizlast nicht spürbar".
       * GEMESSEN am Blatt „Hasenberg 10" (echter Lauf 26.08.2026): der
       * Vorschlag „Baujahr 2025" senkte die Heizlast von 13,69 auf 7,01 kW,
       * also um 48,8 Prozent — angesagt war „nicht spürbar". Genau die
       * Aussage, auf die hin der Bearbeiter klickt, ohne hinzusehen.
       * automatischErgaenzen() geht denselben Weg wie nach dem Übernehmen:
       * Typologie, Höhen, Bauteile, Zonenwände. */
      try { automatischErgaenzen(); } catch (e) {}
      try { bauteileErgaenzen(); } catch (e) {}
      const e1 = K.rechne(projektFuerKern(App.p));
      if (e1 && !e1.fehlerhaft && Number.isFinite(e1.phi_gebaeude)) {
        /* phi_gebaeude steht in WATT. Die Wirkung wird in Kilowatt genannt,
           weil die ganze Oberfläche in Kilowatt spricht — geteilt wird
           genau hier und nur hier. */
        raus = (num(e1.phi_gebaeude, 0) - num(e0.phi_gebaeude, 0)) / 1000;
      }
    }
  } catch (e) {
    raus = null;
  } finally {
    App.p = sicher;
  }
  return raus;
}

/** Der Satz zur Wirkung. Ohne bezifferbare Wirkung wird geschwiegen — ein
 *  „ändert die Heizlast um 0,0 kW" wäre eine Aussage über nichts. */
function vorschlagWirkungssatz(d) {
  if (d === null || !Number.isFinite(d)) return "";
  if (Math.abs(d) < 0.05) return "Übernehmen ändert die Heizlast nicht spürbar.";
  return "Übernehmen ändert die Heizlast um "
    + (d > 0 ? "+" : "−") + fmt(Math.abs(d), 1) + " kW.";
}

/** Zeigt diese Frage ihr Eingabefeld? Ja, wenn es keinen Vorschlag gibt,
 *  wenn der Vorschlag begründet keiner ist, oder wenn er abgelehnt wurde. */
function vorschlagFeldZeigen(f) {
  const v = f.vorschlag;
  if (!v) return true;
  if (v.art === "ohne") return true;
  return !!vorschlagAbgelehnt(App.p, v.id);
}

/** Die Frage zu einer Kennung aus dem laufenden Stand. Die Vorschläge
 *  tragen Funktionen und lassen sich deshalb nicht über das DOM
 *  durchreichen; nachgeschlagen wird über die Frage-Kennung. */
function vorschlagFrage(fid) {
  return rueckfragenStand().fragen.find(function (x) { return x.id === fid; }) || null;
}

/** WOMIT diese Frage überhaupt zu beantworten ist — ein Satzteil, der den
 *  wirklich vorhandenen Weg nennt.
 *
 *  WARUM ES IHN GIBT (Prüflauf vom 26.08.2026, alle fünf Pläne): der
 *  Ablehnungsvermerk sagte an JEDER Frage „der Wert kommt aus dem Feld
 *  darunter" und die Meldung „das Feld für den eigenen Wert steht jetzt
 *  darunter". Bei Fragen ohne eigenes Wertfeld (Fläche, Nutzungseinheit,
 *  jede Entscheidungsfrage) stand darunter kein Feld, sondern nichts — die
 *  Frage war nach dem Ablehnen unbeantwortbar, der Text ein leeres
 *  Versprechen. Ein Werkzeug, das auf sich selbst verweist, muss zuerst
 *  nachsehen, ob es das Genannte auch hinstellt. */
function satzanfang(t) {
  const x = String(t || "");
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
}

function antwortweg(f) {
  if (f && f.eingabe) return "der Wert kommt aus dem Feld darunter.";
  if (f && f.antworten) return "beantwortet wird sie über die Knöpfe darunter.";
  return "beantwortet wird sie über die Wege darunter — hier steht kein "
    + "Eingabefeld, weil diese Frage keinen Zahlenwert entgegennimmt.";
}

/** Der Block unter jeder Frage: der Vorschlag, zwei gleichwertige Knöpfe,
 *  die Herkunft und die Wirkung — oder die begründete Ausnahme. */
function vorschlagBlock(f) {
  const v = f.vorschlag;
  if (!v) return "";
  const weg = vorschlagAbgelehnt(App.p, v.id);
  if (weg) {
    /* Regel 5: derselbe Vorschlag kommt nicht wieder. Was bleibt, ist der
       Vermerk und das Feld, das der Bearbeiter sich erbeten hat. */
    return '<div class="meldung hinweis" style="display:block;margin:0 0 10px">'
      + "<b>Vorschlag abgelehnt</b> — „" + esc(weg.wert) + "“"
      + (weg.zeit ? ", " + esc(zeitDe(weg.zeit)) : "")
      + (weg.wer ? " von " + esc(weg.wer) : "")
      + ". Er wird nicht wieder vorgeschlagen; " + antwortweg(f) + " "
      + '<a href="#" data-aktion="vorschlagZurueckholen" data-vorschlag="'
      + esc(f.id) + '">Doch noch einmal ansehen</a></div>';
  }
  if (v.art === "ohne") {
    /* Die begründete Ausnahme. Sie sagt ausdrücklich, dass es keinen
       Vorschlag gibt, und warum — statt ein leeres Feld hinzustellen und
       den Bearbeiter raten zu lassen, ob das Werkzeug es versucht hat. */
    return '<div class="meldung hinweis" style="display:block;margin:0 0 10px">'
      + "<b>Hierfür gibt es keinen ableitbaren Vorschlag,</b> weil "
      + esc(v.ohne) + " " + satzanfang(antwortweg(f)) + " Das ist die "
      + "Ausnahme, nicht die Regel.</div>";
  }
  const wirkung = vorschlagWirkungssatz(vorschlagWirkung(v));
  return '<div style="background:var(--gruen-wash);border-left:3px solid '
    + 'var(--gruen);border-radius:var(--r-s);margin:0 0 12px;padding:12px 14px">'
    + '<div style="font-size:13px;color:var(--mute);margin:0 0 4px">'
    + "Vorschlag des Werkzeugs</div>"
    + '<div style="font-size:15px;font-weight:600;margin:0 0 6px">'
    + esc(v.wert) + "</div>"
    + '<div style="font-size:12.5px;color:var(--mute);margin:0 0 10px">'
    + "Herkunft: " + esc(v.herkunft)
    + (wirkung ? " · " + esc(wirkung) : "") + "</div>"
    /* ZWEI GLEICHWERTIGE KNÖPFE. Gleiche Zeile, gleiche Größe, je ein Klick.
       Ablehnen ist kein Kleingedrucktes und kein zweiter Dialog. */
    + '<div style="display:flex;flex-wrap:wrap;gap:8px">'
    + (v.aktion
      /* Ein geliehener Weg des Kontrollblatts (kbZoneAngebaut, …). */
      ? '<button class="btn cta" data-aktion="' + esc(v.aktion) + '"'
        + ' data-vorschlag="' + esc(f.id) + '"'
        + Object.keys(v.daten || {}).map(function (k) {
            return v.daten[k] ? ' data-' + esc(k) + '="' + esc(v.daten[k]) + '"' : "";
          }).join("")
        + ">" + esc(v.knopf) + "</button>"
      : '<button class="btn cta" data-aktion="vorschlagUebernehmen"'
        + ' data-vorschlag="' + esc(f.id) + '">' + esc(v.knopf) + "</button>")
    + '<button class="btn" data-aktion="vorschlagAblehnen"'
    + ' data-vorschlag="' + esc(f.id) + '">Ablehnen, selbst eintragen</button>'
    + "</div></div>";
}

/* ---------------------------------------------------------------------------
 * DIE ABLEITUNGEN — woher der Vorschlag je Frage kommt
 * ------------------------------------------------------------------------
 * Jede Ableitung greift auf einen Wert zurück, der SCHON GELESEN IST, und
 * nennt das Blatt, von dem er stammt. Wo verteilt statt gemessen wird, sagt
 * die Herkunft ausdrücklich „Verteilung", damit niemand eine Verteilung für
 * ein Aufmaß hält.
 * ---------------------------------------------------------------------- */

/** Räume ohne Grundfläche. Die Kette des Kunden beginnt hier: keine Fläche
 *  → kein Bauteil → 0,00 kW → Umfang ohne Empfänger.
 *
 *  WAS SICH AM 26.08.2026 GEÄNDERT HAT. Die erste Fassung verteilte die
 *  Geschossfläche GLEICHMÄSSIG: „je 8,73 m²" für das WC wie für den
 *  Wohn-/Essbereich. Gegen 51 Räume aus acht Geschossen dreier echter Pläne
 *  gerechnet liegt eine gleichmäßige Verteilung im Median 25,7 % daneben,
 *  eine nach der Raumart 14,0 %. Verteilt wird deshalb nach der Raumart, und
 *  wo das Blatt die Fassadenlänge eines Raums anschreibt, nach diesem Maß.
 *  Die Regel, ihre Herleitung und der Prüfsatz stehen in KERN_FLAECHE; hier
 *  wird nur zugeliefert und der Vorschlag gebaut.
 *
 *  Der Wandabzug kommt aus MODUL_KONTROLLBLATT.wanddicke — dieselbe Zeile
 *  A − U·d + 4·d² und dieselbe Wanddickenspanne, mit der die Restflächenprobe
 *  rechnet. Zwei Wege für dieselbe Sache driften auseinander. */
function flaechenkette(p) {
  const KF = window.KERN_FLAECHE, KB = window.MODUL_KONTROLLBLATT;
  if (!KF) return null;
  return KF.kette(p.raeume || [], {
    kontur: function (g) {
      const k = vorschlagKontur(p, g);
      return k && k.A > 0 ? { A: k.A, U: k.U, quelle: k.quelle } : null;
    },
    wanddicke: (KB && KB.wanddicke) ? KB.wanddicke(p) : null,
  });
}

function vorschlagFlaeche(p, ohneA) {
  const kette = flaechenkette(p);
  /* KEIN null: eine Frage ohne jeden Vorschlag ist der Zustand, den
     Sebastian am 26.08.2026 abgeschafft hat. Fällt die Flächenkette aus,
     ist das die BEGRÜNDETE Ausnahme — sie sagt es und nennt den Grund,
     statt stumm ein leeres Feld zu hinterlassen. */
  if (!kette) {
    return vorschlagOhne("flaeche",
      "die Flächenermittlung in diesem Lauf nicht zur Verfügung steht. Ohne "
      + "sie lässt sich aus der Außenbemaßung keine Raumfläche verteilen; "
      + "die Flächen müssen am Plan abgegriffen werden.");
  }
  const offen = (ohneA || []).filter(function (r) { return !!kette.je_raum[r.id]; });
  if (!offen.length) {
    const grund = (kette.ohne[0] && kette.ohne[0].grund)
      || "auf keinem Blatt eine Außenbemaßung steht, aus der sich die Fläche "
       + "eines Geschosses ergäbe, und in den Räumen kein Flächenstempel "
       + "gelesen wurde. Ohne eines von beidem lässt sich eine Grundfläche "
       + "nicht ableiten — sie muss am Plan abgegriffen werden.";
    return vorschlagOhne("flaeche", grund);
  }
  /* Der Knopf nennt die Spanne, nicht 14 Einzelzahlen: „8 Räume in EG,
     2,79 bis 18,49 m²". Was jeder einzelne Raum bekommt, steht darunter. */
  const jeG = {};
  offen.forEach(function (r) {
    const t = kette.je_raum[r.id];
    (jeG[t.geschoss] = jeG[t.geschoss] || []).push({ r: r, t: t });
  });
  const knopfteile = [], werttexte = [], quellen = [];
  Object.keys(jeG).forEach(function (g) {
    const rs = jeG[g].slice().sort(function (a, b) { return b.t.A - a.t.A; });
    const gs = kette.geschosse.find(function (x) { return x.geschoss === g; });
    knopfteile.push(mz(rs.length, "Raum", "Räume") + " in " + g + ", "
      + fmt(rs[rs.length - 1].t.A, 2) + " bis " + fmt(rs[0].t.A, 2) + " m²");
    werttexte.push(g + ": " + rs.map(function (x) {
      return (x.r.name || "Raum") + " " + fmt(x.t.A, 2) + " m²";
    }).join(", "));
    if (gs) quellen.push(gs.innen.quelle);
  });
  const ersteHerleitung = kette.je_raum[offen[0].id].herleitung;
  return vorschlagWert("flaeche", knopfteile.join(" · ") + " übernehmen",
    werttexte.join(" · "),
    ersteHerleitung + " Quelle: " + (quellen.join(" · ") || "Außenbemaßung")
      + ". VERTEILUNG der belegten Geschossfläche nach Raumart, kein "
      + "gemessener Raumwert — jeder so gesetzte Raum steht im Bericht als "
      + "Annahme und läuft in der Bandbreite mit.",
    function (ziel) {
      const KB = window.MODUL_KONTROLLBLATT;
      /* Neu gerechnet auf dem ZIEL, nicht auf App.p: die Wirkungsprobe legt
         eine Kopie an, und ein Vorschlag muss auf ihr dasselbe tun. */
      const k2 = flaechenkette(ziel) || kette;
      let n = 0;
      ziel.raeume.forEach(function (r) {
        const t = k2.je_raum[r.id];
        if (!t) return;
        if (num(r.A, 0) > 0) return;              // nie eine Eingabe überschreiben
        const pfad = "raum." + r.id + ".A";
        if (KB) {
          KB.schreiben(ziel, pfad, t.A, t.herkunft);
          /* KB.schreiben ist der Weg für eine EINGABE und vermerkt sie als
             „eingabe, sicher, gesehen". Das ist hier beides falsch: niemand
             hat diese Zahl eingegeben, und niemand hat den Raum angesehen.
             Der Vermerk wird deshalb sofort auf das gesetzt, was zutrifft —
             sonst zählte eine verteilte Fläche als nachgewiesen und der Raum
             als durchgegangen. */
          const h = ziel.herkunft && ziel.herkunft[pfad];
          if (h) {
            h.herkunft = "verteilung";
            h.konfidenz = "unsicher";
            h.quelle = t.herkunft;
            h.fundstelle = t.herleitung;
          }
          const ges = ziel.kontrollblatt && ziel.kontrollblatt.gesehen;
          if (ges) { delete ges[pfad]; delete ges["raum." + r.id]; }
        } else { r.A = t.A; }
        /* Als Annahme kenntlich — für Bericht, Konfidenz und Bandbreite.
           KERN_BANDBREITE liest A_annahme und die Spanne aus A_spanne. */
        r.A_annahme = true;
        r.A_spanne = [t.A_min, t.A_max];
        r.A_vorschlag = { wert: t.A, quelle: t.herkunft, art: "verteilung" };
        if (!r.herkunft) r.herkunft = {};
        r.herkunft.flaeche_gelesen = false;
        r.herkunft.flaeche_quelle = t.herkunft;
        r.herkunft.flaeche_herleitung = t.herleitung;
        r.herkunft.flaeche_spanne = [t.A_min, t.A_max];
        r.herkunft.konfidenz = "unsicher";
        n++;
      });
      return { ok: n > 0, text: mz(n, "Raum", "Räume") + " mit einer nach "
        + "Raumart verteilten Geschossfläche belegt — als Annahme vermerkt, "
        + "mit Spanne im Bericht." };
    });
}

/** Außenmaße eines Geschosses. Der Umfang wurde gelesen (38,60 m aus
 *  11,80 × 7,50) und auf nichts verteilt, weil die Räume keine Fläche haben.
 *  Breite und Tiefe stehen strukturiert in der Kontur der zweiten Lesung —
 *  das ist ein GEMESSENER Wert, keine Schätzung. */
function vorschlagAussenmasse(p, orte) {
  const teile = [];
  /* WAS DER ABGLEICH NACHHER VERWIRFT, WIRD HIER NICHT ANGEBOTEN.
   *
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echte Läufe 23. und
   * 26.08.2026): die zweite Lesung gibt dem Erdgeschoss 11,50 × 6,00 m =
   * 69,00 m², die Räume darin haben zusammen 74,72 m². Der Vorschlag
   * „11,50 × 6,00 m übernehmen" wurde angeboten, meldete beim Klick „1
   * Geschoss mit den abgelesenen Außenmaßen belegt" — und der
   * Umfangsabgleich warf die Kontur wortlos wieder weg, weil sie kleiner
   * ist als ihr eigener Inhalt. Wandfläche und Heizlast blieben auf das
   * Watt gleich, die Frage blieb offen, der Bearbeiter hatte einen Klick
   * und eine Erfolgsmeldung. Geprüft wird mit derselben Schranke, an der
   * der Abgleich entscheidet (KERN_ZUORDNUNG.konturBrauchbar). */
  const Zk = window.KERN_ZUORDNUNG;
  const verworfen = [];
  orte.forEach(function (g) {
    const k = vorschlagKontur(p, g);
    if (!k || !(k.breite_m > 0) || !(k.tiefe_m > 0)) return;
    const eigen = (p.geschossmasse || {})[g] || {};
    if (num(eigen.breite_m, 0) > 0 && num(eigen.tiefe_m, 0) > 0) return;
    if (Zk && Zk.konturBrauchbar) {
      let A_raeume = 0;
      (p.raeume || []).forEach(function (r) {
        if (String(r.geschoss || "") === String(g)) A_raeume += num(r.A, 0);
      });
      const kb = Zk.konturBrauchbar(k.breite_m * k.tiefe_m, A_raeume);
      if (!kb.ok) {
        verworfen.push(g + ": " + fmt(k.breite_m, 2) + " × " + fmt(k.tiefe_m, 2)
          + " m, " + kb.grund);
        return;
      }
    }
    teile.push({ g: g, k: k });
  });
  if (!teile.length) {
    if (verworfen.length) {
      return vorschlagOhne("aussenmasse_" + orte.join("_"),
        "die abgelesene Außenkontur nicht zu den Räumen dieses Geschosses "
        + "passt und der Umfangsabgleich sie deshalb verwerfen würde — "
        + verworfen.join("; ") + ". Ein Vorschlag, der an der Rechnung nichts "
        + "ändert, wäre ein Klick ohne Wirkung. Gebraucht wird das Außenmaß "
        + "vom Plan.");
    }
    return null;
  }
  return vorschlagWert("aussenmasse_" + orte.join("_"),
    teile.map(function (t) {
      return (teile.length > 1 ? t.g + " " : "") + fmt(t.k.breite_m, 2)
        + " × " + fmt(t.k.tiefe_m, 2) + " m";
    }).join(", ") + " übernehmen",
    teile.map(function (t) {
      return t.g + ": " + fmt(t.k.breite_m, 2) + " × " + fmt(t.k.tiefe_m, 2)
        + " m, Umfang " + fmt(t.k.U, 2) + " m";
    }).join(" · "),
    teile.map(function (t) { return t.k.quelle; }).join(" · ")
      + " — von der äußersten Maßkette abgelesen, nicht geschätzt.",
    function (ziel) {
      ziel.geschossmasse = ziel.geschossmasse || {};
      let n = 0;
      teile.forEach(function (t) {
        const e = ziel.geschossmasse[t.g] || {};
        if (num(e.breite_m, 0) > 0 && num(e.tiefe_m, 0) > 0) return;
        ziel.geschossmasse[t.g] = { breite_m: t.k.breite_m, tiefe_m: t.k.tiefe_m,
          quelle: t.k.quelle };
        n++;
      });
      return { ok: n > 0, text: mz(n, "Geschoss", "Geschosse")
        + " mit den abgelesenen Außenmaßen belegt." };
    });
}

/** Der allgemeine Weg für eine Kontrollblatt-Gruppe: hat eine Zeile eine
 *  bezifferte SOLL-Zahl aus benannter Quelle, ist genau das der Vorschlag —
 *  „38,60 m übernehmen", Herkunft „Außenbemaßung ERDGESCHOSS, Seite 2".
 *  Hat sie ein Wertfeld (frage.pfad), landet die Zahl dort; sonst wird der
 *  Sollwert als abgezählter Wert vermerkt. */
/** Zahl mit Einheit, wie sie auf dem Knopf und im Vermerk steht. Eine
 *  Stückzahl bekommt keine Nachkommastellen und die richtige Zahlform —
 *  gerechnet wird das an EINER Stelle, im Kontrollblatt, das dieselben
 *  Einheiten vergibt. */
function menge(wert, einheit) {
  const KB = window.MODUL_KONTROLLBLATT;
  if (KB && KB.mengeText) return KB.mengeText(wert, einheit);
  return fmt(wert, 2) + (einheit ? " " + einheit : "");
}

function vorschlagAusZeilen(g, zs, orte) {
  const p = App.p;
  const vid = "kb_" + zs.map(function (z) { return z.id; }).join("+");
  /* Gesetzt, wenn ist und soll wirklich auseinanderliegen: dann gibt es
     keinen Vermerk-Knopf, aber vielleicht einen Weg. Siehe unten. */
  let klaffend = null;
  /* Außenwände: der Umfang gehört keinem Raum. Die Außenmaße sind die
     Angabe, die wirklich fehlt — und sie stehen auf dem Blatt. */
  if (/Außenwände|Außenmaß|Umfang/.test(g.stamm)) {
    const v = vorschlagAussenmasse(p, orte);
    if (v) return v;
  }
  /* EINE SPERRE MIT EIGENEM WEG WIRD NICHT WEGGEHAKT.
   *
   * Bietet eine gesperrte Zeile selbst eine Aktion an, ist SIE der
   * Vorschlag — nicht das Anerkennen ihrer Sollzahl. GEMESSEN am Blatt
   * „BV 2-0887 Ziolkowski" (echter Lauf 26.08.2026): die Zeile „Beheizt
   * oder unbeheizt: KELLERGESCHOSS" trägt ist = 2 Räume, soll = 0 und die
   * Aktion „unbeheizt — Bereich anlegen". Vorgeschlagen wurde „0,00 Räume
   * als richtig anerkennen"; ein Klick darauf hob die Sperre mit einem
   * Vermerk auf, ließ die beiden Räume mit 39,19 m² aber unverändert
   * beheizt im Raumbuch stehen. Der Widerspruch war weg, die Rechnung
   * unverändert falsch. Der Weg der Zeile ändert dagegen wirklich etwas. */
  const mitAktSperre = zs.filter(function (z) {
    return z.aufhebbar === false && (z.aktionen || []).length;
  });
  const mitSoll = mitAktSperre.length ? [] : zs.filter(function (z) {
    return Number.isFinite(Number(z.soll)) && z.soll !== null
      && String(z.quelle_soll || "").trim();
  });
  if (mitSoll.length) {
    const z = mitSoll[0];
    const einheit = (z.frage && z.frage.einheit) || z.einheit || "";
    /* Eine Stückzahl wird auf die ganze Zahl gerundet — sie wird gezählt,
       nicht gemessen; "17,00 Fenster" war eine Messgenauigkeit, die es
       hier nicht gibt. */
    const KBm = window.MODUL_KONTROLLBLATT;
    const stueck = !!(KBm && KBm.zaehleinheit && KBm.zaehleinheit(einheit));
    const wert = stueck ? Math.round(Number(z.soll))
      : Math.round(Number(z.soll) * 100) / 100;
    if (z.frage && z.frage.pfad) {
      return vorschlagWert(vid, menge(wert, einheit) + " übernehmen",
        (z.frage.label || z.titel) + ": " + menge(wert, einheit),
        String(z.quelle_soll),
        function (ziel) {
          const KB = window.MODUL_KONTROLLBLATT;
          const pfad = z.frage.pfad.replace(/^zaehler\./, "");
          const da = ziel.kontrollblatt && ziel.kontrollblatt.zaehler
            ? ziel.kontrollblatt.zaehler[pfad] : undefined;
          if (da !== undefined && da !== null && da !== "") {
            return { ok: false, text: "Es steht schon ein eigener Wert im Feld — "
              + "ein Vorschlag überschreibt keine Eingabe." };
          }
          if (KB) KB.schreiben(ziel, z.frage.pfad, wert, String(z.quelle_soll));
          return { ok: true, text: (z.frage.label || z.titel) + " auf "
            + menge(wert, einheit) + " gesetzt." };
        });
    }
    /* Kein Wertfeld: dann ist der Vorschlag die ENTSCHEIDUNG, eine Zahl als
       die richtige anzuerkennen und die Zeile mit diesem Vermerk zu schließen.
       ANERKANNT WIRD, WAS DAS PROJEKT WIRKLICH TRAEGT.
       GEMESSEN am 26.08.2026 an "1754 BA 2018-03-13": angeboten war
       "4 Ebenen als richtig anerkennen · Übernehmen ändert die Heizlast nicht
       spürbar", während das Raumbuch unverändert 5 Ebenen führte. Der Klick
       bestätigte eine Zahl, die er nicht herstellt. Ein Knopf, der nichts
       ändert, darf nur bestätigen, was ohnehin dasteht; die abweichende
       Zählung steht daneben, damit der Widerspruch sichtbar bleibt. */
    const istZahl = Number(z.ist);
    const anders = Number.isFinite(istZahl) && Math.abs(istZahl - wert) > 1e-9;
    const istWert = anders
      ? (stueck ? Math.round(istZahl) : Math.round(istZahl * 100) / 100)
      : wert;
    /* KLAFFT DIE LUECKE WIRKLICH, GIBT ES KEINEN EIN-KLICK-WEG.
       Zwei Zahlen, die um mehr als ein Zwanzigstel auseinanderliegen, sind
       nicht durch einen Vermerk zu versoehnen: entweder das Raumbuch oder
       die Zaehlung ist falsch, und das entscheidet sich am Plan. Ein Knopf,
       der die eine oder die andere "als richtig anerkennt", verschiebt nur
       den Widerspruch in den Bericht -- am 26.08.2026 gleich dreimal
       gemessen (Hasenberg "12 Raeume", Frankenburg "4 Ebenen", Ziolkowski
       "0,00 Raeume"). Die Frage bleibt deshalb offen und sagt, warum. */
    const spanne = Math.max(Math.abs(istWert), Math.abs(wert));
    /* Eine Zeile, die nur ZUR KENNTNIS genommen werden will (aufhebbar),
       darf weiter mit einem Klick geschlossen werden — "zur Kenntnis
       genommen" ist genau das, was der Vermerk sagt. Eine harte Sperre
       nicht: sie steht dort, weil die Zahl nicht stimmt. */
    const hart = zs.some(function (y) { return y.aufhebbar === false; });
    /* Nur die HARTE Sperre verliert den Vermerk-Knopf. Eine Zeile, die zur
       Kenntnis genommen werden darf, behaelt ihn — dort heisst der Vermerk
       genau das, was er tut, und die abweichende Zahl steht in der Herkunft
       daneben. `spanne` bleibt fuer den Text erhalten. */
    const klafft = anders && hart && spanne > 0;
    if (klafft) {
      /* KEIN VERMERK — ABER ERST RECHT KEINE SACKGASSE.
         Bietet das Kontrollblatt fuer dieselbe Zeile einen WEG an (Zone
         anlegen, Geschoss annehmen, Raum entfernen), ist der die richtige
         Antwort und wird weiter unten gebildet. Nur wenn es keinen gibt,
         bleibt die begruendete Ausnahme. */
      klaffend = {
        text: "hier zwei Zahlen auseinanderliegen, die beide nicht durch einen "
          + "Vermerk richtig werden: im Raumbuch stehen "
          + menge(istWert, einheit) + ", dagegen steht "
          + menge(wert, einheit) + " (" + String(z.quelle_soll) + "). "
          + "Welche gilt, entscheidet der Plan — ein Knopf, der eine davon "
          + "als richtig anerkennt, schriebe den Widerspruch nur in den Bericht",
      };
    } else {
    return vorschlagEntscheidung(vid,
      menge(istWert, einheit) + " als richtig anerkennen",
      anders
        ? menge(istWert, einheit) + " stehen im Raumbuch; " + String(z.quelle_soll)
          + ". Der Vermerk hält fest, dass das Raumbuch gilt — an der Rechnung "
          + "ändert er nichts"
        : String(z.quelle_soll),
      function (ziel) {
        const KB = window.MODUL_KONTROLLBLATT;
        if (!KB) return { ok: false, text: "" };
        let n = 0;
        const vermerk = anders
          ? menge(istWert, einheit) + " im Raumbuch als richtig anerkannt; "
            + String(z.quelle_soll) + " — nicht übernommen"
          : menge(istWert, einheit) + " aus " + String(z.quelle_soll);
        zs.forEach(function (y) {
          const r = y.aufhebbar === false
            ? KB.sperreAufheben(ziel, y.id, "Vorschlag angenommen: " + vermerk)
            : KB.zurKenntnis(ziel, y.id, "Vorschlag angenommen: " + vermerk);
          if (r && r.ok) n++;
        });
        return { ok: n > 0, text: mz(n, "Zeile", "Zeilen") + " mit Vermerk "
          + "geschlossen." };
      });
    }
  }
  /* Eine Zeilen-Aktion, die das Kontrollblatt selbst anbietet: die erste
     ist der Vorschlag — das ist der Weg, den das Blatt für den
     wahrscheinlichsten hält. */
  const mitAkt = zs.filter(function (z) { return (z.aktionen || []).length; });
  if (mitAkt.length) {
    const z = mitAkt[0], a = z.aktionen[0];
    /* Ausgeführt wird über den Weg, den das Kontrollblatt für diese Zeile
       schon kennt (kbZoneAngebaut, kbGeschossAnnehmen, …). Der Vorschlag
       leiht sich diesen Knopf; gebaut wird hier keine zweite Mechanik. */
    const v = vorschlagEntscheidung(vid, a.text,
      "erster Weg, den das Kontrollblatt für diese Zeile anbietet — die "
        + "wahrscheinlichste Auflösung von „" + String(z.titel || "") + "“",
      null);
    if (v) {
      v.aktion = a.aktion;
      v.daten = { "kb-id": z.id,
        "kb-name": (a.data && a.data.name) || "",
        "kb-g": (a.data && a.data.g) || "" };
    }
    return v;
  }
  /* Bleibt die offene Angabe: der Vorschlag ist, den Stand des Werkzeugs
     als richtig anzuerkennen. Das ist eine Entscheidung, kein Wert — und
     genau das steht auf dem Knopf. */
  if (klaffend) return vorschlagOhne(vid, klaffend.text);
  if (zs.every(function (z) { return z.aufhebbar !== false; })) {
    /* AUCH HIER MUSS DER GRUND DER WIRKLICHE SEIN.
       Zwei Prüfläufe vom 26.08.2026 (Hasenberg, P2211) melden denselben
       Satz an Zeilen, die das Werkzeug SELBST als Befund führt: Knopf
       „Stand bestätigen — passt so", Herkunft „es liegt keine Gegenzahl vor,
       die ihm widerspricht" — und die Gegenzahl stand drei Zeilen darüber
       auf derselben Karte („Öffnungen im Raumbuch sind zu klein", Faktor
       2,16). Ein fester Satz, der nicht nachsieht, wird über kurz oder lang
       zur Falschaussage. Nachgesehen wird an derselben Stelle wie oben: ist
       und soll führen die Zahlen der Zeile. Steht dort eine Gegenzahl, sagt
       der Knopf, worauf man sich festlegt — statt zu behaupten, es gebe
       nichts zu entscheiden. */
    const gegen = zs.filter(function (z) {
      return Number.isFinite(Number(z.ist)) && Number.isFinite(Number(z.soll))
        && Number(z.ist) !== Number(z.soll);
    });
    return vorschlagEntscheidung(vid,
      gegen.length ? "Stand bestätigen — Abweichung bleibt vermerkt"
        : "Stand bestätigen — passt so",
      gegen.length
        ? "der Stand des Werkzeugs wird gegen die abweichende Zahl derselben "
          + "Zeile festgeschrieben (" + gegen.map(function (z) {
              return String(z.titel || "Zeile").trim() + ": " + String(z.ist)
                + " gegen " + String(z.soll);
            }).join("; ") + "). Die Abweichung verschwindet dadurch nicht; "
          + "sie steht mit diesem Vermerk im Bericht"
        : "geprüfter Stand des Werkzeugs; es liegt keine Gegenzahl vor, die "
          + "ihm widerspricht",
      function (ziel) {
        const KB = window.MODUL_KONTROLLBLATT;
        if (!KB) return { ok: false, text: "" };
        let n = 0;
        zs.forEach(function (y) {
          const r = KB.zurKenntnis(ziel, y.id, "Vorschlag angenommen");
          if (r && r.ok) n++;
        });
        return { ok: n > 0, text: mz(n, "Punkt", "Punkte")
          + " zur Kenntnis genommen." };
      });
  }
  /* DER GRUND MUSS DER WIRKLICHE SEIN. Bis zum 26.08.2026 stand hier immer
     „zwei bezifferte Angaben stehen gegeneinander" — auch an Sperren, an
     denen überhaupt nur EINE Zahl steht. Gemessen am Prüflauf Soethe:
     „Bauteile im Projekt" hatte null Bauteile und keine Gegenzahl, und der
     Text erfand den Widerspruch dazu. Ein erfundener Grund ist so schlecht
     wie eine erfundene Zahl. */
  const paar = zs.filter(function (z) {
    return Number.isFinite(Number(z.ist)) && Number.isFinite(Number(z.soll))
      && Number(z.ist) !== Number(z.soll);
  });
  return vorschlagOhne(vid, paar.length
    ? "hier zwei bezifferte Angaben aus verschiedenen Quellen gegeneinander "
      + "stehen und keine von beiden nachweisbar die richtige ist. Diese "
      + "Entscheidung muss ein Mensch mit dem Plan treffen; sie wird mit "
      + "Vermerk festgehalten."
    : "sich aus den Unterlagen keine Zahl ableiten lässt, die „"
      + String((zs[0] || {}).titel || "diese Sperre")
      + "“ schließen würde — es steht keine zweite, unabhängige Angabe "
      + "dagegen, aus der sich ein Vorschlag bilden ließe. Was hier fehlt, "
      + "muss am Plan erfasst werden; ein Vorschlag wäre geraten.");
}

/** Eine bestätigbare Annahme trägt ihren Wert schon bei sich. Der Vorschlag
 *  ist genau dieser Wert — und der Knopf nennt ihn, statt „Passt" zu sagen.
 *  Angenommen bleibt angenommen: bestätigt wird die Annahme, nicht in einen
 *  belegten Wert verwandelt. So steht sie auch im Bericht. */
function vorschlagAusAnnahme(a, zid) {
  const wert = a.wert === null || a.wert === undefined ? "" : String(a.wert);
  const feldwort = a.schluessel === "klima" ? " °C" : "";
  return vorschlagEntscheidung(zid,
    (wert ? wert + feldwort + " " : "") + "als Annahme bestätigen",
    (a.begruendung || a.kurz || "aus den Unterlagen abgeleitet")
      + (a.richtung ? " Richtung des möglichen Fehlers: " + a.richtung : ""),
    function (ziel) {
      const KB = window.MODUL_KONTROLLBLATT;
      if (!KB) return { ok: false, text: "" };
      const r = KB.zurKenntnis(ziel, zid, "Vorschlag angenommen"
        + (wert ? ": " + wert : ""));
      return { ok: !!(r && r.ok), text: (a.kurz || "Annahme")
        + " bestätigt — sie steht als Annahme im Bericht." };
    });
}

/** Die Raumhöhe. Der Vorschlag je Geschoss kommt aus der Höhenzuordnung
 *  (Schnitt, abgeleitete Geschosshöhe, sonst benannter Rückfallwert) und
 *  nennt seine Herkunft je Geschoss. */
function vorschlagHoehe(vorschlaege) {
  return vorschlagWert("hoehe",
    vorschlaege.map(function (v) {
      return (vorschlaege.length > 1 ? v.g + " " : "") + fmt(v.wert, 2) + " m";
    }).join(", ") + " übernehmen",
    vorschlaege.map(function (v) {
      return v.g + ": " + fmt(v.wert, 2) + " m";
    }).join(" · "),
    vorschlaege.map(function (v) { return v.g + " aus " + v.quelle; }).join(" · "),
    function (ziel) {
      /* Über denselben Weg wie der alte Knopf: hoehenVorschlaegeUebernehmen
         schützt jede eigene Eingabe. Auf einer Kopie greift derselbe Schutz. */
      const sicher = App.p;
      let erg;
      try { App.p = ziel; erg = hoehenVorschlaegeUebernehmen(vorschlaege); }
      finally { App.p = sicher; }
      if (erg.uebernommen.length && window.MODUL_KONTROLLBLATT) {
        window.MODUL_KONTROLLBLATT.zurKenntnis(ziel, "annahme_hoehe",
          "Vorschlag übernommen: " + erg.uebernommen.map(function (v) {
            return v.g + " " + fmt(v.wert, 2) + " m"; }).join(", "));
      }
      return { ok: erg.uebernommen.length > 0,
        text: (erg.uebernommen.length
          ? "Lichte Höhe übernommen: " + erg.uebernommen.map(function (v) {
              return v.g + " " + fmt(v.wert, 2) + " m"; }).join(", ") + "."
          : "")
          + (erg.behalten.length
            ? " Deine eigene Eingabe bleibt stehen: " + erg.behalten.map(
                function (v) { return v.g + " " + fmt(v.eigen, 2) + " m"; })
                .join(", ") + " — ein Vorschlag überschreibt keine Eingabe."
            : "") };
    });
}

/** Das Baujahr. Auf einem Bauantrag ist das Blattdatum der beste belegte
 *  Anhalt: gebaut wird nach dem Antrag, nicht davor. Der Vorschlag sagt das
 *  ausdrücklich und nennt Blatt und Datum. */
function vorschlagBaujahr(p) {
  const pd = (p.meta_herkunft && p.meta_herkunft.plandatum) || null;
  const jahr = pd ? (String(pd.wert || "").match(/\b(1[89]\d\d|20\d\d)\b/) || [])[1]
    : null;
  if (!jahr) {
    return vorschlagOhne("baujahr",
      "auf keinem Blatt ein Datum steht, aus dem sich ein Baujahr ableiten "
      + "ließe, und die Typologie ohne Baujahr keine U-Werte liefert. Das "
      + "Baujahr muss aus den Bauunterlagen kommen.");
  }
  /* EIN AUFNAHMEDATUM WIRD NICHT ZUM VORSCHLAG.
   *
   * GEMESSEN am 26.08.2026 an „Hasenberg 10" (Bestandsblatt von 2025, Haus
   * von rund 1975): der Fragetext warnte wörtlich, ein Blattdatum sei kein
   * Baujahr und rechne „um ein Vielfaches zu klein" — und der Knopf daneben
   * setzte trotzdem 2025. EIN Klick: 21,71 → 10,90 kW. Der bequemste Weg
   * führte genau in den Fehler, vor dem zwei Sätze vorher gewarnt wurde.
   *
   * KERN_ANNAHMEN entscheidet diese Frage längst und legt das Ergebnis in
   * p.annahmen.baujahr_nicht ab (Stufe „nicht_moeglich", mit Begründung).
   * Bisher las nur der Fragetext diesen Stand, der Vorschlag nicht — zwei
   * Quellen für dieselbe Sache. Es gibt jetzt eine: liegt der Befund vor,
   * gibt es keinen Vorschlag, und die Begründung des Kerns steht als Grund
   * dort, wo sonst der Knopf stünde. */
  const nicht = (p.annahmen && p.annahmen.baujahr_nicht) || null;
  if (nicht) {
    return vorschlagOhne("baujahr",
      String(nicht.begruendung || "").replace(/\s*Das Baujahr ist einzutragen\.\s*$/, "")
        .replace(/\.\s*$/, "")
      + ". Ein Knopf, der dieses Datum trotzdem einträgt, wäre der teuerste "
      + "Klick des Werkzeugs");
  }
  return vorschlagWert("baujahr", jahr + " übernehmen", jahr,
    "Blattdatum „" + pd.wert + "“"
      + (pd.blatt ? " auf „" + pd.blatt + "“" : "")
      + " — ein Blattdatum ist kein Baujahr, aber bei einem Bauantrag die "
      + "belegte Untergrenze: gebaut wird nach dem Antrag.",
    function (ziel) {
      if (baujahrGueltig(ziel.meta.baujahr)) {
        return { ok: false, text: "Es steht schon ein Baujahr im Feld." };
      }
      ziel.meta.baujahr = Number(jahr);
      return { ok: true, text: "Baujahr " + jahr + " gesetzt — aus dem "
        + "Blattdatum abgeleitet und so im Bericht vermerkt." };
    });
}

/** Die Bezeichnung des Vorhabens. Sie steht auf dem Deckblatt, nicht in der
 *  Rechnung — und der Dateiname der Unterlage ist der beste vorhandene
 *  Anhalt, wenn das Schriftfeld nichts hergab. */
function vorschlagBezeichnung(p) {
  const s = ((p.plan && p.plan.seiten) || [])
    .find(function (x) { return x.verwenden !== false && (x.name || x.bezeichnung); });
  if (!s) {
    return vorschlagOhne("bezeichnung",
      "weder im Schriftfeld noch im Dateinamen der Unterlagen eine "
      + "Bezeichnung steht.");
  }
  const roh = String(s.name || s.bezeichnung || "")
    .replace(/,\s*Seite\s*\d+\s*$/i, "").replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!roh) {
    return vorschlagOhne("bezeichnung", "der Dateiname keinen brauchbaren "
      + "Text enthält.");
  }
  return vorschlagWert("bezeichnung", "„" + roh + "“ übernehmen", roh,
    "Dateiname der abgelegten Unterlage",
    function (ziel) {
      if (String(ziel.meta.bezeichnung || "").trim()) {
        return { ok: false, text: "Es steht schon eine Bezeichnung im Feld." };
      }
      ziel.meta.bezeichnung = roh;
      return { ok: true, text: "Bezeichnung „" + roh + "“ übernommen." };
    });
}

/** Die Postleitzahl. Gelesen wurde sie oft — nur nicht immer dort, wo die
 *  Rechnung sie sucht. Vorgeschlagen wird die PLZ, die in den Schriftfeldern
 *  der Blätter steht. */
function vorschlagKlima(p) {
  const h = (p.meta_herkunft && p.meta_herkunft.plz) || null;
  const plz = h && String(h.wert || "").match(/\b\d{5}\b/)
    ? String(h.wert).match(/\b\d{5}\b/)[0] : null;
  if (!plz) {
    return vorschlagOhne("klima",
      "in keinem Schriftfeld eine Postleitzahl und kein Ort steht, der sich "
      + "einer Klimaregion zuordnen ließe. Die Norm-Außentemperatur geht "
      + "linear in jede Zahl ein und darf nicht geraten werden.");
  }
  return vorschlagWert("klima", plz + " übernehmen", plz,
    "Schriftfeld" + (h.blatt ? " von „" + h.blatt + "“" : ""),
    function (ziel) {
      if (String(ziel.meta.plz || "").trim()) {
        return { ok: false, text: "Es steht schon eine PLZ im Feld." };
      }
      ziel.meta.plz = plz;
      return { ok: true, text: "PLZ " + plz + " übernommen." };
    });
}

/** Die Nutzungseinheit. Gibt es genau eine, gehören die Räume aller
 *  Voraussicht nach zu ihr. Gibt es mehrere, ist nichts abzuleiten. */
function vorschlagWe(p, ohneWe) {
  if (p.einheiten.length === 1) {
    const e = p.einheiten[0];
    return vorschlagEntscheidung("we",
      "Alle der Einheit „" + e.name + "“ zuordnen",
      "im Projekt gibt es genau eine Nutzungseinheit („" + e.name + "“); "
        + "ein Raum kann zu keiner anderen gehören",
      function (ziel) {
        const KB = window.MODUL_KONTROLLBLATT;
        let n = 0;
        ziel.raeume.forEach(function (r) {
          if (r.we) return;                       // nie eine Zuordnung ändern
          if (KB) {
            const w = KB.schreiben(ziel, "raum." + r.id + ".we", e.name,
              "einzige angelegte Nutzungseinheit");
            if (w.ok) n++;
          } else { r.we = e.name; n++; }
        });
        return { ok: n > 0, text: mz(n, "Raum", "Räume") + " der Einheit „"
          + e.name + "“ zugeordnet." };
      });
  }
  return vorschlagOhne("we",
    "das Projekt " + mz(p.einheiten.length, "Nutzungseinheit", "Nutzungseinheiten")
    + " führt und aus dem Grundriss nicht hervorgeht, welcher Raum zu "
    + "welcher gehört. Die Zuordnung entscheidet über die Lüftungsrechnung "
    + "und muss aus dem Plan kommen.");
}

/** Der Vorschlag zu einer Zeile der Selbstprüfung. Diese Fragen sind
 *  Sperren ohne eigenen Antwortweg — sie verwiesen bisher nur ins
 *  Expertenwerkzeug. Ableitbar ist genau eine Sorte Vorschlag: der Schritt,
 *  den das Werkzeug selbst gehen kann.
 *  „Bauteile je Raum" ist der Fall aus dem Soethe-Lauf: die Bauteiltypen
 *  stehen (Baujahr-Rückfall), nur gebildet wurde je Raum keines. Das kann
 *  bauteileErgaenzen() — sobald die Räume eine Fläche haben. */
function vorschlagFuerPruefzeile(k, g) {
  const p = App.p;
  if (/^bt|bauteil/.test(k)) {
    const typen = (p.bauteiltypen || []).length;
    const ohneA = p.raeume.filter(function (r) { return !(num(r.A, 0) > 0); }).length;
    if (!typen) {
      return vorschlagOhne("pruef_" + k,
        "im Projekt kein einziger Bauteiltyp angelegt ist. Die Typen kommen "
        + "aus dem Baujahr; ohne Baujahr gibt es keine U-Werte, aus denen "
        + "sich ein Bauteil bilden ließe.");
    }
    if (ohneA) {
      /* Die Kette benennen, statt eine zweite Sackgasse anzubieten: ein
         Bauteil braucht eine Fläche, und die fehlt noch. Die Frage weiter
         oben löst genau das. */
      return vorschlagOhne("pruef_" + k,
        "ein Bauteil eine Raumfläche braucht und " + mz(ohneA, "Raum", "Räume")
        + " noch keine hat. Das löst die Frage „Raumfläche fehlt“ weiter "
        + "oben; danach lassen sich die Bauteile in einem Zug bilden.");
    }
    return vorschlagEntscheidung("pruef_" + k,
      "Bauteile aus " + mz(typen, "Bauteiltyp", "Bauteiltypen") + " bilden",
      "die Bauteiltypen stehen im Projekt und jeder Raum hat eine Fläche, "
        + "Höhe und Zahl der Außenwände — daraus bildet das Werkzeug die "
        + "Bauteile je Raum selbst",
      function (ziel) {
        const sicher = App.p;
        let anz = 0;
        try { App.p = ziel; anz = bauteileErgaenzen(); }
        finally { App.p = sicher; }
        return { ok: anz > 0, text: mz(anz, "Bauteil", "Bauteile")
          + " gebildet — U-Werte aus der Typologie, im Bericht als Annahme." };
      });
  }
  return vorschlagOhne("pruef_" + k,
    "diese Zeile keine Gegenzahl und keinen Weg nennt, den das Werkzeug "
    + "allein gehen könnte. Sie ist im Fachwerkzeug zu klären: "
    + String(g.erste.titel || "").toLowerCase() + ".");
}

/* Der eine Ort, an dem die Fragen entstehen. Gerechnet wird je Prüfstand
 * einmal (der Abdruck ist App.pruefung selbst: rechnen() erzeugt es neu,
 * und jede Antwort läuft über render() -> rechnen()). */
let rueckfragenMerk = null;

function rueckfragenStand() {
  if (rueckfragenMerk && rueckfragenMerk.pr === App.pruefung
      && rueckfragenMerk.p === App.p) return rueckfragenMerk;
  const p = App.p;
  const fragen = [];
  const feststellungen = [];
  if (!p.raeume.length) {
    rueckfragenMerk = { pr: App.pruefung, p: p, fragen: fragen,
      feststellungen: feststellungen };
    return rueckfragenMerk;   // ohne Räume urteilt Schritt 1
  }

  /* 1  Fehlende Pflichtangaben, für die es keinen Vorschlag gibt — Sperren.
     automatischErgaenzen und kern_annahmen haben es vorher versucht; was
     hier ankommt, war wirklich nicht zu ermitteln. */
  if (p.klima.theta_e == null) {
    fragen.push({ id: "klima", kategorie: "sperre", titel: "Wo steht das Gebäude?",
      text: "Aus den Unterlagen ließ sich weder Postleitzahl noch Ort lesen. "
        + "Die Postleitzahl bestimmt die Norm-Außentemperatur und damit die "
        + "ganze Rechnung.",
      vorschlag: vorschlagKlima(p),
      eingabe: feld("PLZ des Gebäudes", "meta.plz", { pflicht: true }),
      weg: [{ titel: "Objekt und Klima im Expertenmodus", schritt: "projekt" }] });
  }
  if (!baujahrGueltig(p.meta.baujahr)) {
    /* Die Sperre hängt an baujahrGueltig, nicht an „Feld leer": ein Feld,
       das auf −1 steht (Pfeiltaste in einem leeren Zahlenfeld genügt), ist
       KEIN Baujahr und darf die Sperre nicht verschlucken — genau so ist es
       in der Abnahme am 24.08.2026 geschehen, mit „Außenwand (U 2,00)" aus
       der Typologie und ~30 statt 11,95 kW. */
    const steht = String(p.meta.baujahr == null ? "" : p.meta.baujahr).trim();
    /* DIE BEGRÜNDUNG DARF DEM EIGENEN DATENSTAND NICHT WIDERSPRECHEN.
       Gemessen am 24.08.2026 an „BV 2-0887 Ziolkowski": hier stand „Auf den
       Blättern steht kein Datum" — während im selben Projekt
       meta_herkunft.plandatum „17.05.2022" von Blatt 1 führte. Das Datum WAR
       gelesen; es wurde nur (zu Recht) nicht zum Baujahr gemacht. Der Satz
       sagt jetzt, was das Werkzeug weiß: welches Blatt worauf datiert ist
       und warum daraus kein Baujahr wurde. */
    const pd = (p.meta_herkunft && p.meta_herkunft.plandatum) || null;
    fragen.push({ id: "baujahr", kategorie: "sperre",
      titel: "Aus welchem Jahr stammt das Gebäude?",
      text: (steht
          ? "Im Baujahrfeld steht „" + steht + "“ — das ist kein Baujahr. "
          : pd
          /* Die Begründung endet selbst auf einem Punkt; vor dem angehängten
             ". " wird er abgestreift, sonst steht „einzutragen.. Aus" im
             Fragetext (Befund Hasenberg 25.08.2026). */
          ? (pd.blatt ? "„" + pd.blatt + "“ ist" : "Das Blatt ist") + " auf „"
            + pd.wert + "“ datiert. Ein Blattdatum ist aber kein Baujahr"
            + (p.annahmen && p.annahmen.baujahr_nicht
              ? " — " + String(p.annahmen.baujahr_nicht.begruendung || "")
                  .replace(/\.\s*$/, "") : "")
            + ". "
          : "Auf den Blättern steht kein Datum, aus dem sich das Baujahr "
            + "ableiten ließe"
            + (p.annahmen && p.annahmen.baujahr_nicht
              ? " — " + String(p.annahmen.baujahr_nicht.begruendung || "")
                  .replace(/\.\s*$/, "") : "")
            + ". ")
        + "Aus dem Baujahr kommen die U-Werte der Bauteile.",
      vorschlag: vorschlagBaujahr(p),
      eingabe: feld("Baujahr", "meta.baujahr", { typ: "number", pflicht: true,
        min: 1000 }),
      weg: [{ titel: "Objekt und Klima im Expertenmodus", schritt: "projekt" }] });
  }

  /* 1x  Abgeschnittener Auftraggeber (Befund Hasenberg 25.08.2026):
     „Christina Herzog u." endet auf einem Bindewort — die Lesung hat den
     zweiten Namen des Schriftfelds nicht erwischt, und so stünde es auf dem
     Titelblatt. Die Prüfzeile dazu erhebt kern_pruefung
     (bauherr_abgeschnitten, Stufe offen); hier bekommt sie ihr Eingabefeld,
     denn beantworten kann das nur ein Mensch mit dem Plan. */
  const bauherrJetzt = String((p.meta && p.meta.bauherr) || "").trim();
  if (bauherrJetzt && /(?:\bu\.|\bund|&|\+|,)$/i.test(bauherrJetzt)) {
    fragen.push({ id: "bauherr_abgeschnitten", kategorie: "angabe",
      titel: "Auftraggeber unvollständig",
      text: "Als Auftraggeber wurde „" + bauherrJetzt + "“ gelesen — der Name "
        + "endet auf einem Bindewort und ist damit erkennbar abgeschnitten. "
        + "So stünde er auf dem Titelblatt des Berichts, direkt über der "
        + "Unterschrift. Bitte den vollständigen Auftraggeber aus dem "
        + "Schriftfeld eintragen.",
      /* Die begründete Ausnahme: der zweite Name steht nirgends im
         gelesenen Text — sonst wäre er mitgelesen worden. */
      vorschlag: vorschlagOhne("bauherr_abgeschnitten",
        "der abgeschnittene Teil des Namens auf keinem Blatt gelesen wurde. "
        + "Was nicht im Text steht, lässt sich nicht ergänzen — der "
        + "vollständige Name muss aus dem Schriftfeld abgetippt werden."),
      eingabe: feld("Auftraggeber", "meta.bauherr", { pflicht: true }),
      weg: [{ titel: "Objekt und Klima im Expertenmodus", schritt: "projekt" }] });
  }

  /* 1a  Ein Blatt, das nach Blattkopf, Dateinamen oder Textstand ein
     Grundriss ist und trotz automatischer Nachlesung ohne einen Raum blieb.
     NIE EIN STILLES ERGEBNIS: eine Heizlast ohne dieses Geschoss wäre still
     falsch, deshalb ist das eine Sperre mit dem Weg in den Plan. */
  const grundlos = ((p.plan && p.plan.seiten) || []).filter(function (s) {
    return s.verwenden !== false && s.grundrissOhneRaeume;
  });
  if (grundlos.length) {
    fragen.push({ id: "grundriss_leer", kategorie: "sperre",
      titel: "Grundriss ohne Räume",
      text: grundlos.map(function (s) {
        return "„" + (s.bezeichnung || s.name) + "“ ist nach "
          + s.grundrissOhneRaeume + " ein Grundriss, die Auslese hat aber "
          + "auch nach Nachlesung mit Hinweis, Zuschnitt und Zählung keinen "
          + "Raum gefunden.";
      }).join(" ") + " Die Räume dieses Blattes fehlen in der Rechnung. "
        + "Bitte am Plan erfassen: Flächenstempel übernehmen, Räume umfahren "
        + "oder das Blatt noch einmal als Grundriss lesen lassen.",
      vorschlag: vorschlagEntscheidung("grundriss_leer",
        mz(grundlos.length, "Blatt", "Blätter") + " nicht verwenden",
        "das Blatt trägt nach " + esc(grundlos[0].grundrissOhneRaeume)
          + " einen Grundriss, aus dem auch nach Nachlesung, Zuschnitt und "
          + "Zählung kein Raum entstand. Solange kein Raum darauf erfasst "
          + "ist, trägt es nichts zur Rechnung bei und fehlt still",
        function (ziel) {
          let k = 0;
          ((ziel.plan && ziel.plan.seiten) || []).forEach(function (x) {
            if (x.verwenden === false || !x.grundrissOhneRaeume) return;
            x.verwenden = false;
            x.nicht_verwenden_grund = "vom Bearbeiter ausgenommen: Grundriss "
              + "ohne erfassten Raum";
            k++;
          });
          return { ok: k > 0, text: mz(k, "Blatt", "Blätter")
            + " ausgenommen — der Vermerk steht am Blatt." };
        }),
      weg: [{ titel: "Im Plan anzeigen", schritt: "plan" },
            { titel: "Im Raumbuch eintragen", schritt: "raeume" }] });
  }

  /* 2  Räume ohne Fläche: eine Ursache, eine Frage — und ein Vorschlag.
     Hier stand „denn eine Fläche lässt sich nicht raten". Geraten wird sie
     auch weiterhin nicht: sie wird aus der gelesenen Außenbemaßung des
     Geschosses abgeleitet, um den Wandring gemindert und nach Raumart
     verteilt (KERN_FLAECHE). Das ist eine Annahme mit Herleitung und Spanne,
     und sie gilt erst, wenn jemand sie am Knopf übernimmt. Fehlt auch die
     Außenbemaßung, bleibt das Feld leer — mit dem Grund daneben. */
  const ohneA = p.raeume.filter(function (r) { return !(r.A > 0); });
  if (ohneA.length) {
    fragen.push({ id: "flaeche", kategorie: "sperre", titel: "Raumfläche fehlt",
      text: "Für " + mz(ohneA.length, "Raum", "Räume") + " steht keine "
        + "Grundfläche in den Unterlagen: "
        + ohneA.slice(0, 6).map(function (r) {
            return (r.geschoss ? r.geschoss + " " : "") + (r.name || "Raum");
          }).join(", ") + (ohneA.length > 6 ? " …" : "")
        + ". Ist eine Zeile davon kein Raum, sondern eine mitgelesene "
        + "Beschriftung oder Planungsnotiz, lässt sie sich hier entfernen — "
        + "das wird mit Name und Blatt vermerkt.",
      /* EIN-KLICK „ENTFERNEN" (Befund „Am Gunnebach 9", 25.08.2026): die
         Bereinigung von Pseudo-Räumen ging bisher nur im Expertenmodus.
         Die Sperre selbst bleibt hart — sie verschwindet nur, wenn jeder
         Raum entweder eine Fläche hat oder ausdrücklich entfernt ist. */
      /* ALLE betroffenen Räume, nicht die ersten acht. Bis zum 26.08.2026
         stand hier slice(0, 8): bei 13 Räumen ohne Fläche liessen sich fünf
         davon (Kind 1, Kind 2, Gast/Büro, Ankleide/Schlafen, Flur) gar nicht
         entfernen — der Fliesstext nannte sie, der Knopf dazu fehlte. */
      antworten: ohneA.map(function (r) {
        return '<button class="btn klein" data-aktion="rueckfrageRaumEntfernen"'
          + ' data-raum-id="' + esc(String(r.id)) + '">„'
          + esc((r.geschoss ? r.geschoss + " " : "") + (r.name || "Raum"))
          + "“ ist kein Raum — entfernen</button>";
      }).join(" "),
      vorschlag: vorschlagFlaeche(p, ohneA),
      /* DAS EIGENE FELD. Es erscheint erst nach dem Ablehnen des Vorschlags
         (vorschlagFeldZeigen) — aber es erscheint. Geschrieben wird über
         denselben Weg wie im Raumbuch (data-liste/raeume/A), damit hier
         keine zweite Datenhaltung entsteht. */
      eingabe: raumfelder(p, ohneA, "A",
        function (r) { return "Grundfläche in m²"; }),
      weg: [{ titel: "Im Plan anzeigen", schritt: "pruefblatt" },
            { titel: "Raum im Plan korrigieren", schritt: "plan" },
            { titel: "Im Raumbuch eintragen", schritt: "raeume" }] });
  }

  /* 3  Räume ohne Nutzungseinheit — mit dem wahrscheinlichsten Vorschlag:
     gibt es nur eine Einheit, gehören sie aller Voraussicht nach zu ihr. */
  const ohneWe = p.raeume.filter(function (r) { return !r.we; });
  if (ohneWe.length) {
    const eine = p.einheiten.length === 1 ? p.einheiten[0] : null;
    fragen.push({ id: "we", kategorie: "sperre",
      titel: "Nutzungseinheit der Räume",
      text: mz(ohneWe.length, "Raum ist", "Räume sind") + " keiner Wohn- oder "
        + "Nutzungseinheit zugeordnet; ohne Zuordnung fehlt der "
        + "Lüftungsberechnung der Bezug."
        + (eine ? " Im Projekt gibt es genau eine Einheit („" + eine.name + "“)." : ""),
      /* Der Ein-Klick-Weg steht jetzt im Vorschlagsblock, mit Ablehnen
         daneben; der alte Sonderknopf entfällt. */
      vorschlag: vorschlagWe(p, ohneWe),
      eingabe: raumfelder(p, ohneWe, "we", null),
      weg: [{ titel: "Im Raumbuch zuordnen", schritt: "raeume" }] });
  }

  /* 4  Bezeichnung — dem Dokument fehlt sie, der Rechnung nicht. */
  if (!p.meta.bezeichnung) {
    fragen.push({ id: "bezeichnung", kategorie: "angabe",
      titel: "Wie heißt das Vorhaben?",
      text: "Im Schriftfeld der Blätter stand keine Bezeichnung. Sie steht "
        + "auf dem Deckblatt des Berichts; die Rechnung steht davon unberührt.",
      vorschlag: vorschlagBezeichnung(p),
      eingabe: feld("Bezeichnung des Vorhabens", "meta.bezeichnung", { pflicht: true }),
      weg: [{ titel: "Objekt und Klima im Expertenmodus", schritt: "projekt" }] });
  }

  /* 5  Die offenen Zeilen des Kontrollblatts — gebündelt je Ursache.
     DER SCHLÜSSEL IST DER STAMM ALLEIN, NICHT STAMM UND STUFE. Mit der
     Stufe im Schlüssel stand dieselbe Ursache zweimal in der Liste, sobald
     ihre Zeilen verschieden streng waren — Abnahme-Befund vom 24.08.2026:
     der DG-Umfang einmal als Widerspruch und einmal als offene Angabe. Die
     Gruppe trägt die strengste Stufe ihrer Zeilen; je Zeile bleibt der
     eigene Antwortweg (Vermerkpflicht bei aufhebbar false) erhalten. */
  const kbOffen = rueckfragenKbZeilen();
  const gruppenListe = [];
  const gruppeWo = {};
  kbOffen.forEach(function (z) {
    if (z.id === "leer") return;                       // deckt Schritt 1 ab
    const kat = rueckfragenKategorie(z);
    const stamm = String(z.titel || z.id).replace(RF_GESCHOSS, "*")
      .replace(/\s+/g, " ").trim();
    if (gruppeWo[stamm] === undefined) {
      gruppeWo[stamm] = gruppenListe.length;
      gruppenListe.push({ kategorie: kat, stamm: stamm, zeilen: [] });
    }
    const g = gruppenListe[gruppeWo[stamm]];
    if ((RF_RANG[kat] !== undefined ? RF_RANG[kat] : 2)
        < (RF_RANG[g.kategorie] !== undefined ? RF_RANG[g.kategorie] : 2)) {
      g.kategorie = kat;
    }
    g.zeilen.push(z);
  });
  gruppenListe.forEach(function (g) { fragen.push(rueckfrageAusZeilen(g)); });

  /* 6  Lichte Höhe: EINE Frage für alle betroffenen Geschosse — nicht eine
     je Geschoss und daneben noch die Annahmenkarte derselben Sache. Genau
     das stand in der Abnahme vom 24.08.2026: „Raumhöhe eg/og/dg einzeln
     PLUS ‚Lichte Höhe 2,60 m'", derselbe Vorschlag zweimal zu bestätigen.
     Der Vorschlag je Geschoss kommt aus der Höhenzuordnung (Schnitt,
     abgeleitete Geschosshöhe, sonst Rückfallwert) und nennt seine Herkunft. */
  const stand = p.hoehenStand;
  const Z = window.KERN_ZUORDNUNG;
  const geschosse = [];
  p.raeume.forEach(function (r) {
    if (r.geschoss && geschosse.indexOf(r.geschoss) < 0) geschosse.push(r.geschoss);
  });
  const hOffen = geschosse.filter(function (g) {
    const h = (stand && stand.zuordnung && stand.zuordnung[g]) || {};
    return h.angenommen && (p.geschosshoehen || {})[g] == null;
  });
  if (hOffen.length) {
    const vorschlaege = hOffen.map(function (g) {
      const h = (stand && stand.zuordnung && stand.zuordnung[g]) || {};
      return { g: g, wert: h.lichte_hoehe || (Z ? Z.HOEHE_RUECKFALL : 2.6),
               quelle: h.quelle || "kein Schnitt gefunden" };
    });
    fragen.push({ id: "hoehe", kategorie: "annahme",
      titel: "Raumhöhe " + hOffen.join(", "),
      texte: ["In den Unterlagen steht keine lichte Höhe für "
        + (hOffen.length === 1 ? "dieses Geschoss" : "diese Geschosse")
        + ". Betrifft " + mz(p.raeume.filter(function (r) {
            return hOffen.indexOf(r.geschoss) >= 0; }).length,
            "Raum", "Räume") + "."]
        .concat(vorschlaege.map(function (v) {
          return v.g + ": Vorschlag " + fmt(v.wert, 2) + " m (" + v.quelle + ").";
        })),
      /* Die strukturierten Werte je Geschoss bleiben am Objekt: sie sind
         die Herleitung selbst (Schnitt, Geschosshöhe, Rückfall) und werden
         von der Selbstprüfung nachgerechnet. Gezeichnet wird daraus der
         eine Vorschlag darunter. */
      vorschlaege: vorschlaege,
      vorschlag: vorschlagHoehe(vorschlaege),
      eingabe: vorschlaege.map(function (v) {
        /* KEINE VORBELEGUNG MEHR mit dem Vorschlagswert. Stünde er im
           Feld, wäre er nicht mehr von einer eigenen Eingabe zu
           unterscheiden — und „ablehnen" hieße, die Zahl des Werkzeugs
           erst zu löschen. Das Feld zeigt nur eine EIGENE Eingabe. */
        const eigen = (App.p.geschosshoehen || {})[v.g];
        return '<label class="feld"><span>Lichte Höhe ' + esc(v.g) + " in m</span>"
          + '<input type="text" inputmode="decimal" data-geschosshoehe="'
          + esc(v.g) + '" placeholder="' + esc(fmt(v.wert, 2))
          + ' (Vorschlag)" value="'
          + esc(eigen != null ? String(eigen) : "") + '"></label>';
      }).join(""),
      weg: [{ titel: "Alle Geschosse im Expertenmodus", schritt: "projekt" }] });
  }

  /* 7  Bestätigbare Annahmen — die Logik aus kern_annahmen und der
     Annahmenkarte, hier als Zentrum der Bedienung: WAS angenommen wurde,
     WARUM, ein Klick zum Bestätigen und das Feld zum Ändern. Bestätigt wird
     über denselben Weg wie im Kontrollblatt (zurKenntnis auf die
     Annahmen-Zeile der Selbstprüfung); die Annahme bleibt danach Annahme
     und steht so im Bericht. Die Höhenannahme bleibt hier draußen, solange
     die Höhenfrage oben steht: sie wäre die Zwillingskarte derselben
     Ursache. */
  const pr = App.pruefung;
  const annahmeZeilen = {};
  ((pr && pr.pruefungen) || []).forEach(function (x) {
    if (/^annahme_/.test(x.id)) annahmeZeilen[x.id] = x;
  });
  /* DIESELBE SACHE STEHT NICHT ZWEIMAL IN DER LISTE. Für die Höhe galt das
     schon; gemessen am Lauf „BV 2-0887 Ziolkowski" (26.08.2026) galt es
     fürs Baujahr nicht: die Sperre „Aus welchem Jahr stammt das Gebäude?"
     und die Annahmenkarte zum angenommenen Baujahr standen beide in der
     Liste, die Kopfzeile meldete „Wir brauchen noch 5 Angaben" bei vier
     Themen, und EINE Eingabe schloss beide Einträge (5 → 3). Solange die
     Frage zur Sache selbst offen ist, ist die Annahmenkarte ihre
     Zwillingskarte und bleibt draußen. */
  const schonGefragt = {};
  fragen.forEach(function (x) { schonGefragt[x.id] = 1; });
  annahmenListe(p).forEach(function (a) {
    if (a.schluessel === "hoehe" && hOffen.length) return;
    if (schonGefragt[a.schluessel]) return;
    const zid = "annahme_" + a.schluessel;
    const z = annahmeZeilen[zid];
    if (z && (z.stufe === "bestaetigt" || z.stufe === "gut")) return;
    fragen.push({ id: zid, kategorie: "annahme",
      titel: a.kurz || "Angenommener Wert",
      texte: [a.begruendung || ""].concat(a.richtung
        ? ["Richtung des möglichen Fehlers: " + a.richtung] : []),
      /* „Passt" nannte den Wert nicht, den es bestätigte. Jetzt steht er
         auf dem Knopf, mit Herkunft und Ablehnen daneben. */
      vorschlag: vorschlagAusAnnahme(a, zid),
      eingabe: annahmenFeld(a),
      weg: [{ titel: "Alle Annahmen unter Objekt und Klima", schritt: "projekt" }] });
  });

  /* 8  Der Rest der Selbstprüfung. Nur eine SPERRE wird noch zur Frage —
     ohne sie entsteht keine belastbare Zahl, also muss sie vor dem
     Bearbeiter stehen, auch wenn ihre einzige Antwort ein Weg ins
     Expertenwerkzeug ist. Alles andere ohne Antwortweg ist keine Frage,
     sondern eine FESTSTELLUNG über die Rechnung (Quervergleich nicht
     möglich, Anteil der Annahmen am Wärmestrom): es gibt daran nichts zu
     beantworten. Sie bleiben sichtbar — unten im Schritt, im Kontrollblatt
     und im Bericht — aber sie zählen nicht als „noch N Angaben". Das ist
     die Produktregel: was der Bearbeiter nicht beantworten kann, wird ihm
     nicht als Frage vorgelegt. */
  if (pr && pr.pruefungen) {
    const schonDa = { geo_a0: 1 };
    /* Die Frage zum abgeschnittenen Auftraggeber steht oben mit Eingabefeld;
       ihre Prüfzeile darf nicht zusätzlich als Feststellung auflaufen. */
    if (fragen.some(function (f) { return f.id === "bauherr_abgeschnitten"; })) {
      schonDa.bauherr_abgeschnitten = 1;
    }
    if (fragen.some(function (f) { return f.id === "klima"; })) schonDa.klima = 1;
    if (fragen.some(function (f) { return f.id === "klima" || f.id === "baujahr"
        || f.id === "flaeche"; })) schonDa.voll = 1;
    if (fragen.some(function (f) { return f.id === "we"; })) schonDa.we = 1;
    if (fragen.some(function (f) { return f.id === "bezeichnung"; })) schonDa.voll_dok = 1;
    const gruppen = {};
    pr.pruefungen.forEach(function (x) {
      /* Seit dem 25.08.2026 heißt alles Nicht-Fehlerhafte "hinweis"
         (Kundenwort); Hinweise ohne Antwortweg stehen hier als
         Feststellungen, Fehler werden zu Fragen. */
      if (x.stufe !== "fehler" && x.stufe !== "hinweis" && x.stufe !== "offen") return;
      if (x.annahme === true || /^annahme_/.test(x.id)) return;
      if (x.gruppe === "kontrollblatt") return;        // Originale in Punkt 5
      if (schonDa[x.id]) return;
      if (/^hoehe_/.test(x.id)
          && fragen.some(function (f) { return f.id === "hoehe"; })) return;
      if (x.stufe !== "fehler") {
        feststellungen.push({ id: x.id, titel: x.titel });
        return;
      }
      const schluessel = /^(hoehe|spez|u0|uhi|ulo|geo|plan|zone_warm|klima|kernwarn|mass)_/
        .test(x.id) ? x.id.replace(/_[^_]*$/, "") : x.id;
      if (!gruppen[schluessel]) gruppen[schluessel] = { erste: x, anzahl: 0 };
      gruppen[schluessel].anzahl++;
    });
    Object.keys(gruppen).forEach(function (k) {
      const g = gruppen[k];
      const ziel = /^(u0|uhi|ulo|bt)/.test(k) ? "bauteile"
        : /^zone/.test(k) ? "zonen"
        : /^(spez|geo|hoehe|plan|mass)/.test(k) ? "pruefblatt" : "kontrolle";
      fragen.push({ id: "pruef_" + k, kategorie: "sperre", titel: g.erste.titel,
        text: g.erste.text + (g.anzahl > 1
          ? " Betrifft " + mz(g.anzahl, "Stelle", "Stellen") + "." : ""),
        /* Auch diese Fragen tragen jetzt einen Vorschlag. Bisher standen
           sie ganz ohne Antwort da: nur zwei Verweise ins Expertenwerkzeug
           und kein Knopf — die härteste Sorte Sackgasse, weil sie zugleich
           eine Sperre ist. */
        vorschlag: vorschlagFuerPruefzeile(k, g),
        weg: [{ titel: "Öffnen und klären", schritt: ziel },
              { titel: "Im Kontrollblatt abhaken", schritt: "kontrolle" }] });
    });
  }

  /* Die Ordnung: Sperren, Widersprüche, Angaben, Annahmen — stabil, damit
     der Fragezeiger beim Neuzeichnen nicht springt.
     KEIN „|| 2" IM RANG: der Rang einer Sperre ist 0, und 0 || 2 ist 2.
     Genau daran stand die Baujahr-Sperre in der Abnahme vom 24.08.2026 als
     Frage 4 HINTER den Widersprüchen, obwohl sie 8→4 auflöst und die
     Kilowatt springen lässt. Nachschlagen statt verodern. */
  const rfRang = function (f) {
    return RF_RANG[f.kategorie] !== undefined ? RF_RANG[f.kategorie] : 2;
  };
  const raus = fragen.map(function (f, i2) { return { f: f, i: i2 }; })
    .sort(function (a, b) {
      const d = rfRang(a.f) - rfRang(b.f);
      return d !== 0 ? d : a.i - b.i;
    }).map(function (x) { return x.f; });
  rueckfragenMerk = { pr: App.pruefung, p: p, fragen: raus,
    feststellungen: feststellungen };
  return rueckfragenMerk;
}

function rueckfragenListe() {
  return rueckfragenStand().fragen;
}

/** Schritt 2: eine Frage nach der anderen, „Frage 1 von 4". */
function schrittRueckfragen() {
  const st = rueckfragenStand();
  const fragen = st.fragen;
  if (!App.p.raeume.length) {
    return '<div class="karte"><h2>Rückfragen</h2>'
      + '<p class="hinweis">Noch sind keine Räume da, also gibt es nichts zu '
      + "fragen. Erst die Unterlagen ablegen und analysieren lassen — die "
      + 'Rückfragen entstehen aus dem, was danach wirklich fehlt.</p>'
      + '<a href="#" data-schritt="start">Zu den Unterlagen</a></div>';
  }
  if (!fragen.length) {
    /* Nichts offen: kein Leerbildschirm, sondern der eine Weg weiter. */
    return '<div class="karte"><h2>Rückfragen</h2>'
      + '<div class="meldung gut"><span class="sym">' + ikon("haken")
      + '</span><div><b>Keine Rückfragen offen.</b> Alles, was die Rechnung '
      + "braucht, steht in den Unterlagen oder ist als benannter Standardwert "
      + "hinterlegt.</div></div>"
      + '<button class="btn primaer" data-schritt="ergebnis">Weiter zum Ergebnis'
      + ikon("pfeil-rechts") + "</button>"
      + standardwerteHinweis() + feststellungenHinweis(st) + "</div>";
  }
  let k = App.rueckfrageIndex || 0;
  if (k >= fragen.length) k = fragen.length - 1;
  if (k < 0) k = 0;
  App.rueckfrageIndex = k;
  const f = fragen[k];
  const KAT_WORT = {
    sperre: "Sperre — ohne Antwort entsteht keine belastbare Zahl",
    widerspruch: "Widerspruch — eine der beiden Angaben stimmt",
    angabe: "Offene Angabe",
    annahme: "Annahme — bestätigen oder ändern",
  };
  const texte = f.texte || (f.text ? [f.text] : []);
  return '<div class="karte" id="rueckfragen"><h2>Rückfragen</h2>'
    + '<p class="hinweis">Wir brauchen noch ' + mz(fragen.length, "Angabe", "Angaben")
    + ". Alles andere ist aus deinen Unterlagen bestimmt oder als benannter "
    + "Standardwert angesetzt — beides steht im Bericht.</p>"
    + (fragen.length > 1
      ? '<ol style="margin:0 0 4px;padding-left:1.5em;font-size:13px;color:var(--mute)">'
        + fragen.map(function (x, i2) {
            return "<li>" + (i2 === k
              ? "<b>" + esc(x.titel) + "</b>"
              : '<a href="#" data-aktion="rueckfrageZu" data-rf-i="' + i2 + '">'
                + esc(x.titel) + "</a>") + "</li>";
          }).join("") + "</ol>"
      : "")
    + '<div style="font-size:12.5px;color:var(--mute);margin:14px 0 6px">Frage '
    + (k + 1) + " von " + fragen.length
    + (KAT_WORT[f.kategorie] ? " · " + esc(KAT_WORT[f.kategorie]) : "") + "</div>"
    + '<div class="karte" style="background:var(--neutral)" data-rf-frage="'
    + esc(f.id) + '">'
    + "<h3 style=\"margin:0 0 6px\">" + esc(f.titel) + "</h3>"
    + texte.map(function (t) {
        return '<p style="margin:0 0 10px;font-size:14px">' + esc(t) + "</p>";
      }).join("")
    /* DER VORSCHLAG ZUERST. Er steht vor den übrigen Antwortwegen, weil er
       der wahrscheinlichste ist — und er bringt sein Ablehnen gleich mit. */
    + vorschlagBlock(f)
    + (f.antworten
      ? '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;'
        + 'margin:0 0 10px">' + f.antworten + "</div>"
      : "")
    /* DAS EINGABEFELD ERSCHEINT ERST NACH DEM ABLEHNEN. Solange ein
       Vorschlag steht, ist das Feld die zweite Antwort auf dieselbe Frage;
       zwei Wege nebeneinander sind einer zu viel, und ein vorbefülltes Feld
       verwischt vollends, wessen Zahl darin steht. Fragen OHNE ableitbaren
       Vorschlag zeigen ihr Feld sofort — das ist die begründete Ausnahme. */
    + (f.eingabe && vorschlagFeldZeigen(f)
      ? '<div class="feldreihe">' + f.eingabe + "</div>" : "")
    + (f.weg || []).map(function (w) {
        return '<a href="#" data-schritt="' + esc(w.schritt)
          + '" style="margin-right:14px;font-size:13px">' + esc(w.titel) + "</a>";
      }).join("")
    + "</div>"
    + '<div style="display:flex;gap:10px;margin-top:12px">'
    + (k > 0 ? '<button class="btn" data-aktion="rueckfrageZurueck">'
        + ikon("pfeil-links") + "Vorige Frage</button>" : "")
    + '<div class="fuell" style="flex:1"></div>'
    + (k < fragen.length - 1
      ? '<button class="btn" data-aktion="rueckfrageWeiter">Nächste Frage'
        + ikon("pfeil-rechts") + "</button>"
      : '<button class="btn" data-schritt="ergebnis">Zum Ergebnis'
        + ikon("pfeil-rechts") + "</button>")
    + "</div>"
    + standardwerteHinweis() + feststellungenHinweis(st) + "</div>";
}

/** Die üblichen Ansätze — EIN Block statt vier Einzelfragen. Sie werden
 *  verwendet und benannt, nicht abgefragt; gefragt wird nur, ob es
 *  Abweichungen gibt. „Ja" öffnet den Expertenbereich, „Nein" wird mit Name
 *  und Zeitpunkt gemerkt und wandert mit dem Projekt. */
function standardwerteHinweis() {
  const p = App.p;
  const ok = p.standard_ok;
  const werte = "Raumtemperaturen nach Raumart (DIN/TS 12831-1) · n50 "
    + fmt(num(p.luftdichtheit.n50, 3), 1) + " 1/h ("
    + (p.luftdichtheit.kategorie === "messung" ? "Messung" : "Annahme") + ") · "
    + "Wärmebrückenzuschlag " + fmt(num(p.norm.delta_u_wb, 0.1), 2) + " W/(m²·K) · "
    + "Aufheizzuschlag " + fmt(num(p.optionen.f_RH, 0), 0) + " W/m²";
  return '<div class="meldung hinweis" style="margin-top:16px;display:block">'
    + "<b>Wir verwenden die üblichen Ansätze:</b> " + esc(werte)
    + ". Sie stehen so im Bericht.<br>"
    + (ok
      ? '<span class="chip belegt">Keine Abweichungen'
        + (ok.wer ? " — bestätigt von " + esc(ok.wer) : " — bestätigt")
        + (ok.zeit ? " am " + esc(zeitDe(ok.zeit)) : "") + "</span> "
        + '<button class="btn klein" data-aktion="rueckfrageStandard">Zurücknehmen'
        + "</button>"
      : "Gibt es abweichende Räume oder Werte? "
        + '<button class="btn klein" data-aktion="rueckfrageStandard">Nein</button> '
        + '<a href="#" data-schritt="projekt">Ja, Randbedingungen ändern</a> · '
        + '<a href="#" data-schritt="raeume">abweichende Raumtemperaturen</a>')
    + "</div>";
}

/** Was keine Frage ist, verschwindet nicht: die Feststellungen der
 *  Selbstprüfung bleiben unter der Fragenliste sichtbar, mit dem Weg ins
 *  Kontrollblatt, wo sie im Einzelnen stehen und sich zur Kenntnis nehmen
 *  lassen. */
function feststellungenHinweis(st) {
  const fs = (st && st.feststellungen) || [];
  if (!fs.length) return "";
  return '<details style="margin-top:10px;font-size:13px;color:var(--mute)">'
    + "<summary>" + mz(fs.length, "Feststellung", "Feststellungen")
    + " ohne Rückfrage</summary>"
    + '<div style="margin-top:8px">Auskünfte über die Rechnung, keine Fragen — '
    + "es gibt daran nichts zu beantworten. Sie stehen im Bericht und im "
    + '<a href="#" data-schritt="kontrolle">Kontrollblatt</a>, wo sie sich im '
    + "Einzelnen nachlesen und zur Kenntnis nehmen lassen.<ul>"
    + fs.map(function (x) { return "<li>" + esc(x.titel) + "</li>"; }).join("")
    + "</ul></div></details>";
}

/* ===========================================================================
 * Das Urteil über die Unterlagen — der Bildschirm nach der Analyse
 * ===========================================================================
 * Drei Lagen, übersetzt aus der vorhandenen Wahrheit (Raumbuch, kern_pruefung
 * samt Kontrollblatt-Zählern, Rückfragenliste). Hier wird nichts neu geprüft:
 *   rot    kein einziger Raum übernommen — die Unterlagen reichen nicht,
 *          mit dem Grund je Blatt und dem Weg (Grundriss nachlegen).
 *   gelb   Räume da, aber die Prüfung meldet Fehler: grundsätzlich nutzbar,
 *          für eine belastbare Heizlast fehlen noch N Angaben.
 *   grün   Räume da, kein Fehler offen (belastbar im Sinn von kern_pruefung):
 *          geeignet; noch N Angaben, dann steht die Zahl.
 * ======================================================================== */
function urteilBerechnen() {
  const p = App.p;
  const seiten = (p.plan && p.plan.seiten) || [];
  const gelesen = seiten.filter(function (x) { return x.ausgewertet; });
  if (!gelesen.length && !p.raeume.length) return null;
  const fragen = rueckfragenListe();
  const raeume = p.raeume || [];
  const geschosse = [];
  raeume.forEach(function (r) {
    if (r.geschoss && geschosse.indexOf(r.geschoss) < 0) geschosse.push(r.geschoss);
  });
  let flaeche = 0, fenster = 0;
  raeume.forEach(function (r) {
    if (r.A > 0) flaeche += r.A;
    fenster += (r.fensterliste || []).length || (Number(r.fenster) || 0);
  });
  /* DIE KACHEL ZÄHLTE ETWAS ANDERES ALS DIE RECHNUNG.
     „FENSTER ERFASST" zählte die Fenster der Auslese je Raum. Sobald das
     Werkzeug daraus Bauteile gebildet hat, rechnet es mit MEHR: gegen die
     abgelegten Echtläufe nachgezählt — Ziolkowski 8 gezählt gegen 10
     Fensterbauteile, Hasenberg 6 gegen 9. Die Prüfprotokolle vom 26.08.2026
     nennen dasselbe („Kennzahl 6 bzw. 10 bei 11 bzw. 14 gerechneten
     Fensterbauteilen"). Eine Kennzahl, die nicht die Zahl im Rechenmodell
     ist, belegt nichts.
     Deshalb: liegen Bauteile vor, zählt die Kachel die FENSTERBAUTEILE —
     also das, womit gerechnet wird — und sagt es darunter. Vorher zählt sie
     wie bisher die Auslese und sagt AUCH das. Das Wort „erfasst" fällt weg:
     es behauptete einen Nachweis, den keine der beiden Zahlen führt. */
  /* NACHGESCHAERFT am 26.08.2026 (Hasenberg, Dumach, Frankenburg): gezaehlt
     wurden ZEILEN, nicht Fenster. Eine Fensterzeile fasst alle Fenster eines
     Raums zusammen und traegt ihre Zahl im Feld `anzahl` -- am Hasenberg
     fuehrte das Modell 20 Fenster auf 12 Zeilen, die Kachel nannte 12.
     Gezaehlt wird deshalb `anzahl`; fehlt sie (aeltere Staende, von Hand
     angelegte Bauteile), zaehlt die Zeile als ein Fenster. */
  let fensterBauteile = 0, mitBauteilen = false;
  raeume.forEach(function (r) {
    (r.bauteile || []).forEach(function (b) {
      mitBauteilen = true;
      if (String(b.art || "") !== "fenster") return;
      const n = Number(b.anzahl);
      fensterBauteile += Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
    });
  });
  const fensterZahl = mitBauteilen ? fensterBauteile : fenster;
  const fensterHer = mitBauteilen
    ? "im Rechenmodell angesetzt"
    : "aus der Auslese gezählt";
  /* Drei Datenarten: nachgewiesen (als Text im Plan angeschrieben), erkannt
     (aus der Auslese gelesen), angenommen (Standardwert). Die Zählung nimmt
     die Herkunft, die jeder Raum ohnehin trägt. */
  let nachgewiesen = 0, erkannt = 0, hand = 0;
  raeume.forEach(function (r) {
    const q = (r.herkunft && r.herkunft.quelle) || "";
    if (/stempel/i.test(q) || (r.herkunft && r.herkunft.flaeche_gelesen
        && r.herkunft.konfidenz === "sicher")) nachgewiesen++;
    else if (q) erkannt++;
    else hand++;
  });
  const stand = p.hoehenStand;
  const hAngenommen = geschosse.filter(function (g) {
    const h = (stand && stand.zuordnung && stand.zuordnung[g]) || {};
    return h.angenommen && (p.geschosshoehen || {})[g] == null;
  });
  const hoehenText = !geschosse.length ? null
    : hAngenommen.length === 0
      ? "Höhen aus Schnitt bzw. Eingabe"
      : hAngenommen.length === geschosse.length
        ? "Höhen angenommen"
        : "Höhen teils angenommen (" + hAngenommen.join(", ") + ")";
  /* Der Grund je Blatt, wenn nichts kam — was das Werkzeug schon weiß. */
  const gruende = [];
  gelesen.forEach(function (x) {
    const n = ((x.auslese && x.auslese.raeume) || []).length;
    if (n > 0) return;
    gruende.push({ blatt: x.bezeichnung || x.name || "Blatt",
      grund: x.istGrundriss === false
        ? "laut Auslese kein Grundriss (Ansicht, Schnitt oder Lageplan)"
        : "es wurde kein Raum sicher erkannt", i: seiten.indexOf(x) });
  });
  const lage = !raeume.length ? "rot"
    : (App.pruefung && App.pruefung.zaehl.fehler ? "gelb" : "gruen");
  return { lage: lage, fragen: fragen, gruende: gruende, blaetter: gelesen.length,
    zahlen: { geschosse: geschosse.length, raeume: raeume.length,
      flaeche: flaeche, fenster: fensterZahl, fensterHerkunft: fensterHer,
      hoehen: hoehenText },
    verbrauch: App.p.verbrauch || null,
    herkunft: { nachgewiesen: nachgewiesen, erkannt: erkannt, hand: hand,
      annahmen: App.pruefung ? App.pruefung.annahmen : 0 },
    rettung: raeume.length > 0 && gruende.length > 0 };
}

/** Was die Auswertung dieses Projekts gekostet hat — NACH dem Lauf.
 *  Bis hierher stand die Zahl nur im Fortschrittsfeld und war mit dem
 *  Urteil verschwunden; siehe verbrauchAblegen(). Sie steht bewusst klein
 *  und in derselben Zeile wie die Herkunft der Räume: eine Auskunft, keine
 *  Kaufentscheidung, und im Kundenbericht hat sie nichts zu suchen. */
function verbrauchZeile(v) {
  if (!v || !(v.lesungen > 0)) return "";
  const laeufe = v.laeufe || [];
  const kopf = "Aufwand der Auswertung: " + mz(v.lesungen, "Lesung", "Lesungen")
    + (laeufe.length > 1 ? " in " + mz(laeufe.length, "Lauf", "Läufen") : "")
    + ", zusammen rund " + fmt(v.kosten, 2) + " $.";
  if (laeufe.length < 2) {
    return '<div style="font-size:13px;color:var(--mute);margin-top:6px">'
      + esc(kopf) + "</div>";
  }
  return '<details style="font-size:13px;color:var(--mute);margin-top:6px">'
    + "<summary>" + esc(kopf) + "</summary>"
    + laeufe.map(function (x) {
        return esc(zeitDe(x.zeit) + " · " + mz(x.blaetter, "Blatt", "Blätter")
          + " · " + mz(x.lesungen, "Lesung", "Lesungen")
          + " · rund " + fmt(x.kosten, 2) + " $");
      }).join("<br>")
    + "</details>";
}

function urteilHtml(u) {
  const kachel = function (mark, wert, unten) {
    return '<div class="kennzahl"><span class="mark">' + esc(mark) + "</span><b>"
      + wert + "</b>" + (unten ? '<span class="unten">' + esc(unten) + "</span>" : "")
      + "</div>";
  };
  const herkunftZeile = function () {
    const h = u.herkunft;
    const teile = [];
    /* ZWEI ZEILEN, DIE SICH ZU WIDERSPRECHEN SCHIENEN.
       Prüflauf P2211 vom 26.08.2026: hier stand „20 nachgewiesen · 3 aus der
       Auslese erkannt", in der Selbstprüfung desselben Stands „23 Flächen
       sind im Plan angeschrieben und abgelesen". Beide Zahlen stimmen — die
       Maßstabsprobe zählt jede Fläche aus dem Textstand der Zeichnung, diese
       Zeile verlangt für „nachgewiesen" zusätzlich einen Flächenstempel mit
       sicherer Zuordnung. Nur ließ sich das nicht lesen: „aus der Auslese
       erkannt" klingt nach „nicht aus dem Plan". Die Wörter nennen jetzt das
       Merkmal, das sie unterscheidet, und 20 + 3 = 23 geht auf. */
    if (h.nachgewiesen) {
      teile.push(h.nachgewiesen + " mit Flächenstempel im Plan belegt");
    }
    if (h.erkannt) {
      teile.push(h.erkannt + " aus der Zeichnung gelesen, ohne sicheren Stempel");
    }
    if (h.hand) teile.push(h.hand + " von Hand erfasst");
    return '<div style="font-size:13px;color:var(--mute);margin-top:10px">'
      + "Herkunft der Räume: " + teile.join(" · ")
      + (h.annahmen
        ? ". Für " + mz(h.annahmen, "Parameter wurde eine Annahme",
            "Parameter wurden Annahmen")
          + ' verwendet — benannt in den <a href="#" data-schritt="rueckfragen">'
          + "Rückfragen</a> und im Bericht."
        : ".")
      + "</div>";
  };
  if (u.lage === "rot") {
    return '<div class="karte" style="margin:22px auto 0;max-width:46em;text-align:left">'
      + '<div class="meldung fehler" style="display:block"><b>Die Unterlagen '
      + "reichen für eine Heizlastberechnung noch nicht aus.</b><br>"
      + (u.gruende.length
        ? u.gruende.map(function (g) {
            return esc(g.blatt) + ": " + esc(g.grund) + ".";
          }).join("<br>")
        : "Aus den abgelegten Blättern kam kein Raum ins Raumbuch.")
      + "<br><b>Benötigt:</b> ein bemaßter Grundriss je beheiztem Geschoss "
      + "oder Blätter mit angeschriebenen Raumflächen.</div>"
      + '<button class="btn cta" data-aktion="ablageOeffnen">Weitere Unterlage '
      + "hochladen</button> "
      + '<a href="#" data-schritt="plan" style="font-size:13px;margin-left:10px">'
      + "Raum im Plan von Hand umfahren</a>"
      + "</div>";
  }
  const gruen = u.lage === "gruen";
  const n = u.fragen.length;
  return '<div class="karte" style="margin:22px auto 0;max-width:46em;text-align:left">'
    + '<div class="meldung ' + (gruen ? "gut" : "warnung") + '" style="display:block">'
    + (gruen
      ? "<b>" + (u.blaetter ? "Die Unterlagen sind für die Berechnung geeignet."
          : "Die Räume sind erfasst.") + "</b>"
      : "<b>" + (u.blaetter ? "Die Unterlagen sind grundsätzlich nutzbar."
          : "Die Räume sind erfasst, aber noch nicht vollständig.")
        + "</b> Für eine belastbare "
        + "Heizlast " + (n === 1 ? "fehlt noch 1 Angabe" : "fehlen noch "
        + n + " Angaben") + ".")
    + "</div>"
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));'
    + 'gap:10px;margin-top:12px">'
    + kachel("Geschosse", String(u.zahlen.geschosse), null)
    + kachel("Räume", String(u.zahlen.raeume), null)
    + kachel("Beheizte Fläche", u.zahlen.flaeche > 0
        ? fmt(u.zahlen.flaeche, 0) + " m²" : "–", null)
    + kachel("Fenster", u.zahlen.fenster > 0 ? String(u.zahlen.fenster) : "–",
        u.zahlen.fenster > 0 ? u.zahlen.fensterHerkunft : null)
    + (u.zahlen.hoehen ? kachel("Raumhöhen", "·", u.zahlen.hoehen) : "")
    + "</div>"
    + herkunftZeile()
    + verbrauchZeile(u.verbrauch)
    + (u.rettung
      ? '<div style="font-size:13px;margin-top:10px">Nicht jedes Blatt gab Räume '
        + 'her — wenn dort welche fehlen: <a href="#" data-schritt="plan">Raum im '
        + "Plan korrigieren</a>.</div>"
      : "")
    + '<div style="margin-top:16px">'
    + (n
      ? '<span style="font-size:14px">Noch ' + mz(n, "Angabe", "Angaben")
        + " erforderlich.</span> "
        + '<button class="btn cta" data-schritt="rueckfragen">Weiter zu den '
        + "Rückfragen</button>"
      : '<button class="btn cta" data-schritt="ergebnis">Weiter zum Ergebnis</button>')
    + "</div></div>";
}

function schrittStart() {
  const laeuft = App.auslese && App.auslese.laeuft;
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  const offenZuLesen = seiten.filter(auswertbar).length;
  /* Das Urteil steht erst, wenn nichts mehr zu lesen ist und nichts läuft. */
  const urteil = (!laeuft && !offenZuLesen) ? urteilBerechnen() : null;
  const kompakt = seiten.length > 0;
  const b = App.ausleseBericht;
  const fehlerKarte = (b && (b.fehler || []).length) ? ausleseBerichtHtml() : "";
  return '<div class="karte" style="text-align:center;padding:'
    + (kompakt ? "26px 24px" : "44px 24px") + '">'
    + '<h2 style="justify-content:center;font-size:23px;border:0">Unterlagen</h2>'
    + (kompakt ? ""
      : '<p class="hinweis" style="max-width:46em;margin:0 auto 22px">'
        + "PDF oder Bilder, mehrere auf einmal. Grundrisse, Schnitt, Ansichten, in "
        + "beliebiger Reihenfolge. Die Analyse startet von selbst; danach steht "
        + "hier, ob die Unterlagen für die Berechnung reichen.</p>")
    + '<div id="ablage" role="button" tabindex="0" '
    + (kompakt ? 'style="padding:14px 20px" ' : "")
    + 'aria-label="Pläne auswählen oder hierher ziehen">'
    + ikon("ablage")
    + "<b>" + (kompakt ? "Weitere Unterlage hochladen" : "Dateien auswählen") + "</b>"
    + '<span class="zweit">oder hierher ziehen · Cmd+V fügt ein '
    + "Bildschirmfoto ein</span></div>"
    + '<input type="file" id="planDateien" multiple accept="image/*,application/pdf" '
    + 'style="display:none">'
    + (laeuft ? fortschrittHtml() : "")
    + (urteil ? urteilHtml(urteil) : "")
    + fehlerKarte
    + stapelHtml()
    + '<div style="margin-top:26px;font-size:13px;color:var(--mute)">'
    + 'Keine Pläne zur Hand? <a href="#" data-schritt="projekt">Ohne Pläne beginnen</a> '
    + "und die Räume von Hand eintragen.</div>"
    + "</div>";
}

/** Was die letzte Auswertung getan hat, IN DER SEITE.
 *
 *  Vorher stand das in einem alert(). Zwei Dinge sind daran falsch: ein
 *  tab-modaler Dialog friert die Seite ein -- ein Prüfer hielt das Werkzeug
 *  deswegen für abgestürzt -- und nach dem Wegklicken ist die Auskunft weg,
 *  samt der Information, welches Blatt woran gescheitert ist. Hier bleibt sie
 *  stehen, bis sie weggeklickt wird. */
function ausleseBerichtHtml() {
  const b = App.ausleseBericht;
  if (!b) return "";
  const zeilen = [];
  (b.fehler || []).forEach(function (f) {
    zeilen.push('<div class="meldung fehler" style="display:block;text-align:left">'
      + "<b>" + esc(f.blatt) + "</b><br>" + esc(f.text) + "</div>");
  });
  (b.blaetter || []).forEach(function (x) {
    if (!x.vermerke.length) return;
    zeilen.push('<div class="meldung ' + (x.feldweise ? "gut" : "warnung")
      + '" style="display:block;text-align:left"><b>' + esc(x.blatt) + "</b> · "
      + mz(x.raeume, "Raum", "Räume")
      + (x.feldweise ? ", feldweise gelesen" : "") + "<br>"
      + x.vermerke.map(function (v) { return esc(v); }).join("<br>")
      + "</div>");
  });
  if (!zeilen.length) return "";
  return '<div class="karte" style="margin:22px auto 0;max-width:44em;text-align:left">'
    + '<div style="display:flex;justify-content:space-between;align-items:center">'
    + "<h3 style=\"margin:0\">Was die Auswertung getan hat</h3>"
    + '<button class="btn klein" data-aktion="berichtSchliessen">Schließen</button>'
    + "</div>" + zeilen.join("") + "</div>";
}

/** Fortschritt während der Auswertung. Der Bearbeiter wartet hier Minuten,
 *  deshalb steht immer da, was gerade geschieht — „Blatt 2 von 4: Grundriss
 *  OG wird gelesen" — und die Kosten stehen klein DARUNTER, nicht als Frage
 *  davor: sie sind eine Auskunft, keine Kaufentscheidung. */
function fortschrittHtml() {
  const a = App.auslese || {};
  const aktiv = a.aktiv || [];
  /* Seit die Lesungen gleichzeitig laufen, zeigt die Kopfzeile die
     Gleichzeitigkeit ("3 Lesungen laufen") und darunter, WELCHE — sonst
     wirkte die Anzeige eingefroren, waehrend drei Antworten unterwegs sind.
     Der Balken laeuft ueber die AUFRUFE, nicht ueber die Blaetter: bei zwei
     Blaettern, die gleichzeitig fertig werden, stuende er sonst minutenlang
     auf null. Die Zahl der Aufrufe waechst, wenn ein Blatt zerlegt werden
     muss; der Balken wird dann nie kleiner, nur langsamer. */
  const kopf = aktiv.length === 0
    ? esc(a.was || "Analyse läuft")
    : (aktiv.length === 1 ? "Eine Lesung läuft"
       : aktiv.length + " Lesungen laufen gleichzeitig");
  const balkenAnteil = a.aufrufe
    ? Math.max(a.gesamt ? (a.fertig / a.gesamt) : 0,
               (a.aufrufeFertig || 0) / a.aufrufe)
    : (a.gesamt ? a.fertig / a.gesamt : 0);
  const anteil = Math.round(balkenAnteil * 100);
  return '<div class="karte" style="margin:22px auto 0;max-width:34em;text-align:left">'
    + "<b>" + kopf + "</b>"
    + (aktiv.length
      ? '<div style="font-size:12.5px;color:var(--mute);margin-top:2px">'
        + aktiv.slice(0, AUSLESE_GLEICHZEITIG).map(esc).join("<br>") + "</div>"
      : "")
    + '<div class="balken" role="progressbar" aria-valuemin="0" aria-valuemax="100"'
    + ' aria-valuenow="' + anteil + '"><span style="transform:scaleX('
    + (anteil / 100) + ')"></span></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:12.5px;'
    /* DIE ZAHL, DIE VORNE STEHT, WIRD GELESEN.
       Vorne stand die Zahl der fertigen BLÄTTER — und ein Blatt gilt erst
       als fertig, wenn alle seine Lesungen zurück sind. Prüflauf P2211 vom
       26.08.2026: „Fortschritt 1 von 6 Blättern bei bereits 19 von 28
       Lesungen." Beide Zahlen stimmten, nur führte die vordere in die Irre.
       Der Balken läuft ohnehin über die Aufrufe (siehe oben); die Zeile tut
       es jetzt auch, und die Blätter stehen als das dahinter, was sie sind:
       der gröbere Takt. */
    + 'color:var(--mute)"><span>'
    + (a.aufrufe
      ? (a.aufrufeFertig || 0) + " von " + a.aufrufe
        + (a.aufrufe === 1 ? " Lesung" : " Lesungen") + " fertig · "
        + (a.fertig || 0) + " von " + (a.gesamt || 0)
        + (a.gesamt === 1 ? " Blatt" : " Blättern") + " abgeschlossen"
      : (a.fertig || 0) + " von " + (a.gesamt || 0)
        + (a.gesamt === 1 ? " Blatt" : " Blättern") + " fertig")
    + "</span><span>"
    + (a.kosten ? "Analysekosten bisher ca. " + fmt(a.kosten, 2) + " $" : "")
    + "</span></div>"
    + '<button class="btn klein" data-aktion="ausleseAbbrechen" '
    + 'style="margin-top:10px">Abbrechen</button></div>';
}

/** Übersicht des abgelegten Stapels. */
function stapelHtml() {
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  if (!seiten.length) return "";
  const artText = { vektorplan: "Zeichnung mit Vektordaten", scan: "Scan",
                    textseite: "Textseite", mischblatt: "Zeichnung und Text",
                    /* Schrift in Kurven gewandelt: sieht aus wie eine
                       Zeichnung, hat aber keinen lesbaren Textstand. Ohne
                       eigene Bezeichnung stand hier die nackte Kennung. */
                    vektorplan_ohne_text: "Zeichnung ohne Textstand",
                    leer: "leer" };
  /* Der Stand je Blatt gehoert in die Liste. Ohne ihn steht oben "Wird
     ausgewertet: Grundriss EG" und darunter leuchtet eine gruene Zeile KG,
     und nichts verbindet die beiden Aussagen miteinander. */
  const a = App.auslese || {};
  const standZelle = function (x, i) {
    /* Seit die Blaetter gleichzeitig laufen, koennen MEHRERE Zeilen aktiv
       sein; laufendeSeiten ist eine Liste. Das alte Einzelfeld bleibt als
       Rueckfalloption lesbar, damit kein Zwischenstand eine leere Zelle zeigt. */
    if (a.laeuft && ((a.laufendeSeiten || []).indexOf(i) >= 0
        || a.laufendeSeite === i)) {
      return '<span class="chip annahme">wird ausgewertet</span>';
    }
    if (x.ausgewertet) {
      const n = ((x.auslese && x.auslese.raeume) || []).length;
      /* Ein Blatt, das als "kein Grundriss" eingestuft wurde, sah bisher genau
         so aus wie ein erfolgreich gelesener Grundriss: grün, "ausgewertet".
         Dass daraus kein einziger Raum kam, stand nirgends. Das ist der
         teuerste Fehler dieser Kette, weil ihn niemand sieht. */
      if (n === 0) {
        return '<span class="chip annahme">' + (x.istGrundriss === false
            ? "kein Grundriss" : "kein Raum gefunden") + "</span>"
          + '<br><button class="btn klein" data-aktion="blattNochmal" data-i="' + i
          + '"' + (a.laeuft ? " disabled" : "") + ' style="margin-top:4px">'
          + "Als Grundriss lesen</button>";
      }
      return '<span class="chip belegt">' + mz(n, "Raum", "Räume") + "</span>"
        + (x.feldweise ? '<br><span style="font-size:11.5px;color:var(--mute)">aus '
            + x.feldweise + " Feldern</span>"
          : (x.zugeschnitten ? '<br><span style="font-size:11.5px;color:var(--mute)">'
              + "zugeschnitten gelesen</span>" : ""));
    }
    if (x.verwenden === false) return '<span class="chip">nicht vorgemerkt</span>';
    if (a.laeuft && auswertbar(x)) return '<span class="chip">wartet</span>';
    return "–";
  };
  /* Die Blättertabelle (Art, Stand, Maßstab, feldweise gelesen) ist der
     Maschinenraum. Sie bleibt vollständig, steht aber zugeklappt unter
     „Details zur Auswertung" — offen nur, solange die Analyse läuft oder
     noch Blätter warten, denn dann IST sie der Stand der Dinge. */
  const alleGelesen = seiten.every(function (x) {
    return x.ausgewertet || x.verwenden === false || x.nurDaten
      || typeof x.rendern !== "function";
  });
  const detailsOffen = (a.laeuft || !alleGelesen);
  const bE = App.ausleseBericht;
  const vermerkKarte = (bE && !(bE.fehler || []).length) ? ausleseBerichtHtml() : "";
  return '<details style="margin-top:24px;text-align:left"'
    + (detailsOffen ? " open" : "") + ">"
    + '<summary style="cursor:pointer;font-size:13.5px;color:var(--mute)">'
    + "Details zur Auswertung (" + mz(seiten.length, "Blatt", "Blätter")
    + ")</summary>"
    + '<div class="tabhuelle" style="margin-top:12px;text-align:left">'
    + '<table class="tab"><thead><tr><th style="min-width:150px">Unterlage</th>'
    + '<th style="width:130px">Art</th><th style="width:72px">Blatt</th>'
    + '<th style="width:130px">Stand</th>'
    + '<th style="width:250px">Maßstab</th><th style="width:46px"></th>'
    + "</tr></thead><tbody>"
    + seiten.map(function (x, i) {
        /* Die Guetestufe wird in massstabZelle() gesetzt; sie hier ein
           zweites Mal auszurechnen und nicht zu benutzen, war ein
           Ueberbleibsel. */
        return "<tr><td>" + esc(x.bezeichnung || "Seite " + (i + 1))
          + (x.geschoss ? '<br><span style="font-size:12px;color:var(--mute)">'
              + esc(x.geschoss) + "</span>" : "") + "</td>"
          + "<td>" + esc(artText[x.typ] || x.typ || "–") + "</td>"
          + "<td>" + esc(x.format || "–") + "</td>"
          + "<td>" + standZelle(x, i) + "</td>"
          + "<td>" + massstabZelle(x, i) + "</td>"
          + '<td><button class="btn klein nurikon gefahr" data-aktion="planWeg" data-i="'
          + i + '"' + (a.laeuft ? " disabled" : "")
          + ' title="Unterlage entfernen" aria-label="'
          + esc(x.bezeichnung || "Seite " + (i + 1)) + ' entfernen">' + ikon("x")
          + "</button></td></tr>";
      }).join("")
    + "</tbody></table></div>"
    + vermerkKarte
    + "</details>"
    + stempelKarte(seiten)
    + stapelKnopf(seiten);
}

/** Die im Plan angeschriebenen Raumflächen, bevor irgendetwas Geld kostet.
 *
 *  Diese Karte ist der kürzeste Weg vom Plan zum Raumbuch: bei einer
 *  Vektorzeichnung mit Flächenstempeln stehen Name und Fläche als Text im
 *  Dokument. Sie werden beim Ablegen der Datei gelesen, ohne Netz, ohne
 *  Modellaufruf, ohne Maßstab. Deshalb steht die Karte ÜBER dem Knopf für die
 *  kostenpflichtige Auslese. */
function stempelKarte(seiten) {
  const offen = [], fertig = [];
  seiten.forEach(function (x, i) {
    const l = stempelraeumeDesBlatts(x);
    if (!l.length) return;
    if (x.stempelUebernommen) fertig.push({ i: i, seite: x, liste: l });
    else offen.push({ i: i, seite: x, liste: l });
  });
  if (!offen.length && !fertig.length) return "";
  const zeile = function (e, schon) {
    const summe = e.liste.reduce(function (a, x) { return a + x.A; }, 0);
    const gesch = [];
    e.liste.forEach(function (x) {
      if (x.geschoss && gesch.indexOf(x.geschoss) < 0) gesch.push(x.geschoss);
    });
    return '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;'
      + 'padding:8px 0;border-top:1px solid var(--linie)">'
      + '<span style="flex:1 1 12em;min-width:12em">'
      + esc(e.seite.bezeichnung || "Seite " + (e.i + 1))
      + '<br><span style="font-size:12px;color:var(--mute)">'
      + mz(e.liste.length, "Raum", "Räume") + ", zusammen " + fmt(summe, 2) + " m²"
      + (gesch.length > 1 ? " auf " + gesch.length + " Geschossen" : "")
      + "</span></span>"
      + (schon
        ? '<span class="chip belegt">' + e.seite.stempelUebernommen
          + " übernommen</span>"
        /* Bewusst KEIN gelber Knopf: Gelb ist auf jedem Bildschirm für genau
           EINE Handlungsaufforderung reserviert, und die gehört hier der
           Analyse bzw. dem „Weiter zu den Rückfragen" des Urteils. Zwei
           gelbe Knöpfe nebeneinander („Weiter zu den Rückfragen" gegen
           „25 Räume übernehmen") waren ein Befund der Abnahme vom
           24.08.2026. */
        : '<button class="btn klein" data-aktion="stempelUebernehmen" data-i="'
          + e.i + '">' + mz(e.liste.length, "Raum", "Räume") + " übernehmen</button>")
      + "</div>";
  };
  return '<div class="karte" style="margin-top:20px;text-align:left">'
    + "<h3 style=\"margin:0 0 4px\">Im Plan angeschriebene Raumflächen</h3>"
    + '<p class="hinweis" style="margin:0">Aus dem Textstand der Zeichnung gelesen, '
    + "nicht gemessen und nicht geschätzt: die Zahlen stehen als Text im Dokument "
    + "und hängen an keinem Maßstab. Kostet nichts.</p>"
    + offen.map(function (e) { return zeile(e, false); }).join("")
    + fertig.map(function (e) { return zeile(e, true); }).join("")
    + "</div>";
}

/** Wechselt zum Messwerkzeug und stellt genau diese Seite ein.
 *
 *  Das muss über MODUL_PLAN.messenStarten laufen und nicht über bildLaden:
 *  nur messenStarten setzt den Messbetrieb UND merkt sich die Seitennummer.
 *  Ohne die Nummer landet das Messergebnis nirgends — es wird gemessen, es
 *  steht eine Zahl da, und an der Seite im Stapel ändert sich nichts.
 *
 *  Die Reihenfolge ist ebenso wichtig: erst anmelden, dann zeichnen. Zeichnet
 *  man zuerst, lädt MODUL_PLAN.aktivieren von selbst die erste Seite des
 *  Stapels und der Bearbeiter sieht ein anderes Blatt als das angeklickte. */
function massstabMessenOeffnen(i) {
  const seiten = (App.p.plan && App.p.plan.seiten) || [];
  if (!seiten[i]) return;
  if (!window.MODUL_PLAN || !window.MODUL_PLAN.messenStarten) {
    sagen("Das Messwerkzeug ist nicht geladen.", { stufe: "fehler" });
    return;
  }
  App.schritt = "plan";
  App.detailOffen = true;
  window.MODUL_PLAN.messenStarten(i);
  render();
  window.scrollTo(0, 0);
}

/** Der Maßstab in der Stapelübersicht.
 *
 *  Wichtig für das Verständnis: Der Maßstab wird nur gebraucht, wenn Flächen
 *  AUS DEM BILD gemessen werden. Stehen die Raumflächen im Plan angeschrieben
 *  oder liegt eine Wohnflächenberechnung bei, ist er für die Rechnung ohne
 *  Bedeutung. Deshalb wird "offen" nur dort gezeigt, wo er wirklich fehlt;
 *  sonst steht "nicht nötig". Ein Werkzeug, das etwas anmahnt, das gar nicht
 *  gebraucht wird, erzieht dazu, Meldungen zu übergehen. */
/** Vorschlag für den Nenner: was im Schriftfeld stand, sonst der bei diesem
 *  Blattformat übliche Maßstab. Nur ein Vorschlag, er wird nicht gesetzt. */
function m_nenner_vorschlag(seite) {
  const k = seite.blattkopf || {};
  /* Zuerst das, was auf dem Blatt selbst steht. Der PDF-Textstand kennt den
     Vermerk nur bei einer Vektorzeichnung; bei einem Scan steht er allein in
     dem, was das Modell abgelesen hat. */
  const g = seite.massstabGelesen;
  if (g && g.nenner > 0) return String(g.nenner);
  if (k.massstab_nenner > 0) return String(k.massstab_nenner);
  const f = String(seite.format || "");
  if (/A0|A1/.test(f)) return "50";
  if (/A2|A3/.test(f)) return "100";
  return "100";
}

/* Die Guetestufen des Massstabs: innen die Kennung, aussen das Wort, das
   dasteht. Bisher stand die Kennung selbst in der Tabelle -- "abgesichert",
   "vorlaeufig", ohne Umlaut und in der Sprache des Quelltexts. */
const MASSSTAB_GUETE = {
  abgesichert: { klasse: "belegt", wort: "zweifach belegt" },
  belegt: { klasse: "belegt", wort: "belegt" },
  vorlaeufig: { klasse: "annahme", wort: "vorläufig" },
  widerspruch: { klasse: "annahme", wort: "widersprüchlich" },
  unbekannt: { klasse: "annahme", wort: "offen" },
};

function massstabZelle(seite, i) {
  const m = seite.massstab || {};
  const g = MASSSTAB_GUETE[m.guete];
  const guete = g ? g.klasse : null;
  /* Woher der Wert kommt, gehört sichtbar daneben. Ein Maßstab aus dem
     Schriftfeld und ein am Bild gemessener sind nicht dasselbe: der erste
     stimmt nicht mehr, sobald das Blatt verkleinert kopiert oder
     abfotografiert wurde. Wer das nicht sieht, rechnet mit einer Zahl, die
     jede Fläche im Projekt verzieht. */
  const herkunft = m.quelle
    ? '<br><span style="font-size:11.5px;color:var(--mute)">' + esc(m.quelle) + "</span>"
    : "";
  /* Messen ist immer möglich und bei jedem offenen oder strittigen Maßstab
     der verlässlichere Weg: es misst die Zeichnung, die tatsächlich vorliegt,
     statt zu glauben, was jemand ins Schriftfeld geschrieben hat. */
  const messen = function (klasse) {
    return ' <button class="btn klein' + (klasse ? " " + klasse : "")
      + '" data-aktion="massstabMessen" data-i="' + i
      + '" title="Eine Strecke im Plan ziehen, deren Länge bekannt ist">messen</button>';
  };
  /* Was jetzt zu tun ist. Ein offener Maßstab ohne diesen Satz war der
     häufigste Grund, dass hier nichts weiterging. */
  const anweisung = function (t) {
    return '<br><span style="font-size:11.5px;color:var(--mute)">' + esc(t) + "</span>";
  };

  if (m.nenner) {
    const knapp = m.guete !== "abgesichert";
    return "1:" + m.nenner
      + (g ? ' <span class="chip ' + g.klasse + '">' + esc(g.wort) + "</span>" : "")
      + ' <button class="btn klein" data-aktion="massstabSetzen" data-i="' + i
      + '" title="Maßstab ändern">ändern</button>'
      + messen("")
      + herkunft
      + (knapp
        ? anweisung("Nur einfach belegt. Eine Strecke im Plan nachmessen sichert ab, "
            + "ob das Blatt noch in Originalgröße vorliegt.")
        : "");
  }
  /* Kein Nenner, aber das Blatt wurde gelesen: dann steht in der Herkunft,
     warum nichts herauskam. Das ist mehr wert als ein blosses "offen". */
  if (m.guete === "widerspruch" || (seite.massstabGelesen && seite.massstabGelesen.angaben.length)) {
    return '<span class="chip annahme">nicht übernommen</span>'
      + ' <button class="btn klein" data-aktion="massstabSetzen" data-i="' + i
      + '">setzen</button>' + messen("") + herkunft
      + anweisung("Auf \"messen\" gehen und eine bemaßte Strecke im Plan abgreifen. "
          + "Das entscheidet, welche Angabe gilt.");
  }
  /* Wurde für dieses Blatt schon ausgelesen und kamen dabei Flächen heraus,
     wird der Maßstab nicht gebraucht. */
  const gelesen = ((seite.auslese && seite.auslese.raeume) || [])
    .filter(function (r) { return r.flaeche_m2 != null; }).length;
  if (gelesen > 0) {
    return '<span class="chip belegt">nicht nötig</span>'
      + '<br><span style="font-size:11.5px;color:var(--mute)">' + gelesen
      + " Flächen stehen im Plan</span>";
  }
  if (seite.ausgewertet && seite.istGrundriss === false) {
    return '<span class="chip">nicht nötig</span>'
      + '<br><span style="font-size:11.5px;color:var(--mute)">kein Grundriss</span>';
  }
  /* Offen. Welcher Weg der richtige ist, hängt daran, ob die Unterlage ein
     Dokument mit Blattmaß ist oder nur ein Bild. */
  const hatBlattmass = seite.breite_mm > 0;
  return (hatBlattmass
      ? '<button class="btn klein" data-aktion="massstabSetzen" data-i="' + i
        + '">1:… eintragen</button>' + messen("")
      : '<button class="btn klein" data-aktion="massstabMessen" data-i="' + i
        + '">Maßstab messen</button>')
    + herkunft
    /* Die Herkunft nennt bereits die Tatsache ("auf dem Blatt steht kein
       Maßstab"). Sie hier ein zweites Mal hinzuschreiben ergab genau den
       Doppelsatz, den die Erstnutzerin gefunden hat. Die Anweisung sagt
       deshalb nur noch, was zu tun ist; die Tatsache steht nur dann hier,
       wenn keine Herkunft dasteht, die sie schon nennt. */
    + anweisung(seite.ausgewertet || !seite.rendern
      ? (hatBlattmass
        ? (m.quelle ? "" : "Auf dem Blatt steht kein Maßstab. ")
          + "Entweder den Nenner von Hand eintragen oder eine bemaßte Strecke "
          + "nachmessen."
        : "Bild ohne Blattmaß. Hier hilft nur Messen an einer bemaßten Strecke.")
      : (hatBlattmass
        ? "Aus dem Dokument war nichts zu holen. Die Auslese unten liest noch das "
          + "Schriftfeld; bringt auch die nichts, hier messen."
        : "Eine Bilddatei hat keinen Textstand. Die Auslese unten sieht das "
          + "Schriftfeld; steht dort keiner, hier messen."));
}

/** Der Knopf, der die kostenpflichtige Auswertung anstößt, mit Vorschau. */
/** Blätter, die sich jetzt auslesen lassen: noch nicht ausgewertet, nicht
 *  abgewählt und mit einem Bild, das sich rendern lässt. */
function auswertbar(x) {
  return !x.ausgewertet && x.verwenden !== false && !x.nurDaten
    && typeof x.rendern === "function";
}

/** Was ein Blatt der Auslese ueberhaupt bringen kann -- VOR dem Klick.
 *
 *  Der Befund, der das noetig machte: ein Satz aus vier Ansichten. Alle vier
 *  tragen im Schriftfeld die Blattart "ansicht", das Werkzeug weiss das vor
 *  dem Klick aus dem Textstand, und es bot trotzdem "4 Blätter auswerten
 *  lassen" für 0,36 $ an, ohne zu sagen, dass in diesem Satz kein Grundriss
 *  steckt. Was das Werkzeug vor dem Klick weiss, gehoert vor den Klick. */
function ertragErwartung(x) {
  const art = (x.blattkopf && x.blattkopf.blattart) || null;
  if (art === "ansicht") {
    return { gruppe: "kopf", text: "Ansicht laut Schriftfeld: keine Räume, "
      + "keine Geschosshöhen. Es läuft nur die zählende zweite Lesung; das "
      + "Schriftfeld wird nur dann per Modell gelesen, wenn es nicht schon "
      + "aus dem Textstand vorliegt." };
  }
  if (art === "lageplan") {
    return { gruppe: "kopf", text: "Lageplan laut Schriftfeld: keine Räume. "
      + "Es läuft nur die zählende zweite Lesung; das Schriftfeld wird nur "
      + "dann per Modell gelesen, wenn es nicht schon aus dem Textstand "
      + "vorliegt." };
  }
  if (art === "schnitt") {
    /* "schnitt" ist ein Verdacht, kein Befund, und das steht hier bewusst so.
       GEMESSEN am 22.08.2026: der echte Erdgeschossplan "4.1.1.8 BT 2_3_4 - EG"
       traegt die Beschriftung "SCHNITT H" -- das ist eine Schnittlinie IM
       Grundriss, nicht der Blatttyp. Wer daraus schliesst, auf dem Blatt seien
       keine Raeume, macht genau den teuersten Fehler dieser Kette. Das Blatt
       bleibt deshalb in der Gruppe, die Raeume bringen kann. */
    return { gruppe: "raeume", text: "Auf dem Blatt steht „Schnitt“. Ob das der "
      + "Blatttyp ist oder nur eine Schnittlinie im Grundriss, zeigt erst der "
      + "Durchgang. Geschosshöhen werden mitgelesen." };
  }
  if (x.typ === "textseite" || x.typ === "leer") {
    return { gruppe: "kopf", text: "Keine Zeichnung auf dem Blatt." };
  }
  if (art === "grundriss") {
    return { gruppe: "raeume", text: "Grundriss laut Schriftfeld." };
  }
  return { gruppe: "raeume", text: "Blattart steht nicht im Schriftfeld; ob "
    + "Räume darauf sind, zeigt erst der Durchgang." };
}

/** Der Knopf, der die kostenpflichtige Auswertung anstößt, mit Vorschau. */
function stapelKnopf(seiten) {
  const offen = seiten.filter(auswertbar);
  const fertig = seiten.filter(function (x) { return x.ausgewertet; });
  /* Vorschau aus dem, was gemessen wurde, nicht aus dem, was ein Blatt
     kosten "sollte". Je Blatt fallen ZWEI bis DREI Modellaufrufe an: die
     Raumliste immer, die Zusatzangaben immer, die Höhen zusätzlich bei einem
     Blatt, das kein reiner Grundriss ist.
     GEMESSEN am 22.08.2026 gegen den laufenden Endpunkt, je Aufruf:
       Raumliste  0,046 $ (kurze Antwort) bis 0,090 $ (volle Länge)
       Höhen      0,020 $
       Zusatz     0,024 bis 0,060 $
     Und im ganzen Durchlauf gemessen, vier Ansichten mit je drei Aufrufen:
       0,4075 $ für vier Blätter, also 0,102 $ je Blatt.
     Angesetzt werden 0,12 $ je Blatt. Die frühere Schätzung von 0,15 $ lag
     knapp 50 % über dem gemessenen Wert; eine Vorschau, die zu hoch liegt,
     hält jemanden von einem Schritt ab, der sich lohnt.
     Ein Blatt, das zerlegt werden muss, kostet je Feld einen weiteren Aufruf.
     GEMESSEN am Bogen "Dumach 1": drei Felder, 0,21 $ zusätzlich, also rund
     0,07 $ je Feld. Das steht als Zuschlag daneben, weil sich vorher nicht
     sagen lässt, ob ein Bogen zerlegt werden muss. */
  if (!offen.length) {
    return '<div style="margin-top:18px;text-align:center">'
      + '<span class="chip belegt">' + (fertig.length === 1 ? "Ein Blatt ausgewertet"
          : fertig.length + " Blätter ausgewertet") + "</span>"
      + "</div>";
  }
  const gruppen = { raeume: [], hoehen: [], kopf: [] };
  offen.forEach(function (x) {
    const e = ertragErwartung(x);
    gruppen[e.gruppe].push({ seite: x, text: e.text });
  });
  /* ZUSCHLAG FUER DIE ZWEITE LESUNG.
     Sie liest dasselbe Bild noch einmal, also faellt derselbe Bildpreis an;
     ihre Antwort ist dagegen kurz, weil sie nur zaehlt.
     NICHT GEMESSEN, sondern aus dem naechsten gemessenen Nachbarn
     hochgerechnet: die Betriebsart "hoehen" hat dasselbe Bild und eine kurze
     Antwort und kostet gemessen 0,020 $. Die laengere Zaehlliste schlaegt mit
     rund 0,005 $ auf, macht rund 0,025 $ und bei 3,2 s Anlauf und 135 Token
     je Sekunde rund 6 s. Damit steigt der Ansatz von 0,12 auf 0,145 $ je
     Blatt und die Dauer von 50 auf 56 s.
     Sobald ein ganzer Durchlauf gelaufen ist, wird hier der gemessene Wert
     eingetragen; die Vorschau darf nicht dauerhaft auf einer Rechnung stehen.
     Sie ist bewusst eher zu hoch als zu niedrig angesetzt -- eine Vorschau,
     die unter der Rechnung liegt, ueberrascht am Monatsende. */
  /* ZUSCHLAG FUER BLAETTER, DIE VON VORNHEREIN FELDWEISE GELESEN WERDEN.
     Bis zum 27.08.2026 stand hier, es lasse sich vorher nicht sagen, ob ein
     Bogen zerlegt werden muss. Fuer die beiden Ausloeser in vorabGrund()
     stimmt das nicht mehr: kleinste Schrift und Zahl der Flaechenstempel
     stehen beim Ablegen fest. Was sich dann sagen laesst, gehoert in die
     Vorschau -- sonst nennt sie 0,29 $ und die Rechnung sagt 0,50 $.
     Angesetzt mit den gemessenen 0,07 $ je Feld (Bogen "Dumach 1": drei
     Felder, 0,21 $ zusaetzlich). Das erste Feld ersetzt nichts, es kommt
     hinzu, weil das Ganzblatt bewusst weiterlaeuft. */
  let felderZuschlag = 0, vorabBlaetter = 0;
  offen.forEach(function (x) {
    const g = vorabGrund(x);
    if (!g) return;
    vorabBlaetter++;
    felderZuschlag += g.teile * 0.07;
  });
  const kosten = offen.length * 0.145 + felderZuschlag;
  /* DAUER seit der gleichzeitigen Auslese: drei Aufrufe laufen nebeneinander
     (PLANER), je Betriebsart geht nur der erste Aufruf allein voraus (er
     waermt den Prompt-Zwischenspeicher). Aus den GEMESSENEN Einzelzeiten vom
     24.08.2026 (laengster Durchgang "Zusatzangaben" 25 bis 29 s, Raumliste
     9 bis 25 s, Gegenprobe 5 bis 10 s) folgt hochgerechnet: rund 30 s Anlauf
     fuer die erste Welle plus rund 18 s je weiterem Blatt. Der lokale
     Messlauf mit denselben Antwortzeiten (messung_nachher, 24.08.2026) kam
     fuer 2 Blaetter samt Zerlegungs-Rettung auf unter eine Minute; vorher,
     alles nacheinander, waren dieselben 2 Blaetter 165 s. */
  const dauer = Math.max(1, Math.ceil((30 + offen.length * 18) / 60));
  const laeuft = !!(App.auslese && App.auslese.laeuft);

  /* Der teuerste Fall: ein Stapel ohne einen einzigen Grundriss. Er kostet
     dasselbe wie jeder andere und bringt kein einziges Zimmer. */
  const keinGrundriss = gruppen.raeume.length === 0;
  const zeile = function (liste, titel) {
    if (!liste.length) return "";
    const namen = liste.map(function (e) {
      return esc(e.seite.bezeichnung || e.seite.name || "Blatt");
    }).join(", ");
    return '<div style="margin:6px 0"><b>' + titel + "</b> · " + namen
      + '<br><span style="color:var(--mute)">' + esc(liste[0].text) + "</span></div>";
  };
  return '<div style="margin-top:18px;text-align:center">'
    + (keinGrundriss
      ? '<div class="meldung warnung" style="display:block;text-align:left;'
        + 'max-width:44em;margin:0 auto 14px"><b>In diesem Stapel steckt kein '
        + "Grundriss.</b><br>Das Werkzeug liest das aus dem Schriftfeld der Blätter, "
        + "bevor irgendetwas kostet. Aus diesen Unterlagen kommt kein Raum ins "
        + "Raumbuch. Was die Auslese hier noch bringt: Anschrift und Postleitzahl "
        + "aus dem Schriftfeld"
        + (gruppen.hoehen.length ? " und die Geschosshöhen aus dem Schnitt" : "")
        + ". Wer nur die Räume braucht, spart sich den Schritt und legt den "
        + "Grundriss nach.</div>"
      : "")
    + '<div style="max-width:44em;margin:0 auto 14px;text-align:left;font-size:13px">'
    + zeile(gruppen.raeume, "Kann Räume bringen")
    + zeile(gruppen.hoehen, "Bringt Höhen, keine Räume")
    + zeile(gruppen.kopf, "Bringt nur das Schriftfeld")
    + "</div>"
    + '<button class="btn ' + (keinGrundriss ? "" : "cta")
    + '" data-aktion="stapelAuswerten"' + (laeuft ? " disabled" : "") + ">"
    + (laeuft ? "Analyse läuft…" : "Unterlagen vollständig analysieren") + "</button>"
    + '<div style="font-size:12.5px;color:var(--mute);margin-top:8px">'
    + (laeuft
      ? "Der Fortschritt steht oben. Zum Beenden dort auf „Abbrechen“."
      : "Analysekosten ca. " + fmt(kosten, 2) + " $, Dauer etwa " + dauer
        + " Minute" + (dauer === 1 ? "" : "n") + "."
        + (vorabBlaetter
          ? " Darin " + fmt(felderZuschlag, 2) + " $ dafür, dass "
            + (vorabBlaetter === 1 ? "ein Blatt" : vorabBlaetter + " Blätter")
            + " von vornherein feldweise gelesen "
            + (vorabBlaetter === 1 ? "wird" : "werden") + ": in einem Zug "
            + "wäre die Schrift zu klein oder die Raumliste zu lang."
          : "")
        + (offen.length > AUTO_ANALYSE_GRENZE
          ? " Bei mehr als " + AUTO_ANALYSE_GRENZE + " Blättern startet die "
            + "Analyse nicht von selbst, sondern wartet auf diesen einen Klick."
          : "")
        + '<details style="margin-top:6px"><summary style="cursor:pointer">Wie '
        + "sich das zusammensetzt</summary>"
        + "Drei bis vier Modellaufrufe je Blatt; die ersten drei an einem ganzen "
        + "Durchlauf gemessen. Einer ist die "
        + "zweite, unabhängige Lesung: sie zählt dasselbe Blatt noch einmal, ohne "
        + "das erste Ergebnis zu kennen, und macht aus „gegen nichts geprüft“ eine "
        + "belegte Zahl. Veranschlagt sind dafür rund 0,03 $ und sechs Sekunden je "
        + "Blatt; sie läuft von selbst mit. Muss ein Bogen in seine "
        + "Zeichnungsfelder zerlegt werden, weil er in einem Durchgang nicht zu "
        + "lesen ist, kommen je Feld rund 0,07 $ dazu; was geschehen ist, steht "
        + "danach in der Seite. Ohne diesen Schritt lassen sich die Räume über "
        + "den Expertenmodus von Hand erfassen.</details>")
    + "</div>"
    + (laeuft ? "" : '<div style="margin-top:10px"><a href="#" data-schritt="projekt" '
      + 'style="font-size:13px">Erst Objekt und Klima ergänzen</a></div>')
    + "</div>";
}

/* --------------------------------------------------------------------------
 * Schritt 3: Kontrollblatt
 * ----------------------------------------------------------------------- */
/** Schritt 3: der Plan mit dem, was daraus geworden ist. */
function schrittPruefblatt() {
  if (window.MODUL_PRUEFBLATT) return window.MODUL_PRUEFBLATT.html();
  return '<div class="karte"><h2>Plan prüfen</h2>'
    + "<p>Das Modul fehlt in dieser Fassung. Weiter über das Kontrollblatt.</p>"
    + "</div>";
}

function schrittKontrolle() {
  if (window.MODUL_KONTROLLBLATT) return window.MODUL_KONTROLLBLATT.html();
  // bis das eigene Modul steht: die vorhandene Prüfung zeigen
  return '<div class="karte"><h2>Kontrollblatt</h2>'
    + '<p class="hinweis">Hier prüfst du, was das Werkzeug erkannt hat, bevor der '
    + "Bericht entsteht.</p>"
    + '<div class="meldung hinweis"><span class="sym">i</span><div>Das Kontrollblatt '
    + "wird gerade gebaut. Bis dahin führt der Expertenmodus links zum Ziel: "
    + '<a href="#" data-schritt="raeume">Raumbuch</a> und '
    + '<a href="#" data-schritt="pruefung">Selbstprüfung</a>.</div></div>'
    + "</div>" + schrittPruefung();
}

/* --------------------------------------------------------------------------
 * Die Annahmenkarte
 * --------------------------------------------------------------------------
 * Sie steht dort, wo die Zahlen entstehen (Schritt „Objekt"), und noch einmal
 * verkürzt in der Leiste neben dem Ergebnis. Drei Dinge muss sie leisten, und
 * zwar alle drei auf einen Blick: WAS angenommen wurde, WARUM, und ein Feld,
 * in dem es sich ändern lässt. Eine Annahme ohne das Feld daneben ist eine
 * Behauptung; eine Annahme ohne Begründung ist geraten.
 * ----------------------------------------------------------------------- */
function annahmenKarte() {
  const liste = annahmenListe(App.p);
  const nicht = App.p.annahmen && App.p.annahmen.baujahr_nicht;
  if (!liste.length && !nicht) return "";
  const feldFuer = function (a) {
    if (a.schluessel === "baujahr") {
      return feld("Baujahr", "meta.baujahr", { typ: "number", min: 1000 });
    }
    if (a.schluessel === "klima") {
      return feld("PLZ des Gebäudes", "meta.plz",
               { platzhalter: "fünfstellig, setzt das Klima neu" })
        + feld("Norm-Außentemperatur", "klima.theta_e",
               { typ: "number", step: "0.1", einheit: "°C" });
    }
    /* Die angenommene Höhe bekommt ihr Feld an derselben Stelle wie Baujahr
       und Klima. Sie steht je Geschoss, deshalb eines je Geschoss; gesetzt
       wird über denselben Weg wie in der Höhenkarte (data-geschosshoehe),
       damit es nur einen Ort gibt, an dem eine Höhe eingetragen wird. */
    if (a.schluessel === "hoehe") {
      return (a.geschosse || []).map(function (k) {
        const eigen = (App.p.geschosshoehen || {})[k];
        const stand = (App.p.hoehenStand && App.p.hoehenStand.zuordnung[k]) || {};
        return '<label class="feld"><span>Lichte Höhe ' + esc(k)
          + '</span><span class="einheit"><input type="text" inputmode="decimal" step="0.01"'
          + ' data-geschosshoehe="' + esc(k) + '" value="'
          + esc(eigen != null ? eigen : (stand.lichte_hoehe || "")) + '">'
          + '<span class="e">m</span></span></label>';
      }).join("");
    }
    return "";
  };
  return '<div class="karte annahmenkarte">'
    + '<h2>' + ikon("warnung") + " Angenommen, weil es auf dem Blatt nicht steht</h2>"
    + '<p class="hinweis">Diese Rechnung steht auf '
    + (liste.length === 1 ? "einer Annahme" : mz(liste.length, "Annahme", "Annahmen"))
    + ". Jede ist aus dem Plan "
    + "abgeleitet, keine ist gemessen. Sie stehen so auch im Bericht. Wer den "
    + "richtigen Wert kennt, trägt ihn hier ein — dann ist es keine Annahme mehr.</p>"
    + liste.map(function (a) {
        return '<div class="annahme-block">'
          + '<div class="annahme-kopf">' + esc(a.kurz) + "</div>"
          + '<p class="annahme-grund">' + esc(a.begruendung) + "</p>"
          + (a.richtung ? '<p class="annahme-grund"><b>Richtung des möglichen '
              + 'Fehlers:</b> ' + esc(a.richtung) + "</p>" : "")
          + '<div class="feldreihe">' + feldFuer(a) + "</div>"
          + "</div>";
      }).join("")
    + (nicht
      ? '<div class="annahme-block"><div class="annahme-kopf">' + esc(nicht.kurz)
        + '</div><p class="annahme-grund">' + esc(nicht.begruendung) + "</p>"
        + '<div class="feldreihe">' + feld("Baujahr", "meta.baujahr", { typ: "number", min: 1000 })
        + "</div></div>"
      : "")
    + "</div>";
}

function schrittProjekt() {
  const kw = DK.pruefeKlima(App.p.klima, App.p.meta.plz);
  const plzTreffer = DK.findePlz(App.p.meta.plz);
  return annahmenKarte()
    + '<div class="karte"><h2>Objekt</h2>'
    + '<div class="feldreihe">'
    + feld("Bezeichnung", "meta.bezeichnung", { pflicht: true, platzhalter: "z. B. Mehrfamilienhaus Musterweg 1" })
    + feld("Projektnummer", "meta.projektnr")
    + feld("Bauherr / Auftraggeber", "meta.bauherr")
    + feld("Straße und Hausnummer", "meta.strasse")
    + feld("PLZ", "meta.plz", { pflicht: true })
    + feld("Ort", "meta.ort")
    + feld("Wohnfläche nach WoFlV", "meta.wohnflaeche", { typ: "number", step: "0.01",
        einheit: "m²",
        hilfe: "freiwillig; wenn bekannt, dient sie als zusätzliche Gegenprobe" })
    + feld("Baujahr", "meta.baujahr", { typ: "number", pflicht: true, min: 1000,
        hilfe: "bestimmt die Typologie-Startwerte der Bauteile" })
    + auswahl("Gebäudeart", "meta.gebaeudeart", [
        { v: "efh", t: "Ein- oder Zweifamilienhaus" },
        { v: "mfh", t: "Mehrfamilienhaus" },
        { v: "nwg", t: "Nichtwohngebäude" },
      ])
    + "</div>"
    + typologieKasten()
    /* Der hinterlegte Klimadatensatz wird beim Zeichnen automatisch gesetzt
       (automatischErgaenzen, Punkt 2). Ein Knopf "Übernehmen" waere dann ein
       Knopf ohne Wirkung. Er erscheint nur noch, wenn der eingetragene Wert
       vom hinterlegten abweicht, und heisst dann, was er tut. */
    + (plzTreffer
        ? (Math.abs(num(App.p.klima.theta_e, 999) - plzTreffer.theta_e) < 0.05
          ? '<div class="meldung gut"><span class="sym">' + ikon("haken")
            + "</span><div>Norm-Außentemperatur <b>" + fmt(plzTreffer.theta_e, 1)
            + " °C</b> für PLZ " + esc(plzTreffer.plz) + " (" + esc(plzTreffer.ort)
            + ") ist übernommen."
            + "<br><small>" + esc(plzTreffer.quelle) + "</small></div></div>"
          : '<div class="meldung warnung"><span class="sym">!</span><div>Eingetragen sind '
            + fmt(num(App.p.klima.theta_e), 1) + " °C. Für PLZ " + esc(plzTreffer.plz)
            + " (" + esc(plzTreffer.ort) + ") ist <b>" + fmt(plzTreffer.theta_e, 1)
            + " °C</b> hinterlegt. "
            + '<button class="btn klein" data-aktion="klimaUebernehmen">Auf den '
            + "hinterlegten Wert setzen</button>"
            + "<br><small>" + esc(plzTreffer.quelle) + "</small></div></div>")
        : "")
    + "</div>"

    + '<div class="karte"><h2>Klima</h2>'
    + '<p class="hinweis">Die Norm-Außentemperatur ist PLZ-genau nach DIN/TS 12831-1 zu '
    + "bestimmen. Sie erscheint mit Quellenangabe im Bericht.</p>"
    + '<div class="feldreihe">'
    + feld("Norm-Außentemperatur", "klima.theta_e", { typ: "number", step: "0.1", einheit: "°C", pflicht: true })
    + feld("Jahresmitteltemperatur", "klima.theta_e_m", { typ: "number", step: "0.1", einheit: "°C",
        hilfe: "nur für erdberührte Bauteile erforderlich" })
    + feld("Quelle der Klimadaten", "klima.quelle", { pflicht: true,
        platzhalter: "z. B. BWP-Klimakarte PLZ 33098" })
    + "</div>"
    + kw.map(function (w) {
        return '<div class="meldung ' + (w.stufe === "fehler" ? "fehler" : "warnung") + '">'
          + '<span class="sym">' + (w.stufe === "fehler" ? "!" : "i") + "</span><div>"
          + esc(w.text) + "</div></div>";
      }).join("")
    + "</div>"

    + '<div class="karte"><h2>Luftdichtheit und Randbedingungen</h2>'
    + '<div class="feldreihe">'
    + feld("n50", "luftdichtheit.n50", { typ: "number", step: "0.1", einheit: "1/h", pflicht: true,
        hilfe: "Messwert oder begründete Annahme" })
    + auswahl("Herkunft n50", "luftdichtheit.kategorie", [
        { v: "messung", t: "Blower-Door-Messung" },
        { v: "annahme", t: "Annahme (im Bericht gekennzeichnet)" },
      ])
    + feld("Bemerkung zu n50", "luftdichtheit.quelle", { platzhalter: "z. B. Messprotokoll vom ..." })
    + feld("Wärmebrückenzuschlag", "norm.delta_u_wb", { typ: "number", step: "0.01", einheit: "W/m²K",
        hilfe: "pauschal nach DIN/TS 12831-1" })
    + feld("Aufheizleistung f_RH", "optionen.f_RH", { typ: "number", step: "1", einheit: "W/m²",
        hilfe: "0 = kein Aufheizzuschlag" })
    + "</div></div>"

    + '<div class="karte"><h2>Wohn- und Nutzungseinheiten</h2>'
    + '<p class="hinweis">Jeder Raum muss einer Einheit zugeordnet werden. Ohne Zuordnung '
    + "fehlt in der Lüftungsberechnung der Bezug.</p>"
    + '<div class="tabhuelle"><table class="tab"><thead><tr>'
    + "<th>Bezeichnung</th><th style=\"width:110px\">Personen</th><th style=\"width:80px\"></th>"
    + "</tr></thead><tbody>"
    + App.p.einheiten.map(function (e, i) {
        return "<tr><td><input type=\"text\" data-liste=\"einheiten\" data-i=\"" + i
          + "\" data-k=\"name\" value=\"" + esc(e.name) + "\"></td>"
          + "<td><input type=\"number\" data-liste=\"einheiten\" data-i=\"" + i
          + "\" data-k=\"personen\" value=\"" + esc(e.personen) + "\"></td>"
          + '<td><button class="btn klein gefahr" data-aktion="einheitWeg" data-i="' + i
          + '">Weg</button></td></tr>';
      }).join("")
    + '</tbody></table></div>'
    + '<button class="btn klein" data-aktion="einheitNeu" style="margin-top:10px">Einheit hinzufügen</button>'
    + "</div>"
    + geschosshoehenKarte()
    + berichtskopfKarte()
    + weiterNachEckdaten();
}

/** Alles, was am Ende auf dem Deckblatt und unter der Unterschrift steht.
 *  Vorher stand davon nichts im Werkzeug: der Bericht ging ohne Unterzeichner
 *  und ohne Listennummer aus dem Haus und trug auf jeder Seite "Entwurf",
 *  weil sich die Freigabe gar nicht setzen ließ. */
function berichtskopfKarte() {
  return '<div class="karte"><h2>Bericht und Unterschrift</h2>'
    + '<p class="hinweis">Diese Angaben stehen auf dem Deckblatt und auf dem '
    + "Schlussblatt. Ohne Unterzeichner und ohne Nummer in der "
    + "Energieeffizienz-Expertenliste ist der Bericht nicht abnahmefähig.<br>"
    + "<b>Unterzeichner, Funktion, Listennummer und Ausstellungsort merkt sich "
    + "dieser Browser</b> und trägt sie in jedes neue Projekt ein. Sie sind "
    + "hier jederzeit zu ändern."
    + (bearbeiterIstGemerkt()
      ? ' <a href="#" data-aktion="bearbeiterVergessen">Gemerkte Angaben löschen</a>'
      : "") + "</p>"
    + '<div class="feldreihe">'
    + feld("Gebäudetyp", "meta.gebaeudetyp",
        { platzhalter: "z. B. Dreifamilienhaus, Doppelhaushälfte",
          hilfe: "steht auf dem Deckblatt in der Zeile Objekt" })
    + feld("Baulicher Zustand", "meta.zustand",
        { platzhalter: "z. B. nach Umsetzung von Kerndämmung und Fenstertausch" })
    + feld("Unterzeichner", "meta.bearbeiter",
        { platzhalter: "Vor- und Nachname" })
    + feld("Funktion", "meta.bearbeiter_funktion",
        { platzhalter: "z. B. Energieberater" })
    + feld("Nummer in der Energieeffizienz-Expertenliste", "meta.eee_nummer",
        { hilfe: "leer lassen, wenn sie von Hand eingetragen werden soll" })
    + feld("Ort der Ausstellung", "meta.erstellort",
        { hilfe: "leer = Ort des gewählten Standorts" })
    + auswahl("Aufmaß vor Ort", "meta.aufmass_vor_ort", [
        { v: "", t: "nicht angegeben" },
        { v: "nein", t: "nein, nach Unterlagen gerechnet" },
        { v: "ja", t: "ja, vor Ort aufgemessen" },
      ])
    + auswahl("Fassung", "meta.freigegeben", [
        { v: "", t: "Entwurf (auf jeder Seite gekennzeichnet)" },
        { v: "ja", t: "freigegeben" },
      ], { neurender: true })
    + "</div>"
    + mehrzeile("Ausgewertete Unterlagen", "meta.grundlagen",
        "eine Unterlage je Zeile, zum Beispiel:\nBauzeichnungen von 1936 aus der "
        + "Objektakte\nWohnflächenberechnung\nAufmaßplan vom 12.06.2026",
        "Steht als Satz auf dem Deckblatt. Bleibt das Feld leer, schreibt der "
        + "Bericht, dass keine Liste hinterlegt ist.")
    + "</div>";
}

/* --------------------------------------------------------------------------
 * Schritt 2: Bauteilbibliothek
 * ----------------------------------------------------------------------- */
const KAT_OPTIONEN = [
  { v: "huelle", t: "Hülle (gegen Außenluft oder unbeheizt)" },
  { v: "erdreich", t: "erdberührt" },
  { v: "nachbar", t: "gegen fremdes beheiztes Gebäude" },
  { v: "innen", t: "innen (gegen Raum anderer Temperatur)" },
];

function schrittBauteile() {
  const t = App.p.bauteiltypen;
  return '<div class="karte"><h2>Bauteilbibliothek</h2>'
    + '<p class="hinweis">Jedes Bauteil einmal anlegen, im Raumbuch dann nur noch die Fläche '
    + "zuweisen. Der U-Wert kann aus dem Schichtaufbau gerechnet oder direkt eingetragen werden.</p>"
    + (t.length === 0
      ? '<div class="meldung hinweis"><span class="sym">i</span><div>Noch kein Bauteil angelegt. '
        + "Starte mit einer Vorlage oder lege ein leeres Bauteil an.</div></div>"
      : '<div class="tabhuelle"><table class="tab"><thead><tr>'
        + '<th>Bezeichnung</th><th style="width:150px">Art</th>'
        + '<th style="width:110px">U-Wert</th><th style="width:110px">Nachweis</th>'
        + '<th style="width:150px">Herkunft</th><th style="width:120px"></th></tr></thead><tbody>'
        + t.map(function (b, i) {
            const genutzt = App.p.raeume.reduce(function (s, r) {
              return s + (r.bauteile || []).filter((x) => x.typ_id === b.id).length; }, 0);
            return "<tr><td><input type=\"text\" data-liste=\"bauteiltypen\" data-i=\"" + i
              + "\" data-k=\"name\" value=\"" + esc(b.name) + "\"></td>"
              + '<td><select data-liste="bauteiltypen" data-i="' + i + '" data-k="kat_default">'
              + KAT_OPTIONEN.map((o) => '<option value="' + o.v + '"'
                  + (o.v === b.kat_default ? " selected" : "") + ">" + esc(o.t.split(" (")[0])
                  + "</option>").join("")
              + "</select></td>"
              + '<td><input type="text" inputmode="decimal" step="0.01" data-liste="bauteiltypen" data-i="' + i
              + '" data-k="U" value="' + esc(b.U) + '"'
              + (b.schichten && b.schichten.length ? " readonly style=\"background:#F4F4F5\"" : "")
              + "></td>"
              + "<td>" + (b.schichten && b.schichten.length
                  ? '<button class="btn klein" data-aktion="schichtEdit" data-i="' + i
                    + '">' + mz(b.schichten.length, "Schicht", "Schichten") + "</button>"
                  : '<button class="btn klein" data-aktion="schichtEdit" data-i="' + i
                    + '">Aufbau...</button>') + "</td>"
              /* DIE FUNDSTELLE GEHÖRT NEBEN DEN WERT.
                 Hier stand nur „Annahme" — ein Etikett ohne Beleg. Woher der
                 U-Wert kommt, wusste das Werkzeug (b.quelle), zeigte es aber
                 nirgends in der Bibliothek. Seit die Startwerte aus zwei
                 Quellen kommen können — Gebäudetypologie bis 2022,
                 Referenzgebäude des GModG ab 2023 —, ist der Unterschied
                 nicht mehr nebensächlich: das eine ist ein Kennwert typischer
                 Bestandsgebäude, das andere eine gesetzliche Obergrenze. */
              + '<td>' + (b.belegt
                  ? '<span class="chip belegt"'
                    + (b.quelle ? ' title="' + esc(b.quelle) + '"' : "")
                    + ">belegt</span>"
                  : '<span class="chip annahme"'
                    + (b.quelle ? ' title="' + esc(b.quelle) + '"' : "")
                    + ">Annahme</span>")
              + (b.quelle
                  ? '<div style="font-size:11.5px;color:var(--mute);'
                    + 'max-width:280px;line-height:1.35;margin-top:3px">'
                    + esc(String(b.quelle).length > 150
                        ? String(b.quelle).slice(0, 150) + "…" : String(b.quelle))
                    + "</div>"
                  : "")
              + "</td>"
              + '<td style="text-align:right">'
              + (genutzt > 0 ? '<span class="chip">' + genutzt + "x</span> " : "")
              + '<button class="btn klein gefahr" data-aktion="bauteilWeg" data-i="' + i
              + '">Weg</button></td></tr>';
          }).join("")
        + "</tbody></table></div>")
    + '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn klein" data-aktion="bauteilNeu">Leeres Bauteil</button>'
    + '<select id="vorlagenwahl" style="max-width:340px"><option value="">Aus Vorlage anlegen...</option>'
    + DB.VORLAGEN.map((v) => '<option value="' + v.id + '">' + esc(v.label) + "</option>").join("")
    + DB.OEFFNUNGEN.filter((o) => o.u != null)
        .map((o) => '<option value="oe:' + o.id + '">' + esc(o.label) + "</option>").join("")
    + "</select>"
    + '<button class="btn klein primaer" data-aktion="bauteilAusVorlage">Anlegen</button>'
    + "</div></div>"
    + (App.schichtEdit != null ? schichtEditor(App.schichtEdit) : "");
}

function schichtEditor(i) {
  const b = App.p.bauteiltypen[i];
  if (!b) return "";
  if (!b.schichten) b.schichten = [];
  const res = DB.uWert(b.schichten, b.uebergang || "wand_aussen", num(b.zuschlag, 0));
  return '<div class="karte" style="border-color:var(--gruen)">'
    + "<h2>Schichtaufbau: " + esc(b.name) + "</h2>"
    + '<p class="hinweis">U-Wert nach DIN EN ISO 6946. Die Übergangswiderstände richten sich '
    + "nach der Lage des Bauteils.</p>"
    + '<div class="feldreihe" style="margin-bottom:14px">'
    + '<label class="feld"><span>Lage / Wärmeübergang</span>'
    + '<select data-liste="bauteiltypen" data-i="' + i + '" data-k="uebergang">'
    + Object.keys(DB.UEBERGANG).map((k) => '<option value="' + k + '"'
        + (k === (b.uebergang || "wand_aussen") ? " selected" : "") + ">"
        + esc(DB.UEBERGANG[k].label) + "</option>").join("")
    + "</select></label>"
    + '<label class="feld"><span>Zuschlag auf U (z. B. Anker)</span>'
    + '<input type="text" inputmode="decimal" step="0.001" data-liste="bauteiltypen" data-i="' + i
    + '" data-k="zuschlag" value="' + esc(num(b.zuschlag, 0)) + '"></label>'
    + "</div>"
    + '<div class="tabhuelle"><table class="tab"><thead><tr>'
    + '<th>Schicht</th><th style="width:110px">Dicke m</th>'
    + '<th style="width:120px">Lambda W/mK</th><th style="width:90px" class="num">R</th>'
    + '<th style="width:70px"></th></tr></thead><tbody>'
    + b.schichten.map(function (s, j) {
        const lam = s.lambda != null ? s.lambda : DB.lambdaVon(s.mat);
        return "<tr><td><select data-schicht=\"" + i + ":" + j + "\" data-k=\"mat\">"
          + DB.MATERIALIEN.map((m) => '<option value="' + m.id + '"'
              + (m.id === s.mat ? " selected" : "") + ">" + esc(m.label)
              + (m.belegt ? "" : " ·") + "</option>").join("")
          + "</select></td>"
          + '<td><input type="text" inputmode="decimal" step="0.001" data-schicht="' + i + ":" + j
          + '" data-k="d" value="' + esc(s.d) + '"></td>'
          + '<td><input type="text" inputmode="decimal" step="0.001" data-schicht="' + i + ":" + j
          + '" data-k="lambda" value="' + esc(lam == null ? "" : lam) + '"></td>'
          + '<td class="num">' + (lam > 0 && s.d > 0 ? fmt(s.d / lam, 3) : "–") + "</td>"
          + '<td><button class="btn klein gefahr" data-aktion="schichtWeg" data-ij="'
          + i + ":" + j + '">x</button></td></tr>';
      }).join("")
    + "</tbody><tfoot><tr>"
    + '<td colspan="3">R<sub>si</sub> ' + fmt(res.rsi, 2) + " + R<sub>se</sub> " + fmt(res.rse, 2)
    + " + Schichten &rarr; R<sub>ges</sub></td>"
    + '<td class="num">' + fmt(res.r_gesamt, 3) + "</td><td></td></tr>"
    + '<tr><td colspan="3"><b>U-Wert</b>'
    + (res.zuschlag ? " einschließlich Zuschlag " + fmt(res.zuschlag, 3) : "") + "</td>"
    + '<td class="num"><b>' + fmt(res.u, 3) + "</b></td><td></td></tr></tfoot></table></div>"
    + '<div style="margin-top:12px;display:flex;gap:8px">'
    + '<button class="btn klein" data-aktion="schichtNeu" data-i="' + i + '">Schicht hinzufügen</button>'
    + '<button class="btn klein primaer" data-aktion="schichtUebernehmen" data-i="' + i
    + '">U-Wert übernehmen und schließen</button>'
    + '<button class="btn klein" data-aktion="schichtAbbrechen">Schließen</button>'
    + "</div></div>";
}

/* --------------------------------------------------------------------------
 * Schritt 3: Unbeheizte Bereiche
 * ----------------------------------------------------------------------- */
function schrittZonen() {
  const e = App.ergebnis || {};
  const befunde = {};
  (e.zonen_befund || []).forEach(function (b) { befunde[b.id] = b; });
  return '<div class="karte"><h2>Unbeheizte Bereiche</h2>'
    + '<p class="hinweis">Keller, Dachraum, Garage und ähnliche Bereiche. Die Temperatur wird '
    + "aus einer stationären Wärmebilanz bestimmt: der Wärmezufluss aus den angrenzenden "
    + "beheizten Räumen wird automatisch berücksichtigt, hier sind nur die Bauteile der Zone "
    + "nach außen und gegen Erdreich einzutragen. Wer den Bereich kennt, kann das "
    + "Temperaturniveau stattdessen nach seiner Lage vorgeben. Die Bilanz läuft dann als "
    + "Gegenprobe weiter mit und steht daneben.</p>"
    + (App.p.zonen.length === 0
      ? '<div class="meldung hinweis"><span class="sym">i</span><div>Keine unbeheizte Zone '
        + "angelegt. Das ist richtig, wenn alle angrenzenden Bereiche beheizt sind.</div></div>"
      : App.p.zonen.map(function (z, i) {
          const t = e.zonen ? e.zonen[z.id] : null;
          const b = befunde[z.id] || null;
          return '<div style="border:1px solid var(--linie);border-radius:10px;padding:14px;'
            + 'margin-bottom:12px">'
            + '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">'
            + '<input type="text" data-liste="zonen" data-i="' + i + '" data-k="name" value="'
            + esc(z.name) + '" style="max-width:280px">'
            + '<select data-liste="zonen" data-i="' + i + '" data-k="modus" data-neurender="1">'
            + '<option value="bilanz"' + (z.modus === "bilanz" ? " selected" : "")
            + ">Temperatur aus Bilanz</option>"
            + '<option value="lage"' + (z.modus === "lage" ? " selected" : "")
            + ">Temperaturniveau nach Lage vorgeben</option>"
            + '<option value="fest"' + (z.modus === "fest" ? " selected" : "")
            + ">Temperatur fest vorgeben</option></select>"
            + (z.modus === "fest"
              ? '<input type="text" inputmode="decimal" step="0.1" data-liste="zonen" data-i="' + i
                + '" data-k="theta_fest" value="' + esc(num(z.theta_fest, 10))
                + '" style="max-width:100px"> °C'
              : '<span class="chip">' + (t != null ? fmt(t, 1) + " °C" + (z.modus === "lage"
                  ? " vorgegeben" : " berechnet") : "–") + "</span>")
            + '<div style="flex:1"></div>'
            + '<button class="btn klein gefahr" data-aktion="zoneWeg" data-i="' + i + '">Zone weg</button>'
            + "</div>"
            + (z.modus === "lage" ? zonenLage(z, i, b) : "")
            + (z.modus === "lage"
              ? '<p class="hinweis" style="margin:0 0 6px">Die Bauteile des Bereichs werden '
                + "weiter gebraucht: aus ihnen entsteht die Bilanz, die als Gegenprobe neben "
                + "Ihrer Vorgabe steht.</p>"
              : "")
            + (z.modus === "fest" ? "" : zonenBauteile(z, i))
            + "</div>";
        }).join(""))
    + '<button class="btn klein" data-aktion="zoneNeu">Unbeheizten Bereich anlegen</button>'
    + "</div>";
}

/* Auswahl des Temperaturniveaus nach der Lage des unbeheizten Bereichs.
   Die Werte stehen in daten_zonenlagen.js und stammen aus DIN/TS 12831-1;
   hier wird nichts gerechnet, was dort nicht belegt ist. Neben der Auswahl
   steht immer die Temperatur, damit man sieht, was man waehlt, und daneben
   die Zahl aus der Bilanz als Gegenprobe. */
function zonenLage(z, i, befund) {
  const tab = (typeof window !== "undefined" && window.DATEN_ZONENLAGEN) || null;
  if (!tab) {
    return '<div class="meldung warnung"><span class="sym">!</span><div>Die Tabelle der '
      + "Lagen ist nicht geladen. Es bleibt bei der Bilanz.</div></div>";
  }
  const erg = App.ergebnis || {};
  const theta_e = num((erg.klima && erg.klima.theta_e) != null
    ? erg.klima.theta_e : (App.p.klima || {}).theta_e, -10);
  const tb = num(z.theta_bezug, 20);
  const gewaehlt = tab.finde(z.lage);
  const stufeText = { zwei_quellen: "in zwei Fachquellen gleichlautend belegt",
                      eine_quelle: "über eine Fachquelle belegt, Normtext lag nicht vor",
                      erfahrung: "Erfahrungswert, keiner Norm entnommen" };

  const auswahl = '<select data-liste="zonen" data-i="' + i
    + '" data-k="lage" data-neurender="1" style="min-width:420px;max-width:100%">'
    + '<option value=""' + (gewaehlt ? "" : " selected") + ">Lage wählen …</option>"
    + tab.gruppen().map(function (g) {
        return '<optgroup label="' + esc(g.gruppe) + '">'
          + g.lagen.map(function (l) {
              const w = tab.temperatur(l.id, tb, theta_e);
              return '<option value="' + esc(l.id) + '"'
                + (gewaehlt && gewaehlt.id === l.id ? " selected" : "") + ">"
                + esc(l.name) + "  —  " + fmt(w.theta, 1) + " °C"
                + (w.f1 !== null ? "  (f₁ " + fmt(w.f1, 2) + ")" : "  (Tabellenwert)")
                + "</option>";
            }).join("")
          + "</optgroup>";
      }).join("")
    + "</select>"
    /* Eine Lage, die das Werkzeug beim Anlegen des Bereichs vorbelegt hat.
       Sie liefert sofort ein plausibles Ergebnis statt der 0 W, die ein
       Bereich ohne Huellbauteile erzeugt — sie ist aber geraten, was die
       Lage angeht, und muss geprueft werden. */
    + (z.lage_angenommen
      ? '<span class="annahme-marke" title="Beim Anlegen des Bereichs '
        + 'vorbelegt, damit sofort ein Ergebnis entsteht. Bitte gegen das '
        + 'Gebäude prüfen oder die eigenen Bauteile des Bereichs eintragen.">'
        + "angenommen</span>" : "");

  if (!gewaehlt) {
    return '<div style="margin-bottom:10px">' + auswahl + "</div>"
      + '<div class="meldung hinweis"><span class="sym">i</span><div>Solange keine Lage '
      + "gewählt ist, bleibt es bei der stationären Bilanz. Es wird nichts geraten.</div></div>";
  }

  const w = tab.temperatur(gewaehlt.id, tb, theta_e,
    Number.isFinite(num(z.f1, NaN)) ? num(z.f1) : undefined);
  /* Ohne eigene Huellbauteile gibt es keine Bilanz, die sich vergleichen
     liesse: der Vergleichslauf faellt dort selbst auf die Mindesttemperatur
     zurueck. Ein Chip "Bilanz: -9,6 °C" und "+14,8 K Unterschied" waere dann
     eine Falschaussage — verglichen wuerde mit einem Platzhalter. */
  const ohneHuelle = !!(befund && befund.ohne_huelle);
  const bil = (befund && !ohneHuelle) ? befund.theta_bilanz : null;
  const abw = (befund && !ohneHuelle && befund.abweichung != null)
    ? befund.abweichung : null;
  const auffaellig = !!(befund && befund.abweichung_auffaellig);

  return '<div style="margin-bottom:10px">' + auswahl + "</div>"
    + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">'
    + '<span class="chip"><b>' + fmt(w.theta, 1) + " °C</b> vorgegeben</span>"
    + (ohneHuelle
      ? '<span class="chip" title="Für eine Bilanz fehlen die eigenen Bauteile '
        + 'dieses Bereichs nach außen und gegen Erdreich.">Bilanz: nicht möglich</span>'
      : '<span class="chip">Bilanz: ' + (bil != null ? fmt(bil, 1) + " °C" : "–") + "</span>")
    + (abw != null
      ? '<span class="chip"' + (auffaellig ? ' style="font-weight:600"' : "") + ">"
        + (abw >= 0 ? "+" : "−") + fmt(Math.abs(abw), 1) + " K Unterschied</span>"
      : "")
    + (w.f1 !== null
      ? '<span class="chip">f₁ ' + fmt(w.f1, 2) + "</span>"
        + '<span class="chip">Bezug ' + fmt(tb, 1) + " °C, außen " + fmt(theta_e, 1) + " °C</span>"
      : '<span class="chip">Temperatur unmittelbar tabelliert</span>')
    + "</div>"
    + (w.f1_bereich
      ? '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'
        + '<label style="font-size:13px">Die Norm gibt hier einen Bereich von '
        + fmt(w.f1_bereich[0], 2) + " bis " + fmt(w.f1_bereich[1], 2)
        + " an. Angesetzt ist </label>"
        + '<input type="text" inputmode="decimal" step="0.05" min="' + w.f1_bereich[0] + '" max="'
        + w.f1_bereich[1] + '" data-liste="zonen" data-i="' + i + '" data-k="f1" value="'
        + esc(w.f1) + '" style="width:90px">'
        + '<span style="font-size:13px">. Vorbelegt ist der obere Rand: das ergibt den '
        + "kälteren Bereich und damit die höhere Heizlast.</span></div>"
      : "")
    + (auffaellig
      ? '<div class="meldung warnung"><span class="sym">!</span><div>Die Vorgabe liegt '
        + fmt(Math.abs(abw), 1) + " K " + (abw > 0 ? "über" : "unter")
        + " dem, was die Bilanz für diesen Bereich ergibt. Maßgebend ist Ihre Vorgabe. "
        + "Bitte prüfen, ob die Lage zum Bereich passt. Die Schwelle von "
        + fmt(befund.abweichung_schwelle_K, 1) + " K ist eine Festlegung dieses Werkzeugs "
        + "und keine Vorgabe der Norm.</div></div>"
      : "")
    + '<p class="hinweis" style="margin:0 0 10px">' + esc(gewaehlt.beispiel) + ". Beleg: "
    + esc(gewaehlt.fundstelle) + ". Belegstufe: "
    + esc(stufeText[gewaehlt.stufe] || gewaehlt.stufe) + ".</p>";
}

function zonenBauteile(z, i) {
  if (!z.huelle) z.huelle = [];
  return '<div class="tabhuelle"><table class="tab"><thead><tr>'
    + '<th>Bauteil der Zone</th><th style="width:100px">Fläche m²</th>'
    + '<th style="width:100px">U W/m²K</th><th style="width:190px">grenzt an</th>'
    + '<th style="width:60px"></th></tr></thead><tbody>'
    + z.huelle.map(function (b, j) {
        const g = b.grenzt_an || { typ: "aussen" };
        return "<tr><td><input type=\"text\" data-zonebt=\"" + i + ":" + j
          + "\" data-k=\"name\" value=\"" + esc(b.name || "") + "\"></td>"
          + '<td><input type="text" inputmode="decimal" step="0.01" data-zonebt="' + i + ":" + j
          + '" data-k="A" value="' + esc(b.A) + '"></td>'
          + '<td><input type="text" inputmode="decimal" step="0.01" data-zonebt="' + i + ":" + j
          + '" data-k="U" value="' + esc(b.U) + '"></td>'
          + '<td><select data-zonebt="' + i + ":" + j + '" data-k="gtyp" data-neurender="1">'
          + '<option value="aussen"' + (g.typ === "aussen" ? " selected" : "") + ">Außenluft</option>"
          + '<option value="fest"' + (g.typ === "fest" ? " selected" : "") + ">feste Temperatur</option>"
          + App.p.zonen.filter((x) => x.id !== z.id).map((x) => '<option value="zone:' + x.id + '"'
              + (g.typ === "zone" && g.ref === x.id ? " selected" : "") + ">" + esc(x.name)
              + "</option>").join("")
          + "</select>"
          + (g.typ === "fest" ? ' <input type="text" inputmode="decimal" step="0.1" data-zonebt="' + i + ":" + j
              + '" data-k="gtheta" value="' + esc(num(g.theta, 7)) + '" style="width:70px">' : "")
          + "</td>"
          + '<td><button class="btn klein gefahr" data-aktion="zoneBtWeg" data-ij="' + i + ":" + j
          + '">x</button></td></tr>';
      }).join("")
    + "</tbody></table></div>"
    + '<button class="btn klein" data-aktion="zoneBtNeu" data-i="' + i
    + '" style="margin-top:8px">Bauteil hinzufügen</button>';
}

/* --------------------------------------------------------------------------
 * Schritt 4: Raumbuch
 * ----------------------------------------------------------------------- */
function schrittRaeume() {
  const e = App.ergebnis || { raeume: [] };
  const erg = {};
  (e.raeume || []).forEach(function (r) { erg[r.id] = r; });
  const geschosse = [];
  App.p.raeume.forEach(function (r) {
    if (geschosse.indexOf(r.geschoss || "") < 0) geschosse.push(r.geschoss || "");
  });

  return '<div class="karte"><h2>Raumbuch</h2>'
    + '<p class="hinweis">Ein Raum je Zeile. Auf "Bauteile" klicken, um dem Raum Flächen aus '
    + "der Bauteilbibliothek zuzuweisen.</p>"
    + (App.p.bauteiltypen.length === 0
      ? '<div class="meldung warnung"><span class="sym">i</span><div>Es ist noch kein Bauteil '
        + "angelegt. Ohne Bauteile kann keine Heizlast berechnet werden. "
        + '<a href="#" data-schritt="bauteile">Zur Bauteilbibliothek</a></div></div>' : "")
    + (App.p.raeume.length === 0
      ? '<div class="meldung hinweis"><span class="sym">i</span><div>Noch kein Raum angelegt. '
        + "Räume lassen sich einzeln anlegen oder über Expertenmodus, Plan von Hand umfahren, aus einem Plan übernehmen.</div></div>"
      /* Die Kopfzeile hat genau so viele Spalten wie die Datenzeile darunter.
         Steht hier eine Spalte zu viel, rutscht jede Beschriftung nach links
         und die Heizlast in Watt liest sich als Fensterzahl. Der Test in
         validierung/oberflaeche_test.js zaehlt beides gegeneinander. */
      : '<div class="tabhuelle"><table class="tab breit"><thead><tr>'
        + '<th style="width:74px">Geschoss</th><th style="min-width:150px">Raum</th>'
        + '<th style="width:132px">Art</th>'
        + '<th style="width:74px">θi °C</th><th style="width:86px" class="num">A m²</th>'
        + '<th style="width:74px" class="num">h m</th><th style="width:118px">Einheit</th>'
        + '<th style="width:80px" class="num">Φ W</th><th style="width:66px" class="num">W/m²</th>'
        + '<th style="width:120px"></th></tr></thead><tbody>'
        + App.p.raeume.map(function (r, i) {
            const x = erg[r.id] || {};
            const art = DR.RAUMARTEN[r.art] || {};
            const anzBt = (r.bauteile || []).length;
            const hoch = x.spez > 200;
            return "<tr" + (App.offenerRaum === r.id ? ' style="background:#F3F8F3"' : "") + ">"
              + '<td><input type="text" data-liste="raeume" data-i="' + i
              + '" data-k="geschoss" value="' + esc(r.geschoss || "") + '" style="width:70px"></td>'
              + '<td><input type="text" data-liste="raeume" data-i="' + i
              + '" data-k="name" value="' + esc(r.name || "") + '">'
              /* Der Konsens zweier Lesungen kennzeichnet, was nur EINE
                 Lesung gesehen hat (raumKonsens, gezielte Nachlesung). Die
                 Kennzeichnung muss im Raumbuch SICHTBAR sein — eine Marke,
                 die nur im Datensatz steht, kennzeichnet nichts. */
              + (r.herkunft && r.herkunft.aus_einer_lesung
                ? '<span class="annahme-marke" title="Diesen Raum hat nur eine '
                  + 'von zwei Lesungen gesehen ('
                  + esc(String(r.herkunft.lesung_quelle || "eine Lesung"))
                  + '). Bitte am Plan prüfen, ob er wirklich dasteht.'
                  + '">eine Lesung</span>' : "")
              + "</td>"
              /* Eine Raumart, die aus der gelesenen Bezeichnung nicht zu
                 erkennen war, ist auf "Wohn- und Schlafraum" gefallen. Das
                 sind 20,0 Grad und geht voll in die Heizlast ein. Es steht
                 hier, statt still zu gelten. */
              + '<td><select data-liste="raeume" data-i="' + i + '" data-k="art" data-neurender="1">'
              + DR.REIHENFOLGE.map((k) => '<option value="' + k + '"'
                  + (k === r.art ? " selected" : "") + ">" + esc(DR.RAUMARTEN[k].label)
                  + "</option>").join("")
              + "</select>"
              + (r.herkunft && r.herkunft.art_angenommen
                ? '<span class="annahme-marke" title="Aus der Bezeichnung '
                  + esc(String(r.herkunft.art_gelesen || r.name || ""))
                  + ' ließ sich keine Raumart erkennen. Angesetzt ist der '
                  + 'Rückfallwert; bitte prüfen.">angenommen</span>' : "")
              + "</td>"
              + '<td><input type="text" inputmode="decimal" step="0.5" data-liste="raeume" data-i="' + i
              + '" data-k="theta_i" value="'
              + esc(r.theta_i != null ? r.theta_i : (art.theta_i != null ? art.theta_i : ""))
              + '" style="width:70px"></td>'
              + '<td><input type="text" inputmode="decimal" step="0.01" data-liste="raeume" data-i="' + i
              + '" data-k="A" value="' + esc(r.A) + '"></td>'
              + '<td><input type="text" inputmode="decimal" step="0.01" data-liste="raeume" data-i="' + i
              + '" data-k="h" value="' + esc(r.h) + '"></td>'
              + '<td><select data-liste="raeume" data-i="' + i + '" data-k="we">'
              + '<option value="">– bitte wählen –</option>'
              + App.p.einheiten.map((u) => '<option value="' + esc(u.name) + '"'
                  + (u.name === r.we ? " selected" : "") + ">" + esc(u.name) + "</option>").join("")
              + "</select></td>"
              + '<td class="num"' + (hoch ? ' style="color:var(--rot);font-weight:600"' : "") + ">"
              + (x.phi_raum != null ? fmt(x.phi_raum, 0) : "–") + "</td>"
              + '<td class="num">' + (x.spez != null ? fmt(x.spez, 0) : "–") + "</td>"
              + '<td style="text-align:right;white-space:nowrap">'
              + '<button class="btn klein" data-aktion="raumBauteile" data-id="' + esc(r.id)
              + '" aria-expanded="' + (App.offenerRaum === r.id ? "true" : "false") + '">'
              + "Bauteile" + (anzBt ? " (" + anzBt + ")" : "") + "</button> "
              + '<button class="btn klein nurikon gefahr" data-aktion="raumWeg" data-i="' + i
              + '" aria-label="Raum ' + esc(r.name || "") + ' entfernen" title="Raum entfernen">'
              + ikon("x") + "</button>"
              + "</td></tr>"
              + (App.offenerRaum === r.id
                  ? '<tr><td colspan="10" style="background:#F3F8F3;padding:0 8px 14px">'
                    + raumBauteileTabelle(r, i) + "</td></tr>" : "");
          }).join("")
        + "</tbody><tfoot><tr><td colspan=\"4\">Summe</td>"
        + '<td class="num">' + fmt(e.A_gesamt || 0, 1) + "</td><td colspan=\"2\"></td>"
        + '<td class="num">' + fmt(e.phi_raeume_summe || 0, 0) + "</td>"
        + '<td class="num">' + fmt(e.spez_gebaeude || 0, 0) + "</td><td></td></tr></tfoot>"
        + "</table></div>")
    + '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn klein" data-aktion="raumNeu">Raum hinzufügen</button>'
    + (App.p.raeume.length
      ? '<button class="btn klein" data-aktion="geschossKopieren">Geschoss duplizieren</button>' : "")
    + "</div></div>";
}

const GRENZ_OPTIONEN = function (raumId) {
  const o = [{ v: "aussen", t: "Außenluft" }, { v: "erdreich", t: "Erdreich" }];
  App.p.zonen.forEach((z) => o.push({ v: "zone:" + z.id, t: z.name }));
  App.p.raeume.filter((r) => r.id !== raumId)
    .forEach((r) => o.push({ v: "raum:" + r.id, t: "Raum " + (r.geschoss ? r.geschoss + " " : "") + r.name }));
  o.push({ v: "fest", t: "feste Temperatur" });
  return o;
};

function raumBauteileTabelle(r, ri) {
  if (!r.bauteile) r.bauteile = [];
  const e = (App.ergebnis && App.ergebnis.raeume || []).find((x) => x.id === r.id);
  const erg = {};
  if (e) e.bauteile.forEach(function (b, j) { erg[j] = b; });
  const opt = GRENZ_OPTIONEN(r.id);
  return '<table class="tab" style="margin-top:4px"><thead><tr>'
    + '<th>Bauteil</th><th style="width:100px">Fläche m²</th>'
    + '<th style="width:210px">grenzt an</th><th style="width:80px" class="num">U eff</th>'
    + '<th style="width:80px" class="num">θj °C</th><th style="width:80px" class="num">Φ W</th>'
    + '<th style="width:50px"></th></tr></thead><tbody>'
    + (r.bauteile.length === 0
      ? '<tr><td colspan="7" style="color:var(--mute);padding:10px 6px">Noch kein Bauteil '
        + "zugewiesen.</td></tr>"
      : r.bauteile.map(function (b, j) {
          const g = b.grenzt_an || { typ: "aussen" };
          const gv = g.typ === "zone" ? "zone:" + g.ref : g.typ === "raum" ? "raum:" + g.ref : g.typ;
          const x = erg[j] || {};
          return "<tr><td><select data-rbt=\"" + ri + ":" + j + "\" data-k=\"typ_id\" data-neurender=\"1\">"
            + '<option value="">– Bauteil wählen –</option>'
            + App.p.bauteiltypen.map((t) => '<option value="' + t.id + '"'
                + (t.id === b.typ_id ? " selected" : "") + ">" + esc(t.name)
                + " (U " + fmt(num(t.U), 2) + ")</option>").join("")
            + "</select></td>"
            + '<td><input type="text" inputmode="decimal" step="0.01" data-rbt="' + ri + ":" + j
            + '" data-k="A" value="' + esc(b.A) + '"></td>'
            + '<td><select data-rbt="' + ri + ":" + j + '" data-k="grenz" data-neurender="1">'
            + opt.map((o) => '<option value="' + esc(o.v) + '"'
                + (o.v === gv ? " selected" : "") + ">" + esc(o.t) + "</option>").join("")
            + "</select>"
            + (g.typ === "fest" ? ' <input type="text" inputmode="decimal" step="0.1" data-rbt="' + ri + ":" + j
                + '" data-k="gtheta" value="' + esc(num(g.theta, 15)) + '" style="width:60px">' : "")
            + "</td>"
            + '<td class="num">' + (x.U_eff != null ? fmt(x.U_eff, 3) : "–") + "</td>"
            + '<td class="num">' + (x.theta_j != null ? fmt(x.theta_j, 1) : "–") + "</td>"
            + '<td class="num">' + (x.phi != null ? fmt(x.phi, 0) : "–") + "</td>"
            + '<td><button class="btn klein gefahr" data-aktion="rbtWeg" data-ij="' + ri + ":" + j
            + '">x</button></td></tr>';
        }).join(""))
    + "</tbody></table>"
    + '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + '<button class="btn klein" data-aktion="rbtNeu" data-i="' + ri + '">Bauteil zuweisen</button>'
    + (e ? '<span class="chip">Lüftung ' + fmt(e.v_dot, 1) + " m³/h ("
        + esc(e.massgebend) + ")</span>"
      + '<span class="chip">e = ' + fmt(e.e, 2) + "</span>"
      + '<span class="chip">Φ<sub>V</sub> ' + fmt(e.phi_V, 0) + " W</span>" : "")
    + '<button class="btn klein" data-aktion="raumZu">Schließen</button>'
    + "</div>";
}

/* --------------------------------------------------------------------------
 * Feineinstellung: Plan von Hand umfahren
 * ----------------------------------------------------------------------- */
function schrittPlan() {
  if (!window.MODUL_PLAN) return "<p>Plan-Modul nicht geladen.</p>";
  return window.MODUL_PLAN.html() + (window.MODUL_KI ? window.MODUL_KI.html() : "");
}

/* --------------------------------------------------------------------------
 * Schritt 6: Ergebnis
 * ----------------------------------------------------------------------- */
/** Die Spanne des Ergebnisses und die Reihenfolge des Nachmessens.
 *
 *  Der eigentliche Nutzen steht nicht in der Spanne, sondern in der Liste
 *  darunter: sie sagt, welche EINE Angabe am meisten bringt. Genau das ist
 *  die Frage, die sonst jeder selbst beantworten muss. */

/** Ist das Baujahr, mit dem gerechnet wird, eine Annahme des Werkzeugs? */
function bjAngenommen() {
  /* Zwei Arten, wie die U-Werte NICHT auf einem eingetragenen Baujahr stehen:
     ein aus dem Plandatum abgeleitetes Baujahr (annahmen.baujahr) und die
     Rueckfallklasse, wenn gar keines bekannt ist (annahmen.baujahr_klasse).
     Beide gehoeren in die Leiste und in die Karte; bis zum 25.08.2026 stand
     dort nur die erste, und der Fall ohne Baujahr sah aus wie einer mit. */
  return !!(App.p && App.p.annahmen
    && (App.p.annahmen.baujahr || App.p.annahmen.baujahr_klasse));
}

/* --------------------------------------------------------------------------
 * Die Gegenrechnung zum angenommenen Baujahr -- und warum sie GANZ OBEN steht
 * --------------------------------------------------------------------------
 * Gemessen am Blatt "BV 2-0887 Ziolkowski": das Baujahr steht nicht auf dem
 * Blatt, es ist aus dem Plandatum abgeleitet. Aus ihm kommen die U-Werte, aus
 * den U-Werten die Heizlast -- und aus demselben Baujahr kam auch der
 * Erwartungswert, gegen den die Plausibilitaetszeile prueft. Sie meldete
 * folgerichtig "im Erwartungsbereich", ohne irgendetwas geprueft zu haben.
 *
 * Diese Karte ersetzt keine Pruefung. Sie beziffert, was die Annahme wert
 * ist, und steht deshalb VOR der Bandbreite und unmittelbar unter der Zahl:
 * wer bis Kapitel neun blaettern muss, um zu erfahren, dass dieselbe Rechnung
 * mit einem anderen Baujahr das Doppelte ergibt, erfaehrt es nicht.
 * ----------------------------------------------------------------------- */
function baujahrKasten() {
  const r = App.baujahrprobe;
  if (!r || !r.ok || !(r.stufen || []).length) return "";
  const angenommen = r.angenommen || bjAngenommen();
  const ohneBj = r.ohne_baujahr === true;
  const hoch = r.stufen.reduce(function (a, b) { return b.w > a.w ? b : a; }, r.stufen[0]);
  return '<div class="panelkarte' + (angenommen ? " fehler" : "") + '" style="margin:14px 0 0">'
    + "<h4>" + (ohneBj
      ? ikon("warnung") + " Das Baujahr ist unbekannt. Was hängt daran?"
      : (angenommen
        ? ikon("warnung") + " Das Baujahr ist angenommen. Was hängt daran?"
        : "Was hinge an einem anderen Baujahr?")) + "</h4>"
    + '<p style="margin:2px 0 8px;font-size:13px">' + esc(r.text) + "</p>"
    + (ohneBj
      ? '<p style="margin:0 0 8px;font-size:13px"><b>Warum diese Klasse:</b> '
        + "sie ist die jüngste Bestandsklasse vor der 1. Wärmeschutzverordnung "
        + "und liegt in der Mitte der Bestandsspanne; die Fundstelle steht an "
        + "jedem Bauteil. <b>Die Zeile darunter ist die eigentliche Auskunft:</b> "
        + "sie beziffert, was ein anderes Baujahr aus derselben Rechnung machen "
        + "würde. Ein eingetragenes Baujahr ersetzt alle Rückfallwerte.</p>"
      : (angenommen
        ? '<p style="margin:0 0 8px;font-size:13px"><b>Der Kreis, den diese Karte '
          + "aufbricht:</b> die U-Werte kommen aus dem angenommenen Baujahr, und "
          + "der Typologie-Kennwert, gegen den die Selbstprüfung vergleicht, kommt "
          + "aus demselben Baujahr. Diese Gegenrechnung ist die einzige Zahl "
          + "daneben, die die Annahme selbst in Frage stellt.</p>"
        : ""))
    + '<div class="tabhuelle"><table class="tab"><thead><tr>'
    + "<th>Baualtersklasse</th>"
    + '<th class="num" style="width:90px">kW</th>'
    + '<th class="num" style="width:96px">W/m²</th>'
    + '<th class="num" style="width:90px">gegen jetzt</th>'
    + "</tr></thead><tbody>"
    + r.stufen.slice().reverse().map(function (s) {
        return '<tr' + (s.eigene_klasse ? ' style="font-weight:700"' : "") + ">"
          + "<td>" + esc(s.label) + (s.eigene_klasse ? " (angesetzt)" : "") + "</td>"
          + '<td class="num">' + fmt(s.w / 1000, 2) + "</td>"
          + '<td class="num">' + (s.spez === null ? "–" : fmt(s.spez, 1)) + "</td>"
          + '<td class="num">' + (s.eigene_klasse ? "–"
              : (s.abweichung_prozent >= 0 ? "+" : "") + fmt(s.abweichung_prozent, 0) + " %")
          + "</td></tr>";
      }).join("")
    + "</tbody></table></div>"
    + '<p style="font-size:12.5px;color:var(--mute);margin:8px 0 0">Bezug der '
    + "spezifischen Werte: " + esc(r.bezug) + ", " + fmt(r.bezugsflaeche, 2) + " m². "
    + "Höchstwert " + fmt(hoch.w / 1000, 2) + " kW in der Klasse "
    + esc(hoch.label) + ". " + r.laeufe + " Rechenläufe, " + fmt(r.ms, 0) + " ms.</p>"
    + (r.hinweise || []).map(function (h) {
        return '<p style="font-size:12.5px;color:var(--mute);margin:6px 0 0">'
          + esc(h) + "</p>";
      }).join("")
    + "</div>";
}

function bandbreiteKasten() {
  const b = App.bandbreite;
  if (!b || !b.ok) return "";
  const stufentext = { schmal: "belastbar", mittel: "brauchbar", breit: "grob" };
  const gross = (b.beitraege || []).filter(function (x) { return (x.anteil || 0) >= 0.03; })
    .slice(0, 4);
  return '<div class="panelkarte" style="margin:14px 0 0">'
    + "<h4>Wie belastbar ist diese Zahl?</h4>"
    + "<p style=\"margin:2px 0 8px\"><b>" + esc(b.text) + "</b>"
    + ' <span class="chip ' + (b.stufe === "schmal" ? "belegt" : "annahme") + '">'
    + esc(stufentext[b.stufe] || b.stufe) + "</span></p>"
    + '<p style="font-size:12.5px;color:var(--mute);margin:0 0 8px">Die Spanne ist die '
    + "plausible Bandbreite unter den getroffenen Annahmen, nicht der schlimmste "
    + "denkbare Fall. Sie beruht auf " + b.anzahl_groessen + " nicht belegten Größen "
    + "(" + b.laeufe + " Rechenläufe).</p>"
    /* WAS DIE SPANNE NICHT IST. Sie streut die U-Werte INNERHALB der
       angesetzten Baualtersklasse. Ist das Baujahr selbst nur angenommen,
       steht die Wahl der Klasse ausserhalb dieser Spanne -- und wiegt ein
       Vielfaches. Ohne diesen Satz liest sich die Spanne als
       Gesamtunsicherheit, und genau so wurde sie gelesen. */
    + (bjAngenommen()
      ? '<p class="warnzeile" style="font-size:12.5px;margin:0 0 8px">'
        + "<b>Nicht in dieser Spanne enthalten:</b> die Wahl der "
        + "Baualtersklasse. Das Baujahr ist angenommen; die Spanne streut die "
        + "U-Werte nur innerhalb der angesetzten Klasse. Wie weit eine andere "
        + "Klasse trägt, steht in der Gegenrechnung darüber.</p>"
      : "")
    + (gross.length
      ? "<p style=\"font-size:13px;margin:0 0 4px\"><b>Was zuerst nachmessen:</b></p>"
        + '<div class="tabhuelle"><table class="tab"><thead><tr><th>Größe</th>'
        + '<th class="num" style="width:100px">Wirkung W</th>'
        + '<th class="num" style="width:80px">Anteil</th></tr></thead><tbody>'
        + gross.map(function (x) {
            return "<tr><td>" + esc(x.label) + "</td><td class=\"num\">"
              + fmt(x.wirkung_w || 0, 0) + '</td><td class="num">'
              + fmt((x.anteil || 0) * 100, 0) + " %</td></tr>";
          }).join("")
        + "</tbody></table></div>"
      : "")
    + "</div>";
}

/* --------------------------------------------------------------------------
 * Schritt 3: das Ergebnis
 * --------------------------------------------------------------------------
 * Reihenfolge nach dem, was der Bearbeiter braucht, nicht nach dem, was die
 * Rechnung hergibt: oben die Zahl mit Fläche, spezifischem Wert und
 * Raumzahl, direkt darunter das Urteil der vorhandenen Prüfung („Belastbar
 * unter 2 ausgewiesenen Annahmen") mit dem Weg zu den Annahmen, daneben der
 * Berichtsknopf. Dann die Raumheizlasten am Plan. Erst danach, zugeklappt,
 * die technischen Tabellen. NICHTS ist entfallen: Bauteilbilanz, Anteile,
 * Einheiten, Teillast, Prüfhinweise und Quellen stehen in den Aufklappern.
 * ----------------------------------------------------------------------- */
function schrittErgebnis() {
  const e = App.ergebnis;
  if (!e || e.fehlerhaft) {
    return '<div class="karte"><div class="meldung fehler"><span class="sym">!</span><div>'
      + "Die Berechnung ist fehlgeschlagen: " + esc(e && e.meldung || "unbekannt") + "</div></div></div>";
  }
  const pr = App.pruefung;
  /* Offene Punkte sind Fehler und offene Fragen. Hinweise ordnen vorhandene
     Werte ein und halten nichts auf (Kundenwort 25.08.2026). */
  const offenZaehl = pr ? (pr.zaehl.fehler || 0) + (pr.zaehl.offen || 0) : 0;
  return ergebnisKopfKarte(e)
    + (App.ergebnisAnnahmenOffen ? ergebnisAnnahmenBereich() : "")
    + ergebnisRaumlastenKarte(e)
    + ergebnisAufklapper("Bauteilbilanz", ergebnisBauteilbilanz(e), false)
    + ergebnisAufklapper("Transmission, Lüftung und Kennwerte",
        ergebnisAnteile(e), false)
    + ergebnisAufklapper("Je Wohn- und Nutzungseinheit", ergebnisJeEinheit(e), false)
    + ergebnisAufklapper("Teillast", ergebnisTeillast(e), false)
    + ergebnisAufklapper("Prüfhinweise"
        + (offenZaehl ? " (" + mz(offenZaehl, "offener Punkt", "offene Punkte") + ")" : ""),
        meldungenHtml(e), offenZaehl > 0)
    + ergebnisAufklapper("Quellen und Verfahren", ergebnisQuellen(), false)
    + bewertungKarte(e);
}

/** Die Karte ganz oben: Zahl, Bezugswerte, Urteil, Berichtsknopf. */
function ergebnisKopfKarte(e) {
  return '<div class="karte">'
    + '<div class="ergebniskopf">'
    + '<div class="ergebniszahl">'
    + '<span class="mark">Norm-Gebäudeheizlast</span>'
    + '<b>' + fmt(e.phi_gebaeude / 1000, 2) + '<small> kW</small></b>'
    + '<span class="unten">' + fmt(e.A_gesamt, 1) + " m² · "
    + fmt(e.spez_gebaeude, 1) + " W/m² · "
    + mz((e.raeume || []).length, "Raum", "Räume") + " · "
    + fmt(e.phi_gebaeude, 0) + " W · maßgebend für die Auslegung "
    + "des Wärmeerzeugers</span></div>"
    + '<div class="ergebnisstand">'
    + ergebnisAmpelzeile()
    + '<div class="ergknoepfe">'
    + '<button class="btn cta" data-aktion="bericht" '
    + 'title="Druckfassung für den Auftraggeber: ohne Bandbreite, Konfidenz, '
    + 'Quellen, BEG-Bewertung, offene Punkte und Prüfungen">'
    + ikon("blatt") + "Bericht erstellen</button>"
    + (ergebnisAnnahmenVorhanden()
      ? '<button class="btn" data-aktion="ergebnisAnnahmen" aria-expanded="'
        + (App.ergebnisAnnahmenOffen ? "true" : "false") + '">'
        + (App.ergebnisAnnahmenOffen ? "Annahmen ausblenden" : "Annahmen anzeigen")
        + "</button>"
      : "")
    + "</div></div></div></div>";
}

/** Das Urteil unter der Zahl — aus der VORHANDENEN Prüfung, keine zweite
 *  Regel. Steht die Ampel auf „annahme", wird die Zahl der ausgewiesenen
 *  Annahmen genannt; sonst das Wort der Stufe mit den Zählern. */
function ergebnisAmpelzeile() {
  const pr = App.pruefung;
  if (!pr) return "";
  const stufe = AMPEL_STUFE[pr.ampel];
  const zeichen = AMPEL_ZEICHEN[pr.ampel];
  const liste = annahmenListe(App.p);
  let wort = AMPEL_WORT[pr.ampel];
  if (pr.ampel === "annahme" && liste.length) {
    wort = "Belastbar unter " + (liste.length === 1
      ? "1 ausgewiesenen Annahme" : liste.length + " ausgewiesenen Annahmen");
  }
  const zaehl = (pr.ampel === "rot" || pr.ampel === "gelb")
    ? " · " + mz(pr.zaehl.fehler, "Fehler", "Fehler")
      + (pr.zaehl.offen
        ? " · " + mz(pr.zaehl.offen, "offene Frage", "offene Fragen") : "")
      + " · " + mz(pr.zaehl.hinweis, "Hinweis", "Hinweise")
    : "";
  return '<button type="button" class="ergampel ' + stufe
    + '" data-schritt="pruefung" title="Zur Selbstprüfung">'
    + ikon(zeichen) + "<span><b>" + esc(wort) + "</b>" + esc(zaehl) + "</span>"
    + "</button>";
}

/** Gibt es etwas hinter dem Knopf „Annahmen anzeigen"? */
function ergebnisAnnahmenVorhanden() {
  return annahmenListe(App.p).length > 0
    || !!(App.p.annahmen && App.p.annahmen.baujahr_nicht)
    || !!(App.baujahrprobe && App.baujahrprobe.ok)
    || !!(App.bandbreite && App.bandbreite.ok);
}

/** Der aufgeklappte Annahmenbereich: die VORHANDENE Annahmenkarte (mit
 *  Begründung und Feld zum Ändern) und die beiden Gegenrechnungen, die
 *  vorher fest auf der Seite standen. Nichts davon ist neu gebaut. */
function ergebnisAnnahmenBereich() {
  const karte = annahmenKarte();
  const kaesten = baujahrKasten() + bandbreiteKasten();
  if (!karte && !kaesten) {
    return '<div class="meldung gut"><span class="sym">OK</span><div>'
      + "Keine Annahmen: alle Eingaben sind belegt.</div></div>";
  }
  return karte
    + (kaesten
      ? '<div class="karte"><h2>Woran die Zahl hängt</h2>' + kaesten + "</div>"
      : "");
}

/** Raumheizlasten: der Plan aus dem Prüfblatt mit der Heizlast an jeder
 *  Marke, daneben die Tabelle. Klick auf Zeile oder Marke öffnet die
 *  Zusammensetzung des Raums — die Zahlen liegen im Ergebnis bereits vor. */
function ergebnisRaumlastenKarte(e) {
  const zeilen = e.raeume || [];
  if (!zeilen.length) return "";
  const PB = window.MODUL_PRUEFBLATT;
  const plan = PB && PB.ergebnisPlanHtml ? PB.ergebnisPlanHtml() : "";
  const tabelle = '<div class="tabhuelle"><table class="tab"><thead><tr>'
    + '<th>Raum</th><th class="num" style="width:90px">A m²</th>'
    + '<th class="num" style="width:110px">Heizlast W</th>'
    + '<th class="num" style="width:80px">W/m²</th></tr></thead><tbody>'
    + zeilen.map(function (r) {
        const offen = App.ergebnisRaum === r.id;
        return '<tr class="ergraum' + (offen ? " an" : "") + '" data-aktion="ergebnisRaum" '
          + 'data-id="' + esc(r.id) + '">'
          + "<td><button type=\"button\" class=\"ergraumknopf\" data-aktion=\"ergebnisRaum\" "
          + 'data-id="' + esc(r.id) + '" aria-expanded="' + (offen ? "true" : "false") + '">'
          + esc((r.geschoss ? r.geschoss + " · " : "") + (r.raum || "ohne Namen"))
          + "</button></td>"
          + '<td class="num">' + fmt(r.A, 1) + "</td>"
          + '<td class="num">' + fmt(r.phi_raum, 0) + "</td>"
          + '<td class="num">' + fmt(r.spez, 0) + "</td></tr>"
          + (offen
            ? '<tr><td colspan="4" style="background:#F3F8F3;padding:2px 8px 12px">'
              + ergebnisZusammensetzung(r) + "</td></tr>"
            : "");
      }).join("")
    + "</tbody><tfoot><tr><td>Summe Raumheizlasten</td>"
    + '<td class="num">' + fmt(e.A_gesamt, 1) + "</td>"
    + '<td class="num">' + fmt(e.phi_raeume_summe, 0) + "</td>"
    + '<td class="num">' + fmt(e.spez_gebaeude, 0) + "</td></tr></tfoot></table></div>";
  return '<div class="karte"><h2>Raumheizlasten</h2>'
    /* DER SATZ GILT NUR, WENN ER STIMMT.
       GEMESSEN am 26.08.2026 an "Bauantrag Soethe": hier stand unbedingt
       "sie ist größer als die Gebäudeheizlast", während die Summenzeile
       derselben Tabelle 5.816 W = 5.816 W zeigte. Der Bericht hängt diesen
       Satz laengst an den Vergleich (modul_bericht.js); die Ergebnisseite
       tat es nicht -- zwei Wahrheiten ueber dieselben zwei Zahlen. */
    + '<p class="hinweis">Klick auf einen Raum — in der Tabelle oder auf seine Marke '
    + "im Plan — zeigt, woraus seine Heizlast besteht. Die Summe der Raumheizlasten "
    + "ist maßgebend für die Heizflächen; "
    + (Number(e.phi_raeume_summe) > Number(e.phi_gebaeude) + 0.5
      ? "sie ist größer als die Gebäudeheizlast, weil Wärme zwischen Räumen "
        + "dort zählt.</p>"
      : "sie entspricht hier der Gebäudeheizlast, weil zwischen den Räumen "
        + "keine Wärme fließt (gleiche Innentemperaturen).</p>")
    + (plan
      ? '<div class="ergraster"><div>' + plan + "</div>" + tabelle + "</div>"
      : tabelle)
    + "</div>";
}

/** Die Zusammensetzung eines Raums: Transmission je Bauteil, Lüftung,
 *  Aufheizleistung. Alles aus dem vorliegenden Ergebnis, nichts neu gerechnet. */
function ergebnisZusammensetzung(r) {
  const teile = (r.bauteile || []).map(function (b) {
    return "<tr><td>" + esc(b.name)
      + (b.kat === "innen" ? ' <span class="chip">gegen Nachbarraum</span>' : "")
      + "</td>"
      + '<td class="num">' + fmt(b.A, 1) + "</td>"
      + '<td class="num">' + fmt(b.U_eff, 2) + "</td>"
      + '<td class="num">' + fmt(b.theta_j, 1) + "</td>"
      + '<td class="num">' + fmt(b.phi, 0) + "</td></tr>";
  }).join("");
  const lueftung = "<tr><td>Lüftung — " + fmt(r.v_dot, 1) + " m³/h, maßgebend "
    + esc(r.massgebend || "") + "</td>"
    + '<td class="num">–</td><td class="num">–</td><td class="num">–</td>'
    + '<td class="num">' + fmt(r.phi_V, 0) + "</td></tr>";
  const aufheiz = r.phi_RH
    ? "<tr><td>Aufheizleistung (f<sub>RH</sub> " + fmt(r.f_RH, 0) + " W/m²)</td>"
      + '<td class="num">–</td><td class="num">–</td><td class="num">–</td>'
      + '<td class="num">' + fmt(r.phi_RH, 0) + "</td></tr>"
    : "";
  return '<div class="tabhuelle"><table class="tab" style="margin-top:6px"><thead><tr>'
    + '<th>Anteil</th><th class="num" style="width:80px">A m²</th>'
    + '<th class="num" style="width:90px">U eff</th>'
    + '<th class="num" style="width:90px">gegen °C</th>'
    + '<th class="num" style="width:90px">Φ W</th></tr></thead><tbody>'
    + teile + lueftung + aufheiz
    + '</tbody><tfoot><tr><td colspan="4">Raumheizlast '
    + esc(r.raum || "") + " (θ<sub>i</sub> " + fmt(r.theta_i, 1) + " °C)</td>"
    + '<td class="num">' + fmt(r.phi_raum, 0) + "</td></tr></tfoot></table></div>"
    + (r.phi_T_innen
      ? '<p style="font-size:12.5px;color:var(--mute);margin:6px 0 0">Darin '
        + fmt(r.phi_T_innen, 0) + " W gegen Nachbarräume: sie zählen zur "
        + "Raumheizlast dieses Raums, heben sich im Gebäude aber auf und stehen "
        + "deshalb nicht in der Gebäudeheizlast.</p>"
      : "");
}

/** Ein zugeklappter Abschnitt. Bewusst ein details-Element: kein eigener
 *  Zustand, kein Verteilerzweig, und die Suche des Browsers öffnet es selbst. */
function ergebnisAufklapper(titel, inhalt, offen) {
  if (!inhalt) return "";
  return '<details class="karte ergauf"' + (offen ? " open" : "") + ">"
    + "<summary>" + titel + "</summary>"
    + '<div class="ergaufinhalt">' + inhalt + "</div></details>";
}

function ergebnisBauteilbilanz(e) {
  const bil = Object.keys(e.bilanz || {}).map((k) => Object.assign({ name: k }, e.bilanz[k]))
    .sort((a, b) => b.phi - a.phi);
  if (!bil.length) return "";
  return '<p class="hinweis">Wärmeströme der Gebäudehülle, ohne Bauteile zwischen Räumen.</p>'
    + '<div class="tabhuelle"><table class="tab"><thead><tr><th>Bauteil</th>'
    + '<th class="num" style="width:100px">A m²</th><th class="num" style="width:90px">U</th>'
    + '<th class="num" style="width:110px">Φ W</th><th class="num" style="width:80px">%</th>'
    + "</tr></thead><tbody>"
    + bil.map(function (b) {
        return "<tr><td>" + esc(b.name) + "</td>"
          + '<td class="num">' + fmt(b.A, 1) + "</td>"
          + '<td class="num">' + fmt(b.U, 2) + "</td>"
          + '<td class="num">' + fmt(b.phi, 0) + "</td>"
          + '<td class="num">' + fmt(e.phi_T_gebaeude ? b.phi / e.phi_T_gebaeude * 100 : 0, 1) + "</td></tr>";
      }).join("")
    + "</tbody></table></div>";
}

function ergebnisAnteile(e) {
  return '<div class="feldreihe" style="margin-bottom:14px">'
    + '<div class="kennzahl"><span class="mark">Summe Raumheizlasten</span><b>'
    + fmt(e.phi_raeume_summe, 0) + " W</b>"
    + '<span class="unten">maßgebend für die Heizflächen</span></div>'
    + '<div class="kennzahl"><span class="mark">Spezifisch</span><b>'
    + fmt(e.spez_gebaeude, 1) + " W/m²</b>"
    + '<span class="unten">bezogen auf ' + fmt(e.A_gesamt, 1) + " m²</span></div>"
    + '<div class="kennzahl"><span class="mark">H<sub>T</sub></span><b>'
    + fmt(e.H_T, 1) + " W/K</b>"
    /* Die Beschriftung beschrieb bis zum 27.08.2026 die ALTE Groesse: H_T war
       aus der Gebaeudesumme auf 20 °C zurueckgerechnet. Seit der Berichtigung
       ist H_T der spezifische Transmissionswaermeverlust der Huelle,
       SUM(A · U · b) -- eine Eigenschaft der Huelle, unabhaengig davon, wie
       warm die Raeume dahinter stehen. Die alte Beschriftung waere jetzt
       falsch und wuerde zum Vergleich mit dem falschen Kennwert einladen.
       Festgehalten in validierung/ergebnisseite_test.js. */
    + '<span class="unten">Hülle: Σ A · U · b</span></div>'
    + "</div>"
    + '<div class="tabhuelle"><table class="tab"><thead><tr><th>Anteil</th>'
    + '<th class="num" style="width:120px">W</th><th class="num" style="width:90px">%</th>'
    + "</tr></thead><tbody>"
    + zeile("Transmission", e.phi_T_gebaeude, e.phi_gebaeude)
    + zeile("Lüftung", e.phi_V_gebaeude, e.phi_gebaeude)
    + (e.phi_RH_gebaeude ? zeile("Aufheizleistung", e.phi_RH_gebaeude, e.phi_gebaeude) : "")
    + "</tbody></table></div>";
}

function ergebnisJeEinheit(e) {
  const schluessel = Object.keys(e.je_we || {});
  if (!schluessel.length) return "";
  return '<div class="tabhuelle"><table class="tab"><thead><tr><th>Einheit</th>'
    + '<th class="num" style="width:90px">Räume</th><th class="num" style="width:100px">A m²</th>'
    + '<th class="num" style="width:110px">Φ W</th></tr></thead><tbody>'
    + schluessel.map(function (k) {
        const w = e.je_we[k];
        return "<tr><td>" + esc(k) + "</td>"
          + '<td class="num">' + w.raeume + "</td>"
          + '<td class="num">' + fmt(w.A, 1) + "</td>"
          + '<td class="num">' + fmt(w.phi_raum, 0) + "</td></tr>";
      }).join("")
    + "</tbody></table></div>";
}

/** Teillast aus dem vorhandenen Modul: dieselbe Kennlinie, die auch im
 *  Bericht steht. Hier nur angezeigt, nicht neu hergeleitet. */
function ergebnisTeillast(e) {
  const T = window.MODUL_TEILLAST;
  if (!T || !T.kennlinie) return "";
  let kl = null;
  try { kl = T.kennlinie(e, App.p); } catch (fehl) { kl = null; }
  if (!kl || !(kl.zeilen || []).length) {
    return '<p class="hinweis">Die Teillast lässt sich erst zeichnen, wenn die '
      + "Norm-Außentemperatur im Ergebnis steht.</p>";
  }
  return '<p class="hinweis">Lineare Kennlinie zwischen Auslegungspunkt und '
    + "Heizgrenze (" + fmt(kl.heizgrenze, 0) + " °C, "
    + "Gradtagzahl-Konvention G20/15). Dieselben Zeilen stehen im Bericht, dort "
    + "mit Herleitung und Gegenprobe am Rechenkern.</p>"
    + '<div class="tabhuelle"><table class="tab"><thead><tr>'
    + '<th style="width:130px">Außentemperatur</th>'
    + '<th class="num" style="width:90px">kW</th>'
    + '<th class="num" style="width:110px">% der Auslegung</th>'
    + "<th>Bemerkung</th></tr></thead><tbody>"
    + kl.zeilen.map(function (z) {
        return "<tr" + (z.art === "auslegung" ? ' style="font-weight:600"' : "") + ">"
          + "<td>" + fmt(z.theta_e, 1) + " °C</td>"
          + '<td class="num">' + fmt(z.phi / 1000, 2) + "</td>"
          + '<td class="num">' + (z.anteil === null ? "–" : fmt(z.anteil * 100, 0)) + "</td>"
          + "<td>" + esc(z.bemerkung || "") + "</td></tr>";
      }).join("")
    + "</tbody></table></div>";
}

/** Quellen: woher Verfahren, Klima und U-Werte stammen. Die vollständige
 *  Annahmenliste mit Herleitung steht im Bericht. */
function ergebnisQuellen() {
  const p = App.p;
  const klimaAnnahme = !!(p.annahmen && p.annahmen.klima);
  return '<p class="hinweis">Rechenverfahren: DIN EN 12831-1:2017-09 in Verbindung '
    + "mit DIN/TS 12831-1:2020-04. Die vollständige Annahmenliste mit Herleitung "
    + "steht im Bericht.</p>"
    + '<div class="meldung ' + (klimaAnnahme ? "warnung" : "hinweis")
    + '"><span class="sym">' + (klimaAnnahme ? "!" : "i") + "</span><div>"
    + "<b>Norm-Außentemperatur:</b> "
    + (p.klima.theta_e != null ? fmt(p.klima.theta_e, 1) + " °C" : "nicht gesetzt")
    + (p.klima.quelle ? " — " + esc(p.klima.quelle) : "")
    + (klimaAnnahme ? " (angenommen, siehe Annahmen)" : "")
    + "</div></div>"
    + (p.bauteiltypen.length
      ? '<div class="tabhuelle"><table class="tab"><thead><tr><th>Bauteil</th>'
        + '<th class="num" style="width:90px">U</th>'
        + '<th style="width:110px">Herkunft</th><th>Quelle</th></tr></thead><tbody>'
        + p.bauteiltypen.map(function (t) {
            return "<tr><td>" + esc(t.name) + "</td>"
              + '<td class="num">' + fmt(num(t.U), 2) + "</td>"
              + "<td>" + (t.belegt ? '<span class="chip belegt">belegt</span>'
                  : '<span class="chip annahme">Annahme</span>') + "</td>"
              + "<td>" + esc(t.quelle || "–") + "</td></tr>";
          }).join("")
        + "</tbody></table></div>"
      : "");
}

/** Die fünf bewertenden Absätze des Berichts. Sie sind der Unterschied
 *  zwischen einem Rechenprotokoll und einem Bericht, für den jemand bezahlt
 *  hat, und deshalb sitzt der Knopf hier, direkt hinter dem Ergebnis und vor
 *  dem Berichtsknopf. */
function bewertungKarte(e) {
  const B = window.MODUL_BEWERTUNG;
  if (!B) return "";
  const vorschlag = B.html();
  const p = App.p;
  const schon = p.texte && (p.texte.kap1_punkte || p.texte.kap2_einleitung
    || p.texte.kap6_bewertung || p.texte.offene_punkte);
  return '<div class="karte"><h2>Bewertende Absätze für den Bericht</h2>'
    + '<p class="hinweis">Der Bericht rechnet von allein. Was er ohne Hilfe nicht kann, '
    + "ist sagen, was diese Zahlen für dieses Gebäude bedeuten. Die Absätze in Kapitel 1, "
    + "2, 6 und 8 werden aus den Rechenergebnissen geschrieben und anschließend Zahl für "
    + "Zahl gegen sie geprüft.</p>"
    + (schon
      ? '<div class="meldung gut"><span class="sym">OK</span><div>Für diesen Bericht '
        + "liegen bereits Absätze vor. Ein neuer Durchlauf ersetzt sie.</div></div>"
      : "")
    + B.knopf(p, e)
    + (vorschlag ? "<div style=\"margin-top:16px\">" + vorschlag + "</div>" : "")
    /* Die uebernommenen Absaetze, jeder Satz einzeln streichbar — ein
       falscher Satz soll nicht den ganzen Absatz oder einen neuen
       Modelldurchlauf kosten. */
    + (B.uebernommeneHtml ? B.uebernommeneHtml(p) : "")
    + "</div>";
}

/* Die vier Stufen der Ampel, an einer Stelle. Sie stehen in der Leiste, im
   Schritt „Selbstprüfung" und im Kontrollblatt; drei Kopien desselben Wortes
   laufen mit der Zeit auseinander.
   „annahme" ist die Stufe zwischen Gelb und Grün: kein Fehler offen, aber
   das Ergebnis steht auf ausgewiesenen Annahmen. Sie trägt die Warnfläche,
   weil sie gelesen werden muss, und ein Wort, das nicht nach Mangel klingt —
   denn ein Mangel ist es nicht, solange die Annahmen danebenstehen. */
const AMPEL_WORT = { rot: "Nicht belastbar", gelb: "Mit Einschränkung belastbar",
                     annahme: "Belastbar unter genannten Annahmen",
                     gruen: "Belastbar" };
const AMPEL_KURZ = { rot: "Nicht belastbar", gelb: "Mit Einschränkung",
                     annahme: "Belastbar unter Annahmen", gruen: "Belastbar" };
const AMPEL_STUFE = { rot: "fehler", gelb: "warnung", annahme: "warnung", gruen: "gut" };
const AMPEL_ZEICHEN = { rot: "warnung", gelb: "warnung", annahme: "warnung",
                        gruen: "haken-kreis" };

function schrittPruefung() {
  const pr = App.pruefung;
  if (!pr) return '<div class="karte">Prüfmodul nicht geladen.</div>';
  /* Die frühere Gruppe „Warnungen" ist mit den Hinweisen zusammengelegt:
     was kein Fehler ist, ist ein Hinweis (Kundenwort 25.08.2026). Offene
     Fragen stehen seither im Zähler der Kopfzeile — dann müssen sie auch
     hier als Gruppe stehen, sonst nennt der Kopf zwei Fragen, die auf der
     Seite nirgends zu sehen sind. */
  const stufen = [
    { s: "fehler", t: "Fehler", kl: "fehler", sym: "!" },
    { s: "offen", t: "Offene Fragen", kl: "warnung", sym: "?" },
    { s: "hinweis", t: "Hinweise", kl: "hinweis", sym: "i" },
    { s: "gut", t: "Geprüft und unauffällig", kl: "gut", sym: "OK" },
  ];
  const ampelText = AMPEL_WORT[pr.ampel];
  /* Die Ampel traegt die Flaeche ihrer Stufe, wie in der Leiste rechts und im
     Kontrollblatt. Ein farbiger Punkt auf grauem Grund war die schwaechste
     Darstellung fuer die staerkste Aussage der Seite. */
  const stufe = AMPEL_STUFE[pr.ampel];
  const zeichen = AMPEL_ZEICHEN[pr.ampel];
  return '<div class="karte"><h2>Selbstprüfung</h2>'
    /* HIER STAND EINE UNWAHRHEIT, UND ZWAR ALS ÜBERSCHRIFT.
       „Das Werkzeug prüft jedes Ergebnis gegen unabhängige Erwartungswerte.
       Der Quervergleich rechnet mit dem Typologie-Kennwert aus dem Baujahr
       und damit auf einem anderen Weg als die Raumbilanz." — Ein anderer Weg
       ist es nicht: die U-Werte der Raumbilanz kommen aus demselben Baujahr
       wie der Kennwert. Ist das Baujahr auch noch angenommen, teilen beide
       Seiten sogar dieselbe Annahme. Was wirklich unabhängig ist, steht
       jetzt hier, benannt und abzählbar. */
    + '<p class="hinweis">Unabhängig vom Baujahr sind nur die aus dem Plan '
    + "gemessenen Größen: Flächen, Höhen und Volumen (Hüllfläche gegen Volumen, "
    + "Maßstabsprobe, zweite Lesung des Blattes) sowie die Norm-Außentemperatur "
    + "aus der Klimatabelle. Der Quervergleich mit der Gebäudetypologie ist "
    + "<b>nicht</b> unabhängig: sein Erwartungswert kommt aus derselben "
    + "Baualtersklasse wie die U-Werte, mit denen gerechnet wird."
    + (bjAngenommen()
      ? " Weil das Baujahr hier angenommen ist, stammen beide Seiten dieses "
        + "Vergleichs aus derselben Annahme. Was daran hängt, steht als "
        + "Gegenrechnung über dem Ergebnis."
      : "") + "</p>"
    + '<div class="meldung ' + stufe + '" style="font-size:14px;margin:0 0 18px">'
    + '<span class="sym" style="background:none;color:inherit;width:22px;height:22px">'
    + ikon(zeichen) + "</span>"
    + '<div><b style="font-size:17px">' + ampelText + "</b><br>"
    + mz(pr.zaehl.fehler, "Fehler", "Fehler") + " · "
    + (pr.zaehl.offen
      ? mz(pr.zaehl.offen, "offene Frage", "offene Fragen") + " · " : "")
    + mz(pr.zaehl.hinweis, "Hinweis", "Hinweise") + " · " + pr.zaehl.gut + " unauffällig"
    + (pr.bestaetigung
      ? " · " + pr.bestaetigung.bestaetigt + " von "
        + mz(pr.bestaetigung.gesamt, "Zeile", "Zeilen") + " zur Kenntnis genommen" : "")
    + "</div></div>"
    + stufen.map(function (st) {
        const liste = pr.pruefungen.filter((x) => x.stufe === st.s);
        if (!liste.length) return "";
        return "<h3 style=\"margin-top:18px;font-size:15px\">" + st.t + " (" + liste.length + ")</h3>"
          + liste.map((x) => '<div class="meldung ' + st.kl + '"><span class="sym">'
              + st.sym + '</span><div><b>' + esc(x.titel) + "</b><br>" + esc(x.text)
              + "</div></div>").join("");
      }).join("")
    + "</div>";
}

/* Die frühere Helferin neben() (dt/dd-Nebenzahl im dunklen Kopf) ist mit dem
   Umbau der Ergebnisseite entfallen; ihre Werte stehen jetzt als Kennzahlen
   im Aufklapper „Transmission, Lüftung und Kennwerte". */
function zeile(t, w, ges) {
  return "<tr><td>" + esc(t) + '</td><td class="num">' + fmt(w, 0) + "</td>"
    + '<td class="num">' + fmt(ges ? w / ges * 100 : 0, 1) + "</td></tr>";
}
/* Prüfhinweise unter dem Ergebnis.
 *
 * Hier stand "Keine Auffälligkeiten", sobald der Rechenkern selbst nichts zu
 * melden hatte -- und zwar unabhängig davon, was die Selbstprüfung gefunden
 * hatte. Gemessen an einem echten Fall: 84,8 m² Boden und Dach lieferten 0 W,
 * die Selbstprüfung stand auf rot, und genau darunter stand "Keine
 * Auffälligkeiten". Zwei Aussagen über dieselbe Rechnung, und die
 * beruhigende stand näher am Ergebnis.
 *
 * Der Satz "keine Auffälligkeiten" darf deshalb nur fallen, wenn auch die
 * Selbstprüfung nichts hat. Sonst steht hier, was sie gefunden hat. */
function meldungenHtml(e) {
  const stuecke = (e.warnungen || []).map(function (w) {
    return '<div class="meldung warnung"><span class="sym">i</span><div>' + esc(w) + "</div></div>";
  });
  const pr = App.pruefung;
  const z = (pr && pr.zaehl) || null;
  const fehler = z ? (z.fehler || 0) : 0;
  /* Offen sind Fehler und offene Fragen. Hinweise ordnen vorhandene Werte
     ein und halten nichts auf; damit „keine Auffälligkeiten" trotzdem nicht
     neben vorhandenen Hinweisen steht, bekommen sie eine eigene Zeile. */
  const offen = z ? (z.offen || 0) : 0;
  const hinweise = z ? (z.hinweis || 0) : 0;
  if (fehler || offen) {
    const wort = [];
    if (fehler) wort.push(fehler + (fehler === 1 ? " Fehler" : " Fehler"));
    if (offen) wort.push(offen + (offen === 1 ? " offene Frage" : " offene Fragen"));
    stuecke.unshift('<div class="meldung ' + (fehler ? "fehler" : "warnung") + '">'
      + '<span class="sym">!</span><div>Die Selbstprüfung meldet ' + wort.join(" und ")
      + ". " + (fehler
        ? "Solange ein Fehler offen ist, trägt dieses Ergebnis nicht."
        : "Das Ergebnis ist mit Einschränkung belastbar.")
      + ' <a href="#" data-schritt="pruefung">Zur Selbstprüfung</a></div></div>');
  } else if (hinweise) {
    stuecke.unshift('<div class="meldung hinweis"><span class="sym">i</span><div>'
      + "Die Selbstprüfung ordnet " + mz(hinweise, "Hinweis", "Hinweise")
      + " ein; sie halten die Freigabe nicht auf."
      + ' <a href="#" data-schritt="pruefung">Zur Selbstprüfung</a></div></div>');
  }
  if (!stuecke.length) {
    return '<div class="meldung gut"><span class="sym">OK</span><div>Keine '
      + "Auffälligkeiten, auch nicht in der Selbstprüfung.</div></div>";
  }
  return stuecke.join("");
}

/* --------------------------------------------------------------------------
 * Ergebnis-Panel rechts
 * ----------------------------------------------------------------------- */
function renderPanel() {
  const e = App.ergebnis || {};
  const fehlt = pflichtfelderFehlen();
  if (projektLeer()) {
    $("#panel").innerHTML =
      '<div class="ergebnis" style="background:var(--neutral);color:var(--mute)">'
      + '<h3 style="color:var(--mute)">Gebäudeheizlast</h3>'
      + '<div class="gross" style="color:var(--linie)">–</div>'
      + '<div style="font-size:12.5px;margin-top:8px">Das Ergebnis erscheint hier, '
      + "sobald Räume erfasst sind.</div></div>"
      + ampelKarte()
      + '<div class="panelkarte"><h4>So geht es</h4>'
      + '<ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">'
      + "<li>Unterlagen ablegen — die Analyse startet von selbst</li>"
      + "<li>Rückfragen beantworten</li><li>Ergebnis und Bericht</li></ol></div>";
    return;
  }
  $("#panel").innerHTML =
    '<div class="ergebnis"><h3>Gebäudeheizlast</h3>'
    + '<div class="gross">' + (e.phi_gebaeude ? fmt(e.phi_gebaeude / 1000, 2) : "0,00")
    + " <small>kW</small></div>"
    + '<div class="zeile"><span>Transmission</span><span>' + fmt(e.phi_T_gebaeude || 0, 0) + " W</span></div>"
    + '<div class="zeile"><span>Lüftung</span><span>' + fmt(e.phi_V_gebaeude || 0, 0) + " W</span></div>"
    + (e.phi_RH_gebaeude ? '<div class="zeile"><span>Aufheizung</span><span>'
        + fmt(e.phi_RH_gebaeude, 0) + " W</span></div>" : "")
    + '<div class="zeile"><span>Summe Räume</span><span>' + fmt(e.phi_raeume_summe || 0, 0) + " W</span></div>"
    /* EINE UNMOEGLICHE KENNZAHL WIRD NICHT WIE EINE MOEGLICHE ANGEZEIGT.
       GEMESSEN am 26.08.2026 an "Bauantrag Soethe": im Zwischenstand vor der
       Bauteilbildung stand "spezifisch 549,7 W/m²" -- 2.210 W auf 4,02 m²,
       weil erst ein Raum eine Flaeche trug. Die Zahl stand da wie jede
       andere. Ein Wohngebaeude liegt nach jeder Erfahrung unter rund
       250 W/m²; darueber ist der Bezug unfertig, nicht das Gebaeude
       aussergewoehnlich. Gerechnet wird unveraendert weiter -- die Anzeige
       sagt nur, dass diese Zahl noch nichts bedeutet. */
    + '<div class="zeile"><span>spezifisch</span><span>'
      + fmt(e.spez_gebaeude || 0, 1) + " W/m²</span></div>"
    + (Number(e.spez_gebaeude) > 250
      ? '<div class="zeile"><span class="mini" style="color:#B00020">Bezugsfläche '
        + "noch unvollständig — die spezifische Zahl trägt erst, wenn jeder Raum "
        + "eine Fläche hat.</span></div>"
      : "")
    + "</div>"

    + annahmenLeiste()
    + ampelKarte()
    + (projektLeer()
      ? '<div class="panelkarte"><h4>So geht es</h4>'
        + '<ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">'
        + "<li>Unterlagen ablegen — die Analyse startet von selbst</li>"
        + "<li>Rückfragen beantworten</li><li>Ergebnis und Bericht</li></ol></div>"
      : fehlt.length
      /* Rot heisst: hier ist etwas falsch. Am Anfang ist nur noch nichts
         eingetragen, und das ist kein Fehler, sondern der Anfang. */
      ? '<div class="panelkarte' + (App.p.raeume.length ? " fehler" : " leise") + '">'
        + "<h4>" + (App.p.raeume.length ? "Noch offen" : "Noch einzutragen") + "</h4>"
        + "<ul style=\"margin:0;padding-left:18px\">"
        + fehlt.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul></div>"
      : '<div class="panelkarte leise"><h4>Pflichtangaben</h4>'
        + "Alle liegen vor.</div>")

    + '<div class="panelkarte"><h4>Projekt</h4>'
    + "<b>" + esc(App.p.meta.bezeichnung || "ohne Bezeichnung") + "</b><br>"
    + esc([App.p.meta.plz, App.p.meta.ort].filter(Boolean).join(" ") || "–") + "<br>"
    + '<span class="chip">' + mz(App.p.raeume.length, "Raum", "Räume") + "</span> "
    /* Gezaehlt wird die BIBLIOTHEK, nicht die im Raumbuch verbauten Flaechen.
       GEMESSEN am 25.08.2026 im Haertetest: Hasenberg 10 stand mit "20 Raeume
       6 Bauteile 2 Zonen" da -- bei 38 wirklich angelegten Bauteilen. Wer das
       liest, haelt die Rechnung fuer leer. Die Zahl bleibt, die Beschriftung
       sagt jetzt, was sie zaehlt. */
    + '<span class="chip">' + mz(App.p.bauteiltypen.length, "Bauteiltyp", "Bauteiltypen") + "</span> "
    + '<span class="chip">' + mz(App.p.zonen.length, "Zone", "Zonen") + "</span>"
    + (App.p.klima && App.p.klima.theta_e != null
        ? '<br><span class="chip">θe ' + fmt(App.p.klima.theta_e, 1) + " °C</span>" : "")
    + "</div>"

    + (Object.keys(e.zonen || {}).length
      ? '<div class="panelkarte"><h4>Unbeheizte Bereiche</h4>'
        + Object.keys(e.zonen).map(function (id) {
            const z = App.p.zonen.find((x) => x.id === id) || { name: id };
            return "<div style=\"display:flex;justify-content:space-between\"><span>"
              + esc(z.name) + "</span><b>" + fmt(e.zonen[id], 1) + " °C</b></div>";
          }).join("")
        + "</div>" : "")

    + ((e.warnungen || []).length
      ? '<div class="panelkarte"><h4>Hinweise (' + e.warnungen.length + ")</h4>"
        + e.warnungen.slice(0, 4).map((w) => '<div style="margin-bottom:6px;font-size:12.5px">· '
            + esc(w.length > 130 ? w.slice(0, 130) + "..." : w) + "</div>").join("")
        + (e.warnungen.length > 4 ? '<a href="#" data-schritt="ergebnis">alle anzeigen</a>' : "")
        + "</div>" : "");
}

/** Ist überhaupt schon etwas erfasst? Ein leeres Projekt darf nicht wie ein
 *  fehlerhaftes aussehen; wer das Werkzeug öffnet, hat noch nichts falsch
 *  gemacht. */
function projektLeer() {
  const p = App.p;
  return !p.raeume.length && !p.meta.bezeichnung && !p.bauteiltypen.length
    && !((p.plan && p.plan.bilder) || []).length
    && !((p.plan && p.plan.seiten) || []).length;
}

/** Der kurze Vermerk direkt unter der Zahl: diese kW stehen auf Annahmen.
 *  Er steht bewusst ÜBER der Ampel und unmittelbar unter dem Ergebnis — die
 *  Einschränkung gehört an die Zahl, nicht drei Karten weiter unten. */
function annahmenLeiste() {
  const liste = annahmenListe(App.p);
  /* Die Höhenzeile trägt die Leiste auch allein. Vorher hing sie an dieser
     Liste: standen alle Höhen als gelesen und war sonst nichts angenommen,
     verschwand mit der Liste auch die einzige Stelle, an der die Wirkung der
     Höhe beziffert stand — und das ist die Größe, deren Lesung nachweislich
     nicht wiederholbar ist. */
  const hzeile = hoehenLeistenZeile();
  if ((!liste.length && !hzeile) || !App.p.raeume.length) return "";
  return '<button type="button" class="panelkarte annahme-leiste" data-schritt="projekt">'
    + "<h4>" + ikon("warnung") + " "
    + (liste.length ? "Auf Annahmen gerechnet" : "Woran die Zahl hängt") + "</h4>"
    + liste.map(function (a) {
        return '<div class="annahme-zeile">' + esc(a.kurz) + "</div>";
      }).join("")
    /* Die Annahme mit der groessten Wirkung bekommt ihre Wirkung an dieselbe
       Zeile. "Baujahr 2022 aus dem Plandatum angenommen" ist eine Auskunft;
       erst die Zahl daneben macht daraus eine Entscheidung. */
    + baujahrLeistenZeile()
    + hzeile
    + '<span class="mehr">Annahmen ansehen und ändern' + ikon("pfeil-rechts") + "</span>"
    + "</button>";
}

/** Dieselbe Zeile für die Höhe: was zwanzig Zentimeter ausmachen.
 *  Ohne sie liest sich „Lichte Höhe" wie eine Randnotiz, obwohl die Höhe
 *  linear in Luftvolumen und Wandflächen eingeht. Sie steht jetzt AUCH für
 *  gelesene Höhen: die Lesung derselben Maßkette war am 23.08.2026 zwischen
 *  zwei Läufen derselben Datei nicht wiederholbar — einmal lichte Höhe,
 *  einmal Geschosshöhe. Wer nur die angenommenen Höhen beziffert, lässt genau
 *  die Zahl unbeziffert, die am leichtesten kippt. */
function hoehenLeistenZeile() {
  const r = App.hoehenfaecher;
  if (!r) return "";
  /* Scheitert die Probe, steht das da. Ein leeres Feld sähe aus wie „nichts
     zu melden" — und genau so sah es aus, als die Probe an einem Wurf
     scheiterte und niemand es merkte. */
  if (!r.ok) {
    return '<div class="annahme-zeile">Die Gegenrechnung zur Raumhöhe ist nicht '
      + "durchgelaufen (" + esc(String(r.grund || "Grund unbekannt")) + "). Wie "
      + "stark die Höhe auf das Ergebnis durchschlägt, ist damit hier nicht "
      + "beziffert.</div>";
  }
  if (!(r.faecher || []).length) return "";
  const hoch = r.faecher.filter(function (x) { return x.schritt > 0; })[0];
  if (!hoch) return "";
  const wer = r.alle_gelesen
    ? "die aus dem Plan gelesenen Höhen (" + esc(r.geschosse.join(", ")) + ")"
    : esc(r.geschosse.join(", "));
  return '<div class="annahme-zeile" style="font-weight:600">Wären ' + wer + " "
    + fmt(r.schritt, 2) + " m höher: "
    + fmt(hoch.w / 1000, 2) + " kW statt " + fmt(r.basis_w / 1000, 2) + " kW ("
    + (hoch.abweichung_prozent >= 0 ? "+" : "") + fmt(hoch.abweichung_prozent, 1)
    + " %)</div>";
}

/** Ein Satz mit einer Zahl, direkt neben der grossen Zahl in der Leiste. */
function baujahrLeistenZeile() {
  const r = App.baujahrprobe;
  if (!bjAngenommen() || !r || !r.ok || !(r.stufen || []).length) return "";
  const hoch = r.stufen.reduce(function (a, b) { return b.w > a.w ? b : a; }, r.stufen[0]);
  if (!(hoch.w > r.basis_w)) return "";
  return '<div class="annahme-zeile" style="font-weight:600">Wäre das Gebäude aus '
    + "der Klasse " + esc(hoch.label) + ": " + fmt(hoch.w / 1000, 2) + " kW statt "
    + fmt(r.basis_w / 1000, 2) + " kW ("
    + (hoch.abweichung_prozent >= 0 ? "+" : "") + fmt(hoch.abweichung_prozent, 0)
    + " %)</div>";
}

function ampelKarte() {
  const pr = App.pruefung;
  if (!pr) return "";
  /* Wer gerade Plaene abgelegt hat, hat noch nichts falsch gemacht. Rot heisst
     "die Rechnung traegt nicht"; ohne einen einzigen Raum gibt es keine
     Rechnung, die tragen koennte. */
  if (projektLeer() || !App.p.raeume.length) {
    return '<div class="panelkarte"><h4>Selbstprüfung</h4>'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:13px;height:13px;border-radius:50%;background:var(--linie);'
      + 'flex:0 0 auto"></div><b style="color:var(--mute)">Noch nichts zu prüfen</b></div>'
      + '<div style="font-size:12px;color:var(--mute);margin-top:5px">Sobald Pläne oder '
      + "Räume da sind, prüft das Werkzeug jedes Ergebnis gegen unabhängige "
      + "Erwartungswerte.</div></div>";
  }
  /* Die Ampel ist die wichtigste Aussage der Leiste. Bisher war sie eine weisse
     Karte mit einem farbigen Punkt, waehrend die weniger wichtige Meldung
     "Vollstaendig" gruen hinterlegt war; das Auge las die falsche zuerst.
     Jetzt traegt die Ampelkarte selbst die Farbe ihrer Stufe. */
  const stufe = AMPEL_STUFE[pr.ampel];
  const zeichen = AMPEL_ZEICHEN[pr.ampel];
  const text = AMPEL_KURZ[pr.ampel];
  return '<button type="button" class="panelkarte ampel ' + stufe
    + '" data-schritt="pruefung">'
    + "<h4>Selbstprüfung</h4>"
    + '<span class="lage">' + ikon(zeichen) + "<b>" + text + "</b></span>"
    + '<span class="zaehl">'
    + mz(pr.zaehl.fehler, "Fehler", "Fehler") + " · "
    + (pr.zaehl.offen
      ? mz(pr.zaehl.offen, "offene Frage", "offene Fragen") + " · " : "")
    + mz(pr.zaehl.hinweis, "Hinweis", "Hinweise") + "</span>"
    + '<span class="mehr">Alle Befunde ansehen' + ikon("pfeil-rechts") + "</span></button>";
}

function pflichtfelderFehlen() {
  const f = [];
  const m = App.p.meta, k = App.p.klima;
  if (!m.bezeichnung) f.push("Objektbezeichnung");
  /* Die Postleitzahl fehlt weiterhin — sie steht nur nicht mehr unter „noch
     offen", solange die Klimadaten aus dem Ort angenommen sind. Zweimal
     dasselbe zu melden, einmal als Lücke und einmal als Annahme, macht die
     Annahmenkarte zu einer Wiederholung und die Liste zu einer Aufgabe, die
     das Werkzeug längst erledigt hat. Die Annahme selbst steht als eigener
     Hinweis in der Selbstprüfung und in der Karte darüber, mit Feld. */
  if (!m.plz && !(App.p.annahmen && App.p.annahmen.klima)) f.push("PLZ");
  if (k.theta_e == null || k.theta_e === "") f.push("Norm-Außentemperatur");
  if (!k.quelle) f.push("Quelle der Klimadaten");
  if (!App.p.bauteiltypen.length) f.push("mindestens ein Bauteil");
  if (!App.p.raeume.length) f.push("mindestens ein Raum");
  const ohneWe = App.p.raeume.filter((r) => !r.we).length;
  if (ohneWe) f.push(mz(ohneWe, "Raum", "Räume") + " ohne Einheit");
  /* „Räume ohne Bauteil" stand hier auch für innenliegende Nebenräume, und
     damit stand in der Leiste „Noch offen: 2 Räume ohne Bauteil", während das
     Kontrollblatt dieselben zwei Räume ausdrücklich für richtig erklärte.
     Beurteilt wird die Lage jetzt an einer Stelle, in KERN_ZUORDNUNG. */
  const ohneBt = App.p.raeume.filter(function (r) {
    return !(r.bauteile || []).length && !innenliegendLaut(App.p, r);
  }).length;
  if (ohneBt) f.push(mz(ohneBt, "Raum", "Räume") + " ohne Bauteil");
  return f;
}

/** Ist dieser Raum ein innenliegender Nebenraum ohne Außenwand?
 *  Eine Frage, drei Nutzer: der Rechenkern (dort als Kennzeichen am Raum),
 *  die Pflichtfeldprüfung und das Kontrollblatt. Beantwortet wird sie in
 *  KERN_ZUORDNUNG, damit nicht drei Stellen drei Meinungen haben. */
function innenliegendLaut(p, r) {
  const Z = window.KERN_ZUORDNUNG;
  if (!Z || !Z.innenraumZulaessig) return false;
  const gs = [];
  ((p && p.raeume) || []).forEach(function (x) {
    if (x.geschoss && gs.indexOf(x.geschoss) < 0) gs.push(x.geschoss);
  });
  try { return !!Z.innenraumZulaessig(r, gs).ja; } catch (x) { return false; }
}

/* --------------------------------------------------------------------------
 * Ereignisse
 * ----------------------------------------------------------------------- */
function listeSetzen(liste, i, k, wert) {
  const o = App.p[liste] && App.p[liste][i];
  if (!o) return;
  const numFelder = ["A", "h", "U", "personen", "theta_i", "theta_fest", "zuschlag",
                     "n_min", "f_RH", "V", "breite_m", "tiefe_m", "fenster",
                     "aussenwaende", "f1", "umfang_m", "aussenwand_m", "ecken"];
  o[k] = numFelder.indexOf(k) >= 0 ? (wert === "" ? null : num(wert)) : wert;
  /* Wechselt der unbeheizte Bereich die Lage, darf der Faktor der alten Lage
     nicht stehen bleiben: er gehoerte zu einer anderen Zeile der Norm. Es gilt
     dann wieder die Vorbelegung der neu gewaehlten Lage. */
  if (liste === "zonen" && (k === "lage" || k === "modus")) o.f1 = null;
  /* Sobald jemand die Lage selbst waehlt, ist sie keine Annahme mehr. */
  if (liste === "zonen" && (k === "lage" || k === "modus")) delete o.lage_angenommen;
  /* Sind Breite und Tiefe eingetragen, folgt daraus die Fläche. Sie wird nur
     gesetzt, wenn noch keine da ist; eine im Plan angeschriebene Fläche gilt
     weiter, denn sie ist der bessere Beleg. */
  if (liste === "raeume" && (k === "breite_m" || k === "tiefe_m")) {
    const b = num(o.breite_m, 0), t2 = num(o.tiefe_m, 0);
    const gelesen = o.herkunft && o.herkunft.flaeche_gelesen;
    if (b > 0 && t2 > 0 && !gelesen) {
      o.A = Math.round(b * t2 * 100) / 100;
      if (!o.herkunft) o.herkunft = {};
      o.herkunft.flaeche_quelle = "aus Breite mal Tiefe gerechnet";
    }
  }
}

function grenzSetzen(ziel, v) {
  if (v === "aussen") ziel.grenzt_an = { typ: "aussen" };
  else if (v === "erdreich") ziel.grenzt_an = { typ: "erdreich" };
  else if (v === "fest") ziel.grenzt_an = { typ: "fest", theta: num((ziel.grenzt_an || {}).theta, 15) };
  else if (v.indexOf("zone:") === 0) ziel.grenzt_an = { typ: "zone", ref: v.slice(5) };
  else if (v.indexOf("raum:") === 0) ziel.grenzt_an = { typ: "raum", ref: v.slice(5) };
}

document.addEventListener("input", function (ev) {
  const t = ev.target;
  /* Was die Zahl VOR dieser Eingabe war. Jede Eingabe rechnet sofort neu;
     die Anzeige unten sagt danach, was sich geändert hat — „vorher 6,94 kW,
     jetzt 6,52 kW". Gemerkt wird hier, nicht in rechnen(): rechnen() läuft
     auch beim Laden und beim Blättern, und dort gibt es kein „vorher". */
  const wattVorher = App.ergebnis && !App.ergebnis.fehlerhaft
    ? App.ergebnis.phi_gebaeude : null;
  let neu = false;
  if (t.dataset.pfad) {
    const numPfade = ["klima.theta_e", "klima.theta_e_m", "luftdichtheit.n50",
                      "norm.delta_u_wb", "optionen.f_RH", "meta.wohnflaeche",
                      "meta.deckendicke"];
    setzen(t.dataset.pfad, numPfade.indexOf(t.dataset.pfad) >= 0
      ? (t.value === "" ? null : num(t.value)) : t.value);
    /* Von Hand geändert heißt: der Hinweis auf das Schriftfeld gilt nicht mehr. */
    if (/^meta\./.test(t.dataset.pfad) && App.p.meta_herkunft) {
      delete App.p.meta_herkunft[t.dataset.pfad.slice(5)];
    }
    /* Und eine Annahme, die jemand überschreibt, ist keine mehr. */
    annahmeVerwerfen(t.dataset.pfad);
    /* Angaben zur Person bleiben im Browser, nicht nur in diesem Projekt. */
    if (BEARBEITERFELDER.indexOf(t.dataset.pfad.slice(5)) >= 0) bearbeiterMerken();
  } else if (t.dataset.liste) {
    listeSetzen(t.dataset.liste, +t.dataset.i, t.dataset.k, t.value);
    if (t.dataset.liste === "bauteiltypen" && ["uebergang", "zuschlag"].indexOf(t.dataset.k) >= 0) neu = true;
  } else if (t.dataset.geschosshoehe) {
    if (!App.p.geschosshoehen) App.p.geschosshoehen = {};
    const v = num(t.value, 0);
    if (v > 0) App.p.geschosshoehen[t.dataset.geschosshoehe] = v;
    else delete App.p.geschosshoehen[t.dataset.geschosshoehe];
    hoehenUebernehmen();
    rechnen(); renderPanel();
    neurechnenMelden(wattVorher);
    return;
  } else if (t.dataset.geschossmass) {
    /* Aussenmasse eines Geschosses. Sie gehen in den Umfangsabgleich und von
       dort in die Aussenwandflaeche jedes Raums dieses Geschosses. Damit das
       ankommt, muessen die Bauteile neu gebildet werden; dafuer sorgt der
       Stand je Raum (bauteile_stand.wl), den bauteileErgaenzen vergleicht. */
    const [g, k] = t.dataset.geschossmass.split(":");
    if (!App.p.geschossmasse) App.p.geschossmasse = {};
    const e = App.p.geschossmasse[g] || (App.p.geschossmasse[g] = {});
    const v = num(t.value, 0);
    if (v > 0) e[k] = v; else delete e[k];
    /* DIE FREIWILLIGE QUELLE DARF NICHT VERPUFFEN. Gemessen am 24.08.2026:
       in der Rückfrage zu den Außenwänden steht neben den Maßfeldern
       „Woher stammt die Zahl?" — getippt wurde „am Plan abgezählt", und der
       Text stand danach in keiner Fassung. Die Felder hier laufen über
       data-geschossmass, nicht über data-rf-pfad; nur der rf-Pfad-Weg las
       das Quellenfeld. Jetzt liest ihn auch dieser Weg, und der umgekehrte
       Fall (erst Zahl, dann Quelle) läuft über den rf-quelle-Lauscher. */
    const rfKarte = t.closest("[data-rf-frage]");
    const rfQuelle = rfKarte ? rfKarte.querySelector("[data-rf-quelle]") : null;
    if (rfQuelle && String(rfQuelle.value).trim()) {
      e.quelle = String(rfQuelle.value).trim();
      if (App.masseOhneQuelle) delete App.masseOhneQuelle[g];
    } else if (rfKarte && v > 0) {
      /* Maß ohne Quelle aus einer Rückfragen-Karte: VORMERKEN. Mit dem
         nächsten Rendern verschwindet das beantwortete Feld aus der Karte,
         und eine DANACH getippte Quelle fände es dort nicht mehr. Gemessen
         am 24.08.2026 (Nachprüfung der Abnahme, Ziolkowski): EG 8,00 × 12,50
         eingetragen, dann „am Plan abgezählt" getippt — die Quelle erreichte
         nur noch Geschosse, deren Felder die Karte noch trug, EG blieb ohne.
         quelleNachreichen liest diese Vormerkung. */
      App.masseOhneQuelle = App.masseOhneQuelle || {};
      App.masseOhneQuelle[g] = true;
    }
    if (!(num(e.breite_m, 0) > 0) && !(num(e.tiefe_m, 0) > 0)) {
      delete App.p.geschossmasse[g];
      if (App.masseOhneQuelle) delete App.masseOhneQuelle[g];
    }
    /* Unmittelbar und nicht ueber automatischErgaenzen(): dessen Weiche
       fragt nur, ob sich Raumflaeche oder Raumhoehe geaendert haben. Der
       Geschossumfang steht dort nicht, und ohne diesen Aufruf bliebe das
       eingetragene Mass folgenlos. bauteileErgaenzen entscheidet je Raum
       selbst, ob seine Flaechen ueberholt sind. */
    bauteileErgaenzen();
    automatischErgaenzen();
    rechnen(); renderPanel();
    neurechnenMelden(wattVorher);
    return;
  } else if (t.dataset.schicht) {
    const [i, j] = t.dataset.schicht.split(":").map(Number);
    const s = App.p.bauteiltypen[i].schichten[j];
    if (t.dataset.k === "mat") { s.mat = t.value; s.lambda = null; }
    else s[t.dataset.k] = t.value === "" ? null : num(t.value);
    neu = true;
  } else if (t.dataset.zonebt) {
    const [i, j] = t.dataset.zonebt.split(":").map(Number);
    const b = App.p.zonen[i].huelle[j];
    if (t.dataset.k === "gtyp") { grenzSetzen(b, t.value); neu = true; }
    else if (t.dataset.k === "gtheta") b.grenzt_an.theta = num(t.value);
    else if (t.dataset.k === "name") b.name = t.value;
    else b[t.dataset.k] = num(t.value);
  } else if (t.dataset.rbt) {
    const [i, j] = t.dataset.rbt.split(":").map(Number);
    const b = App.p.raeume[i].bauteile[j];
    if (t.dataset.k === "grenz") { grenzSetzen(b, t.value); neu = true; }
    else if (t.dataset.k === "gtheta") b.grenzt_an.theta = num(t.value);
    else if (t.dataset.k === "typ_id") {
      b.typ_id = t.value;
      const ty = typFinden(t.value);
      if (ty) { b.name = ty.name; b.kat = ty.kat_default; }
      neu = true;
    } else {
      b[t.dataset.k] = num(t.value);
      /* Wer eine automatisch gebildete Fläche von Hand ändert, hat sie
         geprüft. Ab da gehört sie ihm, und keine spätere Änderung der
         Raumhöhe bildet sie neu. */
      if (t.dataset.k === "A") b.automatisch = false;
    }
  } else return;

  /* Postleitzahl und Baujahr sind die beiden Angaben, aus denen das Werkzeug
     selbst weiterrechnet: die eine holt den Klimadatensatz, die andere legt die
     Bauteile aus der Typologie an. Beides muss sofort sichtbar werden, sonst
     tippt man das Baujahr ein und es geschieht nichts.
     Neu gezeichnet wird erst, wenn die Angabe vollstaendig ist; bei jedem
     Tastendruck waere "19" ein Baujahr und "3" eine Postleitzahl. Der Fokus
     bleibt dabei erhalten, dafuer sorgt fokusMerken(). */
  if (t.dataset.pfad === "meta.plz" && String(t.value).replace(/\D/g, "").length >= 5) {
    /* Eine eingetragene Postleitzahl schlägt die Ortsannahme. Ohne das
       bliebe die angenommene Norm-Außentemperatur stehen, weil das
       Ergänzen nur in ein leeres Feld schreibt — man tippt die PLZ ein und
       es ändert sich nichts. */
    if (App.p.annahmen && App.p.annahmen.klima) {
      annahmeVerwerfen("klima.theta_e");
      App.p.klima.theta_e = null; App.p.klima.theta_e_m = null; App.p.klima.quelle = "";
    }
    neu = true;
  }
  if (t.dataset.pfad === "meta.baujahr" && String(t.value).replace(/\D/g, "").length >= 4) neu = true;
  if (t.dataset.pfad === "meta.deckendicke") { hoehenUebernehmen(); neu = true; }
  if (neu || t.dataset.neurender) render(); else { rechnen(); renderPanel(); aktualisiereLive(); }
  neurechnenMelden(wattVorher);
});

/* --------------------------------------------------------------------------
 * Die Neurechnen-Anzeige: eine Änderung rechnet sofort neu und SAGT es
 * --------------------------------------------------------------------------
 * Wer im Ergebnis einen U-Wert ändert, sieht die Zahl oben umspringen — oder
 * auch nicht, wenn sie gerade nicht im Bild steht. Diese Zeile sagt es an
 * Ort und Stelle: „vorher 6,94 kW, jetzt 6,52 kW (−0,42 kW)". Sie ist ein
 * eigenes, festes Element und kein Teil des neu gezeichneten Inhalts, damit
 * sie das Tippen nicht unterbricht; role="status" liest sie auch vor.
 * ----------------------------------------------------------------------- */
let neurechnenUhr = null;
function neurechnenMelden(vorherW) {
  const e = App.ergebnis;
  const jetztW = e && !e.fehlerhaft ? e.phi_gebaeude : null;
  if (vorherW == null || jetztW == null) return;
  /* Unter 5 W ändert sich an „6,94 kW" nichts Ablesbares; eine Meldung
     „vorher 6,94, jetzt 6,94" wäre Lärm. */
  if (Math.abs(jetztW - vorherW) < 5) return;
  let el = document.getElementById("neurechnen");
  if (!el) {
    el = document.createElement("div");
    el.id = "neurechnen";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  const d = (jetztW - vorherW) / 1000;
  el.innerHTML = "Neu gerechnet: vorher <b>" + fmt(vorherW / 1000, 2)
    + " kW</b>, jetzt <b>" + fmt(jetztW / 1000, 2) + " kW</b> ("
    + (d >= 0 ? "+" : "−") + fmt(Math.abs(d), 2) + " kW)";
  el.classList.add("sichtbar");
  clearTimeout(neurechnenUhr);
  neurechnenUhr = setTimeout(function () { el.classList.remove("sichtbar"); }, 6000);
}

document.addEventListener("change", function (ev) {
  const t = ev.target;
  if (t.tagName === "SELECT" && (t.dataset.pfad || t.dataset.liste || t.dataset.rbt
      || t.dataset.zonebt || t.dataset.schicht)) {
    ev.target.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

/* Die Wertfelder der Rückfragen. Sie schreiben über DENSELBEN Weg zurück wie
   das Kontrollblatt (MODUL_KONTROLLBLATT.schreiben: Zahl prüfen, Herkunft
   protokollieren, Konfidenz nur mit Quellentext anheben) — hier entsteht
   keine zweite Datenhaltung, nur ein zweiter Ort für dasselbe Feld. Die
   freiwillige Quelle steht in der Fragekarte daneben. */
/* Ein Wertfeld AUS EINER RÜCKFRAGE zeichnet die Liste neu. Der
   Eingabeverteiler oben schreibt den Wert und rechnet nach, zeichnet aber
   nur die Seitenleiste — die beantwortete Sperre bliebe sonst als Frage
   stehen, und genau das war der zweite Teil des Befunds „Ablehnen führt in
   eine Sackgasse". Ausgelöst wird auf change (Verlassen des Feldes), nicht
   auf jeden Tastendruck; sonst springt die Schreibmarke. */
document.addEventListener("change", function (ev) {
  const t = ev.target;
  if (!t.dataset || t.dataset.rfRender === undefined) return;
  render();
});

document.addEventListener("change", function (ev) {
  const t = ev.target;
  if (!t.dataset || !t.dataset.rfPfad) return;
  const KB = window.MODUL_KONTROLLBLATT;
  if (!KB) return;
  const karte = t.closest("[data-rf-frage]");
  const q = karte ? karte.querySelector("[data-rf-quelle]") : null;
  const r = KB.schreiben(App.p, t.dataset.rfPfad, t.value, q ? q.value : "");
  if (!r.ok) { sagen(r.grund, { stufe: "warnung" }); return; }
  render();
});

/* Das Quellenfeld selbst. Der Bearbeiter tippt in aller Regel ERST die Zahl
   und DANN die Quelle — bis zum 24.08.2026 war die Quelle damit verloren:
   der Wert war längst geschrieben (mit leerer Quelle), und das Quellenfeld
   löste nichts mehr aus. Gemessen an den Außenmaßen: „am Plan abgezählt"
   stand in keiner Fassung. Jetzt reicht die Quelle nach — an jeden schon
   geschriebenen rf-Pfad der Karte und an die Außenmaße des Geschosses. */
/** Reicht eine nachgetippte Quelle an Außenmaße nach, deren Felder die
 *  Rückfragen-Karte nicht mehr trägt.
 *
 *  WARUM: Ein beantwortetes Maßfeld verschwindet mit dem nächsten Rendern
 *  aus der Karte. Der Lauscher unten läuft aber über die Felder der Karte —
 *  eine Quelle, die NACH der letzten Antwort getippt wird, erreichte damit
 *  genau die Geschosse nicht mehr, für die sie gedacht war (nachgeprüft am
 *  24.08.2026 am Ziolkowski-Ablauf des Prüfers: erst EG 8,00 × 12,50,
 *  dann „am Plan abgezählt" — EG blieb ohne Quelle). Deshalb merkt sich der
 *  Eingabeverteiler jedes aus einer Rückfragen-Karte getippte Maß OHNE
 *  Quelle (App.masseOhneQuelle), und hier wird die Quelle dort nachgereicht.
 *  Eine schon vorhandene, ANDERE Quelle wird nie überschrieben — die
 *  Vormerkung entsteht nur, wo keine Quelle stand. */
function quelleNachreichen(p, quelle) {
  const merk = App.masseOhneQuelle || {};
  let n = 0;
  Object.keys(merk).forEach(function (g) {
    const e = (p.geschossmasse || {})[g];
    if (e && (num(e.breite_m, 0) > 0 || num(e.tiefe_m, 0) > 0) && !e.quelle) {
      e.quelle = quelle;
      n++;
    }
  });
  App.masseOhneQuelle = {};
  return n;
}

document.addEventListener("change", function (ev) {
  const t = ev.target;
  if (!t.dataset || t.dataset.rfQuelle === undefined) return;
  const quelle = String(t.value || "").trim();
  if (!quelle) return;
  const karte = t.closest("[data-rf-frage]");
  if (!karte) return;
  const KB = window.MODUL_KONTROLLBLATT;
  let etwas = false;
  $$("[data-rf-pfad]", karte).forEach(function (inp) {
    if (String(inp.value || "").trim() === "" || !KB) return;
    const r = KB.schreiben(App.p, inp.dataset.rfPfad, inp.value, quelle);
    if (r.ok) etwas = true;
  });
  let masseNeu = false;
  $$("[data-geschossmass]", karte).forEach(function (inp) {
    const g = String(inp.dataset.geschossmass).split(":")[0];
    const e = (App.p.geschossmasse || {})[g];
    if (e && (num(e.breite_m, 0) > 0 || num(e.tiefe_m, 0) > 0)
        && e.quelle !== quelle) {
      e.quelle = quelle;
      masseNeu = true;
    }
  });
  if (quelleNachreichen(App.p, quelle) > 0) masseNeu = true;
  if (masseNeu) {
    /* Die Quelle steht im Herkunftstext der Außenwandflächen; damit der neu
       entsteht, müssen die betroffenen Bauteile neu gebildet werden. */
    bauteileErgaenzen();
    etwas = true;
  }
  if (etwas) { rechnen(); renderPanel(); }
});

/* Höhen- und Maßfelder: WÄHREND des Tippens rechnet der Eingabeverteiler nur
   still nach (renderPanel), damit das Feld nicht unter der Schreibmarke
   verschwindet. SOBALD die Eingabe fertig ist (change: Feld verlassen oder
   Enter), muss die Fragenliste neu entstehen — sonst steht die beantwortete
   Frage samt altem Zähler weiter da, bis jemand navigiert (Abnahme-Befund
   vom 24.08.2026). */
document.addEventListener("change", function (ev) {
  const t = ev.target;
  if (!t.dataset) return;
  if (t.dataset.geschosshoehe !== undefined
      || t.dataset.geschossmass !== undefined) {
    render();
  }
});

/** Aktualisiert die berechneten Zellen, ohne die Eingabefelder neu zu bauen */
function aktualisiereLive() {
  const e = App.ergebnis || { raeume: [] };
  const erg = {};
  (e.raeume || []).forEach((r) => { erg[r.id] = r; });
  $$("#inhalt table.tab tbody tr").forEach(function (tr) {
    const inp = tr.querySelector("[data-liste=raeume]");
    if (!inp) return;
    const r = App.p.raeume[+inp.dataset.i];
    const x = r && erg[r.id];
    if (!x) return;
    const tds = tr.querySelectorAll("td.num");
    if (tds[0]) tds[0].textContent = fmt(x.phi_raum, 0);
    if (tds[1]) tds[1].textContent = fmt(x.spez, 0);
  });
}

document.addEventListener("click", function (ev) {
  const a = ev.target.closest("[data-aktion]");
  const s = ev.target.closest("[data-schritt]");
  if (s) {
    ev.preventDefault();
    App.schritt = s.dataset.schritt;
    /* Der Expertenmodus muss wissen, wohin „Zurück zum Ablauf" fuehrt. */
    if (SCHRITTE.some(function (x) { return x.id === App.schritt; })) {
      App.hauptZuletzt = App.schritt;
    }
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (!a) return;
  ev.preventDefault();
  const i = a.dataset.i !== undefined ? +a.dataset.i : null;
  const ij = a.dataset.ij ? a.dataset.ij.split(":").map(Number) : null;

  switch (a.dataset.aktion) {
    case "bearbeiterVergessen":
      /* Die Rueckfrage laeuft neben der Seite her; der Klickverteiler ist
         durch, bevor sie beantwortet ist. Was danach zu tun ist, steht
         deshalb im .then() — samt render(). */
      fragen({ titel: "Angaben zur Person löschen?",
        text: "Unterzeichner, Funktion, Nummer in der "
          + "Energieeffizienz-Expertenliste und Ausstellungsort werden aus "
          + "diesem Browser geleert.",
        jaText: "Löschen", neinText: "Behalten" }).then(function (ja) {
        if (!ja) return;
        bearbeiterVergessen();
        render();
        sagen("Die gemerkten Angaben zur Person sind gelöscht.", { stufe: "gut" });
      });
      break;
    case "klimaUebernehmen": {
      const o = DK.findePlz(App.p.meta.plz);
      if (o) {
        App.p.klima.theta_e = o.theta_e;
        App.p.klima.theta_e_m = o.theta_e_m;
        App.p.klima.quelle = o.quelle;
        if (!App.p.meta.ort) App.p.meta.ort = o.ort;
      }
      break;
    }
    case "stempelUebernehmen": {
      /* Der Vollzug bleibt, wo der Klick war: auf dem Unterlagen-Schritt.
         Bis zum 24.08.2026 sprang der Knopf wortlos ins Experten-Raumbuch
         (App.schritt = "raeume") — mitten aus dem Normalablauf heraus. Das
         Urteil auf demselben Bildschirm zeigt die übernommenen Räume sofort;
         gesagt wird zusätzlich, was geschah, samt dem Fall „alles war schon
         aus der Analyse da". */
      const n = raeumeAusStempelnUebernehmen(i);
      if (n > 0) {
        const u = App.uebernahme || {};
        const neu = u.neu || 0, ers = u.ersetzt || 0;
        sagen(neu && ers
            ? mz(neu, "Raum", "Räume") + " neu übernommen, "
              + mz(ers, "Raum war", "Räume waren") + " schon aus der Analyse "
              + "im Raumbuch — dort wurde nur die im Plan angeschriebene "
              + "Fläche nachgezogen, nichts doppelt."
            : ers
            ? "Alle " + mz(ers, "Raum stand", "Räume standen") + " schon aus "
              + "der Analyse im Raumbuch. Übernommen wurde nur die im Plan "
              + "angeschriebene Fläche — nichts doppelt."
            : mz(neu, "Raum", "Räume") + " aus den angeschriebenen "
              + "Flächenstempeln übernommen.",
          { stufe: "gut", titel: "Räume übernommen" });
      } else {
        sagen("Auf diesem Blatt steht keine Raumfläche als Text.", { stufe: "warnung" });
      }
      break;
    }
    case "einheitNeu":
      App.p.einheiten.push({ id: uid("we"), name: "WE " + (App.p.einheiten.length + 1), personen: 2 });
      break;
    case "einheitWeg": App.p.einheiten.splice(i, 1); break;

    case "typologieUebernehmen": {
      const t = DT && DT.zumBaujahr(App.p.meta.baujahr, App.p.meta.gebaeudeart);
      if (!t) { sagen("Kein Baujahr eingetragen.", { stufe: "warnung" }); break; }
      /* Dieselbe Liste wie beim selbsttätigen Ergänzen — aus DATEN_TYPOLOGIE,
         nicht ein zweites Mal hier aufgeschrieben. Der Abbruch hing bis zum
         24.08.2026 an t.gilt und traf damit jeden Neubau ab 2023, obwohl es
         für den inzwischen Startwerte gibt. Abgebrochen wird jetzt nur noch,
         wenn WIRKLICH keine da sind. */
      const neu = DT.startwerte ? DT.startwerte(t) : [];
      if (!neu.length) {
        sagen(t.fundstelle_startwerte || t.fundstelle, { stufe: "warnung" });
        break;
      }
      let gesetzt = 0, ergaenzt = 0;
      neu.forEach(function (x) {
        const vorhanden = App.p.bauteiltypen.find((b) => b.typologie && b.name === x.name);
        if (vorhanden) {
          vorhanden.U = x.U; vorhanden.quelle = x.quelle;
          vorhanden.ersatzwert = x.ersatz || false; gesetzt++;
        } else {
          App.p.bauteiltypen.push({ id: uid("bt"), name: x.name, U: x.U,
            kat_default: x.kat, schichten: [], belegt: false, typologie: true,
            quelle: x.quelle, ersatzwert: x.ersatz || false });
          ergaenzt++;
        }
      });
      sagen((t.startquelle === "neubau_referenz"
          ? "Das sind die Anforderungswerte des gesetzlichen Referenzgebäudes, "
            + "also Obergrenzen und keine Objektwerte. Ein Neubau ist in aller "
            + "Regel besser; die Heizlast fällt damit eher zu hoch aus."
          : t.startquelle === "rueckfall_efh"
          ? "Das sind Rückfallwerte aus der Wohngebäudetypologie, ersatzweise "
            + "für ein Nichtwohngebäude angesetzt. Sie sind keine Objektwerte "
            + "und auch keine Fundstelle für ein Nichtwohngebäude."
          : "Das sind Startwerte typischer Gebäude dieser Baualtersklasse, "
            + "keine Objektwerte.")
        + " Sie erscheinen im Bericht als Annahme, bis sie am Objekt "
        + "bestätigt oder durch einen Schichtaufbau ersetzt sind.",
        { stufe: "warnung",
          titel: mz(ergaenzt, "Bauteil", "Bauteile") + " angelegt"
            + (gesetzt ? ", " + gesetzt + " aktualisiert" : "") });
      App.schritt = "bauteile";
      break;
    }
    case "sicherungWeiter":
      if (App.sicherungAngebot) {
        /* Wer den wiedergefundenen Stand ausdrücklich übernimmt, darf ihn
           künftig auch überschreiben — der Zwei-Tab-Wächter in sichern()
           vergleicht gegen diesen Zeitpunkt. */
        sicherungBekannterStand = Date.parse(App.sicherungAngebot.stand)
          || Date.now();
        App.p = Object.assign(leeresProjekt(), App.sicherungAngebot.projekt);
        /* Weitergearbeitet wird im Hauptlauf: bei den Rückfragen, nicht im
           Kontrollblatt — das lebt im Expertenmodus weiter. */
        App.schritt = App.p.raeume.length ? "rueckfragen" : "start";
        App.rueckfrageIndex = 0;
        App.sicherungAngebot = null;
        /* Der Stand ist jetzt die Arbeit dieses Reiters; die beiseitegelegte
           Zweitkopie hat damit keinen Zweck mehr und würde nur eine zweite
           Fassung desselben Projekts zum Zurückholen anbieten. */
        App.sicherungBeiseite = null;
        try { localStorage.removeItem(SICHERUNG_BEISEITE); } catch (e) {}
      }
      break;
    case "sicherungZurueckholen":
      sicherungZurueckholen();
      break;
    case "sicherungVerwerfen":
      if (App.sicherungAngebot) {
        fragen({ titel: "Wiedergefundenen Stand verwerfen?",
          text: "Der wiedergefundene Stand wird gelöscht und ist danach nicht "
            + "mehr zu holen.",
          jaText: "Verwerfen", neinText: "Behalten" }).then(function (ja) {
          if (!ja || !App.sicherungAngebot) return;
          App.sicherungAngebot = null;
          App.sicherungBeiseite = null;
          try { localStorage.removeItem(SICHERUNG); } catch (e) {}
          /* Auch der beiseitegelegte Platz wird geräumt — sonst stünde der
             eben verworfene Stand über die Zeile wieder zum Zurückholen da. */
          try { localStorage.removeItem(SICHERUNG_BEISEITE); } catch (e) {}
          Sicherungsstand.steht = false;
          render();
        });
      }
      break;
    case "detailUmschalten": App.detailOffen = !App.detailOffen; break;
    /* Rückfragen: eine Frage nach der anderen. Der Zeiger läuft über die
       LEBENDE Liste; beantwortete Fragen fallen beim Neuzeichnen von selbst
       heraus, der Zeiger bleibt an Ort und Stelle. */
    case "rueckfrageWeiter": App.rueckfrageIndex = (App.rueckfrageIndex || 0) + 1; break;
    case "rueckfrageZurueck": App.rueckfrageIndex = Math.max(0, (App.rueckfrageIndex || 0) - 1); break;
    case "rueckfrageZu": App.rueckfrageIndex = Math.max(0, num(a.dataset.rfI, 0)); break;
    /* „Passt so": die Antwort landet, wo sie heute schon landet — als
       Kenntnisnahme der Zeile über MODUL_KONTROLLBLATT.zurKenntnis, mit
       Name und Zeitpunkt im Bericht. Ein Bündel (eine Ursache, mehrere
       Zeilen) wird zeilenweise bestätigt; die interne Sicht behält jede
       Einzelzeile. */
    case "rueckfrageKenntnis": {
      const KB = window.MODUL_KONTROLLBLATT;
      const ids = String(a.dataset.rfIds || "").split(",").filter(Boolean);
      if (!KB || !ids.length) break;
      ids.forEach(function (id) { KB.zurKenntnis(App.p, id, ""); });
      sagen(mz(ids.length, "Punkt", "Punkte") + " zur Kenntnis genommen — "
        + "rückgängig geht das im Kontrollblatt (Feineinstellung).",
        { stufe: "gut" });
      break;
    }
    /* „Im Plan anzeigen" springt ins Prüfblatt und wählt dort die Marke des
       ersten Raums im betroffenen Geschoss vor — derselbe Bildschirm, den
       auch die Feineinstellung zeigt. */
    case "rueckfragePlan": {
      const PB = window.MODUL_PRUEFBLATT;
      const g = a.dataset.rfGeschoss;
      if (PB && PB.zustand && g) {
        const r = App.p.raeume.find(function (x) { return x.geschoss === g; });
        if (r) PB.zustand.gewaehlt = r.id;
      }
      App.schritt = "pruefblatt";
      window.scrollTo(0, 0);
      break;
    }
    /* „Alle der einen Einheit zuordnen" ist seit dem 26.08.2026 ein
       VORSCHLAG (vorschlagWe) und kein Sonderknopf mehr: derselbe Weg über
       MODUL_KONTROLLBLATT.schreiben, aber mit Herkunft, Wirkung und einem
       gleichwertigen „Ablehnen" daneben. Der eigene Verteilereintrag ist
       damit entfallen — er wurde von keinem Knopf mehr genannt.

    /* Ein-Klick aus der Rückfrage „Raumfläche fehlt": die Zeile ist kein
       Raum (mitgelesene Beschriftung, Planungsnotiz) und geht aus dem
       Raumbuch — mit Vermerk in den offenen Fragen, nie still. */
    case "rueckfrageRaumEntfernen": {
      const rid = a.dataset.raumId;
      const k = App.p.raeume.findIndex(function (r) { return String(r.id) === rid; });
      if (k < 0) break;
      const r = App.p.raeume[k];
      const nam = (r.geschoss ? r.geschoss + " " : "") + (r.name || "Raum");
      App.p.raeume.splice(k, 1);
      App.p.offeneFragen = App.p.offeneFragen || [];
      App.p.offeneFragen.push({ thema: "Vom Bearbeiter entfernt",
        blatt: (r.herkunft && r.herkunft.blatt) || "",
        frage: "„" + nam + "“ stand ohne Grundfläche im Raumbuch"
          + (r.herkunft && r.herkunft.blatt ? " (gelesen von „"
            + r.herkunft.blatt + "“)" : "")
          + " und wurde vom Bearbeiter als Nicht-Raum entfernt." });
      sagen("„" + nam + "“ entfernt — der Vermerk steht in den offenen "
        + "Fragen der internen Fassung.", { stufe: "gut" });
      break;
    }
    /* „Gibt es Abweichungen von den üblichen Ansätzen?" — Nein wird mit Name
       und Zeitpunkt gemerkt und wandert mit dem Projekt; derselbe Klick
       nimmt es zurück. */
    case "rueckfrageStandard": {
      App.p.standard_ok = App.p.standard_ok ? null : {
        zeit: ortszeitStempel(),
        wer: String((App.p.meta && App.p.meta.bearbeiter) || "").trim(),
      };
      break;
    }
    /* ------------------------------------------------------------------
       DIE VORSCHLAGSPFLICHT — annehmen und ablehnen, beides ein Klick.
       ------------------------------------------------------------------ */
    case "vorschlagUebernehmen": {
      const f = vorschlagFrage(a.dataset.vorschlag);
      const v = f && f.vorschlag;
      if (!v || typeof v.anwenden !== "function") break;
      if (vorschlagAbgelehnt(App.p, v.id)) break;      // abgelehnt bleibt abgelehnt
      let erg;
      try { erg = v.anwenden(App.p, false); }
      catch (e) { erg = { ok: false, text: String((e && e.message) || e) }; }
      /* WAS ÜBERNOMMEN WURDE, STEHT IM PROJEKT — mit Wert, Herkunft, Zeit
         und Bearbeiter. Ein Vorschlag, der still zur Zahl wird, wäre
         genau die erfundene Zahl, die es hier nicht geben darf. */
      App.p.vorschlaege_uebernommen = App.p.vorschlaege_uebernommen || {};
      App.p.vorschlaege_uebernommen[v.id] = {
        wert: v.wert, herkunft: v.herkunft,
        zeit: ortszeitStempel(),
        wer: String((App.p.meta && App.p.meta.bearbeiter) || "").trim(),
      };
      /* WAS DER VORSCHLAG WIRKLICH BEWIRKT HAT — nachgerechnet, nicht
         behauptet.
         Bis zum 26.08.2026 endete das Übernehmen mit einer Erfolgsmeldung,
         die aus dem anwenden() stammte („1 Geschoss mit den abgelesenen
         Außenmaßen belegt"). Ob danach eine einzige Zahl anders war, hat
         niemand geprüft. GEMESSEN an vier Blattsätzen: Außenwände von
         66,27 m auf 77,08 m übernommen, Transmission davor und danach exakt
         8.700 W. Der Bearbeiter klickte, las „übernommen" und rechnete mit
         der alten Zahl weiter.
         Jetzt wird der Weg des Handeintrags gegangen — ergänzen, rechnen —
         und die Meldung nennt die Wirkung in Watt. Ändert sich nichts, sagt
         sie GENAU DAS, statt einen Erfolg zu melden, den es nicht gab. */
      const wattVorherV = App.ergebnis && !App.ergebnis.fehlerhaft
        ? num(App.ergebnis.phi_gebaeude, null) : null;
      if (!(erg && erg.ok === false)) {
        try { automatischErgaenzen(); } catch (e2) {}
        try { rechnen(); } catch (e2) {}
      }
      const wattNachherV = App.ergebnis && !App.ergebnis.fehlerhaft
        ? num(App.ergebnis.phi_gebaeude, null) : null;
      const dWatt = (wattVorherV != null && wattNachherV != null)
        ? wattNachherV - wattVorherV : null;
      const wirkung = (erg && erg.ok === false) ? ""
        : dWatt == null ? ""
          : Math.abs(dWatt) < 1
            ? " An der Rechnung ändert sich dadurch nichts: die Heizlast "
              + "steht vor und nach dem Übernehmen auf "
              + fmt(num(wattNachherV, 0) / 1000, 2) + " kW. Die Angabe steht "
              + "jetzt im Projekt und im Bericht; wo sie nicht ankommt, "
              + "bleibt die Frage offen."
            : " Die Heizlast ändert sich dadurch um "
              + (dWatt > 0 ? "+" : "−") + fmt(Math.abs(dWatt), 0) + " W auf "
              + fmt(num(wattNachherV, 0) / 1000, 2) + " kW.";
      sagen(((erg && erg.text) || "Vorschlag übernommen.") + wirkung,
        { stufe: erg && erg.ok === false ? "hinweis" : "gut",
          titel: erg && erg.ok === false ? "Nicht übernommen" : "Vorschlag übernommen" });
      break;
    }
    /* ABLEHNEN IST EIN KLICK, genau wie Annehmen — keine Rückfrage, kein
       zweiter Dialog. Danach erscheint das Eingabefeld, und derselbe
       Vorschlag kommt nicht wieder (Regel 5). */
    case "vorschlagAblehnen": {
      const f = vorschlagFrage(a.dataset.vorschlag);
      const v = f && f.vorschlag;
      if (!v || v.art === "ohne") break;
      App.p.vorschlaege_abgelehnt = App.p.vorschlaege_abgelehnt || {};
      App.p.vorschlaege_abgelehnt[v.id] = {
        wert: v.wert, herkunft: v.herkunft,
        zeit: ortszeitStempel(),
        wer: String((App.p.meta && App.p.meta.bearbeiter) || "").trim(),
      };
      sagen("Vorschlag abgelehnt — er wird nicht wieder vorgeschlagen; "
        + antwortweg(f), { stufe: "gut" });
      break;
    }
    /* Eine Ablehnung ist kein Urteil auf ewig: wer sie zurücknimmt,
       bekommt den Vorschlag wieder. Sonst wäre ein Fehlklick endgültig. */
    case "vorschlagZurueckholen": {
      const f = vorschlagFrage(a.dataset.vorschlag);
      const v = f && f.vorschlag;
      if (!v || !App.p.vorschlaege_abgelehnt) break;
      delete App.p.vorschlaege_abgelehnt[v.id];
      break;
    }
    /* Der Höhenvorschlag läuft seit dem 26.08.2026 über vorschlagHoehe()
       und den allgemeinen Vorschlagsblock: derselbe Schutz gegen das
       Überschreiben einer Eingabe (hoehenVorschlaegeUebernehmen), dieselbe
       Kenntnisnahme der Annahmenzeile — dazu Herkunft, Wirkung und ein
       gleichwertiges „Ablehnen". Der eigene Verteilereintrag entfiel.

    /* Der Weg aus dem roten Urteil: dieselbe Dateiauswahl wie die Ablage. */
    case "ablageOeffnen": {
      const eingabe = $("#planDateien");
      if (eingabe) eingabe.click();
      return;
    }
    /* Derselbe Weg wie der Knopf im Blattkopf. Der Schritt heisst "Ergebnis
       und Bericht"; ohne diesen Knopf endete er, ohne den Bericht anzubieten. */
    case "bericht":
      if (window.MODUL_BERICHT) window.MODUL_BERICHT.erzeugen({ fassung: "druck" });
      return;
    case "berichtIntern":
      if (window.MODUL_BERICHT) window.MODUL_BERICHT.erzeugen({ fassung: "intern" });
      return;
    case "stapelAuswerten": stapelAuswerten(); return;
    case "bauteileErzeugen": bauteileErzeugen(); return;
    case "massstabSetzen": {
      const seite = ((App.p.plan && App.p.plan.seiten) || [])[i];
      if (!seite) break;
      /* Bei einer Unterlage mit bekannter Blattgröße genügt der Nenner: aus
         Blattmaß und Nenner folgt die Länge je Bildpunkt unmittelbar. Bei
         einem Foto oder Bildschirmfoto ist die Blattgröße unbekannt, dann
         hilft nur das Messen an einer Maßkette im Bild.
         Die Kette Rückfrage → Eingabe → Rückfrage lief bis zum 23.08.2026
         über confirm/prompt/confirm und hielt dabei den ganzen Tab an. Sie
         läuft jetzt als Kette von Zusagen neben der Seite her. */
      if (!(seite.breite_mm > 0)) {
        fragen({ titel: "Blattgröße unbekannt",
          text: "Für diese Unterlage ist die Blattgröße unbekannt, weil es ein "
            + "Bild und kein Dokument ist. Der Maßstab lässt sich dann nicht aus "
            + "einer Zahl ableiten, sondern nur an einer Maßkette im Plan messen.",
          jaText: "Zum Messen wechseln", neinText: "Abbrechen" }).then(function (ja) {
          if (!ja) return;
          massstabMessenOeffnen(i);
          render();
        });
        break;
      }
      eingabe({ titel: "Maßstab dieser Zeichnung",
        text: "Nur den Nenner eintragen, also 100 für 1:100. Er steht "
          + "üblicherweise im Schriftfeld unten rechts.\n\nBlattgröße: "
          + fmt(seite.breite_mm, 0) + " mal " + fmt(seite.hoehe_mm, 0) + " mm"
          + (seite.format ? " (" + seite.format + ")" : ""),
        wert: String(m_nenner_vorschlag(seite) || ""), mehrzeilig: false,
        feldname: "Nenner des Maßstabs", jaText: "Übernehmen" }).then(function (ein) {
        if (ein === null) return;
        const n = num(String(ein).replace(/^1\s*:\s*/, ""), 0);
        if (!(n > 0)) {
          sagen("Bitte eine Zahl eintragen, etwa 100 für 1:100.", { stufe: "warnung" });
          return;
        }
        const weiter = (n < 10 || n > 5000)
          ? fragen({ titel: "Ungewöhnlicher Maßstab",
              text: "1:" + n + " ist ein ungewöhnlicher Maßstab. Trotzdem übernehmen?",
              jaText: "Übernehmen", neinText: "Abbrechen" })
          : Promise.resolve(true);
        weiter.then(function (ja) {
          if (!ja) return;
          seite.massstab = Object.assign({}, seite.massstab, {
            nenner: n, guete: "belegt",
            quelle: "vom Bearbeiter eingetragen",
            px_je_meter: null,
          });
          render();
          sagen("Maßstab 1:" + n + " übernommen.", { stufe: "gut" });
        });
      });
      break;
    }
    case "massstabMessen": massstabMessenOeffnen(i); break;
    case "planWeg":
      if (App.p.plan && App.p.plan.seiten) App.p.plan.seiten.splice(i, 1);
      break;
    case "berichtSchliessen":
      App.ausleseBericht = null;
      break;
    case "blattNochmal": {
      /* Ein Blatt, das als "kein Grundriss" eingestuft wurde oder bei dem der
         Zuschnitt nichts brachte, laesst sich hier ein zweites Mal lesen --
         diesmal feldweise und mit dem ausdruecklichen Hinweis, dass ein
         Grundriss erwartet wird. Das ist die Stelle, an der der Bearbeiter das
         Urteil des Modells umstossen kann, und er sieht vorher, was es
         kostet. */
      const seiten = (App.p.plan && App.p.plan.seiten) || [];
      const x = seiten[i];
      if (!x) break;
      x.ausgewertet = false;
      x.uebernommen = false;
      x.istGrundriss = undefined;
      x.nochmalAlsGrundriss = true;
      stapelAuswerten();
      break;
    }
    case "ausleseAbbrechen":
      if (App.auslese) {
        App.auslese.abbrechen = true;
        App.auslese.was = "Wird abgebrochen…";
      }
      /* Die Merkzahl allein wirkte erst NACH dem laufenden Blatt -- und
         genau dieses Blatt kostet gerade Geld und Wartezeit. Der offene
         Aufruf wird deshalb sofort beendet. */
      if (window.MODUL_KI && window.MODUL_KI.abbrechen) window.MODUL_KI.abbrechen();
      break;
    case "bauteilNeu":
      App.p.bauteiltypen.push({ id: uid("bt"), name: "Neues Bauteil", U: 1.0,
        kat_default: "huelle", schichten: [], uebergang: "wand_aussen", zuschlag: 0, belegt: false });
      break;
    case "bauteilWeg": {
      const id = App.p.bauteiltypen[i].id;
      App.p.raeume.forEach(function (r) {
        r.bauteile = (r.bauteile || []).filter((b) => b.typ_id !== id);
      });
      App.p.bauteiltypen.splice(i, 1);
      break;
    }
    case "bauteilAusVorlage": {
      const v = $("#vorlagenwahl").value;
      if (!v) break;
      if (v.indexOf("oe:") === 0) {
        const o = DB.OEFFNUNGEN.find((x) => x.id === v.slice(3));
        App.p.bauteiltypen.push({ id: uid("bt"), name: o.label, U: o.u, kat_default: "huelle",
          schichten: [], belegt: !!o.belegt, quelle: o.quelle || null });
      } else {
        const n = DB.ausVorlage(v);
        App.p.bauteiltypen.push({ id: uid("bt"), name: n.label, U: Math.round(n.u * 1000) / 1000,
          kat_default: n.uebergang === "erdreich" ? "erdreich" : "huelle",
          schichten: n.schichten, uebergang: n.uebergang, zuschlag: n.zuschlag,
          belegt: !!n.belegt, quelle: n.quelle || null });
      }
      break;
    }
    case "schichtEdit": App.schichtEdit = App.schichtEdit === i ? null : i; break;
    case "schichtAbbrechen": App.schichtEdit = null; break;
    case "schichtNeu":
      if (!App.p.bauteiltypen[i].schichten) App.p.bauteiltypen[i].schichten = [];
      App.p.bauteiltypen[i].schichten.push({ mat: "wlg035", d: 0.1 });
      break;
    case "schichtWeg": App.p.bauteiltypen[ij[0]].schichten.splice(ij[1], 1); break;
    case "schichtUebernehmen": {
      const b = App.p.bauteiltypen[i];
      const res = DB.uWert(b.schichten, b.uebergang || "wand_aussen", num(b.zuschlag, 0));
      b.U = Math.round(res.u * 1000) / 1000;
      App.schichtEdit = null;
      break;
    }

    case "zoneNeu":
      /* Mit einer Lage statt mit dem leeren Bilanzweg: eine Zone ohne
         Hüllbauteile bilanziert sich sonst auf die Raumtemperatur und
         liefert 0 W. */
      App.p.zonen.push({ id: uid("z"), name: "Unbeheizter Bereich " + (App.p.zonen.length + 1),
        modus: "lage", lage: "allg_2aw", lage_angenommen: true,
        theta_fest: 10, huelle: [] });
      break;
    /* EINE GELÖSCHTE ZONE MUSS GELÖSCHT BLEIBEN.
     *
     * Bis zum 23.08.2026 legte automatischErgaenzen() jede Zone, die der
     * Plan beim Namen nennt, beim nächsten Zeichnen wieder an. Wer sie
     * löschte, sah sie sofort wieder — und, was schwerer wiegt: der Fall
     * „unbeheizter Bereich fehlt" ließ sich damit nicht erzwingen. Eine
     * Prüfung, deren Anschlagen niemand vorführen kann, ist kein Nachweis.
     *
     * Gemerkt wird der Name, nicht die Kennung: das selbsttätige Anlegen
     * geht über die Namen aus den Unterlagen. Wer die Zone wiederhaben will,
     * legt sie über den Befund im Kontrollblatt neu an — dabei fällt der
     * Name wieder aus der Liste. */
    case "zoneWeg": {
      const weg = App.p.zonen[i];
      if (weg && weg.automatisch) {
        if (!App.p.zonen_entfernt) App.p.zonen_entfernt = [];
        const nam = String(weg.name || "").trim();
        if (nam && App.p.zonen_entfernt.indexOf(nam) < 0) {
          App.p.zonen_entfernt.push(nam);
        }
        sagen("„" + nam + "“ war vom Werkzeug selbst angelegt worden. Der "
          + "Bereich wird nicht wieder erzeugt; im Kontrollblatt steht er "
          + "jetzt als fehlender unbeheizter Bereich.", { stufe: "warnung" });
      }
      App.p.zonen.splice(i, 1);
      break;
    }
    case "zoneBtNeu":
      if (!App.p.zonen[i].huelle) App.p.zonen[i].huelle = [];
      App.p.zonen[i].huelle.push({ name: "Bauteil", A: 0, U: 1.0, grenzt_an: { typ: "aussen" } });
      break;
    case "zoneBtWeg": App.p.zonen[ij[0]].huelle.splice(ij[1], 1); break;

    case "raumNeu": {
      const letzte = App.p.raeume[App.p.raeume.length - 1];
      App.p.raeume.push({ id: uid("r"), geschoss: letzte ? letzte.geschoss : "EG",
        name: "Raum " + (App.p.raeume.length + 1), art: "wohnen", A: 0,
        h: letzte ? letzte.h : null,
        we: letzte ? letzte.we : (App.p.einheiten[0] || {}).name || "", bauteile: [] });
      break;
    }
    case "raumWeg": App.p.raeume.splice(i, 1); break;
    case "raumBauteile":
      App.offenerRaum = App.offenerRaum === a.dataset.id ? null : a.dataset.id;
      break;
    case "raumZu": App.offenerRaum = null; break;

    /* Ergebnisseite: einen Raum öffnen heißt, seine Zusammensetzung zeigen.
       Derselbe Vorgang läuft auch über die Marke im Plan (beiWahl in
       renderInhalt); beide Wege setzen dieselben zwei Felder. */
    case "ergebnisRaum": {
      const id = a.dataset.id;
      App.ergebnisRaum = App.ergebnisRaum === id ? null : id;
      if (window.MODUL_PRUEFBLATT) {
        window.MODUL_PRUEFBLATT.zustand.gewaehlt = App.ergebnisRaum;
      }
      break;
    }
    case "ergebnisAnnahmen":
      App.ergebnisAnnahmenOffen = !App.ergebnisAnnahmenOffen;
      break;

    case "rbtNeu":
      if (!App.p.raeume[i].bauteile) App.p.raeume[i].bauteile = [];
      App.p.raeume[i].bauteile.push({ typ_id: (App.p.bauteiltypen[0] || {}).id || "",
        name: (App.p.bauteiltypen[0] || {}).name || "", A: 0,
        kat: (App.p.bauteiltypen[0] || {}).kat_default || "huelle",
        grenzt_an: { typ: "aussen" } });
      break;
    case "rbtWeg": App.p.raeume[ij[0]].bauteile.splice(ij[1], 1); break;

    case "geschossKopieren": {
      eingabe({ titel: "Geschoss duplizieren",
        text: "Welches Geschoss soll dupliziert werden?",
        wert: App.p.raeume[0].geschoss || "EG", mehrzeilig: false,
        feldname: "Geschoss, das kopiert wird", jaText: "Weiter" }).then(function (g) {
        if (!g) return;
        return eingabe({ titel: "Neues Geschoss",
          text: "Wie heißt das neue Geschoss?", wert: "OG", mehrzeilig: false,
          feldname: "Bezeichnung des neuen Geschosses",
          jaText: "Kopieren" }).then(function (neu) {
          if (!neu) return;
          const quelle = App.p.raeume.filter((r) => (r.geschoss || "") === g);
          if (!quelle.length) {
            sagen("Kein Raum in Geschoss " + g + " gefunden.", { stufe: "warnung" });
            return;
          }
          quelle.forEach(function (r) {
            const kopie = JSON.parse(JSON.stringify(r));
            kopie.id = uid("r");
            kopie.geschoss = neu;
            (kopie.bauteile || []).forEach(function (b) {
              if (b.grenzt_an && b.grenzt_an.typ === "raum") b.grenzt_an = { typ: "aussen" };
            });
            App.p.raeume.push(kopie);
          });
          render();
          sagen(mz(quelle.length, "Raum", "Räume") + " nach " + neu
            + " kopiert. Bauteile gegen andere Räume wurden auf Außenluft "
            + "gesetzt und müssen geprüft werden.", { stufe: "warnung" });
        });
      });
      break;
    }
    default:
      if (window.MODUL_PLAN && window.MODUL_PLAN.aktion) {
        if (window.MODUL_PLAN.aktion(a.dataset.aktion, a)) break;
      }
      if (window.MODUL_KI && window.MODUL_KI.aktion) {
        if (window.MODUL_KI.aktion(a.dataset.aktion, a)) break;
      }
      if (window.MODUL_PRUEFBLATT && window.MODUL_PRUEFBLATT.aktion) {
        if (window.MODUL_PRUEFBLATT.aktion(a.dataset.aktion, a)) break;
      }
      if (window.MODUL_KONTROLLBLATT && window.MODUL_KONTROLLBLATT.aktion) {
        if (window.MODUL_KONTROLLBLATT.aktion(a.dataset.aktion, a)) break;
      }
      if (window.MODUL_BEWERTUNG && window.MODUL_BEWERTUNG.aktion) {
        if (window.MODUL_BEWERTUNG.aktion(a.dataset.aktion, a)) break;
      }
      return;
  }
  render();
});

/* --------------------------------------------------------------------------
 * Speichern, Laden, Standort
 * ----------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
 * Zwischenspeicher im Browser
 * Ein Raumbuch für ein Mehrfamilienhaus ist eine Stunde Arbeit. Ein
 * versehentliches Neuladen darf sie nicht kosten.
 * ----------------------------------------------------------------------- */
const SICHERUNG = "werke_hl_sicherung";
let sicherungsUhr = null;

/* DIE ZWEI-TAB-FALLE.
 *
 * Der Zwischenspeicher ist EIN Schlüssel im Browserspeicher, und den teilen
 * sich alle offenen Reiter. In der Abnahme am 24.08.2026 hat ein liegen
 * gebliebener alter Reiter mit seinem nächsten Tastendruck den neueren Stand
 * des aktiven Reiters überschrieben — kommentarlos.
 *
 * Deshalb trägt jeder Eintrag jetzt die Kennung der Sitzung, die ihn
 * geschrieben hat, und vor jedem Schreiben wird gelesen: stammt der liegende
 * Eintrag aus einer ANDEREN Sitzung und ist er JÜNGER als alles, was diese
 * Sitzung selbst geschrieben oder ausdrücklich übernommen hat, wird NICHT
 * geschrieben. Der Bearbeiter erfährt es einmal, deutlich; sein eigener
 * Stand bleibt über „Speichern" als Datei zu sichern, und die Warnung beim
 * Schließen des Reiters greift, weil Sicherungsstand.steht false ist.
 * Rückwärts überschrieben wird nie. */
const SITZUNG_KENNUNG = "s" + Date.now().toString(36)
  + Math.random().toString(36).slice(2, 8);
let sicherungBekannterStand = 0;      // jüngster selbst geschriebener oder übernommener Stand (ms)
let sicherungKonfliktGemeldet = false;

/* --------------------------------------------------------------------------
 * Ein Projekt in eine Form bringen, die sich schreiben laesst
 * --------------------------------------------------------------------------
 * App.p.plan.seiten enthaelt LEBENDE Objekte: pdfSeite ist ein PDFPageProxy
 * von pdf.js und verweist auf sein Dokument zurueck, das wieder auf die Seite
 * zeigt. JSON.stringify laeuft darin im Kreis und wirft. Genau das ist
 * passiert, sobald ein Plan im Projekt lag:
 *   - "Speichern" erzeugte keine Datei und keine Meldung, nur einen Fehler
 *     in der Konsole, den niemand sieht.
 *   - Der Zwischenspeicher schrieb nie, weil sein try/catch den Fehler
 *     verschluckte. Ein Neuladen kostete die ganze Arbeit.
 * Dazu kommt seite.bytes: die vollstaendige Datei als Bytefolge. Sie ist
 * seriali­sierbar, aber ein 13-MB-PDF sprengt jeden Browserspeicher.
 *
 * Deshalb wird nicht ausgeschlossen, was stoert, sondern aufgezaehlt, was
 * bleibt. Eine Aufzaehlung dessen, was weg soll, vergisst das naechste Feld,
 * das jemand an die Seite haengt; eine Aufzaehlung dessen, was bleibt, nicht.
 *
 * Was bleibt, ist das ERGEBNIS der Blattauswertung — Massstab, Raumliste,
 * Blattkopf, Geschoss. Das ist es, worauf der Bericht sich beruft. Was nicht
 * bleiben kann, ist das Blatt selbst; nach dem Wiederherstellen laesst es
 * sich nicht mehr anzeigen und nicht erneut auslesen. Die Seite sagt das
 * dann auch (nurDaten). */
const SEITENFELDER = [
  "nr", "quelle", "name", "datei", "bezeichnung", "typ", "typBefund",
  "breite_pt", "hoehe_pt", "breite_mm", "hoehe_mm", "breite_px", "hoehe_px",
  "format", "drehung", "hatTextlayer", "pfadzahl", "kacheln_noetig",
  "kleinste_versalhoehe_mm", "dpi_nativ", "aufloesung",
  "blattkopf", "objektangaben", "ueberschrift", "geschoss", "geschossQuelle",
  "massstab", "massstabGelesen", "masszahlenAusPlan", "massstabGemessen",
  /* Die Aussenbemassung aus dem Textstand (MODUL_PDF, Teil D2). Sie muss
     mitwandern: die Masszahlen und Strecken, aus denen sie entsteht, bleiben
     NICHT im Projekt, und nach dem Wiederherstellen gaebe es die Kontur sonst
     nicht mehr -- das Kontrollblatt stuende dann wieder ohne Gegenrechnung da. */
  "aussenbemassung",
  "auslese", "ausgewertet", "uebernommen", "verwenden", "istGrundriss",
  "hoehenFehler", "kundeFehler", "ausleseFehler", "abgeschnitten", "dateigroesse",
  /* Die zweite Lesung und ihr Abgleich gehören in die Sicherung. Ohne sie
     stünde nach jedem Wiederherstellen wieder "gegen nichts geprüft" da, und
     der bezahlte Modellaufruf wäre verloren — samt jedem Beleg, den er
     erbracht hat. */
  "gegenprobe", "gegenprobeAbgleich", "gegenprobeKonturen", "gegenprobeEbenen",
  "gegenprobeFehler",
  /* Die Reparaturspur der Nachlesung: ein roter Befund "Grundriss ohne
     Räume" darf durch Sichern und Wiederherstellen nicht verschwinden. */
  "grundrissOhneRaeume", "nachgelesen",
  "vermerke", "feldweise", "zugeschnitten",
];

function seiteFuerAblage(s) {
  const o = {};
  SEITENFELDER.forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
  /* Ohne die lebende Seite laesst sich nichts mehr rendern. Das muss an der
     Seite stehen, sonst laeuft die Stapelauswertung nach dem Wiederherstellen
     in einen Fehler je Blatt. */
  o.nurDaten = true;
  return o;
}

/** Eine Fassung des Projekts, die sich schreiben laesst.
 *  ohneBilder lässt die eingebetteten Abbildungen weg; sie sind der grosse
 *  Brocken und werden nur gebraucht, wenn der Bericht sie abdruckt. */
function projektFuerAblage(p, ohneBilder) {
  const q = Object.assign({}, p);
  const plan = p.plan || {};
  q.plan = {
    seiten: (plan.seiten || []).map(seiteFuerAblage),
    bilder: (plan.bilder || []).map(function (b) {
      if (!ohneBilder) return b;
      const c = Object.assign({}, b);
      delete c.abbildung;
      c.abbildung_entfallen = true;
      return c;
    }),
  };
  return q;
}

/** Wie viel Platz die Sicherung zuletzt gebraucht hat und ob sie stand.
 *  Wird im Blattkopf angezeigt, damit niemand im Glauben arbeitet, es sei
 *  gesichert, wenn es das nicht ist. */
const Sicherungsstand = { steht: false, wann: null, ohneBilder: false, grund: null };

function sichern() {
  if (sicherungsUhr) clearTimeout(sicherungsUhr);
  sicherungsUhr = setTimeout(function () {
    /* Solange ein wiedergefundener Stand noch zur Entscheidung steht, wird
       nichts darueber geschrieben. Sonst genuegte ein Tastendruck im
       Bezeichnungsfeld, um genau den Stand zu loeschen, der oben noch
       angeboten wird. */
    /* NICHT ANGETASTET, UND WARUM.
       Der zweite Teil des Befunds („die Karte steht über dem eigenen, fertig
       geladenen Projekt, und solange sie steht, schreibt der
       Zwischenspeicher nicht") wäre nur zu beheben, indem die laufende
       Sitzung einen EIGENEN Platz im Browserspeicher bekommt. Ein Versuch,
       den Fund dafür beiseitezulegen, ist am Wächter 2da hängen geblieben:
       „Der offene Stand wurde überschrieben, bevor jemand entschieden hat."
       Der Wächter hat recht — dieser Umbau ist eine Änderung an der Ablage,
       nicht am Text, und er gehört mit eigener Probe gebaut, nicht nebenbei.
       Er bleibt offen. Was es jetzt gibt, ist ?frisch=1: wer ausdrücklich
       frisch anfängt, bekommt den Reiter frei, und der Fund bleibt erhalten. */
    if (App.sicherungAngebot) return;
    if (projektLeer()) {
      try { localStorage.removeItem(SICHERUNG); } catch (e) {}
      Sicherungsstand.steht = false;
      Sicherungsstand.grund = null;
      return;
    }
    /* Der Wächter gegen die Zwei-Tab-Falle: liegt ein jüngerer Stand einer
       ANDEREN Sitzung im Speicher, wird er nicht überschrieben. Ein
       Leseversagen (kaputtes JSON) zählt nicht als fremder Stand — dann
       gilt der Speicher als frei, wie bisher. */
    let fremd = null;
    try { fremd = JSON.parse(localStorage.getItem(SICHERUNG) || "null"); }
    catch (e) { fremd = null; }
    if (fremd && fremd.sitzung !== SITZUNG_KENNUNG
        && (Date.parse(fremd.stand) || 0) > sicherungBekannterStand) {
      const vorher = Sicherungsstand.steht;
      Sicherungsstand.steht = false;
      Sicherungsstand.grund = "Ein anderer Tab hält einen neueren Stand";
      if (!sicherungKonfliktGemeldet) {
        sicherungKonfliktGemeldet = true;
        sagen("In einem anderen Tab liegt inzwischen ein neuerer "
          + "Zwischenstand. Dieser Tab schreibt den Zwischenspeicher nicht "
          + "mehr, damit er nichts Neueres überschreibt. Zum Weiterarbeiten "
          + "am besten den anderen Tab verwenden — oder den Stand dieses "
          + "Tabs über „Speichern“ als Datei sichern.",
          { stufe: "warnung", titel: "Zweiter Tab erkannt" });
      }
      if (vorher) { try { renderPanel(); } catch (e) {} }
      return;
    }
    /* Zwei Anlaeufe: erst vollstaendig, dann ohne die eingebetteten
       Abbildungen. Der Browserspeicher fasst rund fuenf Megabyte; ein
       einziges umfahrenes A1-Blatt liegt darueber. Frueher hiess das:
       gar keine Sicherung. Jetzt heisst es: Sicherung ohne Bilder, und
       das steht im Blattkopf. */
    for (const ohneBilder of [false, true]) {
      try {
        const standIso = new Date().toISOString();
        localStorage.setItem(SICHERUNG, JSON.stringify({
          stand: standIso,
          sitzung: SITZUNG_KENNUNG,
          bezeichnung: App.p.meta.bezeichnung || "ohne Bezeichnung",
          raeume: App.p.raeume.length,
          blaetter: ((App.p.plan || {}).seiten || []).length,
          ohneBilder: ohneBilder,
          projekt: projektFuerAblage(App.p, ohneBilder),
        }));
        sicherungBekannterStand = Date.parse(standIso) || Date.now();
        sicherungKonfliktGemeldet = false;
        const vorher = Sicherungsstand.steht;
        Sicherungsstand.steht = true;
        Sicherungsstand.wann = new Date();
        Sicherungsstand.ohneBilder = ohneBilder;
        Sicherungsstand.grund = null;
        /* Das Neuzeichnen darf die Sicherung nicht gefaehrden: hier laeuft
           eine Zeitschaltung, ein Fehler daraus faengt niemand auf und der
           naechste Lauf bliebe aus. Gesichert IST zu diesem Zeitpunkt schon. */
        if (!vorher) { try { renderPanel(); } catch (e) {} }
        return;
      } catch (e) {
        Sicherungsstand.grund = String((e && e.message) || e);
      }
    }
    /* Beide Anlaeufe gescheitert. Das darf nicht mehr still passieren:
       wer eine Stunde Raumbuch tippt, muss wissen, dass nichts liegt. */
    const vorher = Sicherungsstand.steht;
    Sicherungsstand.steht = false;
    if (vorher) { try { renderPanel(); } catch (e) {} }
  }, 800);
}

/* Das Angebot, an einem wiedergefundenen Stand weiterzuarbeiten.
 *
 * Es war ein confirm() beim Start, und das war aus drei Gruenden falsch:
 * Escape oder ein Fehlklick beantwortete es mit "Abbrechen", und Abbrechen
 * LOESCHTE den Stand sofort und ohne Rueckfrage -- ein Arbeitstag, weg mit
 * einer Taste. Zweitens verschluckt ein Browser einen Dialog beim Laden
 * gelegentlich ganz. Drittens sieht man einem Dialog nicht an, was darin
 * steckt.
 *
 * Jetzt steht das Angebot als Karte ueber dem Inhalt, auf jedem Schritt, bis
 * es beantwortet ist. Bis dahin schreibt der Zwischenspeicher NICHT (siehe
 * sichern()), sonst ueberschriebe die erste Eingabe genau das, was hier noch
 * zu holen waere. Verworfen wird nur auf ausdruecklichen Klick und mit
 * Rueckfrage. */
function sicherungAnbieten() {
  let g;
  try { g = JSON.parse(localStorage.getItem(SICHERUNG) || "null"); } catch (e) { return; }
  if (!g || !g.projekt) return;
  /* ?frisch=1 heißt: frisch anfangen. Drei Prüfer haben den Schalter am
     26.08.2026 benutzt und alle drei berichten dasselbe — er tat nichts, die
     Karte mit dem FREMDEN Projektnamen stand über dem ganzen Lauf. Es gab
     ihn schlicht nicht. Jetzt gibt es ihn, und er LÖSCHT nichts: der Fund
     wird beiseitegelegt und bleibt über die Zeile darüber erreichbar. */
  const suche = (window && window.location && window.location.search) || "";
  if (/(^|[?&])frisch=1(&|$)/.test(String(suche))) {
    sicherungBeiseiteLegen(g);
    return;
  }
  App.sicherungAngebot = g;
}

/* DIE KARTE DARF NICHT ÜBER FREMDER ARBEIT STEHEN BLEIBEN.
 *
 * Vier Prüfprotokolle vom 26.08.2026, im Wortlaut: „Banner ‚Ein nicht
 * abgeschlossener Stand liegt vor' bleibt über Ablage, Auswertung,
 * Rückfragen und Bericht stehen", „steht die ganze Sitzung über dem eigenen,
 * fertig geladenen Projekt", und mit fremdem Projektnamen. Zwei Dinge waren
 * daran falsch, und das zweite ist das teurere:
 *
 *  1. Die Warnkarte behauptet über einem fertig gerechneten Projekt, es liege
 *     etwas Unerledigtes vor — und ihr Knopf „Daran weiterarbeiten" würde
 *     genau diese Rechnung ersetzen.
 *  2. Solange die Karte steht, schreibt sichern() NICHT (damit der Fund nicht
 *     überschrieben wird). Wer die Karte einfach stehen ließ und arbeitete,
 *     hatte die ganze Sitzung lang KEINEN Zwischenspeicher — die Sicherung,
 *     um die es hier überhaupt geht, war für die neue Arbeit abgeschaltet.
 *
 * Die Entscheidung fällt deshalb von selbst, sobald in diesem Reiter eigene
 * Arbeit liegt: der Fund wird beiseitegelegt — unter einen zweiten Schlüssel,
 * NICHT gelöscht —, der Hauptplatz wird frei, der Zwischenspeicher schreibt
 * wieder. Was blieb, sagt eine ruhige Zeile, und ein Klick holt es zurück.
 * Verworfen wird weiterhin nur auf ausdrücklichen Klick und mit Rückfrage. */
const SICHERUNG_BEISEITE = "werke_hl_sicherung_beiseite";

function sicherungBeiseiteLegen(g) {
  if (!g) return;
  try { localStorage.setItem(SICHERUNG_BEISEITE, JSON.stringify(g)); } catch (e) {}
  try { localStorage.removeItem(SICHERUNG); } catch (e) {}
  App.sicherungAngebot = null;
  App.sicherungBeiseite = { bezeichnung: g.bezeichnung || "ohne Bezeichnung",
                            stand: g.stand, raeume: g.raeume || 0 };
}

function sicherungZurueckholen() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(SICHERUNG_BEISEITE) || "null"); }
  catch (e) { g = null; }
  if (!g || !g.projekt) {
    sagen("Der beiseitegelegte Stand ist nicht mehr im Browserspeicher.",
      { stufe: "warnung" });
    App.sicherungBeiseite = null;
    return;
  }
  App.sicherungAngebot = g;
  App.sicherungBeiseite = null;
}

function sicherungsKarte() {
  const g = App.sicherungAngebot;
  if (!g) return sicherungBeiseiteZeile();
  const zeit = new Date(g.stand).toLocaleString("de-DE",
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const blaetter = g.blaetter || 0;
  return '<div class="karte" style="border-color:var(--warn);background:var(--warn-bg)">'
    + '<h2 style="border:0;padding-bottom:0">Ein nicht abgeschlossener Stand liegt vor</h2>'
    + "<p><b>" + esc(g.bezeichnung || "ohne Bezeichnung") + "</b><br>"
    + mz(g.raeume || 0, "Raum", "Räume")
    + (blaetter ? ", " + mz(blaetter, "Blatt", "Blätter") : "")
    + ", zuletzt bearbeitet " + esc(zeit) + "</p>"
    + (blaetter
      ? '<p style="font-size:13px">Die Auswertung der Blätter ist erhalten. Die '
        + "Blätter selbst liegen nicht mehr vor; zum Anzeigen oder erneuten Auslesen "
        + "müssen sie noch einmal abgelegt werden.</p>"
      : "")
    + '<p style="font-size:13px">Solange hier nichts entschieden ist, schreibt der '
    + "Zwischenspeicher nicht — der Stand kann also nicht aus Versehen überschrieben "
    + "werden.</p>"
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn cta" data-aktion="sicherungWeiter">Daran weiterarbeiten</button>'
    + '<button class="btn klein gefahr" data-aktion="sicherungVerwerfen">Verwerfen</button>'
    + "</div></div>";
}

/** Die ruhige Zeile an der Stelle der Warnkarte: was beiseiteliegt, und wie
 *  es zurückkommt. Ein Hinweis, keine Warnung — es ist nichts offen und
 *  nichts verloren. */
function sicherungBeiseiteZeile() {
  const b = App.sicherungBeiseite;
  if (!b) return "";
  const zeit = b.stand
    ? new Date(b.stand).toLocaleString("de-DE",
        { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";
  return '<div class="meldung hinweis" style="display:block;margin:0 0 12px;'
    + 'font-size:13px">Ein älterer Zwischenstand („'
    + esc(b.bezeichnung || "ohne Bezeichnung") + "“"
    + (zeit ? ", " + esc(zeit) : "") + ") lag noch im Browser. Er ist "
    + "beiseitegelegt, damit die Arbeit dieses Reiters gesichert wird; "
    + 'gelöscht wurde nichts. <a href="#" data-aktion="sicherungZurueckholen">'
    + "Wieder ansehen</a></div>";
}

/** Schreibt das Projekt als Datei.
 *
 *  Frueher stand hier ein nacktes JSON.stringify(App.p). Sobald ein Plan im
 *  Projekt lag, warf es (Ringverweis ueber pdfSeite) und der Knopf tat
 *  NICHTS: keine Datei, keine Meldung. Ein Knopf, der schweigend nichts tut,
 *  ist schlimmer als gar keiner — man verlaesst sich darauf. */
function speichern() {
  const name = (App.p.meta.projektnr || App.p.meta.bezeichnung || "Heizlast")
    .replace(/[^\wäöüÄÖÜß -]/g, "_").slice(0, 60);
  let text;
  try {
    text = JSON.stringify(projektFuerAblage(App.p), null, 1);
  } catch (e) {
    sagen(String((e && e.message) || e)
      + "\n\nBitte Sebastian Hund melden. Die Arbeit ist nicht verloren: der "
      + "Zwischenspeicher im Browser hält den Stand, solange der Reiter offen bleibt.",
      { stufe: "fehler", titel: "Das Projekt ließ sich nicht in eine Datei schreiben" });
    return;
  }
  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Heizlast_" + name + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function laden(datei) {
  const fr = new FileReader();
  fr.onload = function () {
    try {
      const o = JSON.parse(fr.result);
      if (!o || typeof o !== "object" || !("raeume" in o)) throw new Error("kein Heizlast-Projekt");
      // Schutz gegen Prototype Pollution
      ["__proto__", "constructor", "prototype"].forEach((k) => { delete o[k]; });
      App.p = Object.assign(leeresProjekt(), o);
      App.schritt = "raeume";
      App.offenerRaum = null;
      render();
    } catch (e) {
      sagen("Die Datei konnte nicht gelesen werden: " + e.message, { stufe: "fehler" });
    }
  };
  fr.readAsText(datei);
}

function renderStandortwahl() {
  const A = window.ASSETS || { briefkoepfe: {} };
  const S = window.STANDORTE || {};
  $("#standortwahl").innerHTML = Object.keys(S).map(function (k) {
    const gebaut = !!(A.briefkoepfe && A.briefkoepfe[k]);
    return '<button data-standort="' + k + '"' + (App.p.standort === k ? ' class="aktiv"' : "")
      + (gebaut ? "" : " disabled title=\"Briefkopf für diesen Standort ist noch nicht gebaut\"")
      + ">" + esc(S[k].marke) + "</button>";
  }).join("")
    /* Ein gesperrter Knopf ohne sichtbaren Grund erzeugt genau eine Frage:
       "warum geht das nicht?". Der Titel allein hilft nicht, er erscheint
       erst beim Verweilen mit der Maus und auf einem Tastfeld nie. */
    + (function () {
        /* Welcher Standort gesperrt ist, gehoert dazu. "ausgegraut: kein
           Briefkopf" sagte zwar den Grund, aber nicht, fuer welchen der drei
           Knoepfe er gilt. */
        const fehlen = Object.keys(S).filter(function (k) {
          return !(A.briefkoepfe && A.briefkoepfe[k]);
        }).map(function (k) { return S[k].marke; });
        if (!fehlen.length) return "";
        return '<span style="font-size:12px;color:var(--mute);margin-left:8px" '
          + 'title="Für diesen Standort ist noch kein Briefkopf hinterlegt. Der '
          + 'Bericht entstünde ohne Kopf- und Fußzeile.">'
          + esc(fehlen.join(" und "))
          + (fehlen.length === 1 ? ": Briefkopf fehlt" : ": Briefköpfe fehlen")
          + "</span>";
      })();
  $$("#standortwahl button").forEach(function (b) {
    b.onclick = function () {
      App.p.standort = b.dataset.standort;
      try { localStorage.setItem("werke_hl_standort", App.p.standort); } catch (e) {}
      renderStandortwahl();
    };
  });
}

/* --------------------------------------------------------------------------
 * Start
 * ----------------------------------------------------------------------- */
function start() {
  /* IN DER OBERFLAECHE STEHT DIESELBE FASSUNG WIE IM BERICHT.
     Drei der fuenf Pruefprotokolle vom 26.08.2026 melden dasselbe: aus dem
     Bericht ist "RC1" heraus (richtig -- ein Kennzeichen aus der
     Entwicklung liest sich im Ausdruck wie ein Vorabstand), im Kopf der
     Anwendung stand es die ganze Sitzung weiter. Zwei Fassungsangaben fuer
     dasselbe Werkzeug. Angezeigt wird jetzt Haupt- und Nebenstelle; die
     vollstaendige Kennung bleibt in VERSION und steht unveraendert im
     internen Bericht. */
  const vk = (String(VERSION).match(/^(\d+)\.(\d+)/) || [])[0] || VERSION;
  $("#verlabel").textContent = "Version " + vk;
  $("#verlabel").title = "Vollständige Kennung: " + VERSION;
  const A = window.ASSETS || {};
  /* Das Logo steckt als Datenband in der Datei und wird hier gesetzt. Bis
     dahin ist das Bildfeld ausgeblendet; ein <img> ohne Quelle zeigt sonst
     kurz das Symbol fuer ein kaputtes Bild. */
  if (A.logo) {
    const l = $("#kopflogo");
    l.src = "data:image/png;base64," + A.logo;
    l.hidden = false;
  }
  try {
    const s = localStorage.getItem("werke_hl_standort");
    if (s && window.STANDORTE && window.STANDORTE[s]) App.p.standort = s;
  } catch (e) {}
  renderStandortwahl();

  $("#btnNeu").onclick = function () {
    const neu = function () {
      App.p = leeresProjekt(); App.schritt = "start";
      /* Ein neues Projekt beginnt ohne den Auswertungsbericht des alten. */
      App.ausleseBericht = null;
      try { localStorage.removeItem(SICHERUNG); } catch (e) {}
      render();
    };
    if (!App.p.raeume.length) { neu(); return; }
    fragen({ titel: "Aktuelles Projekt verwerfen?",
      text: "Das Raumbuch mit " + mz(App.p.raeume.length, "Raum", "Räumen")
        + " wird verworfen. Wer es behalten will, sichert es vorher über "
        + "„Speichern“.",
      jaText: "Verwerfen", neinText: "Abbrechen" }).then(function (ja) {
      if (ja) neu();
    });
  };
  $("#btnSpeichern").onclick = speichern;
  $("#btnLaden").onclick = () => $("#dateiLaden").click();
  $("#dateiLaden").onchange = function () { if (this.files[0]) laden(this.files[0]); this.value = ""; };
  /* Zwei Fassungen desselben Berichts (Sebastians Vorgabe vom 24.08.2026):
     „Bericht" ist die Druckfassung für den Auftraggeber, ohne Angaben zur
     Güte der Zahlen; „Interne Fassung" ist der Vollbericht mit Herkunft,
     Konfidenz, offenen Punkten und Prüfungen. */
  $("#btnBericht").onclick = function () {
    if (window.MODUL_BERICHT) window.MODUL_BERICHT.erzeugen({ fassung: "druck" });
  };
  $("#btnBerichtIntern").onclick = function () {
    if (window.MODUL_BERICHT) window.MODUL_BERICHT.erzeugen({ fassung: "intern" });
  };

  // Demo-Parameter für Tests: ?demo=1
  if (/[?&]demo=1/.test(location.search) && window.DEMO_PROJEKT) {
    App.p = JSON.parse(JSON.stringify(window.DEMO_PROJEKT));
    App.schritt = "ergebnis";
  } else {
    /* Der Zwischenspeicher wurde geschrieben, aber nie angeboten: die
       Funktion stand da und wurde von nirgendwo gerufen. Damit war die
       gesamte Absicherung gegen ein versehentliches Neuladen wirkungslos.
       Nach der Demo steht sie bewusst nicht — das Demoprojekt soll den
       Stand eines Kollegen nicht verdraengen. */
    sicherungAnbieten();
  }

  /* Zwei Dinge, die abgelegte Arbeit kosten, und beide passieren beilaeufig:
     -- Ein Plan, der NEBEN die Ablageflaeche faellt. Ohne diesen Fang oeffnet
        der Browser das PDF im Reiter, das Werkzeug ist weg und mit ihm alles,
        was noch nicht gesichert war. Gemessen: ueber der Ueberschrift "Pläne
        hierher ziehen" war defaultPrevented false.
     -- Das Schliessen des Reiters mit ungesichertem Stand. */
  ["dragover", "drop"].forEach(function (art) {
    window.addEventListener(art, function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest("#ablage")) return;
      ev.preventDefault();
      if (art === "drop" && ev.dataTransfer && ev.dataTransfer.files
          && ev.dataTransfer.files.length) {
        /* Danebengefallen ist kein Fehler des Kollegen. Die Dateien werden
           genommen, als waeren sie auf der Flaeche gelandet. */
        if (App.schritt !== "start") { App.schritt = "start"; render(); }
        dateienAufnehmen(ev.dataTransfer.files);
      }
    });
  });

  window.addEventListener("beforeunload", function (ev) {
    if (projektLeer()) return;
    if (Sicherungsstand.steht) return;
    ev.preventDefault();
    ev.returnValue = "";
    return "";
  });

  render();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
