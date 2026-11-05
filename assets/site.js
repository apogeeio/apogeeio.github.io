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
