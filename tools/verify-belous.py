from pathlib import Path
from PIL import Image, ImageChops, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
sheet = Image.new('RGB', (1600, 1000), '#171b19')
draw = ImageDraw.Draw(sheet)
for n in range(1, 9):
    name = f'orbit-{n:02}'
    raw = Image.open(root / 'tools/.capture-raw/belous' / (name + '.png')).convert('RGB')
    saved = Image.open(root / 'cases/materials/belous' / (name + '.webp')).convert('RGB')
    assert raw.size == saved.size
    assert ImageChops.difference(raw, saved).getbbox() is None, name + ': lossy conversion'
    thumb = ImageOps.contain(saved, (780, 225))
    x, y = (n-1) % 2 * 800, (n-1) // 2 * 250
    sheet.paste(thumb, (x+(800-thumb.width)//2, y+20))
    draw.text((x+10,y+3), name, fill='white')
    print(name, saved.size, 'exact pixels / lossless')
sheet.save(root / 'tools/.quality-check/all-belous.png')
