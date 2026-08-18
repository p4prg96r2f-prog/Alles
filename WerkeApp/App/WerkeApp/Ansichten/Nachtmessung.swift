import SwiftUI
import WerkeKern

/// Heizlast aus einer kalten Nacht.
///
/// Der ganze Bildschirm ist um eine einzige Anleitung gebaut: abends ablesen,
/// morgens ablesen, Außentemperatur eintragen. Alles Weitere rechnet die App.
struct NachtmessungAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand

    /// Die erfassten Nächte liegen in der Ablage, nicht im Bildschirmzustand.
    /// Eine kalte Nacht lässt sich nicht nachholen – und der Bildschirm bittet
    /// ausdrücklich um eine zweite und dritte.
    private var naechte: [Nachtmessung] { zustand.nachtmessungen }
    @State private var abendstand = ""
    @State private var morgenstand = ""
    @State private var abends = NachtmessungAnsicht.standardAbend()
    @State private var morgens = NachtmessungAnsicht.standardMorgen()
    @State private var aussentemperatur: Double = -3
    @State private var innentemperatur: Double = 20
    @State private var kesselart: Kesselart = .standardkessel

    private var normaussentemperatur: Double {
        zustand.regeln.klimaregion(fuerPLZ: zustand.gebaeude?.plz ?? "")?.normaussentemperatur ?? -12
    }

    private var ergebnis: Nachtmessergebnis? {
        guard !naechte.isEmpty else { return nil }
        // Die Wohnfläche geht nur in die inneren Gewinne ein: In einem großen
        // Haus schlafen mehr Menschen und laufen mehr Geräte mit.
        return zustand.heizlastrechner.ausNaechten(
            naechte,
            normaussentemperatur: normaussentemperatur,
            beheizteFlaeche: zustand.gebaeude.map(\.wohnflaeche)
        )
    }

    private var abendwert: Double? { Double(abendstand.replacingOccurrences(of: ",", with: ".")) }
    private var morgenwert: Double? { Double(morgenstand.replacingOccurrences(of: ",", with: ".")) }

    /// Was der Auswertung gerade im Weg steht – im Klartext, nicht als graue
    /// Schaltfläche.
    private var hindernisse: [String] {
        var gruende: [String] = []
        if abendstand.isEmpty || morgenstand.isEmpty {
            gruende.append("Tragen Sie beide Zählerstände ein – abends und am nächsten Morgen.")
        } else if abendwert == nil || morgenwert == nil {
            gruende.append("Ein Zählerstand ist keine Zahl. Nachkommastellen bitte mit Komma.")
        } else if let a = abendwert, let m = morgenwert, m <= a {
            gruende.append("Der Morgenwert muss größer sein als der Abendwert. Vermutlich sind die beiden Felder vertauscht.")
        }
        if morgens <= abends {
            gruende.append("Die Uhrzeit am Morgen muss nach der Uhrzeit am Abend liegen.")
        }
        if innentemperatur - aussentemperatur <= 5 {
            gruende.append("Der Unterschied zwischen innen und außen ist zu klein. Verlässlich wird die Messung ab etwa 15 Grad Unterschied.")
        }
        return gruende
    }

    private var eingabeGueltig: Bool { hindernisse.isEmpty }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
                anleitung
                eingabe
                if let ergebnis { ergebniskarte(ergebnis) }
                if !naechte.isEmpty { naechteliste }
                if let ergebnis {
                    WerkeKontaktKarte(zusammenfassung: [
                        "Heizlast aus Nachtmessung: \(Formate.kilowattSpanne(ergebnis.heizlast)) (\(ergebnis.naechte) Nacht/Nächte, \(Formate.zahl(ergebnis.waermeverlustkoeffizient, stellen: 0)) W/K)"
                    ])
                }
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Kalte Nacht")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Anleitung

    private var anleitung: some View {
        Karte {
            Text("So geht es")
                .stilAbschnittstitel()

            schritt(1, "Abends ablesen", "Am besten gegen 22 Uhr, an einem möglichst kalten Tag. Heizung normal weiterlaufen lassen, nicht absenken.")
            schritt(2, "Morgens ablesen", "Vor dem ersten Duschen – warmes Wasser würde die Messung verfälschen.")
            schritt(3, "Temperatur eintragen", "Wie kalt war es in der Nacht? Ein Blick in die Wetter-App oder auf das Display der Heizung genügt.")

            Hinweisleiste(text: "Je kälter die Nacht, desto genauer das Ergebnis. Unter 15 Grad Unterschied zwischen innen und außen wird es unsicher.")
        }
    }

    private func schritt(_ nummer: Int, _ titel: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
            Text("\(nummer)")
                .font(.subheadline.weight(.bold).monospacedDigit())
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(Circle().fill(Gestaltung.Farbe.marke))
            VStack(alignment: .leading, spacing: 2) {
                Text(titel).font(.subheadline.weight(.semibold))
                Text(text).stilNebentext().fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: Eingabe

    private var eingabe: some View {
        Karte {
            Text("Ihre Messung")
                .stilAbschnittstitel()

            standzeile("Abends", wert: $abendstand, zeit: $abends)
            standzeile("Morgens", wert: $morgenstand, zeit: $morgens)

            Divider().overlay(Gestaltung.Farbe.trennlinie)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Draußen war es").font(.subheadline)
                    Spacer()
                    Text("\(Formate.zahl(aussentemperatur, stellen: 0)) °C")
                        .font(.subheadline.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.marke)
                }
                Slider(value: $aussentemperatur, in: -20...15, step: 1)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Drinnen gehalten").font(.subheadline)
                    Spacer()
                    Text("\(Formate.zahl(innentemperatur, stellen: 0)) °C")
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                }
                Slider(value: $innentemperatur, in: 16...25, step: 0.5)
            }

            Picker("Heizung", selection: $kesselart) {
                ForEach(Kesselart.allCases, id: \.self) { Text($0.bezeichnung).tag($0) }
            }
            .pickerStyle(.menu)

            // Ein grauer Knopf ohne Begründung ist im Keller bei schlechtem
            // Licht und zwei achtstelligen Zahlen eine Sackgasse. Jede
            // verletzte Bedingung wird deshalb benannt.
            ForEach(hindernisse, id: \.self) { grund in
                Hinweisleiste(text: grund, symbol: "exclamationmark.triangle")
            }

            Hauptknopf(titel: naechte.isEmpty ? "Auswerten" : "Weitere Nacht hinzufügen", symbol: "plus.circle") {
                uebernehmen()
            }
            .disabled(!eingabeGueltig)
        }
    }

    private func standzeile(_ titel: String, wert: Binding<String>, zeit: Binding<Date>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(titel).font(.subheadline.weight(.medium))
            HStack(spacing: Gestaltung.Abstand.eng) {
                TextField("Zählerstand", text: wert)
                    .keyboardType(.decimalPad)
                    .padding(10)
                    .background(Gestaltung.Farbe.hintergrund)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                DatePicker("", selection: zeit, displayedComponents: [.date, .hourAndMinute])
                    .labelsHidden()
            }
        }
    }

    // MARK: Ergebnis

    private func ergebniskarte(_ ergebnis: Nachtmessergebnis) -> some View {
        Karte {
            HStack {
                Text("Gemessene Heizlast")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Gestaltung.Farbe.marke)
                    .textCase(.uppercase)
                    .kerning(0.8)
                Spacer()
                Text(ergebnis.guete.bezeichnung)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(farbe(ergebnis.guete).opacity(0.18))
                    .foregroundStyle(farbe(ergebnis.guete))
                    .clipShape(Capsule())
            }

            Text(Formate.kilowattSpanne(ergebnis.heizlast))
                .stilErgebniszahl()
                .foregroundStyle(Gestaltung.Farbe.marke)

            Spannenbalken(
                spanne: ergebnis.heizlast,
                skala: 0...max(10, (ergebnis.heizlast.oben * 1.4 / 5).rounded(.up) * 5),
                einheit: "kW"
            )

            Text("\(Formate.zahl(ergebnis.waermeverlustkoeffizient, stellen: 0)) W/K · \(ergebnis.naechte) Nacht(e) · \(Formate.zahl(ergebnis.temperaturdifferenz, stellen: 0)) K Unterschied")
                .stilNebentext()

            if let hinweis = ergebnis.hinweis {
                Hinweisleiste(text: hinweis, symbol: "lightbulb")
            }

            Annahmenliste(annahmen: ergebnis.annahmen)

            Hauptknopf(titel: "Ergebnis sichern", symbol: "square.and.arrow.down") {
                zustand.merkeBerechnung(
                    art: "Heizlast aus Nachtmessung",
                    kurzfassung: Formate.kilowattSpanne(ergebnis.heizlast),
                    version: zustand.regeln.version,
                    stand: zustand.regeln.stand
                )
            }
        }
    }

    private var naechteliste: some View {
        Karte {
            Text("Erfasste Nächte")
                .stilAbschnittstitel()
            ForEach(naechte) { nacht in
                HStack {
                    Text(datum(nacht.beginn)).font(.subheadline)
                    Spacer()
                    Text("\(Formate.zahl(nacht.mittlereAussentemperatur, stellen: 0)) °C · \(Formate.zahl(nacht.stunden, stellen: 1)) h")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                    Button {
                        zustand.loescheNachtmessungen([nacht.id])
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(Gestaltung.Farbe.rot)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Nacht vom \(datum(nacht.beginn)) löschen")
                }
                .padding(.vertical, 4)
            }
            Hinweisleiste(text: "Drei unterschiedlich kalte Nächte machen aus einer guten Abschätzung einen belastbaren Wert.")
        }
    }

    // MARK: Hilfen

    private func uebernehmen() {
        guard let vorher = Double(abendstand.replacingOccurrences(of: ",", with: ".")),
              let nachher = Double(morgenstand.replacingOccurrences(of: ",", with: ".")) else { return }

        zustand.ergaenzeNachtmessung(Nachtmessung(
            beginn: abends, ende: morgens,
            zaehlerVorher: vorher, zaehlerNachher: nachher,
            mittlereAussentemperatur: aussentemperatur,
            innentemperatur: innentemperatur,
            kesselart: kesselart
        ))
        abendstand = ""
        morgenstand = ""
        abends = Self.standardAbend()
        morgens = Self.standardMorgen()
    }

    private func farbe(_ guete: Nachtmessergebnis.Guete) -> Color {
        switch guete {
        case .belastbar: return Gestaltung.Farbe.gruen
        case .brauchbar: return Gestaltung.Farbe.gelb
        case .unsicher: return Gestaltung.Farbe.rot
        }
    }

    private func datum(_ wert: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "d.M., HH:mm"
        return f.string(from: wert)
    }

    private static func standardAbend() -> Date {
        let kalender = Calendar(identifier: .gregorian)
        let gestern = kalender.date(byAdding: .day, value: -1, to: Date()) ?? Date()
        return kalender.date(bySettingHour: 22, minute: 0, second: 0, of: gestern) ?? gestern
    }

    private static func standardMorgen() -> Date {
        let kalender = Calendar(identifier: .gregorian)
        return kalender.date(bySettingHour: 6, minute: 0, second: 0, of: Date()) ?? Date()
    }
}
