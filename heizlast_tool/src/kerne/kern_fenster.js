/* ===========================================================================
 * kern_fenster.js — Fensterflächen aus der Planauslese
 * ===========================================================================
 * Wozu dieses Modul da ist:
 * Bisher bekam jedes Fenster pauschal 1,6 m². Das ist bequem und falsch: ein
 * Badfenster hat ein Fünftel davon, eine Terrassentür das Doppelte. Der Fehler
 * geht voll in die Transmission ein, weil das Fenster den schlechtesten U-Wert
 * der Hülle hat und die Fläche zugleich von der Wand abgeht.
 *
 * Neu ist die Haltung: es kommt immer ein Ergebnis heraus. Was nicht abgelesen
 * werden kann, wird angenommen — aber jede Annahme ist gekennzeichnet, hat eine
 * Herleitung und ist überschreibbar. Damit daraus keine Scheingenauigkeit wird,
 * liefert jedes Ergebnis zusätzlich eine Bandbreite.
 *
 * WAS IM PLAN STEHT UND WAS NICHT
 *   Breite:  steht oft. Entweder als Maßzahl an der Öffnung oder über den
 *            Maßstab abgreifbar. Die Auslese liefert sie je Fenster.
 *   Höhe:    steht in einem Grundriss NIE. Sie ist immer eine Annahme.
 *   Deshalb ist die Höhe hier der einzige wirklich freie Parameter, und alle
 *   Standardhöhen sind unten einzeln hergeleitet.
 *
 * DOM-frei, ohne Abhängigkeiten, in Node und im Browser lauffähig.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_FENSTER = M;
})(this, function () {

  const rnd = (x, n) => Math.round(x * Math.pow(10, n || 0)) / Math.pow(10, n || 0);
  /* Zahl mit Hauptwort in der richtigen Zahlform. „1 Räume", „1 Seiten":
     ein Zähler, der nicht zählen kann, macht misstrauisch gegen jede
     andere Zahl auf dem Blatt. mz(1, "Raum", "Räume") -> "1 Raum". */
  const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);
  const zahl = (x, ers) => {
    const v = typeof x === "string" ? Number(String(x).replace(",", ".")) : Number(x);
    return Number.isFinite(v) ? v : (ers === undefined ? 0 : ers);
  };

  /* --- Rohbaumaße ---------------------------------------------------------
   * Maßordnung im Hochbau, 12,5-cm-Raster: das Rohbaumaß einer Öffnung ist das
   * Baurichtmaß plus 1 cm. Daraus die im Wohnungsbau gängigen Reihen. Sie sind
   * hier NICHT Rechengrundlage, sondern der Rahmen, in dem eine angenommene
   * Höhe überhaupt liegen darf; sie spannen die Bandbreite auf.
   * Die Türreihe deckt sich mit KERN_MASSSTABSPROBE.TUERBREITEN. */
  const ROHBAU_HOEHEN = [1.135, 1.26, 1.385, 1.51, 1.635];
  const ROHBAU_BREITEN = [0.635, 0.76, 0.885, 1.01, 1.135, 1.26, 1.385, 1.51,
                          1.635, 1.76, 2.01, 2.26, 2.51];

  /* --- Brüstung und Fensteroberkante --------------------------------------
   * Beides zusammen ergibt die Fensterhöhe: h = Oberkante minus Brüstung.
   *
   * Brüstung Regelfall 0,90 m: Eine Umwehrung muss bei einer Absturzhöhe bis
   *   12 m mindestens 0,90 m hoch sein (Musterbauordnung § 38 Abs. 4). Ein
   *   Fenster mit niedrigerer Brüstung braucht deshalb eine zusätzliche
   *   Absturzsicherung und ist im Bestand die Ausnahme, nicht die Regel.
   * Brüstung Nassraum 1,50 m: fachliche Setzung. Über dem Waschtisch
   *   (Oberkante 0,85 bis 0,95 m) liegt der Fliesenspiegel, und das Fenster
   *   soll Sichtschutz geben. Nicht normativ belegt.
   * Oberkante 2,30 m: fachliche Setzung. Bei der Regelraumhöhe von 2,50 m
   *   bleiben darüber 0,20 m für Sturz und Deckenanschluss. */
  const BRUESTUNG_REGEL = 0.90;
  const BRUESTUNG_NASS = 1.50;
  const OK_FENSTER = 2.30;

  /* --- Standardhöhen je Bauart -------------------------------------------- */
  const HOEHEN = {
    fenster: {
      h: rnd(OK_FENSTER - BRUESTUNG_REGEL, 2),     // 1,40 m
      min: 1.26, max: 1.635, belegt: false,
      quelle: "Oberkante 2,30 m über Fertigfußboden abzüglich Brüstung 0,90 m. "
        + "Die Brüstungshöhe folgt der Mindesthöhe einer Umwehrung nach "
        + "Musterbauordnung § 38 Abs. 4 (Absturzhöhe bis 12 m); die Oberkante ist "
        + "eine Setzung aus der Regelraumhöhe 2,50 m abzüglich 0,20 m Sturz. "
        + "Der Wert liegt zwischen den gängigen Rohbauhöhen 1,385 m und 1,51 m; "
        + "die Bandbreite spannt die Reihe 1,26 bis 1,635 m auf.",
    },
    fenster_nassraum: {
      h: rnd(OK_FENSTER - BRUESTUNG_NASS, 2),      // 0,80 m
      min: 0.60, max: 1.01, belegt: false,
      quelle: "Oberkante 2,30 m abzüglich erhöhter Brüstung 1,50 m. Die erhöhte "
        + "Brüstung ist eine fachliche Setzung: über dem Waschtisch (Oberkante "
        + "0,85 bis 0,95 m) liegt der Fliesenspiegel, und das Fenster gibt "
        + "Sichtschutz. Nicht normativ belegt.",
    },
    fenstertuer: {
      h: 2.10, min: 2.01, max: 2.26, belegt: false,
      quelle: "Balkon-, Terrassen- und Fenstertüren reichen bis zum Fußboden und "
        + "werden als Türelement ausgeführt. Rohbauhöhe 2,10 m, zwischen den "
        + "Rohbaumaßen 2,01 m und 2,135 m der Türreihe nach DIN 18100.",
    },
    dachflaechenfenster: {
      h: 1.18, min: 0.98, max: 1.40, belegt: false,
      quelle: "Fachliche Setzung aus den gängigen Baugrößen der Dachflächenfenster "
        + "(78 x 118, 114 x 118, 134 x 98, 94 x 140 cm). 1,18 m ist die häufigste "
        + "Höhe; die Bandbreite deckt 0,98 bis 1,40 m ab.",
    },
  };

  /* --- Die Haustür --------------------------------------------------------
   * Sie fehlte in jeder Rechnung. Die Gebäudetypologie liefert für jede
   * Baualtersklasse einen U-Wert der Außentür — der Bauteiltyp „Außentür"
   * entstand auch brav —, aber keine Zeile legte je ein Bauteil davon an.
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 22.08.2026): die
   * EG DIELE trug 7,65 m² Außenwand mit U 0,30 und sonst nichts, obwohl dort
   * die Haustür liegt. Mit U 2,00 statt 0,30 auf 2,16 m² fehlten rund 3,7 W/K.
   *
   * Das Maß ist eine ANNAHME und im Grundriss selten bemaßt: Rohbauöffnung
   * 1,01 m × 2,135 m, das größte Maß der Türreihe nach DIN 18100 — dieselbe
   * Reihe, aus der oben schon die Höhe der Fenstertür stammt. Zwei Wahrheiten
   * über dieselbe Türreihe gibt es damit nicht. Überschreibbar wie jede
   * andere Bauteilfläche. */
  const HAUSTUER = {
    breite_m: 1.01, hoehe_m: 2.135,
    A_m2: rnd(1.01 * 2.135, 2),
    quelle: "Rohbauöffnung 1,01 m × 2,135 m, das größte Maß der Türreihe nach "
      + "DIN 18100; dieselbe Reihe liefert die Höhe der Fenstertür. Im Grundriss "
      + "ist die Haustür fast nie bemaßt, deshalb eine Annahme — überschreibbar.",
  };

  /** Fläche und Herkunft der angenommenen Hauseingangstür. */
  function haustuer() {
    return { A_m2: HAUSTUER.A_m2, breite_m: HAUSTUER.breite_m,
             hoehe_m: HAUSTUER.hoehe_m, quelle: HAUSTUER.quelle, angenommen: true };
  }

  /* Räume, in denen die erhöhte Brüstung angesetzt wird. */
  const NASSRAEUME = ["bad", "wc", "dusche"];

  /* --- Rückfall ohne gemessene Breite -------------------------------------
   * Steht keine Breite zur Verfügung, wird die Fensterfläche aus der
   * Raumgrundfläche geschätzt. Anker ist das Bauordnungsrecht: Aufenthaltsräume
   * müssen Fenster mit einem Rohbaumaß der Fensteröffnungen von mindestens
   * einem Achtel der Netto-Grundfläche haben (Musterbauordnung § 47 Abs. 2).
   * Das ist ein Mindestmaß; ausgeführt wird regelmäßig mehr, weil das Rohbaumaß
   * im 12,5-cm-Raster aufgerundet wird. Angesetzt wird ein Sechstel als Setzung
   * zwischen dem Mindestmaß 1/8 und dem im Wohnungsbau oberen Ende von 1/4.
   * Für Nebenräume gibt es kein bauordnungsrechtliches Mindestmaß; ein Zehntel
   * ist eine fachliche Setzung. */
  const ANTEILE = {
    aufenthalt: {
      a: 1 / 6, min: 1 / 8, max: 1 / 4, belegt: false,
      quelle: "Setzung. Untergrenze ist das bauordnungsrechtliche Mindestmaß von "
        + "einem Achtel der Netto-Grundfläche (Musterbauordnung § 47 Abs. 2); "
        + "der Ansatz von einem Sechstel liegt darüber, weil das Rohbaumaß im "
        + "12,5-cm-Raster aufgerundet wird.",
    },
    neben: {
      a: 1 / 10, min: 1 / 14, max: 1 / 7, belegt: false,
      quelle: "Fachliche Setzung. Für Nebenräume verlangt das Bauordnungsrecht "
        + "kein Mindestmaß; angesetzt wird ein Zehntel der Grundfläche.",
    },
  };
  const AUFENTHALTSRAEUME = ["wohnen", "kueche", "buero", "verkauf", "werkstatt"];

  /* Ist selbst die Raumgrundfläche unbekannt, bleibt nur ein Regelfenster.
   * 1,26 m ist ein Rohbaumaß der Reihe und die Breite eines gängigen
   * zweiflügeligen Fensters. */
  const REGELBREITE = { b: 1.26, min: 0.885, max: 1.76 };

  /* --- Plausibilitätsgrenzen ----------------------------------------------
   * Obergrenze am Außenwandanteil: Bei Regelraumhöhe 2,50 m und Fensterhöhe
   * 1,40 m sind höchstens 1,40 / 2,50 = 56 Prozent der Wandhöhe verglast, und
   * das nur, wenn das Fenster über die ganze Wandbreite läuft. Ein Anteil über
   * 0,60 ist mit einem stehenden Fensterformat geometrisch nicht darstellbar
   * und deutet auf eine zu groß gemessene Breite oder eine zu kurz angesetzte
   * Wand. Ab 0,45 wird es erklärungsbedürftig.
   * Untergrenze: das Achtel der Grundfläche aus Musterbauordnung § 47 Abs. 2,
   * und nur bei Aufenthaltsräumen, weil es nur dort gilt. */
  const GRENZEN = {
    wandanteil_regel_min: 0.15,
    wandanteil_regel_max: 0.45,
    wandanteil_sperre: 0.60,
    grundflaechenanteil_min: 1 / 8,
  };

  function befund(id, titel, stufe, text, wert) {
    return { id: id, titel: titel, stufe: stufe, text: text,
             wert: wert === undefined ? null : wert };
  }

  /* ------------------------------------------------------------------ *
   * 1  Höhe je Fenster
   * ------------------------------------------------------------------ */

  /** Welche Bauart liegt vor? Die Auslese meldet nur, ob es eine Fenstertür
   *  ist; Dachflächenfenster erkennt sie am Symbol oder es steht im Raum. */
  function bauartFuer(f) {
    const t = String((f && f.typ) || "").toLowerCase();
    if (t === "dachflaechenfenster" || (f && f.ist_dachflaechenfenster)) {
      return "dachflaechenfenster";
    }
    if (t === "fenstertuer" || (f && f.ist_fenstertuer)) return "fenstertuer";
    return "fenster";
  }

  /** Standardhöhe einer Bauart, gegebenenfalls in der Nassraumfassung.
   *  Eine Eingabe des Bearbeiters hat immer Vorrang und gilt dann als belegt. */
  function hoeheFuer(bauart, raumart, ueberschreibung) {
    const eig = zahl(ueberschreibung, 0);
    if (eig > 0) {
      return { h: eig, min: eig, max: eig, angenommen: false,
               schluessel: bauart,
               quelle: "vom Bearbeiter eingetragen" };
    }
    let schluessel = bauart;
    if (bauart === "fenster"
        && NASSRAEUME.indexOf(String(raumart || "").toLowerCase()) >= 0) {
      schluessel = "fenster_nassraum";
    }
    const s = HOEHEN[schluessel] || HOEHEN.fenster;
    return { h: s.h, min: s.min, max: s.max, angenommen: true,
             schluessel: schluessel, quelle: s.quelle };
  }

  /* ------------------------------------------------------------------ *
   * 2  Ein einzelnes Fenster
   * ------------------------------------------------------------------ */

  /* Wie genau ist eine Breite? Eine angeschriebene Maßzahl ist exakt. Eine über
   * den Maßstab abgegriffene Strecke trägt den Fehler der Maßstabsbestimmung
   * und der Kantenerkennung; fünf Prozent sind dafür ein vorsichtiger Ansatz
   * und decken sich mit der Toleranz, die KERN_MASSSTABSPROBE zwischen zwei
   * Maßketten noch durchgehen lässt (dort 2 Prozent je Kette). */
  const TOLERANZ_GEMESSEN = 0.05;

  /** Rechnet ein Fenster durch. Liefert Fläche, Bandbreite und die Herleitung.
   *  @param f      { wand, breite_m, breite_quelle, ist_fenstertuer, typ }
   *  @param kontext { raumart, rueckfall_flaeche_m2, hoehe_ueberschreibung }
   */
  function fensterRechnen(f, kontext) {
    const e = f || {}, k = kontext || {};
    const bauart = bauartFuer(e);
    const H = hoeheFuer(bauart, k.raumart, k.hoehe_ueberschreibung);
    const quelle = String(e.breite_quelle || "").toLowerCase();
    let b = zahl(e.breite_m, 0);
    if (!(b > 0)) b = 0;

    let bmin = b, bmax = b, breitenherkunft, angenommen_breite = false;
    if (b > 0 && quelle === "bemasst") {
      breitenherkunft = "im Plan angeschriebene Maßzahl";
    } else if (b > 0) {
      bmin = b * (1 - TOLERANZ_GEMESSEN);
      bmax = b * (1 + TOLERANZ_GEMESSEN);
      breitenherkunft = "über den Maßstab am Plan abgegriffen, "
        + Math.round(TOLERANZ_GEMESSEN * 100) + " Prozent Toleranz";
    } else {
      /* Keine Breite ablesbar: aus der Rückfallfläche des Raums zurückrechnen.
         Die Fläche steckt dann schon die Bandbreite; die Höhe bleibt fest,
         damit nicht zweimal dieselbe Unsicherheit gezählt wird. */
      angenommen_breite = true;
      const A = zahl(k.rueckfall_flaeche_m2, 0);
      const Amin = zahl(k.rueckfall_flaeche_min_m2, 0);
      const Amax = zahl(k.rueckfall_flaeche_max_m2, 0);
      if (A > 0) {
        b = A / H.h; bmin = (Amin > 0 ? Amin : A) / H.h; bmax = (Amax > 0 ? Amax : A) / H.h;
        breitenherkunft = "aus dem angenommenen Fensterflächenanteil des Raums "
          + "zurückgerechnet";
      } else {
        b = REGELBREITE.b; bmin = REGELBREITE.min; bmax = REGELBREITE.max;
        breitenherkunft = "Regelbreite " + REGELBREITE.b + " m, weil weder eine "
          + "Maßzahl noch die Raumgrundfläche vorliegt";
      }
      /* Zurückgerechnete Breiten müssen baubar bleiben. */
      const kappe = (x) => Math.min(REGELBREITE.max * 1.6, Math.max(0.50, x));
      b = kappe(b); bmin = kappe(bmin); bmax = kappe(bmax);
    }

    const A = b * H.h;
    /* Bandbreite: bei gemessener Breite aus Breitentoleranz mal Höhenband,
       bei angenommener Breite allein aus dem Flächenband. */
    const A_min = angenommen_breite ? bmin * H.h : bmin * H.min;
    const A_max = angenommen_breite ? bmax * H.h : bmax * H.max;

    return {
      wand: String(e.wand || "unklar"),
      bauart: bauart,
      breite_m: rnd(b, 3),
      breite_angenommen: angenommen_breite,
      breite_herkunft: breitenherkunft,
      hoehe_m: rnd(H.h, 3),
      hoehe_angenommen: H.angenommen,
      hoehe_herkunft: H.quelle,
      A_m2: rnd(A, 3),
      A_min_m2: rnd(A_min, 3),
      A_max_m2: rnd(A_max, 3),
      angenommen: angenommen_breite || H.angenommen,
    };
  }

  /* ------------------------------------------------------------------ *
   * 3  Rückfall je Raumart
   * ------------------------------------------------------------------ */

  function anteilFuer(raumart) {
    const a = String(raumart || "").toLowerCase();
    return AUFENTHALTSRAEUME.indexOf(a) >= 0 ? ANTEILE.aufenthalt : ANTEILE.neben;
  }

  /** Gesamte Fensterfläche eines Raums allein aus Raumart und Grundfläche.
   *  Wird gebraucht, wenn keine einzige Breite ablesbar ist. */
  function rueckfallFlaeche(raumart, A_raum) {
    const A = zahl(A_raum, 0);
    if (!(A > 0)) return null;
    const s = anteilFuer(raumart);
    return { A_m2: rnd(A * s.a, 3), A_min_m2: rnd(A * s.min, 3),
             A_max_m2: rnd(A * s.max, 3), anteil: s.a, quelle: s.quelle };
  }

  /* ------------------------------------------------------------------ *
   * 4  Plausibilität
   * ------------------------------------------------------------------ */

  /** Außenwandfläche des Raums. Ist die Wandlänge bekannt, wird sie genommen;
   *  sonst wird der Raum als Quadrat angenähert, so wie es KERN_ZUORDNUNG tut. */
  function wandflaeche(raum) {
    const r = raum || {};
    const h = zahl(r.h, 0);
    if (!(h > 0)) return null;
    let l = zahl(r.wandlaenge, 0);
    if (!(l > 0)) {
      const n = Math.max(0, Math.round(zahl(r.aussenwaende, 0)));
      const A = zahl(r.A, 0);
      if (!(n > 0) || !(A > 0)) return null;
      l = n * Math.sqrt(A);
    }
    return l * h;
  }

  /** Prüft die ermittelte Fensterfläche gegen die üblichen Bänder.
   *  Übertretungen sind Befunde, keine stille Übernahme.
   *
   *  @param opt { breiten_gemessen, anzahl } — wie viele der Öffnungen dieses
   *         Raums eine im Plan gelesene Breite haben. Ist es keine einzige,
   *         WIRD KEIN „gut" GEMELDET: die Fensterfläche stammt dann aus
   *         rueckfallFlaeche(), also aus der Raumgrundfläche, und die
   *         Wandfläche mangels Wandlänge aus derselben Grundfläche. Der
   *         Quotient ist sqrt(A) / (6 · n · h) und liegt für jeden üblichen
   *         Wohnraum im Band — er sagt über die Fenster nichts aus. Ein „gut"
   *         darauf ist eine Auskunft, die das Werkzeug nicht hat. Die
   *         Übertretungen bleiben: eine zu grosse oder zu kleine Fläche
   *         verrät auch dann noch eine krumme Raumgeometrie. Was an dieser
   *         Stelle nicht mehr gesagt wird, sagt KERN_FENSTER.huellenprobe
   *         einmal fürs ganze Gebäude — dort steht die Fassade aus der
   *         bemassten Aussenkontur gegen die Fenster, und das sind zwei
   *         unabhängige Zahlen. */
  function plausibilitaet(raum, A_fenster, opt) {
    const r = raum || {}, b = [], o = opt || {};
    const A_f = zahl(A_fenster, 0);
    const aufenthalt = AUFENTHALTSRAEUME.indexOf(String(r.art || "").toLowerCase()) >= 0;
    const AW = wandflaeche(r);
    const name = r.name || "Raum";
    const nichtsGelesen = zahl(o.anzahl, 0) > 0 && zahl(o.breiten_gemessen, 0) === 0;

    if (AW > 0) {
      const anteil = A_f / AW;
      if (anteil > GRENZEN.wandanteil_sperre) {
        b.push(befund("wandanteil", "Fensterflächenanteil an der Außenwand", "sperre",
          "In \"" + name + "\" nehmen die Fenster " + Math.round(anteil * 100)
          + " Prozent der Außenwandfläche ein (" + rnd(A_f, 2) + " von "
          + rnd(AW, 2) + " m²). Mehr als "
          + Math.round(GRENZEN.wandanteil_sperre * 100) + " Prozent sind mit einem "
          + "stehenden Fensterformat nicht darstellbar: bei 2,50 m Raumhöhe und "
          + "1,40 m Fensterhöhe sind höchstens 56 Prozent der Wandhöhe verglast. "
          + "Entweder ist eine Breite zu groß abgelesen oder die Wand zu kurz "
          + "angesetzt.", anteil));
      } else if (anteil > GRENZEN.wandanteil_regel_max) {
        b.push(befund("wandanteil", "Fensterflächenanteil an der Außenwand", "hinweis",
          "In \"" + name + "\" nehmen die Fenster " + Math.round(anteil * 100)
          + " Prozent der Außenwandfläche ein. Üblich sind "
          + Math.round(GRENZEN.wandanteil_regel_min * 100) + " bis "
          + Math.round(GRENZEN.wandanteil_regel_max * 100)
          + " Prozent. Bei einem Wintergarten oder einer Fensterfront ist das "
          + "richtig, sonst zu prüfen.", anteil));
      } else if (!nichtsGelesen) {
        b.push(befund("wandanteil", "Fensterflächenanteil an der Außenwand", "gut",
          "In \"" + name + "\" liegen die Fenster bei " + Math.round(anteil * 100)
          + " Prozent der Außenwandfläche.", anteil));
      }
    }

    if (aufenthalt && zahl(r.A, 0) > 0) {
      const mindest = zahl(r.A, 0) * GRENZEN.grundflaechenanteil_min;
      if (A_f < mindest) {
        b.push(befund("mindestfenster", "Bauordnungsrechtliches Mindestmaß", "hinweis",
          "\"" + name + "\" ist ein Aufenthaltsraum mit " + rnd(zahl(r.A, 0), 2)
          + " m² Grundfläche. Die Musterbauordnung verlangt in § 47 Abs. 2 "
          + "Fensteröffnungen von mindestens einem Achtel der Netto-Grundfläche, "
          + "hier " + rnd(mindest, 2) + " m². Ermittelt wurden " + rnd(A_f, 2)
          + " m². Wahrscheinlich fehlt ein Fenster oder eine Breite ist zu klein "
          + "abgelesen.", A_f / mindest));
      }
    }
    return b;
  }

  /* ------------------------------------------------------------------ *
   * 5  Ein Raum vollständig
   * ------------------------------------------------------------------ */

  /** Ermittelt die Fenster eines Raums.
   *
   *  @param raum  { name, art, A, h, aussenwaende, wandlaenge,
   *                 fenster: Anzahl, fensterliste: [ ... aus der Auslese ] }
   *  @param opt   { hoehen: { fenster, fenster_nassraum, fenstertuer,
   *                           dachflaechenfenster } }  Überschreibungen in m
   *  @return { fenster, A_m2, A_min_m2, A_max_m2, annahmen, befunde, ... }
   */
  function fensterFuerRaum(raum, opt) {
    const r = raum || {}, o = opt || {};
    const hoehen = o.hoehen || {};
    const liste = Array.isArray(r.fensterliste) ? r.fensterliste.slice() : [];
    const gemeldet = Math.max(0, Math.round(zahl(r.fenster, liste.length)));
    const annahmen = [], hinweise = [];

    /* Zahl und Liste in Einklang bringen. Die Liste ist die genauere Angabe;
       meldet die Auslese mehr Fenster als sie einzeln aufführt, werden die
       fehlenden ohne Breite ergänzt, damit keines unter den Tisch fällt. */
    if (gemeldet > liste.length) {
      for (let i = liste.length; i < gemeldet; i++) {
        liste.push({ wand: "unklar", breite_m: null, breite_quelle: "unbekannt",
                     ist_fenstertuer: false });
      }
      hinweise.push("Die Auslese zählt " + gemeldet + " Fenster, führt aber nur "
        + (gemeldet - (gemeldet - liste.length)) + " einzeln auf. Die fehlenden "
        + "wurden ohne Breite ergänzt.");
    } else if (liste.length > gemeldet && gemeldet > 0) {
      hinweise.push("Die Auslese führt " + liste.length + " Fenster einzeln auf, "
        + "zählt aber nur " + gemeldet + ". Es gilt die Einzelaufstellung.");
    }

    const anzahl = liste.length;
    if (!anzahl) {
      return { fenster: [], anzahl: 0, A_m2: 0, A_min_m2: 0, A_max_m2: 0,
               annahmen: [], befunde: [], hinweise: hinweise,
               herkunft: "Der Raum hat kein Fenster." };
    }

    /* Rückfallfläche je Fenster, falls Breiten fehlen. */
    const rf = rueckfallFlaeche(r.art, r.A);
    const jeFenster = rf
      ? { rueckfall_flaeche_m2: rf.A_m2 / anzahl,
          rueckfall_flaeche_min_m2: rf.A_min_m2 / anzahl,
          rueckfall_flaeche_max_m2: rf.A_max_m2 / anzahl }
      : {};

    const fenster = liste.map(function (f) {
      const bauart = bauartFuer(f);
      return fensterRechnen(f, Object.assign({
        raumart: r.art,
        hoehe_ueberschreibung: hoehen[bauart === "fenster"
          && NASSRAEUME.indexOf(String(r.art || "").toLowerCase()) >= 0
            ? "fenster_nassraum" : bauart],
      }, jeFenster));
    });

    const summe = (feld) => fenster.reduce(function (s, x) { return s + x[feld]; }, 0);
    const A = summe("A_m2"), A_min = summe("A_min_m2"), A_max = summe("A_max_m2");

    /* Annahmen sammeln, je Sachverhalt einmal, nicht je Fenster. */
    const gesehen = {};
    fenster.forEach(function (x) {
      if (x.hoehe_angenommen && !gesehen["h_" + x.bauart]) {
        gesehen["h_" + x.bauart] = true;
        annahmen.push({
          feld: "hoehe", bauart: x.bauart, wert: x.hoehe_m, einheit: "m",
          text: "Fensterhöhe " + rnd(x.hoehe_m, 2) + " m angenommen. In einem "
            + "Grundriss steht keine Fensterhöhe.",
          herleitung: x.hoehe_herkunft, ueberschreibbar: true,
        });
      }
      if (x.breite_angenommen && !gesehen.breite) {
        gesehen.breite = true;
        annahmen.push({
          feld: "breite", bauart: x.bauart, wert: x.breite_m, einheit: "m",
          text: "Fensterbreite angenommen, im Plan nicht ablesbar.",
          herleitung: x.breite_herkunft + (rf ? "; " + rf.quelle : ""),
          ueberschreibbar: true,
        });
      }
    });

    /* Wie belastbar ist das Ergebnis? Entscheidend ist, wie viele Breiten
       wirklich abgelesen wurden; die Höhe ist immer eine Annahme. */
    const gemessen = fenster.filter(function (x) { return !x.breite_angenommen; }).length;

    const befunde = plausibilitaet(r, A,
      { breiten_gemessen: gemessen, anzahl: anzahl });

    const guete = gemessen === anzahl ? "Breiten aus dem Plan"
      : (gemessen > 0 ? "Breiten teilweise aus dem Plan" : "vollständig angenommen");

    return {
      fenster: fenster,
      anzahl: anzahl,
      A_m2: rnd(A, 2),
      A_min_m2: rnd(A_min, 2),
      A_max_m2: rnd(A_max, 2),
      spanne_prozent: A > 0 ? rnd((A_max - A_min) / A * 100, 0) : 0,
      breiten_gemessen: gemessen,
      guete: guete,
      annahmen: annahmen,
      befunde: befunde,
      hinweise: hinweise,
      belastbar: !befunde.some(function (x) { return x.stufe === "sperre"; }),
      herkunft: anzahl + " Fenster, " + guete + ", Höhe angenommen",
    };
  }

  /** Alle Räume eines Projekts auf einmal. Liefert zusätzlich die Summe. */
  function fensterFuerProjekt(raeume, opt) {
    const je = {}, alle = [];
    let A = 0, A_min = 0, A_max = 0;
    (raeume || []).forEach(function (r, i) {
      const e = fensterFuerRaum(r, opt);
      const k = r && (r.id || r.name) ? String(r.id || r.name) : "raum_" + i;
      je[k] = e;
      alle.push(e);
      A += e.A_m2; A_min += e.A_min_m2; A_max += e.A_max_m2;
    });
    const befunde = alle.reduce(function (s, e) { return s.concat(e.befunde); }, []);
    return {
      je_raum: je,
      A_m2: rnd(A, 2), A_min_m2: rnd(A_min, 2), A_max_m2: rnd(A_max, 2),
      spanne_prozent: A > 0 ? rnd((A_max - A_min) / A * 100, 0) : 0,
      befunde: befunde,
      sperren: befunde.filter(function (x) { return x.stufe === "sperre"; }),
      belastbar: !befunde.some(function (x) { return x.stufe === "sperre"; }),
    };
  }

  /* ------------------------------------------------------------------ *
   * 6  Die Probe über das ganze Gebäude
   * ------------------------------------------------------------------ */

  /* WARUM ES DIESE PROBE BRAUCHT — plausibilitaet() findet nichts.
   *
   * plausibilitaet() hält je Raum die Fensterfläche gegen die Außenwand-
   * fläche. Ist keine Breite ablesbar, kommt die Fensterfläche aus
   * rueckfallFlaeche(): ein Sechstel der Raumgrundfläche. Die Wandfläche
   * desselben Raums wird, solange keine Wandlänge vorliegt, als
   * n · sqrt(A) · h angenähert — ebenfalls aus der Raumgrundfläche. Der
   * Quotient ist dann sqrt(A) / (6 · n · h) und hängt von der Zahl der
   * Fenster überhaupt nicht mehr ab. Für jeden üblichen Wohnraum liegt er
   * zwischen 7 und 25 Prozent, also mitten im Band, und die Zeile meldet
   * „gut". Eine Probe, die beide Größen aus derselben Zahl zieht, prüft
   * nichts. Schlimmer: ein Raum ohne Fenster erzeugt gar keinen Befund,
   * weil fensterFuerRaum() vorher aussteigt — es fehlt genau dort eine
   * Meldung, wo etwas fehlt.
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 23.08.2026,
   * Live-Endpunkt): 8 Fenster im ganzen Haus, 8 Befunde, alle 8 „gut",
   * Anteile 7 bis 24 Prozent. Die zweite Lesung zählte 13.
   *
   * WAS DIESE PROBE ANDERS MACHT. Sie fragt das ganze Gebäude auf einmal,
   * und sie nimmt die Fassadenfläche aus dem Umfangsabgleich — also aus der
   * Außenkontur des Geschosses, die auf dem Blatt bemaßt ist und mit der
   * Fensterzahl nichts zu tun hat. Damit stehen zwei unabhängig gewonnene
   * Zahlen gegeneinander.
   *
   * DIE UNTERGRENZE IST HERGELEITET, NICHT GESETZT: Aufenthaltsräume
   * brauchen Fensteröffnungen von mindestens einem Achtel ihrer
   * Netto-Grundfläche (Musterbauordnung § 47 Abs. 2). Über alle
   * Aufenthaltsräume eines Gebäudes summiert ist das eine harte Grenze, und
   * sie ist nicht zirkulär: die Grundflächen stehen im Raumbuch, die
   * Fensterflächen kommen aus der Fensterliste. Fehlt einem Raum das
   * Fenster ganz, trägt er null zur Summe bei, seine Grundfläche aber voll
   * zur Anforderung. Erst ab einem Viertel fehlender Wohnfläche schlägt die
   * Zeile an — der Ansatz von einem Sechstel liegt um genau diesen Faktor
   * über dem Mindestmaß von einem Achtel.
   *
   * WAS SIE NICHT TUT: sie nennt kein „übliches" Fensterband für Wohn-
   * gebäude. Ein solcher Wert wäre eine Setzung ohne Fundstelle. Was als
   * Erwartung im Text steht, ist das Mindestmaß aus § 47 Abs. 2, auf die
   * Fassadenfläche DIESES Gebäudes umgerechnet. */
  /* GEPRUEFT WIRD, WAS GERECHNET WIRD.
   *
   * Diese Probe bildete ihre beiden Zahlen bisher selbst: die Fensterflaeche
   * aus fensterFuerRaum(), die Fassade aus Wandlaenge mal Raumhoehe. Beides
   * sind PLAUSIBLE Wege — aber nicht die Zahlen, die im Ergebnis stehen. Die
   * Rechnung nimmt die BAUTEILE der Raeume, und in denen stecken zusaetzlich
   * die Fenster aus der zweiten Lesung, die angenommene Fensterflaeche fuer
   * Raeume ohne gelesenes Fenster und die Tueren.
   * GEMESSEN am Blatt „260514 Dumach 1" (Prueflauf 26.08.2026): die
   * Selbstpruefung meldete gruen „29,18 m² Fenster auf 215,93 m² Fassade,
   * das sind 14 Prozent" — im Rechenmodell standen 45,8 m² Fenster auf
   * 316,2 m² Fassade. Der gruene Haken belegte Zahlen, die im Ergebnis nicht
   * vorkommen.
   * Liegen die gerechneten Bauteile vor (gerechnet_je_raum), gelten sie.
   * Ohne sie bleibt es beim bisherigen Weg — Modul-Selbsttests und aeltere
   * Staende rechnen unveraendert weiter. */
  function huellenprobe(raeume, opt) {
    const o = opt || {};
    const wl = o.wandlaenge_je_raum || {};
    const jeRaum = o.je_raum || null;
    const gerechnet = o.gerechnet_je_raum || null;
    const b = [];
    let A_f = 0, A_fassade = 0, A_ngf_auf = 0, A_f_auf = 0, A_f_angenommen = 0;
    let raeumeMitFassade = 0;
    const ohneFenster = [];

    (raeume || []).forEach(function (r, i) {
      if (!r || typeof r !== "object") return;
      const id = String((r.id || r.name) || ("raum_" + i));
      const g = gerechnet ? gerechnet[id] : null;
      let e = jeRaum && jeRaum[id];
      if (!e) { try { e = fensterFuerRaum(r, o); } catch (x) { e = null; } }
      /* LIEGEN DIE GERECHNETEN BAUTEILE VOR, ZAEHLT DER RAUM MIT — auch
         dann, wenn die Fensterableitung fuer ihn nichts hergibt. Sonst
         faellt genau der Raum aus der Probe, dessen Fenster das Werkzeug
         selbst angenommen hat (Blatt „Hasenberg 10": kein einziger Raum kam
         durch, die Probe stand auf 0,00 m² Fassade). */
      if (!e && !g) return;
      const h = zahl(r.h, 0);
      let l = zahl(wl[id], 0);
      if (!(l > 0)) l = zahl(r.wandlaenge, 0);
      if (!(l > 0)) {
        const n = Math.max(0, Math.round(zahl(r.aussenwaende, 0)));
        const A0 = zahl(r.A, 0);
        l = (n > 0 && A0 > 0) ? n * Math.sqrt(A0) : 0;
      }
      const fassade = g ? zahl(g.A_fassade, 0) : l * h;
      if (fassade > 0) { A_fassade += fassade; raeumeMitFassade++; }
      const A_r = g ? zahl(g.A_fenster, 0) : zahl((e || {}).A_m2, 0);
      A_f += A_r;
      ((e && e.fenster) || []).forEach(function (x) {
        if (x && x.breite_angenommen) A_f_angenommen += zahl(x.A_m2, 0);
      });
      if (AUFENTHALTSRAEUME.indexOf(String(r.art || "").toLowerCase()) >= 0
          && zahl(r.A, 0) > 0) {
        A_ngf_auf += zahl(r.A, 0);
        A_f_auf += A_r;
        if (!(A_r > 0) && fassade > 0) ohneFenster.push(r.name || id);
      }
    });

    /* 6a  Das bauordnungsrechtliche Mindestmaß, über das Gebäude summiert. */
    if (A_ngf_auf > 0) {
      const soll = A_ngf_auf * GRENZEN.grundflaechenanteil_min;
      const fehlt = soll - A_f_auf;
      if (fehlt > 0.005) {
        b.push(befund("mindestfenster_gebaeude",
          "Fensterfläche gegen das Mindestmaß aller Aufenthaltsräume", "warnung",
          "Die Aufenthaltsräume des Gebäudes haben zusammen "
          + rnd(A_ngf_auf, 2) + " m² Netto-Grundfläche. Die Musterbauordnung "
          + "verlangt in § 47 Abs. 2 Fensteröffnungen von mindestens einem "
          + "Achtel davon, also " + rnd(soll, 2) + " m². Ermittelt sind "
          + rnd(A_f_auf, 2) + " m²; es fehlen " + rnd(fehlt, 2) + " m². "
          + "Beide Zahlen stammen aus verschiedenen Quellen — die Grundflächen "
          + "aus dem Raumbuch, die Fensterflächen aus der Fensterliste —, die "
          + "Unterschreitung ist deshalb kein Rechenartefakt."
          + (ohneFenster.length
            ? " Ohne jedes Fenster " + (ohneFenster.length === 1 ? "ist " : "sind ")
              + ohneFenster.join(", ") + ", obwohl "
              + (ohneFenster.length === 1 ? "dieser Raum" : "diese Räume")
              + " an der Außenwand "
              + (ohneFenster.length === 1 ? "liegt" : "liegen") + "."
            : " Wahrscheinlich sind einzelne Breiten zu klein abgelesen."),
          A_f_auf / soll));
      } else {
        b.push(befund("mindestfenster_gebaeude",
          "Fensterfläche gegen das Mindestmaß aller Aufenthaltsräume", "gut",
          "Die Aufenthaltsräume tragen zusammen " + rnd(A_f_auf, 2)
          + " m² Fenster auf " + rnd(A_ngf_auf, 2) + " m² Netto-Grundfläche. "
          + "Das Mindestmaß nach Musterbauordnung § 47 Abs. 2 (ein Achtel, "
          + rnd(soll, 2) + " m²) ist eingehalten.", A_f_auf / soll));
      }
    }

    /* 6b  Der Anteil an der Fassade, gegen die Kontur und nicht gegen sich
           selbst. Die Erwartung ist das Mindestmaß aus 6a, auf die Fassade
           DIESES Gebäudes umgerechnet — keine fremde Erfahrungszahl. */
    if (A_fassade > 0) {
      const anteil = A_f / A_fassade;
      const erwartet = A_ngf_auf > 0
        ? (A_ngf_auf * GRENZEN.grundflaechenanteil_min) / A_fassade : null;
      const rahmen = "Im ganzen Gebäude stehen " + rnd(A_f, 2)
        + " m² Fenster auf " + rnd(A_fassade, 2) + " m² Fassade, das sind "
        + Math.round(anteil * 100) + " Prozent. "
        + (gerechnet
          ? "Beide Zahlen sind die der Rechnung: sie kommen aus den Bauteilen "
            + "der Räume, also aus genau den Flächen, die im Ergebnis stehen."
          : "Die Fassadenfläche kommt aus dem Umfangsabgleich, also aus der "
            + "bemaßten Außenkontur, und ist damit von der Zahl der gelesenen "
            + "Fenster unabhängig.")
        + (erwartet !== null
          ? " Allein das Mindestmaß der Aufenthaltsräume (Musterbauordnung "
            + "§ 47 Abs. 2) verlangt hier " + Math.round(erwartet * 100)
            + " Prozent."
          : "");
      if (anteil > GRENZEN.wandanteil_sperre) {
        b.push(befund("fassadenanteil", "Fensterflächenanteil an der Fassade",
          "sperre", rahmen + " Mehr als "
          + Math.round(GRENZEN.wandanteil_sperre * 100) + " Prozent sind mit "
          + "einem stehenden Fensterformat nicht darstellbar: bei 2,50 m "
          + "Raumhöhe und 1,40 m Fensterhöhe sind höchstens 56 Prozent der "
          + "Wandhöhe verglast. Entweder ist eine Breite zu groß abgelesen "
          + "oder die Kontur zu klein angesetzt.", anteil));
      } else if (erwartet !== null && anteil < erwartet) {
        b.push(befund("fassadenanteil", "Fensterflächenanteil an der Fassade",
          "warnung", rahmen + " Der ermittelte Anteil liegt darunter. Für ein "
          + "Wohngebäude heißt das: es fehlen Öffnungen oder Breiten.", anteil));
      } else {
        b.push(befund("fassadenanteil", "Fensterflächenanteil an der Fassade",
          "gut", rahmen, anteil));
      }
    }

    /* 6d  DIE ANSICHT ALS ZWEITE, UNABHÄNGIGE QUELLE FÜR DIE GRÖSSE.
     *
     * Ein Grundriss zeigt von einer Öffnung nur die Breite, die Höhe zeigt er
     * nie. Eine Ansicht zeigt beides in wahrer Größe und in beiden Richtungen
     * im selben Maßstab. Die zweite Lesung misst deshalb je Öffnung zwei
     * Anteile an der Breite der gezeichneten Fassade; mit der Fassadenbreite
     * in Metern — aus der Außenbemaßung des Grundrisses oder an der Ansicht
     * selbst angeschrieben — wird daraus eine Fläche.
     *
     * VERGLICHEN WIRD DIE MITTLERE ÖFFNUNG, nicht die Summe: die Ansicht
     * zeigt eine Fassade, das Raumbuch das ganze Haus. Die mittlere
     * Öffnungsfläche ist die einzige Größe, die beide Seiten vergleichbar
     * machen, und sie ist genau die, die schiefliegt, wenn keine Breite
     * gelesen wurde.
     *
     * DIE TOLERANZ IST HERGELEITET: eine am Bild abgegriffene Kante trifft
     * die Öffnung auf etwa eine Wanddicke genau, also rund 0,24 m; auf eine
     * Öffnung von 2 m sind das 12 Prozent. Die Fläche ist ein Produkt zweier
     * solcher Kanten, 1,12 mal 1,12 ergibt rund 1,25. Erst darüber ist der
     * Unterschied mehr als die Messung. */
    if (Array.isArray(o.ansichten) && o.ansichten.length) {
      const B0 = zahl(o.fassadenbreite_m, 0);
      let A_ans = 0, n_ans = 0;
      const fassaden = [];
      o.ansichten.forEach(function (a) {
        if (!a || !Array.isArray(a.oeffnungen) || !a.oeffnungen.length) return;
        const B = zahl(a.breite_bezug_m, 0) > 0 ? zahl(a.breite_bezug_m, 0) : B0;
        if (!(B > 0)) return;
        let s = 0;
        a.oeffnungen.forEach(function (x) {
          s += zahl(x.breite_anteil, 0) * B * zahl(x.hoehe_anteil, 0) * B;
        });
        if (!(s > 0)) return;
        A_ans += s; n_ans += a.oeffnungen.length;
        fassaden.push(String(a.fassade || "eine Fassade"));
      });
      let n_buch = 0;
      (raeume || []).forEach(function (r, i) {
        if (!r || typeof r !== "object") return;
        const id = String((r.id || r.name) || ("raum_" + i));
        let e = jeRaum && jeRaum[id];
        if (!e) { try { e = fensterFuerRaum(r, o); } catch (x) { e = null; } }
        if (e) n_buch += Math.max(0, zahl(e.anzahl, 0));
      });
      if (n_ans > 0 && n_buch > 0 && A_f > 0) {
        const mAns = A_ans / n_ans, mBuch = A_f / n_buch;
        const v = mAns / mBuch;
        const rahmen = "Die Ansicht " + fassaden.join(" und ") + " zeigt "
          + mz(n_ans, "Öffnung", "Öffnungen") + " mit im Mittel "
          + rnd(mAns, 2) + " m². Im Raumbuch stehen "
          + mz(n_buch, "Öffnung", "Öffnungen") + " mit im Mittel "
          + rnd(mBuch, 2) + " m². Die Ansicht ist an der Fassadenbreite "
          + "ausgemessen und damit von der Rechnung im Raumbuch unabhängig.";
        if (v > 1.25) {
          b.push(befund("ansichtsflaeche", "Fenstergröße gegen die Ansicht",
            "warnung", rahmen + " Die Ansicht kommt auf das "
            + rnd(v, 2).toString().replace(".", ",") + "-fache. Die Öffnungen "
            + "im Raumbuch sind zu klein; das ist der Fehler, den eine "
            + "fehlende Breite im Grundriss macht — große Elemente werden auf "
            + "den Fensterflächenanteil des Raums heruntergerechnet. Die "
            + "Toleranz von 25 Prozent deckt die Messung am Bild ab (eine "
            + "Wanddicke je Kante).", v));
        } else if (v < 1 / 1.25) {
          b.push(befund("ansichtsflaeche", "Fenstergröße gegen die Ansicht",
            "hinweis", rahmen + " Die Ansicht kommt nur auf das "
            + rnd(v, 2).toString().replace(".", ",") + "-fache. Entweder ist "
            + "eine Breite im Grundriss zu groß gelesen oder die "
            + "Fassadenbreite, mit der die Ansicht ausgemessen wurde, ist "
            + "nicht die der gezeichneten Fassade.", v));
        } else {
          b.push(befund("ansichtsflaeche", "Fenstergröße gegen die Ansicht",
            "gut", rahmen + " Beide Lesungen liegen innerhalb der Toleranz "
            + "von 25 Prozent.", v));
        }
      }
    }

    /* 6c  Worauf die Fläche ruht. Eine Zahl, die vollständig aus dem
           Rückfall stammt, darf nicht wie eine abgelesene aussehen. */
    if (A_f > 0) {
      const anteilAnnahme = A_f_angenommen / A_f;
      if (anteilAnnahme > 0.5) {
        b.push(befund("breiten_ungelesen", "Herkunft der Fensterflächen",
          "hinweis", Math.round(anteilAnnahme * 100) + " Prozent der "
          + "Fensterfläche des Gebäudes (" + rnd(A_f_angenommen, 2) + " von "
          + rnd(A_f, 2) + " m²) beruhen auf dem angenommenen Fensterflächen"
          + "anteil des Raums, nicht auf einer im Plan gelesenen Breite. Die "
          + "Annahme ist am bauordnungsrechtlichen Mindestmaß verankert und "
          + "trifft deshalb eher die untere Kante. Große Öffnungen — Hebe-"
          + "Schiebe-Elemente, Fenstertüren, Fensterbänder — bleiben dabei "
          + "systematisch zu klein, und das Fenster hat den schlechtesten "
          + "U-Wert der Hülle. Wo eine Breite im Plan steht, gehört sie "
          + "eingetragen.", anteilAnnahme));
      } else {
        b.push(befund("breiten_ungelesen", "Herkunft der Fensterflächen",
          "gut", Math.round((1 - anteilAnnahme) * 100) + " Prozent der "
          + "Fensterfläche stehen auf einer im Plan gelesenen Breite.",
          anteilAnnahme));
      }
    }

    return {
      A_fenster_m2: rnd(A_f, 2),
      A_fassade_m2: rnd(A_fassade, 2),
      anteil: A_fassade > 0 ? rnd(A_f / A_fassade, 4) : null,
      A_ngf_aufenthalt_m2: rnd(A_ngf_auf, 2),
      A_fenster_aufenthalt_m2: rnd(A_f_auf, 2),
      A_angenommen_m2: rnd(A_f_angenommen, 2),
      raeume_ohne_fenster: ohneFenster,
      raeume_mit_fassade: raeumeMitFassade,
      befunde: b,
      belastbar: !b.some(function (x) { return x.stufe === "sperre"; }),
    };
  }

  /* ------------------------------------------------------------------ *
   * Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    const nah = (a, b, t) => Math.abs(a - b) <= (t === undefined ? 0.005 : t);

    /* --- Höhen und ihre Herleitung ---------------------------------- */
    if (!nah(HOEHEN.fenster.h, 1.40)) f.push("Regelfensterhöhe muss 1,40 m sein");
    if (!nah(OK_FENSTER - BRUESTUNG_REGEL, HOEHEN.fenster.h)) {
      f.push("Die Regelhöhe muss aus Oberkante minus Brüstung folgen");
    }
    if (!nah(OK_FENSTER - BRUESTUNG_NASS, HOEHEN.fenster_nassraum.h)) {
      f.push("Die Nassraumhöhe muss aus Oberkante minus erhöhter Brüstung folgen");
    }
    Object.keys(HOEHEN).forEach(function (k) {
      const s = HOEHEN[k];
      if (!(s.min <= s.h && s.h <= s.max)) f.push(k + ": Wert liegt nicht in der Bandbreite");
      if (!s.quelle || s.quelle.length < 40) f.push(k + ": Herleitung fehlt");
      if (s.belegt) f.push(k + ": eine angenommene Höhe darf nicht als belegt gelten");
    });
    if (hoeheFuer("fenster", "bad").h !== HOEHEN.fenster_nassraum.h) {
      f.push("Im Bad gilt die erhöhte Brüstung");
    }
    if (hoeheFuer("fenster", "wohnen").h !== HOEHEN.fenster.h) {
      f.push("Im Wohnraum gilt die Regelbrüstung");
    }
    const eig = hoeheFuer("fenster", "wohnen", 1.62);
    if (eig.h !== 1.62 || eig.angenommen) f.push("Eine Eingabe hat Vorrang und ist keine Annahme");

    /* --- Bauart erkennen -------------------------------------------- */
    if (bauartFuer({ ist_fenstertuer: true }) !== "fenstertuer") f.push("Fenstertür nicht erkannt");
    if (bauartFuer({ typ: "dachflaechenfenster" }) !== "dachflaechenfenster") {
      f.push("Dachflächenfenster nicht erkannt");
    }
    if (bauartFuer({}) !== "fenster") f.push("Ohne Angabe ist es ein Fenster");

    /* --- Ein Fenster mit angeschriebener Breite ---------------------- */
    const f1 = fensterRechnen({ breite_m: 2.00, breite_quelle: "bemasst" },
                              { raumart: "wohnen" });
    if (!nah(f1.A_m2, 2.80)) f.push("2,00 m mal 1,40 m muss 2,80 m² ergeben, ist " + f1.A_m2);
    if (f1.breite_angenommen) f.push("Eine bemaßte Breite ist keine Annahme");
    if (!f1.hoehe_angenommen) f.push("Die Höhe ist immer eine Annahme");
    if (!(f1.A_min_m2 < f1.A_m2 && f1.A_m2 < f1.A_max_m2)) {
      f.push("Die Bandbreite muss den Wert einschließen");
    }
    if (!nah(f1.A_min_m2, 2.52) || !nah(f1.A_max_m2, 3.27, 0.01)) {
      f.push("Bandbreite bei bemaßter Breite falsch: " + f1.A_min_m2 + " bis " + f1.A_max_m2);
    }

    /* Gemessene Breite trägt zusätzlich die Maßstabstoleranz. */
    const f2 = fensterRechnen({ breite_m: 2.00, breite_quelle: "gemessen" },
                              { raumart: "wohnen" });
    if (!(f2.A_min_m2 < f1.A_min_m2 && f2.A_max_m2 > f1.A_max_m2)) {
      f.push("Eine gemessene Breite muss eine weitere Bandbreite haben als eine bemaßte");
    }
    if (!nah(f2.A_m2, f1.A_m2)) f.push("Der Mittelwert darf sich durch die Toleranz nicht verschieben");

    /* --- Fenstertür und Bad ------------------------------------------ */
    const f3 = fensterRechnen({ breite_m: 0.80, breite_quelle: "bemasst",
                                ist_fenstertuer: true }, { raumart: "kueche" });
    if (!nah(f3.A_m2, 1.68)) f.push("Fenstertür 0,80 mal 2,10 muss 1,68 m² ergeben, ist " + f3.A_m2);
    const f4 = fensterRechnen({ breite_m: 0.52, breite_quelle: "bemasst" },
                              { raumart: "bad" });
    if (!nah(f4.A_m2, 0.416)) f.push("Badfenster 0,52 mal 0,80 muss 0,416 m² ergeben, ist " + f4.A_m2);
    const f5 = fensterRechnen({ breite_m: 1.14, breite_quelle: "bemasst",
                                typ: "dachflaechenfenster" }, { raumart: "wohnen" });
    if (!nah(f5.A_m2, 1.345, 0.002)) f.push("Dachflächenfenster 1,14 mal 1,18 falsch: " + f5.A_m2);

    /* --- Ohne Breite: Rückfall über die Raumart ---------------------- */
    const rf = rueckfallFlaeche("wohnen", 18);
    if (!nah(rf.A_m2, 3.0)) f.push("Ein Sechstel von 18 m² sind 3,0 m², ist " + rf.A_m2);
    if (!nah(rf.A_min_m2, 2.25)) f.push("Das Mindestmaß ist ein Achtel, also 2,25 m²");
    if (rueckfallFlaeche("bad", 6).A_m2 >= rueckfallFlaeche("wohnen", 6).A_m2) {
      f.push("Ein Bad bekommt weniger Fensterfläche als ein Wohnraum");
    }
    if (rueckfallFlaeche("wohnen", 0) !== null) f.push("Ohne Grundfläche gibt es keinen Rückfall");

    const r1 = fensterFuerRaum({ name: "Wohnen", art: "wohnen", A: 18, h: 2.5,
                                 aussenwaende: 1, fenster: 1 });
    if (r1.anzahl !== 1) f.push("Ein gezähltes Fenster muss ein Fenster ergeben");
    if (!nah(r1.A_m2, 3.0, 0.01)) f.push("Ohne Breite muss der Rückfall greifen, ist " + r1.A_m2);
    if (!r1.fenster[0].breite_angenommen) f.push("Die zurückgerechnete Breite ist eine Annahme");
    if (!r1.annahmen.some(function (a) { return a.feld === "breite"; })) {
      f.push("Die angenommene Breite muss in den Annahmen stehen");
    }
    if (!r1.annahmen.every(function (a) { return a.herleitung && a.ueberschreibbar; })) {
      f.push("Jede Annahme braucht Herleitung und muss überschreibbar sein");
    }
    if (r1.guete !== "vollständig angenommen") f.push("Güte ohne jede Breite falsch: " + r1.guete);

    /* Ohne alles bleibt die Regelbreite, aber es kommt ein Ergebnis heraus. */
    const r2 = fensterFuerRaum({ name: "X", fenster: 1 });
    if (!(r2.A_m2 > 0)) f.push("Es muss immer ein Ergebnis herauskommen");
    if (!nah(r2.A_m2, 1.764, 0.01)) f.push("Regelfenster 1,26 mal 1,40 falsch: " + r2.A_m2);

    /* --- Zahl und Liste in Einklang ---------------------------------- */
    const r3 = fensterFuerRaum({ name: "Y", art: "wohnen", A: 20, h: 2.5, fenster: 3,
      fensterliste: [{ breite_m: 1.5, breite_quelle: "bemasst" }] });
    if (r3.anzahl !== 3) f.push("Fehlende Einzelangaben müssen ergänzt werden");
    if (!r3.hinweise.length) f.push("Die Ergänzung muss vermerkt werden");
    if (r3.guete !== "Breiten teilweise aus dem Plan") f.push("Güte gemischt falsch: " + r3.guete);
    const r4 = fensterFuerRaum({ name: "Z", art: "wohnen", A: 20, h: 2.5, fenster: 1,
      fensterliste: [{ breite_m: 1.5, breite_quelle: "bemasst" },
                     { breite_m: 1.0, breite_quelle: "bemasst" }] });
    if (r4.anzahl !== 2) f.push("Die Einzelaufstellung ist maßgebend");
    if (fensterFuerRaum({ name: "Q", fenster: 0 }).A_m2 !== 0) {
      f.push("Ein Raum ohne Fenster hat keine Fensterfläche");
    }

    /* --- Plausibilitätsgrenzen --------------------------------------- */
    /* Fensterfront: 4,0 m Wand mal 2,5 m = 10 m², Fenster 3,6 mal 1,4 = 5,04 m²,
       das sind 50 Prozent und damit erklärungsbedürftig. */
    const p1 = fensterFuerRaum({ name: "Front", art: "wohnen", A: 20, h: 2.5,
      wandlaenge: 4.0, fenster: 1,
      fensterliste: [{ breite_m: 3.6, breite_quelle: "bemasst" }] });
    if (!p1.befunde.some(function (x) { return x.id === "wandanteil" && x.stufe === "hinweis"; })) {
      f.push("50 Prozent Wandanteil muss ein Hinweis sein");
    }
    if (!p1.belastbar) f.push("Ein Hinweis ist keine Sperre");
    /* Unmöglich: 5,2 m Fenster auf 4,0 m Wand ergibt 73 Prozent. */
    const p2 = fensterFuerRaum({ name: "Falsch", art: "wohnen", A: 20, h: 2.5,
      wandlaenge: 4.0, fenster: 1,
      fensterliste: [{ breite_m: 5.2, breite_quelle: "gemessen" }] });
    if (!p2.befunde.some(function (x) { return x.id === "wandanteil" && x.stufe === "sperre"; })) {
      f.push("Über 60 Prozent Wandanteil muss sperren");
    }
    if (p2.belastbar) f.push("Eine Sperre muss die Belastbarkeit nehmen");
    /* Regelfall bleibt still. */
    const p3 = fensterFuerRaum({ name: "Normal", art: "wohnen", A: 15.12, h: 2.75,
      wandlaenge: 4.20, fenster: 1,
      fensterliste: [{ breite_m: 2.0, breite_quelle: "bemasst" }] });
    if (!p3.befunde.some(function (x) { return x.id === "wandanteil" && x.stufe === "gut"; })) {
      f.push("Ein üblicher Anteil muss als gut durchgehen");
    }
    if (p3.befunde.some(function (x) { return x.stufe !== "gut"; })) {
      f.push("Der Regelfall darf keinen weiteren Befund erzeugen");
    }
    /* Zu wenig Fenster in einem Aufenthaltsraum. */
    const p4 = fensterFuerRaum({ name: "Dunkel", art: "wohnen", A: 30, h: 2.5,
      wandlaenge: 6.0, fenster: 1,
      fensterliste: [{ breite_m: 0.6, breite_quelle: "bemasst" }] });
    if (!p4.befunde.some(function (x) { return x.id === "mindestfenster"; })) {
      f.push("Unter dem Achtel der Grundfläche muss ein Befund stehen");
    }
    /* Im Bad gilt das Achtel nicht. */
    const p5 = fensterFuerRaum({ name: "Bad", art: "bad", A: 4.5, h: 2.75,
      wandlaenge: 1.8, fenster: 1,
      fensterliste: [{ breite_m: 0.52, breite_quelle: "bemasst" }] });
    if (p5.befunde.some(function (x) { return x.id === "mindestfenster"; })) {
      f.push("Das bauordnungsrechtliche Mindestmaß gilt nur für Aufenthaltsräume");
    }

    /* --- Gegenprobe am Referenzprojekt Mälzerstraße 59 ---------------
     * Aus heizlast_maelzerstr59/stammdaten.py, Liste FENSTER. Bekannt sind hier
     * NUR die Breiten und die Raumart; die Höhen kommen aus diesem Modul.
     * Sollwert der Berichtsgesamtfläche: 34,2 m² (drei Geschosse). */
    const je_geschoss = [
      { name: "Wohnzimmer", art: "wohnen", A: 15.12, h: 2.75, wandlaenge: 7.80,
        fenster: 1, fensterliste: [{ breite_m: 2.00, breite_quelle: "bemasst" }] },
      { name: "Schlafzimmer", art: "wohnen", A: 17.33, h: 2.75, wandlaenge: 3.85,
        fenster: 1, fensterliste: [{ breite_m: 2.00, breite_quelle: "bemasst" }] },
      { name: "Kueche", art: "kueche", A: 15.40, h: 2.75, wandlaenge: 3.85,
        fenster: 2, fensterliste: [{ breite_m: 1.60, breite_quelle: "bemasst" },
                                   { breite_m: 0.80, breite_quelle: "bemasst",
                                     ist_fenstertuer: true }] },
      { name: "Bad", art: "bad", A: 4.50, h: 2.75, wandlaenge: 1.80,
        fenster: 1, fensterliste: [{ breite_m: 0.52, breite_quelle: "bemasst" }] },
      { name: "Diele", art: "flur", A: 4.14, h: 2.75, fenster: 0, fensterliste: [] },
      { name: "Treppenhaus", art: "treppenhaus", A: 12.19, h: 2.75, wandlaenge: 7.60,
        fenster: 1, fensterliste: [{ breite_m: 1.00, breite_quelle: "bemasst" }] },
    ];
    const drei = je_geschoss.concat(je_geschoss, je_geschoss).map(function (r, i) {
      return Object.assign({}, r, { id: r.name + "_" + i });
    });
    const ref = fensterFuerProjekt(drei);
    const SOLL = 34.248;   // Summe aus stammdaten.py, Bericht: 34,2 m²
    if (!(Math.abs(ref.A_m2 - SOLL) / SOLL <= 0.03)) {
      f.push("Gegenprobe Mälzerstraße: " + ref.A_m2 + " m² statt " + SOLL
        + " m², Abweichung " + rnd((ref.A_m2 - SOLL) / SOLL * 100, 1) + " Prozent");
    }
    if (!(ref.A_min_m2 <= SOLL && SOLL <= ref.A_max_m2)) {
      f.push("Die Bandbreite muss den Sollwert einschließen: " + ref.A_min_m2
        + " bis " + ref.A_max_m2);
    }
    if (!ref.belastbar) f.push("Das Referenzprojekt darf keine Sperre auslösen");
    if (ref.sperren.length) f.push("Am Referenzprojekt entsteht eine Sperre");

    /* Und derselbe Fall ohne jede Breite: das Verfahren muss weiter liefern,
       darf aber deutlich danebenliegen. Genau dafür ist die Bandbreite da. */
    const blind = fensterFuerProjekt(drei.map(function (r) {
      return Object.assign({}, r, { fensterliste: [] });
    }));
    if (!(blind.A_m2 > 0)) f.push("Auch ohne Breiten muss ein Ergebnis herauskommen");
    if (!(blind.A_max_m2 >= SOLL * 0.8)) {
      f.push("Die Bandbreite ohne Breiten ist zu eng: bis " + blind.A_max_m2);
    }

    /* Die Haustuer: Flaeche, Herheit und die Fundstelle. Ohne diese Probe
       koennte die Zahl still auf null fallen und niemand saehe es. */
    const ht = haustuer();
    if (!(ht.A_m2 > 2.0 && ht.A_m2 < 2.3)) {
      f.push("Die angenommene Haustuerflaeche muss zwischen 2,0 und 2,3 m2 liegen, ist "
        + ht.A_m2);
    }
    if (Math.abs(ht.A_m2 - rnd(ht.breite_m * ht.hoehe_m, 2)) > 0.001) {
      f.push("Die Haustuerflaeche muss das Produkt aus Breite und Hoehe sein");
    }
    if (!ht.angenommen || !/DIN 18100/.test(ht.quelle)) {
      f.push("Die Haustuer muss als Annahme mit Fundstelle dastehen");
    }
    /* --- Die Probe über das ganze Gebäude ---------------------------- *
     * Der Fall ist dem Blatt „BV 2-0887 Ziolkowski" nachgebaut: sechs
     * Wohnräume von je 18 m² an je zwei Außenwänden, 2,50 m hoch, keine
     * einzige Breite ablesbar. Einmal mit allen sechs Fenstern, einmal mit
     * dreien — das ist der Fehler, den die alte Probe nicht sah. */
    const wr = (name, fenster) => ({ id: name, name: name, art: "wohnen",
      A: 18, h: 2.5, aussenwaende: 2, fenster: fenster,
      fensterliste: Array.from({ length: fenster }, () => ({ wand: "oben",
        breite_m: null, breite_quelle: "unbekannt", ist_fenstertuer: false })) });
    const sechs = ["R1", "R2", "R3", "R4", "R5", "R6"];
    const voll = sechs.map((n) => wr(n, 1));
    const halb = sechs.map((n, i) => wr(n, i < 3 ? 1 : 0));

    /* Die Raumprobe findet hier nichts und darf das auch nicht mehr
       beschoenigen: keine Breite gelesen heisst kein „gut". Frueher standen
       hier drei gruene Zeilen, waehrend die Haelfte der Fenster fehlte. */
    const alt = fensterFuerProjekt(halb, {});
    if (alt.befunde.some((x) => x.id === "wandanteil" && x.stufe === "gut")) {
      f.push("Ohne eine einzige gelesene Breite darf der Wandanteil kein "
        + "„gut\" melden — die Fensterflaeche stammt dann aus derselben "
        + "Grundflaeche wie die Wandflaeche.");
    }
    /* Mit gelesener Breite bleibt das „gut" — dort ist es eine Aussage. */
    const gelesenerRaum = fensterFuerRaum({ name: "G", art: "wohnen", A: 15.12,
      h: 2.75, wandlaenge: 4.20, fenster: 1,
      fensterliste: [{ breite_m: 2.0, breite_quelle: "bemasst" }] });
    if (!gelesenerRaum.befunde.some((x) => x.id === "wandanteil" && x.stufe === "gut")) {
      f.push("Mit gelesener Breite muss der uebliche Anteil weiter „gut\" sein");
    }
    /* Und die Uebertretung bleibt auch ohne gelesene Breite eine Uebertretung:
       0,5 m Wand mal 2,5 m gegen ein Sechstel von 18 m² sind ueber 60 Prozent. */
    const krumm = fensterFuerRaum({ name: "Krumm", art: "wohnen", A: 18, h: 2.5,
      wandlaenge: 0.5, fenster: 1,
      fensterliste: [{ breite_m: null, breite_quelle: "unbekannt" }] });
    if (!krumm.befunde.some((x) => x.id === "wandanteil" && x.stufe === "sperre")) {
      f.push("Eine unmoegliche Geometrie muss auch ohne gelesene Breite sperren");
    }

    const hVoll = huellenprobe(voll, {});
    const hHalb = huellenprobe(halb, {});
    const mind = (h) => h.befunde.find((x) => x.id === "mindestfenster_gebaeude");
    if (!mind(hVoll) || mind(hVoll).stufe !== "gut") {
      f.push("Mit allen Fenstern muss das Mindestmaß eingehalten sein, ist: "
        + (mind(hVoll) && mind(hVoll).stufe));
    }
    if (!mind(hHalb) || mind(hHalb).stufe !== "warnung") {
      f.push("Fehlt die Haelfte der Fenster, muss das Mindestmass anschlagen, ist: "
        + (mind(hHalb) && mind(hHalb).stufe));
    }
    if (hHalb.raeume_ohne_fenster.length !== 3) {
      f.push("Die Raeume ohne Fenster muessen benannt werden, benannt sind: "
        + hHalb.raeume_ohne_fenster.length);
    }
    if (!/R4/.test(String(mind(hHalb) && mind(hHalb).text))) {
      f.push("Der Befund muss die Raeume ohne Fenster im Text nennen");
    }
    /* Die Grenze rechnet sich nach: 6 x 18 m² x 1/8 = 13,5 m² gefordert,
       drei Raeume liefern 3 x 18/6 = 9,0 m². */
    if (Math.abs(hHalb.A_fenster_aufenthalt_m2 - 9.0) > 0.02
        || Math.abs(hHalb.A_ngf_aufenthalt_m2 - 108) > 0.02) {
      f.push("Die Summen der Probe stimmen nicht: "
        + hHalb.A_fenster_aufenthalt_m2 + " m² auf "
        + hHalb.A_ngf_aufenthalt_m2 + " m²");
    }
    /* Die Fassade muss aus der uebergebenen Wandlaenge kommen und nicht aus
       der Wurzel der Grundflaeche; sonst prueft die Zeile wieder sich selbst.
       6 Raeume x 7 m x 2,50 m = 105 m². */
    const mitLaenge = huellenprobe(voll, { wandlaenge_je_raum:
      { R1: 7, R2: 7, R3: 7, R4: 7, R5: 7, R6: 7 } });
    if (Math.abs(mitLaenge.A_fassade_m2 - 105) > 0.02) {
      f.push("Die Fassadenflaeche muss aus dem Umfangsabgleich kommen, ist: "
        + mitLaenge.A_fassade_m2);
    }
    if (Math.abs(huellenprobe(voll, {}).A_fassade_m2
        - 6 * 2 * Math.sqrt(18) * 2.5) > 0.05) {
      f.push("Ohne Wandlaenge muss der Rueckfall auf n x sqrt(A) x h greifen");
    }
    /* Woraus die Flaeche stammt: hier vollstaendig aus dem Rueckfall. */
    const herk = (h) => h.befunde.find((x) => x.id === "breiten_ungelesen");
    if (!herk(hVoll) || herk(hVoll).stufe !== "hinweis") {
      f.push("Eine vollstaendig angenommene Fensterflaeche muss als solche "
        + "gemeldet werden, gemeldet: " + (herk(hVoll) && herk(hVoll).stufe));
    }
    const gemessen = sechs.map((n) => {
      const r = wr(n, 1);
      r.fensterliste = [{ wand: "oben", breite_m: 1.51,
        breite_quelle: "bemasst", ist_fenstertuer: false }];
      return r;
    });
    if (!herk(huellenprobe(gemessen, {}))
        || herk(huellenprobe(gemessen, {})).stufe !== "gut") {
      f.push("Gelesene Breiten duerfen keinen Hinweis auf Annahmen erzeugen");
    }
    /* --- Die Ansicht als zweite Quelle fuer die Groesse ---------------- *
     * Dem Blatt „BV 2-0887 Ziolkowski" nachgerechnet: eine 8,00 m breite
     * Fassade, darauf ein Hebe-Schiebe-Element von 3,30 m mal 2,10 m. Als
     * Anteil an der Fassadenbreite sind das 0,4125 und 0,2625; zurueck-
     * gerechnet 3,30 mal 2,10 = 6,93 m². Das Raumbuch fuehrt dieselbe
     * Oeffnung mangels gelesener Breite mit 18/6 = 3,00 m². */
    const eineFassade = [{ fassade: "West", fenster: 1, breite_bezug_m: null,
      oeffnungen: [{ breite_anteil: 3.30 / 8, hoehe_anteil: 2.10 / 8,
                     geschoss: "ERDGESCHOSS", ist_tuer: true }] }];
    const einRaum = [{ id: "E", name: "ESSEN", art: "wohnen", A: 18, h: 2.5,
      aussenwaende: 2, fenster: 1,
      fensterliste: [{ wand: "links", breite_m: null,
                       breite_quelle: "unbekannt", ist_fenstertuer: true }] }];
    const mitAnsicht = huellenprobe(einRaum,
      { ansichten: eineFassade, fassadenbreite_m: 8.0 });
    const av = mitAnsicht.befunde.find((x) => x.id === "ansichtsflaeche");
    if (!av || av.stufe !== "warnung") {
      f.push("Eine Ansicht, die die doppelte Oeffnungsflaeche zeigt, muss "
        + "anschlagen, meldet: " + (av && av.stufe));
    }
    if (!av || !(av.wert > 2.0 && av.wert < 2.5)) {
      f.push("Das Verhaeltnis Ansicht zu Raumbuch muss bei rund 2,3 liegen, "
        + "ist: " + (av && av.wert));
    }
    /* Ohne Bezugsmass keine Flaeche und kein Befund -- nichts wird geraten. */
    if (huellenprobe(einRaum, { ansichten: eineFassade })
        .befunde.some((x) => x.id === "ansichtsflaeche")) {
      f.push("Ohne Fassadenbreite darf aus der Ansicht keine Flaeche entstehen");
    }
    /* Und wenn beide Lesungen zusammenpassen, bleibt es gruen: dieselbe
       Oeffnung mit 1,26 m mal 1,40 m = 1,76 m² auf beiden Seiten. */
    const passt = huellenprobe(
      [{ id: "P", name: "P", art: "wohnen", A: 18, h: 2.5, aussenwaende: 2,
         fenster: 1, fensterliste: [{ wand: "links", breite_m: 1.26,
           breite_quelle: "bemasst", ist_fenstertuer: false }] }],
      { fassadenbreite_m: 8.0,
        ansichten: [{ fassade: "West", fenster: 1, breite_bezug_m: null,
          oeffnungen: [{ breite_anteil: 1.26 / 8, hoehe_anteil: 1.40 / 8,
                         geschoss: "ERDGESCHOSS", ist_tuer: false }] }] });
    const pv = passt.befunde.find((x) => x.id === "ansichtsflaeche");
    if (!pv || pv.stufe !== "gut") {
      f.push("Zwei uebereinstimmende Lesungen duerfen keinen Befund erzeugen, "
        + "melden: " + (pv && pv.stufe));
    }

    /* Und die Gegenprobe zur Zirkularitaet: die Raumprobe laesst das halbe
       Haus ohne einen einzigen Befund durch, die Huellenprobe schlaegt an. */
    if (!(alt.befunde.length === 0 && mind(hHalb).stufe === "warnung")) {
      f.push("Die Huellenprobe muss finden, was die Raumprobe durchlaesst: "
        + alt.befunde.length + " Raumbefunde, Huelle " + mind(hHalb).stufe);
    }

    /* --- Geprueft wird, was gerechnet wird ---------------------------- */
    /* Ohne die gerechneten Bauteile bildet die Probe ihre Fassade selbst
       (Wandlaenge mal Hoehe); mit ihnen gilt, was in der Bilanz steht. */
    const rG = [{ id: "G", name: "G", art: "wohnen", A: 20, h: 2.5,
                  aussenwaende: 2, fenster: 1 }];
    const ohneB = huellenprobe(rG, { wandlaenge_je_raum: { G: 10 } });
    const mitB = huellenprobe(rG, { wandlaenge_je_raum: { G: 10 },
      gerechnet_je_raum: { G: { A_fenster: 4.0, A_fassade: 40.0 } } });
    if (Math.abs(zahl(ohneB.A_fassade_m2, 0) - 25) > 0.01) {
      f.push("Ohne gerechnete Bauteile bleibt es bei Laenge mal Hoehe, ist: "
        + ohneB.A_fassade_m2);
    }
    if (Math.abs(zahl(mitB.A_fassade_m2, 0) - 40) > 0.01
        || Math.abs(zahl(mitB.A_fenster_m2, 0) - 4) > 0.01) {
      f.push("Mit gerechneten Bauteilen muessen genau deren Flaechen gelten, "
        + "sind: " + mitB.A_fenster_m2 + " / " + mitB.A_fassade_m2);
    }
    /* Ein Raum ohne ableitbare Fenster faellt nicht mehr aus der Probe,
       sobald seine Bauteile vorliegen (Blatt „Hasenberg 10"). */
    const ohneListe = huellenprobe([{ id: "H", name: "H", A: 0, h: 2.5 }],
      { gerechnet_je_raum: { H: { A_fenster: 2.0, A_fassade: 20.0 } } });
    if (Math.abs(zahl(ohneListe.A_fassade_m2, 0) - 20) > 0.01) {
      f.push("Ein Raum mit gerechneten Bauteilen zaehlt mit, auch ohne "
        + "Fensterableitung, ist: " + ohneListe.A_fassade_m2);
    }

    return { ok: f.length === 0, fehler: f, anzahl: 72 };
  }

  return {
    HOEHEN: HOEHEN, ANTEILE: ANTEILE, GRENZEN: GRENZEN,
    ROHBAU_HOEHEN: ROHBAU_HOEHEN, ROHBAU_BREITEN: ROHBAU_BREITEN,
    NASSRAEUME: NASSRAEUME, AUFENTHALTSRAEUME: AUFENTHALTSRAEUME,
    bauartFuer: bauartFuer, hoeheFuer: hoeheFuer,
    fensterRechnen: fensterRechnen, rueckfallFlaeche: rueckfallFlaeche,
    HAUSTUER: HAUSTUER, haustuer: haustuer,
    wandflaeche: wandflaeche, plausibilitaet: plausibilitaet,
    fensterFuerRaum: fensterFuerRaum, fensterFuerProjekt: fensterFuerProjekt,
    huellenprobe: huellenprobe,
    selbsttest: selbsttest,
  };
});
