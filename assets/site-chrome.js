(function () {
  var scriptUrl = document.currentScript.src;

  function initSiteChrome() {
    var offsetMeta = document.querySelector('meta[name="quarto:offset"]');
    var offset = offsetMeta ? offsetMeta.getAttribute('content') || '' : '';
    var siteRoot = new URL(offset || '/', window.location.href).pathname;
    var segments = window.location.pathname.slice(siteRoot.length).split('/');
    var htmlLang = document.documentElement.lang.toLowerCase().split('-')[0];
    var isZhPath = segments[0] === 'zh';
    var isZh = htmlLang ? htmlLang === 'zh' : isZhPath;
    var section = segments[isZhPath ? 1 : 0];
    var isBlogSection = section === 'blog' || section === 'posts';

    // Left navbar links: strictly 2 language-specific links
    var leftLinks = document.querySelectorAll('.navbar-nav.me-auto .nav-link');
    if (leftLinks.length >= 2) {
      var homeLink = leftLinks[0];
      var blogLink = leftLinks[1];

      var homeSpan = homeLink.querySelector('.menu-text') || homeLink;
      var blogSpan = blogLink.querySelector('.menu-text') || blogLink;

      homeSpan.textContent = isZh ? '主页' : 'Home';
      homeLink.setAttribute('href', offset + (isZh ? 'zh/index.html' : 'index.html'));

      blogSpan.textContent = 'Blog';
      blogLink.setAttribute('href', offset + (isZh ? 'zh/blog/index.html' : 'blog/index.html'));

      homeLink.classList.toggle('active', !isBlogSection);
      blogLink.classList.toggle('active', isBlogSection);

      if (!isBlogSection) {
        homeLink.setAttribute('aria-current', 'page');
        blogLink.removeAttribute('aria-current');
      } else {
        blogLink.setAttribute('aria-current', 'page');
        homeLink.removeAttribute('aria-current');
      }
    }

    // Globe language switcher targets
    var langItems = document.querySelectorAll('.navbar-nav.ms-auto .dropdown-menu .dropdown-item');
    if (langItems.length >= 2) {
      var currentLanguage = langItems[isZh ? 1 : 0];
      var otherLanguage = langItems[isZh ? 0 : 1];
      var bilingualSlugs = { 'wsp-1': true, 'pixelbench': true, 'blindtest': true, 'positional-encoding': true };
      var slugCandidate = segments[isZhPath ? 2 : 1] || '';
      var targetPage = 'index.html';
      if (isBlogSection) {
        if (slugCandidate && slugCandidate !== 'index.html' && bilingualSlugs[slugCandidate]) {
          targetPage = 'blog/' + slugCandidate + '/index.html';
        } else {
          targetPage = 'blog/index.html';
        }
      }
      otherLanguage.setAttribute('href', offset + (isZh ? '' : 'zh/') + targetPage);
      currentLanguage.setAttribute('href', window.location.href);
      currentLanguage.setAttribute('aria-current', 'page');
      currentLanguage.addEventListener('click', function (event) {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
        }
      });
    }

    var article = document.querySelector('main#quarto-document-content');
    if (article && article.querySelector('img:is([data-figure-title], figure img)')) {
      import(new URL('image-viewer.js?v=2', scriptUrl)).then(function (viewer) {
        viewer.initImageViewer(article);
      });
    }

    if (article && article.querySelector('.pe-viz')) {
      import(new URL('pe-interactive.js', scriptUrl)).then(function (demos) {
        demos.mountDemos(article);
      });
    }

    var colorSwitch = document.querySelector('.quarto-color-scheme-toggle');
    if (colorSwitch && isZh) {
      colorSwitch.setAttribute('aria-label', '切换深色模式');
      colorSwitch.title = '切换深色模式';
    }

    // Sticky left-aligned stacked footer
    var navFooter = document.querySelector('.nav-footer');
    if (navFooter) {
      var copyText = isZh
        ? '© 2026 Apogee. 保留所有权利。'
        : '© 2026 Apogee. All rights reserved.';

      navFooter.innerHTML =
        '<div class="site-footer-stack">' +
        '  <div class="site-footer-github">' +
        '    <a href="https://github.com/apogeeio" target="_blank" rel="noopener">GITHUB</a>' +
        '  </div>' +
        '  <p class="site-footer-copy">' + copyText + '</p>' +
        '</div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteChrome);
  } else {
    initSiteChrome();
  }
})();
