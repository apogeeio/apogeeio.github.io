"""Check the published routes and visible markup before deployment."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent / '_site'


class Page(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert tag != 'img', 'No visible placeholder images'
        for name in ('href', 'src'):
            url = attrs.get(name, '')
            if url.startswith('/'):
                target = ROOT / urlsplit(url).path.lstrip('/')
                assert target.exists(), f'Missing local target: {url}'

    def handle_data(self, data):
        assert '[' not in data and ']' not in data, 'Visible placeholder text'


for route in ('index.html', 'zh/index.html', 'blog/index.html', 'zh/blog/index.html'):
    html = (ROOT / route).read_text()
    assert '<main id="main">' in html, f'Wrong page content: {route}'
    Page().feed(html)
assert not (ROOT / 'blog/placeholder').exists(), 'Unpublished article was generated'
print('Verified four routes, local links, and hidden placeholders.')
