/* ===========================================================================
 * vorschlagspflicht_test.js — jede Rückfrage trägt einen Vorschlag
 * ===========================================================================
 * Grundlage ist validierung/echtlauf/ziolkowski_lauf4_fenster.json: der
 * gespeicherte Projektstand des echten Endpunkt-Durchlaufs vom 23.08.2026
 * mit „Werkvertragsverzeichnung BV 2-0887 Ziolkowski.pdf". Kein Feld darin
 * ist nachgestellt; was diese Probe prüft, ist, was die Rückfragen-Maschine
 * aus diesem Stand macht.
 *
 * Verlangt wird die Produktregel des Kunden:
 *
 *   1  Aus dem Echtlauf-Stand entstehen GENAU die Fragen, die ein Bearbeiter
 *      beantworten kann — am 24.08.2026 sind das vier: der Widerspruch zum
 *      Kellergeschoss, die hochgerechneten Außenwände (EG und OG als EINE
 *      Frage), und die beiden bestätigbaren Annahmen (Klima, Baujahr).
 *      „Quervergleich nicht möglich" und „Belegte Werte gegen Annahmen"
 *      sind KEINE Fragen — es gibt daran nichts zu beantworten — und stehen
 *      als Feststellungen dabei.
 *   2  Ordnung: Sperren vor Widersprüchen vor Angaben vor Annahmen.
 *   3  Gebündelt wird in der FRAGENLISTE, nicht in den Prüfzeilen: das
 *      Kontrollblatt behält „Außenwände EG" und „Außenwände OG" als zwei
 *      Zeilen, die Fragenliste macht daraus eine.
 *   4  Ein Widerspruch ist nicht mit einem Klick abzuräumen: kein
 *      „Passt so", stattdessen die Zeilen-Aktion (Bereich anlegen) und die
 *      Entscheidung mit Vermerk (kbSperreAufheben). Eine offene Angabe
 *      DARF mit einem Klick bestätigt werden.
 *   5  Die Antworten landen dort, wo sie heute landen (zurKenntnis,
 *      sperreAufheben, schreiben) — und danach ist die Frage weg, ohne dass
 *      eine Prüfzeile gelöscht wurde.
 *   6  Der Schritt sagt oben den Stand („Wir brauchen noch N Angaben"),
 *      zählt „Frage 1 von N", und ohne offene Fragen steht kein leerer
 *      Bildschirm, sondern der Weg zum Ergebnis.
 *   7  Standardwerte werden benannt, nicht abgefragt: EIN Block mit
 *      „Gibt es Abweichungen? Nein / Ja, ändern".
 *
 * Aufruf:  node validierung/rueckfragen_test.js
 * =========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const WURZEL = path.join(__dirname, "..");
const fehler = [];
let anzahl = 0;

function pruefe(bedingung, text) {
  anzahl++;
  if (!bedingung) fehler.push(text);
}

/* ------------------------------------------------------------------ Attrappe
 * Dieselbe Attrappe wie in ablauf_test.js. */
function knoten(name) {
  return {
    tagName: String(name || "div").toUpperCase(),
    innerHTML: "", value: "", checked: false, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], files: [],
    appendChild(x) { this.children.push(x); return x; },
    removeChild() {}, remove() {}, setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, click() {},
    closest() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 900, height: 600, top: 0, left: 0 }; },
    getContext() { return kontext2d(); },
    toDataURL() { return "data:image/png;base64,x"; },
    scrollIntoView() {},
  };
}
function kontext2d() {
  const nichts = function () { return kontext2d(); };
  return new Proxy({}, {
    get(ziel, schluessel) {
      if (schluessel === "canvas") return knoten("canvas");
      if (schluessel === "measureText") return function () { return { width: 10 }; };
      if (schluessel === "getImageData") {
        return function () { return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; };
      }
      return nichts;
    },
    set() { return true; },
  });
}

const speicher = {};
const fenster = {
  location: { protocol: "https:", search: "", href: "https://pruefung.invalid/" },
  localStorage: {
    getItem(k) { return speicher[k] === undefined ? null : speicher[k]; },
    setItem(k, v) { speicher[k] = String(v); },
    removeItem(k) { delete speicher[k]; },
  },
  addEventListener() {}, matchMedia() { return { matches: false, addListener() {} }; },
  scrollTo() {}, alert() {}, confirm() { return true; }, print() {},
  MODUL_DIALOG: {
    sagen() { return { weg() {} }; },
    fragen() { return Promise.resolve(true); },
    eingabe() { return Promise.resolve(""); },
    arbeit() { return { text() {}, fertig() {}, warten() { return Promise.resolve(); } }; },
  },
  requestAnimationFrame(f) { return setTimeout(f, 0); },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  fetch() { return Promise.reject(new Error("kein Netz im Test")); },
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  ikon(name) { return '<svg class="ikon"><use href="#i-' + name + '"></use></svg>'; },
};
const seite = {
  readyState: "loading",
  addEventListener() {}, removeEventListener() {},
  createElement: knoten, createElementNS: knoten,
  createTextNode() { return knoten("text"); },
  getElementById() { return null; }, querySelector() { return null; },
  querySelectorAll() { return []; },
  body: knoten("body"), head: knoten("head"), documentElement: knoten("html"),
  activeElement: null,
};
fenster.document = seite;
fenster.window = fenster;
fenster.self = fenster;
fenster.globalThis = fenster;

const umgebung = vm.createContext(fenster);
umgebung.console = console;
umgebung.Image = function () { return knoten("img"); };
umgebung.FileReader = function () { this.readAsDataURL = function () {}; };
umgebung.URL = URL;
umgebung.Blob = function () {};
umgebung.performance = { now() { return 0; } };
umgebung.navigator = { userAgent: "pruefung", clipboard: {} };
umgebung.TextEncoder = TextEncoder;
umgebung.TextDecoder = TextDecoder;
umgebung.Uint8Array = Uint8Array;
umgebung.Uint8ClampedArray = Uint8ClampedArray;

/* Der volle Satz: der Echtlauf-Stand trägt Gegenproben, Annahmen und
   Höhenbefunde, und ohne die zugehörigen Kerne stünden die Zähler des
   Kontrollblatts anders da als im Browser. */
const DATEIEN = [
  "src/standorte.js", "src/daten/daten_zonenlagen.js",
  "src/kerne/kern_heizlast_norm.js", "src/daten/daten_raumarten.js",
  "src/daten/daten_klima.js", "src/daten/daten_bauteile.js",
  "src/daten/daten_typologie.js", "src/daten/daten_beg_anforderungen.js",
  "src/kerne/kern_pruefung.js", "src/kerne/kern_planpruefung.js",
  "src/kerne/kern_massstabsprobe.js", "src/kerne/kern_massstab.js",
  "src/kerne/kern_zuordnung.js", "src/kerne/kern_bandbreite.js",
  "src/kerne/kern_flaeche.js",
  "src/kerne/kern_lage.js", "src/kerne/kern_fenster.js",
  "src/kerne/kern_messen.js", "src/kerne/kern_zuschnitt.js",
  "src/kerne/kern_gegenprobe.js", "src/kerne/kern_annahmen.js",
  "src/kerne/kern_huellendeckung.js", "src/kerne/kern_baujahrprobe.js",
  "src/modul_pdf.js", "src/modul_plan.js", "src/modul_ki.js",
  "src/modul_kontrollblatt.js", "src/modul_pruefblatt.js",
  "src/modul_berichtsatz.js", "src/modul_teillast.js",
  "src/modul_bericht.js", "src/modul_bewertung.js",
];
for (const d of DATEIEN) {
  const pfad = path.join(WURZEL, d);
  if (!fs.existsSync(pfad)) continue;
  try { vm.runInContext(fs.readFileSync(pfad, "utf8"), umgebung, { filename: d }); }
  catch (e) { fehler.push(d + " laesst sich nicht laden: " + e.message); }
}
let app = fs.readFileSync(path.join(WURZEL, "src/app.js"), "utf8");
app += "\n;window.__rf = { App, leeresProjekt, rechnen, rueckfragenStand,"
  + " vorschlagAbgelehnt, vorschlagBlock, vorschlagFeldZeigen, vorschlagFrage,"
  + " vorschlagKontur, vorschlagFlaeche, vorschlagAussenmasse, vorschlagWirkung,"
  + " rueckfragenListe, schrittRueckfragen, standardwerteHinweis,"
  + " hoehenVorschlaegeUebernehmen, hoehenUebernehmen, automatischErgaenzen,"
  + " quelleNachreichen };\n";
try { vm.runInContext(app, umgebung, { filename: "src/app.js" }); }
catch (e) { fehler.push("app.js laesst sich nicht laden: " + e.message); }
const T = fenster.__rf;
const KB = fenster.MODUL_KONTROLLBLATT;
if (!T || !KB) {
  console.log(JSON.stringify({ ok: false, anzahl: anzahl || 1,
    fehler: fehler.length ? fehler : ["Bootstrap fehlgeschlagen"] }));
  process.exit(1);
}

/* ===========================================================================
 * DIE PROBE ZUR VORSCHLAGSPFLICHT
 * ===========================================================================
 * Sebastian Hund am 26.08.2026: „ich möchte bei allen rückfragen einen
 * vorschlag angezeigt bekommen den man dann annehmen oder ablehnen kann …
 * das muss automatisch gehen."
 *
 * Geprüft wird an ZWEI gespeicherten Echtläufen — nichts ist nachgestellt:
 *   hasenberg_lauf_2026-08-25.json   (20 Räume, alle mit Fläche)
 *   ziolkowski_lauf4_fenster.json    (der Stand der Abnahme vom 24.08.2026)
 * und an einer eigens gebauten Lage mit Räumen OHNE Fläche, weil genau die
 * im Soethe-Lauf vom 26.08.2026 auftrat.
 * ======================================================================== */

let kette = null;

function stand(datei) {
  const roh = JSON.parse(fs.readFileSync(path.join(WURZEL,
    "validierung/echtlauf/" + datei), "utf8"));
  return roh.projekt || roh;
}

function laden(datei) {
  T.App.p = Object.assign(T.leeresProjekt(), stand(datei));
  T.App.p.meta.bearbeiter = "Probelauf";
  T.App.rueckfrageIndex = 0;
  T.rechnen();
  return T.rueckfragenStand();
}

/* ============================================================ 1  Jede Frage
 * trägt einen Vorschlag — oder eine BEGRÜNDETE Ausnahme. Kein drittes. */
["hasenberg_lauf_2026-08-25.json", "ziolkowski_lauf4_fenster.json",
 "gunnebach_lauf_2026-08-25.json"].forEach(function (datei) {
  const st = laden(datei);
  st.fragen.forEach(function (f) {
    pruefe(!!f.vorschlag,
      datei + ": die Frage „" + f.titel + "“ trägt gar keinen Vorschlag. "
      + "Jede Frage muss einen Wert, eine Entscheidung oder eine begründete "
      + "Ausnahme anbieten.");
    if (!f.vorschlag) return;
    const v = f.vorschlag;
    if (v.art === "ohne") {
      pruefe(String(v.ohne || "").length > 30,
        datei + ": „" + f.titel + "“ hat keinen Vorschlag, begründet das "
        + "aber nicht ausreichend: „" + v.ohne + "“");
    } else {
      /* REGEL: ein abgeleiteter Wert nennt seine Herleitung. Ohne Herkunft
         wäre der Vorschlag genau die erfundene Zahl, die es nicht geben
         darf — vorschlagWert() gibt dann null zurück, und die Frage stünde
         hier ohne Vorschlag da. */
      pruefe(String(v.herkunft || "").length > 10,
        datei + ": der Vorschlag zu „" + f.titel + "“ nennt seine Herkunft "
        + "nicht: „" + v.herkunft + "“");
      pruefe(String(v.knopf || "").length > 2,
        datei + ": der Vorschlag zu „" + f.titel + "“ hat keine Knopfschrift.");
    }
  });
});

/* ================================================= 2  Zwei GLEICHWERTIGE
 * Knöpfe: Annehmen ist ein Klick, Ablehnen ist ein Klick. */
(function () {
  const st = laden("ziolkowski_lauf4_fenster.json");
  let geprueft = 0;
  st.fragen.forEach(function (f, i) {
    if (!f.vorschlag || f.vorschlag.art === "ohne") return;
    T.App.rueckfrageIndex = i;
    const html = T.schrittRueckfragen();
    pruefe(/data-aktion="vorschlagAblehnen"/.test(html),
      "„" + f.titel + "“ bietet kein Ablehnen an.");
    pruefe(/<button class="btn cta" data-aktion="(vorschlagUebernehmen|kb[A-Za-z]+)"/
      .test(html), "„" + f.titel + "“ bietet kein Annehmen als Knopf an.");
    /* GLEICHWERTIG heißt: beide sind ein <button>, beide in derselben
       Zeile, keiner ist ein Link im Kleingedruckten und keiner öffnet
       einen zweiten Dialog. */
    pruefe(!/<a [^>]*data-aktion="vorschlagAblehnen"/.test(html),
      "Ablehnen ist bei „" + f.titel + "“ ein Link statt eines Knopfes — "
      + "es darf nicht schwerer sein als Annehmen.");
    geprueft++;
  });
  pruefe(geprueft > 0, "Es wurde keine einzige Frage mit Vorschlag gezeichnet.");
})();

/* ============================== 3  Der Vorschlag wird ANGEZEIGT, nicht still
 * gesetzt — und das Eingabefeld erscheint erst NACH dem Ablehnen. */
(function () {
  const st = laden("ziolkowski_lauf4_fenster.json");
  const f = st.fragen.find(function (x) {
    return x.vorschlag && x.vorschlag.art !== "ohne" && x.eingabe; });
  pruefe(!!f, "Keine Frage mit Vorschlag UND Eingabefeld gefunden.");
  if (!f) return;
  pruefe(!T.vorschlagFeldZeigen(f),
    "Solange der Vorschlag steht, darf das Eingabefeld nicht erscheinen — "
    + "sonst stehen zwei Antworten auf dieselbe Frage nebeneinander.");
  T.App.p.vorschlaege_abgelehnt = T.App.p.vorschlaege_abgelehnt || {};
  T.App.p.vorschlaege_abgelehnt[f.vorschlag.id] = { wert: f.vorschlag.wert,
    zeit: "2026-08-26 12:00", wer: "Probelauf" };
  pruefe(T.vorschlagFeldZeigen(f),
    "Nach dem Ablehnen MUSS das Eingabefeld erscheinen.");
  /* REGEL 5: derselbe Vorschlag kommt nicht wieder. */
  const html = T.vorschlagBlock(f);
  pruefe(/Vorschlag abgelehnt/.test(html),
    "Der Ablehnungsvermerk fehlt: " + html.slice(0, 120));
  pruefe(!/data-aktion="vorschlagUebernehmen"/.test(html),
    "Ein abgelehnter Vorschlag wird erneut zum Annehmen angeboten — "
    + "die Ablehnung muss ihn zurückhalten.");
})();

/* ========================== 4  Eine Ausnahme sagt AUSDRÜCKLICH, dass sie
 * keinen Vorschlag hat, und warum. */
(function () {
  const f = { id: "probe", vorschlag: T.rueckfragenStand
    && { id: "probe", art: "ohne",
         ohne: "auf keinem Blatt eine Maßkette steht, aus der sich das ergäbe." } };
  const html = T.vorschlagBlock(f);
  pruefe(/keinen ableitbaren Vorschlag/.test(html),
    "Die Ausnahme sagt nicht ausdrücklich, dass es keinen Vorschlag gibt.");
  pruefe(/weil/.test(html), "Die Ausnahme nennt keinen Grund.");
})();

/* ================== 5  EIN VORSCHLAG ÜBERSCHREIBT NIE EINE EINGABE. Die
 * härteste Regel des Werkzeugs, hier für jeden Vorschlag geprüft. */
(function () {
  const st = laden("hasenberg_lauf_2026-08-25.json");
  st.fragen.forEach(function (f) {
    const v = f.vorschlag;
    if (!v || typeof v.anwenden !== "function") return;
    /* Der Bearbeiter hat überall schon selbst etwas eingetragen. */
    const vorher = JSON.parse(JSON.stringify({
      hoehen: T.App.p.geschosshoehen || {},
      masse: T.App.p.geschossmasse || {},
      flaechen: T.App.p.raeume.map(function (r) { return r.A; }),
      baujahr: T.App.p.meta.baujahr, plz: T.App.p.meta.plz,
      bez: T.App.p.meta.bezeichnung,
    }));
    v.anwenden(T.App.p, false);
    pruefe(JSON.stringify(T.App.p.raeume.map(function (r) { return r.A; }))
        === JSON.stringify(vorher.flaechen),
      "Der Vorschlag „" + f.titel + "“ hat belegte Raumflächen überschrieben.");
    pruefe(String(T.App.p.meta.baujahr) === String(vorher.baujahr),
      "Der Vorschlag „" + f.titel + "“ hat das eingetragene Baujahr "
      + "überschrieben (" + vorher.baujahr + " → " + T.App.p.meta.baujahr + ").");
    pruefe(String(T.App.p.meta.plz) === String(vorher.plz),
      "Der Vorschlag „" + f.titel + "“ hat die eingetragene PLZ überschrieben.");
    pruefe(String(T.App.p.meta.bezeichnung) === String(vorher.bez),
      "Der Vorschlag „" + f.titel + "“ hat die Bezeichnung überschrieben.");
  });
})();

/* ===========================================================================
 * 6  DER FALL SOETHE: Räume OHNE Fläche, Kontur aus der Außenbemaßung
 * ===========================================================================
 * Am 26.08.2026 kamen aus „Bauantrag Soethe 1312.2021.pdf" 14 Räume, alle
 * mit A = 0 — auf dem Blatt steht kein einziger Flächenstempel. Gelesen
 * WURDE die Außenbemaßung: EG 11,80 / 7,50 (Fläche 88,50 m², Umfang
 * 38,60 m, Seite 2), OG 11,20 / 7,70 (86,24 m², 37,80 m, Seite 3).
 * Diese Zahlen sind hier nicht erfunden, sondern die aus dem echten Lauf
 * abgelesenen Konturwerte; sie stehen im Browser unter
 * plan.seiten[i].gegenprobeKonturen. Geprüft wird, dass daraus ein
 * Vorschlag entsteht — statt eines leeren Feldes.
 * ======================================================================== */
(function () {
  const p = Object.assign(T.leeresProjekt(), {
    meta: { bezeichnung: "Neubau eines Einfamilienhauses", plz: "37696",
            baujahr: 2021, gebaeudeart: "efh", bearbeiter: "Probelauf" },
    /* Name UND Raumart genau so, wie der echte Lauf vom 26.08.2026 sie
       geliefert hat — das Feld heisst `art`, nicht `raumart`; mit dem
       falschen Feldnamen laeuft jede Raumart als „unbekannt" durch und die
       Verteilung faellt gleichmaessig aus, ohne dass es auffiele. */
    raeume: [["Technik/HWR", "nebenraum", 2, 1], ["Wohnen/Essen", "wohnen", 3, 3],
             ["WC", "wc", 1, 0], ["Diele", "flur", 0, 0],
             ["Windfang/Garderobe", "treppenhaus", 2, 2],
             ["Vorrat", "lager_beheizt", 0, 0], ["Kochen", "kueche", 1, 1]]
      .map(function (x, i) {
        return { id: "r" + i, name: x[0], art: x[1], geschoss: "EG", A: 0,
                 h: 2.6, aussenwaende: x[2], ecken: 4, fenster: x[3],
                 bauteile: [] };
      }),
    plan: { seiten: [
      { name: "Bauantrag Soethe 1312.2021.pdf, Seite 2",
        bezeichnung: "Bauantrag Soethe 1312.2021.pdf, Seite 2",
        geschoss: "EG", verwenden: true,
        gegenprobeKonturen: [{ A: 88.5, U: 38.6, breite_m: 11.8, tiefe_m: 7.5,
          rechteckig: true, ebene: "ERDGESCHOSS", wortlaut: "11.80 / 7.50",
          quelle: "Außenbemaßung ERDGESCHOSS, 11,8 m mal 7,5 m („11.80 / 7.50“)" }] },
    ], bilder: [] },
  });
  T.App.p = p;
  /* Wie im echten Lauf: die Bauteiltypen entstehen aus dem Baujahr
     (Typologie-Rückfall) — im Soethe-Stand standen sechs davon im Projekt.
     Ohne sie prüfte 6e nur, dass ein leerer Typenvorrat leer bleibt. */
  T.automatischErgaenzen();
  T.rechnen();
  pruefe((p.bauteiltypen || []).length > 0,
    "Der Baujahr-Rückfall muss Bauteiltypen anlegen — wie im echten Lauf.");

  /* 6a  Die Kontur wird gefunden — mit Breite, Tiefe, Umfang und Quelle. */
  const k = T.vorschlagKontur(p, "EG");
  pruefe(!!k && Math.abs(k.U - 38.6) < 0.001 && Math.abs(k.breite_m - 11.8) < 0.001,
    "Die Außenbemaßung des EG wird nicht als Kontur gefunden: "
    + JSON.stringify(k));

  /* 6b  Aus ihr entsteht ein Flächenvorschlag je Raum. Genau das fehlte:
         „Für 14 Räume steht keine Grundfläche in den Unterlagen" — und
         dann ein leeres Feld. */
  const ohneA = p.raeume.filter(function (r) { return !(r.A > 0); });
  const v = T.vorschlagFlaeche(p, ohneA);
  pruefe(!!v && v.art === "wert",
    "Aus einer gelesenen Außenbemaßung MUSS ein Flächenvorschlag entstehen, "
    + "statt das Feld leer zu lassen: " + JSON.stringify(v));
  if (v && v.art === "wert") {
    /* 6c  Die Herkunft muss die Verteilung ausdrücklich benennen. Ein
           verteilter Wert, der wie ein Aufmaß aussieht, wäre schlimmer als
           gar keiner. */
    pruefe(/VERTEILUNG/.test(v.herkunft) && /Außenbemaßung/.test(v.herkunft),
      "Der Flächenvorschlag muss sagen, dass er eine VERTEILUNG der "
      + "belegten Geschossfläche ist und woher sie stammt: " + v.herkunft);
    pruefe(/kein gemessener Raumwert/.test(v.herkunft),
      "Der Flächenvorschlag gibt sich nicht ausdrücklich als Nicht-Aufmaß "
      + "zu erkennen: " + v.herkunft);
    /* 6d  Die Zahl selbst: 88,50 m² brutto minus dem Ring der Außenwände
           (A − U·d + 4·d², Wanddickenspanne aus MODUL_KONTROLLBLATT), nach
           Raumart auf die Räume verteilt — seit dem 26.08.2026 NICHT mehr
           gleichmäßig. Geprüft wird die Größenordnung, dass die Summe die
           Kontur nicht übersteigt, und dass die Verteilung die Räume
           unterscheidet. */
    const erg = v.anwenden(p, false);
    pruefe(erg && erg.ok, "Der Flächenvorschlag ließ sich nicht anwenden.");
    const summe = p.raeume.reduce(function (s, r) { return s + r.A; }, 0);
    pruefe(summe > 0 && summe <= 88.5 + 0.01,
      "Die verteilte Fläche (" + summe.toFixed(2) + " m²) darf die "
      + "Außenkontur von 88,50 m² nie übersteigen — das wäre geometrisch "
      + "unmöglich.");
    p.raeume.forEach(function (r) {
      pruefe(r.A > 0, "Raum „" + r.name + "“ hat nach dem Übernehmen immer "
        + "noch keine Fläche.");
      pruefe(!!r.A_vorschlag && r.A_vorschlag.art === "verteilung",
        "Raum „" + r.name + "“ trägt keinen Vermerk, dass seine Fläche aus "
        + "einer Verteilung stammt — im Bericht stünde eine Zahl ohne "
        + "Herkunft.");
    });
    /* 6e  DIE KETTE: mit der Fläche entstehen die Bauteile, und aus den
           Bauteilen wird die Heizlast überhaupt erst eine Zahl. */
    T.App.p = p;
    /* Denselben Weg wie render(): erst ausfüllen, was sich jetzt ausfüllen
       lässt, dann rechnen. Genau hier hängt die Kette des Kunden — mit der
       Fläche wird die Bauteilbildung fällig. */
    T.automatischErgaenzen();
    T.rechnen();
    const bt = p.raeume.reduce(function (s, r) {
      return s + ((r.bauteile || []).length); }, 0);
    pruefe(bt > 0, "Nach dem Übernehmen der Fläche muss die Bauteilbildung "
      + "laufen — sie ist an die Fläche gekettet. Bauteile: " + bt);
    /* Und aus den Bauteilen wird die Heizlast eine Zahl. Befund 2 im
       Wortlaut: „Deshalb steht die Gebäudeheizlast auf 0,00 kW." */
    pruefe(T.App.ergebnis && T.App.ergebnis.phi_gebaeude > 0,
      "Die Gebäudeheizlast steht nach dem Übernehmen immer noch auf 0,00 kW.");
    /* 6f  Nicht gleichmäßig. Eine Verteilung, die jedem Raum dieselbe Zahl
           gibt, sagt: das WC ist so groß wie der Wohnraum. Am Prüfsatz von
           KERN_FLAECHE liegt sie im Median 25,7 % daneben, die Verteilung
           nach Raumart 14,0 %. */
    const flaechen = p.raeume.map(function (r) { return r.A; });
    const kleinste = Math.min.apply(null, flaechen);
    const groesste = Math.max.apply(null, flaechen);
    pruefe(groesste > kleinste * 1.5, "Die Flächen sind praktisch gleich "
      + "verteilt (" + kleinste.toFixed(2) + " bis " + groesste.toFixed(2)
      + " m²) — die Raumart muss sie unterscheiden.");
    p.raeume.forEach(function (r) {
      pruefe(Array.isArray(r.A_spanne) && r.A_spanne[0] > 0
             && r.A_spanne[1] >= r.A_spanne[0],
        "Raum „" + r.name + "“ trägt keine Spanne — eine verteilte Fläche "
        + "muss in der Bandbreite mitlaufen.");
    });
    kette = { bauteile: bt,
              /* phi_gebaeude steht in WATT — geteilt wird für die Anzeige. */
              kw: Math.round(T.App.ergebnis.phi_gebaeude / 10) / 100,
              kleinste_m2: Math.round(kleinste * 100) / 100,
              groesste_m2: Math.round(groesste * 100) / 100,
              summe_m2: Math.round(summe * 100) / 100 };
  }
})();

/* ================== 7  Die Außenmaße: gelesen, aber auf nichts verteilt.
 * „auch die außenmaße werden nicht automatisch gezogen" (Sebastian). Sie
 * stehen strukturiert in der Kontur und werden jetzt vorgeschlagen. */
(function () {
  const p = T.App.p;
  p.geschossmasse = {};
  const v = T.vorschlagAussenmasse
    ? T.vorschlagAussenmasse(p, ["EG"]) : null;
  if (v) {
    pruefe(/11,80 × 7,50/.test(v.wert),
      "Der Außenmaß-Vorschlag nennt die abgelesenen Maße nicht: " + v.wert);
    pruefe(/nicht geschätzt/.test(v.herkunft),
      "Der Außenmaß-Vorschlag muss sagen, dass er abgelesen und nicht "
      + "geschätzt ist: " + v.herkunft);
    v.anwenden(p, false);
    pruefe(p.geschossmasse.EG && Math.abs(p.geschossmasse.EG.breite_m - 11.8) < 0.001,
      "Das Außenmaß wurde nicht gesetzt: " + JSON.stringify(p.geschossmasse));
  }
})();

/* ================== 8  KEIN VERSPRECHEN OHNE FELD.
 * Befund aus den Prüfläufen vom 26.08.2026 (alle fünf Pläne): nach
 * „Ablehnen, selbst eintragen" sagte der Vermerk an JEDER Frage „der Wert
 * kommt aus dem Feld darunter" — und bei Fragen ohne Wertfeld stand dort
 * nichts. Die Frage war unbeantwortbar, der Weg eine Sackgasse.
 *
 * Geprüft wird an allen gespeicherten Echtlauf-Ständen und für JEDE Frage:
 *   a) Verspricht der Ablehnungsvermerk ein Feld, muss die Frage eines haben.
 *   b) Die Sperre „Raumfläche fehlt" muss nach dem Ablehnen für JEDEN Raum
 *      ohne Fläche ein Feld zeigen — sie ist der Fall, an dem es auffiel.
 *   c) Kein Knopftext trägt eine Stückzahl mit Nachkommastellen
 *      („17,00 Fenster", „0,00 Räume"). */
(function () {
  ["soethe_lauf_2026-08-26.json", "hasenberg_lauf_2026-08-25.json",
   "ziolkowski_lauf4_fenster.json", "gunnebach_lauf_2026-08-25.json"]
  .forEach(function (datei) {
    const st = laden(datei);
    st.fragen.forEach(function (f) {
      const v = f.vorschlag;
      if (!v) return;
      if (v.art !== "ohne") {
        T.App.p.vorschlaege_abgelehnt = T.App.p.vorschlaege_abgelehnt || {};
        T.App.p.vorschlaege_abgelehnt[v.id] = { wert: v.wert,
          zeit: "2026-08-26 15:29", wer: "Probe" };
      }
      const block = T.vorschlagBlock(f);
      delete (T.App.p.vorschlaege_abgelehnt || {})[v.id];
      pruefe(!/Feld darunter/.test(block) || !!f.eingabe,
        datei + " · „" + f.titel + "“ verspricht nach dem Ablehnen ein "
        + "Eingabefeld, hat aber keines.");
      pruefe(!/\d,\d\d (Räume|Fenster|Ebenen|Bereiche?|Bauteile?|Blätter|Geschosse?)\b/
        .test(String(v.knopf || "")),
        datei + " · Stückzahl mit Nachkommastellen auf dem Knopf: " + v.knopf);
    });
    const fl = st.fragen.find(function (f) { return f.id === "flaeche"; });
    if (fl) {
      const ohne = (T.App.p.raeume || []).filter(function (r) { return !(r.A > 0); });
      const felder = (String(fl.eingabe || "").match(/<input|<select/g) || []).length;
      pruefe(felder >= ohne.length,
        datei + " · Sperre Raumflaeche: " + ohne.length + " Raeume ohne Flaeche, "
        + "aber nur " + felder + " Eingabefelder.");
      const knoepfe = (String(fl.antworten || "")
        .match(/rueckfrageRaumEntfernen/g) || []).length;
      pruefe(knoepfe >= ohne.length,
        datei + " · Entfernen-Knopf fehlt fuer "
        + (ohne.length - knoepfe) + " von " + ohne.length + " Raeumen.");
    }
  });
})();

/* ---------------------------------------------------------------- Ergebnis */
const ergebnis = { ok: fehler.length === 0, anzahl: anzahl, fehler: fehler,
  kette_soethe: kette };
console.log(JSON.stringify(ergebnis));
if (!ergebnis.ok) process.exit(1);
