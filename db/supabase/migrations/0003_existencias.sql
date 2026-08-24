-- 0003_existencias.sql - sucursales, armas serializadas y saldo por asiento.
--
-- Ninguna de estas cuatro tablas se ve desde el navegador, y no por pudor:
-- firearm_unit es la lista de numeros de serie y CUIM de lo que hay en la
-- vitrina, con su sucursal. Filtrarla no es una fuga de datos, es un
-- inventario para quien quiera entrar a robar. Lo unico que sale de aqui es
-- un cubo -- ok / last / order -- por public.existencias() (0008), que es lo
-- unico que la ficha ensena hoy.

create table if not exists public.location (
  id    smallint generated always as identity primary key,
  slug  text not null unique,
  name  text not null,
  -- 'customer' parece raro y es correcto: un asiento sale hacia el cliente.
  kind  text not null default 'shop'
    check (kind in ('shop', 'warehouse', 'workshop', 'supplier', 'customer'))
);

-- Cada arma de fuego, una fila. El CUIM lo asigna ANMaC y llega despues de la
-- compra, asi que nace nulo.
create table if not exists public.firearm_unit (
  id           bigint generated always as identity primary key,
  variant_id   bigint not null references public.product_variant(id),
  location_id  smallint not null references public.location(id),
  serial       text not null,
  cuim         text unique,
  status       text not null default 'incoming'
    check (status in ('incoming',    -- pedida al distribuidor
                      'in_stock',    -- en vitrina
                      'reserved',    -- con reserva de un cliente
                      'in_workshop',
                      'sold',
                      'returned',
                      'scrapped')),
  acquired_at  date,
  cost_cents   integer check (cost_cents >= 0),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (variant_id, serial)
);

drop trigger if exists firearm_unit_touch on public.firearm_unit;
create trigger firearm_unit_touch before update on public.firearm_unit
  for each row execute function public.touch_updated_at();

-- Lo que no se serializa se cuenta. El saldo lo mantiene el disparador de
-- stock_move; escribir aqui a mano es lo que hace que un inventario mienta.
--
-- La columna `reserved` de db/schema.sql no esta, y es una decision: no la
-- mantenia nadie. El disparador solo tocaba on_hand, availability restaba una
-- columna que siempre valia cero y los motivos 'reservation'/'release' bajaban
-- el saldo como una venta. Una columna que hay que sincronizar a mano es una
-- columna que un dia miente. Aqui reservar municion mueve el saldo de verdad
-- (asiento 'sale' al reservar) y una reserva que caduca lo devuelve con un
-- asiento 'return'. Lo reservado no es un numero que guardar: son los pedidos
-- abiertos, y esos ya estan escritos en sales_order.
create table if not exists public.stock_level (
  variant_id   bigint not null references public.product_variant(id),
  location_id  smallint not null references public.location(id),
  -- Un saldo negativo no existe en una vitrina: si sale, es que se vendio algo
  -- que no habia. Mejor que reviente el asiento a que la cifra mienta.
  on_hand      integer not null default 0 check (on_hand >= 0),
  primary key (variant_id, location_id)
);

create table if not exists public.stock_move (
  id           bigint generated always as identity primary key,
  variant_id   bigint not null references public.product_variant(id),
  location_id  smallint not null references public.location(id),
  unit_id      bigint references public.firearm_unit(id),
  qty          integer not null check (qty <> 0),   -- negativo = salida
  reason       text not null
    check (reason in ('purchase', 'sale', 'return',
                      'adjustment', 'transfer', 'loss')),
  ref          text,                                -- codigo de pedido, factura
  actor        text,
  at           timestamptz not null default now()
);

-- Primero el update y solo despues el insert, y no al reves con `on conflict`:
-- ahi Postgres comprueba el check de la fila propuesta ANTES de resolver el
-- conflicto, asi que una salida de tres unidades sobre un saldo de diez
-- reventaba por «on_hand = -3» aunque el saldo final fuese siete.
--
-- El `set search_path` es nuevo respecto de db/schema.sql y ahi no era
-- opcional: una vista se congela al crearse, pero una funcion resuelve los
-- nombres en ejecucion, con el search_path de quien la dispara. Sin esto, un
-- asiento insertado desde PostgREST o desde una funcion con search_path fijo
-- revienta con «relation "stock_level" does not exist».
create or replace function public.aplica_asiento() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.stock_level
     set on_hand = on_hand + new.qty
   where variant_id = new.variant_id and location_id = new.location_id;
  if not found then
    begin
      insert into public.stock_level (variant_id, location_id, on_hand)
           values (new.variant_id, new.location_id, new.qty);
    exception when unique_violation then
      -- Otro asiento creo la fila entre el update y el insert.
      update public.stock_level
         set on_hand = on_hand + new.qty
       where variant_id = new.variant_id and location_id = new.location_id;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists stock_move_aplica on public.stock_move;
create trigger stock_move_aplica after insert on public.stock_move
  for each row execute function public.aplica_asiento();

-- «Un inventario que se edita a mano no se puede auditar» solo es cierto si
-- los asientos no se pueden reescribir, y en db/schema.sql nada lo impedia:
-- un update sobre stock_move desde el editor SQL desincronizaba el saldo en
-- silencio, porque el disparador es `after insert`. Esto lo declara. La RLS no
-- basta, porque service_role se la salta; el disparador alcanza a todos.
create or replace function public.asiento_inmutable() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'stock_move es un libro mayor: un asiento se corrige con '
                  'otro asiento, no reescribiendolo'
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists stock_move_no_se_toca on public.stock_move;
create trigger stock_move_no_se_toca before update or delete on public.stock_move
  for each row execute function public.asiento_inmutable();
