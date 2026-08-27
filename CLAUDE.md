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
node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts" # 13 pruebas
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
`ConsultaPanel`), `NavMenu.tsx` (menú de dos niveles + `inert` sobre el resto
de la página), `HeaderActions.tsx` (los tres botones de la barra — separado
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
| `lib/catalogo.ts` | Todas las consultas a Supabase: `listaProductos()`, `productoPorSlug()`, `familias()`, `cambio()`, `precio()`, `slugDe()`, y los filtros puros `filtrarPorSub()`/`filtrarPorCalibre()` |
| `lib/cesta.ts` | Lógica de la reserva sin DOM: `exige()`/`faltas()`/`cupos()`/`notas()`/`reserva()`. Puro, se prueba solo |
| `lib/cuenta.ts` | Sólo el tipo `Perfil` — vive aparte para que `cesta.ts` no dependa de un componente de React |
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
- `requisitos(regimen)` → `{ clu, tccm, certificado }`, lo que `lib/cesta.ts`
  usa para decidir qué le falta a una reserva.

`test/modoventa.test.ts` cubre que ningún régimen regulado caiga en
`direct_checkout`. Al añadir un régimen nuevo, se toca sólo este fichero —
`ProductoCTA.tsx` y `lib/cesta.ts` ya leen de acá, no hay una segunda tabla
que sincronizar.

## Supabase

`db/supabase/migrations/0001..0009` son el esquema real, aplicado contra el
proyecto de producción. `0006_rls.sql` revoca todo y concede `select` sólo
sobre las tablas de catálogo (`brand`, `product`, `product_variant`,
`product_photo`, `family`, `calibre`, `licence_regime`, `fx_rate`) — la clave
publicable que viaja al navegador no alcanza existencias, unidades con
número de serie, clientes ni pedidos.

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
| `AccountContext` | `gunshop:cuenta` | Perfil del cliente: CLU, vencimiento, TCCM. Sin contraseña a propósito — guardar una en `localStorage` es peor que no tenerla |
| `SearchContext` | nada | Sólo el tick de "abrir panel"; el filtrado corre en `lib/buscar.ts` |
| `ConsultaContext` | nada | `abrir({titulo, rotulo, mensaje})` — cualquier CTA puede abrir el panel de consulta prellenado |

**No hay reserva real contra el backend.** `crear_pedido()` en Supabase exige
`auth.uid()` y no hay login/signup en esta tanda; `CartPanel` arma la reserva
100% en cliente (`localStorage['gunshop:pedidos']` + `mailto:`), igual que
hacía `js/cart.js` en el sitio estático — ninguno de los dos llamó nunca a un
backend real. Cablear la reserva de verdad arrastra login/signup, fuera de
alcance salvo que se pida.

`app/catalogo/page.tsx` acepta `?q=` por encima de `familia`/`sub`/`calibre`:
la búsqueda entra en "Todo" y cruza sólo con el filtro de calibre, con un
chip `.chip--busqueda` para deshacerla.

## Imágenes

`public/img/product/<marca-ref>.webp` — una foto por producto (77 ficheros,
1200×750). `public/img/model/<modelo>.webp` — genéricas por arquetipo (10
ficheros), donde cae la ficha si falta la del producto propio; hoy ese
peldaño no se pisa porque los 76 productos tienen la suya. La cascada:

    product_photo (Supabase)  →  public/img/model/<modelo>.webp  →  .foto.sinFoto (CSS, sin imagen)

Ninguna de las dos carpetas de foto está aclarada para redistribuir sin más
trámite — la procedencia de cada una vive en su propio `CREDITS.md`
(`public/img/product/CREDITS.md`, `public/img/model/CREDITS.md`).

El **respaldo 3D está aparcado, no portado**: `js/meshes.js`/`scene.js`/`art.js`
del sitio estático no se trajeron a esta app porque los 76 productos ya
tienen foto real y era código muerto incluso ahí. `tools/models.py` y
`tools/render.py` siguen en el repo y funcionan solos (Blender headless),
pero nada de la app depende de ellos hoy. No inviertas ahí sin decidir
primero que el 3D vuelve.

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
| `tools/seed-supabase.js` | Lee `D:\GunShop\js\catalog.js` (repo del sitio estático, no esta rama) y genera `db/supabase/seed-productos.sql`, idempotente. `comprobarFotos()` aborta si falta una foto o hay una colisión de SKU antes de escribir nada | cambia `catalog.js` del sitio estático y hay que resembrar Supabase |
| `tools/seed.js` | Genera el `db/seed.sql` del esquema Postgres viejo (`db/schema.sql`) desde un `js/catalog.js` local — ese fichero ya no existe en esta rama (se borró en la fase de limpieza junto con el resto del sitio estático), así que hoy **no corre** sin apuntarlo a otra fuente. Se conserva como referencia de cómo se generó `db/seed.sql` | no se corre hoy; ver nota más abajo |
| `tools/models.py` | Modela las 8 piezas del respaldo 3D en Blender y hornea `js/meshes.js` | si el respaldo 3D vuelve a activarse |
| `tools/render.py` | Escribiría `img/card/`/`img/hero/` desde los modelos — nadie los lee hoy, el `mount()` que los pintaba está sólo en el historial | igual que `models.py` |
| `tools/fotos.py` | Baja las fotos genéricas de `public/img/model/` desde Wikimedia Commons, sólo licencias redistribuibles | si hace falta una foto genérica nueva |

## Lo que queda pendiente

- **Fase 11 (despliegue)**: fast-forward de `main` a la punta de esta rama y
  cambio del Production Branch en Vercel. `main` hoy no tiene build; este
  paso lo activa por primera vez en producción.
- **Login/signup**: sin ellos, `crear_pedido()` no se puede cablear y la
  reserva sigue siendo un aviso por `mailto:`, no una venta real.
