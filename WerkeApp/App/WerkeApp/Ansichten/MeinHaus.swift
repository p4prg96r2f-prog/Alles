import SwiftUI
import UniformTypeIdentifiers
import WerkeKern

/// Die Gebäudeakte. Genauigkeit wird belohnt, nicht verlangt: Jede Ergänzung
/// verengt sichtbar die Ergebnisspanne, statt dass die App vollständige Eingaben
/// einfordert.
struct MeinHausAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var zeigeZaehler = false
    @State private var zeigeEinstellungen = false

    var body: some View {
        NavigationStack {
            List {
                if let gebaeude = zustand.gebaeude {
                    kopf(gebaeude)
                    kennzahlen()
                    anschrift(gebaeude)
                    bauteile(gebaeude)
                    heizung(gebaeude)
                    nutzung(gebaeude)
                    zaehler
                    dokumente
                    berechnungen
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Mein Haus")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        zeigeEinstellungen = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Einstellungen")
                }
            }
            .sheet(isPresented: $zeigeZaehler) { ZaehlerstandAnsicht() }
            .sheet(isPresented: $zeigeEinstellungen) {
                NavigationStack { EinstellungenAnsicht() }
            }
        }
    }

    // MARK: Kopf

    private func kopf(_ gebaeude: Gebaeude) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 4) {
                Text(gebaeude.anschrift.isEmpty ? "Ihr Haus" : gebaeude.anschrift)
                    .font(.headline)
                Text("\(gebaeude.typ.bezeichnung) · Baujahr \(gebaeude.baujahr) · \(Int(gebaeude.wohnflaeche)) m²")
                    .stilNebentext()
            }
            .padding(.vertical, 4)

            // Der Einstieg darf die Anschrift überspringen – dann muss es
            // später eine Stelle geben, an der sie nachgetragen werden kann.
            // Die Postleitzahl entscheidet über die Normaußentemperatur und
            // damit über jede Heizlast in dieser App.
            if gebaeude.plz.isEmpty {
                Hinweisleiste(
                    text: "Ohne Postleitzahl wird mit dem bundesweiten Mittel gerechnet. Die Klimaregion verschiebt die Heizlast um bis zu ein Zehntel.",
                    symbol: "info.circle"
                )
            }

            if gebaeude.angabenVollstaendigkeit < 1 {
                Fortschrittsbalken(
                    anteil: gebaeude.angabenVollstaendigkeit,
                    beschriftung: "Angaben zu \(Int(gebaeude.angabenVollstaendigkeit * 100)) % ergänzt – jede weitere macht die Ergebnisse genauer."
                )
                .padding(.vertical, 6)
            }
        }
    }

    private func kennzahlen() -> some View {
        Section {
            HStack(spacing: Gestaltung.Abstand.eng) {
                // Immer der beste bekannte Wert, nie der veraltete: Sobald
                // genug Ablesungen da sind, steht hier der gemessene.
                Kennzahlkachel(
                    titel: zustand.besteHeizlast.map { "Heizlast, \($0.gemessen ? "gemessen" : "geschätzt")" }
                        ?? "Heizlast",
                    wert: zustand.besteHeizlast.map { Formate.kilowattSpanne($0.spanne) } ?? "–",
                    symbol: "thermometer.medium"
                )
                Kennzahlkachel(
                    titel: "Monate erfasst",
                    wert: "\(zustand.monateMitZaehlerstand)/\(zustand.regeln.gebaeude.verbrauchsausweisMonate)",
                    symbol: "gauge.medium"
                )
                Kennzahlkachel(
                    titel: "Dokumente",
                    wert: "\(zustand.dokumente.count)",
                    symbol: "folder"
                )
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
            .listRowBackground(Color.clear)
        }
    }

    // MARK: Anschrift

    private func anschrift(_ gebaeude: Gebaeude) -> some View {
        Section {
            TextField("Straße und Hausnummer", text: Binding(
                get: { gebaeude.strasse },
                set: { neu in zustand.aendereGebaeude { $0.strasse = neu } }
            ))
            HStack(spacing: Gestaltung.Abstand.normal) {
                TextField("PLZ", text: Binding(
                    get: { gebaeude.plz },
                    set: { neu in zustand.aendereGebaeude { $0.plz = String(neu.prefix(5)) } }
                ))
                .keyboardType(.numberPad)
                .frame(width: 90)
                TextField("Ort", text: Binding(
                    get: { gebaeude.ort },
                    set: { neu in zustand.aendereGebaeude { $0.ort = neu } }
                ))
            }
        } header: {
            Text("Anschrift")
        } footer: {
            if let region = zustand.regeln.klimaregion(fuerPLZ: gebaeude.plz) {
                Text("Klimaregion: \(region.name), Normaußentemperatur \(Formate.zahl(region.normaussentemperatur, stellen: 0)) °C. Die Anschrift bleibt auf dem Gerät.")
            } else {
                Text("Die Anschrift bleibt auf dem Gerät.")
            }
        }
    }

    // MARK: Bauteile

    private func bauteile(_ gebaeude: Gebaeude) -> some View {
        Section("Gebäudeteile") {
            zustandsZeile("Dach", wert: gebaeude.dach) { neu in
                zustand.aendereGebaeude { $0.dach = neu }
            }
            zustandsZeile("Oberste Geschossdecke", wert: gebaeude.obersteGeschossdecke) { neu in
                zustand.aendereGebaeude { $0.obersteGeschossdecke = neu }
            }
            zustandsZeile("Fassade", wert: gebaeude.fassade) { neu in
                zustand.aendereGebaeude { $0.fassade = neu }
            }
            zustandsZeile("Kellerdecke", wert: gebaeude.kellerdecke) { neu in
                zustand.aendereGebaeude { $0.kellerdecke = neu }
            }

            Picker("Fenster", selection: Binding(
                get: { gebaeude.fensterBaujahr ?? 0 },
                set: { neu in zustand.aendereGebaeude { $0.fensterBaujahr = neu == 0 ? nil : neu } }
            )) {
                Text("Unbekannt").tag(0)
                Text("vor 1995").tag(1990)
                Text("1995 – 2009").tag(2000)
                Text("2010 oder neuer").tag(2015)
            }
        }
    }

    private func zustandsZeile(
        _ titel: String,
        wert: Bauteilzustand,
        setzen: @escaping (Bauteilzustand) -> Void
    ) -> some View {
        Picker(titel, selection: Binding(get: { wert }, set: setzen)) {
            ForEach(Bauteilzustand.allCases, id: \.self) { fall in
                Text(fall.bezeichnung).tag(fall)
            }
        }
    }

    // MARK: Heizung

    private func heizung(_ gebaeude: Gebaeude) -> some View {
        Section("Heizung") {
            Picker("Art", selection: Binding(
                get: { gebaeude.heizungsart },
                set: { neu in zustand.aendereGebaeude { $0.heizungsart = neu } }
            )) {
                ForEach(Heizungsart.allCases, id: \.self) { art in
                    Text(art.bezeichnung).tag(art)
                }
            }

            Picker("Baujahr", selection: Binding(
                get: { gebaeude.heizungBaujahr ?? 0 },
                set: { neu in zustand.aendereGebaeude { $0.heizungBaujahr = neu == 0 ? nil : neu } }
            )) {
                Text("Unbekannt").tag(0)
                ForEach(heizungsjahrzehnte, id: \.self) { jahr in
                    Text(jahr >= 2020 ? "2020 oder neuer" : "\(jahr)er").tag(jahr)
                }
            }
        }
    }

    private var heizungsjahrzehnte: [Int] { [1980, 1990, 2000, 2010, 2020] }

    // MARK: Nutzung

    private func nutzung(_ gebaeude: Gebaeude) -> some View {
        Section {
            Toggle("Ich vermiete dieses Gebäude", isOn: Binding(
                get: { gebaeude.istVermietet },
                set: { neu in zustand.aendereGebaeude { $0.istVermietet = neu } }
            ))
            Toggle("Es ist ein Wohngebäude", isOn: Binding(
                get: { gebaeude.istWohngebaeude },
                set: { neu in zustand.aendereGebaeude { $0.istWohngebaeude = neu } }
            ))
            Toggle("Denkmalgeschützt", isOn: Binding(
                get: { gebaeude.istDenkmal },
                set: { neu in zustand.aendereGebaeude { $0.istDenkmal = neu } }
            ))
            Toggle("Sanierungsfahrplan liegt vor", isOn: Binding(
                get: { gebaeude.hatSanierungsfahrplan },
                set: { neu in zustand.aendereGebaeude { $0.hatSanierungsfahrplan = neu } }
            ))
        } header: {
            Text("Nutzung")
        } footer: {
            Text("Ob ein Sanierungsfahrplan vorliegt, entscheidet über einen möglichen Bonus und über die Höchstgrenze der förderfähigen Kosten.")
        }
    }

    // MARK: Zählerstände

    private var zaehler: some View {
        Section("Zählerstände") {
            Button {
                zeigeZaehler = true
            } label: {
                Label("Zählerstand erfassen", systemImage: "camera")
            }

            ForEach(zustand.zaehlerstaende.prefix(6)) { stand in
                HStack {
                    Text(stand.art.bezeichnung)
                    Spacer()
                    Text("\(stand.wert, specifier: "%.1f") \(stand.art.einheit)")
                        .stilBetrag()
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                    Text(kurzdatum(stand.datum))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                }
            }
            .onDelete { indizes in
                // Erst alle Kennungen einsammeln: Beim Löschen über Indizes
                // verschiebt sich die Liste unter der Schleife weg.
                let sichtbar = Array(zustand.zaehlerstaende.prefix(6))
                let kennungen = indizes.compactMap { index in
                    sichtbar.indices.contains(index) ? sichtbar[index].id : nil
                }
                kennungen.forEach { zustand.loescheZaehlerstand($0) }
            }
        }
    }

    // MARK: Dokumente und Berechnungen

    private var dokumente: some View {
        Section("Dokumente") {
            NavigationLink {
                DokumenteAnsicht()
            } label: {
                Label("\(zustand.dokumente.count) abgelegt", systemImage: "folder")
            }
        }
    }

    private var berechnungen: some View {
        Section {
            if zustand.berechnungen.isEmpty {
                Text("Noch keine gesicherten Berechnungen.")
                    .stilNebentext()
            } else {
                ForEach(zustand.berechnungen.prefix(5)) { eintrag in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(eintrag.art).font(.subheadline.weight(.medium))
                        Text(eintrag.kurzfassung).stilNebentext()
                        Text("Regelfassung \(eintrag.regelVersion), Stand \(Formate.datumLesbar(eintrag.regelStand))")
                            .font(.caption2)
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                    .padding(.vertical, 2)
                }
            }
        } header: {
            Text("Gesicherte Berechnungen")
        } footer: {
            Text("Jede Berechnung wird mit ihrer Regelfassung abgelegt. Dadurch bleibt sie auch dann nachvollziehbar, wenn sich die Förderung später ändert.")
        }
    }

    private func kurzdatum(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "d.M.yy"
        return f.string(from: datum)
    }
}

// MARK: - Dokumente

struct DokumenteAnsicht: View {
    @EnvironmentObject private var zustand: AppZustand

    @State private var zeigeAuswahl = false
    @State private var art: Dokument.Dokumentart = .energieausweis
    @State private var fehler: String?

    var body: some View {
        List {
            if zustand.dokumente.isEmpty {
                // Ein leerer Zustand, der die Funktion bewirbt, aber keinen
                // Weg anbietet, ist eine Sackgasse. Der Knopf gehört hierher.
                ContentUnavailableView {
                    Label("Noch keine Dokumente", systemImage: "folder")
                } description: {
                    Text("Energieausweis, Sanierungsfahrplan, Förderbescheide und Rechnungen an einem Ort – spätestens beim Hausverkauf werden genau diese Unterlagen verlangt.")
                } actions: {
                    Button("Dokument hinzufügen") { zeigeAuswahl = true }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                ForEach(zustand.dokumente) { dokument in
                    HStack(spacing: Gestaltung.Abstand.normal) {
                        Image(systemName: dokument.art.symbol)
                            .foregroundStyle(Gestaltung.Farbe.marke)
                            .frame(width: 28)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(dokument.titel).font(.subheadline.weight(.medium))
                            Text(dokument.art.bezeichnung).stilNebentext()
                        }
                    }
                }
                .onDelete { indizes in
                    let sichtbar = zustand.dokumente
                    let kennungen = indizes.compactMap { index in
                        sichtbar.indices.contains(index) ? sichtbar[index].id : nil
                    }
                    kennungen.forEach { zustand.loescheDokument($0) }
                }
            }
        }
        .navigationTitle("Dokumente")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Art", selection: $art) {
                        ForEach(Dokument.Dokumentart.allCases, id: \.self) {
                            Label($0.bezeichnung, systemImage: $0.symbol).tag($0)
                        }
                    }
                    Button {
                        zeigeAuswahl = true
                    } label: {
                        Label("Datei auswählen", systemImage: "plus")
                    }
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Dokument hinzufügen")
            }
        }
        .fileImporter(
            isPresented: $zeigeAuswahl,
            allowedContentTypes: [.pdf, .image, .plainText, .data],
            allowsMultipleSelection: true
        ) { ergebnis in
            switch ergebnis {
            case .success(let dateien):
                let misslungen = dateien.filter {
                    !zustand.uebernehmeDokument(von: $0, titel: $0.deletingPathExtension().lastPathComponent, art: art)
                }
                if !misslungen.isEmpty {
                    fehler = misslungen.count == 1
                        ? "Eine Datei konnte nicht übernommen werden."
                        : "\(misslungen.count) Dateien konnten nicht übernommen werden."
                }
            case .failure(let grund):
                fehler = grund.localizedDescription
            }
        }
        .alert("Nicht übernommen", isPresented: Binding(
            get: { fehler != nil },
            set: { if !$0 { fehler = nil } }
        )) {
            Button("Verstanden", role: .cancel) { fehler = nil }
        } message: {
            Text(fehler ?? "")
        }
    }
}
