# WERK.E App – Produktkonzept

**Ziel:** Eine App, die für WERK.E gleichzeitig Aufträge bringt, die Beratung
schneller macht und aus Einmal-Beratungen wiederkehrende Umsätze macht.

**Leitbild:** *„Ich will mein Haus sanieren, lade die App herunter – und sie führt
mich hindurch."* Ein kleines Schweizer Taschenmesser mit einem Griff, an dem die
Klingen hängen. Ausgearbeitet in **Kapitel 17**; die Kapitel davor liefern die
Bausteine.

**Entscheidung (vorab getroffen):** Eine Plattform, drei Oberflächen –
Kundenportal, Team-App fürs Feld, B2B-Portfolio-Sicht. Alle drei greifen auf
**dieselben Gebäudedaten** zu. Genau darin liegt der Hebel: Was der Berater vor
Ort einmal erfasst, sieht der Kunde als Fahrplan, und der Fristen-Wächter macht
Jahre später daraus den Folgeauftrag.

---

## 1. Die zentrale These

> Der Markt ist voll von **Rechen- und Nachweissoftware**
> (Hottgenroth, ETU, EVEBI, ZUB Helena, BKI). Der ist besetzt – und BAFA-gelistet.
> **Nicht dort konkurrieren.**
>
> Leer ist der Raum **um die Berechnung herum**: Anbahnung, Aufnahme vor Ort,
> Verständlichkeit für den Kunden, Umsetzungsbegleitung, Wiedervorlage.
> Dort verliert die Branche heute Zeit und Aufträge.

Der teuerste Moment im Geschäftsmodell Energieberatung ist der, in dem der
fertige iSFP als PDF übergeben wird und in der Schublade verschwindet. Die
Beratung ist bezahlt, aber die Umsetzung – das eigentliche Volumen, die
Baubegleitung, die Folgeaufträge – passiert oft nie oder woanders.

**Die App ist das Werkzeug, das dieses PDF am Leben hält.**

---

## 2. Datenrückgrat: die digitale Gebäudeakte

Alles hängt an einem Objekt: der **Gebäudeakte**. Einmal angelegt, wächst sie
über Jahre mit.

Inhalt:
- Stammdaten (Baujahr, Fläche, Nutzung, Eigentümer, Denkmalstatus)
- Bauteile (Dach, Fassade, Fenster, Kellerdecke) mit Aufbau, U-Wert, Zustand, Fotos
- Anlagentechnik (Heizung inkl. Baujahr, Lüftung, PV, Speicher)
- Verbräuche (Abrechnungen, Zählerstände, später Smart-Meter)
- Messungen (Blower-Door, Thermografie, Heizlast)
- Dokumente (Energieausweis, iSFP, Förderbescheide, Rechnungen, Fotos)
- Maßnahmen mit Status: geplant → gefördert → beauftragt → umgesetzt → nachgemessen
- Fristen (Energieausweis-Ablauf, Audit-Zyklus, Heizungsalter)

Diese Akte ist das Asset. Sie ist der Grund, warum ein Kunde in fünf Jahren
wieder bei WERK.E anruft und nicht beim Wettbewerber: Dort müsste er von vorne
anfangen.

---

## 3. Modul A – Kundenportal (Hauseigentümer)

### 3.1 Der lebende Sanierungsfahrplan
Der iSFP nicht als PDF, sondern als interaktiver Zeitstrahl.

- Jede Maßnahme eine Karte: Kosten, Förderung, Einsparung, empfohlenes Jahr
- Status abhakbar – der Kunde sieht seinen Fortschritt
- **Was-wäre-wenn-Schieber:** Reihenfolge ändern, Budget begrenzen → Fahrplan
  rechnet die Auswirkung auf Kosten, Förderung und Verbrauch neu
- Vorher/Nachher-Effizienzklasse sichtbar

Der Schieber ist psychologisch der wichtigste Teil. Er verwandelt eine
Empfehlung, die man befolgt oder nicht, in etwas, mit dem man spielt – und
Spielen erzeugt Eigentümerschaft.

### 3.2 Förder-Wächter *(stärkstes Einzelfeature)*
Die Förderlandschaft ändert sich permanent und meist zum Schlechteren:

- Zum **21.07.2026** gilt der iSFP-Bonus (5 %) erst ab 30.000 € förderfähigem
  Investitionsvolumen – und nur auf den übersteigenden Betrag
- Einzelmaßnahmen-Grundförderung wurde von 20 % auf 15 % abgesenkt
- Heizungsförderung liegt seit 2024 bei der KfW (458), nicht mehr bei der BAFA

Die App kennt die geplanten Maßnahmen jedes Kunden und meldet sich **von
selbst**:

> „Deine geplante Fassadendämmung: Ab dem 21.07. sinkt der Zuschuss um rund
> 2.400 €. Antrag bis dahin stellen? → Termin buchen"

Das ist keine Werbung, das ist ein Dienst – und der direkteste Weg von der
Beratung in den Umsetzungsauftrag.

### 3.3 Termin-Vorbereitung durch den Kunden
Vor dem Vor-Ort-Termin bekommt der Kunde eine geführte Checkliste: Heizungs-
typenschild fotografieren, Verbrauchsabrechnungen der letzten drei Jahre
hochladen, Grundrisse, Fensterbeschläge, Kellerdecke.

**Das ist der größte Effizienzhebel überhaupt.** Realistisch 1–2 Stunden weniger
Aufwand pro Projekt, weil der Berater vorbereitet ankommt statt zu suchen,
nachzufragen und ein zweites Mal zu telefonieren.

### 3.4 Umsetzungsbegleitung
Nach der Beratung kommt beim Kunden immer dieselbe Frage: *„Und wer macht das
jetzt?"* Heute endet dort die Beziehung.

- Kuratiertes Handwerker-Partnernetz aus der Region (PB, HX, GT, LIP)
- Angebote als Upload, im Portal nebeneinander vergleichbar
- WERK.E kann Angebote fachlich einordnen → verkaufbare Leistung
- Fördernachweise und Rechnungen landen automatisch in der Gebäudeakte

### 3.5 Selbst-Check als Lead-Magnet
Öffentlich, ohne Login: Adresse + acht Fragen → grobe Effizienzeinschätzung,
Förderpotenzial in Euro, Ampel. Ergebnis gibt es per E-Mail – daraus entsteht
der qualifizierte Lead. Deutlich besser als ein Kontaktformular, weil der
Interessent vorher schon Arbeit investiert hat.

---

## 4. Modul B – Team-App fürs Feld

Zielkonflikt vorweg: Die App darf **die Nachweissoftware nicht ersetzen** wollen
(BAFA-Listung, Rechenkerne, Haftung). Sie ist die **Aufnahme davor**.

### 4.1 Offline-first
Nicht verhandelbar. Keller, Dachböden und Altbauten in ländlichen Lagen haben
kein Netz. Alles muss lokal funktionieren und später synchronisieren. Eine App,
die im Keller streikt, benutzt niemand ein zweites Mal.

### 4.2 Geführte Bauteilaufnahme
Statt freier Formulare eine Strecke entlang des Gebäudes: Dach → Fassade →
Fenster → Keller → Technik. Pro Bauteil Foto, Aufbau, Maße, Zustand.

**Foto-gestützte Vorbelegung:** Foto vom Fenster/Heizungsschild → Vorschlag für
Typ, Baujahr, Kennwerte, den der Berater bestätigt oder korrigiert.
Vorschlag, nie Automatik – die fachliche Verantwortung bleibt beim Menschen.

### 4.3 Alles am Objekt, nicht im Postfach
Sprachnotizen (transkribiert), Messwerte (Blower-Door, Thermografie),
Kundenunterschrift, Zeiterfassung. Heute liegt das verteilt in WhatsApp,
Kamerarolle und E-Mail – und muss abends abgetippt werden.

### 4.4 Berichtsentwurf auf Knopfdruck
Die häufigste Kritik an bestehender Energieberater-Software: Sie rechnet gut,
aber der **Bericht** – rechtssicher, verständlich, ansehnlich – ist Handarbeit
und frisst die Marge.

Aus der Aufnahme entsteht automatisch der Textentwurf für Bestandsaufnahme und
Maßnahmenbeschreibung, im WERK.E-Layout. Der Berater redigiert statt zu tippen.

### 4.5 Export in die bestehende Software
Doppelerfassung ist das Killerkriterium für interne Akzeptanz. Vor
Entwicklungsbeginn muss geprüft werden, welches Austauschformat die eingesetzte
Nachweissoftware tatsächlich importiert. Wenn keine belastbare Schnittstelle
existiert, ist der Umfang von Modul B ehrlich zu reduzieren – lieber ein kleines
Tool, das niemand doppelt tippen lässt, als ein großes, das jeder umgeht.

---

## 5. Modul C – B2B-Portfolio (Hausverwaltungen, Unternehmen, Kommunen)

Das margenstärkste Modul, weil hier Pflichten und Fristen den Auftrag erzeugen –
nicht die Überzeugung.

### 5.1 Portfolio-Übersicht
Alle Objekte eines Kunden auf einer Karte, mit Effizienzklasse, Verbrauch,
offenen Maßnahmen, Investitionsbedarf. Für Hausverwaltungen mit 40 Objekten ist
das der Ersatz für die Excel-Liste, die niemand pflegt.

### 5.2 Fristen-Wächter
Der Auftragsgenerator. Die App kennt die Pflichten und meldet sie **vor** dem
Ablauf:

| Pflicht | Zyklus / Frist |
|---|---|
| Energieausweis | 10 Jahre Gültigkeit |
| Energieaudit DIN EN 16247 | alle 4 Jahre; 4. Welle bis Ende 2027 |
| ISO 50001 / EMAS als Alternative | Rezertifizierung |
| EnEfG-Novelle | Schwelle künftig verbrauchsbasiert (ab ca. 2,77 GWh/a), KMU-Kriterium entfällt |
| Solarpflicht Nichtwohngebäude/öffentlich | gestaffelt: >2.000 m² bis Ende 2027, >750 m² bis Ende 2028, >250 m² bis Ende 2030 |
| Heizungsalter | Austauschpflicht ab 30 Jahren |
| GModG (löst GEG ab, setzt EPBD um) | Kabinett 13.05.2026, Inkrafttreten frühestens Herbst 2026 |
| Nichtwohngebäude Klasse G (schlechteste 16 %) | Renovierungspflicht ab 01.01.2030 |
| Verbrauchsausweis: 24 Monate lückenlose Monatswerte | Erfassung muss **zwei Jahre vorher** beginnen |

Bußgeld beim Energieaudit: bis 50.000 €. Ein Werkzeug, das diese Frist zuver-
lässig meldet, verkauft sich von allein – und der Anruf kommt von WERK.E, bevor
der Wettbewerb überhaupt weiß, dass etwas ansteht.

*Wichtig: Rechtsstand-Angaben in der App immer mit Datum und Quelle versehen und
turnusmäßig prüfen. Falsche Fristen sind ein Haftungsrisiko, kein Feature.*

### 5.3 Maßnahmen-Controlling
Soll-Ist über das Portfolio: geplante vs. erreichte Einsparung, CO₂-Bilanz,
Investitionsverlauf. Liefert dem Kunden das, was er ohnehin für Berichtspflichten
und Gremien braucht – und macht WERK.E zum Datenlieferanten statt zum
Einmal-Dienstleister.

---

## 6. Die drei Rechner: Förderung, GModG-Betroffenheit, Preis

Zwei davon gibt es bereits auf werk-e.de. Die Frage ist nicht, ob sie in die App
kommen, sondern was sie dort können, das die Website nicht kann.

### 6.1 Förderrechner – vom Rechner zum Optimierer

**Bestand:** BEG-Förderrechner 2026, anonym, Ergebnis in 60 Sekunden. Als
öffentlicher Lead-Magnet genau richtig — der bleibt, wie er ist.

**In der App wird er objektgebunden.** Drei Dinge, die anonym nicht funktionieren:

- **Personenbezogene Boni.** Einkommensbonus und der neue Familienbonus hängen an
  Haushaltsdaten. Die tippt niemand in ein offenes Formular auf einer Website —
  im eingeloggten Portal schon.
- **Deckelungen über mehrere Maßnahmen und Jahre.** Höchstgrenzen greifen über den
  ganzen Fahrplan hinweg. Ein Einzelmaßnahmen-Rechner kann das strukturell nicht
  sehen.
- **Der neue iSFP-Bonus.** Seit 21.07.2026 gibt es die 5 % erst ab 30.000 €
  förderfähigem Volumen — und nur auf den übersteigenden Betrag. Damit entscheiden
  **Bündelung und Reihenfolge** über den Zuschuss, nicht mehr nur die Maßnahme.

Daraus folgt der eigentliche Sprung. Ein Rechner beantwortet *„Was bekomme ich für
X?"*. Ein Optimierer beantwortet *„Wie stelle ich X zusammen, damit ich das Maximum
bekomme?"* — inklusive Reihenfolge und Jahr:

> „Fassade allein: 26.000 € förderfähig → kein iSFP-Bonus.
> Fassade + Fenster im selben Antrag: 41.000 € → 550 € zusätzlich."

Diese Rechnung stellt kein Eigentümer selbst an. Sie ist der Grund, warum die
App wertvoll ist — und nebenbei erhöht sie das Auftragsvolumen pro Kunde.

**Architektur-Bedingung:** Fördersätze als **versionierte Regeldaten**, nie als
Code. Die BEG-Richtlinie gilt zwar bis Ende 2030, aber Boni und Deckel wurden
allein 2026 mehrfach angefasst. Jede Berechnung speichert, nach welchem Regelstand
sie entstanden ist — sonst ist ein zwei Jahre alter Fahrplan nicht mehr erklärbar.

### 6.2 GModG-Tool – kein Chatbot, ein Betroffenheits-Check

**Stand:** Referentenentwurf 05.05.2026, Kabinettsbeschluss 13.05.2026,
Inkrafttreten frühestens Herbst 2026. Deutschland hat die EPBD-Frist Ende Mai
gerissen. Deshalb: **nicht als Rechtsauskunft bauen.**

Die interessante Frage ist ohnehin nicht *„Was steht im GModG?"* — das googelt
jeder in zwei Minuten. Sie lautet *„Was bedeutet das für **dieses** Gebäude?"*.
Und die kann nur beantworten, wer die Gebäudedaten hat. Genau deshalb gehört das
Tool in die App und nicht auf eine Infoseite.

| GModG-Änderung | Was das für den Eigentümer heißt | Auftrag für WERK.E |
|---|---|---|
| Verbrauchsausweis braucht **24 Monate lückenlose Monatswerte** — Jahresabrechnungen reichen nicht mehr | Wer nicht heute anfängt zu erfassen, bekommt in zwei Jahren keinen | Monatliche Zählerstandserfassung in der App |
| Nichtwohngebäude: EU-Skala A–G, Klasse G = schlechteste 16 %, Renovierungspflicht ab 01.01.2030 | Betroffenheit unbekannt, Frist läuft | Portfolio-Screening für Verwaltungen, Unternehmen, Kommunen |
| Nichtwohngebäude bei Verkauf/Vermietung: **Bedarfsausweis zwingend** | Vorhandene Verbrauchsausweise werden dafür wertlos | Neuausstellung |
| Vorlagepflicht neu auch bei **Mietvertragsverlängerung** und nach größeren Renovierungen, Bußgeld bis 10.000 € | Viel mehr Anlässe, viel mehr Risiko | Fristen-Wächter für Verwalter |
| Zusätzliche Absolutkennwerte in MWh/a, Bindung an die 1977er-Verordnung entfällt | Ausweise werden inhaltlich anders | Neubewertung, Beratung |
| Standard: **digitaler, maschinenlesbarer Ausweis** | Der Energieausweis wird zum Datensatz | Genau das Format, das die Gebäudeakte ohnehin spricht |

**Die 24-Monats-Regel ist strategisch der wichtigste Punkt im ganzen Konzept.**
Sie macht die App zur *Voraussetzung* einer Leistung, die der Kunde später
zwingend braucht. Wer heute anfängt zu erfassen, ist in zwei Jahren Kunde. Wer
nicht anfängt, kann es dann nicht nachholen — die Zeit lässt sich nicht
rückwirkend erzeugen. So einen Mechanismus bekommt man selten geschenkt, und er
rechtfertigt ein Abo ohne jedes Verkaufsargument.

**Umsetzung in drei Stufen, bewusst vorsichtig:**

1. **Intern zuerst.** Kuratierte Wissensbasis fürs Team; die KI antwortet
   ausschließlich aus fachlich freigegebenen Quellen, mit Fundstelle und
   Stand-Datum. Kein Haftungsproblem, sofortiger Nutzen im Kundengespräch.
2. **Dann Betroffenheits-Check** im Kundenportal — objektbezogen, in klarer
   Sprache, mit drei möglichen Ergebnissen: *betrifft dich / betrifft dich nicht /
   unklar → Beratung*.
3. **Öffentliches Q&A frühestens nach Inkrafttreten**, dann mit Stand-Datum,
   Quelle und Vorbehalt an jeder einzelnen Antwort.

Eine frei formulierende KI darf nie unbeaufsichtigt auf Gesetzestext antworten —
schon gar nicht auf einen Entwurf. Bei Grenzfällen übergibt das Tool an die
Beratung. Das ist kein Mangel des Tools, das ist das Geschäftsmodell.

### 6.3 Preisrechner – die eine Zahl, die zählt

**Bestand:** 3 % der Investitionssumme inkl. MwSt., davon 50 % über BAFA gefördert
→ effektiv 1,5 %, mindestens 325 €. Offen kommuniziert, mit eigener Seite zur
Preisstruktur. Das ist in dieser Branche ein seltener Vorteil, und er sollte
prominenter genutzt werden.

**Die Schwäche liegt nicht im Rechner, sondern in der Trennung.** Förderrechner
und Honorarrechner stehen nebeneinander, und der Kunde muss selbst
zusammenrechnen. Die einzige Zahl, die ihn wirklich interessiert, steht nirgends:

> Investition − Förderung + Honorar (zur Hälfte gefördert)
> = **das kostet dich unterm Strich**

Zusammengelegt wird aus zwei Rechnern ein Abschluss-Werkzeug. Das Honorar
erscheint dann neben einem meist fünfstelligen Förderbetrag — und in diesem
Kontext liest sich 1,5 % als das, was es ist. Getrennt betrachtet wirkt derselbe
Betrag wie eine zusätzliche Rechnung.

**Zweiter Konversionsverlust:** Nach dem Rechenergebnis kommt heute „rufen Sie uns
an". Dort bricht die Hälfte weg. Der Weg vom Ergebnis zum verbindlichen Angebot
und zur digitalen Beauftragung sollte ein Klick sein, kein Telefonat.

**Eine Gestaltungswarnung:** Weil das Honorar prozentual an der Investitionssumme
hängt, wächst es sichtbar mit, sobald der Kunde im Fahrplan-Schieber Maßnahmen
hinzunimmt. Das kann als Anreizkonflikt gelesen werden — auch wenn keiner
vorliegt. Sauberer ist, das Honorar im Ergebnis auszuweisen statt live
mitlaufen zu lassen, und für Portfolio- und Abo-Kunden ohnehin Festpreise
anzubieten.

---

## 7. Heizlast-Schnellcheck – das Werkzeug für den Küchentisch

### 7.1 Die Abgrenzung zuerst

**Was das Tool ist:** eine Plausibilitätsabschätzung im Kundengespräch, in zwei
Minuten, vor Ort.

**Was es nie sein darf:** die Auslegungsgrundlage. Für die
Wärmepumpen-Förderung und den hydraulischen Abgleich braucht es die raumweise
Heizlast nach **DIN EN 12831**. Der Schnellcheck ersetzt sie nicht.

Und genau das ist der Punkt: **Er verkauft sie.** Der Schnellcheck liefert die
Zahl, die das Gespräch öffnet, und macht im selben Moment sichtbar, warum die
richtige Berechnung nötig ist. Eine zu große Wärmepumpe taktet, verbraucht zu
viel und kostet unnötig; eine zu kleine wird im Februar zum Reklamationsfall.
Diese beiden Sätze verkaufen die DIN-Berechnung besser als jedes Angebot.

### 7.2 Weg A – aus dem Verbrauch

Wenn Abrechnungen vorliegen:

> **Heizlast [kW] ≈ (Jahresverbrauch [kWh] × Nutzungsgrad) ÷ Vollbenutzungsstunden**

Den Unterschied zwischen Faustformel und brauchbarer Schätzung machen die
Korrekturen, und die gehören alle ins Tool:

- **Mittelwert über 2–3 Jahre** statt eines einzelnen kalten oder milden Jahres
- **Warmwasseranteil herausrechnen.** Wer ihn drin lässt, bekommt eine zu hohe
  Heizlast – der häufigste Fehler bei Faustformeln, und er führt systematisch zu
  überdimensionierten Wärmepumpen
- **Kesselnutzungsgrad** ansetzen (alter Standardkessel ≈ 75 %, NT/Brennwert höher)
- **Vollbenutzungsstunden** 1.800–2.000 h/a, Standardwert 1.900 h
- **Witterungsbereinigung** über die Gradtagzahlen des Standorts
- Korrekturfragen zu Leerstand, Nutzerverhalten, unbeheizten Bereichen

### 7.3 Weg B – aus wenigen Fragen

Wenn keine Abrechnung greifbar ist: spezifische Heizlast [W/m²] nach Baujahr und
Sanierungsstand × beheizte Fläche. Sechs bis acht Fragen reichen — Baujahr,
Fläche, Gebäudetyp (freistehend/Doppel/Reihe), Dach gedämmt?, Fenster erneuert?,
Fassade gedämmt?, Keller beheizt?

**Ergebnis immer als Spanne, nie als Punktwert.** Eine Spanne ist ehrlich und
schützt vor der einen Zahl, die der Kunde sich merkt und später zitiert.

### 7.4 Der eigentliche Wert liegt nicht in der Zahl

- **Heizflächen-Check.** Die entscheidende Frage vor jeder Wärmepumpe ist nicht
  die Heizlast, sondern ob die vorhandenen Heizkörper diese Last bei 55 °C statt
  70 °C Vorlauf noch abgeben. Foto pro Heizkörper plus Maße → überschlägige
  Leistung bei verschiedenen Vorlauftemperaturen. **Daran scheitern
  Wärmepumpenprojekte, und kaum jemand beantwortet es vor Ort.**
- **Vorher/Nachher.** Heizlast heute gegen Heizlast nach den Maßnahmen des
  Fahrplans. Zeigt in einem Bild, warum erst dämmen und dann tauschen billiger
  ist – die teuerste Fehlentscheidung im Bestand.
- **Anschluss statt Sackgasse.** Alle Eingaben landen in der Gebäudeakte, damit
  die spätere DIN-Berechnung darauf aufsetzt statt neu anzufangen.

**Pflichtangabe in jeder Ausgabe:** Verfahren, Annahmen (Vollbenutzungsstunden,
Nutzungsgrad, Warmwasseranteil) und Unsicherheitsspanne. Eine Heizlastzahl ohne
ihre Annahmen ist wertlos – und im Streitfall gefährlich.

---

## 8. Zehn weitere Funktionen mit Hebel

**1. Wärmepumpen-Eignungscheck.**
Setzt direkt auf dem Heizlast-Schnellcheck auf: Vorlauftemperatur, Heizflächen,
Aufstellort, Schallabstand zum Nachbarn, Platz für Speicher, Wärmestromtarif.
Ergebnis als Ampel – geht / geht nicht / geht mit diesen Maßnahmen. Aus einem
Check entstehen drei Aufträge: DIN-Heizlast, hydraulischer Abgleich,
Förderantrag.

**2. Abgleich mit der kommunalen Wärmeplanung.**
Kommunen über 100.000 Einwohner mussten bis 30.06.2026 liefern, alle übrigen bis
30.06.2028 – für PB, HX, GT und LIP entsteht das also **gerade jetzt**. Die App
zeigt, in welcher Gebietskategorie ein Objekt liegt: Wärmenetz, Wasserstoffnetz,
dezentral oder Prüfgebiet. Wichtig und gut zu erklären: Das ist eine Prognose,
keine Anschlusspflicht – Verbindlichkeit entsteht erst über eine Ausweisung nach
§ 26 WPG. Genau deshalb braucht es jemanden, der es einordnet. Und Wärmenetze
macht ihr selbst.

**3. Förder-Fallenwächter.**
Der häufigste Grund, warum eine Förderung platzt, ist banal: **beauftragt vor
beantragt**. Die App prüft Angebote vor der Unterschrift auf förderschädliche
Punkte – Datum, nicht förderfähige Positionen, fehlende Fachunternehmererklärung,
verfehlte Mindestanforderungen. Ein einziger verhinderter Förderausfall zahlt das
Honorar um ein Vielfaches. Und es ist die Geschichte, die der Kunde weitererzählt.

**4. Antrags- und Nachweis-Cockpit.**
BzA/TPB → Antrag → Bewilligung → Umsetzungsfrist → Verwendungsnachweis →
Bestätigung nach Durchführung. Die BnD ist bei euch eine eigene Leistung und
heute vermutlich ein Kalendereintrag. Als Workflow mit Fristen wird daraus
planbarer Umsatz – und kein Kunde läuft mehr in eine Frist.

**5. Bauphysik-Warnsystem.**
Prüft den Fahrplan automatisch auf Folgefehler. Der wichtigste: Ein
**Lüftungskonzept nach DIN 1946-6** ist Pflicht, sobald mehr als ein Drittel der
Fenster getauscht oder mehr als ein Drittel der Dachfläche gedämmt wird. Das wird
ständig übersehen und endet in Schimmel, Streit und Haftung. Dazu
Innendämmung/Feuchte, Wärmebrücken, Heizungstausch vor Dämmung. Verhindert
Schäden – und erzeugt nebenbei den Auftrag „Lüftungskonzept".

**6. Vermieter-Modul: CO₂-Kosten und Modernisierungsumlage.**
Nach dem CO2KostAufG tragen Vermieter bei schlechten Gebäuden (ab 52 kg CO₂/m²·a)
bis zu **95 %** der CO₂-Kosten; bei gutem Standard (unter 12 kg, EH-55-Niveau)
zahlt der Mieter alles. Zehn Stufen, je 5 kg ein Sprung von 10 Prozentpunkten.
Die App rechnet aus, wie viel eine Maßnahme an CO₂-Kostenanteil verschiebt – in
Euro pro Jahr. **Das überzeugendste Argument gegenüber Hausverwaltungen
überhaupt**, weil es nicht mit Klimaschutz argumentiert, sondern mit der
Nebenkostenabrechnung.

**7. Messtechnik-Assistent (Blower-Door und Thermografie).**
Die Geräte habt ihr. Die App führt durch die Randbedingungen (Thermografie nur
bei ausreichender Temperaturdifferenz, ohne Sonneneinstrahlung, in der
Heizperiode), verortet Leckagen und Wärmebrücken per Foto auf dem Grundriss und
hängt sie ans Bauteil in der Gebäudeakte. Ergebnis: Protokoll ohne Abendarbeit –
und Vorher/Nachher-Bilder, die besser verkaufen als jede Tabelle.

**8. Regionale Benchmarks und Nachbarschaftsaktionen.**
Nach genug Objekten: „Häuser wie deins, Baujahr 1965, Paderborn" mit echten
Kosten und tatsächlich erreichten Einsparungen. Zweiter Teil: Sammelaktionen im
Straßenzug oder Baugebiet – gleiche Bauweise, gleiche Maßnahme, bessere
Handwerkerpreise. So wird aus einem Beratungstermin ein halbes Dutzend.

**9. Energieausweis- und Klassensprung-Simulator.**
„Welche Maßnahme bringt dieses Gebäude aus Klasse G heraus?" Mit dem GModG
bekommt diese Frage Zähne: Nichtwohngebäude der Klasse G – die schlechtesten
16 % – haben ab 01.01.2030 eine Renovierungspflicht. Der Simulator macht aus
einer abstrakten Pflicht eine konkrete Maßnahmenliste mit Kosten. Aus jedem
Screening-Treffer wird ein Angebot.

**10. Projektgedächtnis fürs Team.**
Volltextsuche über alle bisherigen Projekte: „Fachwerk, Innendämmung, Denkmal –
was haben wir da gemacht, und was ist daraus geworden?" Nach über zehn Jahren
Firmengeschichte steckt dieses Wissen in Köpfen und Aktenordnern. Nutzen doppelt:
Einarbeitung neuer Kollegen und Qualitätssicherung.

### Bewusst nicht dabei

- **Routen- und Tourenplanung.** Klingt naheliegend bei vier Kreisen, spart real
  aber weniger als gedacht, weil Kundentermine ohnehin nach Verfügbarkeit liegen.
  Eine Kalenderansicht mit Kartenlayer reicht.
- **Öffentlicher KI-Chatbot zu Förder- und Rechtsfragen** vor Inkrafttreten des
  GModG – siehe Kapitel 6.2. Haftungsrisiko ohne Gegenwert.
- **Gamification / CO₂-Punkte / Badges.** Passt nicht zu Eigentümern, die eine
  fünfstellige Investition abwägen, und beschädigt den fachlichen Anspruch.

### Wenn nur drei davon kommen

**Heizlast-Schnellcheck (Kap. 7)**, weil er im Termin sofort wirkt und die
DIN-Berechnung verkauft. **Nr. 5 Bauphysik-Warnsystem**, weil es billig zu bauen
ist und teure Schäden verhindert. **Nr. 6 CO₂-Modul**, weil es der direkteste Weg
in den B2B-Bestand ist.

---

## 9. Wiederkehrende Umsätze

Heute: Projektgeschäft. Mit App möglich:

| Stufe | Für wen | Inhalt | Größenordnung |
|---|---|---|---|
| **Basis** | alle Bestandskunden | Gebäudeakte, Dokumente, Fahrplan lesen | kostenlos (Bindung) |
| **Fahrplan aktiv** | Private Sanierer | Förder-Wächter, jährliche Fahrplan-Aktualisierung, Verbrauchsvergleich | kleiner Monatsbetrag |
| **Portfolio** | Hausverwaltungen | Fristen-Wächter, Portfolio-Sicht, Reporting | pro Objekt/Monat |
| **Managed** | Unternehmen/Kommunen | Monitoring, Auditvorbereitung, ISO-50001-Begleitung | Jahresvertrag |

Der Sprung von Projekt- zu Abo-Umsatz ist die eigentliche
Unternehmenswert-Steigerung – planbarer Umsatz bewertet sich völlig anders als
Auftragsgeschäft.

---

## 10. Was WERK.E danach hat, was sonst keiner hat

1. **Belegbare Umsetzungsquote.** „X % unserer Sanierungsfahrpläne werden
   tatsächlich umgesetzt" – niemand in der Branche kann das messen. Stärkstes
   Verkaufsargument gegenüber Privatkunden, Kommunen und Fördergebern.
2. **Regionale Referenzdaten.** Nach 200 Objekten in OWL: belastbare Aussagen zu
   typischen Aufbauten, realen Kosten und erreichten Einsparungen für den
   Gebäudebestand der Region. Das schlägt jeden Katalogwert.
3. **Datenbasiertes Handwerkernetz.** Wer liefert pünktlich, wer hält Kosten?
   Nach zwei Jahren weiß die App das.

Punkt 1 und 2 sind nicht kopierbar, weil sie Zeit brauchen. Genau deshalb lohnt
es sich, früh anzufangen – auch mit einem kleinen Funktionsumfang.

---

## 11. Ausbaustufen

**Stufe 1 – MVP (das Fundament)**
Gebäudeakte, Dokumentenablage, Kundenportal mit lesbarem Fahrplan,
Termin-Vorbereitungs-Checkliste — und **monatliche Zählerstandserfassung**.
→ Wirkt sofort: weniger Rückfragen, professioneller Auftritt, Datenbasis wächst
ab Tag 1.
→ Die Zählerstände sind hier bewusst schon dabei, obwohl sie erst später Geld
verdienen: Wegen der 24-Monats-Regel des GModG ist jeder Monat, der nicht erfasst
wird, dauerhaft verloren. Das ist der einzige Teil des Konzepts, bei dem Warten
echte Kosten verursacht.

**Stufe 2 – Feld & Fristen**
Offline-Aufnahme, Fotoerfassung, Berichtsentwurf, Fristen-Wächter B2B.
→ Hier entsteht die Zeitersparnis und der erste automatische Folgeauftrag.

**Stufe 3 – Umsatzmotor**
Förder-Wächter, interaktiver Fahrplan mit Schiebern, Selbst-Check, Abo-Stufen.

**Stufe 4 – Plattform**
Handwerkernetz, Portfolio-Controlling, Verbrauchs-Monitoring, Benchmarks.

Reihenfolge ist bewusst so gewählt: Jede Stufe steht für sich und zahlt sich
aus, auch wenn die nächste nie kommt.

---

## 12. Technische Leitplanken

- **Kundenportal:** Web / PWA. Kein App-Store-Zwang – Hauseigentümer installieren
  keine App für ein Projekt alle zehn Jahre.
- **Team-App:** native oder Hybrid mit echtem Offline-Speicher. Kamera, Sync,
  Konfliktauflösung sind hier die harten Teile, nicht die Oberfläche.
- **Backend:** relationale Datenbank (Gebäudedaten sind hochgradig strukturiert),
  separater Objektspeicher für Fotos/PDFs.
- **Hosting in Deutschland/EU.** Bei Gebäude-, Verbrauchs- und Eigentümerdaten
  ist das nicht nur DSGVO-Pflicht, sondern Vertriebsargument – besonders
  gegenüber Kommunen.
- **Datenschutz von Anfang an:** Verbrauchsdaten sind personenbeziehbar. AVV mit
  Hausverwaltungen, Löschkonzept, Mandantentrennung, Rollen/Rechte im Team.
- **Regulatorik-Inhalte versioniert** mit Gültigkeitsdatum, damit alte
  Fahrpläne nachvollziehbar bleiben, wenn sich Fördersätze ändern.

---

## 13. Risiken – ehrlich benannt

| Risiko | Gegenmaßnahme |
|---|---|
| **Doppelerfassung** neben der Nachweissoftware → Team umgeht die App | Schnittstelle **vor** Baubeginn klären; Umfang notfalls kürzen |
| **Pflegeaufwand Förderdaten** wird unterschätzt (ändert sich mehrmals jährlich) | Feste Zuständigkeit im Team einplanen, Änderungen versioniert |
| **Haftung bei falschen Fristen/Fördersätzen** | Klarer Hinweis „ohne Gewähr, Stand vom …", verbindliche Aussage nur durch Beratung |
| **Team-Adoption** – die beste App nutzt nichts, wenn zwei Berater sie ignorieren | Stufe 1 muss Arbeit *abnehmen*, nicht zusätzliche Eingaben fordern |
| **Kundenportale werden nicht besucht** | Aktive Auslöser (Förder-Wächter, Fristen) statt passivem Login-Angebot |

Das größte Risiko ist Risiko 1 und 4 zusammen: eine App, die für das eigene Team
Mehrarbeit bedeutet. Deshalb beginnt Stufe 1 mit der Termin-Vorbereitung – dem
einzigen Feature, das dem Berater sofort Zeit schenkt, ohne dass er selbst etwas
Neues tun muss.

---

## 14. Umsetzbarkeit mit KI-Unterstützung und Weg in den App Store

Die nützliche Frage ist nicht *„was lässt sich mit KI bauen"* – fast alles hier –,
sondern **wo der Aufwand tatsächlich liegt.** Bei der Mehrzahl der Funktionen
liegt er nicht im Code.

### 14.1 Kategorie A – der Code ist die ganze Arbeit

Schnell, gut und mit hoher Qualität umsetzbar. Alles hier ist rechnerisch
abgeschlossen, braucht keine fremden Systeme und ist vollständig testbar:

- **Heizlast-Schnellcheck und Heizflächen-Check** – reine Formeln, keine externen
  Daten. Jede Rechnung lässt sich gegen eine Handrechnung prüfen. Idealer Start.
- **Wärmepumpen-Eignungsampel** – Regelwerk mit klaren Verzweigungen
- **Preisrechner und Netto-Ergebnis in einer Zahl** – trivial, hohe Wirkung
- **CO₂-Kostenaufteilung** – die zehn Stufen stehen fest im Gesetz. Kleine,
  abgeschlossene Rechnung mit großem Verkaufswert: **das beste
  Aufwand-Nutzen-Verhältnis im ganzen Katalog**
- **Zählerstandserfassung** inkl. Foto-Texterkennung – auf dem Gerät gelöst
- **Gebäudeakte, Portal, Fahrplan-Ansicht, Dokumentenablage** – viel Fläche, aber
  keine Unbekannten
- **Bauphysik-Warnsystem** und **Fristen-/Förder-Wächter** – Regel- und
  Terminlogik; die Regeln kommen aus eurem Fachwissen, das Bauen ist einfach

### 14.2 Kategorie B – Code einfach, Aufwand in Daten und Fachprüfung

- **Förderrechner/-optimierer:** Das Rechnen ist leicht. Das Regelwerk aktuell,
  versioniert und geprüft zu halten ist **dauerhafte Arbeit bei euch**. Ohne feste
  Zuständigkeit veraltet es und wird vom Feature zum Risiko.
- **GModG-Betroffenheitscheck:** dito, plus fachliche Freigabe jeder Aussage
- **Berichtsentwurf:** Textgenerierung ist stark; Layout und fachliche
  Endkontrolle bleiben Handarbeit
- **Projektgedächtnis:** Die Suche ist einfach – sie ist nur so gut wie die
  Digitalisierung eurer Altprojekte
- **Angebots-/Förderfallenprüfung:** Texterkennung und Extraktion funktionieren
  gut, aber jede Prüfregel muss fachlich definiert werden

### 14.3 Kategorie C – nicht der KI-Anteil ist das Problem

Machbar, aber aufwendig und mit Risiko. Bewusst später:

- **Offline-Sync der Feldaufnahme mit Konfliktauflösung** – der klassische
  Projektfriedhof. Echte Ingenieurarbeit, die Tests im realen Keller braucht.
- **Foto → Bauteil per KI** – braucht eigene Trainingsdaten. Ergibt sich aus
  Kategorie A von selbst, sobald genug eigene Fotos in der Akte liegen.
- **Export in die Nachweissoftware** – hängt an fremden Schnittstellen
- **Wärmeplanungs-Abgleich** – die Geodaten der Kommunen sind uneinheitlich
  verfügbar; der Aufwand ist Datenbeschaffung, nicht Programmierung
- **Klassensprung-Simulator** – braucht eine belastbare Bilanzierung, also
  entweder eine Anbindung oder eine klar gekennzeichnete Näherung
- **Messgeräte-Anbindung** – proprietäre Schnittstellen

### 14.4 Zur Optik

„Sieht gut aus" ist mit KI-Unterstützung heute der **einfachste** Teil – unter
einer Bedingung: **erst das Designsystem, dann die Screens.** Farben, Typografie,
Abstände und Komponenten (Karte, Kennzahl, Ampel, Diagramm) einmal festlegen,
dann sind vierzig Bildschirme konsistent statt vierzig Einzelentwürfe. In der
umgekehrten Reihenfolge entsteht ein Flickenteppich, und der lässt sich
nachträglich nur teuer reparieren. WERK.E hat eine Marke mit Wiedererkennung –
die gehört in die Gestaltungsgrundlagen, bevor der erste Screen entsteht.

### 14.5 App Store – was vorher feststehen muss

- **Guideline 4.2 (Minimum Functionality):** Eine in eine App verpackte Website
  wird abgelehnt. Die Aufteilung im Konzept ist deshalb ohnehin richtig:
  **Kundenportal als Web-App** (Eigentümer installieren nichts) und **Team-App
  nativ** mit Kamera, Offline und Push. Cross-Platform (React Native/Expo,
  Flutter) ist unproblematisch – entscheidend ist nicht die Technik, sondern dass
  es sich nativ anfühlt.
- **Interne App braucht vielleicht gar keinen öffentlichen Store.** Für ein
  reines Kollegenwerkzeug sind Apple Business Manager / Custom Apps oder
  TestFlight der bessere Weg: keine öffentliche Review, keine
  Marketing-Anforderungen, deutlich weniger Reibung. Der öffentliche Store lohnt
  erst, wenn Kunden die App wirklich installieren sollen.
- **EU-Händlerstatus nach DSA ist Pflicht.** Apple entfernt seit Februar 2025
  Apps ohne verifizierten Trader-Status automatisch aus allen 27
  EU-Storefronts. Firmenname, Anschrift, Telefon und E-Mail werden veröffentlicht.
  Für eine GmbH unproblematisch, muss aber vor der Einreichung erledigt sein.
- **Demo-Zugang für die Review**, wenn Inhalte hinter einem Login liegen – einer
  der häufigsten Ablehnungsgründe überhaupt.
- **Account-Löschung in der App**, sobald Nutzer Konten anlegen können.
- **Privacy Labels und DSGVO** – bei Gebäude- und Verbrauchsdaten ernst zu
  nehmen; AVV, Löschkonzept und EU-Hosting stehen in Kapitel 12.
- **Apple Developer Program:** jährliche Gebühr, Firmenkonto braucht eine
  D-U-N-S-Nummer. Das dauert gelegentlich Wochen und wird regelmäßig vergessen –
  früh beantragen.

### 14.6 Empfehlung für Version 1.0

Nicht mit der Gebäudeakte anfangen. Sie ist groß, unsichtbar und belohnt spät.
Stattdessen mit dem, was sofort im Termin wirkt – und vollständig aus Kategorie A
besteht:

1. Heizlast-Schnellcheck inklusive Heizflächen-Check
2. Wärmepumpen-Eignungsampel
3. Förder- und Preisergebnis in einer Zahl
4. CO₂-Kostenaufteilung für Vermieterobjekte
5. Ergebnis als PDF im WERK.E-Layout, direkt aus der App teilbar

Kein fremdes System, keine Regelwerkspflege außer den Fördersätzen, alles
testbar – und am Ende ein Werkzeug, das ein Kollege am Küchentisch aufklappt und
das sofort fachlich überzeugt. Die Gebäudeakte wächst darunter von allein, sobald
jede Berechnung gespeichert wird.

Mit KI-Unterstützung ist dieser Umfang in Wochen auf einen vorzeigbaren Stand zu
bringen. Was **nicht** schneller wird, sind zwei Dinge: die fachliche Prüfung der
Rechenergebnisse gegen eigene Handrechnungen – bei Heizlastzahlen
haftungsrelevant – und die organisatorischen Vorlaufzeiten (Entwicklerkonto,
D-U-N-S, Trader-Status). Beides sollte parallel zum Bauen starten.

---

## 15. Mindestumfang für Endkunden

### 15.1 Die Ausgangslage bestimmt die Auswahl

Ein Hauseigentümer öffnet eine Energieberatungs-App **nicht** wöchentlich. Ohne
Anlass vielleicht vier Mal im Jahr. Daraus folgt eine harte Regel:

> Jede Endkunden-Funktion muss entweder **in den ersten 60 Sekunden liefern**
> oder sich **von selbst melden**. Ein Portal, das auf einen Login wartet, ist tot.

Das schließt die Mehrzahl der naheliegenden Ideen aus – und macht die Auswahl
einfach.

### 15.2 Die fünf, die rein müssen

**1. Der „Nächster Schritt"-Bildschirm.**
Der Startbildschirm zeigt genau eine Sache: was jetzt ansteht, **wer am Zug ist**
(Sie / WERK.E / Handwerker / Förderstelle) und bis wann. Nicht eine Übersicht,
nicht ein Dashboard – ein Satz und ein Knopf.

Während einer Sanierung ist das dominierende Gefühl beim Kunden Unsicherheit:
*Wo stehe ich? Muss ich etwas tun? Habe ich eine Frist verpasst?* Wer diese Frage
zuverlässig beantwortet, hat die App gerechtfertigt – alles andere ist Beiwerk.

Nebeneffekt: Die **Termin-Vorbereitung** aus Kapitel 3.3 braucht kein eigenes
Feature. Sie ist einfach der nächste Schritt, wenn er gerade ansteht
(„Bitte Heizungstypenschild fotografieren – bis Donnerstag").

**2. Der Dokumententresor.**
Energieausweis, iSFP, BzA/TPB, Bewilligungsbescheid, Fachunternehmererklärungen,
Rechnungen, Fotos – an einem Ort, durchsuchbar, als Paket exportierbar.

Das ist der Grund, warum die App in acht Jahren noch installiert ist. Spätestens
beim **Hausverkauf** fragt der Käufer nach genau diesen Unterlagen, und niemand
findet sie. Wer sie dann in dreißig Sekunden exportiert, erzählt das weiter.

**3. Der Sanierungsfahrplan mit der einen Zahl.**
Maßnahmen als Karten – Kosten, Förderung, Einsparung, empfohlenes Jahr – mit
Status zum Abhaken. Darüber das Ergebnis, das den Kunden wirklich interessiert:
*Investition − Förderung + Honorar = das kostet mich unterm Strich.*

Für Version 1 reicht die **Ansicht**. Die Was-wäre-wenn-Schieber aus Kapitel 3.1
sind großartig, aber teuer – die kommen später.

**4. Der Wächter, der sich von selbst meldet.**
Fördersätze, die sich verschlechtern; ablaufende Energieausweise; Umsetzungs-
und Nachweisfristen. **Ohne diesen aktiven Teil wird jede Endkunden-App tot** –
weil niemand ohne Anlass hineinschaut.

**5. Zählerstand in dreißig Sekunden.**
Foto vom Zähler, Wert erkannt, fertig. Zwei Gründe: Wegen der 24-Monats-Regel des
GModG braucht ihr die Daten (Kapitel 6.2) – und es ist der **einzige Anlass, der
regelmäßig in die App führt**. Ein monatlicher Kontaktpunkt von dreißig Sekunden
hält die Beziehung am Leben, ohne zu nerven.

### 15.3 Die sechste, wenn Budget bleibt

**Ein Rückfragen-Kanal am Objekt.** Fragen, Fotos und Antworten hängen am
Gebäude statt in einem E-Mail-Verlauf, den beide Seiten durchsuchen müssen.
Spart eurem Team messbar Zeit und erspart dem Kunden das Gefühl, hinterhertelefo-
nieren zu müssen.

### 15.4 Was bewusst draußen bleibt

- **Heizlast-Rechner für Endkunden.** Gehört ins Beratungsgespräch. Allein
  abgegeben erzeugt er falsche Erwartungen und Diskussionen über Zahlen, die ohne
  ihre Annahmen nichts bedeuten.
- **Simulationsschieber** in Version 1 – schön, aber aufwendig, und der Fahrplan
  wirkt auch ohne.
- **Chatbot** – siehe Kapitel 6.2.
- **Login-Zwang vor dem Selbst-Check.** Der öffentliche Rechner muss ohne Konto
  funktionieren, sonst ist er als Lead-Magnet wertlos.

### 15.5 Die Kanalfrage entscheidet über die Technik

Punkt 4 und 5 hängen an Benachrichtigungen – und da gibt es eine harte Grenze:
**Auf iOS funktioniert Web-Push nur, wenn der Nutzer die Seite zuvor auf den
Home-Bildschirm gelegt hat.** In einem normalen Safari-Tab kommt keine
Benachrichtigung an, auch bei erteilter Erlaubnis. Der Anteil, der diesen Schritt
geht, ist klein.

Daraus folgt pragmatisch:

- **E-Mail ist der verlässliche Kanal** für Wächter und Erinnerungen. Nicht
  modern, aber es kommt an – und für vier bis zwölf Nachrichten im Jahr völlig
  ausreichend.
- **Web-Portal ohne Installation** für alles andere. Kein Store, keine Hürde.
- Eine **native App für Endkunden** lohnt erst, wenn die monatliche
  Zählerstandserfassung wirklich laufen soll. Dann ist sie gerechtfertigt – vorher
  nicht.

---

## 16. Die öffentliche Rechner-Ebene

### 16.1 Präzisierung zu Kapitel 15.4

Der Ausschluss des Heizlast-Rechners dort galt dem **Kundenportal** – als
Selbstbedienung für jemanden, der bereits in Beratung ist. Dort stiftet er
Verwirrung, weil er neben der echten Berechnung steht.

**Öffentlich, vor der Beratung, ist er etwas völlig anderes:** einer der
stärksten Lead-Magnete, die dieser Markt hergibt. Das Konzept braucht deshalb
nicht zwei Ebenen, sondern drei:

| Ebene | Wer | Login | Zweck |
|---|---|---|---|
| **Öffentlich** | Interessent | nein | Eine Frage beantworten – der Kontakt entsteht als Nebenprodukt |
| **Portal** | Kunde | ja | Orientierung im laufenden Projekt |
| **Team** | Berater | ja | Erfassung und Fachtiefe |

Alle drei rechnen mit **demselben Kern**, nur in unterschiedlicher Tiefe. Das ist
auch technisch der richtige Schnitt: Formeln einmal bauen, drei Detailgrade
ausspielen. Damit kann das öffentliche Ergebnis dem Beraterergebnis nie
widersprechen – ein Peinlichkeitsfall, den man sonst garantiert erlebt.

### 16.2 Heizlast-Schnellrechner, öffentlich

*„Wie viel kW Wärmepumpe brauche ich?"* ist eine der meistgestellten Fragen im
Sanierungsmarkt. Wer sie gut beantwortet, wird gefunden.

Die beiden Eingabewege stehen schon in Kapitel 7 (Verbrauch oder wenige Fragen).
Entscheidend ist nicht die Rechnung, sondern **die Ausgabe**:

- Spanne, nie Punktwert
- Annahmen offen sichtbar: Vollbenutzungsstunden, Nutzungsgrad, Warmwasseranteil
- und dann der Satz, der konvertiert:

> „Die Heizlast liegt bei X–Y kW. Über Ihre Wärmepumpe entscheidet aber eine
> andere Frage: ob Ihre vorhandenen Heizkörper diese Last bei 55 °C statt 70 °C
> abgeben. Das kann kein Online-Rechner beantworten – das sehen wir vor Ort."

Das ist keine Verkaufsmasche, sondern fachlich schlicht wahr. Genau deshalb wirkt
es.

**Ehrlich zum Risiko:** Manche nehmen die Zahl und gehen damit zum
Heizungsbauer. Das passiert ohnehin – heute nur mit einer schlechteren Zahl aus
einer beliebigen Quelle.

### 16.3 Fördermittelrechner – nicht neu bauen, sondern anschließen

Ihr habt ihn bereits, er funktioniert, er hat Besucher. Ein zweiter wäre
Verschwendung. Zwei Ergänzungen machen den Unterschied:

1. **Netto-Ergebnis** statt reinem Förderbetrag (Kapitel 6.3)
2. **„Ergebnis sichern"** – aus dem Rechenstand wird ein Objekt mit Konto

Punkt 2 ist die fehlende Brücke im ganzen Funnel. Heute endet der Rechner im
Nichts: Der Interessent sieht eine Zahl, schließt den Tab, und ihr erfahrt nie
davon. Er sollte stattdessen in einem gespeicherten Gebäude enden – ab da kann
der Förder-Wächter arbeiten, **noch bevor jemand Kunde ist**.

> Der Förderrechner ist nicht das Ende des Funnels. Er ist der Anfang der
> Gebäudeakte.

### 16.4 GModG-Anforderungsvergleich – ja, aber in der richtigen Bauform

Hier liegt der Unterschied, der alles entscheidet:

- **Regeln anwenden** – deterministisch, prüfbar, verantwortbar → bauen
- **Recht auslegen** – freier Chatbot → nicht bauen

Gleiches Gesetz, völlig unterschiedliches Risiko. Mein Vorbehalt aus Kapitel 6.2
galt dem zweiten, nicht dem ersten.

Der Anforderungsvergleich ist ein **Soll-Ist**: Was verlangt das Regelwerk von
diesem Gebäude, wo steht es heute, was fehlt? Prüfbare Punkte:

- **Nachrüstpflichten** (oberste Geschossdecke, Rohrleitungsdämmung) – bleiben
  nach aktuellem Stand bestehen
- **Bedingte Anforderungen bei Bauteiländerung** samt Bagatellgrenze: Sie greifen
  erst, wenn mehr als **10 %** der jeweiligen Bauteilgruppe betroffen sind. Hoch
  praxisrelevant und bei Eigentümern praktisch unbekannt.
- **Nichtwohngebäude Klasse G** → Renovierungspflicht ab 01.01.2030
- **Verbrauchsausweis** → 24 Monate lückenlose Monatswerte
- **Vorlage- und Übergabepflichten** samt Bußgeldrahmen

**Und der Punkt, der gerade jetzt am meisten wert ist:** Nach dem beschlossenen
Entwurf entfallen die 65-%-Erneuerbaren-Pflicht für neue Heizungen und das
30-Jahre-Betriebsverbot für Konstanttemperaturkessel. Ein großer Teil der
Eigentümer glaubt weiterhin an Regeln, die gerade wegfallen – und trifft auf
dieser Grundlage fünfstellige Investitionsentscheidungen. Ein Werkzeug, das
sauber zwischen **gilt / entfällt / kommt neu** trennt, hat in diesem Jahr einen
Wert, den es in zwei Jahren nicht mehr hat.

**Bauform:** kein Freitext. Gebäudedaten hinein, Liste heraus – jede Zeile mit
Ampel, Fundstelle, Stand-Datum und dem Vermerk „Entwurfsstand", solange das
Gesetz nicht in Kraft ist. Sobald es gilt, wird derselbe Vergleich zum
Standardeinstieg jeder Beratung, intern wie öffentlich.

### 16.5 Was alle drei brauchen

- Spanne statt Punktwert
- Annahmen sichtbar, nicht im Kleingedruckten
- Stand-Datum und Regelversion an **jedem** Ergebnis
- „Ergebnis sichern" als einziger Konversionsschritt – kein Formular vorab, kein
  Zwang
- Und die harte Bedingung: Dasselbe Ergebnis muss beim Berater exakt so wieder
  auftauchen

### 16.6 Reihenfolge

1. **Fördermittelrechner erweitern** um Netto-Ergebnis und „Ergebnis sichern" –
   kleinster Aufwand, wirkt sofort, weil der Rechner bereits Besucher hat
2. **Heizlast-Schnellrechner öffentlich** – neuer Kanal, hohes Suchinteresse,
   rein rechnerisch und damit Kategorie A
3. **GModG-Vergleich** – zuerst intern fürs Team, öffentlich mit Inkrafttreten

---

## 17. Leitbild: die App als Begleiter durch die Sanierung

### 17.1 Das bessere Leitbild

> „Ich will mein Haus sanieren, lade die App herunter – und sie führt mich
> hindurch. Ein kleines Schweizer Taschenmesser."

Das ist ein stärkeres Leitbild als alles bisher Beschriebene, weil es aus
Kundensicht formuliert ist statt aus Firmensicht. Es ordnet den ganzen Katalog
neu: Die Frage ist nicht mehr *„welche Funktionen bieten wir an"*, sondern
*„welche Frage steht beim Kunden gerade an"*.

Es korrigiert auch eine frühere Empfehlung. In Kapitel 15.5 stand, eine native
Endkunden-App lohne sich vorerst nicht. Das gilt für ein **Portal**, das man
einmal im Quartal aufruft. Für einen **Begleiter über achtzehn Monate** – mit
Kamera, Erinnerungen, Offline-Notizen auf der Baustelle – gilt es nicht. Wenn der
Download der Einstieg ist, ist die native App richtig.

### 17.2 Der Griff des Taschenmessers: die Sanierungsreise

Ein Taschenmesser ohne Griff ist eine Handvoll loser Klingen. Der Griff ist die
**Reise mit Phasen**. Die Werkzeuge hängen an der Phase, in der jemand gerade
steckt – nicht an einem Werkzeugkasten-Bildschirm mit fünfzehn Symbolen.

| Phase | Die Frage des Kunden | Werkzeuge, die dann sichtbar sind | Wo WERK.E dazukommt |
|---|---|---|---|
| **1 Orientierung** | Lohnt sich das überhaupt? | Selbst-Check, Heizlast-Schnellrechner, Förderrechner, GModG-Betroffenheit | noch niemand |
| **2 Planen** | In welcher Reihenfolge, mit welchem Budget? | Fahrplan, Förder-Optimierer, Bauphysik-Warnungen | iSFP (gefördert) |
| **3 Fördern** | Wie komme ich an das Geld, ohne es zu verlieren? | Antragsstrecke, „Antrag vor Auftrag"-Warnung, Fristen | Energieeffizienz-Experte ist Pflicht |
| **4 Beauftragen** | Wem gebe ich den Auftrag, ist das Angebot in Ordnung? | Angebotsprüfung, Vergleich, Handwerkernetz | fachliche Einordnung |
| **5 Bauen** | Läuft es richtig? | Fotodokumentation, Mängelliste, Rechnungen sammeln | Baubegleitung |
| **6 Nachweisen** | Wie wird die Förderung ausgezahlt? | Verwendungsnachweis, Unterlagen-Checkliste | Bestätigung nach Durchführung |
| **7 Danach** | Hat es gewirkt, was kommt als Nächstes? | Zählerstände, Soll-Ist, nächste Maßnahme | nächste Stufe des Fahrplans |

Der wichtigste Befund dieser Tabelle: **Die App kann gar nicht bis zum Ende
führen, ohne dass eine Fachperson dazukommt.** Die BEG-Förderung verlangt in
weiten Teilen einen Energieeffizienz-Experten. Das ist kein Konstruktionsfehler
des Leitbilds – das **ist** das Geschäftsmodell. Die App führt ehrlich bis zu dem
Punkt, an dem es fachlich nicht mehr allein geht. Und dort steht ihr.

### 17.3 „Klein" ist die schwerste Anforderung

Das Risiko dieses Leitbilds ist exakt sein Gegenteil: ein Taschenmesser mit
dreißig Klingen, das niemand mehr aufbekommt. Die Gegendisziplin ist leicht zu
formulieren und schwer zu halten:

- **Pro Phase höchstens drei sichtbare Werkzeuge.** Der Rest bleibt verborgen,
  bis er an der Reihe ist.
- **Immer genau eine nächste Aufgabe** auf dem Startbildschirm (Kapitel 15.2).
- **Kein leerer Zustand.** Adresse, Baujahr, Wohnfläche, Heizung – und sofort ein
  erstes Bild: geschätzte Effizienzklasse, Förderpotenzial, Betroffenheit. Wer
  erst zwanzig Felder ausfüllen muss, bevor etwas passiert, ist weg.
- **Kein Konto vor dem ersten Nutzen.** Registrierung erst bei „Ergebnis sichern".

Die Funktionen aus den Kapiteln 3 bis 8 ändern sich dadurch nicht. Es ändert sich
nur, **wann** sie auftauchen.

### 17.4 Die drei Momente, in denen sich die App beweist

Wenn nur drei Dinge zuverlässig funktionieren, dann diese:

1. **Antrag vor Auftrag.** Unmissverständlich warnen, bevor jemand unterschreibt.
   Wer das einmal verhindert hat, hat einen Kunden fürs Leben.
2. **Die richtige Reihenfolge.** Heizung vor Dämmung ist die teuerste
   Fehlentscheidung im Bestand – die App muss es sagen, bevor es passiert.
3. **Keine verpasste Frist.** Bewilligung, Umsetzungszeitraum, Nachweis.

Alle drei sind **Warnungen, keine Rechner**. Das Versprechen „führt mich hindurch"
wird nicht durch Funktionsumfang eingelöst, sondern durch rechtzeitige Zurufe.

### 17.5 Zwei offene Punkte, die über die Wirtschaftlichkeit entscheiden

**Reichweite gegen Region.** Eine Download-App ist bundesweit, WERK.E berät in
PB, HX, GT und LIP. Der größte Teil der Nutzer wird also nie Kunde. Zwei saubere
Antworten:

- *Regional zuschneiden:* Die App funktioniert überall, aber die Übergabe an die
  Beratung ist regional. Nutzer außerhalb kosten wenig und liefern trotzdem
  Referenzdaten und Sichtbarkeit.
- *Später ein Partnernetz* von Energieberatern in anderen Regionen – dann ist die
  App ein eigenes Produkt und nicht mehr nur euer Marketing.

Empfehlung: mit dem Ersten anfangen, das Zweite offenhalten – aber die
Architektur **von Anfang an mandantenfähig** bauen. Nachträglich ist das teuer.

**Erlösmodell und Apple.** Zwei Regeln, die den Aufbau bestimmen:

- Der Verkauf **eurer Beratungsleistung** über die App ist vom In-App-Kauf
  ausgenommen – reale Leistungen außerhalb der App dürfen über normale
  Zahlungswege laufen. Beratung, iSFP und Baubegleitung sind also unproblematisch.
- Ein **digitales Abo** (Monitoring, Fristen-Wächter) wäre dagegen ein
  In-App-Kauf, mit Apples Anteil und zusätzlichen Auflagen.

Praktische Folge: Die App bleibt kostenlos und verdient über die Leistungen; der
Wächter ist Teil der Kundenbeziehung statt ein verkauftes Digitalprodukt. Das ist
auch inhaltlich der bessere Weg – ein kostenpflichtiger Fristenwächter ist schwer
zu verkaufen, ein kostenloser bindet.

### 17.6 Was das für Version 1.0 heißt

Kapitel 14.6 empfahl das Beraterwerkzeug zuerst. Das Leitbild verschiebt die
Gewichtung, hebt die Empfehlung aber nicht auf – der Rechenkern ist derselbe:

1. **Zuerst Phase 1 vollständig**, öffentlich und ohne Konto: Selbst-Check,
   Heizlast, Förderrechner mit Netto-Ergebnis, GModG-Betroffenheit, „Ergebnis
   sichern".
2. **Dann der Reise-Rahmen** mit Phasen und Nächster-Schritt-Bildschirm. Ab da
   fühlt es sich wie ein Begleiter an, auch wenn die späteren Phasen noch dünn
   sind.
3. **Dann die drei Warnungen** aus 17.4 – billig zu bauen, und sie tragen das
   Versprechen.
4. Die Beraterseite läuft parallel auf demselben Rechenkern.

Eine App, die Phase 1 und 2 wirklich gut macht und bei Phase 3 ehrlich sagt
*„ab hier brauchst du einen Energieeffizienz-Experten – hier sind wir"*, ist
vollständig genug für den Store und schon ein Werkzeug, das weiterempfohlen wird.
Vollständigkeit über alle sieben Phasen ist ein Ziel für Jahre, kein
Startkriterium.

---

## 18. Nächste Schritte

1. **Zwei Zahlen messen** (eine Woche, ohne Software): Wie viele Stunden gehen
   pro Projekt für Datenbeschaffung und Berichtserstellung drauf? Wie viele der
   letzten 50 iSFP-Kunden haben danach eine Maßnahme über WERK.E umgesetzt?
   Diese zwei Zahlen begründen die gesamte Investition – oder widerlegen sie.
2. **Schnittstelle der vorhandenen Nachweissoftware prüfen.** Entscheidet über
   den Zuschnitt von Modul B.
3. **Bestandskunden auf GModG-Betroffenheit screenen** – vor allem
   Nichtwohngebäude (Klasse-G-Risiko, Frist 2030) und Verwaltungsobjekte. Das geht
   heute schon manuell und ist der schnellste Umsatz aus diesem Konzept, ganz ohne
   Software.
4. **Fünf Bestandskunden fragen**, was sie nach der Beratung vermisst haben.
5. Erst dann: Stufe 1 bauen, mit fünf Pilotkunden und dem eigenen Team.

---

## Quellen

- WERK.E Leistungen und Team: https://werk-e.de/ · https://werk-e.de/ueber-uns/ · https://werk-e.de/wirtschaft/hausverwaltungen-und-immobilienverwaltungen/
- iSFP-Förderung und Änderungen 2026: https://erneuerbare-energien-aktuell.de/allgemein/energetisch-sanieren/isfp-foerderung-kosten/ · https://www.mvn.energy/post/bafa-foerderung-isfp-2026-aenderungen
- Absenkung Einzelmaßnahmen-Förderung: https://reduco.ai/blog/foerderung/sanierung-einzelmassnahmen-21-juli-2026-aenderungen
- Energieaudit DIN EN 16247 / EnEfG: https://www.c-ober.de/blog/edl-g-enefg-novelle-2026-energieaudit-pflicht/ · https://www.tuvsud.com/de-de/branchen/real-estate/immobilien/energie-und-nachhaltigkeit-bei-immobilien/energieaudit-nach-din-en-16247
- Bestehende WERK.E-Rechner: https://werk-e.de/beg-foerderrechner-2026/ · https://werk-e.de/preisstruktur-beg-antragstellung-transparent-erklaert/ · https://werk-e.de/neue-foerderbedingungen-2026-was-jetzt-bei-kfw-und-bafa-gilt/
- GModG (Referentenentwurf 05.05.2026, Kabinett 13.05.2026): https://www.roedl.com/insights/neues-gebaeudemodernisierungsgesetz-gmodg-systemwechsel-gegenueber-gebaeudeenergiegesetz/ · https://www.energieausweise.de/info/neu2026/neuerungen/ · https://table.media/assets/climate/260505_refe-gmodg.pdf
- EPBD / GEG-Umsetzung: https://www.bbsr-geg.bund.de/GEGPortal/DE/ErgaenzendeRegelungen/EPBD/epbd_node.html · https://www.haufe.de/immobilien/wirtschaft-politik/green-deal-eu-liefert-investitionsplan-fuer-gebaeudesektor_84342_507868.html
- Heizlast aus Verbrauch / Vollbenutzungsstunden: https://greenox-group.de/waermepumpe-dimensionieren-gasverbrauch/ · https://www.ikz.de/detail/news/detail/auslegung-einer-waermepumpe/
- Lüftungskonzept DIN 1946-6 (Drittel-Regel): https://immobilien-fachwissen.de/din-1946-6-lueftungskonzept-fenstertausch/ · https://www.energie-experten.org/haustechnik/wohnraumlueftung/kontrollierte-wohnraumlueftung/din-1946-6
- CO2KostAufG Stufenmodell: https://www.ista.com/de/gesetze-und-verordnungen/kohlendioxidkostenaufteilungsgesetz-co2kostaufg/ · https://verbraucherzentrale-energieberatung.de/co2-aufteilung-mieter-vermieter/
- Kommunale Wärmeplanung / WPG: https://www.energiewechsel.de/KAENEF/Redaktion/DE/FAQ/Waermeplanung/faq-waermeplanung-wpg.html
- Bedingte Anforderungen / Bagatellgrenze 10 %, Nachrüstpflichten: https://www.bbsr-geg.bund.de/GEGPortal/DE/GEGRegelungen/Gebaeudebestand/Nachruestungspflichten/Nachruestungspflichten-node.html · https://www.gesetze-im-internet.de/geg/__47.html
- GModG: Wegfall 65-%-Regel und 30-Jahre-Betriebsverbot (Entwurfsstand): https://www.grantthornton.de/themen/2026/gebaeudemodernisierungsgesetz-beschlossen-die-wichtigsten-aenderungen-im-neuen-heizungsgesetz-gmodg/
- Web-Push auf iOS nur für Home-Screen-Web-Apps: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- App Store Guideline 4.2 / Webview-Ablehnungen: https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper
- EU-Händlerstatus (DSA) im App Store: https://developer.apple.com/news/upcoming-requirements/?id=02172025a
- Marktübersicht Energieberater-Software: https://reduco.ai/blog/energieberater-software-vergleich · https://www.streit-software.de/wissen/energieberater-software

*Alle Rechts- und Förderangaben: Stand August 2026, vor Verwendung prüfen.*
