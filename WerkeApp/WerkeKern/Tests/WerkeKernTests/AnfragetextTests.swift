import XCTest
@testable import WerkeKern

/// Die Nachricht an WERK.E – der Moment, in dem alles Gerechnete mündet.
final class AnfragetextTests: XCTestCase {

    private var gebaeude: Gebaeude {
        var g = Gebaeude(
            strasse: "Rolandsweg 80", plz: "33102", ort: "Paderborn",
            baujahr: 1968, wohnflaeche: 140
        )
        g.heizungBaujahr = 2004
        return g
    }

    // MARK: Betreff

    func testBetreffNenntAnliegenUndAnschrift() {
        let betreff = Anfragetext.betreff(.angebot, gebaeude: gebaeude)
        XCTAssertTrue(betreff.contains("Angebot"), betreff)
        XCTAssertTrue(betreff.contains("Rolandsweg 80"), betreff)
    }

    /// Ohne Anschrift fällt der Betreff auf Typ und Baujahr zurück – nie auf
    /// eine erfundene Adresse.
    func testOhneAnschriftFaelltDerBetreffAufDasGebaeudeZurueck() {
        let ohne = Gebaeude(baujahr: 1968)
        let betreff = Anfragetext.betreff(.nachricht, gebaeude: ohne)
        XCTAssertTrue(betreff.contains("1968"), betreff)
        XCTAssertFalse(betreff.contains("Rolandsweg"))
    }

    // MARK: Inhalt

    /// Jede Ergebniszeile aus der App steht wörtlich in der Nachricht – das
    /// ist ihr ganzer Zweck.
    func testAlleErgebniszeilenStehenInDerNachricht() {
        let zeilen = [
            "Heizlast: 6,9 – 8,6 kW (aus Ihren Ablesungen)",
            "Mögliche Förderung: 8.300 €"
        ]
        let text = Anfragetext.nachricht(art: .nachricht, gebaeude: gebaeude, zusammenfassung: zeilen)
        for zeile in zeilen {
            XCTAssertTrue(text.contains(zeile), zeile)
        }
    }

    /// Name und Rückrufnummer kennt die App nicht – dort stehen sichtbare
    /// Platzhalter, niemals erfundene Angaben.
    func testUnbekanntesBleibtSichtbarerPlatzhalter() {
        let text = Anfragetext.nachricht(art: .angebot, gebaeude: gebaeude, zusammenfassung: [])
        XCTAssertTrue(text.contains(Anfragetext.platzhalterName))
        XCTAssertTrue(text.contains(Anfragetext.platzhalterTelefon))
    }

    /// Die Nachricht sagt selbst, dass ihre Zahlen Abschätzungen sind – sie
    /// darf beim Empfänger nicht als Normberechnung ankommen.
    func testDieNachrichtKennzeichnetIhreZahlenAlsAbschaetzung() {
        let text = Anfragetext.nachricht(art: .nachricht, gebaeude: gebaeude, zusammenfassung: ["x"])
        XCTAssertTrue(text.contains("Abschätzungen"))
    }

    // MARK: Antragsbegleitung

    /// Der teuerste Fehler der Förderung gehört in die Anfrage selbst: Der
    /// Antrag muss vor der Beauftragung gestellt sein.
    func testAntragsbegleitungNenntDenVorhabensbeginn() {
        let text = Anfragetext.nachricht(art: .antragsbegleitung, gebaeude: gebaeude, zusammenfassung: [])
        XCTAssertTrue(text.contains("bevor ein Liefer- oder Leistungsvertrag"), text)
        XCTAssertTrue(text.contains("noch nicht beauftragt"), text)
    }

    // MARK: Angebot

    func testAngebotZaehltDieGewuenschtenLeistungenAuf() {
        let text = Anfragetext.nachricht(
            art: .angebot,
            gebaeude: gebaeude,
            zusammenfassung: [],
            leistungen: ["Lüftungskonzept", "Heizlastberechnung nach DIN EN 12831"]
        )
        XCTAssertTrue(text.contains("Lüftungskonzept"))
        XCTAssertTrue(text.contains("DIN EN 12831"))
    }

    /// Gebäudedaten erscheinen nur, wenn es sie gibt.
    func testOhneGebaeudeKeinGebaeudeabschnitt() {
        let text = Anfragetext.nachricht(art: .nachricht, gebaeude: nil, zusammenfassung: ["x"])
        XCTAssertFalse(text.contains("Zum Gebäude"))
    }
}
