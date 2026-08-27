/* ===========================================================================
 * modul_bewertung.js — bewertende Berichtstexte erzeugen und pruefen
 * ===========================================================================
 * Der Bericht rechnet von allein. Was er ohne Hilfe nicht kann, ist sagen,
 * was die Zahlen fuer dieses eine Gebaeude bedeuten. Genau dafuer gibt es
 * fuenf Stellen in SPEZIFIKATION_BERICHT.md, die dort [MODELL] heissen:
 *
 *   kap1_punkte        Die drei Punkte, auf die es ankommt   (Kapitel 1)
 *   kap2_einleitung    Beschreibung des Objekts              (Kapitel 2.1)
 *   kap2_geometrie     Warum die Geometrie belastbar ist     (Kapitel 2.3)
 *   kap2_nicht_belegt  Was nicht aus Unterlagen stammt       (Kapitel 2.4)
 *   kap6_bewertung     Einordnung der Zonentemperaturen      (Kapitel 6)
 *   offene_punkte[]    Spalte "Warum er zaehlt"              (Kapitel 8)
 *
 * Der Weg: daten() baut aus p und e ein Zahlenpaket, in dem JEDE Zahl schon
 * so formatiert ist, wie sie im Bericht steht. Das Paket geht an den
 * Ausleseendpunkt in der Betriebsart "bewertung" (kein Bild, nur Zahlen).
 * Was zurueckkommt, laeuft durch pruefeZahlen(): jede Zahl im erzeugten Text
 * muss im uebergebenen Paket vorkommen.
 *
 * WARUM DIESE PRUEFUNG DIE HALBE MIETE IST
 * Ein Bericht ohne Bewertung ist ein Rechenprotokoll. Ein Bericht mit einer
 * erfundenen Zahl ist ein Haftungsfall: er wird unterschrieben, er geht an
 * eine pruefende Stelle, und die falsche Zahl faellt niemandem mehr auf,
 * weil sie in einem Fliesstext steht und nicht in einer Tabelle. Deshalb
 * wird ein Text mit einer unbekannten Zahl NICHT uebernommen, sondern
 * vorgelegt. Der Mensch entscheidet, nicht das Werkzeug.
 *
 * REGEL: JSON-Schluessel in ASCII (siehe plan-auslesen.mjs). Werte duerfen
 * und sollen echte Umlaute und Einheitenzeichen tragen, sie werden gedruckt.
 * =========================================================================== */
"use strict";

(function () {
  /* Preise je Million Token, claude-sonnet-5.
   * Eingabe 2 USD: SPEZIFIKATION_FORMATE.md § 5.5, dieselbe Quelle wie
   * PREIS_JE_MIO_TOKEN_USD in modul_pdf.js.
   * Ausgabe 10 USD: Einfuehrungspreis derselben Preisliste, gueltig bis
   * 31.08.2026; danach 15 USD. Die Anzeige rundet auf Cent, der Unterschied
   * macht bei rund 1.300 Ausgabetoken weniger als einen Cent aus. */
  const PREIS_EINGABE_JE_MIO_USD = 2;
  const PREIS_AUSGABE_JE_MIO_USD = 10;

  /* Erfahrungswert aus der Planauslese ueber denselben Endpunkt: rund 90
   * Ausgabetoken je Sekunde (Messung siehe plan-auslesen.mjs). Die Bewertung
   * schreibt rund 1.100 bis 1.400 Token, also gut 15 Sekunden. */
  const TOKEN_JE_SEKUNDE = 90;
  const AUSGABE_TOKEN_ERWARTET = 1300;
  /* Ein Token entspricht im Deutschen grob 3,3 Zeichen. Fuer eine
   * Kostenvorschau genau genug; abgerechnet wird ohnehin nach der echten
   * Nutzung, die der Endpunkt zurueckmeldet. */
  const ZEICHEN_JE_TOKEN = 3.3;
  const SYSTEMPROMPT_TOKEN = 1500;

  /* Hoechstlaengen in Zeichen. Sie stehen hier und im Schema des Endpunkts.
   * Zweck ist nicht Sparsamkeit, sondern Disziplin: der Referenzbericht
   * braucht fuer den staerksten Absatz des ganzen Dokuments 480 Zeichen. */
  const MAX = {
    kern: 110,
    punkt_text: 620,
    kap2_einleitung: 900,
    kap2_geometrie: 700,
    kap2_nicht_belegt: 600,
    kap6_bewertung: 650,
    warum: 340,
  };

  const S = { laeuft: false, fehler: null, ergebnis: null, paket: null,
              trotzdem: {} };

  /* ------------------------------------------------------------------ *
   * 0  Kleinkram
   * ------------------------------------------------------------------ */

  function zahl(x, ersatz) {
    const n = typeof x === "string" ? Number(String(x).replace(",", ".")) : Number(x);
    return Number.isFinite(n) ? n : (ersatz === undefined ? NaN : ersatz);
  }

  /** Deutsches Zahlenformat, genau wie im Berichtsmodul. */
  function f(x, n) {
    const v = zahl(x, NaN);
    if (!Number.isFinite(v)) return "";
    return v.toLocaleString("de-DE",
      { minimumFractionDigits: n, maximumFractionDigits: n });
  }
  function kw(w) { return f(zahl(w, 0) / 1000, 2) + " kW"; }

  function e2(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ------------------------------------------------------------------ *
   * 1  Zahlenpaket fuer das Modell
   * ------------------------------------------------------------------ */

  /**
   * Baut das Paket, das der Endpunkt in der Betriebsart "bewertung" bekommt.
   * Grundsatz: alles ist fertig formatiert und fertig sortiert. Das Modell
   * soll nichts ausrechnen und nichts vergleichen muessen, denn jede
   * Rechenoperation ist eine Gelegenheit, eine Zahl zu erfinden.
   *
   * @param p Projekt
   * @param e Ergebnis von KERN_HEIZLAST_NORM.rechne()
   * @param hilfen optional die rechenhilfen aus MODUL_BERICHT (fuer Tests)
   */
  function daten(p, e, hilfen) {
    const H = hilfen || (typeof window !== "undefined" && window.MODUL_BERICHT
      && window.MODUL_BERICHT.rechenhilfen) || null;
    if (!p || !e || !H) return null;

    const zeilen = H.bauteilZeilen(p, e);
    const kf = H.konfidenz(p, e, zeilen);
    const zb = H.zonenBilanz(p, e);
    const punkte = H.offenePunkte(p, e, zeilen, kf);
    const geschosse = H.geschossReihenfolge(e);
    const wb = H.wbZuschlagAnteil(e);
    const wfl = zahl(p.meta && p.meta.wohnflaeche, 0);

    /* --- Ergebniskopf ------------------------------------------------- */
    const ergebnis = {
      gebaeudeheizlast: kw(e.phi_gebaeude),
      transmission: kw(e.phi_T_gebaeude),
      transmission_anteil: f(e.phi_gebaeude
        ? e.phi_T_gebaeude / e.phi_gebaeude * 100 : 0, 0) + " Prozent",
      lueftung: kw(e.phi_V_gebaeude),
      lueftung_anteil: f(e.phi_gebaeude
        ? e.phi_V_gebaeude / e.phi_gebaeude * 100 : 0, 0) + " Prozent",
      summe_raumheizlasten: kw(e.phi_raeume_summe),
      norm_aussentemperatur: f(e.klima.theta_e, 1) + " °C",
      waermebrueckenzuschlag: Number.isFinite(wb) ? kw(wb) : null,
    };
    if (e.phi_RH_gebaeude > 0) ergebnis.aufheizleistung = kw(e.phi_RH_gebaeude);
    if (wfl > 0 && Number.isFinite(e.spez_wohnflaeche)) {
      ergebnis.spezifisch_wohnflaeche = f(e.spez_wohnflaeche, 1) + " W/m²";
      ergebnis.wohnflaeche = f(wfl, 2) + " m²";
    } else {
      ergebnis.spezifisch_raumflaeche = f(e.spez_raumflaeche, 1) + " W/m²";
      ergebnis.summe_raumflaechen = f(e.A_gesamt, 2) + " m²";
    }

    /* --- Geschosse, in Reihenfolge des Raumbuchs ----------------------- */
    const geschossliste = geschosse.map(function (g) {
      const jg = e.je_geschoss[g] || { phi_gebaeude: 0, A: 0 };
      return {
        name: String(g),
        heizlast: kw(jg.phi_gebaeude),
        geschossflaeche: f(jg.A, 2) + " m²",
        spezifisch: f(jg.A > 0 ? jg.phi_gebaeude / jg.A : 0, 0) + " W/m²",
      };
    }).filter(function (x) { return x.name; });

    /* --- Bauteilbilanz, absteigend nach Waermestrom -------------------- */
    const bil = Object.keys(e.bilanz || {}).map(function (k) {
      const b = e.bilanz[k];
      return {
        name: k,
        flaeche: f(b.A, 1) + " m²",
        u_wert: f(b.U, 2) + " W/(m²·K)",
        waermestrom: f(b.phi, 0) + " W",
        anteil_transmission: f(e.phi_T_gebaeude ? b.phi / e.phi_T_gebaeude * 100 : 0, 1)
          + " Prozent",
        _phi: b.phi,
      };
    }).sort(function (a, b) { return b._phi - a._phi; });
    const bauteilbilanz = bil.map(function (x) {
      const y = Object.assign({}, x); delete y._phi; return y;
    });

    /* --- Raeume, absteigend nach spezifischer Heizlast ----------------- */
    const raeume = (e.raeume || []).map(function (r) {
      return {
        geschoss: String(r.geschoss || ""),
        name: String(r.raum || ""),
        innentemperatur: f(r.theta_i, 0) + " °C",
        flaeche: f(r.A, 2) + " m²",
        heizlast: f(r.phi_raum, 0) + " W",
        spezifisch: f(r.A > 0 ? r.phi_raum / r.A : 0, 0) + " W/m²",
        _s: r.A > 0 ? r.phi_raum / r.A : 0,
      };
    }).sort(function (a, b) { return b._s - a._s; }).slice(0, 24)
      .map(function (x) { const y = Object.assign({}, x); delete y._s; return y; });

    /* --- BEG-Bewertung je Bauteil --------------------------------------
     * Nur Bauteile der Huelle und alles, wofuer es eine Anforderung gibt.
     * Waende zwischen zwei beheizten Raeumen stehen sonst mit fuenfzehn
     * Zeilen "Bauteil bleibt" im Paket, kosten Token und lenken den Blick
     * von den zwei Zeilen ab, auf die es ankommt. */
    const beg = zeilen.filter(function (z) {
      return z.verwendet && (!z.nur_innen
        || Number.isFinite(z.anforderung && z.anforderung.u_max));
    }).map(function (z) {
      return {
        bauteil: z.kurz,
        u_erreicht: Number.isFinite(z.u) ? f(z.u, 2) + " W/(m²·K)" : null,
        anforderung: Number.isFinite(z.anforderung && z.anforderung.u_max)
          ? f(z.anforderung.u_max, 2) + " W/(m²·K)" : null,
        anforderung_text: (z.anforderung && z.anforderung.text) || null,
        bewertung: (z.bewertung && z.bewertung.text) || null,
        erfuellt: z.bewertung ? z.bewertung.erfuellt : null,
      };
    });

    /* --- Unbeheizte Bereiche ------------------------------------------- */
    const zonen = zb.map(function (z) {
      const fk = [];
      (e.raeume || []).forEach(function (r) {
        (r.bauteile || []).forEach(function (bt) {
          const g = bt.grenzt_an || {};
          if (g.typ !== "zone" || g.ref !== z.id) return;
          const nam = String(bt.name).split(" (")[0];
          if (fk.some(function (x) { return x.bauteil === nam; })) return;
          fk.push({ bauteil: nam, f: f(H.fFaktor(r, bt, e), 2) });
        });
      });
      return {
        name: z.name,
        modus: z.modus === "fest" ? "fest_vorgegeben" : "aus_bilanz",
        temperatur: f(z.ergebnis, 1) + " °C",
        richtungen: (z.gruppen || []).map(function (g) {
          return {
            nach: g.label + (g.teile.length ? " (" + g.teile.join(", ") + ")" : ""),
            leitwert: f(g.H, 1) + " W/K",
            temperatur: f(g.theta, 1) + " °C",
          };
        }),
        korrekturfaktoren: fk,
      };
    });

    /* --- Konfidenzklasse C --------------------------------------------- */
    const konfidenzC = (kf.eintraege || []).filter(function (x) {
      return x.klasse === "C"; }).map(function (x) {
      return {
        schluessel: x.schluessel || "",
        angabe: x.angabe,
        quelle: x.quelle,
        leitparameter: !!x.leit,
        anteil_transmission: x.phi
          ? f(e.phi_T_gebaeude ? x.phi / e.phi_T_gebaeude * 100 : 0, 1) + " Prozent"
          : null,
      };
    });

    /* --- Offene Punkte, mit dem Schluessel, unter dem der Text landet ---
     * Die Schluessel muessen exakt zu offenePunkte() in modul_bericht.js
     * passen, sonst faellt der Text spaeter ins Leere. */
    const offen = [];
    (kf.eintraege || []).forEach(function (x) {
      if (x.klasse !== "C" || !x.alternativ) return;
      offen.push({
        schluessel: x.schluessel || "",
        titel: (x.leit ? "Leitparameter: " : "") + x.angabe
          + " vor Ausführung bestätigen (Bauteilöffnung oder Endoskopie)",
        angesetzter_wert: x.angabe,
        alternativwert: alternativText(x.alternativ),
        herkunft_alternative: (x.alternativ && x.alternativ.quelle) || null,
        wirkung: null,
        anteil_transmission: x.phi
          ? f(e.phi_T_gebaeude ? x.phi / e.phi_T_gebaeude * 100 : 0, 1) + " Prozent"
          : null,
      });
    });
    /* Dieselbe Regel wie in modul_bericht.js/offenePunkte(): aus einem
       ANGENOMMENEN U-Wert folgt keine Bauempfehlung. Am 23.08.2026 an
       „BV 2-0887 Ziolkowski" gemessen bekam ein auf 2022 datierter Neubau
       fünf Punkte der Art „Dämmstärke Dach erhöhen", und keiner der sechs
       verglichenen U-Werte war belegt — alle stammten aus der Typologie.
       Was hier nicht in die Liste geht, geht auch nicht ins Modell: sonst
       schriebe der Textbaustein die Empfehlung nach, die der Bericht gerade
       weggelassen hat. */
    (zeilen || []).forEach(function (z) {
      if (!z.verwendet || !z.bewertung || z.bewertung.erfuellt !== false) return;
      if (!(z.typ && z.typ.belegt === true)) return;
      offen.push({
        schluessel: "beg:" + z.typ.id,
        titel: "Dämmstärke " + z.kurz + " erhöhen, bis U <= "
          + f(z.anforderung.u_max, 2) + " W/(m²·K) erreicht ist",
        angesetzter_wert: Number.isFinite(z.u) ? f(z.u, 2) + " W/(m²·K)" : null,
        alternativwert: Number.isFinite(z.anforderung.u_max)
          ? f(z.anforderung.u_max, 2) + " W/(m²·K)" : null,
        herkunft_alternative: (z.anforderung && z.anforderung.quelle) || null,
        wirkung: null,
        betrifft_flaeche: f(z.A, 1) + " m²",
      });
    });
    (p.offene_punkte || []).forEach(function (o) {
      offen.push({
        schluessel: String(o.id || o.titel || ""),
        titel: o.titel || "",
        angesetzter_wert: o.wert || null,
        alternativwert: o.alternativwert || null,
        herkunft_alternative: o.quelle || null,
        wirkung: null,
      });
    });
    /* Die Wirkung in kW kommt aus offenePunkte(); dort ist sie bereits mit
       der zweiten Kernrechnung beziffert. Zuordnung ueber die Reihenfolge,
       die in beiden Funktionen dieselbe ist. */
    offen.forEach(function (o, i) {
      const q = punkte[i];
      if (!q) return;
      if (Number.isFinite(q.delta)) {
        o.wirkung = Math.abs(q.delta) < 10 ? "unter 0,01 kW"
          : f(Math.abs(q.delta) / 1000, 2) + " kW "
            + (q.delta > 0 ? "mehr" : "weniger");
      } else {
        o.wirkung = "nicht beziffert";
      }
    });

    /* --- Fremdbeleg-Abgleiche ------------------------------------------ */
    const abgleiche = (p.abgleiche || []).filter(function (a) {
      return a.status ? a.status === "bestanden" : true; }).map(function (a) {
      return {
        bezeichnung: a.bezeichnung || a.titel || "",
        rechenwert: a.ist != null ? String(a.ist) : null,
        sollwert: a.soll != null ? String(a.soll) : null,
        quelle_sollwert: a.quelle || null,
        beweist: a.beweist || null,
      };
    });

    const pg = p.plangebaeude || {};
    return {
      objekt: {
        bezeichnung: (p.meta && p.meta.bezeichnung) || "",
        gebaeudetyp: (p.meta && p.meta.gebaeudetyp) || null,
        baujahr: p.meta && p.meta.baujahr ? String(p.meta.baujahr) : null,
        modernisierung: (p.meta && p.meta.modernisierung) || null,
        zustand: (p.meta && p.meta.zustand) || null,
        aussenmasse: (p.meta && p.meta.aussenmasse) || null,
        geschosshoehe: (p.meta && p.meta.geschosshoehe) || null,
        dach: (p.meta && p.meta.dach) || null,
        oberer_abschluss: (p.meta && p.meta.oberer_abschluss) || null,
        volumen: (p.meta && p.meta.volumen) || null,
        nutzungseinheiten: (p.einheiten || []).length
          ? String((p.einheiten || []).length) : null,
        geschosse: geschossliste.map(function (x) { return x.name; }),
        aufmass_vor_ort: !!(p.meta && p.meta.aufmass_vor_ort),
        plan_bauweise: pg.bauweise || null,
        plan_dachform: pg.dachform || null,
        plan_unbeheizte_bereiche: pg.unbeheizte_bereiche || null,
      },
      ergebnis: ergebnis,
      geschosse: geschossliste,
      bauteilbilanz: bauteilbilanz,
      raeume: raeume,
      beg_bewertung: beg,
      unbeheizte_bereiche: zonen,
      konfidenz_c: konfidenzC,
      offene_punkte: offen,
      abgleiche: abgleiche,
    };
  }

  /** Alternativwert eines Konfidenz-C-Eintrags in Worte fassen. */
  function alternativText(a) {
    if (!a) return null;
    if (a.art === "bauteil_u") return "U = " + f(a.wert, 2) + " W/(m²·K)";
    if (a.art === "raum_theta" || a.art === "zone_theta") {
      return f(a.wert, 1) + " °C";
    }
    if (a.art === "norm") return String(a.feld) + " = " + f(a.wert, 2);
    return null;
  }

  /* ------------------------------------------------------------------ *
   * 2  Kosten und Dauer, wie bei der Planauslese
   * ------------------------------------------------------------------ */
  function kostenrahmen(paket) {
    const zeichen = paket ? JSON.stringify(paket).length : 0;
    const eingabe = Math.round(zeichen / ZEICHEN_JE_TOKEN) + SYSTEMPROMPT_TOKEN;
    const ausgabe = AUSGABE_TOKEN_ERWARTET;
    return {
      eingabe_token: eingabe,
      ausgabe_token: ausgabe,
      kosten_usd: eingabe / 1e6 * PREIS_EINGABE_JE_MIO_USD
        + ausgabe / 1e6 * PREIS_AUSGABE_JE_MIO_USD,
      dauer_s: Math.round(ausgabe / TOKEN_JE_SEKUNDE),
    };
  }

  /* ------------------------------------------------------------------ *
   * 3  Sicherung gegen erfundene Zahlen
   * ------------------------------------------------------------------ */

  /* Vor der Zahlensuche entfernt: Normbezeichnungen und Paragrafen. Sie
     enthalten Ziffern, sind aber keine Messwerte. Im Prompt ist ohnehin
     verboten, Normen zu zitieren; das hier ist die zweite Sicherung. */
  const OHNE_NORMEN = [
    /\bDIN\s*(?:\/\s*TS\s*)?(?:EN\s*)?(?:ISO\s*)?(?:V\s*)?[0-9][0-9‑–.\-]*(?::\d{4}-\d{2})?/gi,
    /\bVDI\s*[0-9-]+/gi,
    /\bISO\s*[0-9-]+/gi,
    /§+\s*[0-9]+[a-z]?/gi,
  ];

  /* Einheiten, auf die es sich zu achten lohnt. Laengste zuerst, sonst
     schluckt "W" das "W/(m²·K)".
     WOZU: Die Zahlenpruefung allein reicht nicht. Ein Paket enthaelt einige
     hundert Werte; eine glatte Zahl wie 20 trifft davon fast immer eine und
     kaeme als "20 cm Daemmung" durch, obwohl im ganzen Paket keine
     Zentimeterangabe steht. Die Einheit ist der zweite Schluessel: kommt sie
     in den Daten ueberhaupt nicht vor, ist die Aussage nicht belegt. */
  const EINHEITEN = ["W/(m²·K)", "W/(m2K)", "kWh/m²", "W/m²", "W/K", "kWh",
    "m³", "m²", "kW", "°C", "1/h", "Prozent", "%", "cm", "mm", "km", "kg",
    "€", "EUR", "USD", "Jahren", "Jahre", "Jahr", "Monate", "Monaten",
    "Grad", "W", "K", "m", "t", "a"];

  /** Alle Zahlen eines Textes im deutschen Format, als Zeichenkette. */
  function zahlenAus(t) {
    return zahlenMitEinheit(t).map(function (x) { return x.roh; });
  }

  /** Zahlen eines Textes samt der Einheit, die unmittelbar dahinter steht. */
  function zahlenMitEinheit(t) {
    let s = String(t == null ? "" : t);
    OHNE_NORMEN.forEach(function (r) { s = s.replace(r, " "); });
    const zahl = /-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/g;
    const raus = [];
    let m;
    while ((m = zahl.exec(s)) !== null) {
      const rest = s.slice(m.index + m[0].length).replace(/^[\s ]*/, "");
      let einheit = "";
      for (let i = 0; i < EINHEITEN.length; i++) {
        const u = EINHEITEN[i];
        if (rest.indexOf(u) !== 0) continue;
        /* Wortgrenze verlangen, sonst liest "9,04 auf 7,57" das "a" von
           "auf" als Jahresangabe und beanstandet einen sauberen Satz. */
        const danach = rest.charAt(u.length);
        if (danach && /[A-Za-zÄÖÜäöüß0-9]/.test(danach)) continue;
        einheit = u; break;
      }
      raus.push({ roh: m[0], einheit: einheit });
    }
    return raus;
  }

  /** Einheiten, die im Paket ueberhaupt vorkommen. */
  function erlaubteEinheiten(paket) {
    const roh = paket ? JSON.stringify(paket) : "";
    return EINHEITEN.filter(function (u) { return roh.indexOf(u) >= 0; });
  }

  /** Zeichenkette im deutschen Format in eine Zahl umsetzen. */
  function alsZahl(s) {
    const t = String(s).replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  /** Nachkommastellen der geschriebenen Zahl. */
  function stellen(s) {
    const m = String(s).match(/,(\d+)$/);
    return m ? m[1].length : 0;
  }

  /* ------------------------------------------------------------------ *
   * 3b  Sicherung gegen Behauptungen, die dem Projektzustand widersprechen
   * ------------------------------------------------------------------ *
   * Die Zahlenpruefung faengt nur Zahlen. GEMESSEN am 24.08.2026: ein
   * uebernommener Kapitel-2-Absatz behauptete "Unbeheizt sind das
   * Kellergeschoss, soweit unterkellert" -- unmittelbar ueber der
   * Raumtabelle, die KG KELLER und KG FLUR mit 20 °C und 431/495 W als
   * beheizte Raeume fuehrt. Kein Zeichen davon ist eine Zahl im Sinne der
   * Pruefung; der Satz lief durch.
   *
   * Deshalb wird jeder bewertende Absatz VOR der Uebernahme zusaetzlich
   * gegen den PROJEKTZUSTAND geprueft -- als erstes und hartes Kriterium:
   * beheizt/unbeheizt je Bereich. Ein Absatz, der einem Bereich das
   * Gegenteil seines Raumbuch-Zustands zuschreibt, ist GESPERRT und laesst
   * sich auch nicht "trotzdem" uebernehmen: eine falsche Tatsachenbehauptung
   * ueber das eigene Raumbuch ist kein Geschmacksurteil, das ein Haken
   * heilen koennte. */

  /* Die Bereiche, ueber die ein Absatz beheizt/unbeheizt behaupten kann,
     mit den Woertern, unter denen sie im Text auftreten. */
  /* Je Bereich zwei Muster: das Wort (ohne Ruecksicht auf Schreibung) und
     das Kuerzel (nur in Grossbuchstaben — ein kleines "eg" steckt in jedem
     "weg"). */
  const BEREICHSWOERTER = [
    { kuerzel: "KG", muster: /kellergeschoss\w*|untergeschoss\w*|\bkeller\b/gi },
    { kuerzel: "KG", muster: /\bKG\b|\bUG\b/g },
    { kuerzel: "EG", muster: /erdgeschoss\w*/gi },
    { kuerzel: "EG", muster: /\bEG\b/g },
    { kuerzel: "OG", muster: /obergeschoss\w*/gi },
    { kuerzel: "OG", muster: /\bOG\b/g },
    { kuerzel: "DG", muster: /dachgeschoss\w*|spitzboden\w*|dachraum\w*/gi },
    { kuerzel: "DG", muster: /\bDG\b/g },
  ];

  /** Ein Geschossname aus dem Raumbuch ("KG", "Kellergeschoss", "eg") auf
   *  das Kuerzel der Bereichsliste. */
  function bereichsKuerzel(g) {
    const t = String(g == null ? "" : g).toLowerCase();
    if (/keller|unterg|\bkg\b|\bug\b/.test(t)) return "KG";
    /* Dach VOR den Obergeschossen: "Spitzboden über dem OG" ist ein
       Dachbereich, kein Obergeschoss. */
    if (/dachg|\bdg\b|spitzboden|dachraum/.test(t)) return "DG";
    if (/erdg|\beg\b/.test(t)) return "EG";
    if (/oberg|\bog\b/.test(t)) return "OG";
    return null;
  }

  /**
   * Der Zustand, gegen den geprueft wird: je Bereich, ob dort BEHEIZTE
   * Raeume stehen (mit Belegen aus der Raumtabelle) und ob er als
   * unbeheizter Bereich gefuehrt wird.
   */
  function zustandAusProjekt(p, e) {
    const beheizt = {};
    ((e && e.raeume) || []).forEach(function (r) {
      const k = bereichsKuerzel(r.geschoss);
      if (!k) return;
      (beheizt[k] = beheizt[k] || []).push({
        name: String(r.geschoss || k) + " " + String(r.raum || ""),
        theta: r.theta_i, phi: r.phi_raum,
      });
    });
    const unbeheizt = [];
    ((p && p.zonen) || []).forEach(function (z) {
      if (z && z.name) unbeheizt.push(String(z.name));
    });
    (((p && p.plangebaeude) || {}).unbeheizte_bereiche || []).forEach(function (n) {
      if (n) unbeheizt.push(String(n));
    });
    return { beheizt: beheizt, unbeheizt: unbeheizt };
  }

  /** Saetze eines Absatzes, mit Anfangsposition. */
  function saetze(t) {
    const s = String(t == null ? "" : t);
    const raus = [];
    let anfang = 0;
    const ende = /[.!?](?=\s|$)/g;
    let m;
    while ((m = ende.exec(s)) !== null) {
      raus.push({ text: s.slice(anfang, m.index + 1).trim(), von: anfang });
      anfang = m.index + 1;
    }
    const rest = s.slice(anfang).trim();
    if (rest) raus.push({ text: rest, von: anfang });
    return raus.filter(function (x) { return x.text; });
  }

  /**
   * Prueft EINEN Text gegen den Zustand. Liefert je Konflikt einen Satz
   * Erklaerung; leere Liste heisst: keine widerlegte Behauptung.
   */
  function pruefeZustandText(t, zustand) {
    if (!zustand) return [];
    const konflikte = [];
    saetze(t).forEach(function (satz) {
      const s = satz.text;
      /* Die Polaritaetsmarken des Satzes: unbeheizt / nicht beheizt vs.
         beheizt. Jede mit ihrer Stelle, denn "Beheizt sind EG und OG,
         unbeheizt der Keller" traegt beide in einem Satz. */
      const marken = [];
      const mr = /\b(?:un|nicht\s+)?beheizt\w*/gi;
      let m;
      while ((m = mr.exec(s)) !== null) {
        const bis = m.index + m[0].length;
        /* ATTRIBUTIV ODER PRAEDIKATIV -- DAS ENTSCHEIDET, WORUEBER DER SATZ
           ETWAS BEHAUPTET.
           GEMESSEN am 26.08.2026 an "BV 2-0887 Ziolkowski": 3 von 9
           Absaetzen wurden hart gesperrt, alle drei zu Unrecht. Beispiel:
           "Der Dachanschluss und die angrenzenden unbeheizten Bereiche
           wirken sich im OG staerker aus" -> gemeldet als "nennt den Bereich
           OG unbeheizt". Gewertet wurde die blosse NAEHE von "unbeheizten"
           zu "OG" im selben Satz.
           "unbeheizten Bereiche" ist ein Attribut: es beschreibt das Wort
           dahinter, nicht ein Geschoss weiter hinten im Satz. Ein Attribut
           traegt deshalb nur dann eine Behauptung, wenn das Bereichswort
           SELBST das beschriebene Hauptwort ist ("unbeheizter Keller").
           Praedikative Verwendung ("... ist unbeheizt", "Unbeheizt sind ...")
           bleibt unberuehrt und faengt den Fall weiter, um den es geht. */
        const dahinter = s.slice(bis, bis + 40);
        const nomen = dahinter.match(/^\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß]+)/);
        marken.push({ von: m.index, bis: bis,
          art: /^un|^nicht/i.test(m[0]) ? "unbeheizt" : "beheizt",
          /* Attributiv, wenn direkt ein grossgeschriebenes Hauptwort folgt;
             dann gilt die Marke nur bis zu dessen Ende. */
          attributiv_bis: nomen ? bis + nomen[0].length : null });
      }
      if (!marken.length) return;
      /* Teilsatzgrenzen: "Beheizt sind EG und OG, unbeheizt der Keller"
         traegt zwei Behauptungen. Eine Marke gilt zuerst fuer die Bereiche
         ihres eigenen Teilsatzes; erst ohne eigene Marke zaehlt die Naehe. */
      const teilsatzVon = function (bei) {
        let t3 = 0;
        for (let i = 0; i < bei && i < s.length; i++) {
          if (s[i] === "," || s[i] === ";") t3++;
        }
        return t3;
      };
      /* EIN BEREICH IN EINER ORTSANGABE IST NICHT DAS, WOVON DIE REDE IST.
         "Unbeheizt ist allein der Spitzboden ueber dem Obergeschoss" sagt
         etwas ueber den Spitzboden; "ueber dem Obergeschoss" sagt nur, wo er
         liegt. Wird beides gleich gewertet, meldet die Sperre einen
         "unbeheizten OG", den der Satz nirgends behauptet -- einer der drei
         Fehlalarme vom 26.08.2026 (Ziolkowski).
         NICHT GELOCKERT: eine Ortsangabe zaehlt weiter, wenn sie im Satz das
         EINZIGE Bereichswort ist ("Im Keller ist es unbeheizt"). Verdraengt
         wird sie nur von einem Bereichswort, das ohne Praeposition dasteht
         und damit das Satzglied ist, um das es geht. */
      /* Kein \b vor den Praepositionen: in JavaScript ist \b an ASCII
         gebunden, und zwischen Leerzeichen und "ue" gibt es damit keine
         Wortgrenze -- "ueber dem OG" waere nie getroffen worden. */
      const VOR_ORT = /(?:^|[^A-Za-zÄÖÜäöüß])(?:über|ueber|unter|neben|im|in|am|an|auf|beim|bei|zum|zur|zwischen|oberhalb|unterhalb|gegenüber|gegenueber)\s+(?:dem|der|den|das|die|des)?\s*$/i;
      let ohneOrt = false;
      BEREICHSWOERTER.forEach(function (b) {
        b.muster.lastIndex = 0;
        let t0;
        while ((t0 = b.muster.exec(s)) !== null) {
          if (!VOR_ORT.test(s.slice(0, t0.index))) ohneOrt = true;
        }
        b.muster.lastIndex = 0;
      });
      BEREICHSWOERTER.forEach(function (b) {
        b.muster.lastIndex = 0;
        let t2;
        while ((t2 = b.muster.exec(s)) !== null) {
          if (ohneOrt && VOR_ORT.test(s.slice(0, t2.index))) continue;
          const eigener = teilsatzVon(t2.index);
          let marke = null;
          marken.forEach(function (x) {
            /* Eine attributive Marke gilt nur fuer ihr eigenes Hauptwort. */
            if (x.attributiv_bis !== null
                && !(t2.index >= x.bis && t2.index < x.attributiv_bis)) return;
            const gleich = teilsatzVon(x.von) === eigener;
            const d = (t2.index >= x.von && t2.index <= x.bis) ? 0
              : Math.min(Math.abs(t2.index - x.bis), Math.abs(x.von - t2.index));
            const wert = { art: x.art, d: d, gleich: gleich };
            if (!marke
                || (gleich && !marke.gleich)
                || (gleich === marke.gleich && d < marke.d)) marke = wert;
          });
          if (!marke) continue;
          const raeume = zustand.beheizt[b.kuerzel] || [];
          if (marke.art === "unbeheizt" && raeume.length) {
            const belege = raeume.slice(0, 3).map(function (r) {
              const teile = [];
              if (Number.isFinite(r.theta)) teile.push(f(r.theta, 0) + " °C");
              if (Number.isFinite(r.phi)) teile.push(f(r.phi, 0) + " W");
              return r.name.trim() + (teile.length ? " (" + teile.join(", ") + ")" : "");
            }).join(", ");
            konflikte.push("Der Satz „" + s + "“ nennt den Bereich "
              + b.kuerzel + " unbeheizt — im Raumbuch "
              + (raeume.length === 1 ? "steht dort 1 beheizter Raum"
                : "stehen dort " + raeume.length + " beheizte Räume")
              + ": " + belege
              + (raeume.length > 3 ? " …" : "") + ".");
          } else if (marke.art === "beheizt" && !raeume.length) {
            const alsZone = zustand.unbeheizt.some(function (n) {
              return bereichsKuerzel(n) === b.kuerzel;
            });
            if (alsZone) {
              konflikte.push("Der Satz „" + s + "“ nennt den Bereich "
                + b.kuerzel + " beheizt — im Projekt ist er ausschließlich "
                + "als unbeheizter Bereich (Zone) geführt, ohne beheizte "
                + "Räume im Raumbuch.");
            }
          }
        }
        b.muster.lastIndex = 0;
      });
    });
    /* Doppelte Erklaerungen (zweimal "Keller" im selben Satz) einmal nennen. */
    return konflikte.filter(function (x, i) { return konflikte.indexOf(x) === i; });
  }

  /* Felder, aus denen KEINE Zahl uebernommen werden darf. Es sind
     Herkunftsangaben und innere Kennungen: "Fassung 10.07.2026" oder
     "bt_demo_19". Sie gehoeren nicht in einen Bewertungstext, blaehen die
     Menge der zulaessigen Zahlen aber stark auf und machen die Pruefung
     dadurch stumpf. */
  const OHNE_ZAHLEN = ["schluessel", "quelle", "quelle_sollwert",
    "herkunft_alternative", "anforderung_text", "modus"];

  /** Menge aller Zahlen, die im Paket vorkommen. Auch die in Texten. */
  function erlaubteZahlen(paket) {
    const raus = [];
    function nimm(x) {
      if (x === null || x === undefined) return;
      if (typeof x === "number") {
        if (Number.isFinite(x)) { raus.push(x); raus.push(Math.abs(x)); }
        return;
      }
      if (typeof x === "string") {
        zahlenAus(x).forEach(function (z) {
          const n = alsZahl(z);
          if (n !== null) { raus.push(n); raus.push(Math.abs(n)); }
        });
        return;
      }
      if (Array.isArray(x)) { x.forEach(nimm); return; }
      if (typeof x === "object") {
        Object.keys(x).forEach(function (k) {
          if (OHNE_ZAHLEN.indexOf(k) >= 0) return;
          nimm(x[k]);
        });
      }
    }
    nimm(paket);
    return raus;
  }

  /**
   * Prueft einen einzelnen Text gegen die erlaubten Zahlen.
   * Eine geschriebene Zahl gilt als belegt, wenn sie eine korrekte Rundung
   * einer erlaubten Zahl ist. "27" ist damit fuer 27,1 zulaessig, "1.661"
   * dagegen nur, wenn 1.661 wirklich im Paket steht.
   */
  function pruefeText(t, erlaubt, einheiten) {
    const unbekannt = [];
    const eh = einheiten || null;
    zahlenMitEinheit(t).forEach(function (z) {
      const x = alsZahl(z.roh);
      if (x === null) return;
      const tol = 0.5 * Math.pow(10, -stellen(z.roh)) + 1e-9;
      let gut = erlaubt.some(function (a) { return Math.abs(x - a) <= tol; });
      /* Zweiter Schluessel: die Einheit. Eine Zentimeterangabe in einem
         Paket ohne eine einzige Zentimeterangabe ist erfunden, auch wenn
         die blosse Zahl zufaellig irgendwo vorkommt. */
      if (gut && eh && z.einheit && eh.indexOf(z.einheit) < 0) gut = false;
      const marke = z.roh + (z.einheit ? " " + z.einheit : "");
      if (!gut && unbekannt.indexOf(marke) < 0) unbekannt.push(marke);
    });
    return unbekannt;
  }

  /**
   * Prueft das gesamte Modellergebnis.
   * Liefert je Feld {feld, pfad, titel, text, unbekannt[], zu_lang, ok}.
   * Ein Feld ist nur dann uebernehmbar, wenn keine unbekannte Zahl darin
   * steht UND die Hoechstlaenge eingehalten ist.
   */
  function pruefeZahlen(erg, paket, zustand) {
    const erlaubt = erlaubteZahlen(paket);
    const einheiten = erlaubteEinheiten(paket);
    const felder = [];
    function add(pfad, titel, t, max) {
      if (typeof t !== "string" || !t.trim()) return;
      const u = pruefeText(t, erlaubt, einheiten);
      const lang = t.length > max;
      /* Erst der Zustand, dann die Zahlen: eine falsche Tatsachenbehauptung
         ueber das eigene Raumbuch sperrt hart (siehe 3b). */
      const zk = pruefeZustandText(t, zustand);
      /* DIESELBE REGEL WIE FUER DIE DRUCKFASSUNG, an derselben Liste.
         GEMESSEN am 26.08.2026 an "Hasenberg 10": der einzige durchgelassene
         Absatz mass die Bauteile an "der fuer die Foerderung geprueften
         Anforderung". Keine Zahl darin war erfunden -- die Zahlenpruefung
         hatte deshalb nichts zu beanstanden. In einem Heizlastbericht nach
         DIN EN 12831-1 ist eine Foerderaussage trotzdem sachfremd und als
         Zusage lesbar. Geprueft wird mit MODUL_BERICHT.druckSuche, damit es
         nur EINE Wortliste gibt (modul_bericht.js, Abschnitt 8c). Der Befund
         ist eine Sperre: "trotzdem uebernehmen" gibt es dafuer nicht. */
      const B = (typeof window !== "undefined" && window.MODUL_BERICHT) || null;
      /* druckSuche liegt unter rechenhilfen — dort steht alles, was auch die
         Baustellensuche in Schritt 5b des Baus benutzt. */
      const DS = B && B.rechenhilfen && B.rechenhilfen.druckSuche;
      const vok = DS
        ? DS("<p>" + t + "</p>").map(function (x) {
            return String(x.regel).replace(/^Druckfassung:\s*/, ""); })
        : [];
      const vokEinmal = vok.filter(function (x, i) { return vok.indexOf(x) === i; });
      felder.push({ pfad: pfad, titel: titel, text: t, unbekannt: u,
                    zustand: zk, vokabular: vokEinmal,
                    sperre: zk.length > 0 || vokEinmal.length > 0,
                    zu_lang: lang, laenge: t.length, max: max,
                    ok: u.length === 0 && !lang && zk.length === 0
                        && vokEinmal.length === 0 });
    }
    (erg.kap1_punkte || []).slice(0, 3).forEach(function (x, i) {
      add("kap1_punkte." + i + ".kern", "Kapitel 1, Punkt " + (i + 1)
        + ", Kernaussage", x && x.kern, MAX.kern);
      add("kap1_punkte." + i + ".text", "Kapitel 1, Punkt " + (i + 1)
        + ", Begründung", x && x.text, MAX.punkt_text);
    });
    add("kap2_einleitung", "Kapitel 2, Beschreibung des Objekts",
      erg.kap2_einleitung, MAX.kap2_einleitung);
    add("kap2_geometrie", "Kapitel 2, Warum die Geometrie belastbar ist",
      erg.kap2_geometrie, MAX.kap2_geometrie);
    add("kap2_nicht_belegt", "Kapitel 2, Was nicht aus Unterlagen stammt",
      erg.kap2_nicht_belegt, MAX.kap2_nicht_belegt);
    add("kap6_bewertung", "Kapitel 6, Einordnung der Zonentemperaturen",
      erg.kap6_bewertung, MAX.kap6_bewertung);
    (erg.offene_punkte || []).forEach(function (x) {
      if (!x || !x.schluessel) return;
      add("offene_punkte." + x.schluessel,
        "Kapitel 8, Begründung zu „" + x.schluessel + "“", x.warum, MAX.warum);
    });

    /* Schluessel, die es im Paket gar nicht gibt, sind kein Zahlenfehler,
       aber der Text liefe ins Leere. Er wird verworfen, nicht vorgelegt. */
    const bekannt = ((paket && paket.offene_punkte) || []).map(function (o) {
      return o.schluessel; });
    const fremd = (erg.offene_punkte || []).filter(function (x) {
      return x && x.schluessel && bekannt.indexOf(x.schluessel) < 0;
    }).map(function (x) { return x.schluessel; });

    return {
      felder: felder,
      fremde_schluessel: fremd,
      sauber: felder.filter(function (x) { return x.ok; }).length,
      beanstandet: felder.filter(function (x) { return !x.ok; }).length,
      erlaubte_zahlen: erlaubt.length,
    };
  }

  /* ------------------------------------------------------------------ *
   * 4  Uebernahme in p.texte
   * ------------------------------------------------------------------ */

  /** Setzt einen Wert unter dem Pfad in p.texte. */
  function setzen(p, pfad, wert) {
    p.texte = p.texte || {};
    const teile = String(pfad).split(".");
    /* kap1_punkte ist eine Liste von {kern, text}, kein verschachteltes
       Objekt. Deshalb hier ein eigener Zweig. */
    if (teile[0] === "kap1_punkte") {
      const i = Number(teile[1]);
      if (!Array.isArray(p.texte.kap1_punkte)) p.texte.kap1_punkte = [];
      while (p.texte.kap1_punkte.length <= i) p.texte.kap1_punkte.push({ kern: "", text: "" });
      p.texte.kap1_punkte[i][teile[2]] = wert;
      return;
    }
    if (teile.length === 1) { p.texte[teile[0]] = wert; return; }
    let x = p.texte;
    for (let i = 0; i < teile.length - 1; i++) {
      if (!x[teile[i]] || typeof x[teile[i]] !== "object") x[teile[i]] = {};
      x = x[teile[i]];
    }
    x[teile[teile.length - 1]] = wert;
  }

  /**
   * Uebernimmt die geprueften Texte. Ohne zweites Argument nur die sauberen.
   * @param pruefung Rueckgabe von pruefeZahlen()
   * @param p Projekt
   * @param auch Liste von Pfaden, die der Bearbeiter trotz Beanstandung will
   */
  function uebernehmen(pruefung, p, auch) {
    const zusatz = auch || [];
    let n = 0;
    (pruefung.felder || []).forEach(function (x) {
      /* Eine Zustandssperre kennt kein "trotzdem": der Absatz behauptet das
         Gegenteil dessen, was im Raumbuch steht. Erst muss eines von beiden
         geaendert werden. */
      if (x.sperre) return;
      if (!x.ok && zusatz.indexOf(x.pfad) < 0) return;
      setzen(p, x.pfad, x.text);
      /* Fuer das satzweise Streichen: der volle Wortlaut bleibt daneben
         liegen, die Streichliste beginnt leer. */
      p.texte_voll = p.texte_voll || {};
      p.texte_strich = p.texte_strich || {};
      p.texte_voll[x.pfad] = x.text;
      delete p.texte_strich[x.pfad];
      n++;
    });
    /* EINE FREIGEGEBENE KERNAUSSAGE FAELLT NICHT MIT IHRER BEGRUENDUNG.
     *
     * GEMESSEN am 26.08.2026 an "Hasenberg 10": die Begruendungen zu Punkt 1
     * und 3 wurden wegen zweier unbelegter Jahreszahlen (1969, 1978) zu
     * Recht beanstandet -- und mit ihnen verschwand die als "uebernehmbar"
     * ausgewiesene Kernaussage "Der U-Wert der Aussenwand ist eine
     * Typologie-Annahme und nicht am Gebaeude gemessen" aus dem Bericht.
     * Der Kunde bekam damit einen Bericht, in dem das Wort "Annahme" kein
     * einziges Mal vorkam, obwohl 100 % der U-Werte angenommen sind.
     * Zweiter Schaden derselben Ursache (Ziolkowski, 26.08.2026): das
     * Verdichten der Liste verschob die Indizes, und die Freigabeliste
     * zeigte unter "Punkt 2, Begruendung" den Wortlaut von Punkt 3.
     *
     * Eine Kernaussage ist ein vollstaendiger Satz und traegt allein. Sie
     * bleibt deshalb stehen, auch wenn ihre Begruendung nicht durchgeht;
     * entfernt wird nur, was GAR KEINE Kernaussage hat. Eine Begruendung
     * ohne Kernaussage bleibt ebenfalls draussen -- sie begruendet nichts. */
    if (Array.isArray(p.texte && p.texte.kap1_punkte)) {
      p.texte.kap1_punkte = p.texte.kap1_punkte.filter(function (x) {
        return x && String(x.kern || "").trim();
      });
    }
    return n;
  }

  /** Fehlen dem Bericht die bewertenden Absätze? Maßgebend sind die drei
   *  Punkte in Kapitel 1: sie sind der einzige Abschnitt, den der Leser
   *  garantiert sucht, und ohne sie erscheint dort gar nichts.
   *  Wird beim Erzeugen des Berichts gefragt, damit niemand den Knopf suchen
   *  muss, um zu merken, dass er ihn gebraucht hätte. */
  function fehlt(p) {
    const t = (p && p.texte) || {};
    const punkte = Array.isArray(t.kap1_punkte) ? t.kap1_punkte : [];
    return !punkte.some(function (x) {
      return x && String(x.kern || "").trim(); });
  }

  /* ------------------------------------------------------------------ *
   * 5  Aufruf des Endpunkts
   * ------------------------------------------------------------------ */
  /* Meldungen ueber modul_dialog.js — kein alert(), das den Tab anhaelt,
     waehrend im Hintergrund ein Endpunkt antwortet. */
  function melde(text, opt) {
    const D = typeof window !== "undefined" ? window.MODUL_DIALOG : null;
    if (D) return D.sagen(text, opt);
    return { weg() {} };
  }

  async function erzeugen() {
    const A = typeof window !== "undefined" ? window.App : null;
    const KI = typeof window !== "undefined" ? window.MODUL_KI : null;
    if (!A || !A.ergebnis || A.ergebnis.fehlerhaft) {
      melde("Erst muss eine fehlerfreie Berechnung vorliegen.", { stufe: "warnung" });
      return;
    }
    if (KI && !KI.konfiguriert() && !(await KI.codeErfragen())) return;

    const paket = daten(A.p, A.ergebnis);
    if (!paket) {
      melde("Die Zahlen für die Bewertung lassen sich nicht bilden.", { stufe: "warnung" });
      return;
    }

    S.laeuft = true; S.fehler = null; S.ergebnis = null; S.paket = paket;
    S.trotzdem = {};
    window.render();
    try {
      let d;
      /* WAS DIE ABSAETZE KOSTEN, ZAEHLT MIT.
         GEMESSEN am 26.08.2026 an "Hasenberg 10": nach "Jetzt schreiben
         lassen" stand p.verbrauch unveraendert bei 11 Lesungen / 0,4361 $.
         Dieser Aufruf kostet echtes Geld und gehoert in denselben
         Aufwandsausweis. Gebucht wird ueber dieselbe Stelle wie die
         Planauslese; sie bucht nur den Zuwachs. */
      const buchen = function (n) {
        if (!A) return;
        A.auslese = A.auslese || { kosten: 0, aufrufe: 0 };
        A.auslese.aufrufe = (A.auslese.aufrufe || 0) + n;
        if (A.auslese.aufrufeFertig !== undefined) {
          A.auslese.aufrufeFertig = (A.auslese.aufrufeFertig || 0) + n;
        }
        const K2 = (typeof window !== "undefined") && window.ausleseKostenAddieren;
        const V2 = (typeof window !== "undefined") && window.verbrauchAblegen;
        if (K2 && d && d._verbrauch) K2(d._verbrauch);
        if (V2) V2(0, "Bewertende Absätze");
      };
      try {
        d = await KI.auslesenBild(null, "", "bewertung", paket);
        buchen(1);
      } catch (x) {
        /* "Zahlenpaket zu gross" (Kennung des Endpunkts) sieht der Kollege
           nicht mehr: das Werkzeug kuerzt das Paket selbst — ueberlange
           Texte und Listen, die in die Bewertung ohnehin nicht woertlich
           eingehen — und sendet einmal erneut. Erst wenn auch das scheitert,
           kommt eine Meldung, und die sagt, was versucht wurde. */
        if (!x || x.kennung !== "paket_zu_gross") throw x;
        const kleiner = paketKuerzen(paket);
        try {
          d = await KI.auslesenBild(null, "", "bewertung", kleiner);
          S.paket = kleiner;
          buchen(2);
        } catch (x2) {
          if (x2 && x2.kennung === "paket_zu_gross") {
            throw new Error("Das Zahlenpaket ist auch nach dem automatischen "
              + "Kürzen (überlange Texte und Listen entfernt) zu groß für den "
              + "Endpunkt. Das deutet auf versehentlich eingebettete Rohdaten "
              + "im Projekt hin. Die Absätze bitte von Hand schreiben; der "
              + "Bericht bleibt ohne sie vollständig lesbar.");
          }
          throw x2;
        }
      }
      S.ergebnis = { roh: d,
        pruefung: pruefeZahlen(d, S.paket, zustandAusProjekt(A.p, A.ergebnis)) };
    } catch (x) {
      S.fehler = String((x && x.message) || x);
    } finally {
      S.laeuft = false;
      window.render();
    }
    /* DER VORSCHLAG DARF NICHT UNSICHTBAR ANKOMMEN.
       GEMESSEN in der Live-Abnahme am 24.08.2026: nach „Jetzt schreiben
       lassen" lief der bezahlte Aufruf durch, der fertige Vorschlag stand
       weit unten auf der Seite — und nichts wies dorthin. Der Klick wirkte
       folgenlos. Deshalb blaettert die Seite jetzt zur Karte (Vorschlag
       oder Fehlermeldung, beide tragen die Kennung bewVorschlag) und sagt
       beim Erfolg kurz, was zu tun bleibt. */
    if (typeof document !== "undefined") {
      setTimeout(function () {
        const ziel = document.getElementById("bewVorschlag");
        if (!ziel || !ziel.scrollIntoView) return;
        /* Erst weich, dann nachgeprueft — "smooth" laeuft in einem Reiter im
           Hintergrund (und im automatisierten Chrome) nicht an; dann wird
           hart gesprungen. Siehe zumVorschlag in modul_bericht. */
        ziel.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(function () {
          const r = ziel.getBoundingClientRect();
          if (r.top < -80 || r.top > window.innerHeight * 0.9) {
            ziel.scrollIntoView({ block: "start" });
          }
        }, 400);
      }, 80);
    }
    if (S.ergebnis) {
      melde("Jeden Absatz lesen, dann übernehmen oder verwerfen. In den "
        + "Bericht kommt er erst mit der Übernahme.",
        { stufe: "gut", titel: "Der Vorschlag ist fertig" });
    }
  }

  /** Kuerzt ein Zahlenpaket, das die Endpunktgrenze reisst: Zeichenketten
   *  ueber 400 Zeichen werden gekappt, Listen ueber 50 Eintraege beschnitten.
   *  Zahlen bleiben unangetastet — sie sind das, worum es der Bewertung geht. */
  function paketKuerzen(wert) {
    if (typeof wert === "string") {
      return wert.length > 400 ? wert.slice(0, 400) + "…" : wert;
    }
    if (Array.isArray(wert)) {
      return wert.slice(0, 50).map(paketKuerzen);
    }
    if (wert && typeof wert === "object") {
      const aus = {};
      Object.keys(wert).forEach(function (k) { aus[k] = paketKuerzen(wert[k]); });
      return aus;
    }
    return wert;
  }

  /* ------------------------------------------------------------------ *
   * 6  Oberflaeche
   * ------------------------------------------------------------------ */
  function knopf(p, e) {
    if (S.laeuft) {
      return '<button class="btn primaer" disabled>Texte werden geschrieben…</button>';
    }
    const paket = daten(p, e);
    if (!paket) return "";
    const k = kostenrahmen(paket);
    return '<button class="btn primaer" data-aktion="bewertungErzeugen">'
      + "Bewertende Texte schreiben lassen</button>"
      + '<div style="font-size:12.5px;color:var(--mute);margin-top:8px">'
      + "Dauert etwa " + k.dauer_s + " Sekunden und kostet rund "
      + f(k.kosten_usd, 2) + " $. Geschrieben werden die drei Punkte in Kapitel 1, "
      + "die Einordnung der Datengrundlage, die Bewertung der unbeheizten Bereiche "
      + "und je offenem Punkt die Begründung. Übergeben werden nur Zahlen, kein Plan "
      + "und kein Bild. Jede Zahl im Text wird danach gegen diese Zahlen geprüft. "
      + "Ohne diesen Schritt bleibt der Bericht vollständig lesbar, die Absätze "
      + "entfallen dann.</div>";
  }

  function html() {
    if (S.fehler) {
      return '<div class="meldung fehler" id="bewVorschlag"><span class="sym">!</span><div>'
        + "<b>Die Texte konnten nicht geschrieben werden.</b><br>" + e2(S.fehler)
        + "<br><small>Der Bericht lässt sich trotzdem erzeugen; die bewertenden "
        + "Absätze fehlen dann.</small></div></div>";
    }
    const r = S.ergebnis;
    if (!r) return "";
    const pr = r.pruefung;
    let h = '<div class="karte" id="bewVorschlag" style="border-color:#5DB55A">'
      + "<h2>Vorschlag für die bewertenden Absätze</h2>"
      + '<p class="hinweis">Nichts davon ist geprüft. Der Bericht ist unterschrieben, '
      + "wenn er das Haus verlässt, also bitte jeden Satz lesen.</p>";

    h += pr.beanstandet === 0
      ? '<div class="meldung gut"><span class="sym">OK</span><div><b>Zahlenprüfung '
        + "bestanden.</b> Alle " + pr.felder.length + " Absätze nennen ausschließlich "
        + "Zahlen, die auch im Bericht stehen.</div></div>"
      : '<div class="meldung warnung"><span class="sym">!</span><div><b>'
        + pr.beanstandet + " von " + pr.felder.length + " Absätzen "
        + (pr.beanstandet === 1 ? "ist" : "sind") + " beanstandet.</b> "
        + "Sie werden nicht übernommen. Rot markiert ist, was nicht in den übergebenen "
        + "Zahlen vorkommt, zu lang ist oder dem Projektzustand widerspricht — "
        + "Letzteres sperrt hart, denn dann ist der Absatz oder das Raumbuch "
        + "falsch, und das klärt sich am Projekt.</div></div>";

    if ((pr.fremde_schluessel || []).length) {
      h += '<div class="meldung warnung"><span class="sym">!</span><div>'
        + pr.fremde_schluessel.length + " Begründungen gehören zu keinem offenen Punkt "
        + "und werden verworfen.</div></div>";
    }

    h += '<div class="tabhuelle"><table class="tab"><thead><tr>'
      + '<th style="width:26%">Stelle im Bericht</th><th>Text</th>'
      + '<th style="width:130px">Prüfung</th></tr></thead><tbody>'
      + pr.felder.map(function (x) {
          return "<tr><td>" + e2(x.titel) + "</td><td>" + markiert(x)
            + ((x.zustand || []).length
              ? '<div style="margin-top:6px;font-size:12.5px;color:#B00020">'
                + x.zustand.map(e2).join("<br>") + "</div>"
              : "")
            + ((x.vokabular || []).length
              ? '<div style="margin-top:6px;font-size:12.5px;color:#B00020">'
                + "Gehört nicht in die Druckfassung: "
                + e2(x.vokabular.join(" · ")) + "</div>"
              : "")
            + "</td><td>"
            + (x.ok
              ? '<span class="chip belegt">übernehmbar</span>'
              : x.sperre
              /* Eine Zustandssperre bekommt KEINEN Haken: der Absatz
                 widerspricht dem Raumbuch, und einer von beiden ist falsch.
                 Das entscheidet sich am Projekt, nicht an einer Checkbox. */
              ? '<span class="chip annahme" style="background:#FBE9E7">Sperre: '
                + ((x.vokabular || []).length
                  ? "Wortlaut gehört nicht in den Ausdruck"
                  : "widerspricht dem Projektzustand") + "</span>"
              : '<span class="chip annahme" style="background:#FBE9E7">'
                + (x.unbekannt.length
                  ? x.unbekannt.length + " unbelegte Zahl"
                    + (x.unbekannt.length === 1 ? "" : "en") : "zu lang, "
                    + x.laenge + " statt " + x.max + " Zeichen")
                + "</span><br><label style=\"font-size:12px\"><input type=\"checkbox\" "
                + 'data-bewtrotzdem="' + e2(x.pfad) + '"'
                + (S.trotzdem[x.pfad] ? " checked" : "")
                + "> geprüft, trotzdem übernehmen</label>")
            + "</td></tr>";
        }).join("")
      + "</tbody></table></div>"
      + '<div style="margin-top:12px;display:flex;gap:8px">'
      + '<button class="btn klein primaer" data-aktion="bewertungUebernehmen">'
      + "In den Bericht übernehmen</button>"
      + '<button class="btn klein" data-aktion="bewertungVerwerfen">Verwerfen</button>'
      + "</div></div>";
    return h;
  }

  /* ------------------------------------------------------------------ *
   * 6b  Uebernommene Absaetze, satzweise streichbar
   * ------------------------------------------------------------------ *
   * Nach der Uebernahme war ein Absatz bisher nur im Ganzen zu ersetzen
   * (neuer Modelldurchlauf) — ein einzelner falscher Satz liess sich nicht
   * herausnehmen. Jetzt liegt je Pfad der volle Wortlaut in p.texte_voll,
   * die gestrichenen Satznummern in p.texte_strich, und p.texte (die Quelle
   * des Drucks) wird daraus neu zusammengesetzt. Ein Klick streicht den
   * Satz, ein zweiter holt ihn zurueck. */

  const PFAD_TITEL = {
    kap2_einleitung: "Kapitel 2, Beschreibung des Objekts",
    kap2_geometrie: "Kapitel 2, Warum die Geometrie belastbar ist",
    kap2_nicht_belegt: "Kapitel 2, Was nicht aus Unterlagen stammt",
    kap6_bewertung: "Kapitel 6, Einordnung der Zonentemperaturen",
  };

  function pfadTitel(pfad) {
    if (PFAD_TITEL[pfad]) return PFAD_TITEL[pfad];
    let m = /^kap1_punkte\.(\d+)\.(kern|text)$/.exec(pfad);
    if (m) {
      return "Kapitel 1, Punkt " + (Number(m[1]) + 1) + ", "
        + (m[2] === "kern" ? "Kernaussage" : "Begründung");
    }
    m = /^offene_punkte\.(.+)$/.exec(pfad);
    if (m) return "Kapitel 8, Begründung zu „" + m[1] + "“";
    return pfad;
  }

  /** Liest den Text unter einem Pfad aus p.texte (Gegenstück zu setzen()). */
  function textAusPfad(p, pfad) {
    const t = (p && p.texte) || {};
    const teile = String(pfad).split(".");
    if (teile[0] === "kap1_punkte") {
      const e = (t.kap1_punkte || [])[Number(teile[1])];
      return e ? e[teile[2]] : undefined;
    }
    let x = t;
    for (let i = 0; i < teile.length; i++) {
      if (x == null || typeof x !== "object") return undefined;
      x = x[teile[i]];
    }
    return x;
  }

  /** Alle Pfade, unter denen in p.texte ein Absatz steht. */
  function alleTextPfade(p) {
    const t = (p && p.texte) || {};
    const raus = [];
    (Array.isArray(t.kap1_punkte) ? t.kap1_punkte : []).forEach(function (x, i) {
      if (x && String(x.kern || "").trim()) raus.push("kap1_punkte." + i + ".kern");
      if (x && String(x.text || "").trim()) raus.push("kap1_punkte." + i + ".text");
    });
    ["kap2_einleitung", "kap2_geometrie", "kap2_nicht_belegt", "kap6_bewertung"]
      .forEach(function (k) {
        if (typeof t[k] === "string" && t[k].trim()) raus.push(k);
      });
    Object.keys(t.offene_punkte || {}).forEach(function (k) {
      if (String(t.offene_punkte[k] || "").trim()) raus.push("offene_punkte." + k);
    });
    return raus;
  }

  /** Der volle Wortlaut eines Pfads — auch fuer Absaetze, die vor dieser
   *  Fassung uebernommen wurden und noch kein texte_voll haben. */
  function vollerText(p, pfad) {
    const v = (p && p.texte_voll) || {};
    if (typeof v[pfad] === "string") return v[pfad];
    const t = textAusPfad(p, pfad);
    return typeof t === "string" ? t : undefined;
  }

  /** Baut p.texte[pfad] aus dem vollen Wortlaut minus Streichungen neu. */
  function streichungAnwenden(p, pfad) {
    const voll = vollerText(p, pfad);
    if (typeof voll !== "string") return;
    const weg = (p.texte_strich || {})[pfad] || [];
    const rest = saetze(voll).filter(function (x, i) {
      return weg.indexOf(i) < 0; }).map(function (x) { return x.text; });
    setzen(p, pfad, rest.join(" "));
  }

  function satzStreichen(p, pfad, i) {
    /* Ein Absatz aus einer aelteren Uebernahme kennt sein texte_voll noch
       nicht — der aktuelle Stand IST dann der volle Wortlaut. */
    p.texte_voll = p.texte_voll || {};
    if (typeof p.texte_voll[pfad] !== "string") {
      const t = vollerText(p, pfad);
      if (typeof t !== "string") return;
      p.texte_voll[pfad] = t;
    }
    p.texte_strich = p.texte_strich || {};
    const liste = p.texte_strich[pfad] = p.texte_strich[pfad] || [];
    const wo = liste.indexOf(i);
    if (wo >= 0) liste.splice(wo, 1); else liste.push(i);
    streichungAnwenden(p, pfad);
  }

  /** Die Karte der uebernommenen Absaetze, jeder Satz einzeln streichbar. */
  function uebernommeneHtml(p) {
    const voll = {};
    alleTextPfade(p).forEach(function (k) {
      const t = vollerText(p, k);
      if (typeof t === "string" && t.trim()) voll[k] = t;
    });
    /* Auch ein ganz gestrichener Absatz bleibt sichtbar (alle Saetze
       durchgestrichen), sonst ist er nicht zurueckzuholen. */
    Object.keys((p && p.texte_voll) || {}).forEach(function (k) {
      const t = p.texte_voll[k];
      if (typeof t === "string" && t.trim() && !(k in voll)) voll[k] = t;
    });
    const pfade = Object.keys(voll);
    if (!pfade.length) return "";
    const strich = (p.texte_strich || {});
    let h = '<div style="margin-top:14px">'
      + "<h3 style=\"margin:0 0 4px\">Übernommene Absätze</h3>"
      + '<p class="hinweis" style="margin:0 0 8px">Sie stehen so im Bericht. '
      + "Ein Klick auf „streichen“ nimmt den einzelnen Satz aus dem Bericht "
      + "heraus, ein zweiter holt ihn zurück; der Rest des Absatzes bleibt.</p>";
    pfade.forEach(function (pfad) {
      const weg = strich[pfad] || [];
      h += '<div style="margin:0 0 10px;padding:8px 10px;border:1px solid var(--linie);'
        + 'border-radius:8px">'
        + '<b style="font-size:12.5px">' + e2(pfadTitel(pfad)) + "</b><br>"
        + saetze(voll[pfad]).map(function (s, i) {
            const gestrichen = weg.indexOf(i) >= 0;
            return '<span style="' + (gestrichen
                ? "text-decoration:line-through;color:var(--mute)" : "") + '">'
              + e2(s.text) + "</span> "
              + '<button class="btn klein" data-aktion="bewertungSatz" '
              + 'data-bew-satz="' + e2(pfad) + "|" + i + '" '
              + 'style="font-size:11px;padding:1px 7px;vertical-align:baseline">'
              + (gestrichen ? "zurückholen" : "streichen") + "</button> ";
          }).join("")
        + "</div>";
    });
    return h + "</div>";
  }

  /** Text mit rot markierten, unbelegten Zahlen. */
  function markiert(feld) {
    let h = e2(feld.text);
    feld.unbekannt.forEach(function (z) {
      /* Die Marke traegt die Einheit mit ("20 cm"). Steht im Text ein
         geschuetztes Leerzeichen dazwischen, greift sie nicht; dann wird
         wenigstens die Zahl hervorgehoben. */
      const roh = e2(String(z).split(" ")[0]);
      const ziel = h.indexOf(e2(z)) >= 0 ? e2(z) : roh;
      h = h.split(ziel).join('<span style="background:#FBE9E7;color:#B00020;'
        + 'font-weight:600">' + ziel + "</span>");
    });
    return h;
  }

  function aktion(name, el) {
    switch (name) {
      case "bewertungErzeugen": erzeugen(); return true;
      case "bewertungSatz": {
        const roh = el && el.dataset ? String(el.dataset.bewSatz || "") : "";
        const trenn = roh.lastIndexOf("|");
        if (trenn < 0) return true;
        const pfad = roh.slice(0, trenn);
        const i = Number(roh.slice(trenn + 1));
        if (!Number.isFinite(i)) return true;
        satzStreichen(window.App.p, pfad, i);
        window.render();
        return true;
      }
      case "bewertungUebernehmen": {
        if (!S.ergebnis) return true;
        const auch = Object.keys(S.trotzdem).filter(function (k) { return S.trotzdem[k]; });
        const n = uebernehmen(S.ergebnis.pruefung, window.App.p, auch);
        S.ergebnis = null;
        window.render();
        melde("Sie stehen jetzt in den Kapiteln 1, 2, 6 und 8 und sind vor der "
          + "Freigabe zu lesen.",
          { stufe: "gut", titel: n + " Absätze in den Bericht übernommen" });
        return true;
      }
      case "bewertungVerwerfen": S.ergebnis = null; return true;
      default: return false;
    }
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("change", function (ev) {
      const t = ev.target;
      if (t && t.dataset && t.dataset.bewtrotzdem) {
        S.trotzdem[t.dataset.bewtrotzdem] = !!t.checked;
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 7  Selbsttest
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const fh = [];
    const pruefe = (bed, txt) => { if (!bed) fh.push(txt); };
    let n = 0;

    /* --- T1  Zahlensuche im deutschen Format --------------------------- */
    n++;
    pruefe(zahlenAus("Die Last liegt bei 9,04 kW und 1.661 W.").join("|")
      === "9,04|1.661", "T1 deutsche Zahlen nicht richtig gefunden");
    n++;
    pruefe(zahlenAus("bei -9,6 °C").join("|") === "-9,6",
      "T1 negative Zahl nicht gefunden");

    /* --- T2  Normbezeichnungen zaehlen nicht als Messwert -------------- */
    n++;
    pruefe(zahlenAus("nach DIN EN 12831-1:2017-09 gerechnet").length === 0,
      "T2 Normbezeichnung wird als Zahl gelesen");
    n++;
    pruefe(zahlenAus("Umlage nach § 559 BGB").length === 0,
      "T2 Paragraf wird als Zahl gelesen");

    /* --- T3  Rundung ist erlaubt, Erfindung nicht ---------------------- */
    const paket = {
      ergebnis: { gebaeudeheizlast: "9,04 kW", norm_aussentemperatur: "-9,6 °C" },
      bauteilbilanz: [{ name: "Dachschräge", flaeche: "27,1 m²",
                        waermestrom: "1.661 W", anteil_transmission: "25,8 Prozent" }],
    };
    const erl = erlaubteZahlen(paket);
    const eh = erlaubteEinheiten(paket);
    n++;
    pruefe(pruefeText("rd. 27 m² und 1.661 W", erl, eh).length === 0,
      "T3 zulaessige Rundung wurde beanstandet");
    n++;
    pruefe(pruefeText("rund 1.700 W", erl, eh).join("|") === "1.700 W",
      "T3 erfundene Zahl wurde nicht beanstandet");
    n++;
    pruefe(pruefeText("bei 9,6 °C", erl, eh).length === 0,
      "T3 Betrag einer negativen Zahl muss zulaessig sein");
    n++;
    pruefe(pruefeText("bei 9,05 kW", erl, eh).join("|") === "9,05 kW",
      "T3 knapp danebenliegende Zahl wurde nicht beanstandet");

    /* --- T3b  Die Einheit ist der zweite Schluessel -------------------- */
    n++;
    pruefe(eh.indexOf("m²") >= 0 && eh.indexOf("cm") < 0,
      "T3b Einheiten des Pakets falsch erkannt: " + eh.join(","));
    n++;
    /* 27 trifft die Flaeche 27,1. Mit "cm" dahinter ist die Aussage
       trotzdem erfunden, denn im Paket steht keine einzige cm-Angabe. */
    pruefe(pruefeText("mit 27 cm gedämmt", erl, eh).join("|") === "27 cm",
      "T3b erfundene Einheit wurde nicht beanstandet");
    n++;
    pruefe(pruefeText("in rund 27 Jahren", erl, eh).join("|") === "27 Jahren",
      "T3b Amortisationsangabe wurde nicht beanstandet");
    n++;
    pruefe(pruefeText("rd. 27 m²", erl, eh).length === 0,
      "T3b bekannte Einheit darf nicht beanstandet werden");
    n++;
    /* Ohne Wortgrenze liest die Einheitensuche das "a" von "auf" und das
       "m" von "mit" als Einheit und verwirft saubere Saetze. */
    pruefe(zahlenMitEinheit("von 27,1 auf 1.661 mit 25,7 Prozent")
      .map(function (x) { return x.einheit; }).join("|") === "||Prozent",
      "T3b eine Einheit muss an einer Wortgrenze enden");

    /* --- T3c  Herkunftsangaben liefern keine zulaessigen Zahlen -------- */
    n++;
    const mitQuelle = { offene_punkte: [{ schluessel: "bt_demo_19",
      herkunft_alternative: "BEG EM, Fassung 10.07.2026", wirkung: "1,47 kW" }] };
    const erlQ = erlaubteZahlen(mitQuelle);
    pruefe(pruefeText("um 1,47 kW", erlQ).length === 0
      && pruefeText("im Jahr 2026", erlQ).length === 1,
      "T3c Zahlen aus Herkunftsangaben duerfen nicht zulaessig werden");

    /* --- T4  Feldpruefung, Laenge und Schluessel ----------------------- */
    const erg = {
      kap1_punkte: [{ kern: "Die Dachschräge ist der größte Posten.",
                      text: "Sie führt 1.661 W ab, das sind 25,8 Prozent." }],
      kap6_bewertung: "x".repeat(MAX.kap6_bewertung + 5),
      offene_punkte: [{ schluessel: "bt_1", warum: "Wirkt mit 27,1 m² auf das Ergebnis." },
                      { schluessel: "gibt_es_nicht", warum: "Erfunden." }],
    };
    const pk = Object.assign({ offene_punkte: [{ schluessel: "bt_1" }] }, paket);
    const pr = pruefeZahlen(erg, pk);
    n++;
    pruefe(pr.felder.length === 5, "T4 nicht alle Felder geprueft, sondern "
      + pr.felder.length);
    n++;
    pruefe(pr.felder.filter(function (x) { return x.zu_lang; }).length === 1,
      "T4 zu langer Text nicht erkannt");
    n++;
    pruefe(pr.fremde_schluessel.join("|") === "gibt_es_nicht",
      "T4 fremder Schluessel nicht erkannt");
    n++;
    pruefe(pr.beanstandet === 1, "T4 genau ein Feld muss beanstandet sein, es sind "
      + pr.beanstandet);

    /* --- T5  Uebernahme landet an den richtigen Stellen ---------------- */
    const p = {};
    const anzahl = uebernehmen(pr, p);
    n++;
    pruefe(anzahl === 4, "T5 vier saubere Felder erwartet, uebernommen: " + anzahl);
    n++;
    pruefe(p.texte.kap1_punkte.length === 1
      && /Dachschräge/.test(p.texte.kap1_punkte[0].kern),
      "T5 Kapitel-1-Punkt nicht richtig abgelegt");
    n++;
    pruefe(p.texte.offene_punkte && p.texte.offene_punkte.bt_1,
      "T5 Begruendung nicht unter ihrem Schluessel abgelegt");
    n++;
    pruefe(!p.texte.kap6_bewertung,
      "T5 der beanstandete Text darf nicht uebernommen werden");
    n++;
    const p2 = {};
    uebernehmen(pr, p2, ["kap6_bewertung"]);
    pruefe(!!p2.texte.kap6_bewertung,
      "T5 ausdrueckliche Freigabe eines beanstandeten Textes wirkt nicht");

    /* --- T6  Die Kernaussage traegt, die Begruendung ist Zugabe --------
     * BIS ZUM 26.08.2026 galt hier das Gegenteil: ein Punkt ohne
     * Begruendung wurde geworfen ("lieber zwei Punkte als einen halben").
     * Gemessen an "Hasenberg 10" hat genau diese Regel den Kundenbericht um
     * seine einzige Annahmen-Aussage gebracht: die Begruendung enthielt zwei
     * unbelegte Jahreszahlen und wurde zu Recht beanstandet -- und mit ihr
     * verschwand die freigegebene Kernaussage "Der U-Wert der Aussenwand ist
     * eine Typologie-Annahme und nicht am Gebaeude gemessen". Eine
     * Kernaussage ist ein vollstaendiger Satz; sie bleibt.
     * Was WEITER faellt: ein Punkt ohne Kernaussage (er begruendet nichts)
     * und ein durch Index-Auffuellen entstandener leerer Punkt. */
    n++;
    const p3 = {};
    uebernehmen({ felder: [{ pfad: "kap1_punkte.0.kern", text: "Nur die Überschrift.",
                             ok: true }] }, p3);
    pruefe((p3.texte.kap1_punkte || []).length === 1
      && p3.texte.kap1_punkte[0].kern === "Nur die Überschrift.",
      "T6 eine freigegebene Kernaussage bleibt auch ohne Begruendung stehen");
    n++;
    const p3b = {};
    uebernehmen({ felder: [{ pfad: "kap1_punkte.2.text", text: "Nur eine Begründung.",
                             ok: true }] }, p3b);
    pruefe((p3b.texte.kap1_punkte || []).length === 0,
      "T6 eine Begruendung ohne Kernaussage und die leeren Auffuellpunkte fallen");

    /* --- T7  Kostenrahmen ---------------------------------------------- */
    n++;
    const k = kostenrahmen(paket);
    pruefe(k.kosten_usd > 0 && k.kosten_usd < 0.2,
      "T7 Kostenvorschau unplausibel: " + k.kosten_usd);
    n++;
    pruefe(k.dauer_s > 5 && k.dauer_s < 60,
      "T7 Dauervorschau unplausibel: " + k.dauer_s);
    n++;
    pruefe(kostenrahmen(null).eingabe_token === SYSTEMPROMPT_TOKEN,
      "T7 leeres Paket muss nur den Systemprompt kosten");

    /* --- T8  Ohne Rechenhilfen kein Paket, aber auch kein Absturz ------ */
    n++;
    pruefe(daten(null, null, null) === null, "T8 daten() ohne Eingaben muss null liefern");

    /* --- T9  Der Projektzustand ist die harte Schranke ------------------
     * Der Fall vom 24.08.2026, nachgestellt: das Raumbuch fuehrt KG KELLER
     * und KG FLUR beheizt (20 °C, 431/495 W), der Absatz behauptet
     * "Unbeheizt sind das Kellergeschoss, soweit unterkellert". Keine Zahl
     * ist falsch — die Behauptung ist es. */
    const p9 = { zonen: [], plangebaeude: {} };
    const e9 = { raeume: [
      { geschoss: "KG", raum: "KELLER", theta_i: 20, phi_raum: 431 },
      { geschoss: "KG", raum: "FLUR", theta_i: 20, phi_raum: 495 },
      { geschoss: "EG", raum: "WOHNEN", theta_i: 20, phi_raum: 900 },
    ] };
    const z9 = zustandAusProjekt(p9, e9);
    n++;
    const k9 = pruefeZustandText("Das Gebäude ist voll unterkellert. Unbeheizt "
      + "sind das Kellergeschoss, soweit unterkellert, und der Spitzboden.", z9);
    pruefe(k9.length >= 1 && /KELLER/.test(k9.join(" ")) && /431/.test(k9.join(" ")),
      "T9 der Widerspruch beheizter Keller/Absatz unbeheizt wird nicht gefunden: "
        + JSON.stringify(k9));
    n++;
    pruefe(pruefeZustandText("Unbeheizt ist allein der Spitzboden über dem "
      + "Obergeschoss.", z9).length === 0,
      "T9 ein Absatz ohne widerlegte Behauptung darf nicht anschlagen");
    n++;
    pruefe(pruefeZustandText("Beheizt sind EG und OG, unbeheizt der Keller.",
      z9).length === 1,
      "T9 gemischte Saetze: die naechste Marke traegt die Behauptung");
    n++;
    pruefe(pruefeZustandText("Das Kellergeschoss ist nicht beheizt.", z9).length === 1,
      "T9 'nicht beheizt' ist dieselbe Behauptung wie 'unbeheizt'");
    n++;
    const z9b = zustandAusProjekt({ zonen: [{ name: "Spitzboden über dem OG" }] },
      { raeume: [{ geschoss: "EG", raum: "WOHNEN", theta_i: 20, phi_raum: 900 }] });
    pruefe(pruefeZustandText("Das Dachgeschoss ist beheizt.", z9b).length === 1,
      "T9 ein als Zone gefuehrter Bereich darf nicht beheizt genannt werden");
    n++;
    /* Und als harte Sperre durch die ganze Kette: pruefeZahlen -> felder ->
       uebernehmen. Auch die ausdrueckliche Freigabe ("auch") darf sie nicht
       oeffnen. */
    const erg9 = { kap2_einleitung: "Unbeheizt sind das Kellergeschoss und "
      + "der Spitzboden." };
    const pr9 = pruefeZahlen(erg9, {}, z9);
    pruefe(pr9.felder.length === 1 && pr9.felder[0].sperre === true
      && pr9.felder[0].ok === false,
      "T9 die Zustandssperre muss im Pruefergebnis stehen");
    n++;
    const p9z = {};
    const n9 = uebernehmen(pr9, p9z, ["kap2_einleitung"]);
    pruefe(n9 === 0 && !(p9z.texte && p9z.texte.kap2_einleitung),
      "T9 eine Zustandssperre kennt kein 'trotzdem uebernehmen'");
    n++;
    /* Die Zahlenpruefung haette den Satz nie gefangen — genau deshalb gibt
       es die Zustandspruefung. Gegenprobe: ohne zustand laeuft er durch. */
    const pr9o = pruefeZahlen(erg9, {});
    pruefe(pr9o.felder[0].ok === true,
      "T9 Gegenprobe: ohne Zustandspruefung liefe der Satz durch — die "
        + "Sperre ist also wirklich die neue Schranke");

    /* --- T10  Satzweises Streichen nach der Uebernahme ------------------ */
    n++;
    const p10 = {};
    const pr10 = pruefeZahlen({ kap2_einleitung: "Erster Satz. Zweiter Satz. "
      + "Dritter Satz." }, {});
    uebernehmen(pr10, p10);
    pruefe(p10.texte_voll && /Erster Satz/.test(p10.texte_voll.kap2_einleitung || ""),
      "T10 die Uebernahme muss den vollen Wortlaut fuer das Streichen merken");
    n++;
    satzStreichen(p10, "kap2_einleitung", 1);
    pruefe(p10.texte.kap2_einleitung === "Erster Satz. Dritter Satz.",
      "T10 ein gestrichener Satz muss aus dem Drucktext fallen: "
        + JSON.stringify(p10.texte.kap2_einleitung));
    n++;
    satzStreichen(p10, "kap2_einleitung", 1);
    pruefe(p10.texte.kap2_einleitung === "Erster Satz. Zweiter Satz. Dritter Satz.",
      "T10 der zweite Klick holt den Satz zurueck");
    n++;
    const h10 = uebernommeneHtml(p10);
    pruefe(/bewertungSatz/.test(h10) && /streichen/.test(h10),
      "T10 die Karte der uebernommenen Absaetze bietet das Streichen an");
    n++;
    /* Ein Absatz aus einer aelteren Uebernahme (nur p.texte, kein voll). */
    const p10b = { texte: { kap6_bewertung: "Satz eins. Satz zwei." } };
    satzStreichen(p10b, "kap6_bewertung", 0);
    pruefe(p10b.texte.kap6_bewertung === "Satz zwei.",
      "T10 auch ein alt uebernommener Absatz muss streichbar sein");

    /* --- fehlt(): erkennt der Bericht, dass die Absätze fehlen? --------- */
    n += 5;
    pruefe(fehlt({}) === true, "leeres Projekt: Absätze fehlen");
    pruefe(fehlt({ texte: { kap1_punkte: [] } }) === true, "leere Liste: fehlen");
    /* Seit dem 26.08.2026 traegt die Kernaussage allein (siehe T6). */
    pruefe(fehlt({ texte: { kap1_punkte: [{ kern: "A", text: "" }] } }) === false,
      "eine Kernaussage ohne Begruendung zaehlt als vorhanden");
    pruefe(fehlt({ texte: { kap1_punkte: [{ kern: "", text: "B" }] } }) === true,
      "eine Begruendung ohne Kernaussage zaehlt nicht");
    pruefe(fehlt({ texte: { kap1_punkte: [{ kern: "A", text: "B" }] } }) === false,
      "vollständiger Punkt zählt");

    return { ok: fh.length === 0, fehler: fh, anzahl: n };
  }

  const API = {
    daten: daten, kostenrahmen: kostenrahmen, pruefeZahlen: pruefeZahlen,
    zahlenAus: zahlenAus, zahlenMitEinheit: zahlenMitEinheit,
    erlaubteZahlen: erlaubteZahlen, erlaubteEinheiten: erlaubteEinheiten,
    pruefeText: pruefeText,
    zustandAusProjekt: zustandAusProjekt, pruefeZustandText: pruefeZustandText,
    saetze: saetze, satzStreichen: satzStreichen,
    uebernommeneHtml: uebernommeneHtml,
    uebernehmen: uebernehmen, erzeugen: erzeugen, fehlt: fehlt,
    knopf: knopf, html: html, aktion: aktion, zustand: S,
    MAX: MAX, selbsttest: selbsttest,
  };
  if (typeof window !== "undefined") window.MODUL_BEWERTUNG = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
