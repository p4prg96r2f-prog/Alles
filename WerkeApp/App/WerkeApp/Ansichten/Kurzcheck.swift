import SwiftUI
import WerkeKern

/// Der Kurzcheck von außen: fünf Fragen, die man vom Bürgersteig aus
/// beantworten kann – und danach ein Ergebnis, das mit jeder weiteren Angabe
/// sichtbar genauer wird.
///
/// Gestaltungsgedanke: Die Spanne ist nicht das Kleingedruckte, sondern der
/// Hauptdarsteller. Wer eine Angabe ergänzt, sieht das Band schrumpfen. Damit
/// wird aus einer Nachfrage eine Belohnung.
struct KurzcheckAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var check = Kurzcheck()
    @State private var schritt = 0
    @State private var flaecheText = ""
    @State private var offeneVerfeinerung: Verfeinerung?
    /// Bekanntes wird genau einmal übernommen. Liefe das bei jedem Erscheinen,
    /// würde ein Rücksprung die bereits gegebenen Antworten überschreiben.
    @State private var bekanntesUebernommen = false
    @State private var zeigeUebernahme = false
    @State private var uebernommen = false

    private let letzteFrage = 4

    private var normaussentemperatur: Double {
        zustand.regeln.klimaregion(fuerPLZ: zustand.gebaeude?.plz ?? "")?.normaussentemperatur ?? -12
    }

    private var rechner: Huellflaechenrechner {
        Huellflaechenrechner(regeln: zustand.regeln)
    }

    private var ergebnis: Kurzcheckergebnis {
        rechner.berechne(kurzcheck: check, normaussentemperatur: normaussentemperatur)
    }

    var body: some View {
        VStack(spacing: 0) {
            if schritt <= letzteFrage {
                Schrittpunkte(aktuell: schritt, gesamt: letzteFrage + 1)
                    .padding(.horizontal, Gestaltung.Abstand.weit)
                    .padding(.top, Gestaltung.Abstand.normal)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                    if schritt <= letzteFrage { frage } else { ergebnisseite }
                }
                .padding(Gestaltung.Abstand.normal)
            }
            .scrollDismissesKeyboard(.interactively)

            if schritt <= letzteFrage { fussleiste }
        }
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Kurzcheck")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if schritt > 0 && schritt <= letzteFrage {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Zurück") { withAnimation(.snappy) { schritt -= 1 } }
                }
            }
            if schritt > letzteFrage {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Angaben") { withAnimation(.snappy) { schritt = 0 } }
                }
            }
        }
        .sheet(item: $offeneVerfeinerung) { verfeinerung in
            NavigationStack {
                VerfeinerungsAnsicht(verfeinerung: verfeinerung, check: $check)
            }
            .presentationDetents([.medium, .large])
        }
        .onAppear { uebernehmeBekanntes() }
    }

    // MARK: Die fünf Fragen

    @ViewBuilder
    private var frage: some View {
        switch schritt {
        case 0: frageGroesse
        case 1: frageGeschosse
        case 2: frageAnbau
        case 3: frageEpoche
        default: frageFassade
        }
    }

    private func kopf(_ titel: String, _ untertitel: String) -> some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            Text(titel)
                .font(.system(.title2, design: .rounded, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)
            Text(untertitel)
                .stilNebentext()
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var frageGroesse: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            kopf("Wie breit ist das Haus?",
                 "Gehen Sie an der Straßenseite entlang und zählen Sie Ihre Schritte. Genauer geht später auch.")

            Karte {
                HStack {
                    Text("Schritte")
                        .stilAbschnittstitel()
                    Spacer()
                    Text("\(check.seitenlaengeSchritte ?? 14)")
                        .font(.title.weight(.bold).monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.marke)
                }
                Stepper(
                    "Schritte",
                    value: Binding(
                        get: { check.seitenlaengeSchritte ?? 14 },
                        set: { check.seitenlaengeSchritte = $0; check.grundflaecheDirekt = nil }
                    ),
                    in: 4...60
                )
                .labelsHidden()

                Divider().overlay(Gestaltung.Farbe.trennlinie)

                HStack {
                    Text("Ihre Schrittlänge")
                        .font(.subheadline)
                    Spacer()
                    Text("\(Formate.zahl(check.schrittlaengeMeter, stellen: 2)) m")
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                }
                Slider(value: $check.schrittlaengeMeter, in: 0.55...1.0, step: 0.05)

                Hinweisleiste(text: "Etwa 0,75 m ist üblich. Wer sehr groß ist, nimmt mehr. Ein Schritt entspricht ungefähr der eigenen Körpergröße mal 0,41.")
            }

            Karte {
                Text("Oder direkt eingeben")
                    .stilAbschnittstitel()
                Text("Wenn Sie die überbaute Fläche kennen – aus Bauzeichnung, Kaufvertrag oder Karte.")
                    .stilNebentext()
                HStack {
                    TextField("Grundfläche in m²", text: $flaecheText)
                        .keyboardType(.numberPad)
                        .padding(10)
                        .background(Gestaltung.Farbe.hintergrund)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .onChange(of: flaecheText) { _, neu in
                            check.grundflaecheDirekt = Double(neu.filter(\.isNumber))
                        }
                    Text("m²").foregroundStyle(Gestaltung.Farbe.textLeise)
                }
            }

            zwischenergebnis
        }
    }

    private var frageGeschosse: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            kopf("Wie viele Geschosse werden bewohnt?",
                 "Von der Straße abzählbar. Dachfenster oder Gauben verraten ein ausgebautes Dach.")

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Kurzcheck.Geschosse.allCases, id: \.self) { wahl in
                    Auswahlkachel(
                        titel: wahl.bezeichnung,
                        untertitel: wahl.hinweis,
                        symbol: symbol(fuer: wahl),
                        ausgewaehlt: check.geschosse == wahl
                    ) { check.geschosse = wahl }
                }
            }
            zwischenergebnis
        }
    }

    private var frageAnbau: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            kopf("Wie steht das Haus?",
                 "Jede Wand am Nachbarn ist eine Wand, die keine Wärme verliert.")

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Kurzcheck.Anbausituation.allCases, id: \.self) { wahl in
                    Auswahlkachel(
                        titel: wahl.bezeichnung,
                        untertitel: wahl.hinweis,
                        symbol: symbol(fuer: wahl),
                        ausgewaehlt: check.anbausituation == wahl
                    ) { check.anbausituation = wahl }
                }
            }
            zwischenergebnis
        }
    }

    private var frageEpoche: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            kopf("Aus welcher Zeit stammt das Haus?",
                 "Ungefähr genügt. Die Bauzeit bestimmt, wie die Wände aufgebaut sind.")

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Kurzcheck.Epoche.allCases, id: \.self) { wahl in
                    Auswahlkachel(
                        titel: wahl.bezeichnung,
                        untertitel: wahl.hinweis,
                        ausgewaehlt: check.epoche == wahl
                    ) { check.epoche = wahl }
                }
            }
            zwischenergebnis
        }
    }

    private var frageFassade: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            kopf("Was sieht man an der Fassade?",
                 "Das sicherste Zeichen: Sitzen die Fensterrahmen tief in der Wand, wurde gedämmt.")

            Karte {
                HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                    Image(systemName: "rectangle.inset.filled")
                        .font(.title2)
                        .foregroundStyle(Gestaltung.Farbe.marke)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Woran man es erkennt")
                            .font(.subheadline.weight(.semibold))
                        Text("Ohne Dämmung schließt der Fensterrahmen fast bündig mit der Wand ab. Mit Dämmung liegt er sechs bis zwanzig Zentimeter tiefer – die Laibung wirft einen deutlichen Schatten.")
                            .stilNebentext()
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(Kurzcheck.Fassadenbild.allCases, id: \.self) { wahl in
                    Auswahlkachel(
                        titel: wahl.bezeichnung,
                        untertitel: wahl.hinweis,
                        symbol: symbol(fuer: wahl),
                        ausgewaehlt: check.fassadenbild == wahl
                    ) { check.fassadenbild = wahl }
                }
            }
            zwischenergebnis
        }
    }

    /// Ab der ersten Frage sichtbar: Das Ergebnis entsteht mit, statt am Ende
    /// aufzutauchen.
    private var zwischenergebnis: some View {
        let e = ergebnis
        return Karte {
            HStack {
                Text("Schon jetzt")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Gestaltung.Farbe.marke)
                    .textCase(.uppercase)
                    .kerning(0.8)
                Spacer()
                Text("± \(Formate.zahl(e.unsicherheit * 100, stellen: 0)) %")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
            }
            Spannenbalken(spanne: e.heizlast, skala: skala(fuer: e), einheit: "kW")
        }
    }

    // MARK: Ergebnis

    private var ergebnisseite: some View {
        let e = ergebnis
        return VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {

            Karte {
                Text("Geschätzte Heizlast")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Gestaltung.Farbe.marke)
                    .textCase(.uppercase)
                    .kerning(0.8)

                Text(Formate.kilowattSpanne(e.heizlast))
                    .stilErgebniszahl()
                    .foregroundStyle(Gestaltung.Farbe.marke)

                Spannenbalken(spanne: e.heizlast, skala: skala(fuer: e), einheit: "kW")

                Text("\(Formate.zahl(e.jeQuadratmeter, stellen: 0)) W/m² · \(Formate.zahl(e.beheizteFlaeche, stellen: 0)) m² beheizt · ± \(Formate.zahl(e.unsicherheit * 100, stellen: 0)) %")
                    .stilNebentext()

                Annahmenliste(annahmen: e.annahmen)
            }

            if let naechster = e.naechsterSchritt {
                Karte {
                    HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                        Image(systemName: "arrow.down.right.and.arrow.up.left")
                            .font(.title3)
                            .foregroundStyle(Gestaltung.Farbe.marke)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Das bringt jetzt am meisten")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Gestaltung.Farbe.textLeise)
                                .textCase(.uppercase)
                            Text(naechster.titel)
                                .font(.headline)
                            Text(naechster.beschreibung)
                                .stilNebentext()
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Hauptknopf(titel: "Jetzt ergänzen", symbol: "plus.circle") {
                        offeneVerfeinerung = naechster
                    }
                }
            }

            Karte {
                Text("Genauer machen")
                    .stilAbschnittstitel()
                Text("Die Reihenfolge ist nach Wirkung sortiert. Angezeigt ist, um wie viele Prozentpunkte die Spanne schrumpft.")
                    .stilNebentext()

                ForEach(e.verfeinerungen) { verfeinerung in
                    Button {
                        if !verfeinerung.erledigt { offeneVerfeinerung = verfeinerung }
                    } label: {
                        verfeinerungszeile(verfeinerung)
                    }
                    .buttonStyle(.plain)
                    .disabled(verfeinerung.erledigt)
                }
            }

            Karte {
                Hinweisleiste(text: e.vorbehalt, symbol: "exclamationmark.triangle")
            }

            if uebernommen {
                Karte {
                    Ampelzeile(
                        ampel: .gruen,
                        titel: "In „Mein Haus“ übernommen",
                        aussage: "Baujahr, Gebäudetyp und Fläche stehen jetzt in Ihrer Gebäudeakte. Förderabschätzung und Anforderungen rechnen ab sofort damit."
                    )
                }
            } else {
                Hauptknopf(titel: "In mein Haus übernehmen", symbol: "square.and.arrow.down") {
                    zeigeUebernahme = true
                }
            }
        }
        .confirmationDialog(
            "In „Mein Haus“ übernehmen?",
            isPresented: $zeigeUebernahme,
            titleVisibility: .visible
        ) {
            Button("Übernehmen") { uebernehmeInsGebaeude() }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text(uebernahmetext)
        }
    }

    /// Was sich durch die Übernahme ändert – vorher und nachher, im Klartext.
    ///
    /// Der Kurzcheck arbeitet mit Näherungen: einer Epoche statt eines
    /// Baujahrs, abgeschrittenen Metern statt der Wohnfläche aus dem
    /// Kaufvertrag. Diese Näherungen dürfen eine bestätigte Angabe nicht
    /// stillschweigend ersetzen.
    private var uebernahmetext: String {
        let neu = rechner.gebaeudeAus(check)
        let flaeche = rechner.huelleAus(check).beheizteFlaeche
        guard let alt = zustand.gebaeude else {
            return "Es wird ein neues Haus angelegt: \(neu.typ.bezeichnung), Baujahr \(neu.baujahr), \(Formate.zahl(flaeche, stellen: 0)) m²."
        }

        var zeilen: [String] = []
        if alt.baujahr != neu.baujahr {
            zeilen.append("Baujahr \(alt.baujahr) → \(neu.baujahr) (Mitte der Epoche)")
        }
        if alt.typ != neu.typ {
            zeilen.append("Gebäudetyp \(alt.typ.bezeichnung) → \(neu.typ.bezeichnung)")
        }
        if abs(alt.wohnflaeche - flaeche) > 1 {
            zeilen.append("Wohnfläche \(Formate.zahl(alt.wohnflaeche, stellen: 0)) → \(Formate.zahl(flaeche, stellen: 0)) m²")
        }
        if zeilen.isEmpty {
            return "Es ändert sich nichts – die Angaben stimmen bereits überein. Unbekannte Bauteilzustände werden ergänzt."
        }
        return zeilen.joined(separator: "\n")
            + "\n\nBauteilzustände werden nur ergänzt, wo bisher „unbekannt“ steht."
    }

    private func verfeinerungszeile(_ verfeinerung: Verfeinerung) -> some View {
        HStack(spacing: Gestaltung.Abstand.normal) {
            Image(systemName: verfeinerung.erledigt ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(verfeinerung.erledigt ? Gestaltung.Farbe.gruen : Gestaltung.Farbe.textLeise)

            VStack(alignment: .leading, spacing: 2) {
                Text(verfeinerung.titel)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Gestaltung.Farbe.text)
                Text(verfeinerung.aufwand.bezeichnung)
                    .font(.caption2)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
            }

            Spacer(minLength: Gestaltung.Abstand.eng)

            if verfeinerung.erledigt {
                Text("erledigt")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Gestaltung.Farbe.gruen)
            } else if verfeinerung.verengung > 0.005 {
                Text("−\(Formate.zahl(verfeinerung.verengung * 100, stellen: 0))")
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .foregroundStyle(Gestaltung.Farbe.marke)
                    .frame(minWidth: 40, alignment: .trailing)
            }
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(verfeinerung.erledigt
            ? "\(verfeinerung.titel), erledigt"
            : "\(verfeinerung.titel), verengt die Spanne um \(Int(verfeinerung.verengung * 100)) Prozentpunkte")
    }

    // MARK: Fußleiste

    private var fussleiste: some View {
        VStack(spacing: Gestaltung.Abstand.eng) {
            Hauptknopf(titel: schritt == letzteFrage ? "Ergebnis ansehen" : "Weiter") {
                withAnimation(.snappy) { schritt += 1 }
            }
            if schritt < letzteFrage {
                Nebenknopf(titel: "Rest überspringen") {
                    withAnimation(.snappy) { schritt = letzteFrage + 1 }
                }
            }
        }
        .padding(Gestaltung.Abstand.weit)
        .background(.bar)
    }

    // MARK: Hilfen

    private func skala(fuer ergebnis: Kurzcheckergebnis) -> ClosedRange<Double> {
        let oben = max(10, (ergebnis.heizlast.oben * 1.35 / 5).rounded(.up) * 5)
        return 0...oben
    }

    private func uebernehmeBekanntes() {
        guard !bekanntesUebernommen else { return }
        bekanntesUebernommen = true
        guard let gebaeude = zustand.gebaeude else { return }
        check.anbausituation = anbau(fuer: gebaeude.typ)
        check.epoche = epoche(fuer: gebaeude.baujahr)
        if flaecheText.isEmpty, gebaeude.wohnflaeche > 0 {
            // Wohnfläche ist nicht Grundfläche – daher nur als Vorschlag für
            // die Schrittzahl, nicht als direkte Angabe.
            let geschosse = Double(check.geschosse.vollgeschosse)
            let grund = gebaeude.wohnflaeche / max(1, geschosse)
            let laenge = (grund / 0.75).squareRoot()
            check.seitenlaengeSchritte = max(4, Int((laenge / check.schrittlaengeMeter).rounded()))
        }
    }

    private func uebernehmeInsGebaeude() {
        let huelle = rechner.huelleAus(check)
        let abgeleitet = rechner.gebaeudeAus(check)

        if zustand.gebaeude == nil {
            zustand.setzeGebaeude(abgeleitet)
        }
        zustand.aendereGebaeude { gebaeude in
            gebaeude.typ = abgeleitet.typ
            gebaeude.baujahr = abgeleitet.baujahr
            gebaeude.wohnflaeche = huelle.beheizteFlaeche
            if gebaeude.fassade == .unbekannt { gebaeude.fassade = abgeleitet.fassade }
            if gebaeude.dach == .unbekannt { gebaeude.dach = abgeleitet.dach }
            if gebaeude.obersteGeschossdecke == .unbekannt {
                gebaeude.obersteGeschossdecke = abgeleitet.obersteGeschossdecke
            }
        }
        zustand.merkeBerechnung(
            art: "Kurzcheck von außen",
            kurzfassung: Formate.kilowattSpanne(ergebnis.heizlast),
            version: zustand.regeln.version,
            stand: zustand.regeln.stand
        )
        withAnimation(.snappy) { uebernommen = true }
    }

    private func anbau(fuer typ: Gebaeudetyp) -> Kurzcheck.Anbausituation {
        switch typ {
        case .einfamilienhaus: return .freistehend
        case .doppelhaushaelfte: return .doppelhaus
        case .reihenhaus: return .reihenhausMitte
        case .mehrfamilienhaus: return .mehrfamilienhaus
        }
    }

    private func epoche(fuer baujahr: Int) -> Kurzcheck.Epoche {
        switch baujahr {
        case ..<1949: return .vorkrieg
        case ..<1979: return .nachkrieg
        case ..<1995: return .oelkrise
        case ..<2010: return .waermeschutz
        case ..<2020: return .jahrtausendwende
        default: return .neubau
        }
    }

    private func symbol(fuer wahl: Kurzcheck.Geschosse) -> String {
        switch wahl {
        case .einVollgeschoss: return "rectangle"
        case .zweiVollgeschosse: return "square.split.1x2"
        case .zweiMitAusgebautemDach: return "house"
        case .dreiVollgeschosse: return "building"
        }
    }

    private func symbol(fuer wahl: Kurzcheck.Anbausituation) -> String {
        switch wahl {
        case .freistehend: return "house"
        case .doppelhaus: return "house.lodge"
        case .reihenhausMitte: return "building.2"
        case .reihenhausEnde: return "building.2.crop.circle"
        case .mehrfamilienhaus: return "building"
        }
    }

    private func symbol(fuer wahl: Kurzcheck.Fassadenbild) -> String {
        switch wahl {
        case .keineDaemmungErkennbar: return "square"
        case .daemmungErkennbar: return "square.inset.filled"
        case .neueFensterAlteFassade: return "window.vertical.closed"
        case .rundumErneuert: return "sparkles"
        case .unsicher: return "questionmark.circle"
        }
    }
}

// MARK: - Eine Verfeinerung beantworten

struct VerfeinerungsAnsicht: View {

    let verfeinerung: Verfeinerung
    @Binding var check: Kurzcheck
    @Environment(\.dismiss) private var schliessen
    @State private var flaecheText = ""
    @State private var fensterAnzahl = 12
    @State private var daemmstaerke = 12

    var body: some View {
        Form {
            Section {
                Text(verfeinerung.beschreibung)
                    .font(.subheadline)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
            }

            switch verfeinerung.id {
            case "wandaufbau":
                Section {
                    ForEach(Kurzcheck.Wandaufbau.allCases, id: \.self) { aufbau in
                        Button {
                            check.wandaufbau = aufbau
                        } label: {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(aufbau.bezeichnung)
                                        .foregroundStyle(Gestaltung.Farbe.text)
                                    Text(aufbau.hinweis)
                                        .font(.caption)
                                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                                }
                                Spacer(minLength: Gestaltung.Abstand.eng)
                                if check.wandaufbau == aufbau {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Gestaltung.Farbe.marke)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Text("Wandaufbau")
                } footer: {
                    Text("Sichtbarer Klinker heißt fast immer zweischalig mit Luftschicht. Glatter Putz auf einem Vorkriegsbau spricht für Vollziegel.")
                }
            case "daemmstaerke":
                Section {
                    Stepper("Dämmstärke: \(daemmstaerke) cm", value: $daemmstaerke, in: 2...30)
                } header: {
                    Text("Dämmstärke")
                } footer: {
                    Text("An der Fensterlaibung abzuschätzen: Der Rahmen liegt um genau diese Stärke zurückversetzt. In den Achtzigern waren sechs Zentimeter üblich, heute sind es vierzehn bis zwanzig.")
                }
            case "groesse":
                Section("Überbaute Grundfläche") {
                    HStack {
                        TextField("z. B. 90", text: $flaecheText)
                            .keyboardType(.numberPad)
                        Text("m²").foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                }
            case "dachform":
                Section("Dachform") {
                    Picker("Dachform", selection: Binding(
                        get: { check.dachform ?? .sattel },
                        set: { check.dachform = $0 }
                    )) {
                        ForEach(Gebaeudehuelle.Dachform.allCases, id: \.self) {
                            Text($0.bezeichnung).tag($0)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
            case "keller":
                Section("Keller") {
                    Picker("Keller", selection: Binding(
                        get: { check.kellerlage ?? .unbeheizterKeller },
                        set: { check.kellerlage = $0 }
                    )) {
                        ForEach(Gebaeudehuelle.Kellerlage.allCases, id: \.self) {
                            Text($0.bezeichnung).tag($0)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
            case "fassade":
                Section("Fassade") {
                    Picker("Fassade", selection: $check.fassadenbild) {
                        ForEach(Kurzcheck.Fassadenbild.allCases.filter { $0 != .unsicher }, id: \.self) {
                            Text($0.bezeichnung).tag($0)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }
            case "fenster":
                Section {
                    Stepper("Fenster insgesamt: \(fensterAnzahl)", value: $fensterAnzahl, in: 2...80)
                } header: {
                    Text("Fenster zählen")
                } footer: {
                    Text("Alle Fenster des Hauses, auch auf der Rückseite. Gerechnet wird mit gut anderthalb Quadratmetern je Fenster.")
                }
            case "nachtmessung":
                Section {
                    NavigationLink("Messung starten") { NachtmessungAnsicht() }
                } footer: {
                    Text("Zwei Ablesungen in einer kalten Nacht ersetzen alle Annahmen über die Dämmung. Das Ergebnis steht danach unter „Heizlast“.")
                }
            case "signatur":
                Section {
                    NavigationLink("Zählerstand erfassen") { ZaehlerstandAnsicht() }
                } footer: {
                    Text("Jeden Monat eine Zahl. Ab etwa fünf Ablesungen rechnet die App den Wärmeverlust aus dem Verlauf – gemessen statt geschätzt.")
                }
            default:
                Section {
                    Hinweisleiste(text: "Dieser Schritt wird im Bereich „Heizlast“ durchgeführt – dort führt die App durch die Messung.")
                }
            }
        }
        .navigationTitle(verfeinerung.titel)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Abbrechen") { schliessen() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Übernehmen") { uebernehmen() }
            }
        }
        // Die Blätter starten mit dem, was schon eingetragen ist – wer eine
        // Angabe noch einmal öffnet, findet seinen Wert vor und nicht den
        // Vorgabewert.
        .onAppear {
            if let vorhanden = check.grundflaecheDirekt, flaecheText.isEmpty {
                flaecheText = Formate.zahl(vorhanden, stellen: 0)
            }
            if let vorhanden = check.daemmstaerkeZentimeter {
                daemmstaerke = vorhanden
            }
            if let vorhanden = check.fensteranteilGezaehlt, vorhanden > 0 {
                fensterAnzahl = max(2, Int((vorhanden / 1.6).rounded()))
            }
        }
    }

    private func uebernehmen() {
        switch verfeinerung.id {
        case "groesse":
            if let wert = Double(flaecheText.filter(\.isNumber)), wert > 0 {
                check.grundflaecheDirekt = wert
            }
        case "fenster":
            // Anteil an der Fassade, grob aus Anzahl mal üblicher Fenstergröße.
            check.fensteranteilGezaehlt = Double(fensterAnzahl) * 1.6
        case "dachform":
            if check.dachform == nil { check.dachform = .sattel }
        case "keller":
            if check.kellerlage == nil { check.kellerlage = .unbeheizterKeller }
        case "daemmstaerke":
            check.daemmstaerkeZentimeter = daemmstaerke
        case "wandaufbau":
            if check.wandaufbau == nil { check.wandaufbau = .hohlblockOderBims }
        default:
            break
        }
        schliessen()
    }
}
