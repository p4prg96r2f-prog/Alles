/* ===========================================================================
 * daten_typologie.js — Startwerte aus dem Baujahr
 * ===========================================================================
 * QUELLE der U-Werte:
 *   Loga, Stein, Diefenbach, Born: "Deutsche Wohngebäudetypologie.
 *   Beispielhafte Maßnahmen zur Verbesserung der Energieeffizienz von
 *   typischen Wohngebäuden", IWU, 2. erweiterte Auflage 2015,
 *   Anhang C.1 "Tabellenwerte für die Beispielgebäude",
 *   Spalte "Wärmeschutz Variante 1" = Ist-Zustand der Beispielgebäude,
 *   Reihe Einfamilienhaus (EFH_A bis EFH_L).
 *   Bezug: https://www.iwu.de/publikationen/fachinformationen/gebaeudetypologie/
 *
 * ABLEITUNG: Hat ein Beispielgebäude mehrere Bauteile derselben Kategorie
 * (z. B. zwei Außenwandtypen), ist der hier hinterlegte U-Wert das mit den
 * Bauteilflächen desselben Beispielgebäudes gewichtete Mittel. Die Zuordnung
 * Spalte zu Bauteilkategorie wurde gegen die Flächentabelle (Anhang C.1,
 * vorhergehende Seite) geprüft; nicht eindeutig zuzuordnende Zeilen sind
 * hier bewusst NICHT enthalten.
 *
 * GELTUNG: Es sind Kennwerte typischer Beispielgebäude, keine Objektwerte.
 * Das Werkzeug setzt sie als Startwert ein und weist sie im Bericht
 * ausnahmslos als Annahme aus, bis sie am Objekt bestätigt sind.
 *
 * NICHT ENTHALTEN: Baualtersklasse 1958 bis 1968 (in der Quelle nicht
 * eindeutig zuzuordnen) sowie die Reihen Reihenhaus, Mehrfamilienhaus,
 * großes Mehrfamilienhaus und Hochhaus. Für diese greift die nächstgelegene
 * Klasse mit einem Hinweis im Bericht.
 * =========================================================================== */

"use strict";

const TYPOLOGIE_EFH = [
  {
    "code": "EFH_A",
    "von": null,
    "bis": 1859,
    "label": "bis 1859",
    "u": {
      "dach": 2.6,
      "wand": 2.0,
      "kellerdecke": null,
      "bodenplatte": 2.9,
      "fenster": 2.8,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 4.73
  },
  {
    "code": "EFH_B",
    "von": 1860,
    "bis": 1918,
    "label": "1860 bis 1918",
    "u": {
      "dach": 1.3,
      "wand": 1.7,
      "kellerdecke": 1.2,
      "bodenplatte": 1.2,
      "fenster": 2.8,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 4.53
  },
  {
    "code": "EFH_C",
    "von": 1919,
    "bis": 1948,
    "label": "1919 bis 1948",
    "u": {
      "dach": 1.4,
      "wand": 1.7,
      "kellerdecke": 1.0,
      "bodenplatte": null,
      "fenster": 2.8,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 3.54
  },
  {
    "code": "EFH_D",
    "von": 1949,
    "bis": 1957,
    "label": "1949 bis 1957",
    "u": {
      "dach": 1.4,
      "wand": 1.4,
      "kellerdecke": 1.01,
      "bodenplatte": 1.01,
      "fenster": 2.8,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 4.61
  },
  {
    "code": "EFH_F",
    "von": 1969,
    "bis": 1978,
    "label": "1969 bis 1978",
    "u": {
      "dach": 0.5,
      "wand": 1.0,
      "kellerdecke": 1.0,
      "bodenplatte": 1.0,
      "fenster": 2.8,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 3.13
  },
  {
    "code": "EFH_G",
    "von": 1979,
    "bis": 1983,
    "label": "1979 bis 1983",
    "u": {
      "dach": 0.5,
      "wand": 0.8,
      "kellerdecke": 0.8,
      "bodenplatte": null,
      "fenster": 4.3,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 1.86
  },
  {
    "code": "EFH_H",
    "von": 1984,
    "bis": 1994,
    "label": "1984 bis 1994",
    "u": {
      "dach": 0.4,
      "wand": 0.5,
      "kellerdecke": 0.6,
      "bodenplatte": null,
      "fenster": 3.2,
      "tuer": 3.0
    },
    "ht_wohnflaeche": 2.34
  },
  {
    "code": "EFH_I",
    "von": 1995,
    "bis": 2001,
    "label": "1995 bis 2001",
    "u": {
      "dach": 0.35,
      "wand": 0.3,
      "kellerdecke": 0.45,
      "bodenplatte": null,
      "fenster": 1.9,
      "tuer": 2.0
    },
    "ht_wohnflaeche": 1.78
  },
  {
    "code": "EFH_J",
    "von": 2002,
    "bis": 2009,
    "label": "2002 bis 2009",
    "u": {
      "dach": 0.25,
      "wand": 0.3,
      "kellerdecke": 0.3,
      "bodenplatte": null,
      "fenster": 1.4,
      "tuer": 2.0
    },
    "ht_wohnflaeche": 1.14
  },
  {
    "code": "EFH_K",
    "von": 2010,
    "bis": 2015,
    "label": "2010 bis 2015",
    "u": {
      "dach": 0.2,
      "wand": 0.3,
      "kellerdecke": null,
      "bodenplatte": 0.45,
      "fenster": 1.3,
      "tuer": 1.8
    },
    "ht_wohnflaeche": 1.2
  },
  {
    "code": "EFH_L",
    "von": 2016,
    "bis": null,
    "label": "2016 und später",
    "u": {
      "dach": 0.24,
      "wand": 0.27,
      "kellerdecke": null,
      "bodenplatte": 0.27,
      "fenster": 1.3,
      "tuer": 1.8
    },
    "ht_wohnflaeche": 1.14
  }
];

/* Heizlast-Kennwerte je Baualtersklasse — für die Selbstprüfung.
 * QUELLE: IWU TABULA 2015, verbrauchskalibrierter Ist-Zustand; übernommen aus
 * dem geprüften WERK.E-Modul werke_konzept_tool/src/kerne/kern_heizlast.js.
 * Diese Werte gehen NICHT in die Berechnung ein. Sie dienen ausschließlich
 * als unabhängiger Erwartungswert, gegen den das Werkzeug sein eigenes
 * Ergebnis prüft. */
const HEIZLAST_KENNWERT = [
  { von: -Infinity, bis: 1918, wm2: 120 }, { von: 1919, bis: 1948, wm2: 115 },
  { von: 1949, bis: 1957, wm2: 115 },      { von: 1958, bis: 1968, wm2: 110 },
  { von: 1969, bis: 1978, wm2: 95 },       { von: 1979, bis: 1983, wm2: 80 },
  { von: 1984, bis: 1994, wm2: 75 },       { von: 1995, bis: 2001, wm2: 60 },
  { von: 2002, bis: 2009, wm2: 50 },       { von: 2010, bis: 2015, wm2: 40 },
  { von: 2016, bis: Infinity, wm2: 35 },
];
/* Kompakte Gebäude geben je Quadratmeter weniger ab. QUELLE: wie oben. */
const MFH_FAKTOR = 0.88;

/* ---------------------------------------------------------------------------
 * GRENZEN DER GELTUNG — warum diese Tabelle nicht überall gilt
 * ---------------------------------------------------------------------------
 * 1  NACH OBEN, ÜBER DAS BAUJAHR
 * Die Quelle ist von 2015. Ihre jüngste Klasse heißt dort "2016 und später"
 * und beschreibt den Neubau nach der EnEV-Stufe 2016. Das ist eine
 * Vorausschau der Quelle, keine Erhebung an Gebäuden, die es 2015 noch nicht
 * gab. Für Neubauten ab dem 1. Januar 2023 gilt ein deutlich schärferes
 * gesetzliches Anforderungsniveau: Mindeststandard ist seither das
 * Effizienzhaus 55. Ein Fenster mit 1,30 W/(m²·K), wie es die Klasse nennt,
 * kommt in einem solchen Neubau nicht mehr vor.
 *
 * Deshalb endet die Anwendung mit dem Baujahr 2022. Für jüngere Gebäude
 * liefert zumBaujahr() KEINE U-Werte. Sie stehen im GEG-Nachweis, im
 * Energieausweis oder in den Bauteilnachweisen und sind von dort zu
 * übernehmen. Ein grün dastehender falscher Startwert trägt sonst durch die
 * ganze Rechnung, ohne dass irgendeine Probe ihn findet.
 * Festlegung dieses Werkzeugs, kein Wert aus der Quelle.
 *
 * 2  ZUR SEITE, ÜBER DIE GEBÄUDEART
 * Hinterlegt ist allein die Reihe Einfamilienhaus (siehe Kopf dieser Datei).
 * Für ein Mehrfamilienhaus wird sie ersatzweise verwendet; das muss überall
 * dastehen, wo die Werte erscheinen, sonst behauptet die Fundstelle etwas
 * anderes als die Eingabe. Für ein NICHTwohngebäude gilt sie gar nicht: eine
 * WOHNgebäudetypologie kennt weder Hallen noch Bürobauten.
 * ------------------------------------------------------------------------ */
const GELTUNG_BIS = 2022;
const REIHE = "Reihe Einfamilienhaus";
const QUELLE = "IWU, Deutsche Wohngebäudetypologie, 2. Auflage 2015, Anhang C.1";

/* ===========================================================================
 * ZWEITE QUELLE — Neubau ab 2023: das Referenzgebäude des Gesetzes
 * ===========================================================================
 * WARUM ES SIE GEBEN MUSS. Bis zum 24.08.2026 endete diese Datei mit der
 * Klasse „2016 und später" und der Geltung mit dem Baujahr 2022. Ein Gebäude
 * mit Baujahr 2023 oder jünger fiel hinten heraus: zumBaujahr() lieferte
 * keinen U-Wert, startwerte() keine Zeile, app.js legte keinen Bauteiltyp an,
 * und ohne Bauteiltyp entsteht in keinem Raum ein Bauteil. GEMESSEN am Blatt
 * „BV 2-0887 Ziolkowski" mit eingetragenem Baujahr 2025: 0,00 kW
 * Gebäudeheizlast, 0 Bauteile über 22 Räume, Bericht gesperrt. Sechs rote
 * Zeilen des Kontrollblatts beschrieben dieselbe eine Ursache.
 *
 * WOHER DIE WERTE STAMMEN — wörtlich abgeschrieben, nicht erinnert:
 *
 *   Gesetz zur Einsparung von Energie und zur Modernisierung der
 *   Wärmeversorgung in Gebäuden (Gebäudemodernisierungsgesetz — GModG; bis
 *   zur Umbenennung durch das GModG vom 28.07.2026, in Kraft seit
 *   29.07.2026, geführt als Gebäudeenergiegesetz — GEG),
 *     Anlage 1 (zu § 15 Absatz 1) „Technische Ausführung des
 *     Referenzgebäudes (Wohngebäude)", Nummern 1.1 bis 1.7,
 *     Fundstelle BGBl. I 2020, 1767 bis 1768,
 *   und für Nichtwohngebäude
 *     Anlage 2 (zu § 18 Absatz 1) „Technische Ausführung des
 *     Referenzgebäudes (Nichtwohngebäude)", Nummern 1.1, 1.3, 1.4, 1.8
 *     und 1.10, Spalte „Raum-Solltemperaturen im Heizfall ≥ 19 °C",
 *     Fundstelle BGBl. I 2020, 1769 bis 1773.
 *   Abgeschrieben am 24.08.2026 vom amtlichen Wortlaut auf
 *   gesetze-im-internet.de (/geg/anlage_1.html und /geg/anlage_2.html).
 *
 * In beiden Anlagen tragen die hier gebrauchten Zeilen dieselben Zahlen; die
 * zweite Spalte der Anlage 2 (Zonen von 12 bis unter 19 °C) ist NICHT
 * angewendet und steht unten nur zum Nachlesen. Ein Werkzeug, das nicht weiß,
 * wie warm eine Zone gefahren wird, darf sich nicht die günstigere Spalte
 * aussuchen.
 *
 * ANFORDERUNG ODER ERWARTUNGSWERT? Die bewusste Wahl ist die ANFORDERUNG.
 *   Ein Anforderungswert ist eine OBERGRENZE, kein Erwartungswert: nach § 16
 *   GModG darf der spezifische Transmissionswärmeverlust eines zu
 *   errichtenden Wohngebäudes das 1,0fache des Referenzgebäudes nicht
 *   überschreiten (für Nichtwohngebäude § 19 mit Anlage 3). Ein Neubau von
 *   2025 ist in aller Regel BESSER gedämmt als das Referenzgebäude, weil
 *   § 15 GModG zusätzlich das 0,55fache des Primärenergiebedarfs verlangt und
 *   das über die Hülle leichter zu erreichen ist als über die Anlage.
 *   Der wirkliche U-Wert liegt also unter dem hier angesetzten, die wirkliche
 *   Heizlast unter der hier gerechneten.
 *   Genau deshalb wird die Anforderung genommen und kein „typischer" Wert:
 *     1. Sie ist veröffentlicht und zitierbar. Ein typischer Neubauwert wäre
 *        eine Schätzung ohne Fundstelle — und Schätzungen ohne Fundstelle
 *        haben in diesem Werkzeug nichts verloren.
 *     2. Sie zeigt in die vorsichtige Richtung. Zu klein gerechnet heißt: der
 *        Erzeuger ist zu klein und das Haus wird am Auslegungstag nicht warm.
 *        Das ist der teurere der beiden Fehler (siehe kern_annahmen.js).
 *   Beides steht im Klartext in der Fundstelle, die jedes so entstandene
 *   Bauteil trägt, und damit im Bericht.
 *
 * WÄRMEBRÜCKEN. Anlage 1 Nummer 2 nennt für das Referenzgebäude zusätzlich
 * ΔU_WB = 0,05 W/(m²·K). Dieser Zuschlag ist hier NICHT eingerechnet: der
 * Rechenkern schlägt seinen eigenen pauschalen Wärmebrückenzuschlag auf jedes
 * Hüllbauteil auf (kern_heizlast_norm.js, DELTA_U_WB_STANDARD). Eingerechnet
 * stünde er zweimal in der Rechnung.
 *
 * NACHFÜHREN: Ab 01.01.2027 stellt das GModG das Neubau-Rechenregime um
 * (technologieneutrales Referenzgebäude). Die U-Werte der Anlagen 1 und 2
 * sind dann gegen den dann geltenden Wortlaut zu stellen.
 * ======================================================================== */

/** Der Wortlaut, aus dem die Neubauwerte stammen. Eine Stelle, damit
 *  Fundstelle und Zahl nicht auseinanderlaufen können. */
const NEUBAU = {
  ab: GELTUNG_BIS + 1,
  gesetz: "Gebäudemodernisierungsgesetz (GModG, bis zur Umbenennung am "
    + "29.07.2026 Gebäudeenergiegesetz — GEG)",
  wg: {
    anlage: "Anlage 1 (zu § 15 Absatz 1), Technische Ausführung des "
      + "Referenzgebäudes (Wohngebäude)",
    bgbl: "BGBl. I 2020, 1767 bis 1768",
    spalte: null,
  },
  nwg: {
    anlage: "Anlage 2 (zu § 18 Absatz 1), Technische Ausführung des "
      + "Referenzgebäudes (Nichtwohngebäude)",
    bgbl: "BGBl. I 2020, 1769 bis 1773",
    spalte: "Raum-Solltemperaturen im Heizfall ≥ 19 °C",
  },
  geprueft_am: "24.08.2026",
};

/** Die Zeilen der Anlagen, je Bauteiltyp dieses Werkzeugs.
 *  `nr` ist die Nummer in Anlage 1 (Wohngebäude), `nr_nwg` die in Anlage 2.
 *  `zeile` ist der Wortlaut der Zeile, damit die Fundstelle nachschlagbar ist
 *  und nicht nur eine Nummer nennt. */
const NEUBAU_U = [
  { schluessel: "wand", nr: "1.1", nr_nwg: "1.1", u: 0.28,
    zeile: "Außenwand (einschließlich Einbauten, wie Rollladenkästen), "
      + "Geschossdecke gegen Außenluft" },
  { schluessel: "dach", nr: "1.3", nr_nwg: "1.4", u: 0.20,
    zeile: "Dach, oberste Geschossdecke, Wände zu Abseiten" },
  { schluessel: "kellerdecke", nr: "1.2", nr_nwg: "1.3", u: 0.35,
    zeile: "Außenwand gegen Erdreich, Bodenplatte, Wände und Decken zu "
      + "unbeheizten Räumen" },
  { schluessel: "bodenplatte", nr: "1.2", nr_nwg: "1.3", u: 0.35,
    zeile: "Außenwand gegen Erdreich, Bodenplatte, Wände und Decken zu "
      + "unbeheizten Räumen" },
  { schluessel: "fenster", nr: "1.4", nr_nwg: "1.8", u: 1.3,
    zeile: "Fenster, Fenstertüren" },
  { schluessel: "tuer", nr: "1.7", nr_nwg: "1.10", u: 1.8,
    zeile: "Außentüren; Türen gegen unbeheizte Räume" },
];

/** Die zweite Spalte der Anlage 2 — nur zum Nachlesen, nirgends angewendet.
 *  Sie steht hier, damit niemand sie aus dem Gedächtnis nachträgt. */
const NEUBAU_U_NWG_TEILBEHEIZT = {
  hinweis: "Anlage 2, Spalte „Zonen mit 12 °C < Raum-Solltemperatur < 19 °C“; "
    + "in diesem Werkzeug NICHT angewendet, weil ihm die Solltemperatur der "
    + "Zone nicht vorliegt.",
  wand: 0.35, dach: 0.35, kellerdecke: 0.35, bodenplatte: 0.35,
  fenster: 1.9, tuer: 2.9,
};

/** U-Werte des Referenzgebäudes als Karte, wie sie satz.u hätte. */
function neubauKarte() {
  const u = {};
  NEUBAU_U.forEach(function (x) { u[x.schluessel] = x.u; });
  return u;
}

/** Fundstelle einer einzelnen Neubau-Zeile. */
function fundstelleNeubauZeile(schluessel, art) {
  const nwg = String(art || "").toLowerCase() === "nwg";
  const a = nwg ? NEUBAU.nwg : NEUBAU.wg;
  const z = NEUBAU_U.find(function (x) { return x.schluessel === schluessel; });
  if (!z) return null;
  return NEUBAU.gesetz + ", " + a.anlage + ", Nummer " + (nwg ? z.nr_nwg : z.nr)
    + " „" + z.zeile + "“"
    + (a.spalte ? ", Spalte " + a.spalte : "")
    + " (" + a.bgbl + ")";
}

/* ===========================================================================
 * DRITTE STUFE — der letzte Rückfall
 * ===========================================================================
 * Es darf nicht dabei bleiben, dass kein einziges Bauteil entsteht. Bleibt
 * nach Typologie (bis 2022, Wohngebäude) und Referenzgebäude (ab 2023) ein
 * Fall übrig — ein Nichtwohngebäude im Bestand —, tritt die Reihe
 * Einfamilienhaus derselben Baualtersklasse an ihre Stelle. Das ist KEINE
 * Fundstelle für ein Nichtwohngebäude, und der Text sagt das auch so. Es ist
 * ein Startwert, damit überhaupt eine Zahl entsteht, die man berichtigen
 * kann; er ist überschreibbar wie jeder andere.
 * ======================================================================== */
const RUECKFALL_TEXT = "Für ein Nichtwohngebäude aus dem Bestand ist in diesem "
  + "Werkzeug keine eigene Tabelle hinterlegt. Damit überhaupt gerechnet "
  + "werden kann, ist ersatzweise die Reihe Einfamilienhaus derselben "
  + "Baualtersklasse angesetzt. Das ist ein RÜCKFALLWERT und keine Fundstelle "
  + "für ein Nichtwohngebäude: eine Halle oder ein Bürobau ist anders gebaut "
  + "als ein Wohnhaus desselben Baujahrs, nach oben wie nach unten. Der Wert "
  + "ist aus dem Nachweis, dem Energieausweis oder den Bauteilnachweisen zu "
  + "ersetzen.";

/* ===========================================================================
 * VIERTE STUFE — Baujahr völlig unbekannt: die Bestands-Rückfallklasse
 * ===========================================================================
 * WARUM ES SIE GEBEN MUSS. Bis zum 25.08.2026 war das fehlende Baujahr die
 * letzte harte Sperre dieses Werkzeugs: ohne Baujahr keine U-Werte, keine
 * Bauteiltypen, kein Bauteil, 0,00 kW, Ampel rot, Bericht gesperrt. Ein
 * Bestandsplan ohne Baujahrsangabe — der Normalfall bei Aufmaßunterlagen —
 * hielt damit die ganze Rechnung an, obwohl jede Baualtersklasse der
 * hinterlegten Tabelle eine endliche, brauchbare Zahl ergeben hätte.
 *
 * WELCHE KLASSE, UND WARUM GENAU DIESE. Es wird KEINE neue Zahl erfunden;
 * angesetzt wird eine vorhandene, belegte Klasse derselben Tabelle:
 * EFH_F, „1969 bis 1978" (Außenwand 1,0 · Dach 0,5 · Kellerdecke/Boden-
 * platte 1,0 · Fenster 2,8 · Tür 3,0 W/(m²·K)). Drei Gründe:
 *   1. Ein Gebäude ohne bekanntes Baujahr ist praktisch immer Bestand —
 *      ein Neubau trägt sein Baujahr in Antrag und Nachweis. Die Klasse
 *      1969 bis 1978 ist die JÜNGSTE vor der 1. Wärmeschutzverordnung
 *      (vom 11.08.1977, in Kraft 01.11.1977); alles Ältere ist schlechter
 *      oder gleich gedämmt, alles Jüngere unterlag bereits einer
 *      Wärmeschutzverordnung und ist im Zweifel besser.
 *   2. Sie liegt in der Mitte der Bestandsspanne dieser Tabelle (Wand
 *      2,0 … 0,27; Kennwert 95 W/m² bei einer Spanne 120 … 35 W/m²).
 *   3. GEGENPROBE AN DER ZWEITEN QUELLE, Wert für Wert. BMWi/BMI,
 *      „Bekanntmachung der Regeln zur Datenaufnahme und Datenverwendung im
 *      Wohngebäudebestand", BAnz AT 04.12.2020 B1, Tabelle 2 „Pauschalwerte
 *      für den Wärmedurchgangskoeffizienten nicht nachträglich gedämmter
 *      opaker Bauteile (im Ausgangszustand)", Seiten 5 bis 7, Spalte
 *      „1969 bis 1978"; Fenster aus Tabelle 3, Spalte „bis 1978".
 *      Abgeschrieben am 25.08.2026 aus der PDF des Bundesanzeigers selbst.
 *        Außenwand massiv  1,0 (zweischalig ohne Dämmschicht, Hochlochziegel
 *                          und sonstige massive Aufbauten alle 1,0; nur
 *                          zweischalig MIT Dämmschicht 0,90)  — EFH_F: 1,0 ✓
 *        Kellerdecke       1,0 (Stahlbeton massiv und Ziegel-/Hohlstein-
 *                          konstruktion je 1,0; Holzbalkendecke 0,60)
 *                                                             — EFH_F: 1,0 ✓
 *        Boden gg. Erdreich 1,0 bis 1,2 (Ziegel/Holz 1,0, Stahlbeton 1,2)
 *                                                             — EFH_F: 1,0 ✓
 *        Fenster           2,7 (Holzfenster, zwei Scheiben, U_W; Kunststoff
 *                          und Metall darüber)                — EFH_F: 2,8 ✓
 *        Türen             2,9 Holz/Kunststoff, 4,0 Metall    — EFH_F: 3,0 ✓
 *        Dach              1,3 massiv, 0,80 Holzkonstruktion; oberste
 *                          Geschossdecke 0,60                 — EFH_F: 0,5 ✗
 *      EINE Abweichung, und sie zeigt in die unvorsichtige Richtung: das
 *      Dach der Klasse EFH_F liegt mit 0,5 UNTER der Spanne 0,60 bis 1,3 der
 *      zweiten Quelle. Das ist kein Fehler der Tabelle — die IWU-Reihe
 *      beschreibt den IST-Zustand typischer Gebäude, in dem viele Dächer
 *      längst nachgerüstet sind, die BAnz-Tabelle den ungedämmten
 *      Ausgangszustand. Für ein Haus mit unberührtem Dach rechnet der
 *      Rückfall die Dachfläche also zu gut; das steht im Klartext an jedem
 *      so entstandenen Bauteil und gehört zu der Fehlerrichtung, die unten
 *      ausgeschrieben ist. Verschoben wird deswegen keine Zahl: gemischt
 *      wären es Werte, die in keiner Quelle nebeneinander stehen.
 *
 * DIE RICHTUNG DES FEHLERS, ausgeschrieben, weil sie hier NICHT die
 * vorsichtige ist: Ist das Gebäude älter als 1969 und unsaniert, ist die
 * wirkliche Heizlast HÖHER als die gerechnete — das ist der teure Fehler
 * (Erzeuger zu klein). Ist es jünger oder saniert, ist sie niedriger.
 * Genau deshalb ist dieser Rückfall keine stille Vorbelegung: er steht als
 * Annahme in p.annahmen, als gelbe Frage in den Rückfragen und im Bericht,
 * und die Baujahrprobe (kern_baujahrprobe) beziffert den Fächer über alle
 * Klassen. Ein eingetragenes Baujahr ersetzt alle Rückfallwerte
 * (typologieNachfuehren in app.js); eine Nutzereingabe wird nie
 * überschrieben.
 * ======================================================================== */
const RUECKFALL_OHNE_BAUJAHR_CODE = "EFH_F";

/** Der Rückfallsatz, wenn GAR KEIN auswertbares Baujahr vorliegt.
 *  Er sieht aus wie ein Satz aus zumBaujahr() — dieselben Felder, dieselbe
 *  startwerte()-Maschine —, sagt aber in gilt/grund/startquelle, dass keine
 *  Klasse belegt ist. Erwartungswert und Baujahrprobe-Punktwert hängen an
 *  `gilt` und bleiben damit aus: gegen eine angenommene Klasse zu „prüfen"
 *  wäre ein Kreis. */
function ohneBaujahr(gebaeudeart) {
  const art = String(gebaeudeart || "efh").toLowerCase();
  const treffer = TYPOLOGIE_EFH.find(function (t) {
    return t.code === RUECKFALL_OHNE_BAUJAHR_CODE; });
  if (!treffer) return null;
  const satz = {
    ...treffer,
    baujahr: null,
    ersatz: false,
    gilt: false,
    grund: "baujahr_unbekannt",
    geltung_bis: GELTUNG_BIS,
    reihe: REIHE,
    reihe_ersatz: (art === "mfh" || art === "gmh"),
    startquelle: "rueckfall_ohne_baujahr",
    startquelle_art: art,
    u: {},
    u_start: Object.assign({}, treffer.u),
  };
  satz.fundstelle = fundstelleTypologie(satz);
  satz.fundstelle_startwerte = fundstelleStartwerte(satz);
  return satz;
}

/** Typologie-Datensatz zum Baujahr.
 *
 *  Liefert immer entweder null (kein auswertbares Baujahr) oder einen Satz mit
 *  dem Feld `gilt`. Nur bei `gilt === true` stehen in `u` Zahlen; sonst ist
 *  `u` leer und `grund` sagt, warum. Aufrufer, die `t.u.wand` lesen, laufen
 *  damit ins Leere statt in einen falschen Wert.
 *
 *  gebaeudeart: "efh" | "mfh" | "gmh" | "nwg" (ASCII, wie im Formular). */
function zumBaujahr(baujahr, gebaeudeart) {
  const j = parseInt(baujahr, 10);
  if (!Number.isFinite(j)) return null;
  /* Ein Nicht-Jahr bekommt KEINE U-Werte. Zur −1 fand die Klassensuche
     bisher „nächstgelegen" die älteste Klasse — „Außenwand (U 2,00)" — und
     ein Tippfehler oder eine Pfeiltaste in einem leeren Zahlenfeld
     verwandelte sich unbemerkt in eine Gründerzeit-Bibliothek (Abnahme
     24.08.2026, ~30 statt 11,95 kW). Plausibel heißt: vierstellige
     Jahreszahl, höchstens fünf Jahre in der Zukunft. Alles andere ist so zu
     behandeln, als stünde gar kein Baujahr da. */
  if (j < 1000 || j > new Date().getFullYear() + 5) return null;
  const art = String(gebaeudeart || "efh").toLowerCase();
  let treffer = TYPOLOGIE_EFH.find(function (t) {
    return (t.von === null || j >= t.von) && (t.bis === null || j <= t.bis);
  });
  let ersatz = false;
  if (!treffer) {
    // nächstgelegene Klasse suchen
    let abstand = Infinity;
    TYPOLOGIE_EFH.forEach(function (t) {
      const mitte = ((t.von === null ? t.bis : t.von) + (t.bis === null ? t.von : t.bis)) / 2;
      const d = Math.abs(j - mitte);
      if (d < abstand) { abstand = d; treffer = t; ersatz = true; }
    });
  }
  if (!treffer) return null;

  const reiheErsatz = (art === "mfh" || art === "gmh");
  let grund = null;
  if (art === "nwg") grund = "nichtwohngebaeude";
  else if (j > GELTUNG_BIS) grund = "ausserhalb_geltung";

  const satz = {
    ...treffer,
    baujahr: j,
    ersatz: ersatz,
    gilt: grund === null,
    grund: grund,
    geltung_bis: GELTUNG_BIS,
    reihe: REIHE,
    reihe_ersatz: reiheErsatz,
  };
  if (grund !== null) satz.u = {};

  /* WELCHE QUELLE DIE STARTWERTE HERGIBT.
   *
   * `gilt` behält seine Bedeutung: „die IWU-Typologie gilt". Daran hängen der
   * Erwartungswert der Selbstprüfung und der Fächer der Baujahrprobe, und
   * beide dürfen sich nicht ändern. Getrennt davon steht jetzt, WOHER die
   * U-Werte kommen. Es gibt drei Stufen und keine vierte, in der nichts
   * herauskommt — solange ein auswertbares Baujahr da ist. */
  if (grund === null) {
    satz.startquelle = "typologie";
    satz.u_start = Object.assign({}, treffer.u);
  } else if (j > GELTUNG_BIS) {
    satz.startquelle = "neubau_referenz";
    satz.u_start = neubauKarte();
  } else {
    satz.startquelle = "rueckfall_efh";        // Nichtwohngebäude im Bestand
    satz.u_start = Object.assign({}, treffer.u);
  }
  satz.startquelle_art = art;

  satz.fundstelle = fundstelleTypologie(satz);
  satz.fundstelle_startwerte = fundstelleStartwerte(satz);
  return satz;
}

/** Gibt es für diesen Satz überhaupt Startwerte? Aufrufer, die bisher auf
 *  `gilt` geprüft haben, um zu entscheiden, ob sie Bauteile anlegen können,
 *  fragen hier — `gilt` sagt nur, ob die IWU-Tabelle greift. */
function hatStartwerte(satz) {
  return !!(satz && satz.u_start && Object.keys(satz.u_start).some(function (k) {
    return satz.u_start[k] != null;
  }));
}

/** Der Satz, der unter den Werten steht. Er nennt die Quelle, die verwendete
 *  Reihe und — falls zutreffend — dass sie ersatzweise herangezogen wurde.
 *  Eine Fundstelle, die "Reihe EFH" sagt, während oben Mehrfamilienhaus
 *  eingestellt ist, ist keine Fundstelle, sondern eine Falle. */
function fundstelleTypologie(satz) {
  if (!satz) return "";
  /* Diese beiden Sätze standen bis zum 24.08.2026 auf „Es sind keine
     Startwerte hinterlegt." Das stimmt nicht mehr: die Startwerte kommen
     dann aus der zweiten Quelle. Der Satz sagt weiter, dass die IWU-Tabelle
     nicht gilt — er sagt nur nicht mehr, dass daraus nichts folgt. */
  if (satz.grund === "nichtwohngebaeude") {
    return "Für ein Nichtwohngebäude gibt es in einer Wohngebäudetypologie "
      + "keine Entsprechung. Die Startwerte kommen deshalb nicht aus ihr: "
      + fundstelleStartwerte(satz);
  }
  if (satz.grund === "ausserhalb_geltung") {
    return "Baujahr " + satz.baujahr + " liegt hinter dem Ende dieser Tabelle "
      + "(" + GELTUNG_BIS + "). Die Startwerte kommen deshalb nicht aus ihr: "
      + fundstelleStartwerte(satz);
  }
  if (satz.grund === "baujahr_unbekannt") {
    return "Ein Baujahr ist nicht bekannt; damit ist keine Baualtersklasse "
      + "belegt. Die Startwerte sind Rückfallwerte: " + fundstelleStartwerte(satz);
  }
  return QUELLE + ", " + REIHE + ", Wärmeschutz Variante 1 (Ist-Zustand), "
    + "Klasse " + satz.label
    + (satz.ersatz ? " (nächstgelegene Klasse, die eigene ist in der Quelle "
        + "nicht eindeutig zuzuordnen)" : "")
    + (satz.reihe_ersatz ? ". Für Mehrfamilienhäuser ist in der Quelle keine "
        + "Reihe eindeutig zuzuordnen; die Reihe Einfamilienhaus wird "
        + "ersatzweise verwendet." : ".");
}

/** Der Satz, der über ALLEN Startwerten dieses Satzes steht — welche der drei
 *  Stufen sie hergibt und was das für ihre Belastbarkeit heißt.
 *  Die Fundstelle je Bauteil steht daneben in startwerte(). */
function fundstelleStartwerte(satz) {
  if (!satz) return "";
  if (satz.startquelle === "neubau_referenz") {
    const nwg = satz.startquelle_art === "nwg";
    const a = nwg ? NEUBAU.nwg : NEUBAU.wg;
    return "Anforderungswerte des Referenzgebäudes nach " + NEUBAU.gesetz
      + ", " + a.anlage + (a.spalte ? ", Spalte " + a.spalte : "")
      + " (" + a.bgbl + "). Für ein Baujahr ab " + NEUBAU.ab + " reicht die "
      + "Gebäudetypologie von 2015 nicht mehr; angesetzt ist deshalb das "
      + "gesetzliche Referenzgebäude. ACHTUNG, Richtung des Fehlers: Das ist "
      + "eine OBERGRENZE, kein Erwartungswert — nach § "
      + (nwg ? "19" : "16") + " " + (nwg ? "GModG (Anlage 3)" : "GModG")
      + " darf ein Neubau diesen Wärmeschutz nicht unterschreiten, in aller "
      + "Regel ist er besser. Die wirkliche Heizlast liegt also NIEDRIGER als "
      + "die hier gerechnete. Angesetzt ist bewusst die vorsichtige Richtung; "
      + "die Werte sind aus dem GEG-Nachweis zu ersetzen, sobald er vorliegt.";
  }
  if (satz.startquelle === "rueckfall_efh") {
    return RUECKFALL_TEXT + " Angesetzt: " + QUELLE + ", " + REIHE
      + ", Wärmeschutz Variante 1 (Ist-Zustand), Klasse " + satz.label + ".";
  }
  if (satz.startquelle === "rueckfall_ohne_baujahr") {
    return "RÜCKFALLWERT, weil kein Baujahr bekannt ist. Angesetzt: " + QUELLE
      + ", " + REIHE + ", Wärmeschutz Variante 1 (Ist-Zustand), Klasse "
      + satz.label + " — die jüngste Bestandsklasse vor der "
      + "1. Wärmeschutzverordnung (in Kraft 01.11.1977) und die Mitte der "
      + "Bestandsspanne dieser Tabelle. Gegengeprüft an der Bekanntmachung "
      + "der Regeln zur Datenaufnahme und Datenverwendung im "
      + "Wohngebäudebestand (BAnz AT 04.12.2020 B1), Tabelle 2 und 3, "
      + "Baualtersklasse 1969 bis 1978: Außenwand massiv 1,0, Kellerdecke "
      + "1,0, Boden gegen Erdreich 1,0 bis 1,2, Fenster 2,7, Türen 2,9 "
      + "W/(m²·K) — bis auf das Dach deckungsgleich. "
      + "ACHTUNG, Richtung des Fehlers, zweifach: Ist das Gebäude älter als "
      + "1969 und unsaniert, liegt die wirkliche Heizlast HÖHER als die "
      + "gerechnete; ist es jünger oder saniert, liegt sie niedriger. Und "
      + "das Dach dieser Klasse (0,5) liegt unter dem ungedämmten "
      + "Ausgangszustand derselben Baualtersklasse nach der Bekanntmachung "
      + "(0,60 oberste Geschossdecke bis 1,3 massives Dach) — ist das Dach "
      + "unberührt, ist auch dessen Anteil zu klein gerechnet. Das "
      + "eingetragene Baujahr ersetzt alle Rückfallwerte."
      + (satz.startquelle_art === "nwg"
        ? " Für ein NICHTWOHNGEBÄUDE ist das zusätzlich nur ein Behelf: eine "
          + "Wohngebäudetypologie kennt weder Hallen noch Bürobauten."
        : (satz.reihe_ersatz
          ? " Für Mehrfamilienhäuser ist in der Quelle keine Reihe eindeutig "
            + "zuzuordnen; die Reihe Einfamilienhaus wird ersatzweise "
            + "verwendet."
          : ""));
  }
  return fundstelleTypologie(satz);
}

/* ---------------------------------------------------------------------------
 * STARTWERTE FÜR DIE BAUTEILTYPEN — und die Lücke, die es wirklich gibt
 * ---------------------------------------------------------------------------
 * Die Quelle nennt je Beispielgebäude ENTWEDER eine Kellerdecke ODER eine
 * Bodenplatte, je nachdem, ob das Beispielhaus dieser Klasse unterkellert ist.
 * Das ist keine Lücke in der Auslese, sondern eine Eigenschaft der Quelle:
 *   Kellerdecke fehlt bei  EFH_A, EFH_K, EFH_L      (Häuser auf Bodenplatte)
 *   Bodenplatte fehlt bei  EFH_C, EFH_G, EFH_H, EFH_I, EFH_J   (unterkellert)
 * Nachgeprüft an der Tabelle in dieser Datei, nicht behauptet.
 *
 * WAS DAS ANRICHTETE. Wer den U-Wert einer Bodenplatte braucht, bekam für die
 * Klasse 1995 bis 2001 gar keinen — der Bauteiltyp „Bodenplatte" entstand
 * nicht. app.js griff daraufhin zur Kellerdecke: die Fläche unter einem
 * beheizten Keller hieß dann „Kellerdecke", lag aber auf dem Erdreich.
 * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 22.08.2026): 39,19 m²
 * Bodenplatte standen als „Kellerdecke" im Raumbuch und im Bericht.
 *
 * WAS HIER GESCHIEHT. Fehlt der eine Wert, tritt der andere derselben Klasse
 * an seine Stelle — gekennzeichnet, begründet und überschreibbar. Beide sind
 * in der Quelle Bauteile derselben Gruppe (unterer Gebäudeabschluss gegen
 * Erdreich oder unbeheizt) und desselben Baujahrs. Erfunden wird nichts: es
 * wird kein Wert gerechnet, geschätzt oder interpoliert, sondern einer aus
 * derselben Zeile derselben Tabelle übernommen.
 * ------------------------------------------------------------------------ */

/** Die Bauteiltypen, die aus einem Typologiesatz entstehen.
 *
 *  Liefert je Bauteil Name, U-Wert, Kategorie, Fundstelle und — falls der Wert
 *  ersatzweise aus einem anderen Bauteil derselben Klasse stammt — den Grund
 *  im Klartext. Diese Liste ist die EINZIGE Stelle, an der die Zuordnung
 *  Typologie → Bauteiltyp steht; app.js hatte sie zweimal, mit dem gleichen
 *  Loch an beiden Stellen. */
function startwerte(satz) {
  if (!satz || !hatStartwerte(satz)) return [];
  const u = satz.u_start;
  const q = satz.fundstelle_startwerte || fundstelleStartwerte(satz);
  const neubau = satz.startquelle === "neubau_referenz";
  const ohneBj = satz.startquelle === "rueckfall_ohne_baujahr";
  const rueckfall = satz.startquelle === "rueckfall_efh" || ohneBj;
  const raus = [];
  const nimm = function (name, wert, kat, ersatzGrund, schluessel) {
    if (wert == null) return;
    /* Beim Referenzgebäude tritt die Fundstelle der EINZELNEN Zeile vor den
       gemeinsamen Satz. Eine Nummer wie „Anlage 1 Nummer 1.3" ist
       nachschlagbar; „Anlage 1" allein ist es nicht. */
    const einzeln = (neubau && schluessel)
      ? fundstelleNeubauZeile(schluessel, satz.startquelle_art) : null;
    const kopf = einzeln ? einzeln + " — " + q : q;
    raus.push({ name: name, U: wert, kat: kat,
      quelle: ersatzGrund ? kopf + " " + ersatzGrund : kopf,
      ersatz: !!ersatzGrund,
      /* Woher der Wert stammt, als Kennung — damit Oberfläche und Bericht
         nicht am Fließtext erkennen müssen, ob eine Anforderung oder ein
         Bestandskennwert dasteht. */
      startquelle: satz.startquelle,
      anforderung: neubau,
      rueckfall: rueckfall,
      ohne_baujahr: ohneBj });
  };
  nimm("Außenwand", u.wand, "huelle", null, "wand");
  nimm("Dach", u.dach, "huelle", null, "dach");
  nimm("Kellerdecke", u.kellerdecke, "huelle", null, "kellerdecke");
  if (u.kellerdecke == null && u.bodenplatte != null) {
    nimm("Kellerdecke", u.bodenplatte, "huelle",
      "Für die Kellerdecke nennt die Quelle in dieser Klasse keinen Wert — das "
      + "Beispielgebäude ist nicht unterkellert. Ersatzweise gilt der Wert der "
      + "Bodenplatte derselben Klasse; beide sind der untere Gebäudeabschluss "
      + "desselben Baujahrs. Startwert, am Objekt zu bestätigen.", "bodenplatte");
  }
  nimm("Bodenplatte", u.bodenplatte, "erdreich", null, "bodenplatte");
  if (u.bodenplatte == null && u.kellerdecke != null) {
    nimm("Bodenplatte", u.kellerdecke, "erdreich",
      "Für die Bodenplatte nennt die Quelle in dieser Klasse keinen Wert — das "
      + "Beispielgebäude ist unterkellert. Ersatzweise gilt der Wert der "
      + "Kellerdecke derselben Klasse; beide sind der untere Gebäudeabschluss "
      + "desselben Baujahrs. Startwert, am Objekt zu bestätigen.", "kellerdecke");
  }
  nimm("Fenster", u.fenster, "huelle", null, "fenster");
  nimm("Außentür", u.tuer, "huelle", null, "tuer");
  return raus;
}

/** Erwartete spezifische Heizlast in W/m² für die Selbstprüfung.
 *  Liefert null, wo kein belastbarer Erwartungswert existiert — dann
 *  unterbleibt der Quervergleich, statt gegen eine erfundene Zahl zu prüfen. */
function erwarteteHeizlast(baujahr, gebaeudeart) {
  const j = parseInt(baujahr, 10);
  if (!Number.isFinite(j)) return null;
  const art = String(gebaeudeart || "efh").toLowerCase();
  /* Dieselben zwei Grenzen wie oben: eine Wohngebäudetypologie sagt nichts
     über ein Nichtwohngebäude, und für den Neubau ab 2023 ist der Kennwert
     von 2015 keine Erwartung mehr, sondern eine Fehlmeldung in Serie. */
  if (art === "nwg" || j > GELTUNG_BIS) return null;
  const k = HEIZLAST_KENNWERT.find(function (x) { return j >= x.von && j <= x.bis; });
  if (!k) return null;
  const f = (art === "mfh" || art === "gmh") ? MFH_FAKTOR : 1.0;
  return k.wm2 * f;
}

function selbsttestTypologie() {
  const f = [];
  const t1936 = zumBaujahr(1936);
  if (!t1936 || t1936.code !== "EFH_C") f.push("Baujahr 1936 muss EFH_C treffen");
  if (t1936 && Math.abs(t1936.u.wand - 1.7) > 0.001) f.push("Wand 1919 bis 1948 muss 1,70 sein");
  if (t1936 && Math.abs(t1936.u.dach - 1.4) > 0.001) f.push("Dach 1919 bis 1948 muss 1,40 sein");
  const t2020 = zumBaujahr(2020);
  if (!t2020 || t2020.code !== "EFH_L") f.push("Baujahr 2020 muss EFH_L treffen");
  const t1850 = zumBaujahr(1850);
  if (!t1850 || t1850.code !== "EFH_A") f.push("Baujahr 1850 muss EFH_A treffen");
  const t1960 = zumBaujahr(1960);
  if (!t1960 || !t1960.ersatz) f.push("Nicht hinterlegte Klasse 1960 muss als Ersatz gekennzeichnet sein");
  if (Math.abs(erwarteteHeizlast(1936, "efh") - 115) > 0.01) f.push("Erwartungswert 1936 muss 115 W/m² sein");
  if (Math.abs(erwarteteHeizlast(1936, "mfh") - 115 * 0.88) > 0.01) f.push("MFH-Faktor greift nicht");
  if (zumBaujahr("keine Zahl") !== null) f.push("Ungültiges Baujahr muss null liefern");
  /* Ein Nicht-Jahr darf keine Klasse „nächstgelegen" finden. Zur −1 kam
     bisher die älteste Klasse mit U 2,00 heraus — Abnahmebefund 24.08.2026. */
  if (zumBaujahr(-1) !== null) f.push("Baujahr −1 muss null liefern, nicht die älteste Klasse");
  if (zumBaujahr(0) !== null) f.push("Baujahr 0 muss null liefern");
  if (zumBaujahr(190) !== null) f.push("Ein dreistelliges Baujahr muss null liefern");
  if (zumBaujahr(new Date().getFullYear() + 50) !== null) {
    f.push("Ein Baujahr fünfzig Jahre in der Zukunft muss null liefern");
  }
  if (zumBaujahr(1000) === null) f.push("Baujahr 1000 (Grenze) muss eine Klasse liefern");
  // U-Werte müssen monoton besser werden über die Zeit (grobe Plausibilität)
  const waende = TYPOLOGIE_EFH.filter(function (t) { return t.u.wand != null; });
  if (waende[0].u.wand <= waende[waende.length - 1].u.wand) {
    f.push("Wand-U-Werte müssten über die Baualtersklassen abnehmen");
  }

  /* Die Grenzen der Geltung. Ohne sie stand für einen Neubau 2026 ein Fenster
     mit 1,30 W/(m²·K) grün und mit Fundstelle da. */
  const t2022 = zumBaujahr(2022, "efh");
  if (!t2022 || t2022.gilt !== true) f.push("Baujahr 2022 muss noch gelten");
  const t2023 = zumBaujahr(2023, "efh");
  if (!t2023 || t2023.gilt !== false) f.push("Baujahr 2023 darf nicht mehr gelten");
  if (t2023 && t2023.grund !== "ausserhalb_geltung") {
    f.push("Grund fuer 2023 muss ausserhalb_geltung sein, ist: " + (t2023 && t2023.grund));
  }
  if (t2023 && Object.keys(t2023.u).length) {
    f.push("Ausserhalb der Geltung darf kein einziger U-Wert dastehen");
  }
  if (erwarteteHeizlast(2026, "efh") !== null) {
    f.push("Ohne Geltung darf es auch keinen Erwartungswert geben");
  }
  const tNwg = zumBaujahr(1990, "nwg");
  if (!tNwg || tNwg.gilt !== false || tNwg.grund !== "nichtwohngebaeude") {
    f.push("Eine Wohngebaeudetypologie darf fuer ein Nichtwohngebaeude nicht gelten");
  }
  if (erwarteteHeizlast(1990, "nwg") !== null) {
    f.push("Fuer ein Nichtwohngebaeude darf es keinen Erwartungswert geben");
  }
  /* Die Fundstelle muss die Eingabe wiedergeben, nicht die Tabelle. */
  const tMfh = zumBaujahr(1990, "mfh");
  if (!tMfh || tMfh.reihe_ersatz !== true) f.push("MFH muss als Ersatzreihe gekennzeichnet sein");
  if (tMfh && !/Mehrfamilienh/.test(tMfh.fundstelle)) {
    f.push("Die Fundstelle muss bei MFH sagen, dass die Reihe ersatzweise gilt");
  }
  const tEfh = zumBaujahr(1990, "efh");
  if (tEfh && /Mehrfamilienh/.test(tEfh.fundstelle)) {
    f.push("Bei EFH darf die Fundstelle nicht von Mehrfamilienhaeusern sprechen");
  }
  if (tEfh && !/Klasse 1984 bis 1994/.test(tEfh.fundstelle)) {
    f.push("Die Fundstelle muss die Klasse nennen, ist: " + tEfh.fundstelle);
  }
  /* Ein Etikett, an dem hinten die Jahreszahl fehlt. */
  if (TYPOLOGIE_EFH.some(function (t) { return /\bbis$/.test(t.label); })) {
    f.push("Kein Klassenetikett darf auf ein blankes \"bis\" enden");
  }

  /* STARTWERTE. Jede Klasse, die überhaupt gilt, muss BEIDE Flächen des
     unteren Gebäudeabschlusses hergeben; sonst entsteht ein Bauteil ohne Typ
     und die Fläche fällt still aus der Rechnung oder trägt den falschen
     Namen. Der Ersatz muss dabei sichtbar sein. */
  TYPOLOGIE_EFH.forEach(function (t) {
    const j = t.von || t.bis || 2000;
    const s = startwerte(zumBaujahr(j, "efh"));
    const namen = s.map(function (x) { return x.name; });
    ["Außenwand", "Dach", "Kellerdecke", "Bodenplatte", "Fenster", "Außentür"]
      .forEach(function (n) {
        if (namen.indexOf(n) < 0) f.push("Klasse " + t.code + " ohne Startwert " + n);
      });
    if (namen.length !== 6) f.push("Klasse " + t.code + " liefert " + namen.length
      + " statt 6 Startwerte");
  });
  const sI = startwerte(zumBaujahr(2000, "efh"));
  const bpI = sI.find(function (x) { return x.name === "Bodenplatte"; });
  if (!bpI || bpI.ersatz !== true) f.push("Bodenplatte 1995 bis 2001 muss Ersatz sein");
  if (bpI && Math.abs(bpI.U - 0.45) > 0.001) {
    f.push("Ersatzwert Bodenplatte 1995 bis 2001 muss der Kellerdecke entsprechen");
  }
  if (bpI && !/Beispielgebäude ist unterkellert/.test(bpI.quelle)) {
    f.push("Der Ersatz muss seinen Grund nennen");
  }
  const sL = startwerte(zumBaujahr(2018, "efh"));
  const kdL = sL.find(function (x) { return x.name === "Kellerdecke"; });
  if (!kdL || kdL.ersatz !== true) f.push("Kellerdecke 2016 und später muss Ersatz sein");
  const sD = startwerte(zumBaujahr(1950, "efh"));
  if (sD.some(function (x) { return x.ersatz; })) {
    f.push("Klasse 1949 bis 1957 nennt beide Werte selbst, kein Ersatz erlaubt");
  }

  /* ==================================================================
   * NEUBAU AB 2023 — die Lücke, die 0,00 kW erzeugt hat
   * ==================================================================
   * Hier stand bis zum 24.08.2026 die Zeile „Ohne Geltung darf es keine
   * Startwerte geben". Sie war der Selbsttest zu genau dem Verhalten, das
   * Sebastians Fall auf 0,00 kW gestellt hat: Baujahr 2025 eingetragen,
   * keine Startwerte, kein Bauteiltyp, kein Bauteil, kein Ergebnis.
   * Sie ist umgedreht: es MUSS Startwerte geben, und sie müssen aus dem
   * Referenzgebäude kommen und das auch sagen. */
  const sNeu = startwerte(zumBaujahr(2025, "efh"));
  if (sNeu.length !== 6) {
    f.push("Baujahr 2025 muss 6 Startwerte liefern, liefert " + sNeu.length);
  }
  const soll2025 = { "Außenwand": 0.28, "Dach": 0.20, "Kellerdecke": 0.35,
                     "Bodenplatte": 0.35, "Fenster": 1.3, "Außentür": 1.8 };
  Object.keys(soll2025).forEach(function (n) {
    const x = sNeu.find(function (y) { return y.name === n; });
    if (!x) { f.push("Neubau 2025 ohne Startwert " + n); return; }
    if (Math.abs(x.U - soll2025[n]) > 0.0001) {
      f.push("Neubau 2025: " + n + " muss " + soll2025[n] + " sein, ist " + x.U);
    }
    if (x.anforderung !== true) f.push("Neubau 2025: " + n + " nicht als Anforderung gekennzeichnet");
    if (!/Anlage 1 \(zu § 15 Absatz 1\)/.test(x.quelle)) {
      f.push("Neubau 2025: " + n + " ohne Fundstelle Anlage 1");
    }
    if (!/Nummer \d/.test(x.quelle)) f.push("Neubau 2025: " + n + " ohne Zeilennummer");
    if (!/OBERGRENZE/.test(x.quelle)) {
      f.push("Neubau 2025: " + n + " sagt nicht, dass es eine Obergrenze ist");
    }
    if (x.ersatz) f.push("Neubau 2025: " + n + " darf kein Ersatzwert sein");
  });
  /* Die Grenze sitzt genau zwischen 2022 und 2023 — nicht daneben. */
  const t22 = zumBaujahr(2022, "efh"), t23 = zumBaujahr(2023, "efh");
  if (!t22 || t22.startquelle !== "typologie") f.push("2022 muss aus der Typologie kommen");
  if (!t23 || t23.startquelle !== "neubau_referenz") {
    f.push("2023 muss aus dem Referenzgebaeude kommen");
  }
  if (t23 && Object.keys(t23.u).length) {
    f.push("Ausserhalb der Geltung darf satz.u weiter leer sein");
  }
  /* Nichtwohngebäude: Neubau aus Anlage 2, Bestand als Rückfall — aber nie
     ohne Startwert, sonst steht wieder 0,00 kW da. */
  const sNwgNeu = startwerte(zumBaujahr(2025, "nwg"));
  if (sNwgNeu.length !== 6) f.push("Nichtwohngebaeude 2025 muss 6 Startwerte liefern");
  if (sNwgNeu[0] && !/Anlage 2 \(zu § 18 Absatz 1\)/.test(sNwgNeu[0].quelle)) {
    f.push("Nichtwohngebaeude-Neubau muss Anlage 2 nennen");
  }
  if (sNwgNeu[0] && !/≥ 19 °C/.test(sNwgNeu[0].quelle)) {
    f.push("Nichtwohngebaeude-Neubau muss die angewendete Spalte nennen");
  }
  const sNwgAlt = startwerte(zumBaujahr(1990, "nwg"));
  if (sNwgAlt.length !== 6) f.push("Nichtwohngebaeude 1990 muss 6 Startwerte liefern");
  if (sNwgAlt[0] && sNwgAlt[0].rueckfall !== true) {
    f.push("Nichtwohngebaeude im Bestand muss als Rueckfall gekennzeichnet sein");
  }
  if (sNwgAlt[0] && !/RÜCKFALLWERT/.test(sNwgAlt[0].quelle)) {
    f.push("Der Rueckfall muss sich im Klartext Rueckfallwert nennen");
  }
  /* KEIN BAUJAHR: zumBaujahr bleibt strikt (nichts wird zur Klasse geraten),
     aber die Rechnung bleibt nicht mehr stehen — dafür gibt es die
     ausgewiesene Rückfallklasse ohneBaujahr(). Wer sie NICHT abruft, bekommt
     weiter nichts; das ist Absicht, damit kein Aufrufer still an einen Wert
     kommt, der keine Fundstelle am Objekt hat. */
  if (zumBaujahr(null) !== null) f.push("Ohne Baujahr muss zumBaujahr null liefern");
  if (startwerte(null).length !== 0) f.push("Ohne Satz darf es keine Startwerte geben");
  if (startwerte(zumBaujahr("")).length !== 0) {
    f.push("Ohne auswertbares Baujahr darf zumBaujahr keine Startwerte geben");
  }

  /* ==================================================================
   * RÜCKFALLKLASSE OHNE BAUJAHR — die Sperre, die zur gelben Frage wurde
   * ==================================================================
   * Die Werte müssen exakt die der Klasse EFH_F sein (keine neue Zahl),
   * als Rückfall gekennzeichnet, mit Begründung, Gegenprobe-Fundstelle
   * und der Richtung des Fehlers im Klartext. */
  const oB = ohneBaujahr("efh");
  if (!oB) f.push("ohneBaujahr muss einen Satz liefern");
  if (oB && oB.code !== "EFH_F") f.push("Die Rueckfallklasse muss EFH_F sein, ist: " + (oB && oB.code));
  if (oB && oB.gilt !== false) f.push("Ohne Baujahr darf keine Klasse als belegt gelten");
  if (oB && oB.grund !== "baujahr_unbekannt") {
    f.push("Der Grund muss baujahr_unbekannt sein, ist: " + (oB && oB.grund));
  }
  if (oB && Object.keys(oB.u).length) {
    f.push("Ohne belegte Klasse muss satz.u leer bleiben (Erwartungswert-Schutz)");
  }
  const sOB = startwerte(oB);
  if (sOB.length !== 6) f.push("Ohne Baujahr muss der Rueckfall 6 Startwerte liefern, liefert " + sOB.length);
  const sollOB = { "Außenwand": 1.0, "Dach": 0.5, "Kellerdecke": 1.0,
                   "Bodenplatte": 1.0, "Fenster": 2.8, "Außentür": 3.0 };
  Object.keys(sollOB).forEach(function (n) {
    const x = sOB.find(function (y) { return y.name === n; });
    if (!x) { f.push("Rueckfall ohne Baujahr: Startwert " + n + " fehlt"); return; }
    if (Math.abs(x.U - sollOB[n]) > 0.0001) {
      f.push("Rueckfall ohne Baujahr: " + n + " muss " + sollOB[n] + " sein (EFH_F), ist " + x.U);
    }
    if (x.rueckfall !== true) f.push("Rueckfall ohne Baujahr: " + n + " nicht als Rueckfall gekennzeichnet");
    if (x.ohne_baujahr !== true) f.push("Rueckfall ohne Baujahr: " + n + " traegt die Kennung ohne_baujahr nicht");
    if (!/RÜCKFALLWERT/.test(x.quelle)) f.push("Rueckfall ohne Baujahr: " + n + " nennt sich nicht Rueckfallwert");
    if (!/1969 bis 1978/.test(x.quelle)) f.push("Rueckfall ohne Baujahr: " + n + " nennt die Klasse nicht");
    if (!/Richtung des Fehlers/.test(x.quelle)) {
      f.push("Rueckfall ohne Baujahr: " + n + " nennt die Fehlerrichtung nicht");
    }
    if (!/BAnz AT 04\.12\.2020 B1/.test(x.quelle)) {
      f.push("Rueckfall ohne Baujahr: " + n + " traegt die Gegenprobe-Fundstelle nicht");
    }
  });
  /* Ein Nichtwohngebäude bekommt denselben Rückfall, aber mit dem Behelfs-
     Satz; ein Mehrfamilienhaus den Reihenhinweis. */
  const oBNwg = ohneBaujahr("nwg");
  if (!oBNwg || !/NICHTWOHNGEBÄUDE/.test(oBNwg.fundstelle_startwerte)) {
    f.push("Rueckfall ohne Baujahr fuer NWG muss den Behelf beim Namen nennen");
  }
  const oBMfh = ohneBaujahr("mfh");
  if (!oBMfh || oBMfh.reihe_ersatz !== true
      || !/Mehrfamilienh/.test(oBMfh.fundstelle_startwerte)) {
    f.push("Rueckfall ohne Baujahr fuer MFH muss die Ersatzreihe nennen");
  }
  /* Der Erwartungswert bleibt aus: gegen die eigene Annahme zu pruefen
     waere ein Kreis, kein Vergleich. */
  if (erwarteteHeizlast(null, "efh") !== null) {
    f.push("Ohne Baujahr darf es keinen Erwartungswert geben");
  }
  /* Der Erwartungswert der Selbstprüfung bleibt unangetastet: für einen
     Neubau ab 2023 gibt es keinen, und daran ändert die zweite Quelle
     nichts. Ein Anforderungswert ist kein Verbrauchskennwert. */
  if (erwarteteHeizlast(2025, "efh") !== null) {
    f.push("Fuer 2025 darf es weiter keinen Erwartungswert geben");
  }
  return { ok: f.length === 0, fehler: f,
           anzahl: 22 + TYPOLOGIE_EFH.length * 7 + 6 + 56 + 57 };
}

const DATEN_TYPOLOGIE = {
  TYPOLOGIE_EFH: TYPOLOGIE_EFH, HEIZLAST_KENNWERT: HEIZLAST_KENNWERT,
  zumBaujahr: zumBaujahr, erwarteteHeizlast: erwarteteHeizlast, selbsttest: selbsttestTypologie,
  startwerte: startwerte,
  hatStartwerte: hatStartwerte,
  ohneBaujahr: ohneBaujahr,
  RUECKFALL_OHNE_BAUJAHR_CODE: RUECKFALL_OHNE_BAUJAHR_CODE,
  fundstelle: fundstelleTypologie,
  fundstelleStartwerte: fundstelleStartwerte,
  NEUBAU: NEUBAU, NEUBAU_U: NEUBAU_U,
  NEUBAU_U_NWG_TEILBEHEIZT: NEUBAU_U_NWG_TEILBEHEIZT,
  GELTUNG_BIS: GELTUNG_BIS, REIHE: REIHE,
  quelle: QUELLE + ", " + REIHE + ", Wärmeschutz Variante 1 (Ist-Zustand)",
};
if (typeof module !== "undefined" && module.exports) module.exports = DATEN_TYPOLOGIE;
if (typeof window !== "undefined") window.DATEN_TYPOLOGIE = DATEN_TYPOLOGIE;
