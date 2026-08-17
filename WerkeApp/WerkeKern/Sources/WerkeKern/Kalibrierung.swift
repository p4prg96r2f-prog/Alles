import Foundation

/// Verbindet Raumaufmaß und Energiesignatur – und löst damit das eigentliche
/// Problem jeder Heizlastberechnung.
///
/// **Der Kern des Gedankens:**
/// Ein Aufmaß liefert die *Verteilung* der Wärmeverluste auf die Räume sehr
/// genau, denn Flächen lassen sich messen. Was es nicht liefert, sind die
/// U-Werte: Ohne die Wand zu öffnen, bleibt jede Annahme darüber um dreißig
/// Prozent unsicher. Das ist der begrenzende Fehler – nicht die Geometrie.
///
/// Die Energiesignatur liefert genau umgekehrt: Sie kennt die *Summe* der
/// Wärmeverluste als gemessene Größe, weiß aber nichts über ihre Verteilung.
///
/// Beides zusammen ergibt etwas, das keines von beiden allein kann:
///
///     Maßstab = gemessener Wärmeverlust / gerechneter Wärmeverlust
///
/// Mit diesem Maßstab werden die Raumwerte skaliert. Das Ergebnis hat die
/// Verteilungsgenauigkeit des Aufmaßes **und** den absoluten Wahrheitsgehalt
/// der Messung.
///
/// Und der Maßstab selbst ist ein Befund: Weicht er stark ab, ist ein Bauteil
/// anders beschaffen als angenommen. Damit wird aus einer Fehlerquelle ein
/// Hinweis darauf, wo sich das Hinsehen lohnt.
public struct Kalibrierung: Sendable, Equatable {

    public enum Beurteilung: String, Sendable, Equatable {
        /// Rechnung und Messung passen zusammen.
        case bestaetigt
        /// Das Gebäude ist besser als angenommen – vermutlich schon gedämmt.
        case besserAlsAngenommen
        /// Das Gebäude ist schlechter als angenommen.
        case schlechterAlsAngenommen
        /// Der Unterschied ist zu groß, um ihn durch Skalieren zu heilen.
        case unstimmig
    }

    public let maszstab: Double
    public let gerechneterWaermeverlust: Double   // W/K
    public let gemessenerWaermeverlust: Double    // W/K
    public let beurteilung: Beurteilung
    public let aussage: String
    /// Wurde der Maßstab tatsächlich angewendet?
    public let angewendet: Bool
}

public struct KalibriertesErgebnis: Sendable, Equatable {
    public let raeume: [Raumheizlast]
    public let gesamtKW: Double
    public let kalibrierung: Kalibrierung
    public let annahmen: [Annahme]
    public let vorbehalt: String
}

public extension Huellflaechenrechner {

    /// Skaliert das raumweise Ergebnis auf den gemessenen Wärmeverlust.
    ///
    /// Der Maßstab wird nur angewendet, wenn die Signatur belastbar ist und die
    /// Abweichung in einem Bereich liegt, den unsichere U-Werte erklären können.
    /// Alles andere wäre Zurechtbiegen statt Kalibrieren.
    func kalibriere(
        _ aufmass: Aufmassergebnis,
        mit signatur: Energiesignatur,
        normaussentemperatur: Double
    ) -> KalibriertesErgebnis {

        let differenz = 20 - normaussentemperatur
        let gerechnet = differenz > 0 ? aufmass.gesamtKW * 1000 / differenz : 0
        let gemessen = signatur.waermeverlustkoeffizient

        // Der Messwert enthält alles: Transmission, Wärmebrücken **und**
        // Lüftung. Unsicher sind aber nur die U-Werte – der Lüftungsanteil
        // folgt aus Volumen und Luftwechsel und ist gut bekannt. Deshalb wird
        // er zuerst abgezogen und der Maßstab nur auf den Rest angewendet.
        // Andernfalls trifft das kalibrierte Ergebnis den Messwert nicht.
        let lueftungAnteil = differenz > 0
            ? aufmass.raeume.reduce(0) { $0 + $1.lueftung } / differenz : 0
        let huelleGerechnet = max(0, gerechnet - lueftungAnteil)
        let huelleGemessen = gemessen - lueftungAnteil

        guard gerechnet > 0, huelleGerechnet > 0 else {
            return unveraendert(aufmass, gerechnet: gerechnet, gemessen: gemessen,
                                beurteilung: .unstimmig,
                                aussage: "Ohne gerechneten Wärmeverlust ist kein Abgleich möglich.")
        }

        // Misst das Gebäude weniger als seine reine Lüftung verlangt, stimmt
        // etwas Grundlegendes nicht.
        guard huelleGemessen > 0 else {
            return unveraendert(aufmass, gerechnet: gerechnet, gemessen: gemessen,
                                beurteilung: .unstimmig,
                                aussage: "Der gemessene Wärmeverlust liegt unter dem, was allein die Lüftung erklärt. Bitte Ablesungen und Raumangaben prüfen.")
        }

        let maszstab = huelleGemessen / huelleGerechnet
        let signaturTaugt = signatur.guete != .unsicher

        let beurteilung: Kalibrierung.Beurteilung
        let aussage: String
        switch maszstab {
        case ..<0.55, 1.8...:
            beurteilung = .unstimmig
            aussage = "Gerechneter und gemessener Wärmeverlust liegen zu weit auseinander, um sie zusammenzuführen. Bitte Aufmaß und Ablesungen prüfen – häufig ist eine Fläche falsch zugeordnet oder ein zweiter Wärmeerzeuger im Spiel."
        case ..<0.85:
            beurteilung = .besserAlsAngenommen
            aussage = "Das Haus verliert messbar weniger Wärme, als die angenommenen U-Werte erwarten lassen. Sehr wahrscheinlich ist bereits mehr gedämmt worden, als hinterlegt ist. Die Raumwerte wurden entsprechend angepasst."
        case ..<1.15:
            beurteilung = .bestaetigt
            aussage = "Rechnung und Messung stimmen überein. Das ist der günstigste Fall: Die Raumverteilung stammt aus dem Aufmaß, die Gesamthöhe ist gemessen."
        default:
            beurteilung = .schlechterAlsAngenommen
            aussage = "Das Haus verliert messbar mehr Wärme, als die angenommenen U-Werte erwarten lassen. Mögliche Ursachen: undichte Stellen, ungedämmte Bauteile, hohe Raumtemperaturen. Ein Blick vor Ort lohnt sich."
        }

        let anwenden = signaturTaugt && beurteilung != .unstimmig
        guard anwenden else {
            return unveraendert(aufmass, gerechnet: gerechnet, gemessen: gemessen,
                                beurteilung: beurteilung,
                                aussage: signaturTaugt ? aussage
                                    : "Die Ablesungen streuen zu stark für einen Abgleich. Es bleibt bei der reinen Rechnung.")
        }

        let skaliert = aufmass.raeume.map { raum -> Raumheizlast in
            let neu = raum.transmission * maszstab + raum.waermebruecken * maszstab + raum.lueftung
            // Der Wert je Quadratmeter muss zum neuen Gesamtwert passen –
            // mitskalieren würde ihn von der Summe abkoppeln.
            let flaeche = raum.jeQuadratmeter > 0 ? raum.gesamt / raum.jeQuadratmeter : 0
            return Raumheizlast(
                raumID: raum.raumID,
                name: raum.name,
                transmission: raum.transmission * maszstab,
                waermebruecken: raum.waermebruecken * maszstab,
                lueftung: raum.lueftung,          // hängt am Volumen, nicht an U-Werten
                jeQuadratmeter: flaeche > 0 ? neu / flaeche : 0
            )
        }

        var annahmen = aufmass.annahmen
        annahmen.append(Annahme("Abgleich", "auf gemessenen Wärmeverlust skaliert"))
        annahmen.append(Annahme("Maßstab", Formate.zahl(maszstab, stellen: 2) + " auf Hülle und Wärmebrücken"))
        annahmen.append(Annahme("Lüftungsanteil", "\(Formate.zahl(lueftungAnteil, stellen: 0)) W/K, unverändert"))
        annahmen.append(Annahme("Gemessen", "\(Formate.zahl(gemessen, stellen: 0)) W/K"))
        annahmen.append(Annahme("Gerechnet", "\(Formate.zahl(gerechnet, stellen: 0)) W/K"))

        return KalibriertesErgebnis(
            raeume: skaliert,
            gesamtKW: skaliert.reduce(0) { $0 + $1.gesamt } / 1000,
            kalibrierung: Kalibrierung(
                maszstab: maszstab,
                gerechneterWaermeverlust: gerechnet,
                gemessenerWaermeverlust: gemessen,
                beurteilung: beurteilung,
                aussage: aussage,
                angewendet: true
            ),
            annahmen: annahmen,
            vorbehalt: Huellflaechenrechner.vorbehalt
        )
    }

    private func unveraendert(
        _ aufmass: Aufmassergebnis,
        gerechnet: Double, gemessen: Double,
        beurteilung: Kalibrierung.Beurteilung, aussage: String
    ) -> KalibriertesErgebnis {
        KalibriertesErgebnis(
            raeume: aufmass.raeume,
            gesamtKW: aufmass.gesamtKW,
            kalibrierung: Kalibrierung(
                maszstab: gerechnet > 0 ? gemessen / gerechnet : 0,
                gerechneterWaermeverlust: gerechnet,
                gemessenerWaermeverlust: gemessen,
                beurteilung: beurteilung,
                aussage: aussage,
                angewendet: false
            ),
            annahmen: aufmass.annahmen,
            vorbehalt: Huellflaechenrechner.vorbehalt
        )
    }
}
