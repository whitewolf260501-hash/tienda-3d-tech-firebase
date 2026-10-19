"""
Comprime las fotos pesadas del celular y las deja listas para la tienda.

Uso:
  1. Descarga de Drive una carpeta por producto con el CÓDIGO como nombre:
         fotos_originales/TECH-001/*.jpg
         fotos_originales/TECH-002/*.jpg
  2. pip install pillow
  3. python scripts/preparar_fotos.py

Resultado: assets/productos/TECH-001/1.jpg, 2.jpg, ... (1200 px, ~200 KB c/u)
"""
from pathlib import Path
from PIL import Image, ImageOps

ORIGEN = Path("fotos_originales")
DESTINO = Path("assets/productos")

for carpeta in sorted(p for p in ORIGEN.iterdir() if p.is_dir()):
    fotos = sorted(f for f in carpeta.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    salida = DESTINO / carpeta.name
    salida.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(fotos, 1):
        img = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        img.thumbnail((1200, 1200))
        img.save(salida / f"{i}.jpg", "JPEG", quality=80, optimize=True)
    print(f"{carpeta.name}: {len(fotos)} fotos")
