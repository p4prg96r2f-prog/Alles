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
    static let naechtlicheGewinneWatt = 150.0

    /// Auswertung einer einzelnen Nacht.
    func ausNacht(_ messung: Nachtmessung, normaussentemperatur: Double) -> Nachtmessergebnis? {
        ausNaechten([messung], normaussentemperatur: normaussentemperatur)
    }

    /// Auswertung mehrerer Nächte.
    ///
    /// Ab drei Nächten mit unterschiedlicher Kälte wird nicht mehr gemittelt,
    /// sondern eine Gerade durch die Punkte gelegt: Die Steigung ist der
    /// Wärmeverlust, der Achsenabschnitt fängt Warmwasser und Grundlast ab.
    func ausNaechten(_ messungen: [Nachtmessung], normaussentemperatur: Double) -> Nachtmessergebnis? {

        let brauchbar = messungen.filter {
            $0.stunden >= 3 && $0.stunden <= 16
                && $0.zaehlerNachher > $0.zaehlerVorher
                && $0.temperaturdifferenz > 5
        }
        guard !brauchbar.isEmpty else { return nil }

        // Punkte: (Temperaturdifferenz, Nutzwärmeleistung in Watt)
        let punkte: [(delta: Double, leistung: Double)] = brauchbar.map { messung in
            let menge = messung.zaehlerNachher - messung.zaehlerVorher
            let kilowattstunden = inKilowattstunden(menge, brennstoff: messung.brennstoff)
            let nutzungsgrad = nutzungsgrad(fuer: messung.kesselart)
            let leistung = kilowattstunden * nutzungsgrad * 1000 / messung.stunden
            return (messung.temperaturdifferenz, leistung + Self.naechtlicheGewinneWatt)
        }

        let koeffizient: Double
        var grundlast = 0.0

        if punkte.count >= 3, spreizung(punkte) >= 4 {
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
            // Einzelne Nacht oder zu wenig Spreizung: direkt teilen.
            koeffizient = punkte.reduce(0) { $0 + $1.leistung / $1.delta } / Double(punkte.count)
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
            Annahme("Verfahren", brauchbar.count >= 3 ? "Ausgleichsgerade über \(brauchbar.count) Nächte" : "Direktmessung, \(brauchbar.count) Nacht(e)"),
            Annahme("Temperaturunterschied", "\(Formate.zahl(kaelteste, stellen: 1)) K"),
            Annahme("Wärmeverlust", "\(Formate.zahl(koeffizient, stellen: 0)) W/K"),
            Annahme("Innere Gewinne", "\(Int(Self.naechtlicheGewinneWatt)) W angerechnet"),
            Annahme("Normaußentemperatur", "\(Formate.zahl(normaussentemperatur, stellen: 0)) °C")
        ]
        if grundlast != 0 {
            annahmen.append(Annahme("Grundlast", "\(Formate.zahl(grundlast, stellen: 0)) W"))
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

        let bauart: Bauart
        switch jeQuadratmeter ?? zeitkonstante * 1.5 {
        case ..<60: bauart = .leicht
        case ..<120: bauart = .mittelschwer
        default: bauart = .schwer
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
