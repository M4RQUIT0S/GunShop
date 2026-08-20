/* search.js - el panel de la lupa. No pide nada a ningun sitio: busca sobre
   el catalogo que ya esta en memoria y le pasa el resultado a la rejilla,
   que es quien sabe pintar fichas. */
(function (global) {
  'use strict';

  var doc = global.document;
  var shop = global.GunShop = global.GunShop || {};

  var TOPE = 8;              // sugerencias visibles; el resto va a la rejilla
  var items = [];
  var aplicar = function () {};
  var nodo = {};
  var hallados = [];

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function pinta() {
    var q = nodo.input.value.trim();
    hallados = q ? shop.catalog.buscar(items, q) : [];
    nodo.lista.textContent = '';

    if (!q) {
      nodo.pie.hidden = true;
      nodo.lista.appendChild(el('p', 'panel__vacio',
        'Marca, modelo, calibre o familia: «Glock», «.308», «munición», «maleta».'));
      return;
    }
    if (!hallados.length) {
      nodo.pie.hidden = true;
      nodo.lista.appendChild(el('p', 'panel__vacio',
        'Nada con «' + q + '». Lo que no está en vitrina se encarga: pregunta en el taller.'));
      return;
    }

    hallados.slice(0, TOPE).forEach(function (p) {
      var b = el('button', 'sug');
      b.type = 'button';
      b.dataset.name = p.name;
      b.appendChild(el('span', 'sug__name', p.name));
      b.appendChild(el('span', 'sug__spec', p.kind + ' · ' + (p.licence || 'Venta libre')));
      nodo.lista.appendChild(b);
    });

    nodo.pie.hidden = false;
    nodo.ver.textContent = hallados.length === 1
      ? 'Ver la referencia en el catálogo'
      : 'Ver las ' + hallados.length + ' referencias en el catálogo';
  }

  function manda(q) {
    nodo.panel.close();
    aplicar(q);
  }

  function abrir() {
    if (!nodo.panel) return;
    // Un <dialog> modal atrapa el foco pero no frena el scroll de detras.
    doc.body.style.overflow = 'hidden';
    nodo.panel.showModal();
    pinta();
    nodo.input.focus();
    nodo.input.select();
  }

  function init(opts) {
    opts = opts || {};
    items = opts.items || [];
    if (opts.aplicar) aplicar = opts.aplicar;

    nodo.panel = doc.getElementById('searchPanel');
    if (!nodo.panel) return;
    nodo.form = doc.getElementById('searchForm');
    nodo.input = doc.getElementById('searchInput');
    nodo.lista = doc.getElementById('searchLista');
    nodo.pie = doc.getElementById('searchPie');
    nodo.ver = doc.getElementById('searchVer');

    nodo.input.addEventListener('input', pinta);

    nodo.form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (hallados.length) manda(nodo.input.value.trim());
    });

    nodo.lista.addEventListener('click', function (event) {
      var b = event.target.closest('.sug');
      // Una sugerencia busca por su nombre exacto: la rejilla acaba
      // ensenando esa referencia y las de su misma serie, que es lo que
      // suele querer quien busca un modelo.
      if (b) manda(b.dataset.name);
    });

    nodo.ver.addEventListener('click', function () { manda(nodo.input.value.trim()); });

    Array.prototype.forEach.call(nodo.panel.querySelectorAll('[data-cierra]'),
      function (b) { b.addEventListener('click', function () { nodo.panel.close(); }); });
    nodo.panel.addEventListener('close', function () { doc.body.style.overflow = ''; });
    nodo.panel.addEventListener('click', function (event) {
      if (event.target === nodo.panel) nodo.panel.close();
    });

    var boton = doc.getElementById('btnSearch');
    if (boton) boton.addEventListener('click', abrir);

    // La barra de la lupa con «/», como en cualquier catalogo: solo cuando no
    // se esta escribiendo en otro sitio, o se comeria el caracter.
    doc.addEventListener('keydown', function (event) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      var a = doc.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
      event.preventDefault();
      abrir();
    });
  }

  shop.search = { init: init, abrir: abrir };
})(window);
