# Spezifikation Ablaufsteuerung — vom Stapel Dateien zum fertigen Bericht

Entwurf der Steuerung im Browser für den neuen Weg: Der Bearbeiter legt bis zu zehn Dateien ab,
unbeschriftet und in beliebiger Reihenfolge, und bekommt daraus einen Bericht. Die Steuerung hält
den ganzen Weg zusammen, ohne die Zeitgrenze der serverlosen Funktion und ohne das Budget je
Bericht zu reißen.

**Herkunft der Zahlen.** Alles, was in diesem Dokument als **[M]** steht, ist gemessen und in
`SPEZIFIKATION_FORMATE.md` (Messungen vom 20.08.2026) oder im Quelltext belegt. Alles, was als
**[A]** steht, ist eine Annahme; die Herleitung steht dabei. Antwortzeiten des Modells sind
grundsätzlich Annahmen, verankert am einzigen belastbaren Anker aus der Aufgabenstellung: *eine
volle Auswertung einer Planseite kostet rund 5 Cent und dauert rund 20 Sekunden*. Preise sind
belegt (Abschnitt 14).

**Währung.** Gerechnet wird in USD, weil die Preise in USD ausgewiesen sind. Für den Abgleich mit
dem Deckel von 2 Euro wird 1 USD konservativ als 1 EUR angesetzt; ein Tageskurs ist hier nicht
belegbar, und die Richtung der Näherung liegt auf der sicheren Seite.

---

## 1 Ergebnis in fünf Zeilen

1. **Zwei Stufen, ein Tor dazwischen.** Billige Sichtung aller Seiten, danach genau eine
   Rückfrage an den Bearbeiter (Zuordnung und Kostenrahmen), danach die teure Auswertung nur der
   bestätigten Seiten. Das Tor ist zugleich die Kostenfreigabe.
2. **Zehn Seiten, davon vier Grundrisse und ein Schnitt: 2 Minuten 36 Sekunden Maschinenzeit und
   0,85 USD** bei 4 gleichzeitigen Aufrufen. Reserve 48 % der Zeit, 58 % des Geldes. Ab dem
   01.09.2026 (Ende des Einführungspreises) sind es **1,27 USD** — die Geldreserve halbiert sich.
3. **Vier Schleusen, selbstregelnd zwischen 1 und 6.** Das Budget hält rechnerisch noch bei 2
   Schleusen (4:56, also mit vier Sekunden Rest). Bei 1 Schleuse reißt es (9:26). Deshalb gibt
   es eine Sparfahrt in drei Stufen statt eines Abbruchs.
4. **Jede Aufgabe ist einzeln und wiederholbar.** Eine gescheiterte Kachel verliert eine Kachel,
   nicht den Lauf, und wird zur benannten Lücke im Kontrollblatt — nie zum stillen Loch.
5. **Zwischenstände liegen in IndexedDB**, geschrieben nach jeder fertigen Aufgabe. Ein
   versehentliches Neuladen kostet höchstens die gerade laufenden Aufrufe.

---

## 2 Was vorhanden ist und wo die Nähte liegen

| Baustein | Datei | Rolle im neuen Ablauf |
|---|---|---|
| Zustand, Schritte, Rendern | `src/app.js` | `App.p` (Projekt), `App.schritt`, `render()`, Ereignisverteilung über `data-aktion`. Der Lauf hängt in Schritt 1 „Pläne auswerten" |
| Ein Plan im Fenster | `src/modul_plan.js` | Bleibt Eigentümer von **genau einem** aktiven Bild: Maßstab, Polygone, `bildLaden()`, `inProjektSichern()`, `bildBase64()` |
| Einzelauslese | `src/modul_ki.js` | Heute ein Bild, ein Aufruf, eigener Zustand `S`. Wird zum Sonderfall „Lauf mit einer Aufgabe"; Übernahme-Oberfläche und `artZuordnen`/`feldWert` bleiben |
| Eignungsprüfung | `src/kerne/kern_planpruefung.js` | `pruefeBild(ImageData)` → `{befunde, sperren, urteil, nutzbar}`, `pruefeMassstab()`, `verbinden()`. Läuft je Seite lokal, vor jedem Modellaufruf |
| Endpunkt | `api/netlify/functions/plan-auslesen.mjs` | Ein Bild je Aufruf, Antwort im Datenstrom mit Lebenszeichen alle 3 s, liefert `_verbrauch` mit echten Tokenzahlen |
| Raumerkennung, Maßstab | `src/kerne/kern_grundriss.js`, `src/kerne/kern_massstab.js` | Entstehen gerade. Der Lauf ruft sie **lokal** nach der Auswertung auf; fehlen sie, entfällt nur ihr Beitrag |

Drei Eigenschaften des Endpunkts prägen den Entwurf und sind im Quelltext nachlesbar:

* **Ein Bild je Aufruf.** `body.bild` ist ein einzelner Base64-String. Mehrere Bilder in einem
  Aufruf gehen heute nicht — für die Sichtung ist das der einzige nötige Zusatz (Abschnitt 13, O1).
* **Antwort im Datenstrom, Status immer 200.** Wegen der Zeitgrenze öffnet der Endpunkt die
  Antwort sofort und sendet alle 3 s eine Leerzeile als Lebenszeichen. Fehler kommen deshalb
  **nicht** als HTTP-Status, sondern als `{"fehler": "..."}` im Rumpf. Die Ratenbegrenzung des
  Anbieters erscheint als Text „Zu viele Anfragen. Bitte kurz warten." Nur der Zugangscode-Fehler
  kommt echt als 401, weil er vor dem Datenstrom liegt.
* **Verbrauch kommt zurück.** `_verbrauch` trägt `eingabe_token`, `ausgabe_token` und `modell`.
  Die Kostenanzeige im Fortschritt ist damit **gemessen, nicht geschätzt**.

`src/modul_ki.js` liest die Antwort heute mit `await antwort.text()`. Damit ist das Lebenszeichen
unsichtbar und ein hängender Aufruf nicht von einem arbeitenden zu unterscheiden. Der Lauf liest
stattdessen den Strom mit `response.body.getReader()`; jedes eintreffende Byte ist ein
Lebenszeichen (Abschnitt 9).

---

## 3 Die Zustandsmaschine

### 3.1 Übersicht

```
        Dateien abgelegt
               │
               ▼
      ┌──────────────────┐   Datei unbrauchbar → Seite verwerfen, Rest läuft weiter
      │ 1 AUFBEREITUNG   │   alles unbrauchbar → LEER mit Klartextmeldung
      │ rein lokal       │
      └────────┬─────────┘
               │  Seitenliste mit Vorschau, Blattmaß, lokalem Typ, Eignungsurteil
               ▼
      ┌──────────────────┐   kein Endpunkt / kein Code → HANDBETRIEB (gleichwertiger Ausgang)
      │ 2 SICHTUNG       │   Aufruf scheitert → Seiten dieses Bündels behalten den lokalen Typ
      │ billig, alle S.  │
      └────────┬─────────┘
               │  je Seite: Typ, Geschoss, Verwendungsvorschlag, Konfidenz
               ▼
      ┌══════════════════┐
      ║ 3 ZUORDNUNG      ║  ◄── die EINZIGE Rückfrage. Zeigt Vorschlag, Aufrufzahl,
      ║ Bearbeiter       ║       Kostenrahmen und geschätzte Dauer. Uhr steht still.
      └════════┬═════════┘
               │  bestätigte Seiten mit Rolle (Grundriss EG/OG/…, Schnitt, mitlesen, ignorieren)
               ▼
      ┌──────────────────┐   Abbrechen → ANGEHALTEN (Teilergebnis bleibt übernehmbar)
      │ 4 AUSWERTUNG     │   Budget/Zeit knapp → Sparfahrt Stufe 2, dann 3
      │ teuer, geregelt  │   Aufgabe scheitert → 2 Wiederholungen, dann Lücke
      └────────┬─────────┘
               │  Rohergebnisse je Aufgabe
               ▼
      ┌──────────────────┐
      │ 5 ZUSAMMENFÜHREN │   rein lokal: entdoppeln, Widersprüche abwerten,
      │ rein lokal       │   Geschosse ordnen, Schnitt an Grundrisse binden
      └────────┬─────────┘
               │  Raumbuch-Vorschlag, Befunde, Lücken, Maßstabsvorschläge
               ▼
      ┌──────────────────┐
      │ 6 PRÜFUNG        │   vorhandene Oberfläche: Maßstab setzen, umfahren, bestätigen
      │ Bearbeiter       │
      └────────┬─────────┘
               ▼
        rechnen → Bericht   (unverändert lokal, Kern und Berichtsmodul)
```

### 3.2 Die Zustände im Einzelnen

| # | Zustand | Was läuft | Netz | Ausgang bei Erfolg | Ausgang bei Fehlschlag |
|---|---|---|---|---|---|
| 0 | `leer` | Ablagefläche | nein | `aufbereitung` | — |
| 1 | `aufbereitung` | Dateien lesen, PDF in Seiten zerlegen, Vorschau bei Skala 0,25, lokaler Seitentyp aus Textschicht und Operatorliste, `kern_planpruefung.pruefeBild()` je Seite | nein | `sichtung` | einzelne Seite → `verworfen`; alle → `leer` |
| 2 | `sichtung` | Bündel kleiner Bilder an den Endpunkt, knappe Antwort je Seite | ja | `zuordnung` | `zuordnung` mit lokalem Typ; oder `handbetrieb` |
| 3 | `zuordnung` | Wartet auf den Bearbeiter | nein | `auswertung` | Bearbeiter wählt „ohne KI weiter" → `handbetrieb` |
| 4 | `auswertung` | Warteschlange, Schleusen, Sparfahrt, Fortschritt | ja | `zusammenfuehren` | `angehalten` (Teilergebnis bleibt) |
| 4a | `angehalten` | Nichts läuft, alles Erreichte liegt vor | nein | `auswertung` (fortsetzen) oder `zusammenfuehren` (mit dem, was da ist) | — |
| 5 | `zusammenfuehren` | Entdoppeln, Widersprüche, Geschossordnung, `kern_massstab`, `kern_grundriss` | nein | `pruefung` | Teilmenge übernehmen, Rest als Lücke |
| 6 | `pruefung` | Raumbuch, Maßstab, Polygone | nein | `fertig` | — |
| — | `handbetrieb` | Seiten sind aufbereitet und wählbar, alles Weitere von Hand | nein | `pruefung` | — |

**`handbetrieb` ist kein Fehlerzustand.** Auch ohne jeden Modellaufruf hat der Bearbeiter dann
etwas gewonnen, was er heute nicht hat: die PDF sind in Seiten zerlegt, jede Seite hat eine
Vorschau, ein Blattmaß und ein Eignungsurteil, und jede Seite lässt sich mit einem Klick in
`modul_plan` laden. Der Weg über Maßstab setzen und Umfahren steht unverändert offen.

### 3.3 Regeln für Übergänge

* **Kein Übergang verwirft Erreichtes.** Jeder Zustandswechsel schreibt vorher in die Ablage
  (Abschnitt 8). Rückwärts geht es nur über ausdrückliches Verwerfen durch den Bearbeiter.
* **Nur ein Lauf gleichzeitig.** Werden während eines laufenden Laufs Dateien abgelegt, fragt das
  Werkzeug: an den laufenden Lauf anhängen (nur vor dem Tor) oder neu beginnen.
* **Das Tor ist verbindlich.** Zwischen Sichtung und Auswertung wird immer angehalten, auch wenn
  die Sichtung eindeutig ist. Grund: hinter dem Tor liegen die Kosten, und die Zuordnung von
  Geschossen ist die einzige Angabe, die aus den Unterlagen regelmäßig nicht sicher hervorgeht.
* **Die Uhr des Zeitbudgets läuft nur in 2, 4 und 5.** Wartezeit auf den Menschen zählt nicht,
  sonst würde eine sorgfältige Zuordnung bestraft.

---

## 4 Datenmodell des Laufs

Ein Lauf ist ein einfaches Objekt; alles Weitere sind Listen darin. Das Modell ist bewusst flach,
damit es sich als JSON in die Ablage schreiben und ohne Sonderbehandlung wieder einlesen lässt.

```js
lauf = {
  id: "lauf_1755712345678",
  projektId: "…",                 // Bindung an App.p, damit ein fremder Lauf nicht einläuft
  version: 1,
  zustand: "auswertung",
  begonnen: "2026-08-20T14:03:11.000Z",
  uhr: { maschinenzeit_ms: 98240, deckel_ms: 300000, warnung_ms: 240000 },
  geld: { verbraucht_usd: 0.41, deckel_usd: 2.0, warnung_usd: 1.2,
          preis: { modell: "claude-sonnet-5", ein_je_mio: 2.0, aus_je_mio: 10.0,
                   stand: "2026-08-20", hinweis: "Einführungspreis bis 31.08.2026" } },
  schleusen: { jetzt: 4, min: 1, max: 6, erfolge_in_folge: 0 },
  stufe: 1,                       // 1 voll · 2 sparsam · 3 Notbetrieb
  seiten: [ /* siehe unten */ ],
  aufgaben: [ /* siehe unten */ ],
  protokoll: [ { zeit, art, text } ]   // wandert in Berichtskapitel 3
}

seite = {
  id: "s_02",                     // stabil: Dateihash + Seitenzahl
  datei: { name: "Plan.pdf", groesse: 4321000, hash: "…" },
  seitenzahl: 2,
  blatt: { breite_mm: 420, hoehe_mm: 297, drehung: 90 },
  vorschau: "<data-URI, lange Kante 512>",
  lokal: { typ: "scan", textstuecke: 0, bilder: 1, pfade: 0, dpi_nativ: 300 },
  eignung: { urteil: "geeignet", nutzbar: true, sperren: [] },
  sichtung: { typ: "grundriss", geschoss: "OG", massstab_text: "M 1:100",
              verwenden: true, konfidenz: "unsicher", begruendung: "…" },
  rolle: null,                    // wird im Tor gesetzt: "grundriss:OG" | "schnitt" | "mitlesen" | "ignorieren"
  kacheln: { dpi: 254, spalten: 3, zeilen: 2, ueberlappung_px: 120 },
  stand: "wartet"                 // wartet · laeuft · fertig · teilweise · fehlgeschlagen · ignoriert
}

aufgabe = {
  id: "s_02:kachel:1-0",          // idempotent, aus Seite + Art + Kachelindex
  seiteId: "s_02",
  art: "sichtung" | "uebersicht" | "kachel",
  kachel: { spalte: 1, zeile: 0, dpi: 254 },
  stand: "offen" | "laeuft" | "fertig" | "fehlgeschlagen" | "aufgegeben",
  versuche: 0,
  begonnen: null, gedauert_ms: null,
  verbrauch: { eingabe_token: 6361, ausgabe_token: 812 },
  fehler: null,                   // { art, text, wiederholbar }
  ergebnis: null                  // Rohantwort des Endpunkts
}
```

**Idempotenz.** Die Aufgaben-Kennung wird aus Seitenkennung, Art und Kachelindex gebildet, die
Seitenkennung aus Dateihash und Seitenzahl. Dieselbe Datei zweimal abgelegt ergibt dieselben
Kennungen; die Warteschlange erkennt das und arbeitet nichts doppelt. Nach einem Neuladen wird
eine Aufgabe im Stand `fertig` nie wiederholt.

---

## 5 Nebenläufigkeit

### 5.1 Wie viele Aufrufe gleichzeitig

**Vier Schleusen als Voreinstellung, selbstregelnd zwischen 1 und 6.**

Drei Grenzen bestimmen die Zahl, und nur eine davon ist bekannt:

| Grenze | Was sie sagt | Belegt? |
|---|---|---|
| Zeitbudget | Bei 2 Schleusen liegt der Beispiellauf bei 4:56, bei 1 Schleuse bei 9:26 (Abschnitt 6). Vier Schleusen geben also 100 % Luft nach unten | rechnerisch aus [M] und [A] |
| Rechner des Bearbeiters | Eine Kachel aufzubereiten kostet im Mittel **355 ms** [M]. Bei 4 Schleusen und rund 15 s je Aufruf muss alle 3,75 s eine Kachel fertig sein — Faktor 10 Reserve. Der Speicher ist unkritisch: eine Kachel 1932×1932 sind 15 MB RGBA gegen 98 MB für ein 24,5-MP-Vollbild [M] | ja |
| Ratenbegrenzung des Anbieters | Bei 6 Schleusen und 15 s je Aufruf sind das 24 Aufrufe je Minute mal rund 6.360 Eingabetoken = **rund 153.000 Eingabetoken je Minute**. Ob die Tarifstufe des Workspace das trägt, ist **nicht belegt** | nein, siehe O2 |

Weil die dritte Grenze unbekannt ist, wird sie nicht geraten, sondern **gemessen**: die Steuerung
fährt hoch, bis der Anbieter bremst, und dann zurück.

```
Start:            4 Schleusen
nach 4 Erfolgen:  +1, höchstens 6
Ratenbegrenzung:  Hälfte, abgerundet, mindestens 1; 20 s Sperrzeit für neue Aufgaben
Netzfehler:       -1, mindestens 1
30 s ohne Bremse: langsam wieder hoch
```

Über `file://` (Einzeldatei ohne Netz) rendert pdf.js im Hauptthread [M]. Dort werden **höchstens
zwei Kacheln gleichzeitig vorbereitet**, und zwischen zwei Kacheln gibt die Vorbereitung die
Ereignisschleife frei (`await new Promise(r => setTimeout(r, 0))`), damit Fortschrittsanzeige und
Abbruchknopf bedienbar bleiben. Über HTTPS läuft der echte Worker, dann sind es vier.

### 5.2 Reihenfolge in der Warteschlange

Nicht Seite für Seite, sondern **erst alle Übersichten, dann die Kacheln reihum über die Seiten**.

Grund: Bricht der Lauf in der Mitte ab — Abbruch, Budget, Neuladen — dann liegt bei
seitenweiser Abarbeitung für drei Seiten alles und für zwei Seiten nichts vor. Reihum abgearbeitet
liegt für jede Seite die Übersicht und ein Teil der Kacheln vor. Das erste ist für den Bearbeiter
unbrauchbar, das zweite ein Zwischenstand, mit dem er weiterarbeiten kann.

Innerhalb einer Seite werden die Kacheln nach Ertrag geordnet: zuerst die, in denen die Übersicht
Raumstempel oder Maßketten gemeldet hat, die sie nicht sicher lesen konnte. Damit ist die
Sparfahrt (Abschnitt 6.4) nur noch das Abschneiden des Endes einer bereits richtig sortierten
Liste.

### 5.3 Was der Plankopf mit den Kacheln macht

Das Schwärzen des oberen Streifens (heute `modul_ki.geschwaerzt`, 12 % der Bildhöhe) bezieht sich
auf die **ganze Seite**. Bei Kacheln wäre ein pauschaler Streifen je Kachel falsch: er würde in
jeder Kachelzeile Planinhalt zerstören. Regel:

1. Der Bereich des Plankopfs wird **einmal je Seite** in Seitenkoordinaten festgelegt (oberer
   Streifen, oder genauer aus der Textschicht, wenn die Seite ein Vektor-PDF ist).
2. Beim Aufbereiten einer Kachel wird der Schnitt dieses Bereichs mit der Kachel geschwärzt, in
   Kachelkoordinaten. Kacheln ohne Schnittmenge bleiben unberührt.

---

## 6 Zeit- und Kostenbudget

### 6.1 Der durchgerechnete Fall

Zehn Seiten, davon vier Grundrisse und ein Schnitt bestätigt, fünf Seiten nicht verwendet.
Alle Blätter A3 quer. Rechenweg:

**Stufe 1 — Sichtung, alle zehn Seiten**

| Größe | Wert | Herkunft |
|---|---|---|
| Vorschaubild je Seite | lange Kante 1024 px → 1024×724 | Festlegung |
| Bildtoken je Seite | ⌈1024/28⌉ × ⌈724/28⌉ = 37 × 26 = **962** | [M] Rechenregel der Schnittstelle |
| Seiten je Aufruf | 5, mit Textmarke „Seite n" vor jedem Bild | Festlegung |
| Anweisung und Schema | rund 900 Token je Aufruf | [A] kurzer Systemtext, kleines Schema |
| Eingabe je Aufruf | 5 × 962 + 900 + 50 = **5.760** | Rechnung |
| Ausgabe je Aufruf | 5 × 120 = **600** | [A] eine knappe Zeile je Seite |
| Aufrufe | 2, gleichzeitig | Festlegung |
| Dauer | **12 s** | [A] kleine Bilder, kurze Antwort, gegen den Anker von 20 s für eine ganze Seite mit langer Antwort; 2 s Aufschlag für den Kaltstart der Funktion |

**Stufe 2 — volle Auswertung, fünf bestätigte Seiten**

| Größe | Wert | Herkunft |
|---|---|---|
| Übersichtsbild | 2275×1609 → **4.756** Bildtoken | [M] |
| Kachel | 1932×1932 → 69 × 69 = **4.761** Bildtoken | [M] |
| Kacheln je A3 bei 254 dpi | 3 × 2 = **6** | [M] |
| Anweisung und Schema | rund 1.600 Token je Aufruf | [A] gemessen am Umfang von `SYSTEM` und `SCHEMA` in `plan-auslesen.mjs` |
| Eingabe Übersicht | 4.756 + 1.600 = 6.356 je Seite | Rechnung |
| Eingabe Kachel | 4.761 + 1.600 = 6.361 je Kachel | Rechnung |
| Ausgabe Übersicht | 2.500 je Seite | [A] Raumliste, Befunde, Lücken |
| Ausgabe Kachel | 800 je Kachel | [A] wenige Raumstempel und Maßketten |
| Aufrufe | 5 Übersichten + 30 Kacheln = **35** | Rechnung |
| Dauer Übersicht | 20 s | Anker aus der Aufgabenstellung |
| Dauer Kachel | 15 s | [A] gleiche Bildgröße, deutlich kürzere Antwort |

**Summen**

| | Eingabetoken | Ausgabetoken |
|---|---:|---:|
| Sichtung, 2 Aufrufe | 11.520 | 1.200 |
| Übersichten, 5 Aufrufe | 31.780 | 12.500 |
| Kacheln, 30 Aufrufe | 190.830 | 24.000 |
| **gesamt, 37 Aufrufe** | **234.130** | **37.700** |

**Geld**

| Preisstand | Eingabe | Ausgabe | **Summe** | vom Deckel 2 |
|---|---:|---:|---:|---:|
| bis 31.08.2026 (Einführungspreis 2 / 10 USD je Mio.) | 0,468 | 0,377 | **0,85 USD** | 42 % |
| ab 01.09.2026 (Regelpreis 3 / 15 USD je Mio.) | 0,702 | 0,566 | **1,27 USD** | 63 % |

**Zeit bei 4 Schleusen**

| Abschnitt | Dauer | Herkunft |
|---|---:|---|
| Aufbereitung: 10 Seiten laden, Vorschau, lokaler Typ, Eignungsprüfung | 2 s | [A] gegen [M] 7,1 s für einen A1-Gesamtdurchlauf mit 20 Kacheln inklusive Dateiladen; Vorschauen sind ein Fünfundzwanzigstel der Fläche |
| Sichtung | 12 s | siehe oben |
| *Tor: Bearbeiter ordnet zu* | *zählt nicht* | Festlegung 3.3 |
| Auswertung: 100 s Übersichten + 450 s Kacheln = 550 s Arbeit auf 4 Schleusen | 140 s | Ablaufsimulation, nicht bloße Division: Übersichten zuerst, dann Kacheln, Leerlauf der letzten Welle eingerechnet |
| Kachelaufbereitung, 30 × 355 ms | 0 s zusätzlich | [M]; läuft verschränkt mit dem Warten, siehe 5.1 |
| Zusammenführen, Rechnen | 2 s | [A] Kern rechnet ein Haus in Millisekunden |
| **Maschinenzeit** | **156 s = 2:36** | **Reserve 2:24 = 48 %** |

### 6.2 Was passiert, wenn weniger Schleusen offen sind

| Schleusen | Auswertung | Maschinenzeit gesamt | Urteil |
|---:|---:|---:|---|
| 6 | 95 s | 1:51 | reichlich |
| **4** | **140 s** | **2:36** | **Voreinstellung** |
| 3 | 190 s | 3:26 | hält |
| 2 | 280 s | 4:56 | rechnerisch gerade eben; die Hochrechnung löst vorher bei 4:00 die Sparfahrt Stufe 2 aus |
| 1 | 550 s | 9:26 | reißt deutlich → Sparfahrt Stufe 3 |

Die Werte stammen aus einer Ablaufsimulation der 35 Aufgaben (fünf zu 20 s, dreißig zu 15 s,
Übersichten zuerst), nicht aus einer Division; der Leerlauf der letzten Welle ist enthalten.

Genau daraus folgt die Voreinstellung: Vier Schleusen halten das Budget selbst dann, wenn sich
die Antwortzeiten gegenüber der Annahme um zwei Drittel verschlechtern.

### 6.3 Wie das Budget zur Laufzeit geführt wird

Nicht gegen die Schätzung, sondern gegen die **Messung**:

* **Geld** aus `_verbrauch` jeder Antwort mal dem Preis aus `lauf.geld.preis`. Der Preisstand
  steht mit Datum in der Anzeige, damit niemand einen veralteten Preis für eine Tatsache hält.
* **Restzeit** aus dem gleitenden Mittel der bisher fertigen Aufgaben je Art, nicht aus der
  Tabelle oben: `rest = offene_aufgaben × mittel_je_art / schleusen`.
* Nach jeder fertigen Aufgabe wird die Vorschau erneuert. Überschreitet sie den Deckel, greift
  die Sparfahrt, bevor das Budget aufgebraucht ist — nicht erst danach.

### 6.4 Sparfahrt in drei Stufen

| Stufe | Was gerechnet wird | Wann |
|---|---|---|
| **1 voll** | Übersicht plus alle Kacheln je bestätigter Seite | Regelfall |
| **2 sparsam** | Übersicht plus nur die Kacheln, in denen die Übersicht ungelesene Raumstempel oder Maßketten gemeldet hat | Vorschau über 4:00 oder über 1,20 USD, oder zweimal Ratenbegrenzung in Folge |
| **3 Notbetrieb** | nur die Übersicht je Seite | Vorschau über 5:00 oder über 2,00 USD |

Der Wechsel der Stufe wird **angezeigt und begründet** („Nur noch die Kacheln mit ungelesenen
Raumstempeln, weil die Hochrechnung 5:20 ergibt"), und der Bearbeiter kann ihn mit einem Klick
zurücknehmen und das Budget anheben. Was durch die Sparfahrt entfällt, ist nicht verloren,
sondern steht als benannte Lücke im Kontrollblatt: „Seite 3, unteres Drittel nicht ausgewertet —
Flächen dort durch Umfahren ergänzen."

### 6.5 Was nicht eingebaut wird, obwohl es Geld spart

Zwischenspeicherung des Systemtextes über die Aufrufe hinweg spart rechnerisch rund 0,09 USD je
Bericht (34 Aufrufe × 1.600 Token, abzüglich Schreibaufschlag). Das ist etwa ein Zehntel der
Kosten und setzt eine Änderung am Endpunkt voraus. Empfehlung: **später**, zusammen mit O1.
Bilder lassen sich ohnehin nicht zwischenspeichern, jede Kachel kommt genau einmal vor.

---

## 7 Was der Bearbeiter sieht

Er wartet knapp drei Minuten. Das muss erträglich sein, ehrlich bleiben und jederzeit
unterbrechbar sein.

### 7.1 Aufbau der Anzeige

```
┌────────────────────────────────────────────────────────────────────┐
│  Pläne auswerten            [ Pausieren ]  [ Abbrechen ]           │
│                                                                    │
│  ①Aufbereiten ─ ②Sichten ─ ③Zuordnen ─ ④Auswerten ─ ⑤Zusammenführen│
│                                          ▲ hier                     │
│                                                                    │
│  Aufruf 19 von 37 · 1:42 von höchstens 5:00 · 0,41 von höchstens 2 │
│  ████████████████░░░░░░░░░░░░░░░  Restzeit nach bisherigem Tempo:  │
│                                   noch etwa 1 Minute                │
│                                                                    │
│  Seite 1  Lageplan            nicht verwendet                      │
│  Seite 2  Grundriss EG        fertig · 7 Räume, 4 Maßketten        │
│  Seite 3  Grundriss OG        wird gelesen · Kachel 4 von 6        │
│  Seite 4  Grundriss DG        wartet                               │
│  Seite 5  Schnitt A-A         fertig · 3 lichte Höhen              │
│  …                                                                 │
│                                                                    │
│  Zuletzt: Seite 2, Kachel 3 gelesen — Raumstempel „Bad 6,12 m²"    │
└────────────────────────────────────────────────────────────────────┘
```

### 7.2 Regeln für die Anzeige

* **Der Balken ist ehrlich.** Er zeigt fertige Aufgaben durch Gesamtaufgaben, nichts Erfundenes.
  Ändert sich die Gesamtzahl (Sparfahrt), springt er sichtbar und die Zeile darunter sagt warum.
* **Es passiert immer etwas.** Jedes fertige Teilergebnis erzeugt eine Zeile im Verlauf mit einem
  echten Fund („Raumstempel Bad 6,12 m²"). Wer drei Minuten wartet, muss sehen, dass gearbeitet
  wird, und woran.
* **Restzeit aus dem gemessenen Tempo**, gerundet auf halbe Minuten, mit „etwa". Keine
  Sekundenanzeige, die alle drei Sekunden springt.
* **Kosten immer sichtbar.** Nicht versteckt: der Bearbeiter soll ein Gefühl dafür bekommen, was
  ein Bericht kostet.
* **Seiten, die nicht verwendet werden, bleiben in der Liste** — mit der Begründung aus der
  Sichtung. Sonst entsteht der Verdacht, es sei etwas verschwunden.

### 7.3 Pausieren, Abbrechen, Weitermachen

| Knopf | Wirkung |
|---|---|
| **Pausieren** | Laufende Aufrufe werden zu Ende geführt, keine neuen begonnen. Zustand `angehalten`. Fortsetzen jederzeit |
| **Abbrechen** | `AbortController.abort()` auf alle laufenden Aufrufe, Warteschlange geleert, Zustand `angehalten`. Danach zwei gleichwertige Wege: „Mit dem weitermachen, was gelesen wurde" oder „Verwerfen" |
| **Fortsetzen** | Nur die Aufgaben im Stand `offen` und `fehlgeschlagen`; fertige werden nie wiederholt |

Ein Abbruch darf nie Ergebnisse kosten. Die abgebrochenen Aufrufe sind bezahlt und verloren — das
steht im Verlauf, damit die Kostenanzeige stimmt.

Während `auswertung` ist ein `beforeunload`-Hinweis gesetzt. Er ersetzt die Wiederaufnahme nicht,
er reduziert nur ihre Häufigkeit.

---

## 8 Wiederaufnahme

### 8.1 Wo die Zwischenstände liegen

**IndexedDB**, nicht `localStorage`. Begründung: `localStorage` ist synchron, blockiert also die
Oberfläche genau dann, wenn sie flüssig bleiben muss, und liegt üblicherweise bei rund 5 MB —
zehn Seitenvorschauen und die Rohantworten sprengen das.

Datenbank `werke_heizlast`, Version 1, drei Speicher:

| Speicher | Schlüssel | Inhalt | Größe je Lauf |
|---|---|---|---|
| `laeufe` | `lauf.id` | das Laufobjekt aus Abschnitt 4 ohne Vorschauen | wenige KB |
| `seiten` | `lauf.id + ":" + seite.id` | Vorschau (lange Kante 512, JPEG 0,7) und Seitenkopf | rund 40 KB je Seite |
| `quellen` | `datei.hash` | die abgelegte Originaldatei als Blob | so groß wie die Dateien |

**Kacheln werden nie gespeichert.** Sie sind aus der Quelle in 355 ms neu erzeugt [M]; sie zu
speichern kostet mehr, als sie zu wiederholen.

### 8.2 Wann geschrieben wird

* nach der Aufbereitung jeder Seite (Vorschau, lokaler Typ, Eignung),
* nach **jeder** fertigen oder endgültig gescheiterten Aufgabe — das ist der entscheidende Punkt:
  der Verlust ist damit nach oben begrenzt auf die gerade laufenden Aufrufe, also höchstens sechs,
* bei jedem Zustandswechsel,
* beim Pausieren und Abbrechen.

Geschrieben wird gebündelt, höchstens ein Schreibvorgang je 500 ms, damit die Ablage bei sechs
gleichzeitig eintreffenden Antworten nicht zum Engpass wird.

### 8.3 Nach einem Neuladen

Beim Start sucht das Werkzeug einen Lauf, der nicht `fertig` ist und jünger als 24 Stunden ist:

> **Angefangene Auswertung vom 20.08.2026, 14:03**
> 10 Seiten, davon 5 zur Auswertung bestätigt. 19 von 37 Aufrufen erledigt, bisher 0,41 USD.
> [ Fortsetzen ]  [ Ergebnis von 19 Aufrufen übernehmen ]  [ Verwerfen ]

Fortsetzen bedeutet: Quelldateien aus `quellen` holen, Kacheln neu erzeugen, nur die offenen
Aufgaben arbeiten. Die verbrauchte Zeit läuft weiter, die verbrauchten Kosten auch — sonst
umginge man den Deckel durch Neuladen.

### 8.4 Wenn der Speicherplatz nicht reicht

`QuotaExceededError` beim Schreiben von `quellen` ist der wahrscheinlichste Fall (zehn PDF können
zweistellige MB haben). Dann:

1. `quellen` wird übersprungen, alles Übrige weiter geschrieben. Der Lauf läuft normal zu Ende.
2. Nach einem Neuladen fehlen die Quellen. Das Werkzeug zeigt, was es noch hat (Vorschauen und
   alle Ergebnisse) und bittet um die Dateien: „Bitte dieselben Dateien noch einmal ablegen." Der
   Abgleich läuft über Name, Größe und Hash; passt eine Datei, sind ihre Seiten sofort wieder
   verbunden, ohne einen einzigen neuen Modellaufruf.
3. Passt keine, bleiben die bereits gelesenen Ergebnisse trotzdem übernehmbar — sie hängen am
   Raumbuch, nicht am Bild.

Läufe, die älter als sieben Tage sind, werden beim Start gelöscht.

---

## 9 Fehler und ihre Behandlung

### 9.1 Erkennung

Weil der Endpunkt im Datenstrom antwortet und dabei immer 200 sendet, reicht der HTTP-Status
nicht. Erkennungsreihenfolge je Aufruf:

1. **HTTP 401** → Zugangscode. Kommt vor dem Datenstrom, ist also echt.
2. **HTTP 413** → Bild zu groß. Ebenfalls vor dem Datenstrom.
3. **Kein Byte seit 15 s** → tot. Der Endpunkt sendet alle 3 s ein Lebenszeichen [Quelltext], fünf
   ausgefallene Lebenszeichen sind eindeutig.
4. **Insgesamt 45 s** → harter Abbruch dieses Aufrufs. Die serverlose Funktion ist zu diesem
   Zeitpunkt ohnehin am Ende ihrer Laufzeit.
5. **Rumpf enthält `fehler`** → Fehlerart aus dem Text bestimmen.

Punkt 5 ist die schwache Stelle: heute muss der Browser deutschen Text abgleichen
(„Zu viele Anfragen", „Der hinterlegte Schluessel wird abgelehnt", „Die Antwort war
unvollstaendig"). Das ist brüchig. **Antrag an den Endpunkt** (O1): zusätzlich zu `fehler` ein
maschinenlesbares `code` und bei Ratenbegrenzung `warte_s` mitgeben. Bis dahin gilt: Textabgleich
mit Musterliste, und was nicht zugeordnet werden kann, wird als `unbekannt` behandelt —
einmal wiederholt, dann Lücke.

### 9.2 Behandlung

| Fehlerart | Wiederholung | Wirkung auf die Schleusen | Wirkung auf den Lauf |
|---|---|---|---|
| Netzfehler, `fetch` wirft | 2 ×, 2 s / 6 s mit Streuung | −1 | keine |
| Ratenbegrenzung | 2 ×, 20 s / 45 s | halbiert, 20 s Sperrzeit | ab dem zweiten Mal in Folge Sparfahrt Stufe 2 |
| Kein Lebenszeichen / 45 s | 1 × | −1 | keine |
| Antwort unvollständig (JSON kaputt) | 1 × | keine | keine |
| **401 Zugangscode** | keine | alle Aufgaben angehalten | **Lauf pausiert**, einmalige Abfrage, danach fortsetzen. Drei Fehlversuche → `handbetrieb` |
| 413 Bild zu groß | 1 ×, Kachel neu bei 200 statt 254 dpi | keine | keine |
| Modell lehnt ab (`refusal`) | keine | keine | Seite als „von Hand erfassen" kennzeichnen |
| Kein Schlüssel am Endpunkt (500) | keine | alles anhalten | `handbetrieb` mit Klartext |

Grundsätze:

* **Keine Wiederholung ohne Budget.** Bleiben weniger als 45 s Zeitbudget oder weniger als 0,10
  USD, wird nicht mehr wiederholt, sondern zur Lücke erklärt.
* **Eine gescheiterte Kachel scheitert nicht die Seite.** Die Seite steht dann auf `teilweise`;
  im Raumbuch und im Berichtskapitel „Offene Punkte" steht, welcher Ausschnitt nicht ausgewertet
  wurde. Fachlich ist das der wichtigste Satz dieses Dokuments: **ein nicht gelesener Bereich muss
  sichtbar bleiben, sonst wird aus einer Lücke ein stillschweigend fehlender Raum.**
* **Der Zugangscode wird nie mitten in einer Welle abgefragt.** Sonst kommen sechs Abfragen
  gleichzeitig. Der erste 401 hält den Lauf an, fragt einmal, und setzt fort.

---

## 10 Ohne Endpunkt, ohne Zugangscode

### 10.1 Erkennen, bevor es weh tut

Einmal je Sitzung, beim Betreten von Schritt 1, ein `GET` auf den Endpunkt mit 3 s Frist. Der
Endpunkt beantwortet `GET` mit einer Selbstauskunft ohne Geheimnisse und ohne Zugangscode
[Quelltext] — das reicht, um drei Fälle zu unterscheiden:

| Befund | Anzeige an der Ablagefläche |
|---|---|
| Erreichbar, `zugangscode_gesetzt: true`, Code liegt im Browser | „Auslese bereit" |
| Erreichbar, kein Code im Browser | „Auslese bereit, Zugangscode fehlt noch" |
| Nicht erreichbar oder kein Netz | „Auslese nicht verfügbar. Pläne werden trotzdem aufbereitet; Räume dann von Hand umfahren." |

Das Ergebnis liegt in `sessionStorage`, damit nicht bei jedem Rendern geprüft wird.

### 10.2 Wo gefragt wird

Nicht beim Ablegen der Dateien, sondern **erst beim Übergang von `aufbereitung` nach `sichtung`**.
Bis dahin hat das Werkzeug schon gearbeitet, und die Frage ist nicht mehr „gibst du mir einen
Code, bevor irgendetwas passiert", sondern „soll ich die vorbereiteten Seiten jetzt auslesen".
Die Abfrage hat zwei **gleich große** Knöpfe:

```
Zugangscode für die Planauslese
Den Code nennt dir Sebastian Hund. Einmal je Rechner, danach merkt der Browser ihn.

[ Code eintragen und auslesen ]        [ Ohne KI weiterarbeiten ]
```

Der zweite Weg führt nach `handbetrieb` und ist kein Notausgang, sondern der Weg, den es heute
schon gibt: Seite wählen, Maßstab setzen, umfahren. Die Aufbereitung hat ihn nur bequemer
gemacht.

### 10.3 Nichts am Netz darf blockieren

* `modul_lauf.js` ist optional. Fehlt es, verhält sich Schritt 1 exakt wie heute.
* Kein Zustand außer `sichtung` und `auswertung` berührt das Netz. Rechnen, Prüfen und Berichten
  bleiben vollständig lokal — die Grundregel aus `BAUPLAN.md` gilt unverändert.
* Fällt das Netz mitten in der Auswertung aus, greift die Fehlerbehandlung: Schleusen auf 1,
  Wiederholungen, danach `angehalten` mit übernehmbarem Teilergebnis.

---

## 11 Einbau in die vorhandene Struktur

### 11.1 Neue Dateien

| Datei | Inhalt | Prüfbar ohne Oberfläche |
|---|---|---|
| `src/kerne/kern_lauf.js` | reine Logik: Zustandsübergänge, Warteschlange, Schleusenregelung, Rückzugsstufen, Budgetrechnung, Aufgabenkennungen. Kein DOM, kein `fetch` | ja, mit `selbsttest()` wie die übrigen Kerne |
| `src/modul_lauf.js` | Anbindung: `fetch` mit `AbortController` und Stromleser, Kachelaufbereitung, Fortschrittsanzeige, Knöpfe | teilweise |
| `src/modul_ablage.js` | IndexedDB: Schreiben, Lesen, Aufräumen, Umgang mit `QuotaExceededError` | teilweise |

Die Trennung folgt der im Haus üblichen: `kern_*` rechnet und ist mit `selbsttest()` nachweisbar,
`modul_*` fasst Browser und Oberfläche an.

### 11.2 Änderungen an vorhandenen Dateien

| Datei | Änderung | Umfang |
|---|---|---|
| `src/app.js` | `App.lauf` als Feld; `leeresProjekt()` um `plan.seiten: []` und `plan.lauf: null` erweitern; `schrittPlan()` ruft `MODUL_LAUF.html()`, wenn vorhanden; `speichern()`/`laden()` nehmen die Seitenliste mit (Bericht Kapitel 3) | klein |
| `src/modul_plan.js` | Die PDF-Absage in `dateiLesen()` (Z. 272–275) entfällt, Seiten kommen künftig vom Lauf. `bildLaden()` bekommt zusätzlich eine Seitenkennung, damit `inProjektSichern()` mehrere Seiten sauber unterscheidet (`S.aktuelleId` ist dafür schon angelegt) | klein |
| `src/modul_ki.js` | `auslesen()` wird zum Sonderfall „Lauf mit einer Aufgabe" und ruft den Lauf. Übernahme-Oberfläche, `feldWert`, `artZuordnen`, das Schwärzen und der Umgang mit dem Zugangscode bleiben, wandern aber in gemeinsam genutzte Funktionen | mittel |
| `api/.../plan-auslesen.mjs` | Nur zwei additive Punkte, siehe O1: mehrere Bilder je Aufruf für die Sichtung, und `code`/`warte_s` im Fehlerfall. Beides abwärtsverträglich | klein, aber außerhalb dieser Spezifikation |

### 11.3 Ereignisse

Der Lauf hängt sich in das vorhandene Muster: Knöpfe tragen `data-aktion`, `modul_lauf.aktion(name, el)`
gibt `true` zurück, wenn es die Aktion behandelt hat. Neue Aktionen: `laufStarten`,
`laufPausieren`, `laufFortsetzen`, `laufAbbrechen`, `laufUebernehmen`, `laufSeiteRolle`,
`laufStufeZurueck`, `laufDeckelAnheben`.

---

## 12 Was `kern_lauf.selbsttest()` nachweisen muss

Ohne diese Nachweise ist die Steuerung nicht abgenommen:

1. Aufgabenkennungen sind stabil: dieselbe Datei zweimal abgelegt ergibt keine neue Aufgabe.
2. Reihum-Ordnung: bei 5 Seiten × 6 Kacheln liegt nach 10 fertigen Kacheln für jede Seite
   mindestens eine vor.
3. Schleusenregelung: 4 → nach 4 Erfolgen 5; Ratenbegrenzung → 2; zweimal in Folge → Stufe 2.
4. Untergrenze: die Schleusenzahl fällt nie unter 1 und steigt nie über 6.
5. Budgetvorschau: 19 fertige Aufgaben mit bekanntem Mittel ergeben die erwartete Restzeit.
6. Rückzug: Vorschau über 4:00 setzt Stufe 2, über 5:00 Stufe 3, und die Aufgabenzahl sinkt
   entsprechend.
7. Wiederholungen: höchstens 2 je Aufgabe, keine mehr unter 45 s Restbudget.
8. Ein 401 hält alle Aufgaben an, nicht nur die eigene.
9. Ein Lauf ohne Endpunkt erreicht `handbetrieb`, ohne eine Aufgabe zu erzeugen.
10. Fortsetzen nach Neuladen wiederholt keine fertige Aufgabe und verliert keine.

---

## 13 Offene Punkte

| Nr. | Punkt | Warum offen, was zu tun ist |
|---|---|---|
| **O1** | Endpunkt: mehrere Bilder je Aufruf, sowie `code` und `warte_s` im Fehlerfall | Ohne Bündelung braucht die Sichtung 10 statt 2 Aufrufe. Das kostet nicht mehr Geld (gleiche Bildtoken), aber mehr Zeit und mehr Kaltstarts. Ohne `code` bleibt die Fehlererkennung ein Textabgleich auf deutschen Meldungen |
| **O2** | Tarifstufe des Workspace: Aufrufe und Eingabetoken je Minute | Bei 6 Schleusen liegt der Spitzenbedarf bei rund 153.000 Eingabetoken je Minute. Die geltende Grenze steht in den Kontoeinstellungen und ist hier nicht belegt. Die selbstregelnde Steuerung kommt ohne die Zahl aus, aber die Voreinstellung ließe sich mit ihr besser wählen |
| **O3** | Gleichzeitige Aufrufe bei Netlify | Nicht geprüft. Bei sechs gleichzeitigen Funktionsaufrufen könnte der Hoster selbst begrenzen; das erschiene als Netzfehler und würde die Schleusen unnötig drosseln |
| **O4** | Antwortzeiten sind Annahmen | Alle Dauern in Abschnitt 6 hängen am Anker von 20 s. Vor dem Ausrollen an zehn echten Planseiten messen und die Tabelle ersetzen |
| **O5** | Preisstand | Der Einführungspreis für `claude-sonnet-5` endet am **31.08.2026**. Ab dem 01.09.2026 steigt derselbe Bericht von 0,85 auf 1,27 USD. Der Preis muss im Werkzeug als Datenfeld mit Datum stehen, nicht im Code verstreut |
| **O6** | Speicherkontingent von IndexedDB | Nicht gemessen. Der Rückfallweg aus 8.4 ist entworfen, aber nicht erprobt |
| **O7** | Seiten aus verschiedenen Bauvorhaben | Die Sichtung soll Fremdunterlagen erkennen (abweichender Blattkopf). Wie zuverlässig das ist, ist nicht gemessen. Bis dahin entscheidet das Tor |
| **O8** | Zwei Grundrisse desselben Geschosses | Kommt vor (Möblierungsplan neben Maßplan). Heute entscheidet der Bearbeiter im Tor; eine automatische Bevorzugung des Maßplans wäre möglich, ist aber nicht belegt |

---

## 14 Quellen

| Nr. | Quelle |
|---|---|
| Q1 | `SPEZIFIKATION_FORMATE.md`, eigene Messungen vom 20.08.2026: Kachelvorschrift 1932×1932 und 4.761 Bildtoken (5.5), 6 Kacheln je A3 bei 254 dpi (5.5), 355 ms je Kachel und 7,1 s Gesamtdurchlauf am A1-Plan (5.5), Übersichtsbild 2275×1609 = 4.756 Token (5.3), Speicherbedarf 98 MB für 24,5 MP (5.2), Seitentyp ohne Modellaufruf aus Textschicht und Operatorliste (6.1), pdf.js im Hauptthread über `file://` (3.2) |
| Q2 | Bildtoken = ⌈Breite/28⌉ × ⌈Höhe/28⌉, hochauflösende Stufe 2576 px und 4.784 Token: platform.claude.com/docs/en/build-with-claude/vision |
| Q3 | Preise `claude-sonnet-5`: 3,00 USD je Mio. Eingabetoken und 15,00 USD je Mio. Ausgabetoken, Einführungspreis 2,00 / 10,00 USD **bis 31.08.2026**; Modellübersicht, Stand 24.06.2026 |
| Q4 | Verhalten des Endpunkts: `api/netlify/functions/plan-auslesen.mjs` — Lebenszeichen alle 3.000 ms und Antwort im Datenstrom (Abschnitt „WARUM STREAMING"), `_verbrauch` mit Ein- und Ausgabetoken, 401 vor dem Datenstrom mit 2 s Bremse, `GET` als Selbstauskunft ohne Zugangscode |
| Q5 | Eignungsprüfung und ihre Urteile: `src/kerne/kern_planpruefung.js` |
| Q6 | Grundregel „ohne Netz voll benutzbar", Maßstab immer von Hand: `BAUPLAN.md` Abschnitt 2 und 3 |
| Q7 | Anker für Kosten und Dauer einer vollen Planseite (rund 5 Cent, rund 20 s): Aufgabenstellung vom 20.08.2026 |
