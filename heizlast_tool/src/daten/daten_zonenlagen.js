/* ===========================================================================
 * daten_zonenlagen.js — Temperaturniveau unbeheizter Bereiche nach Lage
 * ===========================================================================
 * Der Rechenkern bestimmt die Temperatur eines unbeheizten Bereichs aus einer
 * stationaeren Waermebilanz. Das ist der Normweg und bleibt der Vorgabewert.
 * Wer das Gebaeude kennt, weiss aber oft besser, woran er ist: ein Keller mit
 * dem Waermeerzeuger darin ist waermer als die Bilanz sagt, ein offener
 * Spitzboden kaelter. Dafuer gibt es hier eine Auswahl nach Lage.
 *
 * Ein Bearbeiter denkt in Lagen, nicht in Grad. Die Norm rechnet dagegen mit
 * einem Temperaturanpassungsfaktor f_1. Beides haengt zusammen ueber
 *
 *     f_1 = (theta_int - theta_u) / (theta_int - theta_e)
 *     theta_u = theta_int - f_1 * (theta_int - theta_e)
 *
 * mit theta_int der Norm-Innentemperatur des angrenzenden beheizten Raums und
 * theta_e der Norm-Aussentemperatur am Standort. Gegenprobe aus der Quelle
 * (Jagnow/Wolff, Abschnitt Temperaturkorrekturfaktor): theta_int = 20 Grad C,
 * theta_u = 5 Grad C, theta_e = -10 Grad C ergibt f_x = 15/30 = 0,5. Genau das
 * liefert theta_aus_f1(0.5, 20, -10) = 5. Steht im Selbsttest.
 *
 * ---------------------------------------------------------------------------
 * HERKUNFT DER WERTE
 * ---------------------------------------------------------------------------
 * Massgebend ist DIN/TS 12831-1:2020-04 (Nationale Ergaenzung zu
 * DIN EN 12831-1:2017-09), dort
 *   Tabelle 4  Anhaltswerte fuer Temperaturen angrenzender Mehrfamilienhaeuser
 *   Tabelle 5  pauschale Temperaturanpassungsfaktoren f_1 unbeheizter Bereiche
 *              (34 Faelle)
 *   Tabelle 6  Mindesttemperatur theta_u,min
 *   Tabelle 7  Randbedingungen der Waermebilanz
 *
 * Der Normtext selbst lag bei der Erstellung NICHT vor. Jeder Zahlenwert unten
 * ist deshalb ueber eine benannte Sekundaerquelle belegt, die die jeweilige
 * Normtabelle ausdruecklich zitiert:
 *
 *   [M]  Markert, "Praxis Heizlastberechnung. Grundlagen,
 *        Berechnungsverfahren", DIN Media, ISBN 978-3-410-29289-0,
 *        Abschnitt 4.2.2.1, Tabelle 14 "Vergleich Temperaturkorrekturfaktoren
 *        (Auszug)", Spalte "DIN/TS 12831-1:2020-04, Tabelle 5"; sowie
 *        Abschnitt 4.2.2.2, Tabelle 15 zu DIN/TS 12831-1 Tabelle 4 und
 *        Tabelle 16 zu DIN/TS 12831-1 Tabelle 6.
 *        Leseprobe: api.pageplace.de/preview/DT0400.9783410292890_A40391712/
 *        preview-9783410292890_A40391712.pdf
 *   [J]  Jagnow/Wolff, Manuskript fuer Recknagel/Sprenger "Taschenbuch fuer
 *        Heizung und Klimatechnik", Ausgabe 2020, Tafel 0-6 "Standardwerte
 *        fuer Temperaturkorrekturfaktor an unbeheizte Raeume" (Auszug aus
 *        DIN/TS 12831-1) und Tafel 0-5.
 *        delta-q.de/wp-content/uploads/Heizlastberechnung_2019.pdf
 *   [Z]  ZUB HELENA HEIZLAST, Handbuch "Raumweise Heizlastberechnung nach
 *        DIN EN 12831-1 und DIN/TS 12831-1", Stand 29.11.2022, Abschnitt 5.1
 *        (Wortlaut der Zeilengruppen von DIN/TS 12831-1 Tabelle 5) und
 *        Abschnitt 6.5.4 (Tabelle 2 zu DIN/TS 12831-1 Tabelle 4, Tabelle 3 zu
 *        Tabelle 6). zub-systems.de/sites/default/files/2022-11/
 *        Handbuch ZUB Heizlast.pdf
 *
 * stufe sagt, wie fest der Wert steht:
 *   "zwei_quellen"  in [M] UND [J] mit gleichem Wert gefunden
 *   "eine_quelle"   nur in einer der beiden Sekundaerquellen gefunden
 *   "erfahrung"     nicht belegbar, Erfahrungswert (kommt hier nicht vor)
 * Keine Lage in dieser Liste ist frei geschaetzt. Was nicht belegt war, ist
 * nicht aufgenommen worden: fuer eine Garage etwa gibt es in Tabelle 5 keine
 * eigene Zeile, sie faellt unter "allgemeine Raeume, Vor-/Anbauten" und wird
 * dort ueber die Zahl der Aussenwaende getroffen. Deshalb steht die Garage
 * nur als Beispiel an den belegten Zeilen, nicht als eigener Wert.
 *
 * Bereichswerte (f1_min/f1_max): Tabelle 5 gibt fuer einige Zeilen eine
 * Spanne an. Vorbelegt wird der OBERE Rand. Ein groesseres f_1 bedeutet eine
 * kaeltere Zone, also einen groesseren Waermestrom und eine hoehere Heizlast.
 * Das ist die fuer die Auslegung sichere Seite. Der Bearbeiter darf innerhalb
 * der Spanne frei waehlen.
 * =========================================================================== */

"use strict";

/* --- Umrechnung ---------------------------------------------------------- */
/** theta_u aus dem Temperaturanpassungsfaktor f_1.
 *  theta_bezug ist die Norm-Innentemperatur des angrenzenden beheizten Raums
 *  (Regelwert 20 Grad C fuer Aufenthaltsraeume), theta_e die
 *  Norm-Aussentemperatur am Standort. */
function theta_aus_f1(f1, theta_bezug, theta_e) {
  const f = Number(f1), tb = Number(theta_bezug), te = Number(theta_e);
  if (!Number.isFinite(f) || !Number.isFinite(tb) || !Number.isFinite(te)) return NaN;
  return tb - f * (tb - te);
}

/** Rueckrichtung: f_1 aus einer bekannten Temperatur. Dient der Anzeige,
 *  wenn der Bearbeiter eine Temperatur unmittelbar vorgibt. */
function f1_aus_theta(theta_u, theta_bezug, theta_e) {
  const tu = Number(theta_u), tb = Number(theta_bezug), te = Number(theta_e);
  if (!Number.isFinite(tu) || !Number.isFinite(tb) || !Number.isFinite(te)) return NaN;
  if (Math.abs(tb - te) < 1e-9) return NaN;
  return (tb - tu) / (tb - te);
}

/* --- Die Lagen ----------------------------------------------------------- */
/* gruppe   Ueberschrift in der Auswahl
 * name     was der Bearbeiter liest
 * beispiel Klartext dazu, damit man die Zeile wiedererkennt
 * f1       Vorbelegung; bei Spannen zugleich f1_max
 * norm_zeile  Wortlaut der Zeile in DIN/TS 12831-1 Tabelle 5 bzw. Tabelle 4
 * quelle   Kurzzeichen der Sekundaerquellen, siehe Kopf
 * fundstelle  ausgeschriebene Fundstelle fuer den Bericht           */
const LAGEN = [
  /* ---- Keller ---------------------------------------------------------- */
  {
    id: "keller_ohne_oeffnung", gruppe: "Keller",
    name: "Keller, unbeheizt, ohne Türen oder Fenster nach außen",
    beispiel: "Kellerräume ganz im Erdreich, nur Lichtschächte",
    f1: 0.40, stufe: "eine_quelle", quelle: ["J"],
    norm_zeile: "Kellerräume, ohne Türen/Fenster nach außen",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile "
      + "„Kellerräume, ohne Türen/Fenster nach außen“; wiedergegeben bei "
      + "Jagnow/Wolff, Recknagel/Sprenger-Manuskript 2020, Tafel 0-6",
  },
  {
    id: "keller_mit_oeffnung", gruppe: "Keller",
    name: "Keller, unbeheizt, außen liegend, mit Fenstern oder Tür nach außen",
    beispiel: "Kellerräume am Hang, Kellerabgang ins Freie",
    f1: 0.50, stufe: "eine_quelle", quelle: ["J"],
    norm_zeile: "Kellerräume, mit Türen/Fenstern nach außen",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile "
      + "„Kellerräume, mit Türen/Fenstern nach außen“; wiedergegeben bei "
      + "Jagnow/Wolff, Recknagel/Sprenger-Manuskript 2020, Tafel 0-6",
  },
  {
    id: "heizungsaufstellraum", gruppe: "Keller",
    name: "Keller mit Heizungsanlage (Heizraum, Technikraum)",
    beispiel: "Raum mit Wärmeerzeuger, Speicher oder Verteilung darin",
    f1: 0.20, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "Heizungsaufstellräume",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile "
      + "„Heizungsaufstellräume“; wiedergegeben bei Markert, Praxis "
      + "Heizlastberechnung, Tabelle 14, und bei Jagnow/Wolff, "
      + "Recknagel/Sprenger-Manuskript 2020, Tafel 0-6",
  },

  /* ---- Dachraum -------------------------------------------------------- */
  {
    id: "dach_kalt", gruppe: "Dachraum",
    name: "Spitzboden oder Kaltdach, offen bzw. stark belüftet",
    beispiel: "Dachraum unter Ziegeln ohne dichte Unterspannbahn",
    f1: 1.00, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "Dachböden, Abseiten: offene bzw. stark belüftete Dächer, Kaltdächer",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile "
      + "„Dachböden, Abseiten: offene bzw. stark belüftete Dächer, "
      + "Kaltdächer“; wiedergegeben bei Markert, Praxis Heizlastberechnung, "
      + "Tabelle 14, und bei Jagnow/Wolff, Recknagel/Sprenger-Manuskript 2020, "
      + "Tafel 0-6",
  },
  {
    id: "dach_geschlossen_undicht", gruppe: "Dachraum",
    name: "Dachraum, geschlossenes Dach, undicht",
    beispiel: "Dachhaut geschlossen, aber Fugen und offene Anschlüsse",
    f1: 0.90, f1_min: 0.80, f1_max: 0.90, stufe: "eine_quelle", quelle: ["J"],
    norm_zeile: "Dachböden, Abseiten: geschlossene Dächer, undicht (0,8 bis 0,9)",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile "
      + "„Dachböden, Abseiten: geschlossene Dächer, undicht“, dort 0,8 bis "
      + "0,9; wiedergegeben bei Jagnow/Wolff, Recknagel/Sprenger-Manuskript "
      + "2020, Tafel 0-6",
  },
  {
    id: "dach_geschlossen_dicht", gruppe: "Dachraum",
    name: "Dachraum, geschlossenes Dach, dicht",
    beispiel: "dichte Dachhaut über gedämmter oberster Geschossdecke",
    f1: 0.90, f1_min: 0.40, f1_max: 0.90, stufe: "eine_quelle", quelle: ["J"],
    norm_zeile: "Dachböden, Abseiten: geschlossene Dächer, dicht (0,4 bis 0,9)",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile "
      + "„Dachböden, Abseiten: geschlossene Dächer, dicht“, dort 0,4 bis "
      + "0,9; wiedergegeben bei Jagnow/Wolff, Recknagel/Sprenger-Manuskript "
      + "2020, Tafel 0-6",
  },

  /* ---- Treppenhaus ----------------------------------------------------- */
  {
    id: "treppenhaus_aussen", gruppe: "Treppenhaus",
    name: "Unbeheiztes Treppenhaus, außen liegend",
    beispiel: "Treppenhaus mit eigenen Außenwänden über mehrere Geschosse",
    f1: 0.80, stufe: "zwei_quellen", quelle: ["J", "M"],
    norm_zeile: "Treppenhäuser, außenliegend",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile „Treppenhäuser, "
      + "außenliegend“; wiedergegeben bei Jagnow/Wolff, "
      + "Recknagel/Sprenger-Manuskript 2020, Tafel 0-6. Derselbe Wert 0,8 "
      + "steht bei Markert, Praxis Heizlastberechnung, Tabelle 14 in der Zeile "
      + "„mit drei oder mehr Außenwänden“, dort ausdrücklich einschließlich "
      + "außenliegender Treppenhäuser",
  },
  {
    id: "treppenhaus_innen", gruppe: "Treppenhaus",
    name: "Unbeheiztes Treppenhaus, innen liegend",
    beispiel: "Treppenhaus ohne eigene Außenwand, von Wohnungen umschlossen",
    f1: 0.65, f1_min: 0.25, f1_max: 0.65, stufe: "eine_quelle", quelle: ["J"],
    norm_zeile: "Treppenhäuser, innenliegend (0,25 bis 0,65)",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile „Treppenhäuser, "
      + "innenliegend“, dort 0,25 bis 0,65; wiedergegeben bei Jagnow/Wolff, "
      + "Recknagel/Sprenger-Manuskript 2020, Tafel 0-6",
  },

  /* ---- allgemeine Raeume, Vor- und Anbauten ---------------------------- */
  /* Wortlaut der Zeilengruppe nach [Z]: "allgemeine Räume (außer nachfolgend
     aufgeführte), Vor-/Anbauten, Etagenflure". Die Zahlenwerte nach [M],
     Tabelle 14. Hier liegt der Fall Garage: sie hat in Tabelle 5 keine eigene
     Zeile, sondern wird ueber die Zahl der Aussenwaende getroffen. */
  {
    id: "allg_ohne_aussenwand", gruppe: "Allgemeiner Raum, Vor- oder Anbau",
    name: "innen liegend, ohne Außenwand",
    beispiel: "Abstellraum, Etagenflur ohne Außenwand",
    f1: 0.10, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "allgemeine Räume, Vor-/Anbauten, Etagenflure: ohne Außenwand",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeilengruppe "
      + "„allgemeine Räume (außer nachfolgend aufgeführte), Vor-/Anbauten, "
      + "Etagenflure“, Zeile „ohne Außenwand“; wiedergegeben bei Markert, "
      + "Praxis Heizlastberechnung, Tabelle 14 (Wortlaut der Zeilengruppe nach "
      + "ZUB HELENA HEIZLAST, Handbuch 2022, Abschnitt 5.1)",
  },
  {
    id: "allg_1aw", gruppe: "Allgemeiner Raum, Vor- oder Anbau",
    name: "eine Außenwand, ohne Türen oder Fenster nach außen",
    beispiel: "Windfang, Abstellraum mit einer Außenwand",
    f1: 0.40, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "allgemeine Räume: mit einer Außenwand, ohne Türen/Fenster nach außen",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeilengruppe "
      + "„allgemeine Räume, Vor-/Anbauten, Etagenflure“, Zeile „mit einer "
      + "Außenwand, ohne Türen/Fenster nach außen“; wiedergegeben bei "
      + "Markert, Praxis Heizlastberechnung, Tabelle 14",
  },
  {
    id: "allg_1aw_oeffnung", gruppe: "Allgemeiner Raum, Vor- oder Anbau",
    name: "eine Außenwand, mit Türen oder Fenstern nach außen",
    beispiel: "Windfang mit Haustür, Garage im Untergeschoss mit Tor",
    f1: 0.50, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "allgemeine Räume: mit einer Außenwand, mit Türen/Fenster nach außen",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeilengruppe "
      + "„allgemeine Räume, Vor-/Anbauten, Etagenflure“, Zeile „mit einer "
      + "Außenwand, mit Türen/Fenster nach außen“; wiedergegeben bei Markert, "
      + "Praxis Heizlastberechnung, Tabelle 14",
  },
  {
    id: "allg_2aw", gruppe: "Allgemeiner Raum, Vor- oder Anbau",
    name: "zwei Außenwände, ohne Türen oder Fenster nach außen",
    beispiel: "Anbau über Eck, geschlossen",
    f1: 0.50, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "allgemeine Räume: mit zwei Außenwänden, ohne Türen/Fenster nach außen",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeilengruppe "
      + "„allgemeine Räume, Vor-/Anbauten, Etagenflure“, Zeile „mit zwei "
      + "Außenwänden, ohne Türen/Fenster nach außen“; wiedergegeben bei "
      + "Markert, Praxis Heizlastberechnung, Tabelle 14",
  },
  {
    id: "allg_2aw_oeffnung", gruppe: "Allgemeiner Raum, Vor- oder Anbau",
    name: "zwei Außenwände, mit Türen oder Fenstern nach außen",
    beispiel: "Anbau über Eck mit Tür ins Freie",
    f1: 0.60, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "allgemeine Räume: mit zwei Außenwänden, mit Türen/Fenster nach außen",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeilengruppe "
      + "„allgemeine Räume, Vor-/Anbauten, Etagenflure“, Zeile „mit zwei "
      + "Außenwänden, mit Türen/Fenster nach außen“; wiedergegeben bei "
      + "Markert, Praxis Heizlastberechnung, Tabelle 14",
  },
  {
    id: "allg_3aw", gruppe: "Allgemeiner Raum, Vor- oder Anbau",
    name: "drei oder mehr Außenwände",
    beispiel: "angebaute Garage, freistehender Anbau",
    f1: 0.80, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "allgemeine Räume: mit drei oder mehr Außenwänden",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeilengruppe "
      + "„allgemeine Räume, Vor-/Anbauten, Etagenflure“, Zeile „mit drei "
      + "oder mehr Außenwänden“; wiedergegeben bei Markert, Praxis "
      + "Heizlastberechnung, Tabelle 14. Eine eigene Zeile für Garagen gibt es "
      + "in Tabelle 5 nicht; eine angebaute Garage fällt unter die Vor- und "
      + "Anbauten und wird über die Zahl der Außenwände getroffen",
  },

  /* ---- Boden ----------------------------------------------------------- */
  {
    id: "boden_kriechraum", gruppe: "Boden",
    name: "Aufgeständerter Boden über Kriechraum",
    beispiel: "belüfteter Kriechkeller unter der Bodenplatte",
    f1: 0.80, stufe: "zwei_quellen", quelle: ["M", "J"],
    norm_zeile: "Aufgeständerter Boden über Kriechraum",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 5, Zeile „Aufgeständerter "
      + "Boden über Kriechraum“; wiedergegeben bei Markert, Praxis "
      + "Heizlastberechnung, Tabelle 14, und bei Jagnow/Wolff, "
      + "Recknagel/Sprenger-Manuskript 2020, Tafel 0-6",
  },

  /* ---- angrenzende Nutzungseinheit: unmittelbare Temperatur ------------- */
  /* DIN/TS 12831-1 Tabelle 4 gibt hier keine Faktoren, sondern Temperaturen.
     Sie sind vom Standortklima unabhaengig und werden deshalb als theta_fix
     gefuehrt. */
  {
    id: "nachbar_bis1979", gruppe: "Angrenzende Wohnung oder Nachbargebäude",
    name: "Nachbarbereich, keine oder geringe Dämmung (üblich bis 1979)",
    beispiel: "unsanierte Nachbarwohnung, Nachbargebäude im Altbestand",
    theta_fix: 12.0, stufe: "zwei_quellen", quelle: ["M", "Z"],
    norm_zeile: "keine/geringe Dämmung, üblich bis 1979",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 4 „Anhaltswerte für "
      + "Temperaturen angrenzender Mehrfamilienhäuser“; wiedergegeben bei "
      + "Markert, Praxis Heizlastberechnung, Tabelle 15 (dort „üblich bis "
      + "1979“) und im ZUB-HELENA-Handbuch 2022, Tabelle 2 (dort „üblich bis "
      + "1976“). Die Jahreszahl weicht zwischen beiden Wiedergaben ab, der "
      + "Temperaturwert 12 °C nicht",
  },
  {
    id: "nachbar_1980_1995", gruppe: "Angrenzende Wohnung oder Nachbargebäude",
    name: "Nachbarbereich, mittlere Dämmung (üblich 1980 bis 1995)",
    beispiel: "Nachbargebäude aus den 1980er Jahren",
    theta_fix: 14.0, stufe: "zwei_quellen", quelle: ["M", "Z"],
    norm_zeile: "mittlere Dämmung, üblich 1980 bis 1995",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 4; wiedergegeben bei Markert, "
      + "Praxis Heizlastberechnung, Tabelle 15, und im ZUB-HELENA-Handbuch "
      + "2022, Tabelle 2",
  },
  {
    id: "nachbar_ab1995", gruppe: "Angrenzende Wohnung oder Nachbargebäude",
    name: "Nachbarbereich, Dämmung nach Wärmeschutzverordnung 1995 oder besser",
    beispiel: "Neubau oder energetisch sanierter Nachbarbereich",
    theta_fix: 16.0, stufe: "zwei_quellen", quelle: ["M", "Z"],
    norm_zeile: "Dämmung nach Wärmeschutzverordnung 1995 oder besser",
    fundstelle: "DIN/TS 12831-1:2020-04, Tabelle 4; wiedergegeben bei Markert, "
      + "Praxis Heizlastberechnung, Tabelle 15, und im ZUB-HELENA-Handbuch "
      + "2022, Tabelle 2",
  },
];

const NACH_ID = {};
LAGEN.forEach(function (l) { NACH_ID[l.id] = l; });

/** Eine Lage nachschlagen. Unbekannte id ergibt null, nie einen Notwert. */
function finde(id) {
  return (id && NACH_ID[id]) ? NACH_ID[id] : null;
}

/* --- Von der Beschriftung im Plan zur Lage --------------------------------
 * Ein Bereich, den der Plan beim Namen nennt, muss sich anlegen lassen, ohne
 * dass jemand erst in dieser Tabelle nachschlaegt. Genau daran hing es
 * bisher: der Knopf "als unbeheizten Bereich anlegen" erzeugte eine Zone
 * ohne Lage und ohne eigene Huellbauteile. Der Bilanzweg besteht dann allein
 * aus den angrenzenden beheizten Raeumen, ergibt deren Innentemperatur und
 * damit 0 W durch die trennende Decke. Der Bereich war angelegt und die
 * Rechnung blieb dieselbe -- eine Zone, die nirgends ankommt.
 *
 * Die Zuordnung ist bewusst grobkoernig: sie trifft die GRUPPE aus
 * DIN/TS 12831-1 Tabelle 5, nicht die Feinheit darin. Wo mehrere Zeilen in
 * Frage kommen, wird die KAELTERE genommen; ein kaelterer unbeheizter
 * Bereich ergibt einen groesseren Waermestrom und damit die fuer die
 * Auslegung sichere Seite.
 *
 * Jede Zuordnung ist eine ANNAHME. Wer sie benutzt, muss sie als solche
 * kennzeichnen (lage_angenommen) und die Fundstelle mitfuehren. Was sich
 * nicht einordnen laesst, ergibt null -- dann wird nicht geraten.
 *
 * Reihenfolge ist bedeutsam: "Kriechkeller" enthaelt "Keller" und muss
 * vorher greifen.                                                          */
const BEREICH_ZU_LAGE = [
  { re: /kriechkeller|kriechraum/i, lage: "boden_kriechraum",
    warum: "Boden über einem Kriechraum" },
  { re: /spitzboden|dachraum|dachboden(?!treppe)|abseite|kaltdach|speicher/i,
    lage: "dach_geschlossen_undicht",
    warum: "geschlossener, nicht luftdichter Dachraum" },
  { re: /keller|untergeschoss|souterrain/i, lage: "keller_mit_oeffnung",
    warum: "Keller mit Fenstern oder Tür nach außen" },
  { re: /treppenhaus|treppenraum/i, lage: "treppenhaus_aussen",
    warum: "außen liegendes, unbeheiztes Treppenhaus" },
  { re: /garage|carport|tiefgarage|stellplatz|scheune|stall|schuppen|remise/i,
    lage: "allg_3aw",
    warum: "Vor- oder Anbau mit drei oder mehr Außenwänden; die Garage hat in "
      + "Tabelle 5 keine eigene Zeile und wird über die Zahl der Außenwände "
      + "getroffen" },
];

/** Die Lage, die zu einer Beschriftung im Plan passt — oder null.
 *  Rueckgabe traegt alles mit, was die aufrufende Stelle braucht, um die
 *  Annahme zu benennen: Kennung, Klartext, Begruendung und Fundstelle. */
function lageFuerBereich(bezeichnung) {
  const t = String(bezeichnung || "");
  if (!t.trim()) return null;
  const tr = BEREICH_ZU_LAGE.find(function (x) { return x.re.test(t); });
  if (!tr) return null;
  const l = finde(tr.lage);
  if (!l) return null;
  return { lage: l.id, name: l.name, gruppe: l.gruppe, warum: tr.warum,
           f1: l.f1, stufe: l.stufe, fundstelle: l.fundstelle, angenommen: true };
}

/** Gruppen in der Reihenfolge der Liste, fuer die Auswahl im Werkzeug. */
function gruppen() {
  const namen = [], nach = {};
  LAGEN.forEach(function (l) {
    if (!nach[l.gruppe]) { nach[l.gruppe] = []; namen.push(l.gruppe); }
    nach[l.gruppe].push(l);
  });
  return namen.map(function (n) { return { gruppe: n, lagen: nach[n] }; });
}

/** Die massgebende Temperatur einer gewaehlten Lage.
 *  f1_eigen erlaubt es, innerhalb einer Spanne einen anderen Wert zu setzen.
 *  Rueckgabe traegt alles mit, was der Bericht spaeter braucht. */
function temperatur(id, theta_bezug, theta_e, f1_eigen) {
  const l = finde(id);
  if (!l) return null;
  if (Number.isFinite(Number(l.theta_fix))) {
    return {
      id: l.id, name: l.name, gruppe: l.gruppe, theta: Number(l.theta_fix),
      f1: null, f1_bereich: null, aus_bereich: false,
      stufe: l.stufe, fundstelle: l.fundstelle, norm_zeile: l.norm_zeile,
      art: "temperatur",
    };
  }
  const hatBereich = Number.isFinite(Number(l.f1_min)) && Number.isFinite(Number(l.f1_max));
  let f1 = Number.isFinite(Number(f1_eigen)) ? Number(f1_eigen) : Number(l.f1);
  if (hatBereich) f1 = Math.min(Math.max(f1, Number(l.f1_min)), Number(l.f1_max));
  return {
    id: l.id, name: l.name, gruppe: l.gruppe,
    theta: theta_aus_f1(f1, theta_bezug, theta_e),
    f1: f1, f1_bereich: hatBereich ? [Number(l.f1_min), Number(l.f1_max)] : null,
    aus_bereich: hatBereich,
    stufe: l.stufe, fundstelle: l.fundstelle, norm_zeile: l.norm_zeile,
    art: "faktor",
  };
}

/* --- Selbsttest ---------------------------------------------------------- */
function selbsttestZonenlagen() {
  const f = [];
  let n = 0;
  const pruefe = function (name, ist, soll, tol) {
    n++;
    if (!Number.isFinite(ist) || Math.abs(ist - soll) > tol) {
      f.push(name + ": ist " + ist + ", soll " + soll);
    }
  };

  // 1 Gegenprobe aus der Quelle: f_x = (20-5)/(20-(-10)) = 0,5
  pruefe("Umrechnung f1 nach theta", theta_aus_f1(0.5, 20, -10), 5.0, 1e-9);
  pruefe("Umrechnung theta nach f1", f1_aus_theta(5, 20, -10), 0.5, 1e-9);
  // f1 = 1,0 muss genau die Aussentemperatur ergeben
  pruefe("f1 gleich eins ergibt Aussenluft", theta_aus_f1(1.0, 20, -12), -12, 1e-9);
  // f1 = 0 muss die Bezugstemperatur ergeben
  pruefe("f1 gleich null ergibt Bezugstemperatur", theta_aus_f1(0, 20, -12), 20, 1e-9);

  // 2 Belegte Einzelwerte aus DIN/TS 12831-1 Tabelle 5
  n++;
  if (finde("heizungsaufstellraum").f1 !== 0.20) f.push("Heizungsaufstellraum muss f1 = 0,20 haben");
  n++;
  if (finde("keller_ohne_oeffnung").f1 !== 0.40) f.push("Keller ohne Öffnung muss f1 = 0,40 haben");
  n++;
  if (finde("keller_mit_oeffnung").f1 !== 0.50) f.push("Keller mit Öffnung muss f1 = 0,50 haben");
  n++;
  if (finde("dach_kalt").f1 !== 1.00) f.push("Kaltdach muss f1 = 1,00 haben");
  n++;
  if (finde("boden_kriechraum").f1 !== 0.80) f.push("Boden über Kriechraum muss f1 = 0,80 haben");
  n++;
  if (finde("allg_3aw").f1 !== 0.80) f.push("drei oder mehr Außenwände muss f1 = 0,80 haben");

  // 3 Heizraum ist waermer als ein normaler Keller, Kaltdach ist am kaeltesten
  const tHeiz = temperatur("heizungsaufstellraum", 20, -10).theta;   // 20 - 0,2*30 = 14
  const tKell = temperatur("keller_mit_oeffnung", 20, -10).theta;    // 20 - 0,5*30 = 5
  const tDach = temperatur("dach_kalt", 20, -10).theta;              // 20 - 1,0*30 = -10
  pruefe("Heizraum bei 20/-10", tHeiz, 14.0, 1e-9);
  pruefe("Keller bei 20/-10", tKell, 5.0, 1e-9);
  pruefe("Kaltdach bei 20/-10", tDach, -10.0, 1e-9);
  n++;
  if (!(tHeiz > tKell && tKell > tDach)) f.push("Reihenfolge Heizraum > Keller > Kaltdach verletzt");

  // 4 Unmittelbare Temperaturen nach Tabelle 4 haengen nicht vom Klima ab
  const a = temperatur("nachbar_bis1979", 20, -10);
  const b = temperatur("nachbar_bis1979", 24, -16);
  pruefe("Nachbarbereich bis 1979", a.theta, 12.0, 1e-9);
  n++;
  if (a.theta !== b.theta) f.push("Temperatur nach Tabelle 4 darf nicht vom Klima abhängen");

  // 5 Spanne: Vorbelegung ist der obere Rand, Werte werden hineingezwungen
  const d = temperatur("dach_geschlossen_dicht", 20, -10);
  n++;
  if (d.f1 !== 0.90) f.push("Vorbelegung einer Spanne muss der obere Rand sein");
  n++;
  if (temperatur("dach_geschlossen_dicht", 20, -10, 0.10).f1 !== 0.40) {
    f.push("Ein Wert unter der Spanne muss auf den unteren Rand begrenzt werden");
  }
  n++;
  if (temperatur("dach_geschlossen_dicht", 20, -10, 9).f1 !== 0.90) {
    f.push("Ein Wert über der Spanne muss auf den oberen Rand begrenzt werden");
  }
  n++;
  if (temperatur("dach_kalt", 20, -10, 0.3).f1 !== 0.30) {
    f.push("Ohne Spanne muss ein eigener Faktor unverändert durchgehen");
  }

  // 6 Unbekannte Lage darf keinen Notwert erfinden
  n++;
  if (finde("gibt_es_nicht") !== null) f.push("Unbekannte Lage muss null ergeben");
  n++;
  if (temperatur("gibt_es_nicht", 20, -10) !== null) f.push("Unbekannte Lage darf keine Temperatur liefern");

  // 7 Jede Lage ist vollstaendig und belegt, keine erfundene Zahl
  LAGEN.forEach(function (l) {
    n++;
    const hatWert = Number.isFinite(Number(l.f1)) || Number.isFinite(Number(l.theta_fix));
    if (!l.id || !l.name || !l.gruppe || !hatWert) f.push("Lage unvollständig: " + l.id);
    if (!l.fundstelle || l.fundstelle.length < 30) f.push("Lage ohne Fundstelle: " + l.id);
    if (["zwei_quellen", "eine_quelle", "erfahrung"].indexOf(l.stufe) < 0) {
      f.push("Lage ohne gültige Belegstufe: " + l.id);
    }
    if (l.stufe === "erfahrung" && l.fundstelle.indexOf("Erfahrungswert") < 0) {
      f.push("Erfahrungswert muss als solcher benannt sein: " + l.id);
    }
    if (Number.isFinite(Number(l.f1_min)) !== Number.isFinite(Number(l.f1_max))) {
      f.push("Spanne nur halb angegeben: " + l.id);
    }
    if (Number.isFinite(Number(l.f1_min)) && Number(l.f1) !== Number(l.f1_max)) {
      f.push("Vorbelegung einer Spanne muss dem oberen Rand entsprechen: " + l.id);
    }
  });

  /* 7a Von der Beschriftung zur Lage. Jede Zuordnung muss auf eine Zeile
        zeigen, die es gibt, und was sich nicht einordnen laesst, darf keinen
        Notwert bekommen. */
  [["SPITZBODEN", "dach_geschlossen_undicht"],
   ["Unbeheizter Dachraum", "dach_geschlossen_undicht"],
   ["Abseite hinter der Drempelwand", "dach_geschlossen_undicht"],
   ["KELLERGESCHOSS", "keller_mit_oeffnung"],
   ["Kriechkeller", "boden_kriechraum"],
   ["GARAGE", "allg_3aw"],
   ["Carport", "allg_3aw"],
   ["Treppenhaus", "treppenhaus_aussen"]].forEach(function (x) {
    n++;
    const t = lageFuerBereich(x[0]);
    if (!t || t.lage !== x[1]) {
      f.push("„" + x[0] + "“ muss auf " + x[1] + " führen, ist: "
        + (t ? t.lage : "nichts"));
    }
    n++;
    if (t && (!t.fundstelle || t.angenommen !== true)) {
      f.push("Zuordnung ohne Fundstelle oder ohne Kennzeichnung als Annahme: " + x[0]);
    }
  });
  n++;
  if (lageFuerBereich("WOHNZIMMER") !== null) {
    f.push("Ein gewöhnlicher Raumname darf keine Lage ergeben");
  }
  n++;
  if (lageFuerBereich("") !== null || lageFuerBereich(null) !== null) {
    f.push("Ohne Beschriftung darf keine Lage herauskommen");
  }
  /* Die kaeltere Zeile ist die sichere Seite: der Dachraum muss kaelter sein
     als der Keller, sonst waere die Annahme zu guenstig gewaehlt. */
  n++;
  if (!(finde(lageFuerBereich("Spitzboden").lage).f1
        > finde(lageFuerBereich("Keller").lage).f1)) {
    f.push("Der angenommene Dachraum muss kälter sein als der angenommene Keller");
  }

  // 8 Keine doppelten Kennungen
  n++;
  if (Object.keys(NACH_ID).length !== LAGEN.length) f.push("Doppelte Kennung in der Lagenliste");

  // 9 Gruppen decken alle Lagen ab
  n++;
  let summe = 0;
  gruppen().forEach(function (g) { summe += g.lagen.length; });
  if (summe !== LAGEN.length) f.push("Gruppierung verliert Lagen");

  return { ok: f.length === 0, fehler: f, anzahl: n };
}

const DATEN_ZONENLAGEN = {
  LAGEN: LAGEN,
  finde: finde, gruppen: gruppen, temperatur: temperatur,
  lageFuerBereich: lageFuerBereich,
  theta_aus_f1: theta_aus_f1, f1_aus_theta: f1_aus_theta,
  selbsttest: selbsttestZonenlagen,
};
if (typeof module !== "undefined" && module.exports) module.exports = DATEN_ZONENLAGEN;
if (typeof window !== "undefined") window.DATEN_ZONENLAGEN = DATEN_ZONENLAGEN;
