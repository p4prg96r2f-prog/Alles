import SwiftUI
import WerkeKern

/// Der Einstieg: kein Konto, eine Frage pro Bildschirm, Ergebnis in unter einer
/// Minute. Wer erst zwanzig Felder ausfüllen muss, bevor etwas passiert, ist weg.
struct Einstieg: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var schritt = 0
    @State private var gebaeude = Gebaeude()

    private let letzterSchritt = 3

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if schritt > 0 {
                    Fortschrittsbalken(
                        anteil: Double(schritt) / Double(letzterSchritt),
                        beschriftung: "Schritt \(schritt) von \(letzterSchritt)"
                    )
                    .padding(.horizontal, Gestaltung.Abstand.weit)
                    .padding(.top, Gestaltung.Abstand.normal)
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                        switch schritt {
                        case 0: begruessung
                        case 1: schrittOrt
                        case 2: schrittGebaeude
                        default: schrittHeizung
                        }
                    }
                    .padding(Gestaltung.Abstand.weit)
                }

                fussleiste
            }
            .background(Gestaltung.Farbe.hintergrund)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if schritt > 0 {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Zurück") {
                            withAnimation(.snappy) { schritt -= 1 }
                        }
                    }
                }
            }
        }
    }

    // MARK: Schritte

    private var begruessung: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            Spacer(minLength: Gestaltung.Abstand.sehrWeit)

            Text("WERK.E")
                .font(.system(size: 15, weight: .heavy))
                .kerning(3)
                .foregroundStyle(Gestaltung.Farbe.marke)

            Text("Wie viel Förderung ist für Ihr Haus drin?")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)

            Text("Drei Fragen. Kein Konto. Ergebnis sofort.")
                .font(.title3)
                .foregroundStyle(Gestaltung.Farbe.textLeise)

            VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
                merkmal("bolt.badge.checkmark", "Rechnet auch ohne Internet")
                merkmal("lock.shield", "Ihre Daten bleiben auf dem Gerät")
                merkmal("doc.text", "Ergebnis als PDF zum Weitergeben")
            }
            .padding(.top, Gestaltung.Abstand.eng)
        }
    }

    private func merkmal(_ symbol: String, _ text: String) -> some View {
        HStack(spacing: Gestaltung.Abstand.normal) {
            Image(systemName: symbol)
                .font(.title3)
                .frame(width: 28)
                .foregroundStyle(Gestaltung.Farbe.marke)
            Text(text)
                .font(.callout)
        }
    }

    private var schrittOrt: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            Text("Wo steht Ihr Haus?")
                .font(.system(.title, design: .rounded, weight: .bold))

            VStack(spacing: Gestaltung.Abstand.normal) {
                TextField("Straße und Hausnummer", text: $gebaeude.strasse)
                    .textContentType(.streetAddressLine1)
                    .textFieldStyle(.plain)
                    .padding()
                    .frame(minHeight: Gestaltung.mindestTippziel)
                    .background(Gestaltung.Farbe.flaeche)
                    .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.klein))

                HStack(spacing: Gestaltung.Abstand.normal) {
                    TextField("PLZ", text: $gebaeude.plz)
                        .keyboardType(.numberPad)
                        .textContentType(.postalCode)
                        .frame(width: 110)
                        .padding()
                        .frame(minHeight: Gestaltung.mindestTippziel)
                        .background(Gestaltung.Farbe.flaeche)
                        .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.klein))

                    TextField("Ort", text: $gebaeude.ort)
                        .textContentType(.addressCity)
                        .padding()
                        .frame(minHeight: Gestaltung.mindestTippziel)
                        .background(Gestaltung.Farbe.flaeche)
                        .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.klein))
                }
            }

            Hinweisleiste(text: "Die Anschrift bleibt auf Ihrem Gerät. Sie hilft später beim Energieausweis und bei der Frage, ob in Ihrer Straße ein Wärmenetz geplant ist.")
        }
    }

    private var schrittGebaeude: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            Text("Was für ein Haus ist es?")
                .font(.system(.title, design: .rounded, weight: .bold))

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Gebaeudetyp.allCases, id: \.self) { typ in
                    Auswahlkachel(
                        titel: typ.bezeichnung,
                        symbol: symbol(fuer: typ),
                        ausgewaehlt: gebaeude.typ == typ
                    ) {
                        gebaeude.typ = typ
                        if typ == .mehrfamilienhaus, gebaeude.wohneinheiten == 1 {
                            gebaeude.wohneinheiten = 4
                        } else if typ != .mehrfamilienhaus {
                            gebaeude.wohneinheiten = 1
                        }
                    }
                }
            }

            baujahrAuswahl
            flaecheAuswahl
        }
    }

    private var baujahrAuswahl: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            Text("Baujahr")
                .stilAbschnittstitel()
            Text("Ungefähr genügt – das lässt sich später genauer machen.")
                .stilNebentext()

            // Auswahl statt Tastatur: Jahrzehnte als große Flächen.
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: Gestaltung.Abstand.eng), count: 3),
                      spacing: Gestaltung.Abstand.eng) {
                ForEach(jahrzehnte, id: \.wert) { jahrzehnt in
                    Button {
                        gebaeude.baujahr = jahrzehnt.wert
                    } label: {
                        Text(jahrzehnt.titel)
                            .font(.callout.weight(gebaeude.baujahr == jahrzehnt.wert ? .semibold : .regular))
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(
                                RoundedRectangle(cornerRadius: Gestaltung.Radius.klein)
                                    .fill(gebaeude.baujahr == jahrzehnt.wert
                                          ? Gestaltung.Farbe.markeGedeckt : Gestaltung.Farbe.flaeche)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: Gestaltung.Radius.klein)
                                    .strokeBorder(gebaeude.baujahr == jahrzehnt.wert
                                                  ? Gestaltung.Farbe.marke : .clear, lineWidth: 2)
                            )
                            .foregroundStyle(Gestaltung.Farbe.text)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var flaecheAuswahl: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            HStack {
                Text("Wohnfläche")
                    .stilAbschnittstitel()
                Spacer()
                Text("\(Int(gebaeude.wohnflaeche)) m²")
                    .font(.title3.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Gestaltung.Farbe.marke)
            }
            Slider(value: $gebaeude.wohnflaeche, in: 40...600, step: 5)
                .accessibilityValue("\(Int(gebaeude.wohnflaeche)) Quadratmeter")

            if gebaeude.typ == .mehrfamilienhaus {
                Stepper("Wohneinheiten: \(gebaeude.wohneinheiten)",
                        value: $gebaeude.wohneinheiten, in: 2...60)
                    .padding(.top, Gestaltung.Abstand.eng)
            }
        }
    }

    private var schrittHeizung: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            Text("Womit heizen Sie?")
                .font(.system(.title, design: .rounded, weight: .bold))

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Heizungsart.allCases, id: \.self) { art in
                    Auswahlkachel(
                        titel: art.bezeichnung,
                        symbol: symbol(fuer: art),
                        ausgewaehlt: gebaeude.heizungsart == art
                    ) {
                        gebaeude.heizungsart = art
                    }
                }
            }

            Hinweisleiste(text: "Danach sehen Sie sofort eine erste Einschätzung. Alles Weitere können Sie später ergänzen – jede Angabe macht das Ergebnis genauer.")
        }
    }

    // MARK: Fußleiste

    private var fussleiste: some View {
        VStack(spacing: Gestaltung.Abstand.eng) {
            Hauptknopf(titel: schritt == 0 ? "Loslegen" : (schritt == letzterSchritt ? "Ergebnis ansehen" : "Weiter")) {
                if schritt == letzterSchritt {
                    zustand.setzeGebaeude(gebaeude)
                    zustand.einstiegAbschliessen()
                } else {
                    withAnimation(.snappy) { schritt += 1 }
                }
            }
            .disabled(!schrittGueltig)

            if schritt == 1 {
                Nebenknopf(titel: "Anschrift später ergänzen") {
                    withAnimation(.snappy) { schritt += 1 }
                }
            }
        }
        .padding(Gestaltung.Abstand.weit)
        .background(.bar)
    }

    private var schrittGueltig: Bool {
        switch schritt {
        case 1: return !gebaeude.plz.isEmpty || !gebaeude.strasse.isEmpty
        default: return true
        }
    }

    // MARK: Hilfen

    private var jahrzehnte: [(titel: String, wert: Int)] {
        [("vor 1950", 1935), ("1950er", 1955), ("1960er", 1965),
         ("1970er", 1975), ("1980er", 1985), ("1990er", 1995),
         ("2000er", 2005), ("2010er", 2015), ("ab 2020", 2022)]
    }

    private func symbol(fuer typ: Gebaeudetyp) -> String {
        switch typ {
        case .einfamilienhaus: return "house"
        case .doppelhaushaelfte: return "house.lodge"
        case .reihenhaus: return "building.2"
        case .mehrfamilienhaus: return "building"
        }
    }

    private func symbol(fuer art: Heizungsart) -> String {
        switch art {
        case .gas: return "flame"
        case .oel: return "drop"
        case .fernwaerme: return "pipe.and.drop"
        case .waermepumpe: return "wind"
        case .pellets: return "leaf"
        case .nachtspeicher: return "bolt"
        case .unbekannt: return "questionmark.circle"
        }
    }
}
