# Migración a e-commerce (Next.js + Supabase) — retomando el rediseño

Fuente: contexto de esta sesión (2026-08-26). Sigue en la rama `ecommerce-next`.
No se parte de cero: se corrige el rumbo de las fases 1-3 ya cerradas ahí.

## Decisión que esto revierte

`ecommerce-next/PLAN.md` (fases 0-3 ya cerradas) dice: *"Diseño nuevo de
e-commerce. Se abandona el port de Rolls-Royce"* y monta Minimalism & Swiss
Style (Cormorant + Montserrat, negro cálido/hueso/oro, `app/tokens.css`).
Esa decisión queda **revertida**: `main` fijó el rediseño rolls-royce
("Alcántara", Tenor Sans + Jost, lienzo negro, `css/tokens.css`) como diseño
oficial en producción, y es ese el que hay que portar. Lo que SÍ se conserva
de las fases 0-3 cerradas: todo `lib/`, `db/supabase/`, el andamiaje de
Next.js/Supabase y el patrón de `app/catalogo/page.tsx` leyendo
`listaProductos()`. Lo que se tira: `app/tokens.css`, `app/globals.css`,
`app/catalogo.module.css` y las fuentes Cormorant/Montserrat de
`app/layout.tsx`.

## Punto de partida

**Se sigue en `ecommerce-next`, no se abre rama nueva desde `main`.**
Repetir el andamiaje (Next 16 + React 19 + `@supabase/supabase-js`,
`vercel.json`, `lib/supabase.ts`, `lib/regimen.ts` ya escrito y con
`test/modoventa.test.ts` en verde, `db/supabase/` con 9 migraciones ya
aplicadas y probadas contra el proyecto real) sería rehacer trabajo ya hecho
y verificado. Lo único que cambia es la piel visual y las páginas.

Verificado: `db/supabase/migrations/0001..0008` son **idénticas** entre
`main` y `ecommerce-next` (`git diff main ecommerce-next -- db/supabase/migrations/000{1..8}_*.sql`
sin salida). `0009_fotos.sql` sólo existe en `ecommerce-next` y llega solo a
`main` cuando esta rama lo reemplace (fase 11).

## Fases

- [x] **0. Reconciliación y registro de la decisión.**
      Migraciones 0001-0008 confirmadas idénticas entre `main` y
      `ecommerce-next`. Este `PLAN.md` reemplaza al anterior; queda
      constancia de que la fase "2. Tokens y capa base" previa se revierte.

- [x] **1. Tokens y CSS base — puerto literal desde `main`.**
      - Copiados bytes de `D:\GunShop\css\{tokens,base,catalog,shop}.css` a
        `D:\GunShop-ecommerce-next\css\` (`cmp` confirma idénticos).
      - Importadas como CSS global clásico desde `app/layout.tsx`, en el
        mismo orden que `index.html` (tokens → base → catalog → shop). Se
        dejó de importar `./globals.css` ahí mismo para que no choque;
        `app/tokens.css`, `app/globals.css` y `app/catalogo.module.css`
        siguen en disco sin tocar (los sigue usando `catalogo.module.css`
        vía `app/page.tsx` y `app/catalogo/page.tsx` hasta la fase 4).
      - Tipografía: `Tenor_Sans` (400) + `Jost` (300/400/500) con
        `variable`, mismo mecanismo que Cormorant/Montserrat. Verificado en
        el CSS generado por el build que next/font conserva el nombre
        literal ("Tenor Sans", "Jost") en el `@font-face`, que es como
        `css/tokens.css` los referencia (no por variable CSS) — aplicar
        `.variable` en `<html>` basta para que la hoja se incluya.
      - `document.documentElement.className += ' js'` portado con
        `next/script` `strategy="beforeInteractive"`; confirmado en el HTML
        servido.
      - Comprobación: `npx next build` en verde, `npm run start` sirve `/` y
        `/catalogo` con 200 y el `<html>` con las clases `.variable` de
        Tenor Sans/Jost. Nota: `/` y `/catalogo` aún se ven con el layout
        viejo (Minimalism & Swiss vía `catalogo.module.css`) porque esas
        páginas se rehacen recién en las fases 3-4; esta fase sólo deja la
        hoja de estilos y las fuentes listas.
      - Commit: `feat: porta tokens.css/base.css/catalog.css/shop.css del rediseño a la app Next`.

- [x] **2. Layout raíz + cabecera + paneles — el "chrome" compartido.**
      - `app/layout.tsx` monta `<Nav/>` (Server Component vía `familias()`),
        `<Footer/>` y los cuatro `<dialog>` (`CartPanel`, `SearchPanel`,
        `AccountPanel`, `ConsultaPanel`), portando `index.html` líneas
        568-719 estructura por estructura.
      - `app/components/NavMenu.tsx` ('use client') — porta `js/nav.js`:
        menú de dos niveles, `aria-expanded`, precarga de `data-foto`,
        `matchMedia('(max-width: 60rem)')`, Escape. El segundo nivel de
        «Familias» se arma con las `familias()` del Server Component padre,
        no con `LINES` (no existe en Next).
      - `app/components/CartContext.tsx` — Context + estado con persistencia
        en `localStorage['gunshop:cesta']`, reemplaza el singleton
        `window.GunShop.cart` porque header/ficha/panel necesitan el mismo
        estado compartido.
      - Comprobación: menú abre/cierra, atrapa foco, Tab no se escapa.
      - Commit: `feat: cabecera, menu de dos niveles y los cuatro paneles modales`.
      - Diferencias con lo planeado:
        - `Nav` no solo monta el header: envuelve TODO lo demás (`children`
          de `layout.tsx`) porque es quien pone `inert` sobre el resto de la
          página mientras el menú está abierto — `.nav__menu` no es un
          `<dialog>` (no puede serlo, tapa la página entera con un `<div>`
          normal como el original) y por tanto no atrapa foco solo; sin
          `inert` Tab se escapaba hacia el contenido tapado detrás. Los 4
          paneles sí son `<dialog>` reales y no lo necesitan.
        - `familias()` en `lib/catalogo.ts` ahora también trae `model_key`
          (columna que ya existía en el esquema) para poder cambiar la foto
          del menú al pasar por cada familia, igual que el original.
        - Confirmado en el CSS portado (fase 1): `.foot { position: fixed }`
          es sitewide, no solo portada. `app/layout.tsx` ya envuelve
          `children` en `<div class="hoja">` por eso — pero el
          `margin-bottom` que lo destapa (`js/portada.js` `pie()`) sigue
          pendiente, se porta en la fase 3.
        - `riel` y `scrollicono` (decoración de scroll de la portada) NO se
          tocan acá: vistos en `js/nav.js` pero pertenecen a la portada de
          la fase 3.
        - Los tres botones de acción del header (buscar/cuenta/cesta) y los
          4 `data-cierra` de los paneles quedan sin `onClick`: abrir/cerrar
          los `<dialog>` es la "lógica completa" que la fase 6 porta junto
          con `cart.js`/`account.js`/`search.js`/`consulta.js`. Lo único
          interactivo ya cableado es el contador de la cesta (`CartCount`,
          vía `CartContext`), que es la prueba de que header/panel comparten
          estado.
        - Corregido de paso: el enlace "saltar al contenido" en `layout.tsx`
          tenía `className="saltar"`, una clase que no existe en ninguna
          hoja portada (la real es `.skip`); se veía sin estilo.

- [x] **3. Portada (`app/page.tsx`).**
      - Server Component: `familias()` (ahora devuelve tambien `licencia`,
        la etiqueta del regimen para la baldosa) + cifras, contadas sobre
        `listaProductos()` en vez de escribirse a mano (`total`, `porFamilia`,
        `marcas` unicas por `marcaSlug`).
      - Tres laminas con el copy fijo de `index.html` lineas 143-182 (el
        primer CTA pasa de `#catalogo` a `/catalogo`: esa seccion no vive en
        esta pagina, es la ruta real).
      - `RielLaminas.tsx` ('use client') — porta `riel()` de `js/portada.js`.
      - Verificado en `css/base.css`: `.foot{position:fixed}` (linea 922) no
        esta dentro de ninguna media query — es sitewide — y solo vuelve a
        `static` en angosto (linea 1021). Por eso `pie()` se porto como
        `<Pie/>` viviendo en `app/layout.tsx`, no aqui: mide `#foot` y le
        pone el margin-bottom a `#hoja` (que si es sitewide) para cualquier
        pagina, no solo la portada.
      - Familias (`#tiles`) y marquesina de marcas (`#marquee`, `Marquee.tsx`
        cliente por el boton de pausa).
      - Sumado sobre lo planeado: `Scrollicono.tsx` — la nota de la fase 2
        dejaba dicho que `scrollicono` (la barra de 4x80 que se apaga al
        bajar, hoy en `js/nav.js`) pertenecia a esta fase y no estaba portada
        todavia; se agrego como componente propio en la portada, con su
        propio listener de scroll al mismo umbral (`scrollY > 40`) que usa
        `NavMenu.tsx` para `is-stuck`.
      - Comprobacion: `npx next build` en verde — `/` se prerenderiza
        estatica, lo que ademas confirmo en build real el join nuevo de
        `familias()` contra Supabase. `node --test test/modoventa.test.ts` y
        `node db/supabase/revisa.js` en verde (no tocan esta fase, pero
        nada roto).
      - Commit: `feat: portada con rieles de laminas, cifras y familias`.

- [x] **4. Catálogo (`app/catalogo/page.tsx`) — filtros de dos niveles y calibre sobre Supabase.**
      - `lib/catalogo.ts`: `SELECT` de `listaProductos()` suma `spec`,
        `cartridges_per_box` y
        `product_variant(calibre:calibre_id(name, annual_quota))`.
        `Producto` gana `spec`, `cartridgesPerBox` y `calibres` (dedupe por
        nombre). `REGIMEN`/`calibre()`/`porCaja()`/`topeTccm()` de
        `js/catalog.js` no se portan: ya resueltos en columnas reales.
      - `filtrarPorSub(productos, kind)` y `filtrarPorCalibre(productos, nombre)`
        exportadas como funciones puras (no como filtros SQL) — `familia`
        sigue siendo el único `.eq()` contra Supabase; `sub` y `calibre` se
        aplican sobre el array ya traido. `listaProductos(familia?, sub?,
        calibre?)` las usa internamente, y la página las reusa directo sobre
        el catálogo completo para no pedirlo dos veces (una consulta cubre
        la rejilla Y los contadores de los chips). También nuevas:
        `subcategorias()` y `calibresDe()`, para las listas de los chips.
      - Chips de familia/subcategoría y el de calibre son todos
        `<Link href="/catalogo?familia=x&sub=y&calibre=z">` — el de calibre
        NO es un `<select>` nativo (habría exigido JS para enviarse sin
        botón); son chips `.chip` iguales a los de subcategoría, dentro del
        contenedor `.calibre`. Un `sub`/`calibre` en la URL que no aplica al
        filtro vigente (p.ej. cambiar de familia) se descarta en el propio
        render, no con JS.
      - Sin paginación, como estaba previsto.
      - Reskin con clases de `css/catalog.css`; sumado un `paddingTop: calc(var(--nav-h-ancha) + 1rem)`
        en el `<main>` porque el nav es `position:fixed` y esta página no
        tiene la lámina de portada que le da hueco arriba en `/`.
      - Verificado además de `npx next build`: `npm run start` contra la
        base real — `/catalogo` (18), `?familia=rifles` (3, dos
        subcategorías), `?familia=rifles&calibre=.308 Win` (2) — los
        recuentos de chips y de rejilla cuadran a mano.
      - Borrados `app/globals.css`, `app/tokens.css`, `app/catalogo.module.css`
        (sin más referencias tras el reskin; sólo se adelantó de la fase 10
        porque ya no servían para nada desde esta misma fase).
      - Commit: `feat: catalogo con filtros de dos niveles y calibre sobre Supabase`.

- [x] **5. Ficha de producto — `app/producto/[slug]/page.tsx`.**
      - Verificado antes de maquetar: `product.spec` está poblado en los 18
        productos sembrados (siempre 2 elementos) y `cartridges_per_box` en
        los 3 de munición. El render sigue siendo condicional (`spec.length`,
        `cartridgesPerBox > 0`, `calibres.length`) para no depender de que
        siga así.
      - `lib/catalogo.ts`: `productoPorSlug(slug)` sobre `listaProductos()`
        completo filtrando por `slugDe(p) === slug`, como estaba previsto.
        `Producto` gana `fotos: string[]` (portada primero, el resto en el
        orden que llegó); `foto` queda intacto para no tocar
        `app/catalogo/page.tsx`.
      - CTA por `modoVenta(p.regimen)` vía `ProductoCTA.tsx` (client):
        `direct_checkout` → «Añadir a la cesta» usando el mismo
        `CartContext` que el header (el botón pregunta `unidades[id]`, no
        guarda estado propio — mismo patrón que la ficha del sitio
        estático); el resto → «Consultar».
      - `generateMetadata()` con Open Graph por producto (título, kind +
        régimen, foto de portada si hay).
      - Sumado sobre lo planeado, porque «abre ConsultaPanel prerellenado»
        no se podía cumplir con el panel tal como estaba (scaffold sin
        `showModal()` ni estado — nada lo abría todavía, ni siquiera los
        tres botones del header):
        - `ConsultaContext.tsx` (nuevo) — mismo rol que `CartContext` pero
          para «qué consulta abrir»: `abrir({titulo, rotulo, mensaje})` /
          `cerrar()`. `ConsultaPanel` ahora es `'use client'`, lee el
          contexto, hace `showModal()`/`close()` por `ref` y trae también el
          envío por `mailto:` (puerto de `correo()`/`enviar()` de
          `js/consulta.js`) — dejarlo sólo entreabierto sin envío real dejaba
          un `<form>` sin `onSubmit` que recargaba la página al enviar, peor
          que como estaba.
        - Lo que NO se portó todavía, a propósito: las cuatro TEMAS
          (compra/taller/trámites/visita) y el `<select>` de familia que sólo
          usa «compra» — ese bloque de la portada («en qué podemos
          ayudarle») tampoco está portado aún. `abrir()` ya acepta
          `{titulo, rotulo, mensaje}`, que es lo que esas cuatro necesitan;
          fase 6 sólo tiene que llamarlo con su propio texto.
        - `app/layout.tsx` envuelve con `<ConsultaProvider>` igual que con
          `<CartProvider>`.
      - Reskin con clases existentes (`card__art`, `chip`, `tag`, `card__add`
        — éste último ya tenía `.is-added` en `css/catalog.css` sin que nada
        lo usara todavía); CSS nuevo mínimo al final de `catalog.css` bajo
        `--- ficha de producto ---` (maqueta de dos columnas + un par de
        rótulos, nada que no exista ya como token).
      - Comprobado con `npx next start` contra la base real: 200 en ficha
        con foto y sin foto (Federal/Pelican, los dos sin fila en
        `0009_fotos.sql`), 404 en un slug inventado, CTA «Añadir a la cesta»
        en venta libre / aire comprimido, «Consultar» en condicional,
        TCCM y régimen desconocido; calibre y cartuchos por caja sólo
        aparecen en munición.
      - Commit: `feat: ficha de producto con CTA por regimen y consulta prellenada`.

- [x] **6. Cesta, cuenta, búsqueda, consulta — Client Components.**
      - `lib/regimen.ts` gana `requisitos(regimen)`: equivalente tipado de
        `REGIMEN` (js/cart.js), indexado por `Producto.regimen` en vez de
        por la etiqueta en español. `calibre()`/`porCaja()`/`topeTccm()` NO
        se portan (confirmado lo que decía fase 4): ya son
        `calibres[0].name`, `cartridgesPerBox` y `calibres[0].annualQuota`.
      - `lib/cesta.ts` (nuevo): `exige()`/`faltas()`/`notas()`/`cupos()`/
        `reserva()` puros, equivalentes a la mitad de `js/cart.js` que no
        toca el DOM — reciben `Linea[]` (`{producto, n}`) y `Perfil | null`,
        se prueban solos. `lib/cuenta.ts` (nuevo) sólo define el tipo
        `Perfil`, para que `lib/cesta.ts` no dependa de un componente de
        React (`AccountContext` lo reexporta).
      - `CartContext.tsx`: ahora además pide `listaProductos()`/`cambio()`
        una sola vez (al montar) y expone `lineas`/`totalUsdCents` ya
        resueltos contra catálogo fresco, más `abrir()/abrirTick` (mismo
        mecanismo de tick que `ConsultaContext`) para que `HeaderActions`
        pueda decirle a `CartPanel` que se muestre. `CartPanel.tsx` pinta
        líneas, avisos (`aviso`/`aviso--falta`) y hace la reserva:
        **sin wiring a `crear_pedido()`** (exige `auth.uid()`, no hay
        login/signup en esta tanda) — pseudo-reserva 100% cliente en
        `localStorage['gunshop:pedidos']` + `mailto:`, igual que hacía
        `js/cart.js` en `main` (ninguno de los dos llamaba nunca a un
        backend real).
      - `AccountContext.tsx` (nuevo) + `AccountPanel.tsx`: puerto casi
        literal de `js/account.js`. Formulario no controlado, remontado con
        `key={abrirTick}` en cada apertura (equivalente a que `pinta()`
        reescribiera los valores del form cada vez que `abrir()` mostraba
        el panel).
      - `SearchContext.tsx` (nuevo, sólo el tick de abrir) + `lib/buscar.ts`
        con `llano()`/`buscar()` portados de `js/catalog.js` sobre
        `Producto` (no hay campo `name` propio: se arma con `marca`+`ref`).
        `SearchPanel.tsx` pide `listaProductos()` una vez al abrirse y
        filtra en cliente.
      - `HeaderActions.tsx` (nuevo, client): los tres botones de la barra
        (buscar/cuenta/cesta) — vive aparte porque `Nav.tsx` es Server
        Component y no puede llevar `onClick`; antes esos botones eran
        marcado muerto dentro de `acciones`.
      - **Sumado sobre lo planeado**: `SearchPanel`/`ConsultaPanel` ya
        cerraban la mitad del ciclo de búsqueda pero no tenían a dónde
        mandar los resultados (no hay `LINES` ni rejilla compartida en esta
        app). `app/catalogo/page.tsx` gana `?q=` — busca por encima de
        familia/sub/calibre igual que `fuente()`/`setQuery()` en
        `js/main.js` (entra en «Todo», cruza sólo con calibre, chip
        `.chip--busqueda` para deshacerla — esa clase ya estaba en
        `css/shop.css` sin que nadie la usara desde la fase 1). Sin esto
        «Ver en el catálogo» no tenía función real.
      - `ConsultaPanel.tsx` NO gana las cuatro TEMAS ni el `<select>` de
        familia: eso vive detrás del bloque «en qué podemos ayudarle» de la
        portada, que ninguna fase cerrada todavía porta (fase 3 no lo
        incluyó). Sólo se le sumó el mismo bloqueo de scroll de fondo que
        ya tenían Cart/Account/Search (`js/consulta.js` lo hacía y el
        scaffold de la fase 5 no).
      - Comprobado: `npx next build` en verde; `npm run start` contra la
        base real — `/catalogo?q=glock` da 1 referencia con el chip de
        deshacer, `/catalogo` sin `q` sigue en 18; los cuatro `<dialog>`
        siguen sirviendo su marcado inicial (cesta vacía, sin datos de
        cuenta) en el HTML servido antes de hidratar. `node --test
        test/modoventa.test.ts` y `test/selftest.js` en verde, `node
        db/supabase/revisa.js` en verde (ninguno de los dos lo toca esta
        fase). `node --test test/` (sin fichero) falla en este entorno
        (Node 24 no resuelve el directorio) tanto en bash como en
        PowerShell — no es una regresión de esta fase, ya fallaba igual
        antes de tocar nada.
      - Commit: `feat: cesta, cuenta, busqueda y consulta como client components`.

- [ ] **7. Respaldo 3D — se deja fuera, a propósito.**
      - `js/meshes.js`/`scene.js`/`art.js` no se portan: código muerto
        incluso en el sitio estático (los 76 productos tienen foto real).
      - El fallback "sin foto" ya existe en `app/catalogo/page.tsx`
        (`.foto.sinFoto`), sólo se reskinea en la fase 1.
      - Sin commit propio.

- [x] **8. Testing.**
      - `test/modoventa.test.ts` sigue igual, sin tocar.
      - Nuevo `test/buscar.test.ts` para `llano()`/`buscar()`: acentos y
        mayúsculas, AND entre palabras (no OR), casa por marca+ref pero
        también por familia/kind/spec/calibre/régimen, y el desempate que
        sube lo que casa por nombre sobre lo que sólo casa por ficha.
        Fixtures `Producto` locales — no toca Supabase.
      - Nuevo `test/slug.test.ts`: cada `slugDe()` de `listaProductos()`
        (18 productos reales) resuelve al mismo `id` vía `productoPorSlug()`,
        y no hay dos productos con el mismo slug. Éste sí pega contra
        Supabase real.
      - `test/selftest.js` sin cambios (fase 9 lo hereda para borrar).
      - **Sumado sobre lo planeado, no estaba previsto**: `node --test`
        no puede importar `lib/catalogo.ts` tal cual — sus imports internos
        van sin extensión (`./supabase`), que es lo que espera el resolver
        "bundler" de tsconfig pero el ESM nativo de Node exige el
        especificador completo; `test/modoventa.test.ts` no lo sufría
        porque `lib/regimen.ts` no importa nada. Se agregó
        `test/resuelve-ts.mjs`, un hook de resolución de ~10 líneas
        (`node:module`, sin dependencia nueva) que reintenta con `.ts`
        puesto cuando la resolución normal falla; vive sólo en `test/` y
        `next build` no pasa por ahí. Se descartó tocar el import de
        `lib/catalogo.ts` porque `allowImportingTsExtensions` no está en
        `tsconfig.json` y encenderlo se sale del alcance de esta fase.
      - Comprobación real: `node --test test/` (sin fichero) sigue fallando
        en este entorno igual que en la fase 6 — Node 24 no resuelve el
        directorio, no es cosa de esta fase. La forma que sí corre las 13
        pruebas en verde:
        `node --experimental-loader ./test/resuelve-ts.mjs --test "test/*.test.ts"`.
        `node db/supabase/revisa.js` en verde. `npx next build` (Turbopack)
        compila y tipa sin errores.
      - Commit: `test: cubre buscar() y el redondeo slug↔producto`.

- [x] **9. Cargar los 76 productos en Supabase (puede ir en paralelo con 4-6).**
      - `tools/seed-supabase.js` (nuevo): lee `D:\GunShop\js\catalog.js` (no
        el `js/catalog.js` viejo suelto en la raíz de `ecommerce-next`, que
        es resto pre-rediseño y se borra en la fase 10) y genera
        `db/supabase/seed-productos.sql`. Antes de escribir una sola línea,
        `comprobarFotos()` lee `public/img/product/` de disco y aborta si
        falta un fichero, si dos productos apuntan al mismo o si dos SKUs
        calculados colisionan — el gotcha de `0009_fotos.sql` no se repitió.
      - Idempotente por diseño: `brand`/`calibre` con
        `on conflict (slug|name) do nothing`; `product` con
        `on conflict (brand_id, ref) do update set` (corrige los 13
        productos que ya traía la semilla de 18 de muestra si `catalog.js`
        cambió precio/spec/régimen — nunca toca `brand_id`/`family_id`/`ref`,
        que son la clave); `product_variant` con dos ramas (`on conflict
        (product_id, calibre_id) do nothing` para las que llevan calibre,
        `on conflict (sku) do nothing` para las que no, porque un
        `unique(product_id, calibre_id)` no distingue dos NULL entre sí);
        `product_photo` con `on conflict (product_id, path) do nothing`.
      - Encontré el trabajo ya hecho pero sin commitear (`tools/seed-supabase.js`
        y `db/supabase/seed-productos.sql` en disco, untracked, de una sesión
        cortada a mitad) y **ya aplicado** contra el proyecto Supabase real
        vía `mcp__supabase__execute_sql`. Verificado en vez de repetido a
        ciegas: regeneré el SQL desde `catalog.js` (idéntico byte a byte al
        que ya estaba en disco), lo re-ejecuté entero contra la base real
        para probar la idempotencia de verdad (no sólo leerla en el texto) y
        confirmé conteos antes/después iguales: 79 `product` (76 del
        catálogo + 3 que ya traía a mano `db/supabase/seed.sql` con ref
        propia que no pisa ninguna de las 76 — `Sellier & Bellot "Practica
        .308 Win 147 gr"`, `Federal "Champion .22 LR 40 gr"`, `Pelican
        "Vault V730"` bajo brand `pelican`, distinta de `peli`), 105
        `product_variant` (102 + esas 3), 77 `product_photo` (76 + la de
        Sellier "Practica"; Federal "Champion" y Pelican "Vault" ya venían
        sin foto desde la fase 5, no es cosa de esta fase). Ninguna fila de
        `cart`/`sales_order`/`customer` tocada — el SQL ni las nombra.
      - `node db/supabase/revisa.js`, `node --test test/` (13/13, contra la
        base real ya con 79 productos) y `npx next build` en verde.
      - Commit: `feat: genera el seed de Supabase con los 76 productos de js/catalog.js`.

- [ ] **10. Limpieza.**
      - ~~Borrar `app/globals.css`, `app/tokens.css`, `app/catalogo.module.css`~~
        ya borrados en la fase 4 (dejaron de usarse ahí mismo).
      - Borrar `index.html` y los `js/*.js`/`css/*.css` sueltos en la raíz
        de `ecommerce-next` (foto vieja pre-rediseño). Confirmar que
        `public/img/` es superset de `img/` antes de borrar `img/`.
      - Conservar `tools/seed.js`, `tools/models.py`, `tools/render.py`,
        `tools/fotos.py`.
      - Reescribir `CLAUDE.md` de `ecommerce-next` (hoy describe Himon /
        papel claro / lima, no la app real).
      - Commit: `chore: retira el sitio estatico viejo y pone CLAUDE.md al dia`.

- [ ] **11. Despliegue.**
      - Confirmar `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
        siguen dadas de alta en Vercel (Production+Preview+Development).
      - Cuando 0-10 estén verdes: fast-forward de `main` a la punta de
        `ecommerce-next` (o merge) y cambiar el Production Branch en
        Vercel, probando `npx next build` limpio justo antes — `main` hoy
        no tiene build, así que este paso lo activa por primera vez en
        producción.
      - Sin commit propio.

## Riesgos

- **`crear_pedido()` sin auth**: la fase 6 deja la reserva como aviso, no
  venta real. Cablearla de verdad arrastra login/signup — fuera de esta
  tanda salvo que se pida.
- **`product.spec`/`cartridges_per_box`** de los 18 sembrados puede estar
  incompleto. Verificar antes de la fase 4/5.
- **Fast-forward de main (fase 11)** activa build en un proyecto Vercel hoy
  estático puro. Probar `npx next build` limpio justo antes de mover el
  Production Branch.

## Criterios de cierre

- [ ] `npx next build` en verde con el diseño rolls-royce servido desde `/`.
- [ ] `/catalogo` filtra por familia, subcategoría y calibre, ninguna ficha
      regulada aparece con `direct_checkout`.
- [ ] `/producto/[slug]` existe y no da 404 para ningún enlace del listado.
- [ ] Los cuatro paneles abren, atrapan foco y cierran con Escape.
- [ ] `node --test test/`, `node db/supabase/revisa.js`, `npx next build`
      en verde.
- [ ] `js/catalog.js` sigue vivo mientras la fase 9 no cierre; el día que
      cierre, se borra junto con `test/selftest.js`.
