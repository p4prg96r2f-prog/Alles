import Foundation
import WerkeKern

/// Holt neuere Regelpakete, wenn Netz da ist – und stört nie, wenn keines da ist.
///
/// Die App rechnet immer mit dem, was lokal liegt. Ein Aktualisierungsversuch,
/// der scheitert, hat keinerlei sichtbare Folge.
enum Regelpaketdienst {

    /// Adresse, unter der WERK.E das jeweils aktuelle Regelpaket bereitstellt.
    /// Vor Veröffentlichung auf die echte Adresse setzen.
    static let quelle = URL(string: "https://werk-e.de/app/regelpaket.json")!

    private static let dateiname = "regelpaket-aktuell.json"

    private static func ablageort() -> URL? {
        try? Speicher.verzeichnis().appendingPathComponent(dateiname)
    }

    /// Bereits heruntergeladene Fassung, sofern sie neuer ist als die vorhandene.
    static func gespeichertesPaket(nichtAelterAls bestehende: Regelpaket) -> Regelpaket? {
        guard let url = ablageort(),
              FileManager.default.fileExists(atPath: url.path),
              let daten = try? Data(contentsOf: url) else { return nil }
        return try? Regelpaketlader.laden(von: daten, nichtAelterAls: bestehende)
    }

    /// Lädt eine neuere Fassung. Gibt `nil` zurück, wenn nichts Neues vorliegt
    /// oder kein Netz da ist – beides ist ein normaler Zustand, kein Fehler.
    static func laden(nichtAelterAls bestehende: Regelpaket) async -> Regelpaket? {
        var anfrage = URLRequest(url: quelle)
        anfrage.timeoutInterval = 10
        anfrage.cachePolicy = .reloadIgnoringLocalCacheData

        guard let (daten, antwort) = try? await URLSession.shared.data(for: anfrage),
              let http = antwort as? HTTPURLResponse, http.statusCode == 200,
              let paket = try? Regelpaketlader.laden(von: daten, nichtAelterAls: bestehende)
        else { return nil }

        if let url = ablageort() {
            try? daten.write(to: url, options: [.atomic, .completeFileProtection])
        }
        return paket
    }
}
