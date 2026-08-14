import SwiftUI
import WerkeKern

struct EinstellungenAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @Environment(\.dismiss) private var schliessen
    @State private var zeigeLoeschabfrage = false
    @State private var aktualisiert = false

    var body: some View {
        List {
            Section {
                zeile("Regelfassung", "\(zustand.regeln.version)")
                zeile("Stand der Regeln", Formate.datumLesbar(zustand.regeln.stand))
                Button {
                    Task {
                        await zustand.aktualisiereRegelpaket()
                        aktualisiert = true
                    }
                } label: {
                    Label(aktualisiert ? "Auf dem neuesten Stand" : "Nach Aktualisierung suchen",
                          systemImage: aktualisiert ? "checkmark.circle" : "arrow.clockwise")
                }
            } header: {
                Text("Förder- und Rechtsgrundlagen")
            } footer: {
                Text(zustand.regeln.hinweis)
            }

            if !zustand.regeln.zuPruefen.isEmpty {
                Section("Vor Veröffentlichung zu prüfen") {
                    ForEach(zustand.regeln.zuPruefen, id: \.self) { punkt in
                        Text(punkt).font(.footnote).foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                }
            }

            Section {
                zeile("Rechnet ohne Internet", "ja")
                zeile("Daten auf dem Gerät", "ja")
                zeile("Sprachmodell auf dem Gerät", Erklaerer.modellVerfuegbar ? "verfügbar" : "nicht verfügbar")
            } header: {
                Text("Datenschutz")
            } footer: {
                Text("Alle Berechnungen laufen auf Ihrem Gerät. Fotos für die Zählerstandserkennung werden nicht gespeichert und nicht übertragen. Ohne Sprachmodell erscheinen die Erklärungen in ihrer Grundfassung – es fehlt nichts.")
            }

            Section {
                Link(destination: URL(string: "https://werk-e.de/datenschutz/")!) {
                    Label("Datenschutzerklärung", systemImage: "hand.raised")
                }
                Link(destination: URL(string: "https://werk-e.de/impressum/")!) {
                    Label("Impressum", systemImage: "info.circle")
                }
                Link(destination: URL(string: "https://werk-e.de/kontakt/")!) {
                    Label("Kontakt zu WERK.E", systemImage: "envelope")
                }
            }

            Section {
                Button(role: .destructive) {
                    zeigeLoeschabfrage = true
                } label: {
                    Label("Alle Daten löschen", systemImage: "trash")
                }
            } footer: {
                Text("Löscht Gebäudedaten, Zählerstände, Dokumente und Berechnungen unwiderruflich von diesem Gerät.")
            }
        }
        .navigationTitle("Einstellungen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Fertig") { schliessen() }
            }
        }
        .confirmationDialog(
            "Wirklich alle Daten löschen?",
            isPresented: $zeigeLoeschabfrage,
            titleVisibility: .visible
        ) {
            Button("Alles löschen", role: .destructive) {
                zustand.allesLoeschen()
                schliessen()
            }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("Das lässt sich nicht rückgängig machen.")
        }
    }

    private func zeile(_ titel: String, _ wert: String) -> some View {
        HStack {
            Text(titel)
            Spacer()
            Text(wert).foregroundStyle(Gestaltung.Farbe.textLeise)
        }
    }
}
