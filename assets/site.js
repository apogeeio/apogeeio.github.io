document.addEventListener('click', (event) => {
  const menu = document.querySelector('.language[open]');
  if (menu && !menu.contains(event.target)) menu.removeAttribute('open');
});
document.addEventListener('keydown', (event) => {
  const menu = document.querySelector('.language[open]');
  if (menu && event.key === 'Escape') {
    menu.removeAttribute('open');
    menu.querySelector('summary').focus();
  }
});

const pageVersion = document.querySelector('meta[name="site-version"]')?.content;
let checkingVersion = false;
let lastVersionCheck = 0;
async function checkVersion() {
  if (!pageVersion || document.visibilityState === 'hidden' || checkingVersion || Date.now() - lastVersionCheck < 10000) return;
  checkingVersion = true;
  lastVersionCheck = Date.now();
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const { version } = await response.json();
    if (!/^[a-f0-9]{16}$/.test(version) || version === pageVersion) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('v') === version) return;
    url.searchParams.set('v', version);
    window.location.replace(url.href);
  } catch {
    // Keep the current page available when offline.
  } finally {
    checkingVersion = false;
  }
}
checkVersion();
window.addEventListener('pageshow', checkVersion);
document.addEventListener('visibilitychange', checkVersion);
window.setInterval(checkVersion, 60000);
