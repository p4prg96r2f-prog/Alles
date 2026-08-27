/* ===========================================================================
 * befunde_2026-08-26_test.js — die Befunde der Fuenf-Plan-Pruefung vom
 * 26.08.2026, jeder mit einem Waechter.
 * ===========================================================================
 * Geprueft werden die Blocker und die mittelschweren Befunde aus den fuenf
 * Protokollen (Hasenberg 10, Bauantrag Soethe, BV 2-0887 Ziolkowski,
 * Dumach 1, 1754 BA 2018-03-13). Wo ein gespeicherter Echtlauf-Stand
 * vorliegt, laeuft die Probe an IHM; wo keiner vorliegt (Dumach, Frankenburg
 * — beide Laeufe wurden nicht abgelegt), steht der Fall nachgestellt da und
 * ist im Abschnittskopf als NACHGESTELLT gekennzeichnet.
 *
 * Aufruf:  node validierung/befunde_2026-08-26_test.js
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
appQuelle += "\n;window.__z = { App, leeresProjekt, rechnen, automatischErgaenzen, raeumeAusAusleseUebernehmen, nachleseAusschnitte, vorschlagBaujahr, verbrauchAblegen, urteilBerechnen, rueckfragenListe, geschossKanon, schrittErgebnis };\n";
try { vm.runInContext(appQuelle, umgebung, { filename: "src/app.js" }); }
catch (e) {
  console.log(JSON.stringify({ ok: false, anzahl: 1, fehler: ["app.js: " + e.message] }));
  process.exit(1);
}
const T = fenster.__z;
const KB = fenster.MODUL_KONTROLLBLATT;
const B = fenster.MODUL_BERICHT;
const BW = fenster.MODUL_BEWERTUNG;
const KI = fenster.MODUL_KI;
const KP = fenster.KERN_PRUEFUNG;
const RH = B.rechenhilfen;

function stand(datei) {
  const roh = JSON.parse(fs.readFileSync(path.join(__dirname, "echtlauf", datei), "utf8"));
  const p = roh.projekt ? roh.projekt : roh;
  T.App.p = Object.assign(T.leeresProjekt(), JSON.parse(JSON.stringify(p)));
  T.App.schritt = "rueckfragen";
  try { T.automatischErgaenzen(); } catch (e) { fehler.push("ergaenzen: " + e.message); }
  try { T.rechnen(); } catch (e) { fehler.push("rechnen: " + e.message); }
  return T.App.p;
}
function druckText() {
  return RH.nurText(B.dokument({ fassung: "druck" }).html);
}

/* ===================================================================== *
 * 1  Hasenberg, Befund 1 (BLOCKER): das Blattdatum wird nicht zum
 *    Baujahr-Vorschlag, wenn das Blatt eine Bestandsunterlage ist.
 *    NACHGESTELLT (der Lauf vom 26.08. wurde nicht abgelegt): der Stand
 *    vom 25.08. bekommt denselben Befund, den KERN_ANNAHMEN erzeugt.
 * ===================================================================== */
{
  const p = stand("hasenberg_lauf_2026-08-25.json");
  p.meta.baujahr = "";
  p.meta_herkunft = p.meta_herkunft || {};
  p.meta_herkunft.plandatum = { wert: "12.03.2025", blatt: "Hasenberg 10 EG" };
  p.annahmen = p.annahmen || {};
  p.annahmen.baujahr_nicht = {
    stufe: "nicht_moeglich", plandatum_jahr: 2025,
    begruendung: "Das Blatt ist als Bestandsunterlage gelesen worden. Sein "
      + "Datum 2025 ist das Aufnahmedatum und nicht das Baujahr. Das Baujahr "
      + "ist einzutragen.",
  };
  const v = T.vorschlagBaujahr(p);
  pruefe(!!v, "Zur Baujahrfrage muss ein Vorschlagsobjekt entstehen");
  pruefe(!!v && v.art === "ohne",
    "Aus einer Bestandsunterlage darf KEIN Baujahr-Wert vorgeschlagen werden "
    + "(ist: " + JSON.stringify(v && v.art) + ")");
  pruefe(!!v && String(v.ohne || "").indexOf("2025") >= 0,
    "Die Begruendung nennt das Datum, aus dem kein Baujahr wird");
  pruefe(!!v && String(v.ohne || "").length > 30,
    "Ohne-Vorschlag muss ausreichend begruendet sein");
  /* Gegenprobe: ohne den Befund bleibt der Vorschlag bestehen — eine
     Neubauplanung datiert ihr Gebaeude sehr wohl. */
  delete p.annahmen.baujahr_nicht;
  const v2 = T.vorschlagBaujahr(p);
  pruefe(!!v2 && v2.art !== "ohne",
    "Ohne Bestandsbefund bleibt das Plandatum ein zulaessiger Vorschlag");
}

/* ===================================================================== *
 * 2  Hasenberg, Befund 2 (BLOCKER): eine freigegebene Kernaussage faellt
 *    nicht mit ihrer beanstandeten Begruendung.
 * ===================================================================== */
{
  const p = {};
  BW.uebernehmen({ felder: [
    { pfad: "kap1_punkte.0.kern", ok: true,
      text: "Der U-Wert der Außenwand ist eine Typologie-Annahme und nicht am "
        + "Gebäude gemessen." },
    { pfad: "kap1_punkte.0.text", ok: false, unbekannt: ["1969", "1978"],
      text: "Baualtersklasse 1969 bis 1978." },
  ] }, p);
  const pk = (p.texte && p.texte.kap1_punkte) || [];
  pruefe(pk.length === 1, "Die freigegebene Kernaussage bleibt stehen");
  pruefe(pk.length === 1 && /Typologie-Annahme/.test(pk[0].kern),
    "Es ist die freigegebene Kernaussage, die stehen bleibt");
  pruefe(pk.length === 1 && !pk[0].text,
    "Die beanstandete Begruendung wird NICHT mit uebernommen");
  pruefe(BW.fehlt(p) === false,
    "Ein Bericht mit Kernaussage gilt nicht als ohne bewertende Absaetze");
}

/* ===================================================================== *
 * 3  Hasenberg, Befund 6 (MITTEL): Foerder- und Guetevokabular kommt nicht
 *    durch die Absatzpruefung in die Druckfassung.
 * ===================================================================== */
{
  const paket = { zahlen: {} };
  const pr = BW.pruefeZahlen({ kap1_punkte: [{
    kern: "Die Bauteile bleiben hinter der Anforderung zurück.",
    text: "Gemessen an der für die Förderung geprüften Anforderung liegt die "
      + "Außenwand darüber.",
  }] }, paket, null);
  const kern = pr.felder.find(function (x) { return /Kernaussage/.test(x.titel); });
  const begr = pr.felder.find(function (x) { return /Begründung/.test(x.titel); });
  pruefe(!!begr && begr.ok === false,
    "Ein Absatz mit Foerderaussage darf nicht uebernehmbar sein");
  pruefe(!!begr && begr.sperre === true,
    "Foerdervokabular ist eine Sperre, kein 'trotzdem uebernehmen'");
  pruefe(!!begr && (begr.vokabular || []).length > 0,
    "Der Befund nennt das beanstandete Vokabular");
  pruefe(!!kern, "Auch die Kernaussage wird geprueft");
  /* Gegenprobe: derselbe Satz ohne Foerderwort und ohne Zahl geht durch. */
  const pr2 = BW.pruefeZahlen({ kap1_punkte: [{
    kern: "Die Außenwand trägt den größten Anteil der Transmission.",
    text: "Sie ist die größte zusammenhängende Fläche der Hülle.",
  }] }, paket, null);
  pruefe(pr2.felder.every(function (x) { return x.ok; }),
    "Ein sachlicher Absatz ohne Zahl und ohne Guetewort bleibt uebernehmbar");
}

/* ===================================================================== *
 * 4  Hasenberg, Befund 4 (MITTEL): die Kachel zaehlt FENSTER, nicht
 *    Fensterzeilen. NACHGESTELLT ueber ein Raumbuch mit Sammelzeilen.
 * ===================================================================== */
{
  const p = stand("hasenberg_lauf_2026-08-25.json");
  let zeilen = 0, stueck = 0;
  (p.raeume || []).forEach(function (r) {
    (r.bauteile || []).forEach(function (b) {
      if (String(b.art || "") !== "fenster") return;
      zeilen++;
      const n = Number(b.anzahl);
      stueck += Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
    });
  });
  let urteil = null;
  try { urteil = T.urteilBerechnen(); } catch (x) { urteil = null; }
  pruefe(stueck >= zeilen,
    "Die Stueckzahl kann nicht kleiner sein als die Zahl der Zeilen");
  pruefe(!!urteil, "Das Urteil muss sich berechnen lassen");
  if (urteil) {
    pruefe(urteil.zahlen.fenster === stueck,
      "Die Kachel muss " + stueck + " Fenster zeigen, zeigt aber "
        + urteil.zahlen.fenster);
  }
}

/* ===================================================================== *
 * 5  Hasenberg, Befund 2/5 und Frankenburg B6 (BLOCKER): der KUNDENBERICHT
 *    sagt, woraus gerechnet wurde — U-Werte, Hoehe, Fensterflaechen,
 *    Baujahrherkunft — und zwar ohne das gesperrte Druckvokabular.
 * ===================================================================== */
{
  stand("hasenberg_lauf_2026-08-25.json");
  const txt = druckText();
  pruefe(txt.indexOf("Woraus gerechnet wurde") >= 0,
    "Die Druckfassung fuehrt den Abschnitt zur Herkunft der Eingangswerte");
  pruefe(/Gebäudetypologie des Instituts Wohnen und Umwelt/.test(txt),
    "Die Druckfassung nennt die Herkunft der U-Werte");
  pruefe(/kein U-Wert gemessen/.test(txt),
    "Die Druckfassung sagt, dass am Gebaeude nicht gemessen wurde");
  pruefe(/Lichte Raumhöhe/.test(txt),
    "Die Druckfassung nennt die angesetzte lichte Hoehe");
  pruefe(/Fensterflächen/.test(txt),
    "Der Fenster-Vorbehalt steht auch in der Druckfassung");
  const verboten = RH.druckSuche(B.dokument({ fassung: "druck" }).html);
  pruefe(verboten.length === 0,
    "Die Druckfassung bleibt frei vom gesperrten Vokabular: "
      + verboten.slice(0, 3).map(function (x) { return x.regel; }).join(" / "));
}

/* ===================================================================== *
 * 6  Ziolkowski, Befund 6 (MITTEL): jedes Bauteil, das Waerme traegt,
 *    steht im Bericht — auch ohne eigenen Bauteiltyp.
 * ===================================================================== */
{
  const p = stand("ziolkowski_lauf4_fenster.json");
  const e = T.App.ergebnis;
  const benutzt = {};
  ((e && e.raeume) || []).forEach(function (r) {
    (r.bauteile || []).forEach(function (b) {
      if (b.kat === "innen") return;
      benutzt[String(b.name).split(" (")[0]] = true;
    });
  });
  const txt = druckText();
  Object.keys(benutzt).forEach(function (k) {
    pruefe(txt.indexOf(k) >= 0,
      "Bauteil „" + k + "“ traegt Waerme, steht aber nicht im Bericht");
  });
  const typen = (p.bauteiltypen || []).map(function (t) {
    return String(t.name || "").split(" (")[0]; });
  const ohneTyp = Object.keys(benutzt).filter(function (k) {
    return typen.indexOf(k) < 0; });
  pruefe(true, "Bauteile ohne eigenen Typ in diesem Stand: " + ohneTyp.length);
}

/* ===================================================================== *
 * 7  Ziolkowski, Befund 4 (MITTEL): die Zustandssperre schlaegt nicht mehr
 *    bei attributivem Gebrauch und nicht bei einer blossen Ortsangabe an.
 * ===================================================================== */
{
  const z = BW.zustandAusProjekt({ zonen: [], plangebaeude: {} }, { raeume: [
    { geschoss: "KG", raum: "KELLER", theta_i: 20, phi_raum: 431 },
    { geschoss: "OG", raum: "KIND", theta_i: 20, phi_raum: 900 },
  ] });
  const still = [
    "Der Dachanschluss und die angrenzenden unbeheizten Bereiche wirken sich "
      + "im OG stärker aus.",
    "Im EG grenzen mehrere Räume an unbeheizte Nachbarbereiche.",
    "Unbeheizt ist allein der Spitzboden über dem Obergeschoss.",
  ];
  still.forEach(function (s) {
    pruefe(BW.pruefeZustandText(s, z).length === 0,
      "Fehlalarm der Zustandssperre: „" + s + "“");
  });
  /* NICHT GELOCKERT: der echte Widerspruch wird weiter gefunden. */
  const hart = [
    "Unbeheizt sind das Kellergeschoss, soweit unterkellert, und der Spitzboden.",
    "Der unbeheizte Keller liegt unter dem Erdgeschoss.",
    "Im Keller ist es unbeheizt.",
  ];
  hart.forEach(function (s) {
    pruefe(BW.pruefeZustandText(s, z).length > 0,
      "Der echte Widerspruch muss weiter anschlagen: „" + s + "“");
  });
}

/* ===================================================================== *
 * 8  Ziolkowski, Befund 2 (BLOCKER): wird ein GESCHOSS unbeheizt gesetzt,
 *    verlaesst es das beheizte Raumbuch. Sonst fuehrt der Bericht dasselbe
 *    Geschoss gleichzeitig als unbeheizt und mit 20 Grad beheizt.
 * ===================================================================== */
{
  const p = stand("ziolkowski_lauf4_fenster.json");
  const kgVorher = (p.raeume || []).filter(function (r) {
    return /^kg/i.test(String(r.geschoss || "")); }).length;
  pruefe(kgVorher > 0, "Der Stand fuehrt beheizte Raeume im Kellergeschoss");
  KB.zoneAnlegen(p, "KELLERGESCHOSS", false);
  const kgNachher = (p.raeume || []).filter(function (r) {
    return /^kg/i.test(String(r.geschoss || "")); }).length;
  pruefe(kgNachher === 0,
    "Nach dem Anlegen der Zone darf kein beheizter Raum des Kellergeschosses "
    + "mehr im Raumbuch stehen (ist: " + kgNachher + ")");
  pruefe((p.raeume_unbeheizt || []).length === kgVorher,
    "Die Raeume sind nicht geloescht, sondern beiseite gelegt");
  pruefe((p.raeume || []).length > 0,
    "Die uebrigen Geschosse bleiben unberuehrt");
}

/* ===================================================================== *
 * 9  Frankenburg B2/B4 (BLOCKER), NACHGESTELLT: "OG" und "1.OG" sind
 *    DASSELBE Geschoss. Ein Raumbuch mit "OG" darf kein zusaetzliches
 *    "1.OG" als angenommenes Geschoss erzeugen.
 * ===================================================================== */
{
  const p = T.leeresProjekt();
  p.raeume = [
    { id: "r1", geschoss: "EG", name: "WOHNEN", art: "wohnen", A: 40, h: 2.6, bauteile: [] },
    { id: "r2", geschoss: "OG", name: "SCHLAFEN", art: "wohnen", A: 40, h: 2.6, bauteile: [] },
  ];
  p.plangebaeude = { geschosse: "EG, 1.OG" };
  const fehlend = KB.fehlendeGeschosse(p, {});
  const alsOG = fehlend.filter(function (x) {
    return /og/i.test(String(x.kuerzel || "")); });
  pruefe(alsOG.length === 0,
    "„1.OG" + "“ darf nicht als fehlendes Geschoss gelten, wenn „OG“ im "
    + "Raumbuch steht (gefunden: " + alsOG.map(function (x) {
      return x.kuerzel; }).join(", ") + ")");
  const vorher = p.raeume.length;
  KB.geschossAnlegen(p, { kuerzel: "1.OG", A: 120, quelle: "Probe",
    grund: "Probe" }, true);
  pruefe(p.raeume.length === vorher,
    "geschossAnlegen darf fuer eine bereits belegte Ebene nichts anlegen");
  /* Gegenprobe: ein wirklich fehlendes Geschoss faellt weiter auf. */
  const p2 = T.leeresProjekt();
  p2.raeume = [{ id: "r1", geschoss: "EG", name: "WOHNEN", art: "wohnen",
    A: 40, h: 2.6, bauteile: [] }];
  p2.plangebaeude = { geschosse: "EG, 1.OG" };
  pruefe(KB.fehlendeGeschosse(p2, {}).length > 0,
    "Ein wirklich fehlendes Obergeschoss muss weiter gemeldet werden");
}

/* ===================================================================== *
 * 10  Dumach Befund 1 (MITTEL): eine Wohnungsbezeichnung ist kein Raum.
 * ===================================================================== */
{
  [["WHG1", false], ["WHG 2", false], ["Wohnung 3", false], ["WE 1", false],
   ["Wohnen", true], ["Wohnzimmer", true], ["Wohnen/Essen", true],
   ["Werkstatt", true], ["WC", true]].forEach(function (x) {
    pruefe(KI.istRaumname(x[0]) === x[1],
      "istRaumname(" + JSON.stringify(x[0]) + ") muss " + x[1] + " sein");
  });
}

/* ===================================================================== *
 * 11  Frankenburg B7 (BLOCKER), NACHGESTELLT: eine Aussenwandlaenge, die
 *     das Dreifache des kleinstmoeglichen Geschossumfangs uebersteigt,
 *     faellt auf. Ein normales Haus loest keinen Fehlalarm aus.
 * ===================================================================== */
{
  const zuViel = { V_gesamt: 12000, raeume: [] };
  for (let i = 0; i < 20; i++) {
    zuViel.raeume.push({ geschoss: "EG", A: 61, h: 2.6, bauteile: [
      { kat: "huelle", art: "wand", name: "Außenwand", A: 110 }] });
  }
  const t1 = KP.pruefeAlles({ raeume: zuViel.raeume, bauteiltypen: [], zonen: [] },
    zuViel, {});
  const l1 = (t1.pruefungen || t1 || []).filter(function (x) {
    return /wandueberschuss/.test(String(x.id || "")); });
  pruefe(l1.length === 1,
    "846 m Wandlaenge auf 1.220 m² Geschossflaeche muessen auffallen");
  const normal = { V_gesamt: 300, raeume: [] };
  for (let i = 0; i < 6; i++) {
    normal.raeume.push({ geschoss: "EG", A: 20, h: 2.6, bauteile: [
      { kat: "huelle", art: "wand", name: "Außenwand", A: 15 }] });
  }
  const t2 = KP.pruefeAlles({ raeume: normal.raeume, bauteiltypen: [], zonen: [] },
    normal, {});
  const l2 = (t2.pruefungen || t2 || []).filter(function (x) {
    return /wandueberschuss/.test(String(x.id || "")); });
  pruefe(l2.length === 0,
    "Ein normal geschnittenes Haus darf keinen Fehlalarm ausloesen");
}

/* ===================================================================== *
 * 12  Hasenberg Befund 8 (KLEIN): was im Freien liegt, verlangt keine
 *     unbeheizte Zone und steht nicht im Kundenbericht.
 * ===================================================================== */
{
  const p = T.leeresProjekt();
  p.plangebaeude = { unbeheizte_bereiche: ["Terrasse (unbeheizt, außen)",
    "Garage", "Spitzboden"] };
  const bereiche = KB.bereicheZusammenfuehren
    ? KB.bereicheZusammenfuehren(p) : null;
  if (bereiche) {
    const namen = bereiche.map(function (x) { return x.name; }).join(" | ");
    pruefe(!/Terrasse/i.test(namen),
      "Eine Terrasse ist kein unbeheizter Bereich: " + namen);
    pruefe(/Garage/i.test(namen) && /Spitzboden/i.test(namen),
      "Garage und Spitzboden bleiben unbeheizte Bereiche: " + namen);
  } else {
    pruefe(false, "bereicheZusammenfuehren ist nicht erreichbar");
  }
}

/* ===================================================================== *
 * 13  Soethe B6 (MITTEL): der Satz "groesser als die Gebaeudeheizlast"
 *     steht auf der Ergebnisseite nur, wenn er stimmt.
 * ===================================================================== */
{
  const p = stand("soethe_lauf_2026-08-26.json");
  const e = T.App.ergebnis || {};
  const groesser = Number(e.phi_raeume_summe) > Number(e.phi_gebaeude) + 0.5;
  let html = "";
  try { html = T.schrittErgebnis ? T.schrittErgebnis() : ""; } catch (x) { html = ""; }
  if (!html && typeof fenster.raumlastenKarte === "function") {
    try { html = fenster.raumlastenKarte(); } catch (x) { html = ""; }
  }
  if (html) {
    const sagt = /größer als die Gebäudeheizlast/.test(html);
    pruefe(sagt === groesser,
      "Der Satz zur Summe der Raumheizlasten muss dem Zahlenstand folgen "
      + "(Summe " + Math.round(Number(e.phi_raeume_summe) || 0) + " W, Gebaeude "
      + Math.round(Number(e.phi_gebaeude) || 0) + " W)");
  } else {
    pruefe(false, "Die Ergebnisseite muss sich zeichnen lassen");
  }
}

/* ===================================================================== *
 * 14  Soethe B2 (BLOCKER): sagt eine Lesung mit Konfidenz "sicher", dass
 *     es keinen Keller gibt, entsteht weder Zone noch Kellerdecke.
 * ===================================================================== */
{
  const p = stand("soethe_lauf_2026-08-26.json");
  const H = fenster.KERN_HUELLENDECKUNG;
  const k = H && H.kellerAussage ? H.kellerAussage(p.planbefunde) : null;
  pruefe(!!k && k.art === "kein_keller" && k.konfidenz === "sicher",
    "Der Stand traegt den Befund „Kein Keller vorhanden" + "“ mit Konfidenz sicher");
  const zonen = (p.zonen || []).map(function (z) { return String(z.name || ""); });
  pruefe(!zonen.some(function (n) { return /keller/i.test(n); }),
    "Es darf keine Kellerzone entstehen: " + zonen.join(", "));
  let kd = 0;
  (p.raeume || []).forEach(function (r) {
    (r.bauteile || []).forEach(function (b) {
      if (/kellerdecke/i.test(String(b.name || ""))) kd += Number(b.A) || 0;
    });
  });
  pruefe(kd === 0, "Es darf keine Kellerdecke entstehen (ist: " + kd + " m²)");
}

/* ===================================================================== *
 * 15  Der Aufwand der Auswertung wird fortgeschrieben, nicht doppelt
 *     gebucht — und er steht in der internen Fassung.
 * ===================================================================== */
{
  const p = stand("hasenberg_lauf_2026-08-25.json");
  T.App.auslese = { kosten: 0.40, aufrufe: 10, aufrufeFertig: 10 };
  p.verbrauch = null;
  T.verbrauchAblegen(2, "Planauslese");
  const v1 = T.App.p.verbrauch;
  pruefe(!!v1 && v1.lesungen === 10, "Erste Buchung: 10 Lesungen");
  T.verbrauchAblegen(0, "Nochmal");
  pruefe(T.App.p.verbrauch.lesungen === 10,
    "Ohne Zuwachs darf nichts nachgebucht werden (ist: "
      + T.App.p.verbrauch.lesungen + ")");
  T.App.auslese.aufrufe = 11;
  T.App.auslese.aufrufeFertig = 11;
  T.App.auslese.kosten = 0.44;
  T.verbrauchAblegen(0, "Bewertende Absätze");
  pruefe(T.App.p.verbrauch.lesungen === 11,
    "Der Zuwachs der bewertenden Absaetze wird nachgebucht (ist: "
      + T.App.p.verbrauch.lesungen + ")");
  pruefe(Math.abs(T.App.p.verbrauch.kosten - 0.44) < 1e-6,
    "Die Kosten werden nicht doppelt gezaehlt (ist: "
      + T.App.p.verbrauch.kosten + ")");
  const intern = RH.nurText(B.dokument({ fassung: "intern" }).html);
  pruefe(/Aufwand der Auswertung/.test(intern),
    "Die interne Fassung weist den Aufwand aus");
  const druck = druckText();
  pruefe(!/Aufwand der Auswertung/.test(druck),
    "Die Druckfassung fuer den Auftraggeber weist ihn NICHT aus");
}

/* ===================================================================== *
 * 16  Hasenberg Befund 3 / Frankenburg B4 (BLOCKER): kein Ein-Klick-Weg,
 *     der eine Zahl "als richtig anerkennt", die das Raumbuch widerlegt.
 *     Geprueft an allen Fragen der drei abgelegten Echtlauf-Staende.
 * ===================================================================== */
["hasenberg_lauf_2026-08-25.json", "soethe_lauf_2026-08-26.json",
 "ziolkowski_lauf4_fenster.json"].forEach(function (datei) {
  stand(datei);
  const fragen = T.rueckfragenListe() || [];
  pruefe(fragen.length > 0, datei + ": es muss Fragen geben");
  fragen.forEach(function (f) {
    const v = f.vorschlag;
    /* Jede Frage traegt weiterhin einen Vorschlag ODER eine begruendete
       Ausnahme -- die Vorschlagspflicht bleibt unberuehrt. */
    pruefe(!!v, datei + ": „" + f.titel + "“ traegt gar keinen Vorschlag");
    if (!v) return;
    if (v.art === "ohne") {
      pruefe(String(v.ohne || "").length > 30,
        datei + ": „" + f.titel + "“ begruendet die Ausnahme nicht");
      return;
    }
    /* Ein Knopf "N als richtig anerkennen" darf nur eine Zahl nennen, die
       das Projekt auch traegt. Gegengeprueft wird gegen die Zeilen des
       Kontrollblatts: ist und soll derselben Zeile. */
    const m = String(v.knopf || "").match(/^([\d.,]+)\s+\S+\s+als richtig anerkennen$/);
    if (!m) return;
    const zahlKnopf = Number(String(m[1]).replace(/\./g, "").replace(",", "."));
    const ids = String(f.id || "").replace(/^kb_/, "").split("+");
    const zeilen = KB.zaehler(T.App.p, {}).filter(function (x) {
      return ids.indexOf(String(x.id)) >= 0; });
    zeilen.forEach(function (x) {
      if (!Number.isFinite(Number(x.ist))) return;
      const istGerundet = Math.round(Number(x.ist) * 100) / 100;
      pruefe(Math.abs(istGerundet - zahlKnopf) < 0.51,
        datei + ": „" + f.titel + "“ bietet „" + v.knopf + "“ an, im Raumbuch "
        + "stehen aber " + istGerundet + " " + (x.einheit || ""));
      pruefe(x.aufhebbar !== false,
        datei + ": „" + f.titel + "“ ist eine harte Sperre und darf keinen "
        + "Anerkennungs-Knopf tragen");
    });
  });
});

console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl,
  fehler: fehler }));
