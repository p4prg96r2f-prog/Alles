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

    public init(
        spanne: Spanne,
        verfahren: Heizlastverfahren,
        annahmen: [Annahme],
        regelVersion: Int,
        vorbehalt: String = Heizlastrechner.vorbehalt
    ) {
        self.spanne = spanne
        self.verfahren = verfahren
        self.annahmen = annahmen
        self.regelVersion = regelVersion
        self.vorbehalt = vorbehalt
    }
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

        let nutzungsgrad: Double
        switch angabe.kesselart {
        case .standardkessel: nutzungsgrad = h.kesselnutzungsgradStandard
        case .brennwert: nutzungsgrad = h.kesselnutzungsgradBrennwert
        case .fernwaerme: nutzungsgrad = 1.0
        }

        // Warmwasseranteil abziehen. Wer ihn drin lässt, bekommt systematisch
        // eine zu hohe Heizlast – der häufigste Fehler bei Faustformeln.
        //
        // Wichtig für die Einheiten: Die Pauschale ist **Nutzwärme**. Sie darf
        // deshalb erst nach dem Nutzungsgrad abgezogen werden, nicht vorher von
        // der Endenergie.
        let warmwasser = angabe.warmwasserEnthalten
            ? h.warmwasserProPersonKWh * Double(angabe.personenImHaushalt)
            : 0
        let nutzwaerme = max(0, endenergie * nutzungsgrad - warmwasser)

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

    /// Die Kennwerte in W/m² beziehen sich auf eine Auslegungsdifferenz von
    /// 32 Kelvin (20 °C innen, −12 °C außen). Liegt das Gebäude in einer
    /// milderen oder raueren Region, muss der Wert mitwandern – sonst ist er in
    /// Köln zu hoch und im Erzgebirge zu niedrig.
    public static let bezugsdifferenz = 32.0

    /// Was darf man annehmen, solange der Zustand eines Bauteils **unbekannt**
    /// ist?
    ///
    /// Bisher galt unbekannt wie ungedämmt. Das ist keine neutrale Annahme,
    /// sondern die schlechteste denkbare – und bei einem Haus von 1968, das
    /// 2026 noch bewohnt wird, ist sie fast immer falsch. In knapp sechzig
    /// Jahren ist üblicherweise etwas passiert: die Fenster fast immer, das
    /// Dach oft, die Fassade seltener, die Kellerdecke selten.
    ///
    /// Wer „unbekannt“ mit „nichts gemacht“ gleichsetzt, zeigt einem Kunden mit
    /// leerer Gebäudeakte eine Heizlast, die um den Faktor zwei über dem liegt,
    /// was sein Zähler hergibt. Er glaubt dann keiner der beiden Zahlen mehr.
    ///
    /// Ab Baujahr 1995 entfällt der Zuschlag: Dort steckt der Standard schon im
    /// Kennwert, und ein zusätzlicher Abschlag wäre doppelt gezählt.
    static func erwarteterZustand(baujahr: Int) -> (dach: Double, geschossdecke: Double,
                                                    fassade: Double, kellerdecke: Double,
                                                    fenster: Double) {
        switch baujahr {
        case ..<1979: return (0.35, 0.35, 0.20, 0.10, 0.55)
        case ..<1995: return (0.20, 0.20, 0.10, 0.05, 0.35)
        default:      return (0, 0, 0, 0, 0)
        }
    }

    public func ausGebaeudedaten(
        _ gebaeude: Gebaeude,
        normaussentemperatur: Double = -12
    ) -> Heizlastergebnis {
        let spezifisch = spezifischeHeizlast(baujahr: gebaeude.baujahr)
        let erwartet = Self.erwarteterZustand(baujahr: gebaeude.baujahr)

        /// Bekannter Zustand schlägt die Erwartung – sonst gilt die Erwartung.
        func anteil(_ zustand: Bauteilzustand, erwartung: Double) -> Double {
            zustand == .unbekannt ? erwartung : zustand.erledigtAnteil
        }

        // Bereits erledigte Dämmmaßnahmen senken die spezifische Last.
        var minderung = 0.0
        minderung += 0.12 * anteil(gebaeude.dach, erwartung: erwartet.dach)
        minderung += 0.06 * anteil(gebaeude.obersteGeschossdecke, erwartung: erwartet.geschossdecke)
        minderung += 0.18 * anteil(gebaeude.fassade, erwartung: erwartet.fassade)
        minderung += 0.06 * anteil(gebaeude.kellerdecke, erwartung: erwartet.kellerdecke)
        if let fj = gebaeude.fensterBaujahr {
            if fj >= 2010 { minderung += 0.10 }
            else if fj >= 1995 { minderung += 0.06 }
        } else {
            minderung += 0.10 * erwartet.fenster
        }
        minderung = min(minderung, 0.45)

        let klimafaktor = max(0.5, (20 - normaussentemperatur) / Self.bezugsdifferenz)
        let wattProM2 = spezifisch * (1 - minderung) * gebaeude.typ.kompaktheitsfaktor * klimafaktor
        let mitte = wattProM2 * gebaeude.wohnflaeche / 1000.0

        // Weg B ist naturgemäß gröber als Weg A – das muss die Spanne zeigen.
        // Und sie muss ehrlich zeigen, wie wenig bekannt ist: Mit leerer
        // Gebäudeakte ist der Wert kaum mehr als eine Hausnummer, mit
        // vollständiger Akte eine brauchbare Abschätzung.
        let unsicherheit = 0.35 - 0.13 * gebaeude.angabenVollstaendigkeit

        var annahmen: [Annahme] = [
            Annahme("Verfahren", "Spezifische Heizlast nach Baujahr × Wohnfläche"),
            Annahme("Kennwert Baujahr \(gebaeude.baujahr)", "\(Int(spezifisch)) W/m²"),
            Annahme("Gebäudetyp", gebaeude.typ.bezeichnung),
            Annahme("Beheizte Fläche", "\(Int(gebaeude.wohnflaeche)) m²"),
            Annahme("Normaußentemperatur", "\(Formate.zahl(normaussentemperatur, stellen: 0)) °C")
        ]
        if minderung > 0 {
            annahmen.append(Annahme("Bereits gedämmt", "senkt den Kennwert um \(Formate.prozent(minderung))"))
        }
        if gebaeude.angabenVollstaendigkeit < 1 {
            annahmen.append(Annahme(
                "Unbekannte Bauteile",
                "mit dem für Baujahr \(gebaeude.baujahr) üblichen Zustand angesetzt"
            ))
        }

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
        // Ohne Wohnflächenangabe liefert der Gebäudeweg null – dann darf nicht
        // "stimmt überein" gemeldet werden.
        guard geschaetzt > 0.5, gemessen > 0.5 else {
            return Vergleich(
                abweichung: .stimmigZusammen,
                aussage: "Für einen Abgleich fehlen noch Angaben – ergänzen Sie die Wohnfläche unter „Mein Haus“.",
                empfohlenesVerfahren: .ausVerbrauch
            )
        }

        let verhaeltnis = gemessen / geschaetzt

        // Die Grenzen sind bewusst weit. Der Kennwert nach Baujahr beschreibt
        // ein *durchschnittliches* Gebäude seiner Bauzeit; der Verbrauch
        // beschreibt dieses eine Haus samt seiner Bewohner. Zwischen beiden
        // liegt regelmäßig ein Drittel, ohne dass irgendetwas falsch wäre –
        // eng gesetzte Grenzen würden bei fast jedem Haus Alarm schlagen und
        // die Meldung damit wertlos machen.
        if verhaeltnis < 0.55 {
            return Vergleich(
                abweichung: .verbrauchDeutlichNiedriger,
                aussage: "Ihr Verbrauch liegt deutlich unter dem Richtwert für Ihr Baujahr. Der Richtwert beschreibt ein durchschnittliches, unsaniertes Gebäude dieser Bauzeit – Ihr Haus ist offenbar besser. Häufigste Gründe: Es wurde mehr gedämmt, als unter „Mein Haus“ hinterlegt ist, oder es werden nicht alle Räume voll beheizt. Für die Auslegung zählt der gemessene Wert.",
                empfohlenesVerfahren: .ausVerbrauch
            )
        }
        if verhaeltnis > 1.5 {
            return Vergleich(
                abweichung: .verbrauchDeutlichHoeher,
                aussage: "Ihr Verbrauch liegt deutlich über dem Richtwert für Ihr Baujahr. Mögliche Gründe: hohe Raumtemperaturen, eine schlecht eingestellte Anlage, ein zusätzlich beheizter Bereich oder undichte Stellen. Das lohnt einen genaueren Blick.",
                empfohlenesVerfahren: .ausVerbrauch
            )
        }
        return Vergleich(
            abweichung: .stimmigZusammen,
            aussage: "Verbrauch und Richtwert passen zusammen. Das ist keine Genauigkeitsaussage, aber es spricht dafür, dass die Angaben unter „Mein Haus“ zu Ihrem Gebäude passen.",
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

    /// Prüft, ob die vorhandenen Heizflächen die Last bei abgesenkter
    /// Vorlauftemperatur abgeben.
    ///
    /// `erwarteteRaeume` ist keine Feinheit, sondern verhindert die
    /// schlimmste Fehlaussage dieses Rechners: Wer einen einzigen Heizkörper
    /// erfasst, um zu sehen wie es funktioniert, bekommt sonst „reicht nicht
    /// aus – entweder größere Heizkörper oder erst die Gebäudehülle
    /// verbessern“. Das ist der Satz, an dem Wärmepumpenprojekte scheitern,
    /// gefällt aus einem Zehntel der Daten.
    public static func pruefe(
        heizkoerper: [Heizkoerper],
        heizlastKW: Double,
        vorlauf: Double = 55,
        ruecklauf: Double = 45,
        erwarteteRaeume: Int? = nil
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
        } else if let erwartet = erwarteteRaeume, heizkoerper.count < erwartet {
            let fehlend = erwartet - heizkoerper.count
            ampel = .neutral
            aussage = "Erfasst sind \(heizkoerper.count) Heizkörper. Für ein Urteil müssen alle Heizflächen des Hauses drin sein – nach der Wohnfläche fehlen vermutlich noch etwa \(fehlend). Solange wird hier bewusst nichts bewertet."
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
