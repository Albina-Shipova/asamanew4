(() => {
  const site = document.querySelector('#site');
  const iframe = document.querySelector('#inspector-frame');
  site?.addEventListener('click', event => event.preventDefault());
  if (site) {
    site.removeAttribute('href');
    new MutationObserver(() => site.removeAttribute('href')).observe(site, {attributes:true, attributeFilter:['href']});
  }
  // The project itself remains visible, but no links/buttons inside an
  // external live-preview iframe can navigate away from the portfolio.
  iframe?.setAttribute('tabindex', '-1');
  function neutralizeEmbeddedLinks() {
    try {
      const doc = iframe?.contentDocument;
      if (!doc) return;
      doc.querySelectorAll('a').forEach(link => {
        link.removeAttribute('href');
        link.addEventListener('click', event => event.preventDefault(), {capture:true});
      });
    } catch (_) {
      // Cross-origin live sites cannot be inspected; the iframe remains
      // scrollable and the portfolio-level navigation is still protected.
    }
  }
  iframe?.addEventListener('load', neutralizeEmbeddedLinks);
  neutralizeEmbeddedLinks();
})();
