/**
 * WERK.E - Grosses Team-Meeting 07.08.2026
 *
 * VISUELLE FASSUNG: maximal drei Woerter pro Folie, dazu genau eine Grafik.
 * Der gesamte Inhalt liegt in den Sprechernotizen.
 *
 * Die ausfuehrliche Lesefassung erzeugt build_handout_deck.js.
 *
 * Erzeugt: WERKE_Teammeeting_2026-08-07.pptx
 * Aufruf:  node build_teammeeting_deck.js
 */

const pptxgen = require("pptxgenjs");

/* ---------------- WERK.E Palette ---------------- */
const INK        = "1A1819";
const GREEN_DARK = "2E7D3A";
const GREEN_MID  = "256A30";
const GREEN      = "58B264";
const GREEN_LT   = "EDF5EE";
const SAGE       = "BFDCC4";
const PAPER      = "F5F6F3";
const LINE       = "D5DDD6";
const MUTE       = "5B685D";
const RED        = "B5544D";
const WHITE      = "FFFFFF";
const DIM        = "3A4A3C";

const HEAD = "Trebuchet MS";
const BODY = "Calibri";

const W = 13.33;
const H = 7.5;
const M = 0.85;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "WERK.E Energie-Effizienz-Beratung";
pres.company = "WERK.E Energie-Effizienz-Beratungs GmbH und Co. KG";
pres.title = "Grosses Team-Meeting - 07.08.2026";

let PAGE = 0;

/* ---------------- Bausteine ---------------- */

// Minimalfolie: Headline (max. 3 Woerter) oben links, Rest ist Grafik.
function slide(headline, dark, opts) {
  opts = opts || {};
  PAGE += 1;
  const s = pres.addSlide();
  s.background = { color: dark ? INK : WHITE };
  if (headline) {
    s.addText(headline, {
      x: M, y: opts.hy === undefined ? 0.72 : opts.hy,
      w: W - 2 * M, h: 1.0,
      fontFace: HEAD, fontSize: opts.hs || 46, bold: true,
      color: dark ? WHITE : INK,
      align: opts.halign || "left", margin: 0, valign: "middle",
    });
  }
  if (PAGE > 1) {
    s.addText(String(PAGE), {
      x: W - 0.85, y: H - 0.55, w: 0.5, h: 0.3,
      fontFace: BODY, fontSize: 10, color: dark ? DIM : LINE,
      align: "right", margin: 0, valign: "middle",
    });
  }
  return s;
}

function circle(s, cx, cy, d, fill, lineOpt) {
  s.addShape(pres.ShapeType.ellipse, {
    x: cx - d / 2, y: cy - d / 2, w: d, h: d,
    fill: fill ? { color: fill } : { type: "none" },
    line: lineOpt || { type: "none" },
  });
}

function num(s, x, y, w, h, txt, size, color, align) {
  s.addText(txt, {
    x, y, w, h,
    fontFace: HEAD, fontSize: size, bold: true, color,
    align: align || "center", valign: "middle", margin: 0,
  });
}

function rrect(s, x, y, w, h, fill, r, lineOpt) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    fill: fill ? { color: fill } : { type: "none" },
    line: lineOpt || { type: "none" },
    rectRadius: r === undefined ? 0.08 : r,
  });
}

/* ================================================================== *
 * 01 · TITEL — "Willkommen zurück"
 * ================================================================== */
{
  const s = slide(null, true);
  // Grafik: konzentrische Ringe
  circle(s, 10.6, 3.75, 6.6, null, { color: GREEN_MID, width: 1.5 });
  circle(s, 10.6, 3.75, 5.0, null, { color: GREEN_MID, width: 2.5 });
  circle(s, 10.6, 3.75, 3.4, GREEN_DARK);
  circle(s, 10.6, 3.75, 1.5, GREEN);

  s.addText("WERK.E", {
    x: M, y: 1.55, w: 6, h: 0.5,
    fontFace: HEAD, fontSize: 18, bold: true, charSpacing: 4, color: GREEN,
    margin: 0, valign: "middle",
  });
  s.addText("Willkommen\nzurück", {
    x: M, y: 2.55, w: 7.2, h: 2.1,
    fontFace: HEAD, fontSize: 62, bold: true, color: WHITE,
    margin: 0, valign: "middle", lineSpacing: 68,
  });
  s.addText("07.08.2026", {
    x: M, y: 5.05, w: 5, h: 0.4,
    fontFace: BODY, fontSize: 15, color: SAGE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "BEGRUESSUNG\n\n" +
    "Erstes vollstaendiges Zusammenkommen nach der Sommerpause. Das Fruehstueck am 24.07. " +
    "ist urlaubsbedingt ausgefallen.\n\n" +
    "Kurz abholen: Wer war weg, wer ist wieder da, wie war der Sommer.\n\n" +
    "Dann ansagen, wie das Meeting laeuft: Ich rede, die Folien zeigen nur das Wesentliche. " +
    "Alle Details liegen als Handout in Teams - niemand muss mitschreiben.\n\n" +
    "Dauer: rund 45 Minuten, danach Zeit fuer Fragen."
  );
}

/* ================================================================== *
 * 02 · AGENDA — "Gesetz · Markt · Team"
 * ================================================================== */
{
  const s = slide(null, false);
  const cx = [3.1, 6.665, 10.23];
  const labels = ["Gesetz", "Markt", "Team"];
  const cols = [GREEN_DARK, GREEN, SAGE];

  // Verbindungslinie
  s.addShape(pres.ShapeType.rect, {
    x: cx[0], y: 3.72, w: cx[2] - cx[0], h: 0.03,
    fill: { color: LINE }, line: { type: "none" },
  });

  cx.forEach((x, i) => {
    circle(s, x, 3.74, 2.5, cols[i]);
    num(s, x - 1.25, 3.02, 2.5, 1.0, "0" + (i + 1), 54, i === 2 ? INK : WHITE);
    s.addText(labels[i], {
      x: x - 1.6, y: 5.28, w: 3.2, h: 0.5,
      fontFace: HEAD, fontSize: 24, bold: true, color: INK,
      align: "center", margin: 0, valign: "middle",
    });
  });

  s.addNotes(
    "AGENDA - nur kurz benennen, nicht ausbreiten.\n\n" +
    "01 GESETZ: Das GModG gilt. Was ab sofort zaehlt, was zum 01.01.2027 kommt, " +
    "und ein Foerderfenster, das im November zufaellt.\n\n" +
    "02 MARKT: Foerderpraxis, neue Preise, unsere Sichtbarkeit, neue Werkzeuge, " +
    "ein neuer Standort.\n\n" +
    "03 TEAM: Code of Conduct, Personelles, eine offene Stelle und Termine.\n\n" +
    "Ansage: Fragen gerne sofort dazwischen, nicht bis zum Schluss sammeln."
  );
}

/* ================================================================== *
 * 03 · KAPITEL 1 — "Das GModG"
 * ================================================================== */
{
  const s = slide(null, true);
  circle(s, 11.0, 2.0, 5.2, GREEN_MID);
  circle(s, 12.4, 5.9, 2.4, GREEN_DARK);

  s.addText("01", {
    x: M, y: 1.95, w: 4, h: 2.45,
    fontFace: HEAD, fontSize: 140, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Das GModG", {
    x: M, y: 4.55, w: 8, h: 1.0,
    fontFace: HEAD, fontSize: 52, bold: true, color: WHITE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "KAPITELSTART GESETZ\n\n" +
    "Die Teamschulung habt ihr alle gehabt, die Unterlagen liegen in Teams. " +
    "Heute nur die Punkte, die im Alltag sofort wirken - kein Paragrafenritt.\n\n" +
    "Statusansage: Das Gesetz wurde am 09.07. von Bundestag und Bundesrat beschlossen " +
    "und ist inzwischen verkuendet. Es ist geltendes Recht, keine Ankuendigung mehr."
  );
}

/* ================================================================== *
 * 04 · "Zwei Geschwindigkeiten"
 * ================================================================== */
{
  const s = slide("Zwei Geschwindigkeiten", false);

  rrect(s, M, 2.35, 5.0, 3.6, GREEN_DARK, 0.14);
  s.addText("jetzt", {
    x: M, y: 3.35, w: 5.0, h: 1.4,
    fontFace: HEAD, fontSize: 62, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0,
  });

  s.addShape(pres.ShapeType.chevron, {
    x: 6.28, y: 3.68, w: 0.85, h: 0.95,
    fill: { color: LINE }, line: { type: "none" },
  });

  rrect(s, 7.48, 2.35, 5.0, 3.6, PAPER, 0.14);
  s.addText("2027", {
    x: 7.48, y: 3.35, w: 5.0, h: 1.4,
    fontFace: HEAD, fontSize: 62, bold: true, color: MUTE,
    align: "center", valign: "middle", margin: 0,
  });

  s.addNotes(
    "ZWEI GESCHWINDIGKEITEN - das ist die wichtigste Unterscheidung im ganzen Gesetz.\n\n" +
    "LINKS, GILT AB SOFORT:\n" +
    "- Die 65-Prozent-EE-Pflicht ist gestrichen, samt Betriebsverboten und 30-Jahre-Regel.\n" +
    "- Stattdessen freie Wahl aus einem Optionenkatalog. Wer fossil einbaut, bekommt ab 2029 " +
    "steigende Bio-Anteile im Brennstoff.\n" +
    "- Die Pflichtberatung vor fossilem Einbau entfaellt. Wir dokumentieren unsere Empfehlung " +
    "trotzdem schriftlich - das ist Eigenschutz.\n" +
    "- Bei irreparablem Ausfall gilt eine Karenz von 12 Monaten.\n\n" +
    "RECHTS, KOMMT ZU STUFE 2 (rund um den 01.01.2027):\n" +
    "- Neue Rechenregeln und neue Bezugsflaeche fuer jede Bilanz.\n" +
    "- Nichtwohngebaeude nur noch mit Bedarfsausweis.\n" +
    "- Erstmals Sanierungspflicht im Nichtwohn-Bestand.\n" +
    "- Bundesweite Solarpflicht und die GEIG-Pflichten fuer Stellplaetze.\n\n" +
    "KERNBOTSCHAFT: Wer noch mit 65-Prozent-Argumentation ins Kundengespraech geht, " +
    "erzaehlt Recht von gestern. Aber: In der Bilanzierung aendert sich JETZT noch nichts. " +
    "Wer gerade rechnet, rechnet weiter wie bisher.\n\n" +
    "Das exakte Stufe-2-Datum haengt am Verkuendungsmonat - erster Tag des sechsten " +
    "Folgemonats. Ich gebe es im Sanierungs-Chat durch."
  );
}

/* ================================================================== *
 * 05 · "Fünf Stufen"
 * ================================================================== */
{
  const s = slide("Fünf Stufen", false);

  const items = [
    ["jetzt", GREEN_DARK, 1.95],
    ["2027", GREEN, 1.70],
    ["2028", SAGE, 1.45],
    ["2029", SAGE, 1.45],
    ["2030", SAGE, 1.45],
  ];
  const startX = 2.05;
  const gap = 2.32;

  s.addShape(pres.ShapeType.rect, {
    x: startX, y: 3.98, w: gap * 4, h: 0.035,
    fill: { color: LINE }, line: { type: "none" },
  });

  items.forEach(([label, col, d], i) => {
    const x = startX + i * gap;
    circle(s, x, 4.0, d, col);
    s.addText(label, {
      x: x - 1.15, y: 4.0 - 0.35, w: 2.3, h: 0.7,
      fontFace: HEAD, fontSize: i === 0 ? 24 : 26, bold: true,
      color: i < 2 ? WHITE : INK,
      align: "center", valign: "middle", margin: 0,
    });
  });

  s.addNotes(
    "FUENF ZEITSTUFEN - bitte fotografieren lassen, das ist die Orientierung fuer die naechsten Jahre.\n\n" +
    "JETZT: 65 Prozent und Betriebsverbote gestrichen. Neues Heizungsrecht, Havarie-Regeln, " +
    "neues Mietrecht.\n\n" +
    "01.01.2027 (Stufe 2): Neue Rechenregeln, neues Ausweisrecht, NWG-Sanierungspflicht, " +
    "Solarpflicht und GEIG.\n\n" +
    "01.01.2028: Nullemission fuer neue oeffentliche Nichtwohngebaeude. CO2-Kosten und " +
    "Netzentgelte gehen bei Vermietung zur Haelfte auf den Vermieter ueber. " +
    "THG-Bericht ab 1.000 Quadratmeter.\n\n" +
    "01.01.2029: Bio-Anteil 10 Prozent fuer neue fossile Kessel. Brennstoffkosten haelftig. " +
    "Gebaeudeautomation bis Ende 2029 nachgeruestet.\n\n" +
    "01.01.2030: Nullemission fuer alle Neubauten. Referenz-fp sinkt auf 0,70. " +
    "Nichtwohngebaeude hoechstens 3,5-fache des Referenzwerts. Solarpflicht fuer neue Wohngebaeude.\n\n" +
    "DANACH: 2033 zweite NWG-Stufe, 2035 Bio-Anteil 30 Prozent, 2040 dann 60 Prozent, " +
    "2045 Brennstoffe klimaneutral ueber die Lieferantenquote.\n\n" +
    "Fuer den Alltag zaehlen die ersten beiden Stufen. Alles ab 2028 ist Planungshorizont - " +
    "aber relevant, wenn wir heute Anlagen auslegen, die 20 Jahre laufen."
  );
}

/* ================================================================== *
 * 06 · "Neue Rechenregeln"
 * ================================================================== */
{
  const s = slide("Neue Rechenregeln", false);

  // Grafik: Kennwert verschiebt sich
  rrect(s, 2.35, 4.35, 2.6, 1.55, LINE, 0.1);
  rrect(s, 8.38, 3.15, 2.6, 2.75, GREEN_DARK, 0.1);

  s.addShape(pres.ShapeType.rightArrow, {
    x: 5.55, y: 4.42, w: 2.25, h: 0.85,
    fill: { color: SAGE }, line: { type: "none" },
  });

  s.addText("kWh/m²", {
    x: 4.0, y: 2.30, w: 5.33, h: 0.55,
    fontFace: HEAD, fontSize: 30, bold: true, color: MUTE,
    align: "center", valign: "middle", margin: 0,
  });

  s.addShape(pres.ShapeType.rect, {
    x: 2.35, y: 5.95, w: 8.63, h: 0.03,
    fill: { color: LINE }, line: { type: "none" },
  });

  s.addNotes(
    "NEUE RECHENREGELN - gilt ab Stufe 2, rund um den 01.01.2027.\n\n" +
    "DIE NORM: DIN/TS 18599:2025-10 wird das einzige Bilanzierungsverfahren. " +
    "DIN V 4701-10 und das alte Modellgebaeudeverfahren entfallen. " +
    "Nutzungsprofile rutschen von Tabelle 5 in Tabelle 6. " +
    "U-Wert-Normen sind aktualisiert.\n\n" +
    "DIE BEZUGSFLAECHE - das ist der eigentliche Hebel:\n" +
    "- Bisher Wohngebaeude: AN gleich 0,32 mal Ve. Eine Rechengroesse, meist deutlich " +
    "groesser als die echte Wohnflaeche.\n" +
    "- Bisher Nichtwohngebaeude: Nettogrundflaeche.\n" +
    "- Neu fuer beide: 'Nutzflaeche', also die tatsaechlich beheizte oder gekuehlte " +
    "Nettoraumflaeche nach DIN 277.\n\n" +
    "DIE FOLGE UND UNSERE WICHTIGSTE KUNDENBOTSCHAFT: Alle kWh-pro-Quadratmeter-Kennwerte " +
    "verschieben sich systematisch nach oben. Alte und neue Ausweise sind nicht mehr " +
    "direkt vergleichbar.\n\n" +
    "Das muessen wir aktiv erklaeren, BEVOR der Kunde es selbst merkt und uns einen " +
    "Rechenfehler unterstellt.\n\n" +
    "WAS WIR VORBEREITEN: Software-Update Hottgenroth rechtzeitig einspielen. " +
    "Projekte mit Fertigstellung ab 2027 schon jetzt vorausschauend kalkulieren."
  );
}

/* ================================================================== *
 * 07 · "Stellplätze verkabeln"
 * ================================================================== */
{
  const s = slide("Stellplätze verkabeln", false);

  // Grafik: 10 Stellplaetze, 5 davon elektrifiziert
  const sw = 0.95, sh = 1.85, sgap = 0.24;
  const totalW = 10 * sw + 9 * sgap;
  let x = (W - totalW) / 2;
  for (let i = 0; i < 10; i++) {
    const on = i < 5;
    rrect(s, x, 2.75, sw, sh, on ? GREEN_DARK : PAPER, 0.08);
    if (on) {
      s.addShape(pres.ShapeType.lightningBolt, {
        x: x + sw / 2 - 0.21, y: 3.40, w: 0.42, h: 0.62,
        fill: { color: WHITE }, line: { type: "none" },
      });
    }
    x += sw + sgap;
  }

  s.addText("50 %", {
    x: (W - totalW) / 2, y: 5.05, w: totalW, h: 0.95,
    fontFace: HEAD, fontSize: 52, bold: true, color: GREEN_DARK,
    align: "center", valign: "middle", margin: 0,
  });

  s.addNotes(
    "GEIG - LADEINFRASTRUKTUR. Gilt ab Stufe 2.\n\n" +
    "WER MUSS WAS:\n" +
    "- Neubau Wohngebaeude ueber 3 Stellplaetze: 50 Prozent vorverkabeln, " +
    "mindestens 1 Ladepunkt.\n" +
    "- Neubau Nichtwohngebaeude ueber 5 Stellplaetze: 50 Prozent vorverkabeln, " +
    "1 Ladepunkt je fuenftem Stellplatz.\n" +
    "- Grosse Renovierung, Wohngebaeude ueber 3 oder Nichtwohngebaeude ueber 5: " +
    "wie Neubau, wenn Parkplatz oder Elektrik betroffen sind.\n" +
    "- Bestand Nichtwohngebaeude ueber 20 Stellplaetze, ab 01.01.2027: " +
    "1 Ladepunkt je 10 Stellplaetze ODER 50 Prozent Leitungsinfrastruktur.\n\n" +
    "DER HAEUFIGSTE FEHLER IN DER PRAXIS: 'Vorverkabeln' heisst anschlussfertig bis zum " +
    "Endpunkt. Reine Leerrohre oder Kabelkanaele genuegen ausdruecklich NICHT. " +
    "Das aendert die Kalkulation spuerbar - bitte bei Bauherren frueh ansprechen.\n\n" +
    "Neue Ladepunkte muessen ausserdem intelligentes Laden beherrschen.\n\n" +
    "UEBERLEITUNG zur naechsten Folie: Und genau dafuer gibt es gerade Geld - " +
    "aber nicht mehr lange."
  );
}

/* ================================================================== *
 * 08 · "Fördergeld"
 * ================================================================== */
{
  const s = slide("Fördergeld", true);

  s.addText("2.000 €", {
    x: M, y: 2.02, w: 11.6, h: 2.05,
    fontFace: HEAD, fontSize: 116, bold: true, color: GREEN,
    align: "center", valign: "middle", margin: 0,
  });

  // Zeitstrahl: Foerderfenster 15.04. bis 10.11., heute 06.08.
  const barX = 2.2, barW = 8.93, barY = 4.85;
  rrect(s, barX, barY, barW, 0.34, DIM, 0.17);
  rrect(s, barX, barY, barW * 0.555, 0.34, GREEN_DARK, 0.17);
  circle(s, barX + barW * 0.555, barY + 0.17, 0.60, WHITE);

  s.addText("15.04.", {
    x: barX - 0.9, y: barY + 0.52, w: 1.8, h: 0.36,
    fontFace: BODY, fontSize: 13, color: MUTE, align: "center", margin: 0, valign: "middle",
  });
  s.addText("10.11.2026", {
    x: barX + barW - 1.3, y: barY + 0.52, w: 2.6, h: 0.36,
    fontFace: BODY, fontSize: 15, bold: true, color: GREEN, align: "center", margin: 0, valign: "middle",
  });
  s.addText("heute", {
    x: barX + barW * 0.555 - 0.9, y: barY - 0.72, w: 1.8, h: 0.36,
    fontFace: BODY, fontSize: 13, bold: true, color: WHITE,
    align: "center", margin: 0, valign: "middle",
  });

  s.addNotes(
    "FOERDERPROGRAMM 'LADEN IM MEHRPARTEIENHAUS' - das ist der konkreteste Umsatzpunkt " +
    "des ganzen Meetings.\n\n" +
    "Bundesprogramm des Verkehrsministeriums, 500 Millionen Euro Volumen.\n\n" +
    "FOERDERHOEHE je Stellplatz:\n" +
    "- bis 1.300 Euro ohne installierte Wallbox\n" +
    "- bis 1.500 Euro mit installierter Wallbox\n" +
    "- bis 2.000 Euro mit bidirektionaler Wallbox\n\n" +
    "FRIST: Antraege laufen seit dem 15.04.2026 und nur noch bis zum 10.11.2026. " +
    "Wir haben also gut drei Monate. Danach ist das Programm zu.\n\n" +
    "VORAUSSETZUNGEN:\n" +
    "- Mindestens 20 Prozent der vorhandenen Stellplaetze werden vorverkabelt\n" +
    "- Mindestens 6 Stellplaetze werden elektrifiziert\n" +
    "- Der laufende Betrieb erfolgt mit erneuerbarem Strom\n\n" +
    "ANTRAGSBERECHTIGT: Wohnungseigentuemergemeinschaften, Vermieter und kleine Unternehmen. " +
    "Gefoerdert werden Wallbox, Elektroinstallation, Netzanschluss und bauliche Massnahmen. " +
    "Kombinierbar mit KfW- und Landesfoerderung, solange die Summe die foerderfaehigen " +
    "Gesamtkosten nicht uebersteigt.\n\n" +
    "FUER UNS: Jede WEG und jeder Vermieter mit Stellplaetzen im Bestand ist ein Kandidat. " +
    "Zielgruppe passt perfekt - das sind die Leute, die wir ohnehin zu Sanierung und Heizung beraten. " +
    "Und die GEIG-Pflicht von der Folie davor liefert den Aufhaenger fuers Gespraech.\n\n" +
    "AUFGABE: Bitte geht eure laufenden Projekte durch, wo Stellplaetze dabei sind. " +
    "Bei Fragen zur Antragstellung kommt auf mich zu."
  );
}

/* ================================================================== *
 * 09 · "Alle Fristen"
 * ================================================================== */
{
  const s = slide("Alle Fristen", false);

  const years = [
    ["2026", GREEN_DARK, 0.92],
    ["2027", GREEN_DARK, 0.92],
    ["2028", GREEN, 0.78],
    ["2029", GREEN, 0.78],
    ["2030", SAGE, 0.78],
    ["2033", SAGE, 0.66],
    ["2045", LINE, 0.66],
  ];

  const startX = 1.55;
  const gap = 1.71;

  s.addShape(pres.ShapeType.rect, {
    x: startX, y: 3.96, w: gap * 6, h: 0.035,
    fill: { color: LINE }, line: { type: "none" },
  });

  years.forEach(([y, col, d], i) => {
    const x = startX + i * gap;
    circle(s, x, 3.98, d, col);
    s.addText(y, {
      x: x - 0.95, y: i % 2 === 0 ? 2.85 : 4.62, w: 1.9, h: 0.5,
      fontFace: HEAD, fontSize: 21, bold: true, color: INK,
      align: "center", valign: "middle", margin: 0,
    });
  });

  s.addNotes(
    "FRISTENKALENDER - kurz stehen lassen und fotografieren lassen. Nicht vorlesen.\n\n" +
    "Die ausfuehrliche Tabelle mit allen Einzelfristen ist im Handout in Teams.\n\n" +
    "DIE WICHTIGSTEN PUNKTE:\n" +
    "- 10.11.2026: letzter Tag fuer Antraege 'Laden im Mehrparteienhaus'\n" +
    "- rund 01.01.2027: Stufe 2 mit neuen Rechenregeln, Ausweisrecht, NWG-Pflicht, " +
    "Solarpflicht, GEIG\n" +
    "- 01.01.2027: GEIG fuer Bestands-NWG ueber 20 Stellplaetze, Solarpflicht neue NWG ueber 250 qm\n" +
    "- 30.09.2027: Heizungscheck fuer Anlagen von vor Oktober 2009 abgeschlossen\n" +
    "- 01.01.2028: Nullemission neue oeffentliche NWG, CO2 und Netzentgelte haelftig\n" +
    "- 01.01.2029: Bio-Anteil 10 Prozent, Brennstoffkosten-Teilung\n" +
    "- 31.12.2029: Gebaeudeautomation NWG ueber 70 kW nachgeruestet\n" +
    "- 01.01.2030: Nullemission alle Neubauten, NWG hoechstens 3,5-fach, Solarpflicht Wohngebaeude\n" +
    "- 01.01.2033: NWG hoechstens 2,95-fach, also mindestens Klasse E\n" +
    "- 2045: Brennstoffe klimaneutral ueber die Lieferantenquote"
  );
}

/* ================================================================== *
 * 10 · KAPITEL 2 — "Praxis"
 * ================================================================== */
{
  const s = slide(null, true);
  circle(s, 11.0, 2.0, 5.2, GREEN_MID);
  circle(s, 12.4, 5.9, 2.4, GREEN_DARK);

  s.addText("02", {
    x: M, y: 1.95, w: 4, h: 2.45,
    fontFace: HEAD, fontSize: 140, bold: true, color: GREEN, margin: 0, valign: "middle",
  });
  s.addText("Praxis", {
    x: M, y: 4.55, w: 8, h: 1.0,
    fontFace: HEAD, fontSize: 52, bold: true, color: WHITE, margin: 0, valign: "middle",
  });

  s.addNotes(
    "KAPITELSTART PRAXIS UND MARKT\n\n" +
    "Genug Gesetz. Jetzt zu dem, was bei uns im Haus passiert ist - " +
    "und da war trotz Sommerpause einiges los.\n\n" +
    "Kommt: ein Merksatz zu Foerderantraegen, neue Preise, unsere Sichtbarkeit, " +
    "neue Werkzeuge, ein Projekt zum Kennenlernen und ein neuer Standort."
  );
}

/* ================================================================== *
 * 11 · "Mehr Puffer"
 * ================================================================== */
{
  const s = slide("Mehr Puffer", false);

  s.addChart(
    pres.ChartType.bar,
    [{ name: "Euro", labels: ["Angebot", "zu knapp", "richtig"], values: [33278, 35000, 45000] }],
    {
      x: 2.4, y: 2.15, w: 8.5, h: 4.15,
      barDir: "col",
      chartColors: [MUTE, RED, GREEN_DARK],
      varyColors: true,
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelFormatCode: '#.##0 "€"',
      dataLabelColor: INK,
      dataLabelFontSize: 17,
      dataLabelFontBold: true,
      dataLabelFontFace: BODY,
      showLegend: false,
      showTitle: false,
      valAxisMaxVal: 52000,
      valAxisHidden: true,
      valGridLine: { style: "none" },
      catGridLine: { style: "none" },
      catAxisLabelColor: MUTE,
      catAxisLabelFontSize: 15,
      catAxisLabelFontFace: BODY,
      catAxisLineShow: false,
      barGapWidthPct: 70,
      plotArea: { fill: { color: WHITE } },
    }
  );

  s.addNotes(
    "PUFFER IN DER BZA - Merksatz von David aus dem Sanierungs-Chat, diese Woche.\n\n" +
    "SEIN ZITAT: 'Plant ausreichend Puffer in den Antraegen und BzAs ein. " +
    "Wir haben ja keinen Nachteil, wenn da mehr drinsteht.'\n\n" +
    "DAS BEISPIEL: Angebot vom Heizungsbauer liegt bei 33.278 Euro. " +
    "Dann sind 35.000 Euro in der BzA bei zwei Wohneinheiten zu knapp. " +
    "Richtig waeren 42.000 bis 45.000 Euro.\n\n" +
    "WARUM DAS WICHTIG IST:\n" +
    "- Ein zu knapp bemessener Antrag wird zum Problem, sobald die Kosten steigen - " +
    "und sie steigen fast immer.\n" +
    "- Ein hoeherer Ansatz kostet uns nichts. Abgerechnet wird ohnehin nach tatsaechlichem Aufwand.\n" +
    "- Nachtraegliche Korrekturen kosten Zeit, Nerven und im Zweifel das Vertrauen des Kunden.\n\n" +
    "Bitte ab sofort als Standard uebernehmen.\n\n" +
    "David kurz das Wort geben, falls er ergaenzen moechte."
  );
}

/* ================================================================== *
 * 12 · "Neue Preise"
 * ================================================================== */
{
  const s = slide("Neue Preise", false);

  // Grafik: Dokument mit Zeilen + Rechner
  rrect(s, 3.05, 2.30, 3.35, 4.15, PAPER, 0.12);
  for (let i = 0; i < 6; i++) {
    rrect(s, 3.45, 2.85 + i * 0.56, i === 5 ? 1.45 : 2.55, 0.20, LINE, 0.1);
  }

  rrect(s, 6.95, 2.30, 3.35, 4.15, GREEN_DARK, 0.12);
  rrect(s, 7.38, 2.75, 2.5, 0.85, WHITE, 0.08);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      circle(s, 7.68 + c * 0.95, 4.20 + r * 0.72, 0.52, GREEN);
    }
  }

  s.addNotes(
    "NEUE PREISLISTE UND NEUER PREISRECHNER - beides liegt in Teams.\n\n" +
    "PREISLISTE 2026:\n" +
    "- Gueltig ab 01.01.2026, alle Preise inklusive Mehrwertsteuer\n" +
    "- Enthaelt jeweils den Eigenanteil des Kunden - das erspart die Rueckfrage im Gespraech\n" +
    "- Liegt als Excel und als PDF vor\n\n" +
    "PREISRECHNER:\n" +
    "- Positionen anklicken, die Summe rechnet sich automatisch\n" +
    "- Positionen 'nach Aufwand' sind bewusst nicht in der Summe enthalten\n" +
    "- Gedacht fuer das Gespraech am Tisch und fuer schnelle Auskuenfte am Telefon\n\n" +
    "ZWEI BITTEN:\n" +
    "Erstens: keine alten Preislisten mehr verwenden, auch nicht die ausgedruckte in der Schublade.\n" +
    "Zweitens: Wenn euch beim Arbeiten etwas fehlt oder falsch erscheint, sagt Bescheid. " +
    "Der Rechner laesst sich schnell anpassen.\n\n" +
    "Wenn ein Rechner am Beamer haengt: den Preisrechner kurz live zeigen. " +
    "Das ueberzeugt mehr als jede Beschreibung."
  );
}

/* ================================================================== *
 * 13 · "Vier Auftritte"
 * ================================================================== */
{
  const s = slide("Vier Auftritte", false);

  const dates = ["16.07.", "20.07.", "03.08.", "06.08."];
  const cols = [SAGE, GREEN, GREEN, GREEN_DARK];
  const startX = 2.55;
  const gap = 2.74;

  s.addShape(pres.ShapeType.rect, {
    x: startX, y: 4.08, w: gap * 3, h: 0.035,
    fill: { color: LINE }, line: { type: "none" },
  });

  dates.forEach((d, i) => {
    const x = startX + i * gap;
    circle(s, x, 4.1, i === 3 ? 1.85 : 1.5, cols[i]);
    s.addText(d, {
      x: x - 1.1, y: 4.1 - 0.3, w: 2.2, h: 0.6,
      fontFace: HEAD, fontSize: 20, bold: true,
      color: i === 0 ? INK : WHITE,
      align: "center", valign: "middle", margin: 0,
    });
  });

  s.addNotes(
    "SICHTBARKEIT - kurzer Stolz-Moment fuers Team. Wir waren in der Sommerpause " +
    "praesenter als manche im Vollbetrieb.\n\n" +
    "16.07. WEBINAR KFW UND BAFA: Neue Foerderbedingungen 2026, direkt vor der Sommerpause. " +
    "Mit Steffi.\n\n" +
    "20.07. WEBINAR GMODG: 'Was sich jetzt aendert', erster Durchlauf. Mit Chiara und Steffi.\n\n" +
    "03.08. WEBINAR GMODG, ZWEITER DURCHLAUF: Teilnehmer aus dem Handwerk - " +
    "Holz-Striewe, WW Energie, Dehrendorf, CH-PB.\n\n" +
    "06.08. WDR OSTWESTFALEN-LIPPE: Beitrag ueber das Kuehlen mit der Waermepumpe im Sommer, " +
    "Kreis Hoexter - mit Zitat von uns. Marketing greift das fuer Social Media auf.\n\n" +
    "DANKE an Chiara und Steffi - die Webinare liefen, waehrend ich weg war.\n\n" +
    "BOTSCHAFT: Das ist unser Vorsprung. Wenn ihr im Kundengespraech oder im Netzwerk " +
    "Fragen zum GModG bekommt, koennt ihr antworten. Andere lesen das Gesetz noch."
  );
}

/* ================================================================== *
 * 14 · "Neue Werkzeuge"
 * ================================================================== */
{
  const s = slide("Neue Werkzeuge", false);

  const tw = 2.45, th = 2.45, tg = 0.42;
  const totalW = 4 * tw + 3 * tg;
  let x = (W - totalW) / 2;

  // 1 Rechner
  rrect(s, x, 2.90, tw, th, GREEN_DARK, 0.14);
  rrect(s, x + 0.42, 3.25, tw - 0.84, 0.55, WHITE, 0.06);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      circle(s, x + 0.72 + c * 0.51, 4.30 + r * 0.62, 0.34, GREEN);
    }
  }
  x += tw + tg;

  // 2 Dokument
  rrect(s, x, 2.90, tw, th, PAPER, 0.14);
  for (let i = 0; i < 5; i++) {
    rrect(s, x + 0.42, 3.28 + i * 0.38, i === 4 ? 0.9 : tw - 0.84, 0.17, LINE, 0.08);
  }
  x += tw + tg;

  // 3 Design / Palette
  rrect(s, x, 2.90, tw, th, PAPER, 0.14);
  circle(s, x + tw / 2, 4.12, 1.35, GREEN_LT);
  circle(s, x + tw / 2 - 0.30, 3.90, 0.52, GREEN_DARK);
  circle(s, x + tw / 2 + 0.32, 3.95, 0.44, GREEN);
  circle(s, x + tw / 2, 4.55, 0.40, SAGE);
  x += tw + tg;

  // 4 Sprechblase
  rrect(s, x, 2.90, tw, th, GREEN, 0.14);
  rrect(s, x + 0.40, 3.35, tw - 0.80, 1.30, WHITE, 0.14);
  s.addShape(pres.ShapeType.triangle, {
    x: x + 0.75, y: 4.62, w: 0.55, h: 0.48,
    fill: { color: WHITE }, line: { type: "none" }, rotate: 180,
  });
  for (let i = 0; i < 3; i++) {
    rrect(s, x + 0.65, 3.62 + i * 0.32, i === 2 ? 0.72 : 1.35, 0.15, SAGE, 0.07);
  }

  s.addNotes(
    "KI IM ARBEITSALLTAG - nicht als Technik-Thema verkaufen, sondern als Arbeitserleichterung.\n\n" +
    "WAS DAMIT ENTSTANDEN IST:\n" +
    "1. Preisrechner - aus der Preisliste 2026 gebaut, sofort einsatzbereit\n" +
    "2. Sanierungsratgeber - wird gerade auf den neuen Rechtsstand gebracht\n" +
    "3. Design System - Unterlagen und Grafiken im WERK.E-Look, ohne Layout-Arbeit\n" +
    "4. Social Media - Beitraege und Bildmaterial, zuletzt zum Thema Tiny Houses\n\n" +
    "WENN IHR DAMIT ARBEITEN WOLLT:\n" +
    "- Sprecht mich an, ich richte einen Zugang ein. Das dauert fuenf Minuten.\n" +
    "- Keine Kundendaten und keine personenbezogenen Daten hineingeben. " +
    "Das ist nicht verhandelbar.\n" +
    "- Jedes Ergebnis wird fachlich geprueft, bevor es das Haus verlaesst. " +
    "Die Verantwortung bleibt bei uns.\n\n" +
    "DER GEDANKE DAHINTER: Die Werkzeuge nehmen uns die Fleissarbeit ab - Layout, " +
    "Formulierung, Zusammenstellen. Die fachliche Einschaetzung, die unsere Kunden bezahlen, " +
    "kommt weiter von uns.\n\n" +
    "Wer skeptisch ist: voellig in Ordnung. Niemand muss."
  );
}

/* ================================================================== *
 * 15 · "Einsparcontracting"
 * ================================================================== */
{
  const s = slide("Einsparcontracting", false);

  // Kreislauf aus drei Stationen
  const cx = 6.665, cy = 4.30, r = 1.62;
  const pts = [
    [cx, cy - r],
    [cx + r * 0.87, cy + r * 0.5],
    [cx - r * 0.87, cy + r * 0.5],
  ];

  s.addShape(pres.ShapeType.donut, {
    x: cx - 2.35, y: cy - 2.35, w: 4.7, h: 4.7,
    fill: { color: GREEN_LT }, line: { type: "none" },
  });

  pts.forEach((p, i) => {
    circle(s, p[0], p[1], 1.55, i === 0 ? GREEN_DARK : i === 1 ? GREEN : SAGE);
    num(s, p[0] - 0.78, p[1] - 0.4, 1.56, 0.8, String(i + 1), 34, i === 2 ? INK : WHITE);
  });

  s.addNotes(
    "ESW EINSPARCONTRACTING KREIS HERFORD - kurz vorgestellt, weil viele das Projekt " +
    "noch nicht kennen.\n\n" +
    "WAS EINSPARCONTRACTING BEDEUTET - die drei Stationen im Kreis:\n" +
    "1. Ein Dienstleister modernisiert die Gebaeudetechnik auf eigene Rechnung.\n" +
    "2. Die eingesparte Energie finanziert die Massnahme.\n" +
    "3. Der Eigentuemer zahlt weiter wie bisher, bis sich das getragen hat - " +
    "er muss selbst nicht investieren.\n\n" +
    "Voraussetzung ist eine belastbare Analyse: Wie viel laesst sich wirklich einsparen? " +
    "Genau da kommen wir ins Spiel.\n\n" +
    "WER DRAN IST: Christoph Diermann und Dominik Schlueter. Auftraggeber ist der Kreis Herford. " +
    "Bei Fragen sprecht die beiden direkt an.\n\n" +
    "PLATZHALTER-HINWEIS: Aktuellen Projektstand hier ergaenzen - Umfang, Anzahl der " +
    "Liegenschaften, wo es gerade steht. Am besten Christoph oder Dominik zwei Minuten " +
    "selbst berichten lassen.\n\n" +
    "WARUM DAS FUER UNS INTERESSANT IST: Kommunale Liegenschaften bekommen mit dem GModG " +
    "erstmals verbindliche Mindeststandards. Wer heute im Kreis Herford ueberzeugt, " +
    "hat morgen die Referenz fuer jeden anderen Kreis in OWL.\n\n" +
    "AUFRUF: Wenn ihr bei Kommunen oder groesseren Bestandshaltern im Gespraech seid - " +
    "Einsparcontracting mitdenken und an Christoph oder Dominik weitergeben."
  );
}

/* ================================================================== *
 * 16 · "Dortmund"
 * ================================================================== */
{
  const s = slide("Dortmund", true);

  // Kartennadel
  s.addShape(pres.ShapeType.teardrop, {
    x: 5.42, y: 2.30, w: 2.5, h: 2.5,
    fill: { color: GREEN }, line: { type: "none" }, rotate: 225,
  });
  circle(s, 6.665, 3.42, 1.02, INK);

  // Bodenschatten
  s.addShape(pres.ShapeType.ellipse, {
    x: 5.66, y: 4.95, w: 2.0, h: 0.34,
    fill: { color: GREEN_MID }, line: { type: "none" },
  });

  s.addText("01.10.2026", {
    x: 2.0, y: 5.55, w: 9.33, h: 0.9,
    fontFace: HEAD, fontSize: 50, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0,
  });

  s.addNotes(
    "NEUER STANDORT DORTMUND\n\n" +
    "Wir gruenden einen eigenen Standort in Dortmund. Ab dem 01.10. laeuft dort die " +
    "Terminvergabe.\n\n" +
    "PLATZHALTER-HINWEIS: Bitte ergaenzen, was du kommunizieren moechtest - " +
    "wer leitet den Standort, welche Raeume, welches Leistungsspektrum, " +
    "ob dort jemand aus dem Team hingeht.\n\n" +
    "EINORDNUNG: Mit Paderborn, Kassel und ab Oktober Dortmund decken wir einen deutlich " +
    "groesseren Raum ab. Fuer das Team heisst das mittelfristig auch mehr Moeglichkeiten - " +
    "wenn sich jemand veraendern oder wachsen moechte.\n\n" +
    "Das ist die Folie mit der besten Stimmung im ganzen Deck. " +
    "Ruhig kurz Raum fuer Reaktionen und Fragen lassen."
  );
}

/* ================================================================== *
 * 17 · "Kassel"
 * ================================================================== */
{
  const s = slide("Kassel", false);

  // Auto von vorn/seitlich, aus Formen
  rrect(s, 4.45, 3.55, 4.45, 1.25, GREEN_DARK, 0.30);
  rrect(s, 5.42, 2.72, 2.5, 1.05, GREEN, 0.28);
  circle(s, 5.55, 4.85, 1.02, INK);
  circle(s, 5.55, 4.85, 0.46, LINE);
  circle(s, 7.78, 4.85, 1.02, INK);
  circle(s, 7.78, 4.85, 0.46, LINE);

  // Ladesymbol
  s.addShape(pres.ShapeType.lightningBolt, {
    x: 9.35, y: 3.42, w: 0.68, h: 1.05,
    fill: { color: GREEN }, line: { type: "none" },
  });

  s.addText("03.09.2026", {
    x: 2.0, y: 5.75, w: 9.33, h: 0.75,
    fontFace: HEAD, fontSize: 38, bold: true, color: GREEN_DARK,
    align: "center", valign: "middle", margin: 0,
  });

  s.addNotes(
    "ID. POLO MARKTEINFUEHRUNGSEVENT IN KASSEL, 03.09.2026\n\n" +
    "Gemeinsamer Auftritt mit WERK.E Mitte, Glinicke, Audi Kassel, Autarkstrom " +
    "und der Kasseler Sparkasse. Wir sind mit dabei.\n\n" +
    "Der Updatecall dazu lief am 05.08., ich habe zugesagt.\n\n" +
    "AUFRUF: Wer Lust hat mitzufahren, soll sich bei mir melden.\n\n" +
    "Passt inhaltlich gut zum Ladeinfrastruktur-Thema von vorhin - " +
    "Elektromobilitaet und Gebaeude gehoeren zusammen, und genau da sitzen wir dazwischen."
  );
}

/* ================================================================== *
 * 18 · KAPITEL 3 / CODE OF CONDUCT
 * ================================================================== */
{
  const s = slide("Code of Conduct", false);

  // Ring aus Menschen, einer hervorgehoben
  const cx = 6.665, cy = 4.28, r = 1.85;
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    const hi = i === 0;
    circle(s, px, py, hi ? 0.92 : 0.68, hi ? GREEN_DARK : SAGE);
  }
  circle(s, cx, cy, 1.75, GREEN_LT);
  circle(s, cx, cy, 0.62, GREEN);

  s.addNotes(
    "CODE OF CONDUCT - HIER UEBERGEBE ICH AN LARISSA.\n\n" +
    "Ich moderiere nur an und halte mich danach zurueck. Das ist ihr Thema " +
    "und soll auch so wahrgenommen werden.\n\n" +
    "ANMODERATION:\n" +
    "Bei WERK.E arbeiten viele Menschen mit sehr unterschiedlichen Aufgaben zusammen - " +
    "von der Sanierung bis zur Verwaltung. Der Kodex haelt fest, wie wir miteinander " +
    "umgehen wollen. Kein Regelwerk von oben, sondern eine gemeinsame Verstaendigung.\n\n" +
    "Der Entwurf ist ausdruecklich ein Arbeitsstand - er soll sich durch die " +
    "Rueckmeldungen des Teams noch veraendern.\n\n" +
    "ERARBEITET VON der AG Demokratie und Gleichstellung im Betrieb: " +
    "Larissa, Alina, Marike, Lisa und Birgitta. Es gibt bereits eine gestaltete Fassung " +
    "als PDF, die geht mit dem Protokoll an alle raus.\n\n" +
    "FRAGEN AN DAS TEAM: Passt die Richtung? Fehlt etwas Wesentliches?\n\n" +
    "Genug Zeit einplanen. Das ist der Beteiligungspunkt des Meetings, " +
    "kein Tagesordnungspunkt zum Abhaken."
  );
}

/* ================================================================== *
 * 19 · "Drei Neuigkeiten"
 * ================================================================== */
{
  const s = slide("Drei Neuigkeiten", false);

  const cx = [3.1, 6.665, 10.23];

  // 1 Rueckkehr: Bogenpfeil
  circle(s, cx[0], 4.15, 2.55, GREEN_LT);
  s.addShape(pres.ShapeType.circularArrow, {
    x: cx[0] - 0.85, y: 3.30, w: 1.7, h: 1.7,
    fill: { color: GREEN_DARK }, line: { type: "none" },
  });

  // 2 Hochzeit: zwei Ringe
  circle(s, cx[1], 4.15, 2.55, GREEN_LT);
  circle(s, cx[1] - 0.34, 4.15, 1.15, null, { color: GREEN_DARK, width: 7 });
  circle(s, cx[1] + 0.34, 4.15, 1.15, null, { color: GREEN, width: 7 });

  // 3 Vertretung: Uebergabe
  circle(s, cx[2], 4.15, 2.55, GREEN_LT);
  circle(s, cx[2] - 0.52, 4.15, 0.78, SAGE);
  circle(s, cx[2] + 0.52, 4.15, 0.78, GREEN_DARK);
  s.addShape(pres.ShapeType.leftRightArrow, {
    x: cx[2] - 0.45, y: 3.98, w: 0.9, h: 0.36,
    fill: { color: WHITE }, line: { type: "none" },
  });

  s.addNotes(
    "AUS DEM TEAM - warm und kurz halten.\n\n" +
    "1. KATRIN KOMMT ZURUECK: In drei Monaten geht es fuer sie wieder los. " +
    "Wir setzen uns Ende August zusammen und besprechen, wie der Wiedereinstieg aussieht. " +
    "Nicht zu viel vorwegnehmen.\n\n" +
    "2. DOMINIK HAT GEHEIRATET: Am 31.07. in Rietberg. Herzlichen Glueckwunsch von uns allen. " +
    "Ruhig kurz applaudieren lassen.\n\n" +
    "3. VERTRETUNG IM URLAUB: Melissa ist bis zum 24.08. im Urlaub und hat vorher genau das " +
    "gemacht, was ich mir von allen wuensche - eine kurze Nachricht in den Chat mit " +
    "klaren Zustaendigkeiten:\n" +
    "   info@ geht an Biggi, Antraege an Lisa, Rueckfragen an Alina, " +
    "Drucken und Versand ebenfalls an Alina.\n\n" +
    "WARUM DAS HILFT: Niemand muss raten, an wen er sich wendet. Keine Mail bleibt liegen, " +
    "kein Kunde wartet unnoetig - und wer im Urlaub ist, hat wirklich Urlaub.\n\n" +
    "TON: Als positives Beispiel nennen, nicht als Ermahnung an alle anderen."
  );
}

/* ================================================================== *
 * 20 · "Handwerker gesucht"
 * ================================================================== */
{
  const s = slide("Handwerker gesucht", true);

  // Team-Raster mit einer offenen Stelle
  const cols = 6, rows = 2;
  const d = 1.05, gx = 0.52, gy = 0.62;
  const totalW = cols * d + (cols - 1) * gx;
  const startX = (W - totalW) / 2 + d / 2;
  const startY = 3.05;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = startX + c * (d + gx);
      const py = startY + r * (d + gy);
      const open = r === 1 && c === 5;
      if (open) {
        circle(s, px, py, d + 0.34, null, { color: GREEN, width: 3, dashType: "dash" });
        s.addShape(pres.ShapeType.plus, {
          x: px - 0.32, y: py - 0.32, w: 0.64, h: 0.64,
          fill: { color: GREEN }, line: { type: "none" },
        });
      } else {
        circle(s, px, py, d, DIM);
      }
    }
  }

  s.addNotes(
    "OFFENE STELLE: HANDWERKER / HAUSMEISTER\n\n" +
    "Das ist bewusst ein Empfehlungsaufruf ans Team, keine Stellenanzeige. " +
    "Bei dieser Rolle findet man ueber Kollegenempfehlungen fast immer schneller " +
    "jemanden als ueber eine Ausschreibung.\n\n" +
    "DAS PROFIL: Jemand, der anpackt, mitdenkt und zuverlaessig ist. " +
    "Handwerkliches Geschick und Fuehrerschein.\n\n" +
    "PLATZHALTER-HINWEIS: Bitte ergaenzen - Vollzeit oder Teilzeit, ab wann, Einsatzort, " +
    "und ob es eine Praemie fuer eine erfolgreiche Empfehlung gibt. " +
    "Eine Praemie waere hier der wirksamste Hebel, unbedingt nennen wenn es sie gibt.\n\n" +
    "WARUM JETZT: Wir wachsen - mit Kassel, mit Dortmund ab Oktober und mit immer mehr " +
    "Objekten, die betreut werden wollen. Vieles davon erledigen wir bisher nebenher. " +
    "Das soll jemand machen, der es richtig kann.\n\n" +
    "DER AUFRUF: Denkt an Nachbarn, ehemalige Kollegen, Handwerker von der Baustelle, " +
    "Bekannte aus dem Verein. Eine Empfehlung von euch sagt mehr ueber einen Menschen aus " +
    "als jede Bewerbungsmappe. Es reicht voellig, mir einen Namen und eine Nummer zu geben - " +
    "den Rest uebernehme ich.\n\n" +
    "WICHTIG BEIM VORTRAGEN: Nicht als Randnotiz abhandeln. Kurz Stille lassen, " +
    "damit die Leute wirklich ueberlegen. Direkt fragen, ob jemand spontan einen Namen " +
    "im Kopf hat - und den sofort notieren, nicht auf spaeter vertroesten."
  );
}

/* ================================================================== *
 * 21 · "After Five"
 * ================================================================== */
{
  const s = slide("After Five", false);

  // Grill mit Flammen
  const gx = 6.665;
  s.addShape(pres.ShapeType.triangle, {
    x: gx - 0.42, y: 2.55, w: 0.84, h: 1.35,
    fill: { color: GREEN }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.triangle, {
    x: gx - 1.18, y: 2.95, w: 0.68, h: 0.95,
    fill: { color: SAGE }, line: { type: "none" },
  });
  s.addShape(pres.ShapeType.triangle, {
    x: gx + 0.50, y: 2.95, w: 0.68, h: 0.95,
    fill: { color: SAGE }, line: { type: "none" },
  });

  s.addShape(pres.ShapeType.blockArc, {
    x: gx - 1.85, y: 3.70, w: 3.7, h: 3.7,
    fill: { color: GREEN_DARK }, line: { type: "none" },
  });
  rrect(s, gx - 1.95, 3.92, 3.9, 0.26, INK, 0.13);

  s.addText("September", {
    x: 2.0, y: 5.95, w: 9.33, h: 0.75,
    fontFace: HEAD, fontSize: 38, bold: true, color: GREEN_DARK,
    align: "center", valign: "middle", margin: 0,
  });

  s.addNotes(
    "AFTER FIVE GRILLEN IM SEPTEMBER - Save the Date.\n\n" +
    "Genauer Termin folgt. Haltet euch die Abende im September frei.\n\n" +
    "PLATZHALTER-HINWEIS: Wenn der Termin schon steht, hier nennen.\n\n" +
    "DREI KURZE INFOS ZUM SCHLUSS, nur erwaehnen:\n" +
    "- JobRad-Inspektion: Wer mag, kann sein Rad durchchecken lassen. Ist bereits bezahlt.\n" +
    "- Volksbank-Event: Die Zusagen sind raus. Wer noch mit moechte, kurz melden.\n" +
    "- SC Paderborn: Karten fuers Auswaertsspiel in Mainz, VIP-Tagesticket 270 Euro. " +
    "Interesse an Annika.\n" +
    "- Der neue Opel Grandland ist geliefert. Papiere liegen bei Melissa " +
    "(pruefen: sie ist bis 24.08. im Urlaub, ggf. Vertretung nennen).\n\n" +
    "Lockerer Teil, entsprechend im Ton. Etwas Vorfreude aufs Grillen machen."
  );
}

/* ================================================================== *
 * 22 · "Danke"
 * ================================================================== */
{
  const s = slide(null, true);

  circle(s, 6.665, 3.55, 4.6, null, { color: GREEN_MID, width: 2 });
  circle(s, 6.665, 3.55, 3.3, GREEN_DARK);

  s.addText("Danke", {
    x: 2.0, y: 2.85, w: 9.33, h: 1.4,
    fontFace: HEAD, fontSize: 72, bold: true, color: WHITE,
    align: "center", valign: "middle", margin: 0,
  });

  // Sechs Merkpunkte als Punktreihe
  const n = 6, dd = 0.52, dg = 0.34;
  const tw2 = n * dd + (n - 1) * dg;
  let dx = (W - tw2) / 2 + dd / 2;
  for (let i = 0; i < n; i++) {
    circle(s, dx, 6.05, dd, GREEN);
    num(s, dx - 0.26, 6.05 - 0.19, 0.52, 0.38, String(i + 1), 12, INK);
    dx += dd + dg;
  }

  s.addNotes(
    "ABSCHLUSS - die sechs Merksaetze laut vorlesen. Das sind die Saetze, " +
    "die im Kopf bleiben sollen.\n\n" +
    "1. Das GModG gilt. Die 65-Prozent-Pflicht ist Geschichte - " +
    "keine alten Konzepte mehr im Kundengespraech.\n\n" +
    "2. Ab Stufe 2 rund um den 01.01.2027 rechnen wir neu. " +
    "Alte und neue Kennwerte sind nicht vergleichbar.\n\n" +
    "3. Laden im Mehrparteienhaus: bis 2.000 Euro je Stellplatz - " +
    "aber nur noch bis zum 10.11.2026. Das ist der Punkt mit dem Zeitdruck, " +
    "bitte noch einmal betonen.\n\n" +
    "4. Puffer in die BzA. Wir haben keinen Nachteil, wenn mehr drinsteht.\n\n" +
    "5. Ab dem 01.10. sind wir auch in Dortmund.\n\n" +
    "6. Wir suchen einen Handwerker oder Hausmeister - denkt bitte nach, wen ihr kennt. " +
    "Diesen Punkt ernst meinen, nicht nur vorlesen.\n\n" +
    "DANN: Raum fuer Fragen. Was ich nicht beantworten kann, notiere ich und pflege es nach.\n\n" +
    "Hinweis ans Team: Das ausfuehrliche Handout mit allen Details, Paragrafen und " +
    "Fristen liegt in Teams."
  );
}

/* ------------------------------------------------------------------ */
pres.writeFile({ fileName: "WERKE_Teammeeting_2026-08-07.pptx" }).then((f) => {
  console.log("Erstellt: " + f);
});
