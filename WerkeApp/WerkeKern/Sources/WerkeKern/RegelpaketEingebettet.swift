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
      "version": 1,
      "stand": "2026-08-14",
      "hinweis": "Fördersätze nach BEG-Systematik, Stand 21.07.2026. GModG-Angaben nach Kabinettsbeschluss vom 13.05.2026 und damit Entwurfsstand.",
      "zuPruefen": [
        "Alle Fördersätze und Höchstgrenzen sind vor Veröffentlichung durch WERK.E gegen die geltende BEG-Richtlinie zu bestätigen.",
        "Boni beim Heizungstausch (Klimageschwindigkeit, Einkommen, Familie) und ihre Höchstsätze sind fachlich zu verifizieren.",
        "GModG-Werte gelten erst mit Inkrafttreten; bis dahin ist jede Ausgabe als Entwurfsstand zu kennzeichnen."
      ],
      "foerderung": {
        "grundsatzEinzelmassnahme": 0.15,
        "isfpBonusSatz": 0.05,
        "isfpBonusSchwelle": 30000,
        "isfpBonusNurUeberschuss": true,
        "hoechstkostenProWohneinheit": 30000,
        "hoechstkostenProWohneinheitMitISFP": 60000,
        "heizungGrundsatz": 0.30,
        "heizungKlimageschwindigkeitsbonus": 0.20,
        "heizungEinkommensbonus": 0.30,
        "heizungFamilienbonus": 0.05,
        "heizungHoechstsatz": 0.70,
        "heizungHoechstkostenErsteWohneinheit": 30000,
        "heizungHoechstkostenWeitereWohneinheit": 15000,
        "heizungEinkommensgrenze": 40000
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
        "brennwertGasProKubikmeter": 10.0,
        "heizwertOelProLiter": 10.0,
        "spezifischeHeizlast": [
          { "bisBaujahr": 1918, "wattProQuadratmeter": 180 },
          { "bisBaujahr": 1948, "wattProQuadratmeter": 170 },
          { "bisBaujahr": 1957, "wattProQuadratmeter": 170 },
          { "bisBaujahr": 1968, "wattProQuadratmeter": 160 },
          { "bisBaujahr": 1978, "wattProQuadratmeter": 150 },
          { "bisBaujahr": 1983, "wattProQuadratmeter": 115 },
          { "bisBaujahr": 1994, "wattProQuadratmeter": 95 },
          { "bisBaujahr": 2001, "wattProQuadratmeter": 80 },
          { "bisBaujahr": 2009, "wattProQuadratmeter": 70 },
          { "bisBaujahr": 2015, "wattProQuadratmeter": 55 },
          { "bisBaujahr": 2100, "wattProQuadratmeter": 45 }
        ]
      },
      "co2Stufen": [
        { "abKilogrammProQuadratmeter": 52, "vermieteranteil": 0.95 },
        { "abKilogrammProQuadratmeter": 47, "vermieteranteil": 0.80 },
        { "abKilogrammProQuadratmeter": 42, "vermieteranteil": 0.70 },
        { "abKilogrammProQuadratmeter": 37, "vermieteranteil": 0.60 },
        { "abKilogrammProQuadratmeter": 32, "vermieteranteil": 0.50 },
        { "abKilogrammProQuadratmeter": 27, "vermieteranteil": 0.40 },
        { "abKilogrammProQuadratmeter": 22, "vermieteranteil": 0.30 },
        { "abKilogrammProQuadratmeter": 17, "vermieteranteil": 0.20 },
        { "abKilogrammProQuadratmeter": 12, "vermieteranteil": 0.10 },
        { "abKilogrammProQuadratmeter": 0, "vermieteranteil": 0.00 }
      ],
      "gebaeude": {
        "bagatellgrenzeAnteil": 0.10,
        "verbrauchsausweisMonate": 24,
        "energieausweisGueltigkeitJahre": 10,
        "nichtwohngebaeudeKlasseGStichtag": "2030-01-01",
        "betriebsverbotAlteKesselEntfaellt": true,
        "pflicht65ProzentEntfaellt": true,
        "lueftungskonzeptSchwelle": 0.3333
      }
    }
    """
}
