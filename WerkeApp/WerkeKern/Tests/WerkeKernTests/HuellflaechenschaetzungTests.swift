import XCTest
@testable import WerkeKern

/// Hüllflächen aus Grundriss und Geschossen – der Ersatz für ein Außenaufmaß.
final class HuellflaechenschaetzungTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Huellflaechenrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Huellflaechenrechner(regeln: regeln)
    }

    func testUmfangEinesQuadratischenGrundrisses() {
        // 100 m² → rund 40,6 m statt exakt 40 m, weil übliche Grundrisse
        // nicht quadratisch sind.
        let huelle = Gebaeudehuelle(grundflaeche: 100)
        XCTAssertEqual(huelle.geschaetzterUmfang, 40.6, accuracy: 0.1)
    }

    func testAngegebenerUmfangSchlaegtDieSchaetzung() {
        let huelle = Gebaeudehuelle(grundflaeche: 100, umfang: 44)
        XCTAssertEqual(huelle.geschaetzterUmfang, 44)
    }

    func testBruttogrundflaecheZaehltGeschosse() {
        XCTAssertEqual(Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2).bruttogrundflaeche, 160)
        XCTAssertEqual(
            Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2, dachgeschossBeheizt: true).bruttogrundflaeche,
            80 * 2.7, accuracy: 0.1
        )
        XCTAssertEqual(
            Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2, kellerlage: .beheizterKeller).bruttogrundflaeche,
            240
        )
    }

    /// Die Wohnfläche ist nicht die Bruttogrundfläche: Außenwände, Innenwände
    /// und Treppenhaus gehen ab. Wer den Unterschied unterschlägt, weist den
    /// Kennwert in W/m² um ein Fünftel zu niedrig aus – und vergleicht ihn dann
    /// mit Erfahrungswerten, die sich auf die Wohnfläche beziehen.
    func testWohnflaecheLiegtUnterDerBruttogrundflaeche() {
        let huelle = Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2)
        XCTAssertEqual(huelle.beheizteFlaeche, 128, accuracy: 0.01)
        XCTAssertLessThan(huelle.beheizteFlaeche, huelle.bruttogrundflaeche)
    }

    /// Gelüftet wird Luft, nicht Beton: Das Lüftungsvolumen folgt aus lichter
    /// Höhe und Wohnfläche, nicht aus Geschosshöhe und Bruttogrundfläche.
    func testLichteHoeheLiegtUnterDerGeschosshoehe() {
        let huelle = Gebaeudehuelle(grundflaeche: 80, geschosshoehe: 2.6)
        XCTAssertEqual(huelle.lichteHoehe, 2.35, accuracy: 0.01)
    }

    func testFlaechenAddierenSichPlausibel() {
        let huelle = Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2)
        let flaechen = rechner.flaechen(fuer: huelle, gebaeude: Gebaeude(baujahr: 1968))

        // Fassade brutto = 4,06·√80 · (2 · 2,6) ≈ 188,8 m²
        let fassade = flaechen
            .filter { [.aussenwand, .fenster, .tuer].contains($0.art) && $0.grenze == .aussenluft }
            .reduce(0) { $0 + $1.quadratmeter }
        XCTAssertEqual(fassade, 188.8, accuracy: 2)

        // Fenster bei Baujahr 1968: 14 % der Fassade
        let fenster = flaechen.first { $0.art == .fenster }!
        XCTAssertEqual(fenster.quadratmeter / fassade, 0.14, accuracy: 0.005)
    }

    func testReihenhausHatWenigerFassadeAlsFreistehendesHaus() {
        let huelle = Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2)
        func fassade(_ typ: Gebaeudetyp) -> Double {
            rechner.flaechen(fuer: huelle, gebaeude: Gebaeude(typ: typ, baujahr: 1968))
                .filter { $0.art == .aussenwand && $0.grenze == .aussenluft }
                .reduce(0) { $0 + $1.quadratmeter }
        }

        XCTAssertGreaterThan(fassade(.einfamilienhaus), fassade(.doppelhaushaelfte))
        XCTAssertGreaterThan(fassade(.doppelhaushaelfte), fassade(.reihenhaus))
    }

    func testUnbeheiztesDachgeschossRechnetMitDerGeschossdecke() {
        let kalt = Gebaeudehuelle(grundflaeche: 80, dachform: .sattel, dachgeschossBeheizt: false)
        let warm = Gebaeudehuelle(grundflaeche: 80, dachform: .sattel, dachgeschossBeheizt: true)

        let flaecheKalt = rechner.flaechen(fuer: kalt, gebaeude: Gebaeude()).first { $0.art == .dach }!
        let flaecheWarm = rechner.flaechen(fuer: warm, gebaeude: Gebaeude()).first { $0.art == .dach }!

        XCTAssertEqual(flaecheKalt.quadratmeter, 80)          // Geschossdecke
        XCTAssertEqual(flaecheKalt.grenze, .unbeheizt)
        XCTAssertEqual(flaecheWarm.quadratmeter, 104)         // 80 × 1,30 Satteldach
        XCTAssertEqual(flaecheWarm.grenze, .aussenluft)
    }

    func testFensteranteilSteigtMitDemBaujahr() {
        XCTAssertLessThan(rechner.fensteranteil(baujahr: 1930), rechner.fensteranteil(baujahr: 2020))
    }

    // MARK: Ergebnis

    func testHeizlastAusEckdatenLiegtImPlausiblenBereich() {
        var haus = Gebaeude(baujahr: 1968, wohnflaeche: 160)
        haus.fassade = .ungedaemmt
        haus.dach = .ungedaemmt

        let e = rechner.ausGebaeudehuelle(
            Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2),
            gebaeude: haus, normaussentemperatur: -12
        )

        XCTAssertGreaterThan(e.gesamtKW, 8)
        XCTAssertLessThan(e.gesamtKW, 30)
        XCTAssertEqual(e.unbestaetigteFlaechen, 0, "Hier ist nichts offen – die Zuordnung folgt aus den Eckdaten.")
    }

    func testSaniertesHausBrauchtDeutlichWeniger() {
        var alt = Gebaeude(baujahr: 1968, wohnflaeche: 160)
        alt.fassade = .ungedaemmt
        alt.dach = .ungedaemmt
        var neu = alt
        neu.fassade = .gedaemmt
        neu.dach = .gedaemmt
        neu.kellerdecke = .gedaemmt
        neu.fensterBaujahr = 2015

        let huelle = Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2)
        let a = rechner.ausGebaeudehuelle(huelle, gebaeude: alt, normaussentemperatur: -12)
        let b = rechner.ausGebaeudehuelle(huelle, gebaeude: neu, normaussentemperatur: -12)

        XCTAssertLessThan(b.gesamtKW, a.gesamtKW * 0.55)
    }

    /// Der eigentliche Zweck: Es sieht Dinge, die der Baujahrs-Kennwert nicht
    /// sehen kann.
    func testVerwinkelterGrundrissErhoehtDieHeizlast() {
        var haus = Gebaeude(baujahr: 1968, wohnflaeche: 160)
        haus.fassade = .ungedaemmt

        // Gleiche Fläche, gleiche Geschosse – nur ein längerer Umfang, wie ihn
        // Anbauten und Erker erzeugen. Für „Watt je Quadratmeter“ sind beide
        // Häuser identisch.
        let kompakt = rechner.ausGebaeudehuelle(
            Gebaeudehuelle(grundflaeche: 80, umfang: 36, vollgeschosse: 2),
            gebaeude: haus, normaussentemperatur: -12).gesamtKW
        let verwinkelt = rechner.ausGebaeudehuelle(
            Gebaeudehuelle(grundflaeche: 80, umfang: 48, vollgeschosse: 2),
            gebaeude: haus, normaussentemperatur: -12).gesamtKW

        XCTAssertGreaterThan(verwinkelt, kompakt * 1.15)
    }

    /// Ein ausgebautes Dachgeschoss ändert die Hülle erheblich.
    func testAusgebautesDachgeschossErhoehtDieHeizlastDeutlich() {
        var haus = Gebaeude(baujahr: 1968, wohnflaeche: 160)
        haus.fassade = .ungedaemmt
        haus.dach = .ungedaemmt

        let kalt = rechner.ausGebaeudehuelle(
            Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2, dachgeschossBeheizt: false),
            gebaeude: haus, normaussentemperatur: -12).gesamtKW
        let ausgebaut = rechner.ausGebaeudehuelle(
            Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2, dachgeschossBeheizt: true),
            gebaeude: haus, normaussentemperatur: -12).gesamtKW

        XCTAssertGreaterThan(ausgebaut, kalt * 1.2)
    }

    /// Eine gedämmte oberste Geschossdecke muss sich auswirken – sie ist die
    /// billigste Maßnahme überhaupt und häufig Pflicht.
    func testGedaemmteGeschossdeckeSenktDieHeizlast() {
        var offen = Gebaeude(baujahr: 1968, wohnflaeche: 160)
        offen.obersteGeschossdecke = .ungedaemmt
        var gedaemmt = offen
        gedaemmt.obersteGeschossdecke = .gedaemmt

        let huelle = Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2)
        let a = rechner.ausGebaeudehuelle(huelle, gebaeude: offen, normaussentemperatur: -12).gesamtKW
        let b = rechner.ausGebaeudehuelle(huelle, gebaeude: gedaemmt, normaussentemperatur: -12).gesamtKW

        XCTAssertLessThan(b, a * 0.95)
    }
}
