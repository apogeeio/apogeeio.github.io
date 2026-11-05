"""Verify that all live language routes match the deployed artifact."""
import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent / '_site'
manifest = json.loads((ROOT / 'version.json').read_text())
base = 'https://apogeeio.github.io'


def fetch(path):
    request = urllib.request.Request(base + path, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read()


for attempt in range(12):
    try:
        remote = json.loads(fetch(f'/version.json?t={time.time_ns()}'))
        assert remote == manifest, 'Release manifest has not propagated'
        for route, expected in manifest['pages'].items():
            data = fetch(f'{route}?v={manifest["version"]}&check={time.time_ns()}')
            assert hashlib.sha256(data).hexdigest() == expected, f'Wrong release: {route}'
        for asset in (ROOT / 'assets').glob(f'*.{manifest["version"]}.*'):
            assert fetch('/assets/' + asset.name) == asset.read_bytes(), f'Wrong asset: {asset.name}'
        print(f'Live release {manifest["version"]}: all four pages and versioned assets verified.')
        break
    except Exception as exc:
        if attempt == 11:
            raise
        print(f'Waiting for Pages propagation: {exc}', flush=True)
        time.sleep(10)
