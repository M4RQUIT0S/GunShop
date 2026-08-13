# GunShop

Tienda de armería (tiro deportivo y caza). Sitio estático: sin build, sin
dependencias, sin bundler. Se abre haciendo doble clic en `index.html`.

## Regla de trabajo (importante)

**Escribe siempre el progreso en `PLAN.md` y haz commit al cerrar cada fase.**

El chat se pierde; el disco no. Antes de empezar algo largo, deja en `PLAN.md`
las fases y ve marcándolas. Al terminar cada fase: commit. Si una sesión se
corta a mitad, la siguiente arranca leyendo `PLAN.md` y `git log`, no
reconstruyendo la conversación.

`PLAN.md` es un cuaderno de trabajo, no documentación: se borra cuando la
tarea termina.

## Cómo se comprueba

```
node test/selftest.js
```

Cubre lo que no se ve a simple vista: el catálogo es determinista, la
paginación no repite ni pierde fichas, y las caras de las mallas 3D miran
hacia fuera. Si tocas `js/catalog.js` o `js/scene.js`, ejecútalo.

## Restricciones del código

- Nada de `import`/`export` en `js/`: los scripts se cargan con `<script>`
  clásico para que funcione sobre `file://`. `js/scene.js` y `js/catalog.js`
  además exportan por `module.exports` sólo para el selftest en Node.
- El orden de los `<script>` en `index.html` importa: scene → art → catalog →
  nav → main.
- Un único motor de dibujo: `js/scene.js` pinta el fondo y, vía `js/art.js`,
  las imágenes de todas las fichas. No metas otra forma de generar imágenes.
- Paleta oscura pero nunca negra pura (`--ink-900: #14181f`). Contraste mínimo
  4.5:1 sobre el fondo; los tokens de `css/tokens.css` ya están ajustados a eso.
- Respetar `prefers-reduced-motion` en cualquier animación nueva.

## Precios

El campo `usd` de cada producto es el precio **en dólares**, como se cotizan
las armas en Argentina. Los pesos salen de `ARS_POR_USD` en `js/catalog.js`:
al mover el cambio se toca ese número y nada más.

Los importes están anclados a precios publicados por armerías argentinas
(agosto de 2026): Glock, Bersa, Pelican, munición del 22, escopetas y rifles
tácticos. El resto de la lista se derivó de esas anclas por familia. Las
piezas que casi no entran al país —paralelas de Eibar, pistolas de precisión
ISSF, óptica alpina— van modeladas, no verificadas una a una.

## Pendiente conocido

Las licencias D/E/F y el domicilio de Eibar son españoles; con precios
argentinos eso queda incoherente. Adaptarlo a ANMaC (usuario legítimo,
tenencia, portación) es una tarea aparte.
