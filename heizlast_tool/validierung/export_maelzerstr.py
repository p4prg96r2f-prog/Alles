# -*- coding: utf-8 -*-
"""Exportiert das hartcodierte Maelzerstrassen-Modell als generisches Projekt-JSON
fuer den JS-Rechenkern. Damit wird der Kern gegen ein bereits geprueftes
Rechenergebnis validiert (Referenz: 9.044 W Gebaeudeheizlast)."""
import json, sys, os
sys.path.insert(0, os.path.expanduser("~/Desktop/Claude/heizlast_maelzerstr59"))

import modell as M
from stammdaten import (OBJEKT, KLIMA, GEO, U, DELTA_U_WB, THETA_INT, NACHBAR,
                        KELLER, DACHRAUM, LUEFTUNG, RAEUME)

r = M.rechne()
th_k, th_d = r["theta_keller"], r["theta_dachraum"]
TE = KLIMA["theta_e"]

def grenzt_an(bauteil):
    """Aufgeloeste Temperatur auf eine generische Nachbarangabe zurueckfuehren."""
    t = bauteil.theta_j
    if abs(t - TE) < 1e-9:      return {"typ": "aussen"}, "huelle"
    if abs(t - th_k) < 1e-9:    return {"typ": "zone", "ref": "keller"}, "huelle"
    if abs(t - th_d) < 1e-9:    return {"typ": "zone", "ref": "dachraum"}, "huelle"
    if bauteil.kat == "nachbar": return {"typ": "fest", "theta": round(t, 4)}, "nachbar"
    return {"typ": "fest", "theta": round(t, 4)}, "innen"

raeume = []
for x in r["raeume"]:
    bts = []
    for b in x["bauteile"]:
        ga, kat = grenzt_an(b)
        bts.append({"name": b.name, "A": round(b.A, 6), "U": round(b.u, 6),
                    "grenzt_an": ga, "kat": kat})
    raeume.append({
        "id": x["geschoss"] + "_" + x["raum"],
        "geschoss": x["geschoss"], "name": x["raum"], "art": x["art"],
        "we": "WE " + x["geschoss"],
        "theta_i": x["theta_i"], "A": round(x["A"], 6), "h": round(x["h"], 6),
        "V": round(x["V"], 6), "e": x["e"], "epsilon": LUEFTUNG["epsilon"],
        "n_min": x["n_min"], "n_exponiert": x["n_ext"],
        "bauteile": bts,
    })

# --- unbeheizte Zonen, so wie modell.py sie bilanziert ---------------------
umfang = 2 * GEO["breite_aussen"] + GEO["tiefe_aussen"]
h_erd = GEO["keller_erdber"]
h_luft = GEO["h_keller"] - h_erd
A_GESCHOSS = M.A_GESCHOSS
det_d = r["det_dach"]

zonen = [
    {"id": "keller", "name": "Unbeheizter Keller", "modus": "bilanz", "huelle": [
        {"name": "Kellerwand ueber Gelaende", "A": round(umfang * h_luft, 6),
         "U": KELLER["u_kellerwand_luft"], "grenzt_an": {"typ": "aussen"}},
        {"name": "Kellerfenster", "A": KELLER["a_kellerfenster"],
         "U": KELLER["u_kellerfenster"], "grenzt_an": {"typ": "aussen"}},
        {"name": "Kellerwand erdberuehrt", "A": round(umfang * h_erd, 6),
         "U": KELLER["u_kellerwand_erde"],
         "grenzt_an": {"typ": "fest", "theta": KELLER["theta_erdreich"]}},
        {"name": "Kellerboden", "A": round(A_GESCHOSS, 6), "U": KELLER["u_kellerboden"],
         "grenzt_an": {"typ": "fest", "theta": KELLER["theta_erdreich"]}},
    ]},
    {"id": "dachraum", "name": "Unbeheizter Spitzboden", "modus": "bilanz", "huelle": [
        {"name": "Dachflaeche ueber Kehlbalkendecke", "A": round(det_d["a_dach"], 6),
         "U": DACHRAUM["u_dach_ueber_decke"], "grenzt_an": {"typ": "aussen"}},
        {"name": "Giebeldreieck", "A": round(det_d["a_giebel"], 6),
         "U": DACHRAUM["u_giebel_spitz"], "grenzt_an": {"typ": "aussen"}},
    ]},
]

projekt = {
    "version": 1,
    "meta": {"bezeichnung": OBJEKT["bezeichnung"], "projektnr": "VALIDIERUNG-01",
             "quelle": "Portierung aus heizlast_maelzerstr59/modell.py"},
    "klima": {"theta_e": KLIMA["theta_e"], "theta_e_m": KLIMA["theta_e_m"],
              "quelle": "BWP-Klimakarte PLZ 33098, DIN/TS 12831-1"},
    "norm": {"delta_u_wb": DELTA_U_WB},
    "luftdichtheit": {"n50": LUEFTUNG["n50"]},
    "optionen": {"f_RH": 0},
    "zonen": zonen,
    "raeume": raeume,
}

with open("faelle/maelzerstr59.json", "w") as fh:
    json.dump(projekt, fh, indent=1, ensure_ascii=False)

soll = {
    "phi_gebaeude": r["phi_gebaeude"], "phi_raeume_summe": r["phi_raeume_summe"],
    "phi_T_gebaeude": r["phi_T_gebaeude"], "phi_V_gebaeude": r["phi_V_gebaeude"],
    "H_T": r["H_T"], "theta_keller": th_k, "theta_dachraum": th_d,
    "raeume": {x["geschoss"] + "_" + x["raum"]: x["phi_raum"] for x in r["raeume"]},
}
with open("faelle/maelzerstr59_soll.json", "w") as fh:
    json.dump(soll, fh, indent=1, ensure_ascii=False)

print("exportiert: %d Raeume, %d Zonen" % (len(raeume), len(zonen)))
print("Soll: Phi_geb %.1f W | Summe Raeume %.1f W | H_T %.2f W/K | th_K %.3f | th_D %.3f"
      % (soll["phi_gebaeude"], soll["phi_raeume_summe"], soll["H_T"], th_k, th_d))
