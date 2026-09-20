// Rebuild presentation assets from the checked-in screenshots and review maps.
// Run with NODE_PATH pointing to a runtime containing sharp and playwright.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const sharp = require('sharp');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
async function load(file) { vm.runInNewContext(await fs.readFile(path.join(root, file), 'utf8'), context); }
async function write(file, data) { const target = path.join(root, file); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, data); }
async function main() {
  for (const file of ['cases/materials.js', 'cases/contact-blur-map.js', 'cases/masked-materials.js', 'tools/reviewed-config.js']) await load(file);
  const projects = context.window.PORTFOLIO_MATERIALS;
  const updates = {};
  const exempt = new Set(['touch', 'socvetie', 'krasivaya', 'zdorzub']);
  for (const p of projects.filter(p => !exempt.has(p.slug))) {
    const frames = [], strips = [];
    let top = 0;
    for (const f of p.frames) {
      const key = f.src.match(/orbit-(\d+)/)[1];
      const replacement = context.window.REVIEWED_INSERTS[p.slug + '/' + key];
      const source = path.join(root, replacement ? path.join('tools', replacement) : path.join('cases', f.src.split('?')[0]));
      let buffer = await sharp(source).png().toBuffer();
      let { width, height } = await sharp(buffer).metadata();
      const regions = context.window.REVIEWED_REGIONS[p.slug]?.[key] || [];
      for (const [x, y, w, h] of regions) {
        const left = Math.floor(x * width / 100), t = Math.floor(y * height / 100);
        const rect = { left, top: t, width: Math.min(width-left, Math.ceil(w * width / 100)), height: Math.min(height-t, Math.ceil(h * height / 100)) };
        const tile = await sharp(buffer).extract(rect).blur(Math.max(12, width * .012)).toBuffer();
        buffer = await sharp(buffer).composite([{ input: tile, left, top: t }]).png().toBuffer();
      }
      const src = `materials-reviewed/${p.slug}/orbit-${key}.webp`;
      await write('cases/' + src, await sharp(buffer).webp({ quality: 90 }).toBuffer());
      frames.push({ ...f, src });
      // Orbit screenshots contain a centered, fitted section on a 16:9 canvas.
      // Recover its section rectangle before assembling the scrolling preview.
      const ratio = p.width / f.height;
      let cw = width, ch = Math.round(width / ratio);
      if (ch > height) { ch = height; cw = Math.round(height * ratio); }
      const outHeight = Math.round(f.height * 1000 / p.width);
      const strip = await sharp(buffer).extract({ left: Math.floor((width-cw)/2), top: Math.floor((height-ch)/2), width: cw, height: ch }).resize(1000, outHeight).png().toBuffer();
      strips.push({ input: strip, left: 0, top }); top += outHeight;
      if (key === '01') {
        await write(`cases/materials-reviewed/${p.slug}/cover.webp`, await sharp(buffer).resize(1600, 900, { fit: 'contain', background: '#080d15' }).webp({ quality: 88 }).toBuffer());
        await write(`cases/materials-reviewed/${p.slug}/thumb.webp`, await sharp(buffer).resize(640, 360, { fit: 'contain', background: '#080d15' }).webp({ quality: 85 }).toBuffer());
      }
    }
    await write(`cases/materials-reviewed/${p.slug}/full.webp`, await sharp({ create: { width: 1000, height: top, channels: 3, background: '#080d15' } }).composite(strips).webp({ quality: 88 }).toBuffer());
    updates[p.slug] = { cover: `materials-reviewed/${p.slug}/cover.webp`, thumb: `materials-reviewed/${p.slug}/thumb.webp`, full: `materials-reviewed/${p.slug}/full.webp`, frames };
    console.log('Prepared', p.slug, frames.length);
  }
  const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2' };
  const server = http.createServer(async (req, res) => { try { let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html'); res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(await fs.readFile(file)); } catch { res.writeHead(404); res.end(); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${server.address().port}/cases/sites/zdorzub/`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { document.querySelectorAll('img').forEach(i => i.loading = 'eager'); await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    const screenshot = await page.screenshot({ fullPage: true });
    const { width, height } = await sharp(screenshot).metadata();
    const frames = [];
    for (let y = 0, i = 1; y < height; y += 1000, i++) {
      const h = Math.min(1000, height), captureY = Math.min(y, height-h), src = `materials-reviewed/zdorzub/orbit-${String(i).padStart(2,'0')}.webp`;
      await write('cases/' + src, await sharp(screenshot).extract({ left: 0, top: captureY, width, height: h }).webp({ quality: 90 }).toBuffer());
      frames.push({ src, label: `Сайт стоматологии — раздел ${i}`, y: captureY, height: h });
    }
    for (const [name, w, h] of [['full', 1000, null], ['cover', 1600, 900], ['thumb', 640, 360]]) {
      let img = sharp(screenshot);
      if (name !== 'full') img = img.extract({ left: 0, top: 0, width, height: 900 });
      await write(`cases/materials-reviewed/zdorzub/${name}.webp`, await img.resize(w, h).webp({ quality: 88 }).toBuffer());
    }
    updates.zdorzub = { width, height, frames, cover:'materials-reviewed/zdorzub/cover.webp', thumb:'materials-reviewed/zdorzub/thumb.webp', full:'materials-reviewed/zdorzub/full.webp' };
    console.log('Captured zdorzub', frames.length, width, height);
  } finally { await browser?.close(); server.close(); }
  await write('cases/reviewed-materials.js', '// Generated by tools/finish-portfolio.cjs; all displayed variants share the reviewed assets.\n(() => {\nconst reviewed = ' + JSON.stringify(updates, null, 2) + ';\nfor (const project of window.PORTFOLIO_MATERIALS || []) { if (reviewed[project.slug]) Object.assign(project, reviewed[project.slug]); }\n})();\n');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
