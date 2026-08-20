/* account.js - la cuenta del cliente, tal como puede existir en una pagina
   sin servidor: los datos se quedan en este navegador y no viajan a ninguna
   parte. Aqui no hay contrasena a proposito -- guardar una en localStorage
   seria peor que no tenerla. El alta de verdad, con hash y sesion, es la
   tabla `customer` de db/schema.sql.

   Lo que si es real es para que sirve: la cesta pregunta por la CLU y por la
   TCCM antes de dejar reservar. */
(function (global) {
  'use strict';

  var doc = global.document;
  var shop = global.GunShop = global.GunShop || {};

  var LLAVE = 'gunshop:cuenta';
  var PEDIDOS = 'gunshop:pedidos';

  var yo = null;
  var oyentes = [];
  var nodo = {};

  function el(tag, clase, texto) {
    var n = doc.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function cargar() {
    try {
      yo = JSON.parse(global.localStorage.getItem(LLAVE) || 'null');
    } catch (e) {
      yo = null;
    }
  }

  function guardar() {
    try {
      if (yo) global.localStorage.setItem(LLAVE, JSON.stringify(yo));
      else global.localStorage.removeItem(LLAVE);
    } catch (e) { /* sin almacen los datos duran lo que la pagina */ }
  }

  function fecha(iso) {
    var t = String(iso || '').split('-');
    return t.length === 3 ? t[2] + '/' + t[1] + '/' + t[0] : iso;
  }

  function dias(iso) {
    var falta = Date.parse(iso + 'T00:00:00') - Date.now();
    return Math.floor(falta / 86400000);
  }

  /* --- pintado -------------------------------------------------------- */

  function iniciales(nombre) {
    return nombre.trim().split(/\s+/).slice(0, 2)
      .map(function (t) { return t.charAt(0).toUpperCase(); }).join('');
  }

  function pintaBoton() {
    var b = doc.getElementById('btnAccount');
    if (!b) return;
    var marca = b.querySelector('.icon-btn__ini');
    b.setAttribute('aria-label', yo ? 'Mi cuenta · ' + yo.nombre : 'Mi cuenta');
    if (marca) {
      marca.textContent = yo ? iniciales(yo.nombre) : '';
      marca.hidden = !yo;
    }
    b.classList.toggle('is-on', !!yo);
  }

  function pintaEstado() {
    if (!nodo.estado) return;
    nodo.estado.textContent = '';
    if (!yo) {
      nodo.estado.appendChild(el('p', null,
        'Sin datos cargados. Con la CLU aquí, la cesta ya sabe qué puede ' +
        'reservarse y qué no.'));
      return;
    }
    var d = yo.vence ? dias(yo.vence) : null;
    var linea = el('p', 'estado__clu');
    if (d === null) {
      linea.textContent = 'CLU ' + yo.clu + ' · sin vencimiento cargado';
    } else if (d < 0) {
      linea.className = 'estado__clu is-mal';
      linea.textContent = 'CLU ' + yo.clu + ' · venció el ' + fecha(yo.vence);
    } else if (d <= 90) {
      linea.className = 'estado__clu is-ojo';
      linea.textContent = 'CLU ' + yo.clu + ' · vence en ' + d +
        ' días: ya estás en plazo de renovación';
    } else {
      linea.textContent = 'CLU ' + yo.clu + ' · vigente hasta ' + fecha(yo.vence);
    }
    nodo.estado.appendChild(linea);
    nodo.estado.appendChild(el('p', null, yo.tccm
      ? 'TCCM declarada: puedes comprar munición dentro de tu cupo.'
      : 'Sin TCCM: la munición queda fuera hasta declararla.'));
  }

  function pintaPedidos() {
    if (!nodo.pedidos) return;
    var lista = [];
    try {
      lista = JSON.parse(global.localStorage.getItem(PEDIDOS) || '[]');
    } catch (e) { /* nada que enseñar */ }
    nodo.pedidos.textContent = '';
    if (!lista.length) return;
    nodo.pedidos.appendChild(el('h3', 'panel__sub', 'Tus reservas'));
    lista.slice().reverse().forEach(function (p) {
      var f = el('p', 'pedido');
      f.appendChild(el('span', 'pedido__cod', p.codigo));
      f.appendChild(el('span', null, fecha(String(p.fecha).slice(0, 10)) + ' · ' +
        p.lineas.length + (p.lineas.length === 1 ? ' línea' : ' líneas') +
        ' · US$ ' + shop.catalog.format(p.usd)));
      nodo.pedidos.appendChild(f);
    });
  }

  function pinta() {
    pintaBoton();
    pintaEstado();
    pintaPedidos();
    if (!nodo.form) return;
    nodo.form.nombre.value = yo ? yo.nombre : '';
    nodo.form.email.value = yo ? yo.email : '';
    nodo.form.clu.value = yo ? yo.clu : '';
    nodo.form.vence.value = yo ? yo.vence : '';
    nodo.form.tccm.checked = !!(yo && yo.tccm);
    nodo.salir.hidden = !yo;
    nodo.guarda.textContent = yo ? 'Actualizar datos' : 'Guardar en este navegador';
  }

  function avisa() {
    pinta();
    oyentes.forEach(function (fn) { fn(); });
  }

  /* --- arranque -------------------------------------------------------- */

  function abrir() {
    if (!nodo.panel) return;
    // Un <dialog> modal atrapa el foco pero no frena el scroll de detras.
    doc.body.style.overflow = 'hidden';
    pinta();
    nodo.panel.showModal();
  }

  function init() {
    nodo.panel = doc.getElementById('accountPanel');
    if (!nodo.panel) return;
    nodo.form = doc.getElementById('accForm');
    nodo.estado = doc.getElementById('accEstado');
    nodo.pedidos = doc.getElementById('accPedidos');
    nodo.salir = doc.getElementById('accSalir');
    nodo.guarda = doc.getElementById('accGuarda');

    cargar();

    nodo.form.addEventListener('submit', function (event) {
      // El navegador ya valida formato, obligatorios y fecha: no hace falta
      // reescribir eso en JS. Aqui solo se recoge lo que ya paso el filtro.
      event.preventDefault();
      var f = nodo.form;
      yo = {
        nombre: f.nombre.value.trim(),
        email: f.email.value.trim(),
        clu: f.clu.value.trim(),
        vence: f.vence.value,
        tccm: f.tccm.checked
      };
      guardar();
      avisa();
    });

    nodo.salir.addEventListener('click', function () {
      yo = null;
      guardar();
      avisa();
    });

    Array.prototype.forEach.call(nodo.panel.querySelectorAll('[data-cierra]'),
      function (b) { b.addEventListener('click', function () { nodo.panel.close(); }); });
    nodo.panel.addEventListener('close', function () { doc.body.style.overflow = ''; });
    nodo.panel.addEventListener('click', function (event) {
      if (event.target === nodo.panel) nodo.panel.close();
    });

    var boton = doc.getElementById('btnAccount');
    if (boton) boton.addEventListener('click', abrir);

    pinta();
  }

  shop.account = {
    init: init, abrir: abrir,
    perfil: function () { return yo; },
    on: function (fn) { oyentes.push(fn); }
  };
})(window);
