/* Gegenprobe der gepackten Klimatabelle gegen die Rohtabelle.
 *
 * daten_klima.js liefert die Werte aus einer gepackten Zeichenkette. Dieser
 * Test packt jeden einzelnen Satz wieder aus und hält ihn gegen
 * daten/klima_bwp_din_ts_12831_1.csv, also gegen genau das, was die Quelle
 * geliefert hat. Erst damit ist belegt, dass die Verdichtung nichts verändert.
 *
 * Aufruf: node validierung/klima_gegenprobe.js
 */
"use strict";

const fs = require("fs");
const pfad = require("path");
const K = require("../src/daten/daten_klima.js");

const roh = pfad.join(__dirname, "..", "daten", "klima_bwp_din_ts_12831_1.csv");
if (!fs.existsSync(roh)) {
  console.log("ABBRUCH: Rohtabelle fehlt: " + roh
    + "\n   Erzeugen mit: python3 klima_tabelle_bauen.py");
  process.exit(1);
}

const zeilen = fs.readFileSync(roh, "utf-8").trim().split("\n");
const kopf = zeilen.shift().trim();
if (kopf !== "plz;ort;theta_e_C;jahresmittel_C;hoehe_m;klimazone_din4710") {
  console.log("ABBRUCH: Die Rohtabelle hat einen anderen Kopf: " + kopf);
  process.exit(1);
}

const fehler = [];
let geprueft = 0;
const ausRoh = Object.create(null);

zeilen.forEach(function (z) {
  const t = z.trim().split(";");
  if (t.length !== 6) { fehler.push("Zeile mit " + t.length + " Feldern: " + z); return; }
  const plz = t[0];
  ausRoh[plz] = true;
  const o = K.findePlz(plz);
  if (!o) { fehler.push(plz + " fehlt in der gepackten Tabelle"); return; }
  geprueft++;
  if (o.ort !== t[1]) fehler.push(plz + " Ort: " + o.ort + " statt " + t[1]);
  if (Math.abs(o.theta_e - parseFloat(t[2])) > 1e-9) {
    fehler.push(plz + " theta_e: " + o.theta_e + " statt " + t[2]);
  }
  if (Math.abs(o.theta_e_m - parseFloat(t[3])) > 1e-9) {
    fehler.push(plz + " Jahresmittel: " + o.theta_e_m + " statt " + t[3]);
  }
  if (o.hoehe !== parseInt(t[4], 10)) fehler.push(plz + " Höhe: " + o.hoehe + " statt " + t[4]);
  const zone = parseInt(t[5], 10) || null;
  if (o.klimazone !== zone) fehler.push(plz + " Klimazone: " + o.klimazone + " statt " + zone);
});

// Nichts erfinden: die gepackte Tabelle darf keine PLZ mehr enthalten als die Quelle.
K.ORTE.forEach(function (o) {
  if (!ausRoh[o.plz]) fehler.push(o.plz + " steht in der Tabelle, aber nicht in der Quelle");
});

if (fehler.length) {
  console.log("FEHLER " + fehler.length);
  fehler.slice(0, 20).forEach(function (f) { console.log("   " + f); });
  process.exit(1);
}
console.log("ERGEBNIS " + geprueft + " Postleitzahlen deckungsgleich mit der Rohtabelle");
