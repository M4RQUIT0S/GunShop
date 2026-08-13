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
paginación no repite ni pierde fichas, y las mallas 3D cierran con las caras
hacia fuera. Si tocas `js/catalog.js`, `js/scene.js` o `tools/models.py`,
ejecútalo.

## Restricciones del código

- Nada de `import`/`export` en `js/`: los scripts se cargan con `<script>`
  clásico para que funcione sobre `file://`. `js/scene.js` y `js/catalog.js`
  además exportan por `module.exports` sólo para el selftest en Node.
- El orden de los `<script>` en `index.html` importa: meshes → scene → art →
  catalog → nav → main.
- Un único motor de dibujo: `js/scene.js` pinta el fondo y, vía `js/art.js`,
  las imágenes de todas las fichas. No metas otra forma de generar imágenes.
- `js/meshes.js` está **generado**: no se edita a mano. Ver «Modelos 3D».
- Paleta oscura pero nunca negra pura (`--ink-900: #14181f`). Contraste mínimo
  4.5:1 sobre el fondo; los tokens de `css/tokens.css` ya están ajustados a eso.
- Respetar `prefers-reduced-motion` en cualquier animación nueva.

## Modelos 3D

Las ocho piezas del catálogo salen de dos sitios distintos, a propósito:

| Origen | Piezas | Por qué |
|---|---|---|
| `tools/models.py` (Blender) → `js/meshes.js` | rifle, escopeta, pistola, punto rojo, prismáticos, maletín | Necesitan volumen: culata que estrangula en la muñeca, guardamonte con su hueco, tapa separada de la base. Un perfil extruido con grosor constante da un recorte de cartón. |
| `js/scene.js`, a mano | mira, cartucho | Son de revolución. Un tubo escrito son dos números; horneado, doscientos vértices. |

Para regenerar tras tocar `tools/models.py`:

```
"D:\Editores Codigo\blender.exe" --background --factory-startup --python tools/models.py
```

Escribe `js/meshes.js` y aborta si alguna pieza no cierra o tiene el volumen
negativo. Se modela en ejes de Blender (X a la boca, Y ancho, Z arriba) y se
exporta girado a los de la escena; el giro tiene determinante +1, porque con
un espejo se invertirían todas las caras y el recorte de traseras borraría la
pieza entera.

**El presupuesto es de 150-350 caras por modelo.** No es un límite de
rendimiento: el render dibuja el borde de cada cara en dorado, y pasado ese
número el plano técnico se convierte en una maraña. Por lo mismo no se
triangula nunca al exportar, y los biseles van a un solo segmento.

Nada de booleanos: cada modelo es una unión de sólidos cerrados simples. Un
boolean deja n-gons rotos y vértices en T que el ordenado por profundidad
pinta mal.

## Precios

El campo `usd` de cada producto es el precio **en dólares**, como se cotizan
las armas en Argentina. Los pesos salen de `ARS_POR_USD` en `js/catalog.js`:
al mover el cambio se toca ese número y nada más.

Los importes están anclados a precios publicados por armerías argentinas
(agosto de 2026): Glock, Bersa, Pelican, munición del 22, escopetas y rifles
tácticos. El resto de la lista se derivó de esas anclas por familia. Las
piezas que casi no entran al país —paralelas de Eibar, pistolas de precisión
ISSF, óptica alpina— van modeladas, no verificadas una a una.

## Régimen legal

La tienda es argentina y se rige por ANMaC. La etiqueta de cada ficha sale
del art. 5 del decreto 395/75, que corta el arma de hombro en 5,6 mm y la
pistola en 6,35 mm:

| Etiqueta | Qué la lleva |
|---|---|
| `Uso civil` | escopetas tiro a tiro, rifles y pistolas del .22 |
| `Uso civil condicional` | calibres mayores y toda semiautomática |
| `Aire comprimido` | pistolas de 4,5 mm; no son armas de fuego |
| `Requiere TCCM` | munición |
| `null` → «Venta libre» | óptica y accesorios |

`test/selftest.js` comprueba que ningún rifle salga con un régimen que no
corresponde a su calibre. Al añadir productos, la familia pone la etiqueta
por defecto y la ficha la sobreescribe con `licence:` si es una excepción.

El pie cita las resoluciones vigentes (Tenencia Express 45/2025, TCCM
14/2025, semiautomáticas 37/2025). Si cambia la normativa, ahí es donde hay
que mirar.
