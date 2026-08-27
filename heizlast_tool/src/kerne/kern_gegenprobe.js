/* ===========================================================================
 * kern_gegenprobe.js — zwei Lesungen desselben Blattes gegeneinander halten
 * ===========================================================================
 * WOZU DAS GEBAUT WURDE
 *
 * Das Kontrollblatt stellte auf jedem Projekt dieselben Fragen, und es
 * konnte keine davon selbst beantworten:
 *
 *   „Räume in EG: 6 Räume. Wie viele Räume auf dem Plan beschriftet sind,
 *    weiß das Werkzeug nicht."
 *   „Flächensumme EG 74,72 m². Eine Gebäudekontur zum Gegenrechnen liegt
 *    nicht vor, damit ist die Summe gegen nichts geprüft."
 *   „Fenster gegen die Ansicht: 5 Fenster. Eine ausgewertete Ansicht liegt
 *    nicht vor, also ist die Zahl gegen nichts geprüft."
 *
 * Das sind keine Befunde über das Gebäude, sondern über das Werkzeug: es
 * hatte genau EINE Lesung und konnte ihr nichts entgegenhalten. Eine Frage,
 * die auf jedem Projekt dasteht und die das Werkzeug nie selbst beantworten
 * kann, gehört nicht in eine Liste zum Abarbeiten. Sie erzieht dazu, die
 * ganze Liste zu überblättern.
 *
 * Die fehlende Gegenprobe ist eine ZWEITE LESUNG desselben Blattes mit
 * anderer Blickrichtung (Betriebsart "gegenprobe" im Ausleseendpunkt):
 *
 *   erste Lesung   wertet aus — Fläche, Raumart, Fensterbreite, Höhe
 *   zweite Lesung  zählt und benennt — wie viele Beschriftungen stehen da,
 *                  wie heißen sie, wie viele Fenstersymbole sind zu sehen,
 *                  welche Ebenen zeigt das Blatt, wie lautet die
 *                  Außenbemaßung
 *
 * Die zweite Lesung bekommt das Ergebnis der ersten NICHT zu sehen. Darin
 * allein liegt ihr Wert: zwei unabhängige Lesungen, die übereinstimmen, sind
 * ein Beleg. Gehen sie auseinander, ist das ein echter Befund — und zwar
 * einer, den vorher niemand gesehen hat.
 *
 * WAS DIESE DATEI TUT und was sie ausdrücklich NICHT tut
 *
 * Sie hält die beiden Lesungen gegeneinander und sagt, ob eine Angabe belegt
 * ist. Die Zähler des Kontrollblatts (Z1 Räume, Z2 Fläche, Z3 Fenster, Z4
 * Ebenen, Z5 unbeheizte Bereiche) bleiben unverändert; sie bekommen aus der
 * zweiten Lesung nur endlich eine unabhängige Sollzahl, gegen die sie ohnehin
 * schon rechnen wollten. Keine Schwelle wird verschoben, keine Zeile
 * gestrichen. Der Unterschied ist allein, dass die Frage jetzt beantwortet
 * wird, statt gestellt zu werden.
 *
 * DIE SCHWELLEN, und warum sie so und nicht anders liegen
 *
 * RÄUME: jede Abweichung zählt, aber nur, wenn sie sich BENENNEN lässt. Ein
 * beschrifteter Raum ist ein zählbares, unteilbares Ding, und sieht eine
 * Lesung eine Beschriftung mehr als die andere, hat genau eine von beiden
 * einen Raum übersehen — ein übersehener Raum senkt die Gebäudeheizlast, ohne
 * in W/m² aufzufallen. Schwelle also null, gemessen an den NAMENSLISTEN.
 * Nicht gemessen wird an der Zahl, die das Modell neben die Liste schreibt:
 * die lautete in neun Lesungen desselben Blattes 11 · 11 · 13 · 14 · 14 …,
 * während die Liste jedes Mal dieselben 13 Namen enthielt. Steht eine höhere
 * Zahl ohne einen Namen dahinter, ist das kein Befund, sondern ein „sieh hier
 * noch einmal hin".
 * Verglichen werden dabei nur BESCHRIFTETE Räume. Die erste Lesung nimmt
 * auf Anweisung auch unbeschriftete Flächen mit („Konfidenz geraten"); die
 * zweite zählt sie nicht. Diese bekannte Asymmetrie darf keinen Fehlalarm
 * erzeugen, deshalb wird sie herausgerechnet und gesondert genannt.
 *
 * FENSTER: gar keine Schwelle, weil es gar keine Probe mehr gibt. Hier stand
 * eine Toleranz von einem Fenster, begründet mit dem zweiflügeligen Fenster
 * und der Fenstertür. Die Begründung stimmt, die Voraussetzung stimmte nicht:
 * sie unterstellte, dass die zweite Lesung Fenster überhaupt reproduzierbar
 * zählt.
 * GEMESSEN am 22.08.2026, neun Lesungen desselben Blattes
 * „BV 2-0887 Ziolkowski" gegen den laufenden Endpunkt, jedes Mal dasselbe
 * Bild: das Erdgeschoss kam mit 4 · 6 · 8 · 6 · 5 · 8 Fenstern zurück, das
 * Obergeschoss mit 3 · 4 · 6 · 4 · 6 · 6. Auf dem Plan sind es im Erdgeschoss
 * fünf. Eine Toleranz von eins fängt davon nichts; die Zeile hätte an einem
 * einwandfreien Gebäude in vier von sechs Läufen rot geleuchtet.
 * Der Grund ist keine Laune des Modells, sondern die Sache: hinter einem Raum
 * steht eine BESCHRIFTUNG, die sich benennen und am Plan wiederfinden lässt —
 * die Namenslisten waren in allen neun Lesungen wortgleich. Hinter einem
 * Fenster steht nur eine Zahl. Deshalb gilt hier die Regel dieses Kerns:
 *
 *     Eine Zahl ohne benennbare Liste dahinter belegt nichts und
 *     widerlegt nichts. Sie wird gezeigt, nicht beurteilt.
 *
 * Der Abgleich Raumbuch gegen Auslese (Kontrollblatt Z3, „auf dem Weg ins
 * Raumbuch") bleibt bei Schwelle null — dort geht es nicht ums Ablesen,
 * sondern darum, ob ein gelesenes Fenster zum Bauteil geworden ist. Und der
 * Abgleich gegen eine ANSICHT bleibt ebenfalls: dort zählt eine zweite
 * Zeichnung dieselben Öffnungen.
 *
 * FLÄCHEN: keine feste Schwelle, und schon gar keine Prozentzahl. Die
 * Außenbemaßung liefert das umschreibende Rechteck, also eine OBERGRENZE.
 * Für die Frage, ob ein Raum fehlt, ist die richtige Schwelle nicht „x
 * Prozent", sondern die, die das Kontrollblatt längst benutzt: Passt in die
 * nicht belegte Restfläche noch ein Raum, gemessen am kleinsten bereits
 * erfassten Raum desselben Geschosses? Diese Schwelle bleibt unangetastet.
 * Aus dem Rechteck folgt nur eine zusätzliche Vorsicht: bei einem nicht
 * rechteckigen Grundriss ist die Restfläche auch ohne fehlenden Raum groß.
 * Deshalb belegt das Rechteck die harte Richtung (Raumsumme GRÖSSER als die
 * Kontur ist geometrisch unmöglich) und begründet in der weichen Richtung
 * nur einen Hinweis.
 *
 * EBENEN und UNBEHEIZTE BEREICHE: zählbar wie Räume, Schwelle null.
 * =========================================================================== */
"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_GEGENPROBE = M;
})(this, function () {

  function zahl(x, ersatz) {
    const n = Number(x);
    return Number.isFinite(n) ? n : (ersatz === undefined ? null : ersatz);
  }

  function text(x) { return String(x == null ? "" : x).trim(); }

  /* KEIN RAUM IM SINNE DIESER PRUEFUNG.
   *
   * Zwei Gruppen, und beide sind auf jedem zweiten Bauplan angeschrieben:
   *   AUSSEN     Terrasse, Balkon, Loggia, Stellplatz — sie liegen ausserhalb
   *              der Gebaeudehuelle und gehen in keine Heizlast ein.
   *   NEBENBAU   Garage, Carport, Schuppen, Scheune — unbeheizte Anbauten.
   *              Sie gehen sehr wohl in die Rechnung ein, aber als ZONE, und
   *              dafuer ist Zaehler Z5 des Kontrollblatts da, nicht Z1.
   *
   * GEMESSEN am echten Blatt „13_BA 03_EG" (Am Gunnebach 9, Paderborn):
   * dort stehen „Terrasse 27,82 m²" und „Garage 38,23 m²" mit
   * Flaechenstempel neben elf Wohnraeumen. Zaehlt die Gegenprobe sie mit,
   * meldet sie dem Bearbeiter zwei fehlende Raeume, die es nicht gibt.
   * Ein Fehlalarm aus der eigenen Nachlaessigkeit ist schlimmer als keine
   * Pruefung: er ist genau die Zeile, die auf jedem Projekt dasteht und dazu
   * erzieht, die ganze Liste zu ueberblaettern.
   *
   * Verschwiegen wird dabei nichts. Was hier herausfaellt, wird gesondert
   * genannt, und die unbeheizten Anbauten laufen ueber unbeheizt_benannt in
   * Z5, wo ein fehlender Anbau weiterhin rot wird. */
  const KEIN_RAUM = new RegExp(
    "^(terrasse|balkon|loggia|dachterrasse|freisitz|stellplatz|carport|garage|"
    + "tiefgarage|hof|weg|aussenanlage|gartenflaeche|gartenfläche|schuppen|"
    + "scheune|stall)\\b", "i");

  /** true, wenn die Beschriftung fuer diese Pruefung als Raum zaehlt. */
  function zaehltAlsRaum(name) {
    const n = text(name);
    return !!n && !KEIN_RAUM.test(n);
  }

  /* EINE FASSADENBEZEICHNUNG GILT NUR MIT BELEG.
   *
   * Gemessen am 24.08.2026 an „BV 2-0887 Ziolkowski": das Werkzeug meldete
   * „Fassade West" — auf dem Blatt gibt es nur die Ansichten Nord, Ost und
   * Süd. Das Modell hatte „West" geliefert, ohne dass irgendetwas auf dem
   * Blatt so beschriftet ist; der Auftrag verlangt zwar „woertlich wie es
   * unter der Zeichnung steht", aber niemand konnte das pruefen.
   *
   * Deshalb liefert der Endpunkt jetzt zusaetzlich fassade_wortlaut — die
   * Beschriftung Zeichen fuer Zeichen — und hier wird geprueft, ob die
   * behauptete Himmelsrichtung in diesem Wortlaut tatsaechlich vorkommt.
   * Nur dann ist die Bezeichnung belegt. Ohne Wortlaut (alter Endpunkt,
   * unbeschriftete Ansicht) bleibt die Fensterzahl der Ansicht erhalten und
   * zaehlt gegen die Gesamtzahl; als Aussage UEBER EINE BESTIMMTE FASSADE
   * wird sie nicht mehr gefuehrt. Kein Lockern: die Behauptung faellt, weil
   * ihre Grundlage nie da war — die Zaehlung bleibt scharf. */
  const HIMMELSRICHTUNG = {
    nord: /\bnord/i, ost: /\bost|\boest/i,
    sued: /\bsued|\bsüd/i, west: /\bwest/i,
  };
  function fassadeBelegt(fassade, wortlaut) {
    const f = text(fassade), w = text(wortlaut);
    if (!f || !w) return false;
    const fn = normName(f);
    let richtung = null;
    Object.keys(HIMMELSRICHTUNG).forEach(function (k) {
      if (fn.indexOf(k) === 0) richtung = k;
    });
    /* Eine Himmelsrichtung muss im Wortlaut stehen („ANSICHT VON WESTEN"
       belegt „West", „ANSICHT NORD" belegt sie nicht). */
    if (richtung) {
      const wn = text(w).toLowerCase()
        .replace(/[ä]/g, "ae").replace(/[ö]/g, "oe")
        .replace(/[ü]/g, "ue").replace(/[ß]/g, "ss");
      return new RegExp("\\b" + richtung).test(wn)
        || (richtung === "ost" && /\boest/.test(wn));
    }
    /* Keine Himmelsrichtung („Strassenseite"): belegt, wenn die Bezeichnung
       aus dem Wortlaut stammt. */
    return normName(w).indexOf(fn) >= 0;
  }

  /** Vereinheitlicht einen Namen für den Vergleich: Groß/klein, Leerzeichen,
   *  Trennzeichen und angehängte Nummern spielen keine Rolle.
   *  "Kind 1" und "kind1" sind derselbe Name, "Kind" und "Küche" nicht. */
  function normName(s) {
    return text(s).toLowerCase()
      .replace(/[ä]/g, "ae").replace(/[ö]/g, "oe")
      .replace(/[ü]/g, "ue").replace(/[ß]/g, "ss")
      .replace(/[^a-z0-9]+/g, "");
  }

  /* ---------------------------------------------------------------------
   * Die Antwort der zweiten Lesung in eine vollständige Form bringen
   * ------------------------------------------------------------------
   * Werkzeug und Endpunkt werden getrennt ausgeliefert. Nach einem Bau des
   * Werkzeugs kann noch der alte Endpunkt antworten, der diese Betriebsart
   * nicht kennt. Dann fehlt der ganze Block, und das darf kein Absturz sein,
   * sondern muss heißen: es liegt keine zweite Lesung vor.
   * ------------------------------------------------------------------ */
  /* Die Felder, an denen sich eine zweite Lesung erkennen laesst. Alles
     andere, was in der Antwort steht, ist Buchhaltung des Endpunkts
     (_verbrauch, _abgeschnitten, _ausText) und sagt ueber das Blatt nichts. */
  const INHALTSFELDER = ["blattart", "raumnamen", "raeume_beschriftet",
    "fenster_gesamt", "ansichten", "ebenen", "unbeheizt_benannt",
    "unbeheizt_unbenannt", "nordpfeil"];

  function normieren(roh) {
    const r = (roh && typeof roh === "object") ? roh : {};
    const namen = Array.isArray(r.raumnamen)
      ? r.raumnamen.map(text).filter(Boolean) : [];
    const ebenen = Array.isArray(r.ebenen)
      ? r.ebenen.filter(function (x) { return x && typeof x === "object"; })
          .map(function (x) {
            const en = Array.isArray(x.raumnamen)
              ? x.raumnamen.map(text).filter(Boolean) : [];
            return {
              bezeichnung: text(x.bezeichnung),
              gezeichnet: x.gezeichnet === true,
              /* DIE LISTE ZAEHLT, NICHT DIE ZAHL DANEBEN.
                 Hier stand Math.max(gemeldete Zahl, Laenge der Liste) -- also
                 im Zweifel die hoehere von zwei Schaetzern derselben Groesse.
                 GEMESSEN an neun echten Lesungen des Blattes
                 "BV 2-0887 Ziolkowski": die Namensliste des Erdgeschosses war
                 in allen neun wortgleich sechs Namen lang, die Zahl daneben
                 lautete zweimal 7. Auf dem Plan stehen sechs. Das Maximum
                 machte daraus zweimal "ein Raum fehlt" an einem
                 vollstaendigen Raumbuch.
                 Die gemeldete Zahl bleibt nur der Rueckfall fuer eine Antwort
                 ohne Liste (aelterer Endpunkt); dort ist sie das einzige,
                 was da ist. */
              raeume_beschriftet: en.length || Math.max(0, zahl(x.raeume_beschriftet, 0)),
              raumnamen: en,
              fenster: Math.max(0, zahl(x.fenster, 0)),
              aussen_breite_m: zahl(x.aussen_breite_m, null),
              aussen_tiefe_m: zahl(x.aussen_tiefe_m, null),
              aussen_wortlaut: text(x.aussen_wortlaut),
            };
          }).filter(function (x) { return !!x.bezeichnung; })
      : [];
    const np = (r.nordpfeil && typeof r.nordpfeil === "object") ? r.nordpfeil : {};
    /* Die vom Modell gemeldete Blattzahl. Sie ist NUR NOCH RUECKFALL für eine
       Antwort, die keine Liste mitbringt — siehe die Begründung an
       raeume_beschriftet der Ebene. Ein neuer Endpunkt liefert sie gar nicht
       mehr; ein alter liefert sie, und dann ist sie besser als nichts. */
    const gemeldet = Math.max(0, zahl(r.raeume_beschriftet, 0));
    /* NUR GEZEICHNETE EBENEN zählen in die Blattsummen.
     *
     * Eine Ebene, die das Blatt bloß BENENNT — der Spitzboden, den der
     * Schnitt als vierte Ebene aufführt —, trägt weder Räume noch Fenster
     * bei; sie ist auf diesem Blatt nicht gezeichnet. Sie zählt als Ebene,
     * und dafür ist ebenenVereinigen() da. */
    const gez = ebenen.filter(function (e) { return e.gezeichnet; });
    const ausEbenen = gez.reduce(function (m, e) { return m + e.raeume_beschriftet; }, 0);
    const fensterEbenen = gez.reduce(function (m, e) { return m + e.fenster; }, 0);
    /* JEDES FENSTER GENAU EINMAL.
     *
     * Ein Fenster steht im Grundriss seines Geschosses, im Schnitt und in
     * der Ansicht — dreimal dieselbe Öffnung. Die Summe über die Grundrisse
     * zählt jede genau einmal; die am Blatt gemeldete Gesamtzahl schließt
     * Schnitt und Ansicht mit ein und zählt dieselben Fenster ein zweites
     * Mal. Das Maximum von beidem zu nehmen, hieße den Doppelzähler zur
     * Sollzahl zu machen.
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": elf Fenster in drei
     * Grundrissen, dazu sechs in der Ansicht von Westen. Gemeldet wurden
     * achtzehn, angelegt waren die richtigen elf — und das Kontrollblatt
     * meldete leuchtend rot sieben fehlende Fenster an einem einwandfreien
     * Gebäude.
     *
     * Deshalb: liegt für die Grundrisse eine Zählung vor, gilt sie. Die
     * gemeldete Blattzahl bleibt der Rückfall für ein Blatt, das seine
     * Ebenen nicht einzeln aufführt — dort kann sie nicht doppelt zählen,
     * weil es nur eine Zeichnung gibt. Was aus der Ansicht kommt, ist damit
     * nicht verworfen: es steht in `ansichten` und geht in den Abgleich
     * Fassade für Fassade, wo es hingehört. */
    const gemeldeteFenster = Math.max(0, zahl(r.fenster_gesamt, 0));
    const fenster = gez.length ? fensterEbenen : gemeldeteFenster;
    /* Die Ansicht liefert seit dem 23.08.2026 nicht nur eine Zahl, sondern
       auch die Groesse jeder Oeffnung -- als Anteil an der Breite der
       gezeichneten Fassade. Anteile und nicht Meter, weil ein Anteil im Bild
       ablesbar ist und ein Meterwert geraten waere; die Umrechnung macht das
       Werkzeug mit der Aussenbemassung des Grundrisses.
       Uebernommen wird nur eine VOLLSTAENDIGE Liste: so viele Oeffnungen wie
       gezaehlte Fenster. Eine halbe Liste laesst Flaeche vermissen, die gar
       nicht fehlt, und ein Fehlalarm aus der eigenen Nachlaessigkeit ist
       schlimmer als keine Pruefung. */
    const anteil = function (x) {
      const v = zahl(x, 0);
      return (v > 0 && v <= 1) ? v : 0;
    };
    const ansichten = Array.isArray(r.ansichten)
      ? r.ansichten.filter(function (x) { return x && typeof x === "object"; })
          .map(function (x) {
            const n = Math.max(0, zahl(x.fenster, 0));
            const roh = Array.isArray(x.oeffnungen) ? x.oeffnungen : [];
            const oeff = roh
              .filter(function (o) { return o && typeof o === "object"; })
              .map(function (o) {
                return { breite_anteil: anteil(o.breite_anteil),
                         hoehe_anteil: anteil(o.hoehe_anteil),
                         geschoss: text(o.geschoss),
                         ist_tuer: o.ist_tuer === true };
              })
              .filter(function (o) {
                return o.breite_anteil > 0 && o.hoehe_anteil > 0;
              });
            const b = zahl(x.breite_bezug_m, 0);
            const wortlaut = text(x.fassade_wortlaut);
            return { fassade: text(x.fassade), fenster: n,
                     fassade_wortlaut: wortlaut || null,
                     fassade_belegt: fassadeBelegt(text(x.fassade), wortlaut),
                     breite_bezug_m: b > 0 ? b : null,
                     oeffnungen: (n > 0 && oeff.length === n) ? oeff : [] };
          }).filter(function (x) { return !!x.fassade; })
      : [];
    /* Alle Namen des Blattes. Steht die Blattliste da, gilt sie; sonst
       entsteht sie aus den Listen der gezeichneten Ebenen. Zwei Listen zu
       vereinigen wäre falsch — ein Name stünde dann doppelt. */
    const alleNamen = namen.length
      ? namen
      : gez.reduce(function (m, e) { return m.concat(e.raumnamen); }, []);
    return {
      /* WANN EINE ZWEITE LESUNG VORLIEGT.
       *
       * Hier stand Object.keys(r).length > 0 — also „irgendein Feld ist da".
       * GEMESSEN am 22.08.2026 im echten Durchlauf: der Endpunkt lieferte für
       * Sebastians Blatt einen Körper aus NUR _abgeschnitten und _verbrauch,
       * beides seine eigene Buchhaltung. Die Bedingung war erfüllt, die
       * Gegenprobe galt als gelesen, und aus einem Abbruch wurde die Aussage
       * „die zweite Lesung zählt null Räume". Eine Antwort ohne ein einziges
       * INHALTLICHES Feld ist keine Lesung. */
      vorhanden: INHALTSFELDER.some(function (k) {
        return Object.prototype.hasOwnProperty.call(r, k);
      }),
      blattart: text(r.blattart) || "sonstiges",
      /* Gezählt wird die Liste. Der gemeldete Skalar ist nur Rückfall, wenn
         gar keine Liste vorliegt (siehe oben, neun gemessene Lesungen). */
      raeume_beschriftet: alleNamen.length || Math.max(gemeldet, ausEbenen),
      raeume_gemeldet: gemeldet,
      raumnamen: alleNamen,
      fenster_gesamt: fenster,
      fenster_gemeldet: gemeldeteFenster,
      ansichten: ansichten,
      ebenen: ebenen,
      unbeheizt_benannt: Array.isArray(r.unbeheizt_benannt)
        ? r.unbeheizt_benannt.map(text).filter(Boolean) : [],
      unbeheizt_unbenannt: Math.max(0, zahl(r.unbeheizt_unbenannt, 0)),
      nordpfeil: {
        vorhanden: np.vorhanden === true,
        richtung: text(np.richtung) || "unbekannt",
      },
    };
  }

  /* ---------------------------------------------------------------------
   * Die Gebäudekontur aus der Außenbemaßung
   * ------------------------------------------------------------------
   * Die Außenbemaßung steht auf fast jedem Bauplan. Daraus folgt das
   * umschreibende Rechteck und damit endlich eine Zahl, gegen die sich die
   * Summe der Raumflächen halten lässt.
   *
   * Sie ist eine OBERGRENZE und wird auch so gekennzeichnet: bei einem
   * L-förmigen oder gestaffelten Grundriss liegt das Rechteck über der
   * wirklichen Grundfläche. Eine Kontur zu behaupten, die das Gebäude nicht
   * hat, wäre eine erfundene Zahl.
   *
   * Die Schranken halten Ablesefehler heraus. Unter 2 m Kantenlänge ist es
   * kein Gebäude, sondern eine Einzelmaßkette; über 200 m ist es ein
   * Lageplan oder eine in Zentimetern gelesene Zahl, die nicht umgerechnet
   * wurde. Beides lieber verwerfen als eine falsche Kontur setzen: eine zu
   * große Kontur erzeugt einen Fehlalarm, eine zu kleine einen roten Befund
   * über ein einwandfreies Gebäude.
   * ------------------------------------------------------------------ */
  const KANTE_MIN = 2, KANTE_MAX = 200;

  /* TRÄGT DER GENANNTE WORTLAUT DIE GENANNTE ZAHL?
   *
   * Die Lesung nennt zu jeder Kante eine Zahl UND den Wortlaut, aus dem sie
   * stammt. Beides wurde bisher ungeprüft nebeneinandergestellt — und der
   * Wortlaut steht danach als Herkunft im Bericht.
   *
   * GEMESSEN am Blattsatz „Hasenberg 10" (echter Lauf 26.08.2026, Blatt 2):
   * „Außenbemaßung Obergeschoss, 20,55 m mal 10,53 m („1,945 + 5,56 + 7,90 +
   * 3,545 (oben) / 10,53 (rechts)")". Die genannte Kette ergibt 18,95 m, die
   * verwendete Zahl ist 20,55 m — 8 Prozent mehr, und daraus wurden 216,39 m²
   * Gebäudekontur statt 199,54 m². Derselbe Befund im Prüflauf vom
   * 26.08.2026 unter Nummer 4 („18,95 gelesen, 20,85 verwendet").
   *
   * Geprüft wird nur, was sich prüfen lässt: eine Kette aus Metermaßen. Steht
   * im Wortlaut ein Zentimetermaß neben einem Metermaß (Verhältnis größer 20,
   * etwa „30 | 2,93 | 13 | 1,10"), sind die Einheiten gemischt und es gibt
   * KEIN Urteil — lieber keine Prüfung als ein Fehlalarm. Gedeckt ist eine
   * Zahl, wenn ein Einzelmaß oder die Summe einer Kette sie auf 2 Prozent
   * trifft. Verworfen wird die Kontur nicht: sie bleibt als Obergrenze
   * stehen, aber sie beruft sich nicht länger auf einen Wortlaut, der sie
   * nicht trägt. */
  function ketteDeckt(wortlaut, wert) {
    const t = text(wortlaut);
    if (!t || !(wert > 0)) return null;             // ohne Wortlaut kein Urteil
    let gedeckt = false, summen = [], urteilbar = false;
    t.split(/[;/]/).forEach(function (s) {
      const zahlen = (s.match(/\d+(?:[.,]\d+)?/g) || []).map(function (x) {
        return parseFloat(x.replace(",", "."));
      }).filter(function (x) { return x > 0 && x <= KANTE_MAX; });
      if (!zahlen.length) return;
      const gross = Math.max.apply(null, zahlen);
      const klein = Math.min.apply(null, zahlen);
      if (gross / klein > 20) return;               // gemischte Einheiten
      urteilbar = true;
      const summe = zahlen.reduce(function (a, x) { return a + x; }, 0);
      summen.push(Math.round(summe * 100) / 100);
      const trifft = function (w) {
        return Math.abs(w - wert) <= 0.02 * Math.max(wert, 1);
      };
      if (trifft(summe) || zahlen.some(trifft)) gedeckt = true;
    });
    if (!urteilbar) return null;
    return { gedeckt: gedeckt, summen: summen };
  }

  /** Die Kontur einer EINZELNEN Ebene aus ihrer Außenbemaßung. */
  function konturAusEbene(e) {
    if (!e) return null;
    const b = zahl(e.aussen_breite_m, null), t = zahl(e.aussen_tiefe_m, null);
    if (!(b > 0) || !(t > 0)) return null;
    if (b < KANTE_MIN || t < KANTE_MIN || b > KANTE_MAX || t > KANTE_MAX) return null;
    const deckung = ketteDeckt(e.aussen_wortlaut, b);
    const widerspruch = (deckung && !deckung.gedeckt)
      ? { wert: b, summen: deckung.summen, wortlaut: text(e.aussen_wortlaut) }
      : null;
    if (widerspruch) {
      return {
        A: Math.round(b * t * 100) / 100,
        U: Math.round(2 * (b + t) * 100) / 100,
        breite_m: b, tiefe_m: t,
        rechteckig: true,
        ebene: e.bezeichnung,
        wortlaut: e.aussen_wortlaut,
        widerspruch: widerspruch,
        quelle: "Außenbemaßung " + e.bezeichnung + ", "
          + b.toLocaleString("de-DE") + " m mal " + t.toLocaleString("de-DE")
          + " m — die dazu genannte Maßkette („" + text(e.aussen_wortlaut)
          + "“) ergibt " + widerspruch.summen.map(function (s) {
              return s.toLocaleString("de-DE");
            }).join(" bzw. ") + " m und trägt diese Zahl nicht",
      };
    }
    return {
      A: Math.round(b * t * 100) / 100,
      U: Math.round(2 * (b + t) * 100) / 100,
      breite_m: b, tiefe_m: t,
      rechteckig: true,
      ebene: e.bezeichnung,
      wortlaut: e.aussen_wortlaut,
      quelle: "Außenbemaßung " + e.bezeichnung + ", "
        + b.toLocaleString("de-DE") + " m mal " + t.toLocaleString("de-DE") + " m"
        + (e.aussen_wortlaut ? " („" + e.aussen_wortlaut + "“)" : ""),
    };
  }

  /** Alle Konturen eines Blattes, je GEZEICHNETER Ebene eine.
   *
   *  WARUM JE EBENE UND NICHT JE BLATT: „BV 2-0887 Ziolkowski" trägt drei
   *  Grundrisse auf einem A3-Bogen. Das Erdgeschoss misst 8,00 mal 12,50 m,
   *  unterkellert sind davon nur 8,00 mal 7,00 m. Eine Kontur je Blatt würde
   *  100 m² auf ein Kellergeschoss mit 56 m² rechnen und einen leuchtend
   *  roten Befund über ein einwandfreies Gebäude erzeugen. Ein Fehlalarm aus
   *  der eigenen Nachlässigkeit ist schlimmer als keine Prüfung. */
  function konturenAusBlatt(roh) {
    const z = normieren(roh);
    const raus = [];
    z.ebenen.forEach(function (e) {
      if (!e.gezeichnet) return;
      const k = konturAusEbene(e);
      if (k) raus.push(k);
    });
    return raus;
  }

  /** Die beschrifteten Räume und Fenster je gezeichneter Ebene eines Blattes.
   *  Das ist die Zahl, die das Kontrollblatt braucht: sie gilt für ein
   *  Geschoss und nicht für ein Blatt. */
  function raeumeJeEbene(roh, istRaumname) {
    const z = normieren(roh);
    const raus = [];
    /* Der hereingereichte Namensfilter (MODUL_KI.istZaehlbarerRaumname) --
       dieselbe Regel wie im Abgleich: Vermassungen und Einbauteile
       (Garderobe, Schrank, Nische) zaehlen nicht als Raum. Ohne ihn bleibt
       das alte Verhalten. */
    const pruef = (typeof istRaumname === "function") ? istRaumname
      : function () { return true; };
    z.ebenen.forEach(function (e) {
      if (!e.gezeichnet) return;
      /* Gefiltert wird nur ueber eine Liste. Liegt keine vor (alter Endpunkt,
         nur eine gemeldete Zahl), laesst sich nicht sagen, welche Namen
         gemeint sind -- dann gilt die Zahl unveraendert und ungefiltert.
         Eine Zahl ohne Liste kann nichts belegen; was der Abgleich damit
         tut, steht dort. */
      const vollstaendig = e.raumnamen.length >= e.raeume_beschriftet;
      const echte = e.raumnamen.filter(function (n) {
        return zaehltAlsRaum(n) && pruef(n);
      });
      const aussen = e.raumnamen.filter(function (n) {
        return !(zaehltAlsRaum(n) && pruef(n));
      });
      raus.push({
        ebene: e.bezeichnung,
        n: vollstaendig ? echte.length : e.raeume_beschriftet,
        n_roh: e.raeume_beschriftet,
        namen: vollstaendig ? echte : e.raumnamen,
        ausgeschlossen: vollstaendig ? aussen : [],
        fenster: e.fenster,
      });
    });
    return raus;
  }

  /* ---------------------------------------------------------------------
   * Die beschrifteten Räume der ERSTEN Lesung
   * ------------------------------------------------------------------
   * Die erste Lesung nimmt auf Anweisung auch unbeschriftete Flächen mit.
   * Die zweite zählt nur, was beschriftet ist. Ohne diese Trennung würde
   * jede unbeschriftete Fläche einen Fehlalarm erzeugen.
   *
   * istRaumname wird von außen hereingereicht (MODUL_KI.istRaumname), damit
   * beide Seiten mit DEMSELBEN Filter gemessen werden. Zwei Kopien des
   * Filters wären zwei Stellen, die auseinanderlaufen.
   * ------------------------------------------------------------------ */
  function ersteRaumnamen(erste, istRaumname) {
    const liste = (erste && Array.isArray(erste.raeume)) ? erste.raeume : [];
    const pruef = (typeof istRaumname === "function") ? istRaumname
      : function () { return true; };
    const mitNamen = [], ohneNamen = [], aussen = [];
    liste.forEach(function (r) {
      const roh = (r && typeof r.bezeichnung === "object" && r.bezeichnung)
        ? r.bezeichnung.wert : (r && r.bezeichnung);
      const n = text(roh);
      if (!n || !pruef(n)) { ohneNamen.push(n); return; }
      /* Aussenflaechen und unbeheizte Anbauten bleiben auf BEIDEN Seiten
         draussen. Sonst zaehlt die eine Lesung die Garage mit und die andere
         nicht, und die Gegenprobe meldet einen Unterschied, den es nicht
         gibt. Fuer sie ist Zaehler Z5 zustaendig. */
      if (!zaehltAlsRaum(n)) { aussen.push(n); return; }
      mitNamen.push(n);
    });
    return { mitNamen: mitNamen, ohneNamen: ohneNamen.length, aussen: aussen };
  }

  /** Welche Namen die eine Lesung hat und die andere nicht. Ein Name, der
   *  mehrfach vorkommt, wird mehrfach abgeglichen: zwei Studios von je
   *  45,96 m² sind zwei Räume und nicht derselbe. */
  function nurIn(a, b) {
    const rest = b.map(normName);
    const raus = [];
    a.forEach(function (n) {
      const i = rest.indexOf(normName(n));
      if (i >= 0) rest.splice(i, 1); else raus.push(n);
    });
    return raus;
  }

  function nenne(liste, hoechstens) {
    const n = hoechstens || 4;
    const teil = liste.slice(0, n).map(function (x) { return "„" + x + "“"; });
    const rest = liste.length - teil.length;
    return teil.join(", ")
      + (rest === 1 ? " und ein weiterer" : rest > 1 ? " und " + rest + " weitere" : "");
  }

  /* ---------------------------------------------------------------------
   * Der Abgleich eines Blattes
   * ------------------------------------------------------------------
   * Liefert je Merkmal ein Urteil:
   *   belegt   beide Lesungen stimmen überein — die zugehörige Frage des
   *            Kontrollblatts ist damit beantwortet
   *   hinweis  Abweichung innerhalb der begründeten Ablesetoleranz, mit
   *            Nennung der Ursache
   *   warnung  echte Abweichung, die das Ergebnis nicht zu klein macht
   *   fehler   echte Abweichung, die die Heizlast zu klein macht
   * ------------------------------------------------------------------ */
  function abgleich(erste, zweite, opt) {
    const o = opt || {};
    const z = normieren(zweite);
    const merkmale = [];
    if (!z.vorhanden) return { merkmale: merkmale, zweite: z, gelesen: false };

    const blatt = text(o.blatt) || "dem Blatt";

    /* --- Räume ------------------------------------------------------- */
    const e = ersteRaumnamen(erste, o.istRaumname);
    /* Auch die zweite Lesung wird gefiltert -- mit derselben Regel,
       EINSCHLIESSLICH des hereingereichten Namensfilters. Ohne ihn zaehlte
       die zweite Lesung eine Garderobe oder ein "RH 2,28" mit, die erste
       nicht, und der Abgleich meldete einen Unterschied, den es nicht
       gibt. Was herausfaellt, verschwindet nicht: es steht unten in einer
       eigenen Zeile und laeuft ueber unbeheizt_benannt in den Zaehler der
       unbeheizten Bereiche. */
    const pruefName = (typeof o.istRaumname === "function") ? o.istRaumname
      : function () { return true; };
    const zNamen = z.raumnamen.filter(function (n) {
      return zaehltAlsRaum(n) && pruefName(n);
    });
    const zAussen = z.raumnamen.filter(function (n) { return !zaehltAlsRaum(n); });
    /* Die gemeldete Gesamtzahl um die Aussenflaechen kuerzen, aber nur wenn
       die Namensliste vollstaendig ist -- sonst weiss niemand, was fehlt. */
    const vollstaendig = z.raumnamen.length >= z.raeume_beschriftet;
    const a = e.mitNamen.length;
    const b = vollstaendig ? zNamen.length : z.raeume_beschriftet;
    const nurErste = nurIn(e.mitNamen, zNamen);
    const nurZweite = nurIn(zNamen, e.mitNamen);
    if (a === b && !nurZweite.length && !nurErste.length) {
      merkmale.push({
        id: "raeume", titel: "Räume auf " + blatt, a: a, b: b, einheit: "Räume",
        stufe: "belegt",
        text: "Zwei voneinander unabhängige Lesungen desselben Blattes zählen "
          + "übereinstimmend " + a + (a === 1 ? " beschrifteten Raum" : " beschriftete Räume")
          + ", und zwar dieselben. Die zweite Lesung kannte das Ergebnis der ersten "
          + "nicht.",
      });
    } else if (b > a && !nurZweite.length) {
      /* MEHR GEZÄHLT, ABER KEIN NAME DAZU.
       *
       * Das ist kein Befund, sondern eine Zahl ohne Beleg: die zweite Lesung
       * nennt keinen einzigen Raum, den die erste nicht auch hätte. Der
       * Unterschied steckt allein in einer gemeldeten Zahl, und die ist,
       * gemessen an neun Lesungen desselben Blattes, nicht reproduzierbar
       * (11 · 11 · 13 · 14 · 14 …, während die Namensliste jedes Mal
       * dieselben 13 Namen enthielt). Wer daraus „ein Raum fehlt" macht,
       * schickt den Bearbeiter auf jedem Projekt zu einem Raum, den es nicht
       * gibt — und entwertet damit jeden echten roten Befund.
       *
       * Die ehrliche Stufe ist deshalb: sieh hier noch einmal hin. */
      merkmale.push({
        id: "raeume", titel: "Räume auf " + blatt, a: a, b: b, einheit: "Räume",
        stufe: "hinweis",
        text: "Die zweite Lesung meldet " + b + " beschriftete Räume, die erste hat "
          + a + " ausgewertet — sie nennt aber keinen Raum, den die erste nicht auch "
          + "hat. Damit steht Zahl gegen Zahl und nicht Name gegen Name; welcher Raum "
          + "gemeint wäre, sagt die Zählung nicht. Das ist kein Beleg für einen "
          + "fehlenden Raum und auch keiner für Vollständigkeit. Wer sichergehen "
          + "will, zählt die Beschriftungen auf diesem Blatt einmal am Plan nach.",
      });
    } else if (b > a) {
      merkmale.push({
        id: "raeume", titel: "Räume auf " + blatt, a: a, b: b, einheit: "Räume",
        stufe: "fehler",
        text: "Die zweite Lesung zählt " + b + " beschriftete Räume, die erste hat "
          + a + " ausgewertet. Nur die zweite Lesung sieht " + nenne(nurZweite) + ". "
          + "Ein übersehener Raum senkt die Gebäudeheizlast und bleibt in Watt je "
          + "Quadratmeter unsichtbar. Bitte am Plan nachsehen und den Raum nachtragen "
          + "oder die Zahl hier berichtigen.",
      });
    } else if (a > b) {
      /* Auch hier: nur was sich BENENNEN lässt, trägt eine Warnung. Steht
         bloß eine kleinere Zahl da, ohne dass ein Name fehlt, ist das
         dieselbe nicht reproduzierbare Zahl wie oben. */
      merkmale.push({
        id: "raeume", titel: "Räume auf " + blatt, a: a, b: b, einheit: "Räume",
        stufe: nurErste.length ? "warnung" : "hinweis",
        text: nurErste.length
          ? ("Die erste Lesung hat " + a + " beschriftete Räume ausgewertet, die "
            + "zweite zählt " + b + ". Nur die erste Lesung sieht " + nenne(nurErste)
            + ". Möglich ist eine doppelt gelesene Zeile oder eine Beschriftung, die "
            + "kein Raum ist.")
          : ("Die erste Lesung hat " + a + " beschriftete Räume ausgewertet, die "
            + "zweite meldet " + b + " — ohne einen Namen zu nennen, der der ersten "
            + "fehlt. Zahl gegen Zahl belegt hier nichts; die Räume dieses Blattes "
            + "sind damit weder bestätigt noch widerlegt."),
      });
    } else {
      /* Gleiche Anzahl, andere Namen. Das ist kein Zahlenfehler, aber es
         heißt, dass mindestens eine Lesung einen Namen falsch gelesen hat —
         und der Name bestimmt über die Raumart und damit über die
         Raumtemperatur. */
      merkmale.push({
        id: "raeume", titel: "Räume auf " + blatt, a: a, b: b, einheit: "Räume",
        stufe: "warnung",
        text: "Beide Lesungen zählen " + a + " beschriftete Räume, benennen sie aber "
          + "verschieden: die erste liest " + nenne(nurErste) + ", die zweite "
          + nenne(nurZweite) + ". Der Name entscheidet über die Raumart und damit "
          + "über die Raumtemperatur.",
      });
    }
    const aussenAlle = e.aussen.concat(zAussen.filter(function (n) {
      return e.aussen.map(normName).indexOf(normName(n)) < 0;
    }));
    if (aussenAlle.length) {
      merkmale.push({
        id: "raeume_aussen", titel: "Außenflächen und Nebenbauten auf " + blatt,
        a: aussenAlle.length, b: null, einheit: "Flächen", stufe: "hinweis",
        text: nenne(aussenAlle) + (aussenAlle.length === 1 ? " ist" : " sind")
          + " auf dem Blatt beschriftet, " + (aussenAlle.length === 1 ? "zählt" : "zählen")
          + " für die Raumzahl aber nicht: eine Terrasse liegt außerhalb der "
          + "Gebäudehülle, eine Garage gehört als unbeheizter Bereich geführt und "
          + "nicht als Raum. Ob der unbeheizte Bereich angelegt ist, prüft die Zeile "
          + "„Unbeheizte Bereiche“.",
      });
    }
    if (e.ohneNamen > 0) {
      merkmale.push({
        id: "raeume_ohne_namen", titel: "Unbeschriftete Flächen auf " + blatt,
        a: e.ohneNamen, b: null, einheit: "Flächen", stufe: "hinweis",
        text: "Die erste Lesung führt zusätzlich " + e.ohneNamen
          + (e.ohneNamen === 1 ? " Fläche ohne Beschriftung" : " Flächen ohne Beschriftung")
          + ". Die zweite zählt nur Beschriftetes, deshalb bleiben sie aus dem "
          + "Vergleich heraus. Sie stehen im Raumbuch und sind dort zu benennen.",
      });
    }

    /* --- Fenster im Grundriss ----------------------------------------
     * DIESE PROBE GIBT ES NICHT MEHR, UND ZWAR AUS EINER MESSUNG.
     *
     * Hier stand ein vollständiger Abgleich mit vier Stufen und einer
     * begründeten Toleranz von einem Fenster. Die Begründung war richtig
     * (Doppelflügel, Fenstertür), die Voraussetzung war es nicht: sie setzte
     * voraus, dass die zweite Lesung Fenster ÜBERHAUPT reproduzierbar zählt.
     *
     * GEMESSEN, neun echte Lesungen desselben Blattes „BV 2-0887 Ziolkowski"
     * gegen den laufenden Endpunkt, jedes Mal dasselbe Bild:
     *     Erdgeschoss   4 · 6 · 8 · 6 · 5 · 8 Fenster
     *     Obergeschoss  3 · 4 · 6 · 4 · 6 · 6 Fenster
     * Auf dem Plan sind es im Erdgeschoss fünf. Eine Zahl, die zwischen vier
     * und acht schwankt, ist keine Zählung, sondern Rauschen; eine Toleranz
     * von eins fängt davon nichts. Sie hätte auf diesem einwandfreien
     * Gebäude in vier von sechs Lesungen einen roten Befund erzeugt.
     *
     * Der Unterschied zu den Räumen ist nicht Zufall, sondern liegt in der
     * Sache: hinter einem Raum steht eine BESCHRIFTUNG, die sich benennen und
     * am Plan wiederfinden lässt — die Namenslisten waren in allen neun
     * Lesungen wortgleich. Hinter einem Fenster steht nur eine Zahl. Eine
     * Zahl ohne benennbare Einträge kann nichts belegen und nichts widerlegen.
     *
     * Verschwiegen wird nichts: die gezählten Fenster stehen weiter in der
     * Antwort (fenster_gesamt, je Ebene) und werden dem Bearbeiter als das
     * gezeigt, was sie sind. Was hier verschwindet, ist die BEHAUPTUNG, sie
     * seien eine Gegenprobe. Der Abgleich Fassade für Fassade gegen eine
     * ANSICHT bleibt bestehen — dort zählt eine andere Zeichnung dieselben
     * Öffnungen, und das ist eine echte zweite Quelle.
     * ---------------------------------------------------------------- */
    let fa = 0, mitAngabe = 0;
    ((erste && erste.raeume) || []).forEach(function (r) {
      const n = zahl(r && r.fenster, null);
      if (n === null) return;
      mitAngabe++; fa += n;
    });
    const fb = z.fenster_gesamt;
    if (mitAngabe > 0 || fb > 0) {
      merkmale.push({
        id: "fenster", titel: "Fenster auf " + blatt, a: fa, b: fb,
        einheit: "Fenster", stufe: "hinweis", nurZurKenntnis: true,
        text: "Die erste Lesung zählt " + fa + " Fenster in den Grundrissen, die "
          + "zweite " + fb + ". Daraus wird bewusst kein Befund gemacht: an neun "
          + "Lesungen desselben Blattes gemessen schwankte diese Zahl für ein "
          + "einziges Geschoss zwischen vier und acht, während die Raumnamen jedes "
          + "Mal dieselben waren. Hinter einem Raum steht eine Beschriftung, hinter "
          + "einem Fenster nur eine Zahl — die lässt sich nicht am Plan wiederfinden. "
          + "Die Fenster sind damit ungeprüft; belegen lässt sich ihre Zahl nur an "
          + "einer Ansicht oder durch Abzählen am Plan.",
      });
    }

    return { merkmale: merkmale, zweite: z, gelesen: true };
  }

  /* ---------------------------------------------------------------------
   * Die Ebenen aller Blätter zu einer Zählung zusammenziehen
   * ------------------------------------------------------------------
   * Das ist die einzige Zählung der Geschosse, die nicht aus dem Raumbuch
   * selbst stammt. Ein Schnitt, der einen Spitzboden benennt, für den kein
   * Grundriss vorliegt, ist damit ein echter Befund — und zwar genau der,
   * den das Kontrollblatt bisher als Frage an den Bearbeiter weitergab.
   *
   * Zusammengefasst wird über eine hereingereichte Deutungsfunktion
   * (KERN_ZUORDNUNG.geschossAusText), damit "EG", "Erdgeschoss" und
   * "Erdgeschoß" eine Ebene sind. Was sich nicht deuten lässt, bleibt unter
   * seinem eigenen Namen stehen: lieber eine Ebene zu viel in der Liste,
   * über die jemand nachdenkt, als eine stillschweigend verschmolzene.
   * ------------------------------------------------------------------ */
  function ebenenVereinigen(blaetter, geschossAusText) {
    const deuten = (typeof geschossAusText === "function")
      ? geschossAusText : function () { return null; };
    const gesehen = {}, folge = [];
    (blaetter || []).forEach(function (b) {
      const gp = b && b.gegenprobe;
      if (!gp) return;
      (gp.ebenen || []).forEach(function (e) {
        const roh = text(e && e.bezeichnung);
        if (!roh) return;
        const g = deuten(roh);
        const k = (g && g.kuerzel) ? g.kuerzel : normName(roh);
        if (gesehen[k]) {
          if (e.gezeichnet) gesehen[k].gezeichnet = true;
          return;
        }
        gesehen[k] = { kuerzel: (g && g.kuerzel) || roh, wortlaut: roh,
                       gezeichnet: e.gezeichnet === true, blatt: b.name || "" };
        folge.push(gesehen[k]);
      });
    });
    return folge;
  }

  /** Die unbeheizten Bereiche, die irgendein Blatt beim Namen nennt.
   *  Doppelnennungen fallen weg: "Keller" auf drei Blättern ist ein Keller. */
  function unbeheiztVereinigen(blaetter) {
    const gesehen = {}, folge = [];
    (blaetter || []).forEach(function (b) {
      const gp = b && b.gegenprobe;
      if (!gp) return;
      (gp.unbeheizt_benannt || []).forEach(function (x) {
        const n = text(x);
        if (!n) return;
        const k = normName(n);
        if (!k || gesehen[k]) return;
        gesehen[k] = true;
        folge.push(n);
      });
    });
    return folge;
  }

  /** Die Urteile eines Blattes zu einem Wort zusammenziehen. */
  function schwerste(merkmale) {
    const rang = { fehler: 0, warnung: 1, hinweis: 2, belegt: 3 };
    let s = null;
    (merkmale || []).forEach(function (m) {
      if (s === null || rang[m.stufe] < rang[s]) s = m.stufe;
    });
    return s;
  }

  /* =====================================================================
   * Konsens zweier Raumlisten desselben Blattes
   * =====================================================================
   * GEMESSEN, mehrfach beim Kunden: dieselbe Datei liefert bei drei Lesungen
   * 10, 13 und 11 Raeume. Bisher gewann schlicht die laengere Liste
   * (app.js, Rettungsregel "zerlegt > erste"), und bei Gleichstand blieb das
   * ABGESCHNITTENE Erstergebnis samt Warnung stehen, obwohl die Felderlesung
   * vollstaendig war. Das ist Wuerfeln, kein Urteil.
   *
   * Die Regeln, knapp und nachpruefbar:
   *   1. Ein Raum, den beide Lesungen haben (gleicher Name, nach normName,
   *      und -- wo beide eines nennen -- gleiches Geschoss), ist EIN Raum.
   *      Es gilt der Datensatz der fuehrenden Lesung; die andere fuellt nur
   *      Felder auf, die dort leer sind.
   *   2. Ein Raum, den nur EINE Lesung hat, wird UEBERNOMMEN und als
   *      "aus einer Lesung" gekennzeichnet (konsens.lesungen = 1). Er
   *      verschwindet nicht -- ein still gestrichener Raum faellt nie auf,
   *      ein gekennzeichneter schon.
   *   3. Widersprechen sich die Flaechen (beide gesetzt, mehr als 2 %
   *      auseinander), gilt die fuehrende Lesung und der Streit wird
   *      GEMELDET (konflikte). Die letzte Instanz ist ohnehin der
   *      Flaechenstempel im Textstand: er ueberschreibt beim Uebernehmen ins
   *      Raumbuch jede abgelesene Zahl (app.js, Textstand schlaegt Modell).
   *   4. Namensgleiche Raeume bleiben MEHRFACH stehen (Multimenge): zwei
   *      Studios von je 45,96 m² sind zwei Raeume, nicht derselbe.
   *
   * Fuehrend ist die VOLLSTAENDIGE Lesung (nicht abgeschnitten); sind beide
   * vollstaendig, die erste. Das entscheidet der Aufrufer per opt.fuehrend.
   * ================================================================== */
  function feldwert(x) {
    return (x && typeof x === "object" && !Array.isArray(x)) ? x.wert : x;
  }
  function konsensName(r) { return normName(feldwert(r && r.bezeichnung)); }
  function konsensGeschoss(r) { return normName(feldwert(r && r.geschoss)); }

  function raumKonsens(fuehrend, andere, opt) {
    const o = opt || {};
    const A = Array.isArray(fuehrend) ? fuehrend : [];
    const B = Array.isArray(andere) ? andere : [];
    const raus = A.map(function (r) { return Object.assign({}, r); });
    const konflikte = [], nurAndere = [], ergaenzt = [];

    /* Zuordnung als Multimenge: erst Name+Geschoss, dann Name allein.
       "frei" fuehrt, welche Zeilen der fuehrenden Liste noch zu haben sind. */
    const frei = raus.map(function () { return true; });
    const zuordnung = B.map(function () { return -1; });
    /* ZWEI RAEUME GLEICHEN NAMENS DUERFEN NICHT UEBER KREUZ GEPAART WERDEN.
     *
     * Bisher gewann die ERSTE freie Zeile gleichen Namens. GEMESSEN am
     * Blattsatz „Hasenberg 10" (echter Lauf 26.08.2026): das Erdgeschoss hat
     * zwei Flure, 12,17 und 10,78 m². Die Felderlesung fuehrte den 10,78er,
     * die Erstlesung brachte beide mit — der 12,17er traf auf den 10,78er,
     * wurde als „Flaechenstreit" gemeldet und verworfen, und der zweite
     * Erstlesungs-Flur (10,78) kam als eigener Raum dazu. Im Raumbuch
     * standen danach ZWEI Flure mit 10,78 m², beide mit der Herkunft „im
     * Plan angeschrieben": 1,39 m² weniger, und die Meldung ueber den
     * „Streit" fuehrte in die Irre, weil es zwei verschiedene Raeume waren.
     *
     * Gepaart wird deshalb nach NAEHE der Flaeche: haben beide Zeilen eine,
     * gewinnt die geringste Abweichung. Ohne Flaeche bleibt es bei der
     * ersten freien Zeile — geraten wird nichts. */
    const passt = function (b, mitGeschoss) {
      const nb = konsensName(b), gb = konsensGeschoss(b);
      if (!nb) return -1;
      const fb = zahl(feldwert(b.flaeche_m2), null);
      let best = -1, bestAbstand = null;
      for (let i = 0; i < raus.length; i++) {
        if (!frei[i] || konsensName(raus[i]) !== nb) continue;
        const ga = konsensGeschoss(raus[i]);
        if (mitGeschoss) { if (!(ga && gb && ga === gb)) continue; }
        else if (!(!(ga && gb) || ga === gb)) continue;
        const fa = zahl(feldwert(raus[i].flaeche_m2), null);
        const abstand = (fa !== null && fb !== null) ? Math.abs(fa - fb) : null;
        if (best < 0) { best = i; bestAbstand = abstand; continue; }
        if (abstand !== null && (bestAbstand === null || abstand < bestAbstand)) {
          best = i; bestAbstand = abstand;
        }
      }
      return best;
    };
    [true, false].forEach(function (mitGeschoss) {
      B.forEach(function (b, bi) {
        if (zuordnung[bi] >= 0) return;
        const i = passt(b, mitGeschoss);
        if (i >= 0) { zuordnung[bi] = i; frei[i] = false; }
      });
    });

    B.forEach(function (b, bi) {
      const i = zuordnung[bi];
      if (i < 0) {
        /* Regel 2: nur in einer Lesung -- uebernehmen und kennzeichnen. */
        const neu = Object.assign({}, b);
        neu.konsens = { lesungen: 1, quelle: o.andereQuelle || "zweite Lesung" };
        raus.push(neu);
        nurAndere.push(text(feldwert(b.bezeichnung)) || "unbeschriftet");
        return;
      }
      const a = raus[i];
      /* Regel 3: Flaechenstreit melden, fuehrende Lesung behalten. */
      const fa = zahl(feldwert(a.flaeche_m2), null);
      const fb = zahl(feldwert(b.flaeche_m2), null);
      if (fa !== null && fb !== null && Math.abs(fa - fb) > 0.02 * Math.max(fa, 1)) {
        konflikte.push({ bezeichnung: text(feldwert(a.bezeichnung)),
                         behalten: fa, verworfen: fb });
      }
      /* Regel 1: leere Felder der fuehrenden Zeile auffuellen. */
      ["flaeche_m2", "geschoss", "raumart", "fenster", "aussenwaende",
       "lichte_hoehe_m", "umfang_m", "aussenwand_m", "breite_m", "tiefe_m",
       "ecken"].forEach(function (k) {
        if ((a[k] === null || a[k] === undefined || a[k] === "")
            && b[k] !== null && b[k] !== undefined && b[k] !== "") {
          a[k] = b[k];
          if (ergaenzt.indexOf(k) < 0) ergaenzt.push(k);
        }
      });
    });
    /* Raeume, die nur die fuehrende Lesung hat, ebenfalls kennzeichnen --
       aber nur, wenn die andere Lesung ueberhaupt etwas hatte: gegen eine
       leere Liste ist jeder Raum "einseitig", und das sagte nichts. */
    const nurFuehrend = [];
    if (B.length) {
      raus.forEach(function (r, i) {
        if (i < frei.length && frei[i]) {
          r.konsens = { lesungen: 1, quelle: o.fuehrendQuelle || "eine Lesung" };
          nurFuehrend.push(text(feldwert(r.bezeichnung)) || "unbeschriftet");
        }
      });
    }
    return { raeume: raus, nurFuehrend: nurFuehrend, nurAndere: nurAndere,
             konflikte: konflikte, ergaenzt: ergaenzt };
  }

  /* =====================================================================
   * Was laut Zaehlung je Ebene FEHLT
   * =====================================================================
   * Die zweite Lesung zaehlt beschriftete Raeume je gezeichneter Ebene
   * (raeumeJeEbene). Hier wird sie gegen die Raumliste der ersten Lesung
   * gehalten: welche NAMEN nennt die Zaehlung, die in der Raumliste nicht
   * vorkommen -- und auf welcher Ebene stehen sie. Genau das ist der
   * Suchauftrag fuer eine gezielte Nachlesung dieses einen Feldes.
   *
   * Verglichen wird als Multimenge UEBER DAS GANZE BLATT: "FLUR" steht auf
   * dem Ziolkowski-Bogen im Keller UND im Obergeschoss; je Ebene einzeln
   * gerechnet wuerde derselbe Flur doppelt fehlen oder doppelt gefunden.
   * Nur benennbare Raeume zaehlen (zaehltAlsRaum, istRaumname) -- eine Zahl
   * ohne Namen dahinter belegt nichts, siehe Kopf dieser Datei.
   * ================================================================== */
  function fehltJeEbene(ebenen, raeume, istRaumname) {
    const pruef = (typeof istRaumname === "function") ? istRaumname
      : function () { return true; };
    const rest = [];
    (Array.isArray(raeume) ? raeume : []).forEach(function (r) {
      const nm = text(feldwert(r && r.bezeichnung));
      if (nm && pruef(nm) && zaehltAlsRaum(nm)) rest.push(normName(nm));
    });
    const raus = [];
    (Array.isArray(ebenen) ? ebenen : []).forEach(function (e, i) {
      const namen = (e && Array.isArray(e.namen) ? e.namen : [])
        .filter(function (nm) { return zaehltAlsRaum(nm) && pruef(nm); });
      const fehlt = [];
      namen.forEach(function (nm) {
        const j = rest.indexOf(normName(nm));
        if (j >= 0) rest.splice(j, 1); else fehlt.push(nm);
      });
      if (fehlt.length) {
        raus.push({ ebene: text(e.ebene) || ("Ebene " + (i + 1)), index: i,
                    fehlt: fehlt, alle: namen });
      }
    });
    return raus;
  }

  /* =====================================================================
   * Selbsttest
   * ================================================================== */
  function selbsttest() {
    const f = [];
    let n = 0;
    const p = function (bed, was) { n++; if (!bed) f.push(was); };
    const raum = function (name, fenster) {
      return { bezeichnung: name, fenster: fenster === undefined ? null : fenster };
    };
    const istRaumname = function (s) {
      return !/^(rh|okff|uk|brh)\b[\s.:=+-]*\d/i.test(String(s))
        && !/^[+-]?\d+([.,]\d+)?\s*(m|m²|qm)?$/i.test(String(s));
    };
    const g = function (o) {
      return Object.assign({
        blattart: "grundriss", raeume_beschriftet: 0, raumnamen: [],
        fenster_gesamt: 0, ebenen: [],
        unbeheizt_benannt: [], unbeheizt_unbenannt: 0,
        nordpfeil: { vorhanden: false, richtung: "unbekannt" },
      }, o);
    };
    const eb = function (name, o) {
      return Object.assign({ bezeichnung: name, gezeichnet: true,
        raeume_beschriftet: 0, raumnamen: [], fenster: 0,
        aussen_breite_m: null, aussen_tiefe_m: null, aussen_wortlaut: "" }, o);
    };

    // 1. Fehlt die zweite Lesung ganz, gibt es kein Urteil und keinen Absturz.
    {
      const r = abgleich({ raeume: [raum("Wohnen")] }, null, {});
      p(r.gelesen === false && r.merkmale.length === 0,
        "Ohne zweite Lesung darf kein Urteil entstehen");
    }

    // 2. Übereinstimmung: belegt, und zwar nur bei GLEICHEN Namen.
    {
      const r = abgleich({ raeume: [raum("Wohnen"), raum("Bad")] },
        g({ raeume_beschriftet: 2, raumnamen: ["Bad", "Wohnen"] }),
        { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "belegt", "Gleiche Zahl und gleiche Namen sind belegt");
    }

    // 3. DER FALL, UM DEN ES GEHT: die zweite Lesung findet einen Raum mehr.
    {
      const r = abgleich({ raeume: [raum("Wohnen"), raum("Bad")] },
        g({ raeume_beschriftet: 3, raumnamen: ["Wohnen", "Bad", "Ankleide"] }),
        { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "fehler", "Ein Raum mehr in der zweiten Lesung ist ein Fehler");
      p(m && /Ankleide/.test(m.text), "Der fehlende Raum muss beim Namen genannt werden");
    }

    // 4. Umgekehrt: die erste hat eine Zeile zu viel — Warnung, kein Fehler.
    {
      const r = abgleich({ raeume: [raum("Wohnen"), raum("Bad"), raum("Bad")] },
        g({ raeume_beschriftet: 2, raumnamen: ["Wohnen", "Bad"] }),
        { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "warnung", "Eine Zeile zu viel ist eine Warnung");
    }

    // 5. Ein gespiegeltes Doppelhaus: derselbe Name zweimal ist zweimal.
    {
      const r = abgleich({ raeume: [raum("HWR"), raum("HWR")] },
        g({ raeume_beschriftet: 2, raumnamen: ["HWR", "HWR"] }),
        { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "belegt", "Zwei gleich benannte Räume sind zwei Räume");
    }

    // 6. Vermassungen der ersten Lesung erzeugen keinen Fehlalarm.
    {
      const r = abgleich({ raeume: [raum("Wohnen"), raum("RH 2,28")] },
        g({ raeume_beschriftet: 1, raumnamen: ["Wohnen"] }),
        { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "belegt",
        "Eine Vermassung in der ersten Lesung darf keinen Befund erzeugen");
    }

    // 7. Unbeschriftete Flächen bleiben aus dem Vergleich heraus, werden aber
    //    genannt.
    {
      const r = abgleich({ raeume: [raum("Wohnen"), raum("")] },
        g({ raeume_beschriftet: 1, raumnamen: ["Wohnen"] }),
        { istRaumname: istRaumname });
      p(r.merkmale.find((x) => x.id === "raeume").stufe === "belegt",
        "Eine unbeschriftete Flaeche darf die Raumzahl nicht verfaelschen");
      p(!!r.merkmale.find((x) => x.id === "raeume_ohne_namen"),
        "Unbeschriftete Flaechen muessen genannt werden");
    }

    // 8. Gleiche Zahl, andere Namen: Warnung, weil der Name die Raumart setzt.
    {
      const r = abgleich({ raeume: [raum("Küche")] },
        g({ raeume_beschriftet: 1, raumnamen: ["Bad"] }),
        { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "warnung", "Gleiche Zahl mit anderen Namen ist eine Warnung");
    }

    // 9. Fenster: KEINE Probe mehr, und zwar in keiner Richtung.
    //    Begruendung an der Fundstelle im Abgleich: an neun echten Lesungen
    //    desselben Blattes schwankte die Fensterzahl eines Geschosses zwischen
    //    vier und acht. Weder Uebereinstimmung noch Abweichung darf daraus ein
    //    Urteil werden; beides waere Zufall. Geprueft wird hier, dass keine der
    //    vier Zahlenlagen mehr eine Stufe ueber "hinweis" erzeugt.
    {
      const faelle = [[4, 5], [2, 3], [5, 7], [5, 5], [9, 2]];
      faelle.forEach(function (fp) {
        const r = abgleich({ raeume: [raum("W", fp[0])] },
          g({ fenster_gesamt: fp[1] }), { istRaumname: istRaumname });
        const m = r.merkmale.find((x) => x.id === "fenster");
        p(m && m.stufe === "hinweis" && m.nurZurKenntnis === true,
          "Fenster " + fp[0] + " gegen " + fp[1] + " ist nur zur Kenntnis, kein Urteil");
      });
      const gleich = abgleich({ raeume: [raum("W", 5)] },
        g({ fenster_gesamt: 5 }), { istRaumname: istRaumname });
      p(gleich.merkmale.every((x) => x.id !== "fenster" || x.stufe !== "belegt"),
        "Gleiche Fensterzahl belegt nichts -- zwei gleiche Zufallszahlen sind kein Beleg");
    }

    // 10. Kontur je Ebene aus der Außenbemaßung, samt Schranken.
    {
      const k = konturAusEbene(eb("EG", { aussen_breite_m: 11.95,
        aussen_tiefe_m: 9.4, aussen_wortlaut: "11,95" }));
      p(k && Math.abs(k.A - 112.33) < 0.02, "Kontur 11,95 x 9,40 = 112,33 m²");
      p(k && Math.abs(k.U - 42.7) < 0.02, "Umfang 2 x (11,95 + 9,40) = 42,70 m");
      p(k && k.rechteckig === true, "Die Kontur aus zwei Massen ist ein Rechteck");
      p(konturAusEbene(eb("EG", { aussen_breite_m: 1195, aussen_tiefe_m: 940 }))
        === null, "Nicht umgerechnete Zentimeter muessen verworfen werden");
      p(konturAusEbene(eb("EG", { aussen_breite_m: 1.2, aussen_tiefe_m: 9.4 }))
        === null, "Eine Kante unter zwei Metern ist kein Gebaeude");
      p(konturAusEbene(eb("EG", {})) === null, "Ohne Masse keine Kontur");
    }

    /* 10y. ZWEI RAEUME GLEICHEN NAMENS: die Paarung folgt der Flaeche.
       Echter Lauf „Hasenberg 10" (26.08.2026): EG hat zwei Flure,
       12,17 und 10,78 m². */
    {
      const fuehrend = [{ bezeichnung: "Flur", geschoss: "EG", flaeche_m2: 10.78 },
                        { bezeichnung: "Flur", geschoss: "EG", flaeche_m2: 12.17 }];
      const andere = [{ bezeichnung: "Flur", geschoss: "EG", flaeche_m2: 12.17 },
                      { bezeichnung: "Flur", geschoss: "EG", flaeche_m2: 10.78 }];
      const k = raumKonsens(fuehrend, andere, {});
      p(k.raeume.length === 2, "Zwei gleichnamige Flure bleiben zwei Raeume");
      p(k.konflikte.length === 0,
        "Kein erfundener Flaechenstreit zwischen zwei verschiedenen Raeumen");
      const flaechen = k.raeume.map(function (r) { return r.flaeche_m2; }).sort();
      p(Math.abs(flaechen[0] - 10.78) < 0.01 && Math.abs(flaechen[1] - 12.17) < 0.01,
        "Beide Flaechen bleiben erhalten (10,78 und 12,17)");
      /* Gegenprobe: ein ECHTER Streit ueber denselben Raum wird weiter
         gemeldet -- die Naehe-Paarung deckt nichts zu. */
      const s2 = raumKonsens([{ bezeichnung: "Bad", flaeche_m2: 9.04 }],
                             [{ bezeichnung: "Bad", flaeche_m2: 9.39 }], {});
      p(s2.konflikte.length === 1, "Ein echter Flaechenstreit faellt weiter auf");
    }

    /* 10z. DIE ZAHL MUSS ZU IHRER EIGENEN MASSKETTE PASSEN.
       Echter Lauf „Hasenberg 10" (26.08.2026, Blatt 2): 20,55 m genannt,
       Kette „1,945 + 5,56 + 7,90 + 3,545" ergibt 18,95 m. */
    {
      const d = ketteDeckt("1,945 + 5,56 + 7,90 + 3,545 (oben) / 10,53 (rechts)", 20.55);
      p(d && d.gedeckt === false, "Eine Zahl ohne deckende Masskette faellt auf");
      const d2 = ketteDeckt("1,945 + 5,56 + 7,90 + 3,545 (oben) / 10,53 (rechts)", 18.95);
      p(d2 && d2.gedeckt === true, "Die Kettensumme selbst ist gedeckt");
      const d3 = ketteDeckt("1,945 + 5,56 + 7,90 + 3,545 (oben) / 10,53 (rechts)", 10.53);
      p(d3 && d3.gedeckt === true, "Ein Einzelmass des Wortlauts ist gedeckt");
      p(ketteDeckt("30|2.93|13|1.10|13|3.41|30", 8.3) === null,
        "Gemischte Einheiten geben KEIN Urteil (kein Fehlalarm)");
      p(ketteDeckt("", 8.3) === null, "Ohne Wortlaut kein Urteil");
      const kw = konturAusEbene({ bezeichnung: "OBERGESCHOSS", gezeichnet: true,
        aussen_breite_m: 20.55, aussen_tiefe_m: 10.53,
        aussen_wortlaut: "1,945 + 5,56 + 7,90 + 3,545 (oben) / 10,53 (rechts)" });
      p(!!kw && !!kw.widerspruch, "Die Kontur traegt den Widerspruch");
      p(!!kw && /trägt diese Zahl nicht/.test(kw.quelle),
        "Die Herkunft beruft sich nicht auf eine Kette, die sie nicht traegt");
      p(!!kw && Math.abs(kw.A - 216.39) < 0.01,
        "Die Kontur bleibt als Obergrenze stehen (nichts wird weggelassen)");
      const ko = konturAusEbene({ bezeichnung: "ERDGESCHOSS", gezeichnet: true,
        aussen_breite_m: 12.5, aussen_tiefe_m: 8,
        aussen_wortlaut: "8,00 / 1,00 + 5,50 + 6,00" });
      p(!!ko && !ko.widerspruch, "Eine gedeckte Zahl bleibt ohne Befund");
    }

    /* 10a. DER ECHTE FALL „BV 2-0887 Ziolkowski": ein A3-Bogen mit DREI
       Grundrissen. Je Ebene eine eigene Zahl und eine eigene Kontur — sonst
       liefe die Kontur des Erdgeschosses (8,00 x 12,50 = 100 m²) gegen ein
       Kellergeschoss, das nur zur Hälfte unterkellert ist (8,00 x 7,00). */
    {
      const bogen = g({
        raeume_beschriftet: 13, fenster_gesamt: 14,
        raumnamen: ["KELLER", "FLUR", "GAST / ARBEITEN", "WC", "DIELE", "KOCHEN",
                    "ESSEN", "WOHNEN", "SCHLAFEN", "BADEN", "FLUR", "KIND I",
                    "KIND II"],
        unbeheizt_benannt: ["SPITZBODEN"],
        ebenen: [
          eb("GRUNDRISS KELLERGESCHOSS", { raeume_beschriftet: 2,
            raumnamen: ["KELLER", "FLUR"], fenster: 0,
            aussen_breite_m: 8, aussen_tiefe_m: 7, aussen_wortlaut: "8,00 / 7,00" }),
          eb("GRUNDRISS ERDGESCHOSS", { raeume_beschriftet: 6,
            raumnamen: ["GAST / ARBEITEN", "WC", "DIELE", "KOCHEN", "ESSEN", "WOHNEN"],
            fenster: 7, aussen_breite_m: 8, aussen_tiefe_m: 12.5,
            aussen_wortlaut: "8,00 / 1,00 + 5,50 + 6,00" }),
          eb("GRUNDRISS OBERGESCHOSS", { raeume_beschriftet: 5,
            raumnamen: ["SCHLAFEN", "BADEN", "FLUR", "KIND I", "KIND II"],
            fenster: 7, aussen_breite_m: 8, aussen_tiefe_m: 12.5,
            aussen_wortlaut: "8,00" }),
          eb("SPITZBODEN", { gezeichnet: false }),
        ],
      });
      const je = raeumeJeEbene(bogen);
      p(je.length === 3, "Nur gezeichnete Ebenen tragen eine Raumzahl");
      p(je[1].n === 6 && je[2].n === 5,
        "Die Raumzahl gehoert der Ebene, nicht dem Blatt");
      const ks = konturenAusBlatt(bogen);
      p(ks.length === 3, "Jede gezeichnete Ebene bekommt ihre eigene Kontur");
      p(Math.abs(ks[0].A - 56) < 0.01 && Math.abs(ks[1].A - 100) < 0.01,
        "Kellergeschoss 56 m², Erdgeschoss 100 m² -- und nicht beide 100");
      p(normieren(bogen).raeume_beschriftet === 13,
        "Die Blattsumme bleibt die Summe der Ebenen");
      p(normieren(bogen).fenster_gesamt === 14, "Ebenso die Fenster");
    }

    // 11. Normieren rettet eine unvollständige Antwort und nimmt die größere
    //     der beiden Raumzahlen.
    {
      const z = normieren({ raeume_beschriftet: 2,
                            raumnamen: ["A", "B", "C"] });
      p(z.raeume_beschriftet === 3,
        "Bei Vollstaendigkeit gilt die groessere der beiden Zahlen");
      const leer = normieren(null);
      p(leer.vorhanden === false && leer.raeume_beschriftet === 0
        && leer.raumnamen.length === 0 && leer.ebenen.length === 0
        && leer.nordpfeil.richtung === "unbekannt",
        "Eine fehlende Antwort ergibt eine vollstaendige leere Form");
    }

    /* 11a. DER ZWEITE ECHTE FALL, „13_BA 03_EG" (Am Gunnebach 9, Paderborn):
       neben elf Wohnräumen stehen „Terrasse 27,82 m²" und „Garage 38,23 m²"
       mit Flächenstempel. Werden sie mitgezählt, meldet die Gegenprobe zwei
       fehlende Räume, die es nicht gibt. */
    {
      const wohnraeume = ["Essen", "Küche", "Wohnen", "Eingang", "Diele",
        "Abstell.", "Gäste-WC", "Garderobe", "Zimmer", "Bad", "Abstell."];
      const alle = ["Terrasse"].concat(wohnraeume).concat(["Garage"]);
      const gunne = g({
        raeume_beschriftet: 13, raumnamen: alle,
        unbeheizt_benannt: ["Garage"],
        ebenen: [eb("Grundriss Erdgeschoss", { raeume_beschriftet: 13,
          raumnamen: alle, fenster: 9,
          aussen_breite_m: 9.145, aussen_tiefe_m: 11.985 })],
      });
      const je = raeumeJeEbene(gunne);
      p(je[0].n === 11 && je[0].n_roh === 13,
        "Terrasse und Garage duerfen die Raumzahl nicht aufblaehen");
      p(je[0].ausgeschlossen.length === 2,
        "und sie muessen beim Namen genannt werden");
      const r = abgleich({ raeume: wohnraeume.map(function (n) {
        return { bezeichnung: n, fenster: null };
      }) }, gunne, { istRaumname: istRaumname });
      const m = r.merkmale.find((x) => x.id === "raeume");
      p(m && m.stufe === "belegt",
        "elf Wohnraeume gegen elf: eine Garage darf keinen Fehlalarm ausloesen");
      const h = r.merkmale.find((x) => x.id === "raeume_aussen");
      p(h && /Terrasse/.test(h.text) && /Garage/.test(h.text),
        "was herausfaellt, muss genannt werden und nicht verschwinden");
      const k = konturenAusBlatt(gunne);
      p(k.length === 1 && Math.abs(k[0].A - 109.6) < 0.1,
        "die Aussenbemassung 9,145 x 11,985 ergibt rund 109,6 m²");
    }

    // 12. Ebenen und unbeheizte Bereiche über alle Blätter zusammenziehen.
    {
      const deuten = function (t) {
        if (/erdgeschoss|\beg\b/i.test(t)) return { kuerzel: "EG" };
        if (/kellergeschoss|\bkg\b|keller/i.test(t)) return { kuerzel: "KG" };
        return null;
      };
      const bl = [
        { name: "EG", gegenprobe: normieren(g({
            ebenen: [eb("Erdgeschoss")],
            unbeheizt_benannt: ["Keller"] })) },
        { name: "Schnitt", gegenprobe: normieren(g({
            ebenen: [eb("EG", { gezeichnet: false }),
                     eb("Spitzboden", { gezeichnet: false })],
            unbeheizt_benannt: ["Keller", "Spitzboden"] })) },
        { name: "ohne", gegenprobe: null },
      ];
      const e = ebenenVereinigen(bl, deuten);
      p(e.length === 2, "„Erdgeschoss“ und „EG“ sind eine Ebene");
      p(e[0].gezeichnet === true && e[1].gezeichnet === false,
        "Gezeichnet gewinnt ueber nur benannt");
      p(e[1].kuerzel === "Spitzboden",
        "Was sich nicht deuten laesst, behaelt seinen Namen");
      const u = unbeheiztVereinigen(bl);
      p(u.length === 2 && u.indexOf("Keller") >= 0 && u.indexOf("Spitzboden") >= 0,
        "Derselbe Keller auf zwei Blaettern ist ein Keller");
      p(ebenenVereinigen(null, deuten).length === 0, "Ohne Blaetter keine Ebene");
    }

    // 13. schwerste() bestimmt das Wort für das ganze Blatt.
    {
      p(schwerste([{ stufe: "belegt" }, { stufe: "warnung" }]) === "warnung",
        "Die schwerste Stufe gewinnt");
      p(schwerste([]) === null, "Ohne Merkmal kein Urteil");
    }

    /* --- Jedes Fenster genau einmal ---------------------------------
     * Ein A3-Bogen mit drei Grundrissen, einem Schnitt und einer Ansicht.
     * Der Schnitt benennt den Spitzboden als vierte Ebene (gezeichnet
     * false), die Ansicht zeigt sechs Fenster derselben Wand. Gezaehlt
     * werden die elf Fenster der Grundrisse -- die sechs der Ansicht sind
     * dieselben, von aussen gesehen. Vorher stand hier max(gemeldet, Summe
     * ueber ALLE Ebenen); auf Sebastians Blatt wurden daraus achtzehn und
     * ein roter Befund ueber sieben fehlende Fenster an einem
     * einwandfreien Gebaeude. */
    {
      const bogen = {
        blattart: "grundriss", raeume_beschriftet: 13, raumnamen: [],
        fenster_gesamt: 17,
        ansichten: [{ fassade: "West", fenster: 6 }],
        ebenen: [
          { bezeichnung: "SPITZBODEN", gezeichnet: false, raeume_beschriftet: 0,
            raumnamen: [], fenster: 0 },
          { bezeichnung: "GRUNDRISS OG", gezeichnet: true, raeume_beschriftet: 5,
            raumnamen: [], fenster: 4 },
          { bezeichnung: "GRUNDRISS EG", gezeichnet: true, raeume_beschriftet: 6,
            raumnamen: [], fenster: 6 },
          { bezeichnung: "GRUNDRISS KG", gezeichnet: true, raeume_beschriftet: 2,
            raumnamen: [], fenster: 1 },
        ],
        unbeheizt_benannt: [], unbeheizt_unbenannt: 0, nordpfeil: {},
      };
      const z = normieren(bogen);
      p(z.fenster_gesamt === 11,
        "Die Fenster der Grundrisse zaehlen, die der Ansicht nicht: "
          + z.fenster_gesamt);
      p(z.fenster_gemeldet === 17,
        "Die gemeldete Blattzahl bleibt nachvollziehbar erhalten");
      p(z.ansichten.length === 1 && z.ansichten[0].fenster === 6
        && z.ansichten[0].fassade === "West",
        "Die Ansicht kommt als eigene Fassade an und geht nicht verloren");
      /* Ohne Wortlaut ist die Fassadenbezeichnung eine unbelegte Behauptung
         des Modells. Gemessen am 24.08.2026: „Fassade West" gemeldet, auf
         dem Blatt gibt es nur Nord/Ost/Süd. */
      p(z.ansichten[0].fassade_belegt === false,
        "Eine Fassadenbezeichnung ohne Wortlaut darf nicht als belegt gelten");
      p(fassadeBelegt("West", "ANSICHT VON WESTEN") === true,
        "ANSICHT VON WESTEN muss West belegen");
      p(fassadeBelegt("West", "ANSICHT NORD") === false,
        "ANSICHT NORD darf West nicht belegen");
      p(fassadeBelegt("Sued", "SÜDANSICHT") === true,
        "SÜDANSICHT muss Sued belegen");
      p(fassadeBelegt("Ost", "Ansicht von Osten") === true,
        "Ansicht von Osten muss Ost belegen");
      p(fassadeBelegt("Strassenseite", "Ansicht Straßenseite") === true,
        "Ein Wortlaut ohne Himmelsrichtung belegt die gleichlautende Bezeichnung");
      p(fassadeBelegt("West", null) === false && fassadeBelegt("", "x") === false,
        "Ohne Fassade oder ohne Wortlaut ist nichts belegt");
      const belegt = normieren({ blattart: "grundriss", fenster_gesamt: 0,
        ebenen: [], ansichten: [{ fassade: "West", fenster: 4,
          fassade_wortlaut: "ANSICHT VON WESTEN" }] },
        { istRaumname: istRaumname });
      p(belegt.ansichten[0].fassade_belegt === true
        && belegt.ansichten[0].fassade_wortlaut === "ANSICHT VON WESTEN",
        "Mit passendem Wortlaut ist die Fassade belegt und der Wortlaut reist mit");

      /* Die Masse aus der Ansicht: nur eine VOLLSTAENDIGE Liste zaehlt. */
      const mitMass = normieren({ blattart: "grundriss", fenster_gesamt: 0,
        ebenen: [], ansichten: [{ fassade: "West", fenster: 2,
          breite_bezug_m: 8, oeffnungen: [
            { breite_anteil: 0.4125, hoehe_anteil: 0.2625,
              geschoss: "ERDGESCHOSS", ist_tuer: true },
            { breite_anteil: 0.1575, hoehe_anteil: 0.175,
              geschoss: "OBERGESCHOSS", ist_tuer: false }] }] },
        { istRaumname: istRaumname });
      p(mitMass.ansichten[0].oeffnungen.length === 2
        && mitMass.ansichten[0].breite_bezug_m === 8,
        "Die Oeffnungsmasse der Ansicht muessen ankommen");
      p(mitMass.ansichten[0].oeffnungen[0].ist_tuer === true,
        "Eine Oeffnung bis zum Gelaende bleibt als Tuer gekennzeichnet");
      const halb = normieren({ blattart: "grundriss", fenster_gesamt: 0,
        ebenen: [], ansichten: [{ fassade: "Ost", fenster: 4,
          oeffnungen: [{ breite_anteil: 0.2, hoehe_anteil: 0.2,
                         geschoss: "", ist_tuer: false }] }] },
        { istRaumname: istRaumname });
      p(halb.ansichten[0].oeffnungen.length === 0,
        "Eine halbe Oeffnungsliste wird verworfen -- sonst laesst sie Flaeche "
        + "vermissen, die gar nicht fehlt");
      const krumm = normieren({ blattart: "grundriss", fenster_gesamt: 0,
        ebenen: [], ansichten: [{ fassade: "Sued", fenster: 1,
          oeffnungen: [{ breite_anteil: 1.8, hoehe_anteil: 0.2,
                         geschoss: "", ist_tuer: false }] }] },
        { istRaumname: istRaumname });
      p(krumm.ansichten[0].oeffnungen.length === 0,
        "Ein Anteil ueber 1 ist kein Anteil und wird verworfen");
      p(z.raeume_beschriftet === 13,
        "Nur gezeichnete Ebenen zaehlen in die Raumsumme: " + z.raeume_beschriftet);
      /* Der Spitzboden bleibt eine Ebene -- er wird nicht gezaehlt, aber
         auch nicht verschluckt. */
      p(z.ebenen.length === 4 && z.ebenen[0].bezeichnung === "SPITZBODEN",
        "Eine nur benannte Ebene bleibt in der Liste");
      /* Ohne einzeln aufgefuehrte Ebene bleibt die gemeldete Blattzahl die
         einzige Angabe -- dort kann sie nicht doppelt zaehlen. */
      const einzeln = normieren({ blattart: "grundriss", fenster_gesamt: 7,
        ebenen: [], raumnamen: [] });
      p(einzeln.fenster_gesamt === 7,
        "Ohne Ebenenliste gilt die gemeldete Zahl: " + einzeln.fenster_gesamt);
      /* Und eine Ebene, die als Grundriss gezeichnet ist, aber null Fenster
         hat, darf nicht auf die Blattzahl zurueckfallen: null ist eine
         Antwort. */
      const keine = normieren({ blattart: "grundriss", fenster_gesamt: 9,
        raumnamen: [],
        ebenen: [{ bezeichnung: "EG", gezeichnet: true, fenster: 0,
                   raeume_beschriftet: 3, raumnamen: [] }] });
      p(keine.fenster_gesamt === 0,
        "Eine gezeichnete Ebene ohne Fenster meldet null, nicht die Blattzahl: "
          + keine.fenster_gesamt);
    }

    /* 12. DIE DREI BEFUNDE VOM 22.08.2026, jeder mit seiner eigenen Probe.
     *     Sie sind an Sebastians Blatt "BV 2-0887 Ziolkowski" gemessen und
     *     hier festgehalten, damit keiner von ihnen zurueckkommt. */
    {
      /* (a) EINE ANTWORT AUS LAUTER BUCHHALTUNG IST KEINE LESUNG.
         Der Endpunkt rettete eine in den ersten Zeichen abgebrochene Antwort
         zu "{}" und haengte _abgeschnitten und _verbrauch an. Object.keys
         war damit nicht leer, die Gegenprobe galt als gelaufen, und aus dem
         Abbruch wurde "die zweite Lesung zaehlt null Raeume". */
      const leer = abgleich({ raeume: [raum("Wohnen"), raum("Kochen")] },
        { _abgeschnitten: { grund: "zeit", sekunden: 29 },
          _verbrauch: { ausgabe_token: 40 } },
        { istRaumname: istRaumname });
      p(leer.gelesen === false,
        "Eine Antwort nur aus _abgeschnitten und _verbrauch ist keine Lesung");
      p(leer.merkmale.length === 0,
        "Aus einer Nichtlesung entsteht kein einziges Merkmal");
      /* Auch ein voellig leerer Koerper. */
      p(abgleich({ raeume: [raum("Wohnen")] }, {},
        { istRaumname: istRaumname }).gelesen === false,
        "Ein leerer Koerper ist keine Lesung");
      /* Aber eine echte, wenn auch leere Zaehlung IST eine: ein Lageplan
         ohne Raeume meldet blattart und leere Listen, und das ist eine
         Aussage. */
      p(abgleich({ raeume: [] }, { blattart: "lageplan", raumnamen: [],
        ebenen: [], ansichten: [] }, { istRaumname: istRaumname }).gelesen === true,
        "Ein Lageplan mit leeren Listen ist sehr wohl eine Lesung");

      /* (b) DIE LISTE ZAEHLT, NICHT DIE ZAHL DANEBEN.
         Gemessen: die Liste enthielt neunmal dieselben 13 Namen, die Zahl
         daneben lautete 11, 13 oder 14. Das fruehere Maximum machte daraus
         einen fehlenden Raum. */
      const skalar = normieren({ blattart: "grundriss", raeume_beschriftet: 14,
        raumnamen: [], fenster_gesamt: 0, ansichten: [],
        ebenen: [{ bezeichnung: "EG", gezeichnet: true, raeume_beschriftet: 7,
                   raumnamen: ["GAST / ARBEITEN", "WC", "DIELE", "KOCHEN",
                               "ESSEN", "WOHNEN"], fenster: 8 }] });
      p(skalar.raeume_beschriftet === 6,
        "Sechs Namen sind sechs Raeume, auch wenn 14 danebensteht: "
          + skalar.raeume_beschriftet);
      p(raeumeJeEbene(skalar)[0].n === 6,
        "Auch je Ebene zaehlt die Liste, nicht die Zahl: "
          + raeumeJeEbene(skalar)[0].n);
      /* Ohne Liste bleibt die Zahl der Rueckfall -- sonst verloere ein alter
         Endpunkt seine einzige Angabe. */
      const ohneListe = normieren({ blattart: "grundriss", raeume_beschriftet: 5,
        raumnamen: [], ebenen: [] });
      p(ohneListe.raeume_beschriftet === 5,
        "Ohne Liste gilt die gemeldete Zahl weiter: " + ohneListe.raeume_beschriftet);

      /* (c) EINE ZAHL OHNE NAMEN IST KEIN BEFUND.
         Meldet die zweite Lesung mehr Raeume, kann aber keinen nennen, den
         die erste nicht auch hat, ist das ein "sieh hier noch einmal hin"
         und kein Fehler. */
      const stumm = abgleich({ raeume: [raum("Wohnen"), raum("Kochen")] },
        { blattart: "grundriss", raeume_beschriftet: 4, raumnamen: [],
          ebenen: [], ansichten: [] }, { istRaumname: istRaumname });
      const mS = stumm.merkmale.find((x) => x.id === "raeume");
      p(mS && mS.stufe === "hinweis",
        "Mehr gezaehlt, keinen Namen genannt: Hinweis statt Fehler, war "
          + (mS && mS.stufe));
      /* Und die Gegenrichtung bleibt hart, sobald ein NAME fehlt. */
      const echt = abgleich({ raeume: [raum("Wohnen"), raum("Kochen")] },
        { blattart: "grundriss", raumnamen: ["Wohnen", "Kochen", "Speisekammer"],
          ebenen: [], ansichten: [] }, { istRaumname: istRaumname });
      const mE = echt.merkmale.find((x) => x.id === "raeume");
      p(mE && mE.stufe === "fehler" && /Speisekammer/.test(mE.text),
        "Ein benannter Raum mehr bleibt ein Fehler und wird beim Namen genannt");
    }

    /* 13. KONSENS ZWEIER RAUMLISTEN -- der gemessene Fall: dieselbe Datei
       liefert 10, 13, 11 Raeume. Die vollstaendige Felderlesung fuehrt, die
       abgeschnittene Erstlesung ergaenzt nur, und nichts geht verloren. */
    {
      const voll = [
        { bezeichnung: "KOCHEN", geschoss: "EG", flaeche_m2: 12.5 },
        { bezeichnung: "WOHNEN", geschoss: "EG", flaeche_m2: 28.4 },
        { bezeichnung: "FLUR", geschoss: "KG", flaeche_m2: 6.1 },
        { bezeichnung: "FLUR", geschoss: "OG", flaeche_m2: 7.2 },
      ];
      const kurz = [
        { bezeichnung: "Kochen", geschoss: "EG", flaeche_m2: 12.5, fenster: 2 },
        { bezeichnung: "BADEN", geschoss: "OG", flaeche_m2: 9.8 },
      ];
      const k = raumKonsens(voll, kurz, { andereQuelle: "Erstlesung" });
      p(k.raeume.length === 5,
        "4 + 2 mit einem gemeinsamen Raum muss 5 ergeben, nicht "
        + k.raeume.length);
      p(k.nurAndere.length === 1 && /BADEN/.test(k.nurAndere[0]),
        "Der Raum aus nur einer Lesung muss uebernommen werden");
      const baden = k.raeume.find(function (r) { return r.bezeichnung === "BADEN"; });
      p(!!(baden && baden.konsens && baden.konsens.lesungen === 1),
        "und er muss als 'aus einer Lesung' gekennzeichnet sein");
      const kochen = k.raeume.find(function (r) { return r.bezeichnung === "KOCHEN"; });
      p(!!(kochen && kochen.fenster === 2),
        "Die andere Lesung darf leere Felder auffuellen (Fensterzahl)");
      p(k.konflikte.length === 0, "Gleiche Flaechen sind kein Streit");
      /* Zwei namensgleiche Raeume auf verschiedenen Geschossen bleiben zwei. */
      p(k.raeume.filter(function (r) { return r.bezeichnung === "FLUR"; }).length === 2,
        "FLUR im KG und FLUR im OG sind zwei Raeume");
    }
    {
      /* Flaechenstreit: fuehrende Lesung behaelt, der Streit wird gemeldet. */
      const k = raumKonsens(
        [{ bezeichnung: "WOHNEN", flaeche_m2: 28.4 }],
        [{ bezeichnung: "Wohnen", flaeche_m2: 24.1 }]);
      p(k.raeume.length === 1 && k.raeume[0].flaeche_m2 === 28.4,
        "Bei Flaechenstreit gilt die fuehrende Lesung");
      p(k.konflikte.length === 1 && k.konflikte[0].verworfen === 24.1,
        "und der Streit muss gemeldet werden, nicht verschwinden");
      /* Multimenge: zwei Studios gleicher Groesse sind zwei Raeume. */
      const s = raumKonsens(
        [{ bezeichnung: "Studio", flaeche_m2: 45.96 },
         { bezeichnung: "Studio", flaeche_m2: 45.96 }],
        [{ bezeichnung: "Studio", flaeche_m2: 45.96 }]);
      p(s.raeume.length === 2 && s.nurFuehrend.length === 1,
        "Zwei Studios gegen eines: beide bleiben, eines traegt die Kennzeichnung");
      /* Gegen eine LEERE Liste ist keine Zeile 'einseitig'. */
      const l = raumKonsens([{ bezeichnung: "Bad" }], []);
      p(l.raeume.length === 1 && !l.raeume[0].konsens && l.nurFuehrend.length === 0,
        "Gegen nichts verglichen wird nichts gekennzeichnet");
    }

    /* 14. WAS JE EBENE FEHLT -- der Fall des Kunden: das Erdgeschoss kommt
       gar nicht ins Raumbuch. Die Zaehlung (raeumeJeEbene der zweiten
       Lesung) nennt die Namen; hier entsteht daraus der Suchauftrag fuer
       die gezielte Nachlesung genau dieses Feldes. */
    {
      const bogen = g({
        ebenen: [
          eb("GRUNDRISS KELLERGESCHOSS", { raumnamen: ["KELLER", "FLUR"] }),
          eb("GRUNDRISS ERDGESCHOSS", { raumnamen:
            ["GAST / ARBEITEN", "WC", "DIELE", "KOCHEN", "ESSEN", "WOHNEN"] }),
          eb("GRUNDRISS OBERGESCHOSS", { raumnamen:
            ["SCHLAFEN", "BADEN", "FLUR", "KIND I", "KIND II"] }),
        ],
      });
      const je = raeumeJeEbene(bogen);
      const ohneEg = ["KELLER", "FLUR", "SCHLAFEN", "BADEN", "FLUR",
                      "KIND I", "KIND II"].map(function (nm) {
        return { bezeichnung: nm };
      });
      const fe = fehltJeEbene(je, ohneEg, istRaumname);
      p(fe.length === 1 && /ERDGESCHOSS/.test(fe[0].ebene) && fe[0].index === 1,
        "Fehlt das EG komplett, muss genau diese Ebene benannt werden");
      p(fe.length === 1 && fe[0].fehlt.length === 6,
        "und alle sechs EG-Namen muessen als Suchliste herauskommen");
      /* Vollstaendiges Raumbuch: nichts fehlt, kein Suchauftrag. */
      const alle = ohneEg.concat(["GAST / ARBEITEN", "WC", "DIELE", "KOCHEN",
        "ESSEN", "WOHNEN"].map(function (nm) { return { bezeichnung: nm }; }));
      p(fehltJeEbene(je, alle, istRaumname).length === 0,
        "An einem vollstaendigen Raumbuch darf keine Nachlesung entstehen");
      /* Der doppelte FLUR (KG und OG) darf nicht als fehlend gelten, wenn
         er zweimal im Raumbuch steht -- Multimenge ueber das ganze Blatt. */
      let einFlurWeg = false;
      const ohneEinenFlur = alle.filter(function (r) {
        if (!einFlurWeg && r.bezeichnung === "FLUR") { einFlurWeg = true; return false; }
        return true;
      });
      const feFlur = fehltJeEbene(je, ohneEinenFlur, istRaumname);
      p(feFlur.length === 1 && feFlur[0].fehlt.length === 1
        && feFlur[0].fehlt[0] === "FLUR",
        "Die Multimenge zaehlt: einen FLUR streichen laesst genau einen fehlen");
    }

    /* 15. EINBAUTEILE ZAEHLEN AUF KEINER SEITE -- Kundenbefund Hasenberg 10
       (25.08.2026): die Zaehlung nennt "GARDEROBE", das Raumbuch fuehrt sie
       mit Absicht nicht. Mit dem hereingereichten ZAEHLBAREN Namensfilter
       darf daraus weder eine Sollzahl noch eine Fehlliste entstehen -- und
       ein ECHTER fehlender Raum muss weiter auffallen. */
    {
      const zaehlbar = function (s) {
        return istRaumname(s) && !/^(garderobe|schrank|nische)\b/i.test(String(s));
      };
      const bogen = g({
        ebenen: [eb("GRUNDRISS ERDGESCHOSS", { raumnamen:
          ["FLUR", "WC", "HWR", "GARDEROBE", "GARDEROBE/SCHRANK"] })],
      });
      const je = raeumeJeEbene(bogen, zaehlbar);
      p(je[0].n === 3 && je[0].namen.length === 3
        && je[0].ausgeschlossen.length === 2,
        "Zwei Garderoben duerfen nicht in die Sollzahl der Ebene zaehlen");
      const buch = ["FLUR", "WC", "HWR"].map(function (nm) {
        return { bezeichnung: nm };
      });
      p(fehltJeEbene(je, buch, zaehlbar).length === 0,
        "Eine ausgefilterte Garderobe darf nicht als fehlender Raum gelten");
      /* Gegenprobe der Gegenprobe: ein echter Raum fehlt weiter. */
      const ohneWc = buch.filter(function (r) { return r.bezeichnung !== "WC"; });
      const feWc = fehltJeEbene(je, ohneWc, zaehlbar);
      p(feWc.length === 1 && feWc[0].fehlt.length === 1
        && feWc[0].fehlt[0] === "WC",
        "Ein echter fehlender Raum (WC) muss trotz Filter weiter auffallen");
      /* Und im Abgleich: dieselbe Regel auf BEIDEN Seiten macht die
         Raumzahl gruen, obwohl nur die zweite Lesung Garderoben nennt. */
      const ab2 = abgleich(
        { raeume: [{ bezeichnung: "FLUR" }, { bezeichnung: "WC" },
                   { bezeichnung: "HWR" }] },
        g({ raeume_beschriftet: 5, raumnamen:
          ["FLUR", "WC", "HWR", "GARDEROBE", "GARDEROBE/SCHRANK"] }),
        { istRaumname: zaehlbar });
      const mRaeume = ab2.merkmale.find(function (m) { return m.id === "raeume"; });
      p(!!mRaeume && mRaeume.stufe === "belegt",
        "Garderoben nur in der zweiten Lesung duerfen die Raumzahl nicht kippen");
    }

    return { ok: f.length === 0, anzahl: n, fehler: f };
  }

  return {
    normieren: normieren,
    konturAusEbene: konturAusEbene,
    konturenAusBlatt: konturenAusBlatt, ketteDeckt: ketteDeckt,
    raeumeJeEbene: raeumeJeEbene,
    ebenenVereinigen: ebenenVereinigen,
    unbeheiztVereinigen: unbeheiztVereinigen,
    abgleich: abgleich,
    schwerste: schwerste,
    /* Nach draussen gegeben, damit das Kontrollblatt Namen mit DERSELBEN
       Regel vergleicht wie der Blattabgleich. Zwei Vergleiche mit zwei
       Regeln melden verschiedene Unterschiede an derselben Zeichnung. */
    normName: normName,
    zaehltAlsRaum: zaehltAlsRaum,
    fassadeBelegt: fassadeBelegt,
    nurIn: nurIn,
    nenne: nenne,
    raumKonsens: raumKonsens,
    fehltJeEbene: fehltJeEbene,
    selbsttest: selbsttest,
  };
});
