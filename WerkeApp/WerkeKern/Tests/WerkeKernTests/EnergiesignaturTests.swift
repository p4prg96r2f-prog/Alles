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
        // Sommermonate werden verworfen – dort wird gar nicht geheizt.
        XCTAssertGreaterThan(signatur.verwendeteZeitraeume, 10)
        XCTAssertLessThan(signatur.verwendeteZeitraeume, 20)
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

        // Der unmögliche Zeitraum wird verworfen, der Rest bleibt brauchbar.
        XCTAssertGreaterThan(signatur.verwendeteZeitraeume, 10)
        XCTAssertEqual(signatur.waermeverlustkoeffizient, 200, accuracy: 5)
    }

    func testFalscheZaehlerartWirdIgnoriert() {
        let gas = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        let strom = gas.map { Zaehlerstand(art: .strom, wert: $0.wert, datum: $0.datum) }

        XCTAssertNil(rechner.ausZaehlerstaenden(strom, art: .gas, region: region))
        XCTAssertNotNil(rechner.ausZaehlerstaenden(gas, art: .gas, region: region))
    }

    /// Der entscheidende Fall: Im Sommer wird **gar nicht** geheizt, es läuft
    /// nur Warmwasser. Nimmt man diese Monate in die Ausgleichsrechnung, drückt
    /// der Warmwasserverbrauch die Steigung und der Wärmeverlust fällt um rund
    /// ein Viertel zu klein aus.
    func testSommerOhneHeizungVerfaelschtDasErgebnisNicht() throws {
        let waermeverlust = 300.0
        let grundlastProTag = 5.0
        let nutzungsgrad = 0.75
        let steigung = waermeverlust * 24 / 1000 / nutzungsgrad

        var staende: [Zaehlerstand] = []
        var zaehler = 10_000.0
        var datum = kalender.date(from: DateComponents(year: 2024, month: 10, day: 1))!
        staende.append(Zaehlerstand(art: .gas, wert: zaehler, datum: datum))

        for _ in 0..<24 {
            let naechstes = kalender.date(byAdding: .month, value: 1, to: datum)!
            let tage = naechstes.timeIntervalSince(datum) / 86_400
            let gradtage = Klimarechnung.gradtagzahl(von: datum, bis: naechstes, region: region)

            // Unterhalb der Heizgrenze bleibt der Kessel aus – es läuft nur
            // Warmwasser. Die Schwelle ist dieselbe, an der die App die
            // Heizperiode abgrenzt: Beides ist derselbe physikalische Begriff,
            // einmal aus Sicht des Hauses, einmal aus Sicht der Auswertung.
            let heizt = gradtage / tage >= Heizlastrechner.heizperiodenschwelle
            let kwh = grundlastProTag * tage + (heizt ? steigung * gradtage : 0)
            zaehler += kwh / regeln.heizlast.brennwertGasProKubikmeter
            datum = naechstes
            staende.append(Zaehlerstand(art: .gas, wert: zaehler.rounded(), datum: datum))
        }

        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(staende, region: region))
        XCTAssertEqual(signatur.waermeverlustkoeffizient, waermeverlust, accuracy: 12)

        // Und der Filter hat wirklich gearbeitet: Von 24 Zeiträumen bleibt nur
        // die Heizperiode übrig. Ohne diese Prüfung würde der Test auch dann
        // grün, wenn die Sommermonate gar nicht erst aussortiert würden.
        XCTAssertLessThan(signatur.verwendeteZeitraeume, 20)
        XCTAssertGreaterThanOrEqual(signatur.verwendeteZeitraeume, 12)
    }

    func testVerworfeneZeitraeumeWerdenBenannt() throws {
        let daten = staende(waermeverlust: 200, grundlastProTag: 4, monate: 24)
        let signatur = try XCTUnwrap(rechner.ausZaehlerstaenden(daten, region: region))

        XCTAssertTrue(signatur.annahmen.contains { $0.bezeichnung.contains("Heizperiode") })
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

    /// Köln und Düsseldorf liegen im mildesten Winterklima Deutschlands. Sie
    /// mit −12 °C auszulegen – wie Ostwestfalen – macht jede Wärmepumpe im
    /// Rheinland um rund ein Zehntel zu groß.
    func testRheinlandWirdMilderAusgelegtAlsOstwestfalen() throws {
        let koeln = try XCTUnwrap(regeln.klimaregion(fuerPLZ: "50667"))
        let duesseldorf = try XCTUnwrap(regeln.klimaregion(fuerPLZ: "40213"))
        let paderborn = try XCTUnwrap(regeln.klimaregion(fuerPLZ: "33102"))

        XCTAssertEqual(koeln.name, "Rheinland und Niederrhein")
        XCTAssertEqual(duesseldorf.name, koeln.name)
        XCTAssertEqual(koeln.normaussentemperatur, -10)
        XCTAssertGreaterThan(koeln.normaussentemperatur, paderborn.normaussentemperatur)
        XCTAssertLessThan(koeln.jahressumme, paderborn.jahressumme)
    }

    /// Im Hochsommer wird nicht geheizt. Stehen dort zweistellige Gradtagzahlen
    /// je Tag in der Tabelle, rutschen Sommermonate durch den Filter der
    /// Heizperiode – und verderben die Ausgleichsrechnung.
    func testSommermonateLiegenUnterDerHeizgrenze() {
        for r in regeln.klimaregionen {
            let juli = r.gradtagzahlen[6] / 31
            let august = r.gradtagzahlen[7] / 31
            XCTAssertLessThan(juli, Heizlastrechner.heizperiodenschwelle, r.name)
            XCTAssertLessThan(august, Heizlastrechner.heizperiodenschwelle, r.name)
            // Januar dagegen muss deutlich darüber liegen.
            XCTAssertGreaterThan(r.gradtagzahlen[0] / 31, 10, r.name)
        }
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
