# WERK.E App – Anleitung für Claude

Dieses Depot enthält die iOS-App von WERK.E (Energie-Effizienz-Beratung,
Paderborn): Förderrechner, Heizlast auf fünf Wegen, GModG-Vergleich,
Zählerstand-Erfassung. Alles auf Deutsch – Code, Namen, Kommentare, Antworten.

## Auftrag auf dem Mac: Die App aufs iPhone bringen

Wenn diese Sitzung auf einem Mac mit Xcode läuft, ist das Ziel: **Die App
läuft auf dem angeschlossenen iPhone.** Übernimm den kompletten Weg dorthin
selbstständig – baue, lies Fehler, behebe sie, baue erneut, bis es läuft.

Der fertige Fahrplan steht in `WerkeApp/Mac/aufs-iphone.command` – nutze
seine Logik direkt (oder führe das Skript aus und lies `WerkeApp/Mac/xcode-build.log`):

1. **Team-ID ermitteln:**
   `security find-certificate -c "Apple Development" -p | openssl x509 -noout -subject`
   – das Feld `OU` (10 Zeichen) ist die Team-ID. Fehlt das Zertifikat:
   Xcode öffnen → Settings → Accounts → Apple-ID anmelden (das muss der
   Mensch einmalig tun – darum bitten und warten).
2. **iPhone finden:**
   `xcrun devicectl list devices --json-output …` – Gerät mit Plattform iOS
   und `tunnelState == "connected"`. Kein Gerät: um Kabel + „Vertrauen“
   bitten. Ersatzweise Simulator über `simctl`.
3. **Bauen:**
   ```
   xcodebuild -project WerkeApp/App/WerkeApp.xcodeproj -scheme WerkeApp \
     -configuration Debug -destination "id=<GERAETE-ID>" \
     -derivedDataPath WerkeApp/Mac/.build-iphone \
     -allowProvisioningUpdates DEVELOPMENT_TEAM=<TEAM> build
   ```
   Bei Fehlern rund um Entitlements/iCloud (freies Konto): zusätzlich
   `CODE_SIGN_ENTITLEMENTS=""` anhängen – die iCloud-Sicherung ist optional.
4. **Installieren und starten:**
   `xcrun devicectl device install app` mit der gebauten `.app`, dann
   `xcrun devicectl device process launch --device <ID> de.werk-e.app`.
   Beim ersten Start verlangt iOS: Einstellungen → Datenschutz & Sicherheit
   → Entwicklermodus einschalten (Neustart) – den Menschen anleiten.

### Compile-Fehler beheben – das ist erwartete Arbeit

Der Rechenkern (`WerkeApp/WerkeKern`) ist mit 331 Tests abgesichert und
baut auch unter Linux. Die Oberfläche (`WerkeApp/App/WerkeApp/`) wurde
bisher nur auf Syntax geprüft, nie vom vollen Typprüfer – **eine Handvoll
Typfehler beim ersten Xcode-Build ist normal und einkalkuliert.** Behebe
sie iterativ: bauen, ersten Fehler lesen, minimal korrigieren, erneut
bauen. Ändere dabei die Fachlogik nicht – Fehler in Ansichten werden in
den Ansichten behoben.

## Spielregeln

- **Branch:** Entwickelt, committet und gepusht wird ausschließlich auf
  `claude/werke-app-features-tb48qq`. Keine Pull Requests ohne Auftrag.
- **Kern-Änderungen** nur, wenn `swift test` im Paket `WerkeApp/WerkeKern`
  danach grün ist (`cd WerkeApp/WerkeKern && swift test`).
- **Regelpaket:** Ändert sich `Ressourcen/regelpaket.json`, muss die
  eingebettete Kopie in `RegelpaketEingebettet.swift` wortgleich
  nachgezogen werden (Fassung hochzählen).
- **Nichts erfinden:** Die `Referenzsammlung` bleibt leer, bis echte
  Objekte aus WERK.E-Unterlagen vorliegen. Das Feld `freigabe` im
  Regelpaket trägt nur ein Mensch ein. `Kontakt.mail` ist unbestätigt
  (Kommentar beachten).
- **Die App verschickt nichts von selbst** – jede Nachricht sieht der
  Nutzer vor dem Senden. Diese Linie bei allen Änderungen halten.

## Eckdaten

| Was | Wert |
|---|---|
| Xcode-Projekt | `WerkeApp/App/WerkeApp.xcodeproj`, Schema `WerkeApp` |
| Bundle-ID | `de.werk-e.app` |
| Ziel | iOS 17.0 |
| Rechenkern | SPM-Paket `WerkeApp/WerkeKern` (WerkeKern + WerkeDemo) |
| Tests | `cd WerkeApp/WerkeKern && swift test` |
| Durchlaufprobe | `swift run WerkeDemo` |
| Prüfbericht | `WerkeApp/PRUEFBERICHT_2026-08-18.md` |
| iPhone-Anleitung | `WerkeApp/AUFS_IPHONE.md` |
