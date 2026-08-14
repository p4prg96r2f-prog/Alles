import Foundation

// MARK: - Gebäude

public enum Gebaeudetyp: String, Codable, CaseIterable, Sendable {
    case einfamilienhaus
    case doppelhaushaelfte
    case reihenhaus
    case mehrfamilienhaus

    public var bezeichnung: String {
        switch self {
        case .einfamilienhaus: return "Einfamilienhaus"
        case .doppelhaushaelfte: return "Doppelhaushälfte"
        case .reihenhaus: return "Reihenhaus"
        case .mehrfamilienhaus: return "Mehrfamilienhaus"
        }
    }

    /// Kompaktheitsfaktor für die überschlägige Heizlast: Je mehr Nachbarwände,
    /// desto weniger Hüllfläche pro Quadratmeter Wohnfläche.
    var kompaktheitsfaktor: Double {
        switch self {
        case .einfamilienhaus: return 1.00
        case .doppelhaushaelfte: return 0.92
        case .reihenhaus: return 0.82
        case .mehrfamilienhaus: return 0.85
        }
    }
}

public enum Heizungsart: String, Codable, CaseIterable, Sendable {
    case gas
    case oel
    case fernwaerme
    case waermepumpe
    case pellets
    case nachtspeicher
    case unbekannt

    public var bezeichnung: String {
        switch self {
        case .gas: return "Gas"
        case .oel: return "Öl"
        case .fernwaerme: return "Fernwärme"
        case .waermepumpe: return "Wärmepumpe"
        case .pellets: return "Pellets / Holz"
        case .nachtspeicher: return "Nachtspeicher"
        case .unbekannt: return "Weiß ich nicht"
        }
    }

    public var istFossil: Bool {
        self == .gas || self == .oel
    }
}

public enum Bauteilzustand: String, Codable, CaseIterable, Sendable {
    case ungedaemmt
    case teilweise
    case gedaemmt
    case unbekannt

    public var bezeichnung: String {
        switch self {
        case .ungedaemmt: return "ungedämmt"
        case .teilweise: return "teilweise gedämmt"
        case .gedaemmt: return "gedämmt"
        case .unbekannt: return "unbekannt"
        }
    }

    /// Anteil der Einsparung, der bereits gehoben ist.
    var erledigtAnteil: Double {
        switch self {
        case .ungedaemmt: return 0.0
        case .teilweise: return 0.5
        case .gedaemmt: return 1.0
        case .unbekannt: return 0.0
        }
    }
}

/// Der Gebäudedatensatz. Bewusst so gebaut, dass er mit sehr wenigen Angaben
/// schon rechenfähig ist – alles Weitere verengt nur die Ergebnisspanne.
public struct Gebaeude: Codable, Sendable, Equatable {
    public var strasse: String
    public var plz: String
    public var ort: String

    public var typ: Gebaeudetyp
    public var baujahr: Int
    public var wohnflaeche: Double
    public var wohneinheiten: Int

    public var heizungsart: Heizungsart
    public var heizungBaujahr: Int?

    public var dach: Bauteilzustand
    public var obersteGeschossdecke: Bauteilzustand
    public var fassade: Bauteilzustand
    public var kellerdecke: Bauteilzustand
    public var fensterBaujahr: Int?

    public var istWohngebaeude: Bool
    public var istDenkmal: Bool
    public var istVermietet: Bool

    /// Liegt ein gültiger individueller Sanierungsfahrplan vor?
    public var hatSanierungsfahrplan: Bool

    /// Ausstellungsjahr des vorhandenen Energieausweises, falls bekannt.
    public var energieausweisJahr: Int?

    public init(
        strasse: String = "",
        plz: String = "",
        ort: String = "",
        typ: Gebaeudetyp = .einfamilienhaus,
        baujahr: Int = 1970,
        wohnflaeche: Double = 140,
        wohneinheiten: Int = 1,
        heizungsart: Heizungsart = .gas,
        heizungBaujahr: Int? = nil,
        dach: Bauteilzustand = .unbekannt,
        obersteGeschossdecke: Bauteilzustand = .unbekannt,
        fassade: Bauteilzustand = .unbekannt,
        kellerdecke: Bauteilzustand = .unbekannt,
        fensterBaujahr: Int? = nil,
        istWohngebaeude: Bool = true,
        istDenkmal: Bool = false,
        istVermietet: Bool = false,
        hatSanierungsfahrplan: Bool = false,
        energieausweisJahr: Int? = nil
    ) {
        self.strasse = strasse
        self.plz = plz
        self.ort = ort
        self.typ = typ
        self.baujahr = baujahr
        self.wohnflaeche = wohnflaeche
        self.wohneinheiten = max(1, wohneinheiten)
        self.heizungsart = heizungsart
        self.heizungBaujahr = heizungBaujahr
        self.dach = dach
        self.obersteGeschossdecke = obersteGeschossdecke
        self.fassade = fassade
        self.kellerdecke = kellerdecke
        self.fensterBaujahr = fensterBaujahr
        self.istWohngebaeude = istWohngebaeude
        self.istDenkmal = istDenkmal
        self.istVermietet = istVermietet
        self.hatSanierungsfahrplan = hatSanierungsfahrplan
        self.energieausweisJahr = energieausweisJahr
    }

    public var anschrift: String {
        let zeile = [strasse, [plz, ort].filter { !$0.isEmpty }.joined(separator: " ")]
        return zeile.filter { !$0.isEmpty }.joined(separator: ", ")
    }

    /// Wie viele der optionalen Angaben sind gemacht? Steuert die Ergebnisspanne
    /// und die Fortschrittsanzeige in der App.
    public var angabenVollstaendigkeit: Double {
        var vorhanden = 0.0
        let gesamt = 6.0
        if dach != .unbekannt { vorhanden += 1 }
        if fassade != .unbekannt { vorhanden += 1 }
        if kellerdecke != .unbekannt { vorhanden += 1 }
        if obersteGeschossdecke != .unbekannt { vorhanden += 1 }
        if fensterBaujahr != nil { vorhanden += 1 }
        if heizungBaujahr != nil { vorhanden += 1 }
        return vorhanden / gesamt
    }
}

// MARK: - Maßnahmen

public enum Massnahmenart: String, Codable, CaseIterable, Sendable, Identifiable {
    case dach
    case fassade
    case fenster
    case kellerdecke
    case obersteGeschossdecke
    case lueftung
    case heizungstausch
    case heizungsoptimierung
    case effizienzhaus

    public var id: String { rawValue }

    public var bezeichnung: String {
        switch self {
        case .dach: return "Dach dämmen"
        case .fassade: return "Fassade dämmen"
        case .fenster: return "Fenster erneuern"
        case .kellerdecke: return "Kellerdecke dämmen"
        case .obersteGeschossdecke: return "Oberste Geschossdecke dämmen"
        case .lueftung: return "Lüftungsanlage"
        case .heizungstausch: return "Heizung tauschen"
        case .heizungsoptimierung: return "Heizung optimieren"
        case .effizienzhaus: return "Komplettsanierung zum Effizienzhaus"
        }
    }

    /// Zu welchem Fördertopf gehört die Maßnahme?
    public var topf: Foerdertopf {
        switch self {
        case .dach, .fassade, .fenster, .kellerdecke, .obersteGeschossdecke:
            return .gebaeudehuelle
        case .lueftung, .heizungsoptimierung:
            return .anlagentechnik
        case .heizungstausch:
            return .heizung
        case .effizienzhaus:
            return .effizienzhaus
        }
    }
}

public enum Foerdertopf: String, Codable, Sendable {
    case gebaeudehuelle
    case anlagentechnik
    case heizung
    case effizienzhaus
}

public struct Massnahme: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var art: Massnahmenart
    /// Brutto-Investitionskosten in Euro.
    public var kosten: Double

    public init(id: UUID = UUID(), art: Massnahmenart, kosten: Double) {
        self.id = id
        self.art = art
        self.kosten = max(0, kosten)
    }
}

// MARK: - Zählerstände

public enum Zaehlerart: String, Codable, CaseIterable, Sendable {
    case gas
    case strom
    case waerme
    case wasser

    public var bezeichnung: String {
        switch self {
        case .gas: return "Gas"
        case .strom: return "Strom"
        case .waerme: return "Wärme"
        case .wasser: return "Wasser"
        }
    }

    public var einheit: String {
        switch self {
        case .gas: return "m³"
        case .strom: return "kWh"
        case .waerme: return "kWh"
        case .wasser: return "m³"
        }
    }
}

public struct Zaehlerstand: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var art: Zaehlerart
    public var wert: Double
    public var datum: Date

    public init(id: UUID = UUID(), art: Zaehlerart, wert: Double, datum: Date) {
        self.id = id
        self.art = art
        self.wert = wert
        self.datum = datum
    }
}

// MARK: - Gemeinsame Ergebnistypen

/// Jede Ausgabe des Rechenkerns trägt ihre Annahmen mit sich. Eine Zahl ohne
/// ihre Annahmen ist in diesem Fachgebiet wertlos – und im Streitfall gefährlich.
public struct Annahme: Codable, Sendable, Equatable, Identifiable {
    public var id: String { bezeichnung }
    public let bezeichnung: String
    public let wert: String

    public init(_ bezeichnung: String, _ wert: String) {
        self.bezeichnung = bezeichnung
        self.wert = wert
    }
}

/// Ergebnisse werden grundsätzlich als Spanne ausgegeben, nie als Punktwert.
public struct Spanne: Codable, Sendable, Equatable {
    public let unten: Double
    public let oben: Double

    public init(unten: Double, oben: Double) {
        self.unten = min(unten, oben)
        self.oben = max(unten, oben)
    }

    public init(mitte: Double, unsicherheit: Double) {
        self.init(unten: mitte * (1 - unsicherheit), oben: mitte * (1 + unsicherheit))
    }

    public var mitte: Double { (unten + oben) / 2 }

    public func gerundet(auf schritt: Double) -> Spanne {
        Spanne(unten: (unten / schritt).rounded(.down) * schritt,
               oben: (oben / schritt).rounded(.up) * schritt)
    }
}

public enum Ampel: String, Codable, Sendable {
    case gruen
    case gelb
    case rot
    case neutral

    public var symbol: String {
        switch self {
        case .gruen: return "checkmark.circle.fill"
        case .gelb: return "exclamationmark.triangle.fill"
        case .rot: return "xmark.octagon.fill"
        case .neutral: return "info.circle.fill"
        }
    }
}
