import Foundation
import WerkeKern

/// Der gespeicherte Zustand der App.
///
/// Bewusst eine einzelne, versionierte JSON-Datei statt einer Datenbank:
/// Das Datenvolumen ist klein (ein Gebäude, Zählerstände, Berechnungen), die
/// Fehlermöglichkeiten sind es damit auch. Kein Migrationsrisiko, alles offline,
/// vollständig testbar. Ein Wechsel auf SwiftData bleibt jederzeit möglich –
/// die Modelle sind reine Codable-Typen.
struct Ablage: Codable {
    var schemaVersion: Int = 1
    var gebaeude: Gebaeude?
    var haushalt: Haushalt = Haushalt()
    var massnahmen: [Massnahme] = []
    var zaehlerstaende: [Zaehlerstand] = []
    var heizkoerper: [Heizkoerper] = []
    var dokumente: [Dokument] = []
    var berechnungen: [GespeicherteBerechnung] = []
    var verlauf: [Verlaufseintrag] = []
    var einstiegAbgeschlossen: Bool = false
}

struct Dokument: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var titel: String
    var dateiname: String
    var angelegt: Date
    var art: Dokumentart

    enum Dokumentart: String, Codable, CaseIterable {
        case energieausweis
        case sanierungsfahrplan
        case foerderbescheid
        case rechnung
        case angebot
        case foto
        case sonstiges

        var bezeichnung: String {
            switch self {
            case .energieausweis: return "Energieausweis"
            case .sanierungsfahrplan: return "Sanierungsfahrplan"
            case .foerderbescheid: return "Förderbescheid"
            case .rechnung: return "Rechnung"
            case .angebot: return "Angebot"
            case .foto: return "Foto"
            case .sonstiges: return "Sonstiges"
            }
        }

        var symbol: String {
            switch self {
            case .energieausweis: return "doc.text"
            case .sanierungsfahrplan: return "map"
            case .foerderbescheid: return "checkmark.seal"
            case .rechnung: return "eurosign.circle"
            case .angebot: return "doc.plaintext"
            case .foto: return "photo"
            case .sonstiges: return "paperclip"
            }
        }
    }
}

/// Eine Berechnung wird mit ihrer Regelversion abgelegt. Nur so ist sie Jahre
/// später noch erklärbar, wenn sich die Förderung mehrfach geändert hat.
struct GespeicherteBerechnung: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var datum: Date
    var art: String
    var kurzfassung: String
    var regelVersion: Int
    var regelStand: String
}

struct Verlaufseintrag: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var datum: Date
    var text: String
    var symbol: String
}

// MARK: - Persistenz

enum SpeicherFehler: Error {
    case keinVerzeichnis
}

/// Schreibt und liest die Ablage. Alles atomar und mit Dateischutz, weil hier
/// Gebäude- und Verbrauchsdaten liegen.
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

    static func laden() -> Ablage {
        do {
            let url = try verzeichnis().appendingPathComponent(dateiname)
            guard FileManager.default.fileExists(atPath: url.path) else { return Ablage() }
            let daten = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(Ablage.self, from: daten)
        } catch {
            // Eine beschädigte Ablage darf die App nicht blockieren.
            return Ablage()
        }
    }

    static func sichern(_ ablage: Ablage) {
        do {
            let url = try verzeichnis().appendingPathComponent(dateiname)
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let daten = try encoder.encode(ablage)
            try daten.write(to: url, options: [.atomic, .completeFileProtection])
        } catch {
            #if DEBUG
            print("Ablage konnte nicht gesichert werden: \(error)")
            #endif
        }
    }

    /// Vollständiges Löschen – Pflicht, sobald Konten möglich sind, und
    /// unabhängig davon die saubere Umsetzung des Auskunfts- und Löschrechts.
    static func allesLoeschen() {
        let pfade = [try? verzeichnis().appendingPathComponent(dateiname),
                     try? dokumenteVerzeichnis()]
        for pfad in pfade.compactMap({ $0 }) {
            try? FileManager.default.removeItem(at: pfad)
        }
    }
}
