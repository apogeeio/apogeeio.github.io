"""Generate the bilingual static site using the Python standard library."""
import json
import hashlib
import shutil
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '_site'
BASE = 'https://apogeeio.github.io'
GLOBE = '<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5M12 2.5C9.4 5.1 8.1 8.3 8.1 12s1.3 6.9 3.9 9.5"/></svg>'


def render(c, language, page, version):
    prefix = '/zh/' if language == 'zh' else '/'
    suffix = {'home': '', 'blog': 'blog/'}[page]
    url = prefix + suffix
    other = ('/' if language == 'zh' else '/zh/') + suffix
    home_link = prefix + '?v=' + version
    blog_link = prefix + 'blog/?v=' + version
    title = c['name'] if page == 'home' else 'Blog — Apogee'
    if page == 'home':
        body = f'''<h1>{escape(c['name'])}</h1>
        <p>{escape(c['description'])}</p>
        <!--
        <div class="hero-subtitle">{escape(c['subtitle'])}</div>
        {''.join('<p>' + escape(p) + '</p>' for p in c['bio'])}
        -->
        <div class="quick-links"><a href="https://github.com/apogeeio">GitHub</a><span class="divider" aria-hidden="true">|</span><a href="{blog_link}">Blog</a></div>'''
    elif page == 'blog':
        body = f'''<h1>Blog</h1>
        <!--
        <p class="blog-intro">{escape(c['blog_intro'])}</p>
        <ul class="blog-list"><li class="blog-card">
        <div class="blog-figure"><img src="/assets/blog-placeholder.svg" width="260" height="180" alt=""></div>
        <div class="blog-copy"><p class="blog-meta">{escape(c['post_meta'])}</p>
        <h2 class="blog-title"><a href="{prefix}blog/placeholder/">{escape(c['post_title'])}</a></h2>
        <p class="blog-teaser">{escape(c['post_teaser'])}</p></div></li></ul>
        <h2 class="section-heading">{escape(c['post_heading'])}</h2>
        <p>{escape(c['post_body'])}</p>
        -->'''
    current_home = ' aria-current="page"' if page == 'home' else ''
    current_blog = ' aria-current="page"' if page == 'blog' else ''
    return url, f'''<!doctype html>
<html lang="{c['lang']}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="site-version" content="{version}">
<title>{escape(title)}</title><meta name="description" content="{escape(c['description'], quote=True)}">
<link rel="canonical" href="{BASE}{url}">
<link rel="alternate" hreflang="en" href="{BASE}/{suffix}">
<link rel="alternate" hreflang="zh-CN" href="{BASE}/zh/{suffix}">
<link rel="alternate" hreflang="x-default" href="{BASE}/{suffix}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/assets/style.{version}.css"><script src="/assets/site.{version}.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">{escape(c['skip'])}</a>
<header class="masthead"><div class="masthead-inner">
<nav aria-label="{c['home']} / Blog"><a class="brand" href="{home_link}">Apogee</a><a href="{home_link}"{current_home}>{c['home']}</a><a href="{blog_link}"{current_blog}>Blog</a></nav>
<details class="language"><summary aria-label="{c['language']}" title="{c['language']}">{GLOBE}</summary><div class="language-menu"><a href="{other}?v={version}" lang="{c['other_lang']}" hreflang="{c['other_lang']}">{c['other_language']}</a></div></details>
</div></header>
<main id="main"><article class="page {page}">{body}</article></main>
<footer class="site-footer"><div class="footer-inner"><div class="footer-follow"><a href="https://github.com/apogeeio">GITHUB</a></div><p class="copyright">© 2026 Apogee. {c['rights']}</p></div></footer>
</body></html>
'''


def main():
    sources = [ROOT / 'build.py', ROOT / 'content/site.json', *sorted((ROOT / 'assets').glob('*'))]
    version = hashlib.sha256(b''.join(p.read_bytes() for p in sources)).hexdigest()[:16]
    content = json.loads((ROOT / 'content/site.json').read_text())
    assert content.keys() == {'en', 'zh'}, 'Both languages are required'
    assert content['en'].keys() == content['zh'].keys(), 'Translation fields must match'
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(exist_ok=True)
    shutil.copytree(ROOT / 'assets', OUT / 'assets', dirs_exist_ok=True)
    for name in ('style.css', 'site.js'):
        path = OUT / 'assets' / name
        path.rename(path.with_name(f'{path.stem}.{version}{path.suffix}'))
    urls = []
    manifest = {'version': version, 'pages': {}}
    for lang in ('en', 'zh'):
        for page in ('home', 'blog'):
            url, html = render(content[lang], lang, page, version)
            target = OUT / url.lstrip('/') / 'index.html'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(html, encoding='utf-8')
            urls.append(BASE + url)
            manifest['pages'][url] = hashlib.sha256(html.encode()).hexdigest()
    (OUT / 'version.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (OUT / '.nojekyll').touch()
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n')
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{u}</loc></url>' for u in urls) + '</urlset>')
    print(f'Built {len(urls)} pages in _site/')


if __name__ == '__main__':
    main()
