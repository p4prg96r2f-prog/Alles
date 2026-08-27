/* Validierung des JS-Rechenkerns gegen das gepruefte Python-Modell.
 * Zweistufig:
 *   Stufe A  Zonentemperaturen fest auf die Referenzwerte gesetzt
 *            -> prueft Transmission, Lueftung, Summenbildung isoliert
 *   Stufe B  Zonentemperaturen aus der eigenen stationaeren Bilanz
 *            -> zeigt den methodischen Unterschied zur Referenz
 */
"use strict";
const fs = require("fs"), path = require("path");
const kern = require("../src/kerne/kern_heizlast_norm.js");

const dir = path.join(__dirname, "faelle");
const basis = JSON.parse(fs.readFileSync(path.join(dir, "maelzerstr59.json"), "utf8"));
const soll = JSON.parse(fs.readFileSync(path.join(dir, "maelzerstr59_soll.json"), "utf8"));

const z = (x, n) => x.toFixed(n === undefined ? 1 : n);
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);

function pruefen(titel, ist, tolSumme, tolRaum) {
  console.log("\n--- " + titel + " " + "-".repeat(Math.max(0, 62 - titel.length)));
  let fehler = 0, maxRel = 0;
  function v(name, i, s, tol, einheit) {
    const abw = i - s;
    const rel = s !== 0 ? Math.abs(abw / s) * 100 : 0;
    maxRel = Math.max(maxRel, rel);
    const ok = Math.abs(abw) <= tol;
    if (!ok) fehler++;
    console.log("  " + (ok ? "OK  " : "FEHL") + " " + pad(name, 24)
      + " ist " + padl(z(i, 2), 9) + "   soll " + padl(z(s, 2), 9)
      + "   Abw " + padl(z(abw, 3), 8) + " " + (einheit || "W"));
  }
  v("Transmission Gebaeude", ist.phi_T_gebaeude, soll.phi_T_gebaeude, tolSumme);
  v("Lueftung Gebaeude", ist.phi_V_gebaeude, soll.phi_V_gebaeude, tolSumme);
  v("Gebaeudeheizlast", ist.phi_gebaeude, soll.phi_gebaeude, tolSumme);
  v("Summe Raumheizlasten", ist.phi_raeume_summe, soll.phi_raeume_summe, tolSumme);
  /* Das Referenzmodell weist seinen H_T 20-°C-normiert aus (Gegenprobe:
     soll.H_T * (20 - theta_e) ergibt bitgleich soll.phi_T_gebaeude). Verglichen
     wird deshalb gegen dieselbe Groesse des Kerns. Der H_T nach Norm-
     definition SUM(A*U*b) steht daneben zur Kenntnis; er ist bei gemischten
     Raumtemperaturen zwangslaeufig ein anderer Wert und KEINE Abweichung.
     Siehe validierung/referenz_test.js, R05. */
  v("H_T (20-°C-normiert)", ist.H_T_20K_bezug, soll.H_T, tolSumme / 20, "W/K");
  console.log("       " + pad("H_T nach Norm SUM(A*U*b)", 24) + " ist "
    + padl(z(ist.H_T, 2), 9) + "   (zur Kenntnis, kein Sollwert vorhanden)");

  /* EIN FEHLENDER SOLLWERT IST EIN FEHLER, KEIN NaN.
   * Vorher stand hier nur   const abw = Math.abs(r.phi_raum - s).
   * Fehlte der Raum in der Referenzdatei, war s undefined, abw damit NaN --
   * und NaN > tolRaum ist FALSE. Der Raum lief also durch, raumFehler blieb
   * null, und die Zusammenfassung meldete
   *     OK  18 Raeume einzeln   groesste Abweichung NaN W
   *     ERGEBNIS: BESTANDEN. Stufe A exakt (max NaN W je Raum)
   * mit Rueckgabewert 0. Nachgestellt am 27.08.2026, indem EIN Schluessel in
   * maelzerstr59_soll.json umbenannt wurde -- genau das passiert bei einer
   * Umbenennung im Raumbuch oder einer neu erzeugten Solldatei. Das Wort
   * "exakt" neben einem NaN ist die schaedlichste Auskunft, die eine Probe
   * geben kann: sie meldet Erfolg, wo sie nichts geprueft hat.
   * Geprueft wird deshalb in BEIDE Richtungen und die Zahl der tatsaechlich
   * verglichenen Raeume wird ausgewiesen, statt 18 zu behaupten. */
  let raumFehler = 0, maxRaum = 0, verglichen = 0;
  const istIds = ist.raeume.map(function (r) { return r.id; });
  ist.raeume.forEach(function (r) {
    const s = soll.raeume[r.id];
    if (!Number.isFinite(s)) {
      raumFehler++;
      console.log("       " + pad(r.id, 22)
        + " KEIN SOLLWERT in der Referenzdatei — nicht geprueft");
      return;
    }
    verglichen++;
    const abw = Math.abs(r.phi_raum - s);
    maxRaum = Math.max(maxRaum, abw);
    if (abw > tolRaum) {
      raumFehler++;
      console.log("       " + pad(r.id, 22) + " ist " + padl(z(r.phi_raum), 8)
        + "   soll " + padl(z(s), 8) + "   Abw " + padl(z(r.phi_raum - s, 2), 7) + " W");
    }
  });
  /* Die andere Richtung: ein Sollwert ohne Raum im Projekt. Ohne diese Probe
     verschwaenden geloeschte Raeume unbemerkt aus dem Vergleich. */
  Object.keys(soll.raeume || {}).forEach(function (id) {
    if (istIds.indexOf(id) >= 0) return;
    raumFehler++;
    console.log("       " + pad(id, 22)
      + " steht in der Referenz, aber nicht im Projekt");
  });
  if (verglichen === 0) {
    raumFehler++;
    console.log("       KEIN EINZIGER Raum verglichen — die Probe belegt nichts");
  }
  console.log("  " + (raumFehler === 0 ? "OK  " : "FEHL") + " "
    + pad(verglichen + " Raeume einzeln", 24) + " groesste Abweichung "
    + z(maxRaum, 3) + " W");
  return { fehler: fehler + raumFehler, maxRel: maxRel, maxRaum: maxRaum,
           verglichen: verglichen };
}

console.log("=".repeat(72));
console.log("Validierung Maelzerstr. 59 gegen heizlast_maelzerstr59/modell.py");
console.log("Referenz: Gebaeudeheizlast " + z(soll.phi_gebaeude) + " W, H_T " + z(soll.H_T, 2) + " W/K");
console.log("=".repeat(72));

// --- Stufe A -------------------------------------------------------------
const pA = JSON.parse(JSON.stringify(basis));
pA.zonen = [
  { id: "keller", name: "Keller", modus: "fest", theta_fest: soll.theta_keller },
  { id: "dachraum", name: "Spitzboden", modus: "fest", theta_fest: soll.theta_dachraum },
];
const rA = pruefen("Stufe A: Zonentemperaturen fest auf die Referenzwerte", kern.rechne(pA), 0.05, 0.05);

// --- Stufe B -------------------------------------------------------------
const rB0 = kern.rechne(basis);
const rB = pruefen("Stufe B: Zonentemperaturen aus eigener stationaerer Bilanz", rB0, 10, 2.5);
console.log("       Zonentemperatur Keller    ist " + padl(z(rB0.zonen.keller, 3), 9)
  + "   soll " + padl(z(soll.theta_keller, 3), 9)
  + "   Abw " + padl(z(rB0.zonen.keller - soll.theta_keller, 3), 8) + " K");
console.log("       Zonentemperatur Dachraum  ist " + padl(z(rB0.zonen.dachraum, 3), 9)
  + "   soll " + padl(z(soll.theta_dachraum, 3), 9)
  + "   Abw " + padl(z(rB0.zonen.dachraum - soll.theta_dachraum, 3), 8) + " K");

// --- Ursachennachweis ----------------------------------------------------
// Zwei methodische Unterschiede zur Referenz, beide isoliert nachgewiesen:
//  (1) Die Referenz bilanziert die unbeheizten Zonen pauschal gegen 20 C,
//      der Kern gegen die tatsaechlichen Norm-Innentemperaturen der
//      angrenzenden Raeume (Bad 24 C, Treppenhaus 15 C).
//  (2) Die Referenz setzt in der Kellerbilanz die BRUTTOgeschossflaeche
//      72,98 m2 an, waehrend die Kellerdecken-Bauteile der Raeume nur
//      68,68 m2 NETTO ergeben. Der Kern verwendet durchgaengig dieselben
//      Flaechen wie in den Raeumen und ist damit in sich konsistent.
const A_BRUTTO = 72.98, A_NETTO = 68.68, U_KD = 0.29, U_KB = 0.35;
const pC = JSON.parse(JSON.stringify(basis));
pC.raeume.forEach(function (r) { r.theta_i = 20; });                 // Effekt (1)
const kz = pC.zonen.find(function (x) { return x.id === "keller"; }); // Effekt (2)
kz.huelle.forEach(function (b) {
  if (b.name === "Kellerboden") b.A = A_BRUTTO;
});
kz.huelle.push({ name: "Bezugsflaechendifferenz Decke (Brutto minus Netto)",
                 A: A_BRUTTO - A_NETTO, U: U_KD, grenzt_an: { typ: "fest", theta: 20 } });
const rC = kern.rechne(pC);
console.log("\n--- Ursachennachweis " + "-".repeat(51));
console.log("  Referenzmethodik nachgebildet (Zonen gegen 20 C, Bruttoflaeche im Keller):");
console.log("       Zonentemperatur Keller    ist " + padl(z(rC.zonen.keller, 6), 12)
  + "   soll " + padl(z(soll.theta_keller, 6), 12));
console.log("       Zonentemperatur Dachraum  ist " + padl(z(rC.zonen.dachraum, 6), 12)
  + "   soll " + padl(z(soll.theta_dachraum, 6), 12));
const ursacheOk = Math.abs(rC.zonen.keller - soll.theta_keller) < 0.001
               && Math.abs(rC.zonen.dachraum - soll.theta_dachraum) < 0.001;
console.log("  " + (ursacheOk ? "OK   Abweichung vollstaendig erklaert." : "FEHL Ursache nicht bestaetigt."));
console.log("       Wirkung auf die Gebaeudeheizlast: "
  + z(rB0.phi_gebaeude - soll.phi_gebaeude, 1) + " W von " + z(soll.phi_gebaeude, 0)
  + " W = " + z(Math.abs(rB0.phi_gebaeude - soll.phi_gebaeude) / soll.phi_gebaeude * 100, 3) + " %.");
console.log("       Der Kern rechnet hier bewusst anders und in sich konsistent.");

console.log("\n" + "=".repeat(72));
const gesamt = rA.fehler + (ursacheOk ? 0 : 1) + rB.fehler;
console.log(gesamt === 0
  ? "ERGEBNIS: BESTANDEN. Stufe A exakt (max " + z(rA.maxRaum, 4) + " W je Raum), "
    + "Stufe B erklaert."
  : "ERGEBNIS: " + gesamt + " offene Abweichungen.");
process.exit(gesamt === 0 ? 0 : 1);
