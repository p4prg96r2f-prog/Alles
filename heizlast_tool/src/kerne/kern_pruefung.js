/* ===========================================================================
 * kern_pruefung.js — Selbstprüfung des Werkzeugs
 * ===========================================================================
 * Prüft jedes Ergebnis gegen unabhängige Erwartungswerte und meldet, was
 * nicht zusammenpasst. Grundgedanke: eine Rechnung, die nur in sich stimmig
 * ist, kann trotzdem falsch sein. Deshalb wird gegen eine zweite, unabhängige
 * Quelle gerechnet (Typologie-Kennwert aus dem Baujahr) und die Geometrie
 * auf sich selbst zurückgeführt.
 *
 * Stufen:  fehler      verhindert eine belastbare Aussage
 *          offen       Frage, die nur ein Mensch am Plan beantworten kann
 *          hinweis     Einordnung zur Kenntnis — kein Mangel
 *          bestaetigt  vom Bearbeiter zur Kenntnis genommen
 *          gut         geprüft und unauffällig
 *
 * Die frühere Mittelstufe "warnung" gibt es nach außen nicht mehr
 * (Kundenwort 25.08.2026, Sebastian Hund): was kein Fehler ist, ist ein
 * HINWEIS — eine Information, keine Beanstandung; die Einordnung trifft
 * der Unterzeichner des Berichts. Zulieferer (eigene Prüfungen,
 * Kontrollblatt-Zähler, Klimaprüfung) dürfen intern weiter "warnung" als
 * Dringlichkeit führen; in pruefeAlles, der EINEN Stelle, an der Ampel
 * und Zähler entstehen, wird daraus die Stufe "hinweis". Fehler, Sperren
 * und offene Fragen bleiben unberührt.
 *
 * Eine Bestätigung ist kein Wegklicken. Der Bearbeiter unterschreibt den
 * Bericht; nimmt er einen Befund zur Kenntnis, ist das sein Fachurteil, und
 * das Werkzeug hat ihm zu folgen. Der Befund bleibt vollständig sichtbar und
 * wandert mit Zeitpunkt, Namen und Vermerk in den Bericht, verliert aber die
 * Sperrwirkung.
 *
 * Die Ampel entsteht AUSSCHLIESSLICH hier. Die Zähler des Kontrollblatts
 * werden über opt.kontrollblatt eingesammelt und mitgezählt, damit dieselbe
 * Zahl nicht an zwei Stellen mit zwei Ergebnissen gerechnet wird.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_PRUEFUNG = M;
})(this, function () {

  const z = (x, d) => (Number.isFinite(x) ? x : (d === undefined ? 0 : d));
  const f1 = (x) => Math.round(x * 10) / 10;
  /* Zahl mit Hauptwort in der richtigen Zahlform. „1 Räume", „1 Seiten":
     ein Zähler, der nicht zählen kann, macht misstrauisch gegen jede
     andere Zahl auf dem Blatt. mz(1, "Raum", "Räume") -> "1 Raum". */
  const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);
  const f0 = (x) => Math.round(x);
  const f2 = (x) => Math.round(x * 100) / 100;

  /** Eine einzelne Prüfung */
  function P(id, titel, stufe, text, zahl) {
    return { id: id, titel: titel, stufe: stufe, text: text, zahl: zahl || null };
  }

/* ORTSZEIT, NICHT WELTZEIT. toISOString() liefert UTC: eine Ablehnung um
     15:29 MESZ wurde als "2026-08-26 13:29" vermerkt und wanderte so in den
     Bericht, der auf derselben Seite lokal datiert ist (Prueflaeufe vom
     26.08.2026, alle fuenf Plaene). Die Form bleibt sortierbar
     (JJJJ-MM-TT hh:mm) — sie wird an anderer Stelle wieder ausgelesen —,
     nur die Uhr ist jetzt die des Bearbeiters. */
  function jetzt() {
    const d = new Date();
    const z = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-"
      + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
  }

  /* ---------------------------------------------------------------------
   * 0  Bestätigungen des Bearbeiters
   * ---------------------------------------------------------------------
   * Ablage: p.kontrollblatt.aufgehoben[<befund-id>]. Früher stand dort ein
   * reiner Begründungstext; dieses Format wird weiter gelesen. Neu ist ein
   * Eintrag mit Zeitpunkt und Namen, denn eine Bestätigung ohne Datum und
   * ohne Person ist im Bericht wertlos.
   * ------------------------------------------------------------------ */
  function bestaetigungen(p) {
    const roh = (p && p.kontrollblatt && p.kontrollblatt.aufgehoben) || {};
    const raus = {};
    Object.keys(roh).forEach(function (k) {
      const v = roh[k];
      if (v === null || v === undefined || v === false) return;
      raus[k] = (typeof v === "object")
        ? { grund: String(v.grund || ""), zeit: String(v.zeit || ""), wer: String(v.wer || "") }
        : { grund: String(v), zeit: "", wer: "" };
    });
    return raus;
  }

  /** Trägt eine Bestätigung ein. Ein Klick genügt; ein Vermerk ist erlaubt,
   *  aber nur dort verlangt, wo die Zeile eine echte Sperre ist. */
  function bestaetigungEintragen(p, id, opt) {
    const o = opt || {};
    const g = String(o.grund == null ? "" : o.grund).trim();
    if (o.grund_pflicht && g.length < 10) {
      return { ok: false, grund: "Begründung zu kurz" };
    }
    if (!p.kontrollblatt) p.kontrollblatt = {};
    if (!p.kontrollblatt.aufgehoben) p.kontrollblatt.aufgehoben = {};
    const e = { grund: g, zeit: String(o.zeit || jetzt()),
                wer: String(o.wer == null ? "" : o.wer).trim() };
    p.kontrollblatt.aufgehoben[id] = e;
    return { ok: true, eintrag: e };
  }

  function bestaetigungZuruecknehmen(p, id) {
    if (p && p.kontrollblatt && p.kontrollblatt.aufgehoben) {
      delete p.kontrollblatt.aufgehoben[id];
    }
    return { ok: true };
  }

  /** Wendet eine Bestätigung auf einen Befund an. Der Text bleibt stehen und
   *  bekommt den Vermerk angehängt, damit im Bericht nachvollziehbar ist,
   *  wer was wann beurteilt hat. */
  function bestaetigungAnwenden(z, e) {
    if (!z || !e || z.bestaetigt) return z;
    z.bestaetigt = e;
    z.stufe_vorher = z.stufe;
    z.stufe = "bestaetigt";
    /* Der angehaengte Satz wird an zwei Orten gelesen: im Kontrollblatt und
       im Bericht. Er darf deshalb nicht ueber den Bericht sprechen ("Der
       Vermerk erscheint im Bericht") — im Bericht selbst stand damit ein
       Satz, der auf sich selbst zeigt. Er nennt jetzt nur noch, wer wann
       was beurteilt hat. */
    z.text = String(z.text || "") + " Zur Kenntnis genommen"
      + (e.wer ? " von " + e.wer : "") + (e.zeit ? " am " + e.zeit : "") + "."
      + (e.grund ? " Vermerk: " + e.grund : "");
    return z;
  }

  /** Auf eine ganze Liste. Bereits bestätigte Zeilen bleiben unangetastet,
   *  damit die Anwendung mehrfach laufen darf. */
  function bestaetigungenAnwenden(p, liste) {
    const b = bestaetigungen(p);
    (liste || []).forEach(function (z) {
      if (z.stufe === "gut" || z.bestaetigt) return;
      /* alt_id: die frühere, indexgebundene Kennung derselben Zeile — unter
         ihr liegen Bestätigungen bereits gespeicherter Projekte. Seit dem
         24.08.2026 sind die Kennungen der offenen Fragen aus dem Text
         abgeleitet (modul_kontrollblatt.frageKennung); ohne diesen
         Nachschlag stünde jeder dort schon abgenickte Punkt wieder auf. */
      const e = b[z.id] || (z.kb_id ? b[z.kb_id] : null)
        || (z.alt_id ? b[z.alt_id] : null);
      if (e) bestaetigungAnwenden(z, e);
    });
    return liste;
  }

  /** Der Stand der Bestätigungen als fertige Auskunft: von wem, wann
   *  zuletzt, an wie vielen Tagen, und wie viele Punkte einen Vermerk
   *  tragen. Der Bericht soll das abholen und nichts nachrechnen; sonst
   *  entstehen zwei Zählungen derselben Sache, die auseinanderlaufen.
   *  Erfunden wird nichts: fehlt ein Name oder ein Zeitpunkt, bleibt das
   *  Feld leer und der Bericht sagt entsprechend weniger. */
  function bestaetigungsstand(liste) {
    const namen = [], tage = [];
    let vermerke = 0;
    (liste || []).forEach(function (x) {
      const e = x && x.bestaetigt;
      if (!e) return;
      const w = String(e.wer || "").trim();
      if (w && namen.indexOf(w) < 0) namen.push(w);
      const t = String(e.zeit || "").slice(0, 10);
      if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t) && tage.indexOf(t) < 0) tage.push(t);
      if (String(e.grund || "").trim()) vermerke++;
    });
    tage.sort();
    const letzt = tage.length ? tage[tage.length - 1] : null;
    return {
      namen: namen, vermerke: vermerke, tage: tage.length,
      stand: letzt ? letzt.slice(8, 10) + "." + letzt.slice(5, 7) + "."
        + letzt.slice(0, 4) : null,
    };
  }

  /* ---------------------------------------------------------------------
   * 1  Vollständigkeit
   * ------------------------------------------------------------------ */
  /** Das Zuordnungsmodul, ausdrücklich übergeben oder aus dem Fenster.
   *  Wie bei der Maßstabsprobe gilt: eine ausdrückliche Angabe zählt, auch
   *  wenn sie null ist. Sonst urteilte der Selbsttest im nackten node-Prozess
   *  anders als im Browser, und der Bau meldete grün, was drüben rot war. */
  function zuordnungsmodul(o) {
    return (o && Object.prototype.hasOwnProperty.call(o, "zuordnung"))
      ? o.zuordnung
      : ((typeof window !== "undefined" && window.KERN_ZUORDNUNG) || null);
  }

  /* ---------------------------------------------------------------------
   * 1a  Angenommene Werte
   * ---------------------------------------------------------------------
   * Eine Annahme ist kein Fehler und keine Lücke: sie hat einen Wert, eine
   * Begründung und ein Feld daneben. Sie ist aber auch nicht nichts — die
   * Zahl im Kopf steht auf ihr. Deshalb eine eigene Zeile je Annahme, als
   * Warnung, mit ihrer Begründung im Wortlaut.
   *
   * Diese Zeilen tragen `annahme: true`. Daran hängt die Stufe der Ampel:
   * ein Ergebnis, dessen einzige offene Punkte ausgewiesene Annahmen sind,
   * ist nicht „mit Einschränkung belastbar" (das klingt nach einem Mangel),
   * sondern „belastbar unter genannten Annahmen". Der Unterschied ist keine
   * Beschönigung: die Annahmen stehen mit Namen und Zahl daneben. */
  function pruefeAnnahmen(p) {
    const an = (p && p.annahmen) || {};
    const r = [];
    Object.keys(an).forEach(function (k) {
      const a = an[k];
      if (!a) return;
      const z = (k === "baujahr_nicht")
        ? P("annahme_baujahr_offen", "Baujahr nicht ableitbar", "warnung", a.begruendung)
        : P("annahme_" + k, a.kurz || "Angenommener Wert", "warnung",
            a.begruendung + (a.richtung
              ? " Richtung des möglichen Fehlers: " + a.richtung : ""));
      z.annahme = true;
      r.push(z);
    });
    return r;
  }

  function pruefeVollstaendigkeit(p, o) {
    const r = [];
    /* ZWEI ARTEN VON PFLICHTANGABE, UND NUR EINE MACHT DIE ZAHL FALSCH.
     *
     * Hier standen sechs Angaben in einer Liste, und jede einzelne machte die
     * Ampel rot, also „nicht belastbar". Bei der Norm-Außentemperatur, dem
     * Baujahr, den Räumen und den Bauteilen stimmt das: ohne sie gibt es
     * keine Rechnung oder eine grob falsche. Bei der Objektbezeichnung und
     * der Quelle der Klimadaten stimmt es nicht — sie fehlen dem DOKUMENT,
     * nicht der Rechnung. Ein Bericht ohne Bezeichnung ist unvollständig;
     * seine Heizlast ist deswegen nicht um ein Watt anders.
     *
     * „Nicht belastbar" für eine fehlende Überschrift ist eine Unwahrheit im
     * Kopf des Kontrollblatts, und sie kostet das Vertrauen in jedes
     * berechtigte Rot. Die Trennung nimmt keiner Angabe ihre Sichtbarkeit:
     * beide Zeilen stehen in der Liste, beide im Bericht. */
    const fehltRechnung = [];
    const fehltDokument = [];
    /* BAUJAHR IST KEINE SPERRE MEHR, SOLANGE DER RÜCKFALL TRÄGT.
     *
     * Bis zum 25.08.2026 hielt ein fehlendes Baujahr die ganze Rechnung an:
     * keine Klasse, keine U-Werte, kein Bauteil, 0,00 kW und rote Ampel. Seit
     * daten_typologie.ohneBaujahr() greift, entstehen belegte Rückfallwerte
     * (Klasse 1969 bis 1978, gegengeprüft an BAnz AT 04.12.2020 B1), und die
     * Rechnung läuft. Ein Ergebnis, das auf ausgewiesenen Rückfallwerten
     * steht, ist nicht „nicht belastbar" — es ist belastbar unter genannten
     * Annahmen, und genau diese Stufe gibt es.
     *
     * Blockierend bleibt der Fall, in dem WEDER ein Baujahr NOCH ein Rückfall
     * vorliegt: dann fehlen die U-Werte wirklich. */
    const bjRueckfall = !!(p.annahmen
      && (p.annahmen.baujahr_klasse || p.annahmen.baujahr));
    const bjFehlt = !p.meta || !p.meta.baujahr;
    if (!p.klima || p.klima.theta_e == null) fehltRechnung.push("Norm-Außentemperatur");
    if (bjFehlt && !bjRueckfall) fehltRechnung.push("Baujahr");
    if (!(p.raeume || []).length) fehltRechnung.push("Räume");
    if (!(p.bauteiltypen || []).length) fehltRechnung.push("Bauteile");
    if (!p.meta || !p.meta.bezeichnung) fehltDokument.push("Objektbezeichnung");
    if (!p.klima || !p.klima.quelle) fehltDokument.push("Quelle der Klimadaten");
    r.push(fehltRechnung.length
      ? P("voll", "Pflichtangaben", "fehler",
          "Es fehlen: " + fehltRechnung.join(", ")
          + ". Ohne diese Angaben entsteht keine Heizlast oder eine grob falsche.")
      : P("voll", "Pflichtangaben", "gut",
          "Alle Angaben liegen vor, aus denen die Heizlast entsteht."));
    if (fehltDokument.length) {
      r.push(P("voll_dok", "Angaben für den Bericht", "warnung",
        "Es fehlen: " + fehltDokument.join(", ")
        + ". Die Rechnung steht davon unberührt; der Bericht bleibt ohne diese "
        + "Angaben unvollständig."));
    }

    /* Das fehlende Baujahr verschwindet nicht, es wechselt die Stufe: es hält
       die Freigabe nicht mehr auf, steht aber weiter mit Namen da, samt der
       Richtung des Fehlers. Nachtragen bleibt die beste Antwort. */
    if (bjFehlt && bjRueckfall) {
      r.push(P("voll_bj", "Baujahr nicht bekannt", "offen",
        "Gerechnet ist mit den Rückfallwerten der Baualtersklasse 1969 bis "
        + "1978. Ist das Gebäude älter und unsaniert, liegt die wirkliche "
        + "Heizlast höher als die gerechnete; ist es jünger oder saniert, "
        + "niedriger. Ein eingetragenes Baujahr ersetzt alle Rückfallwerte."));
    }

    /* ABGESCHNITTENER AUFTRAGGEBER — Befund der Hasenberg-Prüfung 25.08.2026:
       im Schriftfeld stand „Christina Herzog u. Markus …", gelesen wurde
       „Christina Herzog u." — und genau so stand es auf dem Titelblatt
       beider Berichtsfassungen. Ein Name, der auf einem Bindewort endet, ist
       erkennbar unvollständig; unterschreiben lässt sich das nicht. Was
       fehlt, weiß nur ein Mensch mit dem Plan — deshalb Stufe „offen", keine
       Annahme und kein stiller Eingriff: die gelesene Eingabe bleibt stehen,
       bis jemand sie vervollständigt. */
    const bauherr = String((p.meta && p.meta.bauherr) || "").trim();
    if (bauherr && /(?:\bu\.|\bund|&|\+|,)$/i.test(bauherr)) {
      r.push(P("bauherr_abgeschnitten", "Auftraggeber unvollständig", "offen",
        "Als Auftraggeber ist „" + bauherr + "“ eingetragen — der Name endet "
        + "auf einem Bindewort und ist damit erkennbar abgeschnitten (im "
        + "Schriftfeld steht meist ein zweiter Name dahinter). So stünde er "
        + "auf dem Titelblatt des Berichts. Bitte den vollständigen "
        + "Auftraggeber aus dem Schriftfeld eintragen."));
    }

    const ohneWe = (p.raeume || []).filter((x) => !x.we);
    if (ohneWe.length) {
      r.push(P("we", "Zuordnung zu Einheiten", "fehler",
        mz(ohneWe.length, "Raum ist", "Räume sind")
        + " keiner Wohn- oder Nutzungseinheit zugeordnet. "
        + "Ohne Zuordnung fehlt der Lüftungsberechnung der Bezug: "
        + ohneWe.slice(0, 5).map((x) => x.name).join(", ")
        + (ohneWe.length > 5 ? " und weitere" : "") + "."));
    } else if ((p.raeume || []).length) {
      r.push(P("we", "Zuordnung zu Einheiten", "gut", "Alle Räume sind zugeordnet."));
    }

    /* Räume ganz ohne Bauteil. Meist ist das eine vergessene Wand, und dann
       ist es ein Fehler. Für einen innenliegenden Nebenraum auf einem
       Zwischengeschoss ist es dagegen die Wahrheit — er grenzt rundum an
       beheizte Räume. KERN_ZUORDNUNG trifft die Unterscheidung, damit sie
       hier und im Kontrollblatt dieselbe ist. */
    const ohneBt = (p.raeume || []).filter((x) => !(x.bauteile || []).length);
    if (ohneBt.length) {
      const Z = zuordnungsmodul(o);
      const geschosse = [];
      (p.raeume || []).forEach(function (x) {
        if (x.geschoss && geschosse.indexOf(x.geschoss) < 0) geschosse.push(x.geschoss);
      });
      const erwartbar = [], unerwartet = [];
      ohneBt.forEach(function (x) {
        const zul = Z && Z.innenraumZulaessig
          ? Z.innenraumZulaessig(x, geschosse) : { ja: false };
        (zul.ja ? erwartbar : unerwartet).push(x);
      });
      if (unerwartet.length) {
        /* URSACHE VOR FOLGE.
         * Gemessen am Blatt „BV 2-0887 Ziolkowski": hier standen zwölf Räume
         * ohne Bauteil, und der Satz las sich, als sei zwölfmal etwas
         * vergessen worden. In Wahrheit war im ganzen Projekt kein einziges
         * Bauteil angelegt, weil ohne Baujahr keine Bauteiltypen mit U-Werten
         * entstehen und bauteileErgaenzen() ohne Bauteiltypen in seiner
         * ersten Zeile aussteigt. Der Zusatz sagt das; die Meldung selbst
         * bleibt unverändert ein Fehler. */
        const garNichts = (p.raeume || []).every((x) => !(x.bauteile || []).length);
        const ohneTypen = !((p.bauteiltypen || []).length);
        r.push(P("btzu", "Bauteile je Raum", "fehler",
          mz(unerwartet.length, "Raum hat", "Räume haben") + " kein einziges Bauteil: "
          + unerwartet.slice(0, 5).map((x) => x.name).join(", ") + "."
          + (garNichts
            ? " Es ist im ganzen Projekt kein Bauteil angelegt — das ist eine "
              + "Ursache und nicht zwölf einzelne Versäumnisse."
              + (ohneTypen
                ? ((p.meta && String(p.meta.baujahr || "").trim())
                  ? " Es fehlen die Bauteiltypen mit U-Werten."
                  : " Es fehlt das Baujahr; ohne Baujahr keine U-Werte, ohne "
                    + "U-Werte keine Bauteile, ohne Bauteile keine Heizlast.")
                : " Die Bauteile sind noch nicht gebildet worden.")
            : "")));
      }
      if (erwartbar.length) {
        /* Gleichnamige Räume unterscheidbar nennen: das Erdgeschoss von
           Dumach 1 hat drei Flure, und "Flur, Flur" ist keine Auskunft. */
        const wieOft = {};
        erwartbar.forEach(function (x) {
          const k = (x.geschoss || "") + "|" + (x.name || "");
          wieOft[k] = (wieOft[k] || 0) + 1;
        });
        const namen = erwartbar.slice(0, 5).map(function (x) {
          const k = (x.geschoss || "") + "|" + (x.name || "");
          return (x.geschoss ? x.geschoss + " " : "") + x.name
            + (wieOft[k] > 1 && x.A > 0
              ? " (" + (Math.round(x.A * 100) / 100).toFixed(2).replace(".", ",")
                + " m²)" : "");
        });
        /* Eine Feststellung, keine Warnung — und der Unterschied ist kein
           verschobener Maßstab, sondern eine Frage der Zuständigkeit.
           Der Satz „Am Plan prüfen, ob wirklich keine Außenwand dabei ist"
           stand hier auf jedem Projekt mit einem innenliegenden Flur, also
           auf fast jedem Haus, und war nie zu schließen. Er ist damit keine
           Prüfung, sondern eine Grenze — und Grenzen führt das Kontrollblatt,
           mit Namen, Begründung und dem Weg, der sie aufhebt
           (modul_kontrollblatt, Zähler Z6 und grenzen()). Zwei Module, die
           dieselbe Lage verschieden bewerten, sind zwei Wahrheiten; hier
           steht deshalb nur noch, was festgestellt wurde.
           Was weiterhin rot wird, steht unverändert darüber: ein Raum ohne
           Bauteil, der nach Raumart und Raumname eine Außenwand haben
           müsste. */
        r.push(P("btzu_innen", "Innenliegende Räume ohne Bauteil", "gut",
          mz(erwartbar.length, "Raum hat", "Räume haben") + " kein Bauteil: "
          + namen.join(", ") + ". "
          + (erwartbar.length === 1
            ? "Raumart und Raumname weisen ihn als innenliegenden Nebenraum aus"
            : "Raumart und Raumname weisen sie als innenliegende Nebenräume aus")
          + "; dann ist der Transmissionsanteil tatsächlich null und nur die "
          + "Lüftung bleibt. Das Kontrollblatt nennt den Fall unter „Räume ohne "
          + "Außenwand“."));
      }
    }
    return r;
  }

  /* ---------------------------------------------------------------------
   * 2  Quervergleich gegen den Typologie-Kennwert
   * ------------------------------------------------------------------ */
  function pruefeQuervergleich(p, e, typo) {
    if (!typo || !p.meta || !p.meta.baujahr || !e || !e.A_gesamt) return [];
    const art = p.meta.gebaeudeart || "efh";
    const roh = typo.erwarteteHeizlast(p.meta.baujahr, art);
    /* Ohne Erwartungswert unterbleibt der Vergleich -- aber nicht schweigend.
       Der Quervergleich ist die EINZIGE Probe, die auf einem anderen Weg
       entsteht als die Raumbilanz; faellt sie aus, muss das dastehen, sonst
       liest der Bearbeiter eine gruene Ampel, hinter der eine Prueferin
       weniger steht. Ausfallgruende: Neubau hinter dem Ende der Typologie
       und Nichtwohngebaeude. */
    if (!roh) {
      const tOhne = typo.zumBaujahr(p.meta.baujahr, art);
      const grund = !tOhne ? ""
        : tOhne.grund === "nichtwohngebaeude"
        ? "Für ein Nichtwohngebäude nennt eine Wohngebäudetypologie keinen "
          + "Kennwert. "
        : tOhne.grund === "ausserhalb_geltung"
        ? "Das Baujahr " + p.meta.baujahr + " liegt hinter dem Ende der "
          + "hinterlegten Gebäudetypologie (" + tOhne.geltung_bis + "). "
        : "";
      return [P("quer", "Quervergleich mit der Gebäudetypologie", "hinweis",
        grund
        + "Damit entfällt der unabhängige Erwartungswert: das Ergebnis ist nur "
        + "gegen sich selbst geprüft. Ein Vergleich mit einem ähnlichen, "
        + "gerechneten Objekt oder mit dem Nachweis nach GEG tritt an seine "
        + "Stelle und gehört in die Unterlagen.",
        { ist: e.A_gesamt > 0 ? e.phi_gebaeude / e.A_gesamt : null, erwartet: null })];
    }

    // Der Kennwert gilt für den unsanierten Bestand. Ist die Hülle nachweislich
    // besser als die Typologie, wird der Erwartungswert entsprechend gesenkt.
    // Näherung: die Heizlast folgt im Wesentlichen dem mittleren U-Wert der Hülle.
    const t = typo.zumBaujahr(p.meta.baujahr, art);
    let istAU = 0, typAU = 0, flaeche = 0;
    if (t) {
      const zuordnung = [
        { schluessel: "wand", muster: /wand|außenwand|aussenwand|giebel|drempel/i },
        { schluessel: "dach", muster: /dach|schräge|schraege|geschossdecke/i },
        { schluessel: "fenster", muster: /fenster|verglas/i },
        { schluessel: "kellerdecke", muster: /kellerdecke|boden/i },
        { schluessel: "tuer", muster: /tür|tuer/i },
      ];
      (e.raeume || []).forEach(function (r) {
        r.bauteile.forEach(function (b) {
          if (b.kat === "innen") return;
          const z = zuordnung.find(function (x) { return x.muster.test(b.name); });
          if (!z) return;
          const uTyp = t.u[z.schluessel];
          if (!uTyp) return;
          istAU += b.A * b.U;
          typAU += b.A * uTyp;
          flaeche += b.A;
        });
      });
    }
    const anteilErfasst = e.A_gesamt > 0 ? flaeche / (e.A_gesamt * 1.5) : 0;
    /* NIE-NaN (Kehrwoche 25.08.2026): istAU > 0 gehoert in die Bedingung.
       GEMESSEN am Fall "keine Bauteiltypen" (Bauteiltyp geloescht, Zuordnung
       aus dem Plan ohne Typ): dann ist JEDER U-Wert 0, also istAU = 0. Der
       Faktor wurde damit 0, der Erwartungswert roh * 0 = 0 -- und die
       Abweichung (ist - 0) / 0 * 100 = +Infinity. Im Bericht stand woertlich
       "Abweichung +Infinity %".
       Ohne einen einzigen U-Wert gibt es keinen Anhalt, den Kennwert der
       Typologie nach oben oder unten anzupassen. Der unsanierte Rohwert
       bleibt dann stehen, und die Zeile meldet die (richtige) grosse
       Unterschreitung -- das ist die gefaehrliche Richtung "zu klein" und
       muss sichtbar bleiben. */
    const hatBezug = typAU > 0 && istAU > 0 && anteilErfasst > 0.3;
    const faktor = hatBezug ? istAU / typAU : 1;
    const erwartet = roh * faktor;
    /* Bezugsfläche: Die Kennwerte der Gebäudetypologie sind auf die Wohnfläche
       bezogen. Wird stattdessen gegen die Summe der Raumflächen verglichen,
       fällt das Ergebnis systematisch zu günstig aus, im Referenzfall 43,9
       statt 56,5 W/m². Ohne angegebene Wohnfläche wird deshalb nicht
       verglichen, sondern der fehlende Bezug gemeldet. */
    /* Bezugsfläche: Die Kennwerte der Gebäudetypologie sind auf die Wohnfläche
       bezogen. Liegt sie vor, wird gegen sie verglichen. Sonst dient die Summe
       der Raumflächen als Bezug; sie liegt üblicherweise darüber, weshalb das
       Ergebnis dann günstiger ausfällt und die Toleranz erweitert wird. Der
       Bezug wird im Befund ausdrücklich genannt, damit niemand zwei
       verschiedene Größen für dieselbe hält. */
    const aufWohnflaeche = e.spez_wohnflaeche > 0;
    const ist = aufWohnflaeche ? e.spez_wohnflaeche : (e.phi_gebaeude / e.A_gesamt);
    const bezugstext = aufWohnflaeche
      ? "bezogen auf die Wohnfläche"
      : "bezogen auf die Summe der Raumflächen, da keine Wohnfläche angegeben ist; "
        + "der Kennwert der Typologie bezieht sich auf die Wohnfläche, die hier "
        + "üblicherweise kleiner ist";
    /* NIE-NaN (Kehrwoche 25.08.2026): zweites Netz unter der Division. Mit
       der Bedingung oben ist erwartet > 0 gesichert; sollte ein spaeterer
       Weg das wieder aufweichen, darf hier trotzdem KEINE Zahl entstehen,
       die sich als Prozentwert drucken laesst. Ein stiller Rueckfall auf 0
       waere hier das Schlimmste: "Abweichung +0 %" liest sich wie eine
       bestandene Pruefung. Deshalb sagt die Zeile stattdessen, dass sie
       nichts sagen kann -- wie schon der Fall ohne Kennwert weiter oben. */
    if (!(erwartet > 0) || !Number.isFinite(ist)) {
      return [P("quer", "Quervergleich mit der Gebäudetypologie nicht möglich",
        "hinweis",
        "Berechnet " + (Number.isFinite(ist) ? f1(ist) + " W/m²" : "kein Kennwert")
        + ", " + bezugstext + ". Aus der Gebäudetypologie ergibt sich für Baujahr "
        + p.meta.baujahr + " kein brauchbarer Erwartungswert, deshalb unterbleibt "
        + "der Vergleich. Damit entfällt der unabhängige Erwartungswert: das "
        + "Ergebnis ist nur gegen sich selbst geprüft. Ein Vergleich mit einem "
        + "ähnlichen, gerechneten Objekt oder mit dem Nachweis nach GEG tritt an "
        + "seine Stelle und gehört in die Unterlagen.",
        { ist: Number.isFinite(ist) ? ist : null, erwartet: null })];
    }
    const abw = (ist - erwartet) / erwartet * 100;

    let text = "Berechnet " + f1(ist) + " W/m², " + bezugstext + ". ";
    if (hatBezug && Math.abs(faktor - 1) > 0.05) {
      text += "Typologie-Kennwert für Baujahr " + p.meta.baujahr + " unsaniert "
        + f0(roh) + " W/m²; die eingetragenen Bauteile sind im Mittel "
        + (faktor < 1 ? "besser" : "schlechter") + " als die Typologie (Faktor "
        + (Math.round(faktor * 100) / 100).toFixed(2) + "), daraus angepasster Erwartungswert "
        + f0(erwartet) + " W/m². ";
    } else {
      text += "Typologie-Erwartungswert für Baujahr " + p.meta.baujahr + " unsaniert "
        + f0(erwartet) + " W/m². ";
    }
    text += "Abweichung " + (abw >= 0 ? "+" : "") + f0(abw) + " %.";
    /* WAS DER ERWARTUNGSWERT NICHT IST.
     *
     * Er ist ein bundesweiter Erfahrungswert je Baualtersklasse (IWU TABULA
     * 2015, verbrauchskalibrierter Ist-Zustand) und nennt KEINE
     * Norm-Außentemperatur, auf die er sich bezieht. Die gerechnete Heizlast
     * dagegen hängt linear an ihr: zwischen einem milden Standort mit
     * −8 °C und einem kalten mit −16 °C liegen bei 20 °C Innentemperatur
     * 28 gegen 36 Kelvin, also rund 29 Prozent. Ein Vergleich, der das
     * verschweigt, erzeugt in kalten Lagen Fehlalarme und in milden falsche
     * Ruhe. Deshalb steht die Temperatur, mit der gerechnet wurde, in der
     * Zeile — und dazu, dass der Kennwert keine dagegenhält. Die Schwellen
     * bleiben unverändert; eine Zahl, deren Bezug unbekannt ist, darf keine
     * Toleranz verschieben. */
    const te = p.klima && Number.isFinite(Number(p.klima.theta_e))
      ? Number(p.klima.theta_e) : null;
    if (te !== null) {
      text += " Gerechnet ist mit einer Norm-Außentemperatur von "
        + f1(te) + " °C. Der Kennwert der Typologie ist ein bundesweiter "
        + "Erfahrungswert und nennt keine Außentemperatur, auf die er sich "
        + "bezieht; er lässt sich auf den Standort deshalb nicht umrechnen. "
        + "Ein Teil jeder Abweichung geht auf diesen fehlenden Bezug zurück.";
    }

    /* Ohne Wohnflächenbezug ist der Vergleich unschärfer, deshalb weitere Grenzen. */
    const grenzeWarnung = aufWohnflaeche ? 50 : 65;
    const grenzeHinweis = aufWohnflaeche ? 25 : 35;
    let stufe = "gut";
    if (Math.abs(abw) > grenzeWarnung) stufe = "warnung";
    else if (Math.abs(abw) > grenzeHinweis) stufe = "hinweis";
    if (stufe !== "gut") {
      text += hatBezug
        ? " Bauteilflächen, U-Werte und die beheizte Fläche prüfen."
        : " Die Bauteilbezeichnungen ließen keinen Abgleich mit der Typologie zu, der "
          + "Erwartungswert gilt deshalb für den unsanierten Zustand. Bei gedämmten "
          + "Bauteilen ist eine Unterschreitung richtig.";
    }

    /* =================================================================
     * DER ZIRKELSCHLUSS, UND WARUM ER DIESE ZEILE WERTLOS MACHT
     * =================================================================
     * Diese Zeile hält einen Istwert gegen einen Sollwert. Sie ist genau so
     * viel wert, wie die beiden voneinander unabhängig sind.
     *
     *   Istwert  = Heizlast aus den U-Werten der Baualtersklasse
     *   Sollwert = Heizlast-Kennwert DERSELBEN Baualtersklasse
     *
     * Steht das Baujahr in den Unterlagen, ist das noch ein Vergleich: die
     * Klasse ist dann belegt, und es wird geprüft, ob die Bauteilbilanz zum
     * Erfahrungswert derselben belegten Klasse passt. Ist das Baujahr aber
     * ANGENOMMEN, kommen Soll und Ist aus derselben Annahme. Dann bestätigt
     * die Zeile nur noch, dass das Werkzeug sein eigenes Modell konsistent
     * angewandt hat -- und liest sich dabei wie eine bestandene Prüfung.
     *
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": 31,78 gegen 35,00 W/m² der
     * Klasse „ab 2016", −9 Prozent, „im Erwartungsbereich". Beide Zahlen
     * hängen am Plandatum 17.05.2022 und an nichts sonst.
     *
     * GELOCKERT WIRD HIER NICHTS. Die Schwellen bleiben, die Zahlen bleiben.
     * Was sich ändert, ist die Überschrift und das Urteil: eine Prüfung, die
     * nicht prüfen kann, darf nicht grün melden, sondern muss sagen, warum
     * sie nichts sagt -- und worauf stattdessen zu sehen ist.
     * ================================================================= */
    const bjAngenommen = !!(p.annahmen && p.annahmen.baujahr);
    /* Wie viel des Transmissionswärmestroms hängt am angenommenen Baujahr?
       Nur was aus der Typologie kommt, teilt die Quelle mit dem Sollwert. */
    let phiTypo = 0, phiHuelle = 0;
    (e.raeume || []).forEach(function (x) {
      (x.bauteile || []).forEach(function (b) {
        if (b.kat === "innen") return;
        phiHuelle += Math.abs(b.phi);
        if (b.typologie) phiTypo += Math.abs(b.phi);
      });
    });
    const anteilTypo = phiHuelle > 0 ? phiTypo / phiHuelle : 0;
    if (bjAngenommen && anteilTypo > 0.5) {
      const kurz = (p.annahmen.baujahr && p.annahmen.baujahr.kurz) || "";
      return [P("quer", "Quervergleich nicht möglich: Soll und Ist aus derselben Annahme",
        "warnung",
        "Berechnet " + f1(ist) + " W/m², " + bezugstext + "; Typologie-Kennwert für "
        + "Baujahr " + p.meta.baujahr + " " + f0(erwartet) + " W/m²; Abweichung "
        + (abw >= 0 ? "+" : "") + f0(abw) + " %. DIESE ABWEICHUNG BELEGT NICHTS. "
        + "Das Baujahr steht nicht in den Unterlagen, es ist angenommen"
        + (kurz ? " (" + kurz + ")" : "") + ". Aus derselben Annahme stammen "
        + "beide Seiten des Vergleichs: die U-Werte, mit denen gerechnet wurde "
        + "(" + f0(anteilTypo * 100) + " % des Transmissionswärmestroms), und der "
        + "Kennwert, gegen den verglichen wird. Der Vergleich zeigt damit nur, "
        + "dass das Werkzeug seine eigene Baualtersklasse konsistent angewandt "
        + "hat. Was er NICHT zeigt: ob die Klasse stimmt. Dafür steht die "
        + "Gegenrechnung über dem Ergebnis, die dieselbe Rechnung gegen jede "
        + "Baualtersklasse führt. Unabhängig vom Baujahr sind allein die aus dem "
        + "Plan gemessenen Größen; sie werden gesondert geprüft (Hüllfläche "
        + "gegen Volumen). Belastbar wird diese Zeile erst mit einem belegten "
        + "Baujahr.",
        { ist: ist, erwartet: erwartet, roh: roh, faktor: faktor, abw: abw,
          angepasst: hatBezug, auf_wohnflaeche: aufWohnflaeche,
          unabhaengig: false, baujahr_angenommen: true,
          anteil_typologie: anteilTypo })];
    }
    /* Belegtes Baujahr: der Vergleich trägt. Dass er die U-Werte mit dem
       Sollwert teilt, sobald sie aus der Typologie stammen, bleibt trotzdem
       wahr und gehört in die Zeile -- nur ist die Klasse dann keine Annahme
       mehr, sondern eine Angabe aus den Unterlagen. */
    if (anteilTypo > 0.5) {
      text += " Der Erwartungswert und " + f0(anteilTypo * 100) + " % des "
        + "Transmissionswärmestroms stammen aus derselben Baualtersklasse; "
        + "geprüft wird damit die Bauteilbilanz gegen den Erfahrungswert "
        + "dieser Klasse, nicht die Klasse selbst. Das Baujahr ist belegt.";
    }
    return [P("quer", "Quervergleich mit der Gebäudetypologie", stufe, text,
      { ist: ist, erwartet: erwartet, roh: roh, faktor: faktor, abw: abw,
        angepasst: hatBezug, auf_wohnflaeche: aufWohnflaeche,
        unabhaengig: anteilTypo <= 0.5, baujahr_angenommen: false,
        anteil_typologie: anteilTypo })];
  }

  /* ---------------------------------------------------------------------
   * 2b  Hüllfläche gegen Volumen — die einzige Probe ohne Baujahr
   * ---------------------------------------------------------------------
   * WOZU. Sobald das Baujahr angenommen ist, prüft jeder Vergleich gegen die
   * Typologie sich selbst. Übrig bleibt, was aus dem PLAN kommt und nicht aus
   * der Annahme: Flächen, Höhen, Volumen. Genau daraus lässt sich eine Aussage
   * bilden, die kein Baujahr braucht und keinen Erfahrungswert.
   *
   * DER SOLLWERT IST EINE MATHEMATISCHE SCHRANKE, KEINE ERFAHRUNG.
   * Die isoperimetrische Ungleichung sagt: unter allen Körpern gleichen
   * Volumens hat die Kugel die kleinste Oberfläche,
   *
   *      A >= (36 * pi)^(1/3) * V^(2/3)  =  4,836 * V^(2/3).
   *
   * Kein Gebäude kann diese Fläche unterschreiten. Die praktische Marke
   * darüber ist der Würfel mit A = 6 * V^(2/3); orthogonal gebaute Häuser
   * liegen darüber, meist deutlich.
   *
   * WAS GEMESSEN WIRD. Die Summe ALLER Bauteilflächen, die das beheizte
   * Volumen nach aussen begrenzen -- gegen Aussenluft, gegen Erdreich, gegen
   * unbeheizte Bereiche und gegen Nachbarn. Bauteile zwischen zwei beheizten
   * Räumen begrenzen das Volumen nicht und zählen nicht mit. Als Volumen
   * dient die Summe der Raumvolumina; sie ist das NETTOvolumen und damit
   * kleiner als das umbaute, was die Schranke nach unten drückt und die
   * Prüfung vorsichtig macht.
   *
   * WAS SIE FINDET. Fehlende Hüllbauteile -- die häufigste stille Ursache
   * einer zu kleinen Heizlast. Ein Haus mit vergessener Giebelwand
   * unterschreitet die Schranke. Kein Haus überschreitet sie zu Unrecht:
   * ein weitläufiges Gebäude darf beliebig weit darüber liegen, deshalb gibt
   * es nach oben keine Grenze und keinen Fehlalarm.
   * ------------------------------------------------------------------ */
  function pruefeUmschliessung(p, e) {
    const V = z(e.V_gesamt, 0);
    if (!(V > 0)) return [];
    let A = 0, n = 0;
    (e.raeume || []).forEach(function (x) {
      (x.bauteile || []).forEach(function (b) {
        if (b.kat === "innen") return;
        const a = z(b.A, 0);
        if (a <= 0) return;
        A += a; n += 1;
      });
    });
    if (!(A > 0) || !n) return [];
    const kugel = Math.pow(36 * Math.PI, 1 / 3) * Math.pow(V, 2 / 3);
    const wuerfel = 6 * Math.pow(V, 2 / 3);
    const kennwert = A / Math.pow(V, 2 / 3);
    const av = A / V;
    const gemeinsam = "Umschließende Fläche " + f1(A) + " m² bei " + f1(V)
      + " m³ beheiztem Nettovolumen, also A/V = " + f2(av) + " 1/m. Die "
      + "kleinstmögliche Oberfläche dieses Volumens hat die Kugel mit "
      + f1(kugel) + " m², ein Würfel hätte " + f1(wuerfel) + " m². Diese "
      + "Prüfung braucht kein Baujahr und keinen Erfahrungswert: sie rechnet "
      + "allein mit Flächen und Volumen aus dem Plan.";
    if (A < kugel) {
      return [P("huellflaeche", "Hüllfläche kleiner als geometrisch möglich", "fehler",
        gemeinsam + " Die erfasste Fläche liegt UNTER der Kugelschranke. Das "
        + "ist kein Erfahrungswert, sondern unmöglich: es fehlen Hüllbauteile. "
        + "Bauteile je Raum gegen den Plan durchgehen.",
        { A: A, V: V, kugel: kugel, wuerfel: wuerfel, kennwert: kennwert })];
    }
    if (A < wuerfel) {
      return [P("huellflaeche", "Hüllfläche knapp über der geometrischen Schranke",
        "warnung",
        gemeinsam + " Die erfasste Fläche liegt zwischen Kugel und Würfel. Ein "
        + "orthogonal gebautes Haus kommt dort nicht hin, ohne dass Fläche "
        + "fehlt -- es sei denn, es ist angebaut und die Trennwände sind hier "
        + "nicht erfasst. Beides gehört geklärt, bevor die Zahl weitergegeben "
        + "wird.",
        { A: A, V: V, kugel: kugel, wuerfel: wuerfel, kennwert: kennwert })];
    }
    return [P("huellflaeche", "Hüllfläche gegen Volumen", "gut",
      gemeinsam + " Die erfasste Fläche liegt darüber; die Geometrie ist "
      + "insoweit vollständig.",
      { A: A, V: V, kugel: kugel, wuerfel: wuerfel, kennwert: kennwert })];
  }

  /* ---------------------------------------------------------------------
   * 2b  Aussenwand gegen den kleinstmoeglichen Geschossumfang
   * ---------------------------------------------------------------------
   * DIE SCHRANKE NACH UNTEN GAB ES, DIE NACH OBEN NICHT.
   *
   * GEMESSEN am 26.08.2026 an "1754 BA 2018-03-13" (Moebelwerkstatt,
   * 4 Ebenen, rund 185 m Geschossumfang): das Modell fuehrte 8.845,61 m²
   * Aussenwand. Geometrisch moeglich waren rund 1.920 m² (185 m mal 2,60 m
   * mal vier Ebenen). Ein Einzelfall aus demselben Lauf: das Kellerlager
   * "-1.11" mit 26,51 m² Grundflaeche bekam einen Umfang von 61,49 m
   * zugeschrieben -- ein Quadrat dieser Flaeche hat 20,6 m. Der unplausible
   * Umfang wurde ungeprueft uebernommen, und niemand hat es gemerkt.
   *
   * WORAN GEMESSEN WIRD, OHNE ETWAS ZU ERFINDEN. Von allen Flaechen mit
   * gegebenem Inhalt hat das Quadrat den kleinsten Umfang: U_min = 4*Wurzel(A).
   * Das ist eine geometrische Tatsache, kein Erfahrungswert. Ein wirkliches
   * Geschoss liegt darueber -- wie weit, haengt am Zuschnitt.
   *
   * DER FAKTOR IST EIN ERFAHRUNGSWERT und ausdruecklich als solcher benannt:
   * gemeldet wird erst ab dem DREIFACHEN des Quadratumfangs. Ein L-foermiges
   * oder stark gegliedertes Gebaeude erreicht Faktor 1,5 bis 2; Faktor 3
   * bedeutet eine Wandlaenge, die sich mit keinem Zuschnitt mehr erklaeren
   * laesst. Gemeldet wird als WARNUNG, nicht als Fehler: die Geometrie ist
   * unplausibel, nicht unmoeglich.
   * ------------------------------------------------------------------ */
  const UMFANG_FAKTOR_WARNUNG = 3.0;
  function pruefeWandUeberschuss(p, e) {
    const jeG = {};
    (e.raeume || []).forEach(function (r) {
      const g = String(r.geschoss || "").trim() || "ohne Geschoss";
      if (!jeG[g]) jeG[g] = { A: 0, wand: 0, h: 0, n: 0 };
      jeG[g].A += z(r.A, 0);
      jeG[g].n += 1;
      const h = z(r.h, 0);
      if (h > jeG[g].h) jeG[g].h = h;
      (r.bauteile || []).forEach(function (b) {
        if (b.kat === "innen") return;
        if (String(b.art || "") !== "wand" && !/wand/i.test(String(b.name || ""))) return;
        jeG[g].wand += z(b.A, 0);
      });
    });
    const raus = [];
    Object.keys(jeG).forEach(function (g) {
      const x = jeG[g];
      if (!(x.A > 0) || !(x.h > 0) || !(x.wand > 0)) return;
      const uMin = 4 * Math.sqrt(x.A);
      const uIst = x.wand / x.h;
      const faktor = uIst / uMin;
      const gemeinsam = "Geschoss " + g + ": " + f1(x.wand) + " m² Wand gegen "
        + "außen, unbeheizt oder Erdreich bei " + f1(x.h) + " m Raumhöhe — das "
        + "entspricht " + f1(uIst) + " m Wandlänge. Die " + x.n + " Räume dieses "
        + "Geschosses haben zusammen " + f1(x.A) + " m²; ein Quadrat dieser "
        + "Fläche hat " + f1(uMin) + " m Umfang, und kleiner geht es nicht.";
      if (faktor >= UMFANG_FAKTOR_WARNUNG) {
        raus.push(P("wandueberschuss_" + g,
          "Außenwandlänge gegen den kleinstmöglichen Geschossumfang", "warnung",
          gemeinsam + " Das ist das " + f2(faktor) + "-fache. Ab dem "
          + "Dreifachen (Erfahrungswert, kein Normwert) lässt sich das mit "
          + "keinem Gebäudezuschnitt mehr erklären: gerechnet wird dann mit "
          + "Wandfläche, die es nicht gibt, und die Heizlast fällt zu groß aus. "
          + "Zu prüfen sind die Raumumfänge und ob ein Geschoss doppelt im "
          + "Raumbuch steht.",
          { A: x.A, wand: x.wand, u_ist: uIst, u_min: uMin, faktor: faktor }));
      }
    });
    return raus;
  }

  /* ---------------------------------------------------------------------
   * 3  Geometrie
   * ------------------------------------------------------------------ */
  function pruefeGeometrie(p, e) {
    const r = [];
    /* Ein Raum ohne Grundflaeche ist kein Raum.
     *
     * Warum das ein Fehler ist und keine Warnung: aus A = 0 folgt V = 0 und
     * daraus phi_V = 0 -- der Lueftungsanteil der Heizlast faellt still weg,
     * und die spezifische Last je Quadratmeter ist nicht bestimmt. Die
     * Rechnung liefert trotzdem eine Zahl, weil die Transmission ueber die
     * Bauteilflaechen weiterlaeuft. Diese Zahl ist zu niedrig, und man sieht
     * es ihr nicht an.
     *
     * Genau so kam es vor: die Planauslese liefert Raeume ohne Flaeche, weil
     * ihr das Messen von Flaechen ausdruecklich untersagt ist. Danach stand
     * hier "Flächen, Höhen und Hüllflächen sind plausibel" -- ueber Raeumen
     * mit null Quadratmetern. Jede weitere Pruefung in diesem Abschnitt ist
     * mit "x.A > 0" abgesichert, und deshalb ging der Fall lautlos durch. */
    const ohneFlaeche = (e.raeume || []).filter(function (x) { return !(z(x.A, 0) > 0); });
    if (ohneFlaeche.length) {
      const namen = ohneFlaeche.slice(0, 6).map(function (x) { return x.raum; }).join(", ");
      r.push(P("geo_a0", "Räume ohne Grundfläche", "fehler",
        ohneFlaeche.length + " von " + (e.raeume || []).length + " Räumen haben keine "
        + "Grundfläche: " + namen + (ohneFlaeche.length > 6 ? " und weitere" : "")
        + ". Ohne Grundfläche entsteht kein Raumvolumen und damit keine "
        + "Lüftungsheizlast; das Ergebnis ist zu niedrig. Fläche im Raumbuch "
        + "eintragen oder den Raum im Plan umfahren.",
        { ist: ohneFlaeche.length, erwartet: 0 }));
    }
    (e.raeume || []).forEach(function (x) {
      const raum = (p.raeume || []).find((y) => y.id === x.id) || {};
      // Hüllfläche gegen Grundfläche: sehr grobe Schranke
      const huelle = x.bauteile.filter((b) => b.kat !== "innen")
        .reduce((s, b) => s + b.A, 0);
      if (x.A > 0 && huelle > x.A * 12) {
        r.push(P("geo_" + x.id, "Hüllfläche " + x.raum, "warnung",
          "Der Raum hat " + f1(huelle) + " m² Hüllfläche bei " + f1(x.A)
          + " m² Grundfläche. Das ist ungewöhnlich viel. Flächen prüfen."));
      }
      /* Raumhöhe. Fehlt sie ganz, ist das kein Ausreisser, sondern derselbe
         Fall wie A = 0: aus h = 0 folgt V = 0 und damit phi_V = 0. Der
         Lueftungsanteil des Raums faellt still weg, die Transmission laeuft
         weiter, und es steht eine zu niedrige Zahl da. Deshalb Fehler. */
      if (!(x.h > 0)) {
        r.push(P("hoehe_" + x.id, "Raumhöhe " + x.raum, "fehler",
          "Für den Raum ist keine lichte Höhe eingetragen. Ohne Höhe entsteht kein "
          + "Raumvolumen und damit keine Lüftungsheizlast; die Transmission wird "
          + "trotzdem gerechnet. Das Ergebnis für diesen Raum ist zu niedrig."));
      } else if (x.h < 1.8 || x.h > 6) {
        r.push(P("hoehe_" + x.id, "Raumhöhe " + x.raum, "warnung",
          "Raumhöhe " + f1(x.h) + " m liegt außerhalb des üblichen Bereichs."));
      }
      // Fläche aus dem Plan gegen eingetragene Fläche
      if (raum.plan_flaeche && x.A > 0) {
        const d = Math.abs(raum.plan_flaeche - x.A) / x.A * 100;
        if (d > 3) {
          r.push(P("plan_" + x.id, "Planfläche " + x.raum, "hinweis",
            "Eingetragen " + f1(x.A) + " m², aus dem Plan umfahren "
            + f1(raum.plan_flaeche) + " m². Abweichung " + f0(d) + " %."));
        }
      }
    });
    if (!r.length && (e.raeume || []).length) {
      /* Der Satz spricht bewusst nur von Räumen. Über die Bauteile urteilt
         "Bauteile ohne Wirkung" weiter unten; stünde hier "Flächen sind
         plausibel", widerspräche das einem Bauteil mit 0 m² darunter. */
      r.push(P("geo", "Geometrie", "gut",
        "Raumflächen, Raumhöhen und das Verhältnis Hüllfläche zu Grundfläche sind plausibel."));
    }
    return r;
  }

  /* ---------------------------------------------------------------------
   * 3a  Klimadaten gegen die Tabelle
   * ---------------------------------------------------------------------
   * DATEN_KLIMA.pruefeKlima gibt es seit langem, mit eigenem Selbsttest. Sie
   * wurde aber nur beim Zeichnen des Schritts "Objekt" aufgerufen und stand
   * dort als Hinweis unter dem Feld. Wer den Schritt einmal ausgefüllt und
   * danach nicht wieder geöffnet hat, sah sie nie -- und weder die Ampel noch
   * der Bericht wussten davon.
   *
   * Gemessen: für PLZ 33098 Paderborn führt die Tabelle -9,6 °C. Von Hand
   * eingetragene -18,0 °C ergeben 1.429 W statt 1.019 W, also 40 % mehr.
   * pruefeKlima meldete die Abweichung, die Selbstprüfung schwieg.
   *
   * Die Norm-Außentemperatur geht linear in jede einzelne Zahl der Rechnung
   * ein. Sie gehört deshalb in dieselbe Liste wie alles andere.
   * ------------------------------------------------------------------ */
  function pruefeKlimaAngaben(p, o) {
    const DK = o && o.klima;
    if (!DK || typeof DK.pruefeKlima !== "function") return [];
    const plz = p.meta && p.meta.plz;
    let w = [];
    try { w = DK.pruefeKlima(p.klima || {}, plz) || []; } catch (ex) { return []; }
    /* Die fehlende Norm-Außentemperatur meldet bereits "Pflichtangaben".
       Zweimal dieselbe Zeile hilft niemandem. */
    w = w.filter(function (x) { return String(x.text || "").indexOf("fehlt.") < 0; });
    if (!w.length) {
      if (!(p.klima && p.klima.theta_e != null)) return [];
      /* DERSELBE ZIRKELSCHLUSS WIE BEIM BAUJAHR, NUR LEISER.
       *
       * GEMESSEN am Blatt „BV 2-0887 Ziolkowski", echter Durchlauf 23.08.2026:
       * Auf dem Blatt steht keine Postleitzahl. Das Werkzeug hat die
       * Norm-Außentemperatur −10,7 °C aus dem Ortsnamen über DIESELBE
       * Klimatabelle angenommen (PLZ 33100 Paderborn). Darunter stand grün:
       * „Norm-Außentemperatur und Jahresmitteltemperatur stimmen mit der
       * hinterlegten Tabelle für die Postleitzahl überein." Natürlich stimmen
       * sie überein — sie stammen aus derselben Zeile derselben Tabelle. Die
       * Zeile verglich eine Zahl mit sich selbst und meldete Erfolg.
       *
       * Sie ist damit kein Vergleich, sondern eine Feststellung, und wird als
       * solche geschrieben. Ein Vergleich wird sie in dem Augenblick, in dem
       * eine Postleitzahl auf dem Blatt steht oder eingetragen ist: dann sind
       * Eingabe und Tabelle zwei Größen, und ihre Übereinstimmung ist ein
       * Befund. */
      const ohnePlz = !String((p.meta && p.meta.plz) || "").trim();
      const angenommen = (p.klima && p.klima.angenommen === true)
                      || !!(p.annahmen && p.annahmen.klima);
      if (ohnePlz && angenommen) {
        return [P("klima", "Klimadaten nicht gegengeprüft: aus derselben Tabelle entnommen",
          "hinweis",
          "Die Norm-Außentemperatur " + f1(z(Number(p.klima.theta_e), 0)) + " °C ist "
          + "nicht eingetragen, sondern aus dem Ortsnamen über die hinterlegte "
          + "Klimatabelle angenommen. Dass sie mit dieser Tabelle übereinstimmt, "
          + "ist keine Prüfung, sondern dieselbe Zahl zweimal. Geprüft ist sie "
          + "erst mit der Postleitzahl des Objekts; sie geht linear in jede Zahl "
          + "der Rechnung ein. Der Ortsname allein trifft in großen Städten die "
          + "falsche Zeile, weil zu einem Ort mehrere Postleitzahlen und "
          + "verschiedene Norm-Außentemperaturen gehören können.")];
      }
      return [P("klima", "Klimadaten", "gut",
        "Norm-Außentemperatur und Jahresmitteltemperatur stimmen mit der "
        + "hinterlegten Tabelle für die eingetragene Postleitzahl überein. "
        + "Eingabe und Tabelle sind hier zwei voneinander unabhängige Größen.")];
    }
    return w.map(function (x, i) {
      return P("klima_" + i, "Klimadaten",
        x.stufe === "fehler" ? "fehler" : "warnung", x.text);
    });
  }

  /* ---------------------------------------------------------------------
   * 3b  Bauteile, die eine Zahl liefern, und die Zahl ist falsch
   * ---------------------------------------------------------------------
   * Der teuerste Fehler dieses Werkzeugs ist nicht die fehlende Angabe --
   * die sieht man. Es ist die Angabe, die da steht, plausibel aussieht und
   * still falsch ist.
   *
   * Der gemessene Anlass: die Bauteilerzeugung legte je Raum eine Kellerdecke
   * und eine oberste Geschossdecke an und dazu zwei unbeheizte Bereiche, die
   * mangels eigener Hüllbauteile über die Bilanz genau die Temperatur der
   * angrenzenden Räume annahmen -- 20,0 °C. Damit ist theta_i - theta_j = 0
   * und 84,8 m² Boden und Dach liefern 0 W. Darunter stand "Prüfhinweise --
   * Keine Auffälligkeiten" und "Selbstprüfung: 0 Fehler".
   *
   * Die Ursache ist inzwischen behoben (unbeheizte Bereiche entstehen mit
   * einer belegten Lage nach DIN/TS 12831-1:2020-04, Tabelle 5). Diese
   * Prüfung sichert nicht die Ursache ab, sondern die WIRKUNG: sie sieht das
   * Rechenergebnis an und verlangt, dass jedes Bauteil mit Fläche auch einen
   * Wärmestrom liefert. Damit greift sie auch bei jedem anderen Weg zu
   * derselben Null -- von Hand auf 20 °C gesetzte Zone, U-Wert null,
   * verlorener Bauteiltyp, Verweis auf einen Bereich, den es nicht gibt.
   *
   * Die Schranke: 1,0 W/m². Nachgemessen am Referenzprojekt Mälzerstraße 59
   * liegt das kleinste vorkommende |phi|/A bei 3,60 W/m² (Bad gegen Wohnung,
   * 4 K Unterschied). Der Abstand zur Schranke ist damit mehr als das
   * Dreifache; zugleich entspricht 1,0 W/m² bei U = 1 einem
   * Temperaturunterschied von knapp 1 K, also praktisch keinem.
   * ------------------------------------------------------------------ */

  /* Ab hier gilt ein Bauteil als wirkungslos. Siehe Herleitung oben. */
  const OHNE_WIRKUNG_W_JE_M2 = 1.0;
  /* Erdberuehrte Bauteile tragen den Faktor f_ig: der Waermestrom bezieht sich
   * auf die Jahresmitteltemperatur und ist dadurch planmaessig klein. Bei
   * Paderborn (-9,6 / 10,1) liefert eine Bodenplatte mit U_equiv 0,06 nur
   * 0,86 W/m2 -- ein Passivhauswert, kein Fehler. Mit der Schranke der Huelle
   * waere das ein Fehlalarm, und ein Fehlalarm mit roter Ampel kostet mehr
   * Vertrauen als er einbringt. 0,2 W/m2 entspricht U_equiv 0,014 und kommt
   * an keinem Gebaeude vor. */
  const OHNE_WIRKUNG_ERDREICH_W_JE_M2 = 0.2;
  /* Ab diesem Anteil ist die Heizlast im Wesentlichen Luftwechsel. */
  const LUEFTUNG_ANTEIL_WARNUNG = 0.5;

  /* ---------------------------------------------------------------------
   * 7b  Ein unbeheizter Bereich, der keiner ist
   * ---------------------------------------------------------------------
   * Ein unbeheizter Bereich taugt nur dann als solcher, wenn er KÄLTER ist
   * als die Räume, die an ihn grenzen. Ist er es nicht, führt die trennende
   * Decke oder Wand keinen Wärmestrom mehr ab: die Fläche steht in der
   * Rechnung, trägt aber null Watt. Die Heizlast fällt dann genau um den
   * Betrag zu klein aus, den dieses Bauteil beisteuern müsste, und in Watt
   * je Quadratmeter sieht man davon nichts.
   *
   * Das ist keine Ermessensfrage und keine Schwelle dieses Werkzeugs,
   * sondern die Definition: Phi = H · (theta_i − theta_u). Wird theta_u
   * größer oder gleich theta_i, ist der Term null oder negativ.
   *
   * Der zweite Grund, warum diese Prüfung hier steht: bis zum 23.08.2026
   * ließ sich der Fall gar nicht erzwingen. Wer eine Zone auf Raumtemperatur
   * setzte, bekam keine Meldung, und niemand konnte vorführen, dass das
   * Werkzeug so etwas findet. Eine Prüfung, deren Anschlagen sich nicht
   * zeigen lässt, ist kein Nachweis.
   * ------------------------------------------------------------------ */
  function pruefeZonenTemperatur(p, e) {
    const raus = [];
    const temp = (e && e.zonen) || {};
    const namen = {};
    ((p && p.zonen) || []).forEach(function (x) {
      if (x && x.id) namen[x.id] = x.name || x.id;
    });
    /* Je Zone die kälteste angrenzende Raumtemperatur. Sie ist die Schranke:
       darunter fließt Wärme, darüber nicht mehr. */
    const kaeltester = {};
    ((e && e.raeume) || []).forEach(function (r) {
      const ti = z(r.theta_i, null);
      if (ti === null) return;
      (r.bauteile || []).forEach(function (b) {
        const g = b.grenzt_an || {};
        if (g.typ !== "zone" || !g.ref) return;
        if (!(z(b.A, 0) > 0)) return;
        if (kaeltester[g.ref] === undefined || ti < kaeltester[g.ref].theta) {
          kaeltester[g.ref] = { theta: ti, raum: r.raum || r.id };
        }
      });
    });
    Object.keys(kaeltester).forEach(function (id) {
      const tu = z(temp[id], null);
      if (tu === null) return;
      const k = kaeltester[id];
      if (tu < k.theta - 0.05) return;      // alles in Ordnung
      raus.push(P("zone_warm_" + id,
        "Unbeheizter Bereich auf Raumtemperatur: „" + (namen[id] || id) + "“",
        "fehler",
        "Für „" + (namen[id] || id) + "“ steht "
        + tu.toFixed(1).replace(".", ",") + " °C, der kälteste angrenzende "
        + "beheizte Raum (" + k.raum + ") rechnet mit "
        + k.theta.toFixed(1).replace(".", ",") + " °C. Damit fließt durch die "
        + "trennenden Bauteile keine Wärme mehr: sie stehen mit ihrer Fläche in "
        + "der Rechnung und tragen null Watt. Ein Bereich auf Raumtemperatur ist "
        + "kein unbeheizter Bereich — entweder ist er beheizt, dann gehören "
        + "seine Räume ins Raumbuch und die trennenden Bauteile heraus, oder die "
        + "vorgegebene Temperatur ist zu hoch angesetzt."));
    });
    return raus;
  }

  function pruefeStilleFehler(p, e) {
    const r = [];
    const raeume = e.raeume || [];
    if (!raeume.length) return r;

    const zonenDa = {};
    (p.zonen || []).forEach(function (x) { if (x && x.id) zonenDa[x.id] = x; });
    const raeumeDa = {};
    raeume.forEach(function (x) { if (x && x.id) raeumeDa[x.id] = x; });

    const ohneFlaeche = [], ohneU = [], ohneWirkung = [], innenOhneWirkung = [],
          insLeere = [];

    raeume.forEach(function (x) {
      (x.bauteile || []).forEach(function (b) {
        const wo = x.raum + " · " + (b.name || "Bauteil");
        const A = z(b.A, 0), u = z(b.U, 0);
        const g = b.grenzt_an || { typ: "aussen" };

        /* 1  Verweis ins Leere. Der Rechenkern setzt für einen unbekannten
              Nachbarn die Außentemperatur ein. Ein Innenbauteil rechnet dann
              gegen -12 °C statt gegen den Nachbarraum, ein Bauteil gegen
              einen gelöschten unbeheizten Bereich ebenso. Die Zahl wird
              dadurch zu hoch, nicht zu niedrig -- und nichts sagt es. */
        if (g.typ === "zone" && !zonenDa[g.ref]) {
          insLeere.push(wo + " (unbeheizter Bereich „" + g.ref + "“ fehlt)");
        } else if (g.typ === "raum" && !raeumeDa[g.ref]) {
          insLeere.push(wo + " (Nachbarraum „" + g.ref + "“ fehlt)");
        } else if (g.typ === "raum" && g.ref === x.id) {
          insLeere.push(wo + " (grenzt an den eigenen Raum)");
        }

        /* 2  Bauteil ohne Fläche. Es steht im Raumbuch, es steht im Bericht,
              und es überträgt nichts. */
        if (!(A > 0)) { ohneFlaeche.push(wo); return; }

        /* 3  Bauteil ohne U-Wert. Tritt auf, wenn der Bauteiltyp gelöscht
              wurde: der Rechenkern findet dann keinen Wert und setzt 0. Beim
              Hüllbauteil bleibt allein der Wärmebrückenzuschlag stehen. */
        if (!(u > 0)) { ohneU.push(wo); return; }

        /* 4  Fläche da, U-Wert da, und trotzdem kein Wärmestrom. */
        const jeM2 = Math.abs(z(b.phi, 0)) / A;
        const schranke = b.kat === "erdreich"
          ? OHNE_WIRKUNG_ERDREICH_W_JE_M2 : OHNE_WIRKUNG_W_JE_M2;
        if (jeM2 < schranke) {
          const dt = z(x.theta_i, 0) - z(b.theta_j, 0);
          const eintrag = wo + ": " + f1(A) + " m² liefern " + f1(z(b.phi, 0))
            + " W (Raum " + f1(z(x.theta_i, 0)) + " °C, andere Seite "
            + f1(z(b.theta_j, 0)) + " °C, Unterschied " + f1(dt) + " K)";
          if (b.kat === "innen") innenOhneWirkung.push(eintrag);
          else ohneWirkung.push(eintrag);
        }
      });
    });

    function auflisten(liste) {
      return liste.slice(0, 5).join("; ")
        + (liste.length > 5 ? " und " + (liste.length - 5) + " weitere" : "");
    }

    if (insLeere.length) {
      r.push(P("bt_ins_leere", "Bauteile mit verlorenem Nachbarn", "fehler",
        mz(insLeere.length, "Bauteil verweist", "Bauteile verweisen")
        + " auf einen Nachbarn, den es im Projekt "
        + "nicht gibt: " + auflisten(insLeere) + ". Für einen unbekannten Nachbarn "
        + "rechnet der Kern mit der Außentemperatur. Das Ergebnis ist dadurch zu hoch. "
        + "Den unbeheizten Bereich anlegen oder das Bauteil neu zuordnen.",
        { ist: insLeere.length, erwartet: 0 }));
    }
    if (ohneFlaeche.length) {
      r.push(P("bt_a0", "Bauteile ohne Fläche", "fehler",
        mz(ohneFlaeche.length, "Bauteil steht", "Bauteile stehen")
        + " im Raumbuch, ohne eine Fläche zu haben: "
        + auflisten(ohneFlaeche) + ". Sie übertragen nichts und fehlen damit in der "
        + "Heizlast, erscheinen im Bericht aber als erfasstes Bauteil. Fläche "
        + "eintragen oder das Bauteil löschen.",
        { ist: ohneFlaeche.length, erwartet: 0 }));
    }
    if (ohneU.length) {
      r.push(P("bt_u0", "Bauteile ohne U-Wert", "fehler",
        mz(ohneU.length, "Bauteil hat", "Bauteile haben")
        + " eine Fläche, aber keinen U-Wert: "
        + auflisten(ohneU) + ". Meist ist der zugehörige Bauteiltyp gelöscht worden. "
        + "Beim Hüllbauteil bleibt nur der Wärmebrückenzuschlag stehen, das Ergebnis "
        + "ist deutlich zu niedrig. Bauteiltyp neu zuweisen.",
        { ist: ohneU.length, erwartet: 0 }));
    }
    if (ohneWirkung.length) {
      r.push(P("bt_ohne_wirkung", "Hüllbauteile ohne Wirkung", "fehler",
        mz(ohneWirkung.length, "Bauteil der Gebäudehülle hat",
              "Bauteile der Gebäudehülle haben") + " Fläche und U-Wert, "
        + "liefern aber praktisch keinen Wärmestrom: " + auflisten(ohneWirkung)
        + ". Die Ursache ist immer der Temperaturunterschied: die andere Seite liegt "
        + "auf oder nahe der Raumtemperatur. Bei einem unbeheizten Bereich heißt das, "
        + "dass seine Temperatur nicht stimmt -- unter „Unbeheizte Bereiche“ eine Lage "
        + "nach DIN/TS 12831-1:2020-04, Tabelle 5 wählen oder die eigenen Bauteile des "
        + "Bereichs eintragen. Solange das so steht, ist die Heizlast zu niedrig.",
        { ist: ohneWirkung.length, erwartet: 0 }));
    }
    if (innenOhneWirkung.length) {
      r.push(P("bt_innen_ohne_wirkung", "Innenbauteile ohne Wirkung", "hinweis",
        innenOhneWirkung.length + " Innenbauteile liefern keinen Wärmestrom: "
        + auflisten(innenOhneWirkung) + ". Zwischen gleich temperierten Räumen ist "
        + "das nach DIN EN 12831-1 richtig; die Bauteile ändern das Ergebnis nicht. "
        + "Prüfen, ob die Temperatur des Nachbarraums stimmt.",
        { ist: innenOhneWirkung.length }));
    }

    /* 5  Das Ergebnis als Ganzes: null Watt bei vorhandener Hülle. */
    const huellflaeche = raeume.reduce(function (s, x) {
      return s + (x.bauteile || []).reduce(function (t, b) {
        return t + (b.kat === "innen" ? 0 : z(b.A, 0)); }, 0);
    }, 0);
    if (huellflaeche > 0 && !(Math.abs(z(e.phi_gebaeude, 0)) > 0.5)) {
      r.push(P("phi_null", "Heizlast null", "fehler",
        "Das Gebäude hat " + f1(huellflaeche) + " m² Hüllfläche, die Heizlast ist "
        + "trotzdem null. Meist stimmt die Norm-Außentemperatur nicht: sie liegt "
        + "derzeit bei " + f1(z(e.klima && e.klima.theta_e, 0)) + " °C. Ein Ergebnis "
        + "von null Watt ist keine Auslegung.",
        { ist: 0, erwartet: null }));
    }

    /* 6  Lüftungsanteil. Eine Heizlast, die fast nur aus Luftwechsel besteht,
          zeigt an, dass die Hülle unvollständig erfasst ist -- gemessen an
          einem echten Fall: fünf Räume, 60,5 m², kein einziges Fenster. */
    const phi = z(e.phi_gebaeude, 0), phiV = z(e.phi_V_gebaeude, 0);
    if (phi > 0 && phiV / phi > LUEFTUNG_ANTEIL_WARNUNG) {
      r.push(P("lueftung_anteil", "Heizlast überwiegend Lüftung", "warnung",
        f0(phiV / phi * 100) + " % der Heizlast entfallen auf den Luftwechsel ("
        + f0(phiV) + " W von " + f0(phi) + " W). Bei einem Wohngebäude überwiegt "
        + "normalerweise die Transmission. Ein so hoher Anteil heißt fast immer, "
        + "dass Hüllbauteile fehlen -- am häufigsten die Fenster. Bauteile je Raum "
        + "gegen den Plan prüfen.",
        { anteil: phiV / phi * 100 }));
    }

    if (!r.length) {
      r.push(P("still", "Bauteile ohne Wirkung", "gut",
        "Jedes Bauteil mit Fläche liefert einen Wärmestrom, jeder Nachbar ist "
        + "vorhanden, und der Lüftungsanteil liegt unter der Hälfte."));
    }
    return r;
  }

  /* ---------------------------------------------------------------------
   * 4  Spezifische Heizlast je Raum
   * ------------------------------------------------------------------ */
  function pruefeRaumlasten(e) {
    const r = [];
    const auffaellig = (e.raeume || []).filter((x) => x.A > 0 && (x.spez > 180 || x.spez < 10));
    auffaellig.forEach(function (x) {
      r.push(P("spez_" + x.id, "Heizlast " + x.raum,
        x.spez > 250 || x.spez < 5 ? "warnung" : "hinweis",
        f0(x.spez) + " W/m² " + (x.spez > 180 ? "ist auffällig hoch" : "ist auffällig niedrig")
        + ". Bauteilflächen, U-Werte und Nachbartemperaturen prüfen."));
    });
    /* Raeume ohne Grundflaeche haben keine spezifische Last. Sie stillschweigend
       zu uebergehen und danach "Alle Räume liegen im plausiblen Bereich" zu
       schreiben, ist eine Aussage ueber Raeume, die gar nicht geprueft wurden. */
    const ungeprueft = (e.raeume || []).filter((x) => !(x.A > 0));
    if (!auffaellig.length && (e.raeume || []).length && !ungeprueft.length) {
      r.push(P("spez", "Heizlast je Raum", "gut",
        "Alle Räume liegen im plausiblen Bereich."));
    } else if (!auffaellig.length && ungeprueft.length) {
      r.push(P("spez", "Heizlast je Raum", "hinweis",
        ungeprueft.length + " von " + (e.raeume || []).length + " Räumen lassen sich "
        + "nicht beurteilen, weil ihre Grundfläche fehlt. Die übrigen liegen im "
        + "plausiblen Bereich."));
    }
    return r;
  }

  /* ---------------------------------------------------------------------
   * 5  U-Werte
   * ------------------------------------------------------------------ */
  function pruefeUWerte(p) {
    const r = [];
    (p.bauteiltypen || []).forEach(function (t) {
      const u = z(t.U, 0);
      if (u <= 0) {
        r.push(P("u0_" + t.id, "U-Wert " + t.name, "fehler",
          "Der U-Wert ist null oder negativ."));
      } else if (u > 6) {
        r.push(P("uhi_" + t.id, "U-Wert " + t.name, "warnung",
          f1(u) + " W/(m²·K) ist höher als bei Einfachverglasung. Wert prüfen."));
      } else if (u < 0.08) {
        r.push(P("ulo_" + t.id, "U-Wert " + t.name, "hinweis",
          f1(u) + " W/(m²·K) ist sehr niedrig. Nur bei Passivhausbauteilen richtig."));
      }
    });
    if (!r.length && (p.bauteiltypen || []).length) {
      r.push(P("u", "U-Werte", "gut", "Alle U-Werte liegen im physikalisch sinnvollen Bereich."));
    }
    return r;
  }

  /* ---------------------------------------------------------------------
   * 6  Anteil der Annahmen am Ergebnis
   * ------------------------------------------------------------------ */
  function pruefeHerkunft(p, e) {
    /* KUNDENVORGABE (Sebastian, 24.08.2026): Werte aus der Gebäudetypologie
       und aus dem Referenzgebäude des GModG gelten als korrekt angesetzt.
       Sie tragen am Bauteil annahme === false (app.js, projektFuerKern) und
       zählen hier nicht mehr — die frühere Warnung „100 % ... ohne belegten
       U-Wert ... vor der Auslegung am Objekt zu bestätigen" entfällt für
       Typologiewerte dauerhaft. Was weiter zählt und weiter anschlägt:
       von Hand angesetzte U-Werte ohne Beleg (annahme === true) und Bauteile
       ganz ohne Bauteiltyp. Die Herkunft der Typologiewerte bleibt als
       neutrale Information sichtbar (grüne Zeile, Konfidenztabelle). */
    let phiAnnahme = 0, phiTypo = 0, phiGesamt = 0;
    (e.raeume || []).forEach(function (x) {
      x.bauteile.forEach(function (b) {
        if (b.kat === "innen") return;
        phiGesamt += Math.abs(b.phi);
        if (b.annahme) phiAnnahme += Math.abs(b.phi);
        else if (b.typologie) phiTypo += Math.abs(b.phi);
      });
    });
    if (phiGesamt <= 0) return [];
    const anteil = phiAnnahme / phiGesamt * 100;
    const anteilTypo = phiTypo / phiGesamt * 100;
    let stufe = "gut";
    if (anteil > 70) stufe = "warnung";
    else if (anteil > 30) stufe = "hinweis";
    const gruenText = anteilTypo >= 0.5
      ? "Die U-Werte sind belegt oder aus der Gebäudetypologie beziehungsweise "
        + "dem Referenzgebäude vorbelegt (" + f0(anteilTypo) + " % des "
        + "Transmissionswärmestroms); diese Vorbelegungen gelten als angesetzt "
        + "und bleiben überschreibbar."
      : "Der überwiegende Teil ist belegt.";
    /* Wortwahl (Kundenvorgabe 24.08.2026): die Formeln „ohne belegten
       U-Wert" und „vor der Auslegung am Objekt" der früheren Warnung sind
       aus allen Nutzertexten heraus; der Hand-Wert-Alarm selbst bleibt. */
    return [P("herkunft", "Belegte Werte gegen Annahmen", stufe,
      f0(anteil) + " % des Transmissionswärmestroms beruhen auf von Hand "
      + "angesetzten Bauteilen, deren U-Wert nicht belegt ist. " + (anteil > 30
        ? "Diese Bauteile sind im Bericht als Annahme ausgewiesen und vor der "
          + "Bestellung des Wärmeerzeugers am Gebäude zu bestätigen."
        : gruenText),
      { anteil: anteil, anteil_typologie: anteilTypo })];
  }

  /* ---------------------------------------------------------------------
   * 7  Rechenkern selbst
   * ------------------------------------------------------------------ */
  function pruefeRechenkern(kerne) {
    const r = [];
    (kerne || []).forEach(function (k) {
      if (!k.modul || typeof k.modul.selbsttest !== "function") return;
      let res;
      try { res = k.modul.selbsttest(); }
      catch (e) { res = { ok: false, fehler: [String(e && e.message || e)], anzahl: 0 }; }
      r.push(res.ok
        ? P("kern_" + k.name, "Selbsttest " + k.name, "gut",
            res.anzahl + " Prüfungen bestanden.")
        : P("kern_" + k.name, "Selbsttest " + k.name, "fehler",
            "Fehlgeschlagen: " + res.fehler.join("; ")));
    });
    return r;
  }

  /** Wurde mit einer Unterlage gearbeitet, die die Eignungsprüfung nicht
   *  bestanden hat? Das muss sichtbar bleiben. */
  function pruefePlanfreigabe(p, o) {
    if (p.planFreigabeGrund) {
      return [P("planfreigabe", "Eignung der Planunterlage", "warnung",
        "Die Eignungsprüfung der Planunterlage wurde nicht bestanden, die Sperre "
        + "wurde jedoch aufgehoben. Begründung: " + p.planFreigabeGrund)];
    }
    const e = o && o.planEignung;
    if (e && e.urteil === "eingeschraenkt") {
      return [P("planeignung", "Eignung der Planunterlage", "hinweis",
        "Die Planunterlage ist mit Einschränkungen nutzbar: "
        + e.befunde.filter(function (b) { return b.stufe === "einschraenkung"; })
            .map(function (b) { return b.titel; }).join(", ") + ".")];
    }
    if (e && e.urteil === "geeignet") {
      return [P("planeignung", "Eignung der Planunterlage", "gut",
        "Auflösung, Schärfe, Kontrast und Ausrichtung sind ausreichend.")];
    }
    return [];
  }

  /** Woher die Raumflächen stammen, gezählt über das Raumbuch.
   *
   *  Drei Wege führen zu einer Fläche: aus dem Textstand der Zeichnung
   *  gelesen, im Bild umfahren und gemessen, oder eingetippt. Nur der
   *  mittlere hängt am Maßstab. Ohne diese Unterscheidung behauptete die
   *  Maßstabsprobe bei jedem Blatt mit Flächenstempeln, die Zahlen seien von
   *  Hand eingetragen. */
  function flaechenHerkunft(p) {
    const h = { textstand: 0, gemessen: 0, hand: 0, verteilt: 0 };
    ((p && p.raeume) || []).forEach(function (r) {
      const hk = r.herkunft || {};
      const q = String(hk.flaeche_quelle || "");
      /* EINE VERTEILTE FLAECHE IST KEINE EINGABE DES BEARBEITERS.
       *
       * Bis zum 26.08.2026 hatte diese Funktion drei Faecher, und das dritte
       * war ein Auffangbecken: alles, was weder Stempel noch gemessen war,
       * zaehlte als „von Hand eingetragen". Seit die Flaechenkette fehlende
       * Raumflaechen aus der Aussenbemassung verteilt, faellt genau das
       * hinein — eine Zahl des WERKZEUGS.
       * GEMESSEN am Blatt „Bauantrag Soethe 1312.2021.pdf" (echter Lauf
       * 26.08.2026): 13 verteilte Flaechen, kein einziger Handeintrag. Die
       * Massstabsprobe hob daraufhin ihre Sperre mit dem Satz auf „13
       * Flaechen sind von Hand eingetragen", und der Herkunftssatz schob die
       * Verantwortung weiter: „fuer die Richtigkeit der Flaechen steht der
       * Bearbeiter ein". Beides ueber Zahlen, die das Werkzeug selbst
       * gebildet hat.
       * Verteilte Flaechen haengen an der Quelle, aus der die Geschoss-
       * flaeche stammt: kommt sie aus einer abgelesenen Maszkette, ist kein
       * Massstab beteiligt; ist sie im Bild umfahren, sehr wohl. Genau so
       * wird einsortiert. */
      const verteilt = r.A_annahme === true || /verteil/i.test(q);
      if (verteilt) {
        if (hk.umfang_m > 0 || /umfahren|im Bild gemessen|Pixel/i.test(q)) h.gemessen++;
        else h.verteilt++;
        return;
      }
      if (hk.quelle === "Flächenstempel im Plan"
          || /Textstand|im Plan angeschrieben/i.test(q)) h.textstand++;
      else if (hk.umfang_m > 0 || /umfahren|gemessen/i.test(q)) h.gemessen++;
      else h.hand++;
    });
    return h;
  }

  /** Räume, deren Fläche mit dem VORBELEGTEN Maßstab umfahren wurde.
   *
   *  Gibt weder Schriftfeld noch Maßkette noch Blattmaß einen Maßstab her,
   *  setzt das Umfahren-Werkzeug 1:100 als gekennzeichnete Vorbelegung, damit
   *  die Rechnung durchläuft statt an „Erst den Maßstab setzen" zu enden.
   *  Diese Zeile ist die Kennzeichnung dazu: eine ausgewiesene Annahme mit
   *  Fehlerrichtung und dem einen Handgriff, der sie ersetzt. Sie erscheint
   *  NUR, wenn tatsächlich eine Fläche an der Vorbelegung hängt — bei
   *  Stempel-Projekten und von Hand eingetragenen Flächen gibt es sie nicht,
   *  dort ist kein Maßstab beteiligt. */
  function pruefeMassstabVorbelegung(p) {
    const betroffen = ((p && p.raeume) || []).filter(function (r) {
      return !!(r && r.herkunft && r.herkunft.massstab_vorbelegt === true);
    });
    if (!betroffen.length) return [];
    const namen = betroffen.slice(0, 3).map(function (r) {
      return "„" + (r.name || r.id || "Raum") + "“";
    }).join(", ") + (betroffen.length > 3 ? " und weitere" : "");
    const z = P("massstab_vorbelegt", "Maßstab 1:100 vorbelegt", "offen",
      (betroffen.length === 1
        ? "Ein Raum (" + namen + ") ist"
        : betroffen.length + " Räume (" + namen + ") sind")
      + " im Plan umfahren, ohne dass das Blatt einen Maßstab hergibt; gerechnet "
      + "ist mit der Vorbelegung 1:100. Alle umfahrenen Flächen skalieren mit dem "
      + "Maßstab: ist der wahre Maßstab 1:50, ist jede dieser Flächen viermal zu "
      + "groß, bei 1:200 viermal zu klein. Eine bemaßte Strecke im Plan nachmessen "
      + "(„Plan von Hand umfahren“ → „Maßstab messen“) ersetzt die Vorbelegung "
      + "und zieht die Flächen nach.", betroffen.length);
    z.annahme = true;
    return [z];
  }

  /** RAUMFLAECHEN, DIE DAS WERKZEUG VERTEILT HAT.
   *
   *  Traegt ein Blatt keine Flaechenstempel, verteilt die Flaechenkette die
   *  belegte Geschossflaeche nach Raumart auf die Raeume. Das ist der Weg,
   *  der aus 0,00 kW ueberhaupt erst eine Zahl macht — und es ist eine
   *  ANNAHME je Raum, keine gemessene Groesse.
   *
   *  GEMESSEN am Blatt „Bauantrag Soethe 1312.2021.pdf" (echter Lauf
   *  26.08.2026): 13 von 13 Raumflaechen verteilt, Spanne 2,41 bis 25,99 m²
   *  je Raum — und die Ampel stand auf „Belastbar · 0 Fehler · 3 Hinweise".
   *  In der Druckfassung kamen die Woerter „Annahme" und „angenommen" kein
   *  einziges Mal vor. Die Stufe dafuer gibt es laengst („Belastbar unter
   *  genannten Annahmen"); sie greift nur, wenn eine Zeile sich als Annahme
   *  ausweist. Diese Zeile ist es.
   *
   *  Sie ist eine ANNAHME und keine Aufgabe: schliessen laesst sie sich nur,
   *  indem die Flaechen am Plan abgegriffen werden. Deshalb Stufe „offen"
   *  mit annahme = true — sie zieht die Ampel auf „annahme", nicht auf gelb. */
  function pruefeVerteilteFlaechen(p) {
    const zahl = function (x, ers) {
      const v = Number(x);
      return Number.isFinite(v) ? v : (ers === undefined ? 0 : ers);
    };
    const de = function (x, n) {
      return (Math.round(zahl(x, 0) * Math.pow(10, n)) / Math.pow(10, n))
        .toFixed(n).replace(".", ",");
    };
    const raeume = ((p && p.raeume) || []).filter(function (r) {
      return r && (r.A_annahme === true
        || /verteil/i.test(String((r.herkunft || {}).flaeche_quelle || "")));
    });
    if (!raeume.length) return [];
    const alleR = ((p && p.raeume) || []).filter(function (r) {
      return r && zahl(r.A, 0) > 0;
    });
    let A_v = 0, A_g = 0, min = null, max = null;
    raeume.forEach(function (r) {
      const A = zahl(r.A, 0);
      A_v += A;
      if (min === null || A < min) min = A;
      if (max === null || A > max) max = A;
    });
    alleR.forEach(function (r) { A_g += zahl(r.A, 0); });
    const anteil = A_g > 0 ? Math.round(A_v / A_g * 100) : 100;
    const z = P("flaechen_verteilt", "Raumflächen verteilt, nicht gemessen",
      "offen",
      (raeume.length === 1 ? "Eine Raumfläche ist" : raeume.length
        + " Raumflächen sind")
      + " nicht im Plan angeschrieben, sondern aus der Außenbemaßung des "
      + "Geschosses nach Raumart VERTEILT — "
      + de(A_v, 2) + " m² von " + de(A_g, 2) + " m², also " + anteil
      + " Prozent der Fläche dieser Berechnung"
      + (min !== null && max !== null && raeume.length > 1
        ? " (je Raum " + de(min, 2) + " bis " + de(max, 2) + " m²)" : "")
      + ". Die Summe je Geschoss ist belegt, die Aufteilung auf die Räume "
      + "ist es nicht: die Gebäudeheizlast trägt, die raumweise Heizlast ist "
      + "eine Näherung und für die Auslegung einzelner Heizflächen zu "
      + "grob. Jede dieser Flächen läuft mit ihrer Spanne in der Bandbreite "
      + "mit und steht im Bericht als Annahme.",
      raeume.length);
    z.annahme = true;
    z.abhilfe = "Die Flächen am Plan abgreifen oder aus den Flächenstempeln "
      + "eintragen; eine Eingabe geht jeder Verteilung vor.";
    return [z];
  }

  /** RAUMARTEN, DIE AUS DEM NAMEN NICHT ZU LESEN WAREN.
   *
   *  An der Raumart hängt die Innentemperatur, und an ihr hängt die
   *  Temperaturdifferenz jeder Fläche des Raums. Erkennt die Zuordnung den
   *  Namen nicht, fällt sie auf „wohnen" mit 20,0 °C zurück — die sichere
   *  Seite, weil 20 °C die höhere Last ergibt als 15 °C. Gesagt hat das
   *  bisher niemand: der Rückfall stand nur als kleiner Vermerk in der
   *  Raumzeile, nicht in der Prüfliste und nicht im Bericht.
   *
   *  GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 26.08.2026): der
   *  Raum „KELLER" im Kellergeschoss wurde als Wohnraum mit 20 °C geführt,
   *  in der Druckfassung ohne jeden Vermerk. Ebenso „TRH" auf „260514
   *  Dumach 1" und „Halle" auf „P2211" — beide inzwischen erkannt, aber der
   *  nächste unbekannte Name kommt bestimmt.
   *
   *  Es ist eine ANNAHME, keine Aufgabe: nur wer den Plan sieht, weiß, was
   *  der Raum ist. Deshalb Stufe „offen" mit annahme = true. */
  function pruefeRaumarten(p) {
    const raeume = ((p && p.raeume) || []).filter(function (r) {
      return r && r.herkunft && r.herkunft.art_angenommen === true;
    });
    if (!raeume.length) return [];
    const namen = raeume.slice(0, 6).map(function (r) {
      return "„" + String((r.herkunft && r.herkunft.art_gelesen) || r.name
        || r.id || "Raum") + "“";
    }).join(", ") + (raeume.length > 6 ? " und weitere" : "");
    const z = P("raumart_angenommen", "Raumart aus dem Namen nicht erkannt",
      "offen",
      (raeume.length === 1 ? "Bei einem Raum (" : "Bei " + raeume.length
        + " Räumen (") + namen + ") gibt der Name die Nutzung nicht her. "
      + "Angesetzt ist deshalb die Raumart „Wohnen“ mit 20,0 °C — die "
      + "sichere Seite, weil eine zu hoch angesetzte Innentemperatur die "
      + "Anlage nicht zu klein rechnet. Trifft sie nicht zu, ist die "
      + "Heizlast dieser Räume zu groß: je 5 K Unterschied rund ein Sechstel "
      + "ihrer Transmission. Die Raumart steht im Raumbuch zur Auswahl.",
      raeume.length);
    z.annahme = true;
    z.abhilfe = "Die Raumart der genannten Räume im Raumbuch setzen.";
    return [z];
  }

  /** Maßstabsproben. Sie ersetzen die frühere Pflichtangabe der Wohnfläche:
   *  Türbreiten, Wanddicken, die Summenprobe der Maßkette und der Vergleich
   *  mehrerer Ketten stecken im Plan selbst und brauchen keine Eingabe. */
  function pruefeMassstab(p, e, o) {
    /* Eine ausdrueckliche Angabe gilt, auch wenn sie null ist. Der Rueckfall
       auf das Fenster greift nur, wenn der Schluessel gar nicht gesetzt ist.
       Grund: der Selbsttest lief im Bau in einem nackten node-Prozess ohne
       window.KERN_MASSSTABSPROBE und im Browser mit -- und fiel deshalb im
       Browser an fuenf Stellen durch, waehrend der Bau gruen meldete. Ein
       Selbsttest, dessen Urteil von der Umgebung abhaengt, sichert nichts. */
    const MP = (o && Object.prototype.hasOwnProperty.call(o, "massstabsprobe"))
      ? o.massstabsprobe
      : ((typeof window !== "undefined" && window.KERN_MASSSTABSPROBE) || null);
    if (!MP || !e || !e.raeume) return [];
    const res = MP.pruefe({
      kette: (p.plan && p.plan.masskette) || null,
      kandidaten_px_je_meter: (p.plan && p.plan.kandidaten_px_je_meter) || [],
      gemessen: (p.plan && p.plan.gemessen) || {},
      px_je_meter_aus_papier: p.plan && p.plan.px_je_meter_aus_papier,
      px_je_meter_aus_kette: p.plan && p.plan.px_je_meter_aus_kette,
      raeume: e.raeume,
      wohnflaeche: p.meta && p.meta.wohnflaeche,
      summe_raumflaechen: e.A_gesamt,
      flaechen_herkunft: flaechenHerkunft(p),
    });
    const raus = res.befunde.map(function (b) {
      return P("mass_" + b.id, b.titel,
        b.stufe === "sperre" ? "fehler" : (b.stufe === "hinweis" ? "hinweis" : "gut"),
        b.text, b.wert);
    });
    /* „KEIN MASSSTAB BETEILIGT" IST EIN BESTANDENES ERGEBNIS, kein offener
     * Punkt. Die Frage dieser Prüfung lautet: kann ein Maßstabsfehler die
     * Flächen verfälschen? Ist keine Fläche aus einem Plan gemessen — weil
     * sie als Text im Plan steht oder von Hand eingetragen ist —, dann lautet
     * die Antwort abschließend nein. Es gibt nichts zu tun und nichts
     * abzuhaken.
     * Bis hierher stand sie als „hinweis" und damit als offene Zeile. Das
     * traf JEDEN Plan mit Textstand, also die Mehrzahl, und auf jedem
     * Projekt dieselbe Zeile — genau die Sorte, die dazu erzieht, die ganze
     * Liste zu überblättern. Der Satz darunter bleibt vollständig stehen und
     * wird gedruckt; er nennt die Herkunft der Flächen und sagt, was
     * ungeprüft bleibt (ob der Plan den Bestand zeigt). Das ist eine Grenze
     * im Bericht, keine Aufgabe in der Liste.
     * Was die Prüfung findet, findet sie unverändert: „nicht belastbar"
     * bleibt Fehler, „einfach belegt" und „nur grob geprüft" bleiben
     * Hinweis — dort ist ein Maßstab beteiligt und eine zweite Angabe würde
     * ihn absichern. */
    raus.push(P("mass_guete", "Absicherung des Maßstabs",
      (res.guete === "abgesichert" || res.guete === "kein Maßstab beteiligt") ? "gut"
        : (res.guete === "nicht belastbar" ? "fehler" : "hinweis"),
      "Einstufung: " + res.guete + ". " + res.hinweis_guete));
    return raus;
  }

  /* ---------------------------------------------------------------------
   * 8  Zähler des Kontrollblatts
   * ---------------------------------------------------------------------
   * Das Kontrollblatt zählt, was FEHLEN könnte: nicht erkannte Räume,
   * übersehene Fenster, nicht angelegte unbeheizte Bereiche. Diese Befunde
   * gehören in dieselbe Zählung wie alles andere, sonst steht im Kopf eine
   * Zahl und im Blatt eine zweite.
   * ------------------------------------------------------------------ */
  function pruefeKontrollblatt(p, o) {
    const KB = o && o.kontrollblatt;
    if (!KB || typeof KB.zaehler !== "function") return [];
    let zn;
    try { zn = KB.zaehler(p, o) || []; }
    catch (x) {
      return [P("kb", "Zähler des Kontrollblatts", "warnung",
        "Die Zähler ließen sich nicht rechnen: " + String((x && x.message) || x))];
    }
    return zn.filter(function (z) { return z.stufe !== "gut"; }).map(function (z) {
      const x = P("kb_" + z.id, z.titel, z.stufe, z.text);
      x.gruppe = "kontrollblatt";
      x.kb_id = z.id;
      x.aufhebbar = z.aufhebbar !== false;
      if (z.bestaetigt) x.bestaetigt = z.bestaetigt;
      return x;
    });
  }

  /* ---------------------------------------------------------------------
   * Gesamtlauf
   * ------------------------------------------------------------------ */
  function pruefeAlles(p, e, opt) {
    const o = opt || {};
    let alle = [];
    if (o.kerne) alle = alle.concat(pruefeRechenkern(o.kerne));
    alle = alle.concat(pruefeVollstaendigkeit(p, o));
    alle = alle.concat(pruefeAnnahmen(p));
    alle = alle.concat(pruefePlanfreigabe(p, o));
    alle = alle.concat(pruefeMassstab(p, e, o));
    alle = alle.concat(pruefeMassstabVorbelegung(p));
    alle = alle.concat(pruefeVerteilteFlaechen(p));
    alle = alle.concat(pruefeRaumarten(p));
    if (e && !e.fehlerhaft) {
      alle = alle.concat(pruefeUWerte(p));
      alle = alle.concat(pruefeKlimaAngaben(p, o));
      alle = alle.concat(pruefeGeometrie(p, e));
      alle = alle.concat(pruefeStilleFehler(p, e));
      alle = alle.concat(pruefeZonenTemperatur(p, e));
      alle = alle.concat(pruefeRaumlasten(e));
      alle = alle.concat(pruefeQuervergleich(p, e, o.typologie));
      alle = alle.concat(pruefeUmschliessung(p, e));
      alle = alle.concat(pruefeWandUeberschuss(p, e));
      alle = alle.concat(pruefeHerkunft(p, e));
      // Meldungen des Rechenkerns übernehmen
      (e.warnungen || []).forEach(function (w, i) {
        alle.push(P("kernwarn_" + i, "Hinweis der Berechnung", "hinweis", w));
      });
    }
    alle = alle.concat(pruefeKontrollblatt(p, o));
    /* Erst jetzt, an genau einer Stelle: was der Bearbeiter zur Kenntnis
       genommen hat, zählt nicht mehr gegen ihn. */
    bestaetigungenAnwenden(p, alle);
    /* EINE STUFE WENIGER — Kundenwort 25.08.2026: was kein Fehler ist, ist
       ein Hinweis. Die Zulieferer dürfen "warnung" intern als Dringlichkeit
       behalten (Farbe, Ordnung im Kontrollblatt); nach außen — Zähler,
       Ampel, Listen, Bericht — heißt die Stufe hinweis. Fehler und offene
       Fragen laufen unverändert durch; keine Nutzereingabe wird berührt. */
    alle.forEach(function (x) { if (x.stufe === "warnung") x.stufe = "hinweis"; });
    /* DEZIMALKOMMA AM SAMMELPUNKT — Befund der Ziolkowski-Prüfung 25.08.2026:
       in den Hinweistexten standen „1289.7 Prozent", „36.8 W/m²", „0.91 1/m",
       während die Berichte längst mit Komma druckten. Die Texte entstehen in
       einem Dutzend Zulieferern über nackte Zahl-zu-Text-Umwandlung (f1/f2);
       jede Stelle einzeln umzubauen wäre Drift-Futter. Deshalb hier, an der
       einen Stelle, durch die jeder Text muss. Die Regel ersetzt nur klare
       Dezimalbrüche (1–2 Nachkommastellen, danach keine weitere Ziffer und
       kein Punkt): „20.592 W" (Tausenderpunkt, 3 Ziffern) und „25.08.2026"
       (Datum, Punkt dahinter) bleiben unberührt — der Selbsttest hält beide
       Gegenbeispiele fest. */
    alle.forEach(function (x) {
      ["text", "titel"].forEach(function (k) {
        if (typeof x[k] === "string" && x[k].indexOf(".") >= 0) {
          x[k] = x[k].replace(/(\d)\.(\d{1,2})(?![\d.])/g, "$1,$2");
        }
      });
    });
    const zaehl = { fehler: 0, warnung: 0, offen: 0, hinweis: 0, bestaetigt: 0, gut: 0 };
    alle.forEach(function (x) { zaehl[x.stufe] = (zaehl[x.stufe] || 0) + 1; });
    const offen = zaehl.fehler + zaehl.warnung + zaehl.offen + zaehl.hinweis;
    /* VIER STUFEN STATT DREI.
     *
     * Drei Stufen konnten den häufigsten Zustand dieses Werkzeugs nicht
     * benennen: eine Rechnung, an der nichts falsch ist, die aber auf
     * ausgewiesenen Annahmen steht. Sie war entweder rot („nicht belastbar",
     * obwohl sie trägt) oder gelb („mit Einschränkung", was nach Mangel
     * klingt und nicht sagt, worin die Einschränkung besteht).
     *
     * Die vierte Stufe heißt „annahme" und sagt genau das, was der Fall ist:
     * belastbar, solange die genannten Annahmen gelten. Sie greift nur, wenn
     * KEIN Fehler offen ist und keine offene Frage unbeantwortet steht.
     *
     * HINWEISE HALTEN DIE FREIGABE NICHT AUF (Kundenwort 25.08.2026): ein
     * Hinweis ordnet vorhandene Werte ein und ist keine offene Aufgabe.
     * Gelb bleibt für das, was wirklich offen ist — eine Frage, die nur
     * ein Mensch am Plan beantworten kann (Stufe „offen") und die keine
     * ausgewiesene Annahme ist. Rot bleibt allein den Fehlern. */
    const offeneNichtAnnahme = alle.filter(function (x) {
      if (x.stufe !== "offen") return false;
      return !(x.annahme === true || x.id === "herkunft");
    });
    const annahmenDa = alle.some(function (x) {
      return x.annahme === true && (x.stufe === "hinweis" || x.stufe === "offen");
    });
    const ampel = zaehl.fehler ? "rot"
      : (offeneNichtAnnahme.length ? "gelb"
        : (annahmenDa ? "annahme"
          : (zaehl.offen ? "gelb" : "gruen")));
    return {
      pruefungen: alle,
      zaehl: zaehl,
      ampel: ampel,
      /* Wie viele Annahmen die Zahl trägt — Kopf, Leiste und Bericht sagen
         dieselbe Zahl, weil sie dieselbe Quelle haben. */
      annahmen: alle.filter(function (x) { return x.annahme === true; }).length,
      belastbar: zaehl.fehler === 0,
      /* Der Zähler des Kontrollblatts: wie weit ist der Bearbeiter?
         "alles" ist die eine Bedingung, an der im Bericht die saubere
         Ausgabe hängt: jede Zeile, die das Werkzeug aufgeworfen hat, ist
         von einem Menschen durchgesehen. Sie steht hier und nicht im
         Bericht, damit Kopf und Bericht dieselbe Aussage benutzen. */
      bestaetigung: (function () {
        const st = bestaetigungsstand(alle);
        return { offen: offen, bestaetigt: zaehl.bestaetigt,
                 gesamt: offen + zaehl.bestaetigt,
                 alles: offen === 0 && zaehl.bestaetigt > 0,
                 namen: st.namen, stand: st.stand, tage: st.tage,
                 vermerke: st.vermerke };
      })(),
    };
  }

  /* ---------------------------------------------------------------------
   * Selbsttest des Prüfmoduls
   * ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];
    /* Alle Laeufe dieses Selbsttests gehen hierueber. Der Wrapper haelt die
       Massstabsprobe ausdruecklich heraus, damit das Urteil im Bau und im
       Browser dasselbe ist. Wer sie pruefen will, ruft pruefeAlles unmittelbar. */
    const pa = function (pp, ee, opt) {
      return pruefeAlles(pp, ee, Object.assign({ massstabsprobe: null }, opt || {}));
    };
    // leeres Projekt muss Fehler melden
    const r1 = pa({}, null, {});
    if (r1.ampel !== "rot") f.push("Leeres Projekt muss rot sein");
    if (r1.belastbar) f.push("Leeres Projekt darf nicht belastbar sein");

    // vollständiges Projekt ohne Auffälligkeiten
    const p2 = {
      meta: { bezeichnung: "Test", baujahr: 1936 },
      klima: { theta_e: -10, quelle: "Test" },
      bauteiltypen: [{ id: "t1", name: "Wand", U: 1.0, belegt: true }],
      raeume: [{ id: "r1", name: "Raum", we: "WE 1", A: 20, h: 2.5,
                 bauteile: [{ typ_id: "t1", A: 20 }] }],
    };
    /* Das Bauteil traegt hier U, theta_j und grenzt_an, weil es der
       Rechenkern auch liefert (siehe raumRechnen). Ohne diese Felder war die
       Attrappe unvollstaendiger als die Wirklichkeit, und eine Pruefung, die
       den fehlenden U-Wert sucht, haette an der Attrappe angeschlagen statt
       am Projekt. */
    const e2 = {
      A_gesamt: 20, phi_gebaeude: 2300, spez_wohnflaeche: 115,
      klima: { theta_e: -10 },
      raeume: [{ id: "r1", raum: "Raum", A: 20, h: 2.5, theta_i: 20,
        spez: 115, bauteile: [{ kat: "huelle", A: 20, U: 1.0, phi: 900, theta_j: -10,
          annahme: false, grenzt_an: { typ: "aussen" } }] }],
      warnungen: [],
    };
    const typo = { erwarteteHeizlast: function () { return 115; },
                   zumBaujahr: function () { return { u: { wand: 1.7, dach: 1.4, fenster: 2.8 } }; } };
    const r2 = pa(p2, e2, { typologie: typo });

    /* Faellt der Erwartungswert weg -- Neubau hinter dem Ende der Typologie,
       Nichtwohngebaeude --, darf der Quervergleich nicht schweigend
       ausfallen. Sonst steht eine gruene Ampel da, hinter der eine Probe
       weniger steckt, und niemand sieht es. */
    const typoOhne = {
      erwarteteHeizlast: function () { return null; },
      zumBaujahr: function () {
        return { u: {}, gilt: false, grund: "ausserhalb_geltung", geltung_bis: 2022,
                 fundstelle: "Baujahr 2026 liegt hinter dem Ende dieser Tabelle (2022)." };
      },
    };
    const rOhne = pa(p2, e2, { typologie: typoOhne });
    const querOhne = rOhne.pruefungen.find(function (x) { return x.id === "quer"; });
    if (!querOhne) {
      f.push("Ohne Erwartungswert faellt der Quervergleich stillschweigend aus");
    } else {
      if (querOhne.stufe !== "hinweis") {
        f.push("Der Ausfall des Quervergleichs ist ein Hinweis, ist: " + querOhne.stufe);
      }
      if (!/hinter dem Ende der hinterlegten Gebäudetypologie \(2022\)/.test(querOhne.text)) {
        f.push("Der Ausfall muss seinen Grund nennen, ist: " + querOhne.text);
      }
      if (!/nur gegen sich selbst geprüft/.test(querOhne.text)) {
        f.push("Der Ausfall muss sagen, was dadurch fehlt");
      }
    }
    if (r2.ampel !== "gruen") {
      f.push("Sauberes Projekt muss grün sein, ist " + r2.ampel + ": "
        + r2.pruefungen.filter((x) => x.stufe !== "gut").map((x) => x.titel).join(", "));
    }
    /* --- Verteilte Raumflaechen: gruen wird zu „unter Annahmen" -------- */
    /* GEMESSEN am Blatt „Bauantrag Soethe 1312.2021.pdf": 13 von 13
       Raumflaechen verteilt, Ampel trotzdem „Belastbar · 0 Fehler". */
    const pV = JSON.parse(JSON.stringify(p2));
    pV.raeume[0].A_annahme = true;
    const rV = pa(pV, e2, { typologie: typo });
    const zV = rV.pruefungen.find(function (x) { return x.id === "flaechen_verteilt"; });
    if (!zV) {
      f.push("Eine verteilte Raumflaeche muss als Annahme in der Pruefliste stehen");
    } else {
      if (zV.annahme !== true) f.push("Die verteilte Flaeche ist eine Annahme");
      if (!/100 Prozent/.test(zV.text)) {
        f.push("Die Zeile muss den Anteil nennen, ist: " + zV.text);
      }
    }
    if (rV.ampel !== "annahme") {
      f.push("Verteilte Raumflaechen duerfen nicht gruen sein, sind: " + rV.ampel);
    }
    /* --- Raumart nicht erkannt: benannte Annahme statt stiller 20 °C --- */
    const pA = JSON.parse(JSON.stringify(p2));
    pA.raeume[0].herkunft = { art_angenommen: true, art_gelesen: "KELLER" };
    const rA = pa(pA, e2, { typologie: typo });
    const zA = rA.pruefungen.find(function (x) { return x.id === "raumart_angenommen"; });
    if (!zA || zA.annahme !== true) {
      f.push("Eine nicht erkannte Raumart muss als Annahme in der Pruefliste stehen");
    } else if (!/KELLER/.test(zA.text)) {
      f.push("Die Zeile muss den gelesenen Namen nennen, ist: " + zA.text);
    }
    if (rA.ampel !== "annahme") {
      f.push("Eine angenommene Raumart darf nicht gruen sein, ist: " + rA.ampel);
    }
    if (r2.pruefungen.some(function (x) { return x.id === "raumart_angenommen"; })) {
      f.push("Ohne angenommene Raumart darf die Zeile nicht entstehen");
    }

    /* Gegenprobe: ohne verteilte Flaeche bleibt es gruen (r2 oben). */
    const zV0 = r2.pruefungen.find(function (x) { return x.id === "flaechen_verteilt"; });
    if (zV0) f.push("Ohne Verteilung darf die Zeile nicht entstehen");
    const quer = r2.pruefungen.find((x) => x.id === "quer");
    if (!quer || quer.stufe !== "gut") f.push("Quervergleich bei Übereinstimmung muss gut sein");

    // starke Abweichung muss auffallen
    const e3 = JSON.parse(JSON.stringify(e2));
    e3.phi_gebaeude = 6000;                      // 300 W/m² gegen 115 erwartet
    e3.spez_wohnflaeche = 300;
    e3.raeume[0].spez = 300;
    const r3 = pa(p2, e3, { typologie: typo });
    const quer3 = r3.pruefungen.find((x) => x.id === "quer");
    if (!quer3 || quer3.stufe !== "hinweis") f.push("Starke Abweichung muss einen Hinweis geben");

    /* ---------------------------------------------------------------
       DER ZIRKELSCHLUSS. Kommt der Sollwert aus derselben Annahme wie der
       Istwert, darf die Zeile nicht gruen melden. Geprueft wird beides:
       dass sie bei angenommenem Baujahr umschlaegt, UND dass sie bei
       belegtem Baujahr unveraendert traegt. Ein Befund, der immer
       anschlaegt, ist so wertlos wie einer, der nie anschlaegt.
       -------------------------------------------------------------- */
    const eTypo = JSON.parse(JSON.stringify(e2));
    eTypo.raeume[0].bauteile[0].typologie = true;
    eTypo.raeume[0].bauteile[0].annahme = true;
    const pAnnahme = JSON.parse(JSON.stringify(p2));
    pAnnahme.annahmen = { baujahr: { pfad: "meta.baujahr", wert: 1936,
      kurz: "Baujahr 1936 aus dem Plandatum angenommen" } };
    const rZ = pa(pAnnahme, eTypo, { typologie: typo });
    const querZ = rZ.pruefungen.find(function (x) { return x.id === "quer"; });
    if (!querZ) {
      f.push("Zirkelschluss: der Quervergleich fehlt ganz");
    } else {
      if (querZ.stufe !== "hinweis") {
        f.push("Zirkelschluss muss ein Hinweis sein, ist: " + querZ.stufe);
      }
      if (querZ.zahl && querZ.zahl.unabhaengig !== false) {
        f.push("Zirkelschluss muss unabhaengig=false tragen");
      }
      if (!/BELEGT NICHTS/.test(querZ.text)) {
        f.push("Zirkelschluss muss im Klartext sagen, dass die Abweichung nichts belegt");
      }
      if (!/derselben Annahme/.test(querZ.text)) {
        f.push("Zirkelschluss muss die gemeinsame Quelle benennen");
      }
      /* Die Zahlen bleiben stehen. Wegzulassen waere kein ehrlicherer
         Umgang, sondern nur ein leiserer. */
      if (!/31|115|W\/m²/.test(querZ.text)) {
        f.push("Auch die unbrauchbare Zeile muss ihre Zahlen zeigen");
      }
    }
    if (rZ.ampel === "gruen") {
      f.push("Ein Ergebnis mit ungeprueftem angenommenem Baujahr darf nicht gruen sein");
    }
    /* Gegenprobe: belegtes Baujahr, dieselben Typologie-Bauteile. */
    const rB = pa(p2, eTypo, { typologie: typo });
    const querB = rB.pruefungen.find(function (x) { return x.id === "quer"; });
    if (!querB || querB.stufe !== "gut") {
      f.push("Mit belegtem Baujahr traegt der Quervergleich weiter, ist: "
        + (querB && querB.stufe));
    }
    if (querB && !/Das Baujahr ist belegt/.test(querB.text)) {
      f.push("Auch bei belegtem Baujahr muss die gemeinsame Quelle genannt sein");
    }
    if (querB && querB.zahl && querB.zahl.unabhaengig !== false) {
      f.push("Auch mit belegtem Baujahr teilen Soll und Ist die Baualtersklasse");
    }

    /* ---------------------------------------------------------------
       HUELLFLAECHE GEGEN VOLUMEN. Die einzige Probe ohne Baujahr. Ihr
       Sollwert ist die isoperimetrische Schranke, also Mathematik, kein
       Erfahrungswert. Geprueft wird, dass sie eine unmoegliche Geometrie
       findet und eine moegliche durchlaesst.
       -------------------------------------------------------------- */
    const huell = function (A, V) {
      const ee = JSON.parse(JSON.stringify(e2));
      ee.V_gesamt = V;
      ee.raeume[0].bauteile = [{ kat: "huelle", A: A, U: 1.0, phi: 900,
        theta_j: -10, annahme: false, grenzt_an: { typ: "aussen" } }];
      const rr = pa(p2, ee, { typologie: typo });
      return rr.pruefungen.find(function (x) { return x.id === "huellflaeche"; });
    };
    /* V = 1000 m³: Kugel 483,6 m², Wuerfel 600 m². */
    const hKlein = huell(300, 1000);
    if (!hKlein || hKlein.stufe !== "fehler") {
      f.push("Unter der Kugelschranke muss ein Fehler stehen, ist: "
        + (hKlein && hKlein.stufe));
    }
    if (hKlein && !/unmöglich/.test(hKlein.text)) {
      f.push("Die Kugelschranke muss als Unmoeglichkeit benannt sein");
    }
    const hMittel = huell(550, 1000);
    if (!hMittel || hMittel.stufe !== "hinweis") {
      f.push("Zwischen Kugel und Wuerfel gehoert ein Hinweis, ist: "
        + (hMittel && hMittel.stufe));
    }
    const hGross = huell(900, 1000);
    if (!hGross || hGross.stufe !== "gut") {
      f.push("Eine moegliche Geometrie muss durchgehen, ist: "
        + (hGross && hGross.stufe));
    }
    if (hGross && !/kein Baujahr/.test(hGross.text)) {
      f.push("Die Probe muss sagen, dass sie ohne Baujahr auskommt");
    }
    /* ---------------------------------------------------------------
       KLIMA: DERSELBE ZIRKEL. Ohne eingetragene Postleitzahl stammt die
       Norm-Aussentemperatur aus derselben Tabelle, gegen die geprueft
       wird. Dann darf keine gruene Zeile stehen -- und mit eingetragener
       Postleitzahl muss sie stehenbleiben.
       -------------------------------------------------------------- */
    const DKa = { pruefeKlima: function () { return []; } };
    const pKlAn = JSON.parse(JSON.stringify(p2));
    pKlAn.meta.plz = "";
    pKlAn.klima.angenommen = true;
    const rKlAn = pa(pKlAn, e2, { typologie: typo, klima: DKa });
    const klAn = rKlAn.pruefungen.find(function (x) { return x.id === "klima"; });
    if (!klAn || klAn.stufe !== "hinweis") {
      f.push("Angenommenes Klima ohne PLZ darf nicht gruen sein, ist: "
        + (klAn && klAn.stufe));
    }
    if (klAn && !/dieselbe Zahl zweimal/.test(klAn.text)) {
      f.push("Die Klimazeile muss den Zirkel beim Namen nennen");
    }
    const pKlBel = JSON.parse(JSON.stringify(p2));
    pKlBel.meta.plz = "33098";
    const rKlBel = pa(pKlBel, e2, { typologie: typo, klima: DKa });
    const klBel = rKlBel.pruefungen.find(function (x) { return x.id === "klima"; });
    if (!klBel || klBel.stufe !== "gut") {
      f.push("Mit eingetragener PLZ bleibt die Klimazeile ein Befund, ist: "
        + (klBel && klBel.stufe));
    }
    if (klBel && !/unabhängige Größen/.test(klBel.text)) {
      f.push("Die gruene Klimazeile muss sagen, warum sie ein Vergleich ist");
    }

    /* Ohne Volumen keine Aussage -- und kein stiller gruener Haken. */
    const eOhneV = JSON.parse(JSON.stringify(e2));
    const rOhneV = pa(p2, eOhneV, { typologie: typo });
    if (rOhneV.pruefungen.some(function (x) { return x.id === "huellflaeche"; })) {
      f.push("Ohne Volumen darf die Huellflaechenprobe nicht erscheinen");
    }

    // U-Wert-Grenzen
    const p4 = JSON.parse(JSON.stringify(p2));
    p4.bauteiltypen[0].U = 9;
    const r4 = pa(p4, e2, {});
    if (!r4.pruefungen.some((x) => x.id.indexOf("uhi_") === 0)) f.push("U-Wert 9 muss auffallen");
    p4.bauteiltypen[0].U = 0;
    const r5 = pa(p4, e2, {});
    if (r5.belastbar) f.push("U-Wert 0 muss ein Fehler sein");

    // fehlende Einheit
    const p6 = JSON.parse(JSON.stringify(p2));
    p6.raeume[0].we = "";
    const r6 = pa(p6, e2, {});
    if (r6.belastbar) f.push("Raum ohne Einheit muss ein Fehler sein");

    // Annahmenanteil
    const e7 = JSON.parse(JSON.stringify(e2));
    e7.raeume[0].bauteile[0].annahme = true;
    const r7 = pa(p2, e7, {});
    const h = r7.pruefungen.find((x) => x.id === "herkunft");
    if (!h || h.stufe !== "hinweis") f.push("100 % Annahmen müssen einen Hinweis geben");

    // saniertes Gebäude: halbe U-Werte, halbe Heizlast -> darf nicht warnen
    const e8 = {
      A_gesamt: 100, phi_gebaeude: 5750, spez_wohnflaeche: 57.5, raeume: [{ id: "r1", raum: "R", A: 100, h: 2.5, spez: 57.5,
        bauteile: [{ kat: "huelle", name: "Außenwand", A: 150, U: 0.85, phi: 3000, annahme: false }] }],
      warnungen: [],
    };
    const p8 = JSON.parse(JSON.stringify(p2));
    p8.raeume[0].A = 100;
    const r8 = pa(p8, e8, { typologie: typo });
    const q8 = r8.pruefungen.find(function (x) { return x.id === "quer"; });
    if (!q8) f.push("Quervergleich fehlt beim Sanierungsfall");
    else if (!q8.zahl.angepasst) f.push("Sanierungsstand wurde nicht erkannt");
    else if (q8.stufe !== "gut") {
      f.push("Saniertes Gebäude darf nicht auffallen: " + q8.text);
    }

    // ohne Wohnfläche darf nicht verglichen, sondern muss gemeldet werden
    const e9 = JSON.parse(JSON.stringify(e2));
    delete e9.spez_wohnflaeche;
    const q9 = pa(p2, e9, { typologie: typo })
      .pruefungen.find(function (x) { return x.id === "quer"; });
    if (!q9 || q9.zahl.auf_wohnflaeche !== false
        || q9.text.indexOf("Summe der Raumflächen") < 0) {
      f.push("Ohne Wohnfläche muss der abweichende Bezug im Befund stehen");
    }

    /* --- Bestätigungen ------------------------------------------------ */
    /* Ein bestätigter Fehler darf die Ampel nicht mehr halten. Das ist der
       Fall, an dem sich das Werkzeug bisher gegen den Bearbeiter gestellt
       hat: bestätigt und trotzdem „Nicht belastbar". */
    const p20 = JSON.parse(JSON.stringify(p2));
    p20.bauteiltypen[0].U = 0;
    const vorher = pa(p20, e2, {});
    if (vorher.belastbar) f.push("U-Wert 0 muss zunächst sperren");
    const eg = bestaetigungEintragen(p20, "u0_t1",
      { wer: "Sebastian Hund", grund: "Bauteil ist ein Vorhang, kein Bauteil." });
    if (!eg.ok || !eg.eintrag.zeit || eg.eintrag.wer !== "Sebastian Hund") {
      f.push("Eine Bestätigung muss Zeitpunkt und Namen tragen");
    }
    const nachher = pa(p20, e2, {});
    if (!nachher.belastbar) f.push("Ein bestätigter Fehler darf nicht mehr sperren");
    if (nachher.ampel === "rot") f.push("Nach der Bestätigung darf die Ampel nicht rot sein");
    const bz = nachher.pruefungen.find((x) => x.id === "u0_t1");
    if (!bz || bz.stufe !== "bestaetigt" || bz.text.indexOf("Sebastian Hund") < 0) {
      f.push("Der bestätigte Befund muss sichtbar bleiben und den Namen tragen");
    }
    if (nachher.bestaetigung.bestaetigt !== 1) f.push("Der Zähler muss eine Bestätigung sehen");
    bestaetigungZuruecknehmen(p20, "u0_t1");
    if (pa(p20, e2, {}).belastbar) f.push("Zurückgenommen muss wieder sperren");

    /* Ein Klick ohne Vermerk genügt, ein Pflichtvermerk unter zehn Zeichen nicht. */
    if (!bestaetigungEintragen({}, "x", {}).ok) f.push("Ein Klick ohne Vermerk muss genügen");
    if (bestaetigungEintragen({}, "x", { grund: "kurz", grund_pflicht: true }).ok) {
      f.push("Ein Pflichtvermerk unter zehn Zeichen darf nicht durchgehen");
    }
    /* Das alte Format (reiner Text) muss weiter gelesen werden. */
    const p21 = JSON.parse(JSON.stringify(p2));
    p21.bauteiltypen[0].U = 0;
    p21.kontrollblatt = { aufgehoben: { u0_t1: "Am Objekt geprüft am 20.08.2026." } };
    if (!pa(p21, e2, {}).belastbar) f.push("Das alte Textformat muss weiter gelten");

    /* --- Zusammenführung mit dem Kontrollblatt ------------------------- */
    const attrappe = { zaehler: function () {
      return [{ id: "ohne_huelle", titel: "Räume ohne Bauteil zur Hülle",
                stufe: "fehler", text: "OG FLUR hat kein Bauteil gegen Außenluft." },
              { id: "raeume_EG", titel: "Räume in EG", stufe: "offen",
                text: "Wie viele Räume auf dem Plan stehen, weiß das Werkzeug nicht." },
              { id: "zonen", titel: "Unbeheizte Bereiche", stufe: "gut", text: "geprüft" }];
    } };
    const m1 = pa(p2, e2, { kontrollblatt: attrappe });
    if (m1.ampel !== "rot") f.push("Ein Zähler-Fehler muss die Ampel im Kopf rot machen");
    if (!m1.pruefungen.some((x) => x.id === "kb_ohne_huelle")) {
      f.push("Die Zähler des Kontrollblatts müssen in der Selbstprüfung stehen");
    }
    if (m1.pruefungen.some((x) => x.id === "kb_zonen")) {
      f.push("Bestandene Zähler brauchen keine zweite Zeile");
    }
    if (m1.zaehl.offen !== 1) f.push("Eine offene Frage muss als offen gezählt werden");
    const p22 = JSON.parse(JSON.stringify(p2));
    bestaetigungEintragen(p22, "ohne_huelle", { wer: "Sebastian Hund", grund: "Ist ein Flur." });
    bestaetigungEintragen(p22, "raeume_EG", { wer: "Sebastian Hund" });
    const m2 = pa(p22, e2, { kontrollblatt: attrappe });
    if (m2.ampel !== "gruen" || !m2.belastbar) {
      f.push("Alles bestätigt muss belastbar und grün sein, ist " + m2.ampel);
    }
    if (m2.bestaetigung.offen !== 0
        || m2.bestaetigung.bestaetigt !== m2.bestaetigung.gesamt) {
      f.push("Der Zähler „x von y bestätigt" + '"' + " muss aufgehen");
    }

    /* --- Hinweise dürfen nicht aufhalten ------------------------------
       Das Kontrollblatt beantwortet inzwischen selbst, was es beantworten
       kann, und stellt das Ergebnis als Hinweis ein statt als offene Frage:
       ein kleinerer Keller, ein Flur ohne Fenster, eine lückenlose
       Geschossfolge. Ein Hinweis ist zur Kenntnis, kein Mangel. Er darf die
       Ampel nicht von grün wegziehen und den Bericht nicht sperren — und er
       muss sich trotzdem zur Kenntnis nehmen lassen, denn der Bearbeiter
       will ihn abhaken und danach eine saubere Ausgabe sehen. */
    const nurHinweise = { zaehler: function () {
      return [{ id: "flaeche_KG", titel: "Flächensumme KG", stufe: "hinweis",
                text: "ANNAHME: der Keller ist nur teilweise unterkellert." },
              { id: "ohne_fenster_regel", titel: "Nebenräume ohne Fenster",
                stufe: "hinweis", text: "OG FLUR liegt innen." }];
    } };
    const m3 = pa(p2, e2, { kontrollblatt: nurHinweise });
    if (m3.ampel !== "gruen") f.push("Hinweise dürfen die Ampel nicht gelb machen");
    if (!m3.belastbar) f.push("Hinweise dürfen den Bericht nicht sperren");
    if (m3.zaehl.hinweis < 2) f.push("Hinweise des Kontrollblatts müssen ankommen");
    if (m3.bestaetigung.offen < 2) {
      f.push("Ein Hinweis muss zum Abhaken angeboten werden");
    }
    const p23 = JSON.parse(JSON.stringify(p2));
    bestaetigungEintragen(p23, "flaeche_KG", { wer: "Sebastian Hund" });
    bestaetigungEintragen(p23, "ohne_fenster_regel", { wer: "Sebastian Hund" });
    const m4 = pa(p23, e2, { kontrollblatt: nurHinweise });
    if (m4.zaehl.hinweis !== 0) f.push("Ein abgehakter Hinweis darf nicht Hinweis bleiben");
    if (m4.bestaetigung.offen !== 0) {
      f.push("Nach dem Abhaken darf keine Zeile mehr offen sein");
    }
    if (m4.ampel !== "gruen" || !m4.belastbar) {
      f.push("Alles abgehakt muss grün und belastbar sein");
    }

    /* --- Der Stand der Bestätigungen -----------------------------------
       Daran hängt im Bericht die saubere Ausgabe. "alles" darf erst wahr
       sein, wenn keine Zeile mehr offen ist UND wenigstens eine bestätigt
       wurde: ein Projekt ganz ohne Befund hat nichts durchgesehen und darf
       den Satz über die Durchsicht nicht tragen. */
    if (m3.bestaetigung.alles) {
      f.push("Solange Zeilen offen sind, darf „alles bestätigt" + '"' + " nicht gelten");
    }
    /* Der Fall, auf den es ankommt: einer abgehakt, einer noch offen. Ohne
       ihn geht auch ein "alles" durch, das nur zählt, ob ÜBERHAUPT etwas
       bestätigt wurde. Genau daran hängt im Bericht, ob die Hinweise
       verschwinden — bei einem einzigen Haken wären sie es fälschlich. */
    const p25 = JSON.parse(JSON.stringify(p2));
    bestaetigungEintragen(p25, "flaeche_KG", { wer: "Sebastian Hund" });
    const m6 = pa(p25, e2, { kontrollblatt: nurHinweise });
    if (m6.bestaetigung.bestaetigt !== 1 || m6.bestaetigung.offen !== 1) {
      f.push("Der Zwischenstand muss einen abgehakten und einen offenen Punkt sehen");
    }
    if (m6.bestaetigung.alles) {
      f.push("Ein Haken von zwei darf noch nicht „alles bestätigt" + '"' + " sein");
    }
    if (!m4.bestaetigung.alles) {
      f.push("Alles abgehakt muss „alles bestätigt" + '"' + " ergeben");
    }
    const ohneBefund = pa(p2, e2, {});
    if (ohneBefund.bestaetigung.alles) {
      f.push("Ein Projekt ohne jeden Befund hat nichts durchgesehen");
    }
    if (m4.bestaetigung.namen.join(",") !== "Sebastian Hund") {
      f.push("Der Stand muss den Namen des Bearbeiters führen, ist "
        + m4.bestaetigung.namen.join(","));
    }
    if (!/^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$/.test(String(m4.bestaetigung.stand))) {
      f.push("Der Stand muss ein deutsches Datum sein, ist " + m4.bestaetigung.stand);
    }
    /* Der Vermerk wird gezählt, der Klick ohne Vermerk nicht. m2 trägt genau
       einen Vermerk („Ist ein Flur."), die zweite Bestätigung keinen. */
    if (m2.bestaetigung.vermerke !== 1) {
      f.push("Nur Bestätigungen mit Vermerk dürfen als Vermerk zählen, sind "
        + m2.bestaetigung.vermerke);
    }
    /* Zwei Tage, zwei Namen: der jüngere Tag steht, beide Namen stehen. */
    const p24 = JSON.parse(JSON.stringify(p2));
    p24.bauteiltypen[0].U = 0;
    bestaetigungEintragen(p24, "u0_t1",
      { wer: "Anja Vogel", zeit: "2026-03-04 09:00", grund: "Am Objekt geprüft." });
    const m5 = pa(p24, e2, {});
    if (m5.bestaetigung.stand !== "04.03.2026") {
      f.push("Der Stand muss der jüngste Tag sein, ist " + m5.bestaetigung.stand);
    }
    if (m5.bestaetigung.tage !== 1) f.push("Ein Tag muss als ein Tag gezählt werden");
    /* Ein Eintrag im alten Format hat weder Namen noch Zeitpunkt. Dann darf
       nichts erfunden werden: die Felder bleiben leer. */
    const st6 = bestaetigungsstand([{ bestaetigt: { grund: "alt", zeit: "", wer: "" } }]);
    if (st6.stand !== null || st6.namen.length !== 0) {
      f.push("Ohne Datum und Namen darf der Stand nichts erfinden");
    }
    /* Und der angehängte Satz darf nicht über den Bericht sprechen: er wird
       im Bericht selbst gedruckt und zeigte dort auf sich selbst. */
    const bzText = m2.pruefungen.find(function (x) { return x.id === "kb_ohne_huelle"; });
    if (!bzText || bzText.text.indexOf("erscheint im Bericht") >= 0) {
      f.push("Der Vermerktext darf nicht auf den Bericht verweisen");
    }
    if (!bzText || bzText.text.indexOf("Vermerk: Ist ein Flur.") < 0) {
      f.push("Der Vermerk des Bearbeiters muss im Text stehen");
    }

    /* ------------------------------------------------------------------
     * Stille Fehler: eine Zahl steht da, und sie ist falsch
     * ------------------------------------------------------------------
     * Jeder Fall ist am laufenden Werkzeug gemessen worden, bevor er hier
     * steht. Die Zahl in Klammern ist die Heizlast, die dabei herauskam,
     * gegen 1.992 W desselben Projekts ohne den Fehler.
     * --------------------------------------------------------------- */
    function stillFall(bauteilAenderung, projektAenderung) {
      const pp = {
        meta: { bezeichnung: "Test", baujahr: 1936 },
        klima: { theta_e: -10, quelle: "Test" },
        zonen: [{ id: "keller", name: "Keller", modus: "fest", theta_fest: 5 }],
        bauteiltypen: [{ id: "t1", name: "Wand", U: 1.0, belegt: true }],
        raeume: [{ id: "r1", name: "Raum", we: "WE 1", A: 20, h: 2.5,
                   bauteile: [{ typ_id: "t1", A: 20 }] }],
      };
      const bt = { name: "Wand", kat: "huelle", A: 20, U: 1.0, phi: 900,
                   theta_j: -10, annahme: false, grenzt_an: { typ: "aussen" } };
      Object.assign(bt, bauteilAenderung || {});
      const ee = {
        A_gesamt: 20, phi_gebaeude: 2300, phi_V_gebaeude: 400, spez_wohnflaeche: 115,
        klima: { theta_e: -10 },
        raeume: [{ id: "r1", raum: "Raum", A: 20, h: 2.5, theta_i: 20, spez: 115,
                   bauteile: [bt] }],
        warnungen: [],
      };
      if (projektAenderung) projektAenderung(pp, ee);
      return { p: pp, e: ee, r: pa(pp, ee, {}) };
    }
    function hatBefund(erg, id, stufe) {
      const x = erg.pruefungen.find(function (y) { return y.id === id; });
      return !!x && x.stufe === stufe;
    }

    /* Der gesunde Fall zuerst: sonst prueft man nur, dass irgendetwas meckert. */
    const sauber = stillFall(null, null);
    if (!hatBefund(sauber.r, "still", "gut")) {
      f.push("Ein Projekt ohne stillen Fehler muss die Prüfung „ohne Wirkung“ bestehen");
    }

    /* 1  Huellbauteil mit Flaeche, aber ohne Waermestrom. Der gemessene
          Anlass: 84,8 m2 Boden und Dach gegen eine Zone auf 20,0 Grad C. */
    const s1 = stillFall({ phi: 0, theta_j: 20 });
    if (!hatBefund(s1.r, "bt_ohne_wirkung", "fehler")) {
      f.push("20 m² Hülle mit 0 W müssen ein Fehler sein, nicht „keine Auffälligkeiten“");
    }
    if (s1.r.belastbar) f.push("Ein Ergebnis mit wirkungsloser Hülle ist nicht belastbar");

    /* 2  Fast null zaehlt auch. 19,5 Grad C statt 20 sind 0,55 W/m2 -- eine
          Zahl, die dasteht und um mehr als neunzig Prozent zu niedrig ist. */
    const s2 = stillFall({ phi: 11, theta_j: 19.5 });
    if (!hatBefund(s2.r, "bt_ohne_wirkung", "fehler")) {
      f.push("0,55 W/m² müssen genauso auffallen wie glatt null");
    }

    /* 3  Und die Gegenprobe: das kleinste im Referenzprojekt vorkommende
          Verhaeltnis, 3,60 W/m2 (Bad gegen Wohnung), darf NICHT auffallen.
          Ohne diese Zeile waere die Schranke beliebig. */
    const s3 = stillFall({ kat: "innen", phi: 72, theta_j: 16 });
    if (hatBefund(s3.r, "bt_innen_ohne_wirkung", "hinweis")) {
      f.push("3,60 W/m² ist ein üblicher Wert und darf nicht als wirkungslos gelten");
    }

    /* 4  Innenbauteil zwischen gleich temperierten Raeumen: nach der Norm
          richtig, deshalb Hinweis und nicht Fehler. */
    const s4 = stillFall({ kat: "innen", phi: 0, theta_j: 20 });
    if (!hatBefund(s4.r, "bt_innen_ohne_wirkung", "hinweis")) {
      f.push("Ein wirkungsloses Innenbauteil muss als Hinweis erscheinen");
    }
    if (!s4.r.belastbar) f.push("Ein wirkungsloses Innenbauteil allein sperrt nicht");

    /* 5  Bauteil ohne Flaeche: steht im Bericht, überträgt nichts. */
    const s5 = stillFall({ A: 0, phi: 0 });
    if (!hatBefund(s5.r, "bt_a0", "fehler")) f.push("Ein Bauteil mit 0 m² muss auffallen");

    /* 6  Bauteil ohne U-Wert: der Bauteiltyp ist gelöscht, es bleibt der
          Waermebrueckenzuschlag. Gemessen 45 W statt 499 W. */
    const s6 = stillFall({ U: 0, phi: 45 });
    if (!hatBefund(s6.r, "bt_u0", "fehler")) f.push("Ein Bauteil ohne U-Wert muss auffallen");

    /* 7  Verweis auf einen unbeheizten Bereich, den es nicht gibt. Der Kern
          rechnet dann gegen Aussenluft: gemessen 2.847 W statt 1.992 W. */
    const s7 = stillFall({ grenzt_an: { typ: "zone", ref: "gibtsnicht" } });
    if (!hatBefund(s7.r, "bt_ins_leere", "fehler")) {
      f.push("Ein Bauteil an einem Bereich, den es nicht gibt, muss auffallen");
    }
    /* 7b  Und der vorhandene Bereich darf nicht mitgemeldet werden. */
    const s7b = stillFall({ grenzt_an: { typ: "zone", ref: "keller" }, theta_j: 5, phi: 330 });
    if (hatBefund(s7b.r, "bt_ins_leere", "fehler")) {
      f.push("Ein angelegter unbeheizter Bereich darf nicht als verloren gelten");
    }

    /* 8  Bauteil, das an den eigenen Raum grenzt. */
    const s8 = stillFall({ kat: "innen", grenzt_an: { typ: "raum", ref: "r1" }, phi: 0, theta_j: 20 });
    if (!hatBefund(s8.r, "bt_ins_leere", "fehler")) {
      f.push("Ein Bauteil gegen den eigenen Raum muss auffallen");
    }

    /* 9  Heizlast, die ueberwiegend aus Luftwechsel besteht. Gemessener
          Anlass: fünf Räume, 60,5 m², kein einziges Fenster angelegt. */
    const s9 = stillFall(null, function (pp, ee) {
      ee.phi_gebaeude = 1250; ee.phi_V_gebaeude = 791;
    });
    if (!hatBefund(s9.r, "lueftung_anteil", "hinweis")) {
      f.push("Eine Heizlast aus 63 % Lüftung muss einen Hinweis geben");
    }
    /* 9b  Der Referenzfall Mälzerstraße liegt bei 28,7 % und muss schweigen. */
    const s9b = stillFall(null, function (pp, ee) {
      ee.phi_gebaeude = 9052; ee.phi_V_gebaeude = 2598;
    });
    if (s9b.r.pruefungen.some(function (x) {
      return x.id === "lueftung_anteil" && x.stufe !== "gut";
    })) {
      f.push("28,7 % Lüftungsanteil ist üblich und darf nicht auffallen");
    }

    /* 10  Null Watt bei vorhandener Huelle ist keine Auslegung. */
    const s10 = stillFall({ phi: 0, theta_j: 20 }, function (pp, ee) {
      ee.phi_gebaeude = 0; ee.phi_V_gebaeude = 0;
    });
    if (!hatBefund(s10.r, "phi_null", "fehler")) {
      f.push("Null Watt bei 20 m² Hülle muss ein Fehler sein");
    }

    /* 10b  Eine gut gedaemmte Bodenplatte ist kein Fehler. Nachgerechnet
            fuer Paderborn: U_equiv 0,06 ergibt 0,86 W/m2. Mit der Schranke
            der Huelle waere das rot. */
    const s10b = stillFall({ kat: "erdreich", A: 20, U: 0.06, phi: 17.2, theta_j: 10.1 });
    if (hatBefund(s10b.r, "bt_ohne_wirkung", "fehler")) {
      f.push("Eine Passivhaus-Bodenplatte mit 0,86 W/m² darf kein Fehler sein");
    }
    /* Eine erdberuehrte Flaeche, die tatsaechlich nichts liefert, schon. */
    const s10c = stillFall({ kat: "erdreich", A: 20, U: 0.3, phi: 0, theta_j: 20 });
    if (!hatBefund(s10c.r, "bt_ohne_wirkung", "fehler")) {
      f.push("Eine erdberührte Fläche mit 0 W muss auffallen");
    }

    /* 11b  Die Massstabsprobe darf das Urteil nicht von der Umgebung
            abhaengig machen. Gemessen: im Bau lief der Selbsttest in einem
            nackten node-Prozess und meldete gruen, im Browser lag
            window.KERN_MASSSTABSPROBE vor und fuenf Zeilen fielen durch. */
    const massAttrappe = { pruefe: function () {
      return { befunde: [], guete: "grob geprüft", hinweis_guete: "nur überschlägig." };
    } };
    const ohneMass = pruefeAlles(p2, e2, { massstabsprobe: null });
    if (ohneMass.pruefungen.some(function (x) { return /^mass_/.test(x.id); })) {
      f.push("Ohne Maßstabsprobe darf keine Maßstabszeile entstehen");
    }
    const mitMass = pruefeAlles(p2, e2, { massstabsprobe: massAttrappe });
    if (!mitMass.pruefungen.some(function (x) { return x.id === "mass_guete"; })) {
      f.push("Mit Maßstabsprobe muss die Güte des Maßstabs erscheinen");
    }
    /* Und die Kernaussage: dieselben Eingaben, dasselbe Urteil -- gleich ob
       ein Fenster mit Modulen danebensteht oder nicht. */
    if (ohneMass.zaehl.fehler !== mitMass.zaehl.fehler) {
      f.push("Die Zahl der Fehler darf nicht davon abhängen, ob die Maßstabsprobe geladen ist");
    }

    /* 11c  Die Herkunft der Flächen wird richtig gezählt und weitergereicht.
            Gemessen an Dumach 1: alle 25 Räume kamen aus dem Textstand der
            Zeichnung, und die Maßstabsprobe schrieb trotzdem "von Hand
            eingetragen" in den Bericht. */
    const hkStempel = flaechenHerkunft({ raeume: [
      { herkunft: { quelle: "Flächenstempel im Plan" } },
      { herkunft: { flaeche_quelle: "im Plan angeschrieben, aus dem Textstand "
        + "der Zeichnung gelesen („45,96 m²“)" } },
    ] });
    if (hkStempel.textstand !== 2 || hkStempel.hand !== 0) {
      f.push("Flächen aus dem Plan dürfen nicht als Handeingabe zählen: "
        + JSON.stringify(hkStempel));
    }
    const hkGemischt = flaechenHerkunft({ raeume: [
      { herkunft: { quelle: "Flächenstempel im Plan" } },
      { herkunft: { umfang_m: 12.4, flaeche_quelle: "im Plan umfahren" } },
      { herkunft: {} }, {},
    ] });
    if (hkGemischt.textstand !== 1 || hkGemischt.gemessen !== 1
        || hkGemischt.hand !== 2) {
      f.push("Drei Herkünfte müssen getrennt gezählt werden: "
        + JSON.stringify(hkGemischt));
    }
    let gereicht = null;
    const massHorcher = { pruefe: function (ein) {
      gereicht = ein.flaechen_herkunft;
      return { befunde: [], guete: "kein Maßstab beteiligt", hinweis_guete: "x" };
    } };
    pruefeAlles(Object.assign({}, p2, { raeume: [
      { name: "A", A: 20, h: 2.5, herkunft: { quelle: "Flächenstempel im Plan" } }] }),
      e2, { massstabsprobe: massHorcher });
    if (!gereicht || gereicht.textstand !== 1) {
      f.push("Die Herkunft der Flächen muss an die Maßstabsprobe gehen, ist: "
        + JSON.stringify(gereicht));
    }

    /* 11c2 „Kein Maßstab beteiligt" ist ein BESTANDENES Ergebnis.
            Die Prüfung fragt, ob ein Maßstabsfehler die Flächen verfälschen
            kann. Ist keine Fläche gemessen, lautet die Antwort abschließend
            nein — es gibt nichts zu tun und nichts abzuhaken. Vorher stand
            das als Hinweis und damit als offene Zeile, auf jedem Plan mit
            Textstand, also auf der Mehrzahl. Was die Prüfung findet, findet
            sie unverändert: die drei anderen Einstufungen behalten ihre
            Stufe. */
    const guetestufe = function (guete) {
      const horcher = { pruefe: function () {
        return { befunde: [], guete: guete, hinweis_guete: "x" }; } };
      const r = pruefeAlles(p2, e2, { massstabsprobe: horcher });
      const x = r.pruefungen.find(function (y) { return y.id === "mass_guete"; });
      return x ? x.stufe : null;
    };
    if (guetestufe("kein Maßstab beteiligt") !== "gut") {
      f.push("Ohne beteiligten Maßstab ist die Maßstabsprüfung bestanden, ist: "
        + guetestufe("kein Maßstab beteiligt"));
    }
    if (guetestufe("abgesichert") !== "gut") {
      f.push("Ein abgesicherter Maßstab bleibt bestanden");
    }
    if (guetestufe("nicht belastbar") !== "fehler") {
      f.push("Ein nicht belastbarer Maßstab bleibt ein Fehler");
    }
    if (guetestufe("nur grob geprüft") !== "hinweis") {
      f.push("Ein nur grob geprüfter Maßstab bleibt ein Hinweis: dort IST ein "
        + "Maßstab beteiligt und eine zweite Angabe würde ihn absichern");
    }
    if (guetestufe("einfach belegt") !== "hinweis") {
      f.push("Ein einfach belegter Maßstab bleibt ein Hinweis");
    }

    /* 11d  Raum ohne Bauteil: Fehler, aber nicht beim innenliegenden Flur
            auf einem Zwischengeschoss. Das Zuordnungsmodul wird ausdrücklich
            übergeben, damit das Urteil nicht davon abhängt, ob ein Fenster
            danebensteht. */
    const zuoAttrappe = { innenraumZulaessig: function (r, gs) {
      return { ja: r.art === "flur" && r.geschoss === "og" && gs.length >= 3,
               grund: "Attrappe" };
    } };
    const pOhneBt = { meta: { bezeichnung: "X", baujahr: 1990 },
      klima: { theta_e: -10, quelle: "q" }, bauteiltypen: [{ id: "t", name: "Wand" }],
      raeume: [
        { name: "Flur", art: "flur", geschoss: "og", A: 6, h: 2.5, we: "WE 1",
          bauteile: [] },
        { name: "Wohnen", art: "wohnen", geschoss: "og", A: 20, h: 2.5, we: "WE 1",
          bauteile: [] },
        { name: "Bad", art: "bad", geschoss: "eg", A: 8, h: 2.5, we: "WE 1",
          bauteile: [{ A: 5, kat: "huelle" }] },
        { name: "Studio", art: "wohnen", geschoss: "dg", A: 30, h: 2.5, we: "WE 1",
          bauteile: [{ A: 5, kat: "huelle" }] }] };
    const vOhne = pruefeVollstaendigkeit(pOhneBt, { zuordnung: zuoAttrappe });
    const btF = vOhne.find(function (x) { return x.id === "btzu"; });
    const btI = vOhne.find(function (x) { return x.id === "btzu_innen"; });
    if (!btF || btF.stufe !== "fehler" || !/Wohnen/.test(btF.text)) {
      f.push("Ein Wohnraum ohne Bauteil bleibt ein Fehler");
    }
    if (btF && /Flur/.test(btF.text)) {
      f.push("Der innenliegende Flur gehört nicht in die Fehlerzeile");
    }
    if (!btI || btI.stufe !== "gut" || !/Flur/.test(btI.text)) {
      f.push("Der innenliegende Flur muss als Feststellung erscheinen, nicht als "
        + "offene Zeile: die Lage beurteilt das Kontrollblatt, und dort steht sie "
        + "mit Begründung");
    }
    if (btI && /Räume, der üblicherweise/.test(btI.text)) {
      f.push("Zahlform: „Räume, die üblicherweise innen liegen“");
    }
    /* Zwei gleichnamige Flure muessen unterscheidbar genannt werden. */
    const pZwei = JSON.parse(JSON.stringify(pOhneBt));
    pZwei.raeume = [{ name: "Flur", art: "flur", geschoss: "og", A: 6.86, h: 2.5,
                      we: "WE 1", bauteile: [] },
                    { name: "Flur", art: "flur", geschoss: "og", A: 7.52, h: 2.5,
                      we: "WE 1", bauteile: [] },
                    { name: "Bad", art: "bad", geschoss: "eg", A: 8, h: 2.5,
                      we: "WE 1", bauteile: [{ A: 5, kat: "huelle" }] },
                    { name: "Studio", art: "wohnen", geschoss: "dg", A: 30, h: 2.5,
                      we: "WE 1", bauteile: [{ A: 5, kat: "huelle" }] }];
    const btZwei = pruefeVollstaendigkeit(pZwei, { zuordnung: zuoAttrappe })
      .find(function (x) { return x.id === "btzu_innen"; });
    if (!btZwei || !/6,86/.test(btZwei.text) || !/7,52/.test(btZwei.text)) {
      f.push("Gleichnamige Flure brauchen ihre Fläche: " + (btZwei && btZwei.text));
    }
    /* Ohne Zuordnungsmodul bleibt alles ein Fehler — kein stiller Ausfall. */
    const vRoh = pruefeVollstaendigkeit(pOhneBt, { zuordnung: null });
    const btRoh = vRoh.find(function (x) { return x.id === "btzu"; });
    if (!btRoh || !/Flur/.test(btRoh.text) || !/Wohnen/.test(btRoh.text)) {
      f.push("Ohne Zuordnungsmodul zählen beide Räume als Fehler");
    }
    if (vRoh.some(function (x) { return x.id === "btzu_innen"; })) {
      f.push("Ohne Zuordnungsmodul darf keine Ausnahme entstehen");
    }

    /* 11a  Klimadaten: die Tabelle widerspricht der Eingabe.
            Gemessen: PLZ 33098 fuehrt -9,6 Grad C. Von Hand eingetragene
            -18,0 Grad C ergaben 1.429 W statt 1.019 W, und die
            Selbstpruefung schwieg, weil pruefeKlima nur unter dem
            Eingabefeld stand. */
    const klimaAttrappe = {
      pruefeKlima: function (k, plz) {
        if (plz === "33098" && k && k.theta_e === -18) {
          return [{ stufe: "warnung", text: "Eingetragen sind -18 Grad C, die Tabelle "
            + "führt für PLZ 33098 Paderborn aber -9.6 Grad C." }];
        }
        return [];
      },
    };
    const p30 = JSON.parse(JSON.stringify(p2));
    p30.meta.plz = "33098";
    p30.klima = { theta_e: -18, quelle: "von Hand" };
    const m30 = pa(p30, e2, { klima: klimaAttrappe });
    const kl = m30.pruefungen.find(function (x) { return x.id === "klima_0"; });
    /* Die Attrappe liefert absichtlich die Zulieferer-Stufe "warnung":
       genau dieser Weg muss am Sammelpunkt zum Hinweis werden. */
    if (!kl || kl.stufe !== "hinweis") {
      f.push("Eine Norm-Außentemperatur gegen die Tabelle muss als Hinweis "
        + "in der Selbstprüfung stehen, ist: " + (kl && kl.stufe));
    }
    /* Der Zulieferer schreibt "-9.6" mit Punkt; der Sammelpunkt macht das
       Dezimalkomma daraus (Befund Ziolkowski 25.08.2026). */
    if (!kl || kl.text.indexOf("-9,6") < 0) {
      f.push("Der Tabellenwert muss im Befund genannt werden — mit Dezimalkomma");
    }
    if (kl && kl.text.indexOf("-9.6") >= 0) {
      f.push("Ein Dezimalpunkt darf den Sammelpunkt nicht passieren");
    }
    /* Stimmt sie, steht eine gute Zeile da -- und keine Warnung. */
    const p31 = JSON.parse(JSON.stringify(p2));
    p31.meta.plz = "33098";
    p31.klima = { theta_e: -9.6, quelle: "Tabelle" };
    const m31 = pa(p31, e2, { klima: klimaAttrappe });
    if (!m31.pruefungen.some(function (x) { return x.id === "klima" && x.stufe === "gut"; })) {
      f.push("Stimmige Klimadaten müssen als geprüft erscheinen");
    }
    /* Ohne Klimamodul darf nichts erfunden werden. */
    const m32 = pa(p31, e2, {});
    if (m32.pruefungen.some(function (x) { return /^klima/.test(x.id); })) {
      f.push("Ohne Klimamodul darf keine Klimazeile entstehen");
    }

    /* 10b  Dezimalkomma am Sammelpunkt: Dezimalbrüche werden deutsch,
       Tausenderpunkte und Daten bleiben unangetastet. */
    const eKom = JSON.parse(JSON.stringify(e2));
    eKom.warnungen = ["Massstab 38.5 bis 534.9 Pixel, Summe 20.592 W, "
      + "Stand 25.08.2026, Anteil 1289.7 Prozent, 0.91 1/m"];
    const mKom = pa(p31, eKom, {});
    const zKom = mKom.pruefungen.find(function (x) { return x.id === "kernwarn_0"; });
    if (!zKom) f.push("Die Kernwarnung muss als Zeile ankommen");
    else {
      if (zKom.text.indexOf("38,5 bis 534,9") < 0 || zKom.text.indexOf("1289,7") < 0
          || zKom.text.indexOf("0,91 1/m") < 0) {
        f.push("Dezimalbrüche müssen am Sammelpunkt zum Komma werden: " + zKom.text);
      }
      if (zKom.text.indexOf("20.592 W") < 0) {
        f.push("Ein Tausenderpunkt darf nicht zum Komma werden: " + zKom.text);
      }
      if (zKom.text.indexOf("25.08.2026") < 0) {
        f.push("Ein Datum darf nicht zum Komma werden: " + zKom.text);
      }
    }

    /* 10c  Abgeschnittener Auftraggeber: „… u." ist eine offene Frage und
       zieht die Ampel auf Gelb; ein vollständiger Name tut es nicht. */
    const pBh = JSON.parse(JSON.stringify(p2));
    pBh.meta.bauherr = "Christina Herzog u.";
    const mBh = pa(pBh, e2, {});
    const zBh = mBh.pruefungen.find(function (x) {
      return x.id === "bauherr_abgeschnitten"; });
    if (!zBh || zBh.stufe !== "offen") {
      f.push("Ein auf Bindewort endender Auftraggeber muss eine offene Frage sein");
    }
    if (mBh.ampel === "gruen" || mBh.ampel === "annahme") {
      f.push("Mit abgeschnittenem Auftraggeber darf die Ampel nicht "
        + mBh.ampel + " sein");
    }
    const pBh2 = JSON.parse(JSON.stringify(p2));
    pBh2.meta.bauherr = "Christina und Markus Herzog";
    if (pa(pBh2, e2, {}).pruefungen.some(function (x) {
      return x.id === "bauherr_abgeschnitten"; })) {
      f.push("Ein vollständiger Auftraggeber darf keine Frage auslösen");
    }

    /* 11  Raum ohne Hoehe: V = 0, damit faellt die Lueftung still weg. */
    const s11 = stillFall(null, function (pp, ee) { ee.raeume[0].h = 0; });
    if (!hatBefund(s11.r, "hoehe_r1", "fehler")) {
      f.push("Ein Raum ohne lichte Höhe muss ein Fehler sein, kein Hinweis");
    }

    /* 12  Annahmen: eigene Zeile, eigene Ampelstufe, keine Beschoenigung. */
    const pAn = JSON.parse(JSON.stringify(p2));
    pAn.annahmen = { baujahr: { wert: 1990, kurz: "Baujahr 1990 angenommen",
      begruendung: "Aus dem Plandatum abgeleitet.",
      richtung: "Ein aelteres Gebaeude ergaebe mehr." } };
    const rAn = pa(pAn, e2, { typologie: typo });
    const zAn = rAn.pruefungen.find(function (x) { return x.id === "annahme_baujahr"; });
    if (!zAn || zAn.stufe !== "hinweis" || zAn.annahme !== true) {
      f.push("Eine Annahme muss eine eigene, als Annahme gekennzeichnete "
        + "Hinweiszeile erzeugen");
    }
    if (zAn && zAn.text.indexOf("Aus dem Plandatum abgeleitet.") < 0) {
      f.push("Die Begruendung der Annahme muss in der Zeile stehen");
    }
    if (zAn && zAn.text.indexOf("Richtung des möglichen Fehlers") < 0) {
      f.push("Die Richtung des moeglichen Fehlers muss in der Zeile stehen");
    }
    if (rAn.ampel !== "annahme") {
      f.push("Nur Annahmen offen muss die Stufe annahme ergeben, ist " + rAn.ampel);
    }
    if (rAn.annahmen !== 1) f.push("Die Zahl der Annahmen muss mitgeliefert werden");
    /* Ein fremder HINWEIS (fehlende Quelle der Klimadaten) zieht die Stufe
       nicht mehr weg: Hinweise halten die Freigabe nicht auf (Kundenwort
       25.08.2026). Aufhalten darf nur, was wirklich offen ist. */
    const pAn2 = JSON.parse(JSON.stringify(pAn));
    pAn2.klima.quelle = "";
    const rAn2 = pa(pAn2, e2, { typologie: typo });
    if (rAn2.ampel !== "annahme") {
      f.push("Ein Hinweis neben Annahmen darf die Stufe annahme nicht "
        + "wegziehen, ist " + rAn2.ampel);
    }
    /* Eine OFFENE FRAGE dagegen muss die Stufe auf gelb ziehen — sie ist
       eine echte Lücke, kein Hinweis. */
    const offenAttrappe = { zaehler: function () {
      return [{ id: "raeume_OG", titel: "Räume in OG", stufe: "offen",
                text: "Wie viele Räume auf dem Plan stehen, weiß das "
                  + "Werkzeug nicht." }];
    } };
    const rAn3 = pa(pAn, e2, { typologie: typo, kontrollblatt: offenAttrappe });
    if (rAn3.ampel !== "gelb") {
      f.push("Eine offene Frage muss die Stufe auf gelb ziehen, ist " + rAn3.ampel);
    }
    /* 13  Fehlende Angaben: was die Zahl macht, ist ein Fehler; was nur das
           Dokument betrifft, ist ein Hinweis. */
    const pDok = JSON.parse(JSON.stringify(p2));
    pDok.meta.bezeichnung = "";
    const rDok = pa(pDok, e2, { typologie: typo });
    const vollDok = rDok.pruefungen.find(function (x) { return x.id === "voll"; });
    const zDok = rDok.pruefungen.find(function (x) { return x.id === "voll_dok"; });
    if (!vollDok || vollDok.stufe !== "gut") {
      f.push("Eine fehlende Objektbezeichnung darf die Pflichtangaben nicht rot machen");
    }
    if (!zDok || zDok.stufe !== "hinweis") {
      f.push("Eine fehlende Objektbezeichnung muss als Hinweis erscheinen");
    }
    if (rDok.ampel === "rot") {
      f.push("Eine fehlende Objektbezeichnung darf die Ampel nicht rot machen");
    }
    const pKein = JSON.parse(JSON.stringify(p2));
    pKein.meta.baujahr = "";
    const rKein = pa(pKein, e2, { typologie: typo });
    if (rKein.ampel !== "rot") f.push("Ein fehlendes Baujahr muss die Ampel rot machen");

    /* --- Ein unbeheizter Bereich auf Raumtemperatur -------------------
     * Zwei Faelle, und beide muessen sich vorfuehren lassen: der gesunde,
     * bei dem nichts gemeldet wird, und der kranke. Bis zum 23.08.2026 liess
     * sich der kranke gar nicht erzwingen — wer eine Zone auf 20 Grad setzte,
     * bekam keine Meldung, und niemand konnte zeigen, dass das Werkzeug so
     * etwas findet. */
    {
      const pZone = { zonen: [{ id: "dach", name: "Spitzboden" }] };
      const eKalt = { zonen: { dach: -2 }, raeume: [
        { id: "r1", raum: "SCHLAFEN", theta_i: 20, bauteile: [
          { name: "Decke", A: 20, grenzt_an: { typ: "zone", ref: "dach" } }] }] };
      const kalt = pruefeZonenTemperatur(pZone, eKalt);
      if (kalt.length) {
        f.push("Ein Bereich unter Raumtemperatur darf nichts melden, meldet: "
          + kalt.map(function (x) { return x.titel; }).join(", "));
      }
      const eWarm = JSON.parse(JSON.stringify(eKalt));
      eWarm.zonen.dach = 20;
      const warm = pruefeZonenTemperatur(pZone, eWarm);
      if (warm.length !== 1 || warm[0].stufe !== "fehler") {
        f.push("Ein Bereich auf Raumtemperatur muss als Fehler gemeldet werden");
      } else if (warm[0].text.indexOf("SCHLAFEN") < 0
                 || warm[0].text.indexOf("20,0 °C") < 0) {
        f.push("Die Meldung muss beide Temperaturen und den Raum nennen");
      }
      /* Auch knapp darueber ist es einer: der Waermestrom kehrt sich um. */
      const eDrueber = JSON.parse(JSON.stringify(eKalt));
      eDrueber.zonen.dach = 21;
      if (pruefeZonenTemperatur(pZone, eDrueber).length !== 1) {
        f.push("Auch ein waermerer Bereich als der Raum muss gemeldet werden");
      }
      /* Ohne trennendes Bauteil gibt es nichts zu melden. */
      const eOhne = { zonen: { dach: 20 }, raeume: [
        { id: "r1", raum: "SCHLAFEN", theta_i: 20, bauteile: [
          { name: "Wand", A: 12, grenzt_an: { typ: "aussen" } }] }] };
      if (pruefeZonenTemperatur(pZone, eOhne).length) {
        f.push("Ohne Bauteil gegen die Zone darf nichts gemeldet werden");
      }
    }

    /* --- Vorbelegter Maßstab beim Umfahren (Lücke 2, 25.08.2026) --------
       Ein Raum, der mit der Vorbelegung 1:100 umfahren wurde, muss als
       ausgewiesene Annahme erscheinen — Rechnung läuft, Ampel „annahme",
       Fehlerrichtung und Ausweg stehen im Text. Räume ohne die Marke
       (Stempel, Hand, echt gemessener Maßstab) lösen die Zeile nicht aus. */
    {
      const pV = JSON.parse(JSON.stringify(p2));
      pV.raeume[0].herkunft = { quelle: "im Plan umfahren",
        flaeche_quelle: "im Plan umfahren — Maßstab 1:100 vorbelegt",
        massstab_vorbelegt: true };
      const rV = pa(pV, e2, { typologie: typo });
      const zV = rV.pruefungen.find(function (x) { return x.id === "massstab_vorbelegt"; });
      if (!zV || zV.stufe !== "offen" || zV.annahme !== true) {
        f.push("Vorbelegter Maßstab muss als offene, ausgewiesene Annahme erscheinen");
      } else {
        if (!/skalieren mit dem Maßstab/.test(zV.text)
            || !/1:50/.test(zV.text) || !/viermal zu groß/.test(zV.text)) {
          f.push("Die Vorbelegungszeile muss Folge und Fehlerrichtung nennen, ist: "
            + zV.text);
        }
        if (!/Maßstab messen/.test(zV.text)) {
          f.push("Die Vorbelegungszeile muss den Ausweg nennen");
        }
      }
      if (rV.ampel === "rot" || !rV.belastbar) {
        f.push("Die Vorbelegung ist eine Annahme, keine Sperre — Ampel ist: " + rV.ampel);
      }
      const rEcht = pa(p2, e2, { typologie: typo });
      if (rEcht.pruefungen.some(function (x) { return x.id === "massstab_vorbelegt"; })) {
        f.push("Ohne die Marke darf die Vorbelegungszeile nicht erscheinen");
      }
    }

    return { ok: f.length === 0, fehler: f,
             anzahl: 49 + 16 + 4 + 3 + 2 + 4 + 5 + 8 + 5 + 11 + 4 + 4 + 6 + 4 };
  }

  return { pruefeAlles: pruefeAlles, selbsttest: selbsttest, P: P,
           /* Nach draussen gegeben, weil das Kontrollblatt dieselbe
              Massstabsprobe rechnet und dabei die Herkunft der Flaechen
              nicht mitgab. Ergebnis: derselbe Kasten sagte im Bericht "die
              Flaechen stehen als Text im Plan" und im Kontrollblatt "von
              Hand eingetragen". Eine Rechnung, zwei Auskuenfte. */
           flaechenHerkunft: flaechenHerkunft,
           bestaetigungen: bestaetigungen,
           bestaetigungEintragen: bestaetigungEintragen,
           bestaetigungZuruecknehmen: bestaetigungZuruecknehmen,
           bestaetigungAnwenden: bestaetigungAnwenden,
           bestaetigungenAnwenden: bestaetigungenAnwenden,
           bestaetigungsstand: bestaetigungsstand };
});
