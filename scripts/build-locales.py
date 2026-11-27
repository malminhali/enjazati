#!/usr/bin/env python3
"""Build static English pages and the sitemap from the bilingual portal pages."""
import html
import json
from pathlib import Path
import re

SITE = Path(__file__).resolve().parents[1]
ORIGIN = 'https://enjazati.sa'
LOCALES = {
    '/': ('Enjazati Group', 'Electronic and business service assistance in Al-Ahsa, with a dedicated branch for real estate enquiries.'),
    '/about/': ('About Enjazati', 'Meet Enjazati Group, a private electronic and business services office in Al-Ahsa.'),
    '/blog/': ('Practical guides', 'Guides to Qiwa, Balady, commercial registration, VAT and real estate, with official sources.'),
    '/blog/annual-confirmation/': ('Annual commercial registration confirmation', 'Understand annual confirmation for Saudi sole proprietorships and companies, and find the relevant official service.'),
    '/blog/employee-transfer/': ('How does employee transfer work in Qiwa?', 'Identify the right employee transfer route and track the request in Qiwa.'),
    '/blog/health-certificate/': ('How do I start a Balady health certificate application?', 'Start a health certificate request in Balady and follow the required medical examination and education steps.'),
    '/blog/real-estate-transaction-tax/': ('Real estate transaction tax: when does the 5% calculation apply?', 'The standard rate applies to taxable transactions. Check the tax treatment and taxable value before using the calculator.'),
    '/blog/municipal-licence/': ('Before applying for a shop licence', 'Check Saudi municipal requirements for your business activity and location before applying through Balady.'),
    '/blog/vat-inclusive-price/': ('How do I extract 15% VAT from an inclusive price?', 'Learn how to calculate Saudi standard-rate VAT when prices include or exclude tax.'),
    '/blog/verify-property-ad/': ('How do I verify a real estate advertisement licence?', 'Find the official REGA lookup and check a Saudi real estate advertisement or FAL licence.'),
    '/branches/': ('Our branches', 'Find Enjazati locations and contact details in Al-Ahsa.'),
    '/branches/1/': ('Enjazati 1', 'Business and electronic service enquiries in Al-Hofuf, near King Fahd Hospital.'),
    '/branches/2/': ('Enjazati 2', 'Business and electronic service enquiries in Al-Hofuf, Al Sulaimaniyah 3rd.'),
    '/branches/real-estate/': ('Enjazati Real Estate branch', 'Contact Enjazati Real Estate in Al-Hofuf.'),
    '/contact/': ('Contact Enjazati', 'Find the correct Enjazati branch phone, WhatsApp and management contacts.'),
    '/privacy/': ('Privacy', 'How Enjazati handles website search, calculator inputs and contact links.'),
    '/properties/': ('Property listings', 'Browse approved Enjazati real estate listings as they become available.'),
    '/real-estate/': ('Enjazati Real Estate', 'Real estate enquiries, official verification resources and property calculators for Al-Ahsa.'),
    '/services/': ('Service catalogue', 'Search official Saudi procedures by everyday terms, category, topic or platform.'),
    '/individuals/': ('Electronic services', 'Electronic services for individuals and families, from preparing applications to following up.'),
    '/business/': ('Business services', 'Support for setting up your business, handling employee paperwork, obtaining licences and managing online requests.'),
    '/tools/vat-calculator/': ('VAT calculator', 'Add 15% VAT or extract it from an inclusive price.'),
    '/tools/discount-calculator/': ('Discount calculator', 'Compare the discount amount and final price.'),
    '/tools/profit-margin-calculator/': ('Profit margin calculator', 'Calculate profit or loss and compare both percentages.'),
    '/tools/monthly-budget-calculator/': ('Monthly budget calculator', 'See what remains after your monthly commitments.'),
    '/tools/rental-yield-calculator/': ('Rental yield calculator', 'Compare gross yield and yield after annual operating costs.'),
    '/tools/price-per-square-metre/': ('Price per square metre calculator', 'Compare property prices using the same definition of area.'),
    '/tools/rent-instalment-calculator/': ('Rent instalment calculator', 'Divide total rent into instalments.'),
    '/tools/real-estate-transaction-tax-calculator/': ('Real estate transaction tax calculator', 'Estimate the tax when the taxable value and treatment are known.'),
    '/tools/saudi-employee-share-calculator/': ('Saudi employee share calculator', 'Calculate the Saudi share of your actual workforce headcount.'),
    '/tools/overtime-calculator/': ('Overtime pay calculator', 'Estimate Saudi overtime pay for hours already classified as overtime.'),
    '/tools/end-of-service-calculator/': ('End-of-service award calculator', 'Estimate your award using completed years and months of service.'),
    '/tools/date-difference-calculator/': ('Date difference calculator', 'Find elapsed days or include both endpoints.'),
    '/tools/': ('Tools & calculators', 'Free calculators for work, money, property and dates. Choose a tool to get started.'),
    '/business/employee-transfer/': ('Qiwa employee transfer', 'Help for establishments preparing and tracking employee transfer requests in Qiwa.'),
    '/business/health-certificate/': ('Balady health certificate', 'Help for food and public health establishments applying for employee health certificates.'),
    '/business/annual-confirmation/': ('Annual commercial registration confirmation', 'Review your registration information and prepare annual confirmation for your business type.'),
}
COMPANY = {'ar': 'مجموعة إنجازاتي', 'en': 'Enjazati Group'}
GUIDES = {'ar': 'الأدلة', 'en': 'Guides'}
NAV = re.compile(r'(<a\b[^>]*\bhref=")(/[^"]*)(")', re.I)


def path_for(route):
    return SITE / route.strip('/') / 'index.html'


def english_href(match):
    start, href, end = match.groups()
    route = re.split(r'[?#]', href, maxsplit=1)[0]
    return start + ('/en' if route in LOCALES else '') + href + end


def esc(value):
    return html.escape(value, quote=True)


def set_meta(source, prop, content):
    key, value = prop
    tag = f'<meta {key}="{value}" content="{esc(content)}">'
    pattern = re.compile(rf'<meta {key}="{re.escape(value)}" content="[^"]*">')
    if pattern.search(source):
        return pattern.sub(lambda _: tag, source, count=1)
    return source.replace('</head>', tag + '</head>', 1)


def current_links(source, route, lang, indexed):
    source = re.sub(r'<link rel="alternate" hreflang="[^"]+" href="[^"]+">', '', source)
    source = re.sub(r'<link rel="canonical" href="[^"]+">', '', source)
    local_route = '/en' + route if lang == 'en' else route
    links = f'<link rel="canonical" href="{ORIGIN}{local_route}">'
    if indexed:
        links += ''.join(f'<link rel="alternate" hreflang="{code}" href="{ORIGIN}{path}">'
                         for code, path in (('ar-SA', route), ('en-SA', '/en' + route), ('x-default', route)))
    return source.replace('</head>', links + '</head>', 1)


def breadcrumbs(source, route, label, lang):
    source = re.sub(r'<script type="application/ld\+json" id="breadcrumbs">.*?</script>', '', source)
    if route == '/':
        return source
    prefix = '/en' if lang == 'en' else ''
    crumbs = [(COMPANY[lang], prefix + '/')]
    if route.startswith('/blog/') and route != '/blog/':
        crumbs.append((GUIDES[lang], prefix + '/blog/'))
    if route.startswith('/tools/') and route != '/tools/':
        crumbs.append(('الأدوات والحاسبات' if lang == 'ar' else 'Tools & calculators', prefix + '/tools/'))
    if route.startswith('/business/') and route != '/business/':
        crumbs.append(('خدمات الأعمال' if lang == 'ar' else 'Business services', prefix + '/business/'))
    crumbs.append((label, prefix + route))
    data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': position, 'name': name, 'item': ORIGIN + href}
            for position, (name, href) in enumerate(crumbs, 1)
        ],
    }
    script = '<script type="application/ld+json" id="breadcrumbs">' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + '</script>'
    return source.replace('</head>', script + '</head>', 1)


def build():
    indexed_routes = []
    for route, (english_title, english_description) in LOCALES.items():
        path = path_for(route)
        ar = path.read_text()
        arabic_title = html.unescape(re.search(r'<title>([^<]+)</title>', ar)[1]).split(' | ')[0]
        indexed = '<meta name="robots" content="index,follow">' in ar
        if indexed:
            indexed_routes.append(route)
            ar = breadcrumbs(ar, route, arabic_title, 'ar')
        ar = re.sub(r'(<button id="lang")(?: data-alternate="[^"]+")?', rf'\1 data-alternate="/en{route}"', ar)
        ar = current_links(ar, route, 'ar', indexed)
        ar = set_meta(ar, ('property', 'og:locale'), 'ar_SA') if indexed else ar
        path.write_text(ar)

        en = ar.replace('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">', 1)
        en = en.replace('<body data-lang="ar"', '<body data-lang="en"', 1)
        en = NAV.sub(english_href, en)
        en = en.replace('/fonts/enj-arabic-v2.woff2" as="font"','/fonts/inter-latin.woff2" as="font"')
        en = en.replace('action="/services/"', 'action="/en/services/"')
        en = en.replace(f'data-alternate="/en{route}"', f'data-alternate="{route}"')
        en = re.sub(r'(<button id="lang"[^>]*>)English</button>', r'\1العربية</button>', en, count=1)
        page_title = english_title + ' | Enjazati Group' if route != '/' else 'Enjazati Group | Al-Ahsa'
        en = re.sub(r'<title>[^<]+</title>', lambda _: f'<title>{esc(page_title)}</title>', en, count=1)
        en = set_meta(en, ('name', 'description'), english_description)
        if indexed:
            for prop, value in [('og:title', page_title), ('og:description', english_description),
                                ('og:url', ORIGIN + '/en' + route), ('og:locale', 'en_SA')]:
                en = set_meta(en, ('property', prop), value)
            en = breadcrumbs(en, route, english_title, 'en')
        en = current_links(en, route, 'en', indexed)
        english_path = path_for('/en' + route)
        english_path.parent.mkdir(parents=True, exist_ok=True)
        english_path.write_text(en)

    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for route in sorted(indexed_routes):
        for variant in (route, '/en' + route):
            sitemap.append(f'  <url><loc>{ORIGIN}{variant}</loc></url>')
    (SITE / 'sitemap.xml').write_text('\n'.join(sitemap + ['</urlset>', '']))


if __name__ == '__main__':
    build()
