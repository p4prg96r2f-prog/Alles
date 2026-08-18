import XCTest
@testable import WerkeKern

/// Die Prüfstrecke gegen reale Objekte.
///
/// Alle anderen Testfälle prüfen, ob die App mit sich selbst übereinstimmt.
/// Diese hier prüfen, ob sie mit der Wirklichkeit übereinstimmt – und das geht
/// nur an Gebäuden, deren Heizlast eine Fachperson gerechnet hat.
///
/// Solange nur die Vorlage hinterlegt ist, laufen die Fälle mit und melden im
/// Protokoll, dass der Beleg noch aussteht. Sobald WERK.E echte Objekte
/// einträgt, werden daraus scharfe Grenzen.
final class ReferenzobjektTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Heizlastrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Heizlastrechner(regeln: regeln)
    }

    /// Der wichtigste Fall dieser Datei: Er schlägt nicht fehl, er erinnert.
    func testDieSammlungIstNochNichtBelegt() {
        guard !Referenzsammlung.istBelegt else { return }
        print("""

        ┌─────────────────────────────────────────────────────────────────┐
        │ HINWEIS: Die Referenzsammlung enthält nur die Vorlage.          │
        │                                                                 │
        │ Für den fachlichen Beleg gehören zehn reale Objekte hinein,     │
        │ deren Heizlast nach DIN EN 12831 bereits gerechnet wurde.       │
        │ Einzutragen in Referenzobjekt.swift → Referenzsammlung.         │
        └─────────────────────────────────────────────────────────────────┘

        """)
    }

    /// Jedes hinterlegte Objekt wird gegen alle verfügbaren Wege gerechnet und
    /// die Abweichung ausgewiesen. Die Ausgabe ist die Tabelle, die WERK.E
    /// vorlegen kann.
    func testJedesObjektWirdGegenAlleWegeGerechnet() {
        for objekt in Referenzsammlung.vorlage {
            let abgleich = rechner.gleicheAb(objekt)
            print(abgleich.tabellenzeile)

            XCTAssertFalse(abgleich.zeilen.isEmpty,
                           "Für „\(objekt.kennung)“ ließ sich kein einziger Weg rechnen.")
            XCTAssertEqual(abgleich.heizlastNachDINKW, objekt.heizlastNachDINKW)
        }
    }

    /// Die Grenze, an der es ernst wird.
    ///
    /// Ein Näherungsverfahren darf danebenliegen – aber nicht um den Faktor
    /// zwei. Sobald ein reales Objekt diese Marke reißt, ist entweder das
    /// Verfahren falsch oder das Objekt falsch erfasst; beides muss auffallen.
    func testKeinVerfahrenLiegtUmMehrAlsDieHaelfteDaneben() {
        for objekt in Referenzsammlung.vorlage {
            let abgleich = rechner.gleicheAb(objekt)
            for zeile in abgleich.zeilen {
                XCTAssertLessThan(
                    abs(zeile.abweichungProzent), 50,
                    "\(objekt.kennung), \(zeile.verfahren): \(Formate.zahl(zeile.abweichungProzent, stellen: 0)) % Abweichung"
                )
            }
        }
    }

    /// Ohne Grundriss gibt es keine Hüllflächenzeile – und das ist richtig so.
    /// Ein Beleg mit Leerstellen ist ehrlicher als einer mit geratenen Werten.
    func testFehlendeAngabenErzeugenKeineErfundeneZeile() {
        let ohneAlles = Referenzobjekt(
            kennung: "nur Baujahr und Fläche",
            gebaeude: Gebaeude(baujahr: 1968, wohnflaeche: 140),
            heizlastNachDINKW: 12
        )
        let abgleich = rechner.gleicheAb(ohneAlles)

        XCTAssertEqual(abgleich.zeilen.map(\.verfahren), ["Kennwert"])
    }

    func testOhneFachberechnungGibtEsKeinenAbgleich() {
        let ohneBezug = Referenzobjekt(
            kennung: "ohne DIN-Wert",
            gebaeude: Gebaeude(baujahr: 1968, wohnflaeche: 140),
            heizlastNachDINKW: 0
        )
        XCTAssertTrue(rechner.gleicheAb(ohneBezug).zeilen.isEmpty)
    }

    /// Das Verhältnis muss stimmen, sonst ist die ganze Tabelle wertlos.
    func testDasVerhaeltnisWirdRichtigGebildet() {
        let objekt = Referenzobjekt(
            kennung: "Rechenprobe",
            gebaeude: Gebaeude(baujahr: 1968, wohnflaeche: 140),
            heizlastNachDINKW: 10
        )
        let zeile = rechner.gleicheAb(objekt).zeilen[0]

        XCTAssertEqual(zeile.verhaeltnis, zeile.heizlastKW / 10, accuracy: 0.0001)
        XCTAssertEqual(zeile.abweichungProzent, (zeile.heizlastKW / 10 - 1) * 100, accuracy: 0.0001)
    }
}
