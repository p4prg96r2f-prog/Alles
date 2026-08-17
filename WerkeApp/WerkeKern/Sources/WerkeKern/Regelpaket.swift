import Foundation

/// Das Regelpaket hält alles, was sich durch Gesetzgebung und Förderrichtlinien
/// ändert – bewusst als Daten und nicht als Code.
///
/// Warum das so gebaut ist:
/// * Die App rechnet **offline**, weil sie eine Fassung mitbringt.
/// * Neuere Fassungen werden nachgeladen, ohne dass die App aktualisiert wird.
/// * Jedes Ergebnis speichert seine Regelversion und bleibt dadurch Jahre später
///   erklärbar, auch wenn sich die Förderung mehrfach geändert hat.
public struct Regelpaket: Codable, Sendable, Equatable {

    public struct Foerderung: Codable, Sendable, Equatable {
        /// Grundfördersatz für Einzelmaßnahmen an Hülle und Anlagentechnik.
        public var grundsatzEinzelmassnahme: Double
        /// Bonussatz, wenn ein gültiger iSFP vorliegt.
        public var isfpBonusSatz: Double
        /// Mindestvolumen, ab dem der iSFP-Bonus überhaupt greift.
        public var isfpBonusSchwelle: Double
        /// Gilt der Bonus nur auf den Betrag oberhalb der Schwelle?
        public var isfpBonusNurUeberschuss: Bool
        /// Förderfähige Höchstkosten je Wohneinheit und Jahr, ohne iSFP.
        public var hoechstkostenProWohneinheit: Double
        /// Förderfähige Höchstkosten je Wohneinheit und Jahr, mit iSFP.
        public var hoechstkostenProWohneinheitMitISFP: Double

        /// Heizungstausch läuft über ein eigenes Programm mit eigener Systematik.
        public var heizungGrundsatz: Double
        public var heizungKlimageschwindigkeitsbonus: Double
        public var heizungEinkommensbonus: Double
        public var heizungFamilienbonus: Double
        public var heizungHoechstsatz: Double
        public var heizungHoechstkostenErsteWohneinheit: Double
        public var heizungHoechstkostenWeitereWohneinheit: Double
        /// Einkommensgrenze (zu versteuerndes Haushaltseinkommen) für den Einkommensbonus.
        public var heizungEinkommensgrenze: Double
    }

    public struct Honorar: Codable, Sendable, Equatable {
        /// Anteil an der Investitionssumme, brutto.
        public var satzVonInvestition: Double
        /// Anteil des Honorars, der bezuschusst wird.
        public var zuschussanteil: Double
        /// Mindest-Eigenanteil in Euro.
        public var mindestEigenanteil: Double
    }

    public struct Heizlast: Codable, Sendable, Equatable {
        public var vollbenutzungsstundenUnten: Double
        public var vollbenutzungsstundenOben: Double
        public var kesselnutzungsgradStandard: Double
        public var kesselnutzungsgradBrennwert: Double
        /// Warmwasser-Pauschale je Person und Jahr in kWh.
        public var warmwasserProPersonKWh: Double
        /// Brennwert je Kubikmeter Erdgas in kWh (Brennwert mal Zustandszahl).
        public var brennwertGasProKubikmeter: Double
        /// Heizwert je Liter Heizöl in kWh.
        public var heizwertOelProLiter: Double
        /// Spezifische Heizlast in W/m² nach Baujahresklasse.
        public var spezifischeHeizlast: [Baujahresklasse]

        public struct Baujahresklasse: Codable, Sendable, Equatable {
            public var bisBaujahr: Int
            public var wattProQuadratmeter: Double
        }
    }

    public struct UWertStufe: Codable, Sendable, Equatable {
        public var bisBaujahr: Int
        public var uWert: Double
    }

    /// U-Werte für die raumweise Rechnung über die Hüllflächen.
    public struct UWerte: Codable, Sendable, Equatable {
        public var aussenwandUngedaemmt: [UWertStufe]
        public var aussenwandGedaemmt: Double
        public var dachUngedaemmt: [UWertStufe]
        public var dachGedaemmt: Double
        public var fenster: [UWertStufe]
        public var tuer: Double
        public var kellerdeckeUngedaemmt: [UWertStufe]
        public var kellerdeckeGedaemmt: Double
        public var bodenplatteUngedaemmt: [UWertStufe]
        public var bodenplatteGedaemmt: Double
        public var innenbauteil: Double

        /// Ohne Klimadaten im Paket greift diese Fassung, damit die raumweise
        /// Rechnung nicht ausfällt.
        public static let standard = UWerte(
            aussenwandUngedaemmt: [
                .init(bisBaujahr: 1918, uWert: 1.7), .init(bisBaujahr: 1978, uWert: 1.4),
                .init(bisBaujahr: 1994, uWert: 0.8), .init(bisBaujahr: 2001, uWert: 0.5),
                .init(bisBaujahr: 2009, uWert: 0.4), .init(bisBaujahr: 2100, uWert: 0.28)
            ],
            aussenwandGedaemmt: 0.25,
            dachUngedaemmt: [
                .init(bisBaujahr: 1978, uWert: 2.0), .init(bisBaujahr: 1994, uWert: 0.6),
                .init(bisBaujahr: 2009, uWert: 0.3), .init(bisBaujahr: 2100, uWert: 0.2)
            ],
            dachGedaemmt: 0.20,
            // Einfachverglasung gehört als eigene Stufe hierher: Vor 1949 war
            // sie der Regelfall, und mit rund 5,0 W/m²K ist sie kein Sonderfall
            // der Zweischeibenverglasung, sondern deren Vielfaches. Wer sie mit
            // 3,0 ansetzt, rechnet die Fenster eines Altbaus um vierzig Prozent
            // zu gut.
            fenster: [
                .init(bisBaujahr: 1948, uWert: 5.0), .init(bisBaujahr: 1978, uWert: 3.0),
                .init(bisBaujahr: 1994, uWert: 2.8), .init(bisBaujahr: 2009, uWert: 1.6),
                .init(bisBaujahr: 2100, uWert: 1.1)
            ],
            tuer: 3.0,
            kellerdeckeUngedaemmt: [
                .init(bisBaujahr: 1978, uWert: 1.2), .init(bisBaujahr: 1994, uWert: 0.8),
                .init(bisBaujahr: 2100, uWert: 0.5)
            ],
            kellerdeckeGedaemmt: 0.30,
            bodenplatteUngedaemmt: [
                .init(bisBaujahr: 1978, uWert: 1.0), .init(bisBaujahr: 1994, uWert: 0.7),
                .init(bisBaujahr: 2100, uWert: 0.4)
            ],
            bodenplatteGedaemmt: 0.30,
            innenbauteil: 1.5
        )
    }

    public struct CO2Stufe: Codable, Sendable, Equatable {
        /// Untere Grenze der Stufe in kg CO₂ je Quadratmeter und Jahr.
        public var abKilogrammProQuadratmeter: Double
        /// Anteil, den die vermietende Seite trägt.
        public var vermieteranteil: Double
    }

    public struct GebaeudeRegeln: Codable, Sendable, Equatable {
        /// Bagatellgrenze: Anforderungen greifen erst oberhalb dieses Flächenanteils.
        public var bagatellgrenzeAnteil: Double
        /// Ab wie vielen Monaten lückenloser Monatswerte ist ein Verbrauchsausweis möglich?
        public var verbrauchsausweisMonate: Int
        /// Gültigkeitsdauer eines Energieausweises in Jahren.
        public var energieausweisGueltigkeitJahre: Int
        /// Stichtag der Renovierungspflicht für die schlechteste Nichtwohngebäude-Klasse.
        public var nichtwohngebaeudeKlasseGStichtag: String
        /// Entfällt das Betriebsverbot für alte Konstanttemperaturkessel?
        public var betriebsverbotAlteKesselEntfaellt: Bool
        /// Entfällt die 65-Prozent-Pflicht für neue Heizungen?
        public var pflicht65ProzentEntfaellt: Bool
        /// Anteil der Fenster- oder Dachfläche, ab dem ein Lüftungskonzept nötig wird.
        public var lueftungskonzeptSchwelle: Double
    }

    /// Fassungsnummer, monoton steigend.
    public var version: Int
    /// Stand der enthaltenen Regeln, als ISO-Datum.
    public var stand: String
    /// Kurzer Hinweis auf den rechtlichen Stand, wird in der Oberfläche angezeigt.
    public var hinweis: String
    /// Regelwerte, deren Richtigkeit vor Veröffentlichung fachlich zu bestätigen ist.
    public var zuPruefen: [String]

    public var foerderung: Foerderung
    public var honorar: Honorar
    public var heizlast: Heizlast
    public var co2Stufen: [CO2Stufe]
    public var gebaeude: GebaeudeRegeln
    /// Gradtagzahlen und Normaußentemperaturen für die Energiesignatur.
    public var klimaregionen: [Klimaregion]
    /// U-Werte für die raumweise Rechnung.
    public var uWerte: UWerte

    /// Ein älteres Regelpaket ohne Klimadaten bleibt lesbar – es fehlt dann nur
    /// die Energiesignatur, nicht die ganze App.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        version = try c.decode(Int.self, forKey: .version)
        stand = try c.decode(String.self, forKey: .stand)
        hinweis = try c.decode(String.self, forKey: .hinweis)
        zuPruefen = try c.decodeIfPresent([String].self, forKey: .zuPruefen) ?? []
        foerderung = try c.decode(Foerderung.self, forKey: .foerderung)
        honorar = try c.decode(Honorar.self, forKey: .honorar)
        heizlast = try c.decode(Heizlast.self, forKey: .heizlast)
        co2Stufen = try c.decode([CO2Stufe].self, forKey: .co2Stufen)
        gebaeude = try c.decode(GebaeudeRegeln.self, forKey: .gebaeude)
        klimaregionen = try c.decodeIfPresent([Klimaregion].self, forKey: .klimaregionen) ?? []
        uWerte = try c.decodeIfPresent(UWerte.self, forKey: .uWerte) ?? .standard
    }
}

// MARK: - Laden

public enum RegelpaketFehler: Error, CustomStringConvertible {
    case nichtGefunden
    case ungueltig(String)

    public var description: String {
        switch self {
        case .nichtGefunden: return "Regelpaket nicht gefunden."
        case .ungueltig(let grund): return "Regelpaket ungültig: \(grund)"
        }
    }
}

public enum Regelpaketlader {

    /// Lädt die mit der App ausgelieferte Fassung.
    public static func mitgeliefert() throws -> Regelpaket {
        guard let url = Bundle.module.url(forResource: "regelpaket", withExtension: "json") else {
            throw RegelpaketFehler.nichtGefunden
        }
        return try laden(von: try Data(contentsOf: url))
    }

    /// Lädt eine nachgeladene Fassung. Ältere Fassungen werden abgewiesen, damit
    /// ein fehlerhafter Server die App nicht zurückdatieren kann.
    public static func laden(von daten: Data, nichtAelterAls bestehende: Regelpaket? = nil) throws -> Regelpaket {
        let paket: Regelpaket
        do {
            paket = try JSONDecoder().decode(Regelpaket.self, from: daten)
        } catch {
            throw RegelpaketFehler.ungueltig(String(describing: error))
        }
        if let bestehende, paket.version < bestehende.version {
            throw RegelpaketFehler.ungueltig("Fassung \(paket.version) ist älter als \(bestehende.version).")
        }
        guard !paket.heizlast.spezifischeHeizlast.isEmpty else {
            throw RegelpaketFehler.ungueltig("Keine Heizlast-Kennwerte enthalten.")
        }
        guard !paket.co2Stufen.isEmpty else {
            throw RegelpaketFehler.ungueltig("Keine CO₂-Stufen enthalten.")
        }
        return paket
    }
}
