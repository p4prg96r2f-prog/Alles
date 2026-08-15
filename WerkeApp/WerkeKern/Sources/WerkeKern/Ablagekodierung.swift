import Foundation

/// Ein einziger Ort für das Datenformat der Ablage.
///
/// Liegt im Kern, damit Schreiben und Lesen in Testfällen genauso ablaufen wie
/// auf dem Gerät – einschließlich Datumsformat und Abweisen kaputter Dateien.
public enum Ablagekodierung {

    public static func kodiere(_ ablage: Ablage) throws -> Data {
        let kodierer = JSONEncoder()
        kodierer.dateEncodingStrategy = .iso8601
        kodierer.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try kodierer.encode(ablage)
    }

    public static func dekodiere(_ daten: Data) throws -> Ablage {
        let dekodierer = JSONDecoder()
        dekodierer.dateDecodingStrategy = .iso8601
        return try dekodierer.decode(Ablage.self, from: daten)
    }

    /// Wie die App beim Start vorgeht: Eine unlesbare Datei führt zu einem
    /// leeren Zustand, niemals zu einem Absturz.
    public static func dekodiereNachsichtig(_ daten: Data?) -> Ablage {
        guard let daten else { return Ablage() }
        return (try? dekodiere(daten)) ?? Ablage()
    }
}
