/* ===========================================================================
 * planpruefung_test.js — Kalibrierung der Eignungsprüfung von Planbildern
 * ===========================================================================
 * Die acht Bildvarianten entstehen in validierung/planbilder.js aus Code.
 * Bis zum 27.08.2026 wurden sie aus einem absoluten Pfad in einem
 * Arbeitsverzeichnis des Verfassers gelesen; die Dateien lagen nie im Projekt.
 * Der Test brach mit ENOENT ab, build.py an Schritt 2b — das Werkzeug liess
 * sich nicht mehr bauen. Die Vorgeschichte steht in planbilder.js.
 *
 * Geprüft wird zweierlei:
 *   1. das Urteil (geeignet / eingeschraenkt / ungeeignet), und
 *   2. der GRUND der Sperre. Ein Bild, das zufällig aus dem falschen Grund
 *      gesperrt wird, ist keine bestandene Kalibrierung.
 *
 * Aufruf:  node validierung/planpruefung_test.js
 * =========================================================================== */
"use strict";
const path = require("path");
const K = require(path.join(__dirname, "..", "src", "kerne", "kern_planpruefung.js"));
const P = require(path.join(__dirname, "planbilder.js"));

/* soll:  erlaubtes Urteil (Text oder Liste)
 * grund: Befund-Kennung, die die Sperre tragen MUSS (null = keine Sperre).
 *        Eine Liste heisst: eine davon genuegt. Das ist kein Aufweichen --
 *        beim gleichmaessig dunklen Blatt sind BEIDE Gruende richtig (der
 *        Zeichnungsanteil ist unbrauchbar UND der Kontrast zu gering), und
 *        welcher zuerst anschlaegt, haengt an der Otsu-Schwelle. Der Test
 *        soll das Urteil pruefen, nicht die Reihenfolge der Befunde. */
const ERWARTET = {
  scharf_gross:  { soll: "geeignet",                          grund: null },
  leicht_weich:  { soll: ["geeignet", "eingeschraenkt"],       grund: null },
  unscharf:      { soll: "ungeeignet",                         grund: "schaerfe" },
  blaupause:     { soll: "ungeeignet",                         grund: "kontrast" },
  klein:         { soll: "ungeeignet",                         grund: "aufloesung" },
  schief_2grad:  { soll: "ungeeignet",                         grund: "schraeg" },
  schief_05grad: { soll: ["geeignet", "eingeschraenkt"],       grund: null },
  leer:          { soll: "ungeeignet",                         grund: "inhalt" },
  dunkel:        { soll: "ungeeignet",           grund: ["inhalt", "kontrast"] },
};

/* Kennungen, die auf einem Blatt ohne brauchbaren Bildinhalt NICHT erscheinen
 * duerfen: ohne Linienstruktur hat die Schraeglagenschaetzung kein Maximum und
 * liefert den Rand ihres Suchbereichs. Eine erfundene Gradzahl samt Rat, den
 * Plan gerade einzuscannen, ist genau die Art Auskunft, die Vertrauen kostet. */
const OHNE_AUSSAGE = { leer: ["schraeg"], dunkel: ["schraeg"] };

let fehler = 0;
console.log("Bildvariante        Urteil           Auflös. Schärfe Kontr. Schräg  Befund");
console.log("-".repeat(96));
Object.keys(ERWARTET).forEach(function (name) {
  const bild = P.VARIANTEN[name]();
  const r = K.pruefeBild(bild);
  const w = function (id) {
    const b = r.befunde.find(function (x) { return x.id === id; });
    return b ? b.wert : 0;
  };
  const e = ERWARTET[name];
  const soll = e.soll;
  let ok = Array.isArray(soll) ? soll.indexOf(r.urteil) >= 0 : r.urteil === soll;
  let anmerkung = "";
  if (ok && e.grund) {
    const gruende = Array.isArray(e.grund) ? e.grund : [e.grund];
    const traegt = r.sperren.some(function (b) { return gruende.indexOf(b.id) >= 0; });
    if (!traegt) {
      ok = false;
      anmerkung = " [Sperre nicht aus '" + gruende.join("' oder '") + "']";
    }
  }
  if (ok && !e.grund && r.sperren.length) {
    ok = false; anmerkung = " [unerwartete Sperre]";
  }
  /* Und was auf diesem Blatt gar nicht beurteilbar ist, darf auch nicht
     behauptet werden. */
  (OHNE_AUSSAGE[name] || []).forEach(function (id) {
    if (r.befunde.some(function (b) { return b.id === id; })) {
      ok = false;
      anmerkung += " [behauptet '" + id + "' auf einem Blatt ohne Bildinhalt]";
    }
  });
  if (!ok) fehler++;
  const sperrGrund = r.sperren.map(function (b) { return b.titel; }).join(", ") || "–";
  console.log(
    (ok ? "OK   " : "FEHL ") + name.padEnd(15) + r.urteil.padEnd(16)
    + String(Math.round(w("aufloesung"))).padStart(6)
    + String(Math.round(w("schaerfe"))).padStart(8)
    + String(Math.round(w("kontrast"))).padStart(7)
    + Number(w("schraeg")).toFixed(1).padStart(7) + "  " + sperrGrund + anmerkung);
});
console.log("-".repeat(96));
console.log(fehler === 0 ? "Kalibrierung bestanden."
  : fehler + " Varianten falsch beurteilt.");
process.exit(fehler === 0 ? 0 : 1);
