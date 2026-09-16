"""Repair the shifted phone in the replacement Chernous hero, offline only."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

root = Path(__file__).resolve().parents[1]
source = root / 'cases/materials/belous/orbit-01.webp'
target = root / 'cases/materials-blurred/belous/orbit-01.png'
image = Image.open(source).convert('RGB')
assert image.size == (3200, 1696)
rect = (2514, 110, 2810, 155)
original = image.copy()
image.paste(image.crop(rect).filter(ImageFilter.GaussianBlur(16)), rect)
diff = ImageChops.difference(image, original)
bounds = diff.getbbox()
assert bounds and bounds[0] >= rect[0] and bounds[1] >= rect[1]
assert bounds[2] <= rect[2] and bounds[3] <= rect[3]
image.save(target)
print('Repaired hero phone only; unchanged dimensions and pixels outside phone.')
