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

    /// Welcher Zähler misst die Heizung dieses Hauses?
    ///
    /// Fest auf Gas zu rechnen war ein Fehler mit sichtbarer Folge: Wer als
    /// Wärmepumpenbesitzer vierzehn Monate lang den Stromzähler erfasst,
    /// bekommt die Signatur nicht – und als Begründung „Sie brauchen fünf
    /// Ablesungen, Sie haben 14“.
    var heizungszaehler: Zaehlerart {
        switch gebaeude?.heizungsart {
        case .waermepumpe, .nachtspeicher: return .strom
        case .fernwaerme: return .waerme
        default: return .gas
        }
    }

    /// Wie viele Ablesungen des **heizungsrelevanten** Zählers liegen vor?
    var ablesungenFuerHeizung: Int {
        ablage.zaehlerstaende.filter { $0.art == heizungszaehler }.count
    }

    /// Heizlast aus den ohnehin erfassten Zählerständen. Braucht keine einzige
    /// zusätzliche Eingabe und wird mit jeder Ablesung genauer.
    func energiesignatur(art: Zaehlerart? = nil, kesselart: Kesselart = .standardkessel) -> Energiesignatur? {
        let art = art ?? heizungszaehler
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

    /// Warum liefert die Energiesignatur gerade kein Ergebnis?
    ///
    /// Die Begründung wird aus derselben Prüfung abgeleitet, die auch das
    /// Ergebnis erzeugt. Ein Sperrgrund, der eine Zahl nennt, die der Nutzer
    /// auf demselben Bildschirm widerlegen kann, kostet mehr Vertrauen als die
    /// gesperrte Funktion wert ist.
    var signaturSperrgrund: String? {
        guard energiesignatur() == nil else { return nil }
        let passend = ablesungenFuerHeizung
        let gesamt = ablage.zaehlerstaende.count

        if passend < 5 && gesamt > passend {
            return "Dafür werden Ablesungen des \(heizungszaehler.bezeichnung)zählers gebraucht – erfasst sind bisher \(passend). Insgesamt liegen \(gesamt) Ablesungen vor."
        }
        if passend < 5 {
            return "Dafür braucht es mindestens fünf Ablesungen des \(heizungszaehler.bezeichnung)zählers. Sie haben \(passend)."
        }
        return "Die vorliegenden Ablesungen ergeben noch kein belastbares Bild – meist fehlen Werte aus der Heizperiode oder ein Zeitraum ist unplausibel."
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

    // MARK: Nachtmessungen

    /// Nächte werden gespeichert, nicht nur angezeigt. Der Weg verlangt
    /// mehrere Nächte für ein belastbares Ergebnis – und eine kalte Nacht,
    /// deren Zählerstände verloren sind, lässt sich nicht nachholen.
    var nachtmessungen: [Nachtmessung] { ablage.nachtmessungen }

    func ergaenzeNachtmessung(_ messung: Nachtmessung) {
        aendere { $0.nachtmessungen.append(messung) }
    }

    func loescheNachtmessungen(_ ids: Set<UUID>) {
        aendere { $0.nachtmessungen.removeAll { ids.contains($0.id) } }
    }

    // MARK: Dokumente

    var dokumente: [Dokument] { ablage.dokumenteNeuesteZuerst }

    func ergaenzeDokument(_ dokument: Dokument) {
        aendere { $0.ergaenze(dokument) }
    }

    /// Übernimmt eine Datei in die Ablage der App.
    ///
    /// Kopiert wird bewusst, statt auf die Quelle zu verweisen: Ein Dokument in
    /// „Mein Haus“ muss auch dann noch da sein, wenn der Nutzer die Datei aus
    /// seiner Mail gelöscht hat. Der Zugriff auf die Quelle ist zeitlich
    /// begrenzt – deshalb die Sicherheitsklammer.
    @discardableResult
    func uebernehmeDokument(von quelle: URL, titel: String, art: Dokument.Dokumentart) -> Bool {
        let brauchtFreigabe = quelle.startAccessingSecurityScopedResource()
        defer { if brauchtFreigabe { quelle.stopAccessingSecurityScopedResource() } }

        guard let ordner = try? Speicher.dokumenteVerzeichnis() else { return false }
        let endung = quelle.pathExtension.isEmpty ? "dat" : quelle.pathExtension
        let dateiname = "\(UUID().uuidString).\(endung)"
        let ziel = ordner.appendingPathComponent(dateiname)

        do {
            try FileManager.default.copyItem(at: quelle, to: ziel)
        } catch {
            return false
        }

        let name = titel.trimmingCharacters(in: .whitespaces)
        ergaenzeDokument(Dokument(
            titel: name.isEmpty ? quelle.deletingPathExtension().lastPathComponent : name,
            dateiname: dateiname,
            angelegt: Date(),
            art: art
        ))
        return true
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
