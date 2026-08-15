import XCTest
@testable import WerkeKern

/// Die Formatierung wird bewusst exakt geprüft. Sie ist plattformunabhängig
/// selbst gerechnet – ein zugekaufter Formatierer hat sich hier bereits als
/// unzuverlässig erwiesen.
final class ZahlformatTests: XCTestCase {

    func testGanzeZahlenMitTausendertrenner() {
        XCTAssertEqual(Formate.zahl(0), "0")
        XCTAssertEqual(Formate.zahl(7), "7")
        XCTAssertEqual(Formate.zahl(999), "999")
        XCTAssertEqual(Formate.zahl(1_000), "1.000")
        XCTAssertEqual(Formate.zahl(31_600), "31.600")
        XCTAssertEqual(Formate.zahl(1_234_567), "1.234.567")
    }

    func testRundungAufGanzeZahlen() {
        XCTAssertEqual(Formate.zahl(2_846.7), "2.847")
        XCTAssertEqual(Formate.zahl(2_846.4), "2.846")
    }

    func testEineNachkommastelle() {
        XCTAssertEqual(Formate.zahl(7.35, stellen: 1), "7,4")
        XCTAssertEqual(Formate.zahl(7.0, stellen: 1), "7,0")
        XCTAssertEqual(Formate.zahl(17.099, stellen: 1), "17,1")
        XCTAssertEqual(Formate.zahl(5.005, stellen: 1), "5,0")
    }

    func testNachkommastelleWirdAufgefuellt() {
        XCTAssertEqual(Formate.zahl(12.04, stellen: 2), "12,04")
        XCTAssertEqual(Formate.zahl(12.4, stellen: 2), "12,40")
    }

    /// Der Übertrag von der Nachkommastelle in die Ganzzahl muss stimmen.
    func testUebertragBeimRunden() {
        XCTAssertEqual(Formate.zahl(9.96, stellen: 1), "10,0")
        XCTAssertEqual(Formate.zahl(999.96, stellen: 1), "1.000,0")
    }

    func testNegativeWerte() {
        XCTAssertEqual(Formate.zahl(-1_500), "−1.500")
    }

    func testUnendlichUndUngueltig() {
        XCTAssertEqual(Formate.zahl(.infinity), "–")
        XCTAssertEqual(Formate.zahl(.nan), "–")
        XCTAssertEqual(Formate.zahl(1e19), "–")
    }

    func testEuro() {
        XCTAssertEqual(Formate.euro(31_600), "31.600 €")
        XCTAssertEqual(Formate.euro(0), "0 €")
        XCTAssertEqual(Formate.euro(1_499.5, nachkommastellen: 2), "1.499,50 €")
    }

    func testEuroSpanne() {
        XCTAssertEqual(
            Formate.euroSpanne(Spanne(unten: 28_400, oben: 34_900)),
            "28.400 – 34.900 €"
        )
    }

    func testKilowatt() {
        XCTAssertEqual(Formate.kilowatt(7.351), "7,4 kW")
        XCTAssertEqual(
            Formate.kilowattSpanne(Spanne(unten: 6.786, oben: 7.917)),
            "6,8 – 7,9 kW"
        )
    }

    func testProzent() {
        XCTAssertEqual(Formate.prozent(0.15), "15 %")
        XCTAssertEqual(Formate.prozent(0.70), "70 %")
        XCTAssertEqual(Formate.prozent(0.0), "0 %")
        XCTAssertEqual(Formate.prozent(0.511), "51,1 %")
        XCTAssertEqual(Formate.prozent(0.055), "5,5 %")
    }

    func testDatum() {
        XCTAssertEqual(Formate.datumLesbar("2026-07-21"), "21.07.2026")
        XCTAssertEqual(Formate.datumLesbar("unsinn"), "unsinn")
    }

    /// Die Ausgabe darf nicht davon abhängen, welche Sprache das Gerät hat.
    func testFormatIstUnabhaengigVonDerGeraeteSprache() {
        // Es wird kein NumberFormatter und keine Locale verwendet – der Test
        // hält diese Eigenschaft fest.
        XCTAssertEqual(Formate.euro(1_234_567.89), "1.234.568 €")
    }
}
