(() => {
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const url = new URL(link.href);
    const gmail = url.hostname === 'mail.google.com' && url.searchParams.get('view') === 'cm';
    if (gmail) window.ym?.(114402888, 'reachGoal', 'gmail_click');

    const contact = gmail || ['tel:', 'mailto:'].includes(url.protocol)
      || ['t.me', 'wa.me', 'msng.link'].includes(url.hostname);
    if (contact) window.ym?.(114402888, 'reachGoal', 'contact_click');
  }, { capture: true });
})();
