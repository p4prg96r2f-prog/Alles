#!/usr/bin/env python3
"""
Baut aus src/ und assets/ die auslieferbare Einzeldatei
    WERKE_Heizlast_Tool.html
fuer den Teamordner. Kein Login, kein Serverbetrieb, Doppelklick genuegt.

Ablauf:
  1. Selbsttests der Rechenkerne (bricht bei Fehler ab)
  2. Validierung gegen das geprueft Referenzprojekt
  3. Zusammenbau der Einzeldatei
  4. Kontrolle der fertigen Datei

Aufruf:  python3 build.py
"""
import base64, json, os, re, subprocess, sys, tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
lies = lambda p: open(os.path.join(HIER, p), encoding="utf-8").read()
b64 = lambda p: base64.b64encode(open(os.path.join(HIER, p), "rb").read()).decode()


def schritt(t):
    print("\n\033[1m" + t + "\033[0m")


def abbruch(t):
    print("\033[31mABBRUCH: " + t + "\033[0m")
    sys.exit(1)


# ---------------------------------------------------------------- 1 Tests
schritt("1  Selbsttests der Rechenkerne")
tests = [
    ("Norm-Rechenkern", "src/kerne/kern_heizlast_norm.js", "selbsttest"),
    ("Bauteildaten", "src/daten/daten_bauteile.js", "selbsttest"),
    ("Lagen unbeheizter Bereiche", "src/daten/daten_zonenlagen.js", "selbsttest"),
    ("Raumarten", "src/daten/daten_raumarten.js", "selbsttest"),
    ("Klimadaten je PLZ", "src/daten/daten_klima.js", "selbsttest"),
    ("Typologie", "src/daten/daten_typologie.js", "selbsttest"),
    ("BEG-Anforderungen", "src/daten/daten_beg_anforderungen.js", "selbsttest"),
    ("Prüfmodul", "src/kerne/kern_pruefung.js", "selbsttest"),
    ("Planprüfung", "src/kerne/kern_planpruefung.js", "selbsttest"),
    ("Maßstabsprobe", "src/kerne/kern_massstabsprobe.js", "selbsttest"),
    ("Bandbreite", "src/kerne/kern_bandbreite.js", "selbsttest"),
    ("Zuordnung", "src/kerne/kern_zuordnung.js", "selbsttest"),
    ("Fenster", "src/kerne/kern_fenster.js", "selbsttest"),
    ("Maßstabsbestimmung", "src/kerne/kern_massstab.js", "selbsttest"),
    ("Messwerkzeug und Kreuzprobe", "src/kerne/kern_messen.js", "selbsttest"),
    ("Zerlegung von Planblaettern", "src/kerne/kern_zuschnitt.js", "selbsttest"),
    ("Gegenprobe zweier Lesungen", "src/kerne/kern_gegenprobe.js", "selbsttest"),
    ("Annahmen fuer fehlende Angaben", "src/kerne/kern_annahmen.js", "selbsttest"),
    ("Deckung der Huelle", "src/kerne/kern_huellendeckung.js", "selbsttest"),
    ("Baujahrprobe (Gegenrechnung)", "src/kerne/kern_baujahrprobe.js", "selbsttest"),
    ("Lage der Raeume auf dem Blatt", "src/kerne/kern_lage.js", "selbsttest"),
    ("Grundflaeche aus den Aussenmassen", "src/kerne/kern_flaeche.js", "selbsttest"),
    ("PDF-Modul (reine Regeln)", "src/modul_pdf.js", "selbsttest"),
    ("Berichtssatz", "src/modul_berichtsatz.js", "selbsttest"),
]
for name, pfad, fn in tests:
    r = subprocess.run(
        ["node", "-e",
         f'const m=require("./{pfad}");const r=m.{fn}();'
         'console.log(JSON.stringify(r));'],
        cwd=HIER, capture_output=True, text=True)
    if r.returncode != 0:
        abbruch(f"{name} laesst sich nicht laden:\n{r.stderr}")
    res = json.loads(r.stdout.strip().splitlines()[-1])
    if not res["ok"]:
        abbruch(f"{name}: " + "; ".join(res["fehler"]))
    print(f"   OK  {name}: {res['anzahl']} Pruefungen")

# Module mit DOM-Bezug in einer Attrappe testen
attrappe = """
global.window={};global.localStorage={getItem:()=>null,setItem:()=>{}};
global.document={addEventListener:()=>{},createElement:()=>({getContext:()=>({}),toDataURL:()=>"x,y"}),
  getElementById:()=>null,querySelectorAll:()=>[]};
global.Image=function(){};
// Sinnbilder liegen im Blattkopf und stehen jedem Modul als window.ikon zur
// Verfuegung. Die Attrappe muss das nachbilden, sonst faellt jedes Modul aus,
// das ein Sinnbild setzt.
global.window.ikon=function(n){return '<svg class="ikon"><use href="#i-'+n+'"></use></svg>';};
"""
# Das Pruefblatt prueft seine Kopfzeile gegen die ECHTE Ampel des
# Kontrollblatts, statt sie nachzubauen. Genau darum muss das Kontrollblatt
# (und was es braucht) vorher geladen sein. Ein Selbsttest, der die Ampel
# nachstellt, wuerde nicht finden, dass die beiden Bildschirme sich
# auseinanderentwickelt haben -- und das ist der Fehler, um den es geht.
VORHER = {
    "src/modul_pruefblatt.js": ["src/kerne/kern_heizlast_norm.js",
                                "src/daten/daten_raumarten.js",
                                "src/kerne/kern_lage.js",
                                "src/modul_kontrollblatt.js"],
    # Das Kontrollblatt nutzt die EINE Einbauteil-Erkennung aus MODUL_KI
    # (Kundenbefund Garderobe, 24.08.2026). Ohne das Modul liefe der
    # Selbsttest dieser Regel leer.
    "src/modul_kontrollblatt.js": ["src/modul_ki.js"],
}
for name, pfad, obj in [("Dialogmodul", "src/modul_dialog.js", "MODUL_DIALOG"),
                        ("Plan-Modul", "src/modul_plan.js", "MODUL_PLAN"),
                        ("KI-Modul", "src/modul_ki.js", "MODUL_KI"),
                        ("Kontrollblatt", "src/modul_kontrollblatt.js",
                         "MODUL_KONTROLLBLATT"),
                        ("Pruefblatt", "src/modul_pruefblatt.js",
                         "MODUL_PRUEFBLATT"),
                        ("Teillastmodul", "src/modul_teillast.js",
                         "MODUL_TEILLAST"),
                        ("Berichtsmodul", "src/modul_bericht.js", "MODUL_BERICHT"),
                        ("Bewertungsmodul", "src/modul_bewertung.js",
                         "MODUL_BEWERTUNG")]:
    vorlauf = "".join(f'require("./{v}");' for v in VORHER.get(pfad, []))
    r = subprocess.run(
        ["node", "-e", attrappe + vorlauf + f'require("./{pfad}");'
         f'console.log(JSON.stringify(window.{obj}.selbsttest()));'],
        cwd=HIER, capture_output=True, text=True)
    if r.returncode != 0:
        abbruch(f"{name} laesst sich nicht laden:\n{r.stderr}")
    res = json.loads(r.stdout.strip().splitlines()[-1])
    if not res["ok"]:
        abbruch(f"{name}: " + "; ".join(res["fehler"]))
    print(f"   OK  {name}: {res['anzahl']} Pruefungen")

# ------------------------------------------------------- 2 Validierung
schritt("2  Validierung gegen das Referenzprojekt")
r = subprocess.run(["node", "validierung/vergleich.js"], cwd=HIER,
                   capture_output=True, text=True)
if r.returncode != 0:
    print(r.stdout)
    abbruch("Die Validierung ist nicht bestanden.")
letzte = [z for z in r.stdout.strip().splitlines() if z.startswith("ERGEBNIS")]
print("   OK  " + (letzte[-1] if letzte else "bestanden"))

schritt("2a  Klimatabelle gegen die Rohtabelle der Quelle")
r = subprocess.run(["node", "validierung/klima_gegenprobe.js"], cwd=HIER,
                   capture_output=True, text=True)
if r.returncode != 0:
    print(r.stdout)
    abbruch("Die gepackte Klimatabelle weicht von der Quelle ab.")
letzte = [z for z in r.stdout.strip().splitlines() if z.startswith("ERGEBNIS")]
print("   OK  " + (letzte[-1] if letzte else "bestanden"))

# ----------------------------------------------------- 3 Syntaxpruefung
schritt("2b  Kalibrierung der Planprüfung an echten Bildvarianten")
r = subprocess.run(["node", "validierung/planpruefung_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if r.returncode != 0:
    print(r.stdout)
    abbruch("Die Planprüfung ist nicht kalibriert.")
print("   OK  acht Bildvarianten richtig beurteilt")

# Das PDF-Modul gegen die echte Bibliothek pruefen: ein von Hand gebautes PDF
# wird mit pdf.js wieder eingelesen. Erst hier zeigt sich, ob die Annahmen ueber
# Befehlscodes, Textlage, Schriftgroesse und Drehung stimmen.
schritt("2c  PDF-Modul gegen pdf.js am erzeugten Pruef-PDF")
r = subprocess.run(["node", "validierung/pdf_selbsttest.mjs"], cwd=HIER,
                   capture_output=True, text=True)
if r.returncode != 0 or not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Der PDF-Selbsttest ist nicht bestanden.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("PDF-Modul: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen, davon der ganze Weg Datei bis Massstab")

# Die Oberflaeche wird bedient, nicht gelesen: jeder Eintrag der Schrittleisten
# wird ueber denselben Verteiler gezeichnet, den auch der Klick benutzt, und in
# jeder erzeugten Tabelle werden Kopf- gegen Datenspalten gezaehlt. Ein
# Selbsttest, der die Funktion direkt aufruft, findet einen fehlenden
# Verteilereintrag nie.
schritt("2d  Oberflaeche: jeder Leisteneintrag zeichnet, jede Tabelle passt")
r = subprocess.run(["node", "validierung/oberflaeche_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Oberflaechenprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Oberflaeche: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen ueber alle Schritte und Tabellen")

# Der dreistufige Normalablauf (Unterlagen -> Rueckfragen -> Ergebnis) mit
# Urteil nach der Analyse. Verlangt, dass die alten Bereiche vollstaendig als
# Expertenmodus weiterleben, dass das Urteil die vorhandene Wahrheit
# (kern_pruefung, Rueckfragenliste) uebersetzt statt eine neue zu erfinden,
# und dass die Kostengrenze der selbststartenden Analyse den 2-$-Deckel haelt.
schritt("2db Normalablauf: drei Schritte, Urteil, Rueckfragen")
r = subprocess.run(["node", "validierung/ablauf_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Ablaufprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Ablauf: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen: Schritte, Expertenmodus, Urteil, Kostengrenze")

# Die umgebaute Ergebnisseite: oben die Zahl mit Flaeche, W/m² und Raumzahl,
# das Urteil aus der VORHANDENEN Pruefung ("Belastbar unter N ausgewiesenen
# Annahmen"), Berichtsknopf oben; Raumheizlasten mit Zusammensetzung je Raum
# (Bauteile + Lueftung = Summe, nachgerechnet); die frueheren Tabellen
# vollstaendig in Aufklappern; Neurechnen-Anzeige "vorher/jetzt".
schritt("2dc Ergebnisseite: Zahl, Urteil, Raumklick, Aufklapper, Neurechnen")
r = subprocess.run(["node", "validierung/ergebnisseite_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Ergebnisseitenprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Ergebnisseite: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen: Kopf, Urteil, Zusammensetzung, "
      "Aufklapper, Neurechnen-Anzeige")

# Die Rueckfragen-Maschine am ECHTEN Auslese-Stand (Echtlauf Ziolkowski,
# 23.08.2026): genau die beantwortbaren Fragen, Ordnung Sperren ->
# Widersprueche -> Angaben -> Annahmen, Buendelung nur in der Fragenliste,
# Widerspruch nie per Ein-Klick, Antworten landen ueber zurKenntnis /
# sperreAufheben / schreiben, Standardwerte als EIN Block.
schritt("2dd Rueckfragen: eine Ursache, eine Frage, Antworten landen im Bestand")
r = subprocess.run(["node", "validierung/rueckfragen_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Rueckfragenprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Rueckfragen: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen an der Fragenliste des Echtlauf-Stands")

# DIE VORSCHLAGSPFLICHT (Sebastian Hund, 26.08.2026): "ich moechte bei allen
# rueckfragen einen vorschlag angezeigt bekommen den man dann annehmen oder
# ablehnen kann". Geprueft an drei gespeicherten Echtlaeufen und an der Lage
# des Soethe-Laufs (Raeume ohne Flaeche, Kontur aus der Aussenbemassung):
# jede Frage traegt einen Vorschlag oder eine BEGRUENDETE Ausnahme, jeder
# Wertvorschlag nennt seine Herkunft, Ablehnen ist ein Klick wie Annehmen,
# das Eingabefeld erscheint erst nach dem Ablehnen, ein abgelehnter Vorschlag
# kommt nicht wieder -- und kein Vorschlag ueberschreibt je eine Eingabe.
schritt("2dg Vorschlagspflicht: jede Rueckfrage mit Vorschlag, annehmen oder ablehnen")
r = subprocess.run(["node", "validierung/vorschlagspflicht_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Vorschlagsprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Vorschlagspflicht: " + "; ".join(res["fehler"]))
kette = res.get("kette_soethe") or {}
print(f"   OK  {res['anzahl']} Pruefungen; Lage Soethe: Flaechen "
      f"{kette.get('kleinste_m2')} bis {kette.get('groesste_m2')} m2 nach "
      f"Raumart aus der Aussenbemassung verteilt ({kette.get('summe_m2')} m2 "
      f"unter 88,50 m2 Kontur), daraus {kette.get('bauteile')} Bauteile und "
      f"{kette.get('kw')} kW statt 0,00")

# Die Kundenbefunde 3 und 4 vom 24.08.2026 am ECHTEN Hasenberg-Stand
# (Echtlauf 25.08.2026): die Ebenenzaehlung vergleicht beheizte Geschosse,
# nicht Zonen; eine wirklich doppelt gefuehrte Ebene faellt weiter auf; die
# Garage ohne Bauteil loest sich aus dem Lagewissen der Lesungen oder mit
# EINEM Klick, und die trennende Wand entsteht als gekennzeichnete Annahme.
schritt("2de Echtlauf Hasenberg: Ebenenzaehlung still, Garage loest sich selbst")
r = subprocess.run(["node", "validierung/hasenberg_echtlauf_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Hasenberg-Probe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Hasenberg: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen am Echtlauf-Stand Hasenberg 10")

# Die Befunde der Fuenf-Plan-Pruefung vom 26.08.2026 -- jeder Blocker und
# jeder mittelschwere Befund mit einem Waechter. Wo ein Echtlauf-Stand
# vorliegt, laeuft die Probe an ihm; die uebrigen Faelle sind im Test als
# NACHGESTELLT gekennzeichnet.
schritt("2df Befunde der Fuenf-Plan-Pruefung vom 26.08.2026")
r = subprocess.run(["node", "validierung/befunde_2026-08-26_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Befundprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Befunde 26.08.: " + "; ".join(res["fehler"][:10]))
print(f"   OK  {res['anzahl']} Waechter ueber die Befunde vom 26.08.2026")

# Was das Werkzeug dem Bearbeiter abnimmt: Objektangaben aus dem Schriftfeld,
# Angaben zur Person aus dem Browser, Flaechenstempel aus den Masszahlen
# heraus. Gemessen wurde vorher, dass diese drei Dinge bei jedem Projekt von
# Hand nachgetragen wurden, obwohl sie dastanden. Der Test geht denselben Weg
# wie der Bearbeiter; eine Leseregel allein wuerde nicht finden, dass ihr
# Ergebnis anschliessend niemand abholt.
schritt("2e  Was das Werkzeug selbst uebernimmt")
r = subprocess.run(["node", "validierung/uebernahme_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Uebernahmeprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Uebernahme: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen: Schriftfeld, Person, Masszahlen")

# Die Kette vom Baujahr bis zur Heizlast, fuer Neubauten ab 2023.
# GRUND: Am 24.08.2026 stand Sebastians Blatt mit von Hand eingetragenem
# Baujahr 2025 auf 0,00 kW -- die Gebaeudetypologie endet 2022, also entstand
# kein Bauteiltyp, also kein Bauteil, also keine Last. Der Selbsttest der
# Typologie konnte das nicht finden: er prueft die Tabelle, nicht den Weg von
# ihr zum Bauteil. Dieser Schritt geht den Weg. Er prueft BEIDE Richtungen --
# dass mit Baujahr 2025 etwas entsteht, und dass die Sperre "Bauteile im
# Projekt" da anschlaegt, wo sie hingehoert.
# NACHGEZOGEN 25.08.2026 (Luecke 1, Baujahr-Rueckfall): ein UNBEKANNTES
# Baujahr sperrt nicht mehr -- es faellt auf die belegte Bestandsklasse
# 1969 bis 1978 zurueck und faerbt die Rechnung. Hart bleibt die Sperre da,
# wo die Bauteiltypen selbst fehlen; darauf kann kein Rueckfall greifen.
schritt("2i  Neubau ab 2023: Baujahr bis Heizlast, Rueckfall ohne Baujahr")
r = subprocess.run(["node", "validierung/neubau_2023_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Neubauprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Neubau ab 2023: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen: Baujahr 2025 ergibt "
      f"{res['kw_2025']:.2f} kW statt 0,00 kW; ohne Baujahr greift der "
      "Rueckfall, ohne Bauteiltypen sperrt es weiter")

# Sebastians Fall, ganz durch: eine Datei ablegen, warten, das Kontrollblatt
# lesen. Zwei Blaetter A3, das erste mit Schnitt, Ansicht und DREI Grundrissen,
# das zweite ein Bebauungsplan ohne Raum. Sein Kontrollblatt zeigte einmal
# "1 Fehler, 1 Warnung, 12 offene Fragen", und die zwoelf lauteten im Kern alle
# gleich: "gegen nichts geprueft". Dieser Schritt haelt fest, dass daraus ein
# Blatt ohne Fehler, ohne Warnung und ohne offene Frage geworden ist -- UND
# dass es weiterhin anschlaegt: er verfaelscht das Ergebnis an fuenf Stellen
# und verlangt, dass jede gefunden wird. Ein sauberes Kontrollblatt ohne
# diesen zweiten Teil ist nichts wert.
schritt("2h  Sebastians Fall, NACHGESTELLT (Modellantworten aus der Testdatei)")
r = subprocess.run(["node", "validierung/ziolkowski_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Der Fall Ziolkowski laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Fall Ziolkowski: " + "; ".join(res["fehler"]))
# Der Satz "Kontrollblatt ohne Befund" stand hier, als waere er ein Befund
# ueber Sebastians Blatt. Er ist einer ueber NACHGESTELLTE Modellantworten:
# die Testdatei setzt baujahr und plz, die auf dem Blatt nicht stehen. Der
# echte Durchlauf derselben Datei kam zur selben Zeit auf "Nicht belastbar"
# und 0,00 kW. Die Zeile sagt das jetzt.
if not res.get("nachgestellt"):
    abbruch("Der Fall Ziolkowski muss sich als nachgestellt ausweisen "
            "(Schluessel 'nachgestellt' fehlt in seiner Ausgabe).")
print(f"   OK  {res['anzahl']} Pruefungen an NACHGESTELLTEN Modellantworten "
      f"({len(res.get('frei_gesetzt', []))} Felder frei gesetzt, darunter "
      f"baujahr und plz): 13 Raeume, fuenf Verfaelschungen gefunden.")
print("       KEIN Beweis fuer den echten Fall — dafuer die PDF im Browser "
      "ablegen.")

# Der Rettungsweg, wenn ein Durchgang nicht reicht: Wiederholen dort, wo es
# hilft, Zerlegen des Bogens in seine Zeichnungsfelder, und die Zusicherung,
# dass ein schon zugeschnittenes Bild nicht ein zweites Mal geschnitten wird.
# Genau daran gingen am A1-Bogen "Dumach 1" 18 von 25 Raeumen verloren, ohne
# jede Fehlermeldung.
schritt("2g  Rettung: wiederholen, zerlegen, sagen was geschah")
r = subprocess.run(["node", "validierung/rettung_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Rettungsprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Rettung: " + "; ".join(res["fehler"]))
print(f"   OK  {res['anzahl']} Pruefungen: Wiederholung, Zerlegung, Zuschnitt")

# Die Probe gegen die Krankheit dieses Werkzeugs: gebaute, getestete
# Faehigkeiten, zu denen kein Weg fuehrt. Dreimal vorgekommen, dreimal von
# keinem Selbsttest gefunden -- ein Selbsttest ruft die Funktion ja selbst auf.
# Geprueft wird dreierlei:
#   Knopf nennt eine Aktion, die kein Verteiler kennt (und umgekehrt),
#   Funktion, die weder aufgerufen noch herausgereicht wird,
#   Modul, das window.NAME setzt und das keiner benutzt.
# Die Aktionsnamen kommen aus dem GEZEICHNETEN Markup, nicht aus dem
# Quelltext; nur so sind auch die Knoepfe erfasst, deren Name erst beim
# Zeichnen entsteht. Gegengeprobt an allen sechs Fehlerformen, die hier
# tatsaechlich vorkamen -- jede einzeln nachgestellt, jede wird gefunden.
# Der teuerste Fehler dieses Werkzeugs war kein Rechenfehler: sobald ein Plan
# im Projekt lag, tat "Speichern" nichts (Ringverweis ueber pdfSeite) und der
# Zwischenspeicher schrieb nie. Die Probe arbeitet an einem Projekt mit einem
# ECHTEN Ringverweis; an einer sauberen Attrappe waere auch die kaputte
# Fassung durchgekommen.
schritt("2da Sicherung: Speichern, Zwischenspeicher, Wiederherstellen")
r = subprocess.run(["node", "validierung/sicherung_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Sicherungsprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Sicherung:\n     " + "\n     ".join(res["fehler"][:20]))
print(f"   OK  {res['anzahl']} Pruefungen an einem Projekt mit lebenden PDF-Seiten")

# Die Kehrwoche: kaputte Eingaben duerfen die GESAMTRECHNUNG nie verhindern.
# Fehlendes Klima, fehlendes Baujahr, Raum mit A=0 und h=null, U-Werte
# undefined, Nachbar ins Leere, unbrauchbare Optionen -- jeder dieser Faelle
# muss eine ENDLICHE Heizlast liefern und den passenden Hinweis tragen, statt
# abzubrechen oder still NaN zu drucken.
#
# Drei Teile, weil an drei Stellen etwas anderes schiefgeht:
#   A  der Rechenkern (Rueckfallwerte, Fehlerrichtung, Gegenprobe)
#   B  der Rechenweg in app.js (ein werfendes Pruefmodul darf die fertige
#      Zahl nicht mitreissen)
#   C  der GANZE Weg bis in den Bericht -- die Luecke, die A und B nicht
#      sahen. GEMESSEN am 25.08.2026: der Fall "Bauteiltyp geloescht" ergab
#      eine tadellose Heizlast, und im Bericht stand "Abweichung +Infinity %"
#      (kern_pruefung, Quervergleich: Erwartungswert mit Faktor 0 multipliziert
#      und dann durch ihn geteilt). Teil C schickt zehn kaputte Projekte durch
#      Pruefmodul, Teillast, Bewertung und beide Berichtsfassungen und laesst
#      die vorhandene baustellenSuche() darueber laufen.
schritt("2j  Nie NaN: kaputte Eingaben faerben die Rechnung, sie stoppen sie nicht")
r = subprocess.run(["node", "validierung/nie_nan_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Kehrwochen-Probe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Nie NaN:\n     " + "\n     ".join(res["fehler"][:20]))
print(f"   OK  {res['anzahl']} Pruefungen: Kern, App-Rechenweg und der ganze "
      f"Weg bis in beide Berichtsfassungen")

schritt("2e  Verdrahtung: fuehrt zu jeder gebauten Faehigkeit ein Weg?")
r = subprocess.run(["node", "validierung/verdrahtung_test.js"], cwd=HIER,
                   capture_output=True, text=True)
if not r.stdout.strip():
    print(r.stderr[-2000:])
    abbruch("Die Verdrahtungsprobe laesst sich nicht ausfuehren.")
res = json.loads(r.stdout.strip().splitlines()[-1])
if not res["ok"]:
    abbruch("Verdrahtung:\n     " + "\n     ".join(res["fehler"][:20]))
print(f"   OK  {res['anzahl']} Pruefungen: Aktionen, Funktionen, Module")

schritt("2f  Ausleseendpunkt (ohne Netz, mit ersetztem fetch)")
r = subprocess.run(["node", "api/test_endpunkt.mjs"], cwd=HIER,
                   capture_output=True, text=True)
_fehl = [z for z in r.stdout.splitlines() if z.strip().startswith("FEHL")]
if _fehl or "Alle Prüfungen bestanden" not in r.stdout:
    print(r.stderr[-1500:])
    abbruch("Endpunkt:\n     " + "\n     ".join(_fehl[:20] or ["Probe nicht durchgelaufen"]))
print(f"   OK  {len([z for z in r.stdout.splitlines() if z.strip().startswith('OK')])} "
      "Pruefungen am Endpunkt, darunter die Rettung abgeschnittener Antworten")

schritt("3  Syntaxpruefung aller Quelldateien")
quellen = ["src/standorte.js", "src/kerne/kern_heizlast_norm.js",
           "src/daten/daten_raumarten.js", "src/daten/daten_klima.js",
           "src/daten/daten_bauteile.js", "src/daten/daten_typologie.js",
           "src/daten/daten_zonenlagen.js",
           "src/daten/daten_beg_anforderungen.js",
           "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
           "src/kerne/kern_fenster.js",
           "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
           "src/kerne/kern_messen.js", "src/kerne/kern_zuschnitt.js",
           "src/kerne/kern_gegenprobe.js",
           "src/kerne/kern_annahmen.js",
           "src/kerne/kern_huellendeckung.js",
           "src/kerne/kern_baujahrprobe.js",
           "src/kerne/kern_bandbreite.js",
           "src/kerne/kern_lage.js",
           "src/kerne/kern_flaeche.js",
           "src/modul_dialog.js",
           "src/modul_plan.js", "src/modul_ki.js", "src/modul_pdf.js",
           "src/modul_berichtsatz.js", "src/modul_teillast.js",
           "src/modul_kontrollblatt.js", "src/modul_pruefblatt.js",
           "src/modul_bericht.js",
           "src/modul_bewertung.js", "src/app.js"]
kaputte_umlaute = re.compile("[\u00c3\u00c2][\u0080-\u00bf]")
for q in quellen:
    r = subprocess.run(["node", "--check", q], cwd=HIER, capture_output=True, text=True)
    if r.returncode != 0:
        abbruch(f"{q}:\n{r.stderr}")
    # Doppelt kodierte Umlaute. Sie brechen keine Syntax, landen aber als
    # "BestAA¤tigung" im unterschriebenen Bericht. Ein einziges Werkzeug mit
    # falscher Kodierung reicht dafuer, darum wird hier gelesen.
    roh = open(os.path.join(HIER, q), "rb").read()
    try:
        text = roh.decode("utf-8")
    except UnicodeDecodeError as e:
        abbruch(f"{q} ist nicht UTF-8: {e}")
    treffer = sorted(set(kaputte_umlaute.findall(text)))
    if treffer:
        abbruch(f"{q}: doppelt kodierte Umlaute gefunden: " + ", ".join(treffer))
print(f"   OK  {len(quellen)} Dateien, alle UTF-8 und ohne krumme Umlaute")

# --------------------------------- 3ab Keine Dialoge, die den Tab anhalten
# alert(), confirm() und prompt() halten den ganzen Browser-Tab an: kein
# Neuzeichnen, kein Fortschritt, keine laufende Auswertung. Am 23.08.2026
# hielt ein Pruefer das Werkzeug deswegen drei Minuten lang fuer abgestuerzt,
# und beim automatisierten Nachstellen desselben Klicks blieb der Reiter so
# fest stehen, dass er nur noch zu schliessen war. Ersatz ist
# src/modul_dialog.js (sagen / fragen / eingabe / arbeit).
#
# Geprueft wird der Code, nicht die Kommentare -- die SPRECHEN ueber die drei
# und sollen es weiter duerfen.
schritt("3ab Keine Dialoge, die den ganzen Reiter anhalten")
_kommentar = re.compile(r"/\*[\s\S]*?\*/|//[^\n]*")
_dialoge = re.compile(r"(?<![.\w])(alert|confirm|prompt)\s*\(")
_gefunden = []
for q in quellen:
    if q.endswith("src/modul_dialog.js"):
        continue                      # prueft sich selbst, siehe selbsttest()
    _ohne = _kommentar.sub(" ", lies(q))
    for _m in _dialoge.finditer(_ohne):
        _zeile = _ohne[: _m.start()].count("\n") + 1
        _gefunden.append(f"{q}: {_m.group(1)}() in der Naehe von Zeile {_zeile}")
if _gefunden:
    abbruch("Ein tab-modaler Dialog ist zurueck. Ersatz: window.MODUL_DIALOG "
            "(sagen / fragen / eingabe / arbeit).\n     "
            + "\n     ".join(_gefunden))
print(f"   OK  {len(quellen) - 1} Dateien ohne alert, confirm und prompt")

# ------------------------------------------- 3a Namen im gemeinsamen Raum
# In der Einzeldatei liegt jede Quelldatei in einem eigenen <script>-Block.
# Ein `function name()` oder `const name =` am Zeilenanfang wird dort NICHT
# zu einer Modulvariablen, sondern zu einer GLOBALEN. Zwei Dateien mit
# demselben Namen ueberschreiben sich, und zwar erst im Browser: unter Node
# hat jede Datei ihren eigenen Raum, alle Selbsttests bleiben gruen.
#
# Genau so ist es passiert. `fundstelle()` gab es dreimal (Raumarten,
# BEG-Anforderungen, Typologie). Im Browser gewann die zuletzt geladene.
# `DATEN_RAUMARTEN.offeneAnnahmen()` lieferte dadurch quelle: null statt der
# DIN-Fundstelle, und die neue Typologie-Fundstelle kam gar nicht an. Kein
# Selbsttest konnte das finden, denn keiner laeuft im Browser.
schritt("3a  Namen im gemeinsamen globalen Raum der Einzeldatei")
_namensmuster = re.compile(
    r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)",
    re.M)
_wo = {}
for q in quellen:
    for _m in _namensmuster.finditer(lies(q)):
        _n = _m.group(1) or _m.group(2)
        _wo.setdefault(_n, set()).add(q)
_doppelt = sorted((n, sorted(d)) for n, d in _wo.items() if len(d) > 1)
if _doppelt:
    abbruch("Derselbe Name in mehreren Dateien auf oberster Ebene. In der "
            "Einzeldatei ueberschreiben sie sich:\n     "
            + "\n     ".join(n + ": " + ", ".join(d) for n, d in _doppelt))
print(f"   OK  {len(_wo)} Namen auf oberster Ebene, jeder nur einmal vergeben")

# ------------------------------------ 3aa Zahlform hinter jedem Zaehler
# Jeder Zaehler im Kontrollblatt traegt eine Einheit, die hinter seiner Zahl
# gedruckt wird. Steht dort "Räume" und ist die Zahl eins, liest der Kollege
# "1 Räume". Genau das stand da, an der Zeile "Aufenthaltsräume ohne Fenster".
# einheitZu() beugt die Einheit, aber nur die, die es kennt; eine neu
# vergebene Einheit fiele sonst wieder durch.
schritt("3aa Jede Zaehler-Einheit kennt ihre Einzahl")
_kb = lies("src/modul_kontrollblatt.js")
_m = re.search(r"const EINHEIT_EINZAHL = \{(.*?)\};", _kb, re.S)
if not _m:
    abbruch("EINHEIT_EINZAHL ist in src/modul_kontrollblatt.js nicht mehr zu finden.")
_bekannt = set(re.findall(r'"([^"]+)"\s*:', _m.group(1)))
_vergeben = set()
for _q in ("src/modul_kontrollblatt.js", "src/kerne/kern_pruefung.js"):
    _vergeben |= set(re.findall(r'einheit:\s*"([^"]+)"', lies(_q)))
_ohne = sorted(_vergeben - _bekannt)
if _ohne:
    abbruch("Diese Zaehler-Einheiten kennen keine Einzahl und wuerden als "
            "\"1 " + _ohne[0] + "\" gedruckt: " + ", ".join(_ohne)
            + "\n     Nachtragen in EINHEIT_EINZAHL (src/modul_kontrollblatt.js).")
print(f"   OK  {len(_vergeben)} vergebene Einheiten, alle mit Einzahl")

# ------------------------------------------------------------- 3b pdf.js
schritt("3b  pdf.js einbetten")
PDFJS_DIR = "vendor/pdfjs"
pdfjs_haupt_pfad = os.path.join(PDFJS_DIR, "pdf.min.mjs")
pdfjs_arbeiter_pfad = os.path.join(PDFJS_DIR, "pdf.worker.min.mjs")
for p in (pdfjs_haupt_pfad, pdfjs_arbeiter_pfad,
          os.path.join(PDFJS_DIR, "LICENSE")):
    if not os.path.exists(os.path.join(HIER, p)):
        abbruch("pdf.js fehlt: " + p + "\n   Bezug siehe " + PDFJS_DIR + "/HERKUNFT.md")

pdfjs_haupt = lies(pdfjs_haupt_pfad)
pdfjs_arbeiter = lies(pdfjs_arbeiter_pfad)

# Die Exportnamen sind im minifizierten Build verkuerzt: die Datei endet mit
# export{...,B as OPS,...,Ht as version};  Ein handgeschriebenes
# globalThis.pdfjsLib={getDocument,OPS,...} scheitert deshalb mit
# "OPS is not defined". Die Bruecke wird aus der Export-Anweisung erzeugt.
m = re.search(r"export\{([^}]*)\};?\s*$", pdfjs_haupt)
if not m:
    abbruch("Die Export-Anweisung von pdf.min.mjs wurde nicht gefunden. "
            "Hat sich das Bauformat der Bibliothek geaendert?")
paare, verkuerzt = [], 0
for teil in m.group(1).split(","):
    teil = teil.strip()
    if not teil:
        continue
    if " as " in teil:
        innen, aussen = [x.strip() for x in teil.split(" as ")]
        verkuerzt += 1
    else:
        innen = aussen = teil
    paare.append((innen, aussen))
for pflicht in ("getDocument", "OPS", "version", "GlobalWorkerOptions",
                "PasswordException", "InvalidPDFException"):
    if not any(a == pflicht for _, a in paare):
        abbruch("pdf.js exportiert " + pflicht + " nicht mehr.")
bruecke = ("\nglobalThis.pdfjsLib={"
           + ",".join('"%s":%s' % (aussen, innen) for innen, aussen in paare)
           + "};\n")
print(f"   OK  Bruecke ueber {len(paare)} Exporte, davon {verkuerzt} verkuerzt")

# </script in der eingebetteten Quelle wuerde den umgebenden Block beenden.
# Geprueft: kommt in beiden Dateien null mal vor. Trotzdem ersetzen, weil eine
# spaetere Version das aendern kann.
entschaerft = 0
for name, inhalt in (("pdf.min.mjs", pdfjs_haupt), ("pdf.worker.min.mjs", pdfjs_arbeiter)):
    entschaerft += inhalt.count("</script")
pdfjs_haupt = pdfjs_haupt.replace("</script", r"<\/script")
pdfjs_arbeiter = pdfjs_arbeiter.replace("</script", r"<\/script")
print(f"   OK  {entschaerft} Vorkommen von '</script' entschaerft")
print(f"   OK  Hauptbuild {len(pdfjs_haupt)/1024:.0f} KB, "
      f"Arbeiter {len(pdfjs_arbeiter)/1024:.0f} KB")

# ---------------------------------------------------------- 4 Assets
schritt("4  Assets einbetten")
schriften = []
for datei, familie, gewicht in [
        ("Poppins-600.woff2", "Poppins", 600),
        ("Inter-400.woff2", "Inter", 400),
        ("Inter-500.woff2", "Inter", 500),
        ("Inter-600.woff2", "Inter", 600)]:
    p = os.path.join("assets/fonts", datei)
    if os.path.exists(os.path.join(HIER, p)):
        schriften.append(
            "@font-face{font-family:'%s';font-weight:%d;font-style:normal;font-display:swap;"
            "src:url(data:font/woff2;base64,%s) format('woff2')}" % (familie, gewicht, b64(p)))
print(f"   OK  {len(schriften)} Schriftschnitte")

briefkoepfe, gebaut = {}, []
for kennung, ordner in [("paderborn", "assets/paderborn"), ("mitte", "assets/mitte")]:
    h = os.path.join(ordner, "header.b64")
    f = os.path.join(ordner, "footer.b64")
    if os.path.exists(os.path.join(HIER, h)) and os.path.exists(os.path.join(HIER, f)):
        briefkoepfe[kennung] = {"header": lies(h).strip(), "footer": lies(f).strip()}
        gebaut.append(kennung)
print("   OK  Briefkoepfe: " + (", ".join(gebaut) if gebaut else "keine"))

logo = ""
for p in ["assets/paderborn/logo.b64"]:
    if os.path.exists(os.path.join(HIER, p)):
        logo = lies(p).strip()
        break
if not logo:
    quelle = os.path.expanduser("~/Desktop/Claude/assets/Logo_WERKE_freigestellt.png")
    if os.path.exists(quelle):
        logo = base64.b64encode(open(quelle, "rb").read()).decode()
print("   OK  Logo eingebettet" if logo else "   !!  Kein Logo gefunden")

assets_js = ("window.ASSETS=" + json.dumps(
    {"logo": logo, "briefkoepfe": briefkoepfe}, ensure_ascii=False) + ";")

# ------------------------------------------------------ 5 Demo-Projekt
schritt("5  Demo-Projekt aus dem Referenzfall erzeugen")
kernprojekt = json.load(open(os.path.join(HIER, "validierung/faelle/maelzerstr59.json")))

UMLAUT = [("Aussenwand", "Außenwand"), ("Haustuer", "Haustür"), ("Dachschraege", "Dachschräge"),
          ("Waermebruecke", "Wärmebrücke"), ("Strasse", "Straße"), ("Maelzer", "Mälzer"),
          ("erdberuehrt", "erdberührt"), ("Gelaende", "Gelände"), ("Kueche", "Küche"),
          ("Aussen", "Außen"), ("Tuer", "Tür"), ("Waerme", "Wärme"), ("Flaeche", "Fläche"),
          ("Geschossdecke", "Geschossdecke"), ("Spitzboden", "Spitzboden"),
          # ohne diese vier bleiben im Demo-Bericht Ersatzschreibungen stehen:
          # Wohnungstueren, Kellerwand ueber Gelaende, Dachflaeche, Fussboden
          ("tuer", "tür"), ("ueber", "über"), ("flaeche", "fläche"),
          ("Fussboden", "Fußboden")]

def umlaut(t):
    for a, b in UMLAUT:
        t = t.replace(a, b)
    return t

for _z in kernprojekt.get("zonen", []):
    _z["name"] = umlaut(_z.get("name", ""))
    for _b in _z.get("huelle", []):
        _b["name"] = umlaut(_b.get("name", ""))

typen, typ_index = [], {}
for raum in kernprojekt["raeume"]:
    for bt in raum["bauteile"]:
        schluessel = (bt["name"].split(" (")[0], round(bt["U"], 6))
        if schluessel not in typ_index:
            tid = "bt_demo_%d" % (len(typen) + 1)
            typ_index[schluessel] = tid
            name = umlaut(schluessel[0])
            # Der U-Wert stammt aus dem Referenzprojekt, nicht aus einer
            # Unterlage dieses Demonstrationsfalls. Ihn als belegt zu
            # kennzeichnen und als Quelle das Referenzprojekt zu nennen waere
            # ein Zirkelbeleg: der Bericht wuerde sich auf sich selbst berufen.
            # Deshalb Annahme mit ehrlicher Begruendung.
            typen.append({"id": tid, "name": name, "U": schluessel[1],
                          "kat_default": bt.get("kat", "huelle"), "schichten": [],
                          "belegt": False,
                          "quelle": "Aus dem Referenzprojekt Mälzerstraße 59 "
                                    "übernommen. Für dieses Demonstrations"
                                    "projekt liegt keine eigene Unterlage vor."})

demo = {
    "version": 2,
    "meta": {"bezeichnung": umlaut(kernprojekt["meta"]["bezeichnung"]), "strasse": "Mälzerstraße 59",
             "plz": "33098", "ort": "Paderborn", "bauherr": "", "projektnr": "DEMO",
             "baujahr": 1936, "bearbeitet": ""},
    "standort": "paderborn",
    "klima": kernprojekt["klima"],
    "luftdichtheit": {"n50": kernprojekt["luftdichtheit"]["n50"], "kategorie": "annahme",
                      "quelle": "Altbau mit neuen Fenstern, keine Messung"},
    "norm": kernprojekt["norm"],
    "optionen": {"f_RH": 0},
    "einheiten": [{"id": "we_eg", "name": "WE EG", "personen": 2},
                  {"id": "we_og", "name": "WE OG", "personen": 2},
                  {"id": "we_dg", "name": "WE DG", "personen": 2}],
    "zonen": kernprojekt["zonen"],
    "bauteiltypen": typen,
    "raeume": [],
    "plan": {"bilder": []},
}
for raum in kernprojekt["raeume"]:
    demo["raeume"].append({
        "id": raum["id"], "geschoss": raum["geschoss"], "name": umlaut(raum["name"]),
        "art": raum["art"], "theta_i": raum["theta_i"], "A": raum["A"], "h": raum["h"],
        "V": raum["V"], "we": raum["we"], "n_min": raum["n_min"],
        "n_exponiert": raum["n_exponiert"],
        "bauteile": [{"typ_id": typ_index[(b["name"].split(" (")[0], round(b["U"], 6))],
                      "name": next((t["name"] for t in typen
                                    if t["id"] == typ_index[(b["name"].split(" (")[0],
                                                             round(b["U"], 6))]), b["name"]),
                      "A": b["A"], "kat": b.get("kat", "huelle"),
                      "grenzt_an": b["grenzt_an"]} for b in raum["bauteile"]],
    })
print(f"   OK  {len(demo['raeume'])} Raeume, {len(typen)} Bauteiltypen, "
      f"{len(demo['zonen'])} Zonen")
demo_js = "window.DEMO_PROJEKT=" + json.dumps(demo, ensure_ascii=False) + ";"

# --------------------------------------------- 5b Baustellensuche im Bericht
# Der Bericht wird gebaut und durchsucht, nicht der Quelltext. Gesucht wird
# nach dem, was Parallelarbeit hinterlaesst: Ueberschrift ohne Text darunter,
# Werkstattmarken, "undefined", "NaN", doppelte Leerzeichen, eckige Klammern
# ohne Einheit, Kennzahl ohne Einheit, gemischte Anfuehrungszeichen. Sechs
# Durchlaeufe: der Demo-Bericht, ein absichtlich duennes Projekt aus zwei
# Raeumen in drei Fassungen, und Sebastians Fall (13 Raeume, OG FLUR ohne
# Huellbauteil) einmal offen und einmal vollstaendig zur Kenntnis genommen.
#
# Die letzten beiden sind neu und waren noetig: ohne ein Kontrollblatt
# entstehen die Befundstufen "offen" und "bestaetigt" gar nicht, und genau
# die beiden druckte der Bericht als das Wort "undefined". Vier gruene
# Durchlaeufe bescheinigten damit Sauberkeit, die es nicht gab.
#
# Seit dem 24.08.2026 baut jeder Durchlauf BEIDE Fassungen des Berichts
# (Druckfassung fuer den Auftraggeber und interne Vollfassung) und laesst
# ueber die Druckfassung zusaetzlich druckSuche() laufen: sie darf dauerhaft
# keine Gueteaussagen tragen (Spanne, Konfidenz, Klasse A/B/C, BEG, belegt,
# Annahme, Pruefung, Quelle, Sicherheit). Die begruendete Ausnahmeliste
# steht in modul_bericht.js, Abschnitt 8c.
schritt("5b  Baustellensuche im erzeugten Bericht")
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False,
                                 encoding="utf-8") as _f:
    json.dump(demo, _f, ensure_ascii=False)
    _demo_pfad = _f.name
try:
    r = subprocess.run(["node", "validierung/bericht_reinheit.js", _demo_pfad],
                       cwd=HIER, capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        print(r.stderr[-2000:])
        abbruch("Die Baustellensuche laesst sich nicht ausfuehren.")
    res = json.loads(r.stdout.strip().splitlines()[-1])
    if not res["ok"]:
        abbruch("Baustelle im Bericht:\n     " + "\n     ".join(res["fehler"][:20]))
    print(f"   OK  {res['anzahl']} Faelle ohne Befund, je Druck- und interne "
          f"Fassung (Demo; duennes Projekt als Entwurf, freigegeben und mit "
          f"rotem Befund; Sebastians Fall offen und zur Kenntnis genommen); "
          f"Druckfassung frei von Guete- und Herkunftsvokabular")
finally:
    os.unlink(_demo_pfad)

# --------------------------------------------------------- 6 Zusammenbau
schritt("6  Einzeldatei zusammenbauen")
html = lies("src/template.html")
ersatz = {
    "/* @@FONTS@@ */": "\n".join(schriften),
    "/* @@STANDORTE@@ */": lies("src/standorte.js").replace(
        "if (typeof module !== \"undefined\") module.exports = { STANDORTE };",
        "window.STANDORTE = STANDORTE;"),
    "/* @@DATEN_ZONENLAGEN@@ */": lies("src/daten/daten_zonenlagen.js"),
    "/* @@KERN@@ */": lies("src/kerne/kern_heizlast_norm.js"),
    "/* @@DATEN_RAUMARTEN@@ */": lies("src/daten/daten_raumarten.js"),
    "/* @@DATEN_KLIMA@@ */": lies("src/daten/daten_klima.js"),
    "/* @@DATEN_BAUTEILE@@ */": lies("src/daten/daten_bauteile.js"),
    "/* @@DATEN_TYPOLOGIE@@ */": lies("src/daten/daten_typologie.js"),
    "/* @@DATEN_BEG@@ */": lies("src/daten/daten_beg_anforderungen.js"),
    "/* @@KERN_PRUEFUNG@@ */": lies("src/kerne/kern_pruefung.js"),
    "/* @@KERN_PLANPRUEFUNG@@ */": lies("src/kerne/kern_planpruefung.js"),
    "/* @@KERN_MASSSTABSPROBE@@ */": lies("src/kerne/kern_massstabsprobe.js"),
    "/* @@KERN_MASSSTAB@@ */": lies("src/kerne/kern_massstab.js"),
    "/* @@KERN_MESSEN@@ */": lies("src/kerne/kern_messen.js"),
    "/* @@KERN_ZUSCHNITT@@ */": lies("src/kerne/kern_zuschnitt.js"),
    "/* @@KERN_ZUORDNUNG@@ */": lies("src/kerne/kern_zuordnung.js"),
    "/* @@KERN_BANDBREITE@@ */": lies("src/kerne/kern_bandbreite.js"),
    "/* @@KERN_FENSTER@@ */": lies("src/kerne/kern_fenster.js"),
    "/* @@KERN_GEGENPROBE@@ */": lies("src/kerne/kern_gegenprobe.js"),
    "/* @@KERN_ANNAHMEN@@ */": lies("src/kerne/kern_annahmen.js"),
    "/* @@KERN_HUELLENDECKUNG@@ */": lies("src/kerne/kern_huellendeckung.js"),
    "/* @@KERN_BAUJAHRPROBE@@ */": lies("src/kerne/kern_baujahrprobe.js"),
    "/* @@KERN_LAGE@@ */": lies("src/kerne/kern_lage.js"),
    "/* @@KERN_FLAECHE@@ */": lies("src/kerne/kern_flaeche.js"),
    "/* @@ASSETS@@ */": assets_js + "\n" + demo_js,
    "/* @@PDFJS_WORKER@@ */": pdfjs_arbeiter,
    "/* @@PDFJS@@ */": pdfjs_haupt + bruecke,
    "/* @@MODUL_DIALOG@@ */": lies("src/modul_dialog.js"),
    "/* @@MODUL_PDF@@ */": lies("src/modul_pdf.js"),
    "/* @@MODUL_PLAN@@ */": lies("src/modul_plan.js"),
    "/* @@MODUL_KI@@ */": lies("src/modul_ki.js"),
    "/* @@MODUL_KONTROLLBLATT@@ */": lies("src/modul_kontrollblatt.js"),
    "/* @@MODUL_PRUEFBLATT@@ */": lies("src/modul_pruefblatt.js"),
    "/* @@MODUL_BERICHTSATZ@@ */": lies("src/modul_berichtsatz.js"),
    "/* @@MODUL_TEILLAST@@ */": lies("src/modul_teillast.js"),
    "/* @@MODUL_BERICHT@@ */": lies("src/modul_bericht.js"),
    "/* @@MODUL_BEWERTUNG@@ */": lies("src/modul_bewertung.js"),
    "/* @@APP@@ */": lies("src/app.js"),
}
for marke, inhalt in ersatz.items():
    if marke not in html:
        abbruch("Marke fehlt in template.html: " + marke)
    html = html.replace(marke, inhalt)

ziel = os.path.join(HIER, "WERKE_Heizlast_Tool.html")
open(ziel, "w", encoding="utf-8").write(html)
groesse = os.path.getsize(ziel) / 1024 / 1024
print(f"   OK  WERKE_Heizlast_Tool.html  ({groesse:.2f} MB)")

# ------------------------------------------------------ 7 Kontrolle
schritt("7  Kontrolle der fertigen Datei")
fehler = []
for marke in ersatz:
    if marke in html:
        fehler.append("Platzhalter nicht ersetzt: " + marke)
if "module.exports" in html and "typeof module" not in html:
    fehler.append("module.exports ohne Schutzabfrage in der Ausgabedatei")
# Die Ampel im Kopf und die Zaehler des Kontrollblatts muessen dieselbe Zahl
# rechnen. Das haengt an einer einzigen Zeile in app.js: wird das
# Kontrollblatt nicht in pruefeAlles hineingereicht, zaehlt der Kopf die
# bestaetigten Zeilen nicht mit und meldet weiter "Nicht belastbar". Ein
# Selbsttest erreicht diese Zeile nicht, darum wird sie hier gelesen.
import re as _re2
_app = lies("src/app.js")
_aufrufe = _re2.findall(r"pruefeAlles\(App\.p,\s*App\.ergebnis,\s*\{(?:[^{}]|\{[^{}]*\})*\}",
                        _app)
if not _aufrufe:
    fehler.append("Kein Aufruf von pruefeAlles in app.js gefunden")
for _a in _aufrufe:
    if "kontrollblatt:" not in _a:
        fehler.append("pruefeAlles ohne kontrollblatt: die Ampel wuerde die "
                      "bestaetigten Zeilen nicht mitzaehlen")
for pflicht in ["KERN_HEIZLAST_NORM", "KERN_PRUEFUNG", "KERN_PLANPRUEFUNG", "KERN_MASSSTABSPROBE", "KERN_MASSSTAB", "KERN_MESSEN", "KERN_ZUORDNUNG", "KERN_BANDBREITE", "KERN_FENSTER", "KERN_ANNAHMEN", "KERN_HUELLENDECKUNG", "DATEN_TYPOLOGIE", "DATEN_BEG_ANFORDERUNGEN", "MODUL_PLAN",
                "MODUL_KI", "MODUL_KONTROLLBLATT", "MODUL_BERICHT", "MODUL_BEWERTUNG",
                "MODUL_BERICHTSATZ",
                "MODUL_PDF",
                "DEMO_PROJEKT", "window.ASSETS"]:
    # Auf die ZUWEISUNG pruefen, nicht auf das blosse Vorkommen des Namens.
    # Ein "window.KERN_MESSEN" steht auch in jeder Datei, die den Kern nur
    # BENUTZT. Genau daran ist diese Probe jahrelang vorbeigelaufen: der Name
    # war in der Ausgabe, der Kern selbst fehlte.
    if pflicht.startswith("window."):
        vorhanden = pflicht in html
    else:
        vorhanden = bool(re.search(r"window\.%s\s*=[^=]" % re.escape(pflicht), html)
                         or re.search(r"\b(?:const|let|var)\s+%s\s*=" % re.escape(pflicht), html))
    if not vorhanden:
        fehler.append("fehlt in der Ausgabe: " + pflicht)

# Jedes Modul, das eine andere Quelldatei benutzt, muss auch mitgeliefert sein.
# Das ist die Probe gegen den Fehler, der hier schon mehrfach vorkam: ein Kern
# wird gebaut, selbstgetestet und dann nie eingebunden. kern_messen.js war
# 456 Zeilen lang, hatte 63 bestandene Pruefungen und fehlte in der
# Auslieferung vollstaendig -- das Messwerkzeug im Plan konnte deshalb nie
# benutzt werden. Der Selbsttest kann das nicht finden, er ruft die Datei ja
# direkt auf. Also wird hier die ausgelieferte Datei befragt.
_quellen_alle = []
for _wurzel, _unter, _dateien in os.walk(os.path.join(HIER, "src")):
    for _d in _dateien:
        if _d.endswith(".js"):
            _quellen_alle.append(os.path.join(_wurzel, _d))
_stellt_bereit = {}          # window.NAME = ...  ->  Datei
for _p in _quellen_alle:
    for _n in re.findall(r"window\.([A-Z][A-Z0-9_]+)\s*=", lies(os.path.relpath(_p, HIER))):
        _stellt_bereit[_n] = os.path.relpath(_p, HIER)
for _name, _heimat in sorted(_stellt_bereit.items()):
    _benutzer = [os.path.relpath(_p, HIER) for _p in _quellen_alle
                 if os.path.relpath(_p, HIER) != _heimat
                 and ("window." + _name) in lies(os.path.relpath(_p, HIER))]
    _gesetzt = re.search(r"window\.%s\s*=[^=]" % re.escape(_name), html)
    if _benutzer and not _gesetzt:
        fehler.append("window." + _name + " aus " + _heimat + " wird von "
                      + ", ".join(_benutzer) + " benutzt, ist aber nicht in der "
                      "Ausgabedatei -- Platzhalter in src/template.html und "
                      "Eintrag in build.py fehlen")

# pdf.js muss vollstaendig und in beiden Wegen vorhanden sein. Fehlt einer,
# laeuft das Werkzeug entweder nur online oder gar nicht mit PDF.
if 'id="pdfworkerquelle"' not in html:
    fehler.append("Der Block mit der Arbeiterquelle fehlt in der Ausgabe")
if "globalThis.pdfjsWorker={WorkerMessageHandler}" not in html:
    fehler.append("Die Arbeiterquelle meldet sich nicht selbst an "
                  "(globalThis.pdfjsWorker fehlt) -- ohne Netz kein PDF")
if "globalThis.pdfjsLib={" not in html:
    fehler.append("Die Bruecke globalThis.pdfjsLib fehlt in der Ausgabe")
# Seit dem 24.08.2026 liegt auch die Hauptbibliothek inert (text/plain) und
# wird erst beim ersten Ablegen einer Datei geladen. Beide Haelften des Wegs
# muessen da sein: der Quellblock und der Lader, den modul_pdf.js ruft.
if 'id="pdfhauptquelle"' not in html:
    fehler.append("Der inerte Block mit der pdf.js-Hauptquelle fehlt in der Ausgabe")
if "window.pdfjsHauptLaden = function" not in html:
    fehler.append("Der Lader pdfjsHauptLaden fehlt in der Ausgabe -- pdf.js "
                  "waere unerreichbar")
if "pdfjsHauptLaden" not in lies("src/modul_pdf.js"):
    fehler.append("modul_pdf.js ruft pdfjsHauptLaden nicht -- die aufgeschobene "
                  "Bibliothek wuerde nie geladen")
# Ein '</script' in der eingebetteten Bibliothek wuerde den Block beenden und
# den Rest der Datei als Text ausgeben. Muss nach dem Zusammenbau null sein.
for _blockname in ("pdfworkerquelle", "pdfhauptquelle"):
    zwischen = html.split('<script type="text/plain" id="%s">' % _blockname)
    if len(zwischen) == 2 and "</script>" in zwischen[1]:
        _block = zwischen[1].split("</script>")[0]
        if "</script" in _block:
            fehler.append("Der Block %s enthaelt '</script' und wuerde den "
                          "Block sprengen" % _blockname)
# Schluessel des Endpunkt-Schemas muessen in ASCII bleiben. Ein Umlaut darin
# trennt still die Verbindung zwischen Endpunkt und Werkzeug: das Werkzeug liest
# dann einen Schluessel, den es nicht gibt, und der Wert geht verloren.
endpunkt = os.path.join(HIER, "api/netlify/functions/plan-auslesen.mjs")
if os.path.exists(endpunkt):
    import re as _re
    quelle = open(endpunkt, encoding="utf-8").read()
    schluessel = _re.findall(r'^\s{4,}([A-Za-zÄÖÜäöüß_][A-Za-z0-9ÄÖÜäöüß_]*):\s*\{',
                             quelle, _re.M)
    krumm = sorted({k for k in schluessel if _re.search(r"[ÄÖÜäöüß]", k)})
    if krumm:
        fehler.append("Schema-Schluessel mit Umlaut im Endpunkt: " + ", ".join(krumm))
    # und die Gegenprobe: liest das Werkzeug Schluessel, die es im Schema nicht gibt?
    gelesen = set(_re.findall(r"\br\.([a-z_0-9]+)\b", lies("src/modul_ki.js")))
    bekannt = set(schluessel) | {"konfidenz", "fundstellen"}
    unbekannt = sorted(g for g in gelesen
                       if g not in bekannt and g.endswith(("_m2", "_m", "_text")))
    if unbekannt:
        fehler.append("Werkzeug liest Felder, die das Schema nicht kennt: "
                      + ", ".join(unbekannt))

# Der Schluessel darf unter keinen Umstaenden in der Datei landen
for verboten in ["sk-ant-", "ANTHROPIC_API_KEY"]:
    if verboten in html:
        fehler.append("SICHERHEIT: '" + verboten + "' steht in der Auslieferungsdatei")
if fehler:
    abbruch("\n   ".join(fehler))
print("   OK  keine Platzhalter, keine Schluessel, alle Module vorhanden")

print("\n\033[32mFertig.\033[0m  " + ziel)
print("Testaufruf mit dem Referenzprojekt:  WERKE_Heizlast_Tool.html?demo=1")
