-- 0007_indices.sql - un indice por consulta que existe, y ninguno mas.
--
-- Cada bloque dice a que consulta sirve. Un indice sin consulta detras es
-- escritura mas lenta y espacio a cambio de nada, asi que si algun dia una de
-- estas consultas desaparece, el indice se va con ella.
--
-- Lo que NO esta aqui, porque ya lo cubre otra cosa:
--
--   customer(user_id)              unique en la columna. Es el indice mas
--                                  importante de la base: mi_cliente() lo
--                                  consulta una vez por politica y por fila.
--   cart(customer_id)              unique en la columna.
--   cart_item(cart_id, variant_id) clave primaria.
--   stock_level(variant_id, ...)   clave primaria.
--   sales_order(code)              unique en la columna.
--   product_variant(product_id)    primera columna del unique (product_id,
--                                  calibre_id); un indice compuesto sirve
--                                  para consultar por su prefijo.
--   firearm_unit(variant_id)       primera columna del unique (variant_id,
--                                  serial).


-- ===========================================================================
-- 1. Lo que hace correr a la RLS
-- ===========================================================================
--
-- Cada politica de 0006 termina en `customer_id = public.mi_cliente()`. Sin
-- indice eso es un recorrido secuencial de la tabla ENTERA por cada consulta
-- de cada cliente: con mil clientes y cien mil filas, cada uno paga por los
-- otros novecientos noventa y nueve. Es el caso en que un indice que falta no
-- se nota en pruebas y se nota mucho en produccion.

create index if not exists customer_address_cliente
  on public.customer_address (customer_id);

create index if not exists credential_cliente
  on public.credential (customer_id);

create index if not exists registered_firearm_cliente
  on public.registered_firearm (customer_id);

-- Los pedidos se piden siempre del mismo modo: los mios, el ultimo primero.
create index if not exists sales_order_cliente
  on public.sales_order (customer_id, placed_at desc nulls last);

-- La politica de order_item comprueba el pedido padre, y la ficha del pedido
-- pide sus lineas. Las dos entran por aqui.
create index if not exists order_item_pedido
  on public.order_item (order_id);


-- ===========================================================================
-- 2. Credenciales: lo que decide si se puede vender
-- ===========================================================================
--
-- La pregunta real no es «que credenciales tiene» sino «tiene HOY una CLU
-- comprobada y sin vencer». Es un indice parcial porque una credencial vencida
-- o sin verificar no sirve para nada y no merece ocupar sitio en el arbol.
--
-- `expires_on` va en el indice y no en el WHERE del indice: una condicion
-- contra current_date no es inmutable y Postgres no la admite ahi. Lo que se
-- filtra al crearlo es lo que no cambia con el tiempo.
create index if not exists credential_vigente
  on public.credential (customer_id, kind, expires_on desc)
  where verified_at is not null;


-- ===========================================================================
-- 3. Catalogo
-- ===========================================================================

-- «Ensename los rifles»: la baldosa de familia y el chip del filtro.
create index if not exists product_familia
  on public.product (family_id)
  where discontinued_at is null;

-- «Que trabaja de Beretta»: la marquesina de marcas lleva a esto.
create index if not exists product_marca
  on public.product (brand_id)
  where discontinued_at is null;

-- Filtrar por calibre atraviesa las referencias, no los productos: un mismo
-- rifle existe en .308 y en .30-06 y son dos filas distintas.
create index if not exists product_variant_calibre
  on public.product_variant (calibre_id);

-- La ficha pide una sola foto, la principal. El parcial deja fuera las demas,
-- que hoy son la mayoria de las filas.
create index if not exists product_photo_principal
  on public.product_photo (product_id)
  where is_primary;


-- ===========================================================================
-- 4. Existencias
-- ===========================================================================

-- El libro de asientos de una referencia, en orden. Es lo que se mira cuando
-- el saldo no cuadra, que es justo cuando hay prisa.
create index if not exists stock_move_referencia
  on public.stock_move (variant_id, at desc);

-- La vida de un arma concreta: la mayoria de los asientos no llevan unidad.
create index if not exists stock_move_unidad
  on public.stock_move (unit_id)
  where unit_id is not null;

-- «Que hay para vender de esta referencia». Lo consulta public.disponible()
-- en cada linea de cada reserva, asi que el parcial vale la pena: el dia que
-- haya diez anos de armas vendidas, `in_stock` seran cuatro filas de mil.
create index if not exists firearm_unit_disponible
  on public.firearm_unit (variant_id)
  where status = 'in_stock';

-- El CUIM lo asigna ANMaC y es unico en el pais: dos armas con el mismo CUIM
-- es un error de captura, y mas vale que reviente al escribirlo que descubrirlo
-- el dia de una inspeccion. Parcial porque el arma entra en el inventario
-- antes de tener CUIM, y hasta entonces la columna es nula.
create unique index if not exists firearm_unit_cuim
  on public.firearm_unit (cuim)
  where cuim is not null;


-- ===========================================================================
-- 5. Pedidos abiertos
-- ===========================================================================

-- Lo que el mostrador tiene entre manos. Son pocos frente al historico, asi
-- que el parcial es un indice diminuto que responde al instante.
create index if not exists sales_order_abiertos
  on public.sales_order (status, placed_at)
  where status in ('draft', 'reserved', 'documents', 'ready');

-- public.vencer_reservas() busca exactamente esto y nada mas.
create index if not exists sales_order_vencen
  on public.sales_order (expires_at)
  where status = 'reserved';

-- Cuanto se llevo comprometido de una referencia en pedidos que aun no se han
-- entregado. Es la mitad de la cuenta de public.disponible().
create index if not exists order_item_referencia
  on public.order_item (variant_id);

-- El cupo de municion de la TCCM se cuenta por calibre y solo mira lineas que
-- llevan cartuchos, que son una minoria del historico.
create index if not exists order_item_municion
  on public.order_item (calibre_id, order_id)
  where cartridges > 0;

-- La historia de un pedido, en orden, para la ficha del mostrador.
create index if not exists order_event_pedido
  on public.order_event (order_id, at);

create index if not exists payment_pedido
  on public.payment (order_id);


-- ===========================================================================
-- 6. Tramites ANMaC
-- ===========================================================================

create index if not exists anmac_filing_cliente
  on public.anmac_filing (customer_id);

-- «Que esta esperando respuesta»: es la lista con la que se trabaja.
create index if not exists anmac_filing_pendientes
  on public.anmac_filing (status, submitted_at)
  where resolved_at is null;


-- ===========================================================================
-- 7. Particion: por que no, todavia
-- ===========================================================================
--
-- La tentacion es particionar stock_move y sales_order por fecha desde el
-- principio. Los numeros dicen que no: una armeria con mucho movimiento hace
-- del orden de 5.000 ventas al ano, y cada venta deja una linea de pedido, dos
-- o tres asientos y unos pocos eventos. Son decenas de miles de filas al ano,
-- no millones. Postgres no se despeina hasta bien pasados los diez millones, y
-- para entonces estos indices siguen valiendo.
--
-- Lo que si es irreversible es la forma de las tablas, y por eso `at` y
-- `placed_at` son `timestamptz` y no `date`: el dia que haga falta particionar
-- por rango, la clave ya esta ahi y la migracion es mecanica. Particionar hoy
-- solo compra complejidad -- claves primarias que tienen que incluir la fecha,
-- FK que dejan de poder apuntar a la tabla padre -- a cambio de nada.
