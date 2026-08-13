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
    w = [width * 0.5] * n if isinstance(width, (int, float)) else list(width)
    assert len(w) == n, 'un ancho por punto del perfil'

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


def tidy(bm, angle=math.radians(1.0)):
    """Funde caras que ya eran coplanares. Limpia los cortes que dejan los
    biseles sin tocar la silueta."""
    bmesh.ops.dissolve_limit(bm, angle_limit=angle, verts=bm.verts[:],
                             edges=bm.edges[:], delimit=set())
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


def build(parts):
    """Une los solidos de un modelo. Cada uno se comprueba por separado:
    juntos dejarian de ser cerrados donde se cruzan."""
    verts, faces = [], []
    for i, bm in enumerate(parts):
        pv, pf = dump(bm)
        check('pieza %d' % i, pv, pf)
        base = len(verts)
        verts.extend(pv)
        faces.extend([[k + base for k in f] for f in pf])
        bm.free()
    return verts, faces


# ------------------------------------------------------------------ #
# Modelos                                                             #
# ------------------------------------------------------------------ #

# Escala: 1 unidad = 75 mm. Una pistola de servicio mide 204 mm de largo y
# 138 de alto -> 2,72 x 1,84, que es justo el hueco que ocupaba el modelo
# viejo. Asi no hay que retocar ni PLACE ni span ni scale.


def pistol():
    corredera = [
        (-1.30, 0.26), (1.36, 0.26), (1.42, 0.32), (1.42, 0.56),
        (1.34, 0.62), (-1.22, 0.62), (-1.30, 0.54),
    ]
    # La empunadura se inclina 16 grados: el canto de abajo cae mas atras que
    # el de arriba, que es lo que distingue una pistola de un taladro.
    empunadura = [
        (-0.33, 0.04), (-0.42, -0.40), (-0.52, -0.84), (-0.60, -1.16),
        (-0.70, -1.32), (-1.38, -1.32), (-1.40, -1.10), (-1.36, -0.62),
        (-1.28, 0.04),
    ]
    # La pata trasera del guardamonte se mete dentro de la empunadura en vez
    # de quedarse a un lado: en un arma real ese aro nace del frente de la
    # empunadura, y separados se leen como dos piezas sueltas.
    guarda_ext = [
        (0.26, 0.06), (0.32, -0.12), (0.28, -0.34), (0.14, -0.48),
        (-0.18, -0.52), (-0.38, -0.44), (-0.46, -0.22), (-0.40, 0.06),
    ]
    guarda_int = [
        (0.16, 0.06), (0.21, -0.13), (0.18, -0.30), (0.08, -0.39),
        (-0.16, -0.42), (-0.30, -0.36), (-0.36, -0.20), (-0.31, 0.06),
    ]
    return build([
        chamfer(slab(corredera, 0.34), 0.04),
        chamfer(box(-1.28, 0.98, 0.02, 0.28, 0.31), 0.025),
        # Ancho por punto: la empunadura engorda en la palma y adelgaza hacia
        # el cargador. Y es mas ancha que la corredera, no al reves: 30 mm
        # contra 25,5. Con grosor constante esto es una tabla.
        chamfer(slab(empunadura, [0.40, 0.41, 0.40, 0.38, 0.37,
                                  0.37, 0.38, 0.40, 0.40]), 0.035),
        ring(guarda_ext, guarda_int, 0.26),
        box(-0.28, -0.16, -0.34, -0.04, 0.12),
        tube(1.34, 1.46, 0.085, 0.085, 10, 0, 0.44),
        box(1.14, 1.24, 0.62, 0.70, 0.09),
        box(-1.18, -1.08, 0.62, 0.72, 0.26),
        # Base del cargador: sobresale un poco del cuerpo, que es lo que
        # remata la empunadura por abajo.
        chamfer(box(-1.42, -0.68, -1.44, -1.30, 0.44), 0.02),
    ])


MODELS = {
    'pistol': pistol,
}


# ------------------------------------------------------------------ #
# Salida                                                              #
# ------------------------------------------------------------------ #

HEAD = """/* meshes.js - GENERADO por tools/models.py, no editar a mano.
   Vertices horneados en Blender; los pinta js/scene.js, que sigue siendo el
   unico motor de dibujo. Para regenerar:
     "D:\\\\Editores Codigo\\\\blender.exe" --background --factory-startup \\
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
        verts, faces = MODELS[name]()
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
