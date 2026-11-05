"""Generate the bilingual static site using the Python standard library."""
import json
import shutil
from html import escape
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '_site'
BASE = 'https://apogeeio.github.io'
GLOBE = '<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5M12 2.5C9.4 5.1 8.1 8.3 8.1 12s1.3 6.9 3.9 9.5"/></svg>'


def render(c, language, page):
    prefix = '/zh/' if language == 'zh' else '/'
    suffix = {'home': '', 'blog': 'blog/', 'post': 'blog/first-post/'}[page]
    url = prefix + suffix
    other = ('/' if language == 'zh' else '/zh/') + suffix
    title = c['name'] if page == 'home' else (c['post_title'] + ' — Apogee' if page == 'post' else 'Blog — Apogee')
    if page == 'home':
        body = f'''<h1>{escape(c['name'])}</h1>
        <p>{escape(c['description'])}</p>
        <!--
        <div class="hero-subtitle">{escape(c['subtitle'])}</div>
        {''.join('<p>' + escape(p) + '</p>' for p in c['bio'])}
        -->
        <div class="quick-links"><a href="https://github.com/apogeeio">GitHub</a><span class="divider" aria-hidden="true">|</span><a href="{prefix}blog/">Blog</a></div>'''
    elif page == 'blog':
        body = f'''<h1>Blog</h1>
        <ul class="blog-list"><li class="blog-card">
        <div class="blog-figure"><img src="/assets/blog-placeholder.svg" width="260" height="180" alt=""></div>
        <div class="blog-copy"><p class="blog-meta">{escape(c['post_meta'])}</p>
        <h2 class="blog-title"><a href="{prefix}blog/first-post/">{escape(c['post_title'])}</a></h2>
        <p class="blog-teaser">{escape(c['post_teaser'])}</p></div></li></ul>
        '''
    else:
        body = Template((ROOT / 'content/article.html').read_text()).substitute(
            {key: escape(value) for key, value in c['article'].items()},
            title=escape(c['post_title']), prefix=prefix)
    main_content = body if page == 'post' else f'<article class="page {page}">{body}</article>'
    article_styles = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&amp;family=Source+Sans+3:wght@300;400;600;700&amp;display=swap"><link rel="stylesheet" href="/assets/article.css">' if page == 'post' else ''
    current_home = ' aria-current="page"' if page == 'home' else ''
    current_blog = ' aria-current="page"' if page != 'home' else ''
    return url, f'''<!doctype html>
<html lang="{c['lang']}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title><meta name="description" content="{escape(c['description'], quote=True)}">
<link rel="canonical" href="{BASE}{url}">
<link rel="alternate" hreflang="en" href="{BASE}/{suffix}">
<link rel="alternate" hreflang="zh-CN" href="{BASE}/zh/{suffix}">
<link rel="alternate" hreflang="x-default" href="{BASE}/{suffix}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/assets/style.css"><script src="/assets/site.js" defer></script>
{article_styles}
</head>
<body class="{'article-page' if page == 'post' else 'site-page'}">
<a class="skip-link" href="#main">{escape(c['skip'])}</a>
<header class="masthead"><div class="masthead-inner">
<nav aria-label="{c['home']} / Blog"><a class="brand" href="{prefix}">Apogee</a><a href="{prefix}"{current_home}>{c['home']}</a><a href="{prefix}blog/"{current_blog}>Blog</a></nav>
<details class="language"><summary aria-label="{c['language']}" title="{c['language']}">{GLOBE}</summary><div class="language-menu"><a href="{other}" lang="{c['other_lang']}" hreflang="{c['other_lang']}">{c['other_language']}</a></div></details>
</div></header>
<main id="main">{main_content}</main>
<footer class="site-footer"><div class="footer-inner"><div class="footer-follow"><a href="https://github.com/apogeeio">GITHUB</a></div><p class="copyright">© 2026 Apogee. {c['rights']}</p></div></footer>
</body></html>
'''


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(exist_ok=True)
    shutil.copytree(ROOT / 'assets', OUT / 'assets', dirs_exist_ok=True)
    urls = []
    for lang in ('en', 'zh'):
        content = json.loads((ROOT / 'content' / f'{lang}.json').read_text())
        for page in ('home', 'blog', 'post'):
            url, html = render(content, lang, page)
            target = OUT / url.lstrip('/') / 'index.html'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(html, encoding='utf-8')
            urls.append(BASE + url)
    (OUT / '.nojekyll').touch()
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n')
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{u}</loc></url>' for u in urls) + '</urlset>')
    print(f'Built {len(urls)} pages in _site/')


if __name__ == '__main__':
    main()
