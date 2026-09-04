import Foundation
import Combine

// Das Sprachmodell auf dem Gerät ist ein Zusatz, kein Fundament: Ohne es
// erscheint der kuratierte Text, und der ist vollständig. Deshalb ist der
// Zugriff hinter einen eigenen Schalter gelegt und standardmäßig **aus**.
//
// Grund: Die Schnittstelle von `FoundationModels` konnte bisher gegen kein
// echtes SDK geprüft werden. Ein unbewiesener Zusatznutzen darf den Bau der
// ganzen App nicht gefährden.
//
// Einschalten, sobald es sich am Mac übersetzen lässt: im Ziel WerkeApp unter
// Build Settings → „Other Swift Flags“ ein `-DWERKE_SPRACHMODELL` ergänzen.
#if canImport(FoundationModels) && WERKE_SPRACHMODELL
import FoundationModels
#endif

/// Erklärt Fachbegriffe in einfacher Sprache.
///
/// **Die Regel, die alles zusammenhält:**
/// Das Sprachmodell darf *formulieren und strukturieren* – niemals rechnen und
/// niemals Recht auslegen. Jede Zahl und jede rechtliche Aussage stammt aus dem
/// Rechenkern und dem Regelpaket. Das Modell macht sie nur lesbar.
///
/// Deshalb bekommt es hier ausschließlich einen kuratierten Erklärtext als
/// Grundlage und die Aufgabe, ihn zu vereinfachen. Es erfindet nichts.
///
/// Läuft vollständig auf dem Gerät und ohne Netz. Fehlt Apple Intelligence –
/// das ist bei älteren Geräten der Normalfall –, erscheint der kuratierte Text
/// unverändert. Der Nutzer merkt keinen Bruch.
@MainActor
final class Erklaerer: ObservableObject {

    @Published private(set) var arbeitet = false

    /// Steht ein Sprachmodell auf diesem Gerät zur Verfügung?
    static var modellVerfuegbar: Bool {
        #if canImport(FoundationModels) && WERKE_SPRACHMODELL
        if #available(iOS 26.0, *) {
            return SystemLanguageModel.default.isAvailable
        }
        #endif
        return false
    }

    /// Gibt den kuratierten Text zurück – auf Wunsch in einfacherer Sprache.
    func erklaere(_ begriff: Glossarbegriff, einfacher: Bool) async -> String {
        guard einfacher, Self.modellVerfuegbar else { return begriff.erklaerung }

        arbeitet = true
        defer { arbeitet = false }

        #if canImport(FoundationModels) && WERKE_SPRACHMODELL
        if #available(iOS 26.0, *) {
            let anweisung = """
            Du formulierst Texte einer Energieberatung für Hauseigentümer um.
            Regeln, ausnahmslos:
            – Nutze ausschließlich Aussagen aus dem vorgelegten Text.
            – Ergänze keine Zahlen, Fristen, Fördersätze oder Rechtsfolgen.
            – Wenn etwas im Text nicht steht, lasse es weg.
            – Schreibe zwei bis drei kurze Sätze in einfacher, sachlicher Sprache.
            – Kein Werbeton, keine Anrede, keine Aufzählung.
            """

            let sitzung = LanguageModelSession(instructions: anweisung)
            let auftrag = """
            Formuliere diesen Text einfacher:

            \(begriff.erklaerung)
            """

            if let antwort = try? await sitzung.respond(to: auftrag) {
                let text = antwort.content.trimmingCharacters(in: .whitespacesAndNewlines)
                // Sicherheitsnetz: Eine auffällig kurze oder leere Antwort wird verworfen.
                if text.count > 40 { return text }
            }
        }
        #endif

        return begriff.erklaerung
    }
}

// MARK: - Glossar

/// Kuratierte Erklärungen. Fachlich von WERK.E freigegeben – hier entsteht
/// nichts durch ein Modell.
struct Glossarbegriff: Identifiable, Hashable {
    let id: String
    let titel: String
    let erklaerung: String

    static let alle: [Glossarbegriff] = [
        Glossarbegriff(
            id: "isfp",
            titel: "Individueller Sanierungsfahrplan (iSFP)",
            erklaerung: """
            Ein individueller Sanierungsfahrplan zeigt für ein bestimmtes Gebäude, \
            welche Sanierungsschritte in welcher Reihenfolge sinnvoll sind, was sie \
            kosten und was sie einsparen. Er wird von einer zugelassenen Energieberatung \
            erstellt und selbst bezuschusst. Liegt er vor, kann sich außerdem die \
            Förderung der einzelnen Maßnahmen erhöhen.
            """
        ),
        Glossarbegriff(
            id: "heizlast",
            titel: "Heizlast",
            erklaerung: """
            Die Heizlast ist die Wärmeleistung, die ein Gebäude am kältesten Tag \
            benötigt, angegeben in Kilowatt. Sie bestimmt, wie groß eine neue Heizung \
            ausgelegt werden muss. Eine überschlägige Abschätzung genügt für ein erstes \
            Gespräch. Für die Auslegung einer Wärmepumpe und für Förderanträge ist eine \
            raumweise Berechnung nach DIN EN 12831 erforderlich.
            """
        ),
        Glossarbegriff(
            id: "vorlauftemperatur",
            titel: "Vorlauftemperatur",
            erklaerung: """
            Die Vorlauftemperatur ist die Temperatur des Wassers, das zu den Heizkörpern \
            fließt. Wärmepumpen arbeiten umso sparsamer, je niedriger sie ausfällt. \
            Entscheidend ist deshalb, ob die vorhandenen Heizflächen die benötigte Wärme \
            auch bei etwa 55 statt 70 Grad abgeben können.
            """
        ),
        Glossarbegriff(
            id: "energieausweis",
            titel: "Energieausweis",
            erklaerung: """
            Der Energieausweis beschreibt die energetische Qualität eines Gebäudes und \
            gilt zehn Jahre. Er ist bei Verkauf und Vermietung vorzulegen. Es gibt ihn \
            als Bedarfsausweis, der auf einer Berechnung beruht, und als Verbrauchsausweis, \
            der auf tatsächlichen Verbrauchsdaten beruht.
            """
        ),
        Glossarbegriff(
            id: "effizienzhaus",
            titel: "Effizienzhaus",
            erklaerung: """
            Effizienzhaus-Stufen beschreiben, wie viel Energie ein saniertes Gebäude im \
            Vergleich zu einem Referenzgebäude benötigt. Je niedriger die Zahl, desto \
            besser der Standard und desto höher in der Regel die Förderung. Welche Stufe \
            erreichbar ist, ergibt eine Berechnung für das konkrete Gebäude.
            """
        ),
        Glossarbegriff(
            id: "lueftungskonzept",
            titel: "Lüftungskonzept",
            erklaerung: """
            Wird mehr als ein Drittel der Fenster erneuert oder mehr als ein Drittel der \
            Dachfläche gedämmt, ist ein Lüftungskonzept nach DIN 1946-6 zu erstellen. \
            Es klärt, ob die Lüftung über Fenster ausreicht oder technische Maßnahmen \
            nötig sind. Wird das übersehen, drohen Feuchteschäden.
            """
        ),
        Glossarbegriff(
            id: "hydraulischerabgleich",
            titel: "Hydraulischer Abgleich",
            erklaerung: """
            Beim hydraulischen Abgleich wird eingestellt, wie viel Heizwasser jeder \
            Heizkörper bekommt. Ohne ihn werden manche Räume zu warm und andere zu kalt, \
            und die Heizung läuft unnötig heiß. Für viele Förderungen ist er Voraussetzung.
            """
        ),
        Glossarbegriff(
            id: "bagatellgrenze",
            titel: "Bagatellgrenze",
            erklaerung: """
            Energetische Anforderungen an ein Bauteil greifen erst, wenn mehr als zehn \
            Prozent der jeweiligen Bauteilfläche verändert werden. Kleinere Reparaturen \
            lösen die Anforderungen also nicht aus.
            """
        )
    ]

    static func mit(id: String) -> Glossarbegriff? {
        alle.first { $0.id == id }
    }
}
