/* ===========================================================================
 * ablauf_test.js — der dreistufige Normalablauf und das Urteil
 * ===========================================================================
 * Der Umbau vom 24.08.2026: Unterlagen -> Rueckfragen -> Ergebnis, die alten
 * Pflichtschritte leben als Expertenbereiche weiter, nach der Analyse steht
 * ein Urteil statt eines Sprungs ins Kontrollblatt. Diese Probe verlangt:
 *
 *   1  Der Hauptlauf hat genau die drei Schritte, in dieser Reihenfolge.
 *   2  NICHTS ist geloescht: jeder fruehere Bereich (Objekt und Klima, Plan
 *      pruefen, Kontrollblatt, Raumbuch, Bauteile, Zonen, Umfahren,
 *      Selbstpruefung) steht im Expertenmodus und hat einen Zeichner.
 *   3  Das Umfahren-Werkzeug steht NICHT im Normalablauf.
 *   4  Die Kostengrenze der selbststartenden Analyse haelt den belegten
 *      Deckel von 2 $ je Bericht (SPEZIFIKATION_ABLAUF) samt Reserve fuer
 *      zerlegte Boegen ein.
 *   5  Das Urteil uebersetzt die vorhandene Wahrheit: rot ohne Raeume (mit
 *      Grund, Weg und Rettungslink), gruen nur wenn kern_pruefung keinen
 *      Fehler offen hat, und die genannte Zahl der Angaben ist DIESELBE
 *      Liste, die Schritt 2 stellt.
 *   6  EINE URSACHE = EINE FRAGE: sieben Raeume ohne Hoehe im selben
 *      Geschoss ergeben genau eine Frage, mit Anzahl und Vorschlag.
 *
 * Aufruf:  node validierung/ablauf_test.js
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
 * Dieselbe Attrappe wie in oberflaeche_test.js: so viel Seite, wie app.js
 * beim Laden anfasst. */
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
  scrollTo() {}, alert() {}, confirm() { return true; }, print() {},
  MODUL_DIALOG: {
    sagen() { return { weg() {} }; },
    fragen() { return Promise.resolve(true); },
    eingabe() { return Promise.resolve(""); },
    arbeit() { return { text() {}, fertig() {}, warten() { return Promise.resolve(); } }; },
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
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), umgebung, { filename: d }); }
  catch (e) { fehler.push(d + " laesst sich nicht laden: " + e.message); }
}
let app = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
app += "\n;window.__ablauf = { SCHRITTE, SCHRITTE_DETAIL, App, leeresProjekt,"
  + " rechnen, rueckfragenListe, urteilBerechnen, urteilHtml, schrittRueckfragen,"
  + " schrittStart, AUTO_ANALYSE_GRENZE };\n";
try { vm.runInContext(app, umgebung, { filename: "src/app.js" }); }
catch (e) { fehler.push("app.js laesst sich nicht laden: " + e.message); }

const T = fenster.__ablauf;
if (!T) {
  console.log(JSON.stringify({ ok: false, anzahl: anzahl,
    fehler: fehler.concat(["app.js stellt die Ablaufsymbole nicht bereit."]) }));
  process.exit(1);
}

/* ---------------------------------------------- 1  Drei Schritte, Reihenfolge */
pruefe(T.SCHRITTE.map(function (s) { return s.id; }).join(",")
    === "start,rueckfragen,ergebnis",
  "Der Hauptlauf muss genau start,rueckfragen,ergebnis sein, ist "
  + T.SCHRITTE.map(function (s) { return s.id; }).join(","));

/* ------------------------------------- 2  Nichts geloescht: Expertenbereiche */
["projekt", "pruefblatt", "kontrolle", "raeume", "bauteile", "zonen",
 "plan", "pruefung"].forEach(function (id) {
  pruefe(T.SCHRITTE_DETAIL.some(function (s) { return s.id === id; }),
    'Der fruehere Bereich "' + id + '" fehlt im Expertenmodus. Es darf nichts '
    + "geloescht werden, nur umgehaengt.");
  pruefe(typeof (fenster.window.ZEICHNER || {})[id] === "function",
    'Der Expertenbereich "' + id + '" hat keinen Zeichner mehr.');
});

/* --------------------------------------- 3  Umfahren nicht im Normalablauf */
pruefe(!T.SCHRITTE.some(function (s) { return s.id === "plan"; }),
  "Das Umfahren-Werkzeug steht wieder im Normalablauf. Es gehoert in den "
  + "Expertenmodus und an seinen Rettungsfall.");

/* ------------------------------------------------- 4  Kostengrenze belegt */
pruefe(T.AUTO_ANALYSE_GRENZE >= 1,
  "Die Grenze der selbststartenden Analyse muss mindestens 1 Blatt sein.");
/* 0,28 $ je Blatt ist der SCHLECHTESTE gemessene Blattpreis (echter
   Durchlauf 24.08.2026, Bogen mit drei Grundrissen, feldweise gelesen);
   der Deckel je Bericht liegt laut SPEZIFIKATION_ABLAUF bei 2 $. */
pruefe(T.AUTO_ANALYSE_GRENZE * 0.28 <= 2.0,
  "Die Grenze von " + T.AUTO_ANALYSE_GRENZE + " Blaettern reisst mit dem "
  + "schlechtesten gemessenen Blattpreis den Deckel von 2 $ je Bericht: "
  + (T.AUTO_ANALYSE_GRENZE * 0.28).toFixed(2) + " $.");

/* -------------------------------------------------- 5a  Urteil: rot mit Weg */
T.App.p = T.leeresProjekt();
T.App.p.plan = { bilder: [], seiten: [
  { nr: 1, bezeichnung: "Ansicht Sued.pdf", ausgewertet: true,
    istGrundriss: false, auslese: { raeume: [] } },
] };
T.App.pruefung = null;
let u = T.urteilBerechnen();
pruefe(u && u.lage === "rot",
  "Ein ausgewertetes Blatt ohne einen einzigen Raum muss das Urteil rot "
  + "machen, ist " + (u && u.lage));
const rotHtml = u ? T.urteilHtml(u) : "";
pruefe(/kein Grundriss/.test(rotHtml),
  "Das rote Urteil nennt nicht den GRUND (kein Grundriss).");
pruefe(/Benötigt/.test(rotHtml),
  "Das rote Urteil nennt nicht den WEG (Benoetigt: ...).");
pruefe(/data-aktion="ablageOeffnen"/.test(rotHtml),
  "Das rote Urteil bietet keinen Knopf, eine weitere Unterlage hochzuladen.");
pruefe(/data-schritt="plan"/.test(rotHtml),
  "Das rote Urteil bietet den Rettungsweg ins Umfahren-Werkzeug nicht an.");

/* --------------------------- 5b  Urteil: Zahl der Angaben = Rueckfragenliste */
const p = T.leeresProjekt();
p.meta = { bezeichnung: "Ablaufprobe", strasse: "Musterweg 1", plz: "33098",
           ort: "Paderborn", bauherr: "", projektnr: "A", baujahr: 1965,
           bearbeitet: "2026-01-01" };
p.klima = { theta_e: -10.6, theta_e_m: 9.4, quelle: "DIN/TS 12831-1 Beiblatt" };
p.einheiten = [{ id: "we1", name: "WE 1", personen: 2 }];
p.bauteiltypen = [
  { id: "bw", name: "Aussenwand", U: 1.2, kat_default: "huelle", schichten: [],
    belegt: false, typologie: true },
];
p.raeume = [];
for (let i = 0; i < 7; i++) {
  p.raeume.push({ id: "r" + i, geschoss: "EG", name: "Raum " + (i + 1),
    art: "wohnen", A: 12 + i, h: 2.5, we: "WE 1", aussenwaende: 1, fenster: 1,
    fensterliste: [], bauteile: [
      { typ_id: "bw", name: "Aussenwand", A: 9, kat: "huelle",
        grenzt_an: { typ: "aussen" } }] });
}
p.plan = { bilder: [], seiten: [
  { nr: 1, bezeichnung: "Grundriss EG.pdf", ausgewertet: true,
    auslese: { raeume: [{ name: "Raum 1" }] } },
] };
/* Sieben Raeume, ein Geschoss, Hoehe nur angenommen. */
p.hoehenStand = { zuordnung: { EG: { angenommen: true, lichte_hoehe: 2.52,
  quelle: "Rueckfallwert, kein Schnitt im Stapel" } } };
T.App.p = p;
try { T.rechnen(); } catch (e) { fehler.push("rechnen() bricht ab: " + e.message); }

const fragen = T.rueckfragenListe();
u = T.urteilBerechnen();
pruefe(u && (u.lage === "gruen" || u.lage === "gelb"),
  "Mit Raeumen darf das Urteil nicht rot sein, ist " + (u && u.lage));
pruefe(u && u.fragen.length === fragen.length,
  "Das Urteil nennt " + (u && u.fragen.length) + " Angaben, die "
  + "Rueckfragenliste hat " + fragen.length + " — es muss DIESELBE Liste sein.");
if (u && T.App.pruefung) {
  pruefe((u.lage === "gruen") === (T.App.pruefung.zaehl.fehler === 0),
    "Gruen/gelb muss an kern_pruefung haengen (fehler="
    + T.App.pruefung.zaehl.fehler + ", lage=" + u.lage + ").");
}

/* --------------------------------------- 6  Eine Ursache = eine Frage
 * Seit dem 24.08.2026 ist die Hoehenfrage EINE Frage fuer ALLE betroffenen
 * Geschosse (id "hoehe", mit vorschlaege je Geschoss) -- vorher eine je
 * Geschoss (id "hoehe_EG", ...). Die Erwartung folgt der neuen Form. */
const hoehenFragen = fragen.filter(function (f) { return /^hoehe/.test(f.id); });
pruefe(hoehenFragen.length === 1,
  "Sieben Raeume ohne belegte Hoehe im selben Geschoss muessen GENAU EINE "
  + "Frage ergeben, sind " + hoehenFragen.length);
if (hoehenFragen.length === 1) {
  const hTexte = (hoehenFragen[0].texte || [hoehenFragen[0].text]).join(" ");
  pruefe(/7 Räume/.test(hTexte),
    "Die Hoehenfrage nennt nicht, wie viele Raeume sie betrifft: " + hTexte);
  const vs = hoehenFragen[0].vorschlaege
    || (hoehenFragen[0].vorschlag ? [hoehenFragen[0].vorschlag] : []);
  pruefe(vs.length === 1 && vs[0].wert === 2.52,
    "Die Hoehenfrage traegt keinen bestaetigbaren Vorschlag aus der "
    + "vorhandenen Hoehenzuordnung: " + JSON.stringify(vs));
}

/* ---------------------------------- 7  Schritt 2 zeichnet und zaehlt sichtbar */
T.App.rueckfrageIndex = 0;
const rf = T.schrittRueckfragen();
pruefe(/Frage 1 von \d+/.test(rf),
  'Schritt 2 zeigt nicht "Frage 1 von N".');
pruefe(/data-schritt=/.test(rf),
  "Schritt 2 bietet keinen Weg in einen Expertenbereich an.");

/* Ohne Raeume: sichtbarer Hinweis statt leerer Seite. */
T.App.p = T.leeresProjekt();
T.App.pruefung = null;
const leer = T.schrittRueckfragen();
pruefe(String(leer).replace(/<[^>]*>/g, "").replace(/\s+/g, "").length > 40,
  "Schritt 2 ohne Raeume zeichnet nichts Sichtbares.");

/* ------------------- 8  Die Baujahr-Sperre uebersteht jeden Wert im Feld
 * Abnahmebefund 24.08.2026: das Feld stand auf -1 (leeres Zahlenfeld plus
 * Pfeiltaste genuegt), "!p.meta.baujahr" hielt -1 fuer ein Baujahr, die
 * Typologie legte zur -1 ihre aelteste Klasse an ("Aussenwand U 2,00"), und
 * niemand fragte -- aus 11,95 kW wurden ~30. Die Sperre muss an der
 * PLAUSIBILITAET haengen, nicht am leeren Feld. */
{
  T.App.p = p;                       // das Projekt aus 5b, mit Raeumen
  p.meta.baujahr = "-1";
  try { T.rechnen(); } catch (e) { fehler.push("rechnen() mit Baujahr -1 bricht ab: " + e.message); }
  const fr = T.rueckfragenListe();
  const bj = fr.find(function (f) { return f.id === "baujahr"; });
  pruefe(!!bj, "Mit Baujahr -1 im Feld stellt Schritt 2 keine Baujahr-Frage "
    + "mehr -- genau so wurde die Sperre in der Abnahme verschluckt.");
  pruefe(bj && bj.kategorie === "sperre",
    "Die Baujahr-Frage zu -1 muss eine SPERRE sein, ist " + (bj && bj.kategorie));
  pruefe(bj && /-1/.test(bj.text || ""),
    "Die Sperre sagt nicht, was im Feld steht: " + (bj && bj.text));
  pruefe(fenster.DATEN_TYPOLOGIE.zumBaujahr("-1") === null,
    "Die Typologie liefert zur -1 wieder eine Klasse -- die U-2,00-Bibliothek "
    + "entstuende erneut.");
  /* Ein plausibles Baujahr loest die Sperre wieder. */
  p.meta.baujahr = "2018";
  try { T.rechnen(); } catch (e) {}
  pruefe(!T.rueckfragenListe().some(function (f) { return f.id === "baujahr"; }),
    "Mit Baujahr 2018 darf keine Baujahr-Sperre mehr stehen.");
  p.meta.baujahr = 1965;
  try { T.rechnen(); } catch (e) {}
}

/* -------- 9  Ein gelber Knopf je Bildschirm, auch mit offener Stempelkarte
 * Abnahmebefund 24.08.2026: "Zwei gelbe Knoepfe konkurrieren ('Weiter zu den
 * Rueckfragen' gegen '25 Raeume uebernehmen')". Der Unterlagen-Schritt wird
 * hier genau in dieser Lage gezeichnet -- Urteil mit CTA UND eine
 * Stempelkarte mit noch nicht uebernommenen Flaechen -- und darf hoechstens
 * EINEN gelben Handlungsknopf zeigen. */
{
  const MP = fenster.MODUL_PDF;
  const stuecke = [
    { text: "18,40 m²", x_pt: 400, y_pt: 400, groesse_pt: 8.0, breite_pt: 30, winkel_rad: 0 },
    { text: "Kind", x_pt: 400, y_pt: 408.5, groesse_pt: 10.0, breite_pt: 20, winkel_rad: 0 },
  ];
  T.App.p = p;
  p.plan.seiten[0].textstuecke = stuecke;
  p.plan.seiten[0].raumbloecke = MP.raumbloeckeLesen(stuecke);
  p.plan.seiten[0].geschosstitel = [];
  p.plan.seiten[0].blattkopf = { blattart: "grundriss", geschoss: "eg" };
  try { T.rechnen(); } catch (e) {}
  T.App.auslese = null;
  const startHtml = T.schrittStart();
  pruefe(/data-aktion="stempelUebernehmen"/.test(startHtml),
    "Die Stempelkarte mit dem Uebernehmen-Knopf fehlt -- dann prueft dieser "
    + "Abschnitt nichts.");
  const gelb = (startHtml.match(/class="btn[^"]*\bcta\b/g) || []).length;
  pruefe(gelb <= 1,
    "Der Unterlagen-Schritt zeigt mit offener Stempelkarte " + gelb
    + " gelbe Handlungsknoepfe. Gelb ist die EINE Handlung je Bildschirm.");
  delete p.plan.seiten[0].raumbloecke;
  delete p.plan.seiten[0].textstuecke;
}

/* ---------------- 10  Eine Rueckfrage-Antwort bleibt im Rueckfragen-Schritt
 * Abnahmebefund 24.08.2026: "'unbeheizt -- Bereich anlegen' wirft in den
 * Expertenmodus (Zonen) statt in den Rueckfragen zu bleiben." Der Vollzug
 * passiert im Hintergrund; nur wer schon im Kontrollblatt arbeitet, wird
 * weiter zu den Zonen gefuehrt. */
{
  const KB = fenster.MODUL_KONTROLLBLATT;
  T.App.p = T.leeresProjekt();
  T.App.schritt = "rueckfragen";
  const el = { dataset: { kbName: "Garage" } };
  const genommen = KB.aktion("kbZoneAnlegen", el);
  pruefe(genommen === true, "kbZoneAnlegen wird nicht mehr behandelt.");
  pruefe(T.App.schritt === "rueckfragen",
    "Die Zonen-Anlage wirft aus den Rueckfragen in '" + T.App.schritt
    + "' -- eine Antwort bleibt im Schritt, der Vollzug laeuft im Hintergrund.");
  pruefe(T.App.p.zonen.length === 1 && /Garage/.test(T.App.p.zonen[0].name),
    "Die Zone ist nicht angelegt worden: " + JSON.stringify(T.App.p.zonen));
  /* Im Kontrollblatt selbst bleibt der Weg zu den Zonen erhalten. */
  T.App.p = T.leeresProjekt();
  T.App.schritt = "kontrolle";
  KB.aktion("kbZoneAnlegen", { dataset: { kbName: "Spitzboden" } });
  pruefe(T.App.schritt === "zonen",
    "Aus dem Kontrollblatt heraus muss die Zonen-Anlage weiter zu den Zonen "
    + "fuehren, steht auf '" + T.App.schritt + "'.");
}

/* ---------------------------------------------------------------- Ergebnis */
const ergebnis = { ok: fehler.length === 0, anzahl: anzahl, fehler: fehler };
console.log(JSON.stringify(ergebnis));
if (!ergebnis.ok) process.exit(1);
