import Foundation
import WerkeKern

// Spielt die vollständige Nutzungsstrecke der App durch – ohne Gerät, ohne
// Xcode. Zeigt, was ein Mensch bei jedem Schritt tatsächlich zu sehen bekäme.
//
//     swift run WerkeDemo

let kalender = Calendar(identifier: .gregorian)
func tag(_ jahr: Int, _ monat: Int, _ t: Int = 15) -> Date {
    kalender.date(from: DateComponents(year: jahr, month: monat, day: t))!
}

func ueberschrift(_ text: String) {
    print("\n" + String(repeating: "─", count: 62))
    print(text.uppercased())
    print(String(repeating: "─", count: 62))
}

func zeile(_ links: String, _ rechts: String) {
    let fuellung = max(1, 34 - links.count)
    print("  " + links + String(repeating: " ", count: fuellung) + rechts)
}

// MARK: - Regeln

let regeln = Regelpaketlader.standard
ueberschrift("Regelgrundlage")
zeile("Fassung", "\(regeln.version)")
zeile("Stand", Formate.datumLesbar(regeln.stand))
zeile("Grundförderung", Formate.prozent(regeln.foerderung.grundsatzEinzelmassnahme))
zeile("iSFP-Bonus ab", Formate.euro(regeln.foerderung.isfpBonusSchwelle))

// MARK: - 1. Erster Start

var ablage = Ablage()
ueberschrift("1 · Erster Start")
let start = Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: tag(2026, 8))
zeile("Anmeldung nötig?", "nein – kein Konto, kein Passwort")
zeile("Nächste Aufgabe", start.titel)

// MARK: - 2. Einstieg

ueberschrift("2 · Einstieg in drei Schritten")
var haus = Gebaeude(
    strasse: "Rolandsweg 80", plz: "33102", ort: "Paderborn",
    typ: .einfamilienhaus, baujahr: 1968, wohnflaeche: 140,
    heizungsart: .gas, heizungBaujahr: 2004
)
ablage.schliesseEinstiegAb(mit: haus, heute: tag(2026, 8))
zeile("Anschrift", haus.anschrift)
zeile("Gebäude", "\(haus.typ.bezeichnung), Bj. \(haus.baujahr), \(Int(haus.wohnflaeche)) m²")
zeile("Angaben vollständig", Formate.prozent(haus.angabenVollstaendigkeit))
zeile("Nächste Aufgabe", Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: tag(2026, 8)).titel)

// MARK: - 3. Förderabschätzung

ueberschrift("3 · Förderabschätzung")
let rechner = Foerderrechner(regeln: regeln)
ablage.massnahmen = [
    Massnahme(art: .fassade, kosten: 31_000),
    Massnahme(art: .fenster, kosten: 18_000)
]
var ergebnis = rechner.berechne(gebaeude: haus, massnahmen: ablage.massnahmen, haushalt: ablage.haushalt)

for posten in ergebnis.posten {
    zeile(posten.art.bezeichnung, "\(Formate.euro(posten.investition)) → \(Formate.euro(posten.zuschuss))")
}
print()
zeile("Angezeigte Spanne", Formate.euroSpanne(ergebnis.zuschussSpanne))
zeile("Investition", Formate.euro(ergebnis.investitionGesamt))
zeile("Förderung", "− " + Formate.euro(ergebnis.zuschussGesamt))
zeile("Beratung, Eigenanteil", "+ " + Formate.euro(ergebnis.honorar.eigenanteil))
zeile("Ihr Anteil", Formate.euro(ergebnis.eigenanteilGesamt))

// MARK: - 4. Der Optimierer

ueberschrift("4 · Was der Rechner von sich aus meldet")
for hinweis in ergebnis.hinweise {
    print("  • \(hinweis.titel)")
    print("    \(hinweis.erlaeuterung)")
    if hinweis.moeglicherMehrbetrag > 0 {
        print("    → bis zu \(Formate.euro(hinweis.moeglicherMehrbetrag)) mehr")
    }
}

haus.hatSanierungsfahrplan = true
let mitFahrplan = rechner.berechne(gebaeude: haus, massnahmen: ablage.massnahmen)
zeile("Mit Sanierungsfahrplan", Formate.euro(mitFahrplan.zuschussGesamt))
zeile("Unterschied", "+ " + Formate.euro(mitFahrplan.zuschussGesamt - ergebnis.zuschussGesamt))

// MARK: - 5. Ergebnis sichern

ueberschrift("5 · Ergebnis sichern")
ablage.gebaeude = haus
ergebnis = mitFahrplan
ablage.merkeBerechnung(
    art: "Förderabschätzung",
    kurzfassung: Formate.euro(ergebnis.zuschussGesamt),
    regelVersion: ergebnis.regelVersion,
    regelStand: ergebnis.regelStand,
    heute: tag(2026, 8)
)
zeile("Gesichert mit Regelfassung", "\(ergebnis.regelVersion), Stand \(Formate.datumLesbar(ergebnis.regelStand))")
zeile("Nächste Aufgabe", Aufgabe.naechste(ablage: ablage, regeln: regeln, heute: tag(2026, 8)).titel)

// MARK: - 6. Heizlast

ueberschrift("6 · Heizlast im Kundengespräch")
let heizlast = Heizlastrechner(regeln: regeln)

let ausFragen = heizlast.ausGebaeudedaten(haus)
zeile("Aus wenigen Fragen", Formate.kilowattSpanne(ausFragen.spanne))

if let ausVerbrauch = heizlast.ausVerbrauch(Verbrauchsangabe(
    brennstoff: .gasKubikmeter, jahreswerte: [2_050, 1_980, 2_120],
    kesselart: .standardkessel, warmwasserEnthalten: true, personenImHaushalt: 3
)) {
    zeile("Aus dem Verbrauch", Formate.kilowattSpanne(ausVerbrauch.spanne))
    print()
    for annahme in ausVerbrauch.annahmen {
        zeile(annahme.bezeichnung, annahme.wert)
    }
    print("\n  \(ausVerbrauch.vorbehalt)")

    let heizkoerper = [
        Heizkoerper(raum: "Wohnen", nennleistungWatt: 3_000),
        Heizkoerper(raum: "Küche", nennleistungWatt: 1_500),
        Heizkoerper(raum: "Bad", nennleistungWatt: 1_200),
        Heizkoerper(raum: "Schlafen", nennleistungWatt: 1_800),
        Heizkoerper(raum: "Kind", nennleistungWatt: 1_500),
        Heizkoerper(raum: "Flur", nennleistungWatt: 800)
    ]
    let vergleich = heizlast.vergleiche(ausVerbrauch: ausVerbrauch, ausGebaeudedaten: ausFragen)
    print()
    zeile("Abgleich", vergleich.abweichung.rawValue)
    print("  → \(vergleich.aussage)")

    let pruefung = Heizflaechenrechner.pruefe(
        heizkoerper: heizkoerper, heizlastKW: ausVerbrauch.spanne.mitte
    )
    print()
    zeile("Heizflächen bei 55 °C", Formate.prozent(pruefung.leistungsfaktor) + " der Nennleistung")
    zeile("Verfügbar / benötigt", "\(Formate.kilowatt(pruefung.verfuegbareLeistungKW)) / \(Formate.kilowatt(pruefung.benoetigtKW))")
    print("  → \(pruefung.aussage)")
}

// MARK: - 7. Zählerstände über zwei Jahre

ueberschrift("7 · Zählerstände über 24 Monate")
var stand = 24_781.0
for monat in 0..<24 {
    let d = kalender.date(byAdding: .month, value: monat, to: tag(2026, 9))!
    stand += Double.random(in: 90...260)
    ablage.ergaenze(Zaehlerstand(art: .gas, wert: stand.rounded(), datum: d), heute: d)
}
let stichtag = tag(2028, 8)
zeile("Zusammenhängende Monate", "\(ablage.zusammenhaengendeMonate(bis: stichtag))")
zeile("Verbrauchsausweis möglich",
      ablage.zusammenhaengendeMonate(bis: stichtag) >= regeln.gebaeude.verbrauchsausweisMonate ? "ja" : "noch nicht")

// Was passiert, wenn jemand zwei Monate aussetzt?
var mitLuecke = Ablage()
for monat in [3, 4, 5] {
    let d = tag(2026, monat)
    mitLuecke.ergaenze(Zaehlerstand(art: .gas, wert: 1_000, datum: d), heute: d)
}
zeile("Nach zwei Monaten Pause", "\(mitLuecke.zusammenhaengendeMonate(bis: tag(2026, 8))) Monate übrig")

// MARK: - 8. Anforderungsvergleich

ueberschrift("8 · Was gilt für dieses Haus?")
let pruefergebnis = GModGPruefung(regeln: regeln, heute: tag(2026, 8))
    .pruefe(haus, monateMitZaehlerstand: 12)

for punkt in pruefergebnis.punkte {
    let zeichen: String
    switch punkt.ampel {
    case .gruen: zeichen = "[ok]  "
    case .gelb: zeichen = "[!]   "
    case .rot: zeichen = "[!!]  "
    case .neutral: zeichen = "[i]   "
    }
    print("  \(zeichen)\(punkt.titel)")
    print("        \(punkt.aussage)")
    print("        Grundlage: \(punkt.fundstelle)\(punkt.istEntwurfsstand ? " (Entwurfsstand)" : "")")
}
print("\n  \(pruefergebnis.hinweis)")

// MARK: - 9. CO₂-Kosten für Vermieter

ueberschrift("9 · CO₂-Kosten als Vermieter")
let co2 = CO2Rechner(regeln: regeln)
for ausstoss in [55.0, 38.0, 20.0, 10.0] {
    let e = co2.berechne(kilogrammProQuadratmeter: ausstoss, co2KostenGesamtProJahr: 1_400)
    zeile("\(Int(ausstoss)) kg/m²·a → Stufe \(e.stufeNummer)",
          "\(Formate.prozent(e.vermieteranteil)) = \(Formate.euro(e.vermieterkostenProJahr)) im Jahr")
}
zeile("Ersparnis bei Sanierung",
      Formate.euro(co2.ersparnisProJahr(vorher: 55, nachher: 20, co2KostenGesamtProJahr: 1_400)) + " im Jahr")

// MARK: - 10. Speichern, Laden, Löschen

ueberschrift("10 · Speichern, Laden, Löschen")
let daten = try Ablagekodierung.kodiere(ablage)
let zurueck = try Ablagekodierung.dekodiere(daten)
zeile("Dateigröße", "\(daten.count) Bytes")
zeile("Nach dem Laden identisch", zurueck == ablage ? "ja" : "NEIN")

let kaputt = Ablagekodierung.dekodiereNachsichtig(Data("{kaputt".utf8))
zeile("Beschädigte Datei", kaputt.brauchtEinstieg ? "leerer Zustand statt Absturz" : "FEHLER")

ablage = Ablage()
zeile("Nach dem Löschen", ablage.brauchtEinstieg ? "wieder am Anfang" : "FEHLER")

ueberschrift("Fertig")
print("  Alle Schritte durchlaufen, ohne Gerät und ohne Netz.\n")
