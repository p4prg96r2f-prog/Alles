#!/usr/bin/env python3
"""Unabhaengige Nachrechnung der Referenzfaelle.

Zweitimplementierung der Formeln aus DIN EN 12831-1:2017-09 i.V.m.
DIN/TS 12831-1:2020-04, wie sie in SPEZIFIKATION_RECHENKERN.md festgelegt
sind. Bewusst OHNE Bezug auf src/: sie dient dazu, die Sollwerte der
Referenzfaelle herzuleiten, ohne sie mit dem Pruefling selbst zu erzeugen.
"""
RHO_C = 0.34
F_THETA_ANN = 1.45
F_GW = 1.00


def e_faktor(n):
    return 0.0 if n <= 0 else (0.02 if n == 1 else 0.03)


def bauteil(A, U, kat, theta_i, theta_e, theta_e_m=None, theta_j=None, d_wb=0.0):
    """-> (phi in W, H in W/K)"""
    if kat == "erdreich":
        f_ig = (theta_i - theta_e_m) / (theta_i - theta_e)
        H = F_THETA_ANN * f_ig * A * U * F_GW
        return H * (theta_i - theta_e), H
    U_eff = U + (d_wb if kat == "huelle" else 0.0)
    tj = theta_e if theta_j is None else theta_j
    phi = A * U_eff * (theta_i - tj)
    H = phi / (theta_i - theta_e)
    return phi, H


def raum(theta_i, theta_e, A, h, bauteile, n50=0.0, n_min=0.0, n_exp=0,
         eps=1.0, f_RH=0.0, theta_e_m=None, d_wb=0.0, V=None):
    """bauteile: Liste (A,U,kat[,theta_j]).  -> dict"""
    V = A * h if V is None else V
    dt = theta_i - theta_e
    phi_huelle = phi_innen = 0.0
    H_T = 0.0
    for b in bauteile:
        tj = b[3] if len(b) > 3 else None
        phi, H = bauteil(b[0], b[1], b[2], theta_i, theta_e, theta_e_m, tj, d_wb)
        if b[2] == "innen":
            phi_innen += phi
        else:
            phi_huelle += phi
            H_T += H
    v_inf = 2 * V * n50 * e_faktor(n_exp) * eps
    v_min = n_min * V
    v_dot = max(v_inf, v_min)
    phi_V = RHO_C * v_dot * dt
    phi_RH = A * f_RH
    return {
        "phi_T_huelle": phi_huelle, "phi_T_innen": phi_innen,
        "phi_V": phi_V, "phi_RH": phi_RH, "V": V,
        "v_inf": v_inf, "v_min": v_min, "v_dot": v_dot,
        "phi_raum": phi_huelle + phi_innen + phi_V + phi_RH,
        "phi_gebaeude": phi_huelle + phi_V + phi_RH,
        "H_T": H_T,
    }


def gebaeude(raeume):
    s = {k: sum(r[k] for r in raeume) for k in
         ("phi_T_huelle", "phi_T_innen", "phi_V", "phi_RH",
          "phi_raum", "phi_gebaeude", "H_T")}
    return s


def zone_bilanz(zufuhr, huelle_zu_aussen, theta_e, theta_u_min=None):
    """zufuhr: [(A,U,theta_raum)]; huelle_zu_aussen: [(A,U)]
    theta_u = max( SUM(H*theta)/SUM(H) ; theta_u_min )"""
    sH = sHT = 0.0
    for A, U, t in zufuhr:
        sH += A * U
        sHT += A * U * t
    for A, U in huelle_zu_aussen:
        sH += A * U
        sHT += A * U * theta_e
    roh = sHT / sH if sH > 0 else theta_e
    return max(roh, theta_e if theta_u_min is None else theta_u_min)
