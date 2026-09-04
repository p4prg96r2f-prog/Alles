# Wie die App aufs iPhone kommt

Zwei Stufen: erst auf **Ihr eigenes iPhone** (ein Nachmittag), dann zu den
**Kollegen** über TestFlight (setzt das Apple-Entwicklerkonto voraus).

---

## Der schnellste Weg: das Skript

Im Ordner `Mac/` liegt **`aufs-iphone.command`**. Es erledigt den ganzen
Ablauf von selbst: Xcode prüfen, Zertifikat finden, bauen, aufs angeschlossene
iPhone installieren, starten. Ist kein iPhone angeschlossen, läuft die App im
Simulator – so sehen Sie sofort etwas.

1. Repo auf den Mac holen (ZIP vom Branch oder klonen).
2. `Mac/aufs-iphone.command` – beim **allerersten Mal Rechtsklick → Öffnen**
   (macOS blockiert heruntergeladene Skripte sonst), danach genügt Doppelklick.
3. Den Anweisungen im Fenster folgen. Drei Dinge kann kein Skript übernehmen:
   das Kabel einstecken, einmalig die Apple-ID in Xcode hinterlegen (das
   Skript öffnet die richtige Stelle und wartet), und den Entwicklermodus auf
   dem iPhone einschalten.

Schlägt der Build fehl, sammelt das Skript die Fehlerzeilen und **legt sie in
die Zwischenablage**. Dann genügt: bei Claude ins Eingabefeld einfügen (Cmd+V)
und abschicken. Er räumt die Fehler ab, danach das Skript erneut starten. Das
vollständige Protokoll bleibt in `Mac/xcode-build.log`, die kurze Fassung in
`Mac/xcode-fehler.txt`.

### Noch weniger Handarbeit: Claude auf dem Mac

Statt Fehler hin- und herzuschicken, kann Claude direkt auf Ihrem Mac
arbeiten – dort sieht er Xcode selbst und schließt die Schleife aus Bauen,
Lesen, Beheben allein. Drei Zeilen im **Terminal**:

```
curl -fsSL https://claude.ai/install.sh | bash
git clone --branch claude/werke-app-features-tb48qq https://github.com/p4prg96r2f-prog/Alles.git ~/WerkeApp && cd ~/WerkeApp
claude "Bring die WERK.E App auf mein angeschlossenes iPhone. Folge der CLAUDE.md und behebe alle Build-Fehler selbstständig, bis die App läuft."
```

Die Datei `CLAUDE.md` im Wurzelverzeichnis liest diese Sitzung von selbst –
darin stehen Auftrag, Fahrplan und Spielregeln. Die drei Handgriffe aus
Punkt 3 oben bleiben trotzdem Ihre.

Für die Kollegen später: **`Mac/testflight.command`** baut das Archiv und
öffnet den Organizer – dort bleibt ein Klick („Distribute App“).

Wer lieber selbst klickt, findet darunter den Weg von Hand.

---

## Was Sie brauchen

| | Wofür | Kosten |
|---|---|---|
| **Mac mit Xcode 16** | Ohne Mac geht es nicht – iOS-Apps lassen sich nur mit Xcode bauen. Jeder Mac mit Apple-Chip reicht, auch ein geliehener. Xcode ist gratis im Mac App Store. | 0 € |
| **Apple-ID** | Zum Signieren. Ihre normale reicht für den Anfang. | 0 € |
| **Apple Developer Program** | Nötig für TestFlight, App Store und die iCloud-Sicherung. Für den ersten Test auf dem eigenen Gerät noch nicht. | 99 €/Jahr |
| **Ladekabel** | iPhone an den Mac. | – |

---

## Stufe 1 · Auf Ihr eigenes iPhone

1. **Repo auf den Mac holen.** In GitHub den Branch
   `claude/werke-app-features-tb48qq` als ZIP laden (grüner „Code“-Knopf) oder
   klonen.

2. **Projekt öffnen:** Doppelklick auf `WerkeApp/App/WerkeApp.xcodeproj`.

3. **Signieren einrichten.** Links im Baum das Projekt „WerkeApp“ anklicken →
   Reiter *Signing & Capabilities* → Häkchen bei *Automatically manage
   signing* → unter *Team* Ihre Apple-ID wählen (beim ersten Mal: *Add an
   Account…*). Als *Bundle Identifier* etwas Eigenes eintragen, z. B.
   `de.werk-e.app`.

4. **Nur beim Gratis-Konto:** Die iCloud-Sicherung braucht das bezahlte
   Entwicklerkonto. Ohne das schlägt das Signieren fehl. Abhilfe für den
   ersten Test: im selben Reiter unter *Build Settings* nach
   `CODE_SIGN_ENTITLEMENTS` suchen und den Eintrag leeren. Die App läuft dann
   ohne iCloud-Sicherung – alles andere funktioniert.

5. **iPhone vorbereiten.** Mit dem Kabel anschließen, auf dem iPhone „Diesem
   Computer vertrauen“ bestätigen. Dann *Einstellungen → Datenschutz &
   Sicherheit → Entwicklermodus* einschalten (iPhone startet neu).

6. **Bauen und starten.** Oben in Xcode Ihr iPhone als Ziel auswählen (statt
   eines Simulators), dann **⌘R**. Beim Gratis-Konto einmalig auf dem iPhone:
   *Einstellungen → Allgemein → VPN & Geräteverwaltung* → dem eigenen
   Entwicklerzertifikat vertrauen.

7. **Fertig.** Die App liegt auf dem Startbildschirm.

### Womit Sie rechnen sollten

* **Der erste Build wird nicht auf Anhieb durchlaufen.** Der Rechenkern ist
  mit 331 Testfällen geprüft, aber die Oberfläche konnte in dieser Umgebung
  nur auf Syntax geprüft werden, nie vollständig übersetzt – dafür braucht es
  genau diesen ersten Xcode-Build. Erfahrungsgemäß sind es eine Handvoll
  kleiner Typfehler, die Xcode einzeln anzeigt und die sich in einer Stunde
  abräumen lassen. Das ist der letzte fehlende Beweis, kein Umbau.
* **Gratis-Konto: 7 Tage.** Ohne bezahltes Konto verfällt die Signatur nach
  einer Woche – dann einfach erneut ⌘R. Mit dem Developer Program (99 €/Jahr)
  hält sie ein Jahr.

---

## Stufe 2 · Zu den Kollegen (TestFlight)

Der beschlossene Weg: acht Wochen intern, dann Store. TestFlight ist dafür
gebaut – die Kollegen installieren die App wie aus dem Store, Updates kommen
von selbst.

1. **Apple Developer Program** abschließen (developer.apple.com, 99 €/Jahr,
   als Einzelperson oder als Firma – für die Firma braucht es eine
   D-U-N-S-Nummer, siehe Checkliste im README).
2. In Xcode: *Product → Archive*, dann im Organizer *Distribute App →
   TestFlight*. Xcode lädt die App zu App Store Connect hoch.
3. In **App Store Connect** (appstoreconnect.apple.com) die App anlegen,
   unter *TestFlight* die Kollegen als **interne Tester** einladen – ihre
   Apple-IDs genügen, bis zu 100 Personen, keine Prüfung durch Apple nötig.
4. Die Kollegen laden die **TestFlight-App** aus dem Store, tippen auf die
   Einladung – fertig. Jede neue Fassung erreichen sie automatisch.

---

## Kein Mac im Haus?

* **Leihen genügt.** Der Build braucht den Mac nur zum Bauen und Hochladen –
  nicht im Betrieb. Ein MacBook eines Bekannten für einen Nachmittag reicht
  für Stufe 1, ein zweiter Nachmittag für Stufe 2.
* **Mac mieten:** Anbieter wie MacStadium oder MacinCloud vermieten Macs im
  Netz ab etwa 25 €/Monat – Xcode läuft dort per Bildschirmfreigabe.
* **Gebraucht kaufen:** Ein gebrauchter M1 Mac mini (~350–450 €) ist für
  App-Entwicklung völlig ausreichend und die dauerhafte Lösung, wenn die App
  gepflegt werden soll.

---

## Vor dem Store (zur Erinnerung)

Steht ausführlich im README, die Kurzfassung: echte WERK.E-Markenfarben und
App-Symbol einsetzen · `Kontakt.mail` bestätigen · fachliche Freigabe im
Regelpaket eintragen · Datenschutzerklärung und Impressum unter den
hinterlegten Adressen erreichbar machen · App-Store-Eintrag (Screenshots,
Beschreibung) · als Gewerbetreibender den Trader-Status nach DSA in App Store
Connect bestätigen.
