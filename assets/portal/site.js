(() => {
  'use strict';

  const root = document.documentElement;
  const langButton = document.getElementById('lang');
  const menu = document.getElementById('menu');
  const nav = document.getElementById('nav');
  let lang = root.lang === 'en' ? 'en' : 'ar';
  const alternate = langButton.dataset.alternate;
  if (!alternate) {
    try {
      const saved = localStorage.getItem('enjazatiLang');
      if (saved === 'en' || saved === 'ar') lang = saved;
    } catch {}
  }

  function setLanguage(value, persist = false) {
    lang = value;
    document.body.dataset.lang = value;
    root.lang = value;
    root.dir = value === 'ar' ? 'rtl' : 'ltr';
    langButton.textContent = value === 'ar' ? 'English' : 'العربية';
    langButton.lang = value === 'ar' ? 'en' : 'ar';
    menu.setAttribute('aria-label', value === 'ar' ? 'القائمة' : 'Menu');
    nav.setAttribute('aria-label', value === 'ar' ? 'القائمة الرئيسية' : 'Main navigation');
    if (persist) {
      try { localStorage.setItem('enjazatiLang', value); } catch {}
    }
    document.dispatchEvent(new Event('portal-languagechange'));
  }

  function setMenu(open) {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  }

  langButton.addEventListener('click', () => {
    if (alternate) {
      location.assign(alternate + location.search + location.hash);
    } else {
      setLanguage(lang === 'ar' ? 'en' : 'ar', true);
    }
  });
  menu.setAttribute('aria-controls', 'nav');
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !nav.classList.contains('open')) return;
    setMenu(false);
    menu.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) setMenu(false);
  });
  matchMedia('(min-width: 1001px)').addEventListener('change', () => setMenu(false));

  const prefix = alternate && lang === 'en' ? '/en' : '';
  const path = location.pathname.slice(prefix.length).replace(/index\.html$/, '');
  const parent = path.startsWith('/branches/') ? '/branches/'
    : path.startsWith('/blog/') ? '/blog/' : path === '/properties/' ? '/real-estate/' : null;
  if (parent && !nav.querySelector('[aria-current]')) {
    nav.querySelector('a[href="' + prefix + parent + '"]')?.setAttribute('aria-current', 'location');
  }
  setLanguage(lang);
})();
