# WERK.E Heizlast — raumweise nach DIN EN 12831-1

Werkzeug für das Team. Eine Datei, Doppelklick, kein Login, kein Serverbetrieb.
Rechnet die Norm-Heizlast raumweise nach **DIN EN 12831-1:2017-09** in Verbindung
mit **DIN/TS 12831-1:2020-04** und erzeugt einen prüffähigen Bericht.

## So kommen die Kollegen dran

**https://werke-heizlast.netlify.app**

Link öffnen, fertig. Kein Login, keine Installation, immer die aktuelle Fassung.
Projekte bleiben dabei auf dem eigenen Rechner: gerechnet wird im Browser,
gespeichert wird als Datei über „Speichern". Nur der Schritt „Plan mit KI
auslesen" spricht mit dem Endpunkt, der unter derselben Adresse liegt.

Beim ersten Klick auf die Planauslese fragt das Werkzeug einmalig nach dem
Zugangscode. Danach merkt der Browser ihn. Der Code steht bewusst **nicht** in
der Seite: sie ist über das Netz erreichbar, ein eingebetteter Code wäre im
Quelltext ablesbar und damit wirkungslos.

Die Seite ist für Suchmaschinen gesperrt (robots.txt und X-Robots-Tag).

| Datei | Zweck |
|---|---|
| `WERKE_Heizlast_Tool.html` | dieselbe Fassung als Einzeldatei, für den Einsatz ohne Netz |
| `api/WERKE_Heizlast_Web.zip` | fertiges Deploy-Paket: Werkzeug und Endpunkt zusammen |
| `api/` | Quellen des Endpunkts |

**Neue Fassung veröffentlichen:** `python3 build.py`, dann das Zip aus `api/`
neu schnüren und auf `app.netlify.com/projects/werke-heizlast/deploys`
am Ende der Seite ablegen. Die Umgebungsvariablen bleiben dabei erhalten.

Nach jeder Änderung an `src/` neu bauen: `python3 build.py`. Der Build bricht ab,
wenn ein Selbsttest oder die Validierung fehlschlägt.

## Ablauf im Werkzeug

1. **Pläne auswerten** — Plan als Bild ablegen (Drag and Drop, Cmd+V nach einem
   Bildschirmfoto oder Dateiauswahl). Trägt eine Vektorzeichnung angeschriebene
   Raumflächen, erscheint sofort die Karte *Im Plan angeschriebene Raumflächen*
   mit einem Knopf, der sie ins Raumbuch übernimmt — ohne Netz, ohne
   Modellaufruf, ohne Maßstab (siehe *Flächen aus dem Plan lesen*).
   Wahlweise mit KI auslesen lassen: das liefert
   Räume, aus dem Plan abgeleitete Befunde mit Herleitung und eine Liste dessen, was
   im Plan fehlt. Danach Maßstab an einer bekannten Maßkette setzen und die Räume
   umfahren; daraus kommen Fläche und Umfang exakt. Mit „Für den Bericht sichern"
   wandert die Zeichnung samt Eintragungen ins Projekt und erscheint als Abbildung
   im Bericht.
2. **Objekt und Klima** — Norm-Außentemperatur PLZ-genau mit Quellenangabe. Aus dem
   Baujahr schlägt das Werkzeug die Typologie-Startwerte für alle Bauteile vor.
3. **Bauteile** — je Bauteil einmal den U-Wert festlegen, entweder aus dem
   Schichtaufbau nach DIN EN ISO 6946 oder direkt. Im Raumbuch werden dann nur noch
   Flächen zugewiesen.
4. **Unbeheizte Bereiche** — Keller, Spitzboden, Garage. Die Temperatur kommt aus
   einer stationären Wärmebilanz, der Zufluss aus den beheizten Räumen wird
   automatisch berücksichtigt.
5. **Raumbuch** — Räume mit Fläche, Höhe, Nutzungseinheit und Bauteilen.
6. **Selbstprüfung** — Ampel mit allen Befunden, siehe unten.
7. **Ergebnis und Bericht** — Bericht mit Briefkopf des gewählten Standorts, als PDF
   über den Druckdialog oder als Word-Datei.

## Der Bericht

Kapitel 1 sind die **Planunterlagen**: die ausgewerteten Zeichnungen als Abbildung,
beschriftet mit den Maßen und Flächen, die in die Rechnung eingegangen sind. Die
Eintragungen aus der Auswertung stehen in Grün, alles Übrige ist Originalbestand der
Zeichnung. Darunter steht, was den Unterlagen zu entnehmen ist, was sich aus ihnen
ableiten lässt (jeweils mit Herleitung) und was in ihnen fehlt und deshalb ergänzt
wurde. Das folgt dem Aufbau des Berichts zur Mälzerstraße.

Danach: Berechnungsgrundlagen mit Formeln und Randbedingungen, raumweise Ergebnisse,
Bauteilbilanz, Heizlast je Einheit, Annahmenliste, Selbstprüfung, Verwendbarkeit.
Die Kapitel zählen fortlaufend; entfällt eines, entsteht keine Lücke.

## Stand 21.08.2026

**Was funktioniert**

- PDF und Bilder hochladen, mehrere auf einmal. Das Werkzeug erkennt je Seite die
  Art (Vektorzeichnung, Scan, Textseite), das Blattformat und bei Vektorzeichnungen
  den Maßstab auf zwei unabhängigen Wegen. An echten CAD-Plänen geprüft, über
  180 Seiten, ohne Fehlmeldung.
- Bericht auf dem Stand des Referenzberichts: 9 Kapitel und eine Anlage, Zahlen
  Zeile für Zeile abgeglichen. Die verbleibende Abweichung von 0,085 Prozent
  stammt aus der Zonenbilanz und ist in `validierung/vergleich.js` nachgewiesen.
- Prüfblatt (Schritt 3, `src/modul_pruefblatt.js`): der Grundriss mit farbigen
  Marken an jeder Stelle, an der ein Raum erkannt wurde, daneben dieselben
  Zeilen wie im Kontrollblatt. Eine Marke anklicken öffnet ihre Zeile. Die Lage
  kommt aus dem Textstand des Dokuments (Flächenstempel, Raumbeschriftung), ist
  also zeichengenau — aber sie ist der Ort der BESCHRIFTUNG und kein Raumumriss,
  deshalb ein Punkt und keine Fläche. Gemessen am 23.08.2026: „14_BA 04_OG.pdf"
  14 von 14 Räumen mit Marke, „Werkvertragsverzeichnung BV 2-0887 Ziolkowski"
  (reiner Scan, kein Textstand) 0 von 13 — und genau das sagt die Kopfzeile dann
  auch. Siehe `src/kerne/kern_lage.js`.
- Kontrollblatt mit Zählern, die nicht nur zeigen was da ist, sondern melden was
  fehlen könnte.
- 447 Selbsttests, die bei jedem Bau laufen. Der Bau bricht bei einem Fehlschlag ab.

- Angeschriebene Raumflächen werden beim Ablegen aus dem Textstand gelesen und
  mit einem Knopf ins Raumbuch übernommen, mit Namen und Geschoss. Am A1-Bogen
  Dumach 1: 25 Räume über drei Geschosse, Abweichung 0,00 m². Siehe *Flächen aus
  dem Plan lesen*.

**Was noch nicht automatisch geht**

Der Weg vom Plan zum Raumbuch ist bei Flächen und Namen durchgängig, sobald die
Zeichnung sie anschreibt. Was fehlt:

- Bei Rasterplänen und Vektorzeichnungen ohne Textstand entsteht keine Fläche.
  Dort bleibt Umfahren oder Eintragen. Warum daran nichts zu machen ist, steht
  unten unter „Grenzen".
- Räume ohne angeschriebene Fläche auf einem sonst beschrifteten Blatt
  (auf dem Blatt Maas etwa Ankleide, Stauraum, WS) kommen nicht mit.

## Was ein Klick nicht mehr wegnimmt (23.08.2026)

Echter Durchlauf mit „Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf" gegen
den laufenden Endpunkt, Datei abgelegt, nichts eingetippt:
**6,54 kW · 34,8 W/m² auf 188,04 m² · 0 Fehler · 5 Warnungen · 2 Hinweise.**
Sieben Punkte aus der Abnahme sind damit erledigt.

**Ein Widerspruch ist nicht wegzuklicken.** „Beheizt oder unbeheizt:
KELLERGESCHOSS" ließ sich mit einem Häkchen entfernen, und die Ampel sprang
dabei von Gelb auf „belastbar unter genannten Annahmen" — während die Fläche im
Nenner blieb und die Kellerdecke weiter fehlte. Die Regel steht jetzt in
`zeile()` in `src/modul_kontrollblatt.js` und hängt an der FORM der Zeile, nicht
an einer Liste von Kennungen: nennt eine Zeile eine eigene Zahl, eine zweite aus
benannter Quelle, und gehen die beiden auseinander, verlangt sie den
geschriebenen Vermerk. Der Sammelknopf lässt sie aus, das Häkchen entfällt, und
`zurKenntnis()` liest die Pflicht an der Zeile — keine aufrufende Stelle kann
sie mehr umgehen. Die Kellerzeile bietet stattdessen zwei Wege an: „beheizt —
mit Fundstelle vermerken" oder „unbeheizt — Bereich anlegen".
Gemessen: Sammelknopf über 6 Zeilen, die Kellerzeile bleibt offen, Ampel bleibt
Gelb.

**Eine echte Fensterprüfung.** „Ansichten gegen die Gesamtzahl" verglich die
eine ausgewertete Ansicht mit dem ganzen Gebäude — eine untere Schranke, die
grün als bestandene Gegenprobe zählte. Aus neun Fenstern ließen sich fünf
löschen, ohne dass sie ansprang. Sie steht jetzt als Grenze im Bericht und sagt
selbst, dass sie widerlegen, aber nicht bestätigen kann. Geprüft wird
stattdessen jeder Raum einzeln: ein Aufenthaltsraum mit Außenwand und ohne
Fenster ist ein Fehler (Fensterpflicht, Musterbauordnung § 47 Abs. 2).
Gemessen: EIN entferntes Fenster von neun macht die Ampel rot, obwohl die
Heizlast nur von 6,54 auf 6,45 kW fällt.

**Der Kopf nennt das Objekt.** Der Bericht war mit „Paderborn · Projektnummer
300" überschrieben: Blatt 2 ist der Bebauungsplan der Stadt Paderborn, und
seine Bezeichnung und seine Nummer waren in die Objektangaben gewandert. Ein
Bebauungsplan benennt ein Plangebiet, kein Bauvorhaben; er wird jetzt verworfen
und die Verwerfung vermerkt. Fehlt danach eine Bezeichnung, kommt sie aus dem
Dateinamen des Blattes mit den Grundrissen, mit Herkunftsangabe. Auf dem
Deckblatt steht die Bezeichnung immer, die Anschrift darunter, und was fehlt,
wird benannt statt weggelassen. Gemessen: „Werkvertragsverzeichnung BV 2-0887
Ziolkowski", Projektnummer „BV 2-0887", Bauherr „Ziolkowski".

**Keine Bauempfehlung aus einem angenommenen U-Wert.** Kapitel 8 riet bei einem
auf 2022 datierten Neubau fünfmal, die Dämmstärke zu erhöhen. Keiner der sechs
verglichenen U-Werte war belegt; alle stammten aus der Gebäudetypologie.
Verglichen wurde damit eine Tabelle mit einer Anforderung. Die Zeile entsteht
nur noch bei belegtem U-Wert; sonst steht dort der Punkt, der wirklich offen
ist: den Aufbau am Gebäude belegen.

**Kein alert(), kein confirm(), kein prompt().** Alle drei halten den ganzen
Tab an. Beim automatisierten Nachstellen des Klicks auf „Bericht" blieb der
Reiter so fest stehen, dass er nur noch zu schließen war. `src/modul_dialog.js`
ersetzt sie: Meldungen stehen in der Seite und bleiben stehen, Rückfragen sind
echte Dialoge mit Tabulatorfang und Esc, und über dem Berichtsaufbau läuft
„Der Bericht wird aufgebaut …". Gemessen: die Anzeige erscheint 1 ms nach dem
Klick; während der Rückfrage antwortet die Seite weiter.

**Eine Begründung, die dem eigenen Datenstand widerspricht.** Neben der
Norm-Außentemperatur stand „Auf dem Plan steht weder Postleitzahl noch Ort",
während `meta.ort` = „Paderborn" im Projekt stand, gelesen von Blatt 2. Die
Zahl stimmte zufällig, weil das Büro in Paderborn sitzt. Eine Annahme, die auf
dem Standort beruht, wird jetzt neu gebildet, sobald ein Ort aus dem Plan
vorliegt, und der Satz nennt den gelesenen Ort auch dann, wenn er sich in der
Klimatabelle nicht findet.

**Zwei Fälle, die sich nicht erzwingen ließen.** Eine automatisch angelegte
Zone kam bei jedem Rechnen wieder; damit war „unbeheizter Bereich fehlt" nicht
vorführbar. Gelöschte Bereiche bleiben jetzt gelöscht (`p.zonen_entfernt`), und
wer sie von Hand wieder anlegt, nimmt die Löschung zurück. Und ein Bereich auf
Raumtemperatur ist jetzt ein Fehler: `pruefeZonenTemperatur` in
`src/kerne/kern_pruefung.js` vergleicht die Zonentemperatur mit dem kältesten
angrenzenden beheizten Raum — darüber trägt die trennende Decke null Watt.
Gemessen: Zone löschen → rot mit „Unbeheizter Bereich SPITZBODEN"; Zone auf
20 °C → rot mit „Unbeheizter Bereich auf Raumtemperatur".

**Nebenbei gefunden, und teurer als alles andere.** In einem der Durchläufe kam
`befunde` nicht als Liste zurück, sondern als abgeschnittener JSON-Text.
`(d.befunde || []).forEach` warf, die Übernahme brach mitten im ersten Blatt
ab, Plandatum und Planungsart kamen nie an — und ohne Plandatum kein
angenommenes Baujahr, ohne Baujahr keine U-Werte, ohne U-Werte **0,00 kW**. Zu
sehen war davon nur eine Zeile in der Browserkonsole. Jedes Blatt läuft jetzt in
seinem eigenen `try`, Listenfelder werden vor dem Lesen in Form gebracht, und
was stolpert, steht in der Seite. Die echte Antwort liegt unter
`validierung/echtlauf/` und wird in `validierung/uebernahme_test.js` bei jedem
Bau noch einmal eingespielt.

## Immer ein Ergebnis: begründete Annahmen statt 0,00 kW (23.08.2026)

Echter Durchlauf mit „Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf", Datei
abgelegt, nichts eingetippt, gegen den laufenden Endpunkt: **0,00 kW, „Nicht
belastbar", drei Fehler, Bericht gesperrt.** Das Schriftfeld kam mit lauter null
zurück, gelesen wurde allein das Plandatum 17.05.2022. Zwei fehlende Angaben —
Baujahr und Postleitzahl — hielten alles an: ohne Baujahr keine U-Werte, ohne
U-Werte keine Bauteile, ohne Bauteile keine Heizlast.

Beide Angaben lassen sich aus dem Blatt ableiten. Das tut jetzt
`src/kerne/kern_annahmen.js`, unter drei Bedingungen: die Annahme ist abgeleitet
und nicht erfunden, sie trägt Begründung und Bandbreite, und neben ihr steht ein
Feld, in dem sie sich ändern lässt.

**Baujahr aus dem Plandatum.** Das Plandatum sagt über das Baujahr genau eine
Sache, und die hängt daran, ob das Blatt ein Gebäude PLANT oder eines ABBILDET.
Bei einer Neubauplanung entsteht das Gebäude nach dem Blatt, meist innerhalb von
ein bis zwei Jahren; das Plandatum ist dann das früheste mögliche Baujahr und
unter allen möglichen zugleich das mit der höchsten Heizlast — die natürliche
und die vorsichtige Wahl fallen zusammen. Bei einer Bestandsaufnahme ist das
Datum das Aufnahmedatum und sagt gar nichts; dort entsteht **keine** Annahme,
denn der Fehler wäre der teuerste denkbare. Wie groß er wäre, ist an diesem
Blatt gemessen: dasselbe Gebäude mit Baujahr 1965 statt 2022 ergibt **11,60
statt 6,03 kW**, also 1,9-fach.

Welcher Fall vorliegt, wird gelesen und nicht geraten. Der Endpunkt beantwortet
es neu unter `objekt.planungsart` (neubau · bestand · unklar) und muss den
Wortlaut vom Blatt als Beleg mitliefern. Sagt er „unklar" — oder ist er noch die
ältere Fassung —, sucht `planungsartAusText` in dem, was das Werkzeug ohnehin
weiß: Dateiname, Blattbezeichnung, Bauvorhaben, Plankopf. Auf Sebastians Fall
trägt der Dateiname: ein **Werkvertrag** wird vor dem Bauen geschlossen. Findet
sich aus beiden Wortlisten etwas, bleibt es bei „unklar"; dann gilt das
Plandatum ausdrücklich als **Obergrenze**, mit dem Satz daneben, dass ein
älteres Gebäude eine höhere Heizlast hat.

**Norm-Außentemperatur ohne Postleitzahl.** Angesetzt wird zuerst der Ort aus
dem Schriftfeld — auf diesem Blatt liefert ihn die zweite Seite, der
Bebauungsplan 300 „Springbach Höfe" der Stadt Paderborn —, sonst der Standort
des Bearbeiters, den das Werkzeug ohnehin speichert. Innerhalb eines Ortes
streut die Norm-Außentemperatur mit der Höhenlage; gemessen an der hinterlegten
Tabelle nach DIN/TS 12831-1:

| Ort | Postleitzahlen | Norm-Außentemperatur | Spanne |
|---|---|---|---|
| Paderborn | 5 | −9,6 bis −10,7 °C | **1,1 K** |
| Dortmund | 27 | −7,5 bis −9,1 °C | 1,6 K |
| Kassel | 12 | −10,1 bis −12,4 °C | 2,3 K |
| Leitregion 33 (OWL, rund 40 km) | 55 | −8,8 bis −11,5 °C | 2,7 K |
| Leitregion 34 | 82 | −10,1 bis −13,2 °C | 3,1 K |

Bei rund 30 K Auslegungsdifferenz sind 1,1 K etwa 3,7 Prozent Heizlast. Am
echten Fall nachgemessen: −10,7 °C gegen −9,6 °C ergibt 11,60 gegen 11,16 kW,
also 3,8 Prozent. Der Umkreis kostet das Doppelte bis Dreifache — deshalb der
Ort und nicht die Region, und deshalb steht die Spanne in jeder Begründung.
Genommen wird die **kälteste** Postleitzahl des Ortes: ein belegter
Tabellenwert, kein Zuschlag, und die vorsichtige Richtung, weil eine zu warm
angesetzte Außentemperatur die Anlage zu klein rechnet.

**Wo die Annahmen stehen.** Im Schritt „Objekt" als eigene Karte über allem
anderen, mit Begründung, Fehlerrichtung und Eingabefeld. In der Ergebnisleiste
direkt unter der kW-Zahl. Im Bericht als Kasten in Kapitel 1, dort wo die Zahl
steht, und noch einmal in der Annahmenliste als Klasse C mit der vollen
Herleitung. Wer den Wert überschreibt, löscht die Annahme — und die aus der
Typologie vorbelegten U-Werte werden dem neuen Baujahr nachgeführt
(`typologieNachfuehren`), sonst wäre das Feld eine Attrappe.

**Vier Stufen statt drei.** Drei Stufen konnten den häufigsten Zustand nicht
benennen: eine Rechnung, an der nichts falsch ist, die aber auf ausgewiesenen
Annahmen steht. Sie war entweder rot („nicht belastbar", obwohl sie trägt) oder
gelb („mit Einschränkung", ohne zu sagen, worin).

| Stufe | Wortlaut | wann |
|---|---|---|
| rot | Nicht belastbar | mindestens ein Fehler offen |
| gelb | Mit Einschränkung belastbar | eine offene Warnung, die keine Annahme ist |
| **annahme** | **Belastbar unter genannten Annahmen** | kein Fehler, und jeder offene Punkt ist eine ausgewiesene Annahme |
| grün | Belastbar | nichts offen |

Die Stufe beschönigt nichts: bleibt irgendeine andere Warnung stehen, bleibt es
bei Gelb. Auf Sebastians Blatt ist das so — der Kellergeschoss-Widerspruch
(Unterlagen: teilweise unbeheizt, Raumbuch: zwei beheizte Räume) ist ein eigener
Befund und hält die Stufe bei Gelb. Wird er zur Kenntnis genommen, springt sie
auf „Belastbar unter genannten Annahmen".

### Welche Sperre darf eine sein

Eine Sperre ist berechtigt, wenn das Ergebnis ohne sie **grob falsch** wäre,
nicht wenn es nur unsicher ist; für Unsicherheit gibt es Konfidenzklassen und
Bandbreite. Alle sperrenden Zeilen durchgesehen:

| Zeile | bleibt Sperre? | warum |
|---|---|---|
| `raeume_<G>` Räume je Geschoss | ja | ein fehlender Raum fehlt vollständig in der Last |
| `flaeche_<G>` Flächensumme | ja | Raumsumme und Außenkontur widersprechen sich; die Fläche geht linear ein |
| `fenster_*` Fenster | ja | Fenster tragen den schlechtesten U-Wert der Hülle |
| `geschosse` Zahl der Geschosse | ja | ein ganzes Geschoss fehlt |
| `zone_fehlt_<x>` unbeheizter Bereich | ja | ohne Zone rechnet die Grenzfläche gegen die falsche Temperatur |
| `ohne_huelle` Raum ohne Außenwand | ja | die Transmission dieses Raums fehlt |
| `abschluss_oben` / `_unten` | ja | Dach oder Bodenplatte fehlt im Randgeschoss |
| `bauteile_bestand` | ja — fällt hier aber weg | die Ursache ist weg: aus dem angenommenen Baujahr entstehen 6 Bauteiltypen und 29 Bauteile |
| `massstab` nicht belastbar | **nein, wenn keine Fläche daran hängt** | siehe unten |
| `voll` Pflichtangaben | **aufgeteilt** | siehe unten |

Der **Maßstab** sperrte auch dann, wenn im ganzen Projekt keine einzige Fläche
aus ihm stammt. Auf diesem Blatt sind alle dreizehn Raumflächen angeschrieben
und werden als Zahl gelesen; ein falscher Maßstab kann an ihnen nichts
verschieben. Er sperrt jetzt genau dann, wenn mindestens eine Fläche im Plan
umfahren wurde (erkennbar an `plan_kanten`). Sonst steht die Zeile unverändert
im Blatt und im Bericht, als Warnung statt als Fehler. Weggelassen wird sie nie.

Die **Pflichtangaben** waren eine Liste aus sechs Feldern, und jedes einzelne
machte die Ampel rot. Vier davon machen die Zahl falsch (Norm-Außentemperatur,
Baujahr, Räume, Bauteile) und bleiben Fehler. Zwei fehlen dem DOKUMENT und nicht
der Rechnung: Objektbezeichnung und Quelle der Klimadaten. Sie stehen jetzt als
eigene Zeile „Angaben für den Bericht", als Warnung. „Nicht belastbar" für eine
fehlende Überschrift ist eine Unwahrheit im Kopf und kostet das Vertrauen in
jedes berechtigte Rot.

### Der echte Durchlauf danach

Dieselbe Datei, wieder nichts eingetippt, dieselben Endpunktantworten:

| | vorher | nachher |
|---|---|---|
| Gebäudeheizlast | 0,00 kW | **6,03 kW** (32,4 W/m² auf 186,04 m²) |
| Bandbreite | – | 5,48 bis 6,85 kW |
| Kopf | Nicht belastbar · 3 Fehler | Mit Einschränkung belastbar · **0 Fehler**, 4 Warnungen |
| Sperren | 1 (`bauteile_bestand`) | **0** |
| Bericht | gesperrt | wird ausgegeben, 84.000 Zeichen |
| Bauteile | 0 | 6 Typen, 29 Bauteile in 13 Räumen |

Die vier Warnungen: die beiden Annahmen, der Anteil der Annahmen am
Transmissionswärmestrom, und der Kellergeschoss-Widerspruch. Alle vier stehen
mit Namen, Zahl und Abhilfe im Blatt und im Bericht.

## Vom Raum zur Heizlast — der Weg schließt sich (22.08.2026)

Bis hierher endete die Kette am Raumbuch: Räume ohne Bauteile ergeben keine
Heizlast. Gemessen am Härtefall Dumach 1 (A1, 25 Räume, drei Geschosse) stand
danach zwar eine Zahl auf dem Schirm, aber die Ampel war rot und der Bericht kam
nicht heraus. Fünf Befunde, alle im Browser am fertigen Bau nachgestellt:

| Befund | Wirkung | behoben in |
|---|---|---|
| Der Rang des Erdgeschosses ist **0**, und `rang \|\| 5` machte daraus 5. Das EG wurde über das OG sortiert. | Die Kellerdecke lag auf dem Obergeschoss; die zwölf Räume des Erdgeschosses hatten kein Bauteil nach unten. | `app.js` (jetzt `KERN_ZUORDNUNG.rangVon`) |
| Ein Flächenstempel nennt **keine Fenster**. Ohne Fensterzahl entstand kein Fenster. | In 16 von 25 Räumen fehlte der schlechteste U-Wert der Hülle: 25,4 statt 32,6 W/m², Quervergleich −58 %. | `app.js` über `KERN_FENSTER.rueckfallFlaeche` |
| Ein innenliegender Flur auf einem Zwischengeschoss hat richtigerweise kein Hüllbauteil — galt aber als Fehler. | Ampel rot bei einem korrekt gerechneten Gebäude. | `KERN_ZUORDNUNG.innenraumZulaessig`, benutzt von `kern_pruefung` und `modul_kontrollblatt` |
| Die Gegenrechnung der Zonenbilanz verglich eine **vorgegebene** Zonentemperatur mit dem Mittel der angrenzenden beheizten Räume. | 14,8 K „Abweichung", und `erzeugen()` verweigerte den Bericht — bei null Fehlern in der Selbstprüfung. | `modul_bericht.zonenBilanz` (`vergleichbar`) |
| Eine Fensterzeile fasst alle Fenster eines Raums zusammen; das Kontrollblatt zählte Zeilen. | „5 Fenster gelesen, 3 angelegt, es fehlen 2" — es fehlte keines. | `anzahl` am Bauteil, `modul_kontrollblatt` |

**Fensterflächen ohne Fensterzahl.** Wo der Plan für einen Raum keine Fenster
angibt, wird die Fensterfläche aus der Raumgrundfläche angesetzt: Anker ist das
bauordnungsrechtliche Mindestmaß von einem Achtel der Netto-Grundfläche für
Aufenthaltsräume (Musterbauordnung § 47 Abs. 2, wortgleich § 46 Abs. 2 BauO NRW
2018), angesetzt wird ein Sechstel. Drei Schranken: nur wo der Plan **nichts**
sagt (eine gelesene Null bleibt eine Null), nur in Räumen, in denen ein Fenster
der Regelfall ist (dieselbe Liste, mit der die Außenwände erschlossen werden),
und nur bei vorhandener Außenwand. Die Annahme steht als Herkunft am Bauteil, als
Warnung im Kontrollblatt („Fensterflächen angenommen", mit Fläche und Fundstelle)
und in der Annahmenliste des Berichts.

**Rangfolge, wo zwei Wege dieselbe Größe setzen**

| Größe | Rangfolge, von oben |
|---|---|
| Raumfläche | Textstand des Plans · Ablesung des Modells · Breite × Tiefe · von Hand |
| Raumhöhe | Eingabe des Bearbeiters je Geschoss · im Plan angeschrieben · Schnitt · Rückfall 2,60 m |
| Fenster | im Plan gezählt · Fensterliste der Auslese · Annahme aus der Grundfläche |
| Bauteilflächen | von Hand geändert (`automatisch: false`) · sonst aus Raumfläche und Raumhöhe, und zwar **nachgeführt**, sobald sich eine der beiden ändert |

Zwei Fälle steckten darin, die vorher still danebenlagen: eine aus dem Plan
gelesene lichte Höhe von 2,45 m wurde vom Rückfallwert 2,60 m überschrieben, und
die einmal gebildete Wandfläche blieb auf der alten Raumhöhe stehen, nachdem der
Bearbeiter sie korrigiert hatte. Beides hat jetzt eine Probe in
`validierung/uebernahme_test.js`.

**Stempel und Auslese zusammen.** Wer erst die angeschriebenen Flächen übernimmt
und danach auslesen lässt, bekommt den Raum nicht zweimal — und verliert
seitdem auch nicht mehr, was nur die Auslese weiß: Fensterzahl, Zahl der
Außenwände und lichte Höhe werden in den vorhandenen Raum ergänzt, die Fläche
bleibt die des Textstands, und eine abweichend gelesene Fläche steht als offene
Frage im Kontrollblatt.

**Grenzen, belegt statt vermutet**

Die Ermittlung von Raumflächen aus einem gescannten Plan durch Bildverarbeitung
wurde gebaut und adversarisch geprüft. Ergebnis: 13 Fälle, in denen sie eine
plausible, geschlossene und falsche Antwort liefert, ohne einen Hinweis zu geben.
Betroffen sind schraffierte Mauerwerkswände, Fenster mit dünnen Brüstungslinien,
gestrichelte Linien, Innenwände unter drei Pixeln und angeschnittene Blätter —
also die gängigen Zeichenkonventionen.

Das Modul `src/kerne/kern_grundriss.js` (1066 Zeilen, 30 bestandene Selbsttests)
lag danach ungenutzt im Ordner und ist am 22.08.2026 **entfernt** worden. Der
Anlass war die Frage, ob es sich als Rückfall für Räume ohne angeschriebene
Fläche einbinden lässt. Nachgemessen an den vier echten Plänen der Mälzerstraße 59,
deren richtige Werte aus dem Referenzprojekt bekannt sind:

| Blatt | tatsächlich | gefunden | Summe | Kanten nach außen erkannt |
|---|---|---|---|---|
| Erdgeschoss | 6 Räume, 68,68 m² | 11 bis 12 | 54,4 bis 60,6 m² | 3 von 11 |
| Kellergeschoss | 6 Räume | 12 | 71,2 m² | wenige |
| Dachgeschoss | 6 Räume | 9 | 62,4 m² | wenige |
| Aufmaßplan (drei Grundrisse auf einem Bogen) | 18 Räume | 6 | 37,3 m² | – |

Keine Einstellung von `strichRadius` und `minFlaecheM2` bringt die richtige
Raumzahl; die ermittelte Wanddicke liegt bei 4 bis 5 cm. Eingebunden hätte das
aktiven Schaden angerichtet: `modul_kontrollblatt.zaehlerRaeume` nimmt als
Sollzahl das **Maximum** aller Zähler, elf gefundene Flächen in einem Geschoss
mit sechs Räumen hätten also auf jedem Geschoss gemeldet, es fehlten fünf Räume.
Eine Funktion, die zuverlässig etwas Falsches behauptet, ist schlechter als
keine. Der Weg zu Flächen ohne Handarbeit führt stattdessen über die im Plan
angeschriebenen Zahlen (siehe *Flächen aus dem Plan lesen* direkt darunter).

**Auch die Vektorgeometrie gibt keine Räume her** — nachgemessen am 22.08.2026

Naheliegend wäre, die Räume statt aus dem Bild aus der Vektorgeometrie zu
gewinnen: dort sind die Koordinaten exakt, ein Linienzug hat keine Bildpunkte.
`modul_pdf.js` zerlegt die Pfade bereits (`zuege`, `strecken`, `flaechen()`).
Gezählt wurde, wie viele geschlossene Linienzüge in Raumgröße (2 bis 400 m²)
tatsächlich vorliegen:

| Blatt | Pfade | geschlossene Züge | davon in Raumgröße |
|---|---|---|---|
| 260514 Dumach 1 (A1, 25 Räume, bester Plan im Bestand) | 16.922 | 0 | **0** |
| 25_Maas_Langner_VE1_OG | 1.788 | 23 | 4, keiner davon ein Raum |
| 2023-03-29 Grundriss KG (Christuskirche) | 2.674 | 10 | 0 |
| 4.1.1.24 BT4 EG (A0) | 15.859 | 592 | 0 |

CAD zeichnet Wände als einzelne Striche und Schraffuren, nicht als geschlossene
Raumumrisse. Ein Raum ist im Dokument gar nicht als Fläche vorhanden. Wer ihn
daraus gewinnen will, muss aus offenen Strichen Flächen bilden — dieselbe
Aufgabe, an der die Bildverarbeitung oben gescheitert ist, nur in anderen
Koordinaten. Deshalb ist auch dieser Weg **nicht** gebaut worden.

## Flächen aus dem Plan lesen

Bei einer Vektorzeichnung steht die Raumfläche als Text im Dokument, auf zwei
Nachkommastellen genau. Sie ist damit weder gemessen noch geschätzt: sie hängt
an keinem Maßstab, keinem Bildpunkt und keinem Modellaufruf.

`MODUL_PDF.raumbloeckeLesen` liest sie beim Ablegen der Datei. Die Schwierigkeit
ist nicht die Zahl, sondern die Zuordnung: CAD setzt Name und Fläche als **zwei**
Textstücke ab, untereinander. Am Blatt Dumach 1:

```
680,2 | 450,3 | 10,0 pt | "Studio"       <- Name
680,2 | 441,8 |  8,0 pt | "45,96 m²"     <- Fläche darunter
```

Zusammengeführt wird über den Beschriftungsblock, nicht über die Nähe zu
irgendeinem Namen: gleiche Laufkoordinate, höchstens eine Zeile Abstand,
vergleichbare Schriftgröße. Gerechnet wird in Laufrichtung des Textes und quer
dazu, damit gedrehte Beschriftung (Blätter mit `/Rotate`) genauso trägt.

Drei Schranken, jede aus einem echten Fehlbefund entstanden:

- **Kleinere Schrift gehört nicht zum Block.** Über „Galerie" (8,4 pt) steht auf
  dem Blatt Maas die Bauteilbeschriftung „Geländer" (6,0 pt) knapp im
  Zeilenabstand. Ohne die Schranke hieß der Raum „Geländer Galerie".
- **Summen sind keine Räume.** „Wohnfläche", „gesamt", „BGF" und Verwandte
  werden gekennzeichnet und nicht ins Raumbuch übernommen.
- **Der Punkt ist der Tausendertrenner.** „GRUNDSTÜCKE GESAMT ca. 4.289m²" sind
  4289 m², nicht 4,289 m².

Liegen mehrere Grundrisse auf einem Bogen — Dumach 1 trägt drei mit zusammen
25 Räumen —, entscheidet die Lage: jeder Stempel gehört zur nächstgelegenen
Geschossüberschrift. Steht nur **eine** Überschrift auf dem Blatt, wird die Lage
nicht befragt, sondern das Geschoss des Blattes genommen; auf
`1.04 BA_2 Grundriss DG.pdf` ist „…STÜTZWANDHÖHEN, EG HÖHEN GEPLANT" groß genug
für einen Titel, und über die Lage wären alle 83 Räume des Dachgeschosses im
Erdgeschoss gelandet.

**Was dabei herauskommt** (im Browser bedient, nicht nur getestet):

| Unterlage | Art | Räume | Summe |
|---|---|---|---|
| 260514 Dumach 1 (A1, drei Geschosse) | Vektor mit Textstand | **25** (12 EG, 11 OG, 2 DG) | 370,44 m² |
| 25_Maas_Langner_VE1_OG | Vektor, Blatt gedreht | **2** | 56,07 m² |
| abb5_aufmassplan.png (Mälzerstraße) | Bild | 0 | – |
| 2023-03-29 Grundriss KG | Vektor **ohne** Textstand | 0 | – |
| Cheruskerstraße 23, Ansichten | Vektor, keine Raumstempel | 0 | – |
| 4.1.1.26 SchnittBB | Schnitt | 0 | – |
| hi_schnitt-2.png | Bild | 0 | – |
| Werkvertragsverzeichnung Ziolkowski | Scan | 0 | – |

Gegenprobe an der Zeichnung selbst: das Erdgeschoss von Dumach 1 wurde gerendert
und abgelesen. Es hat 12 Räume — Kochen/Essen/Wohnen 39,24 und 29,84, HWR 1,83
und 2,66, Flur 6,86, 6,70 und 5,94, Schlafen 12,57 und 14,64, Bad 9,39 und 9,04,
TRH 9,94. Das Werkzeug liefert dieselben zwölf mit denselben Zahlen,
**Abweichung 0,00 m² je Raum**, und legt sie ins richtige Geschoss.

Zur Mälzerstraße 59, an der die Rechenkerne validiert sind: alle Unterlagen dort
sind Rasterbilder ohne Textstand. Es entsteht keine Fläche und — das ist der
Punkt — auch keine falsche. Die 18 Räume mit 206,04 m² bleiben dort Handarbeit.

Jede so gewonnene Fläche trägt ihre Herkunft im Raumbuch und im Bericht, im
Wortlaut des Plans: *im Plan angeschrieben, aus dem Textstand der Zeichnung
gelesen („45,96 m²")*. Läuft danach zusätzlich die KI-Auslese, gilt weiterhin
der Textstand; weicht das Modell ab, steht die Abweichung als offene Frage im
Kontrollblatt, und derselbe Raum wird nicht zweimal angelegt.

**Der unsichtbare Maßstabsfehler**

Ein gleichmäßiger Maßstabsfehler skaliert Flächen und Wärmestrom gemeinsam. Die
Heizlast je Quadratmeter bleibt dabei unverändert, jede darauf beruhende
Plausibilitätsprüfung schweigt. Dagegen prüft `kern_massstabsprobe.js` mit
Mitteln, die im Plan selbst stecken: Summenprobe der Maßkette, Vergleich mehrerer
Ketten, Türbreiten nach DIN 18100 und übliche Wanddicken. Die Güte des Maßstabs
steht im Bericht; ist sie nur grob geprüft, sagt der Bericht das ausdrücklich.

## Eignungsprüfung der Pläne

Bevor gearbeitet werden kann, prüft das Werkzeug die Unterlage selbst, rein lokal
auf den Bilddaten:

| Merkmal | Sperre ab | Hintergrund |
|---|---|---|
| Auflösung | unter 600 px kürzere Kante | darunter sind Maßketten nicht lesbar |
| Schärfe | Laplace-Varianz unter 12 | verwaschene Linien lassen sich nicht trennen |
| Kontrast | Abstand Tinte zu Papier unter 90 | typisch für unbearbeitete Blaupausen |
| Ausrichtung | über 1,5 Grad Schräglage | verzerrt beim Umfahren die Flächen |
| Bildinhalt | unter 0,4 oder über 55 Prozent Zeichnungsanteil | leeres Blatt oder Foto |
| Maßstab | unter 15 Pixel je Meter | ein Pixel wäre mehr als 6 cm |

Bei einer Sperre bleiben Maßstab, Umfahren und Übernahme gesperrt. Die Sperre
lässt sich mit einer Begründung aufheben (mindestens zehn Zeichen); die
Begründung erscheint dann im Bericht und in der Selbstprüfung als Warnung.

Der Kontrast wird über eine Otsu-Schwelle als Abstand zwischen Tinte und Papier
gemessen, nicht als Standardabweichung: bei einer Strichzeichnung sind über
neunzig Prozent der Fläche Papier, das würde jede Standardabweichung nach unten
ziehen, unabhängig von der Qualität.

Die Schwellen sind an acht Bildvarianten kalibriert (scharf, leicht weich,
unscharf, Blaupause, zu klein, 2 Grad schief, 0,5 Grad schief, leeres Blatt).
Der Build bricht ab, wenn eine davon falsch beurteilt wird.

## Selbstprüfung

Das Werkzeug prüft jedes Ergebnis, ohne dass jemand danach fragt:

- **Selbsttests der Rechenkerne** laufen bei jedem Start (aktuell 47 Prüfungen).
- **Quervergleich mit der Gebäudetypologie**: Aus dem Baujahr wird ein
  Erwartungswert in W/m² gebildet und mit dem Rechenergebnis verglichen. Sind die
  eingetragenen Bauteile besser als die Typologie, wird der Erwartungswert
  entsprechend gesenkt, damit ein saniertes Gebäude nicht fälschlich auffällt.
  Das ist eine unabhängige Kontrolle: sie entsteht auf einem anderen Weg als die
  Raumbilanz.
- **Vollständigkeit**: Pflichtangaben, Räume ohne Einheit, Räume ohne Bauteil.
- **Physikalische Grenzen** der U-Werte.
- **Geometrie**: Verhältnis Hüllfläche zu Grundfläche, Raumhöhen, Abgleich der
  eingetragenen Fläche mit der im Plan umfahrenen.
- **Anteil der Annahmen** am Transmissionswärmestrom.
- **Bauteile ohne Wirkung**: jedes Bauteil, das Fläche hat und trotzdem keinen
  Wärmestrom liefert. Die Schranke liegt bei 1,0 W/m²; im Referenzprojekt
  Mälzerstraße 59 ist der kleinste vorkommende Wert 3,60 W/m². Dazu Bauteile
  ohne Fläche, ohne U-Wert und solche, die auf einen unbeheizten Bereich oder
  einen Nachbarraum verweisen, den es im Projekt nicht gibt — für einen
  unbekannten Nachbarn rechnet der Kern mit der Außentemperatur, das Ergebnis
  wird dadurch zu hoch. Ebenfalls hier: eine Heizlast von null Watt bei
  vorhandener Hülle und ein Lüftungsanteil über der Hälfte.
- **Klimadaten** gegen die hinterlegte Tabelle der Postleitzahl.
- **Raumhöhe gegen den Schnitt** (`KERN_ZUORDNUNG.hoehenGegenprobe`): lichte Höhe
  unter der Geschosshöhe, Deckenpaket zwischen 0,10 und 0,60 m, Summe der lichten
  Höhen gegen die Spanne der Höhenkoten. Dazu die Gegenrechnung ±0,20 m, die
  **immer** läuft — auch für eine aus dem Schnitt gelesene Höhe. Eine gelesene
  Höhe ist nicht sicherer als eine angenommene, sie ist nur anders begründet:
  am 23.08.2026 gaben zwei Läufe derselben Datei dieselbe Maßkette einmal als
  lichte Höhe und einmal als Geschosshöhe zurück.

**Die Höhe steht in der Bandbreite.** Sie fehlte dort, weil `projektFuerKern`
die Herkunft abgestreift hat und `KERN_BANDBREITE` deshalb nie ein Kennzeichen
fand — am Fall Ziolkowski 30 Größen ohne eine einzige Höhe. Jetzt ist jede Höhe
dabei: angenommen mit dem bauordnungsrechtlichen Maß, gelesen mit der Klammer
aus den Höhenkoten (Geschosshöhe minus Deckenpaket). Gemessen am echten
Durchlauf 23.08.2026: 43 statt 30 Größen, Spanne 5,9 bis 8,4 kW statt 6,2 bis
8,0 kW bei 6,95 kW Punktwert.

Ampel rot bedeutet: das Ergebnis ist nicht belastbar. Alle Befunde stehen auch im
Bericht in einem eigenen Kapitel.

Diese Prüfungen sehen das **Rechenergebnis** an, nicht die Eingabe. Der Anlass
war ein Fall, in dem zwei unbeheizte Bereiche auf der Raumtemperatur standen und
84,8 m² Boden und Dach deshalb 0 W lieferten, während darunter „Keine
Auffälligkeiten" stand. Eine Prüfung an der Ursache hätte nur diesen einen Weg
zur Null abgedeckt; eine Prüfung an der Wirkung deckt jeden ab.

### Befund, Prüfung, Grenze — drei Gruppen, zwei davon in der Liste

Das Kontrollblatt hat auf jedem Projekt dieselben Fragen gestellt und konnte
keine davon selbst beantworten. Gemessen am Blatt „BV 2-0887 Ziolkowski":
zwölf offene Fragen, und elf davon sagten im Kern dasselbe — „gegen nichts
geprüft". Das ist kein Befund über das Gebäude, sondern einer über die
Unterlagenlage. Eine Frage, die immer dasteht, ist keine Prüfung; sie erzieht
dazu, die ganze Liste zu überblättern.

Jede Zeile trägt deshalb eine Einordnung (`art` in `modul_kontrollblatt.js`):

| Gruppe | Was sie ist | Wo sie steht |
|---|---|---|
| **Befund** | Zwei Zahlen widersprechen sich, oder ein Zustand ist geometrisch unmöglich | Liste zum Abarbeiten, hält den Bericht auf |
| **Prüfung** | Es gibt eine Gegenprobe. Sie besteht oder schlägt an | Liste; besteht sie, in einem Satz |
| **Grenze** | Es gibt keine Gegenprobe und aus diesen Unterlagen wird auch keine | Bericht, Kapitel 9 „Was diese Berechnung nicht belegt" |

`zaehler()` liefert die ersten beiden Gruppen, `grenzen()` die dritte,
`gegenproben()` alle Zeilen mit Sollzahl für die Prüftabelle des Berichts.
**Keine Zeile fällt dabei weg**: was aus der Liste geht, steht im Bericht, mit
Text, Zahl und dem einen Satz, welche Unterlage die Grenze aufheben würde. Im
Blatt selbst stehen die Grenzen unter der Liste, ohne Haken — aber MIT dem
Eingabefeld, denn eine eingetragene Zahl hebt die Grenze wirklich auf, und die
Zeile wird danach zu einer Prüfung. Abhaken kann man sie nicht; es gibt daran
nichts abzuhaken.

Zwei Prüfungen sind dabei getrennt worden, die vorher eine waren. „Räume ohne
Bauteil zur Hülle" fragte senkrecht und waagerecht auf einmal: hat der Raum
eine Außenwand, und hat er eine Fläche gegen kalt nach oben oder unten? Das
erste entscheidet der Grundriss, das zweite das Geschoss. Zusammengelegt ergab
das zwei falsche Ergebnisse: „OG FLUR" lag nachweislich in der Mitte des
Obergeschosses und stand trotzdem rot, während ein Raum MIT Außenwand, dem die
Geschossdecke fehlte, gar nicht vorkam — seine Außenwand ließ ihn durchgehen.
Jetzt prüft `ohne_huelle` die Außenwand je Raum und `abschluss_oben` /
`abschluss_unten` den Geschossabschluss je Randgeschoss, für alle Räume.

Die **Himmelsrichtung** eines Fensters ist am Normtext nachgeprüft und für die
Heizlast ohne Belang: DIN EN 12831-1 rechnet den Auslegungsfall ohne solare
Gewinne, der nationale Anhang schließt Gewinne aus Sonneneinstrahlung
ausdrücklich aus, und von der Lage geht allein die ZAHL der exponierten
Fassaden über den Abschirmkoeffizienten e ein (DIN/TS 12831-1:2020-04). Eine
fehlende Richtung kostet nur den Abgleich Fassade für Fassade gegen eine
Ansicht. Liegt keine Ansicht vor, kostet sie gar nichts — dann entsteht auch
keine Zeile mehr.

## Datengrundlagen und ihre Quellen

| Grundlage | Quelle | Status |
|---|---|---|
| Rechenverfahren | DIN EN 12831-1:2017-09, DIN/TS 12831-1:2020-04 | umgesetzt |
| Typologie-U-Werte je Baualtersklasse | IWU, Deutsche Wohngebäudetypologie, 2. Auflage 2015, Anhang C.1, Reihe Einfamilienhaus, Wärmeschutz Variante 1 (Ist-Zustand) | belegt, 11 Klassen, **gilt bis Baujahr 2022** |
| Heizlast-Kennwerte je Baualtersklasse | IWU TABULA 2015, übernommen aus `werke_konzept_tool` | belegt, nur für die Selbstprüfung |
| Norm-Außentemperatur | PLZ-genau nach DIN/TS 12831-1 | nur Paderborn hinterlegt, sonst Eingabe mit Quellenpflicht |
| Norm-Innentemperaturen | DIN/TS 12831-1 Tab. 32 | vier Raumarten belegt, weitere als Vorschlag gekennzeichnet |
| U-Werte aus Schichtaufbau | DIN EN ISO 6946 | umgesetzt, Materialkennwerte teils als Vorschlag |

Jeder nicht belegte Wert erscheint im Bericht in der Annahmenliste.

## Validierung

Der Rechenkern ist gegen das geprüfte WERK.E-Modell `heizlast_maelzerstr59`
validiert (`node validierung/vergleich.js`):

- **Stufe A** (Zonentemperaturen fest vorgegeben): Abweichung 0,000 W über alle
  18 Räume, alle Summen und H_T exakt.
- **Stufe B** (Zonentemperaturen aus eigener Bilanz): +7,7 W von 9.044 W, also
  0,085 %. Ursache vollständig nachgewiesen: die Referenz bilanziert die
  unbeheizten Zonen pauschal gegen 20 °C und mit der Bruttogeschossfläche,
  das Werkzeug gegen die tatsächlichen Norm-Innentemperaturen und mit denselben
  Flächen wie im Raumbuch. Das Werkzeug rechnet hier bewusst anders und in sich
  konsistent.

### Die Probe gegen ungenutzte Fähigkeiten

`node validierung/verdrahtung_test.js`, im Bau als Schritt 2e.

Dieses Werkzeug hatte fünfmal denselben Fehler: eine gebaute, getestete
Fähigkeit, zu der kein Weg führt. `kern_massstab.js` mit 1876 Zeilen ohne
Aufrufer. `kern_messen.js` mit bestandenem Selbsttest, aber nicht in der
Auslieferung, wodurch das Messwerkzeug für alle unbenutzbar war.
`messenStarten()` definiert, nie gerufen, nicht exportiert. Ein Haken im
Kontrollblatt, dessen Aktion im Verteiler fehlte. Und `sicherungAnbieten()`,
die Wiederherstellung nach einem Neuladen, von nirgendwo aufgerufen.

Kein Selbsttest kann das finden, denn er ruft die Funktion selbst auf. Die
Probe prüft deshalb drei Beziehungen statt Verhalten:

1. **Knopf und Verteiler.** Jede genannte Aktion muss ein Verteiler kennen,
   und jeder Verteilerzweig muss von einem Knopf genannt werden. Die
   Aktionsnamen kommen aus dem **gezeichneten** Markup: die Probe baut ein
   Projekt mit Räumen ohne Fläche, einem unbeheizten Bereich und einem Blatt
   mit offenem Maßstab, zeichnet jeden Schritt über `window.ZEICHNER` und
   liest die entstandenen `data-aktion` heraus. Nur so sind auch die Knöpfe
   erfasst, deren Name erst beim Zeichnen entsteht.
2. **Funktion ohne Weg dorthin.** Jede Funktion auf oberster Ebene muss in
   ihrer Datei mehr als einmal vorkommen. Gezählt wird im Quelltext **ohne
   Kommentare, ohne Zeichenketten und ohne den Selbsttest** — ein Aufruf aus
   dem Selbsttest ist kein Weg, den ein Bearbeiter gehen kann. Helfer, die
   nach dem Beginn des Selbsttests definiert sind, gelten als dessen Werkzeug.
3. **Modul ohne Benutzer.** Jedes `window.NAME` muss von einer anderen
   Quelldatei genannt werden.

Gegengeprobt an allen sechs Fehlerformen, jede einzeln im Quelltext
nachgestellt; jede wird gefunden. Ohne Befund sind es rund 720 Prüfungen.

### Die Probe gegen Datenverlust

`node validierung/sicherung_test.js`, im Bau als Schritt 2da.

Der teuerste Fehler war kein Rechenfehler. `App.p.plan.seiten` enthält lebende
Objekte von pdf.js mit einem Ringverweis; `JSON.stringify` wirft daran. Sobald
ein Plan im Projekt lag, erzeugte „Speichern" keine Datei und keine Meldung,
und der Zwischenspeicher schrieb nie — ein versehentliches Neuladen kostete die
ganze Arbeit. Die Probe arbeitet an einem Projekt mit **echtem** Ringverweis und
einem Browserspeicher, der wie der echte bei fünf Megabyte wirft; an einer
sauberen Attrappe wäre auch die kaputte Fassung durchgekommen. Nachgestellt und
gefunden werden: Speichern ohne Aufbereitung, Zwischenspeicher ohne
Aufbereitung, fehlender Aufruf beim Start, fehlender zweiter Anlauf ohne
Bilder, fehlender Fang für Pläne, die neben die Ablagefläche fallen.

Das Angebot beim Neuladen ist seit 22.08.2026 **kein `confirm()` mehr**, sondern
eine Karte über dem Inhalt, die auf jedem Schritt stehen bleibt, bis sie
beantwortet ist. Grund: Escape oder ein Fehlklick beantwortete den Dialog mit
„Abbrechen", und Abbrechen löschte den wiedergefundenen Stand sofort und ohne
Rückfrage. Solange die Karte offen ist, schreibt der Zwischenspeicher nicht —
sonst überschriebe die erste Eingabe genau das, was noch zu holen wäre.
Verworfen wird nur auf ausdrücklichen Klick und mit Rückfrage.

### Zwei Proben am Quelltext, die im Browser gefundene Fehler abfangen

`build.py`, Schritte 3a und 3aa. Beide entstanden aus je einem Befund, den kein
Selbsttest finden konnte:

- **Namen im gemeinsamen globalen Raum.** In der Einzeldatei liegt jede
  Quelldatei in einem eigenen `<script>`-Block; ein `function name()` am
  Zeilenanfang wird dort zur GLOBALEN. `fundstelle()` gab es dreimal (Raumarten,
  BEG-Anforderungen, Typologie), im Browser gewann die zuletzt geladene.
  `DATEN_RAUMARTEN.offeneAnnahmen()` lieferte dadurch `quelle: null` statt der
  DIN-Fundstelle. Unter Node hat jede Datei ihren eigenen Raum — alle
  Selbsttests blieben grün. Der Bau bricht jetzt bei jedem doppelt vergebenen
  Namen ab.
- **Zahlform hinter jedem Zähler.** Jeder Zähler im Kontrollblatt trägt eine
  Einheit, die hinter seiner Zahl steht. Bei eins las man „1 Räume".
  `einheitZu()` beugt sie; der Bau prüft, dass jede vergebene Einheit dort
  eingetragen ist.

Dazu prüfen `validierung/oberflaeche_test.js` und die Baustellensuche im Bericht
seit 22.08.2026 den **sichtbaren Text auf Ersatzschreibungen**: auf dem
Ergebnisblatt stand „Wärmeströme der Gebäudehuelle". Geprüft wird nur der Text
zwischen den Marken und nur gegen Wortteile, die es im Deutschen ohne Umlaut
nicht gibt; Kennungen wie `kat: "huelle"` und Netzadressen bleiben unberührt.

## Der Ausleseendpunkt

Nur der Schritt „Plan mit KI auslesen" braucht Netz. Alles andere läuft lokal.
Der Anthropic-Schlüssel liegt ausschließlich auf dem Endpunkt, nie im Werkzeug.

Die Function kommt **ohne Abhängigkeiten und ohne Build** aus: sie ruft die
REST-Schnittstelle direkt auf und erzwingt die Antwortstruktur über ein Werkzeug
(tool_choice). Deshalb genügt ein Drop-Deploy per Zip, es braucht kein CLI.

> **Die teuerste Falle dieses Endpunkts, gemessen am 22.08.2026:**
> `claude-sonnet-5` denkt **voreingestellt**, und die Denk-Token zählen gegen
> `max_tokens`. Am A1-Bogen „Dumach 1" mit 25 Räumen waren die 2300 Token
> aufgebraucht, bevor der erste Raum geschrieben war — zurück kamen sechzehn
> Zeichen. Für die ablesenden Betriebsarten geht deshalb
> `thinking: { type: "disabled" }` mit hinaus; nur die Betriebsart „bewertung"
> denkt weiter, weil sie Fließtext schreibt. Wer das entfernt, bekommt sofort
> wieder leere Raumlisten, und zwar ohne Fehlermeldung.

> **Stand 22.08.2026: die Seite ist abgeschaltet.** `https://werke-heizlast.netlify.app/`
> antwortet mit 503 und `{"error":"usage_exceeded"}` — das Netlify-Konto hat sein
> Kontingent aufgebraucht. Betroffen sind die Seite **und** der Endpunkt. Zu tun:
> Kredit aufladen, danach `api/WERKE_Heizlast_Web.zip` ablegen. Das Werkzeug sagt
> dem Kollegen in diesem Fall im Klartext, dass es nicht am Plan und nicht am
> Zugangscode liegt, und wiederholt den Aufruf nicht.

**Stand 20.08.2026: deployed.**

| | |
|---|---|
| Projekt | `werke-heizlast` im WERK.E-Netlify-Konto |
| Endpunkt | `https://werke-heizlast.netlify.app/.netlify/functions/plan-auslesen` |
| Zugangscode | im Werkzeug voreingestellt |
| Paket | `api/WERKE_Ausleseendpunkt.zip` (8 KB), für ein erneutes Ablegen |

Der Endpunkt antwortet bereits, verweigert aber noch die Arbeit, solange die
beiden Umgebungsvariablen fehlen.

**Noch zu erledigen:** unter *Project configuration → Environment variables*
diese Werte setzen:

   | Variable | Inhalt |
   |---|---|
   | `ANTHROPIC_API_KEY` | Schlüssel des WERK.E-Workspace aus der Anthropic-Konsole |
   | `WERKE_CODE` | frei gewählter Zugangscode fürs Team |
   | `MAX_BILD_MB` | optional, Standard 6 |

Danach einmal *Deploys → Trigger deploy → Clear cache and deploy site*, damit die
Variablen greifen.

Adresse und Zugangscode sind im Werkzeug bereits voreingestellt; die Kollegen
müssen nichts eintragen. Über das Zahnrad neben „Plan mit KI auslesen" lassen
sie sich ändern, falls der Endpunkt einmal umzieht.

**Zur Länge des Zugangscodes:** Ein vierstelliger Zahlencode hat zehntausend
Möglichkeiten und ist maschinell in Sekunden durchprobiert; jeder Treffer kostet
Modellaufrufe. Die Funktion bremst deshalb jeden Fehlversuch um zwei Sekunden ab,
was reines Durchprobieren auf mehrere Stunden streckt, und vergleicht in
gleichbleibender Zeit. Sicherer wäre ein längerer Code, etwa `werke-<zufall>-heizlast`;
er ist genauso leicht zu merken und praktisch nicht zu erraten. Zum Ändern den
Wert in Netlify und die Voreinstellung in `src/modul_ki.js` anpassen und neu bauen.

**Prüfen, ob er läuft** (beides bereits bestätigt):

```
curl -s -o /dev/null -w "%{http_code}\n" https://werke-heizlast.netlify.app/
curl -s -X POST -H "content-type: application/json" -d "{}" \
  https://werke-heizlast.netlify.app/.netlify/functions/plan-auslesen
```

Die Startseite antwortet mit 200, der Endpunkt ohne Zugangscode mit 401 und der
Meldung „Zugangscode fehlt oder stimmt nicht.".

Der Schlüssel gehört ausschließlich in die Netlify-Umgebungsvariable. Er darf
weder im Werkzeug noch im Zip noch in einer Datei im Teamordner stehen; das
Build-Skript bricht ab, wenn es einen findet.

Kosten: rund **0,05 $ je ausgelesener Planseite**, Dauer rund 20 bis 25 Sekunden.
Ohne Endpunkt bleibt das Werkzeug voll funktionsfähig, nur die Auslese fehlt.
Ein Ausgabelimit lässt sich in der Anthropic-Konsole je Workspace setzen.


Die Logik des Endpunkts ist mit `node api/test_endpunkt.mjs` ohne echten
Modellaufruf prüfbar (22 Prüfungen, inklusive Datenstrom und Fehlerfällen).

### Zwei Eigenheiten der Umgebung, die Zeit gekostet haben

**Netlify setzt selbst eine Variable `ANTHROPIC_API_KEY`** — ein rund 366 Zeichen
langes Token für das hauseigene AI-Gateway, das gegen die normale Schnittstelle
nicht gültig ist. Ein eigener Schlüssel unter diesem Namen geht unter. Deshalb
heißt die Variable hier **`WERKE_ANTHROPIC_KEY`** und hat im Code Vorrang. Ein
Aufruf des Endpunkts per GET zeigt jederzeit, welcher Schlüssel greift, ohne
einen Wert preiszugeben.

**Funktionen werden nach gut einer halben Minute abgebrochen.** Ein Durchlauf mit
dem größten Modell dauert länger und lief deshalb in einen Abbruch. Zwei Dinge
lösen das zusammen: Die Antwort wird im Datenstrom geöffnet und mit Lebenszeichen
gehalten, und es rechnet `claude-sonnet-5` statt des größten Modells. Damit liegt
ein Durchlauf bei gut 20 Sekunden. Das Modell ist über die Umgebungsvariable
`WERKE_MODELL` umstellbar, falls die Grenze einmal fällt.

**Umgebungsvariablen greifen erst nach einem neuen Deploy.** Nach jeder Änderung
also `api/paket_bauen.sh` und das Zip erneut ablegen. Einen „Trigger deploy"-Knopf
gibt es bei einer Drop-Site nicht, den gibt es nur mit Git-Anbindung.

## Abschluss 23.08.2026 — was der Durchlauf gezeigt hat

Aufzeichnung: `validierung/echtlauf/abschluss_2026-08-23.json`.

**Zwei Dinge blockieren, und beide sind keine Werkzeugfehler.**

1. **Das Anthropic-Konto hat kein Guthaben.** Der Endpunkt lebt (Zugangscode
   greift, Schlüssel gesetzt), aber jeder Modellaufruf kommt zurück mit
   „Fehler beim Modellaufruf (400): Your credit balance is too low to access the
   Anthropic API." — im Browser und ebenso bei einem Aufruf mit `curl`. Ein
   **frischer** Auslesedurchlauf war damit nicht möglich. Gerechnet wurde auf der
   aufgezeichneten echten Auslese desselben Tages
   (`validierung/echtlauf/ziolkowski_lauf4_fenster.json`, 13 Räume, alle mit
   `herkunft.quelle = "Planauslese"`), über den Laden-Knopf ins Werkzeug geholt.
   Getippt wurde nichts.
2. **Die öffentliche Seite ist ein älterer Build.** Im ausgelieferten
   `index.html` kommen `seitenAusRaum`, `kern_lage`, `h_geschosshoehe`,
   `aussenwand_quelle` und `raumhoehe_geklammert` nicht vor. Der LIVE-Endpunkt
   fragt deshalb `umfang_m`, `aussenwand_m` und `ecken` gar nicht ab — kein Raum
   hat sie je geliefert, und auf Sebastians Referenzplan fallen weiterhin
   **13 von 13 Räumen auf das Quadrat durch**. Die Umfangsrechnung ist gebaut und
   durch Selbsttests gedeckt, aber an einem echten Plan noch nie gelaufen.
   Zum Ablegen liegt `api/WERKE_Heizlast_Web.zip` bereit; **das Ablegen selbst
   braucht Sebastians Freigabe.**

**Ziolkowski, Kopf des Kontrollblatts:** 6,95 kW · 36,9 W/m² · Hülle 426,15 m² ·
Spanne 5,9 bis 8,4 kW · 0 Fehler, 5 Warnungen, 2 Hinweise · „kein Maßstab
beteiligt" · Gegenproben 10 von 12 · 13 Grenzen. Gegen die Handrechnung des
Erdgeschosses (Umfang 41,00 m, lichte Höhe 2,52 m, Bruttowand 103,32 m²) liegt
das Werkzeug bei 104,37 m², also **+1,0 %**; die Höhe stimmt auf den Zentimeter.

**Der Prüfbildschirm zeigt auf diesem Plan nichts.** Beide Seiten sind reiner
Scan (kein Textstand, null Pfade); das Werkzeug sagt es im Klartext: „13 Räume
erkannt · 13 Punkte prüfen · 13 ohne Ort im Plan". Auf einem Vektorplan mit
Textstand (Dumach 1) sitzen dagegen alle 25 Marken im Raum.

**Neu: Raumhöhen unter dem Mindestmaß** (`zaehlerRaumhoehe` in
`src/modul_kontrollblatt.js`). Anlass war eine Gegenprobe: alle dreizehn Höhen um
0,50 m verkleinert ließ die Heizlast von 6,95 auf 5,91 kW fallen, und im Kopf
stand unverändert 0 Fehler, 5 Warnungen, 10 von 12. Das Erdgeschoss stand mit
2,02 m im Raumbuch. `KERN_ZUORDNUNG` kennt die Grenze (2,30 m) längst, benutzt
sie aber nur beim **Lesen**, um Türhöhen auszusortieren; das fertige Raumbuch
prüfte niemand. Die Zeile schließt das mit derselben Zahl und derselben
Fundstelle (Musterbauordnung § 47 Abs. 1). Sauberer Lauf: unverändert 0/5 und
10 von 12. Mit −0,50 m: 6 Warnungen, 10 von 13, Räume namentlich genannt.

**Eine Gegenprobe schlägt weiter nicht an, und das ist kein Versehen.** Nimmt man
einem Raum das Fenster-Bauteil weg und lässt die gelesene Fensterzahl stehen,
kommen 2 Fehler und die Zeile „Fenster auf dem Weg ins Raumbuch 6 von 8". Ändert
man **beides** — so, wie es aussieht, wenn das Modell ein Fenster schlicht
übersieht — bleibt alles still: 6,88 statt 6,95 kW, 0 Fehler, 10 von 12. Der
Gegenzähler ist dieselbe Auslese. Gegen ein übersehenes Fenster hilft nur ein
zweiter, unabhängiger Weg zur Fensterzahl; heute hat das Werkzeug ihn nicht, und
im Kontrollblatt steht die Absicht, ihn zu haben.

**Zweiter Plan (Dumach 1, Vektor, A1 hoch):** läuft ohne einen einzigen Eingriff
und ohne Endpunkt bis zur Raumliste — Maßstab 1:100 belegt, 25 Raumstempel,
206 Maßzahlen, drei Geschosstitel, 25 Räume übernommen. Eine Heizlast kommt
trotzdem nicht heraus: es entsteht **kein einziges Bauteil**, damit 5,07 kW reine
Lüftung und 13,7 W/m². Das Werkzeug behauptet nichts, es sperrt — 3 Fehler,
„Nicht belastbar", Gegenproben 1 von 3, 22 offene Zeilen. Der Weg vom
Flächenstempel zur Hülle fehlt; heute füllt ihn die Auslese, und die braucht
Guthaben.

## Offene Punkte

- **Fachliche Freigabe durch Sebastian Hund steht aus.** Bis dahin trägt jeder
  Bericht den Vermerk ENTWURF. Freigabe: in `src/modul_bericht.js` die Konstante
  `FREIGEGEBEN` auf `true` setzen und neu bauen.
- Norm-Außentemperatur für Kassel und Dortmund belegen (`src/daten/daten_klima.js`).
- Typologie: Baualtersklasse 1958 bis 1968 sowie die Reihen Reihenhaus und
  Mehrfamilienhaus sind in der Quelle nicht eindeutig zuzuordnen und deshalb nicht
  hinterlegt. Für die Baualtersklasse greift die nächstgelegene mit Vermerk; für ein
  Mehrfamilienhaus wird die Reihe Einfamilienhaus ersatzweise verwendet, und die
  Fundstelle sagt das ausdrücklich.
- **Für Neubauten ab Baujahr 2023 und für Nichtwohngebäude gibt es keine
  Startwerte.** Die Quelle ist von 2015; ihre jüngste Klasse beschreibt den Neubau
  nach EnEV 2016 und nennt zum Beispiel Fenster mit 1,30 W/(m²·K). Für einen Neubau
  unter dem heutigen Anforderungsniveau (Effizienzhaus 55 seit 2023) ist das grob
  falsch, und es stand grün mit Fundstelle da. Das Werkzeug liefert dort jetzt gar
  keinen U-Wert mehr, verweist auf GEG-Nachweis, Energieausweis oder
  Bauteilnachweise, und die Selbstprüfung meldet ausdrücklich, dass ihr in diesem
  Fall der unabhängige Erwartungswert fehlt. Grenze und Begründung stehen in
  `src/daten/daten_typologie.js` unter `GELTUNG_BIS`. Eine Typologie für
  Nichtwohngebäude und eine Klasse für den Neubau ab 2023 wären der nächste
  belegbare Schritt.
- Datenschutz: Beim Auslesen verlässt das Planbild den Rechner. Vor dem Rollout
  Auftragsverarbeitungsvertrag klären. Der Plankopf wird vor dem Senden
  automatisch geschwärzt.
- Dortmunder Briefkopf fehlt (wie im Lüftungskonzept-Tool).
