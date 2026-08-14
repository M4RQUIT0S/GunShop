"""Hornea las imagenes fotorrealistas del sitio con Cycles.

    "D:\\Editores Codigo\\blender.exe" --background --factory-startup \
        --python tools/render.py -- [modelo ...]

Sin argumentos hornea los ocho. La geometria es la misma de `tools/models.py`,
solo que cargada con mas gajos por tubo (`models.DETALLE`) y con un material
por pieza: no hay un segundo modelado que pueda divergir del que dibuja el
sitio.

Escribe `img/card/<modelo>-<n>.webp`   (4 angulos, los mismos que art.js)
y      `img/hero/<modelo>-<nn>.webp`   (el barrido que recorre el scroll).

Todo procedural: ni una textura ni un HDRI descargado. Por la misma razon por
la que las fichas no llevan fotos de fabricante, y ademas asi el repositorio
se sigue bastando solo.
"""

import math
import os
import re
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Los mismos cuatro angulos que reparte art.js entre las fichas. Con uno solo,
# los 34 rifles saldrian con la imagen identica y eso se lee como averia.
ANGULOS_FICHA = (-1.15, -0.55, 0.2, 0.7)
PITCH_FICHA = -0.24
# El fondo usa otro cabeceo. Son dos encuadres distintos, no unificar.
PITCH_FONDO = -0.20
YAW_CENTRO, YAW_AMP = -0.30, 0.95
FOTOGRAMAS = 24

FICHA = (880, 550)      # 440x275 a doble densidad
FONDO = (1200, 750)     # va detras del texto, a 0,7 de opacidad
ALTO_ANCHO = FICHA[1] / float(FICHA[0])

# El esquema encuadra `span` unidades de modelo a lo ancho del lienzo y divide
# por `scale`. La imagen cubre exactamente esa ventana, centrada en el origen,
# para que el render caiga donde caia el dibujo.
SPAN = 5.2
# El fondo conserva la convencion del esquema (la imagen cubre SPAN/scale
# unidades) con un margen, para que el render caiga donde caia el dibujo. La
# ficha no: ahi se encuadra cada pieza a su medida, porque una foto de
# producto con el cargador cortado esta mal hecha. Y el esquema la cortaba.
MARGEN_FONDO = 1.35
MUESTRAS = 256


def escalas():
    """Lee los `scale` de scene.js: es su fuente de verdad, no la copiamos."""
    txt = open(os.path.join(RAIZ, 'js', 'scene.js'), encoding='utf-8').read()
    pares = re.findall(r"^\s*(\w+):\s*\{\s*build:[^}]*?scale:\s*([\d.]+)", txt, re.M)
    d = {k: float(v) for k, v in pares}
    assert len(d) == 8, 'esperaba 8 escalas en scene.js, encontre %d' % len(d)
    return d


# ------------------------------------------------------------------ #
# Geometria                                                           #
# ------------------------------------------------------------------ #


def cartucho():
    """El cartucho vive en scene.js, no en models.py: es pura revolucion y
    alli son ocho lineas. Para el render hace falta aqui, con las mismas
    cotas."""
    t = models.tube
    vaina = [(-1.66, -1.60, 0.17, 0.17), (-1.60, -1.50, 0.40, 0.40),
             (-1.50, -1.38, 0.29, 0.29), (-1.38, 0.10, 0.34, 0.34),
             (0.10, 0.46, 0.34, 0.22), (0.46, 0.76, 0.22, 0.22)]
    punta = [(0.76, 1.20, 0.22, 0.20), (1.20, 1.56, 0.20, 0.15),
             (1.56, 1.84, 0.15, 0.085), (1.84, 2.02, 0.085, 0.02)]
    return ([('laton', t(*p, seg=18)) for p in vaina] +
            [('cobre', t(*p, seg=18)) for p in punta])


def piezas_de(nombre):
    """Saca las piezas de un modelo antes de que build() las funda en una sola
    malla. Fundidas no se les puede poner un material a cada una."""
    if nombre == 'cartridge':
        return models.etiquetadas(cartucho())

    capturado = {}
    original = models.build

    def espia(parts):
        capturado['p'] = models.etiquetadas(parts)
        return [], []

    models.build = espia
    try:
        models.MODELS[nombre]()
    finally:
        models.build = original
    return capturado['p']


# ------------------------------------------------------------------ #
# Materiales                                                          #
# ------------------------------------------------------------------ #


def principled(nombre, **kw):
    mat = bpy.data.materials.new(nombre)
    mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return mat


def microrrelieve(mat, escala, fuerza, detalle=6):
    """Ninguna superficie real es un espejo perfecto. Un ruido finisimo en la
    normal es lo que convierte el metal de plastico brillante en acero."""
    nt = mat.node_tree
    ruido = nt.nodes.new('ShaderNodeTexNoise')
    ruido.inputs['Scale'].default_value = escala
    ruido.inputs['Detail'].default_value = detalle
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = fuerza
    nt.links.new(ruido.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'],
                 nt.nodes['Principled BSDF'].inputs['Normal'])
    return mat


def veta(mat):
    """Veta de nogal: ruido muy estirado en el eje del arma. Estirarlo es todo
    el truco; sin eso el ruido es piedra, no madera."""
    nt = mat.node_tree
    coord = nt.nodes.new('ShaderNodeTexCoord')
    mapa = nt.nodes.new('ShaderNodeMapping')
    mapa.inputs['Scale'].default_value = (0.30, 7.0, 7.0)
    ruido = nt.nodes.new('ShaderNodeTexNoise')
    ruido.inputs['Scale'].default_value = 5.0
    ruido.inputs['Detail'].default_value = 9
    ruido.inputs['Roughness'].default_value = 0.62
    rampa = nt.nodes.new('ShaderNodeValToRGB')
    rampa.color_ramp.elements[0].position = 0.32
    rampa.color_ramp.elements[0].color = (0.055, 0.021, 0.009, 1)
    rampa.color_ramp.elements[1].position = 0.68
    rampa.color_ramp.elements[1].color = (0.150, 0.068, 0.030, 1)
    nt.links.new(coord.outputs['Object'], mapa.inputs['Vector'])
    nt.links.new(mapa.outputs['Vector'], ruido.inputs['Vector'])
    nt.links.new(ruido.outputs['Fac'], rampa.inputs['Fac'])
    nt.links.new(rampa.outputs['Color'],
                 nt.nodes['Principled BSDF'].inputs['Base Color'])
    return mat


def biblioteca():
    m = {}
    # Pavonado: casi negro pero metalico, que es lo que le da el brillo frio.
    m['acero'] = microrrelieve(principled(
        'acero', **{'Base Color': (0.042, 0.047, 0.056, 1), 'Metallic': 1.0,
                    'Roughness': 0.26}), 420, 0.12)
    m['polimero'] = microrrelieve(principled(
        'polimero', **{'Base Color': (0.019, 0.021, 0.025, 1), 'Metallic': 0.0,
                       'Roughness': 0.47, 'Specular IOR Level': 0.38}), 260, 0.30)
    m['nogal'] = veta(principled(
        'nogal', **{'Metallic': 0.0, 'Roughness': 0.30,
                    'Coat Weight': 0.35, 'Coat Roughness': 0.16}))
    m['goma'] = microrrelieve(principled(
        'goma', **{'Base Color': (0.011, 0.012, 0.014, 1), 'Metallic': 0.0,
                   'Roughness': 0.86, 'Specular IOR Level': 0.22}), 180, 0.45)
    m['laton'] = microrrelieve(principled(
        'laton', **{'Base Color': (0.60, 0.42, 0.15, 1), 'Metallic': 1.0,
                    'Roughness': 0.21}), 500, 0.08)
    m['cobre'] = microrrelieve(principled(
        'cobre', **{'Base Color': (0.55, 0.32, 0.16, 1), 'Metallic': 1.0,
                    'Roughness': 0.28}), 500, 0.08)
    m['plastico'] = microrrelieve(principled(
        'plastico', **{'Base Color': (0.010, 0.011, 0.013, 1), 'Metallic': 0.0,
                       'Roughness': 0.62, 'Specular IOR Level': 0.35}), 120, 0.55)
    # El cristal no transmite: detras no hay nada que ver y un vidrio
    # transparente sobre fondo vacio se leeria como un agujero. Reflejo tintado.
    m['cristal'] = principled(
        'cristal', **{'Base Color': (0.05, 0.10, 0.09, 1), 'Metallic': 0.55,
                      'Roughness': 0.06, 'Coat Weight': 1.0})
    return m


POR_DEFECTO = {
    'pistol': 'acero', 'rifle': 'acero', 'shotgun': 'acero', 'optic': 'acero',
    'reddot': 'acero', 'binocular': 'goma', 'gcase': 'plastico',
    'cartridge': 'laton',
}


# ------------------------------------------------------------------ #
# Escena                                                              #
# ------------------------------------------------------------------ #


def apuntar(obj, hacia=(0, 0, 0)):
    obj.rotation_euler = (Vector(hacia) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def foco(col, nombre, sitio, energia, tamano):
    luz = bpy.data.lights.new(nombre, 'AREA')
    luz.energy = energia
    luz.size = tamano
    o = bpy.data.objects.new(nombre, luz)
    o.location = sitio
    col.objects.link(o)
    apuntar(o)
    return o


def montar(nombre, escala):
    """Arma la escena: geometria, materiales, luces y camara."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    col = bpy.context.collection
    mats = biblioteca()
    etiquetas, bms = piezas_de(nombre)

    pivote = bpy.data.objects.new('pivote', None)
    col.objects.link(pivote)

    caja = [[1e9] * 3, [-1e9] * 3]
    for i, bm in enumerate(bms):
        me = bpy.data.meshes.new('p%d' % i)
        bm.to_mesh(me)
        bm.free()
        me.materials.append(mats[etiquetas[i] or POR_DEFECTO[nombre]])
        obj = bpy.data.objects.new('p%d' % i, me)
        col.objects.link(obj)
        obj.parent = pivote
        for v in me.vertices:
            for k in range(3):
                caja[0][k] = min(caja[0][k], v.co[k])
                caja[1][k] = max(caja[1][k], v.co[k])

    # Suavizado por angulo: los cilindros se redondean y los cantos vivos
    # siguen vivos. A 12 gajos daba igual; a 48 y en primer plano, no.
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects:
        if o.type == 'MESH':
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_auto_smooth(angle=math.radians(31))

    # Estudio: principal alta a la izquierda, relleno bajo a la derecha y un
    # contraluz detras. El contraluz no es adorno: acero pavonado sobre fondo
    # #14181f sin un filo encendido no se distingue del fondo.
    foco(col, 'principal', (-3.4, -4.2, 4.6), 1600, 7.0)
    foco(col, 'relleno', (4.6, -3.0, -1.4), 210, 9.0)
    foco(col, 'contra', (1.6, 5.2, 3.4), 2600, 5.0)
    mundo = bpy.data.worlds.new('mundo')
    mundo.use_nodes = True
    mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (
        0.020, 0.024, 0.031, 1)
    bpy.context.scene.world = mundo

    cam = bpy.data.cameras.new('cam')
    cam.lens = 85.0
    cam.sensor_width = 36.0
    co = bpy.data.objects.new('cam', cam)
    co.rotation_euler = (math.radians(90), 0, 0)
    col.objects.link(co)
    bpy.context.scene.camera = co
    return pivote, caja, co


def encuadrar(ancho):
    """Un teleobjetivo lejos, no un gran angular cerca: a 85 mm la
    deformacion de perspectiva es la de una foto de producto."""
    cam = bpy.context.scene.camera
    cam.location = (0, -ancho * cam.data.lens / cam.data.sensor_width, 0)


def extremos(caja, yaws, pitch):
    """Cuanto ocupa la pieza en pantalla, en unidades de modelo, a lo largo de
    todos los angulos que se van a renderizar. Las ocho esquinas de la caja
    giradas: no hay nada que se salga sin que una esquina se salga antes."""
    mx = mz = 0.0
    for yaw in yaws:
        giro = Matrix.Rotation(pitch, 4, 'X') @ Matrix.Rotation(yaw, 4, 'Z')
        for sx in (0, 1):
            for sy in (0, 1):
                for sz in (0, 1):
                    p = giro @ Vector((caja[sx][0], caja[sy][1], caja[sz][2]))
                    mx = max(mx, abs(p.x))
                    mz = max(mz, abs(p.z))
    return mx, mz


def ancho_que_cabe(mx, mz, holgura=1.03):
    """Ventana minima que contiene la pieza, respetando la relacion de la
    imagen."""
    return max(2 * mx, 2 * mz / ALTO_ANCHO) * holgura


def ajustes(tam):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'GPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = (d.type == 'OPTIX')
    sc.cycles.samples = MUESTRAS
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = tam
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 82
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'


def disparar(pivote, yaw, pitch, destino):
    pivote.matrix_world = Matrix.Rotation(pitch, 4, 'X') @ Matrix.Rotation(yaw, 4, 'Z')
    bpy.context.scene.render.filepath = destino
    bpy.ops.render.render(write_still=True)


def barrido():
    """Los mismos angulos que recorre yawAt() con el scroll, de extremo a
    extremo."""
    return [YAW_CENTRO - YAW_AMP + 2 * YAW_AMP * i / (FOTOGRAMAS - 1.0)
            for i in range(FOTOGRAMAS)]


def medir(nombre, escala):
    """Margen que necesitaria el fondo de este modelo. Sirve para fijar
    MARGEN_FONDO de una vez sin renderizar 224 imagenes para averiguarlo."""
    _, caja, _ = montar(nombre, escala)
    necesario = ancho_que_cabe(*extremos(caja, barrido(), PITCH_FONDO), holgura=1.02)
    return necesario * escala / SPAN


def hornear(nombre, escala):
    ficha = os.path.join(RAIZ, 'img', 'card')
    fondo = os.path.join(RAIZ, 'img', 'hero')
    for d in (ficha, fondo):
        if not os.path.isdir(d):
            os.makedirs(d)

    pivote, caja, _ = montar(nombre, escala)

    ancho = ancho_que_cabe(*extremos(caja, ANGULOS_FICHA, PITCH_FICHA))
    encuadrar(ancho)
    ajustes(FICHA)
    for i, yaw in enumerate(ANGULOS_FICHA):
        disparar(pivote, yaw, PITCH_FICHA,
                 os.path.join(ficha, '%s-%d.webp' % (nombre, i)))

    ancho = MARGEN_FONDO * SPAN / escala
    hace_falta = ancho_que_cabe(*extremos(caja, barrido(), PITCH_FONDO), holgura=1.02)
    assert ancho >= hace_falta, (
        '%s: el fondo necesita MARGEN_FONDO >= %.2f' % (nombre, hace_falta * escala / SPAN))
    encuadrar(ancho)
    ajustes(FONDO)
    for i, yaw in enumerate(barrido()):
        disparar(pivote, yaw, PITCH_FONDO,
                 os.path.join(fondo, '%s-%02d.webp' % (nombre, i)))


if __name__ == '__main__':
    models.DETALLE = 4  # 12 gajos por tubo se ven poligonales a 880 px
    esc = escalas()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    solo_medir = '--medir' in argv
    argv = [a for a in argv if not a.startswith('-')]
    for nombre in (argv or sorted(esc)):
        assert nombre in esc, 'modelo desconocido: %s' % nombre
        if solo_medir:
            sys.stdout.write('MARGEN %-10s %.2f\n' % (nombre, medir(nombre, esc[nombre])))
        else:
            hornear(nombre, esc[nombre])
            sys.stdout.write('HORNEADO %s\n' % nombre)
        sys.stdout.flush()
