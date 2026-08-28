"""Hornea el monograma de Alcantara en PNG.

Existe porque Google pide el logo del consent screen en mapa de bits (jpg,
png o bmp) y no acepta SVG. Nada del sitio lo usa: el favicon y el cuadrado
de redes son `app/icon.svg` y `public/img/marca/alcantara-monograma.svg`,
que son vectores.

    python tools/marca.py                  -> public/img/marca/alcantara-120.png
    python tools/marca.py --tam 512        -> otro tamano
    python tools/marca.py --salida x.png

Se dibuja el poligono a mano y no se convierte el SVG a propósito: la marca
son tres poligonos rectos, y rasterizar el vector traeria cairosvg o un
navegador headless para nada.

ponytail: las coordenadas estan aqui Y en los dos SVG. El canonico es
`app/icon.svg`; si se retoca la letra, se retoca alli primero y se copia el
`d` a mano. Son tres lineas que cambian una vez cada nunca -- unificarlo
pidiendo un parser de SVG cuesta mas que la copia.
"""

import argparse
from PIL import Image, ImageDraw

# Sistema de coordenadas del SVG: viewBox de 64x64. La A ocupa x 10..54 e
# y 12..52, ya centrada en los dos ejes.
LIENZO = 64
NEGRO = (0, 0, 0)
BLANCO = (255, 255, 255)

FUERA = [(32, 12), (54, 52), (10, 52)]                        # triangulo exterior
OJO = [(32, 27.5), (38.1, 38.5), (25.9, 38.5)]                # contrapunzon
MUESCA = [(23.2, 43.5), (40.8, 43.5), (45.5, 52), (18.5, 52)]  # hueco bajo el travesano

# Se dibuja grande y se reduce: las diagonales de la A a 120 px salen con el
# escalon del rasterizador si se pintan al tamano final.
SOBREMUESTREO = 8


def dibuja(tam: int) -> Image.Image:
    grande = tam * SOBREMUESTREO
    k = grande / LIENZO
    img = Image.new("RGB", (grande, grande), NEGRO)
    lapiz = ImageDraw.Draw(img)
    # Mismo orden que el `fill-rule="evenodd"` del SVG: la letra y despues
    # los dos huecos en el color del fondo.
    lapiz.polygon([(x * k, y * k) for x, y in FUERA], fill=BLANCO)
    for hueco in (OJO, MUESCA):
        lapiz.polygon([(x * k, y * k) for x, y in hueco], fill=NEGRO)
    return img.resize((tam, tam), Image.LANCZOS)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    # 120 es lo que pide Google para el logo del consent screen.
    p.add_argument("--tam", type=int, default=120, help="lado en pixeles (def. 120)")
    p.add_argument("--salida", default=None, help="fichero de salida")
    args = p.parse_args()

    salida = args.salida or f"public/img/marca/alcantara-{args.tam}.png"
    dibuja(args.tam).save(salida, "PNG", optimize=True)
    print(f"{salida}  {args.tam}x{args.tam}")


if __name__ == "__main__":
    main()
