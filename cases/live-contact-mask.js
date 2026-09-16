(() => {
  const frame = document.querySelector('#inspector-frame');
  const viewport = document.querySelector('.inspector-viewport');
  const title = document.querySelector('#inspector-title');
  if (!frame || !viewport || !title) return;

  const excluded = new Set(['socvetie', 'krasivaya', 'touch']);

  function clearMasks() {
    viewport.querySelectorAll('.live-contact-mask, .live-brand-mask').forEach(node => node.remove());
  }

  function activeProjectAndFrame() {
    const text = title.textContent || '';
    const match = text.match(/·\s*(\d+)\s*$/);
    const index = Math.max(0, Number(match?.[1] || 1) - 1);
    const projects = window.PORTFOLIO_MATERIALS || [];
    const project = projects.find(item => text.startsWith(`${item.name} ·`))
      || (text.startsWith('Дому быть! ·') ? projects.find(item => item.slug === 'behome') : null);
    return project ? {project, index} : null;
  }

  function renderMasks() {
    clearMasks();
    const active = activeProjectAndFrame();
    if (!active || excluded.has(active.project.slug)) return;
    // A reliable fallback for external iframes: every project header places
    // the phone in the upper-right contact area. This mask is intentionally
    // narrow and does not touch the hero image.
    const generic = document.createElement('span');
    generic.className = 'live-contact-mask live-contact-mask--header';
    viewport.append(generic);
    if (active.project.slug === 'behome') {
      const brand = document.createElement('span');
      brand.className = 'live-brand-mask';
      brand.innerHTML = '<b class="live-brand-mask__mark">БД</b><span>БУДЬ ДОМА</span>';
      viewport.append(brand);
      // The external BeHome page is responsive and its contact block does
      // not keep the screenshot coordinates. These two masks deliberately
      // cover the visible left contact column in the live iframe.
      if (active.index >= Math.max(0, (active.project.frames?.length || 1) - 2)) {
        for (const cls of ['live-behome-phone', 'live-behome-vk']) {
          const mask = document.createElement('span');
          mask.className = `live-contact-mask ${cls}`;
          viewport.append(mask);
        }
      }
    }
    const frameInfo = active.project.frames?.[active.index];
    if (!frameInfo?.src) return;
    const filename = frameInfo.src.split('/').pop();
    const key = `${active.project.slug}/${filename}`;
    const spec = window.PORTFOLIO_CONTACT_BLUR?.[key];
    if (!spec) return;

    for (const [x1, y1, x2, y2] of spec.rects) {
      const mask = document.createElement('span');
      mask.className = 'live-contact-mask';
      mask.style.left = `${x1 / spec.width * 100}%`;
      mask.style.top = `${y1 / spec.height * 100}%`;
      mask.style.width = `${(x2 - x1) / spec.width * 100}%`;
      mask.style.height = `${(y2 - y1) / spec.height * 100}%`;
      viewport.append(mask);
    }

    // Contact slides in every project put phone/address/social data in the
    // lower page area. Add a conservative fallback there when the exact map
    // has no rectangle for this frame. The three explicitly excluded cases
    // returned above and never receive any mask.
    if (active.index >= Math.max(0, (active.project.frames?.length || 1) - 2)) {
      for (const [left, top, width, height] of [[23.5,30,16,6],[31.5,44,14,6],[64,72,12,5]]) {
        const mask = document.createElement('span');
        mask.className = 'live-contact-mask live-contact-mask--contact';
        mask.style.left=`${left}%`; mask.style.top=`${top}%`;
        mask.style.width=`${width}%`; mask.style.height=`${height}%`;
        viewport.append(mask);
      }
    }
  }

  frame.addEventListener('load', renderMasks);
  new MutationObserver(renderMasks).observe(title, {childList:true, characterData:true, subtree:true});
  addEventListener('resize', renderMasks);
  setInterval(renderMasks, 300);
})();
