# Google-Ads-Kampagnenstruktur & Assets

> Import-Dateien: `import/keywords.csv`, `import/negative-keywords.csv`, `import/anzeigen-rsa.csv`
> (Format für Google Ads Editor, Spaltenköpfe englisch – werden von jeder Editor-Sprachversion erkannt).

---

## 1. Konto-Grundeinstellungen

| Einstellung | Wert | Hinweis |
|---|---|---|
| Netzwerk | **Nur Google Suche** | Display-Netzwerk & Suchnetzwerk-Partner **deaktivieren** (Streuverlust) |
| Standort | Deutschland | Zielort-Option: „Präsenz: Personen in …" (nicht „Interesse an") |
| Sprache | Deutsch + Englisch | Englisch wegen englischer Browser-Einstellungen deutscher Nutzer |
| Auto-Tagging (gclid) | **An** | Pflicht für sauberes Conversion-Tracking |
| Anzeigenrotation | Optimieren | |
| Werbezeitplaner | 24/7 zum Start | Nach 4 Wochen anhand Stundenauswertung schärfen |
| Geräte | Alle, keine Anpassung | Mobile liefert Anrufe – Sticky-CTA auf LP vorhanden |

Optionale Gebotsanpassung nach Einschwingen: +10–20 % für NRW/OWL & Nordhessen
(Nähe zu Standorten Paderborn/Bielefeld/Kassel als Vertrauensvorteil).

## 2. Struktur-Übersicht

```
S01 QNG Kern                    (50 % Budget – höchste Intention)
├── AG Zertifizierung           „qng zertifizierung", „qng siegel", …
├── AG Beratung                 „qng beratung", „qng begleitung", …
├── AG Auditor                  „qng auditor", „auditor nachhaltiges bauen", …
├── AG Ökobilanz & Nachweise    „ökobilanz gebäude", „lca gebäude", …
└── AG Kosten & Ablauf          „qng kosten", „qng anforderungen", …

S02 KfW-Förderung               (30 % – Förder-Nachfrage abholen)
├── AG KfW 297-298              „kfw 297", „klimafreundlicher neubau", …
├── AG KfW 300 Familien         „kfw 300", „wohneigentum für familien", …
└── AG Sonder-AfA 7b            „sonderabschreibung 7b", „7b estg", …

S03 Zielgruppen & Gebäudetypen  (15 % – Segment-Ansprache)
├── AG Bautraeger & MFH         „qng mehrfamilienhaus", „qng bauträger", …
└── AG EFH & Privat             „qng einfamilienhaus", „qng fertighaus", …

S04 Brand                       (5 % – Marke absichern)
└── AG Brand                    „werk.e", „werk e energieberatung", …
```

**Prinzip:** Enge, thematisch saubere Anzeigengruppen → Anzeige spiegelt exakt die
Suchintention (Message-Match Keyword → Headline → LP-H1). Match-Types: Exact für
Kern-Begriffe, Phrase für Umfeld. **Kein Broad Match** in der Startphase.

## 3. Anzeigen (Responsive Search Ads)

Je Anzeigengruppe 1 RSA mit 10–15 Headlines und 4 Beschreibungen – fertig in
`import/anzeigen-rsa.csv`. Regeln:

- **Kein Pinning** zum Start (Anzeigenstärke!). Ausnahme Brand: Headline „WERK.E – Ihr QNG-Partner" auf Position 1 pinnen.
- Zahlenversprechen („bis zu 150.000 €") nur in Kombination mit QNG-Kontext – deckt sich mit LP-Disclaimer.
- Nach 2–4 Wochen: Assets mit Bewertung „Niedrig" austauschen, nie alle gleichzeitig.
- Finale URL überall: Live-URL der Landingpage (Platzhalter aktuell `https://werk-e.de/qng/` – **vor Import ersetzen**, siehe README).

## 4. Assets (Anzeigenerweiterungen) – auf Konto- oder Kampagnenebene anlegen

**Sitelinks (mind. 4):**

| Sitelink-Text | Beschreibung Zeile 1 | Beschreibung Zeile 2 | Ziel |
|---|---|---|---|
| QNG-Machbarkeitscheck | Ampel-Ergebnis in Tagen | Kostenlos & unverbindlich | LP `#qng-check` |
| Leistungen & Ablauf | Vom Check bis zum Siegel | In 5 klaren Schritten | LP `#leistungen` |
| KfW-Förderung mit QNG | Bis 150.000 € je Einheit | Förderstufen im Überblick | LP `#foerderung` |
| Für Bauträger & Büros | Eigenes Auditoren-Team | Serien & § 7b-Nachweise | LP `#warum` |

**Callouts (Erweiterungen mit Zusatzinformationen):**
`Eigene Auditoren im Haus` · `Festpreis-Angebot` · `Seit 2013` · `Bundesweit tätig` ·
`EH40 + QNG aus einer Hand` · `Kostenloses Erstgespräch`

**Strukturiertes Snippet** – Typ „Leistungen":
`Machbarkeitscheck` · `Ökobilanz (LCA)` · `Schadstoffmanagement` · `Nachweisführung` · `Zertifizierungsbegleitung`

**Anruf-Asset:** 05251 4029291, Zeitplan Mo–Fr 8–17 Uhr (Zeiten mit Team abstimmen).
**Logo & Unternehmensname:** erfordert abgeschlossene Advertiser-Verifizierung.
**Bild-Assets:** Projektfotos (MFH-Referenz) im Querformat 1,91:1 + Quadrat nachrüsten.

## 5. Ausschluss-Keywords

`import/negative-keywords.csv` als **gemeinsame Ausschlussliste** anlegen
(Tools → Gemeinsam genutzte Bibliothek → Ausschlusslisten) und mit allen vier
Kampagnen verknüpfen. Logik der Liste:

- **Job/Karriere-Suchen:** job, stellenangebot, gehalt, karriere, …
- **Aus-/Weiterbildung** (wollen Auditor *werden*, nicht beauftragen): ausbildung, schulung, seminar, „auditor werden", …
- **Rein informational/akademisch:** wikipedia, definition, pdf, muster, bachelorarbeit, …
- **Falsche Produkte:** software, gebraucht, amazon, …

Brand-Kampagne zusätzlich: Wettbewerber-Namen NICHT als Keywords buchen (Kosten/Klagerisiko),
aber eigene Marke gegen Vertipper absichern (bereits in `keywords.csv`).

## 6. Zielgruppen (nur Beobachtung zum Start)

- Websitebesucher (30/90 Tage) – Basis für spätere RLSA-Gebotsanpassung
- „Kaufbereite Zielgruppen": Wohnimmobilien / Hausbau
- Demografie offen lassen (B2B-Entscheider sind schwer abgrenzbar)
