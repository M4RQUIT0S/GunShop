/* consulta.js - el bloque de «en que podemos ayudarle» y su ventana.

   Es el `enquire block` del original: cuatro filas que abren un formulario en
   una ventana. Alli son ocho formularios distintos -- uno por tramite -- y
   aqui uno solo con el titulo y el asunto cambiados, porque cuatro copias del
   mismo formulario son cuatro sitios donde arreglar la misma errata.

   No hay servidor. Lo unico honesto que se puede hacer con lo escrito es
   preparar un correo y dejar que salga del programa de correo de quien lo
   escribio, que es lo mismo que hace la cesta al reservar. */
(function (global) {
  'use strict';

  var doc = global.document;
  var nodo = {};
  var scrollPrevio = '';
  var tema = null;

  var TEMAS = {
    compra: {
      titulo: 'Comprar un arma',
      rotulo: 'Qué busca y para qué uso',
      familia: true
    },
    taller: {
      titulo: 'Cita en el taller',
      rotulo: 'Qué hay que hacerle al arma'
    },
    tramites: {
      titulo: 'Trámites y credencial',
      rotulo: 'En qué punto está'
    },
    visita: {
      titulo: 'Visitar la armería',
      rotulo: 'Qué le gustaría ver y cuándo'
    }
  };

  /* --- la ventana ------------------------------------------------------ */

  function familias() {
    var shop = global.GunShop;
    if (!nodo.familia || !shop || !shop.catalog) return;
    nodo.familia.textContent = '';
    var vacia = doc.createElement('option');
    vacia.value = '';
    vacia.textContent = 'Sin decidir';
    nodo.familia.appendChild(vacia);
    shop.catalog.LINES.forEach(function (line) {
      var o = doc.createElement('option');
      o.value = line.label;
      o.textContent = line.label;
      nodo.familia.appendChild(o);
    });
  }

  function abrir(cual) {
    var t = TEMAS[cual];
    if (!t || !nodo.panel) return;
    tema = cual;

    nodo.titulo.textContent = t.titulo;
    nodo.rotulo.textContent = t.rotulo;
    // El campo de familia solo sale donde significa algo. `hidden` en el
    // <label> saca de la pagina tambien al <select>, asi que no queda un
    // control invisible por el que tabular.
    nodo.familiaCampo.hidden = !t.familia;
    nodo.hecho.hidden = true;
    nodo.form.hidden = false;
    nodo.form.reset();

    // Mismo cuidado que la cesta: un <dialog> modal atrapa el foco pero no
    // frena el scroll de detras, y en movil el menu ya lo tiene bloqueado.
    scrollPrevio = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    nodo.panel.showModal();
  }

  /* --- el envio -------------------------------------------------------- */

  function correo(datos) {
    var cuerpo = [
      datos.nombre + ' ' + datos.apellido,
      datos.email + (datos.tel ? ' · ' + datos.tel : ''),
      datos.familia ? 'Interés: ' + datos.familia : '',
      '',
      datos.mensaje || '(sin mensaje)'
    ].filter(Boolean).join('\n');

    return 'mailto:taller@alcantara.example' +
      '?subject=' + encodeURIComponent(TEMAS[tema].titulo) +
      '&body=' + encodeURIComponent(cuerpo);
  }

  function enviar(event) {
    // El navegador ya ha comprobado obligatorios y formato de correo antes de
    // llegar aqui: repetirlo en JS seria tener dos reglas que un dia difieren.
    event.preventDefault();
    var f = nodo.form;
    var datos = {
      nombre: f.nombre.value.trim(),
      apellido: f.apellido.value.trim(),
      email: f.email.value.trim(),
      tel: f.tel.value.trim(),
      familia: nodo.familiaCampo.hidden ? '' : f.familia.value,
      mensaje: f.mensaje.value.trim()
    };

    nodo.form.hidden = true;
    nodo.hecho.hidden = false;
    nodo.hecho.textContent = '';

    var titulo = doc.createElement('p');
    titulo.className = 'hecho__cod';
    titulo.textContent = TEMAS[tema].titulo;
    nodo.hecho.appendChild(titulo);

    var texto = doc.createElement('p');
    texto.textContent = 'Lo escrito no ha salido de este navegador. Abajo va ' +
      'preparado para enviarlo desde su correo; si prefiere, llame al ' +
      '(011) 0000-0000 de martes a sábado.';
    nodo.hecho.appendChild(texto);

    var enlace = doc.createElement('a');
    enlace.className = 'btn';
    enlace.textContent = 'Abrir el correo';
    enlace.href = correo(datos);
    nodo.hecho.appendChild(enlace);
  }

  /* --- arranque -------------------------------------------------------- */

  function init() {
    nodo.panel = doc.getElementById('consultaPanel');
    nodo.form = doc.getElementById('consultaForm');
    nodo.titulo = doc.getElementById('consultaTitulo');
    nodo.rotulo = doc.getElementById('consultaMensajeRotulo');
    nodo.familiaCampo = doc.getElementById('consultaFamiliaCampo');
    nodo.familia = doc.getElementById('consultaFamilia');
    nodo.hecho = doc.getElementById('consultaHecho');
    if (!nodo.panel || !nodo.form) return;

    familias();

    doc.addEventListener('click', function (event) {
      var boton = event.target.closest('[data-consulta]');
      if (boton) abrir(boton.dataset.consulta);
    });

    nodo.form.addEventListener('submit', enviar);

    Array.prototype.forEach.call(nodo.panel.querySelectorAll('[data-cierra]'),
      function (b) { b.addEventListener('click', function () { nodo.panel.close(); }); });

    nodo.panel.addEventListener('close', function () { doc.body.style.overflow = scrollPrevio; });
    // El clic en el fondo oscuro cae en el propio <dialog>, no en el contenido.
    nodo.panel.addEventListener('click', function (event) {
      if (event.target === nodo.panel) nodo.panel.close();
    });
  }

  global.GunShop = global.GunShop || {};
  global.GunShop.consulta = { init: init };
})(window);
