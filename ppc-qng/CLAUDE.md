# ppc-qng – Projektgedächtnis für Claude Code

Gilt für alle Arbeiten im Ordner `ppc-qng/`. Wird von Claude Code automatisch geladen.

## Projekt

- **Ziel:** Leads (kostenloser QNG-Machbarkeitscheck / Erstgespräch) für die
  QNG-Planungsdienstleistung der **WERK.E Energie-Effizienz-Beratung**
  (werk-e.de · Paderborn, Bielefeld, Kassel · interne Auditoren, USP: alles aus einer Hand).
- **Bestandteile:** Conversion-Landingpage mit A/B-Varianten (`landingpage/`),
  Google-Ads-Kampagnenpaket mit Import-CSVs (`kampagne/import/`), Doku 01–04 (`kampagne/`).
- **Branch:** `claude/ppc-qng-landing-campaign-g9da0e` – dort entwickeln, committen, pushen.
- **Einstieg:** `README.md` (Struktur + Launch-Checkliste), `kampagne/04-ab-test-plan.md` (Testsystem).

## Feste Regeln

1. **Sprache:** Deutsch, Sie-Form, sachlich-professionell (Tonalität von werk-e.de).
2. **Anzeigen & Keywords nie direkt in den CSVs ändern.** Immer
   `kampagne/import/generator.py` anpassen und ausführen – das Skript validiert die
   Google-Ads-Limits (Headlines ≤ 30, Descriptions ≤ 90, Pfade ≤ 15 Zeichen) und
   schreibt die CSVs neu. Die CSVs sind generierte Artefakte.
3. **Landingpage** (`landingpage/index.html`): eine Datei, **keine externen Requests**
   (kein CDN, keine Webfonts, keine Fremdbilder), System-Font-Stack, Farben über
   CSS-Variablen am Dateianfang. A/B-Varianten laufen über `?v=a|b|c` +
   `html[data-variant]` – neue Varianten in dieses System einbauen, keine separaten Dateien.
4. **Tracking-Kontrakt nicht brechen:** dataLayer-Events `qng_lead_submit`,
   `qng_lead_thankyou`, `qng_call_click`, `qng_cta_click`; Formularfelder `gclid` und
   `lp_variant`; Variante sitzungsstabil via sessionStorage. Änderungen daran immer in
   `kampagne/03-tracking-und-messung.md` nachziehen.
5. **Förderzahlen** (KfW 297/298: 100.000 € → 150.000 €/WE mit QNG; KfW 300: bis
   270.000 €; § 7b EStG: 5 % Sonder-AfA) nur mit „bis zu" + Stand-Datum verwenden.
   Bei Änderungen zuerst aktuelle KfW-Bedingungen per Websuche verifizieren und das
   Stand-Datum auf der Landingpage + im README aktualisieren. **Keine Erfolgsgarantie**
   für die Siegelvergabe versprechen (vergeben akkreditierte Zertifizierungsstellen).
6. **Firmen-Claims** (60+ Fachleute, 10.000+ Projekte, seit 2013, Kontaktdaten,
   MFH-Referenz mit 12 WE) stammen aus öffentlichen Quellen – als „zu verifizieren"
   behandeln, nie ausschmücken oder neue Zahlen erfinden.
7. **A/B-Tests** nach `kampagne/04-ab-test-plan.md`: eine Variable pro Test,
   Mindest-Datenbasis und Entscheidungsregeln einhalten, Test-Log pflegen.
8. **Doku ist Teil des Deliverables:** Jede inhaltliche Änderung in den betroffenen
   Dateien (01–04, README) nachziehen.
9. Andere Inhalte des Repos (z. B. Podcast-Gästeliste) nicht anfassen.

## Definition of Done

- [ ] `python3 kampagne/import/generator.py` läuft fehlerfrei (bei Ads-/Keyword-Änderungen)
- [ ] `index.html` in allen Varianten geprüft (`?v=a|b|c`: Hero, Formular, Events)
- [ ] Betroffene Doku + README aktualisiert
- [ ] Commit mit klarer deutscher Message, Push auf den Projekt-Branch
- [ ] Kurze Zusammenfassung: was geändert, was der Nutzer prüfen muss, nächster sinnvoller Schritt
