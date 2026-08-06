/* GREEN – green-nwg.de · Vanilla JS, keine Dependencies, kein Tracking */
(function () {
  'use strict';

  /* Mobile Navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setNav = function (open, refocus) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
      if (refocus) toggle.focus();
    };
    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setNav(false, true);
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setNav(false);
    });
  }

  /* Header-Zustand beim Scrollen */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll-Reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('in');
    });
  }

  /* Zähler-Animation in KPI-Kacheln */
  var counters = document.querySelectorAll('[data-count]');
  /* Ohne Animation (reduzierte Bewegung oder fehlender Observer) muss der
     Endwert sofort dastehen – sonst zeigt die Seite dauerhaft "0". */
  if (counters.length && (reduceMotion || !('IntersectionObserver' in window))) {
    counters.forEach(function (el) {
      el.textContent = el.getAttribute('data-count');
    });
  } else if (counters.length) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          cio.unobserve(entry.target);
          var el = entry.target;
          var tile = el.closest('.kpi');
          if (tile) tile.classList.add('in');
          var target = parseInt(el.getAttribute('data-count'), 10);
          el.textContent = '0';
          var start = null;
          var dur = 1100;
          var startVal = 0;
          function tick(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(startVal + (target - startVal) * eased);
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  }

  /* Kontakt-/Terminformular: öffnet das E-Mail-Programm mit vorausgefüllter Nachricht.
     So funktioniert die Seite auf jedem statischen Hosting ohne Backend.
     (Bei Bedarf einfach durch einen Form-Endpoint ersetzen, siehe README.) */
  var form = document.getElementById('contact-form');
  if (form) {
    var markErrors = function () {
      var first = null;
      Array.prototype.forEach.call(form.elements, function (f) {
        if (!f.name || f.type === 'submit') return;
        var wrap = f.closest('.form-field');
        var msgId = f.id + '-error';
        var old = document.getElementById(msgId);
        if (f.checkValidity()) {
          f.removeAttribute('aria-invalid');
          f.removeAttribute('aria-describedby');
          if (old) old.remove();
          return;
        }
        f.setAttribute('aria-invalid', 'true');
        f.setAttribute('aria-describedby', msgId);
        if (!old && wrap) {
          var msg = document.createElement('p');
          msg.id = msgId;
          msg.className = 'field-error';
          msg.textContent = f.validationMessage || 'Bitte prüfen Sie diese Angabe.';
          wrap.appendChild(msg);
        } else if (old) {
          old.textContent = f.validationMessage || 'Bitte prüfen Sie diese Angabe.';
        }
        if (!first) first = f;
      });
      return first;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        var first = markErrors();
        var status = document.getElementById('form-status');
        if (status) status.textContent = 'Bitte ergänzen Sie die markierten Pflichtfelder.';
        if (first) first.focus();
        return;
      }
      markErrors();

      var get = function (name) {
        var f = form.elements[name];
        return f && f.value ? f.value.trim() : '';
      };

      var lines = [
        'Guten Tag,',
        '',
        'ich interessiere mich für eine Energieberatung.',
        '',
        'Name: ' + get('name'),
        'Unternehmen: ' + (get('company') || '–'),
        'Telefon: ' + (get('phone') || '–'),
        'E-Mail: ' + get('email'),
        'Gebäudetyp: ' + (get('building') || '–'),
      ];
      var msg = get('message');
      if (msg) {
        lines.push('', 'Anliegen:', msg);
      }
      lines.push('', 'Mit freundlichen Grüßen', get('name'));

      var subject = 'Anfrage Beratungstermin – ' + (get('company') || get('name'));
      var href =
        'mailto:info@green-nwg.de?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(lines.join('\n'));

      window.location.href = href;

      var status = document.getElementById('form-status');
      if (status) {
        status.textContent =
          'Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht – einfach absenden.';
      }
    });
  }

  /* ------------------------------------------------------------------
     Einsparrechner
     Kennwerte: gerundete Durchschnitts-Verbrauchskennwerte für deutsche
     Nichtwohngebäude (kWh je m² Nettogrundfläche und Jahr), getrennt nach
     Wärme und Strom. Bewusst konservativ gewählt – die Seite weist überall
     aus, dass nur eine Vor-Ort-Analyse belastbare Zahlen liefert.
     ------------------------------------------------------------------ */
  var calc = document.getElementById('rechner');
  if (calc) {
    var TYPES = {
      buero:         { label: 'Bürogebäude',        waerme: 100, strom: 50 },
      einzelhandel:  { label: 'Einzelhandel',        waerme: 110, strom: 180 },
      produktion:    { label: 'Produktion',          waerme: 130, strom: 120 },
      veranstaltung: { label: 'Veranstaltungsstätte', waerme: 140, strom: 60 },
      bildung:       { label: 'Schule / Hochschule', waerme: 120, strom: 15 },
      kindergarten:  { label: 'Kindergarten',        waerme: 130, strom: 20 },
      kommune:       { label: 'Verwaltungsgebäude',  waerme: 110, strom: 30 },
      hotel:         { label: 'Hotel / Pflege',      waerme: 160, strom: 70 }
    };
    /* Einsparpotenzial nach energetischem Zustand (Anteil, konservativ) */
    var STATE = { alt: 0.40, teil: 0.25, neu: 0.12 };
    var CO2 = { waerme: 0.20, strom: 0.38 }; /* kg CO2 je kWh */

    var el = function (id) { return document.getElementById(id); };
    var fmt = function (n) { return new Intl.NumberFormat('de-DE').format(Math.round(n)); };
    var eur = function (n) {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR',
        maximumFractionDigits: 0 }).format(Math.round(n));
    };

    function rechne() {
      var t = TYPES[el('r-typ').value] || TYPES.buero;
      var flaeche = Math.max(50, Math.min(200000, parseFloat(el('r-flaeche').value) || 0));
      var quote = STATE[el('r-zustand').value] || STATE.teil;
      var pStrom = (parseFloat(el('r-preis-strom').value) || 25) / 100;
      var pWaerme = (parseFloat(el('r-preis-waerme').value) || 10) / 100;

      var kwhW = t.waerme * flaeche;
      var kwhS = t.strom * flaeche;
      var kostenIst = kwhW * pWaerme + kwhS * pStrom;
      var kostenNeu = kostenIst * (1 - quote);
      var sparen = kostenIst - kostenNeu;
      var co2 = (kwhW * CO2.waerme + kwhS * CO2.strom) * quote / 1000; /* Tonnen */

      el('r-ist').textContent = eur(kostenIst);
      el('r-neu').textContent = eur(kostenNeu);
      el('r-sparen').textContent = eur(sparen);
      el('r-sparen-10').textContent = eur(sparen * 10);
      el('r-quote').textContent = Math.round(quote * 100) + ' %';
      el('r-co2').textContent = fmt(co2) + ' t';
      el('r-verbrauch').textContent = fmt(kwhW + kwhS) + ' kWh';
      el('r-flaeche-out').textContent = fmt(flaeche) + ' m²';

      /* Balken: Ist = 100 %, Nachher anteilig */
      el('r-bar-neu').style.width = Math.max(6, (1 - quote) * 100) + '%';
      el('r-bar-ist').style.width = '100%';

      var head = el('r-sparen');
      if (head && head.dataset.prev !== head.textContent && !reduceMotion) {
        head.dataset.prev = head.textContent;
        head.classList.remove('bump');
        void head.offsetWidth;
        head.classList.add('bump');
      }

      /* Eine gebündelte Ansage statt sechs einzelner Feldänderungen */
      var live = el('r-live');
      if (live) {
        clearTimeout(rechne._t);
        rechne._t = setTimeout(function () {
          live.textContent =
            'Ergebnis für ' + t.label + ', ' + fmt(flaeche) + ' Quadratmeter: ' +
            'Energiekosten heute rund ' + eur(kostenIst) + ' pro Jahr, ' +
            'nach Sanierung rund ' + eur(kostenNeu) + '. ' +
            'Mögliche Ersparnis ' + eur(sparen) + ' pro Jahr, das entspricht ' +
            Math.round(quote * 100) + ' Prozent.';
        }, 700);
      }
    }

    calc.addEventListener('input', rechne);
    calc.addEventListener('change', rechne);
    rechne();
  }


  /* ------------------------------------------------------------------
     Bewegung
     Alles hier ist rein visuell und schaltet sich bei reduzierter Bewegung
     ab. Kein Element hängt in seiner Sichtbarkeit davon ab.
     ------------------------------------------------------------------ */
  if (!reduceMotion) {
    /* Lesefortschritt oben */
    var bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var sticky = document.querySelector('.sticky-cta');
    var ticking = false;
    var onFrame = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
      if (sticky) sticky.classList.toggle('is-visible', y > 260);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
    }, { passive: true });
    onFrame();

    /* Gestaffelte Reveals: Geschwister bekommen einen Index */
    var groups = document.querySelectorAll(
      '.card-grid, .feature-list, .steps, .quote-grid, .team-grid, .faq-list, .photo-band, .city-chips'
    );
    Array.prototype.forEach.call(groups, function (g) {
      var n = 0;
      Array.prototype.forEach.call(g.children, function (c) {
        if (c.classList.contains('reveal')) c.style.setProperty('--i', n++);
      });
    });

    /* Technische Zeichnungen bauen sich beim Erscheinen auf.
       Nur die tragenden Konturen (Strichstärke >= 2) werden gezeichnet –
       Fenster, Raster und Beschriftungen blieben sonst unruhig. */
    var figs = document.querySelectorAll('.illus svg, .hero-figure svg, .radar-figure svg');
    if (figs.length && 'IntersectionObserver' in window) {
      var dio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          dio.unobserve(e.target);
          var svg = e.target;
          var i = 0;
          Array.prototype.forEach.call(
            svg.querySelectorAll('path, line, polyline, circle, rect'),
            function (el) {
              var sw = parseFloat(getComputedStyle(el).strokeWidth) || 0;
              var stroke = el.getAttribute('stroke');
              if (sw < 2 || !stroke || stroke === 'none') return;
              if (el.classList.contains('flow-line')) return;
              var len = 0;
              try { len = el.getTotalLength ? el.getTotalLength() : 0; } catch (err) { len = 0; }
              if (!len || len > 4000) return;
              el.style.setProperty('--len', Math.ceil(len));
              el.style.setProperty('--d', i++);
            }
          );
          svg.classList.add('draw');
        });
      }, { threshold: 0.25 });
      Array.prototype.forEach.call(figs, function (f) { dio.observe(f); });
    }

    /* Fotos ziehen beim Scrollen minimal nach (sehr dezent) */
    var photos = document.querySelectorAll('.photo img');
    if (photos.length && 'IntersectionObserver' in window) {
      var active = [];
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (active.indexOf(e.target) < 0) active.push(e.target); }
          else { var k = active.indexOf(e.target); if (k > -1) active.splice(k, 1); }
        });
      }, { threshold: 0 });
      Array.prototype.forEach.call(photos, function (im) { pio.observe(im); });

      var pTick = false;
      window.addEventListener('scroll', function () {
        if (pTick || !active.length) return;
        pTick = true;
        requestAnimationFrame(function () {
          var vh = window.innerHeight;
          active.forEach(function (im) {
            var r = im.getBoundingClientRect();
            var mid = (r.top + r.height / 2 - vh / 2) / vh;   /* -1 .. 1 */
            im.style.transform = 'translate3d(0,' + (mid * -9).toFixed(1) + 'px,0) scale(1.05)';
          });
          pTick = false;
        });
      }, { passive: true });
    }
  }

  /* Aktuelles Jahr im Footer */
  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
})();
