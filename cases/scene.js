// Local glyph atlas and a layered, upward-moving column. No network assets.
const lowPowerDevice=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
let renderer,world,camera,energy,rain,ambientDirty=true,lastAmbientFrame=0;
function fallback(){document.body.classList.add('no-webgl');$('#ambient').hidden=true;renderer=null;}
try{
 if(!window.THREE)throw new Error('WebGL unavailable');
 const T=THREE;
 renderer=new T.WebGLRenderer({canvas:$('#ambient'),alpha:true,antialias:!lowPowerDevice,powerPreference:'high-performance',depth:false,stencil:false});
 world=new T.Scene();camera=new T.PerspectiveCamera(45,innerWidth/innerHeight,1,12000);
 const codeLines=[
  '<main class="portfolio">','<section id="projects">','<h1>Build something.</h1>',
  '<div class="card">','<a href="#work">Explore</a>','<img src="cover.webp" />',
  '<button>View project</button>','<canvas id="scene"></canvas>',
  'const app = createApp();','const projects = [];','let frame = 0;',
  'function render() {','requestAnimationFrame(tick);','return project.title;',
  'items.map(renderCard);','window.addEventListener(',
  'Выше в поиске и на картах','Без посторонней рекламы','Больше доверия к бизнесу',
  'Понятное позиционирование','Всё важное в одном месте','Основа для продвижения',
  'Быстрая загрузка','Удобно на любом устройстве','Больше целевых обращений',
  'Профессиональная подача','Сильнее позиции в Яндексе','Понятная структура',
  'Контакты всегда под рукой','Сайт работает на репутацию','Готово к продвижению','Видно главное'
 ];
 const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;
 const ctx=atlas.getContext('2d');ctx.textAlign='left';ctx.textBaseline='middle';
 codeLines.forEach((line,i)=>{
  const x=i%2*512+12,y=Math.floor(i/2)*64+32;
  ctx.font='23px Consolas, monospace';ctx.shadowColor='#eeeeee';ctx.shadowBlur=4;ctx.fillStyle='#dddddd';ctx.fillText(line,x,y,488);
  ctx.shadowBlur=0;ctx.fillText(line,x,y,488);
 });
 const texture=new T.CanvasTexture(atlas);texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
 const count=72,origins=new Float32Array(count*3),data=new Float32Array(count*4);
 for(let i=0;i<count;i++){
  const layer=i%3,row=Math.floor(i/3);
  origins.set([(layer-1)*.50,((row*13)%24)/24,layer-1],i*3);
  const benefit=layer===2,lineIndex=benefit?16+row%16:row%16;
  data.set([.037+layer*.011,lineIndex,benefit?1:0,layer*.013],i*4);
 }
 const plane=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();
 geometry.index=plane.index;geometry.attributes.position=plane.attributes.position;geometry.attributes.uv=plane.attributes.uv;
 geometry.setAttribute('origin',new T.InstancedBufferAttribute(origins,3));geometry.setAttribute('glyphData',new T.InstancedBufferAttribute(data,4));geometry.instanceCount=count;
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide,precision:'mediump',
   uniforms:{atlas:{value:texture},time:{value:0},columnWidth:{value:220},columnHeight:{value:1300},lineWidth:{value:340},lessMotion:{value:0},mobileView:{value:0}},
  vertexShader:`
   attribute vec3 origin;
   attribute vec4 glyphData;
    uniform float time,columnWidth,columnHeight,lineWidth,mobileView;
   varying vec2 textUV;
   varying float alpha;
   varying float benefit;
   void main(){
    float rise=fract(origin.y+glyphData.w+time*glyphData.x);
    float angle=origin.z*2.0943951-rise*6.2831853-time*.35;
    float depth=(sin(angle)+1.0)*.5;
    float width=lineWidth*(.82+depth*.18)*mix(1.0,1.16,glyphData.z);
    float radius=columnWidth*.65;
    vec3 p=vec3(cos(angle)*radius+position.x*width,(rise-.5)*columnHeight+position.y*width/8.0,sin(angle)*radius);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    benefit=glyphData.z;
     alpha=smoothstep(0.0,.12,rise)*(1.0-smoothstep(.86,1.0,rise))*(.20+depth*.52);
     // Phones keep one English branch and the Russian benefit branch.
     alpha*=mix(1.0,step(-.5,origin.z),mobileView);
    textUV=(vec2(mod(glyphData.y,2.0),15.0-floor(glyphData.y/2.0))+uv)/vec2(2.0,16.0);
   }`,
  fragmentShader:`
   uniform sampler2D atlas;
   uniform float lessMotion;
   varying vec2 textUV;
   varying float alpha;
   varying float benefit;
   void main(){
    float modeAlpha=mix(1.0,benefit,lessMotion);
    float hierarchyAlpha=mix(.72,1.12,benefit);
    vec3 ink=mix(vec3(.62),vec3(.95),benefit);
    gl_FragColor=vec4(ink,texture2D(atlas,textUV).a*alpha*modeAlpha*hierarchyAlpha);
   }
  `
 });
 energy=new T.Mesh(geometry,material);energy.frustumCulled=false;world.add(energy);
 // A restrained digital rain layer built from a monochrome atlas.
 const rainAtlas=document.createElement('canvas');rainAtlas.width=256;rainAtlas.height=256;
 const rc=rainAtlas.getContext('2d'),chars='01{}[]<>/=;:+-*?';
 rc.font='32px Consolas, monospace';rc.textAlign='center';rc.textBaseline='middle';rc.fillStyle='#e2e2e2';rc.shadowColor='#ddd';rc.shadowBlur=3;
 for(let i=0;i<16;i++)rc.fillText(chars[i%chars.length],i%4*64+32,Math.floor(i/4)*64+32);
 const rainTexture=new T.CanvasTexture(rainAtlas);rainTexture.minFilter=T.LinearFilter;
 const points=new Float32Array(320*3),drops=new Float32Array(320*3);
 for(let i=0;i<320;i++){
  const lane=i%20,tail=Math.floor(i/20);
  points.set([(lane/19-.5)*2,tail*.014,-420-(lane%3)*70],i*3);
  drops.set([lane*.137,.09+(lane%5)*.014,tail],i*3);
 }
 const rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(points,3));rg.setAttribute('drop',new T.BufferAttribute(drops,3));
 const rm=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,precision:'mediump',
  uniforms:{atlas:{value:rainTexture},time:material.uniforms.time,width:{value:340},height:{value:1400},pixelRatio:{value:1},cameraDistance:{value:1000}},
  vertexShader:`
   attribute vec3 drop;
   uniform float time,width,height,pixelRatio,cameraDistance;
   varying float glyph,alpha;
   void main(){
    float fall=fract(drop.x+time*drop.y-position.y);
    vec4 mv=modelViewMatrix*vec4(position.x*width,(.5-fall)*height,position.z,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=32.0*pixelRatio*cameraDistance/(-mv.z);
    alpha=(.46*(1.0-drop.z/16.0)+.04)*smoothstep(0.0,.08,fall)*(1.0-smoothstep(.92,1.0,fall));
    glyph=mod(drop.z+floor(drop.x*37.0)+floor(time*1.3),16.0);
   }`,
  fragmentShader:`uniform sampler2D atlas;varying float glyph,alpha;
   void main(){vec2 uv=(vec2(mod(glyph,4.0),3.0-floor(glyph/4.0))+vec2(gl_PointCoord.x,1.0-gl_PointCoord.y))/4.0;gl_FragColor=vec4(vec3(.8),texture2D(atlas,uv).a*alpha);}`
 });
 rain=new T.Points(rg,rm);rain.frustumCulled=false;rain.renderOrder=-1;world.add(rain);
 $('#ambient').addEventListener('webglcontextlost',e=>{e.preventDefault();fallback()});
}catch(error){fallback()}

function resize(){
 cameraDistance=innerHeight/(2*Math.tan(Math.PI/8));
 scene.style.perspective=`${cameraDistance}px`;
 if(renderer){
  const mobile=innerWidth<700,low=document.body.classList.contains('less-motion'),ratio=Math.min(devicePixelRatio,low||mobile||lowPowerDevice?1:1.25);
  renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);
  camera.aspect=innerWidth/innerHeight;camera.position.z=cameraDistance;camera.updateProjectionMatrix();
  energy.position.set(innerWidth*.035,0,-250);
  energy.material.uniforms.columnWidth.value=Math.min(innerWidth*.17,220);
  energy.material.uniforms.columnHeight.value=innerHeight*1.65;
  energy.material.uniforms.lineWidth.value=mobile?250:340;
  energy.material.uniforms.mobileView.value=mobile?1:0;
  // Keep all rows on phones: halving the instance count left large vertical gaps.
  energy.geometry.instanceCount=72;
  // The separate falling-glyph layer is intentionally absent below 700 px.
  rain.visible=!low&&!mobile;
  rain.geometry.setDrawRange(0,mobile?0:(lowPowerDevice?140:240));
  rain.material.uniforms.width.value=Math.min(innerWidth*.28,340);
  rain.material.uniforms.height.value=innerHeight*1.9;
  rain.material.uniforms.pixelRatio.value=ratio;
  rain.material.uniforms.cameraDistance.value=cameraDistance;
  ambientDirty=true;
 }
 render();if(orbit.open)renderFrames();
}
window.addEventListener('resize',resize);resize();

function applySceneMotionMode(){
 if(!renderer)return;
 const low=document.body.classList.contains('less-motion');
 rain.visible=!low&&innerWidth>=700;
 energy.material.uniforms.lessMotion.value=low?1:0;
 resize();
}
window.addEventListener('portfolio-motion-mode',applySceneMotionMode);applySceneMotionMode();

function advancePreview(dt,index=current){
 const state=previewStates[index],img=carousel.children[index]?.querySelector('.full');
 if(!state.started||!img||!img.complete||!img.naturalWidth)return;
 const distance=Math.max(0,img.offsetHeight-carousel.children[index].clientHeight);
 if(index===current&&state.phase==='wait'&&(target!==null||drag))return;
 state.elapsed+=dt;
 if(state.phase==='wait'&&state.elapsed>=1){state.phase='scroll';state.direction=1;}
 if(state.phase==='scroll'&&state.direction>0){
  state.offset=Math.min(distance,state.offset+90*dt);
  if(distance>0&&state.offset>=distance){state.phase='edge';state.bottomTime=0;}
 }else if(state.phase==='edge'){
  state.bottomTime+=dt;if(state.bottomTime>=2){state.phase='scroll';state.direction=-1;}
 }else if(state.phase==='scroll'&&state.direction<0){
  state.offset=Math.max(0,state.offset-distance*dt/3);
  if(state.offset===0){state.phase='wait';state.elapsed=0;state.direction=1;}
 }
 img.style.transform=`translateY(-${state.offset}px)`;
}
let sceneFrame=0;
function tick(now){
 sceneFrame=0;
 if(document.hidden)return;
 const dt=Math.min((now-last)/1000,.05);last=now;
 const visible=!document.hidden&&!orbit.open,automatic=visible&&!paused&&!reduced;
 if(visible){
  const carouselMoving=target!==null||Boolean(drag?.moved);
  if(target!==null){const d=target-pos;pos+=d*Math.min(1,dt*5.2);if(Math.abs(d)<.001){pos=target;target=null;nav.classList.remove('moving-prev','moving-next');}}
  else if(automatic&&!hover&&!focused&&!drag&&now>hold&&selectionElapsed>12){move(1);}
  if(carouselMoving)render();if(automatic){selectionElapsed+=dt;previewStates.forEach((state,i)=>{if(state.started&&(!lessMotion||i===current))advancePreview(dt,i)});}
 }
 if(renderer&&visible){
  if(automatic){sceneClock+=dt;energy.material.uniforms.time.value=sceneClock;}
  const frameInterval=lessMotion||lowPowerDevice||innerWidth<700?1000/30:1000/60;
  if(ambientDirty||(automatic&&now-lastAmbientFrame>=frameInterval)){
   renderer.render(world,camera);lastAmbientFrame=now;ambientDirty=false;
  }
 }
 sceneFrame=requestAnimationFrame(tick);
}
sceneFrame=requestAnimationFrame(tick);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){cancelAnimationFrame(sceneFrame);sceneFrame=0;}
 else if(!sceneFrame){last=performance.now();ambientDirty=true;sceneFrame=requestAnimationFrame(tick);}
});
