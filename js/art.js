/* art.js - la ficha de cada producto usa el mismo motor que el fondo:
   un unico sistema de dibujo para toda la pagina. */
(function (global) {
  'use strict';

  var ANGLES = [-1.15, -0.55, 0.2, 0.7];
  var W = 440, H = 275;
  var DPR = Math.min(global.devicePixelRatio || 1, 2);
  var PLACE = { x: 0.5, y: 0.5, span: 5.2 };
  var cache = {};

  function sprite(model, variant) {
    var key = model + ':' + variant;
    if (cache[key]) return cache[key];

    var canvas = global.document.createElement('canvas');
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    global.GunShop.scene.render(ctx, model, ANGLES[variant % ANGLES.length], -0.24, W, H, 1, PLACE);

    cache[key] = canvas.toDataURL('image/png');
    return cache[key];
  }

  // Codificar el PNG bloquea el hilo principal. Son 8 piezas x 4 angulos: se
  // generan en tiempo muerto para que el scroll no pague nunca ese coste.
  function warm() {
    var jobs = [];
    Object.keys(global.GunShop.scene.models).forEach(function (name) {
      ANGLES.forEach(function (_, variant) { jobs.push([name, variant]); });
    });
    var idle = global.requestIdleCallback || function (fn) { return global.setTimeout(fn, 60); };
    (function next() {
      var job = jobs.shift();
      if (!job) return;
      sprite(job[0], job[1]);
      idle(next);
    })();
  }

  global.GunShop = global.GunShop || {};
  global.GunShop.art = { sprite: sprite, warm: warm, ANGLES: ANGLES, width: W, height: H };
})(window);
