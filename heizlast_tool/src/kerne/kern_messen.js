/* ===========================================================================
 * kern_messen.js — Rechnen hinter dem Messwerkzeug im Plan
 * ===========================================================================
 * Warum es dieses Modul gibt:
 * Der Maßstab soll immer zuerst aus der Unterlage selbst kommen. Gelingt das
 * nicht, bleibt der letzte Weg: der Bearbeiter zieht im Plan eine Strecke über
 * etwas, dessen Länge er kennt, und trägt diese Länge ein. Aus Bildpunkten und
 * Metern folgt der Maßstab.
 *
 * Dieser Weg ist NICHT beliebig genau. Jeder der beiden Klicks sitzt nur so
 * genau, wie Zeiger, Strichbreite und Bildauflösung es zulassen. Über eine
 * kurze Strecke wirkt sich derselbe absolute Klickfehler viel stärker aus als
 * über eine lange. Genau das rechnet dieses Modul aus und sagt es weiter,
 * damit niemand einen an einer 40 Bildpunkte langen Wand abgegriffenen
 * Maßstab für gemessen hält.
 *
 * Herleitung der Genauigkeitsschwelle
 * -----------------------------------
 *   1  Klickfehler. Der Zeiger lässt sich auf den Bildschirmpunkt genau
 *      setzen; die Linie im Plan, auf die gezielt wird, ist am Bildschirm
 *      aber zwei bis drei Punkte breit, ihre Mitte also nur auf etwa einen
 *      Punkt genau zu treffen. Angesetzt: 1,5 Bildschirmpunkte je Klick.
 *      Das ist eine begründete Annahme, keine Messung.
 *   2  Auflösungsgrenze. Vergrößern hilft nur, solange Bildpunkte da sind.
 *      Unter einem Bildpunkt des Bildes ist keine Kante zu lokalisieren,
 *      gleich wie weit aufgezogen wird. Angesetzte Untergrenze: 1 Bildpunkt
 *      des Bildes. Deshalb sinkt die Unsicherheit beim Hineinzoomen nur bis
 *      zu dieser Grenze und nicht weiter.
 *   3  Zwei Klicks, unabhängig voneinander → Streckenfehler = Wurzel(2) mal
 *      Klickfehler.
 *   4  Der Maßstab geht linear mit der Strecke, die Fläche mit dem Quadrat.
 *      Eine Unsicherheit von einem Prozent im Maßstab sind zwei Prozent in
 *      jeder Fläche und damit rund zwei Prozent in der Heizlast.
 *   5  Wo liegt die Schwelle? Nicht frei gewählt, sondern aus der bereits
 *      vorhandenen Gegenprobe abgeleitet: kern_massstabsprobe.js lässt
 *      zwischen zwei unabhängigen Maßketten zwei Prozent Abweichung zu und
 *      sperrt darüber. Zwei unabhängige Messungen streuen mit Wurzel(2) mal
 *      der Einzelunsicherheit; damit reines Klickrauschen diese Sperre nicht
 *      auslöst, muss gelten
 *              2 · Wurzel(2) · u  ≤  2 %   (zwei Sigma, rund 95 Prozent)
 *      also u ≤ 0,71 Prozent. Eingesetzt:
 *              Länge ≥ Wurzel(2) · 1,5 / 0,00707 ≈ 300 Bildschirmpunkte.
 *      Das ist die Schwelle "gut". Sie ist nicht gegriffen, sie folgt aus
 *      der Toleranz, mit der die Gegenprobe ohnehin arbeitet.
 *   6  Zweite Schwelle: bis zwei Prozent Maßstabsunsicherheit (vier Prozent
 *      Fläche) ist eine Messung noch brauchbar, aber ausdrücklich als
 *      unsicher zu kennzeichnen. Das entspricht rund 105 Bildschirmpunkten.
 *      Darunter wird die Messung nicht angenommen.
 *
 * DOM-frei, ohne Abhängigkeiten, in Node und im Browser lauffähig.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_MESSEN = M;
})(this, function () {

  /* --- angesetzte Größen, siehe Herleitung im Kopf ----------------------- */
  const KLICKFEHLER_SCHIRM_PX = 1.5;   // je Klick, Bildschirmpunkte (Annahme)
  const KLICKFEHLER_BILD_PX = 1.0;     // Untergrenze, Bildpunkte des Bildes
  const WURZEL2 = Math.SQRT2;

  /* aus der 2-Prozent-Toleranz von kern_massstabsprobe.js abgeleitet */
  const GATE_KETTEN = 0.02;                       // dort zulässige Abweichung
  const U_ZIEL = GATE_KETTEN / (2 * WURZEL2);     // 0,00707
  const U_GRENZE = 0.02;                          // darunter noch brauchbar

  const rnd = (x, n) => Math.round(x * Math.pow(10, n || 0)) / Math.pow(10, n || 0);
  /* Zahl mit Hauptwort in der richtigen Zahlform. „1 Räume", „1 Seiten":
     ein Zähler, der nicht zählen kann, macht misstrauisch gegen jede
     andere Zahl auf dem Blatt. mz(1, "Raum", "Räume") -> "1 Raum". */
  const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);
  const de = function (x, n) {
    const s = (Math.abs(x) < 1e4 ? rnd(x, n) : Math.round(x)).toFixed(n === undefined ? 2 : n);
    return s.replace(".", ",");
  };

  /* --- Bezugsmaße: was der Bearbeiter als bekannte Länge nehmen kann -----
   * Die Normmaße kommen aus kern_massstabsprobe.js, damit Messwerkzeug und
   * Gegenprobe nicht zwei verschiedene Listen führen. */
  function probeModul() {
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      try { return require("./kern_massstabsprobe.js"); } catch (e) { return null; }
    }
    if (typeof window !== "undefined" && window.KERN_MASSSTABSPROBE) {
      return window.KERN_MASSSTABSPROBE;
    }
    return null;
  }

  /**
   * Auswahl bekannter Längen, absteigend nach Güte des Belegs.
   * u_abs_m ist die Unsicherheit des Bezugsmaßes selbst, nicht die des Klicks.
   * Bei angeschriebenen Maßen ist sie null: die Zahl im Plan gilt.
   */
  function bezugsmasse() {
    const P = probeModul() || {};
    return [
      { id: "masskette", titel: "Bemaßte Strecke im Plan", frei: true, u_abs_m: 0,
        hinweis: "Der beste Bezug. Die angeschriebene Maßzahl gilt als richtig, es "
          + "bleibt nur der Klickfehler. Möglichst die längste Kette des Blattes "
          + "nehmen, nicht ein kurzes Teilmaß." },
      { id: "wohnflaeche", titel: "Außenwandlänge aus der Wohnflächenberechnung",
        frei: true, u_abs_m: 0,
        hinweis: "Gleichwertig zur Maßkette, wenn die Länge aus einer Unterlage "
          + "stammt. Sie hat den Vorteil, dass sie über das ganze Blatt reicht." },
      { id: "tuer", titel: "Türbreite, Rohbaumaß", werte: P.TUERBREITEN || [], u_abs_m: 0.01,
        hinweis: "Rohbaubreiten nach DIN 18100. Angesetzt ist eine Rohbautoleranz "
          + "von rund ±10 mm; das sind bei 0,885 m schon 1,1 Prozent und damit "
          + "mehr, als eine lange Maßkette kostet. Nur nehmen, wenn nichts "
          + "bemaßt ist, und dann die Türart im Plan prüfen." },
      { id: "wand", titel: "Wanddicke, Rohbau", werte: P.WANDDICKEN || [], u_abs_m: 0.01,
        hinweis: "Notbehelf. Eine 24er Wand ist im Maßstab 1:100 rund zwei "
          + "Millimeter auf dem Papier; über eine so kurze Strecke wird der "
          + "Maßstab fast nie genau genug. Zum Gegenprüfen taugt sie, zum "
          + "Festlegen selten." },
      { id: "fenster", titel: "Fenstermaß aus dem Fensterverzeichnis", frei: true,
        u_abs_m: 0,
        hinweis: "Nur mit Beleg. Fenster sind nicht genormt; ein angenommenes "
          + "Fenstermaß ist geraten und kein Bezug." },
      { id: "sonst", titel: "Andere bekannte Länge", frei: true, u_abs_m: 0,
        hinweis: "Zum Beispiel ein am Objekt nachgemessenes Maß. Woher die Länge "
          + "stammt, gehört in den Bericht." },
    ];
  }

  /* ---------------------------------------------------------------------
   * Unsicherheit einer einzelnen Messung
   * ------------------------------------------------------------------ */
  /**
   * @param o.laenge_px_bild  gemessene Strecke in Bildpunkten des Bildes
   * @param o.zoom            Vergrößerung, mit der geklickt wurde (1 = 1:1)
   * @param o.u_abs_m         Unsicherheit des Bezugsmaßes in Metern
   * @param o.meter           Länge des Bezugsmaßes in Metern
   */
  function unsicherheit(o) {
    const e = o || {};
    const L = Number(e.laenge_px_bild) || 0;
    const zoom = Number(e.zoom) > 0 ? Number(e.zoom) : 1;
    if (!(L > 0)) return null;

    /* Klickfehler in Bildpunkten des Bildes. Hineinzoomen verkleinert ihn,
       aber nur bis zur Auflösungsgrenze des Bildes. */
    const sigma_bild = Math.max(KLICKFEHLER_SCHIRM_PX / zoom, KLICKFEHLER_BILD_PX);
    const u_klick = WURZEL2 * sigma_bild / L;

    const meter = Number(e.meter) || 0;
    const u_bezug = (meter > 0 && Number(e.u_abs_m) > 0) ? Number(e.u_abs_m) / meter : 0;

    const u = Math.sqrt(u_klick * u_klick + u_bezug * u_bezug);
    /* Der Vergleich braucht eine Winzigkeit Luft, sonst faellt genau die
       hergeleitete Grenzlaenge von 300 Punkten durch das Rundungsverhalten
       der Gleitkommazahlen auf die falsche Seite. */
    const knapp_drunter = (a, b) => a <= b * (1 + 1e-9);
    const stufe = knapp_drunter(u, U_ZIEL) ? "gut"
      : (knapp_drunter(u, U_GRENZE) ? "knapp" : "zu_kurz");

    /* Wie lang müsste die Strecke bei dieser Vergrößerung sein? Nur der
       Klickanteil ist über die Länge zu verbessern; steckt die Unsicherheit
       im Bezugsmaß, hilft keine längere Strecke. */
    const rest = U_ZIEL * U_ZIEL - u_bezug * u_bezug;
    const noetig_bild = rest > 0 ? WURZEL2 * sigma_bild / Math.sqrt(rest) : null;

    return {
      u_rel: u,
      u_klick_rel: u_klick,
      u_bezug_rel: u_bezug,
      u_flaeche_rel: 2 * u,          // Fläche geht mit dem Quadrat
      sigma_bild_px: sigma_bild,
      stufe: stufe,
      laenge_px_bild: L,
      laenge_px_schirm: L * zoom,
      noetig_px_bild: noetig_bild,
      noetig_px_schirm: noetig_bild == null ? null : noetig_bild * zoom,
      text: text(u, u_bezug, stufe, noetig_bild, zoom),
    };
  }

  function text(u, u_bezug, stufe, noetig_bild, zoom) {
    const t = "Unsicherheit des Maßstabs ±" + de(u * 100, 2) + " Prozent, "
      + "der Flächen daraus ±" + de(u * 200, 2) + " Prozent.";
    if (stufe === "gut") return t + " Das ist genau genug.";
    const wie = noetig_bild == null
      ? "Eine längere Strecke hilft hier nicht, die Unsicherheit steckt im Bezugsmaß. "
        + "Ein angeschriebenes Maß statt eines Normmaßes wäre der bessere Bezug."
      : "Mit rund " + Math.ceil(noetig_bild * zoom) + " Bildschirmpunkten wäre die "
        + "Schwelle erreicht: entweder eine längere Strecke wählen oder erst "
        + "hineinzoomen und dann klicken.";
    if (stufe === "knapp") return t + " Brauchbar, aber nicht abgesichert. " + wie;
    return t + " Zu ungenau, die Messung wird nicht übernommen. " + wie;
  }

  /* ---------------------------------------------------------------------
   * Umrechnungen
   * ------------------------------------------------------------------ */
  /** Bildpunkte je Meter aus gemessener Strecke und bekannter Länge. */
  function pxJeMeter(laenge_px_bild, meter) {
    const L = Number(laenge_px_bild), m = Number(meter);
    if (!(L > 0) || !(m > 0)) return null;
    return L / m;
  }

  /**
   * Maßstabsnenner aus Bildpunkten je Meter und der Auflösung, mit der das
   * Blatt gerendert wurde. Nur bei bekannter Auflösung möglich; bei einem
   * Foto ohne Blattbezug gibt es keinen Nenner, sondern nur Meter je Punkt.
   *
   *   Papierlänge eines Meters  =  px_je_meter / dpi · 25,4 mm
   *   Nenner                    =  1000 mm / Papierlänge
   */
  function nennerAusPxJeMeter(px_je_meter, dpi) {
    const p = Number(px_je_meter), d = Number(dpi);
    if (!(p > 0) || !(d > 0)) return null;
    return 1000 * d / (25.4 * p);
  }

  function pxJeMeterAusNenner(nenner, dpi) {
    const n = Number(nenner), d = Number(dpi);
    if (!(n > 0) || !(d > 0)) return null;
    return 1000 * d / (25.4 * n);
  }

  /** Auf einen gebräuchlichen Nenner runden, wenn er nah genug liegt. */
  const GEBRAEUCHLICH = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000];
  function nennerRunden(nenner, toleranz) {
    if (!(nenner > 0)) return null;
    const t = toleranz === undefined ? 0.03 : toleranz;
    let bester = null, beste = Infinity;
    GEBRAEUCHLICH.forEach(function (n) {
      const d = Math.abs(nenner - n) / n;
      if (d < beste) { beste = d; bester = n; }
    });
    return beste <= t ? { nenner: bester, abweichung: beste } : null;
  }

  /* ---------------------------------------------------------------------
   * Kreuzprobe: gemessener Maßstab gegen die Angabe im Schriftfeld
   * ---------------------------------------------------------------------
   * Warum das die wichtigste Probe dieses Werkzeugs ist:
   * Das Schriftfeld sagt, in welchem Maßstab GEZEICHNET wurde. Die Messung
   * sagt, in welchem Maßstab das Blatt JETZT vorliegt. Ein A1-Plan, der auf
   * A3 kopiert wurde, trägt weiter "M 1:100" im Schriftfeld und misst 1:200.
   * Jede der beiden Zahlen sieht für sich richtig aus. Auffallen kann der
   * Fehler nur, wenn zwei Wege gegeneinander laufen — und er verzieht sonst
   * jede Fläche im Projekt um den Faktor im Quadrat, ohne je aufzufallen.
   *
   * ZWEI GRENZEN, NICHT EINE. Das war der Fehler.
   *
   * Bis hierher gab es nur die zwei Prozent, mit denen zwei Messungen
   * UNTEREINANDER verglichen werden. Damit galt an einem Scan schon eine
   * Abweichung von 3,5 Prozent zwischen Schriftfeld (1:100) und Messung
   * (1:103,5) als Widerspruch: der Vermerk wurde nicht übernommen, und der
   * Bearbeiter wurde zum Nachmessen geschickt. Bei einem gescannten Blatt
   * ist das die normale Streuung, kein Befund. Die Schranke erzeugte
   * Handarbeit, wo keine nötig war — und wer dreimal grundlos nachmisst,
   * liest beim vierten Mal nicht mehr hin.
   *
   * Die beiden Fragen sind verschieden:
   *
   *   STREUUNG  Wie genau treffen zwei Messungen dieselbe Größe?
   *             Grenze: max(2 Prozent, 2·u_rel). Darunter ist der Maßstab
   *             auf zwei Wegen deckungsgleich belegt.
   *
   *   FORMAT    Liegt das Blatt überhaupt in Originalgröße vor?
   *             Das ist kein stetiger Fehler, sondern ein Sprung: zwischen
   *             zwei DIN-A-Formaten liegt der Faktor 1,41, die feinste am
   *             Kopierer einstellbare Verkleinerung sind 94 Prozent, also
   *             6 Prozent. Grenze deshalb: max(6 Prozent, 2·u_rel), wie in
   *             kern_massstab.SCHWELLEN.ABWEICHUNG_KOPF. Die beiden Zahlen
   *             müssen gleich bleiben; der Selbsttest unten hält sie
   *             zusammen.
   *
   * Dazwischen liegt ein drittes Feld, und das ist der Normalfall am Scan:
   * mehr als Messrauschen, weniger als ein Formatsprung. Dort gilt der
   * Nenner vom Blatt — er ist die glatte Zahl und wird durch nichts
   * widerlegt —, die Abweichung steht als Hinweis daneben und die Güte
   * lautet "belegt" statt "abgesichert". Kein Nachmessen, keine Sperre,
   * aber auch kein Verschweigen.
   * Festlegung dieses Werkzeugs, kein Normwert.
   * ------------------------------------------------------------------ */
  const GRENZE_STREUUNG = GATE_KETTEN;         // zwei Prozent, wie überall
  const GRENZE_FORMAT = 0.06;                  // = KERN_MASSSTAB ABWEICHUNG_KOPF

  /* Die Blattformate der Reihe A stehen im Verhältnis Wurzel(2) zueinander.
     Ein verkleinert kopiertes Blatt trifft deshalb einen dieser Faktoren.
     Den Schritt zu benennen hilft dem Bearbeiter mehr als eine nackte
     Prozentzahl: er kann am Blatt nachsehen, ob das hinkommt. */
  const FORMATSCHRITTE = [
    { f: 0.25, t: "vier Formatschritte vergrößert, etwa A4 auf A0" },
    { f: 1 / (2 * WURZEL2), t: "drei Formatschritte vergrößert, etwa A3 auf A0" },
    { f: 0.5, t: "zwei Formatschritte vergrößert, etwa A3 auf A1" },
    { f: 1 / WURZEL2, t: "einen Formatschritt vergrößert, etwa A3 auf A2" },
    { f: WURZEL2, t: "einen Formatschritt verkleinert, etwa A2 auf A3" },
    { f: 2, t: "zwei Formatschritte verkleinert, etwa A1 auf A3" },
    { f: 2 * WURZEL2, t: "drei Formatschritte verkleinert, etwa A0 auf A3" },
    { f: 4, t: "vier Formatschritte verkleinert, etwa A0 auf A4" },
  ];
  /* Drei Prozent: so weit darf der gemessene Faktor neben dem Formatschritt
     liegen, damit er noch so benannt werden darf. Weiter gefasst würde jede
     beliebige Abweichung zu einem Formatschritt erklärt. */
  const FORMAT_TOLERANZ = 0.03;

  function formatschritt(faktor) {
    for (let i = 0; i < FORMATSCHRITTE.length; i++) {
      if (Math.abs(faktor / FORMATSCHRITTE[i].f - 1) <= FORMAT_TOLERANZ) {
        return FORMATSCHRITTE[i].t;
      }
    }
    return null;
  }

  /**
   * @param o.px_je_meter   gemessener Maßstab in Bildpunkten je Meter
   * @param o.dpi           Auflösung, mit der das Blatt gerendert wurde
   * @param o.nenner_blatt  Nenner aus dem Schriftfeld oder aus der Unterlage
   * @param o.u_rel         relative Unsicherheit der Messung
   *
   * Immer ein Objekt, nie null: auch "nicht möglich" ist eine Auskunft, und
   * der Grund dafür gehört dem Bearbeiter gesagt, damit er weiß, was ihm
   * fehlt. Genau daran ist das Werkzeug bisher gescheitert — "Maßstab offen"
   * ohne einen Satz dazu, was jetzt zu tun ist.
   */
  function kreuzprobe(o) {
    const e = o || {};
    const px = Number(e.px_je_meter) || 0;
    const dpi = Number(e.dpi) || 0;
    const nb = Number(e.nenner_blatt) || 0;
    const titel = "Kreuzprobe Schriftfeld gegen Messung";

    if (!(px > 0)) {
      return { moeglich: false, titel: titel, stufe: "hinweis",
        text: "Es liegt noch keine Messung vor, die sich gegen das Schriftfeld "
          + "halten ließe. Eine Strecke bekannter Länge im Plan ziehen." };
    }
    if (!(dpi > 0)) {
      return { moeglich: false, titel: titel, stufe: "hinweis",
        text: "Die Auflösung dieser Unterlage ist unbekannt, weil sie ein Bild und "
          + "kein Dokument ist. Aus der Messung folgt dann kein Nenner, und ein "
          + "Vermerk im Schriftfeld ist nicht gegenzurechnen. Die Gegenprobe ist "
          + "hier eine zweite Messung an einer anderen Stelle des Blattes." };
    }
    if (!(nb > 0)) {
      return { moeglich: false, titel: titel, stufe: "hinweis",
        text: "Auf dieser Unterlage steht kein Maßstab, gegen den zu rechnen wäre. "
          + "Die Gegenprobe ist hier eine zweite Messung an einer anderen Stelle "
          + "des Blattes: ein schief aufgenommener oder verzerrter Plan fällt "
          + "genau dabei auf." };
    }

    const ng = nennerAusPxJeMeter(px, dpi);
    const u = Number(e.u_rel) > 0 ? Number(e.u_rel) : 0;
    const tolStreuung = Math.max(GRENZE_STREUUNG, 2 * u);
    const toleranz = Math.max(GRENZE_FORMAT, 2 * u);
    const faktor = ng / nb;
    const abw = faktor - 1;
    const schritt = formatschritt(faktor);
    /* stimmt heisst: kein Formatsprung, der Nenner vom Blatt gilt weiter.
       deckungsgleich heisst zusaetzlich: auch das Messrauschen ist klein
       genug, um den Nenner als doppelt belegt zu fuehren. */
    const stimmt = Math.abs(abw) <= toleranz;
    const deckungsgleich = Math.abs(abw) <= tolStreuung;

    /* Der gemessene Nenner mit einer Nachkommastelle, sobald sie etwas
       aussagt. Ohne sie stand "gemessen wurden 1:103. Das sind 3,5 Prozent
       Unterschied" -- zwei Zahlen im selben Satz, die nicht zueinander
       passen, und der Leser rechnet nach statt weiterzuarbeiten. */
    const ngText = de(ng, Math.abs(ng - Math.round(ng)) < 0.05 ? 0 : 1);
    const kopf = "Das Schriftfeld nennt 1:" + de(nb, 0) + ", gemessen wurden 1:"
      + ngText + ". Das sind " + de(Math.abs(abw) * 100, 1) + " Prozent Unterschied";

    /* Welcher Wert gilt danach?
     *
     *   Deckt sich beides, gilt der Nenner vom Blatt. Er ist eine glatte Zahl
     *   ohne Klickfehler; die Messung hat ihre Aufgabe erfüllt, indem sie ihn
     *   bestätigt hat. Mit dem verrauschten Messwert weiterzurechnen, obwohl
     *   der exakte danebensteht, wäre schlechter und gäbe dem Bearbeiter
     *   grundlos das Gefühl, noch nachbessern zu müssen.
     *
     *   Widersprechen sie sich, gilt die Messung: sie beschreibt das Blatt,
     *   das tatsächlich vorliegt, der Vermerk nur das, was einmal gezeichnet
     *   wurde. */
    return {
      moeglich: true,
      stimmt: stimmt,
      deckungsgleich: deckungsgleich,
      titel: titel,
      stufe: deckungsgleich ? "gut" : (stimmt ? "hinweis" : "sperre"),
      nenner_gilt: stimmt ? nb : rnd(ng, 1),
      px_je_meter_gilt: stimmt ? pxJeMeterAusNenner(nb, dpi) : px,
      guete_vorschlag: deckungsgleich ? "abgesichert" : (stimmt ? "belegt" : "widerspruch"),
      nenner_gemessen: rnd(ng, 1),
      nenner_blatt: nb,
      faktor: rnd(faktor, 3),
      abweichung_prozent: rnd(abw * 100, 2),
      toleranz_prozent: rnd(toleranz * 100, 2),
      toleranz_streuung_prozent: rnd(tolStreuung * 100, 2),
      formatschritt: schritt,
      text: deckungsgleich
        ? kopf + " und damit innerhalb der Toleranz von " + de(tolStreuung * 100, 1)
          + " Prozent. Damit ist ausgeschlossen, dass dieses Blatt verkleinert oder "
          + "vergrößert vorliegt. Der Maßstab ist auf zwei unabhängigen Wegen belegt."
        : stimmt
        ? kopf + ". Ein Formatsprung wäre mindestens " + de(toleranz * 100, 1)
          + " Prozent, also liegt das Blatt in Originalgröße vor; die Abweichung ist "
          + "die übliche Streuung eines eingescannten oder abfotografierten Blattes. "
          + "Gerechnet wird mit dem Nenner vom Blatt, 1:" + de(nb, 0) + ", weil er die "
          + "glatte Zahl ohne Klickfehler ist. Nachmessen ist nicht nötig; eine zweite "
          + "Strecke an anderer Stelle würde die Streuung verkleinern."
        : kopf + ", zulässig sind " + de(toleranz * 100, 1) + " Prozent. Das Blatt "
          + "liegt um den Faktor " + de(faktor, 2) + " "
          + (faktor > 1 ? "verkleinert" : "vergrößert") + " vor"
          + (schritt ? " — das ist " + schritt : ", etwa weil es kopiert oder "
            + "beschnitten wurde")
          + ". Der Vermerk im Schriftfeld gilt für diese Unterlage nicht mehr. "
          + "Maßgebend ist die Messung an der Zeichnung selbst.",
    };
  }

  /* ---------------------------------------------------------------------
   * Mehrere Messungen zusammenfassen
   * Zwei Messungen an verschiedenen Stellen des Blattes sind die beste Probe,
   * die es gibt: ein schräg abfotografierter oder ungleichmäßig verzerrter
   * Plan fällt genau dabei auf, weil er in der einen Richtung einen anderen
   * Maßstab hat als in der anderen.
   * ------------------------------------------------------------------ */
  function zusammenfassen(messungen) {
    const liste = (messungen || []).filter(function (m) {
      return m && m.px_je_meter > 0;
    });
    if (!liste.length) return null;

    const n = liste.length;
    const werte = liste.map(function (m) { return m.px_je_meter; });
    const mittel = werte.reduce(function (s, x) { return s + x; }, 0) / n;
    const max = Math.max.apply(null, werte), min = Math.min.apply(null, werte);
    const spanne = (max / min - 1) * 100;

    /* Zwei Wege zur Unsicherheit des Mittelwerts. Genommen wird der
       größere: die aus den Einzelmessungen fortgepflanzte und die aus der
       tatsächlichen Streuung. Streuen die Messungen stärker, als der
       Klickfehler erklärt, ist etwas anderes im Spiel, und dann ist die
       Streuung die ehrlichere Zahl. */
    const u_i = liste.map(function (m) { return Number(m.u_rel) || 0; });
    const u_fort = Math.sqrt(u_i.reduce(function (s, u) { return s + u * u; }, 0)) / n;
    let u_streu = 0;
    if (n >= 2) {
      const varianz = werte.reduce(function (s, x) {
        return s + (x - mittel) * (x - mittel);
      }, 0) / (n - 1);
      u_streu = Math.sqrt(varianz) / mittel / Math.sqrt(n);
    }
    const u = Math.max(u_fort, u_streu);

    let guete;
    if (n >= 2 && spanne > GATE_KETTEN * 100) guete = "widerspruch";
    else if (n >= 2 && u <= U_ZIEL) guete = "abgesichert";
    else if (u <= U_ZIEL) guete = "belegt";
    else guete = "vorlaeufig";

    const hinweis = {
      widerspruch: n + " Messungen weichen um " + de(spanne, 1) + " Prozent voneinander "
        + "ab. Zulässig sind zwei Prozent. Entweder ist eine bekannte Länge falsch "
        + "angesetzt oder der Plan ist verzerrt aufgenommen, etwa schräg fotografiert. "
        + "Solange das nicht geklärt ist, trägt keine daraus gerechnete Fläche.",
      abgesichert: n + " Messungen an verschiedenen Stellen stimmen auf "
        + de(spanne, 1) + " Prozent überein. Der Maßstab ist damit gegengeprüft.",
      belegt: "Der Maßstab stützt sich auf eine einzige Messung. Eine zweite an einer "
        + "anderen Stelle des Blattes würde ihn absichern und zugleich zeigen, ob die "
        + "Aufnahme verzerrt ist.",
      vorlaeufig: "Die Messung ist zu ungenau für einen belastbaren Maßstab: ±"
        + de(u * 100, 2) + " Prozent im Maßstab sind ±" + de(u * 200, 2)
        + " Prozent in jeder Fläche. Über eine längere Strecke messen.",
    }[guete];

    return {
      anzahl: n,
      px_je_meter: mittel,
      m_je_px: 1 / mittel,
      u_rel: u,
      u_flaeche_rel: 2 * u,
      spanne_prozent: n >= 2 ? spanne : null,
      guete: guete,
      belastbar: guete !== "widerspruch",
      hinweis: hinweis,
      einzelabweichung: werte.map(function (x) { return (x / mittel - 1) * 100; }),
    };
  }

  /* ---------------------------------------------------------------------
   * Eine ganze Messung aus den Rohdaten bilden
   * ------------------------------------------------------------------ */
  function messung(o) {
    const e = o || {};
    const L = Number(e.laenge_px_bild) || 0;
    const m = Number(e.meter) || 0;
    if (!(L > 0) || !(m > 0)) return null;
    const u = unsicherheit({ laenge_px_bild: L, zoom: e.zoom, meter: m,
                             u_abs_m: e.u_abs_m });
    return {
      laenge_px_bild: L,
      zoom: Number(e.zoom) > 0 ? Number(e.zoom) : 1,
      meter: m,
      bezug: e.bezug || "sonst",
      bezug_titel: e.bezug_titel || "",
      px_je_meter: L / m,
      u_rel: u.u_rel,
      u_flaeche_rel: u.u_flaeche_rel,
      stufe: u.stufe,
      annehmbar: u.stufe !== "zu_kurz",
    };
  }

  /* ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    const nah = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 1e-9 : t);
    const pruef = (b, t) => { if (!b) f.push(t); };
    let anzahl = 0;
    const p = (b, t) => { anzahl++; pruef(b, t); };

    /* Umrechnungen */
    p(pxJeMeter(400, 4) === 100, "400 Punkte auf 4 m sind 100 Punkte je Meter");
    p(pxJeMeter(400, 0) === null, "Ohne Länge kein Maßstab");
    p(pxJeMeter(0, 4) === null, "Ohne Strecke kein Maßstab");
    /* 1:100 bei 200 dpi: ein Meter ist 10 mm Papier, das sind 78,74 Punkte */
    p(nah(pxJeMeterAusNenner(100, 200), 78.740157, 1e-4),
      "1:100 bei 200 dpi ergibt 78,74 Punkte je Meter");
    p(nah(nennerAusPxJeMeter(78.740157, 200), 100, 1e-4),
      "Rückweg muss wieder 1:100 ergeben");
    p(nah(nennerAusPxJeMeter(pxJeMeterAusNenner(50, 150), 150), 50, 1e-6),
      "Hin und zurück bei 1:50 und 150 dpi");
    p(nennerAusPxJeMeter(100, 0) === null, "Ohne Auflösung kein Nenner");

    /* Gerundeter Nenner */
    p(nennerRunden(98.6).nenner === 100, "98,6 ist ein 1:100");
    p(nennerRunden(112) === null, "112 liegt zu weit von jedem gebräuchlichen Nenner");

    /* Genauigkeitsschwelle: die im Kopf hergeleiteten 300 Punkte */
    const u300 = unsicherheit({ laenge_px_bild: 300, zoom: 1 });
    p(nah(u300.u_rel, WURZEL2 * 1.5 / 300, 1e-12),
      "Unsicherheit bei 300 Punkten muss Wurzel(2)*1,5/300 sein");
    p(u300.stufe === "gut", "300 Bildschirmpunkte sind die Schwelle 'gut', sind: "
      + u300.stufe);
    p(unsicherheit({ laenge_px_bild: 299, zoom: 1 }).stufe === "knapp",
      "Knapp darunter ist 'knapp'");
    p(unsicherheit({ laenge_px_bild: 200, zoom: 1 }).stufe === "knapp",
      "200 Punkte sind brauchbar, aber nicht abgesichert");
    p(unsicherheit({ laenge_px_bild: 50, zoom: 1 }).stufe === "zu_kurz",
      "50 Punkte sind zu kurz");
    p(nah(unsicherheit({ laenge_px_bild: 106, zoom: 1 }).u_rel, 0.02, 0.0005),
      "Bei rund 106 Punkten sind es zwei Prozent");

    /* Fläche geht mit dem Quadrat */
    p(nah(u300.u_flaeche_rel, 2 * u300.u_rel, 1e-12),
      "Flächenunsicherheit ist das Doppelte");

    /* Zoomen hilft, aber nur bis zur Auflösungsgrenze */
    const uz1 = unsicherheit({ laenge_px_bild: 100, zoom: 1 });
    const uz3 = unsicherheit({ laenge_px_bild: 100, zoom: 3 });
    p(uz3.u_rel < uz1.u_rel, "Hineinzoomen muss die Unsicherheit senken");
    p(nah(uz3.sigma_bild_px, KLICKFEHLER_BILD_PX, 1e-12),
      "Bei starkem Zoom bleibt der Bildpunkt die Grenze");
    p(nah(unsicherheit({ laenge_px_bild: 100, zoom: 20 }).u_rel, uz3.u_rel, 1e-12),
      "Noch weiter zoomen bringt nichts mehr");
    /* und die Schwelle in Bildschirmpunkten bleibt dieselbe Aussage */
    p(unsicherheit({ laenge_px_bild: 300, zoom: 1 }).noetig_px_schirm <= 301,
      "Die nötige Länge muss rund 300 Bildschirmpunkte sein");

    /* Unsicherheit des Bezugsmaßes */
    const utuer = unsicherheit({ laenge_px_bild: 4000, zoom: 1, meter: 0.885,
                                 u_abs_m: 0.01 });
    p(nah(utuer.u_rel, 0.01 / 0.885, 0.0005),
      "Über eine sehr lange Strecke bleibt allein das Bezugsmaß übrig");
    p(utuer.stufe === "knapp",
      "Eine Tür mit ±10 mm kann die Schwelle 'gut' nicht erreichen");
    p(utuer.noetig_px_bild === null,
      "Wenn das Bezugsmaß die Schwelle sprengt, hilft keine längere Strecke");

    /* Messung bilden */
    const m1 = messung({ laenge_px_bild: 600, zoom: 1, meter: 6, bezug: "masskette" });
    p(m1.px_je_meter === 100, "600 Punkte auf 6 m sind 100 je Meter");
    p(m1.annehmbar === true, "Eine gute Messung ist annehmbar");
    p(messung({ laenge_px_bild: 30, zoom: 1, meter: 0.3 }).annehmbar === false,
      "Eine zu kurze Messung ist nicht annehmbar");
    p(messung({ laenge_px_bild: 0, zoom: 1, meter: 6 }) === null,
      "Ohne Strecke keine Messung");

    /* Zusammenfassen */
    p(zusammenfassen([]) === null, "Ohne Messung kein Ergebnis");
    const z1 = zusammenfassen([m1]);
    p(z1.anzahl === 1 && z1.guete === "belegt",
      "Eine gute Einzelmessung ist belegt, ist: " + (z1 && z1.guete));
    const m2 = messung({ laenge_px_bild: 602, zoom: 1, meter: 6, bezug: "masskette" });
    const z2 = zusammenfassen([m1, m2]);
    p(z2.guete === "abgesichert", "Zwei stimmige Messungen sind abgesichert, sind: "
      + z2.guete);
    p(nah(z2.spanne_prozent, (602 / 600 - 1) * 100, 1e-9), "Spanne muss stimmen");
    p(nah(z2.px_je_meter, (100 + 602 / 6) / 2, 1e-9), "Mittelwert muss stimmen");
    /* vier Prozent auseinander: genau der verzerrt aufgenommene Plan */
    const m3 = messung({ laenge_px_bild: 624, zoom: 1, meter: 6, bezug: "masskette" });
    const z3 = zusammenfassen([m1, m3]);
    p(z3.guete === "widerspruch", "Vier Prozent Abweichung ist ein Widerspruch, ist: "
      + z3.guete);
    p(z3.belastbar === false, "Ein Widerspruch ist nicht belastbar");
    /* streuen zwei Messungen mehr, als der Klickfehler hergibt, zählt die
       Streuung, nicht die schöne fortgepflanzte Zahl */
    const m4 = messung({ laenge_px_bild: 609, zoom: 1, meter: 6, bezug: "masskette" });
    const z4 = zusammenfassen([m1, m4]);
    p(z4.u_rel > 0.003, "Streuung über dem Klickfehler muss durchschlagen, ist: "
      + z4.u_rel);
    p(z4.guete === "vorlaeufig",
      "Streuen zwei Messungen 1,5 Prozent, ist das nicht abgesichert, ist: " + z4.guete);

    /* Bezugsmaße */
    const B = bezugsmasse();
    p(B.length >= 5, "Es muss eine Auswahl bekannter Längen geben");
    p(B[0].id === "masskette", "Die bemaßte Strecke steht oben");
    const tuer = B.filter(function (x) { return x.id === "tuer"; })[0];
    p(!!tuer && tuer.u_abs_m === 0.01, "Die Tür trägt eine Rohbautoleranz");
    p(B.every(function (x) { return x.frei || (x.werte && x.werte.length); }),
      "Jede Zeile ist entweder frei oder bringt Werte mit");

    /* --- Kreuzprobe gegen das Schriftfeld -------------------------------
       Der Fall, um den es geht: A1-Plan auf A3 kopiert. Das Schriftfeld
       sagt weiter 1:100, gemessen wird 1:200. */
    const bei200 = function (nenner) { return pxJeMeterAusNenner(nenner, 200); };
    const kA1A3 = kreuzprobe({ px_je_meter: bei200(200), dpi: 200,
                               nenner_blatt: 100, u_rel: 0.005 });
    p(kA1A3.moeglich === true, "Mit Auflösung und Nenner ist die Kreuzprobe möglich");
    p(kA1A3.stimmt === false, "1:100 im Kopf gegen 1:200 gemessen ist ein Widerspruch");
    p(Math.round(kA1A3.faktor * 100) === 200, "Der Faktor muss 2,00 sein, ist: "
      + kA1A3.faktor);
    p(/zwei Formatschritte verkleinert/.test(kA1A3.formatschritt || ""),
      "A1 auf A3 muss als zwei Formatschritte benannt werden, ist: " + kA1A3.formatschritt);
    p(kA1A3.stufe === "sperre", "Ein Widerspruch ist eine Sperre");

    /* Der Fall aus dem Auftrag: A3 auf A4, 1:100 wird zu 1:141 */
    const kA3A4 = kreuzprobe({ px_je_meter: bei200(141.4), dpi: 200,
                               nenner_blatt: 100, u_rel: 0.005 });
    p(kA3A4.stimmt === false, "1:141 gegen 1:100 ist ein Widerspruch");
    p(/einen Formatschritt verkleinert/.test(kA3A4.formatschritt || ""),
      "A3 auf A4 ist ein Formatschritt, ist: " + kA3A4.formatschritt);
    p(kA3A4.nenner_gemessen > 141 && kA3A4.nenner_gemessen < 142,
      "Der gemessene Nenner muss 141,4 sein, ist: " + kA3A4.nenner_gemessen);

    /* Ein vergrößertes Blatt muss ebenso auffallen */
    const kGross = kreuzprobe({ px_je_meter: bei200(50), dpi: 200,
                                nenner_blatt: 100, u_rel: 0.005 });
    p(kGross.stimmt === false && kGross.faktor === 0.5, "1:50 gegen 1:100 ist ein "
      + "Widerspruch mit Faktor 0,5, ist: " + kGross.faktor);
    p(/vergrößert/.test(kGross.text), "Ein kleinerer Nenner heißt vergrößert");

    /* Trifft es zusammen, darf es keine Warnung geben */
    const kGut = kreuzprobe({ px_je_meter: bei200(100), dpi: 200,
                              nenner_blatt: 100, u_rel: 0.005 });
    p(kGut.stimmt === true && kGut.stufe === "gut", "Gleicher Nenner muss stimmen");
    p(/zwei unabhängigen Wegen/.test(kGut.text),
      "Bei Übereinstimmung muss dastehen, dass zwei Wege belegen");

    /* Welcher Wert danach gilt */
    p(kGut.nenner_gilt === 100,
      "Bestätigt die Messung das Blatt, gilt der glatte Nenner vom Blatt, ist: "
      + kGut.nenner_gilt);
    p(kGut.guete_vorschlag === "abgesichert",
      "Zwei übereinstimmende Wege sind ein abgesicherter Maßstab");
    p(Math.abs(kGut.px_je_meter_gilt - bei200(100)) < 1e-9,
      "Die Bildpunkte je Meter folgen dann aus dem Nenner des Blattes");
    p(kA1A3.nenner_gilt === kA1A3.nenner_gemessen,
      "Bei Widerspruch gilt der gemessene Nenner, ist: " + kA1A3.nenner_gilt);
    p(kA1A3.guete_vorschlag === "widerspruch",
      "Bei Widerspruch darf die Güte nicht abgesichert heißen");

    /* Innerhalb der Streuung: deckungsgleich, gruen, abgesichert. */
    const kKnapp = kreuzprobe({ px_je_meter: bei200(101.5), dpi: 200,
                                nenner_blatt: 100, u_rel: 0.002 });
    p(kKnapp.stimmt === true, "1,5 Prozent liegen unter der Zweiprozentgrenze");
    p(kKnapp.deckungsgleich === true, "1,5 Prozent sind deckungsgleich");
    p(kKnapp.stufe === "gut", "Deckungsgleich ist gruen, ist: " + kKnapp.stufe);
    p(kKnapp.toleranz_streuung_prozent === 2,
      "Die Streuungsgrenze darf nie unter zwei Prozent fallen, ist: "
      + kKnapp.toleranz_streuung_prozent);
    p(kKnapp.toleranz_prozent === 6,
      "Die Formatgrenze sind sechs Prozent, ist: " + kKnapp.toleranz_prozent);
    /* Auch bei einer knapp bestandenen Probe gilt das Blatt, nicht der
       Messwert: 1,5 Prozent Klickfehler sind kein besserer Nenner. */
    p(kKnapp.nenner_gilt === 100,
      "Knapp bestanden heißt ebenfalls: der Nenner vom Blatt gilt");

    /* DER BEFUND AUS DER ERPROBUNG: Schriftfeld 1:100, gemessen 1:103,5.
       Das ist an einem Scan die normale Streuung und KEIN Formatsprung.
       Vorher wurde der Vermerk deshalb verworfen und der Bearbeiter zum
       Nachmessen geschickt. Jetzt gilt der Nenner vom Blatt, die Abweichung
       steht als Hinweis daneben, die Guete ist "belegt" statt
       "abgesichert". */
    const kScan = kreuzprobe({ px_je_meter: bei200(103.5), dpi: 200,
                               nenner_blatt: 100, u_rel: 0.002 });
    p(kScan.stimmt === true, "3,5 Prozent sind kein Formatsprung");
    p(kScan.deckungsgleich === false, "3,5 Prozent sind auch nicht deckungsgleich");
    p(kScan.stufe === "hinweis", "Dazwischen ist ein Hinweis, ist: " + kScan.stufe);
    p(kScan.nenner_gilt === 100, "Es gilt der glatte Nenner vom Blatt, ist: "
      + kScan.nenner_gilt);
    p(kScan.guete_vorschlag === "belegt",
      "Ohne Deckungsgleichheit ist der Massstab belegt, nicht abgesichert, ist: "
      + kScan.guete_vorschlag);
    p(/[Nn]achmessen ist nicht nötig/.test(kScan.text),
      "Der Satz muss sagen, dass keine Handarbeit noetig ist");
    /* Der genannte Nenner und die genannte Abweichung muessen zueinander
       passen: "1:103" neben "3,5 Prozent" liest sich wie ein Rechenfehler. */
    p(/1:103,5\. Das sind 3,5 Prozent/.test(kScan.text),
      "Nenner und Abweichung im selben Satz muessen zusammenpassen, ist: "
      + kScan.text.slice(0, 120));
    p(/gemessen wurden 1:200\./.test(kA1A3.text),
      "Eine glatte Zahl bekommt keine Nullstelle angehaengt, ist: "
      + kA1A3.text.slice(0, 110));

    /* Die Grenze zum Formatsprung muss halten: 8 Prozent sind ein Befund. */
    const kSprung = kreuzprobe({ px_je_meter: bei200(108), dpi: 200,
                                 nenner_blatt: 100, u_rel: 0.002 });
    p(kSprung.stimmt === false, "8 Prozent sind ein Formatbefund");
    p(kSprung.stufe === "sperre", "8 Prozent sperren");

    /* Bei unscharfer Messung waechst die Grenze mit: 2·u_rel schlaegt durch. */
    const kUnscharf = kreuzprobe({ px_je_meter: bei200(107), dpi: 200,
                                   nenner_blatt: 100, u_rel: 0.05 });
    p(kUnscharf.stimmt === true, "Bei ±5 Prozent Messunsicherheit sind 7 Prozent "
      + "Unterschied nicht zu belegen");
    p(kUnscharf.toleranz_prozent === 10, "Dann gilt 2·u_rel, ist: "
      + kUnscharf.toleranz_prozent);

    /* Die beiden Werkzeuge muessen dieselbe Zahl fuer dieselbe Frage nehmen.
       Genau das war auseinandergelaufen: hier zwei Prozent, dort sechs. */
    const KM = (typeof window !== "undefined" && window.KERN_MASSSTAB)
      || (function () { try { return require("./kern_massstab.js"); } catch (e) { return null; } })();
    p(!!(KM && KM.SCHWELLEN), "kern_massstab muss erreichbar sein, sonst laesst sich "
      + "nicht pruefen, ob beide Werkzeuge dieselbe Grenze nehmen");
    if (KM && KM.SCHWELLEN) {
      p(KM.SCHWELLEN.ABWEICHUNG_KOPF === GRENZE_FORMAT,
        "Die Formatgrenze muss mit kern_massstab.ABWEICHUNG_KOPF uebereinstimmen: "
        + KM.SCHWELLEN.ABWEICHUNG_KOPF + " gegen " + GRENZE_FORMAT);
    }

    /* Ohne Auflösung oder ohne Nenner: nicht möglich, aber mit Anweisung */
    const kOhneDpi = kreuzprobe({ px_je_meter: 80, dpi: 0, nenner_blatt: 100 });
    p(kOhneDpi.moeglich === false, "Ohne Auflösung ist keine Kreuzprobe möglich");
    p(/zweite Messung/.test(kOhneDpi.text),
      "Auch ohne Kreuzprobe muss dastehen, was stattdessen zu tun ist");
    const kOhneNenner = kreuzprobe({ px_je_meter: 80, dpi: 200, nenner_blatt: 0 });
    p(kOhneNenner.moeglich === false, "Ohne Nenner ist keine Kreuzprobe möglich");
    p(/zweite Messung/.test(kOhneNenner.text),
      "Ohne Nenner muss die zweite Messung als Weg genannt werden");
    const kOhneMessung = kreuzprobe({ px_je_meter: 0, dpi: 200, nenner_blatt: 100 });
    p(kOhneMessung.moeglich === false && /Strecke/.test(kOhneMessung.text),
      "Ohne Messung muss zum Ziehen einer Strecke aufgefordert werden");
    p(kreuzprobe().moeglich === false, "Ohne Eingabe darf nichts abstürzen");

    /* Ein Faktor, der zu keinem Formatschritt passt, darf keinen erfinden */
    const kKrumm = kreuzprobe({ px_je_meter: bei200(117), dpi: 200,
                                nenner_blatt: 100, u_rel: 0.002 });
    p(kKrumm.stimmt === false && kKrumm.formatschritt === null,
      "1,17 ist kein Formatschritt und darf nicht als einer benannt werden");

    return { ok: f.length === 0, fehler: f, anzahl: anzahl };
  }

  return {
    KLICKFEHLER_SCHIRM_PX: KLICKFEHLER_SCHIRM_PX,
    KLICKFEHLER_BILD_PX: KLICKFEHLER_BILD_PX,
    U_ZIEL: U_ZIEL, U_GRENZE: U_GRENZE,
    bezugsmasse: bezugsmasse,
    unsicherheit: unsicherheit,
    pxJeMeter: pxJeMeter,
    nennerAusPxJeMeter: nennerAusPxJeMeter,
    pxJeMeterAusNenner: pxJeMeterAusNenner,
    nennerRunden: nennerRunden,
    kreuzprobe: kreuzprobe,
    messung: messung,
    zusammenfassen: zusammenfassen,
    selbsttest: selbsttest,
  };
});
