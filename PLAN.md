# Migración a e-commerce (Next.js + Supabase)

Fuente: `alcance-ecommerce-armeria.md` (2026-08-26). Rama `ecommerce-next`,
partiendo de `main`.

## Las tres decisiones tomadas

1. **El backend se extiende, no se rehace.** Las 24 tablas con RLS ya están
   aplicadas y probadas contra el proyecto real. De las 16 tablas del «modelo
   sugerido» del documento, 15 ya existen; falta `inquiries`.
2. **Diseño nuevo de e-commerce.** Se abandona el port de Rolls-Royce.
3. **Se parte de `main`.** `rediseno-rr` queda atrás; de allí sólo se rescató
   `db/supabase/`, que es el backend que sí se conserva.

## Lo que NO se toca del documento, y por qué

- **`is_regulated` como booleano: no.** Ya existe `licence_regime` con los
  cinco regímenes del decreto 395/75 (CLU, TCCM, certificación). Un booleano
  no distingue «uso civil» de «uso civil condicional», y esa diferencia es la
  que decide si se pide credencial. Se mapea `purchase_mode` **desde** el
  régimen, no en su lugar.
- **Checkout automático para productos regulados: no.** Lo dice el propio
  documento en su § 15: los requisitos legales «deben validarse con normativa
  vigente y asesoramiento legal antes de implementar checkout automatico».
  Regulado ⇒ `inquiry_only` o `reservation` hasta que haya esa validación.

## Sistema de diseño

De `ui-ux-pro-max`, segunda consulta. La primera («firearms hunting sport
shooting ecommerce») devolvió *Vibrant & Block-based*: verde menta, naranja,
«playful, gaming, youth-focused», y riesgo de accesibilidad *conditional*.
Descartada por no encajar con material regulado. La buena:

- **Minimalism & Swiss Style**, riesgo de accesibilidad *bajo*.
- Negro cálido `#1C1917` sobre hueso `#FAFAF9`, acento oro `#A16207`.
- Cormorant (títulos) + Montserrat (interfaz).

## Fases

- [x] **0. Rama y backend.** `db/supabase/` traído de `rediseno-rr`;
      `revisa.js` en verde.
- [x] **1. Andamiaje.** Next.js + React + `@supabase/supabase-js`. Sin
      Tailwind: el diseño es de tokens y CSS Modules viene de serie.
- [x] **2. Tokens y capa base.** Paleta, tipografía, contraste comprobado.
- [~] **3. Catálogo público.** Listado y familias hechos, leyendo Supabase.
      Faltan filtros de marca/precio, orden y paginación.
- [ ] **4. Ficha de producto.** URL por `slug`, galería, SEO, Open Graph.
- [ ] **5. Consultas.** Tabla `inquiries` + formulario + WhatsApp prearmado.
- [ ] **6. Admin mínimo.** Productos y consultas.

Fases 2-4 del documento (pagos, webhooks, carrito completo, roles) quedan
fuera de este cuaderno: son otra tanda.

## Cuidado con

- **`.env.local` nunca al repo.** La clave `service_role` no puede tocar el
  frontend; sólo va en funciones de servidor.
- Las 77 fotos de `img/product/` siguen sin licencia aclarada para
  redistribuir. El documento no lo cambia.


## Estado al cerrar la sesión

Funciona y está verificado en navegador: `npx next build` compila, el catálogo
sirve **18 productos reales de Supabase** con precio en pesos al cambio del
día, familia, régimen y 16 fotografías.

Comprobaciones, las tres en verde:

    npx next build
    node --test test/modoventa.test.ts     # 5 casos
    node db/supabase/revisa.js             # 10 ficheros, 24 tablas
    node test/selftest.js                  # sigue guardando js/catalog.js

Dos cosas que salieron de medir y no de mirar:

- **La caja de la foto medía 292x750 en vez de 292x183.** El `height="750"`
  del `<img>` entra como valor usado y `aspect-ratio` sólo rellena
  dimensiones automáticas. Hace falta `height: auto`.
- **Las rutas de foto no se pueden derivar del nombre.** De 18 productos, 3
  no casaban, y uno de ellos habría colgado la foto de OTRO producto de la
  misma marca (un .308 de 150 gr donde el catálogo pide un .22 de 40).

## Lo siguiente, en orden

1. **Cargar los 76 productos en Supabase.** Hoy la base tiene 18: el
   `seed.sql` de Supabase es una muestra de 3 por familia escrita a mano, y
   los 76 siguen sólo en `js/catalog.js`. Hace falta un generador como
   `tools/seed.js` pero para el esquema de Supabase. **Hasta que eso ocurra
   no se puede borrar `js/`**, que es la única fuente del catálogo.
2. Ficha de producto en `/producto/[slug]` — los enlaces ya apuntan ahí y hoy
   dan 404.
3. Tabla `inquiries` + formulario + WhatsApp.
4. Filtros de marca y precio, orden y paginación.
5. Admin mínimo.

El sitio estático viejo (`index.html`, `css/`, `js/`) sigue en el árbol y ya
no se sirve. Se borra cuando (1) esté hecho.
