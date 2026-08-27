# Spezifikation Planformate — PDF und was sonst hereinkommt

Untersuchung für den neuen Ablauf „Pläne hochladen, Eckdaten klären, fertiger Bericht".
Heute nimmt `src/modul_plan.js` nur Bilder an und weist PDF ausdrücklich ab (Z. 272–275).

**Alle Zahlen in diesem Dokument sind gemessen, nicht geschätzt.** Die Messungen liefen am
20.08.2026 auf dem Arbeitsgerät (11 Kerne, 16 GB, Chrome, headless und im Fenster). Wo eine
Angabe aus einer fremden Quelle stammt, steht die Fundstelle dabei. Wo eine Aussage eine
Annahme ist, steht das Wort Annahme.

Prüfstände dieser Untersuchung:

| Prüfstand | Was es ist |
|---|---|
| `plan_a3_2mm.pdf` | selbst erzeugter A3-Vektorplan 1:100 mit Maßtext in genau 2,0 / 2,5 / 3,5 mm Versalhöhe |
| `zeichnungen-1.png` | echte Bauzeichnung Mälzerstraße 59 von 1936, 2339×1653 px = A4 quer bei 200 dpi (`heizlast_maelzerstr59/quellen/`) |
| `01 Anlage 01 Lageplan und Grundstücksangaben.pdf` | echtes Planpaket BLB NRW, 4 Seiten, 4,3 MB: A1-CAD-Bestandszeichnung 1:100 mit 6.463 Pfaden, dazu eine A3-Scanseite aus 96 Kachelbildern (`~/Desktop/Claude/vergabe_blb_nrw/vertragsbedingungen/`) |
| 90 zufällige PDF | aus den echten Projektordnern, für die Erhebung der Bildkompressionen |

---

## 1 Ergebnis in fünf Zeilen

1. **pdf.js 6.2.108 von Mozilla, Apache-2.0.** Es gibt keinen ernsthaften Zweiten.
2. Es läuft **ohne Netz und ohne Worker-Datei** — nachgewiesen über `file://`. Der Trick ist,
   die Worker-Quelle einmal als Text einzubetten und daraus zur Laufzeit entweder einen echten
   Worker (über HTTPS) oder ein Hauptthread-Modul (über `file://`) zu erzeugen.
3. Die Auslieferungsdatei wächst von **714 KB auf 2.393 KB** roh, über das Netz von
   **395 KB auf 885 KB** gzip.
4. Die Auflösungsfrage hat **zwei** Engstellen, nicht eine: das Rendern und das, was die
   Schnittstelle nach ihrer eigenen Verkleinerung noch sieht. Die zweite ist die härtere.
   Lösung ist Kacheln, nicht höher rendern.
5. **Vektor-PDF lohnt sich** — Maßtexte und Wandlinien kommen millimetergenau heraus. Der
   Maßstab muss dann nicht mehr von Hand gesetzt werden.

---

## 2 Bibliothekswahl

### 2.1 Was in Frage kam

| Kandidat | Lizenz | Größe | Urteil |
|---|---|---|---|
| **pdf.js (`pdfjs-dist`)** | Apache-2.0 | 1.677 KB roh / 490 KB gzip | **gewählt**, siehe unten |
| PDFium über WASM (`@hyzyla/pdfium` u. a.) | BSD-3 / Apache-2.0 | WASM-Binärdatei mehrere MB, dazu Ladegerüst | größer, und die WASM-Datei müsste zusätzlich als Data-URI eingebettet werden |
| mupdf.js | AGPL-3.0 | zweistellige MB | Lizenz für ein Firmenwerkzeug unpassend, Größe unbrauchbar |
| `pdf-lib` | MIT | klein | kann PDF schreiben und lesen, **nicht rendern**. Scheidet aus |
| eingebauter PDF-Betrachter (`<embed>`, `<iframe>`) | — | 0 | zeigt die Seite an, gibt aber keine Bildpunkte heraus. Kein Zugriff auf Canvas-Daten. Scheidet aus |

### 2.2 pdf.js — Bezug und Kennzahlen

| | |
|---|---|
| Paket | `pdfjs-dist` |
| Version | **6.2.108** (aktuellster Stand am 20.08.2026, geprüft mit `npm view pdfjs-dist version`) |
| Lizenz | **Apache-2.0** (`npm view pdfjs-dist license`; Volltext in `package/LICENSE`, 10.174 Bytes) |
| Bezug | `npm pack pdfjs-dist@6.2.108`, alternativ die Releases unter github.com/mozilla/pdf.js (`pdfjs-6.2.108-dist.zip`) |
| Herkunft | Mozilla, mozilla.github.io/pdf.js |

Dateigrößen aus dem entpackten Paket (`build/`):

| Datei | roh | gzip -9 |
|---|---|---|
| `pdf.min.mjs` | 454.669 B = 444 KB | 126 KB |
| `pdf.worker.min.mjs` | 1.262.398 B = 1.232 KB | 363 KB |
| **Summe** | **1.677 KB** | **490 KB** |

Der ältere Zweig `legacy/build/` (für Safari 18+, Chrome 125+, Firefox ESR) ist 1.782 KB roh /
524 KB gzip, also 105 KB roh mehr. Laut pdf.js-FAQ deckt der moderne Zweig Firefox und Chrome
ab; Safari braucht den Legacy-Zweig
(github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions).
**Empfehlung: Legacy nehmen.** Der Aufpreis ist ein Rundungsfehler gegenüber dem Nutzen,
das Werkzeug auch auf einem Mac mit Safari zu haben.

Nicht mitgenommen werden `cmaps/` (1,6 MB, nur für CJK-Schriften), `standard_fonts/` (800 KB,
nur wenn ein PDF die Standard-14-Schriften ohne Einbettung nutzt) und `pdf.sandbox` (nur für
Formularskripte). Für Bauzeichnungen ist nichts davon nötig. Folge, wenn ein PDF doch eine
nicht eingebettete Standardschrift verwendet: pdf.js ersetzt sie durch eine vorhandene
Systemschrift. Die Zeichnungsgeometrie bleibt unberührt; nur die Buchstabenform kann leicht
abweichen. Für das Ablesen von Zahlen ist das ohne Belang.

---

## 3 Ohne Netz und ohne Worker-Datei — der Nachweis

### 3.1 Das Problem

Mozilla schreibt in der eigenen Anleitung ausdrücklich: *„the worker is not enabled for file://
urls, so use a server"* (mozilla.github.io/pdf.js/getting_started/). Genau das ist bei uns der
Fall: das Werkzeug soll auch als Einzeldatei per Doppelklick laufen.

### 3.2 Die Lösung

pdf.js sucht, bevor es irgendetwas nachlädt, nach einem bereits im Hauptthread liegenden
Arbeiter. In `build/pdf.mjs` Z. 16192:

```js
static get #mainThreadWorkerMessageHandler() {
  try { return globalThis.pdfjsWorker?.WorkerMessageHandler || null; } catch { return null; }
}
```

Und der Worker-Build meldet sich selbst an. Letzte Zeile von `pdf.worker.min.mjs`:

```js
globalThis.pdfjsWorker={WorkerMessageHandler};export{WorkerMessageHandler};
```

Damit reicht **eine** eingebettete Kopie der Worker-Quelle für beide Wege:

```html
<script type="text/plain" id="pdfworkerquelle">…Inhalt von pdf.worker.min.mjs…</script>
```

```js
const quelle = document.getElementById("pdfworkerquelle").textContent;
const adresse = URL.createObjectURL(new Blob([quelle], { type: "text/javascript" }));
try {
  const w = new Worker(adresse, { type: "module" });      // Weg 1: echter Worker
  await new Promise((gut, schlecht) => {
    w.onerror = (e) => schlecht(new Error(e.message || "Worker abgelehnt"));
    setTimeout(gut, 700);
  });
  pdfjsLib.GlobalWorkerOptions.workerPort = w;
} catch {
  const modul = await import(adresse);                    // Weg 2: Hauptthread
  globalThis.pdfjsWorker = modul;                         // ab v6 setzt der Build das selbst
}
```

### 3.3 Gemessen

Dieselbe Datei, einmal über `http://localhost` und einmal über `file://` (Chrome headless,
`--dump-dom`):

| | über `http://` | über `file://` |
|---|---|---|
| `globalThis.pdfjsWorker.WorkerMessageHandler` | `function` | `function` |
| echter Worker aus Blob | **ja** | **nein** (`onerror`) |
| `import(blob:…)` im Hauptthread | ja | **ja** |
| Dokument geöffnet, Text gelesen | 47 Textstücke | 47 Textstücke |
| Seite gerendert (Skala 3,53) | 4202×2971 px, 59 ms | 4202×2971 px |

Damit ist belegt: **kein Netz, keine zweite Datei, keine CDN.** Über HTTPS gibt es den echten
Worker obendrauf, über `file://` läuft alles im Hauptthread weiter.

### 3.4 Drei Fallstricke, die Zeit gekostet haben

**a) Die Exportnamen sind im minifizierten Build verkürzt.** `pdf.min.mjs` endet mit
`export{…,F as OPS,…,Ot as version}`. Ein handgeschriebenes
`globalThis.pdfjsLib={getDocument,OPS,…}` scheitert deshalb mit `OPS is not defined`.
Der Build muss die Export-Anweisung auslesen und die Brücke daraus erzeugen:

```python
m = re.search(r"export\{([^}]*)\};?\s*$", quelltext)
paare = [t.strip().split(" as ") if " as " in t else (t.strip(), t.strip())
         for t in m.group(1).split(",")]
bruecke = "globalThis.pdfjsLib={" + ",".join('"%s":%s' % (aussen, innen)
                                             for innen, aussen in paare) + "};"
```

Gemessen: 62 Exporte, davon 13 verkürzt (`OPS`, `version`, `build`, `ImageKind`,
`AnnotationType`, `VerbosityLevel` und weitere).

**b) `render()` benutzt `requestAnimationFrame`.** In `build/pdf.mjs` Z. 15743:
`useRequestAnimationFrame: !intentPrint`. In einem verdeckten oder minimierten Fenster hält der
Browser `requestAnimationFrame` an — das Rendern bleibt dann **ohne Fehlermeldung stehen**. Für
alles, was nicht angezeigt, sondern nur weiterverarbeitet wird, gehört deshalb
`intent: "print"` in die Renderparameter. Das ist in dieser Untersuchung zweimal in eine
Sackgasse gelaufen, bevor es gefunden war.

**c) `</script` in der eingebetteten Quelle.** Geprüft: kommt in `pdf.min.mjs` und in
`pdf.worker.min.mjs` **null mal** vor. Der Build sollte trotzdem sicherheitshalber ersetzen
(`</script` → `<\/script`), weil eine spätere Version das ändern kann.

---

## 4 Auslieferungsgröße

Gemessen an der echten heutigen Datei plus den echten pdf.js-Dateien, zusammengesetzt wie oben
(Hauptbuild als Modul, Worker einmal als Text):

| | roh | gzip -9 |
|---|---|---|
| heute `WERKE_Heizlast_Tool.html` | **714 KB** | 395 KB |
| mit pdf.js 6.2.108 (moderner Zweig) | **2.393 KB** | **885 KB** |
| mit pdf.js 6.2.108 (Legacy-Zweig) | rd. 2.498 KB | rd. 919 KB |
| Zuwachs | +1.679 KB (Faktor 3,35) | +490 KB (Faktor 2,24) |

Einordnung: Netlify liefert gzip und brotli von selbst aus. Über das Netz sind es also rund
885 KB statt 395 KB, im Büronetz unter einer Sekunde. Die Einzeldatei für den Einsatz ohne
Netz wird 2,4 MB groß. Das ist per Datei-Ablage unauffällig, per Mail-Anhang grenzwertig.

**Der Weg über Nachladen wird nicht empfohlen.** Man könnte pdf.js erst bei Bedarf vom
Endpunkt holen und die Onlinefassung bei 714 KB halten. Das erzeugt aber zwei verschiedene
Auslieferungsstände aus einem `build.py` — genau die Art von Abweichung, die später niemand
mehr nachhält. Ein Werkzeug, ein Stand, 2,4 MB.

---

## 5 Auflösung: die Rechnung für A3 mit 2 mm Schrift

### 5.1 Wie klein Schrift auf Bauzeichnungen wirklich ist

Die Aufgabenstellung nennt 2 mm. Zur Einordnung:

* DIN EN ISO 3098 bemisst Schriftgrößen als **Versalhöhe**, übliche Stufen 2,5 / 3,5 / 5 / 7 mm,
  Linienbreite ein Zehntel davon (de.wikipedia.org/wiki/Normschrift). 2 mm liegt also schon
  unter der üblichen kleinsten Stufe.
* **Gemessen am echten A1-Plan des BLB NRW**: kleinste vorkommende Schriftgröße 5,15 pt, das
  sind 1,82 mm Kegel und rund **1,3 mm Versalhöhe**. Die 2 mm der Aufgabenstellung sind also
  nicht der schlimmste Fall, sondern der zweitschlimmste.

Bei einem Vektor-PDF muss man das nicht raten: `getTextContent()` liefert je Textstück
`item.height` = Schriftgröße in Punkt. Am Prüfstand `plan_a3_2mm.pdf` kamen 7,91 / 9,88 /
13,84 pt heraus; mit dem Faktor 0,717 für Helvetica ergibt die kleinste davon **2,00 mm**
Versalhöhe — exakt die eingezeichneten 2,0 mm. Die Renderskala lässt sich daraus **ausrechnen
statt schätzen**.

### 5.2 Engstelle 1 — die Renderskala

In pdf.js gilt `Bildbreite in px = Seitenbreite in pt × skala` und 1 pt = 1/72 Zoll, also

    dpi = 72 × skala
    Bildpunkte einer Versalhöhe h [mm] = h / 25,4 × dpi

| skala | dpi | 2,0 mm ergibt | 1,3 mm ergibt |
|---:|---:|---:|---:|
| 2,00 | 144 | 11,3 px | 7,4 px |
| 2,78 | 200 | 15,7 px | 10,2 px |
| **3,53** | **254** | **20,0 px** | 13,0 px |
| 4,17 | 300 | 23,6 px | 15,4 px |
| **4,94** | **356** | **28,0 px** | 18,2 px |
| 5,43 | 391 | 30,8 px | **20,0 px** |

Die Marke 28 px ist nicht willkürlich: die Schnittstelle zerlegt jedes Bild in **Bildfelder von
28×28 Bildpunkten** (siehe 5.3). Bei 28 px Versalhöhe bekommt jede Textzeile mindestens eine
eigene Feldzeile. **Skala 4,94 (356 dpi) ist damit die saubere Zielgröße für 2 mm Schrift.**

Kosten des Renderns, gemessen an A3 quer (1190,6 × 841,9 pt):

| Prüfstand | skala 3,53 (254 dpi) | skala 4,94 (356 dpi) | skala 8,00 (576 dpi) |
|---|---|---|---|
| Vektorplan | 4203×2972 px, 12,5 MP, **2–5 ms** | 5881×4159 px, 24,5 MP, **4–7 ms** | 9524×6735 px, 64,1 MP, 4 ms |
| Scan JPEG | 43 ms | 41 ms | 28 ms |
| Scan bilevel 300 dpi | 108 ms | 109 ms | 138 ms |

Das Rendern ist also **nicht** der Engpass. Bis 144 MP (skala 12) blieb die Zeit unter 10 ms;
erst bei 256,6 MP stieg sie auf rund 550 ms. Der Speicher ist die eigentliche Grenze: 24,5 MP
sind 98 MB RGBA, 64 MP sind 256 MB.

**Obergrenze bei Scans.** Höher rendern als der Scan aufgelöst ist, bringt nichts. Die native
Auflösung steht in der Operatorliste: `OPS.paintImageXObject` führt die Argumente
`[Objektname, Breite_px, Höhe_px]`, und aus der mitgeführten Transformationsmatrix kommt die
gezeichnete Breite in Punkt. Am echten BLB-Planpaket geprüft:

| Seite | Bildaufrufe | Megapixel | über die Matrix | über die Flächenwurzel |
|---|---|---|---|---|
| S2, A4 hoch | 6 | 5,6 | **300 dpi** | 240 dpi |
| S4, A3 quer | 96 | 13,6 | **300 dpi** | 265 dpi |

Der Weg über die Matrix trifft die echten 300 dpi genau, die grobe Flächenwurzel nicht.
Regel für den Bau: `skala = min(skala_ziel, dpi_nativ / 72)`.

### 5.3 Engstelle 2 — was die Schnittstelle nach ihrer Verkleinerung noch sieht

Das ist die Engstelle, an der die naive Lösung scheitert. Aus der Anthropic-Dokumentation
(platform.claude.com/docs/en/build-with-claude/vision, Abschnitt „Resolution and token cost"):

> Each patch is a 28×28-pixel block of the image […] An image, therefore, costs
> `⌈width / 28⌉ × ⌈height / 28⌉` visual tokens.

| Stufe | Modelle | längste Kante | Bildtoken |
|---|---|---|---|
| Standard | alle übrigen | 1568 px | 1568 |
| Hochauflösend | „Claude 4.7 and later", also auch `claude-sonnet-5` | **2576 px** | **4784** |

Was darüber liegt, **verkleinert die Schnittstelle selbst**, unter Erhalt des Seitenverhältnisses.
Für ein A3-Blatt heißt das:

| Was gesendet wird | kommt an als | Bildtoken | Auflösung | 2,0 mm sind dann |
|---|---|---|---|---|
| ganzes A3, Standardstufe | 1305×923 | 1551 | 3,11 px/mm ≙ 79 dpi | **6,2 px** |
| ganzes A3, hochauflösend | 2275×1609 | 4756 | 5,42 px/mm ≙ 138 dpi | **10,8 px** |
| Viertel A3, hochauflösend | 2275×1609 | 4756 | 10,83 px/mm ≙ 275 dpi | **21,7 px** |
| Neuntel A3, hochauflösend | 1961×1387 | 3550 | 14,01 px/mm ≙ 356 dpi | **28,0 px** |

**Ein A3 als Ganzes zu senden, verschenkt also den halben Renderaufwand.** Egal ob mit
skala 4,94 oder mit skala 2,00 gerendert wird — beim Modell kommen dieselben 138 dpi an.

### 5.4 Nachgeprüft am Auge, nicht nur an der Rechnung

Die oben erzeugten Bilder wurden gelesen, um die Rechnung nicht nur zu glauben.

| Bild | Ergebnis |
|---|---|
| A3-Prüfplan, ganze Seite, hochauflösend (10,8 px je 2 mm) | Raumstempel, Flächen und alle Maßzahlen lesbar. Der Prüfplan ist aber sauber und leer — nicht repräsentativ |
| echte Zeichnung von 1936, ganze A4-Seite (4,39 px/mm) | die großen Ketten „4,80" „3,70" „8,50" „4,20" lesbar; die kleinen Werte an den Wänden nicht sicher |
| dieselbe Zeichnung, Viertelausschnitt (7,88 px/mm) | zusätzlich „25", „30", „80" und die Fensterbrüche „2,00/1,25" lesbar |
| echter A1-CAD-Plan, ganze Seite (2293×1619) | „35.38", „5.34", „4.74", „4.26", „3.48", „12.26" lesbar; „.18", „.85", „2.29", „.98", „.44" **nicht** |
| derselbe Plan, Kachel 1932×1932 bei 254 dpi | **alles** lesbar, bis hin zu „UK First 4,43 m" und dem Raumstempel „Masch. R. Aufzug A=3,42m² U=7,70m" |

Der letzte Fall ist der belastbare Beleg: Raumname, Fläche **und Umfang** stehen im
Raumstempel und kommen an — genau die Größen, die das Kontrollblatt braucht.

### 5.5 Die Kachelvorschrift

Nutzbares Quadrat auf der hochauflösenden Stufe: **1932×1932 px** (69×69 Bildfelder = 4.761 Bildtoken,
knapp unter 4.784). Alternativ liegend 2576×1288 (92×46 = 4.232).

    abgedeckte Blattbreite [mm] = 1932 / (dpi / 25,4)

| Rendern mit | abgedeckt je Kachel | A3 quer braucht | A1 quer braucht |
|---|---|---|---|
| 254 dpi | 193 mm | 3 × 2 = **6 Kacheln** | 5 × 4 = **20 Kacheln** |
| 356 dpi | 138 mm | 4 × 3 = **12 Kacheln** | 7 × 5 = 35 Kacheln |

Überlappung von rund 120 px (12 mm bei 254 dpi) verhindert, dass eine Maßzahl genau auf einer
Kachelgrenze zerschnitten wird.

Kacheln erzeugt man **nicht** durch Zuschneiden eines Riesen-Canvas, sondern direkt beim
Rendern mit versetztem Ursprung — dann wird nie mehr als eine Kachel Speicher gebraucht:

```js
const sicht = seite.getViewport({ scale: dpi / 72 });
await seite.render({
  canvasContext: ctx, viewport: sicht, intent: "print",
  transform: [1, 0, 0, 1, -versatzX, -versatzY]
}).promise;
```

Gemessen am echten A1-Plan (6.463 Pfade, 10.443 Operatoren), gesamter Durchlauf im Hauptthread,
ohne echten Worker:

| | |
|---|---|
| Raster | 5 × 4 = 20 Kacheln à 1932 px, 120 px Überlappung |
| Zeit je Kachel | 266 bis 561 ms, im Mittel 355 ms |
| **Gesamtzeit** inkl. Laden der 4,3-MB-Datei und JPEG-Erzeugung | **7,1 s** |
| JPEG-Menge (Güte 0,85) | 1.572 KB |
| Bildtoken | 20 × 4.761 = 95.220 |
| **Kosten** bei `claude-sonnet-5`, 2 USD je Mio. Eingabetoken | **0,19 USD** |

Ein A3-Blatt mit 6 Kacheln liegt entsprechend bei rund 2,5 s, 28.566 Token und **0,06 USD**.
Selbst eine doppelte Auslese zur Gegenprüfung und ein Übersichtsdurchlauf über die ganze Seite
bleiben damit weit unter den 2 Euro. Der Preis von 2 USD je Mio. Eingabetoken für
`claude-sonnet-5` steht in der Modellübersicht (platform.claude.com/docs/en/about-claude/models/overview).

Für die Serverlosigkeit: **eine Kachel je Aufruf.** Jeder Aufruf trägt dann ein Bild von rund
80 KB und bleibt sicher unter der halben Minute. Die Reihenfolge orchestriert der Browser, die
Aufrufe laufen nebeneinander.

### 5.6 Empfohlene Abfolge

1. Seite bei **skala 0,25** rendern → Vorschau und Seitenerkennung, praktisch kostenlos.
2. Seitentyp bestimmen (Abschnitt 6).
3. Zielskala festlegen: bei Vektor-PDF aus der kleinsten Schriftgröße, bei Scan aus der nativen
   Auflösung, in beiden Fällen gedeckelt auf 356 dpi.
4. **Durchlauf A, ganze Seite** in einem Bild → Raumaufteilung, Geschoss, Blattkopf, Maßstab.
   Kostet 4.756 Token.
5. **Durchlauf B, Kachel für Kachel** → Maßzahlen, Raumstempel, Flächen. Jede Kachel ein Aufruf.
6. Ergebnisse zusammenführen. Widersprüche zwischen A und B kommen als „unsicher" ins
   Kontrollblatt.

---

## 6 Mehrseitige PDF mit Grundrissen und Schnitt

Der Regelfall, nicht die Ausnahme. Das echte BLB-Paket hat auf vier Seiten drei verschiedene
Blattgrößen, zwei Seitendrehungen, einen Vektorplan, zwei Scans und eine Textseite.

### 6.1 Seiten lassen sich automatisch einordnen

Aus `getTextContent()`, `getOperatorList()` und `getViewport()` fällt die Einordnung ohne
Modellaufruf ab. Am gemischten Prüfstand `paket.pdf` gemessen:

| Seite | Maß | Drehung | Textstücke | Bilder | Pfade | erkannt als |
|---|---|---|---|---|---|---|
| 1 | 420×297 mm | 0 | 47 | 0 | 12 | **Vektorplan** |
| 2 | 420×297 mm | 90 | 0 | 1 | 0 | **Scan** |
| 3 | 210×297 mm | 0 | 3 | 0 | 0 | **Textseite** |
| 4 | 420×297 mm | 0 | 0 | 1 | 0 | **Scan** |

Regel: viele Pfade und Text → Vektorplan. Bilder ohne Text → Scan. Text ohne Pfade und ohne
Bilder → Beschreibung, kein Plan.

**Die Drehung erledigt pdf.js selbst.** Seite 2 trägt `/Rotate 90`; `getViewport()` meldet
trotzdem 420×297 mm, also die sichtbare Lage. Es muss nichts nachgedreht werden.

### 6.2 Was das Werkzeug daraus machen soll

* Nach dem Hochladen **eine Seitenübersicht** aus den 0,25er-Vorschauen, je Seite mit
  erkanntem Typ, Blattmaß und einem Vorschlag: Grundriss EG / OG / DG, Schnitt, Lageplan,
  nicht verwenden. Grundlage für den Vorschlag sind der Blattkopf-Text (`getTextContent()`
  findet „Grundriss Dachgeschoss", „Blatt 1 von 3", „M 1:100" ohne Modellaufruf) und die
  Seitenreihenfolge.
* Der Bearbeiter bestätigt oder ändert die Zuordnung. **Das ist die einzige Stelle, an der
  eine Rückfrage nötig ist** — der Rest kommt aus dem Dokument.
* Textseiten wandern nicht in die Bildauslese, sondern als reiner Text in den Fragebogen:
  „Außenwand 36,5 cm Vollziegel, Baujahr 1936" ist eine Bauteilangabe mit Beleg und gehört in
  die Bauteilliste, nicht ins Raumbuch.
* Schnitte liefern die lichten Raumhöhen und die Geschossanzahl. Sie werden mitgelesen, aber
  nicht umfahren.

### 6.3 Grenzen

Ein Planpaket mit 30 Seiten à 20 Kacheln wäre 600 Aufrufe. Deshalb: **nur die vom Bearbeiter
bestätigten Planseiten werden gekachelt.** Alles andere bleibt bei der 0,25er-Vorschau. Bei
mehr als, Annahme, 6 bestätigten Planseiten sollte das Werkzeug den Kostenrahmen anzeigen,
bevor es losläuft.

---

## 7 Vektor-PDF — Linien und Text direkt auslesen

### 7.1 Was herauskommt

**Text mit Lage.** `getTextContent()` gibt je Stück den String, die Transformationsmatrix
(Positionen in PDF-Punkten) und die Schriftgröße. Am Prüfstand:

```
'5,00 [2.0 mm]'   x=198,4 pt  y=411,0 pt   Schriftgröße 8,10 pt = 2,86 mm Kegel
'M 1:100'         x= 56,7 pt  y=785,2 pt   Schriftgröße 20,25 pt
```

Am echten A1-Plan des BLB kamen die Maßzahlen als Text heraus: `35.38`, `12.26`, `5.34`,
`2.29`, `.85`, `4.74`, `.24`, `4.26`, `3.12`, `3.48` — 165 Textstücke insgesamt.

**Geometrie.** `getOperatorList()` liefert unter `OPS.constructPath` die Pfade als
`[Pfadart, [Unterpfad], Umgrenzung]`, wobei der Unterpfad eine flache Zahlenreihe mit
Befehlscodes ist (0 = hinbewegen, 1 = Linie, 4 = schließen):

```
arg1 = [[0, 198.4, 367.4,  1, 552.5, 367.4,  1, 552.5, 615.1,  1, 198.4, 615.1,  4, 4]]
arg2 = [198.4, 367.4, 552.5, 615.1]     // Umgrenzung
```

**Gegengerechnet:** 552,5 − 198,4 = 354,1 pt = **124,9 mm**, und 615,1 − 367,4 = 247,7 pt =
**87,4 mm**. Gezeichnet war ein Außenmaß von 12,49 × 8,74 m im Maßstab 1:100, also
124,9 × 87,4 mm. **Die Abweichung ist null.**

### 7.2 Was das wert ist

Heute muss der Bearbeiter im Planmodul den Maßstab an einer Maßkette setzen und danach jeden
Raum von Hand umfahren. Beim Vektor-PDF entfällt beides:

1. Der Maßstab kommt aus einer Maßzahl und der zugehörigen Linie. Beispiel: Textstück „12,49"
   sitzt mittig unter einer Linie von 354,1 pt Länge. 354,1 pt = 124,9 mm; 12,49 m / 124,9 mm =
   **1:100**. Zwei unabhängige Maßzahlen genügen für eine Gegenprobe — und das ist eine echte
   Prüfung, keine Bestätigung derselben Rechnung, weil sie über verschiedene Linien läuft.
2. Wandlinien sind exakte Strecken. Rechteckige Räume lassen sich daraus geschlossen ableiten.
3. Flächen und Umfänge müssen dann nicht mehr aus einem Polygon von Hand geschätzt werden —
   sie sind gerechnet. Das schlägt direkt auf die Selbstprüfung durch: der heutige Befund
   „Abgleich der eingetragenen Fläche mit der im Plan umfahrenen" wird zur Identität.

### 7.3 Lohnt sich der Aufwand — ja, aber gestuft

**Stufe 1, klein und sofort nützlich: nur den Text nehmen.** Alle Maßzahlen, Raumnamen,
Flächenangaben und der Maßstabsvermerk kommen mit ihrer Lage aus `getTextContent()`. Das ist
eine Handvoll Code, kostet keinen Modellaufruf, ist exakt und liefert eine unabhängige
Gegenprobe zu dem, was das Modell aus dem Bild liest. **Diese Stufe ist ohne Wenn und Aber
zu empfehlen.**

**Stufe 2, mittel: Maßstab automatisch bestimmen.** Maßzahl-Text mit der nächstgelegenen
parallelen Linie paaren, Verhältnis bilden, über mehrere Paare abgleichen. Aufwand
überschaubar, Nutzen hoch, weil der heutige Handgriff „Maßstab setzen" die häufigste
Fehlerquelle beim Umfahren ist.

**Stufe 3, groß: Raumpolygone aus der Linienmenge ableiten.** Hier wird es ein echtes
Geometrieproblem — Wandachsen aus Doppellinien, Öffnungen, Türschwenke, Schraffuren. Der echte
A1-Plan hat **6.463 Pfade mit 18.418 Segmenten**. Das ist kein Nebenbei-Projekt. **Empfehlung:
zurückstellen.** Stufe 1 und 2 holen den größten Teil des Nutzens.

### 7.4 Was in der Praxis dagegen sprechen kann

* Manche CAD-Ausgaben wandeln Schrift in Kurven um. Dann gibt es keinen Textlayer, und man ist
  wieder beim Bild. Erkennbar an: viele Pfade, null Textstücke.
* Ebenen (Optional Content Groups) sind über `getOptionalContentConfig()` schaltbar. Damit
  ließen sich Möblierung und Schraffur ausblenden, bevor gerendert wird — das erhöht die
  Lesbarkeit spürbar. Nicht gemessen, weil kein Prüfstand mit Ebenen vorlag. **Offener Punkt.**
* Ein Vektor-PDF kann trotzdem ein eingescanntes Bild enthalten (Lageplan-Ausschnitt im
  Vektorblatt). Die Einordnung aus 6.1 muss das aushalten: Text **und** Pfade **und** Bild ist
  ein Mischblatt und wird wie ein Vektorplan behandelt, aber zusätzlich gekachelt.

---

## 8 Weitere Formate

### 8.1 Was in echten Projektordnern vorkommt

Erhebung über 90 zufällig gezogene PDF aus den Projektordnern, ausgewertet wurde der
`/Filter`-Eintrag jedes Bildobjekts:

| Kompression | Anzahl |
|---|---|
| `/DCTDecode` (JPEG) | 1.251 |
| `/FlateDecode` | 262 |
| `/CCITTFaxDecode` (Fax-Gruppe 4) | 26 |
| `[/ASCII85Decode /FlateDecode]` | 2 |
| `/JBIG2Decode` | **0** |
| `/JPXDecode` (JPEG 2000) | **0** |

Das ist wichtig, weil pdf.js seit Version 5 die Decoder für JBIG2, JPEG 2000 und die
Farbverwaltung **ausgelagert** hat: sie werden zur Laufzeit von `wasmUrl` nachgeladen
(`build/pdf.worker.mjs`, Klasse `WasmImage`, Z. 9688 ff.). Ohne gesetztes `wasmUrl` scheitert
das Dekodieren still. Für JPEG, Flate und CCITT — also für 100 % der hier gefundenen Bilder —
ist **kein** Nachladen nötig.

Umgang damit:

* `wasmUrl` in der Onlinefassung auf den Endpunkt zeigen lassen; die sechs Dateien aus
  `pdfjs-dist/wasm/` wandern ins Deploy-Zip (zusammen rund 1,0 MB, werden nur im Bedarfsfall
  geholt).
* In der Einzeldatei ohne Netz greift die bestehende Eignungsprüfung: eine Seite, deren
  einziges Bild nicht dekodiert wurde, ist leer und fällt unter „Bildinhalt unter 0,4 Prozent
  Zeichnungsanteil". Die Meldung muss nur um den Hinweis ergänzt werden, dass das PDF eine
  ungewöhnliche Bildkompression verwendet und neu ausgegeben werden sollte.
* Alternative, falls das stört: **pdfjs-dist 4.10.38** hat alle Decoder eingebaut — die
  OpenJPEG-WASM steckt dort als Data-URI im Worker (geprüft: eine Zeichenkette mit 347.764
  Zeichen, `tryParseAsDataURI`). Preis: ein Stand von Anfang 2025 und ein selbst gesetztes
  `globalThis.pdfjsWorker`, weil der v4-Worker sich noch nicht selbst anmeldet. **Nicht
  empfohlen**, solange kein echtes JBIG2-PDF auftaucht.

### 8.2 DWG

* DWG ist Autodesks geschlossenes Binärformat. Wer es sauber lesen will, braucht die
  Bibliotheken der Open Design Alliance — kostenpflichtige Mitgliedschaft.
* Frei ist **GNU LibreDWG**, aber unter **GPL-3.0** (en.wikipedia.org/wiki/LibreDWG). Es gibt
  WASM-Übersetzungen davon (`@mlightcad/libredwg-web`).
* **Empfehlung: nicht einbauen.** Zwei Gründe, und der erste wiegt schwerer:
  1. **Lizenz.** GPL-3.0 in einer Einzeldatei, die an Kunden und Kollegen weitergegeben wird,
     zieht Copyleft-Pflichten auf das Werkzeug nach sich. Das ist eine Frage für die
     Geschäftsführung, nicht für den Build.
  2. Größe. Eine weitere WASM-Bibliothek neben pdf.js sprengt die Einzeldatei.
* Stattdessen: klare Meldung. „DWG kann das Werkzeug nicht lesen. Bitte im CAD als PDF
  ausgeben (Blattgröße und Maßstab beibehalten) oder als DXF speichern." Das ist im Büroalltag
  ein Zweiminutenschritt beim Planverfasser und liefert obendrein ein besseres Ergebnis als
  jede DWG-Auswertung, weil das PDF genau das Blatt zeigt, das gemeint ist.

### 8.3 DXF

* `dxf-parser` **1.1.2**, **MIT**, reines JavaScript, rund 70 KB Quellen im `dist/`. Läuft im
  Browser. Ebenfalls verfügbar: `dxf` 5.3.1, MIT.
* Technisch also machbar und lizenzrechtlich unproblematisch. **Aber**: DXF liefert
  Modellraum-Koordinaten in Zeichnungseinheiten, keine Blattdarstellung. Was im Layout
  sichtbar ist, welche Ebenen an sind, welcher Maßstab gilt — all das steckt in den
  Layout- und Viewport-Angaben und ist deutlich mühsamer als beim PDF.
* **Empfehlung: erst in einer späteren Stufe, und nur, wenn es tatsächlich nachgefragt wird.**
  Bis dahin dieselbe Meldung wie bei DWG.

### 8.4 Bilder

| Format | Lage |
|---|---|
| JPEG, PNG, WebP, GIF | laufen heute schon, und die Schnittstelle nimmt genau diese vier an |
| **TIFF** | Kommt real vor: Bürokopierer legen mehrseitige Scans gern als `.tif` ab. **Kein Browser dekodiert TIFF von sich aus.** Abhilfe wäre `utif` 3.1.0 (MIT, 64 KB entpackt) oder `utif2` 4.1.0 (MIT, 105 KB). Günstiges Verhältnis von Aufwand zu Nutzen, weil TIFF auch das mehrseitige Problem aus Abschnitt 6 mitbringt |
| **HEIC/HEIF** | Das Format der iPhone-Kamera. Nur Safari zeigt es an; Chrome, Edge und Firefox nicht, und das bleibt so (caniuse.com/heif). Umwandeln im Browser ginge über `libheif-js`, aber das steht unter **LGPL-3.0**. **Empfehlung: nicht einbauen**, stattdessen die Meldung „Bitte in den iPhone-Einstellungen unter Kamera → Formate auf ‚Maximale Kompatibilität' stellen oder das Bild vorher als JPEG sichern." |
| **Fotos von Plänen** | Der häufigste Problemfall und kein Formatproblem, sondern ein Aufnahmeproblem: Perspektive, Wölbung, Schatten, Reflexe. Die bestehende Eignungsprüfung fängt Unschärfe, Kontrast und Schräglage bereits ab, misst aber **keine perspektivische Verzerrung**. Ein Foto mit trapezförmigem Blatt liefert Flächen, die in einer Ecke um zweistellige Prozente danebenliegen. **Offener Punkt:** entweder eine Eckenerkennung mit Entzerrung ergänzen oder Fotos von Plänen ausdrücklich sperren und nur für Detailaufnahmen (Heizkörper, Fensterrahmen, Kellerwand) zulassen |

---

## 9 Empfehlung

**Einbauen: pdf.js 6.2.108, Legacy-Zweig, vollständig eingebettet, eine Kopie der
Worker-Quelle als `text/plain`.** Der Aufpreis von 1,7 MB roh und 0,5 MB gzip ist die
Eintrittskarte dafür, dass der Kunde tatsächlich das hochladen kann, was er hat.

Reihenfolge der Umsetzung:

1. **PDF annehmen und rastern.** Ersetzt die Absage in `modul_plan.js` Z. 272–275. Seitenwahl
   über eine Vorschauleiste, Rendern mit `intent: "print"`, Skala aus 5.2, Kacheln nach 5.5.
   Damit ist der Auftrag „Pläne in irgendeinem Format" für den weit überwiegenden Teil erfüllt.
2. **Seitentypen und Blattkopf automatisch lesen** (Abschnitt 6.1). Kostet nichts und füllt das
   Kontrollblatt mit belegten Angaben statt mit Rückfragen.
3. **Textlayer bei Vektor-PDF auswerten** (Stufe 1 aus 7.3). Exakte Maßzahlen als unabhängige
   Gegenprobe zur Bildauslese.
4. **Maßstab automatisch bestimmen** (Stufe 2 aus 7.3).
5. TIFF über `utif`, falls es aus dem Team gemeldet wird.
6. Zurückgestellt: Raumpolygone aus Vektorgeometrie, DXF, DWG, HEIC.

Klartext-Meldungen statt stiller Fehlschläge für: DWG, DXF, HEIC, passwortgeschützte PDF,
PDF ohne dekodierbares Bild.

---

## 10 Offene Punkte

| Nr. | Punkt | Warum offen |
|---|---|---|
| O1 | Verhält sich Safari 18 mit dem Legacy-Zweig genauso? | Nur Chrome wurde gemessen. Vor dem Ausrollen an einem Mac gegenprüfen |
| O2 | Ebenen (Optional Content Groups) ausblenden | Kein Prüfstand mit Ebenen vorhanden. Nutzen vermutlich hoch, Aufwand gering |
| O3 | Gehört `claude-sonnet-5` sicher zur hochauflösenden Stufe? | Die Dokumentation sagt „Claude 4.7 and later". Sonnet 5 ist später, aber das sollte einmal an einem echten Aufruf gegengeprüft werden, weil die ganze Kachelrechnung daran hängt |
| O4 | Perspektivische Verzerrung bei Planfotos | Von der heutigen Eignungsprüfung nicht erfasst, siehe 8.4 |
| O5 | Speicherobergrenze für Canvas auf schwächeren Geräten | Gemessen auf 16 GB. Auf einem 8-GB-Notebook ist bei 24,5 MP je Canvas Vorsicht geboten; das Kachelrendern aus 5.5 umgeht das, muss aber konsequent verwendet werden |
| O6 | Rückgabegrenze der serverlosen Funktion | Je Aufruf eine Kachel à rund 80 KB Base64. Nicht gegen die Netlify-Grenze für Anfragegrößen geprüft |

---

## 11 Quellen

| Nr. | Quelle |
|---|---|
| Q1 | `pdfjs-dist` 6.2.108, Apache-2.0, `npm pack pdfjs-dist@6.2.108`; Projektseite mozilla.github.io/pdf.js |
| Q2 | pdf.js Getting Started, Aussage zum Worker unter `file://`: mozilla.github.io/pdf.js/getting_started/ |
| Q3 | pdf.js FAQ, unterstützte Browser für den modernen und den Legacy-Zweig: github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions |
| Q4 | Quelltext `pdfjs-dist/build/pdf.mjs` Z. 16192 (`globalThis.pdfjsWorker`), Z. 15743 (`useRequestAnimationFrame`); `build/pdf.worker.mjs` Z. 9688 ff. (`WasmImage`) |
| Q5 | Bildverarbeitung, Bildfelder von 28×28 Bildpunkten, Tarifstufen 1568/2576 px und 1568/4784 Token: platform.claude.com/docs/en/build-with-claude/vision |
| Q6 | Preis `claude-sonnet-5` 2 USD je Mio. Eingabetoken: platform.claude.com/docs/en/about-claude/models/overview |
| Q7 | Normschrift, Schriftgröße als Versalhöhe, Stufen 2,5/3,5/5/7 mm: de.wikipedia.org/wiki/Normschrift |
| Q8 | LibreDWG unter GPL-3.0: en.wikipedia.org/wiki/LibreDWG |
| Q9 | HEIC in Browsern: caniuse.com/heif |
| Q10 | `dxf-parser` 1.1.2 MIT, `dxf` 5.3.1 MIT, `utif` 3.1.0 MIT, `utif2` 4.1.0 MIT, `libheif-js` 1.19.8 LGPL-3.0 — jeweils `npm view <paket> version license` |
| Q11 | Eigene Messungen 20.08.2026, Prüfstände siehe Kopf dieses Dokuments |
