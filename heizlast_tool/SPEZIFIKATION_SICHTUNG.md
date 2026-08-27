# Spezifikation Sichtung — Stufe 1: jede Seite einzeln einordnen

Der Bearbeiter lädt bis zu zehn Dateien hoch, Bilder oder PDF, ohne Beschriftung und in
beliebiger Reihenfolge. Darin stecken Grundrisse mehrerer Geschosse, Schnitte, Ansichten,
Lagepläne, vielleicht Details, Fotos und Unterlagen, die gar nicht zum Gebäude gehören.
Dieses Dokument beschreibt den ersten von zwei Schritten: die schnelle, billige Sichtung
**jeder einzelnen Seite**. Was danach kommt — Seiten in eine Reihenfolge bringen, Geschosse
zusammenführen, kacheln, auslesen — steht in `SPEZIFIKATION_FORMATE.md` Abschnitt 5 und 6.

**Herkunft der Zahlen.** Die Bildtoken sind **gerechnet**, nach der veröffentlichten Formel
(Q1), und die Rechnung ist gegen die veröffentlichte Beispieltabelle geprüft: für 200×200,
1000×1000, 1092×1092, 1456×819, 1269×952 und 2576×1449 px liefert sie exakt die dort
genannten 64, 1296, 1521, 1560, 1564 und 4784 Token. Die Preise stehen in Q2. Die
Auflösungs- und Lesbarkeitswerte für echte Pläne sind **gemessen**, aber nicht hier, sondern
in `SPEZIFIKATION_FORMATE.md` 5.2 bis 5.5; sie werden zitiert, nicht neu erfunden. Die
Texttokenmengen für Systemprompt und Schema sind **geschätzt** über die Zeichenzahl; das ist
im Text jeweils so gekennzeichnet und in O1 als vor dem Bau zu messen vermerkt.

---

## 1 Ergebnis in fünf Zeilen

1. **Zehn Klassen, davon eine ausdrücklich für Ratlosigkeit** (`unklar`). Ohne diese Klasse
   zwingt man das Modell zu einer falschen Entscheidung, statt eine unsichere zu bekommen.
2. **Die Sichtung sortiert nichts aus.** Sie ordnet ein und beziffert ihre Unsicherheit. Ob
   eine Seite fällt, entscheiden zwei unabhängige Urteile plus der Bearbeiter, nie das
   Modell allein.
3. **1288 px lange Kante** je Seite. Das sind bei DIN-Formaten 1518 Bildtoken und damit die
   Standardstufe voll ausgenutzt, ohne dass die Schnittstelle etwas wegwirft. Größer bringt
   nichts, weil bei einem Standardmodell ohnehin bei 1568 Token verkleinert wird.
4. **`claude-haiku-4-5`**, ein Aufruf je Seite, bis zu vier nebenläufig. Zehn Seiten kosten
   rund **5 US-Cent** und liegen damit bei 2,5 % des Budgets von zwei Euro.
5. Ein **technischer Fehlschlag wird nie zu „unbrauchbar"**, sondern zu `unklar`. Das ist der
   Unterschied zwischen einer Seite, die der Bearbeiter sieht, und einer, die verschwindet.

---

## 2 Wozu die Sichtung da ist — und wozu nicht

| | |
|---|---|
| **Sie beantwortet** | Was ist das für ein Blatt? Wie viel steckt drin? Wo auf dem Blatt? Lohnt die teure Auslese? In welcher Reihenfolge? |
| **Sie beantwortet nicht** | Wie heißen die Räume? Wie groß sind sie? Welche Maßketten stehen drauf? Welcher Maßstab gilt in Pixeln? Gehört das Blatt zum selben Gebäude wie die anderen? |

Die letzte Frage ist die wichtigste Abgrenzung. Ob zwei Blätter zu einem Gebäude gehören,
kann ein Modell, das **eine** Seite sieht, nicht wissen. Es würde raten. Diese Frage wird
später im Browser aus dem Vergleich von Projektbezeichnung, Ort und Gebäudekontur über alle
Seiten hinweg beantwortet — deterministisch und nachvollziehbar.

Die zweite Abgrenzung: **der Maßstab wird nie vom Modell gesetzt.** Das steht so schon im
`BAUPLAN.md` und bleibt. Die Sichtung liest eine Maßstabsangabe nur als Text ab, weil sie ein
starkes Klassenmerkmal ist — 1:5 ist ein Detail, 1:500 ein Lageplan — und weil sie später als
Plausibilitätsprobe gegen die zwei Klicks des Bearbeiters dient.

---

## 3 Die Klassen — und warum genau diese

Eine Klasse ist nur dann berechtigt, wenn sie zu einer **anderen Behandlung** führt. Klassen,
die alle im selben Topf landen, kosten Genauigkeit und bringen nichts. Deshalb steht neben
jeder Klasse, was die Heizlastberechnung nach DIN EN 12831-1 daraus zieht.

| Klasse | Was die Heizlast daraus zieht | Behandlung in Stufe 2 |
|---|---|---|
| `grundriss` | Raumaufteilung, Raumflächen, Maßketten, Fenster- und Türlagen, Nachbarschaftsbedingung je Wand. Die einzige Quelle für das Raumbuch | **gekachelt**, teuerster Weg, siehe FORMATE 5.5 |
| `schnitt` | Lichte Raumhöhen (in die Volumenberechnung und damit direkt in Φ_V), Geschosshöhen, Dachneigung und Kniestock, Lage der Kellerdecke und die Erdreichberührung für f_x | ganze Seite, **eine** Auslese, nicht gekachelt |
| `ansicht` | Fensteranzahl und Fensterformate als Gegenprobe zum Grundriss, Geländeanschluss, Anbausituation | ganze Seite, **eine** Auslese |
| `lageplan` | Anbausituation und damit, ob eine Außenwand als Wand gegen ein Nachbargebäude gerechnet wird, Orientierung, Ort für die Norm-Außentemperatur | nur, wenn die Anbausituation sonst unklar bleibt |
| `detail` | Anschlussausbildung. Wird ausschließlich gebraucht, wenn der Wärmebrückenzuschlag ΔU_WB unter dem Pauschalwert angesetzt werden soll | nicht automatisch, nur auf Anforderung |
| `bauteilnachweis` | U-Werte und Schichtaufbauten, n50 aus einem Blower-Door-Protokoll, Baujahr, Baubeschreibung. Der ganze Bauteilteil der Rechnung, den ein Grundriss nie hergibt | **Textauslese**, kein Kachelweg |
| `foto` | Kein Maß. Aber ein Beleg für Bauart, Fenstergeneration und Zustand, der im Anhang des Berichts steht | nicht ausgelesen, wandert in den Anhang |
| `fremddokument` | Nichts | nicht ausgelesen |
| `unbrauchbar` | Nichts, weil nicht lesbar | nicht ausgelesen |
| `unklar` | Noch offen | ausgelesen, wenn das Budget reicht, sonst dem Bearbeiter vorgelegt |

### 3.1 Warum `bauteilnachweis` eine eigene Klasse ist und nicht „Textseite"

`SPEZIFIKATION_FORMATE.md` 6.1 erkennt „Text ohne Pfade und ohne Bilder" schon lokal, ganz
ohne Modell, und nennt das eine Beschreibung. Das genügt hier nicht. Eine Textseite kann eine
Baubeschreibung mit U-Werten sein — dann fehlt ohne sie die halbe Rechnung — oder eine
Rechnung des Dachdeckers. Der Unterschied ist inhaltlich und nicht aus der Struktur des PDF
zu holen. Deshalb bekommt die Textseite eine eigene Klasse und die Sichtung entscheidet, in
welchen der beiden Töpfe sie fällt.

### 3.2 Warum `unklar` eine echte Klasse ist

Ein Modell, das sich zwischen zehn Klassen entscheiden **muss**, entscheidet sich auch dann,
wenn es nichts erkennt. Das Ergebnis sieht dann genauso aus wie eine sichere Einordnung. Mit
`unklar` bekommt die Ratlosigkeit einen eigenen Ausgang und wird sichtbar, statt sich als
falsche Sicherheit zu tarnen. Ergänzt wird sie durch das Feld `zweitklasse` (Abschnitt 4.1):
eine Rangfolge aus zwei Kandidaten fängt den knappen Fehlgriff ab, den eine einzelne Antwort
verschluckt.

### 3.3 Verwechslungen, die in echten Projektordnern wirklich vorkommen

Diese fünf stehen deshalb wörtlich im Systemprompt. Ohne sie sind es genau die Stellen, an
denen eine Klassifikation kippt.

| Sieht aus wie | Ist aber | Woran man es erkennt |
|---|---|---|
| Grundriss | `ansicht` (Dachaufsicht) | Keine Raumstempel, keine Türschwenke, dafür Firstlinie und Dachflächen |
| Grundriss | `detail` (Decken- oder Bewehrungsplan) | Gleicher Umriss, aber Träger- und Stahlbezeichnungen statt Raumnamen |
| Grundriss | `lageplan` | Flurstücksgrenzen, Straße, Nachbargebäude, Maßstab 1:250 bis 1:1000 |
| Kein Grundriss | ist trotzdem `grundriss` | Möblierungsplan, Verkaufsplan, Exposéplan — der Raumgrundriss ist da |
| Kein Grundriss | ist trotzdem `grundriss` | Heizungs-, Elektro- oder Entwässerungsplan auf Grundrissunterlage. **Hier steckt die Geometrie vollständig drin**, nur mit einer Fachplanung überlagert |

Die letzten beiden Zeilen sind die wertvollen. Eine Fachplanung auf Grundrissunterlage
auszusortieren heißt, ein Geschoss zu verlieren, obwohl es vorlag.

### 3.4 Was `fremddokument` ausdrücklich **nicht** heißt

`fremddokument` heißt: das ist überhaupt keine Bauunterlage zu diesem Vorgang. Rechnung,
Angebot, Behördenschreiben, Werbung. Es heißt **nicht**: gehört zu einem anderen Gebäude.
Das kann an einer einzelnen Seite niemand entscheiden, und wenn man das Modell danach fragt,
fängt es an zu raten, sobald ihm eine Projektbezeichnung unbekannt vorkommt. Die Frage
gehört in den Vergleich über alle Seiten, siehe Abschnitt 2 und 9, S6.

---

## 4 Was jede Seite außerdem liefern muss

Grundregel für alle Textfelder: **das Modell liest, der Code vereinheitlicht.** Es gibt
`geschoss_text: "1.OG"` zurück, nicht `ebene: 1`. Die Zuordnung von „1.OG", „1. Obergeschoss",
„OG1" und „Etage 1" auf dieselbe Ebene ist eine Tabelle im Code: deterministisch, im
Selbsttest prüfbar, jederzeit erweiterbar, ohne einen einzigen Modellaufruf. Dieselbe Regel
gilt schon für die Raumnamen im bestehenden Endpunkt (`plan-auslesen.mjs`, Regel 4 im
Systemprompt) und wird hier fortgeführt.

### 4.1 Klassenurteil

| Feld | Warum |
|---|---|
| `klasse` | Die vorherrschende Art der Seite. Trägt ein Blatt mehrere Zeichnungen, die für die Heizlast wertvollste. Das ist, was der Bearbeiter in der Übersicht sieht |
| `zweitklasse` | Die zweitwahrscheinlichste Klasse oder `null`. Kostet ein Aufzählungstoken und verwandelt eine harte Entscheidung in eine Rangfolge. Zentral für die Absicherung, siehe 9, S3 |
| `konfidenz` | `sicher` / `unsicher` / `geraten`, dieselbe Skala wie im bestehenden Endpunkt und im Rechenkern (G16). Steuert, ob eine Seite überhaupt fallen darf |

### 4.2 Geschossbezeichnung

Gefragt wird nur, was **angeschrieben** ist: `geschoss_text` wörtlich, sonst `null`. Steht
nichts da, gibt es ein zweites, getrenntes Feld `geschoss_indiz` — ein Satz dazu, woran man es
trotzdem erkennt („Treppe mit Pfeil aufwärts und Kellerfenster, vermutlich Kellergeschoss").
Die Trennung ist Absicht: Abgelesenes und Erschlossenes dürfen im Bericht nicht in derselben
Spalte stehen. Der Rechenkern verlangt diese Trennung ohnehin (SPEZIFIKATION_RECHENKERN G16,
Herkunft und Konfidenz).

### 4.3 Maßstabsangabe

`massstab_text` wörtlich, auf Blattebene und noch einmal je Zeichnung, falls abweichend. Zwei
Verwendungen, beide **nicht** die Skalierung:

* **Klassenmerkmal.** Ein Blatt in 1:5 bis 1:20 ist ein Detail, 1:250 bis 1:1000 ein
  Lageplan. Wo die Zeichnung mehrdeutig ist, ist der Maßstab oft eindeutig.
* **Plausibilitätsprobe.** Nachdem der Bearbeiter den Maßstab mit zwei Klicks gesetzt hat,
  lässt sich prüfen, ob das zum angeschriebenen Maßstab und zum Blattformat passt. Weicht es
  um mehr als, Annahme, 15 % ab, ist entweder falsch geklickt oder das Blatt ist
  nicht maßstäblich ausgedruckt. Das ist der Fehler, der sonst jede Fläche verzieht.

### 4.4 Gebäudekontur

Je Zeichnung ein `rahmen` als Anteil der Blattbreite und Blatthöhe (0 bis 1, auf Zehntel
genau) und eine grobe `kontur_form`. Drei Gründe, in dieser Reihenfolge:

1. **Mehrere Zeichnungen auf einem Blatt erkennen.** EG und OG nebeneinander auf einem A3 ist
   der Regelfall, nicht die Ausnahme. Wer das übersieht, führt in Stufe 2 zwei Geschosse zu
   einem zusammen und merkt es nie. Deshalb ist `zeichnungen` eine Liste, keine Einzelangabe.
2. **Kacheln sparen.** In Stufe 2 wird nur der Rahmen gekachelt, nicht das leere Blatt. Ein
   Rechenbeispiel: eine Zeichnung, die 0,4 × 0,6 eines A3 quer einnimmt, misst 168 × 178 mm.
   Bei 254 dpi deckt eine Kachel 193 mm ab (FORMATE 5.5) — es genügt also **eine** Kachel
   statt der sechs, die das ganze Blatt braucht. Das ist der Faktor sechs an der teuersten
   Stelle des ganzen Ablaufs.
3. **Blätter einander zuordnen.** Gleiche Kontur über mehrere Seiten heißt: gleiches Gebäude.
   Eine deutlich andere Kontur ist der Anlass, beim Bearbeiter nachzufragen.

Der Rahmen ist ausdrücklich grob. Die Dokumentation weist darauf hin, dass Koordinaten- und
Lokalisierungsangaben näherungsweise sind (Q1, Abschnitt Limitations). Für „welche Ecke des
Blattes" reicht das; für Geometrie wird er nie verwendet.

### 4.5 Plankopfangaben

Aufgenommen werden `titel_text`, `blattnummer_text`, `massstab_text`, `datum_text`,
`projekt_text`, `ort_text` und ein vermutetes `format_vermutet`.

**Nicht aufgenommen werden:** Name und Anschrift des Bauherrn, Namen von Planern und
Bearbeitern, Unterschriften, Rufnummern, E-Mail-Adressen. Diese Regel steht schon im
bestehenden Endpunkt und wird wörtlich fortgeführt.

**Ort und Postleitzahl des Bauvorhabens sind ausgenommen und werden erhoben.** Begründung:
Die Norm-Außentemperatur θe hängt am Standort (DIN/TS 12831-1, Klimadatensatz je PLZ, im
Werkzeug als `daten_klima.js`), und ohne θe gibt es keine Heizlast. Ort und Postleitzahl
allein sind kein Personenbezug; Straße und Hausnummer bleiben deshalb ausgeschlossen, weil
sie zusammen mit einem Namen einen Personenbezug herstellen würden. Wer die vollständige
Anschrift braucht, hat sie ohnehin im Projektstammblatt.

Für Blätter, deren Plankopf abgedeckt werden soll, bleibt das Schwärzen des oberen Streifens
aus `modul_ki.js` verfügbar. Achtung: der Plankopf sitzt nach DIN EN ISO 7200 unten rechts,
nicht oben — die heutige Schwärzung von 12 % der Bildhöhe oben trifft ihn nicht (O5).

### 4.6 Anzahl erkennbarer Räume

`raeume_erkennbar` je Zeichnung, eine ganze Zahl, ausdrücklich als grobe Zählung umschlossener
oder beschrifteter Flächen. Die Namen werden hier **nicht** gelesen — das ist die teure Arbeit
von Stufe 2. Drei Verwendungen:

* Trennt einen Grundriss von einer Dachaufsicht (0 Räume) und von einem Deckenplan.
* Kostenschätzung für Stufe 2: viele Räume heißt mehr Kacheln und mehr Ausgabetoken.
* **Rückkopplung.** Findet Stufe 2 auf einem Blatt deutlich weniger Räume, als die Sichtung
  gezählt hat, stimmt etwas nicht. Siehe 9, S8.

Im Zweifel wird aufgerundet. Eine zu niedrige Zahl würde eine Seite nach hinten schieben.

### 4.7 Ebenen im Schnitt

`ebenen_erkennbar` je Zeichnung: bei Schnitt und Ansicht die Zahl der erkennbaren
Geschossebenen einschließlich Keller und Dachgeschoss, sonst 0. Ein einziges Feld, aber es
trägt die schärfste Vollständigkeitsprüfung des ganzen Ablaufs: Zeigt der Schnitt vier
Ebenen und liegen nur drei Grundrisse vor, fehlt ein Grundriss. Siehe 9, S6.

### 4.8 Lesbarkeit

`lesbarkeit` als `gut` / `eingeschraenkt` / `schlecht`, dazu `lesbarkeit_grund` in einem Satz.
Das ist bewusst ein **zweites** Urteil neben `kern_planpruefung.js`, das dieselbe Frage rein
rechnerisch aus Schärfe, Kontrast, Tintenanteil und Schräglage beantwortet und `geeignet` /
`eingeschraenkt` / `ungeeignet` liefert. Zwei unabhängige Zeugen, siehe 9, S4.

Wichtig für den Bau: `pruefeBild()` läuft auf dem Bild in **Arbeitsauflösung**, nicht auf der
Sichtungsverkleinerung und schon gar nicht auf der 0,25er-Vorschau. Eine Schärfemessung an
einem verkleinerten Bild misst die Verkleinerung, nicht den Plan.

---

## 5 Der Systemprompt im Wortlaut

Zur Länge: Der Prompt ist rund 3.100 Zeichen lang und damit nicht minimal. Das ist Absicht
und kein Widerspruch zur Forderung nach einer kurzen, schnellen Antwort. **Der Prompt
bestimmt, wie gut eingeordnet wird; das Schema und die Kürze-Regel bestimmen, wie lang die
Antwort wird.** Die Klassendefinitionen und die fünf Verwechslungspaare sind genau die
Stelle, an der die Trefferquote entsteht — sie zu streichen spart im Vorlauf ein paar tausend
Token und kostet Seiten. Kurz gehalten wird stattdessen die **Ausgabe**: geschlossene
Aufzählungen statt Freitext, ein Satz Obergrenze für jedes Freitextfeld, kein Nachdenkmodus.

```text
Du sichtest EINE Seite aus einem Stapel Bauunterlagen und ordnest sie ein. Ziel ist eine
raumweise Heizlastberechnung nach DIN EN 12831-1. Die Sichtung entscheidet nur, welche
Seiten später genau ausgewertet werden. Du wertest hier nichts aus.

Grundsatz: Eine fälschlich als unbrauchbar eingestufte Seite kostet den Bearbeiter Räume,
ohne dass er es merkt. Eine zu viel mitgenommene Seite kostet nur Rechenzeit. Entscheide
dich im Zweifel für die Klasse, die mehr Inhalt verspricht, und für "unklar", wenn du dich
nicht entscheiden kannst.

Klassen:
grundriss — waagerechter Schnitt durch ein Geschoss mit Räumen. Auch dann, wenn eine
  Fachplanung darüber liegt (Heizung, Elektro, Entwässerung): der Raumgrundriss zählt.
schnitt — senkrechter Schnitt. Zeigt Geschosshöhen, Dachneigung, Kellerlage.
ansicht — Außenansicht oder Dachaufsicht. Keine Räume, aber Fenster und Gelände.
lageplan — Grundstück mit Nachbarbebauung, Straße, Nordpfeil, meist 1:250 bis 1:1000.
detail — Ausschnitt eines Anschlusses, meist 1:1 bis 1:20.
bauteilnachweis — Text oder Tabelle zu Bauteilen: U-Werte, Schichtaufbauten,
  Wärmeschutznachweis, Energieausweis, Blower-Door-Protokoll, Baubeschreibung.
foto — Lichtbild eines Gebäudes oder Bauteils.
fremddokument — überhaupt keine Bauunterlage zu diesem Vorgang: Rechnung, Angebot,
  Behördenschreiben, Werbung. Ob eine Zeichnung zu einem anderen Gebäude gehört, kannst
  du an einer einzelnen Seite nicht entscheiden. Das ist nicht deine Aufgabe.
unbrauchbar — gehört wohl dazu, ist aber nicht auswertbar: leere Seite, Deckblatt,
  unscharf, stark verdreht, abgeschnitten.
unklar — du kannst dich nicht entscheiden. Diese Klasse ist ausdrücklich erlaubt.

Häufige Verwechslungen:
- Eine Dachaufsicht sieht aus wie ein Grundriss, hat aber keine Raumstempel und keine
  Türschwenke. Das ist eine ansicht.
- Ein Decken- oder Bewehrungsplan hat denselben Umriss wie ein Grundriss, trägt aber
  Träger- und Stahlbezeichnungen statt Raumnamen. Das ist ein detail.
- Ein Lageplan zeigt Flurstücke, Straße und Nachbargebäude, nicht Räume.
- Ein Möblierungs- oder Verkaufsplan ist trotzdem ein grundriss.
- Ein Heizungs-, Elektro- oder Entwässerungsplan auf Grundrissunterlage ist trotzdem ein
  grundriss. Die Raumaufteilung steckt vollständig darin.

Regeln:
1. Texte gibst du wörtlich wieder, wie sie auf dem Blatt stehen. Du vereinheitlichst nichts
   und übersetzt nichts. Steht nichts da, schreibst du null.
2. Du rechnest nichts um und schätzt keine Maße. Den Maßstab liest du nur ab; gesetzt wird
   er später vom Bearbeiter am Bildschirm.
3. Räume zählst du grob: umschlossene Flächen mit Beschriftung oder Raumstempel. Die
   Raumnamen liest du hier nicht. Im Zweifel zählst du auf.
4. Trägt ein Blatt mehrere Zeichnungen, etwa EG und OG nebeneinander, legst du für jede
   einen eigenen Eintrag unter "zeichnungen" an. Sonst geht ein Geschoss verloren.
5. Den Rahmen einer Zeichnung gibst du als Anteil der Blattbreite und Blatthöhe an, auf
   Zehntel genau. Grob genügt.
6. Personenbezogene Angaben gibst du nicht wieder: Name und Anschrift des Bauherrn, Namen
   von Planern, Unterschriften, Rufnummern. Ort und Postleitzahl des Bauvorhabens nennst
   du, sie werden für die Norm-Außentemperatur gebraucht.
7. Die Konfidenz gibst du ehrlich an. "geraten" ist ein zulässiges Ergebnis.
8. Fasse dich kurz. Freitextfelder höchstens ein Satz.

Bekommst du zwei Bilder, ist Bild 1 das ganze Blatt und Bild 2 ein Ausschnitt des Plankopfs.
```

Als Benutzernachricht folgt nur das Bild beziehungsweise die beiden Bilder mit den
Beschriftungen `Bild 1: ganzes Blatt` und `Bild 2: Plankopf`, dazu der Satz
`Ordne diese Seite ein.` Kein Projektkontext, keine Angaben zu den anderen Seiten — siehe
Abschnitt 10.

---

## 6 Das Antwortschema, vollständig

Übertragen wird es als `output_config.format` mit `type: "json_schema"`. Das ist allgemein
verfügbar, braucht kein Vorabmerkmal, und `claude-haiku-4-5` unterstützt es (Q3). Der
bestehende Endpunkt `plan-auslesen.mjs` erzwingt die Struktur noch über ein Werkzeug mit
`tool_choice`; das funktioniert weiterhin und bleibt der Rückfallweg, falls der neue Weg am
Prüfstand Ärger macht.

### 6.1 Drei Einschränkungen, die das Schema geformt haben

Der unterstützte JSON-Schema-Umfang ist begrenzt (Q3). Drei Punkte wirken sich hier aus:

1. **Keine Zahlenschranken** (`minimum`, `maximum` werden nicht unterstützt). Eine Konfidenz
   von 0 bis 1 ließe sich also nicht erzwingen. Deshalb ist die Konfidenz eine Aufzählung
   `sicher` / `unsicher` / `geraten` — dieselbe Skala wie im übrigen Werkzeug, und für eine
   Sichtung ohnehin ehrlicher als eine Kommazahl.
2. **Keine Längenschranken** (`maxLength` wird nicht unterstützt). Kurze Freitexte lassen
   sich nur über den Prompt erreichen, nicht über das Schema. Daher Regel 8 im Systemprompt.
3. **Keine echten Nullwerte.** Optionale Felder werden als `anyOf` mit `null` geschrieben,
   genau wie im bestehenden Endpunkt. Alle Objekte tragen `additionalProperties: false` und
   listen alle Felder unter `required`.

### 6.2 Maschinenkennungen gegen Anzeigetexte

Alle Aufzählungswerte sind reine ASCII-Kennungen (`eingeschraenkt`, `l_foermig`). Angezeigt
wird daraus über eine Tabelle im Code der Text mit echten Umlauten („eingeschränkt",
„L-förmig"). Das ist genau die Trennung, die `kern_planpruefung.js` schon verwendet
(`urteil: "eingeschraenkt"`). Prosa, die das Modell liest oder schreibt, hat dagegen echte
Umlaute — deshalb sind die Beschreibungen im Schema und der Systemprompt umlautecht.

### 6.3 Das Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["klasse", "zweitklasse", "konfidenz", "lesbarkeit", "lesbarkeit_grund",
               "blatt", "zeichnungen", "nordpfeil", "geschoss_indiz", "bemerkung"],
  "properties": {
    "klasse": {
      "type": "string",
      "enum": ["grundriss", "schnitt", "ansicht", "lageplan", "detail",
               "bauteilnachweis", "foto", "fremddokument", "unbrauchbar", "unklar"],
      "description": "Vorherrschende Art der Seite. Trägt die Seite mehrere Zeichnungen, dann die für eine Heizlastberechnung wertvollste."
    },
    "zweitklasse": {
      "anyOf": [
        { "type": "string",
          "enum": ["grundriss", "schnitt", "ansicht", "lageplan", "detail",
                   "bauteilnachweis", "foto", "fremddokument", "unbrauchbar", "unklar"] },
        { "type": "null" }
      ],
      "description": "Die zweitwahrscheinlichste Klasse, oder null, wenn es keine ernsthafte Alternative gibt."
    },
    "konfidenz": {
      "type": "string",
      "enum": ["sicher", "unsicher", "geraten"],
      "description": "Wie sicher die Klasse ist. Ehrlich angeben; geraten ist ein zulässiges Ergebnis."
    },
    "lesbarkeit": {
      "type": "string",
      "enum": ["gut", "eingeschraenkt", "schlecht"],
      "description": "Ob Beschriftungen und Maßzahlen auf einem größer gerechneten Bild dieser Seite lesbar wären."
    },
    "lesbarkeit_grund": {
      "anyOf": [{ "type": "string" }, { "type": "null" }],
      "description": "Nur wenn nicht gut: ein Satz, woran es liegt. Sonst null."
    },
    "blatt": {
      "type": "object",
      "additionalProperties": false,
      "required": ["titel_text", "blattnummer_text", "massstab_text", "datum_text",
                   "projekt_text", "ort_text", "format_vermutet"],
      "properties": {
        "titel_text": {
          "anyOf": [{ "type": "string" }, { "type": "null" }],
          "description": "Blatt- oder Planbezeichnung wörtlich, z. B. 'Grundriss Obergeschoss'."
        },
        "blattnummer_text": {
          "anyOf": [{ "type": "string" }, { "type": "null" }],
          "description": "Blattnummer oder Zählung wörtlich, z. B. 'Blatt 2 von 5'."
        },
        "massstab_text": {
          "anyOf": [{ "type": "string" }, { "type": "null" }],
          "description": "Maßstabsangabe des Blattes wörtlich, z. B. 'M 1:100'."
        },
        "datum_text": {
          "anyOf": [{ "type": "string" }, { "type": "null" }],
          "description": "Datum oder Planstand wörtlich, z. B. '12.03.2019' oder 'Index c'."
        },
        "projekt_text": {
          "anyOf": [{ "type": "string" }, { "type": "null" }],
          "description": "Bezeichnung des Bauvorhabens wörtlich, ohne Personennamen."
        },
        "ort_text": {
          "anyOf": [{ "type": "string" }, { "type": "null" }],
          "description": "Ort und Postleitzahl des Bauvorhabens. Keine Straße, keine Hausnummer, keine Namen."
        },
        "format_vermutet": {
          "type": "string",
          "enum": ["A4", "A3", "A2", "A1", "A0", "unbekannt"],
          "description": "Vermutetes Blattformat, soweit aus Plankopf oder Blattaufteilung erkennbar."
        }
      }
    },
    "zeichnungen": {
      "type": "array",
      "description": "Eine Zeichnung je Eintrag. Bei reinen Textseiten und Fotos eine leere Liste.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["art", "bezeichnung_text", "geschoss_text", "massstab_text",
                     "raeume_erkennbar", "ebenen_erkennbar", "kontur_form", "rahmen"],
        "properties": {
          "art": {
            "type": "string",
            "enum": ["grundriss", "schnitt", "ansicht", "lageplan", "detail", "unklar"],
            "description": "Art dieser einen Zeichnung."
          },
          "bezeichnung_text": {
            "anyOf": [{ "type": "string" }, { "type": "null" }],
            "description": "Überschrift an dieser Zeichnung, wörtlich."
          },
          "geschoss_text": {
            "anyOf": [{ "type": "string" }, { "type": "null" }],
            "description": "Geschossbezeichnung wörtlich, z. B. 'EG', '1.OG', 'Dachgeschoss'. Nicht vereinheitlichen. Steht keine da, null."
          },
          "massstab_text": {
            "anyOf": [{ "type": "string" }, { "type": "null" }],
            "description": "Maßstab an dieser Zeichnung, falls er vom Blattmaßstab abweicht. Sonst null."
          },
          "raeume_erkennbar": {
            "type": "integer",
            "description": "Grobe Zahl umschlossener oder beschrifteter Räume. Nicht die Namen lesen. Im Zweifel aufrunden. Wenn keine Räume, 0."
          },
          "ebenen_erkennbar": {
            "type": "integer",
            "description": "Nur bei Schnitt und Ansicht: Zahl der erkennbaren Geschossebenen einschließlich Keller und Dachgeschoss. Sonst 0."
          },
          "kontur_form": {
            "type": "string",
            "enum": ["rechteckig", "l_foermig", "t_foermig", "winkelig",
                     "rund_oder_gebogen", "unregelmaessig", "nicht_erkennbar"],
            "description": "Grobe Umrissform des gezeichneten Gebäudes."
          },
          "rahmen": {
            "type": "object",
            "additionalProperties": false,
            "required": ["x", "y", "b", "h"],
            "description": "Lage der Zeichnung auf dem Blatt als Anteil von 0 bis 1, auf Zehntel genau. x und y sind die linke obere Ecke, b und h Breite und Höhe.",
            "properties": {
              "x": { "type": "number" },
              "y": { "type": "number" },
              "b": { "type": "number" },
              "h": { "type": "number" }
            }
          }
        }
      }
    },
    "nordpfeil": {
      "type": "boolean",
      "description": "Ist auf dem Blatt ein Nordpfeil zu sehen?"
    },
    "geschoss_indiz": {
      "anyOf": [{ "type": "string" }, { "type": "null" }],
      "description": "Nur wenn kein Geschoss angeschrieben ist: woran man es trotzdem erkennt, in einem Satz. Sonst null."
    },
    "bemerkung": {
      "anyOf": [{ "type": "string" }, { "type": "null" }],
      "description": "Ein Satz zu allem, was sonst auffällt und die Einordnung betrifft. Sonst null."
    }
  }
}
```

### 6.4 Eine Beispielantwort

Ein A3 mit Erdgeschoss und Obergeschoss nebeneinander — der Fall, der ohne die Liste
`zeichnungen` ein Geschoss verschlucken würde.

```json
{
  "klasse": "grundriss",
  "zweitklasse": null,
  "konfidenz": "sicher",
  "lesbarkeit": "gut",
  "lesbarkeit_grund": null,
  "blatt": {
    "titel_text": "Grundriss Erdgeschoss / Obergeschoss",
    "blattnummer_text": "Blatt 2 von 5",
    "massstab_text": "M 1:100",
    "datum_text": "12.03.2019",
    "projekt_text": "Neubau Doppelhaushälfte",
    "ort_text": "33102 Paderborn",
    "format_vermutet": "A3"
  },
  "zeichnungen": [
    { "art": "grundriss", "bezeichnung_text": "Erdgeschoss", "geschoss_text": "EG",
      "massstab_text": null, "raeume_erkennbar": 6, "ebenen_erkennbar": 0,
      "kontur_form": "rechteckig", "rahmen": { "x": 0.1, "y": 0.2, "b": 0.4, "h": 0.6 } },
    { "art": "grundriss", "bezeichnung_text": "Obergeschoss", "geschoss_text": "OG",
      "massstab_text": null, "raeume_erkennbar": 5, "ebenen_erkennbar": 0,
      "kontur_form": "rechteckig", "rahmen": { "x": 0.5, "y": 0.2, "b": 0.4, "h": 0.6 } }
  ],
  "nordpfeil": true,
  "geschoss_indiz": null,
  "bemerkung": "Zwei Geschosse nebeneinander auf einem Blatt."
}
```

Diese Antwort ist kompakt 835 Zeichen lang, mit Einrückung 1.071 (gezählt). Als
Planungsgröße für die Kostenrechnung werden **300 Ausgabetoken** angesetzt; das ist reichlich
und deckt auch ein Blatt mit vier Zeichnungen. `max_tokens` wird trotzdem auf **2000**
gesetzt: eine abgeschnittene Antwort wäre ungültiges JSON, und `max_tokens` ist eine
Obergrenze, keine Kostengröße — bezahlt wird, was tatsächlich erzeugt wird.

---

## 7 Welche Bildgröße genügt — und warum

### 7.1 Was die Sichtung sehen muss

Nicht die Maßzahlen. Die kleinsten Texte auf einer Bauzeichnung sind nach eigener Messung
1,3 bis 2,0 mm Versalhöhe (FORMATE 5.1), und die zu lesen ist die teure Aufgabe von Stufe 2
mit Kacheln. Die Sichtung braucht vier Dinge, alle deutlich gröber:

| Was | Wie groß es auf dem Blatt ist |
|---|---|
| Die Art der Zeichnung, Umriss, Raumstempel als Flecken | Zentimeterbereich |
| Blattüberschrift „Grundriss Erdgeschoss" | üblicherweise 5 bis 10 mm Versalhöhe |
| Plankopfeinträge, darunter „M 1:100" | 2,5 bis 3,5 mm (Normschrift-Stufen, FORMATE 5.1) |
| Raumzahl grob abzählen | Zentimeterbereich |

Der Plankopf ist damit die Engstelle. Als Anhalt, ab wann Text ankommt, dienen die
**Lesbarkeitsmessungen an echten Plänen** aus FORMATE 5.4: bei 2,73 px/mm waren die großen
Maßzahlen eines A1-CAD-Plans lesbar, die kleinen nicht; bei 4,39 px/mm eines A4-Blattes
dasselbe Bild. Daraus die Arbeitsannahme: **ab rund 2,5 px/mm ist Text von 3,5 mm aufwärts
lesbar** — das entspricht rund 9 Bildpunkten Versalhöhe.

### 7.2 Die harte Grenze: mehr senden hilft nicht

Ein Standardmodell verkleinert jedes Bild selbst auf höchstens 1568 px lange Kante **und**
höchstens 1568 Bildtoken; was größer ankommt, wird herunterskaliert (Q1). Bei DIN-Formaten
mit dem Seitenverhältnis √2 greift die Tokengrenze zuerst. Wer mehr sendet, bezahlt die
Übertragung und bekommt trotzdem dasselbe Bild.

**Empfehlung: lange Kante 1288 px.** Das ergibt 46 × 33 = **1518 Bildtoken**, liegt knapp
unter der Grenze von 1568 und wird deshalb nicht mehr angefasst. Allgemeine Regel für den
Bau: die Kantenlängen so wählen, dass `⌈b/28⌉ · ⌈h/28⌉ ≤ 1568` und `max(b, h) ≤ 1568`.

Gerendert wird dafür mit `skala = 1288 / längere Seitenkante in Punkt`, gedeckelt auf die
native Auflösung eines Scans (`min(skala, dpi_nativ / 72)`, FORMATE 5.2). Für ein A3 quer
sind das rund 1,08 — nicht die 0,25, die FORMATE 5.6 für die Seitenerkennung vorschlägt.
**Das ist eine bewusste Abweichung:** 0,25 sind bei A3 rund 0,7 px/mm, damit ist keine
Blattüberschrift mehr lesbar. Die 0,25er-Vorschau bleibt, aber nur als Miniaturbild für den
Bearbeiter, nicht als Sichtungsbild.

### 7.3 Was bei 1288 px auf den Blattformaten ankommt

| Blatt | Bild | px/mm | dpi | 3,5 mm werden zu | 5,0 mm werden zu | Bildtoken |
|---|---|---|---|---|---|---|
| A4 | 1288 × 911 | 4,34 | 110 | 15,2 px | 21,7 px | 1518 |
| A3 | 1288 × 911 | 3,07 | 78 | 10,7 px | 15,3 px | 1518 |
| A2 | 1288 × 911 | 2,17 | 55 | 7,6 px | 10,8 px | 1518 |
| A1 | 1288 × 910 | 1,53 | 39 | 5,4 px | 7,7 px | 1518 |
| A0 | 1288 × 911 | 1,08 | 28 | 3,8 px | 5,4 px | 1518 |

A4 und A3 sind unkritisch. Ab **A2 fällt der Plankopf unter die Schwelle von rund 9 px** und
wird unzuverlässig, bei A1 und A0 sicher nicht mehr lesbar. Die Einordnung selbst leidet
darunter kaum — ein Umriss bleibt ein Umriss —, aber Maßstab, Blattnummer und Titel gehen
verloren, und das sind genau die Angaben, aus denen später sortiert wird.

### 7.4 Zweites Bild für große Blätter

Deshalb bekommt ein Blatt ab A2 einen **zweiten Ausschnitt**: die untere rechte Ecke, 40 %
der Blattbreite × 30 % der Blatthöhe. Dort sitzt der Plankopf nach DIN EN ISO 7200. Derselbe
Tokenrahmen, aber auf ein Viertel der Fläche angewandt:

| Blatt | Ausschnitt | Bild | px/mm | 3,5 mm werden zu | Bildtoken |
|---|---|---|---|---|---|
| A2 | 238 × 126 mm | 1288 × 683 | 5,42 | 19,0 px | 1150 |
| A1 | 336 × 178 mm | 1288 × 682 | 3,83 | 13,4 px | 1150 |
| A0 | 476 × 252 mm | 1288 × 683 | 2,71 | 9,5 px | 1150 |

Beide Bilder gehen in **einen** Aufruf, mit vorangestellten Beschriftungen „Bild 1: ganzes
Blatt" und „Bild 2: Plankopf". Mehrere Bilder je Anfrage sind vorgesehen und die
Beschriftung ausdrücklich empfohlen (Q1). Die strengere Größengrenze, die ab mehr als 20
Bildern je Anfrage gilt, wird mit zwei Bildern nicht berührt.

Auslöseregel für den zweiten Ausschnitt, in Code: `1288 / längere Blattkante in mm < 2,5`,
also ab etwa 515 mm Blattkante. Ist das Blattformat unbekannt — bei einem Foto oder einem
Bild ohne Seitenmaß —, entscheidet ersatzweise die Pixelzahl des Ausgangsbildes: ab 3000 px
langer Kante wird ein Ausschnitt mitgeschickt.

---

## 8 Token und Kosten für zehn Seiten

### 8.1 Der Vorlauf je Aufruf

| Anteil | Menge | Herkunft |
|---|---|---|
| Systemprompt | 3.468 Zeichen | gezählt |
| Schema (kompakt) | 4.715 Zeichen | gezählt |
| Summe Text | 8.183 Zeichen | gezählt |
| **daraus Token** | **rund 2.400** | **geschätzt**, Spanne 2.050 bis 2.560 je nach angenommener Zeichenzahl je Token (4,0 bis 3,2). Deutsch mit Umlauten tokenisiert schlechter als Englisch, deshalb ist die Mitte konservativ gewählt. Vor dem Ausrollen mit `/v1/messages/count_tokens` messen (O1) |
| Benutzertext | rund 30 Token | geschätzt, ein Satz |

### 8.2 Zehn Seiten, gerechnet

Preise `claude-haiku-4-5`: 1 USD je Mio. Eingabetoken, 5 USD je Mio. Ausgabetoken (Q2).

| Fall | Eingabe je Seite | Ausgabe je Seite | je Seite | **zehn Seiten** |
|---|---|---|---|---|
| A4/A3, ein Bild | 1.518 + 2.400 + 30 = **3.948** | 300 | 0,0054 USD | **0,055 USD** |
| A2 und größer, zwei Bilder | 3.948 + 1.150 = **5.098** | 300 | 0,0066 USD | **0,066 USD** |

Also **rund fünf bis sieben US-Cent für den gesamten ersten Schritt** über alle zehn Seiten.
Gemessen am Rahmen von zwei Euro je Bericht sind das gut zweieinhalb bis dreieinhalb Prozent.
Der Wechselkurs ist dabei nicht eingerechnet; bei diesem Abstand ändert er nichts.

### 8.3 Was die Zweitmeinung dazu kostet

Umstrittene Seiten laufen ein zweites Mal, mit `claude-sonnet-5` und dem ganzen Blatt auf der
hochauflösenden Stufe. Ein A3 kommt dort mit 2275 × 1609 px = **4.756 Bildtoken** an
(FORMATE 5.3, dieselbe Rechnung).

| | Eingabe | Ausgabe | je Seite |
|---|---|---|---|
| `claude-sonnet-5`, Regelpreis 3 / 15 USD | 7.186 | 300 | **0,026 USD** |
| derselbe Aufruf zum Einführungspreis 2 / 10 USD, gültig bis 31.08.2026 (Q2) | 7.186 | 300 | 0,017 USD |

Bei höchstens drei Zweitmeinungen je Bericht sind das 0,08 USD. **Ungünstigster Fall für
Stufe 1 insgesamt: zehn große Blätter mit Ausschnitt plus drei Zweitmeinungen = 0,14 USD.**
Damit bleiben über 90 % des Budgets für Stufe 2, wo sie hingehören.

### 8.4 Vorlaufzwischenspeicher lohnt sich hier nicht

Der Vorlauf von rund 2.400 Token liegt über der Mindestlänge von etwa 1.024 Token, ab der
ein Zwischenspeichern überhaupt greift. Rechnerisch: statt 10 × 2.400 Token einmal 2.400 zum
Schreibsatz von 1,25 und neunmal zum Lesesatz von 0,1 — 24.000 gegen 5.160 Tokenäquivalente,
also **0,019 USD Ersparnis je Bericht**. Dafür müsste der erste Aufruf allein laufen und
fertig sein, bevor die übrigen neun starten, denn zehn gleichzeitige Aufrufe finden noch
keinen Eintrag vor. Ein zusätzlicher Umlauf Wartezeit für zwei Cent ist ein schlechter
Tausch. **Empfehlung: nicht zwischenspeichern, alle Aufrufe gleichzeitig starten.** Sollte
sich das Verhältnis ändern, etwa weil das Schema wächst, ist es eine Zeile.

---

## 9 Modellwahl

**`claude-haiku-4-5` für die Sichtung. `claude-sonnet-5` für die Zweitmeinung.**

### 9.1 Warum Haiku für diesen Schritt richtig ist

* **Die Aufgabe ist Klassifikation plus drei kurze Ablesungen.** Kein Rechnen, keine
  Herleitung, kein langer Text. Das ist der Fall, für den das kleinste Modell gebaut ist.
* **Preis.** 1 / 5 USD je Mio. Token gegen 3 / 15 bei `claude-sonnet-5` und 5 / 25 bei
  `claude-opus-5` (Q2). Bei zehn Aufrufen je Bericht ist der Unterschied das Dreifache
  beziehungsweise Fünffache — nicht viel in absoluten Zahlen, aber es gibt keinen Gegenwert.
* **Geschwindigkeit.** Zehn Aufrufe müssen in ein Zeitbudget von fünf Minuten passen, das
  eigentlich für Stufe 2 gedacht ist. Das schnellste Modell ist hier das richtige.
* **Die Standard-Bildstufe ist hier ein Vorteil, kein Mangel.** Sie deckelt die Bildkosten
  bei 1568 Token je Bild, egal was gesendet wird. Ein hochauflösendes Modell würde bei
  demselben Blatt bis zum Dreifachen kosten, ohne dass die Einordnung besser wird.
* **Strukturierte Ausgabe wird unterstützt** (Q3), es braucht kein Vorabmerkmal.

Zwei Dinge, die bei diesem Modell zu beachten sind und die bei den 5er-Modellen anders
laufen: `output_config.effort` gibt es dort **nicht** und führt zu einem Fehler — der
Parameter darf nicht mitgeschickt werden. Und ein Nachdenkmodus wäre nur über die alte
Budgetform erreichbar; für eine Klassifikation wird er nicht gebraucht und bleibt aus. Das
hält die Antwort kurz und den Aufruf schnell.

### 9.2 Warum nicht Sonnet oder Opus als Standard

`claude-opus-5` ist im `BAUPLAN.md` für die eigentliche Auslese begründet, und das bleibt
richtig: Maßketten und Raumzuordnung sind die Stelle, an der Genauigkeit zählt. Die Sichtung
ist diese Stelle nicht. Sie darf sich irren, solange sie es zeigt — und die Absicherung dagegen
ist baulich, nicht durch ein größeres Modell (Abschnitt 10).

`claude-sonnet-5` kommt genau dort zum Zug, wo das kleine Modell an seine Grenze stößt: bei
großen Blättern, deren Plankopf auch im Ausschnitt nicht sicher lesbar war, und bei
Widersprüchen. Sein Vorteil ist dann nicht die größere Klugheit, sondern die
**hochauflösende Bildstufe** mit 2576 px und 4784 Bildtoken — er sieht schlicht mehr vom
selben Blatt.

---

## 10 Wie eine zu Unrecht aussortierte Seite verhindert wird

Der Auftrag ist unmissverständlich: eine fälschlich als unbrauchbar aussortierte Seite ist
schlimmer als eine zu viel mitgenommene, weil dem Bearbeiter dann Räume fehlen, **ohne dass
er es merkt**. Der letzte Halbsatz ist der eigentliche Feind. Ein sichtbarer Fehler wird
korrigiert; ein unsichtbarer wandert in eine Anlagenauslegung. Zehn Vorkehrungen, von der
wichtigsten abwärts.

**S1 — Die Sichtung verwirft nicht.** Sie liefert eine Einordnung mit Konfidenz, sonst
nichts. Welche Seiten in Stufe 2 gehen, entscheidet Code nach festen Regeln, und den letzten
Ausschlag gibt der Bearbeiter. Das Modell hat keinen Ausgang, über den eine Seite
verschwinden kann.

**S2 — Asymmetrische Schwelle.** In den Topf „nicht verwenden" fällt eine Seite nur, wenn
**alle drei** Bedingungen erfüllt sind: `klasse` ist `fremddokument` oder `unbrauchbar`,
`konfidenz` ist `sicher`, und die örtliche Eignungsprüfung widerspricht nicht. Sonst wird
mitgenommen. `unklar` wird immer mitgenommen, solange das Budget reicht.

**S3 — Die Zweitklasse zieht.** Ist `zweitklasse` eine Geometrieklasse (`grundriss` oder
`schnitt`), wird die Seite wie Geometrie behandelt, unabhängig von der Hauptklasse. Der
knappe Fehlgriff — Bewehrungsplan gegen Grundriss — kostet dann eine Auslese statt ein
Geschoss.

**S4 — Zwei unabhängige Zeugen.** `kern_planpruefung.js` läuft auf jeder Seite mit,
vollständig örtlich, ohne Modell, und misst Schärfe, Kontrast, Tintenanteil und Schräglage.
Zwei Urteile, zwei völlig verschiedene Wege. Widersprechen sie sich — das Modell sagt
`unbrauchbar`, die Messung sagt `geeignet` —, wird **nie** verworfen, sondern eskaliert.

**S5 — Zweitmeinung bei Widerspruch.** Eskalierte Seiten laufen ein zweites Mal mit
`claude-sonnet-5` auf der hochauflösenden Stufe. Höchstens drei je Bericht, Kosten rund
0,08 USD (8.3). Bleibt es beim Widerspruch, geht die Seite mit dem Vermerk „zwei Urteile
widersprechen sich" an den Bearbeiter.

**S6 — Vollständigkeitsprüfung über die Geschossfolge.** Das ist die Prüfung, die ein Mensch
im Kopf nicht macht. Aus `geschoss_text` aller Zeichnungen wird über eine Tabelle im Code
eine Ebenenzahl gebildet (KG/UG → −1, EG → 0, 1.OG → 1, DG → oberste, Spitzboden darüber).
Dann wird geprüft:

| Prüfung | Was sie fängt |
|---|---|
| Lücke in der Folge, etwa −1, 0, 2 ohne 1 | Ein Grundriss fehlt |
| `ebenen_erkennbar` im Schnitt größer als die Zahl gefundener Grundrisse | Ein Grundriss fehlt, obwohl er nirgends angeschrieben ist |
| Zwei Zeichnungen mit derselben Geschossbezeichnung | Doppelte Seite oder falsch gelesen |
| Grundriss ohne Geschossbezeichnung und ohne Indiz | Zuordnung offen |
| Deutlich abweichende Kontur bei gleichem Geschoss | Möglicherweise zwei Gebäude im Stapel |

Jeder Treffer ist eine Meldung an den Bearbeiter, formuliert als Frage, nicht als Fehler:
„Der Schnitt zeigt vier Ebenen, es liegen drei Grundrisse vor. Fehlt ein Blatt?"

**S7 — Aussortierte Seiten bleiben sichtbar.** Die Übersicht zeigt **alle** hochgeladenen
Seiten als Miniaturbilder, die aussortierten in einer eigenen, grau hinterlegten Zeile, mit
Klasse, Konfidenz und Grund im Klartext, und mit einem Knopf „doch verwenden". Kein
stilles Verschwinden, keine eingeklappte Liste. Wer nichts tut, bekommt trotzdem alles zu
sehen.

**S8 — Rückkopplung aus Stufe 2.** Findet die volle Auslese auf einem Blatt deutlich weniger
Räume, als die Sichtung gezählt hat, oder gar keinen geschlossenen Umriss, geht die Seite
zurück auf den Tisch des Bearbeiters. Die Sichtungszahl ist dafür der einzige verfügbare
Sollwert — deshalb steht sie im Schema.

**S9 — Ein technischer Fehlschlag ist niemals „unbrauchbar".** Zeitüberschreitung,
Netzabbruch, abgelehnte Anfrage, ungültiges JSON: all das führt zu `klasse: "unklar"` mit dem
Grund „Sichtung nicht zustande gekommen". Eine Seite darf nicht deshalb fallen, weil eine
Leitung geklemmt hat. Das ist die Vorkehrung, die man am leichtesten vergisst und die im
Betrieb am häufigsten greift.

**S10 — Kein Selbststart und ein Protokoll.** Stufe 2 beginnt erst, wenn der Bearbeiter die
Zuordnung bestätigt hat; FORMATE 6.2 nennt das die einzige Stelle, an der eine Rückfrage
nötig ist. Jede Sichtungsantwort wird im Vorgang mitgeschrieben: Modell, Bildmaß, Bildtoken,
Ein- und Ausgabetoken, Zeitstempel, die Antwort im Wortlaut. Damit ist im Nachhinein
nachvollziehbar, warum eine Seite nicht im Bericht steht — und das ist bei einem Nachweis,
den ein Prüfer ansieht, kein Beiwerk.

### 10.1 Was das Modell bewusst nicht gefragt wird

| Nicht gefragt | Warum |
|---|---|
| Ob die Seite verwendet werden soll | Das ist eine Regel, keine Wahrnehmung. Regeln gehören in Code, wo sie prüfbar sind |
| Ob die Seite zum selben Gebäude gehört | Kann an einer Einzelseite niemand wissen, siehe 3.4 |
| Der Maßstab in Pixeln je Meter | Bleibt bei zwei Klicks des Bearbeiters, `BAUPLAN.md` |
| Raumnamen und Flächen | Das ist Stufe 2. Hier würden sie nur die Antwort verlängern |
| Was auf den anderen Seiten steht | Kontext von anderen Seiten würde die Einordnung ankern und die Unsicherheit unehrlich machen. Jede Seite wird für sich beurteilt |

---

## 11 Ablauf im Browser

Der Browser führt Regie, die serverlose Funktion macht je Aufruf genau eine Seite. So bleibt
jeder einzelne Aufruf klein und weit unter der halben Minute, nach der die Funktion abbricht.

```
Dateien angenommen (bis zu 10, Bild oder PDF)
  │
  ├─ 1  Örtlich, kostenlos, ohne Modell
  │     PDF: getViewport → Blattmaß und Drehung
  │          getOperatorList → Vektorplan / Scan / Textseite (FORMATE 6.1)
  │                          → native Auflösung eines Scans über die Bildmatrix
  │          getTextContent → Blatttitel, Blattnummer, Maßstab, wenn eine Textebene da ist
  │     Bild: Kantenlängen, sonst nichts
  │
  ├─ 2  Rendern
  │     Miniaturbild bei skala 0,25   → Übersicht für den Bearbeiter
  │     Sichtungsbild bei skala = 1288 / längere Kante in Punkt, gedeckelt auf dpi_nativ/72
  │     bei Blattkante über 515 mm zusätzlich der Plankopfausschnitt
  │
  ├─ 3  kern_planpruefung.pruefeBild() auf dem Bild in Arbeitsauflösung
  │     → geeignet / eingeschraenkt / ungeeignet, rein rechnerisch
  │
  ├─ 4  Modellaufruf je Seite, höchstens 4 gleichzeitig
  │     20 s harte Frist, danach ein Wiederholungsversuch in einer eigenen Schlange,
  │     der die nächste Welle nicht aufhält. Zweiter Fehlschlag → klasse "unklar"
  │
  ├─ 5  Zusammenführen je Seite
  │     Textebene schlägt Modell bei Titel, Blattnummer, Maßstab, wo sie vorhanden ist.
  │     Weichen beide voneinander ab: Konfidenz eine Stufe herunter und vermerken.
  │     Modell und Eignungsprüfung widersprechen sich → Zweitmeinung (S5)
  │
  └─ 6  Übergabe an das Sortieren (Stufe 1.5, eigenes Dokument):
        Geschossfolge bilden, Vollständigkeit prüfen (S6), Reihenfolge und Kostenrahmen
        vorschlagen, dem Bearbeiter vorlegen
```

Warum die Textebene das Modell schlägt und trotzdem beide laufen: Wo eine Textebene da ist,
ist sie die genauere Quelle — sie liefert den Titel zeichengenau statt gelesen. Trotzdem wird
sie **nicht in den Prompt gegeben**. Zwei unabhängige Ablesungen sind mehr wert als eine
bessere: die Abweichung ist ein Signal, und der Vorlauf bleibt für alle Seiten gleich.

**Vier gleichzeitige Aufrufe, nicht zehn.** Zehn Anfragen in derselben Sekunde laufen
absehbar in die Mengenbegrenzung der Schnittstelle; die Funktion beantwortet das heute schon
mit „Zu viele Anfragen. Bitte kurz warten." Vier gleichzeitig bedeutet drei Wellen für zehn
Seiten. Zeitrahmen als **obere Schranke**, nicht als Erwartung: drei Wellen à 20 s Frist plus
eine Nachzüglerwelle sind 80 s und damit gut ein Viertel des Zeitbudgets von fünf Minuten.
Die tatsächliche Dauer ist zu messen (O2).

---

## 12 Der Endpunkt

**Neue Datei `api/netlify/functions/seite-sichten.mjs`.** Nicht in `plan-auslesen.mjs`
hineinbauen: anderes Modell, anderes Schema, anderes Zeitverhalten, und der bestehende
Endpunkt ist in Betrieb.

Übernommen wird von `plan-auslesen.mjs` unverändert: der Zugangscode über `x-werke-code` mit
dem laufzeitgleichen Vergleich und der Zwei-Sekunden-Bremse, die Herkunftsköpfe, die
Größenprüfung des Bildes, die Selbstauskunft über GET, und das Gerüst mit Datenstrom und
Lebenszeichen alle drei Sekunden. Letzteres wird hier zwar kaum gebraucht, weil die Antwort
kurz ist — aber ein einheitliches Gerüst für beide Endpunkte ist weniger Code als zwei.

### 12.1 Anfrage

```json
{
  "bild": "<base64 JPEG, ganzes Blatt, lange Kante 1288 px, Güte 0,85>",
  "plankopf": "<base64 JPEG, Ausschnitt unten rechts, oder weggelassen>",
  "modell": "<optional, nur für die Zweitmeinung: claude-sonnet-5>"
}
```

Kein Projektkontext, keine Angaben zu anderen Seiten (siehe 10.1). Die Bildmenge: aus der in
FORMATE 5.5 gemessenen Kachelgröße von 79 KB je 3,73 Megapixel **abgeleitet** liegt ein
Sichtungsbild von 1,17 MP bei etwa 25 KB, mit Base64 rund 33 KB; mit Plankopfausschnitt rund
55 KB je Anfrage. Das ist unkritisch. Güte 0,85 wie beim Kacheln; für den Plankopfausschnitt
0,9, weil dort nur Text steht und die Dokumentation ausdrücklich davor warnt, dass starke
JPEG-Kompression Text unlesbar macht (Q1).

### 12.2 Aufrufkörper an die Schnittstelle

```js
{
  model: process.env.WERKE_MODELL_SICHTUNG || "claude-haiku-4-5",
  max_tokens: 2000,
  stream: true,
  system: SYSTEM_SICHTUNG,
  output_config: { format: { type: "json_schema", schema: SCHEMA_SICHTUNG } },
  messages: [{ role: "user", content: [
    { type: "text",  text: "Bild 1: ganzes Blatt" },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: bild } },
    // nur wenn vorhanden:
    { type: "text",  text: "Bild 2: Plankopf" },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: plankopf } },
    { type: "text",  text: "Ordne diese Seite ein." },
  ]}],
}
```

Kein `output_config.effort` — den Parameter kennt `claude-haiku-4-5` nicht und lehnt ihn ab
(9.1). Kein Nachdenkmodus. Kein `tools`, kein `tool_choice`.

**Ein Unterschied im Lesecode gegenüber `plan-auslesen.mjs`:** dort wird die Antwort aus
`input_json_delta` zusammengesetzt, weil sie über ein erzwungenes Werkzeug kommt. Mit
`output_config.format` ist die Antwort ein gewöhnlicher Textblock, im Datenstrom also
`text_delta`. Der Sammelcode muss entsprechend auf `delta.text` hören. Vor dem Bau einmal an
einem echten Aufruf bestätigen (O3).

### 12.3 Antwort

Das Schema aus 6.3, ergänzt um `_verbrauch` mit Modell, Ein- und Ausgabetoken — wie beim
bestehenden Endpunkt, damit sich die Kostenrechnung aus 8.2 im Betrieb gegenprüfen lässt
statt nur auf dem Papier zu stehen. Im Fehlerfall `{ "fehler": "..." }`; der Browser macht
daraus `klasse: "unklar"`, niemals `unbrauchbar` (S9).

---

## 13 Offene Punkte

| Nr. | Punkt | Warum offen |
|---|---|---|
| O1 | Tokenmenge von Systemprompt und Schema | Aus 8.183 Zeichen **geschätzt** auf rund 2.400 Token. Mit `/v1/messages/count_tokens` einmal messen; wenn es deutlich mehr ist, lohnt sich der Vorlaufzwischenspeicher aus 8.4 doch |
| O2 | Tatsächliche Dauer eines Sichtungsaufrufs | Nicht gemessen, hier steht nur eine obere Schranke von 20 s je Aufruf. An zehn echten Seiten messen und in dieses Dokument eintragen |
| O3 | Datenstromform bei `output_config.format` | Aus der Sache abgeleitet, dass ein Textblock als `text_delta` kommt. An einem echten Aufruf bestätigen, bevor der Sammelcode gebaut wird |
| O4 | Trefferquote der Einordnung | Es gibt noch keinen Prüfstand für die Sichtung. Nötig sind rund 30 echte Seiten aus den Projektordnern, von Hand richtig eingeordnet, darunter ausdrücklich die fünf Verwechslungspaare aus 3.3 sowie ein Blatt mit zwei Geschossen. Erst daran lässt sich sagen, ob der Prompt trägt |
| O5 | Schwärzung sitzt an der falschen Stelle | `modul_ki.js` schwärzt 12 % der Bildhöhe **oben**. Der Plankopf sitzt nach DIN EN ISO 7200 unten rechts. Für die Sichtung ist das doppelt heikel, weil dort auch Titel und Maßstab stehen, die gebraucht werden. Zu klären, ob geschwärzt werden soll und wenn ja, welches Rechteck |
| O6 | Blattformat bei reinen Bilddateien | Ein abfotografierter Plan hat kein Seitenmaß. Die Ersatzregel über die Pixelzahl (7.4) ist eine **Annahme** und an echten Handyfotos zu prüfen |
| O7 | Verhalten bei mehr als zehn Seiten | Die Oberfläche nimmt zehn an. Was passiert, wenn jemand ein PDF mit dreißig Seiten hochlädt, ist noch nicht festgelegt. Vorschlag: alle Seiten sichten, weil dreißig Seiten nur rund 0,16 USD kosten, aber die Kachelung strikt auf die bestätigten Blätter begrenzen (FORMATE 6.3) |

---

## 14 Quellen

| Nr. | Quelle |
|---|---|
| Q1 | Bildverarbeitung: Bildfelder von 28×28 Bildpunkten, Formel `⌈b/28⌉ × ⌈h/28⌉`, Stufen 1568 px / 1568 Token und 2576 px / 4784 Token, Grenze von 20 Bildern je Anfrage, Beschriftung mehrerer Bilder, Hinweise zu JPEG-Kompression und zur Näherungsnatur von Lagekoordinaten: platform.claude.com/docs/en/build-with-claude/vision (abgerufen 20.08.2026) |
| Q2 | Modellkennungen und Preise `claude-haiku-4-5` 1 / 5 USD, `claude-sonnet-5` 3 / 15 USD mit Einführungspreis 2 / 10 USD bis 31.08.2026, `claude-opus-5` 5 / 25 USD je Mio. Token: platform.claude.com/docs/en/about-claude/models/overview |
| Q3 | Strukturierte Ausgabe über `output_config.format`, unterstützte Modelle einschließlich Haiku 4.5, kein Vorabmerkmal nötig, unterstützter Schema-Umfang (kein `minimum`/`maximum`, kein `maxLength`, keine echten Nullwerte, `additionalProperties: false` Pflicht): platform.claude.com/docs/en/build-with-claude/structured-outputs |
| Q4 | Eigene Rechnung, gegengeprüft an der Beispieltabelle in Q1: für 200×200, 1000×1000, 1092×1092, 1456×819, 1269×952 und 2576×1449 px liefert `⌈b/28⌉ × ⌈h/28⌉` genau die dort veröffentlichten 64, 1296, 1521, 1560, 1564 und 4784 Token |
| Q5 | `SPEZIFIKATION_FORMATE.md` dieses Projekts, Abschnitte 5.1 bis 5.6 (Schriftgrößen auf echten Plänen, Renderskala, Lesbarkeitsmessungen, Kachelvorschrift, gemessene Kachelgröße 79 KB) und 6.1 bis 6.3 (Seiteneinordnung ohne Modellaufruf, Rückfrage an den Bearbeiter, Kachelgrenze) |
| Q6 | `BAUPLAN.md` dieses Projekts (Maßstab immer von Hand, Konfidenz je Feld, kein Schlüssel in der Datei), `src/kerne/kern_planpruefung.js` (Urteile geeignet / eingeschraenkt / ungeeignet, `pruefeBild`), `api/netlify/functions/plan-auslesen.mjs` (Zugangscode, Datenstromgerüst, Regel zu personenbezogenen Angaben) |
| Q7 | Normschrift, Schriftgröße als Versalhöhe, Stufen 2,5 / 3,5 / 5 / 7 mm: de.wikipedia.org/wiki/Normschrift, zitiert nach Q5 |
| Q8 | Lage des Schriftfeldes unten rechts: DIN EN ISO 7200. **Nicht am Normtext geprüft**, sondern gängige Praxis auf den Plänen der Projektordner. Vor einer festen Ausschnittsregel einmal am Normtext belegen |
