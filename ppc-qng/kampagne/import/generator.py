# -*- coding: utf-8 -*-
"""Generiert die Google-Ads-Editor-Importdateien und validiert alle Zeichenlimits."""
import csv, os, sys

OUT = os.path.dirname(os.path.abspath(__file__)) or "."
os.makedirs(OUT, exist_ok=True)
FINAL_URL = "https://werk-e.de/qng/"  # TODO: durch Live-URL der Landingpage ersetzen

# ---------------------------------------------------------------- Keywords
# (Kampagne, Anzeigengruppe, Keyword, Match-Type)
K = []
def kw(camp, ag, words):
    for w, mt in words:
        K.append((camp, ag, w, mt))

kw("S01 QNG Kern", "Zertifizierung", [
    ("qng zertifizierung", "Exact"), ("qng zertifizierung", "Phrase"),
    ("qng zertifikat", "Phrase"), ("qng siegel", "Phrase"),
    ("qng siegel beantragen", "Exact"), ("qualitätssiegel nachhaltiges gebäude", "Phrase"),
    ("qng zertifizierung kosten", "Exact"), ("qng bestätigung", "Phrase"),
    ("qng nachweis", "Phrase"), ("nachhaltigkeitszertifizierung gebäude", "Phrase"),
    ("nachhaltigkeitszertifikat neubau", "Phrase"),
])
kw("S01 QNG Kern", "Beratung", [
    ("qng beratung", "Exact"), ("qng beratung", "Phrase"),
    ("qng berater", "Phrase"), ("qng begleitung", "Phrase"),
    ("qng dienstleister", "Phrase"), ("qng experte", "Phrase"),
    ("beratung nachhaltiges bauen", "Phrase"),
])
kw("S01 QNG Kern", "Auditor", [
    ("qng auditor", "Exact"), ("qng auditor", "Phrase"),
    ("qng auditor beauftragen", "Phrase"), ("nachhaltigkeitsauditor gebäude", "Phrase"),
    ("auditor nachhaltiges bauen", "Phrase"),
])
kw("S01 QNG Kern", "Oekobilanz & Nachweise", [
    ("ökobilanz gebäude", "Phrase"), ("lebenszyklusanalyse gebäude", "Phrase"),
    ("lca gebäude erstellen", "Phrase"), ("ökobilanzierung neubau", "Phrase"),
    ("qng lebenszyklusanalyse", "Phrase"),
])
kw("S01 QNG Kern", "Kosten & Ablauf", [
    ("qng kosten", "Phrase"), ("qng anforderungen", "Phrase"),
    ("qng kriterien", "Phrase"), ("qng ablauf", "Phrase"),
    ("qng checkliste", "Phrase"),
])
kw("S02 KfW-Foerderung", "KfW 297-298", [
    ("kfw 297", "Exact"), ("kfw 298", "Exact"), ("kfw 297 qng", "Phrase"),
    ("klimafreundlicher neubau", "Phrase"), ("kfw klimafreundlicher neubau", "Phrase"),
    ("kfw neubau förderung", "Phrase"), ("kfw förderung neubau qng", "Phrase"),
    ("effizienzhaus 40 qng", "Phrase"),
])
kw("S02 KfW-Foerderung", "KfW 300 Familien", [
    ("kfw 300", "Exact"), ("wohneigentum für familien", "Phrase"),
    ("kfw 300 qng", "Phrase"), ("kfw förderung familien neubau", "Phrase"),
])
kw("S02 KfW-Foerderung", "Sonder-AfA 7b", [
    ("sonderabschreibung 7b", "Phrase"), ("7b estg", "Phrase"),
    ("7b estg qng", "Exact"), ("sonderabschreibung mietwohnungsneubau", "Phrase"),
    ("sonder afa neubau", "Phrase"),
])
kw("S03 Zielgruppen", "Bautraeger & MFH", [
    ("qng mehrfamilienhaus", "Phrase"), ("qng bauträger", "Phrase"),
    ("nachhaltigkeitszertifizierung mehrfamilienhaus", "Phrase"),
    ("dgnb mehrfamilienhaus", "Phrase"), ("nawoh zertifizierung", "Phrase"),
])
kw("S03 Zielgruppen", "EFH & Privat", [
    ("qng einfamilienhaus", "Phrase"), ("qng fertighaus", "Phrase"),
    ("qng massivhaus", "Phrase"), ("nachhaltigkeitszertifikat einfamilienhaus", "Phrase"),
    ("kfw förderung einfamilienhaus qng", "Phrase"),
])
kw("S04 Brand", "Brand", [
    ("werk.e", "Exact"), ("werk e", "Phrase"),
    ("werk e energieberatung", "Phrase"), ("werk e paderborn", "Phrase"),
    ("werk e energie effizienz beratung", "Phrase"),
])

# ------------------------------------------------------- Ausschluss-Keywords
NEG = [
    # Job & Karriere
    ("job", "Broad"), ("jobs", "Broad"), ("stellenangebot", "Broad"),
    ("stellenangebote", "Broad"), ("gehalt", "Broad"), ("karriere", "Broad"),
    ("praktikum", "Broad"), ("minijob", "Broad"),
    # Aus-/Weiterbildung (wollen Auditor werden, nicht beauftragen)
    ("ausbildung", "Broad"), ("weiterbildung", "Broad"), ("fortbildung", "Broad"),
    ("schulung", "Broad"), ("seminar", "Broad"), ("studium", "Broad"),
    ("auditor werden", "Phrase"), ("berater werden", "Phrase"),
    ("zertifizierungsstelle werden", "Phrase"), ("prüfung bestehen", "Phrase"),
    # Informational / akademisch
    ("wikipedia", "Broad"), ("definition", "Broad"), ("bedeutung", "Broad"),
    ("englisch", "Broad"), ("übersetzung", "Broad"), ("bachelorarbeit", "Broad"),
    ("masterarbeit", "Broad"), ("hausarbeit", "Broad"), ("referat", "Broad"),
    # Falsche Produkte / Kanäle
    ("software", "Broad"), ("freeware", "Broad"), ("gebraucht", "Broad"),
    ("amazon", "Broad"), ("ebay", "Broad"), ("muster pdf", "Phrase"),
    ("vorlage kostenlos", "Phrase"),
]

# ------------------------------------------------------------------- RSAs
# Wiederverwendbare Bausteine
H = {
 "zert1": "QNG-Zertifizierung aus 1 Hand",
 "audit": "Mit eigenen QNG-Auditoren",
 "siegel": "Schnell zum QNG-Siegel",
 "stufen": "QNG-PLUS & QNG-PREMIUM",
 "kfw150": "Bis 150.000 € KfW je Einheit",
 "check": "Kostenloser QNG-Check",
 "ansprech": "Ein Ansprechpartner bis Siegel",
 "oeko": "Ökobilanz & Nachweise inkl.",
 "pruefung": "Sicher durch die QNG-Prüfung",
 "festpreis": "Festpreis-Angebot sichern",
 "gespraech": "Jetzt Erstgespräch sichern",
 "pb": "Ihr QNG-Partner aus Paderborn",
 "bundesweit": "Bundesweit tätig",
 "umwege": "Zertifizierung ohne Umwege",
 "seit": "Energieberater seit 2013",
 "ber1": "QNG-Beratung vom Profi",
 "ber2": "QNG-Beratung & Begleitung",
 "ber3": "Wir übernehmen Ihr QNG-Thema",
 "aud1": "QNG-Auditoren im eigenen Haus",
 "aud2": "Auditor-Team beauftragen",
 "aud3": "Kapazität für Ihr Projekt",
 "serie": "Serien-Zertifizierung möglich",
 "zg": "Für Bauträger & Bauherren",
 "lca1": "Ökobilanz (LCA) vom Fachbüro",
 "lca2": "LCA für QNG & KfW-Nachweis",
 "lca3": "Ökobilanz erstellen lassen",
 "lca4": "Schadstoffkonzept & Nachweise",
 "kost1": "QNG-Kosten klar kalkuliert",
 "kost2": "Ablauf, Kosten & Dauer klären",
 "kfwA": "KfW 297/298 voll ausschöpfen",
 "kfwB": "150.000 € statt 100.000 €",
 "kfwC": "Zinsvorteil mit QNG sichern",
 "kfwD": "Kostenloser Förder-Check",
 "kfwE": "EH40 + QNG aus einer Hand",
 "famA": "Bis 270.000 € für Familien",
 "famB": "KfW 300 mit QNG ausschöpfen",
 "famC": "Familienförderung nutzen",
 "famD": "Traumhaus mit Top-Förderung",
 "efh": "QNG für Ihr Einfamilienhaus",
 "afaA": "Sonder-AfA nach § 7b nutzen",
 "afaB": "5 % Sonder-AfA mit QNG",
 "afaC": "Für Vermieter & Bauträger",
 "afaD": "QNG macht § 7b möglich",
 "afaE": "Nachweise aus einer Hand",
 "mfh": "QNG fürs Mehrfamilienhaus",
 "bt": "Partner für Bauträger",
 "brandA": "WERK.E – Ihr QNG-Partner",
 "brandB": "WERK.E Paderborn",
 "brandC": "60+ Experten, 10.000+ Projekte",
 "brandD": "Paderborn Bielefeld Kassel",
 "brandE": "Jetzt QNG-Check anfordern",
 "erst": "Kostenloses Erstgespräch",
}
D = {
 "d1": "QNG-Zertifizierung komplett begleitet: Machbarkeitscheck, Ökobilanz, Nachweise, Siegel.",
 "d2": "Eigene Auditoren statt Schnittstellen – wir führen Ihr Projekt sicher zum QNG-Siegel.",
 "d3": "Mit QNG bis zu 150.000 € KfW-Kredit je Wohneinheit – wir prüfen Ihr Projekt kostenlos.",
 "d4": "Kostenloses Erstgespräch: Zielstufe, Kosten und Ablauf in 30 Minuten klären.",
 "d5": "KfW 297/298 & 300: Wir kombinieren EH40-Nachweis und QNG für die höchste Förderstufe.",
 "d6": "Für Bauträger & Planungsbüros: eigenes Auditoren-Team, klare Termine, Festpreis.",
 "d7": "Sonderabschreibung nach § 7b EStG: QNG macht's möglich. Wir liefern alle Nachweise.",
 "d8": "Vom Effizienzhaus 40 zum QNG-Siegel: mehr KfW-Kredit und besserer Zins für Ihr Haus.",
 "d9": "KfW 300 mit QNG: bis zu 270.000 € Kredit für Familien. Wir prüfen Ihre Möglichkeiten.",
}

def ad(camp, ag, hkeys, dkeys, p1, p2):
    return {
        "camp": camp, "ag": ag,
        "H": [H[k] for k in hkeys], "D": [D[k] for k in dkeys],
        "p1": p1, "p2": p2,
    }

ADS = [
 ad("S01 QNG Kern", "Zertifizierung",
    ["zert1","audit","siegel","stufen","kfw150","check","ansprech","oeko","pruefung","festpreis","gespraech","pb","bundesweit","umwege","seit"],
    ["d1","d2","d3","d4"], "qng", "zertifizierung"),
 ad("S01 QNG Kern", "Beratung",
    ["ber1","ber2","ber3","audit","check","ansprech","kfw150","oeko","festpreis","gespraech","bundesweit","seit"],
    ["d2","d4","d1","d3"], "qng", "beratung"),
 ad("S01 QNG Kern", "Auditor",
    ["aud1","aud2","aud3","zg","serie","oeko","ansprech","check","festpreis","bundesweit","seit"],
    ["d2","d6","d1","d4"], "qng", "auditoren"),
 ad("S01 QNG Kern", "Oekobilanz & Nachweise",
    ["lca1","lca2","lca3","lca4","audit","check","festpreis","ansprech","bundesweit","gespraech"],
    ["d1","d2","d4","d5"], "qng", "oekobilanz"),
 ad("S01 QNG Kern", "Kosten & Ablauf",
    ["kost1","kost2","check","festpreis","zert1","kfw150","audit","ansprech","gespraech","seit"],
    ["d4","d3","d1","d2"], "qng", "kosten"),
 ad("S02 KfW-Foerderung", "KfW 297-298",
    ["kfw150","kfwA","kfwB","kfwC","zert1","audit","kfwD","kfwE","ansprech","gespraech","bundesweit"],
    ["d3","d5","d2","d4"], "qng", "kfw-297-298"),
 ad("S02 KfW-Foerderung", "KfW 300 Familien",
    ["famA","famB","famC","famD","efh","kfwD","audit","ansprech","gespraech","festpreis"],
    ["d9","d5","d2","d4"], "qng", "kfw-300"),
 ad("S02 KfW-Foerderung", "Sonder-AfA 7b",
    ["afaA","afaB","afaC","afaD","afaE","audit","serie","check","ansprech","gespraech"],
    ["d7","d6","d2","d5"], "qng", "sonder-afa-7b"),
 ad("S03 Zielgruppen", "Bautraeger & MFH",
    ["mfh","bt","serie","aud1","kfw150","afaA","festpreis","ansprech","check","bundesweit"],
    ["d6","d3","d5","d2"], "qng", "bautraeger"),
 ad("S03 Zielgruppen", "EFH & Privat",
    ["efh","famD","famA","kfwB","check","audit","ansprech","festpreis","gespraech","seit"],
    ["d8","d3","d4","d2"], "qng", "einfamilienhaus"),
 ad("S04 Brand", "Brand",
    ["brandA","brandB","seit","zert1","audit","erst","brandC","brandD","bundesweit","brandE"],
    ["d2","d1","d4","d3"], "qng", "werk-e"),
]

# ------------------------------------------------------------- Validierung
errors = []
for a in ADS:
    for h in a["H"]:
        if len(h) > 30:
            errors.append(f"Headline >30 ({len(h)}): [{a['ag']}] {h!r}")
    if not (3 <= len(a["H"]) <= 15):
        errors.append(f"Headline-Anzahl {len(a['H'])} in {a['ag']}")
    if len(set(a["H"])) != len(a["H"]):
        errors.append(f"Doppelte Headline in {a['ag']}")
    for d in a["D"]:
        if len(d) > 90:
            errors.append(f"Description >90 ({len(d)}): [{a['ag']}] {d!r}")
    if len(a["D"]) != 4:
        errors.append(f"Description-Anzahl {len(a['D'])} in {a['ag']}")
    for p in (a["p1"], a["p2"]):
        if len(p) > 15:
            errors.append(f"Pfad >15 ({len(p)}): [{a['ag']}] {p!r}")

seen = set()
for c, g, w, m in K:
    if w != w.lower().strip():
        errors.append(f"Keyword nicht normalisiert: {w!r}")
    key = (c, g, w, m)
    if key in seen:
        errors.append(f"Doppeltes Keyword: {key}")
    seen.add(key)

if errors:
    print("VALIDIERUNG FEHLGESCHLAGEN:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

# ------------------------------------------------------------------ Schreiben
with open(f"{OUT}/keywords.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Campaign", "Ad Group", "Keyword", "Criterion Type"])
    for row in K:
        w.writerow(row)

with open(f"{OUT}/negative-keywords.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Negative Keyword", "Match Type"])
    for row in NEG:
        w.writerow(row)

with open(f"{OUT}/anzeigen-rsa.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    head = ["Campaign", "Ad Group", "Ad Type"]
    head += [f"Headline {i}" for i in range(1, 16)]
    head += [f"Description {i}" for i in range(1, 5)]
    head += ["Path 1", "Path 2", "Final URL"]
    w.writerow(head)
    for a in ADS:
        hs = a["H"] + [""] * (15 - len(a["H"]))
        w.writerow([a["camp"], a["ag"], "Responsive search ad"] + hs + a["D"] + [a["p1"], a["p2"], FINAL_URL])

print(f"OK: {len(K)} Keywords, {len(NEG)} Negatives, {len(ADS)} RSAs geschrieben.")
print("Längen-Check bestanden (Headlines ≤30, Descriptions ≤90, Pfade ≤15).")
for a in ADS:
    print(f"  {a['camp']} / {a['ag']}: {len(a['H'])} Headlines, {len(a['D'])} Descriptions")
