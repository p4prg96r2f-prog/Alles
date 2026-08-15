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
    static func laden() -> Ablage {
        do {
            let url = try verzeichnis().appendingPathComponent(dateiname)
            guard FileManager.default.fileExists(atPath: url.path) else { return Ablage() }
            let daten = try Data(contentsOf: url)
            return try Ablagekodierung.dekodiere(daten)
        } catch {
            return Ablage()
        }
    }

    static func sichern(_ ablage: Ablage) {
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

    /// Vollständiges Löschen – Umsetzung des Löschrechts, und in den
    /// Einstellungen jederzeit erreichbar.
    static func allesLoeschen() {
        if let datei = try? verzeichnis().appendingPathComponent(dateiname) {
            try? FileManager.default.removeItem(at: datei)
        }
        if let ordner = try? dokumenteVerzeichnis() {
            try? FileManager.default.removeItem(at: ordner)
        }
    }
}
