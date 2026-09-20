// Декоративные фоны нижних экранов — только после загрузки страницы,
// чтобы они не отбирали полосу у картинки первого экрана.
addEventListener('load', () => document.body.classList.add('bg-ready'));

// Важная ссылка на портфолио: после спокойной паузы подчёркивание
// быстро проходит по буквам слева направо, затем цикл начинается заново.
document.querySelectorAll('.cta-cases-link').forEach((link) => {
  const textNode = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (!textNode) return;
  const label = textNode.textContent.trim();
  const runner = document.createElement('span');
  runner.className = 'portfolio-letter-runner';
  runner.setAttribute('aria-hidden', 'true');
  [...label].forEach((character, index) => {
    const letter = document.createElement('span');
    letter.className = character === ' ' ? 'portfolio-letter is-space' : 'portfolio-letter';
    letter.style.setProperty('--letter-index', index);
    letter.textContent = character === ' ' ? '\u00a0' : character;
    runner.append(letter);
  });
  link.setAttribute('aria-label', label);
  textNode.replaceWith(runner);
});

// Карусель проектов на главной показывает тот же порядок, что и портфолио.
const homePortfolioTrack = document.getElementById('home-portfolio-track');
const homePortfolioPrev = document.getElementById('portfolio-prev');
const homePortfolioNext = document.getElementById('portfolio-next');
if (homePortfolioTrack && homePortfolioPrev && homePortfolioNext) {
  const cards = [...homePortfolioTrack.querySelectorAll('.case-preview')];
  let portfolioIndex = 0;
  const visibleCards = () => innerWidth <= 760 ? 1 : 3;
  const maxIndex = () => Math.max(0, cards.length - visibleCards());
  const syncPortfolio = (behavior = 'smooth') => {
    portfolioIndex = Math.min(maxIndex(), Math.max(0, portfolioIndex));
    const card = cards[portfolioIndex];
    if (!card) return;
    homePortfolioTrack.scrollTo({ left: card.offsetLeft - homePortfolioTrack.offsetLeft, behavior });
  };
  homePortfolioPrev.addEventListener('click', () => {
    portfolioIndex = portfolioIndex === 0 ? maxIndex() : portfolioIndex - 1;
    syncPortfolio();
  });
  homePortfolioNext.addEventListener('click', () => {
    portfolioIndex = portfolioIndex === maxIndex() ? 0 : portfolioIndex + 1;
    syncPortfolio();
  });
  let portfolioResizeFrame = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(portfolioResizeFrame);
    portfolioResizeFrame = requestAnimationFrame(() => syncPortfolio('auto'));
  });
  syncPortfolio('auto');
}

// Мобильное меню
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
  });
  // Пункты меню ведут на якоря той же страницы — после перехода меню закрываем.
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) navLinks.classList.remove('is-open');
  });
}

// ==========================================================================
// Первый экран идёт по своему сценарию, а не по общему появлению при прокрутке:
// строки заголовка выезжают из-под маски, фото открывается шторкой в ту же
// сторону, цифры дочерчиваются. Тайминги — в css, здесь только разметка строк.
// ==========================================================================
const heroSection = document.querySelector('.hero');
const heroMotion = !!heroSection && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const HERO_LINE_STEP = 110;
const HERO_LINE_START = 180;
const HERO_STATS_DONE = 1380;

if (heroMotion) {
  const title = heroSection.querySelector('h1');
  if (title) {
    // Заголовок уже разбит на строки вручную через <br> — по ним и режем.
    const lines = [[]];
    [...title.childNodes].forEach((node) => {
      if (node.nodeName === 'BR') lines.push([]);
      else lines[lines.length - 1].push(node);
    });
    const filled = lines.filter((nodes) => nodes.some((node) => node.textContent.trim()));
    title.textContent = '';
    filled.forEach((nodes, i) => {
      const mask = document.createElement('span');
      mask.className = 'hero-line';
      const inner = document.createElement('span');
      inner.className = 'hero-line-i';
      inner.append(...nodes);
      mask.append(inner);
      mask.style.setProperty('--d', `${HERO_LINE_START + i * HERO_LINE_STEP}ms`);
      title.append(mask);
    });
    // Лайм наливается, когда последняя строка почти доехала.
    const last = HERO_LINE_START + Math.max(filled.length - 1, 0) * HERO_LINE_STEP;
    title.style.setProperty('--d-accent', `${last + 820}ms`);
  }
  heroSection.classList.add('is-animating');
  // Сценарий отыгран — снимаем класс, иначе clip-path режет магнитные кнопки.
  setTimeout(() => heroSection.classList.remove('is-animating'), 2600);
}

// Каждый элемент появляется только при попадании в экран.
// Отдельные translate/scale не мешают transform у ховеров и параллакса.
const revealMotion = matchMedia('(prefers-reduced-motion: reduce)');
const REVEAL_ITEMS = [
  'h1', 'h2', '.guarantee-text', '.hero-marker', '.strip-kicker',
  '.eyebrow', '.hero .desc', '.cta-row', '.hero-stats > div', '.hero-quiz',
  '.section-head p', '.guarantee-sub', '.strip-points li', '.grid-3 > .card',
  '.formats-every-project > div', '.formats-scope-note', '.case-preview', '.cases-all',
  '.two-col-connected > div', '.work-note', '.work-people li', '.work-steps > li',
  '.work-timing', '.review-card', '.faq details', '.cta-intro > p', '.cta-form',
  '.hero-reference-art',
].join(',');

if ('IntersectionObserver' in window && !revealMotion.matches) {
  const candidates = [...document.querySelectorAll('main > section')]
    .flatMap((section) => [...section.querySelectorAll(REVEAL_ITEMS)]);
  const candidateSet = new Set(candidates);
  // Не анимируем одновременно контейнер и вложенный в него заголовок.
  const items = candidates.filter((el) => {
    // Первый экран отыгрывает собственный сценарий.
    if (heroMotion && heroSection.contains(el)) return false;
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (candidateSet.has(parent)) return false;
    }
    return true;
  });
  const reveal = (el, immediate = false) => {
    observer.unobserve(el);
    el.classList.remove('reveal-pending');
    if (immediate) {
      el.classList.remove('reveal-running');
      el.classList.add('is-uncovered');
    } else {
      el.classList.add('reveal-running', 'is-uncovered');
    }
  };
  const observer = new IntersectionObserver((entries) => {
    // Каскад только для элементов в одном видимом ряду, без очереди на всю секцию.
    let rowTop = -Infinity;
    let column = 0;
    entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      .forEach((entry) => {
        const top = entry.boundingClientRect.top;
        column = Math.abs(top - rowTop) < 48 ? column + 1 : 0;
        rowTop = top;
        entry.target.style.setProperty('--reveal-delay', `${Math.min(column, 2) * 140}ms`);
        reveal(entry.target);
      });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => {
    let direction = 'up';
    if (el.matches('h1, h2, .guarantee-text, .guarantee-sub, .work-people li, .cta-intro > p')) direction = 'left';
    if (el.matches('.hero-quiz, .cta-form, .strip-points li, .work-steps > li, .faq details')) direction = 'right';
    if (el.matches('.two-col-connected > div')) {
      direction = el === el.parentElement.firstElementChild ? 'left' : 'right';
    }
    if (el.matches('.grid-3 > .card')) {
      direction = ['left', 'up', 'right'][[...el.parentElement.children].indexOf(el) % 3];
    }
    if (el.matches('.hero-reference-art')) direction = 'zoom';
    el.dataset.revealDirection = direction;
    if (el.matches('.case-preview, .home-page section#services .card')) el.classList.add('media-host');
    el.classList.add('reveal-item');
    el.addEventListener('animationend', (event) => {
      if (event.target === el && event.animationName === 'section-reveal') el.classList.remove('reveal-running');
    });
    // При восстановлении позиции уже пройденный контент остаётся видимым.
    if (el.getBoundingClientRect().bottom <= 0) {
      reveal(el, true);
    } else {
      el.classList.add('reveal-pending');
      observer.observe(el);
    }
  });

  revealMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    items.forEach((el) => reveal(el, true));
    observer.disconnect();
  });
  // Клавиатурный фокус сразу открывает элемент вместе с его содержимым.
  document.addEventListener('focusin', (event) => {
    const item = event.target.closest('.reveal-item');
    if (item) reveal(item, true);
  });
}

// ==========================================================================
// Приёмы, по которым видно, что сайт делала студия.
// Всё выключается при prefers-reduced-motion.
// ==========================================================================
const fancyMotion = !matchMedia('(prefers-reduced-motion: reduce)').matches;

if (fancyMotion) {
  // --- Цифры в первом экране отсчитываются от нуля
  const counters = document.querySelectorAll('.hero-stats strong');
  counters.forEach((el) => {
    const raw = el.textContent.trim();
    const target = parseInt(raw, 10);
    if (Number.isNaN(target)) return;
    const suffix = raw.replace(/^\d+/, '');
    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0' + suffix;
    // Отсчёт начинается после того, как строка с цифрами встала на место.
    setTimeout(() => requestAnimationFrame(tick), heroMotion ? HERO_STATS_DONE : 500);
  });

  // --- Главные кнопки притягиваются к курсору
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.hero .btn-primary, .cases-all .btn, .cta-form .btn-primary').forEach((btn) => {
      const strength = 0.28;
      let frame = 0;
      const move = (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * strength;
          const dy = (e.clientY - (r.top + r.height / 2)) * strength;
          btn.style.transform = `translate(${dx}px, ${dy}px)`;
        });
      };
      const reset = () => {
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        btn.style.transform = '';
      };
      btn.classList.add('is-magnetic');
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', reset);
      btn.addEventListener('blur', reset);
    });
  }

  // --- Фотография первого экрана уезжает медленнее страницы
  const heroArt = document.querySelector('.hero-reference-art');
  if (heroArt) {
    let parallaxFrame = 0;
    const parallax = () => {
      parallaxFrame = 0;
      const y = Math.min(window.scrollY, innerHeight);
      heroArt.style.transform = `translate3d(0, ${y * 0.12}px, 0) scale(1.06)`;
    };
    addEventListener('scroll', () => {
      if (!parallaxFrame) parallaxFrame = requestAnimationFrame(parallax);
    }, { passive: true });
    parallax();
  }
}

// Тексты ошибок у галочек согласия — те же, что на действующем asama.site.
// Прогресс прокрутки: обновление только при изменении страницы или позиции.
const fixedHeader = document.querySelector('.site-header');
if (fixedHeader) {
  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  fixedHeader.append(progress);
  let progressFrame = 0;
  const updateProgress = () => {
    progressFrame = 0;
    fixedHeader.classList.toggle('is-scrolled', window.scrollY > 40);
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    progress.style.transform = `scaleX(${ratio})`;
  };
  const scheduleProgress = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress);
  window.addEventListener('pageshow', scheduleProgress);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleProgress).observe(document.body);
  updateProgress();
}
const reviewsRow=document.querySelector('.reviews-row');
if(reviewsRow){
  reviewsRow.id='reviews-track';
  const controls=document.createElement('div');
  controls.className='reviews-controls';
  controls.innerHTML='<button type="button" aria-label="Предыдущие отзывы" aria-controls="reviews-track">←</button><button type="button" aria-label="Следующие отзывы" aria-controls="reviews-track">→</button>';
  document.querySelector('.reviews-title').after(controls);
  const [prev,next]=controls.children;
  const sync=()=>{prev.disabled=reviewsRow.scrollLeft<=2;next.disabled=reviewsRow.scrollLeft>=reviewsRow.scrollWidth-reviewsRow.clientWidth-2;};
  const move=direction=>reviewsRow.scrollBy({left:direction*(reviewsRow.querySelector('.review-card').getBoundingClientRect().width+parseFloat(getComputedStyle(reviewsRow).gap)),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  prev.onclick=()=>move(-1);next.onclick=()=>move(1);
  reviewsRow.addEventListener('scroll',sync,{passive:true});
  new ResizeObserver(sync).observe(reviewsRow);sync();
}
