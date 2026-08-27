/* ===========================================================================
 * modul_pruefblatt.js — der Plan mit dem, was das Werkzeug daraus gemacht hat
 * ===========================================================================
 * Zwischen dem Auslesen und dem Kontrollblatt fehlte der Schritt, den jeder
 * Bearbeiter von Hand macht: den Plan aufschlagen und nachsehen, ob das, was
 * im Raumbuch steht, auch dort steht. Bisher lag der Plan im einen Fenster
 * und die Liste im anderen, und der Abgleich fand im Kopf statt.
 *
 * Dieses Blatt legt beides übereinander. Links das Blatt, wie es ist, mit
 * einer Marke an jeder Stelle, an der das Werkzeug einen Raum erkannt hat.
 * Rechts dieselben Räume als Liste, mit denselben Eingabefeldern wie im
 * Kontrollblatt. Eine Marke anklicken heisst: die Zeile daneben öffnen.
 *
 * DIE FARBE DER MARKE IST NICHT NEU ERFUNDEN.
 * Sie kommt aus MODUL_KONTROLLBLATT.raumAmpel, derselben Regel, nach der die
 * Tabelle im Kontrollblatt ihre Zeilen einfärbt. Zwei Regeln hiessen: derselbe
 * Raum ist auf dem Plan grün und in der Liste rot, und niemand weiss, welcher
 * Bildschirm lügt.
 *
 * WAS DIE MARKE SAGT UND WAS NICHT
 * Sie steht dort, wo die BESCHRIFTUNG des Raumes im Dokument steht. Sie ist
 * kein Raumumriss. Deshalb ist sie ein Punkt und keine Fläche: eine
 * eingefärbte Raumform würde behaupten, das Werkzeug kenne die Ausdehnung des
 * Raumes, und das tut es nicht (siehe kern_lage.js, dort steht auch, warum
 * der Weg über die geschlossenen Linienzüge an echten Zeichnungen scheitert).
 * Nur wenn ein Raum ausgewählt ist und das Blatt einen belastbaren Maßstab
 * hat, kommt ein GESTRICHELTES Quadrat derselben Fläche dazu — das ist die
 * eigentliche Probe: passt die angeschriebene Fläche zu dem, was man sieht?
 *
 * WAS DIESES BLATT NICHT KANN, und es sagt das auch selbst:
 * einen Raum zeigen, der gar nicht erkannt wurde. Eine Überlagerung kann nur
 * Gefundenes anzeigen. Der stille Verlust — ein Raum, den niemand vermisst —
 * bleibt Sache der Zähler im Kontrollblatt (Z1 Räume je Geschoss, Z2 Summe
 * der Flächen gegen die Gebäudekontur). Dieses Blatt ERSETZT das
 * Kontrollblatt deshalb nicht, es geht ihm voraus: hier wird geprüft, ob das
 * Gefundene stimmt und am richtigen Ort liegt; dort, ob etwas fehlt.
 *
 * UND ES ZÄHLT, WAS ES NICHT ZEIGEN KANN.
 * Ein reiner Scan hat keinen Textstand; dann gibt es keine einzige Marke. Die
 * Kopfzeile sagt dann nicht „0 Punkte prüfen", sondern „13 ohne Ort im Plan".
 * Ein Bildschirm, der bei fehlender Grundlage Ruhe meldet, ist die
 * gefährlichste Bauform, die dieses Werkzeug kennt.
 * =========================================================================== */
"use strict";

(function () {

  /* Zielbreite des gerenderten Blattes in Bildpunkten. Gross genug, dass
     Raumnamen und Maßzahlen beim Hineinzoomen lesbar bleiben, klein genug,
     dass ein A1-Bogen den Speicher nicht sprengt. Die Auflösung folgt daraus
     und aus der Blattgrösse, nicht umgekehrt. */
  const ZIELBREITE_PX = 1800;

  /* Höhe der Zeichenfläche. Der Plan wird hineingepasst; wer mehr sehen will,
     zoomt. Eine mitwachsende Fläche wäre bei einem A1-Bogen im Hochformat
     zwei Bildschirme hoch und die Liste daneben unerreichbar. */
  const FLAECHE_HOCH = 620;

  const S = {
    blatt: null,          // Schlüssel des angezeigten Blattes
    bild: null,           // gerendertes Blatt
    bildFuer: null,       // zu welchem Blatt das Bild gehört
    laeuft: false,        // Rendern läuft
    fehler: null,
    dpi: null,            // Auflösung des gerenderten Bildes
    zoom: 1, panX: 0, panY: 0,
    /* Breite der Zeichenfläche beim letzten Einpassen, und ob neu eingepasst
       werden muss.
       WARUM DAS GEMERKT WIRD: jede Handlung ruft render(), render() baut den
       Inhalt neu und damit auch die Zeichenfläche. aktivieren() lief danach
       wieder an und passte den Plan ein — womit jeder Klick auf „Vergrössern"
       im selben Augenblick zurückgenommen war. GEMESSEN am 23.08.2026: vier
       Klicks auf das Pluszeichen, Vergrösserung danach unverändert 0,245.
       Eingepasst wird deshalb nur noch, wenn ein anderes Blatt geladen wird
       oder das Fenster seine Breite ändert. */
    breite: null, neuEinpassen: true,
    gewaehlt: null,       // Kennung des ausgewählten Raumes
    ziehen: false, zieh0: null, gezogen: false,
    verdrahtet: false,
    marken: [],           // gezeichnete Marken, für die Trefferprüfung
    /* Die Ergebnisseite benutzt denselben Plan mit denselben Marken, nur die
       Beschriftung ist eine andere: die Heizlast des Raums in Watt statt der
       Fläche. watt ist eine Karte Raum-Kennung -> Watt; app.js füllt sie beim
       Zeichnen der Ergebnisseite und leert sie beim Prüfblatt. beiWahl ist
       der Rückweg: klickt jemand dort eine Marke an, soll nicht die Zeile im
       Prüfblatt aufgehen (die es auf der Ergebnisseite nicht gibt), sondern
       die Zusammensetzung des Raums. */
    watt: null,
    beiWahl: null,
  };

  const esc = function (t) {
    return String(t === null || t === undefined ? "" : t).replace(/[&<>"']/g,
      function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
                 "'": "&#39;" }[c];
      });
  };
  const de = function (x, n) {
    return Number.isFinite(x)
      ? x.toLocaleString("de-DE", { minimumFractionDigits: n === undefined ? 0 : n,
                                    maximumFractionDigits: n === undefined ? 0 : n })
      : "–";
  };
  const mz = function (n, ein, mehr) {
    return n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);
  };
  const KB = function () { return window.MODUL_KONTROLLBLATT; };
  const KL = function () { return window.KERN_LAGE; };
  const projekt = function () { return window.App ? window.App.p : null; };

  /* =====================================================================
   * Teil A — die Zahlen. DOM-frei und einzeln prüfbar.
   * ================================================================== */

  /** Zu welchem Blatt ein Raum gehört. Erst die Lage, dann die Herkunft;
   *  ein von Hand angelegter Raum gehört zu keinem. */
  function blattVon(r) {
    if (r && r.lage && r.lage.blatt) return String(r.lage.blatt);
    if (r && r.herkunft && r.herkunft.blatt) return String(r.herkunft.blatt);
    return null;
  }

  /**
   * Der Stand, aus dem die Kopfzeile gebildet wird.
   *
   * Steht hier als reine Funktion, weil die Kopfzeile die eine Zeile ist, auf
   * die geschaut wird. Sie darf nicht davon abhängen, was gerade gezeichnet
   * ist. Gezählt wird über ALLE Räume des Projekts, nicht über die des
   * angezeigten Blattes: gerechnet wird auch mit allen.
   */
  function stand(p, opt) {
    const K = KB();
    const leer = { raeume: 0, rot: 0, gelb: 0, gruen: 0, pruefpunkte: 0,
                   gelb_flaeche: 0, gelb_hoehe: 0, ortlos: 0,
                   mit_ort: 0, ohne_ort: 0, zeilen: [], blaetter: [] };
    if (!p || !K || typeof K.raumzeilen !== "function") return leer;
    const L = KL();
    const zeilen = K.raumzeilen(p, opt || {});
    let rot = 0, gelb = 0, gruen = 0, gelbA = 0, gelbH = 0, ortlos = 0;
    zeilen.forEach(function (x) {
      const a = K.raumAmpel(x);
      if (a === "mangel") { rot++; return; }
      if (a === "annahme") {
        gelb++;
        const g = K.annahmegrund(x);
        if (g.indexOf("Fläche nicht belegt") >= 0) gelbA++;
        if (g.indexOf("Höhe nicht belegt") >= 0) gelbH++;
        return;
      }
      gruen++;
      /* EIN RAUM OHNE ORT IST EIN PRÜFPUNKT, auch wenn seine Werte belegt
       * aussehen.
       *
       * GEMESSEN am 23.08.2026, echter Durchlauf mit „BV 2-0887 Ziolkowski"
       * gegen den laufenden Endpunkt: 13 Räume, alle aus dem Bild gelesen,
       * alle mit Konfidenz „sicher", keiner mit einem Ort auf dem Blatt —
       * das Blatt ist ein Scan ohne Textstand. Die Kopfzeile las sich
       * „13 Räume erkannt · nichts mehr zu prüfen · 13 ohne Ort im Plan",
       * und die ersten beiden Angaben widersprachen der dritten.
       *
       * Auf diesem Bildschirm ist ein Raum ohne Marke genau der Raum, den
       * niemand ansehen kann. Er bleibt offen, bis der Bearbeiter ihn von
       * Hand gegen den Plan gehalten und als durchgegangen abgehakt hat —
       * derselbe Haken, mit dem er auch jede andere Zeile schliesst. */
      if (a !== "gesehen" && !(L && L.gueltig(x.raum.lage))) ortlos++;
    });
    const ort = L ? L.ortsstand(p.raeume || [])
      : { mit_ort: 0, ohne_ort: (p.raeume || []).length };
    /* Blattweise, für die Blattwahl und die Liste daneben. */
    const nachBlatt = {};
    zeilen.forEach(function (x) {
      const b = blattVon(x.raum) || "";
      const g = nachBlatt[b] || (nachBlatt[b] = { schluessel: b, raeume: 0,
        rot: 0, gelb: 0, mit_ort: 0 });
      g.raeume++;
      const a = K.raumAmpel(x);
      if (a === "mangel") g.rot++;
      else if (a === "annahme") g.gelb++;
      if (L && L.gueltig(x.raum.lage)) g.mit_ort++;
    });
    return {
      raeume: zeilen.length,
      rot: rot, gelb: gelb, gruen: gruen,
      gelb_flaeche: gelbA, gelb_hoehe: gelbH, ortlos: ortlos,
      pruefpunkte: rot + gelb + ortlos,
      mit_ort: ort.mit_ort, ohne_ort: ort.ohne_ort,
      zeilen: zeilen,
      blaetter: Object.keys(nachBlatt).map(function (k) { return nachBlatt[k]; }),
    };
  }

  /**
   * Die Kopfzeile. Ein Satz, drei Angaben, und keine davon geschönt.
   *
   * Die dritte Angabe ist der Grund, warum diese Funktion einzeln geprüft
   * wird: „13 Räume erkannt · 0 Punkte prüfen" wäre auf einem reinen Scan
   * wörtlich richtig und trotzdem eine Lüge, weil dort keine einzige Marke
   * liegt und niemand etwas geprüft hat. Solange auch nur ein Raum keinen Ort
   * auf dem Plan hat, steht das in derselben Zeile.
   */
  function kopfzeile(st) {
    const s = st || stand(null, null);
    const teile = [mz(s.raeume, "Raum erkannt", "Räume erkannt")];
    teile.push(s.pruefpunkte === 0 ? "nichts mehr zu prüfen"
      : mz(s.pruefpunkte, "Punkt prüfen", "Punkte prüfen"));
    if (s.ohne_ort > 0) teile.push(s.ohne_ort + " ohne Ort im Plan");
    else if (s.raeume > 0) teile.push("alle im Plan gefunden");
    return teile.join(" · ");
  }

  /** Die Zeile darunter: woraus die Prüfpunkte bestehen.
   *
   *  Fläche und Höhe werden getrennt genannt, weil sie verschiedene Arbeit
   *  bedeuten. Eine unbelegte Fläche wird am Plan nachgemessen oder
   *  abgeschrieben; eine unbelegte Höhe steht in keinem Grundriss und kommt
   *  aus dem Schnitt oder vom Aufmass. „6 Punkte prüfen" ohne diese
   *  Unterscheidung schickt den Bearbeiter an die falsche Unterlage. */
  function aufschluesselung(st) {
    const s = st || {};
    const t = [];
    if (s.rot) {
      t.push(mz(s.rot, "Raum ohne Fläche, Höhe, Hüllbauteil oder Einheit",
        "Räume ohne Fläche, Höhe, Hüllbauteil oder Einheit"));
    }
    if (s.gelb_flaeche) {
      t.push(mz(s.gelb_flaeche, "Raum mit unbelegter Fläche",
        "Räume mit unbelegter Fläche"));
    }
    if (s.gelb_hoehe) {
      t.push(mz(s.gelb_hoehe, "Raum mit angenommener Höhe",
        "Räume mit angenommener Höhe"));
    }
    if (s.ortlos) {
      t.push(mz(s.ortlos, "Raum ohne Marke, von Hand gegen den Plan zu halten",
        "Räume ohne Marke, von Hand gegen den Plan zu halten"));
    }
    if (!t.length && s.raeume) {
      t.push("Fläche und Höhe sind bei jedem Raum belegt oder durchgegangen.");
    }
    if (!s.raeume) t.push("Es ist noch kein Raum im Raumbuch.");
    return t.join(" · ");
  }

  /* =====================================================================
   * Teil B — Blätter
   * ================================================================== */

  /** Die Blätter, die hier zur Wahl stehen: jedes abgelegte Blatt, das kein
   *  reiner Text und nicht leer ist, dazu ein Platz für Räume, die zu keinem
   *  Blatt gehören. Auch ein Blatt OHNE Raum steht dabei — dass auf einem
   *  Grundriss kein einziger Raum erkannt wurde, ist selbst ein Befund. */
  function blaetter(p) {
    const raus = [];
    const seiten = (p && p.plan && p.plan.seiten) || [];
    seiten.forEach(function (s, i) {
      if (s.typ === "leer" || s.typ === "textseite") return;
      raus.push({ schluessel: String(s.bezeichnung || s.name || ("Blatt " + (i + 1))),
                  titel: String(s.bezeichnung || s.name || ("Blatt " + (i + 1))),
                  index: i, seite: s });
    });
    const ohne = (p && p.raeume || []).filter(function (r) { return !blattVon(r); });
    if (ohne.length) {
      raus.push({ schluessel: "", titel: "ohne Blatt", index: null, seite: null });
    }
    return raus;
  }

  /** Räume eines Blattes, in der Reihenfolge des Kontrollblatts (Mängel
   *  zuerst). */
  function raeumeDesBlatts(st, schluessel) {
    return (st.zeilen || []).filter(function (x) {
      return (blattVon(x.raum) || "") === String(schluessel === null
        || schluessel === undefined ? "" : schluessel);
    });
  }

  function aktuellesBlatt(p, st) {
    const bs = blaetter(p);
    if (!bs.length) return null;
    if (S.blatt !== null) {
      const gefunden = bs.find(function (b) { return b.schluessel === S.blatt; });
      if (gefunden) return gefunden;
    }
    /* Ohne Wahl das Blatt mit den meisten Marken; das ist das, auf dem sich
       am meisten prüfen lässt. Bei Gleichstand das erste. */
    let best = bs[0], bestZahl = -1;
    bs.forEach(function (b) {
      const n = raeumeDesBlatts(st, b.schluessel).filter(function (x) {
        const L = KL();
        return L && L.gueltig(x.raum.lage);
      }).length;
      if (n > bestZahl) { bestZahl = n; best = b; }
    });
    return best;
  }

  /* =====================================================================
   * Teil C — Zeichnen
   * ================================================================== */

  function cv() { return document.getElementById("pbcanvas"); }

  function zoomSchirm() {
    const c = cv();
    if (!c) return S.zoom;
    const r = c.getBoundingClientRect();
    if (!r.width || !c.width) return S.zoom;
    return S.zoom * (r.width / c.width);
  }

  function einpassen() {
    const c = cv();
    if (!c || !S.bild) return;
    S.zoom = Math.min(c.width / S.bild.width, c.height / S.bild.height);
    S.panX = (c.width - S.bild.width * S.zoom) / 2;
    S.panY = (c.height - S.bild.height * S.zoom) / 2;
  }

  /** Bildpunkte je Meter im gerenderten Blatt, sofern der Maßstab belastbar
   *  ist. Nur damit lässt sich die Flächenprobe zeichnen; ohne ihn wird sie
   *  gar nicht erst angeboten. */
  function pxJeMeter(seite) {
    const M = window.KERN_MASSSTAB;
    if (!M || !seite || !seite.massstab || !seite.massstab.belastbar) return null;
    if (!(seite.massstab.nenner > 0) || !(S.dpi > 0)) return null;
    const v = M.pxJeMeterAusNenner(seite.massstab.nenner, S.dpi);
    return v > 0 ? v : null;
  }

  const FARBE = {
    mangel:  { voll: "#921A38", rand: "#FBEEF1" },
    annahme: { voll: "#C8951C", rand: "#FDF6E3" },
    gesehen: { voll: "#57514F", rand: "#FFFFFF" },
    "":      { voll: "#2F6B38", rand: "#EDF7ED" },
  };

  function zeichnen() {
    const c = cv();
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#F4F4F5";
    ctx.fillRect(0, 0, c.width, c.height);
    S.marken = [];
    if (!S.bild) {
      ctx.fillStyle = "#6E6866";
      ctx.font = "15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(S.laeuft ? "Blatt wird gezeichnet…"
        : (S.fehler || "Dieses Blatt lässt sich nicht anzeigen."),
        c.width / 2, c.height / 2);
      return;
    }
    ctx.setTransform(S.zoom, 0, 0, S.zoom, S.panX, S.panY);
    ctx.drawImage(S.bild, 0, 0);

    const p = projekt();
    const K = KB(), L = KL();
    if (!p || !K || !L) return;
    const st = standJetzt(p);
    const b = aktuellesBlatt(p, st);
    const liste = b ? raeumeDesBlatts(st, b.schluessel) : [];
    const pxm = b && b.seite ? pxJeMeter(b.seite) : null;
    const z = S.zoom;

    liste.forEach(function (x) {
      const r = x.raum;
      if (!L.gueltig(r.lage)) return;
      const mx = r.lage.x * S.bild.width, my = r.lage.y * S.bild.height;
      const ampel = K.raumAmpel(x);
      const f = FARBE[ampel] || FARBE[""];
      const gewaehlt = S.gewaehlt === r.id;

      /* Die Flächenprobe: ein gestricheltes Quadrat derselben Fläche, am Ort
         der Beschriftung. Es behauptet keinen Umriss — ein Raum ist selten
         quadratisch —, sondern zeigt, WIE VIEL Fläche die Zahl im Raumbuch
         beansprucht. Passt sie offensichtlich nicht zu dem, was darunter
         gezeichnet ist, ist die Zahl falsch. Nur für den ausgewählten Raum,
         sonst liegt das Blatt unter Quadraten. */
      if (gewaehlt && pxm && Number(r.A) > 0) {
        const seite_px = Math.sqrt(Number(r.A)) * pxm;
        ctx.save();
        ctx.setLineDash([7 / z, 5 / z]);
        ctx.strokeStyle = f.voll;
        ctx.lineWidth = 1.8 / z;
        ctx.strokeRect(mx - seite_px / 2, my - seite_px / 2, seite_px, seite_px);
        ctx.restore();
      }

      const rad = (gewaehlt ? 11 : 8) / z;
      ctx.beginPath();
      ctx.arc(mx, my, rad, 0, 6.2832);
      ctx.fillStyle = f.voll;
      ctx.fill();
      ctx.lineWidth = (gewaehlt ? 4 : 2.5) / z;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();
      if (gewaehlt) {
        ctx.beginPath();
        ctx.arc(mx, my, rad + 4 / z, 0, 6.2832);
        ctx.strokeStyle = f.voll;
        ctx.lineWidth = 1.6 / z;
        ctx.stroke();
      }

      /* Beschriftung nur beim ausgewählten Raum und beim Hineinzoomen. Bei
         vierzehn Räumen auf einem A3-Blatt überdecken vierzehn Kästchen den
         halben Plan, und geprüft wird dann das Kästchen statt der Zeichnung.
         AUSNAHME Ergebnisseite (S.watt): dort ist die Zahl an der Marke der
         Zweck des Bildes — jede Marke trägt ihre Watt, klein; Name und Fläche
         kommen erst beim Auswählen oder Hineinzoomen dazu. */
      const watt = S.watt && Number.isFinite(S.watt[r.id]) ? S.watt[r.id] : null;
      if (gewaehlt || zoomSchirm() > 0.55) {
        const text = String(r.name || "ohne Namen")
          + (watt !== null ? "  " + wattText(watt) : "")
          + (Number(r.A) > 0 ? "  " + de(Number(r.A), 2) + " m²" : "  ohne Fläche");
        markenSchild(ctx, text, mx, my, rad, 13 / z, f, z);
      } else if (watt !== null) {
        markenSchild(ctx, wattText(watt), mx, my, rad, 11 / z, f, z);
      }
      S.marken.push({ id: r.id, x: mx, y: my });
    });
  }

  /** Das weiße Schild neben einer Marke — ein Zeichenweg für beide Fälle
   *  (Name mit Fläche im Prüfblatt, Watt auf der Ergebnisseite), damit die
   *  beiden Bilder nicht auseinanderlaufen. */
  function markenSchild(ctx, text, mx, my, rad, gr, f, z) {
    ctx.font = "600 " + gr + "px Inter, sans-serif";
    ctx.textAlign = "left";
    const br = ctx.measureText(text).width;
    const bx = mx + rad + 5 / z, by = my - gr * 0.95;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillRect(bx, by, br + 10 / z, gr * 1.5);
    ctx.strokeStyle = f.voll;
    ctx.lineWidth = 1 / z;
    ctx.strokeRect(bx, by, br + 10 / z, gr * 1.5);
    ctx.fillStyle = "#272425";
    ctx.fillText(text, bx + 5 / z, by + gr * 1.08);
  }

  /** Watt als Text an der Marke. Ganze Watt; das Komma einer Heizlast ist
   *  Scheingenauigkeit, die Tausendermarke dagegen Lesbarkeit. */
  function wattText(w) {
    return de(Math.round(w), 0) + " W";
  }

  /* Der Stand wird beim Zeichnen und beim Bauen der Seite gebraucht. Er
     hängt am Maßstabsurteil, damit die Klassen dieselben sind wie im
     Kontrollblatt. */
  function standJetzt(p) {
    const A = window.App;
    const K = KB();
    let opt = {};
    if (K && typeof K.zaehler === "function" && A) {
      /* Dieselbe Vorbedingung wie im Kontrollblatt: ohne abgesicherten
         Maßstab ist eine gemessene Fläche Klasse C. */
      const ms = A.pruefung && A.pruefung.massstab ? A.pruefung.massstab : null;
      opt = { massstab_guete: ms ? ms.guete : null };
    }
    return stand(p, opt);
  }

  /* =====================================================================
   * Teil D — Markup
   * ================================================================== */

  function stil() {
    return "<style>"
      + "#planblatt .pbkopf{display:flex;flex-wrap:wrap;align-items:baseline;"
      + "gap:10px 16px;margin:0 0 6px}"
      + "#planblatt .pbkopf .zahl{font-family:var(--schrift-h);font-size:23px;"
      + "font-weight:650;color:var(--blau);line-height:1.2}"
      + "#planblatt .pbunter{font-size:13.5px;color:var(--mute);margin:0 0 14px;"
      + "line-height:1.5}"
      + "#planblatt .pbwahl{display:flex;gap:6px;flex-wrap:wrap;align-items:center;"
      + "margin:0 0 10px;padding:8px 10px;background:var(--neutral);"
      + "border:1px solid var(--linie);border-radius:var(--r-s)}"
      + "#planblatt .pbwahl .lab{font-size:13px;color:var(--mute)}"
      + "#planblatt .pbraster{display:grid;grid-template-columns:minmax(0,1.35fr) "
      + "minmax(300px,1fr);gap:14px;align-items:start}"
      + "@media (max-width:1100px){#planblatt .pbraster{grid-template-columns:1fr}}"
      + "#planblatt .pbplan{border:1px solid var(--linie);border-radius:var(--r-s);"
      + "overflow:hidden;background:#F4F4F5}"
      + "#planblatt canvas{display:block;width:100%;cursor:grab;touch-action:none}"
      + "#planblatt canvas.zieht{cursor:grabbing}"
      + "#planblatt .pbleiste{display:flex;gap:6px;align-items:center;flex-wrap:wrap;"
      + "padding:7px 9px;border-top:1px solid var(--linie);background:var(--weiss);"
      + "font-size:12.5px;color:var(--mute)}"
      + "#planblatt .pbleg{display:inline-flex;align-items:center;gap:5px}"
      + "#planblatt .pbpunkt{width:11px;height:11px;border-radius:50%;"
      + "border:2px solid #fff;box-shadow:0 0 0 1px var(--linie-s)}"
      + "#planblatt .pbliste{display:flex;flex-direction:column;gap:8px;"
      + "max-height:" + (FLAECHE_HOCH + 40) + "px;overflow:auto;padding-right:4px}"
      + "#planblatt .pbz{border:1px solid var(--linie);border-left-width:4px;"
      + "border-radius:var(--r-s);padding:8px 10px;background:var(--weiss);outline:0}"
      + "#planblatt .pbz:focus{box-shadow:0 0 0 2px var(--blau)}"
      + "#planblatt .pbz.aktiv{box-shadow:0 0 0 2px var(--blau)}"
      + "#planblatt .pbz.mangel{border-left-color:var(--rot);background:var(--rot-bg)}"
      + "#planblatt .pbz.annahme{border-left-color:var(--warn-mark);background:#FEFBF2}"
      + "#planblatt .pbz.gesehen{border-left-color:var(--mute-2);background:var(--neutral)}"
      + "#planblatt .pbz.gut{border-left-color:var(--ok)}"
      + "#planblatt .pbz .kopf{display:flex;align-items:baseline;gap:8px;"
      + "justify-content:space-between}"
      + "#planblatt .pbz .nam{font-weight:600;font-size:14.5px}"
      + "#planblatt .pbz .gesch{font-size:12px;color:var(--mute)}"
      + "#planblatt .pbz .felder{display:flex;flex-wrap:wrap;gap:6px 10px;"
      + "align-items:center;margin-top:6px}"
      + "#planblatt .pbz .felder label{font-size:12px;color:var(--mute);"
      + "display:inline-flex;align-items:center;gap:4px}"
      + "#planblatt .pbz input{padding:4px 7px;font-size:13px;"
      + "border:1px solid var(--linie-s);border-radius:6px;font-family:inherit}"
      + "#planblatt .pbz .warum{font-size:12px;color:var(--rot);margin-top:5px}"
      + "#planblatt .pbz .gelbgrund{font-size:12px;color:var(--warn);margin-top:5px}"
      + "#planblatt .pbz .herk{font-size:12px;color:var(--mute);margin-top:5px;"
      + "line-height:1.45}"
      + "#planblatt .pbz .ohneort{font-size:12px;color:var(--warn);margin-top:5px}"
      + "#planblatt .pbabschnitt{font-size:12.5px;text-transform:uppercase;"
      + "letter-spacing:.06em;color:var(--mute);margin:8px 0 2px;font-weight:600}"
      + "#planblatt .kbgesehen{width:30px;height:26px;padding:0;"
      + "justify-content:center}"
      + "#planblatt .kbgesehen[aria-pressed=\"true\"]{background:var(--ok-bg);"
      + "border-color:var(--ok-linie);color:var(--ok)}"
      + "</style>";
  }

  function legende() {
    const p = function (farbe, text) {
      return '<span class="pbleg"><span class="pbpunkt" style="background:'
        + farbe + '"></span>' + esc(text) + "</span>";
    };
    return p(FARBE[""].voll, "belegt")
      + p(FARBE.annahme.voll, "Annahme, prüfen")
      + p(FARBE.mangel.voll, "fehlt")
      + p(FARBE.gesehen.voll, "durchgegangen");
  }

  function raumkarte(x, mitOrt) {
    const K = KB();
    const r = x.raum;
    const ampel = K.raumAmpel(x);
    /* Ein Raum ohne Marke sieht nicht grün aus. Grün hiesse hier „angesehen
       und in Ordnung", und angesehen hat ihn niemand — es gibt nichts
       anzusehen. Er bekommt denselben gelben Rand wie eine Annahme und
       verliert ihn mit demselben Haken. */
    const kl = ampel || (mitOrt ? "gut" : "annahme");
    const pA = "raum." + r.id + ".A", pH = "raum." + r.id + ".h";
    const herk = typeof K.herkunftChip === "function"
      ? K.herkunftChip(x.hA, x.klasseA) : "";
    return '<div class="pbz ' + kl + (S.gewaehlt === r.id ? " aktiv" : "")
      + '" data-kb-zeile="raum.' + esc(r.id) + '" data-pb-raum="' + esc(r.id)
      + '" tabindex="0">'
      + '<div class="kopf"><span class="nam">' + esc(r.name || "ohne Namen")
      + '</span><span class="gesch">' + esc(r.geschoss || "Geschoss offen")
      + " · " + x.huelle + " Hülle · " + mz(x.fenster, "Fenster", "Fenster")
      + (r.aussenwaende != null ? " · " + mz(Number(r.aussenwaende),
          "Außenwand", "Außenwände") : "")
      + "</span></div>"
      + '<div class="felder">'
      + '<label>A [m²] <input type="text" inputmode="decimal" size="6" '
      + 'data-kb-pfad="' + pA + '" aria-label="Fläche von '
      + esc(r.name || "Raum") + '" value="'
      + esc(Number(r.A) > 0 ? de(Number(r.A), 2) : "") + '"></label>'
      + '<label>h [m] <input type="text" inputmode="decimal" size="5" '
      + 'data-kb-pfad="' + pH + '" aria-label="Höhe von '
      + esc(r.name || "Raum") + '" value="'
      + esc(Number(r.h) > 0 ? de(Number(r.h), 2) : "") + '"></label>'
      + '<label>Quelle <input type="text" size="14" data-kb-quelle="raum.'
      + esc(r.id) + '" aria-label="Quelle für diese Zeile" '
      + 'placeholder="woher die Werte stammen" value="'
      + esc((x.hA && x.hA.quelle) || "") + '"></label>'
      + '<button class="btn klein kbgesehen" data-aktion="kbGesehen" '
      + 'data-kb-pfad="raum.' + esc(r.id) + '" aria-pressed="'
      + (x.gesehen ? "true" : "false") + '" title="'
      + (x.gesehen ? "Durchgegangen, klicken hebt es auf"
         : "Als durchgegangen markieren")
      + '" aria-label="' + esc(r.name || "Raum")
      + ' als durchgegangen markieren">' + window.ikon("haken") + "</button>"
      + "</div>"
      + (x.maengel.length
        ? '<div class="warum">' + esc(x.maengel.join(", ")) + "</div>" : "")
      + (!x.maengel.length && ampel === "annahme"
        ? '<div class="gelbgrund">' + esc(K.annahmegrund(x).join(" · "))
          + (x.klasseH === "C" && x.hH && x.hH.quelle
            ? " (" + esc(x.hH.quelle) + ")" : "")
          + "</div>"
        : "")
      + (herk ? '<div class="herk">' + herk + "</div>" : "")
      + (mitOrt
        ? (r.lage && r.lage.quelle
          ? '<div class="herk">Marke: ' + esc(r.lage.quelle) + "</div>" : "")
        : '<div class="ohneort">Kein Ort auf diesem Blatt. Diese Zeile ist von '
          + "Hand gegen den Plan zu halten.</div>")
      + "</div>";
  }

  function html() {
    const p = projekt();
    if (!p) return '<div class="karte">Kein Projekt geladen.</div>';
    const st = standJetzt(p);
    const bs = blaetter(p);
    const b = aktuellesBlatt(p, st);
    const L = KL();
    const eigene = b ? raeumeDesBlatts(st, b.schluessel) : [];
    const mit = eigene.filter(function (x) { return L && L.gueltig(x.raum.lage); });
    const ohne = eigene.filter(function (x) { return !(L && L.gueltig(x.raum.lage)); });

    const ohneQuelle = !(p.plan && (p.plan.seiten || []).length);

    return stil()
      + '<div class="karte" id="planblatt">'
      + "<h2>" + window.ikon("blatt") + "Plan prüfen</h2>"
      + '<div class="pbkopf"><span class="zahl">' + esc(kopfzeile(st))
      + "</span></div>"
      + '<p class="pbunter">' + esc(aufschluesselung(st))
      + "<br>Dieses Blatt zeigt, was erkannt wurde, und wo es liegt. Ob etwas "
      + "FEHLT, sagt es nicht — dafür sind die Zähler im Kontrollblatt da "
      + "(Räume je Geschoss, Summe der Flächen gegen die Gebäudekontur)."
      + "</p>"
      + (ohneQuelle
        ? '<div class="meldung">' + window.ikon("hinweis")
          + "<div>Es liegt keine Planunterlage vor. Auf Schritt 1 ablegen, dann "
          + "steht hier der Plan mit den erkannten Räumen.</div></div>"
        : "")
      + (bs.length
        ? '<div class="pbwahl"><span class="lab">Blatt:</span>'
          + bs.map(function (x) {
              const g = (st.blaetter || []).find(function (y) {
                return y.schluessel === x.schluessel; })
                || { raeume: 0, rot: 0, gelb: 0, mit_ort: 0 };
              const offen = g.rot + g.gelb;
              return '<button class="btn klein'
                + (b && b.schluessel === x.schluessel ? " an" : "")
                + '" data-aktion="pbBlatt" data-pb-blatt="' + esc(x.schluessel)
                + '">' + esc(x.titel) + " · " + mz(g.raeume, "Raum", "Räume")
                + (offen ? " · " + offen + " zu prüfen" : "")
                + (g.raeume && !g.mit_ort ? " · ohne Marken" : "")
                + "</button>";
            }).join("")
          + "</div>"
        : "")
      + '<div class="pbraster">'
      + '<div class="pbplan">'
      + '<canvas id="pbcanvas" width="1100" height="' + FLAECHE_HOCH
      + '" role="img" aria-label="Grundriss mit den erkannten Räumen"></canvas>'
      + '<div class="pbleiste">'
      + '<button class="btn klein nurikon" data-aktion="pbZoom" data-pb-zoom="-1" '
      + 'aria-label="Verkleinern">' + window.ikon("minus") + "</button>"
      + '<button class="btn klein nurikon" data-aktion="pbZoom" data-pb-zoom="1" '
      + 'aria-label="Vergrößern">' + window.ikon("plus") + "</button>"
      + '<button class="btn klein" data-aktion="pbZoom" data-pb-zoom="0">Ganzes '
      + "Blatt</button>"
      + '<span style="flex:1"></span>' + legende()
      + "</div>"
      + (b && b.seite && b.seite.massstab && b.seite.massstab.belastbar
        ? '<div class="pbleiste" style="border-top:0;padding-top:0">'
          + "<span>Zu einem ausgewählten Raum wird ein gestricheltes Quadrat "
          + "seiner Fläche im Maßstab des Blattes gezeichnet (1:"
          + esc(String(b.seite.massstab.nenner)) + "). Es ist kein Raumumriss, "
          + "sondern die Probe: passt die Zahl zu dem, was darunter steht? Dazu "
          + "hineinzoomen.</span></div>"
        : "")
      + "</div>"
      + '<div class="pbliste">'
      + (mit.length
        ? '<p class="pbabschnitt">' + mz(mit.length, "Raum auf dem Blatt",
            "Räume auf dem Blatt") + "</p>"
          + mit.map(function (x) { return raumkarte(x, true); }).join("")
        : "")
      + (ohne.length
        ? '<p class="pbabschnitt">' + mz(ohne.length, "Raum ohne Ort",
            "Räume ohne Ort") + "</p>"
          + '<p style="font-size:12.5px;color:var(--mute);margin:0 0 4px;'
          + 'line-height:1.45">' + esc(ohneOrtGrund(b))
          + "</p>"
          + ohne.map(function (x) { return raumkarte(x, false); }).join("")
        : "")
      + (!eigene.length
        ? '<div class="meldung warnung">' + window.ikon("warnung")
          + "<div>Auf diesem Blatt ist kein Raum im Raumbuch. Entweder trägt es "
          + "keinen Grundriss, oder das Auslesen hat nichts gefunden. Beides "
          + "gehört geprüft, bevor gerechnet wird.</div></div>"
        : "")
      + "</div></div>"
      + "</div>";
  }

  /** Warum ein Raum keinen Ort hat — am Blatt festgemacht, nicht allgemein. */
  function ohneOrtGrund(b) {
    const s = b && b.seite;
    if (!s) {
      return "Diese Räume gehören zu keinem abgelegten Blatt; sie wurden von "
        + "Hand angelegt oder ihr Blatt ist nicht mehr im Projekt.";
    }
    if (!s.hatTextlayer) {
      return "Dieses Blatt ist ein Scan ohne Textstand. Das Modell liest die "
        + "Räume aus dem Bild, gibt dabei aber keine Koordinaten zurück — es "
        + "gibt hier keinen Ort, den man belegen könnte. Die Zeilen unten sind "
        + "gegen den Plan daneben zu halten.";
    }
    return "Für diese Räume war im Textstand des Blattes keine eindeutige "
      + "Beschriftung zu finden. Ein Name, der mehrfach dasteht, bekommt keine "
      + "Marke: eine falsch gesetzte führt beim Prüfen an die falsche Stelle.";
  }

  /** Der Plan für die Ergebnisseite: dieselbe Zeichenfläche, dieselben
   *  Marken, dieselbe Ampelfarbe — nur ohne die Prüf-Liste daneben, denn
   *  daneben steht dort die Tabelle der Raumheizlasten. Die Watt an den
   *  Marken kommen über S.watt (siehe oben). Bedient wird alles über die
   *  vorhandenen Wege: aktivieren(), pbBlatt, pbZoom. */
  function ergebnisPlanHtml() {
    const p = projekt();
    if (!p) return "";
    const st = standJetzt(p);
    const bs = blaetter(p).filter(function (x) { return !!x.seite; });
    const b = aktuellesBlatt(p, st);
    if (!bs.length || !b || !b.seite) return "";
    return stil()
      + '<div id="planblatt">'
      + (bs.length > 1
        ? '<div class="pbwahl"><span class="lab">Blatt:</span>'
          + bs.map(function (x) {
              return '<button class="btn klein'
                + (b.schluessel === x.schluessel ? " an" : "")
                + '" data-aktion="pbBlatt" data-pb-blatt="' + esc(x.schluessel)
                + '">' + esc(x.titel) + "</button>";
            }).join("")
          + "</div>"
        : "")
      + '<div class="pbplan">'
      + '<canvas id="pbcanvas" width="1100" height="' + FLAECHE_HOCH
      + '" role="img" aria-label="Grundriss mit der Heizlast je Raum"></canvas>'
      + '<div class="pbleiste">'
      + '<button class="btn klein nurikon" data-aktion="pbZoom" data-pb-zoom="-1" '
      + 'aria-label="Verkleinern">' + window.ikon("minus") + "</button>"
      + '<button class="btn klein nurikon" data-aktion="pbZoom" data-pb-zoom="1" '
      + 'aria-label="Vergrößern">' + window.ikon("plus") + "</button>"
      + '<button class="btn klein" data-aktion="pbZoom" data-pb-zoom="0">Ganzes '
      + "Blatt</button>"
      + '<span style="flex:1"></span>'
      + "<span>Watt je Raum an der Marke; Farbe wie im Kontrollblatt</span>"
      + "</div></div></div>";
  }

  /* =====================================================================
   * Teil E — Bedienung
   * ================================================================== */

  function zuBild(ev) {
    const c = cv(), r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    return { x: ((ev.clientX - r.left) * sx - S.panX) / S.zoom,
             y: ((ev.clientY - r.top) * sy - S.panY) / S.zoom };
  }

  function markeUnter(pt) {
    let best = null, bestD = Infinity;
    const grenze = 16 / S.zoom;
    S.marken.forEach(function (m) {
      const d = Math.hypot(m.x - pt.x, m.y - pt.y);
      if (d < grenze && d < bestD) { bestD = d; best = m; }
    });
    return best;
  }

  /** Einen Raum auswählen: Marke hervorheben und zur Zeile daneben springen.
   *  Der Weg dorthin ist der vorhandene — dieselbe Zeile mit denselben
   *  data-kb-Merkmalen, die auch das Kontrollblatt schreibt. */
  function waehlen(id) {
    S.gewaehlt = id;
    zeichnen();
    /* Auf der Ergebnisseite gehört zum Klick auf die Marke keine Zeile in
       diesem Modul, sondern die Zusammensetzung des Raums drüben. Der
       Rückweg ist eingehängt, solange die Ergebnisseite steht. */
    if (typeof S.beiWahl === "function") { S.beiWahl(id); return; }
    const el = document.querySelector('#planblatt [data-pb-raum="'
      + String(id).replace(/"/g, "") + '"]');
    if (!el) return;
    document.querySelectorAll("#planblatt .pbz.aktiv").forEach(function (x) {
      x.classList.remove("aktiv");
    });
    el.classList.add("aktiv");
    if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    el.focus({ preventScroll: true });
  }

  function zoomSetzen(neu, halten) {
    const c = cv();
    if (!c || !S.bild) return;
    const alt = S.zoom;
    const min = Math.min(c.width / S.bild.width, c.height / S.bild.height) * 0.9;
    S.zoom = Math.max(min, Math.min(12, neu));
    const h = halten || { x: c.width / 2, y: c.height / 2 };
    S.panX = h.x - (h.x - S.panX) * (S.zoom / alt);
    S.panY = h.y - (h.y - S.panY) * (S.zoom / alt);
    zeichnen();
  }

  function blattLaden(b) {
    const seite = b && b.seite;
    S.bildFuer = b ? b.schluessel : null;
    S.bild = null; S.fehler = null; S.dpi = null;
    if (!seite || typeof seite.rendern !== "function") {
      S.laeuft = false;
      S.fehler = seite
        ? "Dieses Blatt liegt nur noch als Auswertung vor, nicht mehr als "
          + "Zeichnung. Nach dem Wiederherstellen einer Sicherung ist das so."
        : "Zu diesen Räumen gehört kein Blatt.";
      zeichnen();
      return;
    }
    S.laeuft = true;
    zeichnen();
    const skala = seite.breite_pt > 0 ? ZIELBREITE_PX / seite.breite_pt : null;
    seite.rendern(skala ? { skala: skala } : {}).then(function (r) {
      const quelle = r.canvas || r.bild;
      if (!quelle) throw new Error("kein Bild");
      S.dpi = r.dpi || (skala ? skala * 72 : null);
      const fertig = function (bild) {
        S.bild = bild; S.laeuft = false;
        einpassen(); S.neuEinpassen = false; zeichnen();
      };
      if (quelle.width || quelle.naturalWidth) fertig(quelle);
      else throw new Error("leeres Bild");
    }).catch(function (e) {
      S.laeuft = false;
      S.fehler = "Das Blatt liess sich nicht zeichnen: "
        + String((e && e.message) || e);
      zeichnen();
    });
  }

  function verdrahten() {
    const c = cv();
    if (!c) return;
    /* Die Zeichenfläche wird bei jedem Neuzeichnen neu gebaut; ihre
       Ereignisse gehören deshalb an sie und nicht an das Dokument. */
    c.onmousedown = function (ev) {
      S.ziehen = true; S.gezogen = false;
      S.zieh0 = { x: ev.clientX, y: ev.clientY, panX: S.panX, panY: S.panY };
      c.classList.add("zieht");
    };
    c.onmousemove = function (ev) {
      if (!S.ziehen || !S.zieh0) return;
      const r = c.getBoundingClientRect();
      const sx = c.width / r.width;
      const dx = (ev.clientX - S.zieh0.x) * sx, dy = (ev.clientY - S.zieh0.y) * sx;
      if (Math.abs(dx) + Math.abs(dy) > 3) S.gezogen = true;
      S.panX = S.zieh0.panX + dx; S.panY = S.zieh0.panY + dy;
      zeichnen();
    };
    const los = function () { S.ziehen = false; c.classList.remove("zieht"); };
    c.onmouseup = los;
    c.onmouseleave = los;
    c.onclick = function (ev) {
      if (S.gezogen) { S.gezogen = false; return; }
      if (!S.bild) return;
      const m = markeUnter(zuBild(ev));
      if (m) waehlen(m.id);
    };
    c.onwheel = function (ev) {
      if (!S.bild) return;
      ev.preventDefault();
      const r = c.getBoundingClientRect();
      const sx = c.width / r.width;
      const halten = { x: (ev.clientX - r.left) * sx, y: (ev.clientY - r.top) * sx };
      zoomSetzen(S.zoom * (ev.deltaY < 0 ? 1.18 : 1 / 1.18), halten);
    };
    /* Ein Klick in die Liste hebt dieselbe Marke hervor. Beides ist derselbe
       Vorgang, nur von der anderen Seite angefasst. */
    if (!S.verdrahtet) {
      document.addEventListener("click", function (ev) {
        const z = ev.target.closest ? ev.target.closest("#planblatt [data-pb-raum]") : null;
        if (!z) return;
        if (ev.target.closest("[data-aktion]")) return;
        S.gewaehlt = z.dataset.pbRaum;
        zeichnen();
        document.querySelectorAll("#planblatt .pbz.aktiv").forEach(function (x) {
          x.classList.remove("aktiv");
        });
        z.classList.add("aktiv");
      });
      S.verdrahtet = true;
    }
  }

  function aktivieren() {
    const p = projekt();
    if (!p) return;
    const c = cv();
    if (c) {
      /* Die Zeichenfläche in ihrer wirklichen Breite anlegen, sonst ist der
         Plan weich gezeichnet und die Klickgenauigkeit eine andere als die
         angezeigte. Das Element ist nach jedem Neuzeichnen neu; die zuletzt
         verwendete Breite steht deshalb in S und nicht am Element. */
      const br = Math.max(320, Math.round(c.getBoundingClientRect().width));
      c.width = br;
      c.height = FLAECHE_HOCH;
      if (S.breite !== br) { S.breite = br; S.neuEinpassen = true; }
    }
    verdrahten();
    /* Das Kontrollblatt schreibt die Felder dieser Liste; seine Verdrahtung
       muss deshalb auch hier stehen. */
    const K = KB();
    if (K && typeof K.aktivieren === "function") K.aktivieren();
    const st = standJetzt(p);
    const b = aktuellesBlatt(p, st);
    if (!b) { zeichnen(); return; }
    if (S.bildFuer !== b.schluessel) blattLaden(b);
    else {
      if (S.bild && S.neuEinpassen) { einpassen(); S.neuEinpassen = false; }
      zeichnen();
    }
  }

  function aktion(name, el) {
    switch (name) {
      case "pbBlatt":
        S.blatt = el.dataset.pbBlatt;
        S.gewaehlt = null;
        S.bildFuer = null;
        S.neuEinpassen = true;
        return true;
      case "pbZoom": {
        const v = Number(el.dataset.pbZoom);
        if (v === 0) { einpassen(); zeichnen(); }
        else zoomSetzen(S.zoom * (v > 0 ? 1.5 : 1 / 1.5));
        S.neuEinpassen = false;
        return true;
      }
      default: return false;
    }
  }

  /* =====================================================================
   * Selbsttest
   * ================================================================== */
  function selbsttest() {
    const f = [];
    let n = 0;
    const pruef = function (b, t) { n++; if (!b) f.push(t); };

    /* --- Die Kopfzeile darf nichts beschoenigen ---------------------- */
    pruef(kopfzeile({ raeume: 13, pruefpunkte: 0, ohne_ort: 13 })
      === "13 Räume erkannt · nichts mehr zu prüfen · 13 ohne Ort im Plan",
      "Ohne Ort muss das in der Kopfzeile stehen, nicht nur \"0 Punkte pruefen\"");
    pruef(/1 Raum erkannt/.test(kopfzeile({ raeume: 1, pruefpunkte: 0, ohne_ort: 0 })),
      "Einzahl: \"1 Raum erkannt\"");
    pruef(/1 Punkt prüfen/.test(kopfzeile({ raeume: 4, pruefpunkte: 1, ohne_ort: 0 })),
      "Einzahl: \"1 Punkt pruefen\"");
    pruef(/alle im Plan gefunden/.test(
      kopfzeile({ raeume: 9, pruefpunkte: 2, ohne_ort: 0 })),
      "Sind alle verortet, sagt die Kopfzeile das ausdruecklich");
    pruef(!/ohne Ort/.test(kopfzeile({ raeume: 0, pruefpunkte: 0, ohne_ort: 0 })),
      "Ohne Raeume keine Ortsangabe");
    pruef(/2 Punkte prüfen/.test(kopfzeile({ raeume: 23, pruefpunkte: 2, ohne_ort: 0 })),
      "Der Fall aus der Anforderung: \"23 Raeume erkannt, 2 Punkte pruefen\"");

    pruef(/2 Räume mit unbelegter Fläche/.test(
      aufschluesselung({ raeume: 5, rot: 0, gelb: 2, gelb_flaeche: 2, gelb_hoehe: 0 })),
      "Die Aufschluesselung nennt die unbelegten Flaechen");
    pruef(/3 Räume mit angenommener Höhe/.test(
      aufschluesselung({ raeume: 5, rot: 0, gelb: 3, gelb_flaeche: 0, gelb_hoehe: 3 })),
      "und die angenommenen Hoehen einzeln -- die beiden bedeuten "
      + "verschiedene Arbeit");
    pruef(/ohne Fläche/.test(aufschluesselung({ raeume: 5, rot: 1, gelb: 0 })),
      "und die fehlenden Angaben");
    pruef(/durchgegangen/.test(aufschluesselung({ raeume: 5, rot: 0, gelb: 0 })),
      "Ist nichts offen, sagt sie das");

    /* --- Der Stand gegen das Kontrollblatt --------------------------- */
    {
      const K = window.MODUL_KONTROLLBLATT;
      pruef(!!K && typeof K.raumAmpel === "function",
        "Die Ampel kommt aus dem Kontrollblatt und nicht aus einer zweiten Regel");
      if (K && K.raumAmpel) {
        pruef(K.raumAmpel({ maengel: ["keine Fläche"], gesehen: true,
          klasseA: "A", klasseH: "A" }) === "mangel", "Ein Mangel schlaegt alles");
        pruef(K.raumAmpel({ maengel: [], gesehen: true, klasseA: "C", klasseH: "C" })
          === "gesehen", "Durchgegangen schlaegt die Annahme");
        pruef(K.raumAmpel({ maengel: [], gesehen: false, klasseA: "C", klasseH: "A" })
          === "annahme", "Eine unbelegte Flaeche ist gelb");
        /* Der Fall, an dem die Kopfzeile am 23.08.2026 log: Flaeche belegt,
           Hoehe die Vorbelegung 2,60 m -- und alles stand auf gruen. */
        pruef(K.raumAmpel({ maengel: [], gesehen: false, klasseA: "A", klasseH: "C" })
          === "annahme", "Eine angenommene HOEHE ist ebenfalls gelb");
        pruef(K.raumAmpel({ maengel: [], gesehen: false, klasseA: "A", klasseH: "A" })
          === "", "Erst wenn beides belegt ist, wird die Zeile gruen");
        pruef(K.annahmegrund({ klasseA: "A", klasseH: "C" }).join()
          === "Höhe nicht belegt", "Der Grund wird benannt, nicht nur die Farbe");
        pruef(K.annahmegrund({ klasseA: "C", klasseH: "C" }).length === 2,
          "Zwei Gruende werden auch beide genannt");
      }
      const st = stand({ raeume: [], bauteiltypen: [] }, {});
      pruef(st.raeume === 0 && st.pruefpunkte === 0,
        "Ein leeres Projekt ergibt einen leeren Stand");
      pruef(stand(null, {}).raeume === 0, "Ohne Projekt kein Absturz");
    }
    {
      /* Ein Projekt mit drei Raeumen: einer belegt, einer Annahme, einer ohne
         Flaeche. Der Stand muss genau das zaehlen, und die Kopfzeile es
         sagen. */
      const p = {
        meta: {}, klima: {}, zonen: [], bauteiltypen: [
          { id: "bw", name: "Außenwand", U: 1.2 }],
        herkunft: {
          "raum.a.A": { herkunft: "plan_gelesen", konfidenz: "sicher",
                        fundstelle: "Flächenstempel", quelle: "Grundriss EG" },
          "raum.a.h": { herkunft: "plan_gelesen", konfidenz: "sicher",
                        fundstelle: "Schnitt", quelle: "Schnitt A-A" },
        },
        raeume: [
          { id: "a", name: "Bad", geschoss: "EG", A: 8, h: 2.5, we: "WE 1",
            lage: { x: 0.3, y: 0.4, blatt: "Grundriss EG" },
            bauteile: [{ typ_id: "bw", name: "Außenwand", A: 9, kat: "huelle",
                         grenzt_an: { typ: "aussen" } }] },
          { id: "b", name: "Flur", geschoss: "EG", A: 5, h: 2.5, we: "WE 1",
            bauteile: [{ typ_id: "bw", name: "Außenwand", A: 6, kat: "huelle",
                         grenzt_an: { typ: "aussen" } }] },
          { id: "c", name: "Abstellen", geschoss: "EG", A: 0, h: 2.5, we: "WE 1",
            lage: { x: 0.7, y: 0.7, blatt: "Grundriss EG" }, bauteile: [] },
        ],
      };
      const st = stand(p, {});
      pruef(st.raeume === 3, "Drei Raeume gezaehlt");
      pruef(st.rot === 1, "Der Raum ohne Flaeche und ohne Huelle ist rot");
      pruef(st.gelb === 1, "Der Raum mit unbelegter Flaeche ist gelb");
      pruef(st.gruen === 1, "Der belegte Raum ist gruen");
      pruef(st.pruefpunkte === 2, "Zwei Punkte zu pruefen");
      pruef(st.mit_ort === 2 && st.ohne_ort === 1,
        "Zwei Raeume haben einen Ort, einer nicht");
      pruef(kopfzeile(st) === "3 Räume erkannt · 2 Punkte prüfen · 1 ohne Ort im Plan",
        "Die Kopfzeile sagt alle drei Zahlen: " + kopfzeile(st));
      pruef((st.blaetter || []).length === 2,
        "Zwei Gruppen: das Blatt und die Raeume ohne Blatt");
      const g = st.blaetter.find(function (x) { return x.schluessel === "Grundriss EG"; });
      pruef(!!g && g.raeume === 2 && g.mit_ort === 2,
        "Die Blattgruppe zaehlt ihre Raeume und ihre Marken");

      /* Die Liste daneben darf keinen Raum verlieren. */
      const mit = raeumeDesBlatts(st, "Grundriss EG");
      const ohne = raeumeDesBlatts(st, "");
      pruef(mit.length + ohne.length === st.raeume,
        "Jeder Raum steht in genau einer Liste");
    }
    {
      /* Ein reiner Scan: Raeume ja, Marken nein. Genau der Fall, in dem eine
         Ueberlagerung stillschweigend leer waere. */
      /* Wie nach einem echten Scan-Durchlauf: das Modell hat Fläche und Höhe
         gelesen und nennt sich sicher, also stehen beide in Klasse A. Nur
         einen Ort gibt es nicht. */
      const belegt = { herkunft: "plan_gelesen", konfidenz: "sicher",
                       fundstelle: "aus dem Bild gelesen", quelle: "Scan.pdf" };
      const hk = {};
      [1, 2, 3].forEach(function (i) {
        hk["raum.s" + i + ".A"] = belegt;
        hk["raum.s" + i + ".h"] = belegt;
      });
      const p = { meta: {}, klima: {}, zonen: [], herkunft: hk,
        bauteiltypen: [{ id: "bw", name: "Außenwand", U: 1.2 }],
        raeume: [1, 2, 3].map(function (i) {
          return { id: "s" + i, name: "Raum " + i, geschoss: "EG", A: 10, h: 2.5,
            we: "WE 1", herkunft: { blatt: "Scan.pdf" },
            bauteile: [{ typ_id: "bw", name: "Außenwand", A: 9, kat: "huelle",
                         grenzt_an: { typ: "aussen" } }] };
        }) };
      const st = stand(p, {});
      pruef(st.ohne_ort === 3 && st.mit_ort === 0, "Der Scan hat keine Marken");
      pruef(/3 ohne Ort im Plan/.test(kopfzeile(st)),
        "und die Kopfzeile verschweigt das nicht: " + kopfzeile(st));
      /* Der Fall, an dem die Kopfzeile am 23.08.2026 im echten Durchlauf mit
         Sebastians Blatt sich selbst widersprach. */
      pruef(st.gruen === 3, "Die Werte dieser Raeume sehen belegt aus");
      pruef(st.ortlos === 3 && st.pruefpunkte === 3,
        "Trotzdem sind es drei Pruefpunkte: ansehen kann sie niemand");
      pruef(!/nichts mehr zu prüfen/.test(kopfzeile(st)),
        "Die Kopfzeile darf hier NICHT Ruhe melden: " + kopfzeile(st));
      pruef(/ohne Marke, von Hand gegen den Plan/.test(aufschluesselung(st)),
        "und die Zeile darunter sagt, was zu tun ist");
      /* Und sie schliessen sich mit demselben Haken wie jede andere Zeile. */
      p.kontrollblatt = { gesehen: {} };
      (p.raeume || []).forEach(function (r) {
        p.kontrollblatt.gesehen["raum." + r.id] = { von: "Probe" };
      });
      const st2 = stand(p, {});
      pruef(st2.ortlos === 0 && st2.pruefpunkte === 0,
        "Durchgegangen schliesst auch einen Raum ohne Marke");
      pruef(/nichts mehr zu prüfen/.test(kopfzeile(st2)),
        "Erst dann meldet die Kopfzeile Ruhe: " + kopfzeile(st2));
    }

    /* --- Bloedsinn darf nicht zur Marke werden ----------------------- */
    {
      const p = { meta: {}, klima: {}, zonen: [], bauteiltypen: [],
        raeume: [{ id: "a", name: "Bad", A: 8, h: 2.5, we: "WE 1",
                   lage: { x: 4, y: 0.2, blatt: "X" }, bauteile: [] }] };
      pruef(stand(p, {}).mit_ort === 0,
        "Eine Lage ausserhalb des Blattes gilt nicht als Ort");
    }

    /* --- Blattzuordnung ---------------------------------------------- */
    pruef(blattVon({ lage: { blatt: "A" }, herkunft: { blatt: "B" } }) === "A",
      "Die Lage bestimmt das Blatt, nicht die Herkunft");
    pruef(blattVon({ herkunft: { blatt: "B" } }) === "B",
      "Ohne Lage gilt die Herkunft");
    pruef(blattVon({}) === null, "Ein Raum ohne beides gehoert zu keinem Blatt");

    /* --- Watt-Beschriftung der Ergebnisseite ------------------------- */
    pruef(wattText(512.4) === "512 W", "Watt ganzzahlig: " + wattText(512.4));
    pruef(wattText(1234.6) === "1.235 W",
      "Watt mit Tausendermarke: " + wattText(1234.6));
    {
      /* Der Ergebnis-Plan zeichnet nur, wenn ein Blatt da ist; ohne Blatt
         darf er nicht so tun, als gaebe es etwas zu sehen. */
      const altApp = window.App;
      window.App = { p: { meta: {}, klima: {}, zonen: [], raeume: [],
        bauteiltypen: [], plan: { seiten: [] } } };
      pruef(ergebnisPlanHtml() === "",
        "Ohne Blatt kein Plan auf der Ergebnisseite");
      window.App.p.plan.seiten = [{ nr: 1, name: "Grundriss EG",
        typ: "vektor", bezeichnung: "Grundriss EG" }];
      const eh = ergebnisPlanHtml();
      pruef(eh.indexOf('id="pbcanvas"') > 0,
        "Mit Blatt steht die Zeichenflaeche im Ergebnis-Plan");
      pruef(eh.indexOf('data-aktion="pbZoom"') > 0,
        "Der Ergebnis-Plan bietet die vorhandenen Zoomknoepfe an");
      pruef(eh.indexOf('class="pbwahl"') < 0,
        "Bei nur einem Blatt keine Blattwahl");
      window.App = altApp;
    }
    {
      /* Der Rueckweg beiWahl: waehlen() muss ihn rufen und danach nicht in
         die Prueflisten-Logik weiterlaufen. */
      const altBei = S.beiWahl, altGew = S.gewaehlt;
      let bekommen = null;
      S.beiWahl = function (id) { bekommen = id; };
      waehlen("r_probe");
      pruef(bekommen === "r_probe" && S.gewaehlt === "r_probe",
        "waehlen() ruft beiWahl mit der Raumkennung und merkt die Wahl");
      S.beiWahl = altBei; S.gewaehlt = altGew;
    }

    return { ok: f.length === 0, fehler: f, anzahl: n };
  }

  window.MODUL_PRUEFBLATT = {
    html: html,
    ergebnisPlanHtml: ergebnisPlanHtml,
    aktivieren: aktivieren,
    aktion: aktion,
    /* Rechenteil, DOM-frei und einzeln prüfbar */
    stand: stand,
    kopfzeile: kopfzeile,
    aufschluesselung: aufschluesselung,
    blattVon: blattVon,
    blaetter: blaetter,
    zustand: S,
    selbsttest: selbsttest,
  };
})();
