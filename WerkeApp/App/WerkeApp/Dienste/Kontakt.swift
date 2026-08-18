import Foundation

/// Kontaktdaten von WERK.E an genau einer Stelle.
///
/// Eine Telefonnummer, die an drei Stellen im Quelltext steht, ist eine
/// Telefonnummer, die irgendwann an zwei Stellen falsch ist.
enum Kontakt {
    static let telefonLesbar = "05251 4029291"
    static let telefonWaehlbar = "+4952514029291"
    static let netzseite = "https://werk-e.de"

    /// Postfach für Anfragen aus der App.
    ///
    /// VOR VERÖFFENTLICHUNG PRÜFEN: Die Adresse ist aus der Domain abgeleitet
    /// und nicht bestätigt. Sie ist bewusst nur hier hinterlegt – eine
    /// Adresse, die an drei Stellen steht, ist irgendwann an zwei falsch.
    static let mail = "info@werk-e.de"

    static var telefonURL: URL? { URL(string: "tel:\(telefonWaehlbar)") }
}
