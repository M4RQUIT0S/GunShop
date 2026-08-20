/* cart.js - la cesta: unidades, panel lateral y lo que ANMaC exige para
   poder reservar. Sin servidor: lo unico que persiste es {id: unidades} en
   localStorage, y el producto se vuelve a resolver contra el catalogo al
   cargar. Guardar la ficha entera seria guardar precios viejos. */
(function (global) {
  'use strict';

  var doc = global.document;
  var shop = global.GunShop = global.GunShop || {};

  var LLAVE = 'gunshop:cesta';
  var PEDIDOS = 'gunshop:pedidos';

  var unidades = {};      // id de referencia -> cuantas
  var indice = {};        // id -> producto, para no guardar la ficha entera
  var oyentes = [];
  var moneda = function () { return 'ars'; };
  var perfil = function () { return null; };
  var nodo = {};

  /* --- almacen ------------------------------------------------------- */

  // Sobre file:// hay navegadores que bloquean localStorage. Ahi la cesta
  // dura lo que la pagina, que es peor pero no es un fallo.
  function guardar() {
    try {
      global.localStorage.setItem(LLAVE, JSON.stringify(unidades));
    } catch (e) { /* sin almacen la cesta no sobrevive a la recarga */ }
  }

  function cargar() {
    var crudo;
    try {
      crudo = JSON.parse(global.localStorage.getItem(LLAVE) || '{}');
    } catch (e) {
      return;
    }
    // Una referencia que ya no existe se cae sola: el catalogo manda.
    Object.keys(crudo).forEach(function (id) {
      var n = Math.max(0, Math.min(99, Math.floor(Number(crudo[id]) || 0)));
      if (n && indice[id]) unidades[id] = n;
    });
  }

  /* --- estado -------------------------------------------------------- */

  function lista() {
    return Object.keys(unidades).map(function (id) {
      return { p: indice[id], n: unidades[id] };
    });
  }

  function total() {
    return lista().reduce(function (s, l) { return s + l.p.usd * l.n; }, 0);
  }

  function piezas() {
    return lista().reduce(function (s, l) { return s + l.n; }, 0);
  }

  function pon(id, n) {
    n = Math.max(0, Math.min(99, Math.floor(n)));
    if (!indice[id]) return;
    if (n) unidades[id] = n;
    else delete unidades[id];
    guardar();
    avisa();
  }

  function add(product) {
    indice[product.id] = product;
    pon(product.id, (unidades[product.id] || 0) + 1);
  }

  function avisa() {
    pinta();
    oyentes.forEach(function (fn) { fn(); });
  }

  /* --- regimen -------------------------------------------------------- */

  // Que hace falta para llevarse ESTA cesta, no el catalogo entero.
  function exige() {
    var req = { clu: false, certificado: false, tccm: false, cupos: [] };
    var cartuchos = {};

    lista().forEach(function (l) {
      var r = shop.catalog.regimen(l.p.licence);
      req.clu = req.clu || r.clu;
      req.certificado = req.certificado || r.certificado;
      req.tccm = req.tccm || r.tccm;
      if (!r.tccm) return;
      var cal = shop.catalog.calibre(l.p.name);
      if (!cal) return;
      cartuchos[cal] = (cartuchos[cal] || 0) +
        shop.catalog.porCaja(l.p.spec) * l.n;
    });

    // El tope de la TCCM es anual y lo lleva ANMaC contra tus armas
    // registradas; aqui solo se mira este pedido, que es lo unico que la
    // pagina sabe. El backend lo comprobara contra el saldo real.
    Object.keys(cartuchos).forEach(function (cal) {
      var tope = shop.catalog.topeTccm(cal);
      if (cartuchos[cal] > tope) {
        req.cupos.push({ cal: cal, lleva: cartuchos[cal], tope: tope });
      }
    });

    return req;
  }

  var HOY = function () { return new Date().toISOString().slice(0, 10); };

  // Lo que impide cerrar la reserva. Vacio = se puede reservar.
  function faltas() {
    var req = exige();
    var yo = perfil();
    var out = [];

    if (req.clu && !yo) {
      out.push('Falta tu Credencial de Legítimo Usuario: cárgala en Mi cuenta.');
    } else if (req.clu && yo.vence && yo.vence < HOY()) {
      out.push('Tu CLU venció el ' + fecha(yo.vence) +
        '. Se renueva en los 90 días previos, no después.');
    }
    if (req.tccm && (!yo || !yo.tccm)) {
      out.push('La munición exige Tarjeta de Consumo (TCCM) ligada a un arma ' +
        'registrada a tu nombre.');
    }
    req.cupos.forEach(function (c) {
      out.push('El cupo de ' + c.cal + ' son ' + shop.catalog.format(c.tope) +
        ' cartuchos y llevas ' + shop.catalog.format(c.lleva) + '.');
    });
    return out;
  }

  function notas() {
    var req = exige();
    var out = [];
    if (req.certificado) {
      out.push('Hay piezas de uso civil condicional: llevan certificación de un ' +
        'profesional habilitado (Ley 23.979). Se firma en el mostrador.');
    }
    if (req.clu) {
      out.push('Nada sale sin papeles. La reserva guarda la pieza 72 h; la ' +
        'tenencia se inicia aquí y el arma se entrega a las 48 h.');
    }
    return out;
  }

  function fecha(iso) {
    var t = String(iso).split('-');
    return t.length === 3 ? t[2] + '/' + t[1] + '/' + t[0] : iso;
  }

  /* --- panel ---------------------------------------------------------- */

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function precio(usd) {
    var m = shop.catalog.MONEDAS[moneda()] || shop.catalog.MONEDAS.ars;
    return m.simbolo + ' ' + shop.catalog.money(usd, moneda());
  }

  function fila(l) {
    var f = el('div', 'linea');
    f.dataset.id = l.p.id;

    var foto = el('img', 'linea__foto');
    foto.src = l.p.photo || shop.art.foto(l.p.model);
    foto.onerror = function () {
      this.onerror = null;
      this.src = shop.art.sprite(l.p.model, l.p.variant);
    };
    foto.alt = '';
    foto.width = 96;
    foto.height = 60;
    foto.loading = 'lazy';
    f.appendChild(foto);

    var cuerpo = el('div', 'linea__cuerpo');
    cuerpo.appendChild(el('p', 'linea__name', l.p.name));
    cuerpo.appendChild(el('p', 'linea__spec',
      (l.p.licence || 'Venta libre') + ' · ' + precio(l.p.usd) + ' c/u'));

    var mandos = el('div', 'linea__mandos');
    [['−', -1, 'Quitar una unidad de '], ['+', 1, 'Añadir una unidad de ']]
      .forEach(function (par) {
        var b = el('button', 'linea__paso', par[0]);
        b.type = 'button';
        b.dataset.paso = par[1];
        b.setAttribute('aria-label', par[2] + l.p.name);
        mandos.appendChild(b);
        if (par[1] === -1) mandos.appendChild(el('span', 'linea__n', l.n));
      });
    var quita = el('button', 'linea__quita', 'Quitar');
    quita.type = 'button';
    quita.dataset.quita = '1';
    quita.setAttribute('aria-label', 'Quitar ' + l.p.name + ' de la cesta');
    mandos.appendChild(quita);
    cuerpo.appendChild(mandos);
    f.appendChild(cuerpo);

    f.appendChild(el('p', 'linea__total', precio(l.p.usd * l.n)));
    return f;
  }

  function pinta() {
    if (!nodo.lineas) return;
    var l = lista();

    nodo.lineas.textContent = '';
    if (!l.length) {
      nodo.lineas.appendChild(el('p', 'panel__vacio',
        'La cesta está vacía. Las fichas del catálogo tienen el botón de añadir.'));
    } else {
      l.forEach(function (linea) { nodo.lineas.appendChild(fila(linea)); });
    }

    nodo.total.textContent = precio(total());
    nodo.avisos.textContent = '';
    faltas().forEach(function (t) {
      nodo.avisos.appendChild(el('p', 'aviso aviso--falta', t));
    });
    notas().forEach(function (t) {
      nodo.avisos.appendChild(el('p', 'aviso', t));
    });

    var bloquea = !l.length || faltas().length > 0;
    nodo.reserva.disabled = bloquea;
    nodo.resumen.textContent = l.length
      ? piezas() + (piezas() === 1 ? ' artículo' : ' artículos')
      : '';
  }

  /* --- reserva -------------------------------------------------------- */

  // Sin servidor no hay pedido de verdad: se apunta en el propio navegador y
  // se abre un correo con el detalle, que es lo unico que llega a la tienda.
  // El backend que describe db/schema.sql sustituye esto por un INSERT.
  function reserva() {
    if (faltas().length || !piezas()) return;
    var yo = perfil() || {};
    var codigo = 'A' + Date.now().toString(36).toUpperCase().slice(-6);
    var detalle = lista().map(function (l) {
      return l.n + ' x ' + l.p.name + '  ' + precio(l.p.usd * l.n);
    }).join('\n');
    var pedido = {
      codigo: codigo,
      fecha: new Date().toISOString(),
      cliente: yo.nombre || null,
      clu: yo.clu || null,
      usd: total(),
      lineas: lista().map(function (l) { return { id: l.p.id, n: l.n, usd: l.p.usd }; })
    };
    try {
      var previos = JSON.parse(global.localStorage.getItem(PEDIDOS) || '[]');
      previos.push(pedido);
      global.localStorage.setItem(PEDIDOS, JSON.stringify(previos.slice(-20)));
    } catch (e) { /* el resguardo en pantalla vale igual */ }

    unidades = {};
    guardar();
    avisa();

    nodo.hecho.hidden = false;
    nodo.hecho.textContent = '';
    nodo.hecho.appendChild(el('p', 'hecho__cod', 'Reserva ' + codigo));
    nodo.hecho.appendChild(el('p', null,
      'Guardada 72 h. Te esperamos con la CLU y el DNI; el resto se hace en el ' +
      'mostrador.'));
    var correo = el('a', 'btn btn--ghost', 'Enviarla al taller');
    correo.href = 'mailto:taller@alcantara.example' +
      '?subject=' + encodeURIComponent('Reserva ' + codigo) +
      '&body=' + encodeURIComponent(
        (yo.nombre ? yo.nombre + ' · ' : '') + (yo.clu ? 'CLU ' + yo.clu + '\n' : '\n') +
        detalle + '\n\nTotal ' + precio(pedido.usd));
    nodo.hecho.appendChild(correo);
  }

  /* --- arranque ------------------------------------------------------- */

  function abrir() {
    if (!nodo.panel) return;
    nodo.hecho.hidden = true;
    // Un <dialog> modal atrapa el foco pero no frena el scroll de detras.
    doc.body.style.overflow = 'hidden';
    pinta();
    nodo.panel.showModal();
  }

  function init(opts) {
    opts = opts || {};
    (opts.items || []).forEach(function (p) { indice[p.id] = p; });
    if (opts.moneda) moneda = opts.moneda;
    if (opts.perfil) perfil = opts.perfil;

    nodo.panel = doc.getElementById('cartPanel');
    if (!nodo.panel) return;
    nodo.lineas = doc.getElementById('cartLines');
    nodo.total = doc.getElementById('cartTotal');
    nodo.avisos = doc.getElementById('cartAvisos');
    nodo.reserva = doc.getElementById('cartReserva');
    nodo.resumen = doc.getElementById('cartResumen');
    nodo.hecho = doc.getElementById('cartHecho');

    cargar();

    nodo.lineas.addEventListener('click', function (event) {
      var f = event.target.closest('.linea');
      if (!f) return;
      var paso = event.target.closest('[data-paso]');
      if (paso) { pon(f.dataset.id, (unidades[f.dataset.id] || 0) + Number(paso.dataset.paso)); return; }
      if (event.target.closest('[data-quita]')) pon(f.dataset.id, 0);
    });

    nodo.reserva.addEventListener('click', reserva);
    Array.prototype.forEach.call(nodo.panel.querySelectorAll('[data-cierra]'),
      function (b) { b.addEventListener('click', function () { nodo.panel.close(); }); });
    // Clic en el fondo oscuro: el evento cae en el propio <dialog>, no en el
    // contenido, porque el contenido es un hijo que ocupa menos.
    nodo.panel.addEventListener('close', function () { doc.body.style.overflow = ''; });
    nodo.panel.addEventListener('click', function (event) {
      if (event.target === nodo.panel) nodo.panel.close();
    });

    var boton = doc.getElementById('btnCart');
    if (boton) boton.addEventListener('click', abrir);

    pinta();
    oyentes.forEach(function (fn) { fn(); });
  }

  shop.cart = {
    init: init, add: add, abrir: abrir, pon: pon, pinta: pinta,
    unidades: function (id) { return unidades[id] || 0; },
    piezas: piezas, total: total, lista: lista,
    exige: exige, faltas: faltas,
    on: function (fn) { oyentes.push(fn); }
  };
})(window);
