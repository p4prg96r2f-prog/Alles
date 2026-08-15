import SwiftUI
import UIKit
import WerkeKern

/// Der wichtigste Bildschirm der App.
///
/// Gestaltungsregeln, die hier tragen:
/// * Spanne statt Punktwert – ehrlich, und lädt zum Genauerwerden ein.
/// * Die **Netto-Zahl** steht drin, nicht nur der Förderbetrag.
/// * Das Honorar erscheint neben einem fünfstelligen Zuschuss.
/// * Annahmen sind einen Fingertipp entfernt – nicht versteckt, nicht im Weg.
/// * Genau **eine** Hauptaktion.
struct ErgebnisKarte: View {

    let ergebnis: Foerderergebnis
    @EnvironmentObject private var zustand: AppZustand

    @State private var pdf: URL?
    @State private var gesichert = false

    var body: some View {
        VStack(spacing: Gestaltung.Abstand.normal) {
            zuschusskarte
            unterStrich
            ForEach(ergebnis.hinweise) { hinweis in
                hinweiskarte(hinweis)
            }
            postenliste
            vorbehalt
            aktionen
        }
        // Ändert der Nutzer seine Auswahl, ist das gesicherte Ergebnis ein
        // anderes – der Knopf darf dann nicht weiter „Gesichert“ anzeigen.
        .onChange(of: ergebnis.zuschussGesamt) { _, _ in
            gesichert = false
        }
        .onChange(of: ergebnis.investitionGesamt) { _, _ in
            gesichert = false
        }
    }

    // MARK: Zuschuss

    private var zuschusskarte: some View {
        Karte {
            Text("Mögliche Förderung")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Gestaltung.Farbe.marke)
                .textCase(.uppercase)
                .kerning(0.8)

            Text(Formate.euroSpanne(ergebnis.zuschussSpanne))
                .stilErgebniszahl()
                .foregroundStyle(Gestaltung.Farbe.marke)

            Text("bei rund \(Formate.euro(ergebnis.investitionGesamt)) Investition")
                .stilNebentext()

            if let g = zustand.gebaeude, g.angabenVollstaendigkeit < 1 {
                Divider().overlay(Gestaltung.Farbe.trennlinie)
                Fortschrittsbalken(
                    anteil: g.angabenVollstaendigkeit,
                    beschriftung: "Mit jeder weiteren Angabe zu Ihrem Haus wird die Spanne enger."
                )
            }
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: Unterm Strich

    private var unterStrich: some View {
        Karte {
            Text("Unterm Strich")
                .stilAbschnittstitel()

            betragszeile("Investition", Formate.euro(ergebnis.investitionGesamt))
            betragszeile("Förderung", "− " + Formate.euro(ergebnis.zuschussGesamt), farbe: Gestaltung.Farbe.gruen)
            betragszeile(
                "Beratung (zur Hälfte gefördert)",
                "+ " + Formate.euro(ergebnis.honorar.eigenanteil)
            )

            Divider().overlay(Gestaltung.Farbe.trennlinie)

            HStack {
                Text("Ihr Anteil")
                    .font(.headline)
                Spacer()
                Text(Formate.euro(ergebnis.eigenanteilGesamt))
                    .font(.title3.weight(.bold).monospacedDigit())
            }
            .accessibilityElement(children: .combine)
        }
    }

    private func betragszeile(_ titel: String, _ wert: String, farbe: Color = Gestaltung.Farbe.text) -> some View {
        HStack {
            Text(titel)
                .font(.subheadline)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
            Spacer(minLength: Gestaltung.Abstand.eng)
            Text(wert)
                .stilBetrag()
                .foregroundStyle(farbe)
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: Optimierungshinweise

    private func hinweiskarte(_ hinweis: Optimierungshinweis) -> some View {
        Karte {
            HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                Image(systemName: "lightbulb.max")
                    .font(.title3)
                    .foregroundStyle(Gestaltung.Farbe.gelb)
                VStack(alignment: .leading, spacing: 6) {
                    Text(hinweis.titel)
                        .font(.subheadline.weight(.semibold))
                    Text(hinweis.erlaeuterung)
                        .font(.footnote)
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                        .fixedSize(horizontal: false, vertical: true)
                    if hinweis.moeglicherMehrbetrag > 0 {
                        Text("Mögliche Wirkung: bis zu \(Formate.euro(hinweis.moeglicherMehrbetrag)) mehr")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Gestaltung.Farbe.marke)
                    }
                }
            }
        }
    }

    // MARK: Posten

    private var postenliste: some View {
        Karte {
            Text("Im Einzelnen")
                .stilAbschnittstitel()

            ForEach(ergebnis.posten) { posten in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(posten.art.bezeichnung)
                            .font(.subheadline.weight(.medium))
                        Spacer(minLength: Gestaltung.Abstand.eng)
                        Text(Formate.euro(posten.zuschuss))
                            .stilBetrag()
                            .foregroundStyle(Gestaltung.Farbe.marke)
                    }
                    ForEach(posten.begruendung, id: \.self) { grund in
                        Text("· \(grund)")
                            .font(.caption)
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                }
                .padding(.vertical, 6)

                if posten.id != ergebnis.posten.last?.id {
                    Divider().overlay(Gestaltung.Farbe.trennlinie)
                }
            }
        }
    }

    // MARK: Vorbehalt und Annahmen

    private var vorbehalt: some View {
        Karte {
            Hinweisleiste(text: """
            Unverbindliche Abschätzung auf Basis Ihrer Angaben – kein Förderbescheid. \
            Stand der Förderregeln: \(Formate.datumLesbar(ergebnis.regelStand)).
            """)
            Annahmenliste(annahmen: ergebnis.annahmen)
        }
    }

    // MARK: Aktionen

    private var aktionen: some View {
        VStack(spacing: Gestaltung.Abstand.normal) {
            Hauptknopf(
                titel: gesichert ? "Gesichert" : "Ergebnis sichern",
                symbol: gesichert ? "checkmark" : "square.and.arrow.down"
            ) {
                zustand.merkeBerechnung(
                    art: "Förderabschätzung",
                    kurzfassung: "\(Formate.euro(ergebnis.zuschussGesamt)) bei \(Formate.euro(ergebnis.investitionGesamt))",
                    version: ergebnis.regelVersion,
                    stand: ergebnis.regelStand
                )
                withAnimation(.snappy) { gesichert = true }
            }
            .disabled(gesichert)

            HStack(spacing: Gestaltung.Abstand.weit) {
                Nebenknopf(titel: "Als PDF teilen", symbol: "square.and.arrow.up") {
                    if let gebaeude = zustand.gebaeude {
                        pdf = PDFErzeugung.foerderergebnis(
                            gebaeude: gebaeude,
                            ergebnis: ergebnis
                        )
                    }
                }

                Nebenknopf(titel: "Beratung anfragen", symbol: "phone") {
                    if let url = URL(string: "tel:052514029291") {
                        UIApplication.shared.open(url)
                    }
                }
            }
        }
        .sheet(item: Binding(
            get: { pdf.map(TeilbareDatei.init) },
            set: { _ in pdf = nil }
        )) { datei in
            Teilblatt(url: datei.url)
        }
    }
}

// MARK: - Teilen

struct TeilbareDatei: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

struct Teilblatt: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
