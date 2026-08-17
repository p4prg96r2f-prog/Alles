import XCTest
@testable import WerkeKern

/// Der eigentliche Gewinn: Das Aufmaß liefert die Verteilung, die Messung die
/// Summe. Zusammen ergibt das etwas, das keines von beiden allein kann.
final class KalibrierungTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Huellflaechenrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Huellflaechenrechner(regeln: regeln)
    }

    private func signatur(_ waermeverlust: Double, guete: Energiesignatur.Guete = .belastbar) -> Energiesignatur {
        Energiesignatur(
            waermeverlustkoeffizient: waermeverlust,
            grundverbrauchProJahr: 1_500,
            bestimmtheitsmass: guete == .belastbar ? 0.97 : 0.5,
            verwendeteZeitraeume: 18,
            heizlast: Spanne(unten: waermeverlust * 32 / 1000, oben: waermeverlust * 32 / 1000 * 1.15),
            guete: guete,
            annahmen: [],
            hinweis: nil
        )
    }

    private var aufmass: Aufmassergebnis {
        var haus = Gebaeude(baujahr: 1968, wohnflaeche: 120)
        haus.fassade = .ungedaemmt
        let raeume = (1...4).map { i in
            Raum(name: "Raum \(i)", grundflaeche: 30, flaechen: [
                Huellflaeche(art: .aussenwand, quadratmeter: 20, grenze: .aussenluft),
                Huellflaeche(art: .fenster, quadratmeter: 4, grenze: .aussenluft)
            ])
        }
        return rechner.berechne(raeume: raeume, gebaeude: haus, normaussentemperatur: -12)
    }

    func testUebereinstimmungWirdBestaetigt() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(gerechnet), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .bestaetigt)
        XCTAssertEqual(k.kalibrierung.maszstab, 1.0, accuracy: 0.01)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.05)
    }

    /// Der häufigste Fall in der Praxis: Am Haus wurde schon etwas gemacht,
    /// aber niemand hat es hinterlegt.
    func testBesseresHausWirdErkanntUndSkaliert() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(gerechnet * 0.7), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .besserAlsAngenommen)
        XCTAssertTrue(k.kalibrierung.angewendet)
        XCTAssertLessThan(k.gesamtKW, a.gesamtKW)
    }

    func testSchlechteresHausWirdErkannt() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(gerechnet * 1.35), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .schlechterAlsAngenommen)
        XCTAssertGreaterThan(k.gesamtKW, a.gesamtKW)
    }

    /// Nicht zurechtbiegen: Ein Faktor drei ist ein Fehler, keine U-Wert-Streuung.
    func testZuGrosseAbweichungWirdNichtAngewendet() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(gerechnet * 3), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .unstimmig)
        XCTAssertFalse(k.kalibrierung.angewendet)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.001)
    }

    func testUnsichereSignaturWirdNichtVerwendet() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(gerechnet * 0.7, guete: .unsicher), normaussentemperatur: -12)

        XCTAssertFalse(k.kalibrierung.angewendet)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.001)
    }

    /// Die Verteilung auf die Räume bleibt erhalten – nur der Maßstab ändert sich.
    func testVerteilungBleibtErhalten() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32
        let k = rechner.kalibriere(a, mit: signatur(gerechnet * 0.7), normaussentemperatur: -12)

        for (vorher, nachher) in zip(a.raeume, k.raeume) {
            let anteilVorher = vorher.gesamt / a.raeume.reduce(0) { $0 + $1.gesamt }
            let anteilNachher = nachher.gesamt / k.raeume.reduce(0) { $0 + $1.gesamt }
            XCTAssertEqual(anteilVorher, anteilNachher, accuracy: 0.02)
        }
    }

    /// Der Lüftungsanteil hängt am Raumvolumen, nicht an den U-Werten – er darf
    /// nicht mitskaliert werden.
    func testLueftungsanteilWirdNichtSkaliert() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32
        let k = rechner.kalibriere(a, mit: signatur(gerechnet * 0.7), normaussentemperatur: -12)

        XCTAssertEqual(k.raeume[0].lueftung, a.raeume[0].lueftung, accuracy: 0.01)
        XCTAssertLessThan(k.raeume[0].transmission, a.raeume[0].transmission)
    }

    func testJedeBeurteilungHatEineVerstaendlicheAussage() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        for faktor in [0.3, 0.7, 1.0, 1.35, 3.0] {
            let k = rechner.kalibriere(a, mit: signatur(gerechnet * faktor), normaussentemperatur: -12)
            XCTAssertFalse(k.kalibrierung.aussage.isEmpty, "bei Faktor \(faktor)")
            XCTAssertGreaterThan(k.kalibrierung.aussage.count, 40, "bei Faktor \(faktor)")
        }
    }
}
