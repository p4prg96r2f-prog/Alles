/* ===========================================================================
 * rueckfragen_test.js — die Rückfragen-Maschine am ECHTEN Auslese-Stand
 * ===========================================================================
 * Grundlage ist validierung/echtlauf/ziolkowski_lauf4_fenster.json: der
 * gespeicherte Projektstand des echten Endpunkt-Durchlaufs vom 23.08.2026
 * mit „Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf". Kein Feld darin
 * ist nachgestellt; was diese Probe prüft, ist, was die Rückfragen-Maschine
 * aus diesem Stand macht.
 *
 * Verlangt wird die Produktregel des Kunden:
 *
 *   1  Aus dem Echtlauf-Stand entstehen GENAU die Fragen, die ein Bearbeiter
 *      beantworten kann — am 24.08.2026 sind das vier: der Widerspruch zum
 *      Kellergeschoss, die hochgerechneten Außenwände (EG und OG als EINE
 *      Frage), und die beiden bestätigbaren Annahmen (Klima, Baujahr).
 *      „Quervergleich nicht möglich" und „Belegte Werte gegen Annahmen"
 *      sind KEINE Fragen — es gibt daran nichts zu beantworten — und stehen
 *      als Feststellungen dabei.
 *   2  Ordnung: Sperren vor Widersprüchen vor Angaben vor Annahmen.
 *   3  Gebündelt wird in der FRAGENLISTE, nicht in den Prüfzeilen: das
 *      Kontrollblatt behält „Außenwände EG" und „Außenwände OG" als zwei
 *      Zeilen, die Fragenliste macht daraus eine.
 *   4  Ein Widerspruch ist nicht mit einem Klick abzuräumen: kein
 *      „Passt so", stattdessen die Zeilen-Aktion (Bereich anlegen) und die
 *      Entscheidung mit Vermerk (kbSperreAufheben). Eine offene Angabe
 *      DARF mit einem Klick bestätigt werden.
 *   5  Die Antworten landen dort, wo sie heute landen (zurKenntnis,
 *      sperreAufheben, schreiben) — und danach ist die Frage weg, ohne dass
 *      eine Prüfzeile gelöscht wurde.
 *   6  Der Schritt sagt oben den Stand („Wir brauchen noch N Angaben"),
 *      zählt „Frage 1 von N", und ohne offene Fragen steht kein leerer
 *      Bildschirm, sondern der Weg zum Ergebnis.
 *   7  Standardwerte werden benannt, nicht abgefragt: EIN Block mit
 *      „Gibt es Abweichungen? Nein / Ja, ändern".
 *
 * Aufruf:  node validierung/rueckfragen_test.js
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
 * Dieselbe Attrappe wie in ablauf_test.js. */
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
umgebung.Uint8ClampedArray = Uint8ClampedArray;

/* Der volle Satz: der Echtlauf-Stand trägt Gegenproben, Annahmen und
   Höhenbefunde, und ohne die zugehörigen Kerne stünden die Zähler des
   Kontrollblatts anders da als im Browser. */
const DATEIEN = [
  "src/standorte.js", "src/daten/daten_zonenlagen.js",
  "src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
  "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
  "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
  "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
  "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js",
  "src/kerne/kern_flaeche.js",
  "src/kerne/kern_lage.js", "src/kerne/kern_fenster.js",
  "src/kerne/kern_messen.js", "src/kerne/kern_zuschnitt.js",
  "src/kerne/kern_gegenprobe.js", "src/kerne/kern_annahmen.js",
  "src/kerne/kern_huellendeckung.js", "src/kerne/kern_baujahrprobe.js",
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
app += "\n;window.__rf = { App, leeresProjekt, rechnen, rueckfragenStand,"
  + " rueckfragenListe, schrittRueckfragen, standardwerteHinweis,"
  + " hoehenVorschlaegeUebernehmen, hoehenUebernehmen, automatischErgaenzen,"
  + " quelleNachreichen };\n";
try { vm.runInContext(app, umgebung, { filename: "src/app.js" }); }
catch (e) { fehler.push("app.js laesst sich nicht laden: " + e.message); }
const T = fenster.__rf;
const KB = fenster.MODUL_KONTROLLBLATT;
if (!T || !KB) {
  console.log(JSON.stringify({ ok: false, anzahl: anzahl || 1,
    fehler: fehler.length ? fehler : ["Bootstrap fehlgeschlagen"] }));
  process.exit(1);
}

/* --------------------------------------------- Der echte Stand wird geladen */
const stand = JSON.parse(fs.readFileSync(path.join(WURZEL,
  "validierung/echtlauf/ziolkowski_lauf4_fenster.json"), "utf8"));
T.App.p = stand.projekt;
T.App.p.meta.bearbeiter = "Probelauf";
try { T.rechnen(); } catch (e) { fehler.push("rechnen() bricht ab: " + e.message); }

function neu() {
  T.rechnen();
  return T.rueckfragenStand();
}

/* ------------------------------- 1  Genau die richtigen Fragen, kein Rauschen */
let st = neu();
pruefe(st.fragen.length === 4,
  "Am Echtlauf-Stand muessen es 4 Fragen sein (Widerspruch KG, Aussenwaende "
  + "EG+OG, Annahme Klima, Annahme Baujahr), sind " + st.fragen.length + ": "
  + st.fragen.map(function (f) { return f.titel; }).join(" | "));
pruefe(st.fragen.some(function (f) { return /KELLERGESCHOSS/.test(f.titel); }),
  "Der Widerspruch zum Kellergeschoss fehlt in der Fragenliste.");
pruefe(st.fragen.some(function (f) { return f.titel === "Außenwände EG und OG"; }),
  "Die Aussenwaende-Frage ist nicht zu 'Außenwände EG und OG' gebuendelt: "
  + st.fragen.map(function (f) { return f.titel; }).join(" | "));
pruefe(!st.fragen.some(function (f) { return /Quervergleich|Belegte Werte/.test(f.titel); }),
  "'Quervergleich nicht moeglich' oder 'Belegte Werte gegen Annahmen' steht "
  + "als Frage in der Liste. Das ist nichts, was ein Bearbeiter beantworten "
  + "kann — es ist eine Feststellung.");
pruefe(st.feststellungen.some(function (x) { return /Quervergleich/.test(x.titel); }),
  "Die Feststellung 'Quervergleich nicht moeglich' muss als Feststellung "
  + "sichtbar bleiben, nicht verschwinden.");
/* KUNDENVORGABE 24.08.2026 (Sebastian Hund): U-Werte aus der Typologie und
   dem Referenzgebaeude gelten als korrekt angesetzt. Die fruehere Warnung
   „Belegte Werte gegen Annahmen — 100 % ... ohne belegten U-Wert" entfaellt
   damit dauerhaft und darf auch nicht als Feststellung oder Hinweis
   wiederauftauchen; am Echtlauf-Stand stammen alle U-Werte aus der
   Typologie, die Zeile steht deshalb gruen und ist keine Feststellung mehr.
   Der Test verlangte sie bisher ausdruecklich — das war der alte Stand. */
pruefe(!st.feststellungen.some(function (x) { return /Belegte Werte/.test(x.titel); }),
  "'Belegte Werte gegen Annahmen' darf am reinen Typologie-Stand weder "
  + "Frage noch Feststellung sein — Typologiewerte gelten als angesetzt "
  + "(Kundenvorgabe 24.08.2026).");

/* --------------------------------------------------------------- 2  Ordnung */
const raenge = { sperre: 0, widerspruch: 1, angabe: 2, annahme: 3 };
for (let i = 1; i < st.fragen.length; i++) {
  pruefe(raenge[st.fragen[i - 1].kategorie] <= raenge[st.fragen[i].kategorie],
    "Die Ordnung Sperren -> Widersprueche -> Angaben -> Annahmen ist verletzt: "
    + st.fragen.map(function (f) { return f.kategorie; }).join(", "));
}

/* --------------------- 3  Buendelung in der Liste, Einzelzeilen im Blatt */
const kbZeilen = KB.zaehler(T.App.p, {});
pruefe(kbZeilen.filter(function (z) { return /^Außenwände (EG|OG)$/.test(z.titel); }).length === 2,
  "Das Kontrollblatt muss 'Außenwände EG' und 'Außenwände OG' als ZWEI "
  + "Einzelzeilen behalten — die Buendelung gehoert in die Fragenliste, nicht "
  + "in die Pruefzeilen.");

/* ------------------------------ 4  Ein Widerspruch ist kein Ein-Klick-Fall */
const wid = st.fragen.find(function (f) { return f.kategorie === "widerspruch"; });
pruefe(!!wid, "Kein Widerspruch in der Liste — der Kellergeschoss-Fall fehlt.");
if (wid) {
  pruefe(!/data-aktion="rueckfrageKenntnis"/.test(wid.antworten || ""),
    "Der Widerspruch bietet 'Passt so' mit einem Klick an. Eine der beiden "
    + "Angaben stimmt — das verlangt eine Entscheidung, keinen Haken.");
  pruefe(/data-aktion="kbSperreAufheben"/.test(wid.antworten || ""),
    "Der Widerspruch bietet die Entscheidung mit Vermerk (kbSperreAufheben) "
    + "nicht an.");
  pruefe(/data-aktion="kbZoneAnlegen"/.test(wid.antworten || ""),
    "Die Zeilen-Aktion 'Bereich anlegen' fehlt als Antwort — sie ist der Weg, "
    + "den das Kontrollblatt heute anbietet, und muss hier ankommen.");
  pruefe(/data-aktion="rueckfragePlan"/.test(wid.antworten || ""),
    "Der Widerspruch bietet 'Im Plan anzeigen' nicht an.");
}
const ang = st.fragen.find(function (f) { return f.kategorie === "angabe"; });
pruefe(!!ang && /data-aktion="rueckfrageKenntnis"/.test(ang.antworten || ""),
  "Die offene Angabe (Aussenwaende) muss den Ein-Klick-Weg 'Passt so' bieten.");
pruefe(!!ang && /data-geschossmass="EG:breite_m"/.test(ang.eingabe || ""),
  "Die Aussenwaende-Frage traegt kein Feld fuer die Aussenmasse des "
  + "Geschosses — der Weg, der die Hochrechnung wirklich ersetzt.");

/* ---------------- 5  Antworten landen im Bestand, Fragen verschwinden dann */
const ids = ((ang && ang.antworten.match(/data-rf-ids="([^"]+)"/)) || [])[1];
pruefe(!!ids, "Die Angabe-Frage nennt keine Zeilenkennungen fuer 'Passt so'.");
if (ids) {
  ids.split(",").forEach(function (id) {
    const r = KB.zurKenntnis(T.App.p, id, "");
    pruefe(r.ok, "zurKenntnis(" + id + ") schlaegt fehl: " + (r.grund || ""));
  });
  st = neu();
  pruefe(st.fragen.length === 3,
    "Nach 'Passt so' auf die Aussenwaende muessen 3 Fragen bleiben, sind "
    + st.fragen.length);
}
["annahme_klima", "annahme_baujahr"].forEach(function (id) {
  const r = KB.zurKenntnis(T.App.p, id, "");
  pruefe(r.ok, "zurKenntnis(" + id + ") schlaegt fehl: " + (r.grund || ""));
});
st = neu();
pruefe(st.fragen.length === 1,
  "Nach den beiden Annahmen muss 1 Frage bleiben (der Widerspruch), sind "
  + st.fragen.length);
const entschieden = KB.sperreAufheben(T.App.p, "zone_widerspruch_KG",
  "Probelauf: Entscheidung mit Vermerk, wie sie der Bearbeiter im Dialog "
  + "eintraegt.");
pruefe(entschieden.ok, "sperreAufheben(zone_widerspruch_KG) schlaegt fehl.");
st = neu();
pruefe(st.fragen.length === 0,
  "Nach der Entscheidung muss die Liste leer sein, es bleiben "
  + st.fragen.length + ": "
  + st.fragen.map(function (f) { return f.titel; }).join(" | "));
pruefe(KB.zaehler(T.App.p, {}).length === kbZeilen.length,
  "Beantworten hat Pruefzeilen entfernt — die interne Sicht muss jede "
  + "Einzelzeile behalten (vorher " + kbZeilen.length + ", nachher "
  + KB.zaehler(T.App.p, {}).length + ").");

/* --------------------------- 6  Der Schritt sagt den Stand und endet nie leer */
const leerHtml = T.schrittRueckfragen();
pruefe(/Keine Rückfragen offen/.test(leerHtml),
  "Ohne offene Fragen fehlt die Auskunft 'Keine Rueckfragen offen'.");
pruefe(/data-schritt="ergebnis"/.test(leerHtml),
  "Ohne offene Fragen fehlt der Weg zum Ergebnis — Leerbildschirm.");

/* Der volle Bildschirm, am unveraenderten Stand noch einmal geladen. */
T.App.p = JSON.parse(fs.readFileSync(path.join(WURZEL,
  "validierung/echtlauf/ziolkowski_lauf4_fenster.json"), "utf8")).projekt;
T.App.rueckfrageIndex = 0;
T.rechnen();
const voll = T.schrittRueckfragen();
pruefe(/Wir brauchen noch 4 Angaben/.test(voll),
  "Der Kopf sagt nicht 'Wir brauchen noch 4 Angaben'.");
pruefe(/Frage 1 von 4/.test(voll),
  "Der Schritt zaehlt nicht 'Frage 1 von 4'.");
pruefe(/data-aktion="rueckfrageZu"/.test(voll),
  "Die Uebersicht der uebrigen Fragen (rueckfrageZu) fehlt.");

/* --------------------------- 7  Standardwerte: EIN Block, nicht vier Fragen */
const block = T.standardwerteHinweis();
pruefe(/Wir verwenden die üblichen Ansätze/.test(block),
  "Der Standardwerte-Block benennt die ueblichen Ansaetze nicht.");
pruefe(/data-aktion="rueckfrageStandard"/.test(block)
    && /data-schritt="projekt"/.test(block),
  "Der Standardwerte-Block bietet 'Nein' / 'Ja, aendern' nicht an.");
pruefe(!T.rueckfragenListe().some(function (f) {
  return /n50|Wärmebrücke|Aufheiz/.test(f.titel); }),
  "Ein Standardwert (n50, Waermebruecken, Aufheizzuschlag) steht als eigene "
  + "Frage in der Liste — Standardwerte werden benannt, nicht abgefragt.");
T.App.p.standard_ok = { zeit: "2026-08-24 09:00", wer: "Probelauf" };
pruefe(/Keine Abweichungen/.test(T.standardwerteHinweis()),
  "Nach 'Nein' zeigt der Block die Bestaetigung nicht an.");

/* ===========================================================================
 * Abnahme-Befunde vom 24.08.2026 — jede Behebung mit eigener Probe
 * =========================================================================== */
function frisch() {
  T.App.p = JSON.parse(fs.readFileSync(path.join(WURZEL,
    "validierung/echtlauf/ziolkowski_lauf4_fenster.json"), "utf8")).projekt;
  T.App.p.meta.bearbeiter = "Probelauf";
  T.App.rueckfrageIndex = 0;
  T.rechnen();
  return T.rueckfragenStand();
}

/* --- Befund 3: Sperren zuerst. RF_RANG.sperre ist 0, und „0 || 2" machte
   daraus Rang 2 — die Baujahr-Sperre stand hinter den Widersprüchen. */
(function () {
  frisch();
  delete T.App.p.meta.baujahr;
  if (T.App.p.annahmen) delete T.App.p.annahmen.baujahr;
  if (T.App.p.meta_herkunft) delete T.App.p.meta_herkunft.plandatum;
  T.rechnen();
  const st2 = T.rueckfragenStand();
  pruefe(st2.fragen.length > 0 && st2.fragen[0].kategorie === "sperre",
    "Eine Sperre (fehlendes Baujahr) muss VOR den Widersprüchen stehen, "
    + "die Liste beginnt aber mit: "
    + st2.fragen.map(function (f) { return f.kategorie; }).join(", "));
  pruefe(st2.fragen[0].id === "baujahr",
    "Die erste Frage muss die Baujahr-Sperre sein, ist " + st2.fragen[0].id);
})();

/* --- Befunde 1 und 8: EINE Höhenfrage statt Zwillingskarten, und der
   Vorschlag nennt seine Herkunft (hier: abgeleitet aus der Geschosshöhe des
   Schnitts, weil die Maßkette des OG entfernt ist, die Koten aber stehen). */
(function () {
  frisch();
  /* Die Maßkette des OG ist nicht lesbar, die Geschosshöhe steht aber auf
     dem Schnitt — der Fall des Befunds: „hat Geschosshöhen aus dem Schnitt
     gelesen und behauptet dann, es gebe keine lichte Höhe". */
  (T.App.p.schnitthoehen || []).forEach(function (x) {
    if (!/OG/i.test(String(x.geschoss || ""))) return;
    x.lichte_hoehe_m = null;
    x.geschosshoehe_m = 2.74;   // die Geschosshöhe, die die Koten belegen
  });
  T.App.p.raeume.forEach(function (r) {
    if (r.geschoss !== "OG") return;
    r.h = null;
    if (r.herkunft) {
      delete r.herkunft.hoehe_quelle;
      delete r.herkunft.hoehe_angenommen;
    }
  });
  T.hoehenUebernehmen();
  T.rechnen();
  const st2 = T.rueckfragenStand();
  const hoehenFragen = st2.fragen.filter(function (f) {
    return /Raumhöhe|Lichte Höhe/.test(f.titel); });
  pruefe(hoehenFragen.length === 1,
    "Dieselbe Ursache (Höhe OG angenommen) darf nur EINE Frage sein, sind "
    + hoehenFragen.length + ": "
    + hoehenFragen.map(function (f) { return f.titel; }).join(" | "));
  const hf = hoehenFragen[0];
  pruefe(!!hf && hf.id === "hoehe",
    "Die Höhenfrage muss die gebündelte Frage 'hoehe' sein, ist "
    + (hf && hf.id));
  pruefe(!!hf && (hf.vorschlaege || []).length === 1
      && Math.abs(hf.vorschlaege[0].wert - 2.49) < 0.001,
    "Der Vorschlag muss aus der Geschosshöhe 2,74 minus üblichem "
    + "Deckenpaket 0,25 kommen (2,49 m), ist "
    + JSON.stringify(hf && hf.vorschlaege));
  pruefe(!!hf && /Geschosshöhe 2,74/.test((hf.texte || []).join(" ")),
    "Die Höhenfrage muss die Herkunft des Vorschlags nennen "
    + "(Geschosshöhe aus dem Schnitt): " + (hf && (hf.texte || []).join(" ")));
  pruefe(!st2.fragen.some(function (f) { return f.id === "annahme_hoehe"; }),
    "Die Annahmenkarte 'Lichte Höhe angenommen' steht als Zwillingsfrage "
    + "neben der Höhenfrage.");
})();

/* --- Befund 2: eine eigene Eingabe wird von einem Vorschlag NIE
   überschrieben — die härteste Regel dieses Werkzeugs. */
(function () {
  frisch();
  T.App.p.geschosshoehen = { OG: 2.4 };
  const erg = T.hoehenVorschlaegeUebernehmen([{ g: "OG", wert: 2.6 },
                                              { g: "EG", wert: 2.6 }]);
  pruefe(T.App.p.geschosshoehen.OG === 2.4,
    "Die eigene Eingabe 2,40 wurde vom Vorschlag 2,60 überschrieben — "
    + "steht jetzt auf " + T.App.p.geschosshoehen.OG);
  pruefe(erg.behalten.length === 1 && erg.behalten[0].g === "OG",
    "Die Antwort muss sagen, dass die eigene Eingabe stehen bleibt: "
    + JSON.stringify(erg.behalten));
  pruefe(T.App.p.geschosshoehen.EG === 2.6
      && erg.uebernommen.length === 1 && erg.uebernommen[0].g === "EG",
    "Wo keine Eingabe steht, muss der Vorschlag ankommen: "
    + JSON.stringify(erg));
})();

/* --- Befunde 4 und 5: die Kennung einer offenen Frage hängt am TEXT, nicht
   an der Position. Ein Umbau der Liste darf eine Bestätigung nicht lösen —
   und die alte, indexgebundene Kennung wird weiter nachgeschlagen. */
(function () {
  frisch();
  const zn1 = KB.zaehler(T.App.p, {});
  const fz = zn1.find(function (z) { return /^frage_/.test(z.id)
    && z.stufe !== "hinweis"; });
  pruefe(!!fz, "Am Echtlauf-Stand muss eine offene Frage mit frage_-Kennung "
    + "stehen.");
  if (fz) {
    pruefe(!/^frage_\d+_/.test(fz.id),
      "Die Kennung trägt wieder den Listenindex (" + fz.id + ") — genau die "
      + "Instabilität des Abnahme-Befunds.");
    KB.zurKenntnis(T.App.p, fz.id, "");
    /* Der Umbau, der die Abnahme scheitern ließ: vorn kommt etwas dazu. */
    T.App.p.offeneFragen.unshift({ thema: "Probe",
      frage: "Eine neue Zeile, die alle Indizes verschiebt." });
    const zn2 = KB.zaehler(T.App.p, {});
    const wieder = zn2.find(function (z) { return z.id === fz.id; });
    pruefe(!!wieder && wieder.stufe === "bestaetigt",
      "Nach dem Umbau der Liste ist die bestätigte Frage wieder offen — "
      + "die Kennung muss am Text hängen, nicht an der Position (ist: "
      + (wieder && wieder.stufe) + ").");
    /* Altbestand: eine Bestätigung, die noch unter der indexgebundenen
       Kennung gespeichert ist, muss weiter gelten. */
    const andere = zn2.find(function (z) { return /^frage_/.test(z.id)
      && z.stufe !== "hinweis" && z.stufe !== "bestaetigt" && z.alt_id; });
    if (andere) {
      T.App.p.kontrollblatt.aufgehoben[andere.alt_id] =
        { grund: "", zeit: "2026-08-20 09:00", wer: "Altbestand" };
      const zn3 = KB.zaehler(T.App.p, {});
      const alt = zn3.find(function (z) { return z.id === andere.id; });
      pruefe(!!alt && alt.stufe === "bestaetigt",
        "Eine unter der alten Kennung (alt_id) gespeicherte Bestätigung "
        + "muss weiter greifen.");
    }
  }
})();

/* --- Befund 6: Fragen entstehen aus dem aktuellen Zustand. Ein angenommenes
   Geschoss, dessen Raum gelöscht wurde, darf nicht weiter als „rechnet mit
   N m² mit" auftauchen; es gilt als entfernt, mit der ehrlichen Zeile dazu. */
(function () {
  frisch();
  const raum = { id: "r_kb_geschoss_dg", geschoss: "DG",
    name: "Angenommenes Geschoss DG", art: "wohnen", A: 70, h: null,
    we: ((T.App.p.einheiten || [])[0] || {}).name || "", bauteile: [],
    angenommen: true,
    herkunft: { quelle: "Obergrenze aus dem Vollgeschoss darunter",
      konfidenz: "unsicher", flaeche_gelesen: false, geschoss_angenommen: true } };
  T.App.p.raeume.push(raum);
  T.App.p.geschosse_angenommen = [{ kuerzel: "DG", wortlaut: "Dachgeschoss",
    quelle: "Blattliste", A: 70, gemessen: false,
    grund: "Obergrenze aus dem Vollgeschoss darunter", raum_id: raum.id,
    automatisch: true }];
  /* Der Bearbeiter löscht den Raum im Raumbuch (raumWeg). */
  T.App.p.raeume.splice(T.App.p.raeume.findIndex(function (r) {
    return r.id === raum.id; }), 1);
  T.automatischErgaenzen();
  pruefe((T.App.p.geschosse_angenommen || []).length === 0,
    "Der Eintrag geschosse_angenommen muss mit dem gelöschten Raum gehen.");
  pruefe((T.App.p.geschosse_entfernt || []).indexOf("DG") >= 0,
    "Das Löschen des Raums muss als 'Annahme entfernt' gelten "
    + "(geschosse_entfernt).");
  const zn = KB.zaehler(T.App.p, {});
  pruefe(!zn.some(function (z) { return /rechnet es mit 70/.test(z.text || ""); }),
    "Die Zeile behauptet weiter 'rechnet es mit 70,00 m² mit' für einen "
    + "gelöschten Raum.");
})();

/* --- Befund 7: kein Zahlenfeld des Werkzeugs darf die deutsche
   Kommaeingabe stumm verwerfen. type="number" tut genau das; im gezeichneten
   Markup von app.js darf es deshalb nicht mehr vorkommen. */
(function () {
  const quelle = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
  const treffer = (quelle.match(/<input type="number"/g) || []).length;
  pruefe(treffer === 0,
    "app.js zeichnet noch " + treffer + " Feld(er) als type=\"number\" — "
    + "die verwerfen '8,00' stumm. Textfeld mit inputmode=\"decimal\" nehmen.");
  pruefe(/inputmode="decimal"/.test(quelle),
    "Die Zahlenfelder müssen inputmode=\"decimal\" tragen.");
})();

/* --- Nachprüfung 24.08.2026: die NACH der letzten Antwort getippte Quelle
   muss auch die Geschosse erreichen, deren Maßfelder die Rückfragen-Karte
   nicht mehr trägt. Der Prüferablauf (Ziolkowski): EG 8,00 × 12,50 tippen —
   die Karte zeichnet neu, EG fällt aus ihr heraus — dann „am Plan abgezählt"
   tippen. Vorher blieb EG ohne Quelle. Der Eingabeverteiler merkt solche
   Maße in App.masseOhneQuelle vor; quelleNachreichen reicht die Quelle nach
   und überschreibt dabei nie eine vorhandene andere Quelle. */
(function () {
  const p = T.leeresProjekt();
  T.App.p = p;
  /* Der Prüferfall: Maß aus der Karte getippt (Vormerkung), Karte zeichnet
     neu, dann kommt die Quelle. */
  p.geschossmasse = { EG: { breite_m: 8, tiefe_m: 12.5 } };
  T.App.masseOhneQuelle = { EG: true };
  const n1 = T.quelleNachreichen(p, "am Plan abgezählt");
  pruefe(n1 === 1, "Die nachgetippte Quelle muss das vorgemerkte Geschoss "
    + "erreichen (nachgereicht: " + n1 + ").");
  pruefe(p.geschossmasse.EG.quelle === "am Plan abgezählt",
    "EG muss die Quelle tragen: " + p.geschossmasse.EG.quelle);
  pruefe(Object.keys(T.App.masseOhneQuelle || {}).length === 0,
    "Die Vormerkung muss nach dem Nachreichen leer sein.");
  /* Eine vorhandene ANDERE Quelle bleibt stehen. */
  p.geschossmasse.OG = { breite_m: 5, quelle: "aus dem Schnitt" };
  T.App.masseOhneQuelle = { OG: true };
  const n2 = T.quelleNachreichen(p, "am Plan abgezählt");
  pruefe(n2 === 0 && p.geschossmasse.OG.quelle === "aus dem Schnitt",
    "Eine vorhandene andere Quelle darf nie überschrieben werden: "
    + p.geschossmasse.OG.quelle);
  /* Ohne Maß wird nichts erfunden. */
  T.App.masseOhneQuelle = { DG: true };
  const n3 = T.quelleNachreichen(p, "am Plan abgezählt");
  pruefe(n3 === 0 && !(p.geschossmasse.DG && p.geschossmasse.DG.quelle),
    "Ohne eingetragenes Maß entsteht keine Quelle.");
})();

/* ---------------------------------------------------------------- Ergebnis */
const ergebnis = { ok: fehler.length === 0, anzahl: anzahl, fehler: fehler };
console.log(JSON.stringify(ergebnis));
if (!ergebnis.ok) process.exit(1);
