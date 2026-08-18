import SwiftUI
import UIKit
import WerkeKern

/// Der Abschluss jedes Ergebnisbildschirms: der Weg zu WERK.E.
///
/// **Warum eine Karte für alle Bildschirme.** Der Wert der App entsteht in dem
/// Moment, in dem aus einem Ergebnis eine Anfrage wird. Wenn dieser Schritt auf
/// jedem Bildschirm anders aussieht – hier ein Telefonknopf, dort ein PDF,
/// woanders gar nichts –, dann ist er nirgends eingeübt. Dieselbe Karte an
/// jedem Ergebnis heißt: Der Nutzer kennt den Weg nach dem ersten Mal.
///
/// Drei Wege, ein Prinzip: Die Ergebnisse gehen mit, und **der Nutzer sieht die
/// Nachricht vor dem Senden**. Die App verschickt nichts von selbst.
struct WerkeKontaktKarte: View {

    @EnvironmentObject private var zustand: AppZustand

    /// Die Ergebniszeilen dieses Bildschirms – sie stehen wörtlich in der
    /// Nachricht.
    let zusammenfassung: [String]
    /// Zeigt „Förderung beantragen“ – dort, wo Maßnahmen gewählt sind.
    var mitFoerderantrag = false
    /// Leistungen, um die es im Angebot voraussichtlich geht.
    var leistungen: [Begleitleistung] = []
    /// Erzeugt das PDF mit den vollständigen Ergebnissen für den Anhang –
    /// als Funktion, damit es im Moment des Sendens aktuell ist.
    var pdf: (() -> URL?)? = nil

    @State private var mail: Mailnachricht?
    @State private var teilen: TeilbareDatei?
    @State private var zeigeAntrag = false

    var body: some View {
        Karte {
            Text("Weiter mit WERK.E")
                .stilAbschnittstitel()
            Text("Ihre Ergebnisse gehen mit. Sie sehen die Nachricht vor dem Senden und können sie ändern – nichts verlässt das Gerät ohne Sie.")
                .stilNebentext()
                .fixedSize(horizontal: false, vertical: true)

            Hauptknopf(titel: "Angebot anfordern", symbol: "doc.plaintext") {
                sende(.angebot)
            }

            if mitFoerderantrag {
                Nebenknopf(titel: "Förderung beantragen", symbol: "checkmark.seal") {
                    zeigeAntrag = true
                }
            }

            HStack(spacing: Gestaltung.Abstand.weit) {
                Nebenknopf(titel: "Nachricht senden", symbol: "envelope") {
                    sende(.nachricht)
                }
                if let telefon = Kontakt.telefonURL, UIApplication.shared.canOpenURL(telefon) {
                    Nebenknopf(titel: Kontakt.telefonLesbar, symbol: "phone") {
                        UIApplication.shared.open(telefon)
                    }
                } else {
                    Text(Kontakt.telefonLesbar)
                        .font(.subheadline.monospacedDigit())
                        .foregroundStyle(Gestaltung.Farbe.textLeise)
                        .textSelection(.enabled)
                }
            }
        }
        .sheet(item: $mail) { nachricht in
            MailFormular(nachricht: nachricht)
        }
        .sheet(item: $teilen) { datei in
            Teilblatt(url: datei.url)
        }
        .sheet(isPresented: $zeigeAntrag) {
            NavigationStack {
                FoerderantragAnsicht(
                    zusammenfassung: zusammenfassung,
                    anfragen: { sende(.antragsbegleitung) }
                )
            }
        }
    }

    // MARK: Zustellung

    /// Drei Stufen, damit der Weg nie in einer Sackgasse endet:
    /// 1. Das eingebaute Mail-Formular – trägt den PDF-Anhang.
    /// 2. `mailto:` – öffnet die eingestellte Mail-App; der Text trägt die
    ///    Ergebnisse selbst, weil der Anhang hier verloren geht.
    /// 3. Das Teilen-Blatt mit der Nachricht als Datei – für Geräte ganz ohne
    ///    Mail-Konto.
    private func sende(_ art: Anfrageart) {
        let nachricht = Mailnachricht(
            betreff: Anfragetext.betreff(art, gebaeude: zustand.gebaeude),
            text: Anfragetext.nachricht(
                art: art,
                gebaeude: zustand.gebaeude,
                zusammenfassung: zusammenfassung,
                leistungen: art == .angebot ? leistungen.filter(\.vonWerke).map(\.titel) : []
            ),
            anhang: pdf?()
        )

        if MailVersand.formularMoeglich {
            mail = nachricht
        } else if let url = MailVersand.mailtoURL(nachricht), UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        } else {
            teilen = alsDatei(nachricht).map(TeilbareDatei.init)
        }
    }

    private func alsDatei(_ nachricht: Mailnachricht) -> URL? {
        if let anhang = nachricht.anhang { return anhang }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("WERK-E-Anfrage.txt")
        try? "\(nachricht.betreff)\n\n\(nachricht.text)".write(to: url, atomically: true, encoding: .utf8)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }
}

// MARK: - Förderung beantragen

/// Der Weg zum Antrag – ehrlich erklärt.
///
/// Die App kann den Antrag nicht selbst einreichen: Er läuft über das
/// Förderportal, gestellt vom Eigentümer oder von WERK.E mit Vollmacht. Was
/// die App kann: alles vorbereiten, die eine teure Falle benennen – und die
/// Begleitung anfragen, mit allen Zahlen im Gepäck.
struct FoerderantragAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @Environment(\.dismiss) private var schliessen

    let zusammenfassung: [String]
    let anfragen: () -> Void

    /// Muss aktiv bestätigt werden – ohne diese Bestätigung geht die Anfrage
    /// nicht hinaus. Das ist kein Formalismus: Wer vor dem Antrag beauftragt,
    /// verliert die Förderung unwiderruflich.
    @State private var nochNichtBeauftragt = false

    var body: some View {
        Form {
            Section {
                schritt(1, "Anfrage an WERK.E", "Mit dieser Anfrage gehen Ihre Zahlen an uns. Wir melden uns, prüfen das Vorhaben und erstellen die technischen Nachweise.")
                schritt(2, "Angebot vom Fachbetrieb", "Für den Antrag braucht es ein Angebot – noch nicht unterschrieben.")
                schritt(3, "Antrag im Förderportal", "Den Antrag stellen Sie selbst im Portal, oder Sie bevollmächtigen WERK.E damit.")
                schritt(4, "Nach dem Bescheid beauftragen", "Erst mit der Zusage wird der Vertrag unterschrieben.")
            } header: {
                Text("So läuft es")
            }

            Section {
                Toggle(isOn: $nochNichtBeauftragt) {
                    Text("Ich habe noch keinen Liefer- oder Leistungsvertrag unterschrieben")
                        .font(.subheadline)
                }
            } footer: {
                if nochNichtBeauftragt {
                    Text("Gut – dann ist der Weg frei. Planung und Beratung dürfen jederzeit laufen, nur die Beauftragung muss warten.")
                } else {
                    Text("Der Antrag muss gestellt sein, **bevor** beauftragt wird – sonst ist die Förderung für diese Maßnahme unwiderruflich verloren. Falls schon unterschrieben ist: Rufen Sie uns an. Manchmal ist nur ein Teil des Vorhabens betroffen.")
                }
            }

            Section {
                mitgabe("Gebäudedaten", vorhanden: zustand.gebaeude != nil)
                mitgabe("Maßnahmen und Kosten", vorhanden: !zustand.massnahmen.isEmpty)
                mitgabe("Sanierungsfahrplan", vorhanden: zustand.gebaeude?.hatSanierungsfahrplan == true,
                        fehltText: "liegt nicht vor – kann Teil des Angebots sein")
            } header: {
                Text("Das geht mit")
            }

            Section {
                Button {
                    schliessen()
                    anfragen()
                } label: {
                    Label("Antragsbegleitung anfragen", systemImage: "envelope")
                        .font(.headline)
                        .frame(maxWidth: .infinity, minHeight: Gestaltung.mindestTippziel)
                }
                .buttonStyle(.borderedProminent)
                .tint(Gestaltung.Farbe.marke)
                .disabled(!nochNichtBeauftragt)
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            } footer: {
                Text("Sie sehen die Nachricht vor dem Senden. Der Antrag selbst läuft über das Förderportal – diese Anfrage verpflichtet Sie zu nichts.")
            }
        }
        .navigationTitle("Förderung beantragen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Abbrechen") { schliessen() }
            }
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
                Text(text).font(.footnote).foregroundStyle(Gestaltung.Farbe.textLeise)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.vertical, 2)
    }

    private func mitgabe(_ titel: String, vorhanden: Bool, fehltText: String = "noch nicht erfasst") -> some View {
        HStack {
            Image(systemName: vorhanden ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(vorhanden ? Gestaltung.Farbe.gruen : Gestaltung.Farbe.textLeise)
            Text(titel).font(.subheadline)
            Spacer()
            if !vorhanden {
                Text(fehltText)
                    .font(.caption)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
            }
        }
    }
}
