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

    /// Handrechnung: 2.000 m³ Gas × 10,9 kWh = 21.800 kWh Endenergie.
    /// × 0,75 Nutzungsgrad = 16.350 kWh Nutzwärme.
    /// − Warmwasser 3 Personen × 500 = 1.500 → 14.850 kWh Heizwärme.
    /// ÷ 1.800 h = 8,25 kW (oben) · ÷ 2.100 h = 7,07 kW (unten)
    ///
    /// Wichtig ist die Reihenfolge: Die Warmwasser-Pauschale ist Nutzwärme und
    /// darf erst nach dem Nutzungsgrad abgezogen werden.
    ///
    /// Die 10,9 kWh je Kubikmeter sind Brennwert mal Zustandszahl – also das,
    /// was auf der Gasrechnung steht. Der Heizwert von 10,0 wäre die falsche
    /// Größe: Abgerechnet wird nach Brennwert.
    func testVerbrauchsverfahrenGegenHandrechnung() throws {
        let angabe = Verbrauchsangabe(
            brennstoff: .gasKubikmeter,
            jahreswerte: [2_000],
            kesselart: .standardkessel,
            warmwasserEnthalten: true,
            personenImHaushalt: 3
        )

        let e = try XCTUnwrap(rechner.ausVerbrauch(angabe))

        XCTAssertEqual(e.spanne.oben, 14_850.0 / 1_800.0, accuracy: 0.01)
        XCTAssertEqual(e.spanne.unten, 14_850.0 / 2_100.0, accuracy: 0.01)
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

    /// Ein Liter Heizöl und ein Kubikmeter Erdgas sind nicht dasselbe: Öl wird
    /// mit dem Heizwert von 10,0 kWh je Liter gerechnet, Gas mit dem Brennwert
    /// von 10,9 kWh je Kubikmeter. Genau in diesem Verhältnis müssen sich zwei
    /// sonst gleiche Rechnungen unterscheiden.
    func testOelUndGasUnterscheidenSichUmDenEnergiegehalt() throws {
        let oel = Verbrauchsangabe(brennstoff: .oelLiter, jahreswerte: [2_000], warmwasserEnthalten: false)
        let gas = Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [2_000], warmwasserEnthalten: false)

        let a = try XCTUnwrap(rechner.ausVerbrauch(oel))
        let b = try XCTUnwrap(rechner.ausVerbrauch(gas))

        let erwartet = regeln.heizlast.brennwertGasProKubikmeter / regeln.heizlast.heizwertOelProLiter
        XCTAssertEqual(b.spanne.mitte / a.spanne.mitte, erwartet, accuracy: 0.001)
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

    /// Die Kennwerte in W/m² gelten für 32 Kelvin Auslegungsdifferenz. In einer
    /// milderen Region muss der Wert mitwandern.
    func testGebaeudeverfahrenSkaliertMitDerKlimaregion() {
        let haus = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        let mild = rechner.ausGebaeudedaten(haus, normaussentemperatur: -10)
        let rau = rechner.ausGebaeudedaten(haus, normaussentemperatur: -14)

        XCTAssertLessThan(mild.spanne.mitte, rau.spanne.mitte)
        XCTAssertEqual(rau.spanne.mitte / mild.spanne.mitte, 34.0 / 30.0, accuracy: 0.01)
    }

    func testOhneWohnflaecheMeldetDerVergleichKeineUebereinstimmung() throws {
        let leer = Gebaeude(baujahr: 1968, wohnflaeche: 0)
        let ausDaten = rechner.ausGebaeudedaten(leer)
        let ausVerbrauch = try XCTUnwrap(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [3_000])))

        let vergleich = rechner.vergleiche(ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausDaten)
        XCTAssertTrue(vergleich.aussage.contains("Wohnfläche"))
    }

    func testKennwerteNachBaujahr() {
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 1900), 170)
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 1965), 145)
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 1990), 100)
        // Ein Neubau nach GEG liegt bei 30 W/m², nicht bei 45 – sonst wird jede
        // Wärmepumpe im Neubau zu groß ausgelegt.
        XCTAssertEqual(rechner.spezifischeHeizlast(baujahr: 2024), 30)
    }

    /// Die wichtigste Prüfung an dieser Stelle: Die App hat zwei Wege, die aus
    /// Gebäudeangaben eine Heizlast machen – den groben Kennwert nach Baujahr
    /// und die Hüllflächenrechnung. Widersprechen die beiden sich, glaubt der
    /// Kunde keinem von beiden mehr.
    ///
    /// Verglichen wird für unsanierte Gebäude, denn dafür sind die Kennwerte
    /// gemacht. Der Kennwert darf etwas darüber liegen – er muss auch weniger
    /// kompakte und undichtere Häuser abdecken als die gerechnete Hülle.
    func testKennwertUndHuellflaechenrechnungWidersprechenSichNicht() {
        let huellen = Huellflaechenrechner(regeln: regeln)
        let formen = [
            Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2),
            Gebaeudehuelle(grundflaeche: 90, vollgeschosse: 1, dachgeschossBeheizt: true),
            Gebaeudehuelle(grundflaeche: 130, vollgeschosse: 1, dachform: .flach),
            Gebaeudehuelle(grundflaeche: 90, vollgeschosse: 2, dachgeschossBeheizt: true)
        ]

        for jahr in [1912, 1935, 1955, 1965, 1975, 1982, 1990, 1998] {
            let gerechnet = formen.map { huelle -> Double in
                var g = Gebaeude(baujahr: jahr, wohnflaeche: huelle.beheizteFlaeche)
                g.dach = .ungedaemmt
                g.fassade = .ungedaemmt
                g.kellerdecke = .ungedaemmt
                g.obersteGeschossdecke = .ungedaemmt
                g.fensterBaujahr = jahr
                return huellen.ausGebaeudehuelle(huelle, gebaeude: g, normaussentemperatur: -12)
                    .jeQuadratmeter
            }
            let mittel = gerechnet.reduce(0, +) / Double(gerechnet.count)
            let kennwert = rechner.spezifischeHeizlast(baujahr: jahr)

            XCTAssertGreaterThanOrEqual(kennwert, mittel * 0.95, "Baujahr \(jahr)")
            XCTAssertLessThanOrEqual(kennwert, mittel * 1.15, "Baujahr \(jahr)")
        }
    }

    /// „Unbekannt“ darf nicht heißen „garantiert nichts gemacht“. Ein Haus von
    /// 1968, das 2026 noch bewohnt wird, hat fast immer neue Fenster.
    func testUnbekannteBauteileWerdenNichtAlsSchlechtestFallGerechnet() {
        var unbekannt = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        unbekannt.fensterBaujahr = nil

        var ungedaemmt = unbekannt
        ungedaemmt.dach = .ungedaemmt
        ungedaemmt.fassade = .ungedaemmt
        ungedaemmt.kellerdecke = .ungedaemmt
        ungedaemmt.obersteGeschossdecke = .ungedaemmt
        ungedaemmt.fensterBaujahr = 1968

        let a = rechner.ausGebaeudedaten(unbekannt)
        let b = rechner.ausGebaeudedaten(ungedaemmt)

        XCTAssertLessThan(a.spanne.mitte, b.spanne.mitte)
        // Und wer nichts weiß, bekommt eine ehrlich breite Spanne.
        XCTAssertGreaterThan(a.spanne.oben / a.spanne.unten, b.spanne.oben / b.spanne.unten)
    }

    /// Ab 1995 steckt der Standard schon im Kennwert. Ein zusätzlicher Abschlag
    /// für „unbekannt“ wäre doppelt gezählt.
    func testNeuereGebaeudeBekommenKeinenErwartungsabschlag() {
        let neu = Gebaeude(baujahr: 2005, wohnflaeche: 140)
        let e = rechner.ausGebaeudedaten(neu)
        XCTAssertFalse(e.annahmen.contains { $0.bezeichnung == "Bereits gedämmt" })
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
        // Unsanierter Altbau mit entsprechend hohem Verbrauch. Der Zustand ist
        // hier ausdrücklich hinterlegt – ohne Angabe würde die App das Übliche
        // annehmen, und das ist bei einem Haus von 1968 eben nicht „gar nichts“.
        var haus = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        haus.dach = .ungedaemmt
        haus.fassade = .ungedaemmt
        haus.kellerdecke = .ungedaemmt
        haus.obersteGeschossdecke = .ungedaemmt
        haus.fensterBaujahr = 1968
        let ausDaten = rechner.ausGebaeudedaten(haus)
        let ausVerbrauch = try XCTUnwrap(rechner.ausVerbrauch(
            Verbrauchsangabe(brennstoff: .gasKubikmeter, jahreswerte: [6_000], personenImHaushalt: 3)
        ))

        let vergleich = rechner.vergleiche(ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausDaten)
        XCTAssertEqual(vergleich.abweichung, .stimmigZusammen)
    }
    // MARK: Heizflächen

    /// Der Satz „die Heizflächen reichen nicht aus“ ist der, an dem
    /// Wärmepumpenprojekte scheitern. Er darf nicht aus einer Liste fallen, die
    /// erkennbar erst angefangen wurde.
    func testUnvollstaendigeHeizkoerperlisteWirdNichtBewertet() {
        let einer = [Heizkoerper(raum: "Wohnen", nennleistungWatt: 1_500)]
        let e = Heizflaechenrechner.pruefe(
            heizkoerper: einer, heizlastKW: 12, erwarteteRaeume: 7
        )

        XCTAssertEqual(e.ampel, .neutral)
        XCTAssertTrue(e.aussage.contains("fehlen"), e.aussage)
        XCTAssertFalse(e.aussage.contains("reichen"), e.aussage)
    }

    /// Ist die Liste plausibel vollständig, wird wieder geurteilt.
    func testVollstaendigeListeWirdBewertet() {
        let alle = (1...7).map { Heizkoerper(raum: "Raum \($0)", nennleistungWatt: 1_500) }
        let e = Heizflaechenrechner.pruefe(
            heizkoerper: alle, heizlastKW: 12, erwarteteRaeume: 7
        )
        XCTAssertNotEqual(e.ampel, .neutral)
    }

    /// Ohne Angabe zur Gebäudegröße bleibt es beim bisherigen Verhalten.
    func testOhneErwartungWirdWieBisherGeurteilt() {
        let einer = [Heizkoerper(raum: "Wohnen", nennleistungWatt: 1_500)]
        let e = Heizflaechenrechner.pruefe(heizkoerper: einer, heizlastKW: 12)
        XCTAssertEqual(e.ampel, .rot)
    }

}
