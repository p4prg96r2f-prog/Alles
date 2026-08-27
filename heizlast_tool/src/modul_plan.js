/* ===========================================================================
 * modul_plan.js — Plan digitalisieren: Maßstab messen, Raumpolygone klicken
 * ===========================================================================
 * Läuft vollständig lokal im Browser. Kein Netz, keine Bibliothek.
 *
 * Maßstab: Zuerst versucht das Werkzeug immer, ihn aus der Unterlage selbst zu
 * holen (Schriftfeld, Maßketten, Blattformat). Bleibt das ohne Ergebnis oder
 * ist es nicht belastbar, wird hier gemessen: der Bearbeiter zieht im Plan
 * eine Strecke über etwas, dessen Länge er kennt, und trägt diese Länge ein.
 * Aus Bildpunkten und Metern folgt der Maßstab.
 *
 * Weil ein Klick nicht beliebig genau sitzt, rechnet kern_messen.js zu jeder
 * Strecke die Unsicherheit aus und zeigt sie während des Messens an. Zwei
 * Messungen an verschiedenen Stellen des Blattes sind die Gegenprobe: ein
 * schief aufgenommener Plan fällt genau dabei auf.
 * =========================================================================== */
"use strict";

(function () {
  const S = {
    bild: null,            // HTMLImageElement
    zoom: 1, panX: 0, panY: 0,
    modus: "ansehen",      // ansehen | massstab | polygon
    mass: { p1: null, p2: null, meter: null, pxProM: null },
    punkte: [],            // aktuelles Polygon in Bildkoordinaten
    polygone: [],          // [{name, punkte, flaeche, umfang, raumId}]
    ziehen: false, zieh0: null, gezogen: false,
    /* Messwerkzeug */
    messungen: [],         // angenommene Messungen, siehe kern_messen.js
    entwurf: null,         // laufende Strecke {p1, p2, zoom}
    linieZieht: false,
    zeiger: null,          // Zeigerstand für die Vorschaulinie
    bezugId: "masskette",
    bildDpi: null,         // Auflösung, mit der das Blatt gerendert wurde
    seitenIndex: null,     // Platz der Seite im Stapel, für die Rückgabe
    zusammen: null,        // Ergebnis von KERN_MESSEN.zusammenfassen
    kreuz: null,           // Ergebnis von KERN_MESSEN.kreuzprobe
    entwurfMeter: "",      // was im Eingabefeld steht, über das Neuzeichnen hinweg
    /* Eine angeforderte Seite wird geladen; das dauert, weil erst gerendert
       werden muss. Solange darf aktivieren() nicht von selbst die erste Seite
       des Stapels laden — sonst gewinnt der Selbstlader das Rennen und der
       Bearbeiter sieht ein anderes Blatt als das, auf das er geklickt hat. */
    ladenLaeuft: false,
  };

  const KM = function () {
    return (typeof window !== "undefined" && window.KERN_MESSEN) || null;
  };

  function cv() { return document.getElementById("plancanvas"); }
  const rnd = (x, n) => Number(x).toFixed(n === undefined ? 2 : n);
  /* Zahl mit Hauptwort in der richtigen Zahlform. „1 Räume", „1 Seiten":
     ein Zähler, der nicht zählen kann, macht misstrauisch gegen jede
     andere Zahl auf dem Blatt. mz(1, "Raum", "Räume") -> "1 Raum". */
  const mz = (n, ein, mehr) => n + " " + (Math.abs(Number(n)) === 1 ? ein : mehr);
  /* Beschriftungen im Plan in deutscher Schreibweise */
  const de = (x, n) => Number(x).toLocaleString("de-DE",
    { minimumFractionDigits: n === undefined ? 2 : n,
      maximumFractionDigits: n === undefined ? 2 : n });

  /* ---------------- Geometrie ---------------- */
  function flaeche(pts) {          // Gauß'sche Trapezformel
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) / 2;
  }
  function umfang(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return s;
  }
  function kanten(pts) {
    const k = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      k.push({ i: i, laenge: Math.hypot(b.x - a.x, b.y - a.y), a: a, b: b });
    }
    return k;
  }

  /* ---------------- Zeichnen ---------------- */
  /* Höchste Höhe der Zeichenfläche in Punkten. Darüber passt sie auf einem
     Notebook nicht mehr mit Werkzeugleiste und Statuszeile auf den Schirm;
     was nicht hineinpasst, wird verschoben statt gequetscht. */
  const FLAECHE_HOCH_MAX = 820;

  /** Die Zeichenfläche an das Bild anpassen.
   *
   *  Muss bei JEDEM Zeichnen laufen, nicht nur beim Laden: die Seite wird als
   *  Ganzes neu gebaut, dabei entsteht die Zeichenfläche neu und kommt mit der
   *  Höhe aus der Vorlage zurück. Vorher stand nach jedem Neuzeichnen wieder
   *  520, und bei einem A1-Blatt fehlte über ein Viertel des Blattes unten —
   *  unsichtbar und nicht anklickbar, obwohl der Knopf "Blatt" heißt. */
  function flaecheAnpassen(c) {
    if (!S.bild) return;
    const soll = Math.max(420, Math.min(FLAECHE_HOCH_MAX,
      Math.round(S.bild.height * S.zoom)));
    if (c.height !== soll) c.height = soll;   // setzt die Fläche zurück, daher zuerst
  }

  function zeichnen() {
    const c = cv();
    if (!c) return;
    flaecheAnpassen(c);
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#F4F4F5";
    ctx.fillRect(0, 0, c.width, c.height);
    if (!S.bild) {
      /* #9AA0A6 auf #F4F4F5 kommt nur auf 2,4:1 und ist auf einem hellen
         Schirm kaum zu lesen. --mute-2 erreicht 5,1:1. */
      ctx.fillStyle = "#6E6866";
      ctx.font = "15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Plan hierher ziehen, einfügen (Cmd+V) oder auswählen",
        c.width / 2, c.height / 2);
      return;
    }
    ctx.setTransform(S.zoom, 0, 0, S.zoom, S.panX, S.panY);
    ctx.drawImage(S.bild, 0, 0);

    // fertige Polygone
    S.polygone.forEach(function (p, i) {
      malPolygon(ctx, p.punkte, "rgba(93,181,90,.18)", "#3E8A3C", 2 / S.zoom);
      const m = mitte(p.punkte);
      ctx.fillStyle = "#123A63";
      ctx.font = (14 / S.zoom) + "px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.name + "  " + de(p.flaeche, 2) + " m²", m.x, m.y);
    });

    // aktuelles Polygon
    if (S.punkte.length) {
      malPolygon(ctx, S.punkte, "rgba(18,58,99,.12)", "#123A63", 2 / S.zoom, S.punkte.length < 3);
      S.punkte.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / S.zoom, 0, 6.284);
        ctx.fillStyle = "#123A63";
        ctx.fill();
      });
    }

    // angenommene Messstrecken
    S.messungen.forEach(function (m, i) {
      if (!m.p1 || !m.p2) return;
      malStrecke(ctx, m.p1, m.p2, "#3E8A3C",
        (i + 1) + "  " + de(m.meter, 2) + " m");
    });

    // laufende Messstrecke
    const e = entwurfsstrecke();
    if (e) malStrecke(ctx, e.p1, e.p2, "#F5C542",
      mz(Math.round(Math.hypot(e.p2.x - e.p1.x, e.p2.y - e.p1.y) * zoomSchirm()),
         "Punkt", "Punkte"));
  }

  /** Eine Messstrecke mit Endmarken und Beschriftung. */
  function malStrecke(ctx, p1, p2, farbe, text) {
    const z = S.zoom;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = farbe;
    ctx.lineWidth = 2.5 / z;
    ctx.stroke();
    /* Endmarken quer zur Strecke: so ist zu sehen, wo genau der Punkt sitzt,
       auch wenn die Strecke auf einer Linie des Plans liegt. */
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const l = Math.hypot(dx, dy) || 1;
    const qx = -dy / l * 7 / z, qy = dx / l * 7 / z;
    [p1, p2].forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo(p.x - qx, p.y - qy);
      ctx.lineTo(p.x + qx, p.y + qy);
      ctx.stroke();
    });
    if (!text) return;
    const m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const gr = 13 / z;
    ctx.font = "600 " + gr + "px Inter, sans-serif";
    ctx.textAlign = "center";
    const br = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillRect(m.x - br / 2 - 5 / z, m.y - gr * 1.7, br + 10 / z, gr * 1.35);
    ctx.fillStyle = farbe;
    ctx.fillText(text, m.x, m.y - gr * 0.7);
  }

  /** Die Strecke, die gerade gezogen oder auf ihren zweiten Punkt wartet. */
  function entwurfsstrecke() {
    if (!S.entwurf || !S.entwurf.p1) return null;
    const p2 = S.entwurf.p2 || S.zeiger;
    if (!p2) return null;
    return { p1: S.entwurf.p1, p2: p2 };
  }

  function malPolygon(ctx, pts, fill, stroke, lw, offen) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (!offen) ctx.closePath();
    if (!offen) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  function mitte(pts) {
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: x, y: y };
  }

  function zuBild(ev) {
    const c = cv(), r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    return { x: ((ev.clientX - r.left) * sx - S.panX) / S.zoom,
             y: ((ev.clientY - r.top) * sy - S.panY) / S.zoom };
  }

  /** Vergrößerung, wie sie beim Klicken wirklich wirkt.
   *
   *  S.zoom rechnet Bildpunkte in Zeichenflächenpunkte um. Die Zeichenfläche
   *  wird aber vom Stylesheet auf die Spaltenbreite gestaucht. Für die
   *  Klickgenauigkeit zählt allein, wie viele echte Bildschirmpunkte ein
   *  Bildpunkt einnimmt; nur diese Zahl darf in die Unsicherheit eingehen.
   *  Sonst rechnet sich das Werkzeug schön. */
  function zoomSchirm() {
    const c = cv();
    if (!c) return S.zoom;
    const r = c.getBoundingClientRect();
    if (!r.width || !c.width) return S.zoom;
    return S.zoom * (r.width / c.width);
  }

  /* ---------------- Bild laden ---------------- */
  /** Erzeugt eine Abbildung fuer den Bericht: Originalplan mit den Eintragungen
   *  aus der Auswertung in Gruen. Alles Uebrige bleibt Originalbestand. */
  function abbildung(maxBreite) {
    if (!S.bild) return null;
    const b = maxBreite || 1600;
    const f = Math.min(1, b / S.bild.width);
    const c = document.createElement("canvas");
    c.width = Math.round(S.bild.width * f);
    c.height = Math.round(S.bild.height * f);
    const x = c.getContext("2d");
    x.drawImage(S.bild, 0, 0, c.width, c.height);
    x.save();
    x.scale(f, f);

    const gruen = "#3E8A3C";
    const strich = Math.max(1.4, 2 / f);
    // Massstabsstrecke
    if (S.mass.p1 && S.mass.p2 && S.mass.meter) {
      x.beginPath();
      x.moveTo(S.mass.p1.x, S.mass.p1.y);
      x.lineTo(S.mass.p2.x, S.mass.p2.y);
      x.strokeStyle = gruen; x.lineWidth = strich * 1.4;
      x.stroke();
      const m = { x: (S.mass.p1.x + S.mass.p2.x) / 2, y: (S.mass.p1.y + S.mass.p2.y) / 2 };
      beschriftung(x, de(S.mass.meter, 2) + " m", m.x, m.y - 10 / f, f, gruen);
    }
    // Raumpolygone mit Flaeche
    S.polygone.forEach(function (p) {
      x.beginPath();
      x.moveTo(p.punkte[0].x, p.punkte[0].y);
      p.punkte.forEach(function (q, i) { if (i) x.lineTo(q.x, q.y); });
      x.closePath();
      x.strokeStyle = gruen; x.lineWidth = strich;
      x.fillStyle = "rgba(93,181,90,.10)";
      x.fill(); x.stroke();
      const mi = mitte(p.punkte);
      beschriftung(x, p.name, mi.x, mi.y - 8 / f, f, gruen);
      beschriftung(x, de(p.flaeche, 2) + " m\u00b2", mi.x, mi.y + 12 / f, f, gruen);
    });
    x.restore();
    return c.toDataURL("image/jpeg", 0.86).split(",")[1];
  }

  function beschriftung(x, text, px, py, f, farbe) {
    const gr = Math.max(11, 15 / f);
    x.font = "600 " + gr + "px Inter, Arial, sans-serif";
    x.textAlign = "center";
    const br = x.measureText(text).width;
    x.fillStyle = "rgba(255,255,255,.92)";
    x.fillRect(px - br / 2 - 10 / f, py - gr * 0.85, br + 20 / f, gr * 1.25);
    x.fillStyle = farbe;
    x.fillText(text, px, py);
  }

  /** Auswertung ins Projekt schreiben, damit sie gespeichert und berichtet wird. */
  function inProjektSichern(bezeichnung) {
    const A = window.App;
    if (!A || !S.bild) return;
    if (!A.p.plan) A.p.plan = { bilder: [] };
    if (!A.p.plan.bilder) A.p.plan.bilder = [];
    const eintrag = {
      id: S.aktuelleId || ("plan_" + Date.now()),
      bezeichnung: bezeichnung || S.bezeichnung || "Planunterlage",
      abbildung: abbildung(1600),
      massstab_m_je_px: S.mass.pxProM ? 1 / S.mass.pxProM : null,
      raeume: S.polygone.map(function (p) {
        return { name: p.name, flaeche: Math.round(p.flaeche * 100) / 100,
                 umfang: Math.round(p.umfang * 100) / 100 };
      }),
    };
    S.aktuelleId = eintrag.id;
    const i = A.p.plan.bilder.findIndex(function (b) { return b.id === eintrag.id; });
    if (i >= 0) A.p.plan.bilder[i] = eintrag; else A.p.plan.bilder.push(eintrag);
  }

  /**
   * @param quelle  Bildquelle (Data-URL oder Objekt-URL)
   * @param o.dpi   Auflösung, mit der gerendert wurde. Ohne sie gibt es
   *                keinen Maßstabsnenner, nur Bildpunkte je Meter.
   * @param o.seitenIndex  Platz der Seite im Stapel, für die Rückgabe
   */
  function bildLaden(quelle, o) {
    const opt = o || {};
    const img = new Image();
    img.onload = function () {
      S.ladenLaeuft = false;
      S.bild = img;
      const c = cv();
      const maxB = c.width;
      S.zoom = Math.min(1, maxB / img.width);
      S.panX = 0; S.panY = 0;
      S.punkte = []; S.polygone = []; S.mass = { p1: null, p2: null, meter: null, pxProM: null };
      /* Ein neues Blatt hat einen eigenen Maßstab. Messungen des vorigen
         Blattes hier stehen zu lassen, wäre der sicherste Weg zu einer
         falschen Fläche. */
      S.messungen = []; S.entwurf = null; S.entwurfMeter = ""; S.zusammen = null;
      S.kreuz = null;
      S.bildDpi = opt.dpi || null;
      S.seitenIndex = opt.seitenIndex == null ? null : opt.seitenIndex;
      S.aktuelleId = opt.aktuelleId || null;
      /* Was die Unterlage selbst hergibt, gilt zunächst. Gemessen wird erst,
         wenn hier nichts steht oder das Ergebnis gegengeprüft werden soll. */
      S.uebernommen = opt.uebernommen || null;
      if (S.uebernommen && S.uebernommen.pxProM > 0) {
        S.mass = { p1: null, p2: null, meter: null, pxProM: S.uebernommen.pxProM };
      }
      /* Die Höhe setzt flaecheAnpassen in zeichnen(), damit es genau eine
         Stelle gibt, die sie kennt. */
      pruefeEignung();
      zeichnen();
      status();
      if (window.render) window.render();
    };
    img.onerror = function () {
      S.ladenLaeuft = false;
      melde("Das Bild konnte nicht geladen werden.", { stufe: "fehler" });
    };
    img.src = quelle;
  }

  /* Meldungen und Rueckfragen ueber modul_dialog.js. Ein alert() haelt den
     ganzen Tab an; beim Zeichnen und Messen heisst das, dass die Flaeche
     mitten in der Bewegung stehen bleibt. */
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

  /** Eignungsprüfung der geladenen Unterlage. Läuft rein lokal. */
  function pruefeEignung() {
    const KP = window.KERN_PLANPRUEFUNG;
    S.eignung = null;
    S.freigabeGrund = "";
    if (!KP || !S.bild) return;
    const c = document.createElement("canvas");
    // für die Prüfung auf handliche Größe bringen, Kennwerte bleiben aussagekräftig
    const f = Math.min(1, 1800 / Math.max(S.bild.width, S.bild.height));
    c.width = Math.round(S.bild.width * f);
    c.height = Math.round(S.bild.height * f);
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(S.bild, 0, 0, c.width, c.height);
    try {
      S.eignung = KP.pruefeBild(x.getImageData(0, 0, c.width, c.height));
    } catch (e) {
      S.eignung = null;
    }
  }

  /** Gesamturteil einschließlich Maßstab. */
  function eignungGesamt() {
    const KP = window.KERN_PLANPRUEFUNG;
    if (!KP || !S.eignung) return null;
    if (!S.mass.pxProM) return S.eignung;
    return KP.verbinden(S.eignung, KP.pruefeMassstab(S.mass.pxProM));
  }

  /** Darf mit dieser Unterlage gearbeitet werden? */
  function freigegeben() {
    const e = eignungGesamt();
    if (!e) return true;                       // ohne Prüfmodul nicht blockieren
    return e.nutzbar || !!S.freigabeGrund;
  }

  function dateiLesen(f) {
    if (!f) return;
    if (f.type === "application/pdf") {
      melde("Bitte die Planseite als Bild ablegen: PDF in der Vorschau öffnen, "
        + "mit Cmd+Shift+4 einen Bildschirmausschnitt aufnehmen und ihn dann mit "
        + "Cmd+V hier einfügen. Der Maßstab wird ohnehin von Hand gesetzt, ein "
        + "Bildschirmfoto ist deshalb ausreichend genau.",
        { stufe: "warnung", titel: "PDF wird hier nicht direkt gerendert" });
      return;
    }
    if (!/^image\//.test(f.type)) {
      melde("Bitte eine Bilddatei ablegen.", { stufe: "warnung" });
      return;
    }
    const fr = new FileReader();
    fr.onload = () => bildLaden(fr.result);
    fr.readAsDataURL(f);
  }

  /* ---------------- Status ---------------- */
  function status() {
    const el = document.getElementById("planstatus");
    if (!el) return;
    el.innerHTML = statustext();
  }

  function statustext() {
    const K = KM();
    const m = S.mass;
    let t = "";
    if (!S.bild) return "Kein Plan geladen.";

    if (S.modus === "massstab") {
      const e = entwurfsstrecke();
      if (e && K) {
        /* Während des Ziehens steht hier, was die Strecke im Augenblick
           wert wäre. Sonst merkt niemand, dass 50 Punkte etwas ganz anderes
           tragen als 800. */
        const L = Math.hypot(e.p2.x - e.p1.x, e.p2.y - e.p1.y);
        const u = K.unsicherheit({ laenge_px_bild: L, zoom: S.entwurf.zoom });
        const marke = { gut: "genau genug", knapp: "brauchbar, nicht abgesichert",
                        zu_kurz: "zu kurz" }[u.stufe];
        t = "<b>" + Math.round(u.laenge_px_schirm) + " Bildschirmpunkte</b> &middot; "
          + "Klickfehler daraus ±" + de(u.u_klick_rel * 100, 2) + " Prozent im Maßstab, "
          + "±" + de(u.u_klick_rel * 200, 2) + " Prozent in jeder Fläche &middot; "
          + marke;
      } else if (S.entwurf) {
        t = "<b>Zweiten Punkt anklicken.</b> Abbrechen mit Esc.";
      } else {
        t = "<b>Messen:</b> über eine Strecke ziehen, deren Länge bekannt ist "
          + "(oder Anfang und Ende einzeln anklicken). "
          + "Mausrad zoomt, Umschalttaste plus Ziehen verschiebt.";
      }
      t += " &middot; Vergrößerung " + de(zoomSchirm() * 100, 0) + " Prozent";
      return t;
    }

    if (!m.pxProM) {
      t = "<b>Erst der Maßstab.</b> Auf \"Maßstab messen\" klicken und eine Strecke "
        + "ziehen, deren Länge bekannt ist.";
    } else if (vorbelegungAktiv()) {
      /* Die Vorbelegung darf nicht aussehen wie ein belegter Maßstab. Sie
         steht hier mit Folge und Ausweg: alle umfahrenen Flächen skalieren
         mit ihr, und eine gemessene Strecke ersetzt sie. */
      t = "<b>Maßstab 1:100 vorbelegt</b> — auf dem Blatt wurde kein Maßstab "
        + "gefunden. Alle umfahrenen Flächen skalieren mit dem Maßstab; mit "
        + "\"Maßstab messen\" an einer bemaßten Strecke prüfen. ";
      t += S.modus === "polygon"
        ? "<b>Raum zeichnen:</b> Ecken anklicken, Doppelklick schließt den Raum."
        : "Weiter mit \"Raum zeichnen\".";
    } else {
      t = "<b>Maßstab:</b> " + de(m.pxProM, 1) + " Bildpunkte je Meter";
      if (S.zusammen) {
        t += " (±" + de(S.zusammen.u_rel * 100, 2) + " Prozent aus "
          + S.zusammen.anzahl + (S.zusammen.anzahl === 1 ? " Messung)" : " Messungen)");
      }
      t += ". ";
      t += S.modus === "polygon"
        ? "<b>Raum zeichnen:</b> Ecken anklicken, Doppelklick schließt den Raum."
        : "Weiter mit \"Raum zeichnen\".";
    }
    if (S.punkte.length) t += " Aktuell " + mz(S.punkte.length, "Punkt", "Punkte") + ".";
    return t;
  }

  /* ---------------- Ereignisse ---------------- */
  /* Fenster- und Dokumentenereignisse nur einmal anmelden. Die Zeichenfläche
     wird bei jedem Neuzeichnen der Seite neu erzeugt, die Fensterereignisse
     würden sich sonst mit jeder Anzeige vervielfachen. */
  let weltVerdrahtet = false;

  function verdrahten() {
    const c = cv();
    if (!c || c.dataset.verdrahtet) return;
    c.dataset.verdrahtet = "1";

    c.addEventListener("mousedown", function (ev) {
      if (!S.bild) return;
      /* Verschieben: mittlere Taste, Umschalttaste oder Ansehen-Betrieb.
         Beim Messen ist das der Weg, mit dem man sich über ein großes Blatt
         bewegt, ohne die Strecke zu verlieren. */
      if (ev.button === 1 || ev.shiftKey || S.modus === "ansehen") {
        S.ziehen = true; S.gezogen = false;
        S.zieh0 = { x: ev.clientX, y: ev.clientY, panX: S.panX, panY: S.panY };
        ev.preventDefault();
        return;
      }
      if (ev.button !== 0) return;
      if (S.modus === "massstab") {
        const p = zuBild(ev);
        if (S.entwurf && S.entwurf.p1 && !S.entwurf.p2) {
          /* Der erste Punkt sitzt schon, dies ist der zweite Klick. */
          S.entwurf.p2 = p;
          S.linieZieht = false;
          streckeFertig();
        } else {
          S.entwurf = { p1: p, p2: null, zoom: zoomSchirm() };
          S.zeiger = p;
          S.linieZieht = true;
          zeichnen(); status();
        }
        ev.preventDefault();
      }
    });

    c.addEventListener("mousemove", function (ev) {
      if (!S.bild) return;
      if (S.modus !== "massstab" || S.ziehen) return;
      if (!S.entwurf || !S.entwurf.p1 || S.entwurf.p2) return;
      S.zeiger = zuBild(ev);
      zeichnen(); status();
    });

    c.addEventListener("dblclick", function () {
      if (S.modus === "polygon" && S.punkte.length >= 3) polygonAbschliessen();
    });

    c.addEventListener("wheel", function (ev) {
      if (!S.bild) return;
      ev.preventDefault();
      /* Der Punkt unter dem Zeiger muss stehen bleiben. Dafür wird er MIT DER
         ALTEN Vergrößerung bestimmt; mit der neuen gerechnet wandert das Bild
         unter dem Zeiger weg, und genau darauf kommt es beim genauen Klicken
         auf einem A1-Blatt an. */
      const vor = S.zoom;
      const p = zuBild(ev);
      zoomSetzen(S.zoom * (ev.deltaY < 0 ? 1.12 : 0.89), p, vor);
    }, { passive: false });

    if (!weltVerdrahtet) {
      weltVerdrahtet = true;
      window.addEventListener("mousemove", function (ev) {
        if (S.ziehen) {
          const c2 = cv();
          if (!c2) return;
          const r = c2.getBoundingClientRect();
          const sx = c2.width / r.width;
          if (Math.abs(ev.clientX - S.zieh0.x) + Math.abs(ev.clientY - S.zieh0.y) > 3) {
            S.gezogen = true;
          }
          S.panX = S.zieh0.panX + (ev.clientX - S.zieh0.x) * sx;
          S.panY = S.zieh0.panY + (ev.clientY - S.zieh0.y) * sx;
          zeichnen();
          return;
        }
        if (S.linieZieht && S.entwurf) {
          S.entwurf.p2 = zuBild(ev);
          zeichnen(); status();
        }
      });
      window.addEventListener("mouseup", function (ev) {
        if (S.ziehen) { S.ziehen = false; return; }
        if (!S.linieZieht || !S.entwurf) return;
        S.linieZieht = false;
        const p2 = S.entwurf.p2 || zuBild(ev);
        const laenge = Math.hypot(p2.x - S.entwurf.p1.x, p2.y - S.entwurf.p1.y)
          * zoomSchirm();
        if (laenge < 6) {
          /* Das war ein Klick, kein Ziehen. Dann wartet der erste Punkt auf
             den zweiten Klick; beide Bedienarten führen zum selben Ziel. */
          S.entwurf.p2 = null;
          zeichnen(); status();
          return;
        }
        S.entwurf.p2 = p2;
        streckeFertig();
      });
      window.addEventListener("keydown", function (ev) {
        if (!window.App || window.App.schritt !== "plan") return;
        if (ev.key === "Escape") {
          if (S.entwurf) { S.entwurf = null; S.linieZieht = false;
            zeichnen(); if (window.render) window.render(); }
          else if (S.punkte.length) { S.punkte = []; zeichnen(); status(); }
        }
      });
      // Einfügen aus der Zwischenablage
      document.addEventListener("paste", function (ev) {
        if (window.App && window.App.schritt !== "plan") return;
        const it = Array.from(ev.clipboardData.items).find((x) => /^image\//.test(x.type));
        if (it) dateiLesen(it.getAsFile());
      });
    }

    c.addEventListener("click", function (ev) {
      if (!S.bild || S.ziehen) return;
      /* Nach dem Verschieben darf kein Punkt gesetzt werden. Ohne diese
         Sperre hinterlässt jedes Verschieben eine Polygonecke. */
      if (S.gezogen) { S.gezogen = false; return; }
      if (S.modus === "polygon") {
        S.punkte.push(zuBild(ev));
        zeichnen(); status();
      }
    });

    // Drag and Drop
    const h = document.getElementById("planhuelle");
    ["dragover", "drop"].forEach(function (e) {
      h.addEventListener(e, function (ev) {
        ev.preventDefault();
        if (e === "drop" && ev.dataTransfer.files[0]) dateiLesen(ev.dataTransfer.files[0]);
      });
    });
  }

  /** Vergrößerung ändern und dabei einen Bildpunkt unter dem Zeiger halten. */
  function zoomSetzen(neu, halten, vor) {
    const alt = vor === undefined ? S.zoom : vor;
    S.zoom = Math.max(0.05, Math.min(16, neu));
    const p = halten || { x: (cv().width / 2 - S.panX) / alt,
                          y: (cv().height / 2 - S.panY) / alt };
    S.panX -= p.x * (S.zoom - alt);
    S.panY -= p.y * (S.zoom - alt);
    zeichnen();
    status();
  }

  /* ---------------- Messwerkzeug ---------------- */
  /** Die Strecke steht. Jetzt die bekannte Länge dazu abfragen. */
  function streckeFertig() {
    S.zeiger = null;
    zeichnen();
    if (window.render) window.render();
    setTimeout(function () {
      const el = document.getElementById("messMeter");
      if (el) { el.focus(); el.select(); }
    }, 0);
  }

  function bezugAus(id) {
    const K = KM();
    const liste = K ? K.bezugsmasse() : [];
    return liste.filter(function (x) { return x.id === id; })[0] || liste[0] || null;
  }

  /** Länge der laufenden Strecke in Bildpunkten des Bildes. */
  function entwurfLaenge() {
    const e = S.entwurf;
    if (!e || !e.p1 || !e.p2) return 0;
    return Math.hypot(e.p2.x - e.p1.x, e.p2.y - e.p1.y);
  }

  /** Was der Bearbeiter gerade eingetragen hat, als Messung gerechnet. */
  function entwurfMessung() {
    const K = KM();
    if (!K || !S.entwurf) return null;
    const feld = document.getElementById("messMeter");
    const meter = feld ? zahl(feld.value) : NaN;
    const b = bezugAus(S.bezugId);
    if (!(meter > 0)) return null;
    return K.messung({ laenge_px_bild: entwurfLaenge(), zoom: S.entwurf.zoom,
                       meter: meter, u_abs_m: b ? b.u_abs_m : 0,
                       bezug: b ? b.id : "sonst", bezug_titel: b ? b.titel : "" });
  }

  function zahl(t) {
    const x = parseFloat(String(t == null ? "" : t).replace(",", ".").trim());
    return Number.isFinite(x) ? x : NaN;
  }

  /** Die Vorschau unter den Eingabefeldern neu schreiben, ohne die ganze
   *  Seite neu zu bauen: sonst verliert das Feld beim Tippen den Fokus. */
  function vorschauSchreiben() {
    const el = document.getElementById("messVorschau");
    if (!el) return;
    const m = entwurfMessung();
    const K = KM();
    if (!m) {
      el.className = "meldung hinweis";
      el.innerHTML = "Länge der Strecke eintragen, dann steht hier der Maßstab "
        + "und wie genau er ist.";
      return;
    }
    const u = K.unsicherheit({ laenge_px_bild: m.laenge_px_bild, zoom: m.zoom,
                               meter: m.meter, u_abs_m: bezugAus(S.bezugId).u_abs_m });
    const nenner = S.bildDpi ? K.nennerAusPxJeMeter(m.px_je_meter, S.bildDpi) : null;
    const gerundet = nenner ? K.nennerRunden(nenner) : null;
    el.className = "meldung " + ({ gut: "gut", knapp: "warnung", zu_kurz: "fehler" }[m.stufe]);
    el.innerHTML = "<div><b>" + de(m.px_je_meter, 1) + " Bildpunkte je Meter</b>"
      + (nenner ? " &middot; Maßstab rund 1:" + de(nenner, 0)
          + (gerundet ? " (gebräuchlich: 1:" + gerundet.nenner + ")" : "") : "")
      + "<br>" + escapeH(u.text)
      + (S.messungen.length ? "<br>" + vergleichZuBisher(m.px_je_meter) : "")
      + "</div>";
  }

  /** Wie weit liegt die neue Messung neben dem, was schon gemessen wurde? */
  function vergleichZuBisher(pxProM) {
    const bisher = S.zusammen ? S.zusammen.px_je_meter : null;
    if (!(bisher > 0)) return "";
    const abw = (pxProM / bisher - 1) * 100;
    return "Gegenüber der bisherigen Messung: " + (abw >= 0 ? "+" : "")
      + de(abw, 2) + " Prozent."
      + (Math.abs(abw) > 2 ? " Mehr als zwei Prozent. Entweder ist eine der beiden "
        + "bekannten Längen falsch angesetzt oder die Aufnahme ist verzerrt." : "");
  }

  /** Messung annehmen, Maßstab neu bilden, Ergebnis zurückgeben. */
  function messungAnnehmen() {
    const m = entwurfMessung();
    if (!m) {
      melde("Bitte die bekannte Länge in Metern eintragen.", { stufe: "warnung" });
      return;
    }
    if (!m.annehmbar) {
      const K = KM();
      const u = K.unsicherheit({ laenge_px_bild: m.laenge_px_bild, zoom: m.zoom,
                                 meter: m.meter, u_abs_m: bezugAus(S.bezugId).u_abs_m });
      melde(u.text + "\nEine so kurze Strecke trägt keinen Maßstab. Entweder eine "
        + "längere Strecke messen oder mit dem Mausrad hineinzoomen und dann "
        + "klicken.", { stufe: "warnung", titel: "Diese Messung wird nicht übernommen" });
      return;
    }
    m.p1 = S.entwurf.p1; m.p2 = S.entwurf.p2;
    S.messungen.push(m);
    S.entwurf = null;
    massstabBilden();
    if (window.render) window.render();
  }

  /** Was diese Unterlage selbst über ihren Maßstab sagt, als Nenner.
   *  Nur das, was vom Blatt kommt — ein früher hier gemessener Wert wäre
   *  kein unabhängiger Weg und taugt nicht zur Kreuzprobe. */
  function nennerAusDerUnterlage() {
    const A = window.App;
    const seiten = (A && A.p && A.p.plan && A.p.plan.seiten) || [];
    const seite = S.seitenIndex == null ? null : seiten[S.seitenIndex];
    const m = (seite && seite.massstab) || {};
    if (m.herkunft === "gemessen" || m.quelle === "am Bildschirm gemessen") {
      /* Beim Neuladen der Seite steht hier schon der eigene alte Messwert.
         Dann nimmt die Kreuzprobe, was das Modell vom Blatt abgelesen hat. */
      const g = seite && seite.massstabGelesen;
      return (g && g.nenner > 0) ? g.nenner
        : ((seite && seite.blattkopf && seite.blattkopf.massstab_nenner) || null);
    }
    if (m.nenner > 0) return m.nenner;
    const g = seite && seite.massstabGelesen;
    if (g && g.nenner > 0) return g.nenner;
    return (seite && seite.blattkopf && seite.blattkopf.massstab_nenner) || null;
  }

  /** Aus allen Messungen den Maßstab bilden und weitergeben. */
  function massstabBilden() {
    const K = KM();
    const z = K ? K.zusammenfassen(S.messungen) : null;
    S.zusammen = z;
    /* Die Kreuzprobe: gemessener Maßstab gegen den Vermerk auf dem Blatt.
       Genau hier fällt die verkleinerte Kopie auf, und nur hier. */
    S.kreuz = (K && z) ? K.kreuzprobe({
      px_je_meter: z.px_je_meter, dpi: S.bildDpi,
      nenner_blatt: nennerAusDerUnterlage(), u_rel: z.u_rel,
    }) : null;
    const letzte = S.messungen[S.messungen.length - 1];
    if (!z) {
      /* Ohne eine einzige Messung gilt wieder, was die Unterlage selbst
         hergab — einschließlich der gekennzeichneten Vorbelegung. Vorher
         stand hier hart null, und wer seine (falsche) Messung löschte,
         stand vor einem gesperrten Zeichenwerkzeug. */
      S.mass = { p1: null, p2: null, meter: null,
                 pxProM: S.uebernommen ? S.uebernommen.pxProM : null };
    } else {
      /* Bestätigt die Messung den Vermerk auf dem Blatt, wird mit dem glatten
         Nenner des Blattes weitergerechnet und nicht mit dem verrauschten
         Messwert. Warum, steht in kern_messen.kreuzprobe. */
      const gilt = (S.kreuz && S.kreuz.moeglich && S.kreuz.px_je_meter_gilt > 0)
        ? S.kreuz.px_je_meter_gilt : z.px_je_meter;
      S.mass = { p1: letzte.p1, p2: letzte.p2, meter: letzte.meter, pxProM: gilt };
    }
    vorbelegungNachziehen();
    inSeiteSchreiben(z);
    /* Die Maßstabsproben im Kontrollblatt sollen die Messung sehen. */
    if (window.massstabsprobeSpeisen) window.massstabsprobeSpeisen();
    if (S.aktuelleId) inProjektSichern(S.bezeichnung);
    zeichnen(); status();
  }

  /** Die Gegenprobe der Vorbelegung: EIN GEMESSENER MASSSTAB VERDRÄNGT SIE.
   *
   *  Wer erst mit der Vorbelegung 1:100 umfahren hat und dann eine bemaßte
   *  Strecke misst, hat ab diesem Moment einen belegten Maßstab — die mit der
   *  Vorbelegung berechneten Flächen wären sonst still falsch geblieben.
   *  Die Punkte des Polygons sind reine Bildgeometrie; Fläche, Umfang und
   *  Kantenlängen werden daraus mit dem jetzt geltenden Maßstab neu gerechnet.
   *  Ein bereits übernommener Raum wird NUR nachgezogen, wenn seine Fläche
   *  noch unverändert vom Polygon stammt — eine Nutzereingabe wird nie
   *  überschrieben. Polygone, die auf einem echten Maßstab standen, fasst
   *  diese Funktion nicht an. */
  function vorbelegungNachziehen() {
    const pxM = S.mass.pxProM;
    if (!(pxM > 0) || vorbelegungAktiv()) return;
    const A = window.App;
    let geaendert = false;
    S.polygone.forEach(function (p) {
      if (p.massstab_vorbelegt !== true) return;
      geaendert = true;
      const altA = Math.round(p.flaeche * 100) / 100;
      p.flaeche = flaeche(p.punkte) / (pxM * pxM);
      p.umfang = umfang(p.punkte) / pxM;
      p.kanten = kanten(p.punkte).map((k) => ({ i: k.i, laenge: k.laenge / pxM }));
      p.massstab_vorbelegt = false;
      if (!p.raumId || !A || !A.p) return;
      const raum = (A.p.raeume || []).filter(function (r) {
        return r.id === p.raumId;
      })[0];
      if (!raum || !raum.herkunft || raum.herkunft.massstab_vorbelegt !== true) return;
      if (raum.A !== altA) return;   // der Bearbeiter hat die Fläche geändert
      raum.A = Math.round(p.flaeche * 100) / 100;
      raum.umfang_m = Math.round(p.umfang * 100) / 100;
      raum.plan_umfang = raum.umfang_m;
      raum.plan_kanten = p.kanten;
      raum.herkunft.massstab_vorbelegt = false;
      raum.herkunft.flaeche_quelle = "im Plan umfahren, Maßstab gemessen";
    });
    if (geaendert && window.render) window.render();
  }

  /**
   * Das Ergebnis zurück an die Seite im Stapel. Nur so steht es in der
   * Seitenliste und geht in den Bericht ein.
   *
   * Der Nenner ist von der Auflösung unabhängig und deshalb der Wert, der
   * bleibt. Bildpunkte je Meter gelten nur für die Auflösung, mit der hier
   * gerendert wurde; sie wird mitgeschrieben, sonst ist die Zahl beim
   * nächsten Öffnen mit anderer Auflösung falsch.
   */
  function inSeiteSchreiben(z) {
    const A = window.App;
    const seiten = (A && A.p && A.p.plan && A.p.plan.seiten) || [];
    const seite = S.seitenIndex == null ? null : seiten[S.seitenIndex];
    if (!seite) return;
    if (!z) { seite.massstab = Object.assign({}, seite.massstab, { px_je_meter: null }); return; }
    const K = KM();
    const nenner = S.bildDpi ? K.nennerAusPxJeMeter(z.px_je_meter, S.bildDpi) : null;
    const gerundet = nenner ? K.nennerRunden(nenner) : null;
    const kr = S.kreuz;
    /* Die Befunde aus der Auslese bleiben stehen, der eigene Kreuzprobenbefund
       wird bei jeder Messung ersetzt statt angehängt. Sonst sammeln sich nach
       drei Messungen drei widersprüchliche Sätze zur selben Sache. */
    const alteBefunde = ((seite.massstab && seite.massstab.befunde) || [])
      .filter(function (b) { return b.id !== "massstab_kreuzprobe"; });
    const befunde = (kr && kr.moeglich)
      ? alteBefunde.concat([{ id: "massstab_kreuzprobe", titel: kr.titel,
                              stufe: kr.stufe, text: kr.text,
                              wert: kr.nenner_gemessen }])
      : alteBefunde;
    const krGilt = kr && kr.moeglich;
    seite.massstab = Object.assign({}, seite.massstab, {
      nenner: krGilt ? kr.nenner_gilt : (nenner ? Math.round(nenner * 10) / 10 : null),
      nenner_gebraeuchlich: gerundet ? gerundet.nenner : null,
      px_je_meter: krGilt ? kr.px_je_meter_gilt : z.px_je_meter,
      px_je_meter_dpi: S.bildDpi || null,
      /* Widerspricht die Messung dem Schriftfeld, gilt die Messung — aber die
         Güte darf das nicht verschweigen. Wer nur "abgesichert" liest, sieht
         den Widerspruch nie. Umgekehrt ist ein Maßstab, den Blatt und Messung
         übereinstimmend hergeben, doppelt belegt; ihn dann wegen des
         Klickfehlers weiter "vorläufig" zu nennen, hieße den Bearbeiter
         nachbessern zu lassen, wo nichts mehr nachzubessern ist. */
      guete: krGilt ? kr.guete_vorschlag : z.guete,
      quelle: "am Bildschirm gemessen"
        + (kr && kr.moeglich
          ? (kr.deckungsgleich
            ? ", deckt sich mit dem Schriftfeld 1:" + kr.nenner_blatt
            : kr.stimmt
            ? ", Schriftfeld 1:" + kr.nenner_blatt + " bestätigt bis auf "
              + kr.abweichung_prozent + " Prozent Streuung"
            : ", Schriftfeld nennt 1:" + kr.nenner_blatt
              + " — das Blatt liegt nicht in Originalgröße vor")
          : ""),
      herkunft: "gemessen",
      messungen: z.anzahl,
      kreuzprobe: kr && kr.moeglich ? {
        stimmt: kr.stimmt, nenner_blatt: kr.nenner_blatt,
        nenner_gemessen: kr.nenner_gemessen, faktor: kr.faktor,
        abweichung_prozent: kr.abweichung_prozent, formatschritt: kr.formatschritt,
      } : null,
      befunde: befunde,
      unsicherheit_prozent: Math.round(z.u_rel * 1000) / 10,
      unsicherheit_flaeche_prozent: Math.round(z.u_flaeche_rel * 1000) / 10,
      spanne_prozent: z.spanne_prozent == null ? null
        : Math.round(z.spanne_prozent * 100) / 100,
      /* Ein Widerspruch zum Schriftfeld ist ein Befund, keine Sperre der
         Rechnung: gerechnet wird mit dem gemessenen Wert, und der ist
         belastbar. Was nicht belastbar ist, sind zwei Messungen, die
         untereinander auseinanderlaufen — das sagt z.belastbar. */
      belastbar: z.belastbar,
      hinweis: z.hinweis,
      belege: S.messungen.map(function (m) {
        return { bezug: m.bezug_titel || m.bezug, meter: m.meter,
                 strecke_px: Math.round(m.laenge_px_bild),
                 px_je_meter: Math.round(m.px_je_meter * 100) / 100,
                 unsicherheit_prozent: Math.round(m.u_rel * 1000) / 10 };
      }),
    });
  }

  function messungWeg(i) {
    S.messungen.splice(i, 1);
    massstabBilden();
    if (window.render) window.render();
  }

  /** Von außen: an dieser Seite messen.
   *
   *  Der einzige Weg, mit dem der Stapel das Messwerkzeug aufruft. Wichtig
   *  ist die Reihenfolge: erst den Betrieb auf "massstab" setzen, dann die
   *  Seite laden. Wird nur ein Bild geladen und der Betrieb bleibt auf
   *  "ansehen", landet der Bearbeiter in einer Ansicht ohne Werkzeug und
   *  ohne Anweisung. Und ohne die Seitennummer käme das Messergebnis nirgends
   *  an: inSeiteSchreiben() braucht sie, sonst ist die Messung verloren. */
  function messenStarten(i) {
    S.modus = "massstab";
    S.entwurf = null;
    S.entwurfMeter = "";
    if (i != null && S.seitenIndex !== i) seiteLaden(i);
    else { zeichnen(); status(); if (window.render) window.render(); }
  }

  function sperrhinweis() {
    const e = eignungGesamt();
    const g = e ? e.sperren.map(function (b) { return "· " + b.titel + ": " + b.text; }).join("\n\n") : "";
    melde(g + "\nBitte eine bessere Unterlage verwenden. Wenn du die Maße "
      + "anderweitig gesichert hast, kannst du die Sperre mit Begründung aufheben.",
      { stufe: "fehler", titel: "Mit dieser Unterlage kann nicht gerechnet werden" });
  }

  function polygonAbschliessen() {
    const pxM = S.mass.pxProM;
    if (!pxM) {
      melde("Erst den Maßstab setzen.", { stufe: "warnung" });
      return;
    }
    const A = flaeche(S.punkte) / (pxM * pxM);
    const U = umfang(S.punkte) / pxM;
    const punkte = S.punkte.slice();
    /* Ob diese Fläche auf der Vorbelegung 1:100 steht, wird JETZT festgehalten
       und wandert mit dem Polygon in den Raum. Später lässt es sich nicht mehr
       feststellen — und genau daran hängt der Prüfhinweis. */
    const vorbelegt = vorbelegungAktiv();
    eingebe({ titel: "Bezeichnung des Raums",
      text: "Gemessen sind " + A.toFixed(2).replace(".", ",") + " m² Fläche und "
        + U.toFixed(2).replace(".", ",") + " m Umfang."
        + (vorbelegt
          ? " Achtung: Der Maßstab 1:100 ist vorbelegt, nicht belegt — die "
            + "Fläche skaliert mit ihm."
          : ""),
      wert: "Raum " + (S.polygone.length + 1), mehrzeilig: false,
      feldname: "Bezeichnung des Raums", jaText: "Übernehmen" }).then(function (name) {
      if (name === null) { S.punkte = []; zeichnen(); status(); return; }
      S.polygone.push({ name: name || "Raum", punkte: punkte,
        flaeche: A, umfang: U, massstab_vorbelegt: vorbelegt,
        kanten: kanten(punkte).map((k) => ({ i: k.i, laenge: k.laenge / pxM })) });
      S.punkte = [];
      inProjektSichern();
      zeichnen(); status();
      if (window.render) window.render();
    });
  }

  /* ---------------- Übernahme ins Raumbuch ---------------- */
  function übernehmen(i) {
    const p = S.polygone[i];
    const A = window.App;
    const letzte = A.p.raeume[A.p.raeume.length - 1];
    const id = "r_plan_" + Date.now() + "_" + i;
    A.p.raeume.push({
      id: id, geschoss: letzte ? letzte.geschoss : "EG", name: p.name, art: "wohnen",
      A: Math.round(p.flaeche * 100) / 100, h: letzte ? letzte.h : 2.5,
      we: letzte ? letzte.we : (A.p.einheiten[0] || {}).name || "",
      bauteile: [], plan_umfang: Math.round(p.umfang * 100) / 100,
      plan_kanten: p.kanten,
      /* DER UMFANG GEHOERT IN DIE RECHNUNG, NICHT NUR INS PROTOKOLL.
         Wer einen Raum umfaehrt, misst seinen Umfang exakt am kalibrierten
         Bild -- die beste Zahl, die dieses Werkzeug ueber die Form eines
         Raums je bekommt. Bis zum 23.08.2026 landete sie in plan_umfang und
         wurde ausschliesslich vom Kontrollblatt gelesen, um "gemessen"
         anzuzeigen. Die Bauteile naeherten denselben Raum weiter als Quadrat
         an. umfang_m ist das Feld, das KERN_ZUORDNUNG liest. */
      umfang_m: Math.round(p.umfang * 100) / 100,
      /* Die Herkunft gehört an den Raum. Ohne sie zählte kern_pruefung eine
         umfahrene Fläche als „von Hand eingetragen" — und die Maßstabsproben
         hielten sich für unbeteiligt, obwohl genau diese Fläche am Maßstab
         hängt. Mit „im Plan umfahren" bleiben die Kreuzproben scharf, und
         massstab_vorbelegt trägt die Vorbelegung 1:100 bis in den
         Prüfhinweis (massstab_vorbelegt in kern_pruefung). */
      herkunft: {
        quelle: "im Plan umfahren",
        flaeche_quelle: "im Plan umfahren"
          + (p.massstab_vorbelegt === true
            ? " — Maßstab 1:100 vorbelegt, nicht belegt" : ""),
        massstab_vorbelegt: p.massstab_vorbelegt === true,
      },
    });
    p.raumId = id;
    if (window.render) window.render();
  }

  /* ---------------- HTML ---------------- */
  function html() {
    const A = window.App;
    /* Die drei Betriebsarten liegen in einer eigenen Gruppe und zeigen an,
       welche gerade gilt. Vorher standen acht gleich aussehende Knoepfe
       nebeneinander und "Verschieben" bekam nie eine Markierung; wer den
       Betrieb gewechselt hatte, sah es nur daran, was der naechste Klick tat. */
    const betrieb = function (art, aktion, text) {
      const an = S.modus === art;
      return '<button class="btn klein' + (an ? " an" : "") + '" data-aktion="' + aktion
        + '" aria-pressed="' + (an ? "true" : "false") + '">' + text + "</button>";
    };
    return '<div class="karte"><h2>Plan auswerten</h2>'
      + '<p class="hinweis">Plan als Bild ablegen, Maßstab an einer bekannten Länge messen, '
      + "dann die Räume umfahren. Fläche und Umfang werden daraus exakt berechnet. "
      + "Das läuft vollständig auf diesem Rechner.</p>"
      + '<div class="planleiste">'
      + '<input type="file" id="planDatei" accept="image/*" style="display:none">'
      + '<button class="btn klein" data-aktion="planWaehlen">Plan wählen</button>'
      + '<span class="knopfgruppe" role="group" aria-label="Betriebsart">'
      + betrieb("massstab", "planMassstab", "Maßstab messen")
      + betrieb("polygon", "planPolygon", "Raum zeichnen")
      + betrieb("ansehen", "planAnsehen", "Verschieben")
      + "</span>"
      + '<button class="btn klein" data-aktion="planZurueck">Letzten Punkt zurück</button>'
      + '<span class="knopfgruppe">'
      + '<button class="btn klein nurikon" data-aktion="planZoomRaus" title="verkleinern" '
      + 'aria-label="verkleinern">' + window.ikon("minus") + "</button>"
      + '<button class="btn klein nurikon" data-aktion="planZoomRein" title="vergrößern" '
      + 'aria-label="vergrößern">' + window.ikon("plus") + "</button>"
      + '<button class="btn klein" data-aktion="planZoomPassend" title="ganzes Blatt">'
      + "Blatt</button></span>"
      + ' <input type="text" id="planBezeichnung" placeholder="Bezeichnung, z. B. Erdgeschoss 1936"'
      + ' value="' + escapeH(S.bezeichnung || "") + '" style="max-width:250px">'
      + '<div style="flex:1"></div>'
      + '<button class="btn klein" data-aktion="planSichern">Für den Bericht sichern</button>'
      + (window.MODUL_KI ? window.MODUL_KI.knopf() : "")
      + "</div>"
      + seitenwahl()
      + eignungHtml()
      + messauftragHtml()
      + messHtml()
      + '<div class="planstatus" id="planstatus"></div>'
      + '<div id="planhuelle"><canvas id="plancanvas" width="1000" height="520"></canvas></div>'
      + messungenHtml()
      + (S.polygone.length
        ? '<div class="tabhuelle" style="margin-top:14px"><table class="tab"><thead><tr>'
          + '<th>Gezeichneter Raum</th><th class="num" style="width:110px">Fläche m²</th>'
          + '<th class="num" style="width:110px">Umfang m</th>'
          + '<th style="width:200px"></th></tr></thead><tbody>'
          + S.polygone.map(function (p, i) {
              const drin = p.raumId && A.p.raeume.some((r) => r.id === p.raumId);
              return "<tr><td>" + p.name + "</td>"
                + '<td class="num">' + rnd(p.flaeche, 2) + "</td>"
                + '<td class="num">' + rnd(p.umfang, 2) + "</td>"
                + '<td style="text-align:right">'
                + (drin ? '<span class="chip belegt">im Raumbuch</span>'
                        : '<button class="btn klein primaer" data-aktion="planUebernehmen" data-i="'
                          + i + '">Ins Raumbuch</button>')
                + ' <button class="btn klein gefahr" data-aktion="planPolyWeg" data-i="' + i
                + '">x</button></td></tr>';
            }).join("")
          + "</tbody></table></div>"
          + '<button class="btn klein primaer" data-aktion="planAlleUebernehmen" '
          + 'style="margin-top:10px">Alle noch nicht übernommenen ins Raumbuch</button>'
        : "")
      + "</div>";
  }

  /* ---------------- Messwerkzeug, Anzeige ---------------- */
  /** Der Arbeitsauftrag im Messbetrieb: welches Blatt, was darauf steht und
   *  was jetzt zu tun ist.
   *
   *  Er ist da, weil "Maßstab offen" ohne einen Satz dazu, was zu tun ist,
   *  der häufigste Grund war, dass hier nichts weiterging. Solange keine
   *  Messung vorliegt, steht hier immer eine Handlungsanweisung. */
  function messauftragHtml() {
    if (S.modus !== "massstab" || !S.bild) return "";
    if (S.messungen.length || (S.entwurf && S.entwurf.p1)) return "";
    const nb = nennerAusDerUnterlage();
    const was = S.bezeichnung ? " auf <b>" + escapeH(S.bezeichnung) + "</b>" : "";
    return '<div class="meldung hinweis" style="display:block">'
      + "<b>Maßstab messen</b>" + was + "<br>"
      + (nb
        ? "Das Blatt nennt 1:" + escapeH(String(nb)) + ". Diese Angabe sagt, in "
          + "welchem Maßstab gezeichnet wurde, nicht in welchem das Blatt jetzt "
          + "vorliegt: eine verkleinerte Kopie trägt den alten Vermerk weiter. "
          + "Zieh eine Strecke über eine bemaßte Kette, dann rechnet das Werkzeug "
          + "beides gegeneinander."
        : (S.bildDpi
          ? "Auf diesem Blatt steht kein Maßstab, aus dem sich rechnen ließe. "
            + "Zieh eine Strecke über eine bemaßte Kette und trag die "
            + "angeschriebene Länge ein."
          : "Diese Unterlage ist ein Bild, kein Dokument: sie hat weder Blattmaß "
            + "noch Auflösung, aus denen sich ein Maßstab ableiten ließe. Messen "
            + "ist hier der einzige Weg. Zieh eine Strecke über eine bemaßte "
            + "Kette und trag die angeschriebene Länge ein."))
      + " Je länger die Strecke, desto genauer — die längste Kette des Blattes "
      + "nehmen, nicht ein kurzes Teilmaß."
      + "</div>";
  }

  /** Der Kasten, in dem die bekannte Länge zur gezogenen Strecke eingetragen
   *  wird. Er steht über der Zeichenfläche, nicht als Fenster darüber: die
   *  Strecke muss beim Eintragen sichtbar bleiben. */
  function messHtml() {
    const K = KM();
    if (!K || !S.bild) return "";
    if (!S.entwurf || !S.entwurf.p1 || !S.entwurf.p2) return "";
    const L = entwurfLaenge();
    const b = bezugAus(S.bezugId);
    const liste = K.bezugsmasse();
    return '<div class="karte" id="messkasten" style="border-color:var(--gelb);'
      + 'margin:10px 0;padding:14px">'
      + "<b>Gemessene Strecke: " + de(L, 0) + " Bildpunkte des Bildes, "
      + de(L * S.entwurf.zoom, 0) + " Bildschirmpunkte</b>"
      + '<div class="feldreihe" style="margin-top:10px">'
      + '<label class="feld"><span>Was ist das für eine Länge?</span>'
      + '<select id="messBezug">'
      + liste.map(function (x) {
          return '<option value="' + x.id + '"' + (x.id === S.bezugId ? " selected" : "")
            + ">" + escapeH(x.titel) + "</option>";
        }).join("")
      + "</select></label>"
      + (b && b.werte && b.werte.length
        ? '<label class="feld"><span>Normmaß übernehmen</span>'
          + '<select id="messNorm"><option value="">bitte wählen</option>'
          + b.werte.map(function (w) {
              return '<option value="' + w + '">' + de(w, 3) + " m"
                + (passendesNormmass(b) === w ? " — passt zu dieser Strecke" : "")
                + "</option>";
            }).join("")
          + "</select></label>"
        : "")
      + '<label class="feld"><span>Bekannte Länge in Metern</span>'
      + '<div class="einheit"><input type="text" id="messMeter" inputmode="decimal" '
      + 'value="' + escapeH(S.entwurfMeter || "") + '" placeholder="z. B. 4,26">'
      + '<span class="e">m</span></div></label>'
      + "</div>"
      + '<div style="font-size:12.5px;color:var(--mute);margin:8px 0 6px">'
      + escapeH(b ? b.hinweis : "") + "</div>"
      + '<div class="meldung hinweis" id="messVorschau" style="display:block"></div>'
      + '<button class="btn klein primaer" data-aktion="messUebernehmen">'
      + "Messung übernehmen</button> "
      + '<button class="btn klein" data-aktion="messVerwerfen">Verwerfen</button>'
      + "</div>";
  }

  /** Welches Normmaß der Auswahl passt zur gezogenen Strecke? Nur ein
   *  Vorschlag, und nur wenn schon ein Maßstab vorliegt. Ohne Maßstab gibt es
   *  nichts zu vergleichen; dann wird auch nichts vorgeschlagen. */
  function passendesNormmass(b) {
    if (!b || !b.werte || !b.werte.length || !S.zusammen) return null;
    const soll = entwurfLaenge() / S.zusammen.px_je_meter;
    let bester = null, beste = Infinity;
    b.werte.forEach(function (w) {
      const d = Math.abs(w - soll) / w;
      if (d < beste) { beste = d; bester = w; }
    });
    return beste <= 0.15 ? bester : null;
  }

  /** Die angenommenen Messungen mit ihrer Abweichung untereinander. */
  function messungenHtml() {
    if (!S.messungen.length) return "";
    const z = S.zusammen;
    const farbe = { abgesichert: "gut", belegt: "hinweis", vorlaeufig: "warnung",
                    widerspruch: "fehler" }[z ? z.guete : "vorlaeufig"];
    return '<div class="tabhuelle" style="margin-top:14px"><table class="tab"><thead><tr>'
      + "<th>Messung</th><th>Bezug</th>"
      + '<th class="num" style="width:110px">Strecke Punkte</th>'
      + '<th class="num" style="width:90px">Länge m</th>'
      + '<th class="num" style="width:120px">Punkte je Meter</th>'
      + '<th class="num" style="width:110px">Abweichung</th>'
      + '<th class="num" style="width:110px">Unsicherheit</th>'
      + '<th style="width:40px"></th></tr></thead><tbody>'
      + S.messungen.map(function (m, i) {
          const abw = z ? z.einzelabweichung[i] : 0;
          return "<tr><td>" + (i + 1) + "</td>"
            + "<td>" + escapeH(m.bezug_titel || m.bezug) + "</td>"
            + '<td class="num">' + de(m.laenge_px_bild, 0) + "</td>"
            + '<td class="num">' + de(m.meter, 3) + "</td>"
            + '<td class="num">' + de(m.px_je_meter, 2) + "</td>"
            + '<td class="num">' + (S.messungen.length > 1
                ? (abw >= 0 ? "+" : "") + de(abw, 2) + " %" : "–") + "</td>"
            + '<td class="num">±' + de(m.u_rel * 100, 2) + " %</td>"
            + '<td><button class="btn klein gefahr" data-aktion="messWeg" data-i="'
            + i + '">x</button></td></tr>';
        }).join("")
      + "</tbody></table></div>"
      + (z ? '<div class="meldung ' + farbe + '" style="display:block;margin-top:8px">'
          + "<div><b>Maßstab " + de(z.px_je_meter, 2) + " Bildpunkte je Meter"
          + (S.bildDpi ? ", das ist rund 1:"
              + de(KM().nennerAusPxJeMeter(z.px_je_meter, S.bildDpi), 0) : "")
          + "</b> &middot; Herkunft: am Bildschirm gemessen &middot; ±"
          + de(z.u_rel * 100, 2) + " Prozent im Maßstab, ±" + de(z.u_flaeche_rel * 100, 2)
          + " Prozent in jeder Fläche.<br>" + escapeH(z.hinweis)
          + (S.messungen.length < 2
            ? " Dazu einfach eine zweite Strecke an einer anderen Stelle des Blattes "
              + "ziehen." : "")
          + "</div></div>"
        : "")
      + kreuzprobeHtml();
  }

  /** Die Kreuzprobe gegen das Schriftfeld, sichtbar unter den Messungen.
   *
   *  Sie steht bewusst als eigener Kasten da und nicht als Nebensatz: ein
   *  Blatt, das "1:100" trägt und 1:141 misst, ist der teuerste Fehler, den
   *  dieses Werkzeug machen kann, und er sieht in jeder anderen Anzeige
   *  vollkommen unauffällig aus. */
  function kreuzprobeHtml() {
    const k = S.kreuz;
    if (!k) return "";
    /* Drei Stufen, nicht zwei. Zwischen "deckungsgleich" und "das Blatt ist
       verkleinert" liegt der Normalfall am Scan: ein paar Prozent Streuung,
       kein Formatsprung. Der bekommt Gelb und keine Handlungsaufforderung. */
    const farbe = !k.moeglich ? "hinweis"
      : ({ gut: "gut", hinweis: "warnung", sperre: "fehler" }[k.stufe] || "hinweis");
    return '<div class="meldung ' + farbe + '" style="display:block;margin-top:8px">'
      + "<b>" + escapeH(k.titel) + "</b><br>" + escapeH(k.text)
      + (k.moeglich && !k.stimmt
        ? "<br><br>Gerechnet wird mit dem gemessenen Wert 1:"
          + de(k.nenner_gemessen, 1) + ". Wenn du sicher bist, dass das Schriftfeld "
          + "stimmt, war die gezogene Strecke oder die eingetragene Länge falsch — "
          + "dann die Messung löschen und neu ziehen."
        : "")
      + "</div>";
  }

  function eignungHtml() {
    const e = eignungGesamt();
    if (!S.bild) {
      return '<div class="meldung hinweis" style="display:block"><b>Eignungsprüfung</b><br>'
        + "Sobald eine Unterlage geladen ist, prüft das Werkzeug automatisch, ob sich "
        + "damit rechnen lässt: Auflösung, Schärfe, Kontrast und Ausrichtung. Reicht die "
        + "Qualität nicht, wird die Bearbeitung gesperrt.</div>";
    }
    if (!e) return "";
    const farbe = { geeignet: "gut", eingeschraenkt: "warnung", ungeeignet: "fehler" }[e.urteil];
    const titel = { geeignet: "Unterlage geeignet",
                    eingeschraenkt: "Unterlage mit Einschränkungen nutzbar",
                    ungeeignet: "Unterlage nicht geeignet" }[e.urteil];
    const zeilen = e.befunde.map(function (b) {
      const sym = b.stufe === "sperre" ? "gesperrt" : (b.stufe === "einschraenkung" ? "knapp" : "gut");
      const kl = b.stufe === "sperre" ? "annahme" : (b.stufe === "einschraenkung" ? "annahme" : "belegt");
      return '<tr><td style="width:120px">' + b.titel + '</td><td><span class="chip ' + kl
        + '">' + sym + "</span></td><td>" + b.text + "</td></tr>";
    }).join("");
    return '<div class="meldung ' + farbe + '" style="display:block">'
      + "<b>" + titel + "</b>"
      + (S.freigabeGrund
        ? '<div style="margin:6px 0;padding:6px 10px;background:rgba(255,255,255,.6);'
          + 'border-radius:6px"><b>Sperre aufgehoben.</b> Begründung: '
          + escapeH(S.freigabeGrund) + " Diese Begründung erscheint im Bericht.</div>" : "")
      + '<table class="tab" style="margin-top:8px;background:transparent">' + zeilen + "</table>"
      + (e.nutzbar ? "" :
          '<div style="margin-top:8px"><b>Die Bearbeitung ist gesperrt.</b> Bitte eine '
          + "bessere Unterlage verwenden: höher aufgelöst einscannen, gerade ausrichten "
          + "oder den Kontrast aufbereiten. "
          + (S.freigabeGrund ? "" :
             '<button class="btn klein" data-aktion="planFreigeben" style="margin-top:6px">'
             + "Sperre mit Begründung aufheben</button>") + "</div>")
      + "</div>";
  }

  function escapeH(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /** Die bereits abgelegten Planseiten zur Auswahl. Ohne sie müsste der
   *  Bearbeiter dieselbe Datei ein zweites Mal heraussuchen, obwohl sie längst
   *  im Werkzeug liegt. */
  function seitenwahl() {
    const A = window.App;
    const seiten = (A && A.p.plan && A.p.plan.seiten) || [];
    if (!seiten.length) return "";
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;'
      + 'margin:0 0 10px;padding:8px 10px;background:var(--neutral);border-radius:8px">'
      + '<span style="font-size:13px;color:var(--mute)">Abgelegte Unterlagen:</span>'
      + seiten.map(function (x, i) {
          const aktiv = S.aktuelleId === ("stapel_" + i);
          return '<button class="btn klein' + (aktiv ? " primaer" : "")
            + '" data-aktion="planSeiteLaden" data-i="' + i + '">'
            + escapeH((x.bezeichnung || ("Seite " + (i + 1))).replace(/\.(pdf|png|jpe?g)/i, ""))
            + (x.geschoss ? " · " + escapeH(x.geschoss) : "") + "</button>";
        }).join("")
      + "</div>";
  }

  /** Lädt eine Seite aus dem Stapel in die Zeichenfläche. */
  function seiteLaden(i) {
    const A = window.App;
    const seite = ((A && A.p.plan && A.p.plan.seiten) || [])[i];
    if (!seite || typeof seite.rendern !== "function") {
      melde("Diese Unterlage lässt sich hier nicht anzeigen.", { stufe: "warnung" });
      return;
    }
    S.ladenLaeuft = true;
    S.bezeichnung = seite.bezeichnung || seite.name || "";
    const status = document.getElementById("planstatus");
    if (status) status.innerHTML = "<b>Wird geladen…</b> " + escapeH(S.bezeichnung);
    /* Zum Umfahren wird eine kräftige Auflösung gebraucht, damit die Ecken
       genau angeklickt werden können. */
    const DPI = 200;
    seite.rendern({ dpi: DPI }).then(function (r) {
      /* Bilder liefern hier eine fertige Adresse, PDF-Seiten eine Funktion,
         die erst gerufen werden muss. Wird das verwechselt, bekommt das
         Bildelement den Quelltext der Funktion als Adresse und die Seite
         bleibt leer. */
      const quelle = typeof r.dataUrl === "function" ? r.dataUrl(0.92)
        : (r.dataUrl || (r.canvas && r.canvas.toDataURL("image/jpeg", 0.92))
           || (r.bild && r.bild.src));
      if (!quelle) throw new Error("kein Bild");
      const dpi = r.dpi || (seite.quelle === "bild" ? null : DPI);
      bildLaden(quelle, { dpi: dpi, seitenIndex: i, aktuelleId: "stapel_" + i,
                          uebernommen: massstabDerSeite(seite, dpi) });
    }).catch(function (e) {
      S.ladenLaeuft = false;
      if (status) status.innerHTML = "Die Unterlage konnte nicht angezeigt werden: "
        + escapeH(String(e && e.message || e));
    });
  }

  /**
   * Was die Unterlage selbst über ihren Maßstab hergibt, umgerechnet auf die
   * Auflösung, mit der hier gerendert wurde.
   *
   * Der Nenner ist der belastbarere Weg, weil er von der Auflösung unabhängig
   * ist. Bildpunkte je Meter gelten nur für die Auflösung, bei der sie
   * entstanden sind, und werden deshalb umgerechnet. Fehlt beides, bleibt der
   * Maßstab offen und muss gemessen werden.
   */
  function massstabDerSeite(seite, dpi) {
    const K = KM();
    const m = seite && seite.massstab;
    if (!K || !m) return null;
    if (m.nenner > 0 && dpi > 0) {
      return { pxProM: K.pxJeMeterAusNenner(m.nenner, dpi), nenner: m.nenner,
               quelle: m.quelle || "aus der Unterlage gelesen",
               guete: m.guete || null };
    }
    if (m.px_je_meter > 0) {
      const faktor = (m.px_je_meter_dpi > 0 && dpi > 0) ? dpi / m.px_je_meter_dpi : 1;
      return { pxProM: m.px_je_meter * faktor, nenner: m.nenner || null,
               quelle: m.quelle || "aus der Unterlage gelesen",
               guete: m.guete || null };
    }
    /* VORBELEGUNG 1:100 — Robustheits-Mission, Lücke 2 (25.08.2026).
       Gibt weder Schriftfeld noch Maßkette noch Blattmaß einen Maßstab her,
       endete das Umfahren bisher an „Erst den Maßstab setzen" — die letzte
       Stelle, an der eine Fläche schlicht nicht entstehen konnte. Statt
       dessen wird der übliche Grundriss-Maßstab 1:100 als GEKENNZEICHNETE
       Vorbelegung gesetzt und sofort weitergerechnet; die Kennzeichnung
       läuft am Polygon und am Raum mit bis in den Prüfhinweis
       (kern_pruefung, massstab_vorbelegt). Drei Grenzen, mit Absicht:
       1. Nur wenn die Auflösung des gerenderten Blattes bekannt ist — ein
          Bild ohne Punkte je Zoll kann aus 1:100 keine Bildpunkte je Meter
          machen, dort bleibt die eine Handmessung der einzige ehrliche Weg.
       2. Nur am Grundriss. Ein Lageplan ist nie 1:100.
       3. Alles Echte (Nenner vom Blatt, gemessener Wert) steht in den
          Zweigen darüber und verdrängt die Vorbelegung von selbst; bei
          Stempel-Projekten wird dieses Werkzeug gar nicht erst gebraucht. */
    if (dpi > 0 && seite.istGrundriss !== false
        && !(seite.blattkopf && seite.blattkopf.blattart === "lageplan")) {
      return { pxProM: K.pxJeMeterAusNenner(100, dpi), nenner: 100,
               quelle: "Vorbelegung 1:100 — auf dem Blatt wurde kein Maßstab gefunden",
               guete: "vorbelegt", vorbelegt: true };
    }
    return null;
  }

  /** Trägt die aktuelle Fläche noch die Vorbelegung 1:100, oder steht sie auf
   *  etwas Echtem? Echt ist alles, was gemessen wurde (S.zusammen) oder vom
   *  Blatt kam; die Vorbelegung ist es nur, solange nichts davon da ist. */
  function vorbelegungAktiv() {
    return !S.zusammen && !!(S.uebernommen && S.uebernommen.vorbelegt === true)
      && S.mass.pxProM === S.uebernommen.pxProM;
  }

  /** Die Felder des Messkastens anschließen. Die Vorschau wird dabei von Hand
   *  nachgezogen und nicht über die Seitenanzeige, damit das Eingabefeld beim
   *  Tippen den Fokus behält. */
  function messVerdrahten() {
    const bezug = document.getElementById("messBezug");
    if (bezug) {
      bezug.onchange = function () {
        S.bezugId = this.value;
        S.entwurfMeter = "";
        if (window.render) window.render();
      };
    }
    const norm = document.getElementById("messNorm");
    if (norm) {
      norm.onchange = function () {
        const feld = document.getElementById("messMeter");
        if (feld && this.value) {
          feld.value = String(this.value).replace(".", ",");
          S.entwurfMeter = feld.value;
          vorschauSchreiben();
        }
      };
    }
    const feld = document.getElementById("messMeter");
    if (feld) {
      feld.oninput = function () { S.entwurfMeter = this.value; vorschauSchreiben(); };
      feld.onkeydown = function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); messungAnnehmen(); }
      };
    }
    vorschauSchreiben();
  }

  function aktivieren() {
    verdrahten();
    messVerdrahten();
    const d = document.getElementById("planDatei");
    if (d) d.onchange = function () { dateiLesen(this.files[0]); this.value = ""; };
    /* Liegen Unterlagen vor und ist noch nichts geladen, die erste von selbst
       zeigen. Der Bearbeiter kommt hierher, um zu zeichnen, nicht um erst
       wieder eine Datei zu suchen. */
    const A = window.App;
    const seiten = (A && A.p.plan && A.p.plan.seiten) || [];
    if (!S.bild && !S.ladenLaeuft && seiten.length) {
      const grundriss = seiten.findIndex(function (x) { return x.istGrundriss !== false; });
      seiteLaden(grundriss >= 0 ? grundriss : 0);
      return;
    }
    zeichnen(); status();
  }

  function aktion(name, el) {
    switch (name) {
      case "planWaehlen": document.getElementById("planDatei").click(); return true;
      case "planSeiteLaden": seiteLaden(+el.dataset.i); return true;
      case "planSichern": {
        const el = document.getElementById("planBezeichnung");
        S.bezeichnung = el ? el.value : "";
        if (!S.bild) {
          melde("Kein Plan geladen.", { stufe: "warnung" });
          return true;
        }
        inProjektSichern(S.bezeichnung);
        melde("Die Planunterlage ist im Projekt gesichert und erscheint im Bericht.",
          { stufe: "gut" });
        return true;
      }
      case "planMassstab":
        if (!freigegeben()) { sperrhinweis(); return true; }
        /* Angenommene Messungen bleiben stehen. Wer den Knopf drückt, will in
           aller Regel eine zweite Strecke messen und nicht die erste
           wegwerfen. */
        S.modus = "massstab"; S.entwurf = null; S.entwurfMeter = "";
        zeichnen(); status(); return true;
      case "messUebernehmen": messungAnnehmen(); return true;
      case "messVerwerfen":
        S.entwurf = null; S.entwurfMeter = ""; zeichnen(); return true;
      case "messWeg": messungWeg(+el.dataset.i); return true;
      case "planZoomRein": zoomSetzen(S.zoom * 1.5); return true;
      case "planZoomRaus": zoomSetzen(S.zoom / 1.5); return true;
      case "planZoomPassend": {
        const c = cv();
        if (S.bild && c) {
          /* "Blatt" heißt ganzes Blatt. Deshalb muss auch die Höhe passen:
             ein Hochformat, das nur in der Breite eingepasst wird, ragt unten
             aus der Zeichenfläche heraus und der untere Teil ist weder zu
             sehen noch anzuklicken. */
          S.zoom = Math.min(1, c.width / S.bild.width,
                            FLAECHE_HOCH_MAX / S.bild.height);
          S.panX = 0; S.panY = 0;
          zeichnen(); status();
        }
        return true;
      }
      case "planPolygon":
        if (!freigegeben()) { sperrhinweis(); return true; }
        if (!S.mass.pxProM) {
          /* Diesen Zweig erreicht nur noch ein Bild ohne bekannte Auflösung:
             dort lässt sich aus 1:100 keine Vorbelegung rechnen (Bildpunkte
             je Meter unbestimmbar), es bleibt die eine Handmessung. */
          melde("Erst den Maßstab messen: Bei einem Bild ohne bekannte "
            + "Auflösung lässt sich kein Maßstab vorbelegen. Eine Strecke "
            + "mit bekannter Länge ziehen (\"Maßstab messen\"), dann zeichnen.",
            { stufe: "warnung" });
          return true;
        }
        S.modus = "polygon"; status(); return true;
      case "planAnsehen": S.modus = "ansehen"; status(); return true;
      case "planZurueck": S.punkte.pop(); zeichnen(); status(); return true;
      case "planUebernehmen": übernehmen(+el.dataset.i); return true;
      case "planPolyWeg": S.polygone.splice(+el.dataset.i, 1); zeichnen(); return true;
      case "planFreigeben": {
        const e = eignungGesamt();
        const gruende = e ? e.sperren.map(function (b) { return b.titel; }).join(", ") : "";
        eingebe({ titel: "Eignungsprüfung nicht bestanden",
          text: "Nicht bestanden wegen: " + gruende + ".\n\nWenn du trotzdem damit "
            + "arbeiten willst, begründe das bitte. Die Begründung erscheint im "
            + "Bericht.\n\nBeispiel: Maße wurden am Objekt nachgemessen und stimmen "
            + "mit dem Plan überein.",
          wert: "", feldname: "Begründung", jaText: "Freigeben" }).then(function (t) {
          if (t === null) return;
          if (t.trim().length < 10) {
            melde("Bitte eine Begründung mit mindestens zehn Zeichen angeben.",
              { stufe: "warnung" });
            return;
          }
          S.freigabeGrund = t.trim();
          if (window.App) window.App.p.planFreigabeGrund = S.freigabeGrund;
          if (window.render) window.render();
        });
        return true;
      }
      case "planAlleUebernehmen":
        if (!freigegeben()) { sperrhinweis(); return true; }
        S.polygone.forEach(function (p, i) {
          if (!p.raumId) übernehmen(i);
        });
        return true;
      default: return false;
    }
  }

  window.MODUL_PLAN = {
    html: html, aktivieren: aktivieren, aktion: aktion,
    zustand: S, bildLaden: bildLaden, abbildung: abbildung,
    eignungGesamt: eignungGesamt, freigegeben: freigegeben,
    inProjektSichern: inProjektSichern,
    /* Der Weg vom Stapel ins Messwerkzeug. Ohne diesen Eintrag kommt der
       Stapel nicht an messenStarten heran und lädt stattdessen irgendein
       Bild ohne Bezug zur angeklickten Seite. */
    messenStarten: messenStarten,
    // für die KI-Auslese: aktuelles Bild als Base64 ohne Praefix
    bildBase64: function () {
      if (!S.bild) return null;
      const c = document.createElement("canvas");
      const maxKante = 2576;   // höchste vom Modell unterstützte Auflösung
      const f = Math.min(1, maxKante / Math.max(S.bild.width, S.bild.height));
      c.width = Math.round(S.bild.width * f);
      c.height = Math.round(S.bild.height * f);
      c.getContext("2d").drawImage(S.bild, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.92).split(",")[1];
    },
    selbsttest: function () {
      const f = [];
      // Quadrat 10 x 10 Pixel
      const q = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
      if (Math.abs(flaeche(q) - 100) > 1e-9) f.push("Fläche Quadrat falsch");
      if (Math.abs(umfang(q) - 40) > 1e-9) f.push("Umfang Quadrat falsch");
      // Dreieck
      const d = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }];
      if (Math.abs(flaeche(d) - 6) > 1e-9) f.push("Fläche Dreieck falsch");
      if (Math.abs(umfang(d) - 12) > 1e-9) f.push("Umfang Dreieck falsch");
      // L-Form (nicht konvex)
      const l = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 2, y: 2 },
                 { x: 2, y: 4 }, { x: 0, y: 4 }];
      if (Math.abs(flaeche(l) - 12) > 1e-9) f.push("Fläche L-Form falsch");
      // Umlaufsinn darf keine Rolle spielen
      if (Math.abs(flaeche(q.slice().reverse()) - 100) > 1e-9) f.push("Umlaufsinn wirkt sich aus");
      let n = 6;
      const p = function (b, t) { n++; if (!b) f.push(t); };

      /* Der Weg vom Stapel ins Messwerkzeug muss von außen erreichbar sein.
         Er war einmal gebaut, aber nicht herausgegeben; dann lud der Stapel
         irgendein Bild ohne Bezug zur angeklickten Seite. */
      p(typeof window.MODUL_PLAN.messenStarten === "function",
        "messenStarten muss herausgegeben sein, sonst kommt der Stapel nicht heran");

      /* Die Kreuzprobe darf nur gegen das halten, was vom BLATT kommt.
         Der eigene alte Messwert wäre kein unabhängiger Weg. */
      const merk = { App: window.App, si: S.seitenIndex, modus: S.modus,
                     bild: S.bild, mess: S.messungen, entwurf: S.entwurf,
                     bez: S.bezeichnung, dpi: S.bildDpi, kreuz: S.kreuz,
                     zoom: S.zoom, ueb: S.uebernommen, zus: S.zusammen,
                     mass: S.mass, poly: S.polygone, pkt: S.punkte,
                     rend: window.render };
      try {
        window.App = { p: { plan: { seiten: [
          { massstab: { nenner: 100, quelle: "Blattkopf" } },
          { massstab: { nenner: 141, herkunft: "gemessen" },
            massstabGelesen: { nenner: 100 } },
          { massstab: {}, blattkopf: { massstab_nenner: 50 } },
          { massstab: {} },
        ] } } };
        S.seitenIndex = 0;
        p(nennerAusDerUnterlage() === 100, "Nenner aus dem Blattkopf muss durchkommen");
        S.seitenIndex = 1;
        p(nennerAusDerUnterlage() === 100,
          "Gegen einen selbst gemessenen Wert darf nicht kreuzgeprüft werden");
        S.seitenIndex = 2;
        p(nennerAusDerUnterlage() === 50, "Nenner aus dem Blattkopf des Dokuments zählt");
        S.seitenIndex = 3;
        p(nennerAusDerUnterlage() === null, "Ohne Angabe gibt es keinen Nenner");
        S.seitenIndex = null;
        p(nennerAusDerUnterlage() === null, "Ohne Seite gibt es keinen Nenner");

        /* Der Arbeitsauftrag: solange nichts gemessen ist, muss immer eine
           Handlungsanweisung dastehen — nie ein blosses "Maßstab offen". */
        S.bild = { width: 100, height: 100 }; S.messungen = []; S.entwurf = null;
        S.bezeichnung = "Blatt"; S.seitenIndex = 0; S.bildDpi = 200;
        S.modus = "ansehen";
        p(messauftragHtml() === "", "Außerhalb des Messbetriebs kein Arbeitsauftrag");
        S.modus = "massstab";
        const mitNenner = messauftragHtml();
        p(/1:100/.test(mitNenner) && /Zieh eine Strecke/.test(mitNenner),
          "Mit Nenner muss der Auftrag den Vermerk nennen und zum Ziehen auffordern");
        p(/verkleinerte Kopie/.test(mitNenner),
          "Warum trotz Vermerk gemessen wird, gehört dazu");
        S.seitenIndex = 3;
        const ohneNenner = messauftragHtml();
        p(/Zieh eine Strecke/.test(ohneNenner),
          "Ohne Nenner muss erst recht eine Anweisung dastehen");
        S.bildDpi = null;
        p(/einzige Weg/.test(messauftragHtml()),
          "Beim Bild ohne Auflösung muss dastehen, dass nur Messen bleibt");

        /* Der Kreuzprobenkasten */
        S.kreuz = null;
        p(kreuzprobeHtml() === "", "Ohne Kreuzprobe kein Kasten");
        S.kreuz = { moeglich: true, stimmt: false, deckungsgleich: false,
                    stufe: "sperre", titel: "T", text: "X", nenner_gemessen: 141.4 };
        p(/fehler/.test(kreuzprobeHtml()) && /Messung löschen/.test(kreuzprobeHtml()),
          "Ein Widerspruch muss rot sein und sagen, was zu tun ist");
        S.kreuz = { moeglich: true, stimmt: true, deckungsgleich: true,
                    stufe: "gut", titel: "T", text: "X" };
        p(/meldung gut/.test(kreuzprobeHtml()), "Eine bestandene Kreuzprobe ist grün");
        /* Der Normalfall am Scan: kein Formatsprung, aber auch nicht
           deckungsgleich. Gelb, und ohne Aufforderung zum Nachmessen. */
        S.kreuz = { moeglich: true, stimmt: true, deckungsgleich: false,
                    stufe: "hinweis", titel: "T", text: "X" };
        p(/meldung warnung/.test(kreuzprobeHtml()),
          "Eine Abweichung unterhalb des Formatsprungs ist gelb, nicht rot");
        p(!/Messung löschen/.test(kreuzprobeHtml()),
          "Dort darf nicht zum Loeschen der Messung aufgefordert werden");

        /* Die Zeichenfläche muss zum Bild passen, sonst ist der untere Teil
           des Blattes weder zu sehen noch anzuklicken. */
        const flaeche = { width: 1000, height: 520 };
        S.bild = { width: 1000, height: 1414 }; S.zoom = 1;
        flaecheAnpassen(flaeche);
        p(flaeche.height === 820, "Ein hohes Blatt muss die Fläche mitwachsen lassen, "
          + "ist: " + flaeche.height);
        S.bild = { width: 1000, height: 200 }; S.zoom = 1;
        flaecheAnpassen(flaeche);
        p(flaeche.height === 420, "Unter 420 Punkte darf die Fläche nicht schrumpfen, "
          + "ist: " + flaeche.height);
        S.bild = { width: 1000, height: 1414 }; S.zoom = 4;
        flaecheAnpassen(flaeche);
        p(flaeche.height === 820, "Beim Hineinzoomen bleibt die Fläche gedeckelt, "
          + "ist: " + flaeche.height);
        S.bild = null;
        flaeche.height = 111; flaecheAnpassen(flaeche);
        p(flaeche.height === 111, "Ohne Bild wird die Fläche nicht angefasst");

        /* --- Maßstab-Vorbelegung 1:100 (Lücke 2, 25.08.2026) -----------
           Wo weder Schriftfeld noch Maßkette noch Blattmaß einen Maßstab
           hergeben, wird 1:100 gekennzeichnet vorbelegt — aber nur dort,
           wo die Umrechnung möglich ist und Flächen am Maßstab hängen. */
        window.render = null;
        const K = KM();
        if (K) {
          const vb = massstabDerSeite({ massstab: {} }, 200);
          p(!!vb && vb.nenner === 100 && vb.vorbelegt === true
            && Math.abs(vb.pxProM - K.pxJeMeterAusNenner(100, 200)) < 1e-9,
            "Ohne jede Maßstabsquelle muss 1:100 als Vorbelegung kommen");
          p(!!vb && /Vorbelegung/.test(vb.quelle) && vb.guete === "vorbelegt",
            "Die Vorbelegung muss als solche gekennzeichnet sein");
          /* Gegenprobe: alles Echte verdrängt die Vorbelegung. */
          const echt = massstabDerSeite({ massstab: { nenner: 50 } }, 200);
          p(!!echt && echt.nenner === 50 && !echt.vorbelegt,
            "Ein Nenner vom Blatt verdrängt die Vorbelegung");
          const gem = massstabDerSeite(
            { massstab: { px_je_meter: 80, px_je_meter_dpi: 200 } }, 200);
          p(!!gem && !gem.vorbelegt && Math.abs(gem.pxProM - 80) < 1e-9,
            "Ein gemessener Wert verdrängt die Vorbelegung");
          /* Abgrenzung: Bild ohne Auflösung, Lageplan, kein Grundriss. */
          p(massstabDerSeite({ massstab: {} }, null) === null,
            "Bei einem Bild ohne Auflösung gibt es keine Vorbelegung — "
            + "aus 1:100 lassen sich dort keine Bildpunkte je Meter rechnen");
          p(massstabDerSeite({ massstab: {},
              blattkopf: { blattart: "lageplan" } }, 200) === null,
            "Ein Lageplan bekommt keine Vorbelegung 1:100");
          p(massstabDerSeite({ massstab: {}, istGrundriss: false }, 200) === null,
            "Was kein Grundriss ist, bekommt keine Vorbelegung");
        }

        /* Der Status muss die Vorbelegung benennen, nicht als Maßstab tarnen. */
        S.bild = { width: 100, height: 100 };
        S.uebernommen = { pxProM: 78.74, nenner: 100, vorbelegt: true };
        S.zusammen = null;
        S.mass = { p1: null, p2: null, meter: null, pxProM: 78.74 };
        S.modus = "ansehen"; S.punkte = [];
        p(vorbelegungAktiv() === true, "Mit Vorbelegung und ohne Messung ist sie aktiv");
        const st = statustext();
        p(/1:100 vorbelegt/.test(st) && /skalieren/.test(st),
          "Der Status muss die Vorbelegung und ihre Folge nennen, ist: " + st);
        S.zusammen = { px_je_meter: 100 };
        p(vorbelegungAktiv() === false, "Eine Messung beendet die Vorbelegung");

        /* Die Gegenprobe am Bestand: eine Messung zieht die mit der
           Vorbelegung umfahrenen Flächen nach — außer dort, wo der
           Bearbeiter die Fläche selbst geändert hat. */
        const qPoly = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
        window.App = { p: { raeume: [
          { id: "rp1", A: 100, umfang_m: 40,
            herkunft: { massstab_vorbelegt: true, flaeche_quelle: "im Plan umfahren — Maßstab 1:100 vorbelegt, nicht belegt" } },
          { id: "rp2", A: 99, umfang_m: 40,
            herkunft: { massstab_vorbelegt: true, flaeche_quelle: "im Plan umfahren — Maßstab 1:100 vorbelegt, nicht belegt" } },
        ] } };
        S.polygone = [
          { name: "R1", punkte: qPoly, flaeche: 100, umfang: 40, kanten: [],
            massstab_vorbelegt: true, raumId: "rp1" },
          { name: "R2", punkte: qPoly, flaeche: 100, umfang: 40, kanten: [],
            massstab_vorbelegt: true, raumId: "rp2" },
        ];
        S.zusammen = { px_je_meter: 2 };
        S.mass = { p1: null, p2: null, meter: null, pxProM: 2 };
        vorbelegungNachziehen();
        const r1 = window.App.p.raeume[0], r2 = window.App.p.raeume[1];
        p(Math.abs(S.polygone[0].flaeche - 25) < 1e-9
          && S.polygone[0].massstab_vorbelegt === false,
          "Die Messung muss das Polygon neu skalieren und die Marke löschen");
        p(r1.A === 25 && r1.umfang_m === 20
          && r1.herkunft.massstab_vorbelegt === false
          && /Maßstab gemessen/.test(r1.herkunft.flaeche_quelle),
          "Der übernommene Raum muss nachgezogen werden, ist: A=" + r1.A);
        p(r2.A === 99 && r2.herkunft.massstab_vorbelegt === true,
          "Eine vom Bearbeiter geänderte Fläche wird nie überschrieben");
      } finally {
        window.App = merk.App; S.seitenIndex = merk.si; S.modus = merk.modus;
        S.bild = merk.bild; S.messungen = merk.mess; S.entwurf = merk.entwurf;
        S.bezeichnung = merk.bez; S.bildDpi = merk.dpi; S.kreuz = merk.kreuz;
        S.zoom = merk.zoom; S.uebernommen = merk.ueb; S.zusammen = merk.zus;
        S.mass = merk.mass; S.polygone = merk.poly; S.punkte = merk.pkt;
        window.render = merk.rend;
      }
      return { ok: f.length === 0, fehler: f, anzahl: n };
    },
  };
})();
