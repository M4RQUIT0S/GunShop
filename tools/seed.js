/* seed.js - escribe db/seed.sql desde js/catalog.js.
   Ejecutar:  node tools/seed.js

   El catalogo de la pagina y el de la base tienen que ser el mismo, y la
   forma de que lo sigan siendo es que uno se genere del otro. Aqui no se
   escribe ningun dato a mano salvo lo que la pagina no tiene: sucursales,
   servicios del taller y la fecha del cambio.

   Las existencias salen de catalog.build(), que usa un PRNG con semilla: dos
   ejecuciones dan el mismo seed.sql, byte a byte. Si el fichero cambia sin
   que nadie haya tocado el catalogo, algo se ha vuelto no determinista. */
'use strict';

var fs = require('fs');
var path = require('path');
var catalog = require('../js/catalog.js');

var RAIZ = path.join(__dirname, '..');
var SALIDA = path.join(RAIZ, 'db', 'seed.sql');

// El cambio no se toma de la fecha de hoy: el seed tiene que salir igual
// cada vez que se genera.
var DIA_CAMBIO = '2026-08-01';

var SUCURSALES = [
  ['mostrador', 'Vitrina · Av. Rivadavia', 'shop'],
  ['deposito', 'Depósito', 'warehouse'],
  ['taller', 'Taller', 'workshop']
];

// Los del apartado «Taller» de la portada, con precio de referencia.
var SERVICIOS = [
  ['ajuste-disparador', 'Ajuste de disparador', 12000, 60],
  ['montaje-optica', 'Montaje de óptica y puesta a cero', 18000, 90],
  ['culata-medida', 'Culata a medida', 65000, 240],
  ['pavonado', 'Pavonado', 22000, 180],
  ['grabado-cuim', 'Grabado del CUIM', 8000, 45],
  ['revision-anual', 'Revisión anual', 0, 60]
];

// Las armas de fuego se serializan una a una; el aire comprimido no lo es.
var FAMILIAS_ARMA = { rifles: true, escopetas: true, pistolas: true };

/* --- utilidades ------------------------------------------------------- */

function slug(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function txt(v) {
  if (v === null || v === undefined) return 'null';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function arr(lista) {
  return 'array[' + lista.map(txt).join(', ') + ']::text[]';
}

function bool(v) { return v ? 'true' : 'false'; }

// insert ... select sobre un VALUES: una sola sentencia por tabla y las
// claves ajenas resueltas por join, que es lo unico que se puede hacer
// cuando los id son `generated always as identity`.
function bloque(cabecera, filas, cola) {
  return cabecera + '\n' + filas.map(function (f, i) {
    return '  (' + f + ')' + (i === filas.length - 1 ? '' : ',');
  }).join('\n') + '\n' + cola + '\n';
}

/* --- recogida --------------------------------------------------------- */

function regimenes() {
  var out = [['libre', 'Venta libre', false, false, false,
    'Óptica y accesorios: no hay requisito.']];
  Object.keys(catalog.REGIMEN).forEach(function (label) {
    var r = catalog.REGIMEN[label];
    out.push([slug(label), label, r.clu, r.certificado, r.tccm, null]);
  });
  return out;
}

function calibres() {
  var visto = {};
  function anota(nombre) {
    if (!nombre || visto[nombre]) return;
    visto[nombre] = true;
  }
  catalog.LINES.forEach(function (line) {
    line.items.forEach(function (item) {
      (item.cals || []).forEach(anota);
      anota(catalog.calibre(item.brand + ' ' + item.ref));
    });
  });
  return Object.keys(visto).sort().map(function (n) {
    var aire = /4,5 mm/.test(n);
    // El balin no lleva TCCM: cupo cero, que en esa columna es «no aplica».
    return [n, /^cal\./.test(n), n === '.22 LR', aire,
      aire ? 0 : catalog.topeTccm(n)];
  });
}

function marcas() {
  var visto = {};
  catalog.LINES.forEach(function (line) {
    line.items.forEach(function (item) { visto[item.brand] = true; });
  });
  return Object.keys(visto).sort().map(function (n) { return [slug(n), n]; });
}

function productos() {
  var out = [];
  catalog.LINES.forEach(function (line) {
    line.items.forEach(function (item) {
      out.push({
        marca: slug(item.brand),
        familia: line.id,
        ref: item.ref,
        kind: item.kind,
        spec: item.spec,
        licencia: item.licence ? slug(item.licence) : null,
        usd: item.usd,
        serie: !!FAMILIAS_ARMA[line.id] && item.licence !== 'Aire comprimido',
        foto: item.photo || null,
        cals: item.cals && item.cals.length ? item.cals : [null]
      });
    });
  });
  return out;
}

// Existencias: las que ya ensena la pagina, para que la base diga lo mismo.
function unidades() {
  var out = {};
  catalog.build().forEach(function (p) { out[p.name] = p.units; });
  return out;
}

/* --- escritura --------------------------------------------------------- */

function genera() {
  var prods = productos();
  var stock = unidades();
  var partes = [];

  partes.push(
    '-- seed.sql - GENERADO por tools/seed.js desde js/catalog.js. No editar.\n' +
    '--\n' +
    '-- Reconstruir:  node tools/seed.js\n' +
    '--\n' +
    '-- Trae el catalogo entero, las existencias que ensena la pagina y lo que\n' +
    '-- la pagina no tiene: sucursales, servicios del taller y el tipo de cambio.\n' +
    '-- Las armas de fuego entran como unidades con numero de serie de prueba y\n' +
    '-- sin CUIM: el CUIM lo asigna ANMaC despues de la venta, no la tienda.\n\n' +
    'begin;\n' +
    'set search_path = gunshop, public;\n');

  partes.push(bloque(
    'insert into licence_regime (code, label, requires_clu, requires_certification,\n' +
    '                            requires_tccm, note) values',
    regimenes().map(function (r) {
      return [txt(r[0]), txt(r[1]), bool(r[2]), bool(r[3]), bool(r[4]), txt(r[5])].join(', ');
    }), 'on conflict (code) do nothing;'));

  partes.push(bloque(
    'insert into calibre (name, smoothbore, rimfire, airgun, annual_quota) values',
    calibres().map(function (c) {
      return [txt(c[0]), bool(c[1]), bool(c[2]), bool(c[3]), c[4]].join(', ');
    }), 'on conflict (name) do nothing;'));

  partes.push(bloque(
    'insert into brand (slug, name) values',
    marcas().map(function (b) { return [txt(b[0]), txt(b[1])].join(', '); }),
    'on conflict (slug) do nothing;'));

  partes.push(
    'insert into family (slug, name, model_key, licence_regime_id, position)\n' +
    'select v.slug, v.name, v.model, lr.id, v.pos\n' +
    '  from (values\n' +
    catalog.LINES.map(function (line, i) {
      return '  (' + [txt(line.id), txt(line.label), txt(line.model),
        txt(line.licence ? slug(line.licence) : 'libre'), i].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(slug, name, model, licence, pos)\n' +
    '  join licence_regime lr on lr.code = v.licence\n' +
    'on conflict (slug) do nothing;\n');

  partes.push(bloque(
    'insert into location (slug, name, kind) values',
    SUCURSALES.map(function (s) {
      return [txt(s[0]), txt(s[1]), txt(s[2])].join(', ');
    }), 'on conflict (slug) do nothing;'));

  partes.push(bloque(
    'insert into workshop_service (slug, name, usd_cents, minutes) values',
    SERVICIOS.map(function (s) {
      return [txt(s[0]), txt(s[1]), s[2], s[3]].join(', ');
    }), 'on conflict (slug) do nothing;'));

  partes.push(
    'insert into product (brand_id, family_id, ref, kind, spec, licence_regime_id,\n' +
    '                     usd_cents, serialized)\n' +
    'select b.id, f.id, v.ref, v.kind, v.spec, lr.id, v.usd_cents, v.serialized\n' +
    '  from (values\n' +
    prods.map(function (p) {
      return '  (' + [txt(p.marca), txt(p.familia), txt(p.ref), txt(p.kind),
        arr(p.spec), p.licencia ? txt(p.licencia) : 'null::text',
        p.usd * 100, bool(p.serie)].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, family, ref, kind, spec, licence, usd_cents, serialized)\n' +
    '  join brand b on b.slug = v.brand\n' +
    '  join family f on f.slug = v.family\n' +
    '  left join licence_regime lr on lr.code = v.licence\n' +
    'on conflict (brand_id, ref) do nothing;\n');

  // Una referencia por calibre. El sku es la clave estable con la que se
  // enganchan despues fotos, existencias y unidades.
  var variantes = [];
  prods.forEach(function (p) {
    p.cals.forEach(function (cal, i) {
      variantes.push({
        p: p, cal: cal, i: i,
        sku: slug(p.marca + '-' + p.ref + (cal ? '-' + cal : '')),
        nombre: null
      });
    });
  });

  partes.push(
    'insert into product_variant (product_id, calibre_id, sku, position)\n' +
    'select p.id, c.id, v.sku, v.pos\n' +
    '  from (values\n' +
    variantes.map(function (v) {
      return '  (' + [txt(v.p.marca), txt(v.p.ref), v.cal ? txt(v.cal) : 'null::text',
        txt(v.sku), v.i].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, ref, calibre, sku, pos)\n' +
    '  join brand b on b.slug = v.brand\n' +
    '  join product p on p.brand_id = b.id and p.ref = v.ref\n' +
    '  left join calibre c on c.name = v.calibre\n' +
    'on conflict (sku) do nothing;\n');

  var conFoto = prods.filter(function (p) { return p.foto; });
  partes.push(
    'insert into product_photo (product_id, path, is_primary, licence_note)\n' +
    'select p.id, v.path, true, v.nota\n' +
    '  from (values\n' +
    conFoto.map(function (p) {
      return '  (' + [txt(p.marca), txt(p.ref), txt(p.foto),
        txt('sin aclarar: foto de catalogo, ver img/product/CREDITS.md')].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, ref, path, nota)\n' +
    '  join brand b on b.slug = v.brand\n' +
    '  join product p on p.brand_id = b.id and p.ref = v.ref\n' +
    'on conflict do nothing;\n');

  // Existencias de build(), indexadas por el nombre que ensena la ficha.
  function cuantas(v) {
    return stock[marcaNombre(v.p.marca) + ' ' + v.p.ref +
      (v.cal ? ' ' + v.cal : '')] || 0;
  }

  // Lo que se cuenta por cantidad entra como asiento: el saldo lo pone el
  // disparador de stock_move, que es quien manda en stock_level. Sin
  // existencias no hay asiento, y la referencia queda «bajo pedido».
  var contadas = variantes.filter(function (v) {
    return !v.p.serie && cuantas(v) > 0;
  });
  partes.push(
    'insert into stock_move (variant_id, location_id, qty, reason, ref)\n' +
    'select pv.id, l.id, v.qty, \'purchase\', \'seed\'\n' +
    '  from (values\n' +
    contadas.map(function (v) {
      return '  (' + [txt(v.sku), cuantas(v)].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(sku, qty)\n' +
    '  join product_variant pv on pv.sku = v.sku\n' +
    '  cross join location l\n' +
    ' where l.slug = \'mostrador\'\n' +
    // El resto de tablas se protege con `on conflict do nothing`, pero un
    // asiento no tiene clave que repetir: sin esto, pasar el seed dos veces
    // duplica las existencias.
    '   and not exists (select 1 from stock_move where ref = \'seed\');\n');

  // Cada arma, su fila. Serie de prueba y CUIM vacio, que es como llegan.
  var piezas = [];
  var serie = 0;
  variantes.filter(function (v) { return v.p.serie; }).forEach(function (v) {
    var n = cuantas(v);
    for (var i = 0; i < n; i += 1) {
      serie += 1;
      // Serie de prueba, correlativa y unica en toda la base, que es como se
      // comporta una de verdad.
      piezas.push([v.sku, 'AR' + ('0000' + serie).slice(-5)]);
    }
  });

  partes.push(
    'insert into firearm_unit (variant_id, location_id, serial, status, acquired_at)\n' +
    'select pv.id, l.id, v.serial, \'in_stock\', date \'' + DIA_CAMBIO + '\'\n' +
    '  from (values\n' +
    piezas.map(function (u) {
      return '  (' + [txt(u[0]), txt(u[1])].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(sku, serial)\n' +
    '  join product_variant pv on pv.sku = v.sku\n' +
    '  cross join location l\n' +
    ' where l.slug = \'mostrador\'\n' +
    'on conflict (variant_id, serial) do nothing;\n');

  partes.push(
    'insert into fx_rate (day, ars_per_usd, source) values\n' +
    '  (date \'' + DIA_CAMBIO + '\', ' + catalog.ARS_POR_USD + ', ' +
    txt('ARS_POR_USD de js/catalog.js') + ')\n' +
    'on conflict (day) do nothing;\n');

  partes.push('commit;\n');
  return partes.join('\n');
}

// build() da el nombre con la marca escrita, no con su slug.
var NOMBRES = {};
catalog.LINES.forEach(function (line) {
  line.items.forEach(function (item) { NOMBRES[slug(item.brand)] = item.brand; });
});

function marcaNombre(s) { return NOMBRES[s]; }

if (require.main === module) {
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  var sql = genera();
  fs.writeFileSync(SALIDA, sql);
  process.stdout.write('db/seed.sql · ' + sql.split('\n').length + ' lineas · ' +
    (sql.match(/^insert into/gm) || []).length + ' inserts\n');
}

module.exports = { genera: genera, slug: slug };
