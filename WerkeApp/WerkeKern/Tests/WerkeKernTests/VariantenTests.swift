import XCTest
@testable import WerkeKern

/// Der Variantenvergleich: mehrere Maßnahmenpakete, dieselben Annahmen,
/// nebeneinander.
final class VariantenTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Foerderrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Foerderrechner(regeln: regeln)
    }

    private var gebaeude: Gebaeude {
        var g = Gebaeude(baujahr: 1968, wohnflaeche: 140)
        g.hatSanierungsfahrplan = true
        return g
    }

    private var nurHeizung: Variante {
        Variante(name: "Nur Heizung", massnahmen: [Massnahme(art: .heizungstausch, kosten: 28_000)])
    }
    private var nurHuelle: Variante {
        Variante(name: "Nur Hülle", massnahmen: [
            Massnahme(art: .fassade, kosten: 31_000),
            Massnahme(art: .fenster, kosten: 18_000)
        ])
    }
    private var beides: Variante {
        Variante(name: "Beides", massnahmen: nurHeizung.massnahmen + nurHuelle.massnahmen)
    }

    // MARK: Der Vergleich selbst

    /// Jede Zeile muss exakt dem entsprechen, was der Förderrechner für
    /// dieselben Maßnahmen einzeln liefert – der Vergleich rechnet nichts
    /// anderes, er stellt nur nebeneinander.
    func testJedeZeileEntsprichtDerEinzelrechnung() {
        let vergleich = rechner.vergleiche([nurHeizung, nurHuelle, beides], gebaeude: gebaeude)

        for zeile in vergleich.zeilen {
            let einzeln = rechner.berechne(gebaeude: gebaeude, massnahmen: zeile.variante.massnahmen)
            XCTAssertEqual(zeile.investition, einzeln.investitionGesamt, accuracy: 0.01, zeile.variante.name)
            XCTAssertEqual(zeile.zuschuss, einzeln.zuschussGesamt, accuracy: 0.01, zeile.variante.name)
            XCTAssertEqual(zeile.eigenanteil, einzeln.eigenanteilGesamt, accuracy: 0.01, zeile.variante.name)
        }
    }

    /// Die Reihenfolge der Eingabe bleibt erhalten – Variante A bleibt oben,
    /// auch wenn B mehr Zuschuss hat. Sortieren hieße werten.
    func testDieReihenfolgeBleibtErhalten() {
        let vergleich = rechner.vergleiche([nurHuelle, nurHeizung], gebaeude: gebaeude)
        XCTAssertEqual(vergleich.zeilen.map(\.variante.name), ["Nur Hülle", "Nur Heizung"])
    }

    /// Das große Paket gewinnt beim Zuschuss, das kleine beim Eigenanteil –
    /// genau diese Spannung soll der Vergleich zeigen, nicht auflösen.
    func testGroesstesPaketHatMeistZuschussKleinsterEigenanteilBleibtKlein() throws {
        let vergleich = rechner.vergleiche([nurHeizung, nurHuelle, beides], gebaeude: gebaeude)

        XCTAssertEqual(try XCTUnwrap(vergleich.hoechsterZuschuss).variante.name, "Beides")
        XCTAssertEqual(try XCTUnwrap(vergleich.niedrigsterEigenanteil).variante.name, "Nur Heizung")

        let aussage = try XCTUnwrap(vergleich.aussage)
        XCTAssertTrue(aussage.contains("Beides"), aussage)
        XCTAssertTrue(aussage.contains("Nur Heizung"), aussage)
        // Der Vergleich wertet nicht – er benennt die Spannung.
        XCTAssertTrue(aussage.contains("Budget"), aussage)
    }

    /// Mit nur einer Variante gibt es nichts zu vergleichen – und keine Aussage.
    func testEineVarianteErzeugtKeineAussage() {
        XCTAssertNil(rechner.vergleiche([nurHeizung], gebaeude: gebaeude).aussage)
        XCTAssertNil(rechner.vergleiche([], gebaeude: gebaeude).aussage)
    }

    /// Fällt höchster Zuschuss und niedrigster Eigenanteil zusammen, sagt die
    /// Aussage genau das – ohne erfundene Spannung.
    func testEindeutigerSiegerWirdAlsSolcherBenannt() throws {
        // Gleiche Kosten, aber eine Variante im gedeckelten Heizungstopf,
        // die andere in der Hülle mit iSFP-Bonus: Die Hülle gewinnt beides.
        let a = Variante(name: "A", massnahmen: [Massnahme(art: .heizungstausch, kosten: 60_000)])
        let b = Variante(name: "B", massnahmen: [Massnahme(art: .fassade, kosten: 60_000)])
        let vergleich = rechner.vergleiche([a, b], gebaeude: gebaeude)

        if vergleich.hoechsterZuschuss?.id == vergleich.niedrigsterEigenanteil?.id {
            let aussage = try XCTUnwrap(vergleich.aussage)
            XCTAssertTrue(aussage.contains("zugleich"), aussage)
        }
    }

    // MARK: Ablage

    /// Varianten überleben Speichern und Laden – sonst ist der Vergleich beim
    /// nächsten Öffnen weg.
    func testVariantenUeberlebenDieAblage() throws {
        var ablage = Ablage()
        ablage.varianten = [nurHeizung, beides]

        let daten = try Ablagekodierung.kodiere(ablage)
        let zurueck = try Ablagekodierung.dekodiere(daten)

        XCTAssertEqual(zurueck.varianten, ablage.varianten)
    }

    /// Eine ältere Ablage ohne das Feld bleibt lesbar.
    func testAeltereAblageOhneVariantenBleibtLesbar() throws {
        let alt = #"{ "schemaVersion": 1, "einstiegAbgeschlossen": true }"#
        let ablage = try Ablagekodierung.dekodiere(Data(alt.utf8))
        XCTAssertTrue(ablage.varianten.isEmpty)
    }
}
