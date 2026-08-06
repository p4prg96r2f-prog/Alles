# -*- coding: utf-8 -*-
"""16 Marken-Illustrationen im Stil „technische Zeichnung" für green-nwg.de.

Jede Funktion liefert ein eigenständiges Inline-SVG (mit xmlns, damit die
Grafiken auch als .svg-Dateien in assets/img/illustrations/ funktionieren).
Stilregeln: dünne Striche, Direktbeschriftung, Tinte für Text, eine Achse,
Pine als einzige Datenfarbe, Bernstein nur als Akzent.
"""

INK = "#14231d"
SOFT = "#64796e"
FAINT = "#a8c4b2"
HAIR = "#dbe4dc"
PINE = "#1e5b3f"
DEEP = "#0d3b2a"
DEEPER = "#092c1f"
LEAF = "#4caf78"
LEAFSOFT = "#e3f0e6"
AMBER = "#e8a33d"
AMBERDEEP = "#b97a1a"
AMBERSOFT = "#fdf3e2"
PAPER = "#f7f8f4"

MONO = "font-family='IBM Plex Mono, monospace' letter-spacing='.06em'"
SANS = "font-family='IBM Plex Sans, sans-serif'"
DISPLAY = "font-family='Bricolage Grotesque, sans-serif' font-weight='800'"


def frame(w, h, inner, plate, aria):
    """Rahmen im Zeichnungsstil: Karte, Messstriche, Plankopf unten rechts."""
    ticks = []
    for x in range(48, w - 24, 44):
        ticks.append(f'<line x1="{x}" y1="8" x2="{x}" y2="13"/>')
        ticks.append(f'<line x1="{x}" y1="{h - 13}" x2="{x}" y2="{h - 8}"/>')
    for y in range(48, h - 40, 44):
        ticks.append(f'<line x1="8" y1="{y}" x2="13" y2="{y}"/>')
        ticks.append(f'<line x1="{w - 13}" y1="{y}" x2="{w - 8}" y2="{y}"/>')
    pw = 9 * len(plate) + 24
    return f"""<svg viewBox="0 0 {w} {h}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{aria}">
<rect x="8" y="8" width="{w - 16}" height="{h - 16}" rx="10" fill="#ffffff" stroke="{HAIR}"/>
<g stroke="{HAIR}" stroke-width="1">{''.join(ticks)}</g>
{inner}
<g {MONO}><rect x="{w - pw - 16}" y="{h - 34}" width="{pw}" height="20" fill="{PAPER}" stroke="{HAIR}"/>
<text x="{w - pw - 4}" y="{h - 20.5}" font-size="8.5" fill="{SOFT}">{plate}</text></g>
</svg>"""


def _win_grid(x, y, cols, rows, wd=26, ht=22, gap=10, fill=LEAFSOFT, lit=()):
    out = []
    n = 0
    for r in range(rows):
        for c in range(cols):
            f = AMBERSOFT if n in lit else fill
            out.append(
                f'<rect x="{x + c * (wd + gap)}" y="{y + r * (ht + gap)}" width="{wd}" height="{ht}" rx="2" fill="{f}" stroke="{HAIR}"/>'
            )
            n += 1
    return "".join(out)


def _label(x, y, text, anchor="start", color=SOFT, size=10):
    return f"<text x='{x}' y='{y}' text-anchor='{anchor}' {MONO} font-size='{size}' fill='{color}'>{text}</text>"


def _leader(x1, y1, x2, y2, dot=PINE):
    return (
        f'<circle cx="{x1}" cy="{y1}" r="2.5" fill="{dot}"/>'
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{FAINT}"/>'
    )


def _ground(x1, x2, y):
    hatch = "".join(
        f'<line x1="{x}" y1="{y}" x2="{x - 9}" y2="{y + 10}"/>' for x in range(x1 + 20, x2, 36)
    )
    return (
        f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="{DEEP}" stroke-width="2.2"/>'
        f'<g stroke="{FAINT}" stroke-width="1.4">{hatch}</g>'
    )


# ---------------------------------------------------------------- Branchen ---

def illus_buero():
    inner = f"""
<rect x="120" y="120" width="170" height="210" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(136, 138, 4, 5, 28, 24, 8, lit=(5, 6))}
<rect x="310" y="180" width="130" height="150" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(324, 196, 3, 4, 30, 24, 8)}
<path d="M120 120 154 92h102l34 28z" fill="{DEEP}"/>
<path d="M316 176 340 156h44l-24 20z" fill="{DEEP}"/>
<path d="M328 172l18-13m6 13 18-13" stroke="{LEAF}" stroke-width="1.2"/>
<rect x="470" y="250" width="56 " height="80" rx="5" fill="#fff" stroke="{DEEP}" stroke-width="2"/>
<circle cx="498" cy="282" r="15" stroke="{PINE}" stroke-width="2"/>
<path d="M498 282m-1-11a11 11 0 0 1 8 6m-13 10a11 11 0 0 1-6-8" stroke="{LEAF}" stroke-width="1.8" stroke-linecap="round"/>
<line x1="440" y1="290" x2="470" y2="290" stroke="{AMBER}" stroke-width="2.2" class="flow-line"/>
{_ground(90, 560, 330)}
{_leader(206, 148, 206, 96)}<line x1="206" y1="96" x2="252" y2="96" stroke="{FAINT}"/>
{_label(258, 99, "LED + PR&#196;SENZ")}
{_leader(498, 250, 498, 210)}<line x1="498" y1="210" x2="452" y2="210" stroke="{FAINT}"/>
{_label(446, 213, "W&#196;RMEPUMPE", "end")}
{_leader(370, 176, 370, 140)}<line x1="370" y1="140" x2="416" y2="140" stroke="{FAINT}"/>
{_label(422, 143, "PV-DACH")}
{_label(120, 372, "L&#220;FTUNG BEDARFSGEF&#220;HRT &#183; BETRIEBSZEITEN OPTIMIERT", "start", FAINT, 9)}
"""
    return frame(640, 400, inner, "GREEN · SCHEMA BÜRO", "Schema: Energiekonzept Bürogebäude mit LED, Wärmepumpe und Photovoltaik")


def illus_einzelhandel():
    shelf = "".join(
        f'<rect x="{372 + i * 46}" y="212" width="38" height="96" rx="3" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.6"/>'
        f'<line x1="{372 + i * 46}" y1="244" x2="{410 + i * 46}" y2="244" stroke="{HAIR}"/>'
        f'<line x1="{372 + i * 46}" y1="276" x2="{410 + i * 46}" y2="276" stroke="{HAIR}"/>'
        f'<line x1="{391 + i * 46}" y1="218" x2="{391 + i * 46}" y2="302" stroke="{FAINT}" stroke-dasharray="2 3"/>'
        for i in range(3)
    )
    awning = "".join(
        f'<path d="M{110 + i * 40} 150h40l-8 26h-40z" fill="{"#fff" if i % 2 else PINE}" stroke="{DEEP}" stroke-width="1.4"/>'
        for i in range(5)
    )
    return frame(640, 400, f"""
<rect x="100" y="150" width="220" height="180" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{awning}
<rect x="128" y="200" width="76" height="90" rx="2" fill="{AMBERSOFT}" stroke="{HAIR}"/>
<rect x="222" y="200" width="70" height="130" rx="2" fill="{LEAFSOFT}" stroke="{DEEP}" stroke-width="1.6"/>
<path d="M234 214v104m46-104v104" stroke="{FAINT}" stroke-width="1.2"/>
<path d="M242 330c8-10 8-18 0-28m16 28c8-10 8-18 0-28" stroke="{AMBER}" stroke-width="2" class="flow-line"/>
<rect x="352" y="196" width="188" height="134" fill="none" stroke="{HAIR}"/>
{shelf}
{_ground(80, 570, 330)}
{_leader(166, 200, 166, 120)}<line x1="166" y1="120" x2="212" y2="120" stroke="{FAINT}"/>
{_label(218, 123, "LED-VERKAUFSLICHT −60&#8239;%")}
{_leader(462, 212, 462, 168)}<line x1="462" y1="168" x2="508" y2="168" stroke="{FAINT}"/>
{_label(514, 171, "K&#220;HLUNG", "start")}
{_label(514, 184, "MIT T&#220;REN", "start", FAINT, 9)}
{_leader(257, 322, 257, 356)}<line x1="257" y1="356" x2="300" y2="356" stroke="{FAINT}"/>
{_label(306, 359, "T&#220;RLUFTSCHLEIER")}
""", "GREEN · SCHEMA HANDEL", "Schema: Energiekonzept Einzelhandel mit LED, Kühlregalen mit Türen und Türluftschleier")


def illus_produktion():
    saw = "".join(
        f'<path d="M{120 + i * 90} 190 {150 + i * 90} 150h30v40" fill="#fff" stroke="{DEEP}" stroke-width="2"/>'
        f'<path d="M{150 + i * 90} 150l24 32" stroke="{LEAF}" stroke-width="1.2"/>'
        for i in range(4)
    )
    return frame(640, 400, f"""
<rect x="120" y="190" width="360" height="140" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{saw}
{_win_grid(140, 214, 6, 1, 44, 26, 12)}
<rect x="150" y="272" width="90" height="58" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.6"/>
<circle cx="180" cy="300" r="14" stroke="{PINE}" stroke-width="2"/>
<circle cx="214" cy="300" r="14" stroke="{PINE}" stroke-width="2"/>
<path d="M240 292h108m0 0v-30" stroke="{AMBER}" stroke-width="2.2" class="flow-line"/>
<path d="M348 262h74" stroke="{AMBER}" stroke-width="2.2" class="flow-line"/>
<rect x="422" y="244" width="40" height="36" rx="4" fill="{AMBERSOFT}" stroke="{AMBERDEEP}" stroke-width="1.6"/>
<path d="M434 268c3-5 0-8 3-12m6 12c3-5 0-8 3-12" stroke="{AMBERDEEP}" stroke-width="1.6"/>
<rect x="500" y="150" width="34" height="180" fill="#fff" stroke="{DEEP}" stroke-width="2"/>
{_ground(90, 570, 330)}
{_leader(195, 272, 195, 366)}{_label(204, 369, "DRUCKLUFT: LECKAGEN ORTEN")}
{_leader(442, 244, 442, 130)}<line x1="442" y1="130" x2="396" y2="130" stroke="{FAINT}"/>
{_label(390, 133, "ABW&#196;RME NUTZEN", "end")}
{_leader(240, 214, 240, 106)}<line x1="240" y1="106" x2="286" y2="106" stroke="{FAINT}"/>
{_label(292, 109, "LED-HALLENLICHT &#183; SHEDDACH-TAGESLICHT")}
""", "GREEN · SCHEMA PRODUKTION", "Schema: Energiekonzept Produktionshalle mit Druckluft-Check, Abwärmenutzung und LED")


def illus_veranstaltung():
    seats = "".join(
        f'<circle cx="{160 + c * 34 + (r % 2) * 17}" cy="{264 + r * 24}" r="6" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.3"/>'
        for r in range(3) for c in range(9 - (r % 2))
    )
    return frame(640, 400, f"""
<path d="M110 330V150h420v180" stroke="{DEEP}" stroke-width="2.2" fill="#fff"/>
<rect x="404" y="216" width="112" height="114" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.8"/>
<path d="M414 216 448 176m22 40 34-40" stroke="{AMBER}" stroke-width="2" class="flow-line"/>
<circle cx="448" cy="172" r="7" fill="{AMBERSOFT}" stroke="{AMBERDEEP}" stroke-width="1.6"/>
<circle cx="504" cy="172" r="7" fill="{AMBERSOFT}" stroke="{AMBERDEEP}" stroke-width="1.6"/>
{seats}
<rect x="140" y="164" width="300" height="26" rx="6" fill="#fff" stroke="{PINE}" stroke-width="1.8"/>
<path d="M156 177h24m22 0h24m22 0h24m22 0h24m22 0h24" stroke="{LEAF}" stroke-width="2"/>
<path d="M180 190c0 18-8 26-8 26m84-26c0 18 8 26 8 26" stroke="{AMBER}" stroke-width="2" class="flow-line"/>
{_ground(90, 570, 330)}
{_leader(290, 177, 290, 120)}<line x1="290" y1="120" x2="336" y2="120" stroke="{FAINT}"/>
{_label(342, 123, "CO&#8322;-GEF&#220;HRTE L&#220;FTUNG")}
{_leader(460, 330, 460, 360)}{_label(469, 363, "B&#220;HNE: LED-TECHNIK")}
{_label(140, 226, "WRG: W&#196;RME DER G&#196;STE ZUR&#220;CKGEWINNEN", "start", FAINT, 9)}
""", "GREEN · SCHEMA EVENT", "Schema: Energiekonzept Veranstaltungsstätte mit CO2-geführter Lüftung und LED-Bühnentechnik")


def illus_bildung():
    return frame(640, 400, f"""
<rect x="110" y="170" width="300" height="160" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(128, 190, 5, 2, 40, 34, 12, lit=(2,))}
<rect x="238" y="286" width="44" height="44" fill="{DEEP}" rx="2"/>
<rect x="410" y="220" width="110" height="110" fill="#fff" stroke="{DEEP}" stroke-width="2"/>
{_win_grid(424, 236, 2, 2, 34, 28, 12)}
<rect x="150" y="132" width="70" height="38" rx="5" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.8"/>
<path d="M162 152h14m8 0h14" stroke="{PINE}" stroke-width="1.6"/>
<path d="M150 145c-16 0-24 8-24 8m94-14c16-6 26 2 26 2" stroke="{AMBER}" stroke-width="2" class="flow-line"/>
<circle cx="524" cy="128" r="22" stroke="{AMBER}" stroke-width="2.4"/>
<path d="M524 96v-12M547 105l8-8M556 128h12" stroke="{AMBER}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M330 190h60m-60 10h60m-60 10h60" stroke="{AMBERDEEP}" stroke-width="2"/>
{_ground(80, 570, 330)}
{_leader(185, 132, 185, 104)}<line x1="185" y1="104" x2="231" y2="104" stroke="{FAINT}"/>
{_label(237, 107, "L&#220;FTUNG MIT WRG BIS 80&#8239;%")}
{_leader(360, 204, 360, 366)}{_label(369, 369, "AUSSENLIEGENDER SONNENSCHUTZ")}
{_label(430, 210, "ANBAU/HORT", "start", FAINT, 9)}
""", "GREEN · SCHEMA SCHULE", "Schema: Energiekonzept Schule mit Lüftung inklusive Wärmerückgewinnung und Sonnenschutz")


def illus_kindergarten():
    return frame(640, 400, f"""
<path d="M120 330V214l110-70 110 70v116" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
<path d="M120 214l110-70 110 70" fill="none" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(150, 238, 2, 1, 46, 40, 18, lit=())}
<rect x="262" y="238" width="40" height="92" fill="{DEEP}" rx="2"/>
<path d="M148 316h164" stroke="{AMBER}" stroke-width="2.4"/>
<path d="M156 316c4-6 8-6 12 0s8 6 12 0 8-6 12 0 8 6 12 0 8-6 12 0 8 6 12 0 8-6 12 0 8 6 12 0 8-6 12 0 8 6 12 0" stroke="{AMBERDEEP}" stroke-width="1.6"/>
<circle cx="470" cy="150" r="24" stroke="{AMBER}" stroke-width="2.4"/>
<path d="M470 116v-12m24 22 8-8m-56 8-8-8" stroke="{AMBER}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M420 330v-52c0-26 44-26 44 0v52" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.8"/>
<circle cx="442" cy="248" r="26" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.8"/>
{_ground(90, 570, 330)}
{_leader(230, 316, 230, 366)}{_label(239, 369, "FUSSBODENHEIZUNG &#183; 21&#8239;&#176;C AM BODEN")}
{_leader(196, 238, 196, 120)}<line x1="196" y1="120" x2="242" y2="120" stroke="{FAINT}"/>
{_label(248, 123, "ZUGFREIE L&#220;FTUNG MIT WRG")}
{_label(486, 296, "AUSSENSPIEL-", "start", FAINT, 9)}
{_label(486, 308, "BEREICH", "start", FAINT, 9)}
""", "GREEN · SCHEMA KITA", "Schema: Energiekonzept Kindergarten mit Fußbodenheizung und zugfreier Lüftung")


def illus_kommune():
    cols = "".join(f'<rect x="{206 + i * 40}" y="210" width="14" height="86" fill="#fff" stroke="{DEEP}" stroke-width="1.8"/>' for i in range(5))
    mini = "".join(
        f'<rect x="{430 + i * 44}" y="{258 + (i % 2) * 6}" width="34" height="{72 - (i % 2) * 6}" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.6"/>'
        for i in range(3)
    )
    return frame(640, 400, f"""
<path d="M190 210 305 150l115 60z" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
<path d="M214 202 305 156l91 46" fill="none" stroke="{FAINT}" stroke-width="1.2"/>
{cols}
<rect x="190" y="296" width="230" height="34" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
<path d="M236 150 260 130h44l-24 20z" fill="{DEEP}"/>
<path d="M248 146l16-12m6 12 16-12" stroke="{LEAF}" stroke-width="1.2"/>
{mini}
{_ground(90, 580, 330)}
{_leader(305, 168, 305, 108)}<line x1="305" y1="108" x2="351" y2="108" stroke="{FAINT}"/>
{_label(357, 111, "RATHAUS: PV + SANIERUNGSFAHRPLAN")}
{_leader(447, 258, 447, 226)}<line x1="447" y1="226" x2="493" y2="226" stroke="{FAINT}"/>
{_label(499, 229, "PORTFOLIO:")}
{_label(499, 242, "SCHULE &#183; HALLE &#183; BAUHOF", "start", FAINT, 9)}
{_label(190, 369, "EIN FAHRPLAN F&#220;R ALLE LIEGENSCHAFTEN &#183; ZIEL: KLIMANEUTRAL 2045", "start", FAINT, 9)}
""", "GREEN · SCHEMA KOMMUNE", "Schema: Kommunales Gebäudeportfolio mit Rathaus, Photovoltaik und Sanierungsfahrplan")


def illus_andere():
    return frame(640, 400, f"""
<rect x="104" y="180" width="130" height="150" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(118, 198, 3, 3, 30, 24, 8)}
{_label(169, 172, "HOTEL", "middle", SOFT, 9.5)}
<rect x="264" y="216" width="120" height="114" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(278, 234, 2, 2, 38, 28, 14)}
<path d="M316 196v20m-10-10h20" stroke="{PINE}" stroke-width="2.6"/>
{_label(324, 172, "PRAXIS", "middle", SOFT, 9.5)}
<path d="M414 330v-84c56-44 112-44 168 0v84" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
<path d="M438 330v-58m36 58v-72m36 72v-72m36 72v-58" stroke="{LEAFSOFT}" stroke-width="10"/>
{_label(498, 172, "SPORTHALLE", "middle", SOFT, 9.5)}
{_ground(84, 592, 330)}
{_leader(169, 180, 169, 136)}<line x1="169" y1="136" x2="215" y2="136" stroke="{FAINT}"/>
{_label(221, 139, "WARMWASSER = GROSSVERBRAUCHER")}
{_leader(498, 246, 498, 366)}{_label(507, 369, "FLUTLICHT &amp; HALLENLICHT AUF LED")}
""", "GREEN · SCHEMA WEITERE NWG", "Schema: Weitere Nichtwohngebäude – Hotel, Praxis und Sporthalle")


# ------------------------------------------------------------ GModG & Co. ---

def illus_gmodg_zeitstrahl():
    ms = [
        (2026, "GModG IN KRAFT", "29.07.2026", True),
        (2027, "BEDARFSAUSWEIS-PFLICHT NWG", "SOLARPFLICHT STARTET", False),
        (2028, "NULLEMISSION:", "&#214;FFENTL. NEUBAU", False),
        (2029, "GEB&#196;UDEAUTOMATION", "&gt;70 kW BIS 31.12.", False),
        (2030, "MEPS-STUFE 1", "NULLEMISSION ALLE NEUBAUTEN", False),
        (2033, "MEPS-STUFE 2", "BESTAND", False),
        (2040, "BIO-ANTEIL 60&#8239;%", "GAS/&#214;L NEUANLAGEN", False),
    ]
    x0, x1 = 70, 850
    parts = [f'<line x1="{x0}" y1="150" x2="{x1}" y2="150" stroke="{DEEP}" stroke-width="2.4"/>',
             f'<path d="M{x1} 150l-10-5v10z" fill="{DEEP}"/>']
    for i, (year, l1, l2, hot) in enumerate(ms):
        x = x0 + 40 + i * (x1 - x0 - 90) / (len(ms) - 1)
        up = i % 2 == 0
        ly = 108 if up else 196
        parts.append(f'<line x1="{x:.0f}" y1="150" x2="{x:.0f}" y2="{ly + (14 if up else -22)}" stroke="{FAINT}"/>')
        color = AMBER if hot else PINE
        parts.append(f'<circle cx="{x:.0f}" cy="150" r="{7 if hot else 5.5}" fill="{color}" stroke="#fff" stroke-width="2"/>')
        parts.append(f"<text x='{x:.0f}' y='{ly - 14 if up else ly + 14}' text-anchor='middle' {DISPLAY} font-size='15' fill='{AMBERDEEP if hot else DEEP}'>{year}</text>")
        parts.append(_label(x, ly if up else ly + 28, l1, "middle", INK, 9.5))
        parts.append(_label(x, (ly + 12) if up else ly + 40, l2, "middle", FAINT, 8.5))
    return frame(920, 284, "".join(parts), "GREEN · GMODG-FRISTEN NWG · STAND 08/2026",
                 "Zeitstrahl der GModG-Fristen für Nichtwohngebäude von 2026 bis 2040")


def illus_bio_treppe():
    data = [(2029, 10), (2030, 15), (2035, 30), (2040, 60)]
    x0, y0 = 90, 300
    bw, gap = 92, 42
    parts = [f'<line x1="{x0 - 20}" y1="{y0}" x2="{x0 + 4 * (bw + gap)}" y2="{y0}" stroke="{HAIR}" stroke-width="1.5"/>']
    for i, (year, pct) in enumerate(data):
        h = pct * 3.4
        x = x0 + i * (bw + gap)
        parts.append(f'<path d="M{x} {y0 - h + 4}a4 4 0 0 1 4-4h{bw - 8}a4 4 0 0 1 4 4V{y0}H{x}Z" fill="{PINE}"/>')
        parts.append(f"<text x='{x + bw / 2:.0f}' y='{y0 - h - 12}' text-anchor='middle' {DISPLAY} font-size='19' fill='{DEEP}'>{pct}&#8239;%</text>")
        parts.append(_label(x + bw / 2, y0 + 20, f"AB {year}", "middle", SOFT, 10))
    parts.append(_label(x0 - 20, 84, "MINDESTANTEIL BIOGENER BRENNSTOFFE/WASSERSTOFF", "start", SOFT, 10))
    parts.append(_label(x0 - 20, 100, "F&#220;R NEU EINGEBAUTE GAS-/&#214;L-HEIZUNGEN (&#167;&#8239;GMODG)", "start", FAINT, 9))
    return frame(640, 360, "".join(parts), "GREEN · BIO-TREPPE · STAND 08/2026",
                 "Balkendiagramm der Bio-Treppe: Mindestanteile erneuerbarer Brennstoffe für neue Gas- und Ölheizungen, 10 Prozent ab 2029 bis 60 Prozent ab 2040")


def illus_nullemission():
    return frame(640, 400, f"""
<rect x="150" y="150" width="200" height="180" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(166, 168, 4, 3, 30, 26, 12)}
<path d="M150 150 250 96l100 54z" fill="{DEEP}"/>
<path d="M180 138l50-28m-20 32 50-28m-16 32 50-28" stroke="{LEAF}" stroke-width="1.4"/>
<rect x="378" y="260" width="60" height="70" rx="5" fill="#fff" stroke="{DEEP}" stroke-width="2"/>
<circle cx="408" cy="288" r="16" stroke="{PINE}" stroke-width="2"/>
<line x1="350" y1="296" x2="378" y2="296" stroke="{AMBER}" stroke-width="2.2" class="flow-line"/>
<circle cx="490" cy="170" r="44" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="2.4"/>
<text x="490" y="165" text-anchor="middle" {DISPLAY} font-size="26" fill="{DEEP}">0</text>
<text x="490" y="188" text-anchor="middle" {MONO} font-size="8.5" fill="{SOFT}">CO&#8322; FOSSIL</text>
<path d="M446 200c-20 18-44 26-70 28" stroke="{FAINT}" stroke-dasharray="3 5"/>
{_ground(120, 560, 330)}
{_leader(250, 122, 250, 96)}<line x1="250" y1="96" x2="296" y2="96" stroke="{FAINT}"/>
{_label(302, 99, "PV-VOLLBELEGUNG")}
{_label(150, 369, "NULLEMISSIONSSTANDARD: &#214;FFENTL. NEUBAU AB 2028 &#183; ALLE NEUBAUTEN AB 2030", "start", FAINT, 9)}
""", "GREEN · NULLEMISSIONSGEB&#196;UDE", "Schema: Nullemissionsgebäude mit Photovoltaik und Wärmepumpe, null CO2 aus fossilen Brennstoffen")


def illus_fahrplan():
    pts = [(90, 130), (230, 130), (230, 172), (370, 172), (370, 224), (510, 224), (510, 276), (560, 276)]
    path = "M" + " L".join(f"{x} {y}" for x, y in pts)
    marks = [(230, 130, "LED + SENSORIK"), (370, 172, "L&#220;FTUNG + WRG"), (510, 224, "W&#196;RMEPUMPE + PV")]
    inner = [
        f'<line x1="70" y1="300" x2="580" y2="300" stroke="{HAIR}" stroke-width="1.5"/>',
        f'<line x1="70" y1="300" x2="70" y2="90" stroke="{HAIR}" stroke-width="1.5"/>',
        _label(78, 96, "ENERGIEKOSTEN", "start", SOFT, 10),
        f'<path d="{path}" stroke="{PINE}" stroke-width="2.6" stroke-linejoin="round"/>',
        f'<path d="{path} L560 300 L90 300Z" fill="{LEAFSOFT}" opacity="0.55"/>',
    ]
    for x, y, t in marks:
        inner.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{AMBER}" stroke="#fff" stroke-width="2.4"/>')
        inner.append(f'<line x1="{x}" y1="{y - 10}" x2="{x}" y2="{y - 34}" stroke="{FAINT}"/>')
        inner.append(_label(x, y - 40, t, "middle", INK, 9.5))
    inner.append(f'<circle cx="560" cy="276" r="5" fill="{PINE}"/>')
    inner.append(f"<text x='548' y='262' text-anchor='end' {DISPLAY} font-size='17' fill='{DEEP}'>−70&#8239;%</text>")
    inner.append(_label(90, 322, "JAHR 1", "start", FAINT, 9))
    inner.append(_label(560, 322, "JAHR 5", "end", FAINT, 9))
    return frame(640, 360, "".join(inner), "GREEN · SANIERUNGSFAHRPLAN (SCHEMA)",
                 "Schema eines Sanierungsfahrplans: Energiekosten sinken in Stufen durch LED, Lüftung mit Wärmerückgewinnung, Wärmepumpe und Photovoltaik um bis zu 70 Prozent")


def illus_energieaudit():
    checks = "".join(
        f'<rect x="176" y="{150 + i * 38}" width="18" height="18" rx="4" fill="{LEAFSOFT}" stroke="{PINE}" stroke-width="1.6"/>'
        f'<path d="M180 {158 + i * 38}l4 5 7-9" stroke="{PINE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<line x1="208" y1="{159 + i * 38}" x2="{330 - i * 18}" y2="{159 + i * 38}" stroke="{HAIR}" stroke-width="5" stroke-linecap="round"/>'
        for i in range(4)
    )
    return frame(640, 400, f"""
<path d="M150 110h180l60 60v170H150Z" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
<path d="M330 110v60h60" fill="{PAPER}" stroke="{DEEP}" stroke-width="2.2"/>
{checks}
<rect x="150" y="86" width="150" height="26" rx="6" fill="{DEEP}"/>
<text x="162" y="103" {MONO} font-size="10.5" fill="#fff">DIN EN 16247</text>
<circle cx="446" cy="256" r="52" fill="none" stroke="{PINE}" stroke-width="3"/>
<line x1="483" y1="293" x2="524" y2="334" stroke="{PINE}" stroke-width="6" stroke-linecap="round"/>
<path d="M420 268c10-22 34-30 52-22" stroke="{LEAF}" stroke-width="2"/>
{_leader(446, 204, 446, 150)}<line x1="446" y1="150" x2="492" y2="150" stroke="{FAINT}"/>
{_label(498, 153, "PFLICHT F&#220;R")}
{_label(498, 166, "NICHT-KMU ALLE 4 JAHRE", "start", FAINT, 9)}
{_label(150, 369, "AUS DER PFLICHT WIRD EIN INVESTITIONSFAHRPLAN", "start", FAINT, 9)}
""", "GREEN · ENERGIEAUDIT", "Schema: Energieaudit nach DIN EN 16247 – geprüfte Checkliste mit Lupe")


def illus_foerderung():
    return frame(640, 360, f"""
<text x="90" y="120" {DISPLAY} font-size="30" fill="{DEEP}">50&#8239;/&#8239;50</text>
{_label(90, 142, "SO FINANZIERT SICH IHRE ENERGIEBERATUNG (EBN)", "start", SOFT, 10)}
<path d="M90 190a10 10 0 0 1 10-10h215v70H100a10 10 0 0 1-10-10z" fill="{AMBER}"/>
<path d="M319 180h215a10 10 0 0 1 10 10v50a10 10 0 0 1-10 10H319z" fill="{PINE}"/>
<line x1="317" y1="176" x2="317" y2="254" stroke="#fff" stroke-width="4"/>
<text x="202" y="222" text-anchor="middle" {SANS} font-weight="600" font-size="15" fill="{DEEPER}">Zuschuss Bund</text>
<text x="428" y="215" text-anchor="middle" {SANS} font-weight="600" font-size="15" fill="#fff">Ihr Anteil</text>
<text x="428" y="233" text-anchor="middle" {MONO} font-size="9" fill="{FAINT}">STEUERLICH ABSETZBAR</text>
{_label(90, 290, "BUNDESF&#214;RDERUNG ENERGIEBERATUNG NICHTWOHNGEB&#196;UDE:", "start", SOFT, 10)}
{_label(90, 306, "50&#8239;% DES HONORARS, MAX. 4.000&#8239;&#8364; &#183; ANTRAG &#220;BERNEHMEN WIR", "start", FAINT, 9.5)}
""", "GREEN · F&#214;RDERUNG EBN", "Grafik: Bis zu 50 Prozent Zuschuss des Bundes zur Energieberatung für Nichtwohngebäude")


def illus_prozess():
    steps = [("01", "GESPR&#196;CH", "kostenlos"), ("02", "ANALYSE", "vor Ort"), ("03", "KONZEPT", "+ F&#246;rderung"), ("04", "UMSETZUNG", "+ Nachweis")]
    parts = []
    for i, (num, t, sub) in enumerate(steps):
        x = 82 + i * 130
        parts.append(f'<circle cx="{x + 44}" cy="150" r="38" fill="{"#fff" if i < 3 else LEAFSOFT}" stroke="{PINE}" stroke-width="2.2"/>')
        parts.append(f"<text x='{x + 44}' y='146' text-anchor='middle' {DISPLAY} font-size='17' fill='{AMBERDEEP}'>{num}</text>")
        parts.append(_label(x + 44, 163, t, "middle", INK, 9.5))
        parts.append(_label(x + 44, 212, sub, "middle", FAINT, 9))
        if i < 3:
            parts.append(f'<line x1="{x + 88}" y1="150" x2="{x + 124}" y2="150" stroke="{AMBER}" stroke-width="2.2" class="flow-line"/>')
            parts.append(f'<path d="M{x + 124} 150l-8-4v8z" fill="{AMBER}"/>')
    parts.append(_label(82, 96, "VOM ERSTGESPR&#196;CH ZUR NACHGEWIESENEN EINSPARUNG", "start", SOFT, 10))
    return frame(640, 260, "".join(parts), "GREEN · ABLAUF",
                 "Prozessgrafik: vier Schritte von Erstgespräch über Analyse und Konzept bis Umsetzung")


def illus_standort():
    return frame(640, 400, f"""
<rect x="150" y="170" width="180" height="160" fill="#fff" stroke="{DEEP}" stroke-width="2.2"/>
{_win_grid(166, 188, 4, 3, 30, 26, 10)}
<path d="M150 170 176 142h128l26 28z" fill="{DEEP}"/>
<path d="M240 96c-22 0-38 16-38 36 0 26 38 58 38 58s38-32 38-58c0-20-16-36-38-36z" fill="{AMBER}" stroke="{DEEPER}" stroke-width="2"/>
<circle cx="240" cy="132" r="12" fill="#fff"/>
<path d="M360 210h150m-150 50h110m-110 50h130" stroke="{FAINT}" stroke-dasharray="4 6"/>
<path d="M510 210l-9-5v10zm-40 50l-9-5v10zm20 50-9-5v10z" fill="{FAINT}"/>
{_label(520, 213, "OWL")}
{_label(480, 263, "HOCHSTIFT")}
{_label(500, 313, "NRW")}
{_ground(120, 560, 330)}
{_label(150, 369, "GREEN &#183; ROLANDSWEG 80 &#183; 33102 PADERBORN &#183; MO&#8211;FR 08&#8211;16 UHR", "start", FAINT, 9)}
""", "GREEN · STANDORT PADERBORN", "Schema: Bürostandort Paderborn, Rolandsweg 80, mit Einsatzrichtungen OWL, Hochstift und NRW")


ILLUSTRATIONS = {
    "schema-buero": illus_buero,
    "schema-einzelhandel": illus_einzelhandel,
    "schema-produktion": illus_produktion,
    "schema-veranstaltung": illus_veranstaltung,
    "schema-bildung": illus_bildung,
    "schema-kindergarten": illus_kindergarten,
    "schema-kommune": illus_kommune,
    "schema-andere": illus_andere,
    "gmodg-zeitstrahl": illus_gmodg_zeitstrahl,
    "gmodg-bio-treppe": illus_bio_treppe,
    "gmodg-nullemission": illus_nullemission,
    "sanierungsfahrplan": illus_fahrplan,
    "energieaudit-din-16247": illus_energieaudit,
    "foerderung-ebn-50-50": illus_foerderung,
    "prozess-ablauf": illus_prozess,
    "standort-paderborn": illus_standort,
}
