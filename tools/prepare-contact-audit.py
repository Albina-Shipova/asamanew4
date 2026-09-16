import json
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
out=root/'tools/.contact-audit';out.mkdir(exist_ok=True)
slugs=['behome','belous','estetica','les','remontsurgut','semdoc4','spasibodoctor','tai2','jaluzeperm']
items=[]
for slug in slugs:
 for source in sorted((root/'cases/materials'/slug).glob('*.webp')):
  if source.stem=='thumb': continue
  im=Image.open(source).convert('RGB')
  scale=min(2,2400/im.width)
  tile_height=int(1800/scale)
  for y in range(0,im.height,tile_height):
   y0=max(0,y-60)
   tile=im.crop((0,y0,im.width,min(im.height,y+tile_height)))
   tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
   name=f'{slug}-{source.stem}-{y}.png'
   tile.save(out/name)
   items.append({'file':str(out/name),'asset':f'{slug}/{source.name}','width':im.width,'height':im.height,'scale':scale,'y':y0})
(out/'inputs.json').write_text(json.dumps(items),encoding='utf-8')
print(len(items),'OCR tiles')
