/* ===========================================================================
 * kern_huellendeckung.js — Deckt das Raumbuch die Gebäudehülle ab?
 * ===========================================================================
 *
 * ZWEI FRAGEN, EIN GEDANKE. Beide fragen nicht, ob eine Zahl stimmt, sondern
 * ob überhaupt eine dasteht — und beide fallen an keiner Zahl auf, weil eine
 * fehlende Fläche kein falsches Ergebnis erzeugt, sondern ein zu kleines.
 *
 *   nach unten   Liegt unter jedem beheizten Raum entweder ein beheizter Raum
 *                oder ein Bauteil? Bei einem TEILUNTERKELLERTEN Haus liegt
 *                unter einem Teil des Erdgeschosses der Keller und unter dem
 *                Rest das Erdreich. Das Werkzeug kannte nur den Fall „ganz
 *                oder gar nicht": ein Bauteil nach unten bekam allein das
 *                unterste erfasste Geschoss.
 *   rundum       Deckt die Summe der Außenwände aller Räume eines Geschosses
 *                den Umfang dieses Geschosses ab? Ein Raum, dessen
 *                Außenwandzahl zu niedrig gelesen wurde, verliert seine Wand
 *                aus der Rechnung, und die Raumzeile sieht gefüllt aus.
 *
 * GEMESSEN am Blatt „Werkvertragszeichnung BV 2-0887 Ziolkowski", echter
 * Durchlauf gegen den echten Endpunkt am 23.08.2026:
 *
 *   Die Planauslese gab einen Befund zurück, Konfidenz „sicher":
 *   „Kellergeschoss - unbeheizt/teilunterkellert — Das Gebäude ist nur
 *   teilweise unterkellert; ein Teil der Fläche ist nicht unterkellert."
 *   Im Raumbuch stehen danach KG 39,19 m² (2 Räume) und EG 74,72 m²
 *   (6 Räume). 35,53 m² Erdgeschossboden liegen also auf dem Erdreich und
 *   hatten kein Bauteil. Das Kontrollblatt meldete dazu grün: „Abschluss
 *   nach unten im Randgeschoss · 2 Räume von 2".
 *
 *   Umfang: die zweite Lesung gibt das Kellergeschoss mit 8,00 mal 7,00 m an,
 *   also 30 m Umfang. Die beiden Kellerräume tragen zusammen 13,09 m
 *   Außenwand. 16,9 m Kellerwand sind keinem Raum zugeordnet.
 *
 * DIESES MODUL RECHNET NUR UND ENTSCHEIDET NICHTS ÜBER DEN PLAN. Es bekommt
 * das Raumbuch, die Planbefunde und die Konturen von außen und gibt
 * bezifferte Feststellungen zurück. Wer daraus ein Bauteil macht (app.js)
 * und wer daraus eine Zeile macht (modul_kontrollblatt.js), steht anderswo.
 *
 * KEINE ERFUNDENE ZAHL. Wo die Unterlage nichts hergibt, kommt `unbeziffert`
 * zurück und kein Schätzwert.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_HUELLENDECKUNG = M;
})(this, function () {

  /* Schwellen. Beide sind Auflösungsgrenzen und keine Toleranzen: darunter
     kann das Werkzeug den Fall aus diesen Zahlen nicht mehr von Rundung,
     Treppenauge und Wandstärke unterscheiden. Sie stehen deshalb in jeder
     Zeile, die daraus entsteht. */
  const S = {
    /* Teilunterkellerung: ab welchem Überhang des oberen Geschosses gilt sie
       als aus den Flächen belegt. 2 m² ist die Größe, unter der ein
       Treppenauge oder eine dickere Wand denselben Unterschied macht. */
    FLAECHE_MIN_M2: 2.0,
    FLAECHE_MIN_ANTEIL: 0.05,
    /* Fassadendeckung: ab welcher Lücke zwischen der Summe der Raum-
       außenwände und dem Umfang des Geschosses wird berichtet. Eine kleine
       Lücke entsteht schon dadurch, dass ein Raum als Rechteck gerechnet
       wird; 20 Prozent tut sie nicht mehr. */
    UMFANG_MIN_ANTEIL: 0.20,
    UMFANG_MIN_M: 2.0,
  };

  function zahl(x, ers) {
    const n = Number(x);
    return Number.isFinite(n) ? n : (ers === undefined ? 0 : ers);
  }
  function rnd(x, n) {
    const f = Math.pow(10, n || 0);
    return Math.round(zahl(x) * f) / f;
  }

  /* ------------------------------------------------------------------ *
   * 1  Was sagt die Planauslese über die Unterkellerung?
   * ------------------------------------------------------------------ *
   * Die Befunde der Auslese sind Fließtext. Ein Schema für „unterkellert"
   * gibt es im Endpunkt nicht und soll es auch nicht geben: das Modell
   * schreibt auf, was es sieht, und das ist die Stärke des Feldes.
   * Gelesen wird deshalb hier, und zwar streng:
   *   - das Wort „unterkeller" muss vorkommen,
   *   - dazu eine Einschränkung („teilweise", „nicht", „nur"),
   *   - und die Aussage darf nicht das Gegenteil sagen.
   * Was nicht eindeutig ist, gilt als nicht gefunden. Ein falsch erkannter
   * Befund legt eine Bodenplatte unter ein Geschoss, das keine hat.
   */
  const EINSCHRAENKUNG = /teilweise|teil-?unterkeller|nur\s+(zum\s+teil|teil)|nicht\s+(voll|ganz|komplett|durchgehend)|abschnittsweise|nicht\s+unterkellert|ohne\s+keller|kein\s+keller/i;
  const VOLLSTAENDIG = /(voll(st[äa]ndig)?|komplett|durchgehend|gesamt|ganz)\s+unterkellert/i;

  /** Sucht in den Planbefunden die Aussage zur Teilunterkellerung.
   *  @param befunde  Liste aus p.planbefunde
   *  @returns {gefunden, aussage, herleitung, konfidenz, thema} | null
   */
  function befundUnterkellerung(befunde) {
    const liste = Array.isArray(befunde) ? befunde : [];
    for (let i = 0; i < liste.length; i++) {
      const b = liste[i] || {};
      const t = [b.thema, b.aussage, b.herleitung].map(function (x) {
        return String(x == null ? "" : x);
      }).join(" ");
      if (!/unterkeller/i.test(t)) continue;
      if (!EINSCHRAENKUNG.test(t)) continue;
      /* „vollständig unterkellert, nicht teilunterkellert" wäre beides. Dann
         gilt die ausdrückliche Vollunterkellerung, weil sie die engere und
         die für die Rechnung ungefährlichere Aussage ist. */
      if (VOLLSTAENDIG.test(t) && !/teil|nicht\s+unterkellert/i.test(t)) continue;
      return {
        gefunden: true,
        thema: String(b.thema || "Unterkellerung"),
        aussage: String(b.aussage || ""),
        herleitung: String(b.herleitung || ""),
        konfidenz: String(b.konfidenz || "unsicher"),
      };
    }
    return null;
  }

  /* ====================================================================== *
   * LIEGT UNTER DEM HAUS EIN KELLER? LIEGT ÜBER IHM EIN DACHRAUM?
   * ======================================================================
   * Das Werkzeug legte bis zum 26.08.2026 unter das unterste und über das
   * oberste Geschoss IMMER einen unbeheizten Bereich — es sei denn, das
   * unterste Geschoss war selbst das Kellergeschoss. Beide Bereiche
   * bekommen aus DIN/TS 12831-1 Tabelle 5 eine Temperatur, und die geht in
   * jede angrenzende Fläche ein. Wo es den Bereich nicht gibt, rechnet das
   * Werkzeug damit gegen eine erfundene Zone.
   *
   * GEMESSEN am Blatt „Bauantrag Soethe 1312.2021.pdf" (echter Lauf
   * 26.08.2026): die Planauslese gab einen Befund mit Konfidenz „sicher"
   * zurück — Thema „Kellergeschoss", Aussage „Kein Keller vorhanden",
   * Herleitung „Der Schnitt zeigt unterhalb ±0.00 nur ein flaches
   * Fundament/Bodenplatte bis -0.37 bzw. -0.22". Das Werkzeug legte
   * trotzdem die Zone „Unbeheizter Keller" (4,7 °C) an und rechnete über
   * alle sieben Erdgeschossräume 74,83 m² Kellerdecke dagegen: 424 W oder
   * 6,4 Prozent der Heizlast gegen einen Keller, den der Schnitt ausschließt.
   * Derselbe Fall am Blattsatz „P2211 Baugenehmigung Grundrisse": Keller
   * UND Dachraum angelegt, obwohl der Schnitt Bodenplatte auf Erdreich und
   * ein Flachdach zeigt.
   *
   * DIESES MODUL ENTSCHEIDET NICHTS, es liest nur die Befunde der Auslese
   * und gibt zurück, was dort steht — mit der Konfidenz, die daran hängt.
   * Was daraus wird, entscheidet app.js: nur ein Befund mit Konfidenz
   * „sicher" ändert das Bauteil, alles Schwächere bleibt eine benannte
   * Annahme. Erfunden wird nichts; ohne Befund kommt null zurück.
   * ====================================================================== */

  /* „Kein Keller" — aber nur, wenn nicht im selben Atemzug von einem TEIL
     die Rede ist. „Der hintere Gebäudeteil ist nicht unterkellert" ist eine
     Teilunterkellerung (dafür gibt es befundUnterkellerung oben) und nicht
     die Aussage, dass es keinen Keller gibt. */
  const OHNE_KELLER = /(kein[a-zä]*\s+(keller|unterkellerung)|nicht\s+unterkellert|ohne\s+keller|nicht\s+unterkellertes)/i;
  /* WORTE, DIE VON EINEM TEIL SPRECHEN. Sie müssen eng gefasst sein: ein
     „nur ein flaches Fundament" im Schnittbefund ist keine Teilaussage über
     die Unterkellerung. Gemessen: mit dem weiteren Muster fiel der Soethe-
     Befund „Kein Keller vorhanden" durch, weil seine Herleitung „nur ein
     flaches Fundament" enthält. */
  const NUR_EIN_TEIL = /(teilweise|teils\b|teil-?\s?unterkeller|zum\s+teil|abschnittsweise|(vordere|hintere)\s+(haus|geb[äa]ude)|nur\s+(ca\.?\s*)?(die|der|das)\s+(\w+\s+){0,2}(h[äa]lfte|teil|bereich|seite))/i;
  const MIT_KELLER = /(unterkellert|kellergeschoss|kellerraum|kellerr[äa]ume)/i;
  const FLACHDACH = /(flachdach|flaches\s+dach|dach\s+als\s+flachdach)/i;
  const MIT_DACHRAUM = /(spitzboden|dachboden|dachraum|nicht\s+ausgebaute[rs]?\s+dach)/i;
  const RANG_KONFIDENZ = { sicher: 3, unsicher: 2, geraten: 1 };

  function befundText(b) {
    return [b && b.thema, b && b.aussage, b && b.herleitung]
      .map(function (x) { return String(x == null ? "" : x); }).join(" ");
  }
  function konfidenzRang(k) {
    return RANG_KONFIDENZ[String(k || "").toLowerCase()] || 1;
  }
  /** Der stärkste Befund gewinnt; bei gleicher Konfidenz der, der einen
   *  Bereich BEHAUPTET — er ist die Aussage, die das Werkzeug ohnehin schon
   *  unterstellt, und sie umzustoßen verlangt den besseren Beleg. */
  function staerker(a, b) {
    if (!a) return b;
    if (!b) return a;
    const ra = konfidenzRang(a.konfidenz), rb = konfidenzRang(b.konfidenz);
    if (ra !== rb) return ra > rb ? a : b;
    if (a.art !== b.art) return (a.art === "kein_keller" || a.art === "flachdach") ? b : a;
    return a;
  }

  /** Sagt die Unterlage, ob unter dem Haus ein Keller liegt?
   *  @returns {art:"kein_keller"|"keller", konfidenz, thema, aussage,
   *            herleitung, wortlaut} | null */
  function kellerAussage(befunde) {
    const liste = Array.isArray(befunde) ? befunde : [];
    let beste = null;
    for (let i = 0; i < liste.length; i++) {
      const b = liste[i] || {};
      const t = befundText(b);
      if (!/keller|unterkeller/i.test(t)) continue;
      let art = null;
      if (OHNE_KELLER.test(t) && !NUR_EIN_TEIL.test(t)) art = "kein_keller";
      else if (MIT_KELLER.test(t) && !OHNE_KELLER.test(t)) art = "keller";
      if (!art) continue;
      beste = staerker(beste, {
        art: art, konfidenz: String(b.konfidenz || "geraten"),
        thema: String(b.thema || ""), aussage: String(b.aussage || ""),
        herleitung: String(b.herleitung || ""),
        wortlaut: String(b.thema || "") + ": " + String(b.aussage || ""),
      });
    }
    return beste;
  }

  /** Sagt die Unterlage, ob über dem obersten Geschoss ein unbeheizter
   *  Dachraum liegt — oder ein Flachdach ohne jeden Dachraum? */
  function dachAussage(befunde) {
    const liste = Array.isArray(befunde) ? befunde : [];
    let beste = null;
    for (let i = 0; i < liste.length; i++) {
      const b = liste[i] || {};
      const t = befundText(b);
      if (!/dach|spitzboden/i.test(t)) continue;
      let art = null;
      if (FLACHDACH.test(t) && !MIT_DACHRAUM.test(t)) art = "flachdach";
      else if (MIT_DACHRAUM.test(t)) art = "dachraum";
      if (!art) continue;
      beste = staerker(beste, {
        art: art, konfidenz: String(b.konfidenz || "geraten"),
        thema: String(b.thema || ""), aussage: String(b.aussage || ""),
        herleitung: String(b.herleitung || ""),
        wortlaut: String(b.thema || "") + ": " + String(b.aussage || ""),
      });
    }
    return beste;
  }

  /** Welche Räume nennt ein Befundtext beim Namen?
   *  Nur Namen ab drei Zeichen, damit „WC" nicht in „SCHWCH" trifft und ein
   *  Kürzel nicht zufällig in einem Wort steckt. Verglichen wird ohne
   *  Rücksicht auf Groß- und Kleinschreibung, mit Wortgrenzen.
   */
  function genannteRaeume(text, raeume) {
    const t = String(text || "");
    if (!t) return [];
    const raus = [];
    (raeume || []).forEach(function (r) {
      const n = String((r && r.name) || "").trim();
      if (n.length < 3) return;
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp("(^|[^A-Za-zÄÖÜäöüß])" + esc + "([^A-Za-zÄÖÜäöüß]|$)", "i").test(t)) {
        raus.push(r);
      }
    });
    return raus;
  }

  /* ------------------------------------------------------------------ *
   * 2  Die Flächenprobe: trägt das unterste Geschoss das darüber?
   * ------------------------------------------------------------------ */

  /** Gruppiert die Räume nach Geschoss und sortiert von unten nach oben.
   *  @param rangVon  Funktion Geschossname -> Rang (KERN_ZUORDNUNG.rangVon).
   *                  Sie wird übergeben und nicht nachgebaut; zwei Listen
   *                  von Geschossnamen wären zwei Wahrheiten.
   */
  function geschossstapel(raeume, rangVon) {
    const nach = {};
    (raeume || []).forEach(function (r) {
      const g = String((r && r.geschoss) || "").trim();
      if (!g) return;
      if (!nach[g]) nach[g] = { name: g, raeume: [], A: 0 };
      nach[g].raeume.push(r);
      nach[g].A = rnd(nach[g].A + zahl(r.A, 0), 2);
    });
    const liste = Object.keys(nach).map(function (k) { return nach[k]; });
    if (typeof rangVon === "function") {
      liste.sort(function (a, b) { return rangVon(a.name) - rangVon(b.name); });
    }
    return liste;
  }

  /* ------------------------------------------------------------------ *
   * 3  Welche Räume stehen auf dem Erdreich?
   * ------------------------------------------------------------------ */

  /** Beurteilt, ob über dem untersten erfassten Geschoss Fläche liegt, die
   *  dieses Geschoss nicht trägt — der teilunterkellerte Fall.
   *
   *  @param o.raeume       Raumbuch
   *  @param o.rangVon      KERN_ZUORDNUNG.rangVon
   *  @param o.planbefunde  p.planbefunde
   *  @param o.untenIstKeller  Begründung des Aufrufers, warum das unterste
   *                        Geschoss ein Kellergeschoss ist, sonst null.
   *                        Ohne Keller darunter gibt es keine
   *                        Teilunterkellerung, sondern nur ein Geschoss.
   *  @returns null oder
   *    { gilt, geschoss, unten, A_unten, A_geschoss, A_erdreich, anteil,
   *      unbeziffert, benannt, raeume:[{raum, A_boden, ganz}],
   *      quellen:[…], befund }
   */
  function aufErdreich(o) {
    const opt = o || {};
    const stapel = geschossstapel(opt.raeume, opt.rangVon);
    if (stapel.length < 2) return null;
    if (!opt.untenIstKeller) return null;

    const unten = stapel[0];
    const drueber = stapel[1];
    if (!(drueber.A > 0)) return null;

    const befund = befundUnterkellerung(opt.planbefunde);
    const ueberhang = rnd(drueber.A - unten.A, 2);
    const schwelle = Math.max(S.FLAECHE_MIN_M2, S.FLAECHE_MIN_ANTEIL * drueber.A);
    const ausFlaeche = ueberhang > schwelle;

    if (!befund && !ausFlaeche) return null;

    const quellen = [];
    if (befund) {
      quellen.push("Planbefund der Auslese, Konfidenz " + befund.konfidenz
        + ": „" + befund.aussage + "“"
        + (befund.herleitung ? " (" + befund.herleitung + ")" : ""));
    }
    if (ausFlaeche) {
      quellen.push("Flächenvergleich aus dem Raumbuch: „" + drueber.name
        + "“ hat " + rnd(drueber.A, 2) + " m², „" + unten.name + "“ darunter nur "
        + rnd(unten.A, 2) + " m²; " + rnd(ueberhang, 2)
        + " m² dieses Geschosses stehen auf keinem erfassten Raum");
    }

    /* OHNE ZAHL KEINE FLÄCHE.
       Sagt der Plan „teilunterkellert", geben die Flächen es aber nicht her,
       dann ist bekannt DASS etwas fehlt und nicht WIE VIEL. Dann entsteht
       hier kein Bauteil, sondern eine Feststellung mit dem Vermerk, dass die
       Menge offen ist. Eine gegriffene Fläche wäre eine erfundene Zahl. */
    if (!ausFlaeche) {
      return { gilt: true, unbeziffert: true, geschoss: drueber.name,
               unten: unten.name, A_unten: unten.A, A_geschoss: drueber.A,
               A_erdreich: null, anteil: null, benannt: false, raeume: [],
               quellen: quellen, befund: befund };
    }

    /* WELCHE Räume stehen darauf?
       Erste Wahl: der Befund nennt sie beim Namen — dann gilt der Plan.
       Zweite Wahl: niemand nennt sie. Dann ist die SUMME belegt und die
       Verteilung nicht. Verteilt wird flächenanteilig über alle Räume des
       Geschosses; die Gebäudeheizlast wird dadurch richtig, die raumweise
       bleibt eine Näherung, und genau das steht am Bauteil und im Blatt.
       Die Gegenrechnung dazu: null Quadratmeter anzusetzen ist nicht die
       vorsichtige Wahl, sondern die sicher falsche. */
    const genannt = befund
      ? genannteRaeume(befund.thema + " " + befund.aussage + " " + befund.herleitung,
                       drueber.raeume)
      : [];
    const summeGenannt = genannt.reduce(function (s, r) { return s + zahl(r.A, 0); }, 0);
    if (genannt.length && summeGenannt > 0) {
      return {
        gilt: true, unbeziffert: false, geschoss: drueber.name, unten: unten.name,
        A_unten: unten.A, A_geschoss: drueber.A,
        A_erdreich: rnd(summeGenannt, 2), anteil: null, benannt: true,
        raeume: genannt.map(function (r) {
          return { raum: r, A_boden: rnd(zahl(r.A, 0), 2), ganz: true };
        }),
        ueberhang: ueberhang,
        quellen: quellen.concat(["im Befund namentlich genannt: "
          + genannt.map(function (r) { return r.name; }).join(", ")]),
        befund: befund,
      };
    }

    const anteil = ueberhang / drueber.A;
    return {
      gilt: true, unbeziffert: false, geschoss: drueber.name, unten: unten.name,
      A_unten: unten.A, A_geschoss: drueber.A, A_erdreich: ueberhang,
      anteil: anteil, benannt: false,
      raeume: drueber.raeume.filter(function (r) { return zahl(r.A, 0) > 0; })
        .map(function (r) {
          return { raum: r, A_boden: rnd(zahl(r.A, 0) * anteil, 2), ganz: false };
        }),
      ueberhang: ueberhang,
      quellen: quellen,
      befund: befund,
    };
  }

  /* ------------------------------------------------------------------ *
   * 4  Deckt das Raumbuch den Umfang des Geschosses ab?
   * ------------------------------------------------------------------ *
   * DIE EINZIGE UNABHÄNGIGE PROBE AUF DIE LAGE EINES RAUMES.
   *
   * Ob ein Raum innen liegt, entscheidet das Werkzeug heute an einer
   * einzigen Zahl: `aussenwaende` aus einer Lesung des Modells. Ist sie
   * null, gilt der Raum als innenliegend, seine Wandfläche fällt aus der
   * Rechnung, und das Kontrollblatt schreibt „grenzt in der Fläche rundum an
   * beheizte Räume". Das ist eine Behauptung über den Grundriss, die aus
   * einer einzigen Ablesung stammt.
   *
   * Gegen dieselbe Frage steht eine zweite, von ihr unabhängige Größe: der
   * UMFANG des Geschosses aus der äußersten Maßkette. Die Außenwände aller
   * Räume eines Geschosses müssen ihn zusammen ergeben. Bleiben sie deutlich
   * darunter, ist Fassade da, die keinem Raum gehört — und genau so sieht
   * ein zu niedrig gelesenes `aussenwaende` aus.
   *
   * Die Probe sagt WIE VIEL fehlt, nicht WO. Das ist ihre Grenze und steht
   * in der Zeile, die daraus entsteht.
   */

  /** Außenwandlänge eines Raums aus seinen Bauteilen.
   *  Wand, Fenster und Tür liegen in derselben Wand; das Fenster hat der
   *  Wand ihre Fläche abgenommen (KERN_ZUORDNUNG.bauteileFuerRaum), also
   *  zählen alle drei zusammen. Geteilt wird durch die Raumhöhe.
   */
  function wandlaenge(raum) {
    const r = raum || {};
    const h = zahl(r.h, 0);
    if (!(h > 0)) return null;
    let A = 0, hat = false;
    (r.bauteile || []).forEach(function (b) {
      const art = String((b && b.art) || "");
      const t = String((b && b.grenzt_an && b.grenzt_an.typ) || "");
      if (art === "aussenwand" || art === "fenster" || art === "tuer") {
        A += zahl(b.A, 0); hat = true; return;
      }
      /* Ältere Bauteile ohne `art`: über den Namen, aber nur senkrechte.
         Eine Bodenplatte gegen Erdreich darf hier nicht mitzählen. */
      if (!art && /wand|fenster|t[üu]r/i.test(String(b.name || ""))
          && (t === "aussen" || t === "erdreich")) {
        A += zahl(b.A, 0); hat = true;
      }
    });
    return hat ? A / h : 0;
  }

  /** @param o.raeume   Raumbuch
   *  @param o.kontur   Funktion Geschossname -> {A, U, quelle} oder null
   *  @param o.rangVon  KERN_ZUORDNUNG.rangVon (nur für die Reihenfolge)
   *  @returns Liste je Geschoss: {geschoss, U, laenge, fehlend, anteil,
   *                               quelle, raeume_ohne_wand:[…]}
   *           Geschosse ohne belegten Umfang kommen NICHT vor.
   */
  function fassadendeckung(o) {
    const opt = o || {};
    const stapel = geschossstapel(opt.raeume, opt.rangVon);
    const raus = [];
    stapel.forEach(function (g) {
      const k = typeof opt.kontur === "function" ? opt.kontur(g.name) : null;
      const U = k ? zahl(k.U, 0) : 0;
      if (!(U > 0)) return;
      let laenge = 0, unbestimmt = 0;
      const ohne = [];
      g.raeume.forEach(function (r) {
        const L = wandlaenge(r);
        if (L === null) { unbestimmt++; return; }
        laenge += L;
        if (!(L > 0)) ohne.push(r);
      });
      if (unbestimmt) return;          // ohne Raumhöhe keine Länge, keine Probe
      const fehlend = rnd(U - laenge, 2);
      raus.push({
        geschoss: g.name, U: rnd(U, 2), laenge: rnd(laenge, 2),
        fehlend: fehlend, anteil: fehlend / U,
        auffaellig: fehlend > S.UMFANG_MIN_M && fehlend / U > S.UMFANG_MIN_ANTEIL,
        quelle: (k && k.quelle) || "Außenkontur",
        raeume_ohne_wand: ohne,
      });
    });
    return raus;
  }

  /* ------------------------------------------------------------------ *
   * 5  Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    const rang = function (g) {
      const m = { KG: -1, EG: 0, OG: 1, DG: 2 };
      return m[String(g).toUpperCase()] === undefined ? 5 : m[String(g).toUpperCase()];
    };
    const raum = function (g, n, A, h, bt) {
      return { id: g + "_" + n, geschoss: g, name: n, A: A, h: h || 2.5,
               bauteile: bt || [] };
    };

    /* --- Befundtext lesen -------------------------------------------- */
    const echt = [{ thema: "Kellergeschoss - unbeheizt/teilunterkellert",
      aussage: "Das Gebäude ist nur teilweise unterkellert; ein Teil der "
        + "Fläche ist nicht unterkellert",
      herleitung: "Vergleich der Außenbemaßung KG und EG", konfidenz: "sicher" }];
    if (!befundUnterkellerung(echt)) {
      f.push("Der echte Befund vom 23.08.2026 muss erkannt werden");
    }
    if (befundUnterkellerung([{ thema: "Keller", aussage: "Das Gebäude ist "
        + "vollständig unterkellert", herleitung: "", konfidenz: "sicher" }])) {
      f.push("„vollständig unterkellert“ darf keine Teilunterkellerung sein");
    }
    if (befundUnterkellerung([{ thema: "Dach", aussage: "25 Grad Neigung",
        herleitung: "", konfidenz: "sicher" }])) {
      f.push("Ein Befund ohne das Wort Keller darf nicht treffen");
    }
    if (!befundUnterkellerung([{ thema: "Keller",
        aussage: "Der südliche Gebäudeteil ist nicht unterkellert",
        herleitung: "", konfidenz: "sicher" }])) {
      f.push("„nicht unterkellert“ muss treffen");
    }

    /* --- Der gemessene Fall: KG 39,19 / EG 74,72 ---------------------- */
    const rs = [raum("KG", "KELLER", 17.99, 2.32), raum("KG", "FLUR", 21.20, 2.32),
      raum("EG", "GAST / ARBEITEN", 12.16, 2.52), raum("EG", "WC", 2.17, 2.52),
      raum("EG", "DIELE", 12.10, 2.52), raum("EG", "KOCHEN", 13.41, 2.52),
      raum("EG", "ESSEN", 16.20, 2.52), raum("EG", "WOHNEN", 18.68, 2.52),
      raum("OG", "SCHLAFEN", 14.35, 2.52)];
    const e = aufErdreich({ raeume: rs, rangVon: rang, planbefunde: echt,
                            untenIstKeller: "Kürzel des untersten Geschosses" });
    if (!e || !e.gilt) {
      f.push("Der teilunterkellerte Fall muss erkannt werden");
    } else {
      if (e.geschoss !== "EG") f.push("Betroffen ist das EG, gemeldet: " + e.geschoss);
      if (Math.abs(e.A_erdreich - 35.53) > 0.02) {
        f.push("Die Fläche auf dem Erdreich ist 35,53 m², gerechnet: " + e.A_erdreich);
      }
      const summe = e.raeume.reduce(function (s, x) { return s + x.A_boden; }, 0);
      if (Math.abs(summe - 35.53) > 0.1) {
        f.push("Die verteilten Bodenflächen müssen 35,53 m² ergeben, sind: " + summe);
      }
      if (e.raeume.length !== 6) {
        f.push("Verteilt wird auf die 6 Räume des EG, gemeldet: " + e.raeume.length);
      }
      if (e.raeume.some(function (x) { return x.raum.geschoss !== "EG"; })) {
        f.push("Es darf kein Raum eines anderen Geschosses eine Bodenplatte bekommen");
      }
    }

    /* --- Ohne Keller darunter gibt es keine Teilunterkellerung -------- */
    if (aufErdreich({ raeume: rs, rangVon: rang, planbefunde: echt,
                      untenIstKeller: null })) {
      f.push("Ohne Kellergeschoss darunter darf nichts gemeldet werden");
    }

    /* --- Vollunterkellert: kein Überhang, kein Befund, keine Meldung -- */
    const voll = [raum("KG", "K1", 40, 2.3), raum("EG", "E1", 39, 2.5)];
    if (aufErdreich({ raeume: voll, rangVon: rang, planbefunde: [],
                      untenIstKeller: "KG" })) {
      f.push("Ein vollunterkellertes Haus darf keine Bodenplatte im EG bekommen");
    }

    /* --- GEGENRICHTUNG: Überhang ohne jeden Planbefund --------------- */
    const nurFlaeche = [raum("KG", "K1", 20, 2.3), raum("EG", "E1", 40, 2.5),
                        raum("EG", "E2", 40, 2.5)];
    const nf = aufErdreich({ raeume: nurFlaeche, rangVon: rang, planbefunde: [],
                             untenIstKeller: "KG" });
    if (!nf || !nf.gilt) {
      f.push("60 m² Überhang müssen auch ohne Planbefund auffallen");
    } else if (Math.abs(nf.A_erdreich - 60) > 0.01) {
      f.push("Der Überhang ist 60 m², gerechnet: " + (nf && nf.A_erdreich));
    }

    /* --- Befund ohne Zahl: unbeziffert, aber gemeldet ---------------- */
    const ub = aufErdreich({ raeume: voll, rangVon: rang, planbefunde: echt,
                             untenIstKeller: "KG" });
    if (!ub || !ub.gilt || !ub.unbeziffert) {
      f.push("Ein Befund ohne Flächenbeleg muss unbeziffert gemeldet werden");
    } else if (ub.raeume.length) {
      f.push("Unbeziffert heißt: kein Bauteil. Es wurden Räume geliefert.");
    }

    /* --- Namentlich genannte Räume gehen vor die Verteilung ---------- */
    const benannt = [{ thema: "Keller", konfidenz: "sicher",
      aussage: "Das Gebäude ist nur teilweise unterkellert; der Bereich "
        + "WOHNEN und ESSEN im EG ist nicht unterkellert", herleitung: "" }];
    const bn = aufErdreich({ raeume: rs, rangVon: rang, planbefunde: benannt,
                             untenIstKeller: "KG" });
    if (!bn || !bn.benannt) {
      f.push("Namentlich genannte Räume müssen erkannt werden");
    } else {
      const namen = bn.raeume.map(function (x) { return x.raum.name; }).sort().join("|");
      if (namen !== "ESSEN|WOHNEN") {
        f.push("Genannt sind WOHNEN und ESSEN, erkannt: " + namen);
      }
      if (bn.raeume.some(function (x) { return !x.ganz; })) {
        f.push("Ein namentlich genannter Raum steht ganz auf dem Erdreich");
      }
    }

    /* --- Fassadendeckung: der gemessene Keller ------------------------ */
    const wand = function (A) {
      return { art: "aussenwand", name: "Außenwand", A: A,
               grenzt_an: { typ: "erdreich" } };
    };
    const kg = [raum("KG", "KELLER", 17.99, 2.32, [wand(19.68)]),
                raum("KG", "FLUR", 21.20, 2.32, [wand(10.68)])];
    const fd = fassadendeckung({ raeume: kg, rangVon: rang,
      kontur: function (g) { return g === "KG" ? { A: 56, U: 30, quelle: "Probe" } : null; } });
    if (fd.length !== 1) {
      f.push("Für ein Geschoss mit Umfang muss eine Zeile entstehen");
    } else {
      if (Math.abs(fd[0].laenge - 13.09) > 0.02) {
        f.push("Die Kellerräume tragen 13,09 m Wand, gerechnet: " + fd[0].laenge);
      }
      if (Math.abs(fd[0].fehlend - 16.91) > 0.02) {
        f.push("Es fehlen 16,91 m Umfang, gerechnet: " + fd[0].fehlend);
      }
      if (!fd[0].auffaellig) f.push("16,91 m von 30 m müssen auffallen");
    }

    /* --- GEGENRICHTUNG: ein gedeckter Umfang darf NICHT auffallen ---- */
    const dicht = [raum("EG", "A", 25, 2.5, [wand(25)]),
                   raum("EG", "B", 25, 2.5, [wand(25)])];
    const fd2 = fassadendeckung({ raeume: dicht, rangVon: rang,
      kontur: function () { return { A: 50, U: 20, quelle: "Probe" }; } });
    if (!fd2.length || fd2[0].auffaellig) {
      f.push("20 m Wand auf 20 m Umfang darf nicht auffallen");
    }

    /* --- GEGENRICHTUNG: ein Raum ohne Außenwand macht die Lücke ------ */
    const luecke = [raum("EG", "A", 25, 2.5, [wand(25)]),
                    raum("EG", "WC", 3, 2.5, [])];
    const fd3 = fassadendeckung({ raeume: luecke, rangVon: rang,
      kontur: function () { return { A: 50, U: 20, quelle: "Probe" }; } });
    if (!fd3.length || !fd3[0].auffaellig) {
      f.push("Ein WC ohne Wand an einer Fassade von 20 m muss auffallen");
    } else if (fd3[0].raeume_ohne_wand.length !== 1) {
      f.push("Der Raum ohne Wand muss benannt werden");
    }

    /* --- Ohne Umfang keine Probe, statt einer erfundenen Zahl -------- */
    if (fassadendeckung({ raeume: kg, rangVon: rang,
                          kontur: function () { return null; } }).length) {
      f.push("Ohne Kontur darf keine Fassadenprobe entstehen");
    }
    /* --- Eine Bodenplatte ist keine Wand ----------------------------- */
    const mitBoden = [raum("EG", "A", 25, 2.5,
      [wand(25), { art: "boden", name: "Bodenplatte", A: 25,
                   grenzt_an: { typ: "erdreich" } }])];
    const fd4 = fassadendeckung({ raeume: mitBoden, rangVon: rang,
      kontur: function () { return { A: 25, U: 20, quelle: "Probe" }; } });
    if (!fd4.length || Math.abs(fd4[0].laenge - 10) > 0.01) {
      f.push("Die Bodenplatte darf nicht als Wandlänge zählen, gerechnet: "
        + (fd4[0] && fd4[0].laenge));
    }

    /* --- Keller und Dach aus den Planbefunden ------------------------ */
    /* Der ECHTE Befund vom Blatt „Bauantrag Soethe 1312.2021.pdf". */
    const soethe = [
      { thema: "Kellergeschoss", aussage: "Kein Keller vorhanden",
        herleitung: "Der Schnitt zeigt unterhalb ±0.00 nur ein flaches "
          + "Fundament/Bodenplatte bis -0.37 bzw. -0.22, keine "
          + "Kellergeschoss-Raumausbildung erkennbar.", konfidenz: "sicher" },
      { thema: "Dachneigung", aussage: "Dachneigung ca. 45°",
        herleitung: "symmetrisches Satteldach angenommen", konfidenz: "sicher" },
    ];
    const kS = kellerAussage(soethe);
    if (!kS || kS.art !== "kein_keller" || kS.konfidenz !== "sicher") {
      f.push("Soethe: „Kein Keller vorhanden" + "“ muss als kein_keller/sicher "
        + "ankommen, kam: " + JSON.stringify(kS));
    }
    /* Der ECHTE Befund vom Blatt „BV 2-0887 Ziolkowski": eine
       TEILunterkellerung ist keine Aussage „kein Keller". */
    const zio = [{ thema: "Kellergeschoss teilweise nicht unterkellert",
      aussage: "Nur ca. die vordere Haushälfte (Keller, Flur) ist "
        + "unterkellert; der hintere Gebäudeteil ist lt. Planvermerk "
        + "'NICHT UNTERKELLERT'", herleitung: "", konfidenz: "sicher" }];
    const kZ = kellerAussage(zio);
    if (kZ && kZ.art === "kein_keller") {
      f.push("Ziolkowski: die Teilunterkellerung darf nicht als „kein Keller“ "
        + "gelesen werden");
    }
    /* Der ECHTE Befund vom Blatt „Hasenberg 10": nur vermutet — er darf
       kommen, aber nicht als „sicher". */
    const has = [{ thema: "Unbeheizter Spitzboden/Keller nicht dargestellt",
      aussage: "Es liegt vermutlich kein Keller vor bzw. dieser ist im "
        + "vorliegenden Plan (nur EG) nicht dargestellt",
      herleitung: "Der Plan zeigt ausschließlich das Erdgeschoss",
      konfidenz: "unsicher" }];
    const kH = kellerAussage(has);
    if (!kH || kH.art !== "kein_keller" || kH.konfidenz === "sicher") {
      f.push("Hasenberg: „vermutlich kein Keller“ ist kein_keller, aber nicht "
        + "sicher; kam: " + JSON.stringify(kH));
    }
    if (kellerAussage([]) !== null || kellerAussage(null) !== null) {
      f.push("Ohne Befund darf keine Aussage entstehen");
    }
    const kJa = kellerAussage([{ thema: "Kellergeschoss",
      aussage: "Das Gebäude ist voll unterkellert", konfidenz: "sicher" }]);
    if (!kJa || kJa.art !== "keller") {
      f.push("„voll unterkellert“ muss als keller ankommen");
    }
    const dFlach = dachAussage([{ thema: "Dachform",
      aussage: "Das Gebäude hat ein Flachdach", konfidenz: "sicher" }]);
    if (!dFlach || dFlach.art !== "flachdach") {
      f.push("„Flachdach“ muss als flachdach ankommen");
    }
    const dSpitz = dachAussage([{ thema: "Dachraum",
      aussage: "Über dem OG liegt ein nicht ausgebauter Spitzboden",
      konfidenz: "sicher" }]);
    if (!dSpitz || dSpitz.art !== "dachraum") {
      f.push("„Spitzboden“ muss als dachraum ankommen");
    }
    /* Zwei Befunde, verschiedene Konfidenz: der stärkere gilt. */
    const dGemischt = dachAussage([
      { thema: "Dachform", aussage: "vermutlich Flachdach", konfidenz: "geraten" },
      { thema: "Dachraum", aussage: "nicht ausgebauter Dachboden über dem OG",
        konfidenz: "sicher" }]);
    if (!dGemischt || dGemischt.art !== "dachraum") {
      f.push("Der Befund mit der höheren Konfidenz muss gewinnen");
    }

    return { ok: f.length === 0, fehler: f, anzahl: 33 };
  }

  return {
    befundUnterkellerung: befundUnterkellerung,
    kellerAussage: kellerAussage,
    dachAussage: dachAussage,
    genannteRaeume: genannteRaeume,
    geschossstapel: geschossstapel,
    aufErdreich: aufErdreich,
    wandlaenge: wandlaenge,
    fassadendeckung: fassadendeckung,
    selbsttest: selbsttest,
    SCHWELLEN: S,
  };
});
