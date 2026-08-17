import SwiftUI
import WerkeKern

/// Der Heizlast-Schnellcheck.
///
/// Er ersetzt die Berechnung nach DIN EN 12831 nicht – er verkauft sie. Deshalb
/// steht der Vorbehalt nicht im Kleingedruckten, sondern im Ergebnis.
struct HeizlastAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var weg: Weg = .gebaeude
    @State private var brennstoff: Brennstoff = .gasKubikmeter
    @State private var kesselart: Kesselart = .standardkessel
    @State private var verbrauchstexte: [String] = ["", "", ""]
    @State private var personen = 3
    @State private var warmwasserEnthalten = true
    @State private var pdf: URL?

    enum Weg: String, CaseIterable {
        case signatur = "Aus Ihren Ablesungen"
        case verbrauch = "Aus dem Jahresverbrauch"
        case gebaeude = "Aus wenigen Fragen"
    }

    /// Steht nur zur Wahl, wenn genug monatliche Ablesungen vorliegen.
    private var signatur: Energiesignatur? {
        zustand.energiesignatur(kesselart: kesselart)
    }

    private var verfuegbareWege: [Weg] {
        signatur == nil ? [.verbrauch, .gebaeude] : Weg.allCases
    }

    private var ergebnis: Heizlastergebnis? {
        guard let gebaeude = zustand.gebaeude else { return nil }
        switch weg {
        case .signatur:
            guard let signatur else { return nil }
            return Heizlastergebnis(
                spanne: signatur.heizlast,
                verfahren: .ausVerbrauch,
                annahmen: signatur.annahmen,
                regelVersion: zustand.regeln.version,
                vorbehalt: Heizlastrechner.vorbehalt
            )
        case .gebaeude:
            return zustand.heizlastrechner.ausGebaeudedaten(gebaeude)
        case .verbrauch:
            let werte = verbrauchstexte.compactMap { Double($0.replacingOccurrences(of: ",", with: ".")) }
            guard !werte.isEmpty else { return nil }
            return zustand.heizlastrechner.ausVerbrauch(Verbrauchsangabe(
                brennstoff: brennstoff,
                jahreswerte: werte,
                kesselart: kesselart,
                warmwasserEnthalten: warmwasserEnthalten,
                personenImHaushalt: personen
            ))
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                Picker("Verfahren", selection: $weg) {
                    ForEach(verfuegbareWege, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                switch weg {
                case .signatur: signaturkarte
                case .verbrauch: verbrauchseingabe
                case .gebaeude: gebaeudehinweis
                }

                if let ergebnis {
                    ergebniskarte(ergebnis)
                    if let vergleich { vergleichskarte(vergleich) }
                    heizflaechen(ergebnis)
                    vorbehaltskarte(ergebnis)
                    Nebenknopf(titel: "Als PDF teilen", symbol: "square.and.arrow.up") {
                        if let gebaeude = zustand.gebaeude {
                            pdf = PDFErzeugung.heizlastergebnis(gebaeude: gebaeude, ergebnis: ergebnis)
                        }
                    }
                } else {
                    Hinweisleiste(text: "Tragen Sie mindestens einen Jahresverbrauch ein – zwei bis drei Jahre machen die Abschätzung deutlich belastbarer.")
                }
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Heizlast")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: Binding(
            get: { pdf.map(TeilbareDatei.init) },
            set: { _ in pdf = nil }
        )) { datei in
            Teilblatt(url: datei.url)
        }
        .onAppear {
            // Liegen genug Ablesungen vor, ist das genaueste Verfahren
            // voreingestellt – der Nutzer muss nichts auswählen.
            if signatur != nil { weg = .signatur }
        }
    }

    // MARK: Eingabe

    private var verbrauchseingabe: some View {
        Karte {
            Text("Ihr Verbrauch")
                .stilAbschnittstitel()

            Picker("Brennstoff", selection: $brennstoff) {
                ForEach(Brennstoff.allCases, id: \.self) { Text($0.bezeichnung).tag($0) }
            }
            .pickerStyle(.menu)

            ForEach(0..<3, id: \.self) { index in
                HStack {
                    Text(jahresbeschriftung(index))
                        .font(.subheadline)
                        .frame(width: 96, alignment: .leading)
                    TextField("z. B. 2000", text: $verbrauchstexte[index])
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .padding(10)
                        .background(Gestaltung.Farbe.hintergrund)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }

            Picker("Kessel", selection: $kesselart) {
                ForEach(Kesselart.allCases, id: \.self) { Text($0.bezeichnung).tag($0) }
            }
            .pickerStyle(.menu)

            Toggle("Warmwasser ist im Verbrauch enthalten", isOn: $warmwasserEnthalten)
                .font(.subheadline)

            if warmwasserEnthalten {
                Stepper("Personen im Haushalt: \(personen)", value: $personen, in: 1...12)
                    .font(.subheadline)
                Hinweisleiste(text: "Der Warmwasseranteil wird abgezogen. Bleibt er drin, fällt die Heizlast systematisch zu hoch aus – und die Wärmepumpe zu groß.")
            }
        }
    }

    /// Das genaueste Verfahren – und das einzige, das gar nichts abfragt.
    @ViewBuilder
    private var signaturkarte: some View {
        if let signatur {
            Karte {
                HStack {
                    Text("Aus Ihren Ablesungen gerechnet")
                        .stilAbschnittstitel()
                    Spacer()
                    Text(signatur.guete.bezeichnung)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(guetefarbe(signatur.guete).opacity(0.18))
                        .foregroundStyle(guetefarbe(signatur.guete))
                        .clipShape(Capsule())
                }

                Text("Aus \(signatur.verwendeteZeitraeume) Ablesezeiträumen und dem Wetter Ihrer Region ergibt sich, wie viel Wärme Ihr Haus je Grad Kälte verliert. Dafür ist keine einzige zusätzliche Angabe nötig.")
                    .stilNebentext()

                Divider().overlay(Gestaltung.Farbe.trennlinie)

                betragszeile("Wärmeverlust des Hauses",
                             "\(Formate.zahl(signatur.waermeverlustkoeffizient, stellen: 0)) W/K")
                betragszeile("Warmwasser und Bereitschaft",
                             "\(Formate.zahl(signatur.grundverbrauchProJahr, stellen: 0)) kWh im Jahr")
                betragszeile("Güte der Anpassung",
                             Formate.prozent(signatur.bestimmtheitsmass))

                if let hinweis = signatur.hinweis {
                    Hinweisleiste(text: hinweis, symbol: "exclamationmark.triangle")
                }
            }
        }
    }

    private func guetefarbe(_ guete: Energiesignatur.Guete) -> Color {
        switch guete {
        case .belastbar: return Gestaltung.Farbe.gruen
        case .brauchbar: return Gestaltung.Farbe.gelb
        case .unsicher: return Gestaltung.Farbe.rot
        }
    }

    private var gebaeudehinweis: some View {
        Karte {
            Text("Gerechnet wird mit Ihren Gebäudeangaben")
                .stilAbschnittstitel()
            Text("Baujahr, Fläche, Gebäudetyp und der Dämmzustand aus „Mein Haus“. Je mehr davon ausgefüllt ist, desto enger die Spanne.")
                .stilNebentext()
        }
    }

    // MARK: Beide Wege gegeneinander

    /// Liegen Verbrauchsdaten vor, wird immer auch gegen die Gebäudeangaben
    /// gerechnet. Zwei stark abweichende Zahlen kommentarlos nebeneinander zu
    /// stellen, wirkt wie ein Fehler – dabei ist die Abweichung eine Aussage.
    private var vergleich: Heizlastrechner.Vergleich? {
        guard weg != .gebaeude,
              let gebaeude = zustand.gebaeude,
              let ausVerbrauch = ergebnis else { return nil }
        let ausDaten = zustand.heizlastrechner.ausGebaeudedaten(gebaeude)
        return zustand.heizlastrechner.vergleiche(
            ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausDaten
        )
    }

    private func vergleichskarte(_ vergleich: Heizlastrechner.Vergleich) -> some View {
        let ampel: Ampel = vergleich.abweichung == .stimmigZusammen ? .gruen : .gelb
        return Karte {
            Ampelzeile(
                ampel: ampel,
                titel: "Abgleich mit Ihren Gebäudeangaben",
                aussage: vergleich.aussage
            )
            if let gebaeude = zustand.gebaeude {
                betragszeile(
                    "Aus den Gebäudeangaben",
                    Formate.kilowattSpanne(zustand.heizlastrechner.ausGebaeudedaten(gebaeude).spanne)
                )
            }
        }
    }

    // MARK: Ergebnis

    private func ergebniskarte(_ ergebnis: Heizlastergebnis) -> some View {
        Karte {
            Text("Abgeschätzte Heizlast")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Gestaltung.Farbe.marke)
                .textCase(.uppercase)
                .kerning(0.8)

            Text(Formate.kilowattSpanne(ergebnis.spanne))
                .stilErgebniszahl()
                .foregroundStyle(Gestaltung.Farbe.marke)

            Text(ergebnis.verfahren.bezeichnung)
                .stilNebentext()

            Annahmenliste(annahmen: ergebnis.annahmen)
        }
    }

    /// Die Frage, an der Wärmepumpenprojekte tatsächlich scheitern.
    private func heizflaechen(_ ergebnis: Heizlastergebnis) -> some View {
        let pruefung = Heizflaechenrechner.pruefe(
            heizkoerper: zustand.heizkoerper,
            heizlastKW: ergebnis.spanne.mitte
        )
        return Karte {
            Text("Reichen Ihre Heizkörper?")
                .stilAbschnittstitel()

            Text("Über eine Wärmepumpe entscheidet nicht die Kilowattzahl, sondern ob die vorhandenen Heizflächen die Wärme auch bei 55 statt 70 Grad abgeben.")
                .stilNebentext()

            if zustand.heizkoerper.isEmpty {
                NavigationLink {
                    HeizkoerperAnsicht()
                } label: {
                    Label("Heizkörper erfassen", systemImage: "plus.circle")
                        .font(.subheadline.weight(.medium))
                        .frame(minHeight: 44)
                }
            } else {
                Ampelzeile(
                    ampel: pruefung.ampel,
                    titel: "Bei 55 °C Vorlauf",
                    aussage: pruefung.aussage
                )
                betragszeile("Nennleistung nutzbar", Formate.prozent(pruefung.leistungsfaktor))
                betragszeile("Verfügbar", Formate.kilowatt(pruefung.verfuegbareLeistungKW))
                betragszeile("Benötigt", Formate.kilowatt(pruefung.benoetigtKW))

                NavigationLink("Heizkörper bearbeiten") { HeizkoerperAnsicht() }
                    .font(.subheadline)
                    .frame(minHeight: 44)
            }
        }
    }

    private func betragszeile(_ titel: String, _ wert: String) -> some View {
        HStack {
            Text(titel).font(.footnote).foregroundStyle(Gestaltung.Farbe.textLeise)
            Spacer()
            Text(wert).font(.footnote.monospacedDigit())
        }
    }

    private func vorbehaltskarte(_ ergebnis: Heizlastergebnis) -> some View {
        Karte {
            HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(Gestaltung.Farbe.gelb)
                Text(ergebnis.vorbehalt)
                    .font(.footnote)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func jahresbeschriftung(_ index: Int) -> String {
        let jahr = Calendar(identifier: .gregorian).component(.year, from: Date()) - 1 - index
        return "\(jahr)"
    }
}

// MARK: - Heizkörper

struct HeizkoerperAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var raum = ""
    @State private var leistung = ""

    var body: some View {
        List {
            Section {
                ForEach(zustand.heizkoerper) { koerper in
                    HStack {
                        Text(koerper.raum)
                        Spacer()
                        Text("\(Int(koerper.nennleistungWatt)) W")
                            .stilBetrag()
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                }
                .onDelete { indizes in
                    var liste = zustand.heizkoerper
                    liste.remove(atOffsets: indizes)
                    zustand.setzeHeizkoerper(liste)
                }
            } header: {
                Text("Erfasste Heizkörper")
            } footer: {
                Text("Die Nennleistung steht meist auf einem Aufkleber an der Seite oder lässt sich aus Bauhöhe, Länge und Bautiefe ableiten. Ein grober Wert genügt für die Abschätzung.")
            }

            Section("Hinzufügen") {
                TextField("Raum, z. B. Wohnzimmer", text: $raum)
                TextField("Nennleistung in Watt", text: $leistung)
                    .keyboardType(.numberPad)
                Button("Hinzufügen") {
                    guard let watt = Double(leistung), watt > 0, !raum.isEmpty else { return }
                    var liste = zustand.heizkoerper
                    liste.append(Heizkoerper(raum: raum, nennleistungWatt: watt))
                    zustand.setzeHeizkoerper(liste)
                    raum = ""
                    leistung = ""
                }
                .disabled(raum.isEmpty || Double(leistung) == nil)
            }
        }
        .navigationTitle("Heizkörper")
        .navigationBarTitleDisplayMode(.inline)
    }
}
