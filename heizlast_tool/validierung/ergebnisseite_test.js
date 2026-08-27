/* ===========================================================================
 * ergebnisseite_test.js — die umgebaute Ergebnisseite (Schritt 3)
 * ===========================================================================
 * Der Umbau vom 24.08.2026 ordnet die Ergebnisseite neu: oben die Zahl mit
 * Fläche, W/m² und Raumzahl, darunter das Urteil der vorhandenen Prüfung
 * („Belastbar unter N ausgewiesenen Annahmen") mit dem Weg zu den Annahmen
 * und dem Berichtsknopf, dann die Raumheizlasten mit Zusammensetzung je
 * Raum, erst danach die technischen Tabellen — zugeklappt, aber vollständig.
 *
 * Dieser Test zeichnet die Seite über denselben Verteiler wie ein Klick
 * (window.ZEICHNER) am Referenzprojekt Mälzerstraße 59 und prüft:
 *   1. der Kopf nennt kW, Fläche, W/m² und Raumzahl
 *   2. das Urteil kommt aus der VORHANDENEN Prüfung, keine zweite Regel;
 *      bei Stufe „annahme" wird die Zahl der Annahmen genannt
 *   3. der Berichtsknopf steht oben, und nur EIN gelber Knopf je Seite
 *   4. kein früherer Inhalt ist verschwunden: Bauteilbilanz, Anteile,
 *      Einheiten, Teillast, Prüfhinweise, Quellen stehen in Aufklappern
 *   5. Klick auf einen Raum: die Zusammensetzung zeigt jedes Bauteil mit
 *      seinem Wärmestrom und die Lüftung, und die Teile ergeben die Summe
 *   6. die Neurechnen-Anzeige sagt „vorher/jetzt" — und schweigt, wenn sich
 *      nichts Ablesbares geändert hat
 *
 * Aufruf:  node validierung/ergebnisseite_test.js
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

/* ---------------------------------------------------------------- Attrappe */
function knoten(name) {
  return {
    tagName: String(name || "div").toUpperCase(),
    innerHTML: "", value: "", checked: false, style: {}, dataset: {},
    id: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], files: [],
    appendChild(x) { this.children.push(x); return x; },
    removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    closest() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 900, height: 600, top: 0, left: 0 }; },
    getContext() { return kontext2d(); },
    toDataURL() { return "data:image/png;base64,x"; },
    scrollIntoView() {},
  };
}
function kontext2d() {
  const nichts = function () { return kontext2d(); };
  return new Proxy({}, {
    get(ziel, schluessel) {
      if (schluessel === "canvas") return knoten("canvas");
      if (schluessel === "measureText") return function () { return { width: 10 }; };
      if (schluessel === "getImageData") {
        return function () { return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; };
      }
      return nichts;
    },
    set() { return true; },
  });
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
  scrollTo() {}, print() {},
  MODUL_DIALOG: {
    sagen() { return { weg() {} }; },
    fragen() { return { then(cb) { return cb ? cb(true) : true; }, catch() { return this; } }; },
    eingabe() { return { then(cb) { return cb ? cb("") : ""; }, catch() { return this; } }; },
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
  createElement(n) { const k = knoten(n);
    k.setAttribute = function (a, v) { if (a === "id") this.id = v; };
    return k; },
  createElementNS: knoten,
  createTextNode() { return knoten("text"); },
  getElementById(id) {
    return seite.body.children.find(function (k) { return k.id === id; }) || null;
  },
  querySelector() { return null; }, querySelectorAll() { return []; },
  body: knoten("body"), head: knoten("head"), documentElement: knoten("html"),
  activeElement: null,
};
/* createElement setzt id direkt, damit getElementById die Neurechnen-Anzeige
   wiederfindet — der Test unten haengt daran. */
seite.createElement = function (n) {
  const k = knoten(n);
  const set = k.setAttribute;
  k.setAttribute = function (a, v) { if (a === "id") k.id = v; return set.call(k, a, v); };
  Object.defineProperty(k, "id", { value: "", writable: true });
  return k;
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
appQuelle += "\n;window.__ergpruef = { App, rechnen, leeresProjekt,"
  + " neurechnenMelden, annahmenListe };\n";
try {
  vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" });
} catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__ergpruef;

/* ------------------------------------------------- Referenzprojekt aufbauen */
const roh = JSON.parse(fs.readFileSync(
  path.join(WURZEL, "validierung/faelle/maelzerstr59.json"), "utf8"));
const UMLAUT = [["Aussen", "Außen"], ["Dachschraege", "Dachschräge"],
                ["Waerme", "Wärme"], ["Flaeche", "Fläche"], ["tuer", "tür"],
                ["Tuer", "Tür"], ["ueber", "über"], ["Kueche", "Küche"],
                ["Gelaende", "Gelände"], ["Fussboden", "Fußboden"],
                ["erdberuehrt", "erdberührt"], ["Waende", "Wände"]];
function mitUmlaut(s) {
  let x = String(s == null ? "" : s);
  UMLAUT.forEach(function (u) { x = x.split(u[0]).join(u[1]); });
  return x;
}
const typen = [];
const typIndex = {};
roh.raeume.forEach(function (r) {
  (r.bauteile || []).forEach(function (bt) {
    const s = bt.name.split(" (")[0] + "|" + Math.round(bt.U * 1e6);
    if (!typIndex[s]) {
      typIndex[s] = "bt_" + (typen.length + 1);
      typen.push({ id: typIndex[s], name: mitUmlaut(bt.name.split(" (")[0]), U: bt.U,
                   kat_default: bt.kat || "huelle", schichten: [], belegt: false,
                   quelle: "Referenzprojekt" });
    }
  });
});
const p = T.leeresProjekt();
p.meta = { bezeichnung: "Referenzfall", strasse: "Beispielweg 1", plz: "33098",
           ort: "Paderborn", bauherr: "", projektnr: "T", baujahr: 1936,
           bearbeitet: "2026-01-01" };
p.klima = roh.klima;
p.luftdichtheit = { n50: roh.luftdichtheit.n50, kategorie: "annahme", quelle: "Annahme" };
p.norm = roh.norm;
p.zonen = (roh.zonen || []).map(function (z) {
  return Object.assign({}, z, { name: mitUmlaut(z.name),
    huelle: (z.huelle || []).map(function (b) {
      return Object.assign({}, b, { name: mitUmlaut(b.name) }); }) });
});
p.bauteiltypen = typen;
p.einheiten = [{ id: "we1", name: "WE 1", personen: 2 }];
p.raeume = roh.raeume.map(function (r, i) {
  return { id: "r" + i, geschoss: r.geschoss || "EG", name: mitUmlaut(r.name),
           art: r.art || "wohnen",
           A: r.A, h: r.h, we: "WE 1", theta_i: r.theta_i,
           bauteile: (r.bauteile || []).map(function (b) {
             return { typ_id: typIndex[b.name.split(" (")[0] + "|" + Math.round(b.U * 1e6)],
                      name: mitUmlaut(b.name), A: b.A, kat: b.kat,
                      grenzt_an: b.grenzt_an || { typ: "aussen" } };
           }) };
});
p.plan = { bilder: [], seiten: [] };
T.App.p = p;
try { T.rechnen(); } catch (e) { fehler.push("rechnen() bricht ab: " + e.message); }
const e = T.App.ergebnis;
pruefe(e && !e.fehlerhaft && e.phi_gebaeude > 0, "Das Referenzprojekt rechnet");

const de = function (x, n) {
  return x.toLocaleString("de-DE", { minimumFractionDigits: n, maximumFractionDigits: n });
};

/* ----------------------------------------------- 1 Kopf: Zahl und Bezugswerte */
T.App.schritt = "ergebnis";
const z = fenster.window.ZEICHNER.ergebnis;
pruefe(typeof z === "function", "Der Zeichner der Ergebnisseite fehlt");
let html = z();
pruefe(html.indexOf("Norm-Gebäudeheizlast") > 0, "Der Kopf nennt die Groesse");
pruefe(html.indexOf(de(e.phi_gebaeude / 1000, 2) + "<small> kW</small>") > 0,
  "Der Kopf traegt die kW-Zahl gross");
pruefe(html.indexOf(de(e.A_gesamt, 1) + " m²") > 0, "Der Kopf nennt die Flaeche");
pruefe(html.indexOf(de(e.spez_gebaeude, 1) + " W/m²") > 0,
  "Der Kopf nennt den spezifischen Wert");
pruefe(html.indexOf(e.raeume.length + " Räume") > 0, "Der Kopf nennt die Raumzahl");

/* --------------------------------- 2 Urteil aus der vorhandenen Pruefung */
pruefe(!!T.App.pruefung, "Die Selbstpruefung liegt vor");
{
  const wort = { rot: "Nicht belastbar", gelb: "Mit Einschränkung belastbar",
                 annahme: "Belastbar unter", gruen: "Belastbar" }[T.App.pruefung.ampel];
  pruefe(html.indexOf('data-schritt="pruefung"') > 0,
    "Das Urteil verweist auf die Selbstpruefung");
  pruefe(html.indexOf(wort) > 0,
    "Das Urteil traegt das Wort der Stufe " + T.App.pruefung.ampel);
}
{
  /* Stufe „annahme" mit zwei Annahmen: die Zeile nennt die Zahl. Das ist
     Sebastians Fall („Belastbar unter 2 ausgewiesenen Annahmen"). */
  const altPr = T.App.pruefung, altAn = T.App.p.annahmen;
  T.App.pruefung = { ampel: "annahme", zaehl: { fehler: 0, warnung: 2, hinweis: 0, gut: 1 } };
  T.App.p.annahmen = {
    baujahr: { wert: 2022, kurz: "Baujahr 2022 aus dem Plandatum",
               begruendung: "Plandatum", richtung: "" },
    klima: { wert: -10.7, kurz: "Norm-Außentemperatur aus dem Ort",
             begruendung: "Ort vom Blatt", richtung: "" },
  };
  const h2 = z();
  pruefe(h2.indexOf("Belastbar unter 2 ausgewiesenen Annahmen") > 0,
    "Bei Stufe annahme steht die Zahl der Annahmen in der Zeile");
  pruefe(h2.indexOf('data-aktion="ergebnisAnnahmen"') > 0,
    "Der Weg zu den Annahmen steht daneben");
  /* Aufgeklappt erscheint die VORHANDENE Annahmenkarte. */
  T.App.ergebnisAnnahmenOffen = true;
  const h3 = z();
  pruefe(h3.indexOf("annahmenkarte") > 0,
    "Annahmen anzeigen oeffnet die vorhandene Annahmenkarte");
  pruefe(h3.indexOf("Baujahr 2022 aus dem Plandatum") > 0,
    "Die Annahmenkarte traegt die Annahme mit Begruendung");
  pruefe(h3.indexOf("einer Annahme") < 0 || h3.indexOf("1 einer Annahme") < 0,
    "Kein krummer Zaehler wie '1 einer Annahme' in der Annahmenkarte");
  pruefe(h3.indexOf("steht auf 2 Annahmen") > 0,
    "Bei zwei Annahmen: 'steht auf 2 Annahmen'");
  T.App.ergebnisAnnahmenOffen = false;
  T.App.pruefung = altPr; T.App.p.annahmen = altAn;
}

/* ------------------------------------------- 3 Berichtsknopf oben, EIN Gelb */
pruefe(html.indexOf('data-aktion="bericht"') > 0,
  "Der Berichtsknopf steht auf der Ergebnisseite");
pruefe((html.match(/class="btn[^"]*\bcta\b/g) || []).length === 1,
  "Genau EIN gelber Handlungsknopf auf der Seite");
pruefe(html.indexOf('class="btn cta" data-aktion="bericht"') > 0
  && html.indexOf("Bericht erstellen") > 0,
  "Der gelbe Knopf ist der Berichtsknopf");

/* ------------------------- 4 Nichts verschwunden: die Technik in Aufklappern */
["Bauteilbilanz", "Transmission, Lüftung und Kennwerte",
 "Je Wohn- und Nutzungseinheit", "Teillast", "Prüfhinweise",
 "Quellen und Verfahren"].forEach(function (t) {
  pruefe(html.indexOf("<summary>" + t) > 0,
    'Der Abschnitt "' + t + '" fehlt in den Aufklappern');
});
pruefe((html.match(/<details/g) || []).length >= 6,
  "Die technischen Abschnitte stehen als details-Elemente");
pruefe(html.indexOf("H<sub>T</sub>") > 0, "H_T ist weiter da (im Aufklapper)");
/* H_T IST SEIT DEM 27.08.2026 EINE ANDERE GROESSE.
   Vorher war es die Gebaeudesumme, auf 20 °C zurueckgerechnet; jetzt ist es
   der spezifische Transmissionswaermeverlust der Huelle, SUM(A · U · b) --
   unabhaengig von den Raumtemperaturen (Begruendung in
   src/kerne/kern_heizlast_norm.js, Probe in validierung/referenz_test.js R05).
   Die Beschriftung darunter stand noch auf "Transmission bei 20 °C" und lud
   damit zum Vergleich mit dem falschen Kennwert ein. Sie darf keine
   Bezugstemperatur mehr behaupten. */
pruefe(html.indexOf("Transmission bei 20") < 0,
  "Die Beschriftung von H_T darf keine Bezugstemperatur von 20 °C mehr "
    + "behaupten: H_T ist eine Eigenschaft der Huelle, nicht der Raumtemperatur");
pruefe(/H<sub>T<\/sub>[\s\S]{0,220}A · U · b/.test(html),
  "Unter H_T muss stehen, was die Zahl ist: die Summe A · U · b der Huelle");
pruefe(html.indexOf("Auslegungspunkt, Norm-Außentemperatur") > 0,
  "Die Teillast-Kennlinie steht im Aufklapper");
/* Die Raumtabelle steht VOR dem ersten Aufklapper. */
pruefe(html.indexOf("Raumheizlasten") < html.indexOf("<details"),
  "Die Raumheizlasten stehen vor den zugeklappten Details");

/* ----------------------------- 5 Klick auf einen Raum: die Zusammensetzung */
{
  const r0 = e.raeume[0];
  pruefe(html.indexOf('data-aktion="ergebnisRaum" data-id="' + r0.id + '"') > 0,
    "Jede Raumzeile ist ein Weg zur Zusammensetzung");
  T.App.ergebnisRaum = r0.id;
  const h4 = z();
  pruefe(h4.indexOf("Raumheizlast " + r0.raum) > 0,
    "Die Zusammensetzung nennt den Raum und seine Summe");
  r0.bauteile.forEach(function (b) {
    pruefe(h4.indexOf(de(b.phi, 0)) > 0,
      "Der Waermestrom von " + b.name + " (" + de(b.phi, 0) + " W) steht in der "
      + "Zusammensetzung");
  });
  pruefe(h4.indexOf("Lüftung — ") > 0 && h4.indexOf(de(r0.phi_V, 0)) > 0,
    "Die Lueftung steht mit Luftstrom und Watt in der Zusammensetzung");
  /* Die Teile muessen die Summe ergeben — dieselbe Probe, die ein Pruefer
     mit dem Taschenrechner macht. */
  const summe = r0.bauteile.reduce(function (s, b) { return s + b.phi; }, 0)
    + r0.phi_V + (r0.phi_RH || 0);
  pruefe(Math.abs(summe - r0.phi_raum) < 0.5,
    "Bauteile + Lueftung + Aufheizung = Raumheizlast (" + de(summe, 1) + " gegen "
    + de(r0.phi_raum, 1) + " W)");
  T.App.ergebnisRaum = null;
}

/* --------------------------------------------- 6 Die Neurechnen-Anzeige */
{
  seite.body.children.length = 0;
  T.neurechnenMelden(e.phi_gebaeude);          // nichts geaendert
  pruefe(seite.body.children.length === 0,
    "Ohne Aenderung keine Neurechnen-Meldung");
  T.neurechnenMelden(e.phi_gebaeude + 420);    // vorher lag 420 W hoeher
  const el = seite.body.children.find(function (k) { return k.id === "neurechnen"; });
  pruefe(!!el, "Nach einer Aenderung erscheint die Neurechnen-Meldung");
  if (el) {
    pruefe(el.innerHTML.indexOf("vorher") >= 0 && el.innerHTML.indexOf("jetzt") >= 0,
      "Die Meldung sagt vorher und jetzt: " + el.innerHTML);
    pruefe(el.innerHTML.indexOf(de((e.phi_gebaeude + 420) / 1000, 2)) >= 0
      && el.innerHTML.indexOf(de(e.phi_gebaeude / 1000, 2)) >= 0,
      "Beide Zahlen stehen in der Meldung: " + el.innerHTML);
    pruefe(el.innerHTML.indexOf("−" + de(0.42, 2)) >= 0,
      "Die Differenz steht mit Vorzeichen in der Meldung: " + el.innerHTML);
  }
}

/* ---------------------------------------------------------------- Ergebnis */
const ergebnis = { ok: fehler.length === 0, anzahl: anzahl, fehler: fehler };
console.log(JSON.stringify(ergebnis));
if (!ergebnis.ok) process.exit(1);
