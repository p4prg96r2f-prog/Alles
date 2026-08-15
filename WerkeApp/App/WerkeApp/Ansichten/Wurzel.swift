import SwiftUI

/// Drei Bereiche. Mehr nicht.
///
/// Heute – was tue ich jetzt? · Mein Haus – was habe ich? · Rechnen – was will
/// ich wissen? Jede Idee, die einen vierten Bereich verlangt, gehört in einen
/// der drei oder ist noch nicht reif.
struct Wurzel: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var bereich: Bereich = .heute

    enum Bereich: Hashable {
        case heute, haus, rechnen
    }

    var body: some View {
        if zustand.brauchtEinstieg {
            Einstieg()
                .transition(.opacity)
        } else {
            TabView(selection: $bereich) {
                // Der Startbildschirm kann in die anderen Bereiche wechseln –
                // etwa wenn die nächste Aufgabe lautet, Angaben zu ergänzen.
                HeuteAnsicht(bereich: $bereich)
                    .tabItem { Label("Heute", systemImage: "sun.horizon") }
                    .tag(Bereich.heute)

                MeinHausAnsicht()
                    .tabItem { Label("Mein Haus", systemImage: "house") }
                    .tag(Bereich.haus)

                RechnenAnsicht()
                    .tabItem { Label("Rechnen", systemImage: "function") }
                    .tag(Bereich.rechnen)
            }
        }
    }
}
