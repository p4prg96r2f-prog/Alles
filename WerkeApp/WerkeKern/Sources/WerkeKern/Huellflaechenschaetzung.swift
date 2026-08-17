import Foundation

/// Hüllflächen ohne Aufmaß – aus Grundriss, Geschosszahl und Dachform.
///
/// **Warum das die bessere Antwort auf „von außen scannen“ ist.**
/// Ein Laserscan von außen scheitert an zwei Dingen: Die Reichweite liegt bei
/// fünf bis zehn Metern, für eine Fassade müsste man zwanzig Meter zurück – und
/// ausgerechnet Glas ist das Material, das LiDAR am schlechtesten erfasst.
/// Fenster sind aber genau das, was man messen will.
///
/// Der Umweg ist überflüssig: Der Gebäudeumriss liegt längst vor. Für
/// Nordrhein-Westfalen sind die Hausumringe des Liegenschaftskatasters offene
/// Daten, flächendeckend und metergenau. Grundfläche und Umfang muss niemand
/// scannen – nur Geschosszahl und Dachform kommen dazu, und das sind zwei
/// Fingertipps.
///
/// Damit wird aus dem gröbsten Verfahren („Watt je Quadratmeter nach Baujahr“)
/// eine echte Hüllflächenrechnung: dieselbe Maschine wie beim Raumaufmaß, nur
/// anders gefüttert.
public struct Gebaeudehuelle: Codable, Sendable, Equatable {

    public enum Dachform: String, Codable, Sendable, CaseIterable {
        case flach
        case sattel
        case walm
        case pult

        public var bezeichnung: String {
            switch self {
            case .flach: return "Flachdach"
            case .sattel: return "Satteldach"
            case .walm: return "Walmdach"
            case .pult: return "Pultdach"
            }
        }

        /// Verhältnis von Dachfläche zu überbauter Grundfläche.
        var flaechenfaktor: Double {
            switch self {
            case .flach: return 1.00
            case .sattel: return 1.30
            case .walm: return 1.35
            case .pult: return 1.15
            }
        }
    }

    public enum Kellerlage: String, Codable, Sendable, CaseIterable {
        case unbeheizterKeller
        case beheizterKeller
        case ohneKeller

        public var bezeichnung: String {
            switch self {
            case .unbeheizterKeller: return "Keller, unbeheizt"
            case .beheizterKeller: return "Keller, beheizt"
            case .ohneKeller: return "kein Keller"
            }
        }
    }

    /// Überbaute Fläche in Quadratmetern – aus dem Kataster oder gemessen.
    public var grundflaeche: Double
    /// Umfang des Grundrisses. Ohne Angabe wird er aus der Fläche geschätzt.
    public var umfang: Double?
    public var vollgeschosse: Int
    public var geschosshoehe: Double
    public var dachform: Dachform
    /// Ist das Dachgeschoss beheizt?
    public var dachgeschossBeheizt: Bool
    public var kellerlage: Kellerlage

    public init(
        grundflaeche: Double,
        umfang: Double? = nil,
        vollgeschosse: Int = 2,
        geschosshoehe: Double = 2.6,
        dachform: Dachform = .sattel,
        dachgeschossBeheizt: Bool = false,
        kellerlage: Kellerlage = .unbeheizterKeller
    ) {
        self.grundflaeche = max(20, grundflaeche)
        self.umfang = umfang
        self.vollgeschosse = max(1, vollgeschosse)
        self.geschosshoehe = max(2.0, geschosshoehe)
        self.dachform = dachform
        self.dachgeschossBeheizt = dachgeschossBeheizt
        self.kellerlage = kellerlage
    }

    /// Umfang eines rechteckigen Grundrisses mit üblichem Seitenverhältnis.
    ///
    /// Für ein Quadrat wäre der Faktor 4,00; bei einem Verhältnis von etwa
    /// 1 zu 1,3 – dem Normalfall im Wohnungsbau – liegt er bei rund 4,06.
    public var geschaetzterUmfang: Double {
        if let umfang, umfang > 0 { return umfang }
        return 4.06 * grundflaeche.squareRoot()
    }

    /// Bruttogrundfläche: überbaute Fläche mal beheizte Geschosse, gemessen an
    /// den Außenkanten. Das ist die Größe, aus der die Hüllflächen folgen.
    public var bruttogrundflaeche: Double {
        let geschosse = Double(vollgeschosse) + (dachgeschossBeheizt ? 0.7 : 0)
        let keller = kellerlage == .beheizterKeller ? 1.0 : 0.0
        return grundflaeche * (geschosse + keller)
    }

    /// Beheizte Wohnfläche.
    ///
    /// Die Bruttogrundfläche ist **nicht** die Wohnfläche: Außenwände,
    /// Innenwände und Treppenhaus zählen darin mit. Im Wohnungsbau bleiben
    /// davon rund achtzig Prozent übrig. Der Unterschied ist keine Feinheit –
    /// wer einen Kennwert in W/m² auf die Bruttofläche bezieht, weist ihn um
    /// ein Fünftel zu niedrig aus und vergleicht ihn dann mit Erfahrungswerten,
    /// die sich auf die Wohnfläche beziehen.
    public var beheizteFlaeche: Double { bruttogrundflaeche * Self.wohnflaechenanteil }

    /// Anteil der Wohnfläche an der Bruttogrundfläche.
    public static let wohnflaechenanteil = 0.80

    /// Lichte Raumhöhe. Die Geschosshöhe misst von Rohdecke zu Rohdecke – der
    /// Deckenaufbau enthält keine Luft und gehört nicht ins Lüftungsvolumen.
    public var lichteHoehe: Double { max(2.0, geschosshoehe - 0.25) }
}

public extension Huellflaechenrechner {

    /// Baut aus den Eckdaten des Gebäudes die Hüllflächen auf.
    ///
    /// Das Ergebnis geht in dieselbe raumweise Rechnung wie ein Aufmaß – nur als
    /// ein einziger „Raum“, der das ganze Gebäude umfasst.
    func flaechen(fuer huelle: Gebaeudehuelle, gebaeude: Gebaeude) -> [Huellflaeche] {

        let anteilFrei = freieSeiten(fuer: gebaeude.typ)
        let hoehe = Double(huelle.vollgeschosse) * huelle.geschosshoehe
            + (huelle.dachgeschossBeheizt ? huelle.geschosshoehe * 0.5 : 0)

        let fassadeBrutto = huelle.geschaetzterUmfang * hoehe * anteilFrei
        let fensteranteil = fensteranteil(baujahr: gebaeude.baujahr)
        let fensterflaeche = fassadeBrutto * fensteranteil
        let tuerflaeche = min(4.0, fassadeBrutto * 0.01)
        let wandflaeche = max(0, fassadeBrutto - fensterflaeche - tuerflaeche)

        var flaechen: [Huellflaeche] = [
            Huellflaeche(art: .aussenwand, quadratmeter: wandflaeche, grenze: .aussenluft),
            Huellflaeche(art: .fenster, quadratmeter: fensterflaeche, grenze: .aussenluft),
            Huellflaeche(art: .tuer, quadratmeter: tuerflaeche, grenze: .aussenluft)
        ]

        // Dach beziehungsweise oberste Geschossdecke
        if huelle.dachgeschossBeheizt {
            flaechen.append(Huellflaeche(
                art: .dach,
                quadratmeter: huelle.grundflaeche * huelle.dachform.flaechenfaktor,
                grenze: .aussenluft
            ))
        } else {
            // Bei unbeheiztem Dachraum geht die Wärme durch die oberste
            // Geschossdecke, nicht durch das Dach – und eine Holzbalkendecke
            // hat einen ganz anderen U-Wert als eine Dachfläche.
            let gedaemmt = gebaeude.obersteGeschossdecke == .gedaemmt
            flaechen.append(Huellflaeche(
                art: .dach,
                quadratmeter: huelle.grundflaeche,
                grenze: .unbeheizt,
                uWert: gedaemmt ? 0.24 : 1.0
            ))
        }

        // Unterer Abschluss
        switch huelle.kellerlage {
        case .unbeheizterKeller:
            flaechen.append(Huellflaeche(art: .kellerdecke, quadratmeter: huelle.grundflaeche, grenze: .unbeheizt))
        case .beheizterKeller:
            flaechen.append(Huellflaeche(art: .bodenplatte, quadratmeter: huelle.grundflaeche, grenze: .erdreich))
            // Kellerwände gegen Erdreich
            flaechen.append(Huellflaeche(
                art: .aussenwand,
                quadratmeter: huelle.geschaetzterUmfang * huelle.geschosshoehe * 0.8,
                grenze: .erdreich
            ))
        case .ohneKeller:
            flaechen.append(Huellflaeche(art: .bodenplatte, quadratmeter: huelle.grundflaeche, grenze: .erdreich))
        }

        return flaechen
    }

    /// Heizlast allein aus den Eckdaten – ohne Aufmaß, ohne Scan.
    func ausGebaeudehuelle(
        _ huelle: Gebaeudehuelle,
        gebaeude: Gebaeude,
        normaussentemperatur: Double
    ) -> Aufmassergebnis {

        // Fläche und Höhe des Ersatzraums sind bewusst die *lichten* Maße: Aus
        // ihnen folgt das Luftvolumen, und nur Luft wird gelüftet. Mit den
        // Bruttomaßen fiele der Lüftungsanteil rund ein Drittel zu hoch aus.
        let raum = Raum(
            name: "Gesamtes Gebäude",
            grundflaeche: huelle.beheizteFlaeche,
            raumhoehe: huelle.lichteHoehe,
            solltemperatur: 20,
            flaechen: flaechen(fuer: huelle, gebaeude: gebaeude)
        )

        var ergebnis = berechne(
            raeume: [raum], gebaeude: gebaeude,
            normaussentemperatur: normaussentemperatur
        )

        var annahmen = ergebnis.annahmen
        annahmen.insert(Annahme("Verfahren", "Hüllflächen aus Grundriss und Geschossen"), at: 0)
        annahmen.append(Annahme("Umfang", "\(Formate.zahl(huelle.geschaetzterUmfang, stellen: 1)) m\(huelle.umfang == nil ? ", geschätzt" : "")"))
        annahmen.append(Annahme("Fensteranteil", Formate.prozent(fensteranteil(baujahr: gebaeude.baujahr))))
        annahmen.append(Annahme("Dach", huelle.dachform.bezeichnung + (huelle.dachgeschossBeheizt ? ", beheizt" : ", unbeheizt")))
        annahmen.append(Annahme("Keller", huelle.kellerlage.bezeichnung))
        annahmen.append(Annahme(
            "Wohnfläche",
            "\(Formate.zahl(huelle.beheizteFlaeche, stellen: 0)) m² von \(Formate.zahl(huelle.bruttogrundflaeche, stellen: 0)) m² brutto"
        ))

        ergebnis = Aufmassergebnis(
            raeume: ergebnis.raeume,
            gesamtKW: ergebnis.gesamtKW,
            beheizteFlaeche: ergebnis.beheizteFlaeche,
            annahmen: annahmen,
            vorbehalt: ergebnis.vorbehalt,
            unbestaetigteFlaechen: 0
        )
        return ergebnis
    }

    /// Anteil der Fassade, der nicht an ein Nachbargebäude grenzt.
    private func freieSeiten(fuer typ: Gebaeudetyp) -> Double {
        switch typ {
        case .einfamilienhaus: return 1.00
        case .doppelhaushaelfte: return 0.78
        case .reihenhaus: return 0.58
        case .mehrfamilienhaus: return 1.00
        }
    }

    /// Üblicher Fensterflächenanteil an der Fassade nach Baujahr.
    func fensteranteil(baujahr: Int) -> Double {
        switch baujahr {
        case ..<1949: return 0.12
        case ..<1979: return 0.14
        case ..<1995: return 0.16
        case ..<2010: return 0.18
        default: return 0.20
        }
    }
}
