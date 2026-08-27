-- schema.sql - la base de datos de la armeria. PostgreSQL 14 o mas.
--
-- La pagina de hoy es estatica y no habla con esto: el catalogo vive en
-- js/catalog.js y la cesta en localStorage. Este fichero es el sitio al que
-- se mudan cuando haya servidor, y esta escrito para que esa mudanza no
-- obligue a repensar el modelo:
--
--   js/catalog.js  LINES        ->  family
--                  items        ->  brand + product
--                  cals[]       ->  product_variant (una por calibre)
--                  licence      ->  licence_regime
--                  usd          ->  product.usd_cents + fx_rate
--   localStorage   cesta        ->  cart + cart_item
--                  cuenta       ->  customer + credential
--                  pedidos      ->  sales_order + order_item
--
-- Reglas que se han seguido:
--
--   * El dinero es entero de centavos de dolar, nunca float. Los pesos salen
--     de fx_rate en el momento de mirar, y el pedido se queda con el cambio
--     que se le aplico.
--   * Cada arma de fuego es una FILA, no una cantidad: lleva numero de serie
--     y CUIM, y ANMaC pregunta por ella una a una. Lo que no se serializa
--     -- municion, optica, fundas -- va por cantidad en stock_level.
--   * Las existencias se llevan por asiento (stock_move) y stock_level es
--     solo el saldo, mantenido por disparador. Un inventario que se edita a
--     mano no se puede auditar, y aqui la auditoria es obligatoria.
--   * Nada se borra: se marca. Las armas dejan rastro.
--
-- Aplicar:  psql -d gunshop -f db/schema.sql  &&  psql -d gunshop -f db/seed.sql

begin;


create schema if not exists gunshop;
set search_path = gunshop, public;

-- Actualiza updated_at en cualquier tabla que tenga la columna.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ===========================================================================
-- 1. Regimen legal
-- ===========================================================================

-- Las cuatro etiquetas del art. 5 del decreto 395/75 tal como las usa la
-- ficha, mas la ausencia de etiqueta, que es venta libre. Es tabla y no enum
-- porque la que cambia cada pocos anos es la ley, y una fila se edita sin
-- reescribir un tipo.
create table licence_regime (
  id                    smallint generated always as identity primary key,
  code                  text not null unique,
  label                 text not null,
  requires_clu          boolean not null default false,  -- Credencial de Legitimo Usuario
  requires_certification boolean not null default false, -- profesional Ley 23.979
  requires_tccm         boolean not null default false,  -- Tarjeta de Consumo
  note                  text
);

comment on table licence_regime is
  'Que exige la ley para entregar una pieza. Espejo de REGIMEN en js/catalog.js.';

-- El cupo anual de municion se cuenta por calibre (Res. ANMaC 14/2025), asi
-- que el calibre tiene que ser una entidad y no una cadena suelta.
create table calibre (
  id            smallint generated always as identity primary key,
  name          text not null unique,          -- '.308 Win', 'cal. 12/70'
  bore_mm       numeric(4,2),                  -- 7.82, 18.53
  smoothbore    boolean not null default false,
  rimfire       boolean not null default false,
  airgun        boolean not null default false,
  annual_quota  integer not null default 1000  -- 2500 en anima lisa y .22 LR
    check (annual_quota >= 0)
);

comment on column calibre.annual_quota is
  'Cartuchos por ano y calibre que admite la TCCM. 0 = no aplica.';


-- ===========================================================================
-- 2. Catalogo
-- ===========================================================================

create table brand (
  id        smallint generated always as identity primary key,
  slug      text not null unique,
  name      text not null,
  country   text
);

create table family (
  id                smallint generated always as identity primary key,
  slug              text not null unique,       -- 'rifles', 'municion'
  name              text not null,
  model_key         text,                       -- pieza 3D de respaldo: 'rifle'
  licence_regime_id smallint references licence_regime(id),
  position          smallint not null default 0
);

comment on column family.licence_regime_id is
  'Regimen por defecto de la familia. La ficha lo puede pisar.';

create table product (
  id                bigint generated always as identity primary key,
  brand_id          smallint not null references brand(id),
  family_id         smallint not null references family(id),
  ref               text not null,              -- 'B-14 Ridge'
  kind              text not null,              -- 'Rifle de cerrojo'
  spec              text[] not null default '{}',
  licence_regime_id smallint references licence_regime(id),  -- excepcion
  usd_cents         integer not null check (usd_cents > 0),
  serialized        boolean not null default false,
  discontinued_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (brand_id, ref)
);

comment on column product.serialized is
  'Arma de fuego: cada unidad es una fila en firearm_unit, con serie y CUIM.';
comment on column product.usd_cents is
  'Precio en centavos de dolar. Los pesos salen de fx_rate al mirarlos.';

create trigger product_touch before update on product
  for each row execute function touch_updated_at();

-- Una referencia de la tienda = producto x calibre. Es lo que se anade a la
-- cesta y lo que tiene existencias, no el producto.
create table product_variant (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references product(id) on delete cascade,
  calibre_id    smallint references calibre(id),
  sku           text not null unique,
  usd_cents     integer check (usd_cents > 0),   -- null = el del producto
  position      smallint not null default 0,
  unique (product_id, calibre_id)
);

comment on table product_variant is
  'Lo que la pagina llama referencia: un rifle en .308 y el mismo en .30-06 '
  'son dos, con existencias y precio propios.';

-- El precio efectivo, ya resuelto el override de la variante.
create view variant_price as
  select v.id as variant_id,
         coalesce(v.usd_cents, p.usd_cents) as usd_cents
    from product_variant v
    join product p on p.id = v.product_id;

create table product_photo (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references product(id) on delete cascade,
  path         text not null,                  -- 'img/product/glock-17-gen5.webp'
  is_primary   boolean not null default false,
  source_url   text,                           -- de donde salio
  licence_note text,                           -- 'CC BY-SA 4.0', 'sin aclarar'
  author       text
);

-- Una sola foto principal por producto.
create unique index product_photo_primary
  on product_photo (product_id) where is_primary;

comment on table product_photo is
  'La tabla que hoy es img/product/CREDITS.md. La procedencia va con la foto '
  'porque sin ella no se sabe a quien pedir permiso.';


-- ===========================================================================
-- 3. Existencias
-- ===========================================================================

create table location (
  id     smallint generated always as identity primary key,
  slug   text not null unique,
  name   text not null,
  kind   text not null default 'shop'
    check (kind in ('shop', 'warehouse', 'workshop', 'supplier', 'customer'))
);

create type firearm_status as enum (
  'incoming',     -- pedida al distribuidor
  'in_stock',     -- en vitrina
  'reserved',     -- con reserva de un cliente
  'in_workshop',  -- ajuste, puesta a cero
  'sold',         -- entregada
  'returned',
  'scrapped'
);

-- Cada arma de fuego, una fila. El CUIM lo asigna ANMaC y llega despues de
-- la compra, asi que nace nulo.
create table firearm_unit (
  id           bigint generated always as identity primary key,
  variant_id   bigint not null references product_variant(id),
  location_id  smallint not null references location(id),
  serial       text not null,
  cuim         text unique,
  status       firearm_status not null default 'incoming',
  acquired_at  date,
  cost_cents   integer check (cost_cents >= 0),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (variant_id, serial)
);

create index firearm_unit_disponible
  on firearm_unit (variant_id) where status = 'in_stock';

create trigger firearm_unit_touch before update on firearm_unit
  for each row execute function touch_updated_at();

-- Lo que no se serializa se cuenta. El saldo lo mantiene el disparador de
-- stock_move; escribir aqui a mano es lo que hace que un inventario mienta.
create table stock_level (
  variant_id   bigint not null references product_variant(id),
  location_id  smallint not null references location(id),
  -- Un saldo negativo no existe en una vitrina: si sale, es que se vendio
  -- algo que no habia. Mejor que reviente el asiento a que la cifra mienta.
  on_hand      integer not null default 0 check (on_hand >= 0),
  reserved     integer not null default 0 check (reserved >= 0),
  primary key (variant_id, location_id)
);

create type stock_reason as enum (
  'purchase', 'sale', 'reservation', 'release',
  'return', 'adjustment', 'transfer', 'loss'
);

create table stock_move (
  id           bigint generated always as identity primary key,
  variant_id   bigint not null references product_variant(id),
  location_id  smallint not null references location(id),
  unit_id      bigint references firearm_unit(id),
  qty          integer not null check (qty <> 0),   -- negativo = salida
  reason       stock_reason not null,
  ref          text,                                -- codigo de pedido, factura
  actor        text,
  at           timestamptz not null default now()
);

create index stock_move_variante on stock_move (variant_id, at desc);

-- Primero el update y solo despues el insert, y no al reves con `on conflict`:
-- ahi Postgres comprueba el check de la fila propuesta ANTES de resolver el
-- conflicto, asi que una salida de tres unidades sobre un saldo de diez
-- reventaba por «on_hand = -3» aunque el saldo final fuese siete.
create or replace function apply_stock_move() returns trigger
language plpgsql as $$
begin
  update stock_level
     set on_hand = on_hand + new.qty
   where variant_id = new.variant_id and location_id = new.location_id;
  if not found then
    begin
      insert into stock_level (variant_id, location_id, on_hand)
           values (new.variant_id, new.location_id, new.qty);
    exception when unique_violation then
      -- Otro asiento creo la fila entre el update y el insert.
      update stock_level
         set on_hand = on_hand + new.qty
       where variant_id = new.variant_id and location_id = new.location_id;
    end;
  end if;
  return new;
end;
$$;

create trigger stock_move_aplica after insert on stock_move
  for each row execute function apply_stock_move();


-- ===========================================================================
-- 4. Clientes y papeles
-- ===========================================================================

create table customer (
  id             bigint generated always as identity primary key,
  email          text not null,
  full_name      text not null,
  phone          text,
  document_id    text,                       -- DNI
  password_hash  text,                       -- argon2id; null = sin alta web
  marketing_ok   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  disabled_at    timestamptz
);

-- Sin distinguir mayusculas y sin necesitar la extension citext.
create unique index customer_email on customer (lower(email));

create trigger customer_touch before update on customer
  for each row execute function touch_updated_at();

comment on column customer.password_hash is
  'Hash, nunca la contrasena. La pagina de hoy no crea cuentas: guarda el '
  'perfil en localStorage y no pide contrasena a proposito.';

create table customer_session (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customer(id) on delete cascade,
  token_hash   text not null unique,        -- hash del token, no el token
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  user_agent   text,
  ip           inet
);

create index customer_session_vivas
  on customer_session (customer_id) where revoked_at is null;

create type credential_kind as enum ('clu', 'tccm', 'collector', 'sport_licence');

-- La CLU y la TCCM son documentos con vencimiento, no casillas de si/no.
create table credential (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customer(id) on delete cascade,
  kind         credential_kind not null,
  number       text not null,
  issued_on    date,
  expires_on   date,
  verified_at  timestamptz,                 -- se comprueba el original en mano
  verified_by  text,
  scan_path    text,
  created_at   timestamptz not null default now(),
  unique (customer_id, kind, number)
);

create index credential_vigencia on credential (customer_id, kind, expires_on desc);

-- Las armas que el cliente ya tiene registradas. La TCCM cuelga de ellas: no
-- se vende municion de un calibre que el cliente no tiene en ningun arma.
create table registered_firearm (
  id            bigint generated always as identity primary key,
  customer_id   bigint not null references customer(id) on delete cascade,
  cuim          text not null,
  calibre_id    smallint references calibre(id),
  description   text,
  unit_id       bigint references firearm_unit(id),  -- si la vendimos nosotros
  registered_on date,
  unique (customer_id, cuim)
);


-- ===========================================================================
-- 5. Cesta y pedidos
-- ===========================================================================

-- La cesta del navegador, subida al servidor. Sin cliente identificado se
-- ata a un token anonimo, que es como sobrevive a la sesion.
create table cart (
  id          bigint generated always as identity primary key,
  customer_id bigint references customer(id) on delete cascade,
  anon_token  text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (customer_id is not null or anon_token is not null)
);

create trigger cart_touch before update on cart
  for each row execute function touch_updated_at();

create table cart_item (
  cart_id     bigint not null references cart(id) on delete cascade,
  variant_id  bigint not null references product_variant(id),
  qty         integer not null check (qty > 0 and qty <= 99),
  added_at    timestamptz not null default now(),
  primary key (cart_id, variant_id)
);

create type order_status as enum (
  'draft',       -- cesta convertida, sin confirmar
  'reserved',    -- pieza guardada 72 h
  'documents',   -- papeles en curso: CLU comprobada, tenencia presentada
  'ready',       -- lista para entregar
  'delivered',
  'cancelled',
  'expired'
);

-- 'order' es palabra reservada en SQL; la tabla se llama sales_order.
create table sales_order (
  id            bigint generated always as identity primary key,
  code          text not null unique,        -- el que ve el cliente: 'A1Y8M5'
  customer_id   bigint references customer(id),
  status        order_status not null default 'draft',
  ars_per_usd   numeric(12,4) not null,      -- el cambio que se le aplico
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  placed_at     timestamptz,
  expires_at    timestamptz,                 -- reserva de 72 h
  delivered_at  timestamptz,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index sales_order_cliente on sales_order (customer_id, placed_at desc);
create index sales_order_abiertos on sales_order (status)
  where status in ('reserved', 'documents', 'ready');

create trigger sales_order_touch before update on sales_order
  for each row execute function touch_updated_at();

-- La linea guarda copia del nombre, del precio y del regimen: dentro de dos
-- anos el catalogo habra cambiado y la factura tiene que seguir diciendo lo
-- que se vendio y bajo que ley se vendio.
create table order_item (
  id                bigint generated always as identity primary key,
  order_id          bigint not null references sales_order(id) on delete cascade,
  variant_id        bigint not null references product_variant(id),
  unit_id           bigint references firearm_unit(id),
  qty               integer not null check (qty > 0),
  unit_usd_cents    integer not null check (unit_usd_cents >= 0),
  name_snapshot     text not null,
  licence_snapshot  text,
  cartridges        integer not null default 0,   -- cuenta contra el cupo TCCM
  calibre_id        smallint references calibre(id)
);

create index order_item_pedido on order_item (order_id);
create unique index order_item_unidad on order_item (unit_id) where unit_id is not null;

create table order_event (
  id        bigint generated always as identity primary key,
  order_id  bigint not null references sales_order(id) on delete cascade,
  at        timestamptz not null default now(),
  kind      text not null,        -- 'placed', 'clu_checked', 'anmac_filed'...
  actor     text,
  note      text
);

create index order_event_pedido on order_event (order_id, at);

create table payment (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references sales_order(id) on delete cascade,
  method        text not null,     -- 'cash', 'transfer', 'card', 'usd'
  amount_cents  integer not null check (amount_cents > 0),
  currency      char(3) not null default 'ARS',
  ars_per_usd   numeric(12,4),
  status        text not null default 'pending'
    check (status in ('pending', 'settled', 'failed', 'refunded')),
  external_ref  text,
  at            timestamptz not null default now()
);

create index payment_pedido on payment (order_id);


-- ===========================================================================
-- 6. Tramites ANMaC
-- ===========================================================================

create type filing_kind as enum (
  'tenencia_express',   -- Res. 45/2025
  'transferencia',
  'tccm',               -- Res. 14/2025
  'guarda_g2',          -- semiautomaticas, Res. 37/2025
  'baja'
);

create type filing_status as enum ('draft', 'submitted', 'observed', 'granted', 'rejected');

-- El papeleo de cada arma que sale por la puerta. Sin esto no hay entrega.
create table anmac_filing (
  id             bigint generated always as identity primary key,
  customer_id    bigint not null references customer(id),
  order_item_id  bigint references order_item(id),
  unit_id        bigint references firearm_unit(id),
  kind           filing_kind not null,
  status         filing_status not null default 'draft',
  submitted_at   timestamptz,
  resolved_at    timestamptz,
  file_number    text,          -- expediente
  cuim_assigned  text,
  note           text
);

create index anmac_filing_cliente on anmac_filing (customer_id, submitted_at desc);
create index anmac_filing_pendientes on anmac_filing (status)
  where status in ('draft', 'submitted', 'observed');


-- ===========================================================================
-- 7. Taller
-- ===========================================================================

create table workshop_service (
  id          smallint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  usd_cents   integer not null check (usd_cents >= 0),
  minutes     smallint not null default 30,
  active      boolean not null default true
);

create type appointment_kind as enum ('fitting', 'pickup', 'service', 'zeroing', 'review');
create type appointment_status as enum ('booked', 'done', 'missed', 'cancelled');

create table appointment (
  id           bigint generated always as identity primary key,
  customer_id  bigint references customer(id),
  order_id     bigint references sales_order(id),
  kind         appointment_kind not null,
  status       appointment_status not null default 'booked',
  starts_at    timestamptz not null,
  minutes      smallint not null default 30,
  note         text,
  created_at   timestamptz not null default now()
);

-- Dos citas no pueden empezar a la vez en un mostrador de uno.
create unique index appointment_hueco on appointment (starts_at)
  where status = 'booked';

create table work_order (
  id           bigint generated always as identity primary key,
  customer_id  bigint references customer(id),
  unit_id      bigint references firearm_unit(id),
  external_ref text,                    -- arma del cliente que no vendimos
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz,
  status       text not null default 'open'
    check (status in ('open', 'waiting_parts', 'done', 'delivered', 'cancelled')),
  note         text
);

create table work_order_line (
  id            bigint generated always as identity primary key,
  work_order_id bigint not null references work_order(id) on delete cascade,
  service_id    smallint references workshop_service(id),
  description   text,
  usd_cents     integer not null default 0 check (usd_cents >= 0)
);


-- ===========================================================================
-- 8. Tipo de cambio
-- ===========================================================================

-- ARS_POR_USD de js/catalog.js, con historia: un pedido de hace tres meses
-- tiene que poder recalcularse al cambio que se le aplico entonces.
create table fx_rate (
  day          date primary key,
  ars_per_usd  numeric(12,4) not null check (ars_per_usd > 0),
  source       text
);

create view fx_today as
  select ars_per_usd from fx_rate order by day desc limit 1;


-- ===========================================================================
-- 9. Vistas de trabajo
-- ===========================================================================

-- El catalogo tal como lo pinta la pagina, ya resueltos precio y regimen.
create view catalog_reference as
  select v.id                              as variant_id,
         v.sku,
         f.slug                            as family,
         b.name                            as brand,
         p.ref,
         b.name || ' ' || p.ref ||
           coalesce(' ' || c.name, '')     as name,
         p.kind,
         c.name                            as calibre,
         vp.usd_cents,
         coalesce(lr.label, lrf.label)     as licence,
         (select path from product_photo ph
           where ph.product_id = p.id and ph.is_primary) as photo,
         p.serialized
    from product_variant v
    join product p          on p.id = v.product_id
    join brand b            on b.id = p.brand_id
    join family f           on f.id = p.family_id
    join variant_price vp   on vp.variant_id = v.id
    left join calibre c     on c.id = v.calibre_id
    left join licence_regime lr  on lr.id = p.licence_regime_id
    left join licence_regime lrf on lrf.id = f.licence_regime_id
   where p.discontinued_at is null;

-- Existencias en una sola columna, se serialice o no.
create view availability as
  select v.id as variant_id,
         case when p.serialized
              then (select count(*) from firearm_unit u
                     where u.variant_id = v.id and u.status = 'in_stock')
              else coalesce((select sum(on_hand - reserved) from stock_level s
                              where s.variant_id = v.id), 0)
         end as units
    from product_variant v
    join product p on p.id = v.product_id;

-- Cartuchos comprados por cliente, calibre y ano: es contra esto contra lo
-- que se comprueba el cupo de la TCCM antes de aceptar un pedido.
create view ammo_consumed as
  select o.customer_id,
         i.calibre_id,
         extract(year from o.placed_at)::int as year,
         sum(i.cartridges * i.qty)           as cartridges
    from order_item i
    join sales_order o on o.id = i.order_id
   where i.cartridges > 0
     and o.status in ('reserved', 'documents', 'ready', 'delivered')
   group by 1, 2, 3;

commit;
