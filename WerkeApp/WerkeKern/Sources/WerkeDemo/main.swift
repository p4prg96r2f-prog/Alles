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

// MARK: - 3b. Was zur Maßnahme dazugehört

ueberschrift("3b · Was zur Maßnahme dazugehört")
// Fassade und Fenster sind gewählt – die App sagt von sich aus, welche
// Konzepte die Förderung verlangt, statt das dem Termin zu überlassen.
for leistung in Begleitplanung.leistungen(fuer: ablage.massnahmen, gebaeude: haus) {
    zeile(leistung.titel, leistung.stufe.bezeichnung)
    print("        \(leistung.fundstelle)")
}

// MARK: - 3c. Varianten im Vergleich

ueberschrift("3c · Drei Varianten im Vergleich")
// Die eigentliche Entscheidung ist selten „Fassade: ja oder nein“, sondern
// „welches Paket“. Drei Pakete, dieselben Annahmen, nebeneinander.
let varianten = [
    Variante(name: "A · Nur Heizung", massnahmen: [Massnahme(art: .heizungstausch, kosten: 28_000)]),
    Variante(name: "B · Nur Hülle", massnahmen: ablage.massnahmen),
    Variante(name: "C · Beides", massnahmen: ablage.massnahmen + [Massnahme(art: .heizungstausch, kosten: 28_000)])
]
let vergleich = rechner.vergleiche(varianten, gebaeude: haus)
for zeileV in vergleich.zeilen {
    zeile(zeileV.variante.name,
          "Zuschuss \(Formate.euro(zeileV.zuschuss)) · Anteil \(Formate.euro(zeileV.eigenanteil))")
}
if let aussage = vergleich.aussage {
    print("\n  → \(aussage)")
}

// MARK: - 3d. Die Nachricht an WERK.E

ueberschrift("3d · Die Nachricht an WERK.E")
// Am Ende jeder Rechnung steht derselbe Weg: eine Nachricht, in der die
// Ergebnisse wörtlich mitgehen – und die der Nutzer vor dem Senden sieht.
let anfragetext = Anfragetext.nachricht(
    art: .antragsbegleitung,
    gebaeude: haus,
    zusammenfassung: [
        "Geplante Maßnahmen: Fassade dämmen, Fenster erneuern",
        "Mögliche Förderung: \(Formate.euro(ergebnis.zuschussGesamt))"
    ]
)
zeile("Betreff", Anfragetext.betreff(.antragsbegleitung, gebaeude: haus))
for zeileT in anfragetext.split(separator: "\n").prefix(6) {
    print("  | \(zeileT)")
}
print("  | …")

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

// Ein Haus von 1968, das nur 2.050 m³ Gas braucht, ist längst teilsaniert.
// Nur weiß die App das noch nicht – in der Gebäudeakte steht bisher nichts
// außer Anschrift, Baujahr und Fläche.
var hausMitZustand = haus
hausMitZustand.dach = .gedaemmt
hausMitZustand.obersteGeschossdecke = .gedaemmt
hausMitZustand.fassade = .teilweise
hausMitZustand.kellerdecke = .ungedaemmt
hausMitZustand.fensterBaujahr = 2000

let ausFragen = heizlast.ausGebaeudedaten(haus)
zeile("Aus wenigen Fragen", Formate.kilowattSpanne(ausFragen.spanne))

// Dasselbe Verfahren, sobald die Bauteile eingetragen sind. Das ist das
// Versprechen der App in einer Zeile: Genauigkeit wird belohnt, nicht
// verlangt – jede Angabe verengt die Spanne sichtbar.
let ausFragenGefuellt = heizlast.ausGebaeudedaten(hausMitZustand)
zeile("… mit ausgefüllter Gebäudeakte", Formate.kilowattSpanne(ausFragenGefuellt.spanne))

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
// Die Ablesungen folgen einem echten Gebäude: 270 W/K bei
// Auslegungsbedingungen, 4,2 kWh Warmwasser am Tag.
//
// Wichtig ist die Unterscheidung, an der sich alles entscheidet: Der Zähler
// sieht nicht die 270 W/K. Über die Heizperiode helfen Sonne und innere
// Wärmequellen mit, und kein Haus hält 20 Grad im Schlafzimmer, im Flur und
// im Treppenhaus. Was in den Verbräuchen steckt, ist deshalb der *wirksame*
// Wert – rund ein Viertel darunter.
//
// Genau diese Umrechnung muss die App leisten. Ein Demolauf, dessen Zahlen
// den Unterschied nicht abbilden, würde die Verwechslung nicht auffangen,
// sondern festschreiben.
let regionPB = regeln.klimaregion(fuerPLZ: haus.plz) ?? regeln.klimaregionen[0]
let wahrerWaermeverlust = 270.0
let wirksamerWaermeverlust = wahrerWaermeverlust / Energiesignatur.auslegungszuschlag
let wahreGrundlast = 4.2
let steigung = wirksamerWaermeverlust * 24 / 1000 / regeln.heizlast.kesselnutzungsgradStandard

var stand = 24_781.0
var ablesetag = tag(2026, 9, 1)
ablage.ergaenze(Zaehlerstand(art: .gas, wert: stand, datum: ablesetag), heute: ablesetag)

for _ in 0..<24 {
    let naechster = kalender.date(byAdding: .month, value: 1, to: ablesetag)!
    let tage = naechster.timeIntervalSince(ablesetag) / 86_400
    let gradtage = Klimarechnung.gradtagzahl(von: ablesetag, bis: naechster, region: regionPB)
    let kwh = wahreGrundlast * tage + steigung * gradtage
    stand += kwh / regeln.heizlast.brennwertGasProKubikmeter
    ablesetag = naechster
    ablage.ergaenze(Zaehlerstand(art: .gas, wert: stand.rounded(), datum: ablesetag), heute: ablesetag)
}
let stichtag = tag(2028, 9)
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

// Dieselben Ablesungen liefern nebenbei die beste Heizlastabschätzung, die
// ohne Vor-Ort-Termin möglich ist – ohne eine einzige zusätzliche Eingabe.
ueberschrift("7b · Energiesignatur aus denselben Ablesungen")
if let region = regeln.klimaregion(fuerPLZ: haus.plz),
   let signatur = heizlast.ausZaehlerstaenden(ablage.zaehlerstaende, region: region) {
    zeile("Klimaregion", region.name)
    zeile("Wärmeverlust, gemessen", "\(Formate.zahl(signatur.waermeverlustkoeffizient, stellen: 0)) W/K über die Heizperiode")
    zeile("Wärmeverlust, Auslegung", "\(Formate.zahl(signatur.waermeverlustkoeffizientAuslegung, stellen: 0)) W/K")
    zeile("Warmwasser, aus Daten ermittelt", "\(Formate.zahl(signatur.grundverbrauchProJahr, stellen: 0)) kWh im Jahr")
    zeile("Güte der Anpassung", Formate.prozent(signatur.bestimmtheitsmass))
    zeile("Heizlast", Formate.kilowattSpanne(signatur.heizlast))
    zeile("Einstufung", signatur.guete.bezeichnung)
    if let hinweis = signatur.hinweis { print("  → \(hinweis)") }
} else {
    zeile("Energiesignatur", "noch nicht genug Ablesungen")
}



// MARK: - 7c. Eine einzige kalte Nacht

ueberschrift("7c · Heizlast aus einer einzigen kalten Nacht")
let nachtBeginn = tag(2027, 1, 20)
let nachtRegion = regionPB

// Zwei Ablesungen, abends und morgens. Das Haus hat 270 W/K – dieselbe
// Wahrheit wie oben, jetzt aber in acht Stunden statt in zwei Jahren gemessen.
//
// Und mit einem Vorteil, der leicht übersehen wird: Nachts scheint keine
// Sonne, die Innentemperatur wird gehalten. Die Nachtmessung trifft damit
// unmittelbar den Auslegungswert – sie braucht keine Umrechnung wie die
// Energiesignatur.
func kalteNacht(aussen: Double, tagImJanuar: Int) -> Nachtmessung {
    let beginn = kalender.date(from: DateComponents(year: 2027, month: 1, day: tagImJanuar, hour: 22))!
    let stunden = 8.0
    let delta = 20 - aussen
    let nutz = (wahrerWaermeverlust * delta - Heizlastrechner.naechtlicheGewinneWatt) * stunden / 1000
    let end = nutz / regeln.heizlast.kesselnutzungsgradStandard
    let m3 = end / regeln.heizlast.brennwertGasProKubikmeter
    return Nachtmessung(
        beginn: beginn, ende: beginn.addingTimeInterval(stunden * 3600),
        zaehlerVorher: 30_000, zaehlerNachher: 30_000 + m3,
        mittlereAussentemperatur: aussen, innentemperatur: 20
    )
}

if let eineNacht = heizlast.ausNacht(kalteNacht(aussen: -6, tagImJanuar: 20),
                                     normaussentemperatur: nachtRegion.normaussentemperatur) {
    zeile("Nach einer Nacht", "\(Formate.zahl(eineNacht.waermeverlustkoeffizient, stellen: 0)) W/K")
    zeile("Heizlast", Formate.kilowattSpanne(eineNacht.heizlast))
    zeile("Einstufung", eineNacht.guete.bezeichnung)
    if let h = eineNacht.hinweis { print("  → \(h)") }
}

if let dreiNaechte = heizlast.ausNaechten(
    [kalteNacht(aussen: -8, tagImJanuar: 20),
     kalteNacht(aussen: -2, tagImJanuar: 21),
     kalteNacht(aussen: 4, tagImJanuar: 22)],
    normaussentemperatur: nachtRegion.normaussentemperatur) {
    print()
    zeile("Nach drei Nächten", "\(Formate.zahl(dreiNaechte.waermeverlustkoeffizient, stellen: 0)) W/K")
    zeile("Heizlast", Formate.kilowattSpanne(dreiNaechte.heizlast))
    zeile("Einstufung", dreiNaechte.guete.bezeichnung)
}

// Abkühlkurve: Sie liefert die Trägheit, nicht die Heizlast.
let abkuehlung = stride(from: 0.0, through: 10.0, by: 2.0).map { stunde in
    (zeit: nachtBeginn.addingTimeInterval(stunde * 3600),
     innentemperatur: -6 + 26 * exp(-stunde / 70))
}
if let traegheit = Abkuehlmessung.auswerten(
    verlauf: abkuehlung, aussentemperatur: -6,
    waermeverlustkoeffizient: wahrerWaermeverlust, beheizteFlaeche: haus.wohnflaeche) {
    print()
    zeile("Zeitkonstante", "\(Formate.zahl(traegheit.zeitkonstante, stellen: 0)) h")
    zeile("Speicherfähigkeit", "\(Formate.zahl(traegheit.jeQuadratmeter ?? 0, stellen: 0)) Wh/m²K")
    zeile("Einordnung", traegheit.bauart.bezeichnung)
    print("  → \(traegheit.aussage)")
}

// MARK: - 7d. Hüllflächen ohne Aufmaß

ueberschrift("7d · Heizlast aus Grundriss und Geschossen")
let huellrechner = Huellflaechenrechner(regeln: regeln)
let huelle = Gebaeudehuelle(grundflaeche: 80, vollgeschosse: 2, dachform: .sattel,
                            dachgeschossBeheizt: false, kellerlage: .unbeheizterKeller)

let ausHuelle = huellrechner.ausGebaeudehuelle(huelle, gebaeude: hausMitZustand,
                                               normaussentemperatur: nachtRegion.normaussentemperatur)
zeile("Umfang, geschätzt", "\(Formate.zahl(huelle.geschaetzterUmfang, stellen: 1)) m")
zeile("Beheizte Fläche", "\(Formate.zahl(huelle.beheizteFlaeche, stellen: 0)) m²")
zeile("Heizlast", Formate.kilowatt(ausHuelle.gesamtKW))
zeile("Je Quadratmeter", "\(Formate.zahl(ausHuelle.jeQuadratmeter, stellen: 0)) W/m²")

// Die Rechnung nimmt "1968, ungedämmt" an. Das gemessene Haus ist besser.
// Genau dafür gibt es den Abgleich.
if let signaturFuerAbgleich = heizlast.ausZaehlerstaenden(ablage.zaehlerstaende, region: regionPB) {
    let abgeglichen = huellrechner.kalibriere(
        ausHuelle, mit: signaturFuerAbgleich,
        normaussentemperatur: nachtRegion.normaussentemperatur)
    print()
    zeile("Gerechnet aus Annahmen", "\(Formate.zahl(abgeglichen.kalibrierung.gerechneterWaermeverlust, stellen: 0)) W/K")
    zeile("Gemessen aus Ablesungen", "\(Formate.zahl(abgeglichen.kalibrierung.gemessenerWaermeverlust, stellen: 0)) W/K")
    zeile("Maßstab", Formate.zahl(abgeglichen.kalibrierung.maszstab, stellen: 2))
    zeile("Angewendet", abgeglichen.kalibrierung.angewendet ? "ja" : "nein")
    zeile("Heizlast nach Abgleich", Formate.kilowatt(abgeglichen.gesamtKW))
    print("  → \(abgeglichen.kalibrierung.aussage)")

    // Gegenprobe: Ohne hinterlegte Bauteilzustände wird nicht skaliert,
    // sondern der Widerspruch benannt.
    let ohneZustand = huellrechner.ausGebaeudehuelle(huelle, gebaeude: haus,
                                                     normaussentemperatur: nachtRegion.normaussentemperatur)
    let gegenprobe = huellrechner.kalibriere(
        ohneZustand, mit: signaturFuerAbgleich,
        normaussentemperatur: nachtRegion.normaussentemperatur)
    print()
    zeile("Gegenprobe ohne Zustände", "Maßstab \(Formate.zahl(gegenprobe.kalibrierung.maszstab, stellen: 2)), angewendet: \(gegenprobe.kalibrierung.angewendet ? "ja" : "nein")")
}


// MARK: - 7e. Kurzcheck von außen

ueberschrift("7e · Kurzcheck von außen – fünf Fragen")
var kurz = Kurzcheck(
    seitenlaengeSchritte: 14,
    geschosse: .zweiVollgeschosse,
    anbausituation: .freistehend,
    epoche: .nachkrieg,
    fassadenbild: .daemmungErkennbar
)
func zeigeKurzcheck(_ titel: String, _ k: Kurzcheck) {
    let e = huellrechner.berechne(kurzcheck: k, normaussentemperatur: nachtRegion.normaussentemperatur)
    zeile(titel, "\(Formate.kilowattSpanne(e.heizlast))  (± \(Formate.zahl(e.unsicherheit * 100, stellen: 0)) %)")
}

zeigeKurzcheck("Nach fünf Fragen", kurz)
kurz.wandaufbau = .zweischaligMitLuftschicht
zeigeKurzcheck("+ Wandaufbau (Klinker)", kurz)
kurz.daemmstaerkeZentimeter = 12
zeigeKurzcheck("+ Dämmstärke 12 cm", kurz)
kurz.grundflaecheDirekt = 82
zeigeKurzcheck("+ Grundfläche genau", kurz)
kurz.dachform = .sattel
kurz.kellerlage = .unbeheizterKeller
zeigeKurzcheck("+ Dach und Keller", kurz)
kurz.fensteranteilGezaehlt = 22
zeigeKurzcheck("+ Fenster gezählt", kurz)

print()
let kurzErgebnis = huellrechner.berechne(kurzcheck: kurz, normaussentemperatur: nachtRegion.normaussentemperatur)
print("  Was jetzt noch am meisten bringt:")
for verfeinerung in kurzErgebnis.verfeinerungen where !verfeinerung.erledigt && verfeinerung.verengung > 0.005 {
    zeile("  \(verfeinerung.titel)", "−\(Formate.zahl(verfeinerung.verengung * 100, stellen: 0)) Punkte (\(verfeinerung.aufwand.bezeichnung))")
}

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
    let stand = punkt.giltAb.map { punkt.istZukunft(am: tag(2026, 8)) ? " (gilt ab \(Formate.datumLesbar($0)))" : "" } ?? ""
    print("        Grundlage: \(punkt.fundstelle)\(stand)")
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
