import Foundation
import WerkeKern

/// Persistenz der Ablage.
///
/// Bewusst eine einzelne, versionierte JSON-Datei statt einer Datenbank: Das
/// Datenvolumen ist klein, die Fehlermöglichkeiten damit auch. Kein
/// Migrationsrisiko, alles offline.
///
/// Die Ablage selbst und ihre gesamte Ablauflogik liegen im Rechenkern und sind
/// dort mit Testfällen abgesichert – hier steht nur noch Lesen und Schreiben.
enum SpeicherFehler: Error {
    case keinVerzeichnis
}

struct Speicher {

    static let dateiname = "ablage.json"

    static func verzeichnis() throws -> URL {
        guard let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            throw SpeicherFehler.keinVerzeichnis
        }
        if !FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
        return url
    }

    static func dokumenteVerzeichnis() throws -> URL {
        let url = try verzeichnis().appendingPathComponent("Dokumente", isDirectory: true)
        if !FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
        return url
    }

    /// Eine beschädigte Ablage darf die App nie blockieren – im Zweifel wird
    /// mit einem leeren Zustand gestartet.
    ///
    /// Liegt in der iCloud eine **neuere** Fassung, gewinnt sie. Das ist der
    /// Fall nach einem Gerätewechsel: Die lokale Datei existiert dann noch gar
    /// nicht, und ohne diesen Griff stünde der Nutzer wieder am Einstieg.
    static func laden() -> Ablage {
        let lokal = ladeLokal()
        guard Voreinstellungen.icloudSicherung, let ausWolke = iCloud.laden() else { return lokal }

        // Verglichen wird über den Zeitstempel der Sicherung, nicht über die
        // Datenmenge: Wer auf dem neuen Gerät zuerst etwas einträgt und dann
        // die alte Sicherung überschrieben bekäme, verlöre genau das.
        guard ausWolke.gesichertAm > (lokalGesichertAm() ?? .distantPast) else { return lokal }
        sichereLokal(ausWolke.ablage)
        return ausWolke.ablage
    }

    static func sichern(_ ablage: Ablage) {
        sichereLokal(ablage)
        if Voreinstellungen.icloudSicherung {
            iCloud.sichern(ablage)
        }
    }

    private static func ladeLokal() -> Ablage {
        do {
            let url = try verzeichnis().appendingPathComponent(dateiname)
            guard FileManager.default.fileExists(atPath: url.path) else { return Ablage() }
            let daten = try Data(contentsOf: url)
            return try Ablagekodierung.dekodiere(daten)
        } catch {
            return Ablage()
        }
    }

    private static func sichereLokal(_ ablage: Ablage) {
        do {
            let url = try verzeichnis().appendingPathComponent(dateiname)
            let daten = try Ablagekodierung.kodiere(ablage)
            try daten.write(to: url, options: [.atomic, .completeFileProtection])
        } catch {
            #if DEBUG
            print("Ablage konnte nicht gesichert werden: \(error)")
            #endif
        }
    }

    private static func lokalGesichertAm() -> Date? {
        guard let url = try? verzeichnis().appendingPathComponent(dateiname),
              let werte = try? url.resourceValues(forKeys: [.contentModificationDateKey])
        else { return nil }
        return werte.contentModificationDate
    }

    /// Vollständiges Löschen – Umsetzung des Löschrechts, und in den
    /// Einstellungen jederzeit erreichbar.
    static func allesLoeschen() {
        if let datei = try? verzeichnis().appendingPathComponent(dateiname) {
            try? FileManager.default.removeItem(at: datei)
        }
        if let ordner = try? dokumenteVerzeichnis() {
            try? FileManager.default.removeItem(at: ordner)
        }
        iCloud.loeschen()
    }
}

// MARK: - Sicherung in der iCloud

/// Sicherung über den Schlüssel-Wert-Speicher der iCloud.
///
/// **Warum dieser Weg und nicht CloudKit.** Die Ablage ist eine JSON-Datei von
/// wenigen Kilobyte. Der Schlüssel-Wert-Speicher fasst ein Megabyte, gleicht
/// sich von selbst ab und braucht kein Schema, keine Migration und keinen
/// Server. Für Daten dieser Größe ist alles andere Aufwand ohne Gegenwert.
///
/// **Was WERK.E davon sieht: nichts.** Der Speicher gehört zum Apple-Konto des
/// Nutzers. Das Versprechen „Ihre Daten bleiben bei Ihnen“ bleibt damit wahr –
/// es heißt nur nicht mehr „und sind weg, wenn das Telefon wegkommt“.
enum iCloud {

    private static let schluessel = "werke.ablage"
    private static let zeitschluessel = "werke.ablage.gesichertAm"

    /// Dokumente werden **nicht** mitgesichert: Ein eingescannter
    /// Energieausweis sprengt das Megabyte, und eine Sicherung, die je nach
    /// Anhang scheitert, ist schlimmer als keine.
    static func sichern(_ ablage: Ablage) {
        guard let daten = try? Ablagekodierung.kodiere(ablage) else { return }
        guard daten.count < 900_000 else {
            #if DEBUG
            print("Ablage zu groß für die iCloud-Sicherung: \(daten.count) Bytes")
            #endif
            return
        }
        let speicher = NSUbiquitousKeyValueStore.default
        speicher.set(daten, forKey: schluessel)
        speicher.set(Date().timeIntervalSince1970, forKey: zeitschluessel)
        speicher.synchronize()
    }

    static func laden() -> (ablage: Ablage, gesichertAm: Date)? {
        let speicher = NSUbiquitousKeyValueStore.default
        guard let daten = speicher.data(forKey: schluessel),
              let ablage = try? Ablagekodierung.dekodiere(daten) else { return nil }
        let zeit = speicher.double(forKey: zeitschluessel)
        return (ablage, Date(timeIntervalSince1970: zeit))
    }

    static func loeschen() {
        let speicher = NSUbiquitousKeyValueStore.default
        speicher.removeObject(forKey: schluessel)
        speicher.removeObject(forKey: zeitschluessel)
        speicher.synchronize()
    }

    static var letzteSicherung: Date? {
        let zeit = NSUbiquitousKeyValueStore.default.double(forKey: zeitschluessel)
        return zeit > 0 ? Date(timeIntervalSince1970: zeit) : nil
    }
}
