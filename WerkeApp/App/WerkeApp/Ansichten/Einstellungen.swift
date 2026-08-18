import SwiftUI
import WerkeKern

struct EinstellungenAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @Environment(\.dismiss) private var schliessen
    @State private var zeigeLoeschabfrage = false
    @State private var aktualisiert = false

    @State private var erinnerungen = Voreinstellungen.erinnerungen
    @State private var erinnerungsstunde = Voreinstellungen.erinnerungsstunde
    @State private var icloud = Voreinstellungen.icloudSicherung
    @State private var fachfunktionen = Voreinstellungen.fachfunktionen
    @State private var erlaubnisFehlt = false
    @State private var geplant = 0

    var body: some View {
        List {
            erinnerungsbereich
            sicherungsbereich
            regelbereich
            freigabebereich
            fachbereich
            datenschutzbereich
            kontaktbereich
            ueberbereich
            loeschbereich
        }
        .navigationTitle("Einstellungen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Fertig") { schliessen() }
            }
        }
        .task {
            erlaubnisFehlt = await Erinnerungsdienst.erlaubnisstand() == .denied
            geplant = await Erinnerungsdienst.anzahlGeplant()
        }
        .confirmationDialog(
            "Wirklich alle Daten löschen?",
            isPresented: $zeigeLoeschabfrage,
            titleVisibility: .visible
        ) {
            Button("Alles löschen", role: .destructive) {
                zustand.allesLoeschen()
                schliessen()
            }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("Das lässt sich nicht rückgängig machen – auch die Sicherung in der iCloud wird entfernt.")
        }
    }

    // MARK: Erinnerungen

    /// Der wiederkehrende Anlass. Die Ablesereihe ist der einzige Bestand in
    /// dieser App, der sich nicht nachholen lässt – ohne Anstoß bricht sie im
    /// zweiten Monat ab.
    private var erinnerungsbereich: some View {
        Section {
            Toggle("An die Ablesung erinnern", isOn: Binding(
                get: { erinnerungen },
                set: { neu in
                    erinnerungen = neu
                    Voreinstellungen.erinnerungen = neu
                    Task {
                        if neu, await Erinnerungsdienst.frageErlaubnis() == false {
                            erinnerungen = false
                            Voreinstellungen.erinnerungen = false
                            erlaubnisFehlt = true
                        }
                        zustand.planeErinnerungen()
                        geplant = await Erinnerungsdienst.anzahlGeplant()
                    }
                }
            ))

            if erinnerungen {
                Picker("Uhrzeit", selection: Binding(
                    get: { erinnerungsstunde },
                    set: { neu in
                        erinnerungsstunde = neu
                        Voreinstellungen.erinnerungsstunde = neu
                        zustand.planeErinnerungen()
                    }
                )) {
                    ForEach([8, 10, 12, 15, 17, 18, 19, 20], id: \.self) { stunde in
                        Text("\(stunde):00 Uhr").tag(stunde)
                    }
                }
            }

            if erlaubnisFehlt {
                Label(
                    "Mitteilungen sind für die App abgeschaltet. Das lässt sich in den iOS-Einstellungen ändern.",
                    systemImage: "exclamationmark.triangle"
                )
                .font(.footnote)
                .foregroundStyle(Gestaltung.Farbe.gelb)
            }
        } header: {
            Text("Erinnerungen")
        } footer: {
            Text(erinnerungen
                 ? "Einmal im Monat an dem Tag, an dem Sie ohnehin ablesen – dazu Fristen wie der Ablauf des Energieausweises. Gerade sind \(geplant) Erinnerungen eingerichtet."
                 : "Ohne Erinnerung bricht die Verbrauchsreihe erfahrungsgemäß im zweiten Monat ab. Verlorene Monate lassen sich nicht nachholen.")
        }
    }

    // MARK: Sicherung

    private var sicherungsbereich: some View {
        Section {
            Toggle("In iCloud sichern", isOn: Binding(
                get: { icloud },
                set: { neu in
                    icloud = neu
                    Voreinstellungen.icloudSicherung = neu
                    if neu {
                        iCloud.sichern(zustand.ablage)
                    } else {
                        iCloud.loeschen()
                    }
                }
            ))
            if icloud, let letzte = iCloud.letzteSicherung {
                zeile("Zuletzt gesichert", datumZeit(letzte))
            }
        } header: {
            Text("Sicherung")
        } footer: {
            Text(icloud
                 ? "Ihre Gebäudedaten und Zählerstände liegen verschlüsselt in Ihrem eigenen Apple-Konto. WERK.E hat darauf keinen Zugriff. Dokumente werden nicht mitgesichert."
                 : "Ohne Sicherung sind bei Verlust des Geräts alle Zählerstände weg – und zwei Jahre Ablesungen lassen sich nicht nachholen.")
        }
    }

    // MARK: Regelgrundlagen

    private var regelbereich: some View {
        Section {
            zeile("Regelfassung", "\(zustand.regeln.version)")
            zeile("Stand der Regeln", Formate.datumLesbar(zustand.regeln.stand))
            Button {
                Task {
                    await zustand.aktualisiereRegelpaket()
                    aktualisiert = true
                }
            } label: {
                Label(aktualisiert ? "Auf dem neuesten Stand" : "Nach Aktualisierung suchen",
                      systemImage: aktualisiert ? "checkmark.circle" : "arrow.clockwise")
            }
        } header: {
            Text("Förder- und Rechtsgrundlagen")
        } footer: {
            Text(zustand.regeln.hinweis)
        }
    }

    // MARK: Fachliche Freigabe

    /// Sobald ein Kunde eine Zahl aus der App in ein Gespräch trägt, steht die
    /// Beratung dafür ein. Wer wann wogegen geprüft hat, gehört deshalb sichtbar
    /// in die App – und nicht in eine Datei, die niemand aufmacht.
    private var freigabebereich: some View {
        Section {
            if let freigabe = zustand.regeln.freigabe, freigabe.istErteilt {
                zeile("Geprüft durch", freigabe.durch)
                zeile("Geprüft am", Formate.datumLesbar(freigabe.am))
                Text(freigabe.grundlage)
                    .font(.footnote)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
            } else {
                Label("Diese Fassung ist noch nicht fachlich freigegeben.",
                      systemImage: "exclamationmark.triangle")
                    .font(.subheadline)
                    .foregroundStyle(Gestaltung.Farbe.gelb)
                if let grund = zustand.regeln.freigabe?.grundlage, !grund.isEmpty {
                    Text(grund)
                        .font(.footnote)
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                }
            }

            if !zustand.regeln.zuPruefen.isEmpty {
                DisclosureGroup("Noch zu prüfen (\(zustand.regeln.zuPruefen.count))") {
                    ForEach(zustand.regeln.zuPruefen, id: \.self) { punkt in
                        Text(punkt)
                            .font(.footnote)
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                }
            }
        } header: {
            Text("Fachliche Freigabe")
        } footer: {
            Text("Jede Fassung der Förder- und Rechtsdaten wird vor Veröffentlichung gegen die geltende Richtlinie geprüft. Wer das war und wann, steht hier.")
        }
    }

    // MARK: Fachfunktionen

    private var fachbereich: some View {
        Section {
            Toggle("Fachfunktionen anzeigen", isOn: Binding(
                get: { fachfunktionen },
                set: { neu in
                    fachfunktionen = neu
                    Voreinstellungen.fachfunktionen = neu
                }
            ))
        } header: {
            Text("Für Fachkräfte")
        } footer: {
            Text("Blendet das Raumaufmaß mit Laserscan und die Nachtmessung ein. Beide sind fertig, verlangen aber Übung – das Aufmaß zusätzlich ein iPhone oder iPad Pro. Für den Hausgebrauch führen die anderen Wege schneller zum Ziel.")
        }
    }

    // MARK: Datenschutz

    private var datenschutzbereich: some View {
        Section {
            zeile("Rechnet ohne Internet", "ja")
            zeile("Daten auf dem Gerät", "ja")
            zeile("Sicherung", icloud ? "eigenes Apple-Konto" : "keine")
            zeile("Sprachmodell auf dem Gerät", Erklaerer.modellVerfuegbar ? "verfügbar" : "nicht verfügbar")
        } header: {
            Text("Datenschutz")
        } footer: {
            Text("Alle Berechnungen laufen auf Ihrem Gerät. Fotos für die Zählerstandserkennung werden nicht gespeichert und nicht übertragen. Ohne Sprachmodell erscheinen die Erklärungen in ihrer Grundfassung – es fehlt nichts.")
        }
    }

    private var kontaktbereich: some View {
        Section {
            if let url = URL(string: "\(Kontakt.netzseite)/datenschutz/") {
                Link(destination: url) {
                    Label("Datenschutzerklärung", systemImage: "hand.raised")
                }
            }
            if let url = URL(string: "\(Kontakt.netzseite)/impressum/") {
                Link(destination: url) {
                    Label("Impressum", systemImage: "info.circle")
                }
            }
            if let url = Kontakt.telefonURL {
                Link(destination: url) {
                    Label("WERK.E anrufen: \(Kontakt.telefonLesbar)", systemImage: "phone")
                }
            }
        } header: {
            Text("WERK.E")
        }
    }

    // Ohne Fassungsnummer ist jede Fehlermeldung eines Nutzers wertlos:
    // Man weiß nicht, welchen Stand er vor sich hat.
    private var ueberbereich: some View {
        Section {
            zeile("App-Fassung", Programmfassung.lesbar)
            zeile("Regelpaket", "Fassung \(zustand.regeln.version), \(Formate.datumLesbar(zustand.regeln.stand))")
        } header: {
            Text("Über diese App")
        } footer: {
            Text("Diese beiden Angaben helfen bei jeder Rückfrage weiter – bitte nennen Sie sie, wenn Sie sich melden.")
        }
    }

    private var loeschbereich: some View {
        Section {
            Button(role: .destructive) {
                zeigeLoeschabfrage = true
            } label: {
                Label("Alle Daten löschen", systemImage: "trash")
            }
        } footer: {
            Text("Löscht Gebäudedaten, Zählerstände, Dokumente und Berechnungen unwiderruflich von diesem Gerät und aus Ihrer iCloud.")
        }
    }

    // MARK: Hilfen

    private func zeile(_ titel: String, _ wert: String) -> some View {
        HStack {
            Text(titel)
            Spacer()
            Text(wert)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .multilineTextAlignment(.trailing)
        }
    }

    private func datumZeit(_ wert: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateStyle = .short
        f.timeStyle = .short
        return f.string(from: wert)
    }
}
