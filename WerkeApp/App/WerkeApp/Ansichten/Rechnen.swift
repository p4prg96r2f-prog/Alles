import SwiftUI
import WerkeKern

/// Die Werkzeuge. Bewusst wenige und klar benannt – das Taschenmesser bleibt
/// klein, weil sonst niemand mehr eine Klinge findet.
struct RechnenAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Gestaltung.Abstand.normal) {

                    NavigationLink {
                        FoerderrechnerAnsicht()
                    } label: {
                        Werkzeugkachel(
                            titel: "Förderung berechnen",
                            beschreibung: "Was bekomme ich für mein Vorhaben – und was bleibt unterm Strich?",
                            symbol: "eurosign.circle.fill",
                            hervorgehoben: true
                        )
                    }
                    .buttonStyle(.plain)

                    NavigationLink {
                        HeizlastAnsicht()
                    } label: {
                        Werkzeugkachel(
                            titel: "Heizlast abschätzen",
                            beschreibung: "Wie viel Kilowatt braucht das Haus? Grundlage für die Frage nach der Wärmepumpe.",
                            symbol: "thermometer.medium"
                        )
                    }
                    .buttonStyle(.plain)

                    NavigationLink {
                        RaumaufmassAnsicht()
                    } label: {
                        Werkzeugkachel(
                            titel: "Raumaufmaß",
                            beschreibung: Raumscan.unterstuetzt
                                ? "Räume scannen und raumweise Heizlast rechnen – abgeglichen mit Ihren Ablesungen."
                                : "Räume erfassen und raumweise Heizlast rechnen.",
                            symbol: "camera.viewfinder"
                        )
                    }
                    .buttonStyle(.plain)

                    NavigationLink {
                        AnforderungenAnsicht()
                    } label: {
                        Werkzeugkachel(
                            titel: "Was gilt für mein Haus?",
                            beschreibung: "Pflichten, Fristen und was sich mit dem neuen Gesetz ändert.",
                            symbol: "checklist"
                        )
                    }
                    .buttonStyle(.plain)

                    if zustand.gebaeude?.istVermietet == true {
                        NavigationLink {
                            CO2Ansicht()
                        } label: {
                            Werkzeugkachel(
                                titel: "CO₂-Kosten als Vermieter",
                                beschreibung: "Welchen Anteil tragen Sie – und wie viel spart eine Sanierung im Jahr?",
                                symbol: "chart.bar.doc.horizontal"
                            )
                        }
                        .buttonStyle(.plain)
                    }

                    NavigationLink {
                        GlossarAnsicht()
                    } label: {
                        Werkzeugkachel(
                            titel: "Begriffe erklärt",
                            beschreibung: "Fachwörter in einfacher Sprache – auch ohne Internet.",
                            symbol: "text.book.closed"
                        )
                    }
                    .buttonStyle(.plain)

                    Hinweisleiste(text: "Alle Berechnungen laufen auf Ihrem Gerät. Stand der Regeln: \(Formate.datumLesbar(zustand.regeln.stand)).")
                        .padding(.top, Gestaltung.Abstand.eng)
                }
                .padding(Gestaltung.Abstand.normal)
            }
            .background(Gestaltung.Farbe.hintergrund)
            .navigationTitle("Rechnen")
        }
    }
}

struct Werkzeugkachel: View {
    let titel: String
    let beschreibung: String
    let symbol: String
    var hervorgehoben = false

    var body: some View {
        HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
            Image(systemName: symbol)
                .font(.title)
                .foregroundStyle(hervorgehoben ? .white : Gestaltung.Farbe.marke)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(titel)
                    .font(.headline)
                    .foregroundStyle(hervorgehoben ? .white : Gestaltung.Farbe.text)
                Text(beschreibung)
                    .font(.subheadline)
                    .foregroundStyle(hervorgehoben ? Color.white.opacity(0.85) : Gestaltung.Farbe.textLeise)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(hervorgehoben ? Color.white.opacity(0.7) : Gestaltung.Farbe.textLeise)
        }
        .padding(Gestaltung.Abstand.normal)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(hervorgehoben ? Gestaltung.Farbe.marke : Gestaltung.Farbe.flaeche)
        .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.normal, style: .continuous))
    }
}

// MARK: - Glossar

struct GlossarAnsicht: View {

    @StateObject private var erklaerer = Erklaerer()
    @State private var einfacheSprache = false
    @State private var texte: [String: String] = [:]

    var body: some View {
        List {
            if Erklaerer.modellVerfuegbar {
                Section {
                    Toggle("Einfachere Sprache", isOn: $einfacheSprache)
                } footer: {
                    Text("Formuliert die Erklärungen auf Ihrem Gerät um. Es werden keine Inhalte ergänzt und keine Daten übertragen.")
                }
            }

            ForEach(Glossarbegriff.alle) { begriff in
                Section(begriff.titel) {
                    Text(texte[begriff.id] ?? begriff.erklaerung)
                        .font(.subheadline)
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                }
            }
        }
        .navigationTitle("Begriffe")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: einfacheSprache) {
            guard einfacheSprache else {
                texte = [:]
                return
            }
            for begriff in Glossarbegriff.alle {
                let text = await erklaerer.erklaere(begriff, einfacher: true)
                texte[begriff.id] = text
            }
        }
    }
}
