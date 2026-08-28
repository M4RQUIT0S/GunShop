# Armería Alcántara — GunShop en Next.js

Tienda de armería (tiro deportivo y caza) para el mercado argentino. Next.js
16 (App Router) + React 19 + Supabase (Postgres con RLS). El catálogo, las
familias y el cambio del día se leen de Supabase en cada request; no hay
datos hardcodeados en la app.

Rama `ecommerce-next`. `main` sigue siendo el sitio estático viejo
(`D:\GunShop`, sin build) — no se toca desde acá.

## Regla de trabajo (importante)

**Escribe siempre el progreso en `PLAN.md` y haz commit al cerrar cada fase.**

El chat se pierde; el disco no. `PLAN.md` es un cuaderno de trabajo, no
documentación: se borra cuando la migración termina. Si una sesión se corta a
mitad, la siguiente arranca leyendo `PLAN.md` y `git log`, no reconstruyendo
la conversación.

## Cómo se comprueba

```
npx next build                                                          # compila y tipa
node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts" # 20 pruebas
node db/supabase/revisa.js                                              # lee las migraciones sin necesitar base
```

`node --test test/` (sin fichero) no resuelve el directorio en Node 24; por
eso el loader apunta al glob `test/*.test.ts` explícito. `test/resuelve-ts.mjs`
es un hook de ~10 líneas (`node:module`, sin dependencia nueva) que reintenta
la resolución poniendo `.ts` cuando falla — hace falta porque los imports
internos de `lib/` van sin extensión (`./supabase`), que es lo que
`moduleResolution: "bundler"` de `tsconfig.json` espera pero el ESM nativo de
Node no resuelve solo.

`test/slug.test.ts` pega contra el Supabase real (necesita
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en
`.env.local`); `test/buscar.test.ts` y `test/modoventa.test.ts` usan fixtures
locales y no tocan la base.

`db/supabase/prueba.sql` prueba una venta entera contra una base ya aplicada
y sembrada, y hace `rollback`: no deja ni una fila. No está automatizado
(necesita psql contra el proyecto real), se corre a mano cuando se toca
`db/supabase/`.

## Rutas y arquitectura

Tres páginas, todas Server Components:

| Ruta | Fichero | Qué hace |
|---|---|---|
| `/` | `app/page.tsx` | Portada: rieles de láminas, cifras del catálogo, baldosas de familias, marquesina de marcas |
| `/catalogo` | `app/catalogo/page.tsx` | Filtros de dos niveles (familia → subcategoría) + calibre, todo por `?familia=&sub=&calibre=&q=` en la URL |
| `/producto/[slug]` | `app/producto/[slug]/page.tsx` | Ficha con CTA por régimen, `generateMetadata()` con Open Graph |
| `/privacidad` | `app/privacidad/page.tsx` | Política de privacidad. La única página sin un solo dato de Supabase, así que se prerenderiza entera |

`app/layout.tsx` es el único punto que monta el "chrome" compartido: `<Nav/>`
(cabecera + menú), `<Footer/>`, `<Pie/>` (mide el pie fijo y le da hueco al
resto de la página) y los cuatro `<dialog>` (cesta, cuenta, búsqueda,
consulta) envueltos en sus cuatro `Provider` de contexto. Todas las páginas
heredan eso; ninguna monta su propia cabecera.

### Server vs Client Components

Regla del proyecto: `'use client'` sólo en lo que necesita interactividad;
todo lo que sólo lee Supabase y renderiza queda de servidor.

**Server** (leen `lib/catalogo.ts`, sin estado): `app/page.tsx`,
`app/catalogo/page.tsx`, `app/producto/[slug]/page.tsx`, `app/layout.tsx`,
`Nav.tsx`, `Footer.tsx`.

**Client** (estado, contexto o listeners del DOM): los cuatro `*Context.tsx`
(`CartContext`, `AccountContext`, `SearchContext`, `ConsultaContext`) y los
cuatro paneles que los consumen (`CartPanel`, `AccountPanel`, `SearchPanel`,
`ConsultaPanel`), `NavMenu.tsx` (menú en cascada: pinta una columna por nivel abierto del
árbol que le pasa `Nav.tsx`, sin saber cuántos hay. Más `inert` sobre el
resto de la página), `HeaderActions.tsx` (los tres botones de la barra — separado
de `Nav.tsx` porque éste es Server y no puede llevar `onClick`), `CartCount.tsx`,
`ProductoCTA.tsx` (botón de la ficha, pregunta a `CartContext` cuántas
unidades hay — no guarda estado propio), `RielLaminas.tsx`, `Marquee.tsx`,
`Scrollicono.tsx`, `Reveal.tsx` (dos clases + `IntersectionObserver`, puerto
de `js/reveal.js` del sitio viejo).

## `lib/` — dónde vive cada decisión

| Fichero | Qué hace |
|---|---|
| `lib/supabase.ts` | Cliente con la clave publicable. Revienta el **build** (no el arranque) si faltan las env vars — más vale un despliegue rojo que uno verde sirviendo una tienda vacía |
| `lib/regimen.ts` | **Fuente única del régimen legal ANMaC.** Sin imports a propósito: se prueba sola, sin base ni env vars |
| `lib/catalogo.ts` | Todas las consultas a Supabase: `listaProductos()`, `productoPorSlug()`, `familias()`, `subsPorFamilia()`, `cambio()`, `precio()`, `slugDe()`, y los filtros puros `filtrarPorSub()`/`filtrarPorCalibre()`/`filtrarPorFamilia()`/`cuentaPorRama()`. Reexporta `lib/familia.ts` entero |
| `lib/familia.ts` | **El árbol de familias, sin tocar la base.** `raices()`, `hijas()`, `rama()`, `arbolMenu()`. Aparte de `catalogo.ts` por lo mismo que `regimen.ts`: aquel importa el cliente de Supabase al cargarse y nada de dentro se puede probar sin `.env.local` |
| `lib/cesta.ts` | Lógica de la reserva sin DOM: `faltas()` (qué impide reservar) y `reserva()` (pedido + `mailto:`) |
| `lib/cuenta.ts` | Sólo el tipo `Perfil` (`{nombre, email}`) — vive aparte para que `cesta.ts` no dependa de un componente de React |
| `lib/buscar.ts` | `llano()`/`buscar()`: búsqueda sin acentos, AND entre palabras, sobre nombre + ficha técnica |

### `lib/regimen.ts` — régimen legal ANMaC

Todo lo que decide si un producto se puede pagar sin credencial sale de acá,
y de acá solamente:

- `Regimen`: `'libre' | 'aire-comprimido' | 'uso-civil' | 'uso-civil-condicional' | 'requiere-tccm'`
  — llega de `product.licence_regime` (o el de la familia si el producto no
  lo pisa) en Supabase, no se deriva del nombre ni de ninguna etiqueta en
  español.
- `modoVenta(regimen)` → `'direct_checkout' | 'validated_checkout' | 'inquiry_only'`.
  Es una función pura del régimen, nunca una columna aparte: si viviera en
  dos sitios, el día que alguien cambie el régimen de una familia y no el
  modo, la tienda vendería un arma con checkout directo. Un régimen
  desconocido cae a `inquiry_only` — lo contrario (tratarlo como venta libre)
  es entregar sin pedir la credencial.
- `requisitos(regimen)` → `{ clu, tccm, certificado }`, la tabla de qué papel
  pide ANMaC para llevarse cada cosa. **Hoy no la llama nadie**: desde que la
  página no vende nada controlado, `lib/cesta.ts` corta con
  `comprableDirecto()` y no gradúa qué credencial falta. Se conserva porque es
  el art. 5 del decreto 395/75 escrito una sola vez, y volver a derivarlo el
  día que la munición se venda en línea es más caro que dejarlo.

`test/modoventa.test.ts` cubre que ningún régimen regulado caiga en
`direct_checkout`. Al añadir un régimen nuevo, se toca sólo este fichero —
`ProductoCTA.tsx` y `lib/cesta.ts` ya leen de acá, no hay una segunda tabla
que sincronizar.

## Supabase

`db/supabase/migrations/0001..0011` son el esquema real, aplicado contra el
proyecto de producción. `0006_rls.sql` revoca todo y concede `select` sólo
sobre las tablas de catálogo (`brand`, `product`, `product_variant`,
`product_photo`, `family`, `calibre`, `licence_regime`, `fx_rate`) — la clave
publicable que viaja al navegador no alcanza existencias, unidades con
número de serie, clientes ni pedidos.

### La familia es un árbol (0010)

`family.parent_id` apunta a la propia `family`. `NULL` = familia raíz: las
seis que salen en las baldosas de la portada y en los chips del catálogo. Hoy
sólo Munición tiene rama:

    Munición ─┬─ Balas          ← munición metálica: rifle y arma corta (11)
              ├─ Cartuchos      ← munición de escopeta, 12/70 y 12/76 (4)
              └─ Recarga ─┬─ Accesorios
                          ├─ Equipos
                          ├─ Fulminantes
                          ├─ Pólvoras
                          └─ Puntas

Se resolvió con una columna y no con una tabla nueva porque `family` ya tiene
su política de RLS y su `grant select` de `0006_rls.sql`; una tabla nueva
llegaría sin ninguna de las dos.

Consecuencias que hay que tener presentes al tocar el catálogo:

- **`?familia=X` significa «X y su rama entera»**, no `p.familia === X`. Lo
  resuelve `filtrarPorFamilia()`; contar plano daría cero en Munición, que ya
  no tiene producto propio. Las baldosas y los chips cuentan con
  `cuentaPorRama()`.
- Los slugs de las hijas de Recarga van con prefijo (`recarga-accesorios`)
  porque `accesorios` ya es una familia raíz y `family.slug` es único. El
  rótulo que se lee es `name`, que sí se repite.
- Las ocho ramas heredan `requiere-tccm` de Munición **a propósito**, incluidas
  las que a primera vista no son munición: errar del lado estricto obliga a
  pisar el régimen a mano para vender libre; al revés se entrega sin pedir la
  credencial el día que alguien cargue pólvora en la rama equivocada.
- El menú deriva su forma de aquí: los hijos de una familia son sus familias
  hijas, y si no tiene ninguna, los `kind` de sus productos. Por eso Rifles
  sigue abriéndose en sus seis `kind` sin caso especial, y Balas —hoja del
  árbol pero con once productos— también. `test/arbol.test.ts` lo fija.

**Bala no es cartucho (0011).** El reparto lo decide el calibre, no el nombre
comercial: todo lo de `12/70` y `12/76` es cartucho de escopeta y se queda en
Cartuchos; el resto (`.308`, `6,5 CM`, `.30-06`, `.22 LR`) es bala y cuelga de
Balas. Los `kind` acompañan —«Bala de caza», «Cartucho de caza»— porque son el
tercer nivel del menú: dejar «Cartuchería metálica» colgando de Balas volvía a
mezclar las dos palabras justo donde se acaban de separar. Ahí cayeron también
los duplicados sin tilde que arrastraban los tres productos de muestra de
`db/supabase/seed.sql`.

Las cinco ramas de Recarga tienen dos referencias cada una y **ninguna lleva
`cartridges_per_box`**, ni siquiera los fulminantes que vienen en cajas de mil:
esa columna es el cupo anual de la TCCM contado en cartuchos, y un fulminante
suelto no lo es. Las diez heredan `requiere-tccm` de la familia, prensas y
comparadores incluidos — herramienta marcada de más se corrige con un
`update`, pólvora marcada de menos se entrega sin pedir la credencial.

Variables de entorno (`.env.local`, no viaja al repo — ver `.env.example`):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | endpoint del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave publicable, protegida por RLS |

En Vercel hay que darlas de alta en **Production, Preview y Development**
(*Project → Settings → Environment Variables*); sin ellas el build falla, no
el arranque (ver `lib/supabase.ts`).

Supabase ya tiene los 76 productos del catálogo (más 3 que traía la semilla
de muestra) cargados vía `tools/seed-supabase.js` → `db/supabase/seed-productos.sql`,
idempotente (`on conflict ... do update/nothing`). No hace falta volver a
correrlo salvo que cambie `D:\GunShop\js\catalog.js` en el repo del sitio
estático — es de ahí de donde lee, no de ningún fichero de esta rama.

`db/schema.sql`, `db/seed.sql` y `db/smoke.sql` (en `db/`, no en
`db/supabase/`) son el prototipo anterior a Supabase: un esquema Postgres
plano, probado a mano con Docker. Ya no lo usa nada de la app ni de los
tests automatizados — `db/supabase/` es el esquema real. Se dejan en el
repo como referencia de las decisiones de modelado (existencias por
asiento, dinero en centavos, línea de pedido con copia del régimen), que
`db/supabase/README.md` retoma.

## Cesta, cuenta, búsqueda y consulta

Los cuatro botones de la barra abren un `<dialog>` modal — foco atrapado y
cierre con Escape vienen gratis del elemento nativo. Cada panel tiene su
`*Context.tsx` (Context de React + `localStorage`), que es lo que reemplaza
al singleton `window.GunShop.*` del sitio estático: header, ficha y panel
necesitan ver el mismo estado.

| Contexto | Guarda en `localStorage` | Qué hace |
|---|---|---|
| `CartContext` | `gunshop:cesta` | `{id: unidades}`, no la ficha — el producto se resuelve contra `listaProductos()` fresco al montar, así un precio nuevo entra solo |
| `AccountContext` | `gunshop:cuenta` | Identidad de contacto: **sólo nombre y correo**. La pone el acceso con Google (Supabase Auth) o se escribe a mano. Sin contraseña propia y **sin CLU ni TCCM** — ver «Cuenta: Google, y ninguna credencial» |
| `SearchContext` | nada | Sólo el tick de "abrir panel"; el filtrado corre en `lib/buscar.ts` |
| `ConsultaContext` | nada | `abrir({titulo, rotulo, mensaje})` — cualquier CTA puede abrir el panel de consulta prellenado |

**No hay reserva real contra el backend.** Hay sesión (`auth.uid()` existe en
cuanto entras con Google), pero `crear_pedido()` además necesita una fila en
`customer` ligada a esa sesión, y eso no está: la cuenta de Google sólo
identifica. `CartPanel` sigue armando la reserva 100% en cliente
(`localStorage['gunshop:pedidos']` + `mailto:`), igual que hacía `js/cart.js`
en el sitio estático.

### Cuenta: Google, y ninguna credencial

**La página no vende productos controlados.** De ahí salen dos reglas que van
juntas y no se tocan por separado:

1. **No se pide el número de CLU en ningún formulario**, ni el vencimiento ni
   la TCCM. `Perfil` es `{nombre, email}` y nada más: es lo que el `mailto:`
   de la reserva necesita para llegar al taller. El perfil viejo con
   `clu`/`vence`/`tccm` que quedara en `localStorage` se lee y se descarta
   solo (`leer()` en `AccountContext.tsx`).
2. **Nada que exija credencial ANMaC puede reservarse.** `faltas()` corta la
   cesta entera con `comprableDirecto()` — la misma función que ya decide el
   botón de la ficha (`ProductoCTA.tsx`), para que no haya dos criterios que
   puedan desincronizarse. `ProductoCTA` ya manda esos regímenes a consulta;
   `faltas()` es la red por si uno llega a la cesta igual (una cesta vieja en
   `localStorage`, un régimen que cambia en la base con el carrito lleno).
   `test/modoventa.test.ts` fija el invariante del que depende: ningún régimen
   regulado es `direct_checkout`.

Quitar la 2 sin la 1 sería lo caro: entregar sin pedir el papel. Por eso el
corte vive en `lib/`, no en el panel.

**El acceso con Google** es Supabase Auth con el proveedor `google`
(`signInWithOAuth`). Sin ruta de callback a propósito: `redirectTo` es la misma
URL en la que estabas y `supabase-js` canjea el `?code=` solo
(`detectSessionInUrl`), que es por lo que `lib/supabase.ts` ya no lleva
`persistSession: false`. En Node no hay `localStorage` y `auth-js` cae a
memoria, así que el render de servidor sigue sin sesión.

Entrar con Google reescribe el perfil con el nombre y el correo de la cuenta;
cerrar sesión **no** borra el perfil (para eso está «Borrar mis datos»), porque
quien lo escribió a mano nunca usó Google.

Hay que darlo de alta en el panel de Supabase — no se configura desde el repo:

| Dónde | Qué |
|---|---|
| *Authentication → Sign In / Providers → Google* | Client ID y Client Secret de un OAuth Client de Google Cloud |
| Google Cloud Console → *Authorized redirect URIs* | `https://<proyecto>.supabase.co/auth/v1/callback` |
| *Authentication → URL Configuration* | Site URL del sitio, y en *Redirect URLs* `http://localhost:3000/**` y `https://<dominio>/**` — el `/**` hace falta porque se vuelve a la página en la que estabas, no a una fija |

`app/catalogo/page.tsx` acepta `?q=` por encima de `familia`/`sub`/`calibre`:
la búsqueda entra en "Todo" y cruza sólo con el filtro de calibre, con un
chip `.chip--busqueda` para deshacerla.

## Imágenes

`public/img/product/<marca-ref>.webp` — una foto por producto (77 ficheros,
1200×750). `public/img/model/<modelo>.webp` — genéricas por arquetipo (14
ficheros), donde cae el producto que no tiene la suya. La cascada está
cableada en `lib/catalogo.ts#aProducto()` desde 0011; antes estaba escrita
aquí pero no en el código, y no se notaba porque los 76 productos de entonces
traían foto propia:

    product_photo (Supabase)  →  public/img/model/<family.model_key>.webp  →  .foto.sinFoto (CSS, sin imagen)

El peldaño del medio es de lo que viven las diez referencias de recarga: de una
prensa RCBS no hay foto libre en Commons, pero de pólvora, fulminantes, puntas
y comparadores sí, y una foto genérica de pólvora en «Pólvoras» es cierta —la
foto de otro producto no lo sería.

Las dos carpetas no están en la misma situación legal, y conviene no
confundirlas: `img/model/` es **toda de licencia libre** (dominio público, CC0,
CC BY o CC BY-SA) porque la baja `tools/fotos.py`, que aborta si la licencia no
permite redistribuir; las CC BY y CC BY-SA exigen citar al autor y por eso está
`public/img/model/CREDITS.md`. `img/product/`, en cambio, **no está aclarada**:
son fotos de catálogo de fabricante que valen de marcador hasta que la armería
ponga las suyas, y la procedencia de cada una está en
`public/img/product/CREDITS.md`.

`public/img/marca/` es la marca, y no sale de ninguna de las dos cascadas de
arriba: el monograma en vector (`alcantara-monograma.svg`, cuadrado con
filete, para avatar o miniatura) y el mismo dibujo en PNG a 120 px, que existe
sólo porque el consent screen de Google no acepta SVG. El favicon es
`app/icon.svg` — misma letra, sin filete, y Next lo publica por convención de
nombre sin que nadie lo enlace. El canónico de la geometría es `app/icon.svg`;
`tools/marca.py` lleva copia de las coordenadas y dice que hay que sincronizarla
a mano.

Ojo con el logo y Google: **subirlo al consent screen dispara la verificación de
marca**, que son semanas. Mientras la app viva con ámbitos no sensibles
(`email`, `profile`), el campo del logo se deja vacío a propósito.

El **respaldo 3D está aparcado, no portado**: `js/meshes.js`/`scene.js`/`art.js`
del sitio estático no se trajeron a esta app porque los 76 productos ya
tienen foto real y era código muerto incluso ahí. De la cadena sólo queda
`tools/models.py`, que funciona solo (Blender headless) pero no hornea nada
que la app lea; `tools/render.py` se borró, porque escribía dos carpetas que
ya no existen y su único lector era el `mount()`, que está en el historial.
No inviertas ahí sin decidir primero que el 3D vuelve.

## Diseño — "Alcántara"

Lienzo negro puro, medido de `rolls-roycemotorcars.com` y no aproximado a
ojo. Vive en `css/tokens.css` (raíz del repo, **no** en `app/`) e importado
como CSS global clásico desde `app/layout.tsx`, en el mismo orden que llevaba
`index.html` en el sitio estático: `tokens.css` → `base.css` → `catalog.css`
→ `shop.css`. Es el diseño en producción hoy — reemplazó a un sistema
anterior de papel claro y acento lima que se abandonó a mitad de esta
migración; si alguna nota vieja o comentario menciona "Himon"/lima/radio 4px,
es de ese sistema descartado, no de éste.

- `--negro: #000` de fondo, piezas en `--pieza: #151515`. Sin segundo acento.
- Tenor Sans (display, un solo peso 400) + Jost (texto, 300/400/500) vía
  `next/font/google` — se auto-alojan, no hay petición a Google en runtime.
  `css/tokens.css` referencia ambas por nombre literal (`"Tenor Sans"`,
  `"Jost"`), que es el nombre que `next/font` conserva en el `@font-face`
  generado; basta con `.variable` en `<html>` para que la hoja se incluya.
- Tracking **positivo y fijo en píxeles** (`--tr: 2.5px`), no proporcional al
  cuerpo — es la firma del original: un rótulo pequeño queda más abierto que
  un titular grande.
- Canto vivo en todo; la única curva es la píldora de los botones
  (`--r-pildora: 30px`). `--r: 0` en el resto.
- Una sola curva de movimiento (`cubic-bezier` fuerte a la salida, sin
  rebote), tres tiempos fijos, igual que documentaba el sitio estático.
  Respetar `prefers-reduced-motion` en cualquier animación nueva.
- Los grises están anotados con su contraste real medido contra cada fondo,
  al lado de cada variable en `css/tokens.css` — no confiar a ojo si un gris
  nuevo llega a 4.5:1.

Las entradas en pantalla (`Reveal.tsx`) son dos clases + `IntersectionObserver`,
puerto de `js/reveal.js`; el estado oculto va bajo `.js` a propósito, para que
si el script no llega a ejecutarse la página se vea entera y no en blanco.

## Precios

`Producto.usdCents` es el precio en dólares (centavos enteros), como se
cotizan las armas en Argentina — viene de la columna `product.usd_cents`.
`lib/catalogo.ts#cambio()` trae el último `fx_rate.ars_per_usd` de Supabase;
`precio(usdCents, arsPorUsd)` hace la conversión y el formato `Intl.NumberFormat`
en pesos. No hay ningún tipo de cambio hardcodeado en la app — a diferencia
del sitio estático (`ARS_POR_USD` en `js/catalog.js`), acá cambiar el cambio
es un `UPDATE`/`INSERT` en `fx_rate`, no un despliegue.

## Régimen legal

La tienda es argentina y se rige por ANMaC. La etiqueta de cada producto
sale del art. 5 del decreto 395/75 (corta el arma de hombro en 5,6 mm y la
pistola en 6,35 mm), pero en esta app **vive en la base**, no en código:

| Etiqueta | Qué la lleva |
|---|---|
| `uso-civil` | escopetas tiro a tiro, rifles y pistolas del .22 |
| `uso-civil-condicional` | calibres mayores y toda semiautomática |
| `aire-comprimido` | pistolas de 4,5 mm; no son armas de fuego |
| `requiere-tccm` | munición |
| `libre` | óptica y accesorios |

`test/modoventa.test.ts` prueba `lib/regimen.ts` sobre los cinco. Al añadir
un producto en Supabase, la familia (`family.licence_regime_id`, `NOT NULL`)
pone la etiqueta por defecto; el producto la pisa con su propio
`licence_regime_id` sólo si es una excepción — el mismo patrón que llevaba
`licence:` en `js/catalog.js` del sitio estático.

## Herramientas conservadas (`tools/`)

Ninguna corre en build ni en CI; son insumo manual de fases anteriores de la
migración y del respaldo 3D aparcado.

| Fichero | Para qué | Se corre cuando |
|---|---|---|
| `tools/seed-supabase.js` | Generó `db/supabase/seed-productos.sql` (idempotente) leyendo `js/catalog.js`. **Hoy no corre**: al fusionar el port en `main` se borró el sitio estático y con él su catálogo, que era la última copia. El SQL que produjo está commiteado y aplicado; para volver a generarlo hay que sacar `js/catalog.js` del historial (rama `main-antes-del-merge`) o apuntar el script a Supabase | no se corre hoy |
| `tools/seed.js` | Genera el `db/seed.sql` del esquema Postgres viejo (`db/schema.sql`) desde un `js/catalog.js` local — ese fichero ya no existe en esta rama (se borró en la fase de limpieza junto con el resto del sitio estático), así que hoy **no corre** sin apuntarlo a otra fuente. Se conserva como referencia de cómo se generó `db/seed.sql` | no se corre hoy; ver nota más abajo |
| `tools/models.py` | Modela las 8 piezas del respaldo 3D en Blender y hornea `js/meshes.js` | si el respaldo 3D vuelve a activarse |
| `tools/fotos.py` | Baja las fotos genéricas de `public/img/model/` desde Wikimedia Commons, sólo licencias redistribuibles | si hace falta una foto genérica nueva |
| `tools/marca.py` | Hornea el monograma en PNG (`--tam`). Existe porque Google pide el logo del consent screen en mapa de bits y no acepta SVG | si hace falta el monograma en otro tamaño |

## Lo que queda pendiente

- **Fase 11 (despliegue)**: fast-forward de `main` a la punta de esta rama y
  cambio del Production Branch en Vercel. `main` hoy no tiene build; este
  paso lo activa por primera vez en producción.
- **Perfil de cliente en la base**: el acceso con Google ya da `auth.uid()`,
  pero falta la fila `customer` (y su política de RLS) para poder cablear
  `crear_pedido()`. Hasta entonces la reserva es un aviso por `mailto:`, no
  una venta real.
