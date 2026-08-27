/* ===========================================================================
 * ziolkowski_test.js — NACHGESTELLTER Fall. KEIN echter Durchlauf.
 * ===========================================================================
 *
 *      ACHTUNG, UND DAS IST DER WICHTIGSTE ABSATZ DIESER DATEI:
 *
 *      DIESER TEST BRINGT SEINE EIGENEN MODELLANTWORTEN MIT.
 *      Er ruft kein Netz, keinen Endpunkt und kein Modell. Was er prueft,
 *      ist ausschliesslich, was das WERKZEUG aus vorgegebenen Antworten
 *      macht. Er beweist NICHT, dass der Fall Ziolkowski durchlaeuft, und
 *      er beweist keine einzige Zahl ueber dieses Gebaeude.
 *
 *      WAS ER SCHON ANGERICHTET HAT: er meldete gruen „Kontrollblatt ohne
 *      Befund" und eine Gebaeudeheizlast von 6,38 kW, waehrend der echte
 *      Durchlauf derselben Datei „Nicht belastbar, 7 Fehler" und 0,00 kW
 *      ergab. Der Unterschied lag in zwei Feldern, die diese Datei
 *      erfindet und die auf Sebastians Blatt NICHT stehen: baujahr und plz
 *      (siehe FREI_ERFUNDEN weiter unten). Ohne Baujahr keine U-Werte,
 *      ohne U-Werte keine Bauteile, ohne Bauteile 0,00 kW.
 *
 *      Wer eine Zahl ueber dieses Gebaeude braucht, legt die PDF im
 *      Browser ab und liest sie dort ab. Aus dieser Datei darf keine Zahl
 *      berichtet werden.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESEN TEST TROTZDEM GIBT
 *
 * Die Datei "Werkvertragszeichnung BV 2-0887 Ziolkowski" ist der Fall, an dem
 * das Kontrollblatt gemessen wird: zwei Blaetter A3 quer, das erste mit einem
 * Schnitt, einer Ansicht von Westen und DREI Grundrissen nebeneinander, das
 * zweite ein Bebauungsplan ohne einen einzigen Raum. Daraus entstehen 13
 * Raeume ueber KG, EG und OG.
 *
 * Sein Kontrollblatt zeigte:
 *     "Nicht belastbar · 1 Fehler · 1 Warnung · 12 offene Fragen"
 * und die zwoelf Fragen lauteten im Kern alle gleich: "gegen nichts geprueft".
 * Das sind keine Befunde ueber das Gebaeude, sondern ueber das Werkzeug.
 *
 * Dieser Test haelt den erreichten Stand fest UND prueft die Gegenrichtung:
 * er verfaelscht das Ergebnis an vier Stellen und verlangt, dass jede
 * Verfaelschung gefunden wird. Ein Kontrollblatt, das sauber aussieht, ist
 * nichts wert, solange nicht gezeigt ist, dass es auch anschlaegt.
 *
 * Gerechnet wird mit den Zahlen, die auf dem Blatt stehen: Raumnamen und
 * Flaechen aus den Flaechenstempeln, Aussenbemassung aus den Massketten,
 * lichte Hoehen aus dem Schnitt. Die beiden Modellantworten sind nachgestellt
 * (erste Lesung "raeume", zweite Lesung "gegenprobe"), weil ein Test kein
 * Netz und keinen Schluessel hat; was hier geprueft wird, ist nicht das
 * Modell, sondern was das Werkzeug aus seinen Antworten macht.
 *
 * Aufruf:  node validierung/ziolkowski_test.js
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

/* --- Browserattrappe, wie in uebernahme_test.js ------------------------ */
function knoten(tag) {
  return { tagName: (tag || "div").toUpperCase(), style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], value: "", checked: false, innerHTML: "", textContent: "",
    appendChild(x) { this.children.push(x); return x; },
    removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    closest() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 900, height: 600, top: 0, left: 0 }; },
    getContext() { return kontext2d(); },
    toDataURL() { return "data:image/png;base64,x"; }, scrollIntoView() {} };
}
function kontext2d() {
  const nichts = function () { return kontext2d(); };
  return new Proxy({}, { get(z, s) {
    if (s === "canvas") return knoten("canvas");
    if (s === "measureText") return function () { return { width: 10 }; };
    if (s === "getImageData") return function () {
      return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; };
    return nichts; }, set() { return true; } });
}
const speicher = {};
const fenster = {
  location: { protocol: "https:", search: "", href: "https://pruefung.invalid/" },
  localStorage: { getItem(k) { return speicher[k] === undefined ? null : speicher[k]; },
    setItem(k, v) { speicher[k] = String(v); }, removeItem(k) { delete speicher[k]; } },
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
  fetch() { return Promise.reject(new Error("kein Netz in der Probe")); },
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  ikon(n) { return '<svg class="ikon"><use href="#i-' + n + '"></use></svg>'; },
};
fenster.document = { readyState: "loading", addEventListener() {},
  removeEventListener() {}, createElement: knoten, createElementNS: knoten,
  createTextNode() { return knoten("text"); },
  getElementById() { return null; }, querySelector() { return null; },
  querySelectorAll() { return []; },
  body: knoten("body"), head: knoten("head"), documentElement: knoten("html"),
  activeElement: null };
fenster.window = fenster; fenster.self = fenster; fenster.globalThis = fenster;
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
umgebung.Uint8ClampedArray = Uint8ClampedArray;

const DATEIEN = [
  "src/standorte.js", "src/daten/daten_zonenlagen.js",
  "src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
  "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
  "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
  "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
  "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js", "src/kerne/kern_lage.js",
  "src/kerne/kern_fenster.js", "src/kerne/kern_messen.js",
  "src/kerne/kern_zuschnitt.js", "src/kerne/kern_gegenprobe.js",
  "src/modul_pdf.js", "src/modul_plan.js", "src/modul_ki.js",
  "src/modul_kontrollblatt.js", "src/modul_pruefblatt.js",
    "src/modul_berichtsatz.js", "src/modul_teillast.js",
  "src/modul_bericht.js", "src/modul_bewertung.js",
];
for (const d of DATEIEN) {
  const pfad = path.join(WURZEL, d);
  if (!fs.existsSync(pfad)) { fehler.push("Datei fehlt: " + d); continue; }
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), umgebung, { filename: d }); }
  catch (e) { fehler.push(d + " laesst sich nicht laden: " + e.message); }
}
let appQuelle = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
appQuelle += "\n;window.__z = { App, leeresProjekt, rechnen,"
  + " raeumeAusAusleseUebernehmen, gegenprobeAufnehmen, automatischErgaenzen };\n";
try { vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" }); }
catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__z;
const KB = fenster.MODUL_KONTROLLBLATT;

/* ===========================================================================
 * Das Blatt
 * ======================================================================== */
const R_KG = [["KELLER", 17.99], ["FLUR", 21.20]];
const R_EG = [["GAST / ARBEITEN", 12.16], ["WC", 2.17], ["DIELE", 12.10],
              ["KOCHEN", 13.41], ["ESSEN", 16.20], ["WOHNEN", 18.68]];
const R_OG = [["SCHLAFEN", 14.35], ["BADEN", 11.78], ["FLUR", 10.81],
              ["KIND I", 18.60], ["KIND II", 18.59]];
/* Fenstersymbole je Raum, so wie sie in den Grundrissen gezeichnet sind:
   1 im Keller, 6 im Erdgeschoss, 4 im Obergeschoss, zusammen 11. */
const FENSTER = { "KG|KELLER": 1, "KG|FLUR": 0,
  "EG|GAST / ARBEITEN": 1, "EG|WC": 1, "EG|DIELE": 0, "EG|KOCHEN": 1,
  "EG|ESSEN": 2, "EG|WOHNEN": 1,
  "OG|SCHLAFEN": 1, "OG|BADEN": 1, "OG|FLUR": 0, "OG|KIND I": 1, "OG|KIND II": 1 };
const AUSSENWAENDE = { "KG|KELLER": 2, "KG|FLUR": 2,
  "EG|GAST / ARBEITEN": 2, "EG|WC": 1, "EG|DIELE": 1, "EG|KOCHEN": 1,
  "EG|ESSEN": 2, "EG|WOHNEN": 2,
  "OG|SCHLAFEN": 1, "OG|BADEN": 2, "OG|FLUR": 1, "OG|KIND I": 2, "OG|KIND II": 2 };
function raumart(n) {
  const s = n.toLowerCase();
  if (/baden|^bad/.test(s)) return "bad";
  if (/^wc/.test(s)) return "wc";
  if (/koch/.test(s)) return "kueche";
  if (/schlaf|kind/.test(s)) return "schlafen";
  if (/flur|diele/.test(s)) return "flur";
  if (/keller/.test(s)) return "keller";
  return "wohnen";
}
function ausleseRaum(g, name, A, h) {
  const k = g + "|" + name;
  return { bezeichnung: name, geschoss: g, raumart: raumart(name),
    flaeche_m2: A, lichte_hoehe_m: h, breite_m: null, tiefe_m: null,
    aussenwaende: AUSSENWAENDE[k], fenster: FENSTER[k], fensterliste: [],
    konfidenz: "sicher" };
}
/* WAS AUF DEM BLATT NICHT STEHT und hier trotzdem gesetzt wird.
   Jeder Eintrag ist ein Feld, dessen Erfindung das Ergebnis dieses Tests
   vom echten Durchlauf entfernt. Am 22.08.2026 gegen den Live-Endpunkt
   gemessen: das Schriftfeld von Blatt 1 kam mit lauter null zurueck, nur
   plandatum "17.05.2022" war belegt. Diese Liste wird unten geprueft --
   waechst sie, muss sie hier stehen. */
const FREI_ERFUNDEN = {
  "objekt.baujahr": "Auf dem Blatt steht kein Baujahr. Mit Baujahr entstehen "
    + "Bauteiltypen aus der Typologie und daraus die Bauteile; ohne Baujahr "
    + "bleibt die Heizlast im echten Durchlauf bei 0,00 kW.",
  "objekt.plz": "Auf dem Blatt steht keine Postleitzahl. Mit PLZ entsteht die "
    + "Norm-Aussentemperatur; ohne sie ist keine normkonforme Berechnung "
    + "moeglich.",
  "objekt.bauvorhaben": "Kam im echten Durchlauf als null zurueck.",
  "objekt.ort": "Kam im echten Durchlauf als null zurueck.",
  "objekt.projektnummer": "Kam im echten Durchlauf als null zurueck.",
  "objekt.gebaeudeart": "Kam im echten Durchlauf als null zurueck.",
  "hoehen[].lichte_hoehe_m": "Die echte Lesung liefert fuer KG und OG null "
    + "und fuer das EG 2,20 m an einer Tuer; hier stehen saubere lichte "
    + "Hoehen, die das Blatt so nicht hergibt.",
  "massstab.nenner_grundriss": "Der echte Durchlauf stuft den Massstab dieses "
    + "Scans als widerspruechlich ein (Schriftfeld 1:100 gegen gemessene "
    + "1:68,7).",
  "ebenen[].aussen_breite_m EG": "Hier 8,00 x 12,50 wie auf dem Plan; die "
    + "echte Lesung gibt reproduzierbar 11,50 x 6,00 aus dem Wortlaut "
    + "\u201e3.50 + 8.00 / 6.00\u201c.",
};

function auslese1() {
  return {
    ist_grundriss: true,
    massstab: { angaben: [{ wortlaut: "M. 1:100", nenner: 100,
        fundstelle: "unter jeder Zeichnung", gilt_fuer: "ganzes Blatt",
        lesbarkeit: "sicher" }],
      nenner_grundriss: 100, mehrere_massstaebe: false, blattgroesse: "A3",
      blattgroesse_wortlaut: "", bemasst: true, masszahlen: [] },
    objekt: { bauvorhaben: "BV 2-0887", strasse: null, plz: "33100",
      ort: "Paderborn", bauherr: null, projektnummer: "2-0887",
      gebaeudeart: "Einfamilienhaus", baujahr: "2022", plandatum: "17.05.2022" },
    raeume: [].concat(
      R_KG.map(function (x) { return ausleseRaum("KG", x[0], x[1], 2.32); }),
      R_EG.map(function (x) { return ausleseRaum("EG", x[0], x[1], 2.52); }),
      R_OG.map(function (x) { return ausleseRaum("OG", x[0], x[1], 2.52); })),
    hoehen: [
      { geschoss: "KELLERGESCHOSS", lichte_hoehe_m: 2.32, geschosshoehe_m: 2.57 },
      { geschoss: "ERDGESCHOSS", lichte_hoehe_m: 2.52, geschosshoehe_m: 2.77 },
      { geschoss: "OBERGESCHOSS", lichte_hoehe_m: 2.52, geschosshoehe_m: 2.77 }],
    dachneigung_grad: 25, drempel_m: 1.26,
  };
}
/* Die zweite Lesung. Sie zaehlt und benennt, sie wertet nicht aus.
   Der SPITZBODEN ist im Schnitt benannt, aber nicht als Grundriss
   gezeichnet: gezeichnet false. Die ANSICHT VON WESTEN ist keine Ebene,
   sie ist eine Fassade und steht in ansichten. */
function gegenprobe1() {
  return {
    blattart: "grundriss",
    raeume_beschriftet: 13,
    raumnamen: [].concat(R_KG, R_EG, R_OG).map(function (x) { return x[0]; }),
    fenster_gesamt: 11,
    ansichten: [{ fassade: "West", fenster: 6 }],
    ebenen: [
      { bezeichnung: "SPITZBODEN", gezeichnet: false, raeume_beschriftet: 0,
        raumnamen: [], fenster: 0, aussen_breite_m: null, aussen_tiefe_m: null,
        aussen_wortlaut: "" },
      { bezeichnung: "GRUNDRISS OBERGESCHOSS", gezeichnet: true,
        raeume_beschriftet: 5,
        raumnamen: ["SCHLAFEN", "BADEN", "FLUR", "KIND I", "KIND II"], fenster: 4,
        aussen_breite_m: 8.00, aussen_tiefe_m: 12.50, aussen_wortlaut: "8,00 · 12,50" },
      { bezeichnung: "GRUNDRISS ERDGESCHOSS", gezeichnet: true,
        raeume_beschriftet: 6,
        raumnamen: ["GAST / ARBEITEN", "WC", "DIELE", "KOCHEN", "ESSEN", "WOHNEN"],
        fenster: 6, aussen_breite_m: 8.00, aussen_tiefe_m: 12.50,
        aussen_wortlaut: "8,00 · 1,00 + 5,50 + 6,00" },
      { bezeichnung: "GRUNDRISS KELLERGESCHOSS", gezeichnet: true,
        raeume_beschriftet: 2, raumnamen: ["KELLER", "FLUR"], fenster: 1,
        aussen_breite_m: 8.00, aussen_tiefe_m: 7.00, aussen_wortlaut: "8,00 · 7,00" },
    ],
    unbeheizt_benannt: ["SPITZBODEN"],
    unbeheizt_unbenannt: 0,
    nordpfeil: { vorhanden: true, richtung: "schraeg" },
  };
}
/* Blatt 2: Bebauungsplan 300, M 1:1000. Kein Grundriss, kein Raum. */
const auslese2 = {
  ist_grundriss: false,
  massstab: { angaben: [{ wortlaut: "M. 1 : 1000", nenner: 1000,
      fundstelle: "unter dem Plan", gilt_fuer: "Lageplan", lesbarkeit: "sicher" }],
    nenner_grundriss: null, mehrere_massstaebe: false, blattgroesse: "A0",
    blattgroesse_wortlaut: "", bemasst: false, masszahlen: [] },
  objekt: { bauvorhaben: null, strasse: null, plz: null, ort: "Paderborn",
    bauherr: null, projektnummer: null, gebaeudeart: null, baujahr: null,
    plandatum: null },
  raeume: [], hoehen: [],
};
const gegenprobe2 = {
  blattart: "lageplan", raeume_beschriftet: 0, raumnamen: [], fenster_gesamt: 0,
  ansichten: [], ebenen: [], unbeheizt_benannt: [], unbeheizt_unbenannt: 0,
  nordpfeil: { vorhanden: true, richtung: "oben" },
};

/** Legt die Datei ab und laesst auswerten — derselbe Weg wie stapelAuswerten. */
function aufbauen(aenderung) {
  const a1 = auslese1(), g1 = gegenprobe1();
  if (aenderung) aenderung(a1, g1);
  const App = T.App;
  App.p = T.leeresProjekt();
  App.p.plan.seiten = [
    { id: "s1", name: "Seite 1", bezeichnung: "BV 2-0887, Seite 1",
      art: "grundriss", felder: [], ausgewertet: true, auslese: a1 },
    { id: "s2", name: "Seite 2", bezeichnung: "BV 2-0887, Seite 2",
      art: "lageplan", felder: [], ausgewertet: true, istGrundriss: false,
      auslese: auslese2 },
  ];
  T.gegenprobeAufnehmen(App.p.plan.seiten[0], a1, g1, []);
  T.gegenprobeAufnehmen(App.p.plan.seiten[1], auslese2, gegenprobe2, []);
  T.raeumeAusAusleseUebernehmen();
  T.automatischErgaenzen();
  T.automatischErgaenzen();
  T.rechnen();
  return App;
}
function bilanz(App) {
  const zn = KB.zaehler(App.p, {});
  return {
    zeilen: zn,
    fehler: zn.filter(function (z) { return z.stufe === "fehler"; }),
    warnung: zn.filter(function (z) { return z.stufe === "warnung"; }),
    offen: zn.filter(function (z) {
      return z.stufe === "offen" || z.stufe === "hinweis"; }),
    grenzen: KB.grenzen(App.p, {}),
    gegenproben: KB.gegenproben(App.p, {}),
  };
}
function hat(liste, id) {
  return liste.some(function (z) { return z.id === id; });
}

/* ===========================================================================
 * 1  Der Fall, unverfaelscht
 * ======================================================================== */
const App = aufbauen(null);
const b = bilanz(App);

pruefe(App.p.raeume.length === 13,
  "Aus den drei Grundrissen muessen 13 Raeume entstehen, sind: "
    + App.p.raeume.length);
["KG", "EG", "OG"].forEach(function (g, i) {
  const soll = [2, 6, 5][i];
  const ist = App.p.raeume.filter(function (r) { return r.geschoss === g; }).length;
  pruefe(ist === soll, "Im " + g + " muessen " + soll + " Raeume stehen, sind: " + ist);
});

/* DAS ZIEL: kein Fehler, keine Warnung, keine offene Frage. Ohne Eingabe,
   ohne einen einzigen Klick. */
pruefe(b.fehler.length === 0,
  "Kein Fehler erwartet, sind: " + b.fehler.map(function (z) { return z.id; }).join(", "));
pruefe(b.warnung.length === 0,
  "Keine Warnung erwartet, sind: "
    + b.warnung.map(function (z) { return z.id; }).join(", "));
pruefe(b.offen.length === 0,
  "Keine offene Frage erwartet, sind: "
    + b.offen.map(function (z) { return z.id; }).join(", "));
pruefe(b.gegenproben.length >= 6,
  "Mindestens sechs Gegenproben muessen laufen, sind: " + b.gegenproben.length);
pruefe(b.gegenproben.every(function (z) { return z.stufe === "gut"; }),
  "Jede Gegenprobe muss bestehen");

/* Die einzelnen Zeilen, die frueher "gegen nichts geprueft" sagten. */
["raeume_KG", "raeume_EG", "raeume_OG", "geschosse", "zonen"].forEach(function (id) {
  const z = b.zeilen.find(function (x) { return x.id === id; });
  pruefe(!!z && z.stufe === "gut" && z.soll !== null,
    "Die Zeile " + id + " muss eine Sollzahl haben und bestehen"
      + (z ? " (" + z.stufe + ", soll " + z.soll + ")" : " (fehlt)"));
});

/* DIE FLAECHENPROBE: GELAUFEN, ABER OHNE AUFLOESUNG.
 *
 * Hier stand bis zum 23.08.2026, die drei Flaechenzeilen muessten "bestehen
 * und eine Sollzahl haben". Sie taten es -- und sagten im selben Satz, dass
 * sie rund 25 m² aufloesen, bei einem kleinsten erfassten Raum von 17,99 m².
 * Ein ganzer vergessener Raum waere in der Spanne aus angenommener Wanddicke,
 * Innenwaenden und Treppenmassen verschwunden, und der Haken haette
 * danebengestanden.
 *
 * Solange die Wanddicke nicht belegt ist, ist das keine bestandene
 * Gegenprobe, sondern eine Grenze: sie nennt beide Zahlen, ihre Aufloesung
 * und den Weg, sie schaerfer zu machen, und steht im Bericht statt im Kopf.
 * Die Konturen je Ebene stehen weiterhin drin und werden hier geprueft --
 * daran hat sich nichts geaendert, nur an der Bewertung. */
function flaecheZeile(id) {
  return b.zeilen.concat(b.grenzen).find(function (x) { return x.id === id; });
}
["flaeche_KG", "flaeche_EG", "flaeche_OG"].forEach(function (id) {
  const z = flaecheZeile(id);
  pruefe(!!z && z.stufe !== "fehler" && z.stufe !== "warnung",
    "Die Zeile " + id + " darf keinen Befund erzeugen"
      + (z ? " (" + z.stufe + ")" : " (fehlt)"));
  pruefe(!!z && (z.stufe === "gut" || (z.art === "grenze" && !!z.abhilfe)),
    "Sie besteht entweder oder sie sagt als Grenze, was sie nicht aufloest: "
      + id + (z ? " (" + z.art + "/" + z.stufe + ")" : " (fehlt)"));
});

/* Die Konturen aus der Aussenbemassung, je Ebene eine. */
const zFl = flaecheZeile("flaeche_KG");
pruefe(!!zFl && /56,00 m²/.test(zFl.text),
  "Das Kellergeschoss ist nur zur Haelfte unterkellert: 8,00 x 7,00 = 56,00 m²");
const zFlEG = flaecheZeile("flaeche_EG");
pruefe(!!zFlEG && /100,00 m²/.test(zFlEG.text),
  "Das Erdgeschoss misst 8,00 x 12,50 = 100,00 m²");

/* Der Schnitt nennt vier Ebenen: Spitzboden, OG, EG, KG. Der Spitzboden ist
   der unbeheizte Dachraum -- unter anderem Namen, aber derselbe Bereich. */
const zG = b.zeilen.find(function (x) { return x.id === "geschosse"; });
pruefe(!!zG && zG.ist === 4 && zG.soll === 4,
  "Vier Ebenen: drei beheizte Geschosse und der Spitzboden, ist: "
    + (zG ? zG.ist + "/" + zG.soll : "keine Zeile"));
/* Der Bereich traegt jetzt den Namen, unter dem der PLAN ihn nennt, und die
   Kennung "dachraum", auf die die Bauteile zeigen. Beides gehoert zusammen:
   frueher entstand die Zone erst mit den Bauteilen und hiess "Unbeheizter
   Dachraum" -- ein Name, der auf keinem Blatt steht. Legt das Werkzeug sie
   vorher aus der Ebenenliste an, heisst sie SPITZBODEN, und die Kellerdecke
   des Dachraums findet sie ueber die Kennung. */
pruefe(App.p.zonen.length === 1 && App.p.zonen[0].id === "dachraum"
    && /SPITZBODEN/i.test(App.p.zonen[0].name),
  "Genau EIN unbeheizter Bereich: der Dachraum unter dem Plannamen SPITZBODEN "
    + "mit der Kennung dachraum. Angelegt: "
    + App.p.zonen.map(function (z) { return z.name + " (" + z.id + ")"; }).join(", "));
pruefe(App.p.zonen[0] && App.p.zonen[0].lage_angenommen === true,
  "Die Lage des selbst angelegten Bereichs muss als Annahme gekennzeichnet sein");
const zZ = b.zeilen.find(function (x) { return x.id === "zonen"; });
pruefe(!!zZ && zZ.stufe === "gut" && /SPITZBODEN/.test(zZ.text),
  "Die Zeile muss den benannten Bereich SPITZBODEN nennen, statt einen "
    + "fehlenden Bereich zu melden");

/* Der Boden des Kellergeschosses liegt auf dem Erdreich und nicht gegen eine
   erfundene Kellerzone. */
App.p.raeume.filter(function (r) { return r.geschoss === "KG"; }).forEach(function (r) {
  const unten = (r.bauteile || []).find(function (x) {
    return /boden|kellerdecke|sohle/i.test(x.name || ""); });
  pruefe(!!unten && unten.grenzt_an && unten.grenzt_an.typ === "erdreich",
    "Der Boden von " + r.name + " im Kellergeschoss grenzt an das Erdreich, ist: "
      + (unten ? JSON.stringify(unten.grenzt_an) : "kein Bauteil nach unten"));
});

/* Die Fenster: elf in den Grundrissen, sechs davon in der Westansicht. Beides
   darf nicht addiert werden — es sind dieselben Oeffnungen. */
/* Die Fensterzahl der zweiten Lesung ist KEINE Gegenprobe mehr. An neun
   Lesungen desselben Blattes gemessen schwankte sie fuer ein Geschoss
   zwischen vier und acht, waehrend die Raumnamen jedes Mal dieselben waren.
   Sie steht deshalb als Grenze im Bericht und nicht als bestandene Probe.
   Hier stand vorher "Elf Fenster in beiden Lesungen" -- eine Probe, die das
   alte Verhalten einforderte und mit dem Code nicht mehr zusammenpasste. */
const zF = b.grenzen.find(function (x) { return x.id === "fenster_gesamt"; });
pruefe(!!zF && zF.stufe === "hinweis" && !!zF.abhilfe,
  "Die Fensterzahl gehoert als Grenze in den Bericht, ist: "
    + (zF ? zF.art + "/" + zF.stufe : "keine Zeile"));
pruefe(!b.gegenproben.some(function (x) { return x.id === "fenster_gesamt"; }),
  "Sie darf im Kopf nicht als bestandene Gegenprobe mitzaehlen");
pruefe((App.p.ansichten || []).length === 1
  && App.p.ansichten[0].fenster === 6,
  "Die Ansicht von Westen muss als Fassade mit sechs Fenstern ankommen");

/* Kein Blatt fragt nach seinem Geschoss: Blatt 1 traegt drei Grundrisse und
   jeder Raum sein Geschoss, Blatt 2 hat gar keinen Raum. */
pruefe((App.p.offeneFragen || []).every(function (x) { return x.thema !== "Geschoss"; }),
  "Kein Blatt darf nach seinem Geschoss fragen: "
    + (App.p.offeneFragen || []).filter(function (x) { return x.thema === "Geschoss"; })
        .map(function (x) { return x.frage; }).join(" | "));

/* Der Massstab: keine Flaeche ist gemessen, alle stehen im Plan. Das ist ein
   bestandenes Ergebnis und keine offene Zeile. */
const mg = (App.pruefung.pruefungen || []).find(function (x) {
  return x.id === "mass_guete"; });
pruefe(!!mg && mg.stufe === "gut",
  "\"Kein Massstab beteiligt\" ist ein bestandenes Ergebnis, ist: "
    + (mg ? mg.stufe : "keine Zeile"));
pruefe(!!mg && /als Text im Plan/.test(mg.text),
  "Der Satz muss die Herkunft der Flaechen richtig angeben, ist: "
    + (mg ? mg.text.slice(0, 80) : ""));

/* ===========================================================================
 * 2  Die Gegenrichtung: findet das Kontrollblatt eine Verfaelschung?
 * ======================================================================== */

/* 2a  Ein Raum wird aus der ersten Lesung geloescht. Die zweite hat dasselbe
       Blatt eigenstaendig gezaehlt und muss ihn vermissen. */
const s1 = bilanz(aufbauen(function (a) {
  a.raeume = a.raeume.filter(function (r) { return r.bezeichnung !== "KIND II"; });
}));
pruefe(hat(s1.fehler, "raeume_OG"),
  "Ein aus der Auslese geloeschter Raum muss als Fehler auffallen. Gefunden: "
    + s1.fehler.map(function (z) { return z.id; }).join(", "));

/* 2b  Ein Raum wird unter falschem Namen gelesen. Die Zahl stimmt, der Name
       nicht — und der Name setzt die Raumart und damit die Raumtemperatur. */
const s2 = bilanz(aufbauen(function (a) {
  a.raeume.find(function (r) { return r.bezeichnung === "BADEN"; })
    .bezeichnung = "ABSTELL";
}));
pruefe(hat(s2.warnung, "raeume_OG"),
  "Ein falsch gelesener Raumname muss auffallen, auch wenn die Zahl stimmt. "
    + "Gefunden: " + s2.warnung.map(function (z) { return z.id; }).join(", "));

/* 2c  Ein unbeheizter Bereich, den es im Werkzeug nicht gibt. Die
       Namensangleichung Spitzboden/Dachraum darf ihn NICHT mit abdecken:
       eine Garage ist kein Dachraum.

       SEIT DEM 24.08.2026 IST DAS KEIN ROTER BEFUND MEHR, SONDERN EINE
       ANGELEGTE ZONE. Der Befund war eine Sperre "nur mit schriftlicher
       Begruendung zu bestaetigen" fuer etwas, das das Werkzeug selbst
       beantworten kann: es kennt den Namen, es kennt die Lage nach
       DIN/TS 12831-1 Tabelle 5 und es kennt die Fundstelle. Geprueft wird
       deshalb jetzt das Ergebnis und nicht mehr die Frage: die Garage MUSS
       als eigene Zone in der Rechnung stehen, getrennt vom Dachraum. */
const A3 = aufbauen(function (a, g) {
  g.unbeheizt_benannt = ["SPITZBODEN", "GARAGE"];
});
const s3 = bilanz(A3);
const zonenArt = function (App2, re) {
  return (App2.p.zonen || []).filter(function (z) { return re.test(z.name || ""); });
};
pruefe(zonenArt(A3, /garage/i).length === 1,
  "Eine benannte Garage muss das Werkzeug selbst als Zone anlegen. Zonen: "
    + (A3.p.zonen || []).map(function (z) { return z.name; }).join(", "));
pruefe(zonenArt(A3, /spitzboden|dachraum/i).length === 1,
  "Und der Spitzboden bleibt eine eigene Zone -- eine Garage ist kein Dachraum");
pruefe(zonenArt(A3, /garage/i).every(function (z) {
  return z.automatisch === true && z.lage_angenommen === true && !!z.lage; }),
  "Die selbst angelegte Zone traegt ihre Kennzeichnung als Annahme und eine Lage");
pruefe(!s3.fehler.some(function (z) { return /^zone_fehlt_/.test(z.id); }),
  "Und danach steht kein roter Befund mehr da. Gefunden: "
    + s3.fehler.map(function (z) { return z.titel; }).join(", "));

/* 2c-GEGENPROBE 1  EINE GARAGENZONE DARF KEIN FEHLENDES GESCHOSS DECKEN.
   Die Zaehlung Z4 addiert beheizte Geschosse und unbeheizte Bereiche. Eine
   Garage steht NEBEN dem Haus und ist keine Ebene. Ohne diese Unterscheidung
   haette das selbsttaetige Anlegen einen echten Befund weggerechnet: die
   Zahl haette wieder gestimmt, und das Geschoss haette weiter gefehlt. */
const A3g = aufbauen(function (a, g) {
  g.unbeheizt_benannt = ["GARAGE"];
  /* Der Schnitt zaehlt eine Ebene mehr, als das Raumbuch kennt. */
  g.ebenen = g.ebenen.concat([{ bezeichnung: "2. OBERGESCHOSS", gezeichnet: false,
    raeume_beschriftet: 0, raumnamen: [], fenster: 0,
    aussen_breite_m: null, aussen_tiefe_m: null, aussen_wortlaut: "" }]);
});
const b3g = bilanz(A3g);
const zGesch = b3g.zeilen.find(function (z) { return z.id === "geschosse"; });
pruefe(!!zGesch && zGesch.stufe !== "gut",
  "Eine Garagenzone darf ein fehlendes Geschoss nicht zudecken, ist: "
    + (zGesch ? zGesch.stufe + " (" + zGesch.ist + " von " + zGesch.soll + ")"
       : "keine Zeile"));
pruefe(b3g.zeilen.some(function (z) {
  return /^geschoss_angenommen_2_og$/.test(z.id); }),
  "Das nicht gezeichnete Vollgeschoss muss als benannte Annahme dastehen. Zeilen: "
    + b3g.zeilen.map(function (z) { return z.id; }).join(", "));

/* 2c-GEGENPROBE 1b  UND WENN SICH NICHTS ABLEITEN LAESST, BLEIBT DIE SPERRE.
   Die Blattangabe nennt FUENF Ebenen, aber keine davon beim Namen. Dann kann
   das Werkzeug kein Geschoss ansetzen -- es weiss nicht, welches. Eine
   angelegte Garagenzone darf die Luecke trotzdem nicht schliessen: sonst
   waere ein echter Befund durch eine Zone neben dem Haus weggerechnet. */
const A3gz = aufbauen(function (a, g) {
  g.unbeheizt_benannt = ["GARAGE"];
  a.gebaeude = a.gebaeude || {};
  a.gebaeude.geschosse = "5";
});
const zGz = bilanz(A3gz).zeilen.find(function (z) { return z.id === "geschosse"; });
pruefe(zonenArt(A3gz, /garage/i).length === 1,
  "Die Garage ist angelegt (sonst prueft der naechste Satz nichts)");
pruefe(!!zGz && zGz.stufe === "fehler" && zGz.aufhebbar === false,
  "Ohne ableitbares Geschoss bleibt die Sperre stehen, ist: "
    + (zGz ? zGz.stufe + "/" + zGz.aufhebbar + " (" + zGz.ist + " von " + zGz.soll + ")"
       : "keine Zeile"));

/* 2c-GEGENPROBE 2  ZWEI ECHTE GARAGEN BLEIBEN ZWEI.
   Zaehlt EINE Quelle zwei Garagen auf, dann hat das Gebaeude zwei. Die
   Zusammenfuehrung darf sie nicht zu einer machen. */
const A3zwei = aufbauen(function (a, g) {
  g.unbeheizt_benannt = ["GARAGE NORD", "GARAGE SUED"];
});
pruefe(zonenArt(A3zwei, /garage/i).length === 2,
  "Zwei von EINER Quelle aufgezaehlte Garagen muessen zwei Bereiche bleiben. "
    + "Zonen: " + (A3zwei.p.zonen || []).map(function (z) { return z.name; }).join(", "));

/* 2c-GEGENPROBE 3  DIESELBE GARAGE, ZWEIMAL GELESEN, IST EINE.
   Der echte Fall: die Gebaeudeauslese meldet "vermutlich Garage rechts im
   Bild", die Blattlesung meldet "GARAGE". Zwei Quellen, je eine Garage --
   also eine Garage. Vorher wurden daraus zwei rote Sperren fuer ein
   Bauwerk. */
const A3ein = aufbauen(function (a, g) {
  g.unbeheizt_benannt = ["GARAGE"];
  a.gebaeude = a.gebaeude || {};
  a.gebaeude.unbeheizte_bereiche = ["vermutlich Garage rechts im Bild"];
});
pruefe(zonenArt(A3ein, /garage/i).length === 1,
  "Zwei Lesungen derselben Garage duerfen nur EINEN Bereich ergeben. Zonen: "
    + (A3ein.p.zonen || []).map(function (z) { return z.name; }).join(", "));
pruefe(!bilanz(A3ein).fehler.some(function (z) { return /^zone_fehlt_/.test(z.id); }),
  "Und keine Sperre uebrig lassen");

/* 2c1  DER FALL, UM DEN ES WIRKLICH GEHT.
 *
 * Die Lesung uebersieht das Wort SPITZBODEN und gibt unbeheizt_benannt LEER
 * zurueck. Genau das kann passieren -- es ist eine Modellantwort und keine
 * Messung. Bis hierher entstand daraus ein GRUENER HAKEN: "Die Auslese hat
 * in den Unterlagen keinen unbeheizten Bereich benannt; das ist eine Antwort
 * und keine Luecke." Auf demselben Bogen steht der Spitzboden im Schnitt.
 *
 * Der Befund darf nicht an dieser einen Zahl haengen. Die Ebenenliste
 * derselben Lesung fuehrt den SPITZBODEN weiter als benannt und NICHT
 * gezeichnet -- daraus allein muss der Befund entstehen. */
const s3a = bilanz(aufbauen(function (a, g) {
  g.unbeheizt_benannt = [];
}));
pruefe(s3a.fehler.some(function (z) { return /SPITZBODEN/i.test(z.titel || ""); })
  || (App.p.zonen || []).length > 0,
  "Ein nur im Schnitt benannter Spitzboden darf nicht an unbeheizt_benannt haengen");
pruefe(!s3a.zeilen.some(function (z) {
  return z.id === "zonen" && z.stufe === "gut"
    && /keinen unbeheizten Bereich benannt/.test(z.text || ""); }),
  "Aus einer leeren Liste darf nie ein gruener Haken werden");

/* 2c2  KEIN GRUEN AUS DEM FEHLEN EINES BELEGS.
 * Weder die Ebenenliste noch unbeheizt_benannt sagen etwas: dann ist die
 * Frage offen und steht als Grenze im Bericht, nicht als bestandene Probe. */
const s3b = bilanz(aufbauen(function (a, g) {
  g.unbeheizt_benannt = [];
  g.ebenen = [];
}));
const z3b = s3b.zeilen.concat(s3b.grenzen).find(function (z) { return z.id === "zonen"; });
pruefe(!!z3b && z3b.art === "grenze",
  "Ohne jeden Beleg gehoert die Zeile in den Bericht, ist: "
    + (z3b ? z3b.art + "/" + z3b.stufe : "keine Zeile"));
pruefe(!s3b.gegenproben.some(function (z) {
  return z.id === "zonen" && z.stufe === "gut"; }),
  "Eine unbeantwortete Frage darf nicht als bestandene Gegenprobe zaehlen");

/* 2c3  EIN KELLER, DEN ES IM WERKZEUG NICHT GIBT.
 * Das Kellergeschoss wird aus der ersten Lesung entfernt, die zweite nennt
 * es weiter. Dann fehlt der Rechnung ein ganzer Bereich samt Kellerdecke. */
const s3c = bilanz(aufbauen(function (a, g) {
  a.raeume = a.raeume.filter(function (r) { return r.geschoss !== "KG"; });
  g.unbeheizt_benannt = ["SPITZBODEN", "KELLERGESCHOSS"];
}));
const kellerZone = (T.App.p.zonen || []).find(function (z) {
  return /keller/i.test(z.name || z.id || ""); });
/* Zwei Ausgaenge sind richtig, ein dritter nicht. Entweder der Keller steht
   als Bereich MIT belegter Temperatur in der Rechnung, oder er faellt rot
   auf. Was nicht sein darf: er verschwindet still, oder er steht als leere
   Bilanzzone da -- die rechnet sich auf die Raumtemperatur und ergibt 0 W
   durch die Kellerdecke, also angelegt und wirkungslos. */
pruefe(s3c.fehler.some(function (z) { return /KELLER/i.test(z.titel || ""); })
  || (kellerZone && kellerZone.modus === "lage" && !!kellerZone.lage),
  "Ein benannter Keller muss entweder mit belegter Temperatur in der Rechnung "
    + "stehen oder rot auffallen. Zone: " + JSON.stringify(kellerZone || null));
pruefe(!kellerZone
  || kellerZone.modus !== "bilanz" || (kellerZone.huelle || []).length > 0,
  "Eine leere Bilanzzone ergibt 0 W und darf den Befund nicht aufheben");

/* 2c3b  DER KNOPF AM BEFUND MUSS EINE BRAUCHBARE ZONE ANLEGEN.
 * Er erzeugte bisher eine Zone mit modus "bilanz" und leerer Huelle. Der rote
 * Befund verschwand, die Heizlast blieb dieselbe. Jetzt zieht er die Lage aus
 * DIN/TS 12831-1 Tabelle 5 und kennzeichnet sie als Annahme. */
{
  const App3 = aufbauen(function (a, g) { g.unbeheizt_benannt = ["SPITZBODEN"]; });
  App3.p.zonen = [];
  const vorher = (App3.p.offeneFragen || []).length;
  const ok = KB.aktion("kbZoneAnlegen", { dataset: { kbName: "SPITZBODEN" } });
  const neu = (App3.p.zonen || [])[App3.p.zonen.length - 1];
  pruefe(ok === true && !!neu, "Der Knopf muss eine Zone anlegen");
  pruefe(!!neu && neu.modus === "lage" && neu.lage === "dach_geschlossen_undicht",
    "Die Zone bekommt die Lage aus der Tabelle, ist: " + JSON.stringify(neu || null));
  pruefe(!!neu && neu.lage_angenommen === true,
    "Die Lage ist eine Annahme und muss so gekennzeichnet sein");
  pruefe((App3.p.offeneFragen || []).length > vorher
    && (App3.p.offeneFragen || []).some(function (x) {
      return x.art === "grenze" && /Tabelle 5/.test(x.frage || ""); }),
    "Die Annahme muss mit Fundstelle im Bericht landen");
  /* Und sie muss eine Temperatur ergeben, die von der Raumtemperatur
     abweicht -- sonst waere die Zone wieder wirkungslos. */
  const th = fenster.DATEN_ZONENLAGEN.temperatur(neu.lage, 20, -10);
  pruefe(!!th && th.theta < 19,
    "Die angelegte Zone muss kaelter sein als der beheizte Raum, ist: "
      + (th ? th.theta : "keine Temperatur"));
}

/* 2c4  EINE ANGEBAUTE GARAGE, DIE NIEMAND BESCHRIFTET HAT.
 * Die zweite Lesung sieht die umschlossene Flaeche, kann sie aber nicht
 * benennen. Diese Zahl wurde erhoben, durchgereicht -- und von niemandem
 * gelesen. Jetzt erzeugt sie eine Zeile. */
const s3d = bilanz(aufbauen(function (a, g) {
  g.unbeheizt_unbenannt = 1;
}));
pruefe(s3d.zeilen.some(function (z) {
  return z.id === "zonen_unbenannt" && z.stufe === "warnung"; }),
  "Eine gesehene, aber unbeschriftete Flaeche muss eine Zeile erzeugen. Zeilen: "
    + s3d.zeilen.map(function (z) { return z.id + "/" + z.stufe; }).join(", "));

/* 2d  Die zweite Lesung sieht einen Raum, den die erste nicht hat, UND die
       Flaechensumme faellt unter das, was Waende und Treppe erklaeren. */
const s4 = bilanz(aufbauen(function (a) {
  a.raeume = a.raeume.filter(function (r) { return r.bezeichnung !== "WOHNEN"; });
}));
pruefe(hat(s4.fehler, "raeume_EG"),
  "Ein fehlender Raum im Erdgeschoss muss als Fehler auffallen");
pruefe(hat(s4.fehler, "flaeche_EG") || hat(s4.warnung, "flaeche_EG"),
  "Die Flaechenprobe muss den fehlenden Raum ebenfalls bemerken. Zeile: "
    + JSON.stringify((s4.zeilen.find(function (z) { return z.id === "flaeche_EG"; })
        || {}).stufe));

/* 2e  Ein Fenster mehr in der Ansicht als im ganzen Raumbuch: geometrisch
       unmoeglich, also ein Fehler — auch ohne jede Himmelsrichtung. */
const s5 = bilanz(aufbauen(function (a, g) {
  g.ansichten = [{ fassade: "West", fenster: 40 }];
}));
pruefe(hat(s5.fehler, "fenster_ansichtsumme"),
  "Mehr Fenster in einer Ansicht als im ganzen Gebaeude ist ein Fehler. Gefunden: "
    + s5.fehler.map(function (z) { return z.id; }).join(", "));

/* 2f  Ohne zweite Lesung faellt das Werkzeug auf den alten Stand zurueck:
       die Zahlen stehen dann als GRENZE im Bericht und nicht als bestandene
       Pruefung. Eine fehlende Gegenprobe darf nie als bestanden gelten. */
const ohne = (function () {
  const a1 = auslese1();
  const App2 = T.App;
  App2.p = T.leeresProjekt();
  App2.p.plan.seiten = [{ id: "s1", name: "Seite 1", bezeichnung: "BV 2-0887, Seite 1",
    art: "grundriss", felder: [], ausgewertet: true, auslese: a1 }];
  T.raeumeAusAusleseUebernehmen();
  T.automatischErgaenzen();
  T.automatischErgaenzen();
  T.rechnen();
  return bilanz(App2);
})();
pruefe(ohne.grenzen.length > b.grenzen.length,
  "Ohne zweite Lesung muessen mehr Grenzen im Bericht stehen: ohne "
    + ohne.grenzen.length + ", mit " + b.grenzen.length);
/* Die Uebernahme vom Plan ins Raumbuch bleibt geprueft — sie war nie die
   Frage. Was fehlt, ist die Vollstaendigkeit der EINEN Lesung, und genau das
   muss je Geschoss als Grenze dastehen und darf nicht als Beleg gelten. */
["KG", "EG", "OG"].forEach(function (g) {
  pruefe(hat(ohne.grenzen, "raeume_nur_eine_lesung_" + g),
    "Ohne zweite Lesung muss fuer " + g + " die Grenze \"nur eine Lesung\" stehen");
  const z = ohne.zeilen.find(function (x) { return x.id === "raeume_" + g; });
  pruefe(!!z && !/zweite, unabhängige Lesung/.test(String(z.quelle_soll || "")),
    "Ohne zweite Lesung darf sich " + g + " nicht auf sie berufen");
});
/* Und die Konturen fehlen: ohne Aussenbemassung ist die Flaechensumme gegen
   nichts zu halten. Auch das steht als Grenze, nicht als bestandene Probe. */
pruefe(!ohne.zeilen.some(function (z) {
    return /^flaeche_/.test(z.id) && z.stufe === "gut" && z.soll !== null; }),
  "Ohne Kontur darf keine Flaechensumme als belegt gelten");

/* Der Test muss sagen, was er ist -- in der Ausgabe, nicht nur im Kommentar.
   Ein Aufrufer, der nur die letzte Zeile liest, soll „nachgestellt" sehen. */
pruefe(Object.keys(FREI_ERFUNDEN).length >= 5,
  "Die Liste der frei gesetzten Felder darf nicht leer laufen; sie ist der "
    + "einzige Ort, an dem steht, worin dieser Test vom echten Blatt abweicht");
process.stderr.write(
  "HINWEIS: ziolkowski_test.js ist NACHGESTELLT. Beide Modellantworten stehen "
  + "in dieser Datei; es wird kein Endpunkt gerufen. "
  + Object.keys(FREI_ERFUNDEN).length + " Felder sind frei gesetzt, darunter "
  + "baujahr und plz, die auf dem Blatt NICHT stehen. Keine Zahl aus diesem "
  + "Lauf ist eine Aussage ueber das Gebaeude Ziolkowski.\n");
console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl,
  nachgestellt: true,
  was: "Modellantworten aus der Testdatei, kein Endpunktaufruf",
  frei_gesetzt: Object.keys(FREI_ERFUNDEN),
  fehler: fehler }));
process.exit(fehler.length === 0 ? 0 : 1);
