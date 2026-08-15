import Foundation

// MARK: - Eingaben

public enum Brennstoff: String, Codable, CaseIterable, Sendable {
    case gasKubikmeter
    case gasKilowattstunden
    case oelLiter
    case fernwaermeKilowattstunden
    case pelletsKilogramm

    public var bezeichnung: String {
        switch self {
        case .gasKubikmeter: return "Gas (m³)"
        case .gasKilowattstunden: return "Gas (kWh)"
        case .oelLiter: return "Heizöl (Liter)"
        case .fernwaermeKilowattstunden: return "Fernwärme (kWh)"
        case .pelletsKilogramm: return "Pellets (kg)"
        }
    }
}

public enum Kesselart: String, Codable, CaseIterable, Sendable {
    case standardkessel
    case brennwert
    case fernwaerme

    public var bezeichnung: String {
        switch self {
        case .standardkessel: return "Alter Standard- oder Niedertemperaturkessel"
        case .brennwert: return "Brennwertkessel"
        case .fernwaerme: return "Fernwärme-Übergabestation"
        }
    }
}

public struct Verbrauchsangabe: Codable, Sendable, Equatable {
    public var brennstoff: Brennstoff
    /// Jahresverbräuche, idealerweise zwei bis drei Jahre.
    public var jahreswerte: [Double]
    public var kesselart: Kesselart
    /// Ist die Warmwasserbereitung im Verbrauch enthalten?
    public var warmwasserEnthalten: Bool
    public var personenImHaushalt: Int

    public init(
        brennstoff: Brennstoff,
        jahreswerte: [Double],
        kesselart: Kesselart = .standardkessel,
        warmwasserEnthalten: Bool = true,
        personenImHaushalt: Int = 3
    ) {
        self.brennstoff = brennstoff
        self.jahreswerte = jahreswerte
        self.kesselart = kesselart
        self.warmwasserEnthalten = warmwasserEnthalten
        self.personenImHaushalt = max(1, personenImHaushalt)
    }
}

// MARK: - Ergebnis

public enum Heizlastverfahren: String, Codable, Sendable {
    case ausVerbrauch
    case ausGebaeudedaten

    public var bezeichnung: String {
        switch self {
        case .ausVerbrauch: return "Aus dem Verbrauch abgeschätzt"
        case .ausGebaeudedaten: return "Aus den Gebäudeangaben abgeschätzt"
        }
    }
}

public struct Heizlastergebnis: Codable, Sendable, Equatable {
    public let spanne: Spanne
    public let verfahren: Heizlastverfahren
    public let annahmen: [Annahme]
    public let regelVersion: Int

    /// Der Satz, der in jeder Ausgabe steht. Ohne ihn ist die Zahl gefährlich.
    public let vorbehalt: String
}

public struct Heizlastrechner {

    public static let vorbehalt = """
    Überschlägige Abschätzung, keine Auslegung. Für die Dimensionierung einer \
    Wärmepumpe, den hydraulischen Abgleich und jede Förderung ist eine raumweise \
    Heizlastberechnung nach DIN EN 12831 erforderlich.
    """

    public let regeln: Regelpaket

    public init(regeln: Regelpaket) {
        self.regeln = regeln
    }

    // MARK: Weg A – aus dem Verbrauch

    public func ausVerbrauch(_ angabe: Verbrauchsangabe) -> Heizlastergebnis? {
        let werte = angabe.jahreswerte.filter { $0 > 0 }
        guard !werte.isEmpty else { return nil }

        let h = regeln.heizlast
        let mittelwert = werte.reduce(0, +) / Double(werte.count)
        let endenergie = inKilowattstunden(mittelwert, brennstoff: angabe.brennstoff)

        // Warmwasseranteil abziehen. Wer ihn drin lässt, bekommt systematisch eine
        // zu hohe Heizlast – der häufigste Fehler bei Faustformeln.
        let warmwasser = angabe.warmwasserEnthalten
            ? h.warmwasserProPersonKWh * Double(angabe.personenImHaushalt)
            : 0
        let heizanteil = max(0, endenergie - warmwasser)

        let nutzungsgrad: Double
        switch angabe.kesselart {
        case .standardkessel: nutzungsgrad = h.kesselnutzungsgradStandard
        case .brennwert: nutzungsgrad = h.kesselnutzungsgradBrennwert
        case .fernwaerme: nutzungsgrad = 1.0
        }

        let nutzwaerme = heizanteil * nutzungsgrad

        // Die Spanne entsteht aus den Vollbenutzungsstunden: wenige Stunden
        // bedeuten eine höhere Last.
        let oben = nutzwaerme / h.vollbenutzungsstundenUnten
        let unten = nutzwaerme / h.vollbenutzungsstundenOben

        var annahmen: [Annahme] = [
            Annahme("Verfahren", "Verbrauch × Nutzungsgrad ÷ Vollbenutzungsstunden"),
            Annahme("Zugrunde gelegte Jahre", "\(werte.count)"),
            Annahme("Vollbenutzungsstunden", "\(Int(h.vollbenutzungsstundenUnten)) – \(Int(h.vollbenutzungsstundenOben)) h/a"),
            Annahme("Kesselnutzungsgrad", Formate.prozent(nutzungsgrad))
        ]
        if angabe.warmwasserEnthalten {
            annahmen.append(Annahme(
                "Warmwasser abgezogen",
                "\(Int(h.warmwasserProPersonKWh)) kWh je Person und Jahr, \(angabe.personenImHaushalt) Personen"
            ))
        }
        if werte.count < 2 {
            annahmen.append(Annahme("Hinweis", "Nur ein Jahr angegeben – mit zwei bis drei Jahren wird die Abschätzung deutlich belastbarer."))
        }

        return Heizlastergebnis(
            spanne: Spanne(unten: unten, oben: oben),
            verfahren: .ausVerbrauch,
            annahmen: annahmen,
            regelVersion: regeln.version,
            vorbehalt: Self.vorbehalt
        )
    }

    // MARK: Weg B – aus wenigen Gebäudeangaben

    public func ausGebaeudedaten(_ gebaeude: Gebaeude) -> Heizlastergebnis {
        let h = regeln.heizlast
        let spezifisch = spezifischeHeizlast(baujahr: gebaeude.baujahr)

        // Bereits erledigte Dämmmaßnahmen senken die spezifische Last.
        var minderung = 0.0
        minderung += 0.12 * gebaeude.dach.erledigtAnteil
        minderung += 0.06 * gebaeude.obersteGeschossdecke.erledigtAnteil
        minderung += 0.18 * gebaeude.fassade.erledigtAnteil
        minderung += 0.06 * gebaeude.kellerdecke.erledigtAnteil
        if let fj = gebaeude.fensterBaujahr {
            if fj >= 2010 { minderung += 0.10 }
            else if fj >= 1995 { minderung += 0.06 }
        }
        minderung = min(minderung, 0.45)

        let wattProM2 = spezifisch * (1 - minderung) * gebaeude.typ.kompaktheitsfaktor
        let mitte = wattProM2 * gebaeude.wohnflaeche / 1000.0

        // Weg B ist naturgemäß gröber als Weg A – das muss die Spanne zeigen.
        let unsicherheit = 0.25 - 0.08 * gebaeude.angabenVollstaendigkeit

        var annahmen: [Annahme] = [
            Annahme("Verfahren", "Spezifische Heizlast nach Baujahr × Wohnfläche"),
            Annahme("Kennwert Baujahr \(gebaeude.baujahr)", "\(Int(spezifisch)) W/m²"),
            Annahme("Gebäudetyp", gebaeude.typ.bezeichnung),
            Annahme("Beheizte Fläche", "\(Int(gebaeude.wohnflaeche)) m²")
        ]
        if minderung > 0 {
            annahmen.append(Annahme("Bereits gedämmt", "senkt den Kennwert um \(Formate.prozent(minderung))"))
        }
        _ = h

        return Heizlastergebnis(
            spanne: Spanne(mitte: mitte, unsicherheit: unsicherheit),
            verfahren: .ausGebaeudedaten,
            annahmen: annahmen,
            regelVersion: regeln.version,
            vorbehalt: Self.vorbehalt
        )
    }

    // MARK: Beide Wege gegeneinander

    public enum Abweichung: String, Sendable, Equatable {
        case stimmigZusammen
        case verbrauchDeutlichNiedriger
        case verbrauchDeutlichHoeher
    }

    public struct Vergleich: Sendable, Equatable {
        public let abweichung: Abweichung
        public let aussage: String
        /// Welcher Wert ist der belastbarere?
        public let empfohlenesVerfahren: Heizlastverfahren
    }

    /// Liegen beide Wege vor, muss die App dazu etwas sagen können.
    ///
    /// Zwei Zahlen, die um den Faktor drei auseinanderliegen, wirken sonst wie
    /// ein Fehler. Tatsächlich sind sie eine Aussage: Der gemessene Verbrauch
    /// ist das belastbarere Signal, und eine große Abweichung deutet auf einen
    /// anderen Gebäudezustand hin als die Eckdaten vermuten lassen.
    public func vergleiche(
        ausVerbrauch: Heizlastergebnis,
        ausGebaeudedaten: Heizlastergebnis
    ) -> Vergleich {
        let gemessen = ausVerbrauch.spanne.mitte
        let geschaetzt = ausGebaeudedaten.spanne.mitte
        guard geschaetzt > 0 else {
            return Vergleich(
                abweichung: .stimmigZusammen,
                aussage: "Beide Wege führen zu einem ähnlichen Ergebnis.",
                empfohlenesVerfahren: .ausVerbrauch
            )
        }

        let verhaeltnis = gemessen / geschaetzt

        if verhaeltnis < 0.7 {
            return Vergleich(
                abweichung: .verbrauchDeutlichNiedriger,
                aussage: "Ihr tatsächlicher Verbrauch liegt deutlich unter dem, was Baujahr und Angaben erwarten lassen. Das spricht dafür, dass am Haus bereits mehr gedämmt wurde als hinterlegt ist – oder dass sparsam geheizt wird. Für die Auslegung zählt der gemessene Wert.",
                empfohlenesVerfahren: .ausVerbrauch
            )
        }
        if verhaeltnis > 1.4 {
            return Vergleich(
                abweichung: .verbrauchDeutlichHoeher,
                aussage: "Ihr tatsächlicher Verbrauch liegt deutlich über dem, was Baujahr und Angaben erwarten lassen. Mögliche Gründe: hohe Raumtemperaturen, eine schlecht eingestellte Anlage oder ein zusätzlich beheizter Bereich. Das lohnt einen genaueren Blick.",
                empfohlenesVerfahren: .ausVerbrauch
            )
        }
        return Vergleich(
            abweichung: .stimmigZusammen,
            aussage: "Beide Wege führen zu einem ähnlichen Ergebnis – das erhöht das Vertrauen in die Abschätzung.",
            empfohlenesVerfahren: .ausVerbrauch
        )
    }

    // MARK: Hilfen

    func spezifischeHeizlast(baujahr: Int) -> Double {
        let klassen = regeln.heizlast.spezifischeHeizlast.sorted { $0.bisBaujahr < $1.bisBaujahr }
        for klasse in klassen where baujahr <= klasse.bisBaujahr {
            return klasse.wattProQuadratmeter
        }
        return klassen.last?.wattProQuadratmeter ?? 100
    }

    func inKilowattstunden(_ menge: Double, brennstoff: Brennstoff) -> Double {
        switch brennstoff {
        case .gasKubikmeter: return menge * regeln.heizlast.brennwertGasProKubikmeter
        case .gasKilowattstunden: return menge
        case .oelLiter: return menge * regeln.heizlast.heizwertOelProLiter
        case .fernwaermeKilowattstunden: return menge
        case .pelletsKilogramm: return menge * 4.8
        }
    }
}

// MARK: - Heizflächen

/// Die Frage, an der Wärmepumpenprojekte tatsächlich scheitern: Geben die
/// vorhandenen Heizkörper die Last auch bei abgesenkter Vorlauftemperatur ab?
public struct Heizkoerper: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var raum: String
    /// Nennleistung bei Auslegung 75/65/20 in Watt.
    public var nennleistungWatt: Double

    public init(id: UUID = UUID(), raum: String, nennleistungWatt: Double) {
        self.id = id
        self.raum = raum
        self.nennleistungWatt = max(0, nennleistungWatt)
    }
}

public struct Heizflaechenergebnis: Codable, Sendable, Equatable {
    public let vorlauftemperatur: Double
    public let ruecklauftemperatur: Double
    /// Anteil der Nennleistung, der bei dieser Auslegung noch abgegeben wird.
    public let leistungsfaktor: Double
    public let verfuegbareLeistungKW: Double
    public let benoetigtKW: Double
    public let reicht: Bool
    public let ampel: Ampel
    public let aussage: String
}

public enum Heizflaechenrechner {

    /// Exponent für Radiatoren. Für Flächenheizungen läge er niedriger.
    public static let exponent = 1.30
    public static let raumtemperatur = 20.0

    /// Logarithmische Übertemperatur nach der gängigen Auslegungsformel.
    public static func uebertemperatur(vorlauf: Double, ruecklauf: Double, raum: Double = raumtemperatur) -> Double {
        let oben = vorlauf - raum
        let unten = ruecklauf - raum
        guard oben > 0, unten > 0 else { return 0 }
        if abs(oben - unten) < 0.001 { return oben }
        return (oben - unten) / log(oben / unten)
    }

    public static func pruefe(
        heizkoerper: [Heizkoerper],
        heizlastKW: Double,
        vorlauf: Double = 55,
        ruecklauf: Double = 45
    ) -> Heizflaechenergebnis {

        let normUeber = uebertemperatur(vorlauf: 75, ruecklauf: 65)
        let istUeber = uebertemperatur(vorlauf: vorlauf, ruecklauf: ruecklauf)
        let faktor = normUeber > 0 ? pow(istUeber / normUeber, exponent) : 0

        let nennsumme = heizkoerper.reduce(0) { $0 + $1.nennleistungWatt } / 1000.0
        let verfuegbar = nennsumme * faktor
        let reicht = verfuegbar >= heizlastKW

        let ampel: Ampel
        let aussage: String
        if heizkoerper.isEmpty {
            ampel = .neutral
            aussage = "Noch keine Heizkörper erfasst."
        } else if verfuegbar >= heizlastKW * 1.1 {
            ampel = .gruen
            aussage = "Die vorhandenen Heizflächen reichen bei \(Int(vorlauf)) °C Vorlauf voraussichtlich aus."
        } else if verfuegbar >= heizlastKW * 0.9 {
            ampel = .gelb
            aussage = "Knapp. Einzelne Räume brauchen vermutlich größere Heizflächen – das klärt die raumweise Betrachtung."
        } else {
            ampel = .rot
            aussage = "Die Heizflächen reichen bei \(Int(vorlauf)) °C voraussichtlich nicht aus. Entweder größere Heizkörper oder erst die Gebäudehülle verbessern."
        }

        return Heizflaechenergebnis(
            vorlauftemperatur: vorlauf,
            ruecklauftemperatur: ruecklauf,
            leistungsfaktor: faktor,
            verfuegbareLeistungKW: verfuegbar,
            benoetigtKW: heizlastKW,
            reicht: reicht,
            ampel: ampel,
            aussage: aussage
        )
    }
}
