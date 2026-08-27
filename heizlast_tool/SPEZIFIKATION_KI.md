# Spezifikation der KI-Auslese

Entwurf der Modellseite für den neuen Ablauf „Pläne hochladen, Eckdaten klären,
fertiger Heizlastbericht". Ersetzt den heutigen Einzelaufruf in
`api/netlify/functions/plan-auslesen.mjs`.

**Die Arbeitsteilung kehrt sich um.** Heute soll ein Aufruf alles auf einmal
leisten: Räume finden, benennen, Maße lesen, Befunde ableiten. Künftig macht die
Bildverarbeitung die Geometrie — Räume als Polygone mit Flächen in Pixeln,
Nachbarschaften, Öffnungen, Hüllkontur — und das Modell liefert nur die
Bedeutung dazu. Das Modell muss dann keine Koordinaten mehr erfinden, und genau
das ist die Stelle, an der Bildmodelle unzuverlässig sind.

### Woher die Zahlen in diesem Dokument stammen

| Art | Kennzeichnung |
|---|---|
| **Gemessen** | Alle Bildtoken-, Kachel-, Auflösungs- und Renderzahlen stammen aus `SPEZIFIKATION_FORMATE.md` (Messungen vom 20.08.2026). Fundstelle jeweils angegeben |
| **Gerechnet** | Tokenzahlen der Bilder nach der dokumentierten Regel `⌈Breite/28⌉ × ⌈Höhe/28⌉` (Q5). Kosten = Token × Listenpreis (Q6). Das ist Arithmetik, keine Schätzung |
| **Annahme** | Ausgabetoken je Aufruf, Antwortzeiten und die Trefferquote der Bildverarbeitung. Nichts davon ist gemessen, weil der Geometriekern noch nicht existiert. Jede solche Zahl trägt das Wort **Annahme** |

Nicht gemessen und deshalb in Abschnitt 13 als offener Punkt geführt: ob die
eingezeichneten Marken (Abschnitt 4) die Lesbarkeit des Plans stören.

---

## 1 Ergebnis in sieben Zeilen

1. **Sieben Aufrufarten** statt einer. Jede hat genau eine Aufgabe, ein eigenes
   Schema und eine eigene Rückfallebene.
2. **Das Modell gibt nie Koordinaten aus.** Es bekommt nummerierte Marken ins
   Bild gezeichnet und antwortet mit Nummern. Für Maßketten genügt eine
   Rasterzelle, nicht ein Pixelwert.
3. **Der Maßstab kommt nicht vom Modell.** Es liest nur den Text der Maßzahl;
   die Länge der Linie misst der Rechner. Drei unabhängige Wege müssen
   zusammenpassen, sonst fragt das Werkzeug.
4. **Die Gegenprüfung ist blind.** Der zweite Aufruf sieht die Behauptung des
   ersten nicht, sondern liest dieselben Ausschnitte noch einmal. Verglichen
   wird im Code. Das ist stärker als ein Modell, das sein eigenes Ergebnis
   bewerten soll.
5. **Kosten im Regelfall rund 0,70 USD, im großen Fall rund 1,31 USD** je
   Bericht (gemischte Modellwahl, Einführungspreis). Nur die Belegung „alles
   Opus 5" im großen Planpaket kommt mit 2,17 USD in die Nähe des Rahmens;
   Abschnitt 10.3 führt alle Belegungen auf.
6. **Laufzeit rund 2,5 Minuten** (Annahme), davon kein Einzelaufruf über
   25 Sekunden. Der Browser orchestriert, der Endpunkt bleibt zustandslos.
7. **Kein Aufruf darf den Bericht blockieren.** Fällt einer aus, bleibt das Feld
   leer und wandert als offener Punkt ins Kontrollblatt. Das Werkzeug ist ohne
   jeden Modellaufruf vollständig bedienbar — das war schon die Grundregel im
   Bauplan und bleibt sie.

---

## 2 Was sich ändert

### 2.1 Heute

Ein Aufruf, ein Bild der ganzen Seite, ein großes Schema mit `raeume`,
`massketten`, `befunde`, `gebaeude`, `luecken`, `hinweise`. Das Modell soll
Räume erkennen, benennen, Flächen ablesen und Schlüsse ziehen. Flächen darf es
nur übernehmen, wenn sie angeschrieben sind — sonst `null`. Die Geometrie
kommt danach vom Menschen: Maßstab per zwei Klicks, jeder Raum von Hand
umfahren (`src/modul_plan.js`).

Drei Schwächen:

* **Die Seite als Ganzes verschenkt die Auflösung.** Ein A3-Blatt kommt beim
  Modell mit 138 dpi an, egal wie fein gerendert wurde. 2 mm Schrift sind dann
  10,8 Bildpunkte hoch und nicht sicher lesbar (`SPEZIFIKATION_FORMATE.md`
  Abschnitt 5.3 und 5.4).
* **Die Zuordnung fehlt.** Das Modell nennt „Küche", aber niemand weiß, welches
  Polygon das ist. Der Bearbeiter muss die Liste von Hand mit seinen Polygonen
  verheiraten.
* **Ein Fehler kippt alles.** Antwortet das Modell unvollständig, ist der ganze
  Durchlauf verloren.

### 2.2 Künftig

```
   Datei                     Bildverarbeitung, örtlich          Modell
   ──────────────────────────────────────────────────────────────────────────
   PDF/Bild ──► Seitentyp, Vorschau, Textlage  ──────────────►  A1 Blattsortierung
                (pdf.js, ohne Modell)                              │
                                                                   ▼
             ──► Kacheln rendern, Eignung prüfen  ─────────────►  A2 Blattkunde
                (kern_planpruefung.js)                             A2S Schnittkunde
                                                                   │
             ──► GEOMETRIE (neu, kern_geometrie.js)                ▼
                 Wandlinien, Flächen, Polygone,   ────────────►  A3 Raumzuordnung
                 Schwerpunkte, Nachbarschaften,                    │
                 Öffnungen, Hüllkontur                             ▼
                        │                                        A4 Kachellesung
                        │  Marken ins Bild                         │  (je Kachel)
                        ▼                                          ▼
                 Markenbild, Belegblatt        ──────────────►  A5 Hüllkunde
                        │                                          │
                        │                                          ▼
                        │                                        A6 Gegenlesung (blind)
                        ▼                                          │
                 Zusammenführen, Toleranzen  ◄────────────────────┘
                        │
                        ▼                                        A7 Schlussprüfung
                 KONTROLLBLATT  ◄──────────────────────────────────┘
                        │
                        ▼
                 Fragebogen (Typologie vorbelegt)  ──►  rechne()  ──►  Bericht
```

Die Trennlinie ist scharf: **Zahlen mit Einheit Meter entstehen aus Pixeln mal
Maßstab, nie aus einer Modellantwort.** Das Modell liefert Namen, Arten,
Zuordnungen, abgelesene Texte und begründete Schlüsse.

---

## 3 Grundregeln

| Nr. | Regel | Warum |
|---|---|---|
| G1 | Das Modell gibt **keine Bildkoordinaten** aus. Es antwortet mit Markennummern oder Rasterzellen | Koordinaten aus Bildmodellen sind die unzuverlässigste Größe überhaupt, und ein falscher Pixelwert fällt in einer Tabelle nicht auf |
| G2 | Das Modell setzt **nicht den Maßstab**. Es liest nur den Text der Maßzahl | Grundregel aus `BAUPLAN.md` Abschnitt 3. Ein Lesefehler im Maßstab skaliert jede Fläche |
| G3 | **Flächen in m² niemals vom Modell**, außer sie sind im Raumstempel angeschrieben — und dann nur als Kontrollwert gegen die gerechnete Fläche | Eine geschätzte Fläche geht in die Anlagenauslegung und ist dort nicht mehr auffindbar |
| G4 | **Alle JSON-Schlüssel und Aufzählungswerte in ASCII** (`flaeche_m2`, nicht `fläche_m2`; `aussen`, nicht `außen`). Umlaute überall sonst: in Freitextwerten, Beschreibungen, Prompts, Anzeigetexten | Im heutigen Endpunkt heißt das Feld `fläche_m2`, `src/modul_ki.js` Z. 118 liest `r.flaeche_m2`. Jede abgelesene Fläche geht dadurch still verloren und der Raum landet mit `A: 0` im Raumbuch. Genau dieser Fehler wird mit der Regel ausgeschlossen |
| G5 | **Systemprompt und Schema liegen auf dem Endpunkt**, der Aufrufer schickt nur einen Aufgabennamen aus einer festen Liste | Sonst ist der Endpunkt ein offener Modellzugang für jeden, der den Zugangscode hat |
| G6 | **Jede Aussage trägt Herkunft und Konfidenz.** Herkunft ist eine von sechs: `plan_gerechnet`, `plan_gelesen`, `plan_text`, `typologie`, `eingabe`, `norm` | Das Kontrollblatt und Kapitel 10 des Berichts leben davon |
| G7 | **Keine personenbezogenen Angaben** aus dem Plankopf. Der obere Blattstreifen wird zusätzlich vor dem Senden geschwärzt, wie heute schon | Datenschutz, offener Punkt 1 im Bauplan |
| G8 | **Kein Aufruf ist notwendig.** Fällt einer aus, bleibt das Feld leer und wird zum offenen Punkt | Ein Werkzeug, das ohne Netz nicht rechnet, ist im Ernstfall wertlos |
| G9 | **Die Gegenprüfung ist blind**, der Vergleich deterministisch | Ein Modell, das seine eigene Antwort bewerten soll, bestätigt sie meistens |
| G10 | **Widerspruch schlägt Konfidenz.** Weichen zwei Lesungen ab, ist der Wert `unsicher`, auch wenn beide „sicher" gemeldet haben | Zwei übereinstimmende Irrtümer sind seltener als ein selbstsicherer |

---

## 4 Die Marken

Das Bindeglied zwischen Geometrie und Modell. Alle Marken zeichnet der Rechner
in eine Kopie des gerenderten Bildes, bevor es gesendet wird.

| Marke | Form und Farbe | Wofür |
|---|---|---|
| Raummarke | gefüllter Kreis, Magenta `#E5007D`, weiße fette Zahl, Durchmesser 46 px bei 254 dpi (≙ 4,6 mm) | eine je gefundener Fläche, fortlaufend ab 1 |
| Umriss | Linie 3 px in derselben Farbe | Umriss der Fläche, damit die Zuordnung eindeutig bleibt |
| Öffnungsmarke | Quadrat, Blau `#123A63`, weiße Zahl, Kantenlänge 34 px | eine je erkannter Wandöffnung, fortlaufend ab 1 |
| Kantenmarke | Raute, Orange `#E08A1E`, außerhalb der Hüllkontur | eine je Kante der Hüllkontur, fortlaufend ab 1 |
| Raster | gestrichelte Linien, Grau 40 %, Beschriftung A–F waagerecht, 1–6 senkrecht am Rand | nur auf Kacheln, für die Lage von Maßketten |

**Wo die Raummarke sitzt.** Nicht im Schwerpunkt, sondern im tintenfreiesten
Punkt der Fläche: dem Punkt innerhalb des Polygons mit dem größten Abstand zu
dunklen Bildpunkten. Sonst deckt die Marke genau den Raumstempel zu, den das
Modell lesen soll.

**Farbwahl.** Magenta, Blau und Orange kommen auf Bauzeichnungen und Blaupausen
praktisch nicht vor. Jeder Systemprompt sagt ausdrücklich, dass farbige Marken
vom Werkzeug stammen und nicht Teil des Plans sind. Ob das ausreicht, ist nicht
gemessen — offener Punkt O2.

**Das Belegblatt** für die Gegenlesung entsteht aus denselben Marken: um jede
Raummarke wird ein Ausschnitt von 520 × 320 px bei 254 dpi (≙ 52 × 32 mm)
geschnitten, alle Ausschnitte werden in ein Raster von höchstens 1932 × 1932 px
gesetzt, jeder mit seiner Nummer in der linken oberen Ecke. Passen nicht alle
hinein, entstehen mehrere Belegblätter.

---

## 5 Die Abfolge

| Aufruf | Wann | Anzahl | Eingabebild | Modell | Aufwand |
|---|---|---|---|---|---|
| **A1** Blattsortierung | einmal je Dokument | 1 | alle Seitenvorschauen, lange Kante 600 px | `claude-sonnet-5` | `effort: low` |
| **A2** Blattkunde | je Grundrissblatt | n | ganze Seite, hochauflösend | `claude-opus-5` | `effort: medium` |
| **A2S** Schnittkunde | je Schnitt- oder Ansichtsblatt | m | ganze Seite, hochauflösend | `claude-opus-5` | `effort: medium` |
| **A3** Raumzuordnung | je Grundrissblatt | n | ganze Seite mit Raummarken | `claude-opus-5` | `effort: medium` |
| **A4** Kachellesung | je Kachel | n × 6 | Kachel mit Marken und Raster | `claude-sonnet-5` | `effort: low` |
| **A5** Hüllkunde | je Grundrissblatt | n | ganze Seite mit Kantenmarken | `claude-opus-5` | `effort: medium` |
| **A6** Gegenlesung | je Grundrissblatt | n | Belegblatt | `claude-sonnet-5` | `effort: low` |
| **A7** Schlussprüfung | einmal je Projekt | 1 | kein Bild | `claude-opus-5` | `effort: high` |

**Reihenfolge und Nebenläufigkeit.** A1 zuerst, weil erst danach feststeht,
welche Blätter überhaupt gekachelt werden. Dann je Blatt A2, danach A3 (A3
braucht aus A2 das Geschoss und den Befund, ob das Blatt zwei spiegelgleiche
Hälften zeigt). A4, A5 und A6 laufen nebeneinander, sobald A3 vorliegt. A7 ganz
am Ende, wenn alles zusammengeführt ist. Blätter untereinander laufen parallel.

**Nebenläufigkeit begrenzen** auf vier gleichzeitige Aufrufe. Mehr bringt nichts
und erzeugt 429-Antworten.

**Fächerregel für den Zwischenspeicher.** Ein Zwischenspeichereintrag ist erst
lesbar, wenn die erste Antwort zu strömen beginnt. Deshalb bei A4: eine Kachel
senden, auf das erste Datenstück warten, dann die übrigen. Sonst zahlen alle
zwölf Aufrufe den vollen Preis für denselben Systemprompt.

### 5.1 Modellwahl

Die Vorgabe von Anthropic lautet `claude-opus-5`, sofern nichts anderes
verlangt ist. Der heutige Endpunkt steht auf `claude-sonnet-5`, mit der
Begründung Laufzeit. Beides lässt sich verbinden:

* **Urteilsaufrufe auf Opus 5** — A2, A2S, A3, A5, A7. Hier entscheidet sich, ob
  eine Wand nach außen oder gegen den Nachbarn zeigt und ob das Blatt zwei
  Haushälften zeigt. Fehler an dieser Stelle sind teuer und im Ergebnis
  unsichtbar.
* **Lesearbeit auf Sonnet 5** — A1, A4, A6. Viele gleichartige Aufrufe, klar
  umgrenzte Aufgabe, und der Preisunterschied schlägt hier durch, weil A4 allein
  mehr als die Hälfte aller Eingabetoken verbraucht.

Umstellbar über `WERKE_MODELL`, wie heute. Abschnitt 10 zeigt die Kosten für
beide Reinformen und für die Mischung. **Die Wahl liegt bei Sebastian**; die
Zahlen sind da, um sie zu treffen.

### 5.2 Gemeinsame Aufrufparameter

```jsonc
{
  "model": "<je Aufruf, siehe Tabelle>",
  "max_tokens": 4000,                  // je Aufruf gesetzt, siehe Einzelabschnitte
  "stream": true,                      // Pflicht, siehe unten
  "thinking": { "type": "adaptive" },
  "output_config": {
    "effort": "low | medium | high",   // Haupthebel für die Laufzeit
    "format": { "type": "json_schema", "schema": { /* je Aufruf */ } }
  },
  "system": [ { "type": "text", "text": "<Systemprompt>",
                "cache_control": { "type": "ephemeral" } } ],
  "messages": [ { "role": "user", "content": [ /* Bild(er), dann Text */ ] } ]
}
```

Fünf Punkte, die nicht verhandelbar sind:

1. **`stream: true` immer.** Nicht wegen der Ausgabemenge, sondern weil die
   serverlose Funktion sonst abbricht, bevor das Modell fertig ist. Der heutige
   Endpunkt löst das bereits so und schickt Leerzeilen als Lebenszeichen.
2. **`output_config.format` statt Werkzeugzwang.** Der heutige Endpunkt erzwingt
   die Struktur über ein Werkzeug mit `tool_choice`. Die strukturierte Ausgabe
   ist der dafür vorgesehene Weg, der erste Inhaltsblock ist dann Text mit
   gültigem JSON. Grenzen des Schemas beachten: kein `minimum`/`maximum`, kein
   `minLength`, keine Rekursion, und `additionalProperties: false` ist bei jedem
   Objekt Pflicht.
3. **Neue Schemata kosten beim ersten Aufruf Zeit.** Ein Schema wird einmal
   übersetzt und danach 24 Stunden zwischengespeichert. Die Schemata sind fest
   verdrahtet und ändern sich nie zur Laufzeit, der Aufschlag trifft also
   höchstens den ersten Bericht des Tages.
4. **`effort` ist der Laufzeithebel**, nicht `max_tokens`. Bei `high` denkt das
   Modell länger, als die 30 Sekunden erlauben. Deshalb `low` für reine
   Lesearbeit, `medium` für Urteile am Bild, `high` nur für A7 ohne Bild.
5. **Zwischenspeichermarke auf dem Systemprompt.** Die Systemprompts von A4
   liegen mit Schema über der Mindestlänge; die zwölf Kachelaufrufe teilen ihn
   sich. Ein Bildwechsel entwertet den Systemspeicher nicht.

---

## 6 Die Aufrufe im Einzelnen

Alle Systemprompts stehen im Wortlaut. Sie sind Teil der Spezifikation, nicht
Beispiele.

---

### A1 — Blattsortierung

**Zweck.** Aus einem Planpaket die Blätter herausfinden, die ausgewertet werden,
und jedem Grundriss sein Geschoss geben. Das ist die eine Stelle, an der eine
Rückfrage beim Bearbeiter vorgesehen ist (`SPEZIFIKATION_FORMATE.md` 6.2).

**Eingabe.** Je Seite ein Vorschaubild mit langer Kante 600 px, dazu als Text
die Angaben, die pdf.js ohne Modell liefert: Blattmaß in mm, Drehung, Anzahl
Textstücke, Anzahl Bilder, Anzahl Pfade, erkannter Typ nach der Regel aus
`SPEZIFIKATION_FORMATE.md` 6.1, und der Text des Blattkopfes, soweit ein
Textlayer vorhanden ist.

**Systemprompt**

```
Du ordnest die Seiten eines Planpakets für eine Heizlastberechnung nach
DIN EN 12831-1 ein.

Du bekommst je Seite ein kleines Vorschaubild und die Angaben, die das Werkzeug
ohne dich aus der Datei gelesen hat: Blattmaß, Drehung, Anzahl der Textstücke,
Anzahl der Bilder, Anzahl der Pfade und den Text des Blattkopfes, soweit
vorhanden.

Deine Aufgabe ist die Einordnung, nicht das Ablesen von Maßen. Die
Vorschaubilder sind absichtlich klein. Versuche nicht, Maßzahlen daraus zu
lesen, und gib keine Maße an.

Ordne jede Seite genau einer Art zu:
  grundriss   Geschossgrundriss
  schnitt     Schnitt oder Ansicht
  lageplan    Lageplan, Flurkarte, Übersicht
  text        Baubeschreibung, Deckblatt, Seite ohne Zeichnung
  sonstiges   alles andere

Bei einem Grundriss nennst du das Geschoss so, wie es im Blatt steht. Übliche
Kürzel sind KG, EG, 1.OG, 2.OG, DG, SpB. Steht im Blatt keine Geschossangabe,
setze geschoss auf null und schreibe unter hinweis, woran es fehlt. Die
Reihenfolge der Seiten ist ein Indiz, kein Beleg. Wenn du dich auf sie stützt,
muss das in der Begründung stehen und die Konfidenz ist höchstens "unsicher".

Liegt derselbe Grundriss mehrfach im Paket, etwa als Bestand und als Entwurf
oder in zwei Bearbeitungsständen, vermerke das unter widersprueche. Welche
Fassung gilt, entscheidet der Bearbeiter, nicht du.

Setze verwenden nur bei Blättern auf true, die für eine Heizlastberechnung
gebraucht werden: Grundrisse aller Geschosse einschließlich Keller und
Dachgeschoss, dazu Schnitte. Lagepläne und Textseiten brauchen wir nicht als
Bild.

Personenbezogene Angaben aus dem Plankopf, also Namen von Bauherren, Anschriften
und Unterschriften, gibst du nicht wieder.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "seiten": {
      "type": "array",
      "description": "Ein Eintrag je übergebener Seite, in derselben Reihenfolge.",
      "items": {
        "type": "object",
        "properties": {
          "nummer": { "type": "integer", "description": "Seitenzahl wie übergeben, beginnend bei 1" },
          "art": { "type": "string", "enum": ["grundriss", "schnitt", "lageplan", "text", "sonstiges"] },
          "geschoss": {
            "anyOf": [{ "type": "string" }, { "type": "null" }],
            "description": "Geschossbezeichnung wörtlich aus dem Blatt, z. B. KG, EG, 1.OG, DG. null, wenn nichts angeschrieben ist."
          },
          "geschoss_beleg": { "type": "string", "description": "Wo die Angabe steht, z. B. Blattkopf unten rechts. Leerer String, wenn geschoss null ist." },
          "blattbezeichnung": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "Titel des Blattes ohne Namen von Personen" },
          "verwenden": { "type": "boolean", "description": "true, wenn das Blatt für die Heizlast ausgewertet werden soll" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] },
          "hinweis": { "type": "string" }
        },
        "required": ["nummer", "art", "geschoss", "geschoss_beleg", "blattbezeichnung", "verwenden", "konfidenz", "hinweis"],
        "additionalProperties": false
      }
    },
    "geschossfolge": {
      "type": "array",
      "description": "Die erkannten Geschosse von unten nach oben, z. B. KG, EG, OG, DG. Nur Geschosse, für die ein Grundriss vorliegt.",
      "items": { "type": "string" }
    },
    "widersprueche": {
      "type": "array",
      "description": "Doppelte Blätter, widersprüchliche Geschossangaben, fehlende Geschosse in der Folge.",
      "items": { "type": "string" }
    }
  },
  "required": ["seiten", "geschossfolge", "widersprueche"],
  "additionalProperties": false
}
```

**Token und Kosten** (drei Seiten, Vorschau 600 × 424 px = 22 × 16 = 352 Token
je Bild)

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 900 |
| 3 Vorschaubilder | 1.056 |
| Sachangaben je Seite als Text | rund 600 |
| **Eingabe** | **rund 2.556** |
| Ausgabe (Annahme) | 400 |

`max_tokens: 1500`.

**Wenn er scheitert.** Der örtliche Weg trägt allein: Blatttyp aus der Regel
„viele Pfade und Text → Vektorplan, Bild ohne Text → Scan"
(`SPEZIFIKATION_FORMATE.md` 6.1), Geschoss aus dem Blattkopftext per
Zeichenkettensuche nach „Erdgeschoss", „Obergeschoss", „Dachgeschoss",
„Kellergeschoss" und den Kürzeln. Bleibt das ohne Ergebnis, zeigt das Werkzeug
die Seitenübersicht mit leerer Geschossspalte, und der Bearbeiter ordnet zu.
Das ist ohnehin der vorgesehene Bestätigungsschritt, es fehlt nur der Vorschlag.

---

### A2 — Blattkunde

**Zweck.** Die Aussagen, die für das ganze Blatt gelten und die kein
Geometriekern liefern kann: Maßstabsvermerk, Norden, ob das Gebäude angebaut
ist, ob das Blatt mehrere Nutzungseinheiten oder zwei spiegelgleiche Hälften
zeigt, welche unbeheizten Bereiche zu sehen sind.

Der Fall Mälzerstraße zeigt, warum das ein eigener Aufruf ist: Der Kellerplan
von 1936 zeigt zwei spiegelgleiche Hälften mit gemeinsamer Mittelwand, und genau
das ist der Beleg dafür, dass Nummer 59 einseitig angebaut ist und eine
Außenwand entfällt (Bericht, Abbildung 1). Wer das übersieht, rechnet eine
Außenwand zu viel und dieselbe Fläche doppelt.

**Eingabe.** Die ganze Seite hochauflösend, ohne Marken. Als Text: Blattmaß,
Renderauflösung, das Ergebnis von A1 für dieses Blatt.

**Systemprompt**

```
Du liest ein Grundrissblatt für eine Heizlastberechnung nach DIN EN 12831-1.

In diesem Schritt geht es NICHT um einzelne Räume und NICHT um Maße. Es geht um
das, was für das ganze Blatt gilt. Räume und Maße liest ein anderer Schritt.

Lies ab und gib zurück:

1. Den Maßstabsvermerk wörtlich, so wie er auf dem Blatt steht, zum Beispiel
   "M 1:100" oder "1:50". Steht keiner da, ist das null. Rechne den Maßstab
   nicht aus und schätze ihn nicht.

2. Den Nordpfeil: ob einer vorhanden ist und in welche Richtung er auf dem
   Blatt zeigt.

3. Die Lage des Gebäudes: freistehend, einseitig angebaut, beidseitig angebaut.
   Achte auf Grenzlinien, auf schraffierte Nachbarbebauung, auf eine Wand ohne
   Fenster über die ganze Länge, auf Beschriftungen wie "Bestand", "Nachbar",
   "Haus Nr. ...". Nenne im Beleg, woran du es festmachst. Ohne erkennbaren
   Beleg ist die Angabe "unklar", nicht "freistehend".

4. Ob das Blatt mehr als ein Gebäude oder mehr als eine Nutzungseinheit zeigt,
   insbesondere zwei spiegelgleiche Hälften eines Doppelhauses. Das ist wichtig,
   weil dann nur eine Hälfte gerechnet wird und die Mittelwand keine Außenwand
   ist.

5. Die unbeheizten Bereiche, die auf diesem Blatt zu sehen sind: Keller,
   Bodenraum, Spitzboden, Garage, Durchfahrt, unbeheiztes Treppenhaus, kalter
   Anbau. Je Bereich, woran du ihn erkennst.

6. Treppen und wohin sie führen.

7. Befunde: was sich aus dem Blatt ABLEITEN lässt, über das Abgelesene hinaus.
   Zu jedem Befund die Herleitung, so ausführlich, dass ein Prüfer sie
   nachvollziehen kann, ohne dich zu fragen. Ein Beispiel für einen guten
   Befund: "Der Plan zeigt zwei spiegelgleiche Hälften mit gemeinsamer
   Mittelwand. Daraus folgt, dass die Mittelwand keine Außenwand ist, sondern
   eine Haustrennwand gegen ein beheiztes Nachbargebäude."

Halte dich an das, was auf dem Blatt steht. Wenn du etwas nicht erkennst, ist
"unklar" die richtige Antwort und der Bearbeiter ergänzt es. Ein falsch
geratener Wert ist deutlich schädlicher als eine fehlende Angabe, weil er in
eine Anlagenauslegung einfließt und dort nicht mehr auffällt.

Personenbezogene Angaben aus dem Plankopf gibst du nicht wieder.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "geschoss": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
    "geschoss_beleg": { "type": "string" },
    "massstabsvermerk": {
      "anyOf": [{ "type": "string" }, { "type": "null" }],
      "description": "Wörtlich vom Blatt, z. B. M 1:100. Nicht ausrechnen."
    },
    "nordpfeil": {
      "type": "object",
      "properties": {
        "vorhanden": { "type": "boolean" },
        "norden_zeigt": { "type": "string", "enum": ["oben", "unten", "links", "rechts", "schraeg", "unklar"] }
      },
      "required": ["vorhanden", "norden_zeigt"],
      "additionalProperties": false
    },
    "gebaeudelage": {
      "type": "object",
      "properties": {
        "art": { "type": "string", "enum": ["freistehend", "einseitig_angebaut", "beidseitig_angebaut", "unklar"] },
        "beleg": { "type": "string", "description": "Woran im Plan das erkennbar ist" },
        "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
      },
      "required": ["art", "beleg", "konfidenz"],
      "additionalProperties": false
    },
    "mehrere_einheiten": {
      "type": "object",
      "properties": {
        "vorhanden": { "type": "boolean" },
        "art": { "type": "string", "enum": ["keine", "spiegelgleiche_haelften", "mehrere_wohnungen", "mehrere_gebaeude", "unklar"] },
        "anzahl": { "anyOf": [{ "type": "integer" }, { "type": "null" }] },
        "beleg": { "type": "string" },
        "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
      },
      "required": ["vorhanden", "art", "anzahl", "beleg", "konfidenz"],
      "additionalProperties": false
    },
    "unbeheizte_bereiche": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bezeichnung": { "type": "string", "description": "Wörtlich aus dem Plan, sonst eine Beschreibung der Lage" },
          "art": { "type": "string", "enum": ["keller", "bodenraum", "spitzboden", "garage", "durchfahrt", "treppenhaus", "anbau", "sonstiges"] },
          "beleg": { "type": "string" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["bezeichnung", "art", "beleg", "konfidenz"],
        "additionalProperties": false
      }
    },
    "treppen": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "beschreibung": { "type": "string" },
          "verbindet": { "type": "string", "description": "Welche Geschosse, soweit erkennbar" }
        },
        "required": ["beschreibung", "verbindet"],
        "additionalProperties": false
      }
    },
    "befunde": {
      "type": "array",
      "description": "Abgeleitete Aussagen mit Herleitung.",
      "items": {
        "type": "object",
        "properties": {
          "thema": { "type": "string" },
          "aussage": { "type": "string" },
          "herleitung": { "type": "string" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["thema", "aussage", "herleitung", "konfidenz"],
        "additionalProperties": false
      }
    },
    "hinweise": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["geschoss", "geschoss_beleg", "massstabsvermerk", "nordpfeil", "gebaeudelage",
               "mehrere_einheiten", "unbeheizte_bereiche", "treppen", "befunde", "hinweise"],
  "additionalProperties": false
}
```

**Token und Kosten**

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 1.100 |
| Bild ganze Seite A3, hochauflösend, 2275 × 1609 | 4.756 |
| Kontext aus A1 | rund 300 |
| **Eingabe** | **rund 6.156** |
| Ausgabe (Annahme) | 600 |

`max_tokens: 2500`.

**Wenn er scheitert.** Der Maßstabsvermerk kommt bei Vektor-PDF ohnehin aus dem
Textlayer (`M 1:100` wurde am Prüfstand als Textstück gefunden,
`SPEZIFIKATION_FORMATE.md` 7.1). Die übrigen Felder bleiben leer und stehen im
Fragebogen als Frage: „Ist das Gebäude freistehend, einseitig oder beidseitig
angebaut?" mit den Antwortmöglichkeiten und ohne Vorbelegung. Für die
Heizlast ist das eine der wenigen Fragen, die ein Bearbeiter in fünf Sekunden
beantwortet — der Ausfall ist verkraftbar, das Übersehen nicht.

---

### A2S — Schnittkunde

**Zweck.** Höhen. Der Schnitt liefert die lichten Raumhöhen, die
Geschosshöhen, den Drempel, die Dachneigung und die Geländeoberkante. Im
Referenzbericht stammen alle Höhen der Berechnung aus genau dieser Zerlegung:
6,00 m über Erd- und Obergeschoss, also 3,00 m je Geschoss, und 5,60 m vom
Dachgeschossfußboden bis zum First, davon bei 9,50 m Gebäudetiefe und 45 Grad
Neigung 4,75 m Dach und 0,85 m Drempel (Bericht, Abbildung 2).

**Eingabe.** Die ganze Schnittseite hochauflösend, dazu die Geschossfolge aus A1
und der Maßstabsvermerk aus A2, falls schon bekannt.

**Systemprompt**

```
Du liest einen Bauschnitt oder eine Ansicht für eine Heizlastberechnung nach
DIN EN 12831-1. Aus dem Schnitt kommen die Höhen, und zwar nur aus dem Schnitt:
im Grundriss steht keine.

Lies ab und leite her:

1. Je Geschoss die lichte Höhe und, falls angeschrieben, das Rohbaumaß von
   Fußboden zu Fußboden. Gib die Zahlen als Text so wieder, wie sie im Plan
   stehen. Rechne nicht in andere Einheiten um.

2. Wenn eine Maßkette mehrere Geschosse zusammenfasst, gib die Kette wieder und
   sage im Beleg, wie sich daraus die einzelnen Höhen ergeben. Beispiel: "Kette
   6,00 über Erd- und Obergeschoss, zwei gleiche Geschosse, daraus 3,00 je
   Geschoss."

3. Die Dachform, die Dachneigung in Grad, falls angeschrieben, und die
   Drempelhöhe.

4. Ob das Kellergeschoss erdberührt ist, ganz oder teilweise, und woran das im
   Schnitt zu erkennen ist. Die Geländelinie ist der Beleg. Ohne Geländelinie
   ist die Antwort "unklar".

5. Alle Maßketten, die du im Schnitt liest, mit ihrer Lage im Sechserraster,
   das über das Bild gelegt ist.

Zahlen, die du nicht sicher liest, lässt du weg. Eine fehlende Höhe ergänzt der
Bearbeiter; eine falsche Höhe verändert jeden Rauminhalt und damit jede
Lüftungswärmelast, ohne dass es jemandem auffällt.
```

**Schema**

```jsonc
{
  "type": "object",
  "properties": {
    "geschosse": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bezeichnung": { "type": "string", "description": "Geschosskürzel wie im Plan, z. B. EG" },
          "lichte_hoehe_text": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "Wörtlich abgelesen, z. B. 2,75" },
          "rohbaumass_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "beleg": { "type": "string", "description": "Aus welcher Maßkette oder Bemaßung das stammt" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["bezeichnung", "lichte_hoehe_text", "rohbaumass_text", "beleg", "konfidenz"],
        "additionalProperties": false
      }
    },
    "dach": {
      "type": "object",
      "properties": {
        "form": { "type": "string", "enum": ["satteldach", "walmdach", "krueppelwalmdach", "pultdach", "flachdach", "mansarddach", "unklar"] },
        "neigung_grad_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "drempel_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "beleg": { "type": "string" },
        "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
      },
      "required": ["form", "neigung_grad_text", "drempel_text", "beleg", "konfidenz"],
      "additionalProperties": false
    },
    "gelaende": {
      "type": "object",
      "properties": {
        "keller_erdberuehrt": { "type": "string", "enum": ["ja", "teilweise", "nein", "unklar"] },
        "gelaendeoberkante_text": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "Angeschriebene Höhe der Geländeoberkante, falls vorhanden" },
        "beleg": { "type": "string" },
        "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
      },
      "required": ["keller_erdberuehrt", "gelaendeoberkante_text", "beleg", "konfidenz"],
      "additionalProperties": false
    },
    "massketten": { "$ref": "#/$defs/massketten" },
    "befunde": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "thema": { "type": "string" },
          "aussage": { "type": "string" },
          "herleitung": { "type": "string" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["thema", "aussage", "herleitung", "konfidenz"],
        "additionalProperties": false
      }
    },
    "hinweise": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["geschosse", "dach", "gelaende", "massketten", "befunde", "hinweise"],
  "additionalProperties": false,
  "$defs": {
    // Hier setzt der Endpunkt beim Zusammenbauen der Anfrage die Definition
    // des Feldes "massketten" aus A4 wörtlich ein.
    "massketten": { }
  }
}
```

`$ref` und `$defs` sind in strukturierten Ausgaben zulässig, Rekursion nicht —
hier tritt keine auf. Die Definition steht nur einmal im Quelltext des
Endpunkts und wird in beide Schemata eingesetzt, damit A2S und A4 Maßketten
nicht auseinanderlaufen können.

**Token und Kosten**: wie A2, rund 6.156 Eingabe, 500 Ausgabe (Annahme).
`max_tokens: 2500`.

**Wenn er scheitert.** Höhen sind Pflichtfelder für den Rauminhalt. Ohne A2S
fragt der Fragebogen sie ab, vorbelegt mit dem Typologiewert der
Baualtersklasse aus `src/daten/daten_typologie.js` und deutlich als Annahme
markiert. Der Bericht führt sie dann in Kapitel 10 unter den Annahmen. Kein
Ausfall des Ablaufs.

---

### A3 — Raumzuordnung

**Der Kern der Neuerung.** Das Modell bekommt das Bild mit nummerierten
Raummarken und eine Liste der gefundenen Flächen und ordnet jeder Nummer den im
Plan stehenden Namen und die Nutzungsart zu. Es muss keine Koordinaten
erfinden, es muss nur lesen, was neben der Nummer steht.

**Eingabe.**

* Bild: ganze Seite hochauflösend, mit Raummarken und Umrissen.
* Text: je Marke eine Zeile mit Pixelfläche, Anteil an der Gesamtzeichnung,
  Eckenzahl des Polygons, Schwerpunkt in Bildpunkten, Nummern der
  angrenzenden Marken und ob die Fläche an die Hüllkontur stößt.
* Ergebnis von A2 für dieses Blatt, insbesondere Geschoss und der Befund zu
  spiegelgleichen Hälften.

Beispielzeile der Markenliste:

```
Marke 4 | 118420 px2 | 7,4 % der Zeichnung | 4 Ecken | Schwerpunkt 1042/733
        | Nachbarn 3, 5, 9 | an der Hüllkontur: ja
```

**Systemprompt**

```
Du ordnest Flächen eines Grundrisses ihren Namen und Nutzungsarten zu.

Das Werkzeug hat die Flächen bereits gefunden und in das Bild nummerierte
magentafarbene Kreise gezeichnet, dazu den Umriss jeder Fläche in derselben
Farbe. Diese Marken gehören NICHT zum Plan, sie sind vom Werkzeug hinzugefügt.
Lies keine Markennummer als Maßzahl oder Raumnummer des Plans.

Zu jeder Marke bekommst du im Text die Pixelfläche, die Nachbarn und die Lage.
Deine Aufgabe ist ausschließlich die Zuordnung: welcher Name steht im Plan bei
dieser Marke, und welche Nutzungsart ist das.

Regeln:

1. Den Namen übernimmst du WÖRTLICH aus dem Plan, ohne ihn zu vereinheitlichen.
   Steht "Diele" da, schreibst du "Diele", nicht "Flur". Findest du keinen
   angeschriebenen Namen, beschreibst du die Lage, etwa "unbeschrifteter Raum
   links unten", und setzt name_woertlich auf false.

2. Die Nutzungsart wählst du aus der vorgegebenen Liste. Sie steuert die
   Norm-Innentemperatur. Bist du unsicher, nimm "unklar"; ein falsch gewählter
   Bad-Eintrag hebt die Raumtemperatur um vier Kelvin und verfälscht die
   Heizlast des Raums.

3. Nicht jede gefundene Fläche ist ein Raum. Wandzwischenräume, Schächte,
   Kamine, Terrassen, Balkone, Lufträume und Flächen außerhalb des Gebäudes
   setzt du auf ist_raum = false und schreibst unter warum, was es stattdessen
   ist.

4. Hat das Werkzeug einen Raum in zwei Flächen zerschnitten, etwa an einem
   Türanschlag oder einer Möbellinie, trage die andere Marke unter zusammen_mit
   ein. Trage sie in BEIDEN Einträgen ein.

5. Fehlt ein Raum, den du im Plan siehst, für den es aber keine Marke gibt, dann
   trage ihn unter fehlende_raeume ein und nenne die nächstgelegene Marke. Gib
   keine Koordinaten an.

6. Ordne jeden Raum einer Nutzungseinheit zu, also der Wohnung oder Einheit, zu
   der er gehört, benannt so, wie im Plan bezeichnet, sonst "Wohnung links",
   "Wohnung rechts" und so fort. Gemeinschaftsflächen wie ein Treppenhaus
   bekommen die Einheit "gemeinschaft". Diese Zuordnung wird gebraucht, weil die
   Lüftungswärmelast je Nutzungseinheit gerechnet wird.

7. Zeigt das Blatt zwei spiegelgleiche Haushälften, ordne die Marken beiden
   Hälften zu und benenne die Einheiten unterschiedlich. Welche Hälfte gerechnet
   wird, entscheidet der Bearbeiter.

Flächen in Quadratmetern gibst du in diesem Schritt NICHT an, auch wenn sie im
Raumstempel stehen. Das liest ein anderer Schritt genauer.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "zuordnungen": {
      "type": "array",
      "description": "Ein Eintrag je Marke aus der Liste, in aufsteigender Reihenfolge.",
      "items": {
        "type": "object",
        "properties": {
          "marke": { "type": "integer" },
          "ist_raum": { "type": "boolean" },
          "warum_kein_raum": { "type": "string", "description": "Nur ausfüllen, wenn ist_raum false ist. Sonst leerer String." },
          "name": { "type": "string", "description": "Raumname wörtlich aus dem Plan oder eine Lagebeschreibung" },
          "name_woertlich": { "type": "boolean", "description": "true, wenn der Name so im Plan steht" },
          "raumart": {
            "type": "string",
            "enum": ["wohnen", "kueche", "bad", "wc", "flur", "treppenhaus", "buero", "verkauf",
                     "lager_beheizt", "werkstatt", "keller", "bodenraum", "spitzboden", "garage",
                     "durchfahrt", "aussenbereich", "unklar"],
            "description": "Bezeichner der Raumart im Werkzeug. Steuert die Norm-Innentemperatur."
          },
          "beheizt": { "type": "string", "enum": ["ja", "nein", "unklar"] },
          "einheit": { "type": "string", "description": "Nutzungseinheit, zu der der Raum gehört. Gemeinschaftsflächen: gemeinschaft" },
          "zusammen_mit": { "type": "array", "items": { "type": "integer" }, "description": "Markennummern, die zum selben Raum gehören. Leeres Feld, wenn keine." },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] },
          "fundstelle": { "type": "string", "description": "Wo der Name steht, z. B. Raumstempel in der Fläche, Beschriftung darüber" }
        },
        "required": ["marke", "ist_raum", "warum_kein_raum", "name", "name_woertlich", "raumart",
                     "beheizt", "einheit", "zusammen_mit", "konfidenz", "fundstelle"],
        "additionalProperties": false
      }
    },
    "fehlende_raeume": {
      "type": "array",
      "description": "Räume im Plan, für die keine Marke gesetzt wurde.",
      "items": {
        "type": "object",
        "properties": {
          "beschreibung": { "type": "string" },
          "name": { "type": "string" },
          "neben_marke": { "type": "integer", "description": "Nummer der nächstgelegenen Marke" },
          "lage_zur_marke": { "type": "string", "enum": ["oberhalb", "unterhalb", "links", "rechts", "unklar"] }
        },
        "required": ["beschreibung", "name", "neben_marke", "lage_zur_marke"],
        "additionalProperties": false
      }
    },
    "einheiten": {
      "type": "array",
      "description": "Die auf diesem Blatt vergebenen Nutzungseinheiten.",
      "items": {
        "type": "object",
        "properties": {
          "bezeichnung": { "type": "string" },
          "art": { "type": "string", "enum": ["wohnung", "gewerbe", "gemeinschaft", "unbeheizt", "unklar"] },
          "marken": { "type": "array", "items": { "type": "integer" } }
        },
        "required": ["bezeichnung", "art", "marken"],
        "additionalProperties": false
      }
    },
    "hinweise": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["zuordnungen", "fehlende_raeume", "einheiten", "hinweise"],
  "additionalProperties": false
}
```

**Token und Kosten** (bei 12 Marken)

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 1.300 |
| Bild ganze Seite mit Marken | 4.756 |
| Markenliste, 12 Zeilen | rund 700 |
| **Eingabe** | **rund 6.756** |
| Ausgabe (Annahme) | 900 |

`max_tokens: 4000`.

**Wenn er scheitert.** Die Flächen bleiben, die Namen fehlen. Das Kontrollblatt
zeigt sie als „Fläche 1" bis „Fläche n" mit der gerechneten Quadratmeterzahl und
einer leeren Namensspalte, die Raumart steht auf `unklar` und muss gewählt
werden. Das ist mühsamer als heute, aber die Geometrie — der eigentliche Aufwand
— ist trotzdem erledigt. **Ein Wiederholungsversuch ist erlaubt**, weil A3 der
wertvollste Aufruf der Kette ist: einmal mit `effort: high` und derselben
Eingabe. Zweiter Fehlschlag beendet den Versuch.

---

### A4 — Kachellesung

**Zweck.** Alles, was kleine Schrift ist: Raumstempel mit Name, Fläche und
Umfang, Maßketten, Beschriftungen von Fenstern und Türen. Nur auf der Kachel
sind 2 mm Schrift mit 28 Bildpunkten Versalhöhe lesbar; auf der ganzen Seite
sind es 10,8 (`SPEZIFIKATION_FORMATE.md` 5.3). Der belastbare Beleg dafür steht
in 5.4: auf der Kachel kam der Raumstempel „Masch. R. Aufzug A=3,42m² U=7,70m"
vollständig durch, auf der ganzen Seite nicht.

**Eingabe.**

* Bild: eine Kachel 1932 × 1932 px bei 254 dpi, mit Raummarken, Öffnungsmarken
  und dem Sechserraster.
* Text: Kachelkennung, Zeile und Spalte im Blatt, Renderauflösung in dpi, die
  Marken, deren Mittelpunkt in dieser Kachel liegt, sowie Geschoss und
  Maßstabsvermerk aus A2.

**Systemprompt**

```
Du liest einen Ausschnitt eines Bauplans und gibst wieder, was dort geschrieben
steht. Der Ausschnitt ist eine Kachel eines größeren Blattes.

Über das Bild ist ein Raster gelegt, waagerecht mit A bis F beschriftet,
senkrecht mit 1 bis 6. Damit gibst du die Lage an. Nenne niemals Bildpunkte
oder Koordinaten.

Die farbigen Marken im Bild stammen vom Werkzeug und gehören nicht zum Plan:
magentafarbene Kreise nummerieren Räume, blaue Quadrate nummerieren
Wandöffnungen. Verwechsle ihre Zahlen nicht mit Maßzahlen.

Gib drei Dinge zurück.

ERSTENS die Raumstempel. Ein Raumstempel ist die Beschriftung in einer Fläche,
meist Name, oft eine Fläche in Quadratmetern, manchmal ein Umfang oder eine
lichte Höhe. Gib den Text wörtlich wieder und zusätzlich die einzelnen Werte,
soweit du sie sicher trennst. Ordne den Stempel der Raummarke zu, in deren
Fläche er steht. Findest du keine passende Marke, setze marke auf null.

ZWEITENS die Maßketten. Eine Maßkette ist eine Reihe von Maßzahlen entlang einer
Linie, oft mit einer Gesamtzahl daneben oder darunter. Gib die Glieder in der
Reihenfolge wieder, in der sie auf der Linie stehen, dazu die Rasterzelle, in
der die Kette beginnt, und ihre Richtung. Wenn eine Gesamtzahl dabeisteht, gib
sie getrennt an. Zerschneidet der Kachelrand eine Kette, gib nur die Glieder an,
die vollständig zu sehen sind, und setze angeschnitten auf true.

Zur Einheit: Auf deutschen Bauzeichnungen sind zwei- bis dreistellige Zahlen mit
Komma fast immer Meter, zum Beispiel 4,20. Ganze Zahlen wie 24, 30 oder 36,5
unmittelbar an einer Wand sind fast immer Wandstärken in Zentimetern. Angaben
der Form 1,26/1,38 an einer Öffnung sind Breite durch Höhe in Metern. Gib deine
Einschätzung als einheit_vermutet an, rechne aber NICHT um: der Text bleibt so,
wie er dasteht.

DRITTENS die Öffnungsbeschriftungen. Zu jeder blau markierten Öffnung, soweit
etwas dabeisteht: Art, Kennzeichen wie F1 oder T2, Breite, Höhe, Brüstungshöhe.
Ist nichts angeschrieben, lasse die Öffnung weg statt zu raten.

Was du nicht sicher lesen kannst, lässt du weg und nennst es unter
unleserlich. Eine fehlende Zahl kann der Bearbeiter nachtragen; eine falsch
gelesene findet er nie.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "raumstempel": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "marke": { "anyOf": [{ "type": "integer" }, { "type": "null" }] },
          "text_woertlich": { "type": "string", "description": "Der Stempel so, wie er dasteht, mit Zeilenumbruch als Leerzeichen" },
          "name": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "flaeche_text": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "Zahl wie angeschrieben, z. B. 15,40" },
          "umfang_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "hoehe_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "lage_zelle": { "type": "string", "description": "Rasterzelle, z. B. C3" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["marke", "text_woertlich", "name", "flaeche_text", "umfang_text", "hoehe_text", "lage_zelle", "konfidenz"],
        "additionalProperties": false
      }
    },
    "massketten": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "lage_zelle": { "type": "string", "description": "Rasterzelle, in der die Kette beginnt, z. B. A4" },
          "richtung": { "type": "string", "enum": ["waagerecht", "senkrecht", "schraeg"] },
          "glieder": {
            "type": "array",
            "description": "Die Maßzahlen in der Reihenfolge auf der Linie, wörtlich.",
            "items": {
              "type": "object",
              "properties": {
                "text": { "type": "string" },
                "einheit_vermutet": { "type": "string", "enum": ["m", "cm", "mm", "unklar"] }
              },
              "required": ["text", "einheit_vermutet"],
              "additionalProperties": false
            }
          },
          "summe_text": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "Gesamtmaß der Kette, falls angeschrieben" },
          "bezug": { "type": "string", "description": "Was gemessen wird, soweit erkennbar, z. B. Außenkante bis Mittelwand" },
          "angeschnitten": { "type": "boolean", "description": "true, wenn der Kachelrand die Kette zerschneidet" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["lage_zelle", "richtung", "glieder", "summe_text", "bezug", "angeschnitten", "konfidenz"],
        "additionalProperties": false
      }
    },
    "oeffnungen": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "marke": { "anyOf": [{ "type": "integer" }, { "type": "null" }] },
          "art": { "type": "string", "enum": ["fenster", "innentuer", "aussentuer", "durchgang", "unklar"] },
          "kennzeichen": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "z. B. F1, T2" },
          "breite_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "hoehe_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "bruestung_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "einheit_vermutet": { "type": "string", "enum": ["m", "cm", "mm", "unklar"] },
          "lage_zelle": { "type": "string" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["marke", "art", "kennzeichen", "breite_text", "hoehe_text", "bruestung_text",
                     "einheit_vermutet", "lage_zelle", "konfidenz"],
        "additionalProperties": false
      }
    },
    "unleserlich": {
      "type": "array",
      "description": "Stellen mit Schrift, die nicht sicher gelesen werden konnte.",
      "items": {
        "type": "object",
        "properties": {
          "lage_zelle": { "type": "string" },
          "was_zu_sehen_ist": { "type": "string" }
        },
        "required": ["lage_zelle", "was_zu_sehen_ist"],
        "additionalProperties": false
      }
    },
    "nichts_gefunden": { "type": "boolean", "description": "true, wenn die Kachel keine lesbare Beschriftung enthält" }
  },
  "required": ["raumstempel", "massketten", "oeffnungen", "unleserlich", "nichts_gefunden"],
  "additionalProperties": false
}
```

**Token und Kosten**

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 1.400 |
| Kachel 1932 × 1932 px = 69 × 69 Bildfelder | 4.761 |
| Kacheldaten und Markenliste | rund 400 |
| **Eingabe je Kachel** | **rund 6.561** |
| Ausgabe je Kachel (Annahme) | 700 |

`max_tokens: 4000`. Bei sechs Kacheln je A3-Blatt sind das rund 39.400
Eingabetoken je Blatt.

**Wenn eine Kachel scheitert.** Nur diese Kachel fehlt. Die Räume, deren Marke
in ihr liegt, bekommen im Kontrollblatt keinen abgelesenen Stempel; ihre Fläche
kommt weiterhin aus der Geometrie, sie hat nur keinen Kontrollwert. Das
Kontrollblatt kennzeichnet das ausdrücklich: „nicht gegengelesen". Eine
Wiederholung mit halbierter Kachel ist möglich, aber nicht vorgesehen — sie
verschiebt nur die Schnittkante.

**Wenn alle Kacheln scheitern.** Der Maßstab kann dann nicht aus einer Maßkette
kommen. Es bleibt der Weg über den Maßstabsvermerk aus A2 (siehe Abschnitt 8)
und, wenn auch der fehlt, die zwei Klicks von Hand wie heute.

---

### A5 — Hüllkunde

**Zweck.** Für jede Kante der Hüllkontur bestimmen, wogegen sie grenzt. Das ist
die Angabe, die im Rechenkern über `grenzt_an.typ` und die Kategorie entscheidet
und damit über den Wärmebrückenzuschlag und darüber, ob die Kante überhaupt in
die Gebäudeheizlast eingeht (`kern_heizlast_norm.js`, Abschnitt Kategorien).

Vieles davon weiß die Geometrie schon: liegt hinter der Kante eine andere
Fläche, ist sie innen; liegt nichts dahinter, ist sie außen. Das Modell wird
nur für das gebraucht, was die Geometrie nicht sehen kann: Nachbargebäude,
Erdreich, unbeheizte Anbauten.

**Eingabe.**

* Bild: ganze Seite hochauflösend mit Kantenmarken (Rauten außerhalb der
  Kontur) und, blass, den Raummarken zur Orientierung.
* Text: je Kante Nummer, Länge in Metern aus der Geometrie, Richtung, welche
  Raummarke innen anliegt, was die Geometrie gegenüber sieht (`aussen`,
  Markennummer oder `unbekannt`), Himmelsrichtung falls der Nordpfeil bekannt ist.
* Aus A2: Gebäudelage, spiegelgleiche Hälften, unbeheizte Bereiche. Aus A1: das
  Geschoss.

**Systemprompt**

```
Du bestimmst für jede Wand eines Grundrisses, wogegen sie grenzt. Davon hängt
ab, wie viel Wärme durch sie verloren geht.

Das Werkzeug hat die Außenkontur des Gebäudes bereits gefunden und jede Kante
mit einer orangefarbenen Raute nummeriert. Die Rauten stammen vom Werkzeug und
gehören nicht zum Plan. Zu jeder Kante bekommst du im Text ihre Länge, ihre
Richtung und das, was das Werkzeug ohne dich erkennen konnte.

Wähle je Kante genau eine Art:

  aussen            grenzt an die Außenluft
  erdreich          grenzt an Erdreich
  nachbargebaeude   grenzt an ein fremdes, beheiztes Gebäude, also eine
                    Haustrennwand oder Gebäudetrennwand
  unbeheizte_zone   grenzt an einen unbeheizten Bereich desselben Gebäudes,
                    also Keller, Bodenraum, Garage, Durchfahrt, kalter Anbau
  innen             grenzt an einen beheizten Raum desselben Gebäudes

Belege jede Entscheidung. Ein Beleg ist etwas, das im Plan zu sehen ist:
schraffierte Nachbarbebauung, eine Grenzlinie, eine durchgehende Wand ohne
Fenster zwischen zwei spiegelgleichen Hälften, eine Beschriftung, eine
Geländelinie, ein angrenzender beschrifteter Bodenraum. "Sieht so aus" ist kein
Beleg; dann ist die Konfidenz "geraten".

Zwei Regeln, die häufig falsch gemacht werden:

1. Erdreich vergibst du nur, wenn das Blatt ein Kellergeschoss zeigt oder ein
   Beleg für erdberührte Wände vorliegt. In einem Erdgeschossgrundriss ist eine
   Außenwand gegen Außenluft, nicht gegen Erdreich.

2. Nachbargebaeude vergibst du nur bei einem FREMDEN Gebäude. Die Wand zwischen
   zwei Wohnungen desselben Hauses ist innen, nicht Nachbargebäude.

Die Temperatur des Nachbargebäudes und die U-Werte gehören nicht zu deiner
Aufgabe. Nenne sie nicht.

Zusätzlich benennst du die unbeheizten Zonen, auf die du dich beziehst, damit
sie im Werkzeug angelegt werden können.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "kanten": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "kante": { "type": "integer" },
          "grenzt_an": { "type": "string", "enum": ["aussen", "erdreich", "nachbargebaeude", "unbeheizte_zone", "innen"] },
          "zone": { "anyOf": [{ "type": "string" }, { "type": "null" }], "description": "Bezeichnung der unbeheizten Zone, nur bei grenzt_an = unbeheizte_zone" },
          "beleg": { "type": "string", "description": "Was im Plan das belegt" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["kante", "grenzt_an", "zone", "beleg", "konfidenz"],
        "additionalProperties": false
      }
    },
    "zonen": {
      "type": "array",
      "description": "Die unbeheizten Zonen, auf die sich die Kanten beziehen.",
      "items": {
        "type": "object",
        "properties": {
          "bezeichnung": { "type": "string" },
          "art": { "type": "string", "enum": ["keller", "bodenraum", "spitzboden", "garage", "durchfahrt", "treppenhaus", "anbau", "sonstiges"] },
          "beleg": { "type": "string" },
          "konfidenz": { "type": "string", "enum": ["sicher", "unsicher", "geraten"] }
        },
        "required": ["bezeichnung", "art", "beleg", "konfidenz"],
        "additionalProperties": false
      }
    },
    "widerspruch_zur_geometrie": {
      "type": "array",
      "description": "Kanten, bei denen deine Einschätzung dem widerspricht, was das Werkzeug gemeldet hat.",
      "items": {
        "type": "object",
        "properties": {
          "kante": { "type": "integer" },
          "werkzeug_sagt": { "type": "string" },
          "du_sagst": { "type": "string" },
          "begruendung": { "type": "string" }
        },
        "required": ["kante", "werkzeug_sagt", "du_sagst", "begruendung"],
        "additionalProperties": false
      }
    },
    "hinweise": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["kanten", "zonen", "widerspruch_zur_geometrie", "hinweise"],
  "additionalProperties": false
}
```

**Zuordnung zum Rechenkern** — die Umsetzung geschieht im Code, nicht im Modell:

| A5 liefert | wird im Projekt zu |
|---|---|
| `aussen` | `kat: "huelle"`, `grenzt_an: {typ: "aussen"}` |
| `erdreich` | `kat: "erdreich"`, `grenzt_an: {typ: "erdreich"}` |
| `nachbargebaeude` | `kat: "nachbar"`, `grenzt_an: {typ: "fest", theta: <Ansatz aus dem Fragebogen>}` |
| `unbeheizte_zone` | `kat: "huelle"`, `grenzt_an: {typ: "zone", ref: <Zonenkennung>}` |
| `innen` | `kat: "innen"`, `grenzt_an: {typ: "raum", ref: <Raumkennung>}` |

Der Temperaturansatz für das Nachbargebäude ist ausdrücklich **kein**
Modellergebnis. Er kommt aus dem Fragebogen und braucht eine Fundstelle,
sonst gilt er als Annahme und steht als solche im Bericht.

**Token und Kosten** (bei 14 Hüllkanten)

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 1.200 |
| Bild ganze Seite mit Kantenmarken | 4.756 |
| Kantenliste und Kontext aus A2 | rund 800 |
| **Eingabe** | **rund 6.756** |
| Ausgabe (Annahme) | 700 |

`max_tokens: 3000`.

**Wenn er scheitert.** Die Geometrie setzt jede Kante ohne Gegenüber auf
`aussen` und jede mit Gegenüber auf `innen`. Das ist für ein freistehendes Haus
richtig und für ein angebautes falsch — deshalb erzwingt das Kontrollblatt in
diesem Fall eine Bestätigung Kante für Kante und lässt den Bericht erst
danach zu. Anders als bei den übrigen Aufrufen ist der Ausfall hier
**sperrend**, weil eine falsch angesetzte Haustrennwand die Gebäudeheizlast um
eine ganze Wandfläche verfälscht, ohne dass irgendeine Prüfung anschlägt.

---

### A6 — Gegenlesung, blind

**Zweck.** Der zweite, unabhängige Aufruf. Er sieht **nicht**, was A3 und A4
behauptet haben. Er liest dieselben Ausschnitte noch einmal, und der Vergleich
läuft im Code.

Warum blind und nicht prüfend: Ein Modell, dem man die eigene frühere Antwort
zur Bewertung vorlegt, stimmt ihr überwiegend zu. Eine zweite unabhängige Lesung
erzeugt dagegen echte Abweichungen, und Abweichungen sind das, was gebraucht
wird. Der Vergleich ist danach eine Zeichenkettenoperation und keine
Ermessensfrage.

**Eingabe.** Das Belegblatt aus Abschnitt 4: die Ausschnitte um jede Raummarke,
nebeneinander in einem Bild, jeder mit seiner Nummer beschriftet. Kein Text aus
den früheren Aufrufen.

**Systemprompt**

```
Du liest Ausschnitte aus einem Bauplan ab.

Jeder Ausschnitt zeigt die Umgebung einer Raummarke. Die Nummer der Marke steht
in der linken oberen Ecke des Ausschnitts. Die Ausschnitte sind nebeneinander in
ein Bild gesetzt; sie gehören nicht zusammen.

Gib je Ausschnitt wieder, was an Schrift darin steht: den vollständigen Text
wörtlich, und getrennt davon den Raumnamen, die Flächenangabe und die
Höhenangabe, soweit vorhanden.

Du bekommst absichtlich keine Vorgabe, was dort stehen soll. Lies, was du
siehst. Ist ein Ausschnitt leer oder unleserlich, sage das. Rate nicht und
ergänze nichts aus dem, was in einem anderen Ausschnitt steht oder was in einem
Grundriss üblich wäre.

Zahlen gibst du wörtlich wieder, mit dem Komma und den Nachkommastellen, die
dort stehen. Rechne nicht um und runde nicht.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "ausschnitte": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "marke": { "type": "integer" },
          "text_woertlich": { "type": "string", "description": "Alle lesbare Schrift im Ausschnitt, Zeilen durch Leerzeichen getrennt" },
          "name": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "flaeche_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "hoehe_text": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "lesbarkeit": { "type": "string", "enum": ["gut", "teilweise", "nicht"] }
        },
        "required": ["marke", "text_woertlich", "name", "flaeche_text", "hoehe_text", "lesbarkeit"],
        "additionalProperties": false
      }
    }
  },
  "required": ["ausschnitte"],
  "additionalProperties": false
}
```

**Der Vergleich im Code** (deterministisch, kein Modell):

| Fall | Folge im Kontrollblatt |
|---|---|
| Name gleich nach Kleinschreibung und Entfernen von Leerzeichen | Herkunft `plan_gelesen`, Konfidenz bleibt |
| Name abweichend | Konfidenz auf `unsicher`, beide Lesungen werden gezeigt, Feld hervorgehoben |
| Fläche gleich bis auf 0,05 m² | bestätigt |
| Fläche abweichend | Konfidenz auf `unsicher`, beide Werte gezeigt |
| A6 liest nichts, A4 hat gelesen | Konfidenz auf `unsicher`, Vermerk „nur einmal gelesen" |
| A6 liest etwas, A4 nicht | Wert wird übernommen mit Vermerk „nur in der Gegenlesung gefunden", Konfidenz `unsicher` |

Und über allem Regel G10: **Widerspruch schlägt Konfidenz.** Zwei „sichere"
Lesungen, die sich unterscheiden, ergeben einen unsicheren Wert.

**Token und Kosten**

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 1.000 |
| Belegblatt 1932 × 1932 px | 4.761 |
| **Eingabe** | **rund 5.761** |
| Ausgabe (Annahme) | 800 |

`max_tokens: 3000`.

**Wenn er scheitert.** Es gibt keine zweite Lesung. Alle abgelesenen Werte des
Blatts tragen im Kontrollblatt den Vermerk „nicht gegengelesen" und im Bericht
in Kapitel 10 eine entsprechende Zeile. Der Bericht entsteht trotzdem. Der
Vermerk ist wichtiger als der Wert.

**Ausbaustufe Vier-Augen-Auslese.** Das Budget erlaubt mehr: Die vollständige
zweite Lesung aller Kacheln durch A4 mit einem zweiten, anders formulierten
Systemprompt kostet im Regelfall zusätzlich rund 0,24 USD. Sinnvoll für
Berichte, die das Haus verlassen. Als Schalter im Werkzeug vorsehen, nicht als
Standard.

---

### A7 — Schlussprüfung

**Zweck.** Der kritische Blick auf das fertige Kontrollblatt. Kein Bild, keine
Rechnung — die Rechnungen macht der Code. Dieser Aufruf sucht das, was ein
Prüfer sieht und eine Formel nicht.

**Wichtig: Die deterministischen Prüfungen laufen vorher im Code** und ihre
Befunde gehen als Eingabe mit hinein. Was rechenbar ist, wird gerechnet, nicht
befragt:

| Prüfung im Code | Schwelle |
|---|---|
| Summe der Raumflächen gegen die Fläche der Hüllkontur | Abweichung über 15 % ist ein Befund |
| Gerechnete Fläche gegen die im Raumstempel angeschriebene, je Raum | Abweichung über 3 % ist ein Befund |
| Maßstab aus Maßkette gegen Maßstab aus dem Maßstabsvermerk | Abweichung über 1,5 % ist ein Befund |
| Summe der Kettenglieder gegen das Gesamtmaß derselben Kette | Abweichung über 1 % ist ein Befund |
| Raumhöhen außerhalb 2,00 bis 3,50 m | Befund |
| Grundfläche je Geschoss gegeneinander | Abweichung über 20 % ist ein Befund |
| die bestehenden Prüfungen aus `src/kerne/kern_pruefung.js` | wie dort hinterlegt |

**Eingabe.** Kein Bild. Als Text: das Kontrollblatt als JSON (Räume, Flächen,
Höhen, Einheiten, Kanten, Zonen, Herkunft und Konfidenz je Feld), die
Codebefunde aus der Tabelle oben, die Eckdaten aus dem Fragebogen (Baujahr,
Standort, Norm-Außentemperatur, Luftdichtheit) und die Angabe, welche Werte aus
der Typologie stammen.

**Systemprompt**

```
Du prüfst das Ergebnis einer automatischen Planauswertung, bevor daraus eine
Heizlastberechnung nach DIN EN 12831-1 wird. Du bekommst kein Bild, sondern das
Kontrollblatt als Daten und die Befunde, die das Werkzeug bereits selbst
gerechnet hat.

Rechne die Heizlast nicht nach und erfinde keine Zahlen. Deine Aufgabe ist der
prüfende Blick auf die Zusammenstellung.

Achte besonders auf:

- Ein Doppelhaus oder Reihenhaus, bei dem beide Hälften erfasst wurden, obwohl
  nur eine gerechnet werden soll. Erkennbar an doppelt vorkommenden Raumnamen
  und an einer Grundfläche, die für die Nutzung zu groß ist.
- Ein Geschoss, für das keine Räume erfasst wurden, obwohl die Geschossfolge es
  nennt.
- Eine Wohnung ohne Bad, ohne Küche oder ohne Aufenthaltsraum. Das ist meistens
  ein übersehener Raum, kein besonderes Gebäude.
- Räume, die als beheizt geführt werden, obwohl ihre Bezeichnung dagegen
  spricht, und umgekehrt.
- Einen Maßstab, der um den Faktor zehn danebenliegt. Erkennbar an Räumen von
  1,5 Quadratmetern oder von 150.
- Verwechselte Einheiten: eine Wandstärke von 0,24 Metern ist plausibel, eine
  von 24 Metern nicht.
- Kanten gegen Erdreich in einem Obergeschoss, Kanten gegen Außenluft in einem
  vollständig erdberührten Keller.
- Räume ohne jede Außenkante in einem Gebäude, das nur wenige Räume hat.
- Angaben, die im Widerspruch zum Baujahr stehen.

Stufe jeden Befund ein:
  sperrend   Damit darf kein Bericht herausgehen.
  pruefen    Der Bearbeiter muss es ansehen und entscheiden.
  hinweis    Auffällig, aber nicht zwingend falsch.

Wenn du nichts findest, ist eine leere Liste die richtige Antwort. Erfinde
keinen Befund, um etwas zu liefern. Wiederhole auch nicht die Befunde, die das
Werkzeug dir schon mitgeteilt hat; du darfst sie einordnen, aber sie zählen
nicht als deine Funde.
```

**Schema**

```json
{
  "type": "object",
  "properties": {
    "befunde": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "schwere": { "type": "string", "enum": ["sperrend", "pruefen", "hinweis"] },
          "thema": { "type": "string" },
          "aussage": { "type": "string", "description": "Was auffällt, in einem Satz" },
          "begruendung": { "type": "string", "description": "Woraus im Kontrollblatt sich das ergibt" },
          "betrifft": { "type": "array", "items": { "type": "string" }, "description": "Kennungen der betroffenen Räume, Kanten oder Felder" },
          "vorschlag": { "type": "string", "description": "Was der Bearbeiter prüfen oder ändern sollte" }
        },
        "required": ["schwere", "thema", "aussage", "begruendung", "betrifft", "vorschlag"],
        "additionalProperties": false
      }
    },
    "gesamturteil": { "type": "string", "enum": ["tragfaehig", "mit_vorbehalt", "nicht_tragfaehig"] },
    "zusammenfassung": { "type": "string", "description": "Höchstens drei Sätze für das Kontrollblatt" }
  },
  "required": ["befunde", "gesamturteil", "zusammenfassung"],
  "additionalProperties": false
}
```

**Token und Kosten**

| Posten | Token |
|---|---|
| Systemprompt und Schema | rund 900 |
| Kontrollblatt als JSON, 18 Räume, 28 Kanten | rund 3.500 |
| Codebefunde und Eckdaten | rund 500 |
| **Eingabe** | **rund 4.900** |
| Ausgabe (Annahme) | 1.200 |

`max_tokens: 6000`, `effort: high`. Ohne Bild und mit begrenztem Text bleibt der
Aufruf trotz hohen Aufwands unter der halben Minute — **Annahme**, die beim
ersten Echtfall zu messen ist.

**Wenn er scheitert.** Die Codebefunde stehen trotzdem im Kontrollblatt und im
Bericht. Kapitel 9 des Berichts („Plausibilitätsprüfungen") kommt ohnehin aus
`kern_pruefung.js`; A7 ergänzt es, trägt es aber nicht.

---

## 7 Zusammenführen

Nach allen Aufrufen entsteht das Kontrollblatt. Die Zusammenführung ist Code,
nirgends ein Modell.

| Größe | Wo sie herkommt | Herkunftsvermerk |
|---|---|---|
| Raumfläche m² | Polygonfläche in px² geteilt durch (px/m)² | `plan_gerechnet` |
| Kontrollwert Fläche | Raumstempel A4, gegengelesen A6 | `plan_gelesen` |
| Raumname | A3, gegengelesen A6 | `plan_gelesen` |
| Raumart, Innentemperatur | A3 wählt die Art, die Temperatur kommt aus `daten_raumarten.js` | `plan_gelesen` + `norm` |
| Nutzungseinheit | A3 | `plan_gelesen` |
| Raumhöhe | A2S, sonst Typologie | `plan_gelesen` oder `typologie` |
| Kantenlänge | Geometrie mal Maßstab | `plan_gerechnet` |
| Kantenart | A5, in Zweifelsfällen bestätigt | `plan_gelesen` |
| Öffnungsfläche | Öffnungsbreite aus der Geometrie, Höhe aus A4, sonst Typologie | gemischt, je Feld getrennt geführt |
| U-Werte, n50, θe | Fragebogen mit Typologievorbelegung | `typologie` oder `eingabe` |

**Vorrangregeln.**

1. Gerechnet vor gelesen. Eine gemessene Polygonfläche schlägt einen
   abgelesenen Stempel — aber der Stempel bleibt als Kontrollwert stehen und die
   Abweichung wird gezeigt.
2. Gelesen vor Typologie.
3. Eingabe vor allem. Eine Überschreibung durch den Bearbeiter gilt als belegt,
   so wie es der Kunde entschieden hat, und trägt im Bericht die Herkunft
   `eingabe`.
4. Widerspruch senkt die Konfidenz, nie umgekehrt.

---

## 8 Maßstab

Der Maßstab ist die empfindlichste Größe der ganzen Kette: Er geht quadratisch
in jede Fläche ein. Deshalb drei Wege, die zusammenpassen müssen.

**Weg 1 — Maßstabsvermerk.** Aus A2 kommt der Text „M 1:100". Die
Renderauflösung kennt der Rechner exakt. Damit ist

    px_je_meter = dpi / 25,4 × 1000 / Maßstabszahl

Bei 254 dpi und 1:100 sind das genau 100 px je Meter. Diese Zahl ist kein
Messwert, sondern eine Rechnung aus zwei bekannten Größen — sie ist der
belastbarste der drei Wege, solange der Vermerk stimmt und der Plan nicht
verkleinert kopiert wurde.

**Weg 2 — Maßkette.** Aus A4 kommt eine Kette mit Gliedern und Gesamtmaß, dazu
Rasterzelle und Richtung. `kern_massstab.js` sucht in dieser Zelle und in der
angegebenen Richtung die längste durchgehende Linie, deren Enden Maßhilfslinien
oder Begrenzungspfeile tragen, und teilt ihre Pixellänge durch das Gesamtmaß.
Der Modellbeitrag ist ausschließlich der **Text** und die **grobe Lage**; die
Länge misst der Rechner.

Selbstprüfung innerhalb der Kette: Die Summe der Glieder muss dem Gesamtmaß
entsprechen. Weicht sie um mehr als 1 % ab, ist die Kette falsch gelesen und
wird verworfen, ohne dass jemand nachschauen muss.

**Weg 3 — zweite Maßkette in der anderen Richtung.** Zwei Ketten über
verschiedene Linien sind eine echte Gegenprobe und nicht dieselbe Rechnung
zweimal.

**Entscheidung.**

| Lage | Folge |
|---|---|
| Weg 1 und mindestens ein weiterer stimmen bis 1,5 % überein | Maßstab gilt als belegt, keine Rückfrage |
| Nur ein Weg vorhanden | Maßstab gilt als Annahme, Kontrollblatt verlangt Bestätigung |
| Wege weichen um mehr als 1,5 % ab | Kontrollblatt zeigt beide Werte, der Bearbeiter entscheidet oder setzt den Maßstab mit den zwei Klicks von Hand |
| Kein Weg vorhanden | Zwei Klicks von Hand, wie heute |

**Bei Vektor-PDF entfällt das Ganze.** Text und Linien kommen millimetergenau
aus dem Dokument, am Prüfstand mit Abweichung null
(`SPEZIFIKATION_FORMATE.md` 7.1). Dann gibt es keinen Modellbeitrag zum Maßstab
und auch keine Kachelaufrufe für Maßketten.

---

## 9 Geschosszuordnung

Vier Quellen, in dieser Reihenfolge:

1. **Textlayer.** `getTextContent()` findet „Grundriss Dachgeschoss" oder
   „Blatt 2 von 3" ohne jeden Modellaufruf. Bei Vektor-PDF ist das die Antwort.
2. **A1.** Vorschaubild und Blattkopf, für Scans.
3. **A2.** Bestätigung am hochaufgelösten Blatt, mit Beleg.
4. **Geometrie.** Die Grundflächen zweier Geschosse desselben Hauses sind
   ähnlich groß und die Außenkontur stimmt weitgehend überein. Ein Blatt, dessen
   Kontur sich von den übrigen deutlich unterscheidet, ist entweder das
   Dachgeschoss, der Keller oder gar nicht dieses Gebäude. Das ist ein
   Codeabgleich, kein Modellaufruf.

**Konflikte** landen im Kontrollblatt, nicht in einer stillen Entscheidung. Zwei
Blätter mit demselben Geschoss sind ein sperrender Befund, bis der Bearbeiter
eines davon abwählt oder umbenennt.

**Geschosse ohne Blatt** sind der häufigere Fall: Der Keller fehlt oft, obwohl
die Kellerdecke gerechnet werden muss. Das Werkzeug fragt danach ausdrücklich,
sobald A1 eine Geschossfolge liefert, die eine Lücke hat, oder sobald der
Schnitt ein Geschoss zeigt, für das kein Grundriss vorliegt.

---

## 10 Kosten und Zeit

### 10.1 Zwei Fälle

**Fall A, Regelfall.** Ein PDF, zwei Grundrissblätter A3 quer, ein Schnitt,
je Grundriss sechs Kacheln bei 254 dpi (`SPEZIFIKATION_FORMATE.md` 5.5).
Zusammen **21 Aufrufe**.

| Aufruf | Anzahl | Eingabe je | Eingabe gesamt | Ausgabe gesamt |
|---|---:|---:|---:|---:|
| A1 | 1 | 2.556 | 2.556 | 400 |
| A2 | 2 | 6.156 | 12.312 | 1.200 |
| A2S | 1 | 6.156 | 6.156 | 500 |
| A3 | 2 | 6.756 | 13.512 | 1.800 |
| A4 | 12 | 6.561 | 78.732 | 8.400 |
| A5 | 2 | 6.756 | 13.512 | 1.400 |
| A6 | 2 | 5.761 | 11.522 | 1.600 |
| A7 | 1 | 4.900 | 4.900 | 1.200 |
| **Summe** | **21** | | **143.202** | **16.500** |

**Fall B, großes Paket.** Vier Grundrissblätter und ein Schnitt, 24 Kacheln,
**43 Aufrufe**, rund **276.000** Eingabe- und **31.600** Ausgabetoken.

### 10.2 Preise

| Modell | Eingabe je Mio. | Ausgabe je Mio. |
|---|---:|---:|
| `claude-sonnet-5`, Einführungspreis bis 31.08.2026 | 2,00 USD | 10,00 USD |
| `claude-sonnet-5`, danach | 3,00 USD | 15,00 USD |
| `claude-opus-5` | 5,00 USD | 25,00 USD |

**Der Einführungspreis läuft am 31.08.2026 aus**, also elf Tage nach Erstellung
dieses Dokuments. Die Rechnung ist deshalb in beiden Ständen geführt.

### 10.3 Ergebnis

| Belegung | Fall A, bis 31.08. | Fall A, danach | Fall B, bis 31.08. | Fall B, danach |
|---|---:|---:|---:|---:|
| alles `claude-sonnet-5` | 0,45 USD | 0,68 USD | 0,87 USD | 1,30 USD |
| **gemischt (Empfehlung)** | **0,70 USD** | **0,84 USD** | **1,31 USD** | **1,60 USD** |
| alles `claude-opus-5` | 1,13 USD | 1,13 USD | 2,17 USD | 2,17 USD |

Der Rahmen von 2 Euro hält in jeder Belegung außer „alles Opus 5 im großen
Fall". Für die empfohlene Mischung im Regelfall liegt die Grenze so weit weg,
dass der Wechselkurs keine Rolle spielt: 0,70 USD überschreiten 2 Euro erst,
wenn ein Euro weniger als 0,35 USD wert wäre.

**Prompt-Zwischenspeicher.** Die zwölf Kachelaufrufe teilen sich Systemprompt
und Schema, rund 1.400 Token, damit über der Mindestlänge von 1.024 für
`claude-sonnet-5`. Bei richtig gefächertem Start (erst eine Kachel, dann die
übrigen) spart das rund 0,03 USD je Bericht. Das ist ein Rundungsfehler und
kein Argument; das Argument ist die Antwortzeit. **Ohne** die Fächerregel bringt
der Zwischenspeicher gar nichts, weil parallele Anfragen sich gegenseitig nicht
sehen.

### 10.4 Zeit

Alle Werte **Annahme**, außer den örtlichen, die aus `SPEZIFIKATION_FORMATE.md`
Abschnitt 5.5 stammen.

| Schritt | Fall A |
|---|---:|
| PDF laden, Vorschauen, Seitentypen (gemessen) | rund 1 s |
| Kacheln rendern, 2 Blätter à 2,5 s (gemessen) | 5 s |
| Geometrie und Marken (Annahme) | 6 s |
| A1 | 6 s |
| A2 und A2S nebeneinander | 12 s |
| A3 nebeneinander | 15 s |
| A4, 12 Kacheln in 3 Wellen zu vier | 60 s |
| A5 und A6 nebeneinander | 18 s |
| A7 | 20 s |
| **Summe** | **rund 143 s** |

Reserve zu den fünf Minuten: rund 60 %. Fall B liegt bei rund 230 s, weil sich
nur die Kachelwellen vermehren.

**Zeitwächter.** Der Browser bricht einen Aufruf nach 25 Sekunden ab. Erster
Wiederholungsversuch mit einer Stufe niedrigerem Aufwand und halbiertem
`max_tokens`. Zweiter Fehlschlag: Aufruf gilt als ausgefallen, die Rückfallebene
des jeweiligen Abschnitts greift, das Werkzeug macht weiter.

---

## 11 Der Endpunkt

Der heutige Endpunkt kann genau eine Aufgabe. Der neue nimmt einen
Aufgabennamen entgegen.

```jsonc
// Anfrage
{
  "aufgabe": "A4_kachellesung",        // Pflicht, aus fester Liste
  "bilder": ["<base64>", "..."],       // 1 bis 6, je höchstens 6 MB
  "medientyp": "image/jpeg",
  "kontext": { /* Sachangaben, siehe je Aufruf */ }
}
```

**Sicherheitsregeln.**

1. **Systemprompt und Schema kommen niemals vom Aufrufer.** Sie stehen in einer
   Tabelle auf dem Endpunkt, geschlüsselt über `aufgabe`. Ein unbekannter Name
   ist ein 400er. Sonst wäre der Endpunkt für jeden mit dem Zugangscode ein
   offener Modellzugang mit fremder Rechnung.
2. **`kontext` wird nicht als Anweisung behandelt.** Er geht als
   Benutzerinhalt hinein, deutlich abgesetzt, und der Systemprompt sagt, dass
   Angaben aus dem Kontext Daten sind und keine Aufträge.
3. Der Zugangscode bleibt wie heute, mit der Zwei-Sekunden-Bremse je
   Fehlversuch. Ein Zähler je Code und Tag wäre besser, geht aber in einer
   zustandslosen Funktion nicht ohne zusätzlichen Speicher — offener Punkt O5,
   steht schon im heutigen Quelltext.
4. Bilderzahl und Bildgröße werden geprüft, bevor irgendetwas an das Modell
   geht. `MAX_BILD_MB` bleibt, dazu `MAX_BILDER` je Aufgabe.

**Was bleibt.** Der Datenstrom mit Lebenszeichen, die Behandlung von 429 und
401, die Selbstauskunft über GET ohne Geheimnisse, die Rückgabe von
`_verbrauch` mit Modellname und Tokenzahlen. Der Verbrauch wird künftig je
Aufruf zurückgegeben und im Werkzeug aufsummiert, damit der Bearbeiter die
Kosten des Berichts sieht, bevor er ihn erzeugt — und damit die Zahlen in
Abschnitt 10 nach dem ersten Dutzend Echtfälle durch Messwerte ersetzt werden
können.

**Was sich ändert.** Werkzeugzwang wird durch `output_config.format` ersetzt.
Die Antwort ist dann der erste Textblock und muss nicht mehr aus
`input_json_delta` zusammengesetzt werden; im Datenstrom sind es
`content_block_delta` mit `text_delta`.

---

## 12 Fehlerfälle und Rückfallebenen

| Fall | Erkennung | Folge |
|---|---|---|
| Endpunkt nicht erreichbar | Netzfehler | Das gesamte Werkzeug bleibt bedienbar, alle Felder leer, Maßstab und Polygone von Hand — der Zustand von heute ohne KI |
| Zugangscode falsch | 401 | Abfrage wie heute, kein Durchlauf |
| Modell verweigert (`stop_reason: refusal`) | Abbruchgrund | Aufruf gilt als ausgefallen, Rückfallebene des Abschnitts |
| Antwort nicht schemakonform | Auswertefehler | Ein Wiederholungsversuch, danach ausgefallen |
| Zeitüberschreitung | 25-Sekunden-Wächter | Ein Wiederholungsversuch mit niedrigerem Aufwand |
| 429 | Statuscode | Warten nach `retry-after`, höchstens zweimal, Nebenläufigkeit auf zwei senken |
| Geometrie findet keine Flächen | Flächenzahl 0 oder Flächen ohne Plausibilität | A3, A5, A6 entfallen. Stattdessen ein einzelner Aufruf im heutigen Zuschnitt: Räume mit Namen und angeschriebenen Flächen, ohne Marken. Der Bearbeiter umfährt von Hand. Das Werkzeug wird also **nie schlechter als heute** |
| Plan als ungeeignet eingestuft | `kern_planpruefung.js` urteilt `ungeeignet` | Kein Modellaufruf. Das Werkzeug sperrt, wie es das heute schon tut. Kein Geld für ein Bild, aus dem niemand etwas lesen kann |
| Alle Kacheln ohne Fund | `nichts_gefunden` überall | Verdacht auf ein Bild ohne Beschriftung oder auf eine falsche Kachelung. Hinweis an den Bearbeiter, kein stiller Weiterlauf |

Eine Regel steht über allen: **Ein ausgefallener Aufruf erzeugt einen Eintrag im
Kontrollblatt und eine Zeile in Kapitel 10 des Berichts.** Es darf keinen
Bericht geben, dem man nicht ansieht, dass eine Prüfung ausgefallen ist.

---

## 13 Offene Punkte

| Nr. | Punkt | Warum offen |
|---|---|---|
| O1 | Der Geometriekern `kern_geometrie.js` existiert noch nicht | Diese Spezifikation setzt ihn voraus. Ohne ihn greift durchgehend die Rückfallebene aus Abschnitt 12, Zeile „Geometrie findet keine Flächen" |
| O2 | Stören die eingezeichneten Marken die Lesbarkeit? | Nicht gemessen. Zu prüfen an der Zeichnung von 1936 aus `heizlast_maelzerstr59/quellen/`: dieselbe Kachel einmal mit und einmal ohne Marken auslesen und die Ergebnisse vergleichen |
| O3 | Alle Ausgabetokenzahlen sind Annahmen | Nach zwölf Echtfällen durch die zurückgegebenen `_verbrauch`-Werte ersetzen und diese Tabelle nachziehen |
| O4 | Antwortzeiten je Aufwandsstufe | Nicht gemessen. Der 25-Sekunden-Wächter ist eine Vorsichtsmaßnahme, keine erprobte Grenze |
| O5 | Ausgabendeckel je Zugangscode und Tag | In einer zustandslosen Funktion nicht ohne zusätzlichen Speicher zu haben. Steht schon als Kommentar im heutigen Endpunkt |
| O6 | Auftragsverarbeitung | Grundrisspläne gehen an die Schnittstelle. Offener Punkt 1 aus `BAUPLAN.md`, unverändert offen |
| O7 | Gehört `claude-sonnet-5` sicher zur hochauflösenden Stufe? | Übernommen aus `SPEZIFIKATION_FORMATE.md` O3. Die gesamte Kachelrechnung hängt daran und sollte an einem echten Aufruf gegengeprüft werden |
| O8 | Fehler im heutigen Endpunkt | Schemaschlüssel `fläche_m2` gegen Auswertung `r.flaeche_m2` in `src/modul_ki.js` Z. 118. Wirkung: jede abgelesene Fläche geht verloren, der Raum landet mit `A: 0` im Raumbuch. Zu beheben, unabhängig von dieser Spezifikation |

---

## 14 Quellen

| Nr. | Quelle |
|---|---|
| Q1 | `SPEZIFIKATION_FORMATE.md`, Messungen vom 20.08.2026: Kachelvorschrift 5.5, Auflösung 5.2 und 5.3, Lesbarkeit am Auge 5.4, Seiteneinordnung 6.1, Vektorauslese 7.1 |
| Q2 | `BAUPLAN.md` Abschnitt 3: was die KI liefert und was nicht, Maßstab immer von Hand |
| Q3 | `src/kerne/kern_heizlast_norm.js`, Abschnitt Kategorien und `nachbarTemperatur()`: die zulässigen Werte von `grenzt_an.typ` |
| Q4 | `src/daten/daten_raumarten.js`: Bezeichner der Raumarten und ihre Norm-Innentemperaturen nach DIN/TS 12831-1 Tab. 32 |
| Q5 | Bildverarbeitung, Bildfelder 28 × 28, Stufen 1568 und 2576 px, 1568 und 4784 Bildtoken: platform.claude.com/docs/en/build-with-claude/vision |
| Q6 | Modellkennungen und Listenpreise `claude-opus-5` 5/25 USD, `claude-sonnet-5` 3/15 USD mit Einführungspreis 2/10 USD bis 31.08.2026: platform.claude.com/docs/en/about-claude/models/overview |
| Q7 | Strukturierte Ausgabe über `output_config.format`, Schemagrenzen, 24-Stunden-Zwischenspeicher für Schemata: platform.claude.com/docs/en/build-with-claude/structured-outputs |
| Q8 | Prompt-Zwischenspeicher: Mindestlänge 1.024 Token für `claude-sonnet-5` und 512 für `claude-opus-5`, Lesbarkeit erst nach Beginn der ersten Antwort: platform.claude.com/docs/en/build-with-claude/prompt-caching |
| Q9 | `Bericht_Heizlast_Maelzerstr59.pdf`, Abbildung 1 (spiegelgleiche Hälften als Beleg für die entfallende Außenwand), Abbildung 2 (Höhenzerlegung aus dem Schnitt), Kapitel 7 (Raumtabelle, 18 Räume, 206,04 m²) |
| Q10 | `api/netlify/functions/plan-auslesen.mjs` und `src/modul_ki.js`, Stand 20.08.2026 |
