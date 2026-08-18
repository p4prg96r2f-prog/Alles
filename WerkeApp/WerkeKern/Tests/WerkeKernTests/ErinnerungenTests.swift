import XCTest
@testable import WerkeKern

/// Ein Weckruf zur falschen Zeit ist der schnellste Weg, abgeschaltet zu
/// werden. Deshalb steht die Terminlogik hier auf dem Prüfstand.
final class ErinnerungenTests: XCTestCase {

    var regeln: Regelpaket!
    let kalender = Calendar(identifier: .gregorian)

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
    }

    private func datum(_ jahr: Int, _ monat: Int, _ tag: Int) -> Date {
        kalender.date(from: DateComponents(year: jahr, month: monat, day: tag, hour: 9))!
    }

    private func ablageMitHaus(ablesetage: [Int] = []) -> Ablage {
        var ablage = Ablage()
        ablage.schliesseEinstiegAb(
            mit: Gebaeude(plz: "33102", typ: .einfamilienhaus, baujahr: 1968, wohnflaeche: 140),
            heute: datum(2026, 1, 5)
        )
        for (index, tag) in ablesetage.enumerated() {
            let d = datum(2026, 1 + index, tag)
            ablage.ergaenze(Zaehlerstand(art: .gas, wert: Double(1_000 + index * 200), datum: d), heute: d)
        }
        return ablage
    }

    // MARK: Ohne Haus keine Erinnerung

    func testOhneGebaeudeWirdNichtErinnert() {
        let plan = Erinnerungsplan.plane(ablage: Ablage(), regeln: regeln, heute: datum(2026, 8, 15))
        XCTAssertTrue(plan.isEmpty)
    }

    // MARK: Die monatliche Ablesung

    func testAblesungWirdMonatlichGeplant() {
        let plan = Erinnerungsplan.plane(
            ablage: ablageMitHaus(), regeln: regeln, heute: datum(2026, 8, 15)
        )
        let ablesungen = plan.filter { $0.art == .ablesung }

        XCTAssertGreaterThanOrEqual(ablesungen.count, 6)
        // Alle Termine liegen in der Zukunft und in aufsteigender Reihenfolge.
        XCTAssertTrue(ablesungen.allSatisfy { $0.faellig > self.datum(2026, 8, 15) })
        XCTAssertEqual(ablesungen, ablesungen.sorted { $0.faellig < $1.faellig })
    }

    /// Wer immer am Monatsersten abliest, soll nicht am Fünfzehnten gestört
    /// werden. Die Gewohnheit ist die halbe Miete.
    func testDerTerminFolgtDerGewohnheit() {
        let plan = Erinnerungsplan.plane(
            ablage: ablageMitHaus(ablesetage: [3, 2, 3, 3]),
            regeln: regeln, heute: datum(2026, 8, 15)
        )
        let erste = plan.first { $0.art == .ablesung }
        XCTAssertEqual(kalender.component(.day, from: erste!.faellig), 3)
    }

    /// Eine einzelne verspätete Ablesung darf den Termin nicht dauerhaft
    /// verschieben – deshalb der Median und nicht der Mittelwert.
    func testEineVerspaeteteAblesungVerschiebtDenTerminNicht() {
        let plan = Erinnerungsplan.plane(
            ablage: ablageMitHaus(ablesetage: [2, 2, 27, 2, 2]),
            regeln: regeln, heute: datum(2026, 8, 15)
        )
        let erste = plan.first { $0.art == .ablesung }
        XCTAssertEqual(kalender.component(.day, from: erste!.faellig), 2)
    }

    /// Die verbleibenden Monate laufen mit. Sonst steht beim dritten Weckruf
    /// dieselbe Zahl wie beim ersten – und aus einem Fortschritt wird eine
    /// Mahnung.
    func testDerTextZaehltDieVerbleibendenMonateHerunter() {
        let plan = Erinnerungsplan.plane(
            ablage: ablageMitHaus(), regeln: regeln, heute: datum(2026, 8, 15)
        )
        let ablesungen = plan.filter { $0.art == .ablesung }
        XCTAssertTrue(ablesungen[0].text.contains("24 von 24"), ablesungen[0].text)
        XCTAssertTrue(ablesungen[1].text.contains("23 von 24"), ablesungen[1].text)
    }

    func testKennungenSindEindeutigUndStabil() {
        let a = Erinnerungsplan.plane(ablage: ablageMitHaus(), regeln: regeln, heute: datum(2026, 8, 15))
        let b = Erinnerungsplan.plane(ablage: ablageMitHaus(), regeln: regeln, heute: datum(2026, 8, 15))

        XCTAssertEqual(a.map(\.kennung), b.map(\.kennung))
        XCTAssertEqual(Set(a.map(\.kennung)).count, a.count)
    }

    func testNichtMehrAlsZwoelfErinnerungen() {
        let plan = Erinnerungsplan.plane(ablage: ablageMitHaus(), regeln: regeln, heute: datum(2026, 8, 15))
        XCTAssertLessThanOrEqual(plan.count, Erinnerungsplan.hoechstzahl)
    }

    // MARK: Fristen

    func testInkrafttretenWirdAngekuendigt() throws {
        var paket = regeln!
        paket.gebaeude.gmodgInKraftAb = "2027-01-01"

        let plan = Erinnerungsplan.plane(
            ablage: ablageMitHaus(), regeln: paket, heute: datum(2026, 8, 15)
        )
        let hinweis = try XCTUnwrap(plan.first { $0.art == .rechtsaenderung })
        XCTAssertEqual(kalender.component(.year, from: hinweis.faellig), 2027)
        XCTAssertEqual(kalender.component(.month, from: hinweis.faellig), 1)
    }

    /// Ohne Termin für das Inkrafttreten wird auch nicht daran erinnert.
    func testOhneStichtagKeineRechtsaenderung() {
        let plan = Erinnerungsplan.plane(
            ablage: ablageMitHaus(), regeln: regeln, heute: datum(2026, 8, 15)
        )
        XCTAssertFalse(plan.contains { $0.art == .rechtsaenderung })
    }

    /// Ein Energieausweis gilt zehn Jahre – erinnert wird zwei Monate vorher,
    /// nicht am Tag des Ablaufs.
    func testEnergieausweisWirdVorAblaufAngekuendigt() throws {
        var ablage = ablageMitHaus()
        let ausstellung = datum(2017, 6, 1)
        ablage.ergaenze(
            Dokument(titel: "Ausweis", dateiname: "a.pdf", angelegt: ausstellung, art: .energieausweis),
            heute: ausstellung
        )

        let plan = Erinnerungsplan.plane(ablage: ablage, regeln: regeln, heute: datum(2027, 1, 5))
        let frist = try XCTUnwrap(plan.first { $0.kennung == "energieausweis-ablauf" })

        // Ablauf 1.6.2027, Vorlauf 60 Tage → Anfang April.
        XCTAssertEqual(kalender.component(.year, from: frist.faellig), 2027)
        XCTAssertEqual(kalender.component(.month, from: frist.faellig), 4)
    }

    /// Eine Frist, die schon vorbei ist, weckt niemanden mehr.
    func testVergangeneFristenEntfallen() {
        var ablage = ablageMitHaus()
        let ausstellung = datum(2010, 1, 1)
        ablage.ergaenze(
            Dokument(titel: "Alt", dateiname: "a.pdf", angelegt: ausstellung, art: .energieausweis),
            heute: ausstellung
        )

        let plan = Erinnerungsplan.plane(ablage: ablage, regeln: regeln, heute: datum(2026, 8, 15))
        XCTAssertFalse(plan.contains { $0.kennung == "energieausweis-ablauf" })
    }

    func testWohngebaeudeBekommtKeineNichtwohngebaeudefrist() {
        let plan = Erinnerungsplan.plane(ablage: ablageMitHaus(), regeln: regeln, heute: datum(2029, 8, 15))
        XCTAssertFalse(plan.contains { $0.kennung == "nichtwohngebaeude-klasse-g" })
    }

    func testNichtwohngebaeudeBekommtDieFrist() throws {
        var ablage = ablageMitHaus()
        ablage.gebaeude?.istWohngebaeude = false

        let plan = Erinnerungsplan.plane(ablage: ablage, regeln: regeln, heute: datum(2029, 8, 15))
        let frist = try XCTUnwrap(plan.first { $0.kennung == "nichtwohngebaeude-klasse-g" })
        XCTAssertLessThan(frist.faellig, datum(2030, 1, 1))
    }
}
