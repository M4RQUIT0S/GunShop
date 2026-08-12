/* Comprobacion minima de la logica que no se ve: paginacion y geometria.
   Ejecutar con:  node test/selftest.js  */
'use strict';

var assert = require('assert');
var scene = require('../js/scene.js');
var catalog = require('../js/catalog.js');

/* --- catalogo determinista ------------------------------------------- */

var a = catalog.build();
var b = catalog.build();
assert.strictEqual(a.length, b.length, 'el catalogo cambia de tamaño entre cargas');
assert.deepStrictEqual(
  a.map(function (p) { return p.id + p.price; }),
  b.map(function (p) { return p.id + p.price; }),
  'el catalogo no es determinista'
);

// Nombre, ficha tecnica, tipo y modelo 3D se recorren con el mismo indice: si una
// lista es mas corta se descuadran y sale un punto rojo con ficha de visor 3-12x56.
catalog.LINES.forEach(function (line) {
  ['specs', 'kinds', 'models'].forEach(function (key) {
    if (!line[key]) return;
    assert.strictEqual(line[key].length, line.names.length,
      line.id + ': ' + key + ' no cuadra con names');
  });
  line.models && line.models.forEach(function (name) {
    assert.ok(scene.models[name], line.id + ': modelo 3D inexistente ' + name);
  });
  assert.ok(line.models || scene.models[line.model], line.id + ': modelo 3D inexistente');
});

var totals = catalog.counts(a);
var sum = catalog.LINES.reduce(function (n, line) { return n + totals[line.id]; }, 0);
assert.strictEqual(sum, a.length, 'los recuentos por familia no suman el total');

/* --- paginacion: cada ficha una vez y solo una ------------------------ */

['todo'].concat(catalog.LINES.map(function (l) { return l.id; })).forEach(function (filter) {
  var seen = [], offset = 0, res, guard = 0;
  do {
    res = catalog.page(a, filter, offset, catalog.PAGE);
    assert.ok(res.items.length > 0 || res.done, 'pagina vacia sin marcar el final: ' + filter);
    res.items.forEach(function (p) { seen.push(p.id); });
    assert.strictEqual(res.offset, offset + res.items.length, 'offset mal avanzado');
    offset = res.offset;
  } while (!res.done && ++guard < 500);

  assert.ok(res.done, 'la paginacion no termina en ' + filter);
  assert.strictEqual(seen.length, catalog.filtered(a, filter).length,
    'faltan o sobran fichas en ' + filter);
  assert.strictEqual(new Set(seen).size, seen.length, 'fichas repetidas en ' + filter);
});

// Pedir mas alla del final devuelve vacio y final, no un error.
var over = catalog.page(a, 'todo', a.length + 50, catalog.PAGE);
assert.deepStrictEqual(over.items, [], 'mas alla del final deberia venir vacio');
assert.ok(over.done, 'mas alla del final deberia estar terminado');

/* --- geometria: las caras miran hacia fuera --------------------------- */

// Perfil dado en sentido horario: extrude debe corregirlo igualmente.
var cw = [[0, 0], [0, 1], [1, 1], [1, 0]];
var box = scene.extrude(cw, 2);
assert.strictEqual(box.verts.length, 8, 'el extrude no duplica el perfil');
assert.strictEqual(box.faces.length, 6, 'a la caja le faltan caras');

function normalOf(mesh, faceIndex) {
  return scene.normal(mesh.faces[faceIndex].map(function (i) { return mesh.verts[i]; }));
}
assert.ok(normalOf(box, 0)[2] > 0.99, 'la tapa delantera no mira a +Z');
assert.ok(normalOf(box, 1)[2] < -0.99, 'la tapa trasera no mira a -Z');

// En un solido convexo toda normal se aleja del centro. Si una cara se girase
// del reves, el recorte de caras traseras la borraria y saldria un agujero.
function assertOutward(mesh, label) {
  var c = [0, 0, 0];
  mesh.verts.forEach(function (v) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; });
  c = c.map(function (x) { return x / mesh.verts.length; });

  mesh.faces.forEach(function (face, i) {
    var pts = face.map(function (j) { return mesh.verts[j]; });
    var n = scene.normal(pts);
    var f = [0, 0, 0];
    pts.forEach(function (p) { f[0] += p[0]; f[1] += p[1]; f[2] += p[2]; });
    var d = 0;
    for (var k = 0; k < 3; k++) d += (f[k] / pts.length - c[k]) * n[k];
    assert.ok(d > 0, label + ': la cara ' + i + ' mira hacia dentro');
  });
}

assertOutward(box, 'caja');

var pipe = scene.tube(0, 1, 0.5, 0.5, 8, 0, 0);
assert.strictEqual(pipe.faces.length, 10, 'al tubo le faltan caras');
assert.ok(normalOf(pipe, 0)[0] < -0.99, 'la boca del tubo no mira a -X');
assertOutward(pipe, 'tubo');
assertOutward(scene.tube(0, 2, 0.6, 0.2, 10, 0, 0), 'cono');

// A cualquier angulo se ve alrededor de la mitad de las caras: si el sentido
// de giro estuviera mal, se verian casi todas o casi ninguna.
Object.keys(scene.models).forEach(function (name) {
  var mesh = scene.model(name).mesh;
  [-1.25, -0.3, 0.65].forEach(function (yaw) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(-0.2), sp = Math.sin(-0.2);
    var view = mesh.verts.map(function (v) { return scene.rotate(v, cy, sy, cp, sp); });
    var seen = mesh.faces.filter(function (f) {
      return scene.normal(f.map(function (i) { return view[i]; }))[2] > 0.02;
    }).length;
    var share = seen / mesh.faces.length;
    assert.ok(share > 0.2 && share < 0.75,
      name + ' a yaw ' + yaw + ' muestra el ' + Math.round(share * 100) + '% de las caras');
  });
});

/* --- el giro nunca cae en el perfil exacto ---------------------------- */

var worst = 0;
for (var y = 0; y <= 60000; y += 25) {
  worst = Math.max(worst, Math.abs(scene.yawAt(y)));
}
assert.ok(worst < 1.35,
  'el barrido llega a ' + worst.toFixed(2) + ' rad y la pieza se ve de canto');

process.stdout.write('selftest ok · ' + a.length + ' referencias · ' +
  Object.keys(scene.models).length + ' modelos\n');
