/* ===========================================================================
 * rettung_test.js — was das Werkzeug tut, wenn ein Durchgang nicht reicht
 * ===========================================================================
 * Gemessen wurde vorher, am laufenden Endpunkt, mit echten Blaettern:
 *
 *   „260514 - Dumach 1 - Grundrisse M 1.100.pdf" (A1, drei Grundrisse
 *   untereinander, 25 Raeume): in einem Durchgang lief die Antwort in die
 *   Laengengrenze, und im Raumbuch stand NICHTS. Es gab keinen einzigen
 *   Wiederholversuch im Werkzeug; „bitte erneut versuchen" hiess: der Mensch
 *   klickt noch mal.
 *
 * Geprueft wird hier der ganze Rettungsweg, ohne Netz und ohne Modell:
 *   1. Erkennt das Werkzeug, dass eine Antwort nicht traegt?
 *   2. Wiederholt es dort, wo Wiederholen hilft, und NICHT dort, wo es
 *      deterministisch scheitert?
 *   3. Liest es die Zeichnungsfelder einzeln und verliert dabei keinen Raum?
 *   4. Schneidet es einen schon zugeschnittenen Ausschnitt NICHT ein zweites
 *      Mal? (Genau daran gingen am Bogen „Dumach 1" 18 von 25 Raeumen
 *      verloren, ohne jede Fehlermeldung.)
 *   5. Sagt es dem Kollegen, was es getan hat?
 *
 * Aufruf:  node validierung/rettung_test.js
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

/* ------------------------------------------------------------------ Attrappe */
/* Jeder erzeugte Zeichenblock wird gemerkt: nur so laesst sich pruefen, mit
   welchem Quellrechteck seiteAlsBild() gemalt hat. */
const alleZeichenblaetter = [];
function knoten(name) {
  const k = {
    tagName: String(name || "div").toUpperCase(),
    innerHTML: "", value: "", checked: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], files: [], width: 0, height: 0,
    appendChild(x) { this.children.push(x); return x; },
    removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    closest() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 900, height: 600, top: 0, left: 0 }; },
    scrollIntoView() {},
  };
  if (k.tagName === "CANVAS") {
    alleZeichenblaetter.push(k);
    /* Der Zeichenblock merkt sich, WELCHEN Quellausschnitt drawImage bekommt.
       Nur daran laesst sich der doppelte Zuschnitt nachweisen. */
    k.gemalt = [];
    /* Die QUELLE jedes drawImage wird getrennt gemerkt (k.quellen): seit die
       Felder gleichzeitig laufen, ist die Aufruf-Reihenfolge keine Kennung
       mehr, und ein Test erkennt das Feld nur noch am Bild selbst. Traegt
       die Quelle ein feldTag, wandert es in die Bilddaten. */
    k.quellen = [];
    k.getContext = function () {
      return {
        fillStyle: "", fillRect() {},
        drawImage() {
          k.quellen.push(arguments[0]);
          k.gemalt.push(Array.prototype.slice.call(arguments, 1));
        },
      };
    };
    k.toDataURL = function () {
      const tag = (k.quellen[0] && k.quellen[0].feldTag) || "";
      return "data:image/jpeg;base64,BILD" + tag;
    };
  } else {
    k.getContext = function () { return null; };
    k.toDataURL = function () { return "data:image/png;base64,x"; };
  }
  return k;
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
  /* renderInhalt() schreibt in #inhalt. Gibt die Attrappe dafuer null zurueck,
     stirbt der ganze Rettungsweg an einer Zeile Oberflaeche -- und der Test
     pruefte dann nichts mehr. */
  getElementById() { return knoten("div"); },
  querySelector() { return knoten("div"); },
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
/* Die Bild-Attrappe MUSS ein Ereignis feuern. modul_ki.bildInGrenzen wartet
   auf onload/onerror, um die Kantenlaenge zu bestimmen; eine Attrappe, die
   beides nie feuert, laesst jedes await haengen und Node beendet den Test
   STILL mit Exitcode 0 -- ohne eine einzige Pruefung. Gefeuert wird onerror:
   das ist der Weg, den der echte Code fuer ein unlesbares Bild vorsieht
   (Rueckfall auf das unveraenderte Bild). */
umgebung.Image = function () {
  const img = knoten("img");
  Object.defineProperty(img, "src", {
    set() {
      const self = img;
      setTimeout(function () {
        if (typeof self.onerror === "function") self.onerror(new Error("Attrappe"));
      }, 0);
    },
    get() { return ""; },
  });
  return img;
};
umgebung.FileReader = function () { this.readAsDataURL = function () {}; };
umgebung.URL = URL;
umgebung.Blob = function () {};
umgebung.performance = { now() { return 0; } };
umgebung.navigator = { userAgent: "pruefung", clipboard: {} };
umgebung.TextEncoder = TextEncoder;
umgebung.TextDecoder = TextDecoder;
umgebung.Uint8Array = Uint8Array;
umgebung.Float64Array = Float64Array;

const DATEIEN = [
  "src/standorte.js", "src/daten/daten_zonenlagen.js",
  "src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
  "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
  "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
  "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
  "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js",
  "src/kerne/kern_fenster.js", "src/kerne/kern_messen.js",
  "src/kerne/kern_zuschnitt.js", "src/kerne/kern_gegenprobe.js",
  "src/modul_pdf.js", "src/modul_plan.js", "src/modul_ki.js",
  "src/modul_kontrollblatt.js", "src/modul_berichtsatz.js", "src/modul_teillast.js",
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
appQuelle += "\n;window.__pruef = { App, leeresProjekt, warumNichtGenug,"
  + " aussichtslos, doppelteRaeume, raumSchluessel, ertragErwartung,"
  + " leseVersuch, feldweiseLesen, seiteAlsBild, kurzeMeldung,"
  + " blattWirktGrundriss, gegenprobeNachlesen, nachlesungImBudget,"
  + " teilLesen, haelftenVon, haelftenVereinen, budgetErlaubt,"
  + " vorabFeldweise, vorabGrund, ankommendDpi, noetigDpi,"
  + " blattAuswerten, hoehenLesenGrund, hoehenVerzichtsgrund, blattZeile };"
  + "\nwindow.__pruefAbschnitt = abschnittMelden;\n";
try {
  vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" });
} catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__pruef;

/* =========================================================================
 * 1  Erkennen, dass eine Antwort nicht traegt
 * ====================================================================== */
pruefe(T.warumNichtGenug(null) !== null, "Gar keine Antwort muss auffallen");
pruefe(/Längengrenze/.test(T.warumNichtGenug(
  { ist_grundriss: true, raeume: [{}], _abgeschnitten: { grund: "max_tokens" } }) || ""),
  "Eine an der Längengrenze abgeschnittene Antwort muss als solche benannt werden");
pruefe(/Zeitgrenze/.test(T.warumNichtGenug(
  { raeume: [{}], _abgeschnitten: { grund: "zeit" } }) || ""),
  "Ein Abbruch durch die Zeitgrenze muss als solcher benannt werden");
pruefe(T.warumNichtGenug({ ist_grundriss: true, raeume: [] }) !== null,
  "Ein Grundriss ohne einen einzigen Raum ist kein Ergebnis");
pruefe(T.warumNichtGenug({ ist_grundriss: false, raeume: [] }) === null,
  "Eine Ansicht ohne Raeume ist ein gueltiges Ergebnis und darf nichts ausloesen");
pruefe(T.warumNichtGenug({ ist_grundriss: true, raeume: [{}, {}] }) === null,
  "Eine vollstaendige Raumliste darf keine Rettung ausloesen");

/* =========================================================================
 * 2  Wiederholen nur, wo es hilft
 * ====================================================================== */
pruefe(T.aussichtslos("Die Antwort ist an der Längengrenze abgeschnitten") === true,
  "Die Laengengrenze ist deterministisch, dort darf nicht wiederholt werden");
pruefe(T.aussichtslos("Der hinterlegte Schlüssel wird abgelehnt") === true,
  "Ein abgelehnter Schluessel wird beim zweiten Mal auch abgelehnt");
pruefe(T.aussichtslos("Der Ausleseendpunkt ist nicht erreichbar") === false,
  "Ein Netzfehler kann voruebergehend sein, dort wird wiederholt");
pruefe(T.aussichtslos("Die Antwort war unleserlich.") === false,
  "Ein abgerissener Datenstrom kann voruebergehend sein");
/* Der Wortlaut des HEUTE VERTEILTEN Endpunkts ohne Kennungen. GEMESSEN am
   24.08.2026 am Live-Endpunkt: Feld 2 des Bogens "BV 2-0887 Ziolkowski"
   scheiterte mit genau dieser Meldung deterministisch — und wurde trotzdem
   ein zweites Mal bezahlt. */
pruefe(T.aussichtslos("Das Modell hat die vorgegebene Struktur nicht bedient "
  + "(Abbruchgrund: max_tokens). Es kam überhaupt nichts zurück.") === true,
  "Der Alt-Wortlaut 'Abbruchgrund: max_tokens' ist deterministisch");
pruefe(T.aussichtslos("Das Modell hat die vorgegebene Struktur nicht bedient "
  + "(Abbruchgrund: zeit). Es kam überhaupt nichts zurück.") === false,
  "Ein Zeit-Abbruch ist NICHT deterministisch und darf wiederholt werden");
/* Das aufgebrauchte Kontingent des Hosters. GEMESSEN am 22.08.2026: Netlify
   antwortete mit 503 und {"error":"usage_exceeded"}. Wiederholen hilft dort
   nicht und kostet nur Wartezeit. */
{
  const e = new Error("Der Ausleseendpunkt ist stillgelegt, weil das Kontingent "
    + "des Hosters aufgebraucht ist.");
  e.aussichtslos = true;
  pruefe(T.aussichtslos(e) === true,
    "Ein aufgebrauchtes Kontingent darf nicht wiederholt werden");
}

/* Der Wiederholversuch selbst. MODUL_KI wird ersetzt, es faellt kein Netz an. */
(async function () {
  const echt = fenster.MODUL_KI;
  /* Weiter unten wird MODUL_KI durch eine Attrappe ersetzt. Das echte Modul
     wird hier festgehalten, damit sein Netzweg trotzdem geprueft werden kann. */
  fenster.MODUL_KI_ECHT = echt;
  T.App.auslese = { kosten: 0, abbrechen: false };

  // a) Ein voruebergehender Fehlschlag wird selbst wiederholt.
  let rufe = 0;
  fenster.MODUL_KI = {
    konfiguriert() { return true; },
    auslesenBild() {
      rufe++;
      if (rufe === 1) return Promise.reject(new Error("Der Ausleseendpunkt ist nicht erreichbar."));
      return Promise.resolve({ ist_grundriss: true, raeume: [{ bezeichnung: "Bad" }],
        _verbrauch: { eingabe_token: 1000, ausgabe_token: 100 } });
    },
  };
  const vermerke = [];
  const r = await T.leseVersuch("BILD", "raeume", vermerke, "die Raumliste");
  pruefe(rufe === 2, "Ein voruebergehender Fehlschlag muss selbst wiederholt werden, Rufe: " + rufe);
  pruefe((r.raeume || []).length === 1, "Der zweite Anlauf muss das Ergebnis liefern");
  pruefe(vermerke.length === 1 && /erste Anlauf/.test(vermerke[0]),
    "Der Kollege muss erfahren, dass wiederholt wurde: " + JSON.stringify(vermerke));
  pruefe(T.App.auslese.kosten > 0, "Der Verbrauch muss mitgezaehlt werden");

  // b) Ein deterministischer Fehlschlag wird NICHT wiederholt.
  rufe = 0;
  fenster.MODUL_KI.auslesenBild = function () {
    rufe++;
    return Promise.reject(new Error("Die Antwort ist an der Längengrenze abgeschnitten."));
  };
  const v2 = [];
  let geworfen = null;
  try { await T.leseVersuch("BILD", "raeume", v2, "die Raumliste"); }
  catch (e) { geworfen = e; }
  pruefe(rufe === 1, "An der Laengengrenze darf NICHT wiederholt werden, Rufe: " + rufe);
  pruefe(!!geworfen, "Der Fehlschlag muss weitergereicht werden");

  // b2) Eine leere Antwort ist kein Ergebnis -- und einen zweiten Anlauf wert.
  //     GEMESSEN: das Modell bedient die vorgegebene Struktur nicht immer.
  rufe = 0;
  fenster.MODUL_KI.auslesenBild = function () {
    rufe++;
    if (rufe === 1) return Promise.resolve({});
    return Promise.resolve({ ist_grundriss: true,
      raeume: [{ bezeichnung: "Küche" }], _verbrauch: {} });
  };
  const v2b = [];
  const rb = await T.leseVersuch("BILD", "raeume", v2b, "die Raumliste");
  pruefe(rufe === 2, "Eine leere Antwort muss einen zweiten Anlauf ausloesen, Rufe: " + rufe);
  pruefe((rb.raeume || []).length === 1, "Der zweite Anlauf muss das Ergebnis liefern");
  pruefe(v2b.some(function (t) { return /nichts/.test(t); }),
    "Der Kollege muss erfahren, dass der erste Anlauf leer war: " + JSON.stringify(v2b));

  // c) Ein fehlender Zugangscode bricht sofort ab, ohne zweiten Aufruf.
  rufe = 0;
  fenster.MODUL_KI.auslesenBild = function () {
    rufe++;
    const e = new Error("Für die Planauslese fehlt der Zugangscode.");
    e.codeFehlt = true;
    return Promise.reject(e);
  };
  try { await T.leseVersuch("BILD", "raeume", [], "die Raumliste"); } catch (e) {}
  pruefe(rufe === 1, "Ohne Zugangscode darf nicht wiederholt werden, Rufe: " + rufe);

  /* =======================================================================
   * 3  Feldweise lesen, ohne einen Raum zu verlieren
   * ==================================================================== */
  /* Der echte Fall: das Dachgeschoss des Bogens "Dumach 1" hat ZWEI Studios
     von je 45,96 m². Ein erster Anlauf strich gleich aussehende Zeilen beim
     Zusammenfuegen und verlor damit einen echten Raum. */
  const felder = [{ x: 0, y: 0, x2: 1, y2: 0.4 }, { x: 0, y: 0.4, x2: 1, y2: 1 }];
  const antworten = [
    { ist_grundriss: true, raeume: [
      { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 },
      { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 }],
      massstab: { angaben: [], masszahlen: [] }, _verbrauch: {} },
    { ist_grundriss: true, raeume: [{ bezeichnung: "Bad", geschoss: "DG", flaeche_m2: 9.0 }],
      massstab: { angaben: [{ nenner: 100 }], masszahlen: [] }, _verbrauch: {} },
  ];
  let nr = 0;
  fenster.MODUL_KI.auslesenBild = function () {
    return Promise.resolve(antworten[nr++]);
  };
  const seiteAttrappe = {
    bezeichnung: "Prüfbogen", name: "Prüfbogen",
    breite_mm: 594, hoehe_mm: 841,
    rendern(o) {
      return Promise.resolve({ canvas: knoten("canvas"),
        breite: 1000, hoehe: 1400, ausschnittGemalt: !!(o && o.ausschnitt) });
    },
  };
  const v3 = [];
  const zerlegt = await T.feldweiseLesen(seiteAttrappe, felder, v3);
  pruefe(zerlegt.raeume.length === 3,
    "Aus zwei Feldern mit 2 + 1 Raeumen muessen 3 Raeume werden, es sind "
      + zerlegt.raeume.length);
  pruefe(zerlegt.raeume.filter(function (r) { return r.bezeichnung === "Studio"; }).length === 2,
    "Zwei gleich grosse Studios sind zwei Raeume, nicht einer");
  pruefe(v3.some(function (t) { return /Gleich aussehende Räume/.test(t); }),
    "Doppelt aussehende Raeume muessen gemeldet werden: " + JSON.stringify(v3));
  pruefe(zerlegt.kopf && (zerlegt.kopf.massstab.angaben || []).length === 1,
    "Der Massstab muss aus dem Feld kommen, in dem er steht");

  // Ein Feld, das nicht lesbar ist, darf die uebrigen nicht mitreissen.
  // Seit die Felder GLEICHZEITIG durch den Planer laufen, ist die
  // Aufruf-Reihenfolge keine Kennung mehr: das kaputte Feld wird am BILD
  // erkannt (die Attrappe praegt dem Zeichenblock den Ausschnitt ein), und
  // es scheitert bei JEDEM Anlauf -- auch beim Wiederholversuch.
  nr = 0;
  const seiteMarkiert = {
    bezeichnung: "Prüfbogen", name: "Prüfbogen",
    breite_mm: 594, hoehe_mm: 841,
    rendern(o) {
      const c = knoten("canvas");
      c.feldTag = (o && o.ausschnitt && o.ausschnitt.y === 0) ? "-F1" : "-F2";
      return Promise.resolve({ canvas: c, breite: 1000, hoehe: 1400,
        ausschnittGemalt: !!(o && o.ausschnitt) });
    },
  };
  fenster.MODUL_KI.auslesenBild = function (b64) {
    if (/-F1/.test(String(b64))) {
      return Promise.reject(new Error("Die Antwort war unleserlich."));
    }
    return Promise.resolve({ ist_grundriss: true,
      raeume: [{ bezeichnung: "Flur", flaeche_m2: 5 }], _verbrauch: {} });
  };
  const v4 = [];
  const teil = await T.feldweiseLesen(seiteMarkiert, felder, v4);
  pruefe(teil.raeume.length === 1,
    "Ein unlesbares Feld darf die uebrigen nicht mitreissen, Raeume: " + teil.raeume.length);
  pruefe(v4.some(function (t) { return /Feld 1 ließ sich nicht lesen/.test(t); }),
    "Das gescheiterte Feld muss benannt werden: " + JSON.stringify(v4));

  /* =======================================================================
   * 4  Kein zweiter Zuschnitt aus einem schon zugeschnittenen Bild
   * ====================================================================
   * DER FEHLER, DER DAS NOETIG MACHT: der Renderer meldete faelschlich
   * ausschnittGemalt false, das Werkzeug schnitt daraufhin denselben Anteil
   * ein zweites Mal heraus, und am Bogen "Dumach 1" kamen statt 25 nur 7
   * Raeume an -- ohne jede Fehlermeldung. */
  {
    const s = {
      breite_mm: 594, hoehe_mm: 841,
      rendern() {
        // Renderer hat den Ausschnitt gemalt und sagt es auch.
        return Promise.resolve({ canvas: knoten("canvas"), breite: 1000, hoehe: 2000,
          ausschnittGemalt: true });
      },
    };
    alleZeichenblaetter.length = 0;
    await T.seiteAlsBild(s, { x: 0.2, y: 0.1, x2: 0.6, y2: 0.9 });
    const arg = (alleZeichenblaetter[alleZeichenblaetter.length - 1].gemalt || [])[0];
    pruefe(arg && arg[0] === 0 && arg[1] === 0 && arg[2] === 1000 && arg[3] === 2000,
      "Ein schon gemalter Ausschnitt darf nicht noch einmal geschnitten werden, "
        + "Quellrechteck: " + JSON.stringify(arg));
  }
  {
    /* Und die Gegenprobe: meldet der Renderer die Kennzeichnung NICHT, das
       Seitenverhaeltnis verraet den Zuschnitt aber, wird trotzdem nicht noch
       einmal geschnitten. */
    const a = { x: 0.2, y: 0.1, x2: 0.6, y2: 0.9 };
    // 594 x 841 mm, Ausschnitt 0,4 x 0,8 -> 237,6 x 672,8 mm -> Verhaeltnis 0,353
    const s = {
      breite_mm: 594, hoehe_mm: 841,
      rendern() {
        return Promise.resolve({ canvas: knoten("canvas"), breite: 909, hoehe: 2576 });
      },
    };
    alleZeichenblaetter.length = 0;
    await T.seiteAlsBild(s, a);
    const arg = (alleZeichenblaetter[alleZeichenblaetter.length - 1].gemalt || [])[0];
    pruefe(arg && arg[0] === 0 && arg[1] === 0,
      "Das Seitenverhaeltnis muss den schon erfolgten Zuschnitt verraten, "
        + "Quellrechteck: " + JSON.stringify(arg));
  }
  {
    /* Eine Bilddatei kann den Ausschnitt nicht selbst malen. Dort MUSS
       geschnitten werden, sonst geht der ganze Gewinn verloren. */
    const s = {
      breite_px: 2000, hoehe_px: 1000,
      rendern() {
        return Promise.resolve({ canvas: knoten("canvas"), breite: 2000, hoehe: 1000 });
      },
    };
    alleZeichenblaetter.length = 0;
    await T.seiteAlsBild(s, { x: 0.5, y: 0, x2: 1, y2: 1 });
    const arg = (alleZeichenblaetter[alleZeichenblaetter.length - 1].gemalt || [])[0];
    pruefe(arg && arg[0] === 1000 && arg[2] === 1000,
      "Eine Bilddatei muss hier zugeschnitten werden, Quellrechteck: "
        + JSON.stringify(arg));
  }

  /* =======================================================================
   * 5  Was das Werkzeug VOR dem Klick ueber ein Blatt weiss
   * ==================================================================== */
  pruefe(T.ertragErwartung({ blattkopf: { blattart: "ansicht" } }).gruppe === "kopf",
    "Eine Ansicht kann keine Raeume bringen, und das steht im Schriftfeld");
  pruefe(T.ertragErwartung({ blattkopf: { blattart: "lageplan" } }).gruppe === "kopf",
    "Ein Lageplan kann keine Raeume bringen");
  /* "schnitt" darf KEIN Ausschluss sein. Der echte Erdgeschossplan
     "4.1.1.8 BT 2_3_4 - EG" traegt die Beschriftung "SCHNITT H"; das ist eine
     Schnittlinie im Grundriss. Wer daraus "keine Raeume" macht, verliert ein
     ganzes Blatt, und niemand sieht es. */
  pruefe(T.ertragErwartung({ blattkopf: { blattart: "schnitt" } }).gruppe === "raeume",
    "Das Wort Schnitt allein darf ein Blatt nicht von den Raeumen ausschliessen");
  pruefe(/nur eine Schnittlinie/.test(
    T.ertragErwartung({ blattkopf: { blattart: "schnitt" } }).text),
    "Der Kollege muss lesen, dass das Wort mehrdeutig ist");
  pruefe(T.ertragErwartung({ blattkopf: { blattart: "grundriss" } }).gruppe === "raeume",
    "Ein Grundriss kann Raeume bringen");
  pruefe(T.ertragErwartung({ blattkopf: {} }).gruppe === "raeume",
    "Steht nichts im Schriftfeld, wird es versucht");
  pruefe(T.ertragErwartung({ typ: "textseite", blattkopf: {} }).gruppe === "kopf",
    "Eine Textseite traegt keine Zeichnung");
  pruefe(/Ansicht laut Schriftfeld/.test(
    T.ertragErwartung({ blattkopf: { blattart: "ansicht" } }).text),
    "Der Kollege muss lesen koennen, WORAUS das Werkzeug das schliesst");

  /* =======================================================================
   * 4b  Was der Hoster meldet, wenn das Kontingent aufgebraucht ist
   * ====================================================================
   * GEMESSEN am 22.08.2026, mitten in der Pruefung: Netlify legte das ganze
   * Projekt still und antwortete mit Status 503 und dem Koerper
   * {"error":"usage_exceeded","message":"Usage exceeded"}. Das ist gueltiges
   * JSON ohne Feld "fehler" und lief deshalb glatt durch die Auswertung; der
   * Kollege las am Ende "Der Ausleseendpunkt hat fuer dieses Blatt nichts
   * zurueckgegeben" und haette am Plan gesucht, waehrend in Wahrheit die
   * Rechnung des Hosters offen war. */
  {
    const echtesFetch = fenster.fetch;
    fenster.localStorage.setItem("werke_hl_endpunkt",
      JSON.stringify({ url: "https://pruefung.invalid/x", code: "PRUEF-CODE-NICHT-ECHT" }));
    fenster.fetch = async function () {
      return new Response(JSON.stringify(
        { error: "usage_exceeded", message: "Usage exceeded" }),
        { status: 503, headers: { "content-type": "application/json" } });
    };
    let e1 = null;
    try { await fenster.MODUL_KI_ECHT.auslesenBild("AAAA", "", "raeume"); }
    catch (e) { e1 = e; }
    pruefe(!!e1 && /Kontingent/.test(e1.message),
      "Ein aufgebrauchtes Kontingent muss beim Namen genannt werden: "
        + (e1 && e1.message));
    pruefe(!!e1 && e1.aussichtslos === true,
      "Und es muss als aussichtslos gekennzeichnet sein, sonst wird wiederholt");

    fenster.fetch = async function () {
      return new Response("<html>Bad gateway</html>", { status: 502 });
    };
    let e2 = null;
    try { await fenster.MODUL_KI_ECHT.auslesenBild("AAAA", "", "raeume"); }
    catch (e) { e2 = e; }
    pruefe(!!e2 && /502/.test(e2.message),
      "Ein unbekannter Fehlschlag muss wenigstens seinen Status nennen: "
        + (e2 && e2.message));
    pruefe(!!e2 && e2.aussichtslos !== true,
      "Ein unbekannter Fehlschlag ist NICHT aussichtslos, dort wird wiederholt");
    fenster.fetch = echtesFetch;
  }

  /* =======================================================================
   * 5b  Eine Warnung, die grundlos kommt, wird ueberlesen
   * ====================================================================
   * GEMESSEN: der dritte Durchgang ("kunde") laeuft regelmaessig in seine
   * Grenze. Bisher stand danach im Kontrollblatt, die AUSLESE sei
   * abgeschnitten und man moege am Plan nachzaehlen, ob Raeume fehlen -- bei
   * drei von vier Blaettern, deren Raumliste vollstaendig war. */
  {
    T.App.p = T.leeresProjekt();
    const s = { bezeichnung: "Prüfblatt" };
    fenster.__pruefAbschnitt(s, "kunde", { grund: "max_tokens", raeume: null });
    const fragen = T.App.p.offeneFragen || [];
    pruefe(fragen.length === 1, "Ein abgeschnittener Zusatzdurchgang gehoert vermerkt");
    pruefe(!/Raumliste ist/.test(fragen[0].frage),
      "Er darf NICHT behaupten, die Raumliste sei unvollstaendig: " + fragen[0].frage);
    pruefe(/RAUMLISTE ist davon nicht betroffen/.test(fragen[0].frage),
      "Er muss ausdruecklich sagen, dass die Raumliste steht: " + fragen[0].frage);

    T.App.p = T.leeresProjekt();
    fenster.__pruefAbschnitt(s, "raeume", { grund: "max_tokens", raeume: 7 });
    const f2 = (T.App.p.offeneFragen || [])[0];
    pruefe(f2 && /Raumliste/.test(f2.frage) && /7 Räume/.test(f2.frage),
      "Eine abgeschnittene Raumliste muss mit Zahl benannt werden: "
        + (f2 && f2.frage));
  }

  /* =======================================================================
   * 6  Doppelte erkennen, ohne zu streichen
   * ==================================================================== */
  pruefe(T.doppelteRaeume([
    { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 },
    { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 }]).length === 1,
    "Zwei gleiche Zeilen muessen als Doppelte gemeldet werden");
  pruefe(T.doppelteRaeume([
    { bezeichnung: "HWR", geschoss: "EG", flaeche_m2: 1.83 },
    { bezeichnung: "HWR", geschoss: "OG", flaeche_m2: 1.83 }]).length === 0,
    "Gleiche Raeume in verschiedenen Geschossen sind keine Doppelten");
  pruefe(T.doppelteRaeume([
    { bezeichnung: "", geschoss: "", flaeche_m2: null },
    { bezeichnung: "", geschoss: "", flaeche_m2: null }]).length === 0,
    "Unbeschriftete Raeume ohne Flaeche erlauben kein Urteil");

  /* =======================================================================
   * 7  Null Raeume ist nie ein stilles Ergebnis
   * ====================================================================
   * MEHRFACH BEIM KUNDEN: ein echter Grundriss kam mit ist_grundriss=false
   * und null Raeumen zurueck und fiel STILL aus der Rechnung. Der Beleg,
   * dass das Blatt ein Grundriss ist, kommt von AUSSERHALB des Modells. */
  pruefe(!!T.blattWirktGrundriss({ blattkopf: { blattart: "grundriss" } }),
    "Ein Blattkopf 'grundriss' ist ein Beleg");
  pruefe(T.blattWirktGrundriss({ blattkopf: { blattart: "ansicht" } }) === null,
    "Ein Blattkopf 'ansicht' wird NICHT umgedeutet");
  pruefe(!!T.blattWirktGrundriss({ bezeichnung: "Grundriss EG M 1-100.pdf" }),
    "Der Dateiname 'Grundriss EG' ist ein Beleg");
  pruefe(!!T.blattWirktGrundriss({ bezeichnung: "3_BA 1_Erdgeschoss.pdf" }),
    "Auch 'Erdgeschoss' im Namen ist ein Beleg");
  pruefe(T.blattWirktGrundriss({ bezeichnung: "Ansicht Nord.pdf" }) === null,
    "Eine Ansicht ohne Grundriss-Beleg bleibt eine Ansicht");
  pruefe(T.blattWirktGrundriss({ bezeichnung: "Werkverzeichnung S. 2" }) === null,
    "Ohne jeden Beleg wird nichts behauptet");

  /* =======================================================================
   * 8  Die Gegenprobe repariert: gezielte Nachlesung des fehlenden Feldes
   * ====================================================================
   * DER FALL DES KUNDEN: das Erdgeschoss kam nicht ins Raumbuch. Die
   * Gegenprobe hat seine sechs Raumnamen gezaehlt; das Werkzeug muss das
   * betroffene Feld selbst nachlesen, die Namen als Suchliste mitgeben und
   * NUR die fehlenden Raeume uebernehmen -- gekennzeichnet, nichts
   * Bestehendes ueberschrieben. Ebenen und Namen stammen aus dem echten
   * aufgezeichneten Lauf (validierung/echtlauf/ziolkowski_auslese2.json). */
  {
    T.App.auslese = { kosten: 0, abbrechen: false };
    T.App.p = T.leeresProjekt();
    const egNamen = ["GAST / ARBEITEN", "WC", "DIELE", "KOCHEN", "ESSEN", "WOHNEN"];
    const seite8 = {
      bezeichnung: "BV 2-0887 Ziolkowski, Seite 1",
      breite_mm: 420, hoehe_mm: 297,
      felder: [{ x: 0, y: 0, x2: 0.33, y2: 1 }, { x: 0.33, y: 0, x2: 0.66, y2: 1 },
               { x: 0.66, y: 0, x2: 1, y2: 1 }],
      gegenprobeEbenen: [
        { ebene: "GRUNDRISS KELLERGESCHOSS", n: 2, namen: ["KELLER", "FLUR"] },
        { ebene: "GRUNDRISS ERDGESCHOSS", n: 6, namen: egNamen },
        { ebene: "GRUNDRISS OBERGESCHOSS", n: 5,
          namen: ["SCHLAFEN", "BADEN", "FLUR", "KIND I", "KIND II"] },
      ],
      rendern(o) {
        return Promise.resolve({ canvas: knoten("canvas"),
          breite: 1000, hoehe: 700, ausschnittGemalt: !!(o && o.ausschnitt) });
      },
    };
    const ohneEg = ["KELLER", "FLUR", "SCHLAFEN", "BADEN", "FLUR", "KIND I",
                    "KIND II"].map(function (nm) {
      return { bezeichnung: nm, flaeche_m2: 10 };
    });
    let rufe8 = 0, hinweis8 = "";
    fenster.MODUL_KI = {
      konfiguriert() { return true; },
      istRaumname() { return true; },
      auslesenBild(b64, hinweis) {
        rufe8++;
        hinweis8 = hinweis || "";
        /* Die Nachlesung liefert die sechs EG-Raeume UND zwei, die nicht in
           der Suchliste stehen (KELLER steht schon im Raumbuch, TERRASSE ist
           kein Raum): beide duerfen NICHT dazukommen. */
        return Promise.resolve({ ist_grundriss: true, _verbrauch: {},
          raeume: egNamen.map(function (nm) {
            return { bezeichnung: nm, geschoss: "EG", flaeche_m2: 12 };
          }).concat([{ bezeichnung: "KELLER", geschoss: "KG", flaeche_m2: 30 },
                     { bezeichnung: "TERRASSE", geschoss: "EG", flaeche_m2: 20 }]) });
      },
    };
    const v8 = [];
    const r8 = await T.gegenprobeNachlesen(seite8,
      { ist_grundriss: true, raeume: ohneEg }, {}, v8);
    pruefe(rufe8 === 1,
      "GENAU EINE gezielte Nachlesung fuer das fehlende EG, Rufe: " + rufe8);
    pruefe(/WOHNEN/.test(hinweis8) && /ERDGESCHOSS/.test(hinweis8),
      "Die gezaehlten Namen muessen als Suchliste im Auftrag stehen: " + hinweis8);
    pruefe((r8.raeume || []).length === 13,
      "7 + 6 fehlende EG-Raeume muessen 13 ergeben, es sind "
        + (r8.raeume || []).length);
    pruefe(!r8.raeume.some(function (x) { return x.bezeichnung === "TERRASSE"; }),
      "Was nicht in der Suchliste steht, kommt nicht dazu");
    pruefe(r8.raeume.filter(function (x) { return x.bezeichnung === "KELLER"; }).length === 1,
      "Ein schon vorhandener Raum wird nicht doppelt angelegt");
    const neu8 = r8.raeume.find(function (x) { return x.bezeichnung === "WOHNEN"; });
    pruefe(!!(neu8 && neu8.konsens && neu8.konsens.lesungen === 1),
      "Nachgelesene Raeume sind als 'aus einer Lesung' gekennzeichnet");
    pruefe(v8.some(function (t) { return /Nachlesung brachte 6 von 6/.test(t); }),
      "Der Kollege muss lesen, was die Nachlesung brachte: " + JSON.stringify(v8));
    pruefe(seite8.nachgelesen === 1, "Die Reparatur steht an der Seite");

    /* Vollstaendiges Raumbuch: KEINE Nachlesung, KEIN Aufruf. */
    rufe8 = 0;
    const komplett = ohneEg.concat(egNamen.map(function (nm) {
      return { bezeichnung: nm, flaeche_m2: 12 };
    }));
    const r8b = await T.gegenprobeNachlesen(seite8,
      { ist_grundriss: true, raeume: komplett }, {}, []);
    pruefe(rufe8 === 0, "An einem vollstaendigen Raumbuch wird NICHT nachgelesen");
    pruefe((r8b.raeume || []).length === 13, "und nichts veraendert");

    /* Erreichter Kosten-Deckel: keine Nachlesung, aber eine OFFENE FRAGE --
       nie ein leeres Geschoss ohne Meldung. */
    T.App.auslese = { kosten: 99, abbrechen: false };
    T.App.p = T.leeresProjekt();
    rufe8 = 0;
    const v8c = [];
    const r8c = await T.gegenprobeNachlesen(seite8,
      { ist_grundriss: true, raeume: ohneEg.slice() }, {}, v8c);
    pruefe(rufe8 === 0, "Bei erreichtem Deckel wird nicht nachgelesen");
    pruefe((T.App.p.offeneFragen || []).some(function (x) {
      return /fehlen/.test(x.frage) && /WOHNEN/.test(x.frage);
    }), "aber die fehlenden Raeume stehen als offene Frage da: "
      + JSON.stringify(T.App.p.offeneFragen));
    pruefe((r8c.raeume || []).length === ohneEg.length, "und nichts wird erfunden");

    /* Erfolglose Nachlesung: offene Frage statt stillem Ende. */
    T.App.auslese = { kosten: 0, abbrechen: false };
    T.App.p = T.leeresProjekt();
    fenster.MODUL_KI.auslesenBild = function () {
      return Promise.resolve({ ist_grundriss: false, raeume: [], _verbrauch: {} });
    };
    const v8d = [];
    await T.gegenprobeNachlesen(seite8,
      { ist_grundriss: true, raeume: ohneEg.slice() }, {}, v8d);
    pruefe((T.App.p.offeneFragen || []).some(function (x) {
      return /Nachlesung/.test(x.frage);
    }), "Eine erfolglose Nachlesung hinterlaesst eine offene Frage");
    pruefe(T.nachlesungImBudget() === true, "Deckel-Waechter: unter 2 $ ist Budget da");
    T.App.auslese.kosten = 2.5;
    pruefe(T.nachlesungImBudget() === false, "ueber dem Deckel nicht mehr");
    T.App.auslese = { kosten: 0, abbrechen: false };
  }

  /* =======================================================================
   * 9  DER ERZWUNGENE ALTE FEHLER: "zu gross" wird zum Ergebnis
   * ====================================================================
   * Nachgestellt wird die Messung vom 24.08.2026 (grosses Blatt, kleine
   * Grenze): der ganze Bogen scheitert an der Laengengrenze, der Endpunkt
   * kann nichts retten und meldet die Kennung "laengengrenze". Frueher stand
   * danach die Meldung "bitte in zwei Haelften ablegen" -- ein Arbeitsauftrag
   * an den MENSCHEN. Jetzt zerlegt das Werkzeug selbst: zwei ueberlappende
   * Haelften, die Dublette an der Schnittkante entdoppelt, und am Ende steht
   * ein Ergebnis statt einer Meldung. */
  {
    T.App.auslese = { kosten: 0, abbrechen: false, budgetFreigabe: null,
                      gesamt: 1, fertig: 0 };
    let ruf9 = 0;
    fenster.MODUL_KI.auslesenBild = function (b64, hinweis, modus) {
      if (modus !== "raeume") return Promise.resolve({});
      ruf9++;
      if (ruf9 === 1) {
        /* Der ganze Bogen: deterministisch zu umfangreich, nichts gerettet. */
        const e = new Error("Die Antwort ist an der Längengrenze abgeschnitten "
          + "und ließ sich nicht mehr auswerten. Ein zweiter Versuch ändert "
          + "daran nichts. Das Blatt ist für einen Durchgang zu umfangreich; "
          + "es muss in Teilen gelesen werden.");
        e.kennung = "laengengrenze";
        return Promise.reject(e);
      }
      if (ruf9 === 2) {
        return Promise.resolve({ ist_grundriss: true, raeume: [
          { bezeichnung: "Wohnen", geschoss: "EG", flaeche_m2: 24.5 },
          { bezeichnung: "Küche", geschoss: "EG", flaeche_m2: 12.0 },
          { bezeichnung: "Flur", geschoss: "EG", flaeche_m2: 6.1 }],
          _verbrauch: { eingabe_token: 9000, ausgabe_token: 800 } });
      }
      return Promise.resolve({ ist_grundriss: true, raeume: [
        { bezeichnung: "Flur", geschoss: "EG", flaeche_m2: 6.1 },
        { bezeichnung: "Bad", geschoss: "EG", flaeche_m2: 8.4 },
        { bezeichnung: "Schlafen", geschoss: "EG", flaeche_m2: 16.2 }],
        massstab: { angaben: [{ nenner: 100 }], masszahlen: [] },
        _verbrauch: { eingabe_token: 9000, ausgabe_token: 700 } });
    };
    const v9 = [];
    const t9 = await T.teilLesen(seiteAttrappe, { x: 0, y: 0, x2: 1, y2: 1 },
      v9, "das Blatt", "", 0);
    pruefe(!!t9 && (t9.raeume || []).length === 5,
      "Aus 3 + 3 Raeumen mit einer Dublette an der Schnittkante muessen 5 "
        + "werden, sind: " + (t9 ? (t9.raeume || []).length : "kein Ergebnis"));
    pruefe(ruf9 === 3,
      "Genau drei Aufrufe (Bogen + zwei Haelften), keine blinde Wiederholung "
        + "der Laengengrenze: " + ruf9);
    pruefe(!!t9 && t9.ist_grundriss === true && !t9._abgeschnitten,
      "Das zusammengesetzte Ergebnis ist vollstaendig, nicht abgeschnitten");
    pruefe(!!t9 && !!t9.massstab,
      "Der Massstab kommt aus der Haelfte, in der er steht");
    pruefe(v9.some(function (t) { return /überlappenden Hälften/.test(t); }),
      "Der Vermerk sagt, dass selbst zerlegt wurde: " + JSON.stringify(v9));
    pruefe(v9.some(function (t) { return /Schnittkante/.test(t); }),
      "Die Dublette an der Schnittkante wird benannt");
    pruefe(!v9.some(function (t) { return /Hälften ablegen|einzeln ablegen/.test(t); }),
      "Kein Arbeitsauftrag mehr an den Menschen: " + JSON.stringify(v9));

    /* Die zwei Studios (echte Doppelte IN EINEM Teil) ueberleben die
       Entdopplung an der Schnittkante. */
    const vereint = T.haelftenVereinen([
      { ist_grundriss: true, raeume: [
        { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 },
        { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 }] },
      { ist_grundriss: true, raeume: [
        { bezeichnung: "Studio", geschoss: "DG", flaeche_m2: 45.96 },
        { bezeichnung: "Bad", geschoss: "DG", flaeche_m2: 9.0 }] }], []);
    pruefe(vereint.raeume.filter(function (r) {
      return r.bezeichnung === "Studio"; }).length === 2,
      "Zwei Studios im selben Teil bleiben zwei Raeume, die Wiederholung aus "
        + "der Ueberlappung faellt weg");

    /* GEMESSEN am 24.08.2026 am Live-Endpunkt (Messlauf, Feld 2 des Bogens
       "BV 2-0887 Ziolkowski" in Haelften): ein Raum auf der Schnittkante kam
       in der einen Haelfte MIT Flaechenstempel zurueck und in der anderen
       OHNE (der Stempel lag jenseits des Schnitts). Mit der Flaeche im
       Entdopplungs-Schluessel blieb die Dublette stehen — im Raumbuch
       standen 15 statt 13 Raeume. Behalten wird die Zeile MIT Flaeche. */
    const vereintKante = T.haelftenVereinen([
      { ist_grundriss: true, raeume: [
        { bezeichnung: "GAST / ARBEITEN", geschoss: "EG", flaeche_m2: 12.16 },
        { bezeichnung: "WC", geschoss: "EG", flaeche_m2: 2.17 }] },
      { ist_grundriss: true, raeume: [
        { bezeichnung: "GAST / ARBEITEN", geschoss: "EG", flaeche_m2: null },
        { bezeichnung: "WOHNEN", geschoss: "EG", flaeche_m2: 18.68 }] }], []);
    const gastZeilen = vereintKante.raeume.filter(function (r) {
      return r.bezeichnung === "GAST / ARBEITEN"; });
    pruefe(gastZeilen.length === 1,
      "Ein an der Schnittkante gekappter Flaechenstempel macht aus einem "
        + "Raum keine zwei: " + gastZeilen.length);
    pruefe(gastZeilen[0] && gastZeilen[0].flaeche_m2 === 12.16,
      "Behalten wird die Zeile MIT Flaeche, nicht die angeschnittene");
    pruefe(vereintKante.raeume.length === 3,
      "WC und WOHNEN bleiben stehen: " + vereintKante.raeume.length);

    /* Die eine Haelfte schreibt "KG", die andere "Kellergeschoss": dasselbe
       Geschoss, derselbe Raum — ein Schluessel, eine Zeile. */
    const vereintGeschoss = T.haelftenVereinen([
      { ist_grundriss: true, raeume: [
        { bezeichnung: "KELLER", geschoss: "KG", flaeche_m2: 17.99 }] },
      { ist_grundriss: true, raeume: [
        { bezeichnung: "KELLER", geschoss: "Kellergeschoss", flaeche_m2: null }] }], []);
    pruefe(vereintGeschoss.raeume.length === 1
        && vereintGeschoss.raeume[0].flaeche_m2 === 17.99,
      "KG und Kellergeschoss sind dasselbe Geschoss; die Zeile mit Flaeche "
        + "bleibt: " + JSON.stringify(vereintGeschoss.raeume));

    /* DAS SCHRIFTFELD KOMMT AUS ALLEN TEILEN ZUSAMMEN. GEMESSEN am
       24.08.2026 in echten Durchlaeufen an "BV 2-0887 Ziolkowski": die eine
       Haelfte trug die Aussenbemassung (Masszahlen) und wurde deshalb der
       "kopf", die andere das Schriftfeld mit dem Plandatum "17.05.2022" --
       und das Plandatum fiel weg. Ohne Plandatum kein angenommenes Baujahr,
       keine Bauteiltypen, 2,5 statt 6,9 kW. Jetzt wird "objekt" feldweise
       ueber alle Teile vereint; die Masszahlen-Haelfte bleibt kopf. */
    const vereintObjekt = T.haelftenVereinen([
      { ist_grundriss: true,
        massstab: { masszahlen: [{ wert_m: 8.0 }] },
        objekt: { bauvorhaben: null, plandatum: null, planungsart: "unklar" },
        raeume: [{ bezeichnung: "KELLER", geschoss: "KG", flaeche_m2: 17.99 }] },
      { ist_grundriss: true,
        objekt: { bauvorhaben: null, plandatum: "17.05.2022",
                  planungsart: "neubau" },
        raeume: [{ bezeichnung: "FLUR", geschoss: "KG", flaeche_m2: 21.2 }] }],
      []);
    pruefe(!!vereintObjekt.kopf && !!vereintObjekt.kopf.objekt
        && vereintObjekt.kopf.objekt.plandatum === "17.05.2022",
      "Das Plandatum der Schriftfeld-Haelfte ueberlebt die Kopf-Wahl nach "
        + "Masszahlen: " + JSON.stringify(vereintObjekt.kopf
          && vereintObjekt.kopf.objekt));
    pruefe(vereintObjekt.kopf.objekt.planungsart === "neubau",
      "\"unklar\" verdeckt die echte Planungsart nicht");
    pruefe(!!(vereintObjekt.kopf.massstab
        && (vereintObjekt.kopf.massstab.masszahlen || []).length),
      "Die Masszahlen-Haelfte bleibt der kopf");

    /* Die Haelften ueberlappen sich wirklich und teilen die lange Kante. */
    const h9 = T.haelftenVon(null);
    pruefe(h9.length === 2 && h9[0].y2 > h9[1].y && h9[0].y === 0
        && h9[1].y2 === 1,
      "Zwei Haelften mit Ueberlappung an der Schnittkante: "
        + JSON.stringify(h9));

    /* Der Budgetwaechter: ueber der Grenze wird GENAU EINMAL gefragt. */
    T.App.auslese = { kosten: 2.4, abbrechen: false, budgetFreigabe: null };
    let fragen9 = 0;
    const echteFragen = fenster.MODUL_DIALOG.fragen;
    fenster.MODUL_DIALOG.fragen = function (o) {
      fragen9++;
      pruefe(/\$/.test((o && o.text) || ""),
        "Die Budgetfrage traegt eine Kostenvorschau: "
          + JSON.stringify(o && o.text).slice(0, 120));
      return echteFragen(o);
    };
    const b1 = await T.budgetErlaubt(2);
    const b2 = await T.budgetErlaubt(3);
    pruefe(b1 === true && b2 === true,
      "Die Freigabe der Attrappe gilt fuer den ganzen Lauf");
    pruefe(fragen9 === 1,
      "Bei drohender Ueberschreitung wird GENAU EINMAL gefragt: " + fragen9);
    fenster.MODUL_DIALOG.fragen = echteFragen;
    T.App.auslese = { kosten: 0.4, abbrechen: false, budgetFreigabe: null };
    let fragen9b = 0;
    fenster.MODUL_DIALOG.fragen = function (o) { fragen9b++; return echteFragen(o); };
    pruefe((await T.budgetErlaubt(3)) === true && fragen9b === 0,
      "Unter der Grenze wird nicht gefragt");
    fenster.MODUL_DIALOG.fragen = echteFragen;
    T.App.auslese = { kosten: 0, abbrechen: false };
  }

  /* =======================================================================
   * 10  EIN BLATT, EIN AUFRUF JE DURCHGANG
   * ====================================================================
   * GEFUNDEN am 24.08.2026 beim Nachlesen der Parallel-Fassung: der geplante
   * Aufruf der Zusatzangaben (pKunde) lief, wurde bezahlt und nie abgeholt;
   * danach lief derselbe Durchgang ein ZWEITES Mal direkt. Jedes Blatt
   * bezahlte die Zusatzangaben doppelt, am Budgetwaechter vorbei -- und
   * kein Test fuhr blattAuswerten je durch. Dieser hier zaehlt die Aufrufe
   * je Betriebsart an einem gewoehnlichen Blatt. */
  {
    T.App.p = T.leeresProjekt();
    T.App.auslese = { laeuft: true, gesamt: 1, fertig: 0, kosten: 0,
      budgetFreigabe: null, aufrufe: 0, aufrufeFertig: 0,
      aktiv: [], laufendeSeiten: [], abbrechen: false, was: "" };
    const rufe10 = {};
    fenster.MODUL_KI.auslesenBild = function (b64, hinweis, modus) {
      rufe10[modus] = (rufe10[modus] || 0) + 1;
      if (modus === "raeume") {
        return Promise.resolve({ ist_grundriss: true, raeume: [
          { bezeichnung: "Wohnen", geschoss: "EG", flaeche_m2: 24.5 },
          { bezeichnung: "Bad", geschoss: "EG", flaeche_m2: 8.0 }],
          _verbrauch: { eingabe_token: 9000, ausgabe_token: 900 } });
      }
      if (modus === "gegenprobe") {
        return Promise.resolve({ _verbrauch: { eingabe_token: 8000,
          ausgabe_token: 300 } });
      }
      return Promise.resolve({ befunde: [], gebaeude: {},
        _verbrauch: { eingabe_token: 9000, ausgabe_token: 400 } });
    };
    const fehler10 = [];
    const seite10 = { bezeichnung: "Blatt 10", name: "Blatt 10",
      breite_mm: 420, hoehe_mm: 297,
      rendern() { return Promise.resolve({ canvas: knoten("canvas"),
        breite: 1000, hoehe: 700 }); } };
    await T.blattAuswerten(seite10, [seite10], 0, 1, fehler10);
    pruefe(rufe10.raeume === 1,
      "Die Raumliste laeuft genau einmal: " + JSON.stringify(rufe10));
    pruefe(rufe10.gegenprobe === 1,
      "Die Gegenprobe laeuft genau einmal: " + JSON.stringify(rufe10));
    pruefe(rufe10.kunde === 1,
      "Die Zusatzangaben laufen GENAU EINMAL je Blatt -- der geplante Aufruf "
        + "wird abgeholt statt doppelt bezahlt: " + JSON.stringify(rufe10));
    pruefe(!rufe10.hoehen,
      "Ohne Schnitt und ohne zweites Feld laeuft kein Hoehen-Durchgang");
    pruefe(seite10.ausgewertet === true
        && ((seite10.auslese || {}).raeume || []).length === 2,
      "Das Blatt gilt als ausgewertet und traegt beide Raeume");
    pruefe(fehler10.length === 0,
      "Der Durchlauf bleibt fehlerfrei: " + JSON.stringify(fehler10));
    T.App.auslese = { kosten: 0, abbrechen: false };
  }

  /* =======================================================================
   * 11  DIE WEICHEN: kein Aufruf, der nichts bringen kann
   * ====================================================================
   * GEMESSEN am 24.08.2026 am Live-Endpunkt: die Hoehen-Lesung lief per
   * Regel "zwei Zeichnungsfelder" auch auf dem reinen Grundriss-Bogen
   * "BV 2-0887 Ziolkowski" (12,7 s, 1328 Ausgabe-Token, leere Listen) und
   * per Regel "kein Grundriss" auf der Ansicht desselben Satzes (5,4 s);
   * die Zusatzangaben liefen auf JEDEM Blatt und rissen dreimal von
   * dreimal die 24-s-Frist. Die Weichen muessen beides abstellen, OHNE
   * einen echten Schnitt zu verlieren. */
  {
    const g = T.hoehenLesenGrund;
    const blattOhne = { bezeichnung: "Blatt 1", felder: [] };
    /* Der gemessene Fehlfall: reiner Grundriss-Bogen, zwei Felder, die
       Gegenprobe sieht drei gezeichnete Grundrisse -> KEINE Hoehen-Lesung. */
    pruefe(g({ bezeichnung: "BV 2-0887", felder: [{}, {}] },
      { ist_grundriss: true }, { blattart: "grundriss", ebenen: [
        { gezeichnet: true }, { gezeichnet: true }, { gezeichnet: true }] },
      null) === null,
      "Ein reiner Grundriss-Bogen bekommt keine Hoehen-Lesung mehr");
    /* Der zweite gemessene Fehlfall: die Ansicht. */
    pruefe(g(blattOhne, { ist_grundriss: false },
      { blattart: "ansicht", ebenen: [] }, null) === null,
      "Eine Ansicht laut Gegenprobe bekommt keine Hoehen-Lesung");
    pruefe(g(blattOhne, { ist_grundriss: false },
      { blattart: "tabelle", ebenen: [] }, null) === null,
      "Eine Tabelle bekommt keine Hoehen-Lesung");
    /* Was einen Schnitt BELEGT, muss weiter gelesen werden. */
    pruefe(!!g(blattOhne, { ist_grundriss: true }, { blattart: "grundriss" },
      "schnitt"), "Das Schriftfeld 'schnitt' erzwingt die Lesung");
    pruefe(!!g({ bezeichnung: "hi_schnitt-2", felder: [] },
      { ist_grundriss: true }, { blattart: "grundriss", ebenen: [] }, null),
      "Die Beschriftung 'hi_schnitt-2' (Maelzerstrasse) erzwingt die Lesung");
    pruefe(!!g(blattOhne, { ist_grundriss: false },
      { blattart: "schnitt", ebenen: [] }, null),
      "Das Urteil 'schnitt' der Gegenprobe erzwingt die Lesung");
    pruefe(!!g(blattOhne, { ist_grundriss: true },
      { blattart: "grundriss", ebenen: [{ gezeichnet: true },
        { gezeichnet: false }] }, null),
      "Benannte, nicht gezeichnete Ebenen (Schnitt) erzwingen die Lesung");
    pruefe(!!g({ bezeichnung: "Bogen", felder: [{}, {}] },
      { ist_grundriss: true }, { blattart: "grundriss",
        ebenen: [{ gezeichnet: true }] }, null),
      "Mehr Zeichnungsfelder als gezeichnete Grundrisse: eines kann ein "
        + "Schnitt sein, es wird gelesen");
    pruefe(!!g(blattOhne, { ist_grundriss: false },
      { blattart: "detail", ebenen: [] }, null),
      "Kann keine Lesung sagen, was das Blatt zeigt, wird vorsichtshalber "
        + "gelesen");
    /* Ohne Gegenprobe gilt die alte, vorsichtige Regel weiter. */
    pruefe(!!g(blattOhne, { ist_grundriss: false }, null, null),
      "Ohne Gegenprobe und ohne Grundriss wird weiter gelesen (alte Regel)");
    pruefe(g(blattOhne, { ist_grundriss: true }, null, null) === null,
      "Ohne Gegenprobe bleibt ein gewoehnlicher Grundriss ohne Hoehen-Lesung");
    pruefe(/Ansicht/.test(T.hoehenVerzichtsgrund({ blattart: "ansicht" }) || ""),
      "Der Verzichtsgrund nennt die Ansicht");

    /* Und im ganzen Durchlauf: eine Ansicht laut SCHRIFTFELD, deren
       Schriftfeld die Sichtung schon aus dem Textstand gelesen hat, kostet
       nur noch EINEN Aufruf (die Gegenprobe). */
    T.App.p = T.leeresProjekt();
    T.App.auslese = { laeuft: true, gesamt: 1, fertig: 0, kosten: 0,
      budgetFreigabe: null, aufrufe: 0, aufrufeFertig: 0,
      aktiv: [], laufendeSeiten: [], abbrechen: false, was: "" };
    const rufe11 = {};
    fenster.MODUL_KI.auslesenBild = function (b64, hinweis, modus) {
      rufe11[modus] = (rufe11[modus] || 0) + 1;
      if (modus === "gegenprobe") {
        return Promise.resolve({ blattart: "ansicht", raumnamen: [],
          ebenen: [], ansichten: [],
          _verbrauch: { eingabe_token: 8000, ausgabe_token: 200 } });
      }
      return Promise.resolve({ _verbrauch: {} });
    };
    const seite11 = { bezeichnung: "Ansicht Ost", name: "Ansicht Ost",
      breite_mm: 297, hoehe_mm: 210,
      blattkopf: { blattart: "ansicht" },
      objektangaben: { strasse: "Musterweg 1", plz: "33102", ort: null },
      rendern() { return Promise.resolve({ canvas: knoten("canvas"),
        breite: 1000, hoehe: 700 }); } };
    const fehler11 = [];
    await T.blattAuswerten(seite11, [seite11], 0, 1, fehler11);
    pruefe(!rufe11.raeume,
      "Ansicht laut Schriftfeld: keine Raumlesung. " + JSON.stringify(rufe11));
    pruefe(!rufe11.kunde,
      "Schriftfeld schon aus dem Textstand gelesen: keine Zusatzangaben-"
        + "Lesung. " + JSON.stringify(rufe11));
    pruefe(!rufe11.hoehen,
      "Eine Ansicht bekommt keine Hoehen-Lesung. " + JSON.stringify(rufe11));
    pruefe(rufe11.gegenprobe === 1,
      "Die Gegenprobe laeuft weiter (sie zaehlt die Fassade): "
        + JSON.stringify(rufe11));
    pruefe((seite11.vermerke || []).some(function (t) {
      return /Zusatzangaben-Lesung entfällt/.test(t);
    }), "Der Verzicht auf die Zusatzangaben steht am Blatt: "
      + JSON.stringify(seite11.vermerke));
    pruefe(fehler11.length === 0,
      "Der Durchlauf bleibt fehlerfrei: " + JSON.stringify(fehler11));

    /* Dieselbe Ansicht OHNE Textstand (Scan): die Zusatzangaben bleiben der
       einzige Weg zum Schriftfeld und laufen deshalb weiter. */
    T.App.p = T.leeresProjekt();
    T.App.auslese = { laeuft: true, gesamt: 1, fertig: 0, kosten: 0,
      budgetFreigabe: null, aufrufe: 0, aufrufeFertig: 0,
      aktiv: [], laufendeSeiten: [], abbrechen: false, was: "" };
    const rufe11b = {};
    fenster.MODUL_KI.auslesenBild = function (b64, hinweis, modus) {
      rufe11b[modus] = (rufe11b[modus] || 0) + 1;
      if (modus === "gegenprobe") {
        return Promise.resolve({ blattart: "ansicht", raumnamen: [],
          ebenen: [], ansichten: [], _verbrauch: {} });
      }
      return Promise.resolve({ befunde: [], gebaeude: {}, _verbrauch: {} });
    };
    const seite11b = { bezeichnung: "Ansicht Sued (Scan)",
      name: "Ansicht Sued (Scan)", breite_mm: 297, hoehe_mm: 210,
      blattkopf: { blattart: "ansicht" },
      rendern() { return Promise.resolve({ canvas: knoten("canvas"),
        breite: 1000, hoehe: 700 }); } };
    await T.blattAuswerten(seite11b, [seite11b], 0, 1, []);
    pruefe(rufe11b.kunde === 1,
      "Ohne Textstand-Schriftfeld laufen die Zusatzangaben weiter: "
        + JSON.stringify(rufe11b));
    T.App.auslese = { kosten: 0, abbrechen: false };
  }

  /* =========================================================================
   * 12  VORAB-ZERLEGUNG: erkennen, BEVOR der Aufruf 28 Sekunden verbraucht hat
   * ======================================================================
   * Jeder Fall unten ist ein Blatt aus validierung/echtlauf/, mit seinen
   * echten Massen. Die Erwartung ist nicht gesetzt, sondern das, was der
   * Lauf damals tatsaechlich gebraucht hat.
   *
   * Die Bildgrenze der Gegenstelle ist eine FLAECHENgrenze. Deshalb kommt
   * jedes Ganzblatt mit derselben Punktzahl an, und die Aufloesung haengt
   * allein an der Blattflaeche. Diese Rechnung wird zuerst gegen die
   * gemessenen Werte der Formatspezifikation geprueft: A3 rund 139 dpi,
   * A1 rund 70 dpi. Stimmt sie nicht, ist jede Schwelle darunter wertlos. */
  {
    const a3 = T.ankommendDpi({ breite_mm: 420, hoehe_mm: 297 });
    const a1 = T.ankommendDpi({ breite_mm: 841, hoehe_mm: 594 });
    pruefe(Math.abs(a3 - 139) < 3,
      "Ein A3 muss beim Modell mit rund 139 dpi ankommen, gerechnet " + a3.toFixed(1));
    pruefe(Math.abs(a1 - 70) < 3,
      "Ein A1 muss beim Modell mit rund 70 dpi ankommen, gerechnet " + a1.toFixed(1));
    pruefe(T.ankommendDpi({ breite_mm: null, hoehe_mm: null }) === null,
      "Ohne Blattmass (Bilddatei) darf die Rechnung nichts vortaeuschen");
    /* Die noetige Aufloesung MUSS aus der Versalhoehe kommen und darf nicht
       den gedeckelten Wert aus seite.aufloesung nehmen: der Deckel ist
       genau dort blind, wo es darauf ankommt. */
    const nd = T.noetigDpi({ kleinste_versalhoehe_mm: 0.8112345133333332 });
    pruefe(Math.abs(nd - 877) < 5,
      "0,81 mm Versalhoehe verlangen rund 877 dpi, gerechnet " + nd.toFixed(0));
    pruefe(T.noetigDpi({ dpi_nativ: 200 }) === 200,
      "Beim reinen Scan tritt die native Aufloesung an die Stelle der Versalhoehe");
    pruefe(T.noetigDpi({}) === null, "Ohne beides bleibt es unentscheidbar");
  }
  {
    const zweiFelder = [{ x: 0, y: 0, x2: 0.5, y2: 1 }, { x: 0.5, y: 0, x2: 1, y2: 1 }];
    /* HASENBERG Blatt 1, A3, kleinste Schrift 0,81 mm. Verhaeltnis 6,29.
       Der Lauf vom 25.08.2026 brauchte tatsaechlich drei Teile: erst zwei
       Zeichnungsfelder, dann Feld 1 noch einmal halbiert. */
    const hasenberg = { breite_mm: 419.9995833333333, hoehe_mm: 297.0000833333333,
      kleinste_versalhoehe_mm: 0.8112345133333332, felder: zweiFelder,
      typ: "vektorplan", raumstempel: [], raumbloecke: [] };
    const vH = T.vorabFeldweise(hasenberg);
    pruefe(vH && vH.teile >= 2,
      "Hasenberg Blatt 1 (0,81 mm Schrift auf A3) muss vorab zerlegt werden, kam: "
        + JSON.stringify(vH));
    pruefe(vH && /Bildpunkten Versalhöhe/.test(vH.grund),
      "und der Grund muss die ankommende Schriftgroesse benennen: "
        + JSON.stringify(vH && vH.grund));

    /* SOETHE, A3, kleinste Schrift 1,4483 mm. Verhaeltnis 3,53 -- der
       groesste Wert, der belegt noch durchgelaufen ist. Darf NICHT zerlegt
       werden, sonst zahlt ein gewoehnliches Blatt die Zerlegung mit. */
    pruefe(T.vorabFeldweise({ breite_mm: 420.03133333333335, hoehe_mm: 297.01031388888885,
      kleinste_versalhoehe_mm: 1.4483439833333334, felder: zweiFelder,
      typ: "vektorplan", raumstempel: [], raumbloecke: [] }) === null,
      "Soethe (1,45 mm Schrift auf A3) lief durch und darf nicht zerlegt werden");

    /* ZIOLKOWSKI, A3, reiner Scan mit 200 dpi nativ. Verhaeltnis 1,44.
       Lief in DREI unabhaengigen Laeufen mit allen 13 Raeumen durch. */
    pruefe(T.vorabFeldweise({ breite_mm: 419.989, hoehe_mm: 296.926,
      dpi_nativ: 200, felder: zweiFelder, typ: "scan",
      raumstempel: [], raumbloecke: [] }) === null,
      "Ziolkowski (Scan, 200 dpi nativ) lief dreimal durch und darf nicht zerlegt werden");

    /* Ein A1 mit gewoehnlicher Normschrift (2,5 mm) reisst die Schwelle,
       weil ein A1 nur mit rund 70 dpi ankommt. Das ist gewollt. */
    pruefe(T.vorabFeldweise({ breite_mm: 841, hoehe_mm: 594,
      kleinste_versalhoehe_mm: 2.5, felder: zweiFelder, typ: "vektorplan",
      raumstempel: [], raumbloecke: [] }) !== null,
      "Ein A1 mit 2,5 mm Normschrift kommt mit rund 70 dpi an und muss zerlegt werden");

    /* VETO: ohne zweites Zeichnungsfeld gibt es keine Schnittkante. */
    pruefe(T.vorabFeldweise({ breite_mm: 841, hoehe_mm: 594,
      kleinste_versalhoehe_mm: 2.5, felder: [{ x: 0, y: 0, x2: 1, y2: 1 }],
      typ: "vektorplan", raumstempel: [], raumbloecke: [] }) === null,
      "Ohne zwei Zeichnungsfelder darf nicht vorab zerlegt werden");

    /* VETO: eine Ansicht und ein Lageplan tragen keine Raeume und duerfen
       die Zerlegung eines Grundrisses nicht mitbezahlen. */
    ["ansicht", "lageplan"].forEach(function (art) {
      pruefe(T.vorabFeldweise({ breite_mm: 841, hoehe_mm: 594,
        kleinste_versalhoehe_mm: 2.5, felder: zweiFelder, typ: "vektorplan",
        blattkopf: { blattart: art }, raumstempel: [], raumbloecke: [] }) === null,
        "Eine " + art + " darf nie vorab zerlegt werden");
    });

    /* AUSLOESER 1, die Antwort wird zu lang. Der A1-Bogen "Dumach 1" traegt
       25 Flaechenstempel im Textstand und brach nach 12 Raeumen ab. Die
       Stempel muessen die Zerlegung ausloesen, ohne dass ein Aufruf noetig
       waere. Geprueft mit einer Schrift, die den zweiten Ausloeser
       ausdruecklich NICHT reisst, damit wirklich die Raumzahl wirkt. */
    const stempel25 = [];
    const namen = ["Wohnen", "Kueche", "Bad", "Flur", "Diele", "Buero",
                   "Schlafen", "Kind", "Abstellraum", "Gast", "Hauswirtschaft",
                   "Wohnzimmer", "Esszimmer", "Arbeiten", "Ankleide",
                   "Duschbad", "Gaeste-WC", "Speisekammer", "Technik",
                   "Waschraum", "Studio", "Galerie", "Atelier", "Werkstatt",
                   "Vorraum"];
    for (let i = 0; i < 25; i++) {
      /* Die echte Blockform aus MODUL_PDF: name, A_m2, U_m, x_pt, y_pt.
         Mit flaeche_m2 statt A_m2 faellt jeder Block still durch das
         Sieb in stempelraeumeDesBlatts, und der Test prueft nichts. */
      stempel25.push({ name: namen[i], A_m2: 12 + i, U_m: 14 + i,
                       x_pt: 100 + i * 10, y_pt: 200, sammel: false });
    }
    const dumach = { breite_mm: 420, hoehe_mm: 297,
      kleinste_versalhoehe_mm: 2.0, felder: zweiFelder, typ: "vektorplan",
      raumstempel: stempel25, raumbloecke: stempel25 };
    const vD = T.vorabFeldweise(dumach);
    pruefe(T.noetigDpi(dumach) / T.ankommendDpi(dumach) < 4.0,
      "Der Aufbau muss so sein, dass hier NICHT die Schrift ausloest, sondern die Raumzahl");
    pruefe(vD && vD.teile >= 2 && /Flächenstempel/.test(vD.grund),
      "25 Flaechenstempel im Textstand muessen die Zerlegung ausloesen: "
        + JSON.stringify(vD));

    /* Gegenprobe nach unten: zwoelf Raeume sind der gemessene Regelfall
       (rund 1150 Ausgabe-Token, halbes Budget) und bleiben ungeteilt. */
    const stempel12 = stempel25.slice(0, 12);
    pruefe(T.vorabFeldweise({ breite_mm: 420, hoehe_mm: 297,
      kleinste_versalhoehe_mm: 2.0, felder: zweiFelder, typ: "vektorplan",
      raumstempel: stempel12, raumbloecke: stempel12 }) === null,
      "Zwoelf Raeume sind der Regelfall und duerfen nicht zerlegt werden");

    /* Die Teilezahl darf nie mehr sein, als es Felder gibt: es wird an den
       Zeichnungsfeldern geschnitten, nicht an gedachten Kanten. */
    pruefe(!vH || vH.teile <= zweiFelder.length,
      "Die Teilezahl darf die Zahl der Zeichnungsfelder nicht ueberschreiten");

    /* Die Kostenvorschau laeuft, BEVOR seiteZerlegen() gelaufen ist -- sie
       kennt seite.felder noch nicht. Deshalb muss vorabGrund() auch OHNE
       Felder antworten, waehrend vorabFeldweise() ohne Felder schweigt.
       Faellt das zusammen, nennt die Vorschau wieder 0,29 $ und die
       Rechnung sagt 0,50 $. */
    const ohneFelder = { breite_mm: 419.9995833333333, hoehe_mm: 297.0000833333333,
      kleinste_versalhoehe_mm: 0.8112345133333332,
      typ: "vektorplan", raumstempel: [], raumbloecke: [] };
    pruefe(T.vorabGrund(ohneFelder) !== null,
      "vorabGrund muss auch ohne bekannte Zeichnungsfelder antworten, sonst "
        + "rechnet die Kostenvorschau zu niedrig");
    pruefe(T.vorabFeldweise(ohneFelder) === null,
      "vorabFeldweise darf ohne zwei Zeichnungsfelder nicht ausloesen");
    /* Und die Vetos muessen in BEIDEN gelten, sonst wuerde die Vorschau
       Ansichtsblaetter mitbezahlen lassen, die nie zerlegt werden. */
    pruefe(T.vorabGrund(Object.assign({}, ohneFelder,
      { blattkopf: { blattart: "ansicht" } })) === null,
      "Auch vorabGrund muss die Ansicht ausnehmen, sonst rechnet die Vorschau zu hoch");
  }

  console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl, fehler: fehler }));
  process.exit(fehler.length === 0 ? 0 : 1);
})().catch(function (e) {
  console.log(JSON.stringify({ ok: false, anzahl: anzahl + 1,
    fehler: fehler.concat(["Der Test selbst ist gescheitert: " + (e && e.stack || e)]) }));
  process.exit(1);
});
