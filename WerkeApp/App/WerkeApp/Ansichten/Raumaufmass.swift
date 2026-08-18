import SwiftUI
import WerkeKern

#if canImport(RoomPlan)
import RoomPlan
#endif

/// Raumweise Heizlast aus dem Aufmaß – bewusst schlanker als die üblichen
/// Planungswerkzeuge.
///
/// Der Ablauf besteht aus drei Schritten und hört danach auf:
/// **Scannen → Wände zuordnen → Ergebnis.** Kein Angebotswesen, keine
/// Herstellerauswahl, keine Rohrnetzberechnung. Was WERK.E im Termin braucht,
/// ist die Zahl und der Heizflächen-Vergleich; alles Weitere entsteht in der
/// Fachsoftware.
struct RaumaufmassAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @State private var raeume: [Raum] = []
    @State private var scanLaeuft = false
    @State private var zeigeScanner = false
    @State private var neuerRaumname = ""

    private var normaussentemperatur: Double {
        zustand.regeln.klimaregion(fuerPLZ: zustand.gebaeude?.plz ?? "")?.normaussentemperatur ?? -12
    }

    private var ergebnis: Aufmassergebnis? {
        guard let gebaeude = zustand.gebaeude, !raeume.isEmpty else { return nil }
        return Huellflaechenrechner(regeln: zustand.regeln).berechne(
            raeume: raeume, gebaeude: gebaeude, normaussentemperatur: normaussentemperatur
        )
    }

    private var kalibriert: KalibriertesErgebnis? {
        guard let ergebnis, let signatur = zustand.energiesignatur() else { return nil }
        return Huellflaechenrechner(regeln: zustand.regeln).kalibriere(
            ergebnis, mit: signatur, normaussentemperatur: normaussentemperatur
        )
    }

    /// Nur wirklich unbeantwortete Flächen. „Grenzt an einen beheizten
    /// Nachbarraum“ ist eine gültige, abschließende Antwort – wer sie mitzählt,
    /// baut eine Sperre, die sich nicht mehr öffnen lässt.
    private var offeneZuordnungen: Int {
        raeume.flatMap(\.flaechen).filter { !$0.istZugeordnet }.count
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                if raeume.isEmpty { einstieg } else { raumliste }
                if offeneZuordnungen > 0 { zuordnungshinweis } else if let ergebnis { ergebniskarten(ergebnis) }
            }
            .padding(Gestaltung.Abstand.normal)
        }
        .background(Gestaltung.Farbe.hintergrund)
        .navigationTitle("Raumaufmaß")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if !raeume.isEmpty {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Raum hinzufügen") { starteScan() }
                }
            }
        }
        #if canImport(RoomPlan)
        .fullScreenCover(isPresented: $zeigeScanner) {
            if #available(iOS 17.0, *) {
                scannerBildschirm
            }
        }
        #endif
    }

    // MARK: Einstieg

    private var einstieg: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
            Karte {
                Text("Aufmaß in drei Schritten")
                    .font(.system(.title3, design: .rounded, weight: .bold))

                schritt(1, "Raum scannen", "Einmal langsam durch den Raum gehen. Etwa dreißig Sekunden.")
                schritt(2, "Wände zuordnen", "Antippen, welche Wand nach außen zeigt. Vier Tipps je Raum.")
                schritt(3, "Ergebnis", "Raumweise Heizlast – und der Abgleich mit Ihren Ablesungen.")

                if Raumscan.unterstuetzt {
                    Hauptknopf(titel: "Ersten Raum scannen", symbol: "camera.viewfinder") {
                        starteScan()
                    }
                } else {
                    Hinweisleiste(
                        text: "Für den Scan wird ein Gerät mit Laserscanner benötigt – die Pro-Modelle von iPhone und iPad. Räume lassen sich stattdessen auch von Hand anlegen.",
                        symbol: "exclamationmark.triangle"
                    )
                }
            }

            Karte {
                Text("Raum von Hand anlegen")
                    .stilAbschnittstitel()
                HStack {
                    TextField("Raumname, z. B. Wohnzimmer", text: $neuerRaumname)
                        .padding(10)
                        .background(Gestaltung.Farbe.hintergrund)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    Button("Anlegen") { legeRaumAn(name: neuerRaumname) }
                        .disabled(neuerRaumname.isEmpty)
                }
            }
        }
    }

    private func schritt(_ nummer: Int, _ titel: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
            Text("\(nummer)")
                .font(.headline.monospacedDigit())
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Circle().fill(Gestaltung.Farbe.marke))
            VStack(alignment: .leading, spacing: 2) {
                Text(titel).font(.subheadline.weight(.semibold))
                Text(text).stilNebentext()
            }
        }
    }

    // MARK: Räume und Zuordnung

    private var raumliste: some View {
        VStack(spacing: Gestaltung.Abstand.normal) {
            ForEach($raeume) { $raum in
                Karte {
                    HStack {
                        Text(raum.name).stilAbschnittstitel()
                        Spacer()
                        Text("\(Formate.zahl(raum.grundflaeche, stellen: 1)) m² · \(Formate.zahl(raum.raumhoehe, stellen: 2)) m")
                            .stilNebentext()
                    }

                    ForEach($raum.flaechen) { $flaeche in
                        flaechenzeile($flaeche)
                    }
                }
            }
        }
    }

    private func flaechenzeile(_ flaeche: Binding<Huellflaeche>) -> some View {
        let wert = flaeche.wrappedValue
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(beschriftung(fuer: wert))
                    .font(.subheadline)
                if !wert.istZugeordnet {
                    Image(systemName: "questionmark.circle")
                        .font(.caption)
                        .foregroundStyle(Gestaltung.Farbe.gelb)
                }
                Spacer()
                Text("\(Formate.zahl(wert.quadratmeter, stellen: 1)) m²")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
            }
            // Ohne Auswahl ist der Picker leer – das ist die ehrliche
            // Darstellung von „noch nicht beantwortet“.
            Picker("Grenze", selection: flaeche.grenze) {
                Text("außen").tag(Grenze?.some(.aussenluft))
                Text("Dachraum").tag(Grenze?.some(.dachraum))
                Text("unbeheizt").tag(Grenze?.some(.unbeheizt))
                Text("Erdreich").tag(Grenze?.some(.erdreich))
                Text("innen").tag(Grenze?.some(.beheizt))
            }
            .pickerStyle(.segmented)
        }
        .padding(.vertical, 4)
    }

    /// Ein Scanner weiß nicht, ob eine Wand nach außen zeigt. Sie deshalb schon
    /// vor der Zuordnung „Außenwand“ zu nennen, widerspricht der Frage, die
    /// darunter gestellt wird.
    private func beschriftung(fuer flaeche: Huellflaeche) -> String {
        switch (flaeche.art, flaeche.grenze) {
        case (.aussenwand, .none): return "Wand"
        case (.aussenwand, .some(.beheizt)): return "Innenwand"
        case (.decke, .some(.beheizt)): return "Decke zum Nachbarraum"
        case (.kellerdecke, .some(.beheizt)): return "Boden zum Nachbarraum"
        default: return flaeche.art.bezeichnung
        }
    }

    private var zuordnungshinweis: some View {
        Karte {
            Ampelzeile(
                ampel: .gelb,
                titel: "Noch \(offeneZuordnungen) Flächen zuordnen",
                aussage: "Ein Scan misst die Flächen, weiß aber nicht, wohin sie zeigen. Solange das offen ist, wird kein Ergebnis angezeigt – eine falsche Zahl wäre schlechter als keine. „Innen“ ist dabei eine vollwertige Antwort."
            )
        }
    }

    // MARK: Ergebnis

    @ViewBuilder
    private func ergebniskarten(_ ergebnis: Aufmassergebnis) -> some View {
        let anzeige = kalibriert

        Karte {
            Text("Heizlast des Gebäudes")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Gestaltung.Farbe.marke)
                .textCase(.uppercase)
                .kerning(0.8)

            Text(Formate.kilowatt(anzeige?.gesamtKW ?? ergebnis.gesamtKW))
                .stilErgebniszahl()
                .foregroundStyle(Gestaltung.Farbe.marke)

            Text("\(Formate.zahl(ergebnis.jeQuadratmeter, stellen: 0)) W/m² · \(ergebnis.raeume.count) Räume")
                .stilNebentext()

            Annahmenliste(annahmen: anzeige?.annahmen ?? ergebnis.annahmen)
        }

        if let kalibrierung = anzeige?.kalibrierung {
            Karte {
                Ampelzeile(
                    ampel: ampel(fuer: kalibrierung.beurteilung),
                    titel: kalibrierung.angewendet
                        ? "Mit Ihren Ablesungen abgeglichen"
                        : "Abgleich nicht angewendet",
                    aussage: kalibrierung.aussage
                )
                betragszeile("Gerechnet", "\(Formate.zahl(kalibrierung.gerechneterWaermeverlust, stellen: 0)) W/K")
                betragszeile("Gemessen", "\(Formate.zahl(kalibrierung.gemessenerWaermeverlust, stellen: 0)) W/K")
            }
        }

        Karte {
            Text("Je Raum")
                .stilAbschnittstitel()
            ForEach(anzeige?.raeume ?? ergebnis.raeume) { raum in
                HStack {
                    Text(raum.name).font(.subheadline)
                    Spacer()
                    Text("\(Formate.zahl(raum.jeQuadratmeter, stellen: 0)) W/m²")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                    Text(Formate.kilowatt(raum.gesamt / 1000))
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.marke)
                        .frame(width: 76, alignment: .trailing)
                }
                .padding(.vertical, 3)
            }
        }

        Karte {
            Hinweisleiste(text: ergebnis.vorbehalt)
        }

        WerkeKontaktKarte(zusammenfassung: [
            "Raumaufmaß: \(Formate.kilowatt(anzeige?.gesamtKW ?? ergebnis.gesamtKW)) über \(ergebnis.raeume.count) Räume"
            + (anzeige?.kalibrierung.angewendet == true ? ", mit Ablesungen abgeglichen" : "")
        ])
    }

    private func betragszeile(_ titel: String, _ wert: String) -> some View {
        HStack {
            Text(titel).font(.footnote).foregroundStyle(Gestaltung.Farbe.textLeise)
            Spacer()
            Text(wert).font(.footnote.monospacedDigit())
        }
    }

    private func ampel(fuer beurteilung: Kalibrierung.Beurteilung) -> Ampel {
        switch beurteilung {
        case .bestaetigt: return .gruen
        case .besserAlsAngenommen, .schlechterAlsAngenommen: return .gelb
        case .unstimmig: return .rot
        }
    }

    // MARK: Scanner

    #if canImport(RoomPlan)
    @available(iOS 17.0, *)
    private var scannerBildschirm: some View {
        ZStack(alignment: .bottom) {
            RaumscanAufnahme(
                fertig: { scan in
                    let name = "Raum \(raeume.count + 1)"
                    raeume.append(Raumscan.inRaum(scan, name: name))
                    scanLaeuft = false
                    zeigeScanner = false
                },
                laueft: $scanLaeuft
            )
            .ignoresSafeArea()

            VStack(spacing: Gestaltung.Abstand.normal) {
                Text("Langsam einmal durch den Raum gehen")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Gestaltung.Abstand.normal)
                    .padding(.vertical, Gestaltung.Abstand.eng)
                    .background(.black.opacity(0.55))
                    .clipShape(Capsule())

                Hauptknopf(titel: "Fertig", symbol: "checkmark") {
                    scanLaeuft = false
                }
                Nebenknopf(titel: "Abbrechen") {
                    scanLaeuft = false
                    zeigeScanner = false
                }
                .foregroundStyle(.white)
            }
            .padding(Gestaltung.Abstand.weit)
        }
    }
    #endif

    private func starteScan() {
        #if canImport(RoomPlan)
        if Raumscan.unterstuetzt {
            scanLaeuft = true
            zeigeScanner = true
            return
        }
        #endif
        legeRaumAn(name: "Raum \(raeume.count + 1)")
    }

    /// Ohne Scanner: ein Raum mit üblichen Maßen, den der Nutzer anpasst.
    private func legeRaumAn(name: String) {
        let raumname = name.isEmpty ? "Raum \(raeume.count + 1)" : name
        raeume.append(Raum(
            name: raumname,
            grundflaeche: 20,
            raumhoehe: 2.5,
            solltemperatur: Raum.solltemperatur(fuerRaumname: raumname),
            flaechen: [
                Huellflaeche(art: .aussenwand, quadratmeter: 12, grenze: nil),
                Huellflaeche(art: .fenster, quadratmeter: 3, grenze: nil),
                Huellflaeche(art: .kellerdecke, quadratmeter: 20, grenze: nil),
                Huellflaeche(art: .decke, quadratmeter: 20, grenze: nil)
            ]
        ))
        neuerRaumname = ""
    }
}
