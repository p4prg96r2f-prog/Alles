/* ===========================================================================
 * hasenberg_echtlauf_test.js — ECHTER Durchlauf, festgehalten.
 * ===========================================================================
 * Grundlage ist der gespeicherte Stand eines echten Laufs vom 25.08.2026:
 * Hasenberg 10, Paderborn, zwei Blaetter (EG, OG), Auslese ueber den
 * Live-Endpunkt, Baujahr 1990 beantwortet. Abgelegt unter
 * validierung/echtlauf/hasenberg_lauf_2026-08-25.json (ohne Zugangsdaten).
 *
 * Geprueft werden die Kundenbefunde 3 und 4 vom 24.08.2026:
 *
 *  BEFUND 3 (Ebenenzaehlung): "Erfasst sind 2 beheizte Geschosse und
 *  2 unbeheizte Bereiche ... unabhaengig gezaehlt wurden nur 2 Ebenen."
 *  Unbeheizte ZONEN sind keine Ebenen des Raumbuchs; stimmen die beheizten
 *  Geschosse mit der unabhaengigen Zaehlung ueberein (2 = 2), ist die
 *  Zeile still gruen. Die Gegenprobe verlangt, dass eine WIRKLICH doppelt
 *  gefuehrte Ebene (3 beheizte gegen 2 gezaehlte) weiter auffaellt.
 *
 *  BEFUND 4 (Garage): eine Zone ohne trennendes Bauteil loest das Werkzeug
 *  selbst — erkennbar frei: still gruen; erkennbar angebaut: Wand als
 *  gekennzeichnete Annahme; sonst EIN-Klick-Frage mit zwei Antworten.
 *
 * Aufruf:  node validierung/hasenberg_echtlauf_test.js
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

/* --- Browserattrappe, wortgleich mit ziolkowski_test.js ---------------- */
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
  /* NACHGETRAGEN am 26.08.2026: diese fuenf Kerne standen in der
     Ladeliste der Probe NICHT, obwohl template.html sie im Browser laedt.
     Die Probe lief damit gegen eine ANDERE Anwendung als der Kollege:
     ohne KERN_HUELLENDECKUNG greift die Schranke "kein Keller vorhanden"
     nicht, ohne KERN_ANNAHMEN entsteht keine Baujahr-Annahme. */
  "src/kerne/kern_annahmen.js", "src/kerne/kern_huellendeckung.js",
  "src/kerne/kern_baujahrprobe.js", "src/kerne/kern_lage.js",
  "src/kerne/kern_flaeche.js",
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
appQuelle += "\n;window.__z = { App, leeresProjekt, rechnen, automatischErgaenzen, raeumeAusAusleseUebernehmen, nachleseAusschnitte };\n";
try { vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" }); }
catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__z;
const KB = fenster.MODUL_KONTROLLBLATT;

/* ===========================================================================
 * Der echte Stand
 * ======================================================================== */
const SICHERUNG = JSON.parse(fs.readFileSync(
  path.join(__dirname, "echtlauf/hasenberg_lauf_2026-08-25.json"), "utf8"));
function frisch() {
  /* Tief kopieren: jeder Abschnitt arbeitet auf seinem eigenen Stand. */
  const p = JSON.parse(JSON.stringify(SICHERUNG.projekt));
  T.App.p = Object.assign(T.leeresProjekt(), p);
  T.App.schritt = "rueckfragen";
  /* Derselbe Weg wie render(): erst ergaenzen, dann rechnen. */
  try { T.automatischErgaenzen(); } catch (e) {
    fehler.push("automatischErgaenzen: " + e.message); }
  try { T.rechnen(); } catch (e) { fehler.push("rechnen: " + e.message); }
  return T.App.p;
}
function zeile(p, id) {
  return KB.zaehler(p, {}).find(function (z) { return z.id === id; }) || null;
}

/* --- Abschnitt 1: Ebenenzaehlung ist still gruen ----------------------- */
{
  const p = frisch();
  pruefe(new Set((p.raeume || []).map(r => r.geschoss)).size === 2,
    "Der echte Stand traegt EG und OG");
  pruefe((p.zonen || []).length >= 2,
    "Der echte Stand traegt die Zonen Keller und Dachraum");
  const z = zeile(p, "geschosse");
  pruefe(!!z, "Es gibt eine Zeile zur Zahl der Geschosse");
  if (z) {
    pruefe(z.stufe === "gut",
      "Befund 3: die Ebenenzeile ist still gruen (ist: " + z.stufe + ")");
    pruefe(z.art === "pruefung",
      "Befund 3: die Zeile ist eine bestandene Pruefung, keine Frage");
    pruefe(/keine eigenen Ebenen|keine Ebenen des Raumbuchs/.test(z.text || ""),
      "Befund 3: der Text sagt, dass Zonen keine Raumbuch-Ebenen sind");
  }
}

/* --- Abschnitt 2 (Gegenprobe): doppelt gefuehrte Ebene faellt weiter auf */
{
  const p = frisch();
  /* Ein drittes beheiztes Geschoss, das die unabhaengige Zaehlung (EG, OG)
     nicht kennt — der Fall, den die Zeile fangen soll. */
  p.raeume.push({ id: "r_doppel", geschoss: "DG", name: "Doppelt gefuehrt",
    art: "wohnen", A: 40, h: 2.5, bauteile: [] });
  const z = zeile(p, "geschosse");
  pruefe(!!z && z.art === "befund" && z.stufe !== "gut",
    "Gegenprobe: 3 beheizte Geschosse gegen 2 gezaehlte Ebenen bleiben ein Befund");
  pruefe(!!z && z.aufhebbar === true,
    "Gegenprobe: der Befund ist mit EINEM Klick zur Kenntnis zu nehmen");
}

/* --- Abschnitt 3 (Gegenprobe): fehlende Ebene bleibt gesperrt ---------- */
{
  const p = frisch();
  /* Die unabhaengige Zaehlung nennt drei Ebenen, das Raumbuch hat zwei
     plus zwei Zonen: mehr gezaehlt als da ist -> Heizlast zu klein,
     die Sperre muss bleiben. */
  p.plan.seiten[0].gegenprobe.ebenen = [
    { bezeichnung: "Erdgeschoss" }, { bezeichnung: "Obergeschoss" },
    { bezeichnung: "1. Obergeschoss" }, { bezeichnung: "Kellergeschoss" },
    { bezeichnung: "Dachgeschoss" }];
  const z = zeile(p, "geschosse");
  pruefe(!!z && z.art === "befund",
    "Gegenprobe: mehr unabhaengig gezaehlte Ebenen als erfasste bleiben ein Befund");
}

/* --- Abschnitt 4: Garage ohne Lagewissen -> EIN-Klick-Frage ------------ */
{
  const p = frisch();
  KB.zoneAnlegen(p, "Garage", false);
  const z = zeile(p, "zone_ohne_bauteil");
  pruefe(!!z, "Eine Garage ohne trennendes Bauteil erzeugt die Zeile");
  if (z) {
    pruefe(z.stufe === "warnung",
      "Garage ohne Lagewissen: die Zeile bleibt ein Befund (Warnung)");
    const ak = (z.aktionen || []).map(a => a.aktion);
    pruefe(ak.indexOf("kbZoneFrei") >= 0,
      "Garage ohne Lagewissen: Antwort [Steht frei] steht in der Zeile");
    pruefe(ak.indexOf("kbZoneAngebaut") >= 0,
      "Garage ohne Lagewissen: Antwort [Angebaut an ...] steht in der Zeile");
    pruefe(/zu klein/.test(z.text || ""),
      "Die vorsichtige Richtung steht in der Zeile: fehlende Trennwand = zu klein");
  }
}

/* --- Abschnitt 5: [Steht frei] macht die Zeile still gruen ------------- */
{
  const p = frisch();
  KB.zoneAnlegen(p, "Garage", false);
  const vorher = zeile(p, "zone_ohne_bauteil");
  const g = (p.zonen || []).find(z => /garage/i.test(z.name || z.id));
  pruefe(!!g, "Die Garagenzone ist angelegt");
  if (g) {
    KB.aktion("kbZoneFrei", { dataset: { kbName: String(g.id) } });
    const z = zeile(p, "zone_ohne_bauteil");
    pruefe(!!vorher && !!z && z.stufe === "gut" && z.art === "pruefung",
      "Nach [Steht frei] ist die Zeile gruen: freistehend, 0 W ist richtig");
    pruefe(/freistehend/.test((z && z.text) || ""),
      "Der Text sagt: freistehend, 0 W ist richtig");
  }
}

/* --- Abschnitt 6: Lagewissen "angebaut" -> Wand entsteht als Annahme --- */
{
  const p = frisch();
  /* Die Lesung sagt ausdruecklich: angebaut. So stand es im Kundenlauf
     ("vermutlich Garage rechts im Bild", "angebaut"). */
  p.plangebaeude = p.plangebaeude || {};
  p.plangebaeude.unbeheizte_bereiche =
    (p.plangebaeude.unbeheizte_bereiche || []).concat(["Garage (angebaut)"]);
  KB.zoneAnlegen(p, "Garage (angebaut)", true);
  try { T.automatischErgaenzen(); T.rechnen(); }
  catch (e) { fehler.push("rechnen (angebaut): " + e.message); }
  const g = (p.zonen || []).find(z => /garage/i.test(z.name || z.id));
  const wand = [];
  (p.raeume || []).forEach(function (r) {
    (r.bauteile || []).forEach(function (b) {
      if (g && b.grenzt_an && b.grenzt_an.typ === "zone"
          && String(b.grenzt_an.ref) === String(g.id)) wand.push({ r: r, b: b });
    });
  });
  pruefe(wand.length === 1,
    "Angebaut laut Lesung: GENAU EINE trennende Wand entsteht (" + wand.length + ")");
  if (wand.length) {
    pruefe(wand[0].b.A > 0, "Die Wand hat eine Flaeche groesser 0");
    pruefe(wand[0].b.sicher === false && /Annahme/i.test(wand[0].b.herkunft || ""),
      "Die Wandflaeche ist als Annahme gekennzeichnet");
    pruefe(/zu klein/.test(wand[0].b.herkunft || ""),
      "Der Richtungshinweis steht an der Wand: ohne sie waere die Heizlast zu klein");
  }
  const z = zeile(p, "zone_ohne_bauteil");
  pruefe(!z || z.stufe === "gut",
    "Mit angelegter Wand ist die Garagenzeile keine offene Frage mehr");
}

/* --- Abschnitt 7 (Gegenprobe): Wissen weg -> Frage kommt wieder -------- */
{
  const p = frisch();
  KB.zoneAnlegen(p, "Garage", false);
  const g = (p.zonen || []).find(z => /garage/i.test(z.name || z.id));
  KB.aktion("kbZoneFrei", { dataset: { kbName: String(g.id) } });
  /* Zone loeschen und neu anlegen: die Antwort gehoert zur Zone, nicht zum
     Projekt — eine NEUE Garage ohne Lagewissen muss wieder fragen. */
  p.zonen = (p.zonen || []).filter(z => z.id !== g.id);
  KB.zoneAnlegen(p, "Garage", false);
  const z = zeile(p, "zone_ohne_bauteil");
  pruefe(!!z && z.stufe === "warnung",
    "Gegenprobe: neue Garage ohne Lagewissen fragt wieder");
}

/* --- Abschnitt 8: die Heizlast des echten Standes, vorher und nachher -- */
let kwOhne = null, kwMit = null;
{
  frisch();
  const e = T.App.ergebnis || {};
  kwOhne = e.phi_gebaeude > 0 ? Math.round(e.phi_gebaeude / 10) / 100 : null;
  pruefe(kwOhne !== null && kwOhne > 5 && kwOhne < 40,
    "Die Heizlast des echten Standes liegt in einer plausiblen Spanne: "
      + kwOhne + " kW");
  /* Mit angebauter Garage samt selbst angelegter Trennwand steigt sie —
     die Wand traegt Verlust, nie umgekehrt. */
  const p = T.App.p;
  p.plangebaeude.unbeheizte_bereiche =
    (p.plangebaeude.unbeheizte_bereiche || []).concat(["Garage (angebaut)"]);
  KB.zoneAnlegen(p, "Garage (angebaut)", true);
  try { T.automatischErgaenzen(); T.rechnen(); } catch (e2) {
    fehler.push("rechnen (Abschnitt 8): " + e2.message); }
  const e2 = T.App.ergebnis || {};
  kwMit = e2.phi_gebaeude > 0 ? Math.round(e2.phi_gebaeude / 10) / 100 : null;
  pruefe(kwMit !== null && kwMit > kwOhne,
    "Die Trennwand zur Garage ERHOEHT die Heizlast (vorsichtige Richtung): "
      + kwOhne + " kW -> " + kwMit + " kW");
}

/* --- Abschnitt 9: die 20 Raeume des Blattsatzes ------------------------
 * REGRESSION vom 26.08.2026: im Fuenf-Plan-Lauf kamen aus demselben
 * Blattsatz nur noch 12 Raeume und 181,15 m² statt 20 Raeume und
 * 280,76 m² (Stempelsumme des Plans) — 13,69 statt rund 21 kW. Dieser
 * Abschnitt haelt den Weg VOM ROHEN LESEERGEBNIS INS RAUMBUCH fest: aus
 * den gespeicherten Auslesen der beiden Blaetter (16 + 6 Raeume) muessen
 * 20 Raeume werden. Die zwei Garderoben sind Einbauteile und gehoeren mit
 * Vermerk NICHT ins Raumbuch (Kundenbefund 25.08.2026) — 22 minus 2. */
{
  const p = JSON.parse(JSON.stringify(SICHERUNG.projekt));
  p.raeume = []; p.offeneFragen = [];
  (p.plan.seiten || []).forEach(function (s) {
    s.uebernommen = false; s.stempelUebernommen = false;
  });
  T.App.p = Object.assign(T.leeresProjekt(), p);
  T.App.schritt = "rueckfragen";
  try { T.raeumeAusAusleseUebernehmen(); }
  catch (e) { fehler.push("raeumeAusAusleseUebernehmen: " + e.message); }
  const raeume = T.App.p.raeume || [];
  const summe = Math.round(raeume.reduce(function (a, x) {
    return a + (Number(x.A) || 0); }, 0) * 100) / 100;
  pruefe(raeume.length === 20,
    "Aus den gespeicherten Auslesen entstehen 20 Raeume (ist: "
      + raeume.length + ")");
  pruefe(summe === 280.76,
    "Die Flaechensumme des Raumbuchs ist die Stempelsumme 280,76 m² (ist: "
      + summe + ")");
  const flure = raeume.filter(function (x) {
    return x.geschoss === "EG" && /^flur$/i.test(String(x.name || "")); });
  pruefe(flure.length === 2,
    "Beide gleichnamigen EG-Flure bleiben stehen — die Entdopplung streicht "
      + "keinen echten Raum (ist: " + flure.length + ")");
  pruefe(!raeume.some(function (x) { return /garderobe/i.test(x.name || ""); }),
    "Die beiden Garderoben bleiben als Einbauteil draussen");
}

/* --- Abschnitt 10: die gezielte Nachlesung sucht im ZERLEGTEN Blatt ----
 * URSACHE der Regression: Blatt 1 traegt ZWEI Zeichnungsfelder, aber nur
 * EINE gezeichnete Ebene. Die Zuordnung Feld zu Ebene ueber die
 * Reihenfolge griff deshalb nicht, und die Nachlesung fiel auf „das ganze
 * Blatt" zurueck — auf genau den Durchgang, der vorher an der
 * Laengengrenze abriss. Sie konnte nichts finden; 8 gezaehlte Raeume
 * blieben als offene Frage stehen, die Rechnung lief mit 12 Raeumen
 * weiter. Jetzt werden zuerst die Felder gelesen, das ganze Blatt zuletzt. */
{
  const f = { ebene: "Erdgeschoss", index: 0, fehlt: ["WC", "Flur"],
              alle: ["WC", "Flur"] };
  const feld = function (x) { return { x: x, y: 0, x2: x + 0.5, y2: 1 }; };
  const zwei = T.nachleseAusschnitte(
    { felder: [feld(0), feld(0.5)] }, f, 1);
  pruefe(zwei.length === 3,
    "Zwei Felder, eine Ebene: drei Versuche (beide Felder, dann das Blatt), "
      + "ist: " + zwei.length);
  pruefe(!!(zwei[0]||{}).rect && !!(zwei[1]||{}).rect
      && (zwei[2] || {}).rect === null,
    "Die Felder kommen zuerst, das ganze Blatt zuletzt");
  pruefe(/ganzen Blatt/.test((zwei[2] || {}).wo || ""),
    "Der letzte Versuch ist als „auf dem ganzen Blatt“ benannt");
  /* Gegenprobe 1: passt die Zuordnung (zwei Felder, zwei Ebenen), fuehrt
     weiterhin das Feld der Ebene. */
  const passend = T.nachleseAusschnitte(
    { felder: [feld(0), feld(0.5)] },
    { ebene: "Obergeschoss", index: 1, fehlt: ["Bad"], alle: ["Bad"] }, 2);
  pruefe(/Zeichnungsfeld 2 von 2/.test((passend[0] || {}).wo || ""),
    "Bei passender Zahl fuehrt das zugeordnete Feld (ist: "
      + ((passend[0] || {}).wo || "nichts") + ")");
  /* Gegenprobe 2: ein Bogen ohne Felder, der schon einmal an seinem Umfang
     gescheitert ist, wird in Haelften nachgelesen — nicht noch einmal ganz. */
  const bogen = T.nachleseAusschnitte(
    { felder: [], rettungVersucht: "haelften" }, f, 1);
  pruefe(bogen.length === 3 && (bogen[0] || {}).rect
      && /Hälfte 1/.test((bogen[0] || {}).wo || ""),
    "Ein schon gescheiterter Bogen wird zuerst in Haelften nachgelesen");
  /* Gegenprobe 3: ein gewoehnliches Blatt ohne Felder und ohne Rettung
     kostet weiterhin genau EINEN Versuch. */
  const einfach = T.nachleseAusschnitte({ felder: [] }, f, 1);
  pruefe(einfach.length === 1 && (einfach[0] || {}).rect === null,
    "Ohne Not bleibt es bei einem einzigen Versuch (ist: "
      + einfach.length + ")");
}

/* ======================================================================== */
console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl,
  fehler: fehler, heizlast_kw: kwOhne, heizlast_mit_garagenwand_kw: kwMit }));
process.exit(fehler.length === 0 ? 0 : 1);
