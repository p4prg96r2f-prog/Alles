/* ===========================================================================
 * oberflaeche_test.js — die Oberflaeche wird bedient, nicht gelesen
 * ===========================================================================
 * Dieses Werkzeug hatte dreimal dieselbe Krankheit: eine gebaute, getestete
 * Faehigkeit, die nirgends aufgerufen wird. Ein Selbsttest, der die Funktion
 * unmittelbar aufruft, findet so etwas nie — er ruft ja genau die Funktion auf,
 * die im Verteiler fehlt.
 *
 * Deshalb geht dieser Test den Weg des Bearbeiters: er nimmt die beiden
 * Schrittleisten, wie sie in der Seite stehen, ruft fuer JEDEN Eintrag den
 * Zeichner ueber denselben Verteiler auf, den auch der Klick benutzt, und
 * verlangt sichtbaren Inhalt. Dazu zaehlt er in jeder erzeugten Tabelle die
 * Kopfspalten gegen die Datenspalten.
 *
 * Gefunden hat er damit:
 *   - "Selbstpruefung im Einzelnen" fehlte im Verteiler: Klick auf leere Seite
 *   - Raumbuch: 13 Kopfspalten ueber 10 Datenspalten, jede Beschriftung ab
 *     "Breite m" um drei Spalten verschoben. Die Heizlast in Watt stand unter
 *     "Fenster".
 *
 * Aufruf:  node validierung/oberflaeche_test.js
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
 * So viel Seite, wie app.js beim Laden anfasst. Nicht mehr: was die Attrappe
 * nicht kann, faellt beim Laden auf und ist dann ein echter Befund. */
function knoten(name) {
  const k = {
    tagName: String(name || "div").toUpperCase(),
    innerHTML: "", value: "", checked: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], files: [],
    appendChild(x) { this.children.push(x); return x; },
    removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    closest() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; }, getBoundingClientRect() {
      return { width: 900, height: 600, top: 0, left: 0 };
    },
    getContext() { return kontext2d(); },
    toDataURL() { return "data:image/png;base64,x"; },
    scrollIntoView() {},
  };
  return k;
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
  setTimeout: setTimeout, clearTimeout: clearTimeout, fetch() { return Promise.reject(new Error("kein Netz im Test")); },
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  /* Sinnbilder liegen sonst im Blattkopf; hier genuegt die gleiche Form. */
  ikon(name) { return '<svg class="ikon"><use href="#i-' + name + '"></use></svg>'; },
};
const seite = {
  readyState: "loading",
  addEventListener() {}, removeEventListener() {},
  createElement: knoten, createElementNS: knoten,
  createTextNode() { return knoten("text"); },
  getElementById() { return null }, querySelector() { return null; },
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
umgebung.Math = Math;
umgebung.Date = Date;
umgebung.JSON = JSON;

/* Reihenfolge wie im Blattkopf: erst Daten und Kerne, dann Module, dann app.js. */
const DATEIEN = [
  "src/standorte.js", "src/daten/daten_zonenlagen.js",
  "src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
  "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
  "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
  "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
  "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js", "src/kerne/kern_lage.js",
  "src/kerne/kern_fenster.js",
  "src/kerne/kern_messen.js",
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

/* app.js haelt seine Zeichner in Deklarationen auf oberster Ebene; die liegen
   nicht am Fenster. Eine angehaengte Zeile reicht sie heraus. */
let appQuelle = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
appQuelle += "\n;window.__pruef = { SCHRITTE, SCHRITTE_DETAIL, App,"
  + " leeresProjekt, rechnen, schrittFussleiste, schrittKopfleiste,"
  + " schrittWechselMerken, rueckwegZiel, render };\n";
try {
  vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" });
} catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__pruef;

/* ------------------------------------------------------ Ein echtes Projekt */
const roh = JSON.parse(fs.readFileSync(
  path.join(WURZEL, "validierung/faelle/maelzerstr59.json"), "utf8"));
/* Die Namen im Referenzfall stehen dort in Ersatzschreibung ("Aussenwand").
   Das ist EINGABE des Bearbeiters, kein Text des Werkzeugs -- die Probe 2a
   unten prueft aber den fertigen Bildschirm und koennte beides nicht
   auseinanderhalten. Deshalb kommen die Namen hier so herein, wie sie ein
   Bearbeiter tippen wuerde. build.py macht dasselbe fuer das Demo-Projekt. */
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
T.App.detailOffen = true;
try { T.rechnen(); } catch (e) { fehler.push("rechnen() bricht ab: " + e.message); }

/* -------------------------------------------------- 1 Jeder Eintrag zeichnet */
const eintraege = T.SCHRITTE.map(function (s) { return { id: s.id, titel: s.titel }; })
  .concat(T.SCHRITTE_DETAIL.map(function (s) { return { id: s.id, titel: s.titel }; }));

const ausgaben = {};
eintraege.forEach(function (e) {
  /* Ueber window.ZEICHNER, also ueber den Verteiler, den auch ein Klick
     benutzt -- nicht ueber eine eigens angehaengte Zeile. */
  const z = (fenster.window.ZEICHNER || {})[e.id];
  pruefe(typeof z === "function",
    'Der Leisteneintrag "' + e.titel + '" (' + e.id + ") hat keinen Zeichner. "
    + "Ein Klick darauf fuehrt auf eine leere Seite.");
  if (typeof z !== "function") return;
  T.App.schritt = e.id;
  let html = "";
  try { html = z(); } catch (err) {
    fehler.push('Der Zeichner fuer "' + e.titel + '" bricht ab: ' + err.message);
    anzahl++;
    return;
  }
  ausgaben[e.id] = html;
  const nurText = String(html).replace(/<[^>]*>/g, "").replace(/\s+/g, "");
  pruefe(nurText.length > 40,
    'Der Schritt "' + e.titel + '" zeichnet nichts Sichtbares (' + nurText.length
    + " Zeichen Text).");
});

/* --------------------------- 2 Kopfspalten gegen Datenspalten in jeder Tabelle */
function spalten(zeileHtml) {
  let summe = 0;
  const re = /<(th|td)\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(zeileHtml))) {
    const cs = /colspan\s*=\s*"?(\d+)/i.exec(m[2]);
    summe += cs ? parseInt(cs[1], 10) : 1;
  }
  return summe;
}
function tabellenPruefen(id, html) {
  const tabellen = String(html).split(/<table\b/i).slice(1);
  tabellen.forEach(function (t, nr) {
    const kopf = /<thead[^>]*>([\s\S]*?)<\/thead>/i.exec(t);
    if (!kopf) return;
    const kopfZeile = /<tr[^>]*>([\s\S]*?)<\/tr>/i.exec(kopf[1]);
    if (!kopfZeile) return;
    const soll = spalten(kopfZeile[1]);
    const rumpf = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(t);
    if (rumpf) {
      const zeilen = rumpf[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      zeilen.slice(0, 3).forEach(function (z) {
        const ist = spalten(z);
        pruefe(ist === soll,
          "Tabelle " + (nr + 1) + ' in "' + id + '": Kopfzeile hat ' + soll
          + " Spalten, die Datenzeile " + ist + ". Damit steht jede Beschriftung "
          + "rechts der Abweichung ueber der falschen Spalte.");
      });
    }
    const fuss = /<tfoot[^>]*>([\s\S]*?)<\/tfoot>/i.exec(t);
    if (fuss) {
      (fuss[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []).forEach(function (z) {
        pruefe(spalten(z) === soll,
          "Tabelle " + (nr + 1) + ' in "' + id + '": Summenzeile hat ' + spalten(z)
          + " Spalten statt " + soll + ".");
      });
    }
  });
}
Object.keys(ausgaben).forEach(function (id) { tabellenPruefen(id, ausgaben[id]); });

/* ------------------- 2a Ersatzschreibungen in dem, was ein Mensch liest
 * Auf dem Ergebnisblatt stand "Wärmeströme der Gebäudehuelle". Solche
 * Ersatzschreibungen entstehen beim Tippen und fallen im Quelltext nicht auf,
 * weil daneben tabhuelle, kat: "huelle" und Kennungen stehen, die ASCII sein
 * MUESSEN. Deshalb wird hier nur der sichtbare Text geprueft -- ohne Marken,
 * ohne Eigenschaftsnamen -- und nur gegen Woerter, die im Deutschen ohne
 * Umlaut nicht vorkommen. */
const BUCH = "[A-Za-zÄÖÜäöüß]";
const ERSATZSCHREIBUNG = new RegExp(
  "(" + BUCH + "*(?:Gebaeude|[Rr]aeume|[Ff]laeche|[Ww]aerme|[Mm]assstab|[Hh]oehe"
  + "|[Tt]uer|[Aa]ussen|[Gg]roesse|[Pp]ruef|[Ww]aende|[Uu]eber|[Oo]effnung"
  + "|[Hh]uelle|[Ss]chraege|[Zz]aehler|[Ll]oesch|[Bb]ruecke|[Ss]tuec"
  + "|zulaessig|vollstaendig|urspruenglich|koennen|muessen|moeglich|naechste"
  + "|laesst|haelt|waere|gehoert)" + BUCH + "*)", "g");
Object.keys(ausgaben).forEach(function (id) {
  /* Erst die Marken heraus, dann die Zeichenentitaeten, dann lesen. */
  const text = String(ausgaben[id]).replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  const treffer = [];
  let m;
  ERSATZSCHREIBUNG.lastIndex = 0;
  while ((m = ERSATZSCHREIBUNG.exec(text))) {
    /* Netzadressen bleiben ASCII: waermepumpe.de ist richtig geschrieben. */
    const danach = text.slice(m.index + m[0].length, m.index + m[0].length + 4);
    if (/^\.(de|com|org|eu|net)\b/.test(danach)) continue;
    if (treffer.indexOf(m[0]) < 0) treffer.push(m[0]);
  }
  pruefe(treffer.length === 0,
    'Im Schritt "' + id + '" steht Text ohne Umlaut: ' + treffer.join(", ")
    + " | Umfeld: " + treffer.map(function (w) {
        const k = text.indexOf(w);
        return "..." + text.slice(Math.max(0, k - 45), k + w.length + 25)
          .replace(/\s+/g, " ") + "...";
      }).join(" / ")
    + ". Wer den Bericht unterschreibt, liest ihn auch.");
});

/* --------------------------------------- 3 Der Weg vorwaerts steht auf jedem Schritt */
T.SCHRITTE.forEach(function (s) {
  T.App.schritt = s.id;
  const leiste = T.schrittFussleiste();
  pruefe(/data-schritt=|data-aktion=/.test(leiste),
    'Auf Schritt "' + s.titel + '" bietet die Fussleiste keine Handlung an.');
});
T.App.schritt = T.SCHRITTE[T.SCHRITTE.length - 1].id;
pruefe(/data-aktion="bericht"/.test(T.schrittFussleiste()),
  "Der letzte Schritt heisst 'Ergebnis und Bericht', bietet aber keinen Knopf "
  + "zum Erzeugen des Berichts an.");

/* ------------------------------------------ 4 Keine leeren Ordnungskreise */
Object.keys(ausgaben).forEach(function (id) {
  pruefe(!/<span class="nr"><\/span>/.test(ausgaben[id]),
    'In "' + id + '" steht ein leerer Ordnungskreis (span.nr ohne Inhalt). '
    + "Er erscheint als gruener Punkt ohne Aussage.");
});

/* ----------------------- 5 Gelb ist die eine Handlung, um die es hier geht */
/* Markenbuch WERK.E: "CTA (ein gelber Button, eine Handlung)". Standen auf
   einem Schritt drei gelbe Knoepfe nebeneinander, hiess Gelb gar nichts mehr.
   Gezaehlt wird Inhalt plus Fussleiste, so wie der Schritt auf dem Schirm steht. */
T.SCHRITTE.concat(T.SCHRITTE_DETAIL).forEach(function (e) {
  T.App.schritt = e.id;
  const html = (ausgaben[e.id] || "") + T.schrittFussleiste();
  const gelb = (html.match(/class="btn[^"]*\bcta\b/g) || []).length;
  pruefe(gelb <= 1,
    'Der Schritt "' + e.titel + '" zeigt ' + gelb + " gelbe Handlungsknoepfe. "
    + "Gelb ist im Markenbuch die eine Handlung, um die es geht; mehrere davon "
    + "heben sich gegenseitig auf.");
});

/* ----------------------------- 6 Klassennamen der Rollhuelle in ASCII */
["src/app.js", "src/modul_ki.js", "src/modul_plan.js", "src/modul_kontrollblatt.js",
 "src/modul_bericht.js", "src/modul_bewertung.js"].forEach(function (d) {
  const t = fs.readFileSync(path.join(WURZEL, d), "utf8");
  pruefe(t.indexOf('class="tabhülle"') < 0,
    d + ' benutzt class="tabhülle" mit Umlaut. Die Stilregel heisst '
    + "tabhuelle; die Tabelle bekommt dadurch keinen Rollbereich.");
});

/* --------------------- 7 Der Rueckweg steht OBEN, und der Chevron tut etwas
 * Gemessen am 24.08.2026: der einzige Rueckweg aus dem Expertenmodus lag
 * unter einer bildschirmlangen Tabelle, und der Expertenmodus-Chevron in der
 * Leiste schluckte zwei Klicks ohne sichtbare Wirkung. */
T.SCHRITTE_DETAIL.forEach(function (s) {
  T.App.schritt = s.id;
  const kopf = T.schrittKopfleiste();
  pruefe(/Zurück zum Ablauf/.test(kopf),
    'Im Expertenmodus-Schritt "' + s.titel + '" fehlt der Rueckweg oben.');
  pruefe(new RegExp('data-schritt="' + T.rueckwegZiel() + '"').test(kopf),
    'Der Rueckweg oben in "' + s.titel + '" zeigt nicht auf dasselbe Ziel wie '
      + "die Fussleiste.");
});
T.SCHRITTE.forEach(function (s) {
  T.App.schritt = s.id;
  pruefe(T.schrittKopfleiste() === "",
    'Im Hauptschritt "' + s.titel + '" darf oben kein Rueckweg stehen — dort '
      + "gibt es keinen Expertenmodus zu verlassen.");
});
/* Der Chevron: Betreten eines Detailschritts oeffnet die Liste genau einmal;
   danach gilt der Klick. Zuklappen im Expertenmodus muss zugeklappt BLEIBEN,
   bis der Schritt wechselt — sonst ist der Klick wieder tot. */
T.App.schritt = "raeume";
T.App.schrittGezeichnet = null;
T.App.detailOffen = false;
T.schrittWechselMerken(true);
pruefe(T.App.detailOffen === true,
  "Das Betreten eines Detailschritts muss die Expertenliste oeffnen.");
T.App.detailOffen = false;            // der Klick auf den Chevron
T.schrittWechselMerken(true);         // naechstes Zeichnen, gleicher Schritt
pruefe(T.App.detailOffen === false,
  "Nach dem Zuklappen im Expertenmodus muss die Liste zu BLEIBEN — vorher "
    + "hielt ein ODER sie offen, und der Chevron war zwei Klicks lang tot.");
T.App.schritt = "bauteile";           // Schrittwechsel oeffnet wieder
T.schrittWechselMerken(true);
pruefe(T.App.detailOffen === true,
  "Der Wechsel in einen anderen Detailschritt muss die Liste wieder oeffnen.");

/* --------------------- 8 Die Konsens-Kennzeichnung ist SICHTBAR
 * Ein Raum, den nur eine von zwei Lesungen gesehen hat, traegt
 * herkunft.aus_einer_lesung (raumKonsens, gezielte Nachlesung). Eine Marke,
 * die nur im Datensatz steht, kennzeichnet nichts: sie muss im Raumbuch
 * neben dem Namen stehen — und NUR dort, wo sie hingehoert. */
{
  T.App.p.raeume[0].herkunft = Object.assign({}, T.App.p.raeume[0].herkunft, {
    aus_einer_lesung: true,
    lesung_quelle: "gezielte Nachlesung nach der Zählung",
  });
  T.App.schritt = "raeume";
  const html = (fenster.window.ZEICHNER || {}).raeume();
  const marken = (String(html).match(/>eine Lesung</g) || []).length;
  pruefe(marken === 1,
    "Genau EIN Raum traegt die Kennzeichnung 'aus einer Lesung'; im Raumbuch "
    + "stehen aber " + marken + " Marken.");
  pruefe(/gezielte Nachlesung nach der Zählung/.test(String(html)),
    "Die Marke muss sagen, aus WELCHER Lesung der Raum stammt.");
  delete T.App.p.raeume[0].herkunft.aus_einer_lesung;
  const ohne = (fenster.window.ZEICHNER || {}).raeume();
  pruefe(!/>eine Lesung</.test(String(ohne)),
    "Ohne die Kennzeichnung darf im Raumbuch keine Marke stehen.");
}

/* ---------------------------------------------------------------- Ergebnis */
const ergebnis = { ok: fehler.length === 0, anzahl: anzahl, fehler: fehler };
console.log(JSON.stringify(ergebnis));
if (!ergebnis.ok) process.exit(1);
