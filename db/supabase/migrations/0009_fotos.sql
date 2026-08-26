-- 0009_fotos.sql - enlaza cada producto con su fotografia.
--
-- Las rutas NO se derivan del nombre. Se probo: de 18 productos tres no
-- casaban. Uno tiene el slug de marca distinto ('sellier' contra
-- 'sellier-bellot'), otro no tiene foto, y el tercero solo tenia la de OTRO
-- producto de la misma marca -- un .308 de 150 gr donde el catalogo pide un
-- .22 de 40 gr. Derivar habria colgado esa foto ajena sin que se notase, que
-- es justo el fallo que el selftest del sitio viejo existia para cazar. Van
-- escritas y comprobadas contra el disco una a una.
--
-- Los dos productos sin fotografia se quedan sin fila a proposito: la ficha
-- ensena "Sin fotografia", que es cierto, en vez de la foto de otro.
--
-- `licence_note` dice la verdad: son fotos de catalogo de fabricante o de
-- distribuidor, sin aclarar para redistribuir. La columna existe para saber a
-- quien hay que pedir permiso antes de que esto salga a produccion.
--
-- Idempotente: la clave natural es (product_id, path).

create unique index if not exists product_photo_producto_ruta
  on public.product_photo (product_id, path);

insert into public.product_photo (product_id, path, is_primary, licence_note)
select p.id, v.path, true, 'sin aclarar: foto de fabricante o distribuidor'
  from (values
    ('aimpoint', $$Acro P-2 3,5 MOA$$, 'img/product/aimpoint-acro-p-2-3-5-moa.webp'),
    ('anschutz', $$1761 HB$$, 'img/product/anschutz-1761-hb.webp'),
    ('aya', $$No. 1 De Luxe$$, 'img/product/aya-no-1-de-luxe.webp'),
    ('beretta', $$686 Silver Pigeon I$$, 'img/product/beretta-686-silver-pigeon-i.webp'),
    ('beretta', $$A400 Xtreme Plus$$, 'img/product/beretta-a400-xtreme-plus.webp'),
    ('bergara', $$B-14 Ridge$$, 'img/product/bergara-b-14-ridge.webp'),
    ('glock', $$17 Gen5$$, 'img/product/glock-17-gen5.webp'),
    ('hornady', $$Superformance .30-06 Sprg 165 gr$$, 'img/product/hornady-superformance-30-06-sprg-165-gr.webp'),
    ('leupold', $$VX-3HD 3,5-10x50$$, 'img/product/leupold-vx-3hd-3-5-10x50.webp'),
    ('negrini', $$1657$$, 'img/product/negrini-1657.webp'),
    ('otis', $$Elite Cleaning System$$, 'img/product/otis-elite-cleaning-system.webp'),
    ('pardini', $$SP$$, 'img/product/pardini-sp.webp'),
    ('swarovski', $$Z8i 2-16x50 P$$, 'img/product/swarovski-z8i-2-16x50-p.webp'),
    ('tikka', $$T3x Lite$$, 'img/product/tikka-t3x-lite.webp'),
    ('walther', $$LP500 Expert$$, 'img/product/walther-lp500-expert.webp'),
    ('sellier', $$Practica .308 Win 147 gr$$, 'img/product/sellier-bellot-308-win-147-gr.webp')
  ) as v(marca, ref, path)
  join public.brand b on b.slug = v.marca
  join public.product p on p.brand_id = b.id and p.ref = v.ref
on conflict (product_id, path) do nothing;
