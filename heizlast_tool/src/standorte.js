/* Standorte der WERK.E-Gruppe — eine Quelle für Briefkopf, Deckblatt und Word-Export.
   Umgeschaltet wird im Tool oben rechts; die Auswahl bestimmt Briefkopf, Fußzeile,
   Erstellerblock und Ort auf dem Deckblatt.

   Ein Standort erscheint nur dann als wählbar, wenn zu ihm ein Briefkopf gebaut ist
   (assets/<kennung>/header.b64 + footer.b64, erzeugt von assets_standort.py).

   Quellen der Firmendaten:
   - Paderborn: werk-e.de/impressum/
   - Kassel:    werk-e.de/kassel/impressum/ (abgerufen 12.08.2026)
   - Dortmund:  werk-e.de/dortmund/impressum/ nennt die Paderborner KG; eine eigene
                Dortmunder Anschrift ist dort nicht veröffentlicht -> unten eintragen. */
const STANDORTE = {
  paderborn: {
    id: "paderborn",
    marke: "Paderborn",
    erstellort: "Paderborn",
    ersteller: {
      firma: "WERK.E Energie-Effizienz-Beratung", person: "Sebastian Hund",
      rolle1: "Energieberater", rolle2: "Sachverständiger für Energieeffizienz (KfW)",
      strasse: "Rolandsweg 80", ort: "33102 Paderborn",
      tel: "05251 40 29 29 1", mail: "s.hund@werk-e.de",
    },
  },
  mitte: {
    id: "mitte",
    marke: "Kassel",
    erstellort: "Kassel",
    ersteller: {
      firma: "WERK.E Mitte GmbH", person: "Sebastian Hund",
      rolle1: "Energieberater", rolle2: "Sachverständiger für Energieeffizienz (KfW)",
      strasse: "Münchner Str. 15", ort: "34134 Kassel",
      tel: "0561 47 39 050", mail: "info@werk-e-mitte.de",
    },
  },
  dortmund: {
    id: "dortmund",
    marke: "Dortmund",
    erstellort: "Dortmund",
    /* Rechtsträger ist laut Impressum die Paderborner KG; es fehlen nur noch
       Anschrift, Telefon und E-Mail des Dortmunder Büros. Sind sie eingetragen,
       erzeugt `python3 assets_standort.py` den Briefkopf und `python3 build.py`
       schaltet die Schaltfläche im Tool automatisch frei. */
    ersteller: {
      firma: "WERK.E Energie-Effizienz-Beratung", person: "Sebastian Hund",
      rolle1: "Energieberater", rolle2: "Sachverständiger für Energieeffizienz (KfW)",
      strasse: "", ort: "",
      tel: "", mail: "",
    },
  },
};

if (typeof module !== "undefined") module.exports = { STANDORTE };
