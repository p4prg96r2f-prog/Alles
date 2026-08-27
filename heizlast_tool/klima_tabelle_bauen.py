#!/usr/bin/env python3
"""
Baut die PLZ-Klimatabelle in src/daten/daten_klima.js neu.

Quelle
    BWP-Klimakarte des Bundesverbands Waermepumpe e. V.
    https://www.waermepumpe.de/werkzeuge/klimakarte/
    Die Karte liefert ihre Datenpunkte als SVG ueber die TYPO3-Erweiterung
    tx_bwpclimatezones_map. Jedes Polygon traegt die Attribute
        zip   Postleitzahl
        dot   design outdoor temperature  = Norm-Aussentemperatur
        aat   annual average temperature  = Jahresmitteltemperatur
        alt   Hoehe ueber NN
        zone  Klimazone nach DIN 4710
        place Ortsname
    Eigenangabe der Karte: PLZ-scharfe Werte nach DIN/TS 12831-1:2020-04,
    Datengrundlage DWD 1995 bis 2012.

Gegenpruefung
    klimdim.de (Building Design Days + Energy), Deutschlandkarte
    ggId=2  DIN EN 12831-1: Norm-Aussenlufttemperatur
    ggId=10 DIN EN 12831-1: Jahresmittel-Temperatur ("Tabellenwerte")
    Zweiter, unabhaengiger Herausgeber derselben Norm-Tabelle. Das Raster ist
    groeber (10 km x 10 km), deckt aber rund 3.000 PLZ ab. Das Skript bricht
    ab, sobald ein Wert abweicht.

Ankerpruefung
    PLZ 33098 Paderborn muss -9,6 Grad C und 10,1 Grad C ergeben. Dieser Wert
    ist im geprueften Referenzprojekt heizlast_maelzerstr59 belegt.

Aufruf:  python3 klima_tabelle_bauen.py
Danach:  python3 build.py
"""
import csv, os, re, sys, urllib.request, html as htmlmod

HIER = os.path.dirname(os.path.abspath(__file__))
ZIEL = os.path.join(HIER, "src/daten/daten_klima.js")
ROH = os.path.join(HIER, "daten/klima_bwp_din_ts_12831_1.csv")
KOPF = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

BWP_KARTE = ("https://www.waermepumpe.de/werkzeuge/klimakarte/"
             "?tx_bwpclimatezones_map%5Baction%5D=load"
             "&tx_bwpclimatezones_map%5Bcontroller%5D=Map"
             "&type=7289322&cHash=009ca26541bf1c0d8a132412e9cac4d5")
KLIMDIM = "https://klimdim.de/deutschland_karte/deutschland_karte.php?ggId=%d"

B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def abbruch(t):
    print("\033[31mABBRUCH: " + t + "\033[0m")
    sys.exit(1)


def hole(url):
    a = urllib.request.Request(url, headers={"User-Agent": KOPF})
    return urllib.request.urlopen(a, timeout=180).read().decode("utf-8-sig", "replace")


def b62(n, breite):
    s = ""
    for _ in range(breite):
        s = B62[n % 62] + s
        n //= 62
    if n:
        abbruch("Wert passt nicht in %d Zeichen base62" % breite)
    return s


def zahl(t):
    return float(t.replace("°C", "").replace(" ", "")
                  .replace("m", "").replace(" ", "").strip())


# ------------------------------------------------------------------ 1 Quelle
print("1  BWP-Klimakarte laden")
svg = hole(BWP_KARTE)
muster = re.compile(r'zip="(\d{5})"\s*\n?\s*aat="([^"]*)"\s*\n?\s*dot="([^"]*)"'
                    r'\s*\n?\s*alt="([^"]*)"\s*\n?\s*zone="([^"]*)"\s*\n?\s*place="([^"]*)"')
satz, streit = {}, []
for m in muster.finditer(svg):
    z, aat, dot, alt, zone, ort = [x.strip() for x in m.groups()]
    neu = (zahl(dot), zahl(aat), zahl(alt), int(zone), htmlmod.unescape(ort))
    if z in satz and satz[z] != neu:
        streit.append(z)
    satz[z] = neu
if streit:
    abbruch("Widerspruechliche Doppeleintraege: " + ", ".join(streit[:10]))
if len(satz) < 8000:
    abbruch("Nur %d PLZ gefunden. Hat die Karte ihr Format geaendert?" % len(satz))
print("   OK  %d Postleitzahlen" % len(satz))

# --------------------------------------------------------------- 2 Ankerwert
print("2  Ankerpruefung Paderborn")
anker = satz.get("33098")
if not anker or abs(anker[0] + 9.6) > 1e-9 or abs(anker[1] - 10.1) > 1e-9:
    abbruch("PLZ 33098 liefert %s statt -9,6 / 10,1. Quelle verwerfen." % (anker,))
print("   OK  33098 Paderborn: -9,6 Grad C, Jahresmittel 10,1 Grad C")

# ---------------------------------------------------------- 3 Gegenpruefung
print("3  Gegenpruefung an klimdim.de")


def klimdim(gg):
    s = hole(KLIMDIM % gg)
    out = {}
    for m in re.finditer(r"<[a-z]+[^>]*?>", s):
        t = m.group(0)
        if "data-value=" not in t or "data-plz=" not in t:
            continue
        p = re.search(r'data-plz="([^"]*)"', t).group(1)
        if p:
            out.setdefault(p, float(re.search(r'data-value="([^"]*)"', t).group(1)))
    return out


kd_te, kd_jm = klimdim(2), klimdim(10)
gemeinsam = sorted(set(kd_te) & set(satz))
if len(gemeinsam) < 2000:
    abbruch("Nur %d PLZ zum Gegenpruefen. Zu wenig." % len(gemeinsam))
weicht = []
for z in gemeinsam:
    if abs(kd_te[z] - satz[z][0]) > 0.05:
        weicht.append("%s theta_e %.1f statt %.1f" % (z, kd_te[z], satz[z][0]))
    if z in kd_jm and abs(kd_jm[z] - satz[z][1]) > 0.05:
        weicht.append("%s Jahresmittel %.1f statt %.1f" % (z, kd_jm[z], satz[z][1]))
if weicht:
    abbruch("Die zweite Quelle weicht ab, nichts uebernommen:\n   "
            + "\n   ".join(weicht[:20]))
print("   OK  %d PLZ deckungsgleich, keine einzige Abweichung" % len(gemeinsam))

# -------------------------------------------------------- 4 Plausibilitaet
print("4  Plausibilitaet")
te = [v[0] for v in satz.values()]
jm = [v[1] for v in satz.values()]
if min(te) < -20.0 or max(te) > -6.0:
    abbruch("theta_e ausserhalb -20 bis -6: %.1f bis %.1f" % (min(te), max(te)))
for z, v in satz.items():
    if v[1] <= v[0]:
        abbruch("PLZ %s: Jahresmittel liegt nicht ueber theta_e" % z)
print("   OK  theta_e %.1f bis %.1f, Jahresmittel %.1f bis %.1f"
      % (min(te), max(te), min(jm), max(jm)))

# ----------------------------------------------------------------- 5 Rohsatz
os.makedirs(os.path.dirname(ROH), exist_ok=True)
with open(ROH, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh, delimiter=";")
    w.writerow(["plz", "ort", "theta_e_C", "jahresmittel_C", "hoehe_m", "klimazone_din4710"])
    for z in sorted(satz):
        d = satz[z]
        w.writerow([z, d[4], "%.1f" % d[0], "%.1f" % d[1], "%d" % d[2], d[3]])
print("5  Rohtabelle gesichert: %s (%d KB)" % (ROH, os.path.getsize(ROH) // 1024))

# ------------------------------------------------------------------ 6 Packen
plzn = sorted(satz)
orte = sorted({v[4] for v in satz.values()})
for o in orte:
    if '"' in o or "\\" in o or "\t" in o or "|" in o:
        abbruch("Ortsname mit Sonderzeichen, das die Kodierung bricht: " + o)
oidx = {o: i for i, o in enumerate(orte)}

# Ortspool frontcodiert: erstes Zeichen ist die Laenge des gemeinsamen
# Anfangs mit dem Vorgaenger (als Zeichen ab '0'), danach der Rest.
front, vor = [], ""
for o in orte:
    g = 0
    while g < len(vor) and g < len(o) and vor[g] == o[g] and g < 35:
        g += 1
    front.append(chr(48 + g) + o[g:])
    vor = o
pool = "\t".join(front)

# Satz: je 12 Zeichen  PLZ-Abstand(2) theta_e(2) Jahresmittel(2) Hoehe(2)
#                      Klimazone(1) Ortsindex(3)
teile, vorher = [], 0
for z in plzn:
    d = satz[z]
    teile.append(b62(int(z) - vorher, 2)
                 + b62(int(round(-d[0] * 10)) - 66, 2)
                 + b62(int(round(d[1] * 10)), 2)
                 + b62(int(d[2]) + 6, 2)
                 + b62(d[3], 1)
                 + b62(oidx[d[4]], 3))
    vorher = int(z)
saetze = "".join(teile)

naiv = sum(len(("%s;%s;%.1f;%.1f;%d;%d" % (z, satz[z][4], satz[z][0], satz[z][1],
                                           satz[z][2], satz[z][3])).encode()) + 1
           for z in plzn)
print("6  Packen: naiv %d KB, gepackt %d KB (Saetze %d KB, Ortspool %d KB)"
      % (naiv // 1024, (len(saetze.encode()) + len(pool.encode())) // 1024,
         len(saetze.encode()) // 1024, len(pool.encode()) // 1024))

# ---------------------------------------------------------------- 7 Eintragen
quelle = open(ZIEL, encoding="utf-8").read()
block = ('/* @@DATEN-ANFANG@@ */\n'
         '// Erzeugt von klima_tabelle_bauen.py. Nicht von Hand aendern.\n'
         'const KLIMA_STAND = "%s";\n'
         'const KLIMA_ANZAHL = %d;\n'
         'const KLIMA_ORTPOOL = "%s";\n'
         'const KLIMA_SAETZE = "%s";\n'
         '/* @@DATEN-ENDE@@ */') % (
    os.environ.get("KLIMA_STAND", "21.08.2026"), len(plzn), pool, saetze)
neu, n = re.subn(r"/\* @@DATEN-ANFANG@@ \*/.*?/\* @@DATEN-ENDE@@ \*/",
                 lambda _: block, quelle, flags=re.S)
if n != 1:
    abbruch("Die Markierungen @@DATEN-ANFANG@@ / @@DATEN-ENDE@@ fehlen in " + ZIEL)
open(ZIEL, "w", encoding="utf-8").write(neu)
print("7  Eingetragen in %s (%d KB)" % (ZIEL, os.path.getsize(ZIEL) // 1024))
