/* ===========================================================================
 * verdrahtung_test.js — die Probe gegen die Krankheit dieses Werkzeugs
 * ===========================================================================
 * Dreimal ist hier derselbe Fehler passiert, und dreimal hat ihn kein
 * Selbsttest gefunden. Ein Selbsttest ruft die Funktion unmittelbar auf; er
 * kann deshalb gar nicht bemerken, dass sie sonst niemand aufruft.
 *
 * Was tatsaechlich vorgefallen ist:
 *
 *   kern_massstab.js      1876 Zeilen Massstabserkennung, kein einziger
 *                         Aufrufer. Getestet, gruen, wirkungslos.
 *   kern_messen.js        456 Zeilen, 63 bestandene Pruefungen, fehlte in der
 *                         Auslieferung. Das Messwerkzeug war fuer alle
 *                         fuenfzig Kollegen unbenutzbar.
 *   messenStarten(i)      war da, wurde nie gerufen und nicht exportiert. Der
 *                         Knopf "Maßstab setzen" lud stattdessen ein anderes
 *                         Blatt.
 *   Haken im Kontrollblatt  war gezeichnet, die Aktion fehlte im Verteiler.
 *                         Ein Klick tat nichts.
 *   sicherungAnbieten()   von dieser Probe gefunden: die Wiederherstellung
 *                         nach einem Neuladen war geschrieben und wurde von
 *                         nirgendwo gerufen. Die ganze Absicherung gegen
 *                         Datenverlust lag brach.
 *
 * Alle fuenf haben dieselbe Form: gebaute Faehigkeit ohne Weg dorthin.
 * Diese Probe sucht genau diese Form, in drei Teilen:
 *
 *   Teil 1  Jeder Knopf nennt eine Aktion, die ein Verteiler kennt --
 *           und jede Aktion, die ein Verteiler kennt, wird von einem Knopf
 *           genannt. Die Namen kommen aus dem TATSAECHLICH GEZEICHNETEN
 *           Markup, nicht aus dem Quelltext; nur so werden auch die Knoepfe
 *           erfasst, deren Aktionsname erst beim Zeichnen entsteht.
 *   Teil 2  Keine Funktion auf oberster Ebene, die weder aufgerufen noch
 *           herausgereicht wird.
 *   Teil 3  Kein Modul, das window.NAME setzt und von keiner anderen
 *           Quelldatei benutzt wird.
 *
 * Was diese Probe NICHT kann: eine Funktion beurteilen, die aufgerufen wird
 * und dabei das Falsche tut. Dafuer sind die uebrigen Proben da.
 *
 * Aufruf:  node validierung/verdrahtung_test.js
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

/* ---------------------------------------------------------------- Quellen */
const quellen = {};
(function sammle(ordner) {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) sammle(p);
    else if (e.name.endsWith(".js")) {
      quellen[path.relative(WURZEL, p)] = fs.readFileSync(p, "utf8");
    }
  }
})(path.join(WURZEL, "src"));

/** Nimmt Kommentare und Zeichenketten heraus.
 *
 *  Ohne das zaehlt eine Erwaehnung im Kommentar wie ein Aufruf. Genau daran
 *  waere die Probe bei messenStarten() vorbeigelaufen: die Funktion war nicht
 *  mehr exportiert und wurde nicht mehr gerufen, aber ein Kommentar und eine
 *  Meldung im Selbsttest nannten ihren Namen noch -- drei Vorkommen, also
 *  scheinbar in Ordnung. Gezaehlt wird deshalb nur noch, was Programm ist.
 *
 *  Ersetzt wird zeichengenau durch Leerzeichen, damit Zeilennummern und
 *  Abstaende erhalten bleiben und die uebrigen Muster weiter greifen. */
function entkerne(text) {
  let raus = "";
  let i = 0;
  const n = text.length;
  const leer = (s) => " ".repeat(s.length);
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === "/" && d === "/") {
      let j = text.indexOf("\n", i); if (j < 0) j = n;
      raus += leer(text.slice(i, j)); i = j; continue;
    }
    if (c === "/" && d === "*") {
      let j = text.indexOf("*/", i + 2); j = j < 0 ? n : j + 2;
      raus += text.slice(i, j).replace(/[^\n]/g, " "); i = j; continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n) {
        if (text[j] === "\\") { j += 2; continue; }
        if (text[j] === c) { j++; break; }
        if (c !== "`" && text[j] === "\n") break;   // unbeendet: nicht verschlucken
        j++;
      }
      raus += text.slice(i, j).replace(/[^\n]/g, " "); i = j; continue;
    }
    raus += c; i++;
  }
  return raus;
}

/** Blendet zusaetzlich die Selbsttests aus.
 *
 *  Das ist der Kern der Sache: "Ein Selbsttest findet so etwas nicht, weil er
 *  die Funktion direkt aufruft." Zaehlte der Selbsttest als Aufrufer, waere
 *  jede getestete, aber nirgends verdrahtete Funktion aus der Sicht dieser
 *  Probe in Ordnung -- und genau die soll sie ja finden. Ein Aufruf aus dem
 *  Selbsttest ist kein Weg, den ein Bearbeiter gehen kann. */
function ohneSelbsttest(text) {
  let raus = text;
  const muster = /(?:function\s+selbsttest\s*\(|selbsttest\s*:\s*function\s*\()/g;
  let m;
  while ((m = muster.exec(raus))) {
    let i = raus.indexOf("{", m.index + m[0].length - 1);
    if (i < 0) break;
    let j = i + 1, tiefe = 1;
    while (j < raus.length && tiefe > 0) {
      if (raus[j] === "{") tiefe++;
      else if (raus[j] === "}") tiefe--;
      j++;
    }
    raus = raus.slice(0, i) + raus.slice(i, j).replace(/[^\n]/g, " ") + raus.slice(j);
    muster.lastIndex = j;
  }
  return raus;
}

const rumpfOhneText = {};
const selbsttestAb = {};
for (const [datei, text] of Object.entries(quellen)) {
  const rein = entkerne(text);
  rumpfOhneText[datei] = ohneSelbsttest(rein);
  /* Ab hier beginnt der Pruefteil der Datei. Alles, was DANACH definiert
     wird, ist Werkzeug des Selbsttests -- pruefe(), nahe(), ein Beispielplan.
     Solche Helfer duerfen selbstverstaendlich nur vom Selbsttest gebraucht
     werden. Alles, was DAVOR steht, gehoert zum Werkzeug und muss auf einem
     Weg erreichbar sein, den ein Bearbeiter gehen kann. */
  const m = /(?:function\s+selbsttest\s*\(|selbsttest\s*:\s*function\s*\()/.exec(rein);
  selbsttestAb[datei] = m ? m.index : Infinity;
}

/* =========================================================================
 * Teil 1  Knopf und Verteiler
 * =========================================================================
 * Die Aktionsnamen werden an zwei Stellen erhoben:
 *
 *   a) im gezeichneten Markup. Das ist die verlaessliche Quelle, weil dort
 *      auch die Knoepfe stehen, deren Name erst zur Laufzeit entsteht --
 *      etwa die Handlungen einer Kontrollblattzeile oder die Betriebsarten
 *      im Planwerkzeug. Ein Quelltextgriff nach data-aktion="..." sieht dort
 *      nur eine Zeichenkette mit einem Pluszeichen.
 *   b) im Quelltext, als literales data-aktion="..." und als literales
 *      aktion: "..." in einer Handlungsliste. Das faengt die Knoepfe, die in
 *      einem Zustand stecken, den die Probe nicht herstellt.
 *
 * Die Menge der bekannten Aktionen kommt aus den Verteilern selbst: aus dem
 * grossen switch in app.js und aus jeder Funktion aktion(name) eines Moduls.
 * ====================================================================== */

/** Schneidet den Rumpf eines switch heraus, das ueber Aktionsnamen entscheidet. */
function verteilerRuempfe(text) {
  const raus = [];
  const muster = /switch\s*\(\s*(?:a\.dataset\.aktion|name|aktionsname)\s*\)\s*\{/g;
  let m;
  while ((m = muster.exec(text))) {
    let i = m.index + m[0].length, tiefe = 1;
    while (i < text.length && tiefe > 0) {
      const c = text[i];
      if (c === "{") tiefe++;
      else if (c === "}") tiefe--;
      i++;
    }
    raus.push(text.slice(m.index + m[0].length, i));
  }
  return raus;
}

const bekannt = {};          // Aktionsname -> Datei des Verteilers
for (const [datei, text] of Object.entries(quellen)) {
  for (const rumpf of verteilerRuempfe(text)) {
    for (const m of rumpf.matchAll(/case\s+"([A-Za-z0-9_]+)"\s*:/g)) {
      bekannt[m[1]] = datei;
    }
  }
}
pruefe(Object.keys(bekannt).length > 30,
  "Es wurden nur " + Object.keys(bekannt).length + " Verteilereintraege gefunden. "
  + "Wahrscheinlich hat sich die Form der Verteiler geaendert und diese Probe "
  + "sieht nichts mehr. Dann ist sie wertlos und muss nachgezogen werden.");

const genannt = {};          // Aktionsname -> woher
function nennen(name, woher) {
  if (!genannt[name]) genannt[name] = new Set();
  genannt[name].add(woher);
}
for (const [datei, text] of Object.entries(quellen)) {
  for (const m of text.matchAll(/data-aktion=\\?"([A-Za-z0-9_]+)/g)) nennen(m[1], datei);
  for (const m of text.matchAll(/\baktion:\s*"([A-Za-z0-9_]+)"/g)) nennen(m[1], datei);
}

/* ---- und jetzt aus dem gezeichneten Markup ---------------------------- */
const gezeichnet = markupErzeugen();
for (const [wo, html] of Object.entries(gezeichnet)) {
  for (const m of String(html).matchAll(/data-aktion="([^"]+)"/g)) {
    nennen(m[1], "gezeichnet: " + wo);
  }
}

for (const [name, woher] of Object.entries(genannt)) {
  pruefe(!!bekannt[name],
    'Ein Knopf nennt die Aktion "' + name + '" (' + Array.from(woher).join(", ")
    + "), aber kein Verteiler kennt sie. Ein Klick darauf tut nichts -- ohne "
    + "Meldung, ohne Fehler, ohne Spur.");
}
for (const [name, datei] of Object.entries(bekannt)) {
  pruefe(!!genannt[name],
    'Der Verteiler in ' + datei + ' behandelt die Aktion "' + name
    + '", aber kein Knopf nennt sie -- weder im Quelltext noch in irgendeinem '
    + "gezeichneten Bildschirm. Entweder fehlt der Knopf oder der Zweig ist "
    + "uebrig geblieben und gehoert weg.");
}

/* =========================================================================
 * Teil 2  Funktionen ohne Weg dorthin
 * =========================================================================
 * Eine Funktion auf oberster Ebene, deren Name in ihrer eigenen Datei genau
 * einmal vorkommt, wird von nichts aufgerufen und von nichts herausgereicht.
 * Genau so lagen messenStarten() und sicherungAnbieten() da.
 *
 * Gezaehlt wird das blosse Vorkommen des Namens; das erfasst den Aufruf
 * foo(), die Weitergabe als Wert, den Eintrag in eine Verteilertabelle und
 * den Export window.X = { foo: foo }. Falsch anschlagen kann die Probe damit
 * nicht, uebersehen schon -- und das ist die richtige Richtung.
 * ====================================================================== */
for (const [datei, text] of Object.entries(quellen)) {
  for (const m of text.matchAll(/^\s{0,4}(?:async\s+)?function\s+([A-Za-zÄÖÜäöüß_$][\wÄÖÜäöüß$]*)\s*\(/gm)) {
    const name = m[1];
    if (name === "selbsttest") continue;
    if (m.index >= selbsttestAb[datei]) continue;   // Helfer des Selbsttests
    /* \b taugt hier nicht: in JavaScript ist "ü" kein Wortzeichen, also
       findet \bübernehmen\b die Funktion uebernehmen() mit Umlaut nie und die
       Probe meldet sie faelschlich als tot. Stattdessen wird ausdruecklich
       verlangt, dass links und rechts KEIN Bezeichnerzeichen steht -- Umlaute
       ausdruecklich mitgezaehlt. */
    const wortzeichen = "A-Za-z0-9_$ÄÖÜäöüß";
    const muster = new RegExp("(^|[^" + wortzeichen + "])"
      + name.replace(/\$/g, "\\$") + "(?![" + wortzeichen + "])", "g");
    const vorkommen = (rumpfOhneText[datei].match(muster) || []).length;
    pruefe(vorkommen > 1,
      datei + ": die Funktion " + name + "() wird von nichts aufgerufen und von "
      + "nichts herausgereicht. Entweder fehlt der Aufruf -- dann ist eine "
      + "gebaute Faehigkeit nicht erreichbar -- oder sie wird nicht mehr "
      + "gebraucht und gehoert entfernt.");
  }
}

/* =========================================================================
 * Teil 3  Module ohne Benutzer
 * =========================================================================
 * Ein Kern, den keine andere Quelldatei anfasst, ist tote Last. Er wird
 * gebaut, geprueft, mit ausgeliefert -- und aendert am Ergebnis nichts.
 * kern_massstab.js war 1876 Zeilen lang in genau diesem Zustand.
 *
 * Die Ausgabedatei wird hier NICHT befragt; das tut Schritt 7 des Baus. Hier
 * geht es um die andere Haelfte: mitgeliefert, aber unbenutzt.
 * ====================================================================== */
const stelltBereit = {};
for (const [datei, text] of Object.entries(quellen)) {
  for (const m of text.matchAll(/window\.([A-Z][A-Z0-9_]+)\s*=[^=]/g)) {
    stelltBereit[m[1]] = datei;
  }
}
/* Auch die Proben zaehlen als Benutzer: window.ZEICHNER etwa gibt es nur,
   damit oberflaeche_test.js jeden Leisteneintrag ueber denselben Verteiler
   zeichnen kann wie ein Klick. Das ist ein Zweck, kein Ueberbleibsel.
   Verlangt wird dafuer eine ausdrueckliche Nennung von window.NAME -- eine
   Datei bloss zu laden genuegt nicht. Genau daran waere kern_grundriss.js
   nicht vorbeigekommen. */
const proben = {};
for (const d of fs.readdirSync(__dirname)) {
  if (d.endsWith(".js") && d !== "verdrahtung_test.js") {
    proben["validierung/" + d] = fs.readFileSync(path.join(__dirname, d), "utf8");
  }
}
for (const [name, heimat] of Object.entries(stelltBereit)) {
  /* Mit Wortgrenze, nicht mit includes: "window.KERN_FENSTER" steckt sonst
     als Anfangsstueck in "window.KERN_FENSTER_AUS", und ein Aufrufer, der
     gerade umbenannt wurde, wuerde weiter mitgezaehlt. */
  const wortende = new RegExp("window\\." + name + "(?![A-Za-z0-9_])");
  const benutzer = Object.keys(quellen).concat(Object.keys(proben)).filter(function (d) {
    const inhalt = quellen[d] || proben[d];
    return d !== heimat && wortende.test(inhalt);
  });
  pruefe(benutzer.length > 0,
    heimat + " stellt window." + name + " bereit, aber keine andere Quelldatei "
    + "benutzt es. Entweder verdrahten oder entfernen -- ein mitgeliefertes "
    + "Modul ohne Aufrufer kostet Ladezeit, Pruefzeit und die Zeit des "
    + "naechsten, der es fuer eingebunden haelt.");
}

/* =========================================================================
 * Das Markup erzeugen: die Seite wird bedient, nicht gelesen
 * ====================================================================== */
function markupErzeugen() {
  const raus = {};
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
      get(z, s) {
        if (s === "canvas") return knoten("canvas");
        if (s === "measureText") return function () { return { width: 10 }; };
        if (s === "getImageData") {
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
  app += "\n;window.__verdrahtung = { SCHRITTE, SCHRITTE_DETAIL, App,"
    + " leeresProjekt, rechnen, schrittFussleiste, bauteileErgaenzen };\n";
  try { vm.runInContext(app, umgebung, { filename: "src/app.js" }); }
  catch (e) { fehler.push("app.js laesst sich nicht laden: " + e.message); return raus; }
  const T = fenster.__verdrahtung;
  if (!T) return raus;

  /* Ein Projekt, das moeglichst viele Knoepfe hervorbringt: Raeume mit und
     ohne Flaeche, ein unbeheizter Bereich ohne Huelle, ein Blatt im Stapel
     mit offenem Massstab. Erst dann zeichnet das Kontrollblatt seine
     Handlungen ("baulich erklärt", "als unbeheizten Bereich anlegen"), und
     erst dann sind die zugehoerigen Verteilerzweige belegt. */
  const p = T.leeresProjekt();
  p.meta = { bezeichnung: "Verdrahtungsprobe", strasse: "Musterweg 1", plz: "33098",
             ort: "Paderborn", bauherr: "", projektnr: "V", baujahr: 1965,
             bearbeitet: "2026-01-01" };
  p.klima = { theta_e: -10.6, theta_e_m: 9.4, quelle: "DIN/TS 12831-1 Beiblatt" };
  p.einheiten = [{ id: "we1", name: "WE 1", personen: 2 }];
  p.bauteiltypen = [
    { id: "bw", name: "Außenwand", U: 1.2, kat_default: "huelle", schichten: [],
      belegt: false, typologie: true },
    { id: "bf", name: "Fenster", U: 2.8, kat_default: "huelle", schichten: [],
      belegt: false, typologie: true },
    { id: "bk", name: "Kellerdecke", U: 1.0, kat_default: "huelle", schichten: [],
      belegt: false, typologie: true },
    { id: "bd", name: "Dach", U: 0.8, kat_default: "huelle", schichten: [],
      belegt: false, typologie: true },
  ];
  p.zonen = [{ id: "keller", name: "Unbeheizter Keller", modus: "bilanz", huelle: [] }];
  p.raeume = [
    { id: "r1", geschoss: "EG", name: "Wohnen", art: "wohnen", A: 24, h: 2.5,
      we: "WE 1", aussenwaende: 2, fenster: 2, fensterliste: [], bauteile: [
        { typ_id: "bw", name: "Außenwand", A: 18, kat: "huelle", grenzt_an: { typ: "aussen" } },
        { typ_id: "bf", name: "Fenster", A: 3.2, kat: "huelle", grenzt_an: { typ: "aussen" } },
        { typ_id: "bk", name: "Kellerdecke", A: 24, kat: "huelle",
          grenzt_an: { typ: "zone", zone_id: "keller" } }] },
    { id: "r2", geschoss: "EG", name: "Bad", art: "bad", A: 6, h: 2.5, we: "WE 1",
      aussenwaende: 1, fenster: 1, fensterliste: [], bauteile: [
        { typ_id: "bw", name: "Außenwand", A: 7, kat: "huelle", grenzt_an: { typ: "aussen" } }] },
    { id: "r3", geschoss: "OG", name: "Schlafen", art: "wohnen", A: 0, h: 2.5,
      we: "WE 1", aussenwaende: 2, fenster: 1, fensterliste: [], bauteile: [
        { typ_id: "bd", name: "Dach", A: 20, kat: "huelle", grenzt_an: { typ: "aussen" } }] },
  ];
  p.plan = { bilder: [], seiten: [
    { nr: 1, quelle: "pdf", bezeichnung: "Grundriss EG.pdf", datei: "Grundriss EG.pdf",
      typ: "vektorplan", format: "A3", breite_mm: 420, hoehe_mm: 297,
      geschoss: "EG", massstab: { nenner: null, guete: "unbekannt" },
      auslese: { raeume: [{ bezeichnung: "Wohnen", flaeche_m2: 24 },
                          { bezeichnung: "Bad", flaeche_m2: 6 }] },
      ausgewertet: true, uebernommen: true },
    { nr: 1, quelle: "bild", bezeichnung: "Schnitt.png", datei: "Schnitt.png",
      typ: "scan", breite_mm: null, hoehe_mm: null,
      massstab: { nenner: 50, guete: "vorlaeufig", quelle: "Schriftfeld" } },
  ] };
  T.App.p = p;
  T.App.detailOffen = true;
  try { T.rechnen(); } catch (e) { fehler.push("rechnen() bricht ab: " + e.message); }

  /* Der Verteiler der Zeichner kommt ueber window.ZEICHNER, also ueber
     denselben Weg, den auch ein Klick nimmt. Nicht ueber eine eigens
     angehaengte Zeile: was die Probe sich selbst herausreicht, sagt nichts
     darueber, ob es die Seite auch bekommt. */
  const zeichner = fenster.window.ZEICHNER || {};
  const eintraege = [].concat(T.SCHRITTE, T.SCHRITTE_DETAIL);
  for (const s of eintraege) {
    const z = zeichner[s.id];
    if (typeof z !== "function") continue;
    T.App.schritt = s.id;
    try { raus[s.id] = z(); } catch (e) { raus[s.id] = ""; }
    try { raus[s.id + " (Fussleiste)"] = T.schrittFussleiste(); } catch (e) {}
  }
  /* Die Module noch einmal unmittelbar, damit auch die Bildschirme erfasst
     sind, die kein Schritt von sich aus zeigt. */
  for (const [name, modul] of [["MODUL_PLAN", fenster.MODUL_PLAN],
                               ["MODUL_KI", fenster.MODUL_KI],
                               ["MODUL_KONTROLLBLATT", fenster.MODUL_KONTROLLBLATT],
                               ["MODUL_PRUEFBLATT", fenster.MODUL_PRUEFBLATT],
                               ["MODUL_BEWERTUNG", fenster.MODUL_BEWERTUNG]]) {
    if (!modul) continue;
    for (const fn of ["html", "knopf", "leiste"]) {
      if (typeof modul[fn] !== "function") continue;
      try { raus[name + "." + fn] = modul[fn](); } catch (e) { /* Zustand fehlt */ }
    }
  }
  /* Und die Kontrollblattzeilen einzeln: dort entstehen die Handlungsknoepfe,
     deren Aktionsname erst beim Zeichnen zusammengesetzt wird. */
  const KB = fenster.MODUL_KONTROLLBLATT;
  if (KB && typeof KB.zaehler === "function" && typeof KB.zeilenHtml === "function") {
    try { raus["Kontrollblattzeilen"] = KB.zeilenHtml(KB.zaehler(p, {}), p); } catch (e) {}
  }
  return raus;
}

console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl, fehler: fehler }));
