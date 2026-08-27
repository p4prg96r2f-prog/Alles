/* ===========================================================================
 * modul_ki.js — Planauslese ueber den WERK.E-Endpunkt
 * ===========================================================================
 * Der einzige Teil des Tools, der das Netz benutzt. Ohne konfigurierten
 * Endpunkt bleibt das gesamte übrige Tool voll funktionsfähig.
 *
 * WICHTIG, bewusst so gebaut:
 *  - Der Maßstab wird von der KI ABGELESEN, aber nie GESETZT. Sie gibt wieder,
 *    was im Schriftfeld steht, samt Fundstelle und Blattgröße; ob das für die
 *    vorliegende Unterlage noch gilt, entscheidet KERN_MASSSTAB und am Ende
 *    der Anwender. Ein gelesener Nenner ist ein Vorschlag, kein Messwert.
 *  - Die KI liefert Vorschläge mit Konfidenz. Alles unter "sicher" muss
 *    bestätigt werden, bevor es ins Raumbuch wandert.
 *  - Vor dem Senden kann der Plankopf geschwaerzt werden (Bauherrenname).
 * =========================================================================== */
"use strict";

(function () {
  const CFG_KEY = "werke_hl_endpunkt";
  /* Adresse des Ausleseendpunkts.
   * Wird das Werkzeug als Webseite aufgerufen, liegt der Endpunkt auf derselben
   * Adresse; dann genügt der relative Pfad und es gibt keine Ursprungsfrage.
   * Bei örtlichem Aufruf der Datei wird die feste Adresse verwendet.
   *
   * Der Zugangscode steht bewusst NICHT hier. Das Werkzeug ist über das Netz
   * erreichbar, ein eingebetteter Code wäre im Quelltext ablesbar und damit
   * wirkungslos. Jede Kollegin und jeder Kollege trägt ihn einmal je Rechner
   * ein, danach bleibt er im Browser gespeichert. */
  const ENDPUNKT_FEST =
    "https://werke-heizlast.netlify.app/.netlify/functions/plan-auslesen";
  function standardUrl() {
    try {
      if (location && /^https?:$/.test(location.protocol)) {
        return "/.netlify/functions/plan-auslesen";
      }
    } catch (e) {}
    return ENDPUNKT_FEST;
  }

  /* laufende haelt die Abbrecher der offenen Aufrufe. Ohne sie beendet
     "Abbrechen" erst nach dem laufenden Blatt -- und das ist genau das Blatt,
     das gerade Geld kostet. */
  const S = { laeuft: false, vorschlag: null, fehler: null, schwaerzen: false,
              laufende: [], zeitAbgelaufen: false };

  /** Bricht alle offenen Aufrufe sofort ab. */
  function abbrechen() {
    S.zeitAbgelaufen = false;
    S.laufende.slice().forEach(function (a) { try { a.abort(); } catch (e) {} });
    S.laufende.length = 0;
  }

  function cfg() {
    let gespeichert = {};
    try { gespeichert = JSON.parse(localStorage.getItem(CFG_KEY) || "{}"); } catch (e) {}
    return { url: gespeichert.url || standardUrl(), code: gespeichert.code || "" };
  }
  function cfgSetzen(o) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function konfiguriert() { const c = cfg(); return !!(c.url && c.code); }

  /** Schwärzt das Schriftfeld, in dem üblicherweise der Bauherrenname steht.
   *  Nach DIN EN ISO 7200 sitzt das Schriftfeld unten rechts, nicht oben; die
   *  frühere Schwärzung des oberen Streifens verdeckte deshalb nichts
   *  Schützenswertes.
   *  Abwägung: Das Schriftfeld ist zugleich der stärkste Beleg dafür, welches
   *  Geschoss ein Blatt zeigt und aus welchem Planstand es stammt. Wer es
   *  schwärzt, verliert diese Zuordnung. Deshalb ist die Schwärzung
   *  abschaltbar und standardmäßig aus; der Auftrag an das Modell verbietet
   *  ohnehin ausdrücklich, personenbezogene Angaben wiederzugeben. */
  function geschwaerzt(b64, breite, hoehe) {
    return new Promise(function (aufl) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0);
        const b = Math.round(c.width * (breite || 0.34));
        const h = Math.round(c.height * (hoehe || 0.22));
        x.fillStyle = "#000";
        x.fillRect(c.width - b, c.height - h, b, h);
        aufl(c.toDataURL("image/jpeg", 0.92).split(",")[1]);
      };
      img.onerror = function () { aufl(b64); };
      img.src = "data:image/jpeg;base64," + b64;
    });
  }

  /* ------------------------------------------------------------------ *
   * Bildgrenzen — VOR dem Senden
   * ------------------------------------------------------------------ *
   * Der Endpunkt weist Bilder ueber 6 MB ab, die Modellschnittstelle Bilder
   * ueber 8000 Bildpunkte Kantenlaenge. Beides darf der Kollege nie sehen:
   * ein zu grosses Bild wird HIER verkleinert, bevor es je gesendet wird.
   * Der eigene Renderer (seiteAlsBild, Kante 2576, JPEG) kann die Grenzen
   * nicht reissen; dieser Wächter faengt die uebrigen Wege — eine grosse
   * Bilddatei im Plan-Canvas, einen kuenftigen Renderer.
   * Meldet der Endpunkt trotzdem "bild_zu_gross" (etwa weil dort eine
   * engere Grenze eingestellt ist), wird einmal verkleinert nachgesendet. */
  const MAX_BILD_MB_KLIENT = 5.5;   // knapp unter der 6-MB-Grenze des Endpunkts
  const MAX_KANTE_API = 7900;       // harte API-Grenze 8000 px, mit Luft

  function bildVerkleinern(b64, faktor, qualitaet) {
    return new Promise(function (aufl) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * faktor));
        c.height = Math.max(1, Math.round(img.height * faktor));
        const x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        aufl(c.toDataURL("image/jpeg", qualitaet || 0.82).split(",")[1]);
      };
      img.onerror = function () { aufl(b64); };
      img.src = "data:image/jpeg;base64," + b64;
    });
  }

  /* Dasselbe Bild geht je Blatt vier- bis siebenmal hinaus (raeume,
     gegenprobe, hoehen, kunde, Wiederholungen). Der Merkzettel verhindert,
     dass es jedes Mal neu dekodiert wird. */
  let bildMemo = { rein: null, raus: null };
  async function bildInGrenzen(b64) {
    if (!b64 || typeof b64 !== "string") return b64;
    if (b64 === bildMemo.rein) return bildMemo.raus;
    const rein = b64;
    for (let runde = 0; runde < 3; runde++) {
      const bytesZuViel = b64.length * 0.75 > MAX_BILD_MB_KLIENT * 1024 * 1024;
      let kante = 0;
      if (!bytesZuViel) {
        /* Die Kantenlaenge ist nur mit Dekodieren zu haben; das geschieht
           einmal je Bild (Merkzettel oben). */
        kante = await new Promise(function (aufl) {
          const img = new Image();
          img.onload = function () { aufl(Math.max(img.width, img.height)); };
          img.onerror = function () { aufl(0); };
          img.src = "data:image/jpeg;base64," + b64;
        });
      }
      if (!bytesZuViel && kante <= MAX_KANTE_API) break;
      const faktor = bytesZuViel
        ? Math.max(0.4, Math.sqrt((MAX_BILD_MB_KLIENT * 1024 * 1024)
            / (b64.length * 0.75)) * 0.9)
        : (MAX_KANTE_API / kante) * 0.98;
      b64 = await bildVerkleinern(b64, faktor);
    }
    bildMemo = { rein: rein, raus: b64 };
    return b64;
  }

  /** Liest ein einzelnes Bild aus. Liefert das Rohergebnis des Endpunkts oder
   *  wirft mit einer Meldung im Klartext. Wird sowohl vom Plan-Canvas als auch
   *  von der Stapelauswertung benutzt.
   *
   *  Der Modus "bewertung" ist der einzige ohne Bild: dort wird statt b64 das
   *  Zahlenpaket im vierten Argument übergeben (siehe modul_bewertung.js).
   *  Der Weg über dieselbe Funktion ist Absicht, denn Adresse, Zugangscode,
   *  Fehlerbehandlung und die Eigenheit der Antwort im Datenstrom sind
   *  dieselben; zwei Kopien davon wären zwei Stellen, die auseinanderlaufen. */
  async function auslesenBild(b64, hinweis, modus, daten, schonVerkleinert) {
    if (!konfiguriert()) {
      const e = new Error("Für die Planauslese fehlt der Zugangscode.");
      e.codeFehlt = true;
      throw e;
    }
    const c = cfg();
    if (modus !== "bewertung") b64 = await bildInGrenzen(b64);
    const koerper = modus === "bewertung"
      ? { modus: "bewertung", daten: daten || {} }
      : { bild: b64, hinweis: hinweis || "", modus: modus || "kunde" };
    /* Abbruch und Zeitgrenze.
     *
     * Ohne beides hing das Werkzeug an einem Aufruf, der nie zurueckkam, und
     * "Abbrechen" wirkte erst nach dem laufenden Blatt -- die Token waren da
     * schon bezahlt. Die Grenze ist bewusst grosszuegig: der Endpunkt
     * antwortet im Datenstrom und sendet alle drei Sekunden ein Lebenszeichen,
     * ein Grundriss braucht bis zu dreissig Sekunden. Neunzig Sekunden sind
     * also weit jenseits des Normalfalls und treffen nur den echten Haenger. */
    const abbrecher = (typeof AbortController === "function") ? new AbortController() : null;
    if (abbrecher) S.laufende.push(abbrecher);
    const uhr = abbrecher
      ? setTimeout(function () { S.zeitAbgelaufen = true; abbrecher.abort(); }, 90000)
      : null;
    /* DER ABBRECHER BLEIBT BIS ZUM ENDE DES KOERPERS REGISTRIERT.
     *
     * Der Endpunkt antwortet im DATENSTROM: die Kopfzeilen (und damit das
     * fetch-Promise) kommen nach weniger als einer Sekunde, der Koerper
     * laeuft danach bis zu dreissig Sekunden. Vorher wurde der Abbrecher im
     * finally direkt nach dem fetch ausgetragen -- "Abbrechen" erreichte
     * die laengst laufenden Antworten nicht mehr. GEMESSEN am 24.08.2026 im
     * echten Abbruchlauf: Abbruch bei 10,9 s, der Lauf endete erst mit der
     * natuerlichen Antwort bei 24,9 s, und eine weitere Antwort wurde noch
     * NACH dem Ende bezahlt und verbucht. Jetzt wird auch das Lesen des
     * Koerpers vom selben Signal getragen und der Abbrecher erst danach
     * ausgetragen. */
    let antwort, txt;
    try {
      try {
        antwort = await fetch(c.url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-werke-code": c.code },
          body: JSON.stringify(koerper),
          signal: abbrecher ? abbrecher.signal : undefined,
        });
      } catch (e) {
        /* "Failed to fetch" ist die Meldung des Browsers und steht auf Englisch
           in einer deutschen Oberflaeche. Sie sagt ausserdem nicht, was zu tun
           ist. Beides wird hier ersetzt. */
        if (e && e.name === "AbortError") {
          throw new Error(S.zeitAbgelaufen
            ? "Der Ausleseendpunkt hat 90 Sekunden nicht geantwortet. Der Versuch "
              + "wurde abgebrochen; das Blatt bleibt offen."
            : "Die Auslese wurde abgebrochen.");
        }
        throw new Error("Der Ausleseendpunkt ist nicht erreichbar. Meist liegt das "
          + "an der Netzverbindung; sonst ist der Dienst gerade nicht erreichbar. "
          + "Das übrige Werkzeug arbeitet unabhängig davon weiter.");
      }
      try {
        txt = await antwort.text();
      } catch (e) {
        if (e && e.name === "AbortError") {
          throw new Error(S.zeitAbgelaufen
            ? "Der Ausleseendpunkt hat 90 Sekunden nicht geantwortet. Der Versuch "
              + "wurde abgebrochen; das Blatt bleibt offen."
            : "Die Auslese wurde abgebrochen.");
        }
        throw new Error("Die Verbindung riss mitten in der Antwort ab. Meist "
          + "liegt das an der Netzverbindung; das Blatt bleibt offen.");
      }
    } finally {
      if (uhr) clearTimeout(uhr);
      if (abbrecher) {
        const i = S.laufende.indexOf(abbrecher);
        if (i >= 0) S.laufende.splice(i, 1);
      }
    }
    /* NICHT jede Antwort mit geschweifter Klammer kommt von diesem Endpunkt.
       GEMESSEN am 22.08.2026: als das Netlify-Kontingent des Kontos
       aufgebraucht war, antwortete die Plattform mit Status 503 und dem Körper
       {"error":"usage_exceeded","message":"Usage exceeded"}. Das ist gültiges
       JSON, es enthält aber kein Feld "fehler" -- also lief es glatt durch,
       und der Kollege las am Ende "Der Ausleseendpunkt hat für dieses Blatt
       nichts zurückgegeben". Er hätte dann am Plan gesucht, während in
       Wahrheit die Rechnung offen war. */
    let d = null;
    try { d = JSON.parse(txt); } catch (e) { d = null; }
    if (!antwort.ok) {
      const kennung = d && (d.error || d.errorType || "");
      if (/usage_exceeded/i.test(kennung) || /usage exceeded/i.test((d && d.message) || "")) {
        const e = new Error("Der Ausleseendpunkt ist stillgelegt, weil das "
          + "Kontingent des Hosters aufgebraucht ist (Meldung „usage exceeded“). "
          + "Das liegt nicht am Plan und nicht am Zugangscode. Bitte im Büro "
          + "Bescheid geben; bis dahin lassen sich die Räume über die "
          + "Expertenmodus von Hand erfassen.");
        e.aussichtslos = true;
        throw e;
      }
      if (!d || !d.fehler) {
        throw new Error("Der Ausleseendpunkt meldet " + antwort.status
          + (d && d.message ? " (" + String(d.message).slice(0, 120) + ")" : "")
          + ". Das Blatt bleibt offen.");
      }
    }
    if (d === null) throw new Error("Die Antwort war unleserlich.");
    if (d.fehler) {
      /* "bild_zu_gross": der Endpunkt fuehrt eine engere Grenze als der
         eigene Waechter oben (MAX_BILD_MB ist dort einstellbar). Einmal
         verkleinern und nachsenden — der Kollege sieht davon nichts. */
      if (d.kennung === "bild_zu_gross" && modus !== "bewertung"
          && b64 && !schonVerkleinert) {
        const ziel = (Number(d.max_mb) || 5) * 1024 * 1024;
        const faktor = Math.max(0.3,
          Math.sqrt(ziel / (b64.length * 0.75)) * 0.85);
        const kleiner = await bildVerkleinern(b64, faktor);
        return auslesenBild(kleiner, hinweis, modus, daten, true);
      }
      /* Die Kennung wandert an den Fehler: an ihr entscheidet die
         Stapelauswertung, ob sie das Blatt selbst zerlegt (laengengrenze,
         zeitgrenze) statt die Meldung dem Kollegen zu zeigen. */
      const e = new Error(d.fehler);
      if (d.kennung) e.kennung = d.kennung;
      /* Auch ein gescheiterter Aufruf ist bezahlt. Der Endpunkt gibt seinen
         Verbrauch inzwischen auch an den Fehlerausgaengen mit; er wandert an
         den Fehler, damit die Kostenanzeige ihn zaehlen kann. Vorher fielen
         genau die teuersten Aufrufe (volle Laengengrenze) aus der Anzeige. */
      if (d._verbrauch) e._verbrauch = d._verbrauch;
      throw e;
    }
    if (modus === "raeume" || !modus || modus === "kunde") massstabFuellen(d);
    if (modus === "raeume") objektFuellen(d);
    return d;
  }

  /* Werkzeug und Endpunkt werden getrennt ausgeliefert: die Einzeldatei liegt
     im Teamordner, der Endpunkt bei Netlify. Nach einem Bau des Werkzeugs kann
     also noch der alte Endpunkt antworten, der den Maßstabsblock nicht kennt.
     Damit die Auswertung dann nicht an einer fehlenden Eigenschaft scheitert,
     wird der Block hier auf eine leere, aber vollständige Form gebracht. Ein
     leerer Block heißt genau das, was er soll: auf dem Blatt wurde kein
     Maßstab gelesen. */
  function massstabFuellen(d) {
    if (!d || typeof d !== "object") return;
    const m = (d.massstab && typeof d.massstab === "object") ? d.massstab : {};
    d.massstab = {
      angaben: Array.isArray(m.angaben) ? m.angaben : [],
      nenner_grundriss: (typeof m.nenner_grundriss === "number") ? m.nenner_grundriss : null,
      mehrere_massstaebe: m.mehrere_massstaebe === true,
      blattgroesse: m.blattgroesse || "keine_angabe",
      blattgroesse_wortlaut: m.blattgroesse_wortlaut || "",
      bemasst: m.bemasst === true,
      masszahlen: Array.isArray(m.masszahlen) ? m.masszahlen : [],
    };
  }

  /* Wie massstabFuellen, aus demselben Grund: das Werkzeug und der Endpunkt
     werden getrennt ausgeliefert. Antwortet noch der alte Endpunkt, fehlt der
     Block "objekt". Ein fehlender Block heisst dann genau das, was er soll:
     im Schriftfeld wurde nichts gelesen. */
  function objektFuellen(d) {
    if (!d || typeof d !== "object") return;
    const o = (d.objekt && typeof d.objekt === "object") ? d.objekt : {};
    const t = function (x) {
      const v = (x === null || x === undefined) ? "" : String(x).trim();
      return v === "" || /^(null|unbekannt|k\.?\s?a\.?|keine angabe)$/i.test(v) ? null : v;
    };
    d.objekt = {
      bauvorhaben: t(o.bauvorhaben), strasse: t(o.strasse),
      plz: (function () { const p = t(o.plz); return p && /^\d{5}$/.test(p) ? p : null; })(),
      ort: t(o.ort), bauherr: t(o.bauherr), projektnr: t(o.projektnummer),
      gebaeudeart: t(o.gebaeudeart),
      baujahr: (function () {
        const b = t(o.baujahr);
        if (!b) return null;
        const m = b.match(/\b(1[6-9]\d{2}|20[0-4]\d)\b/);
        return m ? m[1] : null;
      })(),
      plandatum: t(o.plandatum),
      /* Nur die drei vorgesehenen Wörter zählen. Antwortet ein älterer
         Endpunkt gar nicht, ist das Ergebnis dasselbe wie bei einem Blatt
         ohne Merkmal: "unklar". So wird aus einer fehlenden Auskunft nie
         eine Aussage. */
      planungsart: (function () {
        const v = String(t(o.planungsart) || "").toLowerCase();
        return (v === "neubau" || v === "bestand") ? v : "unklar";
      })(),
      planungsart_beleg: t(o.planungsart_beleg),
    };
  }

  async function auslesen() {
    const P = window.MODUL_PLAN;
    if (!P || !P.zustand.bild) {
      melde("Erst einen Plan laden.", { stufe: "warnung" });
      return;
    }
    if (!konfiguriert()) {
      if (!(await codeErfragen())) return;
    }
    let b64 = P.bildBase64();
    if (S.schwaerzen) b64 = await geschwaerzt(b64);

    S.laeuft = true; S.fehler = null; S.vorschlag = null;
    window.render();
    const c = cfg();
    try {
      const antwort = await fetch(c.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-werke-code": c.code },
        body: JSON.stringify({ bild: b64, hinweis: hinweisText() }),
      });
      const txt = await antwort.text();
      if (!antwort.ok) throw new Error("Endpunkt meldet " + antwort.status + ": " + txt.slice(0, 300));
      const d = JSON.parse(txt);
      if (d.fehler) throw new Error(d.fehler);
      S.vorschlag = d;
    } catch (e) {
      S.fehler = String(e && e.message || e);
    } finally {
      S.laeuft = false;
      window.render();
    }
  }

  function hinweisText() {
    const p = window.App && window.App.p;
    if (!p) return "";
    return [p.meta.bezeichnung, p.meta.baujahr ? "Baujahr " + p.meta.baujahr : "",
            p.raeume.length ? "bereits erfasste Geschosse: "
              + Array.from(new Set(p.raeume.map((r) => r.geschoss))).join(", ") : ""]
      .filter(Boolean).join("; ");
  }

  /* ---------------- Übernahme ---------------- */
  function übernehmen() {
    const v = S.vorschlag;
    if (!v || !v.raeume) return;
    const A = window.App;
    const gewaehlt = Array.from(document.querySelectorAll("[data-kiraum]:checked"))
      .map((x) => +x.dataset.kiraum);
    if (!gewaehlt.length) {
      melde("Kein Raum ausgewählt.", { stufe: "warnung" });
      return;
    }
    let ohneFlaeche = 0;
    gewaehlt.forEach(function (i) {
      const r = v.raeume[i];
      const flaeche = feldWert(r.flaeche_m2);
      if (flaeche == null) ohneFlaeche++;
      A.p.raeume.push({
        id: "r_ki_" + Date.now() + "_" + i,
        geschoss: feldWert(r.geschoss) || "EG",
        name: feldWert(r.bezeichnung) || "Raum",
        art: artZuordnen(feldWert(r.raumart)),
        A: flaeche == null ? 0 : flaeche,
        h: feldWert(r.lichte_hoehe_m) || 2.5,
        we: (A.p.einheiten[0] || {}).name || "",
        bauteile: [],
        ki_herkunft: { konfidenz: r.konfidenz || "unsicher", quelle: "Planauslese",
                       fundstellen: r.fundstellen || null },
      });
    });
    if (!A.p.planbefunde) A.p.planbefunde = [];
    (v.befunde || []).forEach(function (b) { A.p.planbefunde.push(b); });
    if (v.gebaeude) A.p.plangebaeude = v.gebaeude;
    if ((v.luecken || []).length) A.p.planluecken = v.luecken;
    S.vorschlag = null;
    window.render();
    melde((ohneFlaeche ? ohneFlaeche + " davon ohne gelesene Fläche. "
        + (ohneFlaeche === 1 ? "Diesen Raum" : "Diese Räume")
        + " bitte im Plan umfahren oder die Fläche eintragen.\n" : "")
      + "Alle übernommenen Angaben sind Vorschläge und im Raumbuch zu prüfen.",
      { stufe: ohneFlaeche ? "warnung" : "gut",
        titel: (gewaehlt.length === 1 ? "Ein Raum" : gewaehlt.length + " Räume")
          + " übernommen" });
  }

  function feldWert(f) {
    if (f == null) return null;
    if (typeof f === "object" && "wert" in f) return f.wert;
    return f;
  }
  /* Von der gelesenen Raumbezeichnung auf die Raumart des Rechenkerns.
   *
   * Gemessen: die alte Fassung kannte acht Muster und liess alles Uebrige auf
   * "wohnen" fallen. Damit standen "Technik", "Heizung" und "Abstellraum" mit
   * 20,0 Grad im Raumbuch, obwohl es beheizte Nebenraeume mit 15,0 Grad sind.
   * Der Fehler geht voll in die Norm-Heizlast ein und faellt spaeter nicht
   * mehr auf, weil im Raumbuch nur noch "Wohn- und Schlafraum" steht.
   *
   * Die Reihenfolge ist wichtig: das engste Muster zuerst. "Gaeste-WC" muss
   * vor "Gaestezimmer" greifen, "Waschkueche" vor "Kueche".
   *
   * Was nicht erkannt wird, bleibt "wohnen" — das ist der haeufigste Fall und
   * die sichere Seite, weil 20 Grad die hoehere Last ergibt als 15. Es wird
   * aber als Annahme gekennzeichnet (erkannt: false), damit es im
   * Kontrollblatt auffaellt statt still zu gelten. */
  const ARTMUSTER = [
    ["wc", /\bwc\b|toilette|g(ä|ae)ste-?wc/],
    ["bad", /\bbad\b|badezimmer|dusch|sauna|wannen/],
    ["kueche", /wasch-?k(ü|ue)che|k(ü|ue)che|kochnische|pantry|teek(ü|ue)che/],
    /* Öltank, Tankraum und Brennstofflager kamen am Satz „Am Gunnebach 9"
       (25.08.2026) als Wohnraum 20 °C zurück — es sind beheizte Nebenräume
       wie Heizung und Technik. Die Schleuse gehört zu Windfang und Vorraum;
       „TH" ist die übliche Kurzbeschriftung des Treppenhauses. */
    ["nebenraum", /neben-?raum|technik|heizung|heizraum|haustechnik|hausanschluss|\bhwr\b|hauswirtschaft|trockenraum|putzraum|server|elektro|aufzug|m(ü|ue)ll|(ö|oe)l-?tank|tank-?raum|(ö|oe)l-?lager|brennstoff/],
    ["lager_beheizt", /abstell|vorrat|speis|lager|kammer|archiv|keller-?raum/],
    /* „TRH" ist dieselbe Kurzbeschriftung wie „TH", nur mit dem R aus
       „Treppe". GEMESSEN am Blatt „260514 Dumach 1" (echter Lauf
       26.08.2026): zwei Treppenhäuser mit je 9,94 m² fielen durch beide
       Raster und wurden mit 20 °C statt 15 °C als Wohnraum gerechnet. */
    ["treppenhaus", /treppe|windfang|vorraum|hausflur|eingangsbereich|foyer|aufgang|schleuse|\bth\b|\btrh\b/],
    ["flur", /flur|diele|garderobe|gang\b/],
    ["buero", /b(ü|ue)ro|besprech|konferenz|arbeitszimmer|praxis|empfang|sekretariat/],
    ["verkauf", /verkauf|laden|shop|gastraum|schank|restaurant|ausstellung/],
    /* „Halle" ALLEIN IST KEINE WERKHALLE.
       Bis zum 26.08.2026 stand hier `halle\b`, und jeder Raum namens
       „Halle" bekam den Hallen-Ansatz mit 15 °C. GEMESSEN am Blattsatz
       „P2211 Baugenehmigung Grundrisse" (Prüflauf 26.08.2026): Blatt 5
       zeigt einen Versammlungs-/Schulungsraum mit rund 40 Stühlen, benannt
       „Halle" — gerechnet wurde er mit 15 °C statt 20 °C, also mit gut
       einem Sechstel zu wenig Temperaturdifferenz. Im Wohnbau heißt die
       Diele oft „Halle" oder „Eingangshalle"; auch das sind 20 °C.
       Der Hallen-Ansatz gilt deshalb nur noch, wo das Wort seine Nutzung
       mitbringt. „Halle" allein fällt in den Rückfall (wohnen, 20 °C, die
       sichere Seite) und wird als angenommene Raumart gemeldet. */
    ["werkstatt", /werkstatt|produktion|montage|fertigung|(werk|lager|produktions|montage|fertigungs|maschinen|industrie|gewerbe|reit|sport|turn|schwimm)-?halle/],
    ["wohnen", /wohn|schlaf|kind|ess|zimmer|aufenthalt|empore|galerie|studio|hobby|g(ä|ae)ste/],
  ];

  /** Wie artZuordnen, gibt aber zusaetzlich an, ob die Art wirklich erkannt
   *  wurde oder ob der Rueckfall gegriffen hat. */
  function artZuordnung(t) {
    const s = String(t || "").toLowerCase();
    for (const [art, muster] of ARTMUSTER) {
      if (muster.test(s)) return { art: art, erkannt: true, wortlaut: String(t || "") };
    }
    return { art: "wohnen", erkannt: false, wortlaut: String(t || "") };
  }
  function artZuordnen(t) { return artZuordnung(t).art; }

  /* Was auf einem Grundriss steht, ist nicht alles ein Raumname.
   *
   * Gemessen an echten Plaenen: aus dem Grundriss der Christuskirche kamen
   * vier "Raeume" mit 0 m² zurueck, die in Wahrheit Beschriftungen waren --
   * "RH 2,28" ist eine Rohbauhoehe, "UV" eine Unterverteilung. Jeder davon
   * wurde ein Raum im Raumbuch, mit 20 Grad Innentemperatur und ohne Flaeche.
   *
   * Aussortiert wird nur, was sich BELEGEN laesst: eine Bezeichnung, die aus
   * einer Vermassung besteht. Kurze Kuerzel bleiben drin -- "WC" ist zwei
   * Zeichen lang und ein Raum. Lieber eine Zeile zu viel im Raumbuch, die
   * jemand loescht, als ein Raum zu wenig, den niemand vermisst.
   *
   * Nicht uebernommen heisst nicht verschwiegen: der Aufrufer meldet jede
   * aussortierte Zeile als offene Frage. */
  const VERMASSUNG = [
    /* Hoehenangaben mit Kennbuchstaben: RH 2,28 · OKFF +2,75 · UK 2.10 · BRH 0,90 */
    /^(rh|okff|okf|ok|ukff|uk|ffb|brh|fbok|rfb)\b[\s.:=+-]*\d/i,
    /* Hoehenbezug mit angehaengtem Geschosskuerzel, auch ohne Zahl:
       "OKFFEG" · "OKFF EG" · "OKRF KG". GEMESSEN in der Live-Abnahme am
       24.08.2026 (Blattsatz Maas/Langner): "OKFFEG" wurde ein Raum mit
       0 m² und 20 Grad. Das alte Muster verlangte nach dem Kennbuchstaben
       eine Wortgrenze und eine Ziffer -- beides hat "OKFFEG" nicht. */
    /^(rh|okff|okf|okrf|ok|ukff|ukrf|uk|ffb|brh|fbok|rfb)[\s.:=+-]*(\d\.?\s*)?(eg|og|kg|ug|dg)\b/i,
    /* nur eine Zahl, mit oder ohne Einheit: "2,28" · "12.5 m²" · "24 qm" */
    /^[+-]?\d+([.,]\d+)?\s*(m|m²|m2|qm|cm|mm|°|grad|%)?$/i,
    /* Massstabsvermerk */
    /^m?\s*1\s*:\s*\d+$/i,
    /* Steigungsangabe einer Treppe: 17/29 · 18 x 17,6/28 */
    /^\d+\s*(x|\*)?\s*\d*([.,]\d+)?\s*\/\s*\d+([.,]\d+)?$/,
    /* Stufenzahl einer Treppe: "18 Stg." · "17 Stgn" · "16 Steigungen" —
       auch mit angehängtem Steigungsmaß "18 Stg. 16,67/30". Aus demselben
       Blattsatz: beide Formen standen als Raum im Raumbuch. */
    /^\d+\s*(stg|stgn|steigungen|stufen|stfg)\.?(\s|$)/i,
    /* Ein Luftraum ist die Beschriftung einer OFFENEN Deckenoeffnung
       (Galerie, zweigeschossiger Wohnraum) -- er hat keine eigene Flaeche
       und keine eigene Heizlast; seine Luft gehoert zum Raum darunter. */
    /^luft-?raum\b/i,
    /* Eine Wohnflaechen-Anmerkung ist die ZWEITE Beschriftung desselben
       Raums: "(WF 20,54)" steht neben dem Raumstempel und nennt die
       anrechenbare Wohnflaeche nach WoFlV. GEMESSEN am Satz "Am Gunnebach 9"
       (25.08.2026): sieben solcher Anmerkungen wurden Raeume, jede Flaeche
       zaehlte doppelt, die Heizlast lag 37 % zu hoch. Ein Raumname faengt
       nicht mit "WF" plus Zahl oder Klammer an. */
    /^\(?\s*wf\b[\s.:=]*[\d(]/i,
    /^\(?\s*wf\s*\)?$/i,
    /* Eine Planungsnotiz ist kein Raum: "optional Sauna" beschreibt, was
       gebaut werden KOENNTE. Aus demselben Satz: die Notiz stand mit 0 m²
       und 24 Grad im Raumbuch. Aussortiert heisst nicht verschwiegen -- der
       Aufrufer meldet die Zeile als offene Frage; wird die Sauna gebaut,
       legt sie jemand mit Flaeche von Hand an. */
    /^optional\b/i,
    /* EINE WOHNUNGSBEZEICHNUNG IST KEIN RAUM.
       GEMESSEN am 26.08.2026 an "260514 - Dumach 1": "WHG1" stand mit
       A = 0,00 m² als 26. Raum im Raumbuch, das Urteil meldete 26 statt 25
       Raeumen. Im selben Lauf hatte die Auslese es selbst richtig
       eingeordnet ("Mehrfamilienhaus mit vier Wohnungen (WHG1-WHG4)") --
       WHG2 bis WHG4 fielen durch andere Raster, WHG1 rutschte durch.
       Eine Wohnung ist eine Nutzungseinheit: ihre Flaeche steckt in den
       Raeumen, die zu ihr gehoeren, und sie doppelt anzusetzen hiesse, jede
       Flaeche zweimal zu rechnen. Das Muster verlangt eine Ziffer dahinter,
       damit "Wohnen", "Wohnzimmer" und "Werkstatt" unberuehrt bleiben. */
    /^(whg|wng|wohnung|wohneinheit|we)\s*\.?\s*[-_]?\s*\d/i,
  ];

  /** true, wenn die Bezeichnung ein Raumname sein kann. */
  function istRaumname(name) {
    const s = String(name == null ? "" : name).trim();
    if (!s) return false;
    return !VERMASSUNG.some(function (r) { return r.test(s); });
  }

  /* EINBAUTEILE SIND KEINE RAEUME.
   *
   * GEMELDET vom Kunden am echten Lauf "Hasenberg 10" (25.08.2026): die
   * Beschriftungen "Garderobe/Schrank" und "Garderobe" wurden Raeume ohne
   * Flaeche und loesten die Sperre "Raumflaeche fehlt" aus. Eine Garderobe,
   * ein Einbauschrank, eine Nische ist Moeblierung: sie steht IN einem Raum
   * (bei Garderoben im Regelfall im Flur), ihre Grundflaeche steckt in
   * dessen Flaeche, und sie hat weder eigene Huelle noch eigene Lueftung.
   *
   * ABGRENZUNG UEBER DIE FLAECHE, nicht nur ueber das Wort: eine begehbare
   * Garderobe mit eigener Tuer und 4 m² ist ein Raum. Die Schwelle
   * (EINBAU_SCHWELLE_M2 = 2,0 m²) ist so hergeleitet: Einbaumoebel sind nach
   * dem Moebelrichtmass ~0,60 m tief, selbst ein drei Meter breiter
   * Einbauschrank bleibt damit unter 1,8 m². Begehbar wird ein Abteil erst
   * mit Moebeltiefe PLUS Bewegungsflaeche (Richtwert der Moeblierungsmasse:
   * >= 0,90 m vor dem Moebel) auf mindestens Tuerbreite -- das ergibt rund
   * 2 m² als kleinste plausible begehbare Garderobe. Ein Einbau-Etikett
   * OHNE Flaeche oder darunter ist ein Einbauteil; eines MIT >= 2 m² bleibt
   * Raum und wird normal behandelt.
   *
   * "Abstellraum", "Abst.", "Ankleide", "Schrankraum" bleiben Raeume: die
   * Muster stehen am Wortanfang mit Wortgrenze; ein angehaengtes "-raum"
   * verhindert den Treffer. Entschieden wird an den Uebernahmewegen
   * (app.js), hier steht nur die EINE Erkennung fuer beide Wege. */
  const EINBAUTEIL = new RegExp(
    "^((einbau|wand|kleider|garderoben|schuh|besen)?schrank(wand)?"
    + "|garderobe"
    + "|(abstell|garderoben|wand|dusch)?nische"
    + "|einbaum(oe|ö)bel|ablage)\\b"
    + "|^gard\\.", "i");
  const EINBAU_SCHWELLE_M2 = 2.0;

  /** true, wenn die Bezeichnung ein Einbau-/Moeblierungsetikett ist. */
  function istEinbauteil(name) {
    const s = String(name == null ? "" : name).trim();
    return !!s && EINBAUTEIL.test(s);
  }

  /** Fuer ZAEHLUNGEN (Gegenprobe, fehltJeEbene, Zaehler Z1): dort gibt es
   *  keine Flaeche, an der sich ein grosses Etikett als Raum ausweisen
   *  koennte. Einbauteile zaehlen deshalb auf KEINER Seite mit -- sonst
   *  meldet die Zaehlung eine "fehlende" Garderobe, die das Raumbuch mit
   *  Absicht nicht fuehrt, und die Frage kehrt durch die Hintertuer
   *  zurueck. */
  function istZaehlbarerRaumname(name) {
    return istRaumname(name) && !istEinbauteil(name);
  }

  /* ---------------- Oberflaeche ---------------- */
  function knopf() {
    if (S.laeuft) return '<button class="btn klein" disabled>Plan wird ausgelesen...</button>';
    return '<button class="btn klein cta" data-aktion="kiAuslesen">Plan mit KI auslesen</button>'
      + ' <button class="btn klein" data-aktion="kiEinstellungen"'
      + ' title="Endpunkt und Zugangscode einstellen">Zugang</button>';
  }

  function html() {
    if (S.fehler) {
      return '<div class="meldung fehler"><span class="sym">!</span><div>'
        + "<b>Die Auslese ist fehlgeschlagen.</b><br>" + escape2(S.fehler)
        + "<br><small>Das übrige Tool arbeitet unabhängig davon weiter. Räume können "
        + "im Plan umfahren oder von Hand eingetragen werden.</small></div></div>";
    }
    const v = S.vorschlag;
    if (!v) return "";
    const konf = { sicher: "belegt", unsicher: "annahme", geraten: "annahme" };
    return '<div class="karte" style="border-color:#5B3FA6">'
      + "<h2>Auswertung des Plans</h2>"
      + '<p class="hinweis">Nichts davon ist geprüft. Jede Zeile bitte gegen den Plan '
      + "kontrollieren. Flächen sind nur dann belastbar, wenn sie im Plan als Zahl stehen; "
      + "sonst den Raum umfahren.</p>"
      + (v.gebaeude ? gebaeudeBlock(v.gebaeude) : "")
      + ((v.befunde || []).length ? befundBlock(v.befunde) : "")
      + ((v.luecken || []).length
        ? '<div class="meldung warnung"><span class="sym">i</span><div><b>Im Plan nicht '
          + "enthalten, muss ergänzt werden:</b><ul style=\"margin:6px 0 0;padding-left:18px\">"
          + v.luecken.map((x) => "<li>" + escape2(x) + "</li>").join("")
          + "</ul></div></div>" : "")
      + (v.hinweise && v.hinweise.length
        ? '<div class="meldung hinweis"><span class="sym">i</span><div>'
          + v.hinweise.map(escape2).join("<br>") + "</div></div>" : "")
      + ((v.massketten || []).length
        ? '<div class="panelkarte" style="margin:10px 0"><h4>Im Plan lesbare Maße '
          + "(zum Setzen des Maßstabs)</h4>"
          + v.massketten.slice(0, 8).map((m) => '<span class="chip" style="margin:2px">'
              + escape2(m.text) + " " + escape2(m.einheit) + " · " + escape2(m.bedeutung)
              + "</span>").join(" ") + "</div>" : "")
      + "<h3 style=\"font-size:15px;margin-top:16px\">Gefundene Räume</h3>"
      + '<div class="tabhuelle"><table class="tab"><thead><tr>'
      + '<th style="width:40px"><input type="checkbox" id="kiAlle" checked></th>'
      + "<th>Bezeichnung</th><th style=\"width:90px\">Geschoss</th>"
      + '<th style="width:130px">Raumart</th><th class="num" style="width:100px">Fläche m²</th>'
      + '<th style="width:110px">Konfidenz</th></tr></thead><tbody>'
      + (v.raeume || []).map(function (r, i) {
          const k = r.konfidenz || "unsicher";
          const fl = feldWert(r.flaeche_m2);
          return '<tr><td><input type="checkbox" data-kiraum="' + i + '" checked></td>'
            + "<td>" + escape2(feldWert(r.bezeichnung) || "–")
            + (r.fundstellen ? '<br><span style="font-size:11.5px;color:var(--mute)">'
                + escape2(r.fundstellen) + "</span>" : "") + "</td>"
            + "<td>" + escape2(feldWert(r.geschoss) || "–") + "</td>"
            + "<td>" + escape2(feldWert(r.raumart) || "–") + "</td>"
            + '<td class="num">' + (fl == null ? '<span style="color:var(--rot)">nicht gelesen</span>'
                : Number(fl).toLocaleString("de-DE", { maximumFractionDigits: 2 })) + "</td>"
            + '<td><span class="chip ' + (konf[k] || "annahme") + '">' + escape2(k) + "</span></td></tr>";
        }).join("")
      + "</tbody></table></div>"
      + '<div style="margin-top:12px;display:flex;gap:8px">'
      + '<button class="btn klein primaer" data-aktion="kiUebernehmen">Ausgewählte ins Raumbuch</button>'
      + '<button class="btn klein" data-aktion="kiVerwerfen">Verwerfen</button></div>'
      + "</div>";
  }

  function gebaeudeBlock(g) {
    const z = (t, w) => w ? "<tr><td>" + t + "</td><td>" + escape2(
      Array.isArray(w) ? w.join(", ") : w) + "</td></tr>" : "";
    const inhalt = z("Geschosse", g.geschosse) + z("Bauweise", g.bauweise)
      + z("Dachform", g.dachform) + z("Unbeheizte Bereiche", g.unbeheizte_bereiche)
      + z("Plankopf", g.plankopf);
    if (!inhalt) return "";
    return "<h3 style=\"font-size:15px\">Was der Plan über das Gebäude sagt</h3>"
      + '<table class="tab" style="max-width:560px;margin-bottom:14px">' + inhalt + "</table>";
  }

  function befundBlock(b) {
    return "<h3 style=\"font-size:15px\">Aus dem Plan abgeleitet</h3>"
      + '<p style="font-size:13px;color:var(--mute);margin:-4px 0 8px">Diese Angaben stehen '
      + "nicht als Zahl im Plan, sondern folgen aus ihm. Die Herleitung steht daneben, damit "
      + "sie nachvollziehbar ist.</p>"
      + '<div class="tabhuelle"><table class="tab"><thead><tr><th style="width:22%">Thema</th>'
      + '<th style="width:28%">Ergibt sich</th><th>Herleitung</th>'
      + '<th style="width:90px">Konfidenz</th></tr></thead><tbody>'
      + b.map(function (x) {
          const k = x.konfidenz || "unsicher";
          return "<tr><td>" + escape2(x.thema) + "</td><td><b>" + escape2(x.aussage)
            + "</b></td><td>" + escape2(x.herleitung) + '</td><td><span class="chip '
            + (k === "sicher" ? "belegt" : "annahme") + '">' + escape2(k) + "</span></td></tr>";
        }).join("")
      + "</tbody></table></div>";
  }

  /* Meldungen und Rueckfragen laufen ueber modul_dialog.js. alert()/prompt()
     halten den ganzen Tab an — waehrend einer laufenden Auslese heisst das:
     kein Fortschritt, keine Zwischenmeldung, und der Kollege glaubt, das
     Werkzeug haenge. */
  function melde(text, opt) {
    const D = window.MODUL_DIALOG;
    if (D) return D.sagen(text, opt);
    if (window.console) window.console.log(text);
    return { weg() {} };
  }
  function eingebe(opt) {
    const D = window.MODUL_DIALOG;
    return D ? D.eingabe(opt) : Promise.resolve(null);
  }

  function escape2(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /** Beim ersten Mal nur den Zugangscode erfragen. Die Adresse steht fest. */
  async function codeErfragen() {
    const c = cfg();
    const code = await eingebe({ titel: "Zugangscode für die Planauslese",
      text: "Den Code nennt dir Sebastian Hund. Du trägst ihn einmal auf diesem "
        + "Rechner ein, danach merkt sich der Browser ihn.\n\nOhne Code arbeitet "
        + "das Werkzeug vollständig weiter, nur die Auslese durch die KI fehlt; "
        + "Pläne lassen sich weiterhin von Hand umfahren.",
      wert: c.code || "", mehrzeilig: false, feldname: "Zugangscode",
      jaText: "Übernehmen" });
    if (code === null) return false;
    if (!code.trim()) {
      melde("Kein Code eingetragen.", { stufe: "warnung" });
      return false;
    }
    cfgSetzen({ url: c.url, code: code.trim() });
    return true;
  }

  /** Vollständige Einstellungen, für den Fall eines Umzugs des Endpunkts. */
  async function einstellungen() {
    const c = cfg();
    const url = await eingebe({ titel: "Adresse des Ausleseendpunkts",
      text: "Voreingestellt ist der Endpunkt der Firma. Nur ändern, wenn er "
        + "umgezogen ist.",
      wert: c.url || "", mehrzeilig: false, feldname: "Adresse des Endpunkts",
      jaText: "Weiter" });
    if (url === null) return;
    const code = await eingebe({ titel: "Zugangscode für den Endpunkt",
      text: "Leer lassen entfernt den gemerkten Code aus diesem Browser.",
      wert: c.code || "", mehrzeilig: false, feldname: "Zugangscode",
      jaText: "Speichern" });
    if (code === null) return;
    cfgSetzen({ url: url.trim(), code: code.trim() });
    melde(code.trim() ? "Einstellungen gespeichert." : "Zugangscode entfernt.",
      { stufe: "gut" });
  }

  function aktion(name) {
    switch (name) {
      case "kiAuslesen": auslesen(); return true;
      case "kiEinstellungen": einstellungen(); return true;
      case "kiUebernehmen": übernehmen(); return true;
      case "kiVerwerfen": S.vorschlag = null; return true;
      default: return false;
    }
  }

  document.addEventListener("change", function (ev) {
    if (ev.target.id === "kiAlle") {
      document.querySelectorAll("[data-kiraum]").forEach(function (x) {
        x.checked = ev.target.checked;
      });
    }
  });

  window.MODUL_KI = {
    knopf: knopf, html: html, aktion: aktion, konfiguriert: konfiguriert,
    auslesenBild: auslesenBild, abbrechen: abbrechen, codeErfragen: codeErfragen, artZuordnen: artZuordnen, istRaumname: istRaumname,
    istEinbauteil: istEinbauteil, istZaehlbarerRaumname: istZaehlbarerRaumname,
    EINBAU_SCHWELLE_M2: EINBAU_SCHWELLE_M2,
    artZuordnung: artZuordnung, objektFuellen: objektFuellen,
    zustand: S,
    selbsttest: function () {
      const f = [];
      if (artZuordnen("Badezimmer") !== "bad") f.push("Raumart Bad nicht erkannt");
      if (artZuordnen("Küche") !== "kueche") f.push("Raumart Küche nicht erkannt");
      if (artZuordnen("Treppenhaus") !== "treppenhaus") f.push("Raumart Treppenhaus nicht erkannt");
      if (artZuordnen("Wohnen") !== "wohnen") f.push("Standard-Raumart falsch");
      if (feldWert({ wert: 12.5, konfidenz: "sicher" }) !== 12.5) f.push("Feldwert nicht gelesen");
      if (feldWert(null) !== null) f.push("Leerer Feldwert falsch behandelt");
      // Ein alter Endpunkt ohne Massstabsblock darf die Auswertung nicht kippen
      const alt = { ist_grundriss: true, raeume: [] };
      massstabFuellen(alt);
      if (!alt.massstab || !Array.isArray(alt.massstab.angaben)
          || !Array.isArray(alt.massstab.masszahlen)) {
        f.push("Ohne Massstabsblock entsteht keine vollstaendige leere Form");
      }
      if (alt.massstab.nenner_grundriss !== null || alt.massstab.bemasst !== false
          || alt.massstab.blattgroesse !== "keine_angabe") {
        f.push("Die leere Form des Massstabsblocks ist nicht neutral");
      }
      const neu = { massstab: { angaben: [{ wortlaut: "M 1:100" }], nenner_grundriss: 100,
                                mehrere_massstaebe: false, blattgroesse: "A3",
                                blattgroesse_wortlaut: "A3", bemasst: true,
                                masszahlen: [{ text: "4,20" }] } };
      massstabFuellen(neu);
      if (neu.massstab.nenner_grundriss !== 100 || neu.massstab.masszahlen.length !== 1
          || neu.massstab.blattgroesse !== "A3") {
        f.push("Ein vorhandener Massstabsblock wird beim Auffuellen beschaedigt");
      }
      /* Raumarten, die frueher alle still auf "wohnen" und damit auf 20,0 Grad
         fielen. Sie sind beheizte Nebenraeume mit 15,0 Grad. */
      [["Technik", "nebenraum"], ["Heizung", "nebenraum"], ["HWR", "nebenraum"],
       ["Abstellraum", "lager_beheizt"], ["Vorratsraum", "lager_beheizt"],
       ["Waschküche", "kueche"], ["Gäste-WC", "wc"], ["Gästezimmer", "wohnen"],
       ["Empore", "wohnen"], ["Aufenthalt", "wohnen"], ["Windfang", "treppenhaus"],
       ["Hauswirtschaftsraum", "nebenraum"], ["Speisekammer", "lager_beheizt"],
       ["Podest/Nebenraum", "nebenraum"],
       /* Befunde „Am Gunnebach 9" (25.08.2026): Öltank, Schleuse und die
          Kurzbeschriftung TH standen als Wohnraum 20 °C im Raumbuch. */
       ["Öltank", "nebenraum"], ["Tankraum", "nebenraum"],
       ["Brennstofflager", "nebenraum"], ["Schleuse", "treppenhaus"],
       ["TH", "treppenhaus"], ["TRH", "treppenhaus"], ["Therapieraum", "wohnen"],
       /* Prueflauf P2211 (26.08.2026): ein Versammlungsraum namens „Halle"
          wurde mit dem Hallen-Ansatz auf 15 °C gerechnet. „Halle" allein
          faellt in den Rueckfall (20 °C, sichere Seite); erst das Wort mit
          der Nutzung macht die Werkhalle. */
       ["Halle", "wohnen"], ["Eingangshalle", "wohnen"],
       ["Werkhalle", "werkstatt"], ["Produktionshalle", "werkstatt"],
       ["Werkstatt", "werkstatt"]]
        .forEach(function (x) {
          if (artZuordnen(x[0]) !== x[1]) {
            f.push("Raumart " + x[0] + " muss " + x[1] + " sein, ist " + artZuordnen(x[0]));
          }
        });
      /* Wohnflaechen-Anmerkungen und Planungsnotizen sind keine Raumnamen;
         echte Raeume mit aehnlichem Anfang bleiben es. */
      [["(WF 20,54)", false], ["WF 12,3 m²", false], ["(WF)", false],
       ["optional Sauna", false], ["WC", true], ["Wohnen", true],
       ["Wohnfläche... nein: Werkraum", true], ["Sauna", true]]
        .forEach(function (x) {
          if (istRaumname(x[0]) !== x[1]) {
            f.push("istRaumname(" + JSON.stringify(x[0]) + ") muss " + x[1] + " sein");
          }
        });
      if (artZuordnung("Abstellraum").art !== "lager_beheizt"
          && !artZuordnung("Abstellraum").erkannt) {
        f.push("Abstellraum muss als erkannt gelten");
      }
      if (artZuordnung("Zimmer 4711 Sonderfall XY").erkannt === false
          && artZuordnung("Zimmer 4711 Sonderfall XY").art !== "wohnen") {
        f.push("Der Rueckfall muss wohnen sein");
      }
      if (artZuordnung("Qwertz").erkannt !== false) {
        f.push("Eine unbekannte Bezeichnung darf nicht als erkannt gelten");
      }
      /* Ein alter Endpunkt ohne Objektblock darf nichts erfinden. */
      const ohne = { ist_grundriss: true, raeume: [] };
      objektFuellen(ohne);
      if (!ohne.objekt || ohne.objekt.plz !== null || ohne.objekt.strasse !== null) {
        f.push("Ohne Objektblock muss die leere Form entstehen");
      }
      const mit = { objekt: { bauvorhaben: "Neubau", strasse: "Musterweg 1",
                              plz: "33102", ort: "Paderborn", bauherr: "Meier",
                              projektnummer: "2002.04", gebaeudeart: "Einfamilienhaus",
                              baujahr: "Bestand von 1936", plandatum: "14.12.2022" } };
      objektFuellen(mit);
      if (mit.objekt.plz !== "33102" || mit.objekt.baujahr !== "1936"
          || mit.objekt.projektnr !== "2002.04") {
        f.push("Der Objektblock wird beim Auffuellen beschaedigt: "
          + JSON.stringify(mit.objekt));
      }
const krumm = { objekt: { plz: "3310", baujahr: "keine Angabe", ort: "  ",
                                strasse: "unbekannt" } };
      objektFuellen(krumm);
      if (krumm.objekt.plz !== null || krumm.objekt.baujahr !== null
          || krumm.objekt.ort !== null || krumm.objekt.strasse !== null) {
        f.push("Unbrauchbare Angaben muessen zu null werden: "
          + JSON.stringify(krumm.objekt));
      }
      /* Das deklarierte Feld heisst laeuft; geschrieben und gelesen wurde
         S.läuft mit Umlaut, also ein zweites, stilles Feld. Der exportierte
         MODUL_KI.zustand.laeuft blieb dadurch dauerhaft false und log jeden
         an, der ihn abfragte; zugleich verstiess der Schluessel gegen die
         ASCII-Regel. Diese Probe haelt beides fest. */
      /* Beschriftungen sind keine Raeume -- und Raeume keine Beschriftungen.
         Beide Richtungen zaehlen: ein aussortierter echter Raum faellt aus
         der Heizlast heraus und niemand vermisst ihn. */
      [["RH 2,28", false], ["OKFF +2,75", false], ["UK 2.10", false],
       ["BRH 0,90", false], ["2,28", false], ["12.5 m²", false], ["24 qm", false],
       ["M 1:100", false], ["1:50", false], ["17/29", false], ["", false],
       /* Die Etiketten aus der Live-Abnahme 24.08.2026 (Maas/Langner):
          alle vier standen als Raeume mit 0 m² im Raumbuch. */
       ["OKFFEG", false], ["OKFF EG", false], ["OKRF KG", false],
       ["18 Stg.", false], ["17 Stgn", false], ["18 Stg. 16,67/30", false],
       ["Luftraum", false],
       ["WC", true], ["UV", true], ["Bad", true], ["Wohnen", true],
       ["Raum 2", true], ["Zimmer 1.OG", true], ["HEIZUNG", true],
       ["Küche 12,5 m²", true], ["Abstellraum", true],
       /* Echte Raeume, die den neuen Mustern NICHT zum Opfer fallen duerfen. */
       ["Ankleide", true], ["Stauraum", true], ["Ruheraum", true],
       ["Umkleide", true], ["Dusche EG", true]].forEach(function (x) {
        if (istRaumname(x[0]) !== x[1]) {
          f.push("istRaumname(" + JSON.stringify(x[0]) + ") muss " + x[1] + " sein");
        }
      });
      /* Einbauteile: erkannt am Wort, entschieden ueber die Flaeche (die
         Entscheidung sitzt an den Uebernahmewegen in app.js). Die
         Gegenprobe: echte Raumnamen duerfen dem Muster NICHT zum Opfer
         fallen -- ein Kunde nannte am Lauf "Hasenberg 10" (25.08.2026)
         Garderobe und Garderobe/Schrank als Einbauteile, die faelschlich
         Raeume wurden. */
      [["Garderobe", true], ["Garderobe/Schrank", true], ["Gard.", true],
       ["Schrank", true], ["Einbauschrank", true], ["Wandschrank", true],
       ["Garderobenschrank", true], ["Schrankwand", true],
       ["Nische", true], ["Abstellnische", true], ["Garderobennische", true],
       ["Abstellraum", false], ["Abst.", false], ["Ankleide", false],
       ["Schrankraum", false], ["Flur", false], ["WC", false],
       ["Wohnen", false], ["HWR", false]].forEach(function (x) {
        if (istEinbauteil(x[0]) !== x[1]) {
          f.push("istEinbauteil(" + JSON.stringify(x[0]) + ") muss " + x[1] + " sein");
        }
      });
      [["WHG1", false], ["WHG 2", false], ["Wohnung 3", false], ["WE 1", false],
       ["Wohnen", true], ["Wohnzimmer", true], ["Werkstatt", true],
       ["Wohnen/Essen", true]].forEach(function (x) {
        if (istRaumname(x[0]) !== x[1]) {
          f.push("istRaumname(" + JSON.stringify(x[0]) + ") muss " + x[1] + " sein");
        }
      });
      if (istZaehlbarerRaumname("Garderobe") !== false
          || istZaehlbarerRaumname("Flur") !== true
          || istZaehlbarerRaumname("RH 2,28") !== false) {
        f.push("istZaehlbarerRaumname muss Einbauteile UND Vermassungen ausschliessen");
      }
      if (!(EINBAU_SCHWELLE_M2 > 0)) {
        f.push("Die Einbau-Schwelle muss eine positive Flaeche sein");
      }
      const krummeSchluessel = Object.keys(S).filter(function (k) {
        return /[^\x00-\x7F]/.test(k);
      });
      if (krummeSchluessel.length) {
        f.push("Zustandsschluessel mit Umlaut: " + krummeSchluessel.join(", "));
      }
      if (!("laeuft" in S)) f.push("Der Zustand meldet kein Feld laeuft");
      return { ok: f.length === 0, fehler: f, anzahl: 10 + 13 + 3 + 3 + 2 + 32 + 21 + 5 };
    },
  };
})();
