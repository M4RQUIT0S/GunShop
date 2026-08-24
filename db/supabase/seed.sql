-- seed.sql - lo minimo para que la base sirva de algo nada mas crearla.
--
-- Esto NO es el volcado del catalogo. Los 76 productos y las 102 referencias
-- los sigue generando `node tools/seed.js` a partir de js/catalog.js, que es
-- la unica fuente: un catalogo escrito dos veces son dos catalogos. Aqui hay
-- tres productos por familia, los suficientes para probar una venta entera de
-- cada tipo -- arma serializada, municion con cupo y accesorio de venta libre.
--
-- Es idempotente. Pasarlo dos veces no duplica nada: todas las claves son
-- `identity`, asi que no se escriben ids a mano y cada insercion entra por su
-- clave natural (`code`, `slug`, `name`, `sku`) con `on conflict do nothing`.
-- Eso tambien significa que no se puede depender del valor de un id: se
-- resuelve con una subconsulta, siempre.


-- ===========================================================================
-- 1. Regimen legal (art. 5 del decreto 395/75)
-- ===========================================================================
--
-- Espejo exacto de REGIMEN en js/catalog.js. Si aqui dice una cosa y alli
-- otra, la pagina y la base entregarian bajo leyes distintas.
--
-- Los codigos son LOS MISMOS que emite `tools/seed.js`, con guiones y no con
-- rayas bajas, y `libre` y no `venta_libre`. No es cosmetico: el volcado
-- completo de los 76 productos une por `lr.code = v.licence`, asi que con
-- otros codigos ese volcado no encontraria ni una familia. Dos sitios que
-- nombran la ley por su cuenta acaban diciendo cosas distintas, y este es
-- justo el sitio donde no puede pasar.
--
-- Ojo con `requiere-tccm`: exige CLU y TCCM pero NO certificacion. Es lo que
-- dice REGIMEN en js/catalog.js, y ponerle certificacion aqui haria que la
-- base pidiese un papel que la ley no pide.
--
-- `libre` es una fila y no la ausencia de fila: en db/schema.sql el
-- regimen nulo se pintaba como «Venta libre», asi que una familia mal dada de
-- alta se entregaba sin pedir credencial. Aqui la FK es NOT NULL y para
-- vender sin papeles hay que decirlo con todas las letras.

insert into public.licence_regime (code, label, requires_clu, requires_certification, requires_tccm, note) values
  ('libre',                 'Venta libre',           false, false, false, 'Optica y accesorios: no hay requisito.'),
  ('uso-civil',             'Uso civil',             true,  false, false, 'Escopetas tiro a tiro, rifles y pistolas del .22'),
  ('uso-civil-condicional', 'Uso civil condicional', true,  true,  false, 'Calibres mayores y toda semiautomatica; certificacion Ley 23.979'),
  ('aire-comprimido',       'Aire comprimido',       false, false, false, 'Pistolas de 4,5 mm; no son armas de fuego'),
  ('requiere-tccm',         'Requiere TCCM',         true,  false, true,  'Municion: Tarjeta de Consumo atada a un arma registrada')
on conflict (code) do nothing;


-- ===========================================================================
-- 2. Calibres y su cupo anual (Res. ANMaC 14/2025)
-- ===========================================================================
--
-- 1.000 cartuchos por calibre, y 2.500 en anima lisa y en .22 LR. Es la misma
-- regla que topeTccm() en js/catalog.js.
-- El 4,5 mm va a 0 a proposito: el aire comprimido no consume cupo porque no
-- es municion, y un 0 lo dice mas claro que un nulo.

insert into public.calibre (name, bore_mm, smoothbore, rimfire, airgun, annual_quota) values
  ('.22 LR',         5.60, false, true,  false, 2500),
  ('.223 Rem',       5.70, false, false, false, 1000),
  ('.308 Win',       7.82, false, false, false, 1000),
  ('.30-06 Sprg',    7.82, false, false, false, 1000),
  ('.300 Win Mag',   7.82, false, false, false, 1000),
  ('6,5 Creedmoor',  6.71, false, false, false, 1000),
  ('8x57 IS',        8.20, false, false, false, 1000),
  ('9,3x62',         9.30, false, false, false, 1000),
  ('9 mm Pb',        9.02, false, false, false, 1000),
  ('cal. 12/70',    18.50, true,  false, false, 2500),
  ('cal. 12/76',    18.50, true,  false, false, 2500),
  ('cal. 12/89',    18.50, true,  false, false, 2500),
  ('cal. 20/70',    15.60, true,  false, false, 2500),
  ('4,5 mm',         4.50, false, false, true,     0)
on conflict (name) do nothing;


-- ===========================================================================
-- 3. Familias
-- ===========================================================================
--
-- `model_key` es la pieza del esquema de respaldo de js/scene.js, y los slugs
-- son los mismos ids de LINES en js/catalog.js: es lo que permite comparar el
-- catalogo de la pagina con el de la base sin traducir nada.

insert into public.family (slug, name, model_key, licence_regime_id, position)
select v.slug, v.name, v.model_key, r.id, v.position
  from (values
    ('rifles',     'Rifles',     'rifle',     'uso-civil-condicional', 1::smallint),
    ('escopetas',  'Escopetas',  'shotgun',   'uso-civil',      2),
    ('pistolas',   'Pistolas',   'pistol',    'uso-civil-condicional', 3),
    ('optica',     'Optica',     'optic',     'libre',    4),
    ('municion',   'Municion',   'cartridge', 'requiere-tccm',  5),
    ('accesorios', 'Accesorios', 'gcase',     'libre',    6)
  ) as v(slug, name, model_key, regimen, position)
  join public.licence_regime r on r.code = v.regimen
on conflict (slug) do nothing;


-- ===========================================================================
-- 4. Marcas
-- ===========================================================================

insert into public.brand (slug, name, country) values
  ('bergara',    'Bergara',       'ES'),
  ('tikka',      'Tikka',         'FI'),
  ('anschutz',   'Anschutz',      'DE'),
  ('beretta',    'Beretta',       'IT'),
  ('browning',   'Browning',      'BE'),
  ('aya',        'AyA',           'ES'),
  ('pardini',    'Pardini',       'IT'),
  ('walther',    'Walther',       'DE'),
  ('glock',      'Glock',         'AT'),
  ('leupold',    'Leupold',       'US'),
  ('swarovski',  'Swarovski',     'AT'),
  ('aimpoint',   'Aimpoint',      'SE'),
  ('hornady',    'Hornady',       'US'),
  ('sellier',    'Sellier & Bellot', 'CZ'),
  ('federal',    'Federal',       'US'),
  ('pelican',    'Pelican',       'US'),
  ('negrini',    'Negrini',       'IT'),
  ('otis',       'Otis',          'US')
on conflict (slug) do nothing;


-- ===========================================================================
-- 5. Productos
-- ===========================================================================
--
-- `serialized` es la linea que separa los dos mundos del inventario: lo que
-- lleva numero de serie y CUIM se cuenta por filas en firearm_unit, y lo que
-- no, por saldo en stock_level. Armas si; municion, optica y fundas, no.
--
-- `licence_regime_id` va nulo cuando la familia ya dice lo correcto, y solo se
-- escribe en las excepciones: el .22 dentro de rifles, y la semiautomatica
-- dentro de escopetas. Es el mismo reparto que `licence:` en js/catalog.js.

insert into public.product (brand_id, family_id, ref, kind, spec, licence_regime_id,
                            usd_cents, serialized, cartridges_per_box)
select b.id, f.id, v.ref, v.kind, v.spec,
       (select r.id from public.licence_regime r where r.code = v.regimen),
       v.usd_cents, v.serialized, v.cartuchos
  from (values
    -- rifles
    ('bergara',  'rifles',     'B-14 Ridge',            'Rifle de cerrojo',      array['canon 560 mm','3,2 kg'],            null,        191000, true,  0),
    ('tikka',    'rifles',     'T3x Lite',              'Rifle de cerrojo',      array['canon 570 mm','2,9 kg'],            null,        210000, true,  0),
    ('anschutz', 'rifles',     '1761 HB',               'Rifle del 22',          array['canon 560 mm','gatillo ajustable'], 'uso-civil', 280000, true,  0),
    -- escopetas
    ('aya',      'escopetas',  'No. 1 De Luxe',         'Paralela - Eibar',      array['canon 710 mm','grabado a mano'],    null,        830000, true,  0),
    ('beretta',  'escopetas',  '686 Silver Pigeon I',   'Superpuesta de caza',   array['canon 710 mm','5 chokes'],          null,        370000, true,  0),
    ('beretta',  'escopetas',  'A400 Xtreme Plus',      'Semiautomatica',        array['canon 760 mm','Kick-Off'],          'uso-civil-condicional', 340000, true, 0),
    -- pistolas
    ('glock',    'pistolas',   '17 Gen5',               'Pistola de servicio',   array['canon 114 mm','625 g'],             null,        120000, true,  0),
    ('pardini',  'pistolas',   'SP',                    'Pistola de precision',  array['canon 152 mm','gatillo 1.000 g'],   'uso-civil', 320000, true,  0),
    ('walther',  'pistolas',   'LP500 Expert',          'Pistola de aire',       array['gatillo 500 g','960 g'],            'aire-comprimido', 340000, true, 0),
    -- optica
    ('leupold',  'optica',     'VX-3HD 3,5-10x50',      'Visor de caza',         array['reticula Duplex','470 g'],          null,        154000, false, 0),
    ('swarovski','optica',     'Z8i 2-16x50 P',         'Visor de caza',         array['reticula 4A-I','630 g'],            null,        790000, false, 0),
    ('aimpoint', 'optica',     'Acro P-2 3,5 MOA',      'Punto rojo',            array['cierre estanco','60 g'],            null,         79000, false, 0),
    -- municion
    ('hornady',  'municion',   'Superformance .30-06 Sprg 165 gr', 'Cartucheria de caza',    array['SST','caja de 20'], null,  6800, false, 20),
    ('sellier',  'municion',   'Practica .308 Win 147 gr',         'Cartucheria de practica',array['FMJ','caja de 20'], null,  5000, false, 20),
    ('federal',  'municion',   'Champion .22 LR 40 gr',            'Cartucheria del 22',     array['LRN','caja de 50'], null,  1200, false, 50),
    -- accesorios
    ('pelican',  'accesorios', 'Vault V730',            'Maleta para rifle',     array['131 cm','espuma'],                  null,         28000, false, 0),
    ('negrini',  'accesorios', '1657',                  'Maleta para superpuesta', array['82 cm','forro de terciopelo'],    null,         80560, false, 0),
    ('otis',     'accesorios', 'Elite Cleaning System', 'Equipo de limpieza',    array['multicalibre','40 piezas'],         null,         21000, false, 0)
  ) as v(marca, familia, ref, kind, spec, regimen, usd_cents, serialized, cartuchos)
  join public.brand  b on b.slug = v.marca
  join public.family f on f.slug = v.familia
on conflict (brand_id, ref) do nothing;


-- ===========================================================================
-- 6. Referencias
-- ===========================================================================
--
-- Un mismo rifle en dos calibres son dos referencias, no un rifle con una
-- lista: es lo que se reserva, lo que tiene existencia y lo que lleva numero
-- de serie. El SKU se compone para que sea legible en un albaran.

insert into public.product_variant (product_id, calibre_id, sku, usd_cents, position)
select p.id, c.id,
       upper(b.slug || '-' || regexp_replace(v.ref, '[^a-zA-Z0-9]+', '', 'g') || '-' ||
             regexp_replace(v.calibre, '[^a-zA-Z0-9]+', '', 'g')),
       null, v.position
  from (values
    ('bergara',  'B-14 Ridge',   '.308 Win',      1::smallint),
    ('bergara',  'B-14 Ridge',   '.30-06 Sprg',   2),
    ('tikka',    'T3x Lite',     '.308 Win',      1),
    ('tikka',    'T3x Lite',     '.300 Win Mag',  2),
    ('anschutz', '1761 HB',      '.22 LR',        1),
    ('aya',      'No. 1 De Luxe','cal. 12/70',    1),
    ('aya',      'No. 1 De Luxe','cal. 20/70',    2),
    ('beretta',  '686 Silver Pigeon I', 'cal. 12/76', 1),
    ('beretta',  'A400 Xtreme Plus',    'cal. 12/89', 1),
    ('glock',    '17 Gen5',      '9 mm Pb',       1),
    ('pardini',  'SP',           '.22 LR',        1),
    ('walther',  'LP500 Expert', '4,5 mm',        1),
    ('hornady',  'Superformance .30-06 Sprg 165 gr', '.30-06 Sprg', 1),
    ('sellier',  'Practica .308 Win 147 gr',        '.308 Win',     1),
    ('federal',  'Champion .22 LR 40 gr',           '.22 LR',       1)
  ) as v(marca, ref, calibre, position)
  join public.brand   b on b.slug = v.marca
  join public.product p on p.brand_id = b.id and p.ref = v.ref
  join public.calibre c on c.name = v.calibre
on conflict (product_id, calibre_id) do nothing;

-- Lo que no tiene calibre -- optica y accesorios -- tambien es una referencia:
-- si no, no se puede meter en la cesta ni tener existencia.
insert into public.product_variant (product_id, calibre_id, sku, usd_cents, position)
select p.id, null,
       upper(b.slug || '-' || regexp_replace(p.ref, '[^a-zA-Z0-9]+', '', 'g')),
       null, 1
  from public.product p
  join public.brand  b on b.id = p.brand_id
  join public.family f on f.id = p.family_id
 where f.slug in ('optica', 'accesorios')
on conflict do nothing;


-- ===========================================================================
-- 7. Donde estan las cosas, y a como esta el dolar
-- ===========================================================================

insert into public.location (slug, name, kind) values
  ('mostrador', 'Armeria Alcantara - Balvanera', 'shop'),
  ('deposito',  'Deposito',                      'warehouse')
on conflict (slug) do nothing;

-- Sin cotizacion no se puede reservar: crear_pedido() para en seco antes de
-- tocar el inventario. Es el unico numero que hay que mover cuando cambia el
-- tipo de cambio, igual que ARS_POR_USD en js/catalog.js.
insert into public.fx_rate (day, ars_per_usd, source)
values (current_date, 1520.0000, 'semilla')
on conflict (day) do nothing;


-- ===========================================================================
-- 8. Existencias de prueba
-- ===========================================================================
--
-- Las armas entran una a una con numero de serie de prueba; lo demas, por
-- asiento. El asiento es la unica forma de mover un saldo: stock_level lo
-- mantiene el disparador de 0003 y no se escribe a mano.
--
-- Los numeros de serie llevan el prefijo PRUEBA a proposito. Si un dia esta
-- semilla acaba en una base de verdad, un `select ... like 'PRUEBA%'` los
-- encuentra todos.

insert into public.firearm_unit (variant_id, location_id, serial, status, acquired_at)
select v.id, l.id, 'PRUEBA-' || v.sku || '-' || n, 'in_stock', current_date - 30
  from public.product_variant v
  join public.product p on p.id = v.product_id
  join public.location l on l.slug = 'mostrador'
  cross join generate_series(1, 2) as n
 where p.serialized
on conflict (variant_id, serial) do nothing;

-- Municion, optica y accesorios: doce unidades de cada una, por asiento de
-- compra. `where not exists` y no `on conflict`, porque un asiento no tiene
-- clave natural: dos compras iguales del mismo dia son dos asientos legitimos,
-- y lo unico que hace idempotente a esto es no repetir el de la semilla.
insert into public.stock_move (variant_id, location_id, qty, reason, ref, actor)
select v.id, l.id, 12, 'purchase', 'SEMILLA', 'semilla'
  from public.product_variant v
  join public.product p on p.id = v.product_id
  join public.location l on l.slug = 'mostrador'
 where not p.serialized
   and not exists (select 1 from public.stock_move m
                    where m.variant_id = v.id and m.ref = 'SEMILLA');
