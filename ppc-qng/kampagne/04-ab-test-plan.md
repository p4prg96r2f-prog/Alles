# A/B-Test-Plan: Landingpage · Anzeigen · Kampagnen-Experimente

> Testfundament ist eingebaut: Die Landingpage kennt **3 Varianten per URL-Parameter**,
> jede Anzeigengruppe hat ein **RSA-Testpaar (A/B)**, und alle Tracking-Events tragen
> die Dimension `lp_variant`. Dieser Plan legt fest, was wann und wie getestet wird.

---

## 0. Test-Prinzipien (gelten für alle Ebenen)

1. **Eine Variable pro Test.** Hero-Copy ODER Formularlänge ODER Gebotsstrategie – nie kombiniert.
2. **Parallel testen nur über getrennte Ebenen** (z. B. Anzeigen-Test + LP-Test gleichzeitig ist ok,
   weil Google den Traffic unabhängig verteilt; zwei LP-Tests gleichzeitig nicht).
3. **Mindest-Datenbasis vor Entscheidung:**
   - Anzeigen (RSA A vs. B): ≥ 1.000 Impressionen **je** RSA und ≥ 2 Wochen Laufzeit
   - Landingpage-Varianten: ≥ 100 Klicks je Arm, besser ≥ 30 Conversions gesamt, ≥ 2 Wochen
   - Kampagnen-Experimente: von Google ausgewiesene Signifikanz abwarten (oder 4 Wochen)
4. **Entscheidungsregel:** Gewinner nur erklären, wenn der Unterschied in der Primärmetrik
   ≥ 20 % relativ ist ODER Google Signifikanz ausweist. Sonst: verlängern oder Test als
   „kein Unterschied" schließen und nächsten Test starten.
5. **Jedes Ergebnis dokumentieren** (Tabelle in Abschnitt 5) – auch Verlierer und Unentschieden.
6. Während ein Test läuft: **keine manuellen Eingriffe** in die getesteten Elemente.

## 1. Ebene Landingpage (Varianten per URL-Parameter)

Eingebaut in `landingpage/index.html` – ohne Zusatz-Tool, ohne Flackern:

| Variante | URL | Unterschied | Hypothese |
|---|---|---|---|
| **A** (Kontrolle) | `…/qng/` oder `?v=a` | Hero „QNG-Zertifizierung aus einer Hand – eigene Auditoren" | Vertrauen/Sicherheit konvertiert |
| **B** | `…/qng/?v=b` | Hero „Bis zu 50.000 € mehr KfW-Kredit je Wohneinheit" | Konkreter Geldvorteil konvertiert besser |
| **C** | `…/qng/?v=c` | Kurzformular (nur Name, E-Mail, Projektart) | Weniger Felder → mehr Leads (ggf. geringere Qualität) |

Die Variante wird pro Sitzung stabil gehalten (sessionStorage), fließt als `lp_variant`
in **alle** dataLayer-Events (inkl. Conversion auf `danke.html`) und ins Formular
(Feld `lp_variant`) – Lead-Qualität ist also je Variante auswertbar.

**Traffic-Split einrichten (empfohlener Weg – Google Ads „Experimente"):**
1. Google Ads → Alle Kampagnen → **Experimente** → „Benutzerdefiniertes Experiment"
2. Basis: S01 (größte Kampagne), Aufteilung **50/50**, Cookie-basiert
3. In der Testkampagne unter Einstellungen → Kampagnen-URL-Optionen das
   **Final-URL-Suffix `v=b`** setzen (Basis bleibt ohne Suffix = Variante A)
4. Laufzeit 4 Wochen, Primärmetrik: Conversion-Rate (Conversions/Klicks)

Alternative ohne Experiment (einfacher, aber unschärfer): GA4-Vergleich der
`lp_variant`-Dimension, Traffic-Zuteilung per rotierendem Suffix je Kampagne.

**Reihenfolge der LP-Tests:**
1. **Test LP-1:** A vs. B (Hero-Winkel) → Gewinner wird neue Kontrolle
2. **Test LP-2:** Gewinner vs. C (Kurzformular) – dabei Lead-Qualität mit Vertrieb bewerten!
3. **Test LP-3:** CTA-Wording „QNG-Check anfordern" vs. „Förderpotenzial prüfen lassen"
   (im Gewinner umsetzen, per `?v=`-Mechanik erweiterbar)

## 2. Ebene Anzeigen (RSA-Testpaare – bereits angelegt)

Jede Non-Brand-Anzeigengruppe enthält **zwei RSAs mit gegensätzlichem Winkel**
(in `import/anzeigen-rsa.csv`, 10 Testpaare = 10 parallel laufende Anzeigentests):

| RSA | Winkel | Kernbotschaften |
|---|---|---|
| **A** | Auditoren-/Sicherheit-first | „aus einer Hand", „eigene Auditoren", „ein Ansprechpartner" |
| **B** | Förderung-/Zahlen-first | „50 % mehr Kreditrahmen", „Ohne QNG verschenken Sie Geld", „50.000 € mehr je WE" |

**Auswertung (alle 2 Wochen, je Anzeigengruppe):**
- Spalten: Impressionen, CTR, Conversion-Rate, Kosten/Conversion je RSA
- Anzeigenrotation steht auf „Optimieren" → Google verschiebt Impressionen zum
  Gewinner; zusätzlich manuell prüfen, ob ein Winkel **über viele Anzeigengruppen hinweg**
  gewinnt → Erkenntnis in LP-Test und neue Assets übertragen
- Verlierer-RSA nicht löschen, sondern **neu herausfordern**: schwächste Assets
  (Bewertung „Niedrig" im Asset-Bericht) durch neue Varianten ersetzen → Dauertest-Zyklus
- Texte ändern immer über `import/generator.py` (validiert die Zeichenlimits)

## 3. Ebene Kampagne (Google-Ads-Experimente, nacheinander)

| # | Experiment | Setup | Primärmetrik | Dauer |
|---|---|---|---|---|
| K-1 | **Gebotsstrategie:** Conversions maximieren vs. Ziel-CPA | Nach ≥ 30 Conversions; Ziel-CPA = bisheriger CPL + 10 % | Kosten/Conversion | 4 Wochen |
| K-2 | **Broad Match + Smart Bidding** vs. Phrase/Exact | Nur S01; Broad-Keywords als Testarm | CPL + Suchbegriffs-Qualität | 4 Wochen |
| K-3 | **RLSA-Gebotsanpassung** +20 % auf Website-Besucher | Beobachtungszielgruppe → Gebotsanpassung | Conversion-Rate | 4 Wochen |
| K-4 | **Werbezeitplan** 24/7 vs. Geschäftszeiten+Abend | Nach Stundenauswertung aus Monat 1–2 | CPL | 4 Wochen |
| K-5 | **Regional-Boost** OWL/NRW/Hessen +15 % | Gebotsanpassung nach Standort | CPL je Region | 4 Wochen |

## 4. Ebene Assets & Extensions (leichtgewichtige Rotationstests)

- **Sitelink-Set 1** (Leistungs-orientiert: Machbarkeitscheck/Leistungen/…) vs.
  **Set 2** (Förder-orientiert: „150.000 € je WE"/„§ 7b Sonder-AfA"/…) – monatlich rotieren, Klickanteil vergleichen
- **Callout-Fokus:** Vertrauen („Eigene Auditoren", „Seit 2013") vs. Abwicklung („Festpreis", „Schnelle Rückmeldung")
- **Danke-Seite:** Später Variante mit direkter Terminbuchung (Kalender-Link) testen → Show-up-Rate fürs Erstgespräch

## 5. Test-Log (bei jedem abgeschlossenen Test ergänzen)

| Start | Ende | Ebene | Test / Hypothese | Arme | Primärmetrik A→B | Entscheidung |
|---|---|---|---|---|---|---|
| _tt.mm._ | | LP | LP-1: Hero Auditoren vs. Förderung | A / B | | |
| | | Ads | 10× RSA A vs. B je Anzeigengruppe | A / B | | |

## 6. Voraussetzungen fürs Messen (einmalig einrichten)

- [ ] GA4: benutzerdefinierte Dimension **`lp_variant`** (Ereignisbereich) registrieren
- [ ] GA4-Explorationsbericht: Conversion-Rate nach `lp_variant`
- [ ] Formular-Backend/CRM: Feld `lp_variant` mitspeichern (für Lead-Qualität je Variante)
- [ ] Google-Ads-Spalten-Set „RSA-Test" speichern (Impr., CTR, Conv-Rate, CPA auf Anzeigenebene)
- [ ] Kalender-Serie: alle 2 Wochen 30 Min „Test-Review" (Ergebnisse in Test-Log übertragen)
