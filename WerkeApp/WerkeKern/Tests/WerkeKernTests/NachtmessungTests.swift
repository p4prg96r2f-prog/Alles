import XCTest
@testable import WerkeKern

/// Geprüft wird gegen Nächte, deren wahrer Wärmeverlust bekannt ist.
final class NachtmessungTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Heizlastrechner!
    let kalender = Calendar(identifier: .gregorian)

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Heizlastrechner(regeln: regeln)
    }

    /// Erzeugt eine Nacht, die exakt zu einem Gebäude mit bekanntem
    /// Wärmeverlust passt.
    private func nacht(
        waermeverlust: Double,
        aussentemperatur: Double,
        stunden: Double = 8,
        innentemperatur: Double = 20,
        nutzungsgrad: Double = 0.75,
        tag: Int = 15
    ) -> Nachtmessung {
        let beginn = kalender.date(from: DateComponents(year: 2026, month: 1, day: tag, hour: 22))!
        let ende = beginn.addingTimeInterval(stunden * 3600)

        let delta = innentemperatur - aussentemperatur
        // Der Zähler sieht nur die Endenergie, und die inneren Gewinne heizen mit.
        let nutzwaerme = (waermeverlust * delta - Heizlastrechner.naechtlicheGewinneWatt) * stunden / 1000
        let endenergie = nutzwaerme / nutzungsgrad
        let kubikmeter = endenergie / regeln.heizlast.brennwertGasProKubikmeter

        return Nachtmessung(
            beginn: beginn, ende: ende,
            zaehlerVorher: 20_000, zaehlerNachher: 20_000 + kubikmeter,
            mittlereAussentemperatur: aussentemperatur,
            innentemperatur: innentemperatur
        )
    }

    // MARK: Eine einzige Nacht

    func testEineKalteNachtGenuegtFuerDenWaermeverlust() throws {
        let messung = nacht(waermeverlust: 220, aussentemperatur: -5)
        let e = try XCTUnwrap(rechner.ausNacht(messung, normaussentemperatur: -12))

        XCTAssertEqual(e.waermeverlustkoeffizient, 220, accuracy: 2)
        XCTAssertEqual(e.naechte, 1)
    }

    func testHeizlastFolgtAusWaermeverlustUndNormtemperatur() throws {
        let e = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 220, aussentemperatur: -5), normaussentemperatur: -12))

        // 220 W/K × 32 K = 7,04 kW
        XCTAssertEqual(e.heizlast.mitte, 7.04, accuracy: 0.1)
    }

    func testKaeltereNachtErgibtEngereSpanne() throws {
        let kalt = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 220, aussentemperatur: -5), normaussentemperatur: -12))
        let mild = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 220, aussentemperatur: 3), normaussentemperatur: -12))

        let breiteKalt = kalt.heizlast.oben - kalt.heizlast.unten
        let breiteMild = mild.heizlast.oben - mild.heizlast.unten
        XCTAssertLessThan(breiteKalt, breiteMild)
    }

    func testZuMildeNachtWirdAlsUnsicherGekennzeichnet() throws {
        let e = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 220, aussentemperatur: 12), normaussentemperatur: -12))

        XCTAssertEqual(e.guete, .unsicher)
        XCTAssertNotNil(e.hinweis)
    }

    // MARK: Mehrere Nächte

    func testDreiUnterschiedlichKalteNaechteErgebenEineGerade() throws {
        let naechte = [
            nacht(waermeverlust: 220, aussentemperatur: -8, tag: 10),
            nacht(waermeverlust: 220, aussentemperatur: -2, tag: 11),
            nacht(waermeverlust: 220, aussentemperatur: 4, tag: 12)
        ]
        let e = try XCTUnwrap(rechner.ausNaechten(naechte, normaussentemperatur: -12))

        XCTAssertEqual(e.waermeverlustkoeffizient, 220, accuracy: 3)
        XCTAssertEqual(e.naechte, 3)
        XCTAssertEqual(e.guete, .belastbar)
        XCTAssertNil(e.hinweis)
    }

    func testInnereGewinneWerdenAngerechnet() throws {
        // Ohne Anrechnung käme ein zu kleiner Wärmeverlust heraus.
        let e = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 150, aussentemperatur: -10), normaussentemperatur: -12))

        XCTAssertEqual(e.waermeverlustkoeffizient, 150, accuracy: 2)
    }

    func testBrennwertkesselWirdBeruecksichtigt() throws {
        var messung = nacht(waermeverlust: 220, aussentemperatur: -5, nutzungsgrad: 0.92)
        messung.kesselart = .brennwert

        let e = try XCTUnwrap(rechner.ausNacht(messung, normaussentemperatur: -12))
        XCTAssertEqual(e.waermeverlustkoeffizient, 220, accuracy: 3)
    }

    // MARK: Abweisen statt raten

    func testZuKurzerZeitraumWirdAbgewiesen() {
        let messung = nacht(waermeverlust: 220, aussentemperatur: -5, stunden: 1)
        XCTAssertNil(rechner.ausNacht(messung, normaussentemperatur: -12))
    }

    func testRueckwaertslaufenderZaehlerWirdAbgewiesen() {
        var messung = nacht(waermeverlust: 220, aussentemperatur: -5)
        messung.zaehlerNachher = messung.zaehlerVorher - 5
        XCTAssertNil(rechner.ausNacht(messung, normaussentemperatur: -12))
    }

    func testWaermereNachtAlsInnenraumWirdAbgewiesen() {
        let messung = nacht(waermeverlust: 220, aussentemperatur: 22)
        XCTAssertNil(rechner.ausNacht(messung, normaussentemperatur: -12))
    }

    func testLeereEingabe() {
        XCTAssertNil(rechner.ausNaechten([], normaussentemperatur: -12))
    }

    // MARK: Abkühlversuch

    /// Aus der Abkühlkurve folgt die Zeitkonstante – nicht die Heizlast.
    func testZeitkonstanteWirdWiedergefunden() throws {
        let tau = 60.0                     // Stunden
        let aussen = -5.0
        let start = kalender.date(from: DateComponents(year: 2026, month: 1, day: 15, hour: 22))!

        let verlauf = stride(from: 0.0, through: 12.0, by: 2.0).map { stunde in
            (zeit: start.addingTimeInterval(stunde * 3600),
             innentemperatur: aussen + (20 - aussen) * exp(-stunde / tau))
        }

        let e = try XCTUnwrap(Abkuehlmessung.auswerten(
            verlauf: verlauf, aussentemperatur: aussen))

        XCTAssertEqual(e.zeitkonstante, tau, accuracy: 1)
    }

    func testSpeicherfaehigkeitFolgtAusZeitkonstanteUndWaermeverlust() throws {
        let tau = 60.0
        let aussen = -5.0
        let start = kalender.date(from: DateComponents(year: 2026, month: 1, day: 15, hour: 22))!
        let verlauf = stride(from: 0.0, through: 12.0, by: 2.0).map { stunde in
            (zeit: start.addingTimeInterval(stunde * 3600),
             innentemperatur: aussen + (20 - aussen) * exp(-stunde / tau))
        }

        let e = try XCTUnwrap(Abkuehlmessung.auswerten(
            verlauf: verlauf, aussentemperatur: aussen,
            waermeverlustkoeffizient: 220, beheizteFlaeche: 140))

        // C = τ × H = 60 h × 220 W/K = 13.200 Wh/K, also rund 94 Wh/m²K
        XCTAssertEqual(e.speicherfaehigkeit!, 13_200, accuracy: 300)
        XCTAssertEqual(e.jeQuadratmeter!, 94, accuracy: 3)
        XCTAssertEqual(e.bauart, .mittelschwer)
    }

    func testSchweresGebaeudeWirdErkannt() throws {
        let tau = 120.0
        let aussen = 0.0
        let start = kalender.date(from: DateComponents(year: 2026, month: 1, day: 15, hour: 22))!
        let verlauf = stride(from: 0.0, through: 12.0, by: 2.0).map { stunde in
            (zeit: start.addingTimeInterval(stunde * 3600),
             innentemperatur: aussen + 20 * exp(-stunde / tau))
        }

        let e = try XCTUnwrap(Abkuehlmessung.auswerten(
            verlauf: verlauf, aussentemperatur: aussen,
            waermeverlustkoeffizient: 220, beheizteFlaeche: 140))

        XCTAssertEqual(e.bauart, .schwer)
        XCTAssertTrue(e.aussage.contains("Wärmepumpe"))
    }

    func testSteigendeTemperaturWirdAbgewiesen() {
        let start = Date(timeIntervalSince1970: 0)
        let verlauf = [
            (zeit: start, innentemperatur: 18.0),
            (zeit: start.addingTimeInterval(3600), innentemperatur: 19.0),
            (zeit: start.addingTimeInterval(7200), innentemperatur: 20.0)
        ]
        XCTAssertNil(Abkuehlmessung.auswerten(verlauf: verlauf, aussentemperatur: 0))
    }

    func testZuWenigeMesspunkte() {
        let start = Date(timeIntervalSince1970: 0)
        XCTAssertNil(Abkuehlmessung.auswerten(
            verlauf: [(zeit: start, innentemperatur: 20)], aussentemperatur: 0))
    }
}
