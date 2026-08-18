import Foundation

/// Geräteeinstellungen – bewusst getrennt von der Ablage.
///
/// In der Ablage steht, was zum **Haus** gehört; hier steht, was zu diesem
/// **Gerät und dieser Person** gehört. Der Unterschied wird wichtig, sobald
/// gesichert wird: Die Ablage gehört in die iCloud, die Frage „ist die
/// Sicherung an?“ nicht.
enum Voreinstellungen {

    private static let sperre = UserDefaults.standard

    private enum Schluessel {
        static let fachfunktionen = "werke.fachfunktionen"
        static let erinnerungen = "werke.erinnerungen"
        static let icloud = "werke.icloudSicherung"
        static let erinnerungsstunde = "werke.erinnerungsstunde"
    }

    /// Sind die Fachfunktionen sichtbar – Raumaufmaß mit Laserscan und
    /// Nachtmessung?
    ///
    /// Standardmäßig aus. Beide Wege sind fertig und getestet, aber sie
    /// verlangen Übung und im Fall des Scans ein Pro-Gerät. Für eine
    /// Endkundenfassung heißt das: Ein prominenter Weg endet für die Mehrheit
    /// mit „wird nicht unterstützt“. Für die Kollegen im Termin ist derselbe
    /// Weg ein Zeitgewinn von fünfzig Minuten je Aufmaß. Also: an für die, die
    /// ihn brauchen, aus für alle anderen.
    static var fachfunktionen: Bool {
        get { sperre.bool(forKey: Schluessel.fachfunktionen) }
        set { sperre.set(newValue, forKey: Schluessel.fachfunktionen) }
    }

    /// Sollen Erinnerungen an die Ablesung und an Fristen eingerichtet werden?
    static var erinnerungen: Bool {
        get { sperre.bool(forKey: Schluessel.erinnerungen) }
        set { sperre.set(newValue, forKey: Schluessel.erinnerungen) }
    }

    /// Zu welcher Tageszeit wird erinnert?
    ///
    /// Achtzehn Uhr, weil ein Gaszähler im Keller steht und niemand morgens um
    /// sieben in den Keller geht. Änderbar, damit Schichtarbeiter nicht mitten
    /// im Schlaf geweckt werden.
    static var erinnerungsstunde: Int {
        get {
            let wert = sperre.integer(forKey: Schluessel.erinnerungsstunde)
            return (6...22).contains(wert) ? wert : 18
        }
        set { sperre.set(min(22, max(6, newValue)), forKey: Schluessel.erinnerungsstunde) }
    }

    /// Wird die Ablage in der iCloud des Nutzers gesichert?
    ///
    /// Standardmäßig **an**. Vierundzwanzig Monate Ablesungen sind der einzige
    /// Bestand in dieser App, der sich nicht nachholen lässt – ein
    /// Telefonverlust vernichtet zwei Jahre Disziplin. Die iCloud gehört dem
    /// Nutzer, nicht WERK.E; das Versprechen „Ihre Daten bleiben bei Ihnen“
    /// bleibt damit haltbar.
    static var icloudSicherung: Bool {
        get {
            if sperre.object(forKey: Schluessel.icloud) == nil { return true }
            return sperre.bool(forKey: Schluessel.icloud)
        }
        set { sperre.set(newValue, forKey: Schluessel.icloud) }
    }

    static func allesZuruecksetzen() {
        [Schluessel.fachfunktionen, Schluessel.erinnerungen,
         Schluessel.icloud, Schluessel.erinnerungsstunde].forEach {
            sperre.removeObject(forKey: $0)
        }
    }
}
