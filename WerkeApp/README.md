# WERK.E App – iOS

Native iOS-App für Hauseigentümer: Förderabschätzung, Heizlast, gesetzliche
Anforderungen, Gebäudeakte und Zählerstände. Rechnet vollständig **offline**.

Die konzeptionelle Grundlage steht in `../WERKE_App_Produktkonzept_iOS.md`, die
strategische Herleitung in `../WERKE_App_Konzept.md`.

---

## Aufbau

```
WerkeApp/
├── WerkeKern/                  Rechenkern – reines Swift, plattformunabhängig
│   ├── Sources/WerkeKern/
│   │   ├── Modell.swift            Gebäude, Maßnahmen, Zählerstände, Spanne, Ampel
│   │   ├── Regelpaket.swift        Versionierte Förder- und Rechtsdaten + Laden
│   │   ├── RegelpaketEingebettet   Notfallfassung, damit die App nie ohne Regeln dasteht
│   │   ├── Foerderrechner.swift    Förderung, Honorar, Netto-Ergebnis, Optimierungshinweise
│   │   ├── Heizlast.swift          Heizlast aus Verbrauch / aus Gebäudedaten, Heizflächen
│   │   ├── Energiesignatur.swift   Heizlast aus den monatlichen Ablesungen
│   │   ├── Nachtmessung.swift      Heizlast aus einer kalten Nacht, Abkühlkurve
│   │   ├── Raumaufmass.swift       Raumweise Rechnung über die Hüllflächen
│   │   ├── Huellflaechenschaetzung Hüllflächen aus Grundriss und Geschossen
│   │   ├── Kalibrierung.swift      Aufmaß am gemessenen Wärmeverlust ausrichten
│   │   ├── Kurzcheck.swift         Heizlast aus fünf Fragen von außen, mit Fehlermodell
│   │   ├── GModGPruefung.swift     Anforderungsvergleich + CO₂-Kostenaufteilung
│   │   ├── Zaehlerablesung.swift   Auswertung erkannter Texte, Plausibilitätsprüfung
│   │   ├── Formate.swift           Einheitliche Zahlen- und Datumsformate
│   │   └── Ressourcen/regelpaket.json
│   └── Tests/WerkeKernTests/       258 Testfälle
└── App/
    ├── WerkeApp.xcodeproj
    └── WerkeApp/
        ├── WerkeAppApp.swift       Einstiegspunkt
        ├── Gestaltung/             Farben, Abstände, Komponenten
        ├── Daten/                  Ablage (JSON-Datei) und App-Zustand
        ├── Dienste/                Texterkennung, Sprachmodell, PDF, Regelpaket, Kurzbefehle
        ├── Ansichten/              Alle Bildschirme
        └── Assets.xcassets/        App-Symbol und Farben (hell und dunkel)
```

**Warum diese Trennung:** Der Rechenkern enthält keinerlei Oberflächen- oder
Apple-Code. Dadurch lässt er sich auf jedem System bauen und mit Testfällen gegen
Handrechnungen prüfen – und später auch serverseitig oder für Android
weiterverwenden.

---

## Bauen und ausprobieren

```bash
# Rechenkern prüfen (überall, auch ohne Xcode und ohne Mac)
cd WerkeKern && swift test

# Die vollständige Nutzungsstrecke durchspielen und ausgeben
cd WerkeKern && swift run WerkeDemo

# App öffnen
open App/WerkeApp.xcodeproj
```

`WerkeDemo` läuft den ganzen Ablauf durch – erster Start, Einstieg,
Förderabschätzung, Optimierungshinweis, Heizlast über alle drei Wege,
Heizflächenprüfung, 24 Monate Zählerstände, Anforderungsvergleich,
CO₂-Kosten, Speichern und Löschen – und gibt aus, was ein Mensch dabei zu
sehen bekäme. Ohne Gerät, ohne Netz.

Das Projekt bindet `WerkeKern` als lokales Swift-Paket ein; Xcode löst das beim
Öffnen selbst auf. Erforderlich sind **Xcode 16** oder neuer und **iOS 17** als
Mindestversion.

---

## Vor der ersten Einreichung zu erledigen

Diese Punkte kann nur WERK.E entscheiden – sie sind bewusst als offene Stellen
markiert und nicht geraten:

| Punkt | Wo |
|---|---|
| **Fördersätze fachlich bestätigen** | `WerkeKern/Sources/WerkeKern/Ressourcen/regelpaket.json`, Feld `zuPruefen` |
| **Markenfarben eintragen** | `App/WerkeApp/Assets.xcassets/*.colorset` – aktuell ein tragfähiger Vorschlag |
| **Entwicklerteam setzen** | Xcode → Signing & Capabilities → Team (`DEVELOPMENT_TEAM`) |
| **Bundle-Kennung prüfen** | derzeit `de.werk-e.app` |
| **Adresse des Regelpakets** | `App/WerkeApp/Dienste/Regelpaketdienst.swift` → `quelle` |
| **Telefonnummer prüfen** | in `Ergebnis.swift` und `Anforderungen.swift` |
| **EU-Händlerstatus (DSA)** | App Store Connect – ohne ihn wird die App aus allen EU-Storefronts entfernt |
| **D-U-N-S / Entwicklerprogramm** | mehrere Wochen Vorlauf, früh beantragen |

Nach dem Eintragen der Fördersätze **die eingebettete Fassung mitziehen**
(`RegelpaketEingebettet.swift`). Der Test
`testEingebettetesPaketStimmtMitRessourceUeberein` schlägt sonst fehl – das ist
Absicht.

---

## Entwurfsentscheidungen

**Regelpaket statt fest verdrahteter Zahlen.** Fördersätze, Fristen und
Schwellen liegen als versionierte, signierbare Daten vor. Die App bringt eine
Fassung mit und rechnet damit sofort – auch ohne Netz. Eine neuere Fassung wird
im Hintergrund geladen. Jedes Ergebnis speichert seine Regelversion und bleibt
dadurch Jahre später erklärbar.

**Ablage als JSON-Datei statt Datenbank.** Ein Gebäude, Zählerstände,
Dokumentbezüge – das Datenvolumen ist klein, die Fehlermöglichkeiten damit auch.
Kein Migrationsrisiko, alles offline. Ein Wechsel auf SwiftData bleibt möglich,
weil alle Modelle reine `Codable`-Typen sind.

**Sprachmodell nur zum Formulieren.** Das On-Device-Modell (Foundation Models)
darf Texte vereinfachen und strukturieren – **niemals rechnen und niemals Recht
auslegen**. Jede Zahl und jede rechtliche Aussage stammt aus dem Rechenkern und
dem Regelpaket. Fehlt Apple Intelligence – bei älteren Geräten der Normalfall –,
erscheinen die kuratierten Texte unverändert. Keine Kernfunktion hängt daran.

**Texterkennung über Vision.** Läuft auf allen Geräten, offline. Fotos werden
nicht gespeichert und nicht übertragen.

**Spanne statt Punktwert.** Jede Ausgabe trägt ihre Annahmen und ihren Stand.
Eine Heizlastzahl ohne Annahmen ist wertlos und im Streitfall gefährlich.

**Bedienung.** Eine Frage pro Bildschirm, höchstens vier Eingaben bis zum ersten
Ergebnis, Auswahl statt Tastatur, kein Speichern-Knopf, genau eine Hauptaktion je
Ergebnis. Große Tippziele und voller Dynamic-Type-Support, weil die Zielgruppe
zwischen 45 und 70 ist und oft im Keller steht.

---

## Was noch nicht enthalten ist

- **Widget und Live Activity.** Erfordern ein eigenes App-Extension-Ziel. In
  Xcode über *File → New → Target → Widget Extension* in zwei Minuten angelegt;
  ein handgeschriebenes Extension-Ziel in der Projektdatei wäre unnötig fragil.
- **Konto und Synchronisation.** Version 1 arbeitet bewusst rein lokal – damit
  entfallen Anmeldung, Demo-Zugang für die Prüfung und Löschpflichten für
  Konten. Die vollständige Löschung aller Daten ist trotzdem eingebaut.
- **Zahlungen.** Version 1 verkauft nichts in der App. Beratungsleistungen wären
  vom In-App-Kauf ausgenommen, ein digitales Abo nicht – diese Komplikation
  braucht der erste Release nicht.
- **Sanierungsfahrplan mit Phasen** und die drei Warnungen (Antrag vor Auftrag,
  Reihenfolge, Fristen). Siehe Kapitel 18 des Strategiepapiers.

---

## Prüfstand

```
258 Testfälle, 0 Fehler
```

**Rechnen:** Grundförderung und Höchstgrenzen, der iSFP-Bonus in seiner neuen
Systematik (erst ab 30.000 €, nur auf den übersteigenden Betrag),
Bündelungseffekte, Boni und Deckelung beim Heizungstausch, Honorar mit
Mindest-Eigenanteil, Heizlast gegen eine nachgerechnete Handrechnung,
Warmwasserabzug, Heizflächen bei abgesenkter Vorlauftemperatur, alle zehn Stufen
der CO₂-Kostenaufteilung, jeder Prüfpunkt des Anforderungsvergleichs.

**Reise:** erster Start ohne Konto, Einstieg mit und ohne Anschrift, Reihenfolge
der nächsten Aufgabe, Zählerstände über 24 Monate, Lücken in der Reihe,
zukünftig datierte Einträge, mehrere Zählerarten, Mehrfamilienhaus,
Nichtwohngebäude, Denkmal, Neubau, Grenzwerte von 40 bis 600 m², Speichern und
Laden, beschädigte Datei, ältere Ablage ohne neue Felder, Löschen.

**Kurzcheck:** fünf Fragen von außen, Fehlerfortpflanzung quadratisch geprüft,
Wandaufbau und Dämmstärke über den Wärmedurchlasswiderstand, Rangfolge der
nächsten Schritte nach tatsächlichem Informationsgewinn.

**Heizlast, fünf Wege:** Alle verbrauchsgestützten Verfahren sind gegen
künstliche Daten mit **bekanntem** Wärmeverlust geprüft. Die Energiesignatur
gewinnt 200 W/K aus 24 Ablesungen zurück, die Nachtmessung 220 W/K aus einer
einzigen Nacht, die Abkühlkurve die Zeitkonstante. Die raumweise Rechnung ist
gegen eine zeilenweise Handrechnung geprüft, die Kalibrierung gegen bekannte
Maßstäbe – einschließlich der Weigerung, bei zu großer Abweichung zu skalieren.

Dazu kommt eine Prüfung, die keinen einzelnen Weg betrifft, sondern ihr
Verhältnis: Der grobe Kennwert nach Baujahr und die Hüllflächenrechnung müssen
für dasselbe unsanierte Gebäude dieselbe Größenordnung liefern. Der Test läuft
über acht Baujahre und vier Baukörper und lässt höchstens fünfzehn Prozent
Abstand zu. Zwei Wege derselben App, die sich um den Faktor zwei widersprechen,
kosten mehr Vertrauen, als der genauere Weg zurückgewinnt.

**Energiesignatur:** gegen künstliche Ablesungen mit **bekanntem**
Wärmeverlust geprüft – das Verfahren gewinnt 200 W/K auf 3 W/K genau zurück,
ebenso den Warmwasseranteil. Dazu Zählerwechsel mitten in der Reihe, zu wenige
Daten, streuende Werte, Gradtagzahlen und die Zuordnung der Klimaregion.

**Darstellung:** Zahlenformate exakt, einschließlich Rundungsübertrag und
Unabhängigkeit von der Gerätesprache.

### Was der Durchlauf ans Licht gebracht hat

Vier Fehler, die kein einzelner Unit-Test gefunden hätte:

1. **Zahlen mit Nachkommastelle wurden nicht gerundet** ausgegeben („7,351 kW“
   statt „7,4 kW“). Ursache war der zugekaufte Zahlenformatierer. Die
   Formatierung rechnet jetzt selbst und ist exakt geprüft.
2. **Der Hinweis auf den Sanierungsfahrplan nannte 950 € statt 3.800 €** – er
   berücksichtigte nur den Bonussatz, nicht die zusätzlich verdoppelte
   Höchstgrenze. Der Hinweis rechnet jetzt beide Fälle wirklich durch.
3. **Direkt nach dem Einstieg erschien „Zählerstand erfassen“** statt der
   Förderabschätzung – dabei ist genau dafür die App geladen worden.
4. **Die beiden Heizlast-Wege standen kommentarlos nebeneinander**, teils im
   Verhältnis 1:3. Das wirkt wie ein Fehler, ist aber eine Aussage; die App
   gleicht die Wege jetzt ab und erklärt die Abweichung.

Dazu kam beim Testen der Zählerstandserkennung ein fünfter: **„m³“ enthält eine
hochgestellte Ziffer**, die Swift als Zahl zählt – das hätte jede Ablesung an
einem Gaszähler zerstört.

### Was die zweite Durchsicht gefunden hat

Nachdem der Kurzcheck stand, wurde die gesamte Rechenstrecke noch einmal
gegengelesen – Physik, Einheiten, Reihenfolge. Was dabei herauskam, war zum
größten Teil nicht falscher Code, sondern falsche Physik in richtigem Code:

1. **Die Energiesignatur rechnete über den Sommer mit.** In Monaten ohne
   Heizung besteht der Verbrauch nur aus Warmwasser. Diese Punkte drücken die
   Steigung – der Wärmeverlust fiel um rund ein Viertel zu klein aus. Es zählen
   jetzt nur Zeiträume der Heizperiode, und die App sagt, wie viele sie
   verworfen hat.
2. **Die Kalibrierung skalierte die falsche Größe.** Der gemessene Wärmeverlust
   enthält die Lüftung, unsicher sind aber nur die U-Werte. Der Lüftungsanteil
   wird jetzt vor dem Abgleich abgezogen – sonst trifft das kalibrierte Ergebnis
   den Messwert nicht.
3. **Die Warmwasser-Pauschale wurde in der falschen Einheit abgezogen.** Sie ist
   Nutzwärme und gehört hinter den Kesselnutzungsgrad, nicht davor.
4. **Die Nachtmessung zählte die Kesselbereitschaft als Wärmeverlust** und
   rechnete sie auf die Auslegung hoch.
5. **Der Lüftungsverlust wurde mit dem Bruttovolumen gerechnet.** Gelüftet wird
   Luft, nicht Beton – jetzt mit Wohnfläche und lichter Höhe.
6. **Die Bruttogrundfläche wurde als Wohnfläche ausgegeben.** Ein Kennwert in
   W/m² fiel dadurch um ein Fünftel zu niedrig aus und wurde dann mit
   Erfahrungswerten verglichen, die sich auf die Wohnfläche beziehen.
7. **Ein Bad mit 24 °C verlor über seine Innenwände nichts.** Der
   Temperaturkorrekturfaktor gegen beheizt lag pauschal bei null. Er folgt jetzt
   dem Temperaturunterschied – abgeschnitten bei null, damit ein mitgeheizter
   Flur keine Gutschrift bekommt, die beim Schließen einer Tür verschwindet.
8. **Der Wärmebrückenzuschlag sank auf 0,05 W/m²K, ohne dass jemand den dafür
   nötigen Nachweis geführt hätte.** Er bleibt beim Pauschalwert.
9. **„Unbekannt“ hieß „garantiert nichts gemacht“.** Ein Haus von 1968, das
   heute noch bewohnt wird, hat fast immer neue Fenster. Wer die Gebäudeakte
   noch nicht ausgefüllt hat, bekommt jetzt den für das Baujahr üblichen Zustand
   angesetzt – und eine ehrlich breite Spanne dazu.
10. **Die Abkühlkurve verglich Stunden mit Wattstunden je Kelvin und
    Quadratmeter.** Ohne bekannten Wärmeverlust entscheidet jetzt die
    Zeitkonstante in Stunden über die Bauart.

Dazu Daten statt Code: Erdgas wird nach **Brennwert** abgerechnet (10,9 kWh/m³,
nicht 10,0), Einfachverglasung vor 1949 ist eine eigene Stufe (5,0 W/m²K statt
3,0), das Rheinland wird mit −10 °C ausgelegt und nicht wie Ostwestfalen mit
−12 °C, die Gradtagzahlen im Hochsommer sind auf realistische Werte gesetzt, und
die Kennwerte nach Baujahr sind gegen die Hüllflächenrechnung derselben App
abgeglichen. Der Abgleich ist als Testfall festgehalten.
