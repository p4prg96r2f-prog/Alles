import Foundation

/// Einheitliche Formatierung. Bewusst im Kern, damit App, PDF und Testfälle
/// dieselben Zahlen gleich schreiben.
///
/// Die Zahlen werden **selbst gerundet und zusammengesetzt**, nicht über einen
/// `NumberFormatter`. Zwei Gründe: Das Ergebnis ist auf jeder Plattform
/// identisch und in Testfällen exakt prüfbar – und es hängt nicht davon ab,
/// welche Sprache auf dem Gerät eingestellt ist. Ein Förderbetrag in einer
/// deutschen Beratung wird deutsch geschrieben, auch auf einem englischen iPhone.
public enum Formate {

    public static let sprache = Locale(identifier: "de_DE")

    // MARK: Zahlen

    /// Deutsche Schreibweise: Punkt als Tausendertrenner, Komma als Dezimalzeichen.
    public static func zahl(_ wert: Double, stellen: Int = 0) -> String {
        guard wert.isFinite else { return "–" }

        let negativ = wert < 0
        let faktor = pow(10.0, Double(max(0, stellen)))
        let betrag = abs(wert) * faktor

        // Sehr große Werte würden Int64 sprengen – hier ist ohnehin nichts mehr
        // sinnvoll darstellbar.
        guard betrag < 9.0e18 else { return "–" }

        let gesamt = Int64(betrag.rounded())
        let teiler = Int64(faktor)
        let ganz = gesamt / teiler
        let rest = gesamt % teiler

        var text = gruppiert(ganz)
        if stellen > 0 {
            let nachkomma = String(rest)
            let aufgefuellt = String(repeating: "0", count: max(0, stellen - nachkomma.count)) + nachkomma
            text += "," + aufgefuellt
        }
        return (negativ ? "−" : "") + text
    }

    private static func gruppiert(_ wert: Int64) -> String {
        let ziffern = Array(String(wert))
        var teile: [String] = []
        var puffer = ""
        for ziffer in ziffern.reversed() {
            puffer = String(ziffer) + puffer
            if puffer.count == 3 {
                teile.insert(puffer, at: 0)
                puffer = ""
            }
        }
        if !puffer.isEmpty { teile.insert(puffer, at: 0) }
        return teile.joined(separator: ".")
    }

    // MARK: Einheiten

    public static func euro(_ wert: Double, nachkommastellen: Int = 0) -> String {
        zahl(wert, stellen: nachkommastellen) + " €"
    }

    public static func euroSpanne(_ spanne: Spanne) -> String {
        "\(zahl(spanne.unten)) – \(zahl(spanne.oben)) €"
    }

    public static func prozent(_ anteil: Double) -> String {
        let inProzent = anteil * 100
        // Ganze Prozentwerte ohne unnötige Nachkommastelle.
        let stellen = abs(inProzent - inProzent.rounded()) < 0.05 ? 0 : 1
        return zahl(inProzent, stellen: stellen) + " %"
    }

    public static func kilowatt(_ wert: Double) -> String {
        zahl(wert, stellen: 1) + " kW"
    }

    public static func kilowattSpanne(_ spanne: Spanne) -> String {
        "\(zahl(spanne.unten, stellen: 1)) – \(zahl(spanne.oben, stellen: 1)) kW"
    }

    // MARK: Datum

    /// Wandelt ein ISO-Datum in die in Deutschland übliche Schreibweise.
    public static func datumLesbar(_ iso: String) -> String {
        let teile = iso.split(separator: "-")
        guard teile.count == 3 else { return iso }
        return "\(teile[2]).\(teile[1]).\(teile[0])"
    }

    /// Liest ein ISO-Datum („2027-01-01“) als Tagesbeginn.
    ///
    /// Bewusst von Hand statt über einen Formatierer: Der greift auf Linux und
    /// unter fremder Gerätesprache anders zu, und ein Stichtag, der je nach
    /// Systemsprache um einen Tag springt, ist schlimmer als keiner.
    public static func datum(ausISO iso: String) -> Date? {
        let teile = iso.split(separator: "-")
        guard teile.count == 3,
              let jahr = Int(teile[0]), let monat = Int(teile[1]), let tag = Int(teile[2]),
              (1...12).contains(monat), (1...31).contains(tag) else { return nil }

        var kalender = Calendar(identifier: .gregorian)
        kalender.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        return kalender.date(from: DateComponents(year: jahr, month: monat, day: tag))
    }
}
