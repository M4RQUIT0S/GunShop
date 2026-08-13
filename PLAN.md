# Modelos realistas

Cada pieza tiene que parecerse al arma real, no solo tener volumen.

## Lo que decide el diseno

Medido, no supuesto (`tmp/dens.png`): la misma pistola a 214, 694 y 2614
caras. A 694 se ensucia y a 2614 los chaflanes se funden en una mancha
dorada. Pero **el ruido sale de las tiras de bisel**, no del detalle: el
render dibuja el borde de cada cara, asi que subdividir una superficie plana
es ruido puro mientras que una ventana de expulsion o un riel anaden lineas
que el ojo lee como piezas.

De ahi las cuatro reglas de esta tanda:

1. **Presupuesto 400-700 caras**, el doble que antes.
2. **El bisel de un segmento se queda; lo que nunca se hace es
   subdividirlo.** Los modelos de la tanda anterior van chaflanados y salen
   limpios: lo que se fundio en la prueba fue el bisel partido en cuatro, no
   el bisel. El chaflan es ademas lo que da a cada canto un valor de luz
   propio. Se mantiene en los volumenes grandes (corredera, culata, cajon,
   cascos), se omite en los herrajes pequenos, y el presupuesto nuevo se
   gasta en piezas **ademas** del bisel, no en su lugar.

3. **Nada que sobresalga menos de 0,03.** A tamano de ficha el encuadre da
   85 px por unidad: un resalte de 0,01 no llega a un pixel y solo aporta
   raya. Por eso no hay grabado en la empunadura; las ranuras de los dedos
   van en el perfil, que es silueta y sale gratis.

4. **Ojo con lo pegado a una superficie.** El pintor ordena por profundidad
   media de cara: un control pequeno junto al extremo de un panel grande
   puede quedar detras de el y desaparecer a ciertos angulos. Se monta
   rompiendo silueta o a caballo de dos piezas, y se revisa a yaw -1,45 y
   0,9, que son los extremos del barrido.

El resto de restricciones no cambia: nada de triangular, nada de booleanos,
union de solidos cerrados, ejes con determinante +1.

## Referencias

Un modelo sirve a toda una familia, asi que se apunta al arquetipo dominante
de cada una, con cotas reales:

| Modelo | Arquetipo | Cotas |
|---|---|---|
| pistol | pistola de servicio polimero (tipo Glock 17) | 204 x 138 mm, corredera 25,5 mm |
| rifle | cerrojo de caza con visor (tipo Sauer 100) | canon 560 mm, alza plegable no |
| shotgun | superpuesta de tiro (tipo Beretta 686) | canon 710 mm, banda de 10 mm |
| optic | visor 3-9x40 con torretas | tubo 25,4 mm, campana 40 mm |
| reddot | reflex abierto (tipo Vortex Venom) | ventana 22 x 16 mm |
| binocular | prismatico de techo 10x42 | objetivos 42 mm |
| cartridge | cartucho de fusil con vaina de gollete | ranura de extraccion y piston |
| gcase | maleta rigida (tipo Peli 1750) | valvula y ruedas |

## Fases

- [x] **F1 · Pistola.** La que mas gana: ventana de expulsion, riel, retenida,
      boton del cargador, estrias, cola de castor. Mide el techo real de la
      regla nueva. Commit.
- [x] **F2 · Rifle y escopeta.** Commit.
- [ ] **F3 · Visor y punto rojo.** El visor pasa a Blender: las torretas no son
      de revolucion. Commit.
- [ ] **F4 · Prismaticos, maletin y cartucho.** El cartucho se queda escrito a
      mano: ranura y piston son dos tubos mas. Commit.
- [ ] **F5 · CLAUDE.md con el presupuesto nuevo y el porque.** Commit.

## Comprobaciones

Las de siempre (`node test/selftest.js` y los asertos del exportador) mas
mirar cada modelo a tamano de ficha, 440x275, que es donde se ve de verdad si
el rayado aguanta.
