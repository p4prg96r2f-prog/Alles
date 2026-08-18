import Foundation
import UIKit
import WerkeKern

/// Erzeugt das Ergebnis-PDF – vollständig auf dem Gerät und ohne Netz.
enum PDFErzeugung {

    private static let seiteA4 = CGRect(x: 0, y: 0, width: 595.2, height: 841.8)
    private static let rand: CGFloat = 48

    static func foerderergebnis(
        gebaeude: Gebaeude,
        ergebnis: Foerderergebnis
    ) -> URL? {

        let daten = UIGraphicsPDFRenderer(bounds: seiteA4, format: pdfFormat()).pdfData { kontext in
            kontext.beginPage()
            var y = rand

            y = zeichneKopf(titel: "Ihre Förderübersicht", untertitel: gebaeude.anschrift, y: y)

            y = zeichneAbschnitt("Das Gebäude", y: y)
            y = zeichneZeile("Gebäudeart", gebaeude.typ.bezeichnung, y: y)
            y = zeichneZeile("Baujahr", "\(gebaeude.baujahr)", y: y)
            y = zeichneZeile("Wohnfläche", "\(Int(gebaeude.wohnflaeche)) m²", y: y)
            y = zeichneZeile("Wohneinheiten", "\(gebaeude.wohneinheiten)", y: y)
            y = zeichneZeile("Sanierungsfahrplan", gebaeude.hatSanierungsfahrplan ? "liegt vor" : "liegt nicht vor", y: y)
            y += 12

            y = zeichneAbschnitt("Geplante Maßnahmen", y: y)
            for posten in ergebnis.posten {
                y = zeichneZeile(
                    posten.art.bezeichnung,
                    "\(Formate.euro(posten.investition))   →   Zuschuss \(Formate.euro(posten.zuschuss))",
                    y: y
                )
                for begruendung in posten.begruendung {
                    y = zeichneKleinzeile("– \(begruendung)", y: y)
                }
                y += 4
            }
            y += 8

            y = zeichneAbschnitt("Unterm Strich", y: y)
            y = zeichneZeile("Investition", Formate.euro(ergebnis.investitionGesamt), y: y)
            y = zeichneZeile("Förderung", "− " + Formate.euro(ergebnis.zuschussGesamt), y: y)
            y = zeichneZeile("Beratungshonorar", Formate.euro(ergebnis.honorar.honorarBrutto), y: y)
            y = zeichneZeile("davon bezuschusst", "− " + Formate.euro(ergebnis.honorar.zuschuss), y: y)
            y += 6
            y = zeichneSummenzeile("Ihr Anteil", Formate.euro(ergebnis.eigenanteilGesamt), y: y)
            y += 16

            if !ergebnis.hinweise.isEmpty {
                y = zeichneAbschnitt("Hinweise", y: y)
                for hinweis in ergebnis.hinweise {
                    y = zeichneZeile(hinweis.titel, hinweis.moeglicherMehrbetrag > 0
                        ? "bis zu \(Formate.euro(hinweis.moeglicherMehrbetrag)) mehr" : "", y: y)
                    y = zeichneFliesstext(hinweis.erlaeuterung, y: y)
                    y += 6
                }
                y += 8
            }

            y = zeichneAbschnitt("Annahmen", y: y)
            for annahme in ergebnis.annahmen {
                y = zeichneKleinzeile("\(annahme.bezeichnung): \(annahme.wert)", y: y)
            }

            zeichneFuss(
                text: """
                Unverbindliche Abschätzung auf Basis Ihrer Angaben, kein Förderbescheid und keine \
                Beratungsleistung. Stand der Förderregeln: \(Formate.datumLesbar(ergebnis.regelStand)) \
                (Fassung \(ergebnis.regelVersion)). Erstellt mit der WERK.E App.
                """
            )
        }

        return schreibe(daten, name: "WERK-E-Foerderuebersicht")
    }

    static func heizlastergebnis(gebaeude: Gebaeude, ergebnis: Heizlastergebnis) -> URL? {
        let daten = UIGraphicsPDFRenderer(bounds: seiteA4, format: pdfFormat()).pdfData { kontext in
            kontext.beginPage()
            var y = rand

            y = zeichneKopf(titel: "Heizlast-Abschätzung", untertitel: gebaeude.anschrift, y: y)

            y = zeichneAbschnitt("Ergebnis", y: y)
            y = zeichneSummenzeile("Abgeschätzte Heizlast", Formate.kilowattSpanne(ergebnis.spanne), y: y)
            y = zeichneKleinzeile(ergebnis.verfahren.bezeichnung, y: y)
            y += 16

            y = zeichneAbschnitt("Annahmen", y: y)
            for annahme in ergebnis.annahmen {
                y = zeichneKleinzeile("\(annahme.bezeichnung): \(annahme.wert)", y: y)
            }
            y += 16

            y = zeichneAbschnitt("Wichtiger Hinweis", y: y)
            _ = zeichneFliesstext(ergebnis.vorbehalt, y: y)

            zeichneFuss(text: "Erstellt mit der WERK.E App. Regelfassung \(ergebnis.regelVersion).")
        }
        return schreibe(daten, name: "WERK-E-Heizlast")
    }

    /// Die Anfrage an WERK.E: alles, was die App über das Haus weiß, auf einem
    /// Blatt.
    ///
    /// **Warum als PDF und nicht als Übertragung.** Die App hat keinen Server
    /// und soll keinen bekommen. Ein PDF, das der Nutzer selbst verschickt,
    /// löst dasselbe Problem ohne jede Infrastruktur: Er sieht vorher, was
    /// drinsteht, entscheidet selbst, ob er es abschickt, und behält seine
    /// Daten. WERK.E bekommt statt „ich will mal was mit Förderung“ eine
    /// Anfrage mit Baujahr, Bauteilzuständen, Heizlast und Maßnahmen — der
    /// Unterschied zwischen einem Erstgespräch und einem Angebot.
    static func anfrage(
        gebaeude: Gebaeude,
        heizlast: Heizlastergebnis?,
        heizlastQuelle: String?,
        foerderung: Foerderergebnis?,
        monateMitZaehlerstand: Int,
        regeln: Regelpaket
    ) -> URL? {

        let daten = UIGraphicsPDFRenderer(bounds: seiteA4, format: pdfFormat()).pdfData { kontext in
            kontext.beginPage()
            var y = rand

            y = zeichneKopf(
                titel: "Anfrage an WERK.E",
                untertitel: gebaeude.anschrift.isEmpty ? "Ohne Anschrift" : gebaeude.anschrift,
                y: y
            )

            y = zeichneAbschnitt("Das Gebäude", y: y)
            y = zeichneZeile("Gebäudeart", gebaeude.typ.bezeichnung, y: y)
            y = zeichneZeile("Baujahr", "\(gebaeude.baujahr)", y: y)
            y = zeichneZeile("Wohnfläche", "\(Int(gebaeude.wohnflaeche)) m²", y: y)
            y = zeichneZeile("Heizung", gebaeude.heizungsart.bezeichnung
                + (gebaeude.heizungBaujahr.map { ", Baujahr \($0)" } ?? ""), y: y)
            y += 12

            y = zeichneAbschnitt("Zustand der Bauteile", y: y)
            y = zeichneZeile("Dach", gebaeude.dach.bezeichnung, y: y)
            y = zeichneZeile("Oberste Geschossdecke", gebaeude.obersteGeschossdecke.bezeichnung, y: y)
            y = zeichneZeile("Fassade", gebaeude.fassade.bezeichnung, y: y)
            y = zeichneZeile("Kellerdecke", gebaeude.kellerdecke.bezeichnung, y: y)
            y = zeichneZeile("Fenster", gebaeude.fensterBaujahr.map { "Baujahr \($0)" } ?? "unbekannt", y: y)
            y = zeichneKleinzeile("Angaben zu \(Int(gebaeude.angabenVollstaendigkeit * 100)) % ausgefüllt", y: y)
            y += 12

            if let heizlast {
                y = zeichneAbschnitt("Heizlast", y: y)
                y = zeichneSummenzeile("Abgeschätzt", Formate.kilowattSpanne(heizlast.spanne), y: y)
                if let heizlastQuelle {
                    y = zeichneKleinzeile(heizlastQuelle, y: y)
                }
                y = zeichneKleinzeile("Ersetzt keine Berechnung nach DIN EN 12831.", y: y)
                y += 12
            }

            if monateMitZaehlerstand > 0 {
                y = zeichneAbschnitt("Verbrauchsdaten", y: y)
                y = zeichneZeile(
                    "Lückenlose Monatswerte",
                    "\(monateMitZaehlerstand) von \(regeln.gebaeude.verbrauchsausweisMonate)",
                    y: y
                )
                if monateMitZaehlerstand >= regeln.gebaeude.verbrauchsausweisMonate {
                    y = zeichneKleinzeile("Ein Verbrauchsausweis ist damit möglich.", y: y)
                }
                y += 12
            }

            if let foerderung, !foerderung.posten.isEmpty {
                y = zeichneAbschnitt("Das ist geplant", y: y)
                for posten in foerderung.posten {
                    y = zeichneZeile(
                        posten.art.bezeichnung,
                        "\(Formate.euro(posten.investition))   →   Zuschuss \(Formate.euro(posten.zuschuss))",
                        y: y
                    )
                }
                y += 6
                y = zeichneSummenzeile("Ihr Anteil", Formate.euro(foerderung.eigenanteilGesamt), y: y)
                y += 12
            }

            y = zeichneAbschnitt("Bitte melden Sie sich", y: y)
            _ = zeichneFliesstext(
                "Diese Angaben stammen aus der WERK.E App und wurden von mir zusammengestellt. "
                + "Ich möchte über eine Sanierung sprechen. Sie erreichen mich unter der Adresse, "
                + "von der diese Nachricht kommt.\n\n"
                + "WERK.E Energieeffizienz-Beratung · \(Kontakt.telefonLesbar) · \(Kontakt.netzseite)",
                y: y
            )

            let freigabe = regeln.freigabe?.istErteilt == true
                ? "fachlich freigegeben am \(Formate.datumLesbar(regeln.freigabe!.am))"
                : "noch ohne fachliche Freigabe"
            zeichneFuss(text: "Erstellt mit der WERK.E App. Regelfassung \(regeln.version), Stand "
                + "\(Formate.datumLesbar(regeln.stand)) – \(freigabe). "
                + "Alle Angaben sind Abschätzungen und ersetzen keine Beratung.")
        }
        return schreibe(daten, name: "WERK-E-Anfrage")
    }

    // MARK: - Zeichnen

    private static func pdfFormat() -> UIGraphicsPDFRendererFormat {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [
            kCGPDFContextCreator as String: "WERK.E App",
            kCGPDFContextTitle as String: "WERK.E Ergebnis"
        ]
        return format
    }

    private static let farbeMarke = UIColor(red: 0.10, green: 0.42, blue: 0.38, alpha: 1)
    private static let farbeLeise = UIColor(white: 0.42, alpha: 1)

    private static func zeichneKopf(titel: String, untertitel: String, y: CGFloat) -> CGFloat {
        var y = y
        "WERK.E".draw(at: CGPoint(x: rand, y: y), withAttributes: [
            .font: UIFont.systemFont(ofSize: 13, weight: .heavy),
            .foregroundColor: farbeMarke,
            .kern: 2.0
        ])
        y += 26

        titel.draw(at: CGPoint(x: rand, y: y), withAttributes: [
            .font: UIFont.systemFont(ofSize: 24, weight: .bold),
            .foregroundColor: UIColor.black
        ])
        y += 32

        if !untertitel.isEmpty {
            untertitel.draw(at: CGPoint(x: rand, y: y), withAttributes: [
                .font: UIFont.systemFont(ofSize: 12),
                .foregroundColor: farbeLeise
            ])
            y += 20
        }

        let linie = UIBezierPath()
        linie.move(to: CGPoint(x: rand, y: y + 6))
        linie.addLine(to: CGPoint(x: seiteA4.width - rand, y: y + 6))
        farbeMarke.setStroke()
        linie.lineWidth = 1.5
        linie.stroke()

        return y + 26
    }

    private static func zeichneAbschnitt(_ titel: String, y: CGFloat) -> CGFloat {
        titel.uppercased().draw(at: CGPoint(x: rand, y: y), withAttributes: [
            .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
            .foregroundColor: farbeMarke,
            .kern: 1.0
        ])
        return y + 20
    }

    private static func zeichneZeile(_ links: String, _ rechts: String, y: CGFloat) -> CGFloat {
        links.draw(at: CGPoint(x: rand, y: y), withAttributes: [
            .font: UIFont.systemFont(ofSize: 11),
            .foregroundColor: UIColor.black
        ])
        let attribute: [NSAttributedString.Key: Any] = [
            .font: UIFont.monospacedDigitSystemFont(ofSize: 11, weight: .regular),
            .foregroundColor: UIColor.black
        ]
        let breite = (rechts as NSString).size(withAttributes: attribute).width
        (rechts as NSString).draw(at: CGPoint(x: seiteA4.width - rand - breite, y: y), withAttributes: attribute)
        return y + 17
    }

    private static func zeichneSummenzeile(_ links: String, _ rechts: String, y: CGFloat) -> CGFloat {
        links.draw(at: CGPoint(x: rand, y: y), withAttributes: [
            .font: UIFont.systemFont(ofSize: 13, weight: .semibold),
            .foregroundColor: UIColor.black
        ])
        let attribute: [NSAttributedString.Key: Any] = [
            .font: UIFont.monospacedDigitSystemFont(ofSize: 15, weight: .bold),
            .foregroundColor: farbeMarke
        ]
        let breite = (rechts as NSString).size(withAttributes: attribute).width
        (rechts as NSString).draw(at: CGPoint(x: seiteA4.width - rand - breite, y: y - 2), withAttributes: attribute)
        return y + 24
    }

    private static func zeichneKleinzeile(_ text: String, y: CGFloat) -> CGFloat {
        text.draw(at: CGPoint(x: rand + 12, y: y), withAttributes: [
            .font: UIFont.systemFont(ofSize: 9.5),
            .foregroundColor: farbeLeise
        ])
        return y + 14
    }

    private static func zeichneFliesstext(_ text: String, y: CGFloat) -> CGFloat {
        let breite = seiteA4.width - 2 * rand
        let absatz = NSMutableParagraphStyle()
        absatz.lineSpacing = 2
        let attribute: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10),
            .foregroundColor: farbeLeise,
            .paragraphStyle: absatz
        ]
        let hoehe = (text as NSString).boundingRect(
            with: CGSize(width: breite, height: .greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attribute, context: nil
        ).height
        (text as NSString).draw(
            with: CGRect(x: rand, y: y, width: breite, height: hoehe),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attribute, context: nil
        )
        return y + hoehe + 6
    }

    private static func zeichneFuss(text: String) {
        let breite = seiteA4.width - 2 * rand
        let attribute: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8),
            .foregroundColor: farbeLeise
        ]
        (text as NSString).draw(
            with: CGRect(x: rand, y: seiteA4.height - rand - 40, width: breite, height: 40),
            options: [.usesLineFragmentOrigin],
            attributes: attribute, context: nil
        )
    }

    private static func schreibe(_ daten: Data, name: String) -> URL? {
        let ordner = FileManager.default.temporaryDirectory
        let url = ordner.appendingPathComponent("\(name).pdf")
        do {
            try daten.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }
}
