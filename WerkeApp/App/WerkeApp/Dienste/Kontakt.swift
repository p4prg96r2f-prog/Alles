import Foundation

/// Kontaktdaten von WERK.E an genau einer Stelle.
///
/// Eine Telefonnummer, die an drei Stellen im Quelltext steht, ist eine
/// Telefonnummer, die irgendwann an zwei Stellen falsch ist.
enum Kontakt {
    static let telefonLesbar = "05251 4029291"
    static let telefonWaehlbar = "+4952514029291"
    static let netzseite = "https://werk-e.de"

    static var telefonURL: URL? { URL(string: "tel:\(telefonWaehlbar)") }
}
