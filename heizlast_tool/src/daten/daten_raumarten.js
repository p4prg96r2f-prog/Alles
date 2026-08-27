/* ===========================================================================
 * daten_raumarten.js — Norm-Innentemperaturen und Mindestluftwechsel
 * ===========================================================================
 * QUELLENKENNZEICHNUNG je Eintrag:
 *   belegt: true   Wert stammt aus einer im Haus geprüften Quelle
 *                  (Feld "quelle" nennt sie). Wird ohne Warnung verwendet.
 *   belegt: false  Üblicher Vorschlagswert. Das Tool markiert ihn im Bericht
 *                  als Annahme und verlangt eine Bestätigung.
 *
 * ZITAT UND AUSLEGUNG SIND GETRENNTE FELDER
 * Vorher stand beides in einem String: "Tab. 32 Zeile 7 (unbekleidete
 * Nutzung); n_min Bad mit Fenster". Der Klammerzusatz steht so nicht im
 * Normtext, und die genannte Zeile gilt der Innentemperatur, nicht dem
 * Mindestluftwechsel. Ein Sachverständiger liest das als Zitat und findet
 * es dort nicht wieder. Deshalb vier Felder statt einem:
 *   quelle           die Fundstelle der Norm-Innentemperatur, NUR der
 *                    Verweis, ohne erklärenden Zusatz
 *   zuordnung        wie dieser Bericht die Raumart auf diese Zeile
 *                    bezieht. Das ist Auslegung und wird im Bericht als
 *                    solche gekennzeichnet
 *   quelle_n_min     die Fundstelle des Mindestluftwechsels. Das ist
 *                    Tabelle 12 und nicht Tabelle 32
 *   zuordnung_n_min  die Auslegung dazu, gleiche Regel
 * Dazu n_min_belegt: false, wo der Zahlenwert steht, die passende Zeile am
 * Normtext aber nicht geprüft ist. Der Bericht sagt das dann.
 *
 * FUNDSTELLE DES MINDESTLUFTWECHSELS
 * n_min = 0,5 1/h nach DIN/TS 12831-1:2020-04, Tabelle 12. Übernommen aus
 * dem geprüften WERK.E-Rechenmodell heizlast_maelzerstr59 (build_xlsx.py,
 * Block "Lueftung (DIN EN 12831-1 Abschn. 6.3, DIN/TS 12831-1 Tabelle 12)"
 * und Konfidenzzeile "DIN/TS 12831-1:2020-04, Tabelle 12: Daueraufenthalts-
 * raeume, Kuechen ueber 20 m3, Baeder mit Fenster"). Für beheizte Nebenräume
 * außerhalb von Wohnungen nennt dieses Modell keine eigene Zeile; dort ist
 * n_min_belegt deshalb false.
 *
 * Die belegten Werte stammen aus dem geprüften WERK.E-Rechenmodell
 * heizlast_maelzerstr59 (DIN EN 12831-1:2017-09 i. V. m. DIN/TS 12831-1:2020-04).
 * Alle übrigen sind Vorschläge und vor Verwendung gegen die Normtabelle
 * zu prüfen.
 * =========================================================================== */

"use strict";

const RAUMARTEN = {
  wohnen: {
    label: "Wohn- und Schlafraum",
    theta_i: 20.0, n_min: 0.5, belegt: true, n_min_belegt: true,
    quelle: "DIN/TS 12831-1:2020-04, Tabelle 32, Zeile 1",
    zuordnung: "Wohn- und Schlafräume als Daueraufenthaltsräume",
    quelle_n_min: "DIN/TS 12831-1:2020-04, Tabelle 12",
    zuordnung_n_min: "Daueraufenthaltsraum",
  },
  kueche: {
    label: "Küche",
    theta_i: 20.0, n_min: 0.5, belegt: true, n_min_belegt: true,
    quelle: "DIN/TS 12831-1:2020-04, Tabelle 32, Zeile 1",
    zuordnung: "Küche zusammen mit Wohn- und Schlafräumen in Zeile 1, wie im "
             + "geprüften Rechenmodell",
    quelle_n_min: "DIN/TS 12831-1:2020-04, Tabelle 12",
    zuordnung_n_min: "Küche über 20 m³",
  },
  bad: {
    label: "Bad, Duschraum",
    theta_i: 24.0, n_min: 0.5, belegt: true, n_min_belegt: true,
    quelle: "DIN/TS 12831-1:2020-04, Tabelle 32, Zeile 7",
    zuordnung: "Bad und Duschraum als unbekleidet genutzter Raum",
    quelle_n_min: "DIN/TS 12831-1:2020-04, Tabelle 12",
    zuordnung_n_min: "Bad mit Fenster",
  },
  treppenhaus: {
    label: "Treppenhaus, beheizter Nebenraum",
    theta_i: 15.0, n_min: 0.5, belegt: true, n_min_belegt: false,
    quelle: "DIN/TS 12831-1:2020-04, Tabelle 32, Zeile 9",
    zuordnung: "Treppenhaus als beheizter Nebenraum außerhalb der Wohnungen",
    quelle_n_min: "DIN/TS 12831-1:2020-04, Tabelle 12",
    /* Kein Semikolon und kein Punkt im Feld: der Bericht reiht mehrere
       Zuordnungen mit Semikolon aneinander. */
    zuordnung_n_min: "angesetzt ist der Wert der Daueraufenthaltsräume, eine "
                   + "eigene Zeile für beheizte Nebenräume außerhalb von "
                   + "Wohnungen ist am Normtext nicht geprüft",
  },
  flur: {
    label: "Flur, Diele innerhalb der Wohnung",
    theta_i: 20.0, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vorschlag, keine Fundstelle",
    zuordnung: "wie Aufenthaltsraum, da innerhalb der Nutzungseinheit. Gegen "
             + "Tabelle 32 zu prüfen",
    quelle_n_min: "Vorschlag, keine Fundstelle",
    zuordnung_n_min: "wie Daueraufenthaltsraum. Gegen Tabelle 12 zu prüfen",
  },
  wc: {
    label: "WC ohne Dusche",
    theta_i: 20.0, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vorschlag, keine Fundstelle",
    zuordnung: "gegen DIN/TS 12831-1 Tabelle 32 zu prüfen",
    quelle_n_min: "Vorschlag, keine Fundstelle",
    zuordnung_n_min: "gegen DIN/TS 12831-1 Tabelle 12 zu prüfen",
  },
  buero: {
    label: "Büro, Besprechung",
    theta_i: 20.0, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vorschlag, keine Fundstelle",
    zuordnung: "bei Nichtwohngebäuden gilt die nutzungsbezogene Tabelle, gegen "
             + "Tabelle 32 zu prüfen",
    quelle_n_min: "Vorschlag, keine Fundstelle",
    zuordnung_n_min: "nutzungsbezogen zu prüfen",
  },
  verkauf: {
    label: "Verkaufsraum",
    theta_i: 20.0, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vorschlag, keine Fundstelle",
    zuordnung: "nutzungsbezogen zu prüfen",
    quelle_n_min: "Vorschlag, keine Fundstelle",
    zuordnung_n_min: "nutzungsbezogen zu prüfen",
  },
  nebenraum: {
    label: "Beheizter Nebenraum (Technik, Hauswirtschaft)",
    theta_i: 15.0, n_min: 0.5, belegt: true, n_min_belegt: false,
    quelle: "DIN/TS 12831-1:2020-04, Tabelle 32, Zeile 9",
    zuordnung: "Technik-, Hauswirtschafts- und Abstellräume als beheizte "
             + "Nebenräume außerhalb der Aufenthaltsräume",
    quelle_n_min: "DIN/TS 12831-1:2020-04, Tabelle 12",
    zuordnung_n_min: "angesetzt ist der Wert der Daueraufenthaltsräume, eine "
                   + "eigene Zeile für beheizte Nebenräume ist am Normtext "
                   + "nicht geprüft",
  },
  lager_beheizt: {
    label: "Lager, beheizt",
    theta_i: 15.0, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vorschlag, keine Fundstelle",
    zuordnung: "nutzungsbezogen zu prüfen",
    quelle_n_min: "Vorschlag, keine Fundstelle",
    zuordnung_n_min: "nutzungsbezogen zu prüfen",
  },
  werkstatt: {
    label: "Werkstatt, Produktion",
    theta_i: 15.0, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vorschlag, keine Fundstelle",
    zuordnung: "bei Industriehallen gelten abweichende Verfahren, unter anderem "
             + "Strahlungsheizung, fachlich zu prüfen",
    quelle_n_min: "Vorschlag, keine Fundstelle",
    zuordnung_n_min: "fachlich zu prüfen",
  },
  frei: {
    label: "Frei eingeben",
    theta_i: null, n_min: 0.5, belegt: false, n_min_belegt: false,
    quelle: "Vom Anwender einzutragen",
    zuordnung: "die Fundstelle ist im Bericht anzugeben",
    quelle_n_min: "Vom Anwender einzutragen",
    zuordnung_n_min: "die Fundstelle ist im Bericht anzugeben",
  },
};

/** Fundstelle einer Raumart als ein Satz, in dem Zitat und Auslegung
 *  auseinanderzuhalten sind. groesse ist "theta_i" oder "n_min".
 *  Ergebnis: "<Fundstelle>. Zuordnung dieses Berichts: <Auslegung>."
 *  Ohne Auslegung bleibt es beim Verweis. Der Bericht darf beides nicht
 *  wieder zu einem Klammerzusatz verkleben. */
function fundstelleRaumart(art, groesse) {
  const a = RAUMARTEN[art];
  if (!a) return "";
  const q = (groesse === "n_min" ? a.quelle_n_min : a.quelle) || "";
  const z = (groesse === "n_min" ? a.zuordnung_n_min : a.zuordnung) || "";
  if (!q) return z ? "Zuordnung dieses Berichts: " + z + "." : "";
  if (!z) return q + ".";
  return q + ". Zuordnung dieses Berichts: " + z + ".";
}

/** Fundstelle für mehrere Raumarten in einem Satz, nach Verweis gruppiert.
 *  Verweisen alle auf dieselbe Tabelle, steht der Verweis einmal und die
 *  Zuordnungen dahinter, je Raumart eine und mit ihrem Namen davor. Ihn
 *  dreimal hintereinander zu drucken liest sich wie ein Fehler.
 *  arten: Liste von Schlüsseln. groesse: "theta_i" oder "n_min". */
function fundstellenRaumarten(arten, groesse) {
  const gruppen = [];
  (arten || []).forEach(function (k) {
    const a = RAUMARTEN[k];
    if (!a) return;
    const q = (groesse === "n_min" ? a.quelle_n_min : a.quelle) || "";
    const z = (groesse === "n_min" ? a.zuordnung_n_min : a.zuordnung) || "";
    if (!q) return;
    let g = null;
    gruppen.forEach(function (x) { if (x.q === q) g = x; });
    if (!g) { g = { q: q, teile: [] }; gruppen.push(g); }
    if (z && g.teile.every(function (t) { return t.label !== a.label; })) {
      g.teile.push({ label: a.label, z: z });
    }
  });
  return gruppen.map(function (g) {
    /* Steht eine Gruppe für genau eine Raumart, nennt der Verweis sie
       ohnehin eindeutig; der Name davor wäre eine Dopplung. Erst bei
       mehreren muss dabeistehen, welche Zuordnung zu welcher Raumart
       gehört. */
    const teile = g.teile.map(function (t) {
      return g.teile.length > 1 ? t.label + ": " + t.z : t.z;
    });
    return g.q + (teile.length
      ? ". Zuordnung dieses Berichts: " + teile.join("; ") : "") + ".";
  }).join(" ");
}

/** Reihenfolge für Auswahllisten */
const RAUMARTEN_REIHENFOLGE = [
  "wohnen", "kueche", "bad", "wc", "flur", "treppenhaus", "nebenraum",
  "buero", "verkauf", "lager_beheizt", "werkstatt", "frei",
];

/** Liefert alle nicht belegten Raumarten, die im Projekt verwendet werden.
 *  Grundlage für die Annahmenliste im Bericht. */
function offeneAnnahmen(projekt) {
  const verwendet = {};
  ((projekt && projekt.raeume) || []).forEach(function (r) {
    if (r.art) verwendet[r.art] = true;
  });
  return Object.keys(verwendet)
    .filter(function (k) { return RAUMARTEN[k] && !RAUMARTEN[k].belegt; })
    .map(function (k) {
      return { art: k, label: RAUMARTEN[k].label, theta_i: RAUMARTEN[k].theta_i,
               quelle: fundstelleRaumart(k, "theta_i") };
    });
}

/** Selbsttest. Hält die Trennung von Zitat und Auslegung fest, damit sie
 *  nicht beim nächsten Eintrag wieder verschmilzt. */
function selbsttestRaumarten() {
  const fh = [];
  let n = 0;
  const pruefe = (bed, name) => { n++; if (!bed) fh.push(name); };

  /* Jede Raumart muss auch auswaehlbar sein. Eine Art, die in RAUMARTEN steht
     und in der Reihenfolge fehlt, laesst sich im Raumbuch nicht einstellen:
     das Werkzeug ordnet sie zu, der Bearbeiter kommt aber nicht mehr an sie
     heran und sieht im Auswahlfeld eine falsche Art. Genau so ist
     "nebenraum" beim Einbau zunaechst untergegangen. */
  Object.keys(RAUMARTEN).forEach(function (k) {
    pruefe(RAUMARTEN_REIHENFOLGE.indexOf(k) >= 0,
      k + ": steht in RAUMARTEN, fehlt aber in der Reihenfolge und ist damit "
      + "im Raumbuch nicht auswaehlbar");
  });
  RAUMARTEN_REIHENFOLGE.forEach(function (k) {
    pruefe(!!RAUMARTEN[k], k + ": steht in der Reihenfolge, aber nicht in RAUMARTEN");
  });
  const arten = Object.keys(RAUMARTEN);

  arten.forEach(function (k) {
    const a = RAUMARTEN[k];
    ["quelle", "zuordnung", "quelle_n_min", "zuordnung_n_min"].forEach(function (feld) {
      pruefe(typeof a[feld] === "string", k + ": Feld " + feld + " fehlt");
    });
    pruefe(typeof a.n_min_belegt === "boolean", k + ": n_min_belegt fehlt");
    /* Die Zuordnungen werden im Bericht mit Semikolon aneinandergereiht und
       mit einem Punkt abgeschlossen. Beides darf im Feld nicht vorkommen. */
    [a.zuordnung, a.zuordnung_n_min].forEach(function (z) {
      pruefe(z.indexOf(";") < 0, k + ": Semikolon in der Zuordnung „" + z + "“");
      pruefe(!/\.$/.test(z), k + ": Punkt am Ende der Zuordnung „" + z + "“");
    });

    /* Kein erklärender Zusatz im Zitat. Genau das war der Befund: aus
       „Tab. 32 Zeile 7 (unbekleidete Nutzung); n_min Bad mit Fenster" ist
       nicht zu erkennen, was Normtext ist und was Auslegung. */
    [a.quelle, a.quelle_n_min].forEach(function (q) {
      pruefe(q.indexOf("(") < 0, k + ": Klammerzusatz im Verweis „" + q + "“");
      pruefe(q.indexOf(";") < 0, k + ": zwei Aussagen in einem Verweis „" + q + "“");
    });
    /* Die Fundstelle der Innentemperatur darf nicht den Mindestluftwechsel
       mitbegründen, und umgekehrt. */
    pruefe(a.quelle.indexOf("n_min") < 0 && a.quelle.indexOf("Tabelle 12") < 0,
      k + ": die Fundstelle der Innentemperatur nennt den Mindestluftwechsel");
    pruefe(a.quelle_n_min.indexOf("Tabelle 32") < 0,
      k + ": der Mindestluftwechsel wird aus Tabelle 32 begründet, er steht in Tabelle 12");

    /* Belegt heißt: eine Zeile ist genannt. Nicht belegt heißt: der Eintrag
       sagt selbst, dass sie fehlt. */
    if (a.belegt) {
      pruefe(/DIN\/TS 12831-1:2020-04, Tabelle 32, Zeile \d+$/.test(a.quelle),
        k + ": belegte Innentemperatur ohne genannte Zeile");
    }
    if (a.n_min_belegt) {
      pruefe(a.quelle_n_min === "DIN/TS 12831-1:2020-04, Tabelle 12",
        k + ": belegter Mindestluftwechsel ohne die Fundstelle Tabelle 12");
    } else if (a.belegt) {
      pruefe(/nicht geprüft/.test(a.zuordnung_n_min),
        k + ": ungeprüfte Zeile für n_min wird nicht als solche benannt");
    }
  });

  /* Der Satz, den der Bericht druckt. */
  const s = fundstelleRaumart("bad", "theta_i");
  pruefe(s.indexOf("DIN/TS 12831-1:2020-04, Tabelle 32, Zeile 7.") === 0,
    "fundstelle beginnt mit dem Verweis");
  pruefe(s.indexOf("Zuordnung dieses Berichts:") > 0,
    "fundstelle kennzeichnet die Auslegung als solche");
  pruefe(fundstelleRaumart("bad", "n_min").indexOf("Tabelle 12") > 0,
    "fundstelle liefert für n_min die eigene Fundstelle");
  pruefe(fundstelleRaumart("bad", "n_min") !== fundstelleRaumart("bad", "theta_i"),
    "die beiden Fundstellen sind verschieden");
  pruefe(fundstelleRaumart("gibtesnicht", "theta_i") === "",
    "unbekannte Raumart liefert keinen erfundenen Verweis");
  /* Der Verweis steht immer vorn und die Auslegung genau einmal dahinter.
     Ohne Auslegung bleibt es beim Verweis; dieser Zweig wird an einem
     eigens gebauten Eintrag geprüft, weil im Katalog jede Raumart eine
     Zuordnung hat. */
  arten.forEach(function (k) {
    ["theta_i", "n_min"].forEach(function (g) {
      const s2 = fundstelleRaumart(k, g);
      const q2 = g === "n_min" ? RAUMARTEN[k].quelle_n_min : RAUMARTEN[k].quelle;
      pruefe(s2.indexOf(q2 + ".") === 0, k + "/" + g + ": Verweis steht nicht vorn");
      pruefe(s2.split("Zuordnung dieses Berichts:").length === 2,
        k + "/" + g + ": Auslegung fehlt oder steht doppelt");
    });
  });
  RAUMARTEN.__probe = { quelle: "X", zuordnung: "", quelle_n_min: "", zuordnung_n_min: "" };
  pruefe(fundstelleRaumart("__probe", "theta_i") === "X.", "ohne Auslegung bleibt es beim Verweis");
  pruefe(fundstelleRaumart("__probe", "n_min") === "", "ohne beides bleibt das Feld leer");
  delete RAUMARTEN.__probe;
  /* Der Fall, der die Beanstandung ausgelöst hat. */
  pruefe(fundstelleRaumart("treppenhaus", "n_min").indexOf("Tabelle 32") < 0,
    "der Mindestluftwechsel des Treppenhauses wird nicht mit Tabelle 32 begründet");
  pruefe(RAUMARTEN.treppenhaus.n_min_belegt === false,
    "für beheizte Nebenräume ist die n_min-Zeile nicht als geprüft geführt");

  /* Gruppierung mehrerer Raumarten. Drei Arten mit derselben n_min-Fundstelle
     ergeben einen Verweis und drei Zuordnungen, nicht drei Verweise. */
  const drei = ["wohnen", "bad", "treppenhaus"];
  const gn = fundstellenRaumarten(drei, "n_min");
  pruefe(gn.split("Tabelle 12").length === 2, "fundstellen nennt den Verweis einmal");
  pruefe(gn.split("Zuordnung dieses Berichts:").length === 2,
    "fundstellen setzt die Kennzeichnung der Auslegung einmal");
  drei.forEach(function (k) {
    pruefe(gn.indexOf(RAUMARTEN[k].label + ": ") > 0,
      "fundstellen nennt die Raumart " + k + " beim Namen");
  });
  const gt = fundstellenRaumarten(drei, "theta_i");
  pruefe(gt.split("Tabelle 32").length === 4,
    "drei verschiedene Zeilen ergeben drei Verweise");
  pruefe(gt.indexOf("Wohn- und Schlafraum: Wohn- und Schlafräume") < 0,
    "bei einer Raumart je Verweis steht der Name nicht doppelt");
  pruefe(fundstellenRaumarten(["bad"], "n_min") === fundstelleRaumart("bad", "n_min"),
    "eine einzelne Raumart ergibt denselben Satz wie fundstelleRaumart()");
  pruefe(fundstellenRaumarten([], "theta_i") === "", "leere Liste ergibt leeren Satz");
  pruefe(fundstellenRaumarten(["gibtesnicht"], "theta_i") === "",
    "unbekannte Raumart wird übergangen");
  pruefe(fundstellenRaumarten(["wohnen", "wohnen"], "n_min") === fundstellenRaumarten(["wohnen"], "n_min"),
    "dieselbe Raumart zweimal ergibt keine doppelte Zuordnung");

  return { ok: fh.length === 0, fehler: fh, anzahl: n };
}

const DATEN_RAUMARTEN = {
  RAUMARTEN: RAUMARTEN,
  REIHENFOLGE: RAUMARTEN_REIHENFOLGE,
  offeneAnnahmen: offeneAnnahmen,
  fundstelle: fundstelleRaumart,
  fundstellen: fundstellenRaumarten,
  selbsttest: selbsttestRaumarten,
};
if (typeof module !== "undefined" && module.exports) module.exports = DATEN_RAUMARTEN;
if (typeof window !== "undefined") window.DATEN_RAUMARTEN = DATEN_RAUMARTEN;
