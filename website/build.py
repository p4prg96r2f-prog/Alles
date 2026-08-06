# -*- coding: utf-8 -*-
"""Statischer Site-Generator für green-nwg.de.

Erzeugt alle HTML-Seiten, sitemap.xml und robots.txt aus content.py.
Aufruf:  python3 build.py
Keine Abhängigkeiten außer der Python-Standardbibliothek.
"""

import json
import os
import shutil

from content import COMPANY, FAQS, INDUSTRIES, TEAM, TESTIMONIALS

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = COMPANY["base_url"]

# ---------------------------------------------------------------------------
# SVG-Bausteine
# ---------------------------------------------------------------------------

LOGO_MARK = """<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#0d3b2a"/>
  <path d="M33.5 12.5C24 13.5 17.5 19 15.5 27.5c-.9 3.7-.7 6.6-.5 8" stroke="#4caf78" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M33.5 12.5c.8 9.5-2.5 15.5-8.5 18.5-2.6 1.3-5.4 1.7-7.5 1.7" stroke="#e8a33d" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M25 35.5 30 30l-3.2-1 4.7-5.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>"""


def icon(name):
    """Kleine Stroke-Icons (24×24), Farbe via currentColor."""
    paths = {
        "buero": '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 21v-4h8v4M8 7h2m4 0h2M8 11h2m4 0h2"/>',
        "einzelhandel": '<path d="M4 10 5.2 4h13.6L20 10M4 10h16M4 10v10h16V10M9.5 20v-6h5v6"/><path d="M7.5 4v3m4.5-3v3m4.5-3v3"/>',
        "produktion": '<path d="M3 21V9l6 4V9l6 4V4h6v17H3Z"/><path d="M17.5 8h1M7 17h2m4 0h2"/>',
        "veranstaltung": '<path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2V8Z"/><path d="M14 6v2m0 3v2m0 3v2"/>',
        "bildung": '<path d="m12 4-10 5 10 5 10-5-10-5Z"/><path d="M6 11.5V16c0 1.7 12 1.7 12 0v-4.5M22 9v5"/>',
        "kindergarten": '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9 14.5c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>',
        "kommune": '<path d="m12 3 9 5H3l9-5Z"/><path d="M5 8v9m4.6-9v9m4.8-9v9M19 8v9M3 17h18M2 21h20"/>',
        "andere": '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 14v6m-3-3h6"/>',
        "euro": '<path d="M17.5 6.5A6.5 6.5 0 0 0 7 12a6.5 6.5 0 0 0 10.5 5.5"/><path d="M4.5 10.2h8m-8 3.6h8"/>',
        "leaf": '<path d="M20 4C11 4 5.5 9.5 5.5 16.5c0 1.3.2 2.4.5 3.5C13 20.5 20 16 20 4Z"/><path d="M4 21c3-6 7.5-10 12-12.5"/>',
        "law": '<path d="M12 3v18M5 7l7-2 7 2"/><path d="M5 7l-2.5 6a3.5 3.5 0 0 0 7 0L7 7m10 0-2.5 6a3.5 3.5 0 0 0 7 0L19 7M8 21h8"/>',
        "chart": '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-6"/><path d="M16 7h4v4"/>',
        "comfort": '<path d="m3 11 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 17c.4-1.2 1.2-1.8 2.5-1.8s2.1.6 2.5 1.8"/><path d="M12 12.2v.01" stroke-width="2.6"/>',
        "shield": '<path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 11.5 2.2 2.2L15.5 9"/>',
        "handshake": '<path d="M8.5 8a4 4 0 1 0-4-4"/><circle cx="7" cy="8" r="3.2"/><circle cx="17" cy="8" r="3.2"/><path d="M2.5 21c.5-4 2.3-6 4.5-6s4 2 4.5 6m1-6c.6-.9 1.5-1.5 2.6-1.7"/><path d="M12.5 21c.5-4 2.3-6 4.5-6s4 2 4.5 6"/>',
        "check": '<path d="m5 13 4 4L19 7"/>',
        "arrow": '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
        "phone": '<path d="M6 3h4l1.5 5L9 9.5a12 12 0 0 0 5.5 5.5l1.5-2.5 5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
        "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        "pin": '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
        "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/><path d="m9 15.5 2 2 4-4"/>',
        "doc": '<path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"/><path d="M14 2.5v4h4M9 12h6m-6 4h6"/>',
        "search": '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
        "bolt": '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
        "tools": '<path d="M14.5 6.5a4 4 0 0 1 5-5l-3 3 .5 2.5L19.5 7.5l3-3a4 4 0 0 1-5 5L8 19a2.1 2.1 0 0 1-3-3l9.5-9.5Z"/>',
    }
    return (
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + "</svg>"
    )


def hero_schematic():
    """Technische Zeichnung: Energiekonzept eines Nichtwohngebäudes."""
    ticks = []
    for x in range(60, 620, 40):
        ticks.append(f'<line x1="{x}" y1="10" x2="{x}" y2="16"/>')
        ticks.append(f'<line x1="{x}" y1="504" x2="{x}" y2="510"/>')
    for y in range(60, 480, 40):
        ticks.append(f'<line x1="10" y1="{y}" x2="16" y2="{y}"/>')
        ticks.append(f'<line x1="644" y1="{y}" x2="650" y2="{y}"/>')

    windows = []
    for row in range(4):
        for col in range(4):
            wx = 254 + col * 50
            wy = 196 + row * 52
            windows.append(
                f'<rect x="{wx}" y="{wy}" width="34" height="34" rx="2" '
                f'fill="{"#fdf3e2" if (row == 1 and col in (1, 2)) else "#e3f0e6"}" stroke="#dbe4dc"/>'
            )

    rays = []
    for i, (dx, dy) in enumerate([(0, -1), (0.7, -0.7), (1, 0), (0.7, 0.7), (-0.7, -0.7), (-1, 0)]):
        x1, y1 = 95 + dx * 34, 95 + dy * 34
        x2, y2 = 95 + dx * 46, 95 + dy * 46
        rays.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}"/>')

    mono = "font-family='IBM Plex Mono, monospace' letter-spacing='.06em'"
    return f"""<svg viewBox="0 0 660 520" fill="none" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="Technisches Schema: Energiekonzept eines Nichtwohngebäudes mit Photovoltaik, Wärmepumpe und LED-Beleuchtung">
  <rect x="10" y="10" width="640" height="500" rx="10" fill="#ffffff" stroke="#dbe4dc"/>
  <g stroke="#dbe4dc" stroke-width="1">{''.join(ticks)}</g>

  <!-- Sonne -->
  <circle cx="95" cy="95" r="26" stroke="#e8a33d" stroke-width="2.5"/>
  <g stroke="#e8a33d" stroke-width="2.5" stroke-linecap="round">{''.join(rays)}</g>
  <line x1="126" y1="122" x2="242" y2="160" stroke="#e8a33d" stroke-width="2" class="flow-line"/>

  <!-- Gebäude -->
  <rect x="238" y="178" width="222" height="252" fill="#ffffff" stroke="#0d3b2a" stroke-width="2.5"/>
  {''.join(windows)}
  <rect x="330" y="392" width="38" height="38" fill="#0d3b2a" rx="2"/>

  <!-- PV-Panels auf dem Dach -->
  <g>
    <path d="M244 176 268 152h44l-24 24z" fill="#0d3b2a" stroke="#092c1f"/>
    <path d="M316 176 340 152h44l-24 24z" fill="#0d3b2a" stroke="#092c1f"/>
    <path d="M388 176 412 152h44l-24 24z" fill="#0d3b2a" stroke="#092c1f"/>
    <path d="M256 170l20-14m8 14 20-14m52 14 20-14m8 14 20-14m-124 14 20-14m8 14 20-14" stroke="#4caf78" stroke-width="1.2"/>
  </g>

  <!-- Wärmepumpe -->
  <rect x="128" y="356" width="72" height="74" rx="6" fill="#ffffff" stroke="#0d3b2a" stroke-width="2"/>
  <circle cx="164" cy="386" r="19" stroke="#1e5b3f" stroke-width="2"/>
  <path d="M164 386m-2 -14a14 14 0 0 1 10 8m-16 12a14 14 0 0 1-8-10m22 6a14 14 0 0 1-12 6" stroke="#4caf78" stroke-width="2" stroke-linecap="round"/>
  <path d="M140 416h48m-48 6h48" stroke="#dbe4dc" stroke-width="2"/>
  <line x1="200" y1="392" x2="238" y2="392" stroke="#e8a33d" stroke-width="2.5" class="flow-line"/>

  <!-- Energiefluss zum Ergebnis -->
  <line x1="460" y1="240" x2="536" y2="240" stroke="#4caf78" stroke-width="2.5" class="flow-line"/>
  <circle cx="576" cy="240" r="40" fill="#fdf3e2" stroke="#e8a33d" stroke-width="2.5"/>
  <text x="576" y="238" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="24" fill="#0d3b2a">−70&#8239;%</text>
  <text x="576" y="256" text-anchor="middle" {mono} font-size="8.5" fill="#64796e">ENERGIEKOSTEN</text>

  <line x1="460" y1="330" x2="536" y2="330" stroke="#4caf78" stroke-width="2.5" class="flow-line"/>
  <circle cx="576" cy="330" r="40" fill="#e3f0e6" stroke="#1e5b3f" stroke-width="2.5"/>
  <text x="576" y="328" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="22" fill="#0d3b2a">−80&#8239;%</text>
  <text x="576" y="346" text-anchor="middle" {mono} font-size="8.5" fill="#64796e">CO&#8322;-AUSSTOSS</text>

  <!-- Boden -->
  <line x1="96" y1="430" x2="564" y2="430" stroke="#0d3b2a" stroke-width="2.5"/>
  <g stroke="#a8c4b2" stroke-width="1.5">
    <line x1="120" y1="430" x2="110" y2="442"/><line x1="160" y1="430" x2="150" y2="442"/>
    <line x1="200" y1="430" x2="190" y2="442"/><line x1="240" y1="430" x2="230" y2="442"/>
    <line x1="280" y1="430" x2="270" y2="442"/><line x1="320" y1="430" x2="310" y2="442"/>
    <line x1="360" y1="430" x2="350" y2="442"/><line x1="400" y1="430" x2="390" y2="442"/>
    <line x1="440" y1="430" x2="430" y2="442"/><line x1="480" y1="430" x2="470" y2="442"/>
    <line x1="520" y1="430" x2="510" y2="442"/><line x1="548" y1="430" x2="538" y2="442"/>
  </g>

  <!-- Beschriftungen mit Führungslinien -->
  <g {mono} font-size="10" fill="#64796e">
    <circle cx="350" cy="146" r="2.5" fill="#1e5b3f"/>
    <line x1="350" y1="146" x2="350" y2="120" stroke="#a8c4b2"/>
    <line x1="350" y1="120" x2="404" y2="120" stroke="#a8c4b2"/>
    <text x="408" y="123">PV 99 kWp</text>

    <circle cx="164" cy="356" r="2.5" fill="#1e5b3f"/>
    <line x1="164" y1="356" x2="164" y2="330" stroke="#a8c4b2"/>
    <line x1="164" y1="330" x2="118" y2="330" stroke="#a8c4b2"/>
    <text x="30" y="333">W&#196;RMEPUMPE</text>

    <circle cx="321" cy="265" r="2.5" fill="#b97a1a"/>
    <line x1="321" y1="265" x2="230" y2="265" stroke="#a8c4b2"/>
    <text x="128" y="268">LED −60&#8239;%</text>
  </g>

  <!-- Plankopf -->
  <g {mono}>
    <rect x="404" y="458" width="232" height="38" fill="#f7f8f4" stroke="#dbe4dc"/>
    <text x="416" y="474" font-size="9.5" fill="#0d3b2a" font-weight="500">GREEN &#183; ENERGIEKONZEPT NWG</text>
    <text x="416" y="488" font-size="8.5" fill="#64796e">UNABH&#196;NGIG &#183; GEF&#214;RDERT &#183; BLATT 01</text>
  </g>
</svg>"""


# ---------------------------------------------------------------------------
# Seitengerüst
# ---------------------------------------------------------------------------

NAV_ITEMS = [
    ("", "Start"),
    ("loesungen/", "Lösungen"),
    ("vorteile/", "Vorteile"),
    ("ueber-uns/", "Über uns"),
    ("kontakt/", "Kontakt"),
]


def header(p, active):
    links = []
    for path, label in NAV_ITEMS:
        current = ' aria-current="page"' if path == active else ""
        links.append(f'<a href="{p}{path}"{current}>{label}</a>')
    return f"""<header class="site-header">
  <div class="container header-bar">
    <a class="brand" href="{p}" aria-label="GREEN – Startseite">
      {LOGO_MARK}
      <span class="brand-name"><b>GREEN</b><span>Energieberatung&nbsp;NWG</span></span>
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menü öffnen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Hauptnavigation">
      {''.join(links)}
      <a class="btn btn--primary nav-cta" href="{p}beratungstermin/">Beratungstermin</a>
    </nav>
  </div>
</header>"""


def footer(p):
    solutions = "".join(
        f'<li><a href="{p}services/{i["slug"]}/">{i["name"]}</a></li>' for i in INDUSTRIES
    )
    return f"""<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        {LOGO_MARK}
        <p><strong style="color:#fff">GREEN</strong> – Gesellschaft für rationale und effiziente
        Energienutzung in Nichtwohngebäuden. Unabhängige Energieberatung aus Paderborn für
        Unternehmen und Kommunen in ganz NRW.</p>
      </div>
      <div class="footer-col">
        <h3>Lösungen</h3>
        <ul>{solutions}</ul>
      </div>
      <div class="footer-col">
        <h3>Unternehmen</h3>
        <ul>
          <li><a href="{p}vorteile/">Ihre Vorteile</a></li>
          <li><a href="{p}ueber-uns/">Über uns</a></li>
          <li><a href="{p}kontakt/">Kontakt</a></li>
          <li><a href="{p}beratungstermin/">Beratungstermin</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>Kontakt</h3>
        <ul class="footer-contact">
          <li>{icon('pin')}<span>{COMPANY['street']}<br>{COMPANY['zip_city']}</span></li>
          <li>{icon('phone')}<a href="tel:{COMPANY['phone_link']}">{COMPANY['phone_display']}</a></li>
          <li>{icon('mail')}<a href="mailto:{COMPANY['email']}">{COMPANY['email']}</a></li>
          <li>{icon('clock')}<span>{COMPANY['hours']}</span></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> {COMPANY['name']} · Alle Rechte vorbehalten</span>
      <nav aria-label="Rechtliches">
        <a href="{p}impressum/">Impressum</a>
        <a href="{p}datenschutz/">Datenschutz</a>
        <a href="{p}agb/">AGB</a>
      </nav>
      <span class="footer-note">Diese Website lädt keine externen Dienste &amp; setzt keine Cookies.</span>
    </div>
  </div>
</footer>"""


def page(path, title, desc, body, active="", schema=None, depth=None):
    """Komplette HTML-Seite. path = Canonical-Pfad relativ zur Domain, z. B. 'vorteile/'."""
    if depth is None:
        depth = path.count("/")
    p = "../" * depth
    canonical = f"{BASE}/{path}"
    schema_tag = (
        f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'
        if schema
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="GREEN – Energieberatung für Nichtwohngebäude">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{BASE}/assets/img/og-image.png">
  <meta property="og:locale" content="de_DE">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0d3b2a">
  <link rel="icon" href="{p}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="{p}assets/img/apple-touch-icon.png">
  <link rel="preload" href="{p}assets/fonts/bricolage-grotesque-400-800-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="{p}assets/fonts/ibm-plex-sans-400-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{p}assets/css/style.css">
  {schema_tag}
</head>
<body>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  {header(p, active)}
  <main id="main">
{body}
  </main>
  {footer(p)}
  <script src="{p}assets/js/main.js" defer></script>
</body>
</html>"""


def breadcrumbs(p, items):
    lis = [f'<li><a href="{p}">Start</a></li>']
    for href, label in items[:-1]:
        lis.append(f'<li><a href="{p}{href}">{label}</a></li>')
    lis.append(f"<li>{items[-1][1]}</li>")
    return f'<ol class="breadcrumb">{"".join(lis)}</ol>'


def page_hero(p, crumbs, eyebrow, h1, lead):
    return f"""<section class="page-hero">
  <div class="container">
    {breadcrumbs(p, crumbs)}
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p class="lead">{lead}</p>
  </div>
</section>"""


def cta_band(p, title="Bereit für niedrigere Energiekosten?",
             text="Im kostenlosen Erstgespräch klären wir Potenzial, Förderung und nächste Schritte – unverbindlich und auf den Punkt."):
    return f"""<section class="cta-band section">
  <div class="container">
    <div class="reveal">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
    <div class="cta-band-actions reveal reveal-d1">
      <a class="btn btn--light btn--lg" href="{p}beratungstermin/">{icon('calendar')} Beratungstermin buchen</a>
      <a class="btn btn--ghost-light btn--lg" href="tel:{COMPANY['phone_link']}">{icon('phone')} {COMPANY['phone_display']}</a>
    </div>
  </div>
</section>"""


# ---------------------------------------------------------------------------
# Startseite
# ---------------------------------------------------------------------------

def render_home():
    p = ""
    industry_cards = "".join(
        f"""<a class="card reveal" href="{p}services/{i['slug']}/">
      <span class="card-icon">{icon(i['slug'])}</span>
      <h3>{i['name']}</h3>
      <p>{i['card']}</p>
      <span class="card-more">Mehr erfahren {icon('arrow')}</span>
    </a>"""
        for i in INDUSTRIES
    )

    services = [
        ("search", "Energieberatung & -konzept", "Vollständige Analyse Ihres Gebäudes nach DIN V 18599 – mit priorisierten Maßnahmen und Wirtschaftlichkeitsrechnung."),
        ("doc", "Energieaudit DIN EN 16247", "Normkonforme Audits für Nicht-KMU: Pflicht erfüllen und gleichzeitig die profitabelsten Einsparungen identifizieren."),
        ("chart", "Sanierungsfahrplan", "Schritt für Schritt zum effizienten Gebäude: Maßnahmen, Kosten, Förderungen und CO₂-Wirkung über Jahre geplant."),
        ("euro", "Fördermittelservice", "Bis zu 50 % Zuschuss zur Beratung, attraktive Förderung für Maßnahmen – wir finden und beantragen alle Töpfe."),
        ("buero", "Neubaubegleitung", "Effizienz von Anfang an: Wir begleiten Ihren Neubau von der Planung bis zum GEG-Nachweis."),
        ("tools", "Umsetzung & Monitoring", "Ausschreibung, Angebotsprüfung, Baubegleitung und anschließendes Monitoring – Einsparungen, die bleiben."),
    ]
    service_items = "".join(
        f"""<li class="feature reveal">
      <span class="feature-icon">{icon(ic)}</span>
      <div><h3>{t}</h3><p>{d}</p></div>
    </li>"""
        for ic, t, d in services
    )

    steps = [
        ("Erstgespräch", "Kostenlos und unverbindlich: Wir klären Ausgangslage, Ziele und Fördermöglichkeiten Ihres Gebäudes.", "ca. 30 Minuten"),
        ("Analyse vor Ort", "Wir erfassen Gebäudehülle, Anlagentechnik und Verbräuche – messbasiert statt geschätzt.", "1–2 Termine"),
        ("Konzept & Förderung", "Sie erhalten priorisierte Maßnahmen mit Kosten, Einsparung und Amortisation – plus fertige Förderanträge.", "inkl. Festpreis"),
        ("Umsetzung & Erfolg", "Auf Wunsch begleiten wir Ausschreibung und Umsetzung und weisen die Einsparung im Betrieb nach.", "wir bleiben dran"),
    ]
    step_items = "".join(
        f"""<li class="step reveal">
      <h3>{t}</h3><p>{d}</p><span class="step-duration">{dur}</span>
    </li>"""
        for t, d, dur in steps
    )

    why = [
        ("shield", "Unabhängig", "Wir verkaufen keine Anlagen und erhalten keine Provisionen – unsere Empfehlung folgt allein Ihrer Wirtschaftlichkeit."),
        ("handshake", "Persönlich", "Ein fester Ansprechpartner von der ersten Analyse bis zur umgesetzten Maßnahme – kein anonymes Portal."),
        ("euro", "Transparent", "Festpreise vor Beauftragung, nachvollziehbare Rechenwege, keine versteckten Kosten."),
        ("check", "Erfahren", "Über ein Jahrzehnt Energieberatung für Nichtwohngebäude – vom Büro bis zur Produktionshalle."),
    ]
    why_items = "".join(
        f"""<li class="feature reveal">
      <span class="feature-icon">{icon(ic)}</span>
      <div><h3>{t}</h3><p>{d}</p></div>
    </li>"""
        for ic, t, d in why
    )

    quotes = "".join(
        f"""<figure class="quote reveal">
      <span class="quote-mark" aria-hidden="true">„</span>
      <blockquote class="quote-text">{text}</blockquote>
      <footer>
        <span class="avatar" aria-hidden="true">{''.join(w[0] for w in name.split()[:2])}</span>
        <cite><b>{name}</b><span>{role}</span></cite>
      </footer>
    </figure>"""
        for text, name, role in TESTIMONIALS
    )

    faq_items = "".join(
        f"""<details class="faq reveal">
      <summary>{q}</summary>
      <div class="faq-body"><p>{a}</p></div>
    </details>"""
        for q, a in FAQS
    )

    body = f"""
<section class="hero">
  <div class="container hero-grid">
    <div>
      <p class="eyebrow">Unabhängige Energieberatung · Paderborn / NRW</p>
      <h1>Bis zu <span class="accent">70&#8239;% weniger</span> Energiekosten für Ihr Gebäude.</h1>
      <p class="lead">GREEN ist die spezialisierte Energieberatung für Nichtwohngebäude:
      Wir analysieren Büro, Produktion, Handel oder Schule, entwickeln Ihr
      Energiekonzept und sichern bis zu 50&#8239;% Förderung – unabhängig, persönlich
      und mit Festpreis.</p>
      <div class="hero-ctas">
        <a class="btn btn--primary btn--lg" href="beratungstermin/">{icon('calendar')} Kostenloses Erstgespräch</a>
        <a class="btn btn--ghost btn--lg" href="loesungen/">Lösungen entdecken</a>
      </div>
      <ul class="hero-trust">
        <li>{icon('check')} 80+ betreute Objekte</li>
        <li>{icon('check')} bis zu 50&#8239;% Förderung</li>
        <li>{icon('check')} keine versteckten Kosten</li>
      </ul>
    </div>
    <figure class="hero-figure reveal">
      {hero_schematic()}
      <figcaption class="hero-figcaption">Abb. 01 – Energiekonzept Nichtwohngebäude (Schema)</figcaption>
    </figure>
  </div>
</section>

<section class="kpi-band" aria-label="Kennzahlen">
  <div class="container">
    <div class="kpi-grid">
      <div class="kpi reveal"><div class="kpi-value"><span data-count="80">0</span><span class="unit">+</span></div><div class="kpi-label">betreute Objekte</div></div>
      <div class="kpi reveal reveal-d1"><div class="kpi-value">−<span data-count="70">0</span><span class="unit">%</span></div><div class="kpi-label">Energiekosten möglich</div></div>
      <div class="kpi reveal reveal-d2"><div class="kpi-value"><span data-count="50">0</span><span class="unit">%</span></div><div class="kpi-label">Förderung der Beratung</div></div>
      <div class="kpi reveal reveal-d3"><div class="kpi-value"><span data-count="10">0</span><span class="unit">+ Jahre</span></div><div class="kpi-label">Erfahrung mit NWG</div></div>
    </div>
  </div>
</section>

<section class="section" id="loesungen">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Lösungen</p>
      <h2>Energieberatung für Ihre Branche</h2>
      <p class="lead">Jedes Nichtwohngebäude hat sein eigenes Energieprofil.
      Deshalb beraten wir nicht von der Stange, sondern entlang Ihrer Nutzung.</p>
    </div>
    <div class="card-grid">{industry_cards}</div>
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Leistungen</p>
      <h2>Vom ersten Messwert bis zur nachgewiesenen Einsparung</h2>
      <p class="lead">Alles aus einer Hand – Sie behalten einen Ansprechpartner,
      wir behalten die Verantwortung.</p>
    </div>
    <ul class="feature-list">{service_items}</ul>
  </div>
</section>

<section class="section" id="prozess">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">So läuft's ab</p>
      <h2>In vier Schritten zum effizienten Gebäude</h2>
    </div>
    <ol class="steps">{step_items}</ol>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="callout reveal">
      <div>
        <h2>Der Staat zahlt die Hälfte Ihrer Beratung.</h2>
        <p>Über die Bundesförderung für Energieberatung für Nichtwohngebäude (EBN)
        werden bis zu 50&#8239;% des Beratungshonorars bezuschusst. Auch Ihre
        Sanierungsmaßnahmen sind förderfähig – wir übernehmen die komplette
        Antragstellung.</p>
        <a class="btn btn--light" href="beratungstermin/">Förderung sichern {icon('arrow')}</a>
      </div>
      <div class="big-number">50&#8239;%<small>Zuschuss zur Energieberatung</small></div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Warum GREEN</p>
      <h2>Beratung, der Sie vertrauen können</h2>
    </div>
    <ul class="feature-list">{why_items}</ul>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Referenzen</p>
      <h2>Das sagen unsere Kunden</h2>
    </div>
    <div class="quote-grid">{quotes}</div>
  </div>
</section>

<section class="section section--surface" id="faq">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen</p>
      <h2>Gut zu wissen</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
  </div>
</section>

{cta_band(p)}
"""

    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "ProfessionalService",
                "@id": f"{BASE}/#organization",
                "name": "GREEN – Energieberatung für Nichtwohngebäude",
                "legalName": COMPANY["name"],
                "url": f"{BASE}/",
                "email": COMPANY["email"],
                "telephone": "+49 5251 40292910",
                "description": "Unabhängige Energieberatung für Nichtwohngebäude: Energiekonzepte, Energieaudits, Sanierungsfahrpläne und Fördermittelservice für Unternehmen und Kommunen in NRW.",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": COMPANY["street"],
                    "postalCode": "33102",
                    "addressLocality": "Paderborn",
                    "addressCountry": "DE",
                },
                "openingHoursSpecification": {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    "opens": "08:00",
                    "closes": "16:00",
                },
                "areaServed": "Nordrhein-Westfalen",
                "knowsAbout": [
                    "Energieberatung", "Nichtwohngebäude", "Energieaudit DIN EN 16247",
                    "DIN V 18599", "Gebäudeenergiegesetz", "Fördermittel", "Photovoltaik",
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a},
                    }
                    for q, a in FAQS
                ],
            },
        ],
    }

    return page(
        "",
        "Energieberatung für Nichtwohngebäude in NRW | GREEN Paderborn",
        "Bis zu 70 % Energiekosten sparen: GREEN ist die unabhängige Energieberatung für Büro, Handel, Produktion, Schulen & Kommunen – mit bis zu 50 % Förderung. Jetzt Termin sichern.",
        body,
        active="",
        schema=schema,
        depth=0,
    )


# ---------------------------------------------------------------------------
# Lösungen-Übersicht
# ---------------------------------------------------------------------------

def render_loesungen():
    p = "../"
    cards = "".join(
        f"""<a class="card reveal" href="{p}services/{i['slug']}/">
      <span class="card-icon">{icon(i['slug'])}</span>
      <h3>{i['name']}</h3>
      <p>{i['card']}</p>
      <span class="card-more">Zur Branchenlösung {icon('arrow')}</span>
    </a>"""
        for i in INDUSTRIES
    )
    body = f"""
{page_hero(p, [("loesungen/", "Lösungen")], "Lösungen",
           "Ein Spezialist für jede Art von Nichtwohngebäude",
           "Büro oder Bühne, Klassenzimmer oder Kühlregal: Wir kennen die Energieprofile der "
           "unterschiedlichen Nutzungen – und beraten Sie entlang der Stellschrauben, die in Ihrer "
           "Branche wirklich zählen.")}

<section class="section">
  <div class="container">
    <div class="card-grid card-grid--wide">{cards}</div>
  </div>
</section>

<section class="section section--surface">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Nicht dabei?</p>
      <h2>Ihr Gebäude passt in keine Schublade?</h2>
      <p>Umso besser – Sonderfälle sind unser Alltag. Ob Mischnutzung, Denkmalschutz
      oder Quartierslösung: Rufen Sie uns an, wir sagen Ihnen ehrlich, was möglich ist.</p>
      <a class="btn btn--primary" href="{p}kontakt/">Kontakt aufnehmen {icon('arrow')}</a>
    </div>
    <ul class="checklist reveal reveal-d1" style="margin:0">
      <li>Unabhängige Analyse für jeden Gebäudetyp</li>
      <li>Förderfähig nach Bundesprogrammen (EBN/BEG)</li>
      <li>Beratung nach DIN V 18599 &amp; DIN EN 16247</li>
      <li>Ein fester Ansprechpartner für alles</li>
    </ul>
  </div>
</section>

{cta_band(p)}
"""
    return page(
        "loesungen/",
        "Branchenlösungen: Energieberatung nach Gebäudetyp | GREEN",
        "Energieberatung für Büro, Einzelhandel, Produktion, Schulen, Kitas, Kommunen und Veranstaltungsstätten – spezialisiert auf Nichtwohngebäude. GREEN Paderborn.",
        body,
        active="loesungen/",
    )


# ---------------------------------------------------------------------------
# Branchenseiten
# ---------------------------------------------------------------------------

def render_industry(ind):
    p = "../../"
    pains = "".join(
        f"""<div class="card reveal">
      <h3>{t}</h3><p>{d}</p>
    </div>"""
        for t, d in ind["pains"]
    )
    measures = "".join(
        f"""<li class="feature reveal">
      <span class="feature-icon">{icon('check')}</span>
      <div><h3>{t}</h3><p>{d}</p></div>
    </li>"""
        for t, d in ind["measures"]
    )
    others = [i for i in INDUSTRIES if i["slug"] != ind["slug"]][:3]
    related = "".join(
        f"""<a class="card reveal" href="{p}services/{i['slug']}/">
      <span class="card-icon">{icon(i['slug'])}</span>
      <h3>{i['name']}</h3>
      <span class="card-more">Zur Branchenlösung {icon('arrow')}</span>
    </a>"""
        for i in others
    )
    stat_value, stat_unit, stat_label = ind["stat"]
    intro_ps = "".join(f"<p>{para}</p>" for para in ind["intro"])

    body = f"""
{page_hero(p, [("loesungen/", "Lösungen"), (f"services/{ind['slug']}/", ind['name'])],
           "Branchenlösung", ind['h1'],
           ind['card'])}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Ausgangslage</p>
      <h2>Wo Ihre Energie wirklich bleibt</h2>
      {intro_ps}
    </div>
    <div class="callout reveal reveal-d1" style="grid-template-columns:1fr">
      <div class="big-number">{stat_value}{'&#8239;' + stat_unit if stat_unit else ''}<small>{stat_label}</small></div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Typische Energiefresser</p>
      <h2>Diese drei Punkte kosten Sie am meisten</h2>
    </div>
    <div class="card-grid card-grid--wide">{pains}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Unsere Maßnahmen</p>
      <h2>So senken wir Ihre Kosten – Schritt für Schritt</h2>
      <p class="lead">Jede Empfehlung kommt mit Kosten, Einsparung und Amortisationszeit.
      Sie entscheiden auf Basis von Zahlen, nicht von Versprechen.</p>
    </div>
    <ul class="feature-list">{measures}</ul>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="callout reveal">
      <div>
        <h2>Bis zu 50&#8239;% Förderung – auch für Ihr Gebäude.</h2>
        <p>Die Energieberatung für Nichtwohngebäude wird vom Bund bezuschusst.
        Wir prüfen Ihre Fördermöglichkeiten im kostenlosen Erstgespräch und
        übernehmen die komplette Antragstellung.</p>
        <a class="btn btn--light" href="{p}beratungstermin/">Kostenloses Erstgespräch {icon('arrow')}</a>
      </div>
      <div class="big-number">50&#8239;%<small>Zuschuss zur Beratung</small></div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Weitere Branchen</p>
      <h2>Auch interessant</h2>
    </div>
    <div class="card-grid card-grid--wide">{related}</div>
  </div>
</section>

{cta_band(p)}
"""
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Lösungen", "item": f"{BASE}/loesungen/"},
            {"@type": "ListItem", "position": 3, "name": ind["name"], "item": f"{BASE}/services/{ind['slug']}/"},
        ],
    }
    return page(
        f"services/{ind['slug']}/",
        ind["title"],
        ind["desc"],
        body,
        active="loesungen/",
        schema=schema,
    )


# ---------------------------------------------------------------------------
# Vorteile
# ---------------------------------------------------------------------------

def render_vorteile():
    p = "../"
    benefits = [
        ("euro", "Kosteneinsparung", "Wir analysieren Ihren Energieverbrauch bis auf Anlagenebene und priorisieren die Maßnahmen mit dem besten Verhältnis aus Investition und Einsparung – bis zu 70 % geringere Energiekosten sind je nach Ausgangslage realistisch."),
        ("leaf", "Klimaschutz, der sich rechnet", "Weniger Verbrauch heißt weniger Emissionen: Viele unserer Kunden senken ihren CO₂-Ausstoß um bis zu 80 % – und erfüllen damit zugleich die Erwartungen von Kunden, Banken und Öffentlichkeit."),
        ("law", "Gesetzliche Sicherheit", "Gebäudeenergiegesetz (GEG), Energieausweis-Pflichten, Energieaudits nach DIN EN 16247, Gebäudeautomation: Wir übersetzen Paragrafen in einen machbaren Fahrplan – bevor Fristen und Bußgelder drohen."),
        ("chart", "Höherer Immobilienwert", "Energieeffiziente Gebäude erzielen bessere Mieten, geringere Leerstände und bessere Finanzierungskonditionen. Jede Sanierung zahlt direkt auf den Wert Ihrer Immobilie ein."),
        ("comfort", "Mehr Komfort & Produktivität", "Gutes Raumklima ist messbar: konzentrierteres Arbeiten, weniger Beschwerden, zufriedenere Nutzer. Effizienz und Behaglichkeit sind kein Widerspruch – richtig geplant bedingen sie einander."),
    ]
    benefit_items = "".join(
        f"""<li class="feature reveal">
      <span class="feature-icon">{icon(ic)}</span>
      <div><h3>{t}</h3><p>{d}</p></div>
    </li>"""
        for ic, t, d in benefits
    )

    legal = [
        ("Gebäudeenergiegesetz (GEG)", "Das GEG hat die frühere EnEV abgelöst und stellt laufend neue Anforderungen – von 65 % erneuerbaren Energien beim Heizungstausch über Nachrüstpflichten bis zur Gebäudeautomation für große Nichtwohngebäude."),
        ("Energieaudit-Pflicht", "Unternehmen, die kein KMU sind, müssen alle vier Jahre ein Energieaudit nach DIN EN 16247 vorweisen – oder ein Energiemanagementsystem betreiben."),
        ("CO₂-Preis & Energiekosten", "Der CO₂-Preis auf fossile Brennstoffe steigt planmäßig weiter und verteuert jede nicht sanierte Kilowattstunde Jahr für Jahr."),
        ("ESG & Berichtspflichten", "Banken, Investoren und Großkunden verlangen zunehmend belastbare Energie- und CO₂-Daten – ein professionelles Energiekonzept liefert genau diese Zahlen."),
    ]
    legal_items = "".join(
        f"""<div class="card reveal"><h3>{t}</h3><p>{d}</p></div>"""
        for t, d in legal
    )

    body = f"""
{page_hero(p, [("vorteile/", "Vorteile")], "Ihre Vorteile",
           "Warum sich Energieberatung doppelt lohnt",
           "Eine gute Energieberatung kostet nicht – sie verdient: durch niedrigere Betriebskosten, "
           "staatliche Förderung, rechtliche Sicherheit und ein Gebäude, das mehr wert ist als vorher.")}

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Fünf gute Gründe</p>
      <h2>Das bringt Ihnen die Zusammenarbeit mit GREEN</h2>
    </div>
    <ul class="feature-list">{benefit_items}</ul>
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Rechtlicher Rahmen</p>
      <h2>Die Anforderungen steigen – wir halten Sie vorn</h2>
      <p class="lead">Wer heute plant, spart morgen doppelt: Diese vier Entwicklungen machen
      Energieeffizienz vom Nice-to-have zur Managementaufgabe.</p>
    </div>
    <div class="card-grid card-grid--wide">{legal_items}</div>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="callout reveal">
      <div>
        <h2>Zukunftssichere Investition &amp; Beitrag zum Umweltschutz</h2>
        <p>Energieeffizienz ist die einzige Investition, die gleichzeitig Kosten senkt,
        Vorschriften erfüllt, Werte steigert und das Klima schützt. Der beste Zeitpunkt
        anzufangen: bevor die nächste Abrechnung kommt.</p>
        <a class="btn btn--light" href="{p}beratungstermin/">Jetzt Potenzial prüfen {icon('arrow')}</a>
      </div>
      <div class="big-number">−70&#8239;%<small>Energiekosten möglich</small></div>
    </div>
  </div>
</section>

{cta_band(p)}
"""
    return page(
        "vorteile/",
        "Ihre Vorteile: Kosten, Förderung, GEG-Sicherheit | GREEN",
        "5 Gründe für die Energieberatung von GREEN: bis zu 70 % Kostenersparnis, 50 % Förderung, GEG-Sicherheit, höherer Immobilienwert und besseres Raumklima.",
        body,
        active="vorteile/",
    )


# ---------------------------------------------------------------------------
# Über uns
# ---------------------------------------------------------------------------

def render_ueber_uns():
    p = "../"
    team_cards = "".join(
        f"""<div class="team-card reveal">
      <span class="team-avatar" aria-hidden="true">{''.join(w[0] for w in name.split()[:2])}</span>
      <h3>{name}</h3><p>{role}</p>
    </div>"""
        for name, role in TEAM
    )
    body = f"""
{page_hero(p, [("ueber-uns/", "Über uns")], "Über uns",
           "Das Ingenieurbüro hinter GREEN",
           "GREEN steht für Gesellschaft für rationale und effiziente Energienutzung – und für die "
           "Überzeugung, dass die günstigste und sauberste Energie die ist, die gar nicht erst "
           "verbraucht wird.")}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Unsere Geschichte</p>
      <h2>Spezialisiert, wo andere generalisieren</h2>
      <p>Vor mehr als einem Jahrzehnt haben wir erkannt, wie viel Energie in deutschen
      Nichtwohngebäuden ungenutzt verpufft – in Büros, Fabriken, Einkaufszentren, Hotels,
      Krankenhäusern und Schulen. Aus dieser Erkenntnis wurde ein Ingenieurbüro mit einer
      klaren Mission: Energieeffizienz für genau diese Gebäude planbar und wirtschaftlich
      zu machen.</p>
      <p>Heute begleitet unser Team Unternehmen und Kommunen in ganz NRW – von der ersten
      Verbrauchsanalyse bis zur nachgewiesenen Einsparung. Wir bleiben dabei, was wir von
      Anfang an waren: unabhängige Ingenieure mit Leidenschaft für erneuerbare Energien
      und einem Faible für ehrliche Zahlen.</p>
    </div>
    <div class="reveal reveal-d1">
      <ul class="checklist" style="margin:0">
        <li><strong>Persönlicher Kontakt</strong> statt anonymer Portale – Sie kennen Ihren Berater beim Namen.</li>
        <li><strong>Unabhängige Beratung</strong> – wir verkaufen keine Produkte und nehmen keine Provisionen.</li>
        <li><strong>Sicherheit &amp; Transparenz</strong> – geprüfte Partner, nachvollziehbare Empfehlungen.</li>
        <li><strong>Keine versteckten Kosten</strong> – Festpreis vor Beauftragung, Förderung inklusive.</li>
      </ul>
    </div>
  </div>
</section>

<section class="kpi-band" aria-label="Kennzahlen">
  <div class="container">
    <div class="kpi-grid">
      <div class="kpi reveal"><div class="kpi-value"><span data-count="80">0</span><span class="unit">+</span></div><div class="kpi-label">betreute Objekte</div></div>
      <div class="kpi reveal reveal-d1"><div class="kpi-value">−<span data-count="70">0</span><span class="unit">%</span></div><div class="kpi-label">Energiekosten erreicht</div></div>
      <div class="kpi reveal reveal-d2"><div class="kpi-value">−<span data-count="80">0</span><span class="unit">%</span></div><div class="kpi-label">CO₂-Ausstoß erreicht</div></div>
      <div class="kpi reveal reveal-d3"><div class="kpi-value"><span data-count="10">0</span><span class="unit">+ Jahre</span></div><div class="kpi-label">Erfahrung</div></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Team</p>
      <h2>Die Menschen hinter den Konzepten</h2>
      <p class="lead">Kurze Wege, klare Zuständigkeiten: Bei GREEN sprechen Sie direkt mit
      denen, die Ihr Projekt rechnen, planen und verantworten.</p>
    </div>
    <div class="team-grid">{team_cards}</div>
  </div>
</section>

{cta_band(p, "Lernen Sie uns kennen.",
          "Am besten bei einem kostenlosen Erstgespräch über Ihr Gebäude – telefonisch, online oder bei Ihnen vor Ort.")}
"""
    return page(
        "ueber-uns/",
        "Über GREEN: Ingenieurbüro für Energieeffizienz | Paderborn",
        "Seit über einem Jahrzehnt spezialisiert auf Energieberatung für Nichtwohngebäude: Lernen Sie das Team der Green HLB GmbH aus Paderborn kennen.",
        body,
        active="ueber-uns/",
    )


# ---------------------------------------------------------------------------
# Kontakt & Beratungstermin
# ---------------------------------------------------------------------------

def contact_cards(p):
    return f"""
      <div class="contact-card">
        <span class="feature-icon">{icon('phone')}</span>
        <div><h3>Telefon</h3>
        <p><a href="tel:{COMPANY['phone_link']}">{COMPANY['phone_display']}</a><br>{COMPANY['hours']}</p></div>
      </div>
      <div class="contact-card">
        <span class="feature-icon">{icon('mail')}</span>
        <div><h3>E-Mail</h3>
        <p><a href="mailto:{COMPANY['email']}">{COMPANY['email']}</a><br>Antwort in der Regel innerhalb eines Werktags</p></div>
      </div>
      <div class="contact-card">
        <span class="feature-icon">{icon('pin')}</span>
        <div><h3>Büro Paderborn</h3>
        <p>{COMPANY['street']}, {COMPANY['zip_city']}<br>
        <a href="https://www.openstreetmap.org/search?query=Rolandsweg%2080%2C%2033102%20Paderborn" rel="noopener" target="_blank">Route planen&nbsp;↗</a></p></div>
      </div>
      <div class="contact-card">
        <span class="feature-icon">{icon('calendar')}</span>
        <div><h3>Beratungstermin</h3>
        <p>Kostenloses Erstgespräch – vor Ort, telefonisch oder online.<br>
        <a href="{p}beratungstermin/">Termin anfragen&nbsp;→</a></p></div>
      </div>"""


def render_kontakt():
    p = "../"
    body = f"""
{page_hero(p, [("kontakt/", "Kontakt")], "Kontakt",
           "Sprechen wir über Ihr Gebäude",
           "Ob konkrete Sanierungsidee oder erste Orientierung: Wir freuen uns auf Ihre Nachricht "
           "und melden uns in der Regel innerhalb eines Werktags zurück.")}

<section class="section">
  <div class="container contact-grid">
    <div class="reveal">
      <p class="eyebrow">Direkter Draht</p>
      <h2>So erreichen Sie uns</h2>
      {contact_cards(p)}
    </div>
    <div class="reveal reveal-d1">
      <form class="form" id="contact-form" novalidate>
        <div class="form-grid">
          <div class="form-field">
            <label for="f-name">Name <span class="req" aria-hidden="true">*</span></label>
            <input id="f-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="form-field">
            <label for="f-company">Unternehmen / Organisation</label>
            <input id="f-company" name="company" type="text" autocomplete="organization">
          </div>
          <div class="form-field">
            <label for="f-email">E-Mail <span class="req" aria-hidden="true">*</span></label>
            <input id="f-email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="form-field">
            <label for="f-phone">Telefon</label>
            <input id="f-phone" name="phone" type="tel" autocomplete="tel">
          </div>
          <div class="form-field form-field--full">
            <label for="f-building">Um welches Gebäude geht es?</label>
            <select id="f-building" name="building">
              <option value="">Bitte wählen …</option>
              <option>Bürogebäude</option>
              <option>Einzelhandel</option>
              <option>Produktionsstätte</option>
              <option>Veranstaltungsstätte</option>
              <option>Bildungseinrichtung</option>
              <option>Kindergarten / Kita</option>
              <option>Kommunales Gebäude</option>
              <option>Anderes Nichtwohngebäude</option>
            </select>
          </div>
          <div class="form-field form-field--full">
            <label for="f-message">Ihre Nachricht</label>
            <textarea id="f-message" name="message" rows="5" placeholder="Worum geht es? Gebäudegröße, Baujahr, aktuelles Anliegen …"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--primary btn--lg" type="submit">{icon('mail')} Nachricht senden</button>
          <span class="form-status" id="form-status" role="status"></span>
        </div>
        <p class="form-hint mt-2" style="margin-top:1rem">Der Versand öffnet Ihr E-Mail-Programm – Ihre Daten
        werden nicht auf dieser Website gespeichert. Alternativ erreichen Sie uns direkt unter
        <a href="mailto:{COMPANY['email']}">{COMPANY['email']}</a>.</p>
      </form>
    </div>
  </div>
</section>

{cta_band(p, "Lieber gleich einen Termin?",
          "Buchen Sie direkt Ihr kostenloses Erstgespräch – wir rufen Sie zum Wunschtermin zurück.")}
"""
    return page(
        "kontakt/",
        "Kontakt: GREEN Energieberatung Paderborn | 05251 4029290",
        "Kontaktieren Sie GREEN: Telefon 05251 40 29 29 10, info@green-nwg.de, Rolandsweg 80, Paderborn. Unabhängige Energieberatung für Nichtwohngebäude in NRW.",
        body,
        active="kontakt/",
    )


def render_termin():
    p = "../"
    steps = [
        ("Anfrage senden", "Formular ausfüllen oder anrufen – zwei Minuten genügen.", "heute"),
        ("Rückruf & Erstgespräch", "Wir melden uns zum Wunschtermin und besprechen Ausgangslage, Potenzial und Förderung.", "innerhalb 1 Werktags"),
        ("Ihr Fahrplan", "Sie erhalten unsere Einschätzung und ein Festpreisangebot – die Entscheidung liegt bei Ihnen.", "unverbindlich"),
    ]
    step_items = "".join(
        f"""<li class="step reveal"><h3>{t}</h3><p>{d}</p><span class="step-duration">{dur}</span></li>"""
        for t, d, dur in steps
    )
    body = f"""
{page_hero(p, [("beratungstermin/", "Beratungstermin")], "Beratungstermin",
           "Ihr kostenloses Erstgespräch",
           "Unverbindlich, ehrlich, auf den Punkt: Im Erstgespräch klären wir, welches Potenzial in "
           "Ihrem Gebäude steckt, welche Förderung möglich ist – und ob wir zueinander passen.")}

<section class="section">
  <div class="container contact-grid">
    <div class="reveal">
      <p class="eyebrow">So geht es weiter</p>
      <h2>Drei Schritte bis zum Fahrplan</h2>
      <ol class="steps" style="grid-template-columns:1fr">{step_items}</ol>
      <p class="mono-note mt-2">Lieber direkt? {COMPANY['phone_display']} · {COMPANY['hours']}</p>
    </div>
    <div class="reveal reveal-d1">
      <form class="form" id="contact-form" novalidate>
        <div class="form-grid">
          <div class="form-field">
            <label for="f-name">Name <span class="req" aria-hidden="true">*</span></label>
            <input id="f-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="form-field">
            <label for="f-company">Unternehmen / Organisation</label>
            <input id="f-company" name="company" type="text" autocomplete="organization">
          </div>
          <div class="form-field">
            <label for="f-email">E-Mail <span class="req" aria-hidden="true">*</span></label>
            <input id="f-email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="form-field">
            <label for="f-phone">Telefon <span class="req" aria-hidden="true">*</span></label>
            <input id="f-phone" name="phone" type="tel" autocomplete="tel" required>
          </div>
          <div class="form-field form-field--full">
            <label for="f-building">Gebäudetyp</label>
            <select id="f-building" name="building">
              <option value="">Bitte wählen …</option>
              <option>Bürogebäude</option>
              <option>Einzelhandel</option>
              <option>Produktionsstätte</option>
              <option>Veranstaltungsstätte</option>
              <option>Bildungseinrichtung</option>
              <option>Kindergarten / Kita</option>
              <option>Kommunales Gebäude</option>
              <option>Anderes Nichtwohngebäude</option>
            </select>
          </div>
          <div class="form-field form-field--full">
            <label for="f-message">Ihr Anliegen</label>
            <textarea id="f-message" name="message" rows="5" placeholder="Z. B. Baujahr, Fläche, geplante Maßnahmen, Wunschtermin für den Rückruf …"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--primary btn--lg" type="submit">{icon('calendar')} Erstgespräch anfragen</button>
          <span class="form-status" id="form-status" role="status"></span>
        </div>
        <p class="form-hint" style="margin-top:1rem">Kostenlos &amp; unverbindlich. Der Versand öffnet Ihr
        E-Mail-Programm – es werden keine Daten auf dieser Website gespeichert.</p>
      </form>
    </div>
  </div>
</section>
"""
    return page(
        "beratungstermin/",
        "Beratungstermin vereinbaren – kostenloses Erstgespräch | GREEN",
        "Jetzt kostenloses Erstgespräch zur Energieberatung sichern: Potenzial, Förderung und nächste Schritte für Ihr Nichtwohngebäude – unverbindlich und mit Festpreis.",
        body,
        active=None,
    )


# ---------------------------------------------------------------------------
# Rechtstexte
# ---------------------------------------------------------------------------

def render_impressum():
    p = "../"
    body = f"""
{page_hero(p, [("impressum/", "Impressum")], "Rechtliches", "Impressum",
           "Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).")}
<section class="section">
  <div class="container prose">
    <h2>Anbieter</h2>
    <p>{COMPANY['name']}<br>{COMPANY['street']}<br>{COMPANY['zip_city']}</p>

    <h2>Vertreten durch</h2>
    <p>Geschäftsführer: {COMPANY['managers']}</p>

    <h2>Kontakt</h2>
    <p>Telefon: <a href="tel:{COMPANY['phone_link']}">{COMPANY['phone_display']}</a><br>
    E-Mail: <a href="mailto:{COMPANY['email']}">{COMPANY['email']}</a><br>
    Geschäftszeiten: {COMPANY['hours']}</p>

    <h2>Registereintrag</h2>
    <p>{COMPANY['hrb']}<br>{COMPANY['tax']}</p>

    <h2>Verantwortlich für den Inhalt</h2>
    <p>{COMPANY['managers']}<br>Anschrift wie oben.</p>

    <h2>Streitbeilegung</h2>
    <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
    Verbraucherschlichtungsstelle teilzunehmen.</p>

    <h2>Haftung für Inhalte und Links</h2>
    <p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
    Gesetzen verantwortlich. Für die Inhalte verlinkter externer Websites ist stets der jeweilige
    Anbieter verantwortlich; zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar.</p>
  </div>
</section>
"""
    return page(
        "impressum/",
        "Impressum | Green HLB GmbH, Paderborn",
        "Impressum der Green HLB GmbH, Rolandsweg 80, 33102 Paderborn. Geschäftsführer: Sebastian Hund, Vadim Berg, David Lamping. HRB 16341, Amtsgericht Paderborn.",
        body,
        active=None,
    )


def render_datenschutz():
    p = "../"
    body = f"""
{page_hero(p, [("datenschutz/", "Datenschutz")], "Rechtliches", "Datenschutzerklärung",
           "Kurz gefasst: Diese Website setzt keine Cookies, bindet keine externen Dienste ein "
           "und erhebt so wenige Daten wie technisch möglich.")}
<section class="section">
  <div class="container prose">
    <!-- HINWEIS: Entwurf auf Basis der technischen Eigenschaften dieser neuen Website
         (keine Cookies, keine externen Dienste, kein serverseitiges Formular).
         Vor Go-Live juristisch prüfen lassen und Hosting-Anbieter ergänzen. -->
    <h2>1. Verantwortlicher</h2>
    <p>{COMPANY['name']}<br>{COMPANY['street']}<br>{COMPANY['zip_city']}<br>
    E-Mail: <a href="mailto:{COMPANY['email']}">{COMPANY['email']}</a> ·
    Telefon: <a href="tel:{COMPANY['phone_link']}">{COMPANY['phone_display']}</a></p>

    <h2>2. Grundsatz: Datensparsamkeit</h2>
    <p>Diese Website verzichtet bewusst auf Cookies, Tracking, Analyse-Dienste, externe
    Schriftarten, Kartendienste und Social-Media-Plugins. Alle Inhalte (einschließlich
    Schriften) werden von unserem eigenen Webserver ausgeliefert. Es findet keine
    Übermittlung Ihrer Daten an Drittanbieter zu Werbe- oder Analysezwecken statt.</p>

    <h2>3. Server-Logfiles</h2>
    <p>Beim Aufruf der Website verarbeitet der Webserver unseres Hosting-Anbieters
    automatisch technische Zugriffsdaten (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite,
    Browsertyp). Diese Verarbeitung ist für den sicheren Betrieb der Website erforderlich
    (Art. 6 Abs. 1 lit. f DSGVO). Die Logdaten werden nach kurzer Frist automatisch gelöscht
    und nicht mit anderen Datenquellen zusammengeführt.</p>

    <h2>4. Kontaktaufnahme</h2>
    <p>Unsere Kontakt- und Terminformulare übertragen keine Daten an unseren Server: Beim
    Absenden öffnet sich Ihr eigenes E-Mail-Programm mit einer vorbereiteten Nachricht.
    Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben zur
    Bearbeitung der Anfrage sowie für mögliche Anschlussfragen (Art. 6 Abs. 1 lit. b DSGVO).
    Ihre Daten werden gelöscht, sobald sie für diese Zwecke nicht mehr erforderlich sind und
    keine gesetzlichen Aufbewahrungspflichten (i. d. R. 6 bzw. 10 Jahre für Geschäftskorrespondenz)
    entgegenstehen.</p>

    <h2>5. Datenverarbeitung im Rahmen der Geschäftsbeziehung</h2>
    <p>Zur Durchführung von Beratungsverträgen verarbeiten wir die dafür erforderlichen
    Bestands-, Vertrags- und Zahlungsdaten unserer Kunden (Art. 6 Abs. 1 lit. b DSGVO).
    Eine Weitergabe erfolgt nur, soweit dies zur Vertragserfüllung erforderlich ist
    (z. B. an Fördermittelgeber im Rahmen der Antragstellung und mit Ihrer Kenntnis).</p>

    <h2>6. Ihre Rechte</h2>
    <p>Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
    Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit
    (Art. 20) sowie Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen
    (Art. 21 DSGVO). Wenden Sie sich dazu formlos an die oben genannten Kontaktdaten.
    Zudem besteht ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde; zuständig für
    uns ist die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.</p>

    <h2>7. Aktualität</h2>
    <p>Diese Datenschutzerklärung entspricht dem technischen Stand der Website und wird bei
    Änderungen angepasst.</p>
  </div>
</section>
"""
    return page(
        "datenschutz/",
        "Datenschutzerklärung | GREEN – green-nwg.de",
        "Datenschutz bei green-nwg.de: keine Cookies, kein Tracking, keine externen Dienste. Alle Informationen zur Datenverarbeitung durch die Green HLB GmbH.",
        body,
        active=None,
    )


def render_agb():
    p = "../"
    body = f"""
{page_hero(p, [("agb/", "AGB")], "Rechtliches", "Allgemeine Geschäftsbedingungen",
           "Für alle Beratungsleistungen der Green HLB GmbH.")}
<section class="section">
  <div class="container prose">
    <!-- HINWEIS: Struktur und Kernaussagen entsprechen den bisherigen AGB der Green HLB GmbH.
         Vor Go-Live den rechtsverbindlichen Originaltext einsetzen bzw. juristisch prüfen lassen. -->
    <h2>§ 1 Vertragsgegenstand</h2>
    <p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge über Beratungsleistungen
    zwischen der {COMPANY['name']} (nachfolgend „Energieberater") und ihren Auftraggebern.
    Der im Vertrag festgelegte Verwendungszweck der Beratungsergebnisse ist für beide Seiten
    bindend. Abweichende Bedingungen des Auftraggebers gelten nur bei ausdrücklicher
    schriftlicher Bestätigung.</p>

    <h2>§ 2 Rechte und Pflichten des Energieberaters</h2>
    <p>Der Energieberater erbringt seine Leistungen unparteiisch, unabhängig und nach bestem
    Wissen und Gewissen entsprechend dem anerkannten Stand der Technik. Er ist nicht an
    Weisungen gebunden, die seine Unabhängigkeit gefährden würden.</p>

    <h2>§ 3 Mitwirkungspflichten des Auftraggebers</h2>
    <p>Der Auftraggeber stellt alle für die Beratung erforderlichen Unterlagen rechtzeitig
    zur Verfügung, ermöglicht den Zugang zum Objekt und teilt Änderungen, die für die
    Beratung von Bedeutung sind, unverzüglich mit.</p>

    <h2>§ 4 Hilfskräfte</h2>
    <p>Der Energieberater ist berechtigt, zur Vertragserfüllung fachkundige Hilfskräfte
    einzusetzen.</p>

    <h2>§ 5 Hinzuziehung weiterer Sachverständiger</h2>
    <p>Ist die Hinzuziehung weiterer Sachverständiger erforderlich, stimmt der Energieberater
    dies mit dem Auftraggeber ab. Kosten bis 500&nbsp;€ oder bis 10&nbsp;% der Auftragssumme
    können ohne vorherige Absprache berechnet werden.</p>

    <h2>§ 6 Termine</h2>
    <p>Termine sind nur verbindlich, wenn sie schriftlich zugesichert wurden.</p>

    <h2>§ 7 Urheberrecht und Verwendung der Ergebnisse</h2>
    <p>Berichte, Gutachten und Konzepte sind urheberrechtlich geschützt und dürfen nur für
    den vertraglich vereinbarten Zweck verwendet werden. Für Folgen einer unbefugten
    Weitergabe an Dritte haftet der Energieberater nicht.</p>

    <h2>§ 8 Abnahme</h2>
    <p>Die Leistung gilt als abgenommen, wenn der Auftraggeber nicht innerhalb angemessener
    Frist nach Übergabe begründete Einwendungen erhebt.</p>

    <h2>§ 9 Vergütung</h2>
    <p>Es gilt die vertraglich vereinbarte Vergütung. Soweit keine abweichende Vereinbarung
    getroffen wurde, werden Leistungen nach Aufwand zu den jeweils gültigen Stundensätzen
    des Energieberaters zuzüglich nachgewiesener Auslagen und der gesetzlichen Umsatzsteuer
    berechnet.</p>

    <h2>§ 10 Zahlungsbedingungen</h2>
    <p>Rechnungen sind innerhalb von 10 Tagen nach Zugang ohne Abzug zur Zahlung fällig.</p>

    <h2>§ 11 Haftung</h2>
    <p>Der Energieberater haftet für Vorsatz und grobe Fahrlässigkeit. Bei einfacher
    Fahrlässigkeit haftet er nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf
    den vorhersehbaren, vertragstypischen Schaden und auf die Deckungssummen seiner
    Berufshaftpflichtversicherung. Die Haftung für mittelbare Schäden und entgangenen
    Gewinn ist – soweit gesetzlich zulässig – ausgeschlossen.</p>

    <h2>§ 12 Kündigung</h2>
    <p>Der Vertrag kann von beiden Seiten nur aus wichtigem Grund gekündigt werden.
    Bereits erbrachte Leistungen sind zu vergüten.</p>

    <h2>§ 13 Erfüllungsort und Gerichtsstand</h2>
    <p>Erfüllungsort ist der Sitz des Energieberaters in Paderborn. Ist der Auftraggeber
    Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches
    Sondervermögen, ist Gerichtsstand Paderborn.</p>

    <h2>§ 14 Schlussbestimmungen</h2>
    <p>Änderungen und Ergänzungen des Vertrags bedürfen der Schriftform. Sollten einzelne
    Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
  </div>
</section>
"""
    return page(
        "agb/",
        "AGB | Green HLB GmbH – Energieberatung Paderborn",
        "Allgemeine Geschäftsbedingungen der Green HLB GmbH für Energieberatungsleistungen: Vertragsgegenstand, Vergütung, Haftung, Zahlungsbedingungen.",
        body,
        active=None,
    )


def render_404():
    body = f"""
<section class="section" style="min-height:55vh;display:grid;align-items:center">
  <div class="container text-center">
    <p class="eyebrow" style="justify-content:center">Fehler 404</p>
    <h1>Diese Seite hat sich abgeschaltet.</h1>
    <p class="lead" style="margin-inline:auto">Ganz im Sinne der Energieeffizienz – aber vermutlich nicht das,
    was Sie gesucht haben. Hier geht es zurück:</p>
    <div class="hero-ctas" style="justify-content:center;margin-top:1.5rem">
      <a class="btn btn--primary btn--lg" href="/">Zur Startseite</a>
      <a class="btn btn--ghost btn--lg" href="/loesungen/">Zu den Lösungen</a>
    </div>
  </div>
</section>
"""
    return page(
        "404.html",
        "Seite nicht gefunden | GREEN Energieberatung",
        "Die angeforderte Seite existiert nicht. Zurück zur Startseite der GREEN Energieberatung für Nichtwohngebäude.",
        body,
        active=None,
        depth=0,
    )


# ---------------------------------------------------------------------------
# Sitemap & Robots
# ---------------------------------------------------------------------------

def render_sitemap(paths):
    urls = "".join(
        f"  <url><loc>{BASE}/{p}</loc><changefreq>monthly</changefreq></url>\n" for p in paths
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}</urlset>
"""


ROBOTS = f"""User-agent: *
Allow: /

Sitemap: {BASE}/sitemap.xml
"""


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✓ {rel}")


def main():
    print("Baue green-nwg.de …")

    pages = {
        "index.html": render_home(),
        "loesungen/index.html": render_loesungen(),
        "vorteile/index.html": render_vorteile(),
        "ueber-uns/index.html": render_ueber_uns(),
        "kontakt/index.html": render_kontakt(),
        "beratungstermin/index.html": render_termin(),
        "impressum/index.html": render_impressum(),
        "datenschutz/index.html": render_datenschutz(),
        "agb/index.html": render_agb(),
        "404.html": render_404(),
    }
    for ind in INDUSTRIES:
        pages[f"services/{ind['slug']}/index.html"] = render_industry(ind)

    for rel, html in pages.items():
        write(rel, html)

    canonical_paths = [""] + sorted(
        p.replace("index.html", "") for p in pages if p.endswith("index.html") and p != "index.html"
    )
    write("sitemap.xml", render_sitemap(canonical_paths))
    write("robots.txt", ROBOTS)

    # Favicon (identisch mit Logo-Mark)
    write("assets/img/favicon.svg", LOGO_MARK.replace("aria-hidden=\"true\"", 'xmlns="http://www.w3.org/2000/svg"') if "xmlns" not in LOGO_MARK else LOGO_MARK)

    print(f"Fertig: {len(pages)} Seiten + sitemap.xml + robots.txt")


if __name__ == "__main__":
    main()
