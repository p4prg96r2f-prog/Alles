import Foundation
import Combine
import WerkeKern

/// Der zentrale Zustand der App.
///
/// Bewusst dünn: Die gesamte Ablauflogik liegt in `Ablage` im Rechenkern und ist
/// dort mit Testfällen abgesichert. Hier steht nur die Anbindung an SwiftUI und
/// das Sichern nach jeder Änderung – **es gibt keinen Speichern-Knopf**.
@MainActor
final class AppZustand: ObservableObject {

    @Published private(set) var ablage: Ablage
    @Published private(set) var regeln: Regelpaket

    init(ablage: Ablage? = nil, regeln: Regelpaket? = nil) {
        self.ablage = ablage ?? Speicher.laden()

        if let regeln {
            self.regeln = regeln
        } else {
            // `standard` fällt bei Bedarf auf eine eingebettete Fassung zurück
            // und kann deshalb nicht scheitern – abgesichert durch die Kern-Tests.
            var paket = Regelpaketlader.standard
            if let neuer = Regelpaketdienst.gespeichertesPaket(nichtAelterAls: paket) {
                paket = neuer
            }
            self.regeln = paket
        }
    }

    // MARK: Rechner

    var foerderrechner: Foerderrechner { Foerderrechner(regeln: regeln) }
    var heizlastrechner: Heizlastrechner { Heizlastrechner(regeln: regeln) }
    var co2rechner: CO2Rechner { CO2Rechner(regeln: regeln) }
    var gmodgPruefung: GModGPruefung { GModGPruefung(regeln: regeln) }

    /// Heizlast aus den ohnehin erfassten Zählerständen. Braucht keine einzige
    /// zusätzliche Eingabe und wird mit jeder Ablesung genauer.
    func energiesignatur(art: Zaehlerart = .gas, kesselart: Kesselart = .standardkessel) -> Energiesignatur? {
        guard let region = regeln.klimaregion(fuerPLZ: gebaeude?.plz ?? "") else { return nil }
        let brennstoff: Brennstoff
        switch art {
        case .gas: brennstoff = .gasKubikmeter
        case .strom, .waerme: brennstoff = .fernwaermeKilowattstunden
        case .wasser: return nil
        }
        return heizlastrechner.ausZaehlerstaenden(
            ablage.zaehlerstaende, art: art, brennstoff: brennstoff,
            kesselart: kesselart, region: region
        )
    }

    /// Die Heizlast, die die App gerade am besten kennt – samt Herkunft.
    ///
    /// Es gibt mehrere Wege zur selben Zahl, und sie sind unterschiedlich gut.
    /// Wenn die App an einer Stelle den gemessenen Wert zeigt und an anderer
    /// den groben Kennwert nach Baujahr, sieht der Unterschied wie ein Fehler
    /// aus – dabei ist es nur ein veralteter Blick. Deshalb fragt jede Ansicht,
    /// die eine Heizlast anzeigt, hier nach.
    struct Heizlastueberblick {
        let spanne: Spanne
        let quelle: String
        /// Ist der Wert gemessen oder aus Kennwerten geschätzt?
        let gemessen: Bool
    }

    var besteHeizlast: Heizlastueberblick? {
        if let signatur = energiesignatur() {
            return Heizlastueberblick(
                spanne: signatur.heizlast,
                quelle: "aus Ihren Ablesungen",
                gemessen: true
            )
        }
        guard let gebaeude else { return nil }
        return Heizlastueberblick(
            spanne: heizlastrechner.ausGebaeudedaten(gebaeude).spanne,
            quelle: "aus den Gebäudeangaben",
            gemessen: false
        )
    }

    // MARK: Die eine nächste Aufgabe

    var naechsteAufgabe: Aufgabe {
        Aufgabe.naechste(ablage: ablage, regeln: regeln)
    }

    // MARK: Gebäude

    var gebaeude: Gebaeude? { ablage.gebaeude }
    var brauchtEinstieg: Bool { ablage.brauchtEinstieg }

    func setzeGebaeude(_ neu: Gebaeude) {
        aendere { $0.gebaeude = neu }
    }

    func aendereGebaeude(_ block: (inout Gebaeude) -> Void) {
        guard var g = ablage.gebaeude else { return }
        block(&g)
        aendere { $0.gebaeude = g }
    }

    func einstiegAbschliessen(mit gebaeude: Gebaeude) {
        aendere { $0.schliesseEinstiegAb(mit: gebaeude) }
    }

    // MARK: Maßnahmen und Haushalt

    var massnahmen: [Massnahme] { ablage.massnahmen }
    var haushalt: Haushalt { ablage.haushalt }

    func setzeMassnahmen(_ neu: [Massnahme]) {
        aendere { $0.massnahmen = neu }
    }

    func setzeHaushalt(_ neu: Haushalt) {
        aendere { $0.haushalt = neu }
    }

    // MARK: Zählerstände

    var zaehlerstaende: [Zaehlerstand] { ablage.zaehlerstaendeNeuesteZuerst }
    var monateMitZaehlerstand: Int { ablage.zusammenhaengendeMonate() }
    var brauchtZaehlerstandDiesenMonat: Bool { ablage.brauchtZaehlerstand() }

    func letzterStand(art: Zaehlerart) -> Zaehlerstand? {
        ablage.letzterStand(art: art)
    }

    func ergaenzeZaehlerstand(_ stand: Zaehlerstand) {
        aendere { $0.ergaenze(stand) }
    }

    func loescheZaehlerstand(_ id: UUID) {
        aendere { $0.loescheZaehlerstand(id) }
    }

    // MARK: Heizkörper

    var heizkoerper: [Heizkoerper] { ablage.heizkoerper }

    func setzeHeizkoerper(_ neu: [Heizkoerper]) {
        aendere { $0.heizkoerper = neu }
    }

    // MARK: Dokumente

    var dokumente: [Dokument] { ablage.dokumenteNeuesteZuerst }

    func ergaenzeDokument(_ dokument: Dokument) {
        aendere { $0.ergaenze(dokument) }
    }

    func loescheDokument(_ id: UUID) {
        if let dokument = ablage.dokumente.first(where: { $0.id == id }),
           let ordner = try? Speicher.dokumenteVerzeichnis() {
            try? FileManager.default.removeItem(at: ordner.appendingPathComponent(dokument.dateiname))
        }
        aendere { $0.loescheDokument(id) }
    }

    // MARK: Berechnungen und Verlauf

    var berechnungen: [GespeicherteBerechnung] { ablage.berechnungenNeuesteZuerst }
    var verlauf: [Verlaufseintrag] { ablage.verlaufNeuesteZuerst }

    func merkeBerechnung(art: String, kurzfassung: String, version: Int, stand: String) {
        aendere {
            $0.merkeBerechnung(art: art, kurzfassung: kurzfassung,
                               regelVersion: version, regelStand: stand)
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

    private func aendere(_ block: (inout Ablage) -> Void) {
        block(&ablage)
        Speicher.sichern(ablage)
    }
}
