# Modelos del catalogo desde Blender

Los modelos que salen de revolucion (mira, cartucho) ya se leen bien. Los que
salen de un perfil extruido con grosor constante se leen como recortes de
carton: pistola, rifle, escopeta, punto rojo, maletin. Esos son los que se
rehacen en Blender.

## Decisiones tomadas antes de empezar

- **Blender es herramienta de taller, no del sitio.** Modela y exporta; el
  unico motor de dibujo sigue siendo `js/scene.js`. La regla de CLAUDE.md se
  respeta: no hay una segunda forma de generar imagenes.
- **El export es un `.js`, no un `.json`.** Sobre `file://` un `fetch` de JSON
  muere por CORS. `js/meshes.js` asigna `GunShop.meshes` y se carga con
  `<script>` antes de `scene.js`.
- **Nada de triangular.** El render dibuja el borde de cada cara en dorado:
  triangular duplica el rayado y mata el aire de plano tecnico. Se exportan
  poligonos tal cual (Newell aguanta n-gons).
- **Presupuesto de caras: 150-350 por modelo.** Los dos que ya funcionan estan
  en 146 y 164. Ese numero es el criterio estetico, no un limite tecnico.
- **Nada de booleanos.** Cada modelo sigue siendo union de solidos cerrados
  simples, igual que hace `merge()` hoy. Un boolean deja n-gons rotos,
  vertices en T y caras grandes que el pintor ordena mal.
- **Ejes:** `scene(x,y,z) = (bx, bz, -by)`. Determinante +1; con determinante
  -1 se invertirian todas las caras y el recorte de traseras borraria la pieza
  entera.
- **Misma escala y mismas claves.** Se modela en el rango que ya usan los
  modelos actuales para no retocar `PLACE`, `span` ni `scale`.

## Fases

- [x] **F1 · Tuberia completa con la pistola.** Es el peor modelo (37 caras).
      Exportador, `js/meshes.js`, orden de scripts, selftest. Commit.
- [x] **F2 · Rifle y escopeta.** Culata con conicidad, guardamonte real. Commit.
- [x] **F3 · Punto rojo y maletin.** Commit.
- [ ] **F4 · Prismaticos** (opcional, tiene costuras feas en el puente).
- [ ] **F5 · Documentacion:** CLAUDE.md con la tuberia y como regenerar. Commit.

## Comprobaciones

En el exportador (Blender sabe de islas, Node no):
- normales recalculadas hacia fuera
- volumen con signo > 0 por cada solido suelto
- cada arista dirigida a->b una vez y su inversa b->a una vez

En `test/selftest.js` solo los cables trampa baratos: emparejado de aristas
sobre las mallas horneadas y el barrido de visibilidad que ya existe (recorre
`scene.models`, asi que cubre lo horneado sin tocar una linea).

## Bucle de trabajo

Un modelo por vuelta: exportar -> hoja de contactos en Chrome headless -> mirar
el PNG -> ajustar. Nada de escribir los seis de golpe y depurar a ciegas.
