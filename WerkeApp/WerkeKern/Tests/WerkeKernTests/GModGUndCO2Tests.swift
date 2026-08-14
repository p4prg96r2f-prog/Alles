import XCTest
@testable import WerkeKern

final class GModGTests: XCTestCase {

    var regeln: Regelpaket!
    var pruefung: GModGPruefung!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        // Fester Stichtag, damit die Tests nicht mit der Zeit kippen.
        let datum = ISO8601DateFormatter().date(from: "2026-08-14T12:00:00Z")!
        pruefung = GModGPruefung(regeln: regeln, heute: datum)
    }

    func testAltbauOhneGeschossdeckendaemmungIstRot() {
        var g = Gebaeude(baujahr: 1968)
        g.obersteGeschossdecke = .ungedaemmt
        g.dach = .ungedaemmt

        let e = pruefung.pruefe(g)
        let punkt = e.punkte.first { $0.id == "geschossdecke" }

        XCTAssertEqual(punkt?.ampel, .rot)
    }

    func testGedaemmtesDachErfuelltDiePflicht() {
        var g = Gebaeude(baujahr: 1968)
        g.dach = .gedaemmt

        let punkt = pruefung.pruefe(g).punkte.first { $0.id == "geschossdecke" }
        XCTAssertEqual(punkt?.ampel, .gruen)
    }

    func testNeubauHatKeineNachruestpflicht() {
        let g = Gebaeude(baujahr: 2015)
        XCTAssertNil(pruefung.pruefe(g).punkte.first { $0.id == "geschossdecke" })
    }

    func testBagatellgrenzeWirdGenannt() {
        let punkt = pruefung.pruefe(Gebaeude()).punkte.first { $0.id == "bauteilanforderungen" }
        XCTAssertNotNil(punkt)
        XCTAssertTrue(punkt!.aussage.contains("10"))
    }

    func testLueftungskonzeptWirdImmerGenannt() {
        let punkt = pruefung.pruefe(Gebaeude()).punkte.first { $0.id == "lueftungskonzept" }
        XCTAssertNotNil(punkt)
        XCTAssertTrue(punkt!.erlaeuterung.contains("1946-6"))
    }

    func testAlteHeizungWirdAlsEntfallendesVerbotGekennzeichnet() {
        var g = Gebaeude(heizungsart: .gas)
        g.heizungBaujahr = 1995

        let punkt = pruefung.pruefe(g).punkte.first { $0.id == "heizungsalter" }

        XCTAssertEqual(punkt?.ampel, .gruen)
        XCTAssertEqual(punkt?.istEntwurfsstand, true)
    }

    func testWaermepumpeErzeugtKeinenHeizungshinweis() {
        var g = Gebaeude(heizungsart: .waermepumpe)
        g.heizungBaujahr = 1995

        XCTAssertNil(pruefung.pruefe(g).punkte.first { $0.id == "heizungsalter" })
    }

    func testAbgelaufenerEnergieausweisIstRot() {
        var g = Gebaeude()
        g.energieausweisJahr = 2012   // + 10 Jahre = 2022, abgelaufen

        let punkt = pruefung.pruefe(g).punkte.first { $0.id == "energieausweis" }
        XCTAssertEqual(punkt?.ampel, .rot)
    }

    func testGueltigerEnergieausweisIstGruen() {
        var g = Gebaeude()
        g.energieausweisJahr = 2021   // gültig bis 2031

        let punkt = pruefung.pruefe(g).punkte.first { $0.id == "energieausweis" }
        XCTAssertEqual(punkt?.ampel, .gruen)
        XCTAssertTrue(punkt!.aussage.contains("2031"))
    }

    func testVerbrauchsausweisZaehltDieFehlendenMonate() {
        let e = pruefung.pruefe(Gebaeude(), monateMitZaehlerstand: 12)
        let punkt = e.punkte.first { $0.id == "verbrauchsausweis" }

        XCTAssertEqual(punkt?.ampel, .gelb)
        XCTAssertTrue(punkt!.aussage.contains("12"))
    }

    func testVerbrauchsausweisVollstaendigIstGruen() {
        let e = pruefung.pruefe(Gebaeude(), monateMitZaehlerstand: 24)
        XCTAssertEqual(e.punkte.first { $0.id == "verbrauchsausweis" }?.ampel, .gruen)
    }

    func testNichtwohngebaeudeBekommtKlasseGUndBedarfsausweis() {
        var g = Gebaeude()
        g.istWohngebaeude = false

        let e = pruefung.pruefe(g)

        XCTAssertNotNil(e.punkte.first { $0.id == "klasseG" })
        XCTAssertNotNil(e.punkte.first { $0.id == "bedarfsausweis" })
    }

    func testWohngebaeudeOhneKlasseGPunkt() {
        XCTAssertNil(pruefung.pruefe(Gebaeude()).punkte.first { $0.id == "klasseG" })
    }

    func testVermietetesGebaeudeBekommtCO2Hinweis() {
        var g = Gebaeude()
        g.istVermietet = true

        XCTAssertNotNil(pruefung.pruefe(g).punkte.first { $0.id == "co2kosten" })
    }

    func testEntwurfsstandWirdImHinweisKenntlichGemacht() {
        let e = pruefung.pruefe(Gebaeude())
        XCTAssertTrue(e.hinweis.lowercased().contains("entwurf"))
        XCTAssertTrue(e.hinweis.contains("nicht in Kraft"))
    }

    func testJederPunktHatEineFundstelle() {
        var g = Gebaeude(baujahr: 1965, heizungsart: .gas)
        g.heizungBaujahr = 1990
        g.istVermietet = true
        g.istWohngebaeude = false

        for punkt in pruefung.pruefe(g).punkte {
            XCTAssertFalse(punkt.fundstelle.isEmpty, "Ohne Fundstelle: \(punkt.titel)")
            XCTAssertFalse(punkt.erlaeuterung.isEmpty, "Ohne Erläuterung: \(punkt.titel)")
        }
    }
}

final class CO2Tests: XCTestCase {

    var rechner: CO2Rechner!

    override func setUpWithError() throws {
        rechner = CO2Rechner(regeln: try Regelpaketlader.mitgeliefert())
    }

    func testSchlechtesteStufeTraegtVermieterFastAlles() {
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 60), 0.95)
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 52), 0.95)
    }

    func testBesterStandTraegtMieterAlles() {
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 8), 0.0)
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 11.9), 0.0)
    }

    func testStufenGehenInZehnProzentschritten() {
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 12), 0.10)
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 17), 0.20)
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 22), 0.30)
        XCTAssertEqual(rechner.vermieteranteil(kilogrammProQuadratmeter: 47), 0.80)
    }

    func testVermieterkostenWerdenAnteiligBerechnet() {
        let e = rechner.berechne(kilogrammProQuadratmeter: 55, co2KostenGesamtProJahr: 1_000)

        XCTAssertEqual(e.vermieterkostenProJahr, 950, accuracy: 0.01)
        XCTAssertEqual(e.mieteranteil, 0.05, accuracy: 0.0001)
        XCTAssertEqual(e.stufeNummer, 1)
    }

    func testSanierungSenktDenVermieteranteil() {
        let ersparnis = rechner.ersparnisProJahr(vorher: 55, nachher: 20, co2KostenGesamtProJahr: 2_000)

        // 55 kg/m²a liegt in der obersten Stufe (95 %), 20 kg/m²a in der Stufe
        // ab 17 kg (20 %) – nicht in der Stufe ab 22 kg.
        XCTAssertEqual(ersparnis, 2_000 * (0.95 - 0.20), accuracy: 0.01)
    }

    func testVerschlechterungErgibtKeineNegativeErsparnis() {
        XCTAssertEqual(rechner.ersparnisProJahr(vorher: 20, nachher: 55, co2KostenGesamtProJahr: 2_000), 0)
    }
}

final class RegelpaketTests: XCTestCase {

    func testMitgeliefertesPaketLaedt() throws {
        let paket = try Regelpaketlader.mitgeliefert()

        XCTAssertGreaterThan(paket.version, 0)
        XCTAssertFalse(paket.stand.isEmpty)
        XCTAssertFalse(paket.zuPruefen.isEmpty, "Zu prüfende Werte müssen benannt sein.")
        XCTAssertEqual(paket.co2Stufen.count, 10)
    }

    func testAeltereFassungWirdAbgewiesen() throws {
        let aktuell = try Regelpaketlader.mitgeliefert()
        var alt = aktuell
        alt.version = aktuell.version - 1
        let daten = try JSONEncoder().encode(alt)

        XCTAssertThrowsError(try Regelpaketlader.laden(von: daten, nichtAelterAls: aktuell))
    }

    func testNeuereFassungWirdAngenommen() throws {
        let aktuell = try Regelpaketlader.mitgeliefert()
        var neu = aktuell
        neu.version = aktuell.version + 1
        neu.stand = "2026-12-01"
        let daten = try JSONEncoder().encode(neu)

        let geladen = try Regelpaketlader.laden(von: daten, nichtAelterAls: aktuell)
        XCTAssertEqual(geladen.version, aktuell.version + 1)
    }

    func testUnvollstaendigesPaketWirdAbgewiesen() throws {
        var kaputt = try Regelpaketlader.mitgeliefert()
        kaputt.co2Stufen = []
        let daten = try JSONEncoder().encode(kaputt)

        XCTAssertThrowsError(try Regelpaketlader.laden(von: daten))
    }

    func testMuellWirdAbgewiesen() {
        XCTAssertThrowsError(try Regelpaketlader.laden(von: Data("kein json".utf8)))
    }

    /// Sichert die Notfallfassung ab, damit `Regelpaketlader.standard` in der App
    /// niemals scheitern kann.
    func testEingebettetesPaketIstLesbar() throws {
        let paket = try Regelpaketlader.laden(von: Data(Regelpaketlader.eingebettetJSON.utf8))
        XCTAssertGreaterThan(paket.version, 0)
    }

    func testEingebettetesPaketStimmtMitRessourceUeberein() throws {
        let ausRessource = try Regelpaketlader.mitgeliefert()
        let eingebettet = try Regelpaketlader.laden(von: Data(Regelpaketlader.eingebettetJSON.utf8))

        XCTAssertEqual(ausRessource, eingebettet,
                       "Ressource und eingebettete Fassung sind auseinandergelaufen.")
    }

    func testStandardpaketIstImmerVerfuegbar() {
        XCTAssertGreaterThan(Regelpaketlader.standard.version, 0)
    }
}

final class FormateTests: XCTestCase {

    func testEuroFormatierung() {
        XCTAssertTrue(Formate.euro(31_600).contains("€"))
        XCTAssertTrue(Formate.euro(31_600).contains("31"))
    }

    func testProzentOhneUnnoetigeNachkommastelle() {
        XCTAssertEqual(Formate.prozent(0.15), "15 %")
    }

    func testDatumWirdDeutschGeschrieben() {
        XCTAssertEqual(Formate.datumLesbar("2026-07-21"), "21.07.2026")
    }

    func testSpanneRundetNachAussen() {
        let s = Spanne(unten: 28_432, oben: 34_871).gerundet(auf: 100)
        XCTAssertEqual(s.unten, 28_400)
        XCTAssertEqual(s.oben, 34_900)
    }
}
