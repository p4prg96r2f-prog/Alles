# -*- coding: utf-8 -*-
"""Statischer Site-Generator für green-nwg.de.

Erzeugt alle HTML-Seiten, sitemap.xml und robots.txt aus content.py.
Aufruf:  python3 build.py [zielordner]
Ohne Argument landen die Seiten neben dem Skript. Mit Argument (z. B.
"python3 build.py ../website") liegen Quellen und Ausgabe getrennt.
Keine Abhängigkeiten außer der Python-Standardbibliothek.
"""

import json
import math
import os
import sys

from content import CITIES, COMPANY, FAQS, INDUSTRIES, TEAM, TESTIMONIALS
from illustrations import ILLUSTRATIONS

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else SRC
BASE = COMPANY["base_url"]
BUILD_DATE = "2026-08-06"  # Stand der Inhalte (sitemap lastmod, Article-Schema)

# Fotos: Metadaten (Alt-Text, Lizenz, Urheber) aus photos.json
with open(os.path.join(SRC, "photos.json"), encoding="utf-8") as _f:
    PHOTOS = {p["name"]: p for p in json.load(_f)}
PHOTO_W, PHOTO_H = 1000, 562


def photo(name, p, caption=None, cls="", sizes="(max-width: 860px) calc(100vw - 2.5rem), 540px", eager=False):
    """Responsives Foto. Drei Kandidaten, damit kleine Boxen keine 1000-px-Datei ziehen."""
    ph = PHOTOS[name]
    base = f"{p}assets/img/fotos/{name}"
    loading = "" if eager else ' loading="lazy" decoding="async"'
    fetch = ' fetchpriority="high"' if eager else ""
    img = (
        f'<img src="{base}-700.webp" '
        f'srcset="{base}-350.webp 350w, {base}-700.webp 700w, {base}-1000.webp 1000w" '
        f'sizes="{sizes}" width="{PHOTO_W}" height="{PHOTO_H}" alt="{ph["alt"]}"{loading}{fetch}>'
    )
    cap = f"<figcaption>{caption}</figcaption>" if caption else ""
    return f'<figure class="photo {cls}">{img}{cap}</figure>'


def photo_img(name, p, sizes="(max-width: 700px) calc(100vw - 2.5rem), 280px"):
    """Nacktes <img> für Karten. sizes entspricht der echten Kachelbreite (~258 px),
    nicht einer groben vw-Schätzung – sonst lädt der Browser unnötig große Dateien."""
    ph = PHOTOS[name]
    base = f"{p}assets/img/fotos/{name}"
    return (
        f'<img src="{base}-350.webp" '
        f'srcset="{base}-350.webp 350w, {base}-700.webp 700w, {base}-1000.webp 1000w" '
        f'sizes="{sizes}" width="{PHOTO_W}" height="{PHOTO_H}" alt="{ph["alt"]}" '
        f'loading="lazy" decoding="async">'
    )


# Branche -> Foto
INDUSTRY_PHOTO = {
    "buero": "buero",
    "einzelhandel": "einzelhandel",
    "produktion": "produktion",
    "veranstaltung": "veranstaltung",
    "bildung": "bildung",
    "kindergarten": "kindergarten",
    "kommune": "kommune",
    "andere": "logistik",
}

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


def region_radar():
    """Schematische Einsatzgebiets-Karte: Städte als Punkte um Paderborn."""
    cx = cy = 240
    scale = 190 / 75  # 75 km → 190 px
    mono = "font-family='IBM Plex Mono, monospace' letter-spacing='.05em'"

    parts = [
        f'<circle cx="{cx}" cy="{cy}" r="216" fill="none" stroke="#dbe4dc" stroke-dasharray="4 7"/>',
        f"<text x='{cx}' y='34' text-anchor='middle' {mono} font-size='9.5' fill='#64796e'>NRW-WEIT T&#196;TIG</text>",
    ]
    for km in (25, 50, 75):
        r = km * scale
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r:.0f}" fill="none" stroke="#dbe4dc"/>')
        parts.append(
            f"<text x='{cx + 5}' y='{cy - r - 5:.0f}' {mono} font-size='9' fill='#a8c4b2'>{km} km</text>"
        )

    for c in CITIES:
        if c["km"] == 0:
            continue
        th = math.radians(c["bearing"])
        x = cx + c["km"] * scale * math.sin(th)
        y = cy - c["km"] * scale * math.cos(th)
        anchor = "end" if x < cx - 15 else "start"
        tx = x - 11 if anchor == "end" else x + 11
        parts.append(
            f'<line x1="{cx}" y1="{cy}" x2="{x:.0f}" y2="{y:.0f}" stroke="#a8c4b2" stroke-dasharray="3 5"/>'
        )
        parts.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="#1e5b3f"/>')
        parts.append(
            f"<text x='{tx:.0f}' y='{y + 4.5:.0f}' text-anchor='{anchor}' "
            f"font-family='IBM Plex Sans, sans-serif' font-weight='600' font-size='13.5' fill='#14231d'>{c['city']}</text>"
        )

    # Standort Paderborn
    parts.append(f'<rect x="{cx - 6}" y="{cy - 6}" width="12" height="12" rx="3" fill="#e8a33d" stroke="#0d3b2a" stroke-width="2"/>')
    parts.append(
        f"<text x='{cx}' y='{cy + 26}' text-anchor='middle' font-family='IBM Plex Sans, sans-serif' "
        f"font-weight='600' font-size='13.5' fill='#0d3b2a'>Paderborn</text>"
    )
    parts.append(f"<text x='{cx}' y='{cy + 41}' text-anchor='middle' {mono} font-size='8.5' fill='#64796e'>B&#220;RO &#183; ROLANDSWEG 80</text>")

    return (
        '<svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" '
        'aria-label="Karte des Einzugsgebiets: Paderborn im Zentrum, Bielefeld, G&#252;tersloh, Detmold, '
        'H&#246;xter und Lippstadt im Umkreis von 75 Kilometern">' + "".join(parts) + "</svg>"
    )


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
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menü öffnen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Hauptnavigation">
      {''.join(links)}
      <a href="{p}einsparrechner/">Rechner</a>
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
          <li><a href="{p}einsparrechner/">Einsparrechner</a></li>
          <li><a href="{p}gmodg-nichtwohngebaeude/">GModG 2026 – Überblick</a></li>
          <li><a href="{p}sanierungspflicht-nichtwohngebaeude/">Sanierungspflicht (MEPS)</a></li>
          <li><a href="{p}neubau/">Neubau &amp; QNG</a></li>
          <li><a href="{p}foerderung/">Förderung &amp; Zuschüsse</a></li>
          <li><a href="{p}ueber-uns/">Über uns</a></li>
          <li><a href="{p}einzugsgebiet/">Einzugsgebiet OWL &amp; NRW</a></li>
          <li><a href="{p}energieaudit-din-en-16247/">Energieaudit DIN EN 16247</a></li>
          <li><a href="{p}energiemanagement-iso-50001/">Energiemanagement ISO 50001</a></li>
          <li><a href="{p}energieausweis-nichtwohngebaeude/">Energieausweis</a></li>
          <li><a href="{p}glossar/">Glossar</a></li>
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
      <span>© <span id="year">2026</span> {COMPANY['name']} · HRB 16341, AG Paderborn · Antwort i.&#8239;d.&#8239;R. binnen 1 Werktag</span>
      <nav aria-label="Rechtliches">
        <a href="{p}impressum/">Impressum</a>
        <a href="{p}datenschutz/">Datenschutz</a>
        <a href="{p}agb/">AGB</a>
        <a href="{p}bildnachweis/">Bildnachweis</a>
      </nav>
      <span class="footer-note">Diese Website lädt keine externen Dienste &amp; setzt keine Cookies.</span>
    </div>
  </div>
</footer>"""


ORG_ID = f"{BASE}/#organization"

# Kurzfassung des Unternehmensknotens. Google bewertet jede Seite für sich –
# eine @id-Referenz ohne Knoten auf derselben Seite löst sich ins Leere auf.
# Deshalb liegt dieser Knoten auf JEDER Seite im @graph (außer auf der
# Startseite, die den vollständigen ProfessionalService unter derselben @id führt).
ORG_STUB = {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "GREEN – Energieberatung für Nichtwohngebäude",
    "legalName": COMPANY["name"],
    "url": f"{BASE}/",
    "logo": f"{BASE}/assets/img/apple-touch-icon.png",
    "telephone": "+49 5251 40292910",
    "email": COMPANY["email"],
    "address": {
        "@type": "PostalAddress",
        "streetAddress": COMPANY["street"],
        "postalCode": "33102",
        "addressLocality": "Paderborn",
        "addressRegion": "Nordrhein-Westfalen",
        "addressCountry": "DE",
    },
}


def plain(text):
    """Entfernt HTML aus Texten, die in strukturierte Daten wandern."""
    import re as _re
    return _re.sub(r"\s+", " ", _re.sub(r"<[^>]+>", "", text)).strip()


def build_graph(schema, crumbs_schema):
    """Führt Seiten-Schema, Breadcrumb und Unternehmensknoten zu einem @graph zusammen."""
    nodes = []
    if schema:
        nodes = list(schema["@graph"]) if "@graph" in schema else [
            {k: v for k, v in schema.items() if k != "@context"}
        ]
    if crumbs_schema and not any(n.get("@type") == "BreadcrumbList" for n in nodes):
        nodes.append(crumbs_schema)
    if not any(n.get("@id") == ORG_ID for n in nodes):
        nodes.insert(0, ORG_STUB)
    if not nodes:
        return ""
    graph = {"@context": "https://schema.org", "@graph": nodes}
    return (
        '<script type="application/ld+json">'
        + json.dumps(graph, ensure_ascii=False)
        + "</script>"
    )


def page(path, title, desc, body, active="", schema=None, depth=None,
         og_type="website", noindex=False, extra_head=""):
    """Komplette HTML-Seite. path = Canonical-Pfad relativ zur Domain, z. B. 'vorteile/'."""
    if depth is None:
        depth = path.count("/")
    p = "../" * depth
    canonical = f"{BASE}/{path}"
    schema_tag = build_graph(schema, take_crumbs_schema())
    robots = '\n  <meta name="robots" content="noindex, follow">' if noindex else ""
    canonical_tag = "" if noindex else f'\n  <link rel="canonical" href="{canonical}">'
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">{robots}{canonical_tag}
  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="GREEN – Energieberatung für Nichtwohngebäude">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{BASE}/assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="GREEN – bis zu 70 % weniger Energiekosten für Ihr Nichtwohngebäude">
  <meta property="og:locale" content="de_DE">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{BASE}/assets/img/og-image.png">{extra_head}
  <meta name="theme-color" content="#0d3b2a">
  <meta name="geo.region" content="DE-NW">
  <meta name="geo.placename" content="Paderborn">
  <meta name="geo.position" content="{COMPANY['lat']};{COMPANY['lon']}">
  <meta name="ICBM" content="{COMPANY['lat']}, {COMPANY['lon']}">
  <link rel="manifest" href="{p}manifest.webmanifest">
  <link rel="icon" href="{p}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="{p}assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="{p}assets/css/style.css">
  <noscript><style>.reveal{{opacity:1;transform:none;animation:none}}
    .site-nav{{position:static;display:flex;box-shadow:none;border-bottom:0}}
    .nav-toggle{{display:none}}</style></noscript>
  {schema_tag}
</head>
<body>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  {header(p, active)}
  <main id="main" tabindex="-1">
{body}
  </main>
  {footer(p)}
  <div class="sticky-cta">
    <a class="btn btn--light" href="{p}beratungstermin/">Kostenloses Erstgespräch</a>
    <a class="btn btn--ghost-light" href="tel:{COMPANY['phone_link']}" aria-label="Anrufen: {COMPANY['phone_display']}">{icon('phone')}</a>
  </div>
  <script src="{p}assets/js/main.js" defer></script>
</body>
</html>"""


# Der Generator baut Seiten streng nacheinander: erst der Body (dort läuft
# breadcrumbs()), dann page(). Deshalb kann breadcrumbs() die Krümel hier
# hinterlegen und page() sie für das BreadcrumbList-Schema abholen. So können
# sichtbarer Pfad und strukturierte Daten nicht auseinanderlaufen.
_PENDING_CRUMBS = None


def breadcrumbs(p, items):
    global _PENDING_CRUMBS
    _PENDING_CRUMBS = [("Start", "")] + [(label, href) for href, label in items]
    lis = [f'<li><a href="{p}">Start</a></li>']
    for href, label in items[:-1]:
        lis.append(f'<li><a href="{p}{href}">{label}</a></li>')
    lis.append(f"<li>{items[-1][1]}</li>")
    return f'<ol class="breadcrumb">{"".join(lis)}</ol>'


def take_crumbs_schema():
    """Liefert das BreadcrumbList-Schema zur zuletzt gerenderten Krümelnavigation."""
    global _PENDING_CRUMBS
    if not _PENDING_CRUMBS:
        return None
    items = [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": f"{BASE}/{href}"}
        for i, (name, href) in enumerate(_PENDING_CRUMBS)
    ]
    _PENDING_CRUMBS = None
    return {"@type": "BreadcrumbList", "itemListElement": items}


def page_hero(p, crumbs, eyebrow, h1, lead):
    return f"""<section class="page-hero">
  <div class="container">
    {breadcrumbs(p, crumbs)}
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p class="lead">{lead}</p>
  </div>
</section>"""


def figure(name, caption, extra_class=""):
    return (
        f'<figure class="illus reveal {extra_class}">{ILLUSTRATIONS[name]()}'
        f"<figcaption>{caption}</figcaption></figure>"
    )


def city_chips(p, current_slug=None):
    chips = []
    for c in CITIES:
        if c["slug"] == current_slug:
            continue
        km = "Sitz" if c["km"] == 0 else f"ca. {c['km']} km"
        chips.append(
            f'<li><a class="chip" href="{p}{c["slug"]}/">{c["city"]} <span class="chip-km">{km}</span></a></li>'
        )
    chips.append(f'<li><a class="chip" href="{p}einzugsgebiet/">Ganz NRW <span class="chip-km">Übersicht</span></a></li>')
    return f'<ul class="city-chips">{"".join(chips)}</ul>'


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
        f"""<a class="card card--photo reveal" href="{p}services/{i['slug']}/">
      {photo_img(INDUSTRY_PHOTO[i['slug']], p)}
      <div class="card-body">
        <h3>{i['name']}</h3>
        <p>{i['card']}</p>
        <span class="card-more">Mehr erfahren {icon('arrow')}</span>
      </div>
    </a>"""
        for i in INDUSTRIES
    )

    services = [
        ("search", "Energieberatung & -konzept", "Vollständige Analyse Ihres Gebäudes nach DIN V 18599 – mit priorisierten Maßnahmen und Wirtschaftlichkeitsrechnung."),
        ("doc", "Energieaudit &amp; ISO 50001", "Normkonforme Audits nach DIN EN 16247 – oder gleich das Energiemanagementsystem nach ISO 50001, mit dem die Auditpflicht entfällt."),
        ("chart", "Sanierungsfahrplan &amp; MEPS-Check", "Schritt für Schritt zum effizienten Gebäude – und rechtzeitig unter die Sanierungspflicht-Schwellen 2030 und 2033."),
        ("euro", "Fördermittelservice", "BEG-Kredite mit Tilgungszuschuss, KFN im Neubau, Landes- und Kommunalprogramme – wir finden die richtige Kombination und beantragen sie."),
        ("buero", "Neubau, QNG &amp; KFN-Förderung", "Effizienzstufe festlegen, Qualitätssiegel Nachhaltiges Gebäude prüfen, Förderkredit bis 2.000 € je m² sichern – und zwar vor dem Bauantrag."),
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
      Energiekonzept und sichern die staatliche Förderung – unabhängig, persönlich
      und mit Festpreis.</p>
      <div class="hero-ctas">
        <a class="btn btn--primary btn--lg" href="beratungstermin/">{icon('calendar')} Kostenloses Erstgespräch</a>
        <a class="btn btn--ghost btn--lg" href="einsparrechner/">{icon('chart')} Einsparung berechnen</a>
      </div>
      <ul class="hero-trust">
        <li>{icon('check')} mehrere hundert betreute Objekte</li>
        <li>{icon('check')} 50&#8239;% Förderung, max. 4.000&#8239;€</li>
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
      <div class="kpi reveal"><div class="kpi-value"><span data-count="300">300</span><span class="unit">+</span></div><div class="kpi-label">betreute Objekte</div></div>
      <div class="kpi reveal reveal-d1"><div class="kpi-value">−<span data-count="70">70</span><span class="unit">%</span></div><div class="kpi-label">Energiekosten möglich</div></div>
      <div class="kpi reveal reveal-d2"><div class="kpi-value"><span data-count="50">50</span><span class="unit">%</span></div><div class="kpi-label">Förderung der Beratung</div></div>
      <div class="kpi reveal reveal-d3"><div class="kpi-value"><span data-count="10">10</span><span class="unit">+ Jahre</span></div><div class="kpi-label">Erfahrung mit NWG</div></div>
    </div>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="callout reveal">
      <div>
        <span class="badge">Neu · in Kraft seit 29.07.2026</span>
        <h2>Das GModG ersetzt das Heizungsgesetz – das ändert sich für Ihr Gebäude.</h2>
        <p>Sanierungspflichten für Bestandsgebäude ab 2030, Gebäudeautomation über 70&#8239;kW
        bis Ende 2029, Bedarfsausweis-Pflicht ab 2027, Heizung wieder technologieoffen:
        Das neue Gebäudemodernisierungsgesetz betrifft praktisch jedes Nichtwohngebäude.
        Wir sagen Ihnen in einem kostenlosen GModG-Check, was für Ihres gilt.</p>
        <div class="hero-ctas" style="margin-bottom:0">
          <a class="btn btn--light" href="sanierungspflicht-nichtwohngebaeude/">Sanierungspflicht prüfen {icon('arrow')}</a>
          <a class="btn btn--ghost-light" href="gmodg-nichtwohngebaeude/">Alle GModG-Pflichten</a>
        </div>
      </div>
      <div class="big-number">2030<small>erste MEPS-Sanierungsfrist im Bestand</small></div>
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
      wir behalten die Verantwortung. Warum sich das rechnet, steht unter
      <a href="vorteile/">Ihre Vorteile</a>; wer dahintersteckt, unter
      <a href="ueber-uns/">Über uns</a>.</p>
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
        <p>Die Bundesförderung für Energieberatung für Nichtwohngebäude (EBN) übernimmt
        50&#8239;% des Beratungshonorars – gestaffelt nach Fläche bis maximal 4.000&#8239;€.
        Auch die Sanierung selbst ist förderfähig. Wir übernehmen die komplette
        Antragstellung, in der richtigen Reihenfolge.</p>
        <div class="hero-ctas" style="margin-bottom:0">
          <a class="btn btn--light" href="foerderung/">Förderung im Detail {icon('arrow')}</a>
          <a class="btn btn--ghost-light" href="beratungstermin/">Anspruch prüfen lassen</a>
        </div>
      </div>
      <div class="big-number">50&#8239;%<small>des Honorars, max. 4.000&#8239;€</small></div>
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

<section class="section" id="region">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Einzugsgebiet</p>
      <h2>In Paderborn zuhause, in ganz NRW im Einsatz</h2>
      <p class="lead">Unser Büro liegt in Paderborn – Bielefeld, Gütersloh, Detmold,
      Höxter und Lippstadt erreichen wir in unter einer Stunde. Und wenn Ihr Gebäude
      woanders in Nordrhein-Westfalen steht: Wir kommen trotzdem gern.</p>
      {city_chips("")}
    </div>
    <figure class="radar-figure reveal reveal-d1">
      {region_radar()}
      <figcaption>Abb. 02 – Einzugsgebiet ab Büro Paderborn (Entfernungen ca., Straße)</figcaption>
    </figure>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Referenzen</p>
      <h2>Das sagen unsere Kunden</h2>
    </div>
    <div class="quote-grid">{quotes}</div>
  </div>
</section>

<section class="section" id="faq">
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
                "alternateName": ["GREEN", "Green NWG", "Green HLB GmbH"],
                "url": f"{BASE}/",
                "logo": f"{BASE}/assets/img/apple-touch-icon.png",
                "image": f"{BASE}/assets/img/og-image.png",
                "email": COMPANY["email"],
                "telephone": "+49 5251 40292910",
                "description": "Unabhängige Energieberatung für Nichtwohngebäude: Energiekonzepte, Energieaudits, Sanierungsfahrpläne und Fördermittelservice für Unternehmen und Kommunen in NRW.",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": COMPANY["street"],
                    "postalCode": "33102",
                    "addressLocality": "Paderborn",
                    "addressRegion": "Nordrhein-Westfalen",
                    "addressCountry": "DE",
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": COMPANY["lat"],
                    "longitude": COMPANY["lon"],
                },
                "openingHoursSpecification": {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    "opens": "08:00",
                    "closes": "16:00",
                },
                "areaServed": [
                    {"@type": "State", "name": "Nordrhein-Westfalen"},
                    {"@type": "AdministrativeArea", "name": "Ostwestfalen-Lippe"},
                ] + [{"@type": "City", "name": c["city"]} for c in CITIES],
                "serviceArea": {
                    "@type": "GeoCircle",
                    "geoMidpoint": {
                        "@type": "GeoCoordinates",
                        "latitude": COMPANY["lat"],
                        "longitude": COMPANY["lon"],
                    },
                    "geoRadius": "100000",
                },
                "hasOfferCatalog": {
                    "@type": "OfferCatalog",
                    "name": "Leistungen",
                    "itemListElement": [
                        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}}
                        for n in [
                            "Energieberatung für Nichtwohngebäude (DIN V 18599)",
                            "Energieaudit nach DIN EN 16247",
                            "Sanierungsfahrplan",
                            "Fördermittelservice (EBN/BEG)",
                            "Neubaubegleitung",
                            "Umsetzungsbegleitung & Energie-Monitoring",
                        ]
                    ],
                },
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
                        "name": plain(q),
                        "acceptedAnswer": {"@type": "Answer", "text": plain(a)},
                    }
                    for q, a in FAQS
                ],
            },
        ],
    }

    return page(
        "",
        "Energieberatung für Nichtwohngebäude in NRW | GREEN Paderborn",
        "Bis zu 70 % Energiekosten sparen: unabhängige Energieberatung für Büro, Handel, Produktion, Schulen und Kommunen in NRW. Jetzt Erstgespräch sichern.",
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
        f"""<a class="card card--photo reveal" href="{p}services/{i['slug']}/">
      {photo_img(INDUSTRY_PHOTO[i['slug']], p)}
      <div class="card-body">
        <h3>{i['name']}</h3>
        <p>{i['card']}</p>
        <span class="card-more">Zur Branchenlösung {icon('arrow')}</span>
      </div>
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
    <div class="section-head reveal">
      <p class="eyebrow">Branchen im Überblick</p>
      <h2>Acht Gebäudetypen, acht eigene Energieprofile</h2>
      <p class="lead">Was in einem Bürogebäude den größten Hebel bildet – Beleuchtung,
      Lüftung, Regelung – ist im Lebensmittelhandel zweitrangig: Dort entscheidet die
      Kälte. In der Produktion wiederum liegt das Geld in Druckluft und Abwärme, in
      Schulen im Lüftungskonzept, in Kitas in der Behaglichkeit am Boden.</p>
      <p>Deshalb starten wir nie mit einer Maßnahmenliste, sondern mit Ihrem
      Nutzungsprofil: Wann läuft welche Anlage, wie lange, für wen? Aus dieser
      Betriebswirklichkeit ergibt sich die Reihenfolge der Maßnahmen – und damit,
      welcher Euro sich zuerst lohnt. Wählen Sie unten Ihren Gebäudetyp, um die
      typischen Energiefresser und die passenden Maßnahmen zu sehen.</p>
    </div>
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
    <div class="reveal reveal-d1">
      {figure("energieaudit-din-16247", "Abb. – Energieaudit nach DIN EN 16247")}
      <ul class="checklist illus--pad" style="margin-bottom:0">
        <li>Unabhängige Analyse für jeden Gebäudetyp</li>
        <li>Förderfähig nach Bundesprogrammen (EBN/BEG)</li>
        <li>Beratung nach DIN V 18599 &amp; DIN EN 16247</li>
        <li>Ein fester Ansprechpartner für alles</li>
      </ul>
    </div>
  </div>
</section>

{cta_band(p)}
"""
    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Branchenlösungen der Energieberatung",
        "url": f"{BASE}/loesungen/",
        "inLanguage": "de",
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": len(INDUSTRIES),
            "itemListElement": [
                {"@type": "ListItem", "position": n + 1, "name": i["name"],
                 "url": f"{BASE}/services/{i['slug']}/"}
                for n, i in enumerate(INDUSTRIES)
            ],
        },
    }
    return page(
        "loesungen/",
        "Branchenlösungen nach Gebäudetyp | GREEN",
        "Energieberatung für Büro, Einzelhandel, Produktion, Schulen, Kitas, Kommunen und Veranstaltungsstätten. Jetzt Gebäudetyp wählen und Potenzial prüfen.",
        body,
        active="loesungen/",
        schema=schema,
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
    <div class="reveal reveal-d1">
      {photo(INDUSTRY_PHOTO[ind['slug']], p, eager=True)}
      <div class="callout illus--pad" style="grid-template-columns:1fr;padding:1.6rem">
        <div class="big-number">{stat_value}{'&#8239;' + stat_unit if stat_unit else ''}<small>{stat_label}</small></div>
      </div>
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

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Unsere Maßnahmen</p>
      <h2>So senken wir Ihre Kosten – Schritt für Schritt</h2>
      <p class="lead">Jede Empfehlung kommt mit Kosten, Einsparung und Amortisationszeit.
      Sie entscheiden auf Basis von Zahlen, nicht von Versprechen.</p>
    </div>
    <ul class="feature-list">{measures}</ul>
    {figure(f"schema-{ind['slug']}", f"Abb. – Energiekonzept {ind['name']} (Schema)", "illus--pad")}
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="callout reveal">
      <div>
        <h2>50&#8239;% Förderung – auch für Ihr Gebäude.</h2>
        <p>Der Bund bezuschusst die Energieberatung für Nichtwohngebäude mit 50&#8239;% des
        Honorars, gestaffelt nach Fläche bis maximal 4.000&#8239;€. Wir prüfen im kostenlosen
        Erstgespräch, ob Sie antragsberechtigt sind, und übernehmen die Antragstellung.</p>
        <div class="hero-ctas" style="margin-bottom:0">
          <a class="btn btn--light" href="{p}beratungstermin/">Kostenloses Erstgespräch {icon('arrow')}</a>
          <a class="btn btn--ghost-light" href="{p}foerderung/">Förderbedingungen</a>
        </div>
      </div>
      <div class="big-number">50&#8239;%<small>des Honorars, max. 4.000&#8239;€</small></div>
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
        ("law", "Gesetzliche Sicherheit", "GModG 2026 (vormals GEG), Energieausweis-Pflichten, Energieaudits nach DIN EN 16247, Gebäudeautomation über 70 kW: Wir übersetzen Paragrafen in einen machbaren Fahrplan – bevor Fristen und Bußgelder drohen."),
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
        ("GModG 2026 – das neue Gebäudegesetz", "Seit 29. Juli 2026 ersetzt das Gebäudemodernisierungsgesetz das GEG: Sanierungspflichten für die schlechtesten Bestandsgebäude ab 2030, Gebäudeautomation über 70 kW bis Ende 2029, Bedarfsausweis-Pflicht ab 2027 – und technologieoffene Heizungsregeln. <a href='../gmodg-nichtwohngebaeude/'>Zum GModG-Überblick&nbsp;→</a>"),
        ("Energieaudit-Pflicht", "Unternehmen, die kein KMU sind, müssen alle vier Jahre ein Energieaudit nach DIN EN 16247 vorweisen – oder ein Energiemanagementsystem betreiben."),
        ("CO₂-Preis & Energiekosten", "Der CO₂-Preis auf fossile Brennstoffe steigt planmäßig weiter und verteuert jede nicht sanierte Kilowattstunde Jahr für Jahr – jede eingesparte kWh wird damit doppelt wertvoll."),
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

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">So sieht das in der Praxis aus</p>
      <h2>Ihr Fahrplan: Jede Stufe senkt die Kosten</h2>
      <p>Ein Sanierungsfahrplan ordnet die Maßnahmen nach Wirkung und Wirtschaftlichkeit:
      Schnelle Gewinne wie LED und Regelungstechnik finanzieren die größeren Schritte wie
      Wärmepumpe und Photovoltaik mit. So sinken Ihre Energiekosten Stufe für Stufe –
      planbar, gefördert und ohne Betriebsunterbrechung.</p>
      <a class="btn btn--primary" href="{p}beratungstermin/">Fahrplan erstellen lassen {icon('arrow')}</a>
    </div>
    <div class="reveal reveal-d1">
      {figure("sanierungsfahrplan", "Abb. – Sanierungsfahrplan (Schema): Energiekosten sinken in Stufen")}
      {photo("photovoltaik", p, cls="illus--pad")}
    </div>
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
        "Ihre Vorteile: Kosten, Förderung, GModG-Sicherheit | GREEN",
        "5 Gründe für die Energieberatung von GREEN: bis zu 70 % Kostenersparnis, 50 % Förderung, GModG-Sicherheit, höherer Immobilienwert und besseres Raumklima.",
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
      {photo("beratung-gespraech", p, "Beratung heißt bei uns: gemeinsam vor Ort, nicht per Formular.", eager=True)}
      {figure("standort-paderborn", "Abb. – Unser Büro am Rolandsweg 80, Paderborn", "illus--pad")}
      <ul class="checklist illus--pad" style="margin-bottom:0">
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
      <div class="kpi reveal"><div class="kpi-value"><span data-count="300">300</span><span class="unit">+</span></div><div class="kpi-label">betreute Objekte</div></div>
      <div class="kpi reveal reveal-d1"><div class="kpi-value">−<span data-count="70">70</span><span class="unit">%</span></div><div class="kpi-label">Energiekosten erreicht</div></div>
      <div class="kpi reveal reveal-d2"><div class="kpi-value">−<span data-count="80">80</span><span class="unit">%</span></div><div class="kpi-label">CO₂-Ausstoß erreicht</div></div>
      <div class="kpi reveal reveal-d3"><div class="kpi-value"><span data-count="10">10</span><span class="unit">+ Jahre</span></div><div class="kpi-label">Erfahrung</div></div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Arbeitsweise</p>
      <h2>Woran Sie eine unabhängige Beratung erkennen</h2>
      <p class="lead">„Unabhängig" steht auf vielen Websites. Prüfbar wird es erst an
      konkreten Punkten – diese vier können Sie bei jedem Anbieter abfragen.</p>
    </div>
    <ul class="feature-list">
      <li class="feature reveal"><span class="feature-icon">{icon('shield')}</span>
        <div><h3>Kein Produktverkauf, keine Provision</h3>
        <p>Wir verkaufen weder Heizungen noch Photovoltaikmodule und erhalten von keinem
        Hersteller und keinem Handwerksbetrieb eine Vermittlungsprovision. Unser Honorar
        ist unsere einzige Einnahme aus Ihrem Projekt – deshalb kann eine Empfehlung auch
        lauten, dass eine Maßnahme sich bei Ihnen nicht rechnet.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('chart')}</span>
        <div><h3>Gerechnet, nicht geschätzt</h3>
        <p>Jede Empfehlung kommt mit Investitionssumme, jährlicher Einsparung, Förderung
        und Amortisationszeit. Sie sehen den Rechenweg und können ihn intern
        weiterverwenden – in der Vorlage für Geschäftsführung, Kämmerei oder Rat.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('euro')}</span>
        <div><h3>Festpreis vor der Beauftragung</h3>
        <p>Sie erfahren vor Vertragsschluss, was die Beratung kostet und welcher Zuschuss
        realistisch übrig bleibt – inklusive der gesetzlichen Deckelung. Nachträgliche
        Aufschläge gibt es nur, wenn Sie zusätzliche Leistungen beauftragen.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('handshake')}</span>
        <div><h3>Ein Ansprechpartner, durchgehend</h3>
        <p>Die Person, die Ihr Gebäude begeht, ist auch die, die das Konzept rechnet und
        später ans Telefon geht. Kein Wechsel zwischen Vertrieb, Fachabteilung und
        Projektleitung – und niemand, der sich auf Vorgänger beruft.</p></div></li>
    </ul>
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
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "AboutPage",
                "name": "Über GREEN – Ingenieurbüro für Energieeffizienz",
                "url": f"{BASE}/ueber-uns/",
                "inLanguage": "de",
                "mainEntity": {"@id": ORG_ID},
            },
            *[
                {
                    "@type": "Person",
                    "name": name,
                    "jobTitle": role,
                    "worksFor": {"@id": ORG_ID},
                }
                for name, role in TEAM
            ],
        ],
    }
    return page(
        "ueber-uns/",
        "Über uns: Ingenieurbüro für Energieeffizienz | GREEN",
        "Seit über einem Jahrzehnt auf Nichtwohngebäude spezialisiert: Lernen Sie das Team der Green HLB GmbH aus Paderborn kennen und sprechen Sie uns an.",
        body,
        active="ueber-uns/",
        schema=schema,
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
      {figure("prozess-ablauf", "Abb. – So geht es nach Ihrer Nachricht weiter", "illus--pad")}
    </div>
    <div class="reveal reveal-d1">
      <form class="form" id="contact-form" novalidate>
        <p class="form-hint" style="margin:0 0 1rem">Mit <span class="req">*</span>
        gekennzeichnete Felder sind Pflichtfelder.</p>
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
    schema = {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Kontakt zur GREEN Energieberatung",
        "url": f"{BASE}/kontakt/",
        "inLanguage": "de",
        "mainEntity": {"@id": ORG_ID},
    }
    return page(
        "kontakt/",
        "Kontakt & Anfahrt Paderborn | GREEN",
        "GREEN erreichen: 05251 40 29 29 10, info@green-nwg.de, Rolandsweg 80 in Paderborn. Antwort in der Regel am nächsten Werktag – jetzt schreiben.",
        body,
        active="kontakt/",
        schema=schema,
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
      {figure("foerderung-ebn-50-50", "Abb. – Bundesförderung EBN: bis zu 50&#8239;% Zuschuss zur Beratung", "illus--pad")}
    </div>
    <div class="reveal reveal-d1">
      <form class="form" id="contact-form" novalidate>
        <p class="form-hint" style="margin:0 0 1rem">Mit <span class="req">*</span>
        gekennzeichnete Felder sind Pflichtfelder.</p>
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
        "Beratungstermin: kostenloses Erstgespräch | GREEN",
        "Jetzt kostenloses Erstgespräch zur Energieberatung sichern: Potenzial, Förderung und nächste Schritte für Ihr Nichtwohngebäude – unverbindlich und mit Festpreis.",
        body,
        active=None,
    )


# ---------------------------------------------------------------------------
# Einsparrechner
# ---------------------------------------------------------------------------

def render_rechner():
    p = "../"
    opts = "".join(
        f'<option value="{v}"{" selected" if v == "buero" else ""}>{l}</option>'
        for v, l in [
            ("buero", "Bürogebäude / Verwaltung"),
            ("einzelhandel", "Einzelhandel / Verkaufsfläche"),
            ("produktion", "Produktion / Werkstatt"),
            ("veranstaltung", "Veranstaltungsstätte / Halle"),
            ("bildung", "Schule / Hochschule"),
            ("kindergarten", "Kindergarten / Kita"),
            ("kommune", "Kommunales Verwaltungsgebäude"),
            ("hotel", "Hotel / Pflege / 24-Stunden-Betrieb"),
        ]
    )
    body = f"""
{page_hero(p, [("einsparrechner/", "Einsparrechner")], "Kostenloses Werkzeug",
           "Einsparrechner für Nichtwohngebäude",
           "In 30 Sekunden zur ersten Einschätzung: Wie hoch sind Ihre Energiekosten "
           "voraussichtlich – und wie viel davon lässt sich realistisch einsparen?")}

<section class="section">
  <div class="container">
    <div class="calc" id="rechner">
      <div class="calc-inputs reveal">
        <div class="calc-field">
          <label for="r-typ">Gebäudetyp</label>
          <select id="r-typ">{opts}</select>
        </div>
        <div class="calc-field">
          <label for="r-flaeche">Nutzfläche in m²</label>
          <input id="r-flaeche" type="number" min="50" max="200000" step="50" value="2500" inputmode="numeric">
          <span class="calc-hint">Beheizte Nettogrundfläche, grob geschätzt genügt</span>
        </div>
        <div class="calc-field">
          <label for="r-zustand">Energetischer Zustand</label>
          <select id="r-zustand">
            <option value="alt">Unsaniert – Technik und Hülle älter als ca. 25 Jahre</option>
            <option value="teil" selected>Teilsaniert – einzelne Maßnahmen umgesetzt</option>
            <option value="neu">Weitgehend saniert oder Neubau</option>
          </select>
        </div>
        <div class="calc-row">
          <div class="calc-field">
            <label for="r-preis-strom">Strompreis (ct/kWh)</label>
            <input id="r-preis-strom" type="number" min="5" max="80" step="0.5" value="25" inputmode="decimal">
          </div>
          <div class="calc-field">
            <label for="r-preis-waerme">Wärmepreis (ct/kWh)</label>
            <input id="r-preis-waerme" type="number" min="2" max="40" step="0.5" value="10" inputmode="decimal">
          </div>
        </div>
        <p class="calc-hint" style="margin:0">Ihre Eingaben bleiben im Browser – es werden
        keine Daten übertragen oder gespeichert.</p>
      </div>

      <div class="calc-result reveal reveal-d1">
        <p class="calc-headline-label">Mögliche Ersparnis pro Jahr</p>
        <p class="calc-headline" id="r-sparen">–</p>
        <p id="r-live" class="visually-hidden" role="status" aria-live="polite"></p>

        <div class="calc-bars">
          <div class="calc-bar-row">
            <span class="calc-bar-label">Heute</span>
            <div class="calc-bar-track">
              <div class="calc-bar-fill calc-bar-fill--ist" id="r-bar-ist"><span id="r-ist">–</span></div>
            </div>
          </div>
          <div class="calc-bar-row">
            <span class="calc-bar-label">Nach Sanierung</span>
            <div class="calc-bar-track">
              <div class="calc-bar-fill calc-bar-fill--neu" id="r-bar-neu"><span id="r-neu">–</span></div>
            </div>
          </div>
        </div>

        <div class="calc-facts">
          <div class="calc-fact"><b id="r-quote">–</b><span>Einsparpotenzial</span></div>
          <div class="calc-fact"><b id="r-sparen-10">–</b><span>in 10 Jahren</span></div>
          <div class="calc-fact"><b id="r-co2">–</b><span>CO₂ pro Jahr</span></div>
          <div class="calc-fact"><b id="r-verbrauch">–</b><span>Verbrauch heute p. a.</span></div>
        </div>

        <div class="hero-ctas" style="margin-bottom:0">
          <a class="btn btn--light" href="{p}beratungstermin/">{icon('calendar')} Genaue Zahlen im Erstgespräch</a>
        </div>

        <p class="calc-disclaimer">Die Werte beruhen auf durchschnittlichen
        Verbrauchskennwerten für <span id="r-flaeche-out">–</span> Nutzfläche und sind eine
        grobe Orientierung, keine Zusage. Der tatsächliche Verbrauch hängt von Anlagentechnik,
        Nutzungszeiten, Baujahr und Nutzerverhalten ab und weicht im Einzelfall deutlich ab.
        Belastbare Zahlen liefert erst die Analyse vor Ort – die ist bei uns kostenlos
        im Erstgespräch angelegt.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Vom Schätzwert zur Sicherheit</p>
      <h2>Was der Rechner nicht kann – und wir schon</h2>
      <p>Ein Rechner arbeitet mit Durchschnitten. Ihr Gebäude ist aber kein Durchschnitt:
      Eine Lüftungsanlage, die nachts durchläuft, eine Kälteanlage ohne Türen oder ein
      Druckluftnetz mit Leckagen verschieben das Ergebnis um Zehntausende Euro – nach oben
      wie nach unten.</p>
      <p>Deshalb messen wir, statt zu schätzen: Wir werten Ihre Verbrauchsdaten aus, erfassen
      Anlagen und Gebäudehülle vor Ort und rechnen jede Maßnahme einzeln durch – mit Kosten,
      Einsparung, Förderung und Amortisationszeit. Das Ergebnis ist keine Prozentzahl,
      sondern eine Entscheidungsgrundlage.</p>
      <a class="btn btn--primary" href="{p}beratungstermin/">Kostenloses Erstgespräch {icon('arrow')}</a>
    </div>
    {photo("beratung-daten", p, "Belastbare Zahlen entstehen aus echten Verbrauchsdaten, nicht aus Durchschnitten.")}
  </div>
</section>

{cta_band(p)}
"""
    schema = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Einsparrechner für Nichtwohngebäude",
        "url": f"{BASE}/einsparrechner/",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "inLanguage": "de",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
        "publisher": {"@id": f"{BASE}/#organization"},
        "description": "Kostenloser Rechner: schätzt Energiekosten, Einsparpotenzial und CO₂-Reduktion für Büro-, Handels-, Produktions-, Bildungs- und kommunale Gebäude.",
    }
    return page(
        "einsparrechner/",
        "Einsparrechner Nichtwohngebäude: Kosten schätzen | GREEN",
        "Kostenloser Einsparrechner für Nichtwohngebäude: Energiekosten, Einsparpotenzial und CO₂-Reduktion in 30 Sekunden schätzen – ohne Anmeldung, ohne Datenübertragung.",
        body,
        active=None,
        schema=schema,
    )


# ---------------------------------------------------------------------------
# GModG 2026 (Gesetzes-Überblick)
# ---------------------------------------------------------------------------

def render_gmodg():
    p = "../"
    duties = [
        ("law", "Sanierungspflicht für den Bestand (MEPS)", "Erstmals gelten Mindesteffizienz-Standards für bestehende Nichtwohngebäude: Der Primärenergiebedarf darf den Referenzgebäudewert ab 1.1.2030 höchstens um das 3,5-Fache und ab 1.1.2033 um das 2,95-Fache überschreiten. Getroffen werden zuerst die energetisch schlechtesten Gebäude – gemäß EU-Vorgabe die schwächsten 16 % bis 2030 und 26 % bis 2033."),
        ("tools", "Gebäudeautomation bis Ende 2029", "Nichtwohngebäude mit Lüftungs- oder Klimaanlagen über 70 kW Nennleistung müssen bis zum 31.12.2029 mit Gebäudeautomation ausgerüstet werden – eine deutliche Verschärfung gegenüber der alten 290-kW-Schwelle."),
        ("doc", "Bedarfsausweis wird Pflicht", "Verbrauchsausweise sind für Nichtwohngebäude ab dem 1.1.2027 nicht mehr zulässig. Energieausweise brauchen dann eine energetische Bilanzierung – mit neuen Effizienzklassen auf Basis des Primärenergiereferenzfaktors."),
        ("buero", "Nullemissions-Neubauten", "Neubauten der öffentlichen Hand müssen ab 1.1.2028, alle übrigen Neubauten ab 1.1.2030 als Nullemissionsgebäude errichtet werden – am Standort ohne CO₂-Emissionen aus fossilen Brennstoffen. <a href=\'../neubau/\'>Neubau, QNG und Förderung</a>"),
        ("bolt", "Heizung: technologieoffen mit Bio-Treppe", "Die 65-Prozent-EE-Vorgabe („Heizungsgesetz“) ist gestrichen. Neue Gas- und Ölheizungen bleiben erlaubt, müssen aber steigende Anteile biogener Brennstoffe oder Wasserstoff nutzen: 10 % ab 2029, 15 % ab 2030, 30 % ab 2035, 60 % ab 2040."),
        ("chart", "Solarpflicht ab 2027", "Die Pflicht zur Photovoltaik-Nutzung wird ab dem 1.1.2027 schrittweise eingeführt. Gut zu wissen: Auf Nichtwohngebäuden rechnet sich PV meist ohnehin – der Verbrauch liegt genau in den Ertragsstunden."),
    ]
    duty_items = "".join(
        f"""<li class="feature reveal">
      <span class="feature-icon">{icon(ic)}</span>
      <div><h3>{t}</h3><p>{d}</p></div>
    </li>"""
        for ic, t, d in duties
    )

    audiences = [
        ("Sie besitzen Bestandsgebäude?", "Klären Sie jetzt, ob Ihr Gebäude unter die MEPS-Stufen 2030/2033 fällt und ob die 70-kW-Automationspflicht greift. Wer früh plant, saniert mit Förderung statt unter Fristdruck. <a href=\'../sanierungspflicht-nichtwohngebaeude/\'>Zur Sanierungspflicht</a>"),
        ("Sie planen einen Neubau?", "Ab 2030 gilt der Nullemissionsstandard für alle – wer heute plant, baut ihn besser gleich mit ein. Dazu kommt die Förderfrage: mit QNG steigt der Förderkredit auf 2.000 € je m². <a href=\'../neubau/\'>Zur Neubaubegleitung</a>"),
        ("Sie vertreten eine Kommune?", "Für öffentliche Neubauten gilt der Nullemissionsstandard schon ab 2028 – und die Vorbildfunktion für den Bestand bleibt. Wir priorisieren Ihr Portfolio fristen- und fördergerecht."),
    ]
    audience_cards = "".join(
        f"""<div class="card reveal"><h3>{t}</h3><p>{d}</p></div>""" for t, d in audiences
    )

    gmodg_faqs = [
        ("Gilt das GModG schon?", "Ja. Das Gesetz wurde am 10. Juli 2026 von Bundestag und Bundesrat beschlossen, am 28. Juli 2026 verkündet, und die ersten Regelungen – darunter die neuen Heizungsvorschriften – sind seit dem 29. Juli 2026 in Kraft. Weitere Pflichten folgen gestaffelt bis 2040."),
        ("Betrifft die MEPS-Sanierungspflicht unser Gebäude?", "Das hängt vom Primärenergiebedarf Ihres Gebäudes im Verhältnis zum Referenzgebäude ab – betroffen sind zuerst die energetisch schlechtesten Nichtwohngebäude. Genau das prüfen wir im GModG-Check: Bedarf bilanzieren, Abstand zur Schwelle bestimmen, Maßnahmen priorisieren."),
        ("Welche Frist kommt zuerst?", "Für die meisten Eigentümer: der Bedarfsausweis ab 1.1.2027 (Verbrauchsausweise entfallen für Nichtwohngebäude) und die Gebäudeautomation über 70 kW bis Ende 2029. Danach folgen die MEPS-Stufen 2030 und 2033."),
        ("Ist eine Gasheizung jetzt wieder eine gute Idee?", "Erlaubt: ja. Wirtschaftlich: Rechnen wir nach. Über die Bio-Treppe steigen die Pflicht-Anteile erneuerbarer Brennstoffe bis 2040 auf 60 %, und der CO₂-Preis verteuert fossile Wärme zusätzlich. Wir vergleichen Wärmepumpe, Hybrid, Wärmenetz und Gas neutral – wir verkaufen keine Heizungen."),
    ]
    faq_items = "".join(
        f"""<details class="faq reveal">
      <summary>{q}</summary>
      <div class="faq-body"><p>{a}</p></div>
    </details>"""
        for q, a in gmodg_faqs
    )

    body = f"""
<section class="page-hero">
  <div class="container">
    {breadcrumbs(p, [("gmodg-nichtwohngebaeude/", "GModG 2026")])}
    <span class="badge">In Kraft seit 29. Juli 2026 · Stand: August 2026</span>
    <h1>GModG 2026: Das gilt jetzt für Nichtwohngebäude</h1>
    <p class="lead">Das Gebäudemodernisierungsgesetz (GModG) hat das GEG abgelöst – mit
    neuen Pflichten, neuen Fristen und neuen Chancen für Eigentümer und Betreiber von
    Nichtwohngebäuden. Hier ist der Überblick, der auf den Gesetzestext zurückgeht statt
    auf Hörensagen.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Die Fristen</p>
      <h2>Von heute bis 2040: Was wann gilt</h2>
    </div>
    {figure("gmodg-zeitstrahl", "Abb. – GModG-Fristen für Nichtwohngebäude (Auswahl, Stand August 2026)")}
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Die Pflichten</p>
      <h2>Sechs Regelungen, die Sie kennen müssen</h2>
      <p class="lead">Beschlossen von Bundestag und Bundesrat am 10. Juli 2026, verkündet am
      28. Juli 2026 im Bundesgesetzblatt – das GModG setzt zugleich die EU-Gebäuderichtlinie
      (EPBD) um.</p>
    </div>
    <ul class="feature-list">{duty_items}</ul>
  </div>
</section>

<section class="section">
  <div class="container split">
    {figure("gmodg-bio-treppe", "Abb. – Die Bio-Treppe für neue Gas- und Ölheizungen")}
    {figure("gmodg-nullemission", "Abb. – Nullemissionsstandard für Neubauten (öffentlich ab 2028, alle ab 2030)")}
  </div>
  <div class="container illus--pad">
    <div class="photo-band">
      {photo("gebaeudehuelle", p, sizes="(max-width: 700px) calc(100vw - 2.5rem), 360px")}
      {photo("nichtwohngebaeude", p, sizes="(max-width: 700px) calc(100vw - 2.5rem), 360px")}
      {photo("solarpark", p, sizes="(max-width: 700px) calc(100vw - 2.5rem), 360px")}
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Vorher / nachher</p>
      <h2>Was sich gegenüber dem GEG geändert hat</h2>
      <p class="lead">Die wichtigsten Unterschiede zwischen dem alten Gebäudeenergiegesetz
      und dem GModG auf einen Blick – bezogen auf Nichtwohngebäude.</p>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>Gegenüberstellung der Anforderungen von GEG und GModG für Nichtwohngebäude</caption>
        <thead><tr><th scope="col">Thema</th><th scope="col">GEG (bis 2026)</th><th scope="col">GModG (seit 29.07.2026)</th></tr></thead>
        <tbody>
          <tr><td>Neue Heizungen</td><td>65 % erneuerbare Energien vorgeschrieben</td>
              <td>Technologieoffen; Gas und Öl erlaubt, dafür Bio-Treppe 10 % (2029) bis 60 % (2040)</td></tr>
          <tr><td>Bestandsgebäude</td><td>Keine allgemeine Sanierungspflicht</td>
              <td>MEPS: max. 3,5-facher Referenzwert ab 2030, 2,95-facher ab 2033</td></tr>
          <tr><td>Gebäudeautomation</td><td>Pflicht ab 290 kW</td>
              <td>Pflicht ab 70 kW, Nachrüstung bis 31.12.2029</td></tr>
          <tr><td>Energieausweis</td><td>Verbrauchsausweis zulässig</td>
              <td>Ab 1.1.2027 nur noch Bedarfsausweis, neue Effizienzklassen</td></tr>
          <tr><td>Neubau</td><td>Effizienzgebäude-Anforderungen</td>
              <td>Nullemissionsstandard: öffentlich ab 2028, alle ab 2030</td></tr>
          <tr><td>Photovoltaik</td><td>Keine bundesweite Pflicht</td>
              <td>Solarpflicht wird ab 1.1.2027 schrittweise eingeführt</td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note">Stand: August 2026 · Verkündet am 28.07.2026 im Bundesgesetzblatt Nr. 226</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Was heißt das für Sie?</p>
      <h2>Drei Situationen, ein nächster Schritt</h2>
    </div>
    <div class="card-grid card-grid--wide">{audience_cards}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen zum GModG</p>
      <h2>Kurz beantwortet</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
    <div class="notice reveal" style="margin-top:2rem">
      <strong>Transparenzhinweis:</strong> Dieser Überblick fasst das GModG mit Stand
      August 2026 zusammen und ersetzt keine Rechtsberatung – maßgeblich ist der
      Gesetzestext. Offizielle Informationen des Bundes finden Sie im
      <a href="https://www.gmodg.bund.de/" rel="noopener" target="_blank">GModG-Portal&nbsp;↗</a>.
      Was konkret für Ihr Gebäude gilt, prüfen wir individuell im GModG-Check.
    </div>
  </div>
</section>

{cta_band(p, "GModG-Check: Was gilt für Ihr Gebäude?",
          "Im kostenlosen Erstgespräch klären wir, welche Pflichten und Fristen Ihr Gebäude betreffen – und welche Förderung die Umsetzung verbilligt.")}
"""
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "headline": "GModG 2026: Das gilt jetzt für Nichtwohngebäude",
                "datePublished": "2026-08-06",
                "dateModified": "2026-08-06",
                "inLanguage": "de",
                "author": {"@id": ORG_ID},
                "publisher": {"@id": ORG_ID},
                "image": f"{BASE}/assets/img/og-image.png",
                "description": "Überblick über die Pflichten des Gebäudemodernisierungsgesetzes (GModG) für Nichtwohngebäude: MEPS-Sanierungspflicht, Gebäudeautomation, Bedarfsausweis, Nullemissionsstandard, Bio-Treppe und Solarpflicht mit allen Fristen.",
                "mainEntityOfPage": f"{BASE}/gmodg-nichtwohngebaeude/",
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{BASE}/"},
                    {"@type": "ListItem", "position": 2, "name": "GModG 2026", "item": f"{BASE}/gmodg-nichtwohngebaeude/"},
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
                    for q, a in gmodg_faqs
                ],
            },
        ],
    }
    return page(
        "gmodg-nichtwohngebaeude/",
        "GModG 2026: Pflichten für Nichtwohngebäude | GREEN",
        "GModG in Kraft: MEPS-Sanierungspflicht ab 2030, Gebäudeautomation ab 70 kW, Bedarfsausweis 2027. Jetzt prüfen lassen, was für Ihr Gebäude gilt.",
        body,
        active=None,
        schema=schema,
        og_type="article",
        extra_head=f'\n  <meta property="article:published_time" content="{BUILD_DATE}">'
                   f'\n  <meta property="article:modified_time" content="{BUILD_DATE}">',
    )


# ---------------------------------------------------------------------------
# Wissens- und Leistungsseiten (SEO/GEO)
# ---------------------------------------------------------------------------

def render_foerderung():
    p = "../"
    faqs = [
        ("Wie hoch ist die Förderung für eine Energieberatung wirklich?",
         "Der Bund übernimmt 50 % des förderfähigen Beratungshonorars. Der Zuschuss ist allerdings "
         "nach Gebäudegröße gedeckelt: bis 200 m² Nettogrundfläche maximal 850 €, bei 200 bis 500 m² "
         "maximal 2.500 € und ab 500 m² maximal 4.000 €. Die Hälfte des Honorars gibt es also nur "
         "bis zu diesen Obergrenzen – alles darüber tragen Sie selbst."),
        ("Wer ist überhaupt antragsberechtigt?",
         "Antragsberechtigt sind kommunale Gebietskörperschaften und Zweckverbände, gemeinnützige "
         "Organisationen und Religionsgemeinschaften, kleine und mittlere Unternehmen (bis 250 "
         "Beschäftigte und höchstens 50 Mio. € Jahresumsatz) sowie Nicht-KMU mit einem "
         "Gesamtenergieverbrauch von maximal 500.000 kWh pro Jahr. Große Energieverbraucher fallen "
         "damit aus der EBN heraus – für sie ist das Energieaudit nach DIN EN 16247 der richtige Weg."),
        ("Muss der Antrag vor Beauftragung gestellt werden?",
         "Ja. Der Förderantrag muss beim BAFA gestellt und bewilligt sein, bevor die Beratung "
         "beginnt. Wer zuerst beauftragt und dann den Antrag stellt, verliert den Zuschuss. Wir "
         "übernehmen die Antragstellung und stimmen den Projektstart darauf ab."),
        ("Werden auch die Baumaßnahmen selbst gefördert?",
         "Ja, aber über andere Programme – vor allem die Bundesförderung für effiziente Gebäude (BEG) "
         "für Einzelmaßnahmen und Effizienzgebäude, dazu Landes- und Kommunalprogramme sowie "
         "zinsgünstige KfW-Kredite. Welche Kombination für Ihr Vorhaben die höchste Quote ergibt, "
         "prüfen wir im Rahmen der Beratung; die Sätze ändern sich regelmäßig."),
        ("Was kostet die Beratung unter dem Strich?",
         "Das hängt von Größe und Komplexität des Gebäudes ab. Wir nennen Ihnen vor der Beauftragung "
         "einen Festpreis und rechnen offen vor, welcher Zuschuss realistisch übrig bleibt – "
         "inklusive Deckelung. So wissen Sie vorher, was Sie tatsächlich zahlen."),
    ]
    faq_items = "".join(
        f'<details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in faqs
    )
    body = f"""
{page_hero(p, [("foerderung/", "Förderung")], "Fördermittel",
           "Förderung für Energieberatung und Sanierung",
           "Wie viel Zuschuss es wirklich gibt, wer ihn bekommt und worauf Sie achten müssen – "
           "ohne Werbeversprechen, mit den echten Obergrenzen.")}

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Antwort zuerst</p>
      <h2>50 % Zuschuss – aber gedeckelt</h2>
      <p class="lead">Die Bundesförderung für Energieberatung für Nichtwohngebäude, Anlagen und
      Systeme (EBN) übernimmt <strong>50 % des förderfähigen Beratungshonorars</strong>. Der
      Zuschuss ist nach Nettogrundfläche gestaffelt und endet bei maximal 4.000 €.</p>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>Fördersätze und Höchstbeträge der EBN nach Nettogrundfläche</caption>
        <thead><tr><th scope="col">Nettogrundfläche</th><th scope="col">Fördersatz</th><th scope="col">Maximaler Zuschuss</th></tr></thead>
        <tbody>
          <tr><th scope="row">unter 200 m²</th><td>50 %</td><td>850 €</td></tr>
          <tr><th scope="row">200 – 500 m²</th><td>50 %</td><td>2.500 €</td></tr>
          <tr><th scope="row">über 500 m²</th><td>50 %</td><td>4.000 €</td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note">Stand: August 2026 · Quelle: BAFA, Bundesförderung Energieberatung für
    Nichtwohngebäude, Anlagen und Systeme (Modul 2, Energieberatung DIN V 18599)</p>
    <p>Die Abkürzungen EBN, BEG und DIN V 18599 sind im
    <a href="{p}glossar/">Glossar</a> kurz erklärt. Wie sich die Förderung auf Ihr Honorar
    auswirkt, zeigt Ihnen der <a href="{p}einsparrechner/">Einsparrechner</a> als erste
    Näherung.</p>
  </div>
</section>

<section class="section section--surface">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Antragsberechtigt</p>
      <h2>Wer den Zuschuss bekommt</h2>
      <ul class="checklist">
        <li>Kommunale Gebietskörperschaften und Zweckverbände</li>
        <li>Gemeinnützige Organisationen und Religionsgemeinschaften</li>
        <li>Kleine und mittlere Unternehmen – bis 250 Beschäftigte und höchstens 50 Mio. € Jahresumsatz</li>
        <li>Nicht-KMU mit einem Gesamtenergieverbrauch bis 500.000 kWh pro Jahr</li>
      </ul>
      <p>Fällt Ihr Unternehmen nicht darunter, ist die EBN nicht der richtige Weg – dann führt der
      Einstieg meist über das <a href="{p}energieaudit-din-en-16247/">Energieaudit nach DIN EN 16247</a>,
      das für Nicht-KMU ohnehin verpflichtend ist.</p>
    </div>
    {photo("beratung-daten", p, "Vor dem Antrag steht die ehrliche Rechnung: Was bleibt netto übrig?")}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Reihenfolge</p>
      <h2>Erst Antrag, dann Auftrag – nie umgekehrt</h2>
      <p class="lead">Der häufigste und teuerste Fehler: zuerst beauftragen, dann Förderung
      beantragen. Damit ist der Zuschuss verloren. Wir halten die Reihenfolge ein.</p>
    </div>
    {figure("prozess-ablauf", "Abb. – Ablauf mit korrekt eingeordneter Antragstellung")}
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Bundesförderung für effiziente Gebäude</p>
      <h2>Die BEG-Programme für Nichtwohngebäude im Überblick</h2>
      <p class="lead">Die Beratung ist das eine – gefördert wird vor allem das Bauen. Diese
      Programme kommen für Nichtwohngebäude infrage, je nachdem ob Sie sanieren oder neu bauen
      und ob Sie ein Unternehmen oder eine Kommune sind.</p>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>BEG-Programme der KfW für Nichtwohngebäude, Stand August 2026</caption>
        <thead><tr>
          <th scope="col">Programm</th><th scope="col">Wofür</th>
          <th scope="col">Art</th><th scope="col">Höchstbetrag</th>
        </tr></thead>
        <tbody>
          <tr><th scope="row">263 – Nichtwohngebäude-Kredit</th>
              <td>Sanierung zum Effizienzgebäude (Stufen 40 bis 115)</td>
              <td>Kredit mit Tilgungszuschuss 5–25&nbsp;%</td>
              <td>2.000&nbsp;€/m² NGF, max. 10&nbsp;Mio.&nbsp;€</td></tr>
          <tr><th scope="row">264 – Kommunen-Kredit</th>
              <td>Sanierung kommunaler Nichtwohngebäude</td>
              <td>Kredit mit Tilgungszuschuss bis 40&nbsp;%</td>
              <td>max. 10&nbsp;Mio.&nbsp;€</td></tr>
          <tr><th scope="row">464 – Kommunen-Zuschuss</th>
              <td>Sanierung kommunaler Nichtwohngebäude</td>
              <td>direkter Zuschuss</td>
              <td>max. 4&nbsp;Mio.&nbsp;€</td></tr>
          <tr><th scope="row">299 – Klimafreundlicher Neubau</th>
              <td><a href="{p}neubau/">Neubau</a>, Stufen EG&nbsp;55, EG&nbsp;40 und EG&nbsp;40 mit QNG</td>
              <td>zinsverbilligter Kredit</td>
              <td>1.000 bis 2.000&nbsp;€/m², max. 10&nbsp;Mio.&nbsp;€</td></tr>
          <tr><th scope="row">596 – Neubau im Niedrigpreissegment</th>
              <td>energie- <em>und</em> kosteneffizienter Neubau</td>
              <td>zinsverbilligter Kredit</td>
              <td>programmabhängig</td></tr>
          <tr><th scope="row">498/499 – Neubau für Kommunen</th>
              <td>klimafreundlicher kommunaler Neubau</td>
              <td>Zuschuss</td>
              <td>bis 10&nbsp;% der förderfähigen Kosten</td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note" style="color:var(--faint-on-dark)">Quelle: KfW · Bezugsgröße ist die
    Nettogrundfläche · Antrag jeweils vor Vorhabenbeginn</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Wichtig zu wissen</p>
      <h2>Die Förderkurve zeigt nach unten</h2>
      <p class="lead">Wer eine Sanierung ohnehin plant, sollte die zeitliche Entwicklung kennen –
      sie spricht klar für früher statt später.</p>
    </div>
    <ul class="feature-list">
      <li class="feature reveal"><span class="feature-icon">{icon('law')}</span>
        <div><h3>Seit 21. Juli 2026 gelten neue Bedingungen</h3>
        <p>Die Tilgungszuschüsse für Sanierungen zum Effizienzgebäude wurden um zehn Prozentpunkte
        gesenkt. Der Fünf-Prozent-Bonus für die Erneuerbare-Energien-Klasse ist entfallen, ebenso
        Effizienzbonus und Emissionsminderungszuschlag.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('chart')}</span>
        <div><h3>Ab Februar 2027 sinken die Höchstbeträge</h3>
        <p>Die Förderhöchstbeträge werden ab dem 1. Februar 2027 halbjährlich abgeschmolzen –
        gestaffelt nach Gebäudegröße. Für größere Gebäude bedeutet das jedes Halbjahr einen
        kleineren Topf.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('bolt')}</span>
        <div><h3>Heizung: Grundförderung bleibt 30 %</h3>
        <p>Die Grundförderung für die Heizungsmodernisierung liegt weiterhin bei 30&nbsp;%. Ab dem
        ersten Quartal 2027 kommt ein Wertschöpfungsbonus hinzu, der die Herkunft der Anlage
        berücksichtigt.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('tools')}</span>
        <div><h3>Neu: Bonus für serielles Sanieren</h3>
        <p>Im zweiten Halbjahr 2026 wird ein zusätzlicher Bonus für serielle Sanierungen eingeführt –
        interessant für Portfolios mit vielen gleichartigen Gebäuden, etwa im kommunalen Bestand.</p></div></li>
    </ul>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Was noch dazukommt</p>
      <h2>Programme neben der BEG</h2>
    </div>
    <ul class="feature-list">
      <li class="feature reveal"><span class="feature-icon">{icon('kommune')}</span>
        <div><h3>Landes- und Kommunalprogramme</h3>
        <p>Nordrhein-Westfalen und viele Kommunen legen eigene Programme auf, die sich mit
        Bundesmitteln kombinieren lassen. Gerade für kommunale Träger und gemeinnützige
        Organisationen lohnt der Blick – hier bleibt am häufigsten Geld liegen.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('euro')}</span>
        <div><h3>Steuerliche Wege</h3>
        <p>Wo eine Direktförderung nicht greift oder sich nicht rechnet, prüfen wir Abschreibung und
        steuerliche Behandlung als Alternative. Manchmal ist der Steuerweg der bessere.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('doc')}</span>
        <div><h3>Antragstellung inklusive</h3>
        <p>Wir recherchieren die passenden Programme, erstellen die Unterlagen, koordinieren mit
        Ihrer Hausbank und liefern die Nachweise, ohne die kein Tilgungszuschuss ausgezahlt wird.
        Sie unterschreiben, wir kümmern uns um den Rest.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('search')}</span>
        <div><h3>Kombination statt Einzelantrag</h3>
        <p>Der größte Hebel liegt selten in einem Programm, sondern in der richtigen Kombination –
        und in der Reihenfolge, in der beantragt wird. Genau dafür gibt es uns.</p></div></li>
    </ul>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen zur Förderung</p>
      <h2>Klar beantwortet</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
    <div class="notice reveal" style="margin-top:2rem">
      <strong>Hinweis:</strong> Förderprogramme ändern sich laufend. Die hier genannten Werte
      entsprechen dem Stand August 2026; maßgeblich sind die jeweils gültigen Richtlinien des
      Bundesamts für Wirtschaft und Ausfuhrkontrolle. Offizielle Informationen finden Sie unter
      <a href="https://www.bafa.de/" rel="noopener" target="_blank">bafa.de&nbsp;↗</a>.
      Was für Ihr Gebäude gilt, prüfen wir individuell.
    </div>
  </div>
</section>

{cta_band(p, "Wie viel Förderung bleibt für Sie übrig?",
          "Im kostenlosen Erstgespräch rechnen wir Ihnen Honorar, Zuschuss und Eigenanteil offen vor – bevor Sie sich entscheiden.")}
"""
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
                for q, a in faqs]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{BASE}/"},
                {"@type": "ListItem", "position": 2, "name": "Förderung", "item": f"{BASE}/foerderung/"}]},
        ],
    }
    return page(
        "foerderung/",
        "Förderung Energieberatung NWG: 50 % bis 4.000 € | GREEN",
        "50 % des Beratungshonorars, gedeckelt auf 850–4.000 €: Antragsberechtigte, Fristen, BEG. Jetzt Förderanspruch prüfen lassen.",
        body, active=None, schema=schema,
    )


def render_enms():
    p = "../"
    faqs = [
        ("Wer muss ein Energiemanagementsystem einführen?",
         "Nach dem Energieeffizienzgesetz (EnEfG) müssen Unternehmen mit mehr als 7,5 Gigawattstunden "
         "Gesamtenergieverbrauch im Jahr ein Energiemanagementsystem nach ISO 50001 oder ein "
         "Umweltmanagementsystem nach EMAS einrichten. Bereits ab 2,5 Gigawattstunden sind zudem "
         "Umsetzungspläne für wirtschaftliche Effizienzmaßnahmen zu erstellen. Zuständig ist das "
         "Bundesamt für Wirtschaft und Ausfuhrkontrolle."),
        ("Ersetzt ISO 50001 das Energieaudit?",
         "Ja. Die Pflicht zum Energieaudit nach DIN EN 16247 entfällt, solange Sie ein zertifiziertes "
         "System nach ISO 50001 oder EMAS betreiben. Für Unternehmen, die ohnehin alle vier Jahre "
         "auditieren müssen, ist das ein wesentliches Argument: Statt wiederkehrender Momentaufnahmen "
         "entsteht ein laufender Prozess – und die Auditpflicht ist mit erledigt."),
        ("Wie lange dauert die Einführung?",
         "Von der Bestandsaufnahme bis zum Zertifikat vergehen in der Regel sechs bis zwölf Monate. "
         "Wie schnell es geht, hängt vor allem an der Datenlage: Wer bereits eine saubere "
         "Zählerstruktur und dokumentierte Verbräuche hat, ist deutlich schneller. Wo Zähler fehlen, "
         "planen wir die Messkonzeption gleich mit ein."),
        ("Was kostet das – und was bringt es?",
         "Neben unserem Honorar fallen die Gebühren der Zertifizierungsstelle an sowie interner "
         "Aufwand für Datenpflege und Audits. Dem stehen drei Effekte gegenüber: die entfallende "
         "Auditpflicht, die systematisch gehobenen Einsparungen und – je nach Konstellation – "
         "Voraussetzungen für Entlastungen bei Energiesteuern und Umlagen. Was davon für Sie gilt, "
         "prüfen wir vor der Entscheidung."),
        ("Wie lange gilt das Zertifikat?",
         "Das Zertifikat läuft drei Jahre. In dieser Zeit finden jährliche Überwachungsaudits statt, "
         "danach ein Re-Zertifizierungsaudit. Genau dafür braucht das System einen Betreiber im "
         "Unternehmen – und, wenn gewünscht, uns als externe Begleitung im laufenden Betrieb."),
    ]
    faq_items = "".join(
        f'<details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in faqs)

    steps = [
        ("Standortbestimmung", "Verbrauchsdaten sichten, Zählerstruktur prüfen, wesentliche Energieeinsatzbereiche bestimmen. Ergebnis: eine ehrliche Lücke­nliste zum Normanspruch.", "2–4 Wochen"),
        ("Energetische Bewertung", "Energieplanung nach Norm: Ausgangsbasis, Leistungskennzahlen (EnPIs), Einsparpotenziale und messbare Ziele mit Aktionsplänen.", "6–10 Wochen"),
        ("System aufbauen", "Energiepolitik, Rollen und Verantwortlichkeiten, Dokumentation, Betriebssteuerung, Beschaffungs- und Auslegungsvorgaben – so schlank wie die Norm es zulässt.", "8–12 Wochen"),
        ("Internes Audit & Managementbewertung", "Wir auditieren intern, schulen Ihre Beteiligten und bereiten die Managementbewertung vor. Abweichungen werden vor dem Zertifizierer gefunden, nicht von ihm.", "3–4 Wochen"),
        ("Zertifizierungsaudit", "Begleitung durch Stufe 1 und Stufe 2 der externen Zertifizierung, Bearbeitung von Feststellungen bis zur Zertifikatserteilung.", "je nach Stelle"),
        ("Betrieb & Verbesserung", "Kennzahlen fortschreiben, Überwachungsaudits vorbereiten, Maßnahmen nachhalten. Ein System, das nur zur Auditzeit lebt, spart nichts.", "laufend"),
    ]
    step_items = "".join(
        f'<li class="step reveal"><h3>{t}</h3><p>{d}</p><span class="step-duration">{dur}</span></li>'
        for t, d, dur in steps)

    parts = [
        ("law", "Energiepolitik & Verantwortlichkeiten", "Eine unterschriebene Energiepolitik der Leitung, klar zugeschnittene Rollen und ein benanntes Energieteam. Ohne Rückendeckung von oben bleibt jedes System Papier."),
        ("chart", "Energetische Bewertung & Kennzahlen", "Wesentliche Energieeinsatzbereiche bestimmen, Ausgangsbasis festlegen, Leistungskennzahlen (EnPIs) definieren, die Ihr Geschäft abbilden – nicht bloß den Gesamtzähler."),
        ("search", "Messkonzept & Datenerfassung", "Zählerstruktur, Messpunkte und Datenwege so aufbauen, dass Kennzahlen automatisch entstehen statt monatlich zusammengesucht zu werden."),
        ("doc", "Dokumentation & Betriebssteuerung", "Verfahren, Nachweise und Betriebsvorgaben in dem Umfang, den die Norm verlangt – und keinen Absatz mehr."),
        ("check", "Internes Audit & Schulung", "Wir auditieren intern, qualifizieren Ihre Beteiligten und sorgen dafür, dass Kompetenzanforderungen der Norm nachweisbar erfüllt sind."),
        ("handshake", "Begleitung im Zertifizierungsaudit", "Vorbereitung, Teilnahme und Nachbereitung – von Stufe 1 bis zur Zertifikatserteilung und danach bei den Überwachungsaudits."),
    ]
    part_html = "".join(
        f'<li class="feature reveal"><span class="feature-icon">{icon(ic)}</span>'
        f'<div><h3>{t}</h3><p>{d}</p></div></li>' for ic, t, d in parts)

    body = f"""
{page_hero(p, [("energiemanagement-iso-50001/", "ISO 50001")], "Energiemanagement",
           "Energiemanagementsystem nach DIN EN ISO 50001",
           "Von der Standortbestimmung über den Systemaufbau bis zum Zertifikat – und danach "
           "im laufenden Betrieb. Wir begleiten die Einführung so schlank, wie die Norm es "
           "zulässt.")}

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Antwort zuerst</p>
      <h2>Wer muss – und wer sollte</h2>
      <p class="lead">Die Pflicht hängt am Jahresverbrauch. Der Nutzen hängt daran, ob das
      System im Alltag benutzt wird.</p>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>Pflichten nach dem Energieeffizienzgesetz (EnEfG), Stand August 2026</caption>
        <thead><tr><th scope="col">Gesamtenergieverbrauch pro Jahr</th><th scope="col">Was verlangt wird</th></tr></thead>
        <tbody>
          <tr><th scope="row">über 7,5 GWh</th><td>Energiemanagementsystem nach ISO 50001 <em>oder</em> Umweltmanagementsystem nach EMAS</td></tr>
          <tr><th scope="row">ab 2,5 GWh</th><td>Umsetzungspläne für wirtschaftliche Energieeffizienzmaßnahmen</td></tr>
          <tr><th scope="row">Nicht-KMU unabhängig davon</th><td><a href="{p}energieaudit-din-en-16247/">Energieaudit nach DIN EN 16247</a> alle vier Jahre – entfällt bei ISO 50001 oder EMAS</td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note">Zuständig ist das Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA) ·
    Quelle: Energieeffizienzgesetz, Umweltbundesamt</p>
  </div>
</section>

<section class="section section--surface">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Audit oder System?</p>
      <h2>Der Unterschied, der über den Nutzen entscheidet</h2>
      <p>Ein <a href="{p}energieaudit-din-en-16247/">Energieaudit</a> ist eine Momentaufnahme: Alle
      vier Jahre schaut jemand genau hin, schreibt Maßnahmen auf – und häufig verschwindet der
      Bericht in der Ablage. Ein Energiemanagementsystem nach ISO 50001 dreht das um: Es macht die
      Energieleistung zu einer laufend gemessenen Größe mit Zielen, Verantwortlichen und Terminen.</p>
      <p>Für Unternehmen, die ohnehin auditpflichtig sind, ist das die wirtschaftlich interessantere
      Variante. Die Auditpflicht entfällt, der Aufwand verteilt sich über die Jahre statt sich alle
      vier Jahre zu ballen, und die Einsparungen werden systematisch gehoben statt einmalig
      identifiziert.</p>
      <ul class="checklist">
        <li>Auditpflicht nach DIN EN 16247 entfällt bei zertifiziertem System</li>
        <li>Kontinuierliche Verbesserung statt Vier-Jahres-Rhythmus</li>
        <li>Belastbare Kennzahlen für ESG-Berichte, Banken und Kunden</li>
        <li>Je nach Konstellation Voraussetzung für steuerliche Entlastungen</li>
      </ul>
    </div>
    {photo("beratung-daten", p, "Ein Managementsystem lebt von Daten, die ohnehin entstehen.", eager=True)}
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Unsere Begleitung</p>
      <h2>Sechs Schritte bis zum Zertifikat</h2>
      <p class="lead">Sechs bis zwölf Monate von der Bestandsaufnahme bis zur Zertifikatserteilung –
      der Zeitplan hängt vor allem an Ihrer Datenlage.</p>
    </div>
    <ol class="steps">{step_items}</ol>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Was dazugehört</p>
      <h2>Alle Bausteine, die die Norm verlangt</h2>
      <p class="lead">Wir bauen das System so schlank wie möglich – aber vollständig. Jeder
      Baustein hat einen Zweck, sonst wäre er nicht dabei.</p>
    </div>
    <ul class="feature-list">{part_html}</ul>
    {figure("energieaudit-din-16247", "Abb. – Normkonforme Prüfung und Nachweisführung", "illus--pad")}
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen zu ISO 50001</p>
      <h2>Kurz beantwortet</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
    <div class="notice reveal" style="margin-top:2rem">
      <strong>Hinweis:</strong> Ob und ab wann die Pflicht für Ihr Unternehmen greift, hängt von
      Verbrauch, Unternehmensstruktur und Beteiligungsverhältnissen ab. Wir klären das im
      kostenlosen Erstgespräch – bevor Sie in ein Projekt einsteigen, das Sie vielleicht gar
      nicht brauchen.
    </div>
  </div>
</section>

{cta_band(p, "Pflicht klären, System planen.",
          "Im kostenlosen Erstgespräch prüfen wir Ihre Verbrauchsschwelle, den Aufwand und ob ISO 50001 oder das Energieaudit für Sie der bessere Weg ist.")}
"""
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": "Einführung eines Energiemanagementsystems nach DIN EN ISO 50001",
         "serviceType": "Energiemanagement", "url": f"{BASE}/energiemanagement-iso-50001/",
         "provider": {"@id": ORG_ID}, "areaServed": {"@type": "State", "name": "Nordrhein-Westfalen"}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
            for q, a in faqs]},
    ]}
    return page(
        "energiemanagement-iso-50001/",
        "Energiemanagement ISO 50001: Einführung & Zertifizierung | GREEN",
        "DIN EN ISO 50001 einführen: Pflicht ab 7,5 GWh, Auditpflicht entfällt, Zertifikat in 6–12 Monaten. Wir begleiten von der Analyse bis zum Audit. Jetzt Pflicht klären.",
        body, active=None, schema=schema,
    )


def render_neubau():
    p = "../"
    faqs = [
        ("Was ist das QNG und wann brauchen wir es?",
         "Das Qualitätssiegel Nachhaltiges Gebäude (QNG) ist ein staatliches Siegel des Bundes, das die "
         "Nachhaltigkeit eines Gebäudes über den gesamten Lebenszyklus bewertet – ökologisch, "
         "soziokulturell und ökonomisch. Es wird in den Stufen PLUS und PREMIUM vergeben und gilt seit "
         "März 2023 für alle Nichtwohngebäude. Gebraucht wird es, wenn Sie die höchste Förderstufe im "
         "Programm Klimafreundlicher Neubau erreichen wollen: Ohne QNG endet der Förderkredit bei "
         "1.500 € je Quadratmeter, mit QNG sind es 2.000 €."),
        ("Was kostet ein QNG-Nachweis und lohnt er sich?",
         "Der Nachweis verursacht zusätzlichen Planungs- und Dokumentationsaufwand, unter anderem für "
         "die Ökobilanzierung und den Nachweis der Schadstofffreiheit. Ob er sich rechnet, hängt an der "
         "Gebäudegröße: Die höhere Kreditlinie und der Imagegewinn müssen den Mehraufwand tragen. Bei "
         "größeren Vorhaben geht die Rechnung meist klar auf. Wir prüfen das vor der Planungsentscheidung "
         "durch – nicht danach."),
        ("Ab wann gilt der Nullemissionsstandard?",
         "Nach dem Gebäudemodernisierungsgesetz müssen Neubauten der öffentlichen Hand ab dem "
         "1. Januar 2028 und alle übrigen Neubauten ab dem 1. Januar 2030 als Nullemissionsgebäude "
         "errichtet werden – am Standort also ohne CO₂-Emissionen aus fossilen Brennstoffen. Wer heute "
         "plant und 2029 oder später fertigstellt, sollte den Standard bereits mitdenken."),
        ("Wann muss der Förderantrag gestellt werden?",
         "Vor Beginn der Bauarbeiten vor Ort. Das ist die häufigste und teuerste Falle im Neubau: Wer "
         "erst den Bauauftrag vergibt und dann die Förderung beantragt, verliert sie. Wir binden die "
         "Antragstellung deshalb fest in den Terminplan ein."),
        ("Begleiten Sie auch die Ausführung?",
         "Ja. Zur Förderung gehört die Baubegleitung durch einen Energieeffizienz-Experten – von der "
         "Planungsprüfung über Baustellenkontrollen bis zur Bestätigung nach Durchführung. Ohne diese "
         "Nachweise wird der Tilgungszuschuss nicht ausgezahlt."),
    ]
    faq_items = "".join(
        f'<details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in faqs)

    steps = [
        ("Zieldefinition", "Welche Effizienzstufe, welches Förderprogramm, QNG ja oder nein? Diese Entscheidung fällt vor dem ersten Strich, nicht nach der Genehmigungsplanung.", "vor Planungsbeginn"),
        ("Planungsbegleitung", "Wir rechnen die Bilanz nach DIN V 18599 mit, prüfen Varianten der Anlagentechnik und halten die Förderkriterien in der Planung nach.", "Leistungsphase 1–4"),
        ("Förderantrag", "Antrag über Ihre Hausbank an die KfW, vollständig mit unserer Bestätigung zum Antrag – rechtzeitig vor Baubeginn.", "vor Baubeginn"),
        ("Baubegleitung & Nachweis", "Baustellenkontrollen, Prüfung der Ausführung und die Bestätigung nach Durchführung, ohne die kein Tilgungszuschuss fließt.", "bis Abnahme"),
    ]
    step_items = "".join(
        f'<li class="step reveal"><h3>{t}</h3><p>{d}</p><span class="step-duration">{dur}</span></li>'
        for t, d, dur in steps)

    body = f"""
{page_hero(p, [("neubau/", "Neubau")], "Neubaubegleitung",
           "Neubau: Effizienzstandard, QNG und Förderung von Anfang an",
           "Im Neubau entscheidet sich der Energieverbrauch der nächsten fünfzig Jahre in den "
           "ersten Wochen der Planung. Und die Förderung entscheidet sich noch früher – vor dem "
           "ersten Spatenstich.")}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Warum so früh?</p>
      <h2>Die teuersten Fehler passieren vor dem Bauantrag</h2>
      <p>Ein Neubau, der die Förderstufe knapp verfehlt, kostet nicht ein paar Prozent – er kostet
      den kompletten Zuschuss. Und ein Gebäude, das 2029 fertig wird, aber ohne den kommenden
      <a href="{p}gmodg-nichtwohngebaeude/">Nullemissionsstandard</a> geplant wurde, ist bei
      Fertigstellung bereits veraltet.</p>
      <p>Deshalb setzen wir am Anfang an: Bevor die Kubatur steht, klären wir, welche
      Effizienzstufe wirtschaftlich erreichbar ist, ob sich das QNG rechnet und welches
      Förderprogramm dazu passt. Danach begleiten wir die Planung mit der Bilanz nach
      DIN V 18599, stellen den Antrag rechtzeitig und führen die Baubegleitung bis zur
      Bestätigung nach Durchführung.</p>
      <a class="btn btn--primary" href="{p}beratungstermin/">Neubau besprechen {icon('arrow')}</a>
    </div>
    {photo("gebaeudehuelle", p, "Effizienz entsteht in der Planung – später wird sie teuer.", eager=True)}
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Klimafreundlicher Neubau (KFN)</p>
      <h2>Was der Bund für Neubauten bereitstellt</h2>
      <p class="lead">Gefördert wird als zinsverbilligter Kredit über die KfW, Programm 299 für
      Nichtwohngebäude. Die Höhe hängt an der erreichten Stufe – und an einem Siegel.</p>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>KfW-Programm 299 „Klimafreundlicher Neubau – Nichtwohngebäude", Stand August 2026</caption>
        <thead><tr><th scope="col">Förderstufe</th><th scope="col">Höchstbetrag je m²</th><th scope="col">Höchstbetrag gesamt</th></tr></thead>
        <tbody>
          <tr><th scope="row">Effizienzgebäude&nbsp;55 (nicht mit Öl oder Gas beheizt)</th><td>1.000&nbsp;€</td><td>5&nbsp;Mio.&nbsp;€</td></tr>
          <tr><th scope="row">Klimafreundliches Nichtwohngebäude (EG&nbsp;40)</th><td>1.500&nbsp;€</td><td>7,5&nbsp;Mio.&nbsp;€</td></tr>
          <tr><th scope="row">Klimafreundliches Nichtwohngebäude <strong>mit QNG</strong></th><td><strong>2.000&nbsp;€</strong></td><td><strong>10&nbsp;Mio.&nbsp;€</strong></td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note">Bezugsgröße ist die Nettogrundfläche · Antrag zwingend vor Baubeginn ·
    Quelle: KfW, Programm 299</p>
    <div class="notice reveal" style="margin-top:1.6rem">
      <strong>Die Stufe EG&nbsp;55 ist befristet.</strong> Sie wurde zusätzlich eingeführt und gilt
      nach aktuellem Stand für Anträge bis zum 31.&nbsp;Dezember 2026. Wer diese Stufe nutzen will,
      sollte den Antrag entsprechend terminieren – wir behalten die Frist im Projektplan.
    </div>
  </div>
</section>

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">QNG</p>
      <h2>Das Qualitätssiegel Nachhaltiges Gebäude</h2>
      <p>Das QNG ist ein staatliches Siegel und geht deutlich über Energieeffizienz hinaus: Bewertet
      werden der gesamte Lebenszyklus des Gebäudes, die Ökobilanz der eingesetzten Baustoffe, die
      Schadstofffreiheit, die Barrierefreiheit und die Wirtschaftlichkeit. Vergeben wird es in den
      Stufen <strong>PLUS</strong> und <strong>PREMIUM</strong>; seit März 2023 gilt es für alle
      Arten von Nichtwohngebäuden.</p>
      <p>Für die Förderung ist es der Hebel auf die höchste Stufe – aus 1.500&nbsp;€ je Quadratmeter
      werden 2.000&nbsp;€. Aber es ist mehr als ein Förderticket: Ein QNG-zertifiziertes Gebäude
      lässt sich gegenüber Mietern, Banken und im ESG-Reporting belegen, nicht nur behaupten.</p>
      <ul class="checklist">
        <li>Ökobilanz über den Lebenszyklus (Treibhausgase, Primärenergie)</li>
        <li>Nachweis der Schadstofffreiheit verwendeter Baustoffe</li>
        <li>Anforderungen an Barrierefreiheit und Nutzungsqualität</li>
        <li>Wirtschaftlichkeit und Rückbaufähigkeit</li>
        <li>Vergabe durch akkreditierte Zertifizierungsstellen</li>
      </ul>
    </div>
    {photo("nichtwohngebaeude", p, "QNG bewertet das Gebäude über seinen ganzen Lebenszyklus.")}
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Unsere Leistung</p>
      <h2>Vier Schritte, in der richtigen Reihenfolge</h2>
      <p class="lead">Die Reihenfolge ist keine Formalie: Wer sie umdreht, verliert die Förderung.</p>
    </div>
    <ol class="steps">{step_items}</ol>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen zum Neubau</p>
      <h2>Kurz beantwortet</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
    <div class="notice reveal" style="margin-top:2rem">
      <strong>Hinweis:</strong> Förderprogramme ändern sich laufend. Die genannten Werte entsprechen
      dem Stand August 2026; maßgeblich sind die jeweils gültigen Programmbedingungen der KfW.
      Einen Überblick über alle Programme finden Sie unter
      <a href="{p}foerderung/">Förderung</a>.
    </div>
  </div>
</section>

{cta_band(p, "Neubau geplant? Sprechen wir vor dem Bauantrag.",
          "Im kostenlosen Erstgespräch klären wir Effizienzstufe, QNG-Frage und Förderweg – solange sich alles noch günstig entscheiden lässt.")}
"""
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": "Neubaubegleitung für Nichtwohngebäude mit QNG und KFN-Förderung",
         "serviceType": "Neubaubegleitung", "url": f"{BASE}/neubau/",
         "provider": {"@id": ORG_ID}, "areaServed": {"@type": "State", "name": "Nordrhein-Westfalen"}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
            for q, a in faqs]},
    ]}
    return page(
        "neubau/",
        "Neubau: QNG, Effizienzstufe & KFN-Förderung | GREEN",
        "Neubau von Nichtwohngebäuden: Effizienzstufe festlegen, QNG-Siegel prüfen, KFN-Förderung bis 2.000 €/m² sichern. Jetzt vor dem Bauantrag beraten lassen.",
        body, active=None, schema=schema,
    )


def render_sanierungspflicht():
    p = "../"
    faqs = [
        ("Gibt es jetzt eine Sanierungspflicht für Nichtwohngebäude?",
         "Ja. Mit dem Gebäudemodernisierungsgesetz gelten erstmals Mindesteffizienz-Standards (MEPS) "
         "für bestehende Nichtwohngebäude. Der Primärenergiebedarf darf ab dem 1. Januar 2030 "
         "höchstens das 3,5-Fache und ab dem 1. Januar 2033 höchstens das 2,95-Fache des Wertes eines "
         "Referenzgebäudes betragen. Betroffen sind zuerst die energetisch schlechtesten Gebäude – "
         "nach EU-Vorgabe die schwächsten 16 Prozent bis 2030 und 26 Prozent bis 2033."),
        ("Woher weiß ich, ob mein Gebäude betroffen ist?",
         "Das lässt sich nicht am Baujahr ablesen, sondern nur über eine energetische Bilanzierung. "
         "Entscheidend ist der Abstand Ihres Primärenergiebedarfs zum Referenzgebäudewert. Genau das "
         "rechnen wir im GModG-Check aus: Wir bilanzieren nach DIN V 18599, bestimmen den Abstand zur "
         "jeweiligen Schwelle und sagen Ihnen, ob und wann Handlungsbedarf besteht."),
        ("Was passiert, wenn wir die Frist reißen?",
         "Die MEPS sind ordnungsrechtliche Anforderungen, keine Empfehlung. Neben möglichen "
         "behördlichen Maßnahmen trifft Sie der wirtschaftliche Schaden meist früher: Wer erst kurz "
         "vor der Frist saniert, konkurriert mit allen anderen um dieselben Handwerker, zahlt höhere "
         "Preise und findet die Förderprogramme in schlechteren Konditionen vor – die Zuschüsse sind "
         "bereits im Juli 2026 gesenkt worden."),
        ("Welche weiteren Pflichten kommen neben MEPS?",
         "Für Nichtwohngebäude mit Lüftungs- oder Klimaanlagen über 70 kW Nennleistung gilt die "
         "Pflicht zur Gebäudeautomation bis zum 31. Dezember 2029. Ab dem 1. Januar 2027 sind zudem "
         "Verbrauchsausweise nicht mehr zulässig – erforderlich ist dann der Bedarfsausweis. Und die "
         "Solarpflicht wird ab 2027 schrittweise eingeführt."),
        ("Lohnt es sich, früher zu sanieren als nötig?",
         "In aller Regel ja, aus drei Gründen: Die Förderquoten sinken planmäßig weiter, der CO₂-Preis "
         "auf fossile Wärme steigt jedes Jahr, und Sie können die Maßnahmen in Ihren normalen "
         "Instandhaltungszyklus legen statt in einen Zwangstermin. Sanieren, wenn ohnehin das Dach "
         "fällig ist, kostet einen Bruchteil einer isolierten Pflichtmaßnahme."),
    ]
    faq_items = "".join(
        f'<details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in faqs)

    help_items = [
        ("search", "Betroffenheit klären", "Wir bilanzieren Ihr Gebäude nach DIN V 18599 und bestimmen den Abstand zum Referenzgebäudewert. Ergebnis: eine belastbare Aussage, ob die Schwellen 2030 und 2033 überschritten werden – und um wie viel."),
        ("chart", "Sanierungsfahrplan bis zur Frist", "Aus dem Abstand zur Schwelle entwickeln wir eine Maßnahmenfolge mit Terminen: Was muss bis 2030 stehen, was kann bis 2033 warten, was passt in den ohnehin geplanten Instandhaltungszyklus?"),
        ("euro", "Förderung sichern, solange sie hoch ist", "Die Zuschüsse wurden im Juli 2026 bereits um zehn Prozentpunkte gesenkt und die Höchstbeträge sinken ab Februar 2027 halbjährlich weiter. Wer früh beantragt, bekommt mehr."),
        ("tools", "Umsetzung begleiten", "Ausschreibung, Angebotsprüfung, Baubegleitung und die Nachweise, die für den Tilgungszuschuss verlangt werden – damit die Sanierung auch fördertechnisch aufgeht."),
        ("doc", "Nachweise und Dokumentation", "Bedarfsausweis, GModG-Nachweise und die Unterlagen, die Behörden, Banken und ESG-Berichte verlangen. Aus der Pflichterfüllung wird ein verwertbarer Datensatz."),
        ("law", "Fristen im Blick behalten", "MEPS 2030 und 2033, Gebäudeautomation bis Ende 2029, Bedarfsausweis ab 2027: Wir führen diese Termine für Ihren Bestand nach, statt sie Ihnen zu überlassen."),
    ]
    help_html = "".join(
        f'<li class="feature reveal"><span class="feature-icon">{icon(ic)}</span>'
        f'<div><h3>{t}</h3><p>{d}</p></div></li>' for ic, t, d in help_items)

    body = f"""
{page_hero(p, [("sanierungspflicht-nichtwohngebaeude/", "Sanierungspflicht")], "GModG · MEPS",
           "Sanierungspflicht für Nichtwohngebäude",
           "Seit dem GModG gibt es sie: verbindliche Mindeststandards für den Bestand, mit "
           "Fristen 2030 und 2033. Wir klären, ob Ihr Gebäude betroffen ist – und was das "
           "konkret bedeutet.")}

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Antwort zuerst</p>
      <h2>Zwei Termine, eine Kennzahl</h2>
      <p class="lead">Ob Sie betroffen sind, entscheidet sich am Verhältnis Ihres
      Primärenergiebedarfs zum Referenzgebäudewert – nicht am Baujahr.</p>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>Mindesteffizienz-Standards (MEPS) für bestehende Nichtwohngebäude nach GModG</caption>
        <thead><tr><th scope="col">Ab</th><th scope="col">Höchstwert Primärenergiebedarf</th><th scope="col">Betroffener Gebäudebestand</th></tr></thead>
        <tbody>
          <tr><th scope="row">1. Januar 2030</th><td>max. das 3,5-Fache des Referenzgebäudewerts</td><td>die energetisch schwächsten rund 16&nbsp;%</td></tr>
          <tr><th scope="row">1. Januar 2033</th><td>max. das 2,95-Fache des Referenzgebäudewerts</td><td>die energetisch schwächsten rund 26&nbsp;%</td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note">Stand: August 2026 · Grundlage: Gebäudemodernisierungsgesetz, Umsetzung der
    EU-Gebäuderichtlinie (EPBD) · <a href="{p}gmodg-nichtwohngebaeude/">alle GModG-Pflichten im Überblick</a></p>
  </div>
</section>

<section class="section section--surface">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Die Rechnung dahinter</p>
      <h2>Warum Warten die teuerste Variante ist</h2>
      <p>Die Frist 2030 klingt weit weg. Aus Sicht eines Gebäudes ist sie es nicht: Zwischen erster
      Analyse, Planung, Förderantrag, Ausschreibung und Ausführung liegen bei größeren Maßnahmen
      leicht zwei bis drei Jahre. Wer 2029 anfängt, ist zu spät.</p>
      <p>Dazu kommt die Förderkurve, die in die falsche Richtung zeigt. Die Tilgungszuschüsse für
      Sanierungen zu Effizienzgebäuden wurden zum 21. Juli 2026 um zehn Prozentpunkte gesenkt, der
      Bonus für die Erneuerbare-Energien-Klasse ist entfallen, und ab dem 1. Februar 2027 sinken die
      Höchstbeträge halbjährlich weiter. Jedes Jahr Abwarten kostet also doppelt: über die
      Energierechnung und über die entgangene Förderung.</p>
      <a class="btn btn--primary" href="{p}beratungstermin/">Betroffenheit prüfen lassen {icon('arrow')}</a>
    </div>
    <div class="reveal reveal-d1">
      {figure("sanierungsfahrplan", "Abb. – Sanierungsfahrplan: Maßnahmen in sinnvoller Reihenfolge bis zur Frist")}
    </div>
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Wie wir helfen</p>
      <h2>Von der Pflicht zum Plan</h2>
      <p class="lead">Eine Sanierungspflicht ist zuerst eine Rechenaufgabe und erst danach eine
      Baustelle. Wir bearbeiten beides.</p>
    </div>
    <ul class="feature-list">{help_html}</ul>
  </div>
</section>

<section class="section section--tight">
  <div class="container">
    <div class="callout reveal">
      <div>
        <span class="badge">GModG-Check</span>
        <h2>Erst rechnen, dann entscheiden.</h2>
        <p>Im GModG-Check bilanzieren wir Ihr Gebäude, bestimmen den Abstand zu den Schwellen 2030
        und 2033 und legen die Maßnahmen fest, die Sie darüber bringen – mit Kosten, Einsparung,
        Förderung und Termin. Das Erstgespräch dazu ist kostenlos.</p>
        <div class="hero-ctas" style="margin-bottom:0">
          <a class="btn btn--light" href="{p}beratungstermin/">{icon('calendar')} GModG-Check anfragen</a>
          <a class="btn btn--ghost-light" href="{p}foerderung/">Förderung ansehen</a>
        </div>
      </div>
      <div class="big-number">2030<small>erste verbindliche Frist im Bestand</small></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen zur Sanierungspflicht</p>
      <h2>Kurz beantwortet</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
    <div class="notice reveal" style="margin-top:2rem">
      <strong>Transparenzhinweis:</strong> Diese Darstellung fasst den Stand August 2026 zusammen und
      ersetzt keine Rechtsberatung – maßgeblich ist der Gesetzestext. Amtliche Informationen finden
      Sie im <a href="https://www.gmodg.bund.de/" rel="noopener" target="_blank">GModG-Portal des Bundes&nbsp;↗</a>.
    </div>
  </div>
</section>

{cta_band(p, "Ist Ihr Gebäude betroffen?",
          "Wir rechnen es aus, statt zu schätzen – im kostenlosen Erstgespräch klären wir Ausgangslage, Frist und Förderweg.")}
"""
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": "GModG-Check: Prüfung der Sanierungspflicht für Nichtwohngebäude",
         "serviceType": "Energieberatung", "url": f"{BASE}/sanierungspflicht-nichtwohngebaeude/",
         "provider": {"@id": ORG_ID}, "areaServed": {"@type": "State", "name": "Nordrhein-Westfalen"}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
            for q, a in faqs]},
    ]}
    return page(
        "sanierungspflicht-nichtwohngebaeude/",
        "Sanierungspflicht Nichtwohngebäude: MEPS 2030 & 2033 | GREEN",
        "GModG-Sanierungspflicht: Primärenergiebedarf max. 3,5-fach ab 2030, 2,95-fach ab 2033. Wir prüfen die Betroffenheit Ihres Gebäudes – jetzt GModG-Check anfragen.",
        body, active=None, schema=schema,
    )


def render_energieausweis():
    p = "../"
    faqs = [
        ("Brauchen wir einen Bedarfs- oder einen Verbrauchsausweis?",
         "Für Nichtwohngebäude ist die Frage seit dem GModG entschieden: Ab dem 1. Januar 2027 sind "
         "Verbrauchsausweise für Nichtwohngebäude nicht mehr zulässig. Energieausweise müssen dann "
         "auf einer energetischen Bilanzierung beruhen – also als Bedarfsausweis erstellt werden."),
        ("Wann brauche ich überhaupt einen Energieausweis?",
         "Immer bei Verkauf, Neuvermietung oder Verpachtung – der Ausweis muss Interessenten "
         "unaufgefordert vorgelegt werden. Bei Gebäuden mit starkem Publikumsverkehr besteht "
         "zusätzlich eine Aushangpflicht. Auch für Neubau und größere Sanierungen sind Nachweise nötig."),
        ("Wie lange ist ein Energieausweis gültig?",
         "Zehn Jahre ab Ausstellung. Wird das Gebäude zwischenzeitlich wesentlich saniert, lohnt "
         "sich eine Neuausstellung meist früher – die bessere Effizienzklasse wirkt direkt auf "
         "Miete, Verkaufspreis und Finanzierungskonditionen."),
        ("Was kostet ein Bedarfsausweis für ein Nichtwohngebäude?",
         "Deutlich mehr als bei einem Wohnhaus, weil die Bilanzierung nach DIN V 18599 Gebäudehülle, "
         "Anlagentechnik, Zonierung und Nutzungsprofile abbildet. Der Aufwand hängt von Größe und "
         "Zonenvielfalt ab. Sinnvoll ist, den Ausweis gleich mit einer Energieberatung zu verbinden: "
         "Die Datenaufnahme fällt dann nur einmal an."),
    ]
    faq_items = "".join(
        f'<details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in faqs)
    body = f"""
{page_hero(p, [("energieausweis-nichtwohngebaeude/", "Energieausweis")], "Leistung",
           "Energieausweis für Nichtwohngebäude",
           "Ab 2027 gilt für Nichtwohngebäude der Bedarfsausweis – Verbrauchsausweise sind dann "
           "nicht mehr zulässig. Wir erstellen die Bilanzierung nach DIN V 18599.")}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Das Wichtigste zuerst</p>
      <h2>Der Verbrauchsausweis läuft aus</h2>
      <p>Bislang konnten viele Nichtwohngebäude ihren Energieausweis auf Basis der reinen
      Verbrauchsdaten erstellen lassen – schnell und günstig, aber wenig aussagekräftig, weil das
      Nutzerverhalten das Ergebnis dominiert.</p>
      <p>Mit dem Gebäudemodernisierungsgesetz ist damit Schluss: <strong>Ab dem 1. Januar 2027 sind
      Verbrauchsausweise für Nichtwohngebäude nicht mehr zulässig.</strong> Erforderlich ist dann
      eine energetische Bilanzierung – der Bedarfsausweis. Neu sind außerdem Effizienzklassen auf
      Basis des Primärenergiereferenzfaktors.</p>
      <p>Das ist mehr Aufwand, aber auch mehr wert: Ein Bedarfsausweis zeigt, wo das Gebäude
      Energie verliert – und ist damit die halbe Sanierungsplanung.</p>
      <a class="btn btn--primary" href="{p}beratungstermin/">Ausweis anfragen {icon('arrow')}</a>
    </div>
    {photo("gebaeudehuelle", p, "Der Bedarfsausweis bewertet die Gebäudehülle, nicht das Nutzerverhalten.")}
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Unterschied</p>
      <h2>Bedarfsausweis und Verbrauchsausweis im Vergleich</h2>
    </div>
    <div class="table-wrap reveal">
      <table class="data-table">
        <caption>Bedarfsausweis und Verbrauchsausweis im Vergleich</caption>
        <thead><tr><th scope="col">Kriterium</th><th scope="col">Bedarfsausweis</th><th scope="col">Verbrauchsausweis</th></tr></thead>
        <tbody>
          <tr><td>Grundlage</td><td>Berechnete Bilanz nach DIN V 18599</td><td>Abrechnungen der letzten Jahre</td></tr>
          <tr><td>Einfluss der Nutzung</td><td>Neutralisiert – normierte Randbedingungen</td><td>Hoch – Ergebnis schwankt mit dem Verhalten</td></tr>
          <tr><td>Aussage zur Substanz</td><td>Zeigt Schwachstellen von Hülle und Technik</td><td>Zeigt nur die Summe</td></tr>
          <tr><td>Aufwand</td><td>Höher – Aufnahme von Gebäude und Anlagen</td><td>Gering</td></tr>
          <tr><td>Für Nichtwohngebäude ab 2027</td><td>Pflicht</td><td>Nicht mehr zulässig</td></tr>
        </tbody>
      </table>
    </div>
    <p class="mono-note">Stand: August 2026 · Grundlage: Gebäudemodernisierungsgesetz (GModG)</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen</p>
      <h2>Energieausweis kurz erklärt</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
  </div>
</section>

{cta_band(p, "Energieausweis nach neuem Recht?",
          "Wir erstellen die Bilanzierung nach DIN V 18599 – und sagen Ihnen gleich, welche Maßnahmen die Effizienzklasse am günstigsten verbessern.")}
"""
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": "Energieausweis für Nichtwohngebäude (Bedarfsausweis nach DIN V 18599)",
         "serviceType": "Energieausweis", "url": f"{BASE}/energieausweis-nichtwohngebaeude/",
         "provider": {"@id": f"{BASE}/#organization"}, "areaServed": {"@type": "State", "name": "Nordrhein-Westfalen"}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in faqs]},
    ]}
    return page(
        "energieausweis-nichtwohngebaeude/",
        "Energieausweis Nichtwohngebäude: Bedarfsausweis | GREEN",
        "Ab 1.1.2027 sind Verbrauchsausweise für Nichtwohngebäude unzulässig. Wir erstellen den Bedarfsausweis nach DIN V 18599 – mit Effizienzklasse und Maßnahmenempfehlung.",
        body, active=None, schema=schema,
    )


def render_energieaudit():
    p = "../"
    faqs = [
        ("Wer muss ein Energieaudit durchführen?",
         "Unternehmen, die kein kleines oder mittleres Unternehmen (KMU) sind, müssen regelmäßig "
         "ein Energieaudit nach DIN EN 16247-1 durchführen – alle vier Jahre. Alternativ können sie "
         "ein zertifiziertes Energiemanagementsystem nach ISO 50001 oder ein Umweltmanagementsystem "
         "nach EMAS betreiben."),
        ("Was passiert, wenn wir die Frist versäumen?",
         "Das Energieaudit ist eine gesetzliche Pflicht; Verstöße können als Ordnungswidrigkeit "
         "geahndet werden, und die zuständige Behörde kann Nachweise anfordern. Wirtschaftlich "
         "wiegt aber oft schwerer, dass ohne Audit die profitabelsten Effizienzmaßnahmen schlicht "
         "unentdeckt bleiben."),
        ("Wie läuft ein Energieaudit ab?",
         "Wir erfassen zunächst alle Energieträger und Verbräuche des Unternehmens, analysieren die "
         "wesentlichen Verbraucher vor Ort, bilden Energieflüsse und Kennzahlen und bewerten "
         "Einsparmaßnahmen wirtschaftlich. Ergebnis ist ein normkonformer Auditbericht mit "
         "priorisierten, durchgerechneten Maßnahmen."),
        ("Ist ein Energieaudit dasselbe wie eine Energieberatung?",
         "Nein. Das Audit betrachtet das gesamte Unternehmen inklusive Produktion, Fuhrpark und "
         "Prozessen und erfüllt eine gesetzliche Pflicht. Die geförderte Energieberatung nach "
         "DIN V 18599 betrachtet ein konkretes Gebäude und mündet in einen Sanierungsfahrplan. "
         "Häufig ergänzen sich beide – wir sagen Ihnen, was in Ihrem Fall der richtige Einstieg ist."),
    ]
    faq_items = "".join(
        f'<details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in faqs)
    body = f"""
{page_hero(p, [("energieaudit-din-en-16247/", "Energieaudit")], "Leistung",
           "Energieaudit nach DIN EN 16247",
           "Pflicht für Nicht-KMU – und die beste Gelegenheit, die profitabelsten "
           "Effizienzmaßnahmen im Unternehmen schwarz auf weiß zu bekommen.")}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Antwort zuerst</p>
      <h2>Aus der Pflicht einen Fahrplan machen</h2>
      <p>Unternehmen, die kein KMU sind, müssen alle vier Jahre ein Energieaudit nach
      DIN EN 16247-1 vorlegen – oder ein Energiemanagementsystem nach ISO 50001 betreiben.
      Viele erledigen das als Formsache. Das ist teuer bezahlt, denn ein gutes Audit liefert
      genau die Zahlen, mit denen sich Investitionen intern durchsetzen lassen.</p>
      <p>Wir führen das Audit normkonform durch – und legen den Schwerpunkt bewusst dorthin,
      wo bei Ihnen wirklich Geld liegt: Druckluft, Prozesswärme, Abwärme, Kälte, Lüftung und
      Beleuchtung. Jede Maßnahme kommt mit Investition, Einsparung und Amortisationszeit.</p>
      <a class="btn btn--primary" href="{p}beratungstermin/">Audit anfragen {icon('arrow')}</a>
    </div>
    {photo("produktion-anlage", p, "Im Audit zählt, wo die Energie tatsächlich verbraucht wird.")}
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Ablauf</p>
      <h2>Vier Schritte zum normkonformen Auditbericht</h2>
    </div>
    <ol class="steps">
      <li class="step reveal"><h3>Datenaufnahme</h3><p>Alle Energieträger, Verbrauchsdaten und
      Zählerstrukturen der letzten Jahre – die Basis jeder belastbaren Bilanz.</p>
      <span class="step-duration">Vorbereitung</span></li>
      <li class="step reveal"><h3>Vor-Ort-Analyse</h3><p>Begehung der wesentlichen Verbraucher,
      Messungen wo nötig, Gespräche mit Technik und Betrieb.</p>
      <span class="step-duration">1–2 Tage</span></li>
      <li class="step reveal"><h3>Bewertung</h3><p>Energieflüsse, Kennzahlen und
      Einsparmaßnahmen – jede mit Kosten, Ersparnis und Amortisationszeit.</p>
      <span class="step-duration">Auswertung</span></li>
      <li class="step reveal"><h3>Bericht &amp; Nachweis</h3><p>Normkonformer Auditbericht,
      Managementzusammenfassung und die Unterlagen, die die Behörde sehen will.</p>
      <span class="step-duration">Abschluss</span></li>
    </ol>
    {figure("energieaudit-din-16247", "Abb. – Energieaudit nach DIN EN 16247", "illus--pad")}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufige Fragen</p>
      <h2>Energieaudit kurz erklärt</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
    <div class="notice reveal" style="margin-top:2rem">
      <strong>Hinweis:</strong> Ob und in welchem Turnus die Auditpflicht für Ihr Unternehmen gilt,
      hängt von Unternehmensgröße, Beteiligungsstrukturen und Energieverbrauch ab. Wir prüfen das
      im Erstgespräch – kostenlos und bevor Sie sich festlegen.
    </div>
  </div>
</section>

{cta_band(p, "Auditpflicht geklärt in einem Gespräch",
          "Wir sagen Ihnen, ob Sie auditpflichtig sind, was das kostet und welche Maßnahmen sich am schnellsten rechnen.")}
"""
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": "Energieaudit nach DIN EN 16247", "serviceType": "Energieaudit",
         "url": f"{BASE}/energieaudit-din-en-16247/", "provider": {"@id": f"{BASE}/#organization"},
         "areaServed": {"@type": "State", "name": "Nordrhein-Westfalen"}},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in faqs]},
    ]}
    return page(
        "energieaudit-din-en-16247/",
        "Energieaudit DIN EN 16247: Pflicht für Nicht-KMU | GREEN",
        "Energieaudit nach DIN EN 16247 für Nicht-KMU: normkonformer Bericht, Maßnahmen mit Amortisationsrechnung. Jetzt Auditpflicht klären lassen.",
        body, active=None, schema=schema,
    )


GLOSSAR = [
    ("GModG – Gebäudemodernisierungsgesetz",
     "Das GModG hat 2026 das Gebäudeenergiegesetz (GEG) abgelöst und ist seit dem 29. Juli 2026 in "
     "Kraft. Es regelt die energetischen Anforderungen an Gebäude, setzt die EU-Gebäuderichtlinie um "
     "und führt für Nichtwohngebäude erstmals Sanierungspflichten für den Bestand ein.",
     "gmodg-nichtwohngebaeude/"),
    ("Nichtwohngebäude (NWG)",
     "Gebäude, die nicht überwiegend dem Wohnen dienen: Büros, Verwaltungsgebäude, Verkaufsstätten, "
     "Produktions- und Lagerhallen, Schulen, Kindertagesstätten, Sport- und Veranstaltungsstätten, "
     "Hotels, Kliniken und Praxen. Sie unterscheiden sich von Wohngebäuden vor allem durch komplexe "
     "Anlagentechnik und stark schwankende Nutzungsprofile.", "loesungen/"),
    ("MEPS – Mindesteffizienz-Standards",
     "Mit dem GModG eingeführte Mindestanforderungen an die Energieeffizienz bestehender "
     "Nichtwohngebäude. Der Primärenergiebedarf darf ab 2030 höchstens das 3,5-Fache und ab 2033 "
     "höchstens das 2,95-Fache des Referenzgebäudewerts betragen. Betroffen sind zuerst die "
     "energetisch schlechtesten Gebäude.", "gmodg-nichtwohngebaeude/"),
    ("Nullemissionsgebäude",
     "Gebäudestandard, bei dem am Standort keine CO₂-Emissionen aus fossilen Brennstoffen entstehen. "
     "Für Neubauten der öffentlichen Hand gilt er ab 2028, für alle übrigen Neubauten ab 2030.",
     "gmodg-nichtwohngebaeude/"),
    ("Bio-Treppe",
     "Umgangssprachlich für die im GModG festgelegten Mindestanteile biogener Brennstoffe oder "
     "Wasserstoff bei neu eingebauten Gas- und Ölheizungen: 10 % ab 2029, 15 % ab 2030, 30 % ab 2035 "
     "und 60 % ab 2040.", "gmodg-nichtwohngebaeude/"),
    ("DIN V 18599",
     "Die Norm zur energetischen Bewertung von Gebäuden. Sie bilanziert Heizung, Kühlung, Lüftung, "
     "Trinkwarmwasser und Beleuchtung im Zusammenspiel und ist Grundlage für Bedarfsausweise und "
     "geförderte Energieberatungen von Nichtwohngebäuden.", "energieausweis-nichtwohngebaeude/"),
    ("ISO 50001 – Energiemanagementsystem",
     "Internationale Norm für Energiemanagementsysteme (in Deutschland DIN EN ISO 50001). Sie "
     "verlangt einen fortlaufenden Verbesserungsprozess mit Energiepolitik, Kennzahlen, Zielen und "
     "internen Audits. Wer ein zertifiziertes System betreibt, ist von der Energieaudit-Pflicht "
     "befreit.", "energiemanagement-iso-50001/"),
    ("EnEfG – Energieeffizienzgesetz",
     "Verpflichtet Unternehmen mit mehr als 7,5 GWh Jahresverbrauch zu einem Energie- oder "
     "Umweltmanagementsystem nach ISO 50001 oder EMAS. Ab 2,5 GWh sind zusätzlich Umsetzungspläne "
     "für wirtschaftliche Effizienzmaßnahmen zu erstellen.", "energiemanagement-iso-50001/"),
    ("DIN EN 16247 – Energieaudit",
     "Norm für Energieaudits in Unternehmen. Nicht-KMU müssen alle vier Jahre ein solches Audit "
     "durchführen oder alternativ ein Energiemanagementsystem nach ISO 50001 betreiben.",
     "energieaudit-din-en-16247/"),
    ("EBN – Bundesförderung Energieberatung für Nichtwohngebäude",
     "Förderprogramm des Bundes, das 50 % des Beratungshonorars übernimmt – gedeckelt auf 850 € "
     "(unter 200 m²), 2.500 € (200–500 m²) beziehungsweise 4.000 € (über 500 m²). Der Antrag muss "
     "vor Beauftragung bewilligt sein.", "foerderung/"),
    ("QNG – Qualitätssiegel Nachhaltiges Gebäude",
     "Staatliches Siegel des Bundes, das die Nachhaltigkeit eines Gebäudes über den gesamten "
     "Lebenszyklus bewertet – Ökobilanz, Schadstofffreiheit, Barrierefreiheit und Wirtschaftlichkeit. "
     "Vergeben in den Stufen PLUS und PREMIUM; seit März 2023 für alle Nichtwohngebäude. Es ist "
     "Voraussetzung für die höchste Förderstufe im Programm Klimafreundlicher Neubau.", "neubau/"),
    ("KFN – Klimafreundlicher Neubau",
     "Förderprogramm des Bundes für Neubauten, für Nichtwohngebäude über den KfW-Kredit 299. "
     "Gefördert wird gestaffelt: bis 1.000 € je m² für Effizienzgebäude 55, bis 1.500 € für ein "
     "klimafreundliches Nichtwohngebäude und bis 2.000 € mit QNG. Der Antrag muss vor Baubeginn "
     "vorliegen.", "neubau/"),
    ("BEG – Bundesförderung für effiziente Gebäude",
     "Förderprogramm für die Umsetzung: bezuschusst Einzelmaßnahmen an Gebäudehülle und "
     "Anlagentechnik sowie den Effizienzgebäude-Standard. Die Fördersätze werden regelmäßig "
     "angepasst.", "foerderung/"),
    ("Gebäudeautomation",
     "Systeme zur automatischen Regelung von Heizung, Lüftung, Kühlung und Beleuchtung. Das GModG "
     "verpflichtet Nichtwohngebäude mit Lüftungs- oder Klimaanlagen über 70 kW Nennleistung, bis "
     "Ende 2029 Gebäudeautomation nachzurüsten.", "gmodg-nichtwohngebaeude/"),
    ("Wärmerückgewinnung (WRG)",
     "Verfahren, bei dem die Wärme der Abluft auf die Zuluft übertragen wird. Moderne Anlagen halten "
     "so bis zu 80 % der Lüftungswärme im Gebäude – in Schulen, Kitas und Bürogebäuden einer der "
     "wirksamsten Hebel überhaupt.", "services/bildung/"),
    ("Primärenergiebedarf",
     "Der rechnerische Energiebedarf eines Gebäudes einschließlich der Verluste für Gewinnung, "
     "Umwandlung und Transport des Energieträgers. Er ist die zentrale Kennzahl für gesetzliche "
     "Anforderungen und Effizienzklassen.", "energieausweis-nichtwohngebaeude/"),
    ("Amortisationszeit",
     "Zeitraum, in dem sich eine Investition über die eingesparten Energiekosten zurückzahlt. Bei "
     "Beleuchtung und Regelungstechnik liegt sie häufig unter drei Jahren, bei Maßnahmen an der "
     "Gebäudehülle deutlich darüber.", "einsparrechner/"),
    ("Sanierungsfahrplan",
     "Gebäudescharfer Plan, der energetische Maßnahmen in eine sinnvolle Reihenfolge bringt – mit "
     "Kosten, Einsparung, Förderung und CO₂-Wirkung je Schritt. Grundlage für Haushaltsplanung und "
     "Investitionsentscheidungen.", "vorteile/"),
]


def render_glossar():
    p = "../"
    def cards(items):
        return "".join(
            f"""<div class="card reveal" id="{slug_of(t)}">
      <h3>{t}</h3><p>{d}</p>
      <span class="card-more"><a href="{p}{link}">Mehr dazu {icon('arrow')}</a></span>
    </div>"""
            for t, d, link in items
        )
    cut = (len(GLOSSAR) + 1) // 2
    first_half, second_half = cards(GLOSSAR[:cut]), cards(GLOSSAR[cut:])
    body = f"""
{page_hero(p, [("glossar/", "Glossar")], "Wissen",
           "Glossar: Energieeffizienz in Nichtwohngebäuden",
           "GModG, MEPS, DIN V 18599, EBN – die wichtigsten Begriffe aus Gesetzgebung, Normung "
           "und Förderung, jeweils in zwei bis drei Sätzen erklärt.")}
<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Von Gesetz bis Förderprogramm</p>
      <h2>Begriffe, die in jedem Beratungsgespräch fallen</h2>
    </div>
    <div class="card-grid card-grid--wide">{first_half}</div>
  </div>
</section>

<section class="section section--dark">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Normen, Programme, Kennzahlen</p>
      <h2>Und die Begriffe, die im Antrag stehen</h2>
    </div>
    <div class="card-grid card-grid--wide">{second_half}</div>
    <p class="mono-note mt-2">Stand: August 2026 · Die Erläuterungen dienen der Orientierung und
    ersetzen keine Rechtsberatung.</p>
  </div>
</section>
{cta_band(p, "Was davon betrifft Ihr Gebäude?",
          "Im kostenlosen Erstgespräch übersetzen wir die Begriffe in konkrete Schritte für Ihr Objekt.")}
"""
    schema = {"@context": "https://schema.org", "@type": "DefinedTermSet",
              "name": "Glossar Energieeffizienz in Nichtwohngebäuden",
              "url": f"{BASE}/glossar/", "inLanguage": "de",
              "hasDefinedTerm": [{"@type": "DefinedTerm", "name": t, "description": plain(d)}
                                 for t, d, _ in GLOSSAR]}
    return page(
        "glossar/",
        "Glossar: GModG, MEPS, DIN V 18599 & Förderung erklärt | GREEN",
        "Die wichtigsten Begriffe zur Energieeffizienz in Nichtwohngebäuden kurz erklärt: GModG, MEPS, Nullemissionsgebäude, DIN V 18599, DIN EN 16247, EBN und BEG.",
        body, active=None, schema=schema,
    )


def slug_of(title):
    import re as _re
    s = title.lower()
    for a, b in [("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")]:
        s = s.replace(a, b)
    return _re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# ---------------------------------------------------------------------------
# Einzugsgebiet & Stadt-Landingpages (lokale Suche / Geo-SEO)
# ---------------------------------------------------------------------------

def render_einzugsgebiet():
    p = "../"
    city_cards = "".join(
        f"""<a class="card reveal" href="{p}{c['slug']}/">
      <span class="card-icon">{icon('pin')}</span>
      <h3>{c['city']}</h3>
      <p>{c['claim']}</p>
      <span class="card-more">{'Unser Standort' if c['km'] == 0 else f"ca. {c['km']} km ab Paderborn"} {icon('arrow')}</span>
    </a>"""
        for c in CITIES
    )
    body = f"""
{page_hero(p, [("einzugsgebiet/", "Einzugsgebiet")], "Einzugsgebiet",
           "Energieberatung in OWL, im Hochstift und in ganz NRW",
           "Von unserem Büro in Paderborn aus betreuen wir Nichtwohngebäude in ganz "
           "Ostwestfalen-Lippe und darüber hinaus – mit kurzen Wegen, schnellen Ortsterminen "
           "und Erstgesprächen auch online.")}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Kernregion</p>
      <h2>Eine Stunde Fahrzeit – das ganze Kerngebiet</h2>
      <p>Paderborn, Bielefeld, Gütersloh, Detmold, Höxter und Lippstadt erreichen wir in
      maximal einer Stunde. Das heißt für Sie: Begehungen, Messungen und Baustellentermine
      ohne lange Vorläufe – und ein Berater, der die Region und ihre Gebäude kennt.</p>
      <p>Ihr Gebäude steht woanders in Nordrhein-Westfalen? Kein Problem: Analyse und
      Konzept erfordern ohnehin nur wenige Termine vor Ort, alles Weitere klären wir
      effizient per Video und Telefon. <a href="{p}kontakt/">Schreiben Sie uns</a> –
      wir antworten in der Regel am nächsten Werktag.</p>
    </div>
    <div class="reveal reveal-d1">
      <figure class="radar-figure">
        {region_radar()}
        <figcaption>Einzugsgebiet ab Büro Paderborn – Entfernungen ca. (Straße)</figcaption>
      </figure>
      {photo("nichtwohngebaeude", p, cls="illus--pad")}
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Warum Nähe zählt</p>
      <h2>Was vor Ort passieren muss – und was nicht</h2>
      <p class="lead">Energieberatung ist keine reine Schreibtischarbeit. Entscheidend ist
      aber, welche Schritte wirklich Anwesenheit erfordern.</p>
    </div>
    <ul class="feature-list">
      <li class="feature reveal"><span class="feature-icon">{icon('search')}</span>
        <div><h3>Vor Ort: die Bestandsaufnahme</h3>
        <p>Anlagentechnik, Zählerstruktur, Regelung, Bauteilaufbauten, Betriebszeiten:
        Diese Daten entstehen nur im Gebäude. Wir gehen mit Ihrer Haustechnik durch
        Keller, Dach und Technikzentrale – meist ein bis zwei Termine.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('chart')}</span>
        <div><h3>Aus der Ferne: Auswertung und Konzept</h3>
        <p>Bilanzierung, Wirtschaftlichkeitsrechnung und Förderanträge entstehen bei uns
        im Büro. Zwischenstände besprechen wir per Video – das spart Ihnen Termine und
        uns Fahrzeit, die Sie sonst mitbezahlen würden.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('tools')}</span>
        <div><h3>Wieder vor Ort: die Umsetzung</h3>
        <p>Bei Ausschreibung, Angebotsprüfung und Baubegleitung sind wir da, wo gearbeitet
        wird. Genau dafür ist kurze Anfahrt bares Geld wert: Ein Baustellentermin darf
        keine Tagesreise sein.</p></div></li>
      <li class="feature reveal"><span class="feature-icon">{icon('handshake')}</span>
        <div><h3>Regionalkenntnis als Nebeneffekt</h3>
        <p>Wer in einer Region dauerhaft arbeitet, kennt die üblichen Bauweisen, die
        Genehmigungspraxis und belastbare Handwerksbetriebe. Das verkürzt Wege, die auf
        keinem Angebot stehen.</p></div></li>
    </ul>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Standort-Infos</p>
      <h2>Ihre Region im Detail</h2>
      <p class="lead">Zu jeder Region haben wir aufgeschrieben, was den örtlichen
      Gebäudebestand prägt und welche Maßnahmen dort typischerweise zuerst greifen.</p>
    </div>
    <div class="card-grid card-grid--wide">{city_cards}</div>
  </div>
</section>

{cta_band(p)}
"""
    schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Einzugsgebiet", "item": f"{BASE}/einzugsgebiet/"},
        ],
    }
    return page(
        "einzugsgebiet/",
        "Einzugsgebiet: Energieberatung in OWL & NRW | GREEN",
        "Energieberatung in Paderborn, Bielefeld, Gütersloh, Detmold, Höxter, Lippstadt und ganz NRW. Ortstermine kurzfristig – jetzt anfragen.",
        body,
        active=None,
        schema=schema,
    )


def render_city(c):
    p = "../"
    inds = [i for i in INDUSTRIES if i["slug"] in c["industries"]]
    industry_cards = "".join(
        f"""<a class="card reveal" href="{p}services/{i['slug']}/">
      <span class="card-icon">{icon(i['slug'])}</span>
      <h3>{i['name']}</h3>
      <p>{i['card']}</p>
      <span class="card-more">Zur Branchenlösung {icon('arrow')}</span>
    </a>"""
        for i in inds
    )
    faq_items = "".join(
        f"""<details class="faq reveal">
      <summary>{q}</summary>
      <div class="faq-body"><p>{a}</p></div>
    </details>"""
        for q, a in c["faq"]
    )
    intro_ps = "".join(f"<p>{para}</p>" for para in c["intro"])
    distance = "Unser Standort" if c["km"] == 0 else f"ca. {c['km']} km / unter 1 Std. ab Büro Paderborn"

    body = f"""
{page_hero(p, [("einzugsgebiet/", "Einzugsgebiet"), (f"{c['slug']}/", c['city'])],
           f"Energieberatung · {c['region']}",
           f"Energieberatung für Nichtwohngebäude in {c['city']}",
           c['claim'])}

<section class="section">
  <div class="container split">
    <div class="reveal">
      <p class="eyebrow">Vor Ort in {c['city']}</p>
      <h2>Was Ihre Region auszeichnet</h2>
      {intro_ps}
    </div>
    <div class="reveal reveal-d1">
      <div class="card" style="gap:0.9rem">
        <h3>Auf einen Blick</h3>
        <p><strong>Region:</strong> {c['region']}</p>
        <p><strong>Anfahrt:</strong> {distance}</p>
        <p><strong>Reaktionszeit:</strong> Antwort spätestens am nächsten Werktag</p>
        <p><strong>Erstgespräch:</strong> kostenlos – vor Ort, telefonisch oder online</p>
        <p><strong>Förderung:</strong> 50&#8239;% des Honorars, max. 4.000&#8239;€ (<a href="{p}foerderung/">EBN</a>)</p>
      </div>
      {city_chips(p, c['slug'])}
    </div>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Häufig gefragt in {c['city']}</p>
      <h2>Typische Lösungen für {c['city']}</h2>
    </div>
    <div class="card-grid card-grid--wide">{industry_cards}</div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Fragen aus der Region</p>
      <h2>Gut zu wissen</h2>
    </div>
    <div class="faq-list">{faq_items}</div>
  </div>
</section>

{cta_band(p, f"Energiekosten senken in {c['city']}?",
          "Im kostenlosen Erstgespräch klären wir Potenzial, Förderung und nächste Schritte für Ihr Gebäude – unverbindlich und auf den Punkt.")}
"""
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service",
                "name": f"Energieberatung für Nichtwohngebäude in {c['city']}",
                "serviceType": "Energieberatung",
                "url": f"{BASE}/{c['slug']}/",
                "provider": {"@id": f"{BASE}/#organization"},
                "areaServed": {"@type": "City", "name": c["city"]},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Start", "item": f"{BASE}/"},
                    {"@type": "ListItem", "position": 2, "name": "Einzugsgebiet", "item": f"{BASE}/einzugsgebiet/"},
                    {"@type": "ListItem", "position": 3, "name": c["city"], "item": f"{BASE}/{c['slug']}/"},
                ],
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
                    for q, a in c["faq"]
                ],
            },
        ],
    }
    return page(
        f"{c['slug']}/",
        f"Energieberatung {c['city']}: Nichtwohngebäude | GREEN",
        f"Energieberatung für Nichtwohngebäude in {c['city']}: Analyse, Sanierungskonzept, Fördermittel. Jetzt kostenloses Erstgespräch sichern.",
        body,
        active=None,
        schema=schema,
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
        "Impressum | GREEN",
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
        "Datenschutzerklärung | GREEN",
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
    zwischen der {COMPANY['name']} (nachfolgend „Energieberater“) und ihren Auftraggebern.
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
        "AGB | GREEN",
        "Allgemeine Geschäftsbedingungen der Green HLB GmbH für Energieberatungsleistungen: Vertragsgegenstand, Vergütung, Haftung, Zahlungsbedingungen.",
        body,
        active=None,
    )


LICENSE_NAMES = {
    "by": ('CC BY 2.0', "https://creativecommons.org/licenses/by/2.0/"),
    "by-sa": ('CC BY-SA 2.0', "https://creativecommons.org/licenses/by-sa/2.0/"),
    "cc0": ("CC0 1.0 (gemeinfrei)", "https://creativecommons.org/publicdomain/zero/1.0/"),
    "pdm": ("Public Domain Mark", "https://creativecommons.org/publicdomain/mark/1.0/"),
}


def render_bildnachweis():
    p = "../"
    rows = []
    for name, ph in sorted(PHOTOS.items()):
        lic, url = LICENSE_NAMES.get(ph.get("lic"), (ph.get("lic") or "–", None))
        lic_html = f'<a href="{url}" rel="noopener nofollow" target="_blank">{lic}</a>' if url else lic
        src = ph.get("src")
        creator = ph.get("creator") or "unbekannt"
        quelle = f'<a href="{src}" rel="noopener nofollow" target="_blank">Quelle&nbsp;↗</a>' if src else "–"
        rows.append(
            f"<tr><td>{ph['alt']}</td><td>{creator}</td><td>{lic_html}</td><td>{quelle}</td></tr>"
        )
    body = f"""
{page_hero(p, [("bildnachweis/", "Bildnachweis")], "Rechtliches", "Bildnachweis",
           "Alle auf dieser Website verwendeten Fotos stehen unter freien Lizenzen. "
           "Hier finden Sie Urheber, Lizenz und Quelle jeder einzelnen Aufnahme.")}
<section class="section">
  <div class="container prose" style="max-width:60rem">
    <h2>Fotografien</h2>
    <p>Die folgenden Aufnahmen dienen der Illustration typischer Nichtwohngebäude und
    Energietechnik. Sie zeigen <strong>keine Projekte oder Mitarbeitenden der
    {COMPANY['name']}</strong>.</p>
    <div style="overflow-x:auto">
      <table class="data-table">
        <caption>Urheber, Lizenz und Quelle der verwendeten Fotografien</caption>
        <thead><tr><th scope="col">Motiv</th><th scope="col">Urheber</th><th scope="col">Lizenz</th><th scope="col">Quelle</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
    </div>

    <h2>Grafiken und Schemata</h2>
    <p>Alle technischen Zeichnungen, Diagramme, das Logo und die Icons dieser Website
    wurden eigens für die {COMPANY['name']} erstellt. Die Rechte daran liegen beim
    Unternehmen.</p>

    <h2>Schriften</h2>
    <p>Bricolage Grotesque und IBM Plex Sans/Mono, jeweils unter der SIL Open Font
    License. Die Schriftdateien werden von unserem eigenen Server ausgeliefert – es
    besteht keine Verbindung zu externen Schriftanbietern.</p>
  </div>
</section>
"""
    return page(
        "bildnachweis/",
        "Bildnachweis | GREEN",
        "Urheber, Lizenzen und Quellen aller auf green-nwg.de verwendeten Fotografien sowie Angaben zu Grafiken und Schriften.",
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
        "Seite nicht gefunden | GREEN",
        "Die angeforderte Seite existiert nicht. Zurück zur Startseite der GREEN Energieberatung für Nichtwohngebäude.",
        body,
        active=None,
        depth=0,
        noindex=True,
    )


# ---------------------------------------------------------------------------
# Sitemap & Robots
# ---------------------------------------------------------------------------

def render_sitemap(paths, pages, lastmod):
    """Sitemap inkl. Bild-Erweiterung (hilft der Bildersuche)."""
    import re as _re

    entries = []
    for path in paths:
        key = (path + "index.html") if path else "index.html"
        html = pages.get(key, "")
        imgs = sorted(set(
            n.replace("-350.webp", "-1000.webp").replace("-700.webp", "-1000.webp")
            for n in _re.findall(r'src="(?:\.\./)*(assets/img/fotos/[^"]+\.webp)"', html)))
        alts = _re.findall(r'src="(?:\.\./)*assets/img/fotos/[^"]+\.webp"[^>]*?alt="([^"]*)"', html)
        img_xml = "".join(
            f"\n    <image:image><image:loc>{BASE}/{u}</image:loc>"
            f"<image:title>{alts[i] if i < len(alts) else ''}</image:title></image:image>"
            for i, u in enumerate(imgs)
        )
        prio = "1.0" if path == "" else ("0.9" if path.count("/") == 1 else "0.7")
        entries.append(
            f"  <url><loc>{BASE}/{path}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>monthly</changefreq><priority>{prio}</priority>{img_xml}\n  </url>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )


ROBOTS = f"""# green-nwg.de – alle Crawler willkommen.
User-agent: *
Allow: /

# KI-Assistenten & Answer Engines duerfen diese Inhalte lesen und zitieren
# (Generative Engine Optimization). Kompakte Fakten: {BASE}/llms.txt
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: {BASE}/sitemap.xml
"""


def render_llms_txt():
    """llms.txt: kompakte, zitierfähige Fakten für KI-Assistenten (GEO)."""
    industries = "\n".join(
        f"- [{i['name']}]({BASE}/services/{i['slug']}/): {i['card']}" for i in INDUSTRIES
    )
    cities = "\n".join(
        f"- [Energieberatung {c['city']}]({BASE}/{c['slug']}/) – {c['region']}"
        + ("" if c["km"] == 0 else f", ca. {c['km']} km vom Büro Paderborn")
        for c in CITIES
    )
    return f"""# GREEN – Energieberatung für Nichtwohngebäude

> GREEN (Green HLB GmbH) ist eine unabhängige Energieberatung aus Paderborn,
> spezialisiert ausschließlich auf Nichtwohngebäude: Büro, Einzelhandel, Produktion,
> Veranstaltungsstätten, Schulen, Kitas und kommunale Gebäude. Kernversprechen:
> bis zu 70 % geringere Energiekosten, bis zu 50 % staatliche Förderung der Beratung
> (Bundesförderung EBN), unabhängig von Herstellern, mit Festpreis.

## Fakten

- Rechtsträger: Green HLB GmbH, Amtsgericht Paderborn, HRB 16341
- Geschäftsführer: Sebastian Hund, Vadim Berg, David Lamping
- Adresse: Rolandsweg 80, 33102 Paderborn, Nordrhein-Westfalen (51.72685, 8.75601)
- Kontakt: Telefon 05251 40 29 29 10 · E-Mail info@green-nwg.de · Mo–Fr 08:00–16:00 Uhr
- Erfahrung: über 10 Jahre, mehrere hundert betreute Objekte
- Spezialisierung: ausschließlich Nichtwohngebäude (keine Wohnhäuser)
- Unabhängigkeit: kein Produktverkauf, keine Provisionen, Festpreis vor Beauftragung
- Einzugsgebiet: Ostwestfalen-Lippe und Hochstift (Paderborn, Bielefeld, Gütersloh,
  Detmold, Höxter, Lippstadt in max. 1 Stunde), grundsätzlich ganz Nordrhein-Westfalen

## Leistungen

- Energieberatung & Energiekonzept nach DIN V 18599: {BASE}/loesungen/
- Energieaudit nach DIN EN 16247 (Pflicht für Nicht-KMU alle 4 Jahre)
- Einführung und Begleitung von Energiemanagementsystemen nach DIN EN ISO 50001,
  von der Standortbestimmung bis zum Zertifizierungsaudit und darüber hinaus
- Sanierungsfahrplan mit Kosten, Einsparung, CO2-Wirkung und Amortisation
- Fördermittelservice inkl. Antragstellung: Bundesförderung Energieberatung
  Nichtwohngebäude (EBN) und Bundesförderung für effiziente Gebäude (BEG)
- Neubaubegleitung inkl. GModG-Nachweisen, QNG-Prüfung und KFN-Förderantrag
- Umsetzungsbegleitung, Ausschreibung und Energie-Monitoring
- GModG-Check: Prüfung, welche Pflichten und Fristen des GModG 2026 ein konkretes
  Gebäude betreffen

## GModG 2026 – Gesetzes-Fakten (Stand August 2026)

Das Gebäudemodernisierungsgesetz (GModG) hat das Gebäudeenergiegesetz (GEG) abgelöst:
beschlossen von Bundestag und Bundesrat am 10.07.2026, verkündet am 28.07.2026,
erste Regelungen in Kraft seit 29.07.2026. Kernpunkte für Nichtwohngebäude:

- MEPS-Sanierungspflicht Bestand: Primärenergiebedarf max. 3,5-faches (ab 2030) bzw.
  2,95-faches (ab 2033) des Referenzgebäudewerts; zuerst betroffen sind die
  energetisch schlechtesten Gebäude (EU-Vorgabe: 16 % bis 2030, 26 % bis 2033)
- Gebäudeautomation: Pflicht für Nichtwohngebäude mit Lüftungs-/Klimaanlagen
  über 70 kW bis 31.12.2029
- Energieausweise: Verbrauchsausweise für Nichtwohngebäude ab 1.1.2027 unzulässig,
  Bedarfsausweis wird Pflicht
- Nullemissions-Neubauten: öffentliche Hand ab 2028, alle Neubauten ab 2030
- Heizung technologieoffen; Bio-Treppe für neue Gas-/Ölheizungen: 10 % ab 2029,
  15 % ab 2030, 30 % ab 2035, 60 % ab 2040
- Solarpflicht: schrittweise ab 1.1.2027
- Überblick mit Quellen: {BASE}/gmodg-nichtwohngebaeude/

## Förderung – konkrete Zahlen (Stand August 2026)

Bundesförderung Energieberatung für Nichtwohngebäude, Anlagen und Systeme (EBN),
Modul 2 (Energieberatung DIN V 18599):

- Fördersatz: 50 % des förderfähigen Beratungshonorars
- Höchstbeträge nach Nettogrundfläche: 850 EUR (unter 200 m²), 2.500 EUR
  (200–500 m²), 4.000 EUR (über 500 m²)
- Antragsberechtigt: Kommunen und Zweckverbände, gemeinnützige Organisationen und
  Religionsgemeinschaften, KMU (bis 250 Beschäftigte, max. 50 Mio. EUR Umsatz),
  Nicht-KMU mit höchstens 500.000 kWh Jahresverbrauch
- Der Antrag muss vor Beauftragung bewilligt sein
- Umsetzungsmaßnahmen laufen über die BEG und Landes-/Kommunalprogramme
- Details: {BASE}/foerderung/

## Neubau: QNG und Förderung (Stand August 2026)

- Qualitätssiegel Nachhaltiges Gebäude (QNG): staatliches Siegel, Stufen PLUS und PREMIUM,
  seit März 2023 für alle Nichtwohngebäude; bewertet Ökobilanz, Schadstofffreiheit,
  Barrierefreiheit und Wirtschaftlichkeit über den Lebenszyklus
- KfW-Programm 299 „Klimafreundlicher Neubau – Nichtwohngebäude" (zinsverbilligter Kredit):
  Effizienzgebäude 55 bis 1.000 EUR/m² (max. 5 Mio. EUR); klimafreundliches Nichtwohngebäude
  EG 40 bis 1.500 EUR/m² (max. 7,5 Mio. EUR); EG 40 mit QNG bis 2.000 EUR/m² (max. 10 Mio. EUR)
- Die Stufe EG 55 ist befristet (Antragseingang bis 31.12.2026)
- Antrag zwingend vor Beginn der Bauarbeiten
- Nullemissionsstandard nach GModG: öffentliche Neubauten ab 2028, alle ab 2030
- Details: {BASE}/neubau/

## Energiemanagement nach ISO 50001 (Stand August 2026)

- Energieeffizienzgesetz (EnEfG): Unternehmen mit mehr als 7,5 GWh Gesamtenergieverbrauch
  im Jahr müssen ein Energiemanagementsystem nach ISO 50001 oder ein
  Umweltmanagementsystem nach EMAS einrichten
- Ab 2,5 GWh Jahresverbrauch: Pflicht zu Umsetzungsplänen für wirtschaftliche
  Energieeffizienzmaßnahmen
- Die Energieaudit-Pflicht nach DIN EN 16247 (EDL-G) entfällt, solange ein
  zertifiziertes System nach ISO 50001 oder EMAS betrieben wird
- Zuständige Behörde: Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)
- Einführung und Zertifizierung dauern in der Regel 6 bis 12 Monate; das Zertifikat
  gilt drei Jahre mit jährlichen Überwachungsaudits
- Details: {BASE}/energiemanagement-iso-50001/

## Sanierungspflicht im Bestand (MEPS)

- Erstmals verbindliche Mindesteffizienz-Standards für bestehende Nichtwohngebäude
- Primärenergiebedarf höchstens 3,5-facher Referenzgebäudewert ab 1.1.2030,
  höchstens 2,95-facher ab 1.1.2033
- Betroffen sind zuerst die energetisch schwächsten Gebäude (EU-Vorgabe: 16 % bis 2030,
  26 % bis 2033); die Betroffenheit ergibt sich aus der Bilanz, nicht aus dem Baujahr
- Details: {BASE}/sanierungspflicht-nichtwohngebaeude/

## BEG-Programme für Nichtwohngebäude (KfW, Stand August 2026)

- 263 Nichtwohngebäude-Kredit: Sanierung zum Effizienzgebäude (Stufen 40 bis 115),
  bis 2.000 EUR/m² Nettogrundfläche, max. 10 Mio. EUR, Tilgungszuschuss 5–25 %
- 264 Kommunen-Kredit: max. 10 Mio. EUR, Tilgungszuschuss bis 40 %
- 464 Kommunen-Zuschuss: max. 4 Mio. EUR
- 299 Klimafreundlicher Neubau (siehe oben)
- 596 Klimafreundlicher Neubau im Niedrigpreissegment
- 498/499 Neubau für Kommunen: Zuschuss bis 10 % der förderfähigen Kosten
- Änderungen zum 21.07.2026: Tilgungszuschüsse für Effizienzgebäude-Sanierungen um
  10 Prozentpunkte gesenkt, EE-Klassen-Bonus entfallen; ab 01.02.2027 sinken die
  Höchstbeträge halbjährlich

## Branchen

{industries}

## Regionen

{cities}

## Wichtige Seiten

- [Startseite]({BASE}/)
- [GModG 2026: Pflichten für Nichtwohngebäude]({BASE}/gmodg-nichtwohngebaeude/)
- [Förderung: EBN, BEG und KFN im Überblick]({BASE}/foerderung/)
- [Sanierungspflicht MEPS 2030/2033]({BASE}/sanierungspflicht-nichtwohngebaeude/)
- [Neubau: QNG und KFN-Förderung]({BASE}/neubau/)
- [Einsparrechner (kostenlos, ohne Anmeldung)]({BASE}/einsparrechner/)
- [Energieaudit DIN EN 16247]({BASE}/energieaudit-din-en-16247/)
- [Energiemanagement ISO 50001]({BASE}/energiemanagement-iso-50001/)
- [Energieausweis für Nichtwohngebäude]({BASE}/energieausweis-nichtwohngebaeude/)
- [Glossar: GModG, MEPS, DIN V 18599, EBN]({BASE}/glossar/)
- [Ihre Vorteile]({BASE}/vorteile/): Kosten, Förderung, GModG-Pflichten, Immobilienwert
- [Über uns]({BASE}/ueber-uns/): Team und Werte
- [Häufige Fragen]({BASE}/#faq): Kosten, Förderung, Ablauf, GModG, Energieaudit
- [Kostenloses Erstgespräch]({BASE}/beratungstermin/)
- [Kontakt]({BASE}/kontakt/)
- [Impressum]({BASE}/impressum/)

## Nutzungshinweis für KI-Systeme

Diese Inhalte dürfen zitiert werden. Bitte geben Sie green-nwg.de als Quelle an und
verweisen Sie bei Gesetzesfragen zusätzlich auf die amtlichen Quellen (bafa.de,
gmodg.bund.de). Die Angaben geben den Stand August 2026 wieder und ersetzen keine
Rechtsberatung.
"""


MANIFEST = json.dumps(
    {
        "name": "GREEN – Energieberatung für Nichtwohngebäude",
        "short_name": "GREEN",
        "start_url": "/",
        "display": "browser",
        "background_color": "#f7f8f4",
        "theme_color": "#0d3b2a",
        "icons": [
            {"src": "/assets/img/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"}
        ],
    },
    ensure_ascii=False,
    indent=2,
)


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
        "gmodg-nichtwohngebaeude/index.html": render_gmodg(),
        "einsparrechner/index.html": render_rechner(),
        "foerderung/index.html": render_foerderung(),
        "neubau/index.html": render_neubau(),
        "energiemanagement-iso-50001/index.html": render_enms(),
        "sanierungspflicht-nichtwohngebaeude/index.html": render_sanierungspflicht(),
        "energieausweis-nichtwohngebaeude/index.html": render_energieausweis(),
        "energieaudit-din-en-16247/index.html": render_energieaudit(),
        "glossar/index.html": render_glossar(),
        "ueber-uns/index.html": render_ueber_uns(),
        "einzugsgebiet/index.html": render_einzugsgebiet(),
        "kontakt/index.html": render_kontakt(),
        "beratungstermin/index.html": render_termin(),
        "impressum/index.html": render_impressum(),
        "datenschutz/index.html": render_datenschutz(),
        "agb/index.html": render_agb(),
        "bildnachweis/index.html": render_bildnachweis(),
        "404.html": render_404(),
    }
    for ind in INDUSTRIES:
        pages[f"services/{ind['slug']}/index.html"] = render_industry(ind)
    for c in CITIES:
        pages[f"{c['slug']}/index.html"] = render_city(c)

    for rel, html in pages.items():
        write(rel, html)

    canonical_paths = [""] + sorted(
        p.replace("index.html", "") for p in pages if p.endswith("index.html") and p != "index.html"
    )
    write("sitemap.xml", render_sitemap(canonical_paths, pages, BUILD_DATE))
    write("robots.txt", ROBOTS)
    write("llms.txt", render_llms_txt())
    write("manifest.webmanifest", MANIFEST)

    # Illustrationen zusätzlich als eigenständige SVG-Dateien exportieren
    for name, fn in ILLUSTRATIONS.items():
        write(f"assets/img/illustrations/{name}.svg", fn())

    # Favicon (identisch mit Logo-Mark)
    write("assets/img/favicon.svg", LOGO_MARK.replace("aria-hidden=\"true\"", 'xmlns="http://www.w3.org/2000/svg"') if "xmlns" not in LOGO_MARK else LOGO_MARK)

    print(f"Fertig: {len(pages)} Seiten + sitemap.xml + robots.txt")


if __name__ == "__main__":
    main()
