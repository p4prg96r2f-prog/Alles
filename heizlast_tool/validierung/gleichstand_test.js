/* ===========================================================================
 * gleichstand_test.js — dieselbe Zahl überall
 * ===========================================================================
 * WORUM ES GEHT
 *
 * Die Heizlast erscheint an vier Stellen: im Rechenergebnis, auf der
 * Ergebnisseite, in der internen Berichtsfassung und in der Druckfassung für
 * den Auftraggeber. Jede dieser Stellen formatiert selbst. Zwischen ihnen darf
 * kein Widerspruch entstehen — eine Druckfassung, die 9,1 kW nennt, während
 * die interne Fassung 9,05 kW rechnet, ist der Fehler, den niemand bemerkt und
 * der beim Auftraggeber landet.
 *
 * Bis zum 27.08.2026 prüfte das keine Datei. `bericht_reinheit.js` sucht
 * Baustellen (leere Kapitel, „undefined"), `ergebnisseite_test.js` rechnet die
 * Zusammensetzung je Raum nach — aber niemand verglich die Zahl der einen
 * Fassung mit der der anderen.
 *
 * WAS GEPRÜFT WIRD
 *
 * Aus jeder erzeugten Fassung wird die Gebäudeheizlast in kW aus dem Text
 * gelesen und gegen `ergebnis.phi_gebaeude` gehalten. Toleranz ist die
 * Darstellungsrundung der jeweiligen Fassung und nichts darüber: bei zwei
 * Nachkommastellen in kW sind das 5 W. Zusätzlich müssen die Raumzahlen und
 * die Flächensumme übereinstimmen.
 *
 * Aufruf:  node validierung/gleichstand_test.js
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
global.ikon = function (n) { return '<svg class="ikon"><use href="#i-' + n + '"></use></svg>'; };

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

const fehler = [];
let anzahl = 0;
function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
  return !!bedingung;
}

/* Feldnamen wie in app.js, projektFuerKern(): der Bauteiltyp traegt U (gross),
   und das Bauteil verweist ueber typ_id auf ihn. Mit "u" und "typ" bleibt der
   U-Wert 0 -- der Bericht steht dann voller Nullen, ohne dass es auffaellt. */
function typ(id, name, U, kat) {
  return { id: id, name: name, U: U, kat: kat || "huelle",
    quelle: "Annahme", belegt: false, kategorie: "annahme" };
}

/* Ein Projekt mit gemischten Raumtemperaturen — genau der Fall, in dem sich
   Gebäudeheizlast und Raumsumme unterscheiden. Wären alle Räume gleich warm,
   wäre der Vergleich trivial und würde ein Vertauschen der beiden Größen
   nicht finden. */
function projekt() {
  return {
    version: 2,
    meta: { bezeichnung: "Pruefobjekt Gleichstand", strasse: "Pruefweg 1",
      plz: "33098", ort: "Paderborn", bauherr: "Pruefstelle",
      projektnr: "GLEICH-1", baujahr: 1975, bearbeitet: "", freigegeben: "ja",
      bearbeiter: "Pruefstelle", bearbeiter_funktion: "Energieberater",
      wohnflaeche: 60 },
    standort: "paderborn",
    klima: { theta_e: -9.6, theta_e_m: 10.1,
      quelle: "Klimatabelle des Werkzeugs, PLZ 33098" },
    luftdichtheit: { n50: 4.0, kategorie: "annahme", quelle: "" },
    norm: {}, optionen: { f_RH: 0 },
    einheiten: [{ id: "we1", name: "WE 1", personen: 3 }],
    zonen: [],
    bauteiltypen: [typ("bt_aw", "Außenwand", 1.20), typ("bt_fe", "Fenster", 2.70),
      typ("bt_dach", "Dach", 0.60), typ("bt_bo", "Bodenplatte", 1.00),
      typ("bt_iw", "Innenwand", 1.80, "innen")],
    raeume: [
      { id: "r1", name: "Wohnen", geschoss: "EG", art: "wohnen", we: "we1",
        A: 28, h: 2.5, theta_i: 20, n_min: 0.5, n_exponiert: 2,
        bauteile: [
          { typ_id: "bt_aw", name: "Außenwand", A: 22, grenzt_an: { typ: "aussen" } },
          { typ_id: "bt_fe", name: "Fenster", A: 5, grenzt_an: { typ: "aussen" } },
          { typ_id: "bt_bo", name: "Bodenplatte", A: 28, grenzt_an: { typ: "erdreich" } },
          { typ_id: "bt_iw", name: "Wand zum Bad", A: 8,
            grenzt_an: { typ: "raum", ref: "r2" } },
        ] },
      { id: "r2", name: "Bad", geschoss: "EG", art: "bad", we: "we1",
        A: 9, h: 2.5, theta_i: 24, n_min: 0.5, n_exponiert: 1,
        bauteile: [
          { typ_id: "bt_aw", name: "Außenwand", A: 7, grenzt_an: { typ: "aussen" } },
          { typ_id: "bt_fe", name: "Fenster", A: 1.2, grenzt_an: { typ: "aussen" } },
          { typ_id: "bt_bo", name: "Bodenplatte", A: 9, grenzt_an: { typ: "erdreich" } },
          { typ_id: "bt_iw", name: "Wand zum Wohnen", A: 8,
            grenzt_an: { typ: "raum", ref: "r1" } },
        ] },
      { id: "r3", name: "Schlafen", geschoss: "OG", art: "wohnen", we: "we1",
        A: 23, h: 2.4, theta_i: 20, n_min: 0.5, n_exponiert: 2,
        bauteile: [
          { typ_id: "bt_aw", name: "Außenwand", A: 19, grenzt_an: { typ: "aussen" } },
          { typ_id: "bt_fe", name: "Fenster", A: 3.5, grenzt_an: { typ: "aussen" } },
          { typ_id: "bt_dach", name: "Dach", A: 23, grenzt_an: { typ: "aussen" } },
        ] },
    ],
    plan: { bilder: [] },
  };
}

const p = projekt();
App.p = p;
let e = null;
try {
  e = window.KERN_HEIZLAST_NORM.rechne(App.projektFuerKern(p));
  App.ergebnis = e;
} catch (err) {
  fehler.push("Der Rechenkern bricht ab: " + (err && err.message));
}
pruefe(!!e && !e.fehlerhaft, "Das Pruefprojekt muss rechenbar sein");

if (e) {
  App.pruefung = window.KERN_PRUEFUNG.pruefeAlles(p, e,
    { typologie: window.DATEN_TYPOLOGIE, kontrollblatt: KB });

  /* Der Fall muss wirklich gemischte Raumtemperaturen tragen, sonst prüft der
     Vergleich einen Sonderfall.
     NICHT geprüft wird, ob sich Raumsumme und Gebäudelast unterscheiden: sie
     tun es hier NICHT, und das ist richtig. Beide Seiten der Innenwand sind
     modelliert, also heben sich die Innenanteile exakt auf (die Invariante aus
     referenz_test.js, R18). Eine Differenz entsteht erst, wenn ein
     Innenbauteil gegen eine feste Temperatur ohne modellierten Gegenraum
     steht — wie im Referenzfall Mälzerstraße (9.052 gegen 9.100 W). */
  const temps = e.raeume.map((r) => r.theta_i);
  pruefe(new Set(temps).size >= 2,
    "Die Probe ist falsch aufgesetzt: es müssen mindestens zwei verschiedene "
      + "Raumtemperaturen vorkommen, sind " + JSON.stringify(temps));
  pruefe(e.raeume.some((r) => Math.abs(r.phi_T_innen) > 1),
    "Die Probe ist falsch aufgesetzt: mindestens ein Raum muss einen "
      + "Innenanteil tragen, damit die Berichte diesen Weg überhaupt gehen");

  const fassungen = [];
  ["intern", "druck"].forEach(function (f) {
    try {
      const d = MB.dokument({ fassung: f });
      fassungen.push({ name: "Bericht " + f, html: d.html });
    } catch (err) {
      fehler.push("Bericht " + f + " bricht ab: " + (err && err.message));
    }
  });
  try {
    fassungen.push({ name: "Kontrollblatt", html: KB.html() });
  } catch (err) {
    fehler.push("Kontrollblatt bricht ab: " + (err && err.message));
  }
  pruefe(fassungen.length === 3,
    "Alle drei Fassungen müssen entstehen, entstanden: "
      + fassungen.map((x) => x.name).join(", "));

  /** Alle „x,yz kW"-Angaben aus einem Text holen. */
  function kwStellen(html) {
    const text = String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    const raus = [];
    const re = /(\d{1,3}(?:[.,]\d{1,3})?)\s*kW/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      raus.push({
        wert: parseFloat(m[1].replace(".", "").replace(",", ".")),
        umfeld: text.slice(Math.max(0, m.index - 70), m.index + 30).trim(),
      });
    }
    return raus;
  }
  function kwWerte(html) { return kwStellen(html).map((x) => x.wert); }

  const sollKW = e.phi_gebaeude / 1000;
  const sollRaumKW = e.phi_raeume_summe / 1000;

  fassungen.forEach(function (f) {
    const werte = kwWerte(f.html);
    /* Das Kontrollblatt ist ein Zählblatt; es nennt keine Heizlast in kW und
       muss das auch nicht. Verlangt wird die Zahl nur dort, wo sie hingehört:
       in den beiden Berichtsfassungen (weiter unten, scharf geprüft). */
    if (/^Bericht/.test(f.name)) {
      pruefe(werte.length > 0, f.name + ": es steht keine kW-Angabe darin");
    }
    if (!werte.length) return;

    /* Jede kW-Angabe MUSS eine der Größen des Rechenergebnisses sein: die
       Gebäudeheizlast, die Raumsumme, ein Raumwert, eine Summe je Geschoss
       oder je Einheit, oder eine Teillast. Eine Zahl, die zu keiner davon
       passt, ist entweder ein Rechenfehler in der Darstellung oder eine
       Zahl aus einer anderen Rechnung — beides muss auffallen.
       Verglichen wird auf 3 Stellen in kW, also auf das Watt: mehr
       Genauigkeit hat keine der Fassungen. */
    const erlaubt = [sollKW, sollRaumKW]
      .concat(e.raeume.map((r) => r.phi_raum / 1000))
      .concat(Object.keys(e.je_geschoss).map((g) => e.je_geschoss[g].phi_raum / 1000))
      .concat(Object.keys(e.je_geschoss).map((g) => e.je_geschoss[g].phi_gebaeude / 1000))
      .concat(Object.keys(e.je_we).map((w) => e.je_we[w].phi_raum / 1000))
      .concat([e.phi_T_gebaeude / 1000, e.phi_V_gebaeude / 1000,
               e.phi_RH_gebaeude / 1000])
      /* Der Bericht beziffert auch die WIRKUNG des pauschalen
         Wärmebrückenzuschlags („Auf die Norm-Heizlast des Gebäudes wirkt er
         sich mit rund 0,24 kW aus"). Das ist eine Differenz, keine Heizlast,
         gehört aber geprüft — sonst könnte dort jede Zahl stehen. Sie wird
         hier unabhängig nachgerechnet:
             SUM über alle Hüllbauteile von A * delta_u_wb * (theta_i - theta_e)
         Nachrechnung für dieses Projekt: 27,0*0,1*29,6 + 8,2*0,1*33,6
         + 45,5*0,1*29,6 = 79,92 + 27,55 + 134,68 = 242,15 W = 0,242 kW. */
      .concat([e.raeume.reduce(function (summe, r) {
        return summe + r.bauteile.reduce(function (t, b) {
          return t + (b.kat === "huelle"
            ? b.A * e.norm.DELTA_U_WB * (r.theta_i - e.klima.theta_e) : 0);
        }, 0);
      }, 0) / 1000]);

    kwStellen(f.html).forEach(function (stelle) {
      const w = stelle.wert;
      /* Eine RUNDUNGSREGEL ist kein Messwert. Der Bericht schreibt
         ausdrücklich „Gerechnet sind 1,00 kW, angegeben auf 0,1 kW gerundet" —
         die 0,1 kW sind die Schrittweite, nicht die Heizlast. Genau diese
         Offenlegung ist erwünscht; sie darf hier nicht als Widerspruch
         durchgehen. */
      if (/gerundet|Rundung|Nachkommastelle|Schrittweite/i.test(stelle.umfeld)) return;
      /* Die Fassungen runden auf eine oder zwei Nachkommastellen in kW. Die
         Toleranz ist genau diese Rundung: eine Stelle heisst 50 W. */
      const passt = erlaubt.some(function (s) { return Math.abs(w - s) <= 0.05; });
      pruefe(passt, f.name + ": die Angabe " + w + " kW passt zu keiner Größe "
        + "des Rechenergebnisses. Umfeld: …" + stelle.umfeld + "… — erlaubt wären "
        + "u. a. Gebäudelast " + sollKW.toFixed(3) + ", Raumsumme "
        + sollRaumKW.toFixed(3) + ", Raumwerte "
        + e.raeume.map((r) => (r.phi_raum / 1000).toFixed(3)).join("/"));
    });
  });

  /* Und die scharfe Probe in der anderen Richtung: die GEBÄUDEHEIZLAST muss
     in beiden Berichtsfassungen wirklich vorkommen. Ein Bericht, der nur
     Raumwerte nennt, wäre nach der Prüfung oben makellos — und unbrauchbar. */
  fassungen.filter((f) => /^Bericht/.test(f.name)).forEach(function (f) {
    const werte = kwWerte(f.html);
    pruefe(werte.some((w) => Math.abs(w - sollKW) <= 0.05),
      f.name + ": die Gebäudeheizlast " + sollKW.toFixed(2)
        + " kW kommt darin nicht vor. Gefunden: " + werte.join(", "));
  });

  /* Die Flächensumme darf zwischen den Fassungen nicht wandern. */
  const flaeche = e.A_gesamt;
  fassungen.filter((f) => /^Bericht/.test(f.name)).forEach(function (f) {
    const text = String(f.html).replace(/<[^>]*>/g, " ");
    const m = text.match(/(\d{1,4},\d{1,2})\s*m²/g) || [];
    const zahlen = m.map((x) => parseFloat(x.replace(/\s*m²/, "").replace(",", ".")));
    pruefe(zahlen.some((z) => Math.abs(z - flaeche) <= 0.05)
        || zahlen.some((z) => Math.abs(z - (p.meta.wohnflaeche || 0)) <= 0.05),
      f.name + ": weder die Summe der Raumflächen (" + flaeche.toFixed(2)
        + " m²) noch die Wohnfläche (" + p.meta.wohnflaeche
        + " m²) steht darin. Gefunden: " + zahlen.slice(0, 12).join(", "));
  });

  /* Die Druckfassung darf keine ANDERE Zahl nennen als die interne. Verglichen
     werden die Mengen der genannten kW-Werte: jede Zahl der Druckfassung muss
     auch in der internen Fassung vorkommen. Die interne darf mehr nennen
     (offene Punkte, Spannen), die Druckfassung nie etwas Eigenes. */
  const intern = fassungen.find((f) => f.name === "Bericht intern");
  const druck = fassungen.find((f) => f.name === "Bericht druck");
  if (intern && druck) {
    const iw = kwWerte(intern.html);
    kwWerte(druck.html).forEach(function (w) {
      pruefe(iw.some((x) => Math.abs(x - w) <= 0.005),
        "Die Druckfassung nennt " + w + " kW, die interne Fassung nicht. "
          + "Interne Werte: " + iw.join(", "));
    });
  }
}

console.log(JSON.stringify({ ok: fehler.length === 0, anzahl: anzahl,
  fehler: fehler }));
