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

Siete de las ocho piezas se modelan en `tools/models.py` con Blender y se
hornean a `js/meshes.js`. La octava, el cartucho, sigue escrita a mano en
`js/scene.js`: es pura revolucion y no gana nada pasando por Blender.

Cada modelo apunta a un arquetipo con cotas reales, porque uno solo sirve a
toda una familia del catalogo:

| Modelo | Arquetipo | Lo que lo delata |
|---|---|---|
| `pistol` | pistola de servicio de polimero, 204 x 138 mm | ventana de expulsion con el canon dentro, riel, estrias |
| `rifle` | cerrojo de caza con visor 3-9x40 | culata que estrangula en la muneca, manillar, torretas |
| `shotgun` | superpuesta de tiro | banda ventilada sobre pilares, pico de pato, llave caida |
| `optic` | visor 3-9x40 | torretas de alza y deriva, anillo de aumentos |
| `reddot` | reflex abierto | dos montantes con aire en medio y el cristal inclinado |
| `binocular` | prismatico de techo 10x42 | oculares con copa, rueda de enfoque, dioptrias |
| `gcase` | maleta rigida estanca | ranura de tapa, cuatro cierres, valvula, ruedas |
| `cartridge` | vaina de gollete | piston, ranura de extraccion, hombro |

Para regenerar tras tocar `tools/models.py`:

```
"D:\Editores Codigo\blender.exe" --background --factory-startup --python tools/models.py
```

Escribe `js/meshes.js` y aborta si alguna pieza no cierra, si tiene el volumen
negativo o si queda enterrada dentro de otra. Lo ultimo cubre la regla 4 de
mas abajo: girar un tubo hacia el lado que no es lo mete dentro de la pieza
que deberia decorar y simplemente no se ve. Un aro no cuenta como
contenedor -- llena muy poco su caja, y lo que cae en su agujero se ve
perfectamente. Se modela en ejes de Blender (X a la boca, Y ancho, Z arriba) y se
exporta girado a los de la escena; el giro tiene determinante +1, porque con
un espejo se invertirian todas las caras y el recorte de traseras borraria la
pieza entera.

### Las cuatro reglas del detalle

Salen de medir, no de suponer: la misma pistola a 214, 694 y 2614 caras.

1. **Presupuesto de 200 a 700 caras por modelo.** No es rendimiento: el render
   dibuja el borde de cada cara en dorado, y pasado ese numero el plano
   tecnico se vuelve una marana.
2. **Bisel de un solo segmento, y nunca subdividido.** Lo que se fundio en la
   prueba fue el bisel partido en cuatro, no el bisel: este da a cada canto un
   valor de luz propio y es lo que separa una pieza de un prisma. Va en los
   volumenes grandes; en los herrajes pequenos, no.
3. **Nada que sobresalga menos de 0,03.** A tamano de ficha el encuadre da
   85 px por unidad, asi que un resalte de 0,01 no llega a un pixel y solo
   aporta raya. Por eso el grabado de las empunaduras no existe y las ranuras
   de los dedos van en el perfil, que es silueta.
4. **Cuidado con lo pegado a una superficie.** El pintor ordena por
   profundidad media de cara: un control pequeno junto al extremo de un panel
   grande puede quedar detras de el y desaparecer a ciertos angulos. Se monta
   rompiendo silueta, y se revisa a yaw -1,45 y 0,9.

Dos cosas mas que no cambian: no se triangula nunca al exportar, y nada de
booleanos. Cada modelo es una union de solidos cerrados simples; un boolean
deja n-gons rotos y vertices en T que el ordenado por profundidad pinta mal.

### Hueco = pieza aparte, no rebaje

Una cara con agujero no se puede dibujar, y un rebaje plano sale del mismo
color que la superficie de al lado porque comparte normal. Asi que los huecos
se construyen: la ventana de expulsion son cuatro bloques cerrados (puente
debajo, pared a un lado) con el canon cruzando por dentro, y el guardamonte
es un aro de quads. Fue la unica forma de que se leyeran como huecos.

### Proporcion y encuadre

Las armas largas se modelan con la relacion real canon/culata y se devuelven
al hueco de la ficha bajando `scale` en `MODELS` (rifle 0,88, escopeta 0,84).
Comprimir el canon para que quepa era lo que las hacia parecer de juguete.

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
