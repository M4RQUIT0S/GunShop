-- prueba.sql - la venta entera contra una base ya migrada y sembrada.
--
-- No es una migracion y no deja nada: abre transaccion, inventa un cliente,
-- le vende un rifle y cartuchos, comprueba que la ley frena lo que tiene que
-- frenar, entrega el pedido, vence una reserva y hace rollback.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/supabase/prueba.sql
--
-- Tambien se pega entero en el editor SQL del panel. Si algun paso falla, el
-- fichero termina con una excepcion que nombra cual: un `select` verde y una
-- lista de pasos en `ok` es lo unico que cuenta como aprobado.
--
-- Lo que comprueba, y por que cada uno esta aqui:
--
--   1  registrar_cliente()   el alta cuelga de auth.uid() y de nada mas
--   2  sin CLU no se vende   la credencial se mira ANTES que las existencias
--   3  la reserva completa   copia congelada, arma marcada, cesta vaciada
--   4  cupo de la TCCM       dos cajas del mismo calibre en la misma cesta se
--                            suman; por separado cada una cabria
--   5  RLS                   el cliente ve su pedido y no el de al lado, y las
--                            tablas internas no las alcanza ninguna politica
--   6  entrega               el asiento sale solo para lo que se cuenta por
--                            saldo; el arma serializada cambia de estado
--   7  inmutable             un pedido entregado no se reescribe
--   8  vencer_reservas()     una reserva caducada devuelve el arma a la vitrina

begin;

create temp table _p (n serial, paso text, ok boolean, detalle text) on commit drop;

do $prueba$
declare
  c_uid    constant uuid := '00000000-0000-4000-8000-0000000000a1';
  c_otro   constant uuid := '00000000-0000-4000-8000-0000000000a2';
  c_staff  constant uuid := '00000000-0000-4000-8000-0000000000a3';
  v_yo     text := session_user;

  v_cli      bigint;
  v_otro_cli bigint;
  v_clu      bigint;
  v_rifle    bigint;   -- variante serializada
  v_muni     bigint;   -- municion del mismo calibre que el rifle
  v_muni2    bigint;   -- segunda municion de ese calibre, inventada aqui
  v_cal      smallint;
  v_prod2    bigint;
  v_sitio    smallint;

  v_codigo   text;
  v_pedido   bigint;
  v_unidad   bigint;
  v_precio1  integer;
  v_precio2  integer;
  v_esperado bigint;
  v_cupo     integer;
  v_queda    bigint;
  v_qty1     integer;
  v_qty2     integer;
  v_caja     integer;

  v_pedido_b bigint;
  v_unidad_b bigint;
  v_n        integer;
  v_n2       integer;
  v_n3       integer;
  v_txt      text;
  v_ok       boolean;
  v_err      text;
begin
  -- ---------------------------------------------------------------- montaje
  -- Se elige la referencia por lo que es, no por su id: el fichero tiene que
  -- seguir valiendo cuando la semilla crezca de 18 productos a 76.
  select v.id, v.calibre_id into v_rifle, v_cal
    from public.product_variant v
    join public.product p on p.id = v.product_id
   where p.serialized
     and (select count(*) from public.firearm_unit u
           where u.variant_id = v.id and u.status = 'in_stock') >= 2
     and exists (select 1 from public.product_variant v2
                   join public.product p2 on p2.id = v2.product_id
                   join public.family f2 on f2.id = p2.family_id
                   join public.licence_regime r2
                     on r2.id = coalesce(p2.licence_regime_id, f2.licence_regime_id)
                  where v2.calibre_id = v.calibre_id
                    and r2.requires_tccm and p2.cartridges_per_box > 0)
   order by v.id limit 1;

  if v_rifle is null then
    raise exception 'la base no tiene un arma serializada con municion de su '
                    'calibre: la semilla no se aplico';
  end if;

  select v.id into v_muni
    from public.product_variant v
    join public.product p on p.id = v.product_id
    join public.family f on f.id = p.family_id
    join public.licence_regime r
      on r.id = coalesce(p.licence_regime_id, f.licence_regime_id)
   where v.calibre_id = v_cal and r.requires_tccm and p.cartridges_per_box > 0
   order by v.id limit 1;

  select l.id into v_sitio from public.location l
   where l.kind = 'shop' order by l.id limit 1;

  -- Una segunda municion del mismo calibre. La semilla trae una sola por
  -- calibre, y sin dos lineas no hay nada que acumular: el paso 4 pasaria por
  -- no tener ocasion de fallar, que es la peor forma de aprobar.
  insert into public.product (brand_id, family_id, ref, kind, licence_regime_id,
                              usd_cents, serialized, cartridges_per_box)
       select p.brand_id, p.family_id, 'PRUEBA-' || v_cal, p.kind,
              p.licence_regime_id, p.usd_cents, false, p.cartridges_per_box
         from public.product p
         join public.product_variant v on v.product_id = p.id
        where v.id = v_muni
    returning id into v_prod2;

  insert into public.product_variant (product_id, calibre_id, sku)
       values (v_prod2, v_cal, 'PRUEBA-MUNICION-' || v_cal)
    returning id into v_muni2;

  -- Existencias de sobra en las dos municiones: lo que se prueba en el paso 4
  -- es el cupo legal, y un «no queda stock» disfrazado de aprobado no sirve.
  insert into public.stock_move (variant_id, location_id, qty, reason, actor)
       values (v_muni,  v_sitio, 500, 'purchase', 'prueba'),
              (v_muni2, v_sitio, 500, 'purchase', 'prueba');

  insert into auth.users (id) values (c_uid), (c_otro), (c_staff);

  -- ------------------------------------------------------ 1. alta de cliente
  perform set_config('request.jwt.claims',
                     json_build_object('sub', c_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  v_cli := public.registrar_cliente('Marco Prueba', '11-5555-0000');

  perform set_config('role', v_yo, true);

  insert into _p (paso, ok, detalle) values (
    'registrar_cliente() da de alta la ficha y la ata a auth.uid()',
    v_cli is not null
      and (select c.user_id from public.customer c where c.id = v_cli) = c_uid,
    'customer_id=' || coalesce(v_cli::text, 'null'));

  insert into public.cart (customer_id) values (v_cli);
  insert into public.cart_item (cart_id, variant_id, qty)
       select c.id, v_rifle, 1 from public.cart c where c.customer_id = v_cli;

  -- --------------------------------------------------- 2. sin CLU no se vende
  v_ok := false; v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform public.crear_pedido('Av. Siempreviva 742');
    perform set_config('role', v_yo, true);
  exception when others then
    v_err := sqlerrm;
    v_ok  := v_err like '%Legitimo Usuario%';
  end;
  perform set_config('role', v_yo, true);

  insert into _p (paso, ok, detalle) values (
    'un arma sin CLU vigente no se reserva', v_ok, v_err);

  -- El pedido que crear_pedido alcanzo a abrir antes de reventar se fue con la
  -- subtransaccion. Que no quede ninguno es parte de la prueba: media reserva
  -- es peor que ninguna porque no se ve.
  insert into _p (paso, ok, detalle) values (
    'el intento fallido no deja pedido a medias',
    not exists (select 1 from public.sales_order o where o.customer_id = v_cli),
    null);

  insert into public.credential (customer_id, kind, number, issued_on, expires_on,
                                 verified_at, verified_by)
       values (v_cli, 'clu', 'CLU-PRUEBA-1', current_date - 30,
               current_date + 365, now(), 'mostrador')
    returning id into v_clu;
  insert into public.credential (customer_id, kind, number, issued_on, expires_on,
                                 verified_at, verified_by)
       values (v_cli, 'tccm', 'TCCM-PRUEBA-1', current_date - 30,
               current_date + 365, now(), 'mostrador');

  -- ------------------------------------------------------- 3. la reserva sale
  v_qty1 := 5;
  insert into public.cart_item (cart_id, variant_id, qty)
       select c.id, v_muni, v_qty1 from public.cart c where c.customer_id = v_cli;

  select vp.usd_cents into v_precio1 from public.variant_price vp where vp.variant_id = v_rifle;
  select vp.usd_cents into v_precio2 from public.variant_price vp where vp.variant_id = v_muni;
  v_esperado := v_precio1::bigint + v_precio2::bigint * v_qty1;

  perform set_config('role', 'authenticated', true);
  v_codigo := public.crear_pedido('Av. Siempreviva 742');
  perform set_config('role', v_yo, true);

  select o.id into v_pedido from public.sales_order o where o.code = v_codigo;
  select oi.unit_id into v_unidad
    from public.order_item oi where oi.order_id = v_pedido and oi.unit_id is not null;

  insert into _p (paso, ok, detalle) values (
    'la cesta se convierte en reserva de 72 h',
    (select o.status = 'reserved'
        and o.expires_at > now() + interval '71 hours'
        and o.subtotal_usd_cents = v_esperado
        and o.total_ars_cents = round(v_esperado * o.ars_per_usd)
       from public.sales_order o where o.id = v_pedido),
    'codigo=' || v_codigo || ' subtotal=' || v_esperado);

  insert into _p (paso, ok, detalle) values (
    'la linea guarda copia congelada: sku, nombre, regimen y credencial',
    (select count(*) = 2 from public.order_item oi where oi.order_id = v_pedido)
    and (select bool_and(oi.sku_snapshot <> '' and oi.name_snapshot <> ''
                     and oi.licence_code is not null
                     and oi.credential_id = v_clu)
           from public.order_item oi where oi.order_id = v_pedido),
    null);

  insert into _p (paso, ok, detalle) values (
    'la municion congela cartuchos por caja y calibre; el rifle no',
    (select oi.cartridges > 0 and oi.calibre_id = v_cal
       from public.order_item oi where oi.order_id = v_pedido and oi.variant_id = v_muni)
    and (select oi.cartridges = 0
           from public.order_item oi where oi.order_id = v_pedido and oi.variant_id = v_rifle),
    null);

  insert into _p (paso, ok, detalle) values (
    'el arma queda marcada como reservada, con su serie copiada en la linea',
    (select u.status = 'reserved' from public.firearm_unit u where u.id = v_unidad)
    and (select oi.serial_snapshot = (select u.serial from public.firearm_unit u
                                       where u.id = v_unidad)
           from public.order_item oi where oi.order_id = v_pedido and oi.unit_id = v_unidad),
    'unit_id=' || v_unidad);

  insert into _p (paso, ok, detalle) values (
    'la cesta queda vacia y el pedido deja su evento',
    not exists (select 1 from public.cart c join public.cart_item i on i.cart_id = c.id
                 where c.customer_id = v_cli)
    and exists (select 1 from public.order_event e
                 where e.order_id = v_pedido and e.kind = 'reserved'
                   and e.actor_uid = c_uid),
    null);

  -- ------------------------------------------------- 4. el cupo de la TCCM
  -- Dos lineas del mismo calibre, cada una por debajo de lo que queda y las
  -- dos juntas por encima. Si el cupo se comprobara linea a linea, esto
  -- pasaria: es exactamente el fallo que se esta buscando.
  select ct.cupo, ct.queda into v_cupo, v_queda from public.cupo_tccm(v_cal) ct;
  select p.cartridges_per_box into v_caja
    from public.product p
    join public.product_variant v on v.product_id = p.id
   where v.id = v_muni;

  -- La segunda linea se lleva ella sola todo lo que queda, y la primera media
  -- carga por delante. Asi cada una por separado cabria -- la segunda justo en
  -- el borde -- y solo sumadas se pasan: si el cupo se comprobara linea a
  -- linea, este pedido saldria. Es el fallo que se esta buscando.
  v_qty1 := (v_queda / (v_caja * 2))::integer;
  v_qty2 := (v_queda / v_caja)::integer;

  insert into public.cart_item (cart_id, variant_id, qty)
       select c.id, v_muni, v_qty1 from public.cart c where c.customer_id = v_cli;
  insert into public.cart_item (cart_id, variant_id, qty)
       select c.id, v_muni2, v_qty2 from public.cart c where c.customer_id = v_cli;

  v_ok := false; v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    perform public.crear_pedido(null);
    perform set_config('role', v_yo, true);
  exception when others then
    v_err := sqlerrm;
    v_ok  := v_err like '%cupo anual%';
  end;
  perform set_config('role', v_yo, true);

  insert into _p (paso, ok, detalle) values (
    'dos cajas del mismo calibre se suman dentro de la misma cesta',
    v_ok, 'cupo=' || v_cupo || ' queda=' || v_queda || ' -> ' || coalesce(v_err, 'no fallo'));

  delete from public.cart_item i using public.cart c
   where i.cart_id = c.id and c.customer_id = v_cli;

  -- --------------------------------------------------------------- 5. RLS
  insert into public.customer (user_id, full_name) values (c_otro, 'Vecino')
    returning id into v_otro_cli;
  insert into public.sales_order (customer_id, ars_per_usd, status)
       values (v_otro_cli, 1000, 'draft');

  perform set_config('request.jwt.claims',
                     json_build_object('sub', c_uid, 'role', 'authenticated')::text, true);
  -- Se cuenta con el rol del cliente y se apunta con el propio: el cuaderno
  -- `_p` es de quien abrio la transaccion, y `authenticated` no escribe en el.
  perform set_config('role', 'authenticated', true);
  select count(*) into v_n from public.sales_order;
  perform set_config('role', v_yo, true);

  insert into _p (paso, ok, detalle) values (
    'el cliente ve sus pedidos y ninguno mas', v_n = 1, 've ' || v_n);

  -- Las internas no dan cero filas: dan 42501. Y es mejor asi. Una tabla con
  -- RLS y sin politica devuelve el conjunto vacio, que es indistinguible de
  -- «hoy no hay armas»; sin grant ninguno, la puerta ni siquiera se abre. Por
  -- eso 0006 empieza revocando en vez de confiar en las politicas.
  v_ok := false; v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    select count(*) into v_n2 from public.firearm_unit;
    perform set_config('role', v_yo, true);
  exception when insufficient_privilege then
    v_err := sqlerrm; v_ok := true;
  end;
  perform set_config('role', v_yo, true);
  insert into _p (paso, ok, detalle) values (
    'las unidades con numero de serie no se pueden ni mirar', v_ok, v_err);

  v_ok := false; v_err := null;
  begin
    perform set_config('role', 'authenticated', true);
    select count(*) into v_n3 from public.stock_level;
    perform set_config('role', v_yo, true);
  exception when insufficient_privilege then
    v_err := sqlerrm; v_ok := true;
  end;
  perform set_config('role', v_yo, true);
  insert into _p (paso, ok, detalle) values (
    'las existencias tampoco', v_ok, v_err);

  -- ----------------------------------------------------------- 6. la entrega
  insert into public.staff (user_id, role) values (c_staff, 'armero');
  perform set_config('request.jwt.claims',
                     json_build_object('sub', c_staff, 'role', 'authenticated')::text, true);

  perform public.entregar_pedido(v_pedido);

  insert into _p (paso, ok, detalle) values (
    'el asiento sale solo para lo que se cuenta por saldo',
    (select count(*) = 1 from public.stock_move m where m.ref = v_codigo)
    and (select m.variant_id = v_muni and m.qty < 0
           from public.stock_move m where m.ref = v_codigo),
    (select 'asientos=' || count(*) from public.stock_move m where m.ref = v_codigo));

  insert into _p (paso, ok, detalle) values (
    'el arma pasa a vendida y el pedido a entregado',
    (select u.status = 'sold' from public.firearm_unit u where u.id = v_unidad)
    and (select o.status = 'delivered' and o.delivered_at is not null
           from public.sales_order o where o.id = v_pedido),
    null);

  -- --------------------------------------------- 7. lo entregado no se toca
  v_ok := false; v_err := null;
  begin
    update public.sales_order set status = 'draft' where id = v_pedido;
  exception when others then
    v_err := sqlerrm;
    v_ok  := v_err like '%ya se entrego%';
  end;
  insert into _p (paso, ok, detalle) values (
    'un pedido entregado no se reescribe', v_ok, v_err);

  -- ------------------------------------------------ 8. la reserva que caduca
  perform set_config('request.jwt.claims',
                     json_build_object('sub', c_uid, 'role', 'authenticated')::text, true);
  insert into public.cart_item (cart_id, variant_id, qty)
       select c.id, v_rifle, 1 from public.cart c where c.customer_id = v_cli;
  perform set_config('role', 'authenticated', true);
  v_txt := public.crear_pedido(null);
  perform set_config('role', v_yo, true);

  select o.id into v_pedido_b from public.sales_order o where o.code = v_txt;
  select oi.unit_id into v_unidad_b
    from public.order_item oi where oi.order_id = v_pedido_b;

  update public.sales_order set expires_at = now() - interval '1 hour'
   where id = v_pedido_b;
  select public.vencer_reservas() into v_n;

  insert into _p (paso, ok, detalle) values (
    'una reserva pasada de las 72 h devuelve el arma a la vitrina',
    v_n = 1
    and (select o.status = 'expired' from public.sales_order o where o.id = v_pedido_b)
    and (select u.status = 'in_stock' from public.firearm_unit u where u.id = v_unidad_b),
    'vencidas=' || v_n);

  perform set_config('role', v_yo, true);
  perform set_config('request.jwt.claims', '', true);
end;
$prueba$;

select n,
       case when ok then 'ok' else '>> FALLA' end as r,
       paso,
       detalle
  from _p order by n;

do $guarda$
begin
  if exists (select 1 from _p where not ok) then
    raise exception 'prueba.sql: %',
      (select string_agg('[' || paso || '] ' || coalesce(detalle, ''), ' // ')
         from _p where not ok);
  end if;
end;
$guarda$;

-- Nada de lo de arriba se queda.
rollback;
