import Foundation

// MARK: - Nebenmodelle

public struct Dokument: Codable, Sendable, Identifiable, Equatable {
    public var id: UUID
    public var titel: String
    public var dateiname: String
    public var angelegt: Date
    public var art: Dokumentart

    public init(id: UUID = UUID(), titel: String, dateiname: String, angelegt: Date, art: Dokumentart) {
        self.id = id
        self.titel = titel
        self.dateiname = dateiname
        self.angelegt = angelegt
        self.art = art
    }

    public enum Dokumentart: String, Codable, Sendable, CaseIterable {
        case energieausweis, sanierungsfahrplan, foerderbescheid
        case rechnung, angebot, foto, sonstiges

        public var bezeichnung: String {
            switch self {
            case .energieausweis: return "Energieausweis"
            case .sanierungsfahrplan: return "Sanierungsfahrplan"
            case .foerderbescheid: return "Förderbescheid"
            case .rechnung: return "Rechnung"
            case .angebot: return "Angebot"
            case .foto: return "Foto"
            case .sonstiges: return "Sonstiges"
            }
        }

        public var symbol: String {
            switch self {
            case .energieausweis: return "doc.text"
            case .sanierungsfahrplan: return "map"
            case .foerderbescheid: return "checkmark.seal"
            case .rechnung: return "eurosign.circle"
            case .angebot: return "doc.plaintext"
            case .foto: return "photo"
            case .sonstiges: return "paperclip"
            }
        }
    }
}

/// Eine Berechnung wird mit ihrer Regelversion abgelegt. Nur so ist sie Jahre
/// später noch erklärbar, wenn sich die Förderung mehrfach geändert hat.
public struct GespeicherteBerechnung: Codable, Sendable, Identifiable, Equatable {
    public var id: UUID
    public var datum: Date
    public var art: String
    public var kurzfassung: String
    public var regelVersion: Int
    public var regelStand: String

    public init(id: UUID = UUID(), datum: Date, art: String, kurzfassung: String,
                regelVersion: Int, regelStand: String) {
        self.id = id
        self.datum = datum
        self.art = art
        self.kurzfassung = kurzfassung
        self.regelVersion = regelVersion
        self.regelStand = regelStand
    }
}

public struct Verlaufseintrag: Codable, Sendable, Identifiable, Equatable {
    public var id: UUID
    public var datum: Date
    public var text: String
    public var symbol: String

    public init(id: UUID = UUID(), datum: Date, text: String, symbol: String) {
        self.id = id
        self.datum = datum
        self.text = text
        self.symbol = symbol
    }
}

// MARK: - Ablage

/// Der gesamte gespeicherte Zustand der App – und die Ablauflogik dazu.
///
/// Bewusst hier im Kern und nicht in der Oberfläche: Dadurch lässt sich die
/// komplette Nutzungsstrecke vom Einstieg bis zum Löschen mit Testfällen
/// durchspielen, ohne ein Gerät.
public struct Ablage: Codable, Sendable, Equatable {

    public var schemaVersion: Int
    public var gebaeude: Gebaeude?
    public var haushalt: Haushalt
    public var massnahmen: [Massnahme]
    public var zaehlerstaende: [Zaehlerstand]
    public var heizkoerper: [Heizkoerper]
    /// Erfasste Nachtmessungen. Sie gehören in die Ablage und nicht in den
    /// Bildschirmzustand: Der Weg verlangt ausdrücklich mehrere Nächte, und
    /// eine Nacht lässt sich nicht nachholen.
    public var nachtmessungen: [Nachtmessung]
    /// Gespeicherte Maßnahmenpakete für den Variantenvergleich.
    public var varianten: [Variante]
    public var dokumente: [Dokument]
    public var berechnungen: [GespeicherteBerechnung]
    public var verlauf: [Verlaufseintrag]
    public var einstiegAbgeschlossen: Bool

    public init(
        schemaVersion: Int = 1,
        gebaeude: Gebaeude? = nil,
        haushalt: Haushalt = Haushalt(),
        massnahmen: [Massnahme] = [],
        zaehlerstaende: [Zaehlerstand] = [],
        heizkoerper: [Heizkoerper] = [],
        nachtmessungen: [Nachtmessung] = [],
        varianten: [Variante] = [],
        dokumente: [Dokument] = [],
        berechnungen: [GespeicherteBerechnung] = [],
        verlauf: [Verlaufseintrag] = [],
        einstiegAbgeschlossen: Bool = false
    ) {
        self.schemaVersion = schemaVersion
        self.gebaeude = gebaeude
        self.haushalt = haushalt
        self.massnahmen = massnahmen
        self.zaehlerstaende = zaehlerstaende
        self.heizkoerper = heizkoerper
        self.nachtmessungen = nachtmessungen
        self.varianten = varianten
        self.dokumente = dokumente
        self.berechnungen = berechnungen
        self.verlauf = verlauf
        self.einstiegAbgeschlossen = einstiegAbgeschlossen
    }

    /// Ältere Fassungen ohne einzelne Felder bleiben lesbar.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = try c.decodeIfPresent(Int.self, forKey: .schemaVersion) ?? 1
        gebaeude = try c.decodeIfPresent(Gebaeude.self, forKey: .gebaeude)
        haushalt = try c.decodeIfPresent(Haushalt.self, forKey: .haushalt) ?? Haushalt()
        massnahmen = try c.decodeIfPresent([Massnahme].self, forKey: .massnahmen) ?? []
        zaehlerstaende = try c.decodeIfPresent([Zaehlerstand].self, forKey: .zaehlerstaende) ?? []
        heizkoerper = try c.decodeIfPresent([Heizkoerper].self, forKey: .heizkoerper) ?? []
        nachtmessungen = try c.decodeIfPresent([Nachtmessung].self, forKey: .nachtmessungen) ?? []
        varianten = try c.decodeIfPresent([Variante].self, forKey: .varianten) ?? []
        dokumente = try c.decodeIfPresent([Dokument].self, forKey: .dokumente) ?? []
        berechnungen = try c.decodeIfPresent([GespeicherteBerechnung].self, forKey: .berechnungen) ?? []
        verlauf = try c.decodeIfPresent([Verlaufseintrag].self, forKey: .verlauf) ?? []
        einstiegAbgeschlossen = try c.decodeIfPresent(Bool.self, forKey: .einstiegAbgeschlossen) ?? false
    }

    // MARK: Einstieg

    public var brauchtEinstieg: Bool {
        gebaeude == nil || !einstiegAbgeschlossen
    }

    public mutating func schliesseEinstiegAb(mit gebaeude: Gebaeude, heute: Date = Date()) {
        self.gebaeude = gebaeude
        self.einstiegAbgeschlossen = true
        merke("Haus angelegt", symbol: "house", heute: heute)
    }

    // MARK: Zählerstände

    public var zaehlerstaendeNeuesteZuerst: [Zaehlerstand] {
        zaehlerstaende.sorted { $0.datum > $1.datum }
    }

    public func letzterStand(art: Zaehlerart) -> Zaehlerstand? {
        zaehlerstaendeNeuesteZuerst.first { $0.art == art }
    }

    public mutating func ergaenze(_ stand: Zaehlerstand, heute: Date = Date()) {
        zaehlerstaende.append(stand)
        merke("Zählerstand erfasst", symbol: "gauge.medium", heute: heute)
    }

    public mutating func loescheZaehlerstand(_ id: UUID) {
        zaehlerstaende.removeAll { $0.id == id }
    }

    /// Wie viele **zusammenhängende** Monate mit mindestens einem Wert liegen
    /// vor, rückwärts ab dem aktuellen Monat gezählt?
    ///
    /// Rückwärts ab *heute* und nicht ab dem letzten Eintrag: Wer drei Monate
    /// aussetzt, hat keine lückenlose Reihe mehr – und genau darauf kommt es bei
    /// einem Verbrauchsausweis an. Zukünftig datierte Einträge zählen nicht.
    public func zusammenhaengendeMonate(bis heute: Date = Date()) -> Int {
        let kalender = Calendar(identifier: .gregorian)
        let belegt = Set(zaehlerstaende.compactMap { monatsindex($0.datum, kalender) })
        guard let jetzt = monatsindex(heute, kalender) else { return 0 }

        // Der laufende Monat darf noch offen sein, ohne die Reihe zu brechen.
        var zeiger = belegt.contains(jetzt) ? jetzt : jetzt - 1
        var laenge = 0
        while belegt.contains(zeiger) {
            laenge += 1
            zeiger -= 1
        }
        return laenge
    }

    public func brauchtZaehlerstand(am heute: Date = Date()) -> Bool {
        let kalender = Calendar(identifier: .gregorian)
        guard let jetzt = monatsindex(heute, kalender) else { return true }
        return !zaehlerstaende.contains { monatsindex($0.datum, kalender) == jetzt }
    }

    private func monatsindex(_ datum: Date, _ kalender: Calendar) -> Int? {
        let teile = kalender.dateComponents([.year, .month], from: datum)
        guard let jahr = teile.year, let monat = teile.month else { return nil }
        return jahr * 12 + monat
    }

    // MARK: Dokumente und Berechnungen

    public var dokumenteNeuesteZuerst: [Dokument] {
        dokumente.sorted { $0.angelegt > $1.angelegt }
    }

    public mutating func ergaenze(_ dokument: Dokument, heute: Date = Date()) {
        dokumente.append(dokument)
        merke("\(dokument.art.bezeichnung) abgelegt", symbol: dokument.art.symbol, heute: heute)
    }

    public mutating func loescheDokument(_ id: UUID) {
        dokumente.removeAll { $0.id == id }
    }

    public var berechnungenNeuesteZuerst: [GespeicherteBerechnung] {
        berechnungen.sorted { $0.datum > $1.datum }
    }

    public mutating func merkeBerechnung(
        art: String, kurzfassung: String,
        regelVersion: Int, regelStand: String,
        heute: Date = Date()
    ) {
        berechnungen.append(GespeicherteBerechnung(
            datum: heute, art: art, kurzfassung: kurzfassung,
            regelVersion: regelVersion, regelStand: regelStand
        ))
        merke("\(art) gesichert", symbol: "square.and.arrow.down", heute: heute)
    }

    // MARK: Verlauf

    public var verlaufNeuesteZuerst: [Verlaufseintrag] {
        Array(verlauf.sorted { $0.datum > $1.datum }.prefix(12))
    }

    public mutating func merke(_ text: String, symbol: String, heute: Date = Date()) {
        verlauf.append(Verlaufseintrag(datum: heute, text: text, symbol: symbol))
        if verlauf.count > 100 {
            verlauf.removeFirst(verlauf.count - 100)
        }
    }
}

// MARK: - Welche Funktion ist gerade dran?

/// Der Startbildschirm zeigt mehrere Funktionen nebeneinander und **markiert**
/// eine davon. Welche das ist, entscheidet sich hier – und ist damit prüfbar
/// statt in einer Ansicht vergraben.
///
/// Früher verdrängte diese eine Aufgabe alles andere. Das ging schief, sobald
/// sie zur Dauerpflicht wurde: „Zählerstand erfassen“ ist elf Monate im Jahr
/// die nächste Aufgabe, und ein Startbildschirm, der nur danach fragt, sieht
/// aus wie eine Mahnung statt wie ein Werkzeugkasten. Die Empfehlung ist
/// geblieben, ihr Alleinvertretungsanspruch nicht.
public struct Aufgabe: Sendable, Equatable {

    public enum Art: String, Sendable, Equatable {
        case einstieg
        case zaehlerstand
        case ersteBerechnung
        case angabenErgaenzen
        case nichtsZuTun
    }

    public let art: Art
    public let titel: String
    public let erlaeuterung: String
    public let knopf: String?
    public let symbol: String

    public static func naechste(
        ablage: Ablage,
        regeln: Regelpaket,
        heute: Date = Date()
    ) -> Aufgabe {

        if ablage.brauchtEinstieg {
            return Aufgabe(
                art: .einstieg,
                titel: "Ihr Haus anlegen",
                erlaeuterung: "Drei Fragen genügen für eine erste Einschätzung.",
                knopf: "Loslegen",
                symbol: "house"
            )
        }

        // Die Förderabschätzung steht **vor** dem Zählerstand: Wer die App
        // gerade erst eingerichtet hat, ist wegen dieser Zahl gekommen. Erst
        // danach wird das monatliche Ablesen zur wiederkehrenden Aufgabe.
        if ablage.massnahmen.isEmpty && ablage.berechnungen.isEmpty {
            return Aufgabe(
                art: .ersteBerechnung,
                titel: "Erste Förderabschätzung machen",
                erlaeuterung: "Wählen Sie aus, was Sie vorhaben – Sie sehen sofort, welcher Zuschuss in Frage kommt und was unterm Strich bleibt.",
                knopf: "Förderung berechnen",
                symbol: "eurosign.circle"
            )
        }

        if ablage.brauchtZaehlerstand(am: heute) {
            let vorhanden = ablage.zusammenhaengendeMonate(bis: heute)
            let fehlend = max(0, regeln.gebaeude.verbrauchsausweisMonate - vorhanden)
            return Aufgabe(
                art: .zaehlerstand,
                titel: "Zählerstand erfassen",
                erlaeuterung: fehlend > 0
                    ? "Noch \(fehlend) von \(regeln.gebaeude.verbrauchsausweisMonate) Monaten, bis ein Verbrauchsausweis möglich ist. Diese Zeit lässt sich nicht nachholen."
                    : "Ihre Verbrauchsreihe ist vollständig – weiter so, damit sie es bleibt.",
                knopf: "Zähler abfotografieren",
                symbol: "camera"
            )
        }

        if let g = ablage.gebaeude, g.angabenVollstaendigkeit < 1 {
            return Aufgabe(
                art: .angabenErgaenzen,
                titel: "Ergebnis genauer machen",
                erlaeuterung: "Ihr Ergebnis wird als Spanne angezeigt, weil noch Angaben fehlen. Jede Ergänzung zu Dach, Fassade oder Fenstern verengt sie.",
                knopf: "Angaben ergänzen",
                symbol: "square.and.pencil"
            )
        }

        return Aufgabe(
            art: .nichtsZuTun,
            titel: "Alles erledigt",
            erlaeuterung: "Wir melden uns, wenn sich an Ihrer Förderung etwas ändert oder eine Frist näher rückt.",
            knopf: nil,
            symbol: "checkmark.circle"
        )
    }
}
