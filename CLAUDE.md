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
paginación no repite ni pierde fichas, las mallas del respaldo cierran con las
caras hacia fuera, y están las ocho fotos con su fichero de créditos. Si tocas
`js/catalog.js`, `js/scene.js`, `tools/models.py` o `tools/fotos.py`, ejecútalo.

## Restricciones del código

- Nada de `import`/`export` en `js/`: los scripts se cargan con `<script>`
  clásico para que funcione sobre `file://`. `js/scene.js` y `js/catalog.js`
  además exportan por `module.exports` sólo para el selftest en Node.
- El orden de los `<script>` en `index.html` importa: meshes → scene → art →
  catalog → nav → reveal → main. `main.js` llama a `reveal.init()` al final,
  cuando las baldosas de familias ya existen: si se observan antes, nacen
  invisibles y nadie las descubre.
- `js/meshes.js` e `img/` están **generados**: no se editan a mano.
- Toda foto tiene respaldo: si `img/model/` falta, la ficha cae al esquema de
  `js/scene.js` y la página sigue abriéndose con doble clic. Al tocar esa
  cascada, compruébala renombrando `img/model/`.
- **Contraste mínimo 4.5:1, y la lima no es texto sobre claro.** Da 1.28:1
  sobre papel: ahí sólo vale como fondo con tinta encima, o `--lime-ink` si
  hace falta lima legible. `--hairline` tampoco llega a 4.5:1 en ninguno de los
  dos fondos y se queda en trazos. Los números están anotados en
  `css/tokens.css` junto a cada gris.
- Respetar `prefers-reduced-motion` en cualquier animación nueva.

## Modelos 3D (sólo respaldo)

**El 3D está apartado.** Las fichas enseñan fotos; el esquema vectorial sólo
aparece si una foto falta. `tools/models.py`, `tools/render.py` y las 224
imágenes horneadas de `img/card/` e `img/hero/` siguen en el repositorio pero
ya no los usa nadie: se conservan por si vuelve a hacer falta esa vía. No
inviertas en ellos sin decidir antes que el 3D vuelve.

Lo que sigue describe cómo funciona ese respaldo. Siete de las ocho piezas se
modelan en `tools/models.py` con Blender y se hornean a `js/meshes.js`. La
octava, el cartucho, sigue escrita a mano en `js/scene.js`: para el esquema es
pura revolucion y alli son ocho lineas.

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

## Imagenes

Cada modelo del catalogo tiene **una** foto en `img/model/<modelo>.webp`,
1200x750. La ficha las usa asi:

    product.photo  ->  img/model/<modelo>.webp  ->  esquema de scene.js

`img/hero.webp` (2400x1350) es el fondo de la portada.

Las bajo `tools/fotos.py` de Wikimedia Commons:

```
python tools/fotos.py
```

**Solo licencias que permitan redistribuir** -- dominio publico, CC0, CC BY,
CC BY-SA. El script comprueba la licencia y aborta si no lo es. No es una
formalidad: el repositorio es publico, asi que una foto de producto de un
fabricante queda redistribuida en cuanto se hace push, sin esperar a que el
sitio salga a produccion.

La mitad son CC BY o CC BY-SA, que **exigen citar al autor**. La tabla vive en
`img/model/CREDITS.md` y el selftest comprueba que el fichero siga ahi.

Las actuales son marcadores. Para poner las definitivas basta con dejar otro
`<modelo>.webp` de 1200x750 en `img/model/`, o rellenar el campo `photo:` de un
producto concreto en `js/catalog.js`. Ninguna de las dos cosas toca codigo.

## Diseno

El lenguaje visual esta portado de la plantilla Himon (Framer, autor Sang),
medido de su CSS y no aproximado a ojo. Todo vive en `css/tokens.css`:

- Pagina clara (`--paper #f2f2f2`) con bandas oscuras (`--ink #1c1c1c`), y un
  unico acento lima `#bde74e`. Un segundo acento rompe el sistema.
- Geist y Geist Mono, ambas OFL. **Peso maximo 500**, nunca negrita: lo que da
  peso al titular es el tamano y el tracking, no el trazo.
- Tracking negativo que crece con el cuerpo: -0.02em en texto, -0.05em en
  titulares. Es la firma de la plantilla; si se quita, se cae el parecido.
- Radio 4px en todo. Nada redondeado.
- Separacion por color de fondo, no por bordes de 1px.
- Una sola curva: `cubic-bezier(.44, 0, .56, 1)` a 0.4s, simetrica y sin
  rebote. No metas easings nuevos.
- Aire vertical grande (`--sp-section`, 80 a 150px) contra lateral pequeno.

Las animaciones que en Himon hace framer-motion aqui son `js/reveal.js`: dos
clases y un `IntersectionObserver`. El estado oculto va bajo `.js` a proposito,
para que si el script no llega a ejecutarse la pagina se vea entera en vez de
en blanco.

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
