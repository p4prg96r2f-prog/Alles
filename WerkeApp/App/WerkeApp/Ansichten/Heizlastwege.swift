import SwiftUI
import WerkeKern

/// Ein Eingang für die Heizlast, dahinter die Wege.
///
/// Vorher standen Kurzcheck, Verbrauchsrechnung und Raumaufmaß als drei
/// gleichrangige Werkzeuge nebeneinander – für dieselbe Frage. Das ist genau
/// die Art von Auswahl, die niemand treffen will. Jetzt zeigt die App, was mit
/// den vorhandenen Daten **gerade möglich** ist, sortiert nach erreichbarer
/// Genauigkeit, und empfiehlt den besten Weg.
struct HeizlastwegeAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand

    private struct Weg: Identifiable {
        let id: String
        let titel: String
        let beschreibung: String
        let aufwand: String
        let genauigkeit: Double     // erreichbare Unsicherheit
        let verfuegbar: Bool
        let sperrgrund: String?
        let symbol: String
    }

    private var wege: [Weg] {
        let monate = zustand.monateMitZaehlerstand
        let signatur = zustand.energiesignatur()

        return [
            Weg(
                id: "signatur",
                titel: "Aus Ihren Ablesungen",
                beschreibung: "Der Wärmeverlust wird aus dem Verbrauchsverlauf gemessen statt geschätzt. Genauester Weg ohne Termin.",
                aufwand: "keine Eingabe nötig",
                genauigkeit: 0.08,
                verfuegbar: signatur != nil,
                sperrgrund: signatur == nil
                    ? "Dafür braucht es mindestens fünf monatliche Ablesungen. Sie haben \(monate)."
                    : nil,
                symbol: "chart.line.uptrend.xyaxis"
            ),
            Weg(
                id: "nacht",
                titel: "Eine kalte Nacht messen",
                beschreibung: "Zählerstand abends und morgens ablesen. Ersetzt alle Annahmen über die Dämmung – in einer einzigen Nacht.",
                aufwand: "zwei Ablesungen",
                genauigkeit: 0.12,
                verfuegbar: true,
                sperrgrund: nil,
                symbol: "moon.stars"
            ),
            Weg(
                id: "verbrauch",
                titel: "Aus dem Jahresverbrauch",
                beschreibung: "Wenn die Abrechnungen der letzten Jahre vorliegen.",
                aufwand: "eine bis drei Zahlen",
                genauigkeit: 0.18,
                verfuegbar: true,
                sperrgrund: nil,
                symbol: "doc.text.magnifyingglass"
            ),
            Weg(
                id: "aufmass",
                titel: "Raumaufmaß",
                beschreibung: "Räume erfassen und raumweise rechnen. Zeigt, welcher Raum wie viel braucht.",
                aufwand: Raumscan.unterstuetzt ? "scannen, etwa 30 s je Raum" : "von Hand erfassen",
                genauigkeit: 0.20,
                verfuegbar: true,
                sperrgrund: nil,
                symbol: "camera.viewfinder"
            ),
            Weg(
                id: "kurzcheck",
                titel: "Fünf Fragen von außen",
                beschreibung: "Ohne Unterlagen, ohne das Haus zu betreten. Danach Schritt für Schritt genauer.",
                aufwand: "etwa zwei Minuten",
                genauigkeit: 0.26,
                verfuegbar: true,
                sperrgrund: nil,
                symbol: "square.stack.3d.up"
            )
        ]
    }

    private var empfehlung: Weg? {
        wege.filter(\.verfuegbar).min { $0.genauigkeit < $1.genauigkeit }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {

                Karte {
                    Text("Fünf Wege zur selben Zahl")
                        .stilAbschnittstitel()
                    Text("Je mehr gemessen und je weniger geschätzt wird, desto enger die Spanne. Was gerade möglich ist, steht oben.")
                        .stilNebentext()
                    if let empfehlung {
                        Hinweisleiste(
                            text: "Für Ihr Haus ist gerade „\(empfehlung.titel)“ der genaueste Weg.",
                            symbol: "star"
                        )
                    }
                }

                ForEach(wege.sorted { sortierschluessel($0) < sortierschluessel($1) }) { weg in
                    zeile(weg)
                }
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Heizlast")
        .navigationBarTitleDisplayMode(.inline)
    }

    /// Verfügbare Wege zuerst, darin die genauesten oben.
    private func sortierschluessel(_ weg: Weg) -> Double {
        weg.verfuegbar ? weg.genauigkeit : 10 + weg.genauigkeit
    }

    @ViewBuilder
    private func zeile(_ weg: Weg) -> some View {
        if weg.verfuegbar {
            NavigationLink {
                ziel(fuer: weg.id)
            } label: {
                inhalt(weg)
            }
            .buttonStyle(.plain)
        } else {
            inhalt(weg)
                .opacity(0.62)
        }
    }

    private func inhalt(_ weg: Weg) -> some View {
        Karte {
            HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                Image(systemName: weg.symbol)
                    .font(.title2)
                    .frame(width: 34)
                    .foregroundStyle(weg.verfuegbar ? Gestaltung.Farbe.marke : Gestaltung.Farbe.textLeise)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: Gestaltung.Abstand.eng) {
                        Text(weg.titel)
                            .font(.headline)
                        if weg.verfuegbar, weg.id == empfehlung?.id {
                            Text("empfohlen")
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 2)
                                .background(Gestaltung.Farbe.markeGedeckt)
                                .foregroundStyle(Gestaltung.Farbe.marke)
                                .clipShape(Capsule())
                        }
                    }
                    Text(weg.beschreibung)
                        .stilNebentext()
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: Gestaltung.Abstand.normal) {
                        Label(weg.aufwand, systemImage: "clock")
                        Label("± \(Formate.zahl(weg.genauigkeit * 100, stellen: 0)) %", systemImage: "target")
                    }
                    .font(.caption2)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
                    .padding(.top, 2)

                    if let sperrgrund = weg.sperrgrund {
                        Text(sperrgrund)
                            .font(.caption)
                            .foregroundStyle(Gestaltung.Farbe.gelb)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 2)
                    }
                }

                Spacer(minLength: 0)

                if weg.verfuegbar {
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                }
            }
        }
    }

    @ViewBuilder
    private func ziel(fuer kennung: String) -> some View {
        switch kennung {
        case "kurzcheck": KurzcheckAnsicht()
        case "nacht": NachtmessungAnsicht()
        case "aufmass": RaumaufmassAnsicht()
        default: HeizlastAnsicht(startweg: kennung == "signatur" ? .signatur : .verbrauch)
        }
    }
}
