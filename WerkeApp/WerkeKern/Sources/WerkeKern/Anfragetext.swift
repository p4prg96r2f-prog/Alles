import Foundation

/// Baut die Nachricht an WERK.E – Betreff und Text.
///
/// **Warum das im Kern liegt.** Diese Nachricht ist das Ende der Strecke: Alles,
/// was die App gerechnet hat, mündet in dem Moment, in dem jemand sie
/// abschickt. Ein Text, der Ergebnisse verschluckt, falsch beschriftet oder
/// Dinge behauptet, die der Nutzer nicht gesagt hat, verdirbt genau diesen
/// Moment. Deshalb ist er hier gebaut und getestet – nicht in einer Ansicht
/// zusammengeklebt.
///
/// Grundsätze:
/// * Die Nachricht enthält **nur**, was App oder Nutzer wirklich wissen.
///   Für alles andere stehen sichtbare Platzhalter in eckigen Klammern.
/// * Der Nutzer sieht den Text vor dem Senden und kann ihn ändern –
///   die App verschickt nichts von selbst.
public enum Anfrageart: String, CaseIterable, Sendable, Equatable {
    /// Angebot für Beratung oder Begleitleistungen anfordern.
    case angebot
    /// Begleitung bei der Antragstellung anfragen.
    case antragsbegleitung
    /// Freie Nachricht mit den Ergebnissen im Anhang.
    case nachricht

    public var bezeichnung: String {
        switch self {
        case .angebot: return "Angebot anfordern"
        case .antragsbegleitung: return "Förderung beantragen"
        case .nachricht: return "Nachricht an WERK.E"
        }
    }
}

public enum Anfragetext {

    /// Sichtbare Platzhalter – niemals stillschweigend ausfüllen.
    public static let platzhalterName = "[Ihr Name]"
    public static let platzhalterTelefon = "[Ihre Telefonnummer für Rückfragen]"

    public static func betreff(_ art: Anfrageart, gebaeude: Gebaeude?) -> String {
        let ort: String
        if let g = gebaeude, !g.anschrift.isEmpty {
            ort = " – \(g.anschrift)"
        } else if let g = gebaeude {
            ort = " – \(g.typ.bezeichnung), Baujahr \(g.baujahr)"
        } else {
            ort = ""
        }
        switch art {
        case .angebot: return "Angebotsanfrage aus der WERK.E App\(ort)"
        case .antragsbegleitung: return "Antragsbegleitung Förderung\(ort)"
        case .nachricht: return "Anfrage aus der WERK.E App\(ort)"
        }
    }

    /// Der Nachrichtentext.
    ///
    /// - Parameter zusammenfassung: Die Ergebniszeilen aus der App, wörtlich.
    /// - Parameter leistungen: Gewünschte Leistungen (z. B. Lüftungskonzept) –
    ///   nur beim Angebot.
    public static func nachricht(
        art: Anfrageart,
        gebaeude: Gebaeude?,
        zusammenfassung: [String],
        leistungen: [String] = []
    ) -> String {

        var teile: [String] = ["Guten Tag,"]

        switch art {
        case .angebot:
            teile.append("ich habe mit Ihrer App gerechnet und möchte ein Angebot für Ihre Beratung anfragen.")
            if !leistungen.isEmpty {
                teile.append("Dabei geht es voraussichtlich um:\n" + leistungen.map { "• \($0)" }.joined(separator: "\n"))
            }
        case .antragsbegleitung:
            teile.append("ich möchte für mein Vorhaben Förderung beantragen und frage Ihre Begleitung bei der Antragstellung an.")
            teile.append("Mir ist bekannt, dass der Antrag gestellt sein muss, bevor ein Liefer- oder Leistungsvertrag unterschrieben wird. Ich habe noch nicht beauftragt.")
        case .nachricht:
            teile.append("ich habe mit Ihrer App gerechnet und melde mich mit den Ergebnissen unten.")
        }

        if let g = gebaeude {
            var zeilen = ["Zum Gebäude:"]
            if !g.anschrift.isEmpty { zeilen.append("• \(g.anschrift)") }
            zeilen.append("• \(g.typ.bezeichnung), Baujahr \(g.baujahr), \(Int(g.wohnflaeche)) m²")
            zeilen.append("• Heizung: \(g.heizungsart.bezeichnung)\(g.heizungBaujahr.map { ", Baujahr \($0)" } ?? "")")
            teile.append(zeilen.joined(separator: "\n"))
        }

        if !zusammenfassung.isEmpty {
            teile.append("Aus der App übernommen:\n" + zusammenfassung.map { "• \($0)" }.joined(separator: "\n"))
        }

        teile.append("Alle Werte sind Abschätzungen aus der App und ersetzen keine Berechnung nach Norm – genau darüber möchte ich mit Ihnen sprechen.")
        teile.append("Sie erreichen mich unter:\n\(platzhalterTelefon)")
        teile.append("Freundliche Grüße\n\(platzhalterName)")

        return teile.joined(separator: "\n\n")
    }
}
