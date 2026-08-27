/* ===========================================================================
 * kern_bandbreite.js — Wie unsicher ist ein Ergebnis, das auf Annahmen beruht
 * ===========================================================================
 * WERK.E Energie-Effizienz-Beratung. DOM-frei, ohne Abhängigkeiten, in Node
 * und im Browser lauffähig.
 *
 * WARUM ES DIESES MODUL GIBT
 * Das Werkzeug liefert künftig immer ein Ergebnis, auch wenn nicht jede Größe
 * belegt ist. Ein Punktwert allein wäre dann Scheingenauigkeit: „9,0 kW" sieht
 * gleich aus, ob dahinter zwanzig gemessene oder zwanzig geratene Werte
 * stehen. Dieses Modul beziffert den Unterschied und nennt ihn beim Namen:
 *
 *     9,0 kW, geschätzte Spanne 7,4 bis 11,2 kW
 *
 * Eine schmale Spanne heißt: die Annahmen tragen, das Ergebnis ist verwendbar.
 * Eine breite Spanne heißt: hier muss nachgemessen werden. Und die nach
 * Wirkung sortierte Liste sagt, WAS zuerst. Das ist der eigentliche Nutzen —
 * nicht die Spanne, sondern die Reihenfolge des Nachmessens.
 *
 * WAS DIE SPANNE IST UND WAS NICHT
 * Sie ist die plausible Bandbreite des Ergebnisses unter den getroffenen
 * Annahmen, nicht der schlimmste denkbare Fall. Der schlimmste Fall — jede
 * unabhängige Annahme gleichzeitig und in dieselbe Richtung falsch — ist keine
 * Aussage, mit der jemand einen Wärmeerzeuger auswählt.
 * Nicht enthalten sind außerdem:
 *   - Fehler im Modell selbst (dafür kern_pruefung und die Validierung),
 *   - grobe Schnitzer wie eine übersehene Wand oder ein verrutschter Maßstab
 *     (dafür kern_massstabsprobe und modul_kontrollblatt),
 *   - die Frage, ob ein Bauteil nachträglich gedämmt wurde. Das ist keine
 *     Streuung, sondern ein Ja/Nein. Es wird gesondert als Hinweis gemeldet
 *     und bewusst NICHT in die Spanne eingerührt, weil eine Spanne von 5 bis
 *     25 kW niemandem hilft.
 *
 * VERFAHREN: Zwei-Punkt-Sensitivität je Größe, danach Superposition
 * Für jede unsichere Größe wird die Heizlast zweimal neu gerechnet, einmal am
 * unteren und einmal am oberen Rand ihres plausiblen Bereichs. Kosten:
 * 1 + 2n Läufe des Rechenkerns statt tausender Zufallsläufe.
 *
 * Das ist zulässig, weil die Norm-Heizlast in genau diesen Größen (nahezu)
 * linear ist:
 *     Phi_T = SUM A_k * (U_k + dU_WB) * dTheta      linear in U und in A
 *     Phi_V = 0,34 * V * dTheta                     linear in V
 * Bei einem linearen Modell ist die Zwei-Punkt-Auswertung nicht genähert,
 * sondern exakt; ein Zufallsverfahren würde dieselbe Zahl nur langsamer und
 * mit Rauschen liefern. Nichtlinear sind allein die Bilanz der unbeheizten
 * Zonen (gebrochen rational) und die Umschaltung zwischen Infiltration und
 * Mindestluftwechsel. Beide sind schwach, und genau das prüft die
 * Gegenprobe `gegenprobe()` nach: sie zieht Zufallslagen und vergleicht sie
 * mit der linearen Vorhersage. Weicht sie ab, stimmt die Voraussetzung des
 * Verfahrens nicht mehr und der Selbsttest schlägt an.
 *
 * ZUSAMMENFASSEN DER EINZELWIRKUNGEN
 * Nach GUM (ISO/IEC Guide 98-3, „Guide to the expression of uncertainty in
 * measurement") werden Unsicherheitsbeiträge quadratisch überlagert, wenn sie
 * unabhängig sind, und linear, wenn sie voneinander abhängen. Beides kommt
 * hier vor:
 *   - Alle U-Werte aus der Baualtersklasse stammen aus DERSELBEN Annahme
 *     („das Haus ist so gebaut wie der Klassenvertreter"). Liegt sie daneben,
 *     liegt sie überall daneben. -> innerhalb der Gruppe LINEAR addieren.
 *   - Alle aus dem Plan abgeleiteten Flächen hängen am selben Maßstab.
 *     -> eigene Gruppe, ebenfalls linear.
 *   - Der Wärmebrückenzuschlag hat mit beidem nichts zu tun.
 *     -> eigene Gruppe, gegenüber den anderen quadratisch.
 * Die Gruppen heißen hier Korrelationsgruppen; ihre Zuordnung steht im
 * Katalog GROESSENARTEN und ist damit nachlesbar statt versteckt.
 *
 * ANSCHLUSS AN DAS ÜBRIGE WERKZEUG
 * Gelesen werden die Kennzeichen, die das Werkzeug ohnehin führt:
 *   bauteiltypen[].belegt === false      nicht belegter U-Wert
 *   bauteiltypen[].herkunft === "typologie"  aus der Baualtersklasse
 *   p.herkunft["raum.<id>.A"].konfidenz  Konfidenz der Raumfläche
 *   p.herkunft["raum.<id>.h"].herkunft   Herkunft der Raumhöhe
 *   raum.h_annahme                       Höhe angenommen statt gelesen
 *   raum.h_geschosshoehe                 Geschosshöhe aus den Höhenkoten
 *   raum.ki_herkunft.konfidenz           aus der Planauslese
 *   bauteil.annahme / bauteil.naeherung  Kennzeichen am einzelnen Bauteil
 *   p.luftdichtheit.kategorie !== "messung"  n50 ohne Blower-Door
 * Fehlt ein Kennzeichen, gilt die Größe als belegt. Das Modul erfindet keine
 * Unsicherheit, wo keine gekennzeichnet ist.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_BANDBREITE = M;
})(this, function () {

  /* ------------------------------------------------------------------ *
   * 0  Kleinkram
   * ------------------------------------------------------------------ */
  function zahl(x, d) {
    const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (d === undefined ? 0 : d);
  }
  function rnd(x, n) { const f = Math.pow(10, n || 0); return Math.round(x * f) / f; }
  function kopie(o) { return JSON.parse(JSON.stringify(o)); }
  function de(x, n) {
    const k = n === undefined ? 1 : n;
    return (Math.round(x * Math.pow(10, k)) / Math.pow(10, k)).toFixed(k).replace(".", ",");
  }
  function jetzt() {
    return (typeof performance !== "undefined" && performance.now)
      ? performance.now() : Date.now();
  }
  function klemme(x, u, o) { return Math.max(u, Math.min(o, x)); }

  /** Rechenkern besorgen: im Browser global, in Node über require, oder
   *  ausdrücklich übergeben (opt.kern) — so bleibt das Modul prüfbar. */
  function holeKern(opt) {
    if (opt && opt.kern) return opt.kern;
    if (typeof window !== "undefined" && window.KERN_HEIZLAST_NORM) {
      return window.KERN_HEIZLAST_NORM;
    }
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      return require("./kern_heizlast_norm.js");
    }
    return null;
  }
  function holeTypologie(opt) {
    if (opt && opt.typologie) return opt.typologie;
    if (typeof window !== "undefined" && window.DATEN_TYPOLOGIE) return window.DATEN_TYPOLOGIE;
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try { return require("../daten/daten_typologie.js"); } catch (e) { return null; }
    }
    return null;
  }
  /** Die Deckenpaketspanne gehört KERN_ZUORDNUNG; sie wird von dort geholt und
   *  NICHT hier ein zweites Mal gesetzt. Zwei Zahlen für dieselbe Sache driften
   *  auseinander, und die Höhenspanne dieses Moduls muss dieselbe Klammer
   *  benutzen wie die Höhengegenprobe, sonst widersprechen sich Spanne und
   *  Befund. Ist das Modul nicht da, gilt die Klammer als nicht verfügbar. */
  function holeZuordnung(opt) {
    if (opt && opt.zuordnung) return opt.zuordnung;
    if (typeof window !== "undefined" && window.KERN_ZUORDNUNG) return window.KERN_ZUORDNUNG;
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try { return require("./kern_zuordnung.js"); } catch (e) { return null; }
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * 1  Zwei gerechnete Streuungen — damit keine Zahl von Hand gesetzt ist
   * ------------------------------------------------------------------ */

  /* 1a  Wie weit streut ein unbekannter Mauerwerksaufbau?
   * Gerechnet nach DIN EN ISO 6946 mit denselben Kennwerten, die auch der
   * Selbsttest des Rechenkerns benutzt (Vollziegel lambda = 0,81 W/(m·K),
   * Innenputz 1,5 cm lambda = 0,70, Rsi 0,13, Rse 0,04):
   *     24,0 cm  ->  U = 2,05 W/(m²·K)
   *     36,5 cm  ->  U = 1,56 W/(m²·K)
   * Das sind die beiden im Wohnungsbau vor 1950 gängigen Wandstärken; die
   * halbe Spanne, bezogen auf ihr Mittel, ist die Größenordnung, um die ein
   * U-Wert danebenliegt, wenn man den Aufbau NICHT geöffnet hat. Sie dient
   * hier als Untergrenze jeder U-Wert-Bandbreite. */
  function mauerwerkStreuung() {
    const u = function (d) { return 1 / (0.13 + 0.04 + 0.015 / 0.70 + d / 0.81); };
    const duenn = u(0.240), dick = u(0.365);
    return (duenn - dick) / (duenn + dick);
  }
  const STREUUNG_BAUART = mauerwerkStreuung();      // rd. 0,137

  /* 1b  Wie weit streut eine aus der Grundfläche genäherte Wandlänge?
   * Der Umfang eines Rechtecks mit der Fläche A und dem Seitenverhältnis v
   * ist 2*sqrt(A)*(sqrt(v) + 1/sqrt(v)). Das Quadrat hat mit 4*sqrt(A) den
   * KLEINSTEN Umfang; jede andere Form hat mehr. Die Näherung kann also nur
   * zu klein sein, nie zu groß — die Bandbreite ist einseitig.
   *     1:2  ->  +6,1 %      1:3  ->  +15,5 %
   * Wohnräume liegen praktisch immer flacher als 1:3; dieses Verhältnis ist
   * daher die Obergrenze. */
  function umfangFaktor(v) { return (Math.sqrt(v) + 1 / Math.sqrt(v)) / 2; }
  const STREUUNG_UMFANG = umfangFaktor(3) - 1;      // rd. 0,155

  /* 1c  Wie weit streut ein Tabellenwert der Baualtersklasse, wenn schon die
   * Klasse nicht sicher ist? Das beantwortet die IWU-Tabelle selbst: der
   * Abstand zu den benachbarten Klassen derselben Bauteilspalte. Der Median
   * dieser Abstände über die ganze Tabelle ist der Rückfallwert, wenn zum
   * Baujahr keine Klasse gefunden wird. Er wird gerechnet, nicht gesetzt. */
  function nachbarStreuungen(tabelle) {
    const raus = [];
    const arten = ["dach", "wand", "kellerdecke", "bodenplatte", "fenster", "tuer"];
    arten.forEach(function (a) {
      tabelle.forEach(function (t, i) {
        const eigen = t.u ? t.u[a] : null;
        if (!(eigen > 0)) return;
        const n = [];
        for (let k = i - 1; k >= 0; k--) { if (tabelle[k].u[a] > 0) { n.push(tabelle[k].u[a]); break; } }
        for (let k = i + 1; k < tabelle.length; k++) { if (tabelle[k].u[a] > 0) { n.push(tabelle[k].u[a]); break; } }
        if (!n.length) return;
        const alle = n.concat([eigen]);
        raus.push((Math.max.apply(null, alle) - Math.min.apply(null, alle)) / 2 / eigen);
      });
    });
    raus.sort(function (a, b) { return a - b; });
    return raus.length ? raus[Math.floor(raus.length / 2)] : 0;
  }

  /** Streuung des Tabellenwertes für ein bestimmtes Baujahr und Bauteil.
   *  Liefert die halbe Spanne als Anteil, oder null wenn nichts zu holen ist. */
  function typologieStreuung(baujahr, kategorie, typologie) {
    if (!typologie || !typologie.TYPOLOGIE_EFH || !kategorie) return null;
    const tab = typologie.TYPOLOGIE_EFH;
    const j = parseInt(baujahr, 10);
    if (!Number.isFinite(j)) {
      return { halb: nachbarStreuungen(tab), klasse: null, ersatz: true };
    }
    let i = -1;
    tab.forEach(function (t, k) {
      if ((t.von === null || j >= t.von) && (t.bis === null || j <= t.bis)) i = k;
    });
    if (i < 0) return { halb: nachbarStreuungen(tab), klasse: null, ersatz: true };
    const eigen = tab[i].u ? tab[i].u[kategorie] : null;
    if (!(eigen > 0)) return { halb: nachbarStreuungen(tab), klasse: tab[i].code, ersatz: true };
    const n = [];
    for (let k = i - 1; k >= 0; k--) { if (tab[k].u[kategorie] > 0) { n.push(tab[k].u[kategorie]); break; } }
    for (let k = i + 1; k < tab.length; k++) { if (tab[k].u[kategorie] > 0) { n.push(tab[k].u[kategorie]); break; } }
    if (!n.length) return { halb: nachbarStreuungen(tab), klasse: tab[i].code, ersatz: true };
    const alle = n.concat([eigen]);
    const halb = (Math.max.apply(null, alle) - Math.min.apply(null, alle)) / 2 / eigen;
    return { halb: halb, klasse: tab[i].code, ersatz: false };
  }

  /* ------------------------------------------------------------------ *
   * 2  Katalog der Größenarten
   * ------------------------------------------------------------------ *
   * Jede Art nennt ihre Bandbreite, die Herleitung und den Beleg. „belegt"
   * heißt: aus Quelle oder Rechnung ableitbar. „Setzung" heißt: fachlich
   * begründet, aber nicht aus einer Quelle entnommen — und damit ausdrücklich
   * als solche gekennzeichnet.
   * Schlüssel bleiben ASCII, Anzeigetexte haben Umlaute.
   * ------------------------------------------------------------------ */
  const KAPPUNG = 0.50;   /* Setzung: jenseits von ±50 % ist ein Wert keine
     Annahme mehr, sondern eine Lücke. Der gehört als offene Frage in den
     Bericht und nicht in eine Spanne, die Genauigkeit vortäuscht. */

  const GROESSENARTEN = {
    u_wert_typologie: {
      label: "U-Wert aus der Baualtersklasse",
      korrelation: "typologie",
      beleg: "belegt",
      quelle: "IWU, Deutsche Wohngebäudetypologie, 2. Auflage 2015, Anhang C.1, "
            + "Reihe EFH, Wärmeschutz Variante 1; Bauartstreuung gerechnet nach "
            + "DIN EN ISO 6946",
      herleitung: "Zwei voneinander unabhängige Unsicherheiten, quadratisch "
        + "überlagert: erstens der Abstand zu den benachbarten Baualtersklassen "
        + "derselben Spalte der IWU-Tabelle — die Klasse selbst ist nicht sicher; "
        + "zweitens die Streuung des Bauteilaufbaus innerhalb einer Klasse, "
        + "gerechnet aus 24 cm gegen 36,5 cm Vollziegelmauerwerk (U = 2,05 gegen "
        + "1,56 W/(m²·K), halbe Spanne 13,7 %). Für nicht mineralische Bauteile "
        + "wird derselbe Bauartanteil als Setzung übernommen, weil dafür keine "
        + "belegte Streuung vorliegt.",
      empfehlung: "Bauteilaufbau öffnen, aus der Bauakte belegen oder mit einem "
        + "U-Wert-Messgerät aufnehmen.",
    },
    u_wert_geschaetzt: {
      label: "U-Wert ohne Beleg",
      korrelation: "u_geschaetzt",
      beleg: "belegt",
      quelle: "gerechnet nach DIN EN ISO 6946",
      herleitung: "Der Bearbeiter hat das Bauteil gesehen, aber den Aufbau nicht "
        + "geöffnet. Was dann offenbleibt, ist die Schichtdicke. Gerechnet aus "
        + "24 cm gegen 36,5 cm Vollziegelmauerwerk (U = 2,05 gegen 1,56 W/(m²·K)) "
        + "ergibt das eine halbe Spanne von 13,7 %.",
      empfehlung: "Aufbau in einer Bauteilöffnung oder am Fensteranschlag "
        + "nachsehen; ein Foto der Laibung genügt oft.",
      halb: STREUUNG_BAUART,
    },
    raumflaeche_unsicher: {
      label: "Raumfläche mit unsicherer Herkunft",
      korrelation: "geometrie",
      beleg: "Setzung",
      quelle: null,
      herleitung: "Fachliche Setzung, ±10 %. Herleitung: wird beim Lesen einer "
        + "Maßkette ein Teilmaß von 0,30 m falsch zugeordnet, sind das in einem "
        + "4 m breiten Raum 7,5 %; aufgerundet auf 10 %. Ein gleichmäßiger "
        + "Maßstabsfehler ist damit NICHT abgedeckt — der geht quadratisch ein "
        + "und wird von kern_massstabsprobe gesucht, nicht hier.",
      empfehlung: "Zwei Raummaße vor Ort nachmessen; das prüft zugleich den "
        + "Maßstab des Plans.",
      halb: 0.10,
    },
    /* ---------------------------------------------------------------- *
     * EINE VERTEILTE FLÄCHE IST KEINE UNSICHERE FLÄCHE.
     * ---------------------------------------------------------------- *
     * Eine Raumfläche „mit unsicherer Herkunft" ist gelesen worden und
     * könnte um ein falsch zugeordnetes Teilmaß danebenliegen — das sind die
     * ±10 % der Zeile darüber. Eine Fläche, die aus den Außenmaßen des
     * Geschosses auf die Räume VERTEILT wurde, ist gar nicht gelesen worden.
     * Sie steht und fällt mit zwei Annahmen: mit der Wanddicke, die den
     * Bruttoumriss auf die Innenfläche bringt, und mit der Größenordnung der
     * Raumart. Beide sind gemessen, keine ist belegt.
     *
     * Die Spanne kommt deshalb NICHT von hier, sondern vom Vorschlag selbst
     * (raum.A_spanne): sie ist die beobachtete Streuung dieser Raumart im
     * Prüfsatz von KERN_FLAECHE, auf die Verteilung zurückgerechnet. Fehlt
     * sie, gilt ersatzweise der GEMESSENE Median des relativen Fehlers, mit
     * dem diese Regel am Prüfsatz danebenliegt — 14,0 %. Auch das ist keine
     * gesetzte Zahl, sondern ein Auszählungsergebnis.
     * ---------------------------------------------------------------- */
    raumflaeche_verteilt: {
      label: "Raumfläche aus den Außenmaßen verteilt",
      korrelation: "geometrie",
      beleg: "Annahme",
      quelle: "KERN_FLAECHE, Prüfsatz aus 51 Räumen von 8 Geschossen dreier "
            + "Gebäude mit im Plan angeschriebenen Flächen",
      herleitung: "Diese Fläche steht auf keinem Blatt. Sie ist die Fläche "
        + "innerhalb der Außenwände dieses Geschosses (Außenbemaßung abzüglich "
        + "des Wandrings nach A − U·d + 4·d²), auf die Räume verteilt im "
        + "Verhältnis der Größen, die Räume dieser Art in echten Grundrissen "
        + "haben. Die Spanne je Raum ist die beobachtete Streuung seiner "
        + "Raumart im Prüfsatz; ohne sie gilt der gemessene Median des "
        + "relativen Fehlers dieser Regel, 14,0 %. Die Innenwände sind in der "
        + "verteilten Fläche noch enthalten — die Werte sind eher zu groß als "
        + "zu klein.",
      empfehlung: "Die Grundfläche im Plan abgreifen und in der Raumzeile "
        + "eintragen; eine Eingabe geht dem Vorschlag immer vor. Schon zwei "
        + "oder drei nachgetragene Räume verkleinern die Spanne aller "
        + "übrigen, weil sie ihre Fläche vorweg abziehen.",
      halb: 0.140,
    },
    raumhoehe_annahme: {
      label: "angenommene Raumhöhe",
      korrelation: "geometrie",
      beleg: "teils belegt",
      quelle: "Musterbauordnung § 47 Abs. 1 (lichte Höhe von Aufenthaltsräumen "
            + "mindestens 2,40 m)",
      herleitung: "Untergrenze ist das bauordnungsrechtliche Mindestmaß von "
        + "2,40 m. Als Obergrenze ist 2,90 m gesetzt (Altbau vor 1918); das ist "
        + "eine fachliche Setzung. Um das Mittel von 2,65 m sind das ±9,4 %, "
        + "hier auf 10 % gerundet.",
      empfehlung: "Einmal mit dem Lasermesser je Geschoss messen; das dauert "
        + "Minuten und erledigt alle Räume des Geschosses.",
      halb: 0.10,
    },
    /* ---------------------------------------------------------------- *
     * EINE GELESENE HÖHE IST NICHT SICHERER ALS EINE ANGENOMMENE.
     * ---------------------------------------------------------------- *
     * Sie ist nur anders begründet. Bis zum 23.08.2026 kam die Raumhöhe
     * überhaupt nur dann in diese Auswertung, wenn sie als Annahme geführt
     * war; stand sie als aus dem Schnitt gelesen, fehlte sie ganz. Am Fall
     * „BV 2-0887 Ziolkowski" hieß das: 30 Größen in der Spanne, die Höhe
     * nicht darunter — obwohl sie linear in das Luftvolumen und in JEDE
     * Außenwandfläche eingeht und damit die wirksamste Geometriegröße der
     * ganzen Rechnung ist. Eine Spanne, die die wirksamste Größe ausspart,
     * verspricht mehr, als sie hält.
     *
     * Dass „gelesen" nicht „sicher" heißt, ist an derselben Datei gemessen:
     * zwei Läufe gegen denselben Endpunkt gaben dieselbe Maßkette einmal als
     * lichte Höhe (gemessen Fußboden bis Decke) und einmal als Geschosshöhe
     * (gemessen Fußboden bis Fußboden) zurück. Der Zahlenwert war beide Male
     * derselbe, seine Bedeutung nicht.
     * ---------------------------------------------------------------- */
    raumhoehe_geklammert: {
      label: "gelesene Raumhöhe, durch die Höhenkoten eingeklammert",
      korrelation: "geometrie",
      beleg: "belegt",
      quelle: "Höhenkoten desselben Schnitts; Deckenpaketspanne aus KERN_ZUORDNUNG",
      herleitung: "Die lichte Höhe steht im Plan angeschrieben. Das macht sie "
        + "begründet, nicht sicher: GEMESSEN am 23.08.2026 an „BV 2-0887 "
        + "Ziolkowski" + "“" + " gaben zwei Läufe derselben Datei gegen denselben "
        + "Endpunkt dieselbe Maßkette einmal als lichte Höhe und einmal als "
        + "Geschosshöhe zurück — gleicher Zahlenwert, andere Bedeutung. Belegt "
        + "bleibt deshalb allein die Geschosshöhe aus den Höhenkoten. Unter sie "
        + "passt jede lichte Höhe, die ein übliches Deckenpaket übrig lässt; "
        + "diese Klammer ist die Spanne. Sie ist gerechnet, nicht gesetzt, und "
        + "es ist dieselbe Klammer, gegen die die Höhengegenprobe prüft.",
      empfehlung: "Einmal mit dem Lasermesser je Geschoss messen; das dauert "
        + "Minuten und erledigt alle Räume des Geschosses.",
    },
    raumhoehe_ohne_klammer: {
      label: "gelesene Raumhöhe ohne Gegenprobe",
      korrelation: "geometrie",
      beleg: "teils belegt",
      quelle: "Musterbauordnung § 47 Abs. 1 (lichte Höhe von Aufenthaltsräumen "
            + "mindestens 2,40 m)",
      herleitung: "Die lichte Höhe ist gelesen, aber nichts hält sie: der Schnitt "
        + "gibt keine Höhenkoten her, aus denen sich die Geschosshöhe ergäbe. Dass "
        + "eine gelesene Zahl nicht schon deshalb stimmt, ist gemessen — am "
        + "23.08.2026 lieferten zwei Läufe derselben Datei dieselbe Maßkette "
        + "einmal als lichte Höhe und einmal als Geschosshöhe. Ohne Klammer bleibt "
        + "nur, was für jeden Aufenthaltsraum gilt: mindestens 2,40 m nach "
        + "Musterbauordnung, als Obergrenze 2,90 m (Altbau vor 1918) als fachliche "
        + "Setzung. Um das Mittel von 2,65 m sind das ±9,4 %, hier auf 10 % "
        + "gerundet — dieselbe Spanne wie bei einer offen angenommenen Höhe, denn "
        + "geprüft ist beides nicht.",
      empfehlung: "Einmal mit dem Lasermesser je Geschoss messen, oder den Schnitt "
        + "mit Höhenkoten nachreichen lassen; dann greift die engere Klammer.",
      halb: 0.10,
    },
    fensterflaeche_geschaetzt: {
      label: "geschätzte Fensterfläche",
      korrelation: "geometrie",
      beleg: "teils belegt",
      quelle: "Musterbauordnung § 47 Abs. 2 (Fensterfläche von Aufenthaltsräumen "
            + "mindestens ein Achtel der Netto-Grundfläche)",
      herleitung: "Untergrenze ist das bauordnungsrechtliche Mindestmaß von einem "
        + "Achtel der Raumgrundfläche. Als Obergrenze ist ein Viertel gesetzt "
        + "(großzügige Befensterung); das ist eine fachliche Setzung. Die "
        + "Bandbreite wird je Raum aus dessen Grundfläche gerechnet. Gegengerechnet "
        + "wird die Wandfläche desselben Raums: das Fenster sitzt IN der Wand, "
        + "wirksam ist nur der Unterschied der beiden U-Werte.",
      empfehlung: "Fenster zählen und ein Maß je Fenstertyp nehmen.",
    },
    n50_ohne_messung: {
      label: "n50 ohne Messung",
      korrelation: "lueftung",
      beleg: "Setzung",
      quelle: null,
      herleitung: "Fachliche Setzung: die Hälfte bis das 1,75-fache des "
        + "angesetzten Wertes. Zur Einordnung: die Anforderung an die "
        + "Luftdichtheit liegt bei n50 = 3,0 h⁻¹ ohne und 1,5 h⁻¹ mit "
        + "raumlufttechnischer Anlage; ein ungeprüfter Altbau kann deutlich "
        + "darüber liegen. Ohne Blower-Door-Messung ist der Ansatz eine "
        + "Einordnung, keine Größe. Wichtig: in vielen Wohnungen ist der "
        + "hygienische Mindestluftwechsel maßgebend, dann hat n50 gar keine "
        + "Wirkung — das zeigt diese Auswertung unmittelbar.",
      empfehlung: "Nur messen lassen, wenn diese Zeile überhaupt einen Beitrag "
        + "leistet. Steht hier 0 %, ändert eine Blower-Door am Ergebnis nichts.",
      min_faktor: 0.50, max_faktor: 1.75,
    },
    wandflaeche_genaehert: {
      label: "aus der Grundfläche genäherte Wandfläche",
      korrelation: "geometrie",
      beleg: "belegt",
      quelle: "gerechnet",
      herleitung: "Wird die Wandlänge aus der Grundfläche genähert, unterstellt "
        + "man stillschweigend einen quadratischen Raum. Das Quadrat hat von "
        + "allen Rechtecken gleicher Fläche den kleinsten Umfang; die Näherung "
        + "kann also nur zu klein sein. Bei 1:2 fehlen 6,1 %, bei 1:3 fehlen "
        + "15,5 %. Die Bandbreite ist deshalb einseitig: 0 bis +15,5 %.",
      empfehlung: "Zweites Raummaß aufnehmen; damit ist der Umfang exakt.",
      min_faktor: 1.0, max_faktor: 1 + STREUUNG_UMFANG,
    },
    waermebruecke_pauschal: {
      label: "pauschaler Wärmebrückenzuschlag",
      korrelation: "norm_ansatz",
      beleg: "teils belegt",
      quelle: "DIN 4108 Beiblatt 2 (Nachweis der Planungsbeispiele führt auf "
            + "0,05 W/(m²·K) statt des Pauschalwerts 0,10)",
      herleitung: "Untergrenze ist der belegte Wert bei Nachweis nach DIN 4108 "
        + "Beiblatt 2, also die Hälfte des Pauschalansatzes. Die Obergrenze mit "
        + "dem Anderthalbfachen ist eine fachliche Setzung für ungedämmte "
        + "Bauteilanschlüsse, wie sie im unsanierten Bestand die Regel sind.",
      empfehlung: "Nur bei großen Hüllflächen lohnend: Anschlussdetails prüfen "
        + "und den Nachweis nach Beiblatt 2 führen.",
      min_faktor: 0.50, max_faktor: 1.50,
    },
  };

  /* ------------------------------------------------------------------ *
   * 3  Bauteile einordnen
   * ------------------------------------------------------------------ */
  function grundname(n) { return String(n || "").split(" (")[0].trim(); }

  function istFenster(n) { return /fenster|verglasung/i.test(String(n || "")); }
  function istTuer(n) { return /t[uü]r\b|t[uü]ren/i.test(String(n || "")); }
  /** Deckt Bauteile ab, deren Fläche mit der Grundfläche skaliert (Decken,
   *  Böden, Dachflächen), im Unterschied zu Wänden (mit dem Umfang). */
  function istWaagerecht(n) {
    const s = String(n || "");
    if (istFenster(s)) return false;
    return /decke|boden|platte|sohle|dach|schr[aä]ge|kehlbalken/i.test(s);
  }
  function istWand(n) {
    const s = String(n || "");
    if (istFenster(s) || istTuer(s) || istWaagerecht(s)) return false;
    return /wand|giebel|drempel|w[aä]nde/i.test(s);
  }

  /** Bauteilkategorie für den Griff in die Typologie-Tabelle. */
  function typologieKategorie(name) {
    const s = String(name || "");
    if (istFenster(s)) return "fenster";
    if (istTuer(s)) return "tuer";
    if (/kellerdecke|decke gegen keller|decke [uü]ber keller/i.test(s)) return "kellerdecke";
    if (/bodenplatte|sohle|fu[sß]+boden gegen erdreich/i.test(s)) return "bodenplatte";
    if (/dach|schr[aä]ge|oberste[rns]? geschossdecke|kehlbalken|spitzboden/i.test(s)) return "dach";
    if (/wand|giebel|drempel/i.test(s)) return "wand";
    return null;
  }

  /** Schlüssel, unter dem gleichartige Bauteile gemeinsam variiert werden.
   *  Gleicher Typ oder gleicher Name UND gleicher U-Wert gehören zusammen —
   *  sie beruhen auf derselben Annahme und müssen sich gemeinsam bewegen. */
  function bauteilSchluessel(bt) {
    if (bt.typ_id) return "typ:" + bt.typ_id;
    return "name:" + grundname(bt.name) + "|u:" + rnd(zahl(bt.U, 0), 4);
  }

  /* ------------------------------------------------------------------ *
   * 4  Unsichere Größen einsammeln
   * ------------------------------------------------------------------ */

  /** Alle Fundstellen eines Bauteilschlüssels, als Indizes — nach dem Klonen
   *  des Projekts zeigen sie unverändert auf dieselben Stellen. */
  function fundstellen(p, schluessel) {
    const s = [];
    (p.raeume || []).forEach(function (r, ri) {
      (r.bauteile || []).forEach(function (bt, bi) {
        if (bauteilSchluessel(bt) === schluessel) s.push({ wo: "raum", i: ri, j: bi });
      });
    });
    (p.zonen || []).forEach(function (z, zi) {
      (z.huelle || []).forEach(function (bt, bi) {
        if (bauteilSchluessel(bt) === schluessel) s.push({ wo: "zone", i: zi, j: bi });
      });
    });
    return s;
  }

  function holeBauteil(p, st) {
    return st.wo === "raum" ? p.raeume[st.i].bauteile[st.j] : p.zonen[st.i].huelle[st.j];
  }

  function herkunftVon(p, pfad) {
    return (p && p.herkunft && p.herkunft[pfad]) || null;
  }

  /** Ist der U-Wert dieses Bauteils eine Annahme? Liefert null oder die Art. */
  function uWertAnnahmeArt(bt, typen, opt) {
    const t = bt.typ_id ? typen[bt.typ_id] : null;
    const herk = (t && t.herkunft) || bt.herkunft || null;
    const typologisch = herk === "typologie" || (t && t.typologie === true)
                     || bt.typologie === true;
    if (typologisch) return "u_wert_typologie";
    if (t && t.belegt === false) return "u_wert_geschaetzt";
    if (bt.annahme === true || bt.u_belegt === false) return "u_wert_geschaetzt";
    if (opt && opt.u_werte_als_annahme) {
      return opt.u_werte_als_annahme === "typologie"
        ? "u_wert_typologie" : "u_wert_geschaetzt";
    }
    return null;
  }

  /**
   * Sammelt alle Größen, die nicht belegt sind, mit ihrem plausiblen Bereich.
   * Rückgabe: Liste von Größen. Jede trägt `anwenden(projekt, faktor)`, das
   * eine Kopie des Projekts verändert (die Funktion überlebt kein JSON und
   * wird für die Ausgabe abgestreift).
   */
  function sammle(projekt, optionen) {
    const opt = optionen || {};
    const p = projekt || {};
    const typo = holeTypologie(opt);
    const baujahr = (p.meta && p.meta.baujahr) || null;
    const typen = {};
    (p.bauteiltypen || []).forEach(function (t) { typen[t.id] = t; });
    const raus = [];

    function neu(art, id, label, extra) {
      const a = GROESSENARTEN[art];
      const g = {
        id: id, art: art, label: label,
        korrelation: a.korrelation, beleg: a.beleg, quelle: a.quelle,
        herleitung: a.herleitung, empfehlung: a.empfehlung,
        min_faktor: a.min_faktor !== undefined ? a.min_faktor : (1 - (a.halb || 0)),
        max_faktor: a.max_faktor !== undefined ? a.max_faktor : (1 + (a.halb || 0)),
      };
      Object.keys(extra || {}).forEach(function (k) { g[k] = extra[k]; });
      raus.push(g);
      return g;
    }

    /* --- 4.1  U-Werte ------------------------------------------------- */
    const gesehen = {};
    const alleBauteile = [];
    (p.raeume || []).forEach(function (r, ri) {
      (r.bauteile || []).forEach(function (bt, bi) {
        alleBauteile.push({ bt: bt, wo: "raum", i: ri, j: bi });
      });
    });
    (p.zonen || []).forEach(function (z, zi) {
      (z.huelle || []).forEach(function (bt, bi) {
        alleBauteile.push({ bt: bt, wo: "zone", i: zi, j: bi });
      });
    });

    alleBauteile.forEach(function (x) {
      const schluessel = bauteilSchluessel(x.bt);
      if (gesehen[schluessel]) return;
      const art = uWertAnnahmeArt(x.bt, typen, opt);
      if (!art) return;
      gesehen[schluessel] = true;
      const st = fundstellen(p, schluessel);
      const flaeche = st.reduce(function (s, y) { return s + zahl(holeBauteil(p, y).A, 0); }, 0);
      const name = grundname(x.bt.name) || (typen[x.bt.typ_id] && typen[x.bt.typ_id].name)
                || "Bauteil";
      let halb = STREUUNG_BAUART, klasse = null, ersatz = false;
      if (art === "u_wert_typologie") {
        const kat = typologieKategorie(name);
        const s = typologieStreuung(baujahr, kat, typo);
        const nachbar = s ? s.halb : 0;
        klasse = s ? s.klasse : null;
        ersatz = s ? !!s.ersatz : true;
        /* unabhängige Anteile: Klassenzuordnung und Bauartstreuung */
        halb = Math.sqrt(nachbar * nachbar + STREUUNG_BAUART * STREUUNG_BAUART);
      }
      const gekappt = halb > KAPPUNG;
      halb = klemme(halb, STREUUNG_BAUART, KAPPUNG);
      neu(art, "u_" + schluessel, "U-Wert " + name, {
        min_faktor: 1 - halb, max_faktor: 1 + halb,
        wert: zahl(x.bt.U, 0), einheit: "W/(m²·K)",
        flaeche: rnd(flaeche, 2), gekappt: gekappt,
        typologieklasse: klasse, klasse_ersatz: ersatz,
        stellen: st,
        anwenden: function (ziel, faktor) {
          st.forEach(function (y) {
            const b = holeBauteil(ziel, y);
            b.U = zahl(b.U, 0) * faktor;
          });
        },
      });
    });

    /* --- 4.2  Raumflächen mit unsicherer Herkunft ---------------------- */
    (p.raeume || []).forEach(function (r, ri) {
      const h = herkunftVon(p, "raum." + r.id + ".A");
      const kiK = r.ki_herkunft && r.ki_herkunft.konfidenz;
      const konf = (h && h.konfidenz) || kiK || null;
      const unsicher = (konf && konf !== "sicher") || r.A_annahme === true
                    || (opt.flaechen_als_annahme === true);
      if (!unsicher || !(zahl(r.A, 0) > 0)) return;
      const A = zahl(r.A, 0);
      const label = "Fläche " + (r.name || r.id)
                  + (r.geschoss ? " (" + r.geschoss + ")" : "");
      const anwenden = function (ziel, faktor) {
        flaecheSkalieren(ziel.raeume[ri], faktor);
      };
      /* Verteilt oder nur unsicher? Eine verteilte Fläche bringt ihre eigene
         Spanne mit — die Streuung ihrer Raumart im Prüfsatz von KERN_FLAECHE.
         Sie wird genommen, wie sie ist, und nicht durch eine Setzung ersetzt. */
      const verteilt = r.A_vorschlag && r.A_vorschlag.art === "verteilung";
      if (verteilt) {
        const sp = Array.isArray(r.A_spanne) ? r.A_spanne : null;
        const mn = sp && zahl(sp[0], 0) > 0 ? zahl(sp[0]) / A : 0;
        const mx = sp && zahl(sp[1], 0) > 0 ? zahl(sp[1]) / A : 0;
        const zusatz = { wert: A, einheit: "m²", konfidenz: "angenommen",
          anwenden: anwenden };
        if (mn > 0 && mx > 0 && mn <= 1 && mx >= 1) {
          const gekappt = (1 - mn) > KAPPUNG || (mx - 1) > KAPPUNG;
          zusatz.min_faktor = klemme(mn, 1 - KAPPUNG, 1);
          zusatz.max_faktor = klemme(mx, 1, 1 + KAPPUNG);
          zusatz.gekappt = gekappt;
          zusatz.herleitung = GROESSENARTEN.raumflaeche_verteilt.herleitung
            + " Für diesen Raum: " + de(A, 2) + " m², Spanne " + de(zahl(sp[0]), 2)
            + " bis " + de(zahl(sp[1]), 2) + " m².";
        }
        neu("raumflaeche_verteilt", "a_" + r.id, label, zusatz);
        return;
      }
      neu("raumflaeche_unsicher", "a_" + r.id, label, {
        wert: A, einheit: "m²", konfidenz: konf || "unsicher",
        anwenden: anwenden,
      });
    });

    /* --- 4.3  Raumhöhen — IMMER, nicht nur wenn angenommen -------------
     *
     * Die Höhe geht linear in das Luftvolumen und in jede Außenwandfläche
     * ein. Sie hier nur dann mitzuführen, wenn sie als Annahme geführt ist,
     * hieß: gerade der Weg, auf dem eine falsche Höhe still durchläuft, war
     * der einzige ohne Spanne. Was sich mit der Herkunft ändert, ist nicht
     * OB die Höhe in die Spanne kommt, sondern WIE WEIT sie streut. */
    const Zk = holeZuordnung(opt);
    const D_MIN = Zk && zahl(Zk.MIN_DECKENPAKET, 0) > 0 ? zahl(Zk.MIN_DECKENPAKET) : null;
    const D_MAX = Zk && zahl(Zk.MAX_DECKENPAKET, 0) > 0 ? zahl(Zk.MAX_DECKENPAKET) : null;
    (p.raeume || []).forEach(function (r, ri) {
      const hWert = zahl(r.h, 0);
      if (!(hWert > 0)) return;
      const h = herkunftVon(p, "raum." + r.id + ".h");
      const angenommen = r.h_annahme === true
        || (h && (h.herkunft === "typologie" || h.konfidenz === "geraten"))
        || (!h && opt.hoehen_als_annahme === true);
      const id = "h_" + r.id;
      const label = "Höhe " + (r.name || r.id)
                  + (r.geschoss ? " (" + r.geschoss + ")" : "");
      const anwenden = function (ziel, faktor) { hoeheSkalieren(ziel.raeume[ri], faktor); };
      if (angenommen) {
        neu("raumhoehe_annahme", id, label,
          { wert: hWert, einheit: "m", anwenden: anwenden });
        return;
      }
      /* DIE EINE AUSNAHME, und sie muss ausdrücklich gesetzt sein: eine am
         Bau gemessene Höhe. Sie ist die einzige belegte Höhe, die es gibt —
         weder Plan noch Schnitt noch Eingabefeld belegen etwas. Kein Weg im
         Werkzeug setzt dieses Kennzeichen heute; es steht hier, damit die
         Ausnahme benannt ist statt stillschweigend zu gelten, und damit der
         Selbsttest ein wirklich belegtes Projekt bauen kann. Gegen eine
         ausdrücklich geführte Annahme verliert es. */
      if (r.h_belegt === true) return;
      /* Gelesen. Gibt es für dieses Geschoss eine durch die Höhenkoten
         belegte Geschosshöhe, ist die Klammer gerechnet; sonst bleibt nur
         das bauordnungsrechtliche Maß. Die Klammer wird so geweitet, dass
         der gelesene Wert immer darin liegt — sie soll die Spanne stellen
         und nicht den Punktwert bestreiten. Widerspricht die Klammer dem
         gelesenen Wert, ist das ein Befund der Höhengegenprobe und gehört
         dorthin, nicht in eine stillschweigend verschobene Spanne. */
      const G = zahl(r.h_geschosshoehe, 0);
      if (!(G > 0) || D_MIN === null || D_MAX === null) {
        neu("raumhoehe_ohne_klammer", id, label,
          { wert: hWert, einheit: "m", anwenden: anwenden });
        return;
      }
      const unten = Math.min(hWert, rnd(G - D_MAX, 3));
      const oben = Math.max(hWert, rnd(G - D_MIN, 3));
      let mn = unten / hWert, mx = oben / hWert;
      const gekappt = (1 - mn) > KAPPUNG || (mx - 1) > KAPPUNG;
      mn = klemme(mn, 1 - KAPPUNG, 1);
      mx = klemme(mx, 1, 1 + KAPPUNG);
      neu("raumhoehe_geklammert", id, label, {
        min_faktor: mn, max_faktor: mx, gekappt: gekappt,
        wert: hWert, einheit: "m", geschosshoehe: rnd(G, 3),
        herleitung: GROESSENARTEN.raumhoehe_geklammert.herleitung
          + " Für " + (r.geschoss || "dieses Geschoss") + ": Geschosshöhe "
          + de(G, 2) + " m aus den Koten, Deckenpaket " + de(D_MIN, 2) + " bis "
          + de(D_MAX, 2) + " m, lichte Höhe also zwischen " + de(rnd(G - D_MAX, 2), 2)
          + " und " + de(rnd(G - D_MIN, 2), 2) + " m; gelesen und gerechnet ist "
          + de(hWert, 2) + " m.",
        anwenden: anwenden,
      });
    });

    /* --- 4.4  Geschätzte Fensterflächen -------------------------------- */
    (p.raeume || []).forEach(function (r, ri) {
      (r.bauteile || []).forEach(function (bt, bi) {
        const geschaetzt = bt.A_annahme === true
          || (bt.annahme === true && istFenster(bt.name))
          || (opt.fensterflaechen_als_annahme === true && istFenster(bt.name));
        if (!geschaetzt || !istFenster(bt.name) || !(zahl(bt.A, 0) > 0)) return;
        const aRaum = zahl(r.A, 0), aF = zahl(bt.A, 0);
        /* Bandbreite aus der Grundfläche: ein Achtel bis ein Viertel */
        let mn = 0.7, mx = 1.4;
        if (aRaum > 0) {
          mn = klemme((aRaum / 8) / aF, 0.4, 1.0);
          mx = klemme((aRaum / 4) / aF, 1.0, 2.5);
        }
        neu("fensterflaeche_geschaetzt", "af_" + r.id + "_" + bi,
          "Fensterfläche " + (r.name || r.id), {
            min_faktor: mn, max_faktor: mx,
            wert: aF, einheit: "m²",
            anwenden: function (ziel, faktor) {
              const zr = ziel.raeume[ri], zb = zr.bauteile[bi];
              const alt = zahl(zb.A, 0), neuA = alt * faktor;
              zb.A = neuA;
              /* Das Fenster sitzt in der Wand: die größte Außenwand desselben
                 Raums gibt die Differenz ab, sonst würde die Hüllfläche mit
                 der Fenstergröße wachsen. */
              let best = -1, bestA = 0;
              zr.bauteile.forEach(function (o, k) {
                if (k === bi || !istWand(o.name)) return;
                const g = o.grenzt_an || {};
                if (g.typ !== "aussen") return;
                if (zahl(o.A, 0) > bestA) { bestA = zahl(o.A, 0); best = k; }
              });
              if (best >= 0) {
                zr.bauteile[best].A = Math.max(0, bestA - (neuA - alt));
              }
            },
          });
      });
    });

    /* --- 4.5  n50 ohne Messung ----------------------------------------- */
    const l = p.luftdichtheit || {};
    if (zahl(l.n50, 0) > 0 && l.kategorie !== "messung") {
      neu("n50_ohne_messung", "n50", "Luftwechsel n50", {
        wert: zahl(l.n50, 0), einheit: "h⁻¹",
        anwenden: function (ziel, faktor) {
          ziel.luftdichtheit.n50 = zahl(ziel.luftdichtheit.n50, 0) * faktor;
        },
      });
    }

    /* --- 4.6  Genäherte Wandflächen ------------------------------------ */
    (p.raeume || []).forEach(function (r, ri) {
      const treffer = [];
      (r.bauteile || []).forEach(function (bt, bi) {
        const genaehert = bt.naeherung === "umfang_aus_grundflaeche"
          || (bt.annahme === true && istWand(bt.name))
          || (opt.wandflaechen_als_annahme === true && istWand(bt.name));
        if (genaehert && zahl(bt.A, 0) > 0) treffer.push(bi);
      });
      if (!treffer.length) return;
      const summe = treffer.reduce(function (s, bi) { return s + zahl(r.bauteile[bi].A, 0); }, 0);
      neu("wandflaeche_genaehert", "aw_" + r.id,
        "Wandfläche " + (r.name || r.id), {
          wert: rnd(summe, 2), einheit: "m²",
          anwenden: function (ziel, faktor) {
            treffer.forEach(function (bi) {
              const b = ziel.raeume[ri].bauteile[bi];
              b.A = zahl(b.A, 0) * faktor;
            });
          },
        });
    });

    /* --- 4.7  Pauschaler Wärmebrückenzuschlag --------------------------- */
    const dwb = zahl(p.norm && p.norm.delta_u_wb, NaN);
    const wbBelegt = !!(p.norm && (p.norm.wb_nachweis === true || p.norm.wb_belegt === true));
    if (Number.isFinite(dwb) && dwb > 0 && !wbBelegt) {
      neu("waermebruecke_pauschal", "wb", "Wärmebrückenzuschlag ΔU_WB", {
        wert: dwb, einheit: "W/(m²·K)",
        anwenden: function (ziel, faktor) {
          if (!ziel.norm) ziel.norm = {};
          ziel.norm.delta_u_wb = dwb * faktor;
        },
      });
    }

    return raus;
  }

  /** Raumfläche skalieren und alles mitziehen, was von ihr abhängt.
   *  Volumen linear, Deckenflächen linear, Wandflächen mit der Wurzel
   *  (der Umfang wächst mit sqrt der Fläche), Fenster und Türen bleiben —
   *  die sind gezählt, nicht gerechnet. */
  function flaecheSkalieren(r, faktor) {
    const w = Math.sqrt(faktor);
    r.A = zahl(r.A, 0) * faktor;
    if (zahl(r.V, 0) > 0) r.V = zahl(r.V, 0) * faktor;
    (r.bauteile || []).forEach(function (bt) {
      if (istFenster(bt.name) || istTuer(bt.name)) return;
      bt.A = zahl(bt.A, 0) * (istWaagerecht(bt.name) ? faktor : w);
    });
  }

  /** Raumhöhe skalieren: Volumen und Wandflächen wachsen mit, Decken und
   *  Böden nicht, Fenster und Türen nicht. */
  function hoeheSkalieren(r, faktor) {
    r.h = zahl(r.h, 0) * faktor;
    if (zahl(r.V, 0) > 0) r.V = zahl(r.V, 0) * faktor;
    (r.bauteile || []).forEach(function (bt) {
      if (istFenster(bt.name) || istTuer(bt.name) || istWaagerecht(bt.name)) return;
      bt.A = zahl(bt.A, 0) * faktor;
    });
  }

  /* ------------------------------------------------------------------ *
   * 5  Hauptrechnung
   * ------------------------------------------------------------------ */

  /* Wann ist eine Spanne schmal? Wärmeerzeuger im Wohnungsbau werden in
   * Stufen von rund 2 kW angeboten (Erfahrungswert, fachliche Setzung). Eine
   * Spanne, die schmaler ist als eine halbe Baugröße, ändert die Gerätewahl
   * nicht mehr — dann tragen die Annahmen. Bezogen auf eine typische
   * Gebäudeheizlast um 10 kW sind das ±10 %. */
  const SCHWELLE_SCHMAL = 0.10;
  const SCHWELLE_BREIT = 0.25;

  function stufeAus(relativ) {
    if (relativ <= SCHWELLE_SCHMAL) return "schmal";
    if (relativ <= SCHWELLE_BREIT) return "mittel";
    return "breit";
  }

  /**
   * Punktwert, Spanne und die nach Wirkung sortierten Beiträge.
   *
   * optionen:
   *   kern      Rechenkern (sonst global / require)
   *   typologie Typologiedaten (sonst global / require)
   *   groesse   "phi_gebaeude" (Vorgabe) oder "phi_raeume_summe"
   *   u_werte_als_annahme  true | "typologie"  — alle U-Werte als Annahme
   *                        behandeln, auch wenn sie belegt gekennzeichnet sind
   */
  function rechne(projekt, optionen) {
    const opt = optionen || {};
    const t0 = jetzt();
    const K = holeKern(opt);
    if (!K || typeof K.rechne !== "function") {
      return { ok: false, fehler: "Der Rechenkern ist nicht erreichbar.", groessen: [] };
    }
    const feld = opt.groesse || "phi_gebaeude";
    const p = projekt || {};
    const nimm = function (erg) { return zahl(erg && erg[feld], 0); };

    const basis = K.rechne(p);
    const punkt = nimm(basis);
    const groessen = sammle(p, opt);
    let laeufe = 1;

    /* --- 5.1  Zwei Läufe je Größe -------------------------------------- */
    groessen.forEach(function (g) {
      const pu = kopie(p); g.anwenden(pu, g.min_faktor);
      const po = kopie(p); g.anwenden(po, g.max_faktor);
      laeufe += 2;
      g.wirkung_unten = nimm(K.rechne(pu)) - punkt;
      g.wirkung_oben = nimm(K.rechne(po)) - punkt;
      g.wirkung = (Math.abs(g.wirkung_unten) + Math.abs(g.wirkung_oben)) / 2;
    });

    /* --- 5.2  Innerhalb einer Korrelationsgruppe linear ---------------- */
    const gruppen = {};
    groessen.forEach(function (g) {
      const k = g.korrelation;
      if (!gruppen[k]) gruppen[k] = { korrelation: k, unten: 0, oben: 0, summe_wirkung: 0, anzahl: 0 };
      /* Vorzeichenrichtig addieren: eine Größe, die das Ergebnis beim unteren
         Rand ANHEBT (kommt vor, etwa bei gegengerechneten Flächen), darf die
         Gruppe nicht künstlich verbreitern. */
      gruppen[k].unten += Math.min(g.wirkung_unten, g.wirkung_oben);
      gruppen[k].oben += Math.max(g.wirkung_unten, g.wirkung_oben);
      gruppen[k].summe_wirkung += g.wirkung;
      gruppen[k].anzahl += 1;
    });

    /* --- 5.3  Zwischen den Gruppen quadratisch ------------------------- */
    let qu = 0, qo = 0;
    Object.keys(gruppen).forEach(function (k) {
      qu += gruppen[k].unten * gruppen[k].unten;
      qo += gruppen[k].oben * gruppen[k].oben;
    });
    const unten = punkt - Math.sqrt(qu);
    const oben = punkt + Math.sqrt(qo);
    const halbspanne = (oben - unten) / 2;
    const relativ = punkt > 0 ? halbspanne / punkt : 0;

    /* --- 5.4  Beiträge: Anteil an der Gesamtunsicherheit --------------- */
    const gesamtQ = (qu + qo) / 2;
    const beitraege = groessen.map(function (g) {
      const gr = gruppen[g.korrelation];
      const grQ = (gr.unten * gr.unten + gr.oben * gr.oben) / 2;
      const gruppenanteil = gesamtQ > 0 ? grQ / gesamtQ : 0;
      const innen = gr.summe_wirkung > 0 ? g.wirkung / gr.summe_wirkung : 0;
      return {
        id: g.id, art: g.art, label: g.label,
        korrelation: g.korrelation,
        wert: g.wert === undefined ? null : g.wert,
        einheit: g.einheit || "",
        min_faktor: rnd(g.min_faktor, 4), max_faktor: rnd(g.max_faktor, 4),
        wirkung_w: rnd(g.wirkung, 1),
        wirkung_unten_w: rnd(g.wirkung_unten, 1),
        wirkung_oben_w: rnd(g.wirkung_oben, 1),
        anteil: rnd(gruppenanteil * innen, 4),
        beleg: g.beleg, quelle: g.quelle,
        herleitung: g.herleitung, empfehlung: g.empfehlung,
        typologieklasse: g.typologieklasse || null,
        gekappt: !!g.gekappt,
      };
    }).sort(function (a, b) { return b.anteil - a.anteil || b.wirkung_w - a.wirkung_w; });

    /* --- 5.5  Hinweise -------------------------------------------------- */
    const hinweise = [];
    if (!groessen.length) {
      hinweise.push("Keine Größe ist als Annahme gekennzeichnet. Die Spanne ist "
        + "deshalb null. Das heißt nicht, dass das Ergebnis exakt ist: die "
        + "Unsicherheit des Rechenmodells selbst wird hier nicht beziffert.");
    }
    const ohneWirkung = beitraege.filter(function (b) { return b.wirkung_w < 0.5; });
    if (ohneWirkung.length) {
      hinweise.push("Ohne messbare Wirkung auf das Ergebnis: "
        + ohneWirkung.map(function (b) { return b.label; }).join(", ")
        + ". Diese Größen nachzumessen bringt nichts.");
    }
    const typologisch = beitraege.filter(function (b) { return b.art === "u_wert_typologie"; });
    if (typologisch.length) {
      hinweise.push("Die Spanne der Typologiewerte deckt ab, wie ein Bauteil dieser "
        + "Baualtersklasse gebaut sein kann. Sie deckt NICHT ab, ob es "
        + "zwischenzeitlich gedämmt wurde. Eine nachträgliche Dämmung liegt "
        + "außerhalb dieser Spanne und ist am Objekt zu klären: "
        + typologisch.slice(0, 4).map(function (b) { return b.label; }).join(", ")
        + (typologisch.length > 4 ? " und weitere" : "") + ".");
      /* DIE ZWEITE LUECKE DERSELBEN SPANNE, und die groessere.
         Die Streuung oben gilt INNERHALB einer Baualtersklasse. Welche Klasse
         ueberhaupt gilt, entscheidet das Baujahr -- und ist es angenommen,
         steht diese Entscheidung vollstaendig ausserhalb der Spanne. Wer die
         Spanne fuer die Gesamtunsicherheit haelt, liest an der groessten
         Unsicherheit vorbei. Beziffert wird sie in KERN_BAUJAHRPROBE; hier
         steht der Verweis, damit die Spanne nicht mehr verspricht, als sie
         haelt. */
      if (opt.baujahr_angenommen === true) {
        hinweise.push("Diese Spanne deckt auch die WAHL der Baualtersklasse nicht "
          + "ab. Das Baujahr ist angenommen, nicht belegt; eine andere Klasse "
          + "verschiebt das Ergebnis um ein Vielfaches der hier gezeigten Breite. "
          + "Wie viel genau, steht in der Gegenrechnung zum Baujahr.");
      }
    }
    const gekappt = beitraege.filter(function (b) { return b.gekappt; });
    if (gekappt.length) {
      hinweise.push("Bei " + gekappt.length + " Größe(n) wurde die Streuung auf "
        + "±" + Math.round(KAPPUNG * 100) + " Prozent gekappt. Ein Wert mit größerer "
        + "Streuung ist keine Annahme mehr, sondern eine Lücke, und gehört als "
        + "offene Frage in den Bericht.");
    }

    const punkt_kw = punkt / 1000, u_kw = unten / 1000, o_kw = oben / 1000;
    return {
      ok: true,
      groesse: feld,
      punkt_w: rnd(punkt, 1),
      unten_w: rnd(unten, 1),
      oben_w: rnd(oben, 1),
      spanne_w: rnd(oben - unten, 1),
      halbspanne_w: rnd(halbspanne, 1),
      relativ: rnd(relativ, 4),
      stufe: stufeAus(relativ),
      text: groessen.length
        ? de(punkt_kw, 1) + " kW, geschätzte Spanne " + de(u_kw, 1) + " bis "
          + de(o_kw, 1) + " kW"
        : de(punkt_kw, 1) + " kW, alle Eingangsgrößen belegt",
      beitraege: beitraege,
      gruppen: Object.keys(gruppen).map(function (k) {
        return { korrelation: k, anzahl: gruppen[k].anzahl,
                 unten_w: rnd(gruppen[k].unten, 1), oben_w: rnd(gruppen[k].oben, 1) };
      }).sort(function (a, b) { return (b.oben_w - b.unten_w) - (a.oben_w - a.unten_w); }),
      hinweise: hinweise,
      anzahl_groessen: groessen.length,
      laeufe: laeufe,
      ms: rnd(jetzt() - t0, 1),
    };
  }

  /* ------------------------------------------------------------------ *
   * 6  Gegenprobe: hält die Linearität, auf der das Verfahren beruht?
   * ------------------------------------------------------------------ *
   * Es werden Zufallslagen gezogen — je Korrelationsgruppe ein gemeinsamer
   * Faktor t in [-1, 1], wie es die Gruppenlogik vorsieht — und die gerechnete
   * Heizlast mit der linearen Vorhersage verglichen. Bleibt die Abweichung
   * klein, ist die Zwei-Punkt-Auswertung nicht nur schnell, sondern richtig.
   * Diese Probe läuft NICHT bei jeder Eingabe, sondern im Selbsttest und auf
   * ausdrücklichen Wunsch.
   * ------------------------------------------------------------------ */
  function gegenprobe(projekt, optionen, anzahl) {
    const opt = optionen || {};
    const K = holeKern(opt);
    const feld = opt.groesse || "phi_gebaeude";
    const p = projekt || {};
    const n = anzahl || 60;
    const punkt = zahl(K.rechne(p)[feld], 0);
    const groessen = sammle(p, opt);
    if (!groessen.length) return { ok: true, abweichung_max: 0, laeufe: 0 };

    /* Einzelwirkungen einmal bestimmen (dieselben 2n Läufe wie oben) */
    groessen.forEach(function (g) {
      const pu = kopie(p); g.anwenden(pu, g.min_faktor);
      const po = kopie(p); g.anwenden(po, g.max_faktor);
      g.wirkung_unten = zahl(K.rechne(pu)[feld], 0) - punkt;
      g.wirkung_oben = zahl(K.rechne(po)[feld], 0) - punkt;
    });

    /* einfacher, reproduzierbarer Zufall — kein Math.random, damit der
       Selbsttest bei jedem Lauf dasselbe Ergebnis liefert */
    let saat = 20260821;
    const wuerfel = function () {
      saat = (saat * 1103515245 + 12345) % 2147483648;
      return saat / 2147483648;
    };

    const gruppen = {};
    groessen.forEach(function (g) { gruppen[g.korrelation] = true; });
    const namen = Object.keys(gruppen);

    let maxAbw = 0, laeufe = 0;
    for (let i = 0; i < n; i++) {
      const t = {};
      namen.forEach(function (k) { t[k] = wuerfel() * 2 - 1; });
      const pv = kopie(p);
      let vorhersage = punkt;
      groessen.forEach(function (g) {
        const tk = t[g.korrelation];
        const faktor = tk >= 0 ? 1 + tk * (g.max_faktor - 1) : 1 + (-tk) * (g.min_faktor - 1);
        g.anwenden(pv, faktor);
        vorhersage += tk >= 0 ? tk * g.wirkung_oben : (-tk) * g.wirkung_unten;
      });
      const ist = zahl(K.rechne(pv)[feld], 0);
      laeufe++;
      const abw = punkt > 0 ? Math.abs(ist - vorhersage) / punkt : 0;
      if (abw > maxAbw) maxAbw = abw;
    }
    return { ok: true, abweichung_max: rnd(maxAbw, 5), laeufe: laeufe, punkt_w: rnd(punkt, 1) };
  }

  /* ------------------------------------------------------------------ *
   * 7  Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    const K = holeKern(null);
    const typo = holeTypologie(null);
    if (!K) return { ok: false, fehler: ["Rechenkern nicht erreichbar"], anzahl: 0 };
    const opt = { kern: K, typologie: typo };

    /* --- Grundprojekt: ein Raum, eine Wand, alles belegt --------------- */
    function basis() {
      return {
        meta: { baujahr: 1936 },
        klima: { theta_e: -10, theta_e_m: 10 },
        norm: { delta_u_wb: 0.10, wb_nachweis: true },
        luftdichtheit: { n50: 3.0, kategorie: "messung" },
        bauteiltypen: [{ id: "t1", name: "Außenwand", U: 1.0, belegt: true }],
        raeume: [{
          id: "r1", name: "Prüfraum", art: "wohnen", we: "WE", theta_i: 20,
          /* h_belegt: sonst brächte allein die Raumhöhe eine Spanne mit und
             „alles belegt" wäre nicht mehr herstellbar. Genau darum geht es
             in T1: ein Projekt OHNE jede Annahme. */
          A: 20, h: 2.5, V: 50, n_min: 0.5, n_exponiert: 1, h_belegt: true,
          bauteile: [
            { typ_id: "t1", name: "Außenwand", A: 30, U: 1.0, grenzt_an: { typ: "aussen" } },
          ],
        }],
      };
    }

    /* --- T1  Kein Annahme, keine Spanne -------------------------------- */
    const r1 = rechne(basis(), opt);
    if (r1.anzahl_groessen !== 0) f.push("T1 belegtes Projekt darf keine Größe sammeln");
    if (Math.abs(r1.spanne_w) > 1e-9) f.push("T1 Spanne muss null sein, ist " + r1.spanne_w);
    if (r1.stufe !== "schmal") f.push("T1 Stufe muss schmal sein");
    if (!/alle Eingangsgrößen belegt/.test(r1.text)) f.push("T1 Text muss die Belegtheit nennen");
    if (r1.laeufe !== 1) f.push("T1 ohne Annahme genau ein Lauf, sind " + r1.laeufe);

    /* --- T2  Eine Annahme öffnet die Spanne ---------------------------- */
    const p2 = basis(); p2.bauteiltypen[0].belegt = false;
    const r2 = rechne(p2, opt);
    if (r2.anzahl_groessen !== 1) f.push("T2 muss genau eine Größe finden");
    if (!(r2.spanne_w > 0)) f.push("T2 Spanne muss größer null sein");
    if (r2.laeufe !== 3) f.push("T2 muss 3 Läufe brauchen, sind " + r2.laeufe);
    /* Wirkung nachrechnen: A=30, dTheta=30, U +-13,7 %; der Zuschlag 0,10
       bleibt stehen, wandert also nicht mit. */
    const sollHalb = 30 * (1.0 * STREUUNG_BAUART) * 30;
    if (Math.abs(r2.halbspanne_w - sollHalb) > 0.5) {
      f.push("T2 halbe Spanne ist " + r2.halbspanne_w + ", soll " + rnd(sollHalb, 1));
    }
    if (!/geschätzte Spanne/.test(r2.text)) f.push("T2 Text muss die Spanne nennen");

    /* --- T3  Mehr Annahmen verbreitern die Spanne ---------------------- */
    const p3 = basis();
    p3.bauteiltypen[0].belegt = false;
    p3.norm.wb_nachweis = false;                     // zweite, unabhängige Größe
    const r3 = rechne(p3, opt);
    if (!(r3.spanne_w > r2.spanne_w)) {
      f.push("T3 zweite Annahme muss verbreitern: " + r3.spanne_w + " gegen " + r2.spanne_w);
    }
    const p3b = kopie(p3);
    p3b.raeume[0].h_annahme = true;                  // dritte Größe
    const r3b = rechne(p3b, opt);
    if (!(r3b.spanne_w > r3.spanne_w)) {
      f.push("T3b dritte Annahme muss weiter verbreitern");
    }

    /* --- T4  Quadratisch zwischen Gruppen, linear innerhalb ------------ */
    /* zwei gleich große U-Werte-Annahmen derselben Gruppe: linear, also
       doppelte Wirkung; nicht Wurzel zwei. */
    const p4 = basis();
    p4.bauteiltypen = [
      { id: "t1", name: "Außenwand", U: 1.0, belegt: false },
      { id: "t2", name: "Außenwand Giebel", U: 1.0, belegt: false },
    ];
    p4.raeume[0].bauteile = [
      { typ_id: "t1", name: "Außenwand", A: 30, U: 1.0, grenzt_an: { typ: "aussen" } },
      { typ_id: "t2", name: "Außenwand Giebel", A: 30, U: 1.0, grenzt_an: { typ: "aussen" } },
    ];
    const r4 = rechne(p4, opt);
    if (Math.abs(r4.halbspanne_w - 2 * sollHalb) > 1.0) {
      f.push("T4 gleiche Gruppe muss linear addieren: " + r4.halbspanne_w
        + ", soll " + rnd(2 * sollHalb, 1));
    }

    /* --- T5  Reihenfolge der Beiträge ---------------------------------- */
    /* Wand A ist zehnmal so groß wie Wand B, sonst gleich. A muss oben stehen
       und rund zehnmal so viel beitragen. */
    const p5 = basis();
    p5.bauteiltypen = [
      { id: "gross", name: "Außenwand groß", U: 1.0, belegt: false },
      { id: "klein", name: "Außenwand klein", U: 1.0, belegt: false },
    ];
    p5.raeume[0].bauteile = [
      { typ_id: "klein", name: "Außenwand klein", A: 3, U: 1.0, grenzt_an: { typ: "aussen" } },
      { typ_id: "gross", name: "Außenwand groß", A: 30, U: 1.0, grenzt_an: { typ: "aussen" } },
    ];
    const r5 = rechne(p5, opt);
    if (r5.beitraege.length !== 2) f.push("T5 muss zwei Beiträge liefern");
    else {
      if (r5.beitraege[0].id.indexOf("gross") < 0) {
        f.push("T5 die große Wand muss vorn stehen, vorn steht " + r5.beitraege[0].id);
      }
      const v = r5.beitraege[0].anteil / r5.beitraege[1].anteil;
      if (Math.abs(v - 10) > 0.3) f.push("T5 Verhältnis der Anteile ist " + rnd(v, 2) + ", soll 10");
      const summe = r5.beitraege.reduce(function (s, b) { return s + b.anteil; }, 0);
      if (Math.abs(summe - 1) > 0.001) f.push("T5 Anteile müssen sich zu eins summieren, sind " + rnd(summe, 4));
    }

    /* --- T6  n50 ohne Wirkung wird als solches erkannt ----------------- */
    const p6 = basis();
    p6.luftdichtheit = { n50: 4.0, kategorie: "annahme" };   // e = 0,02 -> 0,16/h < 0,5/h
    const r6 = rechne(p6, opt);
    const b6 = r6.beitraege.find(function (b) { return b.art === "n50_ohne_messung"; });
    if (!b6) f.push("T6 n50 ohne Messung muss gesammelt werden");
    else if (Math.abs(b6.wirkung_w) > 0.5) {
      f.push("T6 bei maßgebendem Mindestluftwechsel darf n50 nicht wirken, wirkt " + b6.wirkung_w);
    }
    if (!r6.hinweise.some(function (h) { return /Ohne messbare Wirkung/.test(h); })) {
      f.push("T6 die Wirkungslosigkeit muss als Hinweis erscheinen");
    }

    /* --- T7  Einseitige Bandbreite der genäherten Wandfläche ----------- */
    const p7 = basis();
    p7.raeume[0].bauteile[0].naeherung = "umfang_aus_grundflaeche";
    const r7 = rechne(p7, opt);
    if (Math.abs(r7.unten_w - r7.punkt_w) > 0.5) {
      f.push("T7 die Näherung kann nur zu klein sein, unten muss der Punktwert stehen");
    }
    if (!(r7.oben_w > r7.punkt_w)) f.push("T7 nach oben muss die Spanne offen sein");

    /* --- T8  Fenster wird gegen die Wand gerechnet --------------------- */
    const p8 = basis();
    p8.raeume[0].bauteile.push({
      name: "Fenster", A: 3, U: 1.3, grenzt_an: { typ: "aussen" }, A_annahme: true,
    });
    p8.raeume[0].bauteile[0].A = 27;
    const r8 = rechne(p8, opt);
    const b8 = r8.beitraege.find(function (b) { return b.art === "fensterflaeche_geschaetzt"; });
    if (!b8) f.push("T8 geschätzte Fensterfläche muss gesammelt werden");
    else {
      /* Wirksam ist nur der Unterschied der U-Werte, nicht die ganze Fläche.
         Ohne Gegenrechnung wäre die Wirkung um ein Vielfaches größer. */
      const ohneGegenrechnung = 3 * 0.25 * (1.3 + 0.10) * 30;
      if (!(b8.wirkung_w < ohneGegenrechnung * 0.5)) {
        f.push("T8 die Wandfläche wird nicht gegengerechnet: " + b8.wirkung_w);
      }
    }

    /* --- T9  Typologie: Bandbreite kommt aus der Tabelle --------------- */
    if (typo) {
      const s = typologieStreuung(1936, "wand", typo);
      if (!s || s.klasse !== "EFH_C") f.push("T9 Baujahr 1936 muss auf EFH_C führen");
      /* Nachbarn von EFH_C in der Spalte wand: 1,7 (B) und 1,4 (D), eigener
         Wert 1,7 -> halbe Spanne 0,15/1,7 = 8,8 % */
      if (!s || Math.abs(s.halb - 0.15 / 1.7) > 0.001) {
        f.push("T9 Nachbarstreuung wand/EFH_C ist " + (s ? rnd(s.halb, 4) : "?") + ", soll 0,0882");
      }
      const p9 = basis();
      p9.bauteiltypen[0].herkunft = "typologie";
      const r9 = rechne(p9, opt);
      const b9 = r9.beitraege[0];
      const sollF = Math.sqrt(Math.pow(0.15 / 1.7, 2) + STREUUNG_BAUART * STREUUNG_BAUART);
      if (!b9 || Math.abs((1 - b9.min_faktor) - sollF) > 0.001) {
        f.push("T9 zusammengesetzte Streuung ist " + (b9 ? rnd(1 - b9.min_faktor, 4) : "?")
          + ", soll " + rnd(sollF, 4));
      }
      if (!r9.hinweise.some(function (h) { return /gedämmt/.test(h); })) {
        f.push("T9 die Sanierungsfrage muss als eigener Hinweis erscheinen");
      }
      /* T9b  Ist das Baujahr angenommen, muss die Spanne sagen, dass sie
              die Wahl der Klasse NICHT abdeckt -- und sie darf es nicht
              sagen, wenn das Baujahr belegt ist. Ein Hinweis, der immer
              dasteht, wird nicht gelesen. */
      if (r9.hinweise.some(function (h) { return /WAHL der Baualtersklasse/.test(h); })) {
        f.push("T9b bei belegtem Baujahr gehört der Klassenhinweis nicht dazu");
      }
      const r9b = rechne(p9, Object.assign({ baujahr_angenommen: true }, opt));
      if (!r9b.hinweise.some(function (h) { return /WAHL der Baualtersklasse/.test(h); })) {
        f.push("T9b bei angenommenem Baujahr fehlt der Klassenhinweis");
      }
      if (Math.abs(r9b.spanne_w - r9.spanne_w) > 0.01) {
        f.push("T9b der Hinweis darf die Spanne nicht verändern");
      }
    } else {
      f.push("T9 Typologiedaten nicht erreichbar");
    }

    /* --- T10  Gerechnete Streuungen ------------------------------------ */
    if (Math.abs(STREUUNG_BAUART - 0.1365) > 0.002) {
      f.push("T10 Mauerwerksstreuung ist " + rnd(STREUUNG_BAUART, 4) + ", soll rd. 0,1365");
    }
    if (Math.abs(STREUUNG_UMFANG - 0.1547) > 0.002) {
      f.push("T10 Umfangsstreuung ist " + rnd(STREUUNG_UMFANG, 4) + ", soll rd. 0,1547");
    }

    /* --- T11  Das Projekt wird nicht verändert -------------------------- */
    const p11 = basis(); p11.bauteiltypen[0].belegt = false;
    const vorher = JSON.stringify(p11);
    rechne(p11, opt);
    if (JSON.stringify(p11) !== vorher) f.push("T11 das übergebene Projekt wurde verändert");

    /* --- T12  Laufzeit an einem Projekt in Referenzgröße ---------------- */
    const gross = grossesProjekt();
    const t0 = jetzt();
    const r12 = rechne(gross, { kern: K, typologie: typo, u_werte_als_annahme: "typologie" });
    const dauer = jetzt() - t0;
    if (!(r12.anzahl_groessen >= 8)) {
      f.push("T12 zu wenige Größen gefunden: " + r12.anzahl_groessen);
    }
    /* Vorgabe: unter 250 ms, damit die Auswertung an jeder Eingabe hängen
       kann, ohne dass die Oberfläche stockt. */
    if (dauer > 250) {
      f.push("T12 Laufzeit " + rnd(dauer, 0) + " ms über der Vorgabe von 250 ms");
    }
    if (r12.laeufe !== 1 + 2 * r12.anzahl_groessen) {
      f.push("T12 Anzahl der Läufe stimmt nicht: " + r12.laeufe);
    }

    /* --- T13  Gegenprobe: die Linearität trägt -------------------------- */
    const gp = gegenprobe(gross, { kern: K, typologie: typo, u_werte_als_annahme: "typologie" }, 40);
    /* 2 Prozent: Vorgabe. Darüber wäre die Zwei-Punkt-Auswertung nicht mehr
       zulässig und es müsste auf ein Zufallsverfahren umgestellt werden. */
    if (!(gp.abweichung_max < 0.02)) {
      f.push("T13 lineare Vorhersage weicht um " + rnd(gp.abweichung_max * 100, 2)
        + " Prozent ab, zulässig sind 2 Prozent");
    }

    /* --- T14  Stufen ---------------------------------------------------- */
    if (stufeAus(0.05) !== "schmal" || stufeAus(0.18) !== "mittel"
        || stufeAus(0.40) !== "breit") {
      f.push("T14 Stufeneinteilung stimmt nicht");
    }

    /* --- T15  Die Raumhöhe kommt IMMER in die Spanne --------------------
     *
     * Der Befund, der zu diesem Test führte: eine aus dem Schnitt gelesene
     * Höhe stand unter keiner der 30 Größen der Bandbreite. Dieselbe Höhe
     * einen halben Meter kleiner ergab am Referenzfall −14,9 Prozent, und die
     * gedruckte Spanne schloss den richtigen Wert dabei aus. Geprüft wird
     * hier dreierlei: dass eine gelesene Höhe eine Spanne bekommt, dass die
     * Klammer aus den Höhenkoten enger ist als das bauordnungsrechtliche Maß,
     * und dass ein Raum ohne jedes Kennzeichen NICHT stillschweigend als
     * belegt durchgeht. */
    const p15 = basis();
    delete p15.raeume[0].h_belegt;                    // gelesen, nichts hält sie
    const r15 = rechne(p15, opt);
    const b15 = r15.beitraege.find(function (b) { return b.art === "raumhoehe_ohne_klammer"; });
    if (!b15) f.push("T15 eine gelesene Höhe ohne Klammer muss in die Spanne");
    else if (Math.abs((1 - b15.min_faktor) - 0.10) > 0.001) {
      f.push("T15 ohne Klammer gilt das MBO-Maß ±10 %, ist "
        + rnd(1 - b15.min_faktor, 4));
    }
    if (!(r15.spanne_w > 0)) f.push("T15 die Höhe allein muss eine Spanne öffnen");

    const p15b = basis();
    delete p15b.raeume[0].h_belegt;
    p15b.raeume[0].geschoss = "EG";
    p15b.raeume[0].h_geschosshoehe = 2.74;            // aus den Höhenkoten
    const r15b = rechne(p15b, opt);
    const b15b = r15b.beitraege.find(function (b) { return b.art === "raumhoehe_geklammert"; });
    if (!b15b) f.push("T15b mit belegter Geschosshöhe muss die Klammer greifen");
    else {
      /* lichte Höhe 2,50 m, Geschosshöhe 2,74 m, Deckenpaket 0,10 bis 0,60 m
         -> zulässig 2,14 bis 2,64 m -> Faktoren 0,856 bis 1,056 */
      const Zt = holeZuordnung(null);
      const dmin = Zt ? zahl(Zt.MIN_DECKENPAKET, 0.10) : 0.10;
      const dmax = Zt ? zahl(Zt.MAX_DECKENPAKET, 0.60) : 0.60;
      const sollMin = (2.74 - dmax) / 2.5, sollMax = (2.74 - dmin) / 2.5;
      if (Math.abs(b15b.min_faktor - sollMin) > 0.002
          || Math.abs(b15b.max_faktor - sollMax) > 0.002) {
        f.push("T15b Klammer ist " + b15b.min_faktor + ".." + b15b.max_faktor
          + ", soll " + rnd(sollMin, 3) + ".." + rnd(sollMax, 3));
      }
      /* Die Klammer aus den Koten ist nicht SCHMALER als das MBO-Maß — beide
         sind 0,50 m breit —, sie ist an DIESES Gebäude gehängt statt an die
         Bauordnung. Also muss sie der Geschosshöhe folgen: ein niedrigeres
         Geschoss ergibt eine niedrigere Klammer. Wäre sie das nicht, wäre der
         Schnitt umsonst gelesen. */
      const p15d = basis();
      delete p15d.raeume[0].h_belegt;
      p15d.raeume[0].h = 2.2;
      p15d.raeume[0].h_geschosshoehe = 2.40;
      const b15d = rechne(p15d, opt).beitraege.find(function (b) {
        return b.art === "raumhoehe_geklammert"; });
      if (!b15d || !(b15d.max_faktor * 2.2 < b15b.max_faktor * 2.5)) {
        f.push("T15b die Klammer muss der belegten Geschosshöhe folgen");
      }
    }
    /* Eine angenommene Höhe bleibt eine angenommene Höhe, auch wenn eine
       Geschosshöhe danebensteht. */
    const p15c = basis();
    delete p15c.raeume[0].h_belegt;
    p15c.raeume[0].h_annahme = true;
    p15c.raeume[0].h_geschosshoehe = 2.74;
    if (!rechne(p15c, opt).beitraege.some(function (b) {
      return b.art === "raumhoehe_annahme"; })) {
      f.push("T15c eine angenommene Höhe muss als solche geführt werden");
    }

    /* --- T22  Eine verteilte Flaeche laeuft mit eigener Spanne mit -----
     * Kundenbefund Soethe, 26.08.2026: die Flaechen kommen aus den
     * Aussenmassen und sind damit die schwaechste Groesse der Rechnung. Sie
     * muessen als solche in der Bandbreite stehen -- mit der Spanne, die der
     * Vorschlag mitbringt, nicht mit der Setzung fuer gelesene Flaechen. */
    const pv = basis();
    pv.raeume[0].A_annahme = true;
    pv.raeume[0].A_vorschlag = { wert: 20, art: "verteilung", quelle: "Probe" };
    pv.raeume[0].A_spanne = [14, 28];
    const gv = sammle(pv, opt);
    const bv = gv.find(function (x) { return x.id === "a_r1"; });
    if (!bv) f.push("T22: die verteilte Flaeche fehlt in der Bandbreite");
    if (bv && bv.art !== "raumflaeche_verteilt") {
      f.push("T22: eine verteilte Flaeche ist keine bloss unsichere Flaeche");
    }
    if (bv && !(Math.abs(bv.min_faktor - 0.70) < 1e-9
                && Math.abs(bv.max_faktor - 1.40) < 1e-9)) {
      f.push("T22: die Spanne des Vorschlags muss unveraendert durchschlagen");
    }
    /* Jenseits der Kappung wird geklemmt, nicht Genauigkeit vorgetaeuscht. */
    const pk = basis();
    pk.raeume[0].A_annahme = true;
    pk.raeume[0].A_vorschlag = { wert: 20, art: "verteilung" };
    pk.raeume[0].A_spanne = [4, 60];
    const bk = sammle(pk, opt).find(function (x) { return x.id === "a_r1"; });
    if (!bk || bk.max_faktor !== 1.5 || bk.min_faktor !== 0.5 || !bk.gekappt) {
      f.push("T22: eine Spanne jenseits von +-50 Prozent wird gekappt und gesagt");
    }
    /* Ohne eigene Spanne bleibt der gemessene Median des Regelfehlers. */
    const pv2 = basis();
    pv2.raeume[0].A_annahme = true;
    pv2.raeume[0].A_vorschlag = { wert: 20, art: "verteilung" };
    const bv2 = sammle(pv2, opt).find(function (x) { return x.id === "a_r1"; });
    if (!bv2 || Math.abs(bv2.max_faktor - 1.14) > 0.001) {
      f.push("T22: ohne eigene Spanne gelten die gemessenen 14,0 Prozent");
    }
    /* Eine bloss unsichere Flaeche bleibt bei ihrer eigenen Zeile. */
    const pu = basis();
    pu.raeume[0].A_annahme = true;
    const bu = sammle(pu, opt).find(function (x) { return x.id === "a_r1"; });
    if (!bu || bu.art !== "raumflaeche_unsicher") {
      f.push("T22: ohne Vorschlagskennzeichen bleibt es bei raumflaeche_unsicher");
    }

    return { ok: f.length === 0, fehler: f, anzahl: 27 };
  }

  /** Ein Projekt in der Größenordnung des Referenzfalls: 18 Räume, drei
   *  Geschosse, eine unbeheizte Zone. Dient allein der Laufzeitmessung. */
  function grossesProjekt() {
    const p = {
      meta: { baujahr: 1936 },
      klima: { theta_e: -9.6, theta_e_m: 10.1 },
      norm: { delta_u_wb: 0.10 },
      luftdichtheit: { n50: 4.0, kategorie: "annahme" },
      zonen: [{
        id: "keller", name: "Keller", modus: "bilanz",
        huelle: [
          { name: "Kellerwand über Gelände", A: 21.3, U: 1.6, grenzt_an: { typ: "aussen" } },
          { name: "Kellerboden", A: 73.0, U: 0.35, grenzt_an: { typ: "fest", theta: 7.0 } },
        ],
      }],
      raeume: [],
    };
    ["EG", "OG", "DG"].forEach(function (g) {
      for (let i = 1; i <= 6; i++) {
        p.raeume.push({
          id: g + "_" + i, geschoss: g, name: "Raum " + i, art: "wohnen", we: "WE " + g,
          theta_i: 20, A: 14, h: 2.75, V: 38.5, n_min: 0.5, n_exponiert: 2,
          bauteile: [
            { name: "Außenwand", A: 12, U: 0.47, grenzt_an: { typ: "aussen" } },
            { name: "Fenster", A: 2.4, U: 0.95, grenzt_an: { typ: "aussen" } },
            { name: "Kellerdecke", A: 14, U: 0.29, grenzt_an: { typ: "zone", ref: "keller" } },
            { name: "Innenwand gegen Treppenhaus", A: 6.3, U: 1.3,
              grenzt_an: { typ: "fest", theta: 15 }, kat: "innen" },
          ],
        });
      }
    });
    return p;
  }

  /* ------------------------------------------------------------------ *
   * 8  Export
   * ------------------------------------------------------------------ */
  return {
    rechne: rechne,
    sammle: sammle,
    gegenprobe: gegenprobe,
    selbsttest: selbsttest,
    GROESSENARTEN: GROESSENARTEN,
    STREUUNG_BAUART: STREUUNG_BAUART,
    STREUUNG_UMFANG: STREUUNG_UMFANG,
    KAPPUNG: KAPPUNG,
    typologieStreuung: typologieStreuung,
    typologieKategorie: typologieKategorie,
    stufeAus: stufeAus,
    version: "1.0.0",
  };
});
