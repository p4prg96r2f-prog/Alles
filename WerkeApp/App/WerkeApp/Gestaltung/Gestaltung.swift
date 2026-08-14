import SwiftUI

/// Gestaltungsgrundlagen der App.
///
/// Bewusst vor dem ersten Bildschirm festgelegt: Farben, Abstände und Typografie
/// liegen an einer Stelle. Sonst entstehen vierzig Einzelentwürfe statt vierzig
/// konsistenter Bildschirme – und das lässt sich nachträglich nur teuer reparieren.
enum Gestaltung {

    // MARK: Farben
    //
    // HINWEIS: Die Werte sind ein tragfähiger Vorschlag für eine
    // Energieeffizienz-Beratung. Vor Veröffentlichung durch die echten
    // WERK.E-Markenfarben ersetzen – nur hier und im Farbkatalog.
    enum Farbe {
        static let marke = Color("Marke")
        static let markeGedeckt = Color("MarkeGedeckt")
        static let hintergrund = Color("Hintergrund")
        static let flaeche = Color("Flaeche")
        static let text = Color.primary
        static let textLeise = Color.secondary
        static let trennlinie = Color("Trennlinie")

        static let gruen = Color("AmpelGruen")
        static let gelb = Color("AmpelGelb")
        static let rot = Color("AmpelRot")
    }

    // MARK: Abstände – vier Stufen, keine Ausnahmen
    enum Abstand {
        static let eng: CGFloat = 8
        static let normal: CGFloat = 16
        static let weit: CGFloat = 24
        static let sehrWeit: CGFloat = 32
    }

    enum Radius {
        static let klein: CGFloat = 10
        static let normal: CGFloat = 16
        static let gross: CGFloat = 22
    }

    /// Mindestgröße für Tippziele. Die Zielgruppe ist 45 bis 70 Jahre alt und
    /// bedient die App oft im Keller bei schlechtem Licht.
    static let mindestTippziel: CGFloat = 52
}

extension Ampelfarbe {
    var farbe: Color {
        switch self {
        case .gruen: return Gestaltung.Farbe.gruen
        case .gelb: return Gestaltung.Farbe.gelb
        case .rot: return Gestaltung.Farbe.rot
        case .neutral: return Gestaltung.Farbe.textLeise
        }
    }
}

/// Kleiner Zwischentyp, damit die Ansichten nicht direkt von der Kern-Aufzählung
/// abhängen und die Farbzuordnung an einer Stelle bleibt.
enum Ampelfarbe {
    case gruen, gelb, rot, neutral
}

// MARK: - Textstile

extension View {

    /// Große Ergebniszahl. Tabellarische Ziffern, damit Beträge in Spalten stehen.
    func stilErgebniszahl() -> some View {
        self.font(.system(.largeTitle, design: .rounded, weight: .bold))
            .monospacedDigit()
            .minimumScaleFactor(0.6)
            .lineLimit(1)
    }

    func stilAbschnittstitel() -> some View {
        self.font(.headline)
            .foregroundStyle(Gestaltung.Farbe.text)
    }

    func stilNebentext() -> some View {
        self.font(.subheadline)
            .foregroundStyle(Gestaltung.Farbe.textLeise)
    }

    func stilBetrag() -> some View {
        self.font(.body.monospacedDigit())
    }
}
