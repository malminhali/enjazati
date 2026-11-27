(() => {
  'use strict';

  const listingFilters = document.getElementById('property-filters');
  const results = document.getElementById('property-results');
  const empty = document.getElementById('property-empty');
  const error = document.getElementById('property-error');
  const status = document.getElementById('property-count');
  const [purpose, type, location] = listingFilters.querySelectorAll('select');
  const purposes = { sale: ['بيع', 'Sale'], rent: ['إيجار', 'Rent'] };
  const types = {
    apartment: ['شقة', 'Apartment'], villa: ['فيلا', 'Villa'], house: ['منزل', 'House'],
    land: ['أرض', 'Land'], commercial: ['عقار تجاري', 'Commercial property'],
  };
  const ar = () => document.documentElement.lang === 'ar';
  const tr = (arabic, english) => ar() ? arabic : english;
  const bilingual = (value) => Array.isArray(value) && value.length === 2
    && value.every((part) => typeof part === 'string' && part.trim());
  const localize = (value) => tr(...value);
  let inventory = [];
  let unavailable = false;

  function eligible(entry) {
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    return entry?.approved === true && entry.available === true
      && Object.hasOwn(purposes, entry.purpose) && Object.hasOwn(types, entry.type)
      && [entry.title, entry.location, entry.description].every(bilingual)
      && /^\d{6,20}$/.test(entry.licence)
      && /^\d{4}-\d{2}-\d{2}$/.test(entry.licenceExpiry)
      && Date.parse(entry.licenceExpiry + 'T00:00:00Z') >= Date.parse(today + 'T00:00:00Z')
      && new Date(entry.licenceExpiry + 'T00:00:00Z').toISOString().slice(0, 10) === entry.licenceExpiry
      && Number.isFinite(entry.area) && entry.area > 0
      && Array.isArray(entry.photos) && entry.photos.length > 0
      && entry.photos.every((photo) => /^\/assets\/properties\/[a-z0-9][a-z0-9_-]*\.(?:webp|jpe?g|png)$/i.test(photo));
  }

  function options(select, values) {
    const previous = select.value;
    const entries = [...values].sort((a, b) => a[1].localeCompare(b[1], ar() ? 'ar' : 'en'));
    select.replaceChildren(new Option(tr('الكل', 'All'), ''),
      ...entries.map(([value, label]) => new Option(label, value)));
    if (values.has(previous)) select.value = previous;
  }

  function label(tag, content, className = '') {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = content;
    return element;
  }

  function image(src, description) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = description;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 640;
    img.height = 400;
    return img;
  }

  function listing(entry) {
    const card = document.createElement('article');
    card.className = 'card property-card';
    const name = localize(entry.title);
    const place = localize(entry.location);
    const details = document.createElement('details');
    details.append(label('summary', tr('تفاصيل العقار', 'Property details')));
    details.append(label('p', localize(entry.description)));
    for (const photo of entry.photos.slice(1)) details.append(image(photo, name + ' · ' + place));
    const verify = label('a', tr('تحقق من الترخيص', 'Verify the licence'), 'textlink');
    verify.href = 'https://rega.gov.sa/rega-services/real-estate-inquiries';
    details.append(verify);
    const contact = label('a', tr('اتصل بالفرع', 'Call the branch'), 'btn secondary');
    contact.href = 'tel:+966593223458';
    const area = new Intl.NumberFormat(ar() ? 'ar-SA' : 'en-SA').format(entry.area);
    const licence = label('bdi', entry.licence);
    const licenceLine = label('p', tr('ترخيص الإعلان العقاري ', 'Advertisement licence '));
    licenceLine.append(licence);
    card.append(image(entry.photos[0], name + ' · ' + place),
      label('small', localize(purposes[entry.purpose]) + ' · ' + localize(types[entry.type])),
      label('h3', name), label('p', place + ' · ' + area + tr(' م²', ' m²')),
      licenceLine, details, contact);
    return card;
  }

  function draw() {
    listingFilters.hidden = inventory.length === 0;
    const locations = new Map(inventory.map((entry) => [JSON.stringify(entry.location), localize(entry.location)]));
    options(purpose, new Map(inventory.map((entry) => [entry.purpose, localize(purposes[entry.purpose])])));
    options(type, new Map(inventory.map((entry) => [entry.type, localize(types[entry.type])])));
    options(location, locations);
    const matches = inventory.filter((entry) => (!purpose.value || entry.purpose === purpose.value)
      && (!type.value || entry.type === type.value)
      && (!location.value || JSON.stringify(entry.location) === location.value));
    status.textContent = inventory.length ? tr(matches.length + ' عرض', matches.length + ' listings') : '';
    empty.hidden = unavailable || inventory.length > 0;
    results.replaceChildren(...matches.map(listing));
    if (inventory.length && !matches.length) {
      results.append(label('p', tr('لا توجد عروض تطابق الفلاتر المختارة.', 'No listings match the selected filters.')));
    }
  }

  listingFilters.addEventListener('change', draw);
  document.addEventListener('portal-languagechange', draw);
  fetch('/assets/portal/properties.json')
    .then((response) => {
      if (!response.ok) throw new Error('Listings unavailable');
      return response.json();
    })
    .then((entries) => {
      inventory = entries.filter(eligible);
      draw();
    })
    .catch(() => {
      unavailable = true;
      empty.hidden = true;
      error.hidden = false;
    });
})();
