import XCTest
@testable import WerkeKern

final class HeizlastTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Heizlastrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Heizlastrechner(regeln: regeln)
    }

    // MARK: Weg A – aus dem Verbrauch

    /// Handrechnung: 2.000 m³ Gas × 10 kWh = 20.000 kWh.
    /// Warmwasser 3 Personen × 500 = 1.500 → 18.500 kWh Heizanteil.
    /// × 0,75 Nutzungsgrad = 13.875 kWh Nutzwärme.
    /// ÷ 1.800 h = 7,71 kW (oben) · ÷ 2.100 h = 6,61 kW (unten)
    func testVerbrauchsverfahrenGegenHandrechnung() throws {
        let angabe = Verbrauchsangabe(
            brennstoff: .gasKubikmeter,
            jahreswerte: [2_000],
            kesselart: .standardkessel,
            warmwasserEnthalten: true,
            personenImHaushalt: 3
        )

        let e = try XCTUnwrap(rechner.ausVerbrauch(angabe))

        XCTAssertEqual(e.spanne.oben, 13_875.0 / 1_800.0, accuracy: 0.01)
        XCTAssertEqual(e.spanne.unten, 13_875.0 / 2_100.0, accuracy: 0.01)
        XCTAssertEqual(e.verfahren, .ausVerbrauch)
    }

    func testWarmwasserAbzugSenktDieHeizlast() throws {
        let mit = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000], warmwasserEnthalten: true, personenImHaushalt: 4)
        let ohne = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000], warmwasserEnthalten: false, personenImHaushalt: 4)

        let a = try XCTUnwrap(rechner.ausVerbrauch(mit))
        let b = try XCTUnwrap(rechner.ausVerbrauch(ohne))

        // Wer den Warmwasseranteil im Verbrauch lässt, bekommt eine zu hohe Heizlast.
        XCTAssertLessThan(a.spanne.mitte, b.spanne.mitte)
    }

    func testMittelwertUeberMehrereJahre() throws {
        let einzeln = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000])
        let mehrere = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [1_800, 2_000, 2_200])

        let a = try XCTUnwrap(rechner.ausVerbrauch(einzeln))
        let b = try XCTUnwrap(rechner.ausVerbrauch(mehrere))

        XCTAssertEqual(a.spanne.mitte, b.spanne.mitte, accuracy: 0.01)
    }

    func testEinzelnesJahrErzeugtHinweis() throws {
        let e = try XCTUnwrap(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000])
        ))
        XCTAssertTrue(e.annahmen.contains { $0.bezeichnung == "Hinweis" })
    }

    func testBrennwertkesselErgibtHoehereLastAlsStandardkessel() throws {
        let standard = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000], kesselart: .standardkessel)
        let brennwert = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000], kesselart: .brennwert)

        let a = try XCTUnwrap(rechner.ausVerbrauch(standard))
        let b = try XCTUnwrap(rechner.ausVerbrauch(brennwert))

        // Gleicher Brennstoffeinsatz, besserer Nutzungsgrad = mehr Nutzwärme.
        XCTAssertGreaterThan(b.spanne.mitte, a.spanne.mitte)
    }

    func testOelUmrechnung() throws {
        let oel = Verbrauchsangabe(brennstoff: .oelLiter, jahreswerte: [2_000], warmwasserEnthalten: false)
        let gas = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000], warmwasserEnthalten: false)

        let a = try XCTUnwrap(rechner.ausVerbrauch(oel))
        let b = try XCTUnwrap(rechner.ausVerbrauch(gas))

        XCTAssertEqual(a.spanne.mitte, b.spanne.mitte, accuracy: 0.01)
    }

    func testKeinVerbrauchErgibtKeinErgebnis() {
        XCTAssertNil(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [])
        ))
        XCTAssertNil(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [0])
        ))
    }

    // MARK: Weg B – aus Gebäudeangaben

    func testGebaeudeverfahrenAltbauLiegtHoeherAlsNeubau() {
        let alt = Gebaeude(baujahr: 1960, wohnflaeche: 140)
        let neu = Gebaeude(baujahr: 2018, wohnflaeche: 140)

        let a = rechner.ausGebaeudedaten(alt)
        let b = rechner.ausGebaeudedaten(neu)

        XCTAssertGreaterThan(a.spanne.mitte, b.spanne.mitte * 2)
    }

    func testDaemmungSenktDieHeizlast() {
        var ungedaemmt = Gebaeude(baujahr: 1960)
        ungedaemmt.dach = .ungedaemmt
        ungedaemmt.fassade = .ungedaemmt

        var gedaemmt = ungedaemmt
        gedaemmt.dach = .gedaemmt
        gedaemmt.fassade = .gedaemmt

        let a = rechner.ausGebaeudedaten(ungedaemmt)
        let b = rechner.ausGebaeudedaten(gedaemmt)

        XCTAssertLessThan(b.spanne.mitte, a.spanne.mitte)
    }

    func testReihenhausLiegtUnterFreistehendemHaus() {
        let frei = Gebaeude(typ: .einfamilienhaus, baujahr: 1970, wohnflaeche: 140)
        let reihe = Gebaeude(typ: .reihenhaus, baujahr: 1970, wohnflaeche: 140)

        XCTAssertLessThan(
            rechner.ausGebaeudedaten(reihe).spanne.mitte,
            rechner.ausGebaeudedaten(frei).spanne.mitte
        )
    }

    func testKennwerteNachBaujahr() {
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 1900), 180)
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 1965), 160)
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 1990), 95)
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 2024), 45)
    }

    func testJedeAusgabeTraegtDenVorbehalt() {
        let e = rechner.ausGebaeudedaten(Gebaeude())
        XCTAssertTrue(e.vorbehalt.contains("DIN EN 12831"))
        XCTAssertFalse(e.annahmen.isEmpty)
    }

    func testErgebnisIstImmerEineSpanne() {
        let e = rechner.ausGebaeudedaten(Gebaeude())
        XCTAssertLessThan(e.spanne.unten, e.spanne.oben)
    }

    // MARK: Heizflächen

    func testUebertemperaturNormauslegung() {
        // 75/65/20: (55 − 45) / ln(55/45) = 49,83 K
        let d = Heizflaechenrechner.uebertemperatur(vorlauf: 75, ruecklauf: 65)
        XCTAssertEqual(d, 49.83, accuracy: 0.05)
    }

    func testLeistungsfaktorBeiAbgesenkterVorlauftemperatur() {
        let e = Heizflaechenrechner.pruefe(
            heizkoerper: [Heizkoerper(raum: "Wohnen", nennleistungWatt: 2_000)],
            heizlastKW: 1.0,
            vorlauf: 55,
            ruecklauf: 45
        )
        // Bei 55/45 bleiben rund 55 bis 60 Prozent der Nennleistung übrig.
        XCTAssertGreaterThan(e.leistungsfaktor, 0.50)
        XCTAssertLessThan(e.leistungsfaktor, 0.65)
    }

    func testHeizflaechenAmpelRot() {
        let e = Heizflaechenrechner.pruefe(
            heizkoerper: [Heizkoerper(raum: "Wohnen", nennleistungWatt: 4_000)],
            heizlastKW: 8.0
        )
        XCTAssertEqual(e.ampel, .rot)
        XCTAssertFalse(e.reicht)
    }

    func testHeizflaechenAmpelGruen() {
        let e = Heizflaechenrechner.pruefe(
            heizkoerper: [
                Heizkoerper(raum: "Wohnen", nennleistungWatt: 8_000),
                Heizkoerper(raum: "Küche", nennleistungWatt: 4_000),
                Heizkoerper(raum: "Bad", nennleistungWatt: 3_000)
            ],
            heizlastKW: 6.0
        )
        XCTAssertEqual(e.ampel, .gruen)
        XCTAssertTrue(e.reicht)
    }

    func testOhneHeizkoerperNeutraleAussage() {
        let e = Heizflaechenrechner.pruefe(heizkoerper: [], heizlastKW: 8.0)
        XCTAssertEqual(e.ampel, .neutral)
    }

    func testNiedrigereVorlauftemperaturVerschlechtertDieLage() {
        let koerper = [Heizkoerper(raum: "Wohnen", nennleistungWatt: 10_000)]
        let warm = Heizflaechenrechner.pruefe(heizkoerper: koerper, heizlastKW: 5, vorlauf: 70, ruecklauf: 55)
        let kalt = Heizflaechenrechner.pruefe(heizkoerper: koerper, heizlastKW: 5, vorlauf: 45, ruecklauf: 35)

        XCTAssertGreaterThan(warm.verfuegbareLeistungKW, kalt.verfuegbareLeistungKW)
    }
}

// MARK: - Beide Wege gegeneinander

extension HeizlastTests {

    /// Der Fall aus dem Durchlauf: Ein Haus von 1968, das nur 2.050 m³ Gas
    /// braucht, ist offensichtlich besser als seine Eckdaten vermuten lassen.
    /// Zwei Zahlen im Verhältnis 1:3 dürfen nicht kommentarlos nebeneinander
    /// stehen.
    func testGrosseAbweichungWirdErklaert() throws {
        let haus = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        let ausDaten = rechner.ausGebaeudedaten(haus)
        let ausVerbrauch = try XCTUnwrap(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_050], personenImHaushalt: 3)
        ))

        let vergleich = rechner.vergleiche(ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausDaten)

        XCTAssertEqual(vergleich.abweichung, .verbrauchDeutlichNiedriger)
        XCTAssertEqual(vergleich.empfohlenesVerfahren, .ausVerbrauch)
        XCTAssertFalse(vergleich.aussage.isEmpty)
    }

    func testHoherVerbrauchWirdErkannt() throws {
        let haus = Gebaeude(baujahr: 2015, wohnflaeche: 140)
        let ausDaten = rechner.ausGebaeudedaten(haus)
        let ausVerbrauch = try XCTUnwrap(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [3_500], personenImHaushalt: 3)
        ))

        XCTAssertEqual(
            rechner.vergleiche(ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausDaten).abweichung,
            .verbrauchDeutlichHoeher
        )
    }

    func testStimmigeWerteWerdenAlsSolcheBenannt() throws {
        // Unsanierter Altbau mit entsprechend hohem Verbrauch.
        let haus = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        let ausDaten = rechner.ausGebaeudedaten(haus)
        let ausVerbrauch = try XCTUnwrap(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [6_000], personenImHaushalt: 3)
        ))

        let vergleich = rechner.vergleiche(ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausDaten)
        XCTAssertEqual(vergleich.abweichung, .stimmigZusammen)
    }
}
