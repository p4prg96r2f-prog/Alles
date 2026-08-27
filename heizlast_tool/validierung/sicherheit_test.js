/* ===========================================================================
 * sicherheit_test.js — bösartige Zeichenketten auf allen Wegen nach draußen
 * ===========================================================================
 * WORUM ES GEHT
 *
 * Die ganze Oberfläche und beide Berichtsfassungen entstehen als HTML-Text
 * und werden per innerHTML in die Seite gesetzt. Jede Zeichenkette, die aus
 * einer Datei, einem Plan oder einer Modellantwort kommt, landet damit im
 * HTML. Die Module haben je einen Maskierhelfer (esc), und app.js benutzt ihn
 * an 227 Stellen — aber es gab bis zum 27.08.2026 KEINE einzige Prüfung, die
 * belegt, dass er auch an jeder Stelle benutzt wird, an der es darauf ankommt.
 * Ein vergessenes esc() fällt sonst niemandem auf: die Seite sieht richtig
 * aus, bis jemand einen Plan mit einem Raumnamen wie
 *   <img src=x onerror=...>
 * ablegt. Der Raumname kommt aus einer Modellantwort, also aus einer Quelle,
 * die niemand im Büro kontrolliert.
 *
 * WAS GEPRÜFT WIRD
 *
 * Für jede Stelle, an die fremder Text gelangt (Raumname, Bauteilname,
 * Geschossname, Name des unbeheizten Bereichs, Projektbezeichnung, Adresse,
 * Bauherr, Bearbeiter, Dateiname der Unterlage, Begründungstext einer
 * Bestätigung), wird eine Nutzlast mit einer eindeutigen Marke eingesetzt.
 * Danach gilt für jedes erzeugte HTML:
 *   1. Die Nutzlast darf NICHT wörtlich auftauchen. Steht sie wörtlich drin,
 *      führt der Browser sie aus.
 *   2. Die Marke MUSS auftauchen. Sonst hat der Test nichts geprüft, weil der
 *      Text gar nicht bis ins HTML gekommen ist (stiller Blindgänger).
 * Geprüft werden beide Berichtsfassungen (intern und Druck) und das
 * Kontrollblatt.
 *
 * Aufruf:  node validierung/sicherheit_test.js
 * =========================================================================== */
"use strict";

const path = require("path");
const WURZEL = path.join(__dirname, "..");

/* --- Attrappe der Browserumgebung, wie in bericht_reinheit.js ---------- */
global.window = {};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = {
  readyState: "loading",
  addEventListener: () => {},
  createElement: () => ({ getContext: () => ({}), toDataURL: () => "x,y",
    style: {}, appendChild: () => {}, setAttribute: () => {} }),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  body: { appendChild: () => {} },
};
global.Image = function () {};
global.location = { search: "" };
/* Das Kontrollblatt zeichnet Sinnbilder ueber window.ikon; ohne den Helfer
   bricht es beim Zeichnen ab. Gleiche Attrappe wie in oberflaeche_test.js. */
global.ikon = function (name) {
  return '<svg class="ikon"><use href="#i-' + String(name) + '"></use></svg>';
};

const R = (p) => require(path.join(WURZEL, p));
window.ikon = global.ikon;
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
const KB = window.MODUL_KONTROLLBLATT;
const App = window.App;

/** Dieselbe Maskierung, die die Module benutzen (app.js: esc). Bewusst hier
 *  nachgebaut und nicht aus src/ geholt: sonst pruefte der Test die
 *  Maskierung gegen sich selbst. */
function maskiert(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
      "'": "&#39;" }[c];
  });
}

const fehler = [];
let anzahl = 0;
function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
  return !!bedingung;
}

/* --- Die Nutzlasten ---------------------------------------------------- *
 * Jede deckt einen anderen Einbauort ab. Die Marke ist der Teil, der im HTML
 * wiederzufinden sein MUSS; die Nutzlast ist der Teil, der dort NICHT
 * wörtlich stehen darf. */
const NUTZLASTEN = [
  { marke: "XSSMARKEA", roh: "<script>XSSMARKEA</script>",
    was: "Element: ein eingeschobenes Skript" },
  { marke: "XSSMARKEB", roh: '<img src=x onerror="XSSMARKEB">',
    was: "Element mit Ereignis: das haeufigste Muster" },
  { marke: "XSSMARKEC", roh: '" onmouseover="XSSMARKEC',
    was: "Attributausbruch: schliesst ein title=\"...\" vorzeitig" },
  { marke: "XSSMARKED", roh: "<svg onload=XSSMARKED>",
    was: "SVG-Ereignis, kommt an manchen Filtern vorbei" },
  { marke: "XSSMARKEE", roh: "</td></tr></table><b>XSSMARKEE</b>",
    was: "Tabellenausbruch: zerlegt das Berichtsgerippe" },
];

function typ(id, name, u, kat) {
  return { id: id, name: name, u: u, kat: kat || "huelle",
    quelle: "Annahme", kategorie: "annahme" };
}

/** Ein vollständiges kleines Projekt, in dem an JEDER Textstelle eine
 *  Nutzlast steckt. Alle Nutzlasten gleichzeitig: so braucht es nur zwei
 *  Berichtsläufe statt zehn, und ein vergessenes esc() an irgendeiner Stelle
 *  fällt trotzdem auf, weil jede Nutzlast ihre eigene Marke trägt. */
function boesesProjekt() {
  const n = NUTZLASTEN;
  return {
    version: 2,
    meta: {
      bezeichnung: n[0].roh,
      strasse: n[1].roh,
      plz: "33098", ort: n[2].roh,
      bauherr: n[3].roh,
      projektnr: n[4].roh,
      baujahr: 1968, bearbeitet: "", freigegeben: "ja",
      bearbeiter: n[0].roh, bearbeiter_funktion: n[1].roh,
      gebaeudetyp: n[2].roh,
    },
    standort: "paderborn",
    klima: { theta_e: -9.6, theta_e_m: 10.1, quelle: n[3].roh },
    luftdichtheit: { n50: 4.0, kategorie: "annahme", quelle: n[4].roh },
    norm: {}, optionen: { f_RH: 0 },
    einheiten: [{ id: "we1", name: n[0].roh, personen: 4 }],
    zonen: [{ id: "z1", name: n[1].roh, modus: "bilanz",
      huelle: [{ name: n[2].roh, A: 30, U: 1.0, grenzt_an: { typ: "aussen" } }] }],
    bauteiltypen: [
      typ("bt_aw", n[3].roh, 1.40), typ("bt_fe", n[4].roh, 2.70),
      typ("bt_kd", "Kellerdecke", 1.00), typ("bt_bo", "Bodenplatte", 1.20),
    ],
    raeume: [
      { id: "r1", name: n[0].roh, geschoss: n[1].roh, art: "wohnen",
        we: "we1", A: 24, h: 2.5, theta_i: 20, n_min: 0.5, n_exponiert: 2,
        bauteile: [
          { typ: "bt_aw", name: n[2].roh, A: 18, lage: n[3].roh,
            grenzt_an: { typ: "aussen" } },
          { typ: "bt_fe", name: n[4].roh, A: 4, grenzt_an: { typ: "aussen" } },
          { typ: "bt_kd", name: "Kellerdecke", A: 24,
            grenzt_an: { typ: "zone", ref: "z1" } },
        ] },
      { id: "r2", name: n[2].roh, geschoss: n[1].roh, art: "bad",
        we: "we1", A: 8, h: 2.5, theta_i: 24, n_min: 0.5, n_exponiert: 1,
        bauteile: [
          { typ: "bt_aw", name: n[0].roh, A: 6, grenzt_an: { typ: "aussen" } },
          { typ: "bt_bo", name: "Bodenplatte", A: 8,
            grenzt_an: { typ: "erdreich" } },
        ] },
    ],
    /* Der Dateiname einer abgelegten Unterlage. Er kommt vom Dateisystem des
       Kollegen und ist damit fremder Text wie jeder andere. */
    plan: { bilder: [{ id: "b1", bezeichnung: n[4].roh, name: n[4].roh,
      seite: 1, breite: 1600, hoehe: 1200, datenurl: "", gesichert: false }] },
  };
}

/* --- Bericht und Kontrollblatt mit dem boesen Projekt bauen ------------ */
const p = boesesProjekt();
App.p = p;
let ergebnis = null;
try {
  ergebnis = window.KERN_HEIZLAST_NORM.rechne(App.projektFuerKern(p));
  App.ergebnis = ergebnis;
} catch (e) {
  fehler.push("Der Rechenkern bricht mit boesen Namen ab: " + (e && e.message));
}
pruefe(!!ergebnis && !ergebnis.fehlerhaft,
  "Boese Zeichenketten in Namen duerfen die Rechnung nicht anhalten");

const erzeugnisse = [];
if (ergebnis) {
  App.pruefung = window.KERN_PRUEFUNG.pruefeAlles(p, ergebnis,
    { typologie: window.DATEN_TYPOLOGIE, kontrollblatt: KB });
  try {
    erzeugnisse.push({ name: "Bericht intern", html: MB.dokument({ fassung: "intern" }).html });
    erzeugnisse.push({ name: "Bericht Druck", html: MB.dokument({ fassung: "druck" }).html });
  } catch (e) {
    fehler.push("Der Bericht bricht mit boesen Namen ab: " + (e && e.message));
  }
  try {
    const z = KB.zaehler(p, {});
    const kb = KB.html();   /* zieht Projekt und Ergebnis aus window.App */
    if (typeof kb === "string") erzeugnisse.push({ name: "Kontrollblatt", html: kb });
    else fehler.push("KB.html() liefert kein HTML, sondern " + typeof kb);
    /* Die Befundtexte sind der Weg, auf dem ein Raumname in die Ampel und von
       dort in den Bericht wandert. Sie sind DATEN, nicht HTML: dass die
       Nutzlast dort unmaskiert steht, ist richtig — maskiert wird erst beim
       Zeichnen. Geprueft wird deshalb nur, dass der Weg ueberhaupt existiert.
       Ohne diese Probe koennte das Kontrollblatt-HTML oben sauber sein, weil
       der fremde Name es nie erreicht — und der Test waere ein Blindgaenger. */
    const befunde = KB.offeneBefunde(z, App.pruefung) || [];
    const roh = JSON.stringify(befunde);
    pruefe(NUTZLASTEN.some(function (nl) { return roh.indexOf(nl.marke) >= 0; }),
      "Kein einziger Befund des Kontrollblatts traegt einen der fremden Namen. "
        + "Dann belegt die Probe am Kontrollblatt-HTML nichts.");
  } catch (e) {
    fehler.push("Das Kontrollblatt bricht mit boesen Namen ab: " + (e && e.message));
  }
}

pruefe(erzeugnisse.length >= 3,
  "Es muessen mindestens die beiden Berichtsfassungen und das Kontrollblatt "
    + "entstehen, sonst prueft der Test nichts. Entstanden: "
    + erzeugnisse.map(function (x) { return x.name; }).join(", "));

/* --- Die eigentliche Probe -------------------------------------------- */
erzeugnisse.forEach(function (e) {
  NUTZLASTEN.forEach(function (nl) {
    /* 1  Die Nutzlast darf nicht woertlich im HTML stehen. */
    const woertlich = e.html.indexOf(nl.roh) >= 0;
    pruefe(!woertlich, e.name + ": die Nutzlast steht WOERTLICH im Erzeugnis ("
      + nl.was + "). Damit fuehrt der Browser sie aus. Nutzlast: " + nl.roh);

    /* 2  Und die Marke muss ueberhaupt angekommen sein, sonst hat die Probe
       oben nichts bewiesen. Bei den Roh-Befundtexten (JSON) ist das nicht
       verlangt: dort haengt es davon ab, welche Befunde anschlagen. */
    if (!e.nurRoh) {
      const angekommen = e.html.indexOf(nl.marke) >= 0;
      pruefe(angekommen, e.name + ": die Marke " + nl.marke + " kommt im "
        + "Erzeugnis nicht vor. Dann belegt die Probe nichts — entweder wird "
        + "der Text nirgends ausgegeben, oder er wird stillschweigend "
        + "verworfen. Beides muss geklaert werden, bevor dieser Test gilt.");
    }

    /* 3  Die Nutzlast muss in GENAU der maskierten Form dastehen. Das ist die
       scharfe Fassung von Punkt 1: sie faengt auch den Fall, dass jemand nur
       die spitzen Klammern maskiert und die Anfuehrungszeichen vergisst — dann
       stimmt weder die Rohform (Punkt 1 haelt) noch die maskierte Form.
       Ein Umfeld-Muster zu suchen taugt hier NICHT: im maskierten Text steht
       "onerror=&quot;" woertlich drin, ohne gefaehrlich zu sein. */
    if (!e.nurRoh) {
      pruefe(e.html.indexOf(maskiert(nl.roh)) >= 0,
        e.name + ": die Nutzlast " + nl.marke + " steht nicht in der korrekt "
          + "maskierten Form im Erzeugnis. Erwartet: " + maskiert(nl.roh));
    }
  });
});

/* --- Zugangscode darf nie im Erzeugnis landen ------------------------- *
 * Der Code der Planauslese liegt im localStorage. Er darf in keinem Bericht,
 * keinem Kontrollblatt und keiner Fehlermeldung auftauchen — ein Bericht geht
 * an den Kunden. */
erzeugnisse.forEach(function (e) {
  pruefe(!/x-werke-code|werke_hl_endpunkt/i.test(e.html),
    e.name + ": Name des Zugangsspeichers steht im Erzeugnis");
});

console.log(JSON.stringify({
  ok: fehler.length === 0, anzahl: anzahl, fehler: fehler,
  erzeugnisse: erzeugnisse.map(function (x) {
    return { name: x.name, zeichen: x.html.length };
  }),
}));
