import XCTest
@testable import WerkeKern

/// Die Energiesignatur wird gegen künstliche Datensätze geprüft, bei denen der
/// wahre Wärmeverlustkoeffizient bekannt ist. Nur so lässt sich sagen, ob das
/// Verfahren wirklich rechnet – und nicht bloß irgendeine Zahl liefert.
final class EnergiesignaturTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Heizlastrechner!
    var region: Klimaregion!
    let kalender = Calendar(identifier: .gregorian)

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Heizlastrechner(regeln: regeln)
        region = try XCTUnwrap(regeln.klimaregion(fuerPLZ: "33102"))
    }

    // MARK: Erzeugen künstlicher Ablesungen

    /// Baut Zählerstände, die exakt einem Gebäude mit bekanntem Wärmeverlust
    /// entsprechen – auf Wunsch mit Streuung.
    private func staende(
        waermeverlust: Double,          // W/K
        grundlastProTag: Double,        // kWh/d Endenergie
        monate: Int,
        nutzungsgrad: Double = 0.75,
        streuung: Double = 0,
        ab: DateComponents = DateComponents(year: 2024, month: 10, day: 1)
    ) -> [Zaehlerstand] {

        let steigungEndenergie = waermeverlust * 24 / 1000 / nutzungsgrad   // kWh je Kelvintag
        var ergebnis: [Zaehlerstand] = []
        var zaehler = 10_000.0
        var datum = kalender.date(from: ab)!
        ergebnis.append(Zaehlerstand(art: .gas, wert: zaehler, datum: datum))

        // Feste Pseudozufallsfolge, damit der Test reproduzierbar bleibt.
        var keim = 12_345.0
        func stoerung() -> Double {
            keim = (keim * 1103.0 + 12_345.0).truncatingRemainder(dividingBy: 65_536.0)
            return (keim / 65_536.0 - 0.5) * 2 * streuung
        }

        for _ in 0..<monate {
            let naechstes = kalender.date(byAdding: .month, value: 1, to: datum)!
            let tage = naechstes.timeIntervalSince(datum) / 86_400
            let gradtage = Klimarechnung.gradtagzahl(von: datum, bis: naechstes, region: region)

            let kwh = grundlastProTag * tage + steigungEndenergie * gradtage
            let m3 = kwh / regeln.heizlast.brennwertGasProKubikmeter
            zaehler += m3 * (1 + stoerung())

            datum = naechstes
            ergebnis.append(Zaehlerstand(art: .gas, wert: zaehler.rounded(), datum: datum))
        }
        return ergebnis
    }

    // MARK: Rückgewinnung bekannter Werte

    func testWaermeverlustWirdWiedergefunden() throws {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(daten, region: region))

        XCTAssertEqual(signatur.waermeverlustkoeffizient, 200, accuracy: 3)
        XCTAssertEqual(signatur.verwendeteZeitraeume, 24)
        XCTAssertGreaterThan(signatur.bestimmtheitsmass, 0.99)
        XCTAssertEqual(signatur.guete, .belastbar)
    }

    func testHeizlastFolgtAusWaermeverlustUndNormtemperatur() throws {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(daten, region: region))

        // 200 W/K × (20 − (−12)) K = 6,4 kW
        XCTAssertEqual(signatur.heizlast.unten, 6.4, accuracy: 0.15)
        // Nach oben ein Zuschlag, weil am Auslegungstag die solaren und inneren
        // Gewinne wegfallen.
        XCTAssertGreaterThan(signatur.heizlast.oben, signatur.heizlast.unten)
    }

    /// Der eigentliche Fortschritt: Der Warmwasseranteil wird nicht geschätzt,
    /// sondern fällt aus der Rechnung.
    func testWarmwasserWirdErmitteltStattGeschaetzt() throws {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(daten, region: region))

        XCTAssertEqual(signatur.grundverbrauchProJahr, 4 * 365, accuracy: 60)
    }

    func testAndererWaermeverlustAndereHeizlast() throws {
        let schlecht = try XCTUnwrap(rechner.ausZaehlerstaenden(
            staende(waermeverlust: 400, grundlastProTag: 4, monate: 24), region: region))
        let gut = try XCTUnwrap(rechner.ausZaehlerstaenden(
            staende(waermeverlust: 90, grundlastProTag: 4, monate: 24), region: region))

        XCTAssertEqual(schlecht.waermeverlustkoeffizient, 400, accuracy: 6)
        XCTAssertEqual(gut.waermeverlustkoeffizient, 90, accuracy: 3)
        XCTAssertGreaterThan(schlecht.heizlast.unten, gut.heizlast.unten * 3)
    }

    func testBrennwertkesselWirdBeruecksichtigt() throws {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24, nutzungsgrad: 0.92)
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(
            daten, kesselart: .brennwert, region: region))

        XCTAssertEqual(signatur.waermeverlustkoeffizient, 200, accuracy: 4)
    }

    // MARK: Güte

    func testStreuendeDatenSenkenDieGuete() throws {
        let sauber = try XCTUnwrap(rechner.ausZaehlerstaenden(
            staende(waermeverlust: 200, grundlastProTag: 4, monate: 24), region: region))
        let unruhig = try XCTUnwrap(rechner.ausZaehlerstaenden(
            staende(waermeverlust: 200, grundlastProTag: 4, monate: 24, streuung: 0.45), region: region))

        XCTAssertLessThan(unruhig.bestimmtheitsmass, sauber.bestimmtheitsmass)
    }

    func testWenigeZeitraeumeErgebenHoechstensBrauchbar() throws {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 5)
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(daten, region: region))

        XCTAssertNotEqual(signatur.guete, .belastbar)
        XCTAssertNotNil(signatur.hinweis)
    }

    // MARK: Kein Ergebnis ist besser als ein schlechtes

    func testZuWenigeAblesungenErgebenNichts() {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 2)
        XCTAssertNil(rechner.ausZaehlerstaenden(daten, region: region))
    }

    func testLeereEingabe() {
        XCTAssertNil(rechner.ausZaehlerstaenden([], region: region))
    }

    func testRueckwaertslaufenderZaehlerWirdUebersprungen() throws {
        var daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        // Zählerwechsel in der Mitte: Der Stand fängt wieder bei null an.
        for i in 12..<daten.count {
            daten[i] = Zaehlerstand(art: .gas, wert: daten[i].wert - 9_000, datum: daten[i].datum)
        }
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(daten, region: region))

        // Der eine unmögliche Zeitraum wird verworfen, der Rest bleibt brauchbar.
        XCTAssertEqual(signatur.verwendeteZeitraeume, 23)
        XCTAssertEqual(signatur.waermeverlustkoeffizient, 200, accuracy: 5)
    }

    func testFalscheZaehlerartWirdIgnoriert() {
        let gas = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        let strom = gas.map { Zaehlerstand(art: .strom, wert: $0.wert, datum: $0.datum) }

        XCTAssertNil(rechner.ausZaehlerstaenden(strom, art: .gas, region: region))
        XCTAssertNotNil(rechner.ausZaehlerstaenden(gas, art: .gas, region: region))
    }

    // MARK: Gradtagzahlen und Regionen

    func testGradtagzahlEinesJahresEntsprichtDerJahressumme() {
        let von = kalender.date(from: DateComponents(year: 2025, month: 1, day: 1))!
        let bis = kalender.date(from: DateComponents(year: 2026, month: 1, day: 1))!

        XCTAssertEqual(
            Klimarechnung.gradtagzahl(von: von, bis: bis, region: region),
            region.jahressumme, accuracy: 1
        )
    }

    func testWinterHatMehrGradtageAlsSommer() {
        let januar = Klimarechnung.gradtagzahl(
            von: kalender.date(from: DateComponents(year: 2025, month: 1, day: 1))!,
            bis: kalender.date(from: DateComponents(year: 2025, month: 2, day: 1))!,
            region: region)
        let juli = Klimarechnung.gradtagzahl(
            von: kalender.date(from: DateComponents(year: 2025, month: 7, day: 1))!,
            bis: kalender.date(from: DateComponents(year: 2025, month: 8, day: 1))!,
            region: region)

        XCTAssertGreaterThan(januar, juli * 10)
    }

    func testAblesetagSpieltKeineRolle() {
        // Zwei gleich lange Zeiträume im selben Monat müssen sehr ähnlich sein.
        let a = Klimarechnung.gradtagzahl(
            von: kalender.date(from: DateComponents(year: 2025, month: 1, day: 3))!,
            bis: kalender.date(from: DateComponents(year: 2025, month: 2, day: 3))!,
            region: region)
        let b = Klimarechnung.gradtagzahl(
            von: kalender.date(from: DateComponents(year: 2025, month: 1, day: 27))!,
            bis: kalender.date(from: DateComponents(year: 2025, month: 2, day: 27))!,
            region: region)

        XCTAssertEqual(a, b, accuracy: 90)
    }

    func testRegionNachPostleitzahl() throws {
        XCTAssertEqual(regeln.klimaregion(fuerPLZ: "33102")?.name, "Westliches Binnenland")
        XCTAssertEqual(regeln.klimaregion(fuerPLZ: "22765")?.name, "Nordwesten, küstennah")
        XCTAssertEqual(regeln.klimaregion(fuerPLZ: "80331")?.name, "Süddeutschland und Höhenlagen")
        XCTAssertEqual(regeln.klimaregion(fuerPLZ: "10115")?.name, "Ostdeutsches Binnenland")
    }

    func testUnbekannteOderLeerePLZErgibtDenMittelwert() {
        XCTAssertEqual(regeln.klimaregion(fuerPLZ: "")?.name, "Bundesweiter Mittelwert")
        XCTAssertEqual(regeln.klimaregion(fuerPLZ: "abc")?.name, "Bundesweiter Mittelwert")
    }

    func testJedeRegionHatZwoelfMonatswerte() {
        for r in regeln.klimaregionen {
            XCTAssertEqual(r.gradtagzahlen.count, 12, r.name)
            XCTAssertGreaterThan(r.jahressumme, 2_000, r.name)
            XCTAssertLessThan(r.jahressumme, 5_000, r.name)
            XCTAssertLessThan(r.normaussentemperatur, 0, r.name)
        }
    }
}
