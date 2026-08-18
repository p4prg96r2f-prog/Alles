import Foundation

/// Was zu einer Maßnahme dazugehört, bevor gebaut wird.
///
/// **Warum das in den Förderrechner gehört.** Wer „Fenster erneuern“ antippt,
/// rechnet mit Fensterkosten – nicht damit, dass die Förderung ein
/// Lüftungskonzept verlangt und ein dichteres Haus ohne geplanten Luftwechsel
/// Schimmel ansetzt. Genau solche Pflichten entscheiden später darüber, ob der
/// Zuschuss fließt und ob die Maßnahme gelingt. Sie erst im Termin zu erwähnen
/// heißt, dass die App eine unvollständige Rechnung gezeigt hat.
///
/// Die Regeln liegen hier im Kern und nicht in einer Ansicht, weil sie
/// fachliche Aussagen sind: prüfbar, mit Fundstelle, und getestet.
public struct Begleitleistung: Sendable, Equatable, Identifiable {

    public enum Stufe: String, Sendable, Equatable {
        /// Ohne das gibt es keine Förderung oder keinen regelkonformen Bau.
        case pflicht
        /// Stand der Technik – dringend anzuraten, aber keine Voraussetzung.
        case empfohlen

        public var bezeichnung: String {
            switch self {
            case .pflicht: return "Voraussetzung"
            case .empfohlen: return "empfohlen"
            }
        }
    }

    public let id: String
    public let titel: String
    public let stufe: Stufe
    public let begruendung: String
    public let fundstelle: String
    /// Bietet WERK.E diese Leistung selbst an? Steuert den Angebotsservice.
    public let vonWerke: Bool
}

public enum Begleitplanung {

    /// Alle Begleitleistungen zu einer Maßnahmenauswahl.
    ///
    /// Pflichten zuerst, dann Empfehlungen; innerhalb davon in fester
    /// Reihenfolge, damit die Liste bei jedem Öffnen gleich aussieht.
    public static func leistungen(
        fuer massnahmen: [Massnahme],
        gebaeude: Gebaeude
    ) -> [Begleitleistung] {

        let arten = Set(massnahmen.filter { $0.kosten > 0 }.map(\.art))
        guard !arten.isEmpty else { return [] }

        var liste: [Begleitleistung] = []

        // --- Der eine Punkt, der vor allen anderen kommt.
        //
        // Der häufigste und teuerste Fehler bei der Förderung ist kein
        // falscher Satz, sondern die Reihenfolge: Wer den Liefer- oder
        // Leistungsvertrag unterschreibt, bevor der Antrag gestellt ist, hat
        // mit dem Vorhaben begonnen – und die Förderung dafür unwiderruflich
        // verloren. Planung und Beratung dürfen vorher laufen.
        liste.append(Begleitleistung(
            id: "antrag-vor-beginn",
            titel: "Antrag vor Vorhabensbeginn stellen",
            stufe: .pflicht,
            begruendung: "Der Förderantrag muss gestellt sein, bevor ein Liefer- oder Leistungsvertrag unterschrieben wird. Wer vorher beauftragt, verliert den Zuschuss für diese Maßnahme unwiderruflich. Planung und Beratung dürfen vorher stattfinden.",
            fundstelle: "BEG-Richtlinien, Begriff des Vorhabensbeginns",
            vonWerke: true
        ))

        // --- Lüftungskonzept
        //
        // Neue Fenster und ein gedämmtes Dach machen das Haus dichter. Der
        // Luftwechsel, der vorher durch die Fugen lief, muss danach geplant
        // stattfinden – sonst kondensiert die Feuchte an der kältesten Stelle.
        // Die Förderung verlangt das Konzept ausdrücklich; die DIN unabhängig
        // davon, sobald mehr als ein Drittel der Fenster getauscht oder der
        // Dachfläche gedämmt wird.
        if !arten.isDisjoint(with: [.fenster, .dach, .lueftung]) {
            liste.append(Begleitleistung(
                id: "lueftungskonzept",
                titel: "Lüftungskonzept",
                stufe: .pflicht,
                begruendung: "Neue Fenster und gedämmte Dächer machen das Haus dichter – der Luftwechsel muss danach geplant stattfinden, sonst schlägt sich die Feuchte an der kältesten Stelle nieder. Für die Förderung ist das Konzept Voraussetzung; es entscheidet auch, ob Fensterfalzlüfter genügen oder eine Lüftungsanlage nötig ist.",
                fundstelle: "DIN 1946-6; BEG EM, technische Mindestanforderungen",
                vonWerke: true
            ))
        }

        // --- Luftdichtheitskonzept
        //
        // Die dichte Ebene wird vor der Ausführung festgelegt, nicht danach:
        // Ein vergessener Anschluss zwischen Dach und Giebelwand lässt sich
        // hinter fertigen Oberflächen kaum noch heilen. Die Blower-Door-Messung
        // ist der Nachweis, dass es gelungen ist.
        if !arten.isDisjoint(with: [.dach, .fassade, .obersteGeschossdecke, .fenster]) {
            liste.append(Begleitleistung(
                id: "luftdichtheitskonzept",
                titel: "Luftdichtheitskonzept",
                stufe: .empfohlen,
                begruendung: "Die Gebäudehülle ist dauerhaft luftdicht auszuführen. Das Konzept legt vor der Ausführung fest, wo die dichte Ebene verläuft und wie Anschlüsse und Durchdringungen ausgeführt werden – nachträglich ist das kaum zu heilen. Eine Blower-Door-Messung weist das Ergebnis nach.",
                fundstelle: "GEG § 13; DIN 4108-7",
                vonWerke: true
            ))
        }

        // --- Heizungstausch: die beiden technischen Voraussetzungen
        if arten.contains(.heizungstausch) {
            liste.append(Begleitleistung(
                id: "heizlast-din",
                titel: "Heizlastberechnung nach DIN EN 12831",
                stufe: .pflicht,
                begruendung: "Für die Heizungsförderung ist eine raumweise Heizlastberechnung Voraussetzung. Die Abschätzungen dieser App zeigen die Größenordnung und bereiten den Termin vor – sie ersetzen die Berechnung nicht.",
                fundstelle: "BEG EM, technische Mindestanforderungen",
                vonWerke: true
            ))
        }
        if !arten.isDisjoint(with: [.heizungstausch, .heizungsoptimierung]) {
            liste.append(Begleitleistung(
                id: "hydraulischer-abgleich",
                titel: "Hydraulischer Abgleich",
                stufe: .pflicht,
                begruendung: "Jeder Heizkörper bekommt genau so viel Wasser, wie sein Raum braucht. Ohne Abgleich überversorgt die Anlage die nahen Räume und unterversorgt die fernen – und die Förderung verlangt den Nachweis nach Verfahren B.",
                fundstelle: "BEG EM, technische Mindestanforderungen; VdZ-Verfahren B",
                vonWerke: true
            ))
        }

        // --- Effizienzhaus: ohne Experten läuft nichts
        if arten.contains(.effizienzhaus) {
            liste.append(Begleitleistung(
                id: "baubegleitung",
                titel: "Fachplanung und Baubegleitung",
                stufe: .pflicht,
                begruendung: "Die Effizienzhaus-Förderung setzt die Einbindung von Energieeffizienz-Experten voraus – von der Planung bis zur Bestätigung nach Durchführung. Diese Leistung wird selbst bezuschusst.",
                fundstelle: "BEG WG, Förderbedingungen",
                vonWerke: true
            ))
        }

        // Pflichten zuerst; die Reihenfolge innerhalb der Stufen bleibt, wie
        // sie oben aufgebaut wurde.
        return liste.filter { $0.stufe == .pflicht } + liste.filter { $0.stufe == .empfohlen }
    }
}
