-- 0010_familias_anidadas.sql - la familia deja de ser una lista y pasa a ser
-- un arbol, y Municion estrena el suyo.
--
-- Hasta aqui el catalogo tenia dos niveles: familia (`family`) y subcategoria
-- (`product.kind`). Municion necesita tres -- Municion > Recarga > Polvoras --
-- y el segundo nivel no vale: `kind` es una etiqueta suelta del producto, no
-- una categoria con hijos.
--
-- Se resuelve con una columna, no con una tabla nueva: `family.parent_id`
-- apuntando a la propia `family`. La ventaja no es escribir menos SQL, es que
-- `family` YA tiene su politica de RLS y su `grant select` de 0006 -- una
-- tabla nueva llegaria sin ninguna de las dos, y una tabla de catalogo sin
-- RLS queda legible con la clave que viaja en el HTML.
--
-- `on delete restrict` y no `cascade`: borrar «Recarga» no puede llevarse por
-- delante sus cinco hijas en silencio. Que falle y se mire.

alter table public.family
  add column if not exists parent_id smallint references public.family(id) on delete restrict;

comment on column public.family.parent_id is
  'Familia madre. NULL = familia raiz: las que salen en las baldosas de la portada y en los chips del catalogo.';

-- El menu pide los hijos de una familia ordenados; sin esto es un seq scan
-- por cada nivel que se abre.
create index if not exists family_parent_idx on public.family (parent_id, position);


-- ---------------------------------------------------------------------------
-- El arbol de Municion
-- ---------------------------------------------------------------------------
-- Las ocho ramas heredan el regimen de Municion (`requiere-tccm`) a
-- proposito, incluidas las de recarga que a primera vista no son munición:
-- polvora y fulminantes lo son sin discusion, y para puntas, equipos y
-- accesorios errar del lado estricto significa que un producto futuro tenga
-- que pisar el regimen a mano para venderse libre. Al reves -- ponerlas
-- `libre` por defecto -- significa entregar sin pedir la credencial el dia
-- que alguien cargue polvora en la rama equivocada.
--
-- `model_key` = 'cartridge' en todas: es la unica foto generica que hay para
-- munición, y la cascada de public/img/product manda igualmente.

insert into public.family (slug, name, model_key, licence_regime_id, position, parent_id)
select v.slug, v.name, 'cartridge', m.licence_regime_id, v.position, m.id
  from (values
    ('balas',     'Balas',     1::smallint),
    ('cartuchos', 'Cartuchos', 2),
    ('recarga',   'Recarga',   3)
  ) as v(slug, name, position)
  cross join public.family m
 where m.slug = 'municion'
on conflict (slug) do nothing;

insert into public.family (slug, name, model_key, licence_regime_id, position, parent_id)
select v.slug, v.name, 'cartridge', r.licence_regime_id, v.position, r.id
  from (values
    ('recarga-accesorios',  'Accesorios',  1::smallint),
    ('recarga-equipos',     'Equipos',     2),
    ('recarga-fulminantes', 'Fulminantes', 3),
    ('recarga-polvoras',    'Pólvoras',    4),
    ('recarga-puntas',      'Puntas',      5)
  ) as v(slug, name, position)
  cross join public.family r
 where r.slug = 'recarga'
on conflict (slug) do nothing;

-- Los slugs de las cinco llevan prefijo porque `accesorios` ya es una familia
-- raiz (fundas, armeros) y `family.slug` es unico. El rotulo que se lee en el
-- menu es `name`, que si puede repetirse.


-- ---------------------------------------------------------------------------
-- Los productos de Municion bajan a Cartuchos
-- ---------------------------------------------------------------------------
-- Los 15 que hay hoy son cartucheria, todos. Municion pasa a ser rama y deja
-- de tener producto propio: quien pida `?familia=municion` los ve igual, pero
-- porque la app suma la rama entera, no porque cuelguen de la raiz.
--
-- Idempotente por construccion: a la segunda pasada ya no queda ninguno en
-- 'municion' y el update no toca nada.

update public.product p
   set family_id = (select id from public.family where slug = 'cartuchos'),
       updated_at = now()
 where p.family_id = (select id from public.family where slug = 'municion');
