/* ===========================================================================
 * modul_dialog.js — Meldungen und Rückfragen, die die Seite nicht einfrieren
 * ===========================================================================
 *
 * WARUM ES DIESE DATEI GIBT
 *
 * alert(), confirm() und prompt() halten den ganzen Browser-Tab an. Kein
 * Neuzeichnen, kein Fortschrittsbalken, keine laufende Auswertung — die
 * Seite steht, bis jemand klickt. Am 23.08.2026 hat das einen Prüfer drei
 * Minuten lang glauben lassen, das Werkzeug sei abgestürzt: der Knopf
 * „Bericht" öffnet zwei confirm() hintereinander, und dahinter läuft ein
 * Aufbau, der bei einem Projekt mit Planabbildungen über eine Minute
 * braucht. Beim automatisierten Nachstellen desselben Klicks blieb der Tab
 * so fest stehen, dass er nur noch geschlossen werden konnte.
 *
 * Dazu kommt der zweite, ältere Einwand, der an mehreren Stellen in app.js
 * schon notiert ist: nach dem Wegklicken ist die Auskunft weg. Wer zwölf
 * Zeilen gemeldet bekommt und den Dialog schließt, hat nichts mehr davon.
 *
 * WAS DIESES MODUL ANBIETET
 *
 *   sagen(text, opt)            eine Meldung IN DER SEITE. Kehrt sofort
 *                               zurück, blockiert nichts, bleibt stehen bis
 *                               sie weggeklickt wird (Meldungen der Stufe
 *                               „gut" verschwinden nach kurzer Zeit selbst).
 *   fragen(opt) -> Promise      Ja/Nein. Ersetzt confirm().
 *   eingabe(opt) -> Promise     Text eingeben. Ersetzt prompt().
 *   arbeit(text) -> Griff       Fortschrittsanzeige für lange Läufe, mit
 *                               .text(t) zum Weiterschreiben und .fertig().
 *
 * fragen() und eingabe() geben ein Promise zurück. Das ist der ganze
 * Unterschied zu confirm()/prompt() und der Grund, warum die aufrufenden
 * Stellen await brauchen. Dafür läuft die Seite weiter: sie zeichnet, sie
 * zeigt Fortschritt, und ein zweiter Klick geht nicht verloren.
 *
 * BARRIEREFREIHEIT. Die Rückfrage ist ein echter Dialog (role="dialog",
 * aria-modal), sie fängt den Tabulator, Esc bricht ab, Eingabe bestätigt,
 * und nach dem Schließen kehrt der Fokus dorthin zurück, wo er war. Die
 * Meldungen stehen in einem Bereich mit aria-live, damit ein Screenreader
 * sie vorliest, ohne dass jemand hinsieht.
 * =========================================================================== */
"use strict";

(function () {
  const STIL = `
  #dlgmeldungen{position:fixed;right:16px;bottom:16px;z-index:9000;display:flex;
    flex-direction:column;gap:8px;max-width:min(460px,calc(100vw - 32px));
    pointer-events:none}
  #dlgmeldungen .dlgm{pointer-events:auto;background:var(--weiss,#fff);
    border:1px solid var(--linie,#E4E3E5);border-left-width:4px;
    border-radius:var(--r-k,10px);box-shadow:0 8px 26px rgba(0,0,0,.14);
    padding:11px 13px;font-size:14px;line-height:1.45;display:flex;gap:10px;
    align-items:flex-start;animation:dlgauf .16s ease-out}
  @keyframes dlgauf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){#dlgmeldungen .dlgm{animation:none}}
  #dlgmeldungen .dlgm.gut{border-left-color:var(--ok,#2F6B38);background:var(--ok-bg,#EDF7ED)}
  #dlgmeldungen .dlgm.hinweis{border-left-color:var(--blau,#123A63)}
  #dlgmeldungen .dlgm.warnung{border-left-color:var(--warn-mark,#C8951C);
    background:var(--warn-bg,#FDF6E3)}
  #dlgmeldungen .dlgm.fehler{border-left-color:var(--rot,#921A38);
    background:var(--rot-bg,#FBEEF1)}
  #dlgmeldungen .dlgm .txt{flex:1;white-space:pre-wrap}
  #dlgmeldungen .dlgm .txt b{display:block;margin-bottom:2px}
  #dlgmeldungen .dlgm button{flex:none;border:0;background:transparent;cursor:pointer;
    font-size:18px;line-height:1;color:var(--mute,#57514F);padding:0 2px;border-radius:6px}
  #dlgmeldungen .dlgm button:focus-visible{outline:2px solid var(--blau,#123A63);
    outline-offset:2px}
  #dlgschirm{position:fixed;inset:0;z-index:9100;background:rgba(20,18,19,.42);
    display:flex;align-items:center;justify-content:center;padding:20px}
  #dlgschirm .dlgk{background:var(--weiss,#fff);border-radius:var(--r,14px);
    box-shadow:0 20px 60px rgba(0,0,0,.3);max-width:min(560px,100%);
    max-height:calc(100vh - 40px);overflow:auto;padding:20px 22px}
  #dlgschirm h3{margin:0 0 8px;font-size:17px;
    font-family:var(--schrift-h,inherit)}
  #dlgschirm .dlgtext{white-space:pre-wrap;font-size:14.5px;line-height:1.5;
    color:var(--anthrazit,#272425);margin-bottom:14px}
  #dlgschirm input[type=text],#dlgschirm textarea{width:100%;font:inherit;
    padding:9px 11px;border:1px solid var(--linie-s,#CFCED0);
    border-radius:var(--r-s,8px);margin-bottom:14px}
  #dlgschirm textarea{min-height:74px;resize:vertical}
  #dlgschirm .dlgreihe{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
  #dlgschirm .dlgreihe button{font:inherit;padding:9px 16px;border-radius:var(--r-s,8px);
    border:1px solid var(--linie-s,#CFCED0);background:var(--weiss,#fff);cursor:pointer}
  #dlgschirm .dlgreihe button.ja{background:var(--blau,#123A63);
    border-color:var(--blau,#123A63);color:#fff}
  #dlgschirm .dlgreihe button:focus-visible{outline:2px solid var(--blau,#123A63);
    outline-offset:2px}
  #dlgarbeit{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:9200;
    background:var(--anthrazit,#272425);color:#fff;border-radius:999px;
    padding:9px 18px;font-size:14px;box-shadow:0 8px 26px rgba(0,0,0,.24);
    display:flex;gap:10px;align-items:center}
  #dlgarbeit .rad{width:14px;height:14px;border-radius:50%;flex:none;
    border:2px solid rgba(255,255,255,.35);border-top-color:#fff;
    animation:dlgdreh .9s linear infinite}
  @keyframes dlgdreh{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){#dlgarbeit .rad{animation-duration:3s}}
  @media print{#dlgmeldungen,#dlgschirm,#dlgarbeit{display:none}}
  `;

  let stilDa = false;
  function stil() {
    if (stilDa || typeof document === "undefined" || !document.head) return;
    const s = document.createElement("style");
    s.id = "dlgstil";
    s.textContent = STIL;
    document.head.appendChild(s);
    stilDa = true;
  }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function korb() {
    let k = document.getElementById("dlgmeldungen");
    if (!k) {
      k = document.createElement("div");
      k.id = "dlgmeldungen";
      /* polite, nicht assertive: eine Meldung soll den Screenreader nicht
         mitten im Satz unterbrechen. */
      k.setAttribute("aria-live", "polite");
      k.setAttribute("aria-atomic", "false");
      document.body.appendChild(k);
    }
    return k;
  }

  /* ------------------------------------------------------------------ *
   * 1  sagen — die Meldung in der Seite
   * ------------------------------------------------------------------ */
  /** @param opt {stufe, titel, dauer_ms}
   *  Gibt einen Griff zurück, mit dem sich die Meldung schließen lässt. */
  function sagen(text, opt) {
    const o = opt || {};
    if (typeof document === "undefined" || !document.body) return { weg() {} };
    stil();
    const stufe = o.stufe || "hinweis";
    const el = document.createElement("div");
    el.className = "dlgm " + stufe;
    el.innerHTML = '<div class="txt">'
      + (o.titel ? "<b>" + esc(o.titel) + "</b>" : "")
      + esc(text) + "</div>"
      + '<button type="button" aria-label="Meldung schließen">&times;</button>';
    const weg = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    el.querySelector("button").addEventListener("click", weg);
    const k = korb();
    k.appendChild(el);
    /* Sechs Meldungen übereinander liest niemand mehr; die älteste geht.
       Verloren ist dabei nichts, was nicht schon gelesen werden konnte. */
    while (k.children.length > 5) k.removeChild(k.firstChild);
    /* Eine Erfolgsmeldung darf von selbst gehen. Eine Warnung und ein
       Fehler bleiben stehen, bis jemand sie weggeklickt hat — genau das war
       der Einwand gegen alert(): nach dem Wegklicken ist die Auskunft weg,
       und zwar auch die, die man noch gebraucht hätte. */
    const dauer = o.dauer_ms !== undefined ? o.dauer_ms
      : (stufe === "gut" ? 9000 : 0);
    if (dauer > 0) setTimeout(weg, dauer);
    return { weg: weg };
  }

  /* ------------------------------------------------------------------ *
   * 2  fragen und eingabe — der Dialog, der die Seite weiterlaufen lässt
   * ------------------------------------------------------------------ */
  let offen = null;

  function schirmBauen(o, mitFeld) {
    stil();
    const vorher = document.activeElement;
    const schirm = document.createElement("div");
    schirm.id = "dlgschirm";
    const feldHtml = mitFeld
      ? (o.mehrzeilig === false
        ? '<input type="text" id="dlgfeld" value="' + esc(o.wert || "") + '"'
          + (o.platzhalter ? ' placeholder="' + esc(o.platzhalter) + '"' : "")
          + ' aria-label="' + esc(o.feldname || "Eingabe") + '">'
        : '<textarea id="dlgfeld" aria-label="' + esc(o.feldname || "Eingabe") + '"'
          + (o.platzhalter ? ' placeholder="' + esc(o.platzhalter) + '"' : "")
          + ">" + esc(o.wert || "") + "</textarea>")
      : "";
    schirm.innerHTML = '<div class="dlgk" role="dialog" aria-modal="true"'
      + ' aria-labelledby="dlgtitel">'
      + '<h3 id="dlgtitel">' + esc(o.titel || "Rückfrage") + "</h3>"
      + '<div class="dlgtext">' + esc(o.text || "") + "</div>"
      + feldHtml
      + '<div class="dlgreihe">'
      + '<button type="button" data-w="nein">' + esc(o.neinText || "Abbrechen") + "</button>"
      + '<button type="button" class="ja" data-w="ja">' + esc(o.jaText || "OK") + "</button>"
      + "</div></div>";
    document.body.appendChild(schirm);
    return { schirm: schirm, vorher: vorher };
  }

  function schirmFuehren(bau, fertig) {
    const schirm = bau.schirm;
    const knoepfe = Array.prototype.slice.call(schirm.querySelectorAll("button, input, textarea"));
    const schliessen = function (wert) {
      document.removeEventListener("keydown", taste, true);
      if (schirm.parentNode) schirm.parentNode.removeChild(schirm);
      offen = null;
      if (bau.vorher && bau.vorher.focus) { try { bau.vorher.focus(); } catch (x) {} }
      fertig(wert);
    };
    const taste = function (ev) {
      if (ev.key === "Escape") { ev.preventDefault(); schliessen(null); return; }
      if (ev.key !== "Tab" || !knoepfe.length) return;
      /* Der Tabulator bleibt im Dialog. Ohne das wandert der Fokus hinter
         den Schirm und der Bearbeiter tippt blind in die Seite dahinter. */
      const erst = knoepfe[0], letzt = knoepfe[knoepfe.length - 1];
      if (ev.shiftKey && document.activeElement === erst) {
        ev.preventDefault(); letzt.focus();
      } else if (!ev.shiftKey && document.activeElement === letzt) {
        ev.preventDefault(); erst.focus();
      }
    };
    document.addEventListener("keydown", taste, true);
    schirm.addEventListener("click", function (ev) {
      if (ev.target === schirm) schliessen(null);
      const b = ev.target.closest ? ev.target.closest("button[data-w]") : null;
      if (!b) return;
      schliessen(b.dataset.w === "ja" ? true : null);
    });
    const feld = schirm.querySelector("#dlgfeld");
    if (feld) {
      feld.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" && (feld.tagName !== "TEXTAREA" || ev.metaKey || ev.ctrlKey)) {
          ev.preventDefault();
          schliessen(true);
        }
      });
      setTimeout(function () { feld.focus(); if (feld.select) feld.select(); }, 0);
    } else {
      setTimeout(function () {
        const j = schirm.querySelector('button[data-w="ja"]');
        if (j) j.focus();
      }, 0);
    }
    return schliessen;
  }

  /** Ja/Nein. Ersatz für confirm(). @return Promise<boolean> */
  function fragen(opt) {
    const o = typeof opt === "string" ? { text: opt } : (opt || {});
    if (typeof document === "undefined" || !document.body) return Promise.resolve(false);
    if (offen && document.getElementById("dlgschirm")) {
      return Promise.resolve(false);                // eine Rückfrage zur Zeit
    }
    /* Selbstheilung, am 25.08.2026 am Gunnebach-Echtlauf gemessen: die
       Sperre stand noch, aber kein Schirm war mehr im Dokument — jeder
       weitere Dialog kam sofort mit null/false zurück, und Knöpfe wie
       „Entscheiden und mit Vermerk bestätigen" taten sichtbar nichts.
       Eine Sperre ohne Schirm ist kein offener Dialog, sondern ein Leck. */
    offen = true;
    return new Promise(function (fertig) {
      const bau = schirmBauen(o, false);
      schirmFuehren(bau, function (w) { fertig(w === true); });
    });
  }

  /** Text eingeben. Ersatz für prompt(). @return Promise<string|null> */
  function eingabe(opt) {
    const o = typeof opt === "string" ? { text: opt } : (opt || {});
    if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
    if (offen && document.getElementById("dlgschirm")) return Promise.resolve(null);
    offen = true;   /* stale Sperre ohne Schirm heilt sich hier, wie in fragen() */
    return new Promise(function (fertig) {
      const bau = schirmBauen(o, true);
      const feld = bau.schirm.querySelector("#dlgfeld");
      schirmFuehren(bau, function (w) {
        fertig(w === true ? String(feld ? feld.value : "") : null);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 3  arbeit — Fortschritt bei langen Läufen
   * ------------------------------------------------------------------ *
   * Der Bericht baut bei einem Projekt mit Planabbildungen über eine
   * Minute. Ohne Anzeige sieht das aus wie ein Absturz. Der Griff kommt mit
   * einem warten(), das dem Browser eine Bildschirmauffrischung lässt,
   * bevor die Arbeit losgeht — sonst erscheint die Anzeige erst, wenn alles
   * fertig ist. */
  function arbeit(text) {
    if (typeof document === "undefined" || !document.body) {
      return { text() {}, fertig() {}, warten() { return Promise.resolve(); } };
    }
    stil();
    const alt = document.getElementById("dlgarbeit");
    if (alt && alt.parentNode) alt.parentNode.removeChild(alt);
    const el = document.createElement("div");
    el.id = "dlgarbeit";
    el.setAttribute("role", "status");
    el.innerHTML = '<span class="rad" aria-hidden="true"></span><span class="txt"></span>';
    el.querySelector(".txt").textContent = String(text || "Einen Moment …");
    document.body.appendChild(el);
    return {
      text(t) { const x = el.querySelector(".txt"); if (x) x.textContent = String(t); },
      fertig() { if (el.parentNode) el.parentNode.removeChild(el); },
      /* Zwei Bildaufbauten abwarten. Einer genügt in Chrome nicht immer:
         der Rahmen ist dann gemalt, der Text noch nicht.
         DER WECKER DANEBEN IST PFLICHT. requestAnimationFrame läuft in einem
         Reiter im Hintergrund gar nicht — gemessen am 23.08.2026: der Bericht
         wurde in einem nicht sichtbaren Reiter angestoßen, die Anzeige „Der
         Bericht wird aufgebaut" erschien nach 1 ms, und danach geschah
         nichts mehr; nach 163 Sekunden stand sie immer noch da. Wer auf ein
         Bild wartet, das nie gemalt wird, wartet ewig. Deshalb gewinnt,
         was zuerst kommt. */
      warten() {
        return new Promise(function (f) {
          let fertig = false;
          const einmal = function () { if (!fertig) { fertig = true; f(); } };
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () { setTimeout(einmal, 0); });
            });
          }
          setTimeout(einmal, 60);
        });
      },
    };
  }

  /* ------------------------------------------------------------------ *
   * 4  Selbsttest
   * ------------------------------------------------------------------ *
   * Geprüft wird, was ohne Bildschirm prüfbar ist: dass keine der drei
   * Funktionen die alten, blockierenden Aufrufe benutzt, dass fragen() und
   * eingabe() ein Promise liefern und ohne Dokument nicht abstürzen. */
  function selbsttest() {
    const f = [];
    let n = 0;
    const pruef = function (bed, txt) { n++; if (!bed) f.push(txt); };

    /* Die Kommentare fliegen vorher heraus: sie SPRECHEN über alert() und
       confirm(), und ein Treffer darin wäre ein Fehlalarm. Geprüft wird der
       Code. */
    const ohneKommentar = function (t) {
      return String(t).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
    };
    const quelle = ohneKommentar(String(sagen) + String(fragen) + String(eingabe)
      + String(arbeit) + String(schirmBauen) + String(schirmFuehren));
    pruef(!/[^.\w]alert\s*\(/.test(quelle), "modul_dialog darf kein alert() benutzen");
    pruef(!/[^.\w]confirm\s*\(/.test(quelle), "modul_dialog darf kein confirm() benutzen");
    pruef(!/[^.\w]prompt\s*\(/.test(quelle), "modul_dialog darf kein prompt() benutzen");

    /* Die Sperre „eine Rückfrage zur Zeit" darf nur greifen, solange ihr
       Schirm wirklich im Dokument steht. Am 25.08.2026 (Gunnebach-Echtlauf)
       stand sie ohne Schirm — und jeder weitere Dialog verpuffte still. */
    pruef(/offen\s*&&\s*document\.getElementById\(["']dlgschirm["']\)/.test(String(fragen)),
      "fragen(): die Sperre muss am Schirm im Dokument haengen, nicht am Merker allein");
    pruef(/offen\s*&&\s*document\.getElementById\(["']dlgschirm["']\)/.test(String(eingabe)),
      "eingabe(): die Sperre muss am Schirm im Dokument haengen, nicht am Merker allein");

    const ohneDok = typeof document === "undefined" || !document.body;
    if (ohneDok) {
      pruef(fragen("x") instanceof Promise, "fragen() muss auch ohne Dokument ein Promise liefern");
      pruef(eingabe("x") instanceof Promise, "eingabe() muss auch ohne Dokument ein Promise liefern");
      pruef(typeof sagen("x").weg === "function", "sagen() muss auch ohne Dokument einen Griff liefern");
      const a = arbeit("x");
      pruef(typeof a.fertig === "function", "arbeit() muss auch ohne Dokument einen Griff liefern");
      pruef(a.warten() instanceof Promise, "warten() muss ein Promise liefern");
    } else {
      const g = sagen("Probe", { stufe: "gut", dauer_ms: 1 });
      pruef(!!document.getElementById("dlgmeldungen"), "sagen() muss den Meldungskorb anlegen");
      g.weg();
      pruef(document.querySelectorAll("#dlgmeldungen .dlgm").length === 0,
        "eine geschlossene Meldung darf nicht stehen bleiben");
      /* warten() muss auch dann zurueckkommen, wenn kein Bild gemalt wird —
         in einem Reiter im Hintergrund laeuft requestAnimationFrame nicht.
         Geprueft wird die Form: neben dem Bildaufbau steht ein Wecker. */
      pruef(/setTimeout\(\s*einmal\s*,\s*\d+\s*\)/.test(String(arbeit)),
        "warten() braucht neben requestAnimationFrame einen Wecker, sonst "
        + "haengt es in einem Reiter im Hintergrund fuer immer");
    }
    return { ok: f.length === 0, fehler: f, anzahl: n };
  }

  const API = { sagen: sagen, fragen: fragen, eingabe: eingabe, arbeit: arbeit,
                selbsttest: selbsttest };
  if (typeof window !== "undefined") window.MODUL_DIALOG = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})();
