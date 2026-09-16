// Prepared local files: no canvas processing, blob URLs or visibility changes
// during viewing. Build the paths before the gallery creates any image nodes.
(() => {
  const masks = window.PORTFOLIO_CONTACT_BLUR || {};
  const staff = {
    'behome/full.webp':'behome/full-social.png',
    'behome/orbit-11.webp':'behome/orbit-11-social.png',
    'behome/orbit-02.webp':'behome/orbit-02-staff.png',
    'estetica/full.webp':'estetica/full-team.png',
    'estetica/orbit-07.webp':'estetica/orbit-07-team.png',
    'spasibodoctor/full.webp':'spasibodoctor/full-staff.png',
    'semdoc4/full.webp':'semdoc4/full-staff.png',
    'remontsurgut/full.webp':'remontsurgut/full-staff.png',
    'remontsurgut/orbit-09.webp':'remontsurgut/orbit-09-staff.png',
  };
  for (const [slug,frame] of Object.entries({estetica:'10',semdoc4:'07',remontsurgut:'10',tai2:'07'})) {
    staff[`${slug}/full.webp`]=`${slug}/full-reviews.png`;
    staff[`${slug}/orbit-${frame}.webp`]=`${slug}/orbit-${frame}-reviews.png`;
  }
  for (const [slug, frames] of Object.entries({spasibodoctor:['03','04','06','07','08','09','10'],semdoc4:['06','09']})) {
    for (const frame of frames) staff[`${slug}/orbit-${frame}.webp`] = `${slug}/orbit-${frame}-staff.png`;
  }
  const resolve = src => {
    const boundary = src.search(/[?#]/);
    const pathname = boundary < 0 ? src : src.slice(0, boundary);
    const suffix = boundary < 0 ? '' : src.slice(boundary);
    const key = pathname.replace(/^materials\//, '');
    if (staff[key]) return `materials-blurred/${staff[key]}?v=staff-1`;
    return masks[key] ? `materials-blurred/${key.replace(/\.webp$/, '.png')}${suffix}` : src;
  };
  for (const project of window.PORTFOLIO_MATERIALS || []) {
    project.thumb = resolve(project.cover.replace(/cover\.webp$/, 'thumb.webp'));
    project.cover = resolve(project.cover);
    project.full = resolve(project.full);
    for (const frame of project.frames) frame.src = resolve(frame.src);
  }
})();
