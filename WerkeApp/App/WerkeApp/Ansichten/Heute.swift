import SwiftUI
import WerkeKern

/// Der Startbildschirm zeigt genau **eine** nächste Aufgabe.
///
/// Welche das ist, entscheidet `Aufgabe.naechste` im Rechenkern – dort ist die
/// Reihenfolge mit Testfällen abgesichert. Diese Ansicht stellt sie nur dar.
struct HeuteAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @Binding var bereich: Wurzel.Bereich
    @State private var zeigeZaehler = false
    @State private var zeigeRechner = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                    aufgabenkarte
                    if !zustand.verlauf.isEmpty { verlauf }
                }
                .padding(Gestaltung.Abstand.normal)
            }
            .background(Gestaltung.Farbe.hintergrund)
            .navigationTitle("Heute")
            .sheet(isPresented: $zeigeZaehler) {
                ZaehlerstandAnsicht()
            }
            .sheet(isPresented: $zeigeRechner) {
                NavigationStack { FoerderrechnerAnsicht() }
            }
            .onReceive(NotificationCenter.default.publisher(for: .werkeNavigation)) { _ in
                switch Navigation.abholen() {
                case .zaehlerstand: zeigeZaehler = true
                case .foerderrechner: zeigeRechner = true
                case .none: break
                }
            }
        }
    }

    // MARK: Die eine Aufgabe

    private var aufgabenkarte: some View {
        let aufgabe = zustand.naechsteAufgabe
        return Karte {
            Text("Jetzt dran")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Gestaltung.Farbe.marke)
                .textCase(.uppercase)
                .kerning(0.8)

            Text(aufgabe.titel)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)

            Text(aufgabe.erlaeuterung)
                .font(.callout)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .fixedSize(horizontal: false, vertical: true)

            if zustand.monateMitZaehlerstand > 0 {
                Fortschrittsbalken(
                    anteil: Double(zustand.monateMitZaehlerstand) / Double(zustand.regeln.gebaeude.verbrauchsausweisMonate),
                    beschriftung: "\(zustand.monateMitZaehlerstand) von \(zustand.regeln.gebaeude.verbrauchsausweisMonate) Monaten erfasst"
                )
            }

            if let knopf = aufgabe.knopf {
                Hauptknopf(titel: knopf, symbol: aufgabe.symbol) {
                    switch aufgabe.art {
                    case .zaehlerstand:
                        zeigeZaehler = true
                    case .ersteBerechnung:
                        zeigeRechner = true
                    case .angabenErgaenzen:
                        // Ergänzt werden die Angaben in der Gebäudeakte,
                        // nicht im Rechner.
                        bereich = .haus
                    case .einstieg, .nichtsZuTun:
                        break
                    }
                }
            }
        }
    }

    // MARK: Verlauf

    private var verlauf: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
            Text("Zuletzt")
                .stilAbschnittstitel()

            VStack(spacing: 0) {
                ForEach(zustand.verlauf) { eintrag in
                    HStack(spacing: Gestaltung.Abstand.normal) {
                        Image(systemName: eintrag.symbol)
                            .font(.footnote)
                            .foregroundStyle(Gestaltung.Farbe.marke)
                            .frame(width: 24)
                        Text(eintrag.text)
                            .font(.subheadline)
                        Spacer(minLength: Gestaltung.Abstand.eng)
                        Text(kurzdatum(eintrag.datum))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                    .padding(.vertical, 10)

                    if eintrag.id != zustand.verlauf.last?.id {
                        Divider().overlay(Gestaltung.Farbe.trennlinie)
                    }
                }
            }
            .padding(.horizontal, Gestaltung.Abstand.normal)
            .background(Gestaltung.Farbe.flaeche)
            .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.normal, style: .continuous))
        }
    }

    private func kurzdatum(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "d.M."
        return f.string(from: datum)
    }
}
