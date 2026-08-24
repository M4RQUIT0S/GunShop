/* portada.js - las dos piezas de la portada que no son CSS: el riel de puntos
   de las laminas y el hueco que descubre el pie.

   Las dos nacen apagadas y las enciende este fichero. Si no llega a
   ejecutarse, el riel se queda oculto (lleva `hidden` en el marcado) y el pie
   se ve al final como un pie normal: la pagina no depende de esto para
   leerse, solo para moverse. */
(function (global) {
  'use strict';

  var doc = global.document;

  /* --- riel de laminas ---------------------------------------------------
     Marca en cual de las tres laminas esta el lector y salta a la que se le
     pida. El punto activo se decide con un observador cuyo margen deja una
     franja de un pixel en mitad de la pantalla: la lamina que la cruza es la
     que se esta mirando. Calcularlo con el scroll a mano seria lo mismo pero
     corriendo en cada fotograma. */

  function riel() {
    var caja = doc.getElementById('riel');
    var zona = doc.getElementById('laminas');
    if (!caja || !zona) return;

    var laminas = zona.querySelectorAll('.lamina');
    var puntos = caja.querySelectorAll('.riel__punto');
    if (!laminas.length || laminas.length !== puntos.length) return;
    if (!('IntersectionObserver' in global)) return;

    caja.hidden = false;

    function marca(i) {
      Array.prototype.forEach.call(puntos, function (p, n) {
        p.setAttribute('aria-current', String(n === i));
      });
    }

    var ojo = new global.IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        marca(Array.prototype.indexOf.call(laminas, e.target));
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    Array.prototype.forEach.call(laminas, function (l) { ojo.observe(l); });

    // El riel solo tiene sentido mientras se ven las laminas; pasado el
    // catalogo estorbaria sobre el texto.
    new global.IntersectionObserver(function (entradas) {
      caja.classList.toggle('is-on', entradas[0].isIntersecting);
    }, { threshold: 0 }).observe(zona);

    var quieto = global.matchMedia('(prefers-reduced-motion: reduce)');

    caja.addEventListener('click', function (event) {
      var punto = event.target.closest('.riel__punto');
      if (!punto) return;
      var destino = laminas[Number(punto.dataset.lamina)];
      if (!destino) return;
      destino.scrollIntoView({ behavior: quieto.matches ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* --- pie que se descubre ------------------------------------------------
     El pie esta fijo por debajo y la hoja se desliza por encima. El hueco que
     lo deja ver es el margen inferior de la hoja, y tiene que valer justo lo
     que mide el pie: si sobra queda una franja negra, y si falta el pie sale
     cortado.

     El alto del pie depende del ancho -sus enlaces se reparten en las
     columnas que quepan-, asi que se vuelve a medir cuando cambia. En
     pantalla estrecha la hoja de estilos devuelve el pie a `static` y aqui no
     se pone margen ninguno: comprobarlo con `position` en vez de repetir la
     media query evita que un dia digan cosas distintas. */

  function pie() {
    var foot = doc.getElementById('foot');
    var hoja = doc.getElementById('hoja');
    if (!foot || !hoja) return;

    function mide() {
      var fijo = global.getComputedStyle(foot).position === 'fixed';
      hoja.style.marginBottom = fijo ? foot.offsetHeight + 'px' : '';
    }

    mide();
    if ('ResizeObserver' in global) new global.ResizeObserver(mide).observe(foot);
    else global.addEventListener('resize', mide);
    // Las fuentes llegan despues del primer pintado y cambian el alto del pie.
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(mide);
  }

  function init() { riel(); pie(); }

  global.GunShop = global.GunShop || {};
  global.GunShop.portada = { init: init };
})(window);
