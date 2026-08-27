# Spezifikation der Berichtskapitel

Automatisch erzeugter Heizlastbericht des WERK.E Heizlast-Werkzeugs.
Messlatte: `~/Desktop/Claude/heizlast_maelzerstr59/Bericht_Heizlast_Maelzerstr59.pdf`
(17 Blätter; Blatt 1 ist das Deckblatt ohne Nummer, danach gilt physisches
Blatt = gedruckte Seite + 1. Alle Fundstellen unten nennen die **gedruckte**
Seitenzahl.)

Umfang dieser Spezifikation: Deckblatt und Kapitel 1 bis 7 sowie 10 bis 12 und
Anlage 1. **Kapitel 8 (Varianten) und Kapitel 9 (Wärmepumpe) sind ausdrücklich
nicht gefordert** und entfallen ersatzlos.

Rechenkern: `src/kerne/kern_heizlast_norm.js`, Funktion `rechne(projekt)`.
Im Folgenden ist `e` das Ergebnisobjekt von `rechne()` und `p` das Projekt
(Eingabe). Feldnamen sind wörtlich die des Kerns.

---

## 0 Vorbemerkungen für die Umsetzung

### 0.1 Kapitelnummerierung im automatischen Bericht

Da die Kapitel 8 und 9 entfallen, wird durchgezählt. Der bestehende Zähler
`kzahl()` / `uzahl()` in `src/modul_bericht.js` (Zeilen 256 f.) leistet das
bereits.

| neu | Titel | Referenz |
|---|---|---|
| — | Deckblatt | Titelblatt |
| 1 | Ergebnis auf einen Blick | Kap. 1, S. 1 |
| 2 | Objekt und Datengrundlage | Kap. 2, S. 2 |
| 3 | Planunterlagen | Kap. 3, S. 3–6 |
| 4 | Berechnungsgrundlagen | Kap. 4, S. 6–7 |
| 5 | Bauteile und U-Werte | Kap. 5, S. 7–8 |
| 6 | Unbeheizte Bereiche | Kap. 6, S. 9 |
| 7 | Raumweise Heizlast | Kap. 7, S. 9–10 |
| 8 | Offene Punkte vor der Beauftragung | Kap. 10, S. 12 |
| 9 | Plausibilitätsprüfungen | Kap. 11, S. 12 |
| 10 | Quellen, Annahmen und Konfidenz | Kap. 12, S. 13 |
| Anlage 1 | Bauteilweise Berechnung je Raum | S. 14–16 |

Kapitel 3 entfällt vollständig, wenn keine Planbilder vorliegen (so verhält
sich `planKapitel()` heute schon).

### 0.2 Zahlenformat, durchgehend

- Deutsches Format: Dezimalkomma, Tausenderpunkt ab vier Stellen
  (Referenz: „6.446", „9.092", „1.661").
- Leistungen in W ohne Nachkommastelle; in kW mit zwei Nachkommastellen
  (Referenz Kap. 1: „9,04 kW").
- Flächen 2 Nachkommastellen in der Raumtabelle und in Anlage 1,
  1 Nachkommastelle in der Bauteilbilanz.
- U-Werte 2 Nachkommastellen, in den Schichtblättern 3 („0,471 W/(m²·K)").
- Temperaturen 1 Nachkommastelle, Norm-Innentemperaturen ganzzahlig.
- Prozentwerte 1 Nachkommastelle, außer im Fließtext („71 Prozent").
- Umlaute echt. Keine Ersatzschreibung.

### 0.3 Drei Textklassen

Jeder Baustein unten trägt eine Kennzeichnung:

- **[FEST]** wörtlich übernehmbarer Textbaustein, ggf. mit Platzhaltern.
- **[RECHNUNG]** Wert kommt aus `e` oder ist daraus im Berichtsmodul ableitbar.
- **[EINGABE]** Wert kommt aus `p` (Fragebogen, Kontrollblatt, Planauslese).
- **[MODELL]** fachliche Bewertung, die formuliert werden muss. Dort steht
  jeweils, welche Zahlen dem Modell im Prompt vorliegen müssen und welche
  Grenzen gelten.

### 0.4 Zusätzliche Eingabefelder, die es heute noch nicht gibt

Der Referenzbericht braucht Angaben, die `p` bisher nicht führt. Sie gehören in
den Fragebogen bzw. in das Kontrollblatt und sind hier als neue Felder benannt:

| Feld | Zweck | Kapitel |
|---|---|---|
| `p.meta.gebaeudetyp` | „Dreifamilienhaus, Doppelhaushälfte" | Deckblatt, 2 |
| `p.meta.baujahr`, `p.meta.modernisierung` | Baualtersklasse, Typologie-Vorbelegung | Deckblatt, 2, 10 |
| `p.meta.zustand` | „nach Umsetzung von …" bzw. „Bestand" | Deckblatt |
| `p.meta.wohnflaeche`, `p.meta.wohnflaeche_quelle` | Bezugsfläche der spezifischen Heizlast | 1, 2, 9 |
| `p.meta.aussenmasse`, `p.meta.volumen` | Kenngrößentabelle | 2 |
| `p.meta.bearbeiter`, `p.meta.stand` | Deckblatt, Fußzeile | alle |
| `p.meta.grundlagen[]` | Liste der ausgewerteten Unterlagen | Deckblatt, 2 |
| `p.meta.aufmass_vor_ort` (bool) | steuert den Vorbehaltssatz | Deckblatt, 2 |
| `p.bauteiltypen[].beg_ziel` | Soll-U-Wert für Kap. 5, Spalte Anforderung | 5 |
| `p.bauteiltypen[].konfidenz` (`A`/`B`/`C`) | Kap. 10 | 5, 10 |
| `p.bauteiltypen[].quelle` | Kap. 5, 10 | 5, 10 |
| `p.offene_punkte[]` | Kap. 8 | 8 |
| `p.abgleiche[]` | Fremdbeleg-Abgleiche für Kap. 9 | 9 |

Ohne diese Felder bleibt die betreffende Zeile leer und wird als Lücke im
Kontrollblatt markiert; sie darf nicht erfunden werden.

---

## Deckblatt

**Fundstelle: Titelblatt (physisches Blatt 1).**

Überschrift zweizeilig: „Norm-Heizlast-berechnung" (Referenz umbricht nach
„Norm-Heizlast-"), darunter Objektanschrift als zweite Zeile:
`p.meta.strasse`, `p.meta.plz` `p.meta.ort`. **[EINGABE]**

Danach eine zweispaltige Tabelle **Angabe | Inhalt**:

| Zeile | Inhalt | Herkunft |
|---|---|---|
| Objekt | `p.meta.gebaeudetyp`, Baujahr `p.meta.baujahr` | **[EINGABE]** |
| Berechnungsgrundlage | „DIN EN 12831-1:2017-09 in Verbindung mit DIN/TS 12831-1:2020-04" | **[FEST]** |
| Baulicher Zustand | `p.meta.zustand` | **[EINGABE]** |
| Norm-Außentemperatur | `e.klima.theta_e` °C (PLZ `p.meta.plz`) | **[RECHNUNG]** |
| Ergebnis Gebäudeheizlast | `e.phi_gebaeude` / 1000, 2 Nachkommastellen, „kW" | **[RECHNUNG]** |
| Stand | `p.meta.stand` | **[EINGABE]** |
| Bearbeitung | `p.meta.bearbeiter` | **[EINGABE]** |

Fußblock links Firmenanschrift des gewählten Standorts (bestehende Funktion
`standort()` in `modul_bericht.js`), rechts „Aufgestellt von" mit Name und
Funktion. **[FEST]** je Standort.

Vorbehaltskasten unten, **[FEST]** mit Platzhaltern:

> Dieser Bericht ist eine Berechnung auf Grundlage {LISTE DER UNTERLAGEN}. Ein
> Aufmaß vor Ort hat nicht stattgefunden. Die als Konfidenzklasse C
> gekennzeichneten Annahmen in Abschnitt {N} sind vor der Beauftragung eines
> Wärmeerzeugers zu bestätigen.

{LISTE DER UNTERLAGEN} = `p.meta.grundlagen[]`, sprachlich verbunden.
Der mittlere Satz entfällt, wenn `p.meta.aufmass_vor_ort === true`.
{N} = Nummer des Konfidenzkapitels (nach Umnummerierung 10).

Wasserzeichen „ENTWURF", solange die fachliche Freigabe aussteht (Konstante
`FREIGEGEBEN` in `modul_bericht.js`).

---

## Kapitel 1 — Ergebnis auf einen Blick

**Fundstelle: S. 1.**

### 1.1 Tabelle „Größe | Wert | Verwendung"

Feste Zeilenfolge, keine Sortierung:

| Größe (Spalte 1, **[FEST]**) | Wert (Spalte 2) | Verwendung (Spalte 3) |
|---|---|---|
| Norm-Heizlast des Gebäudes | `e.phi_gebaeude`/1000, 2 NK, „kW" | „Auslegung des Wärmeerzeugers" **[FEST]** |
| davon Transmission | `e.phi_T_gebaeude`/1000, 2 NK, „kW" | `e.phi_T_gebaeude / e.phi_gebaeude * 100`, 0 NK, „Prozent" |
| davon Lüftung | `e.phi_V_gebaeude`/1000, 2 NK, „kW" | `e.phi_V_gebaeude / e.phi_gebaeude * 100`, 0 NK, „Prozent" |
| davon Aufheizleistung | `e.phi_RH_gebaeude`/1000, 2 NK | Zeile nur, wenn `e.phi_RH_gebaeude > 0` |
| Summe der Raumheizlasten | `e.phi_raeume_summe`/1000, 2 NK, „kW" | „Auslegung der Heizflächen je Raum" **[FEST]** |
| spezifische Heizlast | `e.phi_gebaeude / p.meta.wohnflaeche`, 1 NK, „W/m²" | „bezogen auf {`p.meta.wohnflaeche`, 2 NK} m² Wohnfläche" |
| Heizlast {Geschoss} | `e.je_geschoss[g].phi_gebaeude`/1000, 2 NK, „kW" | `e.je_geschoss[g].phi_gebaeude / e.je_geschoss[g].A`, 0 NK, „W/m² je m² Geschossfläche" (nur in der ersten Geschosszeile der Zusatz nach W/m²) |

Je Geschoss aus `e.je_geschoss` eine Zeile, in der Reihenfolge des Auftretens
in `p.raeume`.

**Wichtig, sonst falsch:** die Geschosszeilen verwenden
`e.je_geschoss[g].phi_gebaeude` (ohne interne Übertragung), **nicht**
`phi_raum`. Kontrolle an der Referenz: EG 2.957 W Raumsumme minus 16 W interne
Übertragung = 2.941 W → 2,94 kW, und 2.941 / 68,68 = 43 W/m². Ebenso gilt:
die spezifische Heizlast des Gebäudes bezieht sich auf die **Wohnfläche**
(160,03 m² → 56,5 W/m²) und darf nicht mit `e.spez_gebaeude` gefüllt werden,
das auf `e.A_gesamt` (206,04 m²) bezogen ist.

Fußnote unter der Tabelle, **[FEST]** mit Platzhaltern:

> Die Geschosswerte beziehen sich auf {A_GESCHOSS} m² Geschossfläche innerhalb
> der Umfassungswände. Die spezifische Heizlast des Gebäudes bezieht sich
> dagegen auf die Wohnfläche nach der Wohnflächenberechnung, damit sie mit
> üblichen Kennwerten vergleichbar bleibt.

{A_GESCHOSS} = `e.je_geschoss[g].A`, 2 NK. Bei ungleichen Geschossflächen
Aufzählung statt eines Wertes. Ist `p.meta.wohnflaeche` leer, entfällt die
Zeile „spezifische Heizlast" und die Fußnote wird ersetzt durch: „Eine
Wohnflächenangabe lag nicht vor; die spezifische Heizlast ist deshalb nur auf
die Summe der Raumflächen bezogen ({`e.spez_gebaeude`} W/m²)."

### 1.2 „Die drei Punkte, auf die es ankommt"

Überschrift **[FEST]**. Darunter drei nummerierte Blöcke, je mit einer fetten
Kernaussage und 3 bis 5 Sätzen Begründung. **[MODELL]** — das ist der
inhaltlich anspruchsvollste Textteil des Berichts.

Regeln für die Erzeugung:

- Genau drei Punkte, sortiert nach Wirkung auf das Ergebnis.
- Jeder Punkt muss mindestens eine Zahl aus der Rechnung nennen und darf keine
  Zahl nennen, die ihm nicht übergeben wurde.
- Kein Beratungsteil: keine Geräteempfehlung, keine Variantenrechnung, keine
  Wirtschaftlichkeit. Zulässig ist die Feststellung, welcher Bauteilbeitrag
  dominiert und welche Annahme das Ergebnis trägt.

Dem Modell vorzulegende Zahlen:

1. `e.bilanz` vollständig (Name, `A`, `U`, `phi`) plus Anteil an
   `e.phi_T_gebaeude` — für „welches Bauteil dominiert".
2. `e.je_geschoss` mit `phi_gebaeude` und `A` je Geschoss und daraus W/m² —
   für den Geschossvergleich.
3. `e.phi_gebaeude`, `e.phi_T_gebaeude`, `e.phi_V_gebaeude`,
   `e.phi_raeume_summe`, `e.klima.theta_e`.
4. Liste der Bauteile mit `p.bauteiltypen[].beg_ziel` und dem erreichten
   U-Wert, mit Kennzeichnung erfüllt / nicht erfüllt — für den Punkt
   „Anforderung verfehlt".
5. Alle Konfidenzklasse-C-Einträge (Kapitel 10) mit dem Feld, das sie
   betreffen — für den Punkt „welche Annahme trägt das Ergebnis".
6. Falls für einen offenen Punkt eine Vergleichsrechnung gefahren wurde
   (siehe Kapitel 8, Abschnitt „Wirkung"), deren Delta in W.

Wenn eine dieser Grundlagen fehlt, wird der betreffende Punkt weggelassen. Es
werden lieber zwei Punkte gedruckt als ein erfundener dritter.

---

## Kapitel 2 — Objekt und Datengrundlage

**Fundstelle: S. 2.**

### 2.1 Einleitender Absatz

**[MODELL]**, 3 bis 6 Sätze, rein beschreibend: Gebäudetyp, Anzahl
Nutzungseinheiten, Lage der Haustrennwand, Dachform und Neigung,
Firstrichtung, was daraus für die Hüllflächen folgt. Vorzulegen sind
`p.meta.*`, `p.plangebaeude` (Geschosse, Bauweise, Dachform, unbeheizte
Bereiche) und die Liste der Bauteilnamen aus `e.bilanz`. Keine Bewertung,
keine Zahl, die nicht in `p` steht.

### 2.2 Tabelle „Kenngröße | Wert | Quelle"

Alle Zeilen **[EINGABE]**, Spalte 3 ist die Quellenangabe des jeweiligen
Feldes. Zeilenfolge der Referenz:

| Kenngröße | Wert | Quelle |
|---|---|---|
| Baujahr, letzte Modernisierung | `p.meta.baujahr` / `p.meta.modernisierung` | Feldquelle |
| Gebäudetyp | `p.meta.gebaeudetyp` | Feldquelle |
| Außenmaße | `p.meta.aussenmasse` (m x m) | Feldquelle |
| Wandaufbau | Kurztext des Außenwandtyps aus `p.bauteiltypen` | Feldquelle |
| Geschosshöhe | Bruttohöhe / lichte Höhe je Regelgeschoss, 2 NK, „m" | Feldquelle |
| Drempel, Dachneigung | 2 NK m / Grad | Feldquelle |
| Kehlbalkendecke / oberer Abschluss | Höhe über Fußboden, 2 NK, „m" | Feldquelle |
| Wohnfläche | Einzelwerte + Summe, 2 NK, „m²" | `p.meta.wohnflaeche_quelle` |
| Gebäudevolumen | „rd. {x} m³" | Feldquelle |

Zeilen ohne Wert werden weggelassen, nicht mit Strich gefüllt.

### 2.3 „Warum die Geometrie belastbar ist"

Überschrift **[FEST]**. Absatz **[MODELL]**, aber nur zu drucken, wenn
mindestens ein bestandener Fremdbeleg-Abgleich aus `p.abgleiche[]` vorliegt
(siehe Kapitel 9). Dem Modell vorzulegen: je Abgleich Bezeichnung, Rechenwert,
Sollwert, Quelle des Sollwerts, Abweichung in Prozent, und was der Abgleich
mitbeweist. Liegt kein Fremdbeleg vor, entfällt der Abschnitt ersatzlos —
kein Ersatztext, der Belastbarkeit behauptet.

### 2.4 „Was nicht aus Unterlagen stammt"

Überschrift **[FEST]**. Einleitung **[FEST]**, wenn kein Aufmaß stattfand:

> Ein Aufmaß vor Ort hat nicht stattgefunden.

Danach **[MODELL]**: ein Satz, der die Konfidenzklasse-C-Punkte aus Kapitel 10
in Prosa aufzählt, plus **[FEST]**:

> Alle diese Punkte sind in Abschnitt {N} mit ihrer Wirkung auf das Ergebnis
> beziffert.

Der Verweis wird nur gesetzt, wenn Kapitel 8 tatsächlich eine bezifferte
Wirkung enthält, sonst „… in Abschnitt {N} aufgeführt."

---

## Kapitel 3 — Planunterlagen

**Fundstelle: S. 3 bis 6, Abbildungen 1 bis 5.**

Weitgehend vorhanden in `planKapitel()` (`modul_bericht.js` ab Zeile 261).
Sollzustand:

Einleitung **[FEST]**:

> Grundlage der Berechnung sind die nachfolgend abgebildeten Planunterlagen.
> Sie wurden für diesen Bericht mit den Maßen und Flächen beschriftet, die in
> die Rechnung eingegangen sind. Die grünen Eintragungen stammen aus dieser
> Auswertung, alles Übrige ist Originalbestand der Zeichnung.

Ist die Vorlage eine kontrastarme Blaupause und wurde sie aufbereitet, wird
ergänzt **[FEST]**: „Die Zeichnungen sind Blaupausen; sie wurden für diesen
Bericht im Kontrast aufbereitet."

Je Bild: Abbildung in Seitenbreite, darunter „**Abbildung {n}.** {Bezeichnung}."
plus **[MODELL]**-Bildunterschrift, 1 bis 3 Sätze. Das Modell bekommt dafür:
Blattbezeichnung, Geschoss, Anzahl ausgewerteter Räume, Summe ihrer Flächen
(2 NK), ob der Maßstab gesetzt wurde, die zum Blatt gehörenden Einträge aus
`p.planbefunde[]` (`thema`, `aussage`, `herleitung`, `konfidenz`) und die
Maßketten aus der Auslese (`massketten[].text`, `bedeutung`). Die
Bildunterschrift darf nur belegen, was auf diesem Blatt zu sehen ist.

Danach zwei Untertabellen, beide bereits implementiert:

- **„Was den Unterlagen zu entnehmen ist"** — `p.plangebaeude`: Geschosse,
  Bauweise, Dachform, unbeheizte Bereiche. **[EINGABE]**
- **„Aus den Unterlagen abgeleitet"** — Spalten **Thema | Ergibt sich |
  Herleitung | Sicherheit**, gefüllt aus `p.planbefunde[]`. **[EINGABE]**
  Einleitung **[FEST]**: „Die folgenden Angaben stehen nicht als Zahl in der
  Zeichnung, sondern folgen aus ihr. Die Herleitung ist jeweils genannt, damit
  sie nachvollziehbar bleibt."

Warnkästen, unverändert übernehmen: nicht bestandene Eignungsprüfung
(`p.planFreigabeGrund`) und „In den Unterlagen nicht enthalten"
(`p.planluecken[]`).

---

## Kapitel 4 — Berechnungsgrundlagen

**Fundstelle: S. 6 und 7.**

### 4.1 Verfahren

Die Formeltabelle in `modul_bericht.js` (Zeilen 113 ff.) bleibt wie sie ist.
Sie ist vollständig **[FEST]**: Φ_HL,i, Φ_T,i, Φ_V,i, maßgebender
Volumenstrom, erdberührte Bauteile mit f_g1/f_g2/G_w, unbeheizte Bereiche.

### 4.2 Klima und Innentemperaturen

Tabelle **Größe | Wert | Fundstelle**:

| Größe | Wert | Fundstelle |
|---|---|---|
| Norm-Außentemperatur θe | `e.klima.theta_e`, 1 NK, „°C" | `p.klima.quelle` |
| Jahresmitteltemperatur θe,m | `e.klima.theta_e_m`, 1 NK, „°C" | `p.klima.quelle`, sonst „dto." |
| Standorthöhe | `p.klima.hoehe`, „m ü. NN" | „dto." |
| je verwendeter Raumart eine Zeile | `RAUMARTEN[art].theta_i`, 0 NK, „°C" | `RAUMARTEN[art].quelle` |
| je fester Nachbartemperatur eine Zeile | `theta` aus `grenzt_an.typ === "fest"` | Feldquelle, z. B. DIN/TS 12831-1 Tab. 4 |

Die Raumart-Zeilen werden aus den tatsächlich vorkommenden `r.art` erzeugt
und in einer Zeile zusammengefasst, wenn sie dieselbe Temperatur teilen
(Referenz: „Wohn- und Schlafräume, Küche, Diele | 20 °C").
Fehlt eine Quelle, erscheint an ihrer Stelle rot „Quelle nicht angegeben" —
so verhält sich das Modul heute schon.

### 4.3 Lüftung

**[FEST]** mit Platzhaltern, Werte aus der Rechnung:

> Der Lüftungswärmeverlust wird nach DIN EN 12831-1, Abschnitt 6.3, aus dem
> größeren der beiden Volumenströme aus hygienischem Mindestluftwechsel und
> Infiltration gebildet. Der Mindestluftwechsel beträgt für alle Räume
> {n_min} pro Stunde. Da die Infiltration bei n50 = {n50} pro Stunde und einem
> Abschirmkoeffizienten von {e} nur {n_inf} pro Stunde erreicht, ist in allen
> Räumen der Mindestluftwechsel maßgebend. Die Wahl von n50 hat deshalb keinen
> Einfluss auf das Ergebnis.

- {n_min}: `e.raeume[].n_min` **[RECHNUNG]**, „für alle Räume" nur wenn
  einheitlich, sonst Bereichsangabe.
- {n50}: `p.luftdichtheit.n50` **[EINGABE]**.
- {e}: `e.raeume[].e` **[RECHNUNG]**.
- {n_inf}: `e.raeume[].v_inf / e.raeume[].V`, 2 NK **[RECHNUNG]**.
- Der letzte Satz gilt nur, wenn `e.raeume.every(r => r.massgebend ===
  "Mindestluftwechsel")`. Sonst **[MODELL]**-Satz, der nennt, in wie vielen
  Räumen die Infiltration maßgebend wird und um wie viel W es dabei geht
  (vorzulegen: je Raum `v_inf`, `v_min`, `v_dot`, `massgebend`, `phi_V`).

Ist `p.luftdichtheit.kategorie !== "messung"`, ergänzen **[FEST]**:
„n50 ist eine Annahme, keine Messung."

### 4.4 Wärmebrücken

**[FEST]** mit Platzhaltern:

> Angesetzt ist der pauschale Zuschlag ΔU_WB = {wert} W/(m²·K) auf alle
> Bauteile gegen Außenluft und gegen unbeheizte Bereiche. Das entspricht dem
> Ansatz ohne gesonderten Nachweis. Der Zuschlag macht rd. {phi_wb} kW der
> Heizlast aus.

- {wert}: `e.norm.DELTA_U_WB`, 2 NK **[RECHNUNG]**.
- {phi_wb}: **[RECHNUNG, abgeleitet]** — im Berichtsmodul zu bilden als
  `Σ über alle e.raeume[].bauteile mit kat === "huelle" von
  A * (U_eff − U) * (theta_i − theta_j)`, in kW mit 2 NK. Der Kern liefert
  diesen Wert nicht fertig; er darf nicht geschätzt werden.
- Der Satz zur Angemessenheit bei Kerndämmung im Referenzbericht ist
  objektbezogen und daher **[MODELL]**, optional: nur drucken, wenn die
  Hülle Bauteile mit Kerndämmung enthält.

### 4.5 Maßbezug

**[FEST]**, wörtlich:

> Gerechnet wird mit Innenmaßen. Die dadurch nicht erfassten Wandanschlüsse
> und Ecken sind im Wärmebrückenzuschlag enthalten. Die Bauteilflächen dieses
> Berichts sind daher kleiner als die Außenmaßflächen.

---

## Kapitel 5 — Bauteile und U-Werte

**Fundstelle: S. 7 und 8.**

### 5.1 Übersichtstabelle

Spalten: **Bauteil | U [W/(m²·K)] | BEG EM Anforderung | Bewertung**

| Spalte | Quelle | Format |
|---|---|---|
| Bauteil | `p.bauteiltypen[].name` inkl. Aufbaukurztext | Text **[EINGABE]** |
| U | `p.bauteiltypen[].U` bzw. Ergebnis der Schichtrechnung | 2 NK **[EINGABE/RECHNUNG]** |
| BEG EM Anforderung | `p.bauteiltypen[].beg_ziel` | 2 NK, oder Text („Kerndämmung: nur λ <= 0,035"), oder „-" |
| Bewertung | abgeleitet | „erfüllt" / „NICHT erfüllt" / „Bauteil bleibt" / „nur bei Dämmung relevant" |

Ableitungsregel Bewertung **[RECHNUNG, abgeleitet]**:
- kein `beg_ziel` gesetzt → „Bauteil bleibt" (Bestandsbauteil ohne Maßnahme);
- `beg_ziel` numerisch und `U <= beg_ziel` → „erfüllt";
- `beg_ziel` numerisch und `U > beg_ziel` und Bauteil ist Teil der Maßnahme →
  „NICHT erfüllt";
- `beg_ziel` numerisch, Bauteil ist Bestand ohne geplante Maßnahme →
  „nur bei Dämmung relevant".

Sortierung wie in `p.bauteiltypen` (Reihenfolge der Erfassung), nicht nach
U-Wert.

Fußnote **[FEST]**, Fassung nachführbar halten:

> Anforderungen nach Förderrichtlinie BEG Einzelmaßnahmen, Fassung vom
> {DATUM}, Anlage Technische Mindestanforderungen, Spalte Wohngebäude ohne
> Denkmaleigenschaft.

**Datenlücke:** `src/daten/daten_bauteile.js` führt heute keine
BEG-Anforderungen. Dafür ist eine eigene Datendatei nötig
(`daten_beg_anforderungen.js`) mit Fassungsdatum, Fundstelle und je
Bauteilkategorie dem Soll-U-Wert. Die im Referenzbericht (S. 7) belegten
Werte sind: Fenster und Fenstertüren 0,95; Dachflächen 0,14; oberste
Geschossdecke 0,14; Kellerdecke 0,25; Haustür 1,3; Kerndämmung ohne U-Wert,
nur λ ≤ 0,035. Diese Werte sind mit Fassungsdatum zu hinterlegen und bei jeder
BEG-Änderung zu prüfen; ohne hinterlegten Wert bleibt die Spalte leer statt
geraten.

### 5.2 Schichtaufbauten

Je Bauteil mit Schichtaufbau ein eigener Block. Überschrift = Bauteilname mit
Aufbau (Referenz: „Außenwand zweischalig, Kerndämmung 6 cm WLG 035").

Tabelle, Spalten: **Schicht | d [m] | λ | R [m²·K/W]**

| Zeile | Inhalt | Format |
|---|---|---|
| Wärmeübergang innen Rsi | d und λ leer | R 3 NK |
| je Schicht | Label, `d`, `lambda`, `d/lambda` | d 3 NK, λ 3 NK, R 3 NK |
| Wärmeübergang außen Rse | d und λ leer | R 3 NK |
| Summe R | | 3 NK |
| U-Wert = 1 / Summe R [+ Zuschlag] | | 3 NK, Einheit „W/(m²·K)" |

Die Zeilenbeschriftung der letzten Zeile enthält den Zuschlag, wenn einer
gesetzt ist: „U-Wert = 1 / Summe R + 0,01". Darunter, falls vorhanden, die
Begründung des Zuschlags als Kleintext **[EINGABE]**, z. B. „Zuschlag 0,01
W/(m²·K) für Drahtanker und Restfugen der Einblasdämmung", sowie die
Wärmestromrichtung **[RECHNUNG, aus `uebergang`]**, z. B. „Wärmestromrichtung
abwärts" oder „Wärmestromrichtung aufwärts, oberer Abschluss unbeheizter
Spitzboden".

Alles liefert `DATEN_BAUTEILE.uWert()` bereits mit
(`zeilen[]` mit Label, d, λ, R sowie Summe und U). Rsi/Rse kommen aus
`UEBERGAENGE[uebergang]`.

Für Bauteile ohne Schichtaufbau (Fenster, Türen) entfällt der Block; ihr
U-Wert steht in 5.1 mit Quelle.

---

## Kapitel 6 — Unbeheizte Bereiche

**Fundstelle: S. 9.**

Einleitung **[FEST]**:

> {Bereiche} sind nicht Teil der beheizten Hülle. Ihre Temperatur unter
> Auslegungsbedingungen wurde nach DIN/TS 12831-1 aus einer stationären
> Wärmebilanz bestimmt und nicht pauschal angenommen.

{Bereiche} = Namen aus `p.zonen[].name`. Der Satz gilt nur für Zonen mit
`modus === "bilanz"`; Zonen mit `modus === "fest"` werden separat als
„fest vorgegeben" ausgewiesen.

Tabelle, Spalten: **Bereich | Wärmestrom nach | H [W/K] | Temperatur | Ergebnis**

Je Zone mehrere Zeilen (eine Zeile je Wärmestromrichtung), danach eine Zeile
„gewichtetes Mittel" mit dem Ergebnis in der letzten Spalte.

| Spalte | Herkunft | Format |
|---|---|---|
| Bereich | `p.zonen[].name`, nur in der ersten Zeile | Text |
| Wärmestrom nach | Gruppenname, siehe unten | Text |
| H [W/K] | Summe `A * U` der Gruppe | 1 NK |
| Temperatur | Temperatur des Nachbarn der Gruppe | 1 NK, „°C" |
| Ergebnis | `e.zonen[id]` | 1 NK, „°C", nur in der Mittelzeile |

Gruppierung der Wärmestromrichtungen (Text wie in der Referenz):
- „oben, beheizte Räume ({θ} °C)" bzw. „unten, {Geschoss} ({θ} °C)" —
  Beiträge der beheizten Räume, also alle `p.raeume[].bauteile` mit
  `grenzt_an.typ === "zone"` und passender `ref`;
- „Außenluft ({Bauteile})" — `z.huelle[]` mit `grenzt_an.typ === "aussen"`,
  θ = `e.klima.theta_e`;
- „Erdreich ({Bauteile})" — `z.huelle[]` mit `grenzt_an.typ === "erdreich"`,
  θ = `e.klima.theta_e_m`;
- je weiterer Zone bzw. fester Temperatur eine eigene Zeile.

**Lücke im Kern:** `zonenTemperaturen()` liefert nur `e.zonen` (Temperatur je
Zone) und `e.zonen_iterationen`. Die H-Anteile je Richtung gibt der Kern nicht
heraus. Das Berichtsmodul muss sie selbst aus `p.zonen[].huelle` und den
Zonenbauteilen der Räume bilden — mit derselben Regel wie der Kern, also
**ohne** Wärmebrückenzuschlag (Kern, Abschnitt 4: „ohne
Wärmebrückenzuschlag"). Nur so stimmt das gewichtete Mittel mit `e.zonen`
überein. Diese Gegenrechnung ist zugleich eine Prüfung: weicht das
nachgerechnete Mittel um mehr als 0,05 K von `e.zonen[id]` ab, ist der Bericht
zu blockieren.

Fußtext **[MODELL]**, 2 bis 4 Sätze, Bewertung der errechneten Temperaturen.
Vorzulegen: je Zone Name, Ergebnistemperatur, die H-Werte je Richtung,
`e.klima.theta_e`, und je angrenzendem Hüllbauteil der U-Wert. Zusätzlich der
Temperaturkorrekturfaktor der trennenden Bauteile, gebildet als
`(θi − θ_zone) / (θi − θe)` — die Referenz nennt hier 0,56 gegenüber „oft
pauschal verwendeten 0,5". Erlaubt ist die Einordnung, ob die Temperatur zum
Zonentyp passt; nicht erlaubt sind Empfehlungen.

---

## Kapitel 7 — Raumweise Heizlast

**Fundstelle: S. 9 und 10.**

### 7.1 Raumtabelle

Spalten in dieser Reihenfolge, alle **[RECHNUNG]**:

| # | Kopf | Feld | Format |
|---|---|---|---|
| 1 | Gesch. | `r.geschoss` | Text |
| 2 | Raum | `r.raum` | Text |
| 3 | θi | `r.theta_i` | 0 NK |
| 4 | A [m²] | `r.A` | 2 NK |
| 5 | h [m] | `r.h` | 2 NK |
| 6 | V [m³] | `r.V` | 1 NK |
| 7 | V_Luft [m³/h] | `r.v_dot` | 1 NK |
| 8 | Φ_T Hülle [W] | `r.phi_T_huelle` | 0 NK |
| 9 | Φ_T innen [W] | `r.phi_T_innen` | 0 NK |
| 10 | Φ_V [W] | `r.phi_V` | 0 NK |
| 11 | Φ_HL [W] | `r.phi_raum` | 0 NK, fett |

Ist `e.phi_RH_gebaeude > 0`, wird zwischen 10 und 11 die Spalte
„Φ_RH [W]" = `r.phi_RH` eingefügt.

Summenzeile: Beschriftung „Summe" über die ersten drei Spalten,
dann `e.A_gesamt` (2 NK), Spalte h bleibt leer, `e.V_gesamt` (1 NK),
Σ `r.v_dot` (1 NK), `e.phi_T_gebaeude` (0 NK), Σ `r.phi_T_innen` (0 NK),
`e.phi_V_gebaeude` (0 NK), `e.phi_raeume_summe` (0 NK).

Fußnote **[FEST]** mit einem Platzhalter, wörtlich aus der Referenz:

> Φ_T Hülle enthält die Verluste an Außenluft, an den unbeheizten Keller, an
> den Spitzboden und an das Nachbargebäude. Φ_T innen ist der Wärmeaustausch
> mit Räumen abweichender Temperatur innerhalb des Gebäudes; er ist für die
> Auslegung der Heizflächen erforderlich, hebt sich in der Gebäudebilanz aber
> auf. Negative Werte bedeuten, dass der Raum von Nachbarräumen Wärme erhält.
> Die Heizlast des Gebäudes ist deshalb nicht die Summe der Raumheizlasten,
> sondern {`e.phi_gebaeude`} W.

Die Aufzählung im ersten Satz ist aus den tatsächlich vorkommenden
Nachbarschaften zu bilden: Außenluft immer, dann je unbeheizter Zone deren
Name, „an das Nachbargebäude" nur bei Bauteilen mit `kat === "nachbar"`,
„an das Erdreich" nur bei `kat === "erdreich"`.

### 7.2 Bauteilbilanz des Gebäudes

Überschrift **[FEST]**: „Bauteilbilanz des Gebäudes".
Quelle: `e.bilanz`, absteigend nach `phi` sortiert (so macht es
`modul_bericht.js` bereits).

Spalten: **Bauteil | Fläche [m²] | U [W/(m²·K)] | Φ_T [W] | Anteil [%]**

| Spalte | Feld | Format |
|---|---|---|
| Bauteil | Schlüssel von `e.bilanz` | Text |
| Fläche | `bilanz[k].A` | 1 NK |
| U | `bilanz[k].U` | 2 NK |
| Φ_T | `bilanz[k].phi` | 0 NK, Tausenderpunkt |
| Anteil | `bilanz[k].phi / e.phi_T_gebaeude * 100` | 1 NK |

Abschlusszeile „Transmission gesamt": Σ Flächen (1 NK),
U-Spalte leer, `e.phi_T_gebaeude` (0 NK), „100,0".

Fußnote **[FEST]**, wörtlich:

> Die Flächen sind Innenmaßflächen, die U-Werte ohne Wärmebrückenzuschlag
> angegeben; im Wärmestrom ist der Zuschlag enthalten.

**Hinweis zur Gruppierung:** `rechne()` gruppiert über
`bt.name.split(" (")[0]` und übernimmt den U-Wert des zuerst gefundenen
Bauteils. Bauteile gleichen Namens mit unterschiedlichem U-Wert würden
falsch dargestellt. Das Berichtsmodul muss das prüfen und in diesem Fall
statt der Zahl „gemischt" ausgeben.

---

## Kapitel 8 (Referenz: 10) — Offene Punkte vor der Beauftragung

**Fundstelle: S. 12.**

Tabelle, Spalten: **Punkt | Warum er zählt | Wirkung auf die Heizlast**

| Spalte | Herkunft |
|---|---|
| Punkt | `p.offene_punkte[].titel` — Handlungsanweisung, nicht Zustandsbeschreibung („Aufbau der Dachschräge klären (Bauteilöffnung oder Endoskopie)") |
| Warum er zählt | **[MODELL]**, 1 bis 3 Sätze |
| Wirkung auf die Heizlast | **[RECHNUNG, abgeleitet]**, siehe unten |

**Quelle der Zeilen:** automatisch erzeugt aus allen Einträgen der
Konfidenzklasse C in Kapitel 10, ergänzt um Einträge, die der Bearbeiter im
Kontrollblatt selbst gesetzt hat, und um jede nicht erfüllte
BEG-Anforderung aus Kapitel 5 (dort ist der offene Punkt die Erhöhung der
Dämmstärke).

**Wirkung beziffern ohne Variantenkapitel:** Kapitel 8 der Referenz entfällt,
die Spalte „Wirkung" bleibt aber die Substanz dieses Kapitels. Sie wird
erzeugt, indem `rechne()` je offenem Punkt ein zweites Mal mit genau einem
geänderten Parameter aufgerufen wird (Alternativwert aus dem
Konfidenz-C-Eintrag) und die Differenz `phi_gebaeude_alt − e.phi_gebaeude`
ausgewiesen wird: „{x} kW mehr" bzw. „{x} kW weniger", 2 NK, bzw.
„unter 0,01 kW". Das ist eine reine Kernrechnung im Browser, kostet nichts
und ist keine Variantenberatung — es wird kein Variantenkapitel gedruckt,
sondern nur die Empfindlichkeit des offenen Punktes benannt.

Ist kein Alternativwert hinterlegt, steht dort „nicht beziffert" und, wenn
förderrechtlich relevant, der Zusatz „förderrechtlich aber entscheidend".
Bei Punkten ohne Wirkung auf die Zahl: „keine, aber maßgebend für {Grund}"
(Referenz: „keine, aber maßgebend für die Wirtschaftlichkeit").

Dem Modell für Spalte 2 vorzulegen: Titel des Punktes, der aktuell angesetzte
Wert, der Alternativwert und seine Herkunft, das Delta in kW, die betroffenen
Bauteile mit Fläche und U-Wert, und die zugehörige BEG-Anforderung, falls
vorhanden.

---

## Kapitel 9 (Referenz: 11) — Plausibilitätsprüfungen

**Fundstelle: S. 12.**

Tabelle, Spalten: **Prüfung | Ergebnis | Sollwert | Quelle des Sollwerts | Status**

Zahlen in Ergebnis und Sollwert mit 2 NK. Status: „bestanden" /
„Abweichung" / „nicht bestanden".

Zeilen, die die Automatik selbst erzeugen kann:

| Prüfung | Ergebnis | Sollwert | Quelle des Sollwerts |
|---|---|---|---|
| Bilanzschluss Σ Φ_Raum − Σ interne Übertragung = Φ_Gebäude | `e.phi_raeume_summe − Σ r.phi_T_innen` | `e.phi_gebaeude` | „Modellinterne Kontrolle" |
| Konvergenz der Zonenbilanz | nachgerechnetes Mittel je Zone | `e.zonen[id]` | „Stationäre Bilanz, Gegenrechnung im Bericht" |
| spezifische Heizlast bezogen auf die Wohnfläche | `e.phi_gebaeude / p.meta.wohnflaeche` | Mitte des Erwartungsbands | Quervergleich mit der Gebäudetypologie, `kern_pruefung.js`, Prüfung `quer` |
| U-Wert-Nachweis je Bauteil mit Schichtaufbau | `DATEN_BAUTEILE.uWert()` | `p.bauteiltypen[].U` | „Schichtrechnung DIN EN ISO 6946" |
| Summe der Raumflächen gegen Wohnfläche | `e.A_gesamt` | `p.meta.wohnflaeche` | `p.meta.wohnflaeche_quelle` |
| Rechenkern-Selbsttest | Anzahl bestandener Tests | Anzahl Tests | `KERN_HEIZLAST_NORM.selbsttest()` |

Zeilen, die einen Fremdbeleg brauchen (`p.abgleiche[]`, vom Bearbeiter
eingetragen): Hüllflächen- oder Volumenabgleich gegen eine KfW-Datei, eine
Handwerkerrechnung, eine Wohnflächenberechnung, eine Rückrechnung H_T. Ohne
Eintrag entfällt die Zeile.

Die weiteren Befunde aus `kern_pruefung.js` (`pruefeAlles()` liefert
`{pruefungen: [{id, titel, stufe, text, zahl}], ampel, zaehl}`) werden
darunter als eigene Untertabelle **Stufe | Befund | Text** gedruckt, wie es
`pruefKapitel()` heute schon tut, ergänzt um die Ampel („Belastbar" /
„Mit Einschränkung belastbar" / „Nicht belastbar").

Schlusssatz **[FEST]**, angepasst an das Werkzeug (der Referenzsatz zur
Excel-Arbeitsmappe ist objektbezogen):

> Der Rechenkern führt bei jedem Start {n} Selbsttests gegen von Hand
> gerechnete Normbeispiele aus. Sie waren zum Zeitpunkt dieser Berechnung
> vollständig bestanden.

{n} = `selbsttest().anzahl`. Bei nicht bestandenem Selbsttest wird der Bericht
nicht ausgegeben.

---

## Kapitel 10 (Referenz: 12) — Quellen, Annahmen und Konfidenz

**Fundstelle: S. 13.**

### 10.1 Definition der Klassen

**[FEST]**, wörtlich, als Vorspann in Kleinschrift:

> A bedeutet: aus einer Originalunterlage entnommen oder maßstäblich
> abgegriffen. B bedeutet: normativer Tabellenwert oder daraus abgeleitet.
> C bedeutet: fachliche Annahme, die vor der Ausführung zu bestätigen ist.

### 10.2 Tabelle

Spalten: **Klasse | Angabe | Quelle bzw. Begründung**.
Sortierung: A, dann B, dann C; innerhalb der Klasse in Erfassungsreihenfolge.

### 10.3 Vergaberegeln, abgeleitet aus dem Referenzbericht

**Klasse A** — im Referenzbericht vergeben für: Baujahr und letzte
Modernisierung; Gebäudetyp und Haustrennwand; Außenmaße und Wandstärke;
Geschosshöhe und lichte Höhe; Drempel, Dachneigung, Kehlbalkendecke;
Wohnflächen und Raummaße; Norm-Außentemperatur, Jahresmittel, Standorthöhe;
Kenngrößen aus Fremdunterlagen (Kerndämmfläche der Nachbarhälfte,
Gebäudevolumen, Hüllfläche, Fensterfläche, H'T aus der KfW-Datei); die vom
Auftraggeber vorgegebenen Zielwerte der Maßnahme („Vorgabe Sebastian Hund,
13.08.2026").

Regel für die Automatik: A, wenn der Wert aus einer benannten Unterlage
stammt und die Auslese ihn mit `konfidenz: "sicher"` und einer Fundstelle
gemeldet hat, oder wenn der Bearbeiter ihn im Kontrollblatt mit Quellenangabe
überschrieben hat. Der zweite Fall ist die im Auftrag genannte Regel
„Überschreibungen gelten als belegt" — sie gilt nur mit Quellentext, sonst
bleibt es B oder C.

**Klasse B** — im Referenzbericht vergeben für: Norm-Innentemperaturen
(DIN/TS 12831-1 Tab. 32, Zeilen 1, 7, 9); Temperatur des Nachbargebäudes
(Tab. 4); Mindestluftwechsel n_min = 0,5 1/h (Tab. 12);
Wärmebrückenzuschlag 0,10 W/(m²·K) pauschal ohne Nachweis; die U-Werte der
gedämmten Bauteile aus der Schichtrechnung nach DIN EN ISO 6946.

Regel für die Automatik: B für alle Werte aus `daten_raumarten.js`,
`daten_klima.js`, `daten_bauteile.js` und `daten_typologie.js`, die dort
`belegt: true` und eine `quelle` tragen, sowie für jeden Wert, der aus solchen
Werten gerechnet wurde. Die Quelle wird wörtlich aus dem Datensatz
übernommen.

**Klasse C** — im Referenzbericht vergeben für: den U-Wert der ungedämmten
Dachschräge (dort ausdrücklich als LEITPARAMETER markiert);
Kellergeschosshöhe und erdberührter Anteil; die Fensterliste; die Annahme
Treppenhaus beheizt auf 15 °C; die Frage, ob Giebel und Drempel
kerngedämmt sind; U-Wert und Aufbau der Haustrennwand.

Regel für die Automatik: C für jeden Wert, der
- aus `daten_typologie.js` stammt (Typologie-Vorbelegung nach Baujahr; die
  Datei schreibt selbst vor, sie „im Bericht ausnahmslos als Annahme"
  auszuweisen), oder
- aus einem Datensatz mit `belegt: false` stammt, oder
- von der Planauslese mit `konfidenz: "unsicher"` oder `"geraten"` kam und
  im Kontrollblatt nicht mit Quelle bestätigt wurde, oder
- als `bauteil.annahme === true` gesetzt ist.

Zusatzregel **Leitparameter**: der C-Eintrag mit dem größten Anteil an
`e.phi_T_gebaeude` wird mit dem Präfix „LEITPARAMETER." versehen und als
erster C-Eintrag gedruckt.

Die Begründungsspalte jedes C-Eintrags nennt **[MODELL]** in einem Satz, was
zu tun ist, um die Annahme zu ersetzen, und mit welchem Delta in kW zu rechnen
ist (Zahl aus der Vergleichsrechnung nach Kapitel 8). Ohne Delta kein
Deltasatz.

### 10.4 Schlusskasten

**[FEST]**, wörtlich, mit einem Platzhalter:

> Diese Berechnung ersetzt keinen hydraulischen Abgleich und keine
> Heizflächenauslegung. Sie ist die Grundlage dafür. Für eine Förderzusage des
> BAFA ist eine normkonforme Heizlastberechnung erforderlich; dieser Bericht
> erfüllt die formalen Anforderungen, sobald die in Abschnitt {N} genannten
> Punkte geklärt und die betroffenen Annahmen ersetzt sind.

{N} = Nummer des Kapitels „Offene Punkte" (nach Umnummerierung 8).
Gibt es keine offenen Punkte, endet der Satz nach „erforderlich; dieser
Bericht erfüllt die formalen Anforderungen."

---

## Anlage 1 — Bauteilweise Berechnung je Raum

**Fundstelle: S. 14 bis 16.**

Einleitung **[FEST]**, wörtlich bis auf den Verweis auf die Arbeitsmappe:

> Vollständige Aufstellung aller Bauteile. f ist der Temperaturkorrekturfaktor
> (θi minus θj) geteilt durch (θi minus θe). U_eff enthält den
> Wärmebrückenzuschlag, soweit das Bauteil zur Gebäudehülle gehört.

Tabelle über alle Räume, gruppiert. Erste Spalte nur in der ersten Zeile eines
Raums gefüllt (Referenz: „EG Wohnzimmer"), Format
`{r.geschoss} {r.raum}`.

Spalten: **Raum | Bauteil | A [m²] | U | U_eff | θi | θj | f | Φ_T [W]**

| # | Kopf | Feld | Format |
|---|---|---|---|
| 1 | Raum | `r.geschoss` + `r.raum` | Text, nur erste Zeile |
| 2 | Bauteil | `bt.name` | Text |
| 3 | A [m²] | `bt.A` | 2 NK |
| 4 | U | `bt.U` | 2 NK |
| 5 | U_eff | `bt.U_eff` | 2 NK |
| 6 | θi | `r.theta_i` | 0 NK |
| 7 | θj | `bt.theta_j` | 1 NK |
| 8 | f | abgeleitet, siehe unten | 3 NK |
| 9 | Φ_T [W] | `bt.phi` | 0 NK |

**f ist kein Kernfeld** und im Berichtsmodul zu bilden:
- Regelfall: `f = (r.theta_i − bt.theta_j) / (r.theta_i − e.klima.theta_e)`.
  Kontrolle an der Referenz: Kellerdecke EG,
  (20 − 3,53) / (20 − (−9,6)) = 0,556.
- Für `bt.kat === "erdreich"`: `f = e.norm.F_G1 * bt.f_g2 * e.norm.G_W`,
  und θj wird mit `e.klima.theta_e_m` ausgewiesen. Im Referenzbericht kommt
  dieser Fall nicht vor, weil der Keller als unbeheizte Zone geführt ist.

Die Bauteilreihenfolge innerhalb eines Raums bleibt die Eingabereihenfolge
(Referenz: erst Hüllbauteile, dann Innenbauteile). Negative Φ_T werden mit
Minuszeichen gedruckt, nicht farblich hervorgehoben.

Keine Summenzeile je Raum — die Referenz hat keine; die Summen stehen in
Kapitel 7.

Bei mehr als etwa 200 Zeilen wird die Anlage über mehrere Seiten geführt, mit
wiederholtem Tabellenkopf (`thead` + `display: table-header-group`).

---

## Was eine Automatik aus Plänen NICHT gewinnen kann

Die folgenden Angaben des Referenzberichts sind aus Grundrissen und Schnitten
grundsätzlich nicht ableitbar. Für jede steht dahinter, was stattdessen im
Bericht erscheinen soll.

| Angabe | Woher sie im Referenzbericht kam | Was die Automatik stattdessen tut |
|---|---|---|
| Norm-Außentemperatur, Jahresmittel, Standorthöhe | Klimadatensatz DIN/TS 12831-1 zur PLZ | Aus `daten_klima.js` nur, wenn die PLZ dort `belegt: true` ist. Sonst Pflichtfeld im Fragebogen mit Quellenangabe; ohne Wert bricht `rechne()` bereits mit einer Warnung ab. Kein geschätzter Ersatzwert. |
| Baujahr und letzte Modernisierung | Objektakte | Fragebogen, Pflichtfeld. Steuert zugleich die Typologie-Vorbelegung. |
| Schichtaufbau der Bestandsbauteile (Dachschräge, Haustrennwand, Außenwand) | Fachliche Annahme, im Bericht Klasse C, ausdrücklich Leitparameter | Vorbelegung aus `daten_typologie.js` nach Baujahr, im Bericht immer Klasse C, immer in Kapitel 8 mit beziffertem Delta, und die Aufforderung zu Bauteilöffnung oder Endoskopie. |
| Geplante Maßnahme und ihre Zielwerte (Uw 0,95; 6 cm WLG 035; 20 cm Zellulose; 10 cm WLG 035) | Vorgabe des Auftraggebers, mit Datum | Fragebogen „Was ist geplant", Klasse A nur mit Nennung von Person und Datum. |
| Wohnfläche nach Wohnflächenberechnung | Objektakte 2020 | Fragebogen. Ohne sie entfällt die spezifische Heizlast in Kapitel 1 und die entsprechende Prüfzeile in Kapitel 9. Aus Plänen ermittelte Flächen sind Raumflächen, keine Wohnfläche nach WoFlV (Dachschrägenanrechnung, Balkone). |
| Alle Abgleiche gegen Fremdunterlagen (Kerndämmfläche 182 m², KfW-Volumen 828 m³, H'T 1,411 W/(m²·K), Fensterfläche 49 m²) | KfW-Antragsbestätigung und Handwerkerrechnung der Nachbarhälfte | Optionale Eingabemaske `p.abgleiche[]`. Liegt nichts vor, entfällt Kapitel 2.3 „Warum die Geometrie belastbar ist" ersatzlos und Kapitel 9 zeigt nur die modellinternen Prüfungen. Es darf kein Text erscheinen, der Belastbarkeit ohne Beleg behauptet. |
| Nutzung des Dachgeschosses (beheizt oder Bodenraum) | Widerspruch zwischen Wohnflächenberechnung und Aufmaßplan, fachlich entschieden | Kontrollblatt-Rückfrage je Geschoss „beheizt / unbeheizt / teilweise". Bei Widerspruch zwischen zwei Unterlagen: beide Werte im Kontrollblatt zeigen, Entscheidung erzwingen, Ergebnis als Klasse C mit Delta in Kapitel 8. |
| Ob das Treppenhaus Heizflächen bekommt | Annahme, Klasse C, 0,37 kW Wirkung | Fragebogen mit Vorbelegung 15 °C nach DIN/TS 12831-1 Tab. 32 Zeile 9, Klasse C, Delta über die Vergleichsrechnung. |
| Temperatur des Nachbargebäudes | DIN/TS 12831-1 Tab. 4, mittlere Dämmung, gestützt auf den bekannten Sanierungsstand des Nachbarn | Auswahlfeld mit den Tabellenwerten. Der Dämmzustand des Nachbarn ist eine Eingabe, keine Planinformation. |
| Kellergeschosshöhe und erdberührter Anteil | Annahme Hochkeller, weil die Kellerfenster über Gelände liegen | Aus Plänen nur bei bemaßtem Schnitt mit Geländelinie. Sonst Fragebogen, Klasse C. |
| n50 | Angesetzt, nicht gemessen | Fragebogen mit Kategorie „Messung / Annahme". Bei Annahme Hinweis in Kapitel 4.3. Solange der Mindestluftwechsel maßgebend ist, ohne Einfluss — das ist im Bericht auszuweisen. |
| Fenstergrößen und Uw des Bestands | Bemaßung 1936, Abgleich mit der KfW-Datei | Auslese liefert Positionen, selten Maße. Kontrollblatt mit Pflichtbestätigung je Fenster; unbestätigt bleibt Klasse C. |
| Bestehende Heizkörper je Raum | Nicht erhoben, als offener Punkt geführt | Fester Eintrag in Kapitel 8: „Vorhandene Heizkörper je Raum aufnehmen — keine Wirkung auf die Heizlast, aber maßgebend für die Vorlauftemperatur." |
| Bauherr, Projektnummer, Bearbeiter, Stand, Standort | Stammdaten | Fragebogen. Der Plankopf wird für die Auslese bewusst abgeschnitten (Datenschutz, `BAUPLAN.md` Abschnitt 5). |
| Die drei Kernaussagen in Kapitel 1 und die Bewertungstexte | Fachliche Wertung des Bearbeiters | **[MODELL]** nach den oben genannten Regeln, ausschließlich auf Basis übergebener Zahlen, und im Kontrollblatt vor der Ausgabe zur Freigabe vorgelegt. |
| Wärmebrückenzuschlag „identisch mit dem Ansatz der KfW-Datei Nr. 61" | Fremdbeleg | Ohne Fremdbeleg nur „pauschal nach DIN/TS 12831-1 ohne gesonderten Nachweis". |

Grundsatz für alle Fälle: fehlt ein Wert, erscheint er im Kontrollblatt als
Lücke und im Bericht entweder als Klasse-C-Annahme mit Quelle „Vorbelegung aus
der Gebäudetypologie nach Baujahr" oder gar nicht. Eine Zahl ohne Herkunft
darf in keinem Kapitel stehen.

---

## Anhang: Kernfelder, die der Bericht braucht, aber nicht bekommt

Drei Werte des Referenzberichts liefert `rechne()` nicht und das
Berichtsmodul muss sie nachbilden. Der Kern bleibt dabei unverändert.

| Wert | Kapitel | Bildungsvorschrift |
|---|---|---|
| Anteil des Wärmebrückenzuschlags an der Heizlast | 4.4 | `Σ A * (U_eff − U) * (θi − θj)` über alle Bauteile mit `kat === "huelle"` |
| H je Wärmestromrichtung einer unbeheizten Zone | 6 | `Σ A * U` je Nachbargruppe, ohne Wärmebrückenzuschlag; Gegenprobe gegen `e.zonen[id]` |
| Temperaturkorrekturfaktor f je Bauteil | Anlage 1 | `(θi − θj) / (θi − θe)`, für erdberührte Bauteile `F_G1 * f_g2 * G_W` |

---

## Nachtrag: Woher die [MODELL]-Texte kommen

Die fünf bewertenden Stellen dieses Berichts werden nicht von Hand
nachgetragen, sondern aus den Rechenergebnissen erzeugt. Zuständig ist
`src/modul_bewertung.js` zusammen mit der Betriebsart `bewertung` des
Endpunkts `api/netlify/functions/plan-auslesen.mjs`. Sie bekommt **kein Bild**,
sondern ein Zahlenpaket.

### Wo die Texte landen

| Stelle | Schlüssel in `p.texte` | Höchstlänge |
|---|---|---|
| 1.2 Die drei Punkte | `kap1_punkte[i].kern` / `.text` | 110 / 620 Zeichen |
| 2.1 Beschreibung des Objekts | `kap2_einleitung` | 900 |
| 2.3 Warum die Geometrie belastbar ist | `kap2_geometrie` | 700 |
| 2.4 Was nicht aus Unterlagen stammt | `kap2_nicht_belegt` | 600 |
| 6 Einordnung der Zonentemperaturen | `kap6_bewertung` | 650 |
| 8 Spalte „Warum er zählt" | `offene_punkte[<schluessel>]` | 340 |

Fehlt ein Schlüssel, entfällt der Absatz. Der Bericht bleibt ohne die Texte
vollständig lesbar; das ist der Normalfall und kein Mangel.

### Das Zahlenpaket

`MODUL_BEWERTUNG.daten(p, e)` baut es aus `objekt`, `ergebnis`, `geschosse`,
`bauteilbilanz` (absteigend nach Wärmestrom), `raeume` (absteigend nach
spezifischer Heizlast), `beg_bewertung`, `unbeheizte_bereiche`, `konfidenz_c`,
`offene_punkte` und `abgleiche`. **Jede Zahl ist bereits deutsch formatiert
und trägt ihre Einheit**, genau so, wie sie im Bericht steht. Das Modell soll
abschreiben, nicht rechnen; jede Rechenoperation wäre eine Gelegenheit, eine
Zahl zu erfinden. Die Schlüssel der offenen Punkte sind dieselben, die
`offenePunkte()` in `modul_bericht.js` bildet, sonst liefe der Text ins Leere.

### Die Zahlenprüfung

`MODUL_BEWERTUNG.pruefeZahlen()` prüft jeden erzeugten Absatz gegen das
übergebene Paket, mit zwei Schlüsseln:

1. **Wert.** Eine geschriebene Zahl gilt als belegt, wenn sie eine korrekte
   Rundung einer Zahl aus dem Paket ist. „rd. 27 m²" ist damit für 27,1 m²
   zulässig, „1.700 W" für 1.661 W nicht. Zahlen aus Herkunftsangaben
   (`quelle`, `herkunft_alternative`, `schluessel`) zählen nicht mit.
2. **Einheit.** Steht hinter der Zahl eine Einheit, die im ganzen Paket nicht
   vorkommt, ist die Aussage nicht belegt, auch wenn die Zahl zufällig trifft.
   So fällt „20 cm Dämmung" durch, obwohl 20 als Innentemperatur im Paket
   steht.

Ein beanstandeter Absatz wird **nicht** übernommen, sondern mit rot markierten
Zahlen vorgelegt. Übernehmen kann ihn nur ein Mensch, der ausdrücklich
„geprüft, trotzdem übernehmen" ankreuzt. Grund: ein Bericht ohne Bewertung ist
ein Rechenprotokoll, ein Bericht mit einer erfundenen Zahl ist ein
Haftungsfall.

**Grenze der Prüfung, bewusst offengelegt:** Ein Paket enthält einige hundert
Werte. Eine glatte Zahl ohne Einheit trifft davon fast immer eine und kommt
durch. Die Prüfung ersetzt deshalb das Lesen nicht, sie fängt den groben
Fehler.
