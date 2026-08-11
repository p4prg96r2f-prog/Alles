# WERK.E App – Produktkonzept

**Ziel:** Eine App, die für WERK.E gleichzeitig Aufträge bringt, die Beratung
schneller macht und aus Einmal-Beratungen wiederkehrende Umsätze macht.

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

## 7. Wiederkehrende Umsätze

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

## 8. Was WERK.E danach hat, was sonst keiner hat

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

## 9. Ausbaustufen

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

## 10. Technische Leitplanken

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

## 11. Risiken – ehrlich benannt

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

## 12. Nächste Schritte

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
- Marktübersicht Energieberater-Software: https://reduco.ai/blog/energieberater-software-vergleich · https://www.streit-software.de/wissen/energieberater-software

*Alle Rechts- und Förderangaben: Stand August 2026, vor Verwendung prüfen.*
