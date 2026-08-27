/* ===========================================================================
 * kern_lage.js — wo ein Raum auf dem Blatt liegt
 * ===========================================================================
 * Das Werkzeug kennt seine Räume, aber es weiß bei den meisten nicht, WO sie
 * auf dem Blatt stehen. Ohne Ortsangabe lässt sich nichts überlagern, und
 * ohne Überlagerung bleibt das Prüfen eine Liste, die man gegen einen Plan
 * hält, den man daneben aufschlagen muss.
 *
 * WOHER DIE LAGE KOMMT
 *
 *   1. AUS DEM FLÄCHENSTEMPEL SELBST — ohne jede Zuordnung.
 *      Räume, die aus den angeschriebenen Flächen übernommen werden, stammen
 *      Zeile für Zeile aus einem Textblock, und dieser Block hat Koordinaten.
 *      Der Raum bekommt die Lage seines eigenen Blocks mitgegeben. Da wird
 *      nichts gesucht und nichts verglichen; es kann deshalb auch nichts
 *      verwechselt werden. Diesen Weg geht app.js unmittelbar.
 *
 *   2. ÜBER DEN NAMEN — für Räume, die nur die Auslese kennt.
 *      Das Modell liest aus einem BILD und liefert keine Koordinaten. Steht
 *      der gelesene Name aber im Textstand des Dokuments, ist die Lage jenes
 *      Textstücks die Lage des Raumes. Dafür ist dieser Kern da, und dafür
 *      sind seine Schranken da (siehe unten).
 *
 *   3. GAR NICHT — bei einem reinen Scan.
 *      Kein Textstand, keine Koordinaten, keine Marke. Ein Raum ohne Ort wird
 *      NICHT weggelassen, sondern gezählt und benannt. Eine Überlagerung
 *      zeigt immer nur das Gefundene; was sie nicht zeigen kann, muss sie
 *      sagen, sonst ist sie die nächste stille Lücke.
 *
 * WAS DIE MARKE IST UND WAS NICHT
 *
 * Sie ist der Ort, an dem die BESCHRIFTUNG steht, zeichengenau aus dem
 * Dokument. Sie ist NICHT der Umriss des Raumes. Sie sagt „hier steht das
 * Wort Bad", nicht „so weit reicht das Bad".
 *
 * Ein Umriss wäre mehr wert, und der Versuch stand hier auch schon: den
 * kleinsten geschlossenen Linienzug suchen, in dem die Beschriftung liegt,
 * und ihn über die Flächenprobe belegen. GEMESSEN am 23.08.2026 an zwei
 * echten Vektorzeichnungen („14_BA 04_OG", 225 geschlossene Züge, und
 * „1.04 BA_2 Grundriss DG", 1637): kein einziger Raum lag in einem
 * geschlossenen Zug. Architektursoftware zeichnet WÄNDE; der Raum ist der
 * leere Platz dazwischen und hat keine eigene Kontur. Die geschlossenen Züge
 * dieser Blätter sind Türblätter, Sanitärobjekte und Schraffurteile, alle
 * unter 8 m². Der Weg wurde deshalb wieder ausgebaut, statt als Möglichkeit
 * stehenzubleiben, die nie eintritt.
 *
 * WAS HIER NICHT PASSIERT: geraten. Ein Raumname, der auf dem Blatt zweimal
 * steht („Flur"), bekommt nur dann eine Lage, wenn sich die beiden über ihre
 * angeschriebene Fläche eindeutig auseinanderhalten lassen. Sonst keine. Eine
 * falsch gesetzte Marke ist schlimmer als eine fehlende: sie führt den
 * Bearbeiter beim Prüfen an die falsche Stelle des Plans, und er hakt dort
 * einen Raum ab, den er gar nicht angesehen hat.
 *
 * KOORDINATEN: Anteile der Blattkante, x und y je 0 bis 1, Ursprung links
 * oben — so, wie das gerenderte Blatt erscheint. Die Umrechnung aus
 * PDF-Punkten macht MODUL_PDF (seite.lageAnteil), denn nur dort ist die
 * Drehung des Blattes bekannt. Anteile gelten für jede Auflösung und lassen
 * sich mit dem Projekt speichern; Bildpunkte gelten nur für die Auflösung,
 * bei der sie entstanden sind.
 * =========================================================================== */
"use strict";

(function (global) {

  /** Namen vergleichbar machen. Gross- und Kleinschreibung, Leerzeichen und
   *  Satzzeichen unterscheiden Raumnamen nicht („Gäste-WC" / „Gäste WC").
   *  Umlaute bleiben stehen: „Buro" und „Büro" sind zwei Woerter. */
  function nn(t) {
    return String(t === null || t === undefined ? "" : t)
      .toLowerCase().replace(/[\s\/,.;:()-]+/g, "");
  }

  /** Eine Lage ist nur brauchbar, wenn sie auf dem Blatt liegt. */
  function gueltig(m) {
    return !!m && Number.isFinite(m.x) && Number.isFinite(m.y)
      && m.x >= 0 && m.x <= 1 && m.y >= 0 && m.y <= 1;
  }

  /**
   * Zu jedem Raum die Beschriftung auf dem Blatt suchen.
   *
   * @param raeume  [{ id, name, A }]           Räume dieses Blattes
   * @param marken  [{ name, A_m2, x, y }]      Beschriftungen mit Lage in Anteilen
   * @return Objekt raum_id -> Marke
   */
  function markenZuordnen(raeume, marken) {
    const zu = {};
    const nachName = {};
    (marken || []).forEach(function (m) {
      if (!gueltig(m)) return;
      const k = nn(m.name);
      if (!k) return;
      (nachName[k] = nachName[k] || []).push(m);
    });
    /* Eine Marke gehört zu höchstens einem Raum. Sonst bekämen zwei
       gleichnamige Räume dieselbe Stelle; der Bearbeiter klickt zweimal auf
       denselben Punkt und hakt beide ab, ohne dass es auffällt. */
    const vergeben = [];
    (raeume || []).forEach(function (r) {
      if (!r || !r.id) return;
      const kandidaten = (nachName[nn(r.name)] || [])
        .filter(function (m) { return vergeben.indexOf(m) < 0; });
      if (!kandidaten.length) return;
      let treffer = null;
      if (kandidaten.length === 1) {
        treffer = kandidaten[0];
      } else if (Number(r.A) > 0) {
        /* Mehrere gleichnamige Beschriftungen: nur die angeschriebene Fläche
           kann sie auseinanderhalten. Sie muss auf ein Hundertstel passen und
           darf nur einmal passen. */
        const passend = kandidaten.filter(function (m) {
          return Number(m.A_m2) > 0
            && Math.abs(Number(m.A_m2) - Number(r.A)) <= 0.01 * Number(r.A);
        });
        if (passend.length === 1) treffer = passend[0];
      }
      if (!treffer) return;
      vergeben.push(treffer);
      zu[r.id] = treffer;
    });
    return zu;
  }

  /**
   * Die Lagen aller Räume eines Blattes, in der Form, die ins Projekt
   * geschrieben wird.
   *
   * @param o.raeume  [{ id, name, A }]
   * @param o.marken  [{ name, A_m2, x, y }]
   * @param o.blatt   Bezeichnung des Blattes
   * @return [{ raum_id, lage: { x, y, blatt, quelle, art } }]
   */
  function lagen(o) {
    const opt = o || {};
    const zu = markenZuordnen(opt.raeume, opt.marken);
    const raus = [];
    (opt.raeume || []).forEach(function (r) {
      const m = zu[r.id];
      if (!m) return;
      raus.push({
        raum_id: r.id,
        lage: {
          x: m.x, y: m.y, art: "beschriftung",
          blatt: opt.blatt || null,
          quelle: m.quelle
            || "Ort der Beschriftung „" + String(m.name) + "“ im Textstand "
               + "der Zeichnung",
        },
      });
    });
    return raus;
  }

  /**
   * Wie viele Räume einer Liste einen Ort auf dem Blatt haben.
   * Steht hier und nicht in der Oberfläche, damit die Kopfzeile des
   * Prüfblatts und jede Prüfung dieselbe Zahl rechnen.
   */
  function ortsstand(raeume) {
    const alle = (raeume || []);
    const mit = alle.filter(function (r) { return gueltig(r && r.lage); });
    return { gesamt: alle.length, mit_ort: mit.length,
             ohne_ort: alle.length - mit.length };
  }

  /* =====================================================================
   * Selbsttest
   * ================================================================== */
  function selbsttest() {
    const f = [];
    let n = 0;
    const pruef = function (b, t) { n++; if (!b) f.push(t); };

    /* --- Zuordnung über den Namen ----------------------------------- */
    {
      const raeume = [{ id: "a", name: "Gäste-WC", A: 3.56 },
                      { id: "b", name: "Gaeste WC", A: 3.56 }];
      const marken = [{ name: "Gäste WC", A_m2: 3.56, x: 0.4, y: 0.2 }];
      const z = markenZuordnen(raeume, marken);
      pruef(z.a && z.a.x === 0.4, "Satzzeichen unterscheiden Raumnamen nicht");
      pruef(!z.b, "Ein Umlaut dagegen schon: Gaeste ist nicht Gäste");
    }
    {
      const raeume = [{ id: "a", name: "Flur", A: 0 }];
      const marken = [{ name: "Flur", A_m2: 3.2, x: 0.2, y: 0.2 },
                      { name: "Flur", A_m2: 5.1, x: 0.6, y: 0.6 }];
      pruef(!markenZuordnen(raeume, marken).a,
        "Zwei gleichnamige Marken ohne Flaeche: keine Lage, keine geratene");
    }
    {
      const raeume = [{ id: "a", name: "Flur", A: 5.1 }];
      const marken = [{ name: "Flur", A_m2: 3.2, x: 0.2, y: 0.2 },
                      { name: "Flur", A_m2: 5.1, x: 0.6, y: 0.6 }];
      const z = markenZuordnen(raeume, marken);
      pruef(z.a && z.a.x === 0.6,
        "Die angeschriebene Flaeche haelt gleichnamige Raeume auseinander");
    }
    {
      const raeume = [{ id: "a", name: "Flur", A: 5.0 }];
      const marken = [{ name: "Flur", A_m2: 5.0, x: 0.2, y: 0.2 },
                      { name: "Flur", A_m2: 5.0, x: 0.6, y: 0.6 }];
      pruef(!markenZuordnen(raeume, marken).a,
        "Passt die Flaeche zweimal, bleibt es bei keiner Lage");
    }
    {
      const raeume = [{ id: "a", name: "Flur", A: 0 }, { id: "b", name: "Flur", A: 0 }];
      const marken = [{ name: "Flur", A_m2: 3.2, x: 0.2, y: 0.2 }];
      const z = markenZuordnen(raeume, marken);
      pruef(!!z.a && !z.b, "Eine Marke gehoert zu hoechstens einem Raum");
    }
    {
      const z = markenZuordnen([{ id: "a", name: "Bad", A: 5 }],
                               [{ name: "Bad", A_m2: 5, x: 1.4, y: 0.2 }]);
      pruef(!z.a, "Eine Lage ausserhalb des Blattes wird verworfen");
      const z2 = markenZuordnen([{ id: "a", name: "Bad", A: 5 }],
                                [{ name: "Bad", A_m2: 5, x: null, y: 0.2 }]);
      pruef(!z2.a, "Eine Lage ohne Zahl wird verworfen");
    }
    {
      pruef(!markenZuordnen([{ id: "a", name: "", A: 5 }],
                            [{ name: "", A_m2: 5, x: 0.2, y: 0.2 }]).a,
        "Ein leerer Name trifft nichts");
    }

    /* --- Der ganze Weg ----------------------------------------------- */
    {
      const erg = lagen({
        raeume: [{ id: "a", name: "Bad", A: 20.0 }, { id: "b", name: "Ankleide", A: 4.0 }],
        marken: [{ name: "Bad", A_m2: 20.0, x: 0.3, y: 0.3 }],
        blatt: "Grundriss OG",
      });
      pruef(erg.length === 1, "Nur der gefundene Raum bekommt eine Lage");
      pruef(erg[0].raum_id === "a" && erg[0].lage.x === 0.3, "und zwar die richtige");
      pruef(erg[0].lage.blatt === "Grundriss OG", "Das Blatt steht in der Lage");
      pruef(/Beschriftung/.test(erg[0].lage.quelle) && /Bad/.test(erg[0].lage.quelle),
        "Die Herkunft nennt die Beschriftung, aus der sie stammt");
      pruef(erg[0].lage.art === "beschriftung",
        "Die Art sagt, dass es ein Beschriftungsort und kein Umriss ist");
    }
    {
      pruef(lagen({ raeume: [{ id: "a", name: "Bad", A: 20 }] }).length === 0,
        "Ohne Marken gibt es keine Lage");
      pruef(lagen({}).length === 0, "Ohne Raeume gibt es keine Lage");
    }

    /* --- Ortsstand: die Zahl der Kopfzeile --------------------------- */
    {
      const st = ortsstand([
        { id: "a", lage: { x: 0.2, y: 0.2 } },
        { id: "b" },
        { id: "c", lage: { x: 2, y: 0.2 } },
      ]);
      pruef(st.gesamt === 3, "Ortsstand zaehlt alle Raeume");
      pruef(st.mit_ort === 1, "und nur die mit gueltigem Ort");
      pruef(st.ohne_ort === 2, "Eine unmoegliche Lage zaehlt als ohne Ort");
      pruef(ortsstand([]).gesamt === 0, "Leere Liste ergibt null");
    }

    return { ok: f.length === 0, fehler: f, anzahl: n };
  }

  const AUSGANG = {
    lagen: lagen,
    markenZuordnen: markenZuordnen,
    ortsstand: ortsstand,
    gueltig: gueltig,
    nameNormieren: nn,
    selbsttest: selbsttest,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = AUSGANG;
  if (global) global.KERN_LAGE = AUSGANG;
})(typeof window !== "undefined" ? window : null);
