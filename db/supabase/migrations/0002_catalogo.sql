-- 0002_catalogo.sql - regimen legal, catalogo y tipo de cambio.
--
-- Es db/schema.sql mudado a Supabase, no un modelo nuevo. Lo que cambia
-- respecto de aquel fichero se explica donde cambia. Tres cosas valen para
-- todas las migraciones y se dicen una sola vez aqui:
--
--   * Todo vive en `public`. El esquema `gunshop` de db/schema.sql no se
--     copia: fuera de `public` no hay permisos por defecto, hay que anadir el
--     esquema a la lista de expuestos del panel y cada tabla nueva nace muda.
--     Un solo esquema con RLS en todas las tablas es lo que se puede auditar
--     de un vistazo, que es de lo que depende que esto sea seguro.
--
--   * Ni `begin` ni `commit`. La CLI de Supabase envuelve cada migracion en
--     su transaccion; un `commit` aqui dentro cerraria la de fuera y dejaria
--     el resto del fichero suelto.
--
--   * Los estados van como `text` con `check`, no como `enum`. Anadir un
--     valor a un enum y usarlo no se puede hacer en la misma transaccion, asi
--     que cada estado nuevo serian dos migraciones. db/schema.sql ya estaba
--     dividido consigo mismo -- payment.status y work_order.status ya eran
--     text+check -- y aqui se toma la mitad que se mantiene sin ceremonia.
--
-- Minimo PostgreSQL 15, no 14: las vistas usan `security_invoker`, que es lo
-- que impide que una vista se salte la RLS de sus tablas. Supabase da 15 o 17.

-- Actualiza updated_at en cualquier tabla que tenga la columna. El
-- search_path fijo no es por seguridad -- no es definer -- sino porque el
-- linter de Supabase marca toda funcion que no lo lleve, y una excepcion
-- consentida es la que tapa la que importa.
create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ===========================================================================
-- 1. Regimen legal
-- ===========================================================================

-- Las cuatro etiquetas del art. 5 del decreto 395/75 tal como las usa la
-- ficha, mas 'libre', que es venta libre. Tabla y no enum porque la que
-- cambia cada pocos anos es la ley, y una fila se edita desde el panel.
--
-- `code` es unique y no solo por higiene: es a donde apunta la clave ajena de
-- order_item, y es lo que hace que una etiqueta desconocida REVIENTE en vez
-- de degradar a venta libre. Venta libre es una FILA, no la ausencia de una.
create table if not exists public.licence_regime (
  id                     smallint generated always as identity primary key,
  code                   text not null unique,
  label                  text not null,
  requires_clu           boolean not null default false,  -- Credencial de Legitimo Usuario
  requires_certification boolean not null default false,  -- profesional Ley 23.979
  requires_tccm          boolean not null default false,  -- Tarjeta de Consumo
  note                   text
);

comment on table public.licence_regime is
  'Que exige la ley para entregar una pieza. Espejo de REGIMEN en js/catalog.js.';

-- El cupo anual de municion se cuenta por calibre (Res. ANMaC 14/2025), asi
-- que el calibre tiene que ser una entidad y no una cadena suelta.
create table if not exists public.calibre (
  id            smallint generated always as identity primary key,
  name          text not null unique,          -- '.308 Win', 'cal. 12/70'
  bore_mm       numeric(4,2),
  smoothbore    boolean not null default false,
  rimfire       boolean not null default false,
  airgun        boolean not null default false,
  annual_quota  integer not null default 1000 check (annual_quota >= 0)
);

comment on column public.calibre.annual_quota is
  'Cartuchos por ano y calibre que admite la TCCM. 0 = no aplica (aire).';


-- ===========================================================================
-- 2. Catalogo
-- ===========================================================================

create table if not exists public.brand (
  id       smallint generated always as identity primary key,
  slug     text not null unique,
  name     text not null,
  country  text
);

create table if not exists public.family (
  id                smallint generated always as identity primary key,
  slug              text not null unique,      -- 'rifles', 'municion'
  name              text not null,
  model_key         text,                      -- pieza 3D de respaldo: 'rifle'
  -- NOT NULL, y esta es la linea mas importante del fichero. En db/schema.sql
  -- era nullable y catalog_reference resolvia el regimen con
  -- coalesce(producto, familia): con las dos nulas salia `null`, que la ficha
  -- pinta como «Venta libre». Es decir, una familia mal dada de alta se
  -- entregaba sin pedir la credencial. Con NOT NULL eso no se puede escribir.
  licence_regime_id smallint not null references public.licence_regime(id),
  position          smallint not null default 0
);

comment on column public.family.licence_regime_id is
  'Regimen por defecto de la familia. La ficha lo puede pisar; ausente, no.';

create table if not exists public.product (
  id                bigint generated always as identity primary key,
  brand_id          smallint not null references public.brand(id),
  family_id         smallint not null references public.family(id),
  ref               text not null,             -- 'B-14 Ridge'
  kind              text not null,             -- 'Rifle de cerrojo'
  spec              text[] not null default '{}',
  -- Aqui null si significa algo: «sin excepcion, el de la familia». Y la
  -- familia ya no puede ser nula, asi que el coalesce siempre resuelve.
  licence_regime_id smallint references public.licence_regime(id),
  usd_cents         integer not null check (usd_cents > 0),
  serialized        boolean not null default false,
  -- Cuantos cartuchos trae una caja. Vivia solo en porCaja() de js/catalog.js
  -- y la base no lo sabia: mientras la cesta era localStorage daba igual, pero
  -- en cuanto el navegador postea una linea de pedido, un `cartridges: 0`
  -- esquiva el cupo entero de la TCCM. Un cupo que el cliente puede poner a
  -- cero no es un cupo, asi que el numero vive aqui.
  cartridges_per_box integer not null default 0 check (cartridges_per_box >= 0),
  discontinued_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (brand_id, ref)
);

comment on column public.product.serialized is
  'Arma de fuego: cada unidad es una fila en firearm_unit, con serie y CUIM.';
comment on column public.product.usd_cents is
  'Precio en centavos de dolar, entero. Los pesos salen de fx_rate al mirar.';

drop trigger if exists product_touch on public.product;
create trigger product_touch before update on public.product
  for each row execute function public.touch_updated_at();

-- Una referencia de la tienda = producto x calibre. Es lo que se anade a la
-- cesta y lo que tiene existencias, no el producto.
create table if not exists public.product_variant (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.product(id) on delete cascade,
  -- La municion tampoco lo lleva nulo, aunque js/catalog.js no le ponga
  -- `cals`: el calibre esta escrito en la referencia y es de donde sale el
  -- cupo. Sin calibre no se puede contar, y lo que no se puede contar no se
  -- vende (ver public.reservar en 0008).
  calibre_id  smallint references public.calibre(id),
  sku         text not null unique,
  usd_cents   integer check (usd_cents > 0),   -- null = el del producto
  position    smallint not null default 0,
  unique (product_id, calibre_id)
);

comment on table public.product_variant is
  'Lo que la pagina llama referencia: un rifle en .308 y el mismo en .30-06 '
  'son dos, con existencias y precio propios.';

create table if not exists public.product_photo (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references public.product(id) on delete cascade,
  path         text not null,                  -- 'img/product/glock-17-gen5.webp'
  is_primary   boolean not null default false,
  source_url   text,
  licence_note text,                            -- 'CC BY-SA 4.0', 'sin aclarar'
  author       text
);

comment on table public.product_photo is
  'La tabla que hoy es img/product/CREDITS.md. La procedencia va con la foto '
  'porque sin ella no se sabe a quien pedir permiso. Si un dia las fotos se '
  'mudan a Storage, `path` pasa a ser la clave del objeto y no cambia nada '
  'mas: un bucket publico redistribuye igual que un repositorio publico, asi '
  'que lo que hay que arreglar antes sigue siendo la licencia, no el sitio.';

-- El precio efectivo, ya resuelto el override de la variante. Existe para que
-- el precio se calcule en un solo sitio: la ficha y la reserva tienen que
-- cobrar lo mismo.
drop view if exists public.variant_price;
create view public.variant_price
  with (security_invoker = on) as
  select v.id as variant_id,
         coalesce(v.usd_cents, p.usd_cents) as usd_cents
    from public.product_variant v
    join public.product p on p.id = v.product_id;


-- ===========================================================================
-- 3. Tipo de cambio
-- ===========================================================================

-- ARS_POR_USD de js/catalog.js, con historia: un pedido de hace tres meses
-- tiene que poder recalcularse al cambio que se le aplico entonces.
create table if not exists public.fx_rate (
  day          date primary key,
  ars_per_usd  numeric(12,4) not null check (ars_per_usd > 0),
  source       text
);

-- La cota de siete dias no es adorno. Sin ella, `order by day desc limit 1`
-- devuelve el ultimo cambio que haya, y si quien carga la cotizacion se muere
-- la tienda sigue vendiendo al cambio de hace tres semanas sin que nadie se
-- entere. En Argentina ese es el fallo caro. Con la cota, la vista se queda
-- vacia y la reserva falla diciendo que no hay cambio: un error visible.
drop view if exists public.fx_today;
create view public.fx_today
  with (security_invoker = on) as
  select ars_per_usd, day
    from public.fx_rate
   where day >= current_date - 7
   order by day desc
   limit 1;
