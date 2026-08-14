import SwiftUI

@main
struct WerkeAppApp: App {

    @StateObject private var zustand = AppZustand()

    var body: some Scene {
        WindowGroup {
            Wurzel()
                .environmentObject(zustand)
                .tint(Gestaltung.Farbe.marke)
                .task {
                    // Still im Hintergrund. Klappt es nicht, rechnet die App
                    // unverändert mit der lokalen Fassung weiter.
                    await zustand.aktualisiereRegelpaket()
                }
        }
    }
}
