/* ===========================================================================
 * daten_beg_anforderungen.js — Soll-U-Werte für die Spalte „BEG EM Anforderung"
 * ===========================================================================
 * Grundlage des Bauteilkapitels im Heizlastbericht.
 *
 * WOHER DIE WERTE STAMMEN
 * Alle Zeilen unten sind am Wortlaut der geltenden Fassung abgeschrieben,
 * nicht aus dem Gedächtnis und nicht aus einem Referenzbericht:
 *
 *   Förderrichtlinie für die Bundesförderung für effiziente Gebäude
 *   – Einzelmaßnahmen (BEG EM) vom 17. Juli 2026, Anlage „Technische
 *   Mindestanforderungen zum Förderprogramm Bundesförderung für effiziente
 *   Gebäude – Einzelmaßnahmen (BEG EM TMA)", Nummer 1.1 „Dämmung der
 *   Gebäudehülle, Sanierung von Fenstern, Türen und Vorhangfassaden",
 *   Tabelle der Höchstwerte.
 *
 * WELCHE FASSUNG GILT
 * Diese Förderrichtlinie tritt laut ihrer Nummer 10 am 21. Juli 2026 in Kraft,
 * endet mit Ablauf des 31. Dezember 2030 und ersetzt die Richtlinie BEG EM vom
 * 21. Dezember 2023 (BAnz AT 29.12.2023 B1). Für Anträge, die vor dem
 * Inkrafttreten gestellt wurden, gilt die ersetzte Fassung weiter.
 * Der Wortlaut wurde der Veröffentlichung des BMWE auf energiewechsel.de
 * entnommen (Datei 20260720-beg-einzelmassnahmen.pdf). Eine Fundstelle im
 * Bundesanzeiger trägt diese Fassung noch nicht: im Dokument selbst steht an
 * der betreffenden Stelle „BAnz AT XX.XX.XXXX B1". Deshalb nennt der Bericht
 * die Veröffentlichung des Ministeriums und nicht eine BAnz-Nummer, die es
 * noch nicht gibt. Sobald sie erscheint, gehört sie in FASSUNG.banz.
 *
 * ZWEI SPALTEN, EINE DAVON WIRD ANGEWENDET
 * Die Tabelle der TMA hat zwei Wertespalten. Angewendet wird hier die erste
 * („Wohngebäude und Zonen von Nichtwohngebäuden T >= 19 °C"). Die zweite
 * („Zonen von Nichtwohngebäuden mit 12 °C < T < 19 °C") steht als
 * u_max_nwg_teil daneben, damit der Wert nachlesbar ist, ohne dass ihn ein
 * Wohngebäudebericht stillschweigend verwendet.
 *
 * BEDINGT GELTENDE ZEILEN
 * Etliche Zeilen der Tabelle gelten nur unter einer Voraussetzung, die dieses
 * Werkzeug nicht prüfen kann: Denkmaleigenschaft, besonders erhaltenswerte
 * Bausubstanz, Sichtfachwerk, Sonderverglasung, Nichtwohngebäude. Sie tragen
 * bedingt: true, haben KEIN Erkennungsmuster und werden deshalb nie über den
 * Bauteilnamen zugeordnet. Der Bericht nennt sie über ausnahmenZu() als
 * mögliche Ausnahme mitsamt ihrer Voraussetzung. Eine Zahl ohne ihre Bedingung
 * wäre schlechter als keine Zahl.
 *
 * NACHFÜHREN bei jeder BEG-Änderung: FASSUNG anpassen, die Werte gegen den
 * neuen Wortlaut stellen, danach `python3 build.py`. Fußnote und Fassungsdatum
 * im Bericht ziehen aus FASSUNG, es gibt keine zweite Stelle.
 * =========================================================================== */

"use strict";

/* --- Fassung, die diesen Sätzen zugrunde liegt --------------------------- */
const FASSUNG = {
  datum: "17.07.2026",
  in_kraft: "21.07.2026",
  bis: "31.12.2030",
  richtlinie: "Förderrichtlinie BEG Einzelmaßnahmen (BEG EM)",
  anlage: "Anlage Technische Mindestanforderungen (BEG EM TMA), Nummer 1.1",
  spalte: "Wohngebäude und Zonen von Nichtwohngebäuden mit T ≥ 19 °C",
  spalte_zwei: "Zonen von Nichtwohngebäuden mit 12 °C < T < 19 °C",
  veroeffentlichung: "Veröffentlichung des BMWE auf energiewechsel.de, "
    + "Datei 20260720-beg-einzelmassnahmen.pdf",
  banz: null,
  ersetzt: "Richtlinie BEG EM vom 21.12.2023 (BAnz AT 29.12.2023 B1)",
  geprueft_am: "21.08.2026",
};

/** Fundstelle einer einzelnen Zeile, aus Fassung, Anlage, Bauteilgruppe und
 *  dem Zeilentext der Tabelle zusammengesetzt. So steht die Fundstelle nur an
 *  einer Stelle und kann beim Fassungswechsel nicht auseinanderlaufen. */
function fundstelleBeg(a) {
  if (!a || !a.gruppe || !a.zeile) return null;
  return FASSUNG.richtlinie + " vom " + FASSUNG.datum + ", " + FASSUNG.anlage
    + ", Bauteilgruppe " + a.gruppe + ", Zeile „" + a.zeile + "“";
}

/** Fußnotentext für das Bauteilkapitel. Nennt Fassung, Inkrafttreten, die
 *  angewendete Spalte und den Umstand, dass eine BAnz-Fundstelle für diese
 *  Fassung noch nicht vorliegt. */
function fussnote() {
  return "Anforderungen nach " + FASSUNG.richtlinie + " vom " + FASSUNG.datum
    + ", " + FASSUNG.anlage + ", Spalte " + FASSUNG.spalte + ". Diese Fassung "
    + "gilt seit " + FASSUNG.in_kraft + " und ersetzt die " + FASSUNG.ersetzt
    + "; für Anträge, die vor diesem Tag gestellt wurden, gilt die ersetzte "
    + "Fassung weiter. Die Werte gelten für die Erneuerung, den Ersatz oder "
    + "den erstmaligen Einbau von Bauteilen im Bestand, nicht für den Neubau. "
    + "Für Baudenkmale, für sonstige besonders erhaltenswerte Bausubstanz und "
    + "für einzelne Bauarten führt dieselbe Tabelle eigene Zeilen mit anderen "
    + "Werten; sie sind hier nicht angewendet, weil ihre Voraussetzungen dem "
    + "Werkzeug nicht vorliegen. "
    + (FASSUNG.banz
      ? "Fundstelle: " + FASSUNG.banz + "."
      : "Der Wortlaut stammt aus der " + FASSUNG.veroeffentlichung
        + "; eine Fundstelle im Bundesanzeiger trägt diese Fassung noch nicht, "
        + "im Dokument selbst ist die Stelle unausgefüllt geblieben. Deshalb "
        + "wird sie hier nicht genannt.");
}

/* --- Anforderungen je Bauteilart ----------------------------------------
 * gruppe  Bauteilgruppe der TMA-Tabelle, wörtlich.
 * zeile   Zeilentext der TMA-Tabelle, wörtlich. Beides zusammen ergibt die
 *         Fundstelle, siehe fundstelleBeg().
 * u_max   Höchstwert der ersten Spalte in W/(m²·K) oder null.
 * u_max_nwg_teil  Höchstwert der zweiten Spalte, nur nachrichtlich.
 * lambda_max, lambda_max_nwg_teil  für die Zeilen, die die TMA nicht über den
 *         U-Wert, sondern über die Wärmeleitfähigkeit des Dämmstoffs regelt.
 * bedingung  Voraussetzung, unter der die Zeile gilt. Gehört überall dorthin,
 *         wo die Zahl steht.
 * bedingt true  Zeile gilt nur unter einer Voraussetzung, die dieses Werkzeug
 *         nicht prüfen kann. Kein Muster, keine Namenszuordnung.
 * statt   Bei bedingten Zeilen: die ids, an deren Stelle die Zeile tritt.
 * muster  Erkennung aus dem Bauteilnamen. Die Reihenfolge dieses Feldes ist
 *         die Prüfreihenfolge: das erste passende Muster gewinnt. Deshalb
 *         steht „Kerndämmung" vor „Außenwand", „Dachflächenfenster" vor
 *         „Fenster" und „oberste Geschossdecke" vor „Dach".
 */
const WG = "Wohngebäude, kein Baudenkmal, keine besonders erhaltenswerte "
  + "Bausubstanz; Einzelmaßnahme im Bestand";
const GR_WAND = "Außenwände";
const GR_FENSTER = "Fenster, Fenstertüren, Dachflächenfenster, Glasdächer, "
  + "Außentüren und Vorhangfassaden sowie Tore bei Nichtwohngebäuden";
const GR_DACH = "Dachflächen sowie Decken und Wände gegen unbeheizte Räume, "
  + "Bodenflächen";

const ANFORDERUNGEN = [
  /* --- Bauteilgruppe Außenwände ---------------------------------------- */
  {
    id: "kerndaemmung",
    label: "Kerndämmung zweischaliges Mauerwerk",
    gruppe: GR_WAND,
    zeile: "Einblasdämmung/Kerndämmung bei bestehendem zweischaligem Mauerwerk",
    u_max: null, u_max_nwg_teil: null,
    lambda_max: 0.035, lambda_max_nwg_teil: 0.040,
    text: "Kerndämmung: nur λ ≤ 0,035",
    bedingung: "Nur bei bestehendem zweischaligem Mauerwerk. Gefordert ist "
      + "kein U-Wert, sondern die Wärmeleitfähigkeit des Dämmstoffs.",
    muster: "Kerndämmung|kerngedämmt|Hohlschicht|Einblasdämmung",
  },
  {
    id: "aussenwand",
    label: "Außenwand gegen Außenluft",
    gruppe: GR_WAND,
    zeile: "Außenwand",
    u_max: 0.20, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ". Gilt nur für wärmeübertragende Umfassungsflächen.",
    muster: "^Außenwand|Drempelwand|Giebelwand|Außenwanddämmung",
  },
  {
    id: "aussenwand_denkmal",
    label: "Außenwand bei Baudenkmal oder erhaltenswerter Bausubstanz",
    gruppe: GR_WAND,
    zeile: "Außenwände bei Baudenkmalen für alle Gebäude und bei sonstiger "
      + "besonders erhaltenswerter Bausubstanz nur für Wohngebäude",
    u_max: 0.45, u_max_nwg_teil: 0.55,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Baudenkmal im Sinne des § 105 GEG bei Wohn- und "
      + "Nichtwohngebäuden; sonstige besonders erhaltenswerte Bausubstanz nur "
      + "bei Wohngebäuden. Der Status ist mit der Denkmalbehörde zu klären.",
    bedingt: true, statt: ["aussenwand"],
  },
  {
    id: "aussenwand_sichtfachwerk",
    label: "Außenwand mit Sichtfachwerk",
    gruppe: GR_WAND,
    zeile: "Außenwände mit Sichtfachwerk (Innendämmung bei "
      + "Fachwerkaußenwänden, Erneuerung der Ausfachungen)",
    u_max: 0.65, u_max_nwg_teil: 0.80,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Nur bei Sichtfachwerk, also Innendämmung der Fachwerkaußenwand "
      + "oder Erneuerung der Ausfachungen.",
    bedingt: true, statt: ["aussenwand"],
  },

  /* --- Bauteilgruppe Fenster, Türen, Vorhangfassaden -------------------- */
  {
    id: "dachflaechenfenster",
    label: "Dachflächenfenster",
    gruppe: GR_FENSTER,
    zeile: "Dachflächenfenster",
    u_max: 1.00, u_max_nwg_teil: 1.10,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Dachflächenfenster|Dachfenster",
  },
  {
    id: "glasdach",
    label: "Glasdach",
    gruppe: GR_FENSTER,
    zeile: "Glasdächer",
    u_max: 1.60, u_max_nwg_teil: 1.90,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Glasdach",
  },
  {
    id: "lichtband",
    label: "Lichtband, Lichtkuppel",
    gruppe: GR_FENSTER,
    zeile: "Lichtbänder und Lichtkuppeln",
    u_max: 1.50, u_max_nwg_teil: 1.90,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Lichtband|Lichtkuppel",
  },
  {
    id: "vorhangfassade",
    label: "Vorhangfassade",
    gruppe: GR_FENSTER,
    zeile: "Vorhangfassaden",
    u_max: 1.30, u_max_nwg_teil: 1.60,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Bauart nach DIN EN 12631:2018-01. Der Höchstwert bezieht sich "
      + "auf den U_CW-Wert.",
    muster: "Vorhangfassade|Pfosten-Riegel",
  },
  {
    id: "fenster",
    label: "Fenster, Balkon- und Terrassentüren",
    gruppe: GR_FENSTER,
    zeile: "Fenster, Balkon- und Terrassentüren",
    u_max: 0.95, u_max_nwg_teil: 1.30,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ". Der Höchstwert bezieht sich auf den U_W-Wert, also auf "
      + "das gesamte Fenster einschließlich Rahmen.",
    muster: "Fenster|Fenstertür|Balkontür|Terrassentür",
  },
  {
    id: "fenster_ertuechtigung",
    label: "Ertüchtigung von Fenstern, Kastenfenstern, Sonderverglasung",
    gruppe: GR_FENSTER,
    zeile: "Ertüchtigung von Fenstern, Balkon- und Terrassentüren sowie von "
      + "Kastenfenstern sowie von Fenstern mit Sonderverglasung",
    u_max: 1.30, u_max_nwg_teil: 1.60,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Nur bei Ertüchtigung des vorhandenen Fensters, nicht bei "
      + "Austausch.",
    bedingt: true, statt: ["fenster"],
  },
  {
    id: "fenster_barrierearm",
    label: "Barrierearme oder einbruchhemmende Fenster",
    gruppe: GR_FENSTER,
    zeile: "Barrierearme oder einbruchhemmende Fenster, Balkon- und "
      + "Terrassentüren",
    u_max: 1.10, u_max_nwg_teil: 1.40,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Barrierearm nach den Bedienkräften der TMA oder "
      + "einbruchhemmend mindestens Widerstandsklasse RC2 nach DIN EN 1627.",
    bedingt: true, statt: ["fenster"],
  },
  {
    id: "fenster_sonderverglasung",
    label: "Fenster mit Sonderverglasung",
    gruppe: GR_FENSTER,
    zeile: "Fenster, Balkon- und Terrassentüren mit Sonderverglasung "
      + "(Verglasung zum Schall- und Brandschutz sowie Durchschuss-, "
      + "Durchbruch- und Sprengwirkungshemmung)",
    u_max: 1.10, u_max_nwg_teil: 1.40,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Nur wenn die Sonderverglasung nach Landesbauordnung oder "
      + "anderen Vorschriften für den bestimmungsgemäßen Betrieb "
      + "einzubauen ist.",
    bedingt: true, statt: ["fenster"],
  },
  {
    id: "fenster_denkmal",
    label: "Fenster bei Baudenkmal oder erhaltenswerter Bausubstanz",
    gruppe: GR_FENSTER,
    zeile: "Fenster, Balkon- und Terrassentüren bei Baudenkmalen für alle "
      + "Gebäude und bei sonstiger besonders erhaltenswerter Bausubstanz nur "
      + "für Wohngebäude",
    u_max: 1.40, u_max_nwg_teil: 1.70,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Baudenkmal im Sinne des § 105 GEG bei Wohn- und "
      + "Nichtwohngebäuden; sonstige besonders erhaltenswerte Bausubstanz nur "
      + "bei Wohngebäuden.",
    bedingt: true, statt: ["fenster"],
  },
  {
    id: "fenster_denkmal_sprossen",
    label: "Fenster mit glasteilenden Sprossen bei Baudenkmal",
    gruppe: GR_FENSTER,
    zeile: "Fenster, Balkon- und Terrassentüren mit echten glasteilenden "
      + "Sprossen bei Baudenkmalen für alle Gebäude und bei sonstiger "
      + "besonders erhaltenswerter Bausubstanz nur für Wohngebäude",
    u_max: 1.60, u_max_nwg_teil: 1.70,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Zusätzlich zum Denkmalstatus echte glasteilende Sprossen.",
    bedingt: true, statt: ["fenster"],
  },
  {
    id: "fenster_ertuechtigung_denkmal",
    label: "Ertüchtigung von Fenstern bei Baudenkmal",
    gruppe: GR_FENSTER,
    zeile: "Ertüchtigung von Fenstern, Balkon- und Terrassentüren bei "
      + "Baudenkmalen für alle Gebäude und bei sonstiger besonders "
      + "erhaltenswerter Bausubstanz nur für Wohngebäude",
    u_max: 1.60, u_max_nwg_teil: 1.90,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Ertüchtigung statt Austausch, dazu Denkmalstatus "
      + "beziehungsweise besonders erhaltenswerte Bausubstanz.",
    bedingt: true, statt: ["fenster"],
  },
  {
    id: "haustuer",
    label: "Außentür beheizter Räume, Hauseingangstür",
    gruppe: GR_FENSTER,
    zeile: "Außentüren beheizter Räume, Hauseingangstüren",
    u_max: 1.30, u_max_nwg_teil: 1.60,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ". Der Höchstwert bezieht sich auf den U_D-Wert.",
    muster: "Haustür|Hauseingangstür|Außentür",
  },
  {
    id: "tor_nwg",
    label: "Tor (nur Nichtwohngebäude)",
    gruppe: GR_FENSTER,
    zeile: "Tore (nur Nichtwohngebäude)",
    u_max: 1.00, u_max_nwg_teil: 2.00,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Nur Nichtwohngebäude.",
    bedingt: true, statt: [],
  },

  /* --- Bauteilgruppe Dachflächen, Decken, Wände, Bodenflächen ----------- */
  {
    id: "oberste_geschossdecke",
    label: "Oberste Geschossdecke und Wände gegen unbeheizte Dachräume",
    gruppe: GR_DACH,
    zeile: "Oberste Geschossdecken und Wände (einschließlich Abseitenwände) "
      + "gegen unbeheizte Dachräume",
    u_max: 0.14, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "[Oo]berste[rns]? Geschossdecke|Decke gegen Spitzboden"
      + "|Decke gegen Dachraum|Abseitenwand|Kniestockwand",
  },
  {
    id: "flachdach",
    label: "Flachdach, Dachfläche mit Abdichtung",
    gruppe: GR_DACH,
    zeile: "Flachdächer und Dachflächen mit Abdichtung",
    u_max: 0.14, u_max_nwg_teil: 0.20,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Flachdach|Dachfläche mit Abdichtung|Warmdach",
  },
  {
    id: "dachgaube",
    label: "Dachgaube",
    gruppe: GR_DACH,
    zeile: "Dachgauben",
    u_max: 0.20, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Gaube|Dachgaube",
  },
  {
    id: "dach",
    label: "Dachfläche Schrägdach und Kehlbalkenlage",
    gruppe: GR_DACH,
    zeile: "Dachflächen von Schrägdächern und dazugehörige Kehlbalkenlagen",
    u_max: 0.14, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Dachschräge|Dachfläche|Steildach|Schrägdach|Kehlbalken|^Dach\\b",
  },
  {
    id: "dach_denkmal",
    label: "Dachflächen bei Baudenkmal oder erhaltenswerter Bausubstanz",
    gruppe: GR_DACH,
    zeile: "Dachflächen bei Baudenkmalen für alle Gebäude und bei sonstiger "
      + "besonders erhaltenswerter Bausubstanz nur für Wohngebäude "
      + "höchstmögliche Dämmstoffdicke (Flachdächer, Schrägdächer sowie "
      + "dazugehörige Kehlbalkenlagen, Dachgauben oder oberste "
      + "Geschossdecken)",
    u_max: null, u_max_nwg_teil: null,
    lambda_max: 0.040, lambda_max_nwg_teil: 0.040,
    text: "höchstmögliche Dämmstoffdicke, λ ≤ 0,040",
    bedingung: "Baudenkmal im Sinne des § 105 GEG bei Wohn- und "
      + "Nichtwohngebäuden; sonstige besonders erhaltenswerte Bausubstanz nur "
      + "bei Wohngebäuden. An die Stelle des U-Werts tritt die höchstmögliche "
      + "Dämmstoffdicke. Voraussetzung ist der Status des Gebäudes, nicht sein "
      + "Baujahr und nicht die Dachform.",
    bedingt: true,
    statt: ["dach", "dachgaube", "oberste_geschossdecke", "flachdach"],
  },
  {
    id: "wand_unbeheizt",
    label: "Wand gegen Erdreich, unbeheizte Räume, Kellerräume",
    gruppe: GR_DACH,
    zeile: "Wände gegen Erdreich oder unbeheizte Räume sowie Kellerräume",
    u_max: 0.25, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Kellerwand|Kelleraußenwand|Wand gegen Erdreich"
      + "|Wand gegen unbeheizt|Wand gegen Keller",
  },
  {
    id: "kellerdecke",
    label: "Kellerdecke, Decke gegen unbeheizte Räume",
    gruppe: GR_DACH,
    zeile: "Decken gegen unbeheizte Räume sowie Kellerdecken",
    u_max: 0.25, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Kellerdecke|Decke gegen Keller|Decke gegen unbeheizt",
  },
  {
    id: "geschossdecke_aussenluft",
    label: "Geschossdecke gegen Außenluft von unten",
    gruppe: GR_DACH,
    zeile: "Geschossdecken gegen Außenluft von unten",
    u_max: 0.20, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ". Gemeint ist die von unten an Außenluft grenzende "
      + "Decke, etwa über einer Durchfahrt oder einem Erker.",
    muster: "Decke gegen Außenluft|Durchfahrt|auskragend|Erkerboden",
  },
  {
    id: "bodenplatte",
    label: "Bodenfläche gegen Erdreich",
    gruppe: GR_DACH,
    zeile: "Bodenflächen gegen Erdreich",
    u_max: 0.25, u_max_nwg_teil: 0.25,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: WG + ".",
    muster: "Bodenplatte|Sohlplatte|erdberührt|Fußboden gegen Erdreich"
      + "|Kellerboden",
  },
  {
    id: "fussboden_neu_nwg",
    label: "Neuer Fußbodenaufbau gegen Erdreich (nur Nichtwohngebäude)",
    gruppe: GR_DACH,
    zeile: "Neuer Fußbodenaufbau bei bestehenden Bodenflächen gegen Erdreich "
      + "(nur NWG)",
    u_max: 0.35, u_max_nwg_teil: 0.35,
    lambda_max: null, lambda_max_nwg_teil: null,
    bedingung: "Nur Nichtwohngebäude, nur bei neuem Fußbodenaufbau auf einer "
      + "bestehenden Bodenfläche gegen Erdreich.",
    bedingt: true, statt: ["bodenplatte"],
  },
];

/* Fundstelle je Zeile einmal berechnen und festschreiben, damit der Bericht
   sie unverändert übernehmen kann. */
ANFORDERUNGEN.forEach(function (a) {
  a.quelle = fundstelleBeg(a);
  a.belegt = true;                 /* alle Zeilen stehen im Wortlaut */
  if (a.bedingt === undefined) a.bedingt = false;
  if (a.muster === undefined) a.muster = null;
});

/* --- Zuordnung ----------------------------------------------------------- */

/** Anforderung zu einer ausdrücklich gewählten Kategorie. */
function zuKategorie(id) {
  return ANFORDERUNGEN.find(function (x) { return x.id === id; }) || null;
}

/** Bedingt geltende Zeilen, die an die Stelle einer Anforderung treten
 *  können. Das Werkzeug wendet sie nie selbst an: es kann weder den
 *  Denkmalstatus noch die Bauart prüfen. Der Bericht nennt sie samt
 *  Voraussetzung, damit die Zahl nicht ohne ihre Bedingung dasteht. */
function ausnahmenZu(id) {
  if (!id) return [];
  return ANFORDERUNGEN.filter(function (a) {
    return a.bedingt && Array.isArray(a.statt) && a.statt.indexOf(id) >= 0;
  });
}

/** Kategorie aus dem Bauteilnamen erraten. Liefert null, wenn kein Muster
 *  greift. Bedingte Zeilen haben kein Muster und können hier nicht
 *  herauskommen. Das ist eine Zuordnung, keine Zahl: sie darf danebenliegen,
 *  ohne dass ein Wert erfunden wird. Der Bericht kennzeichnet sie deshalb. */
function kategorieRaten(name) {
  const n = String(name || "");
  if (!n) return null;
  for (let i = 0; i < ANFORDERUNGEN.length; i++) {
    const m = ANFORDERUNGEN[i].muster;
    if (m && new RegExp(m).test(n)) return ANFORDERUNGEN[i];
  }
  return null;
}

/** Anforderung zu einem Bauteiltyp des Projekts.
 *  Rangfolge, absichtlich so herum:
 *    1. `t.beg_ziel`        vom Bearbeiter gesetzt, gilt immer
 *    2. `t.beg_kategorie`   vom Bearbeiter gewählte Kategorie
 *    3. Namenserkennung     Notbehelf, wird als solcher gekennzeichnet
 *  Rückgabe: {u_max, lambda_max, text, quelle, gruppe, zeile, bedingung,
 *             ausnahmen, herkunft, sicher}
 *  herkunft: "eingabe" | "kategorie" | "name" | null
 *  sicher:   false, wenn die Zuordnung nur über den Namen kam. */
function zuBauteil(t) {
  const bt = t || {};
  const leer = { id: null, u_max: null, u_max_nwg_teil: null, lambda_max: null,
                 text: null, herkunft: null, sicher: false, quelle: null,
                 label: null, hinweis: null, gruppe: null, zeile: null,
                 bedingung: null, ausnahmen: [] };
  if (bt.beg_ziel !== undefined && bt.beg_ziel !== null && bt.beg_ziel !== "") {
    const z = typeof bt.beg_ziel === "string"
      ? parseFloat(String(bt.beg_ziel).replace(",", ".")) : bt.beg_ziel;
    if (Number.isFinite(z)) {
      return Object.assign({}, leer, { u_max: z, herkunft: "eingabe",
        sicher: true, quelle: bt.beg_quelle || null,
        bedingung: bt.beg_bedingung || null });
    }
    // nicht numerisch: als Text übernehmen, z. B. eine Bedingung
    return Object.assign({}, leer, { text: String(bt.beg_ziel),
      herkunft: "eingabe", sicher: true, quelle: bt.beg_quelle || null,
      bedingung: bt.beg_bedingung || null });
  }
  let a = bt.beg_kategorie ? zuKategorie(bt.beg_kategorie) : null;
  let herkunft = a ? "kategorie" : null;
  if (!a) { a = kategorieRaten(bt.name); herkunft = a ? "name" : null; }
  if (!a) return leer;
  return {
    id: a.id, u_max: a.u_max, u_max_nwg_teil: a.u_max_nwg_teil,
    lambda_max: a.lambda_max, text: a.text || null,
    herkunft: herkunft, sicher: herkunft === "kategorie" && a.belegt,
    quelle: a.quelle, label: a.label, hinweis: a.hinweis || null,
    gruppe: a.gruppe, zeile: a.zeile, bedingung: a.bedingung || null,
    ausnahmen: ausnahmenZu(a.id),
  };
}

/** Kleinste Wärmeleitfähigkeit im Schichtaufbau eines Bauteiltyps.
 *  Das ist die Dämmschicht; alles andere leitet besser. Liefert null, wenn
 *  kein Schichtaufbau vorliegt. */
function kleinstesLambda(t, materialLambda) {
  const s = (t && t.schichten) || [];
  let min = null;
  s.forEach(function (x) {
    const lam = typeof x.lambda === "number" ? x.lambda
      : (typeof materialLambda === "function" ? materialLambda(x.mat) : null);
    if (typeof lam === "number" && lam > 0 && (min === null || lam < min)) min = lam;
  });
  return min;
}

/** Bewertung einer Bauteilzeile im Bauteilkapitel.
 *  t.massnahme:  true  Bauteil ist Teil der geplanten Maßnahme
 *                false Bauteil bleibt ausdrücklich unverändert
 *                undefined  keine Aussage getroffen
 *  Rückgabe: {text, erfuellt: true|false|null} */
function bewertung(t, uIst, anforderung, lambdaMin) {
  const a = anforderung || {};
  if (a.u_max === null && a.lambda_max === null && !a.text) {
    return { text: "Bauteil bleibt", erfuellt: null };
  }
  if (a.lambda_max !== null && a.lambda_max !== undefined) {
    if (typeof lambdaMin === "number" && lambdaMin > 0) {
      return lambdaMin <= a.lambda_max + 1e-9
        ? { text: "erfüllt", erfuellt: true }
        : { text: "NICHT erfüllt", erfuellt: false };
    }
    return { text: "über λ nachzuweisen", erfuellt: null };
  }
  if (!Number.isFinite(a.u_max)) return { text: "Bauteil bleibt", erfuellt: null };
  if (!Number.isFinite(uIst)) return { text: "U-Wert fehlt", erfuellt: null };
  if (uIst <= a.u_max + 1e-9) return { text: "erfüllt", erfuellt: true };
  if (t && t.massnahme === false) return { text: "Bauteil bleibt", erfuellt: null };
  /* Ist nicht vermerkt, ob das Bauteil angefasst wird, wird die Überschreitung
     trotzdem genannt. Der frühere Ausweichtext "nur bei Dämmung relevant" hat
     genau die Aussage verschluckt, auf die es ankommt: dass die geplante
     Dämmstärke die Anforderung verfehlt. Im Referenzbericht ist das einer der
     drei Punkte, auf die es ankommt. Der Vorbehalt gehört in den Zusatz, nicht
     an die Stelle der Aussage. */
  /* Ein Fenster und eine Haustür werden nicht dicker gedämmt, sondern getauscht.
     Der Vorbehalt muss deshalb die Bauteilart treffen, sonst steht im Bericht
     eine Handlung, die es für dieses Bauteil nicht gibt. */
  const wort = AUSTAUSCH_IDS.indexOf(a.id) >= 0 ? "erneuert" : "gedämmt";
  return t && t.massnahme === true
    ? { text: "NICHT erfüllt", erfuellt: false }
    : { text: "NICHT erfüllt", erfuellt: false,
        vorbehalt: "sofern das Bauteil im Zuge der Maßnahme " + wort + " wird" };
}

/* Bauteilarten, die man nicht dicker dämmt, sondern austauscht oder
   ertüchtigt. Steuert nur die Wortwahl im Vorbehalt. */
const AUSTAUSCH_IDS = ["fenster", "dachflaechenfenster", "glasdach", "lichtband",
  "vorhangfassade", "haustuer", "tor_nwg", "fenster_ertuechtigung",
  "fenster_barrierearm", "fenster_sonderverglasung", "fenster_denkmal",
  "fenster_denkmal_sprossen", "fenster_ertuechtigung_denkmal"];

/* --- Selbsttest ---------------------------------------------------------- */
function selbsttestBeg() {
  const f = [];

  // Eine Überschreitung muss auch dann als solche erscheinen, wenn nicht
  // vermerkt ist, ob das Bauteil angefasst wird. Genau das ging vorher unter.
  const ueber = bewertung({}, 0.29, zuKategorie("kellerdecke"));
  if (ueber.erfuellt !== false || ueber.text.indexOf("NICHT") < 0) {
    f.push("Kellerdecke 0,29 gegen 0,25 muss als nicht erfüllt erscheinen, ist: "
      + ueber.text);
  }
  if (!ueber.vorbehalt) f.push("Ohne Maßnahmenvermerk gehört ein Vorbehalt dazu");
  const ogd = bewertung({}, 0.18, zuKategorie("oberste_geschossdecke"));
  if (ogd.erfuellt !== false) f.push("Oberste Geschossdecke 0,18 gegen 0,14 verfehlt");
  const ok = bewertung({}, 0.95, zuKategorie("fenster"));
  if (ok.erfuellt !== true) f.push("Fenster 0,95 auf der Grenze ist erfüllt");

  // 1  Die Werte der Tabelle, Spalte eins, am Wortlaut abgeschrieben.
  //    Der Sperrbefund des Sachverständigen hing an genau einer davon:
  //    Außenwand 0,20. Sie steht deshalb hier zuerst.
  const soll = {
    aussenwand: 0.20, aussenwand_denkmal: 0.45, aussenwand_sichtfachwerk: 0.65,
    fenster: 0.95, fenster_ertuechtigung: 1.30, fenster_barrierearm: 1.10,
    fenster_sonderverglasung: 1.10, fenster_denkmal: 1.40,
    fenster_denkmal_sprossen: 1.60, fenster_ertuechtigung_denkmal: 1.60,
    dachflaechenfenster: 1.00, glasdach: 1.60, lichtband: 1.50,
    vorhangfassade: 1.30, haustuer: 1.30, tor_nwg: 1.00,
    dach: 0.14, dachgaube: 0.20, oberste_geschossdecke: 0.14, flachdach: 0.14,
    wand_unbeheizt: 0.25, kellerdecke: 0.25, geschossdecke_aussenluft: 0.20,
    bodenplatte: 0.25, fussboden_neu_nwg: 0.35,
  };
  Object.keys(soll).forEach(function (k) {
    const a = zuKategorie(k);
    if (!a) { f.push("Kategorie fehlt: " + k); return; }
    if (!Number.isFinite(a.u_max) || Math.abs(a.u_max - soll[k]) > 1e-9) {
      f.push(k + ": u_max ist " + a.u_max + ", soll " + soll[k]);
    }
  });
  // Zweite Spalte, stichprobenweise gegen den Wortlaut
  const sollZwei = { aussenwand: 0.25, fenster: 1.30, dach: 0.25,
                     flachdach: 0.20, kellerdecke: 0.25, tor_nwg: 2.00 };
  Object.keys(sollZwei).forEach(function (k) {
    const a = zuKategorie(k);
    if (!a || Math.abs(a.u_max_nwg_teil - sollZwei[k]) > 1e-9) {
      f.push(k + ": u_max_nwg_teil ist " + (a && a.u_max_nwg_teil)
        + ", soll " + sollZwei[k]);
    }
  });
  const kd = zuKategorie("kerndaemmung");
  if (!kd || kd.u_max !== null || kd.lambda_max !== 0.035
      || kd.lambda_max_nwg_teil !== 0.040) {
    f.push("Kerndämmung: kein U-Wert, λ 0,035 bzw. 0,040 in Spalte zwei");
  }
  const dd = zuKategorie("dach_denkmal");
  if (!dd || dd.u_max !== null || dd.lambda_max !== 0.040 || !dd.bedingt) {
    f.push("Dach beim Denkmal: kein U-Wert, λ 0,040, und nur bedingt geltend");
  }

  // 2  DIE SICHERUNG GEGEN DEN SPERRBEFUND
  //    Eine Zeile, die über den Bauteilnamen zugeordnet werden kann, MUSS
  //    einen Wert tragen. Genau diese Lücke hat dazu geführt, dass vier
  //    Außenwände mit "kein Wert hinterlegt" im Bericht standen, obwohl der
  //    Wert im zitierten Wortlaut steht, und dass sie aus der nach Wirkung
  //    geordneten Liste gefallen sind.
  ANFORDERUNGEN.forEach(function (a) {
    if (!a.gruppe || !a.zeile) f.push(a.id + ": ohne Bauteilgruppe oder Zeilentext");
    if (!a.quelle) f.push(a.id + ": ohne Fundstelle");
    if (!a.bedingung) f.push(a.id + ": Wert ohne Bedingung");
    const hatWert = Number.isFinite(a.u_max) || Number.isFinite(a.lambda_max);
    if (!hatWert) f.push(a.id + ": Zeile ohne Wert");
    if (a.muster && !hatWert) {
      f.push(a.id + ": über den Namen zuzuordnen, aber ohne Wert. Genau diese "
        + "Lücke lässt ein Bauteil stillschweigend aus der Wirkungsliste fallen.");
    }
    if (a.bedingt && a.muster) {
      f.push(a.id + ": bedingt geltende Zeile darf kein Erkennungsmuster haben");
    }
    if (a.bedingt && !Array.isArray(a.statt)) {
      f.push(a.id + ": bedingte Zeile ohne Angabe, an wessen Stelle sie tritt");
    }
    if (a.quelle && a.quelle.indexOf(FASSUNG.datum) < 0) {
      f.push(a.id + ": Fundstelle nennt nicht das Fassungsdatum");
    }
  });

  // 3  Namenserkennung: die Reihenfolge muss die Sonderfälle vor die
  //    allgemeinen Fälle setzen
  const proben = [
    ["Außenwand zweischalig, 6 cm Kerndämmung WLG 035", "kerndaemmung"],
    ["Oberste Geschossdecke, 20 cm Zellulose WLG 040", "oberste_geschossdecke"],
    ["Kellerdecke, 10 cm WLG 035 unterseitig", "kellerdecke"],
    ["Haustür, Bestand", "haustuer"],
    ["Fenster und Fenstertüren, Austausch 2026", "fenster"],
    ["Dachflächenfenster Bad", "dachflaechenfenster"],
    ["Dachschräge Dachgeschoss, Bestand 1936", "dach"],
    ["Flachdach Anbau", "flachdach"],
    ["Dachgaube Straßenseite", "dachgaube"],
    ["Außenwand Giebel", "aussenwand"],
    ["Außenwand Straße", "aussenwand"],
    ["Außenwand Garten", "aussenwand"],
    ["Drempelwand", "aussenwand"],
    ["Bodenplatte gegen Erdreich", "bodenplatte"],
    ["Kellerwand gegen Erdreich", "wand_unbeheizt"],
    ["Decke gegen Außenluft über Durchfahrt", "geschossdecke_aussenluft"],
    ["Haustrennwand zu Nr. 61, Bestand", null],
    ["Innenwand gegen Treppenhaus", null],
    ["Wohnungstüren", null],
  ];
  proben.forEach(function (pr) {
    const a = kategorieRaten(pr[0]);
    const ist = a ? a.id : null;
    if (ist !== pr[1]) f.push('Namenserkennung "' + pr[0] + '": ist ' + ist + ", soll " + pr[1]);
  });
  // Keine bedingte Zeile darf über den Namen herauskommen
  ["Außenwand Fachwerk Denkmal", "Fenster Denkmal mit Sprossen", "Tor Halle"]
    .forEach(function (n) {
      const a = kategorieRaten(n);
      if (a && a.bedingt) f.push('Namenserkennung "' + n + '" liefert die bedingte Zeile ' + a.id);
    });

  // 4  Vorrang der Bearbeitereingabe vor der Namenserkennung
  const v1 = zuBauteil({ name: "Fenster", beg_ziel: 1.1 });
  if (v1.u_max !== 1.1 || v1.herkunft !== "eingabe") f.push("beg_ziel muss Vorrang haben");
  const v2 = zuBauteil({ name: "Fenster" });
  if (v2.u_max !== 0.95 || v2.herkunft !== "name" || v2.sicher !== false) {
    f.push("Namenszuordnung muss als unsicher gekennzeichnet sein");
  }
  const v3 = zuBauteil({ name: "Irgendwas Unbekanntes" });
  if (v3.u_max !== null || v3.herkunft !== null) {
    f.push("Ohne Treffer darf kein Anforderungswert entstehen");
  }
  const v4 = zuBauteil({ name: "Fenster", beg_kategorie: "kellerdecke" });
  if (v4.u_max !== 0.25 || v4.herkunft !== "kategorie" || v4.sicher !== true) {
    f.push("Ausdrücklich gewählte Kategorie muss gewinnen und als sicher gelten");
  }
  // Die Wand trägt jetzt Wert, Gruppe, Zeile, Fundstelle und Bedingung
  const vw = zuBauteil({ name: "Außenwand Giebel" });
  if (vw.u_max !== 0.20) f.push("Außenwand Giebel muss 0,20 bekommen, ist " + vw.u_max);
  if (!vw.gruppe || !vw.zeile || !vw.quelle || !vw.bedingung) {
    f.push("Außenwand Giebel ohne Gruppe, Zeile, Fundstelle oder Bedingung");
  }
  if (!vw.ausnahmen.length) f.push("Zur Außenwand gehören bedingte Ausnahmen");

  // 5  Bewertungslogik, die vier Fälle der Spezifikation
  const anfKd = zuBauteil({ name: "Kellerdecke" });
  if (bewertung({ massnahme: true }, 0.20, anfKd).text !== "erfüllt") f.push("0,20 <= 0,25 muss erfüllt sein");
  if (bewertung({ massnahme: true }, 0.29, anfKd).text !== "NICHT erfüllt") f.push("Maßnahme über Ziel = NICHT erfüllt");
  if (bewertung({ massnahme: false }, 0.29, anfKd).text !== "Bauteil bleibt") f.push("Bestand ohne Maßnahme = Bauteil bleibt");
  /* Geändertes Verhalten, bewusst: Auch ohne Aussage zur Maßnahme wird die
     Überschreitung genannt, der Vorbehalt steht daneben. Vorher verschwand
     genau diese Aussage hinter "nur bei Dämmung relevant". */
  const bestand = bewertung({}, 2.00, zuBauteil({ name: "Dachschräge" }));
  if (bestand.erfuellt !== false) {
    f.push("Bestand ohne Aussage: Überschreitung muss trotzdem genannt werden");
  }
  if (!bestand.vorbehalt) {
    f.push("Bestand ohne Aussage: der Vorbehalt zur Maßnahme muss dabeistehen");
  }
  if (bewertung({}, 1.30, zuBauteil({ name: "Haustrennwand zu Nr. 61" })).text !== "Bauteil bleibt") {
    f.push("Ohne Anforderung = Bauteil bleibt");
  }
  // Die Wand mit 0,47 muss jetzt als Überschreitung erscheinen. Vorher kam
  // hier "Bauteil bleibt" heraus, und der Punkt fiel aus Kapitel 8.
  const bw = bewertung({}, 0.47, zuBauteil({ name: "Außenwand Giebel" }));
  if (bw.erfuellt !== false) {
    f.push("Außenwand 0,47 gegen 0,20 muss als nicht erfüllt erscheinen, ist: " + bw.text);
  }
  if (!bw.vorbehalt || bw.vorbehalt.indexOf("gedämmt") < 0) {
    f.push("Außenwand: Vorbehalt muss vom Dämmen sprechen");
  }
  // Kerndämmung wird über lambda beurteilt, nicht über U
  const anfKern = zuBauteil({ name: "Außenwand zweischalig, 6 cm Kerndämmung WLG 035" });
  if (bewertung({}, 0.47, anfKern, 0.035).text !== "erfüllt") f.push("λ 0,035 muss erfüllt sein");
  if (bewertung({}, 0.47, anfKern, 0.040).text !== "NICHT erfüllt") f.push("λ 0,040 darf nicht erfüllt sein");
  if (bewertung({}, 0.47, anfKern, null).erfuellt !== null) f.push("Ohne λ keine Aussage");

  // 6  kleinstesLambda findet die Dämmschicht
  const lam = kleinstesLambda({ schichten: [{ lambda: 0.70, d: 0.015 }, { lambda: 0.035, d: 0.06 },
                                             { lambda: 0.96, d: 0.115 }] });
  if (Math.abs(lam - 0.035) > 1e-12) f.push("kleinstesLambda findet die Dämmschicht nicht");
  if (kleinstesLambda({ schichten: [] }) !== null) f.push("Ohne Schichten muss null herauskommen");

  // 6b  zuBauteil liefert die Kategorie-Kennung mit, damit der Bericht
  //      Fenster und Türen anders benennen kann als gedämmte Flächen
  if (zuBauteil({ name: "Fenster" }).id !== "fenster") f.push("zuBauteil ohne id fenster");
  if (zuBauteil({ name: "Haustür" }).id !== "haustuer") f.push("zuBauteil ohne id haustuer");
  if (zuBauteil({ name: "Irgendwas Unbekanntes" }).id !== null) {
    f.push("Ohne Treffer darf keine Kategorie-Kennung entstehen");
  }
  if (zuBauteil({ name: "Fenster", beg_ziel: 1.1 }).id !== null) {
    f.push("Bei eigener Vorgabe gibt es keine Kategorie-Kennung");
  }
  // 6c  Der Vorbehalt nennt bei Fenster und Tür das Erneuern, sonst das Dämmen
  const vF = bewertung({}, 2.70, zuBauteil({ name: "Fenster" }));
  if (!vF.vorbehalt || vF.vorbehalt.indexOf("erneuert") < 0) {
    f.push("Fenster: Vorbehalt muss vom Erneuern sprechen, ist: " + vF.vorbehalt);
  }
  const vT = bewertung({}, 3.00, zuBauteil({ name: "Haustür" }));
  if (!vT.vorbehalt || vT.vorbehalt.indexOf("erneuert") < 0) {
    f.push("Haustür: Vorbehalt muss vom Erneuern sprechen, ist: " + vT.vorbehalt);
  }
  const vD = bewertung({}, 2.00, zuBauteil({ name: "Dachschräge" }));
  if (!vD.vorbehalt || vD.vorbehalt.indexOf("gedämmt") < 0) {
    f.push("Dachschräge: Vorbehalt muss vom Dämmen sprechen, ist: " + vD.vorbehalt);
  }

  // 6d  ausnahmenZu liefert nur bedingte Zeilen und nie die Regelzeile selbst
  ausnahmenZu("dach").forEach(function (a) {
    if (!a.bedingt) f.push("ausnahmenZu liefert eine unbedingte Zeile: " + a.id);
    if (!a.bedingung) f.push("Ausnahme ohne Voraussetzung: " + a.id);
    if (!a.quelle) f.push("Ausnahme ohne Fundstelle: " + a.id);
  });
  if (!ausnahmenZu("dach").some(function (a) { return a.id === "dach_denkmal"; })) {
    f.push("Zur Dachfläche gehört die Denkmalzeile als Ausnahme");
  }
  if (ausnahmenZu("kellerdecke").length) {
    f.push("Zur Kellerdecke führt die Tabelle keine Ausnahme");
  }

  // 7  Fußnote nennt Fassung, Inkrafttreten, Spalte und die ersetzte Fassung
  const fn = fussnote();
  ["17.07.2026", "21.07.2026", FASSUNG.spalte, "29.12.2023"].forEach(function (s) {
    if (fn.indexOf(s) < 0) f.push("Fußnote ohne Angabe: " + s);
  });
  // Solange keine BAnz-Fundstelle vorliegt, muss die Fußnote das sagen und
  // darf keine Nummer erfinden.
  if (!FASSUNG.banz && fn.indexOf("Bundesanzeiger") < 0) {
    f.push("Ohne BAnz-Fundstelle muss die Fußnote den Grund nennen");
  }
  if (!FASSUNG.banz && /BAnz AT \d/.test(fn.replace("BAnz AT 29.12.2023 B1", ""))) {
    f.push("Die Fußnote nennt eine BAnz-Nummer, die es für diese Fassung nicht gibt");
  }

  return { ok: f.length === 0, fehler: f, anzahl: 12 };
}

const DATEN_BEG_ANFORDERUNGEN = {
  FASSUNG: FASSUNG,
  ANFORDERUNGEN: ANFORDERUNGEN,
  fussnote: fussnote,
  fundstelle: fundstelleBeg,
  zuKategorie: zuKategorie,
  ausnahmenZu: ausnahmenZu,
  kategorieRaten: kategorieRaten,
  zuBauteil: zuBauteil,
  kleinstesLambda: kleinstesLambda,
  bewertung: bewertung,
  selbsttest: selbsttestBeg,
};
if (typeof module !== "undefined" && module.exports) module.exports = DATEN_BEG_ANFORDERUNGEN;
if (typeof window !== "undefined") window.DATEN_BEG_ANFORDERUNGEN = DATEN_BEG_ANFORDERUNGEN;
