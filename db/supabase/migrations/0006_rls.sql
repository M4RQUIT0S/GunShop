-- 0006_rls.sql - quien ve que. Este es el fichero al que hay que volver.
--
-- El reparto es de tres grupos y ocho tablas cada uno, y cabe en la cabeza a
-- proposito: si no cabe, no se puede auditar.
--
--   Catalogo publico  licence_regime, calibre, brand, family, product,
--                     product_variant, product_photo, fx_rate
--                     -> select para todo el mundo. Es lo que la pagina pinta.
--
--   Del cliente       customer, customer_address, credential,
--                     registered_firearm, cart, cart_item, sales_order,
--                     order_item
--                     -> cada uno lo suyo, y el personal ademas.
--
--   Internas          location, staff, firearm_unit, stock_level, stock_move,
--                     order_event, payment, anmac_filing
--                     -> nadie. Ni anon ni authenticated: ninguna politica les
--                        nombra. Se escriben con service_role o desde las
--                        funciones definer de 0008.
--
-- Dos cosas que hay que tener claras antes de leer:
--
--   * Supabase reparte permisos por defecto sobre todo lo que se cree en
--     `public`. Crear una tabla y olvidar la RLS no deja la tabla «medio
--     protegida»: la deja con select/insert/update/delete para `anon`, que es
--     la clave que va escrita en el HTML. Por eso esto empieza revocando todo.
--
--   * Una tabla con RLS activada y UNA sola politica de select no es media
--     proteccion: es «lee lo tuyo, no escribas nunca», y es la forma mas
--     barata de decir «esto lo escribe el servidor». Se verifica contando
--     politicas.


-- ===========================================================================
-- 1. El suelo: nada se concede solo
-- ===========================================================================

grant usage on schema public to anon, authenticated;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke all on all routines  in schema public from public;

-- Y que lo que se cree manana nazca igual. Hay que nombrar el rol: los valores
-- por defecto de Supabase estan puestos a nombre de postgres.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
-- Esta es la que importa de las funciones: PostgreSQL concede EXECUTE a PUBLIC
-- al crear una funcion, y toda funcion de un esquema expuesto es invocable
-- como POST /rest/v1/rpc/<nombre>. Una definer nueva nace, si nadie lo impide,
-- siendo un endpoint anonimo con privilegios del dueno.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;


-- ===========================================================================
-- 2. Catalogo publico
-- ===========================================================================
--
-- Todas con la misma forma: RLS activada, una politica de select `using
-- (true)` y select para anon. No llevan FORCE porque el dueno tiene que poder
-- escribirlas -- el seed y el back office entran como postgres o service_role.
--
-- `to anon, authenticated` en cada politica no es decoracion: sin el, la
-- politica tambien se evalua para roles que no la necesitan y anade una
-- condicion inutil a la consulta mas frecuente del sitio.

alter table public.licence_regime enable row level security;
drop policy if exists "regimen visible" on public.licence_regime;
create policy "regimen visible" on public.licence_regime
  for select to anon, authenticated using (true);
grant select on public.licence_regime to anon, authenticated;

alter table public.calibre enable row level security;
drop policy if exists "calibre visible" on public.calibre;
create policy "calibre visible" on public.calibre
  for select to anon, authenticated using (true);
grant select on public.calibre to anon, authenticated;

alter table public.brand enable row level security;
drop policy if exists "marca visible" on public.brand;
create policy "marca visible" on public.brand
  for select to anon, authenticated using (true);
grant select on public.brand to anon, authenticated;

alter table public.family enable row level security;
drop policy if exists "familia visible" on public.family;
create policy "familia visible" on public.family
  for select to anon, authenticated using (true);
grant select on public.family to anon, authenticated;

-- Lo descatalogado no se ensena. La ficha nunca lo pedia, y dejarlo fuera aqui
-- evita que un `select *` desde el navegador saque una lista de lo retirado.
alter table public.product enable row level security;
drop policy if exists "producto visible" on public.product;
create policy "producto visible" on public.product
  for select to anon, authenticated using (discontinued_at is null);
grant select on public.product to anon, authenticated;

alter table public.product_variant enable row level security;
drop policy if exists "referencia visible" on public.product_variant;
create policy "referencia visible" on public.product_variant
  for select to anon, authenticated using (true);
grant select on public.product_variant to anon, authenticated;

alter table public.product_photo enable row level security;
drop policy if exists "foto visible" on public.product_photo;
create policy "foto visible" on public.product_photo
  for select to anon, authenticated using (true);
grant select on public.product_photo to anon, authenticated;

alter table public.fx_rate enable row level security;
drop policy if exists "cambio visible" on public.fx_rate;
create policy "cambio visible" on public.fx_rate
  for select to anon, authenticated using (true);
grant select on public.fx_rate to anon, authenticated;

-- Las dos vistas de catalogo. Con security_invoker las politicas de arriba se
-- aplican tambien a traves de ellas: una vista NO sustituye a la RLS, y una
-- vista sin invoker se ejecuta con los permisos de su dueno y se salta la RLS
-- de sus tablas base. Es el agujero por el que, en db/schema.sql,
-- `ammo_consumed` habria ensenado a cualquiera lo que compro cada cliente.
grant select on public.variant_price to anon, authenticated;
grant select on public.fx_today      to anon, authenticated;


-- ===========================================================================
-- 3. Lo del cliente
-- ===========================================================================

-- --- customer --------------------------------------------------------------
--
-- Sin politica de insert (la ficha la crea public.registrar_cliente) y sin
-- politica de delete (un cliente con la venta de un arma detras no se borra;
-- se marca con disabled_at desde el mostrador).
alter table public.customer enable row level security;

grant select on public.customer to authenticated;
-- El grant elige columnas, la RLS elige filas, y hacen falta los dos. El DNI
-- no esta: ata al expediente de ANMaC y lo escribe el mostrador. user_id y
-- disabled_at tampoco: uno es la identidad, el otro la baja.
grant update (full_name, phone, marketing_ok) on public.customer to authenticated;

drop policy if exists "cliente ve su ficha" on public.customer;
create policy "cliente ve su ficha" on public.customer
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.es_staff()));

-- Compara con auth.uid() y no con mi_cliente() a proposito: mi_cliente()
-- consulta esta misma tabla y aqui seria una recursion.
drop policy if exists "cliente edita su ficha" on public.customer;
create policy "cliente edita su ficha" on public.customer
  for update to authenticated
  using      (user_id = (select auth.uid()))
  -- Redundante hoy, porque user_id no esta en el grant de columnas y nadie
  -- puede mover la fila a otro dueno. Se escribe igual: el dia que alguien
  -- amplie el grant, la politica sigue en pie.
  with check (user_id = (select auth.uid()));

-- --- customer_address ------------------------------------------------------
alter table public.customer_address enable row level security;
grant select, insert, update, delete on public.customer_address to authenticated;

drop policy if exists "domicilio propio" on public.customer_address;
create policy "domicilio propio" on public.customer_address
  for all to authenticated
  using      (customer_id = (select public.mi_cliente()))
  -- El with check no se puede omitir en una politica `for all`: el USING no se
  -- aplica al insert, asi que sin esto el insert queda abierto de par en par.
  with check (customer_id = (select public.mi_cliente()));

-- --- credential ------------------------------------------------------------
--
-- Con registered_firearm, la tabla mas sensible del proyecto: numero de CLU y
-- vencimiento de gente que tiene armas en casa.
alter table public.credential enable row level security;

grant select on public.credential to authenticated;
-- verified_at y verified_by NO se conceden, y es la diferencia entre «el
-- cliente dice que tiene CLU» y «el mostrador vio el original». Si el cliente
-- pudiera escribirlas se autorizaria a si mismo a comprar un arma.
grant insert (customer_id, kind, number, issued_on, expires_on, scan_path)
  on public.credential to authenticated;
grant update (number, issued_on, expires_on, scan_path)
  on public.credential to authenticated;

drop policy if exists "credencial propia" on public.credential;
create policy "credencial propia" on public.credential
  for select to authenticated
  using (customer_id = (select public.mi_cliente()) or (select public.es_staff()));

drop policy if exists "alta de credencial propia" on public.credential;
create policy "alta de credencial propia" on public.credential
  for insert to authenticated
  with check (customer_id = (select public.mi_cliente()));

drop policy if exists "edita credencial propia" on public.credential;
create policy "edita credencial propia" on public.credential
  for update to authenticated
  using      (customer_id = (select public.mi_cliente()))
  with check (customer_id = (select public.mi_cliente()));

-- Se puede retirar un escaneo mal subido, pero no uno ya comprobado: eso seria
-- borrar el rastro de una verificacion.
drop policy if exists "borra credencial sin verificar" on public.credential;
create policy "borra credencial sin verificar" on public.credential
  for delete to authenticated
  using (customer_id = (select public.mi_cliente()) and verified_at is null);

-- --- registered_firearm ----------------------------------------------------
--
-- Solo lectura, y esto no es negociable: escribir aqui es decir «tengo un arma
-- de este calibre», y de esa frase sale el cupo de municion de la TCCM. Quien
-- pueda insertar filas aqui se vende a si mismo municion de cualquier calibre.
-- Lo escribe el mostrador con el papel delante.
alter table public.registered_firearm enable row level security;
grant select on public.registered_firearm to authenticated;

drop policy if exists "armas propias" on public.registered_firearm;
create policy "armas propias" on public.registered_firearm
  for select to authenticated
  using (customer_id = (select public.mi_cliente()) or (select public.es_staff()));

-- --- cart y cart_item ------------------------------------------------------
--
-- Lo unico con CRUD completo en toda la base.
alter table public.cart enable row level security;
grant select, insert, update, delete on public.cart to authenticated;

drop policy if exists "cesta propia" on public.cart;
create policy "cesta propia" on public.cart
  for all to authenticated
  using      (customer_id = (select public.mi_cliente()))
  with check (customer_id = (select public.mi_cliente()));

alter table public.cart_item enable row level security;
grant select, insert, update, delete on public.cart_item to authenticated;

-- El exists depende de la fila, asi que no se saca del bucle: es una busqueda
-- por clave primaria de cart por cada linea. Para una cesta de diez lineas da
-- igual. Y hereda: dentro de la politica, la subconsulta sobre cart aplica
-- ademas la RLS de cart, asi que si un dia se endurece aquella, esta la sigue.
drop policy if exists "lineas de la cesta propia" on public.cart_item;
create policy "lineas de la cesta propia" on public.cart_item
  for all to authenticated
  using      (exists (select 1 from public.cart c
                       where c.id = cart_item.cart_id))
  with check (exists (select 1 from public.cart c
                       where c.id = cart_item.cart_id));

-- --- sales_order y order_item ----------------------------------------------
--
-- Lectura y nada mas. Sin insert, sin update, sin delete: un pedido se crea
-- llamando a public.crear_pedido(), que recalcula precio, regimen y cupo. Un
-- cliente que pudiera insertar order_item se pondria el precio que quisiera y
-- se saltaria el cupo de la TCCM poniendo cartridges = 0.
alter table public.sales_order enable row level security;
grant select on public.sales_order to authenticated;

drop policy if exists "pedidos propios" on public.sales_order;
create policy "pedidos propios" on public.sales_order
  for select to authenticated
  using (customer_id = (select public.mi_cliente()) or (select public.es_staff()));

alter table public.order_item enable row level security;
grant select on public.order_item to authenticated;

-- Sin filtro por cliente aqui a proposito: la RLS de sales_order ya lo pone
-- dentro de este exists, y repetirlo serian dos sitios decidiendo lo mismo.
drop policy if exists "lineas de pedido propio" on public.order_item;
create policy "lineas de pedido propio" on public.order_item
  for select to authenticated
  using (exists (select 1 from public.sales_order o
                  where o.id = order_item.order_id));


-- ===========================================================================
-- 4. Las internas
-- ===========================================================================
--
-- RLS activada, FORCE, y una sola politica que nombra a `postgres`.
--
-- Por que FORCE si luego se le abre la puerta al dueno: sin FORCE, el dueno de
-- la tabla esta exento de su propia RLS y esa exencion es implicita e
-- invisible. Con FORCE + una politica que dice `to postgres`, la lista blanca
-- esta escrita. `postgres` no es un rol al que se conecte nadie desde la API
-- -- PostgREST entra como anon o authenticated -- y es el dueno con el que
-- corren las funciones definer de 0008 y el que aplica el seed. Sin esa
-- politica, el propio seed no podria insertar un asiento.
--
-- Ninguna de las ocho tiene politica para anon ni para authenticated, y eso NO
-- es un olvido: es la forma de decir «esto no se ve desde el navegador».

alter table public.location enable row level security;
alter table public.location force row level security;
drop policy if exists "solo el dueno" on public.location;
create policy "solo el dueno" on public.location
  for all to postgres using (true) with check (true);

alter table public.staff enable row level security;
alter table public.staff force row level security;
drop policy if exists "solo el dueno" on public.staff;
create policy "solo el dueno" on public.staff
  for all to postgres using (true) with check (true);

alter table public.firearm_unit enable row level security;
alter table public.firearm_unit force row level security;
drop policy if exists "solo el dueno" on public.firearm_unit;
create policy "solo el dueno" on public.firearm_unit
  for all to postgres using (true) with check (true);

alter table public.stock_level enable row level security;
alter table public.stock_level force row level security;
drop policy if exists "solo el dueno" on public.stock_level;
create policy "solo el dueno" on public.stock_level
  for all to postgres using (true) with check (true);

alter table public.stock_move enable row level security;
alter table public.stock_move force row level security;
drop policy if exists "solo el dueno" on public.stock_move;
create policy "solo el dueno" on public.stock_move
  for all to postgres using (true) with check (true);

alter table public.order_event enable row level security;
alter table public.order_event force row level security;
drop policy if exists "solo el dueno" on public.order_event;
create policy "solo el dueno" on public.order_event
  for all to postgres using (true) with check (true);

alter table public.payment enable row level security;
alter table public.payment force row level security;
drop policy if exists "solo el dueno" on public.payment;
create policy "solo el dueno" on public.payment
  for all to postgres using (true) with check (true);

alter table public.anmac_filing enable row level security;
alter table public.anmac_filing force row level security;
drop policy if exists "solo el dueno" on public.anmac_filing;
create policy "solo el dueno" on public.anmac_filing
  for all to postgres using (true) with check (true);

-- Un asiento no se reescribe ni siquiera con service_role, que se salta la
-- RLS. El disparador de 0003 lo impide de verdad; esto le quita ademas el
-- permiso, para que el error salga antes y se lea mejor.
revoke update, delete on public.stock_move from anon, authenticated;


-- ===========================================================================
-- 5. Las funciones de identidad
-- ===========================================================================
--
-- El revoke masivo de arriba les quito el EXECUTE que PostgreSQL concede a
-- PUBLIC al crearlas; aqui se devuelve solo a quien lo necesita. mi_cliente()
-- y es_staff() las llaman las politicas, que se evaluan con los privilegios
-- del que consulta, asi que sin este grant no funciona ni una.
grant execute on function public.mi_cliente()  to authenticated;
grant execute on function public.es_staff()    to authenticated;
grant execute on function public.registrar_cliente(text, text) to authenticated;

-- Nada para anon: un usuario sin sesion no tiene cliente, no tiene rol y no se
-- da de alta a si mismo por RPC (eso es auth.signUp).


-- ===========================================================================
-- 6. Comprobar
-- ===========================================================================
--
-- Las cuatro consultas que hay que pasar despues de tocar este fichero. Estan
-- en el README para copiarlas de una vez; aqui van porque este es el sitio
-- donde se rompen.
--
--   -- 1. Lo que puede tocar anon tiene que caber en la cabeza.
--   select table_name, privilege_type
--     from information_schema.role_table_grants
--    where grantee = 'anon' and table_schema = 'public' order by 1, 2;
--
--   -- 2. Tablas de public sin RLS: vacio.
--   select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
--    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
--
--   -- 3. Definer sin search_path fijo: vacio.
--   select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.prosecdef
--      and coalesce(array_to_string(p.proconfig,','),'') not like '%search_path%';
--
--   -- 4. Vistas sin security_invoker: vacio.
--   select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
--    where n.nspname='public' and c.relkind='v'
--      and coalesce((select option_value from pg_options_to_table(c.reloptions)
--                     where option_name='security_invoker'),'off')='off';
