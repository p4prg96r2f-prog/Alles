import SwiftUI
import UIKit
import WerkeKern

/// Der Anforderungsvergleich – kein Chatbot.
///
/// Hier werden **Regeln angewendet**, nicht Recht ausgelegt: Gebäudedaten
/// hinein, Liste heraus, jede Zeile mit Ampel, Fundstelle und Stand. Kein
/// Freitextfeld, kein Sprachmodell.
struct AnforderungenAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var ausgewaehlt: Pruefpunkt?

    private var ergebnis: Pruefergebnis? {
        guard let gebaeude = zustand.gebaeude else { return nil }
        return zustand.gmodgPruefung.pruefe(
            gebaeude, monateMitZaehlerstand: zustand.monateMitZaehlerstand
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
                if let ergebnis {
                    standleiste(ergebnis)

                    VStack(spacing: 0) {
                        ForEach(ergebnis.punkte) { punkt in
                            Button {
                                ausgewaehlt = punkt
                            } label: {
                                Ampelzeile(
                                    ampel: punkt.ampel,
                                    titel: punkt.titel,
                                    aussage: punkt.aussage,
                                    giltAb: punkt.istZukunft(am: Date()) ? punkt.giltAb : nil
                                )
                            }
                            .buttonStyle(.plain)

                            if punkt.id != ergebnis.punkte.last?.id {
                                Divider().overlay(Gestaltung.Farbe.trennlinie)
                            }
                        }
                    }
                    .padding(.horizontal, Gestaltung.Abstand.normal)
                    .background(Gestaltung.Farbe.flaeche)
                    .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.normal, style: .continuous))

                    // Auf einem iPad gibt es keine Telefonie. Ein Knopf, der
                    // dort nichts tut, ist schlimmer als keiner – deshalb wird
                    // dann die Nummer zum Mitschreiben gezeigt.
                    if let nummer = Kontakt.telefonURL, UIApplication.shared.canOpenURL(nummer) {
                        Hauptknopf(titel: "Mit WERK.E besprechen", symbol: "phone") {
                            UIApplication.shared.open(nummer)
                        }
                        .padding(.top, Gestaltung.Abstand.eng)
                    } else {
                        Karte {
                            Text("Mit WERK.E besprechen")
                                .stilAbschnittstitel()
                            Text(Kontakt.telefonLesbar)
                                .font(.title3.weight(.semibold).monospacedDigit())
                                .foregroundStyle(Gestaltung.Farbe.marke)
                                .textSelection(.enabled)
                        }
                        .padding(.top, Gestaltung.Abstand.eng)
                    }
                }
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Was gilt für mein Haus?")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $ausgewaehlt) { punkt in
            NavigationStack { PruefpunktAnsicht(punkt: punkt) }
                .presentationDetents([.medium, .large])
        }
    }

    private func standleiste(_ ergebnis: Pruefergebnis) -> some View {
        Karte {
            HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                Image(systemName: "info.circle")
                    .foregroundStyle(Gestaltung.Farbe.marke)
                VStack(alignment: .leading, spacing: 4) {
                    Text(ergebnis.hinweis)
                        .font(.footnote)
                        .fixedSize(horizontal: false, vertical: true)
                    if ergebnis.offeneRotePunkte > 0 {
                        Text("\(ergebnis.offeneRotePunkte) Punkt(e) mit Handlungsbedarf")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Gestaltung.Farbe.rot)
                    }
                }
            }
        }
    }
}

struct PruefpunktAnsicht: View {

    let punkt: Pruefpunkt
    @Environment(\.dismiss) private var schliessen

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                HStack(spacing: Gestaltung.Abstand.normal) {
                    Image(systemName: punkt.ampel.symbol)
                        .font(.title)
                        .foregroundStyle(farbe)
                    Text(punkt.aussage)
                        .font(.headline)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Text(punkt.erlaeuterung)
                    .font(.body)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
                    .fixedSize(horizontal: false, vertical: true)

                Divider().overlay(Gestaltung.Farbe.trennlinie)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Grundlage")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Gestaltung.Farbe.marke)
                        .textCase(.uppercase)
                    Text(punkt.fundstelle)
                        .font(.footnote)
                    if punkt.istZukunft(am: Date()), let ab = punkt.giltAb {
                        Text("Diese Regelung gilt ab dem \(Formate.datumLesbar(ab)). Bis dahin bleibt es beim bisherigen Recht.")
                            .font(.footnote)
                            .foregroundStyle(Gestaltung.Farbe.gelb)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .padding(Gestaltung.Abstand.weit)
        }
        .navigationTitle(punkt.titel)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Fertig") { schliessen() }
            }
        }
    }

    private var farbe: Color {
        switch punkt.ampel {
        case .gruen: return Gestaltung.Farbe.gruen
        case .gelb: return Gestaltung.Farbe.gelb
        case .rot: return Gestaltung.Farbe.rot
        case .neutral: return Gestaltung.Farbe.textLeise
        }
    }
}

// MARK: - CO₂-Kosten

struct CO2Ansicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var ausstoss: Double = 45
    @State private var jahreskosten: Double = 800

    private var ergebnis: CO2Ergebnis {
        zustand.co2rechner.berechne(
            kilogrammProQuadratmeter: ausstoss,
            co2KostenGesamtProJahr: jahreskosten
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {

                Karte {
                    Text("Ihr Anteil an den CO₂-Kosten")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Gestaltung.Farbe.marke)
                        .textCase(.uppercase)
                        .kerning(0.8)

                    Text(Formate.prozent(ergebnis.vermieteranteil))
                        .stilErgebniszahl()
                        .foregroundStyle(ergebnis.vermieteranteil > 0.5 ? Gestaltung.Farbe.rot : Gestaltung.Farbe.marke)

                    Text("Stufe \(ergebnis.stufeNummer) von 10 · \(Formate.euro(ergebnis.vermieterkostenProJahr)) im Jahr")
                        .stilNebentext()
                }

                Karte {
                    Text("Angaben")
                        .stilAbschnittstitel()

                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("CO₂-Ausstoß")
                            Spacer()
                            Text("\(Int(ausstoss)) kg/m²·a").stilBetrag()
                        }
                        Slider(value: $ausstoss, in: 0...70, step: 1)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("CO₂-Kosten im Jahr")
                            Spacer()
                            Text(Formate.euro(jahreskosten)).stilBetrag()
                        }
                        Slider(value: $jahreskosten, in: 100...5_000, step: 50)
                    }
                }

                Karte {
                    Text("Was eine Sanierung bringt")
                        .stilAbschnittstitel()
                    Text("Sinkt der Ausstoß auf 20 kg je Quadratmeter und Jahr, sparen Sie:")
                        .stilNebentext()
                    Text(Formate.euro(zustand.co2rechner.ersparnisProJahr(
                        vorher: ausstoss, nachher: 20, co2KostenGesamtProJahr: jahreskosten
                    )) + " im Jahr")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Gestaltung.Farbe.gruen)
                }

                Hinweisleiste(text: "Nach dem Stufenmodell des CO2KostAufG tragen Vermieter bei besonders emissionsreichen Gebäuden bis zu 95 Prozent, bei gutem Standard nichts. Die Werte hier sind eine Abschätzung; maßgeblich ist die Abrechnung.")
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("CO₂-Kosten")
        .navigationBarTitleDisplayMode(.inline)
    }
}
