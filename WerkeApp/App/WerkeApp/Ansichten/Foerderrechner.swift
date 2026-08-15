import SwiftUI
import WerkeKern

/// Der Kern der App. Auswahl statt Tastatur, Ergebnis unmittelbar sichtbar.
struct FoerderrechnerAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var ausgewaehlt: Set<Massnahmenart> = []
    @State private var kosten: [Massnahmenart: Double] = [:]
    @State private var haushalt = Haushalt()
    @State private var zeigeHaushalt = false

    private var massnahmen: [Massnahme] {
        massnahmen(aus: ausgewaehlt, kosten: kosten)
    }

    /// Ausdrücklich aus übergebenen Werten gebildet: Nach einer Änderung soll
    /// gespeichert werden, was der Nutzer gerade gewählt hat – nicht das, was
    /// der Zustand zufällig schon kennt.
    private func massnahmen(aus auswahl: Set<Massnahmenart>, kosten: [Massnahmenart: Double]) -> [Massnahme] {
        auswahl.sorted { $0.rawValue < $1.rawValue }.map {
            Massnahme(art: $0, kosten: kosten[$0] ?? richtwert(fuer: $0))
        }
    }

    private var ergebnis: Foerderergebnis? {
        guard let gebaeude = zustand.gebaeude, !massnahmen.isEmpty else { return nil }
        return zustand.foerderrechner.berechne(
            gebaeude: gebaeude, massnahmen: massnahmen, haushalt: haushalt
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                auswahl
                if !ausgewaehlt.isEmpty { kostenbereich }
                if let ergebnis { ErgebnisKarte(ergebnis: ergebnis) }
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Förderung")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    zeigeHaushalt = true
                } label: {
                    Image(systemName: "person.2")
                }
                .accessibilityLabel("Angaben zum Haushalt")
            }
        }
        .sheet(isPresented: $zeigeHaushalt) {
            NavigationStack {
                HaushaltAnsicht(haushalt: $haushalt)
            }
            .presentationDetents([.medium, .large])
        }
        .onAppear {
            haushalt = zustand.haushalt
            for m in zustand.massnahmen {
                ausgewaehlt.insert(m.art)
                kosten[m.art] = m.kosten
            }
        }
        .onChange(of: haushalt) { _, neu in
            zustand.setzeHaushalt(neu)
        }
    }

    // MARK: Auswahl

    private var auswahl: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
            Text("Was haben Sie vor?")
                .font(.system(.title2, design: .rounded, weight: .bold))
            Text("Mehrfachauswahl. Gemeinsam beantragt kann sich der Zuschuss erhöhen.")
                .stilNebentext()

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Massnahmenart.allCases.filter { $0 != .effizienzhaus }) { art in
                    Auswahlkachel(
                        titel: art.bezeichnung,
                        untertitel: ausgewaehlt.contains(art) ? nil : "Richtwert \(Formate.euro(richtwert(fuer: art)))",
                        symbol: symbol(fuer: art),
                        ausgewaehlt: ausgewaehlt.contains(art)
                    ) {
                        var neueAuswahl = ausgewaehlt
                        var neueKosten = kosten
                        if neueAuswahl.contains(art) {
                            neueAuswahl.remove(art)
                        } else {
                            neueAuswahl.insert(art)
                            if neueKosten[art] == nil { neueKosten[art] = richtwert(fuer: art) }
                        }
                        ausgewaehlt = neueAuswahl
                        kosten = neueKosten
                        zustand.setzeMassnahmen(massnahmen(aus: neueAuswahl, kosten: neueKosten))
                    }
                }
            }
        }
    }

    // MARK: Kosten

    private var kostenbereich: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
            Text("Was soll das kosten?")
                .stilAbschnittstitel()
            Text("Die Richtwerte sind Erfahrungswerte. Wenn Ihnen ein Angebot vorliegt, tragen Sie den echten Betrag ein.")
                .stilNebentext()

            ForEach(ausgewaehlt.sorted { $0.rawValue < $1.rawValue }) { art in
                VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
                    HStack {
                        Text(art.bezeichnung).font(.subheadline.weight(.medium))
                        Spacer()
                        Text(Formate.euro(kosten[art] ?? 0))
                            .font(.subheadline.weight(.semibold).monospacedDigit())
                            .foregroundStyle(Gestaltung.Farbe.marke)
                    }
                    Slider(
                        value: Binding(
                            get: {
                                // Ein gespeicherter Wert kann außerhalb der
                                // heutigen Spanne liegen – dann wird er
                                // eingefangen statt zu springen.
                                let bereich = spanne(fuer: art)
                                let wert = kosten[art] ?? richtwert(fuer: art)
                                return min(max(wert, bereich.lowerBound), bereich.upperBound)
                            },
                            set: { neu in
                                var neueKosten = kosten
                                neueKosten[art] = neu
                                kosten = neueKosten
                                zustand.setzeMassnahmen(massnahmen(aus: ausgewaehlt, kosten: neueKosten))
                            }
                        ),
                        in: spanne(fuer: art),
                        step: 500
                    )
                    .accessibilityLabel("Kosten \(art.bezeichnung)")
                    .accessibilityValue(Formate.euro(kosten[art] ?? 0))
                }
                .padding(Gestaltung.Abstand.normal)
                .background(Gestaltung.Farbe.flaeche)
                .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.klein, style: .continuous))
            }
        }
    }

    // MARK: Richtwerte

    private func richtwert(fuer art: Massnahmenart) -> Double {
        // Untergrenze, damit auch bei fehlerhaft kleinen Flächenangaben
        // brauchbare Richtwerte und gültige Schieberbereiche entstehen.
        let flaeche = max(40, zustand.gebaeude?.wohnflaeche ?? 140)
        switch art {
        case .dach: return (flaeche * 180).gerundetAuf(500)
        case .fassade: return (flaeche * 220).gerundetAuf(500)
        case .fenster: return (flaeche * 130).gerundetAuf(500)
        case .kellerdecke: return (flaeche * 60).gerundetAuf(500)
        case .obersteGeschossdecke: return (flaeche * 50).gerundetAuf(500)
        case .lueftung: return 12_000
        case .heizungstausch: return 28_000
        case .heizungsoptimierung: return 2_500
        case .effizienzhaus: return (flaeche * 900).gerundetAuf(1000)
        }
    }

    private func spanne(fuer art: Massnahmenart) -> ClosedRange<Double> {
        let r = richtwert(fuer: art)
        let unten = max(1_000, r * 0.3)
        // Ein leerer oder umgekehrter Bereich lässt SwiftUI abstürzen – deshalb
        // wird die Obergrenze immer über der Untergrenze gehalten.
        let oben = max(unten + 1_000, r * 2.2)
        return unten...oben
    }

    private func symbol(fuer art: Massnahmenart) -> String {
        switch art {
        case .dach: return "house.and.flag"
        case .fassade: return "square.split.bottomrightquarter"
        case .fenster: return "window.vertical.closed"
        case .kellerdecke: return "square.3.layers.3d.bottom.filled"
        case .obersteGeschossdecke: return "square.3.layers.3d.top.filled"
        case .lueftung: return "wind"
        case .heizungstausch: return "heater.vertical"
        case .heizungsoptimierung: return "slider.horizontal.3"
        case .effizienzhaus: return "sparkles"
        }
    }
}

private extension Double {
    func gerundetAuf(_ schritt: Double) -> Double {
        (self / schritt).rounded() * schritt
    }
}

// MARK: - Haushalt

struct HaushaltAnsicht: View {
    @Binding var haushalt: Haushalt
    @Environment(\.dismiss) private var schliessen
    @State private var einkommenText = ""

    var body: some View {
        Form {
            Section {
                Toggle("Ich wohne selbst im Haus", isOn: $haushalt.selbstbewohnt)
                Toggle("Heizung wird vorzeitig ersetzt", isOn: $haushalt.vorzeitigerHeizungstausch)
                Stepper("Kinder im Haushalt: \(haushalt.kinderImHaushalt)",
                        value: $haushalt.kinderImHaushalt, in: 0...10)
            } footer: {
                Text("Diese Angaben entscheiden über mehrere Boni beim Heizungstausch.")
            }

            Section {
                TextField("Zu versteuerndes Haushaltseinkommen", text: $einkommenText)
                    .keyboardType(.numberPad)
                    .onChange(of: einkommenText) { _, neu in
                        haushalt.zuVersteuerndesEinkommen = Double(neu.filter(\.isNumber))
                    }
            } header: {
                Text("Einkommen")
            } footer: {
                Text("Freiwillig. Die Angabe bleibt auf Ihrem Gerät und wird nirgendwo übertragen – sie dient nur der Prüfung, ob ein Einkommensbonus in Frage kommt.")
            }
        }
        .navigationTitle("Ihr Haushalt")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Fertig") { schliessen() }
            }
        }
        .onAppear {
            if let e = haushalt.zuVersteuerndesEinkommen { einkommenText = String(Int(e)) }
        }
    }
}
