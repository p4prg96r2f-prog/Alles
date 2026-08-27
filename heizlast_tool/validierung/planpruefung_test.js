/* Kalibrierung der Planprüfung an echten Bildvarianten. */
"use strict";
const fs = require("fs"), path = require("path");
const K = require("../src/kerne/kern_planpruefung.js");
const dir = "/private/tmp/claude-501/-Users-sebastianhund-Desktop-Claude/"
          + "798d9b75-705e-4f08-93c8-f1d1420fab83/scratchpad/pruefdaten";

const erwartet = {
  scharf_gross:  "geeignet",
  leicht_weich:  ["geeignet", "eingeschraenkt"],
  unscharf:      "ungeeignet",
  blaupause:     "ungeeignet",
  klein:         "ungeeignet",
  schief_2grad:  "ungeeignet",
  schief_05grad: ["geeignet", "eingeschraenkt"],
  leer:          "ungeeignet",
};

let fehler = 0;
console.log("Bildvariante        Urteil           Auflös. Schärfe Kontr. Schräg  Befund");
console.log("-".repeat(96));
Object.keys(erwartet).forEach(function (name) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, name + ".json"), "utf8"));
  const roh = fs.readFileSync(path.join(dir, name + ".raw"));
  const r = K.pruefeBild({ data: new Uint8ClampedArray(roh), width: meta.width, height: meta.height });
  const w = (id) => { const b = r.befunde.find((x) => x.id === id); return b ? b.wert : 0; };
  const soll = erwartet[name];
  const ok = Array.isArray(soll) ? soll.indexOf(r.urteil) >= 0 : r.urteil === soll;
  if (!ok) fehler++;
  const sperrGrund = r.sperren.map((b) => b.titel).join(", ") || "–";
  console.log(
    (ok ? "OK   " : "FEHL ") + name.padEnd(15) + r.urteil.padEnd(16)
    + String(Math.round(w("aufloesung"))).padStart(6)
    + String(Math.round(w("schaerfe"))).padStart(8)
    + String(Math.round(w("kontrast"))).padStart(7)
    + w("schraeg").toFixed(1).padStart(7) + "  " + sperrGrund);
});
console.log("-".repeat(96));
console.log(fehler === 0 ? "Kalibrierung bestanden." : fehler + " Varianten falsch beurteilt.");
process.exit(fehler === 0 ? 0 : 1);
