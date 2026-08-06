/* GREEN – green-nwg.de · Vanilla JS, keine Dependencies, kein Tracking */
(function () {
  'use strict';

  /* Mobile Navigation */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
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
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          cio.unobserve(entry.target);
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count'), 10);
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
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

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
    }

    calc.addEventListener('input', rechne);
    calc.addEventListener('change', rechne);
    rechne();
  }

  /* Aktuelles Jahr im Footer */
  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
})();
