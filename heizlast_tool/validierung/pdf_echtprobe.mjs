/* Probe des PDF-Moduls an echten Planpaketen. Kein Teil des Baus, sondern ein
 * Werkzeug fuer die Hand: node validierung/pdf_echtprobe.mjs <datei.pdf> */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const HIER = path.dirname(new URL(import.meta.url).pathname);
const VENDOR = path.join(HIER, "..", "vendor", "pdfjs");
globalThis.DOMMatrix = globalThis.DOMMatrix || class { constructor(i){const a=Array.isArray(i)?i:[1,0,0,1,0,0];this.a=a[0];this.b=a[1];this.c=a[2];this.d=a[3];this.e=a[4];this.f=a[5];} };
globalThis.Path2D = globalThis.Path2D || class { addPath(){} moveTo(){} lineTo(){} bezierCurveTo(){} quadraticCurveTo(){} closePath(){} rect(){} };
await import(pathToFileURL(path.join(VENDOR, "pdf.worker.min.mjs")).href);
const lib = await import(pathToFileURL(path.join(VENDOR, "pdf.min.mjs")).href);
globalThis.pdfjsLib = lib;
if (typeof lib.setVerbosityLevel === "function") lib.setVerbosityLevel(lib.VerbosityLevel.ERRORS);
globalThis.window = globalThis;
const M = require(path.join(HIER, "..", "src", "modul_pdf.js"));

const datei = process.argv[2];
const t0 = Date.now();
const r = await M.dateiOeffnen(new Uint8Array(fs.readFileSync(datei)), { name: path.basename(datei) });
if (!r.ok) { console.log("NICHT OK:", r.meldung); process.exit(0); }
console.log("Datei:", path.basename(datei), "|", r.seiten.length, "Seiten |", Date.now()-t0, "ms");
for (const s of r.seiten) {
  const dpi = s.dpi_nativ ? Math.round(s.dpi_nativ) + " dpi nativ" : "-";
  console.log(`\nS${s.nr}  ${s.format}  Drehung ${s.drehung}  -> ${s.typ}`);
  console.log(`    Text ${s.textstuecke.length} | Pfade ${s.pfadzahl} | Bilder ${s.bilder.length} (${dpi})`);
  console.log(`    kleinste Versalhoehe ${s.kleinste_versalhoehe_mm ? s.kleinste_versalhoehe_mm.toFixed(2)+" mm" : "-"} -> rendern mit ${Math.round(s.aufloesung.dpi)} dpi (${s.aufloesung.grund})`);
  const kp = s.kachelplan();
  console.log(`    Kacheln ${kp.anzahl} (${kp.spalten}x${kp.zeilen}), ${kp.bildtoken} Bildtoken, ${kp.kosten_usd.toFixed(3)} USD`);
  console.log(`    Blattkopf: Massstab ${s.blattkopf.massstab_nenner||"-"} | Geschoss ${s.blattkopf.geschoss_name||"-"} | Art ${s.blattart||s.blattkopf.blattart||"-"}`);
  console.log(`    Massstab: ${s.massstab.nenner ? "1:"+s.massstab.nenner : "keiner"} (${s.massstab.guete}, Vermerk ${s.massstab.weg_vermerk||"-"}, Geometrie ${s.massstab.weg_geometrie||"-"}, ${s.massstab.belege_geometrie} Belege)`);
  console.log(`    Masszahlen ${s.masszahlen.length} (${s.masszahlen.filter(m=>m.zahl.sicher).length} sicher) | Raumstempel ${s.raumstempel.length} | Strecken ${s.strecken.length}`);
  if (s.raumstempel.length) {
    s.raumstempel.slice(0,5).forEach(x=>console.log(`        Stempel: ${JSON.stringify(x.stempel.name)} A=${x.stempel.A_m2} U=${x.stempel.U_m}`));
  }
  const fl = s.flaechen();
  if (fl.length) {
    const mitM2 = fl.filter(f=>f.flaeche_m2>0.5 && f.flaeche_m2<2000);
    console.log(`    geschlossene Flaechen ${fl.length}, davon raumgross ${mitM2.length}`);
  }
  s.massstab.befunde.forEach(b=>console.log(`    [${b.stufe}] ${b.text}`));
}
