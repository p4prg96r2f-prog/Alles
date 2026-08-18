import Foundation

/// Ein einzelner Prüfpunkt des Anforderungsvergleichs.
///
/// Wichtig für die Bauform: Hier werden **Regeln angewendet**, nicht Recht
/// ausgelegt. Jede Zeile entsteht deterministisch aus Gebäudedaten und
/// Regelpaket – nachvollziehbar, testbar und verantwortbar. Ein freies
/// Sprachmodell erzeugt hier nichts.
public struct Pruefpunkt: Sendable, Equatable, Identifiable {
    public let id: String
    public let titel: String
    public let ampel: Ampel
    public let aussage: String
    public let erlaeuterung: String
    public let fundstelle: String
    public let istEntwurfsstand: Bool
}

public struct Pruefergebnis: Sendable, Equatable {
    public let punkte: [Pruefpunkt]
    public let stand: String
    public let regelVersion: Int
    public let hinweis: String

    public var offeneRotePunkte: Int {
        punkte.filter { $0.ampel == .rot }.count
    }
}

public struct GModGPruefung {

    public let regeln: Regelpaket
    private let heute: Date

    public init(regeln: Regelpaket, heute: Date = Date()) {
        self.regeln = regeln
        self.heute = heute
    }

    public func pruefe(_ gebaeude: Gebaeude, monateMitZaehlerstand: Int = 0) -> Pruefergebnis {
        var punkte: [Pruefpunkt] = []
        let g = regeln.gebaeude
        let jahr = Calendar(identifier: .gregorian).component(.year, from: heute)

        // 1 – Nachrüstpflicht oberste Geschossdecke
        if gebaeude.baujahr < 2002 {
            let erledigt = gebaeude.obersteGeschossdecke == .gedaemmt || gebaeude.dach == .gedaemmt
            punkte.append(Pruefpunkt(
                id: "geschossdecke",
                titel: "Oberste Geschossdecke",
                ampel: erledigt ? .gruen : (gebaeude.obersteGeschossdecke == .unbekannt ? .gelb : .rot),
                aussage: erledigt
                    ? "Die Dämmpflicht ist erfüllt."
                    : (gebaeude.obersteGeschossdecke == .unbekannt
                       ? "Zustand unbekannt – hier lohnt ein Blick auf den Dachboden."
                       : "Dämmpflicht besteht und ist bei Ihnen offen."),
                erlaeuterung: "Für Gebäude, die vor 2002 bezogen wurden, gilt eine Nachrüstpflicht für die oberste Geschossdecke. Alternativ kann das Dach selbst gedämmt sein. Diese Pflicht bleibt nach aktuellem Stand bestehen.",
                fundstelle: "§ 47 GEG, fortgeführt im GModG",
                istEntwurfsstand: false
            ))
        }

        // 2 – Bedingte Anforderungen bei Bauteiländerung samt Bagatellgrenze
        punkte.append(Pruefpunkt(
            id: "bauteilanforderungen",
            titel: "Wenn Sie ein Bauteil erneuern",
            ampel: .gelb,
            aussage: "Ab \(Formate.prozent(g.bagatellgrenzeAnteil)) der Bauteilfläche gelten energetische Anforderungen.",
            erlaeuterung: "Wer ohnehin saniert, muss die gesetzlichen Anforderungen für das betroffene Bauteil einhalten – aber erst, wenn mehr als \(Formate.prozent(g.bagatellgrenzeAnteil)) der jeweiligen Bauteilfläche betroffen sind. Unterhalb dieser Bagatellgrenze greifen sie nicht.",
            fundstelle: "§ 48 GEG mit Anlage 7",
            istEntwurfsstand: false
        ))

        // 3 – Lüftungskonzept
        punkte.append(Pruefpunkt(
            id: "lueftungskonzept",
            titel: "Lüftungskonzept nicht vergessen",
            ampel: .gelb,
            aussage: "Pflicht, sobald mehr als ein Drittel der Fenster getauscht oder der Dachfläche gedämmt wird.",
            erlaeuterung: "Nach DIN 1946-6 ist ein Lüftungskonzept zu erstellen, wenn mehr als ein Drittel der Fenster erneuert oder mehr als ein Drittel der Dachfläche gedämmt wird. Wird das übersehen, drohen Feuchteschäden – und Streit über die Verantwortung.",
            fundstelle: "DIN 1946-6",
            istEntwurfsstand: false
        ))

        // 4 – Alte Heizung
        if let hbj = gebaeude.heizungBaujahr {
            let alter = jahr - hbj
            if gebaeude.heizungsart.istFossil && alter >= 25 {
                punkte.append(Pruefpunkt(
                    id: "heizungsalter",
                    titel: "Heizung, Alter \(alter) Jahre",
                    ampel: g.betriebsverbotAlteKesselEntfaellt ? .gruen : .rot,
                    aussage: g.betriebsverbotAlteKesselEntfaellt
                        ? "Das Betriebsverbot für alte Kessel entfällt nach aktuellem Entwurf."
                        : "Für Konstanttemperaturkessel ab 30 Jahren gilt ein Betriebsverbot.",
                    erlaeuterung: "Nach dem beschlossenen Entwurf entfallen das 30-Jahre-Betriebsverbot für Konstanttemperaturkessel und die 65-Prozent-Pflicht für neue Heizungen. Viele Eigentümer rechnen weiterhin mit diesen Regeln. Wirtschaftlich kann ein Tausch trotzdem sinnvoll sein – das ist dann aber Ihre Entscheidung und keine Pflicht.",
                    fundstelle: "§§ 71, 72 GEG, geändert durch GModG",
                    istEntwurfsstand: true
                ))
            }
        }

        // 5 – Energieausweis
        if let ausstellung = gebaeude.energieausweisJahr {
            let ablauf = ausstellung + g.energieausweisGueltigkeitJahre
            let restJahre = ablauf - jahr
            punkte.append(Pruefpunkt(
                id: "energieausweis",
                titel: "Energieausweis",
                ampel: restJahre <= 0 ? .rot : (restJahre <= 1 ? .gelb : .gruen),
                aussage: restJahre <= 0
                    ? "Abgelaufen seit \(ablauf)."
                    : "Gültig bis \(ablauf).",
                erlaeuterung: "Ein Energieausweis gilt zehn Jahre. Bei Verkauf, Vermietung – künftig auch bei Verlängerung eines Mietvertrags – muss ein gültiger Ausweis vorgelegt werden. Für fehlende Vorlage sieht der Entwurf Bußgelder bis 10.000 Euro vor.",
                fundstelle: "GModG, Abschnitt Energieausweise",
                istEntwurfsstand: true
            ))
        } else {
            punkte.append(Pruefpunkt(
                id: "energieausweis",
                titel: "Energieausweis",
                ampel: .gelb,
                aussage: "Noch keiner hinterlegt.",
                erlaeuterung: "Bei Verkauf oder Vermietung ist ein gültiger Energieausweis vorzulegen. Künftig gilt das auch bei der Verlängerung eines Mietvertrags und nach größeren Renovierungen.",
                fundstelle: "GModG, Abschnitt Energieausweise",
                istEntwurfsstand: true
            ))
        }

        // 6 – Verbrauchsausweis braucht Vorlauf
        let fehlend = max(0, g.verbrauchsausweisMonate - monateMitZaehlerstand)
        punkte.append(Pruefpunkt(
            id: "verbrauchsausweis",
            titel: "Verbrauchsausweis vorbereiten",
            ampel: fehlend == 0 ? .gruen : .gelb,
            aussage: fehlend == 0
                ? "Die nötigen \(g.verbrauchsausweisMonate) Monatswerte liegen vor."
                : "Noch \(fehlend) von \(g.verbrauchsausweisMonate) Monatswerten.",
            erlaeuterung: "Künftig sind für einen Verbrauchsausweis lückenlose Monatswerte über \(g.verbrauchsausweisMonate) Monate nötig – Jahresabrechnungen genügen nicht mehr. Diese Zeit lässt sich nicht nachholen: Wer heute beginnt zu erfassen, hat die Grundlage in zwei Jahren.",
            fundstelle: "GModG, Anforderungen an Verbrauchsausweise",
            istEntwurfsstand: true
        ))

        // 7 – Nichtwohngebäude
        if !gebaeude.istWohngebaeude {
            punkte.append(Pruefpunkt(
                id: "klasseG",
                titel: "Nichtwohngebäude, schlechteste Klasse",
                ampel: .rot,
                aussage: "Für die energetisch schlechtesten 16 Prozent ist eine Renovierungspflicht ab \(Formate.datumLesbar(g.nichtwohngebaeudeKlasseGStichtag)) vorgesehen.",
                erlaeuterung: "Nichtwohngebäude erhalten die einheitliche EU-Skala von A bis G. Klasse G umfasst die schlechtesten 16 Prozent des Bestands; für sie ist eine Renovierungspflicht vorgesehen. Ob Ihr Gebäude betroffen ist, zeigt erst die Einstufung – das ist der erste Schritt.",
                fundstelle: "GModG in Umsetzung der EPBD",
                istEntwurfsstand: true
            ))
            punkte.append(Pruefpunkt(
                id: "bedarfsausweis",
                titel: "Bei Verkauf oder Vermietung",
                ampel: .gelb,
                aussage: "Für Nichtwohngebäude wird ein Bedarfsausweis verlangt.",
                erlaeuterung: "Der Verbrauchsausweis ist für Nichtwohngebäude bei Verkauf und Vermietung künftig ausgeschlossen. Vorhandene Verbrauchsausweise werden für diesen Zweck wertlos.",
                fundstelle: "GModG, Abschnitt Energieausweise",
                istEntwurfsstand: true
            ))
        }

        // 8 – Vermietung: CO₂-Kosten
        if gebaeude.istVermietet {
            punkte.append(Pruefpunkt(
                id: "co2kosten",
                titel: "CO₂-Kosten als Vermieter",
                ampel: .gelb,
                aussage: "Ihr Anteil an den CO₂-Kosten hängt am energetischen Zustand des Gebäudes.",
                erlaeuterung: "Nach dem Stufenmodell tragen Vermieter bei besonders emissionsreichen Gebäuden bis zu 95 Prozent der CO₂-Kosten, bei gutem Standard null. Jede energetische Verbesserung senkt diesen Anteil unmittelbar – das lässt sich in Euro je Jahr beziffern.",
                fundstelle: "CO2KostAufG, Stufenmodell",
                istEntwurfsstand: false
            ))
        }

        // Sobald das Gesetz in Kraft ist, verschwindet die Kennzeichnung von
        // selbst. Ohne dieses Datum bliebe sie stehen, bis jemand daran denkt,
        // sie von Hand zu entfernen – und in zwei Jahren stünde „Entwurf“ an
        // geltendem Recht.
        let inKraft = regeln.gmodgInKraft(am: heute)
        if inKraft {
            punkte = punkte.map { punkt in
                guard punkt.istEntwurfsstand else { return punkt }
                return Pruefpunkt(
                    id: punkt.id, titel: punkt.titel, ampel: punkt.ampel,
                    aussage: punkt.aussage, erlaeuterung: punkt.erlaeuterung,
                    fundstelle: punkt.fundstelle, istEntwurfsstand: false
                )
            }
        }

        let hatEntwurf = punkte.contains { $0.istEntwurfsstand }
        let hinweis: String
        if hatEntwurf, let ab = regeln.gebaeude.gmodgInKraftAb {
            hinweis = "Teile beruhen auf dem Gesetzentwurf. Er tritt am \(Formate.datumLesbar(ab)) in Kraft; bis dahin gilt das bisherige Recht. Stand: \(Formate.datumLesbar(regeln.stand))."
        } else if hatEntwurf {
            hinweis = "Teile beruhen auf dem Gesetzentwurf und sind noch nicht in Kraft. Ein Termin für das Inkrafttreten steht nicht fest. Stand: \(Formate.datumLesbar(regeln.stand))."
        } else if inKraft {
            hinweis = "Das GModG ist in Kraft. Stand: \(Formate.datumLesbar(regeln.stand))."
        } else {
            hinweis = "Stand: \(Formate.datumLesbar(regeln.stand))."
        }

        return Pruefergebnis(
            punkte: punkte,
            stand: regeln.stand,
            regelVersion: regeln.version,
            hinweis: hinweis
        )
    }
}

// MARK: - CO₂-Kostenaufteilung

public struct CO2Ergebnis: Sendable, Equatable {
    public let kilogrammProQuadratmeter: Double
    public let vermieteranteil: Double
    public let mieteranteil: Double
    public let vermieterkostenProJahr: Double
    public let stufeNummer: Int
    public let annahmen: [Annahme]
}

public struct CO2Rechner {

    public let regeln: Regelpaket

    public init(regeln: Regelpaket) {
        self.regeln = regeln
    }

    /// Anteil, den die vermietende Seite nach dem Stufenmodell trägt.
    public func vermieteranteil(kilogrammProQuadratmeter: Double) -> Double {
        let stufen = regeln.co2Stufen.sorted { $0.abKilogrammProQuadratmeter > $1.abKilogrammProQuadratmeter }
        for stufe in stufen where kilogrammProQuadratmeter >= stufe.abKilogrammProQuadratmeter {
            return stufe.vermieteranteil
        }
        return stufen.last?.vermieteranteil ?? 0
    }

    public func berechne(
        kilogrammProQuadratmeter: Double,
        co2KostenGesamtProJahr: Double
    ) -> CO2Ergebnis {
        let anteil = vermieteranteil(kilogrammProQuadratmeter: kilogrammProQuadratmeter)
        let stufen = regeln.co2Stufen.sorted { $0.abKilogrammProQuadratmeter > $1.abKilogrammProQuadratmeter }
        let nummer = (stufen.firstIndex { kilogrammProQuadratmeter >= $0.abKilogrammProQuadratmeter } ?? stufen.count - 1) + 1

        return CO2Ergebnis(
            kilogrammProQuadratmeter: kilogrammProQuadratmeter,
            vermieteranteil: anteil,
            mieteranteil: 1 - anteil,
            vermieterkostenProJahr: co2KostenGesamtProJahr * anteil,
            stufeNummer: nummer,
            annahmen: [
                Annahme("Stufenmodell", "\(regeln.co2Stufen.count) Stufen"),
                Annahme("Ihre Stufe", "\(nummer)"),
                Annahme("Grundlage", "CO2KostAufG")
            ]
        )
    }

    /// Wie viel weniger zahlt die vermietende Seite, wenn eine Maßnahme den
    /// spezifischen Ausstoß senkt? Das überzeugendste Argument gegenüber
    /// Hausverwaltungen, weil es mit der Nebenkostenabrechnung argumentiert.
    public func ersparnisProJahr(
        vorher: Double,
        nachher: Double,
        co2KostenGesamtProJahr: Double
    ) -> Double {
        let a = berechne(kilogrammProQuadratmeter: vorher, co2KostenGesamtProJahr: co2KostenGesamtProJahr)
        let b = berechne(kilogrammProQuadratmeter: nachher, co2KostenGesamtProJahr: co2KostenGesamtProJahr)
        return max(0, a.vermieterkostenProJahr - b.vermieterkostenProJahr)
    }
}
