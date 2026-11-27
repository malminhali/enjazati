(() => {
  'use strict';
  const panel = document.querySelector('[data-catalogue]');
  if (!panel) return;

  const query = document.getElementById('q');
  const category = document.getElementById('cat');
  const platform = document.getElementById('platform');
  const topic = document.getElementById('topic');
  const results = document.getElementById('results');
  const count = document.getElementById('result-count');
  const more = document.getElementById('more');
  const empty = document.getElementById('empty');
  const error = document.getElementById('catalogue-error');
  const initial = panel.dataset.catalogue;
  const tr = (ar, en) => document.documentElement.lang === 'ar' ? ar : en;
  const languagePath = (path) => tr(path, '/en' + path);
  const normalize = (value) => String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const topicNames = {
    residency: ['الجوازات والإقامة', 'Passports and residency'],
    vehicles: ['المرور والمركبات', 'Traffic and vehicles'],
    civil: ['الأحوال المدنية', 'Civil affairs'],
    labour: ['العمل والتوظيف', 'Employment'],
    wages: ['الرواتب وحماية الأجور', 'Payroll and wage protection'],
    insurance: ['التأمينات الاجتماعية', 'Social insurance'],
    commerce: ['السجل وتأسيس الأعمال', 'Commercial registration'],
    municipal: ['الرخص البلدية والشهادات الصحية', 'Municipal licences and health certificates'],
    domestic: ['العمالة المنزلية', 'Domestic employment'],
    justice: ['الوكالات والإجراءات العدلية', 'Powers of attorney and justice'],
    support: ['الدعم الاجتماعي', 'Social support'],
    address: ['العنوان الوطني', 'National address'],
    tax: ['الزكاة والضريبة', 'Zakat and tax'],
    estate: ['التحقق العقاري', 'Real estate verification'],
  };
  const groupNames = {
    'Absher – Passports': 'residency', 'Absher – Traffic': 'vehicles', 'Absher – Civil affairs': 'civil',
    'Absher Business / Muqeem': 'residency', Qiwa: 'labour', 'Qiwa Individuals': 'labour',
    'Freelance': 'labour', 'Mudad – Wage protection': 'wages', GOSI: 'insurance',
    'Ministry of Commerce / Saudi Business Center': 'commerce', Balady: 'municipal',
    Musaned: 'domestic', Najiz: 'justice', 'Social security': 'support',
    'Citizen Account': 'support', 'SPL National Address': 'address', 'SPL Business Address': 'address',
    ZATCA: 'tax', REGA: 'estate',
  };
  const pageSize = 12;
  let limit = pageSize;
  let items = [];
  let state = 'loading';

  function readQuery() {
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    query.value = (hash.get('q') ?? params.get('q') ?? '').slice(0, 100);
    category.value = initial === 'all' ? (params.get('category') || 'all') : initial;
    if (!category.value) category.value = 'all';

    category.disabled = initial !== 'all';
  }

  function fillOptions(element, labels) {
    const current = element.value;
    const language = document.documentElement.lang;
    const entries = [...labels].sort((a, b) => a[1].localeCompare(b[1], language));
    element.replaceChildren(new Option(tr('الكل', 'All'), 'all'),
      ...entries.map(([value, label]) => new Option(label, value)));
    if (labels.has(current)) element.value = current;
  }

  function updateOptions() {
    const base = items.filter((item) => category.value === 'all' || item.cat === category.value);
    const groups = new Map();
    for (const item of base) {
      if (item.topic) groups.set(item.topic, tr(...topicNames[item.topic]));
    }
    fillOptions(topic, groups);
    const platforms = new Map();
    for (const item of base) {
      if (topic.value === 'all' || item.topic === topic.value) {
        platforms.set(item.platform, tr(item.platform, item.platformEn));
      }
    }
    fillOptions(platform, platforms);
    for (const option of category.options) option.textContent = tr(option.dataset.ar, option.dataset.en);
    query.placeholder = tr('نقل كفالة، رخصة محل، قوى…', 'Employee transfer, shop licence, Qiwa…');
  }

  function score(item, search) {
    if (!search) return 1;
    const { ar, en, aliases, keywords, platformName, topicName } = item.search;
    if (search === ar || search === en) return 10;
    if (aliases.includes(search)) return 9;
    if (keywords.includes(search)) return 6;
    if (ar.includes(search) || en.includes(search)) return 5;
    if (platformName.includes(search)) return 4;
    const text = ar + ' ' + en + ' ' + keywords + ' ' + platformName + ' ' + topicName;
    return search.split(' ').every((word) => text.includes(word)) ? 2 : 0;
  }

  function anchor(label, href, className) {
    const link = document.createElement('a');
    link.className = className;
    link.href = href;
    link.textContent = label;
    return link;
  }

  function card(item) {
    const article = document.createElement('article');
    article.className = 'result';
    const platformLabel = document.createElement('small');
    platformLabel.textContent = tr(item.platform, item.platformEn);
    const title = document.createElement('h3');
    title.textContent = tr(item.ar, item.en);
    const links = document.createElement('div');
    links.className = 'resultlinks';
    links.append(anchor(tr('المصدر الرسمي', 'Official source'), item.url, 'textlink'));
    if (item.guide) links.append(anchor(tr('اقرأ الدليل', 'Read the guide'), languagePath(item.guide), 'textlink'));
    if (item.tool) links.append(anchor(tr('حاسبة مرتبطة', 'Related calculator'), languagePath(item.tool), 'textlink'));
    if (item.cat !== 'real-estate') {
      const message = tr('السلام عليكم، أرغب بالاستفسار عن إمكانية المساعدة في: ', 'Hello, can you assist with: ')
        + tr(item.ar, item.en);
      links.append(anchor(tr('استفسر عن إمكانية المساعدة', 'Ask if we can assist'),
        'https://wa.me/966560262818?text=' + encodeURIComponent(message), 'ask'));
    }
    article.append(platformLabel, title, links);
    return article;
  }

  function draw() {
    if (state !== 'ready') {
      count.textContent = state === 'loading' ? tr('جارٍ تحميل الدليل…', 'Loading the catalogue…') : '';
      error.hidden = state !== 'error';
      return;
    }
    const search = normalize(query.value);
    const matches = items.filter((item) => (category.value === 'all' || item.cat === category.value)
      && (topic.value === 'all' || item.topic === topic.value)
      && (platform.value === 'all' || item.platform === platform.value))
      .map((item) => ({ item, score: score(item, search) }))
      .filter((match) => match.score)
      .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
    count.textContent = tr(matches.length + ' نتيجة', matches.length + ' results');
    results.replaceChildren(...matches.slice(0, limit).map(({ item }) => card(item)));
    more.hidden = matches.length <= limit;
    empty.hidden = matches.length > 0;
  }

  function reset() {
    limit = pageSize;
    draw();
  }
  function configure() {
    updateOptions();
    reset();
  }

  readQuery();
  configure();
  document.getElementById('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    reset();
  });
  query.addEventListener('input', reset);
  category.addEventListener('change', configure);
  topic.addEventListener('change', configure);
  platform.addEventListener('change', reset);
  addEventListener('hashchange', () => {
    if (location.hash.startsWith('#q=')) {
      readQuery();
      configure();
    }
  });
  more.addEventListener('click', () => {
    const firstNew = limit;
    limit += pageSize;
    draw();
    results.children[firstNew]?.querySelector('a')?.focus();
  });
  document.getElementById('lang').addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('q');
    url.hash = query.value ? 'q=' + encodeURIComponent(query.value) : '';
    if (initial === 'all') url.searchParams.set('category', category.value);
    url.searchParams.set('topic', topic.value);
    url.searchParams.set('platform', platform.value);
    history.replaceState(null, '', url);
  }, { capture: true });
  document.addEventListener('portal-languagechange', () => {
    updateOptions();
    draw();
  });

  fetch('/assets/portal/catalogue.json')
    .then((response) => {
      if (!response.ok) throw new Error('Catalogue unavailable');
      return response.json();
    })
    .then((data) => {
      items = data.map((item) => {
        const topic = groupNames[item.platformEn];
        return {
          ...item,
          topic,
          search: {
            ar: normalize(item.ar),
            en: normalize(item.en),
            aliases: (item.aliases || []).map(normalize),
            keywords: normalize(item.keywords),
            platformName: normalize(item.platform + ' ' + item.platformEn),
            topicName: normalize((topicNames[topic] || []).join(' ')),
          },
        };
      });
      state = 'ready';
      const params = new URLSearchParams(location.search);
      updateOptions();
      if ([...topic.options].some((option) => option.value === params.get('topic'))) {
        topic.value = params.get('topic');
        updateOptions();
      }
      if ([...platform.options].some((option) => option.value === params.get('platform'))) {
        platform.value = params.get('platform');
      }
      reset();
    })
    .catch(() => {
      state = 'error';
      draw();
    });
})();
