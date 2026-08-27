/* ===========================================================================
 * referenz_test.js — 23 unabhaengige Referenzfaelle fuer den Rechenkern
 * ===========================================================================
 * WORUM ES GEHT
 *
 * Die vorhandene Validierung (validierung/vergleich.js gegen
 * validierung/faelle/maelzerstr59_soll.json) ist eine SCHNAPPSCHUSSPROBE: die
 * Solldatei wurde mit demselben Rechenkern erzeugt, den sie prueft. Sie findet
 * deshalb jede spaetere Abweichung von heute — aber keinen Fehler, der schon
 * am Tag der Aufnahme drin war. Genau so ein Fehler war drin (H_T, siehe R05).
 *
 * Diese Datei ist das Gegenstueck. Jeder Sollwert hier ist von Hand aus den
 * Formeln hergeleitet und zusaetzlich mit einer ZWEITEN, unabhaengigen
 * Implementierung in validierung/referenz_gegenrechnung.py nachgerechnet.
 * Kein Sollwert stammt aus src/. Die Herleitung steht als Rechnung im
 * Kommentar ueber jeder Zeile, damit ein Fachplaner sie nachprueft, ohne den
 * Code zu lesen.
 *
 * TOLERANZEN
 *
 * Fuer alle rein analytischen Faelle ist die Toleranz 1e-9 relativ. Sie deckt
 * allein die Gleitkomma-Darstellung ab, KEINE fachliche Unschaerfe: beide
 * Seiten rechnen dieselbe endliche Kette aus Multiplikationen. Wo eine
 * Fixpunkt-Iteration beteiligt ist (unbeheizte Zonen), ist sie 1e-6 absolut in
 * Kelvin bzw. 1e-6 relativ in Watt; das ist die Abbruchschranke der Iteration
 * im Kern. Eine grosszuegige Gesamttoleranz gibt es bewusst nicht: sie wuerde
 * genau die Einzelfehler verdecken, um die es hier geht.
 *
 * WAS DIE FAELLE ABDECKEN
 *   R01 Einraum, reine Transmission, von Hand nachvollziehbar
 *   R02 Kleines Neubau-Einfamilienhaus
 *   R03 Unsanierter Altbau
 *   R04 Mehrfamilienhaus, Eck- / Mittel- / Innenraum
 *   R05 Gemischte Raumtemperaturen 20 / 24 / 15 °C  (Gebaeude-H-Wert)
 *   R06 Unbeheizter Keller, Gleichgewichtsbilanz
 *   R07 Teilunterkellerung
 *   R08 Erdberuehrte Bauteile, f_ig
 *   R09 Dachgeschoss und belueftetes Kaltdach
 *   R10 Fenster und Tueren
 *   R11 Natuerliche Lueftung: Infiltration gegen Mindestluftwechsel
 *   R12 Mechanische Lueftung mit Waermerueckgewinnung (NICHT abgebildet)
 *   R13 Waermebrueckenzuschlag nur auf Huellbauteile
 *   R14 Aufheizzuschlag
 *   R15 Fehlende und ungueltige Klimadaten
 *   R16 Keine Raeume: Ergebnis endlich, Bericht gesperrt
 *   R17 Sanierungsvergleich vorher / nachher
 *   R18 Waermeuebertragung zwischen unterschiedlich warmen Raeumen
 *   R19 Extreme, aber gueltige Eingaben
 *   R20 Dezimaltrennzeichen, Einheiten, Grenzwerte
 *   R21 Invarianten: nie NaN, Komponentensumme gleich Ergebnis
 *   R22 Monotonie: mehr U oder mehr A darf die Last nicht senken
 *   R23 Rundungsunabhaengigkeit der Rechnung
 *
 * Aufruf:  node validierung/referenz_test.js
 * =========================================================================== */
"use strict";

const path = require("path");
const K = require(path.join(__dirname, "..", "src", "kerne", "kern_heizlast_norm.js"));

const fehler = [];
let anzahl = 0;
const matrix = [];   // fuer die Testmatrix im Abschlussbericht

function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
  return !!bedingung;
}

/** Zahlenvergleich mit ausgewiesener Toleranz. rel=true -> relative Toleranz. */
function nahe(name, ist, soll, tol, rel) {
  anzahl++;
  const abw = Math.abs(ist - soll);
  const grenze = rel ? Math.abs(soll) * tol : tol;
  const ok = Number.isFinite(ist) && abw <= grenze;
  matrix.push({
    fall: name, soll: soll, ist: Number.isFinite(ist) ? ist : String(ist),
    abweichung: Number.isFinite(ist) ? abw : null,
    toleranz: grenze, art: rel ? "relativ" : "absolut", ok: ok,
  });
  if (!ok) {
    fehler.push(name + ": soll " + soll + ", ist " + ist
      + " (Abweichung " + abw + " > Toleranz " + grenze + ")");
  }
  return ok;
}

const REL = 1e-9;      // Gleitkomma, analytische Faelle
const ITER = 1e-6;     // Abbruchschranke der Zonen-Iteration

/** Rekursiv: steckt irgendwo NaN, Infinity oder ein leerer Zahlenplatz? */
function unsauber(x, pfad, treffer) {
  pfad = pfad || "";
  treffer = treffer || [];
  if (typeof x === "number") {
    if (!Number.isFinite(x)) treffer.push(pfad + " = " + x);
  } else if (Array.isArray(x)) {
    x.forEach(function (v, i) { unsauber(v, pfad + "[" + i + "]", treffer); });
  } else if (x && typeof x === "object") {
    Object.keys(x).forEach(function (k) { unsauber(x[k], pfad + "." + k, treffer); });
  }
  return treffer;
}

const alleErgebnisse = [];   // fuer die Invariantenprobe R21
function rechne(name, projekt) {
  const r = K.rechne(projekt);
  alleErgebnisse.push({ name: name, r: r });
  return r;
}

/* Grundgeruest: ein Projekt ohne Lueftung und ohne Waermebrueckenzuschlag,
   damit in den analytischen Faellen nur der gemessene Term uebrig bleibt. */
function projekt(klima, raeume, extra) {
  return Object.assign({
    klima: klima,
    norm: { delta_u_wb: 0 },
    luftdichtheit: { n50: 0 },
    raeume: raeume,
  }, extra || {});
}
function bt(name, A, U, grenzt_an, kat) {
  const o = { name: name, A: A, U: U, grenzt_an: grenzt_an || { typ: "aussen" } };
  if (kat) o.kat = kat;
  return o;
}
function rm(id, theta_i, A, h, bauteile, extra) {
  return Object.assign({
    id: id, name: id, art: "wohnen", theta_i: theta_i, A: A, h: h,
    n_min: 0, n_exponiert: 0, bauteile: bauteile || [],
  }, extra || {});
}

/* ===========================================================================
 * R01  EINRAUM, REINE TRANSMISSION
 * ===========================================================================
 * theta_e = -12 °C, theta_i = 20 °C, dt = 32 K
 * Aussenwand A = 20 m², U = 0,25 W/(m²K), kein Waermebrueckenzuschlag
 *   Phi_T = 20 * 0,25 * 32 = 160,0 W
 *   H_T   = 20 * 0,25      =   5,0 W/K
 * Keine Lueftung: n50 = 0 und n_min = 0  ->  Phi_V = 0
 * ======================================================================== */
{
  const r = rechne("R01", projekt({ theta_e: -12, theta_e_m: 8 },
    [rm("r1", 20, 20, 2.5, [bt("Aussenwand", 20, 0.25)])]));
  nahe("R01 Phi_T Raum", r.raeume[0].phi_T_huelle, 160.0, REL, true);
  nahe("R01 Phi_V Raum", r.raeume[0].phi_V, 0, 1e-12, false);
  nahe("R01 Phi Raum", r.raeume[0].phi_raum, 160.0, REL, true);
  nahe("R01 Phi Gebaeude", r.phi_gebaeude, 160.0, REL, true);
  nahe("R01 H_T", r.H_T, 5.0, REL, true);
}

/* ===========================================================================
 * R02  KLEINES NEUBAU-EINFAMILIENHAUS
 * ===========================================================================
 * theta_e = -10 °C, theta_e_m = 9,5 °C, delta_U_WB = 0,05, n50 = 1,5, n_min = 0,5
 *
 * Wohnen  35 m², h 2,6  -> V = 91,0 m³, 2 exponierte Fassaden -> e = 0,03
 *   AW      30 * (0,20+0,05) * 30                       = 225,000 W
 *   Fenster  8 * (0,90+0,05) * 30                       = 228,000 W
 *   Boden   erdberuehrt: 1,45 * 35 * 0,25 * (20-9,5)    = 133,219 W
 *                                              Summe    = 586,219 W
 *   V_inf = 2 * 91 * 1,5 * 0,03 = 8,19 ; V_min = 0,5 * 91 = 45,5  -> 45,5 m³/h
 *   Phi_V = 0,34 * 45,5 * 30                            = 464,100 W
 * Kueche  12 m², h 2,6 -> V = 31,2 ; 1 Fassade -> e = 0,02
 *   AW 10*0,25*30 = 75,0 ; Fenster 2*0,95*30 = 57,0
 *   Boden 1,45*12*0,25*10,5 = 45,675            Summe   = 177,675 W
 *   V_min = 15,6 -> Phi_V = 0,34 * 15,6 * 30            = 159,120 W
 * Schlafen 18 m², h 2,5 -> V = 45,0 ; 2 Fassaden
 *   AW 16*0,25*30 = 120,0 ; Fenster 3*0,95*30 = 85,5 ; Dach 18*0,21*30 = 113,4
 *                                              Summe    = 318,900 W
 *   V_min = 22,5 -> Phi_V = 0,34 * 22,5 * 30            = 229,500 W
 * Flur 8 m², h 2,5 -> V = 20,0 ; kein Huellbauteil
 *   V_min = 10,0 -> Phi_V = 0,34 * 10 * 30              = 102,000 W
 *
 * Gebaeude: Phi_T = 1082,79375 W ; Phi_V = 954,72 W ; Phi = 2037,51375 W
 *           H_T   = 19,540625 + 5,9225 + 10,63 + 0 = 36,093125 W/K
 * ======================================================================== */
{
  const kl = { theta_e: -10, theta_e_m: 9.5 };
  const p = {
    klima: kl, norm: { delta_u_wb: 0.05 }, luftdichtheit: { n50: 1.5 },
    raeume: [
      rm("wohnen", 20, 35, 2.6, [
        bt("AW", 30, 0.20), bt("Fenster", 8, 0.90),
        bt("Bodenplatte", 35, 0.25, { typ: "erdreich" }),
      ], { n_min: 0.5, n_exponiert: 2 }),
      rm("kueche", 20, 12, 2.6, [
        bt("AW", 10, 0.20), bt("Fenster", 2, 0.90),
        bt("Bodenplatte", 12, 0.25, { typ: "erdreich" }),
      ], { n_min: 0.5, n_exponiert: 1 }),
      rm("schlafen", 20, 18, 2.5, [
        bt("AW", 16, 0.20), bt("Fenster", 3, 0.90), bt("Dach", 18, 0.16),
      ], { n_min: 0.5, n_exponiert: 2 }),
      rm("flur", 20, 8, 2.5, [], { n_min: 0.5, n_exponiert: 0 }),
    ],
  };
  const r = rechne("R02", p);
  nahe("R02 Wohnen Phi_T", r.raeume[0].phi_T_huelle, 586.21875, REL, true);
  nahe("R02 Wohnen Phi_V", r.raeume[0].phi_V, 464.1, REL, true);
  nahe("R02 Kueche Phi_T", r.raeume[1].phi_T_huelle, 177.675, REL, true);
  nahe("R02 Schlafen Phi_T", r.raeume[2].phi_T_huelle, 318.9, REL, true);
  nahe("R02 Flur Phi_V", r.raeume[3].phi_V, 102.0, REL, true);
  nahe("R02 Gebaeude Phi_T", r.phi_T_gebaeude, 1082.79375, REL, true);
  nahe("R02 Gebaeude Phi_V", r.phi_V_gebaeude, 954.72, REL, true);
  nahe("R02 Gebaeude Phi", r.phi_gebaeude, 2037.51375, REL, true);
  nahe("R02 Gebaeude H_T", r.H_T, 36.093125, REL, true);
}

/* ===========================================================================
 * R03  UNSANIERTER ALTBAU
 * ===========================================================================
 * theta_e = -14 °C, dt = 34 K, delta_U_WB = 0,10, n50 = 6,0, 2 Fassaden
 * Raum 40 m², h 3,2 -> V = 128 m³
 *   AW      45 * (1,40+0,10) * 34 = 2295,0 W
 *   Fenster  9 * (2,70+0,10) * 34 =  856,8 W
 *   Dach    40 * (1,00+0,10) * 34 = 1496,0 W      Summe = 4647,8 W
 *   H_T = 45*1,50 + 9*2,80 + 40*1,10 = 67,5 + 25,2 + 44,0 = 136,7 W/K
 *   V_inf = 2 * 128 * 6,0 * 0,03 = 46,08 ; V_min = 0,5 * 128 = 64,0
 *     -> Mindestluftwechsel ist maßgebend (64,0 > 46,08)
 *   Phi_V = 0,34 * 64,0 * 34 = 739,84 W
 *   Phi_Raum = 5387,64 W  ->  134,7 W/m², plausibel fuer unsaniert
 * ======================================================================== */
{
  const p = {
    klima: { theta_e: -14, theta_e_m: 8.5 }, norm: { delta_u_wb: 0.10 },
    luftdichtheit: { n50: 6.0 },
    raeume: [rm("alt", 20, 40, 3.2, [
      bt("AW", 45, 1.40), bt("Fenster", 9, 2.70), bt("Dach", 40, 1.00),
    ], { n_min: 0.5, n_exponiert: 2 })],
  };
  const r = rechne("R03", p);
  nahe("R03 Phi_T", r.raeume[0].phi_T_huelle, 4647.8, REL, true);
  nahe("R03 H_T", r.H_T, 136.7, REL, true);
  nahe("R03 V_inf", r.raeume[0].v_inf, 46.08, REL, true);
  nahe("R03 V_min", r.raeume[0].v_min, 64.0, REL, true);
  nahe("R03 Phi_V", r.raeume[0].phi_V, 739.84, REL, true);
  nahe("R03 Phi Raum", r.raeume[0].phi_raum, 5387.64, REL, true);
  pruefe(r.raeume[0].massgebend === "Mindestluftwechsel",
    "R03 der Mindestluftwechsel muss als maßgebend ausgewiesen sein, ist: "
      + r.raeume[0].massgebend);
}

/* ===========================================================================
 * R04  MEHRFAMILIENHAUS: ECK-, MITTEL- UND INNENRAUM
 * ===========================================================================
 * Gleiche Grundflaeche 25 m², h 2,5 -> V = 62,5 m³ ; theta_e = -12, dt = 32
 * delta_U_WB = 0,10 ; n50 = 3,0 ; n_min = 0,5 -> V_min = 31,25 m³/h
 *
 * Eckraum   2 Fassaden, e = 0,03: AW 18*0,45*32 = 259,2 ; Fe 5*1,40*32 = 224,0
 *           Summe 483,2 W ; V_inf = 2*62,5*3*0,03 = 11,25 -> V_min maßgebend
 * Mittelraum 1 Fassade, e = 0,02: AW 9*0,45*32 = 129,6 ; Fe 2,5*1,40*32 = 112,0
 *           Summe 241,6 W ; V_inf = 7,5 -> V_min maßgebend
 * Innenraum 0 Fassaden, e = 0: kein Huellbauteil, V_inf = 0
 *
 * In allen drei Faellen traegt der Mindestluftwechsel: Phi_V = 0,34*31,25*32
 *   = 340,0 W je Raum. Der Eckraum hat die doppelte Transmission des
 *   Mittelraums — das ist die Probe, dass die Lage wirklich durchschlaegt.
 * ======================================================================== */
{
  const p = {
    klima: { theta_e: -12, theta_e_m: 8.5 }, norm: { delta_u_wb: 0.10 },
    luftdichtheit: { n50: 3.0 },
    raeume: [
      rm("ecke", 20, 25, 2.5, [bt("AW", 18, 0.35), bt("Fenster", 5, 1.30)],
         { n_min: 0.5, n_exponiert: 2 }),
      rm("mitte", 20, 25, 2.5, [bt("AW", 9, 0.35), bt("Fenster", 2.5, 1.30)],
         { n_min: 0.5, n_exponiert: 1 }),
      rm("innen", 20, 25, 2.5, [], { n_min: 0.5, n_exponiert: 0 }),
    ],
  };
  const r = rechne("R04", p);
  nahe("R04 Ecke Phi_T", r.raeume[0].phi_T_huelle, 483.2, REL, true);
  nahe("R04 Mitte Phi_T", r.raeume[1].phi_T_huelle, 241.6, REL, true);
  nahe("R04 Innen Phi_T", r.raeume[2].phi_T_huelle, 0, 1e-12, false);
  nahe("R04 Ecke V_inf", r.raeume[0].v_inf, 11.25, REL, true);
  nahe("R04 Mitte V_inf", r.raeume[1].v_inf, 7.5, REL, true);
  nahe("R04 Innen V_inf", r.raeume[2].v_inf, 0, 1e-12, false);
  nahe("R04 Phi_V je Raum", r.raeume[0].phi_V, 340.0, REL, true);
  nahe("R04 Gebaeude Phi", r.phi_gebaeude, 1744.8, REL, true);
  nahe("R04 Gebaeude H_T", r.H_T, 22.65, REL, true);
  pruefe(r.raeume[0].phi_T_huelle > r.raeume[1].phi_T_huelle,
    "R04 der Eckraum muss mehr Transmission haben als der Mittelraum");
}

/* ===========================================================================
 * R05  GEMISCHTE RAUMTEMPERATUREN — DER GEBAEUDE-H-WERT
 * ===========================================================================
 * DIES IST DIE PROBE, DIE DEN GEFUNDENEN FEHLER FESTHAELT.
 *
 * H_T ist der spezifische Transmissionswaermeverlust des Gebaeudes, also
 *   H_T = SUM( A * U * b )
 * mit b als Temperaturanpassungsfaktor des Bauteils. H_T ist damit eine
 * EIGENSCHAFT DER HUELLE und haengt nicht davon ab, wie warm die Raeume
 * dahinter sind.
 *
 * Der Kern hat H_T bis zum 27.08.2026 aus der Gebaeudesumme zurueckgerechnet:
 *     H_T = Phi_T,Gebaeude / (20 °C - theta_e)
 * Phi_T,Gebaeude entsteht aber je Raum mit DESSEN Innentemperatur. Sobald ein
 * Raum nicht auf 20 °C steht, passen Zaehler und Nenner nicht zusammen.
 *
 * Fall (a) 20 °C und 24 °C, theta_e = -10 °C, je 10 m² Wand mit U = 1,0:
 *   Raum A: Phi = 10 * 1,0 * (20-(-10)) = 300 W   H = 10 W/K
 *   Raum B: Phi = 10 * 1,0 * (24-(-10)) = 340 W   H = 10 W/K
 *   Phi_T = 640 W ; richtig: H_T = 20,0 W/K
 *   alte Rechnung: 640 / 30 = 21,3333 W/K  ->  6,67 % zu GROSS
 *
 * Fall (b) zusaetzlich ein Treppenhaus mit 15 °C:
 *   Raum C: Phi = 10 * 1,0 * (15-(-10)) = 250 W   H = 10 W/K
 *   Phi_T = 890 W ; richtig: H_T = 30,0 W/K
 *   alte Rechnung: 890 / 30 = 29,6667 W/K  ->  1,11 % zu KLEIN
 *
 * Beide Richtungen sind belegt; der Fehler haelt sich also nicht an eine
 * sichere Seite. Der Referenzfall Maelzerstrasse (12 Raeume 20 °C, 3 Baeder
 * 24 °C, 3 Treppenhaeuser 15 °C) lag mit 218,04 statt 225,02 W/K um 3,10 %
 * zu niedrig — und die Schnappschussdatei hat diesen Wert als Soll
 * festgeschrieben.
 * ======================================================================== */
{
  const kl = { theta_e: -10, theta_e_m: 9.0 };
  const wand = function () { return [bt("AW", 10, 1.0)]; };

  const ra = rechne("R05a", projekt(kl, [
    rm("A", 20, 10, 2.5, wand()), rm("B", 24, 10, 2.5, wand()),
  ]));
  nahe("R05a Phi Raum A", ra.raeume[0].phi_T_huelle, 300.0, REL, true);
  nahe("R05a Phi Raum B", ra.raeume[1].phi_T_huelle, 340.0, REL, true);
  nahe("R05a Phi_T Gebaeude", ra.phi_T_gebaeude, 640.0, REL, true);
  nahe("R05a H_T (Huelleneigenschaft)", ra.H_T, 20.0, REL, true);

  const rb = rechne("R05b", projekt(kl, [
    rm("A", 20, 10, 2.5, wand()), rm("B", 24, 10, 2.5, wand()),
    rm("C", 15, 10, 2.5, wand()),
  ]));
  nahe("R05b Phi Raum C", rb.raeume[2].phi_T_huelle, 250.0, REL, true);
  nahe("R05b Phi_T Gebaeude", rb.phi_T_gebaeude, 890.0, REL, true);
  nahe("R05b H_T (Huelleneigenschaft)", rb.H_T, 30.0, REL, true);

  /* Die eigentliche Invariante, unabhaengig von jeder Zahl: H_T darf sich
     nicht aendern, wenn nur die Raumtemperaturen anders eingestellt werden.
     Dieselbe Huelle, alle Raeume auf 20 °C. */
  const rc = rechne("R05c", projekt(kl, [
    rm("A", 20, 10, 2.5, wand()), rm("B", 20, 10, 2.5, wand()),
    rm("C", 20, 10, 2.5, wand()),
  ]));
  nahe("R05c H_T bei gleicher Huelle unveraendert", rc.H_T, rb.H_T, REL, true);
  pruefe(Math.abs(rc.phi_T_gebaeude - rb.phi_T_gebaeude) > 1,
    "R05c die Heizlast MUSS sich mit der Raumtemperatur aendern (Gegenprobe, "
      + "damit die Invariante oben nicht trivial erfuellt ist)");
}

/* ===========================================================================
 * R06  UNBEHEIZTER KELLER, GLEICHGEWICHTSBILANZ
 * ===========================================================================
 * theta_e = -10 °C. Zone "Keller":
 *   Huelle der Zone nach aussen: 30 m² * 1,0 = 30 W/K
 *   Zufuhr aus dem beheizten Raum: Kellerdecke 50 m² * 0,8 = 40 W/K bei 20 °C
 *   theta_u = (40 * 20 + 30 * (-10)) / (40 + 30) = 500 / 70 = 7,142857 °C
 * Beheizter Raum darueber, theta_i = 20 °C, kein Waermebrueckenzuschlag:
 *   Kellerdecke 50 * 0,8 * (20 - 7,142857) = 514,2857 W ; H = 17,142857 W/K
 *   Aussenwand  20 * 0,30 * 30             = 180,0000 W ; H =  6,000000 W/K
 *                                    Summe = 694,2857 W ; H_T = 23,142857 W/K
 * Die Zufuhr aus dem beheizten Raum geht OHNE Waermebrueckenzuschlag in die
 * Bilanz ein; der Zuschlag beschreibt die Waermebruecke des beheizten Raums.
 * ======================================================================== */
{
  const p = projekt({ theta_e: -10, theta_e_m: 9.0 }, [
    rm("eg", 20, 50, 2.5, [
      bt("Kellerdecke", 50, 0.8, { typ: "zone", ref: "keller" }),
      bt("AW", 20, 0.30),
    ]),
  ], {
    zonen: [{
      id: "keller", name: "Keller", modus: "bilanz",
      huelle: [bt("Kellerwand", 30, 1.0)],
    }],
  });
  const r = rechne("R06", p);
  nahe("R06 theta_u Keller", r.zonen.keller, 7.142857142857143, ITER, false);
  nahe("R06 Phi Kellerdecke", r.raeume[0].bauteile[0].phi, 514.2857142857143, ITER, true);
  nahe("R06 Phi_T Raum", r.raeume[0].phi_T_huelle, 694.2857142857143, ITER, true);
  nahe("R06 H_T", r.H_T, 23.142857142857142, ITER, true);
  pruefe(r.raeume[0].bauteile[0].theta_j > -10 && r.raeume[0].bauteile[0].theta_j < 20,
    "R06 die Kellertemperatur muss zwischen aussen und innen liegen");
}

/* ===========================================================================
 * R07  TEILUNTERKELLERUNG
 * ===========================================================================
 * Dieselbe Zone wie R06 (theta_u = 7,142857 °C), aber nur ein Teil des
 * Erdgeschosses liegt darueber. Der zweite Raum steht auf der Bodenplatte.
 *   Raum ueber Keller: 50 * 0,8 * (20 - 7,142857) = 514,2857 W
 *   Raum auf Platte  : erdberuehrt, theta_e_m = 9,5 °C
 *       f_ig = (20 - 9,5) / (20 - (-10)) = 10,5 / 30 = 0,35
 *       H    = 1,45 * 0,35 * 30 * 0,35 * 1,00 = 5,32875 W/K
 *       Phi  = 5,32875 * 30                   = 159,8625 W
 *       Gegenprobe: 1,45 * 30 * 0,35 * 10,5   = 159,8625 W
 *   Gebaeude: Phi_T = 674,148214 W ; H_T = 22,471607 W/K
 * ======================================================================== */
{
  const p = projekt({ theta_e: -10, theta_e_m: 9.5 }, [
    rm("ueber_keller", 20, 50, 2.5, [
      bt("Kellerdecke", 50, 0.8, { typ: "zone", ref: "keller" }),
    ]),
    rm("auf_platte", 20, 30, 2.5, [
      bt("Bodenplatte", 30, 0.35, { typ: "erdreich" }),
    ]),
  ], {
    zonen: [{
      id: "keller", name: "Keller", modus: "bilanz",
      huelle: [bt("Kellerwand", 30, 1.0)],
    }],
  });
  const r = rechne("R07", p);
  nahe("R07 ueber Keller", r.raeume[0].phi_T_huelle, 514.2857142857143, ITER, true);
  nahe("R07 auf Bodenplatte", r.raeume[1].phi_T_huelle, 159.8625, REL, true);
  nahe("R07 f_ig", r.raeume[1].bauteile[0].f_ig, 0.35, REL, true);
  nahe("R07 Gebaeude Phi_T", r.phi_T_gebaeude, 674.1482142857143, ITER, true);
  nahe("R07 Gebaeude H_T", r.H_T, 22.471607142857142, ITER, true);
}

/* ===========================================================================
 * R08  ERDBERUEHRTE BAUTEILE, f_ig
 * ===========================================================================
 * theta_e = -16 °C, theta_e_m = 8,0 °C, theta_i = 20 °C
 * Bodenplatte A = 100 m², U_equiv = 0,30 W/(m²K)
 *   f_ig = (20 - 8) / (20 - (-16)) = 12 / 36 = 0,333333
 *   H_T,ig = 1,45 * 0,333333 * 100 * 0,30 * 1,00 = 14,50 W/K
 *   Phi    = 14,50 * 36                          = 522,0 W
 *   Gegenprobe ohne f_ig: 1,45 * 100 * 0,30 * (20 - 8) = 522,0 W
 * Der Waermebrueckenzuschlag darf hier NICHT aufschlagen: erdberuehrte
 * Bauteile rechnen ueber f_theta_ann / f_ig / f_GW.
 * ======================================================================== */
{
  const p = projekt({ theta_e: -16, theta_e_m: 8.0 }, [
    rm("keller", 20, 100, 2.5, [bt("Bodenplatte", 100, 0.30, { typ: "erdreich" })]),
  ], { norm: { delta_u_wb: 0.10 } });
  const r = rechne("R08", p);
  nahe("R08 f_ig", r.raeume[0].bauteile[0].f_ig, 1 / 3, REL, true);
  nahe("R08 H erdberuehrt", r.raeume[0].bauteile[0].H, 14.5, REL, true);
  nahe("R08 Phi erdberuehrt", r.raeume[0].bauteile[0].phi, 522.0, REL, true);
  nahe("R08 U bleibt ohne Zuschlag", r.raeume[0].bauteile[0].U_eff, 0.30, REL, true);
  nahe("R08 H_T", r.H_T, 14.5, REL, true);
}

/* ===========================================================================
 * R09  DACHGESCHOSS UND BELUEFTETES KALTDACH
 * ===========================================================================
 * Ein stark belueftetes Kaltdach hat f_1 = 1,0; damit wird
 *   theta_u = theta_bezug - 1,0 * (theta_bezug - theta_e) = theta_e.
 * Die oberste Geschossdecke rechnet dann wie ein Bauteil gegen Aussenluft.
 * theta_e = -12 °C, dt = 32 K, kein Zuschlag:
 *   Geschossdecke 40 * 0,25 * 32 = 320,0 W ; H = 10,0 W/K
 *   Schraegdach   30 * 0,20 * 32 = 192,0 W ; H =  6,0 W/K
 *                          Summe = 512,0 W ; H_T = 16,0 W/K
 * ======================================================================== */
{
  const p = projekt({ theta_e: -12, theta_e_m: 8.5 }, [
    rm("dg", 20, 40, 2.4, [
      bt("Geschossdecke", 40, 0.25, { typ: "zone", ref: "spitzboden" }),
      bt("Schraegdach", 30, 0.20),
    ]),
  ], {
    zonen: [{
      id: "spitzboden", name: "Spitzboden", modus: "f1", art: "dach_belueftet",
      huelle: [],
    }],
  });
  const r = rechne("R09", p);
  nahe("R09 theta_u Kaltdach gleich aussen",
    r.raeume[0].bauteile[0].theta_j, -12.0, ITER, false);
  nahe("R09 Phi Geschossdecke", r.raeume[0].bauteile[0].phi, 320.0, ITER, true);
  nahe("R09 Phi Schraegdach", r.raeume[0].bauteile[1].phi, 192.0, REL, true);
  nahe("R09 Phi_T", r.raeume[0].phi_T_huelle, 512.0, ITER, true);
  nahe("R09 H_T", r.H_T, 16.0, ITER, true);
}

/* ===========================================================================
 * R10  FENSTER UND TUEREN
 * ===========================================================================
 * theta_e = -10 °C, dt = 30 K, delta_U_WB = 0,10 (Vorgabe des Werkzeugs)
 *   AW      25 * (0,28+0,10) * 30 = 285,0 W ; H = 25 * 0,38 =  9,50 W/K
 *   Fenster 12 * (1,30+0,10) * 30 = 504,0 W ; H = 12 * 1,40 = 16,80 W/K
 *   Haustuer 2,2 * (1,80+0,10) * 30 = 125,4 W ; H = 2,2 * 1,90 = 4,18 W/K
 *                            Summe = 914,4 W ; H_T = 30,48 W/K
 * Fenster und Tueren sind Huellbauteile und bekommen den Zuschlag; das ist
 * die pauschale Vorgehensweise des Werkzeugs und im Bericht ausgewiesen.
 * ======================================================================== */
{
  const p = projekt({ theta_e: -10, theta_e_m: 9.0 }, [
    rm("wohnen", 20, 30, 2.5, [
      bt("AW", 25, 0.28), bt("Fenster", 12, 1.30), bt("Haustuer", 2.2, 1.80),
    ]),
  ], { norm: { delta_u_wb: 0.10 } });
  const r = rechne("R10", p);
  nahe("R10 Phi AW", r.raeume[0].bauteile[0].phi, 285.0, REL, true);
  nahe("R10 Phi Fenster", r.raeume[0].bauteile[1].phi, 504.0, REL, true);
  nahe("R10 Phi Haustuer", r.raeume[0].bauteile[2].phi, 125.4, REL, true);
  nahe("R10 Phi_T", r.raeume[0].phi_T_huelle, 914.4, REL, true);
  nahe("R10 H_T", r.H_T, 30.48, REL, true);
}

/* ===========================================================================
 * R11  NATUERLICHE LUEFTUNG: INFILTRATION GEGEN MINDESTLUFTWECHSEL
 * ===========================================================================
 * V_inf = 2 * V * n50 * e * epsilon ; V_min = n_min * V ; maßgebend ist das
 * Maximum. theta_e = -12 °C, dt = 32 K, Raum 30 m², h 3,0 -> V = 90 m³,
 * 2 exponierte Fassaden -> e = 0,03, epsilon = 1,0, n_min = 0,5 -> V_min = 45.
 *
 * (a) undicht, n50 = 10: V_inf = 2*90*10*0,03 = 54,0 > 45  -> Infiltration
 *     Phi_V = 0,34 * 54,0 * 32 = 587,52 W
 * (b) dicht,  n50 = 1,5: V_inf = 2*90*1,5*0,03 = 8,1 < 45  -> Mindestwechsel
 *     Phi_V = 0,34 * 45,0 * 32 = 489,60 W
 * ======================================================================== */
{
  const mach = function (n50) {
    return {
      klima: { theta_e: -12, theta_e_m: 8.5 }, norm: { delta_u_wb: 0 },
      luftdichtheit: { n50: n50 },
      raeume: [rm("r", 20, 30, 3.0, [], { n_min: 0.5, n_exponiert: 2 })],
    };
  };
  const ra = rechne("R11a", mach(10));
  nahe("R11a V_inf", ra.raeume[0].v_inf, 54.0, REL, true);
  nahe("R11a Phi_V", ra.raeume[0].phi_V, 587.52, REL, true);
  pruefe(ra.raeume[0].massgebend === "Infiltration",
    "R11a die Infiltration muss als maßgebend ausgewiesen sein, ist: "
      + ra.raeume[0].massgebend);
  const rb = rechne("R11b", mach(1.5));
  nahe("R11b V_inf", rb.raeume[0].v_inf, 8.1, REL, true);
  nahe("R11b Phi_V", rb.raeume[0].phi_V, 489.6, REL, true);
  pruefe(rb.raeume[0].massgebend === "Mindestluftwechsel",
    "R11b der Mindestluftwechsel muss als maßgebend ausgewiesen sein, ist: "
      + rb.raeume[0].massgebend);
}

/* ===========================================================================
 * R12  MECHANISCHE LUEFTUNG MIT WAERMERUECKGEWINNUNG
 * ===========================================================================
 * BEFUND, NICHT ABNAHME: der Rechenkern kennt KEINE mechanische Lueftung. Es
 * gibt kein Feld dafuer, keinen Wirkungsgrad und keinen Anlagenluftstrom. Ein
 * Projekt mit Lueftungsanlage rechnet deshalb mit dem natuerlichen
 * Luftwechsel — die Lueftungsheizlast fällt also eher ZU GROSS aus, was die
 * sichere Richtung ist, aber eben nicht die Anlage abbildet.
 *
 * Diese Probe haelt zwei Dinge fest:
 *   1. Der Kern rechnet nachweisbar OHNE Rueckgewinnung weiter (Zahl gleich
 *      R11b, obwohl eine Anlage mit 85 % angegeben ist).
 *   2. Er verschweigt das nicht: die Angabe muss zu einer Warnung fuehren.
 * Punkt 2 war bis zum 27.08.2026 nicht erfuellt; die Angabe verschwand
 * stillschweigend. Eine Formel wird hier NICHT erfunden: die Umsetzung nach
 * DIN EN 12831-1 braucht den Normtext und die Freigabe eines Fachplaners.
 * ======================================================================== */
{
  const p = {
    klima: { theta_e: -12, theta_e_m: 8.5 }, norm: { delta_u_wb: 0 },
    luftdichtheit: { n50: 1.5 },
    lueftung: { art: "mechanisch", wrg: true, eta: 0.85 },
    raeume: [rm("r", 20, 30, 3.0, [], { n_min: 0.5, n_exponiert: 2 })],
  };
  const r = rechne("R12", p);
  nahe("R12 rechnet weiter ohne Rueckgewinnung", r.raeume[0].phi_V, 489.6, REL, true);
  const gesagt = (r.warnungen || []).some(function (w) {
    return /L(ü|ue)ftungsanlage|R(ü|ue)ckgewinnung|WRG/i.test(w);
  });
  pruefe(gesagt, "R12 eine angegebene Lueftungsanlage mit Waermerueckgewinnung "
    + "MUSS als nicht abgebildet gemeldet werden, sonst taeuscht das Ergebnis "
    + "eine Beruecksichtigung vor. Warnungen: "
    + JSON.stringify(r.warnungen || []));
}

/* ===========================================================================
 * R13  WAERMEBRUECKENZUSCHLAG NUR AUF HUELLBAUTEILE
 * ===========================================================================
 * theta_e = -10 °C, theta_e_m = 9,5 °C, theta_i = 20 °C, delta_U_WB = 0,10
 *   Huelle   AW 20 m², U 0,30 -> U_eff 0,40 : 20*0,40*30 = 240,000 W
 *   Nachbar  Haustrennwand 15 m², U 0,50, theta_j 18 °C, KEIN Zuschlag:
 *            15*0,50*2 = 15,000 W ; H = 15/30 = 0,500 W/K
 *   Innen    Innenwand 10 m², U 1,00 gegen 24 °C, KEIN Zuschlag:
 *            10*1,00*(20-24) = -40,000 W  (Waermegewinn, negativ)
 *   Erdreich Bodenplatte 25 m², U 0,35, KEIN Zuschlag:
 *            f_ig = 10,5/30 = 0,35 ; H = 1,45*0,35*25*0,35 = 4,440625 W/K
 *            Phi = 4,440625*30 = 133,21875 W
 *   Phi_T,Huelle (Huelle+Nachbar+Erdreich) = 240 + 15 + 133,21875 = 388,21875 W
 *   Phi_T,Innen = -40 W ; Phi_Raum = 348,21875 W
 *   H_T = 20*0,40 + 0,50 + 4,440625 = 12,940625 W/K
 * ======================================================================== */
{
  const p = projekt({ theta_e: -10, theta_e_m: 9.5 }, [
    rm("r", 20, 40, 2.5, [
      bt("AW", 20, 0.30),
      bt("Haustrennwand", 15, 0.50, { typ: "fest", theta: 18 }, "nachbar"),
      bt("Innenwand", 10, 1.00, { typ: "fest", theta: 24 }, "innen"),
      bt("Bodenplatte", 25, 0.35, { typ: "erdreich" }),
    ]),
  ], { norm: { delta_u_wb: 0.10 } });
  const r = rechne("R13", p);
  const b = r.raeume[0].bauteile;
  nahe("R13 Huelle U_eff mit Zuschlag", b[0].U_eff, 0.40, REL, true);
  nahe("R13 Nachbar U_eff ohne Zuschlag", b[1].U_eff, 0.50, REL, true);
  nahe("R13 Innen U_eff ohne Zuschlag", b[2].U_eff, 1.00, REL, true);
  nahe("R13 Erdreich U_eff ohne Zuschlag", b[3].U_eff, 0.35, REL, true);
  nahe("R13 Phi Huelle", b[0].phi, 240.0, REL, true);
  nahe("R13 Phi Nachbar", b[1].phi, 15.0, REL, true);
  nahe("R13 Phi Innen (Gewinn)", b[2].phi, -40.0, REL, true);
  nahe("R13 Phi Erdreich", b[3].phi, 133.21875, REL, true);
  nahe("R13 Phi_T Huelle", r.raeume[0].phi_T_huelle, 388.21875, REL, true);
  nahe("R13 Phi_T Innen", r.raeume[0].phi_T_innen, -40.0, REL, true);
  nahe("R13 Phi Raum", r.raeume[0].phi_raum, 348.21875, REL, true);
  nahe("R13 H_T", r.H_T, 12.940625, REL, true);
}

/* ===========================================================================
 * R14  AUFHEIZZUSCHLAG
 * ===========================================================================
 * Phi_RH = A * f_RH. Raum 30 m², f_RH = 18 W/m² -> 540 W.
 * theta_e = -10, dt = 30, AW 20 m² U 0,25 ohne Zuschlag -> 150 W.
 *   Phi_Raum = 150 + 540 = 690 W ; Phi_Gebaeude ebenso (Aufheizen zaehlt mit)
 * Ohne Angabe ist f_RH = 0: ein Aufheizzuschlag entsteht nie von selbst.
 * ======================================================================== */
{
  const bauen = function (fRH) {
    return projekt({ theta_e: -10, theta_e_m: 9.0 }, [
      rm("r", 20, 30, 2.5, [bt("AW", 20, 0.25)], { f_RH: fRH }),
    ]);
  };
  const r = rechne("R14", bauen(18));
  nahe("R14 Phi_RH", r.raeume[0].phi_RH, 540.0, REL, true);
  nahe("R14 Phi Raum mit Aufheizen", r.raeume[0].phi_raum, 690.0, REL, true);
  nahe("R14 Phi Gebaeude mit Aufheizen", r.phi_gebaeude, 690.0, REL, true);
  const r0 = rechne("R14b", bauen(undefined));
  nahe("R14 ohne Angabe kein Zuschlag", r0.raeume[0].phi_RH, 0, 1e-12, false);
}

/* ===========================================================================
 * R15  FEHLENDE UND UNGUELTIGE KLIMADATEN
 * ===========================================================================
 * Ohne Klima faellt der Kern auf die KAELTESTEN Werte der eigenen PLZ-Tabelle
 * zurueck (theta_e = -19,2 °C, theta_e_m = 0,1 °C). Das ist die sichere
 * Richtung — die Heizlast wird eher zu gross — und MUSS als Warnung mit
 * Ersatzwert und Fehlerrichtung erscheinen. Kein stiller Standardwert.
 *   AW 20 m², U 0,25, theta_i 20: Phi = 20*0,25*(20-(-19,2)) = 196,0 W
 * Ein unbrauchbarer Text ("kalt") muss genauso behandelt werden wie ein
 * fehlender Wert und darf nicht stillschweigend zu 0 °C werden: mit 0 °C waere
 * Phi = 100 W, also fast die Haelfte.
 * ======================================================================== */
{
  const raeume = [rm("r", 20, 20, 2.5, [bt("AW", 20, 0.25)])];
  const rOhne = rechne("R15a", { norm: { delta_u_wb: 0 },
    luftdichtheit: { n50: 0 }, raeume: JSON.parse(JSON.stringify(raeume)) });
  nahe("R15a theta_e Rueckfall", rOhne.klima.theta_e, -19.2, REL, true);
  nahe("R15a Phi mit Rueckfall", rOhne.raeume[0].phi_T_huelle, 196.0, REL, true);
  pruefe((rOhne.warnungen || []).some(function (w) {
    return /-19,2|19,2/.test(w) && /theta_e|Außentemperatur/i.test(w);
  }), "R15a die Warnung muss den Ersatzwert nennen: "
      + JSON.stringify(rOhne.warnungen));
  pruefe((rOhne.warnungen || []).some(function (w) { return /zu groß/i.test(w); }),
    "R15a die Warnung muss die Fehlerrichtung nennen");

  const rMuell = rechne("R15b", { klima: { theta_e: "kalt", theta_e_m: "mild" },
    norm: { delta_u_wb: 0 }, luftdichtheit: { n50: 0 },
    raeume: JSON.parse(JSON.stringify(raeume)) });
  nahe("R15b unbrauchbarer Text wie fehlend", rMuell.klima.theta_e, -19.2, REL, true);
  pruefe(rMuell.raeume[0].phi_T_huelle > 150,
    "R15b ein unbrauchbarer Text darf nicht stillschweigend 0 °C bedeuten "
      + "(Phi waere dann 100 W), ist: " + rMuell.raeume[0].phi_T_huelle);

  /* Ein gueltiger Wert 0 °C ist etwas anderes als ein fehlender: er muss
     durchgehen und darf KEINEN Rueckfall ausloesen. */
  const rNull = rechne("R15c", { klima: { theta_e: 0, theta_e_m: 10 },
    norm: { delta_u_wb: 0 }, luftdichtheit: { n50: 0 },
    raeume: JSON.parse(JSON.stringify(raeume)) });
  nahe("R15c gueltige 0 °C bleiben 0 °C", rNull.klima.theta_e, 0, 1e-12, false);
  nahe("R15c Phi bei 0 °C", rNull.raeume[0].phi_T_huelle, 100.0, REL, true);
}

/* ===========================================================================
 * R16  KEINE RAEUME
 * ===========================================================================
 * Ohne Raeume darf nichts NaN werden und nichts als Ergebnis erscheinen. Die
 * spezifische Heizlast je Quadratmeter ist bei A = 0 nicht definiert; sie
 * darf keine Zahl vortaeuschen, die durch Null geteilt entstanden ist.
 * ======================================================================== */
{
  const r = rechne("R16", projekt({ theta_e: -12, theta_e_m: 8.5 }, []));
  nahe("R16 Phi Gebaeude", r.phi_gebaeude, 0, 1e-12, false);
  nahe("R16 A gesamt", r.A_gesamt, 0, 1e-12, false);
  pruefe(Number.isFinite(r.spez_raumflaeche),
    "R16 die spezifische Last darf nicht NaN oder Infinity sein, ist: "
      + r.spez_raumflaeche);
  pruefe(unsauber(r).length === 0,
    "R16 kein NaN und kein Infinity im ganzen Ergebnis: "
      + unsauber(r).join(", "));
}

/* ===========================================================================
 * R17  SANIERUNGSVERGLEICH VORHER / NACHHER
 * ===========================================================================
 * Gleiche Geometrie, theta_e = -12 °C, dt = 32 K, Raum 50 m², h 2,6 -> V = 130.
 * 2 exponierte Fassaden, n_min = 0,5 -> V_min = 65 m³/h.
 *
 * vorher  (delta_U_WB 0,10 ; n50 6,0):
 *   AW 60*(1,40+0,10)*32 = 2880,0 ; Fe 14*(2,70+0,10)*32 = 1254,4
 *   Dach 50*(0,90+0,10)*32 = 1600,0            Phi_T = 5734,4 W
 *   V_inf = 2*130*6,0*0,03 = 46,8 < 65 -> V_min ; Phi_V = 0,34*65*32 = 707,2 W
 *   Phi_Raum = 6441,6 W ; H_T = 90 + 39,2 + 50 = 179,2 W/K
 * nachher (delta_U_WB 0,05 ; n50 1,5):
 *   AW 60*(0,20+0,05)*32 = 480,0 ; Fe 14*(0,90+0,05)*32 = 425,6
 *   Dach 50*(0,14+0,05)*32 = 304,0             Phi_T = 1209,6 W
 *   V_inf = 2*130*1,5*0,03 = 11,7 < 65 -> V_min ; Phi_V = 707,2 W
 *   Phi_Raum = 1916,8 W ; H_T = 15 + 13,3 + 9,5 = 37,8 W/K
 * Verhaeltnis 1916,8 / 6441,6 = 0,2976 — die Lueftung bleibt als Sockel, die
 * Sanierung kann sie nicht wegdaemmen. Genau das muss der Vergleich zeigen.
 * ======================================================================== */
{
  const bauen = function (uAW, uFe, uDach, dwb, n50) {
    return {
      klima: { theta_e: -12, theta_e_m: 8.5 }, norm: { delta_u_wb: dwb },
      luftdichtheit: { n50: n50 },
      raeume: [rm("r", 20, 50, 2.6, [
        bt("AW", 60, uAW), bt("Fenster", 14, uFe), bt("Dach", 50, uDach),
      ], { n_min: 0.5, n_exponiert: 2 })],
    };
  };
  const v = rechne("R17 vorher", bauen(1.40, 2.70, 0.90, 0.10, 6.0));
  const n = rechne("R17 nachher", bauen(0.20, 0.90, 0.14, 0.05, 1.5));
  nahe("R17 vorher Phi_T", v.raeume[0].phi_T_huelle, 5734.4, REL, true);
  nahe("R17 vorher Phi_V", v.raeume[0].phi_V, 707.2, REL, true);
  nahe("R17 vorher Phi Raum", v.raeume[0].phi_raum, 6441.6, REL, true);
  nahe("R17 vorher H_T", v.H_T, 179.2, REL, true);
  nahe("R17 nachher Phi_T", n.raeume[0].phi_T_huelle, 1209.6, REL, true);
  nahe("R17 nachher Phi Raum", n.raeume[0].phi_raum, 1916.8, REL, true);
  nahe("R17 nachher H_T", n.H_T, 37.8, REL, true);
  nahe("R17 Lueftungssockel unveraendert",
    n.raeume[0].phi_V, v.raeume[0].phi_V, REL, true);
  pruefe(n.raeume[0].phi_raum < v.raeume[0].phi_raum,
    "R17 die Sanierung muss die Heizlast senken");
}

/* ===========================================================================
 * R18  WAERMEUEBERTRAGUNG ZWISCHEN UNTERSCHIEDLICH WARMEN RAEUMEN
 * ===========================================================================
 * Bad 24 °C und Schlafzimmer 20 °C, gemeinsame Innenwand 10 m², U = 1,0.
 *   Bad:      10 * 1,0 * (24 - 20) = +40 W  (Verlust ins Schlafzimmer)
 *   Schlafen: 10 * 1,0 * (20 - 24) = -40 W  (Gewinn aus dem Bad)
 * Auf GEBAEUDEEBENE heben sich beide auf: die Waerme verlaesst das Gebaeude
 * nicht. Sie darf deshalb in Phi_Gebaeude NICHT auftauchen — sonst waere sie
 * doppelt gezaehlt (einmal als Verlust, einmal als Gewinn) oder, schlimmer,
 * einseitig gezaehlt.
 * Fuer die HEIZKOERPERAUSLEGUNG dagegen muss sie im Raum stehen: das Bad
 * braucht die 40 W zusaetzlich.
 * ======================================================================== */
{
  const bauen = function (uInnen) {
    return projekt({ theta_e: -10, theta_e_m: 9.0 }, [
      rm("bad", 24, 8, 2.5, [
        bt("AW", 6, 0.30),
        bt("Wand zum Schlafzimmer", 10, uInnen, { typ: "raum", ref: "schlafen" }, "innen"),
      ]),
      rm("schlafen", 20, 16, 2.5, [
        bt("AW", 12, 0.30),
        bt("Wand zum Bad", 10, uInnen, { typ: "raum", ref: "bad" }, "innen"),
      ]),
    ]);
  };
  const r = rechne("R18", bauen(1.0));
  nahe("R18 Bad Innenanteil", r.raeume[0].phi_T_innen, 40.0, REL, true);
  nahe("R18 Schlafen Innenanteil", r.raeume[1].phi_T_innen, -40.0, REL, true);
  const summeInnen = r.raeume.reduce(function (s, x) { return s + x.phi_T_innen; }, 0);
  nahe("R18 Innenanteile heben sich auf", summeInnen, 0, 1e-9, false);
  nahe("R18 Phi Gebaeude ohne Innenanteil",
    r.phi_gebaeude, r.phi_raeume_summe - summeInnen, 1e-9, false);

  /* Die scharfe Probe: die Innenwand daemmen oder verdoppeln darf die
     GEBAEUDE-Heizlast nicht um ein Watt bewegen. */
  const rDicht = rechne("R18b", bauen(0.2));
  const rDick = rechne("R18c", bauen(5.0));
  nahe("R18 Gebaeude unabhaengig von der Innenwand (0,2)",
    rDicht.phi_gebaeude, r.phi_gebaeude, 1e-9, true);
  nahe("R18 Gebaeude unabhaengig von der Innenwand (5,0)",
    rDick.phi_gebaeude, r.phi_gebaeude, 1e-9, true);
  pruefe(rDick.raeume[0].phi_raum > r.raeume[0].phi_raum,
    "R18 im RAUM muss die Innenwand dagegen wirken (Gegenprobe)");
}

/* ===========================================================================
 * R19  EXTREME, ABER GUELTIGE EINGABEN
 * ===========================================================================
 * (a) gross: theta_e = -30 °C, theta_i = 30 °C, dt = 60 K,
 *     A = 1000 m², U = 5,0 -> Phi = 1000*5,0*60 = 300 000 W = 300 kW
 * (b) klein: A = 0,5 m², U = 0,05 -> Phi = 0,5*0,05*60 = 1,5 W
 * Beides muss exakt und endlich herauskommen; nichts darf abgeschnitten,
 * gerundet oder als unplausibel verworfen werden.
 * ======================================================================== */
{
  const kl = { theta_e: -30, theta_e_m: -2 };
  const rGross = rechne("R19a", projekt(kl,
    [rm("r", 30, 1000, 3, [bt("AW", 1000, 5.0)])]));
  nahe("R19a Phi extrem gross", rGross.raeume[0].phi_T_huelle, 300000.0, REL, true);
  const rKlein = rechne("R19b", projekt(kl,
    [rm("r", 30, 0.5, 2, [bt("AW", 0.5, 0.05)])]));
  nahe("R19b Phi extrem klein", rKlein.raeume[0].phi_T_huelle, 1.5, REL, true);
  pruefe(unsauber(rGross).length === 0 && unsauber(rKlein).length === 0,
    "R19 keine unsauberen Zahlen bei extremen Eingaben");
}

/* ===========================================================================
 * R20  DEZIMALTRENNZEICHEN, EINHEITEN, GRENZWERTE
 * ===========================================================================
 * Die Oberflaeche liefert deutsche Zahlen als Text ("0,25"). Der Kern muss
 * daraus dieselbe Zahl machen wie aus 0.25 — sonst rechnet er mit 0 weiter.
 *   Text-Fassung und Zahl-Fassung MUESSEN bitgleich dasselbe Ergebnis geben.
 * Grenzwerte: A = 0 und U = 0 tragen nichts bei und sind keine Fehler.
 * ======================================================================== */
{
  const pZahl = projekt({ theta_e: -12, theta_e_m: 8.5 },
    [rm("r", 20.5, 24, 2.5, [bt("AW", 18.5, 0.25)])]);
  const pText = projekt({ theta_e: "-12", theta_e_m: "8,5" },
    [rm("r", "20,5", "24", "2,5", [bt("AW", "18,5", "0,25")])]);
  const rZ = rechne("R20a", pZahl);
  const rT = rechne("R20b", pText);
  nahe("R20 Text gleich Zahl (Phi_T)",
    rT.raeume[0].phi_T_huelle, rZ.raeume[0].phi_T_huelle, 0, false);
  nahe("R20 Text gleich Zahl (Phi Gebaeude)",
    rT.phi_gebaeude, rZ.phi_gebaeude, 0, false);
  /* Handrechnung: 18,5 * 0,25 * (20,5 - (-12)) = 4,625 * 32,5 = 150,3125 W */
  nahe("R20 Phi_T von Hand", rZ.raeume[0].phi_T_huelle, 150.3125, REL, true);

  const rGrenz = rechne("R20c", projekt({ theta_e: -12, theta_e_m: 8.5 },
    [rm("r", 20, 10, 2.5, [bt("Nullflaeche", 0, 1.5), bt("Nullwert", 10, 0)])]));
  nahe("R20 Grenzwerte tragen nichts bei", rGrenz.raeume[0].phi_T_huelle, 0, 1e-12, false);
  pruefe(unsauber(rGrenz).length === 0, "R20 Grenzwerte erzeugen kein NaN");
}

/* ===========================================================================
 * R21  INVARIANTEN UEBER ALLE FAELLE
 * ===========================================================================
 * Diese Probe laeuft ueber JEDES Ergebnis, das oben entstanden ist.
 *   1. Nirgends NaN oder Infinity.
 *   2. Die ausgewiesenen Komponenten muessen die Summe ergeben:
 *      Phi_Gebaeude = Phi_T,Gebaeude + Phi_V,Gebaeude + Phi_RH,Gebaeude
 *   3. Die Raumsumme muss sich um genau die Innenanteile unterscheiden.
 *   4. H_T darf nicht negativ sein.
 * ======================================================================== */
{
  alleErgebnisse.forEach(function (e) {
    const r = e.r;
    const dreck = unsauber(r);
    pruefe(dreck.length === 0,
      "R21 " + e.name + ": unsaubere Zahl an " + dreck.slice(0, 5).join(", "));
    const summe = r.phi_T_gebaeude + r.phi_V_gebaeude + r.phi_RH_gebaeude;
    pruefe(Math.abs(summe - r.phi_gebaeude) <= Math.max(1e-9 * Math.abs(summe), 1e-9),
      "R21 " + e.name + ": Komponenten ergeben nicht die Summe ("
        + summe + " gegen " + r.phi_gebaeude + ")");
    const innen = r.raeume.reduce(function (s, x) { return s + x.phi_T_innen; }, 0);
    pruefe(Math.abs((r.phi_raeume_summe - innen) - r.phi_gebaeude)
             <= Math.max(1e-9 * Math.abs(r.phi_gebaeude), 1e-9),
      "R21 " + e.name + ": Raumsumme minus Innenanteile ist nicht die "
        + "Gebaeudelast");
    pruefe(r.H_T >= -1e-12, "R21 " + e.name + ": H_T ist negativ (" + r.H_T + ")");
  });
}

/* ===========================================================================
 * R22  MONOTONIE
 * ===========================================================================
 * Bei sonst gleichen Bedingungen darf ein groesserer U-Wert oder eine
 * groessere Aussenflaeche die zugehoerige Transmissionslast NICHT verringern.
 * Geprueft wird nicht nur "irgendwie mehr", sondern die Reihe: 20 Schritte,
 * jeder Schritt muss mindestens so gross sein wie der vorige.
 * ======================================================================== */
{
  const machU = function (u) {
    return projekt({ theta_e: -12, theta_e_m: 8.5 },
      [rm("r", 20, 30, 2.5, [bt("AW", 25, u)])]);
  };
  const machA = function (a) {
    return projekt({ theta_e: -12, theta_e_m: 8.5 },
      [rm("r", 20, 30, 2.5, [bt("AW", a, 0.4)])]);
  };
  let vorherU = -Infinity, vorherA = -Infinity, okU = true, okA = true;
  for (let i = 1; i <= 20; i++) {
    const pu = K.rechne(machU(i * 0.15)).phi_T_gebaeude;
    const pa = K.rechne(machA(i * 3)).phi_T_gebaeude;
    if (!(pu >= vorherU)) okU = false;
    if (!(pa >= vorherA)) okA = false;
    vorherU = pu; vorherA = pa;
  }
  pruefe(okU, "R22 ein groesserer U-Wert darf die Transmission nicht senken");
  pruefe(okA, "R22 eine groessere Flaeche darf die Transmission nicht senken");
  /* Und die Gegenprobe, damit die Reihe nicht konstant ist: */
  pruefe(K.rechne(machU(3.0)).phi_T_gebaeude > K.rechne(machU(0.15)).phi_T_gebaeude,
    "R22 die Reihe muss ueberhaupt steigen");
}

/* ===========================================================================
 * R23  RUNDUNGSUNABHAENGIGKEIT
 * ===========================================================================
 * Die Rechnung muss mit dem VOLLEN Wert arbeiten; gerundet wird erst in der
 * Darstellung. Probe mit U = 1/3: das Ergebnis muss zur vollen Zahl passen
 * und darf nicht dem auf zwei Stellen gerundeten U (0,33) entsprechen.
 *   A = 30, dt = 32:  voll  30 * (1/3) * 32 = 320,0 W
 *                     0,33  30 * 0,33  * 32 = 316,8 W
 * Die beiden liegen 3,2 W auseinander — mehr als jede Gleitkomma-Unschaerfe.
 * ======================================================================== */
{
  const r = rechne("R23", projekt({ theta_e: -12, theta_e_m: 8.5 },
    [rm("r", 20, 30, 2.5, [bt("AW", 30, 1 / 3)])]));
  nahe("R23 Rechnung mit vollem U", r.raeume[0].phi_T_huelle, 320.0, 1e-9, true);
  pruefe(Math.abs(r.raeume[0].phi_T_huelle - 316.8) > 1,
    "R23 die Rechnung darf nicht mit dem gerundeten U arbeiten");
}

/* ------------------------------------------------------------------ Ausgabe */
console.log(JSON.stringify({
  ok: fehler.length === 0,
  anzahl: anzahl,
  faelle: 23,
  fehler: fehler,
  matrix: matrix,
}));
