/* catalog.js - catalogo generado y paginado. Sin DOM: se puede probar en node. */
(function (global) {
  'use strict';

  var BRANDS = ['Alcántara', 'Berrueta', 'Ordax', 'Tramontana', 'Loma Alta', 'Sarrión', 'Valdaya'];

  var LINES = [
    {
      id: 'rifles', label: 'Rifles', kind: 'Rifle de cerrojo', model: 'rifle',
      licence: 'Licencia D', count: 34, seed: 8123,
      names: ['Montaña', 'Rebeco', 'Robledal', 'Cortado', 'Urogallo', 'Hayedo', 'Ladera'],
      specs: [
        { cal: '.308 Win', a: 'cañón 560 mm', b: '3,1 kg', price: 1890 },
        { cal: '.30-06 Sprg', a: 'cañón 610 mm', b: '3,4 kg', price: 1650 },
        { cal: '6,5 Creedmoor', a: 'cañón 610 mm', b: '3,6 kg', price: 2340 },
        { cal: '.300 Win Mag', a: 'cañón 660 mm', b: '3,8 kg', price: 2780 },
        { cal: '7 mm Rem Mag', a: 'cañón 610 mm', b: '3,5 kg', price: 2190 },
        { cal: '.243 Win', a: 'cañón 560 mm', b: '2,9 kg', price: 1420 },
        { cal: '9,3x62', a: 'cañón 560 mm', b: '3,7 kg', price: 2960 }
      ]
    },
    {
      id: 'escopetas', label: 'Escopetas', kind: 'Escopeta superpuesta', model: 'shotgun',
      licence: 'Licencia E', count: 30, seed: 4471,
      names: ['Marisma', 'Coto', 'Encinar', 'Vega', 'Salina', 'Ribera'],
      specs: [
        { cal: 'cal. 12/70', a: 'cañón 710 mm', b: '3,2 kg', price: 1290 },
        { cal: 'cal. 12/76', a: 'cañón 760 mm', b: '3,4 kg', price: 1740 },
        { cal: 'cal. 20/76', a: 'cañón 660 mm', b: '2,9 kg', price: 1560 },
        { cal: 'cal. 12/70', a: 'cañón 660 mm', b: '3,0 kg', price: 940 },
        { cal: 'cal. 28/70', a: 'cañón 660 mm', b: '2,7 kg', price: 2380 },
        { cal: 'cal. 12/76', a: 'cañón 810 mm', b: '3,6 kg', price: 3450 }
      ]
    },
    {
      id: 'pistolas', label: 'Pistolas', kind: 'Arma corta de tiro', model: 'pistol',
      licence: 'Licencia F', count: 24, seed: 9902,
      names: ['Estándar', 'Precisión', 'Silueta', 'Velocidad', 'Olímpica'],
      specs: [
        { cal: '.22 LR', a: 'cañón 152 mm', b: 'gatillo 1.000 g', price: 1180 },
        { cal: '.22 Short', a: 'cañón 133 mm', b: 'gatillo 500 g', price: 1740 },
        { cal: '9 mm Pb', a: 'cañón 118 mm', b: '15+1', price: 890 },
        { cal: '4,5 mm', a: 'aire comprimido', b: 'gatillo 500 g', price: 640 },
        { cal: '.32 S&W L', a: 'cañón 152 mm', b: 'gatillo 1.360 g', price: 2260 }
      ]
    },
    {
      id: 'optica', label: 'Óptica', kind: 'Óptica de puntería', model: 'optic',
      licence: null, count: 30, seed: 3318,
      names: ['Visor', 'Visor', 'Punto rojo', 'Prismáticos', 'Visor'],
      models: ['optic', 'optic', 'reddot', 'binocular', 'optic'],
      kinds: ['Visor de caza', 'Visor de tiro', 'Punto rojo', 'Prismáticos', 'Visor de larga distancia'],
      specs: [
        { cal: '3-12x56', a: 'retícula 4A', b: 'tubo 30 mm', price: 780 },
        { cal: '2,5-10x50', a: 'retícula iluminada', b: 'tubo 30 mm', price: 1240 },
        { cal: '2 MOA', a: 'montura Picatinny', b: '38 g', price: 310 },
        { cal: '10x42', a: 'campo 114 m/1.000', b: '640 g', price: 690 },
        { cal: '5-25x56', a: 'torretas de tiro', b: 'tubo 34 mm', price: 2140 }
      ]
    },
    {
      id: 'municion', label: 'Munición', kind: 'Cartuchería', model: 'cartridge',
      licence: 'Guía de pertenencia', count: 28, seed: 6605,
      names: ['Rececho', 'Batida', 'Campo', 'Acuática', 'Práctica', 'Match', 'Galería'],
      specs: [
        { cal: '.308 Win', a: 'punta blindada 150 gr', b: 'caja de 20', price: 38 },
        { cal: '.30-06 Sprg', a: 'punta expansiva 180 gr', b: 'caja de 20', price: 42 },
        { cal: 'cal. 12/70', a: 'perdigón 32 g del 6', b: 'caja de 25', price: 12 },
        { cal: 'cal. 12/76', a: 'perdigón 36 g del 4', b: 'caja de 25', price: 17 },
        { cal: '.22 LR', a: 'plomo 40 gr', b: 'caja de 50', price: 9 },
        { cal: '6,5 Creedmoor', a: 'match 140 gr', b: 'caja de 20', price: 62 },
        { cal: '9 mm Pb', a: 'FMJ 124 gr', b: 'caja de 50', price: 34 }
      ]
    },
    {
      id: 'accesorios', label: 'Accesorios', kind: 'Transporte y custodia', model: 'gcase',
      licence: null, count: 22, seed: 7714,
      names: ['Funda rígida', 'Maletín de tiro', 'Armero', 'Estuche de limpieza', 'Bolsa de cañones'],
      kinds: ['Transporte rígido', 'Transporte rígido', 'Custodia y seguridad', 'Mantenimiento', 'Transporte blando'],
      specs: [
        { cal: '128 cm', a: 'espuma precortada', b: 'cierre con llave', price: 190 },
        { cal: '96 cm', a: 'aluminio remachado', b: 'estanco IP67', price: 340 },
        { cal: '5 plazas', a: 'homologado grado 1', b: 'anclaje a muro', price: 620 },
        { cal: '12 piezas', a: 'baquetas de latón', b: 'estuche de nogal', price: 74 },
        { cal: '86 cm', a: 'loneta encerada', b: 'forro de borrego', price: 145 }
      ]
    }
  ];

  var PAGE = 12;

  // PRNG con semilla: el catalogo tiene que salir igual en cada carga.
  function rng(seed) {
    var s = seed;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var euro = typeof Intl !== 'undefined'
    ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })
    : { format: function (n) { return String(n); } };

  function build() {
    var items = [];

    LINES.forEach(function (line) {
      var next = rng(line.seed);
      for (var i = 0; i < line.count; i++) {
        var spec = line.specs[i % line.specs.length];
        var brand = BRANDS[Math.floor(next() * BRANDS.length)];
        var nameIdx = i % line.names.length;
        var units = Math.floor(next() * 7);
        var bump = Math.round(next() * 18) * 10;

        items.push({
          id: line.id + '-' + i,
          cat: line.id,
          kind: line.kinds ? line.kinds[nameIdx] : line.kind,
          model: line.models ? line.models[nameIdx] : line.model,
          variant: i % 4,
          name: brand + ' ' + line.names[nameIdx] + ' ' + spec.cal,
          spec: [spec.cal, spec.a, spec.b].join(' · '),
          price: spec.price + bump,
          licence: line.licence,
          stock: units === 0 ? 'order' : units === 1 ? 'last' : 'ok',
          units: units,
          // Relevancia: lo que hay en tienda pesa mas que lo que hay que encargar.
          score: next() * 100 + (units > 1 ? 30 : units === 1 ? 12 : 0)
        });
      }
    });

    return items.sort(function (a, b) { return b.score - a.score; });
  }

  function filtered(items, filter) {
    return filter === 'todo' ? items : items.filter(function (p) { return p.cat === filter; });
  }

  // Devuelve el tramo siguiente y si ya se ha llegado al final.
  function page(items, filter, offset, size) {
    var list = filtered(items, filter);
    var slice = list.slice(offset, offset + (size || PAGE));
    return {
      items: slice,
      total: list.length,
      offset: offset + slice.length,
      done: offset + slice.length >= list.length
    };
  }

  function counts(items) {
    var out = { todo: items.length };
    items.forEach(function (p) { out[p.cat] = (out[p.cat] || 0) + 1; });
    return out;
  }

  function price(n) { return euro.format(n); }

  var api = {
    LINES: LINES, PAGE: PAGE, BRANDS: BRANDS,
    rng: rng, build: build, page: page, filtered: filtered, counts: counts, price: price
  };

  global.GunShop = global.GunShop || {};
  global.GunShop.catalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
