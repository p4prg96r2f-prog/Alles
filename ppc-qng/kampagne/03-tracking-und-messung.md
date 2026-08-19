# Tracking & Messung (GA4 · Google Ads · Consent Mode v2)

> Ohne sauberes Tracking keine „Conversions maximieren"-Gebote – **dieses Setup ist
> Voraussetzung für den Kampagnenstart.** Die Landingpage bringt alle nötigen
> dataLayer-Events bereits mit.

---

## 1. Architektur

```
CMP / Consent-Banner (Consent Mode v2)   ← zuerst laden!
        │
Google Tag Manager (GTM-Container)
        ├── GA4-Konfigurations-Tag
        ├── GA4-Event-Tags (generate_lead, call_click)
        └── Google-Ads-Conversion-Tags (+ Conversion-Verknüpfung GA4↔Ads)
```

**Pflicht in DE/EEA:** Zertifizierte Consent Management Platform (z. B. Usercentrics,
Cookiebot, consentmanager) mit **Google Consent Mode v2** (`ad_storage`,
`ad_user_data`, `ad_personalization`, `analytics_storage`). Ohne Einwilligungssignale
verwirft Google Ads Conversions von EEA-Traffic.

## 2. Events, die die Landingpage bereits sendet

| dataLayer-Event | Auslöser | Verwendung |
|---|---|---|
| `qng_lead_submit` | Formular abgeschickt (inkl. `projektart`, `projektstand`) | GA4-Event `generate_lead` |
| `qng_lead_thankyou` | Aufruf `danke.html` | **Primäre Ads-Conversion „QNG Lead"** |
| `qng_call_click` | Klick auf Telefonnummer (alle `tel:`-Links) | Sekundäre Conversion „Anruf-Klick" |
| `qng_cta_click` | Klick auf CTA-Buttons (mit `cta_position`) | Engagement-Analyse / LP-Optimierung |

Zusätzlich schreibt die Seite die **gclid** in ein verstecktes Formularfeld und in
`sessionStorage` – damit kann das Formular-Backend die Klick-ID mitspeichern
(Basis für späteren Offline-Conversion-Import).

## 3. Einrichtung Schritt für Schritt

1. **GTM-Container** erstellen, Snippet in `index.html` + `danke.html` einfügen
   (Platzhalter-Kommentar im `<head>` der LP markiert die Stelle). CMP davor.
2. **GA4-Property** anlegen, Konfigurations-Tag in GTM (Consent-Initialisierung beachten).
3. GA4-Event-Tag `generate_lead` auf Trigger „Benutzerdefiniertes Ereignis = `qng_lead_submit`".
4. **Google Ads ↔ GA4 verknüpfen** und/oder direktes Ads-Conversion-Tag:
   - Conversion **„QNG Lead"**: Trigger `qng_lead_thankyou` (robusteste Variante: zusätzlich Seitenaufruf-Trigger auf `/danke`), Kategorie „Lead", Zählung **„Eine"**, Klick-Through-Fenster 90 Tage.
   - Conversion **„Anruf-Klick"**: Trigger `qng_call_click`, Zählung „Eine", als **sekundäre** Aktion markieren (fließt nicht in Gebote, bis Qualität belegt ist).
5. **Anruferweiterung** in Ads mit Google-Weiterleitungsnummer → Conversion „Anrufe über Anzeige" (Dauer ≥ 60 s).
6. **Erweiterte Conversions** aktivieren (gehashte E-Mail aus dem Formular) – vorher Datenschutzerklärung/AVV prüfen.
7. **Auto-Tagging** im Ads-Konto aktivieren (Kontoeinstellungen).

## 4. Test vor Livegang (Pflicht-Checkliste)

- [ ] GTM Preview: `qng_lead_submit` + `qng_lead_thankyou` feuern bei Testanfrage
- [ ] `qng_call_click` feuert auf allen `tel:`-Links (Header, Hero, Footer, Sticky-Bar)
- [ ] Ads-Conversion-Status „Aufzeichnung aktiv" (Testconversion sichtbar, dann löschen/vermerken)
- [ ] Consent-Banner: Ablehnen → keine Marketing-Tags; Zustimmen → Tags feuern (Tag Assistant)
- [ ] `FORM_ENDPOINT` in `index.html` gesetzt und Formularversand landet im Postfach/CRM
- [ ] danke.html nicht ohne Formular erreichbar? (Direktaufrufe sind selten, aber bei Bedarf per Referrer-Check filtern)

## 5. Lead-Qualität zurückspielen (ab Woche 2)

Kurzfristig reicht ein wöchentliches Sheet:

| Datum | Lead | Quelle/Kampagne (aus gclid/GA4) | Status (Erstgespräch/Angebot/Auftrag) | Wert |
|---|---|---|---|---|

Ab stabilem Volumen: **Offline-Conversion-Import** („Aufträge") via gclid-Upload oder
CRM-Anbindung – dann kann die Gebotsstrategie auf Auftragswert statt Lead optimieren
(tROAS-Perspektive). Bis dahin monatliches Review Marketing ↔ Vertrieb.

## 6. Berichts-Setup

- Google-Ads-Bericht: Kampagne × Woche mit Kosten, Klicks, CTR, CPL, Conversions (E-Mail-Zeitplan an Team)
- GA4-Exploration: LP-Trichter Seitenaufruf → CTA-Klick → Formular-Submit → Danke
- Monatsreview anhand der KPI-Tabelle in `01-strategie-und-budget.md`
