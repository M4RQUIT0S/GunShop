-- 0011_balas_cartuchos_recarga.sql - separa la bala del cartucho, y pone
-- producto y foto en las cinco ramas de recarga que 0010 dejo vacias.
--
-- 0010 metio los 15 productos de municion en «Cartuchos» de golpe, y eso
-- junta dos cosas que en una armeria argentina no se venden juntas ni se
-- guardan juntas:
--
--   Balas     municion metalica -- rifle y arma corta. La vaina va con la
--             punta engarzada y se pide por calibre (.308, 6,5 CM, .22 LR).
--   Cartuchos municion de escopeta -- la vaina de plastico con perdigon,
--             que se pide por calibre de anima y numero de perdigon (12/70
--             del 7½).
--
-- El criterio del reparto es el calibre, no el nombre comercial: todo lo de
-- 12/70 y 12/76 es cartucho de escopeta; el resto, bala.

-- ---------------------------------------------------------------------------
-- 1. Los cartuchos de escopeta se quedan; el resto baja a Balas
-- ---------------------------------------------------------------------------
update public.product p
   set family_id = (select id from public.family where slug = 'balas'),
       updated_at = now()
 where p.family_id = (select id from public.family where slug = 'cartuchos')
   and p.ref not like '%cal. 12/%';

-- El `kind` tambien cambia, y no es cosmetico: es el tercer nivel del menu y
-- la fila de chips del catalogo. Dejar «Cartucheria metalica» colgando de
-- «Balas» es volver a mezclar las dos palabras justo donde se acaban de
-- separar.
--
-- De paso caen los duplicados sin tilde que arrastraban los tres productos de
-- muestra de db/supabase/seed.sql ('Cartucheria de practica' y 'Cartucheria
-- del 22'): eran la misma subcategoria escrita de dos maneras, y salian dos
-- veces seguidas en el menu.

update public.product set kind = case kind
    when 'Cartuchería metálica'   then 'Bala de caza'
    when 'Cartuchería de práctica' then 'Bala de práctica'
    when 'Cartucheria de practica' then 'Bala de práctica'
    when 'Cartuchería del 22'      then 'Bala del 22'
    when 'Cartucheria del 22'      then 'Bala del 22'
    when 'Cartuchería match'       then 'Bala match'
    when 'Cartuchería sin plomo'   then 'Bala sin plomo'
    else kind
  end,
  updated_at = now()
 where family_id = (select id from public.family where slug = 'balas');

update public.product set kind = 'Cartucho de caza', updated_at = now()
 where family_id = (select id from public.family where slug = 'cartuchos')
   and kind <> 'Cartucho de caza';


-- ---------------------------------------------------------------------------
-- 2. Cada rama con su foto
-- ---------------------------------------------------------------------------
-- `model_key` apunta a public/img/model/<clave>.webp. Las seis nuevas las
-- bajo tools/fotos.py de Wikimedia Commons y son todas de licencia
-- redistribuible; la atribucion esta en public/img/model/creditos.json.
--
-- 0010 le habia puesto 'cartridge' a las ocho ramas por no tener otra cosa:
-- la foto de cartucheria metalica sobre «Polvoras» era sencillamente falsa.

update public.family set model_key = v.clave
  from (values
    ('balas',               'cartridge'),
    ('cartuchos',           'shotshell'),
    ('recarga',             'press'),
    ('recarga-accesorios',  'gauge'),
    ('recarga-equipos',     'press'),
    ('recarga-fulminantes', 'primer'),
    ('recarga-polvoras',    'powder'),
    ('recarga-puntas',      'bullet')
  ) as v(slug, clave)
 where public.family.slug = v.slug;


-- ---------------------------------------------------------------------------
-- 3. Marcas de recarga
-- ---------------------------------------------------------------------------
insert into public.brand (slug, name, country) values
  ('vihtavuori', 'Vihtavuori', 'FI'),
  ('alliant',    'Alliant Powder', 'US'),
  ('sierra',     'Sierra Bullets', 'US'),
  ('rcbs',       'RCBS', 'US')
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------------
-- 4. Producto para las cinco ramas de recarga
-- ---------------------------------------------------------------------------
-- `cartridges_per_box` va a 0 en todo, incluidos los fulminantes que vienen
-- en cajas de mil: esa columna es el cupo anual de la TCCM contado en
-- CARTUCHOS, y un fulminante suelto no es un cartucho. Ponerle 1000 le
-- comeria a un cliente el cupo entero de municion por comprar cebos.
--
-- El regimen se hereda de la familia (`requiere-tccm`) en las cinco, tambien
-- en prensas, dados y comparadores, que son herramienta y no material
-- controlado. Es a proposito, no un descuido: una herramienta marcada de mas
-- se corrige con un update; polvora marcada de menos se entrega sin pedir la
-- credencial. Si la armeria confirma que las de taller van libres, se pisa el
-- regimen producto a producto, que es justo para lo que existe
-- product.licence_regime_id.

insert into public.product (brand_id, family_id, ref, kind, spec, licence_regime_id,
                            usd_cents, serialized, cartridges_per_box)
select b.id, f.id, v.ref, v.kind, v.spec, null, v.usd_cents, false, 0
  from (values
    ('vihtavuori', 'recarga-polvoras',    'N140 (bote de 1 lb)',
       'Pólvora de rifle',       array['Progresiva','.308 Win y 6,5 Creedmoor','454 g'],  6500),
    ('alliant',    'recarga-polvoras',    'Unique (bote de 1 lb)',
       'Pólvora de escopeta',    array['Vivaz','Escopeta y arma corta','454 g'],          4800),
    ('cci',        'recarga-fulminantes', '200 Large Rifle (caja de 1.000)',
       'Fulminante de rifle',    array['Boxer','Large rifle','1.000 unidades'],           9000),
    ('federal',    'recarga-fulminantes', '210M Gold Medal Match (caja de 1.000)',
       'Fulminante match',       array['Boxer','Large rifle match','1.000 unidades'],    12000),
    ('sierra',     'recarga-puntas',      'MatchKing .308" 168 gr (caja de 100)',
       'Punta match',            array['HPBT','.308 pulgadas','100 unidades'],            6800),
    ('hornady',    'recarga-puntas',      'ELD-X 6,5 mm 143 gr (caja de 100)',
       'Punta de caza',          array['Punta polimero','6,5 mm','100 unidades'],         7500),
    ('rcbs',       'recarga-equipos',     'Rock Chucker Supreme',
       'Prensa monoestación',    array['Fundicion de hierro','Rosca 7/8-14','Palanca larga'], 32000),
    ('hornady',    'recarga-equipos',     'Lock-N-Load AP',
       'Prensa progresiva',      array['Cinco estaciones','Cambio rapido de dados','Alimentador de vainas'], 78000),
    ('rcbs',       'recarga-accesorios',  'Juego de dados .308 Win',
       'Juego de dados',         array['Recalibrado y engarce','Rosca 7/8-14','Dos cuerpos'], 8500),
    ('rcbs',       'recarga-accesorios',  'Balanza mecánica 505',
       'Balanza de recarga',     array['Hasta 511 grains','Precision 0,1 grain','Amortiguacion magnetica'], 9500)
  ) as v(marca, familia, ref, kind, spec, usd_cents)
  join public.brand b on b.slug = v.marca
  join public.family f on f.slug = v.familia
on conflict (brand_id, ref) do nothing;
