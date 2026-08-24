-- 0008_funciones.sql - lo que el navegador NO puede hacer con un insert.
--
-- Las tablas internas de 0006 no las alcanza ninguna politica: existencias,
-- unidades con numero de serie, asientos, eventos. Reservar toca todas ellas y
-- ademas tiene que comprobar la ley. Eso no cabe en una politica de fila, asi
-- que vive aqui, en funciones `security definer` que corren como el dueno.
--
-- La regla que hace segura a una funcion definer, y que hay que aplicarle a
-- cualquiera que se anada: su resultado depende de auth.uid() y de nada mas
-- que ensanche lo que ve. `crear_pedido()` trabaja sobre la cesta de quien
-- llama; no acepta un customer_id. En cuanto una funcion definer acepta un
-- identificador ajeno, deja de ser una funcion y pasa a ser un agujero.
--
-- Todas llevan `set search_path = ''` y todos los nombres van cualificados. Sin
-- eso, quien llame puede poner delante un esquema suyo con una tabla llamada
-- `credential` y la funcion, que corre como el dueno, la leeria.


-- ===========================================================================
-- 1. Cupo de municion (Res. ANMaC 14/2025)
-- ===========================================================================

-- Lo consumido por calibre en los ultimos doce meses. `security_invoker` hace
-- que la RLS de sales_order y de order_item se aplique de verdad, asi que cada
-- cliente ve su propia fila y nada mas: sin eso, la vista seria una lista de
-- cuanta municion compra cada cual.
--
-- Cuentan los pedidos vivos y los entregados. Un pedido cancelado o vencido no
-- consume cupo -- la municion no salio de la armeria -- y por eso no esta.
create or replace view public.ammo_consumed
  with (security_invoker = on) as
  select o.customer_id,
         oi.calibre_id,
         sum(oi.cartridges * oi.qty)::bigint as cartridges
    from public.order_item oi
    join public.sales_order o on o.id = oi.order_id
   where oi.cartridges > 0
     and oi.calibre_id is not null
     and o.status in ('reserved', 'documents', 'ready', 'delivered')
     and o.placed_at >= now() - interval '12 months'
   group by o.customer_id, oi.calibre_id;

comment on view public.ammo_consumed is
  'Cartuchos por calibre y cliente en los ultimos doce meses. Es el numerador '
  'del cupo de la TCCM; el denominador es calibre.annual_quota.';


-- Cuanto le queda a quien llama, en un calibre. No acepta cliente: el suyo.
create or replace function public.cupo_tccm(p_calibre_id smallint)
returns table (cupo integer, consumido bigint, queda bigint)
language sql stable security definer
set search_path = ''
as $$
  select c.annual_quota,
         coalesce(a.cartridges, 0),
         greatest(c.annual_quota - coalesce(a.cartridges, 0), 0)
    from public.calibre c
    left join public.ammo_consumed a
           on a.calibre_id = c.id
          and a.customer_id = public.mi_cliente()
   where c.id = p_calibre_id;
$$;


-- ===========================================================================
-- 2. Que hay para vender
-- ===========================================================================

-- Existencias menos lo comprometido en pedidos que aun no han salido.
--
-- Publica el mismo numero que ya ensena la ficha del catalogo -- «6 en tienda»
-- estaba en la pagina antes que esta base -- , asi que no descubre nada nuevo.
-- Lo que si evita es abrir stock_level entera por la API: aqui se pregunta por
-- una referencia y se responde un entero.
--
-- Las armas de fuego se cuentan por fila y no por saldo: cada una lleva numero
-- de serie y ANMaC pregunta por ella de una en una.
create or replace function public.disponible(p_variant_id bigint)
returns integer
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_serializado boolean;
  v_saldo       integer;
  v_comprometido integer;
begin
  select p.serialized into v_serializado
    from public.product_variant v
    join public.product p on p.id = v.product_id
   where v.id = p_variant_id;

  if v_serializado is null then
    return 0;                       -- referencia que no existe
  end if;

  if v_serializado then
    -- Una reserva ya marca la unidad como `reserved`, asi que contar las
    -- disponibles es la cuenta entera: no hay que restar nada.
    select count(*) into v_saldo
      from public.firearm_unit u
     where u.variant_id = p_variant_id and u.status = 'in_stock';
    return v_saldo;
  end if;

  select coalesce(sum(s.on_hand), 0) into v_saldo
    from public.stock_level s
   where s.variant_id = p_variant_id;

  -- Lo que no se serializa no se marca: se descuenta de la existencia al
  -- entregar. Hasta entonces esta comprometido y no se puede vender dos veces.
  select coalesce(sum(oi.qty), 0) into v_comprometido
    from public.order_item oi
    join public.sales_order o on o.id = oi.order_id
   where oi.variant_id = p_variant_id
     and o.status in ('reserved', 'documents', 'ready');

  return greatest(v_saldo - v_comprometido, 0);
end;
$$;


-- ===========================================================================
-- 3. La cesta se convierte en reserva
-- ===========================================================================

-- Es la unica operacion que de verdad importa, y es una sola transaccion: o
-- salen las lineas, la reserva y los eventos, o no sale nada. Media reserva
-- -- un arma marcada como reservada sin pedido que la reclame -- es peor que
-- ninguna, porque no se ve.
--
-- Orden de los bloqueos, que es lo que evita los interbloqueos:
--   1. la ficha del cliente         (serializa dos pestanas del mismo cliente)
--   2. su cesta
--   3. las referencias, por id ascendente
-- Dos clientes distintos que compran las mismas dos referencias las bloquean
-- en el mismo orden y ninguno espera al otro en cruz.
create or replace function public.crear_pedido(p_ship_to text default null)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_cliente   bigint;
  v_cambio    numeric(12,4);
  v_pedido    bigint;
  v_codigo    text;
  v_linea     record;
  v_unidad    bigint;
  v_serie     text;
  -- Dos escalares y no un `record`: a un record no se le puede asignar NULL
  -- para reiniciarlo entre vueltas del bucle, y una linea que no exige CLU
  -- tiene que guardar credencial nula, no la de la linea anterior.
  v_cred_id   bigint;
  v_cred_num  text;
  v_lleva     integer;
  v_cupo      record;
  -- Cartuchos que este mismo pedido va acumulando por calibre. Sin esto, dos
  -- cajas del mismo calibre en la misma cesta pasarian el cupo por separado.
  v_acumulado jsonb := '{}'::jsonb;
  v_clave     text;
  v_previo    bigint;
  v_total     bigint := 0;
begin
  v_cliente := public.mi_cliente();
  if v_cliente is null then
    raise exception 'no hay sesion, o la ficha de cliente esta dada de baja'
      using errcode = '42501';
  end if;

  -- Serializa al cliente consigo mismo: sin este bloqueo, dos reservas a la
  -- vez pasarian las dos el mismo cupo de municion.
  perform 1 from public.customer where id = v_cliente for update;

  perform 1 from public.cart where customer_id = v_cliente for update;

  if not exists (select 1 from public.cart c
                   join public.cart_item i on i.cart_id = c.id
                  where c.customer_id = v_cliente) then
    raise exception 'la cesta esta vacia';
  end if;

  -- El cambio se congela ahora. Una factura de hace dos anos tiene que seguir
  -- cuadrando, y para eso el pedido se queda con el cambio que se le aplico.
  select f.ars_per_usd into v_cambio from public.fx_today f;
  if v_cambio is null then
    raise exception 'no hay tipo de cambio de los ultimos siete dias'
      using hint = 'insertar la cotizacion del dia en public.fx_rate';
  end if;

  insert into public.sales_order (customer_id, status, ars_per_usd, ship_to, placed_at, expires_at)
       values (v_cliente, 'draft', v_cambio, nullif(btrim(p_ship_to), ''),
               now(), now() + interval '72 hours')
    returning id, code into v_pedido, v_codigo;

  for v_linea in
    select i.variant_id,
           i.qty,
           coalesce(v.usd_cents, p.usd_cents) as precio,
           v.sku,
           b.name || ' ' || p.ref ||
             coalesce(' ' || cal.name, '')     as nombre,
           p.serialized,
           p.cartridges_per_box,
           v.calibre_id,
           r.code                              as regimen,
           r.requires_clu,
           r.requires_tccm,
           r.requires_certification
      from public.cart c
      join public.cart_item i        on i.cart_id = c.id
      join public.product_variant v  on v.id = i.variant_id
      join public.product p          on p.id = v.product_id
      join public.brand b            on b.id = p.brand_id
      -- El coalesce no es adorno: product.licence_regime_id es NULLABLE y su
      -- null significa «el de la familia», que es el caso de casi todo el
      -- catalogo. Con un join a secas contra p.licence_regime_id, esas lineas
      -- no salen del bucle: el pedido se crea, se marca reservado y llega al
      -- mostrador sin las lineas que lo componen. Sin error y sin ruido, que
      -- es la peor forma de romperse.
      join public.licence_regime r
        on r.id = coalesce(p.licence_regime_id,
                           (select f2.licence_regime_id from public.family f2
                             where f2.id = p.family_id))
      left join public.calibre cal   on cal.id = v.calibre_id
     where c.customer_id = v_cliente
     -- Orden estable de bloqueo. Ver la cabecera.
     order by i.variant_id
  loop
    -- --- la ley, antes que las existencias ---------------------------------
    -- Se comprueba primero porque un «le falta la CLU» es una respuesta util,
    -- y «no queda stock» dicho a alguien que de todos modos no podia comprar,
    -- no lo es.
    v_cred_id  := null;
    v_cred_num := null;

    if v_linea.requires_clu then
      select cr.id, cr.number into v_cred_id, v_cred_num
        from public.credential cr
       where cr.customer_id = v_cliente
         and cr.kind = 'clu'
         and cr.verified_at is not null
         and cr.expires_on >= current_date
       order by cr.expires_on desc
       limit 1;
      if v_cred_id is null then
        raise exception 'sin Credencial de Legitimo Usuario vigente y comprobada: %',
          v_linea.nombre
          using hint = 'la credencial se comprueba en el mostrador, con el original delante';
      end if;
    end if;

    if v_linea.requires_tccm then
      if not exists (select 1 from public.credential cr
                      where cr.customer_id = v_cliente
                        and cr.kind = 'tccm'
                        and cr.verified_at is not null
                        and cr.expires_on >= current_date) then
        raise exception 'sin Tarjeta de Consumo (TCCM) vigente: %', v_linea.nombre;
      end if;

      if v_linea.calibre_id is null then
        raise exception 'municion sin calibre asignado: %', v_linea.nombre;
      end if;

      v_lleva := coalesce(v_linea.cartridges_per_box, 0) * v_linea.qty;
      if v_lleva <= 0 then
        raise exception 'municion sin cartuchos por caja: %', v_linea.nombre;
      end if;

      v_clave  := v_linea.calibre_id::text;
      v_previo := coalesce((v_acumulado ->> v_clave)::bigint, 0);

      select * into v_cupo from public.cupo_tccm(v_linea.calibre_id);
      -- `cupo_tccm` no devuelve fila si el calibre no existe, y entonces la
      -- comparacion de abajo daria NULL: el IF no saltaria y la venta pasaria
      -- sin limite. Un cupo que no se sabe es un cupo que no se cumple.
      if v_cupo.cupo is null then
        raise exception 'no hay cupo que comprobar para el calibre de %', v_linea.nombre
          using hint = 'la referencia apunta a un calibre que no esta en public.calibre';
      end if;
      if v_previo + v_lleva > v_cupo.queda then
        raise exception
          'el cupo anual de % cartuchos de ese calibre no da para % mas (lleva % y ya hay % en esta cesta)',
          v_cupo.cupo, v_lleva, v_cupo.consumido, v_previo;
      end if;

      v_acumulado := jsonb_set(v_acumulado, array[v_clave],
                               to_jsonb(v_previo + v_lleva));
    end if;

    -- --- existencias -------------------------------------------------------
    v_unidad := null;
    v_serie  := null;

    if v_linea.serialized then
      if v_linea.qty <> 1 then
        raise exception 'un arma de fuego se reserva de una en una: %', v_linea.nombre;
      end if;
      -- `skip locked` para que dos compradores de la ultima unidad no se
      -- queden esperando: el segundo se lleva un «no queda» al instante en vez
      -- de bloquearse hasta que el primero termine.
      select u.id, u.serial into v_unidad, v_serie
        from public.firearm_unit u
       where u.variant_id = v_linea.variant_id and u.status = 'in_stock'
       order by u.id
       for update skip locked
       limit 1;
      if v_unidad is null then
        raise exception 'no queda unidad disponible de %', v_linea.nombre;
      end if;
      update public.firearm_unit set status = 'reserved' where id = v_unidad;
    else
      -- Bloquear el saldo serializa a los compradores de la misma referencia:
      -- sin esto, dos reservas simultaneas de las dos ultimas cajas leerian
      -- las dos «quedan dos» y saldrian las dos.
      perform 1 from public.stock_level s
        where s.variant_id = v_linea.variant_id for update;
      if public.disponible(v_linea.variant_id) < v_linea.qty then
        raise exception 'no quedan % unidades de %', v_linea.qty, v_linea.nombre;
      end if;
    end if;

    -- --- la copia congelada ------------------------------------------------
    -- El catalogo cambia; lo que se vendio y bajo que ley, no.
    insert into public.order_item (
      order_id, variant_id, unit_id, qty, unit_usd_cents,
      sku_snapshot, name_snapshot, licence_code,
      requires_clu, requires_tccm, requires_certification,
      cartridges, calibre_id, serial_snapshot,
      credential_id, credential_number)
    values (
      v_pedido, v_linea.variant_id, v_unidad, v_linea.qty, v_linea.precio,
      v_linea.sku, v_linea.nombre, v_linea.regimen,
      v_linea.requires_clu, v_linea.requires_tccm, v_linea.requires_certification,
      case when v_linea.requires_tccm then v_linea.cartridges_per_box else 0 end,
      v_linea.calibre_id, v_serie,
      v_cred_id, v_cred_num);

    v_total := v_total + v_linea.precio::bigint * v_linea.qty;
  end loop;

  update public.sales_order
     set status = 'reserved',
         subtotal_usd_cents = v_total,
         -- usd_cents x cambio = centavos de peso. La division y la
         -- multiplicacion por cien se cancelan, asi que no aparecen.
         total_ars_cents = round(v_total * v_cambio)
   where id = v_pedido;

  insert into public.order_event (order_id, kind, actor, actor_uid, note)
       values (v_pedido, 'reserved', 'cliente', (select auth.uid()),
               'reserva de 72 h creada desde la web');

  delete from public.cart_item i
   using public.cart c
   where i.cart_id = c.id and c.customer_id = v_cliente;

  return v_codigo;
end;
$$;


-- ===========================================================================
-- 4. Lo que caduca y lo que se entrega
-- ===========================================================================

-- Una reserva que nadie viene a buscar tiene que soltar el arma, o el
-- inventario miente. Es idempotente: solo toca pedidos que ya vencieron, asi
-- que ejecutarla dos veces no hace nada la segunda.
create or replace function public.vencer_reservas()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_n integer := 0;
  v_p bigint;
begin
  for v_p in
    select o.id from public.sales_order o
     where o.status = 'reserved' and o.expires_at < now()
     for update skip locked
  loop
    update public.firearm_unit u
       set status = 'in_stock'
      from public.order_item oi
     where oi.order_id = v_p and u.id = oi.unit_id and u.status = 'reserved';

    update public.sales_order set status = 'expired' where id = v_p;

    insert into public.order_event (order_id, kind, actor, note)
         values (v_p, 'expired', 'sistema', 'pasadas las 72 h sin retirar');

    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;


-- La entrega: es aqui donde la existencia baja de verdad. Antes de esto el
-- arma estaba reservada pero seguia siendo del inventario.
create or replace function public.entregar_pedido(p_order_id bigint)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_linea  record;
  v_sitio  smallint;
begin
  if not public.es_staff() then
    raise exception 'solo el personal de la armeria entrega un pedido'
      using errcode = '42501';
  end if;

  select o.code into v_codigo from public.sales_order o
   where o.id = p_order_id and o.status in ('reserved', 'documents', 'ready')
   for update;
  if v_codigo is null then
    raise exception 'el pedido no existe o no esta en estado de entregar';
  end if;

  select l.id into v_sitio from public.location l where l.kind = 'shop'
   order by l.id limit 1;
  if v_sitio is null then
    raise exception 'no hay ninguna ubicacion de tienda dada de alta';
  end if;

  for v_linea in
    select oi.variant_id, oi.qty, oi.unit_id
      from public.order_item oi where oi.order_id = p_order_id
  loop
    if v_linea.unit_id is not null then
      -- Un arma NO tiene saldo: su inventario es su propia fila. Escribirle un
      -- asiento crearia un stock_level en negativo y el check `on_hand >= 0`
      -- reventaria la entrega entera. Los dos mundos del inventario no se
      -- mezclan: lo serializado se cuenta por filas, lo demas por saldo.
      update public.firearm_unit set status = 'sold' where id = v_linea.unit_id;
    else
      insert into public.stock_move (variant_id, location_id, qty, reason, ref, actor)
           values (v_linea.variant_id, v_sitio, -v_linea.qty, 'sale', v_codigo, 'entrega');
    end if;
  end loop;

  update public.sales_order
     set status = 'delivered', delivered_at = now()
   where id = p_order_id;

  insert into public.order_event (order_id, kind, actor, actor_uid, note)
       values (p_order_id, 'delivered', 'mostrador', (select auth.uid()), null);
end;
$$;


-- ===========================================================================
-- 5. Quien puede llamar a que
-- ===========================================================================
--
-- 0006 revoco el execute de todas las rutinas de `public` para `public`, asi
-- que aqui no se concede nada por descuido: lo que no aparezca abajo, no se
-- puede llamar desde el navegador.

revoke all on function public.cupo_tccm(smallint)      from public, anon, authenticated;
revoke all on function public.disponible(bigint)       from public, anon, authenticated;
revoke all on function public.crear_pedido(text)       from public, anon, authenticated;
revoke all on function public.vencer_reservas()        from public, anon, authenticated;
revoke all on function public.entregar_pedido(bigint)  from public, anon, authenticated;

-- El catalogo lo mira cualquiera, con sesion o sin ella: la ficha dice «6 en
-- tienda» antes de que nadie se identifique.
grant execute on function public.disponible(bigint) to anon, authenticated;

-- Lo demas exige sesion, porque todo depende de quien seas.
grant execute on function public.cupo_tccm(smallint) to authenticated;
grant execute on function public.crear_pedido(text)  to authenticated;

-- `vencer_reservas` y `entregar_pedido` no se conceden a nadie. La primera la
-- llama pg_cron o una funcion Edge con service_role; la segunda comprueba
-- es_staff() por dentro, pero ademas no se expone: dos cerraduras en la puerta
-- que abre el inventario.

-- La vista es nueva y 0006 no pudo nombrarla. Con `security_invoker` no se
-- salta la RLS de las tablas de debajo, asi que cada cliente ve su consumo y
-- solo el suyo; sin este grant, la pagina no podria enseñar cuanto le queda.
grant select on public.ammo_consumed to authenticated;
