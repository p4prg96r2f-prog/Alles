import Foundation

/// Heizlast aus der **Energiesignatur** des Gebäudes.
///
/// Die Idee: Trägt man den Verbrauch jedes Ablesezeitraums gegen die
/// Gradtagzahl desselben Zeitraums auf, ergibt sich eine Gerade.
///
///     Verbrauch = Grundlast · Tage  +  Steigung · Gradtagzahl
///
/// Die **Steigung** ist der Wärmeverlustkoeffizient des Gebäudes in Watt je
/// Kelvin – die physikalisch eigentliche Größe. Die **Grundlast** ist alles,
/// was unabhängig von der Kälte anfällt: Warmwasser und Bereitschaftsverluste.
///
/// Das ist aus drei Gründen besser als die üblichen Verfahren:
///
/// 1. **Kein Warmwasser-Schätzwert mehr.** Der Warmwasseranteil fällt als
///    Nebenprodukt aus der Rechnung – statt mit „500 kWh je Person“ geraten zu
///    werden. Genau dieser Schätzwert ist der häufigste Fehler bei Faustformeln.
/// 2. **Keine Vollbenutzungsstunden mehr.** Die 1.800 bis 2.100 Stunden sind ein
///    Erfahrungswert, der je nach Gebäude um ein Viertel danebenliegen kann.
/// 3. **Eine Güteangabe fällt mit ab.** Wie gut die Punkte auf der Geraden
///    liegen, sagt, wie belastbar das Ergebnis ist. Die anderen Verfahren
///    liefern immer eine Zahl, aber nie einen Hinweis darauf, ob sie taugt.
///
/// Und das Beste: Es braucht **keine einzige zusätzliche Eingabe**. Gerechnet
/// wird mit den monatlichen Zählerständen, die für den Verbrauchsausweis
/// ohnehin erfasst werden. Ein Datensatz, zwei Zwecke.
public struct Energiesignatur: Sendable, Equatable {

    public enum Guete: String, Sendable, Equatable {
        case belastbar
        case brauchbar
        case unsicher

        public var bezeichnung: String {
            switch self {
            case .belastbar: return "belastbar"
            case .brauchbar: return "brauchbar"
            case .unsicher: return "unsicher"
            }
        }
    }

    /// Wirksamer Wärmeverlustkoeffizient über die Heizperiode, in Watt je Kelvin.
    ///
    /// Das ist die gemessene Größe – aber **nicht** die, mit der ausgelegt wird.
    /// Siehe `waermeverlustkoeffizientAuslegung`.
    public let waermeverlustkoeffizient: Double
    /// Verbrauch, der unabhängig von der Außentemperatur anfällt, in kWh im Jahr.
    public let grundverbrauchProJahr: Double
    /// Wie gut liegen die Messpunkte auf der Geraden? 1,0 wäre perfekt.
    public let bestimmtheitsmass: Double
    public let verwendeteZeitraeume: Int
    public let heizlast: Spanne
    public let guete: Guete
    public let annahmen: [Annahme]
    public let hinweis: String?

    /// Vom gemessenen Heizperiodenwert auf den Auslegungswert.
    ///
    /// Die Steigung der Energiesignatur ist **kleiner** als der Wärmeverlust,
    /// mit dem ausgelegt wird – aus zwei Gründen, die beide nichts mit der
    /// Messgenauigkeit zu tun haben:
    ///
    /// 1. **Sonne und innere Wärmequellen.** Über die Heizperiode steuern sie
    ///    ständig einige hundert Watt bei. Die Steigung sieht davon nur das,
    ///    was die Heizung *nicht* liefern musste – rund acht Prozent zu wenig.
    ///    Am Auslegungstag, nachts und bei Nebel, fällt dieser Beitrag weg.
    /// 2. **Die wirkliche Raumtemperatur.** Gradtagzahlen sind auf 20 °C
    ///    bezogen. Kaum ein Haus hält 20 °C im Schlafzimmer, im Flur und im
    ///    Treppenhaus. Liegt das Mittel bei 18 °C, sind die tatsächlichen
    ///    Gradtage rund ein Siebtel kleiner als die tabellierten – und die
    ///    Steigung entsprechend zu klein. Ausgelegt wird aber für den Fall,
    ///    dass jeder Raum seine Solltemperatur hält.
    ///
    /// Zusammen ergibt das rund ein Viertel. Die Zahl ist kein Sicherheitsbeiwert
    /// und keine Schätzung ins Blaue: Sie ist genau der Faktor, der die
    /// gebräuchlichen 1.800 Vollbenutzungsstunden erklärt. Mit 3.000 Kelvintagen
    /// und 32 Kelvin Auslegungsdifferenz gilt
    /// 3.000 · 24 / (1,25 · 32) = 1.800 h.
    ///
    /// Wer den Heizperiodenwert ungeprüft als Auslegungswert nimmt, legt eine
    /// Wärmepumpe um ein Fünftel zu klein aus.
    public static let auslegungszuschlag = 1.25

    /// Wärmeverlustkoeffizient bei Auslegungsbedingungen, in Watt je Kelvin.
    public var waermeverlustkoeffizientAuslegung: Double {
        waermeverlustkoeffizient * Self.auslegungszuschlag
    }
}

// MARK: - Klima

public struct Klimaregion: Codable, Sendable, Equatable {
    public var name: String
    /// Erste Stelle bzw. ersten beiden Stellen der Postleitzahl.
    public var plzPraefixe: [String]
    /// Gradtagzahlen je Monat in Kelvintagen, Januar bis Dezember.
    public var gradtagzahlen: [Double]
    /// Normaußentemperatur für die Auslegung in Grad Celsius.
    public var normaussentemperatur: Double

    public var jahressumme: Double { gradtagzahlen.reduce(0, +) }
}

public extension Regelpaket {

    /// Findet die Klimaregion zur Postleitzahl. Ohne Treffer die erste – sie ist
    /// bewusst als bundesweiter Mittelwert angelegt.
    func klimaregion(fuerPLZ plz: String) -> Klimaregion? {
        guard let erste = klimaregionen.first else { return nil }
        let ziffern = plz.filter { $0.isNumber && $0.isASCII }
        guard !ziffern.isEmpty else { return erste }

        // Längere Präfixe zuerst, damit Feineinteilungen gewinnen.
        let treffer = klimaregionen
            .flatMap { region in region.plzPraefixe.map { (praefix: $0, region: region) } }
            .filter { ziffern.hasPrefix($0.praefix) }
            .max { $0.praefix.count < $1.praefix.count }

        return treffer?.region ?? erste
    }
}

// MARK: - Berechnung

public extension Heizlastrechner {

    /// Ab wie vielen Kelvintagen je Kalendertag gilt ein Ablesezeitraum als
    /// Teil der Heizperiode?
    static let heizperiodenschwelle = 3.0

    /// Berechnet die Energiesignatur aus aufeinanderfolgenden Zählerständen.
    ///
    /// Gibt `nil` zurück, wenn zu wenige oder unbrauchbare Daten vorliegen –
    /// lieber kein Ergebnis als ein schlechtes.
    func ausZaehlerstaenden(
        _ staende: [Zaehlerstand],
        art: Zaehlerart = .gas,
        brennstoff: Brennstoff = .gasKubikmeter,
        kesselart: Kesselart = .standardkessel,
        region: Klimaregion
    ) -> Energiesignatur? {

        let sortiert = staende.filter { $0.art == art }.sorted { $0.datum < $1.datum }
        guard sortiert.count >= 4 else { return nil }

        // Aus Zählerständen werden Verbräuche je Zeitraum.
        var punkte: [(tage: Double, gradtage: Double, verbrauch: Double)] = []
        for i in 1..<sortiert.count {
            let von = sortiert[i - 1]
            let bis = sortiert[i]
            let verbrauchsmenge = bis.wert - von.wert
            guard verbrauchsmenge > 0 else { continue }   // Zählerwechsel oder Tippfehler

            let tage = bis.datum.timeIntervalSince(von.datum) / 86_400
            guard tage >= 20, tage <= 70 else { continue } // ungefähr monatlich

            let gradtage = Klimarechnung.gradtagzahl(von: von.datum, bis: bis.datum, region: region)
            let verbrauch = inKilowattstunden(verbrauchsmenge, brennstoff: brennstoff)
            punkte.append((tage, gradtage, verbrauch))
        }

        // Außerhalb der Heizperiode wird gar nicht geheizt. Nimmt man diese
        // Zeiträume mit in die Ausgleichsrechnung, drückt der reine
        // Warmwasserverbrauch die Steigung – und der Wärmeverlust fällt
        // systematisch um rund ein Viertel zu klein aus.
        //
        // Die Schwelle von drei Kelvintagen je Tag trennt sauber: Ein echter
        // Sommermonat liegt darunter (bundesweit unter einem), die
        // Übergangsmonate März bis Mai und September bis Oktober darüber. Sie
        // gehören dazu – ihre Punkte spannen die Gerade erst auf.
        let ausserhalb = punkte.count
        punkte = punkte.filter { $0.tage > 0 && $0.gradtage / $0.tage >= Self.heizperiodenschwelle }
        let verworfen = ausserhalb - punkte.count

        guard punkte.count >= 4 else { return nil }

        // Ausgleichsrechnung ohne Konstante, aber mit zwei Einflussgrößen:
        // Verbrauch = a · Tage + b · Gradtage
        // Die Zeitraumlänge steckt in a, damit ungleich lange Ablesezeiträume
        // nicht das Ergebnis verzerren.
        let summeTT = punkte.reduce(0) { $0 + $1.tage * $1.tage }
        let summeTG = punkte.reduce(0) { $0 + $1.tage * $1.gradtage }
        let summeGG = punkte.reduce(0) { $0 + $1.gradtage * $1.gradtage }
        let summeTV = punkte.reduce(0) { $0 + $1.tage * $1.verbrauch }
        let summeGV = punkte.reduce(0) { $0 + $1.gradtage * $1.verbrauch }

        let nenner = summeTT * summeGG - summeTG * summeTG
        guard abs(nenner) > 1e-6 else { return nil }

        let grundlastProTag = (summeGG * summeTV - summeTG * summeGV) / nenner
        let steigung = (summeTT * summeGV - summeTG * summeTV) / nenner

        // Eine negative Steigung hieße: Bei Kälte wird weniger geheizt.
        guard steigung > 0 else { return nil }

        // Güte der Anpassung
        let mittel = punkte.reduce(0) { $0 + $1.verbrauch } / Double(punkte.count)
        let abweichungGesamt = punkte.reduce(0) { $0 + pow($1.verbrauch - mittel, 2) }
        let abweichungRest = punkte.reduce(0) { summe, p in
            summe + pow(p.verbrauch - (grundlastProTag * p.tage + steigung * p.gradtage), 2)
        }
        let bestimmtheit = abweichungGesamt > 0 ? max(0, 1 - abweichungRest / abweichungGesamt) : 0

        // Vom Brennstoffeinsatz zur Nutzwärme
        let nutzungsgrad: Double
        switch kesselart {
        case .standardkessel: nutzungsgrad = regeln.heizlast.kesselnutzungsgradStandard
        case .brennwert: nutzungsgrad = regeln.heizlast.kesselnutzungsgradBrennwert
        case .fernwaerme: nutzungsgrad = 1.0
        }

        // Steigung [kWh/Kd] → Wärmeverlustkoeffizient [W/K]
        let koeffizient = steigung * nutzungsgrad * 1000 / 24
        let auslegungsdifferenz = 20 - region.normaussentemperatur
        let roheHeizlast = koeffizient * auslegungsdifferenz / 1000

        // Die Spanne führt von „so viel verbraucht das Haus tatsächlich“ bis
        // „so viel braucht es, wenn am kältesten Tag jeder Raum seine
        // Solltemperatur hält und die Sonne nicht mithilft“. Beides ist
        // richtig, und der Abstand dazwischen ist keine Ungenauigkeit, sondern
        // der Unterschied zwischen Verbrauch und Auslegung.
        let spanne = Spanne(
            unten: roheHeizlast,
            oben: roheHeizlast * Energiesignatur.auslegungszuschlag
        )

        let guete: Energiesignatur.Guete
        var hinweis: String?
        if bestimmtheit >= 0.9 && punkte.count >= 8 {
            guete = .belastbar
        } else if bestimmtheit >= 0.75 {
            guete = .brauchbar
            hinweis = punkte.count < 8
                ? "Mit weiteren Ablesungen wird das Ergebnis genauer – besonders mit Werten aus dem Winter."
                : nil
        } else {
            guete = .unsicher
            hinweis = "Die Ablesungen passen nicht gut zu einer Geraden. Mögliche Gründe: längere Abwesenheit, ein zweiter Wärmeerzeuger wie ein Kaminofen, ein Zählerwechsel oder ein Zahlendreher."
        }

        var annahmen: [Annahme] = [
            Annahme("Verfahren", "Energiesignatur aus \(punkte.count) Ablesezeiträumen der Heizperiode"),
            Annahme("Klimaregion", region.name),
            Annahme("Normaußentemperatur", "\(Formate.zahl(region.normaussentemperatur, stellen: 0)) °C"),
            Annahme("Wärmeverlust, gemessen", "\(Formate.zahl(koeffizient, stellen: 0)) W/K über die Heizperiode"),
            Annahme("Wärmeverlust, Auslegung", "\(Formate.zahl(koeffizient * Energiesignatur.auslegungszuschlag, stellen: 0)) W/K ohne Sonne und bei voller Raumtemperatur"),
            Annahme("Güte der Anpassung", "\(Formate.zahl(bestimmtheit * 100, stellen: 0)) %"),
            Annahme("Kesselnutzungsgrad", Formate.prozent(nutzungsgrad))
        ]
        if verworfen > 0 {
            annahmen.append(Annahme(
                "Außerhalb der Heizperiode",
                "\(verworfen) Zeitraum/Zeiträume nicht verwendet"
            ))
        }
        let grundverbrauch = max(0, grundlastProTag * 365)
        if grundverbrauch > 0 {
            annahmen.append(Annahme(
                "Warmwasser und Bereitschaft",
                "\(Formate.zahl(grundverbrauch, stellen: 0)) kWh im Jahr, aus den Daten ermittelt"
            ))
        }

        return Energiesignatur(
            waermeverlustkoeffizient: koeffizient,
            grundverbrauchProJahr: grundverbrauch,
            bestimmtheitsmass: bestimmtheit,
            verwendeteZeitraeume: punkte.count,
            heizlast: spanne,
            guete: guete,
            annahmen: annahmen,
            hinweis: hinweis
        )
    }
}

// MARK: - Gradtagzahlen

public enum Klimarechnung {

    /// Gradtagzahlen für einen beliebigen Zeitraum, aus den Monatswerten der
    /// Region tageweise zusammengesetzt. Dadurch spielt es keine Rolle, ob
    /// jemand am Ersten oder am Siebenundzwanzigsten abliest.
    public static func gradtagzahl(von: Date, bis: Date, region: Klimaregion) -> Double {
        guard region.gradtagzahlen.count == 12, bis > von else { return 0 }
        let kalender = Calendar(identifier: .gregorian)

        var summe = 0.0
        var tag = kalender.startOfDay(for: von)
        let ende = kalender.startOfDay(for: bis)

        while tag < ende {
            let teile = kalender.dateComponents([.year, .month], from: tag)
            if let monat = teile.month,
               let tageImMonat = kalender.range(of: .day, in: .month, for: tag)?.count {
                summe += region.gradtagzahlen[monat - 1] / Double(tageImMonat)
            }
            guard let naechster = kalender.date(byAdding: .day, value: 1, to: tag) else { break }
            tag = naechster
        }
        return summe
    }
}
