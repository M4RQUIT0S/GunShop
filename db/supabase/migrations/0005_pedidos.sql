-- 0005_pedidos.sql - cesta, pedido, linea con copia congelada, pagos y el
-- expediente de ANMaC.
--
-- La regla de todo el fichero: la cesta la escribe el cliente, el pedido no.
-- Un pedido se crea llamando a public.reservar() (0008), que recalcula precio,
-- regimen y cupo en el servidor. Aqui no hay ni una politica de insert sobre
-- sales_order ni sobre order_item, y eso no es un olvido (ver 0006).

-- La cesta del navegador, subida al servidor. `anon_token` de db/schema.sql no
-- esta: era un secreto portador en claro que el propio atacante elegia y que
-- ninguna politica puede proteger. La cesta de invitado se queda donde ya
-- funciona, en localStorage (js/cart.js guarda {id: unidades} y resuelve
-- contra el catalogo al cargar); si algun dia hace falta cesta de invitado
-- entre dispositivos, Supabase tiene altas anonimas de verdad
-- (signInAnonymously), que dan un auth.uid() real y no hacen falta columnas.
create table if not exists public.cart (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references public.customer(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (customer_id)
);

drop trigger if exists cart_touch on public.cart;
create trigger cart_touch before update on public.cart
  for each row execute function public.touch_updated_at();

-- Sin copia del precio, y esta bien asi: el precio se resuelve vivo contra el
-- catalogo, que es exactamente lo que hace hoy la cesta del navegador. Lo que
-- se congela es el pedido, no la cesta.
create table if not exists public.cart_item (
  cart_id     bigint not null references public.cart(id) on delete cascade,
  variant_id  bigint not null references public.product_variant(id),
  qty         integer not null check (qty > 0 and qty <= 99),
  added_at    timestamptz not null default now(),
  primary key (cart_id, variant_id)
);

-- 'order' es palabra reservada en SQL; la tabla se llama sales_order.
create table if not exists public.sales_order (
  id            bigint generated always as identity primary key,
  -- El codigo lo pone la base, no el cliente. En file:// lo escribia la
  -- pagina; por PostgREST lo escribiria el navegador, y un codigo que el
  -- comprador elige es un codigo que se puede pisar o adivinar. Cuatro bytes
  -- de gen_random_bytes son ocho caracteres imprevisibles, que es lo que hace
  -- falta: esto es lo que se ensena en el mostrador para retirar un arma.
  code          text not null unique
                  default upper(encode(extensions.gen_random_bytes(4), 'hex')),
  customer_id   bigint not null references public.customer(id),
  status        text not null default 'draft'
    check (status in ('draft',      -- cesta convertida, sin confirmar
                      'reserved',   -- pieza guardada 72 h
                      'documents',  -- CLU comprobada, tenencia presentada
                      'ready',      -- lista para entregar
                      'delivered',
                      'cancelled',
                      'expired')),
  ars_per_usd   numeric(12,4) not null,         -- el cambio que se le aplico
  subtotal_usd_cents integer not null default 0 check (subtotal_usd_cents >= 0),
  -- bigint y no integer. La columna guarda PESOS en centavos: int4 topa en
  -- 21,47 millones de ARS, y la Zoli Z-Sport sola son US$ 11.550, que al
  -- cambio de 1.520 ya se pasa. Con inflacion, solo empeora. Los dolares en
  -- centavos si caben en int4 y se quedan como estan.
  total_ars_cents bigint not null default 0 check (total_ars_cents >= 0),
  -- Copia, no referencia: una direccion editada manana no puede cambiar a
  -- donde se envio una caja de cartuchos.
  ship_to       text,
  placed_at     timestamptz,
  expires_at    timestamptz,                    -- reserva de 72 h
  delivered_at  timestamptz,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.sales_order.total_ars_cents is
  'Lo que el cliente debe, en centavos de peso, congelado al cambio del '
  'pedido. Falta el IVA y falta la factura electronica (AFIP: tipo, punto de '
  'venta, CAE y su vencimiento). Ver el README.';

drop trigger if exists sales_order_touch on public.sales_order;
create trigger sales_order_touch before update on public.sales_order
  for each row execute function public.touch_updated_at();

-- La linea guarda copia del nombre, del precio y del regimen: dentro de dos
-- anos el catalogo habra cambiado y la factura tiene que seguir diciendo lo
-- que se vendio y bajo que ley se vendio.
create table if not exists public.order_item (
  id              bigint generated always as identity primary key,
  order_id        bigint not null references public.sales_order(id) on delete cascade,
  variant_id      bigint not null references public.product_variant(id),
  unit_id         bigint references public.firearm_unit(id),
  qty             integer not null check (qty > 0),
  unit_usd_cents  integer not null check (unit_usd_cents >= 0),
  sku_snapshot    text not null,
  name_snapshot   text not null,
  -- El regimen congelado como CODIGO con clave ajena, no como etiqueta suelta.
  -- db/schema.sql guardaba `licence_snapshot text` sin FK: decia «Uso civil
  -- condicional» pero no que exigia esa etiqueta aquel dia, asi que si manana
  -- ANMaC cambia lo que pide, la factura tiene el nombre y nadie puede
  -- reconstruir la ley. Con la clave ajena, ademas, una etiqueta desconocida
  -- NO SE PUEDE INSERTAR: revienta en vez de degradar a venta libre. La regla
  -- dura deja de ser una costumbre y pasa a ser una restriccion.
  licence_code    text not null references public.licence_regime(code),
  requires_clu           boolean not null,
  requires_tccm          boolean not null,
  requires_certification boolean not null,
  cartridges      integer not null default 0 check (cartridges >= 0),
  calibre_id      smallint references public.calibre(id),
  -- La serie tal como se vendio. unit_id apunta a una fila viva y editable; la
  -- factura y el expediente necesitan el numero de aquel dia.
  serial_snapshot text,
  -- Que credencial se exhibio. El registro que legalmente importa es «vendi a
  -- esta persona, que exhibio esta CLU vigente el dia X», y en db/schema.sql
  -- eso solo existia como texto libre en un order_event.
  credential_id      bigint references public.credential(id),
  credential_number  text
);

create table if not exists public.order_event (
  id        bigint generated always as identity primary key,
  order_id  bigint not null references public.sales_order(id) on delete cascade,
  at        timestamptz not null default now(),
  kind      text not null,        -- 'placed', 'clu_checked', 'anmac_filed'...
  actor     text,
  actor_uid uuid,                 -- la unica identidad que no se puede teclear
  note      text
);

create table if not exists public.payment (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.sales_order(id) on delete cascade,
  method        text not null,     -- 'cash', 'transfer', 'card', 'usd'
  amount_cents  bigint not null check (amount_cents > 0),  -- ver total_ars_cents
  currency      char(3) not null default 'ARS',
  ars_per_usd   numeric(12,4),
  status        text not null default 'pending'
    check (status in ('pending', 'settled', 'failed', 'refunded')),
  external_ref  text,
  at            timestamptz not null default now()
);

-- El papeleo de cada arma que sale por la puerta. Sin esto no hay entrega.
-- customer_id sin cascade a proposito: el expediente sobrevive al cliente.
create table if not exists public.anmac_filing (
  id             bigint generated always as identity primary key,
  customer_id    bigint not null references public.customer(id),
  order_item_id  bigint references public.order_item(id),
  unit_id        bigint references public.firearm_unit(id),
  kind           text not null
    check (kind in ('tenencia_express',   -- Res. 45/2025
                    'transferencia',
                    'tccm',               -- Res. 14/2025
                    'guarda_g2',          -- semiautomaticas, Res. 37/2025
                    'baja')),
  status         text not null default 'draft'
    check (status in ('draft', 'submitted', 'observed', 'granted', 'rejected')),
  submitted_at   timestamptz,
  resolved_at    timestamptz,
  file_number    text,          -- expediente
  cuim_assigned  text,
  note           text
);

-- Un pedido entregado no se toca. Hoy `update sales_order set status='draft'`
-- sobre una venta cerrada es legal, y con el se puede reescribir a que precio
-- y bajo que regimen se entrego un arma. No hace falta la maquina de estados
-- entera: hace falta que, una vez puesto delivered_at, la fila y sus lineas
-- queden quietas. Se permite anadir eventos y pagos, que es lo que pasa
-- despues de una entrega.
create or replace function public.pedido_entregado_inmutable() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_entregado timestamptz;
begin
  if tg_table_name = 'sales_order' then
    v_entregado := old.delivered_at;
  else
    select o.delivered_at into v_entregado
      from public.sales_order o where o.id = old.order_id;
  end if;

  if v_entregado is not null then
    raise exception 'el pedido ya se entrego: lo vendido y bajo que ley se '
                    'vendio no se reescribe'
      using errcode = 'restrict_violation';
  end if;
  -- En un BEFORE UPDATE hay que devolver NEW: devolver OLD no cancela el
  -- disparador, escribe la fila vieja encima y el cambio se pierde en
  -- silencio, que es peor que cualquier error.
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sales_order_cerrado on public.sales_order;
create trigger sales_order_cerrado before update or delete on public.sales_order
  for each row execute function public.pedido_entregado_inmutable();

drop trigger if exists order_item_cerrado on public.order_item;
create trigger order_item_cerrado before update or delete on public.order_item
  for each row execute function public.pedido_entregado_inmutable();
