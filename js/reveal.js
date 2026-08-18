/* reveal.js - entrada por scroll. Lo que en Himon hace framer-motion aqui son
   dos clases y un observador: la hoja pone el estado oculto bajo `.js`, esto
   lo quita cuando la pieza entra en pantalla.

   El estado oculto vive detras de `.js` a proposito. Si esto no llega a
   ejecutarse la pagina se ve entera, que es el fallo correcto: mejor sin
   animacion que en blanco. */
(function (global) {
  'use strict';

  var doc = global.document;

  function init() {
    var piezas = doc.querySelectorAll('[data-reveal]');

    function todas() {
      Array.prototype.forEach.call(piezas, function (n) { n.classList.add('is-in'); });
    }

    if (!('IntersectionObserver' in global)) { todas(); return; }

    // Una pieza que ya entro no vuelve a esconderse: se deja de observar.
    var ojo = new global.IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        ojo.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });

    Array.prototype.forEach.call(piezas, function (n) { ojo.observe(n); });
  }

  global.GunShop = global.GunShop || {};
  global.GunShop.reveal = { init: init };
})(window);
