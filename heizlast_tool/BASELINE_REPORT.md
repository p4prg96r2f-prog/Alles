# BASELINE_REPORT — Zustand bei Übernahme

Aufgenommen am 27.08.2026 am hochgeladenen Projektordner `heizlast_tool`
(24 MB, 129 Dateien). Die veröffentlichte Seite diente nur zum Vergleich.

## 1 Herkunft und Sicherungspunkt

Der Ordner war **kein Git-Repository** — es gab keine Historie, keine
nicht commiteten Änderungen und nichts, was verloren gehen konnte. Der
einzige Git-Bezug war ein Arbeitsverzeichnis von Claude Code unter
`.claude/worktrees/`, das eine fremde Datei aus dem Repository `Alles`
enthielt; es ist nicht Teil des Projekts und wurde nicht übernommen.

Der unveränderte Archivstand ist über Prüfsummen belegt. Die wichtigsten:

| Datei | Bytes | SHA-256 (Anfang) |
|---|---|---|
| `WERKE_Heizlast_Tool.html` (Erzeugnis) | 5.718.869 | `78e8dc712276b620…` |
| `api/deploy/index.html` (dieselbe Datei) | 5.718.869 | `78e8dc712276b620…` |
| `api/WERKE_Heizlast_Web.zip` | 1.952.054 | `8804d5eff32b5204…` |
| `api/WERKE_Ausleseendpunkt.zip` | — | `f96c2fa00ff34ca8…` |

Die vollständige Liste aller 129 Dateien mit Prüfsumme liegt außerhalb
des Repositorys; sie ist mit
`find heizlast_tool -type f -exec sha256sum {} \;` reproduzierbar.

**Sicherungspunkt:** Commit `f1c4e9a` im Repository. Zwei Dateien weichen
dort bewusst vom Archiv ab, beide vor dem ersten Commit bereinigt:
`validierung/rettung_test.js` (Zeile 491) und `README.md` (Zeile 797)
enthielten den **echten Zugangscode der Live-Seite** im Klartext. Er darf
laut Auftrag in keinem Quellcode und keinem Commit erscheinen, deshalb
stehen dort jetzt Platzhalter. Sonst ist nichts verändert.

## 2 Vergleich mit der veröffentlichten Fassung

`https://werke-heizlast.netlify.app/` liefert (27.08.2026, HTTP 200)
**5.718.869 Bytes, SHA-256 `78e8dc712276b620…`** — also **bitgleich** mit
dem Erzeugnis im Archiv. Lokaler Ordner und veröffentlichte Fassung waren
damit im gleichen Stand.

Folge des Befundes B2: die veröffentlichte Fassung trägt den fehlerhaften
H_T-Ausdruck (`phi_T_gebaeude / (20.0 - theta_e)`) ebenfalls. Nachweis:
die Zeichenkette steht genau einmal in der ausgelieferten Datei.

## 3 Architektur und Einstiegspunkte

Anders als vom Auftrag vermutet ist das Projekt **nicht mehr
monolithisch**. Die Einzeldatei ist ein Erzeugnis.

```
build.py                    Bau in 35 Schritten, bricht bei Fehlschlag ab
src/template.html    34 KB  Gerippe und CSS
src/app.js          675 KB  Oberfläche, Ablaufsteuerung, Zustand
src/kerne/                  reine Rechen- und Prüfkerne, DOM-frei
  kern_heizlast_norm.js  74 KB   Norm-Heizlast (der eigentliche Rechenkern)
  kern_zuordnung.js     164 KB   Auslese-Befunde den Räumen zuordnen
  kern_pruefung.js      142 KB   Selbstprüfung, Sperren, Befunde
  kern_massstab.js      139 KB   Maßstab auf zwei unabhängigen Wegen
  kern_gegenprobe.js     87 KB   zwei Lesungen gegeneinander
  … 11 weitere
src/daten/                  Stammdaten mit Quellenangabe
  daten_klima.js        180 KB   8.176 Postleitzahlen
  daten_typologie.js     50 KB   IWU-Gebäudetypologie 2015
  … 4 weitere
src/modul_kontrollblatt.js 492 KB  Zähler, Ampel, offene Punkte
src/modul_bericht.js       359 KB  Bericht, zwei Fassungen
src/modul_pdf.js           169 KB  PDF-Auswertung über pdf.js
src/modul_plan.js           82 KB  Plananzeige, Messen, Umfahren
src/modul_ki.js             50 KB  Aufrufe an den Ausleseendpunkt
api/netlify/functions/plan-auslesen.mjs  126 KB  Endpunkt, hält den Schlüssel
vendor/pdfjs/               1,8 MB  pdf.js, Herkunft und Lizenz beigelegt
validierung/                24 Prüfdateien
```

Die vom Auftrag gewünschte Trennung ist damit sachlich vorhanden, nur mit
deutschen Namen: `src/kerne` + `src/daten` entspricht `core` + `domain`,
`modul_pdf`/`modul_plan`/`modul_ki` entspricht `plan`, `app.js` +
`template.html` entspricht `ui`, `modul_bericht` + `modul_pdf` entspricht
`report`.

## 4 Datenfluss vom Plan bis zum Bericht

```
 Datei (PDF/Bild)
   │  modul_pdf.js: Seiten trennen, Art erkennen (Vektor/Scan/Text),
   │                Blattformat, DPI, Textstand auslesen
   ▼
 kern_planpruefung.js  Eignung: Auflösung, Schärfe, Kontrast, Tinte,
   │                   Schräglage → geeignet / eingeschränkt / ungeeignet
   │                   ungeeignet SPERRT, statt nur zu warnen
   ▼
 kern_massstab.js      Maßstab auf zwei unabhängigen Wegen
 kern_flaeche.js       angeschriebene Raumflächen aus dem Textstand
 modul_ki.js ──► api/netlify/functions/plan-auslesen.mjs ──► Anthropic API
   │                   Plan geht als BILD hinaus, Antwort ist ein
   │                   Werkzeugaufruf mit festem Schema
   ▼
 kern_zuordnung.js     Befunde mit Wert, Einheit, Herkunft, Seite,
   │                   Konfidenz, Annahme, Warnung, Status
   │                   ── schreibt NIEMALS unmittelbar in die Rechnung ──
   ▼
 Rückfragen (app.js)   je Befund ein Vorschlag: annehmen oder ablehnen
   ▼
 Raumbuch (Projekt)    Räume, Bauteile, Zonen, Klima, Dichtheit
   ▼
 kern_heizlast_norm.js rechne(projekt) → Raumwerte + Gebäudesummen
   │                   getrennt: phi_raum (mit Innenübertragung, für die
   │                   Heizfläche) und phi_gebaeude (ohne, für den Erzeuger)
   ▼
 kern_pruefung.js      Selbstprüfung: Fehler / Warnung / Hinweis, Sperren
   ▼
 modul_bericht.js      zwei Fassungen: Druck (Kunde) und intern
   ▼
 Druckdialog (PDF) oder Word-Datei
```

Der Rechenkern läuft ohne DOM, ohne `fetch` und ohne `localStorage`
(nachgewiesen: alle 24 Prüfdateien und 32 Modul-Selbsttests laufen unter
Node in einer Attrappe).

## 5 Vorhandene Tests und ihre tatsächlichen Ergebnisse

Gemessen am Ausgangsstand, jede Datei einzeln aufgerufen:

| Prüfung | Ergebnis bei Übernahme | Prüfungen |
|---|---|---|
| 32 Modul-Selbsttests (`build.py` Schritt 1) | **bestanden** | 10.549 |
| `vergleich.js` (externes Referenzmodell) | **bestanden** | Stufe A exakt |
| `klima_gegenprobe.js` | **bestanden** | 8.176 PLZ |
| `planpruefung_test.js` | **FEHLSCHLAG — ENOENT** | 0 |
| `pdf_selbsttest.mjs` | bestanden | 268 |
| `oberflaeche_test.js` | bestanden | 128 |
| `ablauf_test.js` | bestanden | 45 |
| `ergebnisseite_test.js` | bestanden | 43 |
| `rueckfragen_test.js` | bestanden | 60 |
| `vorschlagspflicht_test.js` | bestanden | 163 |
| `hasenberg_echtlauf_test.js` | bestanden | 35 |
| `befunde_2026-08-26_test.js` | bestanden | 122 |
| `uebernahme_test.js` | bestanden | 197 |
| `neubau_2023_test.js` | bestanden | 56 |
| `ziolkowski_test.js` | bestanden (nachgestellt) | 71 |
| `rettung_test.js` | bestanden | 139 |
| `sicherung_test.js` | bestanden | 51 |
| `nie_nan_test.js` | bestanden | 210 |
| `verdrahtung_test.js` | bestanden | 1.183 |
| `api/test_endpunkt.mjs` | bestanden | 122 |
| `pdf_echtprobe.mjs` | Handwerkzeug, braucht eine PDF als Argument | — |
| `bericht_reinheit.js` | wird aus `build.py` mit Argument aufgerufen | — |

**`python3 build.py` brach ab.** Ein einziger Fehlschlag an Schritt 2b
verhinderte den Bau und damit jede Veröffentlichung.

Was in der Prüflandschaft **fehlte**: eine Probe auf Maskierung fremden
Textes (XSS), eine Probe im echten Browser, und Sollwerte, die nicht aus
dem Prüfling selbst stammen.

## 6 Rundung, Einheiten, Fehlerbehandlung

- Gerechnet wird durchgehend mit vollen Gleitkommawerten; `rnd()` und
  `znr()` runden erst in der Darstellung. Belegt durch Referenzfall R23:
  mit U = 1/3 kommt 320,0 W heraus, nicht die 316,8 W des auf zwei
  Stellen gerundeten U.
- Einheiten sind an den Feldnamen gebunden (`A` m², `U` W/(m²K), `phi` W,
  `H` W/K, `V` m³, `theta` °C). `zahl()` nimmt deutsche Dezimalkommas als
  Text an (R20).
- Fehlendes oder unbrauchbares Klima fällt auf die **kältesten** Werte
  der eigenen PLZ-Tabelle zurück (−19,2 °C / 0,1 °C) und meldet
  Ersatzwert *und* Fehlerrichtung. Die Richtung ist bewusst „eher zu
  groß" (R15).
- Kein stiller Standardwert: ein gültiges 0 °C bleibt 0 °C, ein
  unbrauchbarer Text wird wie „fehlt" behandelt und nicht zu 0 (R15c).

## 7 Speicherung von Nutzerdaten

Fünf Schlüssel im `localStorage` des Browsers:

| Schlüssel | Inhalt | löschbar |
|---|---|---|
| `werke_hl_sicherung` | Zwischenspeicher des ganzen Projekts, also Gebäudedaten samt Bezeichnung und Adresse | ja, über die Oberfläche |
| `werke_hl_sicherung_beiseite` | dasselbe, beiseitegelegt | ja |
| `werke_hl_endpunkt` | Adresse des Endpunkts **und der Zugangscode** | ja, Code leer lassen |
| `werke_hl_bearbeiter` | Name und Funktion des Bearbeiters | ja |
| `werke_hl_standort` | gewählter Briefkopf | ja |

Projektdateien liegen sonst als Datei beim Bearbeiter. Es gibt keine
Serverdatenbank und keine Anmeldung.

## 8 Externe Netzaufrufe

Im Browser: **keine**, außer der Planauslese. Nachgewiesen mit der
Browserprobe — 0 Netzaufrufe auf Desktop- und Mobilgröße über den
gesamten Ablauf (`validierung/browser_test.mjs`, seit dem 27.08.2026
Schritt 8 des Baus).

Die Planauslese ruft `POST /.netlify/functions/plan-auslesen` mit dem
Kopfeintrag `x-werke-code` auf. Der Endpunkt hält den Anthropic-Schlüssel
serverseitig und sendet:

- bei der Planauslese das **Blatt als Bild** (JPEG, höchstens 6 MB) und
  einen Auftragssatz,
- bei der Bewertung ein **Zahlenpaket** mit Rechenergebnissen. Von den
  Objektangaben geht dabei nur `bezeichnung` mit hinaus — Bauherr,
  Straße, PLZ und Ort bleiben ausdrücklich im Browser. Trägt die
  Bezeichnung eine Adresse (üblich: „Mälzerstraße 59"), verlässt diese
  Adresse damit das Haus.

## 9 Risiken

**Technisch**

| Stufe | Risiko |
|---|---|
| behoben | Bau nicht reproduzierbar (B1) — der schwerste Befund, er blockierte alles |
| behoben | keine XSS-Probe (B5) — die Maskierung war da, ein Beweis nicht |
| offen, gering | `src/app.js` mit 675 KB und `modul_kontrollblatt.js` mit 492 KB sind für eine Datei sehr groß; eine Aufteilung ist wünschenswert, aber kein Fehler und ohne Testnetz teuer |
| offen, gering | 399 Namen im gemeinsamen globalen Raum der Einzeldatei; der Bau prüft auf Doppelvergabe, das trägt |
| offen | die Kalibrierschwellen der Planprüfung sitzen jetzt an **synthetischen** Bildern; ob sie an echten Bürounterlagen richtig sitzen, ist nicht belegt (die Originalbilder sind verloren) |
| offen, mittel | **Mehrere Geschosse auf einem Blatt**: stehen drei Geschosse nebeneinander, erkennt das Werkzeug höchstens einen Geschosstitel. Zwei Ursachen, beide nachgemessen (`validierung/planakten_test.js`, P05): `zeilenBilden()` fasst Text gleicher Höhe zu **einer** Zeile zusammen, und `geschosstitelLesen()` bricht nach dem ersten Treffer ab; zusätzlich ist die Schwelle 1,2 × die **mittlere** Schriftgröße des Blattes, sodass auf einem dünn beschrifteten Blatt der Titel den Median selbst nach oben zieht und aus seiner eigenen Schwelle fliegt (gemessen: Median 14 pt, Schwelle 16,8 pt, Titel 14 pt → null Titel). Folge: die Räume der oberen Geschosse bekommen keine Geschosszuordnung aus dem Plan und müssen im Raumbuch von Hand gesetzt werden. Die **Flächen** sind nicht betroffen, die kommen vollständig und exakt. Vorschlag: Titel nicht über große x-Abstände zusammenfassen und die Größenschwelle gegen den Median der **kleinen** Schriften (Maßzahlen) bilden statt gegen den aller Texte. Bewusst nicht blind geändert: beide Regeln sind an über 180 Seiten echter CAD-Pläne eingestellt, die hier nicht vorliegen. |

**Fachlich**

| Stufe | Risiko |
|---|---|
| behoben | H_T bei gemischten Raumtemperaturen falsch (B2) |
| behoben | Lüftungsanlage mit Wärmerückgewinnung verschwand still (B3) |
| **offen** | Mechanische Lüftung mit Wärmerückgewinnung ist **nicht abgebildet**. Das Werkzeug rechnet immer den natürlichen Luftwechsel, meldet das jetzt aber. Fehlerrichtung: Lüftungslast eher zu groß. |
| **offen** | Das externe Referenzmodell (`heizlast_maelzerstr59/modell.py`), an dem die ganze Validierungskette hängt, liegt **nicht im Projekt**. Ohne es ist `validierung/vergleich.js` nicht von Grund auf nachvollziehbar. |
| **offen** | Der Wortlaut von DIN EN 12831-1:2017-09 und DIN/TS 12831-1:2020-04 lag bei der Erstellung nicht vor. Die Tabellenwerte (f₁ für unbeheizte Bereiche, Mindesttemperaturen, Abschirmkoeffizienten) stehen mit Sekundärquelle im Code. Das ist ehrlich dokumentiert, ersetzt aber keine Prüfung gegen den Normtext. |
| **offen** | Die Zonenbilanz führt keinen Luftwechselterm im Normweg. Als Vereinfachung im Bericht ausgewiesen; die Abweichung zum externen Modell beträgt 0,085 % der Gebäudeheizlast. |
| **offen** | U_equiv erdberührter Bauteile wird als Eingabe erwartet und nicht aus dem Bodenplattenmaß B′ hergeleitet. Ausgewiesen, aber vom Fachplaner zu bestätigen. |

**Zugang**

Der PIN der veröffentlichten Seite ist **keine Authentifizierung**. Er ist
eine Zugangshürde vor der Planauslese: vierstellig, also zehntausend
Möglichkeiten. Der Endpunkt bremst jeden Fehlversuch um zwei Sekunden und
vergleicht in gleichbleibender Zeit; mehr ist ohne Sitzungsverwaltung
serverlos nicht zu holen. Die Seite selbst ist ohne Code lesbar. Wer sie
gegen Unbefugte schützen will, braucht ein abgestimmtes Backend — Schein-
Sicherheit wurde bewusst nicht gebaut. Ein längerer Code (etwa
`werke-<zufall>-heizlast`) wäre die billigste wirksame Verbesserung.

## 10 Oberfläche, Browser, Mobilgerät

Gemessen an der gebauten Einzeldatei in Chromium, Demo-Projekt
(`?demo=1`), 1440 × 900 und 390 × 844:

| Punkt | Ergebnis |
|---|---|
| Konsolenfehler und -warnungen | **0** auf beiden Größen |
| unbehandelte Ausnahmen | **0** |
| selbsttätige Netzaufrufe | **0** |
| waagerechtes Überlaufen | keines (390 px Inhalt bei 390 px Fenster) |
| Schrittleiste durchklickbar | 4 von 4 Seiten, jede mit Inhalt |
| `NaN` oder `undefined` auf der Seite | keines |
| Fokus mit Tabulatortaste | erreicht 10 von 10 geprüften Elementen sichtbar |
| Bedienelemente unter 32 px bei Fingerbedienung | vorher 15, jetzt 9 (die restlichen sind Tabellenzeilen, dort ist die Zeile selbst das Ziel) |

Bildschirmfotos des Hauptablaufs auf beiden Größen wurden aufgenommen
(Startseite, Unterlagen, Rückfragen, Ergebnis, Expertenmodus). Sie sind
mit `node validierung/browser_test.mjs` reproduzierbar.

## 11 Reproduzierbarer Bau

```
cd heizlast_tool
python3 build.py
```

35 Schritte, rund 14.000 Prüfungen, Abbruch bei jedem Fehlschlag,
Erzeugnis `WERKE_Heizlast_Tool.html` (5,46 MB). Vorausgesetzt sind
Python 3 und Node (geprüft mit Python 3.11.15 und Node 22.22.2).
Playwright ist nur für Schritt 8 nötig; fehlt es, wird der Schritt
sichtbar übersprungen.
