// Local presentation-only contact blur. Original source screenshots stay intact.
// Only reviewed phone/address rectangles are changed; PNG output preserves all
// other pixels and keeps image dimensions, cropping and gallery hit tests intact.
(() => {
  const map = window.PORTFOLIO_CONTACT_BLUR || {};
  const cache = new Map();
  const pending = new WeakMap();
  const scriptBase = new URL('.', document.currentScript.src);
  function assetKey(src) {
    try {
      const path = new URL(src, location.href).pathname;
      const match = path.match(/\/cases\/materials\/([^/]+\/[^/]+\.webp)$/);
      return match?.[1];
    } catch { return null; }
  }
  function blurred(key) {
    if (cache.has(key)) return cache.get(key);
    const task = new Promise((resolve, reject) => {
      const source = new Image();
      source.onload = () => {
        try {
          const spec = map[key];
          const canvas = document.createElement('canvas');
          canvas.width = source.naturalWidth;
          canvas.height = source.naturalHeight;
          const ctx = canvas.getContext('2d', {willReadFrequently:true});
          ctx.drawImage(source, 0, 0);
          const sx = canvas.width / spec.width, sy = canvas.height / spec.height;
          for (const box of spec.rects) {
            const x=box[0]*sx, y=box[1]*sy, w=(box[2]-box[0])*sx, h=(box[3]-box[1])*sy;
            ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
            ctx.filter=`blur(${Math.max(4,Math.min(canvas.width*.009,h*.6))}px)`;
            ctx.drawImage(source,0,0);ctx.restore();
          }
          canvas.toBlob(blob => blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('Cannot render contact blur')), 'image/png');
        } catch (error) {reject(error);}
      };
      source.onerror = reject;
      source.src = new URL(`materials/${key}`, scriptBase).href;
    });
    cache.set(key,task);return task;
  }
  function protect(image) {
    const requested=image.getAttribute('src');
    if(!requested){
      const old=pending.get(image);
      if(old)image.style.visibility=old.visibility;
      pending.delete(image);delete image.dataset.contactBlur;
      return;
    }
    const key=assetKey(requested);
    if (!key || !map[key] || pending.get(image)?.requested===requested) return;
    const state={requested,visibility:image.style.visibility};
    pending.set(image,state);
    image.dataset.contactBlur='pending';
    image.dataset.contactSource=key;
    image.style.visibility='hidden';
    blurred(key).then(url=>{
      if(pending.get(image)!==state || image.getAttribute('src')!==requested)return;
      const ready=()=>{
        if(image.getAttribute('src')!==url)return;
        image.style.visibility=state.visibility;
        image.dataset.contactBlur='ready';
        pending.delete(image);
        image.dispatchEvent(new CustomEvent('contactblurready',{bubbles:true}));
      };
      image.addEventListener('load',ready,{once:true});
      image.src=url;
    }).catch(error=>{
      // Keep a failed contact-bearing image hidden rather than exposing contacts.
      image.dataset.contactBlur='error';console.error('Contact blur failed',key,error);
    });
  }
  function inspect(node) {
    if(node.nodeType!==1)return;
    if(node.tagName==='IMG')protect(node);
    node.querySelectorAll?.('img[src]').forEach(protect);
  }
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='attributes')protect(record.target);
      else record.addedNodes.forEach(inspect);
    }
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  inspect(document.documentElement);
  // Exposed only for repeatable local QA and pre-rendering the same asset.
  window.portfolioContactBlur={render:blurred,keys:()=>Object.keys(map)};
})();
