const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, '.quality-check');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2' };
const server = http.createServer(async (req,res) => { try { let file = path.join(root, decodeURIComponent(new URL(req.url,'http://localhost').pathname)); if ((await fs.stat(file)).isDirectory()) file = path.join(file,'index.html'); res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(await fs.readFile(file)); } catch { res.writeHead(404); res.end(); } });
(async () => {
 await fs.mkdir(output, { recursive: true });
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 const origin = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({ channel:'msedge', headless:true });
 const errors=[], results=[];
 try {
  const page = await browser.newPage({ reducedMotion:'reduce' });
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin)) errors.push(`${r.status()} ${r.url()}`);});
  for (const width of [375,768,1440]) {
   await page.setViewportSize({width,height:900});
   for (const route of ['/', '/for-business/', '/for-business/?sector=medical', '/for-business/?sector=dentistry', '/for-business/?sector=other', '/cases/', '/contact.html']) {
    await page.goto(origin+route,{waitUntil:'networkidle'});
    await page.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.decode().catch(()=>{})));});
    const result=await page.evaluate(()=>({title:document.title,h1:document.querySelectorAll('h1').length,forms:document.querySelectorAll('form').length,overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src')),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))}));
    results.push({route,width,...result});
    await page.screenshot({path:path.join(output,`${width}-${route.replace(/[^a-z]/gi,'_')||'home'}.png`),fullPage:true});
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/cases/',{waitUntil:'networkidle'});
  const visibleOrder = await page.locator('.card h2').allTextContents();
  if(visibleOrder.slice(0,4).join('|')!=='Прикосновение|Соцветие|Красивая Ты|ЗдорЗуб'||visibleOrder.at(-1)!=='РемПроф') errors.push('Unexpected gallery order: '+visibleOrder);
  const projects=await page.evaluate(()=>window.PORTFOLIO_MATERIALS);
  for(const p of projects){
   for(const src of [p.logo,p.cover,p.thumb,p.full,...p.frames.map(f=>f.src)]) { try { await fs.access(path.join(root,'cases',src.split('?')[0])); } catch { errors.push(`Missing ${p.slug}: ${src}`); } }
   if(['stroyservis39','gracekelly','bmstair'].includes(p.slug))continue;
   await page.goto(origin+'/cases/?project='+p.slug,{waitUntil:'networkidle'});
   const destinations={touch:'https://ramprikosnovenie.ru/',socvetie:'https://будем.рф/',krasivaya:'https://красивая-ты.рф/'};
   if(destinations[p.slug] && await page.locator('#project-visit').getAttribute('href')!==destinations[p.slug]) errors.push('Wrong visit link: '+p.slug);
   await page.locator('#frames img').evaluateAll(async images=>await Promise.all(images.map(i=>i.decode())));
   await page.locator('#frames .frame').first().click({force:true});
   await page.locator('#inspector-image').evaluate(i=>i.decode());
   if(['zdorzub','remontsurgut','tai2'].includes(p.slug))await page.screenshot({path:path.join(output,'project-'+p.slug+'.png')});
   console.log('Gallery verified',p.slug,p.frames.length);
  }
  const external=[];
  for(const href of ['https://ramprikosnovenie.ru/','https://будем.рф/','https://красивая-ты.рф/']) {
   try { const response=await page.request.get(href,{timeout:20000}); external.push({href,status:response.status()}); } catch(e) {external.push({href,error:e.message.split('\n')[0]});}
  }
  console.log('External availability',JSON.stringify(external));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(origin+'/cases/',{waitUntil:'networkidle'});
  await page.locator('#pause').click();
  await page.locator('#next').click();
  await page.waitForFunction(()=>document.querySelector('.card.active h2')?.textContent==='Соцветие');
  await page.goto(origin+'/for-business/',{waitUntil:'networkidle'});
  await page.locator('[data-sector="medical"]').click();
  if(!(await page.locator('#example-link').getAttribute('href')).includes('spasibodoctor'))errors.push('Medical route mismatch');
  await page.locator('#change-sector').click();
  await page.locator('.business-sector-other').click();
  if(!page.url().includes('contact.html#direct-contact'))errors.push('Other sector route mismatch');
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({errors,external,visibleOrder,results},null,2));
  console.log(JSON.stringify({errors,checks:results.map(({route,width,h1,forms,overflow,broken})=>({route,width,h1,forms,overflow,broken}))},null,2));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
