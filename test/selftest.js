/* Comprobacion minima de la logica que no se ve: paginacion y geometria.
   Ejecutar con:  node test/selftest.js  */
'use strict';

var assert = require('assert');
require('../js/meshes.js');
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

/* --- subcategorias: reparten la familia, no la recortan ---------------- */

// Los chips del segundo nivel salen de `kind`, no de una lista aparte. Si una
// ficha se quedase sin subcategoria, o cayese en dos, habria productos que no
// se alcanzan desde ningun chip: el listado ensena menos de lo que hay y no
// se nota mirando.
var subfiltros = [];
catalog.LINES.forEach(function (line) {
  var subs = catalog.kinds(a, line.id);
  assert.ok(subs.length > 0, 'familia sin subcategorias: ' + line.id);
  var suma = subs.reduce(function (n, s) { return n + s.n; }, 0);
  assert.strictEqual(suma, totals[line.id],
    'las subcategorias no reparten la familia ' + line.id);
  subs.forEach(function (s) {
    assert.ok(s.kind.indexOf('/') < 0,
      'una subcategoria con barra rompe el filtro de dos niveles: ' + s.kind);
    assert.strictEqual(catalog.filtered(a, line.id + '/' + s.kind).length, s.n,
      'el filtro no devuelve lo que dice el chip: ' + line.id + '/' + s.kind);
    subfiltros.push(line.id + '/' + s.kind);
  });
});

/* --- calibre: se le saca a toda referencia que lo tenga ---------------- */

// El filtro de calibre del catalogo saca el calibre del nombre con
// `catalog.calibre()`, la misma funcion con la que la cesta cuenta el cupo de
// la TCCM. Un calibre nuevo que la expresion no conozca no da error: deja la
// referencia fuera del desplegable, donde no se la puede encontrar, y sin
// contar para el cupo. Las dos cosas son invisibles mirando la pagina.
catalog.LINES.forEach(function (line) {
  line.items.forEach(function (item) {
    (item.cals || []).forEach(function (c) {
      var nombre = item.brand + ' ' + item.ref + ' ' + c;
      assert.strictEqual(catalog.calibre(nombre), c,
        nombre + ': no se le saca el calibre «' + c + '»');
    });
  });
});

/* --- paginacion: cada ficha una vez y solo una ------------------------ */

['todo'].concat(catalog.LINES.map(function (l) { return l.id; }))
  .concat(subfiltros).forEach(function (filter) {
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

// Un solido cerrado recorre cada arista una vez en cada sentido. Las mallas
// horneadas en Blender ya se comprueban al exportarlas, pero llegan aqui como
// datos: si alguien edita meshes.js a mano o el volcado sale a medias, el
// render dejaria un agujero por el que se ve el interior de la pieza.
function assertClosed(mesh, label) {
  var seen = Object.create(null);
  mesh.faces.forEach(function (face, i) {
    assert.ok(face.length >= 3, label + ': la cara ' + i + ' tiene ' + face.length + ' lados');
    face.forEach(function (a, k) {
      assert.ok(a >= 0 && a < mesh.verts.length, label + ': vertice ' + a + ' fuera de rango');
      var key = a + '>' + face[(k + 1) % face.length];
      assert.ok(!seen[key], label + ': arista ' + key + ' recorrida dos veces igual');
      seen[key] = true;
    });
  });
  Object.keys(seen).forEach(function (key) {
    var p = key.split('>');
    assert.ok(seen[p[1] + '>' + p[0]], label + ': la arista ' + key + ' no cierra');
  });
}

Object.keys(scene.models).forEach(function (name) {
  assertClosed(scene.model(name).mesh, name);
});

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

/* --- fotos del catalogo ------------------------------------------------ */

// La ficha muestra img/model/<modelo>.webp (ver su CREDITS.md). Que falte un
// archivo no rompe la pagina, porque cae al esquema de scene.js, y por eso
// mismo hay que comprobarlo aqui: no se ve mirando, se ve contando.
var fs = require('fs');
var path = require('path');
var IMG = path.join(__dirname, '..', 'img', 'model');

assert.ok(fs.existsSync(IMG),
  'falta img/model/: bajalas con tools/fotos.py. Sin ellas la pagina sigue ' +
  'funcionando con el esquema, pero no es lo que se quiere publicar.');

var faltan = Object.keys(scene.models).filter(function (name) {
  return !fs.existsSync(path.join(IMG, name + '.webp'));
});
assert.strictEqual(faltan.length, 0,
  'faltan ' + faltan.length + ' fotos, la primera ' + faltan[0] + '.webp');

// Cada `photo:` del catalogo tiene que existir en disco. Una ruta rota no
// rompe la pagina -- cae a la foto del modelo -- y por eso hay que mirarla
// aqui: el fallo es invisible salvo que se cuente.
var rotas = a.filter(function (p) {
  return p.photo && !fs.existsSync(path.join(__dirname, '..', p.photo));
});
assert.strictEqual(rotas.length, 0,
  'hay ' + rotas.length + ' rutas photo: rotas, la primera ' +
  (rotas[0] && rotas[0].photo));

var conFoto = a.filter(function (p) { return p.photo; }).length;

// Ningun producto comparte foto con otro. Compartirla entre calibres del
// mismo producto si es correcto -- son la misma arma -- y por eso se compara
// contra el slug del nombre y no contra la ficha: el fichero se llama como
// marca+referencia, asi que el nombre completo tiene que empezar por ahi.
function slug(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
var ajenas = a.filter(function (p) {
  if (!p.photo) return false;
  var base = p.photo.replace(/^.*\//, '').replace(/\.webp$/, '');
  return slug(p.name).indexOf(base) !== 0;
});
assert.strictEqual(ajenas.length, 0,
  'foto de otro producto: ' + (ajenas[0] && ajenas[0].name) +
  ' usa ' + (ajenas[0] && ajenas[0].photo));

// Dos productos con el mismo fichero pasarian la prueba de arriba -- cada uno
// apunta al suyo -- pero en pantalla se ve la misma foto dos veces. Paso: el
// reparto automatico daba la misma imagen al armero Arregui y al Ferrimax.
var crypto = require('crypto');
var porHash = {};
fs.readdirSync(path.join(__dirname, '..', 'img', 'product'))
  .filter(function (f) { return /\.webp$/.test(f); })
  .forEach(function (f) {
    var h = crypto.createHash('sha1')
      .update(fs.readFileSync(path.join(__dirname, '..', 'img', 'product', f)))
      .digest('hex');
    (porHash[h] = porHash[h] || []).push(f);
  });
var repes = Object.keys(porHash).filter(function (h) { return porHash[h].length > 1; });
assert.strictEqual(repes.length, 0,
  'hay ' + repes.length + ' fotos repetidas, la primera en ' +
  (repes[0] && porHash[repes[0]].join(' = ')));

assert.ok(fs.existsSync(path.join(__dirname, '..', 'img', 'product', 'CREDITS.md')),
  'falta img/product/CREDITS.md: las fotos CC BY y CC BY-SA exigen atribucion');

// Media de las ocho son CC BY o CC BY-SA, que exigen citar al autor. Si el
// fichero de creditos desaparece la atribucion se pierde sin que nadie lo note.
assert.ok(fs.existsSync(path.join(IMG, 'CREDITS.md')),
  'falta img/model/CREDITS.md: las fotos CC BY y CC BY-SA exigen atribucion');

/* --- regimen, cupos y busqueda ---------------------------------------- */

// La cesta decide si deja reservar preguntando por la etiqueta de la ficha.
// Una etiqueta que no este en la tabla se trata como venta libre, y eso es
// exactamente el fallo que nadie ve: se vende sin pedir la credencial.
a.forEach(function (p) {
  if (!p.licence) return;
  assert.ok(catalog.REGIMEN[p.licence],
    p.id + ': regimen desconocido «' + p.licence + '», la cesta lo daria por libre');
});

// La municion se cuenta en cartuchos contra el cupo de la TCCM: hace falta
// sacar el calibre del nombre y el tamaño de la caja de la ficha tecnica.
a.filter(function (p) { return p.cat === 'municion'; }).forEach(function (p) {
  var cal = catalog.calibre(p.name);
  assert.ok(cal, p.name + ': no se le saca el calibre, no contaria para el cupo');
  assert.ok(catalog.porCaja(p.spec) > 0, p.name + ': sin cartuchos por caja');
  assert.ok(catalog.topeTccm(cal) > 0, cal + ': sin cupo anual');
});

assert.strictEqual(catalog.topeTccm('cal. 12/70'), 2500, 'anima lisa: el cupo es 2.500');
assert.strictEqual(catalog.topeTccm('.22 LR'), 2500, '.22 LR: el cupo es 2.500');
assert.strictEqual(catalog.topeTccm('.308 Win'), 1000, 'el cupo general es 1.000');
assert.strictEqual(catalog.regimen('Requiere TCCM').tccm, true);
assert.strictEqual(catalog.regimen(null).clu, false, 'sin etiqueta es venta libre');

// Buscar tiene que aguantar acentos, mayusculas y familia, que es como se
// escribe de verdad en una caja de busqueda.
assert.ok(catalog.buscar(a, 'anschutz').length > 0, 'la busqueda no ignora los acentos');
assert.ok(catalog.buscar(a, 'MUNICIÓN').length > 0, 'la busqueda no encuentra por familia');
assert.strictEqual(catalog.buscar(a, '   ').length, 0, 'una busqueda vacia no filtra nada');
assert.strictEqual(catalog.buscar(a, 'zzzz').length, 0);

/* --- base de datos ----------------------------------------------------- */

// El seed sale del catalogo, asi que tiene que salir igual dos veces: si no,
// cada regeneracion ensucia el diff y deja de servir para comparar.
var seed = require('../tools/seed.js');
var sql = seed.genera();
assert.strictEqual(sql, seed.genera(), 'tools/seed.js no es determinista');

catalog.LINES.forEach(function (line) {
  line.items.forEach(function (item) {
    assert.ok(sql.indexOf("'" + item.ref.replace(/'/g, "''") + "'") > -1,
      item.brand + ' ' + item.ref + ': no llega a db/seed.sql');
  });
});

assert.ok(fs.existsSync(path.join(__dirname, '..', 'db', 'schema.sql')),
  'falta db/schema.sql, que es a donde apunta el seed');

process.stdout.write('selftest ok · ' + a.length + ' referencias · ' +
  Object.keys(scene.models).length + ' modelos · ' +
  conFoto + '/' + a.length + ' con foto propia\n');
