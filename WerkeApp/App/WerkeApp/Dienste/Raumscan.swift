import Foundation
import SwiftUI
import WerkeKern

#if canImport(RoomPlan)
import RoomPlan
#endif

/// Raumaufmaß per Laserscan.
///
/// **Was der Scan liefert und was nicht.**
/// Er misst Wandlängen und Öffnungen auf wenige Zentimeter genau – das sind
/// unter zwei Prozent und damit weit besser, als die Heizlast es braucht. Er
/// weiß aber **nicht**, ob eine Wand nach außen zeigt, an einen unbeheizten
/// Raum grenzt oder an den Nachbarraum. Diese eine Angabe muss der Mensch
/// machen; sie kostet vier Fingertipps je Raum.
///
/// Deshalb ist der Scan hier ein **Aufmaß-Beschleuniger**, keine Automatik. Er
/// ersetzt das Ausmessen, nicht das Fachurteil.
enum Raumscan {

    /// Nur Geräte mit Laserscanner – also die Pro-Modelle. Für die Kundenseite
    /// darf davon nichts abhängen.
    static var unterstuetzt: Bool {
        #if canImport(RoomPlan)
        if #available(iOS 17.0, *) {
            return RoomCaptureSession.isSupported
        }
        #endif
        return false
    }
}

#if canImport(RoomPlan)

// MARK: - Aufnahme

@available(iOS 17.0, *)
struct RaumscanAufnahme: UIViewRepresentable {

    let fertig: (CapturedRoom) -> Void
    @Binding var laueft: Bool

    func makeUIView(context: Context) -> RoomCaptureView {
        let ansicht = RoomCaptureView(frame: .zero)
        ansicht.captureSession.delegate = context.coordinator
        ansicht.delegate = context.coordinator
        context.coordinator.ansicht = ansicht
        ansicht.captureSession.run(configuration: RoomCaptureSession.Configuration())
        return ansicht
    }

    func updateUIView(_ ansicht: RoomCaptureView, context: Context) {
        if !laueft {
            ansicht.captureSession.stop()
        }
    }

    func makeCoordinator() -> Vermittler {
        Vermittler(fertig: fertig)
    }

    final class Vermittler: NSObject, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {
        weak var ansicht: RoomCaptureView?
        private let fertig: (CapturedRoom) -> Void

        init(fertig: @escaping (CapturedRoom) -> Void) {
            self.fertig = fertig
        }

        func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool {
            error == nil
        }

        func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
            guard error == nil else { return }
            fertig(processedResult)
        }
    }
}

// MARK: - Umwandlung in ein Aufmaß

@available(iOS 17.0, *)
extension Raumscan {

    /// Wandelt einen Scan in Flächen um.
    ///
    /// Bewusst ohne Automatik bei der Zuordnung: Jede Fläche kommt **ohne**
    /// Grenze heraus (`grenze: nil`) und wartet auf den Menschen. Erst wenn er
    /// sie zugeordnet hat, entsteht ein Ergebnis. Lieber vier Tipps als eine
    /// falsche Zahl.
    ///
    /// Wichtig ist, dass „noch nicht zugeordnet“ ein eigener Wert ist und nicht
    /// durch `beheizt` mitvertreten wird: Sonst wäre die wahrheitsgemäße
    /// Antwort „grenzt an den Flur“ von „unbeantwortet“ nicht zu unterscheiden,
    /// und der Scan-Weg endete nie in einem Ergebnis.
    static func inRaum(_ scan: CapturedRoom, name: String) -> Raum {

        let waende = scan.walls.map { flaeche($0) }
        let fenster = scan.windows.map { flaeche($0) }
        let tueren = scan.doors.map { flaeche($0) }
        let oeffnungen = scan.openings.map { flaeche($0) }

        // Öffnungen und Fenster sitzen in den Wänden – ihre Fläche darf nicht
        // doppelt zählen.
        let abzug = fenster.reduce(0, +) + tueren.reduce(0, +) + oeffnungen.reduce(0, +)
        let wandflaecheGesamt = waende.reduce(0, +)
        let anteilNetto = wandflaecheGesamt > 0
            ? max(0, (wandflaecheGesamt - abzug) / wandflaecheGesamt)
            : 1

        var flaechen: [Huellflaeche] = waende.map {
            Huellflaeche(art: .aussenwand, quadratmeter: $0 * anteilNetto, grenze: nil)
        }
        flaechen += fenster.map { Huellflaeche(art: .fenster, quadratmeter: $0, grenze: nil) }
        flaechen += tueren.map { Huellflaeche(art: .tuer, quadratmeter: $0, grenze: nil) }

        let grundflaeche = grundflaecheAusWaenden(scan)
        let hoehe = mittlereHoehe(scan)

        // Boden und Decke gehören dazu, ihre Zuordnung macht ebenfalls der Mensch.
        flaechen.append(Huellflaeche(art: .kellerdecke, quadratmeter: grundflaeche, grenze: nil))
        flaechen.append(Huellflaeche(art: .decke, quadratmeter: grundflaeche, grenze: nil))

        return Raum(
            name: name,
            grundflaeche: grundflaeche,
            raumhoehe: hoehe,
            solltemperatur: Raum.solltemperatur(fuerRaumname: name),
            flaechen: flaechen
        )
    }

    private static func flaeche(_ oberflaeche: CapturedRoom.Surface) -> Double {
        Double(oberflaeche.dimensions.x * oberflaeche.dimensions.y)
    }

    /// Grundfläche aus der Ausdehnung der Wandmittelpunkte. Für rechteckige
    /// Räume genau, für verwinkelte großzügig – deshalb wird sie dem Nutzer zur
    /// Bestätigung gezeigt.
    private static func grundflaecheAusWaenden(_ scan: CapturedRoom) -> Double {
        let punkte = scan.walls.map { wand -> (x: Double, z: Double) in
            let lage = wand.transform.columns.3
            return (Double(lage.x), Double(lage.z))
        }
        guard punkte.count >= 2 else { return 0 }

        let minX = punkte.map(\.x).min() ?? 0
        let maxX = punkte.map(\.x).max() ?? 0
        let minZ = punkte.map(\.z).min() ?? 0
        let maxZ = punkte.map(\.z).max() ?? 0

        return max(0, (maxX - minX) * (maxZ - minZ))
    }

    private static func mittlereHoehe(_ scan: CapturedRoom) -> Double {
        let hoehen = scan.walls.map { Double($0.dimensions.y) }.filter { $0 > 1.5 && $0 < 6 }
        guard !hoehen.isEmpty else { return 2.5 }
        return hoehen.reduce(0, +) / Double(hoehen.count)
    }
}

#endif
