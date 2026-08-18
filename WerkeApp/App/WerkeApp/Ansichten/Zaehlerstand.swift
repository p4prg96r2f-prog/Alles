import SwiftUI
import UIKit
import WerkeKern

/// Zählerstand in dreißig Sekunden: fotografieren, Wert bestätigen, fertig.
///
/// Der einzige Anlass, der regelmäßig in die App führt – und wegen der
/// Anforderung an Verbrauchsausweise die Grundlage, die sich nicht nachholen
/// lässt.
struct ZaehlerstandAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @Environment(\.dismiss) private var schliessen

    /// Vorgewählt ist der Zähler, der die Heizung misst. Fest auf Gas zu
    /// stehen hieß für jeden Wärmepumpenbesitzer: Er erfasst brav jeden Monat,
    /// und die Energiesignatur findet trotzdem nie Daten.
    @State private var art: Zaehlerart?
    @State private var wertText = ""
    @State private var datum = Date()
    @State private var zeigeKamera = false
    @State private var erkannt = false
    @State private var warnung: String?

    private var wert: Double? {
        Double(wertText.replacingOccurrences(of: ",", with: "."))
    }

    /// Die tatsächlich gewählte Art – vor dem ersten Erscheinen die des Hauses.
    private var zaehlerart: Zaehlerart { art ?? zustand.heizungszaehler }

    private var letzterWert: Zaehlerstand? {
        zustand.letzterStand(art: zaehlerart)
    }

    /// Was seit der letzten Ablesung verbraucht wurde – die Zahl, für die
    /// jemand überhaupt abliest. Bisher stand hier nur der alte Zählerstand,
    /// und den Unterschied musste man im Kopf bilden.
    private var verbrauchSeitLetzter: (menge: Double, tage: Double, proTag: Double)? {
        guard let wert, let letzter = letzterWert else { return nil }
        let menge = wert - letzter.wert
        let tage = datum.timeIntervalSince(letzter.datum) / 86_400
        guard menge > 0, tage >= 1 else { return nil }
        return (menge, tage, menge / tage)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Zähler", selection: Binding(
                        get: { zaehlerart },
                        set: { art = $0 }
                    )) {
                        ForEach(Zaehlerart.allCases, id: \.self) { Text($0.bezeichnung).tag($0) }
                    }
                    .pickerStyle(.segmented)
                } footer: {
                    if art == nil {
                        Text("Vorgewählt nach Ihrer Heizung. Für die Heizlast aus dem Verbrauch zählt genau dieser Zähler.")
                    }
                }

                Section {
                    Button {
                        zeigeKamera = true
                    } label: {
                        Label(Kamera.vorhanden ? "Zähler abfotografieren" : "Foto aus der Mediathek wählen",
                              systemImage: Kamera.vorhanden ? "camera.fill" : "photo.on.rectangle")
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: Gestaltung.mindestTippziel)
                    }
                    .buttonStyle(.borderedProminent)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                } footer: {
                    Text("Die Erkennung läuft auf Ihrem Gerät. Das Foto wird nicht gespeichert und verlässt das Telefon nicht.")
                }

                Section {
                    HStack {
                        TextField("Zählerstand", text: $wertText)
                            .keyboardType(.decimalPad)
                            .font(.title2.monospacedDigit())
                        Text(zaehlerart.einheit)
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                    DatePicker("Ablesedatum", selection: $datum, displayedComponents: .date)
                } header: {
                    Text(erkannt ? "Erkannt – bitte prüfen" : "Wert")
                } footer: {
                    if let letzter = letzterWert {
                        Text("Letzter Wert: \(letzter.wert, specifier: "%.1f") \(zaehlerart.einheit) vom \(datumKurz(letzter.datum))")
                    }
                }

                if let verbrauch = verbrauchSeitLetzter {
                    Section("Seit der letzten Ablesung") {
                        HStack {
                            Text("Verbrauch")
                            Spacer()
                            Text("\(Formate.zahl(verbrauch.menge, stellen: 1)) \(zaehlerart.einheit)")
                                .stilBetrag()
                                .foregroundStyle(Gestaltung.Farbe.marke)
                        }
                        HStack {
                            Text("Zeitraum")
                            Spacer()
                            Text("\(Formate.zahl(verbrauch.tage, stellen: 0)) Tage · \(Formate.zahl(verbrauch.proTag, stellen: 2)) \(zaehlerart.einheit) am Tag")
                                .font(.footnote.monospacedDigit())
                                .foregroundStyle(Gestaltung.Farbe.textLeise)
                        }
                    }
                }

                if let warnung {
                    Section {
                        HStack(alignment: .top, spacing: Gestaltung.Abstand.eng) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Gestaltung.Farbe.gelb)
                            Text(warnung).font(.footnote)
                        }
                    }
                }
            }
            .navigationTitle("Zählerstand")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { schliessen() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Übernehmen") { uebernehmen() }
                        .disabled(wert == nil)
                }
            }
            .sheet(isPresented: $zeigeKamera) {
                Kamera { bild in
                    Task { await auswerten(bild) }
                }
                .ignoresSafeArea()
            }
            .onChange(of: wertText) { _, _ in pruefePlausibilitaet() }
            .onChange(of: art) { _, _ in pruefePlausibilitaet() }
        }
    }

    // MARK: Ablauf

    private func auswerten(_ bild: UIImage) async {
        if let gefunden = await Texterkennung.zaehlerstand(in: bild) {
            wertText = String(format: "%.1f", gefunden)
            erkannt = true
            pruefePlausibilitaet()
        } else {
            warnung = "Der Zählerstand ließ sich nicht sicher erkennen. Bitte von Hand eintragen."
        }
    }

    /// Ein unmöglicher Sprung wird zurückgefragt, nicht stillschweigend gespeichert.
    /// Die Bewertung liegt im Rechenkern und ist dort mit Testfällen abgesichert.
    private func pruefePlausibilitaet() {
        guard let neu = wert else {
            warnung = nil
            return
        }
        warnung = Zaehlerablesung.pruefe(neu: neu, letzter: letzterWert?.wert).hinweis
    }

    private func uebernehmen() {
        guard let wert else { return }
        zustand.ergaenzeZaehlerstand(Zaehlerstand(art: zaehlerart, wert: wert, datum: datum))
        schliessen()
    }

    private func datumKurz(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateStyle = .short
        return f.string(from: datum)
    }
}

// MARK: - Kamera

/// Bewusst die schlichte Systemkamera: ein Bild, keine Sitzung, keine
/// Sonderfälle. Für einen Zählerstand ist das genug.
struct Kamera: UIViewControllerRepresentable {

    /// Im Simulator und auf Geräten ohne Kamera fällt die Auswahl auf die
    /// Mediathek zurück. Dann darf der Knopf nicht „abfotografieren“ heißen.
    static var vorhanden: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    let fertig: (UIImage) -> Void
    @Environment(\.dismiss) private var schliessen

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let auswahl = UIImagePickerController()
        auswahl.sourceType = Kamera.vorhanden ? .camera : .photoLibrary
        auswahl.delegate = context.coordinator
        return auswahl
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Vermittler {
        Vermittler(self)
    }

    final class Vermittler: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        private let eltern: Kamera

        init(_ eltern: Kamera) {
            self.eltern = eltern
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let bild = info[.originalImage] as? UIImage {
                eltern.fertig(bild)
            }
            eltern.schliessen()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            eltern.schliessen()
        }
    }
}
