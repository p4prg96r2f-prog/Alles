/* ===========================================================================
 * kern_zuordnung.js — vom ausgelesenen Blatt zum rechenfähigen Raumbuch
 * ===========================================================================
 * Die Auslese liefert Räume, Maße und Höhen, aber verstreut über mehrere
 * Blätter und ohne Bezug zueinander. Dieses Modul stellt den Bezug her, und
 * zwar deterministisch: gleiche Eingabe, gleiches Ergebnis, jede Entscheidung
 * mit Beleg. Es rät nichts. Wo eine Angabe fehlt, bleibt sie leer und wird
 * als offene Frage zurückgegeben.
 *
 * Drei Aufgaben:
 *   1. Geschoss je Blatt bestimmen
 *   2. Höhen aus dem Schnitt den Geschossen zuordnen
 *   3. Bauteile je Raum erzeugen
 *
 * DOM-frei, ohne Abhängigkeiten, in Node und im Browser lauffähig.
 * =========================================================================== */

"use strict";

(function (root, fabrik) {
  const M = fabrik();
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  if (typeof window !== "undefined") window.KERN_ZUORDNUNG = M;
})(this, function () {

  /* ------------------------------------------------------------------ *
   * 1  Geschoss je Blatt
   * ------------------------------------------------------------------ */

  /* Schreibweisen, die in deutschen Bauzeichnungen vorkommen. Die Reihenfolge
   * zählt: längere Muster zuerst, damit "Untergeschoss" nicht als "Geschoss"
   * durchgeht. */
  const GESCHOSSMUSTER = [
    /* Der Rang unter null entscheidet in bauteileErgaenzen(), ob das unterste
     * Geschoss SELBST der Keller ist — dann liegt seine Fläche nach unten als
     * Bodenplatte auf dem Erdreich, und es gibt keine Kellerzone darunter.
     * "souterrain" stand lange nur im Kommentar der Aufrufstelle, nicht im
     * Muster: ein Blatt "Souterrain" bekam eine Kellerdecke gegen einen
     * erfundenen unbeheizten Keller UNTER dem eigenen Keller. */
    { kuerzel: "KG",
      muster: /kellergeschoss|untergeschoss|souterrain|\bkg\b|\bug\b|keller(?!decke)/i,
      rang: -1 },
    { kuerzel: "EG", muster: /erdgeschoss|\beg\b|parterre/i, rang: 0 },
    { kuerzel: "1.OG", muster: /1\.?\s*(ober)?geschoss|erstes\s+obergeschoss|1\.?\s*og\b/i,
      rang: 1 },
    { kuerzel: "2.OG", muster: /2\.?\s*(ober)?geschoss|zweites\s+obergeschoss|2\.?\s*og\b/i,
      rang: 2 },
    { kuerzel: "3.OG", muster: /3\.?\s*(ober)?geschoss|3\.?\s*og\b/i, rang: 3 },
    { kuerzel: "OG", muster: /obergeschoss|\bog\b/i, rang: 1 },
    /* „Staffelgeschoss" ist die oberste, zurückgesetzte Ebene und damit
       dasselbe Geschoss wie das Dachgeschoss. Ohne dieses Wort im Muster
       blieb die Blattangabe „vermutlich EG + OG + zurückgesetztes
       Dachgeschoss/Staffelgeschoss" ungedeutet und wurde als ZWEI Ebenen
       gezählt — ein Geschoss zu viel aus einer einzigen Schreibweise. */
    { kuerzel: "DG",
      muster: /dachgeschoss|\bdg\b|dachboden|spitzboden|staffelgeschoss/i,
      rang: 9 },
  ];

  /** Sucht in einem Text nach einer Geschossbezeichnung.
   *  Unterstrich, Bindestrich und Punkt zählen in regulären Ausdrücken als
   *  Wortzeichen; in Dateinamen trennen sie aber Wörter. Ohne diese
   *  Umschrift bliebe "eg_plan.png" unerkannt. */
  function geschossAusText(text) {
    const t = String(text || "").replace(/[_\-]+/g, " ");
    for (const g of GESCHOSSMUSTER) {
      if (g.muster.test(t)) return { kuerzel: g.kuerzel, rang: g.rang };
    }
    return null;
  }

  /** Bestimmt das Geschoss eines Blattes aus allen verfügbaren Anhaltspunkten.
   *  Rangfolge, absteigend: was im Blatt selbst steht, schlägt was die Auslese
   *  meint, schlägt den Dateinamen. Der Dateiname ist der schwächste Beleg,
   *  weil ihn jemand vergeben hat, der nicht die Zeichnung meinte. */
  function geschossFuerBlatt(blatt) {
    const b = blatt || {};
    const kandidaten = [];
    const nimm = function (quelle, text, gewicht) {
      const g = geschossAusText(text);
      if (g) kandidaten.push({ kuerzel: g.kuerzel, rang: g.rang, quelle: quelle,
                               gewicht: gewicht, beleg: String(text).slice(0, 60) });
    };
    nimm("Blattkopf", b.blattkopf && b.blattkopf.geschoss, 100);
    nimm("Blattüberschrift", b.ueberschrift, 90);
    /* Die Auslese nennt das Geschoss oft je Raum. Nur verwenden, wenn alle
       Räume dasselbe sagen; verschiedene Angaben auf einem Blatt sind ein
       Hinweis auf mehrere Geschosse und keine Grundlage für eine Zuordnung. */
    const ausRaeumen = (b.raeume || []).map(function (r) { return r.geschoss; })
      .filter(Boolean);
    const einig = ausRaeumen.length > 0
      && ausRaeumen.every(function (x) { return x === ausRaeumen[0]; });
    if (einig) nimm("Auslese", ausRaeumen[0], 70);
    nimm("Dateiname", b.name || b.bezeichnung, 40);

    /* EIN BOGEN MIT MEHREREN GRUNDRISSEN ist bei einem Einfamilienhaus der
     * Regelfall: Keller, Erd- und Obergeschoss stehen nebeneinander auf
     * einem A3-Blatt. Die Frage „zu welchem Geschoss gehört dieses Blatt"
     * hat dann keine Antwort, und sie braucht auch keine: jeder Raum trägt
     * sein Geschoss selbst, und danach wird er einsortiert.
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": dreizehn Räume, alle mit
     * Geschoss, und trotzdem stand die Frage in der Liste — auf einem Blatt,
     * auf dem nichts ungeklärt war. Eine unbeantwortbare Frage in einer
     * Liste zum Abarbeiten erzieht dazu, die ganze Liste zu überblättern.
     *
     * Gemeldet wird sie deshalb nur noch, wenn sie etwas ändert: wenn ein
     * Raum OHNE eigenes Geschoss dasteht und ihn niemand einsortieren kann.
     * Für alle anderen Fälle steht hier eine Auskunft statt einer Frage. */
    const alle = b.raeume || [];
    const ohneGeschoss = alle.filter(function (r) {
      return !String((r && r.geschoss) || "").trim();
    }).length;
    const verschiedene = [];
    ausRaeumen.forEach(function (x) {
      const g = geschossAusText(x);
      const k = (g && g.kuerzel) || String(x).trim();
      if (k && verschiedene.indexOf(k) < 0) verschiedene.push(k);
    });
    if (!kandidaten.length && verschiedene.length > 1 && !ohneGeschoss) {
      return { kuerzel: null, sicher: true, quelle: "Auslese",
               mehrere: verschiedene, frage: null,
               beleg: "Das Blatt trägt " + verschiedene.length
                 + " Grundrisse: " + verschiedene.join(", ")
                 + ". Jeder Raum trägt sein Geschoss selbst." };
    }

    if (!kandidaten.length) {
      /* Ohne einen einzigen Raum gibt es auch nichts einzusortieren. Ein
         Lageplan oder ein Detailblatt braucht kein Geschoss, und die Frage
         danach hat keine Folge. */
      if (!alle.length) {
        return { kuerzel: null, sicher: false, quelle: null, frage: null,
                 beleg: "Auf diesem Blatt ist kein Raum gelesen worden; ein "
                   + "Geschoss ist dafür nicht nötig." };
      }
      if (!ohneGeschoss) {
        return { kuerzel: null, sicher: true, quelle: "Auslese", frage: null,
                 mehrere: verschiedene,
                 beleg: "Jeder Raum dieses Blattes trägt sein Geschoss selbst." };
      }
      return { kuerzel: null, sicher: false, quelle: null,
               frage: "Zu welchem Geschoss gehört dieses Blatt? "
                 + (ohneGeschoss === 1 ? "Ein Raum trägt" : ohneGeschoss
                   + " Räume tragen") + " keines, und ohne Geschoss "
                 + (ohneGeschoss === 1 ? "bleibt er" : "bleiben sie")
                 + " beim Abschluss nach oben und unten außen vor." };
    }
    kandidaten.sort(function (x, y) { return y.gewicht - x.gewicht; });
    const beste = kandidaten[0];
    const widerspruch = kandidaten.filter(function (k) {
      return k.kuerzel !== beste.kuerzel; });
    return {
      kuerzel: beste.kuerzel, rang: beste.rang, quelle: beste.quelle,
      beleg: beste.beleg,
      sicher: beste.gewicht >= 70 && !widerspruch.length,
      widerspruch: widerspruch.length
        ? widerspruch.map(function (w) { return w.quelle + " sagt " + w.kuerzel; })
        : null,
      frage: widerspruch.length
        ? "Das Blatt wird verschieden bezeichnet: " + beste.quelle + " nennt "
          + beste.kuerzel + ", " + widerspruch.map(function (w) {
              return w.quelle + " nennt " + w.kuerzel; }).join(", ")
          + ". Welches gilt?"
        : null,
    };
  }

  /* ------------------------------------------------------------------ *
   * 2  Höhen aus dem Schnitt
   * ------------------------------------------------------------------ */

  /* EINE TÜRHÖHE IST KEINE RAUMHÖHE.
   *
   * GEMESSEN am 22.08.2026 über den Live-Endpunkt, Blatt „BV 2-0887
   * Ziolkowski", Betriebsart „hoehen". Die Auslese lieferte für das
   * Erdgeschoss lichte_hoehe_m = 2,20 mit dem Beleg „lichte Hoehe 2,20 an
   * Tuer, Geschosshoehe 2,52 links bemasst". Die 2,20 ist die Höhe der
   * Terrassentür — sie steht im Schnitt an der Öffnung. Alle sechs Räume des
   * Erdgeschosses standen danach mit 2,20 m im Raumbuch, und kein Zähler
   * merkte es: das Maß war ja „angeschrieben".
   *
   * Trennen lässt sich das sauber, weil sich die beiden Maßbereiche NICHT
   * überschneiden. Türen werden mit Rohbaumaßen bis rund 2,25 m eingebaut
   * (Standardblätter 1,985 m und 2,110 m zuzüglich Zarge und Bodenaufbau);
   * Aufenthaltsräume brauchen nach den Landesbauordnungen 2,40 m lichte Höhe,
   * im Bestand kommen 2,30 m vor. Zwischen 2,26 und 2,29 liegt nichts.
   *
   * Verworfen wird ein Maß nur, wenn BEIDES zutrifft: es liegt im Türbereich
   * UND die Auslese sagt selbst, dass sie an einer Öffnung gemessen hat. Nur
   * eines von beiden genügt nicht — der Beleg der verbesserten Auslese nennt
   * die Tür auch dann, wenn die gelieferte Zahl die richtige ist. */
  const OEFFNUNG_MAX = 2.25;
  const RAUMHOEHE_MIN = 2.30;
  const OEFFNUNGSWORT =
    /t(ü|ue)r|fenster|sturz|durchgang|(ö|oe)ffnung|br(ü|ue)stung|lichte\s*weite/i;

  /** Wahr, wenn das als lichte Höhe gelieferte Maß in Wahrheit die Höhe einer
   *  Tür-, Fenster- oder Durchgangsöffnung ist. */
  function istOeffnungsmass(x) {
    const h = zahl(x && x.lichte_hoehe_m, 0);
    if (!(h > 0) || h > OEFFNUNG_MAX) return false;
    if (String((x && x.gemessen_zwischen) || "") === "oeffnung") return true;
    return OEFFNUNGSWORT.test(String((x && x.beleg) || ""));
  }

  /* DIE ZAHL AN DER KOTE IST BELEGT, DAS DREIECK DANEBEN IST ES NICHT.
   *
   * GEMESSEN am 23.08.2026, sechs echte Läufe gegen den Live-Endpunkt mit
   * demselben Bild desselben Blattes („BV 2-0887 Ziolkowski", Betriebsart
   * „hoehen"). Ergebnis:
   *
   *   Die ZAHLEN kamen in allen sechs Läufen vollzählig und gleich zurück:
   *   −2,88 · −2,73 · −0,19 · ±0,00 · +2,74 · +2,91 · +5,65 · +6,02 · +8,94.
   *
   *   Die EINORDNUNG kam in keinem Lauf gleich zurück. Für dieselbe Kote:
   *     −2,73 (in Wahrheit OKFF)      okff in 1 von 6 Läufen
   *     −2,88 (in Wahrheit Rohdecke)  okff in 3 von 6 Läufen
   *     +2,74 (in Wahrheit Rohdecke)  okff in 5 von 6 Läufen
   *     +2,91 (in Wahrheit OKFF)      okff in 1 von 6 Läufen
   *
   * Das ist kein Ausreißer, sondern die Natur der Sache: ob ein Dreieck
   * ausgefüllt oder hohl gezeichnet ist, sind auf 2576 Bildpunkten wenige
   * Pixel. Wer die Rechnung darauf stellt, bekommt zweimal dasselbe Blatt und
   * zweimal ein anderes Ergebnis — im gemessenen Fall zweimal von sechs die
   * Ersatzannahme 2,60 m statt der bemaßten 2,32 m.
   *
   * DIE ZAHLEN ALLEIN TRAGEN ABER. An jeder Geschossdecke stehen zwei Koten
   * dicht beieinander: Oberkante Rohdecke und Oberkante Fertigfußboden,
   * getrennt durch den Fußbodenaufbau. Welche von beiden die obere ist, muss
   * niemand ablesen — der Fertigfußboden liegt über der Rohdecke, immer.
   * Also: Koten, die enger als ein Fußbodenaufbau beieinander liegen, sind
   * EINE Ebene, und die obere von ihnen ist der Fertigfußboden.
   *
   * Am gemessenen Blatt ergibt das in allen sechs Läufen dieselbe Leiter
   * −2,73 / ±0,00 / +2,91 / +5,65 und damit dieselben Geschosshöhen
   * 2,73 / 2,91 / 2,74 — die Werte des Schnitts. Die Einordnung wird weiter
   * gelesen, aber nur noch als Bestätigung vermerkt, nicht mehr als
   * Entscheidungsgrundlage. */
  const EBENE_ZUSAMMEN = 0.30;   // dichter beieinander = derselbe Deckenaufbau
  const EBENE_MIN_ABSTAND = 1.50; // enger übereinander gibt es kein Geschoss

  /* Das Deckenpaket: Rohdecke samt Fußbodenaufbau, also der Unterschied
   * zwischen Geschosshöhe und lichter Höhe. Unter 0,10 m gibt es keine
   * tragende Decke, über 0,60 m ist es keine mehr, sondern ein Fehler in
   * einer der beiden Zahlen. Beide Schranken sind die, mit denen dieses Modul
   * seit jeher rechnet; sie stehen hier nur einmal statt an vier Stellen,
   * weil daran jetzt auch die Gegenprobe hängt. */
  const MIN_DECKENPAKET = 0.10;
  const MAX_DECKENPAKET = 0.60;

  /** Geschosshöhen aus den Höhenkoten des Schnitts.
   *
   *  Die Koten sind der härteste Beleg auf dem Blatt: ±0,00, +2,91, −2,73
   *  sind Zahlen am Bauwerk. Aus zwei übereinanderliegenden Fußbodenebenen
   *  ergibt sich die Geschosshöhe ohne jede Annahme.
   *
   *  Erwartet Einträge { geschoss, wert_m, bezug }. Gelände- und Firstkoten
   *  gehören nicht in die Leiter der Geschossebenen und werden ausgesondert;
   *  diese beiden Einordnungen kamen in allen sechs Messläufen richtig zurück,
   *  weil sie an der Lage im Blatt hängen und nicht an einer Strichstärke.
   *
   *  Ist die oberste Ebene nur eine Rohdecke — beim unbeheizten Spitzboden
   *  der Regelfall —, ist die Geschosshöhe darunter die bis Oberkante
   *  Rohdecke. Das wird gekennzeichnet, ändert an der Zahl aber nichts. */
  function geschosshoehenAusKoten(koten) {
    const erg = {};
    const punkte = (koten || []).map(function (k) {
      const w = k && k.wert_m;
      if (!(typeof w === "number" && isFinite(w))) return null;
      const bezug = String((k && k.bezug) || "unklar").toLowerCase();
      /* Gelände und First sind keine Fußbodenebenen. Sie bleiben draußen,
         sonst wandert die Geländekote −0,15 in die Ebene des Erdgeschosses
         und die Firstkote erfindet ein Geschoss unter dem Dach. */
      if (bezug === "gelaende" || bezug === "first") return null;
      const g = geschossAusText(k && k.geschoss);
      return { kuerzel: g ? g.kuerzel : null, rang: g ? g.rang : null, wert: w,
               bezug: bezug, text: (k && k.text) || null };
    }).filter(Boolean).sort(function (a, b) { return a.wert - b.wert; });
    if (punkte.length < 2) return erg;

    /* 1. Koten zu Ebenen zusammenfassen. Was dichter als ein Fußbodenaufbau
          beieinander liegt, gehört zu derselben Decke. */
    const ebenen = [];
    punkte.forEach(function (p) {
      const letzte = ebenen[ebenen.length - 1];
      if (letzte && p.wert - letzte.unten <= EBENE_ZUSAMMEN) {
        letzte.koten.push(p);
        letzte.oben = Math.max(letzte.oben, p.wert);
        return;
      }
      ebenen.push({ unten: p.wert, oben: p.wert, koten: [p] });
    });

    /* 2. Je Ebene: der Fertigfußboden ist die OBERE Kote. Das ist keine
          Einordnung, sondern Bauweise — der Estrich liegt auf der Decke. */
    ebenen.forEach(function (e) {
      e.okff = e.oben;
      e.aufbau = rnd(e.oben - e.unten, 3);
      /* Nur eine Kote in der Ebene und die sagt ausdrücklich „Rohdecke":
         dann ist über ihr kein Fertigfußboden bemaßt. Das kommt beim
         unbeheizten Spitzboden vor und wird weiter unten vermerkt. */
      e.nurRohdecke = e.koten.length === 1 && e.koten[0].bezug === "rohdecke";
      /* Bezeichnung der Ebene: was die Koten selbst nennen. Bei zwei
         verschiedenen Angaben gewinnt die der oberen Kote. */
      const mitNamen = e.koten.filter(function (k) { return k.kuerzel; });
      const obere = mitNamen.filter(function (k) { return k.wert === e.oben; });
      e.kuerzel = (obere[0] && obere[0].kuerzel)
        || (mitNamen[0] && mitNamen[0].kuerzel) || null;
      e.bestaetigt = e.koten.some(function (k) {
        return k.bezug === "okff" && k.wert === e.oben; });
    });

    /* 3. Die Leiter: von einer Fußbodenebene zur nächsten. Zu dichte
          Nachbarn sind keine zwei Geschosse (Podest, Zwischenkote). */
    ebenen.forEach(function (e, i) {
      const oben = ebenen[i + 1];
      if (!e.kuerzel || !oben) return;
      const h = rnd(oben.okff - e.okff, 3);
      if (!(h >= EBENE_MIN_ABSTAND)) return;
      erg[e.kuerzel] = {
        geschosshoehe: h,
        bis: oben.nurRohdecke ? "Rohdecke" : ("OKFF " + (oben.kuerzel || "darüber")),
        quelle: "aus den Höhenkoten des Schnitts (" + rnd(e.okff, 2) + " bis "
          + (oben.nurRohdecke ? "Oberkante Rohdecke " : "") + rnd(oben.okff, 2) + ")"
          + (e.aufbau > 0
            ? "; die Ebene " + rnd(e.okff, 2) + " ist mit zwei Koten bemaßt ("
              + rnd(e.unten, 2) + " und " + rnd(e.oben, 2) + "), der "
              + "Fertigfußboden ist die obere"
            : ""),
        bestaetigt: !!(e.bestaetigt && oben.bestaetigt),
      };
    });
    return erg;
  }

  /** Verteilt die im Schnitt abgelesenen Höhen auf die vorhandenen Geschosse.
   *  Zuordnung vorrangig über die Bezeichnung, sonst über die Reihenfolge von
   *  unten nach oben. Passt die Anzahl nicht, wird NICHT verteilt, sondern
   *  gefragt: eine falsch zugeordnete Höhe verändert das Ergebnis erheblich
   *  und fällt später nirgends auf.
   *
   *  koten: die Höhenkoten desselben Schnitts. Mit ihnen entscheidet dieses
   *  Modul selbst, ob ein gelesenes Maß die lichte Höhe oder die Geschosshöhe
   *  ist, und leitet die Deckendicke ab, statt nach ihr zu fragen. */
  function hoehenZuordnen(hoehen, geschosse, deckendicke, koten) {
    const g = (geschosse || []).slice();
    const zuordnung = {}, fragen = [], befunde = [];
    const dicke = zahl(deckendicke, 0);
    const ausKoten = geschosshoehenAusKoten(koten);

    /* Schritt 0: Öffnungsmaße aussortieren, BEVOR irgendetwas zugeordnet wird.
       Der Wert wird nicht stillschweigend gelöscht, sondern als das geführt,
       was er ist, und der Befund geht mit hinaus. */
    const roh = (hoehen || []).map(function (x) {
      if (!x) return null;
      if (!istOeffnungsmass(x)) return x;
      const k = geschossAusText(x.geschoss);
      befunde.push({
        thema: "Raumhöhe",
        art: "verworfen",
        geschoss: (k && k.kuerzel) || String(x.geschoss || "").trim() || null,
        aussage: "Die Auslese meldet für " + (x.geschoss || "ein Geschoss")
          + " eine lichte Höhe von " + rnd(zahl(x.lichte_hoehe_m, 0), 2).toLocaleString("de-DE")
          + " m und belegt sie mit einer Öffnung („" + String(x.beleg || "").slice(0, 90)
          + "“). Das ist die Höhe der Tür beziehungsweise des Fensters, nicht die "
          + "Raumhöhe; sie wird nicht als lichte Höhe verwendet.",
      });
      /* Als lichte Höhe verworfen, als Öffnungsmaß behalten: die übrigen
         Angaben derselben Zeile (Geschosshöhe, Beleg) bleiben brauchbar. */
      return Object.assign({}, x, { lichte_hoehe_m: null,
                                    oeffnungshoehe_m: x.lichte_hoehe_m });
    }).filter(Boolean);

    const h = roh.filter(function (x) {
      return x.lichte_hoehe_m > 0 || x.geschosshoehe_m > 0; });
    if (!h.length) {
      return { zuordnung: zuordnung, vollstaendig: false, braucht_deckendicke: [],
               befunde: befunde, deckendicke_abgeleitet: {},
               fragen: fragen.concat([{ thema: "Geschosshöhe",
                 frage: "Es liegt kein Schnitt mit ablesbaren Höhen vor. Ohne lichte "
                   + "Höhe lässt sich das Luftvolumen und damit die Lüftungsheizlast "
                   + "nicht bestimmen." }]) };
    }
    // Weg 1: über die Bezeichnung
    let ueberNamen = 0;
    h.forEach(function (x) {
      const k = geschossAusText(x.geschoss);
      if (k && g.indexOf(k.kuerzel) >= 0 && !zuordnung[k.kuerzel]) {
        zuordnung[k.kuerzel] = lichteHoehe(x, dicke,
          "Schnitt, Bezeichnung " + x.geschoss, ausKoten[k.kuerzel], befunde, k.kuerzel);
        ueberNamen++;
      }
    });
    // Weg 2: über die Reihenfolge, aber nur wenn die Anzahl genau passt
    const offen = g.filter(function (k) { return !zuordnung[k]; });
    if (offen.length && ueberNamen === 0 && h.length === g.length) {
      const sortiert = g.slice().sort(function (a, b) {
        return (rangVon(a) - rangVon(b)); });
      sortiert.forEach(function (k, i) {
        zuordnung[k] = lichteHoehe(h[i], dicke, "Schnitt, Reihenfolge von unten",
          ausKoten[k], befunde, k);
      });
    } else if (offen.length) {
      fragen.push({ thema: "Geschosshöhe",
        frage: "Für " + offen.join(", ") + " ist im Schnitt keine Höhe eindeutig "
          + "zuzuordnen. Der Schnitt nennt " + h.length + " Höhen, gebraucht werden "
          + g.length + ". Bitte die Höhe je Geschoss angeben." });
    }
    /* Was an Deckendicke aus dem Blatt ABGELEITET wurde, statt erfragt zu
       werden. Steht im Kontrollblatt als Auskunft, nicht als Frage. */
    const abgeleiteteDicke = {};
    Object.keys(zuordnung).forEach(function (k) {
      if (zuordnung[k].deckenpaket > 0) abgeleiteteDicke[k] = zuordnung[k].deckenpaket;
    });
    const brauchtDicke = Object.keys(zuordnung).filter(function (k) {
      return zuordnung[k].braucht_deckendicke; });
    if (brauchtDicke.length) {
      fragen.push({
        thema: "Deckendicke",
        frage: "Im Schnitt steht die Geschosshöhe (" + brauchtDicke.map(function (k) {
            return k + " " + zuordnung[k].geschosshoehe + " m"; }).join(", ")
          + "), gerechnet wird aber mit der lichten Höhe, und der Schnitt gibt "
          + "weder eine lichte Höhe noch zwei Fertigfußbodenkoten her, aus denen "
          + "sich die Deckendicke ergäbe. Wie dick sind die Decken? "
          + "Üblich sind 0,20 bis 0,30 Meter einschließlich Fußbodenaufbau.",
        feld: "meta.deckendicke", einheit: "m", vorschlag: null,
      });
    }
    return {
      zuordnung: zuordnung,
      braucht_deckendicke: brauchtDicke,
      deckendicke_abgeleitet: abgeleiteteDicke,
      befunde: befunde,
      vollstaendig: g.every(function (k) {
        return zuordnung[k] && zuordnung[k].lichte_hoehe > 0; }),
      fragen: fragen,
    };
  }

  /** Entscheidet für EIN Geschoss, was das gelesene Maß ist, und liefert die
   *  lichte Höhe.
   *
   *  Die Rechnung braucht die LICHTE Höhe. Im Schnitt steht mal diese, mal die
   *  Geschosshöhe, und welche von beiden die Auslese geliefert hat, ist ihre
   *  Einordnung und nicht der Plan. Deshalb wird jedes Maß, wo es geht, gegen
   *  die aus den Höhenkoten belegte Geschosshöhe gehalten:
   *
   *    Maß gleich Geschosshöhe (±3 cm)  → es IST die Geschosshöhe.
   *    Geschosshöhe minus Maß zwischen  → das Maß ist die LICHTE Höhe, die
   *    0,10 und 0,60 m                    Differenz ist das Deckenpaket.
   *    sonst                            → Widerspruch, keine Zuordnung.
   *
   *  GEMESSEN am 22.08.2026, Blatt „BV 2-0887 Ziolkowski": die Auslese lieferte
   *  KG 2,32 und OG 2,52 im Feld geschosshoehe_m. Die Koten des Schnitts sagen
   *  KG −2,73 / EG ±0,00 / OG +2,91, also 2,73 und 2,91 Geschosshöhe — die
   *  gelieferten Zahlen sind damit nachweislich lichte Höhen, und die
   *  Deckenpakete 0,41 und 0,39 m ergeben sich mit. Ohne diesen Abgleich
   *  landeten beide Geschosse beim Rückfallwert 2,60 m, und das Werkzeug
   *  fragte nach einer Deckendicke, die auf dem Blatt bemaßt ist. */
  function lichteHoehe(x, dicke, quelle, kote, befunde, kuerzel) {
    const G = kote && zahl(kote.geschosshoehe, 0);
    const melde = function (o) { if (befunde) befunde.push(o); };

    /* 1. Lichte Höhe angeschrieben: der beste Fall. Mit Kote wird sie
          zusätzlich bestätigt und das Deckenpaket fällt dabei ab. */
    if (x.lichte_hoehe_m > 0) {
      const l = x.lichte_hoehe_m;
      const paket = G > 0 ? rnd(G - l, 3) : 0;
      if (G > 0 && !(paket >= 0.10 && paket <= 0.60)) {
        melde({ thema: "Raumhöhe", art: "widerspruch", geschoss: kuerzel || null,
          aussage: "Für " + (kuerzel || "ein Geschoss") + " nennt der Schnitt die "
            + "lichte Höhe " + rnd(l, 2).toLocaleString("de-DE") + " m, aus den "
            + "Höhenkoten ergibt sich die Geschosshöhe "
            + rnd(G, 2).toLocaleString("de-DE") + " m. Die Differenz "
            + rnd(paket, 2).toLocaleString("de-DE") + " m ist kein plausibles "
            + "Deckenpaket. Eine der beiden Angaben ist falsch gelesen." });
      }
      return { lichte_hoehe: l, geschosshoehe: G > 0 ? G : (x.geschosshoehe_m || null),
               deckenpaket: paket >= 0.10 && paket <= 0.60 ? paket : 0,
               quelle: quelle + ", lichte Höhe angeschrieben"
                 + (paket >= 0.10 && paket <= 0.60
                    ? ", durch die Höhenkoten bestätigt (Geschosshöhe "
                      + rnd(G, 2).toLocaleString("de-DE") + " m, Deckenpaket "
                      + rnd(paket, 2).toLocaleString("de-DE") + " m)" : ""),
               beleg: x.beleg || null, abgeleitet: false,
               oeffnungshoehe: x.oeffnungshoehe_m || null };
    }

    /* 2. Nur ein Maß im Feld „Geschosshöhe" — und Koten, gegen die es sich
          prüfen lässt. Hier wird der Feldtausch der Auslese aufgedeckt. */
    if (x.geschosshoehe_m > 0 && G > 0) {
      const m = x.geschosshoehe_m, d = rnd(G - m, 3);
      if (Math.abs(d) <= 0.03) {
        return { lichte_hoehe: null, geschosshoehe: m, deckenpaket: 0,
                 quelle: quelle + ", Geschosshöhe durch die Höhenkoten bestätigt",
                 beleg: x.beleg || null, abgeleitet: false,
                 braucht_deckendicke: true,
                 oeffnungshoehe: x.oeffnungshoehe_m || null };
      }
      if (d >= 0.10 && d <= 0.60) {
        melde({ thema: "Raumhöhe", art: "richtiggestellt", geschoss: kuerzel || null,
          aussage: "Die Auslese hat " + rnd(m, 2).toLocaleString("de-DE")
            + " m für " + (kuerzel || "ein Geschoss") + " als Geschosshöhe geführt. "
            + "Aus den Höhenkoten des Schnitts ergibt sich die Geschosshöhe zu "
            + rnd(G, 2).toLocaleString("de-DE") + " m; das gelesene Maß ist damit "
            + "die lichte Höhe, und das Deckenpaket beträgt "
            + rnd(d, 2).toLocaleString("de-DE") + " m." });
        return { lichte_hoehe: m, geschosshoehe: G, deckenpaket: d,
                 quelle: quelle + ", als lichte Höhe erkannt: die Höhenkoten geben "
                   + "die Geschosshöhe mit " + rnd(G, 2).toLocaleString("de-DE")
                   + " m an, Deckenpaket " + rnd(d, 2).toLocaleString("de-DE") + " m",
                 beleg: x.beleg || null, abgeleitet: false,
                 oeffnungshoehe: x.oeffnungshoehe_m || null };
      }
      melde({ thema: "Raumhöhe", art: "widerspruch", geschoss: kuerzel || null,
        aussage: "Für " + (kuerzel || "ein Geschoss") + " liest die Auslese "
          + rnd(m, 2).toLocaleString("de-DE") + " m, aus den Höhenkoten ergibt sich "
          + rnd(G, 2).toLocaleString("de-DE") + " m. Beides passt weder als "
          + "dieselbe Größe noch als lichte Höhe und Geschosshöhe zusammen." });
      return { lichte_hoehe: null, geschosshoehe: m, deckenpaket: 0,
               quelle: quelle, beleg: x.beleg || null, abgeleitet: false,
               braucht_deckendicke: true,
               oeffnungshoehe: x.oeffnungshoehe_m || null };
    }

    /* 3. Geschosshöhe ohne Koten: nur mit eingetragener Deckendicke rechenbar. */
    if (x.geschosshoehe_m > 0 && dicke > 0) {
      return { lichte_hoehe: Math.round((x.geschosshoehe_m - dicke) * 1000) / 1000,
               geschosshoehe: x.geschosshoehe_m, deckenpaket: 0,
               quelle: quelle + ", aus Geschosshöhe minus Deckendicke " + dicke + " m",
               beleg: x.beleg || null, abgeleitet: true,
               oeffnungshoehe: x.oeffnungshoehe_m || null };
    }

    /* 4. Geschosshöhe ohne Koten und ohne Deckendicke — UND SIE IST ZU KLEIN,
     *    als dass der Rückfallwert daneben stehen könnte.
     *
     * DER FALL, DEN DIESER ZWEIG AUFLÖST. Kommt hier ein Maß an, das kleiner
     * ist als der Rückfallwert zuzüglich eines Deckenpakets, dann schließen
     * sich die beiden Zahlen gegenseitig aus: eine lichte Höhe von 2,60 m
     * unter einer Geschosshöhe von 2,32 m gibt es nicht. Bisher entstand
     * genau das — GEMESSEN am 23.08.2026 in zwei von sechs echten Läufen
     * desselben Blattes: hoehenStand KG = lichte Höhe 2,60 (Annahme) neben
     * Geschosshöhe 2,32. Das Kellergeschoss rechnete mit 28 Zentimetern zu
     * viel, und keine Zeile widersprach.
     *
     * AUFGELÖST WIRD ES, WEIL NUR EINE LESART ÜBRIG BLEIBT. Zwei Zahlen
     * stehen zur Wahl: das gemessene Maß m und der Rückfallwert. Der
     * Rückfallwert ist eine Annahme und stammt nicht vom Blatt; das Maß
     * schon. Eine Annahme, die einer Messung widerspricht, hat zu weichen —
     * das ist keine Abwägung, sondern die Rangfolge, nach der dieses Werkzeug
     * überall arbeitet. Bleibt die Frage, WAS das Maß ist. Als Geschosshöhe
     * gelesen ergäbe es eine lichte Höhe von höchstens m − 0,10 m; als lichte
     * Höhe gelesen ergibt es m. Angesetzt wird m, aus zwei Gründen: es ist
     * die Zahl, die auf dem Blatt steht, und es ist von beiden Lesarten die
     * mit dem größeren Volumen und damit der höheren Heizlast — die
     * vorsichtige Richtung.
     *
     * Auf dem gemessenen Blatt ist das nachweislich richtig: die 2,32 m sind
     * die Maßkette im Kellergeschoss, die Geschosshöhe steht dort mit 2,73 m
     * in den Koten. Der Befund geht trotzdem mit hinaus — aufgelöst heißt
     * nicht stillschweigend. */
    if (x.geschosshoehe_m > 0
        && x.geschosshoehe_m - MIN_DECKENPAKET < HOEHE_RUECKFALL) {
      const m = x.geschosshoehe_m;
      melde({ thema: "Raumhöhe", art: "richtiggestellt", geschoss: kuerzel || null,
        aussage: "Die Auslese führt " + de(m) + " m für "
          + (kuerzel || "ein Geschoss") + " als Geschosshöhe; Höhenkoten, aus denen "
          + "sich das prüfen ließe, stehen nicht auf dem Blatt. Als Geschosshöhe "
          + "gelesen bliebe eine lichte Höhe von höchstens "
          + de(m - MIN_DECKENPAKET) + " m; der sonst "
          + "angesetzte Ersatzwert " + de(HOEHE_RUECKFALL)
          + " m liegt darüber und ist damit ausgeschlossen — eine lichte Höhe kann "
          + "nicht größer sein als die Geschosshöhe. Gerechnet wird mit "
          + de(m) + " m als LICHTER Höhe: das ist die "
          + "Zahl vom Blatt und zugleich die vorsichtigere der beiden Lesarten. "
          + "Am Schnitt nachsehen und, falls es doch die Geschosshöhe ist, die "
          + "lichte Höhe hier eintragen." });
      return { lichte_hoehe: m, geschosshoehe: null, deckenpaket: 0,
               quelle: quelle + ", als lichte Höhe angesetzt (als Geschosshöhe "
                 + "gelesen bliebe keine mögliche Raumhöhe übrig)",
               beleg: x.beleg || null, abgeleitet: false, umgedeutet: true,
               oeffnungshoehe: x.oeffnungshoehe_m || null };
    }

    return { lichte_hoehe: null, geschosshoehe: x.geschosshoehe_m || null,
             deckenpaket: 0,
             quelle: quelle, beleg: x.beleg || null, abgeleitet: false,
             braucht_deckendicke: x.geschosshoehe_m > 0,
             oeffnungshoehe: x.oeffnungshoehe_m || null };
  }

  function rangVon(kuerzel) {
    const g = geschossAusText(kuerzel);
    return g ? g.rang : 5;
  }

  /* Rückfallwert für die lichte Höhe. Er wird verwendet, wenn weder ein
   * Schnitt noch eine Eingabe etwas hergibt, damit überhaupt ein Ergebnis
   * entsteht. 2,60 Meter liegt zwischen dem Altbaumaß und dem heutigen
   * Mindestmaß der Landesbauordnungen und ist damit ein vertretbarer
   * Ausgangspunkt. Er ist immer als Annahme gekennzeichnet und je Geschoss
   * überschreibbar. */
  const HOEHE_RUECKFALL = 2.60;
  /* Übliches Deckenpaket einschließlich Fußbodenaufbau, wenn nur die
   * Geschosshöhe belegt ist. Dieselbe Auskunft, die die Deckendicken-Frage
   * dieses Moduls dem Bearbeiter gibt („üblich sind 0,20 bis 0,30 Meter"):
   * hier ihre Mitte, als benannte Annahme, bis jemand die echte Dicke
   * einträgt. */
  const DECKENPAKET_ANNAHME = 0.25;

  /** Füllt Geschosse ohne belegte Höhe auf und weist das aus. Rangfolge:
   *  eigene Eingabe, gelesene lichte Höhe, ABGELEITETER Vorschlag aus einer
   *  belegten Geschosshöhe, erst zuletzt der nackte Rückfallwert.
   *
   *  DER DRITTE WEG IST NEU. GEMESSEN am 24.08.2026 in der Abnahme: das
   *  Werkzeug hatte „Geschosshöhen aus dem Schnitt" gelesen und behauptete
   *  trotzdem, es gebe „weder der Plan eine lichte Höhe her" — und schlug
   *  2,60 m ohne Herkunft vor. Wer die Geschosshöhe kennt, kennt die lichte
   *  Höhe bis auf das Deckenpaket; der Vorschlag ist Geschosshöhe minus
   *  übliches Deckenpaket, mit genau dieser Herkunft daneben. Er bleibt eine
   *  Annahme (das Deckenpaket ist angenommen), und er liegt von selbst unter
   *  der Geschosshöhe — der frühere Deckel ist damit der Normalfall, kein
   *  Sonderzweig mehr. */
  function hoehenErgaenzen(zuordnung, geschosse, eigene) {
    const erg = Object.assign({}, zuordnung || {});
    const angenommen = [];
    (geschosse || []).forEach(function (k) {
      const alt = erg[k] || {};
      const eig = eigene && zahl(eigene[k]);
      if (eig > 0) {
        /* DIE BELEGTE GESCHOSSHÖHE BLEIBT STEHEN, AUCH BEI EIGENER EINGABE.
           Hier wurde sie bisher auf null gesetzt. Damit verlor die eigene
           Eingabe als einzige aller Höhenquellen ihren Maßstab: gegen eine
           lichte Höhe ohne Geschosshöhe daneben lässt sich nichts mehr
           prüfen, und eine um einen halben Meter danebenliegende Eingabe
           ging widerspruchslos durch die Rechnung. Der Schnitt bleibt der
           Schnitt, auch wenn jemand die Höhe von Hand einträgt. */
        erg[k] = { lichte_hoehe: eig, geschosshoehe: alt.geschosshoehe || null,
                   geschosshoehe_quelle: alt.geschosshoehe ? (alt.quelle || null) : null,
                   quelle: "vom Bearbeiter eingetragen", abgeleitet: false,
                   angenommen: false };
        return;
      }
      if (alt.lichte_hoehe > 0) return;
      const G = zahl(alt.geschosshoehe, 0);
      if (G > 0) {
        /* Die Geschosshöhe steht auf dem Blatt: der Vorschlag kommt aus ihr,
           nicht aus dem Rückfallwert — mit der Herkunft im Klartext. */
        erg[k] = {
          lichte_hoehe: rnd(G - DECKENPAKET_ANNAHME, 3),
          geschosshoehe: alt.geschosshoehe,
          quelle: "aus der Geschosshöhe " + rnd(G, 2).toLocaleString("de-DE")
            + " m des Schnitts minus übliches Deckenpaket "
            + rnd(DECKENPAKET_ANNAHME, 2).toLocaleString("de-DE")
            + " m — das Deckenpaket ist eine Annahme, zu bestätigen oder zu "
            + "berichtigen",
          abgeleitet: true, angenommen: true, aus_geschosshoehe: true,
        };
        angenommen.push(k);
        return;
      }
      erg[k] = {
        lichte_hoehe: HOEHE_RUECKFALL,
        geschosshoehe: null,
        quelle: "Annahme, im Plan nicht ablesbar",
        abgeleitet: false, angenommen: true,
      };
      angenommen.push(k);
    });
    return { zuordnung: erg, angenommen: angenommen, rueckfall: HOEHE_RUECKFALL };
  }

  /* ------------------------------------------------------------------ *
   * 2b  Gegenprobe der Höhen
   * ------------------------------------------------------------------ *
   * WARUM ES SIE GIBT.
   *
   * Die lichte Höhe geht LINEAR in das Luftvolumen ein und damit in die
   * Lüftungsheizlast, und sie geht linear in jede Außenwandfläche ein. Sie
   * ist damit nach der Grundfläche die wirksamste Zahl der ganzen Rechnung —
   * und die einzige, die bis hierher niemand gegen irgendetwas hielt.
   *
   * GEMESSEN am 23.08.2026 („BV 2-0887 Ziolkowski"): jede Geschosshöhe um
   * einen halben Meter kleiner gesetzt ergab 5,677 kW statt 6,564 kW,
   * −13,5 Prozent — und ein Kontrollblatt, das mit dem sauberen Lauf
   * zeichengleich war: dieselbe Ampelfarbe, dieselbe Zahl an Fehlern,
   * Warnungen und Hinweisen, dieselben Kennungen, keine zusätzliche Zeile.
   * Die spezifische Heizlast lag bei 30,2 W/m² und damit mitten in der
   * Schranke, gegen die geprüft wird.
   *
   * DREI PROBEN, DIE OHNE ERFAHRUNGSWERT AUSKOMMEN:
   *
   *  1. Unmögliche Kombination. Lichte Höhe größer als Geschosshöhe minus
   *     Deckenpaket kann es nicht geben. Fängt den Feldtausch der Auslese
   *     unabhängig davon, warum er entstanden ist.
   *  2. Deckenpaket gegen die Höhenkoten. Wo der Schnitt die Geschosshöhe
   *     hergibt, muss Geschosshöhe minus lichte Höhe ein Deckenpaket
   *     ergeben. 0,10 bis 0,60 m ist die Spanne, mit der dieses Modul
   *     ohnehin arbeitet. Der halbe Meter aus der Messung oben verlässt sie
   *     in jedem einzelnen Geschoss.
   *  3. Bauwerkshöhe. Die Summe der Geschosshöhen muss die Spanne zwischen
   *     der untersten und der obersten Fußbodenebene des Schnitts füllen.
   *     Sie trägt auch dann noch, wenn nur die äußeren Koten gelesen wurden.
   *
   * WAS SIE NICHT TUT: raten. Liegen keine Höhenkoten vor, entsteht kein
   * stiller Haken, sondern die Auskunft, dass sich die Höhen an diesem Blatt
   * nicht gegenprüfen lassen. Ein Schweigen, das wie eine Bestätigung
   * aussieht, war der eigentliche Befund.
   * ------------------------------------------------------------------ */

  /** Prüft die fertige Höhenzuordnung gegen die Koten desselben Schnitts.
   *  @param zuordnung  Ergebnis von hoehenErgaenzen (zuordnung)
   *  @param koten      die Höhenkoten des Schnitts
   *  @param geschosse  die Geschosse des Raumbuchs
   *  @return {befunde, geprueft, spanne} */
  function hoehenGegenprobe(zuordnung, koten, geschosse) {
    const z = zuordnung || {};
    const g = (geschosse || []).slice().sort(function (a, b) {
      return rangVon(a) - rangVon(b); });
    const befunde = [];
    const ausKoten = geschosshoehenAusKoten(koten);
    let geprueft = 0;

    /* Probe 1 und 2, je Geschoss. */
    g.forEach(function (k) {
      const x = z[k];
      if (!x || !(x.lichte_hoehe > 0)) return;
      const L = x.lichte_hoehe;
      const belegt = ausKoten[k] && zahl(ausKoten[k].geschosshoehe, 0);
      const G = belegt > 0 ? belegt : zahl(x.geschosshoehe, 0);
      if (!(G > 0)) return;
      geprueft++;
      const paket = rnd(G - L, 3);
      if (paket < MIN_DECKENPAKET) {
        befunde.push({ thema: "Raumhöhe", art: "unmoeglich", geschoss: k,
          kennung: "hoehe_unmoeglich_" + k,
          aussage: "Für " + k + " steht eine lichte Höhe von "
            + de(L) + " m gegen eine Geschosshöhe von "
            + de(G) + " m"
            + (belegt > 0 ? " aus den Höhenkoten des Schnitts" : "") + ". Zwischen "
            + "beiden liegt die Decke; die lichte Höhe kann nicht größer sein als "
            + "die Geschosshöhe, und unter " + de(MIN_DECKENPAKET) + " m Deckenpaket gibt es keine tragende "
            + "Decke. Eine der beiden Zahlen ist falsch gelesen oder falsch "
            + "eingetragen.",
          abhilfe: "Am Schnitt nachmessen, welche der beiden Zahlen stimmt, und "
            + "die lichte Höhe dieses Geschosses unter den Eckdaten eintragen." });
        return;
      }
      if (paket > MAX_DECKENPAKET) {
        befunde.push({ thema: "Raumhöhe", art: "widerspruch", geschoss: k,
          kennung: "hoehe_paket_" + k,
          aussage: "Für " + k + " ergibt sich aus der gerechneten lichten Höhe "
            + de(L) + " m und der Geschosshöhe "
            + de(G) + " m"
            + (belegt > 0 ? " (aus den Höhenkoten des Schnitts)" : "")
            + " ein Deckenpaket von " + de(paket)
            + " m. Übliche Decken samt Fußbodenaufbau liegen zwischen "
            + de(MIN_DECKENPAKET) + " und "
            + de(MAX_DECKENPAKET) + " m. Die lichte "
            + "Höhe dieses Geschosses ist damit um rund "
            + de(paket - MAX_DECKENPAKET)
            + " m zu klein angesetzt — das geht unmittelbar als fehlendes "
            + "Luftvolumen und als fehlende Wandfläche in die Heizlast.",
          abhilfe: "Die lichte Höhe dieses Geschosses am Schnitt nachmessen und "
            + "unter den Eckdaten eintragen." });
      }
    });

    /* Probe 3: die Bauwerkshöhe.
     *
     * NICHT die Summe der Geschosshöhen aus den Koten gegen die Spanne
     * derselben Koten — das prüfte sich selbst und ginge immer auf. Geprüft
     * wird die Summe der LICHTEN HÖHEN, mit denen tatsächlich gerechnet wird,
     * gegen die Spanne des Schnitts. Dazwischen liegen die Deckenpakete, und
     * für sie steht nur eine Spanne fest. Das genügt:
     *
     *     Σ lichte Höhen + n · 0,10  ≤  Spanne  ≤  Σ lichte Höhen + n · 0,60
     *
     * Liegt die Spanne außerhalb, passen die gerechneten Höhen nicht in das
     * gezeichnete Gebäude. Am gemessenen Blatt: Σ = 7,36 m bei drei
     * Geschossen, zulässig also 7,66 bis 9,16 m, Spanne 8,38 m — sie hält.
     * Mit jeder Höhe einen halben Meter kleiner: Σ = 5,86 m, zulässig 6,16
     * bis 7,66 m, Spanne unverändert 8,38 m — sie hält nicht mehr. */
    const spanne = bauwerksSpanne(koten, g.length);
    if (spanne && g.length >= 1) {
      const alleDa = g.every(function (k) { return z[k] && z[k].lichte_hoehe > 0; });
      if (alleDa) {
        geprueft++;
        let summeL = 0;
        g.forEach(function (k) { summeL += z[k].lichte_hoehe; });
        summeL = rnd(summeL, 3);
        const min = rnd(summeL + g.length * MIN_DECKENPAKET, 3);
        const max = rnd(summeL + g.length * MAX_DECKENPAKET, 3);
        if (spanne.hoehe > max || spanne.hoehe < min) {
          const zuKlein = spanne.hoehe > max;
          befunde.push({ thema: "Raumhöhe", art: "widerspruch", geschoss: null,
            kennung: "hoehe_bauwerk",
            aussage: "Der Schnitt spannt von der untersten Fußbodenebene ("
              + de(spanne.unten) + " m) bis über das "
              + "oberste beheizte Geschoss (" + de(spanne.oben)
              + " m), also über " + de(spanne.hoehe)
              + " m. Gerechnet wird mit lichten Höhen von zusammen "
              + de(summeL) + " m. Dazwischen liegen "
              + mzahl(g.length, "eine Geschossdecke", "Geschossdecken") + "; selbst "
              + "mit " + de(MAX_DECKENPAKET)
              + " m je Decke käme das Gebäude nur auf "
              + de(max) + " m"
              + (zuKlein ? "" : ", mit " + de(MIN_DECKENPAKET)
                  + " m je Decke schon auf " + de(min) + " m")
              + ". Die gerechneten Höhen sind damit um rund "
              + de(Math.abs(zuKlein ? spanne.hoehe - max : min - spanne.hoehe)) + " m insgesamt zu "
              + (zuKlein ? "klein" : "groß") + "; das geht unmittelbar in "
              + "Luftvolumen und Wandflächen und damit in die Heizlast.",
            abhilfe: "Die lichten Höhen am Schnitt nachmessen und je Geschoss "
              + "unter den Eckdaten eintragen." });
        }
      }
    }

    return {
      befunde: befunde,
      geprueft: geprueft,
      spanne: spanne,
      /* Ohne Koten gibt es keine Gegenprobe. Das ist kein Haken, sondern eine
         Lücke, und sie wird als solche gemeldet. */
      moeglich: geprueft > 0,
    };
  }

  /** Die Spanne über den beheizten Geschossen: von der untersten
   *  Fußbodenebene des Schnitts bis zur Ebene, die n Ebenen darüber liegt.
   *
   *  Warum nicht bis zur obersten Ebene überhaupt: über dem obersten
   *  beheizten Geschoss stehen weitere Koten, die kein Geschoss mehr
   *  begrenzen — beim gemessenen Blatt die Traufe mit +6,02 über der
   *  Spitzbodendecke +5,65. Genommen wird deshalb genau die (n+1)-te Ebene
   *  von unten.
   *
   *  Damit das trägt, muss die Leiter lückenlos sein: jeder Schritt zwischen
   *  zwei benachbarten Ebenen muss als Geschosshöhe durchgehen. Fehlt eine
   *  Fußbodenkote, entsteht ein Schritt von über vier Metern, und dann sagt
   *  diese Probe lieber nichts, als falsch anzuschlagen. */
  const GESCHOSS_MIN = 2.00;
  const GESCHOSS_MAX = 4.00;
  function bauwerksSpanne(koten, anzahlGeschosse) {
    const n = Math.max(1, Math.round(zahl(anzahlGeschosse, 0)));
    const punkte = (koten || []).map(function (k) {
      const w = k && k.wert_m;
      const bezug = String((k && k.bezug) || "unklar").toLowerCase();
      if (!(typeof w === "number" && isFinite(w))) return null;
      if (bezug === "gelaende" || bezug === "first") return null;
      return w;
    }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
    if (punkte.length < 2) return null;
    const ebenen = [];
    punkte.forEach(function (w) {
      const letzte = ebenen[ebenen.length - 1];
      if (letzte && w - letzte.unten <= EBENE_ZUSAMMEN) {
        letzte.oben = Math.max(letzte.oben, w); return;
      }
      ebenen.push({ unten: w, oben: w });
    });
    if (ebenen.length < n + 1) return null;
    for (let i = 0; i < n; i++) {
      const schritt = ebenen[i + 1].oben - ebenen[i].oben;
      if (!(schritt >= GESCHOSS_MIN && schritt <= GESCHOSS_MAX)) return null;
    }
    const unten = ebenen[0].oben, oben = ebenen[n].oben;
    return { unten: unten, oben: oben, hoehe: rnd(oben - unten, 3),
             ebenen: ebenen.length };
  }

  /* ------------------------------------------------------------------ *
   * 3  Bauteile je Raum
   * ------------------------------------------------------------------ */

  /** Erzeugt die Bauteile eines Raums aus dem, was bekannt ist.
   *
   *  Grundgedanke: Sind Breite und Tiefe angeschrieben, sind die Wandlängen
   *  bekannt und die Flächen exakt. Ist nur die Grundfläche bekannt, wird der
   *  Raum als Quadrat angenähert; das ist eine Annahme und wird als solche
   *  gekennzeichnet, denn bei einem langen schmalen Raum liegt sie daneben.
   *  Ist gar nichts bekannt, entsteht kein Bauteil, sondern eine Frage.
   */
  /* ------------------------------------------------------------------ *
   * DIE SEITEN EINES RAUMS — VIER QUELLEN, IN DIESER REIHENFOLGE
   * ------------------------------------------------------------------ *
   * WARUM ES DIESE FUNKTION GIBT. Bis zum 23.08.2026 stand hier eine
   * einzige Zeile: b = t = Wurzel(A). GEMESSEN an 128 Räumen aus acht
   * echten Plänen kamen 85,9 % ohne Breite und ohne Tiefe zurück, liefen
   * also alle darüber. Das Quadrat hat unter allen Rechtecken gleicher
   * Fläche den KLEINSTEN Umfang; der Fehler ging damit immer nach unten und
   * immer unsichtbar, weil die Zeile gefüllt aussah.
   *
   * Ein Raum ist durch seinen UMFANG beschrieben, nicht durch Breite und
   * Tiefe. Umfang und Fläche zusammen legen das flächengleiche Rechteck
   * EINDEUTIG fest: b und t sind die beiden Wurzeln von
   *
   *        x² − (U/2)·x + A = 0.
   *
   * Das ist keine Näherung, sondern Algebra, und es ist für ein Rechteck
   * exakt. Für einen Raum mit Vorsprung ist U größer als bei jedem Rechteck
   * gleicher Fläche; das gerechnete Rechteck fällt dann länger und schmaler
   * aus und trägt mehr Wand — genau die Richtung, die stimmt.
   *
   * Erst wenn auch der Umfang fehlt, wird geschätzt, und auch dann nicht
   * mit dem Quadrat, sondern mit einem am GEBÄUDE hergeleiteten
   * Seitenverhältnis (siehe seitenverhaeltnisHerleiten). Das Quadrat ist die
   * letzte Stufe und sagt das von sich.
   * ------------------------------------------------------------------ */
  function seitenAusRaum(raum, v) {
    const r = raum || {};
    const A = zahl(r.A, 0);
    const b0 = zahl(r.breite_m, 0), t0 = zahl(r.tiefe_m, 0);
    if (b0 > 0 && t0 > 0) {
      return { b: b0, t: t0, art: "gemessen", fest: true,
               grund: "aus den angeschriebenen Raumabmessungen" };
    }
    if (!(A > 0)) return null;
    const U = zahl(r.umfang_m, 0);
    if (U > 0) {
      const halb = U / 2, d = halb * halb - 4 * A;
      if (d >= 0) {
        const w = Math.sqrt(d);
        const bU = (halb + w) / 2, tU = (halb - w) / 2;
        if (tU >= 0.3) {
          return { b: bU, t: tU, art: "umfang", fest: true,
            grund: "aus dem angeschriebenen Umfang " + de(U, 2) + " m und der "
              + "Fläche " + de(A, 2) + " m² gerechnet. Beide zusammen legen das "
              + "flächengleiche Rechteck eindeutig fest, " + de(bU, 2) + " mal "
              + de(tU, 2) + " m; der Umfang beschreibt einen Raum vollständiger "
              + "als Breite und Tiefe, die es bei einem Raum mit Vorsprung gar "
              + "nicht gibt" };
        }
      }
      /* U und A widersprechen sich: für jedes Rechteck gilt U ≥ 4·√A. Dann
         ist eine der beiden Zahlen falsch gelesen, und es wird geschätzt
         statt gerechnet. Gemeldet wird das in bauteileFuerRaum. */
    }
    const q = Math.sqrt(A);
    const vw = (v && zahl(v.wert, 0) > 1.001) ? Math.min(6, zahl(v.wert)) : 0;
    if (vw > 0) {
      const s = Math.sqrt(vw);
      return { b: q * s, t: q / s, art: "verhaeltnis", fest: false,
        grund: "aus der Grundfläche mit dem Seitenverhältnis " + de(vw, 2)
          + " zu 1 gerechnet. " + String((v && v.quelle) || "")
          + " Ein Rechteck dieses Verhältnisses hat mehr Umfang als das "
          + "Quadrat und damit mehr Wand; die Richtung des verbleibenden "
          + "Fehlers ist weiter nach unten, weil kein Raum genau dem Median "
          + "des Hauses entspricht" };
    }
    return { b: q, t: q, art: "quadrat", fest: false,
      grund: "aus der Grundfläche angenähert, Raum als Quadrat gerechnet — das "
        + "Quadrat hat unter allen Rechtecken gleicher Fläche den kleinsten "
        + "Umfang, die Wandfläche ist damit die kleinstmögliche und der Fehler "
        + "geht in die unsichere Richtung. Weder Breite und Tiefe noch ein "
        + "Umfang stehen an diesem Raum, und kein anderer Raum dieses Gebäudes "
        + "trägt ein Maß, aus dem sich ein Seitenverhältnis herleiten ließe" };
  }

  /* ------------------------------------------------------------------ *
   * DAS SEITENVERHÄLTNIS DES GEBÄUDES — HERGELEITET, NICHT GESETZT
   * ------------------------------------------------------------------ *
   * Der Rückfall auf das Quadrat unterstellt, dass jeder Raum quadratisch
   * ist. Übliche Wohnräume sind das nicht. Ein besseres Verhältnis darf
   * aber nicht GESETZT werden — eine Zahl aus der Literatur wäre hier ein
   * erfundener Messwert. Es wird deshalb an DIESEM Gebäude gewonnen: aus
   * den Räumen, deren Seiten belegt sind, entweder durch angeschriebene
   * Breite und Tiefe oder durch angeschriebenen Umfang samt Fläche.
   * Genommen wird der MEDIAN, nicht der Mittelwert: ein einzelner sehr
   * langer Flur soll das Verhältnis der Wohnräume nicht kippen.
   *
   * WANN ES NICHT GEHT. GEMESSEN an 128 Räumen aus acht Plänen: die 18
   * Räume mit Breite und Tiefe hatten dafür keine angeschriebene Fläche,
   * und umgekehrt. Maß und Fläche schließen sich auf diesen Plänen
   * praktisch aus. Trägt ein Gebäude weniger als zwei belegte Räume, bleibt
   * es beim Quadrat, und das steht dann auch so da.
   * ------------------------------------------------------------------ */
  function seitenverhaeltnisHerleiten(raeume) {
    const vs = [];
    (raeume || []).forEach(function (r) {
      const A = zahl(r && r.A, 0);
      const b = zahl(r && r.breite_m, 0), t = zahl(r && r.tiefe_m, 0);
      if (b > 0 && t > 0) {
        vs.push(Math.max(b, t) / Math.min(b, t)); return;
      }
      const U = zahl(r && r.umfang_m, 0);
      if (!(U > 0 && A > 0)) return;
      const halb = U / 2, d = halb * halb - 4 * A;
      if (!(d > 0)) return;
      const w = Math.sqrt(d);
      const bb = (halb + w) / 2, tt = (halb - w) / 2;
      if (tt >= 0.3) vs.push(bb / tt);
    });
    if (vs.length < 2) {
      return { wert: 1, art: "quadrat", n: vs.length,
        quelle: "Ein Seitenverhältnis ließ sich an diesem Gebäude nicht "
          + "herleiten: weniger als zwei Räume tragen ein belegtes Maß "
          + "(angeschriebene Breite und Tiefe oder angeschriebener Umfang "
          + "samt Fläche). Gerechnet wird deshalb mit dem Quadrat." };
    }
    vs.sort(function (a, b) { return a - b; });
    const mitte = vs.length % 2
      ? vs[(vs.length - 1) / 2]
      : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2;
    const v = Math.min(4, Math.max(1, mitte));
    return { wert: rnd(v, 3), art: "raeume", n: vs.length,
      quelle: "Das Seitenverhältnis " + de(v, 2) + " zu 1 ist an diesem "
        + "Gebäude hergeleitet: es ist der Median über die " + vs.length
        + " Räume, deren Seiten belegt sind. Es ist gemessen und kein "
        + "Erfahrungswert; dass es für die übrigen Räume desselben Hauses "
        + "gilt, ist eine Annahme." };
  }

  /** Der Umfangsfaktor eines Rechtecks mit dem Seitenverhältnis v:
   *  U = k·√A mit k = 2·(1+v)/√v. Für v = 1 ist k = 4, der kleinste Wert,
   *  den es gibt — das ist genau die Aussage, dass das Quadrat den kleinsten
   *  Umfang hat. */
  function formfaktor(v) {
    const w = zahl(v, 1);
    if (!(w > 1)) return 4;
    return 2 * (1 + w) / Math.sqrt(w);
  }

  function bauteileFuerRaum(raum, umgebung) {
    const r = raum || {}, u = umgebung || {};
    const hoehe = zahl(r.h) || zahl(u.hoehe);
    const A = zahl(r.A);
    const fenster = Math.max(0, Math.round(zahl(r.fenster, 0)));
    const erschlossen = aussenwaendeErschliessen(r, fenster);
    const nAussen = erschlossen.anzahl;
    const bauteile = [], fragen = [];

    if (!(hoehe > 0)) {
      fragen.push("Für \"" + (r.name || "Raum") + "\" fehlt die lichte Höhe.");
      return { bauteile: bauteile, fragen: fragen, genauigkeit: "unbestimmt" };
    }

    // Seitenlängen bestimmen — die Quellen und ihre Reihenfolge stehen in
    // seitenAusRaum. Hier wird nur genommen, was von dort kommt.
    const seiten = seitenAusRaum(r, u.seitenverhaeltnis);
    /* EIN GEMESSENES MASS DARF NICHT AN EINER FEHLENDEN SCHÄTZGRÖSSE STERBEN.
     *
     * Bis zum 26.08.2026 stand hier ein Ausstieg: ohne Fläche keine Seiten,
     * ohne Seiten kein Bauteil, Ende. Die GELESENE Außenwandlänge wurde erst
     * sechzig Zeilen weiter unten überhaupt angesehen. GEMESSEN am Blatt
     * „Bauantrag Soethe 1312.2021.pdf" (echter Kundenlauf 26.08.2026): der
     * Raum „Kind 1" trug 4,85 m Fassade aus der Maßkette des Blattes und
     * 2,60 m Höhe — eine fertige Außenwand von 12,61 m². Er starb trotzdem
     * an der fehlenden Grundfläche, die für diese Wand gar nicht gebraucht
     * wird. Das war kein fehlendes Maß, das war eine falsche Reihenfolge.
     *
     * Ohne Fläche bleiben Boden und Decke aus — die brauchen sie wirklich,
     * und beide sind unten schon auf A > 0 abgesichert. Was entsteht, ist
     * die senkrechte Hülle, und die Frage nach der Fläche bleibt stehen. */
    const awGelesen = zahl(r.aussenwand_m, 0);
    const nurWand = !seiten && nAussen > 0 && awGelesen > 0;
    if (!seiten && !nurWand) {
      fragen.push("Für \"" + (r.name || "Raum") + "\" fehlt die Fläche.");
      return { bauteile: bauteile, fragen: fragen, genauigkeit: "unbestimmt" };
    }
    if (nurWand) {
      fragen.push("Für \"" + (r.name || "Raum") + "\" fehlt die Fläche. Die "
        + "Außenwand ist trotzdem gebildet: ihre Länge von " + de(awGelesen, 2)
        + " m steht in der Maßkette des Blattes und braucht keine Grundfläche. "
        + "Ohne Fläche fehlen dem Raum das Luftvolumen und die Bauteile nach "
        + "oben und unten.");
    }
    let b = seiten ? seiten.b : 0, t = seiten ? seiten.t : 0;
    let genauigkeit = !seiten ? "gemessen"
      : (seiten.art === "gemessen" ? "gemessen"
      : (seiten.art === "umfang" ? "aus Umfang und Fläche gerechnet"
        : (seiten.art === "verhaeltnis"
          ? "aus der Fläche mit dem Seitenverhältnis des Gebäudes"
          : "aus der Fläche angenähert")));
    let seitengrund = seiten ? seiten.grund
      : "Für diesen Raum steht keine Grundfläche im Plan; gebildet ist allein "
        + "die Außenwand aus der gelesenen Fassadenlänge";
    if (seiten && seiten.art === "gemessen" && A > 0 && Math.abs(b * t - A) / A > 0.05) {
      fragen.push("Bei \"" + (r.name || "Raum") + "\" passen die Abmessungen "
        + rnd(b, 2) + " mal " + rnd(t, 2) + " nicht zur angegebenen Fläche von "
        + rnd(A, 2) + " Quadratmetern.");
    }
    /* Ein angeschriebener Umfang, der kleiner ist als 4·√A, kann nicht sein:
       das Quadrat hat unter allen Rechtecken gleicher Fläche den kleinsten
       Umfang. Dann ist eine der beiden Zahlen falsch gelesen, und das muss
       jemand wissen — hier wird stillschweigend geschätzt. */
    const uGel = zahl(r.umfang_m, 0);
    if (uGel > 0 && A > 0 && seiten
        && seiten.art !== "umfang" && seiten.art !== "gemessen") {
      fragen.push("Bei \"" + (r.name || "Raum") + "\" ist der angeschriebene "
        + "Umfang von " + de(uGel, 2) + " m kleiner als der kleinstmögliche "
        + "Umfang von " + de(4 * Math.sqrt(A), 2) + " m, den " + de(A, 2)
        + " m² als Quadrat hätten. Eine der beiden Zahlen ist falsch gelesen. "
        + "Gerechnet wurde ohne den Umfang.");
    }
    /* Mehr als vier Ecken heißt: der Raum ist kein Rechteck, und Breite mal
       Tiefe beschreibt ihn nicht. Steht ein Umfang da, ist das gleichgültig —
       das flächengleiche Rechteck trägt die Mehrlänge bereits. Steht keiner,
       fehlt sie, und der Fehler geht wieder nach unten. */
    const ecken = Math.round(zahl(r.ecken, 0));
    if (ecken > 4 && seiten && seiten.art !== "umfang") {
      seitengrund = String(seitengrund || "") + ". Die Auslese zählt an diesem "
        + "Raum " + ecken + " Ecken; er ist damit kein Rechteck, und ein "
        + "Rechteck gleicher Fläche hat weniger Umfang als er. Die Wandfläche "
        + "ist deshalb zusätzlich zu klein";
    }

    /* Welche Seiten liegen außen? Bei einem Eckzimmer sind es die kürzere und
       die längere; bei einer Seite die längere, weil Räume üblicherweise mit
       der Längsseite zur Fassade liegen. Das ist eine Annahme und steht so im
       Bauteilvermerk. */
    let laenge = seitenLaenge(b, t, nAussen);
    /* DIE LÄNGE KANN VON AUSSEN KOMMEN, UND DANN GILT SIE.
     *
     * Das Quadrat oben ist die kleinstmögliche Form und damit die kleinste
     * Wandfläche, die dieser Raum haben kann. Wer den Umfang des GESCHOSSES
     * kennt, weiß mehr als dieser Raum über sich selbst: die Summe aller
     * Raum-Außenwandlängen eines Geschosses ist sein Umfang, und daraus
     * folgt die Länge jedes einzelnen Raums genauer als aus seiner Fläche.
     * Wer das rechnet, steht in wandlaengenJeGeschoss; hier wird es nur
     * angenommen — samt Begründung, die am Bauteil stehen bleibt. */
    let laengenherkunft = null;
    /* DIE GELESENE AUSSENWANDLÄNGE STICHT ALLES.
     * Steht die Fassade dieses Raums in der Maßkette des Blattes, ist ihre
     * Länge kein Ergebnis einer Formannahme mehr, sondern ein Maß. Dann wird
     * weder ein Rechteck gebildet noch etwas verteilt. */
    if (nAussen > 0 && awGelesen > 0) {
      laenge = awGelesen;
      genauigkeit = "gemessen";
      laengenherkunft = "Außenwandlänge " + de(awGelesen, 2) + " m aus der "
        + "Maßkette des Blattes gelesen ("
        + String(r.aussenwand_quelle || "bemasst") + "). Die Fassadenabschnitte "
        + "vor diesem Raum ergeben sie unmittelbar; es ist keine Form "
        + "angenommen und nichts aus der Fläche zurückgerechnet";
    }
    const laengeVorgabe = zahl(u.wandlaenge, 0);
    if (nAussen > 0 && awGelesen <= 0 && laengeVorgabe > 0) {
      laenge = laengeVorgabe;
      laengenherkunft = u.wandlaenge_herkunft
        || "Außenwandlänge aus dem Umfang des Geschosses";
    }
    const fensterflaeche = fenster * zahl(u.fenstergroesse, 1.6);
    /* Die Fläche der Hauseingangstür geht der Wand ab, genau wie ein Fenster.
       Ohne diesen Abzug entstünden 2,16 m² Hülle aus dem Nichts. */
    const tuerflaeche = (nAussen > 0 && u.tuer) ? Math.max(0, zahl(u.tuer.A, 0)) : 0;
    const wandflaeche = Math.max(0, laenge * hoehe - fensterflaeche - tuerflaeche);

    /* WOGEGEN GRENZT DIE SENKRECHTE HÜLLE?
     *
     * Hier stand fest `{ typ: "aussen" }`. Das ist für jedes Geschoss über
     * Gelände richtig und für ein Kellergeschoss falsch: eine Kellerwand
     * unter Geländeoberkante grenzt an das ERDREICH und rechnet nach
     * DIN EN 12831-1 über f_θann · f_GW · f_ig, nicht gegen die
     * Norm-Außentemperatur.
     * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 22.08.2026):
     * KG KELLER 22,06 m² und KG FLUR 23,94 m² Wandfläche rechneten gegen
     * −10,7 °C statt gegen die Jahresmitteltemperatur.
     * WER es entscheidet, steht NICHT hier: die Lage eines Geschosses zum
     * Gelände ist Sache des Aufrufers (app.js kennt die Geschosse), dieser
     * Kern führt sie nur aus. Ohne Angabe bleibt es beim Regelfall Außenluft. */
    const w = (u.wand && typeof u.wand === "object") ? u.wand : null;
    if (nAussen > 0) {
      bauteile.push({
        art: "aussenwand", name: (w && w.name) || "Außenwand", A: rnd(wandflaeche, 2),
        grenzt_an: (w && w.grenzt_an) || { typ: "aussen" },
        kat: (w && w.kat) || "huelle",
        herkunft: (laengenherkunft ? laengenherkunft : seitengrund)
          + "; Lage: " + erschlossen.quelle
          + (w && w.herkunft ? "; " + w.herkunft : ""),
        sicher: (genauigkeit === "gemessen" || (seiten && seiten.art === "umfang"))
          && erschlossen.sicher && !w,
      });
      /* Die Haustür. Sie steckt im Aufruf (u.tuerflaeche), weil nur der
         Aufrufer weiß, welcher Raum der Hauseingang ist; hier wird sie
         eingebaut wie ein Fenster: eigene Fläche, und die Wand gibt sie ab. */
      if (tuerflaeche > 0) {
        bauteile.push({
          art: "tuer", name: "Außentür", A: rnd(tuerflaeche, 2), anzahl: 1,
          grenzt_an: { typ: "aussen" }, kat: "huelle",
          herkunft: (u.tuer && u.tuer.herkunft) || "Hauseingangstür angesetzt",
          sicher: false,
        });
      }
      if (fenster > 0) {
        bauteile.push({
          art: "fenster", name: "Fenster", A: rnd(fensterflaeche, 2),
          /* Wie viele Fenster in dieser einen Zeile stecken. Die Zeile fasst
             alle Fenster des Raums zusammen; ohne diese Zahl zählte das
             Kontrollblatt Zeilen gegen Fenster und meldete rot „Die
             Planauslese hat 5 Fenster gezählt, angelegt sind 3" — gemessen an
             einem Kellergeschoss mit fünf Fenstern in drei Räumen. */
          anzahl: fenster,
          grenzt_an: { typ: "aussen" }, kat: "huelle",
          herkunft: fenster + " Fenster mit je " + rnd(zahl(u.fenstergroesse, 1.6), 2)
            + " Quadratmetern angesetzt",
          sicher: false,
        });
      }
    }

    /* Decke und Boden: nur dort, wo das Geschoss an einen unbeheizten Bereich
       grenzt. Zwischendecken innerhalb der beheizten Hülle übertragen keine
       Wärme nach außen und gehören nicht in die Gebäudeheizlast. */
    if (u.unten && A > 0) {
      /* Die Fläche nach unten ist im Regelfall die ganze Grundfläche. Nur
         bei einem TEILUNTERKELLERTEN Haus liegt ein Teil des Geschosses auf
         dem Erdreich und der Rest über dem Keller; dann gibt der Aufrufer
         die Teilfläche vor (u.unten.A_m2). Ohne Angabe bleibt es bei der
         ganzen Grundfläche. */
      const Au = zahl(u.unten.A_m2, 0) > 0 ? Math.min(zahl(u.unten.A_m2), A) : A;
      bauteile.push({
        art: "boden", name: u.unten.name || "Bauteil nach unten", A: rnd(Au, 2),
        grenzt_an: u.unten.grenzt_an, kat: u.unten.kat || "huelle",
        /* Wer die Fläche gegen etwas anderes als den Regelfall legt, sagt
           warum. Der Zusatz steht sonst nirgends und ist genau die Angabe,
           an der ein Prüfer die Gegenseite nachvollzieht. */
        herkunft: u.unten.herkunft
          ? (Au < A ? "Teil der Grundfläche des Raums; " : "Grundfläche des Raums; ")
            + u.unten.herkunft
          : "Grundfläche des Raums",
        sicher: A > 0 && Au >= A,
      });
    }
    if (u.oben && A > 0) {
      bauteile.push({
        art: "decke", name: u.oben.name || "Bauteil nach oben", A: rnd(A, 2),
        grenzt_an: u.oben.grenzt_an, kat: u.oben.kat || "huelle",
        herkunft: "Grundfläche des Raums", sicher: A > 0,
      });
    }

    /* Hier stand eine Frage an den Bearbeiter: „X hat kein Bauteil zur
       Außenluft. Das ist nur bei vollständig innenliegenden Räumen richtig."
       Sie ist ersatzlos entfallen, weil sie doppelt war und sich selbst
       widersprach: dieselbe Lage beurteilt innenraumZulaessig() bereits, und
       das Kontrollblatt schreibt daraus die Zeile „Innenliegende Räume ohne
       Außenwand — das ist hier richtig". Auf Sebastians Blatt standen dadurch
       zwei Zeilen über dieselben zwei Räume (EG WC, EG DIELE): eine, die es
       für richtig erklärte, und eine, die danach fragte. Wer fragt, was er
       gerade beantwortet hat, wird nicht gelesen.
       Die Prüfung selbst ist nicht weg, sie steht nur an einer Stelle:
       modul_kontrollblatt, Zähler Z6. */
    return { bauteile: bauteile, fragen: fragen, genauigkeit: genauigkeit,
             wandlaenge: rnd(laenge, 2), aussenwaende: erschlossen };
  }

  /** Welche Seiten eines Rechtecks b × t liegen außen, und wie lang sind sie
   *  zusammen? Eine Stelle für zwei Verwender: bauteileFuerRaum baut daraus
   *  die Wand, wandlaengenJeGeschoss den Umfangsabgleich. Zwei Kopien wären
   *  zwei Wahrheiten über dieselbe Ecke. */
  function seitenLaenge(b, t, n) {
    const lang = Math.max(b, t), kurz = Math.min(b, t);
    if (n >= 4) return 2 * (lang + kurz);
    if (n === 3) return 2 * lang + kurz;
    if (n === 2) return lang + kurz;
    if (n === 1) return lang;
    return 0;
  }

  /* ------------------------------------------------------------------ *
   * 3a  Außenwandlängen eines Geschosses — der Umfangsabgleich
   * ------------------------------------------------------------------ *
   * WARUM ES DAS GIBT.
   * Ein Raum ohne angeschriebene Abmessungen wird oben als Quadrat
   * gerechnet. Unter allen Rechtecken gleicher Fläche hat das Quadrat den
   * KLEINSTEN Umfang; jede andere Form hat mehr. Der Fehler geht also immer
   * in dieselbe Richtung und immer in die unsichere: zu wenig Wand, zu wenig
   * Heizlast — und an keiner Zahl zu sehen, weil die Zeile gefüllt aussieht.
   *
   * GEMESSEN am Blatt „Werkvertragsverzeichnung BV 2-0887 Ziolkowski“,
   * echter Durchlauf gegen den echten Endpunkt am 23.08.2026: kein einziger
   * der 14 gelesenen Räume kam mit Breite und Tiefe zurück. Alle 13
   * Außenwände standen mit „Raum als Quadrat gerechnet“ da. Das
   * Kellergeschoss trug so 17,69 m Außenwand, während die zweite Lesung
   * seine Außenkontur mit 8,00 mal 7,00 m angibt — 30,0 m Umfang. 12,3 m
   * Kellerwand gehörten damit zu keinem Raum.
   *
   * DER ABGLEICH IST EINE IDENTITÄT, KEINE ERFAHRUNG.
   * Jeder Meter der Außenkante eines Geschosses ist die Außenwand genau
   * eines Raums. Für ein Geschoss gilt deshalb
   *
   *      Summe der Raum-Außenwandlängen  =  Umfang des Geschosses.
   *
   * Die quadratisch gerechneten Räume erfüllen das nicht. Der Fehlbetrag
   * wird auf sie verteilt, im Verhältnis ihrer bisherigen Längen: wer viel
   * Fassade hat, bekommt viel dazu.
   *
   * WOHER DER UMFANG KOMMT, in dieser Reihenfolge:
   *   1. Aus der gelesenen Außenbemaßung des Geschosses (zweite Lesung,
   *      KERN_GEGENPROBE.konturAusEbene). Das ist ein Maß vom Blatt. Es gilt
   *      nur, wenn die Kontur die Räume überhaupt fassen kann: ihre Fläche
   *      muss mindestens so groß sein wie die Summe der Raumflächen und darf
   *      sie höchstens verdoppeln. Eine Kontur, die kleiner ist als die
   *      Räume, die in ihr liegen, ist falsch gelesen und bleibt draußen.
   *   2. Sonst aus der Geschossfläche selbst: ein Geschoss mit A_G
   *      Raumfläche hat mindestens den Umfang 4·√A_G, weil das Quadrat unter
   *      allen Rechtecken den kleinsten Umfang hat. Das ist eine
   *      UNTERGRENZE und wird nur nach oben angewendet — liegen die Räume
   *      schon darüber, bleibt es bei ihnen. A_G ist die Summe der
   *      NETTO-Raumflächen und damit kleiner als die überbaute Fläche; die
   *      Untergrenze ist also doppelt vorsichtig.
   *
   * WAS NICHT ANGETASTET WIRD. Räume, deren Breite und Tiefe im Plan
   * angeschrieben sind, sind gemessen und nicht geschätzt. Ihre Länge geht
   * unverändert vom Umfang ab; verteilt wird allein der Rest.
   * ------------------------------------------------------------------ */

  /* Die Kontur muss die Räume fassen können und darf nicht zu einem anderen
     Geschoss gehören. Untere Schranke 0,98: Rundung der Flächenstempel.
     Obere Schranke 2,0: zwischen Netto-Raumfläche und überbauter Fläche
     liegen Wände, Treppenauge und Schächte, aber keine Verdopplung — was
     doppelt so groß ist wie die Räume, ist die Kontur eines anderen
     Geschosses oder eine Zahl in Zentimetern. */
  const KONTUR_MIN_ANTEIL = 0.98;
  const KONTUR_MAX_ANTEIL = 2.0;
  /* Wie weit der Abgleich eine Länge verschieben darf. Außerhalb dieser
     Spanne widersprechen Kontur und Räume einander so deutlich, dass eine
     von beiden falsch gelesen ist; dann wird nichts verschoben, sondern
     berichtet. */
  const FAKTOR_MIN = 0.6, FAKTOR_MAX = 2.5;

  /* ------------------------------------------------------------------ *
   * DER RÜCKFALL 4·√A UND WARUM ER ZU KURZ IST
   * ------------------------------------------------------------------ *
   * GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Durchlauf 23.08.2026):
   * das Erdgeschoss bekam 34,58 m Umfang aus 4·√74,72 m². Von Hand am selben
   * Blatt abgelesen sind es 2 × (8,00 + 12,50) = 41,00 m. Der Rückfall war
   * 15,7 % zu kurz, und zwar nicht wegen der Form, sondern wegen der FLÄCHE,
   * die in die Wurzel geht: 74,72 m² sind die Summe der NETTO-Raumflächen,
   * überbaut sind 8,00 × 12,50 = 100 m². Die Differenz sind Wände, Treppe
   * und Schächte. Das Seitenverhältnis erklärt davon fast nichts — zwischen
   * dem Quadrat (Faktor 4,00) und dem wirklichen Verhältnis 12,50 : 8,00
   * (Faktor 4,10) liegen 2,5 %; zwischen Netto- und Bruttofläche liegen
   * √(100/74,72) = 15,7 %. Wer den Rückfall verbessern will, muss also an
   * die Fläche, nicht an die Form.
   *
   * WOHER DIE BRUTTOFLÄCHE KOMMT, OHNE SIE ZU ERFINDEN: aus einem ANDEREN
   * Geschoss desselben Gebäudes, dessen Außenbemaßung belegt ist. Dort sind
   * beide Zahlen bekannt — die überbaute Fläche aus der Kontur und die
   * Netto-Raumfläche aus den Flächenstempeln —, und ihr Verhältnis ist
   * GEMESSEN, kein Erfahrungswert. Am selben Blatt: das Kellergeschoss trägt
   * 39,19 m² Räume in 56,00 m² Kontur, also 70 % Raumanteil. Auf die
   * 74,72 m² des Erdgeschosses angewandt: 106,7 m² überbaut, 4·√A = 41,3 m.
   *
   * DAS BLEIBT EINE ANNAHME, und sie hat eine Richtung: sie unterstellt,
   * dass beide Geschosse denselben Anteil ihrer Fläche an Wände und Treppe
   * verlieren. Ein Geschoss mit mehr Zimmern hat mehr Innenwände und
   * verliert mehr; wird das Verhältnis eines wandarmen Geschosses übertragen,
   * fällt der Umfang zu klein aus, im umgekehrten Fall zu groß. Deshalb
   * heißt die Art „hochrechnung" und nicht „kontur", und deshalb wird sie
   * berichtet.
   *
   * Die Schranke für das übertragene Verhältnis ist keine neue Zahl: es ist
   * dieselbe, mit der oben eine Kontur zugelassen wird. Was als Kontur eines
   * Geschosses durchgeht, darf auch als Verhältnis eines Geschosses gelten.
   * ------------------------------------------------------------------ */

  /** @param raeume  die Räume EINES Geschosses
   *  @param opt     { kontur: {A, U, quelle} | null,
   *                   bezug:  {geschoss, A_kontur, A_netto, quelle} | null }
   *  @returns { je_raum: {raum_id: laenge_m}, faktor, U_soll, U_roh,
   *             A_geschoss, A_brutto, art, quelle, befund, abhilfe }
   */
  function wandlaengenJeGeschoss(raeume, opt) {
    const o = opt || {};
    const erg = { je_raum: {}, faktor: 1, U_soll: 0, U_roh: 0, A_geschoss: 0,
                  A_brutto: 0, art: "keine", quelle: "", befund: null,
                  abhilfe: null };
    /* WER ZÄHLT MIT.
     * Bis zum 26.08.2026 stand hier allein `zahl(r.A, 0) > 0`. Ein Raum, dem
     * das Blatt seine Fassadenlänge ausdrücklich anschreibt, aber keine
     * Fläche, fiel damit aus dem Abgleich — obwohl gerade er die belastbarste
     * Zahl mitbringt. Gezählt wird deshalb, wer Fläche ODER eine gelesene
     * Außenwandlänge hat. */
    const liste = (raeume || []).filter(function (r) {
      return r && (zahl(r.A, 0) > 0 || zahl(r.aussenwand_m, 0) > 0);
    });
    if (!liste.length) {
      /* KEIN EMPFÄNGER — UND DAS WIRD GESAGT, NICHT VERSCHWIEGEN.
       * Hier kehrte die Funktion still zurück. GEMESSEN am Blatt „Bauantrag
       * Soethe 1312.2021.pdf" (echter Kundenlauf 26.08.2026): das Werkzeug
       * hatte die Außenbemaßung 11,80 mal 7,50 m gelesen und daraus 38,60 m
       * Umfang gerechnet — und verteilte sie auf niemanden, weil kein Raum
       * eine Fläche trug. 100 Prozent der Fassade gehörten keinem Raum, und
       * im Ergebnis stand dazu kein Wort. Der Umfang ist gelesen; was fehlt,
       * ist der Empfänger, und genau das gehört in den Befund. */
      const k0 = o.kontur || null;
      const kU0 = k0 ? zahl(k0.U, 0) : 0;
      if (kU0 > 0) {
        erg.U_soll = rnd(kU0, 2);
        erg.art = "ohne_empfaenger";
        erg.quelle = "Umfang des Geschosses " + de(kU0, 2) + " m aus der "
          + ((k0 && k0.quelle) || "Außenbemaßung des Blattes");
        erg.befund = "Der Umfang dieses Geschosses ist gelesen — " + de(kU0, 2)
          + " m aus " + ((k0 && k0.quelle) || "der Außenbemaßung des Blattes")
          + " —, aber kein einziger Raum des Geschosses trägt eine Grundfläche "
          + "oder eine gelesene Außenwandlänge. Die Fassade lässt sich deshalb "
          + "auf niemanden verteilen: " + de(kU0, 2) + " m gehören keinem Raum, "
          + "das sind 100 Prozent. Ohne Fläche entsteht auch kein Bauteil, und "
          + "ohne Bauteil bleibt die Heizlast dieses Geschosses bei null.";
        erg.abhilfe = "Die Grundflächen der Räume dieses Geschosses setzen — "
          + "der Vorschlag dazu steht in den Rückfragen (\u201Eaus den "
          + "Außenmaßen verteilt\u201C) und lässt sich mit einem Klick "
          + "übernehmen oder "
          + "ablehnen. Wer die Zahlen am Plan hat, trägt sie in der Raumzeile "
          + "ein; eine Eingabe geht jedem Vorschlag vor.";
      }
      return erg;
    }
    /* Das Seitenverhältnis des Gebäudes. Es kommt vom Aufrufer, weil es über
       ALLE Räume hergeleitet wird und nicht über die eines einzelnen
       Geschosses; liegt keins vor, ist es das Quadrat. */
    const vw = (o.v && zahl(o.v.wert, 0) > 1.001) ? Math.min(6, zahl(o.v.wert)) : 1;
    const vquelle = String((o.v && o.v.quelle) || "");

    let A_G = 0, L_fest = 0, L_frei = 0;
    const frei = [];
    liste.forEach(function (r) {
      const A = zahl(r.A, 0);
      A_G += A;
      const fenster = Math.max(0, Math.round(zahl(r.fenster, 0)));
      const n = Math.min(4, Math.max(0,
        Math.round(aussenwaendeErschliessen(r, fenster).anzahl)));
      if (!n) return;
      /* WAS FEST IST UND WAS VERTEILT WIRD.
         Fest ist jede Länge, die auf einem Maß beruht: eine gelesene
         Außenwandlänge aus der Maßkette, angeschriebene Breite und Tiefe,
         oder ein angeschriebener Umfang samt Fläche. Verteilt wird allein,
         was aus der Fläche geschätzt ist. Bis zum 23.08.2026 zählte hier nur
         Breite mal Tiefe als fest — ein Raum mit gelesenem Umfang wäre in die
         Verteilung geraten und sein Maß mit einem Faktor überschrieben
         worden. */
      const aw = zahl(r.aussenwand_m, 0);
      if (aw > 0) { L_fest += aw; return; }
      const st = seitenAusRaum(r, o.v);
      if (!st) return;
      const l = seitenLaenge(st.b, st.t, n);
      if (st.fest) { L_fest += l; return; }
      L_frei += l;
      frei.push({ id: String(r.id || r.name), l: l });
    });
    erg.A_geschoss = rnd(A_G, 2);
    erg.U_roh = rnd(L_fest + L_frei, 2);
    if (!(L_frei > 0)) {
      /* NICHTS ZU VERTEILEN — ABER VIELLEICHT ETWAS ZU MELDEN.
       * Auch hier kehrte die Funktion still zurück. Der Fall ist nicht
       * derselbe wie oben: hier tragen Räume durchaus Fassade, nur ist jede
       * einzelne Länge ein Maß und keine Schätzung, es gibt also keinen
       * Empfänger für einen Fehlbetrag. GEMESSEN am Blatt „Bauantrag Soethe
       * 1312.2021.pdf" (echter Kundenlauf 26.08.2026): das Obergeschoss trug
       * drei bemaßte Fassaden mit zusammen 12,62 m, seine gelesene Kontur
       * dagegen 37,80 m Umfang. 25,18 m Fassade gehörten keinem Raum, und im
       * Ergebnis stand dazu kein Wort. Verteilt wird weiterhin nichts — ein
       * gemessenes Maß wird nicht mit einem Faktor überschrieben —, aber der
       * Fehlbetrag wird benannt. */
      const kR = o.kontur || null;
      const kUR = kR ? zahl(kR.U, 0) : 0;
      const luecke = kUR - L_fest;
      if (kUR > 0 && luecke > Math.max(0.5, kUR * 0.02)) {
        erg.U_soll = rnd(kUR, 2);
        erg.art = "ohne_empfaenger";
        erg.quelle = "Umfang des Geschosses " + de(kUR, 2) + " m aus der "
          + ((kR && kR.quelle) || "Außenbemaßung des Blattes");
        erg.befund = "Die Räume dieses Geschosses tragen zusammen "
          + de(L_fest, 2) + " m Außenwand, der gelesene Umfang des Geschosses "
          + "ist " + de(kUR, 2) + " m (" + ((kR && kR.quelle)
            || "Außenbemaßung des Blattes") + "). " + de(luecke, 2) + " m "
          + "Fassade gehören damit keinem Raum, das sind "
          + Math.round(luecke / kUR * 100) + " Prozent. Verteilt wurde nichts: "
          + "jede vorhandene Länge steht als Maß im Blatt und wird nicht mit "
          + "einem Faktor überschrieben. Es fehlen Räume mit Außenlage, oder "
          + "den vorhandenen fehlt die Grundfläche.";
        erg.abhilfe = "Die Grundflächen der Räume dieses Geschosses setzen — "
          + "sobald sie stehen, verteilt der Abgleich den Fehlbetrag. Wer die "
          + "Fassadenlängen am Plan hat, trägt sie je Raum ein; eine Eingabe "
          + "geht jeder Verteilung vor.";
      }
      return erg;
    }

    const k = o.kontur || null;
    const kA = k ? zahl(k.A, 0) : 0, kU = k ? zahl(k.U, 0) : 0;
    /* Warum die gelesene Kontur ausscheidet, wird EINMAL formuliert und
       überall gleich verwendet. Ohne diesen Satz stand hinter dem
       Rückfallwert nur, dass er eine Untergrenze ist, aber nicht, warum
       überhaupt zurückgefallen wurde. */
    const konturGrund = kU > 0
      ? "Die gelesene Außenkontur (" + de(kA, 2) + " m²) passt nicht zu "
        + de(A_G, 2) + " m² Raumfläche auf diesem Geschoss und bleibt außen vor"
      : "Eine Außenbemaßung dieses Geschosses liegt nicht vor";
    let U;
    if (kU > 0 && kA >= A_G * KONTUR_MIN_ANTEIL && kA <= A_G * KONTUR_MAX_ANTEIL) {
      U = kU;
      erg.art = "kontur";
      erg.A_brutto = rnd(kA, 2);
      erg.quelle = "Umfang des Geschosses " + de(U, 2) + " m aus der "
        + ((k && k.quelle) || "Außenbemaßung des Blattes")
        + ". Jeder Meter der Außenkante ist die Außenwand genau eines Raums; "
        + "die Summe der Raumaußenwände muss diesen Umfang ergeben";
    } else {
      /* Zweite Stufe: die Bruttofläche aus einem Geschoss hochrechnen, dessen
         Kontur belegt ist. Zugelassen ist dasselbe Verhältnis, das oben eine
         Kontur zulässt — sonst wäre hier eine neue Zahl gesetzt. */
      const b = o.bezug || null;
      const bA = b ? zahl(b.A_kontur, 0) : 0, bN = b ? zahl(b.A_netto, 0) : 0;
      const bU = b ? zahl(b.U_kontur, 0) : 0;
      const anteilOk = bA > 0 && bN > 0
        && bA >= bN * KONTUR_MIN_ANTEIL && bA <= bN * KONTUR_MAX_ANTEIL;
      if (anteilOk && bU > 0) {
        /* EINE GEMESSENE BEZIEHUNG STATT ZWEIER ANNAHMEN.
         * Bis zum 23.08.2026 lief das hier in zwei Schritten: erst den
         * Raumanteil des Bezugsgeschosses übertragen, dann 4·√A rechnen.
         * Der zweite Schritt unterstellte wieder ein Quadrat und war damit
         * wieder die untere Schranke.
         * Das Bezugsgeschoss liefert die Beziehung aber in EINER Zahl:
         *      k = U_kontur / √A_netto
         * — wie viele Meter Umfang auf die Wurzel eines Quadratmeters
         * Raumfläche kommen. In k steckt beides, was 4·√A_netto unterschlägt:
         * die Wände, Treppen und Schächte zwischen den Räumen UND die Form
         * des Geschosses. k ist immer größer als 4, und um wie viel, ist an
         * diesem Gebäude gemessen und nicht angenommen.
         * GEMESSEN am Blatt „BV 2-0887 Ziolkowski": Kellergeschoss 39,19 m²
         * Raumfläche in einer Kontur von 30,00 m Umfang ergibt k = 4,79.
         * Auf das Erdgeschoss mit 74,72 m² angewandt: 41,4 m. Von Hand am
         * Blatt abgegriffen sind es 2·(8,00+12,50) = 41,00 m. */
        const k = bU / Math.sqrt(bN);
        U = k * Math.sqrt(A_G);
        erg.art = "hochrechnung";
        erg.formfaktor = rnd(k, 3);
        erg.A_brutto = rnd(A_G * bA / bN, 2);
        erg.quelle = "Umfang des Geschosses " + de(U, 2) + " m, hergeleitet aus "
          + "einer Beziehung, die am Geschoss "
          + String(b.geschoss || "mit belegter Kontur") + " GEMESSEN ist: dort "
          + "stehen " + de(bN, 2) + " m² Raumfläche in einer Außenkontur von "
          + de(bU, 2) + " m Umfang, das sind " + de(k, 2) + " m Umfang je "
          + "Wurzel-Quadratmeter Raumfläche. " + konturGrund + ". Dieselbe "
          + "Beziehung auf " + de(A_G, 2) + " m² Raumfläche hier angewandt "
          + "ergibt den genannten Umfang. Der Faktor " + de(k, 2) + " liegt "
          + "über dem Quadratwert 4,00 und enthält damit beides, was 4·√A "
          + "unterschlägt: die Wände, Treppen und Schächte zwischen den Räumen "
          + "und die Form des Geschosses, die nie quadratisch ist. Er ist an "
          + "diesem Gebäude gemessen und kein Erfahrungswert; seine Übertragung "
          + "auf dieses Geschoss ist eine Annahme";
      } else if (anteilOk) {
        const raumanteil = bN / bA;
        const A_b = A_G / raumanteil;
        const kf = formfaktor(vw);
        U = kf * Math.sqrt(A_b);
        erg.art = "hochrechnung";
        erg.formfaktor = rnd(kf, 3);
        erg.A_brutto = rnd(A_b, 2);
        erg.quelle = "Umfang des Geschosses " + de(U, 2) + " m, hochgerechnet "
          + "über das Geschoss " + String(b.geschoss || "mit belegter Kontur")
          + ". " + konturGrund + ". Dort stehen " + de(bN, 2) + " m² Raumfläche "
          + "in " + de(bA, 2) + " m² überbauter Fläche, also "
          + de(raumanteil * 100, 0) + " % Raumanteil; dieselbe Aufteilung auf "
          + de(A_G, 2) + " m² Raumfläche hier ergibt " + de(A_b, 2) + " m² "
          + "überbaute Fläche und mit " + de(kf, 2) + "·√A den genannten "
          + "Umfang. Von dort ist nur die Fläche überliefert, kein Umfang; "
          + "deshalb der zweite Schritt über den Formfaktor. " + vquelle
          + " Das Verhältnis ist an diesem Gebäude gemessen und kein "
          + "Erfahrungswert, seine Übertragung auf dieses Geschoss ist eine "
          + "Annahme";
      } else {
        const kf = formfaktor(vw);
        U = kf * Math.sqrt(A_G);
        erg.art = "untergrenze";
        erg.formfaktor = rnd(kf, 3);
        erg.A_brutto = rnd(A_G, 2);
        erg.quelle = "Umfang des Geschosses mindestens " + de(U, 2) + " m: "
          + de(A_G, 2) + " m² Raumfläche haben mit dem Seitenverhältnis "
          + de(vw, 2) + " zu 1 den Umfang " + de(kf, 2) + "·√A. " + vquelle
          + " Der kleinstmögliche Wert wäre 4·√A = " + de(4 * Math.sqrt(A_G), 2)
          + " m, denn das Quadrat hat unter allen Rechtecken gleicher Fläche "
          + "den kleinsten Umfang. Die Netto-Raumfläche ist kleiner als die "
          + "überbaute Fläche, die Schranke also doppelt vorsichtig. "
          + konturGrund + ", und kein anderes Geschoss dieses Gebäudes hat "
          + "eine, aus der sich die Beziehung zwischen Umfang und Raumfläche "
          + "hochrechnen ließe";
      }
    }
    erg.U_soll = rnd(U, 2);

    const rest = U - L_fest;
    let f = (rest > 0 && L_frei > 0) ? rest / L_frei : 1;
    /* Ein als Quadrat gerechneter Raum steht schon auf seinem kleinstmöglichen
       Wert. Ihn unter diesen Wert zu drücken, weil eine GESCHÄTZTE Kontur
       kleiner ausfällt, wäre eine Zahl unterhalb des Möglichen. Nur eine
       gelesene Kontur darf das. */
    if (erg.art !== "kontur" && f < 1) f = 1;
    if (f < FAKTOR_MIN || f > FAKTOR_MAX) {
      erg.befund = "Die Außenkontur des Geschosses (" + de(U, 2) + " m Umfang) und "
        + "die Außenwände seiner Räume (" + de(L_fest + L_frei, 2) + " m) "
        + "widersprechen einander um mehr als das Zulässige. Eine der beiden "
        + "Angaben ist falsch gelesen. Die Wandlängen bleiben unverändert.";
      f = 1;
    }
    /* ------------------------------------------------------------------ *
     * DAS SCHWEIGEN. Bis zum 23.08.2026 stand hier nur der Widerspruchsfall.
     * Griff der Rückfall, blieb `befund` auf null: das Werkzeug wusste, dass
     * es eine Untergrenze rechnet, schrieb das in `quelle` — und erhob
     * keinen einzigen Befund. GEMESSEN am Blatt „BV 2-0887 Ziolkowski":
     * Erdgeschoss und Obergeschoss liefen beide über den Rückfall, beide
     * mit befund null, und die Wandfläche lag 17,6 % unter der Handrechnung.
     * Wer weiß, dass seine Zahl eine Schranke ist, und es nicht sagt, lügt
     * durch Unterlassung. Ein Befund entsteht deshalb jetzt IMMER, wenn der
     * Umfang nicht vom Blatt dieses Geschosses stammt — auch dann, wenn die
     * Verteilung selbst glattgegangen ist.
     * ------------------------------------------------------------------ */
    if (!erg.befund && erg.art === "untergrenze") {
      erg.befund = "Der Umfang dieses Geschosses ist nicht gemessen, sondern als "
        + "UNTERGRENZE gerechnet: " + de(U, 2) + " m aus " + de(erg.formfaktor, 2)
        + "·√" + de(A_G, 2) + " m² Raumfläche"
        + (vw > 1.001
          ? " (Seitenverhältnis " + de(vw, 2) + " zu 1, an diesem Gebäude "
            + "hergeleitet)"
          : " (Raum als Quadrat gerechnet, weil sich an diesem Gebäude kein "
            + "Seitenverhältnis herleiten ließ)")
        + ". " + konturGrund + ". Der wirkliche Umfang ist größer — die "
        + "überbaute Fläche ist größer als die Summe der Räume, und kein "
        + "Geschoss ist so regelmäßig wie das gerechnete Rechteck. Die "
        + "Außenwandfläche dieses Geschosses ist damit zu klein und die "
        + "Heizlast zu niedrig. Um wie viel, sagt diese Rechnung nicht.";
    }
    if (!erg.befund && erg.art === "hochrechnung") {
      erg.befund = "Der Umfang dieses Geschosses ist nicht gemessen, sondern mit "
        + de(U, 2) + " m aus dem Geschoss "
        + String((o.bezug && o.bezug.geschoss) || "mit belegter Kontur")
        + " hochgerechnet. " + konturGrund + ". Die Hochrechnung unterstellt, "
        + "dass beide Geschosse dieselbe Beziehung zwischen Umfang und "
        + "Raumfläche haben, also denselben Anteil ihrer Fläche an Wände, "
        + "Treppe und Schächte verlieren und ähnlich geschnitten sind. Hat "
        + "dieses Geschoss mehr Innenwände als das herangezogene oder ist es "
        + "gedrungener, ist der Umfang zu groß und die Heizlast zu hoch; im "
        + "umgekehrten Fall ist es umgekehrt.";
    }
    if (erg.befund && erg.art !== "kontur") {
      erg.abhilfe = "Die Außenmaße dieses Geschosses über alles (Breite und "
        + "Tiefe) am Plan abgreifen und unter „Lichte Höhe und Außenmaße je "
        + "Geschoss“ eintragen. Dann rechnet der Umfangsabgleich mit dem Maß "
        + "vom Blatt statt mit einer Schranke.";
    }
    erg.faktor = Math.round(f * 1000) / 1000;
    if (f !== 1) {
      frei.forEach(function (x) { erg.je_raum[x.id] = rnd(x.l * f, 2); });
    }
    return erg;
  }

  /* Raumarten, die üblicherweise innen liegen. Das ist kein Naturgesetz, aber
   * ein brauchbarer Ausgangspunkt, wenn der Plan nichts hergibt. Ein Bad mit
   * Fenster wird über die Fensterregel unten trotzdem richtig behandelt. */
  const INNENLIEGEND = ["flur", "wc", "abstellraum", "speisekammer", "hwr"];

  /* Namen, die den Raum am Hauseingang bezeichnen. „Flur" steht bewusst NICHT
   * darin: einen Flur gibt es auf jedem Geschoss, und der im Obergeschoss hat
   * keine Haustür. */
  const NAME_EINGANG = /diele|windfang|eingang|hauseingang|hausflur|vorplatz|entree/i;

  /** Ist dieser Raum der Hauseingang? Antwort mit Begründung, nie ein blankes
   *  ja. Zwei Bedingungen müssen zusammenkommen: der Name muss den
   *  Eingangsbereich bezeichnen, und der Raum muss im ERDGESCHOSS liegen.
   *  Ohne die zweite Bedingung würde eine „Diele" im Obergeschoss zum
   *  Hauseingang erklärt. */
  function eingangsraum(r) {
    const raum = r || {};
    const name = String(raum.name || "");
    const t = NAME_EINGANG.exec(name);
    if (!t) return { ja: false, grund: "" };
    const g = geschossAusText(raum.geschoss || "");
    if (!g || g.kuerzel !== "EG") return { ja: false, grund: "" };
    return { ja: true, grund: "Raumname „" + name + "“ im Erdgeschoss" };
  }

  /** Bestimmt, an wie vielen Seiten ein Raum an die Außenluft grenzt.
   *  Vorrang hat die Angabe aus dem Plan. Fehlt sie, wird erschlossen:
   *  Ein Raum mit Fenster hat zwangsläufig eine Außenwand, egal was sonst
   *  angenommen wird. Räume, die üblicherweise innen liegen, bekommen keine.
   *  Alle übrigen bekommen eine; das ist die vorsichtige Wahl, denn zwei
   *  anzunehmen würde die Heizlast systematisch zu hoch treiben. */
  function aussenwaendeErschliessen(r, fenster) {
    const gemeldet = r.aussenwaende;
    if (gemeldet !== null && gemeldet !== undefined && Number.isFinite(Number(gemeldet))) {
      const n = Math.max(0, Math.round(Number(gemeldet)));
      /* Ein Fenster ohne Außenwand ist ein Widerspruch. Dann gilt das Fenster,
         denn es ist im Plan gezeichnet, die Null dagegen erschlossen. */
      if (n === 0 && fenster > 0) {
        return { anzahl: 1, quelle: "aus dem Plan gemeldet: keine Außenwand, aber "
          + fenster + " Fenster; das Fenster gilt", sicher: false };
      }
      /* DIE HAUSTÜR IST DERSELBE WIDERSPRUCH, nur ohne Fenster.
       *
       * Eine Diele im Erdgeschoss ist der Raum, durch den man das Haus
       * betritt. Sie kann nicht rundum an beheizte Räume grenzen — dann käme
       * niemand hinein. Das Modell liest die Außenwände je Raum, und diese
       * Zahl streut: an neun Lesungen desselben Blattes „BV 2-0887
       * Ziolkowski" gemessen kam die EG DIELE einmal mit null Außenwänden
       * zurück, sonst mit einer. Eine Null macht aus dem Eingangsraum einen
       * innenliegenden Flur, seine Wandfläche fällt aus der Rechnung, und
       * auffällig wird das an keiner Zahl.
       * Die Gegenprobe fängt das nicht: sie zählt Räume, Fenster und Ebenen,
       * aber keine Außenwände je Raum — danach wird in der zweiten Lesung
       * gar nicht gefragt. Deshalb steht die Regel hier. */
      if (n === 0 && eingangsraum(r).ja) {
        return { anzahl: 1, sicher: false,
          quelle: "aus dem Plan gemeldet: keine Außenwand — für den "
            + "Eingangsraum kann das nicht stimmen, dort liegt die Haustür ("
            + eingangsraum(r).grund + "). Angesetzt ist eine Außenwand" };
      }
      return { anzahl: n, quelle: "aus dem Plan gelesen", sicher: true };
    }
    if (fenster > 0) {
      return { anzahl: 1, quelle: "erschlossen: der Raum hat ein Fenster und damit "
        + "eine Außenwand", sicher: false };
    }
    const art = String(r.art || "").toLowerCase();
    if (INNENLIEGEND.indexOf(art) >= 0) {
      return { anzahl: 0, quelle: "erschlossen: " + art + " liegt üblicherweise innen",
               sicher: false };
    }
    return { anzahl: 1, quelle: "angenommen: eine Außenwand, weil der Plan keine "
      + "Angabe hergibt", sicher: false };
  }

  /* ------------------------------------------------------------------ *
   * 4  Zwei Auskünfte für das Kontrollblatt
   * ------------------------------------------------------------------ *
   * Beide beantworten Fragen, die das Kontrollblatt bisher an den
   * Bearbeiter weitergereicht hat, obwohl der Plan die Antwort hergibt.
   * Sie stehen hier, weil hier bereits die Raumarten und die Geschoss-
   * bezeichnungen gedeutet werden. Eine zweite Liste an zweiter Stelle
   * hieße zwei Wahrheiten.
   * ------------------------------------------------------------------ */

  /* Raumnamen, bei denen ein Raum ohne Fenster der Regelfall ist. Die Liste
   * ergänzt INNENLIEGEND um das, was nicht über die Raumart ankommt: die
   * Zuordnung in modul_ki.js kennt keine Kategorie für Keller, Technik oder
   * Windfang und legt solche Räume auf "wohnen". Über den Namen sind sie
   * trotzdem erkennbar. */
  const NAME_OHNE_FENSTER = new RegExp(
    "flur|diele|gang|garderobe|windfang|vorraum|vorplatz|schleuse|"
    + "abstell|speis|kammer|vorrat|hwr|hauswirtschaft|waschk|"
    + "keller|technik|heizung|hausanschluss|treppe|aufzug|schacht|"
    + "\\bwc\\b|gäste-?wc|gaeste-?wc|toilette", "i");

  /** Ist es der Regelfall, dass dieser Raum kein Fenster hat?
   *  Antwort mit Begründung, nie ein blankes ja. Aufenthaltsräume sind
   *  ausdrücklich NICHT erfasst: dort ist ein fehlendes Fenster ein Befund
   *  und keine Selbstverständlichkeit. */
  function ohneFensterUeblich(r) {
    const raum = r || {};
    const art = String(raum.art || "").toLowerCase();
    if (INNENLIEGEND.indexOf(art) >= 0) {
      return { ja: true, grund: "Raumart " + art + " liegt üblicherweise innen" };
    }
    if (art === "treppenhaus") {
      return { ja: true, grund: "innenliegendes Treppenhaus ist der Regelfall" };
    }
    const name = String(raum.name || "");
    const t = NAME_OHNE_FENSTER.exec(name);
    if (t) {
      return { ja: true, grund: "Raumname „" + name + "“ nennt einen Nebenraum "
        + "(„" + t[0] + "“), der üblicherweise kein Fenster hat" };
    }
    return { ja: false, grund: "" };
  }

  /** Darf dieser Raum ohne AUSSENWAND sein?
   *
   *  Ein innenliegender Flur, ein WC, ein Abstellraum: der Raum grenzt in der
   *  Fläche rundum an beheizte Räume, seine senkrechte Hülle ist null. Das ist
   *  der Regelfall und keine vergessene Wand.
   *
   *  WAS SICH GEÄNDERT HAT UND WARUM.
   *  Bis hierher hing die Antwort zusätzlich daran, dass der Raum auf einem
   *  Geschoss ZWISCHEN zwei beheizten Geschossen liegt. Das vermengte zwei
   *  verschiedene Fragen:
   *
   *      senkrecht   Hat der Raum eine Außenwand?  — Sache des Grundrisses.
   *      waagerecht  Hat er eine Decke oder einen Boden gegen kalt?
   *                  — Sache des GESCHOSSES, nicht des einzelnen Raumes.
   *
   *  Die zweite Frage ist für jeden Raum eines Randgeschosses gleich zu
   *  beantworten, und sie wird jetzt auch dort gestellt, wo sie hingehört:
   *  im Kontrollblatt, Zähler „Abschluss nach oben/unten", je Geschoss und für
   *  alle Räume gemeinsam. Dadurch wird sie sogar für Räume geprüft, die eine
   *  Außenwand haben — die fielen vorher komplett durch, weil sie mit ihrer
   *  Außenwand als „hat Hüllbauteil" durchgingen.
   *
   *  Gemessen am Blatt „BV 2-0887 Ziolkowski": „OG FLUR" liegt in der Mitte
   *  des Obergeschosses, zwischen SCHLAFEN, BADEN, KIND I, KIND II und der
   *  Treppe. Er hat nachweislich keine Außenwand, und das Werkzeug meldete
   *  ihn trotzdem rot, weil das Obergeschoss das oberste Geschoss ist. Der
   *  Befund war falsch; die Decke gegen den Spitzboden hat er, sie kommt aus
   *  bauteileFuerRaum und wird jetzt getrennt geprüft.
   *
   *  @param raum       Raum aus dem Raumbuch
   *  @param geschosse  alle im Raumbuch vorkommenden Geschossbezeichnungen
   *                    (nur noch für den Begründungstext)
   */
  function innenraumZulaessig(raum, geschosse) {
    const r = raum || {};
    const liste = (geschosse || []).filter(function (g) { return !!g; });
    /* Eine ausdrückliche Angabe aus dem Plan geht jeder Deutung vor. */
    const gemeldet = r.aussenwaende;
    if (gemeldet !== null && gemeldet !== undefined
        && Number.isFinite(Number(gemeldet))) {
      if (Number(gemeldet) === 0) {
        /* Eine Ausnahme, und nur diese eine: der Eingangsraum. Durch ihn geht
           man ins Haus, also hat er eine Außenwand mit der Haustür darin.
           Ohne diese Zeile erklärt das Kontrollblatt eine Diele mit null
           gelesenen Außenwänden für „innenliegend — das ist hier richtig" und
           nimmt damit dieselbe Streuung des Modells hin, die
           aussenwaendeErschliessen gerade abgefangen hat. Zwei Stellen, ein
           Urteil. */
        const e = eingangsraum(r);
        if (e.ja) {
          return { ja: false, grund: "Der Plan meldet keine Außenwand, aber der "
            + "Raum ist der Hauseingang (" + e.grund + "). Dort liegt die "
            + "Haustür; ohne Außenwand käme niemand ins Haus." };
        }
        return { ja: true, grund: "der Plan meldet für diesen Raum keine Außenwand" };
      }
      return { ja: false, grund: "Der Plan meldet für diesen Raum "
        + Math.round(Number(gemeldet)) + " Außenwände." };
    }
    const u = ohneFensterUeblich(r);
    if (!u.ja) {
      return { ja: false, grund: "Der Raum ist kein üblicherweise innenliegender "
        + "Nebenraum." };
    }
    const mehrere = liste.length > 1;
    return { ja: true, grund: u.grund
      + (mehrere && r.geschoss
        ? ", und in „" + r.geschoss + "“ grenzt er in der Fläche an beheizte Räume"
        : "") };
  }

  /** Muss dieses Geschoss ein Bauteil nach unten bzw. nach oben haben?
   *
   *  Ja, und zwar bauartbedingt: unter dem untersten beheizten Geschoss liegt
   *  Erdreich oder ein unbeheizter Keller, über dem obersten liegt das Dach
   *  oder ein unbeheizter Dachraum. Beides ist keine Annahme, sondern eine
   *  Selbstverständlichkeit — ein Haus ohne Boden und ohne Dach gibt es nicht.
   *  Zwischengeschosse dagegen grenzen oben und unten an beheizte Räume; dort
   *  gehört keine Fläche in die Gebäudeheizlast.
   *
   *  @param geschoss   Bezeichnung des zu beurteilenden Geschosses
   *  @param geschosse  alle im Raumbuch vorkommenden Geschossbezeichnungen
   *  @returns {unten, oben} — jeweils true, wenn dort ein Bauteil liegen muss
   */
  function geschossabschluss(geschoss, geschosse) {
    const liste = (geschosse || []).filter(function (g) { return !!g; });
    if (!liste.length) return { unten: false, oben: false, pruefbar: false };
    const raenge = liste.map(rangVon);
    const tiefster = Math.min.apply(null, raenge);
    const hoechster = Math.max.apply(null, raenge);
    const eigen = rangVon(geschoss);
    return {
      unten: eigen <= tiefster,
      oben: eigen >= hoechster,
      pruefbar: true,
      allein: tiefster === hoechster,
    };
  }

  /** Prüft die Folge der erfassten Geschosse auf eine Lücke.
   *  Das ist eine unabhängige Probe ohne Schnitt: die Geschossbezeichnungen
   *  tragen eine Reihenfolge in sich. Fehlt zwischen dem untersten und dem
   *  obersten erfassten Vollgeschoss ein Rang, dann fehlt ein Geschoss —
   *  und ein fehlendes Geschoss ergibt eine zu kleine Heizlast, die am
   *  Ergebnis nicht auffällt.
   *
   *  Das Dachgeschoss trägt in GESCHOSSMUSTER den Rang 9. Das ist ein
   *  Anschlag für "ganz oben", keine Ordnungszahl; es wird deshalb aus der
   *  Lückensuche herausgenommen und nur daraufhin geprüft, dass es
   *  tatsächlich über dem obersten Vollgeschoss liegt. */
  function geschossfolge(namen) {
    const erkannt = [], unklar = [];
    (namen || []).forEach(function (n) {
      const g = geschossAusText(n);
      if (g) erkannt.push({ name: String(n), kuerzel: g.kuerzel, rang: g.rang });
      else unklar.push(String(n));
    });
    const dach = erkannt.filter(function (x) { return x.rang >= 9; });
    const voll = erkannt.filter(function (x) { return x.rang < 9; })
      .sort(function (a, b) { return a.rang - b.rang; });
    const luecken = [];
    if (voll.length >= 2) {
      for (let rg = voll[0].rang; rg <= voll[voll.length - 1].rang; rg++) {
        if (!voll.some(function (x) { return x.rang === rg; })) luecken.push(rg);
      }
    }
    /* Zwei Blätter mit derselben Bezeichnung sind keine zwei Geschosse. */
    const doppelt = [];
    voll.concat(dach).forEach(function (x, i, a) {
      if (a.findIndex(function (y) { return y.kuerzel === x.kuerzel; }) !== i
          && doppelt.indexOf(x.kuerzel) < 0) doppelt.push(x.kuerzel);
    });
    return {
      folge: voll.concat(dach),
      unklar: unklar,
      luecken: luecken,
      doppelt: doppelt,
      /* Beurteilbar ist die Folge erst ab zwei erkannten Vollgeschossen und
         nur dann, wenn jede Bezeichnung gedeutet werden konnte. */
      pruefbar: voll.length >= 2 && unklar.length === 0,
      ok: luecken.length === 0 && doppelt.length === 0,
    };
  }

  function zahl(x, ersatz) {
    const v = typeof x === "string" ? parseFloat(x.replace(",", ".")) : x;
    return Number.isFinite(v) ? v : (ersatz === undefined ? 0 : ersatz);
  }
  function rnd(x, n) { const f = Math.pow(10, n || 0); return Math.round(x * f) / f; }
  /* „1 Geschossdecken" macht misstrauisch gegen jede andere Zahl im Satz. */
  function mzahl(n, ein, mehr) {
    return Math.abs(Number(n)) === 1 ? ein : (n + " " + mehr);
  }
  /* Zahl mit Komma. Die Herkunftstexte dieses Kerns landen unverändert im
     Bericht; ein Punkt als Dezimaltrennzeichen fällt dort sofort auf. */
  function de(x, n) {
    return rnd(zahl(x, 0), n === undefined ? 2 : n)
      .toLocaleString("de-DE", { minimumFractionDigits: n === undefined ? 2 : n,
                                 maximumFractionDigits: n === undefined ? 2 : n });
  }

  /* ------------------------------------------------------------------ */
  function selbsttest() {
    const f = [];

    // --- Geschoss aus Text -------------------------------------------
    const faelle = [
      ["abb3_erdgeschoss.png", "EG"], ["Grundriss Dachgeschoss", "DG"],
      ["KELLERGESCHOSS 1936", "KG"], ["1. Obergeschoss", "1.OG"],
      ["2.OG Grundriss", "2.OG"], ["Obergeschoss", "OG"],
      ["Schnitt A-A", null], ["Lageplan", null],
    ];
    faelle.forEach(function (x) {
      const g = geschossAusText(x[0]);
      const ist = g ? g.kuerzel : null;
      if (ist !== x[1]) f.push("Geschoss aus \"" + x[0] + "\": " + ist + " statt " + x[1]);
    });

    // --- Rangfolge der Belege ----------------------------------------
    const b1 = geschossFuerBlatt({ name: "irgendwas.png",
      blattkopf: { geschoss: "Dachgeschoss" } });
    if (b1.kuerzel !== "DG" || b1.quelle !== "Blattkopf") f.push("Blattkopf muss gewinnen");
    const b2 = geschossFuerBlatt({ name: "abb3_erdgeschoss.png" });
    if (b2.kuerzel !== "EG") f.push("Dateiname als schwächster Beleg muss greifen");
    if (b2.sicher) f.push("Allein der Dateiname darf nicht als sicher gelten");
    const b3 = geschossFuerBlatt({ name: "eg_plan.png",
      blattkopf: { geschoss: "Obergeschoss" } });
    if (!b3.widerspruch) f.push("Widerspruch Blattkopf gegen Dateiname muss auffallen");
    if (!b3.frage) f.push("Widerspruch muss eine Frage erzeugen");
    /* GEFRAGT WIRD NUR, WENN DIE ANTWORT ETWAS ÄNDERT.
     *
     * Diese Prüfung stand vorher als „ohne Anhaltspunkt muss gefragt werden"
     * da und verlangte die Frage auch für ein Blatt ohne einen einzigen
     * gelesenen Raum. Sie war zu weit gefasst: das Geschoss eines Blattes
     * dient dazu, seine Räume einzusortieren. Sind keine da, sortiert die
     * Antwort nichts ein, und die Frage hat keine Folge — sie stand nur als
     * Zeile in der Liste, die jemand abhaken muss.
     * GEMESSEN an Sebastians Datei: Blatt 2 ist der Bebauungsplan 300
     * „Springbach Höfe", ohne einen Raum. Er erzeugte dieselbe Frage wie
     * Blatt 1, das drei Grundrisse trägt.
     * Was die Prüfung schützen sollte, bleibt geschützt und steht unten
     * schärfer da: still zugeschlagen wird nie (kuerzel bleibt null), und
     * sobald ein Raum ohne Geschoss dasteht, wird sehr wohl gefragt. */
    const b4 = geschossFuerBlatt({ name: "plan.png" });
    if (b4.kuerzel !== null) f.push("Ohne Anhaltspunkt darf nichts zugeordnet werden");
    if (b4.frage) f.push("Ein Blatt ohne Raum braucht kein Geschoss");
    const b4b = geschossFuerBlatt({ name: "plan.png", raeume: [{ bezeichnung: "Bad" }] });
    if (b4b.kuerzel !== null || !b4b.frage) {
      f.push("Ein Raum ohne Geschoss muss die Frage nach dem Geschoss erzeugen");
    }
    // Räume uneinig: keine Zuordnung aus der Auslese
    const b5 = geschossFuerBlatt({ name: "plan.png",
      raeume: [{ geschoss: "EG" }, { geschoss: "OG" }] });
    if (b5.kuerzel !== null) f.push("Uneinige Raumangaben dürfen nichts belegen");
    /* Ein A3-Bogen mit drei Grundrissen: keine offene Frage, sondern eine
       Auskunft. Jeder Raum trägt sein Geschoss selbst. */
    const b6 = geschossFuerBlatt({ name: "plan.png",
      raeume: [{ geschoss: "KG" }, { geschoss: "EG" }, { geschoss: "OG" }] });
    if (b6.frage) f.push("Mehrere Grundrisse auf einem Bogen sind keine offene Frage");
    if (!b6.mehrere || b6.mehrere.length !== 3) {
      f.push("Die Geschosse eines Sammelbogens müssen benannt werden");
    }
    if (!b6.sicher) f.push("Vollständig getragene Geschosse sind eine sichere Auskunft");
    /* Aber sobald EIN Raum sein Geschoss nicht trägt, wird gefragt: er fiele
       sonst beim Abschluss nach oben und unten durch. */
    const b7 = geschossFuerBlatt({ name: "plan.png",
      raeume: [{ geschoss: "EG" }, { geschoss: "OG" }, { bezeichnung: "Flur" }] });
    if (!b7.frage) f.push("Ein Raum ohne Geschoss muss auch neben anderen auffallen");

    // --- Höhen zuordnen ------------------------------------------------
    const h1 = hoehenZuordnen(
      [{ geschoss: "EG", lichte_hoehe_m: 2.75, beleg: "Schnitt" },
       { geschoss: "OG", lichte_hoehe_m: 2.75, beleg: "Schnitt" }], ["EG", "OG"]);
    if (!h1.vollstaendig) f.push("Benannte Höhen müssen zugeordnet werden");
    if (h1.zuordnung.EG.lichte_hoehe !== 2.75) f.push("Höhe EG falsch");
    // Reihenfolge, wenn keine Bezeichnung dabei ist
    const h2 = hoehenZuordnen(
      [{ geschoss: "", lichte_hoehe_m: 2.75 }, { geschoss: "", lichte_hoehe_m: 2.4 }],
      ["EG", "DG"]);
    if (h2.zuordnung.EG.lichte_hoehe !== 2.75) f.push("Reihenfolge von unten falsch");
    if (h2.zuordnung.DG.lichte_hoehe !== 2.4) f.push("Reihenfolge oben falsch");
    // Anzahl passt nicht: lieber fragen als raten
    const h3 = hoehenZuordnen([{ geschoss: "", lichte_hoehe_m: 2.75 }], ["EG", "OG", "DG"]);
    if (h3.vollstaendig) f.push("Bei ungleicher Anzahl darf nicht verteilt werden");
    if (!h3.fragen.length) f.push("Ungleiche Anzahl muss eine Frage erzeugen");
    const h4 = hoehenZuordnen([], ["EG"]);
    if (h4.vollstaendig || !h4.fragen.length) f.push("Ohne Schnitt muss gefragt werden");

    // Nur Geschosshöhe bekannt: ohne Deckendicke keine lichte Höhe, sondern eine Frage
    const roh = [{ geschoss: "EG", lichte_hoehe_m: null, geschosshoehe_m: 3.0 },
                 { geschoss: "DG", lichte_hoehe_m: null, geschosshoehe_m: 2.5 }];
    const h5 = hoehenZuordnen(roh, ["EG", "DG"]);
    if (h5.vollstaendig) f.push("Ohne Deckendicke darf keine lichte Höhe entstehen");
    if (!h5.braucht_deckendicke.length) f.push("Fehlende Deckendicke muss gemeldet werden");
    if (!h5.fragen.some(function (x) { return x.thema === "Deckendicke"; })) {
      f.push("Es muss nach der Deckendicke gefragt werden");
    }
    const h6 = hoehenZuordnen(roh, ["EG", "DG"], 0.25);
    if (!h6.vollstaendig) f.push("Mit Deckendicke muss die lichte Höhe entstehen");
    if (Math.abs(h6.zuordnung.EG.lichte_hoehe - 2.75) > 0.001) {
      f.push("3,00 minus 0,25 muss 2,75 ergeben, ist " + h6.zuordnung.EG.lichte_hoehe);
    }
    if (!h6.zuordnung.EG.abgeleitet) f.push("Abgeleitete Höhe muss gekennzeichnet sein");
    // Angeschriebene lichte Höhe hat Vorrang vor jeder Ableitung
    const h7 = hoehenZuordnen([{ geschoss: "EG", lichte_hoehe_m: 2.6, geschosshoehe_m: 3.0 }],
                              ["EG"], 0.25);
    if (h7.zuordnung.EG.lichte_hoehe !== 2.6) f.push("Angeschriebene lichte Höhe hat Vorrang");
    if (h7.zuordnung.EG.abgeleitet) f.push("Angeschriebene Höhe ist nicht abgeleitet");

    /* --- Türhöhe und Feldtausch, Blatt „BV 2-0887 Ziolkowski" -----------
       EINGABE IST KEINE ERFINDUNG: das ist die Antwort, die der Live-Endpunkt
       am 22.08.2026 in der Betriebsart „hoehen" zu diesem Blatt geliefert hat,
       Wort für Wort. Die Koten stammen aus derselben Zeichnung (±0,00 / +2,91
       / −2,73, Rohdecke Spitzboden +5,65). */
    const zioRoh = [
      { geschoss: "KELLERGESCHOSS", lichte_hoehe_m: null, geschosshoehe_m: 2.32,
        beleg: "Hoehenkote 2,32 im Keller" },
      { geschoss: "ERDGESCHOSS", lichte_hoehe_m: 2.2, geschosshoehe_m: 2.52,
        beleg: "lichte Hoehe 2,20 an Tuer, Geschosshoehe 2,52 links bemasst" },
      { geschoss: "OBERGESCHOSS", lichte_hoehe_m: null, geschosshoehe_m: 2.52,
        beleg: "Geschosshoehe 2,52 links bemasst" },
    ];
    const zioKoten = [
      { geschoss: "KELLERGESCHOSS", wert_m: -2.73, bezug: "okff", text: "-2,73" },
      { geschoss: "KELLERGESCHOSS", wert_m: -2.88, bezug: "rohdecke", text: "-2,88" },
      { geschoss: "ERDGESCHOSS", wert_m: 0, bezug: "okff", text: "+-0,00" },
      { geschoss: "ERDGESCHOSS", wert_m: -0.19, bezug: "rohdecke", text: "-0,19" },
      { geschoss: "OBERGESCHOSS", wert_m: 2.91, bezug: "okff", text: "+2,91" },
      { geschoss: "OBERGESCHOSS", wert_m: 2.74, bezug: "rohdecke", text: "+2,74" },
      { geschoss: "SPITZBODEN", wert_m: 5.65, bezug: "rohdecke", text: "+5,65" },
    ];
    // Die Türhöhe verschwindet, auch ohne Koten.
    const z0 = hoehenZuordnen(zioRoh, ["KG", "EG", "OG"]);
    if (z0.zuordnung.EG.lichte_hoehe === 2.2) {
      f.push("Die Türhöhe 2,20 darf nicht als Raumhöhe durchgehen");
    }
    if (!(z0.befunde || []).some(function (b) { return b.art === "verworfen"; })) {
      f.push("Das verworfene Türmaß muss einen Befund erzeugen");
    }
    // Mit den Koten steht jede der drei Höhen ohne Rückfall und ohne Frage da.
    const z1 = hoehenZuordnen(zioRoh, ["KG", "EG", "OG"], 0, zioKoten);
    if (!z1.vollstaendig) f.push("Mit den Höhenkoten müssen alle drei Höhen stehen");
    const soll = { KG: 2.32, EG: 2.52, OG: 2.52 };
    Object.keys(soll).forEach(function (k) {
      const ist = z1.zuordnung[k] && z1.zuordnung[k].lichte_hoehe;
      if (Math.abs(zahl(ist, -9) - soll[k]) > 0.001) {
        f.push("Lichte Höhe " + k + " muss " + soll[k] + " sein, ist " + ist);
      }
    });
    if (z1.braucht_deckendicke.length) {
      f.push("Nach der Deckendicke darf nicht mehr gefragt werden, sie steht im Schnitt");
    }
    if (z1.fragen.some(function (x) { return x.thema === "Deckendicke"; })) {
      f.push("Die Deckendickenfrage muss entfallen, wenn sie ableitbar ist");
    }
    if (Math.abs(zahl(z1.deckendicke_abgeleitet.EG, 0) - 0.39) > 0.001) {
      f.push("Deckenpaket EG muss 0,39 m sein, ist " + z1.deckendicke_abgeleitet.EG);
    }
    if (Math.abs(zahl(z1.deckendicke_abgeleitet.KG, 0) - 0.41) > 0.001) {
      f.push("Deckenpaket KG muss 0,41 m sein, ist " + z1.deckendicke_abgeleitet.KG);
    }
    if (!(z1.befunde || []).some(function (b) { return b.art === "richtiggestellt"; })) {
      f.push("Der Feldtausch Geschosshöhe/lichte Höhe muss gemeldet werden");
    }
    // Geschosshöhen aus den Koten, für sich geprüft
    const gk = geschosshoehenAusKoten(zioKoten);
    if (Math.abs(zahl(gk.KG && gk.KG.geschosshoehe, 0) - 2.73) > 0.001) {
      f.push("Geschosshöhe KG aus den Koten muss 2,73 sein");
    }
    if (Math.abs(zahl(gk.EG && gk.EG.geschosshoehe, 0) - 2.91) > 0.001) {
      f.push("Geschosshöhe EG aus den Koten muss 2,91 sein");
    }
    if (Math.abs(zahl(gk.OG && gk.OG.geschosshoehe, 0) - 2.74) > 0.001) {
      f.push("Geschosshöhe OG bis Rohdecke muss 2,74 sein");
    }
    /* Die verbesserte Auslese liefert die lichten Höhen direkt UND nennt die
       Tür im Beleg. Das darf die richtige Zahl nicht kosten. GEMESSEN am
       22.08.2026 mit demselben Blatt und demselben Endpunkt. */
    const z2 = hoehenZuordnen([
      { geschoss: "ERDGESCHOSS", lichte_hoehe_m: 2.52, geschosshoehe_m: null,
        beleg: "lichte Hoehe 2.52 bemasst; Oeffnungsmass 2.20 an Tuer/Fenster" },
    ], ["EG"], 0, zioKoten);
    if (z2.zuordnung.EG.lichte_hoehe !== 2.52) {
      f.push("Ein Beleg, der eine Tür nennt, darf die richtige Zahl nicht verwerfen");
    }
    // Ein Widerspruch zwischen Maß und Koten wird gemeldet, nicht geglättet.
    const z3 = hoehenZuordnen(
      [{ geschoss: "EG", lichte_hoehe_m: null, geschosshoehe_m: 1.9, beleg: "x" }],
      ["EG"], 0, zioKoten);
    if (!(z3.befunde || []).some(function (b) { return b.art === "widerspruch"; })) {
      f.push("Ein unplausibler Abstand zu den Koten muss gemeldet werden");
    }
    if (z3.vollstaendig) f.push("Bei Widerspruch darf keine lichte Höhe entstehen");

    /* --- Die Einordnung der Koten darf nicht mehr tragen ----------------
       GEMESSEN am 23.08.2026, sechs echte Läufe desselben Blattes gegen den
       Live-Endpunkt: die Zahlen kamen jedes Mal gleich, die Einordnung
       „okff"/„rohdecke"/„unklar" kein einziges Mal. In zwei von sechs Läufen
       stand danach die Ersatzannahme 2,60 m statt der bemaßten 2,32 m im
       Kellergeschoss. Hier stehen die Koten desselben Blattes einmal so, wie
       Lauf 1 sie meldete (fast alles „unklar"), und einmal so, wie Lauf 2 sie
       meldete (die Rohdecken als „okff"). Beide müssen dasselbe ergeben. */
    const kotenLauf1 = [
      { geschoss: "KG", wert_m: -2.73, bezug: "unklar", text: "-2,73" },
      { geschoss: "KG", wert_m: -2.88, bezug: "unklar", text: "-2,88" },
      { geschoss: "EG", wert_m: 0, bezug: "okff", text: "+-0,00" },
      { geschoss: "EG", wert_m: -0.19, bezug: "unklar", text: "-0,19" },
      { geschoss: "", wert_m: -0.15, bezug: "gelaende", text: "-0,15" },
      { geschoss: "OG", wert_m: 2.91, bezug: "rohdecke", text: "+2,91" },
      { geschoss: "OG", wert_m: 2.74, bezug: "okff", text: "+2,74" },
      { geschoss: "Spitzboden", wert_m: 5.65, bezug: "unklar", text: "+5,65" },
      { geschoss: "OG", wert_m: 6.02, bezug: "unklar", text: "+6,02" },
      { geschoss: "", wert_m: 8.94, bezug: "first", text: "+8,94" },
    ];
    const kotenLauf2 = kotenLauf1.map(function (k) {
      return Object.assign({}, k, { bezug: k.bezug === "gelaende" || k.bezug === "first"
        ? k.bezug : (k.wert_m === -2.88 || k.wert_m === 5.65 ? "okff" : "unklar") });
    });
    [["Lauf 1", kotenLauf1], ["Lauf 2", kotenLauf2]].forEach(function (paar) {
      const g = geschosshoehenAusKoten(paar[1]);
      const s = { KG: 2.73, EG: 2.91, OG: 2.74 };
      Object.keys(s).forEach(function (k) {
        if (Math.abs(zahl(g[k] && g[k].geschosshoehe, 0) - s[k]) > 0.001) {
          f.push("Koten " + paar[0] + ": Geschosshöhe " + k + " muss " + s[k]
            + " sein, ist " + (g[k] && g[k].geschosshoehe));
        }
      });
    });
    /* Dasselbe Blatt, beide Kotenfassungen, ganze Kette: dieselben Höhen. */
    const kette = [kotenLauf1, kotenLauf2].map(function (kk) {
      const zz = hoehenZuordnen(zioRoh, ["KG", "EG", "OG"], 0, kk);
      const vv = hoehenErgaenzen(zz.zuordnung, ["KG", "EG", "OG"], {});
      return ["KG", "EG", "OG"].map(function (k) {
        return vv.zuordnung[k].lichte_hoehe; }).join("/");
    });
    if (kette[0] !== "2.32/2.52/2.52" || kette[1] !== "2.32/2.52/2.52") {
      f.push("Zwei Lesungen derselben Koten müssen dieselben Höhen ergeben: "
        + kette.join(" gegen "));
    }

    /* --- Lichte Höhe größer als Geschosshöhe ist unmöglich -------------- */
    const un = hoehenGegenprobe({ KG: { lichte_hoehe: 2.6, geschosshoehe: 2.32 } },
      [], ["KG"]);
    if (!un.befunde.some(function (b) { return b.art === "unmoeglich"; })) {
      f.push("Lichte Höhe über der Geschosshöhe muss als unmöglich gemeldet werden");
    }
    /* Und sie darf gar nicht erst entstehen: Maß im Feld Geschosshöhe, keine
       Koten, kein Deckenmaß — der Rückfall 2,60 passt nicht darunter. */
    const tausch = hoehenErgaenzen(hoehenZuordnen(
      [{ geschoss: "KG", lichte_hoehe_m: null, geschosshoehe_m: 2.32, beleg: "x" }],
      ["KG"], 0, []).zuordnung, ["KG"], {});
    if (Math.abs(zahl(tausch.zuordnung.KG.lichte_hoehe, 0) - 2.32) > 0.001) {
      f.push("Ohne Koten muss das gemessene Maß 2,32 die Annahme 2,60 schlagen, ist "
        + tausch.zuordnung.KG.lichte_hoehe);
    }
    if (tausch.zuordnung.KG.angenommen) {
      f.push("Ein Maß vom Blatt ist keine Annahme");
    }
    /* Steht die Geschosshöhe dagegen belegt und knapp da, wird der Rückfall
       gedeckelt statt darüber gesetzt. */
    const deckel = hoehenErgaenzen({ KG: { lichte_hoehe: null, geschosshoehe: 2.5 } },
      ["KG"], {});
    if (deckel.zuordnung.KG.lichte_hoehe >= 2.5) {
      f.push("Der Rückfall darf die belegte Geschosshöhe nicht erreichen");
    }
    if (!deckel.zuordnung.KG.angenommen) f.push("Der gedeckelte Rückfall bleibt Annahme");
    /* Eine belegte Geschosshöhe trägt den Vorschlag: Geschosshöhe minus
       übliches Deckenpaket, mit der Herkunft im Klartext — nicht der nackte
       Rückfallwert. Abnahme-Befund vom 24.08.2026: „Geschosshöhen aus dem
       Schnitt" gelesen, und der Vorschlag behauptete trotzdem, der Plan gebe
       nichts her. */
    const herl = hoehenErgaenzen({ OG: { lichte_hoehe: null, geschosshoehe: 2.91,
      quelle: "Schnitt" } }, ["OG"], {});
    if (Math.abs(zahl(herl.zuordnung.OG.lichte_hoehe, 0) - 2.66) > 0.001) {
      f.push("Aus Geschosshöhe 2,91 muss der Vorschlag 2,66 werden (minus "
        + "übliches Deckenpaket 0,25), ist " + herl.zuordnung.OG.lichte_hoehe);
    }
    if (!/Geschosshöhe 2,91/.test(herl.zuordnung.OG.quelle)
        || !/Deckenpaket/.test(herl.zuordnung.OG.quelle)) {
      f.push("Der abgeleitete Vorschlag muss seine Herkunft nennen "
        + "(Geschosshöhe und Deckenpaket), sagt aber: "
        + herl.zuordnung.OG.quelle);
    }
    if (!herl.zuordnung.OG.angenommen || !herl.zuordnung.OG.aus_geschosshoehe) {
      f.push("Der abgeleitete Vorschlag bleibt Annahme und traegt "
        + "aus_geschosshoehe");
    }
    /* Ohne jede Geschosshöhe bleibt der benannte Rückfallwert. */
    const nacktR = hoehenErgaenzen({}, ["DG"], {});
    if (nacktR.zuordnung.DG.lichte_hoehe !== HOEHE_RUECKFALL
        || nacktR.zuordnung.DG.aus_geschosshoehe) {
      f.push("Ohne Geschosshöhe muss der Rückfallwert ohne Herleitung stehen");
    }

    /* --- Gegenprobe: der stille halbe Meter ----------------------------
       Jede Höhe des gemessenen Blattes um 0,50 m kleiner. Bisher ging das
       ohne eine einzige zusätzliche Zeile durch. */
    const gutStand = hoehenErgaenzen(
      hoehenZuordnen(zioRoh, ["KG", "EG", "OG"], 0, zioKoten).zuordnung,
      ["KG", "EG", "OG"], {}).zuordnung;
    const gpGut = hoehenGegenprobe(gutStand, zioKoten, ["KG", "EG", "OG"]);
    if (gpGut.befunde.length) {
      f.push("Der saubere Stand darf keinen Höhenbefund erzeugen: "
        + gpGut.befunde.map(function (b) { return b.kennung; }).join(", "));
    }
    if (!gpGut.moeglich) f.push("Mit Koten muss die Höhengegenprobe möglich sein");
    const kleiner = {};
    ["KG", "EG", "OG"].forEach(function (k) {
      kleiner[k] = rnd(gutStand[k].lichte_hoehe - 0.5, 2); });
    const gpBoese = hoehenGegenprobe(
      hoehenErgaenzen(hoehenZuordnen(zioRoh, ["KG", "EG", "OG"], 0, zioKoten).zuordnung,
        ["KG", "EG", "OG"], kleiner).zuordnung, zioKoten, ["KG", "EG", "OG"]);
    if (gpBoese.befunde.length < 4) {
      f.push("Ein halber Meter weniger je Geschoss muss anschlagen, tut es aber "
        + gpBoese.befunde.length + "-mal");
    }
    if (!gpBoese.befunde.some(function (b) { return b.kennung === "hoehe_bauwerk"; })) {
      f.push("Die Summe der Höhen muss gegen die Bauwerkshöhe fallen");
    }
    /* Ohne Koten UND ohne belegte Geschosshöhe gibt es nichts, wogegen sich
       prüfen ließe — und das muss die Gegenprobe sagen, statt zu schweigen. */
    const nackt = { KG: { lichte_hoehe: 2.6, geschosshoehe: null },
                    EG: { lichte_hoehe: 2.6, geschosshoehe: null } };
    if (hoehenGegenprobe(nackt, [], ["KG", "EG"]).moeglich) {
      f.push("Ohne Höhenkoten darf die Gegenprobe sich nicht für möglich halten");
    }
    /* Die Spanne selbst: unterste Fußbodenebene bis über das oberste
       beheizte Geschoss, die Traufe +6,02 zählt nicht mit. */
    const sp = bauwerksSpanne(kotenLauf1, 3);
    if (!sp || Math.abs(sp.hoehe - 8.38) > 0.001) {
      f.push("Bauwerksspanne muss 8,38 m sein, ist " + (sp && sp.hoehe));
    }
    if (bauwerksSpanne(kotenLauf1, 9)) {
      f.push("Für mehr Geschosse als Ebenen darf es keine Spanne geben");
    }

    // --- Bauteile ------------------------------------------------------
    // Eckzimmer 4,20 x 3,60, Höhe 2,75, zwei Außenwände, ein Fenster
    const r1 = bauteileFuerRaum(
      { name: "Wohnzimmer", A: 15.12, breite_m: 4.2, tiefe_m: 3.6, h: 2.75,
        aussenwaende: 2, fenster: 1 }, { fenstergroesse: 2.9 });
    const w1 = r1.bauteile.find(function (x) { return x.art === "aussenwand"; });
    // (4,20 + 3,60) * 2,75 - 2,90 = 18,55
    if (!w1 || Math.abs(w1.A - 18.55) > 0.01) {
      f.push("Außenwandfläche Eckzimmer: " + (w1 && w1.A) + " statt 18,55");
    }
    if (!w1.sicher) f.push("Bei angeschriebenen Abmessungen ist die Wand belegt");
    const fe = r1.bauteile.find(function (x) { return x.art === "fenster"; });
    if (!fe || Math.abs(fe.A - 2.9) > 0.01) f.push("Fensterfläche falsch");
    if (fe.sicher) f.push("Eine angesetzte Fenstergröße ist nie belegt");

    // Nur Fläche bekannt: Näherung, aber gekennzeichnet
    const r2 = bauteileFuerRaum({ name: "Bad", A: 16, h: 2.5, aussenwaende: 1, fenster: 0 },
                                {});
    const w2 = r2.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!w2 || Math.abs(w2.A - 10) > 0.01) f.push("Näherung Quadrat: " + (w2 && w2.A));
    if (w2.sicher) f.push("Eine Näherung darf nicht als belegt gelten");
    if (r2.genauigkeit !== "aus der Fläche angenähert") f.push("Genauigkeit falsch benannt");

    /* Innenliegender Raum ohne Bezug nach außen: er bekommt keine Außenwand,
       und er wirft hier auch KEINE Frage mehr auf. Beurteilt wird die Lage an
       genau einer Stelle, in innenraumZulaessig() und im Zähler Z6 des
       Kontrollblatts; die Frage hier war die zweite Stimme, die dasselbe
       anders sagte. Siehe den Vermerk in bauteileFuerRaum(). */
    const r3 = bauteileFuerRaum({ name: "Flur", A: 6, h: 2.5, aussenwaende: 0 }, {});
    if (r3.bauteile.length) f.push("Innenliegender Raum bekommt keine Außenwand");
    if (r3.fragen.length) {
      f.push("Die Lage innenliegender Räume wird im Kontrollblatt beurteilt, "
        + "nicht hier: " + r3.fragen.join(" | "));
    }
    if (!innenraumZulaessig({ name: "Flur", aussenwaende: 0 }, ["eg"]).ja) {
      f.push("Dieselbe Lage muss innenraumZulaessig als zulässig erkennen");
    }

    // Fehlende Höhe: keine Bauteile, sondern eine Frage
    const r4 = bauteileFuerRaum({ name: "X", A: 20, aussenwaende: 2 }, {});
    if (r4.bauteile.length || !r4.fragen.length) f.push("Ohne Höhe kein Bauteil");

    /* --- Ohne Flaeche, aber mit gelesener Fassadenlaenge --------------
     * Kundenbefund Soethe, 26.08.2026: 4,85 m Fassade und 2,60 m Hoehe sind
     * eine fertige Aussenwand. Sie darf nicht an der fehlenden Grundflaeche
     * sterben, und Boden und Decke duerfen trotzdem nicht entstehen. */
    const k1 = bauteileFuerRaum(
      { name: "Kind 1", art: "wohnen", h: 2.6, aussenwaende: 1, fenster: 1,
        aussenwand_m: 4.85, aussenwand_quelle: "bemasst" },
      { unten: { name: "Bodenplatte", grenzt_an: { typ: "erdreich" } },
        oben: { name: "Dach", grenzt_an: { typ: "aussen" } } });
    const k1w = k1.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!k1w) f.push("Ohne Flaeche, aber mit gelesener Laenge muss eine Wand entstehen");
    if (k1w && Math.abs(k1w.A - (4.85 * 2.6 - 1.6)) > 0.02) {
      f.push("Die Wandflaeche kommt aus gelesener Laenge mal Hoehe abzueglich Fenster");
    }
    if (k1.bauteile.some(function (x) { return x.art === "boden" || x.art === "decke"; })) {
      f.push("Ohne Flaeche darf kein Boden und keine Decke entstehen");
    }
    if (!k1.fragen.some(function (x) { return /fehlt die Fläche/.test(x); })) {
      f.push("Die fehlende Flaeche bleibt trotzdem eine Frage");
    }
    if (k1.genauigkeit !== "gemessen") f.push("Eine gelesene Laenge ist gemessen");
    /* Ohne Flaeche UND ohne gelesene Laenge bleibt es beim Ausstieg. */
    const k2 = bauteileFuerRaum({ name: "Ohne", h: 2.6, aussenwaende: 1 }, {});
    if (k2.bauteile.length || !k2.fragen.length) {
      f.push("Ohne Flaeche und ohne Laenge entsteht kein Bauteil, sondern eine Frage");
    }

    /* --- Umfang ohne Empfaenger --------------------------------------
     * Derselbe Kundenbefund: 38,60 m gelesen, kein Raum mit Flaeche. Bis
     * dahin kehrte wandlaengenJeGeschoss still zurueck. */
    const uo = wandlaengenJeGeschoss(
      [{ id: "a", name: "Diele", art: "flur" }, { id: "b", name: "WC", art: "wc" }],
      { kontur: { A: 88.5, U: 38.6, quelle: "Außenbemaßung ERDGESCHOSS" } });
    if (uo.art !== "ohne_empfaenger") f.push("Ohne Empfaenger muss die Art das sagen");
    if (Math.abs(uo.U_soll - 38.6) > 0.01) f.push("Der gelesene Umfang muss stehen bleiben");
    if (!uo.befund || !/100 Prozent/.test(uo.befund)) {
      f.push("Der Befund muss sagen, dass die ganze Fassade keinem Raum gehoert");
    }
    if (!uo.abhilfe) f.push("Und er muss sagen, was zu tun ist");
    /* Ein Raum mit gelesener Fassadenlaenge zaehlt mit, auch ohne Flaeche. */
    const uz = wandlaengenJeGeschoss(
      [{ id: "k", name: "Kind 1", art: "wohnen", aussenwaende: 1, aussenwand_m: 4.85 }],
      { kontur: { A: 88.5, U: 38.6, quelle: "Probe" } });
    if (Math.abs(uz.U_roh - 4.85) > 0.01) f.push("Seine Laenge geht als feste Laenge ein");
    if (/kein einziger Raum/.test(uz.befund || "")) {
      f.push("Ein Raum mit gelesener Laenge ist kein leeres Geschoss");
    }
    /* Alle Laengen fest, aber die Kontur sagt mehr: Fehlbetrag benennen,
       ohne das gemessene Mass zu ueberschreiben. */
    if (!uz.befund || !/Prozent/.test(uz.befund) || !uz.abhilfe) {
      f.push("Ein Fehlbetrag ohne Empfaenger muss benannt werden");
    }
    if (Math.abs(uz.U_soll - 38.6) > 0.01) f.push("Der gelesene Umfang bleibt stehen");
    /* Deckt die feste Laenge den Umfang, gibt es nichts zu melden. */
    const uv = wandlaengenJeGeschoss(
      [{ id: "k", art: "wohnen", aussenwaende: 1, aussenwand_m: 38.6 }],
      { kontur: { A: 88.5, U: 38.6, quelle: "Probe" } });
    if (uv.befund) f.push("Ohne Fehlbetrag entsteht kein Befund");

    // Widerspruch zwischen Abmessungen und Fläche
    const r5 = bauteileFuerRaum(
      { name: "Y", A: 30, breite_m: 4, tiefe_m: 3, h: 2.5, aussenwaende: 1 }, {});
    if (!r5.fragen.length) f.push("Abmessungen gegen Fläche: Widerspruch muss auffallen");

    // Decke gegen unbeheizt
    const r6 = bauteileFuerRaum({ name: "Z", A: 20, h: 2.5, aussenwaende: 0 },
      { oben: { name: "Oberste Geschossdecke", grenzt_an: { typ: "zone", ref: "dach" } } });
    const d6 = r6.bauteile.find(function (x) { return x.art === "decke"; });
    if (!d6 || d6.A !== 20) f.push("Decke gegen unbeheizt fehlt");

    // --- Rückfallhöhe ------------------------------------------------
    const e1 = hoehenErgaenzen({ EG: { lichte_hoehe: 2.75 } }, ["EG", "OG"]);
    if (e1.zuordnung.EG.lichte_hoehe !== 2.75) f.push("Belegte Höhe darf nicht ersetzt werden");
    if (e1.zuordnung.OG.lichte_hoehe !== 2.6) f.push("Rückfall muss 2,60 m sein");
    if (!e1.zuordnung.OG.angenommen) f.push("Rückfallhöhe muss als Annahme gelten");
    if (e1.angenommen.join() !== "OG") f.push("Angenommene Geschosse müssen genannt werden");
    const e2 = hoehenErgaenzen({}, ["EG"], { EG: 3.1 });
    if (e2.zuordnung.EG.lichte_hoehe !== 3.1) f.push("Eigene Eingabe hat Vorrang");
    if (e2.zuordnung.EG.angenommen) f.push("Eigene Eingabe ist keine Annahme");
    const e3 = hoehenErgaenzen({ EG: { lichte_hoehe: 2.75 } }, ["EG"], { EG: 2.9 });
    if (e3.zuordnung.EG.lichte_hoehe !== 2.9) f.push("Eingabe schlägt auch den Schnitt");

    // --- Außenwände erschließen ---------------------------------------
    const a1 = bauteileFuerRaum({ name: "A", A: 20, h: 2.5, aussenwaende: 2, fenster: 1 }, {});
    if (a1.aussenwaende.anzahl !== 2 || !a1.aussenwaende.sicher) {
      f.push("Gemeldete Anzahl muss gelten und sicher sein");
    }
    // Fenster ohne Außenwand ist ein Widerspruch: das Fenster gewinnt
    const a2 = bauteileFuerRaum({ name: "B", A: 20, h: 2.5, aussenwaende: 0, fenster: 2 }, {});
    if (a2.aussenwaende.anzahl !== 1) f.push("Fenster ohne Außenwand: Fenster muss gelten");
    if (a2.aussenwaende.sicher) f.push("Der Widerspruchsfall ist nicht sicher");
    /* DER EINGANGSRAUM. Das Modell liest die Aussenwaende je Raum, und diese
       Zahl streut. Kommt fuer die Diele im Erdgeschoss eine Null zurueck,
       faellt ihre Wandflaeche aus der Rechnung -- an keiner Zahl auffaellig.
       Durch den Eingangsraum geht man ins Haus; ohne Aussenwand kaeme
       niemand hinein. Geprueft werden beide Richtungen: die Diele im EG wird
       gerettet, die Diele im OG nicht, und ein Flur bleibt ein Flur. */
    const e_eg = bauteileFuerRaum(
      { name: "DIELE", art: "flur", geschoss: "EG", A: 12.1, h: 2.2, aussenwaende: 0 }, {});
    if (e_eg.aussenwaende.anzahl !== 1) {
      f.push("Die Diele im Erdgeschoss muss eine Aussenwand behalten, hat "
        + e_eg.aussenwaende.anzahl);
    }
    if (e_eg.aussenwaende.sicher) f.push("Der geretteten Aussenwand fehlt der Vorbehalt");
    if (!/Haustür/.test(e_eg.aussenwaende.quelle)) {
      f.push("Die Begruendung muss die Haustuer nennen: " + e_eg.aussenwaende.quelle);
    }
    const e_og = bauteileFuerRaum(
      { name: "DIELE", art: "flur", geschoss: "OG", A: 10, h: 2.5, aussenwaende: 0 }, {});
    if (e_og.aussenwaende.anzahl !== 0) {
      f.push("Eine Diele im Obergeschoss ist kein Hauseingang");
    }
    if (eingangsraum({ name: "FLUR", geschoss: "EG" }).ja) {
      f.push("Ein blosser Flur ist noch kein Eingangsraum");
    }
    if (!eingangsraum({ name: "Windfang", geschoss: "EG" }).ja) {
      f.push("Der Windfang im EG ist ein Eingangsraum");
    }
    if (innenraumZulaessig({ name: "DIELE", geschoss: "EG", aussenwaende: 0 }, ["EG", "OG"]).ja) {
      f.push("Die Diele im EG darf nicht als innenliegend durchgehen");
    }
    /* Die Haustuer als Bauteil: eigene Flaeche, und die Wand gibt sie ab. */
    const e_bt = bauteileFuerRaum(
      { name: "DIELE", art: "flur", geschoss: "EG", A: 12.1, h: 2.2, aussenwaende: 1 },
      { tuer: { A: 2.16, herkunft: "Probe" } });
    const tuer = e_bt.bauteile.find(function (x) { return x.art === "tuer"; });
    const wandT = e_bt.bauteile.find(function (x) { return x.art === "aussenwand"; });
    const ohneT = bauteileFuerRaum(
      { name: "DIELE", art: "flur", geschoss: "EG", A: 12.1, h: 2.2, aussenwaende: 1 }, {});
    const wandO = ohneT.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!tuer || tuer.A !== 2.16) f.push("Die Haustuer muss als Bauteil entstehen");
    if (!wandT || !wandO || Math.abs((wandO.A - wandT.A) - 2.16) > 0.011) {
      f.push("Die Tuerflaeche muss der Wand abgehen: " + (wandO && wandO.A)
        + " gegen " + (wandT && wandT.A));
    }
    /* Die Wand eines Kellergeschosses grenzt an das Erdreich, wenn der
       Aufrufer es so sagt -- und nur dann. */
    const kw = bauteileFuerRaum({ name: "KELLER", A: 18, h: 2.6, aussenwaende: 2 },
      { wand: { name: "Kellerwand gegen Erdreich", kat: "erdreich",
                grenzt_an: { typ: "erdreich" }, herkunft: "Probe" } });
    const kwB = kw.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!kwB || kwB.grenzt_an.typ !== "erdreich" || kwB.kat !== "erdreich") {
      f.push("Die Kellerwand muss an das Erdreich grenzen");
    }
    if (kwB && kwB.sicher) f.push("Eine angenommene Lage darf nicht sicher heissen");
    const nw = bauteileFuerRaum({ name: "Wohnen", A: 18, h: 2.6, aussenwaende: 2 }, {});
    const nwB = nw.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!nwB || nwB.grenzt_an.typ !== "aussen") {
      f.push("Ohne Angabe bleibt die Wand an der Aussenluft");
    }
    // Innenliegender Raum ohne Fenster bleibt ohne Außenwand
    const a3 = bauteileFuerRaum({ name: "Flur", art: "flur", A: 6, h: 2.5 }, {});
    if (a3.aussenwaende.anzahl !== 0) f.push("Flur ohne Angabe bleibt innen");
    // Wohnraum ohne jede Angabe bekommt eine, nicht zwei
    const a4 = bauteileFuerRaum({ name: "Wohnen", art: "wohnen", A: 20, h: 2.5 }, {});
    if (a4.aussenwaende.anzahl !== 1) f.push("Ohne Angabe genau eine Außenwand");
    if (a4.aussenwaende.sicher) f.push("Eine Annahme ist nicht sicher");
    const w4 = a4.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!w4 || w4.sicher) f.push("Wand aus erschlossener Lage darf nicht belegt sein");
    if (!/angenommen/.test(w4.herkunft)) f.push("Die Herkunft muss die Annahme nennen");
    // Bad mit Fenster liegt nicht innen
    const a5 = bauteileFuerRaum({ name: "Bad", art: "bad", A: 5, h: 2.5, fenster: 1 }, {});
    if (a5.aussenwaende.anzahl !== 1) f.push("Bad mit Fenster hat eine Außenwand");

    // --- Fensterloser Raum: Regelfall oder Befund? --------------------
    const of = [
      [{ name: "OG FLUR", art: "flur" }, true],
      [{ name: "EG DIELE", art: "flur" }, true],
      [{ name: "KG KELLER", art: "wohnen" }, true],   // Art falsch, Name trägt
      [{ name: "Gäste-WC", art: "wc" }, true],
      [{ name: "Treppenhaus", art: "treppenhaus" }, true],
      [{ name: "Hauswirtschaftsraum", art: "wohnen" }, true],
      [{ name: "GAST / ARBEITEN", art: "wohnen" }, false],
      [{ name: "Wohnzimmer", art: "wohnen" }, false],
      [{ name: "Küche", art: "kueche" }, false],
      [{ name: "Bad", art: "bad" }, false],
    ];
    of.forEach(function (x) {
      const erg = ohneFensterUeblich(x[0]);
      if (erg.ja !== x[1]) {
        f.push("Fensterlos „" + x[0].name + "“: " + erg.ja + " statt " + x[1]);
      }
      if (erg.ja && !erg.grund) f.push("Ein Regelfall muss begründet sein");
    });

    // --- Geschossfolge --------------------------------------------------
    const g1 = geschossfolge(["KG", "EG", "OG", "DG"]);
    if (!g1.pruefbar || !g1.ok) f.push("KG/EG/OG/DG ist eine lückenlose Folge");
    if (g1.folge.length !== 4) f.push("Alle vier Ebenen müssen in der Folge stehen");
    const g2 = geschossfolge(["EG", "2.OG"]);
    if (g2.ok || g2.luecken.length !== 1 || g2.luecken[0] !== 1) {
      f.push("Zwischen EG und 2.OG fehlt das 1.OG");
    }
    const g3 = geschossfolge(["EG", "Anbau"]);
    if (g3.pruefbar) f.push("Eine ungedeutete Bezeichnung macht die Folge unprüfbar");
    if (g3.unklar.length !== 1) f.push("Die ungedeutete Bezeichnung muss genannt werden");
    const g4 = geschossfolge(["EG"]);
    if (g4.pruefbar) f.push("Ein einzelnes Geschoss ist keine prüfbare Folge");
    const g5 = geschossfolge(["EG", "1.OG", "1.OG"]);
    if (g5.ok || g5.doppelt.indexOf("1.OG") < 0) f.push("Ein doppeltes Geschoss muss auffallen");
    const g6 = geschossfolge(["KG", "EG"]);
    if (!g6.ok || !g6.pruefbar) f.push("KG/EG ist lückenlos");

    /* --- Rang der Geschosse ---------------------------------------------
       Das Erdgeschoss hat den Rang 0. Wer ihn mit `rang || 5` gegen einen
       Rückfall absichert, bekommt für das EG die 5 und sortiert es damit
       ÜBER das Obergeschoss. Gemessen am Blatt Dumach 1: die Kellerdecke
       landete auf dem OG, und die zwölf Räume des Erdgeschosses hatten gar
       kein Bauteil nach unten. Deshalb wird der Rang hier über rangVon
       geholt und die Falle festgenagelt. */
    if (rangVon("eg") !== 0) f.push("Das Erdgeschoss hat den Rang 0");
    if (!(rangVon("eg") < rangVon("og"))) f.push("EG liegt unter OG");
    if (!(rangVon("kg") < rangVon("eg"))) f.push("KG liegt unter EG");
    if (!(rangVon("og") < rangVon("dg"))) f.push("OG liegt unter DG");
    if (rangVon("Anbau") !== 5) f.push("Eine ungedeutete Bezeichnung bekommt den Rang 5");

    /* --- Kellergeschoss heißt Rang unter null ----------------------------
       An diesem Vorzeichen entscheidet bauteileErgaenzen(), was die Fläche
       nach unten ist: rang < 0 heißt, das unterste erfasste Geschoss ist
       SELBST der Keller — Bodenplatte gegen das Erdreich, keine Kellerzone
       darunter. Erst rang >= 0 heißt, unter dem untersten erfassten
       Geschoss kann ein nicht erfasster Keller liegen — Kellerdecke gegen
       die Zone. GEMESSEN am Blatt „BV 2-0887 Ziolkowski“ (KG, EG, OG):
       beide KG-Räume bekamen eine „Kellerdecke“ gegen einen erfundenen
       unbeheizten Keller statt der Bodenplatte gegen das Erdreich. */
    ["KG", "UG", "Kellergeschoss", "Untergeschoss", "Souterrain", "Keller"]
      .forEach(function (t) {
        const g = geschossAusText(t);
        if (!g || !(g.rang < 0)) {
          f.push("„" + t + "“ ist ein Kellergeschoss und braucht Rang < 0, ist: "
            + (g ? g.rang : "ungedeutet"));
        }
      });
    ["EG", "Erdgeschoss", "1.OG", "OG", "DG"].forEach(function (t) {
      const g = geschossAusText(t);
      if (!g || g.rang < 0) {
        f.push("„" + t + "“ liegt nicht unter dem Erdgeschoss, ist: "
          + (g ? g.rang : "ungedeutet"));
      }
    });
    /* „Kellerdecke“ ist ein Bauteil- und kein Geschossname. Würde sie als
       Kellergeschoss gedeutet, kippte jeder Text, in dem sie vorkommt, das
       Geschoss in den Keller. */
    if (geschossAusText("Kellerdecke") !== null) {
      f.push("„Kellerdecke“ darf nicht als Geschoss gedeutet werden");
    }

    /* DAS STAFFELGESCHOSS IST DAS DACHGESCHOSS.
       Beide Wörter stehen auf Blättern nebeneinander für DIESELBE oberste,
       zurückgesetzte Ebene: „zurückgesetztes Dachgeschoss/Staffelgeschoss".
       Ohne die gemeinsame Deutung zählte diese eine Schreibweise als zwei
       Ebenen, und das Kontrollblatt verlangte ein Geschoss, das es nicht
       gibt. */
    ["Staffelgeschoss", "STAFFELGESCHOSS", "zurückgesetztes Staffelgeschoss"]
      .forEach(function (t) {
        const g = geschossAusText(t);
        if (!g || g.kuerzel !== "DG") {
          f.push("„" + t + "“ muss als Dachgeschoss gedeutet werden, ist: "
            + (g ? g.kuerzel : "ungedeutet"));
        }
      });
    if (geschossAusText("Dachgeschoss").kuerzel
        !== geschossAusText("Staffelgeschoss").kuerzel) {
      f.push("Dachgeschoss und Staffelgeschoss müssen dasselbe Geschoss sein");
    }

    /* --- Raum ohne Außenwand ---------------------------------------------
       Geprüft wird jetzt nur noch die senkrechte Hülle. Dass die Antwort
       NICHT mehr vom Geschoss abhängt, ist die eigentliche Änderung: ein
       innenliegender Flur hat auch im obersten Geschoss keine Außenwand.
       Was er dort zusätzlich hat — eine Decke gegen kalt — beantwortet
       geschossabschluss() und der Zähler Z6 des Kontrollblatts, und zwar für
       ALLE Räume des Randgeschosses, auch für die mit Außenwand. */
    const alle3 = ["eg", "og", "dg"];
    if (!innenraumZulaessig({ art: "flur", geschoss: "og" }, alle3).ja) {
      f.push("Ein Flur im Zwischengeschoss darf ohne Außenwand sein");
    }
    if (!innenraumZulaessig({ art: "flur", geschoss: "dg" }, alle3).ja) {
      f.push("Auch im obersten Geschoss hat ein innenliegender Flur keine Außenwand");
    }
    if (!innenraumZulaessig({ art: "flur", geschoss: "eg" }, alle3).ja) {
      f.push("Auch im untersten Geschoss hat ein innenliegender Flur keine Außenwand");
    }
    if (innenraumZulaessig({ art: "wohnen", geschoss: "og" }, alle3).ja) {
      f.push("Ein Wohnraum ohne Außenwand bleibt ein Fehler");
    }
    if (!innenraumZulaessig({ art: "flur", geschoss: "og" }, ["eg", "og"]).ja) {
      f.push("Auch bei zwei Geschossen hat ein Flur keine Außenwand");
    }
    if (!innenraumZulaessig({ art: "flur", geschoss: "og" }, alle3).grund) {
      f.push("Auch der zulässige Fall muss begründet sein");
    }
    /* Der Plan geht jeder Deutung vor, in beide Richtungen. */
    if (!innenraumZulaessig({ art: "wohnen", geschoss: "og", aussenwaende: 0 },
        alle3).ja) {
      f.push("Meldet der Plan null Außenwände, gilt das auch für einen Wohnraum");
    }
    if (innenraumZulaessig({ art: "flur", geschoss: "og", aussenwaende: 2 },
        alle3).ja) {
      f.push("Meldet der Plan zwei Außenwände, ist der Flur nicht innenliegend");
    }

    /* --- Abschluss nach oben und unten ---------------------------------- */
    const ab1 = geschossabschluss("kg", ["kg", "eg", "og"]);
    if (!ab1.unten || ab1.oben) f.push("Das unterste Geschoss schließt nach unten ab");
    const ab2 = geschossabschluss("og", ["kg", "eg", "og"]);
    if (ab2.unten || !ab2.oben) f.push("Das oberste Geschoss schließt nach oben ab");
    const ab3 = geschossabschluss("eg", ["kg", "eg", "og"]);
    if (ab3.unten || ab3.oben) f.push("Ein Zwischengeschoss schließt nirgends ab");
    const ab4 = geschossabschluss("eg", ["eg"]);
    if (!ab4.unten || !ab4.oben || !ab4.allein) {
      f.push("Ein einziges Geschoss schließt nach oben UND nach unten ab");
    }
    if (geschossabschluss("eg", []).pruefbar) {
      f.push("Ohne Geschossliste ist der Abschluss nicht prüfbar");
    }

    const gs = ["dg", "og", "eg", "kg"].slice()
      .sort(function (a, b) { return rangVon(a) - rangVon(b); });
    if (gs[0] !== "kg" || gs[gs.length - 1] !== "dg") {
      f.push("Sortiert nach Rang liegt kg unten und dg oben, ist: " + gs.join(","));
    }

    /* --- Umfangsabgleich je Geschoss ------------------------------------
       Gerechnet wird an dem Geschoss, an dem der Fehler aufgefallen ist:
       Kellergeschoss „BV 2-0887 Ziolkowski", zwei Räume mit 17,99 und
       21,20 m², beide mit zwei Außenwänden gemeldet, Außenkontur der
       zweiten Lesung 8,00 mal 7,00 m. */
    const kgRaeume = [
      { id: "k1", name: "KELLER", A: 17.99, h: 2.32, aussenwaende: 2, fenster: 0 },
      { id: "k2", name: "FLUR", A: 21.20, h: 2.32, aussenwaende: 2, fenster: 0 },
    ];
    const uaRoh = 2 * Math.sqrt(17.99) + 2 * Math.sqrt(21.20);
    const uaKontur = wandlaengenJeGeschoss(kgRaeume,
      { kontur: { A: 56, U: 30, quelle: "Außenbemaßung KG, 8 m mal 7 m" } });
    if (Math.abs(uaKontur.U_roh - uaRoh) > 0.02) {
      f.push("Der rohe Umfang ist die Summe der Quadratseiten, ist "
        + uaKontur.U_roh + " statt " + rnd(uaRoh, 2));
    }
    if (uaKontur.art !== "kontur") {
      f.push("56 m² Kontur fassen 39,19 m² Raumflaeche; die Kontur muss gelten, ist "
        + uaKontur.art);
    }
    if (Math.abs(uaKontur.U_soll - 30) > 0.005) {
      f.push("Der Sollumfang ist der Konturumfang 30 m, ist " + uaKontur.U_soll);
    }
    const summeKontur = Object.keys(uaKontur.je_raum)
      .reduce(function (s, k) { return s + uaKontur.je_raum[k]; }, 0);
    if (Math.abs(summeKontur - 30) > 0.05) {
      f.push("Die verteilten Laengen muessen den Umfang ergeben, sind " + rnd(summeKontur, 2));
    }
    if (!(uaKontur.je_raum.k2 > uaKontur.je_raum.k1)) {
      f.push("Der groessere Raum bekommt die groessere Wandlaenge");
    }
    /* Ohne Kontur greift die Untergrenze 4·√A_G und nur nach oben. */
    const uaOhne = wandlaengenJeGeschoss(kgRaeume, {});
    if (uaOhne.art !== "untergrenze") f.push("Ohne Kontur gilt die Untergrenze");
    if (Math.abs(uaOhne.U_soll - 4 * Math.sqrt(39.19)) > 0.02) {
      f.push("Die Untergrenze ist 4·Wurzel(A_G), ist " + uaOhne.U_soll);
    }
    if (!(uaOhne.faktor > 1)) f.push("Die Untergrenze liegt ueber der Quadratsumme");
    /* Eine Kontur, die kleiner ist als die Raeume in ihr, ist falsch gelesen. */
    const uaKlein = wandlaengenJeGeschoss(kgRaeume,
      { kontur: { A: 20, U: 18, quelle: "zu klein" } });
    if (uaKlein.art !== "untergrenze") {
      f.push("Eine Kontur kleiner als die Raumflaechen darf nicht gelten");
    }
    /* Ein Raum mit angeschriebener Breite und Tiefe bleibt unangetastet. */
    const uaFest = wandlaengenJeGeschoss([
      { id: "m1", name: "MIT MASS", A: 17.99, breite_m: 5.0, tiefe_m: 3.598,
        aussenwaende: 2, fenster: 0 },
      { id: "k2", name: "FLUR", A: 21.20, aussenwaende: 2, fenster: 0 },
    ], { kontur: { A: 56, U: 30, quelle: "Probe" } });
    if (uaFest.je_raum.m1 !== undefined) {
      f.push("Ein Raum mit angeschriebenem Mass wird nicht verschoben");
    }
    if (!(uaFest.je_raum.k2 > 0)) f.push("Der Rest wird auf die uebrigen verteilt");
    if (Math.abs(uaFest.je_raum.k2 - (30 - 8.598)) > 0.05) {
      f.push("Die feste Laenge geht vom Umfang ab, Rest ist " + uaFest.je_raum.k2);
    }
    /* Widersprechen Kontur und Raumumfänge einander zu stark, wird nichts
       verschoben, sondern berichtet: 8 m Umfang auf einer Kontur von 56 m²
       ist keine Kontur, sondern ein Ablesefehler. */
    const uaStreit = wandlaengenJeGeschoss(kgRaeume,
      { kontur: { A: 56, U: 8, quelle: "falsch gelesen" } });
    if (!uaStreit.befund) f.push("Ein Widerspruch zwischen Kontur und Raeumen wird berichtet");
    if (uaStreit.faktor !== 1) f.push("Bei Widerspruch bleibt der Faktor 1");
    if (Object.keys(uaStreit.je_raum).length) {
      f.push("Bei Widerspruch wird keine Laenge verschoben");
    }
    /* ---- DAS SCHWEIGEN, UND WAS AN SEINE STELLE TRITT ------------------
       Bis zum 23.08.2026 stand `befund` auf null, sobald die Verteilung
       glatt durchlief -- auch dann, wenn der Umfang gar nicht gemessen,
       sondern als Schranke gerechnet war. Diese vier Proben halten fest,
       dass ein nicht gemessener Umfang IMMER berichtet wird und ein
       gemessener NIE. */
    if (!uaOhne.befund) {
      f.push("Eine Untergrenze muss berichtet werden, auch wenn sie glatt verteilt");
    }
    if (uaOhne.befund && uaOhne.befund.indexOf("zu niedrig") < 0) {
      f.push("Der Befund zur Untergrenze muss die Richtung des Fehlers nennen");
    }
    if (!uaOhne.abhilfe) f.push("Zur Untergrenze gehoert eine Abhilfe");
    if (uaKontur.befund) f.push("Ein gemessener Umfang erzeugt keinen Befund");
    if (!uaKlein.befund) {
      f.push("Auch die verworfene Kontur fuehrt zu einem Befund");
    }

    /* ---- DIE HOCHRECHNUNG AUS EINEM ANDEREN GESCHOSS -------------------
       Zahlen des Blattes "BV 2-0887 Ziolkowski": das Kellergeschoss traegt
       39,19 m² Raeume in 56,00 m² Kontur. Das Erdgeschoss hat 74,72 m²
       Raumflaeche und keine brauchbare Kontur. Aus 39,19/56,00 folgt
       74,72/0,6998 = 106,77 m² und daraus 4·Wurzel(A) = 41,33 m. Von Hand
       am selben Blatt: 2·(8,00+12,50) = 41,00 m. */
    const egRaeume = [
      { id: "e1", name: "GAST / ARBEITEN", A: 12.16, aussenwaende: 2, fenster: 1 },
      { id: "e2", name: "WC", A: 2.17, aussenwaende: 1, fenster: 1 },
      { id: "e3", name: "DIELE", A: 12.10, aussenwaende: 1, fenster: 0 },
      { id: "e4", name: "KOCHEN", A: 13.41, aussenwaende: 1, fenster: 1 },
      { id: "e5", name: "ESSEN", A: 16.20, aussenwaende: 2, fenster: 2 },
      { id: "e6", name: "WOHNEN", A: 18.68, aussenwaende: 2, fenster: 1 },
    ];
    const bezugKG = { geschoss: "KG", A_kontur: 56, A_netto: 39.19 };
    const uaHoch = wandlaengenJeGeschoss(egRaeume,
      { kontur: { A: 69, U: 35, quelle: "3.50 + 8.00 / 6.00" }, bezug: bezugKG });
    if (uaHoch.art !== "hochrechnung") {
      f.push("Mit Bezugsgeschoss wird hochgerechnet, ist " + uaHoch.art);
    }
    if (Math.abs(uaHoch.U_soll - 41.33) > 0.02) {
      f.push("Die Hochrechnung ergibt 41,33 m, ist " + uaHoch.U_soll);
    }
    if (Math.abs(uaHoch.A_brutto - 106.77) > 0.02) {
      f.push("Die hochgerechnete Bruttoflaeche ist 106,77 m², ist " + uaHoch.A_brutto);
    }
    if (!(uaHoch.U_soll > 4 * Math.sqrt(74.72))) {
      f.push("Die Hochrechnung muss ueber der reinen Untergrenze liegen");
    }
    if (Math.abs(uaHoch.U_soll - 41.00) > 0.5) {
      f.push("Die Hochrechnung muss die Handrechnung 41,00 m treffen, ist "
        + uaHoch.U_soll);
    }
    if (!uaHoch.befund || uaHoch.befund.indexOf("nicht gemessen") < 0) {
      f.push("Auch die Hochrechnung wird als nicht gemessen berichtet");
    }
    /* Ein Bezugsgeschoss, dessen eigene Kontur die eigenen Raeume nicht
       fassen kann, taugt nicht als Verhaeltnis. Dann bleibt es bei der
       Untergrenze -- lieber eine bekannte Schranke als eine falsche Zahl. */
    const uaBezugFalsch = wandlaengenJeGeschoss(egRaeume,
      { kontur: null, bezug: { geschoss: "KG", A_kontur: 20, A_netto: 39.19 } });
    if (uaBezugFalsch.art !== "untergrenze") {
      f.push("Ein Bezug, dessen Kontur seine Raeume nicht fasst, gilt nicht");
    }
    /* Die eigene Kontur schlaegt jede Hochrechnung. */
    const uaEigen = wandlaengenJeGeschoss(egRaeume,
      { kontur: { A: 100, U: 41, quelle: "8,00 m mal 12,50 m" }, bezug: bezugKG });
    if (uaEigen.art !== "kontur" || Math.abs(uaEigen.U_soll - 41) > 0.005) {
      f.push("Die eigene Kontur hat Vorrang vor der Hochrechnung");
    }

    /* Die Vorgabe kommt bei bauteileFuerRaum auch an. */
    const btV = bauteileFuerRaum(
      { name: "P", A: 16, h: 2.5, aussenwaende: 1, fenster: 0 },
      { wandlaenge: 10, wandlaenge_herkunft: "Probe" });
    const wandV = btV.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!wandV || Math.abs(wandV.A - 25) > 0.01) {
      f.push("Die vorgegebene Wandlaenge muss gelten, Flaeche ist "
        + (wandV ? wandV.A : "-"));
    }
    if (!wandV || wandV.herkunft.indexOf("Probe") < 0) {
      f.push("Die Begruendung der Vorgabe steht am Bauteil");
    }
    /* Ohne Vorgabe bleibt es beim Quadrat: 1 Aussenwand, 16 m² -> 4 m. */
    const btQ = bauteileFuerRaum(
      { name: "Q", A: 16, h: 2.5, aussenwaende: 1, fenster: 0 }, {});
    const wandQ = btQ.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!wandQ || Math.abs(wandQ.A - 10) > 0.01) {
      f.push("Ohne Vorgabe bleibt das Quadrat, Flaeche ist " + (wandQ ? wandQ.A : "-"));
    }

    /* --- Der Umfang statt des Quadrats ---------------------------------
     * Geprueft wird die Kette, mit der der groesste systematische Fehler
     * dieses Werkzeugs beseitigt ist: 85,9 % der Raeume kamen ohne Breite
     * und Tiefe und wurden als Quadrat gerechnet. */

    /* Umfang und Flaeche legen das Rechteck EXAKT fest: 6 mal 4 hat 24 m²
       und 20 m Umfang, und genau das muss zurueckkommen. */
    const sU = seitenAusRaum({ A: 24, umfang_m: 20 }, null);
    if (!sU || sU.art !== "umfang"
        || Math.abs(Math.max(sU.b, sU.t) - 6) > 0.001
        || Math.abs(Math.min(sU.b, sU.t) - 4) > 0.001) {
      f.push("Aus U=20 und A=24 muss 6 mal 4 folgen, kam "
        + (sU ? rnd(sU.b, 3) + " mal " + rnd(sU.t, 3) + " (" + sU.art + ")" : "-"));
    }
    /* Und das Ergebnis ist LAENGER als das Quadrat -- die ganze Richtung
       dieser Aenderung haengt daran. Eine Aussenwand, Raumhoehe 2,5:
       Quadrat 4,90 m mal 2,5 = 12,25 m², mit Umfang 6,00 m mal 2,5 = 15 m². */
    const btU = bauteileFuerRaum(
      { name: "U", A: 24, umfang_m: 20, h: 2.5, aussenwaende: 1, fenster: 0 }, {});
    const wandU = btU.bauteile.find(function (x) { return x.art === "aussenwand"; });
    const btUo = bauteileFuerRaum(
      { name: "U", A: 24, h: 2.5, aussenwaende: 1, fenster: 0 }, {});
    const wandUo = btUo.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!wandU || Math.abs(wandU.A - 15) > 0.01) {
      f.push("Mit Umfang muss die Wand 15,00 m² haben, hat "
        + (wandU ? wandU.A : "-"));
    }
    if (!wandUo || !(wandUo.A < wandU.A)) {
      f.push("Das Quadrat muss WENIGER Wand ergeben als der gelesene Umfang");
    }
    if (!wandU || wandU.herkunft.indexOf("Umfang") < 0) {
      f.push("Die Herkunft muss den Umfang nennen");
    }
    /* Ein Umfang unter 4·Wurzel(A) ist unmoeglich und wird gemeldet, nicht
       stillschweigend gerechnet. 4·Wurzel(24) = 19,60. */
    const btUf = bauteileFuerRaum(
      { name: "F", A: 24, umfang_m: 15, h: 2.5, aussenwaende: 1, fenster: 0 }, {});
    if (!btUf.fragen.some(function (t) { return /kleiner als der kleinstm/.test(t); })) {
      f.push("Ein zu kleiner Umfang muss eine Frage erzeugen");
    }
    /* Mehr als vier Ecken ohne Umfang: das Rechteck ist zu kurz, und das
       steht am Bauteil. */
    const btE = bauteileFuerRaum(
      { name: "E", A: 24, ecken: 6, h: 2.5, aussenwaende: 1, fenster: 0 }, {});
    const wandE = btE.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!wandE || wandE.herkunft.indexOf("6 Ecken") < 0) {
      f.push("Sechs Ecken ohne Umfang muessen am Bauteil stehen");
    }
    /* Eine gelesene Aussenwandlaenge sticht alles: 7,00 m mal 2,5 = 17,5 m². */
    const btA = bauteileFuerRaum(
      { name: "A", A: 24, umfang_m: 20, aussenwand_m: 7, aussenwand_quelle: "bemasst",
        h: 2.5, aussenwaende: 1, fenster: 0 }, {});
    const wandA = btA.bauteile.find(function (x) { return x.art === "aussenwand"; });
    if (!wandA || Math.abs(wandA.A - 17.5) > 0.01) {
      f.push("Die gelesene Aussenwandlaenge muss gelten, Flaeche ist "
        + (wandA ? wandA.A : "-"));
    }
    if (!wandA || wandA.herkunft.indexOf("Maßkette") < 0) {
      f.push("Die Herkunft muss die Masskette nennen");
    }
    if (!wandA || wandA.sicher !== true) {
      f.push("Eine gemessene Wandlaenge ist sicher");
    }

    /* --- Das hergeleitete Seitenverhaeltnis ----------------------------- */
    const v0 = seitenverhaeltnisHerleiten([{ A: 12, breite_m: 4, tiefe_m: 3 }]);
    if (!v0 || v0.wert !== 1 || v0.art !== "quadrat") {
      f.push("Ein einziger belegter Raum reicht nicht; es bleibt beim Quadrat");
    }
    if (!v0 || v0.quelle.indexOf("Quadrat") < 0) {
      f.push("Das Quadrat muss sich als solches zu erkennen geben");
    }
    /* Median aus drei Raeumen: 4/3 = 1,333, 6/3 = 2, 5/4 = 1,25 -> 1,333. */
    const v1 = seitenverhaeltnisHerleiten([
      { A: 12, breite_m: 4, tiefe_m: 3 },
      { A: 18, breite_m: 6, tiefe_m: 3 },
      { A: 20, breite_m: 5, tiefe_m: 4 }]);
    if (!v1 || Math.abs(v1.wert - 1.333) > 0.002 || v1.art !== "raeume") {
      f.push("Der Median dreier Raeume muss 1,333 sein, ist " + (v1 ? v1.wert : "-"));
    }
    /* Auch ein Raum mit Umfang und Flaeche traegt bei: U=20, A=24 -> 6:4. */
    const v2 = seitenverhaeltnisHerleiten([
      { A: 24, umfang_m: 20 }, { A: 24, umfang_m: 20 }]);
    if (!v2 || Math.abs(v2.wert - 1.5) > 0.002) {
      f.push("Umfang und Flaeche muessen ins Verhaeltnis eingehen, kam "
        + (v2 ? v2.wert : "-"));
    }
    /* Der Formfaktor: Quadrat 4,00, Verhaeltnis 1,5625 -> 4,10. */
    if (Math.abs(formfaktor(1) - 4) > 1e-9) f.push("Der Formfaktor des Quadrats ist 4");
    if (Math.abs(formfaktor(1.5625) - 4.1) > 0.005) {
      f.push("Der Formfaktor von 1,5625 ist 4,10, ist " + rnd(formfaktor(1.5625), 3));
    }
    if (!(formfaktor(2) > formfaktor(1))) {
      f.push("Ein laenglicheres Rechteck hat mehr Umfang");
    }
    /* Und er kommt beim Rueckfall an. */
    const uaV = wandlaengenJeGeschoss(
      [{ id: "a", A: 25, aussenwaende: 1, fenster: 1 },
       { id: "b", A: 25, aussenwaende: 1, fenster: 1 }],
      { v: { wert: 1.5625, quelle: "Probe" } });
    if (uaV.art !== "untergrenze"
        || Math.abs(uaV.U_soll - 4.1 * Math.sqrt(50)) > 0.02) {
      f.push("Der Rueckfall muss mit dem Formfaktor rechnen, U ist " + uaV.U_soll);
    }
    if (!uaV.befund || uaV.befund.indexOf("Seitenverh") < 0) {
      f.push("Der Rueckfall muss sein Seitenverhaeltnis nennen");
    }

    /* --- Die Beziehung k = U/Wurzel(A) aus dem Bezugsgeschoss ------------
     * GEMESSEN am Blatt Ziolkowski: KG 39,19 m² Raumflaeche in 30,00 m
     * Konturumfang -> k = 4,792. Auf EG 74,72 m² angewandt -> 41,4 m. */
    const uaK = wandlaengenJeGeschoss(
      [{ id: "eg1", A: 37.36, aussenwaende: 2, fenster: 2 },
       { id: "eg2", A: 37.36, aussenwaende: 2, fenster: 2 }],
      { bezug: { geschoss: "KG", A_kontur: 56, A_netto: 39.19, U_kontur: 30 } });
    if (uaK.art !== "hochrechnung"
        || Math.abs(uaK.U_soll - 41.42) > 0.05) {
      f.push("Die gemessene Beziehung muss 41,4 m ergeben, ergibt " + uaK.U_soll);
    }
    if (Math.abs(uaK.formfaktor - 4.792) > 0.005) {
      f.push("k muss 4,792 sein, ist " + uaK.formfaktor);
    }
    if (!uaK.befund) f.push("Auch die Hochrechnung schweigt nicht");
    /* Ohne ueberlieferten Umfang bleibt der alte Weg ueber den Raumanteil. */
    const uaR = wandlaengenJeGeschoss(
      [{ id: "eg1", A: 37.36, aussenwaende: 2, fenster: 2 },
       { id: "eg2", A: 37.36, aussenwaende: 2, fenster: 2 }],
      { bezug: { geschoss: "KG", A_kontur: 56, A_netto: 39.19 } });
    if (uaR.art !== "hochrechnung" || Math.abs(uaR.U_soll - 41.33) > 0.05) {
      f.push("Ohne Konturumfang bleibt der Raumanteil, U ist " + uaR.U_soll);
    }
    /* Ein Raum mit gelesenem Umfang wird NICHT verteilt: seine Laenge ist
       ein Mass und geht vom Sollumfang ab. */
    const uaF = wandlaengenJeGeschoss(
      [{ id: "m", A: 24, umfang_m: 20, aussenwaende: 1, fenster: 1 },
       { id: "s", A: 25, aussenwaende: 2, fenster: 2 }],
      { kontur: { A: 56, U: 30, quelle: "Probe" } });
    if (uaF.je_raum.m !== undefined) {
      f.push("Ein Raum mit gelesenem Umfang darf nicht verteilt werden");
    }
    if (!(uaF.je_raum.s > 0)) {
      f.push("Der geschaetzte Raum bekommt den Rest");
    }
    if (Math.abs(6 + uaF.je_raum.s - 30) > 0.02) {
      f.push("Die feste Laenge geht vom Umfang ab, Rest ist " + uaF.je_raum.s);
    }
    /* Eine gelesene Aussenwandlaenge ebenso. */
    const uaW = wandlaengenJeGeschoss(
      [{ id: "m", A: 24, aussenwand_m: 9, aussenwaende: 1, fenster: 1 },
       { id: "s", A: 25, aussenwaende: 2, fenster: 2 }],
      { kontur: { A: 56, U: 30, quelle: "Probe" } });
    if (uaW.je_raum.m !== undefined || Math.abs(9 + uaW.je_raum.s - 30) > 0.02) {
      f.push("Eine gelesene Aussenwandlaenge geht unveraendert vom Umfang ab");
    }

    /* --- Taugt die Kontur? Dieselbe Schranke wie im Abgleich ---------- */
    const kb1 = konturBrauchbar(69, 74.72);      // Ziolkowski EG, echter Fall
    if (kb1.ok || kb1.art !== "zu_klein") {
      f.push("Eine Kontur kleiner als ihr Inhalt taugt nicht: " + JSON.stringify(kb1));
    }
    if (!konturBrauchbar(88.5, 74.83).ok) {
      f.push("88,50 m² ueber 74,83 m² Raumflaeche ist eine brauchbare Kontur");
    }
    if (konturBrauchbar(200, 74.83).ok) {
      f.push("Mehr als das Doppelte der Raumflaeche ist keine brauchbare Kontur");
    }
    /* Die Schranke muss dieselbe sein, an der der Abgleich entscheidet. */
    const uaEng = wandlaengenJeGeschoss(
      [{ id: "a", A: 40, aussenwaende: 2, fenster: 1 },
       { id: "b", A: 34.72, aussenwaende: 2, fenster: 1 }],
      { kontur: { A: 69, U: 35, quelle: "Probe" } });
    if (uaEng.art === "kontur") {
      f.push("Der Abgleich darf eine zu kleine Kontur nicht verwenden");
    }

    return { ok: f.length === 0, fehler: f, anzahl: 220 };
  }

  /** TAUGT DIESE AUSSENKONTUR FUER DIESES GESCHOSS?
   *
   *  Dieselbe Schranke, an der wandlaengenJeGeschoss() eine gelesene Kontur
   *  annimmt oder verwirft — nach aussen gegeben, damit ein VORSCHLAG nicht
   *  anbieten kann, was der Abgleich danach wegwirft.
   *  GEMESSEN am Blatt „BV 2-0887 Ziolkowski" (echter Lauf 26.08.2026): die
   *  zweite Lesung gab dem Erdgeschoss 11,50 mal 6,00 m, also 69,00 m² — die
   *  Raeume darin haben zusammen 74,72 m². Der Vorschlag „11,50 × 6,00 m
   *  uebernehmen" meldete danach „1 Geschoss mit den abgelesenen Aussenmassen
   *  belegt", der Umfangsabgleich verwarf die Kontur still (sie ist kleiner
   *  als ihr Inhalt), und Heizlast wie Wandflaeche blieben auf das Watt
   *  gleich. Wer eine Zahl anbietet, muss wissen, ob sie ankommt. */
  function konturBrauchbar(A_kontur, A_raeume) {
    const kA = zahl(A_kontur, 0), aG = zahl(A_raeume, 0);
    if (!(kA > 0)) return { ok: false, grund: "keine Kontur" };
    if (!(aG > 0)) return { ok: true, grund: "" };
    if (kA < aG * KONTUR_MIN_ANTEIL) {
      return { ok: false, art: "zu_klein", A_kontur: rnd(kA, 2),
        A_raeume: rnd(aG, 2),
        grund: "die Aussenkontur " + de(kA, 2) + " m² ist kleiner als die "
          + "Raeume darin (" + de(aG, 2) + " m²)" };
    }
    if (kA > aG * KONTUR_MAX_ANTEIL) {
      return { ok: false, art: "zu_gross", A_kontur: rnd(kA, 2),
        A_raeume: rnd(aG, 2),
        grund: "die Aussenkontur " + de(kA, 2) + " m² ist mehr als das "
          + "Doppelte der Raeume darin (" + de(aG, 2) + " m²)" };
    }
    return { ok: true, grund: "" };
  }

  return {
    konturBrauchbar: konturBrauchbar,
    KONTUR_MIN_ANTEIL: KONTUR_MIN_ANTEIL, KONTUR_MAX_ANTEIL: KONTUR_MAX_ANTEIL,
    geschossAusText: geschossAusText, geschossFuerBlatt: geschossFuerBlatt,
    rangVon: rangVon,
    hoehenZuordnen: hoehenZuordnen, hoehenErgaenzen: hoehenErgaenzen,
    geschosshoehenAusKoten: geschosshoehenAusKoten,
    hoehenGegenprobe: hoehenGegenprobe, bauwerksSpanne: bauwerksSpanne,
    istOeffnungsmass: istOeffnungsmass,
    OEFFNUNG_MAX: OEFFNUNG_MAX, RAUMHOEHE_MIN: RAUMHOEHE_MIN,
    MIN_DECKENPAKET: MIN_DECKENPAKET, MAX_DECKENPAKET: MAX_DECKENPAKET,
    bauteileFuerRaum: bauteileFuerRaum,
    wandlaengenJeGeschoss: wandlaengenJeGeschoss,
    seitenLaenge: seitenLaenge,
    seitenAusRaum: seitenAusRaum,
    seitenverhaeltnisHerleiten: seitenverhaeltnisHerleiten,
    formfaktor: formfaktor,
    aussenwaendeErschliessen: aussenwaendeErschliessen,
    ohneFensterUeblich: ohneFensterUeblich,
    eingangsraum: eingangsraum,
    innenraumZulaessig: innenraumZulaessig,
    geschossabschluss: geschossabschluss,
    geschossfolge: geschossfolge,
    INNENLIEGEND: INNENLIEGEND,
    HOEHE_RUECKFALL: HOEHE_RUECKFALL,
    selbsttest: selbsttest,
  };
});
