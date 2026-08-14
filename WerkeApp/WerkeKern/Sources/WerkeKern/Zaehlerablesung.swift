import Foundation

/// Auswertung erkannter Texte – bewusst im Kern und ohne Kamerabezug, damit sie
/// mit Testfällen abgesichert werden kann.
public enum Zaehlerablesung {

    /// Sucht in erkannten Textzeilen einen plausiblen Zählerstand.
    ///
    /// Zählwerke haben typischerweise vier bis acht Stellen, oft mit einer
    /// abgesetzten Nachkommastelle. Genommen wird der Fund mit den meisten
    /// Vorkommastellen – das trifft in der Praxis das Hauptzählwerk und nicht
    /// die Zählernummer darunter.
    public static func zaehlerstand(ausTexten texte: [String]) -> Double? {
        var beste: (stellen: Int, wert: Double)?

        for text in texte {
            // Achtung: `isNumber` trifft auch hochgestellte Ziffern – „m³“ steht
            // auf jedem Gaszähler und würde die Auswertung sonst zerstören.
            let gesaeubert = text.filter { ($0.isNumber && $0.isASCII) || $0 == "," || $0 == "." }
            guard !gesaeubert.isEmpty else { continue }

            let vereinheitlicht = gesaeubert.replacingOccurrences(of: ",", with: ".")
            let teile = vereinheitlicht.split(separator: ".")
            guard let vorkomma = teile.first,
                  vorkomma.count >= 4, vorkomma.count <= 9 else { continue }

            let nachkomma = teile.count > 1 ? String(teile[1].prefix(1)) : "0"
            guard let wert = Double("\(vorkomma).\(nachkomma)") else { continue }

            if beste == nil || vorkomma.count > beste!.stellen {
                beste = (vorkomma.count, wert)
            }
        }
        return beste?.wert
    }

    /// Bewertet, ob ein neuer Stand zum bisherigen passt.
    public enum Plausibilitaet: Equatable {
        case inOrdnung
        case rueckwaerts
        case ungewoehnlicherSprung

        public var hinweis: String? {
            switch self {
            case .inOrdnung:
                return nil
            case .rueckwaerts:
                return "Der Wert liegt unter dem letzten Stand. Bei einem Zählerwechsel ist das richtig – sonst bitte noch einmal prüfen."
            case .ungewoehnlicherSprung:
                return "Das ist ein ungewöhnlich großer Sprung gegenüber dem letzten Wert. Bitte prüfen."
            }
        }
    }

    public static func pruefe(neu: Double, letzter: Double?) -> Plausibilitaet {
        guard let letzter else { return .inOrdnung }
        if neu < letzter { return .rueckwaerts }
        if letzter > 100, neu > letzter * 1.5 { return .ungewoehnlicherSprung }
        return .inOrdnung
    }

    /// Zieht aus einem abfotografierten Typenschild die Angaben, die für die
    /// Beratung zählen.
    public static func heizungsangaben(
        ausTexten texte: [String],
        aktuellesJahr: Int
    ) -> (hersteller: String?, baujahr: Int?) {

        let bekannteHersteller = [
            "Viessmann", "Vaillant", "Buderus", "Junkers", "Bosch", "Wolf",
            "Brötje", "Weishaupt", "Rotex", "Daikin", "Stiebel", "Remeha", "Elco"
        ]

        var hersteller: String?
        var baujahr: Int?

        for text in texte {
            if hersteller == nil {
                hersteller = bekannteHersteller.first {
                    text.range(of: $0, options: .caseInsensitive) != nil
                }
            }
            if baujahr == nil {
                let getrennt = text.map { ($0.isNumber && $0.isASCII) ? $0 : " " }
                for wort in String(getrennt).split(separator: " ") where wort.count == 4 {
                    if let jahr = Int(wort), jahr >= 1970, jahr <= aktuellesJahr {
                        baujahr = jahr
                        break
                    }
                }
            }
        }
        return (hersteller, baujahr)
    }
}
