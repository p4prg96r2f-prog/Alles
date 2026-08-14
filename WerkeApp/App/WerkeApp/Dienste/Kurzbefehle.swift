import AppIntents
import SwiftUI

/// Kurzbefehle und Siri.
///
/// „Hey Siri, Zählerstand erfassen“ öffnet direkt die Kamera-Ansicht. Das ist
/// der Unterschied zwischen einer monatlichen Pflichtübung und einer Sache von
/// dreißig Sekunden – und einer der Gründe, warum diese App eine App ist und
/// keine Website.
struct ZaehlerstandErfassenIntent: AppIntent {

    static var title: LocalizedStringResource = "Zählerstand erfassen"
    static var description = IntentDescription(
        "Öffnet die WERK.E App, um einen Zählerstand zu fotografieren."
    )
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        Navigation.gewuenschterBildschirm = .zaehlerstand
        return .result()
    }
}

struct FoerderungBerechnenIntent: AppIntent {

    static var title: LocalizedStringResource = "Förderung berechnen"
    static var description = IntentDescription(
        "Öffnet den Förderrechner der WERK.E App."
    )
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        Navigation.gewuenschterBildschirm = .foerderrechner
        return .result()
    }
}

struct WerkeKurzbefehle: AppShortcutsProvider {

    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ZaehlerstandErfassenIntent(),
            phrases: [
                "Zählerstand in \(.applicationName) erfassen",
                "\(.applicationName) Zählerstand"
            ],
            shortTitle: "Zählerstand",
            systemImageName: "gauge.medium"
        )
        AppShortcut(
            intent: FoerderungBerechnenIntent(),
            phrases: [
                "Förderung mit \(.applicationName) berechnen",
                "\(.applicationName) Förderung"
            ],
            shortTitle: "Förderung",
            systemImageName: "eurosign.circle"
        )
    }
}

/// Kleiner Vermittler zwischen Kurzbefehl und Oberfläche.
@MainActor
enum Navigation {

    enum Ziel {
        case zaehlerstand
        case foerderrechner
    }

    static var gewuenschterBildschirm: Ziel? {
        didSet {
            if gewuenschterBildschirm != nil {
                NotificationCenter.default.post(name: .werkeNavigation, object: nil)
            }
        }
    }

    static func abholen() -> Ziel? {
        defer { gewuenschterBildschirm = nil }
        return gewuenschterBildschirm
    }
}

extension Notification.Name {
    static let werkeNavigation = Notification.Name("WerkeNavigation")
}
