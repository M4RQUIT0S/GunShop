/* main.js - une catalogo, rejilla infinita y las secciones de la portada. */
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

  function init() {
    var items = shop.catalog.build();
    var counts = shop.catalog.counts(items);
    var grid = doc.getElementById('grid');
    var status = doc.getElementById('status');
    var sentinel = doc.getElementById('sentinel');
    var filters = doc.getElementById('filters');
    var cartCount = doc.getElementById('cartCount');

    var moneyBox = doc.getElementById('money');
    var money = readMoney();

    var filter = 'todo';
    var query = '';
    var offset = 0;
    var done = false;
    var pumping = false;
    var saltando = 0;
    var porId = {};
    items.forEach(function (p) { porId[p.id] = p; });

    /* --- ficha ------------------------------------------------------- */

    // La ficha no guarda su estado: se lo pregunta a la cesta. Asi, quitar
    // una linea en el panel devuelve el boton a «Añadir» sin que nadie tenga
    // que acordarse de sincronizar los dos sitios.
    function pintaAdd(button, product) {
      var n = shop.cart.unidades(product.id);
      button.textContent = n > 1 ? 'En la cesta · ' + n : n ? 'En la cesta' : 'Añadir';
      button.classList.toggle('is-added', n > 0);
      button.setAttribute('aria-label', n
        ? product.name + ', ' + n + ' en la cesta. Añadir otra'
        : 'Añadir ' + product.name + ' a la cesta');
    }

    function buildCard(product, i) {
      var card = el('article', 'card');
      card.style.setProperty('--i', Math.min(i, 7));
      card.dataset.model = product.model;
      card.dataset.id = product.id;

      var art = el('div', 'card__art');
      // Cascada: la foto del producto si la hay, si no la foto del modelo, y
      // si tampoco esta, el esquema que dibuja scene.js. Cada peldano cubre
      // al siguiente, asi que la ficha nunca sale en blanco.
      var img = el('img');
      img.src = product.photo || shop.art.foto(product.model);
      img.onerror = function () {
        this.onerror = null;
        this.src = shop.art.sprite(product.model, product.variant);
      };
      img.width = shop.art.width;
      img.height = shop.art.height;
      img.loading = 'lazy';
      img.alt = product.name;
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

      var add = el('button', 'card__add');
      add.type = 'button';
      pintaAdd(add, product);
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
      shop.cart.pinta();     // el panel lleva los mismos precios
    }

    Array.prototype.forEach.call(moneyBox.children, function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.money === money));
    });
    moneyBox.addEventListener('click', function (event) {
      var button = event.target.closest('[data-money]');
      if (button) setMoney(button.dataset.money);
    });

    /* --- paginacion --------------------------------------------------- */

    // De donde salen las fichas: el catalogo entero, o lo que haya dejado la
    // busqueda. Los filtros de familia siguen aplicandose encima.
    function fuente() {
      return query ? shop.catalog.buscar(items, query) : items;
    }

    function loadMore() {
      var res = shop.catalog.page(fuente(), filter, offset,
        canObserve ? shop.catalog.PAGE : 999);
      var frag = doc.createDocumentFragment();
      res.items.forEach(function (product, i) { frag.appendChild(buildCard(product, i)); });
      grid.appendChild(frag);
      offset = res.offset;
      done = res.done;
      var donde = query ? '«' + query + '»' : labelOf(filter);
      var refs = res.total + (res.total === 1 ? ' referencia' : ' referencias');
      status.textContent = done
        ? 'Fin del listado · ' + refs + ' en ' + donde
        : 'Mostrando ' + offset + ' de ' + refs;
    }

    // Un enlace del menu se resuelve con la posicion que tiene el destino al
    // pulsarlo. Si mientras el navegador baja el centinela va anadiendo
    // fichas, el destino se aleja -- entre la primera pagina y el listado
    // entero el taller cae 12.777 px mas abajo -- y el viaje termina a mitad
    // del catalogo. Asi que durante el salto no se carga nada.
    //
    // `scrollend` levanta el freno en cuanto el viaje termina de verdad, y el
    // reloj es el techo para Safari, que no lo trae hasta la 26. Dos segundos
    // sobran: la animacion mas larga no pasa de 700 ms en ningun navegador.
    // Quedarse corto devuelve el fallo; pasarse solo retrasa un poco la
    // siguiente pagina, y eso se arregla solo.
    function saltoEnCurso() {
      return Date.now() < saltando;
    }

    function sigueCargando() {
      saltando = 0;
      pump();          // el centinela puede seguir a la vista sin dispararse
    }

    doc.addEventListener('click', function (event) {
      var a = event.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      saltando = Date.now() + 2000;
      global.setTimeout(function () { if (saltando) sigueCargando(); }, 2050);
    });

    global.addEventListener('scrollend', function () {
      if (saltando) sigueCargando();
    });

    // Si tras cargar el centinela sigue a la vista, hay que seguir llenando.
    function pump() {
      if (done || pumping || saltoEnCurso()) return;
      pumping = true;
      loadMore();
      global.requestAnimationFrame(function () {
        pumping = false;
        if (!done && sentinel.getBoundingClientRect().top < global.innerHeight * 1.4) pump();
      });
    }

    function repinta() {
      offset = 0;
      done = false;
      pumping = false;       // la pagina a medio pintar ya no sirve: si se
                             // dejase marcada, el pump de abajo no arrancaria
                             // y la rejilla se quedaria vacia hasta el
                             // siguiente scroll
      saltando = 0;          // tocar un filtro cancela el salto: la rejilla
      grid.textContent = ''; // se acaba de vaciar y hay que rellenarla ya
      Array.prototype.forEach.call(filters.querySelectorAll('[data-filter]'),
        function (chip) {
          chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
        });
      marcaBusqueda();
      pump();
    }

    function setFilter(next) {
      if (next === filter && !query) return;
      filter = next;
      query = '';            // un filtro de familia deshace la busqueda
      repinta();
    }

    // Lo que manda el panel de la lupa. La busqueda vive por encima de los
    // filtros: entra siempre en «Todo» y deja su propio chip para poder
    // deshacerla, porque si no la rejilla se queda corta sin explicacion.
    function setQuery(q) {
      query = (q || '').trim();
      filter = 'todo';
      repinta();
      // `behavior: smooth` pisa la preferencia del sistema, que el CSS si
      // respeta; hay que preguntarla a mano para no hacerlo.
      var quieto = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      doc.getElementById('catalogo').scrollIntoView({
        behavior: quieto ? 'auto' : 'smooth', block: 'start'
      });
    }

    function marcaBusqueda() {
      var viejo = filters.querySelector('.chip--busqueda');
      if (viejo) filters.removeChild(viejo);
      if (!query) return;
      var chip = el('button', 'chip chip--busqueda');
      chip.type = 'button';
      chip.setAttribute('aria-label', 'Quitar la búsqueda ' + query);
      chip.appendChild(doc.createTextNode('«' + query + '»'));
      chip.appendChild(el('span', 'chip__x', '✕'));
      chip.addEventListener('click', function () { setQuery(''); });
      filters.insertBefore(chip, filters.firstChild);
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
      // El chip de la busqueda tambien es .chip y tambien vive aqui, pero no
      // filtra ninguna familia: sin este guardia el clic llegaba a setFilter
      // con un id vacio y dejaba la rejilla sin nada que ensenar.
      var chip = event.target.closest('.chip[data-filter]');
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
      if (!button) return;
      var product = porId[button.closest('.card').dataset.id];
      if (product) shop.cart.add(product);
    });

    var piezas = 0;

    // Unico sitio que pinta el contador y los botones de las fichas, lo haya
    // movido la ficha o el panel de la cesta. La cesta avisa; aqui se obedece.
    function pintaCesta() {
      var n = shop.cart.piezas();
      cartCount.textContent = n;
      // El contador es decorativo: el estado de la cesta viaja en la etiqueta.
      cartCount.parentNode.setAttribute('aria-label',
        'Cesta, ' + n + (n === 1 ? ' artículo' : ' artículos'));
      cartCount.classList.toggle('is-on', n > 0);
      if (n > piezas) {
        // Quitar y volver a poner la clase en el mismo frame no reinicia nada:
        // hay que forzar un recalculo entre medias para que la animacion repita.
        cartCount.classList.remove('is-bump');
        void cartCount.offsetWidth;
        cartCount.classList.add('is-bump');
      }
      piezas = n;
      Array.prototype.forEach.call(grid.querySelectorAll('.card__add'), function (b) {
        var p = porId[b.closest('.card').dataset.id];
        if (p) pintaAdd(b, p);
      });
    }

    /* --- familias, marcas y preguntas ---------------------------------- */

    // Las tres se derivan del catalogo, no de una lista escrita a mano: al
    // tocar js/catalog.js se actualizan solas.
    function brands() {
      var visto = {};
      var out = [];
      shop.catalog.LINES.forEach(function (line) {
        line.items.forEach(function (item) {
          if (visto[item.brand]) return;
          visto[item.brand] = true;
          out.push(item.brand);
        });
      });
      return out;
    }

    var FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"></path></svg>';

    var tiles = doc.getElementById('tiles');
    if (tiles) {
      shop.catalog.LINES.forEach(function (line, i) {
        var tile = el('a', 'tile');
        tile.href = '#catalogo';
        tile.dataset.filter = line.id;
        tile.setAttribute('data-reveal', '');
        tile.style.setProperty('--d', i % 3);
        tile.appendChild(el('span', 'tile__n',
          (counts[line.id] || 0) + ' referencias'));
        tile.appendChild(el('h3', 'tile__name', line.label));
        tile.appendChild(el('p', 'tile__spec', line.licence || 'Venta libre'));
        var go = el('span', 'tile__go');
        go.innerHTML = FLECHA;
        tile.appendChild(go);
        tiles.appendChild(tile);
      });
    }

    var track = doc.querySelector('.marquee__track');
    if (track) {
      // La lista va dos veces: la animacion recorre la mitad justa y empalma.
      var marcas = brands();
      marcas.concat(marcas).forEach(function (name) {
        track.appendChild(el('span', 'marquee__item', name));
      });
    }

    var faq = doc.getElementById('faq');
    if (faq) {
      faq.addEventListener('click', function (event) {
        var q = event.target.closest('.faq__q');
        if (!q) return;
        var abierta = q.getAttribute('aria-expanded') === 'true';
        // Acordeon: abrir una cierra el resto.
        Array.prototype.forEach.call(faq.querySelectorAll('.faq__q'), function (otra) {
          otra.setAttribute('aria-expanded', 'false');
        });
        q.setAttribute('aria-expanded', String(!abierta));
      });
    }

    /* --- arranque ------------------------------------------------------ */

    if (canObserve) {
      new global.IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) pump();
      }, { rootMargin: '700px 0px' }).observe(sentinel);
    }

    // El titular cuenta lo mismo que la rejilla, no un numero escrito a mano.
    var total = doc.getElementById('statTotal');
    if (total) total.textContent = shop.catalog.format(counts.todo);

    var marcasN = doc.getElementById('statBrands');
    if (marcasN) marcasN.textContent = brands().length;

    // El cambio del pie sale de la misma constante que los precios. El numero
    // escrito en el HTML solo cubre el caso sin JS.
    var cambio = doc.getElementById('cambioArs');
    if (cambio) cambio.textContent = shop.catalog.format(shop.catalog.ARS_POR_USD);

    // La cuenta primero: la cesta le pregunta por la CLU nada mas pintarse.
    shop.account.init();
    shop.cart.on(pintaCesta);
    shop.cart.init({
      items: items,
      moneda: function () { return money; },
      perfil: shop.account.perfil
    });
    shop.search.init({ items: items, aplicar: setQuery });
    shop.account.on(function () { shop.cart.pinta(); });

    pump();
    shop.reveal.init();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { shop.nav.init(); shop.portada.init(); init(); });
  } else {
    shop.nav.init();
    init();
  }
})(window);
