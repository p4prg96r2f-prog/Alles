import Foundation

extension Regelpaketlader {

    /// Immer verfügbares Regelpaket, ohne Fehlerbehandlung an der Aufrufstelle.
    ///
    /// Reihenfolge: mitgelieferte Ressource, ersatzweise die hier eingebettete
    /// Fassung. Dass die eingebettete Fassung lesbar ist, sichert ein Test ab –
    /// die App kann daran also nicht scheitern.
    public static let standard: Regelpaket = {
        if let paket = try? mitgeliefert() { return paket }
        if let paket = try? laden(von: Data(eingebettetJSON.utf8)) { return paket }
        preconditionFailure("Eingebettetes Regelpaket ist fehlerhaft – siehe RegelpaketTests.")
    }()

    /// Wortgleiche Kopie von `Ressourcen/regelpaket.json`.
    /// Wird durch `testEingebettetesPaketStimmtMitRessourceUeberein` abgesichert.
    public static let eingebettetJSON = """
    {
      "version": 5,
      "stand": "2026-08-18",
      "hinweis": "Fördersätze nach BEG-Systematik, Stand der Reform vom 21.07.2026. Das Gebäudemodernisierungsgesetz (GModG) ist seit 29.07.2026 in Kraft; die Regelungen zu Energieausweisen (Artikel 2) gelten ab 01.01.2027.",
      "zuPruefen": [
        "Fördersätze und Höchstgrenzen sind gegen die BEG-Richtlinien in der Fassung der Reform vom 21.07.2026 recherchiert und dreifach belegt. Vor Veröffentlichung durch WERK.E gegen den Originaltext der Richtlinie zu bestätigen.",
        "Der Klimageschwindigkeitsbonus sinkt ab 01.02.2027 halbjährlich um 4 Prozentpunkte (16 / 12 / 8 / 4, ab 01.08.2028 entfallen). Die Degression ist im Regelpaket noch nicht abgebildet – vor Februar 2027 nachziehen.",
        "Die Grundförderung für Wärmepumpen sinkt nach mehreren Quellen zum ersten Quartal 2027 auf 15 Prozent. Termin und Anwendungsbereich sind vor Februar 2027 zu bestätigen.",
        "Die förderfähigen Höchstkosten sinken ab Februar 2027 halbjährlich um 750 Euro. Auch das ist noch nicht abgebildet.",
        "Wertschöpfungsbonus und Worst-Performing-Buildings-Bonus (beide ab Q1 2027 angekündigt) fehlen im Regelpaket.",
        "Gradtagzahlen und Normaußentemperaturen der Klimaregionen sind Näherungen und vor Veröffentlichung gegen die Werte nach DIN EN 12831 Beiblatt bzw. DWD zu prüfen.",
        "Die spezifischen Heizlasten nach Baujahr sind Erfahrungswerte für unsanierte Gebäude, gegen die Hüllflächenrechnung derselben App abgeglichen und noch nicht gegen reale Objekte geprüft."
      ],
      "foerderung": {
        "grundsatzEinzelmassnahme": 0.15,
        "isfpBonusSatz": 0.05,
        "isfpBonusSchwelle": 30000,
        "isfpBonusNurUeberschuss": true,
        "hoechstkostenProWohneinheit": 30000,
        "hoechstkostenProWohneinheitMitISFP": 60000,
        "heizungGrundsatz": 0.3,
        "heizungKlimageschwindigkeitsbonus": 0.16,
        "heizungHoechstsatz": 0.8,
        "heizungHoechstkostenErsteWohneinheit": 28000,
        "heizungHoechstkostenWeitereWohneinheit": 15000,
        "hoechstkostenWeitereWohneinheit": 15000,
        "hoechstkostenAbSiebterWohneinheit": 8000,
        "heizungHoechstkostenAbSiebterWohneinheit": 8000,
        "heizungEinkommensstufen": [
          {
            "bisEinkommen": 30000,
            "bonus": 0.4
          },
          {
            "bisEinkommen": 40000,
            "bonus": 0.3
          },
          {
            "bisEinkommen": 50000,
            "bonus": 0.1
          }
        ],
        "heizungFamilienzuschlagJeKind": 10000
      },
      "honorar": {
        "satzVonInvestition": 0.03,
        "zuschussanteil": 0.5,
        "mindestEigenanteil": 325
      },
      "heizlast": {
        "vollbenutzungsstundenUnten": 1800,
        "vollbenutzungsstundenOben": 2100,
        "kesselnutzungsgradStandard": 0.75,
        "kesselnutzungsgradBrennwert": 0.92,
        "warmwasserProPersonKWh": 500,
        "brennwertGasProKubikmeter": 10.9,
        "heizwertOelProLiter": 10.0,
        "spezifischeHeizlast": [
          {
            "bisBaujahr": 1918,
            "wattProQuadratmeter": 170
          },
          {
            "bisBaujahr": 1948,
            "wattProQuadratmeter": 160
          },
          {
            "bisBaujahr": 1957,
            "wattProQuadratmeter": 150
          },
          {
            "bisBaujahr": 1968,
            "wattProQuadratmeter": 145
          },
          {
            "bisBaujahr": 1978,
            "wattProQuadratmeter": 140
          },
          {
            "bisBaujahr": 1983,
            "wattProQuadratmeter": 105
          },
          {
            "bisBaujahr": 1994,
            "wattProQuadratmeter": 100
          },
          {
            "bisBaujahr": 2001,
            "wattProQuadratmeter": 78
          },
          {
            "bisBaujahr": 2009,
            "wattProQuadratmeter": 70
          },
          {
            "bisBaujahr": 2015,
            "wattProQuadratmeter": 45
          },
          {
            "bisBaujahr": 2100,
            "wattProQuadratmeter": 30
          }
        ]
      },
      "co2Stufen": [
        {
          "abKilogrammProQuadratmeter": 52,
          "vermieteranteil": 0.95
        },
        {
          "abKilogrammProQuadratmeter": 47,
          "vermieteranteil": 0.8
        },
        {
          "abKilogrammProQuadratmeter": 42,
          "vermieteranteil": 0.7
        },
        {
          "abKilogrammProQuadratmeter": 37,
          "vermieteranteil": 0.6
        },
        {
          "abKilogrammProQuadratmeter": 32,
          "vermieteranteil": 0.5
        },
        {
          "abKilogrammProQuadratmeter": 27,
          "vermieteranteil": 0.4
        },
        {
          "abKilogrammProQuadratmeter": 22,
          "vermieteranteil": 0.3
        },
        {
          "abKilogrammProQuadratmeter": 17,
          "vermieteranteil": 0.2
        },
        {
          "abKilogrammProQuadratmeter": 12,
          "vermieteranteil": 0.1
        },
        {
          "abKilogrammProQuadratmeter": 0,
          "vermieteranteil": 0.0
        }
      ],
      "gebaeude": {
        "bagatellgrenzeAnteil": 0.1,
        "verbrauchsausweisMonate": 24,
        "energieausweisGueltigkeitJahre": 10,
        "nichtwohngebaeudeKlasseGStichtag": "2030-01-01",
        "betriebsverbotAlteKesselEntfaellt": true,
        "pflicht65ProzentEntfaellt": true,
        "lueftungskonzeptSchwelle": 0.3333,
        "gmodgInKraftAb": "2026-07-29",
        "energieausweisregelnAb": "2027-01-01"
      },
      "klimaregionen": [
        {
          "name": "Bundesweiter Mittelwert",
          "plzPraefixe": [],
          "gradtagzahlen": [
            530,
            470,
            410,
            275,
            135,
            40,
            10,
            12,
            70,
            225,
            370,
            480
          ],
          "normaussentemperatur": -12
        },
        {
          "name": "Nordwesten, küstennah",
          "plzPraefixe": [
            "2"
          ],
          "gradtagzahlen": [
            500,
            450,
            395,
            265,
            130,
            40,
            10,
            12,
            68,
            215,
            355,
            455
          ],
          "normaussentemperatur": -10
        },
        {
          "name": "Rheinland und Niederrhein",
          "plzPraefixe": [
            "4",
            "5"
          ],
          "gradtagzahlen": [
            490,
            435,
            380,
            255,
            120,
            33,
            8,
            10,
            60,
            205,
            340,
            445
          ],
          "normaussentemperatur": -10
        },
        {
          "name": "Westliches Binnenland",
          "plzPraefixe": [
            "3",
            "6"
          ],
          "gradtagzahlen": [
            525,
            465,
            405,
            275,
            135,
            40,
            10,
            12,
            70,
            225,
            365,
            475
          ],
          "normaussentemperatur": -12
        },
        {
          "name": "Ostdeutsches Binnenland",
          "plzPraefixe": [
            "0",
            "1"
          ],
          "gradtagzahlen": [
            560,
            495,
            425,
            282,
            140,
            42,
            11,
            13,
            74,
            235,
            385,
            505
          ],
          "normaussentemperatur": -14
        },
        {
          "name": "Süddeutschland und Höhenlagen",
          "plzPraefixe": [
            "7",
            "8",
            "9"
          ],
          "gradtagzahlen": [
            570,
            505,
            440,
            295,
            155,
            50,
            14,
            16,
            85,
            250,
            395,
            515
          ],
          "normaussentemperatur": -14
        }
      ],
      "freigabe": {
        "durch": "",
        "am": "",
        "grundlage": "Maschinelle Vorprüfung am 18.08.2026 gegen drei unabhängige Quellen (ADAC, Energiegestalter, Haus & Grund) sowie das amtliche GEG-Infoportal. Dabei wurden fünf Fehler gefunden und behoben. Das ersetzt keine fachliche Freigabe: Diese trägt ein Mensch mit Namen und Datum ein, nachdem er die Werte gegen den Richtlinientext selbst geprüft hat."
      }
    }
    """
}
