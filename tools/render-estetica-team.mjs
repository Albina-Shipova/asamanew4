import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--hide-scrollbars','--remote-debugging-port=9337',`--user-data-dir=${path.join(tmpdir(),'estetica-team-'+Date.now())}`,'--no-first-run'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 for(let n=0;n<60;n++){try{await fetch('http://127.0.0.1:9337/json/version');break}catch{await wait(200)}}
 const page=await(await fetch('http://127.0.0.1:9337/json/new?about:blank',{method:'PUT'})).json();
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Page.enable');
 const jobs=[['tools/estetica-team.html',1600,900,'estetica/orbit-07-team.png'],['tools/estetica-full.html',1000,6256,'estetica/full-team.png']];
 const context={window:{}};vm.runInNewContext(await readFile(path.join(root,'tools/staff-masks.js'),'utf8'),context);
 for(const [slug,frames] of Object.entries(context.window.STAFF_MASKS)){
  for(const frame of Object.keys(frames))jobs.push([`tools/staff-mask.html?slug=${slug}&frame=${frame}`,1600,900,`${slug}/orbit-${frame}-staff.png`]);
  jobs.push([`tools/staff-mask.html?slug=${slug}&frame=full`,1000,{spasibodoctor:5825,semdoc4:5923,remontsurgut:8007,behome:6630}[slug],`${slug}/full-staff.png`]);
 }
 jobs.push(['tools/behome-social.html',1600,900,'behome/orbit-11-social.png'],['tools/behome-social.html?full=1',1000,6630,'behome/full-social.png'],['tools/estetica-combined.html',1600,900,'estetica/orbit-02-03.png']);
 if(process.argv.includes('--reviews')){
  jobs.length=0;
  const reviewContext={window:{}};vm.runInNewContext(await readFile(path.join(root,'tools/review-masks.js'),'utf8'),reviewContext);
  for(const [slug,spec] of Object.entries(reviewContext.window.REVIEW_MASKS)){
   jobs.push([`tools/review-mask.html?slug=${slug}`,1600,900,`${slug}/orbit-${spec.frame}-reviews.png`],[`tools/review-mask.html?slug=${slug}&full=1`,1000,spec.height,`${slug}/full-reviews.png`]);
  }
 }
 for(const [url,width,height,file] of jobs){
  const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
  if(only&&!file.startsWith(only+'/'))continue;
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:4176/${url}`});await wait(700);
  await ev('(()=>{if(!document.images.length)throw new Error("Missing source image");return Promise.all([...document.images].map(i=>i.decode()))})()');await wait(200);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(path.join(root,'cases/materials-blurred',file),Buffer.from(shot.data,'base64'));
  console.log('Saved '+file+' '+width+'x'+height);
 }
}finally{ws?.close();chrome.kill()}
