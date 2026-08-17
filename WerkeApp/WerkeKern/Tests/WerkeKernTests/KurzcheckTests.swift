import XCTest
@testable import WerkeKern

/// Der Kurzcheck von außen: fünf Angaben, ehrliche Spanne, und ein
/// Fehlermodell, das ausrechnet, welche Angabe als Nächstes am meisten bringt.
final class KurzcheckTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Huellflaechenrechner!
    let normaussen = -12.0

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Huellflaechenrechner(regeln: regeln)
    }

    private var typischerAltbau: Kurzcheck {
        Kurzcheck(
            seitenlaengeSchritte: 14,
            geschosse: .zweiVollgeschosse,
            anbausituation: .freistehend,
            epoche: .nachkrieg,
            fassadenbild: .keineDaemmungErkennbar
        )
    }

    // MARK: Größe aus Schritten

    func testSchritteWerdenZuGrundflaecheUndUmfang() {
        // 14 Schritte à 0,75 m = 10,5 m Länge, Breite 7,875 m
        let huelle = rechner.huelleAus(typischerAltbau)

        XCTAssertEqual(huelle.grundflaeche, 10.5 * 7.875, accuracy: 0.1)
        XCTAssertEqual(huelle.geschaetzterUmfang, 2 * (10.5 + 7.875), accuracy: 0.1)
    }

    func testDirekteFlaecheSchlaegtDieSchritte() {
        var check = typischerAltbau
        check.grundflaecheDirekt = 120

        XCTAssertEqual(rechner.huelleAus(check).grundflaeche, 120)
    }

    func testEigeneSchrittlaenge() {
        var check = typischerAltbau
        check.schrittlaengeMeter = 0.85

        let laenge = 14 * 0.85
        XCTAssertEqual(rechner.huelleAus(check).grundflaeche, laenge * laenge * 0.75, accuracy: 0.2)
    }

    func testUnsinnigeSchrittlaengeWirdEingefangen() {
        XCTAssertEqual(Kurzcheck(schrittlaengeMeter: 0.05).schrittlaengeMeter, 0.4)
        XCTAssertEqual(Kurzcheck(schrittlaengeMeter: 9).schrittlaengeMeter, 1.2)
    }

    func testOhneJedeGroessenangabeGibtEsEinenRueckfallwert() {
        let leer = Kurzcheck()
        XCTAssertEqual(rechner.huelleAus(leer).grundflaeche, 100)
        XCTAssertGreaterThan(rechner.berechne(kurzcheck: leer, normaussentemperatur: normaussen).heizlast.mitte, 0)
    }

    // MARK: Die fünf Antworten wirken

    func testErgebnisLiegtImPlausiblenBereich() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)

        XCTAssertGreaterThan(e.heizlast.mitte, 8)
        XCTAssertLessThan(e.heizlast.mitte, 30)
        XCTAssertGreaterThan(e.jeQuadratmeter, 60)
        XCTAssertLessThan(e.jeQuadratmeter, 220)
    }

    func testNeubauBrauchtDeutlichWenigerAlsAltbau() {
        var neubau = typischerAltbau
        neubau.epoche = .neubau

        let alt = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)
        let neu = rechner.berechne(kurzcheck: neubau, normaussentemperatur: normaussen)

        XCTAssertLessThan(neu.heizlast.mitte, alt.heizlast.mitte * 0.5)
    }

    func testReihenmitteBrauchtWenigerAlsFreistehend() {
        var reihe = typischerAltbau
        reihe.anbausituation = .reihenhausMitte

        XCTAssertLessThan(
            rechner.berechne(kurzcheck: reihe, normaussentemperatur: normaussen).heizlast.mitte,
            rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen).heizlast.mitte
        )
    }

    func testAusgebautesDachErhoehtDieHeizlast() {
        var ausgebaut = typischerAltbau
        ausgebaut.geschosse = .zweiMitAusgebautemDach

        XCTAssertGreaterThan(
            rechner.berechne(kurzcheck: ausgebaut, normaussentemperatur: normaussen).heizlast.mitte,
            rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen).heizlast.mitte
        )
    }

    /// Das sicherste von außen erkennbare Zeichen für eine Dämmung.
    func testErkennbareDaemmungSenktDieHeizlastDeutlich() {
        var gedaemmt = typischerAltbau
        gedaemmt.fassadenbild = .daemmungErkennbar

        let a = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)
        let b = rechner.berechne(kurzcheck: gedaemmt, normaussentemperatur: normaussen)

        XCTAssertLessThan(b.heizlast.mitte, a.heizlast.mitte * 0.75)
    }

    func testNeueFensterAlleinWirkenWenigerAlsEineGedaemmteFassade() {
        var fenster = typischerAltbau
        fenster.fassadenbild = .neueFensterAlteFassade
        var fassade = typischerAltbau
        fassade.fassadenbild = .daemmungErkennbar

        XCTAssertGreaterThan(
            rechner.berechne(kurzcheck: fenster, normaussentemperatur: normaussen).heizlast.mitte,
            rechner.berechne(kurzcheck: fassade, normaussentemperatur: normaussen).heizlast.mitte
        )
    }

    func testJedeEpocheErgibtEinPlausiblesBaujahr() {
        for epoche in Kurzcheck.Epoche.allCases {
            var check = typischerAltbau
            check.epoche = epoche
            let e = rechner.berechne(kurzcheck: check, normaussentemperatur: normaussen)

            XCTAssertGreaterThan(e.heizlast.unten, 0, epoche.bezeichnung)
            XCTAssertTrue(e.heizlast.oben.isFinite, epoche.bezeichnung)
            XCTAssertFalse(epoche.hinweis.isEmpty, epoche.bezeichnung)
        }
    }

    // MARK: Fehlerfortpflanzung

    func testGrundunsicherheitLiegtBeiRundDreissigProzent() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)

        XCTAssertGreaterThan(e.unsicherheit, 0.24)
        XCTAssertLessThan(e.unsicherheit, 0.32)
    }

    func testJedeAngabeVerengtDieSpanne() {
        var check = typischerAltbau
        let ohne = rechner.gesamtstreuung(check)

        check.dachform = .sattel
        let mitDach = rechner.gesamtstreuung(check)
        check.kellerlage = .unbeheizterKeller
        let mitKeller = rechner.gesamtstreuung(check)
        check.grundflaecheDirekt = 90
        let mitFlaeche = rechner.gesamtstreuung(check)

        XCTAssertLessThan(mitDach, ohne)
        XCTAssertLessThan(mitKeller, mitDach)
        XCTAssertLessThan(mitFlaeche, mitKeller)
    }

    /// Unabhängige Fehler addieren sich quadratisch – das muss die Rechnung
    /// auch wirklich tun.
    func testStreuungAddiertSichQuadratisch() {
        var check = typischerAltbau
        check.grundflaecheDirekt = 90
        check.dachform = .sattel
        check.kellerlage = .unbeheizterKeller
        check.fensteranteilGezaehlt = 0.15
        // Übrig bleiben Flächenangabe (0,04), U-Wert-Grundstreuung (0,16)
        // und der unbekannte Wandaufbau (0,15).
        XCTAssertEqual(rechner.gesamtstreuung(check),
                       (0.04 * 0.04 + 0.16 * 0.16 + 0.15 * 0.15).squareRoot(), accuracy: 0.001)

        check.wandaufbau = .zweischaligMitLuftschicht
        XCTAssertEqual(rechner.gesamtstreuung(check),
                       (0.04 * 0.04 + 0.16 * 0.16).squareRoot(), accuracy: 0.001)
    }

    func testUnklareFassadeVergroessertDieSpanne() {
        var unklar = typischerAltbau
        unklar.fassadenbild = .unsicher

        XCTAssertGreaterThan(
            rechner.gesamtstreuung(unklar),
            rechner.gesamtstreuung(typischerAltbau)
        )
    }

    // MARK: Der nächste Schritt

    func testDerNaechsteSchrittIstDerWirksamste() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)
        let naechster = e.naechsterSchritt

        XCTAssertNotNil(naechster)
        for verfeinerung in e.verfeinerungen where !verfeinerung.erledigt {
            XCTAssertLessThanOrEqual(verfeinerung.verengung, naechster!.verengung + 0.0001)
        }
    }

    /// Messen schlägt schätzen – das muss die Rangfolge auch zeigen.
    func testMessendeVerfahrenStehenGanzOben() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)
        let messend = e.verfeinerungen.filter { $0.id == "signatur" || $0.id == "nachtmessung" }
        let schaetzend = e.verfeinerungen.filter { ["dachform", "keller", "fenster"].contains($0.id) }

        for m in messend {
            for s in schaetzend {
                XCTAssertGreaterThan(m.verengung, s.verengung, "\(m.titel) vs \(s.titel)")
            }
        }
    }

    func testErledigteVerfeinerungenBringenNichtsMehr() {
        var check = typischerAltbau
        check.dachform = .walm
        check.kellerlage = .ohneKeller

        let e = rechner.berechne(kurzcheck: check, normaussentemperatur: normaussen)
        let dach = e.verfeinerungen.first { $0.id == "dachform" }!
        let keller = e.verfeinerungen.first { $0.id == "keller" }!

        XCTAssertTrue(dach.erledigt)
        XCTAssertEqual(dach.verengung, 0)
        XCTAssertTrue(keller.erledigt)
        XCTAssertEqual(keller.verengung, 0)
    }

    func testWennAllesBeantwortetIstBleibenNurNochDieMessungen() {
        var check = typischerAltbau
        check.grundflaecheDirekt = 90
        check.dachform = .sattel
        check.kellerlage = .unbeheizterKeller
        check.fensteranteilGezaehlt = 0.15
        check.wandaufbau = .vollziegel

        let e = rechner.berechne(kurzcheck: check, normaussentemperatur: normaussen)
        let offen = e.verfeinerungen.filter { !$0.erledigt && $0.verengung > 0.005 }

        XCTAssertEqual(Set(offen.map(\.id)), ["nachtmessung", "signatur"])
    }

    func testAlleVerfeinerungenHabenVerstaendlichenText() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)

        for verfeinerung in e.verfeinerungen {
            XCTAssertFalse(verfeinerung.titel.isEmpty)
            XCTAssertGreaterThan(verfeinerung.beschreibung.count, 30, verfeinerung.titel)
            XCTAssertGreaterThanOrEqual(verfeinerung.verengung, 0, verfeinerung.titel)
        }
    }

    // MARK: Wandaufbau und Dämmstärke

    /// Der größte Hebel nach den fünf Fragen – und von außen erkennbar.
    func testWandaufbauIstDieWirksamsteZusatzangabe() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)
        let wand = e.verfeinerungen.first { $0.id == "wandaufbau" }!
        let andereSofort = e.verfeinerungen.filter {
            $0.aufwand == .sofort && $0.id != "wandaufbau" && !$0.erledigt
        }

        for verfeinerung in andereSofort {
            XCTAssertGreaterThan(wand.verengung, verfeinerung.verengung, "gegen \(verfeinerung.titel)")
        }
    }

    func testKlinkerwandBrauchtWenigerAlsVollziegel() {
        var klinker = typischerAltbau
        klinker.wandaufbau = .zweischaligMitLuftschicht
        var ziegel = typischerAltbau
        ziegel.wandaufbau = .vollziegel

        XCTAssertLessThan(
            rechner.berechne(kurzcheck: klinker, normaussentemperatur: normaussen).heizlast.mitte,
            rechner.berechne(kurzcheck: ziegel, normaussentemperatur: normaussen).heizlast.mitte
        )
    }

    func testHolzstaenderwerkIstDerBesteUngedaemmteAufbau() {
        let werte = Kurzcheck.Wandaufbau.allCases.map(\.uWertUngedaemmt)
        XCTAssertEqual(Kurzcheck.Wandaufbau.holzstaenderwerk.uWertUngedaemmt, werte.min())
        XCTAssertEqual(Kurzcheck.Wandaufbau.beton.uWertUngedaemmt, werte.max())
    }

    /// Die Dämmung legt sich als zusätzlicher Widerstand vor die Wand:
    /// 1/U_neu = 1/U_alt + d/λ. Bei Vollziegel (1,65) und 14 cm mit λ = 0,035
    /// ergibt das 1/(0,606 + 4,0) = 0,217 W/m²K.
    func testDaemmstaerkeRechnetUeberDenWaermedurchlasswiderstand() throws {
        var check = typischerAltbau
        check.fassadenbild = .daemmungErkennbar
        check.wandaufbau = .vollziegel
        check.daemmstaerkeZentimeter = 14

        let u = try XCTUnwrap(rechner.uWertAussenwand(check))
        XCTAssertEqual(u, 1 / (1 / 1.65 + 0.14 / 0.035), accuracy: 0.001)
        XCTAssertEqual(u, 0.217, accuracy: 0.005)
    }

    func testDickereDaemmungSenktDieHeizlast() {
        var duenn = typischerAltbau
        duenn.fassadenbild = .daemmungErkennbar
        duenn.wandaufbau = .vollziegel
        duenn.daemmstaerkeZentimeter = 6
        var dick = duenn
        dick.daemmstaerkeZentimeter = 20

        XCTAssertLessThan(
            rechner.berechne(kurzcheck: dick, normaussentemperatur: normaussen).heizlast.mitte,
            rechner.berechne(kurzcheck: duenn, normaussentemperatur: normaussen).heizlast.mitte
        )
    }

    func testOhneDaemmungIstDieDaemmstaerkeKeineOffeneFrage() {
        // Ungedämmtes Haus: Die Frage nach der Dämmstärke darf nicht auftauchen.
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)
        let staerke = e.verfeinerungen.first { $0.id == "daemmstaerke" }!

        XCTAssertTrue(staerke.erledigt)
        XCTAssertEqual(staerke.verengung, 0)
    }

    func testBeiGedaemmterFassadeWirdNachDerStaerkeGefragt() {
        var gedaemmt = typischerAltbau
        gedaemmt.fassadenbild = .daemmungErkennbar

        let e = rechner.berechne(kurzcheck: gedaemmt, normaussentemperatur: normaussen)
        let staerke = e.verfeinerungen.first { $0.id == "daemmstaerke" }!

        XCTAssertFalse(staerke.erledigt)
        XCTAssertGreaterThan(staerke.verengung, 0.005)
    }

    func testGezaehlteFensterErsetzenDenErfahrungswert() {
        var wenig = typischerAltbau
        wenig.fensteranteilGezaehlt = 12
        var viel = typischerAltbau
        viel.fensteranteilGezaehlt = 40

        XCTAssertLessThan(
            rechner.berechne(kurzcheck: wenig, normaussentemperatur: normaussen).heizlast.mitte,
            rechner.berechne(kurzcheck: viel, normaussentemperatur: normaussen).heizlast.mitte
        )
    }

    func testJederWandaufbauHatBezeichnungUndHinweis() {
        for aufbau in Kurzcheck.Wandaufbau.allCases {
            XCTAssertFalse(aufbau.bezeichnung.isEmpty)
            XCTAssertGreaterThan(aufbau.hinweis.count, 15, aufbau.bezeichnung)
            XCTAssertGreaterThan(aufbau.uWertUngedaemmt, 0.3, aufbau.bezeichnung)
            XCTAssertLessThan(aufbau.uWertUngedaemmt, 3.0, aufbau.bezeichnung)
        }
    }

    // MARK: Ehrlichkeit

    func testJedesErgebnisTraegtVorbehaltUndAnnahmen() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)

        XCTAssertTrue(e.vorbehalt.contains("DIN EN 12831"))
        XCTAssertGreaterThanOrEqual(e.annahmen.count, 6)
        XCTAssertTrue(e.annahmen.contains { $0.bezeichnung == "Unsicherheit" })
    }

    func testSpanneUmschliesstDenMittelwert() {
        let e = rechner.berechne(kurzcheck: typischerAltbau, normaussentemperatur: normaussen)

        XCTAssertLessThan(e.heizlast.unten, e.heizlast.mitte)
        XCTAssertGreaterThan(e.heizlast.oben, e.heizlast.mitte)
    }

    /// Der Kurzcheck muss ungefähr dorthin kommen, wo die messenden Verfahren
    /// landen – sonst wäre er als Einstieg wertlos.
    func testKurzcheckTrifftDieMessungInDerSpanne() throws {
        var check = typischerAltbau
        check.epoche = .nachkrieg
        check.fassadenbild = .daemmungErkennbar
        check.grundflaecheDirekt = 80
        check.geschosse = .zweiVollgeschosse

        let ausKurzcheck = rechner.berechne(kurzcheck: check, normaussentemperatur: normaussen)

        // Dasselbe Gebäude über die Hüllflächenrechnung mit denselben Annahmen.
        let ueberHuelle = rechner.ausGebaeudehuelle(
            rechner.huelleAus(check),
            gebaeude: rechner.gebaeudeAus(check),
            normaussentemperatur: normaussen
        )

        XCTAssertEqual(ausKurzcheck.heizlast.mitte, ueberHuelle.gesamtKW, accuracy: 0.15)
        XCTAssertGreaterThan(ueberHuelle.gesamtKW, ausKurzcheck.heizlast.unten)
        XCTAssertLessThan(ueberHuelle.gesamtKW, ausKurzcheck.heizlast.oben)
    }
}
