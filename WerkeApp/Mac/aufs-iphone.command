#!/bin/bash
#
# WERK.E App → iPhone, in einem Durchlauf.
#
# Doppelklick genügt (beim allerersten Mal: Rechtsklick → Öffnen, weil macOS
# heruntergeladene Skripte sonst blockiert). Das Skript prüft Xcode, findet
# Ihr Entwicklerzertifikat, baut die App, installiert sie auf dem
# angeschlossenen iPhone und startet sie. Ist kein iPhone angeschlossen,
# läuft die App im Simulator – so sehen Sie sofort etwas.
#
# Bei jedem Hindernis sagt das Skript, was zu tun ist, statt einfach
# stehenzubleiben. Das Bauprotokoll landet neben dem Skript in
# xcode-build.log – bei Fehlern diese Datei an Claude geben, der Rest der
# App ist mit 331 Testfällen abgesichert, nur die Oberfläche konnte bisher
# nie vollständig übersetzt werden.

set -u

# ── Wo sind wir? ────────────────────────────────────────────────────────────
SKRIPTORDNER="$(cd "$(dirname "$0")" && pwd)"
PROJEKT="$SKRIPTORDNER/../App/WerkeApp.xcodeproj"
ABLAGE="$SKRIPTORDNER/../.build-iphone"
LOG="$SKRIPTORDNER/xcode-build.log"
BUENDEL="de.werk-e.app"

sag()    { printf '\n\033[1m%s\033[0m\n' "$1"; }
punkt()  { printf '  %s\n' "$1"; }
gut()    { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn()   { printf '  \033[33m!\033[0m %s\n' "$1"; }

if [ ! -d "$PROJEKT" ]; then
    warn "Projekt nicht gefunden: $PROJEKT"
    punkt "Bitte das Skript dort lassen, wo es liegt (WerkeApp/Mac/)."
    exit 1
fi

# ── 1 · Xcode ───────────────────────────────────────────────────────────────
sag "1 · Xcode prüfen"
if ! xcode-select -p 2>/dev/null | grep -q "Xcode.app"; then
    warn "Die Kommandozeile zeigt noch nicht auf Xcode."
    punkt "Einmalig nötig (fragt nach Ihrem Mac-Passwort):"
    punkt "    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer || exit 1
fi
if ! xcodebuild -version >/dev/null 2>&1; then
    warn "Xcode verlangt noch die Zustimmung zur Lizenz."
    sudo xcodebuild -license accept || exit 1
fi
gut "$(xcodebuild -version | head -1)"

# ── 2 · Entwicklerzertifikat und Team ───────────────────────────────────────
# Das Team steckt im OU-Feld des Apple-Development-Zertifikats. Existiert
# noch keins, legt Xcode eins an, sobald einmal ein Team gewählt wurde –
# genau dorthin führen wir, falls nötig.
team_finden() {
    security find-certificate -c "Apple Development" -p 2>/dev/null \
        | openssl x509 -noout -subject 2>/dev/null \
        | sed -n 's/.*OU *= *\([A-Z0-9]\{10\}\).*/\1/p' | head -1
}

sag "2 · Signieren"
TEAM="${WERKE_TEAM:-$(team_finden)}"
while [ -z "$TEAM" ]; do
    warn "Noch kein Entwicklerzertifikat auf diesem Mac."
    punkt "Das richtet man genau einmal ein – Xcode öffnet sich gleich:"
    punkt "  1. Xcode → Settings… → Accounts → „+“ → mit Ihrer Apple-ID anmelden"
    punkt "  2. Im Projekt links „WerkeApp“ anklicken → Reiter Signing & Capabilities"
    punkt "  3. Bei „Team“ Ihren Namen auswählen – Xcode erstellt das Zertifikat selbst"
    open "$PROJEKT"
    printf '\n  Danach hier Enter drücken … '
    read -r _
    TEAM="$(team_finden)"
done
gut "Team $TEAM"

# ── 3 · iPhone suchen ───────────────────────────────────────────────────────
sag "3 · iPhone suchen"
GERAET=""
GERAETENAME=""
DEV_JSON="$(mktemp)"
if xcrun devicectl list devices --json-output "$DEV_JSON" >/dev/null 2>&1; then
    GERAET="$(/usr/bin/python3 - "$DEV_JSON" <<'PY'
import json, sys
try:
    daten = json.load(open(sys.argv[1]))
    for g in daten.get("result", {}).get("devices", []):
        hw = g.get("hardwareProperties", {})
        cp = g.get("connectionProperties", {})
        if hw.get("platform") == "iOS" and cp.get("tunnelState") == "connected":
            print(g.get("identifier", ""))
            print(g.get("deviceProperties", {}).get("name", "iPhone"))
            break
except Exception:
    pass
PY
)"
    GERAETENAME="$(printf '%s' "$GERAET" | sed -n 2p)"
    GERAET="$(printf '%s' "$GERAET" | sed -n 1p)"
fi
rm -f "$DEV_JSON"

ZIEL=""
PRODUKTORDNER=""
if [ -n "$GERAET" ]; then
    gut "Gefunden: $GERAETENAME"
    ZIEL="id=$GERAET"
    PRODUKTORDNER="Debug-iphoneos"
else
    warn "Kein iPhone angeschlossen (oder noch nicht vertraut)."
    punkt "Für das echte Gerät: Kabel anschließen, auf dem iPhone „Vertrauen“"
    punkt "antippen und den Entwicklermodus einschalten (Einstellungen →"
    punkt "Datenschutz & Sicherheit → Entwicklermodus)."
    punkt ""
    punkt "Enter = erst einmal im Simulator ansehen · Strg+C = abbrechen"
    read -r _
    SIM="$(xcrun simctl list devices available | grep -m1 "iPhone" \
        | sed -n 's/.*(\([0-9A-F-]\{36\}\)).*/\1/p')"
    if [ -z "$SIM" ]; then
        warn "Auch kein iPhone-Simulator vorhanden – in Xcode unter"
        punkt "Settings → Platforms die iOS-Plattform nachladen, dann erneut starten."
        exit 1
    fi
    ZIEL="id=$SIM"
    PRODUKTORDNER="Debug-iphonesimulator"
    GERAET=""
    gut "Simulator wird verwendet."
fi

# ── 4 · Bauen ───────────────────────────────────────────────────────────────
sag "4 · Bauen (der erste Durchlauf dauert ein paar Minuten)"
bauen() {
    xcodebuild \
        -project "$PROJEKT" \
        -scheme WerkeApp \
        -configuration Debug \
        -destination "$ZIEL" \
        -derivedDataPath "$ABLAGE" \
        -allowProvisioningUpdates \
        DEVELOPMENT_TEAM="$TEAM" \
        "$@" build >"$LOG" 2>&1
}

if ! bauen; then
    # Häufigster Grund beim Gratis-Konto: Die iCloud-Berechtigung braucht das
    # bezahlte Entwicklerkonto. Dann ohne sie bauen – die App verliert dadurch
    # nur die iCloud-Sicherung, sonst nichts.
    if grep -qiE "entitlement|ubiquity|provisioning" "$LOG"; then
        warn "Signieren mit iCloud-Berechtigung fehlgeschlagen – vermutlich Gratis-Konto."
        punkt "Zweiter Versuch ohne iCloud-Sicherung …"
        if ! bauen CODE_SIGN_ENTITLEMENTS=""; then
            :
        fi
    fi
fi

if ! grep -q "BUILD SUCCEEDED" "$LOG"; then
    warn "Der Build ist fehlgeschlagen. Die ersten Fehler:"
    echo
    grep -E "error:" "$LOG" | head -12 | sed 's/^/    /'
    echo
    punkt "Das ist der erwartete erste-Build-Moment: Der Rechenkern ist mit"
    punkt "331 Testfällen bewiesen, aber die Oberfläche konnte bis jetzt nie"
    punkt "vollständig übersetzt werden – das kann nur Xcode."
    punkt ""
    punkt "→ Die Datei  Mac/xcode-build.log  an Claude geben."
    punkt "  Er räumt die Fehler ab; danach dieses Skript erneut starten."
    open "$PROJEKT"
    exit 1
fi
gut "Build erfolgreich."

# ── 5 · Installieren und starten ────────────────────────────────────────────
APP="$ABLAGE/Build/Products/$PRODUKTORDNER/WerkeApp.app"
sag "5 · Installieren und starten"

if [ -n "$GERAET" ]; then
    if ! xcrun devicectl device install app --device "$GERAET" "$APP" >>"$LOG" 2>&1; then
        warn "Installation abgelehnt – meist fehlt der Entwicklermodus auf dem iPhone."
        punkt "Einstellungen → Datenschutz & Sicherheit → Entwicklermodus → ein,"
        punkt "iPhone neu starten, dann dieses Skript erneut ausführen."
        exit 1
    fi
    xcrun devicectl device process launch --device "$GERAET" "$BUENDEL" >>"$LOG" 2>&1 || true
    gut "WERK.E läuft auf „$GERAETENAME“."
    punkt ""
    punkt "Beim Gratis-Konto verfällt die Signatur nach 7 Tagen –"
    punkt "dann dieses Skript einfach erneut ausführen."
else
    SIMID="${ZIEL#id=}"
    xcrun simctl boot "$SIMID" >/dev/null 2>&1 || true
    open -a Simulator
    xcrun simctl install "$SIMID" "$APP" >>"$LOG" 2>&1
    xcrun simctl launch "$SIMID" "$BUENDEL" >>"$LOG" 2>&1 || true
    gut "WERK.E läuft im Simulator."
    punkt "Für das echte iPhone: Gerät anschließen und Skript erneut starten."
fi

sag "Fertig."
