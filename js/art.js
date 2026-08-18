/* art.js - la ficha de cada producto usa el mismo motor que el fondo:
   un unico sistema de dibujo para toda la pagina. */
(function (global) {
  'use strict';

  var ANGLES = [-1.15, -0.55, 0.2, 0.7];
  var W = 440, H = 275;
  var DPR = Math.min(global.devicePixelRatio || 1, 2);
  var PLACE = { x: 0.5, y: 0.5, span: 5.2 };
  var cache = {};

  // Una foto por modelo (img/model/, ver su CREDITS.md). Es lo que ve la
  // ficha; el esquema de abajo queda de respaldo para cuando la imagen no
  // esta, asi la pagina sigue abriendose con doble clic en cualquier caso.
  function foto(model) {
    return 'img/model/' + model + '.webp';
  }

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

  global.GunShop = global.GunShop || {};
  global.GunShop.art = { foto: foto, sprite: sprite,
    ANGLES: ANGLES, width: W, height: H };
})(window);
