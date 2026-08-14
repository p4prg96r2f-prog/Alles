import Foundation
import Vision
import UIKit
import WerkeKern

/// Texterkennung auf dem Gerät.
///
/// Läuft über das Vision-Framework und funktioniert damit auf **allen**
/// unterstützten Geräten – ohne Apple Intelligence, ohne Netz, und ohne dass
/// ein Bild das Telefon verlässt.
///
/// Die Auswertung der erkannten Zeilen liegt bewusst im Rechenkern
/// (`Zaehlerablesung`) und ist dort mit Testfällen abgesichert. Hier bleibt nur
/// die Anbindung an die Kamera.
enum Texterkennung {

    struct Fund {
        let text: String
        let vertrauen: Float
    }

    /// Erkennt allen Text in einem Bild.
    static func texte(in bild: UIImage) async -> [Fund] {
        guard let cg = bild.cgImage else { return [] }

        return await withCheckedContinuation { fortsetzung in
            let anfrage = VNRecognizeTextRequest { anfrage, _ in
                let beobachtungen = (anfrage.results as? [VNRecognizedTextObservation]) ?? []
                let funde: [Fund] = beobachtungen.compactMap { beobachtung in
                    guard let beste = beobachtung.topCandidates(1).first else { return nil }
                    return Fund(text: beste.string, vertrauen: beste.confidence)
                }
                fortsetzung.resume(returning: funde)
            }
            anfrage.recognitionLevel = .accurate
            anfrage.usesLanguageCorrection = false      // Zählerstände sind keine Wörter
            anfrage.recognitionLanguages = ["de-DE"]

            let bearbeiter = VNImageRequestHandler(cgImage: cg, orientation: .up)
            do {
                try bearbeiter.perform([anfrage])
            } catch {
                fortsetzung.resume(returning: [])
            }
        }
    }

    /// Sucht in einem Bild nach einem plausiblen Zählerstand.
    static func zaehlerstand(in bild: UIImage) async -> Double? {
        let funde = await texte(in: bild)
        return Zaehlerablesung.zaehlerstand(ausTexten: funde.map(\.text))
    }

    /// Liest ein Heizungs-Typenschild aus.
    static func heizungsangaben(in bild: UIImage) async -> (hersteller: String?, baujahr: Int?) {
        let funde = await texte(in: bild)
        let jahr = Calendar(identifier: .gregorian).component(.year, from: Date())
        return Zaehlerablesung.heizungsangaben(ausTexten: funde.map(\.text), aktuellesJahr: jahr)
    }
}
