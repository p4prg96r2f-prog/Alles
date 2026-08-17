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
        // Der Zähler sieht die Endenergie. Die inneren Gewinne heizen mit, die
        // Warmwasser-Bereitschaft läuft zusätzlich – beides muss die
        // Auswertung wieder herausrechnen.
        let nutzwaerme = (waermeverlust * delta
                          - Heizlastrechner.naechtlicheGewinneWatt
                          + Heizlastrechner.naechtlicheGrundlastWatt) * stunden / 1000
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

    func testInnereGewinneUndGrundlastWerdenHerausgerechnet() throws {
        // Ohne beide Korrekturen käme ein falscher Wärmeverlust heraus.
        let e = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 150, aussentemperatur: -10), normaussentemperatur: -12))

        XCTAssertEqual(e.waermeverlustkoeffizient, 150, accuracy: 2)
        XCTAssertTrue(e.annahmen.contains { $0.bezeichnung == "Grundlast" })
    }

    /// Die Grundlast darf nicht als Wärmeverlust gedeutet und auf die
    /// Auslegungsdifferenz hochgerechnet werden.
    func testGrundlastWirdNichtAlsWaermeverlustGedeutet() throws {
        let ohneKorrektur = 220.0 + Heizlastrechner.naechtlicheGrundlastWatt / 25.0
        let e = try XCTUnwrap(rechner.ausNacht(
            nacht(waermeverlust: 220, aussentemperatur: -5), normaussentemperatur: -12))

        XCTAssertLessThan(e.waermeverlustkoeffizient, ohneKorrektur - 5)
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

    /// Ohne Wärmeverlust gibt es keine Speicherfähigkeit je Quadratmeter – dann
    /// bleibt nur die Zeitkonstante in **Stunden**. Sie darf nicht gegen
    /// Schwellen in Wh/(m²K) geprüft werden: 50 Stunden wären damit „leicht“,
    /// obwohl 50 Stunden bereits ein schweres Haus beschreiben.
    func testOhneWaermeverlustEntscheidetDieZeitkonstanteInStunden() throws {
        let aussen = 0.0
        let start = kalender.date(from: DateComponents(year: 2026, month: 1, day: 15, hour: 22))!

        func ergebnis(tau: Double) throws -> Abkuehlmessung.Ergebnis {
            let verlauf = stride(from: 0.0, through: 12.0, by: 2.0).map { stunde in
                (zeit: start.addingTimeInterval(stunde * 3600),
                 innentemperatur: aussen + 20 * exp(-stunde / tau))
            }
            return try XCTUnwrap(Abkuehlmessung.auswerten(verlauf: verlauf, aussentemperatur: aussen))
        }

        XCTAssertNil(try ergebnis(tau: 25).speicherfaehigkeit)
        XCTAssertEqual(try ergebnis(tau: 25).bauart, .leicht)
        XCTAssertEqual(try ergebnis(tau: 60).bauart, .mittelschwer)
        XCTAssertEqual(try ergebnis(tau: 150).bauart, .schwer)
    }

    // MARK: Innere Gewinne

    /// Die nächtlichen Gewinne wachsen mit dem Gebäude: In einem Haus mit 250
    /// Quadratmetern schlafen im Mittel mehr Menschen als in einer Wohnung mit
    /// 70. Ein fester Betrag würde große Gebäude zu schlecht rechnen.
    func testInnereGewinneWachsenMitDerGebaeudegroesse() {
        let klein = Heizlastrechner.naechtlicheGewinne(beheizteFlaeche: 70)
        let mittel = Heizlastrechner.naechtlicheGewinne(beheizteFlaeche: 140)
        let gross = Heizlastrechner.naechtlicheGewinne(beheizteFlaeche: 250)

        XCTAssertLessThan(klein, mittel)
        XCTAssertLessThan(mittel, gross)
        // Der Pauschalwert entspricht einem Haus mit 140 m².
        XCTAssertEqual(mittel, Heizlastrechner.naechtlicheGewinneWatt, accuracy: 0.001)
        // Ohne Angabe bleibt es beim Pauschalwert.
        XCTAssertEqual(Heizlastrechner.naechtlicheGewinne(beheizteFlaeche: nil),
                       Heizlastrechner.naechtlicheGewinneWatt)
    }

    /// Werden mehr Gewinne angerechnet, muss der ermittelte Wärmeverlust
    /// steigen – die Heizung hat dann weniger von der Wärme geliefert.
    func testGroesseresGebaeudeErgibtHoeherenWaermeverlust() throws {
        let messung = nacht(waermeverlust: 220, aussentemperatur: -5)

        let ohne = try XCTUnwrap(rechner.ausNacht(messung, normaussentemperatur: -12))
        let mit = try XCTUnwrap(rechner.ausNacht(messung, normaussentemperatur: -12,
                                                 beheizteFlaeche: 250))

        XCTAssertGreaterThan(mit.waermeverlustkoeffizient, ohne.waermeverlustkoeffizient)
        XCTAssertTrue(mit.annahmen.contains { $0.bezeichnung == "Innere Gewinne" && $0.wert.hasPrefix("205") })
    }

    /// Drei gleich kalte Nächte legen keine Gerade fest. Dann darf in den
    /// Annahmen auch nicht „Ausgleichsgerade“ stehen.
    func testDreiGleichKalteNaechteHeissenNichtAusgleichsgerade() throws {
        let messungen = (0..<3).map { nacht(waermeverlust: 220, aussentemperatur: -5, tag: 10 + $0) }
        let e = try XCTUnwrap(rechner.ausNaechten(messungen, normaussentemperatur: -12))

        let verfahren = try XCTUnwrap(e.annahmen.first { $0.bezeichnung == "Verfahren" })
        XCTAssertTrue(verfahren.wert.contains("Direktmessung"), verfahren.wert)
        XCTAssertTrue(e.annahmen.contains { $0.bezeichnung == "Grundlast" && $0.wert.contains("angenommen") })
    }
}
