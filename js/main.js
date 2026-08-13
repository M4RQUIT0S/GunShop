/* main.js - une catalogo, rejilla infinita y fondo 3D. */
(function (global) {
  'use strict';

  var doc = global.document;
  var shop = global.GunShop;
  var canObserve = 'IntersectionObserver' in global;

  var STOCK = {
    ok: function (p) { return p.units + ' en tienda'; },
    last: function () { return 'Última unidad'; },
    order: function () { return 'Bajo pedido'; }
  };

  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var STORE = 'gunshop:moneda';

  function readMoney() {
    try {
      var saved = global.localStorage.getItem(STORE);
      return shop.catalog.MONEDAS[saved] ? saved : 'ars';
    } catch (e) {
      // Sobre file:// hay navegadores que bloquean el almacenamiento.
      return 'ars';
    }
  }

  function lineOf(id) {
    return shop.catalog.LINES.filter(function (l) { return l.id === id; })[0];
  }

  function labelOf(id) {
    if (id === 'todo') return 'todo el catálogo';
    var line = lineOf(id);
    return line ? line.label.toLowerCase() : id;
  }

  function modelOf(id) {
    var line = lineOf(id);
    return line ? line.model : 'rifle';
  }

  function init() {
    var items = shop.catalog.build();
    var counts = shop.catalog.counts(items);
    var grid = doc.getElementById('grid');
    var status = doc.getElementById('status');
    var sentinel = doc.getElementById('sentinel');
    var filters = doc.getElementById('filters');
    var hero = doc.getElementById('hero');
    var cartCount = doc.getElementById('cartCount');
    var scene = shop.scene.mount(doc.getElementById('scene'), { model: 'rifle' });

    var moneyBox = doc.getElementById('money');
    var money = readMoney();

    var filter = 'todo';
    var offset = 0;
    var done = false;
    var pumping = false;
    var cart = 0;

    /* --- ficha ------------------------------------------------------- */

    function buildCard(product, i) {
      var card = el('article', 'card');
      card.style.setProperty('--i', Math.min(i, 7));
      card.dataset.model = product.model;

      var art = el('div', 'card__art');
      var img = el('img');
      img.src = shop.art.sprite(product.model, product.variant);
      img.width = shop.art.width;
      img.height = shop.art.height;
      img.loading = 'lazy';
      img.alt = '';
      art.appendChild(img);

      var tags = el('div', 'card__tags');
      tags.appendChild(el('span', 'tag' + (product.licence ? ' tag--licence' : ''),
        product.licence || 'Venta libre'));
      tags.appendChild(el('span', product.stock === 'ok' ? 'tag' : 'tag tag--' + product.stock,
        STOCK[product.stock](product)));
      art.appendChild(tags);
      card.appendChild(art);

      var body = el('div', 'card__body');
      body.appendChild(el('span', 'card__cat', product.kind));
      body.appendChild(el('h3', 'card__name', product.name));
      body.appendChild(el('p', 'card__spec', product.spec));
      body.appendChild(el('div', 'card__rule'));

      var foot = el('div', 'card__foot');
      // El importe en dolares se queda en la ficha: cambiar de moneda es
      // repintar, no volver a pedir el producto.
      var price = el('p', 'card__price');
      price.dataset.usd = product.usd;
      paintPrice(price);
      foot.appendChild(price);

      var add = el('button', 'card__add', 'Añadir');
      add.type = 'button';
      add.dataset.name = product.name;
      add.setAttribute('aria-label', 'Añadir ' + product.name + ' a la cesta');
      foot.appendChild(add);

      body.appendChild(foot);
      card.appendChild(body);

      return card;
    }

    /* --- moneda -------------------------------------------------------- */

    function paintPrice(node) {
      node.textContent = '';
      node.appendChild(el('span', null, shop.catalog.MONEDAS[money].simbolo));
      node.appendChild(doc.createTextNode(
        shop.catalog.money(Number(node.dataset.usd), money)));
    }

    function setMoney(next) {
      if (next === money || !shop.catalog.MONEDAS[next]) return;
      money = next;
      try {
        global.localStorage.setItem(STORE, money);
      } catch (e) {
        // Sin almacenamiento la eleccion dura lo que la pagina; no es un fallo.
      }
      Array.prototype.forEach.call(moneyBox.children, function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.money === money));
      });
      // Repintar en sitio: volver a paginar devolveria el scroll al principio.
      Array.prototype.forEach.call(grid.querySelectorAll('.card__price'), paintPrice);
    }

    Array.prototype.forEach.call(moneyBox.children, function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.money === money));
    });
    moneyBox.addEventListener('click', function (event) {
      var button = event.target.closest('[data-money]');
      if (button) setMoney(button.dataset.money);
    });

    /* --- paginacion --------------------------------------------------- */

    function loadMore() {
      var res = shop.catalog.page(items, filter, offset, canObserve ? shop.catalog.PAGE : 999);
      var frag = doc.createDocumentFragment();
      res.items.forEach(function (product, i) { frag.appendChild(buildCard(product, i)); });
      grid.appendChild(frag);
      offset = res.offset;
      done = res.done;
      status.textContent = done
        ? 'Fin del listado · ' + res.total + ' referencias en ' + labelOf(filter)
        : 'Mostrando ' + offset + ' de ' + res.total + ' referencias';
    }

    // Si tras cargar el centinela sigue a la vista, hay que seguir llenando.
    function pump() {
      if (done || pumping) return;
      pumping = true;
      loadMore();
      global.requestAnimationFrame(function () {
        pumping = false;
        if (!done && sentinel.getBoundingClientRect().top < global.innerHeight * 1.4) pump();
      });
    }

    function setFilter(next) {
      if (next === filter) return;
      filter = next;
      offset = 0;
      done = false;
      grid.textContent = '';
      Array.prototype.forEach.call(filters.children, function (chip) {
        chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
      });
      scene.setModel(modelOf(filter));
      pump();
    }

    /* --- filtros ------------------------------------------------------ */

    [{ id: 'todo', label: 'Todo' }].concat(shop.catalog.LINES).forEach(function (line) {
      var chip = el('button', 'chip');
      chip.type = 'button';
      chip.dataset.filter = line.id;
      chip.setAttribute('aria-pressed', String(line.id === filter));
      chip.appendChild(doc.createTextNode(line.label));
      chip.appendChild(el('span', 'chip__n', counts[line.id] || 0));
      filters.appendChild(chip);
    });

    filters.addEventListener('click', function (event) {
      var chip = event.target.closest('.chip');
      if (chip) setFilter(chip.dataset.filter);
    });

    doc.addEventListener('click', function (event) {
      var link = event.target.closest('[data-filter]');
      if (!link || link.classList.contains('chip')) return;
      setFilter(link.dataset.filter);
    });

    /* --- cesta y fondo ------------------------------------------------ */

    grid.addEventListener('click', function (event) {
      var button = event.target.closest('.card__add');
      // Ya añadido: el boton se queda enfocable pero deja de contar.
      if (!button || button.getAttribute('aria-disabled') === 'true') return;

      cart += 1;
      cartCount.textContent = cart;
      // El contador es decorativo: el estado de la cesta viaja en la etiqueta del boton.
      cartCount.parentNode.setAttribute('aria-label',
        'Cesta, ' + cart + (cart === 1 ? ' artículo' : ' artículos'));
      cartCount.classList.add('is-on');
      // Quitar y volver a poner la clase en el mismo frame no reinicia nada:
      // hay que forzar un recalculo entre medias para que la animacion repita.
      cartCount.classList.remove('is-bump');
      void cartCount.offsetWidth;
      cartCount.classList.add('is-bump');

      button.textContent = 'En la cesta';
      button.classList.add('is-added');
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-label', button.dataset.name + ', ya en la cesta');
    });

    // El fondo muestra la pieza que se esta mirando.
    function follow(event) {
      var card = event.target.closest('.card');
      if (card) scene.setModel(card.dataset.model);
    }
    grid.addEventListener('pointerover', follow);
    grid.addEventListener('focusin', follow);

    /* --- arranque ------------------------------------------------------ */

    if (canObserve) {
      new global.IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) pump();
      }, { rootMargin: '700px 0px' }).observe(sentinel);
    }

    // Al dejar la portada el esquema del fondo se apaga para que las fichas manden.
    var browsing = false;
    function onScroll() {
      var next = global.scrollY > hero.offsetHeight * 0.55;
      if (next !== browsing) {
        browsing = next;
        doc.body.classList.toggle('is-browsing', browsing);
      }
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // El titular cuenta lo mismo que la rejilla, no un numero escrito a mano.
    var total = doc.getElementById('statTotal');
    if (total) total.textContent = shop.catalog.format(counts.todo);

    pump();
    shop.art.warm();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { shop.nav.init(); init(); });
  } else {
    shop.nav.init();
    init();
  }
})(window);
