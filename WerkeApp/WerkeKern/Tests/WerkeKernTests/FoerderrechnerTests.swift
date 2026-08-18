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

        // Einkommen 35.000 €, zwei Kinder → Familienzuschlag 2 × 10.000 €
        // senkt das anzusetzende Einkommen auf 15.000 € und damit in die
        // oberste Stufe: 30 Grundförderung + 16 Klimageschwindigkeit
        // + 40 Einkommen = 86 %, gedeckelt auf 80 %.
        XCTAssertEqual(posten.satz, 0.80, accuracy: 0.0001)
        XCTAssertEqual(posten.zuschuss, 28_000 * 0.80, accuracy: 0.01)
        XCTAssertTrue(posten.begruendung.contains { $0.contains("Familienzuschlag") },
                      posten.begruendung.joined(separator: " | "))
    }

    /// Der Familienzuschlag senkt das anzusetzende Einkommen und erschließt
    /// dadurch eine bessere Stufe. Als fester Aufschlag gerechnet – wie in der
    /// früheren Fassung – wäre er bei diesem Haushalt zwanzig Prozentpunkte
    /// zu niedrig.
    func testFamilienzuschlagErschliesstDieBessereStufe() throws {
        let gebaeude = Gebaeude()
        let massnahmen = [Massnahme(art: .heizungstausch, kosten: 28_000)]

        func satz(kinder: Int) throws -> Double {
            let haushalt = Haushalt(
                selbstbewohnt: true,
                zuVersteuerndesEinkommen: 48_000,
                kinderImHaushalt: kinder
            )
            let e = rechner.berechne(gebaeude: gebaeude, massnahmen: massnahmen, haushalt: haushalt)
            return try XCTUnwrap(e.posten.first).satz
        }

        // 48.000 € → Stufe „bis 50.000“, Bonus 10 %.
        XCTAssertEqual(try satz(kinder: 0), 0.30 + 0.10, accuracy: 0.0001)
        // Zwei Kinder → 28.000 € anzusetzen → Stufe „bis 30.000“, Bonus 40 %.
        XCTAssertEqual(try satz(kinder: 2), 0.30 + 0.40, accuracy: 0.0001)
    }

    /// Oberhalb der höchsten Stufe gibt es keinen Einkommensbonus.
    func testKeinEinkommensbonusOberhalbDerHoechstenStufe() throws {
        let haushalt = Haushalt(selbstbewohnt: true, zuVersteuerndesEinkommen: 60_000)
        let e = rechner.berechne(
            gebaeude: Gebaeude(),
            massnahmen: [Massnahme(art: .heizungstausch, kosten: 20_000)],
            haushalt: haushalt
        )
        XCTAssertEqual(try XCTUnwrap(e.posten.first).satz, 0.30, accuracy: 0.0001)
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

        // 28.000 für die erste, 15.000 für die zweite bis sechste.
        XCTAssertEqual(posten.foerderfaehig, 28_000 + 2 * 15_000, accuracy: 0.01)
    }

    /// Ab der siebten Wohneinheit gilt ein niedrigerer Satz. Die frühere
    /// Fassung rechnete jede weitere Einheit mit dem Satz der zweiten – bei
    /// zwölf Einheiten sind das 42.000 € zu viel an förderfähigen Kosten.
    func testAbDerSiebtenWohneinheitGiltEinNiedrigererSatz() throws {
        let gebaeude = Gebaeude(typ: .mehrfamilienhaus, wohneinheiten: 12)
        let e = rechner.berechne(
            gebaeude: gebaeude,
            massnahmen: [Massnahme(art: .heizungstausch, kosten: 500_000)]
        )
        let posten = try XCTUnwrap(e.posten.first)

        // 28.000 + 5 × 15.000 + 6 × 8.000 = 151.000
        XCTAssertEqual(posten.foerderfaehig, 151_000, accuracy: 0.01)
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

// MARK: - Der Hinweis muss stimmen, nicht nur plausibel klingen

extension FoerderrechnerTests {

    /// Ein Sanierungsfahrplan hebt zusätzlich die Höchstgrenze der förderfähigen
    /// Kosten. Ein Hinweis, der nur den Bonussatz ansetzt, nennt dem Kunden
    /// einen viel zu kleinen Betrag.
    func testHinweisEntsprichtDerTatsaechlichenDifferenz() {
        let ohne = Gebaeude(hatSanierungsfahrplan: false)
        var mit = ohne
        mit.hatSanierungsfahrplan = true

        let massnahmen = [
            Massnahme(art: .fassade, kosten: 31_000),
            Massnahme(art: .fenster, kosten: 18_000)
        ]

        let a = rechner.berechne(gebaeude: ohne, massnahmen: massnahmen)
        let b = rechner.berechne(gebaeude: mit, massnahmen: massnahmen)

        let hinweis = a.hinweise.first { $0.titel.contains("Sanierungsfahrplan") }
        XCTAssertNotNil(hinweis)
        XCTAssertEqual(hinweis!.moeglicherMehrbetrag, b.zuschussGesamt - a.zuschussGesamt, accuracy: 0.01)
    }

    /// Genau der Fall aus dem Durchlauf: 49.000 € Volumen.
    /// Ohne Fahrplan greift die Grenze bei 30.000 € → 4.500 €.
    /// Mit Fahrplan sind 49.000 € förderfähig → 7.350 € + 950 € Bonus = 8.300 €.
    func testHoechstgrenzeVerdoppeltSichMitFahrplan() {
        let massnahmen = [
            Massnahme(art: .fassade, kosten: 31_000),
            Massnahme(art: .fenster, kosten: 18_000)
        ]

        let ohne = rechner.berechne(gebaeude: Gebaeude(hatSanierungsfahrplan: false), massnahmen: massnahmen)
        let mit = rechner.berechne(gebaeude: Gebaeude(hatSanierungsfahrplan: true), massnahmen: massnahmen)

        XCTAssertEqual(ohne.zuschussGesamt, 4_500, accuracy: 0.01)
        XCTAssertEqual(mit.zuschussGesamt, 8_300, accuracy: 0.01)
    }

    func testKeinFahrplanhinweisWennSchonEinerVorliegt() {
        let ergebnis = rechner.berechne(
            gebaeude: Gebaeude(hatSanierungsfahrplan: true),
            massnahmen: [Massnahme(art: .fassade, kosten: 45_000)]
        )
        XCTAssertNil(ergebnis.hinweise.first { $0.titel.contains("Mit Sanierungsfahrplan") })
    }

    func testKeinFahrplanhinweisBeiReinemHeizungstausch() {
        // Die Heizungsförderung kennt den iSFP-Bonus nicht – dann darf auch
        // kein Mehrbetrag versprochen werden.
        let ergebnis = rechner.berechne(
            gebaeude: Gebaeude(hatSanierungsfahrplan: false),
            massnahmen: [Massnahme(art: .heizungstausch, kosten: 28_000)]
        )
        XCTAssertNil(ergebnis.hinweise.first { $0.titel.contains("Sanierungsfahrplan") })
    }

    func testHinweisNennNiemalsEinenNegativenBetrag() {
        for kosten in stride(from: 2_000.0, through: 120_000.0, by: 2_000.0) {
            let ergebnis = rechner.berechne(
                gebaeude: Gebaeude(hatSanierungsfahrplan: false),
                massnahmen: [Massnahme(art: .fassade, kosten: kosten)]
            )
            for hinweis in ergebnis.hinweise {
                XCTAssertGreaterThanOrEqual(hinweis.moeglicherMehrbetrag, 0, "bei \(kosten) €")
            }
        }
    }
}
