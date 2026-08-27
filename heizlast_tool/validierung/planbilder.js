/* ===========================================================================
 * planbilder.js — synthetische Planbilder fuer die Kalibrierung
 * ===========================================================================
 * WARUM DIESE DATEI EXISTIERT
 *
 * validierung/planpruefung_test.js las seine acht Bildvarianten bis zum
 * 27.08.2026 aus einem festen absoluten Pfad:
 *   /private/tmp/claude-501/.../scratchpad/pruefdaten
 * Das war ein Arbeitsverzeichnis auf dem Rechner des Verfassers. Die Bilder
 * lagen nie im Projekt. Folge: der Selbsttest brach mit ENOENT ab, build.py
 * brach an Schritt 2b ab — und damit liess sich das Werkzeug auf KEINEM
 * Rechner mehr bauen, auch nicht auf dem des Verfassers, sobald /tmp geleert
 * war. Das war der Grund, warum nichts mehr veroeffentlicht werden konnte.
 *
 * WAS DIESE DATEI IST — UND WAS SIE NICHT IST
 *
 * Sie erzeugt die acht Varianten deterministisch aus Code: eine
 * strichzeichnungsartige Grundrissvorlage und darauf definierte
 * Verschlechterungen (Weichzeichnen, Kontrast senken, Verkleinern, Schraeg
 * stellen). Damit ist der Selbsttest reproduzierbar, ohne Fremddaten und ohne
 * personenbezogene Planinhalte.
 *
 * Sie ist NICHT der Ersatz fuer eine Kalibrierung an echten Scans. Die
 * urspruenglichen Bilder waren nach der Beschreibung Ausschnitte echter
 * CAD-Plaene; sie sind nicht wiederherstellbar. Was hier geprueft wird, ist
 * deshalb: greifen die Schwellen in der Richtung, in der sie gedacht sind.
 * Ob die Schwellenwerte selbst an echten Buerounterlagen richtig sitzen, ist
 * eine OFFENE fachliche Validierung — festgehalten in BASELINE_REPORT.md.
 *
 * Die Sollurteile stammen aus der ABSICHT der jeweiligen Verschlechterung
 * (ein bis zur Unlesbarkeit weichgezeichneter Plan MUSS gesperrt werden),
 * nicht aus der Ausgabe des Pruefling. Sonst pruefte der Test sich selbst.
 * =========================================================================== */
"use strict";

const PAPIER = 246;
const TINTE = 28;

/** Graustufenbild als Float32Array, Papierweiss vorbelegt. */
function blatt(w, h) {
  const g = new Float32Array(w * h);
  g.fill(PAPIER);
  return { g: g, w: w, h: h };
}

/** Strich von (x0,y0) nach (x1,y1), Dicke d, mit optionaler Drehung um die
 *  Blattmitte. Die Drehung bildet einen schief eingelegten Bogen nach. */
function strich(b, x0, y0, x1, y1, d, grad) {
  const a = (grad || 0) * Math.PI / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const cx = b.w / 2, cy = b.h / 2;
  const dreh = function (x, y) {
    const dx = x - cx, dy = y - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };
  const [ax, ay] = dreh(x0, y0);
  const [bx, by] = dreh(x1, y1);
  const laenge = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  const n = Math.ceil(laenge) + 1;
  const r = Math.max(1, d) / 2;
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++) {
      for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++) {
        const px = Math.round(x + ox), py = Math.round(y + oy);
        if (px < 0 || py < 0 || px >= b.w || py >= b.h) continue;
        if (ox * ox + oy * oy > (r + 0.35) * (r + 0.35)) continue;
        b.g[py * b.w + px] = TINTE;
      }
    }
  }
}

function rechteck(b, x, y, bw, bh, d, grad) {
  strich(b, x, y, x + bw, y, d, grad);
  strich(b, x + bw, y, x + bw, y + bh, d, grad);
  strich(b, x + bw, y + bh, x, y + bh, d, grad);
  strich(b, x, y + bh, x, y, d, grad);
}

/** Eine Grundrissvorlage: Aussenwaende zweischalig, Innenwaende, Tueroeffnungen,
 *  zwei Masskettenlinien mit Teilstrichen und Raumstempel als kurze Striche.
 *  Der Zeichnungsanteil liegt damit im Bereich echter Strichzeichnungen
 *  (wenige Prozent), nicht bei einer Flaeche. */
function grundriss(w, h, grad) {
  const b = blatt(w, h);
  const m = Math.round(Math.min(w, h) * 0.10);       // Rand
  const iw = w - 2 * m, ih = h - 2 * m;
  const dick = Math.max(2, Math.round(Math.min(w, h) / 300));

  // Aussenwand zweischalig
  rechteck(b, m, m, iw, ih, dick, grad);
  rechteck(b, m + 3 * dick, m + 3 * dick, iw - 6 * dick, ih - 6 * dick, dick, grad);

  // Innenwaende: ein Querflur und drei Raeume
  const yq = m + Math.round(ih * 0.55);
  strich(b, m, yq, m + iw, yq, dick, grad);
  strich(b, m + Math.round(iw * 0.35), m, m + Math.round(iw * 0.35), yq, dick, grad);
  strich(b, m + Math.round(iw * 0.70), m, m + Math.round(iw * 0.70), yq, dick, grad);
  strich(b, m + Math.round(iw * 0.50), yq, m + Math.round(iw * 0.50), m + ih, dick, grad);

  // Tueroeffnungen: Papier zuruecksetzen ist hier nicht noetig, es genuegt,
  // die Waende mit Luecken zu zeichnen. Stattdessen Tuerblaetter als Viertelbogen.
  const tb = Math.round(Math.min(iw, ih) * 0.08);
  strich(b, m + Math.round(iw * 0.35), yq - tb, m + Math.round(iw * 0.35) + tb, yq, 1, grad);
  strich(b, m + Math.round(iw * 0.70), yq - tb, m + Math.round(iw * 0.70) + tb, yq, 1, grad);

  // Zwei Massketten mit Teilstrichen
  const yk = m + ih + Math.round(Math.min(w, h) * 0.035);
  if (yk < h - 2) {
    strich(b, m, yk, m + iw, yk, 1, grad);
    for (let i = 0; i <= 8; i++) {
      const x = m + Math.round(iw * i / 8);
      strich(b, x, yk - 4, x, yk + 4, 1, grad);
    }
  }
  const xk = m - Math.round(Math.min(w, h) * 0.035);
  if (xk > 2) {
    strich(b, xk, m, xk, m + ih, 1, grad);
    for (let i = 0; i <= 6; i++) {
      const y = m + Math.round(ih * i / 6);
      strich(b, xk - 4, y, xk + 4, y, 1, grad);
    }
  }

  // Raumstempel: je Raum drei kurze Striche (Name, Flaeche, Nummer)
  const stempel = [
    [0.12, 0.20], [0.45, 0.20], [0.80, 0.20], [0.22, 0.78], [0.70, 0.78],
  ];
  const sl = Math.round(iw * 0.11);
  stempel.forEach(function (s) {
    const x = m + Math.round(iw * s[0]), y = m + Math.round(ih * s[1]);
    for (let z = 0; z < 3; z++) {
      strich(b, x, y + z * Math.max(4, Math.round(ih * 0.028)),
             x + sl - z * Math.round(sl * 0.2),
             y + z * Math.max(4, Math.round(ih * 0.028)), 2, grad);
    }
  });
  return b;
}

/** Separables Kastenfilter-Weichzeichnen. Senkt die Laplace-Varianz. */
function weich(b, radius, durchgaenge) {
  let g = b.g;
  for (let d = 0; d < (durchgaenge || 1); d++) {
    const tmp = new Float32Array(g.length);
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        let s = 0, n = 0;
        for (let o = -radius; o <= radius; o++) {
          const xx = x + o;
          if (xx < 0 || xx >= b.w) continue;
          s += g[y * b.w + xx]; n++;
        }
        tmp[y * b.w + x] = s / n;
      }
    }
    const out = new Float32Array(g.length);
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        let s = 0, n = 0;
        for (let o = -radius; o <= radius; o++) {
          const yy = y + o;
          if (yy < 0 || yy >= b.h) continue;
          s += tmp[yy * b.w + x]; n++;
        }
        out[y * b.w + x] = s / n;
      }
    }
    g = out;
  }
  return { g: g, w: b.w, h: b.h };
}

/** Kontrast zur Mitte stauchen: die Blaupause. */
function flach(b, faktor, mitte) {
  const m = mitte === undefined ? 150 : mitte;
  const g = new Float32Array(b.g.length);
  for (let i = 0; i < g.length; i++) g[i] = m + (b.g[i] - m) * faktor;
  return { g: g, w: b.w, h: b.h };
}

/** Flaechenmittelnde Verkleinerung. */
function klein(b, faktor) {
  const w = Math.max(1, Math.round(b.w * faktor)), h = Math.max(1, Math.round(b.h * faktor));
  const g = new Float32Array(w * h);
  const sx = b.w / w, sy = b.h / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let yy = Math.floor(y * sy); yy < Math.min(b.h, Math.ceil((y + 1) * sy)); yy++) {
        for (let xx = Math.floor(x * sx); xx < Math.min(b.w, Math.ceil((x + 1) * sx)); xx++) {
          s += b.g[yy * b.w + xx]; n++;
        }
      }
      g[y * w + x] = n ? s / n : PAPIER;
    }
  }
  return { g: g, w: w, h: h };
}

/** Graustufen -> RGBA, wie es pruefeBild() erwartet. */
function alsBild(b) {
  const d = new Uint8ClampedArray(b.w * b.h * 4);
  for (let i = 0, j = 0; i < b.g.length; i++, j += 4) {
    const v = b.g[i] < 0 ? 0 : (b.g[i] > 255 ? 255 : b.g[i]);
    d[j] = v; d[j + 1] = v; d[j + 2] = v; d[j + 3] = 255;
  }
  return { data: d, width: b.w, height: b.h };
}

/* ---------------------------------------------------------------------------
 * Die acht Varianten. Jede nennt, WAS sie nachbildet und WARUM das Urteil so
 * ausfallen muss.
 * ------------------------------------------------------------------------ */
const VARIANTEN = {
  /* Sauber ausgegebene Vektorzeichnung, gross und scharf. Muss durchgehen,
     sonst sperrt das Werkzeug brauchbare Unterlagen aus. */
  scharf_gross: function () { return alsBild(grundriss(1600, 1200, 0)); },

  /* Bildschirmfoto oder leicht weicher Scan: noch arbeitsfaehig, aber die
     Masszahlen sind gegenzulesen. Darf nicht gesperrt werden. */
  leicht_weich: function () { return alsBild(weich(grundriss(1600, 1200, 0), 1, 2)); },

  /* Verwackelte Handyaufnahme. Linien und Masszahlen sind nicht mehr zu
     unterscheiden -> sperren, sonst entsteht eine Heizlast auf geratenen Massen. */
  unscharf: function () { return alsBild(weich(grundriss(1600, 1200, 0), 4, 3)); },

  /* Alte Blaupause: Linien heben sich kaum vom Untergrund ab -> sperren. */
  blaupause: function () { return alsBild(flach(grundriss(1600, 1200, 0), 0.28)); },

  /* Zu klein ausgeschnittenes Bildschirmfoto: kuerzere Kante unter 600 Pixel,
     Massketten nicht sicher lesbar -> sperren. */
  klein: function () { return alsBild(klein(grundriss(1600, 1200, 0), 0.30)); },

  /* Schief eingelegter Bogen, 2 Grad. Beim Umfahren verzerrt das die Flaechen
     merklich -> sperren. */
  schief_2grad: function () { return alsBild(grundriss(1600, 1200, 2.0)); },

  /* Halbes Grad Schraeglage: praktisch unvermeidbar, darf nicht sperren. */
  schief_05grad: function () { return alsBild(grundriss(1600, 1200, 0.5)); },

  /* Leeres Blatt oder Deckblatt ohne Zeichnung -> sperren. */
  leer: function () { return alsBild(blatt(1600, 1200)); },
};

module.exports = {
  VARIANTEN: VARIANTEN,
  grundriss: grundriss, blatt: blatt, weich: weich, flach: flach,
  klein: klein, alsBild: alsBild,
};
