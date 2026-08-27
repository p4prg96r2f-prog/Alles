/* ===========================================================================
 * uebernahme_test.js — was das Werkzeug dem Bearbeiter abnimmt
 * ===========================================================================
 * Gemessen wurde vorher: bei sechs von sechs Unterlagensaetzen tippt der
 * Bearbeiter dieselben Angaben ein, obwohl sie entweder im Schriftfeld des
 * Blattes stehen (Anschrift, Postleitzahl, Bauvorhaben, Bauherr) oder sich
 * von Projekt zu Projekt gar nicht aendern (Name, Funktion, Nummer in der
 * Energieeffizienz-Expertenliste).
 *
 * Dieser Test geht denselben Weg wie der Bearbeiter: er laedt app.js in
 * derselben Attrappe wie oberflaeche_test.js, legt Werte ueber die
 * vorhandenen Wege ab und prueft, was danach im Projekt steht. Ein Test, der
 * nur die Lesefunktion in modul_pdf.js aufruft, faende nicht, dass ihr
 * Ergebnis anschliessend niemand abholt — genau das war der Befund.
 *
 * Aufruf:  node validierung/uebernahme_test.js
 * =========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const WURZEL = path.join(__dirname, "..");
const fehler = [];
let anzahl = 0;
function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
}

/* ------------------------------------------------------------------ Attrappe
 * Nur so viel Seite, wie app.js beim Laden anfasst. */
function knoten(name) {
  return {
    tagName: String(name || "div").toUpperCase(),
    innerHTML: "", value: "", checked: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], files: [],
    appendChild(x) { this.children.push(x); return x; },
    removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    closest() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 900, height: 600, top: 0, left: 0 }; },
    getContext() { return null; }, toDataURL() { return "data:image/png;base64,x"; },
    scrollIntoView() {},
  };
}

const speicher = {};
const fenster = {
  location: { protocol: "https:", search: "", href: "https://pruefung.invalid/" },
  localStorage: {
    getItem(k) { return speicher[k] === undefined ? null : speicher[k]; },
    setItem(k, v) { speicher[k] = String(v); },
    removeItem(k) { delete speicher[k]; },
  },
  addEventListener() {}, matchMedia() { return { matches: false, addListener() {} }; },
  scrollTo() {}, alert() {}, confirm() { return true; }, print() {},
  /* Rueckfragen laufen seit dem 23.08.2026 ueber modul_dialog.js und liefern
     ein Promise. Die Attrappe antwortet sofort, damit dieser Test in einem
     Zug lesbar bleibt. */
  MODUL_DIALOG: {
    sagen() { return { weg() {} }; },
    fragen() { return { then(cb) { return this.k(cb, true); },
      catch() { return this; },
      k(cb, v) { const r = cb ? cb(v) : v;
        return (r && r.then) ? r : { then(c2) { return c2 ? c2(r) : r; },
          catch() { return this; } }; } }; },
    eingabe() { return { then(cb) { return cb ? cb("") : ""; },
      catch() { return this; } }; },
    arbeit() { return { text() {}, fertig() {},
      warten() { return { then(cb) { return cb ? cb() : undefined; },
        catch() { return this; } }; } }; },
  },
  requestAnimationFrame(f) { return setTimeout(f, 0); },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  fetch() { return Promise.reject(new Error("kein Netz im Test")); },
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  ikon(name) { return '<svg class="ikon"><use href="#i-' + name + '"></use></svg>'; },
};
const seite = {
  readyState: "loading",
  addEventListener() {}, removeEventListener() {},
  createElement: knoten, createElementNS: knoten,
  createTextNode() { return knoten("text"); },
  getElementById() { return null; }, querySelector() { return null; },
  querySelectorAll() { return []; },
  body: knoten("body"), head: knoten("head"), documentElement: knoten("html"),
  activeElement: null,
};
fenster.document = seite;
fenster.window = fenster;
fenster.self = fenster;
fenster.globalThis = fenster;

const umgebung = vm.createContext(fenster);
umgebung.console = console;
umgebung.Image = function () { return knoten("img"); };
umgebung.FileReader = function () { this.readAsDataURL = function () {}; };
umgebung.URL = URL;
umgebung.Blob = function () {};
umgebung.performance = { now() { return 0; } };
umgebung.navigator = { userAgent: "pruefung", clipboard: {} };
umgebung.TextEncoder = TextEncoder;
umgebung.TextDecoder = TextDecoder;
umgebung.Uint8Array = Uint8Array;

const DATEIEN = [
  "src/standorte.js", "src/daten/daten_zonenlagen.js",
  "src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
  "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
  "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
  "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
  "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js", "src/kerne/kern_lage.js",
  "src/kerne/kern_fenster.js", "src/kerne/kern_messen.js",
  "src/modul_pdf.js", "src/modul_plan.js", "src/modul_ki.js",
  "src/modul_kontrollblatt.js", "src/modul_pruefblatt.js",
    "src/modul_berichtsatz.js", "src/modul_teillast.js",
  "src/modul_bericht.js", "src/modul_bewertung.js",
];
for (const d of DATEIEN) {
  const pfad = path.join(WURZEL, d);
  if (!fs.existsSync(pfad)) continue;
  try {
    vm.runInContext(fs.readFileSync(pfad, "utf8"), umgebung, { filename: d });
  } catch (e) {
    fehler.push(d + " laesst sich nicht laden: " + e.message);
  }
}
let appQuelle = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
appQuelle += "\n;window.__pruef = { App, leeresProjekt, objektangabenUebernehmen,"
  + " objektangabenAusPlaenenSammeln, bearbeiterMerken, bearbeiterGemerkt,"
  + " bearbeiterVergessen, bearbeiterIstGemerkt, herkunftshinweis,"
  + " BEARBEITERFELDER, masszahlenAusTextstand, raeumeAusStempelnUebernehmen,"
  + " stempelraeumeDesBlatts, flaecheAusStempel, raeumeAusAusleseUebernehmen,"
  + " hoehenUebernehmen, bauteileErgaenzen, ausleseZusammenfuehren,"
  + " stempelKarte, geschossKanon, baujahrGueltig };\n";
try {
  vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" });
} catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__pruef;

/* ========================================================================
 * 1  Objektangaben aus dem Schriftfeld
 * ===================================================================== */
T.App.p = T.leeresProjekt();
/* Genau das, was MODUL_PDF am echten Blatt Cheruskerstrasse 23 liest. */
const gelesen = {
  bauvorhaben: "Aufmaß Bestandsgebäude", strasse: "Cheruskerstraße 23",
  plz: "33102", ort: "Paderborn", bauherr: "Gratian Grecu",
  projektnr: null, datum: "21. November 2024",
};
const etwas = T.objektangabenUebernehmen(gelesen, "Ansichten.pdf, Seite 1");
pruefe(etwas === true, "Die Uebernahme meldet nicht, dass sie etwas getan hat");
pruefe(T.App.p.meta.plz === "33102",
  "Die Postleitzahl kommt nicht im Projekt an: " + T.App.p.meta.plz);
pruefe(T.App.p.meta.strasse === "Cheruskerstraße 23", "Die Anschrift fehlt");
pruefe(T.App.p.meta.ort === "Paderborn", "Der Ort fehlt");
pruefe(T.App.p.meta.bauherr === "Gratian Grecu", "Der Bauherr fehlt");
pruefe(T.App.p.meta.bezeichnung === "Aufmaß Bestandsgebäude",
  "Die Bezeichnung wird nicht aus dem Bauvorhaben gebildet");

/* Der eigentliche Gewinn: an der Postleitzahl haengt der Klimadatensatz, und
   er muss OHNE Knopfdruck stehen. */
pruefe(T.App.p.klima.theta_e !== null,
  "Die Norm-Aussentemperatur bleibt leer, obwohl die Postleitzahl bekannt ist");
pruefe(typeof T.App.p.klima.quelle === "string" && T.App.p.klima.quelle.length > 20,
  "Der Klimadatensatz kommt ohne Quellenangabe: " + T.App.p.klima.quelle);

/* Herkunft: jeder uebernommene Wert traegt sein Blatt und erscheint als
   Hinweis unter dem Feld. */
pruefe(T.App.p.meta_herkunft.plz && T.App.p.meta_herkunft.plz.blatt === "Ansichten.pdf, Seite 1",
  "Die Herkunft der Postleitzahl wird nicht festgehalten");
pruefe(/aus dem Plan/.test(T.herkunftshinweis("meta.plz")),
  "Unter dem Feld steht kein Hinweis auf die Herkunft");
pruefe(T.herkunftshinweis("meta.baujahr") === "",
  "Ein Feld ohne Herkunft bekommt trotzdem einen Hinweis");
pruefe(T.herkunftshinweis("klima.theta_e") === "",
  "Der Hinweis erscheint auch ausserhalb von meta");

/* ------------------------------------------------------------------------
 * 1b  Das Schriftfeld darf zwischen den drei Durchgaengen nicht verlorengehen
 * ------------------------------------------------------------------------
 * GEMESSEN am 22.08.2026 gegen den Live-Endpunkt, Blatt "Werkvertrags-
 * verzeichnung BV 2-0887 Ziolkowski", Seite 1, Betriebsart "raeume": die
 * Antwort trug die Schluessel ist_grundriss, raeume, massstab, OBJEKT. Das
 * Werkzeug baute seine Auslese aber allein aus der Antwort der Betriebsart
 * "kunde", die kein "objekt" kennt -- und warf damit Bauvorhaben, Anschrift,
 * Postleitzahl, Bauherr, Projektnummer, Gebaeudeart, Baujahr und Plandatum
 * jedes Blattes weg. Ohne Baujahr keine Bauteiltypen, ohne Bauteiltypen kein
 * Bauteil, ohne Bauteil 0,00 kW.
 * Nachgestellt ist hier nur die FORM der Antworten; ihre Schluessel sind die
 * des echten Laufs. Der Beweis bleibt der Durchlauf im Browser. */
const antwortRaeume = {
  ist_grundriss: true,
  raeume: [{ bezeichnung: "WOHNEN", geschoss: "EG", flaeche_m2: 18.68 }],
  massstab: { nenner_grundriss: 100 },
  objekt: { bauvorhaben: "Einfamilienhaus", strasse: null, plz: null, ort: null,
            bauherr: null, projektnummer: "BV 2-0887", gebaeudeart: null,
            baujahr: null, plandatum: "17.05.2022" },
};
const antwortKunde = { gebaeude: { geschosse: 3 }, hinweise: [], luecken: [] };
const zus = T.ausleseZusammenfuehren(antwortRaeume, antwortKunde, null);
pruefe(!!zus.objekt, "Das Schriftfeld aus dem ersten Durchgang geht verloren");
pruefe(zus.objekt.plandatum === "17.05.2022",
  "Das Datum des Blattes kommt nicht durch");
pruefe(zus.raeume.length === 1 && !!zus.gebaeude,
  "Beim Zusammenfuehren geht Raumliste oder Gebaeudeblock verloren");
/* Der dritte Durchgang hat Vorrang, wenn er selbst ein Schriftfeld liefert. */
const zus2 = T.ausleseZusammenfuehren(antwortRaeume,
  { objekt: { plz: "33102", bauvorhaben: null, baujahr: null, plandatum: null } }, null);
pruefe(zus2.objekt.plz === "33102",
  "Das Schriftfeld des dritten Durchgangs muss Vorrang haben");
/* Der Vorrang gilt je FELD, nicht fuer das Objekt als Ganzes. GEMESSEN am
   24.08.2026 in zwei echten Durchlaeufen: der alte Endpunkt kennt in der
   Betriebsart "kunde" kein "objekt", objektFuellen normalisiert die Antwort
   zu einem Geruest aus lauter null-Feldern -- und dieses Geruest verdeckte
   das echte Schriftfeld des ersten Durchgangs samt Plandatum "17.05.2022".
   Folge: kein angenommenes Baujahr, keine Bauteiltypen, 2,5 statt 6,9 kW. */
pruefe(zus2.objekt.plandatum === "17.05.2022",
  "Ein null-Feld des dritten Durchgangs darf das Plandatum nicht verdecken");
const kundeLeer = { objekt: { bauvorhaben: null, strasse: null, plz: null,
  ort: null, bauherr: null, projektnr: null, gebaeudeart: null, baujahr: null,
  plandatum: null, planungsart: "unklar", planungsart_beleg: null } };
const zus3 = T.ausleseZusammenfuehren(antwortRaeume, kundeLeer, null);
pruefe(zus3.objekt.plandatum === "17.05.2022"
    && zus3.objekt.bauvorhaben === "Einfamilienhaus"
    && zus3.objekt.projektnummer === "BV 2-0887",
  "Das normalisierte Leer-Objekt des alten Endpunkts verdeckt das Schriftfeld");
const rMitArt = Object.assign({}, antwortRaeume,
  { objekt: Object.assign({}, antwortRaeume.objekt, { planungsart: "neubau" }) });
pruefe(T.ausleseZusammenfuehren(rMitArt, kundeLeer, null).objekt.planungsart === "neubau",
  "„unklar“ ist eine Verlegenheitsantwort und darf „neubau“ nicht ueberschreiben");
/* Faellt der dritte Durchgang ganz aus, bleibt das Schriftfeld trotzdem da. */
pruefe(!!T.ausleseZusammenfuehren(antwortRaeume, null, null).objekt,
  "Ohne dritten Durchgang geht das Schriftfeld verloren");

/* Und jetzt die Namen der Felder, so wie der Endpunkt sie schreibt.
   "projektnummer" hiess beim Lesen "projektnr" -- eine Zeile, die still
   durchlief und das Feld leer liess. */
const pEnd = T.leeresProjekt();
T.App.p = pEnd;
T.objektangabenUebernehmen({
  bauvorhaben: "Neubau Einfamilienhaus", strasse: "Springbach 7", plz: "33100",
  ort: "Paderborn", bauherr: "Familie Muster", projektnummer: "BV 2-0887",
  gebaeudeart: "Einfamilienhaus", baujahr: "2001", plandatum: "17.05.2022",
}, "Blatt 1");
pruefe(pEnd.meta.projektnr === "BV 2-0887",
  "Die Projektnummer des Endpunkts kommt nicht an: " + pEnd.meta.projektnr);
pruefe(pEnd.meta.baujahr === "2001", "Das Baujahr kommt nicht an");
pruefe(pEnd.bauteiltypen.length > 0,
  "Aus dem gelesenen Baujahr entstehen keine Bauteiltypen");
pruefe(pEnd.meta_herkunft.plandatum && pEnd.meta_herkunft.plandatum.wert === "17.05.2022",
  "Das Datum des Blattes wird nicht aufbewahrt");
pruefe(pEnd.meta_herkunft.gebaeudeart_gelesen === "Einfamilienhaus",
  "Die gelesene Gebaeudeart wird nicht mitgefuehrt");

/* Das Datum des Blattes darf NIEMALS zum Baujahr werden. */
const pDatum = T.leeresProjekt();
T.App.p = pDatum;
T.objektangabenUebernehmen({ plandatum: "17.05.2022", baujahr: null }, "Blatt 1");
pruefe(pDatum.meta.baujahr === "",
  "Das Datum des Blattes ist zum Baujahr geworden: " + pDatum.meta.baujahr);
pruefe(pDatum.bauteiltypen.length === 0,
  "Aus einem Plandatum sind Bauteiltypen entstanden");

/* Ein zweites Blatt darf nichts ueberschreiben, was schon steht. Sonst gilt
   am Ende die Anschrift des letzten Blattes im Stapel. */
T.App.p = T.leeresProjekt();
T.objektangabenUebernehmen(gelesen, "Ansichten.pdf, Seite 1");
T.objektangabenUebernehmen({ plz: "49186", ort: "Bad Iburg",
  strasse: "Schloßstraße 1", bauherr: "Jemand anders",
  bauvorhaben: "Anderes Vorhaben" }, "Blatt 2");
pruefe(T.App.p.meta.plz === "33102",
  "Ein spaeteres Blatt ueberschreibt die Postleitzahl: " + T.App.p.meta.plz);
pruefe(T.App.p.meta.bauherr === "Gratian Grecu", "Ein spaeteres Blatt ueberschreibt den Bauherrn");

/* Was der Bearbeiter selbst eingetragen hat, ist unantastbar. */
const p2 = T.leeresProjekt();
T.App.p = p2;
p2.meta.plz = "44135";
T.objektangabenUebernehmen({ plz: "33102", ort: "Paderborn" }, "Blatt");
pruefe(p2.meta.plz === "44135",
  "Eine eingetragene Postleitzahl wird ueberschrieben: " + p2.meta.plz);
pruefe(!p2.meta_herkunft.plz,
  "Ein selbst eingetragener Wert bekommt faelschlich eine Herkunft");

/* Leere und unbrauchbare Angaben duerfen nichts anlegen. */
const p3 = T.leeresProjekt();
T.App.p = p3;
pruefe(T.objektangabenUebernehmen(null, "x") === false, "null darf nichts tun");
pruefe(T.objektangabenUebernehmen({ plz: null, ort: "   ", strasse: "" }, "x") === false,
  "Leere Angaben duerfen nichts eintragen");
pruefe(p3.meta.ort === "", "Ein Feld wurde mit Leerraum gefuellt");

/* Ohne Bauvorhaben, aber mit Anschrift: die Bezeichnung entsteht aus der
   Anschrift, damit das Pflichtfeld nicht den Weiterweg sperrt. */
const p4 = T.leeresProjekt();
T.App.p = p4;
T.objektangabenUebernehmen({ strasse: "Musterweg 1", ort: "Paderborn" }, "x");
pruefe(p4.meta.bezeichnung === "Musterweg 1, Paderborn",
  "Ohne Bauvorhaben entsteht keine Bezeichnung: " + p4.meta.bezeichnung);

/* Der Sammelweg ueber alle abgelegten Blaetter. */
const p5 = T.leeresProjekt();
T.App.p = p5;
p5.plan.seiten = [
  { bezeichnung: "Ansicht.pdf", objektangaben: { bauvorhaben: "Neubau", plz: null } },
  { bezeichnung: "Grundriss.pdf", objektangaben: { plz: "33102", ort: "Paderborn" } },
  { bezeichnung: "ohne.pdf" },
];
pruefe(T.objektangabenAusPlaenenSammeln() === true, "Der Sammelweg meldet nichts");
pruefe(p5.meta.bauvorhaben === undefined && p5.meta.bezeichnung === "Neubau",
  "Das Bauvorhaben des ersten Blattes fehlt");
pruefe(p5.meta.plz === "33102",
  "Ein spaeteres Blatt ergaenzt die fehlende Postleitzahl nicht: " + p5.meta.plz);

/* ========================================================================
 * 2  Angaben zur Person bleiben im Browser
 * ===================================================================== */
["bearbeiter", "bearbeiter_funktion", "eee_nummer", "erstellort"].forEach(function (k) {
  pruefe(T.BEARBEITERFELDER.indexOf(k) >= 0, "Feld " + k + " wird nicht gemerkt");
});
pruefe(T.BEARBEITERFELDER.indexOf("bezeichnung") < 0,
  "Eine Projektangabe steht in der Liste der Personenangaben");
pruefe(T.BEARBEITERFELDER.indexOf("plz") < 0,
  "Die Postleitzahl darf nicht projektuebergreifend gemerkt werden");

const p6 = T.leeresProjekt();
T.App.p = p6;
pruefe(T.bearbeiterIstGemerkt() === false, "Ohne Eintrag gilt etwas als gemerkt");
p6.meta.bearbeiter = "Sebastian Hund";
p6.meta.bearbeiter_funktion = "Energieberater";
p6.meta.eee_nummer = "EEE-123456";
T.bearbeiterMerken();
pruefe(T.bearbeiterIstGemerkt() === true, "Nach dem Merken gilt nichts als gemerkt");

/* Der eigentliche Punkt: das NAECHSTE Projekt hat sie schon. */
const p7 = T.leeresProjekt();
pruefe(p7.meta.bearbeiter === "Sebastian Hund",
  "Der Unterzeichner fehlt im neuen Projekt: " + p7.meta.bearbeiter);
pruefe(p7.meta.eee_nummer === "EEE-123456", "Die Listennummer fehlt im neuen Projekt");
pruefe(p7.meta.bearbeiter_funktion === "Energieberater", "Die Funktion fehlt im neuen Projekt");
pruefe(p7.meta.bezeichnung === "", "Eine Projektangabe wurde mitgeschleppt");
pruefe(p7.meta.plz === "", "Die Postleitzahl wurde mitgeschleppt");

/* Ein geleertes Feld bleibt geleert, sonst kommt der alte Name zurueck. */
T.App.p = p7;
p7.meta.bearbeiter = "";
T.bearbeiterMerken();
pruefe(T.leeresProjekt().meta.bearbeiter === undefined
  || T.leeresProjekt().meta.bearbeiter === "",
  "Ein geleerter Unterzeichner kommt zurueck");
pruefe(T.leeresProjekt().meta.eee_nummer === "EEE-123456",
  "Beim Leeren eines Feldes gehen die anderen mit verloren");

T.App.p = T.leeresProjekt();
T.bearbeiterVergessen();
pruefe(T.bearbeiterIstGemerkt() === false, "Das Loeschen wirkt nicht");
pruefe(T.leeresProjekt().meta.eee_nummer === "",
  "Nach dem Loeschen steht die Listennummer wieder da");

/* ========================================================================
 * 3  Flaechenstempel sind keine Masszahlen
 * ===================================================================== */
/* Gemessen: der Weg nahm die acht groessten Zahlen des Blattes. Auf einem
   Plan mit angeschriebenen Raumflaechen sind das die Flaechenstempel. */
const seiteMitStempeln = {
  breite_pt: 842, hoehe_pt: 595, drehung: 0,
  textstuecke: [
    { text: "23,64 m²", x_pt: 100, y_pt: 400, breite_pt: 30, groesse_pt: 8 },
    { text: "A = 40,45", x_pt: 200, y_pt: 400, breite_pt: 30, groesse_pt: 8 },
    { text: "OKFFB +2,54", x_pt: 300, y_pt: 400, breite_pt: 40, groesse_pt: 8 },
    { text: "4,20", x_pt: 100, y_pt: 100, breite_pt: 20, groesse_pt: 8 },
    { text: "3,80", x_pt: 200, y_pt: 100, breite_pt: 20, groesse_pt: 8 },
    { text: "22,38", x_pt: 400, y_pt: 400, breite_pt: 25, groesse_pt: 8 },
  ],
  raumstempel: [{ x_pt: 400, y_pt: 400, stempel: { name: "Wohnen", A_m2: 22.38, U_m: null } }],
};
const mz = T.masszahlenAusTextstand(seiteMitStempeln, 1);
const texte = mz.map(function (m) { return m.text; });
pruefe(texte.indexOf("23,64 m²") < 0, "Eine Quadratmeterangabe gilt als Masszahl");
pruefe(texte.indexOf("A = 40,45") < 0, "Ein Flaechenstempel gilt als Masszahl");
pruefe(texte.indexOf("OKFFB +2,54") < 0, "Eine Hoehenkote mit Text gilt als Masszahl");
pruefe(texte.indexOf("22,38") < 0,
  "Eine Zahl an der Stelle eines erkannten Raumstempels gilt als Masszahl");
pruefe(texte.indexOf("4,20") >= 0 && texte.indexOf("3,80") >= 0,
  "Die echten Masszahlen gehen verloren: " + JSON.stringify(texte));


/* ========================================================================
 * 4  Der kuerzeste Weg vom Plan zum Raumbuch: angeschriebene Flaechen
 * ========================================================================
 * Gemessen an sechs echten Unterlagensaetzen: bei keinem kam ohne Handarbeit
 * eine brauchbare Flaeche heraus. Auf jeder Vektorzeichnung mit
 * Flaechenstempeln steht sie aber als Text im Dokument. MODUL_PDF liest die
 * Bloecke seit dieser Fassung beim Ablegen; hier wird geprueft, dass sie
 * anschliessend auch jemand ABHOLT -- genau daran ist es bisher gescheitert.
 *
 * Die Zahlen und Lagen stammen vom Blatt
 * "260514 - Dumach 1 - Grundrisse M 1.100.pdf": ein A1-Bogen mit drei
 * Grundrissen und 25 Raeumen, der beste Plan im Bestand und derjenige, an
 * dem die Auslese scheiterte.
 * ===================================================================== */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "45,96 m²", x_pt: 680.2, y_pt: 441.8, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Studio", x_pt: 680.2, y_pt: 450.3, groesse_pt: 10.0, breite_pt: 28, winkel_rad: 0 },
    { text: "29,84 m²", x_pt: 684.5, y_pt: 1953.7, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Wohnen", x_pt: 684.5, y_pt: 1962.1, groesse_pt: 10.0, breite_pt: 32, winkel_rad: 0 },
    { text: "Kochen/ Essen/", x_pt: 684.5, y_pt: 1972.1, groesse_pt: 10.0, breite_pt: 60, winkel_rad: 0 },
    { text: "9,39 m²", x_pt: 771.2, y_pt: 1727.7, groesse_pt: 8.0, breite_pt: 28, winkel_rad: 0 },
    { text: "Bad", x_pt: 771.2, y_pt: 1736.2, groesse_pt: 10.0, breite_pt: 18, winkel_rad: 0 },
    { text: "Grundriss EG", x_pt: 617.2, y_pt: 1658.4, groesse_pt: 14.0, breite_pt: 70, winkel_rad: 0 },
    { text: "Grundriss DG", x_pt: 617.2, y_pt: 237.1, groesse_pt: 14.0, breite_pt: 70, winkel_rad: 0 },
  ];
  const blatt = {
    bezeichnung: "Dumach 1, Seite 1", typ: "vektorplan",
    breite_pt: 1684, hoehe_pt: 2384, drehung: 0,
    textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke),
    geschosstitel: MP.geschosstitelLesen(stuecke),
    blattkopf: { blattart: "grundriss", geschoss: "eg" },
  };
  pruefe(blatt.raumbloecke.length === 3,
    "MODUL_PDF findet nicht alle drei Bloecke, sondern " + blatt.raumbloecke.length);

  /* =====================================================================
   * HASENBERG: die Flaeche steht im Plan, das Werkzeug sah sie nicht
   * =====================================================================
   * GEMESSEN am 27.08.2026 an "Hasenberg_10_Grundrisse_290425.pdf": im
   * Textstand beider Blaetter stehen ALLE 20 Raumflaechen, zusammen
   * 280,76 m2 -- und das Werkzeug erkannte NULL davon. Der Plan wurde
   * stattdessen vom Modell abgelesen und geschaetzt; im Echtlauf kamen
   * 12 Raeume und 181,15 m2 heraus.
   * Drei Ursachen, alle drei hier festgenagelt. Die Koordinaten und
   * Schriftgroessen sind die echten aus dem Blatt. */
  {
    /* URSACHE 1: das Quadratzeichen ist ein EIGENES Textstueck.
       Das CAD setzt "NGF: 6,76 m" und danach eine kleinere, hoeher
       stehende "2". raumstempelLesen sah nur "... m" und gab null zurueck,
       womit nicht einmal ein Raumblock entstand. */
    const roh = [
      { text: "Empfang", x_pt: 419.3, y_pt: 392.5, groesse_pt: 5.8, breite_pt: 21, winkel_rad: 0 },
      { text: "NGF: 6,76 m", x_pt: 419.3, y_pt: 385.3, groesse_pt: 4.9, breite_pt: 27.8, winkel_rad: 0 },
      { text: "2", x_pt: 447.1, y_pt: 387.0, groesse_pt: 3.2, breite_pt: 1.8, winkel_rad: 0 },
    ];
    const zus = MP.hochstellungenAnfuegen
      ? MP.hochstellungenAnfuegen(roh.map(function (x) { return Object.assign({}, x); }))
      : null;
    pruefe(!!zus, "MODUL_PDF muss hochstellungenAnfuegen anbieten");
    pruefe(zus && zus.length === 2,
      "Das hochgestellte Zeichen muss verschwinden, statt als eigenes Stueck "
      + "mitzulaufen; es sind " + (zus && zus.length));
    pruefe(zus && zus[1] && zus[1].text === "NGF: 6,76 m²",
      "Die Hochstellung muss an ihr Stueck: " + JSON.stringify(zus && zus[1] && zus[1].text));
    /* Gegenprobe: eine gewoehnliche Ziffer darf NICHT angehaengt werden,
       sonst wird aus "Haus 2" ein "Haus²". Gleiche Schriftgroesse,
       gleiche Grundlinie. */
    const nicht = MP.hochstellungenAnfuegen([
      { text: "Bauteil m", x_pt: 100, y_pt: 200, groesse_pt: 8, breite_pt: 30, winkel_rad: 0 },
      { text: "2", x_pt: 131, y_pt: 200, groesse_pt: 8, breite_pt: 4, winkel_rad: 0 },
    ]);
    pruefe(nicht.length === 2 && nicht[0].text === "Bauteil m",
      "Eine gleich grosse Ziffer auf derselben Grundlinie ist keine Hochstellung: "
      + JSON.stringify(nicht.map(function (x) { return x.text; })));
  }
  {
    /* URSACHE 2: "NGF" ist die Beschriftung der Flaeche, kein Raumname.
       Sie landete als Name im Block, griff dort in SAMMELSTEMPEL und der
       Block flog als vermeintliche Summe raus. */
    const r = MP.raumstempelLesen("NGF: 6,76 m²");
    pruefe(r && r.A_m2 === 6.76,
      "Die Flaeche muss gelesen werden: " + JSON.stringify(r));
    pruefe(r && r.name === null,
      "„NGF“ ist kein Raumname, sonst greift SAMMELSTEMPEL: "
      + JSON.stringify(r && r.name));
    /* Und der echte Summenstempel muss weiter einer bleiben. */
    const sum = MP.raumbloeckeLesen([
      { text: "Wohnfläche:", x_pt: 100, y_pt: 210, groesse_pt: 6, breite_pt: 30, winkel_rad: 0 },
      { text: "193,16 m²", x_pt: 100, y_pt: 202, groesse_pt: 6, breite_pt: 30, winkel_rad: 0 },
    ]);
    pruefe(sum.length === 1 && sum[0].sammel === true,
      "Ein echter Summenstempel muss sammel bleiben: " + JSON.stringify(sum));
    /* Ganze Kette an den echten Stuecken: Name oben, NGF-Flaeche darunter. */
    const kette = MP.raumbloeckeLesen(MP.hochstellungenAnfuegen([
      { text: "Empfang", x_pt: 419.3, y_pt: 392.5, groesse_pt: 5.8, breite_pt: 21, winkel_rad: 0 },
      { text: "NGF: 6,76 m", x_pt: 419.3, y_pt: 385.3, groesse_pt: 4.9, breite_pt: 27.8, winkel_rad: 0 },
      { text: "2", x_pt: 447.1, y_pt: 387.0, groesse_pt: 3.2, breite_pt: 1.8, winkel_rad: 0 },
    ]));
    pruefe(kette.length === 1 && kette[0].name === "Empfang" && kette[0].A_m2 === 6.76
           && kette[0].sammel === false,
      "Aus Name plus NGF-Zeile muss ein benannter Raum werden: " + JSON.stringify(kette));
  }
  {
    /* URSACHE 3: eine angeschriebene Flaeche OHNE Namen wurde weggeworfen.
       Am Hasenberg-Blatt traf das genau eine, "35,48 m²" im linken
       Baukoerper, und mit ihr fielen 35,48 der 280,76 m2 still aus dem
       Raumbuch. Sie bekommt jetzt eine laufende Nummer und wird gefragt. */
    const bl = MP.raumbloeckeLesen([
      { text: "35,48 m²", x_pt: 300, y_pt: 500, groesse_pt: 6, breite_pt: 30, winkel_rad: 0 },
    ]);
    pruefe(bl.length === 1 && bl[0].name === null && bl[0].A_m2 === 35.48,
      "Eine nackte Flaeche muss als namenloser Block ankommen: " + JSON.stringify(bl));
    const seite = { bezeichnung: "Hasenberg S1", typ: "vektorplan",
      breite_pt: 1190.55, hoehe_pt: 841.89, drehung: 0,
      textstuecke: [], raumbloecke: bl, geschosstitel: [],
      blattkopf: { blattart: "grundriss", geschoss: "eg" } };
    const raeume = T.stempelraeumeDesBlatts(seite);
    pruefe(raeume.length === 1,
      "Die namenlose Flaeche darf nicht verschwinden, es kamen "
      + raeume.length + " Raeume");
    pruefe(raeume[0] && raeume[0].A === 35.48,
      "und ihre Flaeche muss unveraendert ankommen: " + JSON.stringify(raeume[0]));
    pruefe(raeume[0] && raeume[0].name === "Raum 1",
      "sie bekommt eine laufende Nummer: " + JSON.stringify(raeume[0] && raeume[0].name));
    pruefe(raeume[0] && raeume[0].name_fehlt === true,
      "und ist als namenlos gekennzeichnet, damit danach gefragt wird: "
      + JSON.stringify(raeume[0] && raeume[0].name_fehlt));
    /* Ein Summenstempel ohne Namen bleibt draussen -- der Schutz sitzt VOR
       der Nummernvergabe. */
    const sumSeite = Object.assign({}, seite, { raumbloecke: MP.raumbloeckeLesen([
      { text: "Wohnfläche gesamt:", x_pt: 300, y_pt: 520, groesse_pt: 6, breite_pt: 60, winkel_rad: 0 },
      { text: "193,16 m²", x_pt: 300, y_pt: 512, groesse_pt: 6, breite_pt: 30, winkel_rad: 0 },
    ]) });
    pruefe(T.stempelraeumeDesBlatts(sumSeite).length === 0,
      "Ein Summenstempel darf auch weiterhin kein Raum werden");
  }
  {
    /* URSACHE 3b: der namenlose Raum darf danach nicht DOPPELT zaehlen.
       GEMESSEN am 27.08.2026 im Echtlauf: der Stempelweg legte "Raum 1"
       mit 35,48 m2 an, die Auslese lieferte denselben Raum unter seinem
       Namen, und ueber den Namen fanden sie nicht zueinander. Im Raumbuch
       standen 21 Raeume mit 316,24 m2 statt 20 mit 280,76 -- die 35,48
       doppelt. Zusammengefuehrt wird ueber die Flaeche im selben Geschoss. */
    const p2 = T.leeresProjekt();
    T.App.p = p2;
    const bl2 = MP.raumbloeckeLesen([
      { text: "35,48 m²", x_pt: 300, y_pt: 500, groesse_pt: 6, breite_pt: 30, winkel_rad: 0 },
    ]);
    const seite2 = { bezeichnung: "Hasenberg S1", name: "Hasenberg S1",
      typ: "vektorplan", breite_pt: 1190.55, hoehe_pt: 841.89, drehung: 0,
      textstuecke: [], raumbloecke: bl2, geschosstitel: [],
      blattkopf: { blattart: "grundriss", geschoss: "eg" },
      auslese: { ist_grundriss: true, raeume: [
        { bezeichnung: "Kochen/Essen/Wohnen", geschoss: "EG", raumart: "Wohnen",
          flaeche_m2: 35.48, lichte_hoehe_m: 2.5, fenster: 3, konfidenz: "sicher" },
      ] } };
    p2.plan = { seiten: [seite2] };
    T.raeumeAusAusleseUebernehmen();
    const sum2 = p2.raeume.reduce(function (a, x) { return a + (Number(x.A) || 0); }, 0);
    pruefe(p2.raeume.length === 1,
      "Namenlose Flaeche und gelesener Raum muessen EIN Raum sein, es sind "
      + p2.raeume.length + ": "
      + JSON.stringify(p2.raeume.map(function (x) { return x.name + " " + x.A; })));
    pruefe(Math.abs(sum2 - 35.48) < 0.005,
      "Die Flaeche darf nicht doppelt zaehlen, sie ist " + sum2.toFixed(2));
    pruefe(p2.raeume[0] && p2.raeume[0].name === "Kochen/Essen/Wohnen",
      "Der Platzhalter muss den gelesenen Namen bekommen: "
      + JSON.stringify(p2.raeume[0] && p2.raeume[0].name));
    pruefe(p2.raeume[0] && !p2.raeume[0].name_fehlt,
      "und gilt danach nicht mehr als namenlos");
    pruefe(p2.raeume[0] && p2.raeume[0].fenster === 3,
      "Was nur die Auslese kennt, muss hinzukommen: fenster="
      + JSON.stringify(p2.raeume[0] && p2.raeume[0].fenster));
    pruefe(p2.raeume[0] && p2.raeume[0].herkunft
           && /kein Raumname/.test(p2.raeume[0].herkunft.name_quelle || ""),
      "und woher der Name stammt, muss in der Herkunft stehen");
  }
  {
    /* Gegenprobe: ZWEI verschiedene Flaechen duerfen NICHT verschmelzen.
       Sonst zoege die Regel Raeume zusammen, die nur zufaellig aehnlich
       gross sind. */
    const p3 = T.leeresProjekt();
    T.App.p = p3;
    const seite3 = { bezeichnung: "Blatt X", name: "Blatt X", typ: "vektorplan",
      breite_pt: 1190.55, hoehe_pt: 841.89, drehung: 0,
      textstuecke: [], geschosstitel: [],
      raumbloecke: MP.raumbloeckeLesen([
        { text: "35,48 m²", x_pt: 300, y_pt: 500, groesse_pt: 6, breite_pt: 30, winkel_rad: 0 },
      ]),
      blattkopf: { blattart: "grundriss", geschoss: "eg" },
      auslese: { ist_grundriss: true, raeume: [
        { bezeichnung: "Wohnen", geschoss: "EG", raumart: "Wohnen",
          flaeche_m2: 36.10, konfidenz: "sicher" },
      ] } };
    p3.plan = { seiten: [seite3] };
    T.raeumeAusAusleseUebernehmen();
    pruefe(p3.raeume.length === 2,
      "Zwei verschieden grosse Raeume duerfen nicht verschmelzen, es sind "
      + p3.raeume.length);
  }

  const p = T.leeresProjekt();
  T.App.p = p;
  p.plan = { seiten: [blatt] };
  const n = T.raeumeAusStempelnUebernehmen(0);
  pruefe(n === 3, "Es kommen nicht drei Raeume ins Raumbuch, sondern " + n);
  pruefe(p.raeume.length === 3, "Das Raumbuch hat " + p.raeume.length + " Zeilen");

  const studio = p.raeume.find(function (r) { return r.name === "Studio"; });
  pruefe(!!studio, "Der Raum Studio fehlt");
  pruefe(studio && studio.A === 45.96,
    "Die Flaeche kommt nicht exakt an: " + (studio && studio.A));
  /* KANONISCHE SCHREIBWEISE. MODUL_PDF fuehrt die Geschossschluessel klein
     ("dg", "eg"), die Auslese ueber KERN_ZUORDNUNG gross ("DG", "EG"). Bis
     zum 24.08.2026 kamen die kleinen ungefiltert ins Raumbuch, und neben
     einem "OG" aus der Auslese stand ein zweites Geschoss "og" — jede
     Flaechensumme doppelt (Abnahmebefund: 39 Raeume, 59,70 kW). Der
     Stempelweg muss deshalb die grosse, kanonische Form liefern. */
  pruefe(studio && studio.geschoss === "DG",
    "Studio gehoert ins Dachgeschoss (kanonisch DG), steht in: " + (studio && studio.geschoss));
  const wohnen = p.raeume.find(function (r) { return /Kochen/.test(r.name); });
  pruefe(wohnen && wohnen.geschoss === "EG",
    "Kochen/Essen/Wohnen gehoert ins Erdgeschoss (kanonisch EG), steht in: "
      + (wohnen && wohnen.geschoss));
  pruefe(T.geschossKanon("og") === "OG" && T.geschossKanon("OG") === "OG"
      && T.geschossKanon("eg") === "EG" && T.geschossKanon("1.OG") === "1.OG",
    "geschossKanon bringt nicht jede Schreibweise auf dasselbe Kuerzel");
  pruefe(T.geschossKanon("sp") === "sp" && T.geschossKanon("") === "",
    "Was sich nicht einordnen laesst, muss unveraendert bleiben");
  pruefe(wohnen && wohnen.A === 29.84, "29,84 m2 kommen nicht an: " + (wohnen && wohnen.A));

  /* Herkunft: jede Flaeche muss sagen, woher sie kommt. Eine gelesene ist
     etwas anderes als eine gemessene oder eine eingetragene. */
  pruefe(studio && studio.herkunft && studio.herkunft.flaeche_gelesen === true,
    "Die Flaeche traegt nicht den Vermerk, dass sie gelesen ist");
  pruefe(studio && /Textstand/.test(studio.herkunft.flaeche_quelle || ""),
    "Die Herkunft nennt den Textstand nicht: "
      + (studio && studio.herkunft.flaeche_quelle));
  pruefe(studio && /45,96/.test(studio.herkunft.flaeche_quelle || ""),
    "Der Wortlaut aus dem Plan steht nicht in der Herkunft");
  /* Kein Massstab noetig: die Zahl steht im Dokument. Genau das unterscheidet
     diesen Weg vom Umfahren. */
  pruefe(!blatt.massstab, "Der Weg darf keinen Massstab voraussetzen");
  pruefe(blatt.stempelUebernommen === 3, "Das Blatt merkt sich die Uebernahme nicht");

  /* Ein zweiter Klick darf nicht doppelt anlegen. Bis zum 24.08.2026 stand
     hier die Erwartung "ein zweiter Satz entsteht, nur die Karte verhindert
     ihn" -- und genau dieser zweite Satz ist in der Abnahme durchgekommen:
     "25 Raeume uebernehmen" ADDIERTE nach der Analyse, 39 Raeume, 59,70 kW.
     Jetzt ERSETZT die Uebernahme: gleicher Name und gleiches Geschoss auf
     demselben Blatt heisst derselbe Raum. Drei bleiben drei. */
  const vorher = p.raeume.length;
  T.raeumeAusStempelnUebernehmen(0);
  pruefe(p.raeume.length === vorher,
    "Ein zweiter Klick legt die Raeume erneut an: " + p.raeume.length
      + " statt " + vorher);
  pruefe(p.raeume.find(function (r) { return r.name === "Studio"; }).A === 45.96,
    "Beim Ersetzen geht die gelesene Flaeche verloren");

  /* Die Karte selbst: der Uebernehmen-Knopf ist bewusst KEIN gelber
     Handlungsknopf. Gelb gehoert auf dem Unterlagen-Schritt der Analyse
     bzw. dem "Weiter zu den Rueckfragen" des Urteils; zwei gelbe Knoepfe
     nebeneinander waren ein Abnahmebefund vom 24.08.2026. */
  blatt.stempelUebernommen = 0;
  const karte = T.stempelKarte([blatt]);
  pruefe(/data-aktion="stempelUebernehmen"/.test(karte),
    "Die Karte bietet die Uebernahme nicht mehr an");
  pruefe(!/class="btn[^"]*\bcta\b/.test(karte),
    "Der Uebernehmen-Knopf ist wieder ein gelber Handlungsknopf -- Gelb ist "
      + "fuer die EINE Handlung des Bildschirms reserviert");
  blatt.stempelUebernommen = 3;
}

/* ========================================================================
 * 4b  ERST die Analyse, DANN der Uebernehmen-Knopf: ersetzen, nie addieren
 * ========================================================================
 * Der Abnahmebefund vom 24.08.2026 woertlich: "'25 Raeume uebernehmen' hat
 * die Raeume ADDIERT statt ersetzt -- 39 Raeume, OG doppelt als 'OG' und
 * 'og', 59,70 kW. Wer dem Knopf glaubt, bestellt den doppelten Kessel."
 * Zwei Fehler darin: die Addition selbst, und dass 'OG' und 'og' als
 * verschiedene Geschosse galten. Hier laeuft genau diese Reihenfolge: die
 * Auslese uebernimmt die Raeume (Geschoss gross, wie KERN_ZUORDNUNG es
 * liefert), danach drueckt jemand den Knopf der Stempelkarte (Geschoss kam
 * dort bisher klein aus MODUL_PDF).
 * ===================================================================== */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "29,84 m²", x_pt: 684.5, y_pt: 1953.7, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Wohnen", x_pt: 684.5, y_pt: 1962.1, groesse_pt: 10.0, breite_pt: 32, winkel_rad: 0 },
    { text: "9,39 m²", x_pt: 771.2, y_pt: 1727.7, groesse_pt: 8.0, breite_pt: 28, winkel_rad: 0 },
    { text: "Bad", x_pt: 771.2, y_pt: 1736.2, groesse_pt: 10.0, breite_pt: 18, winkel_rad: 0 },
    { text: "45,96 m²", x_pt: 680.2, y_pt: 441.8, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Schlafen", x_pt: 680.2, y_pt: 450.3, groesse_pt: 10.0, breite_pt: 28, winkel_rad: 0 },
    { text: "Grundriss EG", x_pt: 617.2, y_pt: 1658.4, groesse_pt: 14.0, breite_pt: 70, winkel_rad: 0 },
    { text: "Grundriss OG", x_pt: 617.2, y_pt: 237.1, groesse_pt: 14.0, breite_pt: 70, winkel_rad: 0 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  const blatt = {
    bezeichnung: "Bogen EG+OG", name: "Bogen EG+OG", typ: "vektorplan",
    breite_pt: 1684, hoehe_pt: 2384, drehung: 0,
    textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke),
    geschosstitel: MP.geschosstitelLesen(stuecke),
    blattkopf: { blattart: "grundriss" },
    auslese: { raeume: [
      { bezeichnung: "Wohnen", raumart: "Wohnen", geschoss: "EG", flaeche_m2: 29.8, fenster: 2 },
      { bezeichnung: "Bad", raumart: "Bad", geschoss: "EG", flaeche_m2: 9.4 },
      { bezeichnung: "Schlafen", raumart: "Schlafen", geschoss: "OG", flaeche_m2: 45.9 },
    ] },
  };
  p.plan = { seiten: [blatt] };
  T.raeumeAusAusleseUebernehmen();
  pruefe(p.raeume.length === 3,
    "Die Auslese muss drei Raeume uebernehmen, sind " + p.raeume.length);

  const n = T.raeumeAusStempelnUebernehmen(0);
  pruefe(p.raeume.length === 3,
    "Der Uebernehmen-Knopf nach der Analyse ADDIERT wieder: "
      + p.raeume.length + " Raeume statt 3 -- der doppelte Kessel.");
  pruefe(n === 3, "Die Uebernahme meldet nicht alle drei behandelten Raeume: " + n);
  pruefe(T.App.uebernahme && T.App.uebernahme.ersetzt === 3
      && T.App.uebernahme.neu === 0,
    "Die Uebernahme sagt nicht, dass sie ersetzt statt angelegt hat: "
      + JSON.stringify(T.App.uebernahme));
  /* 'OG' = 'og': kein Raum darf in einem kleingeschriebenen Geschoss landen,
     und es darf keine zwei Obergeschosse geben. */
  const geschosse = [];
  p.raeume.forEach(function (r) {
    if (geschosse.indexOf(r.geschoss) < 0) geschosse.push(r.geschoss);
  });
  pruefe(geschosse.slice().sort().join(",") === "EG,OG",
    "Die Geschosse sind nicht kanonisch: " + JSON.stringify(geschosse));
  /* Die Flaeche aus dem Textstand schlaegt die abgelesene. */
  const wohnenR = p.raeume.find(function (r) { return r.name === "Wohnen"; });
  pruefe(wohnenR && wohnenR.A === 29.84,
    "Beim Ersetzen muss die im Plan angeschriebene Flaeche gelten: "
      + (wohnenR && wohnenR.A));
  pruefe(wohnenR && wohnenR.fenster === 2,
    "Beim Ersetzen darf die Fensterzahl der Auslese nicht verloren gehen: "
      + (wohnenR && wohnenR.fenster));
  /* Und ein Raum, den nur der Stempel kennt, kommt weiterhin dazu. */
  const stuecke2 = stuecke.concat([
    { text: "5,12 m²", x_pt: 900.0, y_pt: 1700.0, groesse_pt: 8.0, breite_pt: 28, winkel_rad: 0 },
    { text: "Abstellraum", x_pt: 900.0, y_pt: 1708.4, groesse_pt: 10.0, breite_pt: 40, winkel_rad: 0 },
  ]);
  blatt.textstuecke = stuecke2;
  blatt.raumbloecke = MP.raumbloeckeLesen(stuecke2);
  blatt.stempelUebernommen = 0;
  T.raeumeAusStempelnUebernehmen(0);
  pruefe(p.raeume.length === 4,
    "Ein Raum, den nur der Stempel kennt, muss weiterhin dazukommen: "
      + p.raeume.length + " statt 4");
  pruefe(T.App.uebernahme && T.App.uebernahme.neu === 1
      && T.App.uebernahme.ersetzt === 3,
    "Die Zaehlung neu/ersetzt stimmt nicht: " + JSON.stringify(T.App.uebernahme));
}

/* Eine Summe ist kein Raum, ein Lageplan liefert keine Raeume. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "4.289 m²", x_pt: 100, y_pt: 100, groesse_pt: 8, breite_pt: 30, winkel_rad: 0 },
    { text: "GRUNDSTÜCKE GESAMT ca.", x_pt: 100, y_pt: 109, groesse_pt: 8, breite_pt: 90, winkel_rad: 0 },
    { text: "66,11 m²", x_pt: 300, y_pt: 100, groesse_pt: 8, breite_pt: 30, winkel_rad: 0 },
    { text: "Haus A", x_pt: 300, y_pt: 109, groesse_pt: 8, breite_pt: 30, winkel_rad: 0 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  p.plan = { seiten: [{ bezeichnung: "Lageplan", textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke),
    geschosstitel: MP.geschosstitelLesen(stuecke),
    blattkopf: { blattart: "lageplan" } }] };
  pruefe(T.raeumeAusStempelnUebernehmen(0) === 0,
    "Aus einem Lageplan duerfen keine Raeume entstehen");
  p.plan.seiten[0].blattkopf = { blattart: "grundriss" };
  T.raeumeAusStempelnUebernehmen(0);
  pruefe(p.raeume.length === 1 && p.raeume[0].name === "Haus A",
    "Die Summe wandert ins Raumbuch: "
      + JSON.stringify(p.raeume.map(function (r) { return r.name; })));
}

/* Der Textstand schlaegt das Modell.
   Gemessen: die Auslese lieferte Raeume mit A = 0, obwohl die Flaeche im Plan
   steht. Traegt das Blatt genau einen Stempel mit diesem Namen, gilt dessen
   Zahl -- und die Abweichung wird als offene Frage festgehalten. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "12,57 m²", x_pt: 690.1, y_pt: 1727.7, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Schlafen", x_pt: 690.1, y_pt: 1736.2, groesse_pt: 10.0, breite_pt: 40, winkel_rad: 0 },
  ];
  const blatt = { bezeichnung: "Blatt", textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke),
    geschosstitel: [], blattkopf: { blattart: "grundriss", geschoss: "eg" } };
  const treffer = T.flaecheAusStempel(blatt, "Schlafen");
  pruefe(treffer && treffer.A === 12.57,
    "Der Stempel wird ueber den Namen nicht gefunden");
  pruefe(T.flaecheAusStempel(blatt, "Bad") === null,
    "Ein Name ohne Stempel darf keine Flaeche bekommen");
  /* Zwei gleichnamige Raeume auf einem Blatt: dann lieber keine Zuordnung.
     Am Blatt "Dumach 1" heisst dreimal ein Raum "Flur". */
  const doppelt = [
    { text: "6,86 m²", x_pt: 736.2, y_pt: 1811.0, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Flur", x_pt: 736.2, y_pt: 1819.4, groesse_pt: 10.0, breite_pt: 20, winkel_rad: 0 },
    { text: "6,70 m²", x_pt: 951.0, y_pt: 1832.0, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Flur", x_pt: 951.0, y_pt: 1840.4, groesse_pt: 10.0, breite_pt: 20, winkel_rad: 0 },
  ];
  const blatt2 = { bezeichnung: "Blatt", textstuecke: doppelt,
    raumbloecke: MP.raumbloeckeLesen(doppelt),
    geschosstitel: [], blattkopf: { blattart: "grundriss" } };
  pruefe(T.flaecheAusStempel(blatt2, "Flur") === null,
    "Bei zwei gleichnamigen Raeumen darf nichts zugeordnet werden");
}


/* Erst die Stempel uebernehmen, dann doch noch auslesen lassen: der Raum darf
   nicht zweimal im Raumbuch stehen. Was nur das Modell kennt, kommt dazu. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "53,04 m²", x_pt: 292.4, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 34, winkel_rad: Math.PI / 2 },
    { text: "Schlafen / Bad", x_pt: 281.2, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 52, winkel_rad: Math.PI / 2 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  const blatt = { bezeichnung: "Maas OG", name: "Maas OG", textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke), geschosstitel: [],
    blattkopf: { blattart: "grundriss", geschoss: "og" } };
  p.plan = { seiten: [blatt] };
  T.raeumeAusStempelnUebernehmen(0);
  pruefe(p.raeume.length === 1, "Der Stempelraum fehlt");
  blatt.auslese = { raeume: [
    { bezeichnung: "Schlafen / Bad", raumart: "Schlafen", flaeche_m2: 41.0 },
    { bezeichnung: "Ankleide", raumart: "Ankleide" },
  ] };
  T.raeumeAusAusleseUebernehmen();
  const namen = p.raeume.map(function (r) { return r.name; });
  pruefe(namen.filter(function (n) { return /Schlafen/.test(n); }).length === 1,
    "Der Raum steht doppelt im Raumbuch: " + JSON.stringify(namen));
  pruefe(namen.indexOf("Ankleide") >= 0,
    "Ein Raum, den nur das Modell kennt, geht verloren: " + JSON.stringify(namen));
  const sb = p.raeume.find(function (r) { return /Schlafen/.test(r.name); });
  pruefe(sb && sb.A === 53.04,
    "Die gelesene Flaeche wurde von der Auslese ueberschrieben: " + (sb && sb.A));
}

/* Derselbe Fall, aber die Auslese weiss mehr als der Stempel: Fensterzahl,
   Aussenwaende, lichte Hoehe. Bisher wurde der Raum nur uebersprungen, und
   genau diese Angaben gingen verloren -- an ihre Stelle trat die Annahme aus
   der Grundflaeche. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "53,04 m²", x_pt: 292.4, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 34, winkel_rad: Math.PI / 2 },
    { text: "Schlafen / Bad", x_pt: 281.2, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 52, winkel_rad: Math.PI / 2 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  const blatt = { bezeichnung: "Maas OG", name: "Maas OG", textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke), geschosstitel: [],
    blattkopf: { blattart: "grundriss", geschoss: "og" } };
  p.plan = { seiten: [blatt] };
  T.raeumeAusStempelnUebernehmen(0);
  blatt.auslese = { raeume: [{ bezeichnung: "Schlafen / Bad", raumart: "Schlafen",
    flaeche_m2: 41.0, fenster: 4, aussenwaende: 2, lichte_hoehe_m: 2.38 }] };
  T.raeumeAusAusleseUebernehmen();
  const sb = p.raeume.find(function (r) { return /Schlafen/.test(r.name); });
  pruefe(p.raeume.length === 1, "Der Raum darf nicht doppelt entstehen");
  pruefe(sb && sb.A === 53.04, "Der Textstand bleibt massgebend: " + (sb && sb.A));
  pruefe(sb && sb.fenster === 4,
    "Die gelesene Fensterzahl muss ankommen: " + (sb && sb.fenster));
  pruefe(sb && sb.aussenwaende === 2,
    "Die Zahl der Aussenwaende muss ankommen: " + (sb && sb.aussenwaende));
  pruefe(sb && sb.h === 2.38, "Die gelesene Hoehe muss ankommen: " + (sb && sb.h));
  pruefe(sb && /Fensterzahl/.test((sb.herkunft || {}).ergaenzt_aus_auslese || ""),
    "Die Ergaenzung muss in der Herkunft stehen");
  pruefe((p.offeneFragen || []).some(function (f) { return f.thema === "Fläche"; }),
    "Auch beim Ergaenzen muss die abweichende Flaeche eine offene Frage geben");
}

/* Ohne vorherige Uebernahme gilt der Textstand trotzdem: das Modell liefert
   41 m2, im Plan stehen 53,04 -- der Plan gewinnt, und die Abweichung wird
   als offene Frage festgehalten statt still verschluckt. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "53,04 m²", x_pt: 292.4, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 34, winkel_rad: Math.PI / 2 },
    { text: "Schlafen / Bad", x_pt: 281.2, y_pt: 646.3, groesse_pt: 8.4, breite_pt: 52, winkel_rad: Math.PI / 2 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  p.plan = { seiten: [{ bezeichnung: "Maas OG", name: "Maas OG", textstuecke: stuecke,
    raumbloecke: MP.raumbloeckeLesen(stuecke), geschosstitel: [],
    blattkopf: { blattart: "grundriss", geschoss: "og" },
    auslese: { raeume: [{ bezeichnung: "Schlafen / Bad", raumart: "Schlafen", flaeche_m2: 41.0 }] } }] };
  T.raeumeAusAusleseUebernehmen();
  pruefe(p.raeume.length === 1 && p.raeume[0].A === 53.04,
    "Der Textstand schlaegt die abgelesene Zahl nicht: "
      + JSON.stringify(p.raeume.map(function (r) { return r.A; })));
  pruefe(/Textstand/.test(p.raeume[0].herkunft.flaeche_quelle || ""),
    "Die Herkunft nennt den Textstand nicht");
  pruefe((p.offeneFragen || []).some(function (f) { return f.thema === "Fläche"; }),
    "Die Abweichung zwischen Modell und Plan wird verschwiegen");
}

/* Der Textstand geht vor — fuer das GANZE Blatt, nicht nur je namensgleichem
   Raum. GEMESSEN am 24.08.2026 am Blatt "260514 - Dumach 1 - Grundrisse"
   (25 Flaechenstempel, 370,44 m²): die Auslese sah weniger Raeume, die
   Uebernahme baute das Raumbuch aus dem Modell, und im Urteil stand
   "14 Raeume" ueber der Stempelzeile "25 Raeume, zusammen 370,44 m²".
   Jetzt uebernimmt die Auslese-Uebernahme zuerst die Stempel des Blattes;
   Kachel und Stempelzeile speisen sich damit aus demselben Raumbuch. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "45,96 m²", x_pt: 680.2, y_pt: 441.8, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Studio", x_pt: 680.2, y_pt: 450.3, groesse_pt: 10.0, breite_pt: 28, winkel_rad: 0 },
    { text: "29,84 m²", x_pt: 684.5, y_pt: 1953.7, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Wohnen", x_pt: 684.5, y_pt: 1962.1, groesse_pt: 10.0, breite_pt: 32, winkel_rad: 0 },
    { text: "9,39 m²", x_pt: 771.2, y_pt: 1727.7, groesse_pt: 8.0, breite_pt: 28, winkel_rad: 0 },
    { text: "Bad", x_pt: 771.2, y_pt: 1736.2, groesse_pt: 10.0, breite_pt: 18, winkel_rad: 0 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  const blatt = { bezeichnung: "Dumach 1, Seite 1", name: "Dumach 1, Seite 1",
    textstuecke: stuecke, raumbloecke: MP.raumbloeckeLesen(stuecke),
    geschosstitel: [], blattkopf: { blattart: "grundriss", geschoss: "eg" },
    /* Das Modell hat nur EINEN der drei Stempelraeume gesehen, mit einer
       vom Bild abgelesenen (falschen) Flaeche. */
    auslese: { raeume: [{ bezeichnung: "Studio", raumart: "Wohnen",
      flaeche_m2: 51.0 }] } };
  p.plan = { seiten: [blatt] };
  pruefe(!blatt.stempelUebernommen, "Vorbedingung: Stempel noch nicht uebernommen");
  T.raeumeAusAusleseUebernehmen();
  pruefe(blatt.stempelUebernommen === 3,
    "Die Auslese-Uebernahme muss die Stempel des Blattes zuerst nehmen, "
      + "uebernommen: " + blatt.stempelUebernommen);
  pruefe(p.raeume.length === 3,
    "Alle drei Stempelraeume gehoeren ins Raumbuch, es sind " + p.raeume.length);
  const summe = Math.round(p.raeume.reduce(function (a, r) {
    return a + (r.A > 0 ? r.A : 0); }, 0) * 100) / 100;
  pruefe(summe === 85.19,
    "Die Flaechen muessen aus dem Textstand stammen (85,19 m²), nicht aus dem "
      + "Modell: " + summe);
  pruefe(p.raeume.filter(function (r) { return r.name === "Studio"; }).length === 1,
    "Der vom Modell gesehene Raum darf nicht doppelt entstehen");
}

/* Eine gelesene lichte Hoehe darf nicht durch den Rueckfall 2,60 m ersetzt
   werden. GEMESSEN am 22.08.2026 im Browser: die Auslese lieferte 2,45 m, im
   Raumbuch standen danach 2,60 m -- hoehenUebernehmen() setzt jede Raumhoehe
   aus der Geschosshoehe, und ohne Schnitt ist die der Rueckfallwert. Erkannt
   wird die gelesene Hoehe nur an herkunft.hoehe_quelle. */
{
  const p = T.leeresProjekt();
  T.App.p = p;
  p.plan = { seiten: [{ bezeichnung: "KG-Plan", name: "KG-Plan", textstuecke: [],
    raumbloecke: [], geschosstitel: [],
    blattkopf: { blattart: "grundriss", geschoss: "kg" },
    auslese: { raeume: [
      { bezeichnung: "Gemeinderaum", raumart: "Wohnen", flaeche_m2: 48.5,
        lichte_hoehe_m: 2.45, aussenwaende: 2, fenster: 3 },
      { bezeichnung: "Abstellraum", raumart: "Abstellraum", flaeche_m2: 6.0 }] } }] };
  T.raeumeAusAusleseUebernehmen();
  const gr = p.raeume.find(function (r) { return r.name === "Gemeinderaum"; });
  pruefe(gr && gr.h === 2.45,
    "Die gelesene lichte Hoehe wurde durch den Rueckfall ersetzt: " + (gr && gr.h));
  pruefe(gr && /angeschrieben/.test((gr.herkunft || {}).hoehe_quelle || ""),
    "Die Herkunft der gelesenen Hoehe fehlt");
  const ab = p.raeume.find(function (r) { return r.name === "Abstellraum"; });
  pruefe(ab && ab.h === 2.6 && (ab.herkunft || {}).hoehe_angenommen === true,
    "Ohne gelesene Hoehe muss der Rueckfall greifen und als Annahme stehen: "
      + (ab && ab.h));

  /* Die Fensterzeile eines Raums traegt die Zahl der Fenster, sonst zaehlt
     das Kontrollblatt Zeilen gegen Fenster. */
  p.bauteiltypen = [
    { id: "tw", name: "Außenwand", U: 0.6 }, { id: "tf", name: "Fenster", U: 2.7 },
    { id: "td", name: "Dach", U: 0.4 }, { id: "tb", name: "Kellerdecke", U: 0.5 }];
  T.bauteileErgaenzen();
  const fz = (gr.bauteile || []).find(function (b) { return /Fenster/.test(b.name); });
  pruefe(fz && fz.anzahl === 3,
    "Die Fensterzeile nennt ihre Anzahl nicht: " + JSON.stringify(fz && fz.anzahl));
  const KB = fenster.MODUL_KONTROLLBLATT;
  const zf = KB.zaehler(p, {}).find(function (z) { return z.id === "fenster_gesamt"; });
  pruefe(!zf || zf.stufe !== "fehler",
    "Drei Fenster in einer Zeile duerfen kein Fehlbestand sein: "
      + (zf && zf.text));

  /* Eine ausdrueckliche Eingabe des Bearbeiters schlaegt auch die gelesene
     Hoehe -- sonst bliebe eine falsch gelesene Zahl unkorrigierbar. */
  /* Der Raum liegt im KELLERGESCHOSS. Seine senkrechte Huelle heisst deshalb
     seit dem 22.08.2026 nicht mehr "Aussenwand", sondern "Kellerwand gegen
     Erdreich" -- eine Wand unter Gelaendeoberkante grenzt an das Erdreich und
     rechnet nach DIN EN 12831-1 ueber f_theta_ann, f_GW und f_ig. Gesucht
     wird deshalb nach "wand" und nicht nach dem alten Namen. */
  const wandVon = function () {
    const b = (gr.bauteile || []).find(function (x) { return /wand/i.test(x.name); });
    return b ? b.A : null;
  };
  const wandVorher = wandVon();
  p.geschosshoehen = { KG: 2.30 };
  T.hoehenUebernehmen();
  pruefe(gr.h === 2.30,
    "Die Eingabe des Bearbeiters muss durchschlagen, ist: " + gr.h);
  pruefe(ab.h === 2.30, "Sie gilt fuer alle Raeume des Geschosses: " + ab.h);

  /* Und die Bauteilflaechen muessen der neuen Hoehe folgen. Vorher blieb die
     Wand auf der alten Hoehe stehen: ein zu grosser Waermestrom, der nirgends
     auffiel. */
  T.bauteileErgaenzen();
  pruefe(wandVon() !== null && wandVon() < wandVorher,
    "Die Wandflaeche muss der kleineren Raumhoehe folgen: " + wandVorher
      + " -> " + wandVon());

  /* Was von Hand geaendert wurde, bleibt stehen. */
  const wand = (gr.bauteile || []).find(function (b) { return /wand/i.test(b.name); });
  pruefe(wand && wand.grenzt_an && wand.grenzt_an.typ === "erdreich",
    "Die Wand eines Kellergeschosses muss an das Erdreich grenzen, nicht an "
      + "die Aussenluft: " + JSON.stringify(wand && wand.grenzt_an));
  pruefe(wand && wand.kat === "erdreich",
    "Sie muss die Kategorie erdreich tragen, sonst rechnet der Kern sie mit "
      + "Waermebrueckenzuschlag gegen die Norm-Aussentemperatur: "
      + (wand && wand.kat));
  pruefe(wand && /Souterrain|Hanglage/.test(wand.herkunft || ""),
    "Die Annahme muss am Bauteil stehen und sagen, wie man sie umstellt");
  wand.A = 40; wand.automatisch = false;
  p.geschosshoehen = { KG: 2.80 };
  T.hoehenUebernehmen();
  T.bauteileErgaenzen();
  pruefe(wandVon() === 40,
    "Eine von Hand eingetragene Flaeche darf nicht neu gebildet werden, ist: "
      + wandVon());
}

/* ---------------------------------------------------------------------------
 * Die Flaeche nach unten im untersten Geschoss
 * ---------------------------------------------------------------------------
 * Bis hierher bekam das unterste Geschoss immer eine Flaeche gegen die Zone
 * "Unbeheizter Keller". Das ist richtig, solange darunter einer liegt. Ist
 * das unterste Geschoss SELBST das Kellergeschoss, liegt darunter das
 * Erdreich, und die Rechnung bekam drei Fehler auf einmal: die Bodenplatte
 * rechnete gegen eine angenommene Zonentemperatur statt gegen das Erdreich,
 * das Werkzeug legte einen unbeheizten Keller an, den es nicht gibt, und
 * dieser Phantombereich zaehlte in der Geschossprobe des Kontrollblatts als
 * eigene Ebene mit.
 * Beide Richtungen werden geprueft: mit Keller unten gegen Erdreich, ohne
 * Keller unten weiterhin gegen die Zone.
 * ------------------------------------------------------------------------ */
{
  const bauen = function (geschosse) {
    const p = T.leeresProjekt();
    p.meta = { bezeichnung: "Bodenprobe", plz: "33098", ort: "Paderborn",
               baujahr: 1990, gebaeudeart: "efh" };
    p.klima = { theta_e: -10, theta_e_m: 9.4, quelle: "q" };
    p.bauteiltypen = [
      { id: "tw", name: "Außenwand", U: 1.2, kat_default: "huelle", schichten: [] },
      { id: "tf", name: "Fenster", U: 2.8, kat_default: "huelle", schichten: [] },
      { id: "td", name: "Dach", U: 0.4, kat_default: "huelle", schichten: [] },
      { id: "tk", name: "Kellerdecke", U: 0.5, kat_default: "huelle", schichten: [] },
      { id: "tb", name: "Bodenplatte", U: 0.6, kat_default: "erdreich", schichten: [] },
    ];
    p.raeume = geschosse.map(function (g, i) {
      return { id: "r" + i, name: g[1], art: g[2], geschoss: g[0], A: 18, h: 2.5,
               we: "WE 1", fenster: 1, aussenwaende: 2, bauteile: [] };
    });
    fenster.App.p = p;
    T.bauteileErgaenzen();
    return p;
  };
  const unten = function (p, geschoss) {
    const r = p.raeume.find(function (x) { return x.geschoss === geschoss; });
    return (r.bauteile || []).find(function (b) {
      return /boden|kellerdecke|sohle/i.test(b.name || ""); }) || null;
  };

  /* Unterstes Geschoss IST der Keller: Bodenplatte gegen Erdreich. */
  const mitKeller = bauen([["KG", "Keller", "keller"], ["EG", "Wohnen", "wohnen"],
                           ["OG", "Schlafen", "schlafen"]]);
  const bKG = unten(mitKeller, "KG");
  pruefe(!!bKG && bKG.grenzt_an && bKG.grenzt_an.typ === "erdreich",
    "Der Boden des Kellergeschosses grenzt an das Erdreich, ist: "
      + JSON.stringify(bKG && bKG.grenzt_an));
  pruefe(!!bKG && /Bodenplatte/i.test(bKG.name),
    "Gegen Erdreich gilt die Bodenplatte, nicht die Kellerdecke: "
      + (bKG && bKG.name));
  pruefe(!mitKeller.zonen.some(function (z) { return z.id === "keller"; }),
    "Unter dem Kellergeschoss darf keine Kellerzone entstehen: "
      + mitKeller.zonen.map(function (z) { return z.name; }).join(", "));
  pruefe(!!bKG && /Kellergeschoss/.test(String(bKG.herkunft || "")),
    "Die Herkunft muss sagen, warum hier das Erdreich gilt: "
      + (bKG && bKG.herkunft));

  /* Unterstes Geschoss ist das Erdgeschoss: Kellerdecke gegen die Zone.
     Das ist der Fall, der vorher richtig lief, und er muss richtig bleiben. */
  const ohneKeller = bauen([["EG", "Wohnen", "wohnen"], ["OG", "Schlafen", "schlafen"]]);
  const bEG = unten(ohneKeller, "EG");
  pruefe(!!bEG && bEG.grenzt_an && bEG.grenzt_an.typ === "zone"
    && bEG.grenzt_an.ref === "keller",
    "Ohne Kellergeschoss im Raumbuch bleibt die Flaeche nach unten die "
      + "Kellerdecke gegen die Zone, ist: " + JSON.stringify(bEG && bEG.grenzt_an));
  pruefe(!!bEG && /Kellerdecke/i.test(bEG.name),
    "Gegen einen unbeheizten Keller gilt die Kellerdecke: " + (bEG && bEG.name));
  pruefe(ohneKeller.zonen.some(function (z) { return z.id === "keller"; }),
    "Dann entsteht die Kellerzone wie bisher");

  /* Auch ohne ein lesbares Geschosskuerzel: traegt das unterste Geschoss
     Raeume der Art Keller, liegt darunter das Erdreich. Der Plan eines
     Kellergeschosses allein, mit einer Bezeichnung, die KERN_ZUORDNUNG
     nicht deuten kann -- die Raumart bleibt dann der einzige Anhaltspunkt,
     und sie genuegt. */
  const ausRaumart = bauen([["Ebene 0", "Vorrat", "keller"],
                            ["Ebene 0", "Heizung", "keller"]]);
  const bUT = unten(ausRaumart, "Ebene 0");
  pruefe(!!bUT && bUT.grenzt_an && bUT.grenzt_an.typ === "erdreich",
    "Die Raumart Keller im untersten Geschoss genuegt ebenfalls, ist: "
      + JSON.stringify(bUT && bUT.grenzt_an));

  /* Die Gegenprobe zum Raumart-Rueckfall: ein Souterrain OHNE einen einzigen
     Raum der Art Keller. Hier traegt allein die Geschossdeutung (rang < 0 aus
     KERN_ZUORDNUNG.geschossAusText). "Souterrain" stand lange nur im
     Kommentar der Aufrufstelle und nicht im Geschossmuster: der Hobbyraum
     haette eine Kellerdecke gegen einen erfundenen unbeheizten Keller UNTER
     dem eigenen Keller bekommen. */
  const souterrain = bauen([["Souterrain", "Hobbyraum", "wohnen"],
                            ["EG", "Wohnen", "wohnen"]]);
  const bSou = unten(souterrain, "Souterrain");
  pruefe(!!bSou && bSou.grenzt_an && bSou.grenzt_an.typ === "erdreich"
    && /Bodenplatte/i.test(bSou.name),
    "Ein Souterrain ohne Raeume der Art Keller liegt trotzdem auf dem "
      + "Erdreich (Geschossdeutung, rang < 0), ist: "
      + (bSou ? bSou.name + " " + JSON.stringify(bSou.grenzt_an) : "kein Bauteil"));
  pruefe(!souterrain.zonen.some(function (z) { return z.id === "keller"; }),
    "Unter dem Souterrain darf keine Kellerzone entstehen: "
      + souterrain.zonen.map(function (z) { return z.name; }).join(", "));
}

/* ---------------------------------------------------------------------------
 * Die Hoehen des Schnitts kommen im Raumbuch an -- Blatt "BV 2-0887 Ziolkowski"
 * ---------------------------------------------------------------------------
 * DIE EINGABE IST NICHT NACHGESTELLT. Sie ist die Antwort, die der
 * Live-Endpunkt am 22.08.2026 in der Betriebsart "hoehen" zu diesem Blatt
 * geliefert hat, Wort fuer Wort, dazu die Hoehenkoten desselben Schnitts, die
 * derselbe Endpunkt in derselben Betriebsart mitgelesen hat.
 *
 * Was hier geprueft wird, ist nicht das Modell, sondern die Strecke danach:
 * ob aus dieser Antwort dreizehn richtige Raumhoehen werden. Vorher wurden
 * daraus 2,20 m fuer das Erdgeschoss (die Terrassentuer) und zweimal der
 * Rueckfallwert 2,60 m fuer Keller und Obergeschoss -- alle dreizehn falsch,
 * und kein Zaehler merkte es.
 * ------------------------------------------------------------------------- */
{
  const p = T.leeresProjekt();
  T.App.p = p;
  const raeume = [
    ["KG", "Keller", 17.89], ["KG", "Flur", 21.20],
    ["EG", "Gast / Arbeiten", 12.16], ["EG", "WC", 2.17], ["EG", "Diele", 12.10],
    ["EG", "Kochen", 13.41], ["EG", "Essen", 16.20], ["EG", "Wohnen", 18.68],
    ["OG", "Schlafen", 14.35], ["OG", "Baden", 11.78], ["OG", "Flur", 10.81],
    ["OG", "Kind I", 18.60], ["OG", "Kind II", 18.59],
  ];
  raeume.forEach(function (x, i) {
    p.raeume.push({ id: "r" + i, geschoss: x[0], name: x[1], art: "wohnen",
      A: x[2], h: null, bauteile: [], herkunft: { quelle: "Planauslese" } });
  });
  /* Wort fuer Wort die gemessene Antwort der Betriebsart "hoehen". */
  const antwortHoehen = {
    ist_schnitt: true,
    hoehen: [
      { geschoss: "KELLERGESCHOSS", lichte_hoehe_m: null, geschosshoehe_m: 2.32,
        beleg: "Hoehenkote 2,32 im Keller" },
      { geschoss: "ERDGESCHOSS", lichte_hoehe_m: 2.2, geschosshoehe_m: 2.52,
        beleg: "lichte Hoehe 2,20 an Tuer, Geschosshoehe 2,52 links bemasst" },
      { geschoss: "OBERGESCHOSS", lichte_hoehe_m: null, geschosshoehe_m: 2.52,
        beleg: "Geschosshoehe 2,52 links bemasst" },
      { geschoss: "SPITZBODEN", lichte_hoehe_m: null, geschosshoehe_m: null,
        beleg: "nur Kniestockmasse 0,94 und 1,26 vorhanden" },
    ],
    hoehenkoten: [
      { geschoss: "KELLERGESCHOSS", wert_m: -2.73, bezug: "okff", text: "-2,73" },
      { geschoss: "KELLERGESCHOSS", wert_m: -2.88, bezug: "rohdecke", text: "-2,88" },
      { geschoss: "ERDGESCHOSS", wert_m: 0, bezug: "okff", text: "0,00" },
      { geschoss: "ERDGESCHOSS", wert_m: -0.19, bezug: "rohdecke", text: "-0,19" },
      { geschoss: "OBERGESCHOSS", wert_m: 2.91, bezug: "okff", text: "2,91" },
      { geschoss: "OBERGESCHOSS", wert_m: 2.74, bezug: "rohdecke", text: "2,74" },
      { geschoss: "SPITZBODEN", wert_m: 5.65, bezug: "rohdecke", text: "5,65" },
    ],
    deckendicken: [{ wert_m: 0.25, zwischen: "EG/OG", beleg: "25 rechts bemasst" }],
    dachneigung_grad: 25, drempel_m: 0.94,
  };
  const d = T.ausleseZusammenfuehren({ ist_grundriss: false, raeume: [] },
                                     null, antwortHoehen);
  pruefe((d.hoehenkoten || []).length === 7,
    "Die Hoehenkoten muessen die Zusammenfuehrung ueberleben, sind: "
      + (d.hoehenkoten || []).length);
  pruefe((d.deckendicken || []).length === 1,
    "Die bemasste Deckendicke muss die Zusammenfuehrung ueberleben");
  p.schnitthoehen = antwortHoehen.hoehen;
  p.schnittkoten = antwortHoehen.hoehenkoten;
  T.hoehenUebernehmen();

  const soll = { KG: 2.32, EG: 2.52, OG: 2.52 };
  let falsch = 0;
  p.raeume.forEach(function (r) {
    if (Math.abs((r.h || 0) - soll[r.geschoss]) > 0.001) falsch++;
  });
  pruefe(falsch === 0, falsch + " von 13 Raumhoehen stimmen nicht mit dem Schnitt "
    + "ueberein: " + JSON.stringify(p.raeume.map(function (r) {
        return r.geschoss + " " + r.h; })));
  pruefe(!p.raeume.some(function (r) { return r.h === 2.2; }),
    "Die Tuerhoehe 2,20 darf in keinem Raum stehen");
  pruefe(!p.raeume.some(function (r) { return r.h === 2.6; }),
    "Der Rueckfallwert 2,60 darf nicht mehr greifen, der Schnitt gibt alles her");
  pruefe(!p.raeume.some(function (r) {
      return r.herkunft && r.herkunft.hoehe_angenommen; }),
    "Keine der dreizehn Hoehen darf noch eine Annahme sein");
  pruefe(!(p.offeneFragen || []).some(function (f) { return f.thema === "Deckendicke"; }),
    "Nach der Deckendicke darf nicht gefragt werden, sie steht im Schnitt");
  pruefe(Math.abs((p.deckendickeAbgeleitet || {}).EG - 0.39) < 0.001,
    "Das Deckenpaket EG muss aus den Koten mit 0,39 m abgeleitet sein, ist: "
      + (p.deckendickeAbgeleitet || {}).EG);
  /* Und zwar dort, wo das Kontrollblatt wirklich hinsieht: p.offeneFragen.
     p.planbefunde beschreibt zwar dieselben Dinge, wird aber von keinem
     Zaehler und von keinem Kapitel des Berichts gelesen. */
  const hf = p.offeneFragen || [];
  pruefe(hf.some(function (x) { return /Tür|Tuer/.test(x.frage || ""); }),
    "Das verworfene Tuermass muss im Kontrollblatt stehen: "
      + JSON.stringify(hf.map(function (x) { return x.thema; })));
  pruefe(hf.some(function (x) {
      return /lichte Höhe, und das Deckenpaket/.test(x.frage || ""); }),
    "Der richtiggestellte Feldtausch muss im Kontrollblatt stehen");
  pruefe(hf.filter(function (x) { return x.thema === "Raumhöhe · KG"
      || x.thema === "Raumhöhe · EG" || x.thema === "Raumhöhe · OG"
      || x.thema === "Raumhöhe"; }).every(function (x) { return x.art === "grenze"; }),
    "Eine Feststellung darf das Ergebnis nicht sperren, sie ist ein Hinweis");

  /* Dieselbe Falle eine Ebene tiefer: die Betriebsart "raeume" liefert je Raum
     eine lichte Hoehe, und auch die kann eine Tuerhoehe sein. Sie bleibt
     stehen, aber sie faellt auf. */
  const rWohnen = p.raeume.find(function (r) { return r.name === "Wohnen"; });
  rWohnen.h = 2.2;
  rWohnen.herkunft.hoehe_quelle = "im Plan angeschrieben";
  T.hoehenUebernehmen();
  pruefe(rWohnen.h === 2.2, "Eine im Grundriss gelesene Hoehe bleibt massgebend");
  pruefe((p.offeneFragen || []).some(function (x) {
      return /Wohnen/.test(x.frage || "") && /Aufenthaltsraumhöhe/.test(x.frage || ""); }),
    "Eine Raumhoehe unter 2,30 m gegen einen belegten Schnitt muss auffallen");
}

/* ========================================================================
 * 8a  Die freiwillige Quellenangabe zu den Aussenmassen kommt an
 * ========================================================================
 * Gemessen am 24.08.2026: in der Rueckfrage zu den Aussenwaenden tippt der
 * Bearbeiter unter "Woher stammt die Zahl?" z. B. "am Plan abgezaehlt" —
 * und der Text stand danach in keiner Fassung. Jetzt wandert er als
 * geschossmasse[g].quelle in den Herkunftstext der Aussenwandflaechen, und
 * eine NACHGETRAGENE Quelle bildet die Bauteile neu (sechster Grund in
 * bauteileErgaenzen), sonst bliebe der alte Text ohne Quelle stehen.
 * ===================================================================== */
{
  const p = T.leeresProjekt();
  T.App.p = p;
  p.meta.baujahr = "1990";
  p.raeume = [{ id: "r_q1", geschoss: "EG", name: "Wohnen", art: "wohnen",
    A: 30, h: 2.5, we: "WE 1", fenster: 2, aussenwaende: 2,
    breite_m: null, tiefe_m: null, umfang_m: null, aussenwand_m: null,
    fensterliste: [], bauteile: [], herkunft: {} }];
  p.bauteiltypen = [
    { id: "tw", name: "Außenwand", U: 0.6 }, { id: "tf", name: "Fenster", U: 2.7 },
    { id: "td", name: "Dach", U: 0.4 }, { id: "tb", name: "Kellerdecke", U: 0.5 }];
  /* Erst ohne Quelle — so entsteht der Stand des Fehllaufs. */
  p.geschossmasse = { EG: { breite_m: 6, tiefe_m: 5 } };
  T.bauteileErgaenzen();
  const wandOhne = (p.raeume[0].bauteile || []).find(function (b) {
    return /Außenwand/.test(b.name || ""); });
  pruefe(!!wandOhne, "Vorbedingung: eine Aussenwand ist gebildet");
  pruefe(!/Quelle laut Bearbeiter/.test((wandOhne && wandOhne.herkunft) || ""),
    "Ohne Eingabe darf keine Quellenangabe erfunden werden");
  /* Dann traegt der Bearbeiter die Quelle nach. */
  p.geschossmasse.EG.quelle = "am Plan abgezählt";
  T.bauteileErgaenzen();
  const wand = (p.raeume[0].bauteile || []).find(function (b) {
    return /Außenwand/.test(b.name || ""); });
  pruefe(!!wand && /Quelle laut Bearbeiter: „am Plan abgezählt“/
      .test(wand.herkunft || ""),
    "Die nachgetragene Quelle muss im Herkunftstext der Aussenwand stehen: "
      + JSON.stringify(wand && wand.herkunft));
}

/* ========================================================================
 * 8b  Die Datumswahl gewichtet nach Blattart
 * ========================================================================
 * Gemessen am 24.08.2026 an „BV 2-0887 Ziolkowski", Lauf 2: der Bebauungsplan
 * (Blatt 2, „Oktober 2018") kam zuerst an, und das B-Plan-Datum wurde zum
 * gemerkten Plandatum — die Satzung der Stadt datierte das Gebäude. Ein
 * Grundriss-Datum schlägt jetzt ein Plangebiets-Datum, egal in welcher
 * Reihenfolge die Blätter fallen.
 * ===================================================================== */
{
  /* Reihenfolge des Fehllaufs: B-Plan zuerst. */
  const p8 = T.leeresProjekt();
  T.App.p = p8;
  T.objektangabenUebernehmen({ plandatum: "Oktober 2018",
    bauvorhaben: "Bebauungsplan 300 Springbach Höfe", ort: "Paderborn" },
    "Blatt 2 (B-Plan)");
  pruefe(p8.meta_herkunft.plandatum && p8.meta_herkunft.plandatum.wert === "Oktober 2018",
    "Solange nichts Besseres da ist, gilt auch ein B-Plan-Datum");
  /* Simulierter Stand des Fehllaufs: aus dem B-Plan-Datum war schon ein
     Baujahr angenommen worden. */
  p8.annahmen = { baujahr: { wert: 2018 } };
  p8.meta.baujahr = "2018";
  T.objektangabenUebernehmen({ plandatum: "17.05.2022", planungsart: "neubau" },
    "Blatt 1 (Grundrisse)", "grundriss");
  pruefe(p8.meta_herkunft.plandatum.wert === "17.05.2022",
    "Das Grundriss-Datum muss das B-Plan-Datum schlagen: "
      + p8.meta_herkunft.plandatum.wert);
  pruefe(p8.meta_herkunft.plandatum.blattart === "gebaeude",
    "Die Herkunft muss die Blattart tragen");
  pruefe(!(p8.annahmen && p8.annahmen.baujahr && p8.annahmen.baujahr.wert === 2018),
    "Das aus dem B-Plan-Datum angenommene Baujahr muss fallen, wenn das "
      + "bessere Datum kommt");
  /* Reihenfolge des Normal-Laufs: Grundriss zuerst — der B-Plan darf das
     bessere Datum nicht mehr verdrängen. */
  const p8b = T.leeresProjekt();
  T.App.p = p8b;
  T.objektangabenUebernehmen({ plandatum: "17.05.2022", planungsart: "neubau" },
    "Blatt 1 (Grundrisse)", "grundriss");
  T.objektangabenUebernehmen({ plandatum: "Oktober 2018",
    bauvorhaben: "Bebauungsplan 300 Springbach Höfe" }, "Blatt 2 (B-Plan)");
  pruefe(p8b.meta_herkunft.plandatum.wert === "17.05.2022",
    "Ein B-Plan-Datum darf ein Grundriss-Datum nicht verdrängen: "
      + p8b.meta_herkunft.plandatum.wert);
  /* Auch die Blattart aus dem Blattkopf zählt: ein als Lageplan erkanntes
     Blatt ist ein Plangebietsblatt, selbst ohne B-Plan-Bauvorhaben. */
  const p8c = T.leeresProjekt();
  T.App.p = p8c;
  T.objektangabenUebernehmen({ plandatum: "2019" }, "Lageplan", "lageplan");
  T.objektangabenUebernehmen({ plandatum: "03.2021" }, "Grundriss EG", "grundriss");
  pruefe(p8c.meta_herkunft.plandatum.wert === "03.2021",
    "Ein Grundriss-Datum muss ein Lageplan-Datum schlagen: "
      + p8c.meta_herkunft.plandatum.wert);
}

/* ========================================================================
 * 9  Eine ECHTE, abgeschnittene Endpunktantwort
 * ========================================================================
 * Diese Antwort ist nicht ausgedacht: sie stammt aus einem Durchlauf mit
 * „Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf" gegen den laufenden
 * Endpunkt am 23.08.2026 und liegt in validierung/echtlauf/ ab. Blatt 1 kam
 * abgeschnitten zurueck (_abgeschnitten: Zeit, 27 s); dabei blieb `befunde`
 * als roher JSON-Text stehen statt als Liste.
 *
 * WAS DAS GEKOSTET HAT: (d.befunde || []).forEach warf, die Uebernahme brach
 * mitten im ersten Blatt ab, Plandatum und Planungsart kamen nie an — und
 * ohne Plandatum kein angenommenes Baujahr, ohne Baujahr keine U-Werte, ohne
 * U-Werte 0,00 kW. Zu sehen war davon nur eine Zeile in der Browserkonsole.
 *
 * Der Test spielt genau diese Antwort noch einmal ein und verlangt, dass die
 * Uebernahme durchlaeuft.
 * ===================================================================== */
{
  const echt = path.join(WURZEL, "validierung/echtlauf/ziolkowski_auslese2.json");
  if (!fs.existsSync(echt)) {
    fehler.push("Die aufgezeichnete Endpunktantwort fehlt: " + echt);
  } else {
    const roh = JSON.parse(fs.readFileSync(echt, "utf8"));
    const p9 = T.leeresProjekt();
    T.App.p = p9;
    p9.plan.seiten = roh.seiten.map(function (s) {
      const k = JSON.parse(JSON.stringify(s));
      k.uebernommen = false;
      return k;
    });
    const s1 = p9.plan.seiten[0];
    pruefe(typeof s1.auslese.befunde === "string",
      "Die Aufzeichnung muss den abgeschnittenen Fall enthalten, sonst prueft "
      + "dieser Test nichts");
    let geworfen = null;
    try { T.raeumeAusAusleseUebernehmen(); }
    catch (e) { geworfen = e && e.message; }
    pruefe(!geworfen, "Die Uebernahme darf an einer abgeschnittenen Antwort nicht "
      + "abbrechen: " + geworfen);
    pruefe(p9.raeume.length === 13,
      "Alle 13 Raeume muessen ankommen, angekommen sind " + p9.raeume.length);
    pruefe(!!(p9.meta_herkunft && p9.meta_herkunft.plandatum
      && p9.meta_herkunft.plandatum.wert === "17.05.2022"),
      "Das Plandatum muss ankommen — an ihm haengt das angenommene Baujahr");
    pruefe(!!(p9.meta_herkunft && p9.meta_herkunft.planungsart
      && p9.meta_herkunft.planungsart.art === "neubau"),
      "Die Planungsart muss ankommen — ohne sie wird aus dem Plandatum kein Baujahr");
    pruefe(p9.meta.bauherr === "Ziolkowski",
      "Der Bauherr aus dem Schriftfeld muss ankommen: " + p9.meta.bauherr);
    pruefe(p9.meta.projektnr === "2-0887",
      "Die Projektnummer des Bauvorhabens muss ankommen: " + p9.meta.projektnr);
    /* Der Bebauungsplan von Blatt 2 ist kein Bauvorhaben und darf die
       Objektbezeichnung nicht stellen. */
    pruefe(!/Bebauungsplan/.test(String(p9.meta.bezeichnung || "")),
      "Ein Bebauungsplan darf nicht zur Objektbezeichnung werden: "
        + p9.meta.bezeichnung);
    pruefe(!!(p9.meta_herkunft && p9.meta_herkunft.bauvorhaben_verworfen),
      "Und dass er verworfen wurde, muss vermerkt sein");
    /* Aus dem Text, der keine Liste war, darf kein Schein-Befund entstehen. */
    pruefe((p9.planbefunde || []).every(function (b) {
        return b && typeof b === "object"; }),
      "Aus einer Zeichenkette darf kein Befund werden");
  }
}

/* ========================================================================
 * Einbauteile sind keine Raeume — Kundenbefund "Hasenberg 10" (25.08.2026)
 * ========================================================================
 * Der echte Lauf meldete: 'Raumflaeche fehlt: ... EG Garderobe/Schrank,
 * EG Garderobe.' Der Kunde: "das sind keine raeume sondern einbauteile und
 * dem flur zuzurechnen." Ein Einbau-Etikett OHNE nennenswerte eigene
 * Flaeche kommt nicht ins Raumbuch und erzeugt keine Sperre; seine Flaeche
 * steckt im Raum, in dem es steht. Ein Etikett MIT Flaeche (begehbare
 * Garderobe) bleibt Raum. Und die Gegenprobe der Lockerung: ein ECHTER
 * Raum ohne Flaeche muss weiter auffallen.
 * ===================================================================== */
{
  const p = T.leeresProjekt();
  T.App.p = p;
  p.plan = { seiten: [{ bezeichnung: "Hasenberg EG", name: "Hasenberg EG",
    textstuecke: [], raumbloecke: [], geschosstitel: [],
    blattkopf: { blattart: "grundriss", geschoss: "eg" },
    auslese: { raeume: [
      { bezeichnung: "Flur", raumart: "Flur", flaeche_m2: 9.8 },
      { bezeichnung: "WC", raumart: "WC", flaeche_m2: 2.1 },
      { bezeichnung: "Garderobe/Schrank", raumart: "Abstellraum" },
      { bezeichnung: "Garderobe", raumart: "Abstellraum" },
      /* Die begehbare Garderobe mit eigener Flaeche bleibt ein Raum. */
      { bezeichnung: "Garderobe", raumart: "Abstellraum", flaeche_m2: 4.2 },
      /* Der echte Raum OHNE Flaeche — er muss weiter auffallen. */
      { bezeichnung: "Arbeiten", raumart: "Arbeiten" }] } }] };
  T.raeumeAusAusleseUebernehmen();
  const namen = p.raeume.map(function (r) { return r.name; });
  pruefe(namen.filter(function (n) { return /Garderobe/.test(n); }).length === 1,
    "Nur die Garderobe MIT Flaeche darf ein Raum sein: " + JSON.stringify(namen));
  const gross = p.raeume.find(function (r) { return /Garderobe/.test(r.name); });
  pruefe(gross && gross.A === 4.2,
    "Die begehbare Garderobe (4,2 m²) muss als Raum bleiben: " + (gross && gross.A));
  pruefe(p.raeume.length === 4,
    "Flur, WC, grosse Garderobe, Arbeiten — vier Raeume, nicht " + p.raeume.length);
  /* Der Vermerk ist eine GRENZE (stiller Hinweis), keine Frage mit
     Eingabefeld — der Kunde will die Zeilen los sein, nicht beantworten. */
  const einbau = (p.offeneFragen || []).filter(function (f) {
    return f.thema === "Einbauteil"; });
  pruefe(einbau.length === 2 && einbau.every(function (f) {
      return f.art === "grenze"; }),
    "Beide verworfenen Einbauteile stehen als Grenz-Vermerk da: "
      + JSON.stringify(einbau.map(function (f) { return f.frage; })));
  pruefe(einbau.every(function (f) { return /Flur/.test(f.frage); }),
    "Der Vermerk muss sagen, wo die Flaeche steckt (Flur)");
  /* GEGENPROBE: der echte Raum ohne Flaeche steht mit A = 0 im Raumbuch
     und traegt damit weiter die Sperre 'Raumflaeche fehlt' (Rueckfragen,
     id "flaeche", filtert !(A > 0)). */
  const arb = p.raeume.find(function (r) { return r.name === "Arbeiten"; });
  pruefe(!!arb && !(arb.A > 0),
    "Ein echter Raum ohne Flaeche muss weiter im Raumbuch auffallen");
}

/* Derselbe Befund auf dem STEMPELWEG: ein Flaechenstempel "Garderobe
   1,50 m²" ist ein Einbauteil (unter der Schwelle), "Ankleide 4,20 m²"
   bleibt Raum. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "1,50 m²", x_pt: 100.0, y_pt: 441.8, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Garderobe", x_pt: 100.0, y_pt: 450.3, groesse_pt: 10.0, breite_pt: 40, winkel_rad: 0 },
    { text: "4,20 m²", x_pt: 300.0, y_pt: 441.8, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Ankleide", x_pt: 300.0, y_pt: 450.3, groesse_pt: 10.0, breite_pt: 40, winkel_rad: 0 },
  ];
  const p = T.leeresProjekt();
  T.App.p = p;
  p.plan = { seiten: [{ bezeichnung: "Hasenberg OG", name: "Hasenberg OG",
    textstuecke: stuecke, raumbloecke: MP.raumbloeckeLesen(stuecke),
    geschosstitel: [], blattkopf: { blattart: "grundriss", geschoss: "og" } }] };
  T.raeumeAusStempelnUebernehmen(0);
  const namen = p.raeume.map(function (r) { return r.name; });
  pruefe(namen.indexOf("Garderobe") < 0,
    "Der Garderoben-Stempel unter der Schwelle darf kein Raum werden: "
      + JSON.stringify(namen));
  pruefe(namen.indexOf("Ankleide") >= 0,
    "Die Ankleide mit 4,20 m² bleibt ein Raum: " + JSON.stringify(namen));
  pruefe((p.offeneFragen || []).some(function (f) {
      return f.thema === "Flächenstempel" && /Einbauteil/.test(f.frage); }),
    "Der verworfene Stempel steht als Vermerk mit Begruendung da");
  /* Und er darf NICHT als unbeheizter Bereich gefuehrt werden — er ist
     Moeblierung, keine Zone. */
  pruefe(((p.plangebaeude || {}).unbeheizte_bereiche || [])
      .indexOf("Garderobe") < 0,
    "Ein Einbauteil ist keine unbeheizte Zone");
}

console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl, fehler: fehler }));
process.exit(fehler.length === 0 ? 0 : 1);
