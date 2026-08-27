#!/usr/bin/env python3
"""Zweite Implementierung gegen den Rechenkern.

WOZU
validierung/referenz_test.js prueft den Kern gegen von Hand hergeleitete
Sollwerte. Die Herleitungen sind mit referenz_gegenrechnung.py nachgerechnet
worden -- nur LIEF diese Nachrechnung nie: die Datei war eine reine
Funktionsbibliothek ohne Einstieg, und der Bau rief sie nicht auf. Die Zusage
"mit einer zweiten, unabhaengigen Implementierung nachgerechnet" war damit
nicht durch einen Lauf gedeckt (Befund der unabhaengigen Durchsicht vom
27.08.2026).

Diese Datei schliesst die Luecke. Sie rechnet dieselben Faelle zweimal:
  1. mit referenz_gegenrechnung.py (Python, aus den Formeln geschrieben),
  2. mit src/kerne/kern_heizlast_norm.js (der Pruefling, ueber node).
und vergleicht. Die Projektbeschreibungen stehen ABSICHTLICH doppelt -- einmal
als Aufruffolge der Python-Funktionen, einmal als Projekt-JSON fuer den Kern.
Genau diese Doppelung ist der Sinn der Uebung; wer sie zusammenfasst, hat
wieder nur eine Implementierung.

Toleranz 1e-9 relativ: beide Seiten rechnen dieselbe endliche Kette aus
Multiplikationen, es geht allein um die Gleitkommadarstellung.

Aufruf:  python3 validierung/gegenprobe_kern.py
Ausgabe: eine Zeile JSON wie die uebrigen Proben.
"""
import json
import os
import subprocess
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from referenz_gegenrechnung import raum, gebaeude, zone_bilanz  # noqa: E402

TOL = 1e-9
fehler = []
anzahl = 0


def vergleiche(name, py, js):
    global anzahl
    anzahl += 1
    if js is None:
        fehler.append(name + ": der Kern liefert keinen Wert")
        return
    grenze = max(abs(py) * TOL, 1e-9)
    if abs(py - js) > grenze:
        fehler.append("%s: Python %.10f, Kern %.10f, Abweichung %.3g > %.3g"
                      % (name, py, js, abs(py - js), grenze))


# ---------------------------------------------------------------- Die Faelle
# Je Fall: (Name, Python-Ergebnis als dict, Projekt-JSON fuer den Kern)
FAELLE = []

# --- G1  Neubau-EFH, vier Raeume, erdberuehrt, Lueftung ------------------
TE, TEM, DWB, N50 = -10.0, 9.5, 0.05, 1.5
py_g1 = gebaeude([
    raum(20, TE, 35, 2.6, [(30, 0.20, "huelle"), (8, 0.90, "huelle"),
                           (35, 0.25, "erdreich")],
         n50=N50, n_min=0.5, n_exp=2, theta_e_m=TEM, d_wb=DWB),
    raum(20, TE, 12, 2.6, [(10, 0.20, "huelle"), (2, 0.90, "huelle"),
                           (12, 0.25, "erdreich")],
         n50=N50, n_min=0.5, n_exp=1, theta_e_m=TEM, d_wb=DWB),
    raum(20, TE, 18, 2.5, [(16, 0.20, "huelle"), (3, 0.90, "huelle"),
                           (18, 0.16, "huelle")],
         n50=N50, n_min=0.5, n_exp=2, theta_e_m=TEM, d_wb=DWB),
    raum(20, TE, 8, 2.5, [], n50=N50, n_min=0.5, n_exp=0, theta_e_m=TEM, d_wb=DWB),
])
FAELLE.append(("G1 Neubau-EFH", py_g1, {
    "klima": {"theta_e": TE, "theta_e_m": TEM},
    "norm": {"delta_u_wb": DWB}, "luftdichtheit": {"n50": N50},
    "raeume": [
        {"id": "a", "theta_i": 20, "A": 35, "h": 2.6, "n_min": 0.5,
         "n_exponiert": 2, "bauteile": [
             {"A": 30, "U": 0.20}, {"A": 8, "U": 0.90},
             {"A": 35, "U": 0.25, "grenzt_an": {"typ": "erdreich"}}]},
        {"id": "b", "theta_i": 20, "A": 12, "h": 2.6, "n_min": 0.5,
         "n_exponiert": 1, "bauteile": [
             {"A": 10, "U": 0.20}, {"A": 2, "U": 0.90},
             {"A": 12, "U": 0.25, "grenzt_an": {"typ": "erdreich"}}]},
        {"id": "c", "theta_i": 20, "A": 18, "h": 2.5, "n_min": 0.5,
         "n_exponiert": 2, "bauteile": [
             {"A": 16, "U": 0.20}, {"A": 3, "U": 0.90}, {"A": 18, "U": 0.16}]},
        {"id": "d", "theta_i": 20, "A": 8, "h": 2.5, "n_min": 0.5,
         "n_exponiert": 0, "bauteile": []},
    ]}))

# --- G2  Unsanierter Altbau, Infiltration gegen Mindestluftwechsel -------
py_g2 = gebaeude([raum(20, -14.0, 40, 3.2,
                       [(45, 1.40, "huelle"), (9, 2.70, "huelle"),
                        (40, 1.00, "huelle")],
                       n50=6.0, n_min=0.5, n_exp=2, theta_e_m=8.5, d_wb=0.10)])
FAELLE.append(("G2 Altbau", py_g2, {
    "klima": {"theta_e": -14, "theta_e_m": 8.5},
    "norm": {"delta_u_wb": 0.10}, "luftdichtheit": {"n50": 6.0},
    "raeume": [{"id": "a", "theta_i": 20, "A": 40, "h": 3.2, "n_min": 0.5,
                "n_exponiert": 2, "bauteile": [
                    {"A": 45, "U": 1.40}, {"A": 9, "U": 2.70},
                    {"A": 40, "U": 1.00}]}]}))

# --- G3  Gemischte Raumtemperaturen 20 / 24 / 15 -------------------------
py_g3 = gebaeude([
    raum(20, -10.0, 10, 2.5, [(10, 1.0, "huelle")]),
    raum(24, -10.0, 10, 2.5, [(10, 1.0, "huelle")]),
    raum(15, -10.0, 10, 2.5, [(10, 1.0, "huelle")]),
])
FAELLE.append(("G3 gemischte Temperaturen", py_g3, {
    "klima": {"theta_e": -10, "theta_e_m": 9.0},
    "norm": {"delta_u_wb": 0}, "luftdichtheit": {"n50": 0},
    "raeume": [{"id": i, "theta_i": t, "A": 10, "h": 2.5, "n_min": 0,
                "n_exponiert": 0, "bauteile": [{"A": 10, "U": 1.0}]}
               for i, t in (("a", 20), ("b", 24), ("c", 15))]}))

# --- G4  Unbeheizter Keller: erst die Bilanz, dann der Raum darueber -----
TU = zone_bilanz([(50, 0.8, 20)], [(30, 1.0)], -10.0)
py_g4 = gebaeude([raum(20, -10.0, 50, 2.5,
                       [(50, 0.8, "huelle", TU), (20, 0.30, "huelle")])])
FAELLE.append(("G4 unbeheizter Keller", py_g4, {
    "klima": {"theta_e": -10, "theta_e_m": 9.0},
    "norm": {"delta_u_wb": 0}, "luftdichtheit": {"n50": 0},
    "zonen": [{"id": "keller", "modus": "bilanz", "huelle": [
        {"name": "Kellerwand", "A": 30, "U": 1.0,
         "grenzt_an": {"typ": "aussen"}}]}],
    "raeume": [{"id": "eg", "theta_i": 20, "A": 50, "h": 2.5, "n_min": 0,
                "n_exponiert": 0, "bauteile": [
                    {"A": 50, "U": 0.8,
                     "grenzt_an": {"typ": "zone", "ref": "keller"}},
                    {"A": 20, "U": 0.30}]}]}))

# --- G5  Sanierung nachher, dichter, mit Aufheizzuschlag -----------------
py_g5 = gebaeude([raum(20, -12.0, 50, 2.6,
                       [(60, 0.20, "huelle"), (14, 0.90, "huelle"),
                        (50, 0.14, "huelle")],
                       n50=1.5, n_min=0.5, n_exp=2, d_wb=0.05, f_RH=12.0)])
FAELLE.append(("G5 saniert mit Aufheizen", py_g5, {
    "klima": {"theta_e": -12, "theta_e_m": 8.5},
    "norm": {"delta_u_wb": 0.05}, "luftdichtheit": {"n50": 1.5},
    "raeume": [{"id": "a", "theta_i": 20, "A": 50, "h": 2.6, "n_min": 0.5,
                "n_exponiert": 2, "f_RH": 12.0, "bauteile": [
                    {"A": 60, "U": 0.20}, {"A": 14, "U": 0.90},
                    {"A": 50, "U": 0.14}]}]}))

# ------------------------------------------------- Den Kern rechnen lassen
projekte = [f[2] for f in FAELLE]
js = subprocess.run(
    ["node", "-e",
     'const K=require("./src/kerne/kern_heizlast_norm.js");'
     'const ps=JSON.parse(require("fs").readFileSync(0,"utf8"));'
     'console.log(JSON.stringify(ps.map(function(p){'
     '  const r=K.rechne(p);'
     '  return {phi_T:r.phi_T_gebaeude, phi_V:r.phi_V_gebaeude,'
     '          phi_RH:r.phi_RH_gebaeude, phi:r.phi_gebaeude, H_T:r.H_T};'
     '})));'],
    cwd=os.path.join(HIER, ".."), input=json.dumps(projekte),
    capture_output=True, text=True)
if js.returncode != 0 or not js.stdout.strip():
    print(json.dumps({"ok": False, "anzahl": 0, "fehler":
                      ["Der Kern laesst sich nicht aufrufen: "
                       + js.stderr[-500:]]}))
    sys.exit(0)
kern = json.loads(js.stdout.strip().splitlines()[-1])

if len(kern) != len(FAELLE):
    fehler.append("Der Kern liefert %d Ergebnisse fuer %d Faelle"
                  % (len(kern), len(FAELLE)))

for (name, py, _), k in zip(FAELLE, kern):
    vergleiche(name + " / Transmission", py["phi_T_huelle"], k["phi_T"])
    vergleiche(name + " / Lueftung", py["phi_V"], k["phi_V"])
    vergleiche(name + " / Aufheizen", py["phi_RH"], k["phi_RH"])
    vergleiche(name + " / Gebaeudeheizlast", py["phi_gebaeude"], k["phi"])
    vergleiche(name + " / H_T", py["H_T"], k["H_T"])

# Die Zonentemperatur der Bilanz einzeln, sie ist der einzige iterative Wert.
anzahl += 1
if abs(TU - 500.0 / 70.0) > 1e-9:
    fehler.append("G4: die Python-Bilanz liefert theta_u = %.10f, von Hand "
                  "sind es 500/70 = %.10f" % (TU, 500.0 / 70.0))

print(json.dumps({"ok": not fehler, "anzahl": anzahl, "faelle": len(FAELLE),
                  "fehler": fehler}))
