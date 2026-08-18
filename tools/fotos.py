"""Baja una foto libre por modelo del catalogo y la normaliza al encuadre de la ficha.

Solo Wikimedia Commons y solo dominio publico / CC0 / CC BY / CC BY-SA: el
repositorio es publico, asi que lo que entra aqui se redistribuye. La
atribucion va a img/model/creditos.json porque CC BY y CC BY-SA la exigen.
"""
import io, json, os, re, urllib.parse, urllib.request
from PIL import Image

UA = {'User-Agent': 'GunShopDemo/1.0 (marcosobrido@gmail.com)'}
API = 'https://commons.wikimedia.org/w/api.php?'
DESTINO = r'D:\GunShop\img\model'
ANCHO, ALTO = 1200, 750          # 8:5, el encuadre que ya usaba la ficha

ELEGIDAS = {
    'pistol':    'File:Glock 17 (transparent background).jpg',
    'rifle':     'File:Hunting rifle greyBG 01.jpg',
    'shotgun':   'File:O-U-Shotgun.jpg',
    'optic':     'File:Leupold Ultra Light Scope.jpg',
    'reddot':    'File:Red Dot Sight "Docter Sight 3".jpg',
    'binocular': 'File:Vortex Diamonback roof prism binoculars.jpg',
    'gcase':     'File:AKKAR Over & Under Hunting Shotgun 12G 01.jpg',
    'cartridge': 'File:Modern-rifle-cartridges-cases.jpg',
}

LIBRES = ('public domain', 'cc0', 'cc by', 'cc-by', 'pd-')

# La portada usa la misma foto que la ficha del visor, pero a lo ancho y con
# resolucion de pantalla: como fondo se estira a todo el ancho de la ventana.
HERO = ('optic', 2400, 1350)


def limpia(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def ficha(titulo):
    p = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'titles': titulo,
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1600,
    })
    with urllib.request.urlopen(urllib.request.Request(API + p, headers=UA), timeout=40) as r:
        pagina = next(iter(json.load(r)['query']['pages'].values()))
    if 'imageinfo' not in pagina:
        raise SystemExit('no existe en Commons: ' + titulo)
    return pagina['imageinfo'][0]


def encuadra(img, ancho=ANCHO, alto=ALTO):
    """Rellena el marco recortando por el centro: todas las fichas con el mismo aire."""
    img = img.convert('RGB')
    escala = max(ancho / img.width, alto / img.height)
    img = img.resize((round(img.width * escala), round(img.height * escala)), Image.LANCZOS)
    x, y = (img.width - ancho) // 2, (img.height - alto) // 2
    return img.crop((x, y, x + ancho, y + alto))


def main():
    os.makedirs(DESTINO, exist_ok=True)
    creditos = []

    for modelo, titulo in ELEGIDAS.items():
        info = ficha(titulo)
        meta = info.get('extmetadata', {})
        licencia = meta.get('LicenseShortName', {}).get('value', '?')
        assert any(t in licencia.lower() for t in LIBRES), \
            '%s es %s: no se puede redistribuir' % (titulo, licencia)

        url = info.get('thumburl') or info['url']
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
            datos = r.read()

        salida = os.path.join(DESTINO, modelo + '.webp')
        encuadra(Image.open(io.BytesIO(datos))).save(salida, 'WEBP', quality=82, method=6)
        print('%-10s %7d B  %s' % (modelo, os.path.getsize(salida), licencia))

        if modelo == HERO[0]:
            portada = os.path.join(os.path.dirname(DESTINO), 'hero.webp')
            encuadra(Image.open(io.BytesIO(datos)), HERO[1], HERO[2]).save(
                portada, 'WEBP', quality=80, method=6)
            print('%-10s %7d B  (portada)' % ('hero', os.path.getsize(portada)))

        creditos.append({
            'modelo': modelo,
            'titulo': titulo[5:],
            'autor': limpia(meta.get('Artist', {}).get('value', '')) or 'desconocido',
            'licencia': licencia,
            'pagina': info['descriptionurl'],
        })

    with open(os.path.join(DESTINO, 'creditos.json'), 'w', encoding='utf-8') as f:
        json.dump(creditos, f, ensure_ascii=False, indent=2)
    print('\nocho fotos, todas libres')


if __name__ == '__main__':
    main()
