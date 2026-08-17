import XCTest
@testable import WerkeKern

final class RaumaufmassTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Huellflaechenrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Huellflaechenrechner(regeln: regeln)
    }

    /// Handrechnung, Zeile für Zeile nachvollziehbar.
    ///
    /// Wohnzimmer 5,0 × 4,0 m, Höhe 2,5 m, Baujahr 1968 ungedämmt.
    /// Außenwand netto 18,5 m² × 1,40 = 25,90
    /// Fenster 4 m² × 3,00            = 12,00
    /// Kellerdecke 20 m² × 1,2 × 0,5  = 12,00
    ///                         Summe  = 49,90 W/K
    /// Wärmebrücken 0,10 × 42,5 m²    =  4,25 W/K
    /// Lüftung 0,34 × 0,5 × 50 m³     =  8,50 W/K
    /// bei ΔT = 32 K → 1.597 + 136 + 272 = 2.005 W
    func testWohnzimmerGegenHandrechnung() {
        var haus = Gebaeude(baujahr: 1968)
        haus.fassade = .ungedaemmt
        haus.kellerdecke = .ungedaemmt
        haus.fensterBaujahr = 1968

        let raum = Raum(
            name: "Wohnen", grundflaeche: 20, raumhoehe: 2.5, solltemperatur: 20,
            flaechen: [
                Huellflaeche(art: .aussenwand, quadratmeter: 18.5, grenze: .aussenluft),
                Huellflaeche(art: .fenster, quadratmeter: 4, grenze: .aussenluft),
                Huellflaeche(art: .kellerdecke, quadratmeter: 20, grenze: .unbeheizt)
            ]
        )

        let e = rechner.berechne(raeume: [raum], gebaeude: haus, normaussentemperatur: -12)
        let ergebnis = e.raeume[0]

        XCTAssertEqual(ergebnis.transmission, 1_596.8, accuracy: 1)
        XCTAssertEqual(ergebnis.waermebruecken, 136, accuracy: 2)
        XCTAssertEqual(ergebnis.lueftung, 272, accuracy: 2)
        XCTAssertEqual(ergebnis.gesamt, 2_004.8, accuracy: 1)
        XCTAssertEqual(e.gesamtKW, 2.0048, accuracy: 0.001)
    }

    func testBadHatHoehereSolltemperaturUndDadurchMehrHeizlast() {
        let haus = Gebaeude(baujahr: 1968)
        let flaechen = [Huellflaeche(art: .aussenwand, quadratmeter: 10, grenze: .aussenluft)]

        let wohnen = Raum(name: "Wohnen", grundflaeche: 12, solltemperatur: 20, flaechen: flaechen)
        let bad = Raum(name: "Bad", grundflaeche: 12, solltemperatur: 24, flaechen: flaechen)

        let e = rechner.berechne(raeume: [wohnen, bad], gebaeude: haus, normaussentemperatur: -12)

        // ΔT 36 K statt 32 K
        XCTAssertEqual(e.raeume[1].gesamt / e.raeume[0].gesamt, 36.0 / 32.0, accuracy: 0.01)
    }

    func testSolltemperaturWirdAusDemRaumnamenAbgeleitet() {
        XCTAssertEqual(Raum.solltemperatur(fuerRaumname: "Badezimmer"), 24)
        XCTAssertEqual(Raum.solltemperatur(fuerRaumname: "Flur"), 15)
        XCTAssertEqual(Raum.solltemperatur(fuerRaumname: "Wohnzimmer"), 20)
    }

    func testGedaemmteBauteileSenkenDieHeizlastDeutlich() {
        var alt = Gebaeude(baujahr: 1968)
        alt.fassade = .ungedaemmt
        var neu = alt
        neu.fassade = .gedaemmt

        let raum = Raum(name: "Wohnen", grundflaeche: 20, flaechen: [
            Huellflaeche(art: .aussenwand, quadratmeter: 20, grenze: .aussenluft)
        ])

        let a = rechner.berechne(raeume: [raum], gebaeude: alt, normaussentemperatur: -12)
        let b = rechner.berechne(raeume: [raum], gebaeude: neu, normaussentemperatur: -12)

        XCTAssertLessThan(b.gesamtKW, a.gesamtKW * 0.6)
    }

    /// Die eine Angabe, die kein Scanner liefern kann.
    func testGrenzeEntscheidetUeberDenVerlust() {
        let haus = Gebaeude(baujahr: 1968)
        func heizlast(_ grenze: Grenze) -> Double {
            rechner.berechne(
                raeume: [Raum(name: "R", grundflaeche: 20, flaechen: [
                    Huellflaeche(art: .aussenwand, quadratmeter: 20, grenze: grenze)
                ])],
                gebaeude: haus, normaussentemperatur: -12
            ).gesamtKW
        }

        XCTAssertGreaterThan(heizlast(.aussenluft), heizlast(.unbeheizt))
        XCTAssertGreaterThan(heizlast(.unbeheizt), heizlast(.erdreich))
        XCTAssertGreaterThan(heizlast(.erdreich), heizlast(.beheizt))
    }

    func testFlaecheGegenBeheiztVerursachtKeinenTransmissionsverlust() {
        let haus = Gebaeude(baujahr: 1968)
        let e = rechner.berechne(
            raeume: [Raum(name: "Innen", grundflaeche: 20, flaechen: [
                Huellflaeche(art: .innenwand, quadratmeter: 30, grenze: .beheizt)
            ])],
            gebaeude: haus, normaussentemperatur: -12
        )
        XCTAssertEqual(e.raeume[0].transmission, 0, accuracy: 0.01)
        XCTAssertEqual(e.raeume[0].waermebruecken, 0, accuracy: 0.01)
        XCTAssertGreaterThan(e.raeume[0].lueftung, 0)   // gelüftet wird trotzdem
    }

    func testEigenerUWertSchlaegtDieTabelle() {
        let haus = Gebaeude(baujahr: 1968)
        let raum = Raum(name: "R", grundflaeche: 20, flaechen: [
            Huellflaeche(art: .aussenwand, quadratmeter: 20, grenze: .aussenluft, uWert: 0.15)
        ])
        let e = rechner.berechne(raeume: [raum], gebaeude: haus, normaussentemperatur: -12)

        // 0,15 × 20 × 32 = 96 W Transmission
        XCTAssertEqual(e.raeume[0].transmission, 96, accuracy: 1)
    }

    func testGanzesHausAddiertSichAuf() {
        let haus = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        let raeume = (1...6).map { i in
            Raum(name: "Raum \(i)", grundflaeche: 20, flaechen: [
                Huellflaeche(art: .aussenwand, quadratmeter: 15, grenze: .aussenluft),
                Huellflaeche(art: .fenster, quadratmeter: 3, grenze: .aussenluft)
            ])
        }
        let e = rechner.berechne(raeume: raeume, gebaeude: haus, normaussentemperatur: -12)

        XCTAssertEqual(e.raeume.count, 6)
        XCTAssertEqual(e.beheizteFlaeche, 120)
        XCTAssertEqual(e.gesamtKW, e.raeume.reduce(0) { $0 + $1.gesamt } / 1000, accuracy: 0.001)
        XCTAssertGreaterThan(e.jeQuadratmeter, 50)
        XCTAssertLessThan(e.jeQuadratmeter, 250)
    }

    func testKeineRaeumeErgebenNull() {
        let e = rechner.berechne(raeume: [], gebaeude: Gebaeude(), normaussentemperatur: -12)
        XCTAssertEqual(e.gesamtKW, 0)
        XCTAssertTrue(e.raeume.isEmpty)
    }

    func testUWerteFolgenDemBaujahr() {
        XCTAssertEqual(rechner.uWert(fuer: .aussenwand, gebaeude: Gebaeude(baujahr: 1900)), 1.7)
        XCTAssertEqual(rechner.uWert(fuer: .aussenwand, gebaeude: Gebaeude(baujahr: 1968)), 1.4)
        XCTAssertEqual(rechner.uWert(fuer: .aussenwand, gebaeude: Gebaeude(baujahr: 2020)), 0.28)
    }

    func testFensterUWertFolgtDemFensterbaujahrNichtDemHaus() {
        var haus = Gebaeude(baujahr: 1968)
        haus.fensterBaujahr = 2015
        XCTAssertEqual(rechner.uWert(fuer: .fenster, gebaeude: haus), 1.1)
    }
}
