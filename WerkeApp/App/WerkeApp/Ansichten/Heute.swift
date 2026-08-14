import SwiftUI
import WerkeKern

/// Der Startbildschirm zeigt genau **eine** nächste Aufgabe.
///
/// Während einer Sanierung ist das beherrschende Gefühl Unsicherheit: Wo stehe
/// ich, muss ich etwas tun, habe ich eine Frist verpasst? Wer diese Frage
/// zuverlässig beantwortet, hat die App gerechtfertigt.
struct HeuteAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
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

    private var aufgabe: Aufgabe {
        // Reihenfolge = Dringlichkeit. Die erste zutreffende gewinnt.
        if zustand.brauchtZaehlerstandDiesenMonat {
            let fehlend = max(0, zustand.regeln.gebaeude.verbrauchsausweisMonate - zustand.monateMitZaehlerstand)
            return Aufgabe(
                titel: "Zählerstand für \(aktuellerMonat) erfassen",
                erlaeuterung: fehlend > 0
                    ? "Noch \(fehlend) von \(zustand.regeln.gebaeude.verbrauchsausweisMonate) Monaten, bis ein Verbrauchsausweis möglich ist. Diese Zeit lässt sich nicht nachholen."
                    : "Ihre Verbrauchsreihe ist vollständig – weiter so, damit sie es bleibt.",
                knopf: "Zähler abfotografieren",
                symbol: "camera",
                aktion: { zeigeZaehler = true }
            )
        }

        if zustand.massnahmen.isEmpty {
            return Aufgabe(
                titel: "Erste Förderabschätzung machen",
                erlaeuterung: "Wählen Sie aus, was Sie vorhaben – Sie sehen sofort, welcher Zuschuss dafür in Frage kommt und was unterm Strich bleibt.",
                knopf: "Förderung berechnen",
                symbol: "eurosign.circle",
                aktion: { zeigeRechner = true }
            )
        }

        if let g = zustand.gebaeude, g.angabenVollstaendigkeit < 1 {
            return Aufgabe(
                titel: "Ergebnis genauer machen",
                erlaeuterung: "Ihr Ergebnis wird als Spanne angezeigt, weil noch Angaben fehlen. Jede Ergänzung zu Dach, Fassade oder Fenstern verengt sie.",
                knopf: "Angaben ergänzen",
                symbol: "square.and.pencil",
                aktion: nil
            )
        }

        return Aufgabe(
            titel: "Alles erledigt",
            erlaeuterung: "Wir melden uns, wenn sich an Ihrer Förderung etwas ändert oder eine Frist näher rückt.",
            knopf: nil,
            symbol: "checkmark.circle",
            aktion: nil
        )
    }

    private var aufgabenkarte: some View {
        let a = aufgabe
        return Karte {
            Text("Jetzt dran")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Gestaltung.Farbe.marke)
                .textCase(.uppercase)
                .kerning(0.8)

            Text(a.titel)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)

            Text(a.erlaeuterung)
                .font(.callout)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .fixedSize(horizontal: false, vertical: true)

            if zustand.monateMitZaehlerstand > 0 {
                Fortschrittsbalken(
                    anteil: Double(zustand.monateMitZaehlerstand) / Double(zustand.regeln.gebaeude.verbrauchsausweisMonate),
                    beschriftung: "\(zustand.monateMitZaehlerstand) von \(zustand.regeln.gebaeude.verbrauchsausweisMonate) Monaten erfasst"
                )
            }

            if let knopf = a.knopf, let aktion = a.aktion {
                Hauptknopf(titel: knopf, symbol: a.symbol, aktion: aktion)
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

    // MARK: Hilfen

    private struct Aufgabe {
        let titel: String
        let erlaeuterung: String
        let knopf: String?
        let symbol: String
        let aktion: (() -> Void)?
    }

    private var aktuellerMonat: String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "LLLL"
        return f.string(from: Date())
    }

    private func kurzdatum(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "d.M."
        return f.string(from: datum)
    }
}
