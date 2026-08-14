import XCTest
@testable import WerkeKern

final class ZaehlerablesungTests: XCTestCase {

    // MARK: Zählerstand aus erkanntem Text

    func testEinfacherZaehlerstand() {
        XCTAssertEqual(Zaehlerablesung.zaehlerstand(ausTexten: ["24781"]), 24781.0)
    }

    func testZaehlerstandMitKomma() {
        XCTAssertEqual(Zaehlerablesung.zaehlerstand(ausTexten: ["24781,3"]), 24781.3)
    }

    func testZaehlerstandMitPunkt() {
        XCTAssertEqual(Zaehlerablesung.zaehlerstand(ausTexten: ["24781.3"]), 24781.3)
    }

    /// Der häufigste Praxisfall: Auf dem Zähler steht neben dem Zählwerk auch
    /// die Zählernummer. Gewinnen muss das Zählwerk.
    func testLaengsterFundGewinnt() {
        let texte = ["Nr. 123", "24781,3", "m3", "Baujahr 2004"]
        XCTAssertEqual(Zaehlerablesung.zaehlerstand(ausTexten: texte), 24781.3)
    }

    func testTextMitEinheitWirdBereinigt() {
        XCTAssertEqual(Zaehlerablesung.zaehlerstand(ausTexten: ["24781 m³"]), 24781.0)
    }

    func testZuKurzeZahlenWerdenIgnoriert() {
        XCTAssertNil(Zaehlerablesung.zaehlerstand(ausTexten: ["12", "345", "kWh"]))
    }

    func testReinerTextErgibtNichts() {
        XCTAssertNil(Zaehlerablesung.zaehlerstand(ausTexten: ["Gaszähler", "Bitte ablesen"]))
    }

    func testLeereEingabe() {
        XCTAssertNil(Zaehlerablesung.zaehlerstand(ausTexten: []))
        XCTAssertNil(Zaehlerablesung.zaehlerstand(ausTexten: [""]))
    }

    func testNurEineNachkommastelleWirdUebernommen() {
        XCTAssertEqual(Zaehlerablesung.zaehlerstand(ausTexten: ["24781,347"]), 24781.3)
    }

    // MARK: Plausibilität

    func testErsterWertIstImmerPlausibel() {
        XCTAssertEqual(Zaehlerablesung.pruefe(neu: 24781, letzter: nil), .inOrdnung)
    }

    func testNormalerAnstiegIstPlausibel() {
        XCTAssertEqual(Zaehlerablesung.pruefe(neu: 24900, letzter: 24781), .inOrdnung)
    }

    func testRueckwaertsWirdErkannt() {
        XCTAssertEqual(Zaehlerablesung.pruefe(neu: 24000, letzter: 24781), .rueckwaerts)
        XCTAssertNotNil(Zaehlerablesung.Plausibilitaet.rueckwaerts.hinweis)
    }

    func testUngewoehnlicherSprungWirdErkannt() {
        XCTAssertEqual(Zaehlerablesung.pruefe(neu: 50000, letzter: 24781), .ungewoehnlicherSprung)
    }

    func testKleineZaehlerstaendeLoesenKeineSprungwarnungAus() {
        // Bei sehr kleinen Ausgangswerten sind große relative Sprünge normal.
        XCTAssertEqual(Zaehlerablesung.pruefe(neu: 90, letzter: 50), .inOrdnung)
    }

    // MARK: Typenschild

    func testHerstellerWirdErkannt() {
        let (hersteller, _) = Zaehlerablesung.heizungsangaben(
            ausTexten: ["VIESSMANN", "Vitodens 200", "2004"], aktuellesJahr: 2026
        )
        XCTAssertEqual(hersteller, "Viessmann")
    }

    func testBaujahrWirdErkannt() {
        let (_, baujahr) = Zaehlerablesung.heizungsangaben(
            ausTexten: ["Buderus", "Logamax", "Baujahr 2004"], aktuellesJahr: 2026
        )
        XCTAssertEqual(baujahr, 2004)
    }

    func testUnplausiblesJahrWirdVerworfen() {
        let (_, baujahr) = Zaehlerablesung.heizungsangaben(
            ausTexten: ["Typ 1234", "Serie 9999"], aktuellesJahr: 2026
        )
        XCTAssertNil(baujahr)
    }

    func testUnbekanntesTypenschildErgibtNichts() {
        let (hersteller, baujahr) = Zaehlerablesung.heizungsangaben(
            ausTexten: ["unleserlich"], aktuellesJahr: 2026
        )
        XCTAssertNil(hersteller)
        XCTAssertNil(baujahr)
    }
}
