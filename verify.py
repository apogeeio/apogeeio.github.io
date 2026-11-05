"""Check the published routes and visible markup before deployment."""
from html.parser import HTMLParser
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


for route in ('index.html', 'zh/index.html', 'blog/index.html', 'zh/blog/index.html', 'blog/first-post/index.html', 'zh/blog/first-post/index.html'):
    html = (ROOT / route).read_text()
    assert '<main id="main">' in html, f'Wrong page content: {route}'
    Page(home=route in ('index.html', 'zh/index.html')).feed(html)
assert not (ROOT / 'blog/placeholder').exists(), 'Unpublished article was generated'
print('Verified six routes, local links, and hidden homepage placeholders.')
