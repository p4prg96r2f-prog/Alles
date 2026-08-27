# Spezifikation Stapel — aus zehn losen Blättern ein Gebäude machen

Entwurf für den neuen Ablauf: Der Bearbeiter lädt bis zu zehn Dateien hoch, Bilder oder PDF,
in beliebiger Reihenfolge und ohne Beschriftung. Darunter sind Grundrisse mehrerer Geschosse,
Schnitte, Ansichten, Lagepläne, Details, Fotos und Unterlagen, die gar nicht zum Gebäude
gehören. Das Werkzeug muss selbst entscheiden, was brauchbar ist, es sortieren und in einen
Zusammenhang bringen.

Diese Spezifikation schließt an drei bestehende Dokumente an und wiederholt sie nicht:

| Dokument | Was dort schon steht |
|---|---|
| `SPEZIFIKATION_FORMATE.md` | pdf.js, Renderskala, Kachelvorschrift, Seitentyp aus `getTextContent()`, Kosten je Kachel |
| `SPEZIFIKATION_BERICHT.md` | Kapitelaufbau, Konfidenzklassen A/B/C, Vergaberegeln, Kontrollblatt-Begriff |
| `SPEZIFIKATION_RECHENKERN.md` | Ergebnisgrößen, Bilanzschluss, Größen je Geschoss |

**Zur Belastbarkeit der Zahlen in diesem Dokument.** Es gibt hier keine Messreihe wie in
`SPEZIFIKATION_FORMATE.md`. Jede Zahl trägt deshalb eine Kennzeichnung:

* **gerechnet** — aus einer belegten Regel hergeleitet, die Herleitung steht dabei
  (Bildfeldregel, Preisangabe, Zahlen aus dem Referenzbericht).
* **Startwert** — ein Schwellenwert, der plausibel gewählt, aber **nicht kalibriert** ist.
  Jeder Startwert muss vor der Freigabe gegen den Referenzstapel geprüft werden, so wie die
  Schwellen in `kern_planpruefung.js` gegen acht Bildvarianten kalibriert wurden.
* **Annahme** — eine fachliche Setzung ohne Beleg.

Referenzstapel für die Kalibrierung ist `heizlast_maelzerstr59/quellen/`: vier Blätter von
1936 (Keller, Schnitt, Erdgeschoss, Dachgeschoss) und ein aktueller Aufmaßplan, der drei
Geschosse auf einem Blatt zeigt. Dieser Stapel enthält von sich aus vier der sechs Aufgaben
dieser Spezifikation, siehe Abschnitt 1.3.

---

## 1 Ergebnis in fünf Zeilen

1. **Ein Blatt ist nicht ein Geschoss.** Zwischen Blatt und Geschoss liegt eine n:m-Beziehung,
   sonst lässt sich weder ein Aufmaßplan mit drei Geschossen auf einem Bogen noch ein
   Geschoss auf zwei Bögen abbilden. Die Datenstruktur baut auf dieser Trennung auf.
2. **Zuordnung ist Beweisführung, nicht Rateraten.** Jedes Blatt sammelt Belege in zwei
   getrennten Registern: *Benennung* (welches Geschoss) und *Ordnung* (welche Lage im Stapel).
   Was das Blatt über sich selbst sagt, schlägt was die Zeichnung zeigt; was die Zeichnung
   zeigt, schlägt die Reihenfolge im PDF und den Dateinamen.
3. **Dublette und Widerspruch sehen fast gleich aus und dürfen nie verwechselt werden.**
   Gleiche Geometrie plus gleiche Raumnamen ist eine Dublette und wird automatisch aufgelöst.
   Gleiche Geometrie plus andere Raumnamen ist ein Widerspruch und wird **niemals** automatisch
   aufgelöst.
4. **Vollständigkeit ist die gefährlichste der sechs Aufgaben.** Ein fehlendes Geschoss führt
   zu einer zu kleinen Heizlast, ohne dass irgendetwas rot wird. Deshalb zählt das Werkzeug die
   Geschosse auf bis zu acht voneinander unabhängigen Wegen und sperrt bei Unterdeckung, statt
   zu warnen.
5. **Es gibt genau eine Unterbrechung.** Nach der billigen Sichtung aller Seiten legt das
   Werkzeug ein Kontrollblatt vor. Danach läuft die teure Vollauswertung ohne weitere Rückfrage
   durch. Das ist die Linie aus `SPEZIFIKATION_FORMATE.md` 6.2.

### 1.1 Was automatisch entschieden wird und was nicht — Kurzfassung

| Sachverhalt | Automatisch | Vorgelegt |
|---|---|---|
| Seitentyp (Grundriss, Schnitt, Ansicht, Lageplan, Foto, Textseite, fremd) | ja, wenn Konfidenz hoch | bei „unklar" |
| Blatt gehört gar nicht zum Gebäude | Vorschlag „ausschließen", Bearbeiter bestätigt mit einem Klick | ja, als Sammelzeile |
| Geschossbezeichnung aus dem Blattkopf | ja | nein |
| Geschossbezeichnung nur aus Indizien | nein | ja, mit gereihten Kandidaten und Belegen |
| Byte-gleiche Dublette | ja, stillschweigend | nein |
| Dublette nach Geometrie **und** Text | ja, mit Vermerk | nein |
| Bessere Fassung zweier Dubletten | ja, nach Güte | nur bei Gleichstand unter 10 Prozent |
| Zwei Fassungen desselben Geschosses mit anderer Aufteilung | **nie** | ja, als Gegenüberstellung, sperrend |
| Abweichende Maßangabe zwischen zwei Blättern | nein | ja, mit beiden Zahlen |
| Geschosse nicht deckungsgleich, IoU ≥ 0,90 | ja, mit Vermerk in der Annahmenliste | nein |
| Geschosse nicht deckungsgleich, IoU 0,60 bis 0,90 | nein | ja, mit Deutungsvorschlag und Flächendifferenz |
| Bauteil aus der Geschossüberlagerung (Terrasse, Auskragung, Teilunterkellerung) | **nie** eingefügt | ja, als Vorschlag mit gerechneter Fläche |
| Geschosshöhen aus dem Schnitt, Summenprobe bestanden | ja | nein |
| Geschosshöhen ohne Summenprobe oder außerhalb des Bandes | nein | ja |
| Kein Schnitt im Stapel | nein | ja, mit den Ersatzwegen der Reihe nach |
| Weniger Grundrisse als Geschosse | **nie** stillschweigend | ja, sperrend |
| Ein Geschoss durch ein anderes vertreten | **nie** | ja, mit ausgeschriebener Folge für die Randbedingungen |

### 1.2 Die sechs Aufgaben und wo sie stehen

| Aufgabe | Abschnitt |
|---|---|
| Geschosszuordnung, Rangfolge der Anhaltspunkte | 4 |
| Dubletten erkennen, Fassung wählen | 5 |
| Widersprüche vorlegen statt auflösen | 6 |
| Passen die Geschosse übereinander | 7 |
| Geschosshöhen aus dem Schnitt, und was ohne Schnitt | 8 |
| Vollständigkeit, fehlendes Geschoss | 9 |

### 1.3 Warum der Referenzstapel als Prüfstand taugt

Die fünf Blätter zur Mälzerstraße 59 enthalten die Aufgaben bereits im Original:

| Fall im Referenzstapel | Aufgabe |
|---|---|
| Vier Blätter von 1936 ohne durchgehende Beschriftung, dazu ein Aufmaßplan ohne Blattkopf | 1, 4 |
| Der Aufmaßplan zeigt **drei Geschosse auf einem Blatt** und nennt sie „Floor 1" bis „Floor 3" | 1 |
| Das Blatt Erdgeschoss gilt laut Bericht auch für Ober- und Dachgeschoss („dieselbe Aufteilung") | 1, 6 |
| Dachgeschoss 1936 mit Bodenräumen an beiden Giebeln, Aufmaßplan mit voller Wohnnutzung | 3 |
| Kellergrundriss zeigt zwei spiegelgleiche Hälften — daraus folgt die entfallende Außenwand | 4 |
| Der Schnitt trägt 6,00 m über zwei Geschosse und 5,60 m Drempel bis First in einer Kette | 5 |

Der Bericht löst diese Fälle bereits, aber von Hand und durch einen Fachmann. Diese
Spezifikation beschreibt, wie das Werkzeug an dieselben Stellen kommt und wo es stehen bleibt
und fragt.

---

## 2 Der Stapel als Datenstruktur

### 2.1 Drei Ebenen

```
Datei            was hochgeladen wurde. Ein PDF mit vier Seiten ist EINE Datei.
  └─ Blatt       eine Seite. Trägt alle Kennwerte, die Sichtung und die Belege.
       ↕         n:m über die Tabelle "abbildungen"
     Geschoss    eine Ebene des Gebäudes. Trägt Höhe, Kontur, Räume.
```

Alles, was zwischen den Ebenen entschieden wird, steht **nicht** als Feld in einem der Objekte,
sondern als Eintrag in `abbildungen` oder in `konflikte`. Damit ist jede Zuordnung einzeln
begründbar, rücknehmbar und im Bericht zitierbar.

### 2.2 Warum n:m zwischen Blatt und Geschoss

Ein Feld `blatt.geschoss` wäre einfacher und wäre falsch. Vier Fälle brechen es:

1. **Ein Blatt, mehrere Geschosse.** Der Aufmaßplan des Referenzprojekts zeigt Floor 1 bis
   Floor 3 nebeneinander auf einem Bogen. Das ist bei Aufmaßsoftware der Normalfall.
2. **Ein Geschoss, mehrere Blätter.** Große Gebäude werden geteilt, „Bauteil A" und
   „Bauteil B", oder der Bearbeiter fotografiert einen A0-Plan in zwei Hälften.
3. **Ein Blatt, mehrere Rollen.** Ein Blatt kann massgeblich für die Geometrie des EG sein und
   gleichzeitig nachrichtlich für den Schnittverlauf.
4. **Zwei Blätter, ein Geschoss, im Widerspruch.** Bestand und Planung. Beide bleiben am
   Geschoss hängen, eines als `massgeblich`, eines als `nachrichtlich`.

### 2.3 Die Objekte

```js
/* Der gesamte Stapel. Wird mit dem Projekt gespeichert. */
stapel = {
  version: 1,
  grenzen: { euro: 2.00, sekunden: 300, kurs_usd_je_euro: null },  // Kurs: siehe 3.4
  verbrauch: { euro: 0, sekunden: 0, aufrufe: 0 },
  dateien: [],        // Datei
  blaetter: [],       // Blatt
  geschosse: [],      // Geschoss
  abbildungen: [],    // Verknüpfung Blatt <-> Geschoss
  hoehen: null,       // Höhenkette aus dem Schnitt, siehe 8
  gebaeude: {         // was über das Gebäude als Ganzes bekannt ist
    geschosszahl_soll: null, geschosszahl_ist: 0,
    belege_geschosszahl: [], bauweise: null, dachform: null,
  },
  konflikte: [],      // alles, was nicht automatisch entschieden werden darf
  kontrollblatt: [],  // daraus erzeugte Fragen, in Reihenfolge
  protokoll: [],      // jede Entscheidung mit Zeit, Urheber und Grund
};
```

```js
/* Eine hochgeladene Datei. */
datei = {
  id: "d_1", name: "Scan 2024-05-03.pdf", groesse: 4312904,
  typ: "application/pdf", sha256: "…",
  seiten: 4, blaetter: ["b_1", "b_2", "b_3", "b_4"],
  hinweise: [],       // z. B. "passwortgeschützt", "kein dekodierbares Bild"
};
```

```js
/* Ein Blatt. Der Träger aller Kennwerte. */
blatt = {
  id: "b_3", dateiId: "d_1", seite: 3, reihenfolge: 7,   // Position im Gesamtstapel

  herkunft: "pdf_vektor" | "pdf_scan" | "bild" | "foto",
  blattmass_mm: { b: 420, h: 297 }, drehung: 0,

  /* --- Stufe 0, rein lokal, kostet nichts ------------------------------- */
  eignung: null,        // Ergebnis von KERN_PLANPRUEFUNG.pruefeBild
  kennwerte: {
    kurzeKante: 1653, schaerfe: 61.2, kontrast: 148, tinte: 0.041,
    schraeglage: 0.4,
    farbe: { rot: 0.000, gelb: 0.000, blau: 0.002 },   // Bestand/Abbruch/Neubau, siehe 6.2
    tintenrahmen: { x: 118, y: 96, b: 2104, h: 1461 }, // Bounding-Box der Zeichnung
  },
  signatur: {           // für Dubletten und die grobe Überlagerung, siehe 5.2 und 7.1
    kontur72: [/* 72 Zahlen */], zeilen128: [/* 128 */], spalten128: [/* 128 */],
  },
  textlayer: {          // nur bei Vektor-PDF, verlässt den Rechner NIE
    vorhanden: true, stuecke: 47,
    kopf: "Grundriss Obergeschoss  M 1:100  Blatt 3 von 5",
    treffer: { geschoss: ["Obergeschoss"], massstab: "1:100",
               blattnr: { nr: 3, von: 5 }, hoehenkote: "+2,875" },
  },

  /* --- Stufe 1, Sichtung durch das Modell, klein und billig -------------- */
  sichtung: null,       // Schema in 3.2

  /* --- daraus abgeleitet ------------------------------------------------ */
  belege: [],           // Beleg, siehe 2.4
  rolle: "massgeblich" | "zweitfassung" | "nachrichtlich" | "ausgeschlossen" | "offen",
  guete: 0,             // 0 bis 100, siehe 5.4
  ausschlussgrund: null,

  /* --- Stufe 2, Vollauswertung, nur für massgebliche Blätter ----------- */
  vollauswertung: {
    gelaufen: false, kacheln: 0, kosten_usd: 0, dauer_s: 0, ergebnis: null,
  },
};
```

```js
/* Ein Geschoss. */
geschoss = {
  id: "g_2",
  ordnung: 1,           // ganze Zahl. 0 = Erdgeschoss, negativ nach unten.
  name: "OG",           // normalisiert, siehe 4.3
  name_im_plan: "Obergeschoss",
  benennung_belegt: true,   // true nur bei Beleg der Stufe 1 (siehe 4.2)
  beheizt: true,

  hoehe: { geschosshoehe_m: 3.00, lichte_hoehe_m: 2.75,
           quelle: "Schnitt 1936, Maßkette 6,00 m über zwei Geschosse",
           konfidenz: "A" },              // Klassen nach SPEZIFIKATION_BERICHT 10.1

  kontur: { punkte: null, flaeche_m2: null,
            quelle: "sichtung" | "kern_grundriss" | "polygon_bearbeiter" },

  ueberlagerung: [ { gegen: "g_1", iou: 0.98, flaechendiff_m2: 1.2,
                     deutung: "deckungsgleich", folge: null } ],

  status: "bestaetigt" | "vorschlag" | "widerspruch" | "fehlt" | "vertreten",
  vertreten_durch: null,    // geschossId, nur nach ausdrücklicher Entscheidung
  raeume: [],
};
```

```js
/* Verknüpfung Blatt <-> Geschoss. Hier steht die eigentliche Zuordnung. */
abbildung = {
  blattId: "b_3", geschossId: "g_2",
  rolle: "massgeblich" | "nachrichtlich" | "zweitfassung",
  ausschnitt: null,     // {x,y,b,h} in Bildpunkten, wenn mehrere Geschosse auf einem Blatt
  punkte: 62,           // Summe der Belege, siehe 4.4
  bestaetigt_von: "werkzeug" | "bearbeiter",
};
```

```js
/* Ein Konflikt. Alles, was nicht automatisch entschieden werden darf. */
konflikt = {
  id: "k_4",
  art: "dublette" | "widerspruch_aufteilung" | "widerspruch_mass"
     | "geschoss_unklar" | "kontur_abweichung" | "geschoss_fehlt"
     | "hoehe_unklar" | "blatt_unklar",
  schwere: "sperre" | "vorlage" | "vermerk",
  betrifft: ["b_3", "b_7"],
  darstellung: { titel: "…", text: "…", gegenueberstellung: {…} },
  optionen: [ { id: "a", text: "…", folge: "…" } ],
  entscheidung: null,   // { gewaehlt: "a", grund: "…", zeit: "…", wer: "bearbeiter" }
  bericht_satz: null,   // was daraus in Kapitel 3 oder 10 gedruckt wird
};
```

### 2.4 Belege statt Felder

Jeder Anhaltspunkt für eine Geschosszuordnung wird als eigener Eintrag geführt, nicht als
überschriebenes Feld. Sonst lässt sich später nicht mehr sagen, warum ein Blatt im
Obergeschoss gelandet ist.

```js
beleg = {
  code: "E1",                    // Tabelle in 4.2
  register: "benennung" | "ordnung",
  aussage: "Grundriss Obergeschoss",
  kandidat: { name: "OG", ordnung: 1 },
  quelle: "Textlayer, Blattkopf",   // oder "Sichtung", "Dateiname", "Reihenfolge"
  gewicht: 60,
  belegend: true,                // true = Stufe 1 (siehe 4.2), sonst Indiz
};
```

Das Kontrollblatt zeigt bei jeder Frage die drei stärksten Belege im Klartext. Der Bearbeiter
liest also nicht „Konfidenz 0,72", sondern „Blattkopf sagt Obergeschoss; Treppe hat Auf- und
Abgang, also ein Zwischengeschoss; Dateiname sagt OG".

---

## 3 Ablauf, Budget, Nebenläufigkeit

### 3.1 Vier Stufen

| Stufe | Was | Wo | Kosten | Zeit |
|---|---|---|---|---|
| 0 | Dateien lesen, PDF-Seiten bei Skala 0,25 rendern, Kennwerte, Signaturen, Textlayer | lokal | 0 | Annahme 1 s je Seite |
| 1 | **Sichtung**: ein kleiner Modellaufruf je Blatt | Endpunkt | siehe 3.4 | siehe 3.4 |
| 1b | Gruppieren, Dubletten, Zuordnung, Überlagerung grob, Vollständigkeit, Kontrollblatt bauen | lokal | 0 | unter 1 s |
| — | **Halt.** Der Bearbeiter arbeitet das Kontrollblatt ab. | — | — | nicht gezählt |
| 2 | **Vollauswertung** der bestätigten Blätter, gekachelt nach `SPEZIFIKATION_FORMATE.md` 5.5 | Endpunkt | rund 0,06 USD je A3-Blatt | rund 20 s je Blatt |

Stufe 0 und 1 laufen immer über **alle** Blätter, auch über die offensichtlich unbrauchbaren.
Ein Foto vom Heizungskeller kostet in der Sichtung einen halben Cent und liefert dafür die
Begründung, warum es ausgeschlossen wird — das ist billiger als eine Rückfrage.

### 3.2 Was die Sichtung liefert

Ein eigener Endpunkt `plan-sichten` neben `plan-auslesen`, mit demselben Zugangscode, demselben
Streaming-Aufbau und demselben Schutz gegen Durchprobieren. Getrennt, weil Systemtext, Schema
und Bildgröße völlig andere sind und weil beide Endpunkte unterschiedlich oft laufen.

```js
SCHEMA_SICHTUNG = {
  type: "object",
  properties: {
    typ: { type: "string", enum: ["grundriss", "schnitt", "ansicht", "lageplan",
                                  "detail", "foto", "textseite", "fremd", "unklar"] },
    typ_konfidenz: { type: "string", enum: ["sicher", "unsicher"] },

    geschoss_label: { anyOf: [{ type: "string" }, { type: "null" }],
      description: "Wörtlich wie im Blatt, z. B. 'Grundriss 1. Obergeschoss', "
                 + "'Floor 2', 'KG'. NICHT vereinheitlichen, NICHT erfinden." },
    hoehenkote: { anyOf: [{ type: "string" }, { type: "null" }],
      description: "z. B. '+-0,00', '+2,875', '-2,63', sonst null" },

    raumnamen: { type: "array", items: { type: "string" },
      description: "Alle lesbaren Raumbezeichnungen, wörtlich, ohne Flächen." },
    raumzahl: { type: "integer" },

    treppe: { type: "string", enum: ["nur_auf", "nur_ab", "auf_und_ab", "keine", "unklar"],
      description: "Pfeilrichtung im Treppenlauf. nur_auf = unterstes Geschoss, "
                 + "nur_ab = oberstes, auf_und_ab = Zwischengeschoss." },
    schornstein: { type: "boolean" },
    dachschraege: { type: "boolean",
      description: "Schrägenlinie, Kniestock, Stehhöhenlinie, Gauben" },
    kellermerkmale: { type: "boolean",
      description: "Heizung, Waschküche, Oellager, Lichtschacht, Erdreichschraffur" },
    hauseingang: { type: "boolean" },
    aussenanschluss: { type: "boolean",
      description: "Terrasse, Rampe, Gehweg, Vorgarten am Grundriss angezeichnet" },

    mehrere_geschosse: { type: "boolean",
      description: "Zeigt das Blatt mehr als einen Grundriss nebeneinander?" },
    teilgrundriss: { type: "boolean",
      description: "Ist nur ein Ausschnitt des Gebäudes dargestellt?" },

    planart: { type: "string", enum: ["bestand", "planung", "abbruch_und_neubau",
                                      "aufmass", "unklar"] },
    plankopf: { anyOf: [{ type: "string" }, { type: "null" }],
      description: "Titel, Maßstab, Datum, Blattnummer. KEINE Personennamen." },

    gehoert_zum_gebaeude: { type: "string", enum: ["ja", "vermutlich", "nein", "unklar"] },
    brauchbar: { type: "boolean" },
    begruendung: { type: "string", description: "Ein Satz, warum brauchbar oder nicht." },
  },
  required: ["typ", "typ_konfidenz", "geschoss_label", "hoehenkote", "raumnamen", "raumzahl",
             "treppe", "schornstein", "dachschraege", "kellermerkmale", "hauseingang",
             "aussenanschluss", "mehrere_geschosse", "teilgrundriss", "planart", "plankopf",
             "gehoert_zum_gebaeude", "brauchbar", "begruendung"],
  additionalProperties: false,
};
```

Die Ausgabe ist bewusst klein: rund 250 bis 350 Ausgabetoken. Keine Maße, keine Flächen, keine
Fließtexte.

### 3.3 Was die Sichtung ausdrücklich nicht tut

Dieselbe Linie wie im bestehenden Systemtext von `plan-auslesen.mjs`, hier noch enger:

* **Keine Maße.** Kein Maßstab, keine Kantenlänge, keine Fläche. Auf einem Bild mit rund
  2 Bildpunkten je Millimeter wäre jede Maßzahl geraten.
* **Keine Vereinheitlichung.** „Floor 2" bleibt „Floor 2". Die Übersetzung nach OG macht die
  Normalisierungstabelle in 4.3 lokal und nachvollziehbar, nicht das Modell.
* **Keine Zuordnung über Blätter hinweg.** Die Sichtung sieht immer nur ein Blatt. Sie darf
  nicht sagen „das ist das Geschoss über dem vorherigen Blatt". Der Zusammenhang entsteht in
  Stufe 1b lokal und ist dort prüfbar.
* **Kein Ausschluss ohne Begründung.** `brauchbar: false` ohne Satz in `begruendung` wird
  vom Endpunkt als Fehler behandelt.

### 3.4 Kosten und Zeit, gerechnet

Bildgröße der Sichtung: fester Maßstab **2,2 Bildpunkte je Millimeter Blattbreite**
(entspricht rund 56 dpi), gedeckelt auf 1400 Bildpunkte längere Kante. Begründung: der
Blattkopf trägt Schrift von rund 5 bis 10 mm Versalhöhe, das ergibt 11 bis 22 Bildpunkte
Höhe und ist sicher lesbar; Maßtext von 2,5 mm ergibt 5,5 Bildpunkte und ist bewusst nicht
lesbar, weil er in dieser Stufe nichts zu suchen hat. Die Lesbarkeitsstufen sind an den
Messungen in `SPEZIFIKATION_FORMATE.md` 5.4 abgelesen (dort: 4,39 px/mm reicht für große
Maßketten, 2,73 px/mm für mittlere).

Bildtoken nach der Bildfeldregel (Felder von 28×28 Bildpunkten, Quelle Q5 in
`SPEZIFIKATION_FORMATE.md`), **gerechnet**:

| Blatt | Bildgröße Sichtung | Felder | Bildtoken |
|---|---|---|---|
| A4 hoch 210×297 | 462 × 653 | 17 × 24 | 408 |
| A3 quer 420×297 | 924 × 653 | 33 × 24 | 792 |
| A1 quer 841×594 (gedeckelt) | 1400 × 989 | 50 × 36 | 1.800 |
| Zusatzausschnitt Schriftfeld (nur Scans über A3) | 925 × 653 | 33 × 24 | 792 |

Der Zusatzausschnitt ist das rechte untere Viertel in doppelter Auflösung. Er wird nur
gebraucht, wenn kein Textlayer vorliegt; das Schriftfeld sitzt nach der üblichen Anordnung
unten rechts (**Annahme** für die Automatik; bei Nichttreffer greift Stufe 2 der Belege).

Kosten je Blatt, **gerechnet** mit `claude-sonnet-5` zu 2 USD je Mio. Eingabetoken und 10 USD
je Mio. Ausgabetoken (Q6; Einführungspreis bis 31.08.2026, danach 3 / 15 — die Rechnung
darunter verdoppelt sich dadurch nicht einmal):

| Posten | A3-Blatt | A1-Scan mit Zusatzausschnitt |
|---|---|---|
| Bild | 792 | 2.592 |
| Systemtext und Schema | rund 900 | rund 900 |
| Eingabe gesamt | 1.692 → 0,0034 USD | 3.492 → 0,0070 USD |
| Ausgabe 300 Token | 0,0030 USD | 0,0030 USD |
| **je Blatt** | **rund 0,0064 USD** | **rund 0,0100 USD** |

**Zehn Blätter Sichtung: rund 0,07 bis 0,10 USD.** Das sind unter fünf Prozent des Budgets.
Die Vollauswertung von sechs bestätigten A3-Blättern kostet nach
`SPEZIFIKATION_FORMATE.md` 5.5 rund 0,36 USD. Zusammen bleibt der Bericht bei rund einem
Viertel des Rahmens.

**Zum Wechselkurs.** Die Schnittstelle rechnet in USD, das Budget ist in Euro vorgegeben.
Das Werkzeug hält einen einstellbaren Kurs in `grenzen.kurs_usd_je_euro` und zeigt beide
Beträge an. Es wird **kein** Kurs fest eingetragen; ohne gesetzten Kurs zeigt das Werkzeug
nur USD und die Grenze wird auf 2,00 USD gesetzt, also konservativ.

Zeit, **Annahme** und vor der Freigabe zu messen: die Vollauswertung eines Blattes ist mit
20 bis 25 s gemessen (README). Die Sichtung hat rund ein Sechstel der Eingabe und ein Zehntel
der Ausgabe; angesetzt werden **4 s je Blatt**. Bei vier gleichzeitigen Aufrufen sind zehn
Blätter in rund 12 s gesichtet. Zusammen mit Stufe 0 (rund 10 s) und Stufe 2 (sechs Blätter zu
je sechs Kacheln, nebenläufig, rund 60 s) liegt der Maschinenanteil bei rund 1,5 Minuten von
fünf. Die Zeit am Kontrollblatt zählt nicht mit; das Werkzeug hält die Uhr an, während es
wartet.

### 3.5 Nebenläufigkeit und Notausgang

* Der Browser orchestriert. **Vier gleichzeitige Aufrufe** in Stufe 1, **drei** in Stufe 2
  (dort sind die Bilder zwanzigmal größer). Startwert; bei 429-Antworten halbiert sich die
  Zahl automatisch und der Bearbeiter sieht eine Zeile dazu.
* Jeder Aufruf trägt genau ein Bild und bleibt damit sicher unter der halben Minute der
  serverlosen Funktion.
* **Notausgang.** Vor Stufe 2 rechnet das Werkzeug die Kosten aus der bestätigten Blattzahl
  und der Kachelzahl hoch und zeigt sie an. Über 60 Prozent des Budgets kommt eine Rückfrage.
  Reißt das Budget während Stufe 2, hält das Werkzeug an und schreibt ins Kontrollblatt,
  **welche Blätter noch fehlen** — es rechnet nicht mit dem, was schon da ist, weiter, weil
  genau das die zu kleine Heizlast aus Aufgabe 6 erzeugt.
* Fällt ein einzelner Aufruf aus, wird er einmal wiederholt. Beim zweiten Fehlschlag wird das
  Blatt als `sichtung: null` geführt und landet im Kontrollblatt mit der Frage nach der
  Zuordnung von Hand. Es wird **nie** stillschweigend übergangen.

### 3.6 Ein echter Zielkonflikt: Schriftfeld schwärzen gegen Geschossbezeichnung lesen

`modul_ki.js` schwärzt heute vor dem Senden den oberen Bildstreifen (12 Prozent), um
Bauherrennamen zurückzuhalten. Genau dort und im Schriftfeld unten rechts steht aber die
Geschossbezeichnung — der stärkste Beleg der ganzen Zuordnung.

Das lässt sich nicht wegkonstruieren, es ist eine Abwägung. Vorschlag:

1. **Vektor-PDF:** kein Zielkonflikt. Der Blattkopf wird aus `getTextContent()` gelesen; der
   Text verlässt den Rechner nie. Das deckt nach `SPEZIFIKATION_FORMATE.md` 8.1 einen großen
   Teil der Fälle ab.
2. **Scan oder Bild:** Voreinstellung bleibt **geschwärzt**. Das Werkzeug sagt im
   Kontrollblatt offen: „Bei diesen Blättern ist der Blattkopf geschwärzt worden; die
   Geschossbezeichnung konnte deshalb nur aus der Zeichnung erschlossen werden." Der
   Bearbeiter kann die Schwärzung je Blatt aufheben — mit einem Satz Begründung, der ins
   Protokoll geht.
3. **Besser als beides:** ein Rechteckwerkzeug, mit dem der Bearbeiter vor dem Senden selbst
   schwärzt. Dann bleibt der Titel stehen und der Name verschwindet. Aufwand gering, gehört
   in dieselbe Ausbaustufe.

Der offene Punkt „Auftragsverarbeitungsvertrag" aus `BAUPLAN.md` 5.1 bleibt davon unberührt
und wird durch diese Regelung nicht ersetzt.

---

## 4 Geschosszuordnung

### 4.1 Zwei Register, nicht eines

Die Anhaltspunkte beantworten zwei verschiedene Fragen, und sie zu vermischen ist der Fehler,
der zu falschen Zuordnungen führt:

* **Benennung** — *welches* Geschoss ist das? „Obergeschoss", „Keller".
* **Ordnung** — *wo im Stapel* liegt es? Unterstes, mittleres, oberstes.

Ein Treppenlauf mit nur einem Aufwärtspfeil sagt sicher „unterstes dargestelltes Geschoss".
Er sagt **nichts** darüber, ob das der Keller oder das Erdgeschoss ist. Eine Höhenkote
„±0,00" sagt beides zugleich. Deshalb führt jedes Blatt zwei Punktesummen.

### 4.2 Die Anhaltspunkte, nach Rang

**Stufe 1 — was das Blatt über sich selbst sagt. Belegend.**

| Code | Anhaltspunkt | Register | Gewicht | Bemerkung |
|---|---|---|---|---|
| E1 | Geschossbezeichnung im **Textlayer** des PDF | Benennung | 60 | maschinengenau, kein Lesefehler möglich, kostenlos |
| E2 | Dieselbe Bezeichnung aus dem **Bild** gelesen (Scan) | Benennung | 45 | gleiche Autorität, aber Lesefehler möglich |
| E3 | **Höhenkote** im Blatt (±0,00, +2,875, −2,63) | beide | 50 / 50 | ±0,00 ist per Konvention OKFF Erdgeschoss; ordnet und benennt |

**Stufe 2 — was die Zeichnung zeigt. Indizien, teils sehr stark.**

| Code | Anhaltspunkt | Register | Gewicht | Bemerkung |
|---|---|---|---|---|
| E4 | **Treppenlauf**: nur auf / nur ab / auf und ab | Ordnung | 40 | stärkstes rein zeichnerisches Indiz. Fehlt die Treppe im Mehrgeschosser ganz, ist es vermutlich kein voller Grundriss |
| E5 | **Senkrechte Festpunkte**: Schornstein, Treppenauge, Steigschächte, Bad-/WC-Strang | — | — | ordnet nicht, dient der Überlagerung (7) und der Dublettenprüfung (5) |
| E6 | **Dachschräge, Kniestock, Stehhöhenlinie, Gauben** | beide | 25 / 30 | oberstes Wohngeschoss. Im Referenzfall über „63 m² mit mindestens 1,5 m Stehhöhe" belegt |
| E7 | **Kellermerkmale**: Heizung, Waschküche, Öllager, Hausanschlussraum, Lichtschacht, Erdreichschraffur | beide | 25 / 30 | unterstes Geschoss |
| E8 | **Hauseingang** mit Windfang, Podest, Vordach | Benennung | 12 | Erdgeschoss — aber bei Hanglage auch im „Untergeschoss" |
| E9 | **Außenanschluss**: Terrasse, Rampe, Gehweg, Vorgarten angezeichnet | Benennung | 10 | Geschoss auf Geländeniveau. Gleiche Einschränkung wie E8 |

**Stufe 3 — Kontext außerhalb der Zeichnung. Nur Gleichstandsbrecher.**

| Code | Anhaltspunkt | Register | Gewicht | Bemerkung |
|---|---|---|---|---|
| E10 | **Reihenfolge im PDF** | Ordnung | 10 | verbreitete Sortierung von unten nach oben, aber ebenso oft nach Zeichnungsnummer sortiert |
| E11 | **Dateiname** („eg.pdf", „2_OG_Bestand.png") | Benennung | 8 | vom Anwender gesetzt, oft aus einer Vorlage kopiert und dann falsch |
| E12 | **Blattnummer** „Blatt 2 von 5" | Ordnung | 10 | ordnet nur innerhalb desselben Satzes |

**Die Rangfolge in einem Satz:** Was das Blatt über sich selbst sagt, schlägt was die
Zeichnung zeigt; was die Zeichnung zeigt, schlägt die Reihenfolge im Stapel und den Dateinamen.
E11 und E10 dürfen einen Beleg der Stufe 1 **nie** überstimmen, nur bestätigen oder einen
Gleichstand brechen.

Die Gewichte sind **Startwerte**. Kalibriert wird gegen den Referenzstapel und gegen mindestens
fünf weitere echte Planpakete aus den Projektordnern; Zielgröße ist die Zahl der Blätter, die
ohne Rückfrage richtig zugeordnet werden, bei null falschen stillen Zuordnungen. Eine falsche
stille Zuordnung wiegt schwerer als zehn Rückfragen.

### 4.3 Normalisierung und die Falle mit der Zählung

Die Übersetzung von der Plansprache in `{name, ordnung}` läuft lokal über eine Tabelle,
nicht im Modell:

| Im Plan | name | ordnung |
|---|---|---|
| Kellergeschoss, KG, UG, Untergeschoss, Souterrain, Tiefparterre | KG | −1 |
| 2. Untergeschoss, UG2, KG2 | KG2 | −2 |
| Erdgeschoss, EG, E0, Parterre, Ground Floor | EG | 0 |
| Hochparterre | EG | 0 (Vermerk: Höhenversatz prüfen) |
| Obergeschoss, OG, 1. OG, OG1, 1. Obergeschoss | OG | 1 |
| 2. Obergeschoss, OG2, 2. OG | OG2 | 2 |
| Dachgeschoss, DG, Attika, Staffelgeschoss | DG | oberstes |
| Spitzboden, Dachboden, Spitzspeicher | SB | über DG |
| Zwischengeschoss, Galerie, Empore, Mezzanin | ZG | mit Vermerk |

**Die Falle.** „1. Geschoss", „Geschoss 1", „Floor 1", „Ebene 1", „Etage 1" sind
**mehrdeutig**. In der einen Zählung ist das Erdgeschoss das 1. Geschoss, in der anderen ist
das 1. Geschoss das erste über dem Erdgeschoss. Der Referenzbericht musste das von Hand
auflösen: „Floor 1 ist das Erdgeschoss, Floor 3 das Dachgeschoss."

Regel: Eine reine Zählbezeichnung ohne „Erd-", „Ober-" oder „Unter-" ist **kein Beleg der
Stufe 1**. Sie zählt nur im Register Ordnung (Gewicht 35) und erzeugt **immer** eine Frage im
Kontrollblatt: „Der Plan zählt Floor 1 bis Floor 3. Ist Floor 1 das Erdgeschoss oder das erste
Obergeschoss?" — eine Frage für den ganzen Satz, nicht je Blatt.

Gegenprobe, die die Frage oft erübrigt: gibt es im selben Satz ein Blatt mit ±0,00 (E3), mit
Kellermerkmalen (E7) oder mit Hauseingang (E8), ist die Zählung damit verankert und die Frage
entfällt. Sie wird trotzdem als Vermerk protokolliert.

### 4.4 Das Verfahren

```
Durchgang A — verankern
  für jedes Blatt mit Beleg der Stufe 1:
     Geschoss anlegen oder finden, abbildung schreiben, benennung_belegt = true

Durchgang B — ordnen
  alle übrigen Grundrissblätter nach Ordnungspunkten sortieren
  Kette aus Durchgang A als Gerüst nehmen
  Lücken der Kette mit den ungebundenen Blättern füllen, in Ordnungsreihenfolge

Durchgang C — benennen
  aus der vollständigen Ordnung Namen ableiten, aber NUR wenn
    (a) mindestens ein Anker aus Durchgang A vorhanden ist UND
    (b) die Kette lücken- und dublettenfrei ist
  sonst: kein Name, Frage ins Kontrollblatt

Durchgang D — prüfen
  Überlagerung (7), Höhen (8), Vollständigkeit (9)
```

### 4.5 Ab wann automatisch

Ein Blatt wird ohne Rückfrage zugeordnet, wenn **alle drei** Bedingungen gelten
(**Startwerte**):

1. Punktsumme des besten Kandidaten im Register Benennung ≥ **40**,
2. Vorsprung vor dem zweitbesten ≥ **20**,
3. kein Beleg der Stufe 1 für ein **anderes** Geschoss.

Wird 3 verletzt — zwei Stufe-1-Belege widersprechen sich —, ist das kein Zuordnungsproblem
mehr, sondern ein Widerspruch nach Abschnitt 6.

Jede Zuordnung ohne Beleg der Stufe 1 bekommt `benennung_belegt: false`. Diese Geschosse
erscheinen im Bericht in der Annahmenliste als **Klasse C** nach
`SPEZIFIKATION_BERICHT.md` 10.1, mit dem Text: „Die Zuordnung des Blattes … zum … stützt sich
auf …; sie ist im Kontrollblatt bestätigt worden." Bestätigt der Bearbeiter mit Quellenangabe,
wird daraus Klasse A, nach derselben Regel, die dort für überschriebene Werte gilt.

### 4.6 Ein Blatt mit mehreren Geschossen

Meldet die Sichtung `mehrere_geschosse: true`, wird das Blatt **nicht** einem Geschoss
zugeordnet, sondern zerlegt:

1. Lokal die Tintenwolken des Blattes über die Spaltensumme trennen (mehrere Grundrisse
   nebeneinander erzeugen deutliche Lücken in der Spaltentinte; bei Anordnung untereinander
   entsprechend über die Zeilensumme).
2. Für jeden Ausschnitt eine eigene Sichtung fahren — das ist der einzige Fall, in dem ein
   Blatt mehrere Sichtungsaufrufe bekommt. Kosten je Ausschnitt wie ein A4-Blatt, rund
   0,005 USD.
3. Je Ausschnitt eine `abbildung` mit gesetztem `ausschnitt`.

Die Vollauswertung in Stufe 2 kachelt dann nur den jeweiligen Ausschnitt, nicht das ganze
Blatt. Das spart Geld und verhindert, dass Räume des Nachbargeschosses in ein Raumbuch
rutschen.

### 4.7 Ein Geschoss durch ein anderes vertreten — nie automatisch

Der häufigste Fall bei alten Unterlagen: Es gibt einen Grundriss, und der Bericht sagt
„Obergeschoss und Dachgeschoss haben dieselbe Aufteilung" — so steht es wörtlich im
Referenzbericht zu Abbildung 3.

Das Werkzeug darf das **vorschlagen**, aber nie selbst tun, und der Vorschlag muss die Folgen
ausschreiben, weil sie nicht offensichtlich sind:

> Für das Obergeschoss liegt kein eigener Grundriss vor. Das Erdgeschoss kann als Vertretung
> übernommen werden. Beachten Sie: Räume und Flächen werden übernommen, die **Randbedingungen
> aber nicht**. Im Erdgeschoss grenzt der Fußboden an den Keller, im Obergeschoss an einen
> beheizten Raum; die Decke des obersten Geschosses grenzt an außen oder an den Spitzboden.
> Diese drei Bauteile müssen Sie je Raum neu setzen. Ohne diese Änderung ist die Heizlast des
> Obergeschosses zu hoch und die des Dachgeschosses zu niedrig.

Nach der Übernahme: `geschoss.status = "vertreten"`, `vertreten_durch` gesetzt, die betroffenen
Bauteile werden im Raumbuch **rot** markiert, bis sie einmal angefasst wurden, und der Fall
erscheint in der Annahmenliste als Klasse C.

---

## 5 Dubletten

### 5.1 Was eine Dublette ist — und was ausdrücklich keine

| Fall | Geometrie | Raumnamen | Urteil |
|---|---|---|---|
| Scan und Foto desselben Blattes | gleich | gleich | **Dublette** |
| Dasselbe PDF zweimal hochgeladen | identisch | identisch | **Dublette**, byte-gleich |
| Zwei Auflösungen desselben Scans | gleich | gleich | **Dublette** |
| EG und OG desselben Hauses | sehr ähnlich (Wände stapeln) | verschieden | **keine Dublette** |
| Bestand und Planung desselben Geschosses | ähnlich | verschieden | **Widerspruch**, Abschnitt 6 |
| Zwei Hälften eines A0-Plans | verschieden | verschieden | **Teilgrundrisse**, gehören zusammen |

Der gefährliche Fall ist Zeile 4. Erd- und Obergeschoss eines normalen Wohnhauses haben
nahezu dasselbe Wandraster; eine reine Geometrieprüfung erklärt sie zu Dubletten und lässt
ein Geschoss verschwinden. **Deshalb ist Geometrie allein nie hinreichend.**

### 5.2 Die Kennwerte

Vier Prüfungen, von billig nach teuer:

**D0 — Byte-Gleichheit.** SHA-256 der Datei und, bei PDF, der gerenderten Seite bei Skala 0,25.
Trifft es zu, ist die Sache entschieden, ohne weitere Prüfung.

**D1 — Radiales Konturprofil.** Auf dem binarisierten Bild (Otsu-Schwelle, dieselbe Funktion
wie in `kern_planpruefung.js`): Schwerpunkt der Tinte bestimmen, dann in 72 Richtungen zu je
5 Grad den Abstand zum äussersten Tintenpunkt messen, den Vektor durch seinen Mittelwert
teilen. Ergebnis ist ein 72-Vektor, unabhängig von Größe und Lage. Verglichen wird mit der
besten von vier Vierteldrehungen (Pläne stehen achsparallel). Abstand = mittlere absolute
Abweichung.

**D2 — Zeilen- und Spaltenprofil der Tinte.** Auf den Tintenrahmen zuschneiden, Tinte je Zeile
und je Spalte summieren, beide auf 128 Werte neu abtasten, auf Mittelwert 1 normieren.
Wände erzeugen scharfe Spitzen; das Muster der Spitzen ist der Fingerabdruck des Wandrasters.
Verglichen wird über die normierte Kreuzkorrelation. Bei 90-Grad-Drehung werden die beiden
Profile getauscht.

**D3 — Raumnamenmenge.** Jaccard-Ähnlichkeit der Mengen aus `sichtung.raumnamen`, nach
Kleinschreibung und Entfernen von Ziffern und Flächenangaben. Das ist der Kennwert, der
Zeile 4 der Tabelle oben rettet: „Wohnen, Küche, Diele, WC, Terrasse" gegen „Schlafen, Kind,
Bad, Diele, Balkon" liefert eine Jaccard-Ähnlichkeit nahe null bei nahezu gleicher Geometrie.

Zusätzlich als Beifang, kostenlos: Abweichungen in `blattmass_mm`, `plankopf`-Text und Datum.

### 5.3 Die Entscheidungsregel

```
wenn D0 gleich                          -> Dublette, sicher
sonst wenn D1 <= 0,06 UND D2 >= 0,92 UND D3 >= 0,80     -> Dublette
sonst wenn D1 <= 0,06 UND D2 >= 0,92 UND D3 <  0,50     -> WIDERSPRUCH (Abschnitt 6)
sonst wenn D1 <= 0,06 UND D2 >= 0,92 UND D3 dazwischen  -> Kontrollblatt, unentschieden
sonst                                                    -> zwei verschiedene Blätter
```

Alle Schwellen sind **Startwerte**. Sie werden gegen den Referenzstapel kalibriert, und zwar
mit einem gezielt erzeugten Prüfsatz: jedes der fünf Blätter zusätzlich als verkleinerte
Fassung, als Handyfoto mit leichter Schräglage und als Graustufenkopie. Erwartet werden
15 Dubletten-Paare und null falsche Treffer zwischen EG, OG und DG.

Ein Hinweis zur Ehrlichkeit: D3 setzt voraus, dass die Sichtung Raumnamen liest. Auf einem
Blatt ohne Raumbeschriftung — bei Bauzeichnungen von 1936 durchaus üblich — ist D3 nicht
verfügbar. Dann gilt: **keine automatische Dublettenauflösung**, der Fall geht ins
Kontrollblatt. Lieber eine Rückfrage als ein verschwundenes Geschoss.

### 5.4 Welche Fassung gewinnt: die Güte

Die Kennwerte aus `kern_planpruefung.js` sind genau die richtige Währung. Die Güte ist eine
Zahl von 0 bis 100:

| Anteil | Größe | Rechnung |
|---|---|---|
| Ausschluss | `eignung.urteil === "ungeeignet"` | Güte 0, kann nie gewinnen, solange eine nutzbare Fassung da ist |
| 40 | **wirksame Auflösung** | kürzere Kante × Flächenanteil des Tintenrahmens am Bild. Ein Foto mit breitem Rand verliert gegen einen knapp beschnittenen Scan gleicher Pixelzahl |
| 20 | Schärfe | `min(schaerfe, 40) / 40`. Die Deckelung ist wichtig: Sensorrauschen treibt die Laplace-Varianz nach oben, ein verrauschtes Foto darf einen sauberen Scan nicht schlagen |
| 20 | Kontrast | `min(kontrast, 150) / 150` |
| 10 | Ausrichtung | `1 − min(schraeglage, 1.5) / 1.5` |
| 10 | Herkunft | Vektor-PDF 1,0 · PDF-Scan 0,8 · Bilddatei 0,6 · Foto 0,4 |

Vektor-PDF steht oben, weil dort der Textlayer exakte Maßzahlen und den Blattkopf liefert —
die Gegenprobe zur Bildauslese nach `SPEZIFIKATION_FORMATE.md` 7. Fotos stehen unten, weil die
perspektivische Verzerrung von der heutigen Eignungsprüfung gar nicht erfasst wird (offener
Punkt O4 dort).

Die Gewichte sind **Startwerte** und im Kern als Konstantenblock zu führen, wie `S` in
`kern_planpruefung.js`.

### 5.5 Der Verlierer wird nicht gelöscht

Die schlechtere Fassung bekommt `rolle: "zweitfassung"` und bleibt im Stapel. Gründe:

* Sie ist oft dort lesbar, wo die bessere einen Knick, einen Fleck oder einen Stempel hat.
  In Stufe 2 kann eine einzelne Kachel aus der Zweitfassung nachgelesen werden.
* Sie ist die unabhängige Gegenprobe für Maßzahlen. Weichen die Fassungen in einer Maßzahl ab,
  ist das ein Widerspruch nach 6.1 W2 und gehört vorgelegt.
* Kapitel 3 des Berichts muss benennen, **welche** Unterlage verwendet wurde. Dazu muss die
  andere bekannt sein.

Ausgeschlossene Blätter (`rolle: "ausgeschlossen"`) verschwinden ebenfalls nicht, sondern
stehen im Kontrollblatt in einer eingeklappten Sammelzeile: „3 Blätter nicht verwendet:
Lageplan, Detail Fensteranschluss, Foto Heizungskeller. Öffnen zum Ändern."

### 5.6 Sonderfall: zwei Hälften eines Blattes

`teilgrundriss: true` bei zwei Blättern mit **verschiedener** Kontur, aber gleicher
Geschossbezeichnung und überlappenden Raumnamen: kein Widerspruch, sondern zwei
`abbildungen` auf dasselbe Geschoss, beide `massgeblich`. Das Werkzeug vermerkt, dass die
Kontur des Geschosses aus zwei Blättern zusammenzusetzen ist, und stellt die
Vollständigkeitsprüfung nach 7 für dieses Geschoss zurück, bis der Bearbeiter beide Polygone
gezeichnet hat.

---

## 6 Widersprüche

**Grundsatz: Ein Widerspruch wird nie aufgelöst, sondern vorgelegt.** Das Werkzeug darf eine
Auflösung vorschlagen und begründen. Es darf sie nicht wählen.

### 6.1 Vier Arten

| Art | Beschreibung | Schwere |
|---|---|---|
| **W1 Aufteilung** | Zwei Blätter zeigen dasselbe Geschoss mit anderer Raumaufteilung. Bestand gegen Planung, alt gegen Aufmaß | **Sperre** |
| **W2 Maß** | Dieselbe Strecke ist auf zwei Blättern verschieden bemaßt (8,55 gegen 8,60) | Vorlage |
| **W3 Geschosszahl** | Schnitt oder Ansicht zeigen mehr Geschosse als Grundrisse vorliegen | **Sperre**, siehe 9 |
| **W4 Bezeichnung** | Zwei Blätter tragen dieselbe Geschossbezeichnung, zeigen aber verschiedene Gebäude oder Bauteile | **Sperre** |

### 6.2 Woran das Werkzeug sie erkennt

**W1** — die mittlere Zeile der Regel in 5.3: Geometrie passt, Text passt nicht. Zusätzlich
verstärkend, jedes für sich schon ein Verdacht:

* `sichtung.planart` verschieden („bestand" gegen „planung").
* Verschiedene Raumzahl um mehr als 1.
* **Farbanteile.** In deutschen Bauvorlagen ist die Zeichenkonvention verbreitet: Bestand
  schwarz, Abbruch gelb, Neubau rot. `kennwerte.farbe` misst den Anteil gesättigter roter und
  gelber Bildpunkte lokal und kostenlos. Ein Blatt mit nennenswertem Gelb- oder Rotanteil ist
  ein Umbauplan und zeigt zwei Zustände zugleich. Das ist ein **Indiz**, keine Norm — die
  Konvention ist nicht bundeseinheitlich geregelt, deshalb nur als Verdachtsmoment und im
  Klartext benannt.
* Verschiedene Jahreszahlen im Blattkopf.

**W2** — nur nach Stufe 2 verfügbar, wenn beide Blätter ausgewertet wurden, oder bei
Vektor-PDF schon aus dem Textlayer. Verglichen werden Maßketten gleicher Bedeutung nach
Zuordnung über die Lage im Blatt. Toleranz **1 Prozent oder 5 cm**, was größer ist
(**Startwert**; begründet damit, dass Zeichnungen unterschiedlicher Epochen sich in Rohbau-
und Fertigmaß unterscheiden können).

**W4** — gleiche Bezeichnung, aber D1 > 0,25 und D3 < 0,2. Fast immer entweder ein
Nachbargebäude im Stapel oder zwei Bauabschnitte.

### 6.3 Wie es vorgelegt wird

Eine **Gegenüberstellung**, zwei Spalten, gleich groß, keine Vorauswahl markiert:

```
+--------------------------------------+--------------------------------------+
| [Vorschau Blatt 4]                   | [Vorschau Blatt 9]                   |
| Dachgeschoss 1936                    | Aufmaßplan, Floor 3                  |
+--------------------------------------+--------------------------------------+
| Räume: 4                             | Räume: 6                             |
| Bodenraum, Bodenraum, Kammer,        | Wohnen, Küche, Bad, Schlafen,        |
| Diele                                | Kind, Diele                          |
| Blattkopf: 1936                      | Blattkopf: Aufmaß 2020               |
| Planart: Bestand                     | Planart: Aufmaß                      |
| Güte 71 (Blaupause, weich)           | Güte 88                              |
| Außenkontur: gleich, IoU 0,98        | Außenkontur: gleich                  |
+--------------------------------------+--------------------------------------+
Was gilt für die Berechnung?
```

Darunter genau vier Möglichkeiten, jede mit ihrer Folge ausgeschrieben:

| Wahl | Folge |
|---|---|
| **A — Blatt 4 ist massgeblich** | Blatt 9 wird `nachrichtlich`, erscheint als Abbildung, geht nicht ins Raumbuch |
| **B — Blatt 9 ist massgeblich** | umgekehrt |
| **C — beide, aber für Verschiedenes** | Es öffnet sich eine kleine Tabelle: Geometrie / Raumaufteilung / Bauteilaufbau / Nutzung, je Zeile ein Blatt zu wählen. Ohne vollständige Zuordnung bleibt die Sperre |
| **D — keines von beiden** | Der Bearbeiter erfasst das Geschoss von Hand. Beide Blätter bleiben nachrichtlich |

Zu jeder Wahl ist ein **Grund** einzutragen, mindestens zehn Zeichen — dasselbe Muster wie
beim Aufheben der Eignungssperre in `modul_plan.js`. Der Grund wandert wörtlich in den
Bericht.

Zwei getrennte Berechnungen (Bestand und Planung nebeneinander) sind hier bewusst **nicht**
vorgesehen: der Rechenkern führt einen Zustand, die Variantenrechnung des Referenzberichts
(V0 bis V11) ist ein anderer Mechanismus. Siehe offener Punkt O4.

### 6.4 Was im Bericht steht

Der Referenzbericht liefert das Muster in Kapitel 3 selbst. Zu Abbildung 4 steht dort
sinngemäss: Damals lagen an beiden Giebeln Bodenräume, der aktuelle Aufmaßplan zeigt das
Geschoss dagegen mit derselben Aufteilung wie das Obergeschoss, und diese Berechnung setzt das
gesamte Dachgeschoss als beheizt an, mit Verweis auf den Abschnitt der Annahmen.

Daraus die Schablone für den erzeugten Satz:

> **{Blatt A}** zeigt {Befund A}. **{Blatt B}** zeigt dagegen {Befund B}. Diese Berechnung
> folgt {Wahl}, weil {Grund des Bearbeiters}. Siehe Abschnitt {Nr. der Annahmenliste}.

Der Eintrag in der Annahmenliste ist **Klasse C**, solange der Bearbeiter keine Quelle
angegeben hat, sonst Klasse A — nach der Vergaberegel aus `SPEZIFIKATION_BERICHT.md` 10.3.
Trägt der Widerspruch nach der Vergleichsrechnung den größten C-Anteil am
Transmissionswärmestrom, bekommt er dort das Präfix „LEITPARAMETER."

---

## 7 Passen die Geschosse übereinander

### 7.1 Zwei Genauigkeitsstufen, aus einem Grund

Eine belastbare Außenkontur aus einem Rasterbild zu gewinnen ist schwer — Maßketten,
Beschriftung und Schraffuren liegen außerhalb der Wand und ziehen jede naive Kontur nach
außen. Genau dafür entsteht `kern_grundriss.js`. Der Stapel wartet nicht darauf, sondern
prüft zweistufig:

| Stufe | Grundlage | Was sie kann | Was sie nicht kann |
|---|---|---|---|
| **grob**, sofort nach der Sichtung | `signatur.kontur72`, `zeilen128`, `spalten128` | erkennen, dass zwei Blätter **nicht dasselbe Gebäude** zeigen; erkennen, dass ein Geschoss deutlich kleiner ist | keine Meter, keine Flächen |
| **metrisch**, nach dem Maßstab und den Polygonen | `geschoss.kontur.punkte` in Metern | IoU, Kantenversatz in Metern, Flächendifferenz in m², daraus Bauteilvorschläge | nichts davon vor dem Maßstab |

Die grobe Stufe läuft im Kontrollblatt und verhindert die groben Fehler. Die metrische Stufe
läuft, sobald die Polygone stehen, und erzeugt die Bauteilvorschläge in 7.4. Ergebnisse beider
Stufen stehen in `geschoss.ueberlagerung`.

### 7.2 Überlagern

1. **Ausrichten.** Vorrangig an senkrechten Festpunkten (E5): Treppenauge, Schornstein,
   Sanitärstrang. Sie liegen bauartbedingt in allen Geschossen an derselben Stelle und sind
   der genaueste Anker. Sind mindestens zwei vorhanden, sind Verschiebung und Drehung damit
   bestimmt.
2. Sonst über Schwerpunkt der Kontur und Hauptachsen, mit Prüfung der vier Vierteldrehungen.
3. **Maßstab.** In der metrischen Stufe kein Skalierungsfreiheitsgrad — beide Konturen liegen
   in Metern. Weicht die Fläche dann um mehr als 30 Prozent ab, ist eher der Maßstab eines
   Blattes falsch gesetzt als das Gebäude verschieden. Das Werkzeug sagt genau das, statt einen
   Anbau zu erfinden.

### 7.3 Die Kennzahlen und was aus ihnen folgt

Drei Zahlen je Geschosspaar: **IoU** (Schnitt durch Vereinigung), **Kantenversatz** (Abstand
der einander entsprechenden äusseren Wandlinien, in Metern), **Flächendifferenz** (m² und
Prozent).

| IoU | Deutung | Folge |
|---|---|---|
| ≥ 0,97 | deckungsgleich | automatisch, kein Vermerk |
| 0,90 bis 0,97 | kleine Abweichung: Erker, Wandstärkenwechsel, Zeichenungenauigkeit | automatisch, Vermerk in der Annahmenliste, kein Bauteilvorschlag |
| 0,60 bis 0,90 | echte bauliche Abweichung | **Kontrollblatt** mit Deutungsvorschlag und gerechneter Differenzfläche |
| < 0,60 | vermutlich nicht dasselbe Gebäude, oder Maßstab falsch | **Sperre** |

**Startwerte.** Zu kalibrieren am Referenzstapel (dort sind EG, OG und DG deckungsgleich, der
Keller weicht ab) und an mindestens einem Objekt mit Anbau und einem mit Staffelgeschoss.

### 7.4 Was eine Abweichung fachlich bedeutet

Hier liegt der eigentliche Wert der Überlagerung. Eine Warnung „Geschosse nicht deckungsgleich"
ist wertlos; was zählt, ist das **Bauteil**, das aus der Differenzfläche folgt. Genau diese
Bauteile werden sonst vergessen, und ihr Vergessen macht die Heizlast systematisch zu klein.

| Befund aus der Überlagerung | Was daraus folgt | Bauteilvorschlag |
|---|---|---|
| Oberes Geschoss **kleiner** (Staffelgeschoss, Rücksprung) | Die nicht überbaute Fläche des unteren Geschosses liegt frei | **Flachdach oder Terrasse gegen außen**, Fläche = Differenzfläche, f_k = 1. Ohne diesen Vorschlag wird die Decke als „gegen beheizt" geführt und der Verlust fehlt vollständig |
| Unteres Geschoss **größer** durch Anbau (Garage, Windfang, Wintergarten) | Anbaudach frei; die Wand des oberen Geschosses über dem Anbau grenzt an außen oder an einen unbeheizten Anbau | **Dach über Anbau**, dazu Prüffrage: ist der Anbau beheizt? Davon hängt f_k der dazwischenliegenden Wand ab |
| Oberes Geschoss **größer** (Auskragung, Erker) | Der auskragende Teil hat unten freie Luft | **Decke gegen außen (unten)**, f_k = 1. Klassisch vergessenes Bauteil |
| **Keller kleiner** als Erdgeschoss (Teilunterkellerung) | Der nicht unterkellerte Teil der Erdgeschossdecke liegt auf dem Erdreich | Aufteilung der Bodenfläche: Teil gegen unbeheizten Keller, Teil als **Bodenplatte gegen Erdreich** mit eigenem Temperaturkorrekturfaktor. Die Differenzfläche gibt die Aufteilung her |
| **Kontur eines Geschosses gedreht oder versetzt** | Vermutlich ein Blatt eines anderen Gebäudeteils | keine Bauteile, Sperre |

Zwingende Regel: **kein Bauteil wird eingefügt, nur vorgeschlagen.** Der Vorschlag trägt
`herkunft: "aus Geschossueberlagerung"`, `belegt: false`, die gerechnete Fläche und einen
Klartextsatz, was er bedeutet. Angenommen erscheint er in der Annahmenliste als Klasse C,
weil die Fläche aus einer Zeichnungsauswertung stammt und der U-Wert ohnehin gesetzt werden
muss.

### 7.5 Zwei zusätzliche Prüfzeilen für die Plausibilitätsprüfungen

Der Referenzbericht führt in seinem Kapitel 11 unabhängige Gegenrechnungen, unter anderem die
Kerndämmfläche 182,21 gegen 182,00 aus einer Fremdrechnung. In derselben Art fallen aus der
Überlagerung zwei Prüfzeilen kostenlos ab:

| Prüfung | Sollwert | Herkunft des Sollwerts |
|---|---|---|
| Außenwandfläche aus Umfang der überlagerten Kontur × Geschosshöhen | Summe der Wandflächen im Raumbuch | zwei unabhängige Wege zur selben Größe |
| Gebäudevolumen aus Geschossflächen × lichten Höhen | umbauter Raum, sofern in den Unterlagen | Fremdunterlage |

Toleranz **5 Prozent** (**Startwert**; im Referenzfall lag die entsprechende Prüfung bei
0,1 Prozent, das Gebäudevolumen bei 2,7 Prozent).

---

## 8 Geschosshöhen aus dem Schnitt

### 8.1 Was aus dem Schnitt kommt und was nicht

Der Schnitt wird **nicht umfahren**. Er liefert genau vier Dinge:

1. die **Anzahl** der Geschosse (Abschnitt 9),
2. die **Höhenkette** von unten nach oben,
3. Sondermaße: Drempel, Kehlbalkendecke, Firsthöhe, Dachneigung, Geländeoberkante,
4. die Zuordnung über **Höhenkoten**, wenn vorhanden.

### 8.2 Die Höhenkette und die Summenprobe

Ein Schnitt trägt oft drei bis fünf Maßketten übereinander am Blattrand. Sie sind nicht
gleichwertig:

| Kette | Erkennungsmerkmal | Verwendung |
|---|---|---|
| **Summenkette**, ganz außen | ein Feld über die volle Höhe, oft GOK bis First | Gesamthöhe, Prüfgröße |
| **Geschosskette** | teilt die Summe in so viele Felder, wie es Geschosse gibt; Feldgrenzen liegen auf den Deckenbändern | **Geschosshöhen** — das ist die gesuchte Kette |
| **Rohbaukette** | teilt jedes Geschossfeld nochmals in lichte Höhe und Deckendicke | lichte Höhe und Deckenaufbau |
| **Öffnungskette**, innen | Brüstung, Sturz, Türhöhen | für die Heizlast nicht gebraucht |

**Die Summenprobe ist die Kernregel.** Eine Kette wird nur dann als Geschosskette übernommen,
wenn ihre Felder in der Summe die Summenkette ergeben, mit einer Toleranz von 2 cm
(**Startwert**). Ohne bestandene Summenprobe wird **keine** Höhe übernommen; der Fall geht
ins Kontrollblatt mit der Kette als Vorschlag und der Bitte, sie zu bestätigen.

Der Referenzfall zeigt, wie gut das trägt: dort liefert der Schnitt 6,00 m über Erd- und
Obergeschoss (also 3,00 m je Geschoss) und 5,60 m vom Dachgeschossfußboden bis zum First; aus
9,50 m Gebäudetiefe und 45 Grad Dachneigung entfallen davon 4,75 m auf das Dach und 0,85 m auf
den Drempel. Die Summenprobe 4,75 + 0,85 = 5,60 geht auf. Genau diese Zerlegung soll das
Werkzeug nachvollziehen — nicht raten, sondern die Probe rechnen und sie im Bericht als Befund
mit Herleitung ausweisen, so wie der Endpunkt es im Feld `befunde` bereits vorsieht.

### 8.3 Welche Höhe zu welchem Geschoss

```
wenn Höhenkoten vorhanden:
    Kote ±0,00   -> OKFF Erdgeschoss. Alles Negative liegt darunter.
    Geschosshöhe = Differenz benachbarter Koten.
    Zuordnung über die Kote ist BELEGEND (Klasse A).

sonst wenn Geschosskette mit bestandener Summenprobe:
    Felder von unten nach oben auf die Geschossordnung aus Abschnitt 4 legen.
    Voraussetzung: Feldzahl == Geschosszahl. Sonst -> Kontrollblatt (und
    zugleich ein Vollständigkeitsbefund nach Abschnitt 9).

sonst:
    keine automatische Zuordnung.
```

Bei **ungleichen** Höhen ist die Reihenfolge das Einzige, was zählt — die Zuordnung darf
niemals über die Größe laufen („die größte Höhe ist sicher das Erdgeschoss"). Das ist bei
Altbauten oft richtig und bei Bungalows und Staffelgeschossen falsch.

### 8.4 Geschosshöhe ist nicht lichte Höhe

Die Rechnung braucht beides:

* die **lichte Höhe** für das Raumvolumen und damit für den Lüftungsanteil,
* die **Geschosshöhe** für die Wandfläche, wenn diese als Umfang × Höhe gebildet wird.

Liegt nur eine der beiden vor, wird die andere über die Deckendicke abgeleitet. Die
Deckendicke steht selten im Schnitt. Regel: Das Werkzeug **fragt**, statt zu setzen. Im
Kontrollblatt steht die Frage mit dem Hinweis, dass im Referenzfall aus der Zeichnung von
1936 3,00 m Geschosshöhe und 2,75 m lichte Höhe hervorgehen, also 0,25 m Deckenaufbau — das
ist **ein belegter Einzelfall, kein allgemeiner Wert** und wird auch so beschriftet. Setzt
der Bearbeiter einen Wert ohne Quelle, ist er Klasse C.

### 8.5 Plausibilitätsband

Eine übernommene Geschosshöhe muss zwischen **2,20 m und 4,50 m** liegen, eine lichte Höhe
zwischen **2,00 m und 4,20 m** (**Erfahrungswerte für Wohngebäude**, keine Normwerte).
Außerhalb: keine Übernahme, Kontrollblatt. Der häufigste Grund für einen Ausreißer ist eine
falsch gelesene Kette (etwa die Öffnungskette statt der Geschosskette) — und genau den fängt
das Band ab.

### 8.6 Kein Schnitt im Stapel

Die Ersatzwege in der Reihenfolge, in der das Werkzeug sie versucht. Jeder trägt seine
Konfidenzklasse mit:

| Rang | Weg | Klasse | Bemerkung |
|---|---|---|---|
| 1 | **Raumhöhe im Grundriss angeschrieben** („h = 2,50", „lichte Höhe 2,75") | A | bei Aufmaßplänen häufig; wird in Stufe 2 ohnehin mitgelesen |
| 2 | **Höhenkoten in mehreren Grundrissen** | A | Differenz benachbarter Koten ist die Geschosshöhe |
| 3 | **Ansicht** statt Schnitt: Abstand der Fensterreihen, wenn eine Maßkette oder eine bekannte Bezugslänge (Türhöhe) im Blatt ist | C | grob, nur als Vorschlag |
| 4 | **Trauf- und Firsthöhe** aus Lageplan oder Bauantrag, geteilt durch die Geschosszahl | C | setzt gleiche Höhen voraus |
| 5 | **Frage im Kontrollblatt**, Feld leer, mit Vorschlag daneben | C | siehe unten |

Für Rang 5 gilt ausdrücklich: **kein vorbelegtes Feld.** Ein Vorschlag steht daneben und muss
angeklickt werden. Der Unterschied ist nicht kosmetisch — ein vorbelegtes Feld wird
weggeklickt, ein leeres Feld muss gefüllt werden.

### 8.7 Was eine falsche Höhe kostet

Damit die Frage nach der Höhe nicht als Formalie durchgewinkt wird, zeigt das Kontrollblatt
die Wirkung. Am Referenzfall **gerechnet**, aus den Zahlen des Berichts:

* Der Lüftungsanteil skaliert linear mit dem Raumvolumen und damit mit der Höhe: 2.600 W von
  9.044 W, also **28,8 Prozent**.
* Die Wandflächen skalieren ebenfalls mit der Höhe. Aus der Bauteilbilanz: Außenwand Giebel
  957 W + Garten 573 W + Straße 551 W + Haustrennwand 509 W = 2.590 W, also **28,6 Prozent**.
  Dach, Kellerdecke, oberste Geschossdecke, Fenster und Haustür skalieren nicht.
* Zusammen **rund 57 Prozent** der Gebäudeheizlast hängen linear an der Geschosshöhe. Eine um
  10 Prozent zu klein angenommene Höhe (2,70 statt 3,00 m) macht das Ergebnis um **rund
  6 Prozent** zu klein, also im Referenzfall rund 0,5 kW.
* Die Richtung des Fehlers: eher etwas mehr als 6 Prozent, weil die Nettowandfläche als
  Differenz von Bruttowand minus Fenster gebildet wird und die Fensterfläche nicht mitwächst.

Der Satz im Kontrollblatt lautet entsprechend: „Die Geschosshöhe bestimmt rund die Hälfte des
Ergebnisses mit. Ein Fehler von 30 cm verschiebt die Heizlast dieses Gebäudes um
schätzungsweise {x} kW." Die Zahl wird nach der ersten Rechnung durch den tatsächlichen Wert
aus einer Vergleichsrechnung ersetzt, so wie es die Vergleichsrechnung in Kapitel 8 des Berichts vorsieht.

### 8.8 Ein Befund am bestehenden Code

`src/app.js` bildet die Raumhöhe mit `h: num(r.h, 2.5)` ab — ein stiller Vorgabewert von
2,50 m, wenn nichts gesetzt ist. Für den Stapelweg ist das genau die falsche Voreinstellung:
eine fehlende Höhe würde unbemerkt zu 2,50 m und nach 8.7 zu einem Ergebnisfehler von rund
6 Prozent je 30 cm, ohne dass irgendwo etwas rot wird. Empfehlung: `h` bleibt `null`, bis es
gesetzt ist; die Selbstprüfung meldet jeden Raum ohne Höhe als Sperre; der Vorgabewert 2,5
bleibt allenfalls für die manuelle Erfassung erhalten, dann aber sichtbar als Vorschlag
markiert.

---

## 9 Vollständigkeit

Die gefährlichste der sechs Aufgaben, weil ihr Fehler nicht auffällt: Ein fehlendes Geschoss
liefert eine widerspruchsfreie, plausibel aussehende, zu kleine Heizlast. Die spezifische
Heizlast je Quadratmeter bleibt dabei völlig unauffällig — nur die absolute Summe ist zu
klein. Die bestehende Selbstprüfung gegen die Typologie arbeitet in W/m² und schlägt deshalb
**nicht** an. Es braucht eigene Zähler.

### 9.1 Acht unabhängige Zähler

| Nr. | Zähler | Stärke | Bemerkung |
|---|---|---|---|
| Z1 | Anzahl zugeordneter Grundrissblätter | — | die zu prüfende Größe, kein Zähler |
| Z2 | **Felder der Geschosskette im Schnitt** | sehr hoch | der beste unabhängige Zähler |
| Z3 | **Fensterreihen in der Ansicht**, plus Sockel und Dachfläche | hoch | zählt auch Geschosse, die kein Grundriss zeigt |
| Z4 | **Höhenkoten** über alle Blätter: Lücken in der Kotenfolge bei bekannter Geschosshöhe | hoch | findet gezielt das *fehlende* Geschoss, nicht nur die Zahl |
| Z5 | **Treppentest**, siehe 9.2 | hoch | rein aus den Grundrissen, braucht keinen Schnitt |
| Z6 | **Blattnummerierung** „Blatt 2 von 5" | mittel | zählt Blätter, nicht Geschosse |
| Z7 | **Text im Blattkopf oder in einer Textseite**: „3 Vollgeschosse", „Grundrisse EG–DG" | mittel | Textseiten gehen nach `SPEZIFIKATION_FORMATE.md` 6.2 ohnehin als Text in den Fragebogen |
| Z8 | **Nutzungsschablone im Lageplan** („II+D", „III") | mittel | verbreitete Schreibweise; als Konvention gekennzeichnet, nicht als Norm |

### 9.2 Der Treppentest

Rein lokal, aus `sichtung.treppe` aller Grundrissblätter, und bemerkenswert scharf:

```
Es muss genau EIN Blatt mit treppe == "nur_auf" geben     -> das unterste Geschoss
Es muss genau EIN Blatt mit treppe == "nur_ab" geben      -> das oberste Geschoss
Jedes Blatt dazwischen hat "auf_und_ab"

kein "nur_auf"   -> das unterste Geschoss fehlt (häufig: der Keller)
kein "nur_ab"    -> das oberste Geschoss fehlt (häufig: Dachgeschoss oder Spitzboden)
zwei "nur_auf"   -> zwei Gebäude oder zwei Bauabschnitte im Stapel
"keine" bei mehr als einem Geschoss -> das Blatt ist vermutlich kein voller Grundriss
```

Der Test greift auch dann, wenn gar kein Schnitt im Stapel liegt — das ist sein Wert. Er
versagt bei Gebäuden mit Außentreppe oder ohne innenliegende Treppe; deshalb ist er ein
Zähler unter mehreren und keine Sperre für sich allein.

### 9.3 Sollzahl bilden und was bei Unterdeckung passiert

`geschosszahl_soll` = **Maximum** aller verfügbaren Zähler, mit dem Beleg dazu. Nicht der
Mittelwert und nicht der Median: bei der Vollständigkeit ist der Fehler einseitig, und ein
Zähler, der ein Geschoss mehr sieht, hat fast immer recht.

Bei `ist < soll` entsteht ein Konflikt mit `schwere: "sperre"`:

> **Es fehlt vermutlich ein Geschoss.**
> Der Schnitt (Blatt 2) zeigt drei Vollgeschosse und ein Dachgeschoss. Zugeordnet sind
> Grundrisse für Erdgeschoss und Dachgeschoss. In den Grundrissen fehlt außerdem ein Blatt
> mit einer Treppe ohne Abgang; das spricht dafür, dass auch der Keller nicht dabei ist.
>
> Solange das offen ist, wird nicht gerechnet: Eine Berechnung ohne dieses Geschoss ergibt
> eine **zu kleine** Heizlast, und das fällt am Ergebnis nicht auf.
>
> ☐ Grundriss nachreichen
> ☐ Geschoss durch ein anderes vertreten lassen (Folgen werden angezeigt, siehe 4.7)
> ☐ Geschoss gehört nicht zur Berechnung — Grund: ______ (mindestens zehn Zeichen)

Die dritte Möglichkeit ist notwendig und legitim: ein Spitzboden über der obersten
Geschossdecke ist ein unbeheizter Bereich und hat keinen Grundriss nötig — aber er muss dann
als **unbeheizte Zone** angelegt werden, nicht einfach verschwinden. Das Werkzeug bietet das
direkt an und verzweigt in Schritt 4 des Werkzeugs („Unbeheizte Bereiche").

### 9.4 Zwei Gegenproben am Ergebnis, unabhängig von den Blättern

Auch wenn alle Zähler schweigen, prüft die Selbstprüfung nach der Rechnung zwei Größen, die
ein fehlendes Geschoss sofort verraten. Beide folgen dem Muster von Kapitel 11 des
Referenzberichts:

| Prüfung | Warum sie greift |
|---|---|
| Summe der Geschossflächen gegen die **Wohnfläche** aus einer Wohnflächenberechnung oder aus dem Exposé | Fehlt ein Geschoss von dreien, fehlt rund ein Drittel. Im Referenzfall lagen 160,03 m² aus der Wohnflächenberechnung vor — eine typische Fremdunterlage |
| Gebäudevolumen aus Geschossflächen × Höhen gegen den **umbauten Raum** oder Ve aus einer KfW- oder Energieausweisunterlage | dasselbe Prinzip, unabhängige Quelle. Im Referenzfall 850,08 gegen 828 m³, also 2,7 Prozent |

Beide Prüfungen setzen voraus, dass die Fremdzahl bekannt ist. Das Kontrollblatt fragt sie
deshalb ab — **eine** Zeile, optional, mit dem Hinweis, wofür sie gebraucht wird. Ist sie
leer, steht in der Selbstprüfung eine gelbe Zeile: „Vollständigkeit der Geschosse nicht
unabhängig geprüft — keine Vergleichsgröße eingetragen."

---

## 10 Das Kontrollblatt

### 10.1 Aufbau

Eine Seite, oben eine Zeile mit dem Gesamtstand, darunter die Fragen in fester Reihenfolge,
darunter die Blattgalerie mit allen Blättern und ihrer Rolle.

```
Stapel: 10 Blätter · 4 Geschosse erkannt · 2 Sperren · 3 Fragen · Budget 0,08 von 2,00 USD

[!] SPERRE  Es fehlt vermutlich ein Geschoss                           (9.3)
[!] SPERRE  Dachgeschoss: zwei Fassungen mit anderer Raumaufteilung    (6.3)
[?] Geschoss von Blatt 7 unklar — Kandidaten: OG (32), DG (28)         (4.5)
[?] Zählt „Floor 1" als Erdgeschoss?                                   (4.3)
[?] Geschosshöhe des Kellers: kein Maß gefunden                        (8.6)
[i] Blatt 3 und Blatt 8 sind dieselbe Vorlage; Blatt 3 wird verwendet  (5.4)
[i] Dachgeschoss springt gegenüber dem OG um 12,4 m² zurück            (7.4)
[i] 3 Blätter nicht verwendet                                   [aufklappen]
```

### 10.2 Reihenfolge

Sperren zuerst, dann Fragen, dann Vermerke. Innerhalb einer Gruppe nach **Wirkung auf das
Ergebnis**, nicht nach Blattreihenfolge: erst was Geschosse betrifft, dann Höhen, dann
Flächen, dann Einzelräume. Grund: die frühen Antworten machen spätere Fragen oft überflüssig
— wird ein fehlendes Geschoss nachgereicht, verschwinden die Fragen zu Höhe und Kontur von
selbst. Das Kontrollblatt rechnet sich deshalb nach jeder Antwort neu.

### 10.3 Sperren

Eine Sperre verhindert genau das, was ohne sie falsch würde, nicht mehr:

| Sperre | Was blockiert ist | Was weiter geht |
|---|---|---|
| Fehlendes Geschoss | Rechnen und Bericht | Blätter auswerten, Bauteile pflegen |
| Widerspruch W1 | Übernahme ins Raumbuch **für dieses Geschoss** | alle anderen Geschosse |
| IoU < 0,60 | Übernahme der Kontur | alles Übrige |
| Blatt ungeeignet (`kern_planpruefung`) | Maßstab, Umfahren, Übernahme dieses Blattes | bestehende Regel, unverändert |

Aufheben geht bei allen nach demselben, schon eingeführten Muster: mit einer Begründung von
mindestens zehn Zeichen, die im Bericht und in der Selbstprüfung als Warnung erscheint. Die
einzige Ausnahme ist das fehlende Geschoss: hier ist „ignorieren" **nicht** vorgesehen,
sondern nur die drei benannten Wege aus 9.3 — Nachreichen, Vertreten, oder als unbeheizte Zone
führen. Jeder davon hinterlässt eine nachvollziehbare Spur.

### 10.4 Was der Bearbeiter nie sieht

Punktzahlen, Konfidenzwerte, IoU als Rohzahl, Kennwertnamen. Alles wird in einem Satz
ausgesprochen, der einen Grund enthält. `abbildung.punkte` und `blatt.guete` bleiben im
Protokoll und im gespeicherten Projekt — für die Fehlersuche und für die spätere Kalibrierung.

---

## 11 Was davon in den Bericht wandert

| Ort im Bericht | Inhalt aus dem Stapel |
|---|---|
| **Kapitel 3 Planunterlagen** | je verwendetes Blatt eine Abbildung mit Bildunterschrift: was das Blatt zeigt, welchem Geschoss es zugeordnet ist und woher die Zuordnung stammt. Nachrichtliche Blätter mit dem Zusatz, warum sie nicht massgeblich sind |
| **Kapitel 3, Fließtext** | jeder aufgelöste Widerspruch nach der Schablone aus 6.4 |
| **Kapitel 2, Tabelle Kenngröße/Wert/Quelle** | Geschosshöhen mit der Fundstelle im Schnitt, Außenmaße, Gebäudetyp |
| **Kapitel 9 Plausibilitätsprüfungen** | die Prüfzeilen aus 7.5 und 9.4, in derselben Spaltenform wie im Referenzbericht: Prüfung, Ergebnis, Sollwert, Quelle des Sollwerts, Status |
| **Kapitel 10 Annahmenliste** | jede Zuordnung ohne Beleg der Stufe 1 (C), jede Höhe ohne Schnitt (C), jedes Bauteil aus der Überlagerung (C), jede Vertretung eines Geschosses (C) |
| **Selbstprüfung** | offene Fragen des Kontrollblatts, aufgehobene Sperren mit ihrer Begründung |

---

## 12 Selbsttests

Im Muster der bestehenden Kerne: `KERN_STAPEL.selbsttest()` läuft beim Start, der Build bricht
bei einem Fehlschlag ab.

| Nr. | Prüfung |
|---|---|
| 1 | Signatur eines künstlichen Grundrisses gegen dieselbe Zeichnung in halber Auflösung: als Dublette erkannt |
| 2 | Dieselbe Zeichnung mit vertauschten Raumnamen: **nicht** als Dublette, sondern als Widerspruch |
| 3 | Zwei Zeichnungen mit gleichem Wandraster und verschiedenen Raumnamen (EG/OG-Fall): keine Dublette |
| 4 | Zeichnung um 90 Grad gedreht: als Dublette erkannt |
| 5 | Güte: scharfer Scan schlägt verrauschtes Foto gleicher Pixelzahl |
| 6 | Güte: knapp beschnittener Scan schlägt Foto mit breitem Rand |
| 7 | Zuordnung: Blattkopf „Obergeschoss" schlägt Dateiname „eg.pdf" |
| 8 | Zuordnung: Dateiname allein reicht nicht für eine automatische Zuordnung |
| 9 | „Floor 1" bis „Floor 3" ohne Anker erzeugt genau eine Frage, nicht drei |
| 10 | „Floor 1" mit einem Blatt mit ±0,00 im Satz erzeugt keine Frage |
| 11 | Treppentest: drei Blätter auf/auf-ab/ab ergeben vollständig |
| 12 | Treppentest: fehlendes „nur_auf" meldet fehlendes unterstes Geschoss |
| 13 | Summenprobe: Kette 3,00 + 3,00 gegen Summe 6,00 besteht; 3,00 + 2,60 gegen 6,00 besteht nicht |
| 14 | Plausibilitätsband: 5,80 m Geschosshöhe wird nicht übernommen |
| 15 | Überlagerung: um 12 m² zurückspringendes Obergeschoss erzeugt genau einen Bauteilvorschlag mit 12 m² |
| 16 | Überlagerung: Bauteilvorschlag wird **nicht** ohne Bestätigung ins Raumbuch geschrieben |
| 17 | Vollständigkeit: Schnitt mit drei Feldern und zwei Grundrissen erzeugt eine Sperre |
| 18 | Budget: bei überschrittener Grenze wird Stufe 2 nicht gestartet und die fehlenden Blätter werden benannt |
| 19 | Ein Blatt mit `mehrere_geschosse` erzeugt so viele `abbildungen` wie Ausschnitte |
| 20 | Kein Konflikt der Schwere „sperre" lässt sich ohne Begründungstext auflösen |

Dazu ein **Stapeltest gegen die Wirklichkeit**: die fünf Blätter aus
`heizlast_maelzerstr59/quellen/` in zufälliger Reihenfolge, mit drei fremden Dateien gemischt,
müssen ergeben: vier Geschosse (KG, EG, OG, DG), ein Schnitt, ein Widerspruch im Dachgeschoss,
drei ausgeschlossene Blätter, Geschosshöhe 3,00 m mit lichter Höhe 2,75 m aus dem Schnitt. Das
ist der Abnahmetest der ganzen Stufe.

---

## 13 Offene Punkte

| Nr. | Punkt | Warum offen |
|---|---|---|
| O1 | **Alle Schwellen sind Startwerte.** D1, D2, D3, IoU-Bänder, Punktegewichte, Güteanteile | Es gibt noch keine Messreihe. Vor der Freigabe gegen den Referenzstapel und mindestens fünf echte Planpakete kalibrieren, wie es `kern_planpruefung.js` vormacht |
| O2 | **Zeitangaben der Sichtung sind gerechnet, nicht gemessen** | 4 s je Blatt ist aus dem gemessenen Vollaufruf (20–25 s) heruntergerechnet. Einmal messen, bevor die Nebenläufigkeit festgezurrt wird |
| O3 | **Schriftfeld unten rechts** ist als Konvention angenommen | Für den Zusatzausschnitt bei großen Scans. Trifft es nicht zu, greifen die Belege der Stufe 2 — kein Schaden, nur eine Rückfrage mehr |
| O4 | **Zwei Zustände in einer Rechnung** (Bestand und Planung nebeneinander) | Der Kern führt einen Zustand. Der Referenzbericht löst das über Varianten V0 bis V11. Ob der Stapel zwei vollständige Geschossmodelle tragen soll, ist eine Entscheidung für später |
| O5 | **Außenkontur aus dem Rasterbild** | Hängt an `kern_grundriss.js`. Bis dahin läuft nur die grobe Überlagerung; die metrische Prüfung und die Bauteilvorschläge brauchen die Polygone des Bearbeiters |
| O6 | **Perspektivisch verzerrte Planfotos** | Von der Eignungsprüfung nicht erfasst (dort O4). Ein solches Foto kann die Güte gewinnen und trotzdem falsche Geometrie liefern. Bis das gemessen ist, sollte „Foto" in der Güte nicht über 0,4 kommen |
| O7 | **Schwärzung gegen Blattkopf** | Abwägung in 3.6, entschieden werden muss sie von Sebastian, zusammen mit der Frage des Auftragsverarbeitungsvertrags aus `BAUPLAN.md` 5.1 |
| O8 | **Nichtwohngebäude** | Treppentest, Höhenband und Farbkonvention sind an Wohngebäuden gedacht. Bei Hallen, Schulen und Pflegeheimen sind Geschosshöhen und Treppenanordnung anders; vor einer Nutzung dort gegenprüfen |

---

## 14 Quellen und Bezüge

| Nr. | Quelle |
|---|---|
| S1 | `SPEZIFIKATION_FORMATE.md`, Abschnitte 5.4 (Lesbarkeit gemessen), 5.5 (Kachelvorschrift, Kosten), 6.1 (Seitentyp aus pdf.js), 6.2 (eine einzige Rückfrage), 6.3 (Kostenrahmen ab sechs Planseiten) |
| S2 | `SPEZIFIKATION_BERICHT.md`, Abschnitt 10.1 bis 10.3 (Konfidenzklassen A/B/C und ihre Vergaberegeln), Kapitel 3 (Planunterlagen), Kapitel 9 (Plausibilitätsprüfungen) |
| S3 | `src/kerne/kern_planpruefung.js` (Otsu-Kontrast, Laplace-Schärfe, Schräglage, Schwellenblock `S`, Muster für `selbsttest()`) |
| S4 | `api/netlify/functions/plan-auslesen.mjs` (Streaming gegen den Abbruch der Funktion, Schutz des Zugangscodes, Schema mit Konfidenz und Fundstelle, Feld `befunde` mit Herleitung) |
| S5 | `heizlast_maelzerstr59/Bericht_Heizlast_Maelzerstr59.pdf`, Kapitel 2 (Kenngrößen mit Quelle), Kapitel 3 (fünf Abbildungen, Widerspruch Dachgeschoss), Kapitel 7 (Bauteilbilanz, Grundlage der Rechnung in 8.7), Kapitel 11 (Plausibilitätsprüfungen als Muster) |
| S6 | Bildfeldregel 28×28 Bildpunkte und Tarifstufen: platform.claude.com/docs/en/build-with-claude/vision (in `SPEZIFIKATION_FORMATE.md` als Q5 geführt) |
| S7 | Preise `claude-sonnet-5`: platform.claude.com/docs/en/about-claude/models/overview (dort Q6) |
