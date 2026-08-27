/* ===========================================================================
 * pdf_selbsttest.mjs — modul_pdf.js gegen die echte Bibliothek prüfen
 * ===========================================================================
 * Der Selbsttest von modul_pdf.js baut ein PDF von Hand und liest es mit
 * pdf.js wieder ein. Damit das in Node läuft, fehlen zwei Kleinigkeiten aus
 * dem Browser, die pdf.js beim Laden anfasst: DOMMatrix und Path2D. Beide
 * werden hier als Attrappe gestellt; sie werden nur beim Rastern gebraucht,
 * und gerastert wird im Selbsttest nicht.
 *
 * document wird bewusst NICHT gestellt. Dann erkennt modul_pdf.js, dass es
 * nicht im Browser läuft, und lässt das Rastern und die Arbeitereinrichtung
 * aus. Der Arbeiter kommt hier direkt aus dem Modul, das sich beim Laden
 * selbst unter globalThis.pdfjsWorker anmeldet.
 *
 * Aufruf:  node validierung/pdf_selbsttest.mjs
 * Ausgabe: eine Zeile JSON mit {ok, fehler, anzahl}
 * =========================================================================== */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const HIER = path.dirname(new URL(import.meta.url).pathname);
const VENDOR = path.join(HIER, "..", "vendor", "pdfjs");

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(i) {
      const a = Array.isArray(i) ? i : [1, 0, 0, 1, 0, 0];
      this.a = a[0]; this.b = a[1]; this.c = a[2];
      this.d = a[3]; this.e = a[4]; this.f = a[5];
    }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class Path2D {
    addPath() {} moveTo() {} lineTo() {} bezierCurveTo() {}
    quadraticCurveTo() {} closePath() {} rect() {}
  };
}

// Der Arbeiter meldet sich beim Laden selbst unter globalThis.pdfjsWorker an.
await import(pathToFileURL(path.join(VENDOR, "pdf.worker.min.mjs")).href);
const lib = await import(pathToFileURL(path.join(VENDOR, "pdf.min.mjs")).href);
globalThis.pdfjsLib = lib;

// pdf.js meldet fehlende Schriftdaten als Warnung. Für Geometrie und
// Textlage ist das ohne Belang, verrauscht aber die Ausgabe des Baus.
if (typeof lib.setVerbosityLevel === "function" && lib.VerbosityLevel) {
  lib.setVerbosityLevel(lib.VerbosityLevel.ERRORS);
}

globalThis.window = globalThis;
const M = require(path.join(HIER, "..", "src", "modul_pdf.js"));

const ergebnis = await M.selbsttestPdf();
console.log(JSON.stringify(ergebnis));
process.exit(ergebnis.ok ? 0 : 1);
