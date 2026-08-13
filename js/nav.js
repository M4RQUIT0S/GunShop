/* nav.js - menu responsive y barra que se encoge al bajar. */
(function (global) {
  'use strict';

  var doc = global.document;

  function init() {
    var nav = doc.getElementById('nav');
    var toggle = doc.getElementById('navToggle');
    var menu = doc.getElementById('navMenu');
    var backdrop = doc.getElementById('navBackdrop');
    // Exactamente la misma consulta que el CSS: cualquier otro valor deja una
    // franja de anchos donde el CSS es de escritorio y el JS cree que es movil.
    var narrow = global.matchMedia('(max-width: 60rem)');

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.nav__label').textContent = open ? 'Cerrar menú' : 'Abrir menú';
      menu.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
      doc.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus();
      }
    }

    function close() {
      if (toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    backdrop.addEventListener('click', close);

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a') && narrow.matches) setOpen(false);
    });

    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });

    // Al pasar a escritorio el panel deja de existir: hay que soltar el scroll.
    function onBreakpoint(event) {
      if (!event.matches) setOpen(false);
    }
    if (narrow.addEventListener) narrow.addEventListener('change', onBreakpoint);
    else if (narrow.addListener) narrow.addListener(onBreakpoint);

    var stuck = false;
    function onScroll() {
      var now = global.scrollY > 40;
      if (now !== stuck) {
        stuck = now;
        nav.classList.toggle('is-stuck', stuck);
      }
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  global.GunShop = global.GunShop || {};
  global.GunShop.nav = { init: init };
})(window);
