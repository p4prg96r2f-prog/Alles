import Foundation

/// Einheitliche Formatierung. Bewusst im Kern, damit App, PDF und Tests
/// dieselben Zahlen gleich schreiben.
public enum Formate {

    public static let sprache = Locale(identifier: "de_DE")

    public static func euro(_ wert: Double, nachkommastellen: Int = 0) -> String {
        let f = NumberFormatter()
        f.locale = sprache
        f.numberStyle = .decimal
        f.minimumFractionDigits = nachkommastellen
        f.maximumFractionDigits = nachkommastellen
        f.usesGroupingSeparator = true
        let zahl = f.string(from: NSNumber(value: wert)) ?? "\(Int(wert))"
        return "\(zahl) €"
    }

    public static func euroSpanne(_ spanne: Spanne) -> String {
        let f = NumberFormatter()
        f.locale = sprache
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        let u = f.string(from: NSNumber(value: spanne.unten)) ?? ""
        let o = f.string(from: NSNumber(value: spanne.oben)) ?? ""
        return "\(u) – \(o) €"
    }

    public static func prozent(_ anteil: Double) -> String {
        let f = NumberFormatter()
        f.locale = sprache
        f.numberStyle = .decimal
        f.maximumFractionDigits = anteil * 100 == (anteil * 100).rounded() ? 0 : 1
        let zahl = f.string(from: NSNumber(value: anteil * 100)) ?? ""
        return "\(zahl) %"
    }

    public static func kilowatt(_ wert: Double) -> String {
        let f = NumberFormatter()
        f.locale = sprache
        f.numberStyle = .decimal
        f.maximumFractionDigits = 1
        f.minimumFractionDigits = 1
        return (f.string(from: NSNumber(value: wert)) ?? "") + " kW"
    }

    public static func kilowattSpanne(_ spanne: Spanne) -> String {
        let f = NumberFormatter()
        f.locale = sprache
        f.numberStyle = .decimal
        f.maximumFractionDigits = 1
        f.minimumFractionDigits = 1
        let u = f.string(from: NSNumber(value: spanne.unten)) ?? ""
        let o = f.string(from: NSNumber(value: spanne.oben)) ?? ""
        return "\(u) – \(o) kW"
    }

    /// Wandelt ein ISO-Datum in die in Deutschland übliche Schreibweise.
    public static func datumLesbar(_ iso: String) -> String {
        let teile = iso.split(separator: "-")
        guard teile.count == 3 else { return iso }
        return "\(teile[2]).\(teile[1]).\(teile[0])"
    }
}
