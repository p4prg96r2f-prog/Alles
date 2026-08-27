#!/bin/bash
# Schnürt das Deploy-Paket aus dem gebauten Werkzeug und der Function.
set -e
cd "$(dirname "$0")"
[ -f ../WERKE_Heizlast_Tool.html ] || { echo "Erst python3 build.py ausführen."; exit 1; }
rm -rf deploy && mkdir -p deploy/netlify/functions
cp netlify/functions/plan-auslesen.mjs deploy/netlify/functions/
cp ../WERKE_Heizlast_Tool.html deploy/index.html
printf '[build]\n  functions = "netlify/functions"\n  publish = "."\n\n[functions]\n  node_bundler = "none"\n' > deploy/netlify.toml
printf '# Internes Werkzeug der WERK.E Energie-Effizienz-Beratung.\n# Nicht für Suchmaschinen bestimmt.\nUser-agent: *\nDisallow: /\n' > deploy/robots.txt
printf '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n' > deploy/_headers
rm -f WERKE_Heizlast_Web.zip
( cd deploy && zip -qr ../WERKE_Heizlast_Web.zip . )
if unzip -p WERKE_Heizlast_Web.zip | grep -qE "sk-ant-[A-Za-z0-9]"; then
  echo "ABBRUCH: Ein Anthropic-Schlüssel steckt im Paket."; rm -f WERKE_Heizlast_Web.zip; exit 1
fi
echo "Fertig: $(pwd)/WERKE_Heizlast_Web.zip ($(du -h WERKE_Heizlast_Web.zip | cut -f1))"
echo "Ablegen auf: https://app.netlify.com/projects/werke-heizlast/deploys"
