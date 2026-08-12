# WERK.E App – Produktkonzept iOS

Konkretes Umsetzungskonzept für die native iOS-App. Die strategische Herleitung
steht in `WERKE_App_Konzept.md`; dieses Dokument beschreibt, **was gebaut wird und
wie es aussieht**.

---

## 1. Die App in einem Satz

> **Ein Werkzeug, das einem Hauseigentümer in 60 Sekunden sagt, wie viel Förderung
> für sein Haus drin ist – und ihn danach Schritt für Schritt durch die Sanierung
> begleitet.**

Der **Förderrechner ist der Kern**, nicht ein Feature unter vielen. Er ist der
Grund, warum jemand die App lädt. Alles andere wächst um ihn herum.

### Erfolgskriterien (messbar, ab Tag 1 erheben)

| Kennzahl | Zielwert |
|---|---|
| Nutzer, die nach dem Start ein Ergebnis sehen | > 80 % |
| Zeit bis zum ersten Ergebnis | < 90 Sekunden |
| Anteil „Ergebnis sichern" (= Lead) | > 25 % |
| Zählerstände pro aktivem Nutzer und Jahr | > 8 |
| Beratungsanfragen aus der App pro Monat | wächst monoton |

Wenn Kennzahl 1 oder 2 reißt, ist der Rest gleichgültig. Sie haben Vorrang vor
jedem Funktionswunsch.

---

## 2. Nutzungsrealität – und was daraus folgt

Die Zielgruppe ist **45 bis 70 Jahre alt**, technisch durchschnittlich, und
öffnet die App ohne Anlass **wenige Male im Jahr**. Sie steht dabei oft im Keller,
auf dem Dachboden oder vor dem Zählerschrank – schlechtes Licht, kein Netz,
manchmal Handschuhe.

Daraus folgen fünf Regeln, die im ganzen Konzept nicht verhandelbar sind:

1. **Kein Konto vor dem ersten Nutzen.** Registrierung erst beim Sichern.
2. **Höchstens vier Eingaben bis zum ersten Ergebnis.**
3. **Alles Wesentliche funktioniert offline.**
4. **Große Tippziele, große Schrift, hoher Kontrast.** Dynamic Type wird
   vollständig unterstützt – bei dieser Zielgruppe keine Kür, sondern Pflicht.
5. **Kein „Speichern"-Knopf.** Jede Eingabe wird sofort gesichert.

---

## 3. Funktionsumfang

### 3.1 Muss (Release 1 – Store-Start)

| Funktion | Warum |
|---|---|
| **Förderrechner** | Der Grund für den Download |
| **Netto-Ergebnis** (Investition − Förderung + Honorar) | Die einzige Zahl, die zählt |
| **Ergebnis als PDF** im WERK.E-Layout | Teilbar, offline erzeugt |
| **Mein Haus** – Gebäudedaten anlegen | Datenbasis, macht Wiederkehr sinnvoll |
| **Dokumentenablage** | Grund, die App zu behalten |
| **Zählerstand per Kamera** | Monatlicher Anlass + 24-Monats-Regel |
| **Ergebnis sichern → Kontakt** | Der Geschäftszweck |

### 3.2 Soll (Release 2)

Heizlast-Schnellcheck inklusive Heizflächen-Frage · GModG-Anforderungsvergleich ·
Widget „Nächster Schritt" · Siri-Kurzbefehl für den Zählerstand ·
Erinnerungen

### 3.3 Später

Sanierungsfahrplan mit Phasen · die drei Warnungen (Antrag vor Auftrag,
Reihenfolge, Fristen) · Angebotsprüfung · Baudokumentation · Synchronisation mit
der Beraterseite

---

## 4. Offline-Prinzip

**Das ist der eigentliche Unterschied zur Website.** Eine Website kann alles,
was die App kann – nur nicht im Keller. Deshalb ist Offline kein Detail, sondern
die Begründung der App.

| Funktioniert **ohne Netz** | Braucht Netz |
|---|---|
| Förderrechner, komplett | Aktualisierung des Regelpakets |
| Heizlast- und Heizflächen-Check | Dokumenten-Synchronisation |
| GModG-Anforderungsvergleich | Kontakt-/Terminanfrage |
| Mein Haus, alle Eingaben | Push-Nachrichten |
| Bereits geladene Dokumente | |
| Zählerstand inkl. Texterkennung | |
| PDF-Erzeugung | |
| Erklärtexte und Glossar | |

### Das Regelpaket – wie Offline und Aktualität zusammengehen

Fördersätze, Bauteilanforderungen und Fristen liegen **nicht im Code**, sondern
in einem versionierten, signierten Regelpaket:

- Die App bringt eine Fassung mit und rechnet damit sofort – auch am ersten Tag
  ohne Netz.
- Im Hintergrund wird eine neuere Fassung geladen, sobald Netz da ist.
- **Jedes Ergebnis speichert seine Regelversion.** Ein Ergebnis von heute bleibt
  in zwei Jahren erklärbar, auch wenn sich die Förderung dreimal geändert hat.
- Jede Ausgabe trägt sichtbar „Stand: TT.MM.JJJJ".

Ohne diese Konstruktion ist der Förderrechner nach der ersten Richtlinienänderung
entweder falsch oder offline unbrauchbar. Mit ihr ist er beides nicht.

---

## 5. Apple-Plattform: was genutzt wird

### 5.1 Vision (Texterkennung) – der wichtigste KI-Baustein

Läuft **auf allen Geräten**, offline, ohne Apple Intelligence:

- **Zählerstand** – Kamera auf den Zähler, Wert wird erkannt, bestätigen, fertig
- **Heizungstypenschild** – Hersteller, Typ, Baujahr
- **Energieausweis** – Kennwerte aus einem abfotografierten Ausweis
- **Handwerkerangebot** – Positionen und Beträge für die spätere Prüfung

### 5.2 Foundation Models (On-Device-Sprachmodell)

Seit iOS 26 steht das Modell hinter Apple Intelligence per Swift-API zur
Verfügung – **auf dem Gerät, offline, ohne Schlüssel und ohne laufende Kosten**.
Mit *guided generation* (`@Generable`, `@Guide`) liefert es typsichere,
strukturierte Ergebnisse statt freier Prosa.

Sinnvolle Einsätze:

- **Erklären** – „Was ist ein iSFP?", „Was heißt Effizienzhaus 70?" auf Basis
  eures kuratierten Glossars, in einfacher Sprache, offline
- **Zusammenfassen** – „Ihr Haus in drei Sätzen" aus den erfassten Daten
- **Strukturieren** – gescanntes Angebot in Positionen zerlegen; Sprachnotiz in
  eine geordnete Notiz überführen

> **Die Governance-Regel, die alles zusammenhält:**
> Das Modell darf **formulieren und strukturieren – niemals rechnen und niemals
> Recht auslegen.** Jede Zahl und jede rechtliche Aussage kommt aus dem
> deterministischen Kern und dem Regelpaket. Das Modell macht sie nur lesbar.

Damit ist die KI dort, wo sie stark ist, und aus dem Bereich heraus, in dem sie
haftungsgefährlich wäre.

### 5.3 Weitere Bausteine

| Baustein | Einsatz |
|---|---|
| **App Intents / Siri** | „Zählerstand erfassen" per Sprache oder Kurzbefehl |
| **WidgetKit** | Widget „Nächster Schritt" und Zählerstand-Erinnerung |
| **PDFKit** | Ergebnis-PDF offline im WERK.E-Layout |
| **SwiftData** | Lokale Datenhaltung, Grundlage des Offline-Betriebs |
| **UserNotifications** | Monatliche Zählerstand-Erinnerung, Fristen |

### 5.4 Sanfte Degradation – nicht verhandelbar

Apple Intelligence setzt **iPhone 15 Pro oder neuer** voraus. Ein erheblicher
Teil der Zielgruppe hat ältere Geräte.

> **Keine Kernfunktion darf von Apple Intelligence abhängen.**

Rechner, Texterkennung, Gebäudeakte, Dokumente und PDF laufen auf jedem
unterstützten iPhone. Das Sprachmodell liefert nur Komfort – fehlt es, erscheinen
vorformulierte Texte. Der Nutzer merkt keinen Bruch, nur weniger Geschmeidigkeit.

---

## 6. Informationsarchitektur

Drei Tabs. Mehr nicht.

```
┌──────────────┬──────────────┬──────────────┐
│    Heute     │  Mein Haus   │   Rechnen    │
│  Was tue ich │  Was habe    │  Was will    │
│    jetzt?    │     ich?     │ ich wissen?  │
└──────────────┴──────────────┴──────────────┘
```

- **Heute** – genau eine nächste Aufgabe, darunter der Verlauf
- **Mein Haus** – Gebäudedaten, Dokumente, Zählerstände, Maßnahmen
- **Rechnen** – Förderrechner, Heizlast, GModG-Check

Jede Idee, die einen vierten Tab verlangt, gehört in einen der drei – oder ist
noch nicht reif.

---

## 7. Bildschirme

### 7.1 Start ohne Konto – drei Schritte, unter 60 Sekunden

```
┌─────────────────────────────┐   ┌─────────────────────────────┐
│                             │   │  ← Schritt 1 von 3          │
│      [WERK.E Logo]          │   │                             │
│                             │   │  Wo steht Ihr Haus?         │
│  Wie viel Förderung ist     │   │                             │
│  für Ihr Haus drin?         │   │  ┌───────────────────────┐  │
│                             │   │  │ Straße, PLZ Ort       │  │
│  Drei Fragen. Kein Konto.   │   │  └───────────────────────┘  │
│  Ergebnis sofort.           │   │                             │
│                             │   │  📍 Standort verwenden      │
│  ┌───────────────────────┐  │   │                             │
│  │       Loslegen        │  │   │  ┌───────────────────────┐  │
│  └───────────────────────┘  │   │  │       Weiter          │  │
│                             │   │  └───────────────────────┘  │
│  Ich habe schon ein Konto   │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
```

Schritt 2 fragt Baujahr und Wohnfläche, Schritt 3 die aktuelle Heizung –
je **eine Frage pro Bildschirm**, große Auswahlflächen statt Tastatur, wo
möglich.

### 7.2 Das erste Ergebnis

Der wichtigste Bildschirm der App. Er entscheidet über Kennzahl 1 und 3.

```
┌───────────────────────────────────────┐
│  Ihr Haus                        ⋯    │
│  Rolandsweg 80 · Bj. 1968 · 140 m²    │
├───────────────────────────────────────┤
│                                       │
│      Mögliche Förderung               │
│                                       │
│      28.400 – 34.900 €                │
│      ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                 │
│                                       │
│      bei rund 95.000 € Investition    │
│                                       │
├───────────────────────────────────────┤
│  Unterm Strich                        │
│                                       │
│  Investition           95.000 €       │
│  − Förderung          −31.600 €       │
│  + Beratung (halb                     │
│    gefördert)          +1.425 €       │
│  ─────────────────────────────        │
│  Ihr Anteil            64.825 €       │
│                                       │
├───────────────────────────────────────┤
│  ⓘ Schätzung auf Basis Ihrer Angaben. │
│    Stand der Förderregeln: 21.07.2026 │
│    Annahmen anzeigen ›                │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │     Ergebnis sichern            │  │
│  └─────────────────────────────────┘  │
│    Als PDF teilen   ·   Genauer       │
└───────────────────────────────────────┘
```

Gestaltungsentscheidungen, die hier wirken:

- **Spanne statt Punktwert** – ehrlich, und sie lädt zum Genauerwerden ein
- **Die Netto-Zahl steht drin**, nicht nur der Förderbetrag
- **Das Honorar erscheint neben einer fünfstelligen Förderung** – in diesem
  Umfeld liest es sich als das, was es ist
- **Annahmen sind einen Fingertipp entfernt**, nicht versteckt und nicht im Weg
- **Genau eine Hauptaktion.** „Als PDF teilen" und „Genauer" sind bewusst
  schwächer gesetzt

### 7.3 Heute

```
┌───────────────────────────────────────┐
│  Heute                                │
├───────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │  Jetzt dran                     │  │
│  │                                 │  │
│  │  Zählerstand für Oktober        │  │
│  │  erfassen                       │  │
│  │                                 │  │
│  │  Noch 12 von 24 Monaten, bis    │  │
│  │  Ihr Verbrauchsausweis möglich  │  │
│  │  ist.                           │  │
│  │                                 │  │
│  │  ┌───────────────────────────┐  │  │
│  │  │  📷  Zähler abfotografieren│  │  │
│  │  └───────────────────────────┘  │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Zuletzt                              │
│  ✓ Förderberechnung gesichert   3.10. │
│  ✓ Energieausweis abgelegt     28.09. │
│  ✓ Zählerstand September       01.09. │
└───────────────────────────────────────┘
```

**Immer genau eine Aufgabe.** Ist nichts zu tun, steht dort ein Hinweis mit Wert
(„Ihre Förderung sinkt ab 21.07. – jetzt prüfen"), niemals ein leerer Bildschirm.

### 7.4 Zählerstand erfassen – der 30-Sekunden-Ablauf

```
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  ╔═══════════════════════╗  │   │  Stimmt das?                │
│  ║                       ║  │   │                             │
│  ║   [Kamerabild]        ║  │   │      ┌───────────────┐      │
│  ║  ┌─────────────────┐  ║  │   │      │  2 4 7 8 1 ,3 │      │
│  ║  │  2 4 7 8 1 , 3  │  ║  │   │      └───────────────┘      │
│  ║  └─────────────────┘  ║  │   │      Gas · m³               │
│  ║   erkannt ✓           ║  │   │      3. Oktober 2026        │
│  ╚═══════════════════════╝  │   │                             │
│                             │   │  ┌───────────────────────┐  │
│  Zähler ins Rechteck halten │   │  │      Übernehmen       │  │
│                             │   │  └───────────────────────┘  │
│  Wert von Hand eingeben     │   │      Korrigieren            │
└─────────────────────────────┘   └─────────────────────────────┘
```

Plausibilitätsprüfung gegen den Vormonat: Ein unmöglicher Sprung wird
zurückgefragt, nicht stillschweigend gespeichert.

### 7.5 Mein Haus

```
┌───────────────────────────────────────┐
│  Mein Haus                       ⋯    │
├───────────────────────────────────────┤
│  Rolandsweg 80, 33102 Paderborn       │
│  Einfamilienhaus · 1968 · 140 m²      │
│                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Effizi- │ │ Verbr.  │ │ Doku-   │  │
│  │ enz     │ │ 2.140   │ │ mente   │  │
│  │  E      │ │ m³/a    │ │   7     │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                       │
│  Gebäudeteile                         │
│  Dach              ungedämmt      ›   │
│  Fassade           ungedämmt      ›   │
│  Fenster           2-fach, 1998   ›   │
│  Heizung           Gas, 2004      ›   │
│                                       │
│  Dokumente                        ›   │
│  Zählerstände       12 Einträge   ›   │
│  Berechnungen        3 Einträge   ›   │
└───────────────────────────────────────┘
```

Bauteile lassen sich einzeln ergänzen – jede Ergänzung verengt die Spanne im
Förderergebnis sichtbar. Das ist der Anreiz, weiterzumachen: **Genauigkeit wird
belohnt, nicht verlangt.**

### 7.6 GModG-Check

```
┌───────────────────────────────────────┐
│  ← Was gilt für mein Haus?            │
├───────────────────────────────────────┤
│  Entwurfsstand 13.05.2026 · noch      │
│  nicht in Kraft                       │
├───────────────────────────────────────┤
│  🔴 Oberste Geschossdecke             │
│     Dämmpflicht – bei Ihnen offen  ›  │
│                                       │
│  🟡 Fassade                           │
│     Wenn Sie mehr als 10 % erneuern,  │
│     gelten Anforderungen           ›  │
│                                       │
│  🟢 Heizung, Alter 22 Jahre           │
│     Das 30-Jahre-Verbot entfällt   ›  │
│     nach aktuellem Entwurf            │
│                                       │
│  🟢 Energieausweis                    │
│     gültig bis 2031                ›  │
├───────────────────────────────────────┤
│    Mit WERK.E besprechen              │
└───────────────────────────────────────┘
```

Jede Zeile führt zu einer Erklärung mit Fundstelle und Stand. **Kein Freitextfeld,
keine offene Frage an eine KI.** Regeln anwenden, nicht Recht auslegen.

---

## 8. Interaktionsprinzipien

1. **Eine Frage pro Bildschirm** in allen Eingabestrecken.
2. **Auswahl schlägt Tastatur.** Baujahr als Jahrzehnt-Kacheln, Heizung als
   Symbolauswahl, Fläche als Schieber mit Direkteingabe.
3. **Jedes Ergebnis hat genau eine Hauptaktion.**
4. **Jede Zahl trägt Spanne, Annahme und Stand.**
5. **Fortschritt statt Vollständigkeit.** Nie „Bitte alle Felder ausfüllen" –
   immer „Mit einer weiteren Angabe wird das Ergebnis genauer".
6. **Rückgängig statt Bestätigungsdialog.**
7. **Abbrechen ist immer erlaubt**, der Stand bleibt erhalten.

---

## 9. Designsystem

**Vor dem ersten Bildschirm festlegen** – sonst entsteht ein Flickenteppich, der
sich nur teuer reparieren lässt.

- **Farbe:** WERK.E-Grundfarbe für Aktionen; Ampel dreistufig in
  farbenblindtauglichen Tönen, immer zusätzlich mit Symbol und Text – nie Farbe
  als einzige Information
- **Typografie:** Systemschrift mit vollem Dynamic-Type-Support; Zahlen
  tabellarisch, damit Beträge in Spalten stehen
- **Komponenten:** Ergebniskarte · Kennzahlkachel · Ampelzeile ·
  Eingabeschritt · Hinweisleiste · Hauptaktionsknopf
- **Abstände:** ein Raster, vier Stufen, keine Ausnahmen
- **Dunkelmodus** von Beginn an; er kostet fast nichts, wenn Farben als Tokens
  angelegt sind, und viel, wenn nicht

---

## 10. Technik

**SwiftUI, nativ.** Begründung: Vision, Foundation Models, App Intents, Widgets
und SwiftData sind Swift-Schnittstellen; die App ist ausdrücklich iOS-first; der
Offline-Betrieb ist nativ am einfachsten sauber zu bekommen.

**Bewusster Trade-off:** Android braucht später eine eigene Umsetzung. Für den
Auftrag „perspektivisch in den App Store" ist das die richtige Reihenfolge –
zumal Rechenkern und Regelpaket plattformunabhängig bleiben und
wiederverwendbar sind.

- **Lokal:** SwiftData für Gebäude, Zählerstände, Berechnungen, Dokumentbezüge
- **Rechenkern:** reines Swift-Paket ohne Oberflächenbezug – dadurch mit
  Testfällen gegen Handrechnungen prüfbar und später auch serverseitig nutzbar
- **Regelpaket:** signiertes, versioniertes JSON, mitgeliefert und nachladbar
- **Server:** nur für Konto, Dokumenten-Synchronisation und Regelpakete;
  Hosting in Deutschland/EU
- **Sicherheit:** Gebäude- und Verbrauchsdaten verschlüsselt ablegen, Dokumente
  ebenso; Löschkonzept und Auftragsverarbeitung von Anfang an

---

## 11. App-Store-Reife

| Punkt | Status vorab klären |
|---|---|
| **Guideline 4.2** – kein Website-Wrapper | Erfüllt: Kamera, Offline, Widgets, Siri |
| **EU-Händlerstatus (DSA)** | Vor Einreichung im Entwicklerkonto hinterlegen |
| **Demo-Zugang für die Prüfung** | Nötig, sobald Konten existieren |
| **Account-Löschung in der App** | Pflicht bei Kontoanlage |
| **Datenschutzangaben** | Standort, Kamera, Kontaktdaten deklarieren |
| **Zahlungen** | Beratungsleistung ist vom In-App-Kauf ausgenommen; ein digitales Abo wäre es nicht → in Release 1 gar keine Zahlung in der App |
| **Entwicklerprogramm, D-U-N-S** | Vorlauf mehrere Wochen – sofort beantragen |
| **Berechtigungstexte** | Jede Abfrage mit verständlicher Begründung |

---

## 12. Releaseplan

**R1 – Store-Start.** Onboarding, Förderrechner, Ergebnisbildschirm, PDF, Mein
Haus, Dokumente, Zählerstand mit Texterkennung, „Ergebnis sichern".
*Vollständig offline nutzbar, keine Zahlungen, kein Abo.*

**R2.** Heizlast- und Heizflächen-Check, GModG-Vergleich, Widget, Siri-Kurzbefehl,
Erinnerungen.

**R3.** Sanierungsfahrplan mit Phasen, die drei Warnungen, Angebotsprüfung.

**R4.** Synchronisation mit der Beraterseite, Monitoring, Portfolio.

R1 ist bewusst klein und trotzdem vollständig: eine App, die eine Frage
vollständig beantwortet, ist besser als eine, die zehn halb beantwortet.

---

## 13. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Förderregeln ändern sich, App rechnet falsch | Regelpaket versioniert, Stand sichtbar, Ergebnisse mit Regelversion gespeichert |
| Zu viele Eingaben, Nutzer bricht ab | Harte Grenze: vier Eingaben bis zum ersten Ergebnis; Genauigkeit ist freiwillig |
| Apple Intelligence fehlt auf älteren Geräten | Keine Kernfunktion hängt daran; vorformulierte Texte als Rückfall |
| Falsche Erwartung „App ersetzt Beratung" | Jede Ausgabe zeigt Annahmen und Grenzen; Übergabe an die Beratung ist Teil des Ablaufs, nicht Werbung |
| Ablehnung im Review | Punkte aus Kapitel 11 vor der Einreichung abarbeiten |
| Datenschutz bei Verbrauchsdaten | EU-Hosting, Verschlüsselung, Löschkonzept, sparsame Erhebung |

---

## 14. Was als Erstes zu tun ist

1. **Entwicklerkonto und D-U-N-S beantragen** – längste Vorlaufzeit, blockiert
   sonst am Ende.
2. **Designsystem festlegen** – Farben, Schrift, Abstände, sechs Komponenten.
3. **Rechenkern als eigenes Swift-Paket bauen** und mit euren Handrechnungen
   prüfen. Bevor irgendein Bildschirm entsteht.
4. **Regelpaket-Format festlegen** und die aktuelle Förderlage einmal vollständig
   eintragen. Das ist Fachaufwand, nicht Programmieraufwand – und der kritische
   Pfad.
5. Dann die Bildschirme aus Kapitel 7, in der dort genannten Reihenfolge.

*Alle Rechts- und Förderangaben: Stand August 2026, vor Verwendung prüfen.*
