import Foundation

/// Raumweise Heizlast über die Hüllflächen.
///
/// Das ist das Verfahren, das ein Raumaufmaß überhaupt erst wertvoll macht:
/// Statt „160 Watt je Quadratmeter nach Baujahr“ wird jede Fläche einzeln mit
/// ihrem U-Wert und ihrem Temperaturkorrekturfaktor gerechnet.
///
/// **Wichtig zur Einordnung:** Die Geometrie ist nicht der begrenzende Faktor.
/// Ein Laserscan trifft Wandlängen auf zwei bis fünf Zentimeter genau, das sind
/// unter zwei Prozent. Die U-Werte dagegen sind, solange niemand die Wand
/// öffnet, mit dreißig Prozent Unsicherheit behaftet. Ein Scan macht das Aufmaß
/// also **schnell**, nicht genau – und genau das ist sein Wert.
public enum Flaechenart: String, Codable, Sendable, CaseIterable {
    case aussenwand
    case fenster
    case tuer
    case dach
    case bodenplatte
    case kellerdecke
    case decke
    case innenwand

    public var bezeichnung: String {
        switch self {
        case .aussenwand: return "Außenwand"
        case .fenster: return "Fenster"
        case .tuer: return "Tür"
        case .dach: return "Dach"
        case .bodenplatte: return "Boden gegen Erdreich"
        case .kellerdecke: return "Boden gegen Keller"
        case .decke: return "Decke"
        case .innenwand: return "Innenwand"
        }
    }
}

/// Woran grenzt die Fläche? Das entscheidet über den Temperaturkorrekturfaktor –
/// und es ist die eine Angabe, die kein Scanner liefern kann.
public enum Grenze: String, Codable, Sendable, CaseIterable {
    case aussenluft
    case erdreich
    case unbeheizt
    case beheizt

    public var bezeichnung: String {
        switch self {
        case .aussenluft: return "nach außen"
        case .erdreich: return "gegen Erdreich"
        case .unbeheizt: return "gegen unbeheizt"
        case .beheizt: return "gegen beheizt"
        }
    }

    /// Temperaturkorrekturfaktor nach der Systematik der DIN EN 12831.
    ///
    /// Für `beheizt` steht hier 0,00, weil zwei gleich warme Räume nichts
    /// austauschen. Sobald sich die Solltemperaturen unterscheiden – Bad gegen
    /// Wohnraum, Wohnraum gegen Flur –, gilt das nicht mehr; dafür gibt es
    /// `Huellflaechenrechner.korrekturfaktor(fuer:raum:normaussentemperatur:)`.
    public var korrekturfaktor: Double {
        switch self {
        case .aussenluft: return 1.00
        case .erdreich: return 0.35
        case .unbeheizt: return 0.50
        case .beheizt: return 0.00
        }
    }
}

public struct Huellflaeche: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var art: Flaechenart
    public var quadratmeter: Double
    public var grenze: Grenze
    /// Überschreibt den aus Baujahr und Zustand abgeleiteten U-Wert.
    public var uWert: Double?

    public init(id: UUID = UUID(), art: Flaechenart, quadratmeter: Double,
                grenze: Grenze, uWert: Double? = nil) {
        self.id = id
        self.art = art
        self.quadratmeter = max(0, quadratmeter)
        self.grenze = grenze
        self.uWert = uWert
    }
}

public struct Raum: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var name: String
    public var grundflaeche: Double
    public var raumhoehe: Double
    public var solltemperatur: Double
    public var flaechen: [Huellflaeche]

    public init(id: UUID = UUID(), name: String, grundflaeche: Double,
                raumhoehe: Double = 2.5, solltemperatur: Double = 20,
                flaechen: [Huellflaeche] = []) {
        self.id = id
        self.name = name
        self.grundflaeche = max(0, grundflaeche)
        self.raumhoehe = max(1.5, raumhoehe)
        self.solltemperatur = solltemperatur
        self.flaechen = flaechen
    }

    public var volumen: Double { grundflaeche * raumhoehe }

    /// Übliche Solltemperatur nach Raumart – erspart dem Nutzer die Eingabe.
    public static func solltemperatur(fuerRaumname name: String) -> Double {
        let klein = name.lowercased()
        if klein.contains("bad") || klein.contains("dusch") { return 24 }
        if klein.contains("flur") || klein.contains("diele") || klein.contains("treppe") { return 15 }
        if klein.contains("schlaf") { return 20 }
        return 20
    }
}

// MARK: - Ergebnis

public struct Raumheizlast: Sendable, Equatable, Identifiable {
    public var id: UUID { raumID }
    public let raumID: UUID
    public let name: String
    public let transmission: Double      // Watt
    public let waermebruecken: Double    // Watt
    public let lueftung: Double          // Watt
    public var gesamt: Double { transmission + waermebruecken + lueftung }
    public var jeQuadratmeter: Double
}

public struct Aufmassergebnis: Sendable, Equatable {
    public let raeume: [Raumheizlast]
    public let gesamtKW: Double
    public let beheizteFlaeche: Double
    public let annahmen: [Annahme]
    public let vorbehalt: String
    /// Flächen, deren Grenze noch nicht bestätigt wurde.
    public let unbestaetigteFlaechen: Int

    public var jeQuadratmeter: Double {
        beheizteFlaeche > 0 ? gesamtKW * 1000 / beheizteFlaeche : 0
    }
}

// MARK: - Rechner

public struct Huellflaechenrechner {

    public static let vorbehalt = """
    Raumweise Abschätzung über die Hüllflächen. Die Maße stammen aus dem Aufmaß, \
    die U-Werte aus Baujahr und Bauteilzustand – letztere sind ohne Bauteilöffnung \
    mit Unsicherheit behaftet. Für Förderanträge und den hydraulischen Abgleich \
    ist eine Berechnung nach DIN EN 12831 durch die Fachperson erforderlich.
    """

    /// Pauschaler Wärmebrückenzuschlag ohne Nachweis.
    ///
    /// DIN V 4108 Beiblatt 2 erlaubt 0,05 W/m²K nur dann, wenn die Anschlüsse
    /// nachweislich den dortigen Musterlösungen entsprechen. Das lässt sich in
    /// einer App nicht feststellen und im Bestand fast nie belegen – deshalb
    /// bleibt es beim Pauschalwert. Er liegt auf der sicheren Seite, und das
    /// ist bei einer Auslegung die richtige Seite.
    public static let waermebrueckenzuschlagOhneNachweis = 0.10

    /// Temperatur, mit der ein angrenzender beheizter Raum angesetzt wird,
    /// solange nichts anderes bekannt ist.
    public static let nachbarraumtemperatur = 20.0

    public let regeln: Regelpaket

    public init(regeln: Regelpaket) {
        self.regeln = regeln
    }

    /// Temperaturkorrekturfaktor einer Fläche im Zusammenhang ihres Raums.
    ///
    /// Für alle Flächen nach außen, gegen Erdreich oder gegen unbeheizt gilt der
    /// Faktor der Grenze. Bei Bauteilen **gegen beheizt** hängt er dagegen vom
    /// Raum ab: Ein Bad mit 24 °C gibt über seine Innenwände real Wärme an die
    /// Nachbarräume ab, und zwar mit
    ///
    ///     f = (T_Raum − T_Nachbar) / (T_Raum − T_außen)
    ///
    /// Wird dieser Anteil unterschlagen, fällt gerade der Raum zu klein aus, in
    /// dem die Heizfläche erfahrungsgemäß ohnehin knapp ist.
    ///
    /// Umgekehrt – ein Flur mit 15 °C, der von den Nachbarräumen mitgeheizt
    /// wird – ergäbe die Formel einen negativen Wert. Der ist physikalisch
    /// richtig, für eine Auslegung aber gefährlich: Er würde die Heizfläche im
    /// Flur kleinrechnen, obwohl der Zugewinn verschwindet, sobald nebenan
    /// jemand die Tür schließt oder das Zimmer nicht heizt. Deshalb wird er bei
    /// null abgeschnitten.
    public func korrekturfaktor(
        fuer flaeche: Huellflaeche,
        raum: Raum,
        normaussentemperatur: Double
    ) -> Double {
        guard flaeche.grenze == .beheizt else { return flaeche.grenze.korrekturfaktor }
        let differenz = raum.solltemperatur - normaussentemperatur
        guard differenz > 0 else { return 0 }
        return max(0, (raum.solltemperatur - Self.nachbarraumtemperatur) / differenz)
    }

    public func berechne(
        raeume: [Raum],
        gebaeude: Gebaeude,
        normaussentemperatur: Double,
        luftwechsel: Double = 0.5
    ) -> Aufmassergebnis {

        let waermebrueckenzuschlag = Self.waermebrueckenzuschlagOhneNachweis
        var ergebnisse: [Raumheizlast] = []
        var unbestaetigt = 0

        for raum in raeume {
            let differenz = raum.solltemperatur - normaussentemperatur
            guard differenz > 0 else { continue }

            var transmission = 0.0
            var huellflaeche = 0.0

            for flaeche in raum.flaechen {
                let u = flaeche.uWert ?? uWert(fuer: flaeche.art, gebaeude: gebaeude)
                let anteil = korrekturfaktor(fuer: flaeche, raum: raum,
                                             normaussentemperatur: normaussentemperatur)
                transmission += u * flaeche.quadratmeter * anteil
                // Der Wärmebrückenzuschlag gehört auf die *äußere* Hülle.
                // Innenbauteile bekommen ihn nicht, auch wenn sie wegen eines
                // Temperaturunterschieds mitrechnen.
                if flaeche.grenze != .beheizt { huellflaeche += flaeche.quadratmeter }
                if flaeche.art == .aussenwand && flaeche.grenze == .beheizt { unbestaetigt += 1 }
            }

            let waermebruecken = waermebrueckenzuschlag * huellflaeche
            // 0,34 Wh je Kubikmeter und Kelvin ist die spezifische Wärmekapazität
            // von Luft in der üblichen Schreibweise.
            let lueftung = 0.34 * luftwechsel * raum.volumen

            ergebnisse.append(Raumheizlast(
                raumID: raum.id,
                name: raum.name,
                transmission: transmission * differenz,
                waermebruecken: waermebruecken * differenz,
                lueftung: lueftung * differenz,
                jeQuadratmeter: raum.grundflaeche > 0
                    ? (transmission + waermebruecken + lueftung) * differenz / raum.grundflaeche
                    : 0
            ))
        }

        let gesamt = ergebnisse.reduce(0) { $0 + $1.gesamt } / 1000
        let flaeche = raeume.reduce(0) { $0 + $1.grundflaeche }

        let annahmen: [Annahme] = [
            Annahme("Verfahren", "Raumweise über die Hüllflächen"),
            Annahme("Räume", "\(ergebnisse.count)"),
            Annahme("Normaußentemperatur", "\(Formate.zahl(normaussentemperatur, stellen: 0)) °C"),
            Annahme("Luftwechsel", "\(Formate.zahl(luftwechsel, stellen: 2)) 1/h"),
            Annahme("Wärmebrückenzuschlag", "\(Formate.zahl(waermebrueckenzuschlag, stellen: 2)) W/m²K, ohne Nachweis"),
            Annahme("U-Werte", "aus Baujahr \(gebaeude.baujahr) und Bauteilzustand")
        ]

        return Aufmassergebnis(
            raeume: ergebnisse,
            gesamtKW: gesamt,
            beheizteFlaeche: flaeche,
            annahmen: annahmen,
            vorbehalt: Self.vorbehalt,
            unbestaetigteFlaechen: unbestaetigt
        )
    }

    // MARK: U-Werte

    /// Abgeleiteter U-Wert aus Baujahr und Bauteilzustand.
    public func uWert(fuer art: Flaechenart, gebaeude: Gebaeude) -> Double {
        let tabelle = regeln.uWerte
        switch art {
        case .aussenwand:
            return gebaeude.fassade == .gedaemmt ? tabelle.aussenwandGedaemmt
                 : gebaeude.fassade == .teilweise ? (tabelle.aussenwandGedaemmt + wert(tabelle.aussenwandUngedaemmt, gebaeude.baujahr)) / 2
                 : wert(tabelle.aussenwandUngedaemmt, gebaeude.baujahr)
        case .dach:
            return gebaeude.dach == .gedaemmt ? tabelle.dachGedaemmt
                 : gebaeude.dach == .teilweise ? (tabelle.dachGedaemmt + wert(tabelle.dachUngedaemmt, gebaeude.baujahr)) / 2
                 : wert(tabelle.dachUngedaemmt, gebaeude.baujahr)
        case .fenster:
            guard let jahr = gebaeude.fensterBaujahr else { return wert(tabelle.fenster, gebaeude.baujahr) }
            return wert(tabelle.fenster, jahr)
        case .tuer:
            return tabelle.tuer
        case .kellerdecke:
            return gebaeude.kellerdecke == .gedaemmt ? tabelle.kellerdeckeGedaemmt
                 : wert(tabelle.kellerdeckeUngedaemmt, gebaeude.baujahr)
        case .bodenplatte:
            return gebaeude.kellerdecke == .gedaemmt ? tabelle.bodenplatteGedaemmt
                 : wert(tabelle.bodenplatteUngedaemmt, gebaeude.baujahr)
        case .decke, .innenwand:
            return tabelle.innenbauteil
        }
    }

    private func wert(_ staffel: [Regelpaket.UWertStufe], _ baujahr: Int) -> Double {
        let sortiert = staffel.sorted { $0.bisBaujahr < $1.bisBaujahr }
        for stufe in sortiert where baujahr <= stufe.bisBaujahr {
            return stufe.uWert
        }
        return sortiert.last?.uWert ?? 1.0
    }
}
