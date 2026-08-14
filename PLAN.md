# Imagenes fotorrealistas

## Lo que se puede y lo que no

**No puedo bajar fotos de fabricante.** Las fotos de producto de Glock,
Beretta, Peli o Sauer son obra ajena con derechos: descargarlas y meterlas en
el repositorio seria redistribuir material protegido, y da igual que la
tienda sea una demostracion. Asi que las imagenes de las fichas son **renders
propios** hechos con Blender, que ademas se ven como el producto real.

Para que entren fotos con licencia el dia que las haya (las del proveedor,
las del propio taller), cada producto lleva un campo `photo:` opcional: si
esta, la ficha usa esa foto; si no, el render. Sin tocar codigo.

**Unreal queda descartado y no por gusto:** no esta instalado. La clave del
registro apunta a `C:\Program Files\Epic Games\4.0\`, que ya no existe, y no
hay ningun `UnrealEditor.exe` en disco. Blender ademas se guioniza sin GUI y
ya es de donde sale la geometria.

## Medido antes de decidir

- Cycles sobre OptiX en la RTX 3060: **2,2 s por fotograma** a 256 muestras.
  La tanda entera (8 modelos x 28 imagenes) sale por unos diez minutos.
- El lienzo del fondo es la ventana entera a `opacity: 0.7` y con un degradado
  encima. No hace falta resolucion de cartel.
- Blender 5.1 tiene `shade_auto_smooth(angle=...)` y escribe WebP nativo.

## Decisiones

- **Un solo origen de geometria.** `tools/models.py` sigue siendo la unica
  fuente; `tools/render.py` la carga con mas gajos por tubo (`DETALLE`) y le
  pone materiales. No hay dos modelados que puedan divergir.
- **Cuatro angulos por modelo en las fichas**, los mismos que ya usa
  `art.js`. Con una sola imagen por modelo, 34 rifles saldrian con la foto
  identica y eso se lee como error.
- **El fondo es una secuencia de fotogramas**, no una imagen fija: el giro con
  el scroll es la firma de la pagina. Se dibujan con `drawImage` sobre el
  mismo canvas y `mount()` no se toca. Si faltan las imagenes, cae al esquema
  de siempre y la pagina sigue abriendose con doble clic.
- **Pitch distinto en cada uso:** fichas -0,24, fondo -0,20. No unificar.
- **Materiales y mundo procedurales.** Nada descargado: misma razon legal que
  las fotos, y el repositorio sigue bastandose solo.
- **La imagen cubre `5,2 / scale` unidades centradas en el origen**, que es
  justo el encuadre del esquema. Asi el render cae donde caia el dibujo y el
  respaldo no da un salto.

## Fases

- [ ] **F1 · Rig y pistola de punta a punta.** Materiales, luces, camara con
      encuadre automatico, 4 fichas + 24 fotogramas, cableado y comprobacion
      en la pagina real. Es donde se decide todo lo demas. Commit.
- [ ] **F2 · Los otros siete.** El cartucho necesita version de render propia:
      su malla vive en `scene.js`, no en `models.py`. Commit.
- [ ] **F3 · Campo `photo:` por producto** y respaldo en cascada. Commit.
- [ ] **F4 · CLAUDE.md** con la tuberia nueva y un aserto en el selftest que
      falle si falta alguna imagen. Commit.

## Comprobaciones

`node test/selftest.js`, la pagina en Chrome sin errores de consola, y mirar
las fichas y el fondo a tamano real. Peso total objetivo: por debajo de 10 MB.
