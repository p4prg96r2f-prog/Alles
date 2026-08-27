/* Baustellensuche am fertigen Bericht.
 *
 * Der Bericht wird hier nicht gelesen, sondern erzeugt: dieselben Module wie
 * im Browser werden in Node geladen, ein Projekt hineingegeben und
 * MODUL_BERICHT.dokument() aufgerufen. Anschliessend laeuft
 * MODUL_BERICHT.rechenhilfen.baustellenSuche() ueber das Erzeugnis.
 *
 * Zwei Faelle, weil die Loecher an verschiedenen Stellen aufgehen:
 *   voll   das Demo-Projekt aus dem Referenzfall, 18 Raeume, Zonen, Bewertung
 *   duenn  zwei Raeume, nur Annahmen, keine Plaene, keine Bewertungstexte
 *
 * Aufruf:  node validierung/bericht_reinheit.js <demo.json>
 * Ausgabe: eine Zeile JSON, wie die uebrigen Selbsttests.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const WURZEL = path.join(__dirname, "..");

/* --- Attrappe der Browserumgebung ------------------------------------- */
global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = {
  /* "loading" verhindert, dass app.js beim Laden start() aufruft: start()
     greift auf Formularfelder zu, die es hier nicht gibt. */
  readyState: "loading",
  addEventListener: () => {},
  createElement: () => ({ getContext: () => ({}), toDataURL: () => "x,y",
    style: {}, appendChild: () => {}, setAttribute: () => {} }),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  body: { appendChild: () => {} },
};
global.Image = function () {};
global.location = { search: "" };
/* navigator ist in neueren Node-Fassungen nur lesbar; wird hier nicht gebraucht. */

const R = (p) => require(path.join(WURZEL, p));
window.STANDORTE = R("src/standorte.js").STANDORTE;
R("src/kerne/kern_heizlast_norm.js");
R("src/daten/daten_raumarten.js");
R("src/daten/daten_klima.js");
R("src/daten/daten_bauteile.js");
R("src/daten/daten_typologie.js");
R("src/daten/daten_beg_anforderungen.js");
R("src/daten/daten_zonenlagen.js");
R("src/kerne/kern_pruefung.js");
R("src/kerne/kern_zuordnung.js");
R("src/modul_kontrollblatt.js");
R("src/modul_berichtsatz.js");
R("src/modul_teillast.js");
R("src/modul_bewertung.js");
R("src/modul_bericht.js");
R("src/app.js");

const MB = window.MODUL_BERICHT;
const suche = MB.rechenhilfen.baustellenSuche;

/* --- Das duenne Projekt ----------------------------------------------- *
 * Zwei Raeume, drei Bauteiltypen, alle unbelegt. Keine Zonen, keine Plaene,
 * keine Bewertungstexte, keine Wohnflaeche, kein Unterzeichner. Genau der
 * Fall, in dem eine Ueberschrift ohne Text darunter stehen bleibt. */
function duennesProjekt() {
  return {
    version: 2,
    meta: { bezeichnung: "Zwei Räume", strasse: "Musterweg 1", plz: "33098",
      ort: "Paderborn", bauherr: "", projektnr: "DUENN", baujahr: 1975,
      bearbeitet: "" },
    standort: "paderborn",
    klima: { theta_e: -9.6, theta_e_m: 10.1, quelle: "Klimatabelle des Werkzeugs, PLZ 33098" },
    luftdichtheit: { n50: 4.0, kategorie: "annahme", quelle: "" },
    norm: {},
    optionen: { f_RH: 0 },
    einheiten: [{ id: "we1", name: "WE 1", personen: 2 }],
    zonen: [],
    bauteiltypen: [
      { id: "bt1", name: "Außenwand", U: 1.4, kat_default: "huelle",
        schichten: [], belegt: false, quelle: "" },
      { id: "bt2", name: "Fenster", U: 2.7, kat_default: "huelle",
        schichten: [], belegt: false, quelle: "" },
      { id: "bt3", name: "Innenwand gegen Bad", U: 1.8, kat_default: "innen",
        schichten: [], belegt: false, quelle: "" },
    ],
    raeume: [
      { id: "r1", geschoss: "EG", name: "Wohnzimmer", art: "wohnen", theta_i: 20,
        A: 20, h: 2.5, we: "we1", n_min: 0.5, n_exponiert: 2, bauteile: [
          { typ_id: "bt1", name: "Außenwand", A: 18, kat: "huelle",
            grenzt_an: { typ: "aussen" } },
          { typ_id: "bt2", name: "Fenster", A: 3, kat: "huelle",
            grenzt_an: { typ: "aussen" } },
          { typ_id: "bt3", name: "Innenwand gegen Bad", A: 6, kat: "innen",
            grenzt_an: { typ: "raum", ref: "r2" } }] },
      { id: "r2", geschoss: "EG", name: "Bad", art: "bad", theta_i: 24,
        A: 6, h: 2.5, we: "we1", n_min: 1.5, n_exponiert: 1, bauteile: [
          { typ_id: "bt1", name: "Außenwand", A: 7, kat: "huelle",
            grenzt_an: { typ: "aussen" } },
          { typ_id: "bt3", name: "Innenwand gegen Bad", A: 6, kat: "innen",
            grenzt_an: { typ: "raum", ref: "r1" } }] },
    ],
    plan: { bilder: [] },
  };
}

/* --- Sebastians Fall --------------------------------------------------- *
 * 13 Raeume ueber drei Geschosse, keine Plaene mit Massstab, und ein
 * "OG FLUR" ohne ein einziges Huellbauteil. Genau der Fall, in dem das
 * Kontrollblatt siebzehn Zeilen aufwirft: einen Fehler, Warnungen, offene
 * Fragen und Hinweise. Er laeuft hier zweimal, einmal offen und einmal
 * vollstaendig zur Kenntnis genommen, denn die beiden Berichte sind
 * verschiedene Dokumente: im zweiten faellt die Befundtabelle weg, dafuer
 * kommen der Satz ueber die Durchsicht und Anlage 2 hinzu. */
function sebastiansFall() {
  const ROH = [
    ["KG", "KELLER", "keller", 12, 18.0, 2.30, 0, 14],
    ["KG", "FLUR", "flur", 12, 8.4, 2.30, 0, 6],
    ["KG", "HEIZUNG", "keller", 12, 12.8, 2.30, 0, 10],
    ["EG", "WOHNEN", "wohnen", 20, 26.5, 2.50, 3, 16],
    ["EG", "KUECHE", "kueche", 20, 11.2, 2.50, 1, 8],
    ["EG", "GAST", "wohnen", 20, 13.0, 2.50, 0, 9],
    ["EG", "DIELE", "flur", 20, 9.8, 2.50, 0, 4],
    ["EG", "BAD", "bad", 24, 6.2, 2.50, 1, 5],
    ["EG", "GARAGE", "wohnen", 20, 7.9, 2.50, 0, 6],
    ["OG", "SCHLAFEN", "schlafen", 20, 18.4, 2.45, 2, 13],
    ["OG", "KIND", "schlafen", 20, 14.1, 2.45, 1, 10],
    ["OG", "BAD", "bad", 24, 7.3, 2.45, 1, 6],
    ["OG", "FLUR", "flur", 20, 6.5, 2.45, 0, 0],
  ];
  const typ = function (id, name, U, kat) {
    return { id: id, name: name, U: U, kat_default: kat || "huelle",
             schichten: [], belegt: false, quelle: "" };
  };
  const raeume = ROH.map(function (r) {
    const g = r[0], name = r[1], b = [];
    if (r[7] > 0) {
      b.push({ typ_id: "bt_aw", name: "Außenwand", A: r[7], kat: "huelle",
               grenzt_an: { typ: "aussen" } });
    }
    for (let k = 0; k < r[6]; k++) {
      b.push({ typ_id: "bt_fe", name: "Fenster", A: 1.4, kat: "huelle",
               grenzt_an: { typ: "aussen" } });
    }
    /* Der OG FLUR bekommt ausdruecklich kein Dach: er ist der Raum ohne
       Huellbauteil, um den es geht. */
    if (g === "OG" && name !== "FLUR") {
      b.push({ typ_id: "bt_dach", name: "Dach", A: r[4], kat: "huelle",
               grenzt_an: { typ: "aussen" } });
    }
    if (g === "KG") {
      b.push({ typ_id: "bt_bo", name: "Bodenplatte", A: r[4], kat: "huelle",
               grenzt_an: { typ: "erdreich" } });
    }
    if (g === "OG" && name === "FLUR") {
      b.push({ typ_id: "bt_iw", name: "Innenwand", A: 12, kat: "innen",
               grenzt_an: { typ: "raum", ref: "r_OG_SCHLAFEN" } });
    }
    return { id: "r_" + g + "_" + name, geschoss: g, name: name, art: r[2],
             theta_i: r[3], A: r[4], h: r[5], we: "we1",
             n_min: r[2] === "bad" ? 1.5 : 0.5,
             n_exponiert: r[7] > 0 ? 1 : 0, bauteile: b };
  });
  return {
    version: 2,
    meta: { bezeichnung: "Einfamilienhaus, 13 Räume", strasse: "Musterweg 3",
      plz: "33098", ort: "Paderborn", bauherr: "", projektnr: "FALL",
      baujahr: 1968, bearbeitet: "", freigegeben: "ja",
      bearbeiter: "Sebastian Hund", bearbeiter_funktion: "Energieberater" },
    standort: "paderborn",
    klima: { theta_e: -9.6, theta_e_m: 10.1,
      quelle: "Klimatabelle des Werkzeugs, PLZ 33098" },
    luftdichtheit: { n50: 4.0, kategorie: "annahme", quelle: "" },
    norm: {}, optionen: { f_RH: 0 },
    einheiten: [{ id: "we1", name: "WE 1", personen: 4 }],
    zonen: [],
    bauteiltypen: [typ("bt_aw", "Außenwand", 1.40), typ("bt_fe", "Fenster", 2.70),
      typ("bt_dach", "Dach", 0.80), typ("bt_kd", "Kellerdecke", 1.00),
      typ("bt_bo", "Bodenplatte", 1.20), typ("bt_iw", "Innenwand", 1.80, "innen")],
    raeume: raeume,
    plan: { bilder: [] },
  };
}

/* --- Einen Bericht bauen und durchsuchen ------------------------------- */
function pruefeFall(name, p, fehler, opt) {
  const o = opt || {};
  const A = window.App;
  A.p = p;
  try {
    A.ergebnis = window.KERN_HEIZLAST_NORM.rechne(A.projektFuerKern(p));
  } catch (e) {
    fehler.push(name + ": der Rechenkern bricht ab: " + (e && e.message));
    return 0;
  }
  if (A.ergebnis.fehlerhaft) {
    fehler.push(name + ": der Rechenkern meldet " + A.ergebnis.meldung);
    return 0;
  }
  A.pruefung = window.KERN_PRUEFUNG.pruefeAlles(A.p, A.ergebnis,
    { typologie: window.DATEN_TYPOLOGIE,
      /* Ohne das Kontrollblatt entstehen gar keine Befunde der Stufen
         "offen" und "bestaetigt". Genau die beiden druckte der Bericht als
         das Wort "undefined", und genau die beiden sah diese Suche deshalb
         nie. */
      kontrollblatt: o.kontrollblatt ? window.MODUL_KONTROLLBLATT : null });
  if (o.allesBestaetigen) {
    const KB = window.MODUL_KONTROLLBLATT, KP = window.KERN_PRUEFUNG;
    KB.offeneBefunde(KB.zaehler(A.p, {}), A.pruefung).forEach(function (b, i) {
      KP.bestaetigungEintragen(A.p, b.id, {
        wer: "Sebastian Hund", grund_pflicht: !b.aufhebbar,
        /* Der erste Punkt bekommt einen Vermerk, damit die Suche einmal
           ueber eine gefuellte Anlage 2 laeuft, und die uebrigen bleiben
           bare Haken — mit einer Ausnahme: eine Zeile, die sich selbst
           widerspricht, ist nicht aufhebbar und verlangt eine Begruendung
           von mindestens zehn Zeichen (KERN_PRUEFUNG.bestaetigungEintragen).
           Ohne sie bleibt der Punkt offen, und die Probe „nach dem Abhaken
           ist nichts mehr offen" faellt — nicht, weil der Bericht schmutzig
           waere, sondern weil die Attrappe die eigene Regel nicht einhaelt. */
        grund: (i === 0 || !b.aufhebbar)
          ? "Am Grundriss geprüft und für diesen Bericht so übernommen." : "" });
    });
    A.pruefung = KP.pruefeAlles(A.p, A.ergebnis,
      { typologie: window.DATEN_TYPOLOGIE, kontrollblatt: KB });
    if (!A.pruefung.bestaetigung.alles) {
      fehler.push(name + ": nach dem Abhaken ist immer noch etwas offen ("
        + A.pruefung.bestaetigung.offen + " von "
        + A.pruefung.bestaetigung.gesamt + ")");
    }
  }
  /* Seit dem 24.08.2026 hat der Bericht zwei Fassungen. Beide werden
     gebaut und beide durchsucht: die Baustellensuche läuft über die interne
     Fassung UND die Druckfassung, und die Druckfassung zusätzlich durch
     druckSuche() — sie darf dauerhaft kein Güte- und Herkunftsvokabular
     tragen (Spanne, Konfidenz, Klasse A/B/C, BEG, belegt, Annahme, Prüfung,
     Quelle, Sicherheit; begründete Ausnahmen stehen in modul_bericht.js). */
  let dIntern, dDruck;
  try {
    dIntern = MB.dokument({ fassung: "intern" });
    dDruck = MB.dokument({ fassung: "druck" });
  } catch (e) {
    fehler.push(name + ": der Bericht bricht ab: " + (e && e.message));
    return 0;
  }
  if (!dIntern || !dIntern.html || dIntern.html.length < 5000) {
    fehler.push(name + ": die interne Fassung ist leer oder zu kurz");
    return 0;
  }
  if (!dDruck || !dDruck.html || dDruck.html.length < 5000) {
    fehler.push(name + ": die Druckfassung ist leer oder zu kurz");
    return 0;
  }
  suche(dIntern.html).forEach(function (x) {
    fehler.push(name + " (intern): " + x.regel + " bei „" + x.stelle + "“");
  });
  suche(dDruck.html).forEach(function (x) {
    fehler.push(name + " (Druck): " + x.regel + " bei „" + x.stelle + "“");
  });
  MB.rechenhilfen.druckSuche(dDruck.html).forEach(function (x) {
    fehler.push(name + " (Druck): " + x.regel + " bei „" + x.stelle + "“");
  });
  return dIntern.html.length + dDruck.html.length;
}

const fehler = [];
const demoPfad = process.argv[2];
let laengen = [];

if (demoPfad && fs.existsSync(demoPfad)) {
  laengen.push(pruefeFall("Demo-Bericht",
    JSON.parse(fs.readFileSync(demoPfad, "utf8")), fehler));
} else {
  fehler.push("Das Demo-Projekt wurde nicht übergeben: " + demoPfad);
}

/* Der duenne Fall zweimal: als Entwurf und freigegeben. Die Freigabe schaltet
   Texte um; ein Loch faellt sonst nur in einer der beiden Fassungen auf. */
laengen.push(pruefeFall("dünner Bericht", duennesProjekt(), fehler));
const frei = duennesProjekt();
frei.meta.freigegeben = "ja";
frei.meta.bearbeiter = "Sebastian Hund";
frei.meta.bearbeiter_funktion = "Energieberater";
laengen.push(pruefeFall("dünner Bericht, freigegeben", frei, fehler));

/* Und einmal mit rotem Ergebnis der Selbstpruefung: dann steht auf dem
   Deckblatt ein Kasten mehr. Er hat dort einmal eine zweite, fast leere Seite
   erzeugt, weil das Deckblatt einen festen Seitenumbruch hat. */
const rot = duennesProjekt();
delete rot.klima.quelle;
laengen.push(pruefeFall("dünner Bericht mit rotem Befund", rot, fehler));

/* Und Sebastians Fall zweimal. Ohne diese beiden Laeufe sah die Suche die
   Befunde des Kontrollblatts nie und bescheinigte einem Bericht Sauberkeit,
   in dem an sieben Stellen das Wort "undefined" stand. */
laengen.push(pruefeFall("Sebastians Fall, offen", sebastiansFall(), fehler,
  { kontrollblatt: true }));
laengen.push(pruefeFall("Sebastians Fall, zur Kenntnis genommen", sebastiansFall(),
  fehler, { kontrollblatt: true, allesBestaetigen: true }));

console.log(JSON.stringify({
  ok: fehler.length === 0,
  fehler: fehler,
  anzahl: laengen.length,
  zeichen: laengen,
}));
