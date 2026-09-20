(() => {
'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
// Последовательный лаймовый акцент букв в трёх пунктах подхода.
document.querySelectorAll('.strip-points li h4, footer .logo, .site-header .logo').forEach(title=>{
  const text=title.textContent;
  title.setAttribute('aria-label',text);
  title.textContent='';
  [...text].forEach((char,index)=>{
    const span=document.createElement('span');
    span.className='strip-letter';
    span.textContent=char===' '? '\u00a0':char;
    span.style.setProperty('--letter-index',index);
    span.style.setProperty('--letter-count',text.length);
    title.append(span);
  });
});
// Подсветка пункта меню по текущему разделу страницы.
const menuLinks=[...document.querySelectorAll('.nav-links a')];
const sectionLinks=menuLinks.map(link=>({link,url:new URL(link.href,location.href)})).filter(({url})=>url.pathname===location.pathname&&url.hash);
const sections=sectionLinks.map(({link,url})=>({link,section:document.getElementById(url.hash.slice(1))})).filter(item=>item.section);
const setActive=(active)=>menuLinks.forEach(link=>{const isActive=link===active;link.classList.toggle('is-active',isActive);if(isActive)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
if(sections.length){
  const spy=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)setActive(sections.find(item=>item.section===entry.target)?.link);}),{rootMargin:'-22% 0px -62% 0px',threshold:0});
  sections.forEach(item=>spy.observe(item.section));
  sectionLinks.forEach(({link})=>link.addEventListener('click',()=>setActive(link)));
}
// Быстрый буквенный прелоадер: не блокирует страницу и исчезает после первого кадра.
const loader=document.createElement('div');
loader.className='asama-preloader';
loader.setAttribute('aria-hidden','true');
loader.innerHTML='<div class="asama-preloader__word">'+[...'ASAMA'].map((letter,i)=>`<span style="--i:${i}">${letter}</span>`).join('')+'</div><div class="asama-preloader__line"></div>';
document.body.prepend(loader);
const dismissLoader=()=>{ loader.classList.add('is-done'); setTimeout(()=>loader.remove(),700); };
if(reduce.matches) dismissLoader(); else window.addEventListener('load',()=>setTimeout(dismissLoader,720),{once:true});
const icons=['<path d="M8 29V7h9a7 7 0 0 1 0 14H5m0 5h16M30 8a4 4 0 0 1 8 0c0 4-4 3-4 7m0 5v1"/>','<path d="m3 17 7-10 7 3 7-3 11 10-10 14-8-2-8-8m8-11-5 6 4 3 6-5 10 10M3 17l6 4m21-5 5 1M36 3a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4v1"/>','<path d="m6 29 3-10L27 1l8 8-18 18-11 2Zm3-10 8 8M23 5l8 8M4 35h27M35 20a4 4 0 0 1 8 0c0 4-4 3-4 7m0 5v1"/>'];
document.querySelectorAll('.business-doubts li').forEach((row,i)=>{
row.tabIndex=0;
row.insertAdjacentHTML('beforeend','<span class="doubt-graphic" aria-hidden="true"><svg viewBox="0 0 48 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+icons[i]+'</svg></span><span class="loss-coin" aria-hidden="true">₽</span>');
row.addEventListener('pointerenter',()=>row.classList.add('coin-departed'),{once:true});
});
document.querySelectorAll('.formats-every-project > div:not(.formats-every-intro)').forEach(el=>el.tabIndex=0);
document.querySelectorAll('.business-choice-grid,.business-sector-grid').forEach(grid=>{
const items=[...grid.children];let order=[],index=0,timer=0,inside=false,visible=false,interval=550,lastX=0,lastY=0,lastAt=0;
function layout(){const rows=[];for(const el of items){let row=rows.find(r=>Math.abs(r[0].offsetTop-el.offsetTop)<4);if(!row)rows.push(row=[]);row.push(el);}order=rows.flatMap((r,i)=>i%2?r.slice().reverse():r);index=0;}
function stop(){clearTimeout(timer);items.forEach(el=>el.classList.remove('roulette-active'));}
function step(){stop();if(!visible||inside||document.hidden||reduce.matches)return;order[index%order.length]?.classList.add('roulette-active');index++;timer=setTimeout(step,interval);}
grid.addEventListener('pointerenter',()=>{inside=true;stop();});grid.addEventListener('pointerleave',()=>{inside=false;step();});
grid.addEventListener('focusin',()=>{inside=true;stop();});grid.addEventListener('focusout',()=>{inside=false;step();});
window.addEventListener('pointermove',e=>{if(!visible)return;const now=performance.now();if(now-lastAt<90)return;const speed=Math.hypot(e.clientX-lastX,e.clientY-lastY)/Math.max(90,now-lastAt);interval=interval*.8+Math.max(325,700-speed*125)*.2;lastAt=now;lastX=e.clientX;lastY=e.clientY;},{passive:true});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?step():stop();},{threshold:.1}).observe(grid);
new ResizeObserver(layout).observe(grid);document.addEventListener('visibilitychange',step);reduce.addEventListener('change',step);layout();
});
document.querySelectorAll('.business-path .container').forEach(container=>{
const route=document.createElement('div');route.className='client-routes';
route.innerHTML='<div class="client-route client-route-lost"><span>Клиент ищет услугу</span><strong>Сайта нет</strong><b>Ушёл к другой компании ↗</b><i aria-hidden="true"></i></div><div class="client-route client-route-found"><span>Клиент ищет услугу</span><strong>Есть понятный сайт</strong><b>Связался с вами ✓</b><i aria-hidden="true"></i></div>';
container.insertBefore(route,container.querySelector('.business-journey'));
});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('is-running',e.isIntersecting)),{threshold:.15});document.querySelectorAll('.client-routes').forEach(el=>observer.observe(el));
})();
