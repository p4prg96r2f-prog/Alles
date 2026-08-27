/* ===========================================================================
 * planakten_test.js — die Planauslese an zehn synthetischen Prüfplänen
 * ===========================================================================
 * Die Pläne entstehen in validierung/planakten.js aus Code; ihre Sollwerte
 * stehen dort neben dem Plan. Gelesen wird über denselben Weg wie im Browser:
 * MODUL_PDF.dateiOeffnen() mit der echten pdf.js aus vendor/.
 *
 * Geprüft wird dreierlei, und der Unterschied ist der Punkt der ganzen Datei:
 *   RICHTIG ERKANNT   Was im Plan steht, muss auf die Stelle genau
 *                     herauskommen. Keine Toleranz: die Zahl ist
 *                     angeschrieben, nicht gemessen.
 *   ALS UNSICHER      Was nicht belegt ist, muss als unsicher gekennzeichnet
 *                     sein — nicht heimlich zu einer Zahl werden.
 *   ABGELEHNT         Was unbrauchbar ist, darf keine Fläche erzeugen.
 *
 * Kein Netz, kein Modellaufruf, keine fremden Daten.
 *
 * Aufruf:  node validierung/planakten_test.js
 * =========================================================================== */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.join(HIER, "..");
const VENDOR = path.join(WURZEL, "vendor", "pdfjs");

/* Zwei Kleinigkeiten aus dem Browser, die pdf.js beim Laden anfasst. Sie
   werden nur beim Rastern gebraucht; gerastert wird hier nicht. */
globalThis.DOMMatrix = globalThis.DOMMatrix || class DOMMatrix {
  constructor(i) {
    const a = Array.isArray(i) ? i : [1, 0, 0, 1, 0, 0];
    this.a = a[0]; this.b = a[1]; this.c = a[2];
    this.d = a[3]; this.e = a[4]; this.f = a[5];
  }
};
globalThis.Path2D = globalThis.Path2D || class Path2D {
  addPath() {} moveTo() {} lineTo() {} bezierCurveTo() {}
  quadraticCurveTo() {} closePath() {} rect() {}
};

await import(pathToFileURL(path.join(VENDOR, "pdf.worker.min.mjs")).href);
const lib = await import(pathToFileURL(path.join(VENDOR, "pdf.min.mjs")).href);
globalThis.pdfjsLib = lib;
if (typeof lib.setVerbosityLevel === "function" && lib.VerbosityLevel) {
  lib.setVerbosityLevel(lib.VerbosityLevel.ERRORS);
}
globalThis.window = globalThis;

const M = require(path.join(WURZEL, "src", "modul_pdf.js"));
const P = require(path.join(WURZEL, "validierung", "planakten.js"));
const KPP = require(path.join(WURZEL, "src", "kerne", "kern_planpruefung.js"));

const fehler = [];
let anzahl = 0;
function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
  return !!bedingung;
}
/** Angeschriebene Zahlen sind exakt zu übernehmen. 1e-9 deckt allein die
 *  Gleitkommadarstellung ab, keine fachliche Unschärfe. */
function gleich(name, ist, soll) {
  anzahl++;
  const ok = Number.isFinite(ist) && Math.abs(ist - soll) <= 1e-9;
  if (!ok) fehler.push(name + ": soll " + soll + ", ist " + ist);
  return ok;
}

const gelesen = {};
for (const schluessel of Object.keys(P.AKTEN)) {
  const akte = P.AKTEN[schluessel];
  const r = await M.dateiOeffnen(akte.bauen(), { name: schluessel + ".pdf" });
  pruefe(r.ok, schluessel + ": die Datei laesst sich nicht oeffnen: " + r.meldung);
  if (!r.ok) continue;
  gelesen[schluessel] = r;
  pruefe(r.seiten.length === akte.soll.seiten,
    schluessel + ": " + akte.soll.seiten + " Seiten erwartet, sind "
      + r.seiten.length);
}

const bloecke = (s) => (s.raumbloecke || []).filter((b) => Number.isFinite(b.A_m2));
const summe = (s) => bloecke(s).reduce((a, b) => a + b.A_m2, 0);

/* ---------------------------------------------- P01  sauberer Grundriss ---
 * Der Normalfall. Drei angeschriebene Flaechen, ein Massstabsvermerk, ein
 * Geschosstitel. Alles muss exakt herauskommen, sonst taugt keine der
 * folgenden Proben etwas. */
{
  const s = gelesen.P01_sauber.seiten[0];
  pruefe(s.typ === "vektorplan", "P01: typ soll vektorplan sein, ist " + s.typ);
  gleich("P01 Massstab", s.massstab.nenner, 100);
  pruefe(bloecke(s).length === 3, "P01: drei Raumbloecke erwartet, sind "
    + bloecke(s).length);
  const nach = (n) => bloecke(s).find((b) => b.name === n);
  gleich("P01 Wohnen", nach("Wohnen") && nach("Wohnen").A_m2, 24.5);
  gleich("P01 Kueche", nach("Kueche") && nach("Kueche").A_m2, 12.3);
  gleich("P01 Bad", nach("Bad") && nach("Bad").A_m2, 6.4);
  gleich("P01 Flaechensumme", summe(s), 43.2);
  pruefe((s.geschosstitel || []).some((g) => g.kuerzel === "eg"),
    "P01: der Geschosstitel Erdgeschoss muss erkannt werden");
  /* Ein Massstab NUR aus dem Blattkopf ist nicht belastbar: bei einer
     verkleinerten Kopie waere der Vermerk falsch. Das MUSS dastehen. */
  pruefe(s.massstab.belastbar === false && s.massstab.guete === "vorlaeufig",
    "P01: ein Massstab allein aus dem Vermerk darf nicht als belastbar gelten, "
      + "ist guete=" + s.massstab.guete + " belastbar=" + s.massstab.belastbar);
}

/* ------------------------------------------------------- P02  reiner Scan ---
 * Kein Textstand, keine Pfade. Es darf KEINE Flaeche entstehen, und der
 * Massstab muss als unbekannt gemeldet werden. Eine Flaeche aus dem Nichts
 * waere der schaedlichste Fehler der ganzen Kette. */
{
  const s = gelesen.P02_scan.seiten[0];
  pruefe(s.typ === "scan", "P02: typ soll scan sein, ist " + s.typ);
  pruefe(bloecke(s).length === 0, "P02: aus einem Scan ohne Textstand darf keine "
    + "Flaeche entstehen, sind " + bloecke(s).length);
  pruefe(s.massstab.nenner === null && s.massstab.guete === "unbekannt",
    "P02: der Massstab muss als unbekannt gemeldet werden");
  pruefe((s.massstab.befunde || []).some((b) => /von Hand/i.test(b.text)),
    "P02: es muss dastehen, dass der Massstab von Hand zu setzen ist");
  pruefe(s.kacheln_noetig === true,
    "P02: ein Scan muss zum Kacheln vorgemerkt werden");
}

/* ---------------------------------------------------- P03  gedrehte Seite ---
 * Dieselbe Zeichnung wie P01 auf /Rotate 90. Eine gedrehte Seite ist kein
 * anderer Plan: die Flaechen muessen unveraendert herauskommen, und das
 * Blattformat muss die Drehung beruecksichtigen. */
{
  const s = gelesen.P03_gedreht.seiten[0];
  gleich("P03 Drehung", s.drehung, 90);
  gleich("P03 Flaechensumme wie P01", summe(s), 43.2);
  pruefe(bloecke(s).length === 3, "P03: drei Raumbloecke erwartet, sind "
    + bloecke(s).length);
  gleich("P03 Massstab", s.massstab.nenner, 100);
  /* A3 quer wird durch die Drehung hochkant: 297 x 420 statt 420 x 297. */
  pruefe(Math.round(s.breite_mm) === 297 && Math.round(s.hoehe_mm) === 420,
    "P03: das Blattformat muss die Drehung beruecksichtigen, ist "
      + Math.round(s.breite_mm) + "x" + Math.round(s.hoehe_mm));
}

/* ------------------------------------------------- P04  mehrseitig, Geschosse
 * Drei Blaetter, je ein Geschoss. Die Flaechen duerfen sich nicht vermischen,
 * und jedes Blatt muss seinen eigenen Geschosstitel tragen. */
{
  const seiten = gelesen.P04_mehrseitig.seiten;
  const soll = [43.2, 43.2, 30.4];
  const titel = ["eg", "og", "dg"];
  seiten.forEach(function (s, i) {
    gleich("P04 Seite " + (i + 1) + " Flaechensumme", summe(s), soll[i]);
    pruefe((s.geschosstitel || []).some((g) => g.kuerzel === titel[i]),
      "P04 Seite " + (i + 1) + ": Geschosstitel " + titel[i] + " fehlt, gefunden: "
        + JSON.stringify((s.geschosstitel || []).map((g) => g.kuerzel)));
  });
  gleich("P04 Flaeche ueber alle Blaetter",
    seiten.reduce((a, s) => a + summe(s), 0), 116.8);
  /* Und die Gegenprobe gegen Vermischung: kein Blatt darf die Raeume eines
     anderen tragen. „Schlafen" steht nur auf Blatt 2. */
  pruefe(bloecke(seiten[0]).every((b) => b.name !== "Schlafen"),
    "P04: Blatt 1 traegt einen Raum von Blatt 2");
}

/* --------------------------------- P05  mehrere Geschosse auf einem Blatt ---
 * BEKANNTE EINSCHRAENKUNG, hier festgehalten statt verschwiegen.
 *
 * Stehen drei Geschosse nebeneinander auf EINEM Blatt, erkennt das Werkzeug
 * hoechstens EINEN Geschosstitel. Zwei Gruende, beide nachgemessen:
 *   1. zeilenBilden() fasst Text gleicher Hoehe zu einer Zeile zusammen; aus
 *      drei Titeln wird ein Textstueck. geschosstitelLesen() bricht nach dem
 *      ersten Treffer ab (break) und liefert daher nur „Erdgeschoss".
 *   2. Die Schwelle ist 1,2 mal die MITTLERE Schriftgroesse des Blattes. Auf
 *      einem duenn beschrifteten Blatt zieht der Titel den Median selbst nach
 *      oben und fliegt aus seiner eigenen Schwelle. Gemessen: Median 14 pt,
 *      Schwelle 16,8 pt, Titel 14 pt -> null Titel.
 *
 * FOLGE: die Raeume der oberen Geschosse bekommen keine Geschosszuordnung
 * aus dem Plan; sie muessen im Raumbuch von Hand gesetzt werden. Die FLAECHEN
 * sind davon nicht betroffen, die kommen vollstaendig und exakt.
 *
 * NICHT BEHOBEN, mit Begruendung: beide Regeln sind an ueber 180 Seiten echter
 * CAD-Plaene eingestellt. Sie an einem synthetischen Blatt nachzustellen,
 * ohne die echten Blaetter zum Gegenmessen zu haben, tauscht einen bekannten
 * Randfall gegen unbekannte Rueckschritte. Der Vorschlag steht in
 * BASELINE_REPORT.md. Diese Probe haelt den Stand fest: verbessert sich die
 * Erkennung, faellt sie auf und ist zu erhoehen.
 */
{
  const s = gelesen.P05_geschosse_auf_einem_blatt.seiten[0];
  gleich("P05 Massstab", s.massstab.nenner, 50);
  gleich("P05 Flaechensumme (vollstaendig)", summe(s), 61.6);
  pruefe(bloecke(s).length === 3, "P05: alle drei Flaechen muessen kommen, sind "
    + bloecke(s).length);
  const gefunden = (s.geschosstitel || []).length;
  pruefe(gefunden <= 1, "P05: bisher wurde hoechstens ein Geschosstitel erkannt; "
    + "jetzt sind es " + gefunden + ". Wenn die Erkennung besser geworden ist, "
    + "ist diese Probe zu erhoehen — und BASELINE_REPORT.md anzupassen.");
}

/* ----------------------------------------------------- P06  ohne Stempel ---
 * Raeume sind gezeichnet und benannt, tragen aber keine Flaeche. Es darf
 * keine entstehen. Ein geratener Wert waere hier besonders schaedlich, weil
 * er wie eine Messung aussieht. */
{
  const s = gelesen.P06_ohne_stempel.seiten[0];
  pruefe(bloecke(s).length === 0, "P06: ohne angeschriebene Flaeche darf keine "
    + "entstehen, sind " + bloecke(s).length + ": "
    + JSON.stringify(bloecke(s).map((b) => [b.name, b.A_m2])));
  gleich("P06 Flaechensumme", summe(s), 0);
  /* Die Raumnamen sind dennoch im Textstand — sie sind die Grundlage dafuer,
     dass das Werkzeug ueberhaupt nach den fehlenden Flaechen fragen kann. */
  const namen = (s.textstuecke || []).map((t) => String(t.text)).join(" ");
  pruefe(/Wohnen/.test(namen) && /Kueche/.test(namen) && /Bad/.test(namen),
    "P06: die Raumnamen muessen im Textstand stehen, sonst kann das Werkzeug "
      + "nicht nach den fehlenden Flaechen fragen");
}

/* ------------------------------------------------------- P07  Widerspruch ---
 * Die Masskette summiert 5,40 + 7,40 = 12,80 m, die Gesamtangabe sagt
 * 12,00 m. Dazu behauptet ein Stempel 60,00 m2 in einem Raum, der nach der
 * Zeichnung rund 24 m2 hat.
 * Verlangt wird NICHT, dass das Werkzeug den Widerspruch aufloest — das kann
 * es nicht und soll es nicht. Verlangt wird, dass BEIDE Zahlen sichtbar
 * bleiben und der Massstab nicht als belastbar durchgeht. Stillschweigend
 * eine von beiden zu nehmen ist der Fehler. */
{
  const s = gelesen.P07_widerspruch.seiten[0];
  /* Die Masszahl steckt unter .zahl (siehe modul_pdf.js, seite.masszahlen). */
  const zahlen = (s.masszahlen || [])
    .map((m) => m && m.zahl && m.zahl.wert_m).filter(Number.isFinite);
  pruefe(zahlen.length >= 3, "P07: alle drei Masszahlen muessen gelesen werden, "
    + "sind " + zahlen.length + ": " + JSON.stringify(zahlen));
  [5.4, 7.4, 12.0].forEach(function (w) {
    pruefe(zahlen.some((z) => Math.abs(z - w) < 1e-9),
      "P07: die Masszahl " + w + " m fehlt; gelesen: " + JSON.stringify(zahlen));
  });
  pruefe(s.massstab.belastbar === false,
    "P07: bei widerspruechlicher Bemassung darf der Massstab nicht als "
      + "belastbar gelten");
  /* Der unmoegliche Stempel wird gelesen, wie er dasteht — das ist richtig,
     die Auslese erfindet nichts und verwirft nichts. Die Plausibilitaet ist
     Sache der Selbstpruefung; hier wird nur festgehalten, dass die Zahl
     unveraendert ankommt und damit ueberhaupt pruefbar ist. */
  const w = bloecke(s).find((b) => b.name === "Wohnen");
  gleich("P07 der angeschriebene Wert kommt unveraendert an", w && w.A_m2, 60);
}

/* -------------------------------------------- P08  zwei Massstaebe -------
 * Blatt 1 ist 1:50, Blatt 2 ist 1:100. Wer den Massstab des ersten Blattes
 * auf das zweite anwendet, verdoppelt dort jede Laenge. */
{
  const seiten = gelesen.P08_zwei_massstaebe.seiten;
  gleich("P08 Blatt 1 Massstab", seiten[0].massstab.nenner, 50);
  gleich("P08 Blatt 2 Massstab", seiten[1].massstab.nenner, 100);
  pruefe(seiten[0].massstab.nenner !== seiten[1].massstab.nenner,
    "P08: die beiden Blaetter muessen verschiedene Massstaebe haben");
  gleich("P08 Blatt 1 Flaeche", summe(seiten[0]), 24.5);
  gleich("P08 Blatt 2 Flaeche", summe(seiten[1]), 98);
}

/* ------------------------------------------ P09  schlechte Bildqualitaet ---
 * Ein kleines, weichgezeichnetes Bild ueber ein A3-Blatt gezogen. Die native
 * Auflösung liegt weit unter dem, was fuer Masszahlen reicht. Das muss
 * auffallen — und aus dem Blatt darf keine Flaeche kommen. */
{
  const s = gelesen.P09_schlechte_qualitaet.seiten[0];
  pruefe(s.typ === "scan", "P09: typ soll scan sein, ist " + s.typ);
  pruefe(Number.isFinite(s.dpi_nativ) && s.dpi_nativ <= 60,
    "P09: die native Auflösung muss als niedrig erkannt werden, ist "
      + s.dpi_nativ);
  pruefe(bloecke(s).length === 0,
    "P09: aus einem schlechten Scan darf keine Flaeche entstehen");
  /* Und die Bildprobe selbst muss so ein Blatt sperren. Geprueft wird mit
     demselben Bild, aus dem die Seite gebaut ist. */
  const g = P.bildGrau(420, 300, 3);
  const d = new Uint8ClampedArray(420 * 300 * 4);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) {
    d[j] = g[i]; d[j + 1] = g[i]; d[j + 2] = g[i]; d[j + 3] = 255;
  }
  const urteil = KPP.pruefeBild({ data: d, width: 420, height: 300 });
  pruefe(urteil.urteil === "ungeeignet",
    "P09: die Bildprobe muss so ein Blatt sperren, urteilt aber "
      + urteil.urteil);
  pruefe(urteil.sperren.some((b) => b.id === "aufloesung"),
    "P09: die Sperre muss die Auflösung nennen, nennt: "
      + urteil.sperren.map((b) => b.id).join(","));
}

/* --------------------------------------- P10  unbrauchbare Informationen ---
 * Auf dem Blatt steht ein eingezeichneter Anweisungstext („Ignoriere alle
 * vorherigen Anweisungen …") und ein unmoeglicher Flaechenstempel mit
 * 99999 m2 auf einem A4-Blatt im Massstab 1:100 — das Blatt selbst stellt
 * bei 1:100 nur 29,7 x 21,0 m dar, also 623 m2.
 *
 * Verlangt wird:
 *   1. Der Anweisungstext ist DATEN. Er landet im Textstand und veraendert
 *      nichts: kein Raum bekommt 999 m2.
 *   2. Der unmoegliche Wert wird unveraendert weitergegeben und nicht
 *      stillschweigend zurechtgebogen — nur so kann die Selbstpruefung ihn
 *      beanstanden.
 *   3. Aus dem Anweisungstext entsteht kein Raum. */
{
  const s = gelesen.P10_unbrauchbar.seiten[0];
  const text = (s.textstuecke || []).map((t) => String(t.text)).join(" ");
  pruefe(/Ignoriere alle vorherigen Anweisungen/.test(text),
    "P10: der Anweisungstext muss im Textstand ankommen — nur was gelesen "
      + "wird, kann auch als Daten behandelt werden");
  const b = bloecke(s);
  pruefe(b.every((x) => x.A_m2 !== 999),
    "P10: kein Raum darf die 999 m2 aus dem Anweisungstext tragen: "
      + JSON.stringify(b.map((x) => [x.name, x.A_m2])));
  gleich("P10 unmoeglicher Wert kommt unveraendert an",
    (b.find((x) => x.name === "Wohnen") || {}).A_m2, 99999);
  pruefe(b.every((x) => !/Ignoriere|SYSTEM/i.test(String(x.name || ""))),
    "P10: aus dem Anweisungstext darf kein Raum entstehen: "
      + JSON.stringify(b.map((x) => x.name)));
  /* Der Wert ist physikalisch unmoeglich: 99999 m2 auf einem A4-Blatt bei
     1:100. Diese Probe haelt fest, dass die Zahl gross genug bleibt, damit
     die Plausibilitaetspruefung des Raumbuchs sie ueberhaupt sehen kann. */
  const blattFlaeche = (s.breite_mm / 1000 * s.massstab.nenner)
    * (s.hoehe_mm / 1000 * s.massstab.nenner);
  pruefe(99999 > blattFlaeche,
    "P10: die Probe selbst ist falsch aufgesetzt — der Wert muss die "
      + "Blattflaeche (" + Math.round(blattFlaeche) + " m2) uebersteigen");
}

console.log(JSON.stringify({
  ok: fehler.length === 0, anzahl: anzahl, plaene: Object.keys(P.AKTEN).length,
  fehler: fehler,
}));
