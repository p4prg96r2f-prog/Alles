# green-nwg.de – Website-Relaunch

Kompletter Neubau der Website der **Green HLB GmbH** (GREEN – Energieberatung für
Nichtwohngebäude, Paderborn) als schnelle, statische Website ohne WordPress.

## Was diese Website besser macht als die alte

| Bereich | Alt (WordPress) | Neu |
|---|---|---|
| **Performance** | Page-Builder, viele Plugins, externe Skripte | Statisches HTML, ~1 CSS + 1 JS, selbst gehostete Fonts – lädt in Millisekunden |
| **Datenschutz** | Google Analytics, Google Fonts, Jetpack, Cookie-Banner | **Keine Cookies, kein Tracking, keine externen Requests** → kein Cookie-Banner nötig |
| **SEO** | Mehrere H1 pro Seite, dünne Branchenseiten | Saubere Heading-Hierarchie, individuelle Meta-Daten, JSON-LD (LocalBusiness, FAQ, Breadcrumbs), sitemap.xml, alte URL-Struktur beibehalten (kein Linkverlust) |
| **Inhalt** | Veraltete Rechtslage (EnEV) | Aktualisiert auf GEG, Energieaudit-Pflicht (DIN EN 16247), EBN/BEG-Förderung, ESG/CO₂-Preis |
| **Konversion** | Verstreute CTAs | Klare Conversion-Strecke: Hero → Förder-Callout → FAQ → Terminformular auf jeder Seite |
| **Barrierefreiheit** | – | Skip-Link, ARIA, Fokus-Stile, Kontraste, `prefers-reduced-motion` |
| **Wartung** | Plugin-Updates, Sicherheitslücken | Keine Angriffsfläche; Inhalte zentral in `content.py` |
| **Lokale Suche (Geo-SEO)** | keine Standort-Signale | 6 Stadt-Landingpages (Paderborn, Bielefeld, Gütersloh, Detmold, Höxter, Lippstadt) + Einzugsgebiet-Seite, `geo.*`/ICBM-Meta, LocalBusiness-Schema mit Koordinaten, areaServed & GeoCircle |
| **KI-Suche (GEO)** | – | `llms.txt` mit zitierfähigen Fakten, explizite AI-Crawler-Freigaben in `robots.txt` (GPTBot, ClaudeBot, PerplexityBot …), FAQ-/Service-Schema für Answer Engines |
| **Rechts-Content** | EnEV (seit 2020 außer Kraft) | Eigene GModG-2026-Seite (`/gmodg-nichtwohngebaeude/`, Stand-Datum, Quellenlink auf gmodg.bund.de, Transparenzhinweis „keine Rechtsberatung") – Fakten am 06.08.2026 gegen offizielle Quellen verifiziert |
| **Bildwelt** | Stockfotos | 16 eigene SVG-Illustrationen im Marken-Stil „technische Zeichnung" (`assets/img/illustrations/`) – lizenzfrei, < 10 KB je Grafik, auch inline eingebettet |
| **Trust-Signale** | – | HRB + Reaktionszeit im Footer, Klartext-Hinweise an Formularen (keine Datenspeicherung), freundliche 404, „keine Cookies"-Hinweis |
| **Fotos** | Stockfotos ohne Optimierung | 15 frei lizenzierte Fotos, einheitlich markengetont, WebP in 2 Größen mit `srcset`, `loading="lazy"`, feste Maße (kein Layout-Shift), Alt-Texte, Bild-Sitemap, Bildnachweis-Seite |
| **Interaktion** | – | Einsparrechner (`/einsparrechner/`): schätzt Kosten, Einsparpotenzial, CO₂ und Zehnjahreswert – rein clientseitig, ohne Datenübertragung |
| **Werbeaussagen** | „bis zu 50 % Förderung" (ohne Deckel) | Fördersatz **und** gesetzlicher Höchstbetrag (850/2.500/4.000 €) überall genannt – Quelle BAFA, Stand angegeben |

## Struktur

```
website/
├── build.py            # Statischer Site-Generator (nur Python-Standardbibliothek)
├── content.py          # ALLE Inhalte: Firmendaten, Branchen, FAQ, Team, Zitate
├── index.html          # … und alle weiteren generierten Seiten (nicht von Hand editieren!)
├── loesungen/ vorteile/ ueber-uns/ einzugsgebiet/ kontakt/ beratungstermin/
├── gmodg-nichtwohngebaeude/ foerderung/ einsparrechner/ glossar/     # Wissen & Werkzeuge
├── energieausweis-nichtwohngebaeude/ energieaudit-din-en-16247/      # Leistungsseiten
├── bildnachweis/                                                     # Foto-Lizenzen
├── services/{buero,einzelhandel,produktion,veranstaltung,bildung,kindergarten,kommune,andere}/
├── energieberatung-{paderborn,bielefeld,guetersloh,detmold,hoexter,lippstadt}/   # lokale Landingpages
├── impressum/ datenschutz/ agb/  404.html
├── sitemap.xml  robots.txt  llms.txt  manifest.webmanifest
└── assets/
    ├── css/style.css   # Design-System (Farb-Tokens, Typo, Komponenten)
    ├── js/main.js      # Mobile-Nav, Scroll-Reveal, Zähler, Formular (mailto)
    ├── fonts/          # Bricolage Grotesque, IBM Plex Sans/Mono (woff2, selbst gehostet)
    └── img/            # Logo/Favicon (SVG), og-image.png, apple-touch-icon.png
```

**Die alte URL-Struktur wurde 1:1 übernommen** (`/loesungen/`, `/services/buero/`, `/vorteile/` …),
damit bestehende Google-Rankings und Verlinkungen erhalten bleiben.

## Inhalte ändern

1. Texte/Daten in `content.py` (Branchen, FAQ, Team …) oder `build.py` (Seitentexte) anpassen
2. `python3 build.py` ausführen → alle HTML-Seiten werden neu generiert
3. Committen/deployen

Lokal ansehen: `python3 -m http.server 8000` im `website/`-Ordner, dann <http://localhost:8000>.

## Deployment

Beliebiges statisches Hosting genügt – den Inhalt des `website/`-Ordners hochladen:

- **Netlify / Cloudflare Pages / Vercel**: Ordner `website` als Publish-Directory, kein Build-Command nötig
  (oder `python3 build.py` als Build-Command, wenn aus `content.py` gebaut werden soll)
- **Klassisches Webhosting**: Inhalt von `website/` per (S)FTP ins Web-Root laden
- 404-Handling: `404.html` als Fehlerseite konfigurieren (Netlify/CF Pages: automatisch)

## Vor dem Go-Live (Checkliste)

- [ ] **Rechtstexte prüfen**: Datenschutzerklärung und AGB sind fachlich vorbereitete Entwürfe
      (Struktur und Kernaussagen entsprechen der Alt-Website, angepasst an die neue cookie-freie
      Technik). Bitte juristisch prüfen bzw. den rechtsverbindlichen Originaltext einsetzen.
- [ ] **Hosting-Anbieter** in der Datenschutzerklärung ergänzen (Abschnitt Server-Logfiles);
      HTTPS mit gültigem Zertifikat und HSTS aktivieren (Standard bei Netlify/CF Pages)
- [ ] **GModG-Seite** bei Gesetzesänderungen aktualisieren (Stand-Datum auf der Seite und
      `datePublished`/`dateModified` in `build.py` pflegen)
- [ ] **Formular**: Aktuell öffnet das Formular das E-Mail-Programm des Besuchers (`mailto:` –
      funktioniert ohne Backend und ohne Datenspeicherung). Für serverseitigen Versand einfach in
      `main.js` einen Form-Endpoint (z. B. eigener Mailserver, Formspree o. ä.) eintragen –
      dann die Datenschutzerklärung entsprechend ergänzen.
- [ ] Zertifizierungen/Referenzlogos ergänzen, falls vorhanden (z. B. Energieeffizienz-Expertenliste)
- [ ] Team-Fotos: aktuell Initialen-Avatare; echte Fotos können in `build.py` (`render_ueber_uns`)
      eingesetzt werden
- [ ] **Fotos ersetzen (größter verbleibender Qualitätssprung):** Die eingebauten Bilder sind
      frei lizenzierte Aufnahmen fremder Gebäude und dienen nur der Illustration – darauf weist
      auch `/bildnachweis/` ausdrücklich hin. Eigene Projektfotos wirken deutlich stärker.
      Austausch: neue Dateien als `assets/img/fotos/<name>-1000.webp` und `-500.webp` ablegen,
      Alt-Text in `photos.json` anpassen, `python3 build.py` ausführen.
- [ ] **Referenzprojekte ergänzen:** Für echte Fallbeispiele fehlen belastbare Zahlen (Objekt,
      Ausgangslage, Maßnahmen, erreichte Einsparung). Sobald zwei bis drei freigegebene Beispiele
      vorliegen, lohnt eine eigene Referenzseite – erfahrungsgemäß das stärkste Verkaufsargument.
- [ ] **Kennwerte des Einsparrechners prüfen:** Die Verbrauchskennwerte in `assets/js/main.js`
      (Objekt `TYPES`) sind bewusst konservative Durchschnittswerte. Eigene Erfahrungswerte
      können dort eingetragen werden.
- [ ] **Förderwerte aktuell halten:** `/foerderung/` nennt Stand August 2026 (BAFA). Bei
      Programmänderungen Werte und Stand-Datum anpassen.

## Design-System

- **Farben**: Tannengrün `#0d3b2a` / `#1e5b3f`, Blattgrün `#4caf78`, Bernstein `#e8a33d`
  (Energie/Förderung), Papierweiß `#f7f8f4`
- **Schriften**: Bricolage Grotesque (Headlines), IBM Plex Sans (Fließtext),
  IBM Plex Mono (Labels/Messwerte) – alle lokal, DSGVO-konform
- **Bildsprache**: Technische SVG-Schemata („Ingenieur-Report") statt Stockfotos –
  kein Bildlizenz-Risiko, minimale Ladezeit
