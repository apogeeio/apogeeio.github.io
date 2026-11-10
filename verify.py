"""Check the published routes and visible markup before deployment."""
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent / '_site'


class Page(HTMLParser):
    def __init__(self, home=False):
        super().__init__()
        self.home = home

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if self.home:
            assert tag != 'img', 'No homepage placeholder images'
        for name in ('href', 'src'):
            url = attrs.get(name, '')
            if url.startswith('/'):
                target = ROOT / urlsplit(url).path.lstrip('/')
                assert target.exists(), f'Missing local target: {url}'

    def handle_data(self, data):
        if self.home:
            assert '[' not in data and ']' not in data, 'Visible homepage placeholder text'


routes = ['index.html', 'zh/index.html', 'blog/index.html', 'zh/blog/index.html', 'blog/wsp-1/index.html', 'zh/blog/wsp-1/index.html']
for language in ('en', 'zh'):
    prefix = 'zh/' if language == 'zh' else ''
    metadata = json.loads((ROOT.parent / 'content' / f'{language}.json').read_text())
    routes.extend(f'{prefix}blog/{post["slug"]}/index.html' for post in metadata.get('posts', []))
for route in routes:
    html = (ROOT / route).read_text()
    assert '<main id="main">' in html, f'Wrong page content: {route}'
    Page(home=route in ('index.html', 'zh/index.html')).feed(html)
assert not (ROOT / 'blog/placeholder').exists(), 'Unpublished article was generated'
for slug, figures, tables, samples in (('pixelbench', 10, 2, 2), ('blindtest', 27, 0, 0)):
    for prefix, other in (('', 'zh/'), ('zh/', '')):
        article = (ROOT / f'{prefix}blog/{slug}/index.html').read_text()
        assert article.count('<figure>') == figures, f'Missing {slug} figures: {prefix}'
        assert article.count('<table') == tables, f'Missing {slug} tables: {prefix}'
        assert article.count('<pre>') == samples, f'Missing {slug} sample blocks: {prefix}'
        assert article.count('data-image-viewer') == figures, f'Missing image preview links: {slug} {prefix}'
        assert '/assets/image-viewer.js?v=' in article, f'Missing image viewer: {slug} {prefix}'
        assert f'/{prefix}blog/{slug}/' in (ROOT / f'{prefix}blog/index.html').read_text(), 'Missing Blog entry'
        assert f'/{prefix}blog/{slug}/' in (ROOT / 'sitemap.xml').read_text(), 'Missing sitemap entry'
        assert f'<a href="/{other}blog/{slug}/" lang=' in article, 'Language switch must link to the matching article'
        assert f'hreflang="en" href="https://apogeeio.github.io/blog/{slug}/"' in article, 'Wrong English alternate'
        assert f'hreflang="zh-CN" href="https://apogeeio.github.io/zh/blog/{slug}/"' in article, 'Wrong Chinese alternate'
        assert '/Users/' not in article and '![[attachments/' not in article, 'Unresolved local source reference'
print(f'Verified {len(routes)} routes, local links, bilingual articles, language switches, figures, tables, and sample blocks.')
