import Foundation

/// Angaben zum Haushalt. Werden nur im eingeloggten Bereich erhoben – niemand
/// tippt Einkommensdaten in ein offenes Formular auf einer Website.
public struct Haushalt: Codable, Sendable, Equatable {
    public var selbstbewohnt: Bool
    public var zuVersteuerndesEinkommen: Double?
    public var kinderImHaushalt: Int
    /// Wird die alte Heizung vorzeitig ersetzt (Voraussetzung für den Klimageschwindigkeitsbonus)?
    public var vorzeitigerHeizungstausch: Bool

    public init(
        selbstbewohnt: Bool = true,
        zuVersteuerndesEinkommen: Double? = nil,
        kinderImHaushalt: Int = 0,
        vorzeitigerHeizungstausch: Bool = false
    ) {
        self.selbstbewohnt = selbstbewohnt
        self.zuVersteuerndesEinkommen = zuVersteuerndesEinkommen
        self.kinderImHaushalt = kinderImHaushalt
        self.vorzeitigerHeizungstausch = vorzeitigerHeizungstausch
    }
}

public struct Foerderposten: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID { massnahmeID }
    public let massnahmeID: UUID
    public let art: Massnahmenart
    public let investition: Double
    /// Anteil der Investition, der nach Deckelung förderfähig bleibt.
    public let foerderfaehig: Double
    public let satz: Double
    public let zuschuss: Double
    public let begruendung: [String]
}

/// Ein Hinweis, wie sich das Ergebnis durch anderes Zusammenstellen verbessern ließe.
/// Das ist der Unterschied zwischen einem Rechner und einem Optimierer.
public struct Optimierungshinweis: Codable, Sendable, Equatable, Identifiable {
    public var id: String { titel }
    public let titel: String
    public let erlaeuterung: String
    public let moeglicherMehrbetrag: Double
}

public struct Foerderergebnis: Codable, Sendable, Equatable {
    public let posten: [Foerderposten]
    public let investitionGesamt: Double
    public let zuschussGesamt: Double
    /// Zuschussspanne für die Anzeige – abhängig davon, wie vollständig die
    /// Gebäudeangaben sind.
    public let zuschussSpanne: Spanne
    public let honorar: Honorarergebnis
    /// Investition minus Zuschuss plus Eigenanteil am Honorar.
    public let eigenanteilGesamt: Double
    public let hinweise: [Optimierungshinweis]
    public let annahmen: [Annahme]
    public let regelVersion: Int
    public let regelStand: String
}

public struct Honorarergebnis: Codable, Sendable, Equatable {
    public let honorarBrutto: Double
    public let zuschuss: Double
    public let eigenanteil: Double
}

public struct Foerderrechner {

    public let regeln: Regelpaket

    public init(regeln: Regelpaket) {
        self.regeln = regeln
    }

    // MARK: Honorar

    public func honorar(fuerInvestition investition: Double) -> Honorarergebnis {
        let h = regeln.honorar
        let brutto = investition * h.satzVonInvestition
        let zuschuss = brutto * h.zuschussanteil
        let roher = brutto - zuschuss
        // Der Mindest-Eigenanteil greift nur, wenn überhaupt eine Leistung anfällt.
        let eigen = investition > 0 ? max(roher, h.mindestEigenanteil) : 0
        return Honorarergebnis(honorarBrutto: brutto, zuschuss: zuschuss, eigenanteil: eigen)
    }

    // MARK: Förderung

    public func berechne(
        gebaeude: Gebaeude,
        massnahmen: [Massnahme],
        haushalt: Haushalt = Haushalt()
    ) -> Foerderergebnis {
        berechne(gebaeude: gebaeude, massnahmen: massnahmen, haushalt: haushalt, mitHinweisen: true)
    }

    private func berechne(
        gebaeude: Gebaeude,
        massnahmen: [Massnahme],
        haushalt: Haushalt,
        mitHinweisen: Bool
    ) -> Foerderergebnis {

        let f = regeln.foerderung
        var posten: [Foerderposten] = []
        var annahmen: [Annahme] = []
        var hinweise: [Optimierungshinweis] = []

        // --- Hülle und Anlagentechnik: gemeinsamer Deckel und gemeinsame Schwelle
        let huelle = massnahmen.filter { $0.art.topf == .gebaeudehuelle || $0.art.topf == .anlagentechnik }
        let huelleKosten = huelle.reduce(0) { $0 + $1.kosten }

        let deckelProWE = gebaeude.hatSanierungsfahrplan
            ? f.hoechstkostenProWohneinheitMitISFP
            : f.hoechstkostenProWohneinheit
        let deckel = deckelProWE * Double(gebaeude.wohneinheiten)
        let huelleFoerderfaehig = min(huelleKosten, deckel)

        if huelleKosten > deckel {
            annahmen.append(Annahme(
                "Höchstgrenze",
                "Förderfähig sind \(Formate.euro(deckel)) von \(Formate.euro(huelleKosten))."
            ))
        }

        // iSFP-Bonus: greift erst ab der Schwelle und nur auf den übersteigenden Betrag.
        let bonusBasis = bonusfaehigerBetrag(huelleFoerderfaehig, gebaeude: gebaeude)
        let gesamtsatzHuelle = f.grundsatzEinzelmassnahme

        for m in huelle where m.kosten > 0 {
            // Anteilige Deckelung, damit sich Posten zur Gesamtsumme addieren.
            let anteil = huelleKosten > 0 ? m.kosten / huelleKosten : 0
            let foerderfaehig = huelleFoerderfaehig * anteil
            let bonusAnteil = bonusBasis * anteil

            let grund = foerderfaehig * gesamtsatzHuelle
            let bonus = bonusAnteil * f.isfpBonusSatz
            let summe = grund + bonus

            var begruendung = ["Grundförderung \(Formate.prozent(gesamtsatzHuelle))"]
            if bonus > 0 {
                begruendung.append("iSFP-Bonus \(Formate.prozent(f.isfpBonusSatz)) auf den Betrag über \(Formate.euro(f.isfpBonusSchwelle))")
            }

            posten.append(Foerderposten(
                massnahmeID: m.id,
                art: m.art,
                investition: m.kosten,
                foerderfaehig: foerderfaehig,
                satz: foerderfaehig > 0 ? summe / foerderfaehig : 0,
                zuschuss: summe,
                begruendung: begruendung
            ))
        }

        // --- Heizungstausch: eigenes Programm, eigene Systematik
        for m in massnahmen where m.art.topf == .heizung && m.kosten > 0 {
            let hoechstkosten = f.heizungHoechstkostenErsteWohneinheit
                + f.heizungHoechstkostenWeitereWohneinheit * Double(max(0, gebaeude.wohneinheiten - 1))
            let foerderfaehig = min(m.kosten, hoechstkosten)

            var satz = f.heizungGrundsatz
            var begruendung = ["Grundförderung \(Formate.prozent(f.heizungGrundsatz))"]

            if haushalt.vorzeitigerHeizungstausch {
                satz += f.heizungKlimageschwindigkeitsbonus
                begruendung.append("Klimageschwindigkeitsbonus \(Formate.prozent(f.heizungKlimageschwindigkeitsbonus))")
            }
            if haushalt.selbstbewohnt,
               let einkommen = haushalt.zuVersteuerndesEinkommen,
               einkommen <= f.heizungEinkommensgrenze {
                satz += f.heizungEinkommensbonus
                begruendung.append("Einkommensbonus \(Formate.prozent(f.heizungEinkommensbonus))")
            }
            if haushalt.selbstbewohnt, haushalt.kinderImHaushalt > 0, f.heizungFamilienbonus > 0 {
                satz += f.heizungFamilienbonus
                begruendung.append("Familienbonus \(Formate.prozent(f.heizungFamilienbonus))")
            }

            if satz > f.heizungHoechstsatz {
                satz = f.heizungHoechstsatz
                begruendung.append("gedeckelt auf \(Formate.prozent(f.heizungHoechstsatz))")
            }
            if m.kosten > hoechstkosten {
                begruendung.append("förderfähig bis \(Formate.euro(hoechstkosten))")
            }

            posten.append(Foerderposten(
                massnahmeID: m.id,
                art: m.art,
                investition: m.kosten,
                foerderfaehig: foerderfaehig,
                satz: satz,
                zuschuss: foerderfaehig * satz,
                begruendung: begruendung
            ))
        }

        // --- Effizienzhaus als Komplettsanierung: eigener Posten, konservativ behandelt
        for m in massnahmen where m.art.topf == .effizienzhaus && m.kosten > 0 {
            let foerderfaehig = min(m.kosten, deckel)
            let satz = f.grundsatzEinzelmassnahme
            posten.append(Foerderposten(
                massnahmeID: m.id,
                art: m.art,
                investition: m.kosten,
                foerderfaehig: foerderfaehig,
                satz: satz,
                zuschuss: foerderfaehig * satz,
                begruendung: ["Vereinfachte Annahme – die Effizienzhaus-Stufe wird in der Beratung festgelegt."]
            ))
        }

        // --- Summen
        let investition = massnahmen.reduce(0) { $0 + $1.kosten }
        let zuschuss = posten.reduce(0) { $0 + $1.zuschuss }

        // --- Optimierungshinweise
        if mitHinweisen {
            if let hinweis = isfpSchwellenhinweis(huelleKosten: huelleKosten, gebaeude: gebaeude) {
                hinweise.append(hinweis)
            }
            if !gebaeude.hatSanierungsfahrplan, huelleKosten > 0 {
                // Nicht überschlagen, sondern wirklich durchrechnen: Ein
                // Sanierungsfahrplan hebt zusätzlich die Höchstgrenze der
                // förderfähigen Kosten. Wer nur den Bonussatz ansetzt, nennt
                // dem Kunden einen zu kleinen Betrag – und verkauft damit die
                // eigene Leistung unter Wert.
                var mitFahrplan = gebaeude
                mitFahrplan.hatSanierungsfahrplan = true
                let vergleich = berechne(
                    gebaeude: mitFahrplan, massnahmen: massnahmen,
                    haushalt: haushalt, mitHinweisen: false
                )
                let mehr = vergleich.zuschussGesamt - zuschuss
                if mehr > 0 {
                    hinweise.append(Optimierungshinweis(
                        titel: "Mit Sanierungsfahrplan mehr Förderung",
                        erlaeuterung: "Ein individueller Sanierungsfahrplan erhöht nicht nur den Fördersatz, sondern auch die Grenze der förderfähigen Kosten. Der Fahrplan selbst wird ebenfalls bezuschusst.",
                        moeglicherMehrbetrag: mehr
                    ))
                }
            }
        }
        let hon = honorar(fuerInvestition: investition)
        let eigenanteil = investition - zuschuss + hon.eigenanteil

        annahmen.append(Annahme("Stand der Förderregeln", Formate.datumLesbar(regeln.stand)))
        annahmen.append(Annahme("Wohneinheiten", "\(gebaeude.wohneinheiten)"))
        annahmen.append(Annahme("Sanierungsfahrplan", gebaeude.hatSanierungsfahrplan ? "liegt vor" : "liegt nicht vor"))
        if massnahmen.contains(where: { $0.art.topf == .heizung }) {
            annahmen.append(Annahme("Heizungsförderung", "eigenes Programm, Boni je nach Haushalt"))
        }

        // Die Spanne verengt sich, je vollständiger die Gebäudeangaben sind.
        let unsicherheit = 0.18 - 0.10 * gebaeude.angabenVollstaendigkeit
        let spanne = Spanne(mitte: zuschuss, unsicherheit: unsicherheit).gerundet(auf: 100)

        return Foerderergebnis(
            posten: posten,
            investitionGesamt: investition,
            zuschussGesamt: zuschuss,
            zuschussSpanne: spanne,
            honorar: hon,
            eigenanteilGesamt: eigenanteil,
            hinweise: hinweise,
            annahmen: annahmen,
            regelVersion: regeln.version,
            regelStand: regeln.stand
        )
    }

    // MARK: - Hilfen

    /// Betrag, auf den der iSFP-Bonus tatsächlich gewährt wird.
    private func bonusfaehigerBetrag(_ foerderfaehig: Double, gebaeude: Gebaeude) -> Double {
        let f = regeln.foerderung
        guard gebaeude.hatSanierungsfahrplan else { return 0 }
        guard foerderfaehig >= f.isfpBonusSchwelle else { return 0 }
        return f.isfpBonusNurUeberschuss
            ? foerderfaehig - f.isfpBonusSchwelle
            : foerderfaehig
    }

    /// Der Kern des Optimierers: Wer knapp unter der Schwelle liegt, verschenkt Geld.
    private func isfpSchwellenhinweis(huelleKosten: Double, gebaeude: Gebaeude) -> Optimierungshinweis? {
        let f = regeln.foerderung
        guard gebaeude.hatSanierungsfahrplan else { return nil }
        guard huelleKosten > 0, huelleKosten < f.isfpBonusSchwelle else { return nil }

        let fehlt = f.isfpBonusSchwelle - huelleKosten
        // Nur melden, wenn die Lücke realistisch durch eine weitere Maßnahme zu schließen ist.
        guard fehlt <= f.isfpBonusSchwelle * 0.75 else { return nil }

        // Beispielrechnung: Wenn zusätzlich so viel investiert wird, wie noch fehlt,
        // plus derselbe Betrag noch einmal, entsteht Bonusvolumen.
        let beispielVolumen = huelleKosten + fehlt * 2
        let bonus = (beispielVolumen - f.isfpBonusSchwelle) * f.isfpBonusSatz

        return Optimierungshinweis(
            titel: "Knapp unter der Bonusschwelle",
            erlaeuterung: "Der iSFP-Bonus greift erst ab \(Formate.euro(f.isfpBonusSchwelle)) förderfähigem Volumen – und nur auf den Betrag darüber. Ihnen fehlen dafür \(Formate.euro(fehlt)). Eine weitere Maßnahme im selben Antrag kann sich deshalb doppelt lohnen.",
            moeglicherMehrbetrag: max(0, bonus)
        )
    }
}
