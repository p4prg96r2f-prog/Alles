# WERK.E Heizlast-Tool — Bauplan

Stand 20.08.2026. Ziel laut Sebastian: **jeder Kollege** soll raumweise
Heizlastberechnungen nach DIN EN 12831-1 durchführen können, dialoggeführt, mit
Plan-Upload und KI-Auslese. Das Tool ersetzt Hottgenroth TGA Heizlast bei
EFH/ZFH/MFH-Standardfällen; Hottgenroth bleibt für Sonderfälle und als Referenz.

## 1. Was schon existiert

| Baustein | Wo | Zustand |
|---|---|---|
| Raumweiser Norm-Rechenkern | `heizlast_maelzerstr59/modell.py` + `stammdaten.py` | Vollständig, aber auf ein Objekt hartcodiert |
| Überschlägiger Kern (TABULA) | `werke_konzept_tool/src/kerne/kern_heizlast.js` | Fertig, ausdrücklich KEIN Norm-Ersatz |
| Rollout-Muster Einzeldatei | `lueftungskonzept_tool/` | Erprobt: Rechenkern + Selbsttests + PDF/Word + Standortwahl |
| Referenzergebnisse | Hottgenroth-Projekte FES 49, Mälzerstr. 59 | Für Validierung nutzbar |

Der Rechenkern ist also der kleinste Teil der Arbeit. Physik steht:
Φ_T = Σ A·(U+ΔU_WB)·f_k·(θint−θe), Φ_V = 0,34·V̇·(θint−θe),
V̇ = max(n_min·V ; 2·V·n50·e·ε), stationäre Bilanz für unbeheizte Bereiche.

## 2. Architektur

Eine eigenständige HTML-Datei im SharePoint, wie beim Lüftungstool. Nur der
Auslese-Schritt ruft einen schlanken Endpunkt auf, der den API-Key hält.

```
WERKE_Heizlast_Tool.html   (Doppelklick, kein Login, kein Serverbetrieb)
  │
  ├── Plan hochladen (PDF-Seite oder Bild) ─────────────────┐
  │                                                          │
  │   [Knopf "Plan auslesen"] ──► Netlify Function ──► Claude API (Vision)
  │                                (hält den Key)      claude-opus-5
  │        ◄── Raumbuch-Vorschlag als JSON, je Feld mit Konfidenz
  │            und Bildkoordinate der Fundstelle
  │
  ├── Maßstab setzen: 2 Klicks auf eine bekannte Maßkette   ◄── IMMER manuell
  ├── Raumpolygone prüfen und korrigieren                       (Sicherheitsanker)
  ├── Raumbuch vervollständigen (θint, Bauteile, Nachbarn)
  ├── Rechenkern DIN EN 12831-1  ──────────────────────────► rein lokal
  └── Bericht PDF + Word         ──────────────────────────► rein lokal
```

**Grundregel:** Ohne Netz und ohne Endpunkt funktioniert das Tool vollständig,
nur ohne KI-Vorbelegung. Rechnen und Berichten verlässt nie den Rechner.

### Warum kein API-Key in der HTML-Datei
Eine Datei im SharePoint ist für jeden Mitarbeiter lesbar. Ein eingebetteter Key
wäre in Minuten extrahiert und außerhalb der Firma nutzbar. Der Key liegt daher
in der Umgebungsvariable der Function. Zugangsschutz zur Function: ein
Firmen-Shared-Secret in der Datei plus Rate-Limit je Aufruf. Das Secret schützt
nicht gegen Mitarbeiter, aber gegen Fremde, und ist ohne Kostenrisiko rotierbar.

## 3. Der KI-Schritt im Detail

**Was die KI liefert (Lesehilfe mit Belegstelle):**
- Raumliste je Geschoss: Bezeichnung, Nummer, abgelesene Flächenangabe
- erkannte Maßketten als Text mit Bildkoordinate
- Raumart-Vorschlag → Norm-Innentemperatur nach DIN/TS 12831-1 Tab. 32
- Fenster- und Türpositionen, Angaben aus dem Plankopf
- je Feld: Konfidenz und die Stelle im Plan, an der es gelesen wurde

**Was die KI NICHT liefert:**
- den Maßstab (zwei Klicks des Kollegen, sonst skaliert ein Lesefehler alles)
- die Geometrie (kommt aus dem Polygonklick, exakt und sichtbar)
- U-Werte (Katalog plus Eingabe, nicht geraten)

Unsichere oder fehlende Felder werden rot markiert und müssen bestätigt werden,
bevor gerechnet wird. So bleibt jedes Ergebnis prüffähig.

### Technische Umsetzung
- Modell **claude-opus-5**, `effort: high`. Begründung: Maßketten und
  Raumzuordnung sind genau die Stelle, an der Genauigkeit zählt, und der
  Kostenunterschied ist bei diesen Volumina irrelevant (siehe unten).
- **Structured Output** über `output_config.format` mit `json_schema`, damit das
  Raumbuch validiert zurückkommt und kein Parsing nötig ist.
- Bild als Base64 im Content-Block, lange Kante bis 2576 px (Opus 5 unterstützt
  hochauflösende Bilder, Koordinaten sind 1:1 zu Bildpixeln).
- Streaming nicht nötig, ein Aufruf je Planseite.

### Kosten
Preise Anthropic API: Opus 5 5 $ / 25 $ je Mio. Token (Input/Output),
Sonnet 5 3 $ / 15 $ (Einführungspreis 2 $ / 10 $ bis 31.08.2026).

Annahme je Planseite: ein hochauflösendes Bild ≈ 4.784 Input-Token, dazu
Systemprompt und Schema ≈ 2.000, Raumbuch-JSON zurück ≈ 3.000 Output-Token.

| Modell | je Planseite | je Projekt (3 Geschosse) |
|---|---|---|
| claude-opus-5 | rund 0,11 $ | rund 0,33 $ |
| claude-sonnet-5 | rund 0,07 $ | rund 0,20 $ |

Selbst bei 300 Projekten im Jahr und drei Planseiten je Projekt liegt das im
niedrigen dreistelligen Bereich. Das ist gegenüber der eingesparten Zeit am
RDP-Arbeitsplatz irrelevant. Ein Ausgabelimit am Endpunkt (Aufrufe je Tag)
deckelt Fehlbedienung.

## 4. Bauabschnitte

**Stufe 1 — Rechenkern generisch (sofort startbar, ohne Freigaben)**
`modell.py` von der Mälzerstraße lösen, Stammdaten als Eingabestruktur, dann
nach `src/kern_heizlast_norm.js` portieren im Muster der bestehenden `kern_*.js`
mit `selbsttest()`. Dazu `daten_klima.js` (θe je PLZ nach DIN/TS 12831-1),
`daten_raumarten.js` (θint Tab. 32), `daten_bauteile.js` (U-Wert-Katalog nach
Baualtersklassen). Ergebnis: rechnender Kern mit grüner Testsuite, noch ohne UI.

**Stufe 2 — Raumbuch-Erfassung**
Tabellen-UI im Corporate Design, Muster aus dem Lüftungstool. Räume, Geschosse,
Bauteile je Raum mit Nachbarbedingung, Wohneinheiten (die Falle aus Hottgenroth:
ohne Wohneinheit fehlt die komplette Lüftung).

**Stufe 3 — Plan-Canvas und KI-Auslese**
Bild/PDF laden, Maßstab per zwei Klicks, Polygonwerkzeug, Kantenzuordnung
(außen / gegen unbeheizt / gegen Nachbar). Danach der Auslese-Knopf plus
Netlify Function.

**Stufe 4 — Bericht**
PDF über Druckpfad, Word über den `wordexport.js`-Renderpfad des Lüftungstools.
Prüfvermerk „Erstellt / Geprüft", Berechnungsgrundlagen mit Formeln und
Normfassung, Standortwahl Paderborn / Kassel / Dortmund.

**Stufe 5 — Validierung und Freigabe**
Mindestens 8 bis 12 Echtfälle über EFH, ZFH und MFH gegen Hottgenroth
gegenrechnen, Abweichung je Fall dokumentieren. Bis zu deiner fachlichen
Freigabe trägt jeder Bericht ein ENTWURF-Wasserzeichen, genau wie beim
Lüftungskern.

## 5. Offene Punkte für Sebastian

1. **Datenschutz:** Grundrisspläne gehen beim Auslese-Schritt an die Anthropic
   API. Vor dem Rollout klären: Auftragsverarbeitungsvertrag mit Anthropic,
   und ob Plankopf mit Bauherrenname vor dem Upload automatisch abgeschnitten
   werden soll. Das lässt sich im Tool erzwingen.
2. **θe für Kassel und Dortmund** nach DIN/TS 12831-1 belegen. Für Paderborn ist
   −9,6 °C belegt, die anderen beiden stehen bisher als Annahme −10 °C.
3. **Wer gibt frei?** Vier-Augen-Feld im Bericht wie beim Lüftungstool, und die
   Frage, ob jeder Kollege ohne Gegenzeichnung Berichte herausgeben darf.
4. **Versionsdisziplin:** eine Datei im SharePoint, Versionsnummer sichtbar im
   Kopf, und eine Warnung, wenn eine lokale Kopie älter als die SharePoint-Datei
   ist (per Versions-Abfrage am selben Endpunkt).
5. **Abgrenzung zum Konzept-Tool:** der überschlägige TABULA-Kern dort bleibt für
   das Erstgespräch. Dieses Tool ist der Nachweis. Beide Tools sollten
   aufeinander verweisen, damit niemand den falschen Weg nimmt.
