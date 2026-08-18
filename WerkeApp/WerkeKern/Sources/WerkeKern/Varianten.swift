import Foundation

/// Ein gespeichertes Maßnahmenpaket – „Variante A: nur Heizung“,
/// „Variante B: Heizung und Fassade“.
///
/// **Warum es das braucht.** Die eigentliche Entscheidung eines Eigentümers ist
/// selten „Fassade: ja oder nein“, sondern „welches Paket“: Die Förderung
/// belohnt Bündelung (iSFP-Bonus erst ab 30.000 €), und der Unterschied
/// zwischen zwei Paketen ist oft größer als der zwischen zwei Angeboten für
/// dasselbe Paket. Ein Rechner, der immer nur die aktuelle Auswahl zeigt,
/// zwingt zum Merken – und verglichen wird dann aus dem Gedächtnis.
public struct Variante: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var name: String
    public var massnahmen: [Massnahme]

    public init(id: UUID = UUID(), name: String, massnahmen: [Massnahme]) {
        self.id = id
        self.name = name
        self.massnahmen = massnahmen
    }
}

/// Eine Zeile des Vergleichs – eine Variante, durchgerechnet.
public struct Variantenzeile: Sendable, Equatable, Identifiable {
    public var id: UUID { variante.id }
    public let variante: Variante
    public let investition: Double
    public let zuschuss: Double
    public let eigenanteil: Double
    /// Zuschuss geteilt durch Investition – der Satz, der wirklich ankommt.
    public var effektiverSatz: Double {
        investition > 0 ? zuschuss / investition : 0
    }
}

public struct Variantenvergleich: Sendable, Equatable {
    public let zeilen: [Variantenzeile]

    /// Die Variante mit dem höchsten Zuschuss.
    public var hoechsterZuschuss: Variantenzeile? {
        zeilen.max { $0.zuschuss < $1.zuschuss }
    }

    /// Die Variante mit dem niedrigsten Eigenanteil.
    public var niedrigsterEigenanteil: Variantenzeile? {
        zeilen.min { $0.eigenanteil < $1.eigenanteil }
    }

    /// Ein Satz, der den Vergleich zusammenfasst – für Anzeige und Anfrage.
    ///
    /// Bewusst vorsichtig formuliert: „Am meisten Zuschuss“ ist nicht
    /// „am besten“. Ein größeres Paket hat fast immer mehr Zuschuss und mehr
    /// Eigenanteil zugleich; welches passt, ist eine Geldbeutel- und keine
    /// Rechenfrage.
    public var aussage: String? {
        guard zeilen.count >= 2,
              let meist = hoechsterZuschuss,
              let wenigst = niedrigsterEigenanteil else { return nil }
        if meist.id == wenigst.id {
            return "„\(meist.variante.name)“ hat den höchsten Zuschuss und zugleich den niedrigsten Eigenanteil."
        }
        return "Den höchsten Zuschuss hat „\(meist.variante.name)“ (\(Formate.euro(meist.zuschuss))), den niedrigsten Eigenanteil „\(wenigst.variante.name)“ (\(Formate.euro(wenigst.eigenanteil))). Welches Paket passt, ist eine Frage des Budgets – nicht der Förderung."
    }
}

public extension Foerderrechner {

    /// Rechnet alle Varianten mit denselben Gebäude- und Haushaltsangaben
    /// durch – nur so sind die Zeilen vergleichbar.
    func vergleiche(
        _ varianten: [Variante],
        gebaeude: Gebaeude,
        haushalt: Haushalt = Haushalt()
    ) -> Variantenvergleich {
        let zeilen = varianten.map { variante -> Variantenzeile in
            let e = berechne(gebaeude: gebaeude, massnahmen: variante.massnahmen, haushalt: haushalt)
            return Variantenzeile(
                variante: variante,
                investition: e.investitionGesamt,
                zuschuss: e.zuschussGesamt,
                eigenanteil: e.eigenanteilGesamt
            )
        }
        return Variantenvergleich(zeilen: zeilen)
    }
}
