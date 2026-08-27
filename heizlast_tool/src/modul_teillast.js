/* ===========================================================================
 * modul_teillast.js — Heizlast über der Außentemperatur
 * ===========================================================================
 * WOFUER DAS KAPITEL DA IST
 * Der Bericht liefert bisher einen einzigen Betriebspunkt: die Heizlast bei
 * der Norm-Aussentemperatur. Damit kann der Heizungsbauer die Anlage nicht
 * auslegen. Er braucht den Verlauf, weil ein Waermeerzeuger den groessten
 * Teil des Winters weit unterhalb seiner Nennleistung laeuft. Genau dieser
 * Verlauf steckt bereits vollstaendig in der Rechnung; er muss nur
 * hingeschrieben werden.
 *
 * WAS DIESES MODUL AUSDRUECKLICH NICHT TUT
 * Es empfiehlt kein Geraet, keine Bauart, keine Leistungsgroesse und keine
 * Vorlauftemperatur, und es rechnet keine Varianten. Der Bericht ist
 * Berechnung und Nachweis. Wer aus der Kennlinie eine Geraeteauswahl macht,
 * ist der Fachplaner, nicht dieses Werkzeug.
 *
 * DIE HERLEITUNG, IN EINEM SATZ
 * Transmission und Lueftung sind beide dem Unterschied zwischen innen und
 * aussen proportional. Also ist die Gebaeudeheizlast eine Gerade ueber der
 * Aussentemperatur:
 *
 *     Phi(theta_e) = H_ges * (theta_i,bez - theta_e)
 *     H_ges        = SUMME_r Phi_geb,r / (theta_i,r - theta_e,norm)
 *     theta_i,bez  = SUMME_r (H_r * theta_i,r) / SUMME_r H_r
 *
 * theta_i,bez ist die mit der Heizlast gewichtete mittlere Norm-Innen-
 * temperatur. Sie wird nicht gewaehlt, sondern aus den Raeumen gerechnet.
 * Haben alle Raeume 20 Grad C, kommt genau 20 Grad C heraus und die Formel
 * geht in die gelaeufige Form Phi_HL * (20 - theta_e) / (20 - theta_e,norm)
 * ueber. Bei gemischten Innentemperaturen, etwa Bad 24 und Treppenhaus 15,
 * liegt sie darunter, und die Gerade trifft den Auslegungspunkt trotzdem
 * exakt. Wer die alte Form braucht, setzt optionen.teillast_theta_i auf 20.
 *
 * GRENZE DER GERADEN, EHRLICH BENANNT
 * Bauteile, deren Temperatur dahinter nicht im gleichen Verhaeltnis mit der
 * Aussentemperatur sinkt, fallen aus der Geraden heraus. Es gibt drei Faelle:
 * erdberuehrte Bauteile (Bezug Jahresmitteltemperatur), Bauteile gegen einen
 * unbeheizten Bereich (Bezug eigene Bilanz) und Bauteile mit fest
 * vorgegebener Temperatur dahinter, etwa gegen ein Nachbargebaeude.
 * abweichungGegenKern() wertet den Rechenkern bei jedem Stuetzpunkt neu aus
 * und beziffert den Unterschied. WELCHE der drei Ursachen genannt werden,
 * liest ursachen() aus dem Ergebnis; frueher stand hier fest „erdberuehrte
 * Flaechen und unbeheizte Bereiche", auch in Gebaeuden ohne ein einziges
 * erdberuehrtes Bauteil. Eine Begruendung ohne Anwendungsfall ist falsch.
 *
 * WAS DER BERICHT NICHT LIEFERT UND WOHER ES KOMMT
 * Sperrzeiten des Versorgers, Auslegungstemperatur der Heizflaechen und die
 * Eingangsgroessen der Trinkwassererwaermung gehoeren nicht in diese
 * Berechnung. Sie fehlen dem Heizungsbauer aber, wenn sie nicht wenigstens
 * benannt sind. Das Kapitel sagt deshalb bei jeder dieser Angaben, dass sie
 * fehlt, warum sie fehlt und wonach sie zu ermitteln waere. Rechnen tut es
 * davon nichts.
 *
 * TRINKWARMWASSER
 * Nicht Gegenstand dieser Berechnung. Begruendung und Fundstelle stehen in
 * TWW_SATZ, nicht in einer Zahl.
 * =========================================================================== */
"use strict";

(function () {
  /* ------------------------------------------------------------------ *
   * 0  Format
   * ------------------------------------------------------------------ */
  const e2 = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const f = (x, n) => (Number.isFinite(x) ? x.toLocaleString("de-DE",
    { minimumFractionDigits: n === undefined ? 0 : n,
      maximumFractionDigits: n === undefined ? 0 : n }) : "–");

  const zahl = (x, fb) => {
    const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (fb === undefined ? 0 : fb);
  };

  /* ------------------------------------------------------------------ *
   * 1  Festwerte mit Herkunft
   * ------------------------------------------------------------------ */
  /* Heizgrenztemperatur. DIN EN 12831-1 kennt sie nicht: die Norm rechnet
   * genau einen Auslegungspunkt und setzt weder innere noch solare Gewinne
   * an. Die 15 Grad C stammen aus der Gradtagzahl-Konvention G20/15, also
   * 20 Grad C Raumtemperatur und 15 Grad C Heizgrenze, wie sie in VDI 2067
   * und DIN 4108-6 fuer Heizwaermebedarf und Heizkostenabrechnung benutzt
   * wird. Der Wert ist eine Annahme dieses Berichts und ueber
   * optionen.heizgrenze aenderbar. */
  const HEIZGRENZE_STANDARD = 15.0;
  const HEIZGRENZE_HERKUNFT = "Gradtagzahl-Konvention G20/15 nach VDI 2067 "
    + "und DIN 4108-6; DIN EN 12831-1 kennt keine Heizgrenztemperatur, weil "
    + "sie nur den Auslegungspunkt berechnet und keine Gewinne ansetzt";

  /* Stuetzstellen der Tabelle. Der Auslegungspunkt und die Heizgrenze kommen
   * aus dem Projekt dazu, Werte ausserhalb fallen heraus. Minus 7 Grad C ist
   * aufgefuehrt, weil Waermepumpen ihre Leistung nach DIN EN 14511 bei
   * A-7/W35 angeben und der Vergleich sonst von Hand gerechnet werden muss. */
  const STUETZSTELLEN = [-15, -12, -10, -7, -5, -2, 0, 2, 5, 8, 10, 12, 15];

  const BEMERKUNG = {
    "-7": "Angabepunkt A-7 nach DIN EN 14511",
  };

  /* Trinkwarmwasser. Der Satz grenzt ab und rechnet nichts. Frueher stand
   * hier, die Trinkwasserleistung sei "zu den hier ausgewiesenen Werten
   * hinzuzurechnen". Das ist eine Auslegungsregel, keine Abgrenzung: ob und
   * wie beide Leistungen zusammenfallen, entscheidet das Anlagenkonzept.
   * Der Satz sagt jetzt nur noch, dass die Groesse gesondert zu
   * beruecksichtigen ist und wovon sie abhaengt. Keine Zahl, kein Zuschlag,
   * keine Speicherauslegung. */
  const TWW_SATZ = "Die Trinkwassererwärmung ist nicht Bestandteil dieser Berechnung. "
    + "Sie ist bei der Dimensionierung von Wärmeerzeuger und gegebenenfalls Speicher "
    + "gesondert zu berücksichtigen. Welche Leistung dafür anzusetzen ist, hängt von "
    + "Nutzungsprofil, Bedarf, Speicherkonzept und Betriebsweise ab; ermittelt wird "
    + "sie nach DIN EN 12831-3:2017-09 „Trinkwassererwärmungsanlagen, Heizlast und "
    + "Bedarfsbestimmung“, dem dritten Teil derselben Normenreihe.";

  /* Was der Trinkwarmwasser-Rechnung fehlt. Der Bericht schaetzt nichts; er
   * sagt, dass die Eingangsdaten hier nicht stehen und wer sie liefert. */
  const TWW_FEHLT = "Die hierfür erforderlichen Eingangsdaten sind in diesem Bericht "
    + "nicht enthalten: die Zahl der Personen je Wohn- oder Nutzungseinheit und das "
    + "Bedarfsprofil der Warmwasserentnahme sind beim Bauherrn oder beim Nutzer zu "
    + "erfragen.";

  /* ------------------------------------------------------------------ *
   * 2  Kennlinie aus dem vorhandenen Ergebnis
   * ------------------------------------------------------------------ */
  /** Bezugsgroessen der Geraden. Liefert H_ges in W/K und theta_i,bez in
   *  Grad C, beide allein aus e.raeume gerechnet. */
  function bezug(e, p) {
    const te = zahl(e.klima && e.klima.theta_e, NaN);
    if (!Number.isFinite(te)) return null;
    let H = 0, Ht = 0;
    (e.raeume || []).forEach(function (r) {
      const dt = zahl(r.theta_i, 20) - te;
      if (Math.abs(dt) < 1e-9) return;
      const h = zahl(r.phi_gebaeude, 0) / dt;
      H += h; Ht += h * zahl(r.theta_i, 20);
    });
    if (!(H > 0)) return null;
    const vorgabe = p && p.optionen ? p.optionen.teillast_theta_i : undefined;
    const gewichtet = Ht / H;
    /* NIE-NaN (Kehrwoche 25.08.2026): eine Vorgabe an oder unter der
       Norm-Aussentemperatur machte Hgen unten zu einer Division durch ~0 —
       die ganze Tabelle stand dann voller Infinity. Eine solche Vorgabe ist
       physikalisch keine Bezugs-Innentemperatur; sie wird verworfen und die
       gewichtete Temperatur verwendet (steht als "aus den Räumen gerechnet"
       in der Tabelle). */
    const vw = zahl(vorgabe, NaN);
    const ti = Number.isFinite(vw) && (vw - te) > 0.5 ? vw : gewichtet;
    if (!((ti - te) > 1e-6)) return null;
    /* Bei vorgegebenem theta_i muss H so nachgezogen werden, dass der
       Auslegungspunkt weiter exakt getroffen wird. Sonst stimmt die erste
       Zeile der Tabelle nicht mehr mit Kapitel 1 ueberein. */
    const Hgen = zahl(e.phi_gebaeude, 0) / (ti - te);
    return {
      theta_e: te, theta_i: ti, theta_i_gewichtet: gewichtet,
      vorgegeben: ti !== gewichtet,
      H: Hgen, H_gewichtet: H,
      raumtemperaturen: [...new Set((e.raeume || []).map(function (r) {
        return zahl(r.theta_i, 20);
      }))].sort(function (a, b) { return a - b; }),
    };
  }

  /** Heizlast bei einer Aussentemperatur, in W. */
  function lastBei(b, theta_e) {
    return b.H * (b.theta_i - theta_e);
  }

  function heizgrenze(p) {
    const v = p && p.optionen ? p.optionen.heizgrenze : undefined;
    return Number.isFinite(zahl(v, NaN)) ? zahl(v) : HEIZGRENZE_STANDARD;
  }

  /** Die Zeilen der Tabelle: Auslegungspunkt, Stuetzstellen dazwischen,
   *  Heizgrenze. Aufsteigend nach Aussentemperatur, also fallende Last. */
  function kennlinie(e, p) {
    const b = bezug(e, p);
    if (!b) return null;
    const hg = heizgrenze(p);
    const set = new Map();
    /* Auslegungspunkt und Heizgrenze zuerst: faellt eine Stuetzstelle mit
       ihnen zusammen, behaelt die Zeile die aussagekraeftigere Rolle. */
    const nimm = function (t, art) {
      if (t < b.theta_e - 1e-9 || t > hg + 1e-9) return;
      const k = Math.round(t * 100) / 100;
      if (!set.has(k)) set.set(k, { theta_e: k, art: art });
    };
    nimm(b.theta_e, "auslegung");
    nimm(hg, "heizgrenze");
    STUETZSTELLEN.forEach(function (t) { nimm(t, "stuetz"); });
    const zeilen = [...set.values()].sort(function (x, y) { return x.theta_e - y.theta_e; });
    zeilen.forEach(function (z) {
      z.phi = lastBei(b, z.theta_e);
      z.anteil = e.phi_gebaeude > 0 ? z.phi / e.phi_gebaeude : null;
      z.bemerkung = z.art === "auslegung" ? "Auslegungspunkt, Norm-Außentemperatur"
        : z.art === "heizgrenze" ? "Heizgrenze"
        : (BEMERKUNG[String(z.theta_e)] || "");
    });
    return { bezug: b, heizgrenze: hg, zeilen: zeilen };
  }

  /* ------------------------------------------------------------------ *
   * 3  Gegenprobe am Rechenkern
   * ------------------------------------------------------------------ */
  /** Wertet den Rechenkern bei jedem Stuetzpunkt neu aus und liefert die
   *  groesste Abweichung der Geraden davon. Damit steht im Bericht, wie gross
   *  die Vereinfachung ist, statt dass sie unterstellt bleibt.
   *  Gibt null zurueck, wenn der Kern fehlt oder das Projekt unvollstaendig
   *  ist; der Bericht laesst den Satz dann weg. */
  function abweichungGegenKern(kl, p, kern, normalisieren) {
    const K = kern || (typeof window !== "undefined" ? window.KERN_HEIZLAST_NORM : null);
    if (!K || !K.rechne || !kl || !p || !(p.raeume || []).length) return null;
    /* Der Kern rechnet nicht mit dem Projekt der Oberflaeche, sondern mit der
     * aufgeloesten Fassung: U-Werte aus dem Bauteilkatalog, Raumarten,
     * Vorgabewerte. Ohne diesen Schritt vergleicht man zwei verschiedene
     * Gebaeude. Deshalb wird dieselbe Umformung benutzt, die auch die
     * Oberflaeche vor jedem Rechenlauf anwendet. */
    const norm = normalisieren
      || (typeof window !== "undefined" && window.App && window.App.projektFuerKern
          ? function (x) { return window.App.projektFuerKern(x); }
          : function (x) { return x; });
    const punkte = [];
    try {
      kl.zeilen.forEach(function (z) {
        const kopie = JSON.parse(JSON.stringify(norm(p)));
        kopie.klima = Object.assign({}, kopie.klima, { theta_e: z.theta_e });
        const r = K.rechne(kopie);
        const d = zahl(r.phi_gebaeude, NaN) - z.phi;
        if (Number.isFinite(d)) punkte.push({ theta_e: z.theta_e, diff: d, art: z.art });
      });
    } catch (x) { return null; }
    if (punkte.length < 2) return null;
    /* Probe: am Auslegungspunkt muessen Gerade und Kern denselben Wert
     * liefern, denn die Gerade ist genau dort verankert. Weichen sie ab, ist
     * nicht die Gerade schlecht, sondern der Vergleich falsch aufgesetzt.
     * Dann wird nichts behauptet. */
    const anker = punkte.find(function (x) { return x.art === "auslegung"; });
    if (!anker) return null;
    const schranke = Math.max(5, Math.abs(kl.zeilen[0].phi) * 0.005);
    if (Math.abs(anker.diff) > schranke) return null;
    let max = punkte[0];
    punkte.forEach(function (x) { if (Math.abs(x.diff) > Math.abs(max.diff)) max = x; });
    const ende = punkte[punkte.length - 1];
    /* Der Unterschied waechst nicht ins Unendliche, er laeuft gegen den
       Wärmestrom der Bauteile mit eigener Grenztemperatur. Deshalb wird er in
       Watt berichtet und nicht in Prozent: in Prozent gemessen wirkt er nahe
       der Heizgrenze gross, weil dort die Bezugsgroesse klein ist. */
    return {
      punkte: punkte,
      max_w: Math.abs(max.diff), bei: max.theta_e,
      vorzeichen: max.diff >= 0 ? 1 : -1,
      am_ende_w: Math.abs(ende.diff), ende_theta_e: ende.theta_e,
    };
  }

  /* ------------------------------------------------------------------ *
   * 3b  Ursachen der Abweichung, aus dem Gebaeude gelesen
   * ------------------------------------------------------------------ */
  /* Der Satz zur Abweichung nannte frueher fest „erdberuehrte Flaechen und
   * unbeheizte Bereiche". In einem Gebaeude ohne ein einziges erdberuehrtes
   * Bauteil ist das eine Begruendung, die es nicht gibt. Welche Bauteile aus
   * der Geraden herausfallen, steht im Ergebnis; also wird es dort gelesen.
   *
   * Aus der Geraden faellt jedes Bauteil, dessen Temperatur dahinter nicht im
   * gleichen Verhaeltnis mit der Aussentemperatur sinkt:
   *   erdreich  bezieht sich auf die Jahresmitteltemperatur
   *   zone      folgt der eigenen Bilanz des unbeheizten Bereichs
   *   fest      steht fest, unabhaengig von der Aussentemperatur
   * Innenbauteile zaehlen nicht mit: sie gehen nicht in die Gebaeudeheizlast
   * ein (kern_heizlast_norm.js, phi_gebaeude_anteil = phi_huelle + phi_V
   * + phi_RH). */
  function ursachen(e) {
    const gefunden = { erdreich: false, zone: false, fest: false };
    ((e && e.raeume) || []).forEach(function (r) {
      (r.bauteile || []).forEach(function (bt) {
        if (bt.kat === "innen") return;
        if (bt.kat === "erdreich") { gefunden.erdreich = true; return; }
        const typ = (bt.grenzt_an && bt.grenzt_an.typ) || "aussen";
        if (typ === "zone") gefunden.zone = true;
        if (typ === "fest") gefunden.fest = true;
      });
    });
    const raus = [];
    if (gefunden.erdreich) {
      raus.push("erdberührte Bauteile, deren Bezugstemperatur die "
        + "Jahresmitteltemperatur ist");
    }
    if (gefunden.zone) {
      raus.push("Bauteile gegen unbeheizte Bereiche, deren Temperatur aus einer "
        + "eigenen Bilanz folgt");
    }
    if (gefunden.fest) {
      raus.push("Bauteile mit fest vorgegebener Temperatur dahinter, etwa gegen "
        + "ein Nachbargebäude");
    }
    return raus;
  }

  /** Aufzählung mit „und“ vor dem letzten Glied. Enthält ein Glied selbst
   *  ein Komma, weil ein Nebensatz daranhängt, steht auch vor dem „und“ ein
   *  Komma; sonst laufen zwei Nebensätze ohne Grenze ineinander. */
  function undListe(a) {
    const x = (a || []).filter(Boolean);
    if (!x.length) return "";
    if (x.length === 1) return x[0];
    const komma = x.some(function (s) { return s.indexOf(", ") >= 0; });
    return x.slice(0, -1).join(", ") + (komma ? ", und " : " und ") + x[x.length - 1];
  }

  /* ------------------------------------------------------------------ *
   * 4  Kapitel
   * ------------------------------------------------------------------ */
  /** Liefert den HTML-Rumpf des Kapitels. U ist der Unternummern-Zaehler des
   *  Berichts, kap die Kapitelnummer. Beides darf fehlen; dann entfallen die
   *  Zwischenueberschriften mit Nummer. K ist der Kapitelplan des Berichts
   *  (kapitelPlan() in modul_bericht.js). Er wird nur fuer Verweise auf andere
   *  Kapitel gebraucht; fehlt er, nennt der Verweis das Kapitel beim Namen
   *  statt bei der Nummer. Eine ausgedachte Nummer waere schlimmer als keine. */
  /** druck: wahr für die Druckfassung des Berichts. Dort entfallen die
   *  Verweise auf Kapitel, die es im Ausdruck nicht gibt (Konfidenz, offene
   *  Punkte), und jede Aussage darüber, wie belastbar eine Zahl ist. Die
   *  Zahlen selbst bleiben unverändert. */
  function kapitel(p, e, U, kap, K, druck) {
    const kl = kennlinie(e, p);
    if (!kl) {
      return "<p>Die Heizlast über der Außentemperatur lässt sich nicht angeben, "
        + "solange die Norm-Außentemperatur oder die Räume fehlen.</p>";
    }
    const b = kl.bezug;
    const nr = (t) => (U ? "<h3>" + e2(U(kap)) + " " + e2(t) + "</h3>" : "<h3>" + e2(t) + "</h3>");
    /* Verweis auf ein anderes Kapitel. Mit Kapitelplan die Nummer, ohne ihn
       der Name. Nummern werden nicht geraten. */
    const verweis = (schluessel, name) =>
      (K && K[schluessel] ? "Abschnitt " + K[schluessel] : "das Kapitel " + name);

    /* Heizlast und Norm-Außentemperatur nicht noch einmal ausschreiben. Beide
       stehen schon auf dem Deckblatt, in der Kennzahlenreihe des ersten
       Kapitels und in der ersten Zeile der Tabelle weiter unten. Hier zaehlt
       allein, was dieses Kapitel hinzufuegt. */
    /* Der Rang des Kapitels steht in der ersten Zeile, nicht im Kleingedruckten
       weiter unten. Ohne diesen Vorspann liest ein Auftraggeber die Zeile bei
       plus 15 Grad C als Erzeugerleistung. Der Hinweis auf die fehlenden
       Gewinne gehoert deshalb hierher, nicht erst hinter die Herleitung. */
    let h = "<p><b>Informative Zusatzdarstellung.</b> Normativer Auslegungspunkt "
      + "ist allein die Norm-Heizlast bei der Norm-Außentemperatur. Bei jeder "
      + "höheren Außentemperatur ist die benötigte Leistung kleiner; die folgende "
      + "Tabelle leitet sie aus den bereits ermittelten Größen ab. Innere und solare "
      + "Gewinne bleiben dabei nach DIN EN 12831-1 unberücksichtigt. Die Werte legen "
      + "keinen bestimmten Wärmeerzeuger zugrunde und enthalten keine Empfehlung.</p>";

    h += nr("Herleitung");
    h += "<p>Transmission und Lüftung sind beide dem Unterschied zwischen Innen- und "
      + "Außentemperatur proportional. Die Gebäudeheizlast ist deshalb über der "
      + "Außentemperatur eine Gerade:</p>"
      + '<p class="formel">Φ(θ<sub>e</sub>) = H<sub>ges</sub> · '
      + "(θ<sub>i,bez</sub> − θ<sub>e</sub>)</p>";

    h += '<table><tr><th style="width:56%">Größe</th><th class="n">Wert</th>'
      + '<th class="n">Herkunft</th></tr>'
      + "<tr><td>Wärmeverlustkoeffizient H<sub>ges</sub></td>"
      + '<td class="n">' + e2(f(b.H, 1)) + " W/K</td>"
      /* Die Herkunft steht als Formel, nicht als ausgerechnete Division.
         theta_i,bez ist ein gewichteter Mittelwert und geht nicht glatt auf;
         eine gedruckte Division aus gerundeten Zahlen ergibt je nach Fall
         nicht genau den daneben stehenden Wert von H_ges und saehe dann wie
         ein Rechenfehler aus. Alle drei Groessen der Formel stehen im Bericht:
         die Gebaeudeheizlast in der Zusammenfassung, theta_i,bez und theta_e
         in den beiden folgenden Zeilen dieser Tabelle. */
      + '<td class="n">Φ<sub>HL,Geb</sub> / (θ<sub>i,bez</sub> − θ<sub>e</sub>)</td></tr>'
      + "<tr><td>heizlastgewichtete mittlere Norm-Innentemperatur θ<sub>i,bez</sub></td>"
      + '<td class="n">' + e2(f(b.theta_i, 1)) + " °C</td>"
      + '<td class="n">' + (b.vorgegeben ? "vorgegeben" : "aus den Räumen gerechnet")
      + "</td></tr>"
      + "<tr><td>Norm-Außentemperatur θ<sub>e</sub></td>"
      + '<td class="n">' + e2(f(b.theta_e, 1)) + " °C</td>"
      + '<td class="n">Klimadaten</td></tr>'
      + "<tr><td>Heizgrenztemperatur</td>"
      + '<td class="n">' + e2(f(kl.heizgrenze, 1)) + " °C</td>"
      /* Im Druck „angesetzt": der Wert ist eine Eingangsgröße dieses
         Kapitels; seine Einstufung als Annahme steht intern. */
      + '<td class="n">' + (druck ? "angesetzt" : "Annahme") + "</td></tr></table>";

    if (b.raumtemperaturen.length > 1) {
      h += '<p class="klein">Das Gebäude wird nicht durchgehend auf eine Temperatur '
        + "ausgelegt, angesetzt sind "
        + e2(b.raumtemperaturen.map(function (t) { return f(t, 0); }).join(", "))
        + " °C. θ<sub>i,bez</sub> ist deshalb nicht 20 °C, sondern der mit "
        + "der jeweiligen Raumheizlast gewichtete Mittelwert von "
        + e2(f(b.theta_i_gewichtet, 1)) + " °C. Bei durchgehend 20 °C ergäbe "
        + "die Formel genau 20 °C.</p>";
    }
    h += '<p class="klein">'
      + (druck
        ? "Die Heizgrenztemperatur ist mit " + e2(f(kl.heizgrenze, 1))
          + " °C angesetzt. "
        : "Die Heizgrenztemperatur ist eine Annahme dieses Berichts: "
          + e2(HEIZGRENZE_HERKUNFT) + ". ")
      + "Der Wert bei der Heizgrenze ist der reine "
      + "Wärmeverlust des Gebäudes; ob er tatsächlich noch aufzubringen ist, hängt "
      + "von den inneren und solaren Gewinnen ab.</p>";

    h += nr("Heizlast über der Außentemperatur");
    h += '<table><tr><th class="n">Außentemperatur θ<sub>e</sub> [°C]</th>'
      + '<th class="n">Heizlast Φ [kW]</th>'
      + '<th class="n">Anteil am Auslegungspunkt</th>'
      + "<th>Bemerkung</th></tr>";
    kl.zeilen.forEach(function (z) {
      const fett = z.art === "auslegung";
      const o = fett ? "<b>" : "", c = fett ? "</b>" : "";
      h += '<tr><td class="n">' + o + e2(f(z.theta_e, 1)) + c + "</td>"
        + '<td class="n">' + o + e2(f(z.phi / 1000, 2)) + c + "</td>"
        + '<td class="n">' + (z.anteil === null ? "" : e2(f(z.anteil * 100, 0)) + " %")
        + "</td><td>" + e2(z.bemerkung) + "</td></tr>";
    });
    h += "</table>";

    /* Die Gegenprobe der Geraden gegen den Rechenkern ist eine Aussage
       darüber, wie genau die gedruckten Zahlen sind — NUR INTERN. */
    const ab = druck ? null : abweichungGegenKern(kl, p, null);
    if (ab && ab.max_w >= 10) {
      /* Die Ursache wird aus dem Gebäude gelesen und nicht behauptet. Findet
         sich keine, bleibt der Satz bei dem, was gemessen ist: dem Betrag. */
      const ur = ursachen(e);
      h += '<p class="klein">Wie genau die Gerade ist: wertet man den Rechenkern bei '
        + "jeder Zeile der Tabelle vollständig neu aus, statt die Gerade zu benutzen, "
        + "liegen die Werte um bis zu " + e2(f(ab.max_w, 0)) + " W "
        + (ab.vorzeichen > 0 ? "höher" : "niedriger") + ", erreicht bei "
        + e2(f(ab.bei, 1)) + " °C. Am Auslegungspunkt ist der Unterschied null, er "
        + "wächst zur Heizgrenze hin und läuft dort gegen einen festen Betrag. "
        + (ur.length
          ? "Die Ursache sind die Bauteile mit eigener Grenztemperatur. In diesem "
            + "Gebäude sind das " + e2(undListe(ur)) + ". Ihr Wärmestrom fällt mit "
            + "steigender Außentemperatur langsamer ab als der Rest."
          : "Die Ursache sind Bauteile, deren Temperatur dahinter nicht im gleichen "
            + "Verhältnis mit der Außentemperatur sinkt; ihr Wärmestrom fällt "
            + "langsamer ab als der Rest.")
        + " Der Betrag ist in Watt angegeben und nicht in Prozent, weil die "
        + "Bezugsgröße nahe der Heizgrenze klein wird und ein Prozentwert dort mehr "
        + "vorgibt, als er hergibt. Für die Auslegung ist er ohne Belang: sie richtet "
        + "sich nach der ersten Zeile.</p>";
    }

    /* ---------------- Betriebsweise und Netzanschluss ------------------ *
     * Hier stand bis 26.08.2026 ein Absatz, der aus § 14a EnWG ableitete, in
     * den Sperrstunden stehe "keine Leistung zur Verfuegung" und der
     * Waermeerzeuger sei entsprechend groesser auszulegen. Das ist eine
     * Auslegungsaussage ueber einen Netzanschluss, den dieser Bericht nicht
     * kennt, und § 14a kennt neben der Unterbrechung auch die blosse
     * Leistungsbegrenzung. Der Bericht grenzt jetzt ab, statt zu deuten:
     * netzseitige Begrenzungen sind Sache der Anlagen- und Elektroplanung.
     * Die Aufheizleistung Phi_RH steht mit ihrem Wert in den Randbedingungen
     * (Kapitel Berechnungsgrundlagen) und wird hier nicht zum zweiten Mal
     * ausgebreitet. */
    h += nr("Betriebsweise und netzseitige Leistungsbegrenzung");
    h += "<p>Alle Werte dieses Kapitels und die Norm-Heizlast des Gebäudes gelten für "
      + "durchgehenden Heizbetrieb. Eine hiervon abweichende Betriebsweise erfasst "
      + "DIN EN 12831-1:2017-09 allein über die Aufheizleistung "
      + "&Phi;<sub>RH</sub> nach DIN/TS 12831-1:2020-04; welcher Wert für dieses "
      + "Objekt angesetzt ist, steht in "
      + e2(verweis("grundlagen", "Berechnungsgrundlagen")) + ".</p>";
    h += "<p>Eine mögliche netzseitige Leistungsbegrenzung einer elektrischen "
      + "Wärmeerzeugungsanlage ist im Rahmen der Anlagen- und Elektroplanung gesondert "
      + "zu berücksichtigen. Sie ist nicht Bestandteil dieser Norm-Heizlastberechnung. "
      + "Maßgebend sind die für den konkreten Netzanschluss geltenden technischen und "
      + "vertraglichen Bedingungen.</p>";

    /* ---------------- Heizflaechen ------------------------------------ *
     * Sebastians Grenze gilt unveraendert: keine Vorlauftemperatur bestimmen,
     * keine Variante, kein Geraet. Neu ist die Kuerze. Die Erklaerung der
     * DIN EN 442-2 samt Kennlinie stand hier ueber sechs Zeilen; sie gehoert
     * in die Heizflaechenauslegung, nicht in eine Heizlastberechnung. Der
     * Bericht sagt jetzt, was er liefert, was gesondert zu tun ist und was
     * derjenige dafuer je Raum braucht. */
    h += nr("Heizflächen");
    h += "<p>Dieser Bericht ermittelt die erforderliche Heizleistung jedes Raums. Ob "
      + "vorhandene oder geplante Heizflächen diese Leistung bei einer bestimmten "
      + "Vorlauf- und Rücklauftemperatur bereitstellen können, ist Gegenstand einer "
      + "gesonderten Heizflächenauslegung.</p>";
    h += "<p>Hierfür sind je Raum mindestens Bauart, Größe und Wärmeleistung der "
      + "vorhandenen oder geplanten Heizfläche erforderlich. Die je Raum erforderliche "
      + "Leistung steht in der Spalte &Phi;<sub>HL</sub> der Raumtabelle in "
      + e2(verweis("raeume", "Raumweise Heizlast")) + ". Maßgebend für die Auslegung "
      + "ist der ungünstigste Raum, nicht der Mittelwert.</p>";

    /* ---------------- Trinkwarmwasser --------------------------------- */
    h += nr("Trinkwarmwasser");
    h += "<p>" + e2(TWW_SATZ) + "</p>";
    h += "<p>" + e2(TWW_FEHLT) + "</p>";

    /* ---------------- Umfang und Abgrenzung --------------------------- *
     * Frueher eine dreispaltige Liste "Angabe / Warum sie hier nicht steht /
     * Woher sie kommt". Sie las sich wie eine Maengelliste des eigenen
     * Berichts. Sebastians Vorgabe: eine Abgrenzung Thema/Status, in
     * Sekunden erfassbar. Die beiden Gruppenzeilen tragen die Aussage, die
     * Statusspalte sagt, was mit dem Thema geschieht. Keine Zahl, keine
     * Bewertung, keine Empfehlung.
     *
     * Die Reihenfolge ist die des Lesers: erst was er in der Hand haelt,
     * dann was ihm noch fehlt, und dieses in der Reihenfolge der
     * Anlagenplanung. */
    h += nr("Umfang und Abgrenzung");
    h += "<p>Die Übersicht zeigt, welche Größen dieser Bericht ermittelt und welche "
      + "Schritte der Anlagenplanung vorbehalten bleiben.</p>";
    const grp = (t) => '<tr><td colspan="2" style="padding-top:3.4mm;font-weight:600;'
      + 'border-bottom:.9pt solid #272425">' + e2(t) + "</td></tr>";
    const zl = (thema, status) => "<tr><td>" + e2(thema)
      + '</td><td style="width:47%">' + e2(status) + "</td></tr>";
    h += '<table class="kurz"><tr><th style="width:53%">Thema</th>'
      + "<th>Status</th></tr>"
      + grp("Gegenstand dieses Berichts")
      + zl("Norm-Heizlast des Gebäudes für Raumheizung", "ermittelt")
      + zl("Raumweise Heizlast", "ermittelt")
      + grp("Nicht Bestandteil dieses Berichts")
      + zl("Heizflächenauslegung", "gesondert erforderlich")
      + zl("Vorlauf- und Rücklauftemperatur",
        "aus der Heizlast allein nicht bestimmbar")
      + zl("Trinkwarmwasser", "gesondert zu ermitteln")
      + zl("Auswahl des Wärmeerzeugers", "Gegenstand der Anlagenplanung")
      + zl("Netzanschluss und netzseitige Leistungsbegrenzung",
        "gesondert zu klären")
      + zl("Änderungen am Gebäude nach diesem Stand",
        "erfordern gegebenenfalls eine Neuberechnung")
      + "</table>";
    /* Die beiden Verweise auf die internen Kapitel bleiben der internen
       Fassung vorbehalten: im Ausdruck gibt es die Kapitel nicht, und ein
       Verweis ins Leere waere schlimmer als keiner. */
    if (!druck) {
      h += '<p class="klein">Welche U-Werte belegt sind und welche davon eine Annahme, '
        + "steht in " + e2(verweis("konfidenz", "Quellen, Annahmen und Konfidenz")) + "; "
        + "was vor der Beauftragung offen ist, in "
        + e2(verweis("offen", "Offene Punkte vor der Beauftragung")) + ".</p>";
    }
    return h;
  }

  /* ------------------------------------------------------------------ *
   * 5  Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const fh = [];
    let n = 0;
    /* Sichtbarer Text ohne Marken. Wird gebraucht, weil manche Pruefung auf
       Nachbarschaft von Wort und Zahl schaut; dazwischen darf kein
       <sub>-Element stehen und die Pruefung dadurch ins Leere laufen. */
    const nurTextAus = (x) => String(x == null ? "" : x)
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    function pruefe(bed, name) { n++; if (!bed) fh.push(name); }
    function nahe(ist, soll, tol, name) {
      n++;
      if (!(Math.abs(ist - soll) <= tol)) {
        fh.push(name + ": ist " + ist + ", soll " + soll);
      }
    }

    /* T1  Gleichmaessig 20 Grad C: theta_i,bez muss genau 20 sein und die
       Gerade in die gelaeufige Form uebergehen. */
    const e1 = {
      klima: { theta_e: -10 }, phi_gebaeude: 3000,
      raeume: [{ theta_i: 20, phi_gebaeude: 2000 }, { theta_i: 20, phi_gebaeude: 1000 }],
    };
    const b1 = bezug(e1, {});
    nahe(b1.theta_i, 20, 1e-9, "T1 theta_i,bez bei einheitlich 20 Grad");
    nahe(b1.H, 100, 1e-9, "T1 H_ges");
    nahe(lastBei(b1, -10), 3000, 1e-9, "T1 Auslegungspunkt wird getroffen");
    nahe(lastBei(b1, 0), 2000, 1e-9, "T1 Wert bei 0 Grad");
    nahe(lastBei(b1, 15), 500, 1e-9, "T1 Wert an der Heizgrenze");

    /* T2  Gemischte Innentemperaturen: theta_i,bez liegt dazwischen, der
       Auslegungspunkt wird trotzdem exakt getroffen. */
    const e2p = {
      klima: { theta_e: -10 }, phi_gebaeude: 1000,
      raeume: [{ theta_i: 24, phi_gebaeude: 340 },     // H = 10
               { theta_i: 15, phi_gebaeude: 660 }],    // H = 26,4
    };
    const b2 = bezug(e2p, {});
    nahe(b2.H_gewichtet, 36.4, 1e-9, "T2 H aus den Räumen");
    nahe(b2.theta_i, (10 * 24 + 26.4 * 15) / 36.4, 1e-9, "T2 gewichtete Innentemperatur");
    pruefe(b2.theta_i > 15 && b2.theta_i < 24, "T2 liegt zwischen den Raumtemperaturen");
    nahe(lastBei(b2, -10), 1000, 1e-9, "T2 Auslegungspunkt exakt getroffen");

    /* T3  Vorgabe theta_i = 20 stellt die alte Form her, ohne den
       Auslegungspunkt zu verlieren. */
    const b3 = bezug(e2p, { optionen: { teillast_theta_i: 20 } });
    nahe(b3.theta_i, 20, 1e-9, "T3 Vorgabe greift");
    pruefe(b3.vorgegeben === true, "T3 Vorgabe wird als solche gefuehrt");
    nahe(lastBei(b3, -10), 1000, 1e-9, "T3 Auslegungspunkt bleibt exakt");
    nahe(lastBei(b3, 0), 1000 * 20 / 30, 1e-9, "T3 alte Form bei 0 Grad");

    /* T4  Die Tabelle: erste Zeile Auslegungspunkt, letzte Heizgrenze,
       aufsteigend, keine Punkte ausserhalb, fallende Last. */
    const kl = kennlinie(e1, {});
    pruefe(kl.zeilen[0].art === "auslegung", "T4 erste Zeile ist der Auslegungspunkt");
    pruefe(kl.zeilen[kl.zeilen.length - 1].art === "heizgrenze",
      "T4 letzte Zeile ist die Heizgrenze");
    nahe(kl.heizgrenze, 15, 1e-9, "T4 Vorgabe Heizgrenze 15 Grad");
    pruefe(kl.zeilen.every(function (z) {
      return z.theta_e >= -10 - 1e-9 && z.theta_e <= 15 + 1e-9;
    }), "T4 keine Stuetzstelle ausserhalb des Bereichs");
    let fallend = true;
    for (let i = 1; i < kl.zeilen.length; i++) {
      if (!(kl.zeilen[i].theta_e > kl.zeilen[i - 1].theta_e)) fallend = false;
      if (!(kl.zeilen[i].phi < kl.zeilen[i - 1].phi)) fallend = false;
    }
    pruefe(fallend, "T4 aufsteigende Temperatur, fallende Last, keine Dopplung");
    pruefe(kl.zeilen.some(function (z) { return Math.abs(z.theta_e + 7) < 1e-9
      && z.bemerkung.indexOf("14511") >= 0; }), "T4 Punkt A-7 ist benannt");

    /* T5  Eigene Heizgrenze wird uebernommen und schneidet die Tabelle ab. */
    const kl5 = kennlinie(e1, { optionen: { heizgrenze: 10 } });
    nahe(kl5.heizgrenze, 10, 1e-9, "T5 eigene Heizgrenze");
    pruefe(kl5.zeilen.every(function (z) { return z.theta_e <= 10 + 1e-9; }),
      "T5 nichts oberhalb der eigenen Heizgrenze");
    pruefe(kl5.zeilen[kl5.zeilen.length - 1].art === "heizgrenze",
      "T5 Heizgrenze bleibt letzte Zeile");

    /* T6  Faellt der Auslegungspunkt auf eine Stuetzstelle, darf die Zeile
       nicht doppelt erscheinen. */
    const e6 = JSON.parse(JSON.stringify(e1));
    const kl6 = kennlinie(e6, {});
    pruefe(kl6.zeilen.filter(function (z) { return Math.abs(z.theta_e + 10) < 1e-9; })
      .length === 1, "T6 Auslegungspunkt auf einer Stuetzstelle erscheint einmal");

    /* T7  Ohne Klimadaten oder ohne Raeume gibt es keine Kennlinie, aber
       auch keinen Absturz. */
    pruefe(bezug({ raeume: [] }, {}) === null, "T7 ohne Klima kein Bezug");
    pruefe(kennlinie({ klima: { theta_e: -10 }, raeume: [] }, {}) === null,
      "T7 ohne Raeume keine Kennlinie");
    pruefe(kapitel({}, { klima: {}, raeume: [] }, null, null).indexOf("lässt sich nicht") > 0,
      "T7 das Kapitel sagt, warum es leer bleibt");

    /* T7b  Die Herkunft von H_ges darf keine ausgerechnete Division drucken.
       theta_i,bez ist ein gewichteter Mittelwert; aus gerundeten Zahlen ergibt
       die Division je nach Fall nicht genau den ausgewiesenen Wert und saehe
       wie ein Rechenfehler aus. Geprueft an einem Fall mit gemischten
       Raumtemperaturen, in dem genau das passiert. */
    const e7b = { klima: { theta_e: -9.6 }, phi_gebaeude: 9051.67, raeume: [
      { theta_i: 20, phi_gebaeude: 7000 },
      { theta_i: 24, phi_gebaeude: 1400 },
      { theta_i: 15, phi_gebaeude: 651.67 },
    ] };
    const b7b = bezug(e7b, {});
    const nk = function (x, n) { return Number(x.toFixed(n)); };
    /* Nachweis, dass der Fall wirklich nicht aufgeht: */
    pruefe(nk(nk(e7b.phi_gebaeude, 0) / nk(b7b.theta_i - b7b.theta_e, 2), 1)
      !== nk(b7b.H, 1), "T7b Beispielfall geht gerundet nicht auf");
    const h7b = kapitel({}, e7b, null, null);
    pruefe(h7b.indexOf("W / ") < 0,
      "T7b die Herkunft von H_ges druckt keine ausgerechnete Division");
    pruefe(h7b.indexOf("Φ<sub>HL,Geb</sub> / (θ<sub>i,bez</sub> − θ<sub>e</sub>)") > 0,
      "T7b die Herkunft von H_ges steht als Formel");

    /* T8  Raum mit theta_i gleich theta_e darf nicht durch null teilen. */
    const b8 = bezug({ klima: { theta_e: 20 }, phi_gebaeude: 100,
      raeume: [{ theta_i: 20, phi_gebaeude: 100 }] }, {});
    pruefe(b8 === null, "T8 Temperaturdifferenz null liefert keinen Bezug");

    /* T9  Das Kapitel nennt keine Geraeteempfehlung und keine Variante.
       Sebastians Vorgabe: nur Berechnung und Nachweis. Der Satz "enthaelt
       keine Empfehlung" ist erlaubt, eine ausgesprochene Empfehlung nicht. */
    const html = kapitel({ raeume: [{}] }, e1, null, null);
    /* „Vorlauftemperatur" stand frueher auf dieser Liste. Das Wort ist jetzt
       erlaubt, weil das Kapitel sagen muss, DASS die Angabe fehlt und wonach
       sie zu ermitteln waere. Verboten bleibt, sie zu beziffern; genau das
       prueft T9b. */
    ["Wärmepumpe", "Monoblock", "Fabrikat", "Nennleistung", "Modulationsgrenze",
     "Variante", "kaufen", "auswählen"]
      .forEach(function (w) {
        pruefe(html.indexOf(w) < 0, "T9 das Kapitel darf \"" + w + "\" nicht enthalten");
      });
    [/wir empfehlen/i, /empfohlen/i, /sollte\s+\S+\s+gewählt/i, /ratsam/i]
      .forEach(function (re) {
        pruefe(!re.test(html), "T9 keine ausgesprochene Empfehlung: " + re);
      });

    /* T9b  Die Grenze, die an die Stelle des Wortverbots tritt: keine
       bezifferte Vor- oder Ruecklauftemperatur, keine Uebertemperatur, keine
       Spreizung. Eine Vorlauftemperatur zu bestimmen ist eine eigene
       Rechnung und gehoert nicht in diesen Bericht. */
    [/(Vor|Rück)lauftemperatur[^.]{0,40}\d/,
     /\d\s*(°C|K)\s*(Vor|Rück)lauf/,
     /Übertemperatur\s+von\s+\d/,
     /* Ein Temperaturpaar wie 55/45 nur dann, wenn eine Einheit dabeisteht.
        Ohne diese Klammer schlaegt die Regel auf die Gradtagzahl-Konvention
        G20/15 in der Herkunft der Heizgrenze an, und die ist richtig. */
     /\d{2}\s*\/\s*\d{2}\s*(°C|K\b)/]
      .forEach(function (re) {
        pruefe(!re.test(nurTextAus(html)),
          "T9b keine bezifferte Auslegungstemperatur: " + re);
      });

    /* T10  Trinkwarmwasser: Satz vorhanden, mit Fundstelle, ohne Zahl. Dazu
       der Satz, welche zwei Eingangsgroessen fehlen und wer sie liefert. */
    pruefe(html.indexOf("12831-3") > 0, "T10 Teil 3 ist genannt");
    pruefe(TWW_SATZ.indexOf("nicht Bestandteil") > 0, "T10 Abgrenzung ist ausgesprochen");
    pruefe(!/\d+\s*(kW|Liter|l\b)/.test(TWW_SATZ),
      "T10 der Trinkwarmwassersatz darf keine Leistung oder Menge nennen");
    pruefe(/Personen/.test(TWW_FEHLT) && /Bedarfsprofil/.test(TWW_FEHLT),
      "T10 die fehlenden Eingangsgrößen sind benannt");
    pruefe(/Bauherrn|Nutzer/.test(TWW_FEHLT),
      "T10 der Trinkwarmwassersatz sagt, wer die Angaben liefert");
    pruefe(!/\d/.test(TWW_FEHLT), "T10 der Satz zu den fehlenden Größen nennt keine Zahl");
    pruefe(html.indexOf(TWW_FEHLT.slice(0, 40)) > 0, "T10 der Satz steht im Kapitel");

    /* T11  Die Tabelle steht wirklich im HTML und der Auslegungswert
       stimmt mit Kapitel 1 ueberein. */
    pruefe(html.indexOf("3,00") > 0, "T11 Auslegungspunkt 3,00 kW steht in der Tabelle");
    pruefe(html.indexOf("2,00") > 0, "T11 Wert bei 0 Grad steht in der Tabelle");
    pruefe(html.indexOf("0,50") > 0, "T11 Wert an der Heizgrenze steht in der Tabelle");

    /* T12  Gegenprobe: ohne Kern liefert sie null statt zu werfen. */
    pruefe(abweichungGegenKern(kl, { raeume: [{}] }, null) === null
      || typeof abweichungGegenKern(kl, { raeume: [{}] }, null) === "object",
      "T12 Gegenprobe ohne Kern bleibt ruhig");
    /* Kern, der am Auslegungspunkt genau die Gerade trifft und darueber
       um 50 W abweicht. Genau so soll es aussehen. */
    const kernAttrappe = { rechne: function (pp) {
      return { phi_gebaeude: 100 * (20 - pp.klima.theta_e)
        + (pp.klima.theta_e <= -10 + 1e-9 ? 0 : 50) };
    } };
    const ab = abweichungGegenKern(kl, { raeume: [{}], klima: { theta_e: -10 } },
      kernAttrappe, function (x) { return x; });
    nahe(ab.max_w, 50, 1e-6, "T12 Abweichung wird beziffert");
    pruefe(ab.vorzeichen === 1, "T12 Vorzeichen der Abweichung");
    pruefe(ab.punkte.some(function (x) { return x.art === "auslegung"
      && Math.abs(x.diff) < 1e-9; }), "T12 am Auslegungspunkt ist die Probe null");

    /* T13  Trifft der Kern den Auslegungspunkt nicht, wird nichts behauptet.
       Genau dieser Fall tritt ein, wenn das Projekt nicht so aufgeloest wird
       wie vor dem eigentlichen Rechenlauf. Ein stiller Vergleich zweier
       verschiedener Gebaeude ist schlimmer als kein Vergleich. */
    const kernVersetzt = { rechne: function (pp) {
      return { phi_gebaeude: 40 * (20 - pp.klima.theta_e) };
    } };
    pruefe(abweichungGegenKern(kl, { raeume: [{}], klima: { theta_e: -10 } },
      kernVersetzt, function (x) { return x; }) === null,
      "T13 versetzter Auslegungspunkt liefert keine Aussage");
    const kernKnappDaneben = { rechne: function (pp) {
      return { phi_gebaeude: 100 * (20 - pp.klima.theta_e) + 3 };
    } };
    pruefe(abweichungGegenKern(kl, { raeume: [{}], klima: { theta_e: -10 } },
      kernKnappDaneben, function (x) { return x; }) !== null,
      "T13 Rundungsrauschen am Anker ist zulässig");

    /* T14  Ohne eigene Umformung wird die der Oberfläche benutzt. */
    let benutzt = false;
    abweichungGegenKern(kl, { raeume: [{}], klima: { theta_e: -10 } },
      kernAttrappe, function (x) { benutzt = true; return x; });
    pruefe(benutzt, "T14 die übergebene Umformung wird angewandt");

    const kernKaputt = { rechne: function () { throw new Error("x"); } };
    pruefe(abweichungGegenKern(kl, { raeume: [{}] }, kernKaputt,
      function (x) { return x; }) === null,
      "T12 ein Fehler im Kern kippt das Kapitel nicht");

    /* T15  Ursachen der Abweichung. Befund des Sachverstaendigen: der Satz
       nannte erdberuehrte Flaechen auch in einem Gebaeude, das kein einziges
       erdberuehrtes Bauteil hat. Geprueft wird jede Kategorie einzeln, das
       Zusammenspiel und der Fall ohne Ursache. */
    const bt = (kat, typ) => ({ kat: kat, grenzt_an: { typ: typ } });
    const eMit = (teile) => ({ raeume: [{ bauteile: teile }] });
    pruefe(ursachen(eMit([bt("huelle", "aussen")])).length === 0,
      "T15 reine Außenbauteile erzeugen keine Ursache");
    pruefe(ursachen(eMit([bt("innen", "raum")])).length === 0,
      "T15 Innenbauteile zählen nicht mit, sie tragen die Gebäudeheizlast nicht");
    pruefe(ursachen(eMit([bt("innen", "fest")])).length === 0,
      "T15 ein Innenbauteil mit fester Temperatur zählt ebenfalls nicht");
    pruefe(ursachen(eMit([bt("erdreich", "erdreich")]))
      .join(" ").indexOf("erdberührte") === 0,
      "T15 erdberührtes Bauteil wird erkannt");
    pruefe(ursachen(eMit([bt("huelle", "zone")]))
      .join(" ").indexOf("unbeheizte Bereiche") > 0,
      "T15 Bauteil gegen unbeheizten Bereich wird erkannt");
    pruefe(ursachen(eMit([bt("nachbar", "fest")]))
      .join(" ").indexOf("Nachbargebäude") > 0,
      "T15 Bauteil mit fester Temperatur dahinter wird erkannt");
    pruefe(ursachen(eMit([bt("huelle", "zone"), bt("nachbar", "fest")])).length === 2,
      "T15 mehrere Ursachen werden alle genannt");
    pruefe(undListe(["a", "b", "c"]) === "a, b und c", "T15 Aufzählung mit und");
    pruefe(undListe(["a, die b sind", "c"]) === "a, die b sind, und c",
      "T15 vor dem und steht ein Komma, wenn ein Glied einen Nebensatz trägt");
    pruefe(undListe([]) === "" && undListe(["a"]) === "a",
      "T15 leere und einteilige Aufzählung");

    /* T15b  Der Regressionsfall: ein Gebaeude ohne Erdreich, aber mit
       unbeheiztem Bereich und Nachbarwand. Der Kapiteltext darf dann nicht
       von erdberuehrten Flaechen sprechen. Gebaut wie das Demo-Projekt:
       54 Huellbauteile, davon welche gegen Zone und gegen Nachbar. */
    const eOhneErde = {
      klima: { theta_e: -10 }, phi_gebaeude: 3000, phi_RH_gebaeude: 0,
      raeume: [{ theta_i: 20, phi_gebaeude: 2000, bauteile: [
        bt("huelle", "aussen"), bt("huelle", "zone"), bt("nachbar", "fest"),
        bt("innen", "raum")] },
        { theta_i: 20, phi_gebaeude: 1000, bauteile: [bt("huelle", "aussen")] }],
    };
    const abO = abweichungGegenKern(kennlinie(eOhneErde, {}),
      { raeume: [{}], klima: { theta_e: -10 } }, kernAttrappe,
      function (x) { return x; });
    pruefe(abO && abO.max_w >= 10, "T15b der Beispielfall zeigt überhaupt eine Abweichung");
    const hOhneErde = kapitel({ raeume: [{}], klima: { theta_e: -10 } },
      eOhneErde, null, null);
    pruefe(hOhneErde.indexOf("erdberührt") < 0 && hOhneErde.indexOf("Erdreich") < 0,
      "T15b ohne erdberührtes Bauteil steht kein Wort über Erdreich im Kapitel");
    pruefe(hOhneErde.indexOf("Jahresmitteltemperatur") < 0,
      "T15b und auch keine Begründung über die Jahresmitteltemperatur");

    /* T16  Betriebsweise und Netzanschluss. Der Vorbehalt des durchgehenden
       Betriebs bleibt; die frueher daraus abgeleitete Auslegungsaussage
       ("in den Sperrstunden keine Leistung", "entsprechend groesser
       auszulegen") darf nicht zurueckkommen. Sie deutete einen Netzanschluss,
       den der Bericht nicht kennt. */
    const t16 = nurTextAus(html);
    pruefe(/durchgehenden Heizbetrieb/.test(t16),
      "T16 der Vorbehalt des durchgehenden Betriebs ist ausgesprochen");
    pruefe(/netzseitige Leistungsbegrenzung/i.test(t16),
      "T16 die netzseitige Leistungsbegrenzung ist benannt");
    pruefe(/Anlagen- und Elektroplanung/.test(t16),
      "T16 der Bericht sagt, wohin die Leistungsbegrenzung gehört");
    pruefe(/nicht Bestandteil dieser Norm-Heizlastberechnung/.test(t16),
      "T16 die Abgrenzung ist ausgesprochen");
    pruefe(/Netzanschluss/.test(t16),
      "T16 der maßgebende Netzanschluss ist genannt");
    pruefe(!/Sperrstunde|Sperrzeit/.test(t16),
      "T16 keine Aussage über Sperrstunden");
    pruefe(!/größer auszulegen|Zuschlag/.test(t16),
      "T16 keine Auslegungsaussage über einen Zuschlag");
    /* Phi_RH wird nicht mehr zum zweiten Mal beziffert: der Wert steht bei
       den Randbedingungen. Das Kapitel darf ihn deshalb auch nicht raten. */
    const hRH = nurTextAus(kapitel({ raeume: [{}] },
      Object.assign({}, e1, { phi_RH_gebaeude: 250 }), null, null));
    pruefe(hRH.indexOf("250 W") < 0 && t16.indexOf("0 W angesetzt") < 0,
      "T16 die Aufheizleistung wird hier nicht zum zweiten Mal beziffert");
    pruefe(/Aufheizleistung/.test(t16),
      "T16 die Aufheizleistung ist als das einzige Glied für abweichenden Betrieb genannt");

    /* T17  Heizflaechen. Kurzform: was der Bericht liefert, dass die
       Auslegung gesondert erfolgt, und was sie je Raum braucht. Die
       Erklaerung der DIN EN 442-2 gehoert nicht mehr hierher. */
    pruefe(/gesonderten Heizflächenauslegung/.test(t16),
      "T17 die Heizflächenauslegung ist als gesonderter Schritt benannt");
    pruefe(/Bauart, Größe und Wärmeleistung/.test(t16),
      "T17 der Bericht sagt, was je Raum dafür gebraucht wird");
    pruefe(!/DIN EN 442/.test(t16),
      "T17 die Erklärung der Heizflächennorm ist nicht mehr Teil des Berichts");
    pruefe(/ungünstigste Raum/.test(t16),
      "T17 der maßgebende Raum ist benannt, nicht der Mittelwert");

    /* T18  Die Abgrenzung Thema/Status. Zwei Gruppen, acht Themen. Sie sagt,
       was der Bericht ermittelt und was der Anlagenplanung vorbehalten
       bleibt; sie ist keine Maengelliste des eigenen Berichts. */
    ["Gegenstand dieses Berichts", "Nicht Bestandteil dieses Berichts",
     "Norm-Heizlast des Gebäudes für Raumheizung", "Raumweise Heizlast",
     "Heizflächenauslegung", "Vorlauf- und Rücklauftemperatur",
     "Trinkwarmwasser", "Auswahl des Wärmeerzeugers",
     "Netzanschluss und netzseitige Leistungsbegrenzung",
     "Änderungen am Gebäude nach diesem Stand"]
      .forEach(function (w) {
        pruefe(t16.indexOf(w) >= 0, "T18 die Abgrenzung führt „" + w + "“");
      });
    pruefe(/aus der Heizlast allein nicht bestimmbar/.test(t16),
      "T18 die Vorlauftemperatur ist als nicht bestimmbar ausgewiesen");

    /* T19  Verweise. Ohne Kapitelplan wird das Kapitel beim Namen genannt,
       mit Kapitelplan bei der Nummer. Eine geratene Nummer gibt es nicht. */
    pruefe(t16.indexOf("das Kapitel Raumweise Heizlast") > 0,
      "T19 ohne Kapitelplan steht der Name");
    pruefe(!/Abschnitt \d/.test(t16), "T19 ohne Kapitelplan keine Nummer");
    const hK = nurTextAus(kapitel({ raeume: [{}] }, e1, null, null,
      { raeume: 6, offen: 8, konfidenz: 10 }));
    pruefe(hK.indexOf("Abschnitt 6") > 0 && hK.indexOf("Abschnitt 8") > 0
      && hK.indexOf("Abschnitt 10") > 0, "T19 mit Kapitelplan stehen die Nummern");
    pruefe(hK.indexOf("das Kapitel Raumweise Heizlast") < 0,
      "T19 mit Kapitelplan kein doppelter Verweis");

    return { ok: fh.length === 0, fehler: fh, anzahl: n };
  }

  const API = {
    bezug: bezug, lastBei: lastBei, kennlinie: kennlinie, heizgrenze: heizgrenze,
    abweichungGegenKern: abweichungGegenKern, kapitel: kapitel,
    ursachen: ursachen,
    HEIZGRENZE_STANDARD: HEIZGRENZE_STANDARD,
    HEIZGRENZE_HERKUNFT: HEIZGRENZE_HERKUNFT,
    STUETZSTELLEN: STUETZSTELLEN, TWW_SATZ: TWW_SATZ, TWW_FEHLT: TWW_FEHLT,
    selbsttest: selbsttest,
  };
  if (typeof window !== "undefined") window.MODUL_TEILLAST = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
