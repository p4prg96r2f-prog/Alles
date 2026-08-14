import Foundation
import Combine
import WerkeKern

/// Der zentrale Zustand der App.
///
/// Wichtige Eigenschaft: Es gibt **keinen Speichern-Knopf**. Jede Änderung wird
/// unmittelbar abgelegt.
@MainActor
final class AppZustand: ObservableObject {

    @Published private(set) var ablage: Ablage
    @Published private(set) var regeln: Regelpaket

    init() {
        self.ablage = Speicher.laden()
        // `standard` fällt bei Bedarf auf eine eingebettete Fassung zurück und
        // kann deshalb nicht scheitern – abgesichert durch die Kern-Tests.
        var paket = Regelpaketlader.standard
        // Eine bereits nachgeladene, neuere Fassung hat Vorrang.
        if let neuer = Regelpaketdienst.gespeichertesPaket(nichtAelterAls: paket) {
            paket = neuer
        }
        self.regeln = paket
    }

    // MARK: Rechner

    var foerderrechner: Foerderrechner { Foerderrechner(regeln: regeln) }
    var heizlastrechner: Heizlastrechner { Heizlastrechner(regeln: regeln) }
    var co2rechner: CO2Rechner { CO2Rechner(regeln: regeln) }
    var gmodgPruefung: GModGPruefung { GModGPruefung(regeln: regeln) }

    // MARK: Gebäude

    var gebaeude: Gebaeude? { ablage.gebaeude }

    func setzeGebaeude(_ neu: Gebaeude) {
        ablage.gebaeude = neu
        sichern()
    }

    func aendereGebaeude(_ block: (inout Gebaeude) -> Void) {
        guard var g = ablage.gebaeude else { return }
        block(&g)
        ablage.gebaeude = g
        sichern()
    }

    func einstiegAbschliessen() {
        ablage.einstiegAbgeschlossen = true
        merkeImVerlauf("Haus angelegt", symbol: "house")
        sichern()
    }

    var brauchtEinstieg: Bool {
        ablage.gebaeude == nil || !ablage.einstiegAbgeschlossen
    }

    // MARK: Maßnahmen

    var massnahmen: [Massnahme] { ablage.massnahmen }

    func setzeMassnahmen(_ neu: [Massnahme]) {
        ablage.massnahmen = neu
        sichern()
    }

    // MARK: Haushalt

    var haushalt: Haushalt { ablage.haushalt }

    func setzeHaushalt(_ neu: Haushalt) {
        ablage.haushalt = neu
        sichern()
    }

    // MARK: Zählerstände

    var zaehlerstaende: [Zaehlerstand] {
        ablage.zaehlerstaende.sorted { $0.datum > $1.datum }
    }

    func ergaenzeZaehlerstand(_ stand: Zaehlerstand) {
        ablage.zaehlerstaende.append(stand)
        merkeImVerlauf("Zählerstand \(monatsname(stand.datum)) erfasst", symbol: "gauge.medium")
        sichern()
    }

    func loescheZaehlerstand(_ id: UUID) {
        ablage.zaehlerstaende.removeAll { $0.id == id }
        sichern()
    }

    /// Wie viele zusammenhängende Monate mit mindestens einem Wert liegen vor?
    /// Grundlage für die Vorbereitung eines Verbrauchsausweises.
    var monateMitZaehlerstand: Int {
        let kalender = Calendar(identifier: .gregorian)
        let monate = Set(ablage.zaehlerstaende.map { stand -> DateComponents in
            kalender.dateComponents([.year, .month], from: stand.datum)
        }.compactMap { komponenten -> Int? in
            guard let jahr = komponenten.year, let monat = komponenten.month else { return nil }
            return jahr * 12 + monat
        })
        guard let letzter = monate.max() else { return 0 }

        var laenge = 0
        var zeiger = letzter
        while monate.contains(zeiger) {
            laenge += 1
            zeiger -= 1
        }
        return laenge
    }

    var brauchtZaehlerstandDiesenMonat: Bool {
        let kalender = Calendar(identifier: .gregorian)
        let jetzt = kalender.dateComponents([.year, .month], from: Date())
        return !ablage.zaehlerstaende.contains { stand in
            let s = kalender.dateComponents([.year, .month], from: stand.datum)
            return s.year == jetzt.year && s.month == jetzt.month
        }
    }

    // MARK: Heizkörper

    var heizkoerper: [Heizkoerper] { ablage.heizkoerper }

    func setzeHeizkoerper(_ neu: [Heizkoerper]) {
        ablage.heizkoerper = neu
        sichern()
    }

    // MARK: Dokumente

    var dokumente: [Dokument] {
        ablage.dokumente.sorted { $0.angelegt > $1.angelegt }
    }

    func ergaenzeDokument(_ dokument: Dokument) {
        ablage.dokumente.append(dokument)
        merkeImVerlauf("\(dokument.art.bezeichnung) abgelegt", symbol: dokument.art.symbol)
        sichern()
    }

    func loescheDokument(_ id: UUID) {
        if let dokument = ablage.dokumente.first(where: { $0.id == id }),
           let ordner = try? Speicher.dokumenteVerzeichnis() {
            try? FileManager.default.removeItem(at: ordner.appendingPathComponent(dokument.dateiname))
        }
        ablage.dokumente.removeAll { $0.id == id }
        sichern()
    }

    // MARK: Berechnungen und Verlauf

    var berechnungen: [GespeicherteBerechnung] {
        ablage.berechnungen.sorted { $0.datum > $1.datum }
    }

    func merkeBerechnung(art: String, kurzfassung: String, version: Int, stand: String) {
        ablage.berechnungen.append(GespeicherteBerechnung(
            datum: Date(), art: art, kurzfassung: kurzfassung,
            regelVersion: version, regelStand: stand
        ))
        merkeImVerlauf("\(art) gesichert", symbol: "square.and.arrow.down")
        sichern()
    }

    var verlauf: [Verlaufseintrag] {
        Array(ablage.verlauf.sorted { $0.datum > $1.datum }.prefix(12))
    }

    private func merkeImVerlauf(_ text: String, symbol: String) {
        ablage.verlauf.append(Verlaufseintrag(datum: Date(), text: text, symbol: symbol))
        if ablage.verlauf.count > 100 {
            ablage.verlauf.removeFirst(ablage.verlauf.count - 100)
        }
    }

    // MARK: Regelpaket

    func aktualisiereRegelpaket() async {
        if let neu = await Regelpaketdienst.laden(nichtAelterAls: regeln) {
            regeln = neu
        }
    }

    // MARK: Zurücksetzen

    func allesLoeschen() {
        Speicher.allesLoeschen()
        ablage = Ablage()
    }

    // MARK: Intern

    private func sichern() {
        Speicher.sichern(ablage)
    }

    private func monatsname(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "LLLL"
        return f.string(from: datum)
    }
}
