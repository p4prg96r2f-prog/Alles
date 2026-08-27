/* ===========================================================================
 * nie_nan_test.js — die Kehrwoche: kaputte Eingaben verhindern nie die Rechnung
 * ===========================================================================
 * Auftrag vom 25.08.2026: "Pläne reinladen -> sofort vollständiges Ergebnis.
 * Es darf KEINE Berechnungsabbrüche, Hard-Fails oder NaN-Werte mehr geben."
 *
 * Gemessen VOR der Kehrwoche (nan_jagd, 25.08.2026): fehlendes Klima liess
 * die Rechnung mit NaN durchlaufen — phi_gebaeude = NaN, jede Raumzeile NaN,
 * am Ende stand "NaN kW" ohne eine einzige Zahl. Und in app.js sass K.rechne
 * mit KP.pruefeAlles in EINEM try: eine Ausnahme im Pruefmodul ersetzte ein
 * FERTIGES Ergebnis durch { fehlerhaft: true, phi_gebaeude: 0 }.
 *
 * Diese Probe speist die Kehrwochen-Faelle ein und verlangt fuer jeden:
 *   1  eine ENDLICHE Heizlast (phi_gebaeude, und kein NaN/Infinity irgendwo
 *      im ganzen Ergebnisbaum),
 *   2  den PASSENDEN HINWEIS (die Annahme ist gekennzeichnet, nicht still),
 *   3  die Gegenprobe: mit vollstaendiger Eingabe verschwinden Rueckfall und
 *      Hinweis restlos — keine Nutzereingabe wird ueberschrieben.
 * Dazu die Quellenbindung: der Klima-Rueckfall des Kerns muss den kaeltesten
 * Werten der eigenen PLZ-Tabelle nach DIN/TS 12831-1 entsprechen (kaeltester
 * Wert = Fehlerrichtung "eher zu gross"; ein zu KLEINES Ergebnis waere der
 * Fehler, der unsichtbar bleibt).
 *
 * Teil B laedt app.js in der Attrappe (wie ablauf_test.js) und prueft die
 * getrennten Fangnetze von rechnen(): ein werfendes Pruefmodul darf die
 * fertige Zahl nicht mehr mitreissen.
 *
 * Aufruf:  node validierung/nie_nan_test.js
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

/* ------------------------------------------------------- tiefe NaN-Suche */
function findeNaN(o, pfad, treffer, tiefe) {
  if (treffer.length > 25 || tiefe > 12) return;
  if (typeof o === "number" && !Number.isFinite(o)) { treffer.push(pfad); return; }
  if (o && typeof o === "object") {
    for (const k of Object.keys(o)) findeNaN(o[k], pfad + "." + k, treffer, tiefe + 1);
  }
}
function verlangeEndlich(erg, name) {
  pruefe(erg && Number.isFinite(erg.phi_gebaeude),
    name + ": phi_gebaeude ist nicht endlich ("
    + (erg ? erg.phi_gebaeude : "kein Ergebnis") + ")");
  const treffer = [];
  findeNaN(erg, "erg", treffer, 0);
  pruefe(treffer.length === 0,
    name + ": nicht endliche Zahlen im Ergebnisbaum: " + treffer.slice(0, 5).join(", "));
}
function hatWarnung(erg, muster, name) {
  pruefe((erg.warnungen || []).some(function (w) { return muster.test(w); }),
    name + ": erwarteter Hinweis fehlt (" + muster + ")");
}

/* ====================== TEIL C: der ganze Ergebnisweg ====================
 * Teil A prueft den Rechenkern, Teil B den Rechenweg in app.js. Beide sahen
 * eine Luecke NICHT: was aus dem Ergebnis am Ende GEDRUCKT wird. Zwischen
 * phi_gebaeude und dem Bericht liegen Pruefmodul, Teillast, Bewertung und
 * modul_bericht — und jede dieser Stufen rechnet weiter.
 *
 * GEMESSEN am 25.08.2026: der Fall "Bauteiltyp geloescht" (jeder U-Wert 0)
 * lieferte eine tadellose, endliche Heizlast — und im Bericht stand
 * woertlich "Abweichung +Infinity %". Der Quervergleich hatte den
 * Erwartungswert mit dem Faktor istAU/typAU = 0 multipliziert und dann durch
 * ihn geteilt (kern_pruefung.js, pruefeQuervergleich). Teil A und B waren
 * beide gruen. Erst der Bericht zeigte es.
 *
 * Diese Probe schickt zehn kaputte Projekte durch den GANZEN Weg und
 * verlangt fuer jedes: keine Ausnahme, eine endliche Heizlast, nichts
 * Unendliches im Ergebnisbaum, und einen Bericht, durch den die vorhandene
 * baustellenSuche() ohne Befund laeuft (sie faengt NaN, Infinity und
 * undefined im fertigen Text).
 *
 * Teil C laeuft in einem EIGENEN Prozess (Aufruf mit --bericht). Grund: die
 * Module binden sich beim Laden entweder an module.exports oder an window.
 * Teil A hat sie laengst ueber require() gezogen, Teil B in einen
 * vm-Kontext; ein drittes Laden im selben Prozess bekaeme aus dem
 * require-Cache nur die Exporte zurueck und wuerde window nie fuellen.
 * ===================================================================== */
function teilC() {
  global.window = {};
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  global.document = {
    /* "loading" haelt app.js davon ab, beim Laden start() aufzurufen. */
    readyState: "loading",
    addEventListener: () => {},
    createElement: () => ({ getContext: () => ({}), toDataURL: () => "x,y",
      style: {}, appendChild: () => {}, setAttribute: () => {} }),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: { appendChild: () => {} },
  };
  global.Image = function () {};
  global.location = { search: "" };

  const R = (d) => require(path.join(WURZEL, d));
  window.STANDORTE = R("src/standorte.js").STANDORTE;
  ["src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
   "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
   "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
   "src/daten/daten_zonenlagen.js", "src/kerne/kern_pruefung.js",
   "src/kerne/kern_zuordnung.js", "src/modul_kontrollblatt.js",
   "src/modul_berichtsatz.js", "src/modul_teillast.js",
   "src/modul_bewertung.js", "src/modul_bericht.js", "src/app.js"].forEach(R);

  const MB = window.MODUL_BERICHT;
  const suche = MB.rechenhilfen.baustellenSuche;

  /* Ein vollstaendiges, gesundes Projekt. Jeder Kehrwochen-Fall bricht daran
     genau EINE Sache ab; so ist zu jedem Befund die Ursache benannt. */
  function basis() {
    return {
      version: 2,
      meta: { bezeichnung: "Kehrwoche", strasse: "Musterweg 1", plz: "33098",
        ort: "Paderborn", bauherr: "", projektnr: "NIENAN", baujahr: 1975,
        bearbeitet: "" },
      standort: "paderborn",
      klima: { theta_e: -9.6, theta_e_m: 10.1,
        quelle: "Klimatabelle des Werkzeugs, PLZ 33098" },
      luftdichtheit: { n50: 4.0, kategorie: "annahme", quelle: "" },
      norm: {}, optionen: { f_RH: 0 },
      einheiten: [{ id: "we1", name: "WE 1", personen: 2 }],
      zonen: [],
      bauteiltypen: [
        { id: "bt1", name: "Außenwand", U: 1.4, kat_default: "huelle",
          schichten: [], belegt: false, quelle: "" },
        { id: "bt2", name: "Fenster", U: 2.8, kat_default: "huelle",
          schichten: [], belegt: false, quelle: "" }],
      raeume: [{ id: "r2", geschoss: "EG", name: "Wohnen", art: "wohnen",
        theta_i: 20, A: 24, h: 2.5, V: 60, we: "we1", n_min: 0.5, n_exponiert: 2,
        bauteile: [
          { typ_id: "bt1", name: "Außenwand", A: 18, kat: "huelle",
            grenzt_an: { typ: "aussen" } },
          { typ_id: "bt2", name: "Fenster", A: 4, kat: "huelle",
            grenzt_an: { typ: "aussen" } }] }],
      plan: { bilder: [] },
    };
  }

  const faelle = [];
  const F = (name, bau) => { const p = basis(); bau(p); faelle.push([name, p]); };
  F("C1 Klima fehlt ganz", (p) => { delete p.klima; });
  F("C2 Baujahr fehlt", (p) => { delete p.meta.baujahr; });
  F("C3 Wohnflaeche 0", (p) => { p.meta.wohnflaeche = 0; });
  F("C4 alle Raeume A=0 und h=null", (p) => {
    p.raeume.forEach((r) => { r.A = 0; r.h = null; r.V = null; }); });
  F("C5 theta_i gleich theta_e", (p) => { p.raeume[0].theta_i = -9.6; });
  /* C6 ist der gemessene Fall: ohne Bauteiltypen wird JEDER U-Wert 0. */
  F("C6 kein Bauteiltyp (jeder U-Wert 0)", (p) => { p.bauteiltypen = []; });
  F("C7 kein Raum", (p) => { p.raeume = []; });
  F("C8 Bauteil A=NaN, Nachbar ins Leere", (p) => {
    p.raeume[0].bauteile[0].A = NaN;
    p.raeume[0].bauteile[0].grenzt_an = { typ: "zone", ref: "gibtsnicht" }; });
  F("C9 unbeheizter Bereich verweist auf sich selbst", (p) => {
    p.zonen = [{ id: "z1", name: "Keller", huelle: [
      { name: "Wand", A: 10, U: 1.0, grenzt_an: { typ: "zone", ref: "z1" } }] }];
    p.raeume[0].bauteile.push({ typ_id: "bt1", name: "Kellerdecke", A: 24,
      kat: "huelle", grenzt_an: { typ: "zone", ref: "z1" } }); });
  F("C10 Optionen, Norm und n50 unbrauchbar", (p) => {
    p.luftdichtheit = { n50: "kaputt" }; p.optionen = { f_RH: "x" };
    p.norm = { delta_u_wb: "y" }; });

  faelle.forEach(function (paar) {
    const name = paar[0], p = paar[1];
    const A = window.App;
    A.p = p; A.pruefung = null; A.ergebnis = null;

    /* 1  Der Rechenkern darf nicht werfen und muss eine endliche Zahl liefern. */
    let e = null;
    try { e = A.ergebnis = window.KERN_HEIZLAST_NORM.rechne(A.projektFuerKern(p)); }
    catch (x) { pruefe(false, name + ": der Rechenkern wirft: " + x.message); return; }
    anzahl++;
    pruefe(e && !e.fehlerhaft, name + ": der Rechenkern meldet fehlerhaft");
    verlangeEndlich(e, name);

    /* 2  Pruefmodul, Teillast und Bewertung duerfen nicht werfen und nichts
          Unendliches erzeugen. Sie rechnen alle mit dem Ergebnis weiter. */
    try {
      A.pruefung = window.KERN_PRUEFUNG.pruefeAlles(A.p, e,
        { typologie: window.DATEN_TYPOLOGIE,
          kontrollblatt: window.MODUL_KONTROLLBLATT });
    } catch (x) { pruefe(false, name + ": das Pruefmodul wirft: " + x.message); }
    anzahl++;
    try {
      const kl = window.MODUL_TEILLAST.kennlinie(e, p);
      if (kl) {
        const t = [];
        findeNaN(kl, "teillast", t, 0);
        pruefe(t.length === 0, name + ": Teillast enthaelt " + t.slice(0, 3).join(", "));
      } else { anzahl++; }
    } catch (x) { pruefe(false, name + ": die Teillast wirft: " + x.message); }
    try {
      /* Dritter Wert sind die Rechenhilfen des Berichtsmoduls, nicht die
         Pruefliste (modul_bewertung.js, daten(p, e, hilfen)). */
      const bw = window.MODUL_BEWERTUNG.daten(p, e, MB.rechenhilfen);
      const t = [];
      findeNaN(bw, "bewertung", t, 0);
      pruefe(t.length === 0, name + ": Bewertung enthaelt " + t.slice(0, 3).join(", "));
    } catch (x) { pruefe(false, name + ": die Bewertung wirft: " + x.message); }

    /* 3  Der Bericht. Hier wird sichtbar, was der Kunde am Ende liest.
          baustellenSuche() ist die VORHANDENE Suche des Berichtsmoduls; sie
          faengt NaN, Infinity und undefined im fertigen Text. */
    let dIntern = null, dDruck = null;
    try {
      dIntern = MB.dokument({ fassung: "intern" });
      dDruck = MB.dokument({ fassung: "druck" });
    } catch (x) {
      pruefe(false, name + ": der Bericht wirft: " + x.message); return;
    }
    anzahl++;
    pruefe(dIntern && dIntern.html && dIntern.html.length > 3000,
      name + ": die interne Fassung ist leer oder zu kurz");
    pruefe(dDruck && dDruck.html && dDruck.html.length > 3000,
      name + ": die Druckfassung ist leer oder zu kurz");
    [["intern", dIntern], ["Druck", dDruck]].forEach(function (f) {
      if (!f[1] || !f[1].html) return;
      anzahl++;
      const treffer = suche(f[1].html);
      pruefe(treffer.length === 0, name + " (" + f[0] + "): "
        + treffer.slice(0, 3).map(function (x) {
            return x.regel + " bei „" + x.stelle + "“"; }).join(" | "));
      /* Ausdruecklich noch einmal, unabhaengig von den Regeln der Suche: die
         drei Woerter duerfen in keiner Fassung stehen. */
      pruefe(!/Infinity|NaN/.test(f[1].html),
        name + " (" + f[0] + "): Infinity oder NaN steht im Bericht");
    });
  });

  /* --- C11  Gegenprobe: das gesunde Projekt bleibt unveraendert ---------- */
  (function () {
    const A = window.App;
    const p = basis();
    p.meta.wohnflaeche = 24;
    A.p = p; A.pruefung = null;
    A.ergebnis = window.KERN_HEIZLAST_NORM.rechne(A.projektFuerKern(p));
    A.pruefung = window.KERN_PRUEFUNG.pruefeAlles(A.p, A.ergebnis,
      { typologie: window.DATEN_TYPOLOGIE });
    verlangeEndlich(A.ergebnis, "C11 Gegenprobe gesundes Projekt");
    /* Der Quervergleich muss beim gesunden Projekt WIRKLICH vergleichen —
       sonst haette die Reparatur oben die Zeile bloss stillgelegt. */
    const alle = [].concat.apply([], Object.keys(A.pruefung)
      .map(function (k) { return A.pruefung[k]; })
      .filter(function (v) { return Array.isArray(v); }));
    const quer = alle.filter(function (x) { return x && x.id === "quer"; })[0];
    pruefe(!!quer, "C11 der Quervergleich fehlt beim gesunden Projekt");
    pruefe(quer && quer.zahl && Number.isFinite(quer.zahl.abw),
      "C11 der Quervergleich liefert keine endliche Abweichung ("
      + (quer && quer.zahl && quer.zahl.abw) + ")");
    pruefe(quer && /Abweichung/.test(quer.text)
      && !/Infinity|NaN/.test(quer.text),
      "C11 der Text des Quervergleichs traegt Infinity oder NaN");
  })();
}

/* Kindprozess-Zweig: nur Teil C, eigenes Ergebnis nach stdout. */
if (process.argv[2] === "--bericht") {
  try { teilC(); }
  catch (e) { fehler.push("Teil C bricht ab: " + (e && e.message)); }
  console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl,
    fehler: fehler }));
  process.exit(fehler.length === 0 ? 0 : 1);
}

/* ============================== TEIL A: der Kern ========================= */
const K = require(path.join(WURZEL, "src/kerne/kern_heizlast_norm.js"));
const DK = require(path.join(WURZEL, "src/daten/daten_klima.js"));

/* --- A0  Quellenbindung des Rueckfalls ---------------------------------- */
pruefe(K.KLIMA_RUECKFALL && K.KLIMA_RUECKFALL.theta_e === DK.grenzen.theta_e_min,
  "A0 Klima-Rueckfall theta_e (" + (K.KLIMA_RUECKFALL && K.KLIMA_RUECKFALL.theta_e)
  + ") ist nicht der kaelteste Wert der PLZ-Tabelle (" + DK.grenzen.theta_e_min + ")");
pruefe(K.KLIMA_RUECKFALL && K.KLIMA_RUECKFALL.theta_e_m === DK.grenzen.theta_e_m_min,
  "A0 Klima-Rueckfall theta_e,m (" + (K.KLIMA_RUECKFALL && K.KLIMA_RUECKFALL.theta_e_m)
  + ") ist nicht das kleinste Jahresmittel der PLZ-Tabelle ("
  + DK.grenzen.theta_e_m_min + ")");

const KLIMA_OK = { theta_e: -9.7, theta_e_m: 9.5 };

/* --- A1  Klima fehlt ganz ----------------------------------------------- */
const raumNormal = { id: "r1", name: "Wohnen", A: 20, h: 2.5,
  bauteile: [{ name: "AW", A: 12, U: 1.0, grenzt_an: { typ: "aussen" } }] };
const a1 = K.rechne({ raeume: [JSON.parse(JSON.stringify(raumNormal))] });
verlangeEndlich(a1, "A1 Klima fehlt");
hatWarnung(a1, /theta_e/, "A1");
hatWarnung(a1, /zu groß/, "A1 (Fehlerrichtung muss benannt sein)");
pruefe(a1.klima.theta_e_angenommen === true, "A1 theta_e_angenommen fehlt am Ergebnis");
pruefe(a1.klima.theta_e === K.KLIMA_RUECKFALL.theta_e,
  "A1 gerechnet wurde nicht mit dem Rueckfallwert");
/* Gegenprobe: echtes Klima ersetzt alles, kein Rueckfall-Rest */
const a1g = K.rechne({ klima: KLIMA_OK, raeume: [JSON.parse(JSON.stringify(raumNormal))] });
pruefe(a1g.klima.theta_e_angenommen === false, "A1g Gegenprobe: Kennzeichen bleibt kleben");
pruefe(a1g.klima.theta_e === KLIMA_OK.theta_e, "A1g Gegenprobe: Eingabe wurde nicht uebernommen");
pruefe(!(a1g.warnungen || []).some(function (w) { return /ersatzweise/.test(w); }),
  "A1g Gegenprobe: Ersatzwert-Hinweis steht trotz vollstaendiger Eingabe da");
pruefe(a1.phi_gebaeude > a1g.phi_gebaeude,
  "A1 Fehlerrichtung: der Rueckfall (-19,2 °C) muss MEHR Heizlast ergeben als -9,7 °C");

/* --- A2  theta_e,m fehlt, erdberuehrtes Bauteil da ----------------------- */
const a2 = K.rechne({ klima: { theta_e: -9.7 },
  raeume: [{ id: "r1", name: "Wohnen", A: 20, h: 2.5,
    bauteile: [{ name: "Boden", A: 20, U: 0.9, grenzt_an: { typ: "erdreich" } }] }] });
verlangeEndlich(a2, "A2 theta_e,m fehlt");
hatWarnung(a2, /theta_e,m/, "A2");
pruefe(a2.klima.theta_e_m_angenommen === true, "A2 theta_e_m_angenommen fehlt");

/* --- A3  Raum ohne Flaeche und ohne Hoehe reisst die anderen nicht mit --- */
const a3 = K.rechne({ klima: KLIMA_OK, raeume: [
  { id: "r1", name: "Bad", A: 0, h: null,
    bauteile: [{ name: "AW", A: 8, U: 1.0, grenzt_an: { typ: "aussen" } }] },
  JSON.parse(JSON.stringify(raumNormal)),
] });
verlangeEndlich(a3, "A3 Raum A=0 h=null");
pruefe(a3.raeume.length === 2, "A3 der kaputte Raum ist aus dem Ergebnis verschwunden");
pruefe(a3.raeume[1].phi_raum > 0, "A3 der gesunde Raum rechnet nicht mehr");

/* --- A4  U-Werte undefined / NaN / Unsinn ------------------------------- */
const a4 = K.rechne({ klima: KLIMA_OK, raeume: [
  { id: "r1", name: "Wohnen", A: 20, h: 2.5,
    bauteile: [{ name: "AW", A: 12, U: undefined, grenzt_an: { typ: "aussen" } },
               { name: "F", A: 3, U: NaN, grenzt_an: { typ: "aussen" } },
               { name: "D", A: 20, U: "kaputt", grenzt_an: { typ: "aussen" } }] }] });
verlangeEndlich(a4, "A4 U kaputt");

/* --- A5  Zonen: Selbstbezug und Verweis ins Leere ------------------------ */
const a5 = K.rechne({ klima: KLIMA_OK,
  zonen: [{ id: "z1", name: "Keller", huelle: [
    { name: "W", A: 10, U: 1.0, grenzt_an: { typ: "zone", ref: "z1" } },
    { name: "X", A: 10, U: 1.0, grenzt_an: { typ: "zone", ref: "gibtsnicht" } }] }],
  raeume: [{ id: "r1", name: "Wohnen", A: 20, h: 2.5,
    bauteile: [{ name: "KD", A: 20, U: 0.6, grenzt_an: { typ: "zone", ref: "z1" } }] }] });
verlangeEndlich(a5, "A5 Zonen-Selbstbezug");

/* --- A6  dt = 0, wirre Optionen, leere Listen --------------------------- */
verlangeEndlich(K.rechne({ klima: { theta_e: 20, theta_e_m: 9.5 },
  raeume: [{ id: "r1", name: "W", A: 20, h: 2.5, theta_i: 20,
    bauteile: [{ name: "AW", A: 12, U: 1.0 },
               { name: "B", A: 20, U: 0.5, grenzt_an: { typ: "erdreich" } }] }] }),
  "A6a theta_i == theta_e");
verlangeEndlich(K.rechne({ klima: KLIMA_OK, raeume: null, zonen: null,
  meta: { wohnflaeche: "abc" } }), "A6b leere Listen");
verlangeEndlich(K.rechne({ klima: KLIMA_OK,
  norm: { delta_u_wb: "x", f_theta_ann: NaN, rho_c: null },
  luftdichtheit: { n50: "x" }, optionen: { f_RH: "z" },
  raeume: [{ id: "r1", name: "W", A: 20, h: 2.5, e: NaN, epsilon: null, n_min: "y",
    bauteile: [{ name: "AW", A: 12, U: 1.0 },
               { name: "TW", A: 10, U: 1.0, grenzt_an: { typ: "fest", theta: "?" } },
               { name: "TW2", A: 10, U: 1.0, grenzt_an: { typ: "raum", ref: "weg" } }] }] }),
  "A6c Optionen und Nachbarn kaputt");

/* --- A7  Teillast: Vorgabe an/unter theta_e macht keine Infinity-Tabelle - */
(function () {
  const src = fs.readFileSync(path.join(WURZEL, "src/modul_teillast.js"), "utf8");
  const fenster = { KERN_HEIZLAST_NORM: K, ikon: function () { return ""; } };
  const umg = vm.createContext({ window: fenster, document: undefined,
    console: console, module: undefined });
  vm.runInContext(src, umg, { filename: "src/modul_teillast.js" });
  const T = fenster.MODUL_TEILLAST;
  const e = K.rechne({ klima: KLIMA_OK, raeume: [JSON.parse(JSON.stringify(raumNormal))] });
  const kl = T.kennlinie(e, { optionen: { teillast_theta_i: KLIMA_OK.theta_e } });
  if (kl) {
    const t = [];
    findeNaN(kl.zeilen, "zeilen", t, 0);
    pruefe(t.length === 0, "A7 Teillast-Tabelle enthaelt " + t.slice(0, 3).join(", "));
    pruefe(Number.isFinite(kl.bezug.H), "A7 H der Kennlinie ist " + kl.bezug.H);
  } else {
    pruefe(true, "A7 Kennlinie faellt sauber auf null zurueck");
  }
})();

/* ============================== TEIL B: app.js =========================== */
/* Dieselbe Attrappe wie ablauf_test.js: so viel Seite, wie app.js beim
   Laden anfasst. */
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
app += "\n;window.__nienan = { App, leeresProjekt, rechnen };\n";
try { vm.runInContext(app, umgebung, { filename: "src/app.js" }); }
catch (e) { fehler.push("app.js laesst sich nicht laden: " + e.message); }

const T = fenster.__nienan;
if (!T) {
  console.log(JSON.stringify({ ok: false, anzahl: anzahl,
    fehler: fehler.concat(["app.js stellt die Symbole nicht bereit."]) }));
  process.exit(1);
}

/* --- B1  Gemischt kaputtes Projekt durch den ganzen App-Rechenweg -------- */
function projektKaputt() {
  const p = T.leeresProjekt();
  p.meta.bezeichnung = "Kehrwoche";
  p.meta.baujahr = 1980;
  /* Klima FEHLT absichtlich; Raum 1 kaputt, Raum 2 gesund, Zone ins Leere */
  p.raeume = [
    { id: "r1", name: "Bad", geschoss: "EG", A: 0, h: null, we: "WE1",
      bauteile: [{ name: "AW", A: 8, U: undefined, automatisch: false,
                   grenzt_an: { typ: "aussen" } }] },
    { id: "r2", name: "Wohnen", geschoss: "EG", A: 20, h: 2.5, we: "WE1",
      bauteile: [{ name: "AW", A: 12, U: 1.0, automatisch: false,
                   grenzt_an: { typ: "aussen" } },
                 { name: "KD", A: 20, U: 0.6, automatisch: false,
                   grenzt_an: { typ: "zone", ref: "fehlt" } }] },
  ];
  return p;
}
T.App.p = projektKaputt();
T.App.pruefung = null;
try { T.rechnen(); } catch (e) {
  fehler.push("B1 rechnen() wirft am kaputten Projekt: " + e.message);
}
anzahl++;
const e1 = T.App.ergebnis;
pruefe(e1 && !e1.fehlerhaft, "B1 das kaputte Projekt macht das Ergebnis fehlerhaft");
verlangeEndlich(e1, "B1 App-Rechenweg mit kaputtem Projekt");
pruefe(e1 && e1.phi_gebaeude > 0, "B1 der gesunde Raum traegt nichts bei");
pruefe(!!T.App.pruefung, "B1 die Pruefliste fehlt (sie soll faerben, nicht fehlen)");

/* --- B2  Ein werfendes Pruefmodul reisst die fertige Zahl nicht mehr mit - */
const echtesKP = fenster.KERN_PRUEFUNG;
const phiVorher = e1.phi_gebaeude;
fenster.KERN_PRUEFUNG = { pruefeAlles: function () {
  throw new Error("Pruefmodul-Attrappe wirft absichtlich");
} };
/* rechnen() bindet KP beim Laden; der Wurf muss ueber die gebundene Stelle
   kommen. Wenn KP frueh gebunden ist, greift die Attrappe nicht — dann wird
   stattdessen am ECHTEN Modul ein werfender Zwischenstand erzwungen. */
let b2Warf = false;
const kpAlt = echtesKP.pruefeAlles;
echtesKP.pruefeAlles = function () { b2Warf = true;
  throw new Error("Pruefmodul wirft absichtlich (nie_nan B2)"); };
try { T.rechnen(); } catch (e) {
  fehler.push("B2 rechnen() laesst die Pruefmodul-Ausnahme entkommen: " + e.message);
}
echtesKP.pruefeAlles = kpAlt;
fenster.KERN_PRUEFUNG = echtesKP;
anzahl++;
const e2 = T.App.ergebnis;
pruefe(b2Warf, "B2 die werfende Attrappe wurde gar nicht aufgerufen");
pruefe(e2 && !e2.fehlerhaft && Number.isFinite(e2.phi_gebaeude)
  && Math.abs(e2.phi_gebaeude - phiVorher) < 0.5,
  "B2 die fertige Zahl hat den Wurf des Pruefmoduls nicht ueberlebt (ist "
  + (e2 && e2.phi_gebaeude) + ", war " + phiVorher + ")");
pruefe((e2.warnungen || []).some(function (w) { return /Prüfliste/.test(w); }),
  "B2 der Hinweis auf die ausgefallene Pruefliste fehlt");
pruefe(T.App.pruefung === null, "B2 App.pruefung muesste null sein");

/* --- B3  Danach laeuft die echte Pruefung wieder ------------------------- */
try { T.rechnen(); } catch (e) { fehler.push("B3 rechnen() bricht ab: " + e.message); }
anzahl++;
pruefe(!!T.App.pruefung, "B3 nach der Wiederherstellung fehlt die Pruefliste");

/* ------------------- Teil C im eigenen Prozess nachziehen ---------------- */
const kind = require("child_process").spawnSync(
  process.execPath, [__filename, "--bericht"],
  { cwd: WURZEL, encoding: "utf8" });
const zeilen = String(kind.stdout || "").trim().split("\n");
let cErg = null;
try { cErg = JSON.parse(zeilen[zeilen.length - 1]); } catch (e) { /* unten gemeldet */ }
if (!cErg) {
  fehler.push("Teil C (Bericht) laesst sich nicht ausfuehren: "
    + String(kind.stderr || "").slice(-600));
} else {
  anzahl += cErg.anzahl;
  cErg.fehler.forEach(function (f) { fehler.push(f); });
}

/* --------------------------------------------------------------- Ergebnis */
console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl,
  fehler: fehler }));
process.exit(fehler.length === 0 ? 0 : 1);
