/* ===========================================================================
 * daten_bauteile.js — U-Werte aus Schichtaufbau, Materialien, Vorlagen
 * ===========================================================================
 * Statt eines Katalogs geschätzter U-Werte rechnet das Tool den U-Wert aus
 * dem Schichtaufbau nach DIN EN ISO 6946. Das ist nachvollziehbar und im
 * Bericht darstellbar. Freie U-Wert-Eingabe bleibt möglich, wird dann aber
 * als Eingabe ohne Nachweis gekennzeichnet.
 *
 * belegt: true  = Wert stammt aus dem geprüften WERK.E-Modell
 *                 heizlast_maelzerstr59 (dort aus Unterlagen abgegriffen)
 * belegt: false = üblicher Vorschlagswert, im Bericht als Annahme markiert
 * =========================================================================== */

"use strict";

/* --- Waermeuebergangswiderstaende nach DIN EN ISO 6946 Tab. 7 ------------ */
const UEBERGANG = {
  wand_aussen:      { rsi: 0.13, rse: 0.04, label: "Außenwand (horizontaler Wärmestrom)" },
  wand_unbeheizt:   { rsi: 0.13, rse: 0.13, label: "Wand gegen unbeheizt" },
  dach:             { rsi: 0.10, rse: 0.04, label: "Dach, Decke (Wärmestrom aufwärts)" },
  decke_unbeheizt:  { rsi: 0.10, rse: 0.10, label: "oberste Geschossdecke gegen unbeheizt" },
  boden:            { rsi: 0.17, rse: 0.04, label: "Fußboden (Wärmestrom abwärts)" },
  kellerdecke:      { rsi: 0.17, rse: 0.17, label: "Kellerdecke gegen unbeheizt" },
  erdreich:         { rsi: 0.17, rse: 0.00, label: "erdberührt (kein äußerer Übergang)" },
};

/* --- Materialien: Bemessungswert der Wärmeleitfähigkeit lambda W/(m K) -- */
const MATERIALIEN = [
  // aus dem geprüften Modell heizlast_maelzerstr59
  { id: "putz_kalkgips",  label: "Innenputz Kalk-Gips",        lambda: 0.70, belegt: true },
  { id: "ziegel_voll",    label: "Vollziegelmauerwerk",        lambda: 0.81, belegt: true },
  { id: "ziegel_vormauer",label: "Vormauerziegel",             lambda: 0.96, belegt: true },
  { id: "wlg035",         label: "Dämmstoff WLG 035",         lambda: 0.035, belegt: true },
  { id: "wlg040",         label: "Dämmstoff WLG 040",         lambda: 0.040, belegt: true },
  // übliche Vorschlagswerte, vor Verwendung gegen DIN 4108-4 oder das
  // Produktdatenblatt prüfen
  { id: "wlg032",         label: "Dämmstoff WLG 032",         lambda: 0.032, belegt: false },
  { id: "wlg024",         label: "Dämmstoff WLG 024 (PUR/PIR)", lambda: 0.024, belegt: false },
  { id: "holzfaser",      label: "Holzfaserdämmung",          lambda: 0.045, belegt: false },
  { id: "zellulose",      label: "Zellulose eingeblasen",      lambda: 0.040, belegt: false },
  { id: "beton",          label: "Stahlbeton",                 lambda: 2.30, belegt: false },
  { id: "ks",             label: "Kalksandstein",              lambda: 0.99, belegt: false },
  { id: "porenbeton",     label: "Porenbeton",                 lambda: 0.16, belegt: false },
  { id: "hlz",            label: "Hochlochziegel",             lambda: 0.45, belegt: false },
  { id: "holz",           label: "Nadelholz",                  lambda: 0.13, belegt: false },
  { id: "gipskarton",     label: "Gipskartonplatte",           lambda: 0.25, belegt: false },
  { id: "estrich",        label: "Zementestrich",              lambda: 1.40, belegt: false },
  { id: "putz_aussen",    label: "Außenputz mineralisch",     lambda: 0.87, belegt: false },
  { id: "frei",           label: "Frei eingeben",              lambda: null, belegt: false },
];

/* --- Bauteilvorlagen ----------------------------------------------------- */
/* Jede Vorlage nennt den Übergangsfall und einen Schichtvorschlag. Die
 * Schichtdicken sind Startwerte und im Tool zu bearbeiten. */
const VORLAGEN = [
  { id: "aw_zweischalig_kern", label: "Außenwand zweischalig mit Kerndämmung",
    uebergang: "wand_aussen", zuschlag: 0.01,
    zuschlag_grund: "Anker und Fugen der zweischaligen Wand",
    schichten: [
      { mat: "putz_kalkgips", d: 0.015 }, { mat: "ziegel_voll", d: 0.115 },
      { mat: "wlg035", d: 0.060 }, { mat: "ziegel_vormauer", d: 0.115 },
    ], belegt: true,
    quelle: "Schichtaufbau aus heizlast_maelzerstr59, dort aus Rechnung und Bauzeichnung" },
  { id: "aw_massiv_wdvs", label: "Außenwand massiv mit WDVS",
    uebergang: "wand_aussen", zuschlag: 0,
    schichten: [
      { mat: "putz_kalkgips", d: 0.015 }, { mat: "hlz", d: 0.240 },
      { mat: "wlg035", d: 0.140 }, { mat: "putz_aussen", d: 0.008 },
    ], belegt: false },
  { id: "aw_bestand_massiv", label: "Außenwand Bestand massiv ungedämmt",
    uebergang: "wand_aussen", zuschlag: 0,
    schichten: [
      { mat: "putz_kalkgips", d: 0.015 }, { mat: "ziegel_voll", d: 0.365 },
      { mat: "putz_aussen", d: 0.020 },
    ], belegt: false },
  { id: "dach_zwischensparren", label: "Dachschräge mit Zwischensparrendämmung",
    uebergang: "dach", zuschlag: 0,
    schichten: [
      { mat: "gipskarton", d: 0.0125 }, { mat: "wlg035", d: 0.180 },
    ], belegt: false },
  { id: "ogd_einblas", label: "Oberste Geschossdecke, Dämmung aufgelegt",
    uebergang: "decke_unbeheizt", zuschlag: 0,
    schichten: [
      { mat: "holz", d: 0.020 }, { mat: "zellulose", d: 0.200 },
    ], belegt: false },
  { id: "kd_unterseitig", label: "Kellerdecke, Dämmung unterseitig",
    uebergang: "kellerdecke", zuschlag: 0,
    schichten: [
      { mat: "estrich", d: 0.050 }, { mat: "beton", d: 0.180 },
      { mat: "wlg035", d: 0.100 },
    ], belegt: false },
  { id: "bodenplatte", label: "Bodenplatte erdberührt",
    uebergang: "erdreich", zuschlag: 0,
    schichten: [
      { mat: "estrich", d: 0.050 }, { mat: "wlg035", d: 0.100 },
      { mat: "beton", d: 0.250 },
    ], belegt: false },
];

/* --- Fenster und Türen: kein Schichtaufbau, U-Wert wird angegeben -------- */
const OEFFNUNGEN = [
  { id: "fenster_3fach", label: "Fenster 3-fach, aktueller Standard", u: 0.95, belegt: true,
    quelle: "Vorgabe aus heizlast_maelzerstr59 (Fenster 2026, Uw = 0,95)" },
  { id: "fenster_2fach_wsv", label: "Fenster 2-fach Wärmeschutzverglasung", u: 1.30, belegt: false },
  { id: "fenster_2fach_alt", label: "Fenster 2-fach Isolierglas, älter", u: 2.70, belegt: false },
  { id: "fenster_einfach", label: "Einfachverglasung", u: 5.00, belegt: false },
  { id: "haustuer_alt", label: "Haustür Bestand", u: 3.00, belegt: false },
  { id: "haustuer_neu", label: "Haustür gedämmt", u: 1.30, belegt: false },
  { id: "innentuer", label: "Innentür", u: 2.00, belegt: false },
  { id: "frei", label: "Frei eingeben", u: null, belegt: false },
];

/* --- Rechnen ------------------------------------------------------------- */
function lambdaVon(matId) {
  const m = MATERIALIEN.find(function (x) { return x.id === matId; });
  return m ? m.lambda : null;
}

/** U-Wert einer Schichtfolge. schichten: [{mat|lambda, d}] */
function uWert(schichten, uebergangId, zuschlag) {
  const ue = UEBERGANG[uebergangId] || UEBERGANG.wand_aussen;
  let r = ue.rsi + ue.rse;
  const zeilen = [];
  (schichten || []).forEach(function (s) {
    const lam = typeof s.lambda === "number" ? s.lambda : lambdaVon(s.mat);
    const d = typeof s.d === "number" ? s.d : 0;
    if (lam && lam > 0 && d > 0) {
      const rs = d / lam;
      r += rs;
      zeilen.push({ label: s.label || (MATERIALIEN.find(function (m) { return m.id === s.mat; }) || {}).label || "Schicht",
                    d: d, lambda: lam, r: rs });
    }
  });
  const u = r > 0 ? 1 / r + (zuschlag || 0) : 0;
  return { u: u, r_gesamt: r, rsi: ue.rsi, rse: ue.rse, zuschlag: zuschlag || 0, zeilen: zeilen };
}

/** Vorlage in einen fertigen Nachweis überführen */
function ausVorlage(vorlageId) {
  const v = VORLAGEN.find(function (x) { return x.id === vorlageId; });
  if (!v) return null;
  const res = uWert(v.schichten, v.uebergang, v.zuschlag);
  return Object.assign({}, res, {
    id: v.id, label: v.label, uebergang: v.uebergang,
    belegt: !!v.belegt, quelle: v.quelle || null,
    schichten: JSON.parse(JSON.stringify(v.schichten)),
    zuschlag_grund: v.zuschlag_grund || null,
  });
}

/* --- Selbsttest ---------------------------------------------------------- */
function selbsttestBauteile() {
  const f = [];
  // Der Schichtaufbau der geprüften Außenwand muss 0,47 W/(m2 K) ergeben
  const a = ausVorlage("aw_zweischalig_kern");
  if (Math.abs(a.u - 0.47) > 0.005) f.push("Vorlage aw_zweischalig_kern: U = " + a.u.toFixed(4) + ", soll 0,47");
  // R-Summe kontrollieren: rsi + rse + Schichten
  const rSoll = 0.13 + 0.04 + 0.015 / 0.70 + 0.115 / 0.81 + 0.060 / 0.035 + 0.115 / 0.96;
  if (Math.abs(a.r_gesamt - rSoll) > 1e-9) f.push("R-Summe stimmt nicht");
  // Leere Schichtfolge darf nicht abstürzen
  const leer = uWert([], "wand_aussen", 0);
  if (!(leer.u > 0)) f.push("Leere Schichtfolge liefert keinen sinnvollen U-Wert");
  // Erdreich-Übergang hat kein rse
  if (UEBERGANG.erdreich.rse !== 0) f.push("Erdreich-Übergang muss rse = 0 haben");
  return { ok: f.length === 0, fehler: f, anzahl: 4 };
}

const DATEN_BAUTEILE = {
  UEBERGANG: UEBERGANG, MATERIALIEN: MATERIALIEN, VORLAGEN: VORLAGEN,
  OEFFNUNGEN: OEFFNUNGEN,
  uWert: uWert, ausVorlage: ausVorlage, lambdaVon: lambdaVon, selbsttest: selbsttestBauteile,
};
if (typeof module !== "undefined" && module.exports) module.exports = DATEN_BAUTEILE;
if (typeof window !== "undefined") window.DATEN_BAUTEILE = DATEN_BAUTEILE;
