/* ===========================================================================
 * kern_heizlast_norm.js — Raumweise Norm-Heizlast
 * DIN EN 12831-1:2017-09 i. V. m. DIN/TS 12831-1:2020-04
 * ===========================================================================
 * WERK.E Energie-Effizienz-Beratung. DOM-frei. Läuft im Browser als einfaches
 * Skript und in Node (module.exports am Dateiende).
 *
 * HERKUNFT: generische Portierung von
 *   ~/Desktop/Claude/heizlast_maelzerstr59/modell.py + stammdaten.py
 * (dort auf ein Objekt hartcodiert). Die Rechenwege sind unverändert
 * übernommen und um das Erdreichverfahren, die Aufheizleistung und die
 * iterative Lösung mehrerer unbeheizter Zonen erweitert.
 *
 * GRUNDGLEICHUNGEN
 *   Phi_HL,i = Phi_T,i + Phi_V,i + Phi_RH,i
 *   Phi_T,i  = SUM_k [ A_k * (U_k + dU_WB) * (theta_int,i - theta_j,k) ]
 *   Phi_V,i  = 0,34 * V_dot,i * (theta_int,i - theta_e)
 *   V_dot,i  = max( n_min * V_i ; 2 * V_i * n50 * e_i * eps_i )
 *   erdberührt: H_T,ig = SUM(A_k * U_equiv,k) * f_theta_ann * f_GW * f_ig
 *                f_ig = (theta_int - theta_e,m) / (theta_int - theta_e)
 *   unbeheizte Zone: theta_u = max( SUM(H_T,uj * theta_j) / SUM(H_T,uj) ;
 *                                   theta_u,min )
 *     Die Bilanz enthaelt hier nur Transmissionskoeffizienten; ein
 *     Luftwechselterm ist im Normweg dieses Werkzeugs NICHT angesetzt. Das ist
 *     eine Vereinfachung dieser Berechnung, nicht nachweislich eine Vorgabe der
 *     Norm: der Wortlaut von DIN/TS 12831-1:2020-04 lag nicht vor. Fuer
 *     Bereiche mit erheblichem Luftwechsel, etwa offene oder stark belueftete
 *     Daecher, fuehrt die Norm einen Pauschalwert f_1 (modus "f1"); fuer
 *     Kaltdaecher ist f_1 = 1,0, die Bilanz entfaellt dann. Zuschaltbar ist
 *     ausserdem ein Luftwechselterm als Empfindlichkeitsrechnung, siehe
 *     zonenLueftungH().
 *
 * MASSBEZUG: Innenmaße (nach DIN EN 12831-1 zulässig); die dadurch nicht
 * erfassten Wandanschlüsse stecken im pauschalen Wärmebrückenzuschlag.
 * =========================================================================== */

"use strict";

/* ---------------------------------------------------------------------------
 * 0  NORMKONSTANTEN
 * ------------------------------------------------------------------------ */
const NORM = {
  RHO_C: 0.34,   // Wh/(m3 K)  Wärmekapazität Luft
  /* Erdreich. Die Bezeichnungen sind die der Fassung 2017-09; die alten Namen
   * aus DIN EN 12831:2003-08 stehen daneben, weil viele Vorlagen sie noch
   * benutzen. Das Verfahren selbst wurde in die Fassung 2017-09 uebernommen:
   *   H_T,ig = SUM( A * U_equiv ) * f_theta_ann * f_GW * f_ig
   * f_theta_ann (alt f_g1) beruecksichtigt die Jahresschwankung der Aussen-
   * temperatur und ist fuer Deutschland auf 1,45 festgelegt. f_GW (alt G_w)
   * ist 1,00 und 1,15 bei Grundwasser bis 1 m unter der Bodenplatte. f_ig
   * (alt f_g2) ist der Temperaturanpassungsfaktor an das Erdreich mit der
   * Bezugstemperatur theta_e,m.
   * Geaendert hat sich gegenueber 2003-08 allein die Herleitung von U_equiv.
   * Das Werkzeug leitet U_equiv NICHT aus dem Bodenplattenmass B' her, sondern
   * erwartet ihn als Eingabe. Belegt wird das in hinweise(). */
  F_THETA_ANN: 1.45,
  F_G1: 1.45,    // Altname, bleibt fuer vorhandene Projektdateien lesbar
  F_GW: 1.00,
  G_W: 1.00,     // Altname
  EPSILON: 1.00, // Höhenkorrekturfaktor, Raumhöhe ueber Gelände < 10 m
  // Abschirmkoeffizient e nach Anzahl exponierter Fassaden (DIN/TS 12831-1 Tab. 12)
  E_KEINE: 0.00,
  E_EINE: 0.02,
  E_MEHRERE: 0.03,
  DELTA_U_WB_STANDARD: 0.10, // pauschaler Wärmebrückenzuschlag W/(m2 K)
};

/* Nie-NaN-Rueckfall fuer fehlendes Klima: die KAELTESTEN Werte der eigenen
 * PLZ-Tabelle nach DIN/TS 12831-1 (DATEN_KLIMA.grenzen: theta_e_min und
 * theta_e_m_min). Der nie_nan-Selbsttest prueft die Gleichheit gegen die
 * Tabelle; hier stehen die Zahlen fest, weil dieser Kern ohne daten_klima
 * lauffaehig bleiben muss. Begruendung und Fehlerrichtung: siehe rechne(). */
const KLIMA_RUECKFALL = { theta_e: -19.2, theta_e_m: 0.1 };

/* Kategorien eines Bauteils
 *   huelle   Bauteil der wärmeübertragenden Huellflaeche gegen Außenluft
 *            oder gegen eine unbeheizte Zone. Bekommt den Wärmebrückenzuschlag.
 *            Zählt in die Gebäudeheizlast.
 *   erdreich Erdberührtes Bauteil eines BEHEIZTEN Raums. Rechnet nach
 *            f_theta_ann / f_ig / f_GW. Zählt in die Gebäudeheizlast.
 *   nachbar  Bauteil gegen ein fremdes, beheiztes Gebäude (Haustrennwand).
 *            KEIN Wärmebrückenzuschlag, zählt aber in die Gebäudeheizlast.
 *   innen    Bauteil gegen einen Raum abweichender Temperatur im selben Gebäude.
 *            KEIN Zuschlag, zählt NUR in die Raumheizlast (hebt sich im
 *            Gebäude gegeneinander auf).
 */
const KATEGORIEN = ["huelle", "erdreich", "nachbar", "innen"];

/* ---------------------------------------------------------------------------
 * 1  HILFSFUNKTIONEN
 * ------------------------------------------------------------------------ */
function rnd(x, n) { const f = Math.pow(10, n || 0); return Math.round(x * f) / f; }
/* Dieselbe Zahl, aber mit Komma. Die Warnungen und Hinweise gehen woertlich
   in den Bericht und auf die Ergebnisseite; "5.2 °C" ist dort ein Fremdkoerper. */
function znr(x, n) { return String(rnd(x, n)).replace(".", ","); }

function zahl(x, fallback) {
  const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
  return Number.isFinite(v) ? v : (fallback === undefined ? 0 : fallback);
}

/** U-Wert aus Schichtaufbau nach DIN EN ISO 6946.
 *  schichten: [{d: Dicke m, lambda: W/(mK)}], rsi/rse: Waermeuebergangswiderstaende */
function uWertAusSchichten(schichten, rsi, rse, zuschlag) {
  let r = zahl(rsi, 0.13) + zahl(rse, 0.04);
  (schichten || []).forEach(function (s) {
    const lam = zahl(s.lambda, 0);
    if (lam > 0) r += zahl(s.d, 0) / lam;
  });
  if (r <= 0) return { u: 0, r: 0 };
  return { u: 1 / r + zahl(zuschlag, 0), r: r };
}

/** Abschirmkoeffizient aus der Anzahl exponierter Fassaden */
function eFaktor(nExponiert) {
  const n = zahl(nExponiert, 0);
  if (n <= 0) return NORM.E_KEINE;
  if (n === 1) return NORM.E_EINE;
  return NORM.E_MEHRERE;
}

/* ---------------------------------------------------------------------------
 * 2  TEMPERATUR EINES BAUTEIL-NACHBARN AUFLÖSEN
 * ------------------------------------------------------------------------ */
/** grenztAn: {typ: "aussen"|"erdreich"|"zone"|"raum"|"fest", ref, theta}
 *  ctx: {theta_e, zonenTemp:{id:theta}, raumTemp:{id:theta}} */
function nachbarTemperatur(grenztAn, ctx) {
  const g = grenztAn || { typ: "aussen" };
  switch (g.typ) {
    case "aussen":   return ctx.theta_e;
    case "erdreich": return ctx.theta_e;           // wird ueber f_ig korrigiert
    case "fest":     return zahl(g.theta, ctx.theta_e);
    case "zone":     return zahl(ctx.zonenTemp[g.ref], ctx.theta_e);
    case "raum":     return zahl(ctx.raumTemp[g.ref], ctx.theta_e);
    default:         return ctx.theta_e;
  }
}

/** Kategorie eines Bauteils bestimmen, wenn nicht ausdrücklich gesetzt */
function bauteilKategorie(bt) {
  const typ = (bt.grenzt_an && bt.grenzt_an.typ) || "aussen";
  /* DIE LAGE SCHLAEGT DIE KENNZEICHNUNG, WO SIE SICH WIDERSPRECHEN.
   * Ein Bauteil gegen einen RAUM desselben Gebaeudes ist ein Innenbauteil.
   * Das ist keine Frage der Kennzeichnung, sondern der Lage: die Waerme
   * verlaesst das Gebaeude nicht. Eine widersprechende Kennzeichnung
   * (kat "huelle" bei grenzt_an.typ "raum") wird deshalb ueberstimmt.
   *
   * GRUND: ueber die Oberflaeche ist der Widerspruch in zwei Schritten
   * erreichbar. app.js setzt beim Anlegen kat aus kat_default des
   * Bauteiltyps (Vorgabe "huelle"); grenzSetzen aendert danach nur
   * grenzt_an und laesst kat stehen. Ohne diese Zeile ginge das Bauteil in
   * H_T ein, und weil b je Raum mit dessen eigenem Nenner gebildet wird,
   * heben sich die beiden Haelften dort NICHT auf: eine Innenwand
   * 100 m2 / U 5,0 zwischen Bad 24 °C und Schlafzimmer 20 °C drueckte H_T
   * auf -7,44 W/K. Ein negativer spezifischer Transmissionswaermeverlust
   * einer Huelle ist keine Zahl, die ein Bericht tragen kann.
   * Die Gebaeudeheizlast war davon nicht betroffen -- dort heben sich die
   * Haelften in Phi auf. Zusaetzlich meldet rechne() den Widerspruch. */
  if (typ === "raum") return "innen";
  if (bt.kat && KATEGORIEN.indexOf(bt.kat) >= 0) return bt.kat;
  if (typ === "erdreich") return "erdreich";
  if (typ === "raum") return "innen";
  if (typ === "aussen" || typ === "zone") return "huelle";
  return "huelle";
}

/* ---------------------------------------------------------------------------
 * 3  WÄRMEDURCHGANG EINES BAUTEILS
 * ------------------------------------------------------------------------ */
/** Liefert {H, phi, U_eff, theta_j, kat}.
 *  H in W/K bezogen auf (theta_i - theta_e), phi in W. */
function bauteilLeistung(bt, theta_i, ctx, norm) {
  const kat = bauteilKategorie(bt);
  const A = zahl(bt.A, 0);
  const u = zahl(bt.U, 0);
  const dt_ausleg = theta_i - ctx.theta_e;

  if (kat === "erdreich") {
    /* H_T,ig = A * U_equiv * f_theta_ann * f_GW * f_ig nach
     * DIN EN 12831-1:2017-09 i. V. m. DIN/TS 12831-1:2020-04.
     * f_ig = (theta_int - theta_e,m) / (theta_int - theta_e); die Bezugs-
     * temperatur des Erdreichs ist die Jahresmitteltemperatur.
     * u ist hier U_equiv und wird als solcher eingegeben, nicht aus dem
     * Bodenplattenmass B' hergeleitet. */
    const f_g2 = dt_ausleg === 0 ? 0 : (theta_i - ctx.theta_e_m) / dt_ausleg;
    const H = norm.F_G1 * f_g2 * A * u * norm.G_W;
    /* f_ig ist der Name der Fassung 2017-09, f_g2 der alte. Beide Schluessel
       werden geliefert, damit vorhandene Aufrufer weiterlaufen. */
    return { H: H, phi: H * dt_ausleg, U_eff: u, theta_j: ctx.theta_e_m, kat: kat,
             f_ig: f_g2, f_g2: f_g2 };
  }

  const U_eff = u + (kat === "huelle" ? norm.DELTA_U_WB : 0);
  const theta_j = nachbarTemperatur(bt.grenzt_an, ctx);
  const phi = A * U_eff * (theta_i - theta_j);
  /* H ist der Beitrag zu H_T, also A * U * b. Gerechnet wird er als
   * phi / (theta_i - theta_e); bei theta_i == theta_e ist der Quotient
   * unbestimmt. Fuer ein Bauteil gegen AUSSENLUFT ist b aber definitionsgemaess
   * 1, und damit H = A * U_eff: die Leitfaehigkeit der Huelle verschwindet
   * nicht, nur weil im Raum gerade keine Temperaturdifferenz herrscht.
   * Vorher stand hier 0 -- ein Raum, der versehentlich auf die
   * Aussentemperatur gesetzt war, nahm seine ganze Aussenflaeche
   * stillschweigend aus H_T heraus (gemessen: 60 von 65 W/K fehlten), und
   * zwar in der unsicheren Richtung. Gegen einen Nachbarn mit ANDERER
   * Temperatur bleibt b bei dt = 0 unbestimmt; dort bleibt es bei 0, und
   * rechne() meldet den Raum. */
  const H = dt_ausleg !== 0 ? phi / dt_ausleg
    : (Math.abs(theta_j - ctx.theta_e) < 1e-12 ? A * U_eff : 0);
  return { H: H, phi: phi, U_eff: U_eff, theta_j: theta_j, kat: kat };
}

/* ---------------------------------------------------------------------------
 * 4  TEMPERATUREN UNBEHEIZTER ZONEN (stationäre Bilanz, iterativ)
 * ------------------------------------------------------------------------ */
/* Pauschale Temperaturanpassungsfaktoren f_1 fuer unbeheizte Bereiche.
 * DIN/TS 12831-1:2020-04 tabelliert f_1 fuer 34 Faelle angrenzender
 * unbeheizter Bereiche. Der Normtext selbst lag hier NICHT vor; die Werte sind
 * nach Sekundaerquellen hinterlegt: Markert, "Praxis Heizlastberechnung",
 * DIN Media, Tabelle 14, und Jagnow/Wolff, Manuskript fuer Recknagel/Sprenger
 * Taschenbuch 2020, Tafel 0-6. Aus der zweiten Quelle bestaetigt sind
 * Heizungsaufstellraum 0,20, Kellerraum ohne Tueren/Fenster nach aussen 0,40,
 * Kellerraum mit Tueren/Fenstern nach aussen 0,50, offene bzw. stark
 * belueftete Daecher und Kaltdaecher 1,00, aufgestaenderter Boden ueber
 * Kriechraum 0,80. Eine Tabellennummer der DIN/TS wird bewusst nicht genannt,
 * weil sie nicht gegen den Normtext geprueft ist.
 * Jeder Wert ist im Projekt ueberschreibbar: zone.f1 schlaegt die Tabelle.
 * theta_u = theta_bezug - f_1 * (theta_bezug - theta_e). */
const F1_TABELLE = {
  ohne_aussenwand:            0.1,
  eine_aussenwand:            0.4,   // ohne Tueren/Fenster nach aussen
  eine_aussenwand_oeffnung:   0.5,   // mit Tueren/Fenstern nach aussen
  zwei_aussenwaende:          0.5,   // ohne Tueren/Fenster nach aussen
  zwei_aussenwaende_oeffnung: 0.6,   // mit Tueren/Fenstern nach aussen
  drei_aussenwaende:          0.8,   // drei oder mehr Aussenwaende
  heizungsaufstellraum:       0.2,
  dach_belueftet:             1.0,   // offene, stark belueftete Daecher, Kaltdaecher
  boden_ueber_kriechraum:     0.8,
};

/* Schwelle, ab der eine Vorgabe des Bearbeiters merklich von der Bilanz
 * abweicht und einen Hinweis bekommt, in Kelvin. Das ist eine Festlegung
 * dieses Werkzeugs und KEIN Wert aus einer Norm. */
const ABWEICHUNG_HINWEIS_K = 3.0;

/* Zugriff auf die Lagentabelle aus daten_zonenlagen.js. Im Browser haengt sie
 * als globales Objekt am Fenster, unter Node kommt sie ueber require. Fehlt
 * sie, rechnet der Kern ohne Lagenauswahl weiter. */
function lagenTabelle() {
  try {
    if (typeof window !== "undefined" && window.DATEN_ZONENLAGEN) return window.DATEN_ZONENLAGEN;
    if (typeof DATEN_ZONENLAGEN !== "undefined" && DATEN_ZONENLAGEN) return DATEN_ZONENLAGEN;
  } catch (e) { /* Bindung noch nicht ausgewertet, kein Grund abzubrechen */ }
  if (typeof require === "function") {
    try { return require("../daten/daten_zonenlagen.js"); } catch (e) { /* nicht vorhanden */ }
  }
  return null;
}

/** Temperaturvorgabe des Bearbeiters ueber die Lage eines unbeheizten
 *  Bereichs. z.lage traegt die Kennung aus daten_zonenlagen.js, z.f1 darf
 *  innerhalb einer tabellierten Spanne davon abweichen.
 *  Rueckgabe null heisst: keine brauchbare Vorgabe, es bleibt bei der Bilanz.
 *  Es wird nichts geraten. */
function zonenVorgabe(z, theta_bezug, theta_e) {
  if (!z || z.modus !== "lage" || !z.lage) return null;
  const tab = lagenTabelle();
  if (!tab || typeof tab.temperatur !== "function") return null;
  const t = tab.temperatur(z.lage, theta_bezug, theta_e,
    Number.isFinite(zahl(z.f1, NaN)) ? zahl(z.f1) : undefined);
  if (!t || !Number.isFinite(t.theta)) return null;
  return t;
}

/** Mindesttemperatur eines unbeheizten Bereichs.
 *  DIN/TS 12831-1:2020-04, Tabelle 6:
 *    Regelung mit bekannter Mindesttemperatur -> dieser Wert,
 *    Frostschutz mit unbekannter Mindesttemperatur -> 5 Grad C,
 *    keine Begrenzung vorhanden -> theta_e.
 *  Die Tabellennummer ist belegt ueber Markert, "Praxis Heizlastberechnung",
 *  Tabelle 16, und ueber das ZUB-HELENA-Handbuch 2022, Abschnitt 6.5.4,
 *  Tabelle 3; beide nennen ausdruecklich DIN/TS 12831-1:2020-04, Tabelle 6.
 *  Vorgabe im Werkzeug ist "keine Begrenzung", also theta_e. Das ist der
 *  Fall, der die Bilanz nie anhebt, und damit der zurueckhaltende. */
function zonenMindesttemperatur(z, theta_e) {
  if (Number.isFinite(zahl(z.theta_u_min, NaN))) return zahl(z.theta_u_min);
  if (z.frostschutz === true) return 5.0;
  return theta_e;
}

/** Lueftungswaermeverlustkoeffizient eines unbeheizten Bereichs in W/K.
 *  ACHTUNG: geht ueber die Bilanz hinaus, die dieses Werkzeug als Normweg
 *  fuehrt. Dort gehen nur Transmissionskoeffizienten ein; ein Luftwechselterm
 *  ist nicht angesetzt. Das ist eine Vereinfachung dieser Berechnung und wird
 *  im Bericht als solche ausgewiesen, siehe hinweise(). Nicht behauptet wird,
 *  dass die Norm den Luftwechsel ausdruecklich ausschliesst: der Wortlaut von
 *  DIN/TS 12831-1:2020-04 lag bei der Erstellung nicht vor, die
 *  Gleichgewichtstemperatur ist dort nur allgemein ueber Waermezufluesse und
 *  Waermeabfluesse beschrieben (Jagnow/Wolff, Manuskript Recknagel/Sprenger
 *  Taschenbuch 2020, Abschnitt Norm-Transmissionsheizlast).
 *  Der Term dient der Empfindlichkeitsrechnung und wird nur wirksam, wenn im
 *  Projekt n_luft und V der Zone angegeben sind. Das Verfahren, die Temperatur
 *  eines unbeheizten Raums mit einem Luftwechsel zu bilanzieren, kennt
 *  EN ISO 13789:2017, Anhang A; jener Anhang gibt ein stationaeres Verfahren
 *  fuer die Temperatur unbeheizter Bereiche und dazu konventionelle
 *  Luftwechselwerte an. Diese Werte sind hier bewusst NICHT hinterlegt, weil
 *  der Normtext nicht geprueft vorliegt. Wer den Term nutzt, gibt den
 *  Luftwechsel selbst an und verantwortet ihn. */
function zonenLueftungH(z, norm) {
  const n = zahl(z.n_luft, 0);
  const V = zahl(z.V, 0);
  if (!(n > 0) || !(V > 0)) return 0;
  return norm.RHO_C * n * V;
}

/** Eine unbeheizte Zone:
 *  {id, name, modus: "bilanz"|"fest"|"f1"|"lage", theta_fest, f1, art, lage,
 *   theta_u_min, frostschutz, n_luft, V,
 *   huelle: [{name, A, U, grenzt_an:{typ,ref,theta}}]}
 *  Die Bauteile beheizter Räume, die an die Zone grenzen, werden automatisch
 *  als Wärmezufuhr berücksichtigt.
 *  mitLueftung: true rechnet die Bilanz zusaetzlich mit dem Lueftungsterm der
 *  Zone. Das ist die Empfindlichkeitsrechnung, nicht der Normweg. */
function zonenTemperaturen(projekt, norm, mitLueftung) {
  const zonen = projekt.zonen || [];
  const raeume = projekt.raeume || [];
  const theta_e = zahl(projekt.klima && projekt.klima.theta_e, -10);

  /* Bezugstemperatur fuer den Pauschalweg f_1. f_1 ist als
   * (theta_int - theta_u) / (theta_int - theta_e) definiert; theta_int ist
   * die Norm-Innentemperatur des angrenzenden beheizten Raums. Ohne Angabe
   * gilt 20 Grad C, der Regelwert fuer Aufenthaltsraeume. */
  const thetaBezug = function (z) { return zahl(z.theta_bezug, 20.0); };

  /* Vorgaben des Bearbeiters ueber die Lage, je Zone einmal aufgeloest.
     Eine unbekannte Lagenkennung ergibt null: dann wird bilanziert statt
     geraten, und rechne() setzt eine Warnung ab. */
  const vorgaben = {};
  zonen.forEach(function (z) {
    vorgaben[z.id] = zonenVorgabe(z, thetaBezug(z), theta_e);
  });
  /* Eine Zone im Bilanzweg OHNE eigene Huellbauteile.
   *
   * GEMESSEN, und der Grund fuer diesen Zweig: Die Bilanz besteht dann allein
   * aus den Bauteilen der angrenzenden BEHEIZTEN Raeume. Ihr Mittelwert ist
   * genau deren Raumtemperatur, also 20,0 Grad C. Damit wird die
   * Temperaturdifferenz null und der Waermestrom durch Kellerdecke und
   * oberste Geschossdecke null — an einem echten Projekt gemessen 118,1 m2
   * Bauteilflaeche mit 0 W, und auf der Ergebnisseite stand "Keine
   * Auffaelligkeiten". Ein Rechenergebnis, das genau die Bauteile verschweigt,
   * um derentwillen gerechnet wird.
   *
   * Bilanziert werden kann hier nichts: es fehlt jede Waermesenke. Statt eines
   * sinnlosen Ergebnisses gilt deshalb die Mindesttemperatur nach
   * DIN/TS 12831-1:2020-04, Tabelle 6 — ohne Begrenzung ist das die
   * Norm-Aussentemperatur. Das ist die obere Schranke des Waermestroms und
   * damit die fuer die Auslegung sichere Seite, keine geratene Zahl. Der
   * Bearbeiter aendert das, indem er die Huellbauteile eintraegt oder eine
   * Lage waehlt; rechne() sagt ihm das. */
  const ohneHuelle = function (z) {
    return z.modus !== "fest" && z.modus !== "f1" && !vorgaben[z.id]
      && !((z.huelle || []).some(function (bt) { return zahl(bt.A, 0) > 0; }));
  };
  const festgelegt = function (z) {
    return z.modus === "fest" || z.modus === "f1" || !!vorgaben[z.id] || ohneHuelle(z);
  };

  // Startwerte
  const temp = {};
  zonen.forEach(function (z) {
    if (z.modus === "fest") { temp[z.id] = zahl(z.theta_fest, theta_e); return; }
    if (vorgaben[z.id]) { temp[z.id] = vorgaben[z.id].theta; return; }
    if (z.modus === "f1") {
      // Pauschalwert f_1 nach DIN/TS 12831-1:2020-04, siehe F1_TABELLE
      const f1 = Number.isFinite(zahl(z.f1, NaN)) ? zahl(z.f1)
               : (F1_TABELLE[z.art] !== undefined ? F1_TABELLE[z.art] : null);
      const tb = thetaBezug(z);
      temp[z.id] = f1 === null ? theta_e : tb - f1 * (tb - theta_e);
      return;
    }
    if (ohneHuelle(z)) { temp[z.id] = zonenMindesttemperatur(z, theta_e); return; }
    temp[z.id] = (theta_e + 20) / 2;
  });

  // Beiträge der beheizten Räume je Zone einsammeln (H = A*U, unabhängig von der Iteration)
  const zufuhr = {};   // {zonenId: [{H, theta}]}
  zonen.forEach(function (z) { zufuhr[z.id] = []; });
  raeume.forEach(function (r) {
    const ti = raumTemperatur(r, projekt);
    (r.bauteile || []).forEach(function (bt) {
      const g = bt.grenzt_an || {};
      if (g.typ === "zone" && zufuhr[g.ref]) {
        // ohne Wärmebrückenzuschlag: der Zuschlag beschreibt die Wärmebrücke
        // des beheizten Raums, nicht den Wärmestrom in die Zone hinein
        const H = zahl(bt.A, 0) * zahl(bt.U, 0)
                * (projekt.optionen && projekt.optionen.wbz_in_zonenbilanz
                   ? 1 + norm.DELTA_U_WB / Math.max(zahl(bt.U, 0), 1e-9) : 1);
        zufuhr[g.ref].push({ H: H, theta: ti });
      }
    });
  });

  // Fixpunkt-Iteration (löst auch Zone-an-Zone)
  let iter = 0, delta = 1;
  const MAX_ITER = 100, EPS = 1e-6;
  while (delta > EPS && iter < MAX_ITER) {
    delta = 0; iter++;
    zonen.forEach(function (z) {
      if (festgelegt(z)) return;
      let sumH = 0, sumHT = 0;
      zufuhr[z.id].forEach(function (x) { sumH += x.H; sumHT += x.H * x.theta; });
      (z.huelle || []).forEach(function (bt) {
        const H = zahl(bt.A, 0) * zahl(bt.U, 0);
        const tj = nachbarTemperatur(bt.grenzt_an, {
          theta_e: theta_e, theta_e_m: zahl(projekt.klima && projekt.klima.theta_e_m, theta_e),
          zonenTemp: temp, raumTemp: {},
        });
        sumH += H; sumHT += H * tj;
      });
      /* Lueftungsterm nur in der Empfindlichkeitsrechnung. Der Normweg nach
         Normweg dieses Werkzeugs bilanziert allein ueber
         Transmissionskoeffizienten. */
      if (mitLueftung) {
        const HV = zonenLueftungH(z, norm);
        if (HV > 0) { sumH += HV; sumHT += HV * theta_e; }
      }
      const roh = sumH > 0 ? sumHT / sumH : theta_e;
      // max(...; theta_u,min) nach DIN/TS 12831-1:2020-04
      const neu = Math.max(roh, zonenMindesttemperatur(z, theta_e));
      delta = Math.max(delta, Math.abs(neu - temp[z.id]));
      temp[z.id] = neu;
    });
  }
  return { temperaturen: temp, iterationen: iter, konvergiert: delta <= EPS };
}

/* ---------------------------------------------------------------------------
 * 4b  BEFUND ZU DEN UNBEHEIZTEN BEREICHEN
 * ------------------------------------------------------------------------ */
/** Stellt je Zone nebeneinander, was die Norm rechnet und was ein Luftwechsel
 *  daraus machen wuerde. Der Bericht kann damit die Vereinfachung beziffern,
 *  statt sie zu verschweigen. */
function zonenBefund(projekt, norm, tempNorm, tempLueftung, tempBilanz) {
  const theta_e = zahl(projekt.klima && projekt.klima.theta_e, -10);
  return (projekt.zonen || []).map(function (z) {
    const HV = zonenLueftungH(z, norm);
    const tn = zahl(tempNorm[z.id], theta_e);
    const tl = tempLueftung ? zahl(tempLueftung[z.id], tn) : null;
    const theta_bezug = zahl(z.theta_bezug, 20.0);
    const vorg = zonenVorgabe(z, theta_bezug, theta_e);
    /* Herkunft der massgebenden Temperatur. "bearbeiter" heisst: der
       Bearbeiter hat sie vorgegeben, die Bilanz ist nur Vergleichswert. */
    const vomBearbeiter = z.modus === "fest" || z.modus === "f1" || !!vorg;
    /* Die Bilanz verschwindet nicht, auch wenn sie nicht massgebend ist:
       tempBilanz kommt aus einem Durchlauf, in dem ALLE Bereiche bilanziert
       wurden. Ohne diesen Durchlauf steht dort die massgebende Temperatur. */
    const tb = zahl((tempBilanz || tempNorm)[z.id], tn);
    const abw = vomBearbeiter ? tn - tb : null;
    return {
      id: z.id, name: z.name || z.id, modus: z.modus || "bilanz",
      art: z.art || null,
      f1: Number.isFinite(zahl(z.f1, NaN)) ? zahl(z.f1)
          : (vorg ? vorg.f1
             : (z.modus === "f1" && F1_TABELLE[z.art] !== undefined ? F1_TABELLE[z.art] : null)),
      theta: tn,
      /* Herkunft und Gegenprobe, damit der Bericht beide Zahlen zeigen kann */
      herkunft: vomBearbeiter ? "bearbeiter" : "bilanz",
      theta_bilanz: tb,
      theta_bezug: theta_bezug,
      abweichung: abw,
      /* Ohne eigene Huellbauteile gibt es keine Bilanz, die sich vergleichen
         liesse: der Vergleichslauf faellt dort selbst auf die
         Mindesttemperatur zurueck. Ein Hinweis "Ihre Vorgabe weicht um 14,8 K
         von der Bilanz ab" waere dann eine Falschmeldung -- verglichen wuerde
         die Vorgabe mit einem Platzhalter. */
      ohne_huelle: !((z.huelle || []).some(function (bt) { return zahl(bt.A, 0) > 0; })),
      abweichung_auffaellig: abw !== null && Math.abs(abw) > ABWEICHUNG_HINWEIS_K
        && (z.huelle || []).some(function (bt) { return zahl(bt.A, 0) > 0; }),
      abweichung_schwelle_K: ABWEICHUNG_HINWEIS_K,
      /* Lagenauswahl mit Fundstelle; null, wenn keine gewaehlt ist */
      lage: vorg ? {
        id: vorg.id, name: vorg.name, gruppe: vorg.gruppe, art: vorg.art,
        f1: vorg.f1, f1_bereich: vorg.f1_bereich,
        stufe: vorg.stufe, norm_zeile: vorg.norm_zeile, fundstelle: vorg.fundstelle,
      } : null,
      lage_unbekannt: z.modus === "lage" && !vorg,
      theta_u_min: zonenMindesttemperatur(z, theta_e),
      an_mindesttemperatur: Math.abs(tn - zonenMindesttemperatur(z, theta_e)) < 1e-9,
      n_luft: zahl(z.n_luft, 0), V: zahl(z.V, 0), H_V: HV,
      theta_mit_lueftung: tl,
      delta_lueftung: tl === null ? null : tl - tn,
    };
  });
}

/* ---------------------------------------------------------------------------
 * 5  NORM-INNENTEMPERATUR EINES RAUMS
 * ------------------------------------------------------------------------ */
function raumTemperatur(raum, projekt) {
  if (Number.isFinite(zahl(raum.theta_i, NaN))) return zahl(raum.theta_i);
  const arten = (projekt && projekt.raumarten) || {};
  const a = arten[raum.art];
  if (a && Number.isFinite(zahl(a.theta_i, NaN))) return zahl(a.theta_i);
  return 20.0;
}

/* ---------------------------------------------------------------------------
 * 6  EIN RAUM
 * ------------------------------------------------------------------------ */
function raumRechnen(raum, projekt, ctx, norm) {
  const theta_i = raumTemperatur(raum, projekt);
  const A = zahl(raum.A, 0);
  const h = zahl(raum.h, 0);
  const V = Number.isFinite(zahl(raum.V, NaN)) && zahl(raum.V) > 0 ? zahl(raum.V) : A * h;
  const dt = theta_i - ctx.theta_e;

  // --- Transmission ------------------------------------------------------
  const teile = [];
  let phi_huelle = 0, phi_innen = 0;
  (raum.bauteile || []).forEach(function (bt) {
    const res = bauteilLeistung(bt, theta_i, ctx, norm);
    teile.push({
      name: bt.name || "Bauteil", A: zahl(bt.A, 0), U: zahl(bt.U, 0),
      U_eff: res.U_eff, theta_j: res.theta_j, kat: res.kat,
      H: res.H, phi: res.phi, f_ig: res.f_ig, f_g2: res.f_g2,
      grenzt_an: bt.grenzt_an || { typ: "aussen" },
      /* Ein Annahmekennzeichen sagt nur, DASS der U-Wert nicht belegt ist.
         Ob er aus der Baualtersklasse stammt, ist eine andere Auskunft: an
         ihr haengt, ob eine Pruefung gegen dieselbe Klasse ueberhaupt etwas
         prueft. Sie reist deshalb mit. */
      quelle: bt.quelle || null, annahme: !!bt.annahme,
      typologie: bt.typologie === true,
    });
    if (res.kat === "innen") phi_innen += res.phi; else phi_huelle += res.phi;
  });

  // --- Lüftung ----------------------------------------------------------
  const n50 = zahl(projekt.luftdichtheit && projekt.luftdichtheit.n50, 3.0);
  const e = Number.isFinite(zahl(raum.e, NaN)) ? zahl(raum.e)
          : eFaktor(raum.n_exponiert !== undefined ? raum.n_exponiert
                    : zaehleExponierte(raum));
  const eps = zahl(raum.epsilon, norm.EPSILON);
  const n_min = Number.isFinite(zahl(raum.n_min, NaN)) ? zahl(raum.n_min)
              : nMinAusArt(raum, projekt);
  const v_inf = 2 * V * n50 * e * eps;
  const v_min = n_min * V;
  const v_dot = Math.max(v_inf, v_min);
  const phi_V = norm.RHO_C * v_dot * dt;

  // --- Aufheizleistung ---------------------------------------------------
  // Phi_RH = A * f_RH ; f_RH nach DIN/TS 12831-1 abhängig von Absenkdauer,
  // Wiederaufheizzeit und Gebäudemasse. Standard 0 = kein Aufheizzuschlag.
  const f_RH = zahl(raum.f_RH, zahl(projekt.optionen && projekt.optionen.f_RH, 0));
  const phi_RH = A * f_RH;

  const phi_raum = phi_huelle + phi_innen + phi_V + phi_RH;
  const phi_gebaeude_anteil = phi_huelle + phi_V + phi_RH;

  return {
    id: raum.id, geschoss: raum.geschoss || "", raum: raum.name || "", art: raum.art || "",
    we: raum.we || null,
    /* Reicht das Kennzeichen des Aufrufers durch: die Warnung ueber einen
       Raum ohne Huellbauteil liest es weiter unten aus dem GERECHNETEN Raum,
       nicht aus der Eingabe. Ohne diese Zeile kam es dort nie an. */
    innenliegend: raum.innenliegend === true,
    theta_i: theta_i, A: A, h: h, V: V,
    bauteile: teile,
    phi_T_huelle: phi_huelle, phi_T_innen: phi_innen,
    v_inf: v_inf, v_min: v_min, v_dot: v_dot, massgebend: v_inf >= v_min ? "Infiltration" : "Mindestluftwechsel",
    e: e, epsilon: eps, n_min: n_min,
    phi_V: phi_V, phi_RH: phi_RH, f_RH: f_RH,
    phi_raum: phi_raum, phi_gebaeude: phi_gebaeude_anteil,
    spez: A > 0 ? phi_raum / A : 0,
  };
}

/** Anzahl exponierter Fassaden aus den Bauteilen ableiten, wenn nicht angegeben */
function zaehleExponierte(raum) {
  const lagen = {};
  (raum.bauteile || []).forEach(function (bt) {
    const g = bt.grenzt_an || {};
    if (g.typ === "aussen" && zahl(bt.A, 0) > 0) lagen[bt.lage || bt.name || "x"] = true;
  });
  return Object.keys(lagen).length;
}

function nMinAusArt(raum, projekt) {
  const arten = (projekt && projekt.raumarten) || {};
  const a = arten[raum.art];
  if (a && Number.isFinite(zahl(a.n_min, NaN))) return zahl(a.n_min);
  return 0.5;
}

/* ---------------------------------------------------------------------------
 * 7  GESAMTRECHNUNG
 * ------------------------------------------------------------------------ */
function rechne(projekt) {
  const p = projekt || {};
  /* f_theta_ann und f_GW sind im Projekt unter den neuen wie den alten Namen
     einstellbar; NORM.F_G1 und NORM.G_W tragen denselben Wert. */
  const norm = Object.assign({}, NORM, {
    DELTA_U_WB: zahl(p.norm && p.norm.delta_u_wb, NORM.DELTA_U_WB_STANDARD),
    F_G1: zahl(p.norm && p.norm.f_theta_ann, zahl(p.norm && p.norm.f_g1, NORM.F_G1)),
    G_W: zahl(p.norm && p.norm.f_gw, zahl(p.norm && p.norm.g_w, NORM.G_W)),
    RHO_C: zahl(p.norm && p.norm.rho_c, NORM.RHO_C),
    EPSILON: zahl(p.norm && p.norm.epsilon, NORM.EPSILON),
  });
  norm.F_THETA_ANN = norm.F_G1;
  norm.F_GW = norm.G_W;
  /* NIE-NaN-RUECKFALL (Kehrwoche 25.08.2026). Bis hierher lief die Rechnung
     bei fehlendem Klima mit NaN weiter: jede Differenz theta_i - theta_e wurde
     NaN, jede Summe blieb NaN, und am Ende stand "NaN kW" ohne eine einzige
     Zahl. Der Rueckfall haelt die Rechnung endlich; die Warnung bleibt und
     benennt Ersatzwert und Fehlerrichtung. Die Ersatzwerte sind KEINE
     typischen Werte, sondern die KAELTESTEN der eigenen PLZ-Tabelle nach
     DIN/TS 12831-1 (daten/klima_bwp_din_ts_12831_1.csv: theta_e minimal
     -19,2 °C, Jahresmittel minimal 0,1 °C) — die Heizlast faellt damit eher
     ZU GROSS aus. Zu gross ist hier die richtige Richtung: ein zu kleines
     Ergebnis waere der Fehler, der unsichtbar bleibt. Der Eintrag der PLZ
     ersetzt beide Werte vollstaendig (Gegenprobe im nie_nan-Selbsttest). */
  let theta_e = zahl(p.klima && p.klima.theta_e, NaN);
  let theta_e_m = zahl(p.klima && p.klima.theta_e_m, NaN);
  const theta_e_angenommen = !Number.isFinite(theta_e);
  const theta_e_m_angenommen = !Number.isFinite(theta_e_m);

  const warnungen = [];
  if (theta_e_angenommen) {
    theta_e = KLIMA_RUECKFALL.theta_e;
    warnungen.push("Norm-Außentemperatur theta_e fehlt. Gerechnet ist ersatzweise mit "
      + znr(KLIMA_RUECKFALL.theta_e, 1) + " °C, dem kältesten Wert der PLZ-Tabelle nach "
      + "DIN/TS 12831-1 — die Heizlast fällt damit eher zu groß aus. Erst mit "
      + "Postleitzahl oder Ort ist die Berechnung normkonform (PLZ-genau); der Eintrag "
      + "ersetzt den Ersatzwert vollständig.");
  }
  if (theta_e_m_angenommen && hatErdreich(p)) {
    theta_e_m = KLIMA_RUECKFALL.theta_e_m;
    warnungen.push("Jahresmitteltemperatur theta_e,m fehlt, wird aber für erdberührte "
      + "Bauteile benötigt: sie ist die Bezugstemperatur des Temperaturanpassungs"
      + "faktors f_ig nach DIN EN 12831-1:2017-09. Gerechnet ist ersatzweise mit "
      + znr(KLIMA_RUECKFALL.theta_e_m, 1) + " °C, dem kleinsten Jahresmittel der "
      + "PLZ-Tabelle — der Erdreichanteil fällt damit eher zu groß aus. Die "
      + "Postleitzahl ersetzt den Ersatzwert.");
  } else if (theta_e_m_angenommen) {
    /* Ohne erdberuehrte Bauteile rechnet niemand mit theta_e,m — aber ein NaN
       im Ergebnisblock (klima.theta_e_m) darf trotzdem nicht stehen bleiben. */
    theta_e_m = KLIMA_RUECKFALL.theta_e_m;
  }

  /* WIDERSPRUCH ZWISCHEN KENNZEICHNUNG UND LAGE EINES BAUTEILS.
   * kat sagt, wohin ein Bauteil zaehlt; grenzt_an sagt, wo es liegt. Beides
   * kann auseinanderlaufen, und ueber die Oberflaeche ist das in zwei
   * Schritten erreichbar (kat aus kat_default beim Anlegen, danach nur
   * grenzt_an geaendert). Die beiden schaedlichen Faelle:
   *   grenzt_an "raum" mit kat != "innen"  -> wird ueberstimmt (siehe
   *     bauteilKategorie); ohne das drueckte es H_T ins Negative.
   *   grenzt_an "aussen" mit kat "innen"   -> das Bauteil verschwindet
   *     vollstaendig aus der Gebaeudeheizlast. Hier wird NICHT ueberstimmt:
   *     das wuerde die Zahl eines gespeicherten Projekts stillschweigend
   *     aendern. Gemeldet wird es, damit es jemand entscheidet.
   * Festgehalten in validierung/referenz_test.js, R24. */
  const widerspruch = [];
  (p.raeume || []).forEach(function (r) {
    (r.bauteile || []).forEach(function (bt) {
      if (!bt.kat) return;
      const t = (bt.grenzt_an && bt.grenzt_an.typ) || "aussen";
      /* Anfuehrungszeichen als Escapes: die deutschen Zeichen kollidieren
         sonst mit den Zeichenkettengrenzen. */
      const AN = "\u201E", AB = "\u201C";
      const wo = "Raum " + AN + (r.name || r.id || "?") + AB + ", Bauteil "
        + AN + (bt.name || "ohne Namen") + AB;
      if (t === "raum" && bt.kat !== "innen") {
        widerspruch.push(wo + " ist als " + AN + bt.kat + AB + " gekennzeichnet, "
          + "grenzt aber an einen Raum desselben Gebäudes. Gerechnet wird es "
          + "als Innenbauteil — Wärme, die in einen anderen Raum geht, "
          + "verlässt das Gebäude nicht.");
      } else if (t === "aussen" && bt.kat === "innen") {
        widerspruch.push(wo + " ist als Innenbauteil gekennzeichnet, grenzt aber "
          + "an die Außenluft. Es geht damit NICHT in die Gebäudeheizlast ein. "
          + "Ist das gewollt? Sonst die Kennzeichnung auf " + AN + "huelle" + AB
          + " ändern.");
      }
    });
  });
  if (widerspruch.length) {
    warnungen.push("Kennzeichnung und Lage widersprechen sich bei "
      + widerspruch.length + (widerspruch.length === 1 ? " Bauteil" : " Bauteilen")
      + ": " + widerspruch.join(" "));
  }

  /* EIN RAUM AUF DER AUSSENTEMPERATUR IST KEIN BEHEIZTER RAUM.
   * Bei theta_i == theta_e ist der Anpassungsfaktor b gegen einen Nachbarn
   * anderer Temperatur unbestimmt; das Bauteil traegt dann nichts zu H_T bei
   * (siehe bauteilLeistung). Die Heizlast des Raums ist richtig null — er
   * wird ja nicht beheizt. Nur darf das nicht unbemerkt bleiben. */
  const kalt = (p.raeume || []).filter(function (r) {
    return Math.abs(raumTemperatur(r, p) - theta_e) < 1e-9;
  });
  if (kalt.length) {
    warnungen.push((kalt.length === 1 ? "Ein Raum steht" : kalt.length
      + " Räume stehen") + " auf der Norm-Außentemperatur ("
      + znr(theta_e, 1) + " °C): "
      + kalt.map(function (r) {
          return "\u201E" + (r.name || r.id) + "\u201C"; }).join(", ")
      + ". Die Heizlast dieser Räume ist damit null. Für einen beheizten Raum "
      + "ist das eine Fehleingabe; für einen unbeheizten Bereich ist der "
      + "Bereich unter \u201EUnbeheizte Bereiche\u201C der richtige Ort.");
  }

  /* EINE ANGEGEBENE LUEFTUNGSANLAGE DARF NICHT STILLSCHWEIGEND VERSCHWINDEN.
   * Dieses Werkzeug rechnet die Lueftungsheizlast ausschliesslich ueber den
   * natuerlichen Luftwechsel (Infiltration aus n50 und Mindestluftwechsel).
   * Ein Anlagenluftstrom und ein Rueckgewinnungsgrad sind NICHT abgebildet;
   * die Formeln dafuer stehen in DIN EN 12831-1, deren Wortlaut hier nicht
   * geprueft vorliegt, und werden nicht erfunden. Bis dahin gilt: wer eine
   * Anlage angibt, muss erfahren, dass sie nicht eingerechnet ist. Die
   * Fehlerrichtung ist die sichere (Lueftungslast eher zu gross), aber eine
   * sichere Richtung ist keine Entschuldigung fuer eine stille Annahme.
   * Festgehalten in validierung/referenz_test.js, R12. */
  const lu = p.lueftung || {};
  /* Die Betriebsart kommt aus einer von Hand bearbeiteten Projektdatei; ihre
     Schreibung ist nicht garantiert. "Mechanisch", "abluftanlage", "zentral"
     fielen vorher durch, weil auf Gleichheit mit "mechanisch" geprueft wurde.
     Und ein Rueckgewinnungsgrad von 0 ist KEINE Rueckgewinnung -- der Text
     sagte trotzdem "mit Waermerueckgewinnung" (beides Befunde der
     unabhaengigen Durchsicht vom 27.08.2026). */
  const art = String(lu.art || "").toLowerCase();
  const grad = Number.isFinite(zahl(lu.eta, NaN)) ? zahl(lu.eta)
             : (Number.isFinite(zahl(lu.wrg_grad, NaN)) ? zahl(lu.wrg_grad) : null);
  const mitWRG = lu.wrg === true || (grad !== null && grad > 0);
  if (/mechan|anlage|zentral|abluft|zuluft|kwl/.test(art)
      || lu.mechanisch === true || lu.wrg === true || grad !== null) {
    warnungen.push("Für das Projekt ist eine Lüftungsanlage"
      + (mitWRG ? " mit Wärmerückgewinnung" : "")
      + " angegeben. Dieses Werkzeug rechnet die Lüftungsheizlast NICHT mit "
      + "der Anlage, sondern ausschließlich über den natürlichen Luftwechsel "
      + "aus Infiltration und Mindestluftwechsel. Ein Anlagenluftstrom und ein "
      + "Rückgewinnungsgrad sind nicht abgebildet — die Lüftungsheizlast fällt "
      + "damit eher zu groß aus. Wer die Anlage ansetzen will, muss das "
      + "außerhalb dieses Werkzeugs nachweisen.");
  }

  // Zonentemperaturen
  const pZonen = Object.assign({}, p, {
    klima: { theta_e: theta_e, theta_e_m: theta_e_m },
  });
  const zt = zonenTemperaturen(pZonen, norm);
  if (!zt.konvergiert) {
    warnungen.push("Die Bilanz der unbeheizten Zonen ist nach " + zt.iterationen
      + " Schritten nicht konvergiert. Zonenverknüpfungen prüfen.");
  }

  /* Empfindlichkeitsrechnung: dieselbe Bilanz mit dem Luftwechsel der Zone.
     Nur wenn im Projekt ueberhaupt ein Luftwechsel angegeben ist. */
  const hatZonenLuft = (p.zonen || []).some(function (z) {
    return zonenLueftungH(z, norm) > 0;
  });
  const ztLuft = hatZonenLuft ? zonenTemperaturen(pZonen, norm, true) : null;
  const zonenLueftungMassgebend = !!(p.optionen && p.optionen.zonen_lueftung_massgebend);
  if (zonenLueftungMassgebend && !hatZonenLuft) {
    warnungen.push("Für die unbeheizten Bereiche ist der Lüftungsweg eingeschaltet, "
      + "aber bei keiner Zone sind Luftwechsel n_luft und Volumen V angegeben. "
      + "Gerechnet wird der Normweg ohne Lüftung.");
  }
  const zonenTemp = (zonenLueftungMassgebend && ztLuft)
    ? ztLuft.temperaturen : zt.temperaturen;

  /* Gegenprobe zur Vorgabe des Bearbeiters: dieselbe Bilanz, aber mit allen
     Bereichen im Bilanzmodus. Damit steht neben jeder vorgegebenen Temperatur
     die Zahl, die die Norm-Bilanz liefern wuerde. Eine grobe Fehleingabe faellt
     dadurch auf. Der Durchlauf kostet nur etwas, wenn es ueberhaupt eine
     Vorgabe gibt. */
  const hatVorgabe = (p.zonen || []).some(function (z) {
    return z.modus === "fest" || z.modus === "f1" || z.modus === "lage";
  });
  const ztBilanz = hatVorgabe
    ? zonenTemperaturen(Object.assign({}, pZonen, {
        zonen: (p.zonen || []).map(function (z) {
          return Object.assign({}, z, { modus: "bilanz", lage: null });
        }),
      }), norm)
    : zt;

  /* Eine Zone im Bilanzweg ohne eigene Huellbauteile. Ohne Warnung stehen
     Kellerdecke und oberste Geschossdecke mit 0 W in der Rechnung, und die
     Ergebnisseite meldet "Keine Auffaelligkeiten" — an einem echten Projekt
     mit 118,1 m2 Bauteilflaeche gemessen. */
  (p.zonen || []).forEach(function (z) {
    const hatBt = (z.huelle || []).some(function (bt) { return zahl(bt.A, 0) > 0; });
    if (hatBt || z.modus === "fest" || z.modus === "f1" || z.modus === "lage") return;
    const angrenzend = (p.raeume || []).reduce(function (a, r) {
      return a + (r.bauteile || []).filter(function (b) {
        return b.grenzt_an && b.grenzt_an.typ === "zone" && b.grenzt_an.ref === z.id;
      }).reduce(function (x, b) { return x + zahl(b.A, 0); }, 0);
    }, 0);
    warnungen.push("Unbeheizter Bereich \"" + (z.name || z.id) + "\" hat kein einziges "
      + "eigenes Hüllbauteil. Seine Temperatur lässt sich damit nicht bilanzieren; "
      + "angesetzt ist die Mindesttemperatur nach DIN/TS 12831-1:2020-04, Tabelle 6, "
      + "also " + znr(zonenMindesttemperatur(z, theta_e), 1)
      + " °C. Das ist die obere Schranke des Wärmestroms und eine Annahme. "
      + (angrenzend > 0
        ? "Es grenzen " + znr(angrenzend, 1) + " m² beheizter Bauteilfläche daran. "
        : "")
      + "Bitte die Bauteile des Bereichs nach außen und gegen Erdreich eintragen "
      + "oder unter \"Unbeheizte Bereiche\" eine Lage auswählen.");
  });

  const zonenBefunde = zonenBefund(pZonen, norm, zt.temperaturen,
    ztLuft ? ztLuft.temperaturen : null, ztBilanz.temperaturen);
  zonenBefunde.forEach(function (zb) {
    if (zb.lage_unbekannt) {
      warnungen.push("Unbeheizter Bereich \"" + zb.name + "\": für das Temperaturniveau "
        + "ist eine Lage hinterlegt, die dieses Werkzeug nicht kennt. Es wird nichts "
        + "geraten, gerechnet wird die stationäre Bilanz. Lage neu auswählen.");
    }
    if (zb.abweichung_auffaellig) {
      warnungen.push("Unbeheizter Bereich \"" + zb.name + "\": vorgegeben sind "
        + znr(zb.theta, 1) + " °C"
        + (zb.lage ? " (Lage „" + zb.lage.name + "“)" : "")
        + ", die stationäre Bilanz nach DIN EN 12831-1 kommt für denselben Bereich auf "
        + znr(zb.theta_bilanz, 1) + " °C. Das sind " + znr(Math.abs(zb.abweichung), 1)
        + " K Unterschied. Maßgebend ist die Vorgabe; prüfen Sie, ob sie zur Lage passt. "
        + "Die Schwelle von " + znr(zb.abweichung_schwelle_K, 1) + " K, ab der dieser "
        + "Hinweis erscheint, ist eine Festlegung dieses Werkzeugs und keine Vorgabe "
        + "der Norm.");
    }
    if (zb.delta_lueftung !== null && Math.abs(zb.delta_lueftung) > 1.0) {
      warnungen.push("Unbeheizter Bereich \"" + zb.name + "\": mit dem angegebenen "
        + "Luftwechsel von " + znr(zb.n_luft, 2) + " 1/h liegt die Temperatur um "
        + znr(Math.abs(zb.delta_lueftung), 1) + " K " + (zb.delta_lueftung < 0
          ? "niedriger" : "höher") + " als in der Bilanz ohne Lüftung. Ein Bereich "
        + "mit derart großem Luftwechsel ist über die Bilanz nicht zutreffend "
        + "abgebildet. Für ihn gehört statt der Bilanz ein pauschaler "
        + "Temperaturanpassungsfaktor f_1 nach DIN/TS 12831-1:2020-04 angesetzt "
        + "(Modus \"f1\").");
    }
  });

  // Raumtemperaturen für Innenbauteile
  const raumTemp = {};
  (p.raeume || []).forEach(function (r) { raumTemp[r.id] = raumTemperatur(r, p); });

  const ctx = {
    theta_e: theta_e, theta_e_m: theta_e_m,
    zonenTemp: zonenTemp, raumTemp: raumTemp,
  };

  const raeume = (p.raeume || []).map(function (r) { return raumRechnen(r, p, ctx, norm); });

  // Summen
  const phi_raeume_summe = raeume.reduce(function (s, r) { return s + r.phi_raum; }, 0);
  const phi_gebaeude = raeume.reduce(function (s, r) { return s + r.phi_gebaeude; }, 0);
  const phi_T_gebaeude = raeume.reduce(function (s, r) { return s + r.phi_T_huelle; }, 0);
  const phi_V_gebaeude = raeume.reduce(function (s, r) { return s + r.phi_V; }, 0);
  const phi_RH_gebaeude = raeume.reduce(function (s, r) { return s + r.phi_RH; }, 0);
  const A_gesamt = raeume.reduce(function (s, r) { return s + r.A; }, 0);
  const V_gesamt = raeume.reduce(function (s, r) { return s + r.V; }, 0);
  /* H_T — SPEZIFISCHER TRANSMISSIONSWAERMEVERLUST DER HUELLE
   *
   *     H_T = SUM( A_k * U_k * b_k )
   *
   * b_k ist der Temperaturanpassungsfaktor des Bauteils; er steckt hier
   * bereits in bauteilLeistung(): fuer Bauteile gegen Aussenluft ist b = 1,
   * gegen eine unbeheizte Zone (theta_i - theta_u)/(theta_i - theta_e), und
   * erdberuehrt f_theta_ann * f_ig * f_GW. Innenbauteile gegen Raeume
   * desselben Gebaeudes gehen NICHT ein: sie verlassen die Huelle nicht.
   *
   * WIE WEIT H_T VON DEN RAUMTEMPERATUREN UNABHAENGIG IST -- genau, nicht
   * ungefaehr: Fuer Bauteile gegen Aussenluft ist b = 1, fuer Bauteile gegen
   * eine unbeheizte Zone kuerzt sich theta_i heraus, sobald theta_u aus der
   * Bilanz mitwandert. Fuer ERDBERUEHRTE Bauteile und fuer Bauteile gegen
   * einen Nachbarn fester Temperatur steckt theta_i dagegen im
   * Anpassungsfaktor selbst (f_ig = (theta_i - theta_e_m)/(theta_i - theta_e)
   * bzw. b = (theta_i - theta_j)/(theta_i - theta_e)); dort aendert sich H_T
   * mit der Raumtemperatur, und das ist nach der Normdefinition richtig.
   * Gemessen an derselben Bodenplatte (50 m2, U 0,35, theta_e -10,
   * theta_e_m 9,5): H_T = 5,58 bei 15 °C, 8,88 bei 20 °C, 10,82 bei 24 °C.
   * Was H_T also NICHT mehr ist: eine aus der Gebaeudesumme
   * zurueckgerechnete Groesse. Genau daran fehlte es bis zum
   * 27.08.2026: H_T wurde aus der Gebaeudesumme zurueckgerechnet,
   *     H_T = Phi_T,Gebaeude / (20 °C - theta_e),
   * waehrend Phi_T,Gebaeude je Raum mit DESSEN Innentemperatur entsteht.
   * Sobald ein Raum von 20 °C abweicht, passten Zaehler und Nenner nicht
   * zusammen. Der Fehler ging in beide Richtungen (Bad 24 °C zu gross,
   * Treppenhaus 15 °C zu klein) und lag beim Referenzfall Maelzerstrasse
   * bei -3,10 Prozent. Festgehalten in validierung/referenz_test.js, R05.
   */
  const H_T = raeume.reduce(function (s, r) {
    return s + r.bauteile.reduce(function (t, b) {
      /* b.H kommt aus bauteilLeistung() und ist immer eine Zahl. Bewusst OHNE
         zahl(b.H, 0): der Rueckfall auf 0 machte aus einem Ueberlauf
         (A = 1e308) eine plausible Null, waehrend phi_T_gebaeude auf
         Infinity stand. Ein unmoeglicher Wert muss sichtbar bleiben; die
         Invariantenprobe R21 faengt ihn dann. */
      return t + (b.kat === "innen" ? 0 : b.H);
    }, 0);
  }, 0);

  /* Dieselbe Transmission, aber auf 20 °C Innentemperatur normiert. KEIN
   * H_T im Sinne der Norm — die Groesse existiert nur, damit der Vergleich
   * mit dem externen Referenzmodell (validierung/vergleich.js gegen
   * heizlast_maelzerstr59/modell.py) weiterlaeuft: jenes Modell weist seinen
   * H_T ebenfalls 20-°C-normiert aus. Sie gehoert nicht in den Bericht. */
  const H_T_20K_bezug = (20.0 - theta_e) !== 0
    ? phi_T_gebaeude / (20.0 - theta_e) : 0;

  /* Bezugsflächen auseinanderhalten. Der Referenzbericht weist die spezifische
   * Heizlast auf die WOHNFLÄCHE aus, damit sie mit üblichen Kennwerten
   * vergleichbar bleibt; die Summe der Raumflächen ist eine andere Größe und
   * im Regelfall größer. Wer beides vermischt, vergleicht später gegen den
   * falschen Erwartungswert. */
  const wohnflaeche = zahl(p.meta && p.meta.wohnflaeche, 0);
  const spez_raumflaeche = A_gesamt > 0 ? phi_gebaeude / A_gesamt : 0;
  const spez_wohnflaeche = wohnflaeche > 0 ? phi_gebaeude / wohnflaeche : null;

  // Bauteilbilanz des Gebäudes (ohne Innenbauteile)
  const bilanz = {};
  raeume.forEach(function (r) {
    r.bauteile.forEach(function (bt) {
      if (bt.kat === "innen") return;
      const key = bt.name.split(" (")[0];
      if (!bilanz[key]) bilanz[key] = { A: 0, phi: 0, U: bt.U, kat: bt.kat };
      bilanz[key].A += bt.A;
      bilanz[key].phi += bt.phi;
    });
  });

  // Summen je Geschoss und je Wohneinheit
  const jeGeschoss = {}, jeWE = {};
  raeume.forEach(function (r) {
    const g = r.geschoss || "-";
    if (!jeGeschoss[g]) jeGeschoss[g] = { phi_raum: 0, phi_gebaeude: 0, A: 0 };
    jeGeschoss[g].phi_raum += r.phi_raum;
    jeGeschoss[g].phi_gebaeude += r.phi_gebaeude;
    jeGeschoss[g].A += r.A;
    const w = r.we || "(ohne Zuordnung)";
    if (!jeWE[w]) jeWE[w] = { phi_raum: 0, A: 0, raeume: 0 };
    jeWE[w].phi_raum += r.phi_raum;
    jeWE[w].A += r.A;
    jeWE[w].raeume += 1;
  });

  /* EINE NULL IST EIN ERGEBNIS, DAS SICH ERKLAEREN MUSS.
   * GEMESSEN am 27.08.2026 am echten Bauantrag Soethe: 14 Raeume aus der
   * Planauslese, alle ohne Grundflaeche und ohne Bauteil, weil der Plan keine
   * Flaechen anschreibt. Der Kern gab 0,00 kW zurueck -- und KEINE EINZIGE
   * Warnung. Die vorhandene Probe "Raum ohne Huellbauteil" steht unter
   * r.A > 0 und uebersprang die Raeume deshalb alle; eine Probe auf A == 0
   * gab es nicht. Ein Raum ohne Flaeche UND ohne Bauteil fiel damit durch
   * beide Netze.
   * Das Kontrollblatt faengt den Fall, aber der Kern ist ausdruecklich auch
   * ohne es benutzbar. Ein Aufrufer, der nur rechne() aufruft, bekam eine
   * Null, die wie ein Ergebnis aussieht.
   * Gemeldet wird GEBUENDELT, nicht je Raum: bei 14 Raeumen waeren 14
   * gleichlautende Zeilen keine Auskunft, sondern Rauschen.
   * Festgehalten in validierung/referenz_test.js, R26. */
  const ohneFlaeche = raeume.filter(function (r) { return !(r.A > 0); });
  if (ohneFlaeche.length) {
    const namen = ohneFlaeche.slice(0, 3).map(function (r) {
      return "\u201E" + (r.raum || r.id || "ohne Namen") + "\u201C";
    }).join(", ");
    warnungen.push((ohneFlaeche.length === 1 ? "Ein Raum hat" : ohneFlaeche.length
      + " Räume haben") + " keine Grundfläche: " + namen
      + (ohneFlaeche.length > 3 ? " und " + (ohneFlaeche.length - 3) + " weitere" : "")
      + ". Ohne Fläche ist auch das Luftvolumen null; diese Räume tragen nichts "
      + "zur Heizlast bei. Steht die Fläche nicht im Plan, muss sie am Plan "
      + "abgegriffen oder eingetragen werden.");
  }
  const ohneHuellbauteil = raeume.filter(function (r) {
    return r.bauteile.filter(function (b) { return b.kat !== "innen"; }).length === 0;
  });
  if (raeume.length && ohneHuellbauteil.length === raeume.length) {
    warnungen.push("In keinem der " + raeume.length + " Räume ist ein Bauteil der "
      + "Gebäudehülle angelegt. Die ausgewiesene Transmissionsheizlast ist "
      + "deshalb null — das ist KEIN Rechenergebnis, sondern eine fehlende "
      + "Angabe. Erst mit Bauteilen und U-Werten entsteht eine Heizlast.");
  }
  if (raeume.length && !(phi_gebaeude > 0)) {
    warnungen.push("Die Gebäudeheizlast ist " + znr(phi_gebaeude, 1) + " W, obwohl "
      + raeume.length + (raeume.length === 1 ? " Raum" : " Räume") + " angelegt "
      + (raeume.length === 1 ? "ist" : "sind") + ". Dieser Wert darf nicht als "
      + "Heizlast verwendet werden; es fehlen Flächen, Bauteile oder beides.");
  }

  // Plausibilitätsprüfungen
  if (jeWE["(ohne Zuordnung)"]) {
    const ohneZ = jeWE["(ohne Zuordnung)"].raeume;
    warnungen.push((ohneZ === 1 ? "Ein Raum ist" : ohneZ + " Räume sind")
      + " keiner Wohn- oder Nutzungseinheit zugeordnet. Für die Lüftung nach "
      + "DIN EN 12831-1 ist die Zuordnung erforderlich.");
  }
  if (wohnflaeche > 0 && A_gesamt > 0) {
    const abw = (A_gesamt - wohnflaeche) / wohnflaeche * 100;
    /* Die Summe der Raumflächen liegt üblicherweise etwas über der Wohnfläche
       nach WoFlV, weil dort Schrägen und Nebenflächen nur anteilig zählen.
       Weicht sie stark ab, stimmt der Maßstab nicht oder es fehlen Räume.
       Diese Probe ist die einzige, die einen gleichmäßigen Maßstabsfehler
       überhaupt finden kann: er skaliert Flächen und Wärmestrom gemeinsam,
       bleibt in W/m² also unsichtbar. */
    if (abw < -12 || abw > 45) {
      warnungen.push("Die Summe der Raumflächen (" + rnd(A_gesamt, 1) + " m²) weicht um "
        + rnd(abw, 0) + " Prozent von der angegebenen Wohnfläche (" + rnd(wohnflaeche, 1)
        + " m²) ab. Üblich sind 0 bis 25 Prozent darüber. Bitte den Maßstab und die "
        + "Vollständigkeit der Räume prüfen: ein gleichmäßiger Maßstabsfehler fällt "
        + "sonst nirgends auf, weil er die Heizlast je Quadratmeter unverändert lässt.");
    }
  }
  raeume.forEach(function (r) {
    // Der Raumname allein ist nicht eindeutig: "Diele" gibt es in jedem
    // Geschoss. Ein Befund, der den Raum nicht benennt, ist nicht abzuarbeiten.
    // Und auch Geschoss samt Name reichen nicht: das Erdgeschoss von Dumach 1
    // hat drei Raeume "Flur". Dreimal dieselbe Zeile liest sich wie eine
    // doppelte Meldung; die Flaeche macht den Raum im Raumbuch auffindbar.
    const mehrfach = raeume.filter(function (x) {
      return x.raum === r.raum && (x.geschoss || "") === (r.geschoss || "");
    }).length > 1;
    const wo = "Raum \u201e" + (r.geschoss ? r.geschoss + " " : "") + r.raum
      + (mehrfach && r.A > 0 ? " (" + rnd(r.A, 2) + " m\u00b2)" : "") + "\u201c";
    if (r.A > 0 && !(r.h > 0)) {
      warnungen.push(wo + ": es fehlt die lichte Höhe. Sie geht in das "
        + "Luftvolumen und damit unmittelbar in die Lüftungsheizlast ein; ohne sie ist das "
        + "Ergebnis für diesen Raum nicht belastbar.");
    }
    /* Ein Raum ohne Huellbauteil ist meist eine vergessene Wand -- aber
       nicht immer: ein innenliegender Flur, ein WC, ein Abstellraum grenzen
       rundum an beheizte Raeume, und dann ist der Transmissionsanteil
       tatsaechlich null. Der Kern kann das nicht entscheiden, er kennt keine
       Raumarten und soll auch keine kennen. Der Aufrufer kann es: er setzt
       raum.innenliegend, wenn KERN_ZUORDNUNG.innenraumZulaessig() das
       bestaetigt hat. Ohne die Angabe bleibt die Warnung wie bisher stehen —
       Schweigen waere hier der teurere Fehler.
       Gemessen am Blatt BV 2-0887 Ziolkowski: „EG WC" und „EG DIELE"
       erzeugten diese Warnung, obwohl beide Raeume richtig gerechnet sind,
       und sie stand im Bericht neben der Kontrollblattzeile, die dasselbe
       ausdruecklich fuer richtig erklaerte. */
    if (r.A > 0 && r.innenliegend !== true
        && r.bauteile.filter(function (b) { return b.kat !== "innen"; }).length === 0) {
      warnungen.push(wo + " hat kein einziges Hüllbauteil. Das ist nur bei "
        + "vollständig innenliegenden Räumen richtig.");
    }
    if (r.spez > 200) {
      warnungen.push(wo + ": " + rnd(r.spez, 0) + " W/m² ist auffällig hoch. "
        + "Fläche, U-Werte und Bauteilflächen prüfen.");
    }
  });

  return {
    ok: warnungen.length === 0,
    warnungen: warnungen,
    klima: { theta_e: theta_e, theta_e_m: theta_e_m,
             /* true, wenn der jeweilige Wert nicht aus dem Projekt kam,
                sondern der Nie-NaN-Rueckfall ist (Warnung steht daneben) */
             theta_e_angenommen: theta_e_angenommen,
             theta_e_m_angenommen: theta_e_m_angenommen },
    norm: norm,
    zonen: zonenTemp,
    zonen_norm: zt.temperaturen,
    zonen_lueftung: ztLuft ? ztLuft.temperaturen : null,
    zonen_lueftung_massgebend: zonenLueftungMassgebend && !!ztLuft,
    /* Vergleichslauf, in dem ALLE unbeheizten Bereiche bilanziert wurden.
       Steht neben zonen, damit vorgegebene und bilanzierte Temperatur im
       Bericht nebeneinander gezeigt werden koennen. */
    zonen_bilanz: ztBilanz.temperaturen,
    zonen_befund: zonenBefunde,
    /* Saetze, die der Bericht unveraendert uebernehmen kann. Sie belegen die
       beiden Vereinfachungen, statt sie stillschweigend mitzufuehren. */
    hinweise: hinweise(p, zonenBefunde, zonenLueftungMassgebend && !!ztLuft),
    zonen_iterationen: zt.iterationen,
    raeume: raeume,
    bilanz: bilanz,
    je_geschoss: jeGeschoss,
    je_we: jeWE,
    A_gesamt: A_gesamt,
    V_gesamt: V_gesamt,
    phi_raeume_summe: phi_raeume_summe,
    phi_gebaeude: phi_gebaeude,
    phi_T_gebaeude: phi_T_gebaeude,
    phi_V_gebaeude: phi_V_gebaeude,
    phi_RH_gebaeude: phi_RH_gebaeude,
    H_T: H_T,
    H_T_20K_bezug: H_T_20K_bezug,
    wohnflaeche: wohnflaeche || null,
    spez_raumflaeche: spez_raumflaeche,
    spez_wohnflaeche: spez_wohnflaeche,
    /* bleibt aus Rücksicht auf vorhandene Aufrufer erhalten und ist gleich
       spez_raumflaeche; für Vergleiche mit Kennwerten ist spez_wohnflaeche
       die richtige Größe */
    spez_gebaeude: spez_raumflaeche,
  };
}

/* ---------------------------------------------------------------------------
 * 7b  BELEGSAETZE ZU DEN BEIDEN VEREINFACHUNGEN
 * ------------------------------------------------------------------------ */
/** Liefert fertige Saetze mit Fundstelle. Der Bericht haengt sie an das
 *  jeweilige Kapitel an, damit keine der beiden Vereinfachungen unerwaehnt
 *  bleibt. bereich: "zonen" oder "erdreich". */
function hinweise(p, befunde, lueftungMassgebend) {
  const h = [];

  /* DER LUEFTUNGSWEG GEHOERT IMMER AUSGEWIESEN, NICHT NUR AUF ANFRAGE.
   * Die Warnung weiter oben in rechne() haengt an projekt.lueftung -- und
   * dieses Feld schreibt die Oberflaeche nirgends: es gibt kein Eingabefeld
   * und kein Ausgabefeld des Ausleseendpunkts dafuer (Befund der
   * unabhaengigen Durchsicht vom 27.08.2026). Wer real eine Lueftungsanlage
   * hat, konnte sie also gar nicht eintragen und bekam deshalb auch keine
   * Warnung. Ein Hinweis, der nur bei einer Angabe erscheint, die niemand
   * machen kann, ist kein Hinweis. Dieser hier steht immer. */
  h.push({
    bereich: "lueftung",
    text: "Die Lüftungsheizlast ist ausschließlich über den natürlichen "
      + "Luftwechsel gerechnet: Infiltration aus der Luftdichtheit n50 und "
      + "Mindestluftwechsel je Raumart, maßgebend ist der größere der beiden. "
      + "Eine mechanische Lüftungsanlage ist NICHT abgebildet — weder ein "
      + "Anlagenluftstrom noch ein Wärmerückgewinnungsgrad. Ist im Gebäude "
      + "eine Lüftungsanlage mit Wärmerückgewinnung vorhanden, fällt die hier "
      + "ausgewiesene Lüftungsheizlast damit zu groß aus; der Ansatz nach "
      + "DIN EN 12831-1 ist dann außerhalb dieses Werkzeugs zu führen.",
  });
  const bilanzZonen = befunde.filter(function (b) { return b.herkunft === "bilanz"; });
  const f1Zonen = befunde.filter(function (b) { return b.modus === "f1"; });
  const lagenZonen = befunde.filter(function (b) { return b.lage; });

  if (bilanzZonen.length) {
    h.push({
      bereich: "zonen",
      text: "Die Temperatur der unbeheizten Bereiche folgt einer stationären "
        + "Gleichgewichtsbilanz: θu = max( Σ(H_T,uj · θj) / Σ(H_T,uj) ; θu,min ). "
        + "DIN EN 12831-1 lässt es zu, θu über eine Gleichgewichtsbilanz zu bestimmen. "
        + "In die hier gerechnete Bilanz gehen ausschließlich "
        + "Transmissionswärmetransferkoeffizienten ein, ein Luftwechselterm ist nicht "
        + "angesetzt. Das ist eine Vereinfachung dieser Berechnung. Sie liegt auf der "
        + "unsicheren Seite: ein belüfteter Bereich wäre kälter, das angrenzende Bauteil "
        + "verlöre mehr Wärme. Für Bereiche mit erheblichem Luftwechsel gehört deshalb "
        + "nicht die Bilanz angesetzt, sondern der pauschale Temperaturanpassungsfaktor "
        + "f_1; für offene und stark belüftete Dächer sowie Kaltdächer beträgt er 1,0, "
        + "der Bereich ist dann rechnerisch so kalt wie die Außenluft. Ob die "
        + "Voraussetzung eines geringen Luftwechsels zutrifft, ist für jeden hier "
        + "bilanzierten Bereich zu prüfen.",
    });
  }
  const ohneMin = bilanzZonen.filter(function (b) { return !b.an_mindesttemperatur; });
  if (bilanzZonen.length && ohneMin.length === bilanzZonen.length) {
    h.push({
      bereich: "zonen",
      text: "Für die Mindesttemperatur θu,min nach DIN/TS 12831-1:2020-04 "
        + "ist der Fall \u201ekeine Begrenzung vorhanden\u201c angesetzt, also θu,min gleich "
        + "der Norm-Außentemperatur. Die Bilanz liegt bei allen Bereichen darüber, die "
        + "Begrenzung wird deshalb nicht wirksam. Ist ein Frostschutz vorhanden, gilt "
        + "nach derselben Tabelle sein eingestellter Wert, ersatzweise 5 °C.",
    });
  }
  if (f1Zonen.length) {
    h.push({
      bereich: "zonen",
      text: "Für " + f1Zonen.map(function (b) { return b.name; }).join(", ")
        + " ist statt der Bilanz der pauschale Temperaturanpassungsfaktor f_1 nach "
        + "DIN/TS 12831-1:2020-04 angesetzt. Dieser Weg ist der richtige, "
        + "wenn erhebliche Luftvolumenströme auftreten, weil er sie enthält.",
    });
  }
  if (lagenZonen.length) {
    lagenZonen.forEach(function (b) {
      h.push({
        bereich: "zonen",
        text: "Für den unbeheizten Bereich „" + b.name + "“ ist das Temperaturniveau "
          + "nicht bilanziert, sondern vom Bearbeiter nach der Lage vorgegeben: "
          + b.lage.name + (b.lage.f1 !== null && b.lage.f1 !== undefined
            ? ", Temperaturanpassungsfaktor f_1 = " + rnd(b.lage.f1, 2).toString().replace(".", ",")
              + (b.lage.f1_bereich
                 ? " aus dem tabellierten Bereich " + String(b.lage.f1_bereich[0]).replace(".", ",")
                   + " bis " + String(b.lage.f1_bereich[1]).replace(".", ",")
                 : "")
            : "")
          + ", daraus θu = " + rnd(b.theta, 1) + " °C bei einer Bezugstemperatur von "
          + rnd(b.theta_bezug, 1) + " °C. Fundstelle: " + b.lage.fundstelle + ". "
          + "Zum Vergleich: die stationäre Bilanz derselben Anordnung ergibt "
          + rnd(b.theta_bilanz, 1) + " °C"
          + (b.abweichung_auffaellig
            ? "; der Unterschied von " + rnd(Math.abs(b.abweichung), 1) + " K ist "
              + "erheblich und wurde geprüft."
            : ".")
          + (b.lage.stufe === "eine_quelle"
            ? " Der Zahlenwert ist über eine Sekundärquelle belegt, der Normtext lag "
              + "nicht vor."
            : "")
          + (b.lage.stufe === "erfahrung"
            ? " Der Zahlenwert ist ein Erfahrungswert und keiner Norm entnommen."
            : ""),
      });
    });
  }
  if (lueftungMassgebend) {
    h.push({
      bereich: "zonen",
      text: "Abweichend vom Normweg ist in dieser Berechnung der Luftwechsel der "
        + "unbeheizten Bereiche in die Bilanz eingerechnet. Das geht über den Normweg "
        + "dieser Berechnung hinaus. Der angesetzte Luftwechsel "
        + "ist eine Eingabe dieser Berechnung und keiner Norm entnommen.",
    });
  }
  if (hatErdreich(p)) {
    h.push({
      bereich: "erdreich",
      text: "Erdberührte Bauteile rechnen nach H_T,ig = Σ(A · U_equiv) · f_θann · f_GW · f_ig. "
        + "Es gilt für DIN EN 12831-1:2017-09 zusammen mit dem nationalen Anhang "
        + "DIN/TS 12831-1:2020-04. Der Faktor für die Jahresschwankung der "
        + "Außentemperatur f_θann, der das im Frühjahr abgekühlte Erdreich erfasst, "
        + "ist in Deutschland fest auf 1,45 gesetzt. Er hieß in DIN EN 12831:2003-08 "
        + "f_g1; Zahlenwert und Aufbau der Gleichung sind gleich geblieben, gewechselt "
        + "haben die Bezeichnungen. f_GW, früher G_w, beträgt 1,00 und 1,15, wenn Grundwasser bis 1 m "
        + "unter der Bodenplatte ansteht. f_ig, früher f_g2, ist der "
        + "Temperaturanpassungsfaktor an das Erdreich mit der Jahresmitteltemperatur "
        + "θe,m als Bezugstemperatur. Geändert hat sich gegenüber der Fassung 2003 "
        + "allein die Herleitung des äquivalenten Wärmedurchgangskoeffizienten U_equiv.",
    });
    h.push({
      bereich: "erdreich",
      text: "Vereinfachung: U_equiv wird hier nicht aus dem charakteristischen "
        + "Bodenplattenmaß B' hergeleitet, sondern ist eine Eingabe. Grund ist, dass "
        + "diese Berechnung erdberührte Bauteile aus Bestandsunterlagen übernimmt, in "
        + "denen der erdberührte Umfang der Bodenplatte und die Einbindetiefe meist nicht "
        + "belegt sind. Die eingesetzten Werte sind deshalb als äquivalente U-Werte zu "
        + "verstehen und in der Quellenübersicht mit ihrer Herkunft geführt.",
      /* Druckfähiger Wortlaut für die Berichtsfassung an den Auftraggeber:
       * gleicher methodischer Inhalt, ohne Aussagen zur Beleglage und ohne
       * Verweis auf die Quellenübersicht, die es im Ausdruck nicht gibt. */
      text_druck: "Vereinfachung: U_equiv wird hier nicht aus dem charakteristischen "
        + "Bodenplattenmaß B' hergeleitet, sondern ist eine Eingabe dieser Berechnung. "
        + "Die eingesetzten Werte sind als äquivalente U-Werte zu verstehen.",
    });
  }
  return h;
}

function hatErdreich(p) {
  return (p.raeume || []).some(function (r) {
    return (r.bauteile || []).some(function (b) {
      return (b.grenzt_an && b.grenzt_an.typ) === "erdreich";
    });
  });
}

/* ---------------------------------------------------------------------------
 * 8  SELBSTTEST
 * ------------------------------------------------------------------------ */
function selbsttestNorm() {
  const f = [];
  function pruefe(name, ist, soll, tol) {
    const t = tol === undefined ? 0.5 : tol;
    if (Math.abs(ist - soll) > t) {
      f.push(name + ": ist " + rnd(ist, 3) + ", soll " + rnd(soll, 3) + " (Toleranz " + t + ")");
    }
  }

  // --- T1  U-Wert nach ISO 6946 -----------------------------------------
  // Zweischalig 11,5 Vollziegel + 6 cm WLG 035 + 11,5 Vormauer, Innenputz 1,5 cm
  const u1 = uWertAusSchichten([
    { d: 0.015, lambda: 0.70 }, { d: 0.115, lambda: 0.81 },
    { d: 0.060, lambda: 0.035 }, { d: 0.115, lambda: 0.96 },
  ], 0.13, 0.04, 0.01);
  pruefe("T1 U-Wert Kerndämmung", u1.u, 0.47, 0.01);

  // --- T2  Ein Raum, ein Bauteil, reine Transmission ---------------------
  const p2 = {
    klima: { theta_e: -10, theta_e_m: 10 },
    norm: { delta_u_wb: 0 },
    luftdichtheit: { n50: 0 },
    raeume: [{
      id: "r1", name: "Prüfraum", art: "wohnen", theta_i: 20, A: 10, h: 2.5,
      n_min: 0, n_exponiert: 1,
      bauteile: [{ name: "Außenwand", A: 10, U: 1.0, grenzt_an: { typ: "aussen" } }],
    }],
  };
  const r2 = rechne(p2);
  // Phi = 10 m2 * 1,0 W/m2K * 30 K = 300 W
  pruefe("T2 Transmission", r2.raeume[0].phi_T_huelle, 300, 0.01);
  pruefe("T2 Lüftung null", r2.raeume[0].phi_V, 0, 0.01);
  pruefe("T2 H_T", r2.H_T, 10, 0.01);

  // --- T3  Wärmebrückenzuschlag nur auf Hüllbauteile ------------------
  const p3 = JSON.parse(JSON.stringify(p2));
  p3.norm.delta_u_wb = 0.10;
  p3.raeume[0].bauteile.push({
    name: "Innenwand", A: 5, U: 1.0, grenzt_an: { typ: "fest", theta: 15 }, kat: "innen",
  });
  const r3 = rechne(p3);
  // Hülle: 10 * 1,10 * 30 = 330 W ; Innen: 5 * 1,00 * 5 = 25 W (ohne Zuschlag)
  pruefe("T3 Hülle mit Zuschlag", r3.raeume[0].phi_T_huelle, 330, 0.01);
  pruefe("T3 Innen ohne Zuschlag", r3.raeume[0].phi_T_innen, 25, 0.01);
  pruefe("T3 Gebäudeanteil ohne Innen", r3.raeume[0].phi_gebaeude, 330, 0.01);
  pruefe("T3 Raumheizlast mit Innen", r3.raeume[0].phi_raum, 355, 0.01);

  // --- T4  Lüftung: Maximum aus Infiltration und Mindestluftwechsel -----
  const p4 = JSON.parse(JSON.stringify(p2));
  p4.luftdichtheit.n50 = 4.0;
  p4.raeume[0].n_min = 0.5;
  p4.raeume[0].n_exponiert = 2;      // e = 0,03
  const r4 = rechne(p4);
  const V4 = 25;                      // 10 m2 * 2,5 m
  const vinf = 2 * V4 * 4.0 * 0.03 * 1.0;   // 6,0 m3/h
  const vmin = 0.5 * V4;                    // 12,5 m3/h  -> massgebend
  pruefe("T4 v_inf", r4.raeume[0].v_inf, vinf, 0.001);
  pruefe("T4 v_min", r4.raeume[0].v_min, vmin, 0.001);
  pruefe("T4 v_dot", r4.raeume[0].v_dot, vmin, 0.001);
  pruefe("T4 Phi_V", r4.raeume[0].phi_V, 0.34 * vmin * 30, 0.01);
  if (r4.raeume[0].massgebend !== "Mindestluftwechsel") {
    f.push("T4 massgebend: ist " + r4.raeume[0].massgebend + ", soll Mindestluftwechsel");
  }

  // --- T5  Unbeheizte Zone, stationäre Bilanz ---------------------------
  // Raum 20 C ueber Decke A=10, U=0,5 an Keller; Keller gegen aussen A=10, U=1,0
  // theta_k = (5*20 + 10*(-10)) / (5+10) = 0/15 = 0,0 C
  const p5 = {
    klima: { theta_e: -10, theta_e_m: 10 },
    norm: { delta_u_wb: 0 },
    luftdichtheit: { n50: 0 },
    zonen: [{
      id: "keller", name: "Keller", modus: "bilanz",
      huelle: [{ name: "Kellerwand", A: 10, U: 1.0, grenzt_an: { typ: "aussen" } }],
    }],
    raeume: [{
      id: "r1", name: "EG", art: "wohnen", theta_i: 20, A: 10, h: 2.5, n_min: 0, n_exponiert: 0,
      bauteile: [{ name: "Kellerdecke", A: 10, U: 0.5, grenzt_an: { typ: "zone", ref: "keller" } }],
    }],
  };
  const r5 = rechne(p5);
  pruefe("T5 Zonentemperatur", r5.zonen.keller, 0.0, 0.001);
  // Phi = 10 * 0,5 * (20 - 0) = 100 W
  pruefe("T5 Transmission gegen Zone", r5.raeume[0].phi_T_huelle, 100, 0.01);

  // --- T6  Erdreich nach f_theta_ann / f_ig / f_GW ------------------------
  // A=20, U_equiv=0,3, theta_i=20, theta_e=-10, theta_e,m=10
  // f_ig = (20-10)/(20-(-10)) = 0,3333 ; H = 1,45*0,3333*20*0,3*1,0 = 2,90 W/K
  // Phi = 2,90 * 30 = 87,0 W
  const p6 = {
    klima: { theta_e: -10, theta_e_m: 10 },
    norm: { delta_u_wb: 0.10 },
    luftdichtheit: { n50: 0 },
    raeume: [{
      id: "r1", name: "Kellerraum beheizt", art: "wohnen", theta_i: 20, A: 20, h: 2.5,
      n_min: 0, n_exponiert: 0,
      bauteile: [{ name: "Bodenplatte", A: 20, U: 0.3, grenzt_an: { typ: "erdreich" } }],
    }],
  };
  const r6 = rechne(p6);
  pruefe("T6 f_ig", r6.raeume[0].bauteile[0].f_ig, 1 / 3, 0.0001);
  pruefe("T6 Altname f_g2 bleibt lesbar", r6.raeume[0].bauteile[0].f_g2, 1 / 3, 0.0001);
  pruefe("T6 H erdberührt", r6.raeume[0].bauteile[0].H, 2.90, 0.001);
  pruefe("T6 Phi erdberührt", r6.raeume[0].phi_T_huelle, 87.0, 0.01);

  // --- T6b  Raum ohne Huellbauteil: Warnung, ausser der Aufrufer
  //          bestaetigt die innenliegende Lage ---------------------------
  // Ein Kern, der nichts sagt, ist gefaehrlicher als einer, der zu viel
  // sagt. Deshalb wird HIER festgenagelt, dass die Warnung im Regelfall
  // steht und NUR bei ausdruecklichem Kennzeichen entfaellt.
  const p6b = {
    klima: { theta_e: -10, theta_e_m: 10 },
    norm: { delta_u_wb: 0 }, luftdichtheit: { n50: 0 },
    raeume: [{ id: "r1", name: "Flur", art: "flur", theta_i: 20, A: 6, h: 2.5,
      n_min: 0.5, n_exponiert: 0, bauteile: [] }],
  };
  const r6b = rechne(p6b);
  if (!r6b.warnungen.some(function (w) { return /kein einziges Hüllbauteil/.test(w); })) {
    f.push("T6b ein Raum ohne Huellbauteil muss gemeldet werden");
  }
  const p6c = JSON.parse(JSON.stringify(p6b));
  p6c.raeume[0].innenliegend = true;
  const r6c = rechne(p6c);
  if (r6c.warnungen.some(function (w) { return /kein einziges Hüllbauteil/.test(w); })) {
    f.push("T6c mit bestaetigter innenliegender Lage entfaellt die Warnung");
  }
  pruefe("T6c die Rechnung selbst bleibt unveraendert",
    r6c.raeume[0].phi_raum, r6b.raeume[0].phi_raum, 0.0001);

  // --- T7  Aufheizleistung ----------------------------------------------
  const p7 = JSON.parse(JSON.stringify(p2));
  p7.raeume[0].f_RH = 11;   // W/m2
  const r7 = rechne(p7);
  pruefe("T7 Phi_RH", r7.raeume[0].phi_RH, 110, 0.01);
  pruefe("T7 Raumheizlast mit Aufheizung", r7.raeume[0].phi_raum, 410, 0.01);

  // --- T8  Zone an Zone (Iteration muss konvergieren) --------------------
  const p8 = {
    klima: { theta_e: -10, theta_e_m: 10 },
    norm: { delta_u_wb: 0 }, luftdichtheit: { n50: 0 },
    zonen: [
      { id: "a", name: "Zone A", modus: "bilanz",
        huelle: [{ name: "an B", A: 10, U: 1.0, grenzt_an: { typ: "zone", ref: "b" } }] },
      { id: "b", name: "Zone B", modus: "bilanz",
        huelle: [{ name: "aussen", A: 10, U: 1.0, grenzt_an: { typ: "aussen" } },
                 { name: "an A", A: 10, U: 1.0, grenzt_an: { typ: "zone", ref: "a" } }] },
    ],
    raeume: [{
      id: "r1", name: "Raum", art: "wohnen", theta_i: 20, A: 10, h: 2.5, n_min: 0, n_exponiert: 0,
      bauteile: [{ name: "an A", A: 10, U: 1.0, grenzt_an: { typ: "zone", ref: "a" } }],
    }],
  };
  const r8 = rechne(p8);
  // A: (10*20 + 10*tB)/20 ; B: (10*(-10) + 10*tA)/20  -> tA = 10, tB = 0
  pruefe("T8 Zone A", r8.zonen.a, 10.0, 0.01);
  pruefe("T8 Zone B", r8.zonen.b, 0.0, 0.01);
  if (r8.zonen_iterationen >= 100) f.push("T8 Iteration nicht konvergiert");

  // --- T9  Fehlende Klimadaten werden gemeldet ---------------------------
  const r9 = rechne({ raeume: [{ id: "x", name: "x", A: 1, h: 1, bauteile: [] }] });
  if (!r9.warnungen.some(function (w) { return w.indexOf("theta_e") >= 0; })) {
    f.push("T9 fehlendes theta_e wird nicht gemeldet");
  }

  // --- T10  Raum ohne Wohneinheit wird gemeldet --------------------------
  if (!r2.warnungen.some(function (w) { return w.indexOf("Nutzungseinheit") >= 0; })) {
    f.push("T10 fehlende Wohneinheit wird nicht gemeldet");
  }

  // --- T11  Bezugsflächen und die Probe gegen den Maßstabsfehler ---------
  const p11 = JSON.parse(JSON.stringify(p2));
  p11.meta = { wohnflaeche: 8 };            // Raumfläche ist 10 m²
  p11.raeume[0].n_min = 0;
  const r11 = rechne(p11);
  pruefe("T11 spezifisch auf Raumfläche", r11.spez_raumflaeche, 30, 0.01);
  pruefe("T11 spezifisch auf Wohnfläche", r11.spez_wohnflaeche, 37.5, 0.01);
  if (r11.warnungen.some(function (w) { return w.indexOf("Wohnfläche") >= 0; })) {
    f.push("T11 25 Prozent Abweichung darf noch nicht warnen");
  }
  const p12 = JSON.parse(JSON.stringify(p11));
  p12.meta.wohnflaeche = 4;                  // Raumfläche 150 Prozent darüber
  if (!rechne(p12).warnungen.some(function (w) { return w.indexOf("Wohnfläche") >= 0; })) {
    f.push("T12 grobe Abweichung zur Wohnfläche wird nicht gemeldet");
  }
  const p13 = JSON.parse(JSON.stringify(p11));
  p13.meta.wohnflaeche = 20;                 // Raumfläche nur halb so groß
  if (!rechne(p13).warnungen.some(function (w) { return w.indexOf("Wohnfläche") >= 0; })) {
    f.push("T13 zu kleine Raumflächen werden nicht gemeldet");
  }
  const r14 = rechne(p2);
  if (r14.spez_wohnflaeche !== null) f.push("T14 ohne Wohnfläche muss der Bezug null sein");

  /* --- T15  Mindesttemperatur theta_u,min, DIN/TS 12831-1 Tabelle 6 -------
     Zone aus T5 kommt auf 0,0 Grad C. Mit Frostschutz ohne bekannte
     Mindesttemperatur hebt Tabelle 6 sie auf 5,0 Grad C an. */
  const p15 = JSON.parse(JSON.stringify(p5));
  p15.zonen[0].frostschutz = true;
  const r15 = rechne(p15);
  pruefe("T15 Frostschutz hebt auf 5 Grad", r15.zonen.keller, 5.0, 0.001);
  pruefe("T15 Wärmestrom sinkt entsprechend", r15.raeume[0].phi_T_huelle, 75, 0.01);
  const p16 = JSON.parse(JSON.stringify(p5));
  p16.zonen[0].theta_u_min = 8.0;
  pruefe("T16 gesetzte Mindesttemperatur", rechne(p16).zonen.keller, 8.0, 0.001);
  // ohne Angabe bleibt es bei theta_e als Untergrenze, also unveraendert
  pruefe("T17 Vorgabe ist theta_e, Bilanz unveraendert", rechne(p5).zonen.keller, 0.0, 0.001);

  /* --- T18  Pauschalweg f_1, DIN/TS 12831-1 Tabelle 5 ---------------------
     Kaltdach: f_1 = 1,0 heisst theta_u = theta_e. Genau das kann die reine
     Transmissionsbilanz nicht liefern, weil sie von unten Waerme bekommt. */
  const p18 = JSON.parse(JSON.stringify(p5));
  p18.zonen[0].modus = "f1";
  p18.zonen[0].art = "dach_belueftet";
  const r18 = rechne(p18);
  pruefe("T18 f_1 = 1,0 ergibt theta_e", r18.zonen.keller, -10.0, 0.001);
  pruefe("T18 Wärmestrom bei theta_e", r18.raeume[0].phi_T_huelle, 150, 0.01);
  const p19 = JSON.parse(JSON.stringify(p18));
  p19.zonen[0].art = "eine_aussenwand";        // f_1 = 0,4
  // theta_u = 20 - 0,4 * 30 = 8,0 Grad C
  pruefe("T19 f_1 = 0,4 aus Tabelle 5", rechne(p19).zonen.keller, 8.0, 0.001);
  const p20 = JSON.parse(JSON.stringify(p18));
  p20.zonen[0].f1 = 0.65;                       // eigener Wert schlaegt die Tabelle
  pruefe("T20 eigenes f_1 schlägt die Tabelle", rechne(p20).zonen.keller,
    20 - 0.65 * 30, 0.001);

  /* --- T21  Lüftung der Zone: Empfindlichkeit, nicht Normweg -------------
     Zone aus T5, dazu 100 m3 mit 0,5 1/h: H_V = 0,34*0,5*100 = 17 W/K gegen
     theta_e. theta = (5*20 + 10*(-10) + 17*(-10)) / (5+10+17) = -170/32 */
  const p21 = JSON.parse(JSON.stringify(p5));
  p21.zonen[0].V = 100; p21.zonen[0].n_luft = 0.5;
  const r21 = rechne(p21);
  pruefe("T21 Normweg bleibt ohne Lüftung", r21.zonen.keller, 0.0, 0.001);
  pruefe("T21 Empfindlichkeitswert", r21.zonen_lueftung.keller, -170 / 32, 0.001);
  if (r21.zonen_lueftung_massgebend) f.push("T21 Lüftung darf nicht von selbst greifen");
  if (!r21.warnungen.some(function (w) { return w.indexOf("f_1") >= 0; })) {
    f.push("T21 grosse Lüftungswirkung muss auf den Pauschalweg f_1 verweisen");
  }
  const p22 = JSON.parse(JSON.stringify(p21));
  p22.optionen = { zonen_lueftung_massgebend: true };
  const r22 = rechne(p22);
  pruefe("T22 eingeschaltet wird die Lüftung maßgebend", r22.zonen.keller, -170 / 32, 0.001);
  if (!r22.hinweise.some(function (x) { return x.text.indexOf("hinaus") >= 0; })) {
    f.push("T22 der Weg über die Norm hinaus muss im Bericht stehen");
  }
  // ohne Volumen bleibt der Term wirkungslos, auch eingeschaltet
  const p23 = JSON.parse(JSON.stringify(p5));
  p23.optionen = { zonen_lueftung_massgebend: true };
  pruefe("T23 ohne n_luft und V bleibt es beim Normweg", rechne(p23).zonen.keller, 0.0, 0.001);

  /* --- T24  Belegsaetze sind vorhanden und benennen die Fundstelle -------- */
  const h24 = rechne(p5).hinweise;
  if (!h24.some(function (x) { return x.bereich === "zonen"
      && x.text.indexOf("Luftwechselterm ist nicht") >= 0
      && x.text.indexOf("Vereinfachung") >= 0
      && x.text.indexOf("unsicheren Seite") >= 0; })) {
    f.push("T24 der fehlende Lüftungsterm muss als Vereinfachung und als Lage "
      + "auf der unsicheren Seite offengelegt sein");
  }
  const h25 = rechne(p6).hinweise.filter(function (x) { return x.bereich === "erdreich"; });
  if (h25.length < 2) f.push("T25 Erdreich braucht Verfahrens- und Vereinfachungssatz");
  if (!h25.some(function (x) { return x.text.indexOf("1,45") >= 0
      && x.text.indexOf("2017-09") >= 0; })) {
    f.push("T25 f_theta_ann 1,45 muss der Fassung 2017-09 zugeordnet sein");
  }
  if (!h25.some(function (x) { return x.text.indexOf("B'") >= 0; })) {
    f.push("T25 die Vereinfachung bei U_equiv muss benannt sein");
  }

  /* --- T26  neue und alte Faktornamen fuehren zum selben Ergebnis -------- */
  const p26a = JSON.parse(JSON.stringify(p6)); p26a.norm.f_g1 = 1.20;
  const p26b = JSON.parse(JSON.stringify(p6)); p26b.norm.f_theta_ann = 1.20;
  pruefe("T26 f_g1 und f_theta_ann gleichwertig",
    rechne(p26a).raeume[0].phi_T_huelle, rechne(p26b).raeume[0].phi_T_huelle, 0.001);
  const p26c = JSON.parse(JSON.stringify(p6)); p26c.norm.g_w = 1.15;
  const p26d = JSON.parse(JSON.stringify(p6)); p26d.norm.f_gw = 1.15;
  pruefe("T26 G_w und f_GW gleichwertig",
    rechne(p26c).raeume[0].phi_T_huelle, rechne(p26d).raeume[0].phi_T_huelle, 0.001);
  pruefe("T26 f_GW 1,15 wirkt", rechne(p26d).raeume[0].phi_T_huelle, 87.0 * 1.15, 0.01);

  /* --- T27  Temperaturniveau nach Lage vorgeben --------------------------
     Ausgangsfall ist wieder T5: die Bilanz ergibt dort 0,0 Grad C. Wird der
     Keller stattdessen als Heizungsaufstellraum gefuehrt (f_1 = 0,20 nach
     DIN/TS 12831-1 Tabelle 5), gilt theta_u = 20 - 0,2 * 30 = 14,0 Grad C.
     Der Waermestrom durch die Kellerdecke sinkt entsprechend auf
     10 * 0,5 * (20 - 14) = 30 W. */
  const p27 = JSON.parse(JSON.stringify(p5));
  p27.zonen[0].modus = "lage";
  p27.zonen[0].lage = "heizungsaufstellraum";
  const r27 = rechne(p27);
  pruefe("T27 Lage Heizungsaufstellraum", r27.zonen.keller, 14.0, 0.001);
  pruefe("T27 Wärmestrom sinkt entsprechend", r27.raeume[0].phi_T_huelle, 30.0, 0.01);

  /* Die Bilanz verschwindet nicht: sie steht als Vergleichswert daneben. */
  const b27 = r27.zonen_befund[0];
  pruefe("T27 Bilanz bleibt als Gegenprobe erhalten", b27.theta_bilanz, 0.0, 0.001);
  pruefe("T27 Vergleichslauf steht auch unter zonen_bilanz", r27.zonen_bilanz.keller, 0.0, 0.001);
  if (b27.herkunft !== "bearbeiter") f.push("T27 Herkunft muss \"bearbeiter\" sein");
  if (!b27.lage || b27.lage.id !== "heizungsaufstellraum") {
    f.push("T27 die gewählte Lage muss im Befund stehen");
  }
  if (!b27.lage || String(b27.lage.fundstelle).indexOf("Tabelle 5") < 0) {
    f.push("T27 die Fundstelle der Lage muss mitlaufen");
  }
  pruefe("T27 Abweichung von der Bilanz", b27.abweichung, 14.0, 0.001);
  if (!b27.abweichung_auffaellig) f.push("T27 14 K Abweichung müssen auffällig sein");
  if (!r27.warnungen.some(function (w) {
    return w.indexOf("stationäre Bilanz") >= 0 && w.indexOf("Schwelle") >= 0;
  })) {
    f.push("T27 grosse Abweichung braucht einen Hinweis mit benannter Schwelle");
  }
  if (!r27.hinweise.some(function (x) {
    return x.bereich === "zonen" && x.text.indexOf("vom Bearbeiter nach der Lage vorgegeben") >= 0
      && x.text.indexOf("Tabelle 5") >= 0 && x.text.indexOf("Zum Vergleich") >= 0;
  })) {
    f.push("T27 der Bericht braucht Herkunft, Fundstelle und Vergleichswert");
  }

  /* --- T28  kleine Abweichung bekommt keinen Hinweis ---------------------
     Kellerraum mit Fenstern, f_1 = 0,5, also theta_u = 5,0 Grad C. Die Bilanz
     liegt bei 0,0 Grad C, das sind 5 K und damit ueber der Schwelle. Mit einer
     Bezugstemperatur von 26 Grad C traefe die Lage 26 - 0,5*36 = 8 Grad C und
     die Abweichung waere noch groesser; also wird stattdessen mit dem
     Heizungsaufstellraum bei einer waermeren Bilanz geprueft. */
  const p28 = JSON.parse(JSON.stringify(p5));
  p28.raeume[0].bauteile[0].U = 5.0;        // Bilanz: (50*20 + 10*(-10))/60 = 15,0
  p28.zonen[0].modus = "lage";
  p28.zonen[0].lage = "heizungsaufstellraum";   // Vorgabe 14,0 Grad C
  const r28 = rechne(p28);
  pruefe("T28 Bilanz liegt nahe an der Vorgabe", r28.zonen_befund[0].theta_bilanz, 15.0, 0.001);
  if (r28.zonen_befund[0].abweichung_auffaellig) {
    f.push("T28 1 K Abweichung darf keinen Hinweis auslösen");
  }

  /* --- T29  Spanne, eigener Faktor und unbekannte Lage ------------------- */
  const p29 = JSON.parse(JSON.stringify(p5));
  p29.zonen[0].modus = "lage";
  p29.zonen[0].lage = "dach_geschlossen_dicht";   // 0,4 bis 0,9, vorbelegt 0,9
  pruefe("T29 Spanne wird mit dem oberen Rand vorbelegt", rechne(p29).zonen.keller,
    20 - 0.9 * 30, 0.001);
  const p29b = JSON.parse(JSON.stringify(p29));
  p29b.zonen[0].f1 = 0.5;                          // innerhalb der Spanne
  pruefe("T29 eigener Faktor in der Spanne wirkt", rechne(p29b).zonen.keller,
    20 - 0.5 * 30, 0.001);
  const p29c = JSON.parse(JSON.stringify(p29));
  p29c.zonen[0].f1 = 0.1;                          // unter der Spanne
  pruefe("T29 unter der Spanne wird begrenzt", rechne(p29c).zonen.keller,
    20 - 0.4 * 30, 0.001);
  const p29d = JSON.parse(JSON.stringify(p5));
  p29d.zonen[0].modus = "lage";
  p29d.zonen[0].lage = "gibt_es_nicht";
  const r29d = rechne(p29d);
  pruefe("T29 unbekannte Lage fällt auf die Bilanz zurück", r29d.zonen.keller, 0.0, 0.001);
  if (!r29d.warnungen.some(function (w) { return w.indexOf("nicht kennt") >= 0; })) {
    f.push("T29 unbekannte Lage muss gemeldet werden, statt einen Wert zu raten");
  }

  /* --- T30  Lage mit unmittelbarer Temperatur nach Tabelle 4 ------------- */
  const p30 = JSON.parse(JSON.stringify(p5));
  p30.zonen[0].modus = "lage";
  p30.zonen[0].lage = "nachbar_1980_1995";
  const r30 = rechne(p30);
  pruefe("T30 Nachbarbereich 1980 bis 1995", r30.zonen.keller, 14.0, 0.001);
  if (r30.zonen_befund[0].lage.f1 !== null) {
    f.push("T30 eine unmittelbare Temperatur darf kein f_1 vortäuschen");
  }

  /* --- T31  ohne Vorgabe bleibt alles wie bisher ------------------------- */
  const r31 = rechne(p5);
  if (r31.zonen_befund[0].herkunft !== "bilanz") f.push("T31 Herkunft muss \"bilanz\" sein");
  pruefe("T31 Vergleichswert gleich der Bilanz", r31.zonen_befund[0].theta_bilanz, 0.0, 0.001);
  if (r31.zonen_befund[0].abweichung !== null) {
    f.push("T31 ohne Vorgabe gibt es keine Abweichung");
  }
  if (r31.zonen_befund[0].lage !== null) f.push("T31 ohne Auswahl gibt es keine Lage");

  /* --- T32  Unbeheizter Bereich ohne eigene Huellbauteile ---------------
     GEMESSEN an einem echten Projekt: Kellerdecke und oberste Geschossdecke
     mit zusammen 118,1 m2 standen mit 0 W in der Rechnung, weil sich die
     Zone allein aus den angrenzenden beheizten Raeumen auf deren 20,0 Grad
     bilanzierte. Die Ergebnisseite meldete dazu "Keine Auffaelligkeiten". */
  const pOhne = {
    meta: {}, klima: { theta_e: -10, theta_e_m: 9.5 }, norm: { delta_u_wb: 0.10 },
    optionen: {}, raumarten: { wohnen: { theta_i: 20, n_min: 0.5 } },
    zonen: [{ id: "keller", name: "Unbeheizter Keller", modus: "bilanz", huelle: [] }],
    raeume: [{ id: "r1", name: "Wohnen", art: "wohnen", A: 59, h: 2.5, geschoss: "EG",
               we: "WE 1", bauteile: [{ name: "Kellerdecke", A: 59, U: 1.0, kat: "huelle",
                 grenzt_an: { typ: "zone", ref: "keller" } }] }],
  };
  const eOhne = rechne(pOhne);
  const btOhne = eOhne.raeume[0].bauteile[0];
  if (!(btOhne.phi > 0)) {
    f.push("T32 Zone ohne Huelle: die Kellerdecke traegt " + rnd(btOhne.phi, 1)
      + " W, also weiter nichts");
  }
  pruefe("T32 Temperatur der Zone ohne Huelle", eOhne.zonen.keller, -10, 0.01);
  if (!(eOhne.warnungen || []).some(function (w) {
    return /kein einziges eigenes H(ü|ue)llbauteil/.test(w);
  })) {
    f.push("T32 Zone ohne Huelle wird nicht gemeldet: "
      + JSON.stringify(eOhne.warnungen));
  }
  /* Mit Lage entsteht ein plausibler Wert statt der oberen Schranke, und der
     irrefuehrende Vergleich mit der nicht vorhandenen Bilanz unterbleibt. */
  const pLage = JSON.parse(JSON.stringify(pOhne));
  pLage.zonen[0].modus = "lage";
  pLage.zonen[0].lage = "keller_mit_oeffnung";
  const eLage = rechne(pLage);
  pruefe("T32 Keller mit Lage keller_mit_oeffnung", eLage.zonen.keller, 5.0, 0.3);
  if ((eLage.warnungen || []).some(function (w) { return /K Unterschied/.test(w); })) {
    f.push("T32 ohne Huelle darf die Vorgabe nicht gegen eine Scheinbilanz gehalten "
      + "werden: " + JSON.stringify(eLage.warnungen));
  }
  /* Eine Zone MIT Huelle wird weiterhin bilanziert und weiterhin verglichen. */
  const pMit = JSON.parse(JSON.stringify(pLage));
  pMit.zonen[0].huelle = [{ name: "Kelleraussenwand", A: 60, U: 1.5,
                            grenzt_an: { typ: "erdreich" } }];
  const eMit = rechne(pMit);
  if (!(eMit.warnungen || []).some(function (w) { return /K Unterschied/.test(w); })) {
    f.push("T32 mit Huelle muss der Vergleich mit der Bilanz erhalten bleiben");
  }
  /* Zahlen in Warnungen gehoeren mit Komma geschrieben. */
  if ((eOhne.warnungen || []).some(function (w) { return /\d\.\d+ (°C|K|m²)/.test(w); })) {
    f.push("T32 in den Warnungen steht ein Dezimalpunkt statt eines Kommas");
  }

  return { ok: f.length === 0, fehler: f, anzahl: 31 + 6 };
}

/* ---------------------------------------------------------------------------
 * 9  EXPORT
 * ------------------------------------------------------------------------ */
const KERN_HEIZLAST_NORM = {
  NORM: NORM, KATEGORIEN: KATEGORIEN, KLIMA_RUECKFALL: KLIMA_RUECKFALL,
  rechne: rechne, selbsttest: selbsttestNorm,
  uWertAusSchichten: uWertAusSchichten, eFaktor: eFaktor,
  raumTemperatur: raumTemperatur, zonenTemperaturen: zonenTemperaturen,
  version: "1.0.0-RC1",
};

if (typeof module !== "undefined" && module.exports) module.exports = KERN_HEIZLAST_NORM;
if (typeof window !== "undefined") window.KERN_HEIZLAST_NORM = KERN_HEIZLAST_NORM;

/* Aufruf von der Kommandozeile:
 *     node src/kerne/kern_heizlast_norm.js selbsttest
 * Dieser Befehl steht seit dem 26.08.2026 in README.md und lief bis zum
 * 27.08.2026 STILL INS LEERE: die Datei hatte keinen Einstieg, gab nichts aus
 * und endete mit Rueckgabewert 0. Wer die Befehlstabelle abarbeitete, hielt
 * einen Leerlauf fuer eine bestandene Pruefung. */
if (typeof require !== "undefined" && typeof module !== "undefined"
    && require.main === module) {
  const _r = selbsttestNorm();
  console.log(JSON.stringify(_r));
  if (typeof process !== "undefined") process.exit(_r.ok ? 0 : 1);
}
