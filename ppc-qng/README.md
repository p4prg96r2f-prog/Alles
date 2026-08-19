# PPC-Projekt: QNG-Planungsdienstleistung (WERK.E)

Komplettes Paket für Landingpage + Google-Ads-Kampagne zum Verkauf der
QNG-Begleitung (Qualitätssiegel Nachhaltiges Gebäude) mit internen Auditoren.

> **Annahme:** Absender ist die **WERK.E Energie-Effizienz-Beratung** (werk-e.de).
> Kontaktdaten/Claims stammen von der öffentlichen Website bzw. aus öffentlichen
> Verzeichnissen – vor Livegang bitte kurz gegenprüfen (siehe Checkliste unten).

---

## Inhalt

```
ppc-qng/
├── landingpage/
│   ├── index.html        Conversion-Landingpage mit 3 A/B-Varianten (?v=a|b|c), eigenständig
│   └── danke.html        Danke-Seite = Conversion-Ziel fürs Tracking (inkl. Varianten-Attribution)
├── kampagne/
│   ├── 01-strategie-und-budget.md      Zielgruppen, Budget, Gebote, KPIs, Optimierungs-Routine
│   ├── 02-kampagnenstruktur-und-assets.md  Kontoeinstellungen, Struktur, Erweiterungen
│   ├── 03-tracking-und-messung.md      GA4 + Google Ads + Consent Mode v2, Test-Checkliste
│   ├── 04-ab-test-plan.md              A/B-Testsystem: LP-Varianten, RSA-Paare, Experimente
│   └── import/
│       ├── keywords.csv            65 Keywords in 4 Kampagnen / 11 Anzeigengruppen
│       ├── negative-keywords.csv   34 Ausschluss-Keywords (als gemeinsame Liste anlegen)
│       ├── anzeigen-rsa.csv        21 Responsive Search Ads = A/B-Testpaar je Anzeigengruppe
│       └── generator.py            Erzeugt die CSVs neu & prüft Zeichenlimits
└── README.md
```

## Kampagnen-Überblick

| Kampagne | Fokus | Budgetanteil |
|---|---|---|
| S01 QNG Kern | QNG-Zertifizierung, Beratung, Auditor, Ökobilanz, Kosten | 50 % |
| S02 KfW-Foerderung | KfW 297/298, KfW 300, Sonder-AfA § 7b | 30 % |
| S03 Zielgruppen | Bauträger/MFH, EFH/Privat | 15 % |
| S04 Brand | Eigene Marke absichern | 5 % |

Startbudget-Empfehlung: **2.000 €/Monat**, Details in `kampagne/01-strategie-und-budget.md`.

## A/B-Testsystem (eingebaut)

- **Landingpage:** 3 Varianten ohne Zusatz-Tool – `?v=a` Auditoren-first (Standard),
  `?v=b` Förderung-first-Hero, `?v=c` Kurzformular. Variantenwahl vor dem ersten Paint
  (kein Flackern), pro Sitzung stabil, in allen Tracking-Events und im Formularfeld
  `lp_variant` enthalten.
- **Anzeigen:** Jede Non-Brand-Anzeigengruppe enthält ein RSA-Testpaar
  (A: Auditoren/Sicherheit vs. B: Förderung/Zahlen) → 10 parallel laufende Anzeigentests.
- **Kampagnen-Experimente:** Fahrplan K-1 bis K-5 (Gebotsstrategie, Broad Match, RLSA,
  Werbezeiten, Regional-Boost).

Regeln, Mindest-Datenbasis, Auswertung und Test-Log: **`kampagne/04-ab-test-plan.md`**.

## Launch-Checkliste (in dieser Reihenfolge)

**1. Landingpage live bringen**
- [ ] Hosting festlegen – Empfehlung: Unterverzeichnis der Hauptdomain (z. B. `werk-e.de/qng/`) für Domain-Trust
- [ ] `FORM_ENDPOINT` in `index.html` setzen (CRM-Webhook oder Mail-Skript); Testanfrage kommt im Postfach an
- [ ] Zahlen & Claims prüfen: Team-Größe („60+"), „10.000+ Projekte", Telefon 05251 4029291, Erreichbarkeitszeiten, Adresse Rolandsweg 80
- [ ] Projektbeispiel (MFH, 12 WE) mit echten Eckdaten/Foto bestätigen
- [ ] Impressum-/Datenschutz-Links prüfen (zeigen auf werk-e.de)
- [ ] Farben/Logo an CI anpassen (CSS-Variablen am Anfang von `index.html`)
- [ ] Förder-Angaben gegen aktuelle KfW-Bedingungen prüfen und „Stand"-Datum aktualisieren

**2. Tracking (Pflicht vor Kampagnenstart)**
- [ ] CMP mit Consent Mode v2 einbinden, dann GTM-Container (Platzhalter im `<head>`)
- [ ] Conversions „QNG Lead" + „Anruf-Klick" einrichten und testen → `kampagne/03-tracking-und-messung.md`
- [ ] GA4: benutzerdefinierte Dimension `lp_variant` registrieren (A/B-Auswertung, siehe `04-ab-test-plan.md`)

**3. Google-Ads-Konto**
- [ ] Konto-Grundeinstellungen laut `kampagne/02-kampagnenstruktur-und-assets.md`
- [ ] In `import/anzeigen-rsa.csv` die finale URL ersetzen (aktuell Platzhalter `https://werk-e.de/qng/`)
- [ ] CSVs über **Google Ads Editor** importieren (Konto auswählen → Importieren → aus Datei)
- [ ] Ausschlussliste aus `negative-keywords.csv` als gemeinsame Liste anlegen & mit allen Kampagnen verknüpfen
- [ ] Assets anlegen (Sitelinks, Callouts, Snippets, Anruf) laut Doku
- [ ] Advertiser-Verifizierung starten
- [ ] Tagesbudgets setzen, Kampagnen aktivieren

**4. Betrieb**
- [ ] Wöchentliche Routine (Suchbegriffe → Negatives) und Monats-Review laut `01-strategie-und-budget.md`
- [ ] Lead-Qualität wöchentlich mit Vertrieb abgleichen

## Anzeigentexte ändern

Texte in `kampagne/import/generator.py` anpassen und ausführen:

```bash
cd ppc-qng/kampagne/import && python3 generator.py
```

Das Skript validiert automatisch alle Google-Ads-Limits
(Headlines ≤ 30 Zeichen, Beschreibungen ≤ 90, Pfade ≤ 15) und schreibt die CSVs neu.

## Quellen der Förder-Angaben (Stand August 2026)

- KfW 297/298: bis 150.000 € je WE mit QNG, sonst 100.000 € (EH55-Stufe befristet bis 31.12.2026)
- KfW 300: mit QNG 220.000–270.000 € je nach Kinderzahl, ohne QNG 170.000–220.000 €
- QNG-PLUS reicht für die KfW-Förderung; Vergabe über akkreditierte Zertifizierungsstellen (DGNB, NaWoh, BiRN, BNK/BNB)
- § 7b EStG: 5 % Sonderabschreibung p. a. (4 Jahre) für Mietwohnungsneubau im Standard „EH40 mit QNG"

Maßgeblich sind immer die aktuellen KfW-Programmbedingungen (kfw.de) und das
QNG-Regelwerk (nachhaltigesbauen.de bzw. qng.info).
