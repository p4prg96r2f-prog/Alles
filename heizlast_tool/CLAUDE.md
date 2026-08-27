# CLAUDE.md — Arbeitsregeln für dieses Projekt

Kurz gehalten. Wer hier arbeitet, hält sich an diese neun Punkte.

## Der vollständige Prüfablauf

```
python3 build.py
```

Das ist alles. Der Befehl führt in einem Durchlauf aus: Selbsttests aller
Rechenkerne und Module, die Validierung gegen das Referenzprojekt, die
23 Referenzfälle, die Kalibrierung der Planprüfung, die PDF-Probe gegen
pdf.js, Oberflächen-, Ablauf-, Rückfragen-, Rettungs- und
Sicherungsproben, die Gleichstands- und die Sicherheitsprobe, den Endpunkt
ohne Netz, die
Syntaxprüfung, den Produktionsbau der Einzeldatei und zuletzt die
Browserprobe an der fertigen Datei auf Desktop- und Mobilgröße.
Der Bau bricht bei jedem Fehlschlag ab.

Stand 27.08.2026: 37 Schritte, 14.092 ausgewiesene Prüfungen, Abbruch bei
jedem Fehlschlag.

Einzelne Proben einzeln aufrufen:

```
node validierung/referenz_test.js        # 23 Referenzfälle, hergeleitete Sollwerte
node validierung/planakten_test.js       # zehn synthetische Prüfpläne
node validierung/gleichstand_test.js     # dieselbe Zahl in beiden Berichtsfassungen
node validierung/sicherheit_test.js      # fremder Text darf im HTML nichts ausführen
node validierung/vergleich.js            # gegen das externe Referenzmodell
node validierung/browser_test.mjs        # gebaute Datei in Chromium
node src/kerne/kern_heizlast_norm.js selbsttest
```

## Die Regeln

1. **Erzeugnisse des Baus nie von Hand bearbeiten.** `WERKE_Heizlast_Tool.html`,
   `api/deploy/` und die Deploy-Zips entstehen aus `src/` und `assets/`.
   Sie sind nicht eingecheckt. Wer die Einzeldatei ändert, verliert die
   Änderung beim nächsten `python3 build.py`.

2. **Vor der Fehlerbehebung den Regressionstest.** Erst einen Test
   schreiben, der fehlschlägt und den Fehler benennt, dann berichtigen.
   Ein Test, der nach der Berichtigung nicht mehr anschlagen könnte, ist
   kein Test.

3. **Keine Normwerte erfinden.** Keine Klimadaten, keine
   Temperaturanpassungsfaktoren, keine Rechenregeln. Liegt der Normtext
   nicht geprüft vor, wird die Quelle genannt, aus der der Wert stammt —
   und dass sie eine Sekundärquelle ist. Fehlt eine belastbare Quelle,
   bleibt die Stelle offen und wird als offene fachliche Validierung
   gekennzeichnet, nicht mit einem plausiblen Wert gefüllt.

4. **Keine Berechnungsformel ohne fehlschlagenden Test und fachliche
   Begründung ändern.** Die Begründung gehört als Rechnung in den
   Kommentar, damit ein Fachplaner sie ohne den Code nachprüfen kann.

5. **Rechenkern getrennt halten von Oberfläche, Netz und Modell.**
   `src/kerne/` und `src/daten/` laufen ohne DOM, ohne `fetch`, ohne
   `localStorage`. Die Planauslese schreibt niemals unmittelbar in die
   Rechnung: sie erzeugt einen Befund mit Herkunft und Konfidenz, den der
   Bearbeiter annimmt oder ablehnt.

6. **Sollwerte nicht mit dem Prüfling erzeugen.** Ein Schnappschuss der
   eigenen Ausgabe findet spätere Abweichungen, aber keinen Fehler, der
   am Tag der Aufnahme schon drin war. Genau so einer war drin (H_T bei
   gemischten Raumtemperaturen). Neue Sollwerte werden von Hand
   hergeleitet oder kommen aus einer freigegebenen Fremdquelle.

7. **Keine Genauigkeit vortäuschen.** Jede Annahme erscheint im Ergebnis.
   Ein Näherungsverfahren wird als solches gekennzeichnet. Eine
   Kundenfassung entsteht nur bei ausreichender Datengrundlage.

8. **Der Zugangscode der Live-Seite gehört nirgends in dieses
   Verzeichnis.** Nicht in Quellcode, nicht in Tests, nicht in Commits,
   nicht in Protokolle, nicht in Anfragen an fremde Dienste. Er liegt
   ausschließlich in der Umgebungsvariablen `WERKE_CODE` bei Netlify und
   im Browser des Kollegen. Tests benutzen Platzhalter.

9. **Keine Veröffentlichung bei fehlgeschlagener Prüfung.** Läuft
   `python3 build.py` nicht durch, wird nicht ausgeliefert. Auch nicht
   „nur schnell".
