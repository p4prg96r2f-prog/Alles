# RECOVERY_PLAN — technische Rettung des WERK.E Heizlast-Tools

Stand 27.08.2026. Ausgangspunkt war der hochgeladene Projektordner
`heizlast_tool` (24 MB, 129 Dateien), nicht die veröffentlichte Seite.

## Was tatsächlich kaputt war

Die Annahme des Auftrags — eine sehr große Einzel-HTML-Datei, in der
Berechnung, Oberfläche, Planauslese und Berichte durcheinanderliegen —
trifft auf diesen Stand **nicht mehr zu**. Das Projekt ist bereits
getrennt: `src/kerne/` rechnet, `src/daten/` hält Stammdaten,
`src/modul_*.js` bedienen Oberfläche, Plan, Bericht und PDF, und
`build.py` schnürt daraus die Einzeldatei. Die 5,46-MB-HTML ist ein
**Erzeugnis**, keine Quelle.

Kaputt war etwas anderes, und zwar an einer Stelle, die alles blockierte:

| # | Befund | Wirkung |
|---|---|---|
| B1 | `validierung/planpruefung_test.js` las seine Prüfbilder aus `/private/tmp/claude-501/…/scratchpad/pruefdaten` — einem Arbeitsverzeichnis auf dem Rechner des Verfassers. Die Bilder lagen nie im Projekt. | `build.py` brach an Schritt 2b mit ENOENT ab. Weil der Bau bei jedem Fehlschlag abbricht, ließ sich **keine neue Fassung mehr bauen** — auf keinem Rechner, auch nicht auf dem des Verfassers, sobald `/tmp` geleert war. |
| B2 | `H_T` wurde aus der Gebäudesumme zurückgerechnet: `phi_T / (20 − theta_e)`. Die Summe entsteht je Raum mit dessen Innentemperatur. | Bei gemischten Raumtemperaturen falsch. Am Referenzfall Mälzerstraße 3,10 % zu niedrig; der Fehler geht in beide Richtungen. |
| B3 | Eine im Projekt angegebene Lüftungsanlage mit Wärmerückgewinnung wurde ohne ein Wort ignoriert. | Das Ergebnis konnte eine Berücksichtigung vortäuschen, die es nicht gab. |
| B4 | Der echte Zugangscode der Live-Seite stand als Testwert im Quellcode (`validierung/rettung_test.js`) und in einem Vorschlag in `README.md`. | Zugangshürde der veröffentlichten Seite im Klartext im Projektordner. |
| B5 | Keine einzige Prüfung belegte, dass fremder Text im HTML maskiert wird. | Ein vergessenes `esc()` wäre niemandem aufgefallen. |
| B6 | Ein leeres Deckblatt bekam die Meldung „steht um rund 3,0 Grad schief". | Erfundene Zahl, irreführender Rat. |
| B7 | Bedienelemente bei Fingerbedienung 16 bis 28 px hoch. | Unter der üblichen Untergrenze von 44 px. |

## Sicherungspunkt

Der Ausgangsstand liegt als erster Commit im Repository:

```
git checkout f1c4e9a -- heizlast_tool/     # Ausgangsstand wiederherstellen
git log --oneline heizlast_tool/           # alle Schritte einzeln
```

Zwei Dateien weichen dort bewusst vom Archiv ab, beide **vor** dem ersten
Commit bereinigt, damit der Zugangscode nie in die Historie gerät (B4):
`validierung/rettung_test.js` und `README.md`. Die Prüfsummen des
unveränderten Archivstands stehen in `BASELINE_REPORT.md`.

Nicht eingecheckt sind die Erzeugnisse des Baus
(`WERKE_Heizlast_Tool.html`, `api/deploy/`, die Deploy-Zips). Sie
entstehen reproduzierbar mit `python3 build.py`.

## Vorgehen

Jede Phase endet mit einem eigenen Commit, jeder Commit läuft durch
`python3 build.py`.

1. **Bestandsaufnahme und Sicherung** — Archiv übernehmen, Zugangscode
   entfernen, Prüfsummen festhalten, alle Tests einzeln laufen lassen,
   Datenfluss und Risiken aufnehmen. → `BASELINE_REPORT.md`
2. **Bau wieder lauffähig machen** — B1. Prüfbilder aus Code erzeugen
   (`validierung/planbilder.js`), Test prüft zusätzlich den *Grund* jeder
   Sperre.
3. **Rechenkern absichern** — 23 Referenzfälle mit von Hand hergeleiteten
   Sollwerten (`validierung/referenz_test.js`), zweite unabhängige
   Implementierung als Gegenrechnung
   (`validierung/referenz_gegenrechnung.py`). Erst danach B2 und B3
   berichtigen, jeweils mit vorher fehlschlagendem Test.
4. **Sicherheit** — B5 schließen (`validierung/sicherheit_test.js`),
   Endpunkt gegen eingeschleuste Anweisungen härten.
5. **Oberfläche** — B6 und B7, Browserprobe an der gebauten Datei in den
   Bau aufnehmen (`validierung/browser_test.mjs`, Schritt 8).
6. **Abnahme** — ein Befehl für alles, dokumentiert in `CLAUDE.md` und
   `README.md`. Unabhängige Durchsicht des fertigen Codes.

## Was bewusst nicht getan wurde

- **Keine Umstellung auf TypeScript, kein Framework, keine neue
  Verzeichnisstruktur.** Die vom Auftrag gewünschte Trennung
  (`src/core`, `src/domain`, `src/plan`, `src/ui`, `src/report`) ist
  sachlich schon vorhanden, nur mit deutschen Namen: `src/kerne`,
  `src/daten`, `src/modul_plan.js`, `src/app.js`, `src/modul_bericht.js`.
  Eine Umbenennung hätte 33 Dateien, 399 globale Namen und rund 14.000
  Prüfungen angefasst, ohne eine einzige Zahl richtiger zu machen. Der
  Auftrag verlangt ausdrücklich, sich an das vorhandene Gerüst
  anzupassen und keine Migration durchzuführen, die für die Trennung
  nicht erforderlich ist.
- **Keine Formel erfunden.** Zur Lüftungsanlage mit Wärmerückgewinnung
  (B3) wurde nichts gerechnet, sondern gemeldet, dass sie nicht
  abgebildet ist. Die Umsetzung braucht den Normtext und eine fachliche
  Freigabe.
- **Keine Veröffentlichung.** Der Auftrag gibt dafür keine Freigabe. Die
  gebaute Datei liegt lokal und ist geprüft; das Ablegen bei Netlify
  bleibt beim Auftraggeber.
