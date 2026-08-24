-- 0004_clientes.sql - el cliente colgado de auth.users, sus papeles y su
-- domicilio, mas las dos funciones de identidad de las que cuelga toda la RLS.
--
-- Lo que desaparece de db/schema.sql y por que:
--
--   customer.password_hash   lo lleva auth.users.encrypted_password. Una
--                            columna con hashes en un esquema expuesto es un
--                            pasivo aunque la RLS este bien: basta una
--                            politica mal escrita para regalarlos todos.
--   customer_session         es GoTrue reimplementado peor. auth.sessions y
--                            auth.refresh_tokens ya hacen emision, caducidad y
--                            revocacion. De paso se van `ip` y `user_agent`,
--                            que eran dato personal guardado para siempre y
--                            sin politica de retencion (Ley 25.326).
--   unique (lower(email))    auth.users manda sobre la identidad. Dos filas
--                            con el mismo correo son ahora un estado valido:
--                            la ficha de mostrador y la cuenta web de la misma
--                            persona, hasta que alguien las funda a mano.

create table if not exists public.customer (
  id           bigint generated always as identity primary key,
  -- El vinculo con la cuenta web, no la identidad del cliente: la armeria
  -- vende de mostrador a gente que no abrira una sesion en su vida, asi que
  -- esto es nullable y no es la clave primaria.
  --
  -- `on delete set null`, jamas cascade: un cascade desde auth.users se
  -- llevaria la ficha y, tras ella, credenciales y armas registradas. La
  -- cuenta web se borra; el registro de a quien se le vendio un arma, no.
  -- Efecto lateral bueno: una ficha con user_id nulo deja de ser legible por
  -- la API sola, porque ninguna politica la alcanza.
  user_id      uuid unique references auth.users(id) on delete set null,
  email        text,
  full_name    text not null default '',
  phone        text,
  document_id  text,                       -- DNI
  marketing_ok boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  disabled_at  timestamptz
);

comment on column public.customer.email is
  'Copia, no autoridad: auth.users.email puede ser nulo (alta por telefono) y '
  'el cliente de mostrador no tiene fila en auth. El mostrador necesita el '
  'correo sin tocar el esquema auth.';

drop trigger if exists customer_touch on public.customer;
create trigger customer_touch before update on public.customer
  for each row execute function public.touch_updated_at();

-- Quien es personal. Vive aparte de customer y sin politica ninguna: una
-- tabla de roles con un update abierto es la escalada de privilegios servida
-- en bandeja. Se escribe con service_role, nunca por la API.
create table if not exists public.staff (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  role     text not null check (role in ('mostrador', 'armero', 'admin')),
  since    date not null default current_date
);

-- Municion y accesorios se envian; las armas se entregan en mano. Por eso el
-- domicilio existe pero el pedido no lo referencia: se congela en texto
-- (sales_order.ship_to), porque una direccion editada despues no puede
-- cambiar a donde se envio una caja de cartuchos.
create table if not exists public.customer_address (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references public.customer(id) on delete cascade,
  label        text,                       -- 'casa', 'club de tiro'
  street       text not null,
  city         text not null,
  province     text,
  postal_code  text,
  country      text not null default 'AR',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- La CLU y la TCCM son documentos con vencimiento, no casillas de si/no.
create table if not exists public.credential (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references public.customer(id) on delete cascade,
  kind         text not null
    check (kind in ('clu', 'tccm', 'collector', 'sport_licence')),
  number       text not null,
  issued_on    date,
  expires_on   date,
  verified_at  timestamptz,                -- se comprueba el original en mano
  verified_by  text,
  scan_path    text,                       -- objeto de un bucket PRIVADO
  created_at   timestamptz not null default now(),
  -- La clave incluye issued_on, que en db/schema.sql no estaba: una CLU se
  -- renueva conservando el numero, asi que con (customer_id, kind, number) la
  -- unica salida era pisar expires_on y perder el historico. Contra la regla
  -- «nada se borra».
  unique (customer_id, kind, number, issued_on)
);

comment on column public.credential.scan_path is
  'Ruta del objeto en Storage, nunca una URL firmada: las firmadas caducan. El '
  'bucket es privado -- es la foto de una CLU, con nombre, domicilio y numero.';

-- El cliente puede corregir el numero o el vencimiento de su credencial, y ahi
-- hay un agujero que no tapa ninguna politica: subir la CLU buena, esperar a
-- que el mostrador la marque como vista, y cambiar despues el numero. La
-- verificacion quedaria apuntando a otro papel.
--
-- Un disparador `before` puede escribir columnas sobre las que el rol que
-- ejecuta no tiene UPDATE: los privilegios de columna se comprueban contra las
-- que nombra la sentencia, no contra las que toca el disparador. Parece
-- sospechoso y es correcto.
create or replace function public.credencial_sin_verificar() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.number is distinct from old.number
  or new.expires_on is distinct from old.expires_on then
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists credential_reverifica on public.credential;
create trigger credential_reverifica before update on public.credential
  for each row execute function public.credencial_sin_verificar();

-- Las armas que el cliente ya tiene registradas. La TCCM cuelga de ellas: no
-- se vende municion de un calibre que el cliente no tiene en ningun arma.
create table if not exists public.registered_firearm (
  id             bigint generated always as identity primary key,
  customer_id    bigint not null references public.customer(id) on delete cascade,
  cuim           text not null,
  calibre_id     smallint references public.calibre(id),
  description    text,
  unit_id        bigint references public.firearm_unit(id),  -- si la vendimos nosotros
  registered_on  date,
  unique (customer_id, cuim)
);


-- ===========================================================================
-- Identidad: las dos funciones de las que cuelgan todas las politicas
-- ===========================================================================
--
-- Viven aqui y no en 0008 porque 0006 escribe politicas que las nombran, y una
-- politica no se puede crear si la funcion todavia no existe.
--
-- Las dos van envueltas en `(select auth.uid())` y no `auth.uid()` a secas.
-- Envuelto, el planificador lo convierte en un InitPlan y lo evalua una vez
-- por consulta; suelto, una vez por fila. No cambia ni una letra del
-- significado y en una tabla grande es la diferencia entre 3 ms y 400 ms.

-- De uid a cliente. Una sola vez, aqui: si cada politica repitiera el join, un
-- dia dirian cosas distintas -- el mismo motivo por el que REGIMEN vive solo
-- en js/catalog.js.
--
-- Es SECURITY DEFINER y tiene que serlo: la politica de `customer` no puede
-- llamarla si la funcion consulta `customer` con los permisos de quien
-- pregunta, porque seria una recursion. Como definer corre como el dueno de la
-- tabla, que esta exento de la RLS de customer, y la recursion no ocurre. Por
-- eso, ademas, la politica de customer compara con auth.uid() directamente y
-- no con esta funcion.
create or replace function public.mi_cliente() returns bigint
language sql stable security definer
set search_path = ''
as $$
  select c.id
    from public.customer c
   where c.user_id = (select auth.uid())
     and c.disabled_at is null
$$;

-- Es definer y es seguro, y conviene saber por que, porque es el test que hay
-- que aplicar a cualquier otra: una funcion definer es segura cuando su
-- resultado depende solo de auth.uid() y no acepta ningun argumento que
-- ensanche lo que devuelve. Esta no acepta nada. `es_staff(p_uid uuid)` seria
-- un agujero.
--
-- El rol se lee de la tabla en cada consulta y no del JWT: meterlo en
-- app_metadata ahorra la consulta pero congela el rol hasta que caduque el
-- token, y quitarle el acceso a un empleado tardaria hasta una hora. En una
-- armeria eso no vale.
create or replace function public.es_staff() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s
                  where s.user_id = (select auth.uid()))
$$;

-- El alta de la ficha. NO es un disparador sobre auth.users, y es a proposito:
-- el esquema auth es de Supabase y no se toca -- una actualizacion de GoTrue
-- se lleva por delante lo que le hayas colgado -- y ademas cualquier excepcion
-- dentro de ese disparador aborta el registro con un «Database error saving
-- new user» opaco. Aqui la llama la aplicacion despues del alta, y si falla
-- falla sola.
--
-- Lo que esta funcion NO hace, y es la trampa que mas cara sale: enlazar por
-- correo con una ficha de mostrador que ya exista. Alguien se da de alta como
-- ana@example.com sin confirmar nada y se queda con el DNI de Ana, su numero
-- de CLU y la lista de armas que tiene en casa. Fundir una ficha de mostrador
-- con una cuenta web es una operacion de mostrador, con la persona delante.
create or replace function public.registrar_cliente(
  p_nombre text default null, p_telefono text default null)
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  bigint;
begin
  if v_uid is null then
    raise exception 'no hay sesion' using errcode = '42501';
  end if;

  insert into public.customer (user_id, email, full_name, phone)
       select v_uid, u.email,
              coalesce(nullif(btrim(p_nombre), ''), ''),
              nullif(btrim(p_telefono), '')
         from auth.users u where u.id = v_uid
  on conflict (user_id) do nothing;

  select c.id into v_id from public.customer c where c.user_id = v_uid;
  return v_id;
end;
$$;
