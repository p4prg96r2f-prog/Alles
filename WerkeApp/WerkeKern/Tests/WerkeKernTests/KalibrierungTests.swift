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

    /// Erzeugt eine Energiesignatur, die zu einem gewünschten **Auslegungs**-
    /// Wärmeverlust gehört.
    ///
    /// Der Umweg ist Absicht: Gemessen wird der wirksame Wert über die
    /// Heizperiode, und der liegt um den Auslegungszuschlag darunter. Würden
    /// die Tests den Auslegungswert direkt als Messwert einsetzen, prüften sie
    /// genau die Verwechslung, die hier verhindert werden soll.
    private func signatur(auslegung: Double, guete: Energiesignatur.Guete = .belastbar) -> Energiesignatur {
        let gemessen = auslegung / Energiesignatur.auslegungszuschlag
        return Energiesignatur(
            waermeverlustkoeffizient: gemessen,
            grundverbrauchProJahr: 1_500,
            bestimmtheitsmass: guete == .belastbar ? 0.97 : 0.5,
            verwendeteZeitraeume: 18,
            heizlast: Spanne(
                unten: gemessen * 32 / 1000,
                oben: gemessen * 32 / 1000 * Energiesignatur.auslegungszuschlag
            ),
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

        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .bestaetigt)
        XCTAssertEqual(k.kalibrierung.maszstab, 1.0, accuracy: 0.01)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.05)
    }

    /// Der häufigste Fall in der Praxis: Am Haus wurde schon etwas gemacht,
    /// aber niemand hat es hinterlegt.
    func testBesseresHausWirdErkanntUndSkaliert() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * 0.7), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .besserAlsAngenommen)
        XCTAssertTrue(k.kalibrierung.angewendet)
        XCTAssertLessThan(k.gesamtKW, a.gesamtKW)
    }

    func testSchlechteresHausWirdErkannt() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * 1.35), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .schlechterAlsAngenommen)
        XCTAssertGreaterThan(k.gesamtKW, a.gesamtKW)
    }

    /// Nicht zurechtbiegen: Ein Faktor drei ist ein Fehler, keine U-Wert-Streuung.
    func testZuGrosseAbweichungWirdNichtAngewendet() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * 3), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .unstimmig)
        XCTAssertFalse(k.kalibrierung.angewendet)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.001)
    }

    func testUnsichereSignaturWirdNichtVerwendet() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * 0.7, guete: .unsicher), normaussentemperatur: -12)

        XCTAssertFalse(k.kalibrierung.angewendet)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.001)
    }

    /// Die Verteilung auf die Räume bleibt erhalten – nur der Maßstab ändert sich.
    func testVerteilungBleibtErhalten() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32
        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * 0.7), normaussentemperatur: -12)

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
        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * 0.7), normaussentemperatur: -12)

        XCTAssertEqual(k.raeume[0].lueftung, a.raeume[0].lueftung, accuracy: 0.01)
        XCTAssertLessThan(k.raeume[0].transmission, a.raeume[0].transmission)
    }

    func testJedeBeurteilungHatEineVerstaendlicheAussage() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        for faktor in [0.3, 0.7, 1.0, 1.35, 3.0] {
            let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet * faktor), normaussentemperatur: -12)
            XCTAssertFalse(k.kalibrierung.aussage.isEmpty, "bei Faktor \(faktor)")
            XCTAssertGreaterThan(k.kalibrierung.aussage.count, 40, "bei Faktor \(faktor)")
        }
    }
    /// Der Kern des Ganzen: Heizperiodenwert und Auslegungswert sind nicht
    /// dieselbe Größe. Wer die Steigung der Energiesignatur direkt gegen das
    /// Aufmaß stellt, bekommt für ein völlig normales Haus „besser als
    /// angenommen“ und rechnet die Heizlast um ein Fünftel klein.
    func testHeizperiodenwertWirdVorDemAbgleichAufAuslegungGebracht() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32

        // Eine Signatur, deren *gemessene* Steigung genau dem gerechneten
        // Auslegungswert entspricht – das Haus ist also in Wahrheit schlechter.
        let roh = Energiesignatur(
            waermeverlustkoeffizient: gerechnet,
            grundverbrauchProJahr: 1_500,
            bestimmtheitsmass: 0.97,
            verwendeteZeitraeume: 18,
            heizlast: Spanne(unten: gerechnet * 32 / 1000, oben: gerechnet * 32 / 1000),
            guete: .belastbar,
            annahmen: [],
            hinweis: nil
        )

        XCTAssertEqual(roh.waermeverlustkoeffizientAuslegung,
                       gerechnet * Energiesignatur.auslegungszuschlag, accuracy: 0.001)

        let k = rechner.kalibriere(a, mit: roh, normaussentemperatur: -12)
        XCTAssertGreaterThan(k.kalibrierung.maszstab, 1.0)
        XCTAssertEqual(k.kalibrierung.beurteilung, .schlechterAlsAngenommen)
    }

    /// Und die Gegenprobe: Eine Signatur, die zum gerechneten Haus passt, muss
    /// bestätigt werden – nicht als „besser als angenommen“ durchgehen.
    func testPassendeSignaturWirdBestaetigtStattSchoengerechnet() {
        let a = aufmass
        let gerechnet = a.gesamtKW * 1000 / 32
        let k = rechner.kalibriere(a, mit: signatur(auslegung: gerechnet), normaussentemperatur: -12)

        XCTAssertEqual(k.kalibrierung.beurteilung, .bestaetigt)
        XCTAssertEqual(k.gesamtKW, a.gesamtKW, accuracy: 0.05)
    }

}
