"""Genera js/meshes.js desde Blender. Taller, no sitio: el unico motor de
dibujo sigue siendo js/scene.js, esto solo le da mejores vertices.

    "D:\\Editores Codigo\\blender.exe" --background --factory-startup \
        --python tools/models.py

Se modela en ejes de Blender (X hacia la boca, Y ancho, Z arriba) y se exporta
girado a los de la escena. Asi el .blend, si algun dia se abre a mano, sale
derecho en vez de tumbado.
"""

import bmesh
import math
import os
import sys

from mathutils import Matrix, Vector

TAU = math.pi * 2

# ------------------------------------------------------------------ #
# Primitivas                                                          #
# ------------------------------------------------------------------ #


def solid(faces):
    """Lista de caras (cada una, lista de puntos xyz) -> BMesh cerrado.

    Cada cara se crea con vertices propios y luego se sueldan: sale mas
    barato que llevar la cuenta de indices a mano y el resultado es el
    mismo. El sentido de giro da igual, recalc_face_normals lo arregla.
    """
    bm = bmesh.new()
    for face in faces:
        bm.faces.new([bm.verts.new(p) for p in face])
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def slab(profile, width):
    """Perfil en el plano XZ engordado en Y.

    `width` puede ser un numero (grosor constante, como el extrude de
    scene.js) o una lista con el semiancho de cada punto del perfil. Esa
    lista es la que saca a las piezas de la chapa: una culata es delgada en
    la muneca y ancha en la cantonera, y con grosor constante eso no existe.

    Con anchos variables las dos tapas dejan de ser planas. Es a proposito y
    esta acotado: la normal de Newell sigue definida y el relleno es el
    contorno proyectado, que a estas diferencias no se distingue.
    """
    n = len(profile)
    w = [width] * n if isinstance(width, (int, float)) else list(width)
    assert len(w) == n, 'un ancho por punto del perfil'
    w = [x * 0.5 for x in w]  # siempre ancho total, venga suelto o en lista

    near = [(profile[i][0], w[i], profile[i][1]) for i in range(n)]
    far = [(profile[i][0], -w[i], profile[i][1]) for i in range(n)]

    faces = [near, list(reversed(far))]
    for i in range(n):
        j = (i + 1) % n
        faces.append([near[i], far[i], far[j], near[j]])
    return solid(faces)


def ring(outer, inner, depth):
    """Aro cerrado entre dos perfiles del plano XZ con el mismo numero de
    puntos. Es lo que hace de guardamonte: una cara con agujero no se puede
    dibujar, pero un aro de quads si."""
    assert len(outer) == len(inner), 'los dos perfiles necesitan los mismos puntos'
    n, h = len(outer), depth * 0.5

    def band(pts, y):
        return [(p[0], y, p[1]) for p in pts]

    on, of = band(outer, h), band(outer, -h)
    inn, inf = band(inner, h), band(inner, -h)

    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.append([on[i], on[j], inn[j], inn[i]])      # tapa cercana
        faces.append([of[i], inf[i], inf[j], of[j]])      # tapa lejana
        faces.append([on[i], of[i], of[j], on[j]])        # pared exterior
        faces.append([inn[i], inn[j], inf[j], inf[i]])    # pared interior
    return solid(faces)


def tube(x0, x1, r0, r1, seg=12, y=0.0, z=0.0, phase=0.0):
    """Cilindro o cono truncado a lo largo de X."""
    def rim(x, r):
        return [(x, y + math.sin(phase + i / seg * TAU) * r,
                 z + math.cos(phase + i / seg * TAU) * r) for i in range(seg)]

    a, b = rim(x0, r0), rim(x1, r1)
    faces = [a, list(reversed(b))]
    for i in range(seg):
        j = (i + 1) % seg
        faces.append([a[i], b[i], b[j], a[j]])
    return solid(faces)


def box(x0, x1, z0, z1, width, y=0.0):
    """Atajo para las piezas rectas: alzas, punto de mira, cerraduras."""
    h = width * 0.5
    return solid([
        [(x0, y + h, z0), (x1, y + h, z0), (x1, y + h, z1), (x0, y + h, z1)],
        [(x0, y - h, z1), (x1, y - h, z1), (x1, y - h, z0), (x0, y - h, z0)],
        [(x0, y - h, z0), (x1, y - h, z0), (x1, y + h, z0), (x0, y + h, z0)],
        [(x0, y + h, z1), (x1, y + h, z1), (x1, y - h, z1), (x0, y - h, z1)],
        [(x0, y - h, z0), (x0, y + h, z0), (x0, y + h, z1), (x0, y - h, z1)],
        [(x1, y + h, z0), (x1, y - h, z0), (x1, y - h, z1), (x1, y + h, z1)],
    ])


def turn(bm, angle, axis, pivot=(0, 0, 0)):
    """Gira una pieza ya construida. Los tubos nacen sobre el eje X: esto es
    lo que tumba el manillar del cerrojo, que sale de lado."""
    bmesh.ops.rotate(bm, cent=Vector(pivot), verts=bm.verts[:],
                     matrix=Matrix.Rotation(angle, 3, axis))
    return bm


def move(bm, dx, dy, dz):
    bmesh.ops.translate(bm, vec=Vector((dx, dy, dz)), verts=bm.verts[:])
    return bm


def chamfer(bm, offset, segments=1):
    """Bisel en todas las aristas. Es la diferencia entre un prisma y una
    pieza: cada chaflan coge un valor de luz distinto y el borde deja de ser
    una linea infinitamente afilada. Un solo segmento; con mas, el recuento
    de caras se dispara y el dibujo se ensucia."""
    bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                    offset=offset, offset_type='OFFSET', segments=segments,
                    profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


# ------------------------------------------------------------------ #
# Volcado y comprobaciones                                            #
# ------------------------------------------------------------------ #

# Blender (X boca, Y ancho, Z arriba) -> escena (X boca, Y arriba, Z ancho).
# Determinante +1: es un giro. Con un espejo (-1) se invertirian todas las
# caras y el recorte de traseras borraria la pieza entera.
def to_scene(p):
    return (p[0], p[2], -p[1])


def dump(bm):
    """BMesh -> (verts, faces) ya en ejes de escena."""
    bm.verts.index_update()
    verts = [to_scene(v.co) for v in bm.verts]
    faces = [[v.index for v in f.verts] for f in bm.faces]
    return verts, faces


def volume(verts, faces):
    """Volumen con signo (teorema de la divergencia). Positivo = las caras
    miran hacia fuera. Se triangula en abanico solo para esta cuenta; lo que
    se exporta sigue siendo el poligono entero."""
    total = 0.0
    for f in faces:
        a = verts[f[0]]
        for i in range(1, len(f) - 1):
            b, c = verts[f[i]], verts[f[i + 1]]
            total += (a[0] * (b[1] * c[2] - b[2] * c[1]) -
                      a[1] * (b[0] * c[2] - b[2] * c[0]) +
                      a[2] * (b[0] * c[1] - b[1] * c[0]))
    return total / 6.0


def check(name, verts, faces):
    """Un solido cerrado y bien orientado recorre cada arista una vez en
    cada sentido. Si algo no cierra, el render deja un agujero por el que se
    ve el interior de la pieza."""
    seen = set()
    for f in faces:
        assert len(f) >= 3, '%s: cara de %d lados' % (name, len(f))
        assert len(set(f)) == len(f), '%s: cara con un vertice repetido' % name
        for i in range(len(f)):
            e = (f[i], f[(i + 1) % len(f)])
            assert e not in seen, '%s: arista %s recorrida dos veces igual' % (name, e)
            seen.add(e)
    for a, b in seen:
        assert (b, a) in seen, '%s: la arista %d-%d no tiene pareja' % (name, a, b)

    vol = volume(verts, faces)
    assert vol > 1e-4, '%s: volumen %.5f, la pieza esta del reves' % (name, vol)


def caja(verts):
    return ([min(v[i] for v in verts) for i in range(3)],
            [max(v[i] for v in verts) for i in range(3)])


def sepultada(chica, grande, holgura=1e-4):
    """La caja de una cabe entera dentro de la de la otra."""
    (alo, ahi), (blo, bhi) = chica, grande
    return all(alo[i] >= blo[i] - holgura and ahi[i] <= bhi[i] + holgura
               for i in range(3))


def compacidad(verts, faces):
    """Que fraccion de su caja llena el solido.

    Hace falta porque un aro llena muy poco la suya: el disparador cae dentro
    de la caja del guardamonte pero por su agujero, no por su material, y ahi
    se ve perfectamente. Solo los solidos que llenan su caja pueden enterrar
    a otra pieza.
    """
    lo, hi = caja(verts)
    v = (hi[0] - lo[0]) * (hi[1] - lo[1]) * (hi[2] - lo[2])
    return abs(volume(verts, faces)) / v if v > 1e-9 else 0.0


def build(parts):
    """Une los solidos de un modelo. Cada uno se comprueba por separado:
    juntos dejarian de ser cerrados donde se cruzan.

    Y ademas ninguno puede quedar encerrado en otro. Girar un tubo hacia el
    lado que no es lo mete dentro de la pieza que deberia decorar: no falla
    nada, simplemente no se ve, y eso solo se descubre mirando pixeles. Aqui
    salta al exportar.
    """
    piezas, verts, faces = [], [], []
    for i, bm in enumerate(parts):
        pv, pf = dump(bm)
        check('pieza %d' % i, pv, pf)
        piezas.append((caja(pv), compacidad(pv, pf)))
        base = len(verts)
        verts.extend(pv)
        faces.extend([[k + base for k in f] for f in pf])
        bm.free()

    for i, (a, _) in enumerate(piezas):
        for j, (b, lleno) in enumerate(piezas):
            assert i == j or lleno < 0.55 or not sepultada(a, b),                 'la pieza %d queda dentro de la %d y no se veria' % (i, j)
    return verts, faces


# ------------------------------------------------------------------ #
# Modelos                                                             #
# ------------------------------------------------------------------ #

# Escala: 1 unidad = 75 mm. Una pistola de servicio mide 204 mm de largo y
# 138 de alto -> 2,72 x 1,84, que es justo el hueco que ocupaba el modelo
# viejo. Asi no hay que retocar ni PLACE ni span ni scale.


def pistol():
    # Pistola de servicio de polimero, cotas de una Glock 17: 204 mm de largo
    # por 138 de alto, corredera de 25,5 mm y empunadura de 30. A 75 mm por
    # unidad eso es 2,72 x 1,84.
    ANCHO = 0.34          # corredera
    MEDIA = ANCHO * 0.5

    # La ventana de expulsion no se finge: la corredera real es un puente por
    # debajo del hueco y una pared a un solo lado. Cuatro bloques cerrados
    # hacen esa forma, y las paredes interiores del hueco quedan de cara al
    # observador, o sea que pintan oscuro. Que es como se ve una ventana.
    PORT_X0, PORT_X1 = 0.30, 0.88
    PORT_Z = 0.37

    trasera = [
        (-1.30, 0.24), (0.30, 0.24), (0.30, 0.62), (-1.22, 0.62), (-1.30, 0.54),
    ]
    delantera = [
        (0.88, 0.24), (1.36, 0.24), (1.42, 0.30), (1.42, 0.56),
        (1.34, 0.62), (0.88, 0.62),
    ]

    # Ranuras de los dedos en el frente de la empunadura y cola de castor
    # arriba y detras. Van en el perfil: es silueta, y la silueta sale gratis.
    empunadura = [
        (-0.32, 0.04), (-0.41, -0.32), (-0.49, -0.60), (-0.485, -0.72),
        (-0.525, -0.86), (-0.52, -0.98), (-0.565, -1.12), (-0.56, -1.22),
        (-0.68, -1.34), (-1.40, -1.34), (-1.42, -1.08), (-1.38, -0.58),
        (-1.33, -0.12), (-1.44, 0.06), (-1.30, 0.20),
    ]
    anchos = [0.40, 0.41, 0.41, 0.41, 0.41, 0.40, 0.40, 0.39,
              0.38, 0.38, 0.39, 0.40, 0.40, 0.36, 0.34]

    guarda_ext = [
        (0.26, 0.06), (0.32, -0.10), (0.31, -0.26), (0.24, -0.40),
        (0.10, -0.50), (-0.10, -0.53), (-0.28, -0.49), (-0.40, -0.38),
        (-0.46, -0.20), (-0.40, 0.06),
    ]
    guarda_int = [
        (0.16, 0.06), (0.21, -0.11), (0.20, -0.24), (0.15, -0.33),
        (0.05, -0.40), (-0.10, -0.42), (-0.23, -0.39), (-0.31, -0.30),
        (-0.36, -0.18), (-0.31, 0.06),
    ]

    # Estrias de amartillado. Sobresalen 0,035 (tres pixeles a tamano de
    # ficha) y cruzan la corredera de canto a canto: asi rompen silueta y no
    # dependen de que el ordenado por profundidad las ponga delante del panel.
    estrias = []
    for i in range(5):
        x = -1.20 + i * 0.115
        for lado in (1, -1):
            estrias.append(box(x, x + 0.055, 0.26, 0.60, 0.07,
                               y=lado * (MEDIA + 0.018)))

    return build([
        chamfer(slab(trasera, ANCHO), 0.035),
        chamfer(slab(delantera, ANCHO), 0.035),
        box(PORT_X0, PORT_X1, 0.24, PORT_Z, ANCHO),          # puente bajo la ventana
        box(PORT_X0, PORT_X1, PORT_Z, 0.62, 0.15, y=0.095),  # pared del lado opuesto
    ] + estrias + [
        chamfer(box(-1.30, 1.04, 0.06, 0.24, 0.31), 0.025),  # armazon
        # Riel de accesorios: dos tramos con la ranura en medio, que es lo que
        # lo distingue de un simple resalte.
        box(0.42, 0.66, -0.01, 0.07, 0.26),
        box(0.74, 1.02, -0.01, 0.07, 0.26),
        chamfer(slab(empunadura, anchos), 0.03),
        ring(guarda_ext, guarda_int, 0.26),
        # Disparador con su leva de seguridad: dos piezas, no una paleta.
        box(-0.28, -0.16, -0.34, -0.04, 0.12),
        box(-0.24, -0.20, -0.32, -0.06, 0.05, y=0.065),
        # El canon cruza la ventana en vez de asomar solo por la boca. Sin el,
        # el fondo del hueco tiene la misma normal que la cara de fuera y sale
        # del mismo color: la ventana se leia como una raya, no como un hueco.
        # Un cilindro ahi dentro reparte luz por cada gajo y ya se ve agujero.
        tube(0.24, 1.46, 0.085, 0.085, 12, 0, 0.46),
        # Retenida de corredera y boton del cargador, ambos a la izquierda.
        box(-0.30, 0.10, 0.08, 0.17, 0.05, y=0.18),
        box(-0.46, -0.34, -0.14, -0.02, 0.06, y=0.20),
        box(0.16, 0.26, 0.04, 0.14, 0.40),                   # pasador de desmontaje
        # Alza con su muesca: dos bloques y el hueco entre ellos. La muesca es
        # silueta, que a este tamano se ve; un rebaje en la cara no.
        box(-1.18, -1.08, 0.62, 0.74, 0.11, y=0.10),
        box(-1.18, -1.08, 0.62, 0.74, 0.11, y=-0.10),
        box(1.12, 1.22, 0.62, 0.72, 0.08),                   # punto de mira
        chamfer(box(-1.44, -0.70, -1.46, -1.32, 0.44), 0.02),  # base del cargador
    ])


def rifle():
    # Culata de una pieza: cantonera, carrillera, muneca, empunadura y
    # guardamano salen del mismo perfil, que es como esta hecha de verdad.
    # El escalon de los puntos 11-13 es el rebaje donde se aloja el
    # guardamonte; sin el, el aro quedaria enterrado en la madera.
    culata = [
        (-2.10, 0.34), (-1.78, 0.40), (-1.40, 0.34), (-1.16, 0.22),
        (-0.88, 0.14), (-0.34, 0.10), (0.62, 0.06), (0.80, 0.00),
        (1.52, -0.02), (1.56, -0.24), (0.70, -0.32), (0.16, -0.30),
        (0.12, -0.08), (-0.48, -0.12), (-0.56, -0.44), (-0.66, -0.74),
        (-0.86, -0.82), (-1.06, -0.74), (-1.18, -0.46), (-1.34, -0.16),
        (-1.62, -0.26), (-2.10, -0.34),
    ]
    # Un ancho por punto. Aqui esta la diferencia con la chapa: la muneca
    # estrangula a 0,28 y la cantonera abre a 0,44.
    anchos = [
        0.44, 0.38, 0.32, 0.28, 0.30, 0.34, 0.36, 0.36, 0.34, 0.34,
        0.36, 0.36, 0.34, 0.32, 0.30, 0.30, 0.31, 0.30, 0.28, 0.28,
        0.38, 0.44,
    ]
    guarda_ext = [
        (0.14, -0.06), (0.16, -0.22), (0.04, -0.34), (-0.24, -0.38),
        (-0.44, -0.32), (-0.50, -0.14), (-0.48, -0.06),
    ]
    guarda_int = [
        (0.06, -0.06), (0.08, -0.21), (0.00, -0.28), (-0.22, -0.31),
        (-0.37, -0.26), (-0.42, -0.13), (-0.40, -0.06),
    ]
    # El manillar nace sobre X y se tumba: 90 grados lo saca de costado y
    # otros 35 lo dejan caido, que es como se agarra.
    def cerrojo(x0, x1, r):
        bm = tube(x0, x1, r, r, 8)
        turn(bm, math.radians(90), 'Z')
        turn(bm, math.radians(-35), 'X')
        return move(bm, 0.10, 0, 0.30)

    # Cantonera: pieza aparte y un pelo mas ancha que la culata, que es como
    # se ve en el arma real, con su ceja sobresaliendo de la madera.
    cantonera = [(-2.18, 0.36), (-2.04, 0.34), (-2.04, -0.34), (-2.18, -0.36)]

    def anilla(x):
        # Portafusil. Va bajo el guardamano y bajo la culata, colgando lo
        # justo para verse en silueta.
        return tube(-0.05, 0.05, 0.055, 0.055, 8, 0, 0)

    # Ventana de expulsion del cajon, con la misma receta que la corredera de
    # la pistola: puente por debajo, pared a un lado y el cerrojo cruzando el
    # hueco para que se vea que hay algo dentro.
    PORT = (0.04, 0.48, 0.28)

    return build([
        chamfer(slab(culata, anchos), 0.022),
        chamfer(slab(cantonera, 0.46), 0.02),
        chamfer(box(-0.34, PORT[0], 0.06, 0.42, 0.32), 0.03),
        chamfer(box(PORT[1], 0.66, 0.06, 0.42, 0.32), 0.03),
        box(PORT[0], PORT[1], 0.06, PORT[2], 0.32),
        box(PORT[0], PORT[1], PORT[2], 0.42, 0.13, y=0.085),
        tube(-0.30, 0.62, 0.075, 0.075, 10, 0, 0.33),   # cuerpo del cerrojo
        cerrojo(0.0, 0.30, 0.045),
        cerrojo(0.28, 0.42, 0.075),                     # perilla
        # Canon de caza: recamara gruesa, adelgazamiento y boca. Un solo cono
        # de punta a punta no es el perfil de ninguna arma.
        tube(0.66, 1.20, 0.115, 0.112, 10, 0, 0.24),
        tube(1.20, 2.05, 0.112, 0.088, 10, 0, 0.24),
        tube(2.05, 2.88, 0.088, 0.076, 10, 0, 0.24),
        ring(guarda_ext, guarda_int, 0.16),
        box(-0.30, -0.20, -0.30, -0.08, 0.10),          # disparador
        chamfer(box(-0.20, 0.30, -0.32, -0.12, 0.26), 0.02),   # tapa del cargador
        move(anilla(0), 1.32, 0, -0.30),
        move(anilla(0), -1.72, 0, -0.34),
        # Visor 3-9x40: ocular, garganta, anillo de aumentos, tubo de 25,4,
        # campana de 40 y el bloque de torretas. Las torretas son lo que se
        # reconoce de un visor a cualquier tamano.
        tube(-0.95, -0.68, 0.19, 0.19, 12, 0, 0.66),
        tube(-0.68, -0.58, 0.19, 0.135, 12, 0, 0.66),
        tube(-0.58, -0.44, 0.155, 0.155, 12, 0, 0.66),
        tube(-0.44, 0.62, 0.135, 0.135, 12, 0, 0.66),
        tube(0.62, 0.78, 0.135, 0.21, 12, 0, 0.66),
        tube(0.78, 1.10, 0.21, 0.21, 12, 0, 0.66),
        chamfer(box(0.06, 0.32, 0.50, 0.82, 0.36), 0.02),      # bloque de torretas
        move(turn(tube(0, 0.16, 0.10, 0.10, 8), math.radians(-90), 'Y'), 0.19, 0, 0.80),
        move(turn(tube(0, 0.16, 0.10, 0.10, 8), math.radians(-90), 'Z'), 0.19, -0.16, 0.66),
        box(-0.38, -0.26, 0.40, 0.62, 0.22),
        box(0.40, 0.52, 0.40, 0.62, 0.22),
    ])


def shotgun():
    # Una superpuesta no es un rifle con dos canos: el guardamano es una
    # pieza suelta, el cajon se parte y encima lleva la llave de apertura.
    # Sin eso el modelo se lee como otro rifle.
    culata = [
        (-2.20, 0.34), (-1.85, 0.40), (-1.35, 0.36), (-0.95, 0.30),
        (-0.34, 0.26), (-0.34, -0.12), (-0.52, -0.14), (-0.62, -0.46),
        (-0.92, -0.54), (-1.06, -0.32), (-1.45, -0.30), (-1.85, -0.32),
        (-2.20, -0.34),
    ]
    anchos = [
        0.44, 0.38, 0.32, 0.28, 0.34, 0.34, 0.30, 0.28, 0.28, 0.28,
        0.32, 0.40, 0.44,
    ]
    # Pico de pato en la punta: ese labio hacia delante es de una superpuesta
    # de tiro y de nada mas.
    guardamano = [
        (1.55, 0.02), (1.63, -0.07), (1.55, -0.17), (1.44, -0.25),
        (1.10, -0.32), (0.66, -0.32), (0.52, -0.20), (0.52, 0.02),
    ]
    guarda_ext = [
        (0.10, -0.12), (0.12, -0.28), (0.00, -0.40), (-0.24, -0.44),
        (-0.42, -0.36), (-0.46, -0.14),
    ]
    guarda_int = [
        (0.02, -0.12), (0.04, -0.27), (-0.04, -0.34), (-0.22, -0.37),
        (-0.35, -0.30), (-0.38, -0.13),
    ]
    cantonera = [(-2.30, 0.36), (-2.16, 0.34), (-2.16, -0.34), (-2.30, -0.36)]

    # Banda ventilada: la cinta va despegada del cano y se apoya en pilares.
    # Ese hueco de 0,05 entre cano y cinta es la firma de una escopeta de
    # tiro; pegada al cano seria una banda maciza, que es otra arma.
    pilares = [box(x, x + 0.11, 0.30, 0.37, 0.07)
               for x in (0.88, 1.32, 1.76, 2.20, 2.64)]

    return build([
        chamfer(slab(culata, anchos), 0.022),
        chamfer(slab(cantonera, 0.46), 0.02),
        chamfer(box(-0.36, 0.48, -0.14, 0.30, 0.38), 0.035),   # cajon
        tube(0.44, 2.90, 0.09, 0.082, 12, 0, 0.22),            # cano superior
        tube(0.44, 2.90, 0.09, 0.082, 12, 0, 0.02),            # cano inferior
        tube(2.86, 3.00, 0.094, 0.094, 12, 0, 0.22),           # choke
        tube(2.86, 3.00, 0.094, 0.094, 12, 0, 0.02),
        # Costillas laterales: lo que mantiene los dos canos unidos.
        box(0.62, 2.88, 0.03, 0.21, 0.035, y=0.082),
        box(0.62, 2.88, 0.03, 0.21, 0.035, y=-0.082),
    ] + pilares + [
        box(0.55, 2.98, 0.37, 0.405, 0.10),                    # cinta de la banda
        move(turn(tube(0, 0.06, 0.04, 0.04, 8), math.radians(-90), 'Y'),
             2.92, 0, 0.40),                                   # perla
        chamfer(slab(guardamano, 0.34), 0.03),
        ring(guarda_ext, guarda_int, 0.16),
        box(-0.26, -0.16, -0.36, -0.14, 0.10),                 # disparador
        # Llave de apertura: en reposo cae a la derecha, no centrada.
        box(-0.10, 0.20, 0.30, 0.355, 0.12),
        box(0.02, 0.18, 0.298, 0.352, 0.11, y=0.11),
        box(-0.34, -0.16, 0.28, 0.33, 0.13),                   # seguro y selector
    ])


def optic():
    # Visor 3-9x40 suelto. Un tubo de 25,4 mm con 340 de largo da una
    # relacion de 13 a 1: mas gordo que eso parece un catalejo.
    # Se hornea a 16 gajos, no a los 12 de por defecto, porque sustituye a un
    # modelo escrito a mano que iba a 18 y no puede salir mas facetado.
    SEG = 16

    def torreta(eje, grados, base):
        # Cuerpo y tapa se cortan sobre el mismo eje X y se giran juntos, asi
        # la tapa cae siempre pegada al final del cuerpo. Calcularle una
        # posicion aparte es como se queda flotando.
        return [move(turn(tube(a, b, r, r, 10), math.radians(grados), eje), *base)
                for a, b, r in ((0, 0.20, 0.15), (0.20, 0.27, 0.17))]

    return build([
        tube(-2.00, -1.55, 0.26, 0.26, SEG),        # campana del ocular
        tube(-1.55, -1.38, 0.26, 0.155, SEG),
        tube(-1.38, -0.20, 0.155, 0.155, SEG),      # tubo
        tube(-1.12, -0.86, 0.19, 0.19, SEG),        # anillo de aumentos
        chamfer(box(-0.22, 0.26, -0.30, 0.30, 0.46), 0.03),   # bloque de torretas
    ] + torreta('Y', -90, (0.02, 0, 0.22)) + torreta('Z', -90, (0.02, -0.18, 0)) + [
        tube(0.26, 1.05, 0.155, 0.155, SEG),
        tube(1.05, 1.32, 0.155, 0.30, SEG),         # garganta
        tube(1.32, 1.90, 0.30, 0.30, SEG),          # campana del objetivo
    ])


def reddot():
    # Visor reflex abierto: dos paredes y un cristal inclinado entre ellas.
    # Lo que lo distingue de un tubo es justo eso, que se ve a traves.
    # Solo dos montantes cortos delante, no dos paredes de punta a punta: por
    # encima del cuerpo tiene que quedar aire, que es lo que se ve al apuntar.
    montante = [
        (0.20, -0.06), (0.90, -0.06), (0.92, 0.34), (0.72, 0.82),
        (0.44, 0.82), (0.28, 0.40),
    ]
    # El cristal cae hacia delante: el canto de arriba queda mas cerca del
    # tirador que el de abajo, que es como refleja el punto.
    cristal = [(0.44, 0.80), (0.58, 0.80), (0.80, -0.02), (0.66, -0.02)]

    def tornillo(x, y, z, axis):
        # 'Y' lo pone de pie (alza), 'Z' lo saca de costado (deriva). Girar
        # sobre X no haria nada: el tubo ya nace sobre ese eje.
        bm = tube(0, 0.13, 0.10, 0.10, 8)
        turn(bm, math.radians(-90), axis)
        return move(bm, x, y, z)

    # Marco del cristal: dos listones en el canto de arriba y el de abajo.
    # Un reflex real lleva el vidrio montado en un bisel, no al aire.
    def bisel(z0, z1, dx):
        return box(0.44 + dx, 0.60 + dx, z0, z1, 0.38)

    return build([
        chamfer(box(-1.00, 1.00, -0.64, -0.36, 0.62), 0.03),   # base de carril
        # Perno de apriete: cruza la base de lado a lado y asoma por los dos
        # cantos. A lo largo del eje del visor quedaba dentro y no se veia.
        move(turn(tube(0, 0.80, 0.075, 0.075, 8), math.radians(90), 'Z'),
             -0.55, -0.40, -0.50),
        # Tornillos de fijacion al carril, que es por donde se sujeta.
        move(turn(tube(0, 0.12, 0.075, 0.075, 8), math.radians(-90), 'Y'),
             -0.62, 0, -0.68),
        move(turn(tube(0, 0.12, 0.075, 0.075, 8), math.radians(-90), 'Y'),
             0.62, 0, -0.68),
        chamfer(box(-0.92, 0.92, -0.38, -0.04, 0.54), 0.03),   # cuerpo
        # Bandeja de la pila, a un costado y sobresaliendo 0,05.
        chamfer(box(-0.72, -0.10, -0.32, -0.10, 0.10, y=0.30), 0.02),
        chamfer(move(slab(montante, 0.11), 0, 0.215, 0), 0.02),
        chamfer(move(slab(montante, 0.11), 0, -0.215, 0), 0.02),
        slab(cristal, 0.34),
        bisel(0.74, 0.84, 0.0),
        bisel(-0.06, 0.04, 0.22),
        tornillo(-0.34, 0, -0.10, 'Y'),                        # alza
        tornillo(-0.34, -0.22, -0.20, 'Z'),                    # deriva
    ])


def gunCase():
    # La tapa va separada de la base por una ranura: ese hueco es lo que hace
    # que se lea como maletin y no como ladrillo. El asa es un aro de verdad,
    # con su agujero, no un bulto pegado encima.
    base = [
        (-2.42, -0.46), (2.42, -0.46), (2.48, -0.34), (2.48, -0.02),
        (-2.48, -0.02), (-2.48, -0.34),
    ]
    tapa = [
        (-2.48, 0.04), (2.48, 0.04), (2.48, 0.34), (2.40, 0.46),
        (-2.40, 0.46), (-2.48, 0.34),
    ]
    asa_ext = [
        (-0.50, 0.44), (0.50, 0.44), (0.54, 0.60), (0.46, 0.78),
        (-0.46, 0.78), (-0.54, 0.60),
    ]
    asa_int = [
        (-0.36, 0.44), (0.36, 0.44), (0.38, 0.58), (0.33, 0.67),
        (-0.33, 0.67), (-0.38, 0.58),
    ]

    def cierre(x):
        # Monta a caballo de la ranura y sobresale del cuerpo: si quedara
        # enrasado no se veria.
        return chamfer(box(x - 0.20, x + 0.20, -0.18, 0.20, 0.96), 0.03)

    def rueda(y):
        # Las de una maleta de tirador van en un extremo, no debajo: se lleva
        # inclinada, como una maleta de viaje.
        return move(turn(tube(0, 0.10, 0.19, 0.19, 10), math.radians(90), 'Z'),
                    -2.22, y, -0.40)

    return build([
        chamfer(slab(base, 0.88), 0.04),
        chamfer(slab(tapa, 0.88), 0.04),
        ring(asa_ext, asa_int, 0.26),
        cierre(-1.45),
        cierre(-0.55),
        cierre(0.55),
        cierre(1.45),
        rueda(0.34), rueda(-0.44),
        # Valvula de compensacion de presion: el boton redondo del frente, que
        # es lo que distingue una maleta estanca de una caja de herramientas.
        move(turn(tube(0, 0.10, 0.12, 0.12, 10), math.radians(90), 'Z'),
             2.10, 0.40, -0.16),
        # Nervios de apilado en la tapa.
        box(-1.90, 1.90, 0.46, 0.50, 0.16, y=0.24),
        box(-1.90, 1.90, 0.46, 0.50, 0.16, y=-0.24),
        box(-1.92, -1.48, -0.58, -0.44, 0.80),                 # pies
        box(1.48, 1.92, -0.58, -0.44, 0.80),
    ])


def binocular():
    # Techo, no porro: dos cuerpos rectos separados por un espinazo. El
    # modelo viejo los pegaba tanto que se leian como una sola vaina; aqui
    # se separan y entre medias asoma la rueda de enfoque.
    def cuerpo(y):
        return [
            tube(1.19, 1.28, 0.335, 0.335, 12, y, 0),  # bisel del objetivo
            tube(0.58, 1.25, 0.24, 0.32, 12, y, 0),    # campana del objetivo
            tube(-0.80, 0.58, 0.22, 0.22, 12, y, 0),
            tube(-1.10, -0.80, 0.17, 0.20, 12, y, 0),
            # Copa del ocular: se ensancha en el borde, que es donde apoya la
            # cuenca del ojo. Sin ese reborde el ocular es un tubo cortado.
            tube(-1.30, -1.10, 0.21, 0.21, 12, y, 0),
        ]

    # Solo ocupa el hueco entre los dos cuerpos (0,34 de los 0,36 que quedan
    # libres). Si lo hago tan ancho como la separacion entera, tapa el aire
    # de en medio y los dos cilindros se leen como un tronco.
    espinazo = [
        (-0.46, 0.08), (-0.40, 0.18), (0.34, 0.18), (0.40, 0.06),
        (0.40, -0.10), (0.34, -0.20), (-0.40, -0.20), (-0.46, -0.06),
    ]
    rueda = turn(tube(0, 0.32, 0.20, 0.20, 12), math.radians(90), 'Z')

    return build(cuerpo(0.40) + cuerpo(-0.40) + [
        chamfer(slab(espinazo, 0.34), 0.03),
        move(rueda, -0.12, -0.16, 0.16),
        # Anillo de dioptrias, solo en un ocular: en un prismatico real la
        # correccion va en uno de los dos, no en los dos.
        tube(-0.86, -0.74, 0.245, 0.245, 12, -0.40, 0),
        # Tapa de la rosca de tripode: en el frente del espinazo y mirando
        # adelante, que es donde va. El tubo ya nace sobre X, girarlo la
        # metia dentro del propio espinazo.
        move(tube(0, 0.10, 0.09, 0.09, 8), 0.36, 0, -0.04),
    ])


MODELS = {
    'optic': optic,
    'pistol': pistol,
    'rifle': rifle,
    'shotgun': shotgun,
    'reddot': reddot,
    'gcase': gunCase,
    'binocular': binocular,
}


# ------------------------------------------------------------------ #
# Salida                                                              #
# ------------------------------------------------------------------ #

HEAD = """/* meshes.js - GENERADO por tools/models.py, no editar a mano.
   Vertices horneados en Blender; los pinta js/scene.js, que sigue siendo el
   unico motor de dibujo. Para regenerar:
     "D:\\Editores Codigo\\blender.exe" --background --factory-startup \\
         --python tools/models.py */
(function (global) {
  'use strict';

  var M = {};
"""

TAIL = """
  global.GunShop = global.GunShop || {};
  global.GunShop.meshes = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
"""


def num(x):
    """Dos decimales sobran para una pieza de 3 unidades y recortan el
    archivo a la mitad. -0 se escribe 0."""
    v = round(x, 2)
    return '%g' % (v + 0.0 if v else 0.0)


def emit(path):
    out = [HEAD]
    for name in sorted(MODELS):
        try:
            verts, faces = MODELS[name]()
        except AssertionError as e:
            raise AssertionError('%s: %s' % (name, e))
        check(name, verts, faces)
        sys.stdout.write('  %-10s %4d vertices  %4d caras\n'
                         % (name, len(verts), len(faces)))

        vs = ','.join('[%s,%s,%s]' % (num(v[0]), num(v[1]), num(v[2])) for v in verts)
        fs = ','.join('[%s]' % ','.join(str(i) for i in f) for f in faces)
        out.append('\n  M.%s = {\n    verts: [%s],\n    faces: [%s]\n  };\n'
                   % (name, vs, fs))
    out.append(TAIL)

    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(''.join(out))
    sys.stdout.write('  -> %s (%.1f kB)\n' % (path, os.path.getsize(path) / 1024.0))


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    emit(os.path.join(root, 'js', 'meshes.js'))
