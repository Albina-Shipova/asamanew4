// Paint the selected screenshot directly in screen pixels, outside the 3D
// orbit. Original buttons, hit testing, positions and transitions remain owners
// of interaction. This layer never receives pointer or keyboard events.
(() => {
  const dialog = document.querySelector('#orbit');
  const frames = document.querySelector('#frames');
  const layer = document.createElement('div');
  layer.className = 'sharp-preview';
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.alt = '';
  image.draggable = false;
  const number = document.createElement('span');
  number.className = 'sharp-preview-number';
  layer.append(image, number);
  dialog.append(layer);
  let scheduled = false;
  let trackUntil = 0;

  function paint(now) {
    scheduled = false;
    const selected = frames.querySelector('.is-focused-frame');
    const source = selected?.querySelector('img');
    const badge = selected?.querySelector('.frame-number');
    if (!dialog.open || !source?.complete || !source.naturalWidth || !badge) {
      layer.hidden = true;
      dialog.classList.remove('sharp-preview-ready');
      return;
    }
    const url = source.currentSrc || source.src;
    if (image.getAttribute('src') !== url) {
      layer.hidden = true;
      dialog.classList.remove('sharp-preview-ready');
      image.src = url;
    }
    if (image.complete && image.naturalWidth) {
      const rect = source.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();
      const style = getComputedStyle(badge);
      const ratio = badgeRect.height / badge.offsetHeight;
      Object.assign(layer.style, {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
      });
      number.textContent = badge.textContent;
      Object.assign(number.style, {
        left: `${badgeRect.left - rect.left}px`,
        top: `${badgeRect.top - rect.top}px`,
        width: `${badgeRect.width}px`, height: `${badgeRect.height}px`,
        font: `${style.fontWeight} ${parseFloat(style.fontSize) * ratio}px ${style.fontFamily}`,
        color: style.color, background: style.backgroundColor,
      });
      layer.hidden = false;
      dialog.classList.add('sharp-preview-ready');
    }
    if (now < trackUntil) queue();
  }
  function queue() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(paint);
    }
  }
  function update() {
    trackUntil = performance.now() + 700;
    queue();
  }
  image.addEventListener('load', update);
  frames.addEventListener('load', update, true);
  frames.addEventListener('transitionend', update);
  frames.addEventListener('transitioncancel', update);
  document.fonts.ready.then(update);
  new MutationObserver(update).observe(frames, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'src'],
  });
  new MutationObserver(update).observe(dialog, {attributes: true, attributeFilter: ['open']});
  window.addEventListener('resize', update);
  dialog.addEventListener('close', () => {layer.hidden = true;});
  update();
})();
