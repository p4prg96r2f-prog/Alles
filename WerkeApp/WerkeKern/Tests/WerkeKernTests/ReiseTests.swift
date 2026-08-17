import XCTest
@testable import WerkeKern

/// Durchspielen der vollständigen Nutzungsstrecke – vom ersten Start bis zum
/// Löschen aller Daten. Diese Testfälle bilden das ab, was ein Mensch mit der
/// App tatsächlich tut.
final class ReiseTests: XCTestCase {

    var regeln: Regelpaket!
    let kalender = Calendar(identifier: .gregorian)

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
    }

    private func datum(_ jahr: Int, _ monat: Int, _ tag: Int = 15) -> Date {
        kalender.date(from: DateComponents(year: jahr, month: monat, day: tag))!
    }

    // MARK: - Erststart

    /// Es gibt keine Anmeldung. Der „Anmeldeprozess“ ist der dreistufige
    /// Einstieg – ohne Konto, ohne Passwort, ohne Netz.
    func testErsterStartFuehrtInDenEinstieg() {
        let ablage = Ablage()

        XCTAssertTrue(ablage.brauchtEinstieg)
        XCTAssertEqual(Aufgabe.naechste(ablage: ablage, regeln: regeln).art, .einstieg)
    }

    func testEinstiegMitDenDreiPflichtangaben() {
        var ablage = Ablage()
        let haus = Gebaeude(typ: .einfamilienhaus, baujahr: 1968, wohnflaeche: 140, heizungsart: .gas)

        ablage.schliesseEinstiegAb(mit: haus, heute: datum(2026, 8))

        XCTAssertFalse(ablage.brauchtEinstieg)
        XCTAssertEqual(ablage.gebaeude?.baujahr, 1968)
        XCTAssertEqual(ablage.verlauf.count, 1)
    }

    /// Die Anschrift ist freiwillig – „später ergänzen“ darf nicht blockieren.
    func testEinstiegOhneAnschriftFunktioniert() {
        var ablage = Ablage()
        ablage.schliesseEinstiegAb(mit: Gebaeude(), heute: datum(2026, 8))

        XCTAssertFalse(ablage.brauchtEinstieg)
        XCTAssertEqual(ablage.gebaeude?.anschrift, "")

        // Und die Rechner arbeiten trotzdem.
        let ergebnis = Foerderrechner(regeln: regeln).berechne(
            gebaeude: ablage.gebaeude!,
            massnahmen: [Massnahme(art: .dach, kosten: 20_000)]
        )
        XCTAssertGreaterThan(ergebnis.zuschussGesamt, 0)
    }

    /// Direkt nach dem Einstieg muss die Förderabschätzung dran sein – dafür
    /// wurde die App geladen, nicht für den Zählerstand.
    func testNachDemEinstiegKommtDieFoerderabschaetzung() {
        var ablage = Ablage()
        ablage.schliesseEinstiegAb(mit: Gebaeude(), heute: datum(2026, 8))

        let aufgabe = Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: datum(2026, 8))
        XCTAssertEqual(aufgabe.art, .ersteBerechnung)
        XCTAssertNotNil(aufgabe.knopf)
    }

    // MARK: - Erste Berechnung

    func testVollstaendigeStreckeBisZumGesichertenErgebnis() {
        var ablage = Ablage()
        let heute = datum(2026, 8)

        // 1 – Einstieg
        ablage.schliesseEinstiegAb(mit: Gebaeude(baujahr: 1968, wohnflaeche: 140), heute: heute)

        // 2 – Maßnahmen wählen
        ablage.massnahmen = [
            Massnahme(art: .fassade, kosten: 31_000),
            Massnahme(art: .fenster, kosten: 18_000)
        ]

        // 3 – Rechnen
        let ergebnis = Foerderrechner(regeln: regeln).berechne(
            gebaeude: ablage.gebaeude!, massnahmen: ablage.massnahmen, haushalt: ablage.haushalt
        )
        XCTAssertGreaterThan(ergebnis.zuschussGesamt, 0)
        XCTAssertEqual(
            ergebnis.eigenanteilGesamt,
            ergebnis.investitionGesamt - ergebnis.zuschussGesamt + ergebnis.honorar.eigenanteil,
            accuracy: 0.01
        )

        // 4 – Sichern
        ablage.merkeBerechnung(
            art: "Förderabschätzung",
            kurzfassung: Formate.euro(ergebnis.zuschussGesamt),
            regelVersion: ergebnis.regelVersion,
            regelStand: ergebnis.regelStand,
            heute: heute
        )

        XCTAssertEqual(ablage.berechnungen.count, 1)
        XCTAssertEqual(ablage.berechnungen.first?.regelVersion, regeln.version)

        // 5 – Danach wird der Zählerstand zur nächsten Aufgabe
        XCTAssertEqual(
            Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: heute).art,
            .zaehlerstand
        )
    }

    /// Ein Ergebnis muss auch dann erklärbar bleiben, wenn sich die Förderung
    /// zwischenzeitlich geändert hat.
    func testGesicherteBerechnungBehaeltIhreRegelfassung() {
        var ablage = Ablage()
        ablage.merkeBerechnung(art: "Förderabschätzung", kurzfassung: "4.500 €",
                               regelVersion: 1, regelStand: "2026-08-14", heute: datum(2026, 8))

        var neuereRegeln = regeln!
        neuereRegeln.version = 9
        neuereRegeln.stand = "2027-01-01"

        XCTAssertEqual(ablage.berechnungen.first?.regelVersion, 1)
        XCTAssertEqual(ablage.berechnungen.first?.regelStand, "2026-08-14")
    }

    // MARK: - Zählerstände über die Zeit

    func testZaehlerstaendeUeberZwoelfMonateOhneLuecke() {
        var ablage = Ablage()
        ablage.schliesseEinstiegAb(mit: Gebaeude(), heute: datum(2025, 9))

        for monat in 0..<12 {
            let d = kalender.date(byAdding: .month, value: monat, to: datum(2025, 9))!
            ablage.ergaenze(Zaehlerstand(art: .gas, wert: 20_000 + Double(monat) * 150, datum: d), heute: d)
        }

        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: datum(2026, 8)), 12)
        XCTAssertFalse(ablage.brauchtZaehlerstand(am: datum(2026, 8)))
    }

    /// Der entscheidende Fall: Wer aussetzt, hat keine lückenlose Reihe mehr –
    /// und genau darauf kommt es beim Verbrauchsausweis an.
    func testLueckeBrichtDieReihe() {
        var ablage = Ablage()
        // Januar bis März, dann Pause, dann Juni bis August
        for monat in [1, 2, 3, 6, 7, 8] {
            let d = datum(2026, monat)
            ablage.ergaenze(Zaehlerstand(art: .gas, wert: Double(20_000 + monat * 100), datum: d), heute: d)
        }

        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: datum(2026, 8)), 3)
    }

    func testLaufenderMonatDarfNochOffenSein() {
        var ablage = Ablage()
        for monat in [5, 6, 7] {
            let d = datum(2026, monat)
            ablage.ergaenze(Zaehlerstand(art: .gas, wert: 1000, datum: d), heute: d)
        }

        // August noch nicht erfasst – die Reihe bis Juli bleibt trotzdem stehen.
        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: datum(2026, 8)), 3)
        XCTAssertTrue(ablage.brauchtZaehlerstand(am: datum(2026, 8)))
    }

    func testZweiMonateAussetzenSetztDieReiheZurueck() {
        var ablage = Ablage()
        for monat in [4, 5, 6] {
            let d = datum(2026, monat)
            ablage.ergaenze(Zaehlerstand(art: .gas, wert: 1000, datum: d), heute: d)
        }

        // Juli und August fehlen – ab September ist die Reihe abgerissen.
        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: datum(2026, 9)), 0)
    }

    func testZukuenftigDatierterStandZaehltNicht() {
        var ablage = Ablage()
        ablage.ergaenze(Zaehlerstand(art: .gas, wert: 1000, datum: datum(2027, 3)), heute: datum(2026, 8))

        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: datum(2026, 8)), 0)
    }

    func testMehrereZaehlerartenImSelbenMonat() {
        var ablage = Ablage()
        let d = datum(2026, 8)
        ablage.ergaenze(Zaehlerstand(art: .gas, wert: 24_781, datum: d), heute: d)
        ablage.ergaenze(Zaehlerstand(art: .strom, wert: 8_120, datum: d), heute: d)

        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: d), 1)
        XCTAssertEqual(ablage.letzterStand(art: .gas)?.wert, 24_781)
        XCTAssertEqual(ablage.letzterStand(art: .strom)?.wert, 8_120)
        XCTAssertNil(ablage.letzterStand(art: .waerme))
    }

    func testGeloeschterZaehlerstandVerschwindet() {
        var ablage = Ablage()
        let stand = Zaehlerstand(art: .gas, wert: 1000, datum: datum(2026, 8))
        ablage.ergaenze(stand, heute: datum(2026, 8))
        XCTAssertEqual(ablage.zaehlerstaende.count, 1)

        ablage.loescheZaehlerstand(stand.id)
        XCTAssertTrue(ablage.zaehlerstaende.isEmpty)
        XCTAssertEqual(ablage.zusammenhaengendeMonate(bis: datum(2026, 8)), 0)
    }

    // MARK: - Aufgabenreihenfolge

    func testAufgabeWirdZuAngabenErgaenzen() {
        var ablage = Ablage()
        let heute = datum(2026, 8)
        ablage.schliesseEinstiegAb(mit: Gebaeude(), heute: heute)
        ablage.massnahmen = [Massnahme(art: .dach, kosten: 20_000)]
        ablage.ergaenze(Zaehlerstand(art: .gas, wert: 1000, datum: heute), heute: heute)

        XCTAssertEqual(Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: heute).art, .angabenErgaenzen)
    }

    func testBeiVollstaendigenAngabenGibtEsNichtsZuTun() {
        var ablage = Ablage()
        let heute = datum(2026, 8)

        var haus = Gebaeude()
        haus.dach = .gedaemmt
        haus.fassade = .ungedaemmt
        haus.kellerdecke = .ungedaemmt
        haus.obersteGeschossdecke = .gedaemmt
        haus.fensterBaujahr = 1998
        haus.heizungBaujahr = 2004
        XCTAssertEqual(haus.angabenVollstaendigkeit, 1.0)

        ablage.schliesseEinstiegAb(mit: haus, heute: heute)
        ablage.massnahmen = [Massnahme(art: .dach, kosten: 20_000)]
        ablage.ergaenze(Zaehlerstand(art: .gas, wert: 1000, datum: heute), heute: heute)

        let aufgabe = Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: heute)
        XCTAssertEqual(aufgabe.art, .nichtsZuTun)
        XCTAssertNil(aufgabe.knopf, "Ohne Aufgabe darf kein Knopf angeboten werden.")
    }

    // MARK: - Verschiedene Gebäude

    func testMehrfamilienhausVermietet() throws {
        var haus = Gebaeude(typ: .mehrfamilienhaus, baujahr: 1972, wohnflaeche: 620, wohneinheiten: 8)
        haus.istVermietet = true

        // Höchstgrenze skaliert mit den Wohneinheiten.
        let ergebnis = Foerderrechner(regeln: regeln).berechne(
            gebaeude: haus, massnahmen: [Massnahme(art: .fassade, kosten: 300_000)]
        )
        let posten = try XCTUnwrap(ergebnis.posten.first)
        XCTAssertEqual(posten.foerderfaehig, 30_000 * 8, accuracy: 0.01)

        // Und der Anforderungsvergleich weist auf die CO₂-Kosten hin.
        let pruefung = GModGPruefung(regeln: regeln, heute: datum(2026, 8)).pruefe(haus)
        XCTAssertNotNil(pruefung.punkte.first { $0.id == "co2kosten" })
    }

    func testNichtwohngebaeude() {
        var haus = Gebaeude(baujahr: 1985, wohnflaeche: 2_400)
        haus.istWohngebaeude = false

        let pruefung = GModGPruefung(regeln: regeln, heute: datum(2026, 8)).pruefe(haus)
        XCTAssertNotNil(pruefung.punkte.first { $0.id == "klasseG" })
        XCTAssertNotNil(pruefung.punkte.first { $0.id == "bedarfsausweis" })
        XCTAssertGreaterThan(pruefung.offeneRotePunkte, 0)
    }

    func testNeubauHatWenigeOffenePunkte() {
        var haus = Gebaeude(baujahr: 2021, wohnflaeche: 150, heizungsart: .waermepumpe)
        haus.dach = .gedaemmt
        haus.fassade = .gedaemmt
        haus.energieausweisJahr = 2021

        let pruefung = GModGPruefung(regeln: regeln, heute: datum(2026, 8)).pruefe(haus)
        XCTAssertEqual(pruefung.offeneRotePunkte, 0)
    }

    func testSehrAlterAltbau() {
        var haus = Gebaeude(baujahr: 1890, wohnflaeche: 220)
        haus.istDenkmal = true
        haus.obersteGeschossdecke = .ungedaemmt

        let heizlast = Heizlastrechner(regeln: regeln).ausGebaeudedaten(haus)
        XCTAssertGreaterThan(heizlast.spanne.unten, 20)   // Größenordnung 170 W/m² × 220 m²

        let pruefung = GModGPruefung(regeln: regeln, heute: datum(2026, 8)).pruefe(haus)
        XCTAssertEqual(pruefung.punkte.first { $0.id == "geschossdecke" }?.ampel, .rot)
    }

    // MARK: - Grenzwerte

    func testKleinstesUndGroesstesHaus() {
        let rechner = Heizlastrechner(regeln: regeln)

        let klein = rechner.ausGebaeudedaten(Gebaeude(baujahr: 2022, wohnflaeche: 40))
        let gross = rechner.ausGebaeudedaten(Gebaeude(typ: .mehrfamilienhaus, baujahr: 1890, wohnflaeche: 600))

        XCTAssertGreaterThan(klein.spanne.unten, 0)
        XCTAssertLessThan(klein.spanne.oben, 10)
        // Geprüft wird die Mitte, nicht der untere Rand: Wie breit die Spanne
        // ausfällt, hängt daran, wie viel über das Haus bekannt ist – hier
        // nichts. Die Aussage des Falls steckt in der Größenordnung.
        XCTAssertGreaterThan(gross.spanne.mitte, 50)
        XCTAssertTrue(gross.spanne.oben.isFinite)
    }

    func testOhneMassnahmenBleibtAllesBeiNull() {
        let ergebnis = Foerderrechner(regeln: regeln).berechne(gebaeude: Gebaeude(), massnahmen: [])

        XCTAssertEqual(ergebnis.zuschussGesamt, 0)
        XCTAssertEqual(ergebnis.investitionGesamt, 0)
        XCTAssertEqual(ergebnis.eigenanteilGesamt, 0)
        XCTAssertEqual(ergebnis.honorar.eigenanteil, 0)
        XCTAssertTrue(ergebnis.posten.isEmpty)
    }

    func testMassnahmeMitNullKostenErzeugtKeinenPosten() {
        let ergebnis = Foerderrechner(regeln: regeln).berechne(
            gebaeude: Gebaeude(), massnahmen: [Massnahme(art: .dach, kosten: 0)]
        )
        XCTAssertTrue(ergebnis.posten.isEmpty)
        XCTAssertEqual(ergebnis.zuschussGesamt, 0)
    }

    func testNegativeKostenWerdenAbgefangen() {
        let massnahme = Massnahme(art: .dach, kosten: -5_000)
        XCTAssertEqual(massnahme.kosten, 0)
    }

    func testSehrGrosseInvestitionBleibtBerechenbar() {
        var haus = Gebaeude(typ: .mehrfamilienhaus, wohneinheiten: 60)
        haus.hatSanierungsfahrplan = true

        let ergebnis = Foerderrechner(regeln: regeln).berechne(
            gebaeude: haus,
            massnahmen: [Massnahme(art: .fassade, kosten: 5_000_000)]
        )
        XCTAssertTrue(ergebnis.zuschussGesamt.isFinite)
        XCTAssertGreaterThan(ergebnis.zuschussGesamt, 0)
        XCTAssertLessThanOrEqual(ergebnis.zuschussGesamt, ergebnis.investitionGesamt)
    }

    func testWohneinheitenWerdenNieKleinerAlsEins() {
        XCTAssertEqual(Gebaeude(wohneinheiten: 0).wohneinheiten, 1)
        XCTAssertEqual(Gebaeude(wohneinheiten: -3).wohneinheiten, 1)
    }

    // MARK: - Speichern, Laden, Löschen

    func testAblageUeberstehtSpeichernUndLaden() throws {
        var ablage = Ablage()
        let heute = datum(2026, 8)
        ablage.schliesseEinstiegAb(mit: Gebaeude(strasse: "Rolandsweg 80", plz: "33102", ort: "Paderborn"), heute: heute)
        ablage.massnahmen = [Massnahme(art: .fassade, kosten: 31_000)]
        ablage.ergaenze(Zaehlerstand(art: .gas, wert: 24_781.3, datum: heute), heute: heute)
        ablage.heizkoerper = [Heizkoerper(raum: "Wohnen", nennleistungWatt: 2_000)]
        ablage.nachtmessungen = [Nachtmessung(
            beginn: heute, ende: heute.addingTimeInterval(8 * 3600),
            zaehlerVorher: 24_781, zaehlerNachher: 24_795,
            mittlereAussentemperatur: -4
        )]
        ablage.ergaenze(Dokument(titel: "Ausweis", dateiname: "a.pdf", angelegt: heute, art: .energieausweis), heute: heute)

        let daten = try Ablagekodierung.kodiere(ablage)
        let zurueck = try Ablagekodierung.dekodiere(daten)

        XCTAssertEqual(zurueck, ablage)
        XCTAssertEqual(zurueck.gebaeude?.anschrift, "Rolandsweg 80, 33102 Paderborn")
        XCTAssertEqual(zurueck.zaehlerstaende.first?.wert, 24_781.3)
        // Eine kalte Nacht lässt sich nicht nachholen – sie muss die Sitzung
        // überleben.
        XCTAssertEqual(zurueck.nachtmessungen.count, 1)
        XCTAssertEqual(zurueck.nachtmessungen.first?.mittlereAussentemperatur, -4)
    }

    func testKaputteDateiFuehrtZuLeeremZustandStattAbsturz() {
        let ablage = Ablagekodierung.dekodiereNachsichtig(Data("{kein json".utf8))

        XCTAssertTrue(ablage.brauchtEinstieg)
        XCTAssertTrue(ablage.zaehlerstaende.isEmpty)
    }

    func testFehlendeDateiFuehrtZuLeeremZustand() {
        XCTAssertTrue(Ablagekodierung.dekodiereNachsichtig(nil).brauchtEinstieg)
    }

    /// Eine ältere Fassung ohne die später ergänzten Felder muss lesbar bleiben,
    /// sonst verliert ein Bestandsnutzer beim Aktualisieren seine Daten.
    func testAeltereAblageOhneNeueFelderBleibtLesbar() throws {
        let alt = """
        { "schemaVersion": 1, "einstiegAbgeschlossen": true }
        """
        let ablage = try Ablagekodierung.dekodiere(Data(alt.utf8))

        XCTAssertTrue(ablage.einstiegAbgeschlossen)
        XCTAssertTrue(ablage.massnahmen.isEmpty)
        XCTAssertTrue(ablage.dokumente.isEmpty)
        XCTAssertTrue(ablage.nachtmessungen.isEmpty)
        XCTAssertEqual(ablage.haushalt, Haushalt())
        // Ohne Gebäude bleibt der Einstieg trotzdem nötig.
        XCTAssertTrue(ablage.brauchtEinstieg)
    }

    func testLoeschenSetztAllesZurueck() {
        var ablage = Ablage()
        let heute = datum(2026, 8)
        ablage.schliesseEinstiegAb(mit: Gebaeude(), heute: heute)
        ablage.ergaenze(Zaehlerstand(art: .gas, wert: 1000, datum: heute), heute: heute)
        ablage.merkeBerechnung(art: "Test", kurzfassung: "x", regelVersion: 1, regelStand: "2026-08-14", heute: heute)

        ablage = Ablage()

        XCTAssertTrue(ablage.brauchtEinstieg)
        XCTAssertTrue(ablage.zaehlerstaende.isEmpty)
        XCTAssertTrue(ablage.berechnungen.isEmpty)
        XCTAssertTrue(ablage.verlauf.isEmpty)
    }

    func testVerlaufWaechstNichtUnbegrenzt() {
        var ablage = Ablage()
        for i in 0..<150 {
            ablage.merke("Eintrag \(i)", symbol: "circle", heute: datum(2026, 8))
        }

        XCTAssertEqual(ablage.verlauf.count, 100)
        XCTAssertEqual(ablage.verlaufNeuesteZuerst.count, 12, "Die Ansicht zeigt höchstens zwölf Einträge.")
    }

    // MARK: - Dokumente

    func testDokumenteWerdenNeuesteZuerstGezeigt() {
        var ablage = Ablage()
        ablage.ergaenze(Dokument(titel: "Alt", dateiname: "a.pdf", angelegt: datum(2024, 1), art: .rechnung))
        ablage.ergaenze(Dokument(titel: "Neu", dateiname: "b.pdf", angelegt: datum(2026, 8), art: .foerderbescheid))

        XCTAssertEqual(ablage.dokumenteNeuesteZuerst.first?.titel, "Neu")
    }

    func testDokumentLoeschen() {
        var ablage = Ablage()
        let dokument = Dokument(titel: "Ausweis", dateiname: "a.pdf", angelegt: datum(2026, 8), art: .energieausweis)
        ablage.ergaenze(dokument)

        ablage.loescheDokument(dokument.id)
        XCTAssertTrue(ablage.dokumente.isEmpty)
        XCTAssertTrue(ablage.nachtmessungen.isEmpty)
    }
}
