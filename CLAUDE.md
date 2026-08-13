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

## Pendiente conocido

Los precios de `js/catalog.js` son estimaciones de mercado, no tarifa de
proveedor. Marcas, modelos, calibres y fichas técnicas sí son reales. Hay que
sustituir el campo `price` con precios reales antes de publicar.
