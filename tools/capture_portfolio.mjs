import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW_ROOT = path.join(ROOT, "tools", ".capture-raw");
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9333;
const hidden = new Set(["gracekelly", "bmstair", "stroyservis39"]);
const requested = process.argv.includes("--project")
  ? process.argv[process.argv.indexOf("--project") + 1]
  : null;

const context = { window: {} };
vm.runInNewContext(await readFile(path.join(ROOT, "cases", "materials.js"), "utf8"), context);
const projects = context.window.PORTFOLIO_MATERIALS.filter(
  (project) => !hidden.has(project.slug) && (!requested || project.slug === requested),
);

if (!projects.length) throw new Error(`Проект не найден: ${requested}`);

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    };
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  close() {
    this.ws.close();
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForChrome() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error("Chrome DevTools не запустился");
}

async function newPage(url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT",
  });
  if (!response.ok) throw new Error(`Не удалось открыть ${url}: ${response.status}`);
  return response.json();
}

async function captureProject(project) {
  const sourceWidth = project.width || 1600;
  const page = await newPage("about:blank");
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: sourceWidth,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await cdp.send("Page.navigate", { url: project.url });
  await wait(2500);
  await cdp.send("Runtime.evaluate", {
    expression: `(async()=>{
      await document.fonts.ready;
      const images=[...document.images];
      await Promise.race([
        Promise.all(images.map(img=>img.complete?img.decode().catch(()=>{}):new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true})}))),
        new Promise(r=>setTimeout(r,8000))
      ]);
      for(let y=0;y<document.documentElement.scrollHeight;y+=Math.max(500,innerHeight*.7)){scrollTo(0,y);await new Promise(r=>setTimeout(r,90));}
      scrollTo(0,0);await new Promise(r=>setTimeout(r,500));
    })()`,
    awaitPromise: true,
  });

  const metrics = await cdp.send("Page.getLayoutMetrics");
  const contentHeight = Math.ceil(metrics.cssContentSize?.height ?? metrics.contentSize.height);
  const outputDir = path.join(RAW_ROOT, project.slug);
  await mkdir(outputDir, { recursive: true });

  // Belous: measure live sections after fonts and reveal animations settle.
  // Crop empty section padding, retaining the complete content and 24px breathing room.
  let measuredClips = null;
  if (project.slug === 'belous') {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(()=>{
        document.querySelectorAll('.reveal').forEach(e=>{e.style.opacity='1';e.style.transform='none';e.style.transition='none'});
        const sections=[...document.querySelectorAll('main > section')];
        return sections.map((section,i)=>{
          let box=section.getBoundingClientRect();
          if(i===0)return {x:0,y:0,width:innerWidth,height:Math.ceil(box.bottom+scrollY)};
          if(i===sections.length-1){const foot=document.querySelector('footer').getBoundingClientRect();return {x:0,y:Math.floor(box.top+scrollY),width:innerWidth,height:Math.ceil(foot.bottom-box.top)}}
          const content=section.querySelector(':scope > .container');
          if(content&&!section.classList.contains('photo-band')){
            const r=content.getBoundingClientRect();const x=Math.max(0,Math.floor(r.left-24)), y=Math.max(Math.floor(box.top+scrollY),Math.floor(r.top+scrollY-24));
            return {x,y,width:Math.min(innerWidth-x,Math.ceil(r.width+48)),height:Math.ceil(Math.min(box.bottom+scrollY,r.bottom+scrollY+24)-y)};
          }
          return {x:0,y:Math.floor(box.top+scrollY),width:innerWidth,height:Math.ceil(box.height)};
        });
      })()`, returnByValue:true,
    });
    measuredClips = result.result.value;
    if(measuredClips.length!==project.frames.length)throw new Error('Belous section count changed');
    await writeFile(path.join(outputDir,'clips.json'), JSON.stringify(measuredClips,null,2));
  }

  const full = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: sourceWidth, height: contentHeight, scale: 1 },
  });
  await writeFile(path.join(outputDir, "full.png"), Buffer.from(full.data, "base64"));

  for (let index = 0; index < project.frames.length; index += 1) {
    const frame = measuredClips?.[index] || project.frames[index];
    if (index === 1) {
      await cdp.send("Runtime.evaluate", {
        expression: `(()=>{
          const candidates=[...document.querySelectorAll('header,nav,[role="navigation"],.header,.site-header,.main-header,.navbar')];
          for(const el of candidates){
            const r=el.getBoundingClientRect(),s=getComputedStyle(el);
            if(r.width>innerWidth*.45 && (r.top<180 || ['fixed','sticky'].includes(s.position))){
              el.dataset.portfolioCaptureHidden='true'; el.style.setProperty('visibility','hidden','important');
            }
          }
        })()`,
      });
    }
    await cdp.send("Runtime.evaluate", {
      expression: `scrollTo(0,${Math.max(0, frame.y)});new Promise(r=>setTimeout(r,350))`,
      awaitPromise: true,
    });
    const currentMetrics = await cdp.send("Page.getLayoutMetrics");
    const currentHeight = Math.ceil(currentMetrics.cssContentSize?.height ?? currentMetrics.contentSize.height);
    const y = Math.min(Math.max(0, frame.y), Math.max(0, currentHeight - 1));
    const height = Math.min(frame.height, Math.max(1, currentHeight - y));
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: frame.x || 0, y, width: frame.width || sourceWidth, height, scale: 1 },
    });
    await writeFile(
      path.join(outputDir, `orbit-${String(index + 1).padStart(2, "0")}.png`),
      Buffer.from(shot.data, "base64"),
    );
  }

  await cdp.send("Page.close");
  cdp.close();
  console.log(`${project.slug}: ${project.frames.length} кадров, ${sourceWidth}px CSS, страница ${contentHeight}px`);
}

await mkdir(RAW_ROOT, { recursive: true });
const profile = path.join(tmpdir(), `asama-capture-${Date.now()}`);
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
], { windowsHide: true, stdio: "ignore" });

try {
  await waitForChrome();
  for (const project of projects) await captureProject(project);
} finally {
  chrome.kill();
}
