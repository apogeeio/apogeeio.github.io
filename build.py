"""Generate the bilingual static site using the Python standard library."""
import json
import hashlib
import shutil
import re
from html import escape, unescape
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '_site'
BASE = 'https://apogeeio.github.io'

GLOBE = '<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5M12 2.5C9.4 5.1 8.1 8.3 8.1 12s1.3 6.9 3.9 9.5"/></svg>'


def article_images(body, slug, language):
    layouts = {
        'blindtest': {
            'montage': {3, 6, 13, 16, 18, 20},
            'wide': {2, 10, 11, 22, 27},
            'tall': {21, 23, 24, 25, 26},
        },
        'pixelbench': {'montage': {3, 4, 6, 7}, 'wide': {9, 10}},
    }
    if slug not in layouts:
        return body

    def preview(match):
        image = match.group(0)
        src = re.search(r'\bsrc="([^"]+)"', image).group(1)
        alt = re.search(r'\balt="([^"]*)"', image)
        width = int(re.search(r'\bwidth="([0-9]+)"', image).group(1))
        height = int(re.search(r'\bheight="([0-9]+)"', image).group(1))
        number = int(Path(src).stem.rsplit('-', 1)[1])
        kind = next((kind for kind, numbers in layouts[slug].items() if number in numbers), 'result')
        label = ('放大图片：' if language == 'zh' else 'Enlarge image: ') + (unescape(alt.group(1)) if alt else str(number))
        size = f'--image-width:{width}px;--image-ratio:{width / height:.9f}'
        return f'<a class="article-image image-preview--{kind}" style="{size}" href="{src}" data-image-viewer aria-haspopup="dialog" aria-label="{escape(label, quote=True)}">{image}</a>'

    return re.sub(r'<img\b[^>]*>', preview, body)



def experiment_rows(total_label):
    data = json.loads((ROOT / 'assets/experiment-one/data.json').read_text())
    def cell(runs):
        marks = ''.join('<svg class="e1-mark" role="img" aria-label="' + ('Correct' if r['correct'] else 'Incorrect') + '" viewBox="0 0 16 16"><path d="' + ('M3 8l3 3 7-8' if r['correct'] else 'M4 4l8 8M12 4l-8 8') + '"/></svg>' for r in runs)
        mean = sum(r['output_tokens'] for r in runs) / len(runs)
        return f'<td><span class="e1-result"><span class="e1-marks">{marks}</span><span class="e1-token">/ {mean:,.0f} tokens</span></span></td>'
    rows = []
    for game in data['games']:
        rows.append('<tr><th scope="row">' + escape(game['label']) + '</th>' + ''.join(cell(sorted([r for r in game['runs'] if r['model'] == m], key=lambda r: r['repeat'])) for m in ('astra', 'deepseek')) + '</tr>')
    totals = []
    for model in ('astra', 'deepseek'):
        runs = [r for g in data['games'] for r in g['runs'] if r['model'] == model]
        correct = sum(r['correct'] for r in runs)
        accuracy = f'{correct / len(runs):.1%}'.replace('.0%', '%')
        mean = sum(r['output_tokens'] for r in runs) / len(runs)
        totals.append(f'<td><span class="e1-total"><b>{correct}/{len(runs)} · {accuracy}</b><span class="e1-token">/ {mean:,.0f} tokens</span></span></td>')
    return ''.join(rows) + '<tr><th scope="row">' + escape(total_label) + '</th>' + ''.join(totals) + '</tr>'


def render(c, language, page, post=None):
    prefix = '/zh/' if language == 'zh' else '/'
    suffix = {'home': '', 'blog': 'blog/', 'post': f'blog/{post["slug"] if post else "wsp-1"}/'}[page]
    url = prefix + suffix
    other = ('/' if language == 'zh' else '/zh/') + suffix
    post_title = post['title'] if post else c['post_title']
    title = c['name'] if page == 'home' else (post_title + ' — Apogee' if page == 'post' else 'Blog — Apogee')
    description = post['teaser'] if post else c['description']
    alternates = f'<link rel="alternate" hreflang="en" href="{BASE}/{suffix}">\n<link rel="alternate" hreflang="zh-CN" href="{BASE}/zh/{suffix}">\n<link rel="alternate" hreflang="x-default" href="{BASE}/{suffix}">'
    if page == 'home':
        body = f'''<h1>{escape(c['name'])}</h1>
        <p>{escape(c['description'])}</p>
        <!--
        <div class="hero-subtitle">{escape(c['subtitle'])}</div>
        {''.join('<p>' + escape(p) + '</p>' for p in c['bio'])}
        -->
        <div class="quick-links"><a href="https://github.com/apogeeio">GitHub</a><span class="divider" aria-hidden="true">|</span><a href="{prefix}blog/">Blog</a></div>'''
    elif page == 'blog':
        extra_cards = ''.join(
            f'<li class="blog-card"><div class="blog-figure"><img src="{escape(p["cover"], quote=True)}" width="260" height="180" alt=""></div>'
            f'<div class="blog-copy"><p class="blog-meta">{escape(p["date"])}</p>'
            f'<h2 class="blog-title"><a href="{prefix}blog/{escape(p["slug"])}/">{escape(p["title"])}</a></h2>'
            f'<p class="blog-teaser">{escape(p["teaser"])}</p></div></li>'
            for p in c.get('posts', [])
        )
        body = f'''<h1>Blog</h1>
        <ul class="blog-list">{extra_cards}<li class="blog-card">
        <div class="blog-figure"><img src="/assets/experiment-one/prompt-overview.png" width="260" height="180" alt=""></div>
        <div class="blog-copy"><p class="blog-meta">{escape(c['post_meta'])}</p>
        <h2 class="blog-title"><a href="{prefix}blog/wsp-1/">{escape(c['post_title'])}</a></h2>
        <p class="blog-teaser">{escape(c['post_teaser'])}</p></div></li></ul>
        '''
    else:
        article = dict(c['article'])
        if post:
            article.update(kicker=post['kicker'], date=post['date'])
            article_body = (ROOT / 'content' / post['body']).read_text()
            article_body = article_images(article_body, post['slug'], language)
        else:
            article_body = Template((ROOT / f'content/breakout-{language}.html').read_text()).substitute(experiment_rows=experiment_rows(c['article']['total_label']))
        body = Template((ROOT / 'content/article.html').read_text().split('<!-- Article template', 1)[0]).substitute(
            {key: escape(value) for key, value in article.items()},
            title=escape(post['heading'] if post else c['post_title'].removeprefix('WSP-1: ')), prefix=prefix, reading_label=('阅读' if language == 'zh' else 'Views'), experiment_rows=experiment_rows(c['article']['total_label']),
            article_body=article_body)
    main_content = body if page == 'post' else f'<article class="page {page}">{body}</article>'
    article_styles = f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&amp;family=Source+Sans+3:wght@300;400;600;700&amp;display=swap"><link rel="stylesheet" href="/assets/article.css?v={hashlib.sha256((ROOT / "assets/article.css").read_bytes()).hexdigest()[:12]}"><link rel="stylesheet" href="/assets/experiment-one.css?v={hashlib.sha256((ROOT / "assets/experiment-one.css").read_bytes()).hexdigest()[:12]}"><script src="/assets/experiment-one.js" defer></script>' if page == 'post' else ''
    if post and post['slug'] in ('blindtest', 'pixelbench'):
        article_styles += f'<script src="/assets/image-viewer.js?v={hashlib.sha256((ROOT / "assets/image-viewer.js").read_bytes()).hexdigest()[:12]}" defer></script>'
    current_home = ' aria-current="page"' if page == 'home' else ''
    current_blog = ' aria-current="page"' if page != 'home' else ''
    return url, f'''<!doctype html>
<html lang="{c['lang']}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title><meta name="description" content="{escape(description, quote=True)}">
<link rel="canonical" href="{BASE}{url}">
{alternates}
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/assets/style.css?v={hashlib.sha256((ROOT / "assets/style.css").read_bytes()).hexdigest()[:12]}"><script src="/assets/site.js" defer></script>
{article_styles}
<script async src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
</head>
<body class="{'article-page' if page == 'post' else 'site-page'}">
<a class="skip-link" href="#main">{escape(c['skip'])}</a>
<header class="masthead"><div class="masthead-inner">
<nav aria-label="{c['home']} / Blog"><a class="brand" href="{prefix}">Apogee</a><a href="{prefix}"{current_home}>{c['home']}</a><a href="{prefix}blog/"{current_blog}>Blog</a></nav>
<details class="language"><summary aria-label="{c['language']}" title="{c['language']}">{GLOBE}</summary><div class="language-menu"><a href="{other}" lang="{c['other_lang']}" hreflang="{c['other_lang']}">{c['other_language']}</a></div></details>
</div></header>
<main id="main">{main_content}</main>
<footer class="site-footer"><div class="footer-inner"><div class="footer-follow"><a href="https://github.com/apogeeio">GITHUB</a></div><p class="copyright">© 2026 Apogee. {c['rights']}</p><div class="traffic"><span id="busuanzi_container_site_pv" style="display:none">{'总访问量' if language == 'zh' else 'Total visits'} <span id="busuanzi_value_site_pv"></span></span><span id="busuanzi_container_site_uv" style="display:none">{'访客数' if language == 'zh' else 'Visitors'} <span id="busuanzi_value_site_uv"></span></span></div></div></footer>
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
        for post in content.get('posts', []):
            url, html = render(content, lang, 'post', post)
            target = OUT / url.lstrip('/') / 'index.html'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(html, encoding='utf-8')
            urls.append(BASE + url)
    for prefix in ('', 'zh/'):
        legacy = OUT / prefix / 'blog/first-post/index.html'
        legacy.parent.mkdir(parents=True, exist_ok=True)
        target = '/' + prefix + 'blog/wsp-1/'
        legacy.write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={target}"><link rel="canonical" href="{BASE}{target}"><a href="{target}">WSP-1</a>')
    (OUT / '.nojekyll').touch()
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml\n')
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{u}</loc></url>' for u in urls) + '</urlset>')
    print(f'Built {len(urls)} pages in _site/')


if __name__ == '__main__':
    main()
