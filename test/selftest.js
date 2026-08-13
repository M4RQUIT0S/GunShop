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
  a.map(function (p) { return p.id + '|' + p.usd; }),
  b.map(function (p) { return p.id + '|' + p.usd; }),
  'el catalogo no es determinista'
);

// Cada referencia tiene que poder dibujarse: si un producto pide una pieza 3D
// que no existe, la ficha saldria con la imagen en blanco.
catalog.LINES.forEach(function (line) {
  assert.ok(scene.models[line.model], line.id + ': modelo 3D inexistente ' + line.model);
  line.items.forEach(function (item) {
    if (item.model) {
      assert.ok(scene.models[item.model],
        line.id + '/' + item.ref + ': modelo 3D inexistente ' + item.model);
    }
    assert.ok(item.brand && item.ref && item.kind, line.id + ': ficha incompleta');
    assert.ok(item.spec && item.spec.length, line.id + '/' + item.ref + ': sin ficha tecnica');
    assert.ok(item.usd > 0, line.id + '/' + item.ref + ': precio invalido');
  });
});

a.forEach(function (p) {
  assert.ok(p.name && p.spec && p.kind, p.id + ': referencia incompleta');
  assert.ok(scene.models[p.model], p.id + ': modelo 3D inexistente ' + p.model);
});

// Los ids se usan como clave: repetirlos rompe la deteccion de duplicados.
assert.strictEqual(new Set(a.map(function (p) { return p.id; })).size, a.length,
  'hay ids de referencia repetidos');

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

// Pedir cero fichas es cero fichas, no el tamaño por defecto.
var none = catalog.page(a, 'todo', 0, 0);
assert.deepStrictEqual(none.items, [], 'size 0 deberia devolver un tramo vacio');
assert.strictEqual(none.total, a.length, 'size 0 no deberia cambiar el total');

// Pedir mas alla del final devuelve vacio y final, no un error.
var over = catalog.page(a, 'todo', a.length + 50, catalog.PAGE);
assert.deepStrictEqual(over.items, [], 'mas alla del final deberia venir vacio');
assert.ok(over.done, 'mas alla del final deberia estar terminado');

/* --- regimen ANMaC ---------------------------------------------------- */

// Las etiquetas son categorias del decreto 395/75, no texto libre: una mal
// escrita anunciaria en la ficha un regimen que no existe.
var REGIMENES = ['Uso civil', 'Uso civil condicional', 'Aire comprimido',
  'Requiere TCCM', null];
a.forEach(function (p) {
  var reg = p.licence === undefined ? null : p.licence;
  assert.ok(REGIMENES.indexOf(reg) !== -1, p.id + ': regimen desconocido ' + reg);
});

// El art. 5 corta el arma de hombro en 5,6 mm: un .22 nunca es condicional
// y un calibre de caza mayor nunca deja de serlo.
a.filter(function (p) { return p.cat === 'rifles'; }).forEach(function (p) {
  var esVeintidos = p.spec.indexOf('.22 LR') === 0;
  assert.strictEqual(p.licence, esVeintidos ? 'Uso civil' : 'Uso civil condicional',
    p.id + ': regimen que no corresponde al calibre (' + p.spec + ')');
});

/* --- moneda ----------------------------------------------------------- */

// Todo producto tiene precio y se puede expresar en las dos monedas.
a.forEach(function (p) {
  assert.ok(typeof p.usd === 'number' && p.usd > 0, p.id + ': sin precio en dolares');
  Object.keys(catalog.MONEDAS).forEach(function (code) {
    var txt = catalog.money(p.usd, code);
    assert.ok(/\d/.test(txt), p.id + ': importe vacio en ' + code);
  });
});

// Los pesos salen de multiplicar, no de una segunda lista que pueda
// desincronizarse: mismo producto, mismo cambio, mismo importe.
var ref = a[0];
assert.strictEqual(catalog.money(ref.usd, 'usd'), catalog.money(ref.usd * 1, 'usd'));
assert.strictEqual(
  catalog.money(1, 'ars'),
  catalog.money(catalog.ARS_POR_USD, 'usd'),
  'un dolar no equivale a ARS_POR_USD pesos'
);

// Una moneda que no existe no puede reventar la ficha: cae en pesos.
assert.strictEqual(catalog.money(100, 'yen'), catalog.money(100, 'ars'),
  'una moneda desconocida deberia caer en pesos');

// El recuento del titular es un numero suelto: nunca lleva moneda.
assert.strictEqual(catalog.format(a.length), catalog.format(a.length));
assert.ok(catalog.format(1520).indexOf('$') === -1, 'format no deberia poner moneda');

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
