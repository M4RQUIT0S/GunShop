-- smoke.sql - una venta entera contra el esquema, de la cesta a la entrega.
--
-- No es documentacion: es la unica forma de saber que schema.sql aguanta lo
-- que la tienda hace todos los dias. Va dentro de una transaccion que acaba
-- en rollback, asi que se puede repetir sin dejar nada.
--
-- Levantar y probar:
--
--   docker run -d --name gunshop-pg -e POSTGRES_PASSWORD=demo \
--     -v "$PWD/db:/db:ro" postgres:17-alpine
--   docker exec gunshop-pg psql -U postgres -v ON_ERROR_STOP=1 -f /db/schema.sql
--   docker exec gunshop-pg psql -U postgres -v ON_ERROR_STOP=1 -f /db/seed.sql
--   docker exec gunshop-pg psql -U postgres -v ON_ERROR_STOP=1 -f /db/smoke.sql

\set ON_ERROR_STOP on
begin;
set search_path = gunshop, public;

-- --- el cliente y sus papeles ---------------------------------------------

insert into customer (email, full_name, document_id)
     values ('ana@example.com', 'Ana Beltrán', '30111222')
  returning id \gset cliente_

insert into credential (customer_id, kind, number, issued_on, expires_on, verified_at)
     values (:cliente_id, 'clu', '482170', date '2024-10-14', date '2029-10-14', now());

insert into credential (customer_id, kind, number, expires_on, verified_at)
     values (:cliente_id, 'tccm', 'T-99001', date '2027-01-31', now());

-- La TCCM cuelga de un arma ya registrada a su nombre, y del calibre de esa
-- arma: sin esto no se le puede vender municion de .308.
insert into registered_firearm (customer_id, cuim, calibre_id, description, registered_on)
     select :cliente_id, 'CUIM-000001', c.id, 'Tikka T3x Lite', date '2023-05-02'
       from calibre c where c.name = '.308 Win';

-- --- la cesta --------------------------------------------------------------

insert into cart (customer_id) values (:cliente_id) returning id \gset cesta_

insert into cart_item (cart_id, variant_id, qty)
     select :cesta_id, id, 1 from product_variant where sku = 'sauer-100-classic-xt-308-win';
insert into cart_item (cart_id, variant_id, qty)
     select :cesta_id, id, 3 from product_variant
      where sku = 'sellier-bellot-308-win-147-gr';

-- --- el pedido -------------------------------------------------------------

insert into sales_order (code, customer_id, status, ars_per_usd, placed_at, expires_at)
     select 'A1Y8M5', :cliente_id, 'reserved', f.ars_per_usd, now(), now() + interval '72 hours'
       from fx_today f
  returning id \gset pedido_

-- La linea se lleva copia del nombre, del precio y del regimen. Y la
-- municion, ademas, cuantos cartuchos son: es lo que descuenta del cupo.
insert into order_item (order_id, variant_id, qty, unit_usd_cents,
                        name_snapshot, licence_snapshot, cartridges, calibre_id)
     select :pedido_id, r.variant_id, 1, r.usd_cents, r.name, r.licence, 0, null
       from catalog_reference r where r.sku = 'sauer-100-classic-xt-308-win';

insert into order_item (order_id, variant_id, qty, unit_usd_cents,
                        name_snapshot, licence_snapshot, cartridges, calibre_id)
     select :pedido_id, r.variant_id, 3, r.usd_cents, r.name, r.licence, 20,
            (select id from calibre where name = '.308 Win')
       from catalog_reference r where r.sku = 'sellier-bellot-308-win-147-gr';

update sales_order o
   set subtotal_cents = (select sum(i.qty * i.unit_usd_cents)
                           from order_item i where i.order_id = o.id)
 where o.id = :pedido_id;

-- --- la unidad concreta ----------------------------------------------------

-- Un arma de fuego no se reserva "en cantidad": se aparta una, con su serie.
update firearm_unit
   set status = 'reserved'
 where id = (select u.id from firearm_unit u
               join product_variant v on v.id = u.variant_id
              where v.sku = 'sauer-100-classic-xt-308-win' and u.status = 'in_stock'
              limit 1)
returning id \gset unidad_

update order_item set unit_id = :unidad_id
 where order_id = :pedido_id and unit_id is null
   and variant_id = (select id from product_variant
                      where sku = 'sauer-100-classic-xt-308-win');

-- La municion sale del saldo por asiento, nunca tocando stock_level a mano.
-- Antes entra una caja de reposicion, porque el seed reparte existencias al
-- azar y esta referencia puede estar a cero: el saldo no baja de ahi.
insert into stock_move (variant_id, location_id, qty, reason, ref)
     select v.id, l.id, 10, 'purchase', 'smoke'
       from product_variant v, location l
      where v.sku = 'sellier-bellot-308-win-147-gr' and l.slug = 'mostrador';

insert into stock_move (variant_id, location_id, qty, reason, ref)
     select v.id, l.id, -3, 'sale', 'A1Y8M5'
       from product_variant v, location l
      where v.sku = 'sellier-bellot-308-win-147-gr' and l.slug = 'mostrador';

-- --- papeles y entrega ------------------------------------------------------

insert into anmac_filing (customer_id, order_item_id, unit_id, kind, status,
                          submitted_at, file_number)
     select :cliente_id, i.id, :unidad_id, 'tenencia_express', 'submitted',
            now(), 'EXP-2026-0001'
       from order_item i where i.order_id = :pedido_id and i.unit_id = :unidad_id;

insert into order_event (order_id, kind, actor, note)
     values (:pedido_id, 'placed', 'web', 'reserva desde el panel de la cesta'),
            (:pedido_id, 'clu_checked', 'mostrador', 'original visto'),
            (:pedido_id, 'anmac_filed', 'mostrador', 'EXP-2026-0001');

update anmac_filing set status = 'granted', resolved_at = now(),
                        cuim_assigned = 'CUIM-000777'
 where file_number = 'EXP-2026-0001';

update firearm_unit set status = 'sold', cuim = 'CUIM-000777' where id = :unidad_id;
update sales_order set status = 'delivered', delivered_at = now() where id = :pedido_id;

insert into payment (order_id, method, amount_cents, currency, status)
     select id, 'transfer', round(subtotal_cents * ars_per_usd), 'ARS', 'settled'
       from sales_order where id = :pedido_id;

-- --- lo que tiene que haber quedado ------------------------------------------

do $$
declare
  n integer;
  total integer;
begin
  select count(*) into n from order_item where order_id = (select id from sales_order where code = 'A1Y8M5');
  if n <> 2 then raise exception 'el pedido perdio lineas: %', n; end if;

  select subtotal_cents into total from sales_order where code = 'A1Y8M5';
  if total <> 165000 + 3 * 5000 then
    raise exception 'el subtotal no cuadra: %', total;
  end if;

  select cartridges into n from ammo_consumed
   where calibre_id = (select id from calibre where name = '.308 Win');
  if n <> 60 then raise exception 'el cupo no cuenta los cartuchos: %', n; end if;

  select count(*) into n from firearm_unit where cuim = 'CUIM-000777';
  if n <> 1 then raise exception 'el arma no quedo con su CUIM'; end if;

  select on_hand into n from stock_level s
    join product_variant v on v.id = s.variant_id
   where v.sku = 'sellier-bellot-308-win-147-gr';
  if n is null or n < 7 then raise exception 'el saldo de municion no cuadra: %', n; end if;

  raise notice 'smoke ok · % lineas · subtotal % centavos · saldo municion %', 2, total, n;
end;
$$;

-- La misma arma no se puede vender dos veces: el indice unico sobre unit_id
-- es lo unico que lo impide, y por eso se prueba.
do $$
declare
  u bigint;
  v bigint;
  o bigint;
begin
  select id into o from sales_order where code = 'A1Y8M5';
  select unit_id, variant_id into u, v from order_item
   where order_id = o and unit_id is not null;
  begin
    insert into order_item (order_id, variant_id, unit_id, qty, unit_usd_cents,
                            name_snapshot)
         values (o, v, u, 1, 1, 'duplicado');
    raise exception 'se pudo vender dos veces la misma arma';
  exception when unique_violation then
    raise notice 'ok: una unidad no se puede vender dos veces';
  end;
end;
$$;

rollback;
