#!/bin/bash
#
# WERK.E App → TestFlight, Schritt 1 von 2.
#
# Dieses Skript baut das Archiv für den Upload und öffnet es im
# Xcode-Organizer. Dort bleibt genau ein Klick: „Distribute App“ →
# „TestFlight & App Store“. Den Upload selbst macht Xcode.
#
# Voraussetzungen: Apple Developer Program (99 €/Jahr) und die App einmal in
# App Store Connect angelegt (appstoreconnect.apple.com → Apps → „+“,
# Bundle-ID de.werk-e.app auswählen).

set -u

SKRIPTORDNER="$(cd "$(dirname "$0")" && pwd)"
PROJEKT="$SKRIPTORDNER/../App/WerkeApp.xcodeproj"
ARCHIV="$SKRIPTORDNER/WerkeApp.xcarchive"
LOG="$SKRIPTORDNER/xcode-archiv.log"

TEAM="${WERKE_TEAM:-$(security find-certificate -c "Apple Development" -p 2>/dev/null \
    | openssl x509 -noout -subject 2>/dev/null \
    | sed -n 's/.*OU *= *\([A-Z0-9]\{10\}\).*/\1/p' | head -1)}"

if [ -z "$TEAM" ]; then
    echo "Kein Entwicklerzertifikat gefunden – bitte zuerst aufs-iphone.command ausführen."
    exit 1
fi

echo "Archiv wird gebaut (Team $TEAM) …"
rm -rf "$ARCHIV"
if ! xcodebuild \
    -project "$PROJEKT" \
    -scheme WerkeApp \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIV" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM" \
    archive >"$LOG" 2>&1; then
    echo "Archivieren fehlgeschlagen. Die ersten Fehler:"
    grep -E "error:" "$LOG" | head -10 | sed 's/^/    /'
    echo "Vollständiges Protokoll: Mac/xcode-archiv.log – bei Bedarf an Claude geben."
    exit 1
fi

echo "Archiv fertig – Xcode-Organizer öffnet sich."
echo "Dort: „Distribute App“ → „TestFlight & App Store“ → durchklicken."
open "$ARCHIV"
