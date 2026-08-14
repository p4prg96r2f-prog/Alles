import XCTest
@testable import WerkeKern

final class FoerderrechnerTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Foerderrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Foerderrechner(regeln: regeln)
    }

    // MARK: Grundförderung

    func testGrundfoerderungOhneSanierungsfahrplan() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: false)
        let massnahmen = [Massnahme(art: .fassade, kosten: 40_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        // 40.000 sind über der Höchstgrenze von 30.000 ohne iSFP.
        // 30.000 × 15 % = 4.500
        XCTAssertEqual(ergebnis.zuschussGesamt, 4_500, accuracy: 0.01)
    }

    func testHoechstgrenzeGreiftOhneISFP() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: false)
        let massnahmen = [Massnahme(art: .dach, kosten: 100_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        XCTAssertEqual(ergebnis.posten.first?.foerderfaehig, 30_000)
        XCTAssertEqual(ergebnis.zuschussGesamt, 4_500, accuracy: 0.01)
    }

    // MARK: iSFP-Bonus – die neue Systematik seit 21.07.2026

    func testISFPBonusGreiftNichtUnterhalbDerSchwelle() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: true)
        let massnahmen = [Massnahme(art: .fassade, kosten: 26_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        // Unter 30.000: nur Grundförderung, kein Bonus.
        XCTAssertEqual(ergebnis.zuschussGesamt, 26_000 * 0.15, accuracy: 0.01)
    }

    func testISFPBonusNurAufDenUeberschuss() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: true)
        let massnahmen = [Massnahme(art: .fassade, kosten: 41_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        // Grund: 41.000 × 15 % = 6.150
        // Bonus: (41.000 − 30.000) × 5 % = 550
        XCTAssertEqual(ergebnis.zuschussGesamt, 6_150 + 550, accuracy: 0.01)
    }

    /// Das Beispiel aus dem Konzept: Bündelung schlägt Einzelmaßnahme.
    func testBuendelungBringtMehrAlsEinzelmassnahme() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: true)

        let einzeln = rechner.berechne(
            gebaeude: gebaeude,
            massnahmen: [Massnahme(art: .fassade, kosten: 26_000)]
        )
        let gebuendelt = rechner.berechne(
            gebaeude: gebaeude,
            massnahmen: [
                Massnahme(art: .fassade, kosten: 26_000),
                Massnahme(art: .fenster, kosten: 15_000)
            ]
        )

        let mehrInvestition = 15_000.0
        let mehrZuschuss = gebuendelt.zuschussGesamt - einzeln.zuschussGesamt

        // Der Zuschuss wächst stärker als die reine Grundförderung auf den
        // Mehrbetrag, weil der Bonus zusätzlich greift.
        XCTAssertGreaterThan(mehrZuschuss, mehrInvestition * 0.15)
        XCTAssertEqual(mehrZuschuss, 15_000 * 0.15 + 11_000 * 0.05, accuracy: 0.01)
    }

    func testSummeDerPostenEntsprichtGesamtzuschuss() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: true)
        let massnahmen = [
            Massnahme(art: .dach, kosten: 22_000),
            Massnahme(art: .fassade, kosten: 31_000),
            Massnahme(art: .fenster, kosten: 12_000)
        ]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)
        let summe = ergebnis.posten.reduce(0) { $0 + $1.zuschuss }

        XCTAssertEqual(summe, ergebnis.zuschussGesamt, accuracy: 0.01)
    }

    // MARK: Heizung

    func testHeizungstauschMitBoniWirdGedeckelt() {
        let gebaeude = Gebaeude()
        let haushalt = Haushalt(
            selbstbewohnt: true,
            zuVersteuerndesEinkommen: 35_000,
            kinderImHaushalt: 2,
            vorzeitigerHeizungstausch: true
        )
        let massnahmen = [Massnahme(art: .heizungstausch, kosten: 28_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen, haushalt: haushalt)
        let posten = try! XCTUnwrap(ergebnis.posten.first)

        // 30 + 20 + 30 + 5 = 85 %, gedeckelt auf 70 %.
        XCTAssertEqual(posten.satz, 0.70, accuracy: 0.0001)
        XCTAssertEqual(posten.zuschuss, 28_000 * 0.70, accuracy: 0.01)
    }

    func testHeizungOhneBoniNurGrundfoerderung() {
        let gebaeude = Gebaeude()
        let massnahmen = [Massnahme(art: .heizungstausch, kosten: 20_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        XCTAssertEqual(ergebnis.zuschussGesamt, 20_000 * 0.30, accuracy: 0.01)
    }

    func testHeizungHoechstkostenBeiMehrfamilienhaus() {
        let gebaeude = Gebaeude(typ: .mehrfamilienhaus, wohneinheiten: 3)
        let massnahmen = [Massnahme(art: .heizungstausch, kosten: 90_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)
        let posten = try! XCTUnwrap(ergebnis.posten.first)

        // 30.000 für die erste, 15.000 je weitere Wohneinheit.
        XCTAssertEqual(posten.foerderfaehig, 60_000, accuracy: 0.01)
    }

    // MARK: Honorar und Netto-Ergebnis

    func testHonorarEffektivAnderthalbProzent() {
        let ergebnis = rechner.honorar(fuerInvestition: 100_000)

        XCTAssertEqual(ergebnis.honorarBrutto, 3_000, accuracy: 0.01)
        XCTAssertEqual(ergebnis.zuschuss, 1_500, accuracy: 0.01)
        XCTAssertEqual(ergebnis.eigenanteil, 1_500, accuracy: 0.01)
    }

    func testHonorarMindestEigenanteil() {
        // 10.000 × 3 % = 300, davon die Hälfte = 150 → Mindestbetrag greift.
        let ergebnis = rechner.honorar(fuerInvestition: 10_000)

        XCTAssertEqual(ergebnis.eigenanteil, 325, accuracy: 0.01)
    }

    func testHonorarOhneInvestitionIstNull() {
        XCTAssertEqual(rechner.honorar(fuerInvestition: 0).eigenanteil, 0)
    }

    func testEigenanteilRechnungGehtAuf() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: true)
        let massnahmen = [Massnahme(art: .fassade, kosten: 41_000)]

        let e = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        XCTAssertEqual(
            e.eigenanteilGesamt,
            e.investitionGesamt - e.zuschussGesamt + e.honorar.eigenanteil,
            accuracy: 0.01
        )
    }

    // MARK: Optimierungshinweise

    func testHinweisWennKnappUnterDerBonusschwelle() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: true)
        let massnahmen = [Massnahme(art: .fassade, kosten: 26_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        XCTAssertTrue(ergebnis.hinweise.contains { $0.titel.contains("Bonusschwelle") })
    }

    func testHinweisAufSanierungsfahrplanWennKeinerVorliegt() {
        let gebaeude = Gebaeude(hatSanierungsfahrplan: false)
        let massnahmen = [Massnahme(art: .fassade, kosten: 45_000)]

        let ergebnis = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen)

        let hinweis = ergebnis.hinweise.first { $0.titel.contains("Sanierungsfahrplan") }
        XCTAssertNotNil(hinweis)
        XCTAssertGreaterThan(hinweis!.moeglicherMehrbetrag, 0)
    }

    // MARK: Spanne und Nachvollziehbarkeit

    func testSpanneVerengtSichMitVollstaendigerenAngaben() {
        let duenn = Gebaeude(hatSanierungsfahrplan: true)
        var dicht = duenn
        dicht.dach = .ungedaemmt
        dicht.fassade = .ungedaemmt
        dicht.kellerdecke = .gedaemmt
        dicht.obersteGeschossdecke = .ungedaemmt
        dicht.fensterBaujahr = 1998
        dicht.heizungBaujahr = 2004

        let massnahmen = [Massnahme(art: .fassade, kosten: 41_000)]
        let a = rechner.berechne(gebaeude: duenn, massnahmen: massnahmen)
        let b = rechner.berechne(gebaeude: dicht, massnahmen: massnahmen)

        let breiteA = a.zuschussSpanne.oben - a.zuschussSpanne.unten
        let breiteB = b.zuschussSpanne.oben - b.zuschussSpanne.unten

        XCTAssertLessThan(breiteB, breiteA)
    }

    func testErgebnisTraegtRegelversionUndStand() {
        let ergebnis = rechner.berechne(
            gebaeude: Gebaeude(),
            massnahmen: [Massnahme(art: .dach, kosten: 20_000)]
        )

        XCTAssertEqual(ergebnis.regelVersion, regeln.version)
        XCTAssertEqual(ergebnis.regelStand, regeln.stand)
        XCTAssertFalse(ergebnis.annahmen.isEmpty)
    }

    func testOhneMassnahmenKeinZuschuss() {
        let ergebnis = rechner.berechne(gebaeude: Gebaeude(), massnahmen: [])

        XCTAssertEqual(ergebnis.zuschussGesamt, 0)
        XCTAssertEqual(ergebnis.eigenanteilGesamt, 0)
    }
}
