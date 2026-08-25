/* nav.js - menu responsive y barra que se encoge al bajar. */
(function (global) {
  'use strict';

  var doc = global.document;

  /* --- el segundo nivel del menu -----------------------------------------
     El original reparte los enlaces del menu en dos: los que llevan a una
     pagina son enlaces y los que abren una seccion son botones, y la seccion
     tapa a la lista de primer nivel con su propia fila de «volver» y «ver
     todo». Aqui igual, y el segundo nivel de familias sale del catalogo -- no
     de una lista escrita a mano -- por lo mismo que las baldosas: una familia
     nueva tiene que aparecer sola. */

  function seccionFamilias(menu) {
    var shop = global.GunShop;
    var hueco = menu.querySelector('.menu__nav');
    if (!shop || !shop.catalog || !hueco) return;

    var caja = doc.createElement('div');
    caja.className = 'menu__seccion';
    caja.dataset.seccion = 'familias';
    caja.hidden = true;

    var volver = doc.createElement('div');
    volver.className = 'menu__volver';
    volver.innerHTML = '<button class="menu__atras" type="button">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'aria-hidden="true"><path d="M19 12H6M12 5l-7 7 7 7"></path></svg>Familias</button>' +
      '<a class="menu__todo" href="#familias">Ver todo</a>';
    caja.appendChild(volver);

    var lista = doc.createElement('ul');
    lista.className = 'nav__links';
    shop.catalog.LINES.forEach(function (line, i) {
      var li = doc.createElement('li');
      li.style.setProperty('--i', i);
      var a = doc.createElement('a');
      // `data-filter` ya lo atiende main.js para toda la pagina: el enlace
      // deja el catalogo filtrado por esa familia sin nada mas.
      a.href = '#catalogo';
      a.dataset.filter = line.id;
      a.dataset.foto = shop.art ? shop.art.foto(line.model) : '';
      a.textContent = line.label;
      li.appendChild(a);
      lista.appendChild(li);
    });
    caja.appendChild(lista);
    hueco.appendChild(caja);
  }

  var menuRef = null;

  function nivel1() {
    if (!menuRef) return;
    menuRef.classList.remove('is-nivel2');
    Array.prototype.forEach.call(menuRef.querySelectorAll('.menu__seccion'),
      function (s) { s.hidden = true; });
    Array.prototype.forEach.call(menuRef.querySelectorAll('[data-seccion][aria-expanded]'),
      function (b) { b.setAttribute('aria-expanded', 'false'); });
  }

  function niveles(menu) {
    var foto = doc.getElementById('menuFoto');
    var porDefecto = foto ? foto.getAttribute('src') : '';

    // Precargadas: sin esto el primer paso por cada enlace ensena el hueco
    // mientras el fichero viaja.
    Array.prototype.forEach.call(menu.querySelectorAll('[data-foto]'), function (n) {
      if (n.dataset.foto) new global.Image().src = n.dataset.foto;
    });

    menu.addEventListener('click', function (event) {
      var abre = event.target.closest('[data-seccion][aria-expanded]');
      if (abre) {
        var caja = menu.querySelector('.menu__seccion[data-seccion="' + abre.dataset.seccion + '"]');
        if (!caja) return;
        caja.hidden = false;
        abre.setAttribute('aria-expanded', 'true');
        menu.classList.add('is-nivel2');
        // Al principio del panel nuevo, que es la fila de volver, no al «Ver
        // todo» que va a su derecha.
        var uno = caja.querySelector('.menu__atras');
        if (uno) uno.focus();
        return;
      }
      if (event.target.closest('.menu__atras')) {
        var seccion = event.target.closest('.menu__seccion');
        nivel1();
        var boton = seccion && menu.querySelector(
          '[data-seccion="' + seccion.dataset.seccion + '"][aria-expanded]');
        if (boton) boton.focus();
      }
    });

    if (!foto) return;
    // Con el puntero y con el tabulador: si solo escuchase `mouseenter`, quien
    // recorre el menu con el teclado veria siempre la misma foto.
    ['mouseenter', 'focus'].forEach(function (ev) {
      menu.addEventListener(ev, function (event) {
        var n = event.target.closest ? event.target.closest('[data-foto]') : null;
        if (n && n.dataset.foto) foto.src = n.dataset.foto;
      }, true);
    });
    menu.addEventListener('mouseleave', function () { foto.src = porDefecto; });
  }

  function init() {
    var nav = doc.getElementById('nav');
    var toggle = doc.getElementById('navToggle');
    var menu = doc.getElementById('navMenu');
    var backdrop = doc.getElementById('navBackdrop');

    menuRef = menu;
    seccionFamilias(menu);
    niveles(menu);
    // Exactamente la misma consulta que el CSS: cualquier otro valor deja una
    // franja de anchos donde el CSS es de escritorio y el JS cree que es movil.
    var narrow = global.matchMedia('(max-width: 60rem)');

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.nav__label').textContent = open ? 'Cerrar menú' : 'Abrir menú';
      menu.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
      doc.body.style.overflow = open ? 'hidden' : '';
      if (!open) nivel1();
      if (open) {
        // `a` a secas se saltaba el primer enlace, que desde que hay segundo
        // nivel es un <button>.
        var first = menu.querySelector('.nav__links a, .nav__links button');
        // Esto funciona porque el estado abierto deja `visibility` fuera de
        // su lista de transiciones: si se transicionase, aqui seguiria
        // valiendo `hidden` y el foco no entraria. Ver base.css.
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
      if (event.target.closest('a')) setOpen(false);
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

    // El indicador de scroll se apaga en el mismo umbral en que la barra se
    // despega: es el mismo hecho -- «ya no estamos arriba» -- y con dos
    // manejadores acabarian discrepando.
    var icono = doc.getElementById('scrollicono');

    var stuck = false;
    function onScroll() {
      var now = global.scrollY > 40;
      if (now !== stuck) {
        stuck = now;
        nav.classList.toggle('is-stuck', stuck);
        if (icono) icono.classList.toggle('is-off', stuck);
      }
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  global.GunShop = global.GunShop || {};
  global.GunShop.nav = { init: init };
})(window);
