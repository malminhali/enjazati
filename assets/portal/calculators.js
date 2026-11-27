'use strict';

const digits = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
const normalizeNumber = (value) => String(value ?? '').trim()
  .replace(/[٠-٩۰-۹]/g, (digit) => String(digits.indexOf(digit) % 10))
  .replace(/٫/g, '.')
  .replace(/٬/g, ',');

class CalculatorInputError extends Error {
  constructor(field, reason) {
    super(reason);
    this.field = field;
    this.reason = reason;
  }
}

// Read decimals as scaled integers so monetary rounding uses exact halalas.
function decimal(values, field, { places = 2, min = 0, max = 1_000_000_000 } = {}) {
  const value = normalizeNumber(values[field]);
  const precision = places ? '(?:\\.[0-9]{1,' + places + '})?' : '';
  const pattern = new RegExp('^(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)' + precision + '$');
  if (!pattern.test(value)) throw new CalculatorInputError(field, places ? 'number' : 'whole');
  const [whole, fraction = ''] = value.replace(/,/g, '').split('.');
  const scale = 10 ** places;
  const scaled = Number(whole) * scale + Number(fraction.padEnd(places, '0'));
  if (!Number.isSafeInteger(scaled) || scaled > max * scale) {
    throw new CalculatorInputError(field, max === 100 ? 'percent' : max === 120 ? 'installments' : 'range');
  }
  if (scaled < min) throw new CalculatorInputError(field, field === 'count' ? 'installments' : 'positive');
  return scaled;
}

function dateValue(values, field) {
  const str = values[field] || '';
  const value = Date.parse(str + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str) || str < '1900-01-01' || str > '2100-12-31'
      || !Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== str) {
    throw new CalculatorInputError(field, 'date');
  }
  return value;
}

const amount = (v, name, min = 0) => decimal(v, name, { min });
const row = (key, value, type = 'money') => ({ key, value, type });
const percentage = (part, total) => total ? 100 * part / total : null;
const roundedDivide = (numerator, denominator) => Math.floor((numerator + denominator / 2) / denominator);
const calculators = {
  vat(v) {
    const price = amount(v, 'price');
    const net = v.mode === 'gross' ? roundedDivide(price * 100, 115) : price;
    const vat = v.mode === 'gross' ? price - net : roundedDivide(net * 15, 100);
    return [row('net', net), row('vat', vat), row('total', net + vat)];
  },
  rett(v) {
    if (v.confirmed !== 'yes') throw new CalculatorInputError('confirmed', 'taxConfirmation');
    const base = amount(v, 'base', 1);
    return [row('taxableBase', base), row('rett', roundedDivide(base * 5, 100))];
  },
  'saudi-share'(v) {
    const total = decimal(v, 'total', { places: 0, min: 1, max: 1_000_000 });
    const saudis = decimal(v, 'saudis', { places: 0, max: 1_000_000 });
    if (saudis > total) throw new CalculatorInputError('saudis', 'headcount');
    return [row('saudiShare', percentage(saudis, total), 'percent'),
      row('others', total - saudis, 'integer')];
  },
  discount(v) {
    const price = amount(v, 'price');
    const rate = decimal(v, 'rate', { max: 100 });
    const discount = roundedDivide(price * rate, 10_000);
    return [row('discount', discount), row('final', price - discount)];
  },
  profit(v) {
    const price = amount(v, 'price');
    const cost = amount(v, 'cost');
    const profit = price - cost;
    return [row('profit', profit), row('margin', percentage(profit, price), 'percent'),
      row('markup', percentage(profit, cost), 'percent')];
  },
  dates(v) {
    const start = dateValue(v, 'start');
    const end = dateValue(v, 'end');
    if (end < start) throw new CalculatorInputError('end', 'order');
    return [row('days', (end - start) / 86_400_000 + Number(v.mode === 'inclusive'), 'integer')];
  },
  budget(v) {
    const income = amount(v, 'income');
    const outgoings = amount(v, 'fixed') + amount(v, 'variable');
    const balance = income - outgoings;
    return [row('expenses', outgoings), row(balance < 0 ? 'shortfall' : 'balance', Math.abs(balance))];
  },
  'rental-yield'(v) {
    const cost = amount(v, 'cost', 1);
    const income = amount(v, 'income');
    const net = income - amount(v, 'expenses');
    return [row('netIncome', net), row('grossYield', percentage(income, cost), 'percent'),
      row('netYield', percentage(net, cost), 'percent')];
  },
  'price-per-metre'(v) {
    const price = amount(v, 'price');
    const area = decimal(v, 'area', { places: 3, min: 1, max: 1_000_000 });
    return [row('perMetre', roundedDivide(price * 1000, area))];
  },
  'rent-installments'(v) {
    const price = amount(v, 'price');
    const count = decimal(v, 'count', { places: 0, min: 1, max: 120 });
    const base = Math.floor(price / count);
    const extra = price % count;
    const installments = [row('total', price)];
    if (!extra) {
      installments.push(row('each', base));
    } else {
      installments.push({ ...row('first', base + 1), count: extra },
        { ...row('remaining', base), count: count - extra });
    }
    return installments;
  },
};

const labels = {
  net: ['المبلغ قبل الضريبة', 'Before VAT'],
  vat: ['ضريبة القيمة المضافة (15٪)', 'VAT (15%)'],
  taxableBase: ['القيمة الخاضعة المدخلة', 'Taxable value entered'],
  rett: ['ضريبة التصرفات العقارية التقديرية (5٪)', 'Estimated real estate transaction tax (5%)'],
  saudiShare: ['نسبة الموظفين السعوديين', 'Saudi employee share'],
  others: ['عدد الموظفين غير السعوديين', 'Non-Saudi employee count'],
  total: ['الإجمالي', 'Total'],
  discount: ['مبلغ الخصم', 'Discount amount'],
  final: ['السعر بعد الخصم', 'Discounted price'],
  profit: ['صافي الفرق بين البيع والتكلفة', 'Sale proceeds minus cost'],
  margin: ['هامش الربح', 'Profit margin'],
  markup: ['الزيادة على التكلفة', 'Markup on cost'],
  days: ['عدد الأيام', 'Number of days'],
  expenses: ['إجمالي المصروفات', 'Total expenses'],
  shortfall: ['العجز الشهري', 'Monthly shortfall'],
  balance: ['المتبقي الشهري', 'Monthly balance'],
  netIncome: ['الإيجار بعد المصروفات', 'Rent after operating costs'],
  grossYield: ['العائد الإجمالي', 'Gross yield'],
  netYield: ['العائد بعد المصروفات', 'Yield after operating costs'],
  perMetre: ['سعر المتر المربع', 'Price per square metre'],
  each: ['قيمة كل دفعة', 'Each instalment'],
  first: ['عدد الدفعات الأولى', 'First instalments'],
  remaining: ['عدد الدفعات المتبقية', 'Remaining instalments'],
};
const messages = {
  number: ['أدخل رقماً موجباً أو صفراً بمنزلتين عشريتين على الأكثر (ثلاث للمساحة).', 'Enter a non-negative number with up to two decimal places (three for area).'],
  whole: ['أدخل عدداً صحيحاً.', 'Enter a whole number.'],
  required: ['أدخل القيمة لاستكمال الحساب.', 'Enter a value to complete the calculation.'],
  range: ['القيمة أعلى من الحد الذي تدعمه الحاسبة.', 'This value is above the calculator limit.'],
  percent: ['أدخل نسبة بين 0 و100.', 'Enter a percentage between 0 and 100.'],
  installments: ['أدخل عدد دفعات من 1 إلى 120.', 'Enter 1 to 120 instalments.'],
  positive: ['أدخل قيمة أكبر من صفر.', 'Enter a value greater than zero.'],
  date: ['أدخل تاريخاً صحيحاً بين 1900 و2100.', 'Enter a valid date between 1900 and 2100.'],
  order: ['تاريخ النهاية يجب أن يوافق تاريخ البداية أو يأتي بعده.', 'The end date must be on or after the start date.'],
  taxConfirmation: ['أكد خضوع التصرف ومعرفة القيمة الخاضعة أو راجع خدمة التسجيل الرسمية.', 'Confirm the transaction is taxable and the taxable value is known, or check the official registration service.'],
  headcount: ['عدد الموظفين السعوديين لا يمكن أن يتجاوز إجمالي الموظفين.', 'The number of Saudi employees cannot exceed the total headcount.'],
  undefined: ['غير محدد لأن المقام صفر', 'Undefined because the denominator is zero'],
};

function initCalculator(form) {
  const output = form.querySelector('.tool-output');
  const fields = form.querySelector('fieldset');
  const controls = [...fields.querySelectorAll('input, select')];
  let result;
  let error;

  function render() {
    const en = document.documentElement.lang === 'en';
    const text = (pair) => pair[Number(en)];
    const locale = en ? 'en-SA' : 'ar-SA-u-nu-latn';
    const integer = new Intl.NumberFormat(locale);
    const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'SAR', currencyDisplay: 'code' });
    const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 });
    output.replaceChildren();
    output.hidden = !result && !error;
    output.classList.toggle('tool-error', Boolean(error));
    for (const control of controls) {
      if (control.tagName === 'SELECT') {
        for (const option of control.options) option.textContent = option.dataset[en ? 'en' : 'ar'];
      }
      if (error?.field === control.name) {
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', output.id);
      } else {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('aria-describedby');
      }
    }
    if (error) {
      output.textContent = text(messages[error.reason]);
      return;
    }
    if (!result) return;

    const list = document.createElement('dl');
    for (const item of result) {
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = text(labels[item.key]);
      if (item.count) term.append(' (' + integer.format(item.count) + ')');
      const valueText = document.createElement('bdi');
      if (item.value === null) valueText.textContent = text(messages.undefined);
      else if (item.type === 'money') valueText.textContent = money.format(item.value / 100);
      else if (item.type === 'percent') valueText.textContent = percent.format(item.value / 100);
      else valueText.textContent = integer.format(item.value);
      value.append(valueText);
      list.append(term, value);
    }
    output.append(list);
  }

  function clear() {
    if (!result && !error) return;
    result = undefined;
    error = undefined;
    render();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    result = undefined;
    error = undefined;
    const values = Object.fromEntries(new FormData(form));
    try {
      const missing = controls.find((control) => control.required && !control.value.trim());
      if (missing) throw new CalculatorInputError(missing.name, 'required');
      result = calculators[form.dataset.calculator](values);
    } catch (caught) {
      if (!(caught instanceof CalculatorInputError)) throw caught;
      error = caught;
    }
    render();
    if (error) form.elements[error.field].focus();
  });
  form.addEventListener('reset', clear);
  form.addEventListener('input', clear);
  document.addEventListener('portal-languagechange', render);
  output.id = form.dataset.calculator + '-result';
  form.noValidate = true;
  fields.disabled = false;
  render();
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-calculator]').forEach(initCalculator);
}
if (typeof module === 'object') module.exports = { calculators, CalculatorInputError };
