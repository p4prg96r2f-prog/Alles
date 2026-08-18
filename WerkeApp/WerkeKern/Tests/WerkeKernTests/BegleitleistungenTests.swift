import XCTest
@testable import WerkeKern

/// Die Pflichten neben der Maßnahme – Lüftungskonzept, Luftdichtheit,
/// Heizlast nach Norm. Sie entscheiden später darüber, ob der Zuschuss fließt.
final class BegleitleistungenTests: XCTestCase {

    private func leistungen(_ arten: [Massnahmenart]) -> [Begleitleistung] {
        Begleitplanung.leistungen(
            fuer: arten.map { Massnahme(art: $0, kosten: 10_000) },
            gebaeude: Gebaeude(baujahr: 1968)
        )
    }

    // MARK: Der wichtigste Punkt überhaupt

    /// Wer vor dem Antrag beauftragt, verliert die Förderung unwiderruflich.
    /// Diese Warnung steht bei jeder Maßnahmenauswahl an erster Stelle.
    func testAntragVorBeginnStehtImmerAnErsterStelle() {
        for arten in [[Massnahmenart.fenster], [.heizungstausch], [.dach, .fassade]] {
            let erste = leistungen(arten).first
            XCTAssertEqual(erste?.id, "antrag-vor-beginn", "\(arten)")
            XCTAssertEqual(erste?.stufe, .pflicht)
        }
    }

    func testOhneMassnahmenKeineLeistungen() {
        XCTAssertTrue(leistungen([]).isEmpty)
        // Eine Maßnahme ohne Kosten zählt nicht als gewählt.
        XCTAssertTrue(Begleitplanung.leistungen(
            fuer: [Massnahme(art: .fenster, kosten: 0)],
            gebaeude: Gebaeude()
        ).isEmpty)
    }

    // MARK: Lüftungskonzept

    /// Neue Fenster machen das Haus dichter – ohne geplanten Luftwechsel
    /// schlägt sich die Feuchte an der kältesten Stelle nieder. Die Förderung
    /// verlangt das Konzept ausdrücklich.
    func testFenstertauschVerlangtEinLueftungskonzept() throws {
        let punkt = try XCTUnwrap(leistungen([.fenster]).first { $0.id == "lueftungskonzept" })
        XCTAssertEqual(punkt.stufe, .pflicht)
        XCTAssertTrue(punkt.fundstelle.contains("1946-6"))
        XCTAssertTrue(punkt.vonWerke)
    }

    func testDachdaemmungVerlangtEinLueftungskonzept() {
        XCTAssertTrue(leistungen([.dach]).contains { $0.id == "lueftungskonzept" })
    }

    /// Eine Kellerdecke ändert am Luftwechsel der Wohnräume nichts.
    func testKellerdeckeVerlangtKeinLueftungskonzept() {
        XCTAssertFalse(leistungen([.kellerdecke]).contains { $0.id == "lueftungskonzept" })
    }

    /// Fenster **und** Dach zusammen erzeugen die Pflicht nur einmal.
    func testKeineDoppeltenEintraege() {
        let alle = leistungen([.fenster, .dach, .fassade])
        XCTAssertEqual(Set(alle.map(\.id)).count, alle.count)
    }

    // MARK: Luftdichtheitskonzept

    /// Die dichte Ebene wird vor der Ausführung festgelegt – hinter fertigen
    /// Oberflächen ist ein vergessener Anschluss kaum noch zu heilen.
    func testDaemmmassnahmenEmpfehlenEinLuftdichtheitskonzept() throws {
        for art in [Massnahmenart.dach, .fassade, .obersteGeschossdecke, .fenster] {
            let punkt = try XCTUnwrap(
                leistungen([art]).first { $0.id == "luftdichtheitskonzept" },
                "\(art)"
            )
            XCTAssertEqual(punkt.stufe, .empfohlen)
            XCTAssertTrue(punkt.begruendung.contains("Blower-Door"))
        }
    }

    func testHeizungstauschAlleinBrauchtKeinLuftdichtheitskonzept() {
        XCTAssertFalse(leistungen([.heizungstausch]).contains { $0.id == "luftdichtheitskonzept" })
    }

    // MARK: Heizungstausch

    func testHeizungstauschVerlangtHeizlastUndAbgleich() {
        let alle = leistungen([.heizungstausch])
        XCTAssertTrue(alle.contains { $0.id == "heizlast-din" && $0.stufe == .pflicht })
        XCTAssertTrue(alle.contains { $0.id == "hydraulischer-abgleich" && $0.stufe == .pflicht })
    }

    func testHeizungsoptimierungVerlangtDenAbgleich() {
        XCTAssertTrue(leistungen([.heizungsoptimierung]).contains { $0.id == "hydraulischer-abgleich" })
    }

    // MARK: Effizienzhaus

    func testEffizienzhausVerlangtBaubegleitung() {
        XCTAssertTrue(leistungen([.effizienzhaus]).contains { $0.id == "baubegleitung" && $0.stufe == .pflicht })
    }

    // MARK: Ordnung

    /// Pflichten stehen vor Empfehlungen – die Liste ist eine Rangfolge.
    func testPflichtenStehenVorEmpfehlungen() {
        let alle = leistungen([.fenster, .dach, .heizungstausch])
        let ersteEmpfehlung = alle.firstIndex { $0.stufe == .empfohlen }
        let letztePflicht = alle.lastIndex { $0.stufe == .pflicht }
        if let e = ersteEmpfehlung, let p = letztePflicht {
            XCTAssertLessThan(p, e)
        }
    }

    /// Jede Leistung trägt eine Fundstelle – ohne die ist sie eine Behauptung.
    func testJedeLeistungHatFundstelleUndBegruendung() {
        for punkt in leistungen([.fenster, .dach, .heizungstausch, .effizienzhaus]) {
            XCTAssertFalse(punkt.fundstelle.isEmpty, punkt.id)
            XCTAssertFalse(punkt.begruendung.isEmpty, punkt.id)
        }
    }
}
