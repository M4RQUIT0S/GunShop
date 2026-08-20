/* catalog.js - catalogo real, paginado. Sin DOM: se puede probar en node.
   Modelos y fichas tecnicas de productos que existen.

   El campo `usd` es el precio en dolares. En Argentina las armas se cotizan
   en dolares porque una lista en pesos queda obsoleta en semanas; los pesos
   se derivan de ARS_POR_USD, que es el unico numero que hay que mover
   cuando cambia el tipo de cambio. */
(function (global) {
  'use strict';

  var LINES = [
    {
      id: 'rifles', label: 'Rifles', model: 'rifle', licence: 'Uso civil condicional', seed: 8123,
      items: [
        { brand: 'Bergara', ref: 'B-14 Ridge', photo: 'img/product/bergara-b-14-ridge.webp', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '6,5 Creedmoor'],
          spec: ['cañón 560 mm', '3,2 kg'], usd: 1910 },
        { brand: 'Bergara', ref: 'B-14 HMR', photo: 'img/product/bergara-b-14-hmr.webp', kind: 'Rifle de precisión',
          cals: ['6,5 Creedmoor', '.308 Win'],
          spec: ['cañón 610 mm', '4,3 kg'], usd: 2600 },
        { brand: 'Tikka', ref: 'T3x Lite', photo: 'img/product/tikka-t3x-lite.webp', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 570 mm', '2,9 kg'], usd: 2100 },
        { brand: 'Tikka', ref: 'T3x Varmint', photo: 'img/product/tikka-t3x-varmint.webp', kind: 'Rifle de precisión',
          cals: ['.223 Rem', '.308 Win'],
          spec: ['cañón 600 mm', '4,0 kg'], usd: 2450 },
        { brand: 'Sako', ref: '85 Bavarian', photo: 'img/product/sako-85-bavarian.webp', kind: 'Rifle de cerrojo',
          cals: ['.30-06 Sprg', '9,3x62'],
          spec: ['cañón 570 mm', '3,4 kg', 'culata de nogal'], usd: 4000 },
        { brand: 'Sako', ref: 'S20 Hunter', photo: 'img/product/sako-s20-hunter.webp', kind: 'Rifle modular',
          cals: ['.308 Win', '6,5 Creedmoor'],
          spec: ['cañón 610 mm', '3,4 kg'], usd: 3300 },
        { brand: 'Blaser', ref: 'R8 Professional', photo: 'img/product/blaser-r8-professional.webp', kind: 'Rifle rectilíneo',
          cals: ['.30-06 Sprg', '8x57 IS', '9,3x62', '.300 Win Mag'],
          spec: ['cañón 580 mm', '3,4 kg', 'cañón intercambiable'], usd: 6450 },
        { brand: 'Sauer', ref: '100 Classic XT', photo: 'img/product/sauer-100-classic-xt.webp', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg'],
          spec: ['cañón 560 mm', '3,2 kg'], usd: 1650 },
        { brand: 'Mauser', ref: 'M12 Pure', photo: 'img/product/mauser-m12-pure.webp', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '9,3x62'],
          spec: ['cañón 560 mm', '3,3 kg'], usd: 3150 },
        { brand: 'Browning', ref: 'X-Bolt Hunter', photo: 'img/product/browning-x-bolt-hunter.webp', kind: 'Rifle de cerrojo',
          cals: ['.308 Win', '.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 560 mm', '3,2 kg'], usd: 2200 },
        { brand: 'Merkel', ref: 'Helix Alpinist', photo: 'img/product/merkel-helix-alpinist.webp', kind: 'Rifle rectilíneo',
          cals: ['.30-06 Sprg', '9,3x62'],
          spec: ['cañón 560 mm', '3,1 kg'], usd: 5600 },
        { brand: 'Browning', ref: 'BAR MK3', photo: 'img/product/browning-bar-mk3.webp', kind: 'Rifle semiautomático',
          cals: ['.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 530 mm', '3,3 kg'], usd: 2800 },
        { brand: 'Benelli', ref: 'Argo E Comfort', photo: 'img/product/benelli-argo-e-comfort.webp', kind: 'Rifle semiautomático',
          cals: ['.30-06 Sprg', '.300 Win Mag'],
          spec: ['cañón 510 mm', '3,3 kg'], usd: 2950 },
        { brand: 'CZ', ref: '457 Varmint', photo: 'img/product/cz-457-varmint.webp', kind: 'Rifle del 22', licence: 'Uso civil',
          cals: ['.22 LR'],
          spec: ['cañón 525 mm', '3,2 kg'], usd: 1210 },
        { brand: 'Anschütz', ref: '1761 HB', photo: 'img/product/anschutz-1761-hb.webp', kind: 'Rifle del 22', licence: 'Uso civil',
          cals: ['.22 LR'],
          spec: ['cañón 560 mm', '3,4 kg', 'gatillo ajustable'], usd: 2800 }
      ]
    },
    {
      id: 'escopetas', label: 'Escopetas', model: 'shotgun', licence: 'Uso civil', seed: 4471,
      items: [
        { brand: 'AyA', ref: 'No. 4/53', photo: 'img/product/aya-no-4-53.webp', kind: 'Paralela · Eibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,1 kg', 'extractores'], usd: 5850 },
        { brand: 'AyA', ref: 'No. 1 De Luxe', photo: 'img/product/aya-no-1-de-luxe.webp', kind: 'Paralela · Eibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,0 kg', 'grabado a mano'], usd: 8300 },
        { brand: 'Grulla Armas', ref: '216 RB', photo: 'img/product/grulla-armas-216-rb.webp', kind: 'Paralela · Eibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,0 kg', 'culata a medida'], usd: 8850 },
        { brand: 'Arrieta', ref: '557', photo: 'img/product/arrieta-557.webp', kind: 'Paralela · Elgoibar',
          cals: ['cal. 12/70', 'cal. 20/70'],
          spec: ['cañón 710 mm', '3,1 kg', 'llaves Holland'], usd: 6950 },
        { brand: 'Beretta', ref: '686 Silver Pigeon I', photo: 'img/product/beretta-686-silver-pigeon-i.webp', kind: 'Superpuesta de caza',
          cals: ['cal. 12/76', 'cal. 20/76'],
          spec: ['cañón 710 mm', '3,3 kg', '5 chokes'], usd: 3700 },
        { brand: 'Beretta', ref: '690 Field III', photo: 'img/product/beretta-690-field-iii.webp', kind: 'Superpuesta de caza',
          cals: ['cal. 12/76'],
          spec: ['cañón 710 mm', '3,4 kg', 'Steelium'], usd: 5250 },
        { brand: 'Browning', ref: 'B525 Game One', photo: 'img/product/browning-b525-game-one.webp', kind: 'Superpuesta de caza',
          cals: ['cal. 12/76', 'cal. 20/76'],
          spec: ['cañón 710 mm', '3,3 kg'], usd: 3400 },
        { brand: 'Browning', ref: 'B725 Sporter', photo: 'img/product/browning-b725-sporter.webp', kind: 'Superpuesta de tiro',
          cals: ['cal. 12/76'],
          spec: ['cañón 760 mm', '3,7 kg', 'banda ventilada'], usd: 4750 },
        { brand: 'Fabarm', ref: 'Elos N2 Allsport', photo: 'img/product/fabarm-elos-n2-allsport.webp', kind: 'Superpuesta de tiro',
          cals: ['cal. 12/76'],
          spec: ['cañón 760 mm', '3,6 kg'], usd: 3200 },
        { brand: 'Zoli', ref: 'Z-Sport', photo: 'img/product/zoli-z-sport.webp', kind: 'Superpuesta de tiro',
          cals: ['cal. 12/76'],
          spec: ['cañón 810 mm', '3,9 kg', 'culata regulable'], usd: 11550 },
        { brand: 'Benelli', ref: 'Raffaello Crio', photo: 'img/product/benelli-raffaello-crio.webp', kind: 'Semiautomática', licence: 'Uso civil condicional',
          cals: ['cal. 12/76'],
          spec: ['cañón 710 mm', '3,0 kg', 'sistema inercial'], usd: 3000 },
        { brand: 'Beretta', ref: 'A400 Xtreme Plus', photo: 'img/product/beretta-a400-xtreme-plus.webp', kind: 'Semiautomática', licence: 'Uso civil condicional',
          cals: ['cal. 12/89'],
          spec: ['cañón 760 mm', '3,4 kg', 'Kick-Off'], usd: 3400 },
        { brand: 'Winchester', ref: 'SX4 Field', photo: 'img/product/winchester-sx4-field.webp', kind: 'Semiautomática', licence: 'Uso civil condicional',
          cals: ['cal. 12/76', 'cal. 20/76'],
          spec: ['cañón 710 mm', '3,2 kg'], usd: 1510 }
      ]
    },
    {
      id: 'pistolas', label: 'Pistolas', model: 'pistol', licence: 'Uso civil condicional', seed: 9902,
      items: [
        { brand: 'Pardini', ref: 'SP', photo: 'img/product/pardini-sp.webp', kind: 'Pistola de precisión', licence: 'Uso civil',
          cals: ['.22 LR'], spec: ['cañón 152 mm', 'gatillo 1.000 g'], usd: 3200 },
        { brand: 'Pardini', ref: 'K12 Absorber', photo: 'img/product/pardini-k12-absorber.webp', kind: 'Pistola de aire', licence: 'Aire comprimido',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '940 g'], usd: 2600 },
        { brand: 'Walther', ref: 'GSP Expert', photo: 'img/product/walther-gsp-expert.webp', kind: 'Pistola de precisión', licence: 'Uso civil',
          cals: ['.22 LR'], spec: ['cañón 152 mm', 'gatillo 1.000 g'], usd: 4000 },
        { brand: 'Walther', ref: 'LP500 Expert', photo: 'img/product/walther-lp500-expert.webp', kind: 'Pistola de aire', licence: 'Aire comprimido',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '960 g'], usd: 3400 },
        { brand: 'Morini', ref: 'CM 162 EI', photo: 'img/product/morini-cm-162-ei.webp', kind: 'Pistola de aire', licence: 'Aire comprimido',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '940 g'], usd: 2900 },
        { brand: 'Feinwerkbau', ref: 'AW93', photo: 'img/product/feinwerkbau-aw93.webp', kind: 'Pistola de precisión', licence: 'Uso civil',
          cals: ['.22 LR'], spec: ['cañón 153 mm', 'gatillo 1.000 g'], usd: 3600 },
        { brand: 'Steyr', ref: 'EVO 10 E', photo: 'img/product/steyr-evo-10-e.webp', kind: 'Pistola de aire', licence: 'Aire comprimido',
          cals: ['4,5 mm'], spec: ['gatillo 500 g', '960 g'], usd: 2700 },
        { brand: 'Beretta', ref: '92X Performance', photo: 'img/product/beretta-92x-performance.webp', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 125 mm', '15+1'], usd: 2600 },
        { brand: 'CZ', ref: 'Shadow 2', photo: 'img/product/cz-shadow-2.webp', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 120 mm', '17+1'], usd: 3000 },
        { brand: 'Glock', ref: '17 Gen5', photo: 'img/product/glock-17-gen5.webp', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 114 mm', '17+1'], usd: 1390 },
        { brand: 'SIG Sauer', ref: 'P226 LDC II', photo: 'img/product/sig-sauer-p226-ldc-ii.webp', kind: 'Arma corta de tiro',
          cals: ['9 mm Pb'], spec: ['cañón 112 mm', '15+1'], usd: 3200 }
      ]
    },
    {
      id: 'optica', label: 'Óptica', model: 'optic', licence: null, seed: 3318,
      items: [
        { brand: 'Swarovski', ref: 'Z8i 2-16x50 P', photo: 'img/product/swarovski-z8i-2-16x50-p.webp', kind: 'Visor de caza',
          spec: ['retícula 4A-I', 'tubo 30 mm', '630 g'], usd: 7900 },
        { brand: 'Swarovski', ref: 'Z6i 2,5-15x56', photo: 'img/product/swarovski-z6i-2-5-15x56.webp', kind: 'Visor de caza',
          spec: ['retícula 4A-I', 'tubo 30 mm', '660 g'], usd: 6200 },
        { brand: 'Zeiss', ref: 'Conquest V4 3-12x56', photo: 'img/product/zeiss-conquest-v4-3-12x56.webp', kind: 'Visor de caza',
          spec: ['retícula 60', 'tubo 30 mm', '640 g'], usd: 3100 },
        { brand: 'Zeiss', ref: 'Victory V8 2,8-20x56', photo: 'img/product/zeiss-victory-v8-2-8-20x56.webp', kind: 'Visor de larga distancia',
          spec: ['retícula 60', 'tubo 36 mm', '800 g'], usd: 8150 },
        { brand: 'Leupold', ref: 'VX-3HD 3,5-10x50', photo: 'img/product/leupold-vx-3hd-3-5-10x50.webp', kind: 'Visor de caza',
          spec: ['retícula Duplex', 'tubo 30 mm', '470 g'], usd: 1540 },
        { brand: 'Vortex', ref: 'Viper PST Gen II 5-25x50', photo: 'img/product/vortex-viper-pst-gen-ii-5-25x50.webp', kind: 'Visor de tiro',
          spec: ['retícula EBR-7C', 'tubo 30 mm', 'torretas de tiro'], usd: 2850 },
        { brand: 'Kahles', ref: 'K18i 1-8x24', photo: 'img/product/kahles-k18i-1-8x24.webp', kind: 'Visor de batida',
          spec: ['retícula 3GR', 'tubo 30 mm', '510 g'], usd: 5500 },
        { brand: 'Aimpoint', ref: 'Micro H-2 2 MOA', photo: 'img/product/aimpoint-micro-h-2-2-moa.webp', kind: 'Punto rojo', model: 'reddot',
          spec: ['montura Picatinny', '105 g'], usd: 1970 },
        { brand: 'Aimpoint', ref: 'Acro P-2 3,5 MOA', photo: 'img/product/aimpoint-acro-p-2-3-5-moa.webp', kind: 'Punto rojo', model: 'reddot',
          spec: ['cierre estanco', '60 g'], usd: 1540 },
        { brand: 'Holosun', ref: 'HS507C X2', photo: 'img/product/holosun-hs507c-x2.webp', kind: 'Punto rojo', model: 'reddot',
          spec: ['retícula múltiple', '44 g'], usd: 820 },
        { brand: 'Swarovski', ref: 'EL 10x42 WB', photo: 'img/product/swarovski-el-10x42-wb.webp', kind: 'Prismáticos', model: 'binocular',
          spec: ['campo 133 m/1.000', '840 g'], usd: 6000 },
        { brand: 'Zeiss', ref: 'Victory SF 10x42', photo: 'img/product/zeiss-victory-sf-10x42.webp', kind: 'Prismáticos', model: 'binocular',
          spec: ['campo 120 m/1.000', '780 g'], usd: 6450 },
        { brand: 'Leica', ref: 'Geovid R 10x42', photo: 'img/product/leica-geovid-r-10x42.webp', kind: 'Prismáticos telémetro', model: 'binocular',
          spec: ['alcance 1.100 m', '950 g'], usd: 5250 },
        { brand: 'Vortex', ref: 'Diamondback HD 10x42', photo: 'img/product/vortex-diamondback-hd-10x42.webp', kind: 'Prismáticos', model: 'binocular',
          spec: ['campo 104 m/1.000', '780 g'], usd: 700 }
      ]
    },
    {
      id: 'municion', label: 'Munición', model: 'cartridge',
      licence: 'Requiere TCCM', seed: 6605,
      items: [
        { brand: 'Federal', ref: 'Power-Shok .308 Win 150 gr', photo: 'img/product/federal-power-shok-308-win-150-gr.webp', kind: 'Cartuchería metálica',
          spec: ['punta blanda', 'caja de 20'], usd: 70 },
        { brand: 'Hornady', ref: 'Precision Hunter 6,5 Creedmoor 143 gr', photo: 'img/product/hornady-precision-hunter-6-5-creedmoor-143-gr.webp', kind: 'Cartuchería metálica',
          spec: ['punta ELD-X', 'caja de 20'], usd: 115 },
        { brand: 'Hornady', ref: 'Superformance .30-06 Sprg 165 gr', photo: 'img/product/hornady-superformance-30-06-sprg-165-gr.webp', kind: 'Cartuchería metálica',
          spec: ['punta SST', 'caja de 20'], usd: 110 },
        { brand: 'RWS', ref: 'Evolution Green .308 Win 139 gr', photo: 'img/product/rws-evolution-green-308-win-139-gr.webp', kind: 'Cartuchería sin plomo',
          spec: ['sin plomo', 'caja de 20'], usd: 150 },
        { brand: 'Norma', ref: 'Oryx .30-06 Sprg 180 gr', photo: 'img/product/norma-oryx-30-06-sprg-180-gr.webp', kind: 'Cartuchería metálica',
          spec: ['núcleo soldado', 'caja de 20'], usd: 125 },
        { brand: 'Sellier & Bellot', ref: '.308 Win 147 gr', photo: 'img/product/sellier-bellot-308-win-147-gr.webp', kind: 'Cartuchería de práctica',
          spec: ['FMJ', 'caja de 20'], usd: 50 },
        { brand: 'Lapua', ref: 'Scenar-L 6,5 Creedmoor 136 gr', photo: 'img/product/lapua-scenar-l-6-5-creedmoor-136-gr.webp', kind: 'Cartuchería match',
          spec: ['punta hueca', 'caja de 50'], usd: 185 },
        { brand: 'CCI', ref: 'Standard Velocity .22 LR 40 gr', photo: 'img/product/cci-standard-velocity-22-lr-40-gr.webp', kind: 'Cartuchería del 22',
          spec: ['plomo', 'caja de 50'], usd: 28 },
        { brand: 'Eley', ref: 'Tenex .22 LR 40 gr', photo: 'img/product/eley-tenex-22-lr-40-gr.webp', kind: 'Cartuchería match',
          spec: ['selección de lote', 'caja de 50'], usd: 58 },
        { brand: 'RIO', ref: 'Game Load BlueSteel cal. 12/70', photo: 'img/product/rio-game-load-bluesteel-cal-12-70.webp', kind: 'Cartuchería de caza',
          spec: ['acero 32 g', 'caja de 25'], usd: 22 },
        { brand: 'SAGA', ref: 'Heavy 34 cal. 12/70', photo: 'img/product/saga-heavy-34-cal-12-70.webp', kind: 'Cartuchería de caza',
          spec: ['plomo 34 g del 6', 'caja de 25'], usd: 24 },
        { brand: 'Fiocchi', ref: 'Golden Pheasant cal. 12/70', photo: 'img/product/fiocchi-golden-pheasant-cal-12-70.webp', kind: 'Cartuchería de caza',
          spec: ['plomo 36 g del 5', 'caja de 25'], usd: 41 },
        { brand: 'Winchester', ref: 'Super X cal. 12/76', photo: 'img/product/winchester-super-x-cal-12-76.webp', kind: 'Cartuchería de caza',
          spec: ['plomo 36 g del 4', 'caja de 25'], usd: 31 }
      ]
    },
    {
      id: 'accesorios', label: 'Accesorios', model: 'gcase', licence: null, seed: 7714,
      items: [
        { brand: 'Peli', ref: '1750 Protector', photo: 'img/product/peli-1750-protector.webp', kind: 'Maleta rígida',
          spec: ['128 cm', 'espuma precortada', 'purga de presión'], usd: 850 },
        { brand: 'Peli', ref: '1720 Protector', photo: 'img/product/peli-1720-protector.webp', kind: 'Maleta rígida',
          spec: ['107 cm', 'cierre estanco IP67'], usd: 720 },
        { brand: 'Negrini', ref: '1657', photo: 'img/product/negrini-1657.webp', kind: 'Maleta para superpuesta',
          spec: ['82 cm', 'forro de terciopelo'], usd: 530 },
        { brand: 'Plano', ref: 'All Weather 42"', photo: 'img/product/plano-all-weather-42.webp', kind: 'Maleta rígida',
          spec: ['107 cm', 'cierres de leva'], usd: 330 },
        { brand: 'Beretta', ref: 'Hunter Tech Rifle Case', photo: 'img/product/beretta-hunter-tech-rifle-case.webp', kind: 'Funda blanda',
          spec: ['130 cm', 'acolchado', 'bandolera'], usd: 165 },
        { brand: 'Beretta', ref: 'Uniform Pro EVO Field Bag', photo: 'img/product/beretta-uniform-pro-evo-field-bag.webp', kind: 'Bolsa de campo',
          spec: ['45 l', 'loneta encerada'], usd: 450 },
        { brand: 'Arregui', ref: 'Braco 5', photo: 'img/product/arregui-braco-5.webp', kind: 'Armero homologado',
          spec: ['5 plazas', 'grado I', 'anclaje a muro'], usd: 1130 },
        { brand: 'Rottner', ref: 'Gun 5 Cargo', photo: 'img/product/rottner-gun-5-cargo.webp', kind: 'Armero homologado',
          spec: ['5 plazas', 'cerradura electrónica'], usd: 910 },
        { brand: "Hoppe's", ref: 'No. 9 Deluxe Kit', photo: 'img/product/hoppe-s-no-9-deluxe-kit.webp', kind: 'Estuche de limpieza',
          spec: ['32 piezas', 'estuche de nogal'], usd: 140 },
        { brand: 'Otis', ref: 'Elite Cleaning System', photo: 'img/product/otis-elite-cleaning-system.webp', kind: 'Estuche de limpieza',
          spec: ['40 piezas', 'multicalibre'], usd: 430 }
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

  // BCRA vendedor 1.515 / MEP 1.528 / blue 1.540 el 12-08-2026: practicamente
  // unificados, asi que un solo numero sirve. Revisar al actualizar la lista.
  var ARS_POR_USD = 1520;

  var MONEDAS = {
    ars: { simbolo: '$', nombre: 'pesos', factor: ARS_POR_USD },
    usd: { simbolo: 'US$', nombre: 'dolares', factor: 1 }
  };

  var grupos = typeof Intl !== 'undefined'
    ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
    : { format: function (n) { return String(n); } };

  // Numero suelto: recuentos, existencias. No lleva moneda.
  function format(n) { return grupos.format(n); }

  // Un precio en dolares pasado a la moneda pedida. Se redondea despues de
  // convertir: en pesos los centavos no significan nada.
  function money(usd, code) {
    var m = MONEDAS[code] || MONEDAS.ars;
    return grupos.format(Math.round(usd * m.factor));
  }

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
            usd: item.usd,
            licence: item.licence || line.licence,
        // Foto propia del producto. Sin ella la ficha usa el render horneado;
        // ponerla no exige tocar codigo.
        photo: item.photo || null,
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

  var api = {
    LINES: LINES, PAGE: PAGE,
    MONEDAS: MONEDAS, ARS_POR_USD: ARS_POR_USD,
    rng: rng, build: build, page: page, filtered: filtered, counts: counts,
    format: format, money: money
  };

  global.GunShop = global.GunShop || {};
  global.GunShop.catalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
