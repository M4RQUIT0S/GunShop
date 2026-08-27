/* seed-supabase.js - escribe db/supabase/seed-productos.sql desde
   D:\GunShop\js\catalog.js (el catalogo real, 76 productos).

   Ejecutar:  node tools/seed-supabase.js

   Analogo a D:\GunShop\tools\seed.js, pero apuntando al esquema de Supabase
   (db/supabase/migrations/0002_catalogo.sql): sin el esquema `gunshop`, con
   product.spec como text[], product.cartridges_per_box como columna propia
   (no una subcadena en spec) y product_variant.calibre_id como clave ajena
   a calibre en vez de un texto suelto.

   `db/supabase/seed.sql` (18 productos de muestra, escrito a mano) NO se
   toca: sigue trayendo family/licence_regime/location/fx_rate, que este
   fichero da por puestos. Esto solo añade brand/calibre/product/
   product_variant/product_photo, con ON CONFLICT DO NOTHING en todos los
   insert: pasarlo dos veces no duplica nada, y no toca cart/sales_order/
   customer ni ninguna tabla de pedidos o clientes.

   Las fotos NO se derivan del nombre del producto (ver la nota en
   0009_fotos.sql: de 18 hubo 3 que no casaban). Aqui la ruta sale de
   `item.photo` en catalog.js, y este mismo script comprueba cada una contra
   `public/img/product/` antes de escribir una sola linea: aborta si falta
   un fichero, si dos productos apuntan al mismo, o si dos productos
   calculan el mismo SKU. */
'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var CATALOG_JS = path.join(RAIZ, '..', 'GunShop', 'js', 'catalog.js');
var FOTOS_DIR = path.join(RAIZ, 'public', 'img', 'product');
var SALIDA = path.join(RAIZ, 'db', 'supabase', 'seed-productos.sql');

var catalog = require(CATALOG_JS);

/* --- utilidades --------------------------------------------------------- */

function slug(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function txt(v) {
  if (v === null || v === undefined) return 'null';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function arr(lista) {
  return 'array[' + lista.map(txt).join(', ') + ']';
}

function bool(v) { return v ? 'true' : 'false'; }

// Bloque `insert into ... values (...), (...) on conflict ... do nothing;`
function bloqueValues(cabecera, filas, cola) {
  return cabecera + '\n' + filas.map(function (f, i) {
    return '  (' + f + ')' + (i === filas.length - 1 ? '' : ',');
  }).join('\n') + '\n' + cola + '\n';
}

// El slug ya sembrado en Supabase para una marca no siempre es el que
// calcularia slug(nombre): "Sellier & Bellot" ya esta como 'sellier', no
// 'sellier-bellot' (ver la nota de 0009_fotos.sql sobre este mismo lio con
// las fotos). Sembrar el slug "correcto" aqui crearia una marca duplicada.
var BRAND_SLUG_OVERRIDES = {
  'Sellier & Bellot': 'sellier'
};

function brandSlug(name) { return BRAND_SLUG_OVERRIDES[name] || slug(name); }

// Decorativo (la pagina solo lee slug+name, ver lib/catalogo.ts), pero ya
// habia country en las 18 marcas de muestra y mantiene el estilo.
var BRAND_COUNTRY = {
  Sako: 'FI', Blaser: 'DE', Sauer: 'DE', Mauser: 'DE', Browning: 'BE',
  Merkel: 'DE', Benelli: 'IT', CZ: 'CZ', 'Grulla Armas': 'ES', Arrieta: 'ES',
  Fabarm: 'IT', Zoli: 'IT', Winchester: 'US', Morini: 'CH',
  Feinwerkbau: 'DE', Steyr: 'AT', 'SIG Sauer': 'DE', Zeiss: 'DE',
  Vortex: 'US', Kahles: 'AT', Holosun: 'US', Leica: 'DE', RWS: 'DE',
  Norma: 'SE', Lapua: 'FI', CCI: 'US', Eley: 'GB', RIO: 'ES', SAGA: 'ES',
  Fiocchi: 'IT', Peli: 'US', Plano: 'US', Arregui: 'ES', Rottner: 'DE',
  "Hoppe's": 'US'
};

// code de licence_regime ya sembrado (ver db/supabase/seed.sql, seccion 1) -
// las mismas cuatro etiquetas de REGIMEN en catalog.js.
var LICENCE_CODE = {
  'Uso civil': 'uso-civil',
  'Uso civil condicional': 'uso-civil-condicional',
  'Aire comprimido': 'aire-comprimido',
  'Requiere TCCM': 'requiere-tccm'
};

// bore_mm por calibre: mismos valores que db/supabase/seed.sql (sec. 2), y
// el mismo diametro de anima para cualquier cartucho nuevo del mismo calibre
// nominal (p.ej. "cal. 20/76" es la misma anima que "cal. 20/70", solo
// cambia la recamara).
var BORE_MM = {
  '.22 LR': 5.60, '.223 Rem': 5.70, '.308 Win': 7.82, '.30-06 Sprg': 7.82,
  '.300 Win Mag': 7.82, '6,5 Creedmoor': 6.71, '8x57 IS': 8.20,
  '9,3x62': 9.30, '9 mm Pb': 9.02, '4,5 mm': 4.50
};
function boreMm(nombre) {
  if (BORE_MM[nombre] !== undefined) return BORE_MM[nombre];
  var m = /^cal\. (\d{2})\/\d{2}$/.exec(nombre);
  if (!m) return null;
  return { '12': 18.50, '20': 15.60 }[m[1]] || null;
}

/* --- recogida de catalog.js --------------------------------------------- */

function marcas() {
  var visto = {};
  catalog.LINES.forEach(function (line) {
    line.items.forEach(function (item) { visto[item.brand] = true; });
  });
  return Object.keys(visto).sort().map(function (n) {
    return { slug: brandSlug(n), name: n, country: BRAND_COUNTRY[n] || null };
  });
}

function calibres() {
  var visto = {};
  function anota(nombre) { if (nombre) visto[nombre] = true; }
  catalog.LINES.forEach(function (line) {
    line.items.forEach(function (item) {
      (item.cals || []).forEach(anota);
      anota(catalog.calibre(item.brand + ' ' + item.ref));
    });
  });
  return Object.keys(visto).sort().map(function (n) {
    var aire = /4,5 mm/.test(n);
    // catalog.topeTccm() no sabe de aire comprimido (siempre da 1000 o
    // 2500); el 0 es aparte, igual que en tools/seed.js: el balin no
    // consume cupo porque no es municion, y un 0 lo dice mas claro que null.
    return {
      name: n, bore_mm: boreMm(n), smoothbore: /^cal\./.test(n),
      rimfire: n === '.22 LR', airgun: aire,
      annual_quota: aire ? 0 : catalog.topeTccm(n)
    };
  });
}

// Un producto por ficha de catalog.js, con su lista de variantes (una por
// calibre; [null] cuando el producto no se vende por calibre).
function productos() {
  var out = [];
  catalog.LINES.forEach(function (line) {
    line.items.forEach(function (item) {
      var cals = item.cals && item.cals.length ? item.cals
        : [catalog.calibre(item.brand + ' ' + item.ref)]; // null si no hay
      out.push({
        marca: item.brand,
        marcaSlug: brandSlug(item.brand),
        familia: line.id,
        ref: item.ref,
        kind: item.kind,
        spec: item.spec,
        licenceCode: item.licence ? LICENCE_CODE[item.licence] : null,
        usd_cents: item.usd * 100,
        serialized: !!{ rifles: 1, escopetas: 1, pistolas: 1 }[line.id] &&
          item.licence !== 'Aire comprimido',
        cartridgesPerBox: catalog.porCaja(item.spec.join(' ')),
        foto: item.photo || null,
        cals: cals
      });
    });
  });
  return out;
}

/* --- comprobaciones (gotcha de 0009_fotos.sql: no fiarse del nombre) ---- */

function comprobarFotos(prods) {
  var enDisco = fs.readdirSync(FOTOS_DIR).filter(function (f) {
    return f.endsWith('.webp');
  });
  var enDiscoSet = {};
  enDisco.forEach(function (f) { enDiscoSet[f] = true; });

  var usados = {};
  var problemas = [];
  prods.forEach(function (p) {
    if (!p.foto) { problemas.push(p.marca + ' ' + p.ref + ': sin foto en catalog.js'); return; }
    var fichero = p.foto.replace(/^img\/product\//, '');
    if (!enDiscoSet[fichero]) {
      problemas.push(p.marca + ' ' + p.ref + ': ' + fichero + ' no existe en public/img/product/');
      return;
    }
    if (usados[fichero]) {
      problemas.push(p.marca + ' ' + p.ref + ': ' + fichero + ' ya la usa ' + usados[fichero]);
      return;
    }
    usados[fichero] = p.marca + ' ' + p.ref;
  });
  if (problemas.length) {
    throw new Error('seed-supabase: fotos sin comprobar contra disco:\n  ' + problemas.join('\n  '));
  }
}

function comprobarSkus(variantes) {
  var visto = {};
  variantes.forEach(function (v) {
    if (visto[v.sku]) {
      throw new Error('seed-supabase: sku duplicado ' + v.sku + ' (' +
        visto[v.sku] + ' y ' + v.p.marca + ' ' + v.p.ref + ')');
    }
    visto[v.sku] = v.p.marca + ' ' + v.p.ref;
  });
}

/* --- escritura ----------------------------------------------------------- */

function genera() {
  var brands = marcas();
  var cals = calibres();
  var prods = productos();
  comprobarFotos(prods);

  // Mismo formato que ya usa db/supabase/seed.sql (seccion 6): marca en
  // mayusculas, guion, ref sin signos, guion, calibre sin signos. No es
  // cosmetico en la rama sin calibre: `unique (product_id, calibre_id)` no
  // distingue dos NULL entre si, asi que ahi el SKU es el unico arbitro real
  // de si esto es idempotente. Usar un formato distinto del que ya hay en la
  // base duplico 5 filas la primera vez que se aplico este generador (los
  // cinco productos de optica/accesorios que ya venian de la semilla de 18
  // de muestra) -- se detecto y se corrigio a mano; este formato es para que
  // no vuelva a pasar.
  var alnum = function (s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  function skuDe(marcaSlug, ref, cal) {
    return [alnum(marcaSlug), alnum(ref), cal ? alnum(cal) : null].filter(Boolean).join('-');
  }

  var variantes = [];
  prods.forEach(function (p) {
    p.cals.forEach(function (cal, i) {
      variantes.push({ p: p, cal: cal, position: i + 1, sku: skuDe(p.marcaSlug, p.ref, cal) });
    });
  });
  comprobarSkus(variantes);

  var partes = [];

  partes.push(
    '-- seed-productos.sql - GENERADO por tools/seed-supabase.js desde\n' +
    '-- D:\\GunShop\\js\\catalog.js (o el mismo repo en ..\\GunShop desde este\n' +
    '-- worktree). No editar a mano.\n' +
    '--\n' +
    '-- Reconstruir:  node tools/seed-supabase.js\n' +
    '--\n' +
    '-- Trae los 76 productos y las 102 referencias del catalogo real, encima\n' +
    '-- de lo que ya deja seed.sql (family/licence_regime/location/fx_rate).\n' +
    '-- Idempotente: cada insert entra por su clave natural. product usa\n' +
    '-- ON CONFLICT ... DO UPDATE (corrige precio/regimen/ficha si ya estaba\n' +
    '-- de la semilla de 18 de muestra; catalog.js es la unica fuente de\n' +
    '-- verdad); el resto, DO NOTHING. No toca cart/sales_order/customer ni\n' +
    '-- ninguna tabla de pedidos o clientes -- no las nombra, y order_item\n' +
    '-- guarda su propia copia congelada de lo que se vendio.\n\n');

  partes.push(bloqueValues(
    'insert into public.brand (slug, name, country) values',
    brands.map(function (b) { return [txt(b.slug), txt(b.name), txt(b.country)].join(', '); }),
    'on conflict (slug) do nothing;'));

  partes.push(bloqueValues(
    'insert into public.calibre (name, bore_mm, smoothbore, rimfire, airgun, annual_quota) values',
    cals.map(function (c) {
      return [txt(c.name), c.bore_mm === null ? 'null' : c.bore_mm, bool(c.smoothbore),
        bool(c.rimfire), bool(c.airgun), c.annual_quota].join(', ');
    }), 'on conflict (name) do nothing;'));

  partes.push(
    'insert into public.product (brand_id, family_id, ref, kind, spec, licence_regime_id,\n' +
    '                            usd_cents, serialized, cartridges_per_box)\n' +
    'select b.id, f.id, v.ref, v.kind, v.spec,\n' +
    '       (select r.id from public.licence_regime r where r.code = v.licence),\n' +
    '       v.usd_cents, v.serialized, v.cartuchos\n' +
    '  from (values\n' +
    prods.map(function (p) {
      return '  (' + [txt(p.marcaSlug), txt(p.familia), txt(p.ref), txt(p.kind),
        arr(p.spec), p.licenceCode ? txt(p.licenceCode) : 'null::text',
        p.usd_cents, bool(p.serialized), p.cartridgesPerBox].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, family, ref, kind, spec, licence, usd_cents, serialized, cartuchos)\n' +
    '  join public.brand  b on b.slug = v.brand\n' +
    '  join public.family f on f.slug = v.family\n' +
    // DO UPDATE y no DO NOTHING: 13 de estos 76 ya estaban de la semilla de
    // 18 de muestra, y cinco traian un precio de prueba que no es el de
    // catalog.js (glock 17 Gen5, aimpoint Acro P-2, hornady Superformance,
    // negrini 1657, otis Elite Cleaning System). catalog.js es la unica
    // fuente de verdad del catalogo -- un producto escrito dos veces son dos
    // productos --, asi que re-aplicar esto tiene que corregirlos, no
    // dejarlos como estaban. Seguro para los pedidos ya hechos: order_item
    // guarda su propia copia congelada de precio, nombre y regimen (ver
    // CLAUDE.md), asi que nada de lo vendido cambia con esto.
    'on conflict (brand_id, ref) do update set\n' +
    '  kind = excluded.kind,\n' +
    '  spec = excluded.spec,\n' +
    '  licence_regime_id = excluded.licence_regime_id,\n' +
    '  usd_cents = excluded.usd_cents,\n' +
    '  serialized = excluded.serialized,\n' +
    '  cartridges_per_box = excluded.cartridges_per_box;\n\n');

  var conCalibre = variantes.filter(function (v) { return v.cal; });
  partes.push(
    'insert into public.product_variant (product_id, calibre_id, sku, position)\n' +
    'select p.id, c.id, v.sku, v.position\n' +
    '  from (values\n' +
    conCalibre.map(function (v) {
      return '  (' + [txt(v.p.marcaSlug), txt(v.p.ref), txt(v.cal), txt(v.sku), v.position].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, ref, calibre, sku, position)\n' +
    '  join public.brand   b on b.slug = v.brand\n' +
    '  join public.product p on p.brand_id = b.id and p.ref = v.ref\n' +
    '  join public.calibre c on c.name = v.calibre\n' +
    // Arbitro explicito: es la restriccion real que evita el duplicado
    // cuando el producto ya tenia esta referencia (los 18 de seed.sql).
    'on conflict (product_id, calibre_id) do nothing;\n\n');

  // Optica y accesorios: sin calibre, y `unique (product_id, calibre_id)`
  // no distingue dos NULL entre si (asi es NULL en un indice unico) -- por
  // eso el arbitro aqui es `sku`, no `(product_id, calibre_id)`: es la unica
  // restriccion que de verdad puede rechazar una fila repetida cuando el
  // calibre es null.
  var sinCalibre = variantes.filter(function (v) { return !v.cal; });
  partes.push(
    'insert into public.product_variant (product_id, calibre_id, sku, position)\n' +
    'select p.id, null, v.sku, v.position\n' +
    '  from (values\n' +
    sinCalibre.map(function (v) {
      return '  (' + [txt(v.p.marcaSlug), txt(v.p.ref), txt(v.sku), v.position].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, ref, sku, position)\n' +
    '  join public.brand   b on b.slug = v.brand\n' +
    '  join public.product p on p.brand_id = b.id and p.ref = v.ref\n' +
    'on conflict (sku) do nothing;\n\n');

  var conFoto = prods.filter(function (p) { return p.foto; });
  partes.push(
    'insert into public.product_photo (product_id, path, is_primary, licence_note)\n' +
    'select p.id, v.path, true, \'sin aclarar: foto de fabricante o distribuidor\'\n' +
    '  from (values\n' +
    conFoto.map(function (p) {
      return '  (' + [txt(p.marcaSlug), txt(p.ref), txt(p.foto)].join(', ') + ')';
    }).join(',\n') +
    '\n  ) as v(brand, ref, path)\n' +
    '  join public.brand   b on b.slug = v.brand\n' +
    '  join public.product p on p.brand_id = b.id and p.ref = v.ref\n' +
    // Arbitro explicito: es el indice de 0009_fotos.sql. Sin el, ON CONFLICT
    // DO NOTHING no tiene con que comprobar duplicados en esta tabla.
    'on conflict (product_id, path) do nothing;\n');

  return { sql: partes.join(''), prods: prods, variantes: variantes };
}

if (require.main === module) {
  var gen = genera();
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, gen.sql);
  process.stdout.write('db/supabase/seed-productos.sql · ' + gen.prods.length + ' productos · ' +
    gen.variantes.length + ' referencias · ' +
    (gen.sql.match(/^insert into/gm) || []).length + ' inserts\n');
}

module.exports = { genera: genera, slug: slug };
