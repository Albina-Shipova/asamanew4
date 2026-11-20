const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const host = 'asama.site';
const key = '91f8938812e1b60f8b0de5bd27c51e80';

async function main() {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  if (!urlList.length || urlList.some(url => new URL(url).host !== host)) {
    throw new Error('В sitemap нет страниц или найден посторонний домен');
  }
  const keyLocation = `https://${host}/${key}.txt`;
  const verification = await fetch(keyLocation, { signal: AbortSignal.timeout(30000) });
  if (!verification.ok || (await verification.text()).trim() !== key) {
    throw new Error('Файл ключа IndexNow недоступен или содержит другой ключ');
  }
  const response = await fetch('https://yandex.com/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.text();
  console.log(`IndexNow: HTTP ${response.status}, страниц: ${urlList.length}`);
  if (body) console.log(body);
  if (![200, 202].includes(response.status)) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
