/**
 * WERK.E - Grosses Team-Meeting 07.08.2026
 * Rueckblick 16.07. - 06.08.2026
 *
 * Foliensatz nach Freigabe durch die Geschaeftsfuehrung (20 Folien).
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

const HEAD = "Trebuchet MS";
const BODY = "Calibri";

const W = 13.33;
const H = 7.5;
const M = 0.62;
const CW = W - 2 * M;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "WERK.E Energie-Effizienz-Beratung";
pres.company = "WERK.E Energie-Effizienz-Beratungs GmbH und Co. KG";
pres.title = "Grosses Team-Meeting - 07.08.2026";

/* ------------------------------------------------------------------ *
 * Bausteine
 * ------------------------------------------------------------------ */
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

function footer(s, txt) {
  s.addText(txt, {
    x: M, y: H - 0.46, w: CW, h: 0.26,
    fontFace: BODY, fontSize: 9, color: MUTE, margin: 0, valign: "middle",
  });
}

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
    x: 9.4, y: -2.0, w: 6.4, h: 6.4, fill: { color: GREEN_MID }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 11.3, y: 4.5, w: 3.4, h: 3.4, fill: { color: GREEN_DARK }, line: { type: "none" },
  });

  s.addText("WERK.E", {
    x: M, y: 0.85, w: 6, h: 0.5,
    fontFace: HEAD, fontSize: 22, bold: true, charSpacing: 3.5, color: GREEN,
    margin: 0, valign: "middle",
  });
  s.addText("Energie-Effizienz-Beratung", {
    x: M, y: 1.28, w: 6, h: 0.3,
    fontFace: BODY, fontSize: 12, charSpacing: 1.2, color: MUTE, margin: 0, valign: "middle",
  });
  s.addText("Großes Team-Meeting", {
    x: M, y: 2.55, w: 8.6, h: 0.95,
    fontFace: HEAD, fontSize: 46, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addText("Willkommen zurück aus der Sommerpause.\nWas jetzt zählt - und was vor uns liegt.", {
    x: M, y: 3.62, w: 8.2, h: 0.95,
    fontFace: BODY, fontSize: 17, color: "C9D2CA", lineSpacing: 26, margin: 0, valign: "top",
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
  s.addText("Rolandsweg 80, Paderborn", {
    x: M, y: 6.05, w: 8.6, h: 0.3,
    fontFace: BODY, fontSize: 11, color: MUTE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Begruessung. Erstes vollstaendiges Zusammenkommen nach der Sommerpause - " +
    "das Fruehstueck am 24.07. ist urlaubsbedingt ausgefallen.\n\n" +
    "Kurz abholen: Wer war im Urlaub, wer ist wieder da. " +
    "Dann direkt zum Hauptthema ueberleiten."
  );
}

/* ================================================================== *
 * 02 - AGENDA
 * ================================================================== */
{
  const s = contentSlide("Agenda", "Worüber wir heute sprechen", {
    sub: "Kompakt gehalten - drei Blöcke, danach ist Zeit für eure Fragen.",
  });

  const items = [
    ["01", "Das GModG gilt", "Was ab sofort zählt, was zum 01.01.2027 kommt\nund welches Förderfenster gerade offen ist", GREEN_DARK],
    ["02", "Praxis und Markt", "Förderanträge, Preise, Sichtbarkeit, Werkzeuge\nund wo wir als Nächstes hingehen", GREEN],
    ["03", "Team", "Code of Conduct, Personelles und was ansteht", MUTE],
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
      x: M + 1.18, y: y + 0.70, w: 7.4, h: 0.56,
      fontFace: BODY, fontSize: 12.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 16,
    });
    y += 1.62;
  });

  s.addText("~ 45 Min.", {
    x: W - M - 2.0, y: 2.05, w: 1.8, h: 0.4,
    fontFace: BODY, fontSize: 12, bold: true, color: GREEN_DARK,
    align: "right", margin: 0, valign: "middle",
  });

  s.addNotes(
    "Kurz durchgehen, nicht vorlesen.\n\n" +
    "Hinweis ans Team: Die vollstaendigen GModG-Schulungsunterlagen liegen in Teams. " +
    "Heute geht es nur um das, was operativ zaehlt."
  );
  footer(s, "WERK.E · Team-Meeting 07.08.2026");
}

/* ================================================================== *
 * 03 - KAPITEL 1
 * ================================================================== */
divider("01", "Kapitel 1 · Gesetzeslage", "Das GModG gilt.", [
  "Was ab sofort in der Beratung zählt",
  "Was sich zum 01.01.2027 grundlegend ändert",
  "Ein Förderfenster, das im November zufällt",
]).addNotes(
  "Uebergang: Die Schulung habt ihr alle gehabt, die Unterlagen liegen in Teams. " +
  "Heute nur die Punkte, die im Alltag sofort wirken - kein Paragrafenritt."
);

/* ================================================================== *
 * 04 - WAS JETZT GILT / STUFE 2
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Zwei Geschwindigkeiten", "Was jetzt gilt - und was 2027 kommt", {
    sub: "Das Gesetz kommt in Stufen. Für den Alltag zählt vor allem die linke Spalte.",
  });

  card(s, M, 1.95, (CW - 0.34) / 2, 3.55, GREEN_LT);
  s.addText("Gilt ab sofort", {
    x: M + 0.34, y: 2.15, w: 4.6, h: 0.40,
    fontFace: HEAD, fontSize: 21, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Die 65-%-EE-Pflicht ist gestrichen - samt Betriebsverboten und der 30-Jahre-Regel", options: { bullet: true, breakLine: true } },
      { text: "Stattdessen freie Wahl aus einem Optionenkatalog; wer fossil einbaut, bekommt ab 2029 steigende Bio-Anteile", options: { bullet: true, breakLine: true } },
      { text: "Die Pflichtberatung vor fossilem Einbau entfällt - wir dokumentieren unsere Empfehlung trotzdem schriftlich", options: { bullet: true, breakLine: true } },
      { text: "Bei irreparablem Ausfall gilt eine Karenz von 12 Monaten", options: { bullet: true } },
    ],
    {
      x: M + 0.38, y: 2.62, w: (CW - 0.34) / 2 - 0.76, h: 2.66,
      fontFace: BODY, fontSize: 12.5, color: INK, paraSpaceAfter: 10, margin: 0, valign: "top",
    }
  );

  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 1.95, (CW - 0.34) / 2, 3.55, PAPER, { shadow: true });
  s.addText("Kommt zu Stufe 2", {
    x: rx + 0.34, y: 2.15, w: 4.6, h: 0.40,
    fontFace: HEAD, fontSize: 21, bold: true, color: INK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Neue Rechenregeln und eine neue Bezugsfläche für jede Bilanz", options: { bullet: true, breakLine: true } },
      { text: "Neues Ausweisrecht: Nichtwohngebäude nur noch mit Bedarfsausweis", options: { bullet: true, breakLine: true } },
      { text: "Erstmals Sanierungspflicht im Nichtwohn-Bestand", options: { bullet: true, breakLine: true } },
      { text: "Bundesweite Solarpflicht und die GEIG-Pflichten für Stellplätze", options: { bullet: true } },
    ],
    {
      x: rx + 0.38, y: 2.62, w: (CW - 0.34) / 2 - 0.76, h: 2.66,
      fontFace: BODY, fontSize: 12.5, color: INK, paraSpaceAfter: 10, margin: 0, valign: "top",
    }
  );

  card(s, M, 5.78, CW, 0.92, INK);
  s.addText("Wann genau ist Stufe 2?", {
    x: M + 0.32, y: 5.88, w: CW - 0.64, h: 0.28,
    fontFace: HEAD, fontSize: 14, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Erster Tag des sechsten Kalendermonats nach der Verkündung - nach heutigem Stand rund um den 01.01.2027. Bis dahin rechnen und bescheinigen wir unverändert wie bisher.", {
    x: M + 0.32, y: 6.16, w: CW - 0.64, h: 0.44,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 16,
  });

  s.addNotes(
    "Wichtigste Botschaft: Wer noch mit 65-%-Argumentation ins Kundengespraech geht, " +
    "erzaehlt Recht von gestern. Bitte ab sofort umstellen.\n\n" +
    "Zweite Botschaft: In der Bilanzierung aendert sich JETZT noch nichts. " +
    "Wer also gerade rechnet, rechnet weiter wie bisher.\n\n" +
    "Das exakte Stufe-2-Datum gebe ich im Sanierungs-Chat durch, sobald ich es geprueft habe."
  );
  footer(s, "GModG · Artikel 9 (Inkrafttreten)");
}

/* ================================================================== *
 * 05 - FUENF ZEITSTUFEN
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Artikel 9", "Ein Gesetz, fünf Zeitstufen", {
    sub: "Fast alles hat ein Datum. Wer die Fristen kennt, plant Projekte rechtssicher.",
  });

  const cols = [
    ["Ab sofort", ["65 % und Betriebs-\nverbote gestrichen", "Neues Heizungsrecht", "Havarie-Regeln", "Neues Mietrecht"], GREEN_DARK, true],
    ["≈ 01.01.2027\nStufe 2", ["Rechenregeln neu", "Ausweisrecht neu", "NWG-Sanierungspflicht", "Solarpflicht + GEIG"], GREEN, true],
    ["01.01.2028", ["Nullemission neue\növentliche NWG", "CO₂ + Netzentgelte\nhälftig", "THG-Bericht ab\n1.000 m²"], SAGE, false],
    ["01.01.2029", ["Bio-Anteil 10 % für\nneue fossile Kessel", "Brennstoffkosten\nhälftig", "Gebäudeautomation\nbis Ende 2029"], SAGE, false],
    ["01.01.2030", ["Nullemission alle\nNeubauten", "Referenz-fp 0,70", "NWG max. 3,5 ×\nReferenz", "Solarpflicht neue WG"], SAGE, false],
  ];

  const bw = (CW - 4 * 0.20) / 5;
  let x = M;
  cols.forEach(([head, list, col, light]) => {
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.98, w: bw, h: 0.76,
      fill: { color: col }, line: { type: "none" }, rectRadius: 0.08,
    });
    s.addText(head, {
      x: x + 0.08, y: 1.98, w: bw - 0.16, h: 0.76,
      fontFace: HEAD, fontSize: 13, bold: true,
      color: light ? WHITE : INK,
      align: "center", valign: "middle", margin: 0, lineSpacing: 16,
    });
    card(s, x, 2.86, bw, 2.62, PAPER);
    s.addText(
      list.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < list.length - 1 } })),
      {
        x: x + 0.20, y: 3.02, w: bw - 0.36, h: 2.32,
        fontFace: BODY, fontSize: 10.5, color: INK,
        paraSpaceAfter: 7, margin: 0, valign: "top", lineSpacing: 13,
      }
    );
    x += bw + 0.20;
  });

  noteBox(s, M, 5.66, CW, 0.62, "Danach:",
    "2033 zweite NWG-Stufe  ·  2035 Bio-Anteil 30 %  ·  2040 Bio-Anteil 60 %  ·  2045 Brennstoffe klimaneutral über die Lieferantenquote");

  s.addNotes(
    "Diese Folie bitte fotografieren - das ist die Orientierung fuer die naechsten Jahre.\n\n" +
    "Fuer den Alltag zaehlen die ersten beiden Spalten. Alles ab 2028 ist Planungshorizont, " +
    "aber relevant, wenn wir heute Anlagen auslegen, die 20 Jahre laufen sollen."
  );
  footer(s, "Artikel 9 des Änderungsgesetzes · BT-Drs. 21/7009, S. 159");
}

/* ================================================================== *
 * 06 - RECHENREGIME STUFE 2
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Ab Stufe 2 (≈ 01.01.2027)", "Ab 2027 rechnen wir anders", {
    sub: "Neue Norm, neue Bezugsfläche. Betrifft jede Bilanz und jeden Ausweis, den wir danach ausstellen.",
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
      { text: "Bisher Wohngebäude: AN = 0,32 · Ve - eine Rechengröße, meist größer als die echte Wohnfläche", options: { bullet: true, breakLine: true } },
      { text: "Bisher Nichtwohngebäude: Nettogrundfläche", options: { bullet: true, breakLine: true } },
      { text: "Neu für beide: „Nutzfläche\" = die tatsächlich beheizte oder gekühlte Nettoraumfläche nach DIN 277:2021-08", options: { bullet: true } },
    ],
    {
      x: rx + 0.36, y: 2.62, w: (CW - 0.34) / 2 - 0.72, h: 1.62,
      fontFace: BODY, fontSize: 11.5, color: INK, paraSpaceAfter: 6, margin: 0, valign: "top",
    }
  );

  card(s, M, 4.62, CW, 1.12, INK);
  s.addText("Die Folge - und unsere wichtigste Kundenbotschaft", {
    x: M + 0.32, y: 4.76, w: CW - 0.64, h: 0.30,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Alle kWh/m²-Kennwerte verschieben sich systematisch. Alte und neue Ausweise sind nicht mehr direkt vergleichbar. Das müssen wir aktiv erklären, bevor der Kunde es selbst merkt und uns einen Rechenfehler unterstellt.", {
    x: M + 0.32, y: 5.08, w: CW - 0.64, h: 0.52,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 16,
  });

  card(s, M, 5.94, CW, 0.72, GREEN_LT);
  s.addText(
    [
      { text: "Was wir vorbereiten:  ", options: { bold: true, color: GREEN_DARK } },
      { text: "Software-Update Hottgenroth rechtzeitig einspielen. Projekte mit Fertigstellung ab 2027 schon jetzt vorausschauend kalkulieren.", options: { color: INK } },
    ],
    {
      x: M + 0.30, y: 5.94, w: CW - 0.60, h: 0.72,
      fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Der praktische Kern: Ab Stufe 2 sind unsere Zahlen andere - nicht weil wir anders arbeiten, " +
    "sondern weil die Rechenregeln andere sind.\n\n" +
    "Bitte jetzt schon im Hinterkopf behalten bei Projekten, die 2027 fertig werden.\n\n" +
    "Ich kuemmere mich um das Hottgenroth-Update, sobald das Stufe-2-Datum feststeht."
  );
  footer(s, "§§ 20-30 und § 3 Nr. 26 GModG · Artikel 2, Stufe 2");
}

/* ================================================================== *
 * 07 - GEIG LADEINFRASTRUKTUR
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · GEIG", "Ladeinfrastruktur: wer muss wann verkabeln?", {
    sub: "Gilt ab Stufe 2. Bei Neubau, großer Renovierung und Dachsanierung früh mitdenken.",
  });

  const geig = [
    ["Neubau Wohngebäude", "mehr als 3 Stellplätze", "50 % vorverkabeln, mindestens 1 Ladepunkt"],
    ["Neubau Nichtwohngebäude", "mehr als 5 Stellplätze", "50 % vorverkabeln, 1 Ladepunkt je 5. Stellplatz"],
    ["Große Renovierung", "WG über 3 / NWG über 5", "wie Neubau, wenn Parkplatz oder Elektrik betroffen sind"],
    ["Bestand Nichtwohngebäude", "mehr als 20 Stellplätze", "ab 01.01.2027: 1 Ladepunkt je 10 Stellplätze oder 50 % Leitungsinfrastruktur"],
  ];

  let y = 2.02;
  geig.forEach(([a, b, c], i) => {
    card(s, M, y, CW, 0.90, i === 3 ? GREEN_LT : PAPER, { shadow: true });
    badge(s, M + 0.30, y + 0.25, 0.40, String(i + 1), i === 3 ? GREEN_DARK : GREEN, WHITE, 13);
    s.addText(a, {
      x: M + 0.88, y: y + 0.10, w: 3.4, h: 0.34,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: M + 4.35, y: y + 0.10, w: 2.6, h: 0.34,
      fontFace: BODY, fontSize: 12, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    s.addText(c, {
      x: M + 0.88, y: y + 0.44, w: CW - 1.20, h: 0.36,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "middle",
    });
    y += 0.98;
  });

  noteBox(s, M, 5.98, CW, 0.72, "Der häufigste Fehler:",
    "„Vorverkabeln\" heißt anschlussfertig bis zum Endpunkt. Reine Leerrohre oder Kabelkanäle genügen ausdrücklich nicht. Neue Ladepunkte müssen außerdem intelligentes Laden beherrschen.");

  s.addNotes(
    "Kurz halten - die Tabelle spricht fuer sich.\n\n" +
    "Der Punkt mit den Leerrohren unten ist in der Praxis der haeufigste Fehler. " +
    "Bitte bei Bauherren frueh ansprechen, das aendert die Kalkulation spuerbar.\n\n" +
    "Ueberleitung zur naechsten Folie: Und genau dafuer gibt es gerade Geld - aber nicht mehr lange."
  );
  footer(s, "GEIG in der Fassung von Artikel 7 des Änderungsgesetzes");
}

/* ================================================================== *
 * 08 - FOERDERUNG LADEN IM MEHRPARTEIENHAUS
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Förderung", "Laden im Mehrparteienhaus - das Fenster schließt", {
    sub: "Bundesprogramm des Verkehrsministeriums, 500 Mio. € Volumen. Genau die Zielgruppe, die wir ohnehin beraten.",
  });

  // Frist-Callout
  card(s, M, 1.98, 3.55, 1.70, INK);
  s.addText("ANTRAGSFRIST", {
    x: M + 0.30, y: 2.14, w: 3.0, h: 0.26,
    fontFace: BODY, fontSize: 10, bold: true, charSpacing: 1.4, color: SAGE, margin: 0, valign: "middle",
  });
  s.addText("10.11.2026", {
    x: M + 0.30, y: 2.42, w: 3.0, h: 0.62,
    fontFace: HEAD, fontSize: 34, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Anträge laufen seit 15.04.2026. Danach ist das Programm zu.", {
    x: M + 0.30, y: 3.06, w: 2.98, h: 0.50,
    fontFace: BODY, fontSize: 11, color: "C9D2CA", margin: 0, valign: "top", lineSpacing: 14,
  });

  // Foerderhoehen
  const tiers = [
    ["bis 1.300 €", "je Stellplatz, ohne installierte Wallbox"],
    ["bis 1.500 €", "je Stellplatz mit installierter Wallbox"],
    ["bis 2.000 €", "je Stellplatz mit bidirektionaler Wallbox"],
  ];
  let tx = M + 3.85;
  const tw = (CW - 3.85 - 2 * 0.22) / 3;
  tiers.forEach(([amt, d], i) => {
    card(s, tx, 1.98, tw, 1.70, i === 2 ? GREEN_LT : PAPER, { shadow: true });
    s.addText(amt, {
      x: tx + 0.24, y: 2.20, w: tw - 0.48, h: 0.48,
      fontFace: HEAD, fontSize: 23, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: tx + 0.24, y: 2.74, w: tw - 0.46, h: 0.74,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
    });
    tx += tw + 0.22;
  });

  // Voraussetzungen / Antragsberechtigt
  card(s, M, 3.90, (CW - 0.34) / 2, 2.10, PAPER, { shadow: true });
  s.addText("Voraussetzungen", {
    x: M + 0.32, y: 4.08, w: 4.5, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Mindestens 20 % der vorhandenen Stellplätze werden vorverkabelt", options: { bullet: true, breakLine: true } },
      { text: "Mindestens 6 Stellplätze werden elektrifiziert", options: { bullet: true, breakLine: true } },
      { text: "Der laufende Betrieb erfolgt mit erneuerbarem Strom", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 4.46, w: (CW - 0.34) / 2 - 0.72, h: 1.40,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 8, margin: 0, valign: "top",
    }
  );

  const rx2 = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx2, 3.90, (CW - 0.34) / 2, 2.10, GREEN_LT);
  s.addText("Wer beantragen darf", {
    x: rx2 + 0.32, y: 4.08, w: 4.5, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Wohnungseigentümergemeinschaften, Vermieter und kleine Unternehmen", options: { bullet: true, breakLine: true } },
      { text: "Gefördert werden Wallbox, Elektroinstallation, Netzanschluss und bauliche Maßnahmen", options: { bullet: true, breakLine: true } },
      { text: "Kombinierbar mit KfW- und Landesförderung, solange die Summe die förderfähigen Gesamtkosten nicht übersteigt", options: { bullet: true } },
    ],
    {
      x: rx2 + 0.36, y: 4.46, w: (CW - 0.34) / 2 - 0.72, h: 1.40,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 8, margin: 0, valign: "top",
    }
  );

  noteBox(s, M, 6.20, CW, 0.60, "Für uns:",
    "Jede WEG und jeder Vermieter mit Stellplätzen im Bestand ist ein Kandidat. Bitte in laufenden Beratungen aktiv ansprechen - drei Monate bleiben.");

  s.addNotes(
    "Das ist der konkreteste Umsatzpunkt des ganzen Meetings.\n\n" +
    "Das Programm laeuft seit April, die Frist endet am 10. November. Wir haben also noch " +
    "gut drei Monate, um Bestandskunden darauf anzusprechen.\n\n" +
    "Zielgruppe passt perfekt: WEGs und Vermieter, die wir ohnehin zu Sanierung und Heizung beraten. " +
    "Und die GEIG-Pflicht von der Folie davor gibt uns den Aufhaenger fuers Gespraech.\n\n" +
    "Aufgabe: Bitte durchdenkt eure laufenden Projekte, wo Stellplaetze dabei sind. " +
    "Bei Fragen zur Antragstellung kommt auf mich zu.\n\n" +
    "Quelle: Bundesministerium fuer Verkehr, Programm 'Laden im Mehrparteienhaus'."
  );
  footer(s, "Bundesprogramm „Laden im Mehrparteienhaus\" (BMV) · Antragszeitraum 15.04. bis 10.11.2026");
}

/* ================================================================== *
 * 09 - FRISTENKALENDER
 * ================================================================== */
{
  const s = contentSlide("Kapitel 1 · Überblick", "Der Fristenkalender bis 2045", {
    sub: "Zum Fotografieren. Grün hinterlegt ist alles, was uns in den nächsten 18 Monaten operativ betrifft.",
  });

  const dates = [
    ["10.11.2026", "Letzter Tag für Anträge „Laden im Mehrparteienhaus\"", true],
    ["≈ 01.01.27", "Stufe 2: neue Rechenregeln, Ausweisrecht, NWG-Pflicht, Solarpflicht, GEIG", true],
    ["01.01.2027", "GEIG Bestands-NWG über 20 Stellplätze · Solarpflicht neue NWG über 250 m²", true],
    ["30.09.2027", "Heizungscheck für Anlagen von vor 10/2009 abgeschlossen", true],
    ["01.01.2028", "Nullemission neue öffentliche NWG · CO₂ und Netzentgelte hälftig", false],
    ["01.01.2029", "Bio-Anteil 10 % · Brennstoffkosten-Teilung · Solar öffentliche NWG über 750 m²", false],
    ["31.12.2029", "Gebäudeautomation und Beleuchtungssteuerung NWG über 70 kW nachgerüstet", false],
    ["01.01.2030", "Nullemission alle Neubauten · NWG höchstens 3,5 × Referenz · Solarpflicht Wohngebäude", false],
    ["01.01.2031", "Solarpflicht Bestand: öffentliche NWG über 250 m²", false],
    ["01.01.2033", "NWG-Bestand höchstens 2,95 × Referenz - mindestens Klasse E", false],
    ["31.12.2034", "Ende der Ersatzerfüllung über Solarthermie und Lüftungs-Wärmerückgewinnung", false],
    ["2035 / 2040", "Bio-Anteil 30 % · Bio-Anteil 60 %", false],
    ["2045", "Brennstoffe klimaneutral über die Quote der Lieferanten", false],
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
    "Kurz stehen lassen und fotografieren lassen. Nicht vorlesen.\n\n" +
    "Ich haenge das Deck nach dem Meeting in Teams, dann hat es jeder."
  );
  footer(s, "GModG Artikel 9 und Einzelvorschriften · Förderprogramm BMV");
}

/* ================================================================== *
 * 10 - KAPITEL 2
 * ================================================================== */
divider("02", "Kapitel 2 · Praxis, Markt und Werkzeuge", "Was wir daraus machen.", [
  "Ein Merksatz zu Förderanträgen, der uns Ärger erspart",
  "Neue Preise, neue Sichtbarkeit, neue Werkzeuge",
  "Und ein neuer Standort",
]).addNotes(
  "Uebergang: Genug Gesetz. Jetzt zu dem, was bei uns im Haus passiert ist - " +
  "und da war trotz Sommerpause einiges los."
);

/* ================================================================== *
 * 11 - PUFFER IN DER BZA
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Förderpraxis", "Der Merksatz aus dem Sanierungs-Chat", {
    sub: "Von David, diese Woche - und er hat recht. Ab sofort bitte Standard bei allen Anträgen.",
  });

  card(s, M, 2.00, CW, 1.55, INK);
  s.addText("„Plant ausreichend Puffer in den Anträgen und BzAs ein.\nWir haben ja keinen Nachteil, wenn da mehr drinsteht.\"", {
    x: M + 0.42, y: 2.00, w: CW - 0.84, h: 1.55,
    fontFace: HEAD, fontSize: 21, italic: true, color: WHITE, margin: 0, valign: "middle", lineSpacing: 32,
  });

  s.addText("Das Rechenbeispiel", {
    x: M, y: 3.86, w: 6, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0, valign: "middle",
  });

  const ex = [
    ["Angebot Heizungsbauer", "33.278 €", MUTE, PAPER],
    ["Nicht so: BzA bei 2 WE", "35.000 €", RED, PAPER],
    ["Sondern: BzA bei 2 WE", "42.000 - 45.000 €", GREEN_DARK, GREEN_LT],
  ];
  let ey = 4.32;
  ex.forEach(([t, v, col, bg]) => {
    card(s, M, ey, CW * 0.52, 0.64, bg, { radius: 0.06 });
    s.addText(t, {
      x: M + 0.26, y: ey, w: CW * 0.52 - 2.95, h: 0.64,
      fontFace: BODY, fontSize: 12, color: INK, margin: 0, valign: "middle",
    });
    s.addText(v, {
      x: M + CW * 0.52 - 2.5, y: ey, w: 2.24, h: 0.64,
      fontFace: HEAD, fontSize: 15, bold: true, color: col,
      align: "right", margin: 0, valign: "middle",
    });
    ey += 0.72;
  });

  card(s, M + CW * 0.55, 3.86, CW * 0.45, 2.60, PAPER, { shadow: true });
  s.addText("Warum das wichtig ist", {
    x: M + CW * 0.55 + 0.30, y: 4.04, w: CW * 0.45 - 0.60, h: 0.32,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Ein zu knapp bemessener Antrag wird zum Problem, sobald die Kosten steigen - und sie steigen fast immer.", options: { bullet: true, breakLine: true } },
      { text: "Ein höherer Ansatz kostet uns nichts. Abgerechnet wird ohnehin nach tatsächlichem Aufwand.", options: { bullet: true, breakLine: true } },
      { text: "Nachträgliche Korrekturen kosten Zeit, Nerven und im Zweifel das Vertrauen des Kunden.", options: { bullet: true } },
    ],
    {
      x: M + CW * 0.55 + 0.34, y: 4.44, w: CW * 0.45 - 0.68, h: 1.86,
      fontFace: BODY, fontSize: 11.5, color: INK, paraSpaceAfter: 9, margin: 0, valign: "top",
    }
  );

  s.addNotes(
    "David hat das im Sanierungs-Chat angesprochen, ich moechte es hier verstaerken, " +
    "weil es alle betrifft, die Antraege stellen.\n\n" +
    "Wenn das Angebot bei 33.278 Euro liegt, sind 35.000 in der BzA bei zwei Wohneinheiten zu knapp. " +
    "Wir haben keinen Nachteil durch einen hoeheren Ansatz - aber ein echtes Problem, " +
    "wenn die Kosten steigen und der Antrag zu klein ist.\n\n" +
    "Bitte ab sofort als Standard uebernehmen. David, magst du kurz ergaenzen?"
  );
  footer(s, "Sanierungs-Chat, 06.08.2026");
}

/* ================================================================== *
 * 12 - PREISLISTE + PREISRECHNER
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Werkzeuge", "Neue Preisliste und neuer Preisrechner", {
    sub: "Beides liegt in Teams und ist ab sofort die verbindliche Grundlage für Angebote.",
  });

  card(s, M, 2.05, (CW - 0.34) / 2, 2.85, PAPER, { shadow: true });
  s.addText("Preisliste 2026", {
    x: M + 0.34, y: 2.28, w: 4.6, h: 0.40,
    fontFace: HEAD, fontSize: 21, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Gültig ab 01.01.2026, alle Preise inklusive Mehrwertsteuer", options: { bullet: true, breakLine: true } },
      { text: "Enthält jeweils den Eigenanteil des Kunden - das erspart die Rückfrage im Gespräch", options: { bullet: true, breakLine: true } },
      { text: "Liegt als Excel und als PDF vor", options: { bullet: true } },
    ],
    {
      x: M + 0.38, y: 2.76, w: (CW - 0.34) / 2 - 0.76, h: 1.92,
      fontFace: BODY, fontSize: 12.5, color: INK, paraSpaceAfter: 10, margin: 0, valign: "top",
    }
  );

  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.05, (CW - 0.34) / 2, 2.85, GREEN_LT);
  s.addText("Preisrechner", {
    x: rx + 0.34, y: 2.28, w: 4.6, h: 0.40,
    fontFace: HEAD, fontSize: 21, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Positionen anklicken, Summe rechnet sich automatisch", options: { bullet: true, breakLine: true } },
      { text: "Positionen „nach Aufwand\" sind bewusst nicht in der Summe enthalten", options: { bullet: true, breakLine: true } },
      { text: "Gedacht für das Gespräch am Tisch und für schnelle Auskünfte am Telefon", options: { bullet: true } },
    ],
    {
      x: rx + 0.38, y: 2.76, w: (CW - 0.34) / 2 - 0.76, h: 1.92,
      fontFace: BODY, fontSize: 12.5, color: INK, paraSpaceAfter: 10, margin: 0, valign: "top",
    }
  );

  card(s, M, 5.20, CW, 1.10, INK);
  s.addText("Zwei Bitten", {
    x: M + 0.32, y: 5.32, w: CW - 0.64, h: 0.30,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Erstens: Bitte keine alten Preislisten mehr verwenden - auch nicht die ausgedruckte in der Schublade. Zweitens: Wenn euch beim Arbeiten mit dem Rechner etwas fehlt oder falsch erscheint, sagt Bescheid. Er lässt sich schnell anpassen.", {
    x: M + 0.32, y: 5.62, w: CW - 0.64, h: 0.54,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 16,
  });

  s.addNotes(
    "Kurz halten. Wichtig ist nur, dass alle wissen: es gibt beides und wo es liegt.\n\n" +
    "Den Preisrechner kurz zeigen, wenn ein Rechner am Beamer haengt - " +
    "das ueberzeugt mehr als jede Beschreibung."
  );
  footer(s, "WERKE_Preisliste_2026 · WERKE_Preisrechner · beide in Teams");
}

/* ================================================================== *
 * 13 - SICHTBARKEIT
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Außenwirkung", "Wir waren sichtbar wie selten", {
    sub: "Und das mitten in der Sommerpause.",
  });

  const items = [
    ["16.07.", "Webinar KfW und BAFA", "Neue Förderbedingungen 2026 - direkt vor der Sommerpause. Mit Steffi.", SAGE],
    ["20.07.", "Webinar GModG", "„Was sich jetzt ändert\" - erster Durchlauf mit Chiara und Steffi.", GREEN],
    ["03.08.", "Webinar GModG, zweiter Durchlauf", "Teilnehmer aus dem Handwerk: Holz-Striewe, WW Energie, Dehrendorf, CH-PB.", GREEN],
    ["06.08.", "WDR Ostwestfalen-Lippe", "Beitrag über das Kühlen mit der Wärmepumpe im Sommer, Kreis Höxter - mit Zitat von uns.", GREEN_DARK],
  ];

  const cw = (CW - 0.30) / 2;
  items.forEach(([date, t, d, col], i) => {
    const cx = M + (i % 2) * (cw + 0.30);
    const cy = 2.02 + Math.floor(i / 2) * 1.92;
    card(s, cx, cy, cw, 1.70, PAPER, { shadow: true });
    s.addShape(pres.ShapeType.roundRect, {
      x: cx + 0.28, y: cy + 0.24, w: 1.15, h: 0.34,
      fill: { color: col }, line: { type: "none" }, rectRadius: 0.17,
    });
    s.addText(date, {
      x: cx + 0.28, y: cy + 0.24, w: 1.15, h: 0.34,
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
      { text: "Wenn ihr im Kundengespräch oder im Netzwerk Fragen zum GModG bekommt: Ihr könnt antworten. Andere lesen das Gesetz noch.", options: { color: INK } },
    ],
    {
      x: M + 0.30, y: 5.92, w: CW - 0.60, h: 0.72,
      fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Kurzer Stolz-Moment fuer das Team.\n\n" +
    "Danke an Chiara und Steffi fuer die Webinare - die liefen, waehrend ich weg war.\n\n" +
    "Der WDR-Beitrag ist der Aufhaenger fuer Social Media. Marketing hat das schon auf dem Schirm."
  );
  footer(s, "Kalender und Teams-Chats, 16.07. bis 06.08.2026");
}

/* ================================================================== *
 * 14 - KI IM ARBEITSALLTAG
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Werkzeuge", "KI ist bei uns im Alltag angekommen", {
    sub: "Was in den letzten drei Wochen damit entstanden ist - alles echte Arbeitsergebnisse, keine Spielerei.",
  });

  const built = [
    ["Preisrechner", "Aus der Preisliste 2026 gebaut, sofort einsatzbereit"],
    ["Sanierungsratgeber", "Wird auf den neuen Rechtsstand gebracht"],
    ["Design System", "Grafiken im WERK.E-Look, ohne Layout-Arbeit"],
    ["Social Media", "Beiträge und Bilder, zuletzt zu Tiny Houses"],
  ];

  const cw = (CW - 3 * 0.22) / 4;
  built.forEach(([t, d], i) => {
    const cx = M + i * (cw + 0.22);
    card(s, cx, 2.02, cw, 1.60, i === 0 ? GREEN_LT : PAPER, { shadow: true });
    badge(s, cx + 0.24, 2.24, 0.40, String(i + 1), i === 0 ? GREEN_DARK : GREEN, WHITE, 13);
    s.addText(t, {
      x: cx + 0.24, y: 2.74, w: cw - 0.48, h: 0.34,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: cx + 0.24, y: 3.08, w: cw - 0.46, h: 0.48,
      fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 13,
    });
  });

  card(s, M, 3.92, CW, 1.55, PAPER, { shadow: true });
  s.addText("Wenn ihr damit arbeiten wollt", {
    x: M + 0.32, y: 4.10, w: 6, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Sprecht mich an, ich richte einen Zugang ein - das dauert fünf Minuten.", options: { bullet: true, breakLine: true } },
      { text: "Keine Kundendaten und keine personenbezogenen Daten hineingeben. Das ist nicht verhandelbar.", options: { bullet: true, breakLine: true } },
      { text: "Jedes Ergebnis wird fachlich geprüft, bevor es das Haus verlässt. Die Verantwortung bleibt bei uns.", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 4.50, w: CW - 0.72, h: 0.86,
      fontFace: BODY, fontSize: 12.5, color: INK, paraSpaceAfter: 5, margin: 0, valign: "top",
    }
  );

  card(s, M, 5.72, CW, 0.86, INK);
  s.addText(
    [
      { text: "Der Gedanke dahinter:  ", options: { bold: true, color: GREEN } },
      { text: "Die Werkzeuge nehmen uns die Fleißarbeit ab - Layout, Formulierung, Zusammenstellen. Die fachliche Einschätzung, die unsere Kunden bezahlen, kommt weiter von uns.", options: { color: WHITE } },
    ],
    {
      x: M + 0.32, y: 5.72, w: CW - 0.64, h: 0.86,
      fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle",
    }
  );

  s.addNotes(
    "Nicht als Technik-Thema verkaufen, sondern als Arbeitserleichterung.\n\n" +
    "Die zwei Grundregeln in der Mitte sind mir wichtig: keine Kundendaten rein, " +
    "und alles wird fachlich geprueft, bevor es rausgeht.\n\n" +
    "Wer skeptisch ist: voellig in Ordnung. Niemand muss. Aber wer will, bekommt Zugang."
  );
  footer(s, "Stand 06.08.2026");
}

/* ================================================================== *
 * 15 - ESW EINSPARCONTRACTING
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Projekte", "ESW Einsparcontracting Kreis Herford", {
    sub: "Ein Projekt, das viele noch nicht kennen - deshalb kurz vorgestellt.",
  });

  card(s, M, 2.02, CW * 0.60, 2.35, PAPER, { shadow: true });
  s.addText("Was Einsparcontracting bedeutet", {
    x: M + 0.32, y: 2.22, w: CW * 0.60 - 0.64, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Ein Dienstleister modernisiert die Gebäudetechnik auf eigene Rechnung und finanziert sich aus der eingesparten Energie.", options: { bullet: true, breakLine: true } },
      { text: "Der Eigentümer muss nicht investieren - er zahlt weiter wie bisher, bis sich die Maßnahme getragen hat.", options: { bullet: true, breakLine: true } },
      { text: "Voraussetzung ist eine belastbare Analyse: Wie viel lässt sich wirklich einsparen? Genau da kommen wir ins Spiel.", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 2.62, w: CW * 0.60 - 0.72, h: 1.62,
      fontFace: BODY, fontSize: 12, color: INK, paraSpaceAfter: 8, margin: 0, valign: "top",
    }
  );

  card(s, M + CW * 0.63, 2.02, CW * 0.37, 2.35, GREEN_LT);
  s.addText("Wer dran ist", {
    x: M + CW * 0.63 + 0.30, y: 2.22, w: CW * 0.37 - 0.60, h: 0.34,
    fontFace: HEAD, fontSize: 17, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Christoph Diermann\nDominik Schlüter", {
    x: M + CW * 0.63 + 0.30, y: 2.66, w: CW * 0.37 - 0.60, h: 0.66,
    fontFace: BODY, fontSize: 14, bold: true, color: INK, margin: 0, valign: "top", lineSpacing: 20,
  });
  s.addText("Auftraggeber: Kreis Herford. Bei Fragen zum Projekt sprecht die beiden direkt an.", {
    x: M + CW * 0.63 + 0.30, y: 3.42, w: CW * 0.37 - 0.60, h: 0.72,
    fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M, 4.62, CW, 1.05, INK);
  s.addText("Warum das für uns interessant ist", {
    x: M + 0.32, y: 4.74, w: CW - 0.64, h: 0.30,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Kommunale Liegenschaften bekommen mit dem GModG erstmals verbindliche Mindeststandards. Wer heute im Kreis Herford überzeugt, hat morgen die Referenz für jeden anderen Kreis in OWL.", {
    x: M + 0.32, y: 5.04, w: CW - 0.64, h: 0.50,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 16,
  });

  noteBox(s, M, 5.90, CW, 0.62, "Kurzer Aufruf:",
    "Wenn ihr bei Kommunen oder größeren Bestandshaltern im Gespräch seid - Einsparcontracting mitdenken und an Christoph oder Dominik weitergeben.");

  s.addNotes(
    "PLATZHALTER-HINWEIS: Hier bitte vor dem Meeting den aktuellen Projektstand ergaenzen - " +
    "Umfang, Anzahl der Liegenschaften, wo es gerade steht. Diese Zahlen habe ich nicht vorliegen.\n\n" +
    "Christoph oder Dominik kurz selbst berichten lassen, das ist lebendiger als meine Zusammenfassung.\n\n" +
    "Der strategische Punkt unten ist der eigentliche Grund, warum das ins Meeting gehoert: " +
    "Referenz fuer kommunale Auftraggeber in ganz OWL."
  );
  footer(s, "Projekt läuft · Stand 06.08.2026");
}

/* ================================================================== *
 * 16 - WACHSTUM: DORTMUND + KASSEL
 * ================================================================== */
{
  const s = contentSlide("Kapitel 2 · Wachstum", "Wir werden größer", {
    sub: "Ein neuer Standort und ein gemeinsamer Auftritt mit Kassel.",
  });

  // Dortmund
  card(s, M, 2.00, (CW - 0.34) / 2, 3.20, GREEN_DARK);
  s.addText("NEUER STANDORT", {
    x: M + 0.34, y: 2.22, w: 4.6, h: 0.28,
    fontFace: BODY, fontSize: 10.5, bold: true, charSpacing: 1.6, color: SAGE, margin: 0, valign: "middle",
  });
  s.addText("Dortmund", {
    x: M + 0.34, y: 2.54, w: 4.6, h: 0.70,
    fontFace: HEAD, fontSize: 40, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: M + 0.34, y: 3.36, w: 2.75, h: 0.52,
    fill: { color: WHITE }, line: { type: "none" }, rectRadius: 0.26,
  });
  s.addText("Start ab 01.10.2026", {
    x: M + 0.34, y: 3.36, w: 2.75, h: 0.52,
    fontFace: BODY, fontSize: 12.5, bold: true, color: GREEN_DARK,
    align: "center", valign: "middle", margin: 0,
  });
  s.addText("Wir gründen einen eigenen Standort in Dortmund. Ab dem 01.10. läuft dort die Terminvergabe.", {
    x: M + 0.34, y: 4.06, w: (CW - 0.34) / 2 - 0.68, h: 0.62,
    fontFace: BODY, fontSize: 13, color: "E4EDE5", margin: 0, valign: "top", lineSpacing: 18,
  });
  s.addText("Details zu Team, Räumen und Ablauf gebe ich euch, sobald sie stehen.", {
    x: M + 0.34, y: 4.72, w: (CW - 0.34) / 2 - 0.68, h: 0.42,
    fontFace: BODY, fontSize: 11.5, italic: true, color: SAGE, margin: 0, valign: "top", lineSpacing: 15,
  });

  // Kassel / ID. Polo
  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.00, (CW - 0.34) / 2, 3.20, PAPER, { shadow: true });
  s.addText("GEMEINSAMER AUFTRITT", {
    x: rx + 0.34, y: 2.22, w: 4.6, h: 0.28,
    fontFace: BODY, fontSize: 10.5, bold: true, charSpacing: 1.6, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("ID. Polo Markt-\neinführungsevent", {
    x: rx + 0.34, y: 2.54, w: 4.9, h: 0.86,
    fontFace: HEAD, fontSize: 24, bold: true, color: INK, margin: 0, valign: "top", lineSpacing: 29,
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: rx + 0.34, y: 3.50, w: 3.35, h: 0.52,
    fill: { color: GREEN_DARK }, line: { type: "none" }, rectRadius: 0.26,
  });
  s.addText("03.09.2026  ·  Kassel", {
    x: rx + 0.34, y: 3.50, w: 3.35, h: 0.52,
    fontFace: BODY, fontSize: 12.5, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0,
  });
  s.addText("Gemeinsam mit WERK.E Mitte, Glinicke, Audi Kassel, Autarkstrom und der Kasseler Sparkasse. Wir sind mit dabei.", {
    x: rx + 0.34, y: 4.20, w: (CW - 0.34) / 2 - 0.68, h: 0.66,
    fontFace: BODY, fontSize: 12.5, color: INK, margin: 0, valign: "top", lineSpacing: 17,
  });

  card(s, M, 5.50, CW, 1.05, INK);
  s.addText("Was das für uns bedeutet", {
    x: M + 0.32, y: 5.62, w: CW - 0.64, h: 0.30,
    fontFace: HEAD, fontSize: 15, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Mit Paderborn, Kassel und ab Oktober Dortmund decken wir einen deutlich größeren Raum ab. Für euch heißt das mittelfristig auch: mehr Möglichkeiten, wenn sich jemand verändern oder wachsen möchte.", {
    x: M + 0.32, y: 5.92, w: CW - 0.64, h: 0.50,
    fontFace: BODY, fontSize: 12.5, color: WHITE, margin: 0, valign: "top", lineSpacing: 16,
  });

  s.addNotes(
    "PLATZHALTER-HINWEIS: Zu Dortmund habe ich bewusst nur das auf die Folie genommen, " +
    "was feststeht - Gruendung und Start der Terminvergabe zum 01.10. " +
    "Bitte vor dem Meeting ergaenzen, was du kommunizieren moechtest: " +
    "Wer leitet, welche Raeume, welches Leistungsspektrum.\n\n" +
    "Das ist die Folie mit der besten Stimmung im ganzen Deck - Wachstum motiviert. " +
    "Ruhig kurz Raum fuer Reaktionen lassen.\n\n" +
    "Zum ID. Polo Event: Wer Lust hat mitzufahren, soll sich melden."
  );
  footer(s, "Stand 06.08.2026");
}

/* ================================================================== *
 * 17 - CODE OF CONDUCT
 * ================================================================== */
{
  const s = contentSlide("Kapitel 3 · Kultur", "Unser Code of Conduct", {
    sub: "Larissa stellt euch den ersten Entwurf vor.",
  });

  card(s, M, 2.05, CW * 0.56, 2.70, PAPER, { shadow: true });
  s.addText("Worum es geht", {
    x: M + 0.34, y: 2.26, w: 5.0, h: 0.36,
    fontFace: HEAD, fontSize: 18, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Bei WERK.E arbeiten viele Menschen mit sehr unterschiedlichen Aufgaben zusammen - von der Sanierung bis zur Verwaltung.", options: { bullet: true, breakLine: true } },
      { text: "Der Kodex hält fest, wie wir miteinander umgehen wollen. Kein Regelwerk von oben, sondern eine gemeinsame Verständigung.", options: { bullet: true, breakLine: true } },
      { text: "Der Entwurf ist ausdrücklich ein Arbeitsstand - er soll sich durch eure Rückmeldungen noch verändern.", options: { bullet: true } },
    ],
    {
      x: M + 0.38, y: 2.72, w: CW * 0.56 - 0.76, h: 1.86,
      fontFace: BODY, fontSize: 12.5, color: INK, paraSpaceAfter: 10, margin: 0, valign: "top",
    }
  );

  card(s, M + CW * 0.59, 2.05, CW * 0.41, 2.70, GREEN_LT);
  s.addText("Erarbeitet von", {
    x: M + CW * 0.59 + 0.32, y: 2.26, w: CW * 0.41 - 0.64, h: 0.36,
    fontFace: HEAD, fontSize: 18, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("der AG Demokratie und\nGleichstellung im Betrieb", {
    x: M + CW * 0.59 + 0.32, y: 2.70, w: CW * 0.41 - 0.64, h: 0.62,
    fontFace: BODY, fontSize: 13, bold: true, color: INK, margin: 0, valign: "top", lineSpacing: 18,
  });
  s.addText("Larissa · Alina · Marike · Lisa · Birgitta", {
    x: M + CW * 0.59 + 0.32, y: 3.42, w: CW * 0.41 - 0.64, h: 0.34,
    fontFace: BODY, fontSize: 12.5, color: INK, margin: 0, valign: "middle",
  });
  s.addText("Es gibt bereits eine gestaltete Fassung als PDF - die geht mit dem Protokoll an alle raus.", {
    x: M + CW * 0.59 + 0.32, y: 3.86, w: CW * 0.41 - 0.64, h: 0.66,
    fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "top", lineSpacing: 15,
  });

  card(s, M, 5.05, CW, 1.42, INK);
  s.addText("Jetzt seid ihr dran", {
    x: M + 0.32, y: 5.19, w: CW - 0.64, h: 0.32,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Passt die Richtung? Fehlt etwas Wesentliches?", options: { bullet: true, breakLine: true } },
      { text: "Rückmeldungen gerne direkt hier im Raum oder danach an Larissa - schriftlich oder im Gespräch, wie es euch lieber ist.", options: { bullet: true, breakLine: true } },
      { text: "Ziel ist eine Fassung, hinter der wir alle stehen. Kein Papier für die Schublade.", options: { bullet: true } },
    ],
    {
      x: M + 0.36, y: 5.55, w: CW - 0.72, h: 0.82,
      fontFace: BODY, fontSize: 12, color: WHITE, paraSpaceAfter: 5, margin: 0, valign: "top",
    }
  );

  s.addNotes(
    "WICHTIG: Hier uebergebe ich an Larissa. Sie stellt den Entwurf vor.\n\n" +
    "Ich moderiere nur an und halte mich danach zurueck - das ist ihr Thema " +
    "und es soll auch so wahrgenommen werden.\n\n" +
    "Genug Zeit einplanen. Das ist der Beteiligungspunkt des Meetings, " +
    "nicht ein Tagesordnungspunkt zum Abhaken."
  );
  footer(s, "AG Demokratie & Gleichstellung im Betrieb · Entwurf Stand August 2026");
}

/* ================================================================== *
 * 18 - AUS DEM TEAM
 * ================================================================== */
{
  const s = contentSlide("Kapitel 3 · Team", "Aus dem Team", {
    sub: "Drei Dinge, die alle wissen sollten.",
  });

  card(s, M, 2.05, (CW - 0.34) / 2, 1.55, GREEN_LT);
  s.addText("Katrin kommt zurück", {
    x: M + 0.34, y: 2.24, w: 4.6, h: 0.36,
    fontFace: HEAD, fontSize: 18, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("In drei Monaten geht es für Katrin wieder los. Wir setzen uns Ende August zusammen und besprechen, wie der Wiedereinstieg aussieht.", {
    x: M + 0.36, y: 2.66, w: (CW - 0.34) / 2 - 0.72, h: 0.78,
    fontFace: BODY, fontSize: 12.5, color: INK, margin: 0, valign: "top", lineSpacing: 17,
  });

  const rx = M + (CW - 0.34) / 2 + 0.34;
  card(s, rx, 2.05, (CW - 0.34) / 2, 1.55, PAPER, { shadow: true });
  s.addText("Dominik hat geheiratet", {
    x: rx + 0.34, y: 2.24, w: 4.6, h: 0.36,
    fontFace: HEAD, fontSize: 18, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Am 31.07. in Rietberg. Herzlichen Glückwunsch von uns allen - schön, dass wir dabei sein durften.", {
    x: rx + 0.36, y: 2.66, w: (CW - 0.34) / 2 - 0.72, h: 0.78,
    fontFace: BODY, fontSize: 12.5, color: INK, margin: 0, valign: "top", lineSpacing: 17,
  });

  card(s, M, 3.86, CW, 2.55, PAPER, { shadow: true });
  s.addText("Vertretung im Urlaub - so geht es richtig", {
    x: M + 0.34, y: 4.06, w: 7.5, h: 0.36,
    fontFace: HEAD, fontSize: 18, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Melissa ist bis zum 24.08. im Urlaub und hat vorher genau das gemacht, was ich mir von allen wünsche - eine kurze Nachricht in den Chat, mit klaren Zuständigkeiten:", {
    x: M + 0.36, y: 4.48, w: CW * 0.55, h: 0.72,
    fontFace: BODY, fontSize: 12.5, color: INK, margin: 0, valign: "top", lineSpacing: 17,
  });

  const vert = [["info@", "Biggi"], ["Anträge", "Lisa"], ["Rückfragen", "Alina"], ["Drucken und Versand", "Alina"]];
  let vy = 5.30;
  vert.forEach(([a, b]) => {
    s.addText(a, {
      x: M + 0.40, y: vy, w: 2.5, h: 0.26,
      fontFace: BODY, fontSize: 11.5, color: MUTE, margin: 0, valign: "middle",
    });
    s.addText(b, {
      x: M + 2.95, y: vy, w: 2.0, h: 0.26,
      fontFace: BODY, fontSize: 11.5, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
    });
    vy += 0.27;
  });

  card(s, M + CW * 0.58, 4.42, CW * 0.42 - 0.24, 1.75, GREEN_LT);
  s.addText("Warum das hilft", {
    x: M + CW * 0.58 + 0.28, y: 4.58, w: CW * 0.42 - 0.80, h: 0.30,
    fontFace: HEAD, fontSize: 14, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Niemand muss raten, an wen er sich wendet. Keine Mail bleibt liegen, kein Kunde wartet unnötig - und wer im Urlaub ist, hat wirklich Urlaub.", {
    x: M + CW * 0.58 + 0.28, y: 4.92, w: CW * 0.42 - 0.80, h: 1.10,
    fontFace: BODY, fontSize: 12, color: INK, margin: 0, valign: "top", lineSpacing: 16,
  });

  s.addNotes(
    "Warm und kurz halten.\n\n" +
    "Bei Dominik ruhig kurz applaudieren lassen.\n\n" +
    "Bei Katrin nicht zu viel vorwegnehmen - wir sprechen erst Ende August.\n\n" +
    "Melissas Nachricht als positives Beispiel nennen, nicht als Ermahnung an alle anderen. " +
    "Der Ton macht hier den Unterschied."
  );
  footer(s, "Teams-Chats, 06.08.2026");
}

/* ================================================================== *
 * 19 - RUND UMS TEAM
 * ================================================================== */
{
  const s = contentSlide("Kapitel 3 · Termine", "Und sonst so", {
    sub: "Vier Dinge zum Mitnehmen - und ein Termin, den ihr euch merken solltet.",
  });

  // After Five Grillen - Highlight
  card(s, M, 2.02, (CW - 0.34) / 2, 2.20, GREEN_DARK);
  s.addText("SAVE THE DATE", {
    x: M + 0.34, y: 2.22, w: 4.6, h: 0.28,
    fontFace: BODY, fontSize: 10.5, bold: true, charSpacing: 1.6, color: SAGE, margin: 0, valign: "middle",
  });
  s.addText("After Five Grillen", {
    x: M + 0.34, y: 2.54, w: (CW - 0.34) / 2 - 0.68, h: 0.60,
    fontFace: HEAD, fontSize: 30, bold: true, color: WHITE, margin: 0, valign: "middle",
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: M + 0.34, y: 3.24, w: 2.2, h: 0.50,
    fill: { color: WHITE }, line: { type: "none" }, rectRadius: 0.25,
  });
  s.addText("im September", {
    x: M + 0.34, y: 3.24, w: 2.2, h: 0.50,
    fontFace: BODY, fontSize: 12.5, bold: true, color: GREEN_DARK,
    align: "center", valign: "middle", margin: 0,
  });
  s.addText("Genauer Termin folgt. Haltet euch die Abende im September frei - es lohnt sich.", {
    x: M + 0.34, y: 3.80, w: (CW - 0.34) / 2 - 0.68, h: 0.40,
    fontFace: BODY, fontSize: 12, color: "E4EDE5", margin: 0, valign: "top", lineSpacing: 16,
  });

  // Drei Kacheln rechts
  const rx = M + (CW - 0.34) / 2 + 0.34;
  const rw = (CW - 0.34) / 2;
  const tiles = [
    ["JobRad-Inspektion", "Rad durchchecken lassen - ist bereits bezahlt."],
    ["Volksbank-Event", "Zusagen sind raus. Wer noch mit möchte, kurz melden."],
    ["SC Paderborn", "Auswärtsspiel Mainz, VIP-Ticket 270 €. Interesse an Annika."],
  ];
  let ty = 2.02;
  tiles.forEach(([t, d], i) => {
    card(s, rx, ty, rw, 0.68, PAPER, { radius: 0.07 });
    badge(s, rx + 0.24, ty + 0.16, 0.36, String(i + 1), GREEN, WHITE, 12);
    s.addText(t, {
      x: rx + 0.72, y: ty + 0.04, w: rw - 0.96, h: 0.30,
      fontFace: HEAD, fontSize: 13.5, bold: true, color: INK, margin: 0, valign: "middle",
    });
    s.addText(d, {
      x: rx + 0.72, y: ty + 0.31, w: rw - 0.94, h: 0.34,
      fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0, valign: "middle",
    });
    ty += 0.76;
  });

  card(s, rx, ty, rw, 0.68, GREEN_LT, { radius: 0.07 });
  badge(s, rx + 0.24, ty + 0.16, 0.36, "4", GREEN_DARK, WHITE, 12);
  s.addText("Neuer Opel Grandland", {
    x: rx + 0.72, y: ty + 0.04, w: rw - 0.96, h: 0.30,
    fontFace: HEAD, fontSize: 13.5, bold: true, color: INK, margin: 0, valign: "middle",
  });
  s.addText("Ist geliefert. Die Fahrzeugpapiere liegen bei Melissa.", {
    x: rx + 0.72, y: ty + 0.32, w: rw - 0.94, h: 0.30,
    fontFace: BODY, fontSize: 10.5, color: MUTE, margin: 0, valign: "middle",
  });

  card(s, M, 4.62, (CW - 0.34) / 2, 1.62, PAPER, { shadow: true });
  s.addText("Fragen, Anliegen, Ideen?", {
    x: M + 0.34, y: 4.82, w: (CW - 0.34) / 2 - 0.68, h: 0.34,
    fontFace: HEAD, fontSize: 16, bold: true, color: GREEN_DARK, margin: 0, valign: "middle",
  });
  s.addText("Meine Tür steht offen, und über den Buchungskalender könnt ihr euch jederzeit selbst einen Termin bei mir legen. Kein Anlass ist dafür zu klein.", {
    x: M + 0.36, y: 5.22, w: (CW - 0.34) / 2 - 0.72, h: 0.86,
    fontFace: BODY, fontSize: 12.5, color: INK, margin: 0, valign: "top", lineSpacing: 17,
  });

  s.addNotes(
    "Lockerer Teil, entsprechend im Ton.\n\n" +
    "Das After-Five-Grillen ist der Aufhaenger fuer gute Stimmung zum Schluss - " +
    "ruhig etwas Vorfreude machen. Den genauen Termin nachreichen.\n\n" +
    "JobRad, Volksbank und SCP sind reine Infos, nicht ausbreiten.\n\n" +
    "PLATZHALTER: Bei den Opel-Papieren bitte pruefen, ob Melissa im Urlaub ist - " +
    "gegebenenfalls die Vertretung nennen."
  );
  footer(s, "Stand 06.08.2026");
}

/* ================================================================== *
 * 20 - ZUM MITNEHMEN
 * ================================================================== */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addShape(pres.ShapeType.ellipse, {
    x: -1.8, y: 4.2, w: 5.2, h: 5.2, fill: { color: GREEN_MID }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.8, y: -1.4, w: 4.2, h: 4.2, fill: { color: GREEN_DARK }, line: { type: "none" },
  });

  s.addText("Zum Mitnehmen", {
    x: M, y: 0.80, w: 8, h: 0.55,
    fontFace: HEAD, fontSize: 30, bold: true, color: WHITE, margin: 0, valign: "middle",
  });

  const takeaways = [
    "Das GModG gilt. Die 65-%-Pflicht ist Geschichte - keine alten Konzepte mehr im Kundengespräch.",
    "Ab Stufe 2 rund um den 01.01.2027 rechnen wir neu. Alte und neue Kennwerte sind nicht vergleichbar.",
    "Laden im Mehrparteienhaus: bis 2.000 € je Stellplatz - aber nur noch bis zum 10.11.2026.",
    "Puffer in die BzA. Wir haben keinen Nachteil, wenn mehr drinsteht.",
    "Ab dem 01.10. sind wir auch in Dortmund.",
  ];

  let y = 1.70;
  takeaways.forEach((t, i) => {
    badge(s, M, y + 0.06, 0.40, String(i + 1), GREEN_DARK, WHITE, 13);
    s.addText(t, {
      x: M + 0.62, y, w: 9.6, h: 0.52,
      fontFace: BODY, fontSize: 14, color: WHITE, margin: 0, valign: "middle",
    });
    y += 0.66;
  });

  s.addText("Fragen und Diskussion", {
    x: M, y: 5.35, w: 8, h: 0.55,
    fontFace: HEAD, fontSize: 26, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Alle Schulungsunterlagen liegen in Teams. Fragen aus euren Projekten sammeln wir dort - die Antworten pflege ich ein.", {
    x: M, y: 5.90, w: 9.6, h: 0.50,
    fontFace: BODY, fontSize: 13, color: "C9D2CA", margin: 0, valign: "top", lineSpacing: 17,
  });

  s.addText("WERK.E Energie-Effizienz-Beratung  ·  Rolandsweg 80, 33102 Paderborn  ·  07.08.2026", {
    x: M, y: 6.75, w: CW, h: 0.28,
    fontFace: BODY, fontSize: 9.5, color: MUTE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Die fuenf Punkte laut vorlesen - das sind die Saetze, die im Kopf bleiben sollen.\n\n" +
    "Punkt 3 ist der mit dem Zeitdruck: bitte noch einmal betonen, dass das Foerderfenster " +
    "am 10. November zufaellt.\n\n" +
    "Dann Raum fuer Fragen. Was ich nicht beantworten kann, notiere ich und pflege es nach."
  );
}

/* ------------------------------------------------------------------ */
pres.writeFile({ fileName: "WERKE_Teammeeting_2026-08-07.pptx" }).then((f) => {
  console.log("Erstellt: " + f);
});
