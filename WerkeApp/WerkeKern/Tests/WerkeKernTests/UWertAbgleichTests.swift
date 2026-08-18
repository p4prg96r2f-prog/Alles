import XCTest
@testable import WerkeKern

/// Die U-Werte der App gegen veröffentlichte Referenzwerte.
///
/// **Warum das die zweitbeste Prüfung ist – und warum sie trotzdem zählt.**
/// Die beste wäre der Vergleich mit realen Objekten, deren Heizlast eine
/// Fachperson nach DIN EN 12831 gerechnet hat (`ReferenzobjektTests`). Die
/// steht noch aus, weil solche Berechnungen in Akten liegen und nicht im Netz.
///
/// Diese Prüfung greift an einer anderen Stelle an: bei den **Eingangswerten**.
/// Die U-Werte sind der mit Abstand größte Unsicherheitsbeitrag der ganzen App –
/// die Geometrie stimmt auf zwei Prozent, die U-Werte auf dreißig. Wenn sie
/// gegen eine unabhängige, veröffentlichte Quelle passen, ist das kein Beweis
/// für die Heizlast, aber ein echter Befund über die Eingänge.
///
/// **Quelle der Vergleichswerte:** Zusammenstellung von ElbModSan (Stand Juli
/// 2026) auf Grundlage der amtlichen Ersatzwerte nach BAnz AT 04.12.2020 und
/// DIN 4108-4, abgerufen am 18.08.2026. Die Spannen entsprechen der Streuung
/// innerhalb einer Baualtersklasse.
///
/// **Wichtig zur Lesart:** Die Tabelle der Quelle beschreibt Gebäude *wie
/// gebaut*, die App dagegen einen *Bauteilzustand*. Ein Dach von 1975 ist in
/// der Quelle meist schon gedämmt (erste Wärmeschutzverordnung), in der App
/// heißt „ungedämmt“ wirklich ungedämmt. Verglichen wird deshalb nur dort, wo
/// beide dasselbe meinen.
final class UWertAbgleichTests: XCTestCase {

    var regeln: Regelpaket!
    var rechner: Huellflaechenrechner!

    override func setUpWithError() throws {
        regeln = try Regelpaketlader.mitgeliefert()
        rechner = Huellflaechenrechner(regeln: regeln)
    }

    /// Eine Referenzspanne aus der veröffentlichten Tabelle.
    private struct Spannwert {
        let baujahr: Int
        let von: Double
        let bis: Double
        let quelle: String
    }

    private func pruefe(
        _ bezeichnung: String,
        _ werte: [Spannwert],
        _ ausApp: (Int) -> Double,
        toleranz: Double = 0.0
    ) {
        for w in werte {
            let wert = ausApp(w.baujahr)
            let untergrenze = w.von * (1 - toleranz)
            let obergrenze = w.bis * (1 + toleranz)
            XCTAssertTrue(
                wert >= untergrenze && wert <= obergrenze,
                "\(bezeichnung), Baujahr \(w.baujahr): App \(Formate.zahl(wert, stellen: 2)) "
                + "liegt außerhalb von \(Formate.zahl(w.von, stellen: 2))–\(Formate.zahl(w.bis, stellen: 2)) "
                + "(\(w.quelle))"
            )
        }
    }

    private func gebaeude(_ baujahr: Int) -> Gebaeude {
        var g = Gebaeude(baujahr: baujahr)
        g.fassade = .ungedaemmt
        g.dach = .ungedaemmt
        g.kellerdecke = .ungedaemmt
        g.fensterBaujahr = baujahr
        return g
    }

    // MARK: Außenwand

    func testAussenwandLiegtInDerVeroeffentlichtenSpanne() {
        pruefe("Außenwand ungedämmt", [
            Spannwert(baujahr: 1910, von: 1.4, bis: 1.7, quelle: "bis 1918"),
            Spannwert(baujahr: 1935, von: 1.4, bis: 1.7, quelle: "1919–1948"),
            Spannwert(baujahr: 1960, von: 1.2, bis: 1.7, quelle: "1949–1968"),
            Spannwert(baujahr: 1975, von: 1.0, bis: 1.4, quelle: "1969–1978"),
            Spannwert(baujahr: 1988, von: 0.6, bis: 1.0, quelle: "1979–1994"),
            Spannwert(baujahr: 1998, von: 0.40, bis: 0.60, quelle: "1995–2001"),
            Spannwert(baujahr: 2020, von: 0.25, bis: 0.35, quelle: "ab 2002")
        ]) { rechner.uWert(fuer: .aussenwand, gebaeude: gebaeude($0)) }
    }

    // MARK: Fenster

    func testFensterLiegtInDerVeroeffentlichtenSpanne() {
        pruefe("Fenster", [
            Spannwert(baujahr: 1910, von: 4.5, bis: 5.5, quelle: "bis 1918"),
            Spannwert(baujahr: 1935, von: 3.0, bis: 5.0, quelle: "1919–1948"),
            Spannwert(baujahr: 1960, von: 2.8, bis: 3.5, quelle: "1949–1968"),
            Spannwert(baujahr: 1975, von: 2.8, bis: 3.0, quelle: "1969–1978"),
            Spannwert(baujahr: 1988, von: 2.7, bis: 3.0, quelle: "1979–1994"),
            Spannwert(baujahr: 1998, von: 1.4, bis: 1.8, quelle: "1995–2001"),
            Spannwert(baujahr: 2020, von: 0.90, bis: 1.40, quelle: "ab 2002")
        ]) { rechner.uWert(fuer: .fenster, gebaeude: gebaeude($0)) }
    }

    // MARK: Kellerdecke

    func testKellerdeckeLiegtInDerVeroeffentlichtenSpanne() {
        pruefe("Kellerdecke ungedämmt", [
            Spannwert(baujahr: 1910, von: 1.0, bis: 1.5, quelle: "bis 1918"),
            Spannwert(baujahr: 1960, von: 0.8, bis: 1.2, quelle: "1949–1968"),
            Spannwert(baujahr: 1975, von: 0.8, bis: 1.0, quelle: "1969–1978"),
            Spannwert(baujahr: 1988, von: 0.6, bis: 0.9, quelle: "1979–1994"),
            Spannwert(baujahr: 1998, von: 0.4, bis: 0.6, quelle: "1995–2001")
        ]) { rechner.uWert(fuer: .kellerdecke, gebaeude: gebaeude($0)) }
    }

    // MARK: Gedämmte Bauteile

    /// Ein nachträglich gedämmtes Bauteil muss den Anforderungswert des GEG
    /// treffen – 0,24 W/m²K für die oberste Geschossdecke ist die Zahl, die in
    /// § 47 steht und in der App als Anforderung genannt wird.
    func testGedaemmteBauteileTreffenDieAnforderungswerte() {
        var gedaemmt = Gebaeude(baujahr: 1968)
        gedaemmt.fassade = .gedaemmt
        gedaemmt.dach = .gedaemmt
        gedaemmt.kellerdecke = .gedaemmt

        XCTAssertLessThanOrEqual(rechner.uWert(fuer: .aussenwand, gebaeude: gedaemmt), 0.28)
        XCTAssertLessThanOrEqual(rechner.uWert(fuer: .dach, gebaeude: gedaemmt), 0.24)
        XCTAssertLessThanOrEqual(rechner.uWert(fuer: .kellerdecke, gebaeude: gedaemmt), 0.35)
    }

    /// Die Werte müssen mit dem Baujahr besser werden – lückenlos. Eine
    /// Staffel, die zwischendurch wieder schlechter wird, wäre ein Tippfehler,
    /// den niemand bemerkt.
    func testAlleStaffelnWerdenMonotonBesser() {
        let jahre = [1910, 1935, 1955, 1965, 1975, 1982, 1990, 1998, 2005, 2020]
        for art in [Flaechenart.aussenwand, .fenster, .kellerdecke, .bodenplatte] {
            let werte = jahre.map { rechner.uWert(fuer: art, gebaeude: gebaeude($0)) }
            for (a, b) in zip(werte, werte.dropFirst()) {
                XCTAssertLessThanOrEqual(b, a, "\(art.bezeichnung): \(werte)")
            }
        }
    }

    /// Was diese Prüfung **nicht** leistet, gehört ins Protokoll: Sie prüft
    /// Eingangswerte, nicht Ergebnisse. Solange keine realen Objekte
    /// hinterlegt sind, fehlt der eigentliche Beleg.
    func testDerEigentlicheBelegStehtNochAus() {
        guard !Referenzsammlung.istBelegt else { return }
        print("""

        ┌─────────────────────────────────────────────────────────────────┐
        │ Die U-Werte sind gegen veröffentlichte Spannen geprüft.         │
        │ Das prüft die EINGÄNGE der Rechnung, nicht ihr Ergebnis.        │
        │                                                                 │
        │ Für den Beleg fehlen noch \(Referenzsammlung.fehlendeObjekte) reale Objekte mit einer          │
        │ Heizlastberechnung nach DIN EN 12831.                           │
        │ Einzutragen in Referenzobjekt.swift → Referenzsammlung.objekte  │
        └─────────────────────────────────────────────────────────────────┘

        """)
    }
}
