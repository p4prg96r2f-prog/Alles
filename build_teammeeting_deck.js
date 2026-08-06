/**
 * WERK.E - Grosses Team-Meeting 07.08.2026
 * Rueckblick 16.07. - 06.08.2026
 *
 * Erzeugt: WERKE_Teammeeting_2026-08-07.pptx
 * Aufruf:  node build_teammeeting_deck.js
 */

const pptxgen = require("pptxgenjs");

/* ------------------------------------------------------------------ *
 * WERK.E Corporate-Palette (aus WERKE_Preisrechner / Design System)
 * ------------------------------------------------------------------ */
const INK        = "1A1819";
const GREEN_DARK = "2E7D3A";
const GREEN_MID  = "256A30";
const GREEN      = "58B264";
const GREEN_LT   = "EDF5EE";
const SAGE       = "BFDCC4";
const PAPER      = "F5F6F3";
const LINE       = "D5DDD6";
const MUTE       = "5B685D";
const AMBER      = "8A6100";
const AMBER_BG   = "FFF6E0";
const AMBER_LINE = "E8CC8A";
const RED        = "B5544D";
const WHITE      = "FFFFFF";

const HEAD = "Trebuchet MS";   // Marken-Headline
const BODY = "Calibri";        // Fliesstext

const W = 13.33;
const H = 7.5;
const M = 0.62;                // Seitenrand
const CW = W - 2 * M;          // nutzbare Breite

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "WERK.E Energie-Effizienz-Beratung";
pres.company = "WERK.E Energie-Effizienz-Beratungs GmbH und Co. KG";
pres.title = "Grosses Team-Meeting - 07.08.2026";

/* ------------------------------------------------------------------ *
 * Bausteine
 * ------------------------------------------------------------------ */

// Heller Standard-Foliekopf
function contentSlide(kicker, title, opts) {
  opts = opts || {};
  const s = pres.addSlide();
  s.background = { color: opts.bg || WHITE };

  s.addText(kicker.toUpperCase(), {
    x: M, y: 0.40, w: CW, h: 0.26,
    fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1.6,
    color: opts.kickerColor || GREEN_DARK, margin: 0, valign: "middle",
  });

  s.addText(title, {
    x: M, y: 0.68, w: opts.titleW || CW, h: 0.72,
    fontFace: HEAD, fontSize: opts.titleSize || 32, bold: true,
    color: opts.titleColor || INK, margin: 0, valign: "middle",
  });

  if (opts.sub) {
    s.addText(opts.sub, {
      x: M, y: 1.40, w: opts.subW || CW, h: 0.34,
      fontFace: BODY, fontSize: 14, color: MUTE, margin: 0, valign: "middle",
    });
  }
  return s;
}

// Karte mit dezenter Tonung (kein Randstreifen!)
function card(s, x, y, w, h, fill, opts) {
  opts = opts || {};
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fill },
    line: opts.line ? { color: opts.line, width: 1 } : { type: "none" },
    rectRadius: opts.radius === undefined ? 0.09 : opts.radius,
    shadow: opts.shadow
      ? { type: "outer", color: "000000", opacity: 0.07, blur: 10, offset: 2, angle: 90 }
      : undefined,
  });
}

// Ziffer / Kuerzel im Kreis
function badge(s, x, y, d, text, fill, color, size) {
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" },
  });
  s.addText(text, {
    x, y, w: d, h: d,
    fontFace: BODY, fontSize: size || 13, bold: true, color: color || WHITE,
    align: "center", valign: "middle", margin: 0,
  });
}

// Fusszeile
function footer(s, txt) {
  s.addText(txt, {
    x: M, y: H - 0.46, w: CW, h: 0.26,
    fontFace: BODY, fontSize: 9, color: MUTE, margin: 0, valign: "middle",
  });
}

// Amber-Hinweisbox
function noteBox(s, x, y, w, h, label, text) {
  card(s, x, y, w, h, AMBER_BG, { line: AMBER_LINE });
  s.addText(
    [
      { text: label + "  ", options: { bold: true, color: AMBER } },
      { text: text, options: { color: INK } },
    ],
    {
      x: x + 0.22, y: y + 0.06, w: w - 0.44, h: h - 0.12,
      fontFace: BODY, fontSize: 12, margin: 0, valign: "middle",
    }
  );
}

// Kapitel-Trenner (dunkel)
function divider(num, kicker, title, bullets) {
  const s = pres.addSlide();
  s.background = { color: INK };

  s.addShape(pres.ShapeType.ellipse, {
    x: W - 3.1, y: -1.5, w: 5.0, h: 5.0,
    fill: { color: GREEN_MID }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: W - 1.6, y: 3.9, w: 2.6, h: 2.6,
    fill: { color: GREEN_DARK }, line: { type: "none" },
  });

  s.addText(num, {
    x: M, y: 1.55, w: 2.2, h: 1.5,
    fontFace: HEAD, fontSize: 84, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText(kicker.toUpperCase(), {
    x: M, y: 3.05, w: 8.2, h: 0.3,
    fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1.8, color: SAGE,
    margin: 0, valign: "middle",
  });
  s.addText(title, {
    x: M, y: 3.36, w: 8.4, h: 1.0,
    fontFace: HEAD, fontSize: 38, bold: true, color: WHITE, margin: 0, valign: "middle",
  });

  if (bullets && bullets.length) {
    s.addText(
      bullets.map((b, i) => ({
        text: b,
        options: { bullet: true, breakLine: i < bullets.length - 1 },
      })),
      {
        x: M + 0.05, y: 4.5, w: 8.0, h: 1.5,
        fontFace: BODY, fontSize: 14, color: "C9D2CA",
        paraSpaceAfter: 6, margin: 0,
      }
    );
  }
  return s;
}

/* ================================================================== *
 * 01 - TITEL
 * ================================================================== */
{
  const s = pres.addSlide();
  s.background = { color: INK };

  s.addShape(pres.ShapeType.ellipse, {
    x: 9.4, y: -2.0, w: 6.4, h: 6.4,
    fill: { color: GREEN_MID }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 11.3, y: 4.5, w: 3.4, h: 3.4,
    fill: { color: GREEN_DARK }, line: { type: "none" },
  });

  s.addText("WERK.E", {
    x: M, y: 0.85, w: 6, h: 0.5,
    fontFace: HEAD, fontSize: 22, bold: true, charSpacing: 3.5, color: GREEN,
    margin: 0, valign: "middle",
  });
  s.addText("Energie-Effizienz-Beratung", {
    x: M, y: 1.28, w: 6, h: 0.3,
    fontFace: BODY, fontSize: 12, charSpacing: 1.2, color: MUTE,
    margin: 0, valign: "middle",
  });

  s.addText("Grosses Team-Meeting", {
    x: M, y: 2.55, w: 8.6, h: 0.95,
    fontFace: HEAD, fontSize: 46, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addText("Was in den letzten drei Wochen passiert ist -\nund was jetzt vor uns liegt.", {
    x: M, y: 3.62, w: 8.2, h: 0.95,
    fontFace: BODY, fontSize: 17, color: "C9D2CA", lineSpacing: 26,
    margin: 0, valign: "top",
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.15, w: 4.35, h: 0.62,
    fill: { color: GREEN_DARK }, line: { type: "none" }, rectRadius: 0.31,
  });
  s.addText("Freitag, 07.08.2026  ·  09:00 Uhr", {
    x: M, y: 5.15, w: 4.35, h: 0.62,
    fontFace: BODY, fontSize: 13, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0,
  });

  s.addText("Rolandsweg 80, Paderborn  ·  Berichtszeitraum 16.07. - 06.08.2026", {
    x: M, y: 6.05, w: 8.6, h: 0.3,
    fontFace: BODY, fontSize: 11, color: MUTE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Begruessung. Erstes vollstaendiges Zusammenkommen nach der Sommerpause - " +
    "das Frühstück am 24.07. ist urlaubsbedingt ausgefallen.\n\n" +
    "Kurz abholen: Wer war im Urlaub, wer ist neu dabei. " +
    "Dann direkt zum Hauptthema ueberleiten - in meinem Urlaub ist das GModG verkuendet worden."
  );
}

/* ================================================================== *
 * 02 - AGENDA
 * ================================================================== */
{
  const s = contentSlide("Agenda", "Worüber wir heute sprechen", {
    sub: "Drei Blöcke. Der erste ist der wichtigste.",
  });

  const items = [
    ["01", "Das GModG ist da", "Was das neue Gebäudemodernisierungs-\ngesetz ändert - und ab wann", GREEN_DARK],
    ["02", "Praxis & Außenwirkung", "Förderanträge, unsere Schulungen,\nPresse und neue Werkzeuge", GREEN],
    ["03", "Team & Kultur", "Code of Conduct, Personelles,\nTermine bis September", MUTE],
  ];

  let y = 2.05;
  items.forEach(([num, title, desc, col]) => {
    card(s, M, y, CW, 1.42, PAPER, { shadow: true });
    badge(s, M + 0.36, y + 0.42, 0.58, num, col, WHITE, 17);
    s.addText(title, {
      x: M + 1.18, y: y + 0.28, w: 5.2, h: 0.42,
      fontFace: HEAD, fontSize: 21, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(desc, {
      x: M + 1.18, y: y + 0.70, w: 6.4, h: 0.56,
      fontFace: BODY, fontSize: 12.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 16,
    });
    y += 1.62;
  });

  s.addText("~ 60 Min.", {
    x: W - M - 2.0, y: 2.05, w: 1.8, h: 0.4,
    fontFace: BODY, fontSize: 12, bold: true, color: GREEN_DARK,
    align: "right", margin: 0, valign: "middle",
  });

  s.addNotes(
    "Erwartungsmanagement: Block 1 nimmt gut zwei Drittel der Zeit ein. " +
    "Fragen zum GModG sammeln wir direkt im Block, nicht erst am Ende.\n\n" +
    "Hinweis ans Team: Die Schulungsunterlagen (38 Folien Neubau+Sanierung, " +
    "25 Folien Schornsteinfeger) liegen in Teams und koennen jederzeit nachgelesen werden."
  );
  footer(s, "WERK.E · Team-Meeting 07.08.2026");
}

/* ================================================================== *
 * 03 - KAPITEL 1
 * ================================================================== */
divider("01", "Kapitel 1 · Gesetzeslage", "Das GModG ist da.", [
  "Beschlossen von Bundestag und Bundesrat am 09.07.2026",
  "In unserer Sommerpause im Bundesgesetzblatt verkündet",
  "Die 65-%-Pflicht ist Geschichte - dafür kommt sehr viel Neues",
]).addNotes(
  "Uebergang: Als ich in den Urlaub gefahren bin, war das Gesetz beschlossen, aber noch nicht verkuendet. " +
  "Jetzt ist es verkuendet - unser Schornsteinfeger-Deck vom 03.08. traegt bereits den Vermerk 'verkuendete Fassung'.\n\n" +
  "Wichtig fuer das Team: Das ist keine Ankuendigung mehr, sondern geltendes Recht."
);

/* ================================================================== *
 * 04 - STATUS / ZEITLEISTE
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Wo stehen wir", "Vom Entwurf zum geltenden Recht", {
    sub: "Basis: BT-Drucksache 21/7009 vom 08.07.2026 · 176 Seiten, vollständig ausgewertet",
  });

  const steps = [
    ["11.06.", "1. Lesung\nBundestag", false],
    ["22.06.", "Anhörung\n(viel Kritik)", false],
    ["08.07.", "Ausschuss\nDrs. 21/7009", false],
    ["09.07.", "Bundestag +\nBundesrat: Ja", false],
    ["Juli 26", "Verkündung im\nBundesgesetzblatt", true],
  ];

  const bw = 2.28;
  const gap = (CW - 5 * bw) / 4;
  let x = M;

  // Verbindungslinie
  s.addShape(pres.ShapeType.rect, {
    x: M + bw / 2, y: 2.62, w: CW - bw, h: 0.035,
    fill: { color: LINE }, line: { type: "none" },
  });

  steps.forEach(([date, label, done]) => {
    const col = done ? GREEN_DARK : SAGE;
    s.addShape(pres.ShapeType.ellipse, {
      x: x + bw / 2 - 0.15, y: 2.49, w: 0.30, h: 0.30,
      fill: { color: col }, line: { color: WHITE, width: 2.5 },
    });
    s.addText(date, {
      x, y: 2.02, w: bw, h: 0.34,
      fontFace: HEAD, fontSize: 16, bold: true,
      color: done ? GREEN_DARK : INK, align: "center", margin: 0, valign: "middle",
    });
    s.addText(label, {
      x, y: 2.92, w: bw, h: 0.72,
      fontFace: BODY, fontSize: 11.5, color: MUTE,
      align: "center", margin: 0, valign: "top", lineSpacing: 15,
    });
    x += bw + gap;
  });

  card(s, M, 4.02, CW * 0.485, 1.6, GREEN_LT);
  s.addText("Was jetzt sofort gilt", {
    x: M + 0.28, y: 4.20, w: CW * 0.485 - 0.56, h: 0.32,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "65-%-EE-Pflicht und Betriebsverbote gestrichen", options: { bullet: true, breakLine: true } },
      { text: "Neues Heizungsrecht §§ 42 bis 46 in Kraft", options: { bullet: true, breakLine: true } },
      { text: "Havarie-Regeln und neues Mietrecht greifen", options: { bullet: true } },
    ],
    {
      x: M + 0.33, y: 4.56, w: CW * 0.485 - 0.66, h: 0.95,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 4, margin: 0,
    }
  );

  card(s, M + CW * 0.515, 4.02, CW * 0.485, 1.6, PAPER);
  s.addText("Was erst später kommt", {
    x: M + CW * 0.515 + 0.28, y: 4.20, w: CW * 0.485 - 0.56, h: 0.32,
    fontFace: HEAD, fontSize: 15, bold: true, color: INK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Stufe 2 rund um den 01.01.2027: neue Rechenregeln", options: { bullet: true, breakLine: true } },
      { text: "Genaues Datum = 1. Tag des 6. Monats nach Verkündung", options: { bullet: true, breakLine: true } },
      { text: "Bis dahin rechnen wir unverändert nach DIN V 18599:2018", options: { bullet: true } },
    ],
    {
      x: M + CW * 0.515 + 0.33, y: 4.56, w: CW * 0.485 - 0.66, h: 0.95,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 4, margin: 0,
    }
  );

  s.addNotes(
    "Der Ablauf war sehr schnell: erste Lesung 11.06., beschlossen 09.07.\n\n" +
    "Wichtig: Das Stufe-2-Datum haengt am Verkuendungsmonat - erster Tag des sechsten Folgemonats. " +
    "Ich pruefe das exakte Datum und gebe es im Sanierungs-Chat durch.\n\n" +
    "Randnotiz falls Frage kommt: Die Deutsche Umwelthilfe hatte am 14.07. den Bundespraesidenten " +
    "gebeten zu pruefen, ob § 88a das Gesetz zustimmungspflichtig macht. Das hat den Prozess nicht gestoppt."
  );
  footer(s, "Quelle: BT-Drs. 21/7009 · WERK.E Teamschulung GModG");
}

/* ================================================================== *
 * 05 - DIE SECHS GROSSEN AENDERUNGEN
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Systemwechsel", "Die sechs großen Änderungen", {
    sub: "Weniger Heizungsgesetz, mehr EU-Gebäuderichtlinie.",
  });

  const items = [
    ["Heizung: 65 % gestrichen", "§§ 71-73 entfallen samt Betriebsverboten. Neu: Optionen-\nkatalog + Bio-Treppe für fossile Kessel.", GREEN_DARK],
    ["Neues Rechenregime", "DIN/TS 18599:2025-10, neue Bezugsfläche „Nutzfläche\",\nneues Referenzgebäude, neue Faktoren.", GREEN_DARK],
    ["NWG-Bestand: Pflicht", "Erstmals Mindesteffizienz für Nichtwohngebäude -\nab 2030 und 2033 (§§ 40, 41).", GREEN],
    ["Energieausweise neu", "NWG nur noch Bedarfsausweis, eigene Klassen A-G,\nTHG-Angaben, digital + maschinenlesbar.", GREEN],
    ["Neubau: Nullemission", "Öffentliche NWG ab 2028, alle Neubauten ab 2030.\nPlus Ökobilanz-Bericht (§ 88b).", MUTE],
    ["Solarpflicht + Ladepunkte", "Bundesweite Solarpflicht gestaffelt ab 2027 (§ 106),\nGEIG-Pflichten für Bestands-NWG ab 2027.", MUTE],
  ];

  const cw = (CW - 0.38) / 2;
  const ch = 1.36;
  let i = 0;
  items.forEach(([t, d, col]) => {
    const cx = M + (i % 2) * (cw + 0.38);
    const cy = 2.02 + Math.floor(i / 2) * (ch + 0.30);
    card(s, cx, cy, cw, ch, PAPER, { shadow: true });
    badge(s, cx + 0.30, cy + 0.30, 0.40, String(i + 1), col, WHITE, 13);
    s.addText(t, {
      x: cx + 0.86, y: cy + 0.22, w: cw - 1.12, h: 0.36,
      fontFace: HEAD, fontSize: 15.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: cx + 0.86, y: cy + 0.60, w: cw - 1.10, h: 0.62,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
    });
    i++;
  });

  s.addNotes(
    "Das ist die Kurzfassung des ganzen Gesetzes auf einer Folie.\n\n" +
    "Kernbotschaft: Die Pflichten haengen jetzt am Brennstoff, nicht mehr an der Technik. " +
    "Und der Schwerpunkt verschiebt sich vom Heizungstausch zur EU-Gebaeuderichtlinie - " +
    "Bestandspflichten, neue Rechenregeln, Nullemission.\n\n" +
    "Punkte 3 bis 6 sind fuer uns geschaeftlich die interessanten: Da entstehen neue Leistungen."
  );
  footer(s, "Artikel 1 bis 9 des Änderungsgesetzes · BT-Drs. 21/7009");
}

/* ================================================================== *
 * 06 - INKRAFTTRETEN
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Artikel 9", "Ein Gesetz, fünf Zeitstufen", {
    sub: "Fast alles hat ein Datum. Wer die Fristen kennt, plant Projekte rechtssicher.",
  });

  const cols = [
    ["Tag nach\nVerkündung", ["GEG wird GModG", "65 % + Betriebs-\nverbote weg", "Neues Heizungs-\nrecht §§ 42-46", "Havarie + Mietrecht"], GREEN_DARK, true],
    ["≈ 01.01.2027\nStufe 2", ["Rechenregeln neu", "Ausweisrecht neu", "NWG-Pflicht +\nSolarpflicht", "Prüfpflichten, GEIG"], GREEN, false],
    ["01.01.2028", ["Nullemission neue\nöffentliche NWG", "CO₂ + Netzentgelte\nhälftig", "THG-Bericht ab\n1.000 m²"], SAGE, false],
    ["01.01.2029", ["Bio-Treppe Stufe 1:\n10 %", "Brennstoffkosten\nhälftig, Deckel 30 %", "Gebäudeautomation\nbis Ende 2029"], SAGE, false],
    ["01.01.2030", ["Nullemission alle\nNeubauten", "Referenz-fp 0,70", "NWG max. 3,5 ×\nReferenz", "Solarpflicht neue WG"], SAGE, false],
  ];

  const bw = (CW - 4 * 0.20) / 5;
  let x = M;
  cols.forEach(([head, list, col, dark]) => {
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.98, w: bw, h: 0.76,
      fill: { color: col }, line: { type: "none" }, rectRadius: 0.08,
    });
    s.addText(head, {
      x: x + 0.08, y: 1.98, w: bw - 0.16, h: 0.76,
      fontFace: HEAD, fontSize: 13, bold: true,
      color: dark || col === GREEN ? WHITE : INK,
      align: "center", valign: "middle", margin: 0, lineSpacing: 16,
    });

    card(s, x, 2.86, bw, 2.62, PAPER);
    s.addText(
      list.map((t, k) => ({
        text: t,
        options: { bullet: true, breakLine: k < list.length - 1 },
      })),
      {
        x: x + 0.20, y: 3.02, w: bw - 0.36, h: 2.32,
        fontFace: BODY, fontSize: 10.5, color: INK,
        paraSpaceAfter: 7, margin: 0, valign: "top", lineSpacing: 13,
      }
    );
    x += bw + 0.20;
  });

  noteBox(s, M, 5.66, CW, 0.62, "Danach:",
    "2033 NWG-Stufe 2  ·  2035 Bio-Treppe 30 %  ·  2040 Bio-Treppe 60 %  ·  2045 Brennstoffe klimaneutral über die Lieferantenquote");

  s.addNotes(
    "Diese Folie bitte fotografieren - das ist die Orientierung fuer die naechsten Jahre.\n\n" +
    "Fuer den Alltag zaehlen vor allem die ersten beiden Spalten: Was heute schon gilt, " +
    "und was zum 01.01.2027 auf uns zukommt.\n\n" +
    "Stufe 2 = erster Tag des sechsten Kalendermonats nach Verkuendung."
  );
  footer(s, "Artikel 9 des Änderungsgesetzes · Drs. 21/7009, S. 159");
}

/* ================================================================== *
 * 07 - HEIZUNGSRECHT ALT / NEU
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Heizungsrecht", "Heizungstausch: alt gegen neu", {
    sub: "Was ihr Kundinnen und Kunden ab sofort anders erzählt.",
  });

  const rows = [
    ["Grundregel", "65 % erneuerbare Energien\nbei jedem Heizungstausch", "Freie Wahl aus 10 Optionen,\nnur Maßgaben §§ 43-46"],
    ["Fossile Kessel", "Nur über 65-%-Nachweis\noder Übergangsregeln", "Zulässig - ab 2029 mit\nsteigendem Bioanteil (§ 43)"],
    ["Betriebsverbote", "Aus für fossile Kessel\nEnde 2044, 30-Jahre-Regel", "Ersatzlos gestrichen"],
    ["Beratungspflicht", "Pflichtberatung vor\nfossilem Einbau", "Entfällt - wir dokumentieren\ntrotzdem schriftlich"],
    ["Ziel 2045", "Pflicht lag beim Eigentümer\n(100 % erneuerbar)", "Quote bei den Brennstoff-\nlieferanten (§ 42a)"],
  ];

  const c0 = 2.45, c1 = (CW - c0 - 0.28) / 2;

  s.addText("Thema", {
    x: M + 0.06, y: 2.00, w: c0, h: 0.32,
    fontFace: BODY, fontSize: 10.5, bold: true, charSpacing: 1.2, color: MUTE, margin: 0, valign: "middle",
  });
  s.addText("GEG 2024  (bisher)", {
    x: M + c0 + 0.20, y: 2.00, w: c1, h: 0.32,
    fontFace: BODY, fontSize: 10.5, bold: true, charSpacing: 1.2, color: MUTE, margin: 0, valign: "middle",
  });
  s.addText("GMODG  (neu)", {
    x: M + c0 + c1 + 0.34, y: 2.00, w: c1, h: 0.32,
    fontFace: BODY, fontSize: 10.5, bold: true, charSpacing: 1.2, color: GREEN_DARK, margin: 0, valign: "middle",
  });

  let y = 2.40;
  rows.forEach(([a, b, c], i) => {
    const rh = 0.78;
    if (i % 2 === 0) card(s, M, y, CW, rh, PAPER, { radius: 0.05 });
    card(s, M + c0 + c1 + 0.28, y, c1 + 0.06, rh, GREEN_LT, { radius: 0.05 });

    s.addText(a, {
      x: M + 0.24, y, w: c0 - 0.2, h: rh,
      fontFace: HEAD, fontSize: 13, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: M + c0 + 0.20, y, w: c1 - 0.2, h: rh,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "middle", lineSpacing: 15,
    });
    s.addText(c, {
      x: M + c0 + c1 + 0.46, y, w: c1 - 0.2, h: rh,
      fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "middle", lineSpacing: 15,
    });
    y += rh + 0.06;
  });

  s.addNotes(
    "Das ist die Folie fuer die Kundenkommunikation. Wer noch 65-%-Konzepte im Kopf hat: bitte umstellen.\n\n" +
    "Wichtiger Punkt bei 'Beratungspflicht': Die gesetzliche Pflicht entfaellt, " +
    "aber wir dokumentieren unsere Empfehlung weiterhin schriftlich. Das ist Eigenschutz.\n\n" +
    "Und: 'Fossil ist erlaubt' heisst nicht 'fossil ist guenstig' - siehe uebernaechste Folie."
  );
  footer(s, "GEG 2024: §§ 71-73 (gestrichen) · GModG: §§ 42-46 und § 42a");
}

/* ================================================================== *
 * 08 - OPTIONENKATALOG § 42
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · § 42", "Zehn Optionen, freie Wahl", {
    sub: "Der Eigentümer wählt frei, Kombinationen sind zulässig. Gilt über § 10 Abs. 2 Nr. 3 auch im Neubau.",
  });

  const opts = [
    ["Gas / Öl /\nFlüssiggas", "mit Bio-Treppe § 43"],
    ["Wärmepumpe", "elektrisch"],
    ["Solarthermie", "Solar Keymark, § 44"],
    ["Biomasse /\nWasserstoff", "auch handbeschickt, § 45"],
    ["WP-Hybrid", "Wärmepumpe + Kessel"],
    ["Solarthermie-\nHybrid", "Solar + Kessel"],
    ["KWK-Anlage", "hocheffizient, neu"],
    ["Stromdirekt-\nheizung", "nur mit Hüllen-Bonus, § 46"],
    ["Wärmenetz-\nAnschluss", "Hausübergabestation"],
    ["Innovative\nLösung", "Auffangoption"],
  ];

  const cw = (CW - 4 * 0.22) / 5;
  const ch = 1.34;
  opts.forEach(([t, d], i) => {
    const cx = M + (i % 5) * (cw + 0.22);
    const cy = 2.10 + Math.floor(i / 5) * (ch + 0.26);
    const hi = i === 1 || i === 3 || i === 4;
    card(s, cx, cy, cw, ch, hi ? GREEN_LT : PAPER, { shadow: true });
    s.addText(t, {
      x: cx + 0.16, y: cy + 0.20, w: cw - 0.32, h: 0.66,
      fontFace: HEAD, fontSize: 13, bold: true,
      color: hi ? GREEN_DARK : INK, margin: 0, valign: "top", lineSpacing: 16,
    });
    s.addText(d, {
      x: cx + 0.16, y: cy + 0.88, w: cw - 0.32, h: 0.34,
      fontFace: BODY, fontSize: 10, color: MUTE, margin: 0, valign: "top", lineSpacing: 13,
    });
  });

  noteBox(s, M, 5.20, CW, 1.02, "Stromdirektheizung:",
    "Im Neubau nur, wenn die Hülle 45 % besser ist als §§ 16/19, im Bestand 30 % besser.\n" +
    "Ausnahme: Austausch einer Einzelraumheizung und selbstgenutzte Ein- bis Zweifamilienhäuser.");

  s.addNotes(
    "Zehn Optionen - das ist die zentrale Neuerung im Heizungsrecht.\n\n" +
    "Hervorgehoben sind die drei, die bei uns am haeufigsten vorkommen: " +
    "Waermepumpe, Biomasse und WP-Hybrid.\n\n" +
    "Neu im Katalog ist die hocheffiziente KWK-Anlage. " +
    "Und bei Biomasse: Das Merkmal 'automatisch beschickt' wurde gestrichen - " +
    "Scheitholzkessel erfuellen jetzt auch § 42."
  );
  footer(s, "§ 42 Abs. 2 GModG · Drs. 21/7009, S. 29-30");
}

/* ================================================================== *
 * 09 - BIO-TREPPE § 43
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · § 43", "Die Bio-Treppe", {
    sub: "Wer fossil einbaut, verpflichtet sich zu steigenden Bio-Anteilen.",
  });

  s.addChart(
    pres.ChartType.bar,
    [{ name: "Pflicht-Bioanteil", labels: ["ab 2029", "ab 2030", "ab 2035", "ab 2040"], values: [10, 15, 30, 60] }],
    {
      x: M, y: 1.95, w: 6.35, h: 3.30,
      barDir: "col",
      chartColors: [GREEN_DARK],
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFormatCode: '0"%"',
      dataLabelColor: INK,
      dataLabelFontSize: 13,
      dataLabelFontBold: true,
      dataLabelFontFace: BODY,
      showLegend: false,
      showTitle: false,
      valAxisMaxVal: 70,
      valAxisHidden: true,
      valGridLine: { style: "none" },
      catGridLine: { style: "none" },
      catAxisLabelColor: INK,
      catAxisLabelFontSize: 12,
      catAxisLabelFontBold: true,
      catAxisLabelFontFace: BODY,
      catAxisLineShow: false,
      barGapWidthPct: 55,
      plotArea: { fill: { color: WHITE } },
    }
  );

  const facts = [
    ["Nur für Neuanlagen", "Gilt für Gas, Heizöl und Flüssiggas, die nach Inkraft-\ntreten neu eingebaut werden. Bestandsanlagen: keine Quote."],
    ["Eine Frage des Vertrags", "10 % heißt: ein Zehntel der Jahreswärme kommt bilanziell\naus grünem Brennstoff. Das regelt der Liefervertrag,\nnicht die Technik am Kessel."],
    ["Nachweis + Bußgeld", "Lieferantenbestätigung in jeder Abrechnung (§ 96),\n5 Jahre aufbewahren. Bußgeld bis 5.000 €."],
  ];

  let y = 1.95;
  facts.forEach(([t, d]) => {
    card(s, M + 6.75, y, CW - 6.75, 1.12, PAPER);
    s.addText(t, {
      x: M + 6.98, y: y + 0.13, w: CW - 7.20, h: 0.30,
      fontFace: HEAD, fontSize: 13.5, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: M + 6.98, y: y + 0.44, w: CW - 7.18, h: 0.58,
      fontFace: BODY, fontSize: 10.5, color: INK, margin: 0, valign: "top", lineSpacing: 13,
    });
    y += 1.21;
  });

  card(s, M, 5.42, CW, 0.86, GREEN_LT);
  s.addText("Vier Wege an der Bio-Treppe vorbei (2029 bis 2034)", {
    x: M + 0.28, y: 5.50, w: 5.0, h: 0.28,
    fontFace: HEAD, fontSize: 12.5, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    "Solarthermie 0,04 m²/m² (bis 2 WE) bzw. 0,03  ·  Lüftung mit WRG ≥ 73 %  ·  " +
    "WP-Hybrid ≥ 30 % bivalent-parallel  ·  Biomasse-Hybrid",
    {
      x: M + 0.28, y: 5.80, w: CW - 0.56, h: 0.34,
      fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Die Bio-Treppe ist das Herzstueck des neuen Heizungsrechts.\n\n" +
    "Wichtigste Botschaft fuer die Beratung: Das ist keine technische Anforderung am Kessel, " +
    "sondern eine Frage des Liefervertrags. Der Kunde kauft Gas mit Biomethan-Anteil.\n\n" +
    "Die Pflicht trifft den Betreiber der Anlage (§ 43 Abs. 6), nicht zwingend den Eigentuemer - " +
    "das ist bei vermieteten Objekten relevant.\n\n" +
    "Achtung bei den vier Ersatzwegen: Solarthermie und Lueftungs-WRG gelten nur bis Ende 2034."
  );
  footer(s, "§ 43 GModG · Drs. 21/7009, S. 31-34");
}

/* ================================================================== *
 * 10 - KOSTENTREIBER FOSSIL
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Wirtschaftlichkeit", "Fossil ist erlaubt - und planbar teuer", {
    sub: "Vier Posten, die dauerhaft auf die Betriebskosten wirken. Gehören in jede Wirtschaftlichkeitsbetrachtung.",
  });

  const drivers = [
    ["Bio-Treppe (§ 43)", "Biomethan und Bioöl kosten deutlich mehr als Erdgas und Heizöl. Der Pflichtanteil steigt bis 2040 auf 60 %."],
    ["CO₂-Preis", "Ab 2027 übernimmt der EU-Emissionshandel (ETS 2) die Bepreisung. Kein fester Preispfad mehr - der Markt entscheidet."],
    ["Grüngasquote (§ 42a)", "Lieferanten müssen ab 2028 steigende Grünanteile liefern (Start ca. 1 %), bis 2045 vollständig klimaneutral. Die Kosten landen im Arbeitspreis."],
    ["Kostenteilung (vermietet)", "Ab 2028/2029 trägt der Vermieter CO₂-Kosten, Netzentgelte und Bio-Mehrkosten dauerhaft zur Hälfte selbst."],
  ];

  let y = 2.02;
  drivers.forEach(([t, d], i) => {
    card(s, M, y, CW, 0.92, i % 2 === 0 ? PAPER : WHITE, { line: i % 2 === 0 ? null : LINE });
    badge(s, M + 0.32, y + 0.26, 0.40, String(i + 1), GREEN_DARK, WHITE, 13);
    s.addText(t, {
      x: M + 0.90, y: y + 0.10, w: 3.0, h: 0.34,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: M + 0.90, y: y + 0.44, w: CW - 1.25, h: 0.40,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 14,
    });
    y += 1.00;
  });

  card(s, M, 6.10, CW, 0.66, INK);
  s.addText(
    [
      { text: "Unsere Linie:  ", options: { bold: true, color: GREEN } },
      { text: "Fossil ist nicht verboten - aber wir rechnen die Restlaufzeit ehrlich durch. Ab 2040 liegt die Wärmepumpe im Kostenvergleich meist vorn.", options: { color: WHITE } },
    ],
    {
      x: M + 0.30, y: 6.10, w: CW - 0.60, h: 0.66,
      fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Diese Folie ist unser Beratungsargument. Der Kunde darf fossil - aber er soll wissen, was das kostet.\n\n" +
    "Beispiel zum Durchrechnen: Kunde tauscht 2027 auf Gas-Brennwert. " +
    "2028 gehen bei Vermietung CO2 und Netzentgelte zur Haelfte auf ihn ueber. " +
    "2029 kommen 10 % Bioanteil dazu, 2030 dann 15 %, 2035 dann 30 %. " +
    "Und ab 2035 faellt die Ersatzerfuellung ueber Solarthermie weg.\n\n" +
    "Wichtig: Wir dokumentieren die Empfehlung schriftlich, auch wenn die Beratungspflicht entfallen ist."
  );
  footer(s, "§§ 42a, 43 GModG · §§ 5a ff. CO2KostAufG · EU-Emissionshandel ETS 2");
}

/* ================================================================== *
 * 11 - HAVARIE
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · § 43 Abs. 7", "Wenn der Kessel stirbt: 12 Monate Luft", {
    sub: "Der irreparable Ausfall ersetzt die bisherigen Übergangsfristen.",
  });

  const cases = [
    ["Fall 1", "Havarie im Jahr 2028", "Neue Gas- oder Öl-Heizung wegen irreparablen Ausfalls: Die Bio-Treppe greift erst 12 Monate nach Einbau - nicht schon am 01.01.2029."],
    ["Fall 2", "Havarie ab 2029,\nAnlage aus GModG-Zeit", "Die beim Ausfall geltende Stufe wird für 12 Monate eingefroren. Beispiel: Havarie 2034 - die 30-%-Stufe ab 2035 greift erst später."],
    ["Fall 3", "Havarie ab 2029,\nAltanlage von vorher", "12 Monate lang gar keine Quote. Danach gilt die dann aktuelle Stufe der Bio-Treppe."],
  ];

  const cw = (CW - 2 * 0.30) / 3;
  cases.forEach(([tag, t, d], i) => {
    const cx = M + i * (cw + 0.30);
    card(s, cx, 2.02, cw, 2.55, PAPER, { shadow: true });
    s.addShape(pres.ShapeType.roundRect, {
      x: cx + 0.26, y: 2.26, w: 0.92, h: 0.34,
      fill: { color: GREEN_DARK }, line: { type: "none" }, rectRadius: 0.17,
    });
    s.addText(tag, {
      x: cx + 0.26, y: 2.26, w: 0.92, h: 0.34,
      fontFace: BODY, fontSize: 11, bold: true, color: WHITE,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(t, {
      x: cx + 0.26, y: 2.72, w: cw - 0.52, h: 0.72,
      fontFace: HEAD, fontSize: 15, bold: true, color: INK, margin: 0, valign: "top", lineSpacing: 19,
    });
    s.addText(d, {
      x: cx + 0.26, y: 3.46, w: cw - 0.52, h: 0.95,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
    });
  });

  card(s, M, 4.80, (CW - 0.30) / 2, 1.18, GREEN_LT);
  s.addText("Beratungspflicht entfällt", {
    x: M + 0.28, y: 4.96, w: (CW - 0.30) / 2 - 0.56, h: 0.30,
    fontFace: HEAD, fontSize: 14, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Die verpflichtende Beratung vor dem Einbau fossiler Heizungen (§ 71 Abs. 11 GEG) wird ersatzlos gestrichen.", {
    x: M + 0.28, y: 5.28, w: (CW - 0.30) / 2 - 0.56, h: 0.58,
    fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M + (CW - 0.30) / 2 + 0.30, 4.80, (CW - 0.30) / 2, 1.18, GREEN_LT);
  s.addText("Mietrecht läuft parallel", {
    x: M + (CW - 0.30) / 2 + 0.58, y: 4.96, w: (CW - 0.30) / 2 - 0.56, h: 0.30,
    fontFace: HEAD, fontSize: 14, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Auch die CO₂-Kostenteilung pausiert bei Havarie-Einbau 12 Monate (§ 5a Abs. 4 CO2KostAufG).", {
    x: M + (CW - 0.30) / 2 + 0.58, y: 5.28, w: (CW - 0.30) / 2 - 0.56, h: 0.58,
    fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "top", lineSpacing: 15,
  });

  s.addNotes(
    "Havarie-Faelle kommen bei uns regelmaessig rein - deshalb eine eigene Folie.\n\n" +
    "Merksatz: Irreparabler Ausfall bedeutet immer 12 Monate Karenz ab Einbau. " +
    "Die drei Faelle unterscheiden sich nur darin, welche Stufe danach gilt.\n\n" +
    "Bitte im Beratungsprotokoll festhalten, wenn es ein Havarie-Fall war - " +
    "das ist spaeter der Nachweis fuer die Karenz."
  );
  footer(s, "§ 43 Abs. 7 GModG · Drs. 21/7009, S. 33 (Begründung S. 169)");
}

/* ================================================================== *
 * 12 - MIETRECHT
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Mietrecht", "Vermietete Objekte: zwei neue Baustellen", {
    sub: "Betrifft alle Projekte mit Vermieterinnen und Vermietern als Auftraggeber.",
  });

  // Links: § 559f
  card(s, M, 2.00, (CW - 0.34) / 2, 4.12, PAPER, { shadow: true });
  s.addText("§ 559f BGB", {
    x: M + 0.32, y: 2.20, w: 3.0, h: 0.28,
    fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1.4, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Ohne JAZ-Nachweis nur\ndie halbe Umlage", {
    x: M + 0.32, y: 2.50, w: (CW - 0.34) / 2 - 0.64, h: 0.70,
    fontFace: HEAD, fontSize: 19, bold: true, color: INK, margin: 0, valign: "top", lineSpacing: 24,
  });
  s.addText(
    [
      { text: "Jahresarbeitszahl ≥ 2,5 nachgewiesen  →  volle Umlage, 8 % der Kosten pro Jahr", options: { bullet: true, breakLine: true } },
      { text: "Kein Nachweis  →  nur 50 % der Kosten dürfen umgelegt werden", options: { bullet: true, breakLine: true } },
      { text: "Nachweis nach VDI 4650 Blatt 1, in der Regel vor Inbetriebnahme, durch das Fachunternehmen", options: { bullet: true, breakLine: true } },
      { text: "Nicht nötig bei: Baujahr nach 1996, WSchV-1995-Niveau, Sanierung auf § 38-Niveau oder Vorlauftemperatur ≤ 55 °C", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 3.30, w: (CW - 0.34) / 2 - 0.72, h: 1.90,
      fontFace: BODY, fontSize: 11.5, color: INK, paraSpaceAfter: 7, margin: 0, valign: "top",
    }
  );
  card(s, M + 0.32, 5.28, (CW - 0.34) / 2 - 0.64, 0.64, GREEN_LT);
  s.addText("Für uns: Heizlast + VDI-4650-Berechnung gehören in die Auslegung - nicht hinterher aus Betriebsdaten.", {
    x: M + 0.52, y: 5.28, w: (CW - 0.34) / 2 - 1.04, h: 0.64,
    fontFace: BODY, fontSize: 11, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });

  // Rechts: CO2-Kostenteilung
  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.00, (CW - 0.34) / 2, 4.12, PAPER, { shadow: true });
  s.addText("CO2KOSTAUFG", {
    x: rx + 0.32, y: 2.20, w: 3.0, h: 0.28,
    fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1.4, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Wer zahlt was ab wann?", {
    x: rx + 0.32, y: 2.50, w: (CW - 0.34) / 2 - 0.64, h: 0.70,
    fontFace: HEAD, fontSize: 19, bold: true, color: INK, margin: 0, valign: "top", lineSpacing: 24,
  });

  const kr = [
    ["CO₂-Kosten", "10-Stufen-Modell", "ab 2028: fix 50 / 50"],
    ["Gas-Netzentgelte", "voll beim Mieter", "ab 2028: 50 / 50"],
    ["Bio-Pflichtanteil", "gab es nicht", "ab 2029: 50 / 50, Deckel 30 %"],
  ];
  let ky = 3.32;
  kr.forEach(([a, b, c]) => {
    s.addText(a, {
      x: rx + 0.36, y: ky, w: 1.85, h: 0.52,
      fontFace: BODY, fontSize: 11.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: rx + 2.25, y: ky, w: 1.55, h: 0.52,
      fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0, valign: "middle",
    });
    s.addText(c, {
      x: rx + 3.85, y: ky, w: 2.05, h: 0.52,
      fontFace: BODY, fontSize: 10.5, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    ky += 0.60;
  });

  card(s, rx + 0.32, 5.18, (CW - 0.34) / 2 - 0.64, 0.74, AMBER_BG, { line: AMBER_LINE });
  s.addText(
    [
      { text: "Härtefall § 5d:  ", options: { bold: true, color: AMBER } },
      { text: "Vermieteranteil entfällt bei max. 6 Wohnungen, günstiger Miete, Klasse G/H und wenn eine Wärmepumpe technisch unmöglich ist.", options: { color: INK } },
    ],
    {
      x: rx + 0.50, y: 5.18, w: (CW - 0.34) / 2 - 1.00, h: 0.74,
      fontFace: BODY, fontSize: 10.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Zwei Dinge, die wir bei vermieteten Objekten aktiv ansprechen muessen.\n\n" +
    "Links ist fuer die Planung wichtig: Wenn wir eine Waermepumpe auslegen und der Kunde vermietet, " +
    "muss die JAZ-Berechnung nach VDI 4650 VOR Inbetriebnahme vorliegen. " +
    "Sonst verliert der Vermieter die Haelfte seiner Umlage. Das koennen wir mit anbieten.\n\n" +
    "Rechts: Die CO2-Kostenteilung wird ab 2028 pauschal 50/50 - das alte Stufenmodell entfaellt. " +
    "Gilt auch fuer Neubauten bis Baujahr 2029."
  );
  footer(s, "§§ 559e, 559f BGB (Artikel 6) · §§ 3a, 5a-5d CO2KostAufG (Artikel 5)");
}

/* ================================================================== *
 * 13 - RECHENREGIME STUFE 2
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Ab Stufe 2 (≈ 01.01.2027)", "Ab 2027 rechnen wir anders", {
    sub: "Neue Norm, neue Bezugsfläche, neues Referenzgebäude. Betrifft jede Bilanz und jeden Ausweis.",
  });

  card(s, M, 2.00, (CW - 0.34) / 2, 2.42, PAPER, { shadow: true });
  s.addText("Die Norm", {
    x: M + 0.32, y: 2.20, w: 4.0, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "DIN/TS 18599:2025-10 wird das einzige Bilanzierungsverfahren", options: { bullet: true, breakLine: true } },
      { text: "DIN V 4701-10 und das alte Modellgebäudeverfahren entfallen", options: { bullet: true, breakLine: true } },
      { text: "Nutzungsprofile rutschen von Tabelle 5 in Tabelle 6", options: { bullet: true, breakLine: true } },
      { text: "U-Wert-Normen aktualisiert (DIN 4108-4, DIN EN ISO 6946)", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 2.62, w: (CW - 0.34) / 2 - 0.72, h: 1.62,
      fontFace: BODY, fontSize: 11.5, color: INK, paraSpaceAfter: 6, margin: 0, valign: "top",
    }
  );

  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.00, (CW - 0.34) / 2, 2.42, PAPER, { shadow: true });
  s.addText("Die Bezugsfläche", {
    x: rx + 0.32, y: 2.20, w: 4.0, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Bisher WG: Gebäudenutzfläche AN = 0,32 · Ve - eine Rechengröße, meist größer als die echte Wohnfläche", options: { bullet: true, breakLine: true } },
      { text: "Bisher NWG: Nettogrundfläche NGF", options: { bullet: true, breakLine: true } },
      { text: "Neu für beide: „Nutzfläche\" = tatsächlich beheizte oder gekühlte Nettoraumfläche nach DIN 277:2021-08", options: { bullet: true } },
    ],
    {
      x: rx + 0.36, y: 2.62, w: (CW - 0.34) / 2 - 0.72, h: 1.62,
      fontFace: BODY, fontSize: 11.5, color: INK, paraSpaceAfter: 6, margin: 0, valign: "top",
    }
  );

  card(s, M, 4.60, CW, 1.05, INK);
  s.addText("Die Folge - und unsere wichtigste Kundenbotschaft", {
    x: M + 0.32, y: 4.74, w: CW - 0.64, h: 0.30,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Alle kWh/m²-Kennwerte verschieben sich systematisch. Alte und neue Ausweise sind nicht mehr direkt vergleichbar. Das müssen wir aktiv erklären, bevor der Kunde es selbst merkt.", {
    x: M + 0.32, y: 5.06, w: CW - 0.64, h: 0.46,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 16,
  });

  card(s, M, 5.83, CW, 0.66, GREEN_LT);
  s.addText(
    [
      { text: "Referenzgebäude:  ", options: { bold: true, color: GREEN_DARK } },
      { text: "kein konkreter Kessel mehr, sondern technologieneutral mit fp,tot = 0,75 - ab 2030 dann 0,70. Hülle bleibt: Wand 0,28 · Dach 0,20 · Fenster 1,3.", options: { color: INK } },
    ],
    {
      x: M + 0.30, y: 5.83, w: CW - 0.60, h: 0.66,
      fontFace: BODY, fontSize: 11.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Praktische Konsequenz fuer unsere Arbeit: Software-Update Hottgenroth einspielen, " +
    "sobald das Stufe-2-Datum feststeht.\n\n" +
    "Und: Projekte mit Fertigstellung 2027 und spaeter jetzt schon vorausschauend kalkulieren - " +
    "neue Normen, neue Bezugsflaeche.\n\n" +
    "Die Kundenbotschaft in der Mitte ist wichtig: Wenn ein Kunde 2027 einen neuen Ausweis bekommt " +
    "und der Kennwert anders aussieht als 2025, liegt das an der Rechenmethode - nicht am Gebaeude."
  );
  footer(s, "§§ 20-30, § 3 Nr. 26, Anlagen 1+2 GModG · Artikel 2, Stufe 2");
}

/* ================================================================== *
 * 14 - NEUE FAKTOREN
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Anlagen 4 + 9", "Strom gewinnt, Öl und Gas verlieren", {
    sub: "Die neuen Primärenergie- und Treibhausgasfaktoren verändern jede Bilanz.",
  });

  s.addChart(
    pres.ChartType.bar,
    [
      { name: "GEG 2024", labels: ["Strom (Netz)", "Fernwärme", "Holz", "Erdgas"], values: [1.8, 1.3, 0.2, 1.1] },
      { name: "GModG", labels: ["Strom (Netz)", "Fernwärme", "Holz", "Erdgas"], values: [1.5, 0.7, 0.7, 1.1] },
    ],
    {
      x: M, y: 2.00, w: 7.35, h: 3.05,
      barDir: "col",
      chartColors: [SAGE, GREEN_DARK],
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFormatCode: "0.0",
      dataLabelColor: INK,
      dataLabelFontSize: 10,
      dataLabelFontFace: BODY,
      showLegend: true,
      legendPos: "t",
      legendColor: MUTE,
      legendFontSize: 11,
      legendFontFace: BODY,
      showTitle: false,
      valAxisMaxVal: 2.1,
      valAxisHidden: true,
      valGridLine: { style: "none" },
      catGridLine: { style: "none" },
      catAxisLabelColor: INK,
      catAxisLabelFontSize: 11,
      catAxisLabelFontBold: true,
      catAxisLabelFontFace: BODY,
      catAxisLineShow: false,
      barGapWidthPct: 45,
      plotArea: { fill: { color: WHITE } },
    }
  );
  s.addText("Primärenergiefaktoren (nicht erneuerbarer Anteil)", {
    x: M, y: 5.06, w: 7.35, h: 0.26,
    fontFace: BODY, fontSize: 10, italic: true, color: MUTE, margin: 0, valign: "middle",
  });

  card(s, M + 7.75, 2.00, CW - 7.75, 1.86, INK);
  s.addText("THG-FAKTOR STROM", {
    x: M + 7.98, y: 2.18, w: CW - 8.20, h: 0.26,
    fontFace: BODY, fontSize: 10, bold: true, charSpacing: 1.4, color: SAGE, margin: 0, valign: "middle",
  });
  s.addText("560 → 100", {
    x: M + 7.98, y: 2.48, w: CW - 8.20, h: 0.80,
    fontFace: HEAD, fontSize: 40, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("g CO₂-Äquivalent je kWh im Energieausweis. Wärmepumpen werden in der THG-Darstellung massiv bessergestellt.", {
    x: M + 7.98, y: 3.28, w: CW - 8.20, h: 0.50,
    fontFace: BODY, fontSize: 10.5, color: "C9D2CA", margin: 0, valign: "top", lineSpacing: 13,
  });

  card(s, M + 7.75, 4.00, CW - 7.75, 1.05, GREEN_LT);
  s.addText("Neu mit fp = 0,0", {
    x: M + 7.98, y: 4.14, w: CW - 8.20, h: 0.28,
    fontFace: HEAD, fontSize: 13, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("PV-Strom vor Ort · Umweltwärme · Geothermie · Solarthermie. Abwärme: 0,0 bei 10 g THG.", {
    x: M + 7.98, y: 4.44, w: CW - 8.20, h: 0.48,
    fontFace: BODY, fontSize: 10.5, color: INK, margin: 0, valign: "top", lineSpacing: 13,
  });

  card(s, M, 5.48, CW, 0.98, PAPER);
  s.addText("Weitere THG-Faktoren in g CO₂-Äq./kWh", {
    x: M + 0.30, y: 5.58, w: CW - 0.60, h: 0.26,
    fontFace: BODY, fontSize: 10, bold: true, charSpacing: 1.2, color: MUTE, margin: 0, valign: "middle",
  });
  s.addText("Heizöl 310  ·  Flüssiggas 270  ·  Erdgas 240  ·  Kohle 400-430  ·  Biomethan / Bioöl / Wasserstoff 80  ·  Fernwärme 40 bis 400 je nach Erzeugung  ·  Holz 20  ·  PV, Umweltwärme, Solarthermie 0", {
    x: M + 0.30, y: 5.86, w: CW - 0.60, h: 0.44,
    fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Das ist die Folie mit dem groessten Aha-Effekt fuer Kunden.\n\n" +
    "Der THG-Faktor Strom faellt von 560 auf 100 g. Das heisst: Im Energieausweis " +
    "sieht eine Waermepumpe kuenftig dramatisch besser aus als heute.\n\n" +
    "Beim Holz aufpassen: Der Primaerenergiefaktor steigt von 0,2 auf 0,7 - " +
    "Holz verliert seinen Sonderbonus. Der THG-Faktor bleibt mit 20 g aber sehr gut.\n\n" +
    "Fernwaerme ist jetzt pauschal 0,7, es sei denn der Versorger veroeffentlicht einen eigenen Wert - der hat Vorrang."
  );
  footer(s, "Anlage 4 (Primärenergie) und Anlage 9 (THG) GModG · Drs. S. 116-123");
}

/* ================================================================== *
 * 15 - NULLEMISSIONSGEBAEUDE
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Neubau", "Nullemission in zwei Stufen", {
    sub: "§ 10a ab 2028 für öffentliche Nichtwohngebäude, § 10 neu ab 2030 für alle Neubauten.",
  });

  card(s, M, 2.02, 3.55, 1.68, GREEN_LT);
  s.addText("01.01.2028", {
    x: M + 0.30, y: 2.20, w: 3.0, h: 0.44,
    fontFace: HEAD, fontSize: 26, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Neue öffentliche Nichtwohngebäude im Eigentum der öffentlichen Hand mit Behördennutzung", {
    x: M + 0.30, y: 2.70, w: 2.98, h: 0.86,
    fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M + 3.85, 2.02, 3.55, 1.68, GREEN_DARK);
  s.addText("01.01.2030", {
    x: M + 4.15, y: 2.20, w: 3.0, h: 0.44,
    fontFace: HEAD, fontSize: 26, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addText("Alle Neubauten - Wohn- und Nichtwohngebäude, ohne Ausnahme nach Bauherr", {
    x: M + 4.15, y: 2.70, w: 2.98, h: 0.86,
    fontFace: BODY, fontSize: 11.5, color: "E4EDE5", margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M + 7.70, 2.02, CW - 7.70, 1.68, PAPER);
  s.addText("Bis dahin", {
    x: M + 7.96, y: 2.18, w: CW - 8.22, h: 0.30,
    fontFace: HEAD, fontSize: 14, bold: true, color: INK, margin: 0, valign: "middle",
  });
  s.addText("Im Neubau gilt der Optionenkatalog (§ 10 Abs. 2). Ein Gaskessel ist formal möglich - mit Bio-Treppe.", {
    x: M + 7.96, y: 2.52, w: CW - 8.20, h: 1.02,
    fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
  });

  s.addText("Die drei Anforderungen", {
    x: M, y: 3.96, w: 6, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0, valign: "middle",
  });

  const reqs = [
    "Gesamtenergiebedarf höchstens auf dem Niveau der §§ 15/18 - Referenzgebäude mit fp,tot dann 0,70",
    "Baulicher Wärmeschutz nach §§ 16/19",
    "Am Standort keine CO₂-Emissionen aus fossilen Brennstoffen",
  ];
  let ry = 4.42;
  reqs.forEach((r, i) => {
    card(s, M, ry, CW * 0.62, 0.52, i === 2 ? GREEN_LT : PAPER, { radius: 0.06 });
    badge(s, M + 0.20, ry + 0.11, 0.30, "✓", GREEN_DARK, WHITE, 11);
    s.addText(r, {
      x: M + 0.64, y: ry, w: CW * 0.62 - 0.86, h: 0.52,
      fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "middle",
    });
    ry += 0.60;
  });

  card(s, M + CW * 0.65, 3.96, CW * 0.35, 2.26, PAPER, { shadow: true });
  s.addText("Ökobilanz wird Pflicht", {
    x: M + CW * 0.65 + 0.28, y: 4.14, w: CW * 0.35 - 0.56, h: 0.32,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "„Bericht zur THG-Bilanz im Lebenszyklus\" (§ 88b): ab 2028 für Neubauten über 1.000 m², ab 2030 für alle", options: { bullet: true, breakLine: true } },
      { text: "Methodik DIN SPEC 91606:2026-07, kostenlos bei DIN Media", options: { bullet: true, breakLine: true } },
      { text: "Wert wandert als Pflichtangabe Nr. 17 in den Energieausweis", options: { bullet: true, breakLine: true } },
      { text: "Nur mit Fortbildung „angewandte Ökobilanz für Gebäude\" (§ 88c)", options: { bullet: true } },
    ],
    {
      x: M + CW * 0.65 + 0.32, y: 4.52, w: CW * 0.35 - 0.64, h: 1.58,
      fontFace: BODY, fontSize: 10.5, color: INK, paraSpaceAfter: 6, margin: 0, valign: "top",
    }
  );

  s.addNotes(
    "Fuer die Neubau-Kollegen: Ab 2030 ist am Standort kein fossiler Brennstoff mehr erlaubt. Punkt.\n\n" +
    "Ausnahme, falls die Frage kommt: Hallenzonen ueber 4 m Raumhoehe mit Geblaese- oder " +
    "Strahlungsheizung sind ausgenommen.\n\n" +
    "Rechts der wichtige Punkt fuer unsere Planung: Die Oekobilanz nach § 88b braucht eine " +
    "Fortbildung nach § 88c. Sieben Fachthemen inklusive Software und Massenermittlung. " +
    "Das muessen wir 2027 angehen, damit wir 2028 liefern koennen - dazu spaeter mehr."
  );
  footer(s, "§ 10a (Artikel 3), § 10 neu (Artikel 4), §§ 88b/88c GModG");
}

/* ================================================================== *
 * 16 - NWG-SANIERUNGSPFLICHT + AUSWEISE
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · §§ 40, 41", "Erstmals Sanierungspflicht im NWG-Bestand", {
    sub: "Setzt Artikel 9 der EU-Gebäuderichtlinie um. Die Pflicht trifft den Eigentümer, Nachweis über den Energieausweis.",
  });

  card(s, M, 2.02, 3.30, 1.34, GREEN_LT);
  s.addText("ab 2030", {
    x: M + 0.28, y: 2.16, w: 2.8, h: 0.38,
    fontFace: HEAD, fontSize: 22, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Primärenergie ≤ 3,5 × Referenz\nEntspricht: raus aus Klasse G", {
    x: M + 0.28, y: 2.58, w: 2.76, h: 0.62,
    fontFace: BODY, fontSize: 11.5, color: INK, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M + 3.58, 2.02, 3.30, 1.34, GREEN_DARK);
  s.addText("ab 2033", {
    x: M + 3.86, y: 2.16, w: 2.8, h: 0.38,
    fontFace: HEAD, fontSize: 22, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addText("Primärenergie ≤ 2,95 × Referenz\nEntspricht: mindestens Klasse E", {
    x: M + 3.86, y: 2.58, w: 2.76, h: 0.62,
    fontFace: BODY, fontSize: 11.5, color: "E4EDE5", margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M + 7.16, 2.02, CW - 7.16, 1.34, PAPER);
  s.addText("Gilt als erfüllt bei", {
    x: M + 7.42, y: 2.14, w: CW - 7.68, h: 0.28,
    fontFace: HEAD, fontSize: 13, bold: true, color: INK, margin: 0, valign: "middle",
  });
  s.addText("Baujahr ab 1996  ·  WSchV-1995-Niveau  ·  Biomasse- oder WP-Heizung  ·  Fernwärmeanschluss", {
    x: M + 7.42, y: 2.44, w: CW - 7.66, h: 0.80,
    fontFace: BODY, fontSize: 11, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
  });

  // NWG-Klassenskala
  s.addText("Die neuen NWG-Klassen (Anlage 10a) - Verhältnis des Primärenergiebedarfs zum Referenzgebäude", {
    x: M, y: 3.62, w: CW, h: 0.30,
    fontFace: BODY, fontSize: 11, bold: true, color: MUTE, margin: 0, valign: "middle",
  });

  const classes = [
    ["A", "≤ 1,0", GREEN_DARK],
    ["B", "> 1,0", GREEN],
    ["C", "> 1,48", "7FC489"],
    ["D", "> 1,97", SAGE],
    ["E", "> 2,46", "E8CC8A"],
    ["F", "> 2,95", "D99A6C"],
    ["G", "> 3,5", RED],
  ];
  const clw = (CW - 6 * 0.14) / 7;
  classes.forEach(([c, v, col], i) => {
    const cx = M + i * (clw + 0.14);
    card(s, cx, 4.00, clw, 0.92, col, { radius: 0.07 });
    s.addText(c, {
      x: cx, y: 4.06, w: clw, h: 0.42,
      fontFace: HEAD, fontSize: 22, bold: true,
      color: i >= 4 ? INK : WHITE, align: "center", valign: "middle", margin: 0,
    });
    s.addText(v, {
      x: cx, y: 4.48, w: clw, h: 0.30,
      fontFace: BODY, fontSize: 11, bold: true,
      color: i >= 4 ? INK : "E4EDE5", align: "center", valign: "middle", margin: 0,
    });
  });
  s.addText("Klasse A gibt es nur noch für Nullemissionsgebäude.", {
    x: M, y: 4.96, w: CW, h: 0.26,
    fontFace: BODY, fontSize: 10.5, italic: true, color: MUTE, margin: 0, valign: "middle",
  });

  card(s, M, 5.40, CW, 1.02, INK);
  s.addText("Was das für unsere Arbeit heißt", {
    x: M + 0.30, y: 5.52, w: CW - 0.60, h: 0.28,
    fontFace: HEAD, fontSize: 14, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Nichtwohngebäude brauchen künftig nur noch Bedarfsausweise - bei Verkauf, Vermietung, Verpachtung und neu auch bei Vertragsverlängerung. Jeder Ausweis heißt damit vollständige energetische Bilanzierung statt Verbrauchsablesung. Datenaufnahme und Rechenaufwand steigen deutlich.", {
    x: M + 0.30, y: 5.82, w: CW - 0.60, h: 0.48,
    fontFace: BODY, fontSize: 11.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 15,
  });

  s.addNotes(
    "Das ist geschaeftlich die spannendste Folie: Erstmals gibt es eine echte Sanierungspflicht im Bestand.\n\n" +
    "Hintergrund EPBD: Bis 2030 muessen 16 %, bis 2033 insgesamt 26 % der schlechtesten " +
    "Nichtwohngebaeude saniert sein.\n\n" +
    "Fuer uns heisst das: Bestandshalter und Kommunen brauchen jemanden, der ihren Bestand einordnet. " +
    "Welche Gebaeude fallen unter die Pflicht, welche sind ueber die Erfuellungsfiktionen schon raus? " +
    "Das ist ein Beratungsprodukt, das wir anbieten sollten.\n\n" +
    "Ausnahmen: Abriss oder Nutzungsaufgabe geplant, Baudenkmaeler, Hallen mit niedrigem Energiebedarf."
  );
  footer(s, "§§ 40, 41 GModG · §§ 79-82, § 86, Anlage 10a · Artikel 2, Stufe 2");
}

/* ================================================================== *
 * 17 - PRUEFPFLICHTEN
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · §§ 60a bis 60c", "Prüfen, optimieren, abgleichen - mit Frist", {
    sub: "Alle drei Pflichten sind bußgeldbewehrt bis 5.000 €. Wiederkehrende Nachweisleistungen für uns.",
  });

  const p = [
    ["§ 60a", "Wärmepumpen-Prüfung", "Für Wärmepumpen ab Inbetriebnahme 2024 in Gebäuden ab 6 Einheiten, auch Luft-Luft. Prüfung nach der ersten vollen Heizperiode, spätestens nach 2 Jahren, danach alle 5 Jahre. Optimierung binnen 1 Jahr umsetzen, Ergebnis schriftlich.", "Wartungsvertrag oder Fernüberwachung ersetzt die Prüfung komplett."],
    ["§ 60b", "Alt-Heizungscheck", "Wasserbasierte Heizungen, eingebaut vor dem 01.10.2009, Gebäude ab 6 Einheiten, keine Wärmepumpe. Prüfkatalog gestrafft: Regelung, Temperaturführung, Pumpen, Zirkulation.", "Frist: bis 30.09.2027 abgeschlossen. Die läuft bereits."],
    ["§ 60c", "Hydraulischer Abgleich", "Erstmals gesetzlich definiert: Planungs- und Umsetzungsleistungen inklusive raumweiser Heizlastberechnung nach DIN EN 12831-1 sowie Anpassung von Heizflächen und Regelung.", "Die raumweise Heizlast wird damit Pflichtbestandteil."],
  ];

  const cw = (CW - 2 * 0.28) / 3;
  p.forEach(([par, t, d, hint], i) => {
    const cx = M + i * (cw + 0.28);
    card(s, cx, 2.02, cw, 3.30, PAPER, { shadow: true });
    s.addText(par, {
      x: cx + 0.28, y: 2.20, w: cw - 0.56, h: 0.28,
      fontFace: BODY, fontSize: 11, bold: true, charSpacing: 1.4, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    s.addText(t, {
      x: cx + 0.28, y: 2.50, w: cw - 0.56, h: 0.40,
      fontFace: HEAD, fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: cx + 0.28, y: 2.96, w: cw - 0.54, h: 1.45,
      fontFace: BODY, fontSize: 11, color: MUTE, margin: 0, valign: "top", lineSpacing: 14,
    });
    card(s, cx + 0.24, 4.48, cw - 0.48, 0.66, i === 1 ? AMBER_BG : GREEN_LT, { radius: 0.06, line: i === 1 ? AMBER_LINE : null });
    s.addText(hint, {
      x: cx + 0.40, y: 4.48, w: cw - 0.80, h: 0.66,
      fontFace: BODY, fontSize: 10.5, bold: true,
      color: i === 1 ? AMBER : GREEN_DARK, margin: 0, valign: "middle",
    });
  });

  card(s, M, 5.56, CW, 0.90, INK);
  s.addText("30.09.2027", {
    x: M + 0.32, y: 5.56, w: 2.4, h: 0.90,
    fontFace: HEAD, fontSize: 30, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Der Heizungscheck nach § 60b muss bis dahin durch sein - gut 14 Monate. Wer Bestandskunden mit Anlagen von vor Oktober 2009 hat: Das ist ein konkreter Auftrag, den wir jetzt aktiv ansprechen können.", {
    x: M + 2.90, y: 5.56, w: CW - 3.22, h: 0.90,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "middle", lineSpacing: 16,
  });

  s.addNotes(
    "Diese drei Paragraphen sind fuer uns bares Geld - wiederkehrende Leistungen mit gesetzlicher Frist.\n\n" +
    "Der Heizungscheck nach § 60b ist der konkreteste Hebel: Frist 30.09.2027, " +
    "betrifft alle wasserbasierten Heizungen von vor Oktober 2009 in Gebaeuden ab 6 Einheiten.\n\n" +
    "Aufgabe fuers Team: Lasst uns aus unserem Bestand die Objekte filtern, die darunter fallen, " +
    "und die Eigentuemer proaktiv ansprechen. Wer macht das? Bitte im Sanierungs-Chat melden.\n\n" +
    "Pruefen darf jede fachkundige Person aus Heizungs-, Kaelte-, Luftheizungs- oder Elektrotechnik."
  );
  footer(s, "§§ 60a, 60b, 60c GModG · Drs. 21/7009, S. 76-79");
}

/* ================================================================== *
 * 18 - SOLARPFLICHT + GEIG
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · § 106 und GEIG", "Solarpflicht und Ladeinfrastruktur", {
    sub: "Bei Neubau-Planungen und Dachsanierungen früh mitdenken: Statik, Dachbelegung, Zählerplatz, Anschlussräume.",
  });

  s.addText("§ 106 · Bundesweite Solarpflicht in fünf Stufen", {
    x: M, y: 1.98, w: (CW - 0.34) / 2, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });

  const solar = [
    ["2027", "Neue NWG über 250 m² Nutzfläche und alle neuen öffentlichen NWG"],
    ["2028", "Bestand: öffentliche NWG über 2.000 m²; NWG über 500 m² bei Dachsanierung"],
    ["2029", "Bestand: öffentliche NWG über 750 m²"],
    ["2030", "Neue Wohngebäude und überdachte Parkplätze am Gebäude"],
    ["2031", "Bestand: öffentliche NWG über 250 m²"],
  ];
  let sy = 2.40;
  solar.forEach(([yr, d], i) => {
    card(s, M, sy, (CW - 0.34) / 2, 0.62, i % 2 === 0 ? PAPER : WHITE, { radius: 0.06, line: i % 2 === 0 ? null : LINE });
    s.addText(yr, {
      x: M + 0.24, y: sy, w: 0.78, h: 0.62,
      fontFace: HEAD, fontSize: 15, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: M + 1.08, y: sy, w: (CW - 0.34) / 2 - 1.32, h: 0.62,
      fontFace: BODY, fontSize: 11, color: INK, margin: 0, valign: "middle", lineSpacing: 14,
    });
    sy += 0.70;
  });

  const rx = M + (CW - 0.34) / 2 + 0.34;
  s.addText("GEIG · Wer muss Stellplätze verkabeln?", {
    x: rx, y: 1.98, w: (CW - 0.34) / 2, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });

  const geig = [
    ["Neubau WG", "> 3 Stellplätze", "50 % vorverkabeln, mind. 1 Ladepunkt"],
    ["Neubau NWG", "> 5 Stellplätze", "50 % vorverkabeln, 1 Ladepunkt je 5."],
    ["Große Renovierung", "WG > 3 / NWG > 5", "wie Neubau, wenn Parkplatz oder Elektrik betroffen"],
    ["Bestand NWG", "> 20 Stellplätze", "ab 01.01.2027: 1 Ladepunkt je 10 ODER 50 % Leitung"],
  ];
  let gy = 2.40;
  geig.forEach(([a, b, c], i) => {
    card(s, rx, gy, (CW - 0.34) / 2, 0.80, i === 3 ? GREEN_LT : PAPER, { radius: 0.06 });
    s.addText(a, {
      x: rx + 0.24, y: gy + 0.08, w: 2.3, h: 0.30,
      fontFace: BODY, fontSize: 11.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: rx + 2.58, y: gy + 0.08, w: 1.9, h: 0.30,
      fontFace: BODY, fontSize: 11, color: GREEN_DARK, bold: true, margin: 0, valign: "middle",
    });
    s.addText(c, {
      x: rx + 0.24, y: gy + 0.40, w: (CW - 0.34) / 2 - 0.48, h: 0.32,
      fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0, valign: "middle",
    });
    gy += 0.88;
  });

  noteBox(s, M, 6.02, CW, 0.68, "Wichtig:",
    "„Vorverkabeln\" heißt anschlussfertig bis zum Endpunkt - reine Leerrohre oder Kabelkanäle genügen ausdrücklich nicht. Neue Ladepunkte müssen intelligentes Laden beherrschen.");

  s.addNotes(
    "Solarpflicht: Das Gesetz sagt 'Solarenergie' - PV oder Solarthermie, beides zulaessig. " +
    "Jeder Neubau muss ausserdem 'solar-ready' konzipiert sein.\n\n" +
    "Wichtig: Laender duerfen strengere Regeln behalten oder erlassen. NRW-Regelung also weiter im Blick behalten.\n\n" +
    "Wenn die NWG-Sanierungspflicht nach § 40 greift, hat diese Vorrang vor der Solarpflicht.\n\n" +
    "GEIG: Der Punkt mit den Leerrohren ist in der Praxis der haeufigste Fehler. " +
    "Bitte bei Bauherren frueh ansprechen."
  );
  footer(s, "§ 106 GModG (Artikel 2, Stufe 2) · GEIG in der Fassung von Artikel 7");
}

/* ================================================================== *
 * 19 - FRISTENKALENDER
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Überblick", "Der Fristenkalender bis 2045", {
    sub: "Zum Fotografieren. Vor der Verkündung galt das GEG 2024 - das Stufe-2-Datum hängt am Verkündungsmonat.",
  });

  const dates = [
    ["Jetzt", "Neues Heizungsrecht in Kraft, 65-%-Pflicht und Betriebsverbote gestrichen", true],
    ["≈ 01.01.27", "Stufe 2: neue Rechenregeln, Ausweisrecht, NWG-Pflicht, Solarpflicht, GEIG", true],
    ["01.01.2027", "GEIG Bestands-NWG > 20 Stellplätze · Solarpflicht neue NWG > 250 m²", false],
    ["30.09.2027", "Heizungscheck § 60b für Anlagen von vor 10/2009 abgeschlossen", true],
    ["01.01.2028", "Nullemission neue öffentliche NWG · CO₂ + Netzentgelte hälftig · THG-Bericht > 1.000 m²", false],
    ["01.01.2029", "Bio-Treppe 10 % · Brennstoffkosten-Teilung · Solar öffentliche NWG > 750 m²", false],
    ["31.12.2029", "Gebäudeautomation + Beleuchtungssteuerung NWG > 70 kW nachgerüstet", false],
    ["01.01.2030", "Nullemission alle Neubauten · fp 0,70 · NWG ≤ 3,5 × · Solar WG · Bio 15 %", true],
    ["01.01.2031", "Solarpflicht Bestand: öffentliche NWG > 250 m²", false],
    ["01.01.2033", "NWG-Bestand ≤ 2,95 × Referenz - mindestens Klasse E", false],
    ["31.12.2034", "Ende der Ersatzerfüllung über Solarthermie und Lüftungs-WRG", false],
    ["2035 / 2040", "Bio-Treppe 30 % · Bio-Treppe 60 %, Nachweis für Hybride ab 6 Einheiten", false],
    ["2045", "Brennstoffe klimaneutral über die Lieferantenquote (§ 42a)", false],
  ];

  const colW = (CW - 0.34) / 2;
  dates.forEach(([d, t, hi], i) => {
    const col = i < 7 ? 0 : 1;
    const row = i < 7 ? i : i - 7;
    const cx = M + col * (colW + 0.34);
    const cy = 1.98 + row * 0.615;
    card(s, cx, cy, colW, 0.55, hi ? GREEN_LT : PAPER, { radius: 0.05 });
    s.addText(d, {
      x: cx + 0.20, y: cy, w: 1.28, h: 0.55,
      fontFace: BODY, fontSize: 11.5, bold: true,
      color: hi ? GREEN_DARK : INK, margin: 0, valign: "middle",
    });
    s.addText(t, {
      x: cx + 1.54, y: cy, w: colW - 1.76, h: 0.55,
      fontFace: BODY, fontSize: 10.5, color: hi ? INK : MUTE, margin: 0, valign: "middle",
    });
  });

  s.addNotes(
    "Diese Folie ist die Referenz. Gruen hinterlegt sind die Termine, die uns in den " +
    "naechsten 18 Monaten operativ betreffen.\n\n" +
    "Ich haenge das Deck nach dem Meeting in Teams. Wer will, druckt sich diese Folie aus.\n\n" +
    "Falls jemand fragt: Das genaue Stufe-2-Datum reiche ich nach, sobald ich das " +
    "Verkuendungsdatum im Bundesgesetzblatt geprueft habe."
  );
  footer(s, "Zusammengestellt aus Artikel 9 und den Einzelvorschriften · Drs. 21/7009");
}

/* ================================================================== *
 * 20 - SECHS NEUE AUFGABENFELDER
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Chancen", "Sechs neue Aufgabenfelder für WERK.E", {
    sub: "Jede neue Pflicht im Gesetz ist eine Leistung, die jemand erbringen muss. Das sind wir.",
  });

  const fields = [
    ["NWG-Bestand einordnen", "Für Bestandshalter und Kommunen klären: Welche Gebäude fallen 2030/2033 unter §§ 40/41 - und welche sind über die Fiktionen schon raus?"],
    ["Ökobilanz-Berichte § 88b", "Ab 2028 Pflicht im großen Neubau. Voraussetzung: Fortbildung nach § 88c, Software und Datengrundlagen des BMWSB."],
    ["NWG-Bedarfsausweise", "Jeder Verkauf und Neuvertrag braucht künftig eine vollständige Bilanzierung samt Begehung oder Fotodokumentation."],
    ["WP-Prüfung + Abgleich", "§ 60a-Prüfungen, Heizungscheck bis 09/2027, hydraulischer Abgleich inklusive raumweiser Heizlast - wiederkehrende Leistungen."],
    ["Gebäudeautomation § 56", "NWG über 70 kW bis Ende 2029: Konzept, Planung und Begleitung der Nachrüstung inklusive Beleuchtungssteuerung."],
    ["Solar- und GEIG-Prüfungen", "Bei Neubau, Dachsanierung und großen Parkplätzen: Solarpflicht und Ladeinfrastruktur mit Fristen ab 2027 prüfen."],
  ];

  const cw = (CW - 2 * 0.28) / 3;
  const ch = 1.90;
  fields.forEach(([t, d], i) => {
    const cx = M + (i % 3) * (cw + 0.28);
    const cy = 2.02 + Math.floor(i / 3) * (ch + 0.28);
    card(s, cx, cy, cw, ch, i < 3 ? GREEN_LT : PAPER, { shadow: true });
    badge(s, cx + 0.28, cy + 0.26, 0.42, String(i + 1), i < 3 ? GREEN_DARK : GREEN, WHITE, 13);
    s.addText(t, {
      x: cx + 0.28, y: cy + 0.80, w: cw - 0.56, h: 0.36,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: cx + 0.28, y: cy + 1.16, w: cw - 0.54, h: 0.62,
      fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 13,
    });
  });

  card(s, M, 6.14, CW, 0.62, INK);
  s.addText(
    [
      { text: "Fragen an euch:  ", options: { bold: true, color: GREEN } },
      { text: "Wer möchte sich in eines dieser Felder einarbeiten? Für die Ökobilanz brauchen wir 2027 mindestens eine Person mit § 88c-Fortbildung.", options: { color: WHITE } },
    ],
    {
      x: M + 0.30, y: 6.14, w: CW - 0.60, h: 0.62,
      fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Das ist der Punkt, an dem ich Beteiligung will - nicht nur Zuhoeren.\n\n" +
    "Jede dieser sechs Pflichten ist ein Auftrag, den irgendjemand erbringen muss. " +
    "Wenn wir frueh dran sind, sind wir die Ersten in der Region.\n\n" +
    "Konkret offen: Wer macht die § 88c-Fortbildung fuer die Oekobilanz? " +
    "Das braucht Vorlauf, wir muessen 2027 anfangen.\n\n" +
    "Ideen und Interesse bitte direkt hier oder danach im Sanierungs-Chat."
  );
  footer(s, "Querschnitt aus den Kapiteln 3 und 4 der Teamschulung");
}

/* ================================================================== *
 * 21 - WAS AB HEUTE GILT
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Praxis", "Was ab heute in der Beratung gilt", {
    sub: "Die Übergangsregeln für unsere laufenden Projekte.",
  });

  const phases = [
    ["Sofort", "Heizungsberatung umstellen: Optionenkatalog und Bio-Treppe statt 65 %. Keine 65-%-Konzepte mehr neu aufsetzen. Wirtschaftlichkeit fossiler Kessel neu rechnen - Bioanteil, CO₂-Preis, Quote, Kostenteilung.", GREEN_DARK],
    ["Bis Stufe 2 (≈ 01.01.2027)", "Bilanzen, Nachweise und Ausweise weiter nach DIN V 18599:2018. Projekte mit Fertigstellung ab 2027 aber vorausschauend kalkulieren - neue Normen, neue Bezugsfläche.", GREEN],
    ["Ab Stufe 2", "Software-Updates einspielen (Hottgenroth), neue Referenzgebäude und Faktoren nutzen, NWG-Ausweise nur noch als Bedarfsausweis erstellen.", SAGE],
    ["Förderung", "Die BEG läuft eigenständig weiter - Reform zum 21.07.2026, unsere Schulung dazu ist bereits durch. Entschließung des Bundestags: BEG bis mindestens 2029 fortführen.", MUTE],
  ];

  let y = 2.02;
  phases.forEach(([t, d, col]) => {
    card(s, M, y, CW, 0.96, PAPER, { shadow: true });
    s.addShape(pres.ShapeType.ellipse, {
      x: M + 0.32, y: y + 0.35, w: 0.26, h: 0.26,
      fill: { color: col }, line: { type: "none" },
    });
    s.addText(t, {
      x: M + 0.80, y: y + 0.12, w: 3.3, h: 0.34,
      fontFace: HEAD, fontSize: 15.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: M + 0.80, y: y + 0.46, w: CW - 1.12, h: 0.42,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 14,
    });
    y += 1.03;
  });

  noteBox(s, M, 6.25, CW, 0.62, "Bitte merken:",
    "Auch wenn die Beratungspflicht vor fossilem Einbau entfallen ist - wir dokumentieren unsere Empfehlung weiterhin schriftlich im Projekt.");

  s.addNotes(
    "Konkrete Handlungsanweisung fuer morgen frueh.\n\n" +
    "Der wichtigste Punkt ist ganz oben: Wer noch mit 65-%-Argumentation ins Kundengespraech geht, " +
    "erzaehlt geltendes Recht von gestern.\n\n" +
    "Zur BEG: Die Reform kam zum 21.07. Unsere Schulung dazu ist bereits gelaufen - " +
    "die Unterlagen liegen in Teams, bitte bei Bedarf nachlesen."
  );
  footer(s, "Artikel 9, §§ 110 ff. GModG · BEG-Reform 21.07.2026");
}

/* ================================================================== *
 * 22 - KAPITEL 2
 * ================================================================== */
divider("02", "Kapitel 2 · Praxis, Außenwirkung, Werkzeuge", "Was wir daraus gemacht haben.", [
  "Förderpraxis: ein Merksatz, der uns Geld spart",
  "Drei Schulungen, zwei Webinare, ein WDR-Beitrag",
  "KI-Werkzeuge und eine neue Marke",
]).addNotes(
  "Uebergang: Genug Gesetz. Jetzt zu dem, was wir in den drei Wochen konkret gemacht haben - " +
  "und da war trotz Sommerpause einiges los."
);

/* ================================================================== *
 * 23 - FOERDERPRAXIS
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Förderpraxis", "Der Merksatz aus dem Sanierungs-Chat", {
    sub: "Von David, 06.08. - und er hat recht.",
  });

  card(s, M, 2.00, CW, 1.55, INK);
  s.addText("„Plant ausreichend Puffer in den Anträgen und BzAs ein.\nWir haben ja keinen Nachteil, wenn da mehr drinsteht.\"", {
    x: M + 0.42, y: 2.00, w: CW - 0.84, h: 1.55,
    fontFace: HEAD, fontSize: 21, italic: true, color: WHITE, margin: 0, valign: "middle", lineSpacing: 32,
  });

  s.addText("Das Rechenbeispiel", {
    x: M, y: 3.82, w: 6, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0, valign: "middle",
  });

  const ex = [
    ["Angebot Heizungsbauer", "33.278 €", MUTE, PAPER],
    ["Nicht so: BzA bei 2 WE", "35.000 €", RED, PAPER],
    ["Sondern: BzA bei 2 WE", "42.000 - 45.000 €", GREEN_DARK, GREEN_LT],
  ];
  let ey = 4.28;
  ex.forEach(([t, v, col, bg]) => {
    card(s, M, ey, CW * 0.52, 0.62, bg, { radius: 0.06 });
    s.addText(t, {
      x: M + 0.26, y: ey, w: CW * 0.52 - 2.6, h: 0.62,
      fontFace: BODY, fontSize: 12, color: INK, margin: 0, valign: "middle",
    });
    s.addText(v, {
      x: M + CW * 0.52 - 2.5, y: ey, w: 2.24, h: 0.62,
      fontFace: HEAD, fontSize: 15, bold: true, color: col,
      align: "right", margin: 0, valign: "middle",
    });
    ey += 0.70;
  });

  card(s, M + CW * 0.55, 3.82, CW * 0.45, 2.58, PAPER, { shadow: true });
  s.addText("Weitere offene Punkte", {
    x: M + CW * 0.55 + 0.30, y: 4.00, w: CW * 0.45 - 0.60, h: 0.32,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Effizienzbonus: Warum ist der noch beantragbar? Simon hat den Infoletter-Hinweis, wir klären das verbindlich.", options: { bullet: true, breakLine: true } },
      { text: "iSFP-Handling bei Anträgen und die 30.000-€-Grenze - bitte im Zweifel kurz abstimmen statt raten.", options: { bullet: true, breakLine: true } },
      { text: "Neue Preisliste 2026 und der neue Preisrechner sind fertig und liegen in Teams.", options: { bullet: true, breakLine: true } },
      { text: "Vorlage „Bestätigung förderfähige Investitionskosten\" ist auf Stand 08/2026 aktualisiert.", options: { bullet: true } },
    ],
    {
      x: M + CW * 0.55 + 0.34, y: 4.40, w: CW * 0.45 - 0.68, h: 1.84,
      fontFace: BODY, fontSize: 11, color: INK, paraSpaceAfter: 8, margin: 0, valign: "top",
    }
  );

  s.addNotes(
    "David hat das am Donnerstag im Sanierungs-Chat angesprochen und ich moechte es hier verstaerken, " +
    "weil es alle betrifft, die Antraege stellen.\n\n" +
    "Wenn das Angebot bei 33.278 Euro liegt, dann sind 35.000 in der BzA bei 2 Wohneinheiten zu knapp. " +
    "Wir haben keinen Nachteil durch einen hoeheren Ansatz - aber wir haben ein Problem, " +
    "wenn die Kosten steigen und der Antrag zu klein ist.\n\n" +
    "Bitte als Standard uebernehmen: immer mit Puffer beantragen."
  );
  footer(s, "Sanierungs-Chat 06.08.2026 · WERKE_Preisliste_2026 · Vorlagen Portal");
}

/* ================================================================== *
 * 24 - THEMENFUEHRERSCHAFT
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Außenwirkung", "Wir sind beim Thema vorn dabei", {
    sub: "Drei Wochen Sommerpause - und trotzdem sichtbar wie selten.",
  });

  const items = [
    ["04.08.", "Kreisgruppenschulung GModG", "Schulung für die Schornsteinfeger-Kreisgruppe Paderborn, eigenes 25-Folien-Deck auf Stand der verkündeten Fassung. Unterlagen sind an alle Teilnehmer raus.", GREEN_DARK],
    ["20.07. + 03.08.", "Webinar „Was sich jetzt ändert\"", "Zwei Durchläufe mit Chiara und Steffi. Teilnehmer aus dem Handwerk: Holz-Striewe, WW Energie, Dehrendorf, CH-PB.", GREEN],
    ["16.07.", "Webinar KfW und BAFA", "Neue Förderbedingungen 2026 - direkt vor der Sommerpause, mit Steffi.", SAGE],
    ["06.08.", "WDR Ostwestfalen-Lippe", "Beitrag über das Kühlen mit der Wärmepumpe im Sommer, Kreis Höxter - mit Zitat von uns. Marketing greift das auf.", GREEN_DARK],
  ];

  const cw = (CW - 0.30) / 2;
  items.forEach(([date, t, d, col], i) => {
    const cx = M + (i % 2) * (cw + 0.30);
    const cy = 2.02 + Math.floor(i / 2) * 1.92;
    card(s, cx, cy, cw, 1.70, PAPER, { shadow: true });
    s.addShape(pres.ShapeType.roundRect, {
      x: cx + 0.28, y: cy + 0.24, w: 1.55, h: 0.34,
      fill: { color: col }, line: { type: "none" }, rectRadius: 0.17,
    });
    s.addText(date, {
      x: cx + 0.28, y: cy + 0.24, w: 1.55, h: 0.34,
      fontFace: BODY, fontSize: 10.5, bold: true,
      color: col === SAGE ? INK : WHITE, align: "center", valign: "middle", margin: 0,
    });
    s.addText(t, {
      x: cx + 0.28, y: cy + 0.68, w: cw - 0.56, h: 0.38,
      fontFace: HEAD, fontSize: 16, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: cx + 0.28, y: cy + 1.06, w: cw - 0.54, h: 0.54,
      fontFace: BODY, fontSize: 11, color: MUTE, margin: 0, valign: "top", lineSpacing: 14,
    });
  });

  card(s, M, 5.92, CW, 0.72, GREEN_LT);
  s.addText(
    [
      { text: "Das ist unser Vorsprung.  ", options: { bold: true, color: GREEN_DARK } },
      { text: "Wir haben die Schulungsunterlagen, während andere noch das Gesetz lesen. Wenn ihr im Kundengespräch oder im Netzwerk Fragen zum GModG bekommt: Ihr könnt antworten.", options: { color: INK } },
    ],
    {
      x: M + 0.30, y: 5.92, w: CW - 0.60, h: 0.72,
      fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Kurzer Stolz-Moment fuer das Team. Wir waren in der Sommerpause praesenter als manche im Vollbetrieb.\n\n" +
    "Der WDR-Beitrag ist der Aufhaenger fuer Social Media - Marketing hat das schon auf dem Schirm.\n\n" +
    "Danke an Chiara und Steffi fuer die Webinare, die liefen waehrend ich weg war."
  );
  footer(s, "Kalender + Teams-Chats 16.07. bis 06.08.2026");
}

/* ================================================================== *
 * 25 - KI IM ARBEITSALLTAG
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Werkzeuge", "KI ist bei uns im Alltag angekommen", {
    sub: "Was in den letzten drei Wochen damit entstanden ist - und was als Nächstes kommt.",
  });

  card(s, M, 2.00, (CW - 0.34) / 2, 3.30, PAPER, { shadow: true });
  s.addText("Was schon läuft", {
    x: M + 0.32, y: 2.20, w: 4.5, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Sanierungsratgeber wird automatisiert überarbeitet", options: { bullet: true, breakLine: true } },
      { text: "WERK.E Design System als Vorlage - Layouts und Assets im Corporate Look auf Knopfdruck", options: { bullet: true, breakLine: true } },
      { text: "Neuer Preisrechner auf Basis der Preisliste 2026", options: { bullet: true, breakLine: true } },
      { text: "Social-Media-Posts, zuletzt zum Thema Tiny Houses", options: { bullet: true, breakLine: true } },
      { text: "Website-Texte und Bildmaterial in 4K", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 2.62, w: (CW - 0.34) / 2 - 0.72, h: 2.48,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 9, margin: 0, valign: "top",
    }
  );

  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.00, (CW - 0.34) / 2, 3.30, GREEN_LT);
  s.addText("Was als Nächstes kommt", {
    x: rx + 0.32, y: 2.20, w: 4.5, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Eigene Zugänge für alle, die damit arbeiten wollen - meldet euch einfach bei mir", options: { bullet: true, breakLine: true } },
      { text: "Kurze interne Einführung: Was geht, was geht nicht, was gehört nicht rein", options: { bullet: true, breakLine: true } },
      { text: "Grundregel: Kundendaten und personenbezogene Daten bleiben draußen", options: { bullet: true, breakLine: true } },
      { text: "Zweite Grundregel: Ergebnisse werden immer fachlich geprüft, bevor sie rausgehen", options: { bullet: true } },
    ],
    {
      x: rx + 0.36, y: 2.62, w: (CW - 0.34) / 2 - 0.72, h: 2.48,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 9, margin: 0, valign: "top",
    }
  );

  card(s, M, 5.52, CW, 1.05, INK);
  s.addText("Neu online: eh-westfalen.de", {
    x: M + 0.32, y: 5.64, w: 6, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Die Seite ist seit dieser Woche live, die Terminbuchung ist eingerichtet. Wer Kundinnen und Kunden hat, für die das passt: Der Buchungslink kann ab sofort weitergegeben werden.", {
    x: M + 0.32, y: 5.98, w: CW - 0.64, h: 0.46,
    fontFace: BODY, fontSize: 12, color: "C9D2CA", margin: 0, valign: "top", lineSpacing: 15,
  });

  s.addNotes(
    "Ich will das nicht als Spielerei verkaufen, sondern als Werkzeug. " +
    "Der Preisrechner und das Design System sind echte Arbeitserleichterungen.\n\n" +
    "Wichtig sind mir die zwei Grundregeln rechts unten: keine Kundendaten rein, " +
    "und alles wird fachlich geprueft bevor es rausgeht. Das ist nicht verhandelbar.\n\n" +
    "Wer einen Zugang will: einfach ansprechen, ich richte das ein.\n\n" +
    "Zur eh-westfalen.de nur kurz - Details klaere ich separat, die Seite ist frisch."
  );
  footer(s, "Teams-Chats 05.08. und 06.08.2026");
}

/* ================================================================== *
 * 26 - KAPITEL 3
 * ================================================================== */
divider("03", "Kapitel 3 · Team und Kultur", "Wie wir zusammenarbeiten.", [
  "Code of Conduct: erster Entwurf liegt vor",
  "Personelles und Vertretungen",
  "Termine bis September",
]).addNotes(
  "Uebergang: Zum Schluss das, was uns als Team betrifft. " +
  "Und hier will ich vor allem eure Meinung hoeren, nicht meine vortragen."
);

/* ================================================================== *
 * 27 - CODE OF CONDUCT
 * ================================================================== */
{
  const s = contentSlide("Kapitel 3 · Beteiligung", "Unser Code of Conduct - erster Entwurf", {
    sub: "Erarbeitet von der AG Demokratie & Gleichstellung im Betrieb. Stand: August 2026, ausdrücklich ein Arbeitsstand.",
  });

  card(s, M, 2.02, CW * 0.56, 2.55, PAPER, { shadow: true });
  s.addText("Worum es geht", {
    x: M + 0.32, y: 2.22, w: 5.0, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Bei WERK.E arbeiten viele Menschen mit sehr unterschiedlichen Aufgaben zusammen - von der Sanierung bis zur Verwaltung.", options: { bullet: true, breakLine: true } },
      { text: "Der Kodex hält fest, wie wir miteinander umgehen wollen. Kein Regelwerk von oben, sondern eine gemeinsame Verständigung.", options: { bullet: true, breakLine: true } },
      { text: "Es gibt bereits eine gestaltete Fassung als PDF - die schicke ich mit dem Protokoll rum.", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 2.64, w: CW * 0.56 - 0.72, h: 1.72,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 9, margin: 0, valign: "top",
    }
  );

  card(s, M + CW * 0.59, 2.02, CW * 0.41, 2.55, GREEN_LT);
  s.addText("Wer daran arbeitet", {
    x: M + CW * 0.59 + 0.30, y: 2.22, w: CW * 0.41 - 0.60, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Larissa · Alina · Marike · Lisa · Birgitta", {
    x: M + CW * 0.59 + 0.30, y: 2.64, w: CW * 0.41 - 0.60, h: 0.36,
    fontFace: BODY, fontSize: 13, bold: true, color: INK, margin: 0, valign: "middle",
  });
  s.addText("Unterstützung zugesagt haben Steffi und Annika. Neele wird nach ihrem Urlaub gefragt.", {
    x: M + CW * 0.59 + 0.30, y: 3.04, w: CW * 0.41 - 0.60, h: 0.60,
    fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
  });
  s.addText("Wer noch mitarbeiten möchte, ist herzlich eingeladen - sprecht Larissa an.", {
    x: M + CW * 0.59 + 0.30, y: 3.72, w: CW * 0.41 - 0.60, h: 0.60,
    fontFace: BODY, fontSize: 11.5, bold: true, color: GREEN_DARK, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M, 4.82, CW, 1.42, INK);
  s.addText("Was ich heute von euch brauche", {
    x: M + 0.32, y: 4.96, w: CW - 0.64, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Passt die Richtung? Fehlt etwas Wesentliches?", options: { bullet: true, breakLine: true } },
      { text: "Rückmeldungen bitte bis Ende August an Larissa - schriftlich oder im Gespräch, wie es euch lieber ist.", options: { bullet: true, breakLine: true } },
      { text: "Ziel: eine Fassung, hinter der wir alle stehen. Kein Papier für die Schublade.", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 5.32, w: CW - 0.72, h: 0.82,
      fontFace: BODY, fontSize: 12, color: WHITE, paraSpaceAfter: 5, margin: 0, valign: "top",
    }
  );

  s.addNotes(
    "Hier bitte wirklich Zeit lassen und ins Gespraech gehen. Das ist der Beteiligungspunkt des Meetings.\n\n" +
    "Larissa hat den Entwurf am Mittwoch in die AG gegeben. Ich moechte, dass das Team ihn kennt " +
    "und die Chance hat, sich einzubringen - bevor daraus etwas Verbindliches wird.\n\n" +
    "Larissa kurz das Wort geben, wenn sie mag.\n\n" +
    "Frist bis Ende August nennen, sonst passiert nichts."
  );
  footer(s, "WERK.E_Code_of_Conduct_Entwurf · AG Demokratie & Gleichstellung, 05.08.2026");
}

/* ================================================================== *
 * 28 - TEAM & PERSONELLES
 * ================================================================== */
{
  const s = contentSlide("Kapitel 3 · Team", "Personelles und Vertretungen", {
    sub: "Wer ist da, wer nicht, und an wen wendet ihr euch.",
  });

  // Links: Personelles
  card(s, M, 2.00, (CW - 0.34) / 2, 2.46, PAPER, { shadow: true });
  s.addText("Aus dem Team", {
    x: M + 0.32, y: 2.18, w: 4.5, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Katrin meldet sich zurück - in drei Monaten geht es wieder los. Wir setzen uns Ende August zusammen.", options: { bullet: true, breakLine: true } },
      { text: "Manuela ist bis auf Weiteres in Elternzeit, David übernimmt ihre Projekte.", options: { bullet: true, breakLine: true } },
      { text: "Dominik hat am 31.07. geheiratet - herzlichen Glückwunsch!", options: { bullet: true, breakLine: true } },
      { text: "Annika heißt jetzt Friesen, nicht mehr Giesbrecht. Bitte in Verteilern anpassen.", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 2.56, w: (CW - 0.34) / 2 - 0.72, h: 1.62,
      fontFace: BODY, fontSize: 11.5, color: INK, paraSpaceAfter: 7, margin: 0, valign: "top",
    }
  );

  // Rechts: Vertretungen
  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.00, (CW - 0.34) / 2, 2.46, GREEN_LT);
  s.addText("Urlaube und Vertretung", {
    x: rx + 0.32, y: 2.16, w: 4.5, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Melissa ist bis 24.08. im Urlaub. Ihre Vertretung ist vorbildlich geregelt:", {
    x: rx + 0.36, y: 2.52, w: (CW - 0.34) / 2 - 0.72, h: 0.44,
    fontFace: BODY, fontSize: 11, color: INK, margin: 0, valign: "top", lineSpacing: 14,
  });

  const vert = [["info@", "Biggi"], ["Anträge", "Lisa"], ["Rückfragen", "Alina"], ["Drucken / Versand", "Alina"]];
  let vy = 3.02;
  vert.forEach(([a, b]) => {
    s.addText(a, {
      x: rx + 0.40, y: vy, w: 2.2, h: 0.27,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: rx + 2.65, y: vy, w: 2.0, h: 0.27,
      fontFace: BODY, fontSize: 11.5, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    vy += 0.29;
  });
  s.addText("Christin ist morgen im Urlaub, Neele ebenfalls unterwegs.", {
    x: rx + 0.36, y: 4.16, w: (CW - 0.34) / 2 - 0.72, h: 0.26,
    fontFace: BODY, fontSize: 10.5, italic: true, color: MUTE, margin: 0, valign: "middle",
  });

  card(s, M, 4.70, CW, 1.05, INK);
  s.addText("Das machen wir ab jetzt alle so", {
    x: M + 0.32, y: 4.82, w: CW - 0.64, h: 0.30,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Vor jedem längeren Urlaub eine kurze Nachricht in den WERK.E-Chat: Zeitraum, und wer welchen Bereich übernimmt. Melissas Nachricht vom Donnerstag ist die Vorlage - so weiß jeder sofort, an wen er sich wendet.", {
    x: M + 0.32, y: 5.12, w: CW - 0.64, h: 0.50,
    fontFace: BODY, fontSize: 12, color: WHITE, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M, 5.98, CW, 0.72, GREEN_LT);
  s.addText(
    [
      { text: "Rückblick Libori:  ", options: { bold: true, color: GREEN_DARK } },
      { text: "Danke an alle, die am 30.07. dabei waren - Autoscooter inklusive. Die Abrechnung liegt bei rund 1.750 €, das war es wert. Nächster Termin: WERK.E Frühstück wieder jeden Freitag.", options: { color: INK } },
    ],
    {
      x: M + 0.30, y: 5.90, w: CW - 0.60, h: 0.72,
      fontFace: BODY, fontSize: 12, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Kurz und warm halten. Glueckwunsch an Dominik ruhig kurz applaudieren lassen.\n\n" +
    "Der Punkt mit den Vertretungen ist mir wichtig: Melissas Nachricht war genau richtig. " +
    "Zeitraum plus konkrete Zustaendigkeiten. Das soll Standard werden.\n\n" +
    "Katrin nicht zu viel vorwegnehmen - wir sprechen erst Ende August."
  );
  footer(s, "Teams-Chats + Kalender 16.07. bis 06.08.2026");
}

/* ================================================================== *
 * 29 - TERMINE & AUSBLICK
 * ================================================================== */
{
  const s = contentSlide("Kapitel 3 · Ausblick", "Was bis September ansteht", {
    sub: "Termine, Zusagen und offene Aufgaben.",
  });

  const items = [
    ["Bis Ende August", "Rückmeldungen zum Code of Conduct an Larissa", GREEN_DARK],
    ["Erledigt", "GModG- und BEG-Schulung sind durch - alle Unterlagen liegen in Teams", GREEN_DARK],
    ["Laufend", "Bestandskunden mit Heizungen von vor 10/2009 identifizieren - Frist § 60b läuft", GREEN],
    ["28.08.", "Gespräch mit Katrin zur Rückkehr", GREEN],
    ["03.09.", "ID. Polo Markteinführungsevent in Kassel - gemeinsam mit WERK.E Mitte, Glinicke, Audi Kassel und der Kasseler Sparkasse", SAGE],
    ["Offen", "Wer übernimmt die § 88c-Fortbildung Ökobilanz? Vorlauf für 2028 beginnt jetzt", SAGE],
  ];

  let y = 2.02;
  items.forEach(([w, t, col]) => {
    card(s, M, y, CW * 0.63, 0.66, PAPER, { radius: 0.06 });
    s.addShape(pres.ShapeType.ellipse, {
      x: M + 0.26, y: y + 0.20, w: 0.26, h: 0.26,
      fill: { color: col }, line: { type: "none" },
    });
    s.addText(w, {
      x: M + 0.70, y, w: 2.2, h: 0.66,
      fontFace: BODY, fontSize: 11.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(t, {
      x: M + 2.95, y, w: CW * 0.63 - 3.2, h: 0.66,
      fontFace: BODY, fontSize: 11, color: MUTE, margin: 0, valign: "middle", lineSpacing: 14,
    });
    y += 0.74;
  });

  card(s, M + CW * 0.66, 2.02, CW * 0.34, 4.20, INK);
  s.addText("Feste Termine", {
    x: M + CW * 0.66 + 0.30, y: 2.22, w: CW * 0.34 - 0.60, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN, margin: 0, valign: "middle",
  });

  const fix = [
    ["Freitags 09:00", "WERK.E Frühstück"],
    ["Montags 10:30", "Weekly Recap"],
    ["Dienstags", "Jour fixe Schornsteinfeger"],
    ["Donnerstags 10:00", "Marketing Jour Fixe"],
    ["14-tägig", "Jour Fixe WERK.E Mitte"],
  ];
  let fy = 2.72;
  fix.forEach(([a, b]) => {
    s.addText(a, {
      x: M + CW * 0.66 + 0.32, y: fy, w: CW * 0.34 - 0.64, h: 0.26,
      fontFace: BODY, fontSize: 10.5, color: SAGE, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: M + CW * 0.66 + 0.32, y: fy + 0.23, w: CW * 0.34 - 0.64, h: 0.29,
      fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE, margin: 0, valign: "middle",
    });
    fy += 0.60;
  });

  s.addText("Alle Schulungsunterlagen liegen in Teams. Fragen bitte dort sammeln.", {
    x: M + CW * 0.66 + 0.32, y: 5.80, w: CW * 0.34 - 0.64, h: 0.40,
    fontFace: BODY, fontSize: 10, color: "C9D2CA", margin: 0, valign: "top", lineSpacing: 13,
  });

  s.addNotes(
    "Konkrete Zusagen, damit das Meeting Folgen hat.\n\n" +
    "Zwei Dinge brauchen heute noch einen Namen: " +
    "Wer filtert die § 60b-Bestandskunden, und wer macht die Oekobilanz-Fortbildung.\n\n" +
    "Wenn sich niemand meldet, spreche ich Leute direkt an - aber freiwillig ist mir lieber."
  );
  footer(s, "Stand 06.08.2026");
}

/* ================================================================== *
 * 30 - ABSCHLUSS
 * ================================================================== */
{
  const s = pres.addSlide();
  s.background = { color: INK };

  s.addShape(pres.ShapeType.ellipse, {
    x: -1.8, y: 4.2, w: 5.2, h: 5.2,
    fill: { color: GREEN_MID }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.8, y: -1.4, w: 4.2, h: 4.2,
    fill: { color: GREEN_DARK }, line: { type: "none" },
  });

  s.addText("Zum Mitnehmen", {
    x: M, y: 0.80, w: 8, h: 0.55,
    fontFace: HEAD, fontSize: 30, bold: true, color: WHITE, margin: 0, valign: "middle",
  });

  const takeaways = [
    "Die 65-%-Pflicht ist Geschichte. Pflichten hängen jetzt am Brennstoff, nicht an der Technik.",
    "Fossil bleibt erlaubt, wird aber planbar teuer - Bio-Treppe, CO₂-Preis, Quote, Kostenteilung.",
    "Ab Stufe 2 rechnen wir neu: DIN/TS 18599, Nutzfläche, neue Faktoren, neue Ausweise.",
    "Neubau 2030 heißt Nullemission. Der NWG-Bestand bekommt erstmals Mindeststandards.",
    "Jede neue Pflicht ist eine Leistung, die jemand erbringen muss. Seien wir die Ersten.",
  ];

  let y = 1.70;
  takeaways.forEach((t, i) => {
    badge(s, M, y + 0.06, 0.40, String(i + 1), GREEN_DARK, WHITE, 13);
    s.addText(t, {
      x: M + 0.62, y, w: 9.4, h: 0.52,
      fontFace: BODY, fontSize: 14, color: WHITE, margin: 0, valign: "middle",
    });
    y += 0.66;
  });

  s.addText("Fragen und Diskussion", {
    x: M, y: 5.35, w: 8, h: 0.55,
    fontFace: HEAD, fontSize: 26, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Fragen aus euren Projekten sammeln wir direkt hier - die Antworten pflege ich in die Schulungsunterlagen ein.", {
    x: M, y: 5.90, w: 9.4, h: 0.50,
    fontFace: BODY, fontSize: 13, color: "C9D2CA", margin: 0, valign: "top", lineSpacing: 17,
  });

  s.addText("WERK.E Energie-Effizienz-Beratungs GmbH & Co. KG  ·  Rolandsweg 80, 33102 Paderborn  ·  07.08.2026", {
    x: M, y: 6.75, w: CW, h: 0.28,
    fontFace: BODY, fontSize: 9.5, color: MUTE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Abschluss. Die fuenf Punkte noch einmal laut vorlesen - das sind die Saetze, " +
    "die im Kopf bleiben sollen.\n\n" +
    "Dann Raum fuer Fragen. Alles, was ich nicht beantworten kann, notiere ich " +
    "und pflege es in die Schulungsunterlagen ein.\n\n" +
    "Nicht vergessen: Die zwei offenen Zustaendigkeiten (§ 60b-Filterung, § 88c-Fortbildung) " +
    "am Ende noch einmal ansprechen, falls sich noch niemand gemeldet hat."
  );
}

/* ------------------------------------------------------------------ */
pres.writeFile({ fileName: "WERKE_Teammeeting_2026-08-07.pptx" }).then((f) => {
  console.log("Erstellt: " + f);
});
