// Плашка согласия на cookie и запуск Яндекс Метрики только после согласия (152-ФЗ).
// Выбор хранится в localStorage: 'yes' — Метрика работает, 'no' — нет.
// Ссылка с атрибутом data-cookie-settings заново открывает плашку.
(() => {
  const KEY = 'asama-cookie-consent';
  const COUNTER = 114402888;
  const policyUrl = new URL('../privacy-policy.html', document.currentScript.src).href;

  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

  let loaded = false;
  function loadMetrika() {
    if (loaded) return;
    loaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + COUNTER, 'ym');
    window.ym(COUNTER, 'init', {
      ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer',
      referrer: document.referrer, url: location.href, accurateTrackBounce: true, trackLinks: true,
    });
  }

  const css = `
.cc-bar{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:720px;margin:0 auto;
  display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding:16px 20px;border-radius:16px;
  background:var(--bg-card,#17171c);color:var(--fg,#fafafa);border:1px solid var(--border,#2a2a33);
  box-shadow:0 10px 40px rgba(0,0,0,.45);font:400 14px/1.5 var(--font-sans,'Manrope',sans-serif)}
.cc-bar p{flex:1 1 320px;margin:0}
.cc-bar a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.cc-btns{display:flex;gap:8px;flex-wrap:wrap}
.cc-bar button{cursor:pointer;border-radius:999px;padding:9px 18px;font:600 14px/1 inherit;font-family:inherit;
  border:1px solid var(--border,#2a2a33);background:transparent;color:inherit}
.cc-bar button.cc-yes{background:var(--primary,#c6ff32);color:var(--primary-fg,#0a0a0c);border-color:transparent}
.cc-bar button:focus-visible{outline:2px solid var(--primary,#c6ff32);outline-offset:2px}`;

  let bar;
  function showBar() {
    if (bar) { bar.hidden = false; return; }
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    bar = document.createElement('div');
    bar.className = 'cc-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Согласие на использование cookie');
    bar.innerHTML = `<p>Сайт использует cookie и Яндекс Метрику, чтобы считать посещения и улучшать сайт.
      Метрика включится только с вашего согласия. <a href="${policyUrl}#cookies">Подробнее</a></p>
      <div class="cc-btns"><button type="button" class="cc-no">Отказаться</button>
      <button type="button" class="cc-yes">Принять</button></div>`;
    bar.querySelector('.cc-yes').onclick = () => { save('yes'); bar.hidden = true; loadMetrika(); };
    bar.querySelector('.cc-no').onclick = () => {
      const wasOn = read() === 'yes';
      save('no'); bar.hidden = true;
      if (wasOn) location.reload(); // выгрузить уже запущенную Метрику
    };
    document.body.append(bar);
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('[data-cookie-settings]');
    if (!link) return;
    e.preventDefault();
    showBar();
  });

  const start = () => {
    const v = read();
    if (v === 'yes') loadMetrika();
    else if (v !== 'no') showBar();
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
