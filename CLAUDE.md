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
caras hacia fuera, están las ocho fotos genéricas con su fichero de créditos, y
ninguna ficha apunta a una ruta rota, a la foto de otro producto ni a un
fichero idéntico al de otro. También que ninguna etiqueta de régimen se salga
de la tabla —una desconocida se trataría como venta libre, que es vender sin
pedir la credencial—, que a cada munición se le saque calibre y cartuchos por
caja, y que `tools/seed.js` siga siendo determinista. Si tocas
`js/catalog.js`, `js/scene.js`, `tools/models.py`, `tools/fotos.py` o
`tools/seed.js`, ejecútalo.

La base de datos se comprueba aparte, porque necesita un Postgres:

```
docker run -d --name gunshop-pg -e POSTGRES_PASSWORD=demo -v "$PWD/db:/db:ro" postgres:17-alpine
docker exec gunshop-pg psql -U postgres -v ON_ERROR_STOP=1 -f /db/schema.sql
docker exec gunshop-pg psql -U postgres -v ON_ERROR_STOP=1 -f /db/seed.sql
docker exec gunshop-pg psql -U postgres -v ON_ERROR_STOP=1 -f /db/smoke.sql
```

## Restricciones del código

- Nada de `import`/`export` en `js/`: los scripts se cargan con `<script>`
  clásico para que funcione sobre `file://`. `js/scene.js` y `js/catalog.js`
  además exportan por `module.exports` sólo para el selftest en Node.
- El orden de los `<script>` en `index.html` importa: meshes → scene → art →
  catalog → cart → search → account → nav → reveal → main. Los tres paneles
  se cargan antes que `main.js` porque es él quien los arranca, y arranca
  primero `account` (la cesta le pregunta por la CLU nada más pintarse).
  `main.js` llama a `reveal.init()` al final,
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

## Cesta, cuenta y búsqueda

Los tres botones de la barra abren un `<dialog>` modal, que ya trae fondo
oscuro, foco atrapado y cierre con Escape: no hay nada de eso escrito a mano.
El marcado vive al final de `index.html` y la pintura en `css/shop.css`.

| Fichero | Qué hace | Qué guarda |
|---|---|---|
| `js/cart.js` | cesta, cantidades, avisos de régimen y reserva | `gunshop:cesta`, `gunshop:pedidos` |
| `js/search.js` | panel de la lupa, y «/» lo abre | nada |
| `js/account.js` | perfil del cliente: CLU, vencimiento, TCCM | `gunshop:cuenta` |

Cosas que no son evidentes:

- **La cesta guarda `{id: unidades}`, no la ficha.** El producto se vuelve a
  resolver contra el catálogo al cargar, así que un precio nuevo entra solo y
  una referencia que desaparece se cae sola.
- **La ficha no tiene estado propio**: su botón le pregunta a la cesta cuántas
  unidades hay. Por eso quitar una línea en el panel devuelve el botón a
  «Añadir» sin que nadie sincronice nada.
- **La búsqueda vive por encima de los filtros**: entra en «Todo» y deja un
  chip para deshacerla. Ese chip también es `.chip`, así que el manejador de
  los filtros exige `[data-filter]` para no tratarlo como una familia.
- **La cuenta no tiene contraseña a propósito.** Guardar una en `localStorage`
  es peor que no tenerla. El alta de verdad es `customer` en el esquema SQL.
- **Los tres paneles entran y salen con `@starting-style`**, no con
  `@keyframes`. Un `<dialog>` pasa de `display: none` a `block` y no hay
  desde donde animar: `@starting-style` da ese valor de partida y
  `allow-discrete` retrasa el `display` hasta que la transicion acaba, que
  es lo que permite animar tambien el cierre y el fondo oscuro. El bloque de
  movimiento reducido de `base.css` nombra `::backdrop` aparte porque `*` no
  lo alcanza.
- Lo que puede o no reservarse sale de `REGIMEN`, `calibre()`, `porCaja()` y
  `topeTccm()` en `js/catalog.js`, que es la misma fuente de la que
  `tools/seed.js` llena `licence_regime` y `calibre`. Si cada uno comparase
  etiquetas por su cuenta, un día dirían cosas distintas.

## Base de datos

`db/schema.sql` es PostgreSQL 14 o más, y no lo lee nadie desde el navegador:
es a donde se mudan el catálogo y la cesta el día que haya servidor. Está
probado —se aplica, se llena y pasa `db/smoke.sql`, que es una venta entera
de la cesta a la entrega— pero ninguna parte de la página depende de él.

    js/catalog.js  LINES    → family        localStorage  cesta   → cart
                   items    → brand+product               cuenta  → customer
                   cals[]   → product_variant             pedidos → sales_order
                   usd      → product.usd_cents + fx_rate

Lo que decidió el modelo:

- **Cada arma de fuego es una fila, no una cantidad**: lleva número de serie y
  CUIM, y ANMaC pregunta por ella una a una (`firearm_unit`). Lo que no se
  serializa —munición, óptica, fundas— va por cantidad.
- **Las existencias se llevan por asiento** (`stock_move`) y `stock_level` es
  sólo el saldo, mantenido por disparador. Un inventario que se edita a mano
  no se puede auditar.
- **Dinero en centavos de dólar, entero.** Los pesos salen de `fx_rate`, y el
  pedido se queda con el cambio que se le aplicó: una factura de hace dos años
  tiene que seguir cuadrando.
- **La línea de pedido guarda copia** del nombre, del precio y del régimen. El
  catálogo cambia; lo que se vendió y bajo qué ley, no.
- La CLU y la TCCM son documentos con vencimiento (`credential`), no casillas.
  El cupo de munición se comprueba contra la vista `ammo_consumed`.

`db/seed.sql` está **generado**: sale de `js/catalog.js` con `node
tools/seed.js` y no se edita a mano. Trae los 76 productos, las 102
referencias y las mismas existencias que enseña la página —166 armas con
número de serie de prueba y 118 unidades contadas—. Es determinista: dos
ejecuciones dan el mismo fichero, y pasarlo dos veces por la base no duplica
nada.

## Modelos 3D (sólo respaldo)

**El 3D está apartado.** Las fichas enseñan fotos; el esquema vectorial sólo
aparece si una foto falta. Las 224 imágenes horneadas de `img/card/` e
`img/hero/` están borradas, y con ellas el banco de fotogramas y el `mount()`
de `js/scene.js`, que era lo único que las leía. De `js/scene.js` queda lo que
dibuja el esquema de respaldo.

`tools/models.py` y `tools/render.py` siguen en el repositorio y funcionan,
pero nada de la página depende ya de ellos. `render.py` volvería a escribir
`img/card/` e `img/hero/` desde cero; el segundo no tendría quien lo pintase
sin recuperar antes el `mount()` que está en el historial. No inviertas ahí sin
decidir primero que el 3D vuelve.

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

Dos niveles, con licencias distintas. Cada **producto** tiene su foto en
`img/product/<marca-ref>.webp` y cada **modelo** una generica en
`img/model/<modelo>.webp`, que es donde cae la ficha si falta la del producto.
Todas 1200x750. La cascada es:

    product.photo  ->  img/model/<modelo>.webp  ->  esquema de scene.js

Los 76 productos tienen la suya, asi que el segundo peldano hoy no se pisa;
sigue ahi porque el fallo, si se rompe una ruta, es invisible.

`img/hero.webp` (2400x1350) es el fondo de la portada.

### img/model/ -- genericas, licencia libre

Las baja `tools/fotos.py` de Wikimedia Commons:

```
python tools/fotos.py
```

**Solo licencias que permitan redistribuir** -- dominio publico, CC0, CC BY,
CC BY-SA. El script comprueba la licencia y aborta si no lo es. La mitad son
CC BY o CC BY-SA y **exigen citar al autor**: la tabla vive en
`img/model/CREDITS.md` y el selftest comprueba que el fichero siga ahi.

### img/product/ -- del producto, licencia sin aclarar

Son fotos de catalogo del fabricante o de un distribuidor. **No estan
aclaradas para redistribuir** y el repositorio es publico, asi que antes de
produccion hay que sustituirlas por fotos del taller o pedir permiso. Cada una
lleva su pagina de origen en `img/product/CREDITS.md`, que es lo que permite
saber a quien.

Commons no sirve para este nivel: no tiene fotografia de producto de modelos
comerciales concretos, y buscar por marca+modelo alli devuelve un pueblo de
Colorado llamado Rifle y un sepulcro para la AyA Aguila.

Lo que si funciona es buscar imagenes por el nombre exacto y **mirarlas**. El
titulo del resultado de una tienda es literalmente el nombre del producto, asi
que puntuar por titulo deja arriba lo que hay que ver; pero elegir por el
titulo sin abrir la imagen es como se colo un AR-15 en el Blaser R8. Se revisa
una hoja de contactos por producto.

Cuatro productos se cambiaron por otro de su misma familia porque de ellos no
hay foto publicada y del sustituto si: `SAGA Perdiz 34` -> `SAGA Heavy 34`,
`RIO Star 32` -> `RIO Game Load BlueSteel`, `Vanguard Pioneer 46` ->
`Beretta Hunter Tech Rifle Case`, `Ferrimax Alfa 5` -> `Rottner Gun 5 Cargo`.
Otros tres se renombraron al modelo que de verdad ensena su foto:
`Arregui Rifle 180020` -> `Braco 5`, `AyA Aguila` -> `AyA No. 1 De Luxe`,
`Grulla Consejo` -> `Grulla 216 RB`.

Al encuadrar, `contain` y nunca `cover`: la foto de tienda trae el arma entera
en diagonal y recortar a 8:5 se come la boca del canon. Antes hay que quitar el
margen liso, porque un rifle fotografiado en un cuadrado de 1600x1600 entra en
la ficha como una raya. El relleno es el color de las cuatro esquinas del
original, no blanco fijo.

Para cambiar una foto basta con dejar otro `.webp` de 1200x750 con el mismo
nombre, o cambiar el `photo:` del producto en `js/catalog.js`. Ninguna de las
dos cosas toca codigo.

El selftest comprueba que ninguna ruta `photo:` este rota, que ningun producto
use la foto de otro y que no haya dos ficheros identicos: el reparto
automatico llego a dar la misma imagen al armero Arregui y al Ferrimax, y eso
por nombre de fichero no se ve.

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
- Una sola curva: `cubic-bezier(.44, 0, .56, 1)`, simetrica y sin rebote. No
  metas easings nuevos, y tampoco tiempos: son tres y solo tres. `--t-slow`
  0.7s para lo que entra en pantalla, `--t` 0.4s para lo que responde al
  puntero, `--t-fast` 0.2s unicamente para el salto de teclado. Lo que entra
  en fila -- fichas, bloques, enlaces del menu -- se escalona con `--stagger`,
  el mismo para los tres.
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
