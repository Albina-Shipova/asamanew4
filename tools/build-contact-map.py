import json,re,sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
audit=root/'tools/.contact-audit'
data=json.loads((audit/'ocr.json').read_text(encoding='utf-8-sig'))
assets={}
for tile in data:
 a=assets.setdefault(tile['asset'],{'width':tile['width'],'height':tile['height'],'lines':[]})
 for line in tile['lines']:
  if not line['words']: continue
  box=[min(w['x'] for w in line['words']),min(w['y'] for w in line['words']),max(w['x']+w['w'] for w in line['words']),max(w['y']+w['h'] for w in line['words'])]
  if not any(abs(box[1]-l['box'][1])<3 and line['text']==l['text'] for l in a['lines']):a['lines'].append({'text':line['text'],'box':box,'words':line['words']})
for key,a in assets.items():
 a['lines'].sort(key=lambda l:(l['box'][1],l['box'][0]))
 for line in a['lines']:
  text=line['text']
  if len(re.sub(r'\D','',text))>=9 or re.search(r'ул[., ]|улиц|просп|переул|шоссе|бульвар|офис|оф\.|адрес|телефон|контак|набереж|наб\.|проезд|г\.\s|квартал',text,re.I):
   print(key,':',text,':',','.join(str(round(v)) for v in line['box']))
(audit/'lines.json').write_text(json.dumps(assets,ensure_ascii=False),encoding='utf-8')

# OCR is a locator, not an authority: selected patterns and manually reviewed
# boxes below exclude prices, registration numbers, navigation and form labels.
masked={}
def add(key,box,reason):
 a=assets[key];pad=max(3,a['width']/600)
 rect=[max(0,box[0]-pad),max(0,box[1]-pad),min(a['width'],box[2]+pad),min(a['height'],box[3]+pad)]
 entry=masked.setdefault(key,{'width':a['width'],'height':a['height'],'rects':[]})
 if not any(max(abs(x-y) for x,y in zip(rect,r['box']))<4 for r in entry['rects']):entry['rects'].append({'box':rect,'reason':reason})
def words_box(words):
 return [min(w['x'] for w in words),min(w['y'] for w in words),max(w['x']+w['w'] for w in words),max(w['y']+w['h'] for w in words)]
for key,a in assets.items():
 for line in a['lines']:
  t=line['text'];digits=re.sub(r'\D','',t)
  if 10<=len(digits)<=12 and digits.startswith(('7','8')) and not re.search(r'ИНН|ОГР|месяц|000 000',t,re.I):
   words=[w for w in line['words'] if re.search(r'[\d+]',w['text'])]
   add(key,words_box(words),'phone')
  elif re.search(r'Губкин|Октябр|Охтя|Октя|Космонавт|Кропотк|Красных|Ленина|Университетск',t,re.I):
   words=line['words']
   # Keep leading business descriptions and trailing prose sharp.
   for j,w in enumerate(words):
    if re.search(r'^ул|^УЛ|^г\.$|^Пермь|^Сургут|^Воронеж|^Краснодар|^КРАСНОДАР',w['text']):words=words[j:];break
   end=next((j for j,w in enumerate(words) if re.search(r'Администратор|^На$|^на$|^5,0$',w['text'])),len(words))
   if end:words=words[:end]
   add(key,words_box(words),'address')

manual={
 'remontsurgut/cover.webp':[[1110,207,1281,234]],
 'remontsurgut/full.webp':[[227,7886,430,7909]],
 'remontsurgut/orbit-13.webp':[[469,760,716,781]],
 'semdoc4/full.webp':[[802,17,880,32]],
 'spasibodoctor/full.webp':[[770,17,860,34],[575,5723,834,5740]],
 'spasibodoctor/orbit-11.webp':[[922,689,1333,707]],
 'tai2/cover.webp':[[1312,24,1436,47]],
 'tai2/full.webp':[[524,4526,631,4603],[601,4872,683,4910],[603,4909,727,4925]],
 'tai2/orbit-09.webp':[[836,201,998,310]],
 'jaluzeperm/cover.webp':[[177,851,478,871]],
 'jaluzeperm/orbit-01.webp':[[177,851,478,871]],
 'jaluzeperm/full.webp':[[177,851,478,871],[1270,6676,1424,6699]],
 'jaluzeperm/orbit-08.webp':[[1270,860,1424,883]],
 'estetica/full.webp':[[371,5641,425,5656],[159,5736,355,5752],[488,6054,588,6071],[405,6192,548,6207],[161,5810,175,5831]],
 'estetica/orbit-13.webp':[[653,210,715,225],[417,318,640,333],[416,447,446,465]],
 'behome/full.webp':[[259,6206,396,6219]],
 'behome/orbit-11.webp':[[516,417,682,433]],
}
for key,boxes in manual.items():
 for box in boxes:add(key,box,'manual contact check')
# Thumbnail crops are the cover crops except Belous, whose thumbnail is the raw first section.
for slug in ['behome','belous','estetica','les','remontsurgut','semdoc4','spasibodoctor','tai2','jaluzeperm']:
 key=slug+'/thumb.webp';source=masked[slug+('/orbit-01.webp' if slug=='belous' else '/cover.webp')]
 with Image.open(root/'cases/materials'/key) as im:w,h=im.size
 masked[key]={'width':w,'height':h,'rects':[{'box':[r['box'][0]*w/source['width'],r['box'][1]*h/source['height'],r['box'][2]*w/source['width'],r['box'][3]*h/source['height']],'reason':r['reason']} for r in source['rects']]}
compact={k:{'width':v['width'],'height':v['height'],'rects':[[round(n,2) for n in r['box']] for r in v['rects']]} for k,v in masked.items()}
(root/'cases/contact-blur-map.js').write_text('window.PORTFOLIO_CONTACT_BLUR = '+json.dumps(compact,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(audit/'selected.json').write_text(json.dumps(masked,ensure_ascii=False,indent=2),encoding='utf-8')
print('Mapped',len(masked),'images,',sum(len(a['rects']) for a in masked.values()),'contact rectangles')
