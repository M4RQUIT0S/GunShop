/* catalog.js - catalogo real, paginado. Sin DOM: se puede probar en node.
   Modelos y fichas tecnicas de productos que existen; los precios son
   orientativos y hay que revisarlos contra tarifa antes de publicar. */
(function (global) {
  'use strict';

  var LINES = [
    {
      id: 'rifles', label: 'Rifles', model: 'rifle', licence: 'Licencia D', seed: 8123,
      items: [
        { brand: 'Bergara', ref: 'B-14 Ridge', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '6,5 Creedmoor'],
          spec: ['cañón 560 mm', '3,2 kg'], price: 1090 },
        { brand: 'Bergara', ref: 'B-14 HMR', kind: 'Rifle de precisión',
          cals: ['6,5 Creedmoor', '.308 Win'],
          spec: ['cañón 610 mm', '4,3 kg'], price: 1490 },
        { brand: 'Tikka', ref: 'T3x Lite', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 570 mm', '2,9 kg'], price: 1190 },
        { brand: 'Tikka', ref: 'T3x Varmint', kind: 'Rifle de precisión',
          cals: ['.223 Rem', '.308 Win'],
          spec: ['cañón 600 mm', '4,0 kg'], price: 1390 },
        { brand: 'Sako', ref: '85 Bavarian', kind: 'Rifle de cerrojo',
          cals: ['.30-06 Sprg', '9,3x62'],
          spec: ['cañón 570 mm', '3,4 kg', 'culata de nogal'], price: 2290 },
        { brand: 'Sako', ref: 'S20 Hunter', kind: 'Rifle modular',
          cals: ['.308 Win', '6,5 Creedmoor'],
          spec: ['cañón 610 mm', '3,4 kg'], price: 1890 },
        { brand: 'Blaser', ref: 'R8 Professional', kind: 'Rifle rectilíneo',
          cals: ['.30-06 Sprg', '8x57 IS', '9,3x62', '.300 Win Mag'],
          spec: ['cañón 580 mm', '3,4 kg', 'cañón intercambiable'], price: 3690 },
        { brand: 'Sauer', ref: '100 Classic XT', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg'],
          spec: ['cañón 560 mm', '3,2 kg'], price: 940 },
        { brand: 'Mauser', ref: 'M12 Pure', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '9,3x62'],
          spec: ['cañón 560 mm', '3,3 kg'], price: 1790 },
        { brand: 'Browning', ref: 'X-Bolt Hunter', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 560 mm', '3,2 kg'], price: 1250 },
        { brand: 'Merkel', ref: 'Helix Alpinist', kind: 'Rifle rectilíneo',
          cals: ['.30-06 Sprg', '9,3x62'],
          spec: ['cañón 560 mm', '3,1 kg'], price: 3190 },
        { brand: 'Browning', ref: 'BAR MK3', kind: 'Rifle semiautomático',
          cals: ['.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 530 mm', '3,3 kg'], price: 1590 },
        { brand: 'Benelli', ref: 'Argo E Comfort', kind: 'Rifle semiautomático',
          cals: ['.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 510 mm', '3,3 kg'], price: 1690 },
        { brand: 'CZ', ref: '457 Varmint', kind: 'Rifle del 22',
          cals: ['.22 LR'],
          spec: ['cañón 525 mm', '3,2 kg'], price: 690 },
        { brand: 'Anschütz', ref: '1761 HB', kind: 'Rifle del 22',
          cals: ['.22 LR'],
          spec: ['cañón 560 mm', '3,4 kg', 'gatillo ajustable'], price: 1590 }
      ]
    },
    {
      id: 'escopetas', label: 'Escopetas', model: 'shotgun', licence: 'Licencia E', seed: 4471,
      items: [
        { brand: 'AyA', ref: 'No. 4/53', kind: 'Paralela · Eibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,1 kg', 'extractores'], price: 3450 },
        { brand: 'AyA', ref: 'Aguila', kind: 'Paralela · Eibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,0 kg', 'grabado a mano'], price: 4890 },
        { brand: 'Grulla Armas', ref: 'Consejo', kind: 'Paralela · Eibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,0 kg', 'culata a medida'], price: 5200 },
        { brand: 'Arrieta', ref: '557', kind: 'Paralela · Elgoibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,1 kg', 'llaves Holland'], price: 4100 },
        { brand: 'Beretta', ref: '686 Silver Pigeon I', kind: 'Superpuesta de caza',
          cals: ['cal. 12/76', 'cal. 20/76'],
          spec: ['cañón 710 mm', '3,3 kg', '5 chokes'], price: 2190 },
        { brand: 'Beretta', ref: '690 Field III', kind: 'Superpuesta de caza',
          cals: ['cal. 12/76'],
          spec: ['cañón 710 mm', '3,4 kg', 'Steelium'], price: 3090 },
        { brand: 'Browning', ref: 'B525 Game One', kind: 'Superpuesta de caza',
          cals: ['cal. 12/76', 'cal. 20/76'],
          spec: ['cañón 710 mm', '3,3 kg'], price: 1990 },
        { brand: 'Browning', ref: 'B725 Sporter', kind: 'Superpuesta de tiro',
          cals: ['cal. 12/76'],
          spec: ['cañón 760 mm', '3,7 kg', 'banda ventilada'], price: 2790 },
        { brand: 'Fabarm', ref: 'Elos N2 Allsport', kind: 'Superpuesta de tiro',
          cals: ['cal. 12/76'],
          spec: ['cañón 760 mm', '3,6 kg'], price: 1890 },
        { brand: 'Zoli', ref: 'Z-Sport', kind: 'Superpuesta de tiro',
          cals: ['cal. 12/76'],
          spec: ['cañón 810 mm', '3,9 kg', 'culata regulable'], price: 6800 },
        { brand: 'Benelli', ref: 'Raffaello Crio', kind: 'Semiautomática',
          cals: ['cal. 12/76'],
          spec: ['cañón 710 mm', '3,0 kg', 'sistema inercial'], price: 1750 },
        { brand: 'Beretta', ref: 'A400 Xtreme Plus', kind: 'Semiautomática',
          cals: ['cal. 12/89'],
          spec: ['cañón 760 mm', '3,4 kg', 'Kick-Off'], price: 1990 },
        { brand: 'Winchester', ref: 'SX4 Field', kind: 'Semiautomática',
          cals: ['cal. 12/76', 'cal. 20/76'],
          spec: ['cañón 710 mm', '3,2 kg'], price: 890 }
      ]
    },
    {
      id: 'pistolas', label: 'Pistolas', model: 'pistol', licence: 'Licencia F', seed: 9902,
      items: [
        { brand: 'Pardini', ref: 'SP', kind: 'Pistola de precisión',
          cals: ['.22 LR'], spec: ['cañón 152 mm', 'gatillo 1.000 g'], price: 1590 },
        { brand: 'Pardini', ref: 'K12 Absorber', kind: 'Pistola de aire',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '940 g'], price: 1290 },
        { brand: 'Walther', ref: 'GSP Expert', kind: 'Pistola de precisión',
          cals: ['.22 LR'], spec: ['cañón 152 mm', 'gatillo 1.000 g'], price: 1990 },
        { brand: 'Walther', ref: 'LP500 Expert', kind: 'Pistola de aire',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '960 g'], price: 1690 },
        { brand: 'Morini', ref: 'CM 162 EI', kind: 'Pistola de aire',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '940 g'], price: 1450 },
        { brand: 'Feinwerkbau', ref: 'AW93', kind: 'Pistola de precisión',
          cals: ['.22 LR'], spec: ['cañón 153 mm', 'gatillo 1.000 g'], price: 1790 },
        { brand: 'Steyr', ref: 'EVO 10 E', kind: 'Pistola de aire',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '960 g'], price: 1350 },
        { brand: 'Beretta', ref: '92X Performance', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 125 mm', '15+1'], price: 1290 },
        { brand: 'CZ', ref: 'Shadow 2', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 120 mm', '17+1'], price: 1490 },
        { brand: 'Glock', ref: '17 Gen5', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 114 mm', '17+1'], price: 790 },
        { brand: 'SIG Sauer', ref: 'P226 LDC II', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 112 mm', '15+1'], price: 1590 }
      ]
    },
    {
      id: 'optica', label: 'Óptica', model: 'optic', licence: null, seed: 3318,
      items: [
        { brand: 'Swarovski', ref: 'Z8i 2-16x50 P', kind: 'Visor de caza',
          spec: ['retícula 4A-I', 'tubo 30 mm', '630 g'], price: 3290 },
        { brand: 'Swarovski', ref: 'Z6i 2,5-15x56', kind: 'Visor de caza',
          spec: ['retícula 4A-I', 'tubo 30 mm', '660 g'], price: 2590 },
        { brand: 'Zeiss', ref: 'Conquest V4 3-12x56', kind: 'Visor de caza',
          spec: ['retícula 60', 'tubo 30 mm', '640 g'], price: 1290 },
        { brand: 'Zeiss', ref: 'Victory V8 2,8-20x56', kind: 'Visor de larga distancia',
          spec: ['retícula 60', 'tubo 36 mm', '800 g'], price: 3390 },
        { brand: 'Leupold', ref: 'VX-3HD 3,5-10x50', kind: 'Visor de caza',
          spec: ['retícula Duplex', 'tubo 30 mm', '470 g'], price: 640 },
        { brand: 'Vortex', ref: 'Viper PST Gen II 5-25x50', kind: 'Visor de tiro',
          spec: ['retícula EBR-7C', 'tubo 30 mm', 'torretas de tiro'], price: 1190 },
        { brand: 'Kahles', ref: 'K18i 1-8x24', kind: 'Visor de batida',
          spec: ['retícula 3GR', 'tubo 30 mm', '510 g'], price: 2290 },
        { brand: 'Aimpoint', ref: 'Micro H-2 2 MOA', kind: 'Punto rojo', model: 'reddot',
          spec: ['montura Picatinny', '105 g'], price: 820 },
        { brand: 'Aimpoint', ref: 'Acro P-2 3,5 MOA', kind: 'Punto rojo', model: 'reddot',
          spec: ['cierre estanco', '60 g'], price: 640 },
        { brand: 'Holosun', ref: 'HS507C X2', kind: 'Punto rojo', model: 'reddot',
          spec: ['retícula múltiple', '44 g'], price: 340 },
        { brand: 'Swarovski', ref: 'EL 10x42 WB', kind: 'Prismáticos', model: 'binocular',
          spec: ['campo 133 m/1.000', '840 g'], price: 2490 },
        { brand: 'Zeiss', ref: 'Victory SF 10x42', kind: 'Prismáticos', model: 'binocular',
          spec: ['campo 120 m/1.000', '780 g'], price: 2690 },
        { brand: 'Leica', ref: 'Geovid R 10x42', kind: 'Prismáticos telémetro', model: 'binocular',
          spec: ['alcance 1.100 m', '950 g'], price: 2190 },
        { brand: 'Vortex', ref: 'Diamondback HD 10x42', kind: 'Prismáticos', model: 'binocular',
          spec: ['campo 104 m/1.000', '780 g'], price: 290 }
      ]
    },
    {
      id: 'municion', label: 'Munición', model: 'cartridge',
      licence: 'Guía de pertenencia', seed: 6605,
      items: [
        { brand: 'Federal', ref: 'Power-Shok .308 Win 150 gr', kind: 'Cartuchería metálica',
          spec: ['punta blanda', 'caja de 20'], price: 29 },
        { brand: 'Hornady', ref: 'Precision Hunter 6,5 Creedmoor 143 gr', kind: 'Cartuchería metálica',
          spec: ['punta ELD-X', 'caja de 20'], price: 48 },
        { brand: 'Hornady', ref: 'Superformance .30-06 Sprg 165 gr', kind: 'Cartuchería metálica',
          spec: ['punta SST', 'caja de 20'], price: 45 },
        { brand: 'RWS', ref: 'Evolution Green .308 Win 139 gr', kind: 'Cartuchería sin plomo',
          spec: ['sin plomo', 'caja de 20'], price: 62 },
        { brand: 'Norma', ref: 'Oryx .30-06 Sprg 180 gr', kind: 'Cartuchería metálica',
          spec: ['núcleo soldado', 'caja de 20'], price: 52 },
        { brand: 'Sellier & Bellot', ref: '.308 Win 147 gr', kind: 'Cartuchería de práctica',
          spec: ['FMJ', 'caja de 20'], price: 21 },
        { brand: 'Lapua', ref: 'Scenar-L 6,5 Creedmoor 136 gr', kind: 'Cartuchería match',
          spec: ['punta hueca', 'caja de 50'], price: 78 },
        { brand: 'CCI', ref: 'Standard Velocity .22 LR 40 gr', kind: 'Cartuchería del 22',
          spec: ['plomo', 'caja de 50'], price: 9 },
        { brand: 'Eley', ref: 'Tenex .22 LR 40 gr', kind: 'Cartuchería match',
          spec: ['selección de lote', 'caja de 50'], price: 24 },
        { brand: 'RIO', ref: 'Star 32 cal. 12/70', kind: 'Cartuchería de caza',
          spec: ['plomo 32 g del 6', 'caja de 25'], price: 9 },
        { brand: 'SAGA', ref: 'Perdiz 34 cal. 12/70', kind: 'Cartuchería de caza',
          spec: ['plomo 34 g del 6', 'caja de 25'], price: 10 },
        { brand: 'Fiocchi', ref: 'Golden Pheasant cal. 12/70', kind: 'Cartuchería de caza',
          spec: ['plomo 36 g del 5', 'caja de 25'], price: 17 },
        { brand: 'Winchester', ref: 'Super X cal. 12/76', kind: 'Cartuchería de caza',
          spec: ['plomo 36 g del 4', 'caja de 25'], price: 13 }
      ]
    },
    {
      id: 'accesorios', label: 'Accesorios', model: 'gcase', licence: null, seed: 7714,
      items: [
        { brand: 'Peli', ref: '1750 Protector', kind: 'Maleta rígida',
          spec: ['128 cm', 'espuma precortada', 'purga de presión'], price: 389 },
        { brand: 'Peli', ref: '1720 Protector', kind: 'Maleta rígida',
          spec: ['107 cm', 'cierre estanco IP67'], price: 299 },
        { brand: 'Negrini', ref: '1657', kind: 'Maleta para superpuesta',
          spec: ['82 cm', 'forro de terciopelo'], price: 219 },
        { brand: 'Plano', ref: 'All Weather 42"', kind: 'Maleta rígida',
          spec: ['107 cm', 'cierres de leva'], price: 139 },
        { brand: 'Vanguard', ref: 'Pioneer 46', kind: 'Funda blanda',
          spec: ['117 cm', 'acolchado 25 mm'], price: 69 },
        { brand: 'Beretta', ref: 'Uniform Pro EVO Field Bag', kind: 'Bolsa de campo',
          spec: ['45 l', 'loneta encerada'], price: 189 },
        { brand: 'Arregui', ref: 'Rifle 180020', kind: 'Armero homologado',
          spec: ['5 plazas', 'grado I', 'anclaje a muro'], price: 469 },
        { brand: 'Ferrimax', ref: 'Alfa 5', kind: 'Armero homologado',
          spec: ['5 plazas', 'cerradura de llave'], price: 379 },
        { brand: "Hoppe's", ref: 'No. 9 Deluxe Kit', kind: 'Estuche de limpieza',
          spec: ['32 piezas', 'estuche de nogal'], price: 59 },
        { brand: 'Otis', ref: 'Elite Cleaning System', kind: 'Estuche de limpieza',
          spec: ['40 piezas', 'multicalibre'], price: 179 }
      ]
    }
  ];

  var PAGE = 12;

  // PRNG con semilla: la disponibilidad tiene que salir igual en cada carga.
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
    var out = [];

    LINES.forEach(function (line) {
      var next = rng(line.seed);
      var n = 0;

      line.items.forEach(function (item) {
        // Un rifle existe en varios calibres: cada uno es una referencia distinta.
        var variants = item.cals && item.cals.length ? item.cals : [null];

        variants.forEach(function (cal) {
          var units = Math.floor(next() * 7);

          out.push({
            id: line.id + '-' + n,
            cat: line.id,
            kind: item.kind,
            model: item.model || line.model,
            variant: n % 4,
            name: item.brand + ' ' + item.ref + (cal ? ' ' + cal : ''),
            spec: (cal ? [cal] : []).concat(item.spec).join(' · '),
            price: item.price,
            licence: line.licence,
            stock: units === 0 ? 'order' : units === 1 ? 'last' : 'ok',
            units: units,
            // Relevancia: lo que hay en tienda pesa mas que lo que hay que encargar.
            score: next() * 100 + (units > 1 ? 30 : units === 1 ? 12 : 0)
          });
          n += 1;
        });
      });
    });

    return out.sort(function (a, b) { return b.score - a.score; });
  }

  function filtered(items, filter) {
    return filter === 'todo' ? items : items.filter(function (p) { return p.cat === filter; });
  }

  // Devuelve el tramo siguiente y si ya se ha llegado al final.
  // size 0 es un tramo vacio, no "usa el tamaño por defecto".
  function page(items, filter, offset, size) {
    var list = filtered(items, filter);
    var take = size === undefined || size === null ? PAGE : size;
    var slice = list.slice(offset, offset + take);
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
    LINES: LINES, PAGE: PAGE,
    rng: rng, build: build, page: page, filtered: filtered, counts: counts, price: price
  };

  global.GunShop = global.GunShop || {};
  global.GunShop.catalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
