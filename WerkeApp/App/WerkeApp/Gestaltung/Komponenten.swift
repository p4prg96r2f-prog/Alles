import SwiftUI
import WerkeKern

// MARK: - Hauptaktion

/// Jeder Ergebnisbildschirm hat genau **eine** Hauptaktion. Alles andere ist
/// bewusst schwächer gesetzt.
struct Hauptknopf: View {
    let titel: String
    var symbol: String?
    var aktion: () -> Void

    var body: some View {
        Button(action: aktion) {
            HStack(spacing: Gestaltung.Abstand.eng) {
                if let symbol { Image(systemName: symbol) }
                Text(titel)
            }
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: Gestaltung.mindestTippziel)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .tint(Gestaltung.Farbe.marke)
    }
}

struct Nebenknopf: View {
    let titel: String
    var symbol: String?
    var aktion: () -> Void

    var body: some View {
        Button(action: aktion) {
            HStack(spacing: Gestaltung.Abstand.eng) {
                if let symbol { Image(systemName: symbol) }
                Text(titel)
            }
            .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Gestaltung.Farbe.marke)
    }
}

// MARK: - Karte

struct Karte<Inhalt: View>: View {
    var randlos = false
    @ViewBuilder var inhalt: Inhalt

    var body: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
            inhalt
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(randlos ? 0 : Gestaltung.Abstand.normal)
        .background(Gestaltung.Farbe.flaeche)
        .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.normal, style: .continuous))
    }
}

// MARK: - Kennzahl

struct Kennzahlkachel: View {
    let titel: String
    let wert: String
    var symbol: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let symbol {
                Image(systemName: symbol)
                    .foregroundStyle(Gestaltung.Farbe.marke)
                    .font(.subheadline)
            }
            Text(wert)
                .font(.title3.weight(.semibold))
                .monospacedDigit()
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text(titel)
                .font(.caption)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Gestaltung.Abstand.normal)
        .background(Gestaltung.Farbe.flaeche)
        .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.klein, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(titel): \(wert)")
    }
}

// MARK: - Ampelzeile

/// Farbe ist nie die einzige Information: Symbol und Text tragen die Aussage
/// auch für Menschen, die Farben nicht unterscheiden können.
struct Ampelzeile: View {
    let ampel: Ampel
    let titel: String
    let aussage: String
    var hinweisEntwurf: Bool = false

    private var farbe: Ampelfarbe {
        switch ampel {
        case .gruen: return .gruen
        case .gelb: return .gelb
        case .rot: return .rot
        case .neutral: return .neutral
        }
    }

    private var lesbareStufe: String {
        switch ampel {
        case .gruen: return "In Ordnung"
        case .gelb: return "Zu beachten"
        case .rot: return "Handlungsbedarf"
        case .neutral: return "Hinweis"
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
            Image(systemName: ampel.symbol)
                .foregroundStyle(farbe.farbe)
                .font(.title3)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(titel)
                    .font(.headline)
                Text(aussage)
                    .font(.subheadline)
                    .foregroundStyle(Gestaltung.Farbe.textLeise)
                    .fixedSize(horizontal: false, vertical: true)
                if hinweisEntwurf {
                    Text("Entwurfsstand")
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Gestaltung.Farbe.markeGedeckt)
                        .clipShape(Capsule())
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .accessibilityHidden(true)
        }
        .padding(.vertical, Gestaltung.Abstand.eng)
        .contentShape(Rectangle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(lesbareStufe). \(titel). \(aussage)")
    }
}

// MARK: - Hinweisleiste

struct Hinweisleiste: View {
    let text: String
    var symbol: String = "info.circle"

    var body: some View {
        HStack(alignment: .top, spacing: Gestaltung.Abstand.eng) {
            Image(systemName: symbol)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .accessibilityHidden(true)
            Text(text)
                .font(.footnote)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Auswahl statt Tastatur

/// Große, gut treffbare Auswahlfläche. Wo immer möglich ersetzt sie ein
/// Texteingabefeld.
struct Auswahlkachel: View {
    let titel: String
    var untertitel: String?
    var symbol: String?
    let ausgewaehlt: Bool
    let aktion: () -> Void

    var body: some View {
        Button(action: aktion) {
            HStack(spacing: Gestaltung.Abstand.normal) {
                if let symbol {
                    Image(systemName: symbol)
                        .font(.title3)
                        .frame(width: 28)
                        .foregroundStyle(ausgewaehlt ? Gestaltung.Farbe.marke : Gestaltung.Farbe.textLeise)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(titel)
                        .font(.body.weight(ausgewaehlt ? .semibold : .regular))
                        .foregroundStyle(Gestaltung.Farbe.text)
                    if let untertitel {
                        Text(untertitel)
                            .font(.caption)
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                }
                Spacer(minLength: 0)
                if ausgewaehlt {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Gestaltung.Farbe.marke)
                        .accessibilityHidden(true)
                }
            }
            .padding(Gestaltung.Abstand.normal)
            .frame(minHeight: Gestaltung.mindestTippziel)
            .background(
                RoundedRectangle(cornerRadius: Gestaltung.Radius.klein, style: .continuous)
                    .fill(ausgewaehlt ? Gestaltung.Farbe.markeGedeckt : Gestaltung.Farbe.flaeche)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Gestaltung.Radius.klein, style: .continuous)
                    .strokeBorder(ausgewaehlt ? Gestaltung.Farbe.marke : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(ausgewaehlt ? [.isSelected, .isButton] : .isButton)
    }
}

// MARK: - Annahmen

/// Jede Zahl trägt ihre Annahmen. Einen Fingertipp entfernt, nicht versteckt
/// und nicht im Weg.
struct Annahmenliste: View {
    let annahmen: [Annahme]
    @State private var offen = false

    var body: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            Button {
                withAnimation(.snappy) { offen.toggle() }
            } label: {
                HStack {
                    Text(offen ? "Annahmen ausblenden" : "Annahmen anzeigen")
                        .font(.footnote.weight(.medium))
                    Image(systemName: offen ? "chevron.up" : "chevron.down")
                        .font(.caption2.weight(.bold))
                }
                .foregroundStyle(Gestaltung.Farbe.marke)
                .frame(minHeight: 44, alignment: .leading)
            }
            .buttonStyle(.plain)

            if offen {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(annahmen) { annahme in
                        HStack(alignment: .top, spacing: Gestaltung.Abstand.eng) {
                            Text(annahme.bezeichnung)
                                .font(.caption)
                                .foregroundStyle(Gestaltung.Farbe.textLeise)
                                .frame(width: 130, alignment: .leading)
                            Text(annahme.wert)
                                .font(.caption)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Fortschritt

struct Fortschrittsbalken: View {
    let anteil: Double
    let beschriftung: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Gestaltung.Farbe.trennlinie)
                    Capsule()
                        .fill(Gestaltung.Farbe.marke)
                        .frame(width: max(6, geo.size.width * min(1, max(0, anteil))))
                }
            }
            .frame(height: 8)
            Text(beschriftung)
                .font(.caption)
                .foregroundStyle(Gestaltung.Farbe.textLeise)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(beschriftung)
        .accessibilityValue("\(Int(anteil * 100)) Prozent")
    }
}

// MARK: - Spannenbalken

/// Zeigt eine Ergebnisspanne als Band auf einer Skala.
///
/// Der eigentliche Zweck ist nicht die Anzeige, sondern die Rückmeldung: Wird
/// eine Angabe ergänzt, schrumpft das Band sichtbar. Das macht aus einer
/// lästigen Nachfrage eine Belohnung – Genauigkeit wird verdient, nicht
/// eingefordert.
struct Spannenbalken: View {

    let spanne: Spanne
    let skala: ClosedRange<Double>
    let einheit: String
    var nachkommastellen: Int = 1

    private func anteil(_ wert: Double) -> Double {
        let breite = skala.upperBound - skala.lowerBound
        guard breite > 0 else { return 0 }
        return min(1, max(0, (wert - skala.lowerBound) / breite))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            GeometryReader { geo in
                let breite = geo.size.width
                let links = anteil(spanne.unten) * breite
                let rechts = anteil(spanne.oben) * breite
                let bandbreite = max(6, rechts - links)

                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Gestaltung.Farbe.trennlinie)
                        .frame(height: 10)

                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Gestaltung.Farbe.marke.opacity(0.55),
                                    Gestaltung.Farbe.marke
                                ],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: bandbreite, height: 10)
                        .offset(x: links)

                    // Mittelwert als feine Marke
                    Capsule()
                        .fill(.white)
                        .frame(width: 2, height: 16)
                        .offset(x: anteil(spanne.mitte) * breite - 1)
                        .shadow(radius: 1)
                }
                .frame(height: 20)
            }
            .frame(height: 20)
            .animation(.snappy(duration: 0.35), value: spanne)

            HStack {
                Text(Formate.zahl(skala.lowerBound, stellen: 0))
                Spacer()
                Text("\(Formate.zahl(spanne.unten, stellen: nachkommastellen)) – \(Formate.zahl(spanne.oben, stellen: nachkommastellen)) \(einheit)")
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Gestaltung.Farbe.marke)
                Spacer()
                Text(Formate.zahl(skala.upperBound, stellen: 0))
            }
            .font(.caption2.monospacedDigit())
            .foregroundStyle(Gestaltung.Farbe.textLeise)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Ergebnisspanne")
        .accessibilityValue("\(Formate.zahl(spanne.unten, stellen: nachkommastellen)) bis \(Formate.zahl(spanne.oben, stellen: nachkommastellen)) \(einheit)")
    }
}

// MARK: - Schrittanzeige

/// Nummerierter Fortschritt für geführte Strecken.
struct Schrittpunkte: View {
    let aktuell: Int
    let gesamt: Int

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<gesamt, id: \.self) { index in
                Capsule()
                    .fill(index <= aktuell ? Gestaltung.Farbe.marke : Gestaltung.Farbe.trennlinie)
                    .frame(height: 5)
            }
        }
        .animation(.snappy, value: aktuell)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Frage \(aktuell + 1) von \(gesamt)")
    }
}
