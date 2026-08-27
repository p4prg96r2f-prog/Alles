/* ===========================================================================
 * sicherung_test.js — nichts von der Arbeit darf verloren gehen
 * ===========================================================================
 * Der teuerste Fehler, den dieses Werkzeug hatte, war kein Rechenfehler.
 *
 * App.p.plan.seiten enthaelt lebende Objekte von pdf.js: eine PDFPageProxy
 * zeigt auf ihr Dokument, das Dokument zeigt auf die Seite zurueck.
 * JSON.stringify laeuft darin im Kreis und wirft. Sobald also ein einziger
 * Plan im Projekt lag:
 *
 *   - "Speichern" erzeugte keine Datei und keine Meldung. Nur einen Fehler in
 *     der Entwicklerkonsole, die niemand offen hat.
 *   - Der Zwischenspeicher schrieb nie, weil sein try/catch den Fehler
 *     verschluckte. Ein versehentliches Neuladen kostete die ganze Arbeit.
 *   - sicherungAnbieten() -- die Wiederherstellung -- wurde ueberhaupt nie
 *     aufgerufen. Auch ein geschriebener Stand waere also nie angeboten worden.
 *
 * Eine Stunde Raumbuch ist eine Stunde. Wer sie einmal verliert, benutzt das
 * Werkzeug nicht wieder. Deshalb wird das hier fest nachgehalten, und zwar an
 * einem Projekt mit einem ECHTEN Ringverweis -- nicht an einer sauberen
 * Attrappe, an der auch die alte Fassung bestanden haette.
 *
 * Aufruf:  node validierung/sicherung_test.js
 * ======================================================================== */
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

/* ------------------------------------------------------------- Attrappe */
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
    getContext() { return new Proxy({}, { get() { return function () {}; }, set() { return true; } }); },
    toDataURL() { return "data:image/png;base64,x"; },
    scrollIntoView() {},
  };
}

/* Ein Browserspeicher mit derselben Eigenheit wie der echte: begrenzt, und
   beim Ueberlaufen wirft er. Fuenf Megabyte ist der uebliche Wert. */
const GRENZE = 5 * 1024 * 1024;
const speicher = {};
const localStorage = {
  getItem(k) { return speicher[k] === undefined ? null : speicher[k]; },
  setItem(k, v) {
    const s = String(v);
    if (s.length > GRENZE) {
      const e = new Error("QuotaExceededError");
      e.name = "QuotaExceededError";
      throw e;
    }
    speicher[k] = s;
  },
  removeItem(k) { delete speicher[k]; },
};

let bestaetigung = true;          // Antwort auf die Rueckfrage
const gefragt = [];
const gemeldet = [];

/* Seit dem 23.08.2026 fragt das Werkzeug nicht mehr ueber confirm(), sondern
   ueber modul_dialog.js — ein Dialog, der die Seite nicht einfriert und
   deshalb ein Promise zurueckgibt. Diese Probe soll weiterhin Schritt fuer
   Schritt lesbar bleiben, darum antwortet die Attrappe SOFORT: ein
   Thenable, das seinen Rueckruf noch im selben Zug ausfuehrt. Geprueft wird
   damit derselbe Weg wie im Browser — Knopf, Verteiler, Rueckfrage,
   Wirkung —, nur ohne Warteschlange. */
function sofort(wert) {
  return {
    then(cb) { return sofort(cb ? cb(wert) : wert); },
    catch() { return this; },
  };
}
const dialogAttrappe = {
  sagen(t) { gemeldet.push(String(t)); return { weg() {} }; },
  fragen(o) {
    gefragt.push(String((o && (o.titel || o.text)) || o));
    return sofort(bestaetigung);
  },
  eingabe(o) {
    gefragt.push(String((o && (o.titel || o.text)) || o));
    return sofort(bestaetigung ? String((o && o.wert) || "") : null);
  },
  arbeit() {
    return { text() {}, fertig() {}, warten() { return sofort(); } };
  },
};
const geschrieben = [];           // heruntergeladene Dateien

const fenster = {
  location: { protocol: "https:", search: "", href: "https://pruefung.invalid/" },
  localStorage: localStorage,
  addEventListener() {}, matchMedia() { return { matches: false, addListener() {} }; },
  scrollTo() {}, print() {},
  alert() {},
  confirm(t) { gefragt.push(String(t)); return bestaetigung; },
  MODUL_DIALOG: dialogAttrappe,
  requestAnimationFrame(f) { return setTimeout(f, 0); },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  fetch() { return Promise.reject(new Error("kein Netz in der Probe")); },
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  ikon(n) { return '<svg class="ikon"><use href="#i-' + n + '"></use></svg>'; },
};
/* Die Zuhoerer der Seite werden gemerkt, nicht verworfen. Nur so laesst sich
   ein Knopfdruck durch DENSELBEN Verteiler schicken, den auch der Browser
   benutzt -- ein Test, der stattdessen eine Hilfsfunktion aufruft, prueft
   den Weg zum Knopf nicht mit. */
const zuhoerer = {};
const seite = {
  readyState: "loading",
  addEventListener(art, f) { (zuhoerer[art] = zuhoerer[art] || []).push(f); },
  removeEventListener() {},
  createElement(name) {
    const k = knoten(name);
    if (String(name).toLowerCase() === "a") {
      k.click = function () { geschrieben.push({ name: k.download, href: k.href }); };
    }
    return k;
  },
  createElementNS: knoten, createTextNode() { return knoten("text"); },
  /* Die Seite gibt es hier wirklich, wenn auch als Attrappe: sichern()
     zeichnet die Leiste neu, sobald sich der Sicherungsstand aendert. */
  getElementById() { return knoten("div"); }, querySelector() { return knoten("div"); },
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
/* Blob und URL merken sich, was hinausgeschrieben wurde -- nur so laesst sich
   pruefen, ob "Speichern" wirklich eine Datei mit Inhalt erzeugt hat. */
const blobs = [];
umgebung.Blob = function (teile) { this.text = (teile || []).join(""); blobs.push(this); };
umgebung.URL = { createObjectURL(b) { return "blob:" + (blobs.indexOf(b)); },
                 revokeObjectURL() {} };
umgebung.performance = { now() { return 0; } };
umgebung.navigator = { userAgent: "pruefung", clipboard: {} };
umgebung.TextEncoder = TextEncoder;
umgebung.TextDecoder = TextDecoder;
umgebung.Uint8Array = Uint8Array;
umgebung.Uint8ClampedArray = Uint8ClampedArray;

const REIHENFOLGE = [
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
for (const d of REIHENFOLGE) {
  const p = path.join(WURZEL, d);
  if (!fs.existsSync(p)) continue;
  try { vm.runInContext(fs.readFileSync(p, "utf8"), umgebung, { filename: d }); }
  catch (e) { fehler.push(d + " laesst sich nicht laden: " + e.message); }
}
let app = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
app += "\n;window.__sicherung = { App, leeresProjekt, projektFuerAblage, sichern,"
  + " sicherungAnbieten, sicherungsKarte, speichern, SICHERUNG,"
  + " Sicherungsstand, auswertbar, rechnen };\n";
try { vm.runInContext(app, umgebung, { filename: "src/app.js" }); }
catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(0);
}
const T = fenster.__sicherung;

/* =========================================================================
 * Ein Projekt mit echtem Ringverweis
 * =========================================================================
 * Genau so sieht es aus, sobald ein PDF abgelegt wurde: die Seite kennt ihr
 * Dokument, das Dokument kennt seine Seiten. Dazu die Bytefolge der Datei,
 * die zwar schreibbar waere, aber jeden Browserspeicher sprengt.
 * ====================================================================== */
function projektMitPlan() {
  const p = T.leeresProjekt();
  p.meta = { bezeichnung: "Mehrfamilienhaus Musterweg 1", strasse: "Musterweg 1",
             plz: "33098", ort: "Paderborn", bauherr: "", projektnr: "P-1",
             baujahr: 1965, bearbeitet: "2026-08-22" };
  p.klima = { theta_e: -10.6, theta_e_m: 9.4, quelle: "DIN/TS 12831-1 Beiblatt" };
  p.bauteiltypen = [{ id: "bw", name: "Außenwand", U: 1.2, kat_default: "huelle",
                      schichten: [], belegt: false }];
  p.raeume = [];
  for (let i = 0; i < 14; i++) {
    p.raeume.push({ id: "r" + i, geschoss: i < 7 ? "EG" : "OG", name: "Raum " + (i + 1),
      art: "wohnen", A: 12 + i, h: 2.5, we: "WE 1",
      bauteile: [{ typ_id: "bw", name: "Außenwand", A: 10, kat: "huelle",
                   art: "aussenwand", grenzt_an: { typ: "aussen" } }] });
  }

  const dokument = { numPages: 2, seiten: [] };
  const seiten = [];
  for (let nr = 1; nr <= 2; nr++) {
    const pdfSeite = { nr: nr, dokument: dokument, getViewport() { return {}; } };
    dokument.seiten.push(pdfSeite);
    seiten.push({
      nr: nr, quelle: "pdf", datei: "Grundrisse.pdf",
      bezeichnung: "Grundrisse.pdf, Seite " + nr,
      typ: "vektorplan", format: "A3", breite_mm: 420, hoehe_mm: 297,
      geschoss: nr === 1 ? "EG" : "OG",
      massstab: { nenner: 100, guete: "abgesichert", quelle: "Schriftfeld" },
      blattkopf: { massstab_nenner: 100 },
      auslese: { raeume: [{ bezeichnung: "Wohnen", flaeche_m2: 24 }] },
      ausgewertet: true, uebernommen: true,
      /* das Lebendige */
      pdfSeite: pdfSeite,
      bytes: new Uint8Array(1024),
      rendern: function () { return Promise.resolve({}); },
      kachelplan: function () { return {}; },
      flaechen: function () { return []; },
    });
  }
  p.plan = { bilder: [], seiten: seiten };
  return p;
}

/* ---------------------------------------------------- 1 Der Ringverweis */
{
  const p = projektMitPlan();
  let warf = false;
  try { JSON.stringify(p); } catch (e) { warf = true; }
  pruefe(warf,
    "Die Probe selbst ist stumpf geworden: das Pruefprojekt enthaelt keinen "
    + "Ringverweis mehr. Dann bestuende auch die alte, kaputte Fassung. Der "
    + "Aufbau von projektMitPlan() muss nachgezogen werden.");

  T.App.p = p;
  let text = null, wirft = false;
  try { text = JSON.stringify(T.projektFuerAblage(p)); } catch (e) { wirft = true; }
  pruefe(!wirft && typeof text === "string" && text.length > 200,
    "projektFuerAblage() liefert kein schreibbares Projekt. Damit sind "
    + "Speichern und Zwischenspeicher wieder tot, sobald ein Plan im Projekt liegt.");

  const zurueck = JSON.parse(text);
  pruefe(zurueck.raeume.length === 14,
    "Beim Aufbereiten gehen Raeume verloren: " + zurueck.raeume.length + " statt 14.");
  pruefe(zurueck.plan.seiten.length === 2,
    "Die Blaetter fehlen in der schreibbaren Fassung.");
  const s0 = zurueck.plan.seiten[0];
  pruefe(s0.massstab && s0.massstab.nenner === 100,
    "Der Massstab des Blattes ueberlebt das Aufbereiten nicht. Er ist die "
    + "Grundlage jeder gemessenen Flaeche und gehoert in die Sicherung.");
  pruefe(!!s0.auslese && (s0.auslese.raeume || []).length === 1,
    "Die Auslese des Blattes ueberlebt das Aufbereiten nicht -- der teuerste "
    + "Teil der Arbeit, er hat Geld gekostet.");
  pruefe(s0.pdfSeite === undefined && s0.bytes === undefined,
    "Das Lebendige ist noch da (pdfSeite/bytes). Genau daran ist es gescheitert.");
  pruefe(s0.nurDaten === true,
    "Ein aufbereitetes Blatt muss sich als nurDaten zu erkennen geben, sonst "
    + "laeuft die Stapelauswertung nach dem Wiederherstellen in einen Fehler "
    + "je Blatt.");
  pruefe(T.auswertbar(s0) === false,
    "Ein Blatt ohne Bild darf nicht zur Auswertung angeboten werden.");
}

/* ------------------------------------------- 2 Speichern erzeugt eine Datei */
{
  const p = projektMitPlan();
  T.App.p = p;
  geschrieben.length = 0;
  blobs.length = 0;
  let wirft = false;
  try { T.speichern(); } catch (e) { wirft = true; }
  pruefe(!wirft, "speichern() wirft, sobald ein Plan im Projekt liegt.");
  pruefe(geschrieben.length === 1,
    "speichern() hat keine Datei erzeugt. Genau das war der Fehler: der Knopf "
    + "tat nichts, ohne Datei und ohne Meldung.");
  pruefe(blobs.length === 1 && blobs[0].text.length > 500,
    "Die erzeugte Datei ist leer oder viel zu klein.");
  if (blobs.length) {
    const wieder = JSON.parse(blobs[0].text);
    pruefe(wieder.raeume.length === 14, "Die gespeicherte Datei enthaelt nicht alle Raeume.");
  }
}

/* ----------------------- 2b Die Gegenrechnungen laufen auch mit Plan
 * Dieselbe Krankheit, zweiter Patient. hoehenprobeRechnen() kopierte das
 * ganze Projekt mit JSON.parse(JSON.stringify(App.p)); sobald ein Plan im
 * Projekt lag, warf der Ringverweis, und der catch setzte App.hoehenfaecher
 * still auf null. Der Hoehenfaecher erschien damit in genau den Projekten
 * nie, in denen Plaene liegen -- also praktisch immer. GEMESSEN am
 * 23.08.2026 im Browser am Fall "BV 2-0887 Ziolkowski": mit Planseiten
 * null, an einer Kopie ohne p.plan rechnet die Probe. Deshalb hier beides:
 * einmal mit lebendem Plan, einmal ohne, und beide Laeufe muessen dieselben
 * Faecher liefern. Die Baujahrprobe geht ueber projektFuerKern() und laeuft
 * als Gegenprobe mit. */
{
  const mitPlan = projektMitPlan();
  T.App.p = mitPlan;
  T.App.ergebnis = null; T.App.hoehenfaecher = null; T.App.baujahrprobe = null;
  let wirft = false;
  try { T.rechnen(); } catch (e) { wirft = true; }
  pruefe(!wirft, "rechnen() wirft, sobald ein Plan im Projekt liegt.");
  const e1 = T.App.ergebnis;
  pruefe(!!e1 && !e1.fehlerhaft && e1.phi_gebaeude > 0,
    "Das Pruefprojekt liefert keine Heizlast ("
    + (e1 ? (e1.meldung || "phi=" + e1.phi_gebaeude) : "kein Ergebnis")
    + ") -- damit prueft dieser Abschnitt nichts.");
  const f1 = T.App.hoehenfaecher;
  pruefe(!!f1 && f1.ok === true && (f1.faecher || []).length === 2,
    "Die Hoehenprobe liefert mit abgelegtem Plan kein Ergebnis"
    + (f1 && f1.grund ? " -- Grund: " + f1.grund : (f1 ? "" : " (still null)"))
    + ". Genau so ist der Faecher monatelang in jedem Projekt mit Plan "
    + "ausgeblieben.");
  pruefe(!!f1 && (f1.faecher || []).every(function (x) {
      return Math.abs(x.abweichung_prozent) > 0.1; }),
    "Die Faecher zeigen keine Wirkung der Hoehe -- die Waende gehen nicht mit.");
  const b1 = T.App.baujahrprobe;

  const ohnePlan = projektMitPlan();
  delete ohnePlan.plan;
  T.App.p = ohnePlan;
  T.App.ergebnis = null; T.App.hoehenfaecher = null; T.App.baujahrprobe = null;
  try { T.rechnen(); } catch (e) {}
  const f2 = T.App.hoehenfaecher;
  pruefe(!!f2 && f2.ok === true,
    "Die Hoehenprobe scheitert schon ohne Plan -- dann misst dieser Abschnitt "
    + "nicht den Ringverweis, und sein Aufbau muss nachgezogen werden.");
  if (f1 && f1.ok && f2 && f2.ok) {
    const a = f1.faecher.map(function (x) {
      return Math.round(x.abweichung_prozent * 10); }).join("|");
    const c = f2.faecher.map(function (x) {
      return Math.round(x.abweichung_prozent * 10); }).join("|");
    pruefe(a === c,
      "Mit und ohne Plan muessen dieselben Faecher entstehen: " + a + " gegen " + c);
  }
  const b2 = T.App.baujahrprobe;
  pruefe((b1 === null) === (b2 === null)
      && (!b1 || !b2 || b1.ok === b2.ok),
    "Die Baujahrprobe verhaelt sich mit Plan anders als ohne.");
}

/* --------------------------------- 3 Zwischenspeicher schreibt wirklich */
{
  const p = projektMitPlan();
  T.App.p = p;
  delete speicher[T.SICHERUNG];
  T.sichern();
  return_nach_uhr(function () {
    pruefe(!!speicher[T.SICHERUNG],
      "Der Zwischenspeicher hat nichts geschrieben, obwohl ein Plan im Projekt "
      + "liegt. Ein Neuladen kostet dann die ganze Arbeit.");
    if (speicher[T.SICHERUNG]) {
      const g = JSON.parse(speicher[T.SICHERUNG]);
      pruefe(g.raeume === 14 && g.projekt.raeume.length === 14,
        "Der Zwischenspeicher haelt nicht alle Raeume.");
      pruefe(g.blaetter === 2, "Der Zwischenspeicher zaehlt die Blaetter nicht mit.");
      pruefe(T.Sicherungsstand.steht === true,
        "Sicherungsstand.steht meldet nicht, dass gesichert wurde. Die Warnung "
        + "beim Verlassen des Reiters haengt daran.");
    }

    /* ------------------------- 4 Zu grosses Projekt: zweiter Anlauf ohne Bilder */
    const gross = projektMitPlan();
    gross.plan.bilder = [{ id: "b1", bezeichnung: "Blatt 1",
      abbildung: "data:image/jpeg;base64," + "A".repeat(6 * 1024 * 1024) }];
    T.App.p = gross;
    delete speicher[T.SICHERUNG];
    T.sichern();
    return_nach_uhr(function () {
      pruefe(!!speicher[T.SICHERUNG],
        "Bei einem Projekt mit eingebetteter Abbildung wird gar nicht gesichert. "
        + "Der zweite Anlauf ohne Bilder greift nicht.");
      if (speicher[T.SICHERUNG]) {
        const g2 = JSON.parse(speicher[T.SICHERUNG]);
        pruefe(g2.ohneBilder === true && g2.projekt.raeume.length === 14,
          "Der Rueckfall ohne Bilder haelt nicht das Raumbuch.");
      }

      /* --------------------------- 5 Wiederherstellen wird angeboten
         Nicht mehr als confirm(): ein Dialog beim Laden wird verschluckt oder
         mit Escape weggedrueckt, und Wegdruecken LOESCHTE frueher sofort den
         ganzen Stand. Jetzt steht das Angebot als Karte ueber dem Inhalt. */
      T.App.p = T.leeresProjekt();
      T.App.sicherungAngebot = null;
      gefragt.length = 0;
      T.sicherungAnbieten();
      pruefe(gefragt.length === 0,
        "Beim Start darf kein Dialog aufgehen -- Escape hat dabei den ganzen "
        + "Stand geloescht.");
      pruefe(!!T.App.sicherungAngebot,
        "sicherungAnbieten() legt den gefundenen Stand nicht zur Entscheidung vor. "
        + "Genau so lag die Funktion da: geschrieben und von nirgendwo gerufen.");
      const karte = T.sicherungsKarte();
      pruefe(/14 Räume/.test(karte),
        "Die Karte nennt nicht, wie viel Arbeit auf dem Spiel steht: " + karte);
      pruefe(/2 Blätter/.test(karte),
        "Die Karte nennt die Zahl der Blaetter nicht.");
      pruefe(/data-aktion="sicherungWeiter"/.test(karte)
        && /data-aktion="sicherungVerwerfen"/.test(karte),
        "Die Karte bietet nicht beide Wege an.");

      /* Der Zwischenspeicher darf den angebotenen Stand nicht ueberschreiben,
         solange niemand entschieden hat. Sonst genuegt ein Tastendruck. */
      const vorher = speicher[T.SICHERUNG];
      T.App.p = T.leeresProjekt();
      T.App.p.meta.bezeichnung = "etwas Neues";
      T.sichern();
      return_nach_uhr(function () {
        pruefe(speicher[T.SICHERUNG] === vorher,
          "Der offene Stand wurde ueberschrieben, bevor jemand entschieden hat.");

      /* Weiterarbeiten holt Raeume und Blaetter zurueck. */
      T.App.p = T.leeresProjekt();
      klick("sicherungWeiter");
      pruefe(T.App.p.raeume.length === 14,
        "Nach dem Wiederherstellen fehlen Raeume: " + T.App.p.raeume.length + " statt 14.");
      pruefe((T.App.p.plan.seiten || []).length === 2,
        "Nach dem Wiederherstellen fehlen die Blaetter mit ihrer Auslese.");
      pruefe(T.sicherungsKarte() === "",
        "Nach der Entscheidung muss die Karte verschwinden.");

      /* --------------------------- 6 Verwerfen loescht -- aber nur auf
         ausdruecklichen Klick und mit Rueckfrage. */
      T.App.p = T.leeresProjekt();
      T.sicherungAnbieten();
      gefragt.length = 0;
      bestaetigung = false;
      klick("sicherungVerwerfen");
      pruefe(gefragt.length === 1,
        "Verwerfen muss nachfragen, bevor ein Arbeitstag geloescht wird.");
      pruefe(!!speicher[T.SICHERUNG],
        "Eine verneinte Rueckfrage darf nichts loeschen.");
      bestaetigung = true;
      klick("sicherungVerwerfen");
      pruefe(!speicher[T.SICHERUNG],
        "Wer die Wiederherstellung ablehnt, muss sie los sein -- sonst wird er "
        + "bei jedem Start erneut gefragt.");
      pruefe(T.App.p.raeume.length === 0,
        "Trotz Ablehnung wurde das alte Projekt geladen.");

      /* --------------------------- 7 Und sie wird beim Start auch angeboten */
      /* Der teuerste Teil des alten Fehlers war nicht, dass die Funktion
         falsch war -- sie war richtig. Sie wurde nur nie gerufen. Ein Test,
         der sie selbst aufruft, kann das nicht bemerken; deshalb wird hier
         nachgesehen, ob start() sie ueberhaupt anfasst. Die allgemeine Form
         dieser Frage prueft validierung/verdrahtung_test.js. */
      const quelle = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
      const mStart = /\nfunction start\s*\(\s*\)\s*\{/.exec(quelle);
      let rumpf = "";
      if (mStart) {
        let i = quelle.indexOf("{", mStart.index), tiefe = 1, j = i + 1;
        while (j < quelle.length && tiefe > 0) {
          if (quelle[j] === "{") tiefe++;
          else if (quelle[j] === "}") tiefe--;
          j++;
        }
        rumpf = quelle.slice(i, j);
      }
      pruefe(/sicherungAnbieten\s*\(/.test(rumpf),
        "start() ruft sicherungAnbieten() nicht auf. Dann liegt zwar eine "
        + "Sicherung im Browser, sie wird aber niemandem angeboten -- die "
        + "gesamte Absicherung gegen ein versehentliches Neuladen ist wirkungslos.");
      pruefe(/beforeunload/.test(quelle),
        "Es gibt keine Rueckfrage beim Schliessen des Reiters mit ungesichertem Stand.");
      pruefe(/dragover|drop/.test(quelle) && /closest\("#ablage"\)/.test(quelle),
        "Ein Plan, der NEBEN die Ablageflaeche faellt, oeffnet den Browser auf "
        + "dem PDF und nimmt das Werkzeug mitsamt ungesicherter Arbeit mit. Der "
        + "Fang auf Fensterebene fehlt.");

      /* --------------------------- 8 Die Zwei-Tab-Falle
         Abnahmebefund 24.08.2026: ein liegen gebliebener alter Reiter hat mit
         seinem naechsten Tastendruck den NEUEREN Stand des aktiven Reiters
         ueberschrieben -- kommentarlos. Der Zwischenspeicher ist EIN
         Schluessel fuer alle Reiter; deshalb traegt jeder Eintrag jetzt die
         Sitzungskennung, und vor dem Schreiben wird gelesen: ein juengerer
         Eintrag einer anderen Sitzung wird NIE ueberschrieben. */
      T.App.p = projektMitPlan();
      T.App.sicherungAngebot = null;
      delete speicher[T.SICHERUNG];
      T.sichern();
      return_nach_uhr(function () {
        const eigen = JSON.parse(speicher[T.SICHERUNG] || "null");
        pruefe(!!eigen && typeof eigen.sitzung === "string" && eigen.sitzung.length > 3,
          "Der Eintrag traegt keine Sitzungskennung -- ohne sie ist kein "
          + "fremder Stand von einem eigenen zu unterscheiden.");

        /* Ein ANDERER Tab schreibt einen juengeren Stand. Der alte Tab tippt
           danach weiter -- und darf nicht rueckwaerts ueberschreiben. */
        const fremdStand = new Date(Date.now() + 60000).toISOString();
        speicher[T.SICHERUNG] = JSON.stringify({ stand: fremdStand,
          sitzung: "tab_fremd", bezeichnung: "anderer Tab", raeume: 3,
          blaetter: 0, projekt: { raeume: [] } });
        gemeldet.length = 0;
        T.App.p.meta.bezeichnung = "alter Tab tippt weiter";
        T.sichern();
        return_nach_uhr(function () {
          const danach = JSON.parse(speicher[T.SICHERUNG]);
          pruefe(danach.sitzung === "tab_fremd" && danach.stand === fremdStand,
            "Der alte Tab hat den neueren Stand des anderen Tabs "
            + "ueberschrieben -- genau die Falle aus der Abnahme.");
          pruefe(T.Sicherungsstand.steht === false
              && /Tab/.test(T.Sicherungsstand.grund || ""),
            "Der Blattkopf erfaehrt nicht, dass nicht mehr gesichert wird: "
            + JSON.stringify(T.Sicherungsstand.grund));
          pruefe(gemeldet.some(function (t) { return /Tab/.test(t); }),
            "Niemand erfaehrt, dass dieser Reiter nicht mehr sichert -- die "
            + "Warnung fehlt.");

          /* Ein AELTERER fremder Stand ist kein Hindernis: er wird wie
             bisher ueberschrieben, sonst bliebe nach einem Absturz des
             anderen Tabs jede Sicherung aus. */
          speicher[T.SICHERUNG] = JSON.stringify({
            stand: new Date(Date.now() - 3600000).toISOString(),
            sitzung: "tab_fremd", projekt: { raeume: [] } });
          T.sichern();
          return_nach_uhr(function () {
            const jetzt = JSON.parse(speicher[T.SICHERUNG]);
            pruefe(jetzt.sitzung !== "tab_fremd",
              "Ein aelterer fremder Stand blockiert die Sicherung -- der "
              + "Waechter ist zu scharf und die Arbeit liegt wieder ungesichert.");
            pruefe(T.Sicherungsstand.steht === true,
              "Nach dem Ueberschreiben des aelteren Stands muss wieder "
              + "'gesichert' gelten.");

            /* Wer den juengeren Stand des anderen Tabs AUSDRUECKLICH
               uebernimmt, darf ihn danach auch ueberschreiben. */
            const spaeter = new Date(Date.now() + 120000).toISOString();
            speicher[T.SICHERUNG] = JSON.stringify({ stand: spaeter,
              sitzung: "tab_zwei", bezeichnung: "Stand aus Tab 2", raeume: 1,
              blaetter: 0, projekt: { raeume: [{ id: "rx", name: "Wohnen",
                geschoss: "EG", art: "wohnen", A: 20, h: 2.5, we: "WE 1",
                bauteile: [] }] } });
            T.App.sicherungAngebot = null;
            T.sicherungAnbieten();
            pruefe(!!T.App.sicherungAngebot,
              "Der Stand des anderen Tabs wird nicht zur Uebernahme angeboten.");
            klick("sicherungWeiter");
            pruefe(T.App.p.raeume.length === 1,
              "Die Uebernahme holt den Stand des anderen Tabs nicht.");
            T.App.p.meta.bezeichnung = "weitergearbeitet";
            T.sichern();
            return_nach_uhr(function () {
              const nachher = JSON.parse(speicher[T.SICHERUNG]);
              pruefe(nachher.sitzung !== "tab_zwei"
                  && nachher.bezeichnung === "weitergearbeitet",
                "Nach ausdruecklicher Uebernahme muss diese Sitzung wieder "
                + "schreiben duerfen: " + JSON.stringify({
                    sitzung: nachher.sitzung, bezeichnung: nachher.bezeichnung }));
              fertig();
            });
          });
        });
      });
      });
    });
  });
}

/* Der Zwischenspeicher schreibt verzoegert (800 ms), damit nicht bei jedem
   Tastendruck geschrieben wird. Die Probe muss darauf warten. */
function return_nach_uhr(f) { setTimeout(f, 950); }

/** Einen Knopf druecken: durch den echten Klickverteiler in app.js. */
function klick(aktion, i) {
  const el = { dataset: { aktion: aktion }, closest(sel) {
    return sel === "[data-aktion]" ? el : null; } };
  if (i != null) el.dataset.i = String(i);
  const ev = { preventDefault() {},
               target: { closest(sel) { return sel === "[data-aktion]" ? el : null; } } };
  (zuhoerer.click || []).forEach(function (f) { f(ev); });
}

function fertig() {
  console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl, fehler: fehler }));
}
