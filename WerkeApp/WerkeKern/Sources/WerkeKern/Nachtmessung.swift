import Foundation

/// Heizlast aus einer einzigen kalten Nacht.
///
/// **Die entscheidende Einsicht vorweg.**
/// Aus dem *Abkühlen* allein lässt sich die Heizlast nicht bestimmen. Ein
/// Gebäude kühlt exponentiell ab, mit der Zeitkonstante τ = C / H – also dem
/// Verhältnis von Wärmespeicherfähigkeit zu Wärmeverlust. Gemessen wird dabei
/// nur τ. Ein schweres, schlecht gedämmtes Haus kühlt genauso langsam ab wie
/// ein leichtes, gut gedämmtes. Ohne die Speicherfähigkeit zu kennen, bleibt
/// die Abkühlkurve mehrdeutig.
///
/// **Was dagegen sofort funktioniert:** die *zugeführte* Wärme messen.
/// Steht die Innentemperatur still, ist die Heizleistung genau gleich dem
/// Wärmeverlust:
///
///     Φ = H · (T_innen − T_außen)      →      H = Φ / ΔT
///
/// Und Φ steht am Gaszähler. Zwei Ablesungen in einer kalten Nacht – abends und
/// morgens – genügen. Nachts ist das besonders sauber: keine Sonne, kaum
/// Warmwasser, ruhige innere Wärmequellen.
///
/// Das ist der schnellste belastbare Weg zur Heizlast, den es ohne Messtechnik
/// gibt: **eine Nacht statt zwei Jahre.** Und weil bei Kälte gemessen wird,
/// ist der Weg bis zur Auslegungstemperatur kurz – anders als bei jeder
/// Hochrechnung aus Jahresverbräuchen.
public struct Nachtmessung: Codable, Sendable, Equatable {

    public var beginn: Date
    public var ende: Date
    public var zaehlerVorher: Double
    public var zaehlerNachher: Double
    public var brennstoff: Brennstoff
    /// Mittlere Außentemperatur im Messzeitraum in Grad Celsius.
    public var mittlereAussentemperatur: Double
    /// Gehaltene Innentemperatur in Grad Celsius.
    public var innentemperatur: Double
    public var kesselart: Kesselart

    public init(
        beginn: Date, ende: Date,
        zaehlerVorher: Double, zaehlerNachher: Double,
        brennstoff: Brennstoff = .gasKubikmeter,
        mittlereAussentemperatur: Double,
        innentemperatur: Double = 20,
        kesselart: Kesselart = .standardkessel
    ) {
        self.beginn = beginn
        self.ende = ende
        self.zaehlerVorher = zaehlerVorher
        self.zaehlerNachher = zaehlerNachher
        self.brennstoff = brennstoff
        self.mittlereAussentemperatur = mittlereAussentemperatur
        self.innentemperatur = innentemperatur
        self.kesselart = kesselart
    }

    public var stunden: Double {
        ende.timeIntervalSince(beginn) / 3600
    }

    public var temperaturdifferenz: Double {
        innentemperatur - mittlereAussentemperatur
    }
}

public struct Nachtmessergebnis: Sendable, Equatable {

    public enum Guete: String, Sendable, Equatable {
        case belastbar
        case brauchbar
        case unsicher

        public var bezeichnung: String {
            switch self {
            case .belastbar: return "belastbar"
            case .brauchbar: return "brauchbar"
            case .unsicher: return "unsicher"
            }
        }
    }

    public let mittlereHeizleistung: Double        // Watt Nutzwärme
    public let waermeverlustkoeffizient: Double    // W/K
    public let heizlast: Spanne                    // kW bei Normaußentemperatur
    public let temperaturdifferenz: Double
    public let stunden: Double
    public let naechte: Int
    public let guete: Guete
    public let annahmen: [Annahme]
    public let hinweis: String?
}

public extension Heizlastrechner {

    /// Innere Wärmequellen in der Nacht: schlafende Menschen, Kühlschrank,
    /// Bereitschaftsverbraucher. Sie heizen mit und müssen der gemessenen
    /// Heizleistung zugeschlagen werden.
    ///
    /// Der Wert entspricht `naechtlicheGewinne(beheizteFlaeche: 140)` und gilt,
    /// solange die Fläche nicht bekannt ist.
    static let naechtlicheGewinneWatt = 150.0

    /// Innere Wärmequellen in der Nacht, mit der Gebäudegröße wachsend.
    ///
    /// Ein Sockel von 80 W steht für Kühlschrank, Router und Bereitschaft – der
    /// fällt in jedem Haushalt an. Die halben Watt je Quadratmeter stehen für
    /// die Menschen und die verteilten Kleinverbraucher: In einem Haus mit 250
    /// Quadratmetern schlafen im Mittel mehr Personen als in einer Wohnung mit
    /// 70. Ein fester Betrag würde große Gebäude systematisch zu schlecht und
    /// kleine zu gut rechnen.
    static func naechtlicheGewinne(beheizteFlaeche: Double?) -> Double {
        guard let flaeche = beheizteFlaeche, flaeche > 0 else { return naechtlicheGewinneWatt }
        return min(400, max(100, 80 + 0.5 * flaeche))
    }

    /// Was der Kessel nachts unabhängig von der Kälte verbraucht:
    /// Warmwasser-Bereitschaft, Speicherverluste, Zirkulation. Bei drei und
    /// mehr Nächten ermittelt die Ausgleichsgerade diesen Anteil aus den Daten
    /// selbst – bei einer einzigen Nacht muss er angesetzt werden, sonst wird
    /// er als Wärmeverlust gedeutet und auf die Auslegung hochgerechnet.
    static let naechtlicheGrundlastWatt = 250.0

    /// Auswertung einer einzelnen Nacht.
    func ausNacht(
        _ messung: Nachtmessung,
        normaussentemperatur: Double,
        beheizteFlaeche: Double? = nil
    ) -> Nachtmessergebnis? {
        ausNaechten([messung], normaussentemperatur: normaussentemperatur,
                    beheizteFlaeche: beheizteFlaeche)
    }

    /// Auswertung mehrerer Nächte.
    ///
    /// Ab drei Nächten mit unterschiedlicher Kälte wird nicht mehr gemittelt,
    /// sondern eine Gerade durch die Punkte gelegt: Die Steigung ist der
    /// Wärmeverlust, der Achsenabschnitt fängt Warmwasser und Grundlast ab.
    func ausNaechten(
        _ messungen: [Nachtmessung],
        normaussentemperatur: Double,
        beheizteFlaeche: Double? = nil
    ) -> Nachtmessergebnis? {

        let brauchbar = messungen.filter {
            $0.stunden >= 3 && $0.stunden <= 16
                && $0.zaehlerNachher > $0.zaehlerVorher
                && $0.temperaturdifferenz > 5
        }
        guard !brauchbar.isEmpty else { return nil }

        let gewinne = Self.naechtlicheGewinne(beheizteFlaeche: beheizteFlaeche)

        // Punkte: (Temperaturdifferenz, Nutzwärmeleistung in Watt)
        let punkte: [(delta: Double, leistung: Double)] = brauchbar.map { messung in
            let menge = messung.zaehlerNachher - messung.zaehlerVorher
            let kilowattstunden = inKilowattstunden(menge, brennstoff: messung.brennstoff)
            let nutzungsgrad = nutzungsgrad(fuer: messung.kesselart)
            let leistung = kilowattstunden * nutzungsgrad * 1000 / messung.stunden
            return (messung.temperaturdifferenz, leistung + gewinne)
        }

        // Ohne Ausgleichsgerade wird die Grundlast pauschal abgezogen.
        let einzelpunkte: [(delta: Double, leistung: Double)] = punkte.map {
            ($0.delta, max(0, $0.leistung - Self.naechtlicheGrundlastWatt))
        }

        // Eine Gerade braucht mehr als drei Punkte – sie braucht Punkte, die
        // auseinanderliegen. Drei gleich kalte Nächte legen die Steigung nicht
        // fest. Genau dieselbe Bedingung entscheidet weiter unten darüber, was
        // in den Annahmen als Verfahren steht.
        let mitAusgleichsgerade = punkte.count >= 3 && spreizung(punkte) >= 4

        let koeffizient: Double
        var grundlast = 0.0

        if mitAusgleichsgerade {
            // Ausgleichsgerade: Leistung = Grundlast + H · ΔT
            let n = Double(punkte.count)
            let summeX = punkte.reduce(0) { $0 + $1.delta }
            let summeY = punkte.reduce(0) { $0 + $1.leistung }
            let summeXY = punkte.reduce(0) { $0 + $1.delta * $1.leistung }
            let summeXX = punkte.reduce(0) { $0 + $1.delta * $1.delta }
            let nenner = n * summeXX - summeX * summeX
            guard abs(nenner) > 1e-6 else { return nil }

            koeffizient = (n * summeXY - summeX * summeY) / nenner
            grundlast = (summeY - koeffizient * summeX) / n
        } else {
            // Einzelne Nacht oder zu wenig Spreizung: direkt teilen, nachdem
            // die Grundlast abgezogen wurde.
            koeffizient = einzelpunkte.reduce(0) { $0 + $1.leistung / $1.delta } / Double(einzelpunkte.count)
        }

        guard koeffizient > 0 else { return nil }

        let auslegungsdifferenz = 20 - normaussentemperatur
        let roh = koeffizient * auslegungsdifferenz / 1000

        // Je kälter gemessen wurde, desto kürzer der Weg bis zur
        // Auslegungstemperatur – und desto enger darf die Spanne sein.
        let kaelteste = brauchbar.map(\.temperaturdifferenz).max() ?? 0
        let unsicherheit: Double
        let guete: Nachtmessergebnis.Guete
        var hinweis: String?

        switch (kaelteste, brauchbar.count) {
        case let (delta, anzahl) where delta >= 20 && anzahl >= 3:
            unsicherheit = 0.08
            guete = .belastbar
        case let (delta, _) where delta >= 20:
            unsicherheit = 0.12
            guete = .brauchbar
            hinweis = "Eine Nacht genügt für eine gute Abschätzung. Mit zwei weiteren – möglichst unterschiedlich kalten – Nächten wird daraus ein belastbarer Wert."
        case let (delta, _) where delta >= 15:
            unsicherheit = 0.15
            guete = .brauchbar
            hinweis = "Es war für die Messung noch recht mild. Eine kältere Nacht verkürzt den Weg bis zur Auslegungstemperatur und macht das Ergebnis genauer."
        default:
            unsicherheit = 0.25
            guete = .unsicher
            hinweis = "Der Temperaturunterschied war zu gering. Verlässlich wird die Messung erst ab etwa 15 Grad Unterschied zwischen innen und außen."
        }

        var annahmen: [Annahme] = [
            Annahme("Verfahren", mitAusgleichsgerade
                ? "Ausgleichsgerade über \(brauchbar.count) Nächte"
                : "Direktmessung, \(brauchbar.count) Nacht(e)"),
            Annahme("Temperaturunterschied", "\(Formate.zahl(kaelteste, stellen: 1)) K"),
            Annahme("Wärmeverlust", "\(Formate.zahl(koeffizient, stellen: 0)) W/K"),
            Annahme("Innere Gewinne", "\(Formate.zahl(gewinne, stellen: 0)) W angerechnet"),
            Annahme(
                "Grundlast",
                mitAusgleichsgerade
                    ? "aus den Nächten ermittelt"
                    : "\(Int(Self.naechtlicheGrundlastWatt)) W abgezogen, angenommen"
            ),
            Annahme("Normaußentemperatur", "\(Formate.zahl(normaussentemperatur, stellen: 0)) °C")
        ]
        if grundlast != 0 {
            annahmen.append(Annahme("Ermittelte Grundlast", "\(Formate.zahl(grundlast, stellen: 0)) W"))
        }

        return Nachtmessergebnis(
            mittlereHeizleistung: punkte.reduce(0) { $0 + $1.leistung } / Double(punkte.count),
            waermeverlustkoeffizient: koeffizient,
            heizlast: Spanne(mitte: roh, unsicherheit: unsicherheit),
            temperaturdifferenz: kaelteste,
            stunden: brauchbar.reduce(0) { $0 + $1.stunden } / Double(brauchbar.count),
            naechte: brauchbar.count,
            guete: guete,
            annahmen: annahmen,
            hinweis: hinweis
        )
    }

    private func spreizung(_ punkte: [(delta: Double, leistung: Double)]) -> Double {
        let werte = punkte.map(\.delta)
        return (werte.max() ?? 0) - (werte.min() ?? 0)
    }

    private func nutzungsgrad(fuer kesselart: Kesselart) -> Double {
        switch kesselart {
        case .standardkessel: return regeln.heizlast.kesselnutzungsgradStandard
        case .brennwert: return regeln.heizlast.kesselnutzungsgradBrennwert
        case .fernwaerme: return 1.0
        }
    }
}

// MARK: - Abkühlversuch

/// Die Abkühlkurve liefert die **Zeitkonstante**, nicht die Heizlast.
///
/// Sie wird trotzdem gebraucht: Zusammen mit dem gemessenen Wärmeverlust ergibt
/// sich daraus die Wärmespeicherfähigkeit des Gebäudes – und damit die Antwort
/// auf die Frage, ob sich Nachtabsenkung lohnt und wie träge das Haus auf eine
/// Wärmepumpe reagiert.
public enum Abkuehlmessung {

    public struct Ergebnis: Sendable, Equatable {
        /// Zeitkonstante in Stunden.
        public let zeitkonstante: Double
        /// Wirksame Wärmespeicherfähigkeit in Wattstunden je Kelvin.
        public let speicherfaehigkeit: Double?
        public let jeQuadratmeter: Double?
        public let bauart: Bauart
        public let aussage: String
    }

    public enum Bauart: String, Sendable, Equatable {
        case leicht
        case mittelschwer
        case schwer

        public var bezeichnung: String {
            switch self {
            case .leicht: return "leichte Bauart"
            case .mittelschwer: return "mittelschwere Bauart"
            case .schwer: return "schwere Bauart"
            }
        }
    }

    /// Wertet einen Temperaturverlauf ohne Heizung aus.
    ///
    /// Erwartet mindestens drei Messpunkte. Aus der Steigung von
    /// ln(T_innen − T_außen) über der Zeit folgt die Zeitkonstante.
    public static func auswerten(
        verlauf: [(zeit: Date, innentemperatur: Double)],
        aussentemperatur: Double,
        waermeverlustkoeffizient: Double? = nil,
        beheizteFlaeche: Double? = nil
    ) -> Ergebnis? {

        let punkte = verlauf
            .sorted { $0.zeit < $1.zeit }
            .compactMap { punkt -> (stunden: Double, logarithmus: Double)? in
                let ueber = punkt.innentemperatur - aussentemperatur
                guard ueber > 0.5 else { return nil }
                return (punkt.zeit.timeIntervalSince(verlauf[0].zeit) / 3600, log(ueber))
            }
        guard punkte.count >= 3 else { return nil }

        let n = Double(punkte.count)
        let summeX = punkte.reduce(0) { $0 + $1.stunden }
        let summeY = punkte.reduce(0) { $0 + $1.logarithmus }
        let summeXY = punkte.reduce(0) { $0 + $1.stunden * $1.logarithmus }
        let summeXX = punkte.reduce(0) { $0 + $1.stunden * $1.stunden }
        let nenner = n * summeXX - summeX * summeX
        guard abs(nenner) > 1e-6 else { return nil }

        let steigung = (n * summeXY - summeX * summeY) / nenner
        guard steigung < 0 else { return nil }      // es muss kälter werden

        let zeitkonstante = -1 / steigung

        var speicher: Double?
        var jeQuadratmeter: Double?
        if let h = waermeverlustkoeffizient, h > 0 {
            speicher = zeitkonstante * h
            if let flaeche = beheizteFlaeche, flaeche > 0 {
                jeQuadratmeter = speicher! / flaeche
            }
        }

        // Die Einordnung läuft über die Speicherfähigkeit je Quadratmeter, wenn
        // sie bekannt ist – das sind Wattstunden je Kelvin und Quadratmeter,
        // und dafür gibt es Erfahrungswerte (rund 50 leicht, 90 mittel, 130
        // schwer nach DIN V 4108-6). Fehlt der Wärmeverlust, bleibt nur die
        // Zeitkonstante in Stunden. Beides in denselben Vergleich zu werfen,
        // wäre ein Einheitenfehler: Ein Haus mit 50 Stunden Zeitkonstante wäre
        // dann „leicht“, obwohl 50 Stunden bereits schwer sind.
        let bauart: Bauart
        if let dichte = jeQuadratmeter {
            switch dichte {
            case ..<60: bauart = .leicht
            case ..<120: bauart = .mittelschwer
            default: bauart = .schwer
            }
        } else {
            switch zeitkonstante {
            case ..<40: bauart = .leicht
            case ..<90: bauart = .mittelschwer
            default: bauart = .schwer
            }
        }

        let aussage: String
        switch bauart {
        case .leicht:
            aussage = "Das Haus reagiert schnell auf Änderungen. Eine Nachtabsenkung wirkt hier spürbar, verlangt morgens aber auch mehr Leistung."
        case .mittelschwer:
            aussage = "Übliches Verhalten. Absenkung bringt etwas, ohne dass morgens ein großer Nachholbedarf entsteht."
        case .schwer:
            aussage = "Das Haus hält die Wärme lange. Nachtabsenkung bringt wenig – für eine Wärmepumpe ist das günstig, weil sie durchlaufen kann."
        }

        return Ergebnis(
            zeitkonstante: zeitkonstante,
            speicherfaehigkeit: speicher,
            jeQuadratmeter: jeQuadratmeter,
            bauart: bauart,
            aussage: aussage
        )
    }
}
