import Foundation

/// Ein reales Gebäude, dessen Heizlast nach DIN EN 12831 bereits vorliegt.
///
/// **Wozu das gut ist.** Alle Verfahren dieser App sind gegeneinander
/// abgeglichen: Der Kennwert nach Baujahr passt zur Hüllflächenrechnung, die
/// Energiesignatur passt zur Nachtmessung. Das beweist Widerspruchsfreiheit –
/// aber nicht Richtigkeit. Zehn Verfahren, die alle dieselbe falsche Annahme
/// teilen, sind ebenfalls widerspruchsfrei.
///
/// Der einzige Beleg, der wirklich zählt, ist der Vergleich mit Objekten, deren
/// Heizlast eine Fachperson gerechnet hat. WERK.E hat solche Berechnungen
/// ohnehin in der Schublade – hier ist der Platz, an dem sie zu einer
/// Prüfstrecke werden.
///
/// **Wie man es benutzt.** Für jedes Objekt eintragen, was bekannt ist: die
/// Gebäudedaten, die Heizlast aus der Fachberechnung und – soweit vorhanden –
/// Grundriss, Verbrauch und Nachtmessung. `ReferenzobjektTests` rechnet dann
/// jeden Weg der App gegen und weist die Abweichung aus. Was danach übrig
/// bleibt, ist eine Tabelle mit echten Zahlen: das Verkaufsargument und die
/// Fehlerliste in einem.
public struct Referenzobjekt: Sendable, Equatable {

    /// Kurzbezeichnung, ohne personenbezogene Angaben.
    public let kennung: String
    public let gebaeude: Gebaeude

    /// Heizlast aus der Berechnung nach DIN EN 12831, in Kilowatt.
    /// Das ist der Bezugswert, gegen den alles geprüft wird.
    public let heizlastNachDINKW: Double
    /// Normaußentemperatur, mit der die Fachberechnung gerechnet hat.
    public let normaussentemperatur: Double

    /// Grundriss und Geschosse, falls bekannt – für die Hüllflächenrechnung.
    public let huelle: Gebaeudehuelle?
    /// Jahresverbräuche in der Einheit des Brennstoffs, falls bekannt.
    public let jahresverbraeuche: [Double]
    public let brennstoff: Brennstoff
    public let kesselart: Kesselart
    public let personenImHaushalt: Int

    public init(
        kennung: String,
        gebaeude: Gebaeude,
        heizlastNachDINKW: Double,
        normaussentemperatur: Double = -12,
        huelle: Gebaeudehuelle? = nil,
        jahresverbraeuche: [Double] = [],
        brennstoff: Brennstoff = .gasKubikmeter,
        kesselart: Kesselart = .standardkessel,
        personenImHaushalt: Int = 3
    ) {
        self.kennung = kennung
        self.gebaeude = gebaeude
        self.heizlastNachDINKW = heizlastNachDINKW
        self.normaussentemperatur = normaussentemperatur
        self.huelle = huelle
        self.jahresverbraeuche = jahresverbraeuche
        self.brennstoff = brennstoff
        self.kesselart = kesselart
        self.personenImHaushalt = personenImHaushalt
    }
}

/// Was ein Weg der App bei einem Referenzobjekt liefert.
public struct Referenzabgleich: Sendable, Equatable {

    public struct Zeile: Sendable, Equatable {
        public let verfahren: String
        public let heizlastKW: Double
        /// Verhältnis zur Fachberechnung. 1,0 wäre Übereinstimmung.
        public let verhaeltnis: Double
        /// Abweichung in Prozent, vorzeichenbehaftet.
        public var abweichungProzent: Double { (verhaeltnis - 1) * 100 }
    }

    public let kennung: String
    public let heizlastNachDINKW: Double
    public let zeilen: [Zeile]

    /// Die größte Abweichung über alle Verfahren – die Zahl, die zählt.
    public var groessteAbweichungProzent: Double {
        zeilen.map { abs($0.abweichungProzent) }.max() ?? 0
    }

    /// Eine Zeile für die Tabelle, die WERK.E vorlegen kann.
    public var tabellenzeile: String {
        let werte = zeilen.map {
            "\($0.verfahren) \(Formate.zahl($0.heizlastKW, stellen: 1)) kW (\($0.abweichungProzent >= 0 ? "+" : "")\(Formate.zahl($0.abweichungProzent, stellen: 0)) %)"
        }
        return "\(kennung): DIN \(Formate.zahl(heizlastNachDINKW, stellen: 1)) kW · " + werte.joined(separator: " · ")
    }
}

public extension Heizlastrechner {

    /// Rechnet jeden verfügbaren Weg gegen die Fachberechnung.
    ///
    /// Verfahren, für die die Angaben fehlen, entfallen stillschweigend – ein
    /// Objekt ohne Grundriss liefert eben keine Hüllflächenzeile. Was
    /// entfällt, steht dann auch nicht in der Tabelle: Ein Beleg mit
    /// Leerstellen ist ehrlicher als einer mit geratenen Werten.
    func gleicheAb(_ objekt: Referenzobjekt) -> Referenzabgleich {
        var zeilen: [Referenzabgleich.Zeile] = []

        func ergaenze(_ verfahren: String, _ kilowatt: Double) {
            guard objekt.heizlastNachDINKW > 0, kilowatt > 0 else { return }
            zeilen.append(Referenzabgleich.Zeile(
                verfahren: verfahren,
                heizlastKW: kilowatt,
                verhaeltnis: kilowatt / objekt.heizlastNachDINKW
            ))
        }

        ergaenze("Kennwert", ausGebaeudedaten(
            objekt.gebaeude,
            normaussentemperatur: objekt.normaussentemperatur
        ).spanne.mitte)

        if !objekt.jahresverbraeuche.isEmpty,
           let ausVerbrauch = ausVerbrauch(Verbrauchsangabe(
               brennstoff: objekt.brennstoff,
               jahreswerte: objekt.jahresverbraeuche,
               kesselart: objekt.kesselart,
               warmwasserEnthalten: true,
               personenImHaushalt: objekt.personenImHaushalt
           )) {
            ergaenze("Verbrauch", ausVerbrauch.spanne.mitte)
        }

        if let huelle = objekt.huelle {
            let rechner = Huellflaechenrechner(regeln: regeln)
            ergaenze("Hüllfläche", rechner.ausGebaeudehuelle(
                huelle,
                gebaeude: objekt.gebaeude,
                normaussentemperatur: objekt.normaussentemperatur
            ).gesamtKW)
        }

        return Referenzabgleich(
            kennung: objekt.kennung,
            heizlastNachDINKW: objekt.heizlastNachDINKW,
            zeilen: zeilen
        )
    }
}

/// Die Sammlung, die WERK.E füllt.
///
/// **Sie ist leer, und das ist Absicht.**
///
/// Hier stand eine „Vorlage“, deren Zahlen aus dem Demolauf stammten. Der
/// Abgleich meldete für sie null Prozent Abweichung bei der Hüllflächenrechnung
/// – aber nur, weil der angebliche DIN-Wert aus eben dieser Rechnung kopiert
/// war. Eine Prüfung, die immer besteht, ist schlimmer als keine: Sie sieht aus
/// wie ein Beleg.
///
/// Was hier hineingehört, kann niemand ausrechnen und niemand recherchieren.
/// Es sind zehn Gebäude aus den Akten von WERK.E, für die eine Fachperson eine
/// Heizlast nach DIN EN 12831 gerechnet hat. Veröffentlichte Typologien –
/// TABULA, die Gebäudesteckbriefe des IWU – liefern das nicht: Sie geben einen
/// **Jahres-Heizwärmebedarf** in kWh/(m²·a) nach ISO 13790 an, keine
/// **Auslegungsheizlast** in Kilowatt. Das eine als das andere einzusetzen wäre
/// genau die Verwechslung, gegen die diese Prüfstrecke gebaut wurde.
///
/// Wie ein Eintrag aussieht, zeigt `beispielAufbau` weiter unten – als Muster
/// zum Abschreiben, nicht als Beleg.
public enum Referenzsammlung {

    /// Die realen Objekte. Zehn Einträge sind das Ziel.
    public static let objekte: [Referenzobjekt] = []

    /// Wie ein Eintrag aussieht. Bewusst **nicht** in `objekte`: Diese Zahlen
    /// sind erfunden und dürfen in keiner Auswertung landen.
    public static let beispielAufbau = Referenzobjekt(
        kennung: "Muster – gehört nicht in die Auswertung",
        gebaeude: {
            var g = Gebaeude(typ: .einfamilienhaus, baujahr: 1968, wohnflaeche: 128)
            g.dach = .gedaemmt
            g.obersteGeschossdecke = .gedaemmt
            g.fassade = .teilweise
            g.kellerdecke = .ungedaemmt
            g.fensterBaujahr = 2000
            return g
        }(),
        heizlastNachDINKW: 10.6,
        normaussentemperatur: -12,
        huelle: Gebaeudehuelle(
            grundflaeche: 80, vollgeschosse: 2, dachform: .sattel,
            dachgeschossBeheizt: false, kellerlage: .unbeheizterKeller
        ),
        jahresverbraeuche: [2_050, 1_980, 2_120],
        personenImHaushalt: 3
    )

    /// Wie viele reale Objekte fehlen noch bis zum Beleg?
    public static var fehlendeObjekte: Int { max(0, 10 - objekte.count) }

    public static var istBelegt: Bool { objekte.count >= 10 }
}
