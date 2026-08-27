/* ===========================================================================
 * modul_berichtsatz.js — Satzregeln für den Heizlastbericht
 * ===========================================================================
 * Alles, was am Bericht reine Typografie und Seitenaufteilung ist, steht hier:
 * Deckblattfelder, Inhaltsverzeichnis, der Rahmen für Kopf- und Fußzeile und
 * das Nachziehen der Tabellenkopfzeilen. Kein DOM, keine Rechnung, nur Text
 * hinein und Text heraus. Dadurch ist jede Regel im Selbsttest prüfbar.
 *
 * Warum ein Rahmen aus einer Tabelle und nicht position:fixed
 * -----------------------------------------------------------
 * Im Druck versetzt Chrome position:fixed-Elemente unzuverlässig; sie landeten
 * im alten Bericht mitten in der ersten Textzeile. Eine Tabelle mit
 * thead/tfoot dagegen wiederholt Kopf und Fuß auf jeder Seite und hält den
 * Platz dafür frei. Das trägt in Chrome, in Safari und im Word-Export.
 *
 * Warum keine Seitenzahlen im Inhaltsverzeichnis
 * ----------------------------------------------
 * Seitenzahlen im Verzeichnis brauchen target-counter(). Das beherrscht weder
 * Chrome noch Safari. counter(page) funktioniert nur in den Randfeldern von
 * @page, also für die laufende Seitenzahl, nicht für das Verzeichnis. Statt
 * falscher Zahlen bekommt das Verzeichnis Sprungmarken: im PDF ist jeder
 * Eintrag anklickbar.
 * =========================================================================== */
"use strict";

(function () {
  const e2 = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ------------------------------------------------------------------ *
   * 1  Tabellenkopfzeilen nachziehen
   * ------------------------------------------------------------------ *
   * Eine Kopfzeile aus <th> wiederholt sich beim Seitenumbruch nur, wenn sie
   * in <thead> steht. Ein blankes <tr><th> erzeugt der Browser dagegen in
   * <tbody>, und dann stehen auf der Folgeseite Werte ohne Beschriftung.
   * Die Bausteine des Berichts schreiben ihre Tabellen ohne <thead>; diese
   * Funktion zieht die Kopfzeile nachträglich ein. */
  function kopfzeilenEinziehen(html) {
    const q = String(html == null ? "" : html);
    let aus = "", i = 0;
    for (;;) {
      const auf = q.indexOf("<table", i);
      if (auf < 0) { aus += q.slice(i); break; }
      const zu = q.indexOf("</table>", auf);
      if (zu < 0) { aus += q.slice(i); break; }
      aus += q.slice(i, auf);
      const block = q.slice(auf, zu + 8);
      aus += einzelneTabelle(block);
      i = zu + 8;
    }
    return aus;
  }

  function einzelneTabelle(block) {
    if (/<thead/i.test(block)) return block;
    const trAuf = block.indexOf("<tr");
    if (trAuf < 0) return block;
    const trEnde = block.indexOf("</tr>", trAuf);
    if (trEnde < 0) return block;
    const zeile = block.slice(trAuf, trEnde + 5);
    if (zeile.indexOf("<th") < 0) return block;   // keine Kopfzeile
    if (zeile.indexOf("<td") >= 0) return block;  // gemischt, Finger weg
    return block.slice(0, trAuf) + "<thead>" + zeile + "</thead>"
      + block.slice(trEnde + 5);
  }

  /* ------------------------------------------------------------------ *
   * 2  Rahmen mit laufender Kopf- und Fußzeile
   * ------------------------------------------------------------------ */
  function rahmen(kopf, fuss, inhalt) {
    return '<table class="rahmen"><thead><tr><td class="lkopf">'
      + e2(kopf) + '</td></tr></thead><tfoot><tr><td class="lfuss">'
      + e2(fuss) + '</td></tr></tfoot><tbody><tr><td class="lsatz">'
      + String(inhalt == null ? "" : inhalt) + "</td></tr></tbody></table>";
  }

  /* ------------------------------------------------------------------ *
   * 3  Deckblattfelder
   * ------------------------------------------------------------------ *
   * Reihenfolge ist festgelegt: erst was es ist, dann wo, dann für wen,
   * dann wann, dann von wem, zuletzt in welcher Fassung. Leere Felder
   * fallen weg, damit auf dem Deckblatt keine Lücken stehen. */
  const DECKFOLGE = [
    ["gegenstand", "Gegenstand"],
    ["objekt", "Objekt"],
    ["baujahr", "Baujahr"],
    ["anschrift", "Anschrift"],
    ["auftraggeber", "Auftraggeber"],
    ["projektnr", "Projektnummer"],
    ["grundlage", "Berechnungsgrundlage"],
    ["zustand", "Baulicher Zustand"],
    ["klima", "Norm-Außentemperatur"],
    ["stand", "Stand"],
    ["ersteller", "Erstellt von"],
    ["fassung", "Fassung"],
  ];

  function deckblattFelder(daten) {
    const d = daten || {};
    const aus = [];
    for (let i = 0; i < DECKFOLGE.length; i++) {
      const s = DECKFOLGE[i][0];
      const w = d[s];
      if (w == null) continue;
      const t = String(w).trim();
      if (!t) continue;
      aus.push({ schluessel: s, bez: DECKFOLGE[i][1], wert: t });
    }
    return aus;
  }

  /** Fassungsangabe. Ein nicht freigegebener Bericht heißt Entwurf, und zwar
   *  ausgeschrieben, nicht nur als blasses Wasserzeichen. */
  function fassung(freigegeben, stand) {
    const s = String(stand == null ? "" : stand).trim();
    if (freigegeben) return s ? "Freigegeben am " + s : "Freigegeben";
    return s ? "Entwurf vom " + s : "Entwurf";
  }

  /* ------------------------------------------------------------------ *
   * 3a  Unterschriftsblock
   * ------------------------------------------------------------------ *
   * Ein Bericht, der abgenommen werden soll, endet mit einer Unterschrift.
   * Vorher stand auf der letzten Seite nur "erstellt mit dem WERK.E
   * Heizlast-Werkzeug": kein Unterzeichner, kein Ansprechpartner, vier
   * Fünftel leeres Papier. Für die Abnahme gehören Ort, Datum, Unterschrift,
   * Name mit Funktion und die Nummer in der Energieeffizienz-Expertenliste
   * dazu.
   *
   * Was nicht im Projekt steht, wird hier nicht erfunden. Fehlt die
   * Listennummer, entsteht eine Schreiblinie zum Eintragen von Hand statt
   * einer Zahl, die niemand geprüft hat. Fehlt der Name, bleibt auch dort
   * eine Linie.
   *
   * @param d {ort, datum, name, funktion, eee, firma, kontakt}
   */
  function unterschriftsblock(d) {
    const x = d || {};
    const linie = function (beschriftung, wert) {
      return '<div class="ubfeld"><div class="ublinie">'
        + (wert ? e2(wert) : "&nbsp;") + "</div>"
        + '<div class="ubbez">' + e2(beschriftung) + "</div></div>";
    };
    let h = '<div class="unterschrift">';
    h += '<div class="ubort">' + e2([x.ort, x.datum ? "den " + x.datum : ""]
      .filter(Boolean).join(", ")) + "</div>";
    h += '<div class="ubreihe">'
      + linie("Unterschrift", "")
      + linie(x.funktion ? "Name und Funktion" : "Name",
        [x.name, x.funktion].filter(Boolean).join(", "))
      + "</div>";
    /* Die Listennummer bekommt eine halbe Zeile. Über die volle Breite sieht
       eine Schreiblinie für sechs Ziffern aus wie ein vergessenes Feld. */
    h += '<div class="ubreihe">'
      + linie("Nummer in der Energieeffizienz-Expertenliste", x.eee)
      + '<div class="ubfeld"></div>'
      + "</div>";
    if (x.firma || x.kontakt) {
      h += '<div class="ubfirma">' + e2([x.firma, x.kontakt].filter(Boolean).join(" · "))
        + "</div>";
    }
    return h + "</div>";
  }

  /* ------------------------------------------------------------------ *
   * 4  Inhaltsverzeichnis
   * ------------------------------------------------------------------ */
  function verzeichnis(eintraege) {
    const a = (eintraege || []).filter(function (x) { return x && x.titel; });
    if (!a.length) return "";
    let h = '<nav class="ivz" aria-label="Inhalt">';
    for (let i = 0; i < a.length; i++) {
      const nr = a[i].nr == null ? "" : String(a[i].nr);
      const id = a[i].id ? String(a[i].id) : "";
      const zeile = '<span class="ivznr">' + e2(nr) + '</span>'
        + '<span class="ivzt">' + e2(a[i].titel) + "</span>";
      h += '<div class="ivzz">'
        + (id ? '<a href="#' + e2(id) + '">' + zeile + "</a>" : zeile)
        + "</div>";
    }
    return h + "</nav>";
  }

  /* ------------------------------------------------------------------ *
   * 4a  Seitenregel
   * ------------------------------------------------------------------ *
   * Die @page-Regel steht hier, weil der Word-Export sie austauschen muss.
   * Sie enthält verschachtelte Klammern (das Randfeld für die Seitenzahl);
   * ein Austausch per Regulärausdruck über "@page{...}" würde an der ersten
   * inneren Klammer abschneiden und die Formatvorlage zerlegen. Deshalb
   * liefert diese Funktion den ganzen Block als ein Stück. */
  function seitenregel(art) {
    if (art === "word") {
      /* Word kennt keine Randfelder und keine Seitenzahl aus counter().
       * Kopf- und Fußzeile trägt dort die Rahmentabelle. */
      return "@page{size:21cm 29.7cm;margin:2.2cm 2.2cm 2cm}";
    }
    return '@page{size:A4;margin:16mm 22mm 15mm;'
      + '@bottom-right{content:"Seite " counter(page) " von " counter(pages);'
      + "font-family:Calibri,'Segoe UI',sans-serif;font-size:8pt;color:#7A807C;"
      + "vertical-align:top}}"
      + '@page :first{@bottom-right{content:""}}';
  }

  /** Kennzahl für den Spiegel in Kapitel 1: große Zahl, kleine Einheit,
   *  darunter die Beschriftung. Ohne Farbfläche, ohne Symbol. */
  /* ZWISCHEN ZAHL UND EINHEIT GEHOERT EIN LEERZEICHEN. Ohne eines stand in
     der internen Fassung "15,85kW" und "38,3W/m²" (Prueflauf P2211,
     26.08.2026) — die Einheit klebte an der Zahl, weil zu diesen Klassen
     gar keine Regel existiert, die den Abstand herstellt. Genommen wird das
     GESCHUETZTE Leerzeichen: Zahl und Einheit duerfen nicht auf zwei
     Zeilen fallen. */
  function kennzahl(wert, einheit, bez, hinweis) {
    return '<div class="kz"><div class="kzw">' + e2(wert)
      + (einheit ? "&nbsp;" + '<span class="kze">' + e2(einheit) + "</span>" : "")
      + '</div><div class="kzb">' + e2(bez) + "</div>"
      + (hinweis ? '<div class="kzh">' + e2(hinweis) + "</div>" : "") + "</div>";
  }

  function kennzahlreihe(liste) {
    const a = (liste || []).filter(Boolean);
    if (!a.length) return "";
    return '<div class="kzreihe kzn' + a.length + '">'
      + a.map(function (k) {
        return kennzahl(k.wert, k.einheit, k.bez, k.hinweis);
      }).join("") + "</div>";
  }

  /* ------------------------------------------------------------------ *
   * 5  Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const fh = [];
    let n = 0;
    function ist(name, a, b) {
      n++;
      if (a !== b) fh.push(name + ": ist " + JSON.stringify(a)
        + ", soll " + JSON.stringify(b));
    }
    function wahr(name, x) { n++; if (!x) fh.push(name + ": nicht erfüllt"); }

    /* --- Kopfzeilen nachziehen ------------------------------------- */
    ist("T1 einfache Kopfzeile",
      kopfzeilenEinziehen("<table><tr><th>A</th><th>B</th></tr>"
        + "<tr><td>1</td><td>2</td></tr></table>"),
      "<table><thead><tr><th>A</th><th>B</th></tr></thead>"
      + "<tr><td>1</td><td>2</td></tr></table>");

    ist("T2 vorhandenes thead bleibt",
      kopfzeilenEinziehen("<table><thead><tr><th>A</th></tr></thead>"
        + "<tr><td>1</td></tr></table>"),
      "<table><thead><tr><th>A</th></tr></thead><tr><td>1</td></tr></table>");

    ist("T3 Tabelle ohne Kopfzeile bleibt",
      kopfzeilenEinziehen("<table><tr><td>1</td></tr></table>"),
      "<table><tr><td>1</td></tr></table>");

    ist("T4 gemischte Zeile bleibt",
      kopfzeilenEinziehen("<table><tr><th>A</th><td>1</td></tr></table>"),
      "<table><tr><th>A</th><td>1</td></tr></table>");

    ist("T5 zwei Tabellen nacheinander",
      kopfzeilenEinziehen("<p>x</p><table><tr><th>A</th></tr></table>"
        + "<table><tr><th>B</th></tr></table>"),
      "<p>x</p><table><thead><tr><th>A</th></tr></thead></table>"
      + "<table><thead><tr><th>B</th></tr></thead></table>");

    ist("T6 Text ohne Tabelle bleibt", kopfzeilenEinziehen("<p>nur Text</p>"),
      "<p>nur Text</p>");

    ist("T7 Tabelle mit Attributen",
      kopfzeilenEinziehen('<table class="x"><tr><th style="width:40%">A</th>'
        + "</tr></table>"),
      '<table class="x"><thead><tr><th style="width:40%">A</th></tr></thead>'
      + "</table>");

    /* Jede erzeugte Kopfzeile muss genau einmal vorkommen. */
    const viele = kopfzeilenEinziehen(
      "<table><tr><th>A</th></tr><tr><td>1</td></tr></table>"
      + "<table><tr><th>C</th></tr><tr><td>3</td></tr></table>");
    ist("T8 kein doppeltes thead", (viele.match(/<thead>/g) || []).length, 2);
    ist("T9 alle Zellen erhalten", (viele.match(/<t[hd]>/g) || []).length, 4);

    /* --- Rahmen ------------------------------------------------------ */
    const r = rahmen("Kopf", "Fuß", "<p>Inhalt</p>");
    wahr("T10 Rahmen hat thead", r.indexOf("<thead>") >= 0);
    wahr("T11 Rahmen hat tfoot", r.indexOf("<tfoot>") >= 0);
    wahr("T12 Fuß steht vor dem Inhalt", r.indexOf("<tfoot>") < r.indexOf("<tbody>"));
    wahr("T13 Inhalt unverändert", r.indexOf("<p>Inhalt</p>") >= 0);
    wahr("T14 Kopftext maskiert",
      rahmen("a<b>", "", "").indexOf("a&lt;b&gt;") >= 0);

    /* --- Deckblattfelder --------------------------------------------- */
    const df = deckblattFelder({ gegenstand: "Norm-Heizlast", objekt: "",
      auftraggeber: "  ", stand: "13.08.2026", fassung: "Entwurf" });
    ist("T15 leere Felder fallen weg", df.length, 3);
    ist("T16 Reihenfolge Gegenstand zuerst", df[0].schluessel, "gegenstand");
    ist("T17 Fassung zuletzt", df[df.length - 1].schluessel, "fassung");
    ist("T18 Beschriftung Stand", df[1].bez, "Stand");
    ist("T19 kein Feld ohne Daten", deckblattFelder(null).length, 0);
    ist("T20 Wert getrimmt",
      deckblattFelder({ objekt: "  Haus  " })[0].wert, "Haus");

    ist("T15b Baujahr steht direkt hinter Objekt",
      deckblattFelder({ objekt: "Doppelhaushälfte", baujahr: "1936" })[1].bez,
      "Baujahr");

    /* --- Unterschriftsblock -------------------------------------------- */
    const ub = unterschriftsblock({ ort: "Paderborn", datum: "13.08.2026",
      name: "M. Muster", funktion: "Energieberater", eee: "123456",
      firma: "WERK.E", kontakt: "05251 40 29 29 1" });
    wahr("T43 Ort und Datum", ub.indexOf("Paderborn, den 13.08.2026") >= 0);
    wahr("T44 Name und Funktion", ub.indexOf("M. Muster, Energieberater") >= 0);
    wahr("T45 Listennummer", ub.indexOf("123456") >= 0);
    wahr("T46 Unterschriftslinie beschriftet", ub.indexOf("Unterschrift") >= 0);
    ist("T47 drei Schreiblinien", (ub.match(/ublinie/g) || []).length, 3);
    ist("T47b Listennummer über eine halbe Zeile",
      (ub.match(/ubfeld/g) || []).length, 4);
    const ub2 = unterschriftsblock({ ort: "Paderborn", datum: "13.08.2026" });
    wahr("T48 ohne Nummer keine erfundene Nummer", !/\d{3,}/.test(
      ub2.replace("13.08.2026", "")));
    wahr("T49 Beschriftung bleibt auch leer stehen",
      ub2.indexOf("Energieeffizienz-Expertenliste") >= 0);
    wahr("T50 leerer Block kein Absturz", unterschriftsblock(null).length > 0);

    /* --- Fassung ------------------------------------------------------ */
    ist("T21 Entwurf mit Datum", fassung(false, "13.08.2026"),
      "Entwurf vom 13.08.2026");
    ist("T22 Entwurf ohne Datum", fassung(false, ""), "Entwurf");
    ist("T23 freigegeben", fassung(true, "13.08.2026"),
      "Freigegeben am 13.08.2026");

    /* --- Verzeichnis -------------------------------------------------- */
    const v = verzeichnis([{ nr: "1", titel: "Ergebnis", id: "kap1" },
                           { nr: "", titel: "Anlage 1", id: "anl1" }]);
    ist("T24 zwei Zeilen", (v.match(/class="ivzz"/g) || []).length, 2);
    wahr("T25 Sprungmarke gesetzt", v.indexOf('href="#kap1"') >= 0);
    wahr("T26 Titel im Verzeichnis", v.indexOf("Ergebnis") >= 0);
    ist("T27 leeres Verzeichnis", verzeichnis([]), "");
    ist("T28 Eintrag ohne Titel fällt weg",
      (verzeichnis([{ nr: "1", titel: "" }]).match(/ivzz/g) || []).length, 0);
    wahr("T29 ohne Sprungmarke kein a-Element",
      verzeichnis([{ nr: "1", titel: "X" }]).indexOf("<a ") < 0);

    /* --- Seitenregel ---------------------------------------------------- */
    const sr = seitenregel("druck"), sw = seitenregel("word");
    function klammernAusgeglichen(x) {
      let t = 0;
      for (let i = 0; i < x.length; i++) {
        if (x[i] === "{") t++;
        else if (x[i] === "}") { t--; if (t < 0) return false; }
      }
      return t === 0;
    }
    wahr("T35 Druckregel hat Seitenzähler", sr.indexOf("counter(page)") >= 0);
    wahr("T36 Druckregel hat Gesamtzahl", sr.indexOf("counter(pages)") >= 0);
    wahr("T37 Deckblatt ohne Seitenzahl", sr.indexOf('@page :first') >= 0);
    wahr("T38 Druckregel geklammert", klammernAusgeglichen(sr));
    wahr("T39 Word ohne Seitenzähler", sw.indexOf("counter(") < 0);
    wahr("T40 Word geklammert", klammernAusgeglichen(sw));
    wahr("T41 Word setzt Seitenformat", sw.indexOf("21cm 29.7cm") >= 0);
    /* Der Austausch im Word-Export muss die ganze Regel treffen. */
    ist("T42 Regel restlos austauschbar",
      (sr + "#dok{color:#000}").split(sr).join(sw), sw + "#dok{color:#000}");

    /* --- Kennzahlen ---------------------------------------------------- */
    const kr = kennzahlreihe([{ wert: "9,04", einheit: "kW", bez: "Heizlast" },
                              { wert: "56,5", einheit: "W/m²", bez: "spezifisch" }]);
    ist("T30 zwei Kennzahlen", (kr.match(/class="kz"/g) || []).length, 2);
    wahr("T31 Spaltenzahl im Klassennamen", kr.indexOf("kzn2") >= 0);
    ist("T32 leere Reihe", kennzahlreihe([]), "");
    wahr("T33 Hinweis nur wenn vorhanden",
      kennzahl("1", "kW", "B", "").indexOf("kzh") < 0);
    wahr("T30b Zahl und Einheit stehen nicht aneinandergeklebt",
      kennzahl("15,85", "kW", "Heizlast", "").indexOf("15,85&nbsp;") >= 0);
    wahr("T34 Einheit maskiert",
      kennzahl("1", "m<sup>", "B").indexOf("m&lt;sup&gt;") >= 0);

    return { ok: fh.length === 0, anzahl: n, fehler: fh };
  }

  const API = {
    kopfzeilenEinziehen: kopfzeilenEinziehen,
    rahmen: rahmen,
    seitenregel: seitenregel,
    deckblattFelder: deckblattFelder,
    unterschriftsblock: unterschriftsblock,
    fassung: fassung,
    verzeichnis: verzeichnis,
    kennzahl: kennzahl,
    kennzahlreihe: kennzahlreihe,
    selbsttest: selbsttest,
  };
  if (typeof window !== "undefined") window.MODUL_BERICHTSATZ = API;
  if (typeof module !== "undefined") module.exports = API;
})();
