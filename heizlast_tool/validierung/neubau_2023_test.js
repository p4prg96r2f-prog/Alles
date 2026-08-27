/* ===========================================================================
 * neubau_2023_test.js — die Kette vom Baujahr bis zur Heizlast, für Neubauten
 * ===========================================================================
 * WORUM ES GEHT
 *
 * Am 24.08.2026 stand Sebastians Blatt „BV 2-0887 Ziolkowski" mit dem von
 * Hand eingetragenen Baujahr 2025 auf 0,00 kW. Das Kontrollblatt meldete
 * „Bauteile im Projekt 0 — im ganzen Projekt ist kein einziges Bauteil
 * angelegt, über alle 22 Räume nicht", und der Bericht war gesperrt.
 *
 * Die Ursache lag am Anfang der Kette und nicht im Kontrollblatt: die
 * hinterlegte Gebäudetypologie (IWU 2015) endet mit dem Baujahr 2022. Für ein
 * jüngeres Gebäude lieferte zumBaujahr() keine U-Werte, startwerte() keine
 * Zeile, app.js keinen Bauteiltyp — und ohne Bauteiltyp entsteht in keinem
 * Raum ein Bauteil.
 *
 * WAS DIESE DATEI PRÜFT, UND WARUM SIE NICHT IM MODUL STEHT
 *
 * Der Selbsttest von daten_typologie.js prüft die Tabelle. Er kann nicht
 * finden, dass ihr Ergebnis anschließend niemand abholt. Genau das war der
 * Fehler: die Werte waren da, der Weg von ihnen zum Bauteil aber nicht. Diese
 * Datei geht deshalb denselben Weg wie der Bearbeiter — app.js in derselben
 * Attrappe wie uebernahme_test.js, Räume anlegen, Baujahr eintragen,
 * ergänzen lassen, rechnen — und misst am Ende Kilowatt.
 *
 * Zwei Richtungen, beide sind Pflicht:
 *   1. Mit Baujahr 2025 MÜSSEN Bauteile entstehen und die Heizlast > 0 sein,
 *      die U-Werte müssen aus dem Referenzgebäude kommen und das auch sagen.
 *   2. OHNE Baujahr darf nichts entstehen, und die Sperre „Bauteile im
 *      Projekt" MUSS anschlagen. Eine Prüfung, die nach der Berichtigung
 *      nicht mehr anschlagen kann, ist keine Prüfung mehr.
 *
 * Aufruf:  node validierung/neubau_2023_test.js
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
 * Wortgleich mit uebernahme_test.js: nur so viel Seite, wie app.js beim Laden
 * anfasst. Zwei verschiedene Attrappen wären zwei verschiedene Wahrheiten. */
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
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js",
  "src/kerne/kern_lage.js", "src/kerne/kern_fenster.js", "src/kerne/kern_messen.js",
  "src/kerne/kern_annahmen.js", "src/kerne/kern_huellendeckung.js",
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
appQuelle += "\n;window.__pruef = { App, leeresProjekt, automatischErgaenzen,"
  + " bauteileErgaenzen, projektFuerKern, typologieNachfuehren, uid };\n";
try {
  vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" });
} catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__pruef;
const DT = fenster.DATEN_TYPOLOGIE;
const K = fenster.KERN_HEIZLAST_NORM;
const KB = fenster.MODUL_KONTROLLBLATT;

/* ------------------------------------------------------------------ Baukasten
 * Ein kleines, aber vollständiges Haus: zwei Geschosse, je zwei Räume, alle
 * mit Außenwand. Die Zahlen sind frei gewählt — es geht hier nicht um die
 * Höhe der Heizlast, sondern darum, DASS eine entsteht. */
function haus(baujahr, gebaeudeart) {
  T.App.p = T.leeresProjekt();
  const p = T.App.p;
  p.meta.plz = "33102";                      // Paderborn, für theta_e
  p.meta.gebaeudeart = gebaeudeart || "efh";
  if (baujahr !== null) p.meta.baujahr = String(baujahr);
  [["EG", "Wohnen", 24], ["EG", "Küche", 14],
   ["OG", "Schlafen", 18], ["OG", "Bad", 9]].forEach(function (x, i) {
    p.raeume.push({ id: "r" + i, geschoss: x[0], name: x[1], A: x[2], h: 2.55,
                    art: x[1] === "Bad" ? "bad" : "wohnen",
                    aussenwaende: 2, fenster_anzahl: 1, bauteile: [] });
  });
  T.automatischErgaenzen();
  T.bauteileErgaenzen();
  return p;
}

function heizlast(p) {
  const r = K.rechne(T.projektFuerKern(p));
  return Math.round(r.phi_gebaeude) / 1000;   // kW
}
function bauteileGesamt(p) {
  return (p.raeume || []).reduce(function (s, r) {
    return s + ((r.bauteile || []).length); }, 0);
}
function sperrzeile(p) {
  return (KB.zaehler(p) || []).find(function (z) {
    return z.id === "bauteile_bestand"; }) || null;
}

/* ========================================================================
 * 1  BAUJAHR 2025 — der Fall, der auf 0,00 kW stand
 * ===================================================================== */
const p2025 = haus(2025);
pruefe(p2025.bauteiltypen.length === 6,
  "Baujahr 2025 muss 6 Bauteiltypen anlegen, hat: " + p2025.bauteiltypen.length);
pruefe(bauteileGesamt(p2025) > 0,
  "Baujahr 2025 muss Bauteile in den Raeumen erzeugen, hat: "
    + bauteileGesamt(p2025));
const kw2025 = heizlast(p2025);
pruefe(kw2025 > 0,
  "Baujahr 2025 muss eine Heizlast groesser null ergeben, ist: " + kw2025 + " kW");
pruefe(!sperrzeile(p2025),
  "Die Sperre „Bauteile im Projekt“ darf bei Baujahr 2025 nicht mehr stehen");

/* Die Werte müssen die des Referenzgebäudes sein — und nicht die von 2015,
   die vorher hier standen, wenn jemand die Grenze aufgeweicht hätte. */
const soll = { "Außenwand": 0.28, "Dach": 0.20, "Kellerdecke": 0.35,
               "Bodenplatte": 0.35, "Fenster": 1.3, "Außentür": 1.8 };
Object.keys(soll).forEach(function (n) {
  const bt = p2025.bauteiltypen.find(function (x) { return x.name === n; });
  pruefe(bt && Math.abs(bt.U - soll[n]) < 0.0001,
    "Bauteiltyp " + n + " muss U = " + soll[n] + " tragen, traegt: "
      + (bt ? bt.U : "gar nichts"));
  pruefe(bt && /Anlage 1 \(zu § 15 Absatz 1\)/.test(bt.quelle || ""),
    "Bauteiltyp " + n + " muss die Fundstelle Anlage 1 tragen");
  pruefe(bt && /OBERGRENZE/.test(bt.quelle || ""),
    "Bauteiltyp " + n + " muss sagen, dass es eine Obergrenze ist");
  pruefe(bt && bt.typologie === true,
    "Bauteiltyp " + n + " muss als vorbelegt gekennzeichnet sein (ueberschreibbar)");
  pruefe(bt && bt.belegt === false,
    "Bauteiltyp " + n + " darf nicht als belegt gelten — er ist eine Annahme");
});

/* Der Wert bleibt überschreibbar, und eine Überschreibung überlebt das
   nächste Ergänzen. Ohne diese Probe wäre „überschreibbar" eine Behauptung. */
const wand = p2025.bauteiltypen.find(function (x) { return x.name === "Außenwand"; });
wand.U = 0.15; wand.belegt = true; wand.typologie = false;
wand.quelle = "GEG-Nachweis des Objekts";
T.automatischErgaenzen();
pruefe(wand.U === 0.15 && wand.quelle === "GEG-Nachweis des Objekts",
  "Ein von Hand gesetzter U-Wert darf nicht wieder ueberschrieben werden, ist: "
    + wand.U);

/* ========================================================================
 * 2  DIE GRENZE — 2022 kommt weiter aus der Typologie
 * ===================================================================== */
const p2022 = haus(2022);
const wand22 = p2022.bauteiltypen.find(function (x) { return x.name === "Außenwand"; });
pruefe(wand22 && Math.abs(wand22.U - 0.27) < 0.0001,
  "Baujahr 2022 muss weiter den Typologiewert 0,27 tragen, traegt: "
    + (wand22 ? wand22.U : "gar nichts"));
pruefe(wand22 && /IWU/.test(wand22.quelle || ""),
  "Baujahr 2022 muss weiter die IWU-Fundstelle tragen");
pruefe(heizlast(p2022) > 0, "Baujahr 2022 muss weiter rechnen");

/* ========================================================================
 * 3  BAUJAHR NACHTRÄGLICH GEÄNDERT — die U-Werte müssen mitgehen
 * =====================================================================
 * Das Feld neben der Annahme wäre sonst eine Attrappe: wer 1965 auf 2025
 * berichtigt, bekäme weiter die U-Werte von 1965 samt ihrer Fundstelle. */
const pWechsel = haus(1965);
const wandAlt = pWechsel.bauteiltypen.find(function (x) { return x.name === "Außenwand"; });
const uAlt = wandAlt ? wandAlt.U : null;
pWechsel.meta.baujahr = "2025";
T.typologieNachfuehren();
const wandNeu = pWechsel.bauteiltypen.find(function (x) { return x.name === "Außenwand"; });
pruefe(wandNeu && Math.abs(wandNeu.U - 0.28) < 0.0001,
  "Nach der Berichtigung auf 2025 muss die Wand 0,28 tragen, traegt: "
    + (wandNeu ? wandNeu.U : "gar nichts") + " (vorher " + uAlt + ")");
pruefe(wandNeu && /Anlage 1/.test(wandNeu.quelle || ""),
  "Und die Fundstelle muss mitgehen");

/* ========================================================================
 * 4  NICHTWOHNGEBÄUDE — Neubau aus Anlage 2, Bestand als Rückfall
 * ===================================================================== */
const pNwgNeu = haus(2025, "nwg");
pruefe(pNwgNeu.bauteiltypen.length === 6,
  "Nichtwohngebaeude 2025 muss 6 Bauteiltypen anlegen, hat: "
    + pNwgNeu.bauteiltypen.length);
pruefe(heizlast(pNwgNeu) > 0, "Nichtwohngebaeude 2025 muss rechnen");
pruefe((pNwgNeu.bauteiltypen[0].quelle || "").indexOf("Anlage 2") >= 0,
  "Nichtwohngebaeude-Neubau muss Anlage 2 nennen");

const pNwgAlt = haus(1990, "nwg");
pruefe(pNwgAlt.bauteiltypen.length === 6,
  "Nichtwohngebaeude 1990 muss 6 Bauteiltypen anlegen, hat: "
    + pNwgAlt.bauteiltypen.length);
pruefe(heizlast(pNwgAlt) > 0, "Nichtwohngebaeude 1990 muss rechnen");
pruefe(/RÜCKFALLWERT/.test(pNwgAlt.bauteiltypen[0].quelle || ""),
  "Der Rueckfall muss sich im Klartext Rueckfallwert nennen");
pruefe(!sperrzeile(pNwgAlt),
  "Auch beim Nichtwohngebaeude darf die Sperre nicht mehr stehen");

/* ========================================================================
 * 5  OHNE BAUJAHR RECHNET DAS WERKZEUG WEITER — DIE SPERRE BLEIBT TROTZDEM
 * =====================================================================
 * GEÄNDERT 25.08.2026 auf Vorgabe des Kunden: „Es darf KEINE
 * Berechnungsabbrüche mehr geben." Bis dahin hielt ein fehlendes Baujahr die
 * ganze Rechnung an — keine Klasse, keine U-Werte, kein Bauteil, 0,00 kW.
 * Diese Datei verlangte GENAU DAS, also musste sie mitwandern.
 *
 * Die Regel ist damit nicht weicher, sondern anders: Ein UNBEKANNTES Baujahr
 * ist eine fehlende EINGABE, für die es einen belegten Rückfall gibt
 * (daten_typologie.ohneBaujahr, Klasse 1969 bis 1978, gegengeprüft an
 * BAnz AT 04.12.2020 B1). Sie hält die Rechnung nicht auf, sie färbt sie.
 * FEHLENDE BAUTEILTYPEN dagegen sind ein DEFEKT — wenn jemand sie entfernt,
 * gibt es nichts, worauf ein Rückfall greifen könnte. Dort bleibt die Sperre
 * hart, und Abschnitt 5b unten weist das nach.
 *
 * Wäre beides gleich behandelt, hätte diese Änderung eine echte Prüfung
 * mitgenommen — genau das soll sie nicht. */
const pOhne = haus(null);
pruefe(pOhne.bauteiltypen.length === 6,
  "Ohne Baujahr MUSS der Rueckfall 6 Bauteiltypen liefern, es sind: "
    + pOhne.bauteiltypen.length);
pruefe(bauteileGesamt(pOhne) > 0,
  "Aus den Rueckfalltypen MUESSEN Bauteile entstehen, es sind: "
    + bauteileGesamt(pOhne));
pruefe(heizlast(pOhne) > 0 && isFinite(heizlast(pOhne)),
  "Ohne Baujahr MUSS eine endliche Heizlast entstehen, ist: " + heizlast(pOhne));
pruefe(/RÜCKFALLWERT/.test(pOhne.bauteiltypen[0].quelle || ""),
  "Jeder Rueckfallwert MUSS sich im Klartext so nennen");
pruefe(/Richtung des Fehlers/.test(pOhne.bauteiltypen[0].quelle || ""),
  "Und er MUSS sagen, in welche Richtung er falsch liegen kann");
pruefe(!sperrzeile(pOhne),
  "Ohne Baujahr darf die Sperre „Bauteile im Projekt“ NICHT mehr stehen");

/* Derselbe Fall von der anderen Seite: Baujahr da, Bauteile von Hand weg. */
const pLeer = haus(2025);
pLeer.bauteiltypen.length = 0;
pLeer.raeume.forEach(function (r) { r.bauteile = []; });
const zLeer = sperrzeile(pLeer);
pruefe(zLeer && zLeer.stufe === "fehler",
  "Auch mit Baujahr, aber ohne Bauteile MUSS die Sperre anschlagen, ist: "
    + (zLeer ? zLeer.stufe : "keine Zeile"));
/* Ohne Bauteil ist der TRANSMISSIONSANTEIL null — genau das beschreibt die
   Sperre. Was danach noch übrig bleibt, ist die Lüftung; sie hängt am
   Luftvolumen und nicht an der Hülle. Die Zeile hier prüft deshalb phi_T und
   nicht die Gesamtlast, sonst prüfte sie am Befund vorbei. */
const rLeer = K.rechne(T.projektFuerKern(pLeer));
pruefe(Math.round(rLeer.phi_T_gebaeude) === 0,
  "Ohne Bauteil muss der Transmissionsanteil null sein, ist: "
    + rLeer.phi_T_gebaeude + " W");
pruefe(rLeer.phi_gebaeude < heizlast(p2025) * 1000,
  "Und die Gesamtlast muss deutlich unter der des vollstaendigen Hauses liegen");

/* ------------------------------------------------------------------ Ausgabe */
console.log(JSON.stringify({
  ok: fehler.length === 0, anzahl: anzahl, fehler: fehler,
  kw_2025: kw2025,
}));
