import SwiftUI
import WerkeKern

/// Der Startbildschirm: mehrere Funktionen nebeneinander, eine davon
/// hervorgehoben.
///
/// Die frühere Fassung zeigte genau **eine** nächste Aufgabe – und das war in
/// der Praxis fast immer „Zählerstand erfassen“. Damit stand der Bildschirm für
/// eine Pflicht statt für ein Werkzeug: Wer die App wegen der Förderung geladen
/// hatte, sah beim zweiten Öffnen nur noch die Bitte, ablesen zu gehen.
///
/// Jetzt stehen die Funktionen als Feld nebeneinander. Welche gerade dran ist,
/// entscheidet weiterhin `Aufgabe.naechste` im Rechenkern – die Empfehlung
/// bleibt also erhalten, aber sie **markiert** eine Kachel, statt die anderen
/// zu verdecken.
struct HeuteAnsicht: View {

    @EnvironmentObject private var zustand: AppZustand
    @Binding var bereich: Wurzel.Bereich
    @State private var zeigeZaehler = false
    @State private var zeigeRechner = false
    @State private var alleZeigen = false

    private let sichtbareEintraege = 6

    private var gezeigterVerlauf: [Verlaufseintrag] {
        alleZeigen ? zustand.verlauf : Array(zustand.verlauf.prefix(sichtbareEintraege))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Gestaltung.Abstand.weit) {
                    if zustand.gebaeude != nil { statusstreifen }
                    werkzeuge
                    if !zustand.verlauf.isEmpty { verlauf }
                }
                .padding(Gestaltung.Abstand.normal)
            }
            .background(Gestaltung.Farbe.hintergrund)
            .navigationTitle("Heute")
            .sheet(isPresented: $zeigeZaehler) {
                ZaehlerstandAnsicht()
            }
            .sheet(isPresented: $zeigeRechner) {
                NavigationStack { FoerderrechnerAnsicht() }
            }
            .onReceive(NotificationCenter.default.publisher(for: .werkeNavigation)) { _ in
                switch Navigation.abholen() {
                case .zaehlerstand: zeigeZaehler = true
                case .foerderrechner: zeigeRechner = true
                case .none: break
                }
            }
        }
    }

    // MARK: Wo stehe ich?

    /// Drei Zahlen, an denen ein Rückkehrer sofort sieht, wo er steht.
    private var statusstreifen: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            Text("Ihr Haus")
                .stilAbschnittstitel()

            HStack(spacing: Gestaltung.Abstand.eng) {
                if let heizlast = zustand.besteHeizlast {
                    Kennzahlkachel(
                        titel: heizlast.gemessen ? "Heizlast, gemessen" : "Heizlast, geschätzt",
                        wert: Formate.kilowattSpanne(heizlast.spanne),
                        symbol: "thermometer.medium"
                    )
                }
                if let foerderung = zustand.foerderueberblick {
                    Kennzahlkachel(
                        titel: "Förderung möglich",
                        wert: Formate.euro(foerderung),
                        symbol: "eurosign.circle"
                    )
                }
                Kennzahlkachel(
                    titel: "Monate erfasst",
                    wert: "\(zustand.monateMitZaehlerstand)/\(zustand.regeln.gebaeude.verbrauchsausweisMonate)",
                    symbol: "gauge.medium"
                )
            }
        }
    }

    // MARK: Die Werkzeuge

    /// Was jemand hier tun kann – mehrere Wege, nicht einer.
    private struct Werkzeug: Identifiable {
        let id: String
        let titel: String
        let beschreibung: String
        let symbol: String
        /// Ist das gerade die empfohlene Handlung?
        var jetztDran = false
        /// Fortschritt, wenn die Funktion einen hat (Ablesereihe, Gebäudeakte).
        var fortschritt: (anteil: Double, text: String)?
    }

    private var werkzeugliste: [Werkzeug] {
        let aufgabe = zustand.naechsteAufgabe
        let monate = zustand.monateMitZaehlerstand
        let ziel = zustand.regeln.gebaeude.verbrauchsausweisMonate

        var liste: [Werkzeug] = [
            Werkzeug(
                id: "foerderung",
                titel: "Förderung berechnen",
                beschreibung: "Was bekomme ich für mein Vorhaben – und was bleibt unterm Strich?",
                symbol: "eurosign.circle.fill",
                jetztDran: aufgabe.art == .ersteBerechnung
            ),
            Werkzeug(
                id: "heizlast",
                titel: "Heizlast bestimmen",
                beschreibung: "Fünf Wege – von fünf Fragen an der Straße bis zur Messung in einer kalten Nacht.",
                symbol: "thermometer.medium"
            ),
            Werkzeug(
                id: "zaehler",
                titel: "Zählerstand erfassen",
                beschreibung: monate >= ziel
                    ? "Ihre Reihe ist vollständig – weiter so, damit sie es bleibt."
                    : "Dreißig Sekunden im Monat. Diese Zeit lässt sich nicht nachholen.",
                symbol: "camera",
                jetztDran: aufgabe.art == .zaehlerstand,
                fortschritt: monate > 0
                    ? (Double(monate) / Double(ziel), "\(monate) von \(ziel) Monaten erfasst")
                    : nil
            ),
            Werkzeug(
                id: "anforderungen",
                titel: "Was gilt für mein Haus?",
                beschreibung: "Pflichten, Fristen und was sich mit dem neuen Gesetz ändert.",
                symbol: "checklist"
            )
        ]

        if let gebaeude = zustand.gebaeude, gebaeude.angabenVollstaendigkeit < 1 {
            liste.append(Werkzeug(
                id: "angaben",
                titel: "Angaben ergänzen",
                beschreibung: "Ihre Ergebnisse stehen als Spanne da, weil noch Angaben fehlen. Jede Ergänzung verengt sie.",
                symbol: "square.and.pencil",
                jetztDran: aufgabe.art == .angabenErgaenzen,
                fortschritt: (gebaeude.angabenVollstaendigkeit,
                              "\(Int(gebaeude.angabenVollstaendigkeit * 100)) % ausgefüllt")
            ))
        }

        // Die empfohlene Funktion nach oben – aber nur sie. Die Reihenfolge der
        // übrigen bleibt fest, damit der Bildschirm nicht bei jedem Öffnen
        // anders aussieht.
        if let index = liste.firstIndex(where: \.jetztDran), index > 0 {
            let empfohlen = liste.remove(at: index)
            liste.insert(empfohlen, at: 0)
        }
        return liste
    }

    private var werkzeuge: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.eng) {
            Text("Was möchten Sie tun?")
                .stilAbschnittstitel()

            VStack(spacing: Gestaltung.Abstand.eng) {
                ForEach(werkzeugliste) { werkzeug in
                    werkzeugkachel(werkzeug)
                }
            }
        }
    }

    @ViewBuilder
    private func werkzeugkachel(_ werkzeug: Werkzeug) -> some View {
        switch werkzeug.id {
        case "heizlast":
            NavigationLink { HeizlastwegeAnsicht() } label: { inhalt(werkzeug) }
                .buttonStyle(.plain)
        case "anforderungen":
            NavigationLink { AnforderungenAnsicht() } label: { inhalt(werkzeug) }
                .buttonStyle(.plain)
        default:
            Button {
                switch werkzeug.id {
                case "foerderung": zeigeRechner = true
                case "zaehler": zeigeZaehler = true
                case "angaben": bereich = .haus
                default: break
                }
            } label: {
                inhalt(werkzeug)
            }
            .buttonStyle(.plain)
        }
    }

    private func inhalt(_ werkzeug: Werkzeug) -> some View {
        let hervor = werkzeug.jetztDran
        return VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
            HStack(alignment: .top, spacing: Gestaltung.Abstand.normal) {
                Image(systemName: werkzeug.symbol)
                    .font(.title2)
                    .frame(width: 34)
                    .foregroundStyle(hervor ? Color.white : Gestaltung.Farbe.marke)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: Gestaltung.Abstand.eng) {
                        Text(werkzeug.titel)
                            .font(.headline)
                            .foregroundStyle(hervor ? Color.white : Gestaltung.Farbe.text)
                        if hervor {
                            Text("jetzt dran")
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 2)
                                .background(Color.white.opacity(0.22))
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                    }
                    Text(werkzeug.beschreibung)
                        .font(.subheadline)
                        .foregroundStyle(hervor ? Color.white.opacity(0.85) : Gestaltung.Farbe.textLeise)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(hervor ? Color.white.opacity(0.7) : Gestaltung.Farbe.textLeise)
            }

            if let fortschritt = werkzeug.fortschritt {
                if hervor {
                    // Auf der Markenfläche braucht der Balken eigene Farben,
                    // sonst verschwindet er im Untergrund.
                    VStack(alignment: .leading, spacing: 6) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.white.opacity(0.28))
                                Capsule()
                                    .fill(Color.white)
                                    .frame(width: max(6, geo.size.width * min(1, max(0, fortschritt.anteil))))
                            }
                        }
                        .frame(height: 8)
                        Text(fortschritt.text)
                            .font(.caption)
                            .foregroundStyle(Color.white.opacity(0.85))
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(fortschritt.text)
                } else {
                    Fortschrittsbalken(anteil: fortschritt.anteil, beschriftung: fortschritt.text)
                }
            }
        }
        .padding(Gestaltung.Abstand.normal)
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(minHeight: Gestaltung.mindestTippziel)
        .background(hervor ? Gestaltung.Farbe.marke : Gestaltung.Farbe.flaeche)
        .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.normal, style: .continuous))
    }

    // MARK: Verlauf

    /// Bewusst begrenzt: Der Verlauf ist eine Bestätigung, kein Archiv. Ohne
    /// Grenze wächst der Startbildschirm mit jedem Monat weiter, bis die
    /// Werkzeuge oben aus dem Bild scrollen.
    private var verlauf: some View {
        VStack(alignment: .leading, spacing: Gestaltung.Abstand.normal) {
            HStack {
                Text("Zuletzt")
                    .stilAbschnittstitel()
                Spacer()
                if zustand.verlauf.count > sichtbareEintraege {
                    Button(alleZeigen ? "Weniger" : "Alle \(zustand.verlauf.count)") {
                        withAnimation(.snappy) { alleZeigen.toggle() }
                    }
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Gestaltung.Farbe.marke)
                }
            }

            VStack(spacing: 0) {
                ForEach(gezeigterVerlauf) { eintrag in
                    HStack(spacing: Gestaltung.Abstand.normal) {
                        Image(systemName: eintrag.symbol)
                            .font(.footnote)
                            .foregroundStyle(Gestaltung.Farbe.marke)
                            .frame(width: 24)
                        Text(eintrag.text)
                            .font(.subheadline)
                        Spacer(minLength: Gestaltung.Abstand.eng)
                        Text(kurzdatum(eintrag.datum))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(Gestaltung.Farbe.textLeise)
                    }
                    .padding(.vertical, 10)

                    if eintrag.id != gezeigterVerlauf.last?.id {
                        Divider().overlay(Gestaltung.Farbe.trennlinie)
                    }
                }
            }
            .padding(.horizontal, Gestaltung.Abstand.normal)
            .background(Gestaltung.Farbe.flaeche)
            .clipShape(RoundedRectangle(cornerRadius: Gestaltung.Radius.normal, style: .continuous))
        }
    }

    private func kurzdatum(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Formate.sprache
        f.dateFormat = "d.M."
        return f.string(from: datum)
    }
}
