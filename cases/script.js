const requestedProject = new URLSearchParams(location.search).get('project');
const HIDDEN_PROJECT_SLUGS=new Set(['stroyservis39','gracekelly','bmstair']);
const P=(window.PORTFOLIO_MATERIALS||[]).filter(project=>!HIDDEN_PROJECT_SLUGS.has(project.slug)||project.slug===requestedProject),$=s=>document.querySelector(s),scene=$('#scene'),carousel=$('#carousel'),orbit=$('#orbit'),N=P.length,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused=reduced,lessMotion=false,hover=false,focused=false,current=Math.max(0,P.findIndex(project=>project.slug===requestedProject)),pos=current,target=null,hold=0,last=performance.now(),selectedAt=last,fi=0,hoveredFrame=null,inspectorIndex=0,drag=null,suppress=false,offset=0,back=false,bottom=0;
try{lessMotion=localStorage.getItem('asama-less-motion')==='true'}catch(error){}
const mod=(a,n)=>(a%n+n)%n,pad=n=>String(n).padStart(2,'0');
function hydrateImage(img,priority='low'){if(!img)return;if(img.classList.contains('full')&&!img.dataset.readyListener){img.dataset.readyListener='true';img.addEventListener('load',()=>{img.dataset.ready='true';img.closest('.card')?.classList.add('preview-started')})}if(img.getAttribute('src')||!img.dataset.src)return;img.fetchPriority=priority;img.src=img.dataset.src}
function releaseImage(img){if(!img?.getAttribute('src'))return;img.removeAttribute('src');img.style.transform='translateY(0px)';if(img.classList.contains('full')){delete img.dataset.ready;img.closest('.card')?.classList.remove('preview-started')}}
function hydrateCard(index,withFull=false){const card=carousel.children[index];if(!card)return;hydrateImage(card.querySelector('.cover'));hydrateImage(card.querySelector('.info img'));if(withFull)hydrateImage(card.querySelector('.full'),index===current?'high':'low')}
P.forEach((p,i)=>{let c=document.createElement('button'),thumb=p.thumb||p.cover.replace(/cover\.webp$/,'thumb.webp');c.className='card';c.setAttribute('aria-label',`Открыть орбиту страниц проекта ${p.name}`);c.innerHTML=`<div class="preview"><img class="cover" src="${thumb}" alt="" loading="eager" decoding="async" fetchpriority="low"><img class="full" data-src="${p.full}" alt="Сайт ${p.name}" loading="eager" decoding="async"></div><div class="info"><img data-src="${p.logo}" alt="" loading="lazy" decoding="async"><small>PRJ ${pad(i+1)} / ASAMA</small><h2>${p.name}</h2></div>`;c.onclick=()=>{if(suppress||drag?.moved)return;if(i===current)openOrbit();else moveToIndex(i)};carousel.append(c)});$('#total').textContent=`${N} ИЗБРАННЫХ ПРОЕКТОВ`;
const nav=$('nav'),prev=$('#prev'),next=$('#next');
[prev,next].forEach(button=>{button.innerHTML=`<span aria-hidden="true"><svg viewBox="0 0 28 24"><path d="M17 4 9 12l8 8M9 12h12"/></svg></span>`;button.classList.toggle('arrow-next',button===next)});
function animateDirection(d){
 const button=d<0?prev:next;
 nav.classList.remove('moving-prev','moving-next');
 nav.classList.add(d<0?'moving-prev':'moving-next');
 button.classList.remove('is-pressed');void button.offsetWidth;button.classList.add('is-pressed');
 setTimeout(()=>button.classList.remove('is-pressed'),650);
}
function moveToIndex(index){const destination=pos+mod(index-pos+N/2,N)-N/2;animateDirection(destination>pos?1:-1);target=destination;hold=performance.now()+8000}
function move(d){target=Math.round(target??pos)+d;hold=performance.now()+8000;animateDirection(d)}prev.onclick=()=>move(-1);next.onclick=()=>move(1);scene.addEventListener('pointerover',e=>{if(e.target.closest('.card'))hover=true});scene.addEventListener('pointerout',e=>{if(!e.relatedTarget?.closest?.('.card'))hover=false});carousel.addEventListener('focusin',()=>focused=true);carousel.addEventListener('focusout',()=>{focused=false;hold=performance.now()+8000});scene.onpointerdown=e=>{if(e.button===0){drag={x:e.clientX,y:e.clientY,pos,moved:false};target=null;nav.classList.remove('moving-prev','moving-next')}};window.addEventListener('pointermove',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7)drag.moved=true;if(drag.moved){pos=drag.pos-((e.clientX-drag.x)+(e.clientY-drag.y)*.7)/(innerWidth<700?180:380);hold=performance.now()+8000}});function endDrag(){if(drag?.moved){target=Math.round(pos);animateDirection(target>drag.pos?1:-1);suppress=true;setTimeout(()=>suppress=false,100)}drag=null}window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
scene.addEventListener('dragstart',e=>e.preventDefault());
let wheelAt=0;window.addEventListener('wheel',e=>{e.preventDefault();if(performance.now()-wheelAt<420||Math.abs(e.deltaY)<18)return;wheelAt=performance.now();if($('#inspector').open)moveInspector(Math.sign(e.deltaY));else if(orbit.open)moveFrame(Math.sign(e.deltaY));else move(Math.sign(e.deltaY))},{passive:false});window.addEventListener('keydown',e=>{if(e.key===' '&&!orbit.open&&e.target===document.body){e.preventDefault();move(1);return}if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();let d=['ArrowRight','ArrowDown'].includes(e.key)?1:-1;if($('#inspector').open)moveInspector(d);else if(orbit.open)moveFrame(d);else move(d)}});function pauseUI(){document.body.classList.toggle('motion-paused',paused);$('#pause').textContent=paused?'▶ Движение':'Ⅱ Пауза';$('#pause').setAttribute('aria-pressed',String(paused))}$('#pause').onclick=()=>{paused=!paused;pauseUI()};pauseUI();
function lessMotionUI(){document.body.classList.toggle('less-motion',lessMotion);const button=$('#less-motion');button.textContent=lessMotion?'Обычная анимация':'Меньше анимации';button.setAttribute('aria-pressed',String(lessMotion));try{localStorage.setItem('asama-less-motion',String(lessMotion))}catch(error){}window.dispatchEvent(new CustomEvent('portfolio-motion-mode',{detail:{lessMotion}}))}
$('#less-motion').onclick=()=>{lessMotion=!lessMotion;lessMotionUI()};lessMotionUI();
$('#pause').addEventListener('click',()=>{if(paused)target=Math.round(pos)});
const previewStates=P.map(()=>({elapsed:0,offset:0,phase:'wait',bottomTime:0,direction:1,started:false}));
let previewState=previewStates[0],selectionElapsed=0;
if(previewState)previewState.started=true;
let cameraDistance=1000, sceneClock=0;
function resetPreview(index=current){const state=previewStates[index];state.elapsed=0;state.offset=0;state.phase='wait';state.bottomTime=0;state.direction=1;const img=carousel.children[index]?.querySelector('.full');if(img)img.style.transform='translateY(0px)';}
// Six visible stations follow the user's sketch: +2, +1, 0, -1, -2, -3.
// Hidden endpoints continue the spiral behind the upper edge, without popping.
const flowSlots={
 '-4':{x:.05,y:-.48,z:-1200,scale:.30,angle:0,tilt:0,opacity:0},
 // Left-hand projection: a measured three-step fan inspired by the supplied sketch.
 // The cards recede in depth while their apparent widths and vertical offsets stay
 // consistent, so the silhouettes read as one geometric construction.
 '-3':{x:-.47,y:-.34,z:-560,scale:.70,angle:76,tilt:-10,opacity:.62},
 '-2':{x:-.79,y:-.18,z:-880,scale:.50,angle:88,tilt:-16,opacity:.46},
 '-1':{x:-.61,y:.17,z:-650,scale:.76,angle:64,tilt:29,opacity:.64},
 '0':{x:0,y:.055,z:0,scale:1.045,angle:0,tilt:0,opacity:1},
 '1':{"x":0.44111,"y":0.18732,"z":-480,"scale":0.65196,"angle":-152,"tilt":16.93,"opacity":0.72},
 '2':{"x":0.50841,"y":-0.08202,"z":-650,"scale":0.64537,"angle":-145,"tilt":-27.272,"opacity":0.52},
 '3':{x:.12,y:-.48,z:-1200,scale:.30,angle:0,tilt:0,opacity:0}
};
const mobileFlowSlots={
 '-3':{x:-.06,y:-.72,z:-1250,scale:.28,angle:86,tilt:-8,opacity:0},
 '-2':{x:-.12,y:-.54,z:-900,scale:.57,angle:70,tilt:-13,opacity:.24},
 '-1':{x:-.34,y:-.25,z:-430,scale:.68,angle:70,tilt:-18,opacity:.64},
 '0':{x:0,y:.035,z:0,scale:1.06,angle:0,tilt:0,opacity:1},
 '1':{x:.38,y:.32,z:-500,scale:.64,angle:-64,tilt:-17,opacity:.58},
 '2':{x:.16,y:.57,z:-920,scale:.54,angle:-68,tilt:-12,opacity:.18},
 '3':{x:.04,y:.75,z:-1300,scale:.26,angle:-88,tilt:0,opacity:0}
};
const mix=(a,b,t)=>a+(b-a)*t;
function flowAt(distance,mobile){
 const slots=mobile?mobileFlowSlots:flowSlots,min=mobile?-3:-4,max=3;
 const clamped=Math.max(min,Math.min(max,distance)),from=Math.floor(clamped),to=Math.ceil(clamped),t=to===from?0:(clamped-from)/(to-from),ease=t*t*(3-2*t);
 const a=slots[String(from)],b=slots[String(to)],horizontal=1,vertical=1;
 return {x:mix(a.x,b.x,ease)*innerWidth*horizontal,y:mix(a.y,b.y,ease)*innerHeight*vertical,z:mix(a.z,b.z,ease),scale:mix(a.scale,b.scale,ease),angle:mix(a.angle,b.angle,ease),tilt:mix(a.tilt,b.tilt,ease),opacity:mix(a.opacity,b.opacity,ease)};
}
function render(){
 if(!N)return;
 let a=mod(Math.round(pos),N);
 if(a!==current){current=a;previewState=previewStates[a];previewState.started=true;resetPreview();selectionElapsed=0;}
 const mobile=innerWidth<700;
 [...carousel.children].forEach((c,i)=>{
  const d=mod(i-pos+N/2,N)-N/2,f=flowAt(d,mobile),visible=d>-4&&d<3&&f.opacity>.001;
  c.classList.toggle('is-visible',visible);
  if(visible)hydrateCard(i,i===current||previewStates[i].started);
  else if(Math.abs(d)>4){releaseImage(c.querySelector('.full'));previewStates[i].started=false;}
  c.style.transform=`translate(-50%,-50%) translate3d(${f.x}px,${f.y}px,${f.z}px) rotateY(${f.angle}deg) rotateZ(${f.tilt}deg) scale(${f.scale})`;
  c.style.opacity=visible?f.opacity:0;
  c.style.visibility=visible?'visible':'hidden';
  c.style.zIndex=100-Math.round(Math.abs(d)*12);
  c.classList.toggle('active',i===current);c.tabIndex=i===current?0:-1;
  c.style.pointerEvents=visible&&f.opacity>.15?'auto':'none';
  // Upcoming projects show a still of the page top. Only selection starts
  // a timeline; departed projects keep theirs while travelling left.
  if(d>0&&i!==current){resetPreview(i);previewStates[i].started=false;}
  c.classList.toggle('showing-back',Math.abs(f.angle)>90);
  c.dataset.slot=String(Math.max(1,Math.min(6,Math.round(d)+4)));
  c.dataset.angle=f.angle.toFixed(1);
  c.dataset.station=String(Math.round(d));
 });
  const status=`${pad(current+1)} / ${pad(N)}`;if($('#status').textContent!==status)$('#status').textContent=status;
}
function openOrbit(){let p=P[current];if(!p)return;fi=0;hoveredFrame=null;$('#title').textContent=p.name;const visit=$('#project-visit');const live={touch:'https://ramprikosnovenie.ru/',socvetie:'https://будем.рф/',krasivaya:'https://красивая-ты.рф/'};visit.hidden=!live[p.slug];if(live[p.slug])visit.href=live[p.slug];else visit.removeAttribute('href');$('#logo').src=p.logo;$('#logo').alt=p.name;$('#frames').replaceChildren();p.frames.forEach((f,i)=>{let b=document.createElement('button');b.className='frame';b.setAttribute('aria-label',`${f.label}, ${i+1} из ${p.frames.length}. Открыть скриншот на весь экран`);b.innerHTML=`<span class="frame-visual"><img data-src="${f.src}" alt="${p.name}: раздел ${i+1}" loading="eager" decoding="async"><span class="frame-number">${pad(i+1)}</span></span>`;b.onclick=e=>{e.stopPropagation();openInspector(hoveredFrame??i)};b.onfocus=()=>{hoveredFrame=i;renderFrames()};b.onblur=()=>{hoveredFrame=null;renderFrames()};$('#frames').append(b)});if(!orbit.open)orbit.showModal();hydrateImage($('#frames img'),'high');renderFrames();const loadOrbitImages=()=>[...$('#frames').querySelectorAll('img')].forEach(img=>hydrateImage(img));loadOrbitImages()}
function renderFrames(){let n=P[current].frames.length,focusIndex=hoveredFrame??fi,ringCount=Math.max(1,n-1),mobile=innerWidth<700,radiusX=mobile?34:32,radiusY=mobile?25:24;[...$("#frames").children].forEach((f,i)=>{let center=i===0,emphasized=i===focusIndex,angle=(i-1)*Math.PI*2/ringCount-Math.PI/2,rx=Math.cos(angle)*innerWidth*radiusX/100,ry=Math.sin(angle)*innerHeight*radiusY/100,scale=emphasized?(center?2.56:2.496):(center?1.24:1),shiftX=emphasized&&!center?-rx*(mobile?.85:.22):0,shiftY=emphasized&&!center?-ry*(mobile?.16:.40):0;f.style.transform=center?`translate(-50%,-50%) translateZ(${emphasized?100:-20}px)`:`translate(-50%,-50%) translate3d(${rx}px,${ry}px,${emphasized?90:-40}px)`;f.style.setProperty('--frame-scale',scale);f.style.setProperty('--frame-shift-x',`${shiftX}px`);f.style.setProperty('--frame-shift-y',`${shiftY}px`);f.style.setProperty('--frame-opacity',emphasized?1:.72);f.style.visibility='visible';f.style.zIndex=emphasized?50:20-i;f.classList.toggle('is-focused-frame',emphasized);f.tabIndex=0});$("#fs").textContent=`${pad(focusIndex+1)} / ${pad(n)}`}function frameAtPoint(x,y){let frames=[...$('#frames').children];if(hoveredFrame!==null){let r=frames[hoveredFrame]?.querySelector('.frame-visual')?.getBoundingClientRect();if(r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return hoveredFrame}let best=null,distance=Infinity;frames.forEach((f,i)=>{let r=f.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;let d=Math.hypot(x-r.left-r.width/2,y-r.top-r.height/2);if(d<distance){distance=d;best=i}});return best}function moveFrame(d){fi=mod(fi+d,P[current].frames.length);hoveredFrame=null;renderFrames();$('#frames').children[fi]?.focus({preventScroll:true})}function moveOrbitProject(d){current=mod(current+d,N);pos=current;target=null;selectedAt=performance.now();openOrbit();render()}function renderInspector(){let p=P[current],frame=p?.frames?.[inspectorIndex];if(!frame)return;$('#inspector-title').textContent=`${p.name} · ${pad(inspectorIndex+1)}`;$('#inspector-image').src=frame.src;$('#inspector-image').alt=`${p.name}: ${frame.label||`скриншот ${inspectorIndex+1}`}`;$('#inspector-counter').textContent=`${pad(inspectorIndex+1)} / ${pad(p.frames.length)} · колесо или стрелки`;}function moveInspector(d){let p=P[current];if(!p?.frames?.length)return;inspectorIndex=mod(inspectorIndex+d,p.frames.length);renderInspector()}function openInspector(index=0){let p=P[current];if(!p)return;inspectorIndex=mod(index,p.frames.length);renderInspector();if(!$('#inspector').open)$('#inspector').showModal()}function closeInspector(){let inspector=$('#inspector');if(inspector.open)inspector.close();$('#inspector-image').removeAttribute('src')}function closeOrbit(){hoveredFrame=null;orbit.close();hold=performance.now()+8000;carousel.children[current]?.focus({preventScroll:true})}$('#close').onclick=closeOrbit;orbit.oncancel=e=>{e.preventDefault();closeOrbit()};$('#fp').onclick=()=>moveFrame(-1);$('#fn').onclick=()=>moveFrame(1);$('#project-prev').onclick=()=>moveOrbitProject(-1);$('#project-next').onclick=()=>moveOrbitProject(1);$('#stage').addEventListener('pointermove',e=>{if($('#inspector').open)return;let nextFrame=frameAtPoint(e.clientX,e.clientY);if(nextFrame!==hoveredFrame){hoveredFrame=nextFrame;renderFrames()}});$('#stage').addEventListener('pointerleave',()=>{if(hoveredFrame!==null){hoveredFrame=null;renderFrames()}});$('#stage').onclick=e=>{if(e.target===e.currentTarget&&!suppress)closeOrbit()};$('#inspector-close').onclick=closeInspector;$('#inspector-prev').onclick=()=>moveInspector(-1);$('#inspector-next').onclick=()=>moveInspector(1);$('#inspector').oncancel=e=>{e.preventDefault();closeInspector()};$('#inspector').onclick=e=>{if(e.target===e.currentTarget)closeInspector()};let tx=0;$('#stage').addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});$('#stage').addEventListener('touchend',e=>{let d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>45){suppress=true;setTimeout(()=>suppress=false,350);moveFrame(d<0?1:-1)}},{passive:true});let inspectorTouchX=0;$('.inspector-viewport').addEventListener('touchstart',e=>inspectorTouchX=e.touches[0].clientX,{passive:true});$('.inspector-viewport').addEventListener('touchend',e=>{let d=e.changedTouches[0].clientX-inspectorTouchX;if(Math.abs(d)>40)moveInspector(d<0?1:-1)},{passive:true});








orbit.addEventListener('close',()=>{requestAnimationFrame(()=>{$('#frames').replaceChildren();$('#logo').removeAttribute('src')})});

// Переход к выбранному кейсу с главной страницы.
const requestedIndex = P.findIndex(project => project.slug === requestedProject);
if (requestedIndex >= 0) {
 current = requestedIndex;
 pos = requestedIndex;
 previewState = previewStates[current];
 previewState.started = true;
 render();
 openOrbit();
}

(() => {
  const orb = document.getElementById('pointer-orb');
  if (!orb) return;
  const fine = matchMedia('(pointer: fine)');
  const hide = () => document.body.classList.remove('pointer-ready');
  const syncLayer = () => {
    // Modal dialogs live above body content, regardless of its z-index.
    const host = document.querySelector('#inspector[open]') ||
      document.querySelector('#orbit[open]') || document.body;
    if (orb.parentElement !== host) host.append(orb);
  };
  document.querySelectorAll('dialog').forEach(dialog => {
    new MutationObserver(syncLayer).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  });
  window.addEventListener('pointermove', e => {
    if (!fine.matches || e.pointerType === 'touch') { hide(); return; }
    syncLayer();
    orb.style.left = e.clientX + 'px';
    orb.style.top = e.clientY + 'px';
    document.body.classList.add('pointer-ready');
    document.body.classList.toggle('pointer-over-card', !!e.target.closest?.('.card,.frame'));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  fine.addEventListener('change', hide);
})();
