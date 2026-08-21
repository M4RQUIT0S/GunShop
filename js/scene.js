/* scene.js - visor 3D esquematico. Sin dependencias, script clasico. */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  /* ----------------------------------------------------------------- *
   * Geometria: las piezas de revolucion se escriben aqui con dos       *
   * primitivas, perfil extruido y tubo. Las que necesitan volumen de   *
   * verdad se hornean en Blender (tools/models.py) y entran por        *
   * meshes.js ya en vertices.                                          *
   * ----------------------------------------------------------------- */

  // Area con signo del poligono: normaliza el sentido de giro a CCW.
  function area2(profile) {
    var s = 0;
    for (var i = 0; i < profile.length; i++) {
      var a = profile[i], b = profile[(i + 1) % profile.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }

  // Las dos primitivas cierran igual: anillo delantero en orden y trasero al
  // reves, para que ambas normales apunten hacia fuera.
  function caps(n) {
    var front = [], back = [], i;
    for (i = 0; i < n; i++) front.push(i);
    for (i = n - 1; i >= 0; i--) back.push(i + n);
    return [front, back];
  }

  // Perfil 2D (plano XY) extruido en Z -> solido cerrado.
  function extrude(profile, depth) {
    var p = area2(profile) < 0 ? profile.slice().reverse() : profile;
    var n = p.length, h = depth / 2, verts = [], faces = caps(n), i;

    for (i = 0; i < n; i++) verts.push([p[i][0], p[i][1], h]);
    for (i = 0; i < n; i++) verts.push([p[i][0], p[i][1], -h]);

    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      faces.push([i, i + n, j + n, j]);
    }
    return { verts: verts, faces: faces };
  }

  // Tubo (o cono truncado) a lo largo del eje X.
  function tube(x0, x1, r0, r1, seg, cy, cz) {
    var verts = [], faces = caps(seg), i, a;
    cy = cy || 0;
    cz = cz || 0;

    for (i = 0; i < seg; i++) {
      a = (i / seg) * TAU;
      verts.push([x0, cy + Math.sin(a) * r0, cz + Math.cos(a) * r0]);
    }
    for (i = 0; i < seg; i++) {
      a = (i / seg) * TAU;
      verts.push([x1, cy + Math.sin(a) * r1, cz + Math.cos(a) * r1]);
    }
    for (i = 0; i < seg; i++) {
      var j = (i + 1) % seg;
      faces.push([i, i + seg, j + seg, j]);
    }
    return { verts: verts, faces: faces };
  }

  function merge(parts) {
    var verts = [], faces = [];
    parts.forEach(function (part) {
      var base = verts.length;
      part.verts.forEach(function (v) { verts.push(v); });
      part.faces.forEach(function (f) {
        faces.push(f.map(function (i) { return i + base; }));
      });
    });
    return { verts: verts, faces: faces };
  }

  /* ----------------------------------------------------------------- *
   * Modelos                                                            *
   * ----------------------------------------------------------------- */

  // Los cantos iban en dorado, que es un segundo acento y el sistema solo
  // admite la lima. Las dos paletas se quedan en la rampa neutra de
  // tokens.css y se distinguen por el valor del cuerpo, no por el color.
  var METAL = { base: '#1c1c1c', hi: '#969aa1', edge: 'rgba(189,231,78,0.50)' };
  var VAINA = { base: '#262629', hi: '#c6c7cc', edge: 'rgba(189,231,78,0.45)' };

  // Las piezas con volumen de verdad se hornean en Blender (tools/models.py) y
  // llegan por meshes.js. Las de revolucion salen mejor aqui: un tubo escrito
  // son dos numeros y horneado son doscientos vertices.
  // Se lee tarde a proposito, asi el orden de carga deja de importar.
  function baked(name) {
    return function () {
      var all = (global.GunShop && global.GunShop.meshes) || {};
      if (!all[name]) throw new Error('falta la malla "' + name + '": js/meshes.js');
      return all[name];
    };
  }

  // Vaina de gollete: piston, culote, ranura de extraccion, cuerpo, hombro,
  // gollete y punta. La ranura y el piston son dos tubos mas; hornear esto en
  // Blender no anadiria nada que no sea de revolucion.
  function cartridge() {
    return merge([
      tube(-1.66, -1.60, 0.17, 0.17, 18, 0, 0),
      tube(-1.60, -1.50, 0.40, 0.40, 18, 0, 0),
      tube(-1.50, -1.38, 0.29, 0.29, 18, 0, 0),
      tube(-1.38, 0.10, 0.34, 0.34, 18, 0, 0),
      tube(0.10, 0.46, 0.34, 0.22, 18, 0, 0),
      tube(0.46, 0.76, 0.22, 0.22, 18, 0, 0),
      tube(0.76, 1.20, 0.22, 0.20, 18, 0, 0),
      tube(1.20, 1.56, 0.20, 0.15, 18, 0, 0),
      tube(1.56, 1.84, 0.15, 0.085, 18, 0, 0),
      tube(1.84, 2.02, 0.085, 0.02, 18, 0, 0)
    ]);
  }

  var MODELS = {
    rifle: { build: baked('rifle'), palette: METAL, scale: 0.88 },
    shotgun: { build: baked('shotgun'), palette: METAL, scale: 0.84 },
    pistol: { build: baked('pistol'), palette: METAL, scale: 1.15 },
    optic: { build: baked('optic'), palette: METAL, scale: 1.05 },
    reddot: { build: baked('reddot'), palette: METAL, scale: 1.35 },
    binocular: { build: baked('binocular'), palette: METAL, scale: 1.25 },
    cartridge: { build: cartridge, palette: VAINA, scale: 1.15 },
    gcase: { build: baked('gcase'), palette: METAL, scale: 1 }
  };

  var cache = {};
  function model(name) {
    var key = MODELS[name] ? name : 'rifle';
    if (!cache[key]) cache[key] = { mesh: MODELS[key].build(), def: MODELS[key] };
    return cache[key];
  }

  /* ----------------------------------------------------------------- *
   * Render                                                             *
   * ----------------------------------------------------------------- */

  function rotate(v, cy, sy, cp, sp) {
    var x = v[0] * cy + v[2] * sy;
    var z = -v[0] * sy + v[2] * cy;
    return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
  }

  // Normal de Newell: valida para poligonos de N lados y no convexos.
  function normal(pts) {
    var nx = 0, ny = 0, nz = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    var len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  }

  function rgb(hex) {
    var v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  // a y b ya vienen descompuestos: la paleta no cambia dentro de un render.
  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] * (1 - t) + b[0] * t) +
      ',' + Math.round(a[1] * (1 - t) + b[1] * t) +
      ',' + Math.round(a[2] * (1 - t) + b[2] * t) + ')';
  }

  var LIGHT = [-0.42, 0.66, 0.62];
  var DIST = 9;

  // place: donde y con que holgura se encaja la pieza. span = unidades de modelo
  // que caben a lo ancho, asi el encuadre no depende del tamaño del lienzo.
  var PLACE = { x: 0.5, y: 0.5, span: 5.6 };

  function render(ctx, name, yaw, pitch, w, h, grow, place) {
    var at = place || PLACE;
    var entry = model(name), mesh = entry.mesh, pal = entry.def.palette;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var unit = Math.min(w / at.span, h / (at.span * 0.57)) * entry.def.scale * grow;
    var ox = w * at.x, oy = h * at.y;
    var base = rgb(pal.base), hi = rgb(pal.hi);

    var view = mesh.verts.map(function (v) { return rotate(v, cy, sy, cp, sp); });
    var quads = [];

    mesh.faces.forEach(function (face) {
      var pts = face.map(function (i) { return view[i]; });
      var n = normal(pts);
      if (n[2] <= 0.02) return;
      var depth = 0, screen = [], i, p, s;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        s = DIST / (DIST - p[2]);
        screen.push([ox + p[0] * s * unit, oy - p[1] * s * unit]);
        depth += p[2];
      }
      var lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      quads.push({
        depth: depth / pts.length,
        screen: screen,
        fill: mix(base, hi, Math.pow(lit, 0.9) * 0.85)
      });
    });

    quads.sort(function (a, b) { return a.depth - b.depth; });

    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = pal.edge;
    quads.forEach(function (q) {
      ctx.beginPath();
      ctx.moveTo(q.screen[0][0], q.screen[0][1]);
      for (var i = 1; i < q.screen.length; i++) ctx.lineTo(q.screen[i][0], q.screen[i][1]);
      ctx.closePath();
      ctx.fillStyle = q.fill;
      ctx.fill();
      ctx.stroke();
    });
  }

  /* ----------------------------------------------------------------- *
   * Montaje: gira con el scroll, cambia de pieza con el filtro.        *
   * ----------------------------------------------------------------- */

  // ponytail: el giro es un barrido acotado, no una vuelta entera. Vista a 90 grados
  // exactos una pieza plana colapsa a una lamina; el seno nunca llega a ese angulo.
  var YAW_CENTER = -0.30;
  var YAW_AMP = 0.95;
  var YAW_PHASE = -0.68;
  var TURN_PER_PX = 0.00155;
  var BASE_YAW = YAW_CENTER + YAW_AMP * Math.sin(YAW_PHASE);

  function yawAt(scrollY) {
    return YAW_CENTER + YAW_AMP * Math.sin(YAW_PHASE + scrollY * TURN_PER_PX);
  }

  var api = {
    area2: area2, extrude: extrude, tube: tube, merge: merge,
    normal: normal, rotate: rotate, render: render, yawAt: yawAt,
    models: MODELS, model: model,
    BASE_YAW: BASE_YAW, YAW_CENTER: YAW_CENTER, YAW_AMP: YAW_AMP
  };

  global.GunShop = global.GunShop || {};
  global.GunShop.scene = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
