import Foundation

/// Heizlast von außen – fünf Fragen, die sich vom Bürgersteig aus beantworten
/// lassen.
///
/// **Warum das geht.** Die Heizlast folgt aus Hüllfläche mal Wärmedurchgang.
/// Die Hüllfläche ist von außen vollständig ablesbar: Länge, Geschosse,
/// Anbausituation, Dachausbau. Der Wärmedurchgang folgt aus der Bauepoche –
/// und ob seither gedämmt wurde, verrät die Fassade. Tiefe Fensterlaibungen
/// sind das sicherste Zeichen für ein Wärmedämmverbundsystem.
///
/// **Warum die Unsicherheit ehrlich berechnet wird.** Jede offene Angabe trägt
/// einen Streuungsbeitrag bei; sie werden quadratisch addiert, wie sich
/// unabhängige Fehler nun einmal fortpflanzen. Daraus folgt zweierlei: eine
/// belastbare Spanne statt einer geratenen – und die Möglichkeit, dem Nutzer
/// auszurechnen, **welche einzelne Angabe ihm gerade am meisten bringt.**
public struct Kurzcheck: Codable, Sendable, Equatable {

    // MARK: Die fünf Fragen

    /// 1 – Wie lang ist die Hausseite? Abgeschritten oder direkt eingegeben.
    public var seitenlaengeSchritte: Int?
    public var schrittlaengeMeter: Double
    public var grundflaecheDirekt: Double?

    /// 2 – Wie viele Geschosse werden bewohnt?
    public var geschosse: Geschosse

    /// 3 – Wie steht das Haus?
    public var anbausituation: Anbausituation

    /// 4 – Aus welcher Zeit stammt es?
    public var epoche: Epoche

    /// 5 – Was sieht man an der Fassade?
    public var fassadenbild: Fassadenbild

    // MARK: Verfeinerungen, alle freiwillig

    public var dachform: Gebaeudehuelle.Dachform?
    public var kellerlage: Gebaeudehuelle.Kellerlage?
    /// Gezählte Fenster mal geschätzter Größe, als Anteil an der Fassade.
    public var fensteranteilGezaehlt: Double?
    /// Umfang aus Kataster oder Karte – ersetzt die Schätzung aus der Seitenlänge.
    public var umfangGemessen: Double?
    /// Woraus die Wand gebaut ist – der größte Hebel nach den fünf Fragen,
    /// und von außen oft erkennbar.
    public var wandaufbau: Wandaufbau?
    /// Dicke der Dämmung in Zentimetern, falls gedämmt wurde.
    public var daemmstaerkeZentimeter: Int?

    public init(
        seitenlaengeSchritte: Int? = nil,
        schrittlaengeMeter: Double = 0.75,
        grundflaecheDirekt: Double? = nil,
        geschosse: Geschosse = .zweiVollgeschosse,
        anbausituation: Anbausituation = .freistehend,
        epoche: Epoche = .nachkrieg,
        fassadenbild: Fassadenbild = .unsicher,
        dachform: Gebaeudehuelle.Dachform? = nil,
        kellerlage: Gebaeudehuelle.Kellerlage? = nil,
        fensteranteilGezaehlt: Double? = nil,
        umfangGemessen: Double? = nil,
        wandaufbau: Wandaufbau? = nil,
        daemmstaerkeZentimeter: Int? = nil
    ) {
        self.wandaufbau = wandaufbau
        self.daemmstaerkeZentimeter = daemmstaerkeZentimeter
        self.seitenlaengeSchritte = seitenlaengeSchritte
        self.schrittlaengeMeter = max(0.4, min(1.2, schrittlaengeMeter))
        self.grundflaecheDirekt = grundflaecheDirekt
        self.geschosse = geschosse
        self.anbausituation = anbausituation
        self.epoche = epoche
        self.fassadenbild = fassadenbild
        self.dachform = dachform
        self.kellerlage = kellerlage
        self.fensteranteilGezaehlt = fensteranteilGezaehlt
        self.umfangGemessen = umfangGemessen
    }

    // MARK: Antwortmöglichkeiten

    public enum Geschosse: String, Codable, Sendable, CaseIterable {
        case einVollgeschoss
        case zweiVollgeschosse
        case zweiMitAusgebautemDach
        case dreiVollgeschosse

        public var bezeichnung: String {
            switch self {
            case .einVollgeschoss: return "Nur Erdgeschoss"
            case .zweiVollgeschosse: return "Erd- und Obergeschoss"
            case .zweiMitAusgebautemDach: return "Zwei Geschosse, Dach ausgebaut"
            case .dreiVollgeschosse: return "Drei Geschosse oder mehr"
            }
        }

        public var hinweis: String {
            switch self {
            case .einVollgeschoss: return "Bungalow, Flachbau"
            case .zweiVollgeschosse: return "Dachboden nicht bewohnt"
            case .zweiMitAusgebautemDach: return "Dachfenster oder Gauben sichtbar"
            case .dreiVollgeschosse: return "Von der Straße abzählbar"
            }
        }

        var vollgeschosse: Int {
            switch self {
            case .einVollgeschoss: return 1
            case .zweiVollgeschosse, .zweiMitAusgebautemDach: return 2
            case .dreiVollgeschosse: return 3
            }
        }

        var dachBeheizt: Bool { self == .zweiMitAusgebautemDach }
    }

    public enum Anbausituation: String, Codable, Sendable, CaseIterable {
        case freistehend
        case doppelhaus
        case reihenhausMitte
        case reihenhausEnde
        case mehrfamilienhaus

        public var bezeichnung: String {
            switch self {
            case .freistehend: return "Freistehend"
            case .doppelhaus: return "Doppelhaushälfte"
            case .reihenhausMitte: return "Reihenhaus, Mitte"
            case .reihenhausEnde: return "Reihenhaus, Ende"
            case .mehrfamilienhaus: return "Mehrfamilienhaus"
            }
        }

        public var hinweis: String {
            switch self {
            case .freistehend: return "rundum frei"
            case .doppelhaus: return "eine Wand am Nachbarn"
            case .reihenhausMitte: return "zwei Wände am Nachbarn"
            case .reihenhausEnde: return "eine Wand am Nachbarn"
            case .mehrfamilienhaus: return "mehrere Wohnungen"
            }
        }

        var gebaeudetyp: Gebaeudetyp {
            switch self {
            case .freistehend: return .einfamilienhaus
            case .doppelhaus, .reihenhausEnde: return .doppelhaushaelfte
            case .reihenhausMitte: return .reihenhaus
            case .mehrfamilienhaus: return .mehrfamilienhaus
            }
        }
    }

    public enum Epoche: String, Codable, Sendable, CaseIterable {
        case vorkrieg
        case nachkrieg
        case oelkrise
        case waermeschutz
        case jahrtausendwende
        case neubau

        public var bezeichnung: String {
            switch self {
            case .vorkrieg: return "Vor 1949"
            case .nachkrieg: return "1949 bis 1978"
            case .oelkrise: return "1979 bis 1994"
            case .waermeschutz: return "1995 bis 2009"
            case .jahrtausendwende: return "2010 bis 2019"
            case .neubau: return "Ab 2020"
            }
        }

        public var hinweis: String {
            switch self {
            case .vorkrieg: return "Massives Mauerwerk, hohe Räume, Sprossenfenster"
            case .nachkrieg: return "Wiederaufbau bis Ölkrise, meist ungedämmt"
            case .oelkrise: return "Erste Wärmeschutzverordnung, dünne Dämmung"
            case .waermeschutz: return "Isolierverglasung üblich, Dämmung Standard"
            case .jahrtausendwende: return "Energieeinsparverordnung, dichte Hülle"
            case .neubau: return "Aktueller Standard"
            }
        }

        var baujahr: Int {
            switch self {
            case .vorkrieg: return 1935
            case .nachkrieg: return 1965
            case .oelkrise: return 1986
            case .waermeschutz: return 2002
            case .jahrtausendwende: return 2014
            case .neubau: return 2022
            }
        }

        /// Ab dieser Epoche ist die Hülle von Haus aus brauchbar gedämmt.
        var abWerkGedaemmt: Bool { baujahr >= 1995 }
    }

    /// Der Wandaufbau bestimmt den U-Wert der ungedämmten Wand stärker als
    /// jede andere Angabe – und er ist von außen häufig erkennbar. Sichtbarer
    /// Klinker heißt fast immer zweischalig mit Luftschicht, und die ist
    /// deutlich besser als Vollziegel.
    public enum Wandaufbau: String, Codable, Sendable, CaseIterable {
        case vollziegel
        case zweischaligMitLuftschicht
        case hohlblockOderBims
        case beton
        case fachwerk
        case holzstaenderwerk

        public var bezeichnung: String {
            switch self {
            case .vollziegel: return "Vollziegel, verputzt"
            case .zweischaligMitLuftschicht: return "Zweischalig mit Klinker"
            case .hohlblockOderBims: return "Hohlblock oder Bims"
            case .beton: return "Beton"
            case .fachwerk: return "Fachwerk"
            case .holzstaenderwerk: return "Holzständerwerk"
            }
        }

        public var hinweis: String {
            switch self {
            case .vollziegel: return "Glatter Putz, massiv, meist Vorkriegsbau"
            case .zweischaligMitLuftschicht: return "Sichtbarer Klinker – im Norden und Westen verbreitet"
            case .hohlblockOderBims: return "Leichte Blöcke, Nachkriegszeit bis heute"
            case .beton: return "Sichtbeton oder Plattenbau, schlechtester Fall"
            case .fachwerk: return "Sichtbare Balken im Mauerwerk"
            case .holzstaenderwerk: return "Fertighaus, meist ab den 1970ern"
            }
        }

        /// U-Wert der ungedämmten Wand in W/m²K.
        public var uWertUngedaemmt: Double {
            switch self {
            case .vollziegel: return 1.65
            case .zweischaligMitLuftschicht: return 1.15
            case .hohlblockOderBims: return 1.20
            case .beton: return 2.10
            case .fachwerk: return 1.55
            case .holzstaenderwerk: return 0.65
            }
        }
    }

    public enum Fassadenbild: String, Codable, Sendable, CaseIterable {
        case keineDaemmungErkennbar
        case daemmungErkennbar
        case neueFensterAlteFassade
        case rundumErneuert
        case unsicher

        public var bezeichnung: String {
            switch self {
            case .keineDaemmungErkennbar: return "Nichts gedämmt"
            case .daemmungErkennbar: return "Fassade gedämmt"
            case .neueFensterAlteFassade: return "Neue Fenster, alte Fassade"
            case .rundumErneuert: return "Rundum erneuert"
            case .unsicher: return "Kann ich nicht erkennen"
            }
        }

        public var hinweis: String {
            switch self {
            case .keineDaemmungErkennbar: return "Fensterrahmen sitzen fast bündig, Klinker oder alter Putz"
            case .daemmungErkennbar: return "Fenster liegen tief in der Wand, glatter neuer Putz"
            case .neueFensterAlteFassade: return "Neue Rahmen, aber bündig sitzend"
            case .rundumErneuert: return "Tiefe Laibungen und neue Fenster"
            case .unsicher: return "Dann rechnen wir mit einer größeren Spanne"
            }
        }
    }
}

// MARK: - Ergebnis

public struct Verfeinerung: Sendable, Equatable, Identifiable {

    public enum Aufwand: String, Sendable, Equatable {
        case sofort
        case einTermin
        case eineNacht
        case zweiJahre

        public var bezeichnung: String {
            switch self {
            case .sofort: return "sofort"
            case .einTermin: return "vor Ort"
            case .eineNacht: return "eine Nacht"
            case .zweiJahre: return "über zwei Jahre"
            }
        }
    }

    public let id: String
    public let titel: String
    public let beschreibung: String
    public let aufwand: Aufwand
    /// Um wie viele Prozentpunkte schrumpft die Spanne, wenn das beantwortet wird?
    public let verengung: Double
    public let erledigt: Bool
}

public struct Kurzcheckergebnis: Sendable, Equatable {
    public let heizlast: Spanne
    public let waermeverlustkoeffizient: Double
    public let unsicherheit: Double
    public let beheizteFlaeche: Double
    public let jeQuadratmeter: Double
    public let annahmen: [Annahme]
    public let verfeinerungen: [Verfeinerung]
    public let vorbehalt: String

    /// Die eine Angabe, die gerade am meisten bringt.
    public var naechsterSchritt: Verfeinerung? {
        verfeinerungen.first { !$0.erledigt && $0.verengung > 0.005 }
    }
}

// MARK: - Rechnen

public extension Huellflaechenrechner {

    /// Streuungsbeiträge der einzelnen Angaben. Unabhängige Fehler addieren
    /// sich quadratisch – deshalb bringt es viel, den größten Beitrag zu
    /// beseitigen, und wenig, am kleinsten zu feilen.
    private enum Streuung {
        static let laengeAbgeschritten = 0.11
        static let laengeGemessen = 0.03
        static let flaecheDirekt = 0.04
        /// Grundstreuung der U-Werte, auch wenn alles bekannt ist: Ohne
        /// Bauteilöffnung bleibt eine Restunsicherheit.
        static let uWerteGrund = 0.16
        /// Ist der Wandaufbau unbekannt, streut der U-Wert der Wand erheblich –
        /// zwischen Vollziegel und Klinker mit Luftschicht liegen 40 Prozent.
        static let wandaufbauUnbekannt = 0.15
        /// Bei gedämmter Fassade: sechs Zentimeter aus den Achtzigern oder
        /// sechzehn von heute machen einen großen Unterschied.
        static let daemmstaerkeUnbekannt = 0.10
        static let uWerteFassadeUnklar = 0.13
        static let dachformUnbekannt = 0.05
        static let kellerUnbekannt = 0.06
        static let fensteranteilGeschaetzt = 0.045
    }

    func berechne(kurzcheck: Kurzcheck, normaussentemperatur: Double) -> Kurzcheckergebnis {

        let gebaeude = gebaeudeAus(kurzcheck)
        let huelle = huelleAus(kurzcheck)

        var flaechenliste = flaechen(fuer: huelle, gebaeude: gebaeude)

        // Ist der Wandaufbau bekannt, schlägt er die Tabelle nach Baujahr.
        if let u = uWertAussenwand(kurzcheck) {
            flaechenliste = flaechenliste.map { flaeche in
                guard flaeche.art == .aussenwand, flaeche.grenze == .aussenluft else { return flaeche }
                var kopie = flaeche
                kopie.uWert = u
                return kopie
            }
        }
        // Gezählte Fenster ersetzen den Erfahrungswert.
        if let gezaehlt = kurzcheck.fensteranteilGezaehlt, gezaehlt > 0 {
            let alteFensterflaeche = flaechenliste
                .filter { $0.art == .fenster }.reduce(0) { $0 + $1.quadratmeter }
            let unterschied = gezaehlt - alteFensterflaeche
            flaechenliste = flaechenliste.map { flaeche in
                var kopie = flaeche
                if flaeche.art == .fenster { kopie.quadratmeter = gezaehlt }
                if flaeche.art == .aussenwand && flaeche.grenze == .aussenluft {
                    kopie.quadratmeter = max(0, flaeche.quadratmeter - unterschied)
                }
                return kopie
            }
        }

        let raum = Raum(
            name: "Gesamtes Gebäude",
            grundflaeche: huelle.beheizteFlaeche,
            raumhoehe: huelle.geschosshoehe,
            solltemperatur: 20,
            flaechen: flaechenliste
        )
        let roh = berechne(raeume: [raum], gebaeude: gebaeude, normaussentemperatur: normaussentemperatur)
        let auslegungsdifferenz = max(1, 20 - normaussentemperatur)
        let koeffizient = roh.gesamtKW * 1000 / auslegungsdifferenz

        let unsicherheit = gesamtstreuung(kurzcheck)
        let spanne = Spanne(mitte: roh.gesamtKW, unsicherheit: unsicherheit).gerundet(auf: 0.1)

        var annahmen: [Annahme] = [
            Annahme("Verfahren", "Kurzcheck von außen, fünf Angaben"),
            Annahme("Angenommenes Baujahr", "\(kurzcheck.epoche.baujahr) (\(kurzcheck.epoche.bezeichnung))"),
            Annahme("Grundfläche", "\(Formate.zahl(huelle.grundflaeche, stellen: 0)) m²"),
            Annahme("Umfang", "\(Formate.zahl(huelle.geschaetzterUmfang, stellen: 1)) m"),
            Annahme("Beheizte Fläche", "\(Formate.zahl(huelle.beheizteFlaeche, stellen: 0)) m²"),
            Annahme("Wärmeverlust", "\(Formate.zahl(koeffizient, stellen: 0)) W/K"),
            Annahme("Unsicherheit", "±\(Formate.zahl(unsicherheit * 100, stellen: 0)) %")
        ]
        if let aufbau = kurzcheck.wandaufbau {
            annahmen.append(Annahme("Wandaufbau", aufbau.bezeichnung))
            if let u = uWertAussenwand(kurzcheck) {
                annahmen.append(Annahme("U-Wert Außenwand", "\(Formate.zahl(u, stellen: 2)) W/m²K"))
            }
        }
        if istGedaemmt(kurzcheck) {
            annahmen.append(Annahme(
                "Dämmstärke",
                "\(kurzcheck.daemmstaerkeZentimeter ?? ueblicheDaemmstaerke(kurzcheck)) cm\(kurzcheck.daemmstaerkeZentimeter == nil ? ", angenommen" : "")"
            ))
        }
        if let schritte = kurzcheck.seitenlaengeSchritte, kurzcheck.grundflaecheDirekt == nil {
            annahmen.append(Annahme(
                "Seitenlänge",
                "\(schritte) Schritte à \(Formate.zahl(kurzcheck.schrittlaengeMeter, stellen: 2)) m"
            ))
        }

        return Kurzcheckergebnis(
            heizlast: spanne,
            waermeverlustkoeffizient: koeffizient,
            unsicherheit: unsicherheit,
            beheizteFlaeche: huelle.beheizteFlaeche,
            jeQuadratmeter: huelle.beheizteFlaeche > 0 ? roh.gesamtKW * 1000 / huelle.beheizteFlaeche : 0,
            annahmen: annahmen,
            verfeinerungen: verfeinerungen(fuer: kurzcheck),
            vorbehalt: """
            Näherung von außen, ohne das Gebäude betreten zu haben. Sie ersetzt \
            keine Berechnung nach DIN EN 12831 und keine Auslegung. Für eine \
            belastbare Zahl genügen bereits die eigenen Verbrauchsdaten.
            """
        )
    }

    // MARK: Übersetzung in Gebäude und Hülle

    func istGedaemmt(_ kurzcheck: Kurzcheck) -> Bool {
        switch kurzcheck.fassadenbild {
        case .daemmungErkennbar, .rundumErneuert: return true
        case .keineDaemmungErkennbar, .neueFensterAlteFassade: return kurzcheck.epoche.abWerkGedaemmt
        case .unsicher: return kurzcheck.epoche.abWerkGedaemmt
        }
    }

    /// U-Wert der Außenwand aus Wandaufbau und Dämmstärke.
    ///
    /// Gerechnet wird über den Wärmedurchlasswiderstand: Die Dämmung legt sich
    /// als zusätzlicher Widerstand vor die vorhandene Wand.
    ///
    ///     1/U_neu = 1/U_alt + d / λ
    ///
    /// mit λ = 0,035 W/mK für übliche Dämmstoffe.
    func uWertAussenwand(_ kurzcheck: Kurzcheck) -> Double? {
        guard let aufbau = kurzcheck.wandaufbau else { return nil }
        let ungedaemmt = aufbau.uWertUngedaemmt
        guard istGedaemmt(kurzcheck) else { return ungedaemmt }

        // Ohne Angabe: die Stärke, die zur Bauzeit der Dämmung üblich war.
        let zentimeter = Double(kurzcheck.daemmstaerkeZentimeter ?? ueblicheDaemmstaerke(kurzcheck))
        let widerstand = 1 / ungedaemmt + (zentimeter / 100) / 0.035
        return 1 / widerstand
    }

    private func ueblicheDaemmstaerke(_ kurzcheck: Kurzcheck) -> Int {
        switch kurzcheck.epoche {
        case .vorkrieg, .nachkrieg, .oelkrise: return 8
        case .waermeschutz: return 10
        case .jahrtausendwende: return 14
        case .neubau: return 16
        }
    }

    func gebaeudeAus(_ kurzcheck: Kurzcheck) -> Gebaeude {
        var gebaeude = Gebaeude(
            typ: kurzcheck.anbausituation.gebaeudetyp,
            baujahr: kurzcheck.epoche.baujahr,
            wohnflaeche: huelleAus(kurzcheck).beheizteFlaeche
        )

        switch kurzcheck.fassadenbild {
        case .keineDaemmungErkennbar:
            gebaeude.fassade = kurzcheck.epoche.abWerkGedaemmt ? .gedaemmt : .ungedaemmt
            gebaeude.dach = kurzcheck.epoche.abWerkGedaemmt ? .gedaemmt : .ungedaemmt
            gebaeude.obersteGeschossdecke = gebaeude.dach
        case .daemmungErkennbar:
            gebaeude.fassade = .gedaemmt
            gebaeude.dach = .teilweise
            gebaeude.obersteGeschossdecke = .teilweise
        case .neueFensterAlteFassade:
            gebaeude.fassade = kurzcheck.epoche.abWerkGedaemmt ? .gedaemmt : .ungedaemmt
            gebaeude.dach = .teilweise
            gebaeude.obersteGeschossdecke = .teilweise
            gebaeude.fensterBaujahr = 2012
        case .rundumErneuert:
            gebaeude.fassade = .gedaemmt
            gebaeude.dach = .gedaemmt
            gebaeude.obersteGeschossdecke = .gedaemmt
            gebaeude.kellerdecke = .gedaemmt
            gebaeude.fensterBaujahr = 2012
        case .unsicher:
            gebaeude.fassade = kurzcheck.epoche.abWerkGedaemmt ? .gedaemmt : .teilweise
            gebaeude.dach = gebaeude.fassade
            gebaeude.obersteGeschossdecke = gebaeude.fassade
        }

        return gebaeude
    }

    func huelleAus(_ kurzcheck: Kurzcheck) -> Gebaeudehuelle {
        // Grundfläche entweder direkt oder aus der abgeschrittenen Seitenlänge.
        // Häuser sind selten quadratisch; das übliche Seitenverhältnis liegt bei
        // etwa 1 zu 0,75.
        let grundflaeche: Double
        var umfang = kurzcheck.umfangGemessen

        if let direkt = kurzcheck.grundflaecheDirekt, direkt > 0 {
            grundflaeche = direkt
        } else if let schritte = kurzcheck.seitenlaengeSchritte, schritte > 0 {
            let laenge = Double(schritte) * kurzcheck.schrittlaengeMeter
            let breite = laenge * 0.75
            grundflaeche = laenge * breite
            if umfang == nil { umfang = 2 * (laenge + breite) }
        } else {
            grundflaeche = 100
        }

        return Gebaeudehuelle(
            grundflaeche: grundflaeche,
            umfang: umfang,
            vollgeschosse: kurzcheck.geschosse.vollgeschosse,
            geschosshoehe: kurzcheck.epoche == .vorkrieg ? 2.9 : 2.6,
            dachform: kurzcheck.dachform ?? .sattel,
            dachgeschossBeheizt: kurzcheck.geschosse.dachBeheizt,
            kellerlage: kurzcheck.kellerlage ?? .unbeheizterKeller
        )
    }

    // MARK: Fehlerfortpflanzung

    private func beitraege(_ kurzcheck: Kurzcheck) -> [(id: String, wert: Double)] {
        var liste: [(String, Double)] = []

        if kurzcheck.grundflaecheDirekt != nil {
            liste.append(("groesse", Streuung.flaecheDirekt))
        } else if kurzcheck.umfangGemessen != nil {
            liste.append(("groesse", Streuung.laengeGemessen))
        } else {
            liste.append(("groesse", Streuung.laengeAbgeschritten))
        }

        liste.append(("uwerte", Streuung.uWerteGrund))
        if kurzcheck.wandaufbau == nil {
            liste.append(("wandaufbau", Streuung.wandaufbauUnbekannt))
        }
        if istGedaemmt(kurzcheck), kurzcheck.daemmstaerkeZentimeter == nil {
            liste.append(("daemmstaerke", Streuung.daemmstaerkeUnbekannt))
        }
        if kurzcheck.fassadenbild == .unsicher {
            liste.append(("fassade", Streuung.uWerteFassadeUnklar))
        }
        if kurzcheck.dachform == nil {
            liste.append(("dachform", Streuung.dachformUnbekannt))
        }
        if kurzcheck.kellerlage == nil {
            liste.append(("keller", Streuung.kellerUnbekannt))
        }
        if kurzcheck.fensteranteilGezaehlt == nil {
            liste.append(("fenster", Streuung.fensteranteilGeschaetzt))
        }
        return liste
    }

    func gesamtstreuung(_ kurzcheck: Kurzcheck) -> Double {
        let summe = beitraege(kurzcheck).reduce(0) { $0 + $1.wert * $1.wert }
        return summe.squareRoot()
    }

    /// Wie viel bliebe übrig, wenn ein Beitrag wegfiele?
    private func streuungOhne(_ kennung: String, _ kurzcheck: Kurzcheck) -> Double {
        let summe = beitraege(kurzcheck)
            .filter { $0.id != kennung }
            .reduce(0) { $0 + $1.wert * $1.wert }
        return summe.squareRoot()
    }

    func verfeinerungen(fuer kurzcheck: Kurzcheck) -> [Verfeinerung] {
        let jetzt = gesamtstreuung(kurzcheck)

        var liste: [Verfeinerung] = [
            Verfeinerung(
                id: "wandaufbau",
                titel: "Woraus ist die Wand?",
                beschreibung: "Sichtbarer Klinker heißt fast immer zweischalig mit Luftschicht – und die ist deutlich besser als Vollziegel. Der größte Hebel nach den fünf Fragen.",
                aufwand: .sofort,
                verengung: kurzcheck.wandaufbau == nil ? jetzt - streuungOhne("wandaufbau", kurzcheck) : 0,
                erledigt: kurzcheck.wandaufbau != nil
            ),
            Verfeinerung(
                id: "daemmstaerke",
                titel: "Wie dick ist die Dämmung?",
                beschreibung: "An der Fensterlaibung ablesbar. Sechs Zentimeter aus den Achtzigern wirken halb so gut wie sechzehn von heute.",
                aufwand: .sofort,
                verengung: (istGedaemmt(kurzcheck) && kurzcheck.daemmstaerkeZentimeter == nil)
                    ? jetzt - streuungOhne("daemmstaerke", kurzcheck) : 0,
                erledigt: kurzcheck.daemmstaerkeZentimeter != nil || !istGedaemmt(kurzcheck)
            ),
            Verfeinerung(
                id: "groesse",
                titel: "Grundfläche genauer angeben",
                beschreibung: "Aus dem Grundbuch, der Bauzeichnung oder einer Karte – das ersetzt das Abschreiten.",
                aufwand: .sofort,
                verengung: kurzcheck.grundflaecheDirekt == nil
                    ? jetzt - hypothetisch(kurzcheck) { $0.grundflaecheDirekt = huelleAus($0).grundflaeche }
                    : 0,
                erledigt: kurzcheck.grundflaecheDirekt != nil
            ),
            Verfeinerung(
                id: "dachform",
                titel: "Dachform angeben",
                beschreibung: "Sattel-, Walm-, Flach- oder Pultdach – von der Straße erkennbar.",
                aufwand: .sofort,
                verengung: kurzcheck.dachform == nil ? jetzt - streuungOhne("dachform", kurzcheck) : 0,
                erledigt: kurzcheck.dachform != nil
            ),
            Verfeinerung(
                id: "keller",
                titel: "Keller angeben",
                beschreibung: "Kellerfenster deuten auf einen Keller hin. Beheizt oder nicht macht einen Unterschied.",
                aufwand: .sofort,
                verengung: kurzcheck.kellerlage == nil ? jetzt - streuungOhne("keller", kurzcheck) : 0,
                erledigt: kurzcheck.kellerlage != nil
            ),
            Verfeinerung(
                id: "fassade",
                titel: "Fassade genauer einordnen",
                beschreibung: "Ein Blick auf die Fensterlaibung: Sitzt der Rahmen tief, ist gedämmt worden.",
                aufwand: .sofort,
                verengung: kurzcheck.fassadenbild == .unsicher ? jetzt - streuungOhne("fassade", kurzcheck) : 0,
                erledigt: kurzcheck.fassadenbild != .unsicher
            ),
            Verfeinerung(
                id: "fenster",
                titel: "Fenster zählen",
                beschreibung: "Anzahl und ungefähre Größe der Fenster – genauer als der Erfahrungswert.",
                aufwand: .sofort,
                verengung: kurzcheck.fensteranteilGezaehlt == nil ? jetzt - streuungOhne("fenster", kurzcheck) : 0,
                erledigt: kurzcheck.fensteranteilGezaehlt != nil
            )
        ]

        // Die messenden Verfahren schlagen jede Schätzung – sie ersetzen den
        // gesamten U-Wert-Anteil durch eine Messung.
        liste.append(Verfeinerung(
            id: "nachtmessung",
            titel: "Eine kalte Nacht messen",
            beschreibung: "Zählerstand abends und morgens ablesen. Das ersetzt alle Annahmen über die Dämmung.",
            aufwand: .eineNacht,
            verengung: max(0, jetzt - 0.12),
            erledigt: false
        ))
        liste.append(Verfeinerung(
            id: "signatur",
            titel: "Monatliche Ablesungen",
            beschreibung: "Aus zwölf und mehr Ablesungen wird der Wärmeverlust gemessen statt geschätzt.",
            aufwand: .zweiJahre,
            verengung: max(0, jetzt - 0.08),
            erledigt: false
        ))

        return liste.sorted { $0.verengung > $1.verengung }
    }

    private func hypothetisch(_ kurzcheck: Kurzcheck, _ aendern: (inout Kurzcheck) -> Void) -> Double {
        var kopie = kurzcheck
        aendern(&kopie)
        return gesamtstreuung(kopie)
    }
}
