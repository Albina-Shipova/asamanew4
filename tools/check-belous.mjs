import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'tools','.quality-check');await mkdir(out,{recursive:true});
const port=process.argv.includes('--merged')?9335:9334;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--hide-scrollbars',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(tmpdir(),'asama-quality-'+Date.now())}`,'--no-first-run'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 for(let k=0;k<60;k++){try{await fetch(`http://127.0.0.1:${port}/json/version`);break}catch{await wait(200)}}
 const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map();
 const errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params);if(m.method==='Network.loadingFailed'&&!m.params.canceled)errors.push(m.params);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(out,name+'.png'),Buffer.from(r.data,'base64'))};
 if(process.argv.includes('--merged')){
  const results=[];
  for(const [width,height] of [[1440,900],[1024,768],[390,844]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await send('Page.navigate',{url:'http://127.0.0.1:4176/cases/'});await wait(1800);
   await ev('paused=true;target=null');
   for(const slug of await ev(process.argv.includes('--staff')?`P.filter(p=>['estetica','spasibodoctor','semdoc4','remontsurgut','behome'].includes(p.slug)).map(p=>p.slug)`:'P.map(p=>p.slug)')){
    await ev(`window.current=P.findIndex(p=>p.slug===${JSON.stringify(slug)});window.pos=window.current;openOrbit();openInspector(0)`);
    const count=await ev('P[window.current].frames.length');
    for(let i=0;i<count;i++){
     const state=await ev(`(async()=>{const image=document.querySelector('#inspector-image');await image.decode();return {index:inspectorIndex,src:image.getAttribute('src'),expected:P[window.current].frames[inspectorIndex].src,w:image.naturalWidth,iframe:document.querySelectorAll('iframe').length,links:document.querySelectorAll('#orbit a[href],#inspector a[href]').length,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
     if(state.index!==i||state.src!==state.expected||!state.w||state.iframe||state.links||state.overflow)throw new Error(JSON.stringify({slug,width,...state}));
     if(process.argv.includes('--staff')&&((slug==='estetica'&&i===5)||(slug==='spasibodoctor'&&[5,8].includes(i))||(slug==='semdoc4'&&[5,8].includes(i))))await shot(`staff-${slug}-${i+1}-${width}`);
     await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
     await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    }
    if(await ev('inspectorIndex')!==0)throw new Error('Fullscreen wrap failed');
    if(['belous','behome'].includes(slug))await shot(`merged-${slug}-${width}`);
    await ev('closeInspector();closeOrbit()');
    results.push({width,slug,count,status:'passed'});
   }
   const names=await ev(`({belous:P.find(p=>p.slug==='belous').name,behome:P.find(p=>p.slug==='behome').name,full:P.find(p=>p.slug==='belous').full})`);
   if(names.belous!=='Виктория Черноус'||names.behome!=='Будь Дома'||!names.full.startsWith('materials-blurred/'))throw new Error('Merge regression '+JSON.stringify(names));
   console.log('PASS fullscreen '+width+': all screenshots, navigation, names, no live iframe or project links');
  }
  if(errors.length)throw new Error(JSON.stringify(errors));
  await writeFile(path.join(out,process.argv.includes('--staff')?'staff-gallery-checks.json':'merged-gallery-checks.json'),JSON.stringify({results,errors},null,2));
 }else if(process.argv.includes('--carousel')){
  const reports=[];
  for(const [width,height] of [[1440,900],[1024,768],[390,844]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4176/cases/'});await wait(1500);
  await ev('paused=true;target=null');
  const visits=[];
  for(let n=0;n<24;n++){
   const state=await ev(`(()=>{const card=document.querySelector('.card.active'),r=card.getBoundingClientRect();return {slug:P[window.current].slug,images:[...card.querySelectorAll('.preview img')].map(i=>{const s=getComputedStyle(i);return {src:i.getAttribute('src'),ready:i.complete&&i.naturalWidth>0,visible:s.visibility!=='hidden'&&Number(s.opacity)>.1,rect:i.getBoundingClientRect().height}}),blobs:[...document.images].some(i=>i.src.startsWith('blob:')),hidden:[...document.images].filter(i=>i.style.visibility==='hidden').length}})()`);
   if(!state.images.some(i=>i.ready&&i.visible&&i.rect>0)||state.blobs||state.hidden)throw new Error('Empty carousel card: '+JSON.stringify(state));
   visits.push(state.slug);
   if(n<12&&['spasibodoctor','remontsurgut'].includes(state.slug))await shot('fixed-carousel-'+state.slug);
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
   await wait(800);
  }
  if(new Set(visits).size!==12)throw new Error('Did not visit every project');
  for(const project of await ev('P.map(p=>p.slug)')){
   await ev(`window.current=P.findIndex(p=>p.slug===${JSON.stringify(project)});window.pos=window.current;openOrbit()`);
   await ev(`Promise.race([Promise.all([...document.querySelectorAll('#frames img')].map(i=>i.decode())),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image load timeout')),15000))])`);
   const result=await ev(`({slug:P[window.current].slug,broken:[...document.querySelectorAll('#frames img')].filter(i=>!i.complete||!i.naturalWidth||getComputedStyle(i).visibility==='hidden').length,oldMasker:typeof portfolioContactBlur!=='undefined',masked:[...document.querySelectorAll('#frames img')].filter(i=>i.currentSrc.includes('/materials-blurred/')).length})`);
   if(result.broken||result.oldMasker)throw new Error('Gallery loading failed: '+JSON.stringify(result));
   if(['touch','socvetie','krasivaya'].includes(project)&&result.masked)throw new Error('Exclusion failed');
   await ev('hoveredFrame=P[window.current].frames.length-1;renderFrames()');await wait(750);
   if(['spasibodoctor','remontsurgut'].includes(project))await shot('fixed-orbit-'+project);
   await ev('closeOrbit()');await wait(100);
   reports.push({width,height,...result});console.log(JSON.stringify({width,...result}));
  }
  console.log('PASS '+width+': two complete carousel cycles; all 12 galleries; no hidden or blob images.');
  }
  await writeFile(path.join(out,'static-loading-checks.json'),JSON.stringify(reports,null,2));
 }else if(process.argv.includes('--privacy')){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4176/cases/?project=belous'});await wait(1200);
  const keys=await ev('Object.keys(PORTFOLIO_CONTACT_BLUR)');
  if(keys.some(k=>/^(touch|socvetie|krasivaya|bmstair|gracekelly|stroyservis39)\//.test(k)))throw new Error('Excluded project masked');
  const reports=[];
  for(const key of keys){
   const result=await ev(`(async()=>{
    const key=${JSON.stringify(key)}, spec=PORTFOLIO_CONTACT_BLUR[key];
    const load=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
    const original=await load('materials/'+key), masked=await load('materials-blurred/'+key.replace(/\\.webp$/,'.png'));
    const c=document.createElement('canvas');c.width=original.naturalWidth;c.height=original.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(original,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(masked,0,0);const b=ctx.getImageData(0,0,c.width,c.height).data;
    let changed=0,outside=0,maxOutside=0;
    for(let p=0;p<a.length;p+=4){if(a[p]===b[p]&&a[p+1]===b[p+1]&&a[p+2]===b[p+2])continue;changed++;const x=(p/4)%c.width,y=Math.floor(p/4/c.width);if(!spec.rects.some(r=>x>=Math.floor(r[0])&&x<=Math.ceil(r[2])&&y>=Math.floor(r[1])&&y<=Math.ceil(r[3]))){outside++;maxOutside=Math.max(maxOutside,Math.abs(a[p]-b[p]),Math.abs(a[p+1]-b[p+1]),Math.abs(a[p+2]-b[p+2]));}}
    return {key,changed,outside,maxOutside,w:c.width,h:c.height,png:c.toDataURL('image/png').split(',')[1]};
   })()`);
   if(result.outside||!result.changed)throw new Error('Pixel check failed '+JSON.stringify({...result,png:null}));
   if(result.png){
    const target=path.join(root,'cases','materials-blurred',key.replace(/\.webp$/,'.png'));
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,Buffer.from(result.png,'base64'));
   }
   delete result.png;reports.push(result);
  }
  for(const project of await ev('P.map(p=>p.slug)')){
   await ev(`window.current=P.findIndex(p=>p.slug===${JSON.stringify(project)});window.pos=window.current;openOrbit()`);
   await wait(1200);
   const status=await ev(`({slug:P[window.current].slug,images:[...document.querySelectorAll('#frames img')].map(i=>({src:i.getAttribute('src'),state:i.dataset.contactBlur||'untouched',complete:i.complete,width:i.naturalWidth})),pending:document.querySelectorAll('img[data-contact-blur="pending"],img[data-contact-blur="error"]').length})`);
   if(status.pending||status.images.some(i=>!i.complete||!i.width))throw new Error('Gallery image failed '+JSON.stringify(status));
   if(['touch','socvetie','krasivaya'].includes(project)&&status.images.some(i=>i.state!=='untouched'))throw new Error('Excluded gallery changed');
   console.log(project+': loaded, contacts checked');
  }
  await writeFile(path.join(out,'contact-blur-checks.json'),JSON.stringify(reports,null,2));
  console.log('PASS: '+keys.length+' images; pixels outside contact rectangles unchanged; all 12 galleries load.');
 }else if(process.argv.includes('--compare')){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:4176/cases/?project=belous'});await wait(2000);
  await ev('hoveredFrame=2;renderFrames()');await wait(1000);
  await shot('compare-orbit');
  console.log(await ev(`(()=>{const i=document.querySelectorAll('.frame img')[2],r=i.getBoundingClientRect();const plain=i.cloneNode();Object.assign(plain.style,{position:'fixed',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',zIndex:999,objectFit:'contain',pointerEvents:'none'});document.querySelector('#orbit').append(plain);return {x:r.x,y:r.y,w:r.width,h:r.height,natural:i.naturalWidth}})()`));
  await wait(500);await shot('compare-plain');
 }else if(process.argv.includes('--source')){
  await send('Emulation.setDeviceMetricsOverride',{width:1100,height:800,deviceScaleFactor:2,mobile:false});
  await send('Page.navigate',{url:'https://belous.asama.site/'});await wait(4000);
  console.log(JSON.stringify(await ev(`(async()=>{await document.fonts.ready;for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}scrollTo(0,0);await new Promise(r=>setTimeout(r,1000));return [...document.querySelectorAll('header,main>*,section,footer')].map(e=>({tag:e.tagName,id:e.id,cls:e.className,y:e.getBoundingClientRect().top+scrollY,h:e.offsetHeight,text:e.innerText.slice(0,100)}))})()`),null,2));
  await shot('source-1100');
 }else{
  const slug=process.argv.includes('--estetica')?'estetica':'belous',count=slug==='estetica'?12:8;
  for(const [width,height] of [[1440,900],[1024,768],[390,844]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await send('Page.navigate',{url:'http://127.0.0.1:4176/cases/?project='+slug});await wait(1500);
   if(await ev(`P[window.current].slug`)!==slug)throw new Error('Direct project link opened the wrong project');
   const numbering=await ev(`[...document.querySelectorAll('.frame-number')].map(e=>e.textContent)`);
   if(numbering.length!==count||numbering.some((n,i)=>n!==String(i+1).padStart(2,'0')))throw new Error('Numbering failed');
   await wait(800);
   const results=[];
   for(let i=1;i<count;i++){
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:100});await wait(500);
    const p=await ev(`(()=>{const r=document.querySelectorAll('.frame')[${i}].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await wait(600);
    const samples=[];
    for(let k=0;k<5;k++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+k%2,y:p.y});await wait(90);samples.push(await ev(`hoveredFrame`))}
    results.push({i,samples});
    if(samples.some(value=>value!==i))throw new Error('Hover reset: '+JSON.stringify({width,i,samples}));
    const sharp=await ev(`(()=>{const layer=document.querySelector('.sharp-preview'),source=document.querySelector('.is-focused-frame img'),a=layer.getBoundingClientRect(),b=source.getBoundingClientRect();return {visible:!layer.hidden,source:layer.querySelector('img').currentSrc===source.currentSrc,error:Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height)),pointer:getComputedStyle(layer).pointerEvents}})()`);
    if(!sharp.visible||!sharp.source||sharp.error>0.1||sharp.pointer!=='none')throw new Error('Sharp layer failed: '+JSON.stringify({width,i,...sharp}));
    if(i===1)await shot('orbit-combined-'+slug+'-'+width);
    if(i===2&&width===1440)await shot('orbit-third');
    if(i===4)await shot('orbit-fifth-'+width);
   }
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:50});
   const before=await ev('fi');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
   if(await ev('fi')!==(before+1)%count)throw new Error('Keyboard navigation failed');
   const arrow=await ev(`(()=>{const r=document.querySelector('#fn').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',...arrow});
   await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...arrow});
   await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...arrow});
   if(await ev('fi')!==(before+2)%count)throw new Error('Arrow navigation failed');
   if(width===390){
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:260,y:430}]});
    await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:430}]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(await ev('fi')!==(before+3)%count)throw new Error('Swipe navigation failed');
   }
   console.log(JSON.stringify({width,results,navigation:'passed',dom:await ev(`({overflow:document.documentElement.scrollWidth>innerWidth,images:[...document.querySelectorAll('#frames img')].map(i=>({complete:i.complete,w:i.naturalWidth,h:i.naturalHeight}))})`)}));
  }
 }
}finally{ws?.close();chrome.kill()}



