/* ===========================================================================
 * kern_massstabsprobe.js — Gegenproben für den Maßstab
 * ===========================================================================
 * Warum es dieses Modul gibt:
 * Ein gleichmäßiger Maßstabsfehler ist über die Heizlast nicht zu finden. Er
 * vergrößert die Flächen mit dem Quadrat des Faktors und den Wärmestrom
 * ebenso; die Heizlast je Quadratmeter bleibt dabei unverändert. Jede
 * Plausibilitätsprüfung, die in W/m² rechnet, schweigt also.
 *
 * Gefährlich ist der Fehler aber nur auf drei Wegen, und gegen jeden gibt es
 * eine Probe, die ohne Zutun des Bearbeiters auskommt:
 *
 *   Weg 1  Maßstabsvermerk im Plankopf mal angenommene Auflösung.
 *          Kippt bei jeder verkleinerten Kopie und jedem Zuschnitt.
 *          Probe: gegen eine im Bild gemessene Maßkette halten.
 *   Weg 2  Maßzahl dem falschen Maßabschnitt zugeordnet.
 *          Probe: Teilmaße müssen das Gesamtmaß derselben Kette ergeben.
 *   Weg 3  Einheit verwechselt, Zentimeter statt Meter.
 *          Probe: Normmaße. Eine Tür ist nie 7,6 Zentimeter breit.
 *
 * Die stärkste Probe sind die Normmaße: Türbreiten und Wandstärken sind
 * genormt und in jedem Grundriss vorhanden, ohne dass jemand etwas eingeben
 * muss. Sie finden grobe Fehler sicher. Feine Fehler unter etwa zehn Prozent
 * finden nur die Summenprobe und der Vergleich zweier Ketten.
 *
 * DOM-frei, ohne Abhängigkeiten, in Node und im Browser lauffähig.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_MASSSTABSPROBE = M;
})(this, function () {

  /* --- Normmaße -----------------------------------------------------------
   * Türen: Rohbaumaße nach DIN 18100, gängige Breiten im Wohnungsbau.
   * Wände: übliche Rohbaudicken im Mauerwerksbau.
   * Beide dienen NICHT der Berechnung, sondern nur als Anker für die Frage,
   * ob der angesetzte Maßstab überhaupt eine sinnvolle Größenordnung ergibt. */
  const TUERBREITEN = [0.635, 0.76, 0.885, 1.01, 1.135, 1.26];   // m, Rohbaumaß
  const TUER_MIN = 0.55, TUER_MAX = 1.60;
  const WANDDICKEN = [0.115, 0.15, 0.175, 0.20, 0.24, 0.30, 0.365, 0.42, 0.49];
  const WAND_MIN = 0.08, WAND_MAX = 0.70;

  /* Bänder für Wohngebäude. Bewusst weit gefasst: Sie sollen grobe
   * Größenordnungsfehler finden, nicht die Baukunst bewerten. */
  const RAUM_MIN = 1.0, RAUM_MAX = 120.0;          // m² je Raum
  /* Untergrenze bewusst tief: Bei einem Raum unter der Dachschräge ist die
     mittlere lichte Höhe das Volumen geteilt durch die Grundfläche und liegt
     regelmäßig unter zwei Metern. Im Referenzprojekt hat das Bad im
     Dachgeschoss 1,96 m. Eine engere Grenze erzeugt dort einen Fehlalarm,
     und ein Werkzeug, das grundlos warnt, wird nicht mehr gelesen. */
  const HOEHE_MIN = 1.4, HOEHE_MAX = 5.0;          // m mittlere lichte Höhe

  const rnd = (x, n) => Math.round(x * Math.pow(10, n || 0)) / Math.pow(10, n || 0);
  /* Zahl oder Null — die Herkunftszaehlung kommt aus fremdem Code und darf
     fehlende Felder mitbringen, ohne dass daraus NaN wird. */
  const zahl = function (x, ers) {
    const v = Number(x);
    return Number.isFinite(v) ? v : (ers === undefined ? 0 : ers);
  };
  /* Zahl mit Hauptwort in der richtigen Zahlform. „1 Räume", „1 Seiten":
     ein Zähler, der nicht zählen kann, macht misstrauisch gegen jede
     andere Zahl auf dem Blatt. mz(1, "Raum", "Räume") -> "1 Raum". */
  const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);

  function befund(id, titel, stufe, text, wert) {
    return { id: id, titel: titel, stufe: stufe, text: text, wert: wert === undefined ? null : wert };
  }

  /** Abstand zum nächstgelegenen Normmaß, als Anteil. */
  function abstandZuNorm(wert, normmasse) {
    let bester = Infinity, treffer = null;
    normmasse.forEach(function (n) {
      const d = Math.abs(wert - n) / n;
      if (d < bester) { bester = d; treffer = n; }
    });
    return { abweichung: bester, norm: treffer };
  }

  /* ---------------------------------------------------------------------
   * P1  Summenprobe einer Maßkette
   * Teilmaße müssen das Gesamtmaß ergeben. Findet die falsche Zuordnung
   * einer Maßzahl zu einem Abschnitt, den keine andere Probe sieht.
   * ------------------------------------------------------------------ */
  function summenprobe(kette) {
    const teile = (kette && kette.teilmasse) || [];
    const gesamt = kette && kette.gesamtmass;
    if (!teile.length || !(gesamt > 0)) return null;
    const summe = teile.reduce(function (s, x) { return s + x; }, 0);
    const abw = (summe - gesamt) / gesamt * 100;
    if (Math.abs(abw) <= 1.0) {
      return befund("summe", "Summenprobe der Maßkette", "gut",
        "Die Teilmaße ergeben zusammen " + rnd(summe, 2) + " m und stimmen mit dem "
        + "Gesamtmaß von " + rnd(gesamt, 2) + " m überein.", abw);
    }
    return befund("summe", "Summenprobe der Maßkette", "sperre",
      "Die Teilmaße ergeben " + rnd(summe, 2) + " m, das Gesamtmaß nennt " + rnd(gesamt, 2)
      + " m. Das sind " + rnd(abw, 1) + " Prozent Unterschied. Entweder wurde eine Maßzahl "
      + "dem falschen Abschnitt zugeordnet oder eine Zahl falsch gelesen. Der Maßstab aus "
      + "dieser Kette ist nicht verwendbar.", abw);
  }

  /* ---------------------------------------------------------------------
   * P2  Zwei unabhängige Ketten müssen denselben Maßstab ergeben
   * ------------------------------------------------------------------ */
  function kettenvergleich(kandidaten) {
    const werte = (kandidaten || []).filter(function (k) { return k > 0; });
    if (werte.length < 2) {
      return befund("ketten", "Vergleich mehrerer Maßketten", "hinweis",
        werte.length === 1
          ? "Der Maßstab stützt sich auf eine einzige Maßkette. Eine zweite, unabhängige "
            + "Kette würde ihn bestätigen; ohne sie bleibt eine falsch zugeordnete Maßzahl "
            + "unentdeckt."
          : "Es liegt keine gemessene Maßkette vor.", werte.length);
    }
    const max = Math.max.apply(null, werte), min = Math.min.apply(null, werte);
    const spanne = (max / min - 1) * 100;
    if (spanne <= 2.0) {
      return befund("ketten", "Vergleich mehrerer Maßketten", "gut",
        werte.length + " Maßketten stimmen auf " + rnd(spanne, 1) + " Prozent überein.", spanne);
    }
    return befund("ketten", "Vergleich mehrerer Maßketten", "sperre",
      werte.length + " Maßketten weichen um " + rnd(spanne, 1) + " Prozent voneinander ab "
      + "(" + rnd(min, 1) + " bis " + rnd(max, 1) + " Pixel je Meter). Zulässig sind zwei "
      + "Prozent. Solange das nicht geklärt ist, ist keine Fläche belastbar.", spanne);
  }

  /* ---------------------------------------------------------------------
   * P3  Normmaße als Anker  (die stärkste Probe ohne Zutun)
   * ------------------------------------------------------------------ */
  function normmassprobe(gemessen) {
    const b = [];
    const tuer = gemessen && gemessen.tuerbreite_m;
    const wand = gemessen && gemessen.wanddicke_m;

    if (tuer > 0) {
      if (tuer < TUER_MIN || tuer > TUER_MAX) {
        b.push(befund("tuer", "Türbreite gegen Normmaß", "sperre",
          "Beim angesetzten Maßstab wäre eine Tür " + rnd(tuer, 2) + " m breit. Übliche "
          + "Rohbaubreiten liegen zwischen " + TUER_MIN + " und " + TUER_MAX + " m. Der "
          + "Maßstab ist um etwa den Faktor "
          + rnd(tuer / 0.885, 1) + " falsch.", tuer));
      } else {
        const a = abstandZuNorm(tuer, TUERBREITEN);
        b.push(befund("tuer", "Türbreite gegen Normmaß",
          a.abweichung <= 0.08 ? "gut" : "hinweis",
          "Türbreite " + rnd(tuer, 3) + " m, nächstes Normmaß " + a.norm + " m, "
          + "Abweichung " + rnd(a.abweichung * 100, 1) + " Prozent.", a.abweichung));
      }
    }

    if (wand > 0) {
      if (wand < WAND_MIN || wand > WAND_MAX) {
        b.push(befund("wand", "Wanddicke gegen Normmaß", "sperre",
          "Beim angesetzten Maßstab wäre eine Wand " + rnd(wand, 2) + " m dick. Übliche "
          + "Rohbaudicken liegen zwischen " + WAND_MIN + " und " + WAND_MAX + " m.", wand));
      } else {
        const a = abstandZuNorm(wand, WANDDICKEN);
        b.push(befund("wand", "Wanddicke gegen Normmaß",
          a.abweichung <= 0.12 ? "gut" : "hinweis",
          "Wanddicke " + rnd(wand, 3) + " m, nächstes Normmaß " + a.norm + " m, "
          + "Abweichung " + rnd(a.abweichung * 100, 1) + " Prozent.", a.abweichung));
      }
    }
    return b;
  }

  /* ---------------------------------------------------------------------
   * P4  Größenordnung der Räume und Höhen
   * ------------------------------------------------------------------ */
  function groessenordnung(raeume) {
    const liste = (raeume || []).filter(function (r) { return r && r.A > 0; });
    if (!liste.length) return [];
    const b = [];
    const zuKlein = liste.filter(function (r) { return r.A < RAUM_MIN; });
    const zuGross = liste.filter(function (r) { return r.A > RAUM_MAX; });
    if (zuKlein.length || zuGross.length) {
      const bsp = (zuKlein[0] || zuGross[0]);
      b.push(befund("raumgroesse", "Größenordnung der Räume", "sperre",
        mz(zuKlein.length + zuGross.length, "Raum liegt", "Räume liegen")
        + " außerhalb des Bereichs von "
        + RAUM_MIN + " bis " + RAUM_MAX + " m², zum Beispiel \"" + (bsp.name || bsp.raum || "")
        + "\" mit " + rnd(bsp.A, 2) + " m². Das deutet auf einen Maßstab hin, der um "
        + "Größenordnungen daneben liegt.", zuKlein.length + zuGross.length));
    } else {
      b.push(befund("raumgroesse", "Größenordnung der Räume", "gut",
        (liste.length === 1
          ? "Der eine erfasste Raum liegt in einer plausiblen Größenordnung."
          : "Alle " + liste.length + " Räume liegen in einer plausiblen Größenordnung.")));
    }
    const hoehen = liste.filter(function (r) { return r.h > 0; });
    const krumm = hoehen.filter(function (r) { return r.h < HOEHE_MIN || r.h > HOEHE_MAX; });
    if (krumm.length) {
      b.push(befund("raumhoehe", "Größenordnung der Höhen", "sperre",
        mz(krumm.length, "Raum hat", "Räume haben")
        + " eine lichte Höhe außerhalb von " + HOEHE_MIN + " bis "
        + HOEHE_MAX + " m.", krumm.length));
    }
    return b;
  }

  /* ---------------------------------------------------------------------
   * P5  Zwei unabhängige Wege: Papiergeometrie gegen gemessene Kette
   * Nur bei Unterlagen mit bekannter, unveränderter Auflösung.
   * ------------------------------------------------------------------ */
  function wegvergleich(ausPapier, ausKette) {
    if (!(ausPapier > 0) || !(ausKette > 0)) return null;
    const abw = (ausPapier / ausKette - 1) * 100;
    if (Math.abs(abw) <= 2.0) {
      return befund("wege", "Zwei unabhängige Maßstabswege", "gut",
        "Der Maßstabsvermerk und die gemessene Maßkette stimmen auf " + rnd(Math.abs(abw), 1)
        + " Prozent überein. Damit ist ausgeschlossen, dass die Unterlage nachträglich "
        + "verkleinert wurde.", abw);
    }
    return befund("wege", "Zwei unabhängige Maßstabswege", "sperre",
      "Der Maßstabsvermerk ergibt " + rnd(ausPapier, 1) + " Pixel je Meter, die gemessene "
      + "Maßkette " + rnd(ausKette, 1) + ". Das sind " + rnd(abw, 1) + " Prozent Unterschied. "
      + "Typische Ursache ist eine verkleinerte Kopie oder ein Zuschnitt; dann gilt der "
      + "Vermerk im Plankopf nicht mehr. Maßgebend ist die gemessene Kette.", abw);
  }

  /** Woher die Flächen kommen, wenn kein Maßstab beteiligt war.
   *
   *  Bis zum 22.08.2026 stand hier ein einziger Satz: „Die Flächen sind von
   *  Hand eingetragen, nicht aus einem Plan gemessen." Seit die Flächen auch
   *  aus dem Textstand der Zeichnung kommen können — am Blatt Dumach 1 sind
   *  das 25 von 25 Räumen —, ist dieser Satz für den häufigsten Fall schlicht
   *  falsch: die Zahlen stehen im Plan, nur eben als Text und nicht als Maß.
   *  Ein Prüfbericht, der die Herkunft der Flächen falsch angibt, ist an der
   *  Stelle wertlos, an der man ihn am ehesten braucht.
   *
   *  @param h { textstand, gemessen, hand } — Zahl der Räume je Herkunft.
   */
  function herkunftssatz(h) {
    const n = function (x) {
      const v = Number(x);
      return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
    };
    const t = n((h || {}).textstand);
    const v = n((h || {}).hand);
    const vt = n((h || {}).verteilt);
    /* Verteilte Flächen zuerst: sie sind die einzige Gruppe, für die weder
       „steht im Plan" noch „hat der Bearbeiter eingetragen" stimmt. */
    if (vt > 0) {
      return "Von " + (t + v + vt) + " Räumen " + (vt === 1 ? "ist eine Fläche"
        : "sind " + vt + " Flächen") + " aus der Außenbemaßung des Blattes "
        + "nach Raumart VERTEILT — eine Annahme des Werkzeugs, kein "
        + "gemessener Raumwert und kein Eintrag des Bearbeiters"
        + (t > 0 ? ", " + t + " stehen als Fläche im Text des Plans" : "")
        + (v > 0 ? ", " + v + " sind von Hand eingetragen" : "")
        + ". An keiner dieser Zahlen ist ein Maßstab beteiligt, ein "
        + "Maßstabsfehler ist damit ausgeschlossen; die Verteilung selbst "
        + "bleibt eine Annahme und läuft mit ihrer Spanne im Bericht.";
    }
    if (t > 0 && v === 0) {
      return "Die Flächen stehen als Text im Plan und sind aus dem Dokument "
        + "gelesen, nicht gemessen und nicht geschätzt. Sie hängen an keinem "
        + "Maßstab; ein Maßstabsfehler ist damit ausgeschlossen. Zu prüfen "
        + "bleibt, ob der Plan den Bestand zeigt.";
    }
    if (t > 0) {
      return "Von " + (t + v) + " Räumen stehen " + t + " als Fläche im Text des "
        + "Plans, " + v + (v === 1 ? " ist" : " sind") + " von Hand eingetragen. "
        + "Ein Maßstab ist an keiner der beiden Zahlen beteiligt, ein "
        + "Maßstabsfehler damit ausgeschlossen.";
    }
    return "Die Flächen sind von Hand eingetragen, nicht aus einem Plan "
      + "gemessen. Ein Maßstabsfehler ist damit ausgeschlossen; für die "
      + "Richtigkeit der Flächen steht der Bearbeiter ein.";
  }

  /* ---------------------------------------------------------------------
   * Gesamtlauf
   * ------------------------------------------------------------------ */
  function pruefe(eingabe) {
    const e = eingabe || {};
    /* Wurde überhaupt aus einem Plan gemessen? Sind die Räume von Hand
       eingetragen, gibt es keinen Maßstab und damit auch keinen
       Maßstabsfehler. Dann wird die Größenordnung geprüft und sonst nichts;
       eine Sperre wegen fehlender Maßstabsbelege wäre hier grundlos. */
    const ausPlan = !!(e.kette
      || (e.kandidaten_px_je_meter || []).length
      || (e.gemessen && (e.gemessen.tuerbreite_m || e.gemessen.wanddicke_m))
      || e.px_je_meter_aus_papier || e.px_je_meter_aus_kette);
    let b = [];
    const s1 = summenprobe(e.kette); if (s1) b.push(s1);
    if (ausPlan) b.push(kettenvergleich(e.kandidaten_px_je_meter));
    b = b.concat(normmassprobe(e.gemessen || {}));
    b = b.concat(groessenordnung(e.raeume));
    const s5 = wegvergleich(e.px_je_meter_aus_papier, e.px_je_meter_aus_kette);
    if (s5) b.push(s5);

    /* Wohnfläche ist freiwillig. Liegt sie vor, ist sie die einzige Probe, die
       ganz ohne den Plan auskommt, und damit die stärkste. */
    if (e.wohnflaeche > 0 && e.summe_raumflaechen > 0) {
      const abw = (e.summe_raumflaechen - e.wohnflaeche) / e.wohnflaeche * 100;
      b.push(Math.abs(abw) <= 45 && abw >= -12
        ? befund("wohnflaeche", "Abgleich mit der Wohnfläche", "gut",
            "Die Summe der Raumflächen liegt " + rnd(abw, 0) + " Prozent über der "
            + "Wohnfläche. Das ist üblich, weil Schrägen und Nebenflächen dort nur "
            + "anteilig zählen.", abw)
        : befund("wohnflaeche", "Abgleich mit der Wohnfläche", "sperre",
            "Die Summe der Raumflächen weicht um " + rnd(abw, 0) + " Prozent von der "
            + "angegebenen Wohnfläche ab. Entweder stimmt der Maßstab nicht oder es "
            + "fehlen Räume.", abw));
    }

    /* HAENGT UEBERHAUPT EINE ZAHL AM MASSSTAB?
     *
     * flaechen_herkunft wird von kern_pruefung erhoben, hierher gereicht --
     * und war bis hierher von niemandem gelesen. Die Sperre haing statt
     * dessen an `ausPlan`, und das sagt nur, ob sich im Bild ueberhaupt ein
     * Massstab bestimmen liess.
     *
     * GEMESSEN am 22.08.2026 an „BV 2-0887 Ziolkowski", echter Durchlauf:
     * alle 13 Raumflaechen stammen aus Flaechenstempeln, sind also im Plan
     * angeschrieben und abgelesen; keine einzige ist im Bild abgegriffen.
     * Trotzdem sperrte der Kettenvergleich des Scans den ganzen Bericht mit
     * dem Satz „keine Flaeche ist belastbar". Fuer diese Berechnung war das
     * schlicht falsch: ein Massstabsfehler kann eine angeschriebene Zahl
     * nicht veraendern.
     *
     * Aufgeweicht wird nichts. Die Proben laufen unveraendert, ihre Befunde
     * stehen vollstaendig da und werden gedruckt -- sie sperren nur dann
     * nicht mehr, wenn nachweislich keine Zahl dieser Berechnung von ihnen
     * abhaengt. Sobald eine Flaeche im Bild gemessen wird, sperren sie
     * wieder. Ist die Herkunft unbekannt, gilt die vorsichtige Seite: es
     * wird gesperrt. */
    const fh = e.flaechen_herkunft || null;
    /* Verteilte Flaechen zaehlen mit — sie sind weder Stempel noch
       Handeintrag, sondern aus der Aussenbemassung des Blattes verteilt.
       Ohne sie in dieser Summe waere ein Projekt, dessen Flaechen ALLE
       verteilt sind, ein Projekt „ohne bekannte Herkunft" und wuerde
       gesperrt, obwohl an keiner seiner Zahlen ein Massstab haengt. */
    const fhSumme = fh ? (zahl(fh.textstand, 0) + zahl(fh.gemessen, 0)
                          + zahl(fh.hand, 0) + zahl(fh.verteilt, 0)) : 0;
    const wirkt = !(fh && fhSumme > 0) || zahl(fh.gemessen, 0) > 0;
    if (!wirkt) {
      const woher = [];
      if (zahl(fh.textstand, 0) > 0) {
        woher.push(fh.textstand + (fh.textstand === 1
          ? " Fläche ist im Plan angeschrieben und abgelesen"
          : " Flächen sind im Plan angeschrieben und abgelesen"));
      }
      if (zahl(fh.hand, 0) > 0) {
        woher.push(fh.hand + (fh.hand === 1 ? " Fläche ist von Hand eingetragen"
          : " Flächen sind von Hand eingetragen"));
      }
      /* BEIM NAMEN GENANNT. Diese Flächen hat das Werkzeug verteilt; sie als
         Handeintrag auszugeben, war die falsche Auskunft an der Stelle, an
         der die Sperre fällt (Blatt „Bauantrag Soethe", 26.08.2026). */
      if (zahl(fh.verteilt, 0) > 0) {
        woher.push(fh.verteilt + (fh.verteilt === 1
          ? " Fläche ist aus der Außenbemaßung des Blattes verteilt (eine "
            + "Annahme des Werkzeugs, kein Handeintrag)"
          : " Flächen sind aus der Außenbemaßung des Blattes verteilt "
            + "(Annahmen des Werkzeugs, keine Handeinträge)"));
      }
      const satz = " Diese Probe hält den Bericht hier NICHT auf: keine Zahl "
        + "dieser Berechnung hängt am Maßstab — " + woher.join(", ")
        + ", keine einzige ist im Bild abgegriffen. Der Befund bleibt "
        + "trotzdem stehen und wird gedruckt; er gilt, sobald im Bild "
        + "gemessen wird.";
      b = b.map(function (x) {
        return x.stufe === "sperre"
          ? { id: x.id, titel: x.titel, stufe: "hinweis",
              text: x.text + satz, wert: x.wert }
          : x;
      });
    }

    const sperren = b.filter(function (x) { return x.stufe === "sperre"; });
    const hinweise = b.filter(function (x) { return x.stufe === "hinweis"; });
    const bestanden = b.filter(function (x) { return x.stufe === "gut"; });

    /* Wie gut ist der Maßstab abgesichert? Entscheidend ist nicht die Zahl der
       Proben, sondern ob eine dabei war, die einen feinen Fehler finden kann. */
    const feinProben = bestanden.filter(function (x) {
      return x.id === "summe" || x.id === "ketten" || x.id === "wege" || x.id === "wohnflaeche";
    }).length;

    return {
      befunde: b,
      sperren: sperren,
      aus_plan: ausPlan,
      belastbar: sperren.length === 0,
      guete: sperren.length ? "nicht belastbar"
        : ((!ausPlan || !wirkt) ? "kein Maßstab beteiligt"
          : (feinProben >= 2 ? "abgesichert"
            : (feinProben === 1 ? "einfach belegt" : "nur grob geprüft"))),
      /* Der Satz unter der Einstufung muss dieselbe Aussage machen wie die
         Einstufung selbst. Vorher wurde er allein aus den BESTANDENEN Proben
         gebildet: eine bestandene Feinprobe neben einer nicht bestandenen
         ergab die Einstufung "nicht belastbar" und darunter den Satz "Der
         Maßstab ist durch eine Probe belegt." Zwei Sätze, die einander
         widersprechen, und der freundlichere gewinnt beim Lesen. */
      hinweis_guete: sperren.length
        ? (sperren.length === 1
            ? "Eine Probe ist nicht bestanden: " + sperren[0].titel + ". "
            : sperren.length + " Proben sind nicht bestanden: "
              + sperren.map(function (x) { return x.titel; }).join(", ") + ". ")
          + "Solange das nicht geklärt ist, trägt keine Fläche."
        : !ausPlan
        ? herkunftssatz(e.flaechen_herkunft)
        /* DIE ZWEITE HÄLFTE DESSELBEN WIDERSPRUCHS.
           Die Einstufung darüber lautet „kein Maßstab beteiligt", sobald der
           Maßstab NICHT WIRKT — auch dann, wenn einer im Plan steht und
           geprüft wurde. Der Satz darunter überlas das und meldete weiter
           „Der Maßstab ist durch eine Probe belegt." Gemessen am Prüflauf
           Soethe, 26.08.2026, wörtlich beanstandet: „Einstufung: kein
           Maßstab beteiligt. Der Maßstab ist durch eine Probe belegt." —
           zwei Sätze nebeneinander, die einander aufheben, und der
           freundlichere gewinnt beim Lesen. Der Satz folgt jetzt derselben
           Bedingung wie die Einstufung: der belegte Maßstab wird genannt,
           aber er trägt hier nichts, und woher die Flächen wirklich kommen,
           steht dahinter. */
        : !wirkt
        ? "Ein Maßstab steht im Plan und ist geprüft, aber keine Fläche "
          + "dieser Berechnung hängt an ihm. " + herkunftssatz(e.flaechen_herkunft)
        : feinProben >= 2
        ? "Der Maßstab ist durch mehrere unabhängige Proben abgesichert."
        : (feinProben === 1
          ? "Der Maßstab ist durch eine Probe belegt. Eine zweite unabhängige Angabe "
            + "würde ihn absichern."
          : "Es liegt nur eine Prüfung der Größenordnung vor. Ein gleichmäßiger "
            + "Maßstabsfehler von wenigen Prozent bliebe unentdeckt und veränderte die "
            + "Heizlast im Quadrat des Faktors."),
      zaehl: { sperre: sperren.length, hinweis: hinweise.length, gut: bestanden.length },
    };
  }

  /* ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    const hat = (r, id, stufe) => r.befunde.some(function (x) {
      return x.id === id && x.stufe === stufe; });

    // Summenprobe
    if (!hat(pruefe({ kette: { teilmasse: [6, 6], gesamtmass: 12 } }), "summe", "gut")) {
      f.push("Stimmige Summenprobe muss bestehen");
    }
    if (pruefe({ kette: { teilmasse: [3.8, 6], gesamtmass: 12 } }).belastbar) {
      f.push("Nicht aufgehende Summenprobe muss sperren");
    }

    // Kettenvergleich
    if (!hat(pruefe({ kandidaten_px_je_meter: [100, 101] }), "ketten", "gut")) {
      f.push("Ein Prozent Abweichung zwischen Ketten ist zulässig");
    }
    if (pruefe({ kandidaten_px_je_meter: [100, 104] }).belastbar) {
      f.push("Vier Prozent zwischen Ketten muss sperren");
    }
    // genau der Fall aus der Prüfung: Vergleich gegen den Median statt untereinander
    if (pruefe({ kandidaten_px_je_meter: [100.0, 96.3] }).belastbar) {
      f.push("3,9 Prozent zwischen zwei Ketten muss sperren, nicht 1,9 gegen den Median");
    }
    if (!hat(pruefe({ kandidaten_px_je_meter: [100] }), "ketten", "hinweis")) {
      f.push("Eine einzelne Kette muss als schwach gekennzeichnet werden");
    }

    // Normmaße
    if (pruefe({ gemessen: { tuerbreite_m: 0.0885 } }).belastbar) {
      f.push("Tür von 8,85 cm muss sperren (Einheitenfehler)");
    }
    if (pruefe({ gemessen: { tuerbreite_m: 8.85 } }).belastbar) {
      f.push("Tür von 8,85 m muss sperren");
    }
    if (!hat(pruefe({ gemessen: { tuerbreite_m: 0.885 } }), "tuer", "gut")) {
      f.push("Normgerechte Tür muss bestehen");
    }
    if (pruefe({ gemessen: { wanddicke_m: 2.4 } }).belastbar) {
      f.push("Wand von 2,40 m muss sperren");
    }
    if (!hat(pruefe({ gemessen: { wanddicke_m: 0.365 } }), "wand", "gut")) {
      f.push("36,5er Wand muss bestehen");
    }

    // Größenordnung
    if (pruefe({ raeume: [{ name: "Bad", A: 0.045 }] }).belastbar) {
      f.push("Raum von 0,045 m² muss sperren");
    }
    if (pruefe({ raeume: [{ name: "Halle", A: 4500 }] }).belastbar) {
      f.push("Raum von 4500 m² muss sperren");
    }
    if (pruefe({ raeume: [{ name: "Wohnen", A: 24, h: 12 }] }).belastbar) {
      f.push("Lichte Höhe von 12 m muss sperren");
    }

    // Zwei Wege
    if (pruefe({ px_je_meter_aus_papier: 100, px_je_meter_aus_kette: 71 }).belastbar) {
      f.push("Verkleinerte Kopie muss auffallen");
    }
    if (!hat(pruefe({ px_je_meter_aus_papier: 100, px_je_meter_aus_kette: 101 }), "wege", "gut")) {
      f.push("Übereinstimmende Wege müssen bestehen");
    }

    // Güte
    const gut2 = pruefe({ kette: { teilmasse: [6, 6], gesamtmass: 12 },
                          kandidaten_px_je_meter: [100, 100.5] });
    if (gut2.guete !== "abgesichert") f.push("Zwei feine Proben ergeben abgesichert, ist " + gut2.guete);
    /* Mit Plandaten, aber ohne feine Probe: der Maßstab stützt sich allein auf
       Normmaße. Das reicht gegen grobe Fehler, nicht gegen wenige Prozent. */
    const grob = pruefe({ gemessen: { tuerbreite_m: 0.885 },
                          raeume: [{ name: "Wohnen", A: 24, h: 2.5 }] });
    if (grob.guete !== "nur grob geprüft") {
      f.push("Mit Plan, ohne feine Probe: nur grob geprüft, ist: " + grob.guete);
    }
    if (!grob.belastbar) f.push("Nur grob geprüft ist keine Sperre");

    // Wohnfläche freiwillig
    if (pruefe({ wohnflaeche: 100, summe_raumflaechen: 118 }).belastbar !== true) {
      f.push("18 Prozent über der Wohnfläche ist üblich");
    }
    if (pruefe({ wohnflaeche: 100, summe_raumflaechen: 210 }).belastbar) {
      f.push("Doppelte Fläche gegenüber der Wohnfläche muss sperren");
    }

    // Dachschräge: mittlere Höhe unter zwei Metern ist zulässig
    if (!pruefe({ raeume: [{ name: "Bad DG", A: 4.5, h: 1.96 }] }).belastbar) {
      f.push("Mittlere Höhe 1,96 m unter der Dachschräge darf nicht sperren");
    }
    if (pruefe({ raeume: [{ name: "Kriechkeller", A: 12, h: 1.1 }] }).belastbar) {
      f.push("Höhe 1,10 m muss weiterhin sperren");
    }
    // Ohne Plangrundlage keine Maßstabssperre
    const ohnePlan = pruefe({ raeume: [{ name: "Wohnen", A: 24, h: 2.5 }] });
    if (!ohnePlan.belastbar) f.push("Von Hand eingetragene Räume dürfen nicht sperren");
    if (ohnePlan.aus_plan !== false) f.push("Ohne Plandaten muss aus_plan falsch sein");
    if (ohnePlan.guete !== "kein Maßstab beteiligt") {
      f.push("Ohne Plan lautet die Güte 'kein Maßstab beteiligt', ist: " + ohnePlan.guete);
    }
    const mitPlan = pruefe({ kandidaten_px_je_meter: [100],
                             raeume: [{ name: "Wohnen", A: 24, h: 2.5 }] });
    if (mitPlan.aus_plan !== true) f.push("Mit Maßkette muss aus_plan wahr sein");

    /* Die Einstufung und der Satz darunter müssen dasselbe sagen. Der Fall,
       der es auseinanderlaufen liess: eine bestandene Feinprobe (Summenprobe)
       neben einer nicht bestandenen (Kettenvergleich). */
    const widerspruch = pruefe({ kette: { teilmasse: [6, 6], gesamtmass: 12 },
                                 kandidaten_px_je_meter: [100, 108] });
    if (widerspruch.guete !== "nicht belastbar") {
      f.push("Auseinanderlaufende Ketten muessen sperren, Guete ist: " + widerspruch.guete);
    }
    if (/durch eine Probe belegt|durch mehrere unabhängige Proben abgesichert/
        .test(widerspruch.hinweis_guete)) {
      f.push("Ein nicht belastbarer Massstab darf sich nicht selbst als belegt "
        + "bezeichnen: " + widerspruch.hinweis_guete);
    }
    if (!/nicht bestanden/.test(widerspruch.hinweis_guete)) {
      f.push("Der Satz unter der Einstufung muss die nicht bestandene Probe nennen, "
        + "ist: " + widerspruch.hinweis_guete);
    }
    /* Genau eine gescheiterte Probe: Einzahl, nicht "1 Proben sind". */
    if (/^1 Proben/.test(widerspruch.hinweis_guete)) {
      f.push("Einzahl bei genau einer gescheiterten Probe");
    }

    /* --- Sperrt der Massstab nur, wenn eine Zahl an ihm haengt? --------
       Drei Richtungen, alle drei muessen stimmen. Die dritte ist die
       wichtigste: ohne Angabe zur Herkunft wird gesperrt. */
    const streuung = { kandidaten_px_je_meter: [49.6, 137.5, 70, 80, 90, 100, 110],
                       px_je_meter_aus_papier: 69.3, px_je_meter_aus_kette: 97.1,
                       raeume: [{ A: 18, h: 2.6 }, { A: 12, h: 2.6 }] };
    const nurGelesen = pruefe(Object.assign({}, streuung,
      { flaechen_herkunft: { textstand: 13, gemessen: 0, hand: 0 } }));
    if (nurGelesen.sperren.length !== 0
        || nurGelesen.guete !== "kein Maßstab beteiligt") {
      f.push("Sind alle Flaechen im Plan angeschrieben, darf der Massstab nicht "
        + "sperren, Guete ist: " + nurGelesen.guete);
    }
    if (!nurGelesen.befunde.some(function (x) {
      return x.stufe === "hinweis" && /hält den Bericht hier NICHT auf/.test(x.text);
    })) {
      f.push("Der Befund muss stehenbleiben und sagen, warum er nicht sperrt");
    }
    if (!nurGelesen.befunde.some(function (x) { return x.id === "ketten"; })) {
      f.push("Der Kettenvergleich muss weiter geprueft und gedruckt werden");
    }
    const eineGemessen = pruefe(Object.assign({}, streuung,
      { flaechen_herkunft: { textstand: 12, gemessen: 1, hand: 0 } }));
    if (eineGemessen.guete !== "nicht belastbar" || !eineGemessen.sperren.length) {
      f.push("EINE im Bild gemessene Flaeche genuegt, damit der Massstab wieder "
        + "sperrt, Guete ist: " + eineGemessen.guete);
    }
    const ohneAngabe = pruefe(streuung);
    if (ohneAngabe.guete !== "nicht belastbar") {
      f.push("Ohne Angabe zur Herkunft gilt die vorsichtige Seite: sperren. "
        + "Guete ist: " + ohneAngabe.guete);
    }

    /* --- Herkunft der Flächen, wenn kein Maßstab beteiligt war ---------- */
    const rHand = pruefe({ raeume: [{ A: 20 }], flaechen_herkunft:
      { textstand: 0, gemessen: 0, hand: 1 } });
    if (rHand.guete !== "kein Maßstab beteiligt") {
      f.push("Ohne Plan ist kein Maßstab beteiligt, ist: " + rHand.guete);
    }
    if (!/von Hand eingetragen/.test(rHand.hinweis_guete)) {
      f.push("Von Hand eingetragene Flächen müssen so benannt werden");
    }
    const rText = pruefe({ raeume: [{ A: 20 }], flaechen_herkunft:
      { textstand: 25, gemessen: 0, hand: 0 } });
    if (/von Hand eingetragen/.test(rText.hinweis_guete)) {
      f.push("Flächen aus dem Textstand des Plans sind NICHT von Hand "
        + "eingetragen: " + rText.hinweis_guete);
    }
    if (!/als Text im Plan/.test(rText.hinweis_guete)) {
      f.push("Der Textstand muss als Herkunft genannt werden, ist: "
        + rText.hinweis_guete);
    }
    const rGem = pruefe({ raeume: [{ A: 20 }], flaechen_herkunft:
      { textstand: 20, gemessen: 0, hand: 5 } });
    if (!/20/.test(rGem.hinweis_guete) || !/5/.test(rGem.hinweis_guete)) {
      f.push("Bei gemischter Herkunft müssen beide Zahlen genannt werden");
    }
    /* Ohne Angabe bleibt es beim alten Satz — kein Bruch für Projekte, die
       das Feld nicht mitliefern. */
    if (!/von Hand eingetragen/.test(pruefe({ raeume: [{ A: 20 }] }).hinweis_guete)) {
      f.push("Ohne Angabe zur Herkunft gilt der bisherige Satz");
    }

    /* --- Verteilte Flächen: der Fall „Bauantrag Soethe" ---------------- */
    const rVert = pruefe(Object.assign({}, streuung,
      { flaechen_herkunft: { textstand: 0, gemessen: 0, hand: 0, verteilt: 13 } }));
    if (rVert.sperren.length) {
      f.push("Verteilte Flaechen haengen an keinem Massstab: die Probe darf "
        + "den Bericht nicht aufhalten");
    }
    if (/von Hand eingetragen/.test(JSON.stringify(rVert.befunde))) {
      f.push("Eine verteilte Flaeche ist KEIN Handeintrag — der Satz, mit dem "
        + "die Sperre faellt, darf das nicht behaupten");
    }
    if (!/verteilt/.test(JSON.stringify(rVert.befunde))) {
      f.push("Der Satz, mit dem die Sperre faellt, muss die Verteilung nennen");
    }
    const rVertSatz = pruefe({ raeume: [{ A: 20 }], flaechen_herkunft:
      { textstand: 0, gemessen: 0, hand: 0, verteilt: 13 } });
    if (!/VERTEILT/.test(rVertSatz.hinweis_guete)
        || /steht der Bearbeiter ein/.test(rVertSatz.hinweis_guete)) {
      f.push("Fuer eine verteilte Flaeche steht nicht der Bearbeiter ein: "
        + rVertSatz.hinweis_guete);
    }
    /* Und die Gegenprobe: eine im Bild umfahrene Flaeche sperrt weiter. */
    const rVertGem = pruefe(Object.assign({}, streuung,
      { flaechen_herkunft: { textstand: 0, gemessen: 2, hand: 0, verteilt: 11 } }));
    if (!rVertGem.sperren.length) {
      f.push("Eine im Bild gemessene Flaeche sperrt weiter, auch neben "
        + "verteilten");
    }

    return { ok: f.length === 0, fehler: f, anzahl: 41 };
  }

  return { pruefe: pruefe, selbsttest: selbsttest,
           TUERBREITEN: TUERBREITEN, WANDDICKEN: WANDDICKEN };
});
