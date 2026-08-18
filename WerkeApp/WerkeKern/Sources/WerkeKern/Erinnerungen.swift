import Foundation

/// Wann soll sich die App melden – und womit?
///
/// Die Entscheidung dahinter: Die **Ablesereihe** ist das Rückgrat der App.
/// Sie ist der einzige Bestand, der sich nicht nachholen lässt, und sie erzeugt
/// nebenbei den Datensatz, aus dem die Heizlast gemessen statt geschätzt wird.
/// Fristen sind der zweite Anlass – unregelmäßig, fremdbestimmt, aber wichtig.
///
/// Warum die Terminlogik hier liegt und nicht in der Ansicht: Ein Weckruf zur
/// falschen Zeit ist der schnellste Weg, abgeschaltet zu werden. Was wann
/// fällig ist, gehört deshalb an eine Stelle, die sich mit Testfällen prüfen
/// lässt – die App richtet die Benachrichtigungen nur noch ein.
public struct Erinnerung: Sendable, Equatable, Identifiable {

    public enum Art: String, Sendable, Equatable {
        /// Monatliche Ablesung – der wiederkehrende Anlass.
        case ablesung
        /// Eine Frist rückt näher.
        case frist
        /// Eine Rechtsänderung tritt in Kraft.
        case rechtsaenderung
    }

    public var id: String { kennung }

    /// Stabile Kennung. Wird sie beim Neuplanen wiederverwendet, ersetzt das
    /// System die alte Benachrichtigung, statt eine zweite anzulegen.
    public let kennung: String
    public let art: Art
    public let faellig: Date
    public let titel: String
    public let text: String
}

public enum Erinnerungsplan {

    /// So viele Erinnerungen werden höchstens vorausgeplant.
    ///
    /// Zwölf Monate reichen: Wer die App ein Jahr lang nicht öffnet, braucht
    /// keine Weckrufe mehr, sondern einen Anruf.
    public static let hoechstzahl = 12

    /// Um wie viele Tage vor einer Frist erinnert wird.
    public static let vorlauftageFrist = 60

    /// Alle Erinnerungen, die von heute an einzurichten sind.
    ///
    /// Die Liste ist vollständig und ersetzt die vorherige – die App löscht
    /// vor dem Einrichten alles Bestehende. So verschwinden Erinnerungen
    /// wieder, deren Anlass entfallen ist.
    public static func plane(
        ablage: Ablage,
        regeln: Regelpaket,
        heute: Date = Date(),
        stunde: Int = 18
    ) -> [Erinnerung] {

        guard ablage.gebaeude != nil else { return [] }
        var kalender = Calendar(identifier: .gregorian)
        kalender.timeZone = .current

        var liste: [Erinnerung] = []
        liste.append(contentsOf: ablesungen(ablage: ablage, regeln: regeln,
                                            heute: heute, stunde: stunde, kalender: kalender))
        liste.append(contentsOf: fristen(ablage: ablage, regeln: regeln,
                                         heute: heute, stunde: stunde, kalender: kalender))

        return liste
            .filter { $0.faellig > heute }
            .sorted { $0.faellig < $1.faellig }
            .prefix(hoechstzahl)
            .map { $0 }
    }

    // MARK: Die monatliche Ablesung

    private static func ablesungen(
        ablage: Ablage, regeln: Regelpaket,
        heute: Date, stunde: Int, kalender: Calendar
    ) -> [Erinnerung] {

        // Erinnert wird an dem Tag im Monat, an dem ohnehin schon abgelesen
        // wurde. Wer immer am Monatsersten abliest, soll nicht am 15. gestört
        // werden – die Gewohnheit ist die halbe Miete.
        let tagImMonat = gewohnterTag(ablage: ablage, kalender: kalender)
        let ziel = regeln.gebaeude.verbrauchsausweisMonate
        let erfasst = ablage.zusammenhaengendeMonate(bis: heute)

        // Erst die Termine bilden, dann die vergangenen wegwerfen, dann
        // durchzählen. Andersherum verschiebt der übersprungene erste Termin
        // die ganze Zählung um eins – der erste Weckruf sagte dann „noch 23“,
        // obwohl noch keine einzige Ablesung vorliegt.
        var termine: [Date] = []
        for versatz in 0...hoechstzahl {
            guard let monatsstart = kalender.date(byAdding: .month, value: versatz, to: heute),
                  let termin = tag(tagImMonat, in: monatsstart, stunde: stunde, kalender: kalender),
                  termin > heute
            else { continue }
            termine.append(termin)
        }

        var liste: [Erinnerung] = []
        for (nummer, termin) in termine.prefix(hoechstzahl).enumerated() {
            let teile = kalender.dateComponents([.year, .month], from: termin)
            guard let jahr = teile.year, let monat = teile.month else { continue }

            // Die verbleibenden Monate laufen mit: Nach dem dritten Weckruf
            // steht dort eine andere Zahl als beim ersten, und das ist der
            // Unterschied zwischen einem Fortschritt und einer Mahnung.
            let nochOffen = max(0, ziel - erfasst - nummer)
            let text: String
            if nochOffen > 0 {
                text = "Noch \(nochOffen) von \(ziel) Monaten, bis ein Verbrauchsausweis möglich ist. Dreißig Sekunden genügen."
            } else {
                text = "Ihre Verbrauchsreihe ist vollständig. Weiterlesen hält sie aktuell – und macht die Heizlast jeden Monat genauer."
            }

            liste.append(Erinnerung(
                kennung: "ablesung-\(jahr)-\(monat)",
                art: .ablesung,
                faellig: termin,
                titel: "Zählerstand ablesen",
                text: text
            ))
        }
        return liste
    }

    /// An welchem Tag im Monat liest dieser Haushalt üblicherweise ab?
    private static func gewohnterTag(ablage: Ablage, kalender: Calendar) -> Int {
        let tage = ablage.zaehlerstaende
            .sorted { $0.datum > $1.datum }
            .prefix(6)
            .map { kalender.component(.day, from: $0.datum) }

        guard !tage.isEmpty else { return 1 }
        // Median statt Mittelwert: Eine einzelne verspätete Ablesung soll den
        // Termin nicht dauerhaft verschieben.
        let sortiert = tage.sorted()
        return min(28, sortiert[sortiert.count / 2])
    }

    private static func tag(_ tagImMonat: Int, in monat: Date, stunde: Int, kalender: Calendar) -> Date? {
        var teile = kalender.dateComponents([.year, .month], from: monat)
        teile.day = tagImMonat
        teile.hour = stunde
        teile.minute = 0
        return kalender.date(from: teile)
    }

    // MARK: Fristen und Rechtsänderungen

    private static func fristen(
        ablage: Ablage, regeln: Regelpaket,
        heute: Date, stunde: Int, kalender: Calendar
    ) -> [Erinnerung] {

        var liste: [Erinnerung] = []

        // Inkrafttreten des GModG – erst dann gelten die Punkte, die heute als
        // Entwurfsstand gekennzeichnet sind.
        if let ab = regeln.gebaeude.gmodgInKraftAb,
           let datum = Formate.datum(ausISO: ab),
           let termin = mitUhrzeit(datum, stunde: stunde, kalender: kalender) {
            liste.append(Erinnerung(
                kennung: "gmodg-inkrafttreten",
                art: .rechtsaenderung,
                faellig: termin,
                titel: "Neues Gebäudegesetz gilt ab heute",
                text: "Was in der App bisher als Entwurfsstand gekennzeichnet war, ist jetzt geltendes Recht. Ein Blick auf „Was gilt für mein Haus?“ lohnt sich."
            ))
        }

        // Nichtwohngebäude: Renovierungspflicht der schlechtesten Klasse.
        if let gebaeude = ablage.gebaeude, !gebaeude.istWohngebaeude,
           let datum = Formate.datum(ausISO: regeln.gebaeude.nichtwohngebaeudeKlasseGStichtag),
           let termin = vorlauf(datum, tage: vorlauftageFrist, stunde: stunde, kalender: kalender) {
            liste.append(Erinnerung(
                kennung: "nichtwohngebaeude-klasse-g",
                art: .frist,
                faellig: termin,
                titel: "Frist für Nichtwohngebäude rückt näher",
                text: "Am \(Formate.datumLesbar(regeln.gebaeude.nichtwohngebaeudeKlasseGStichtag)) greift die Renovierungspflicht für die schlechteste Effizienzklasse. Jetzt ist Zeit zu prüfen, ob Ihr Gebäude betroffen ist."
            ))
        }

        // Energieausweis: gilt zehn Jahre.
        if let ausstellung = ablage.dokumente
            .filter({ $0.art == .energieausweis })
            .map(\.angelegt)
            .max(),
           let ablauf = kalender.date(byAdding: .year,
                                      value: regeln.gebaeude.energieausweisGueltigkeitJahre,
                                      to: ausstellung),
           let termin = vorlauf(ablauf, tage: vorlauftageFrist, stunde: stunde, kalender: kalender) {
            liste.append(Erinnerung(
                kennung: "energieausweis-ablauf",
                art: .frist,
                faellig: termin,
                titel: "Energieausweis läuft bald ab",
                text: "Ihr Energieausweis verliert in etwa zwei Monaten seine Gültigkeit. Bei Verkauf oder Vermietung muss ein gültiger vorliegen."
            ))
        }

        return liste
    }

    private static func mitUhrzeit(_ datum: Date, stunde: Int, kalender: Calendar) -> Date? {
        var teile = kalender.dateComponents([.year, .month, .day], from: datum)
        teile.hour = stunde
        teile.minute = 0
        return kalender.date(from: teile)
    }

    private static func vorlauf(_ datum: Date, tage: Int, stunde: Int, kalender: Calendar) -> Date? {
        guard let vorher = kalender.date(byAdding: .day, value: -tage, to: datum) else { return nil }
        return mitUhrzeit(vorher, stunde: stunde, kalender: kalender)
    }
}
