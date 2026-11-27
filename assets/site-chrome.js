(function () {
  var scriptUrl = document.currentScript.src;
  var siteRoot = new URL('../', scriptUrl);
  var knownBilingualSlugs = new Set(['wsp-1', 'pixelbench', 'blindtest', 'positional-encoding']);

  function initSiteChrome() {
    var segments = window.location.pathname.slice(siteRoot.pathname.length).split('/');
    var htmlLang = document.documentElement.lang.toLowerCase().split('-')[0];
    var isZhPath = segments[0] === 'zh';
    var isZh = htmlLang ? htmlLang === 'zh' : isZhPath;
    var section = segments[isZhPath ? 1 : 0];
    var isBlogSection = section === 'blog' || section === 'posts';
    var currentPrefix = isZh ? 'zh/' : '';
    var counterpartPrefix = isZh ? '' : 'zh/';

    // Left navbar links: strictly 2 language-specific links
    var leftLinks = document.querySelectorAll('.navbar-nav.me-auto .nav-link');
    if (leftLinks.length >= 2) {
      var homeLink = leftLinks[0];
      var blogLink = leftLinks[1];

      var homeSpan = homeLink.querySelector('.menu-text') || homeLink;
      var blogSpan = blogLink.querySelector('.menu-text') || blogLink;

      homeSpan.textContent = isZh ? '主页' : 'Home';
      homeLink.href = new URL(currentPrefix + 'index.html', siteRoot);

      blogSpan.textContent = 'Blog';
      blogLink.href = new URL(currentPrefix + 'blog/index.html', siteRoot);

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

    var langLink = document.querySelector('.navbar-nav.ms-auto .nav-link');
    if (langLink) {
      var fallbackPage = isBlogSection ? 'blog/index.html' : 'index.html';
      var fallbackUrl = new URL(counterpartPrefix + fallbackPage, siteRoot);
      var langLabel = isZh ? 'EN' : '中文';
      var langTitle = isZh ? 'Switch to English' : '切换到中文';
      var langSpan = langLink.querySelector('.menu-text') || langLink;
      langSpan.textContent = langLabel;
      langLink.href = fallbackUrl;
      langLink.setAttribute('aria-label', langTitle);
      langLink.title = langTitle;
      langLink.lang = isZh ? 'en' : 'zh';
      langLink.classList.remove('active');
      langLink.removeAttribute('aria-current');

      var slug = segments[isZhPath ? 2 : 1];
      if (isBlogSection && slug && slug !== 'index.html') {
        var counterpartUrl = new URL(counterpartPrefix + 'blog/' + slug + '/index.html', siteRoot);
        if (knownBilingualSlugs.has(slug)) {
          langLink.href = counterpartUrl;
        }
        fetch(counterpartUrl, { method: 'HEAD' }).then(function (response) {
          langLink.href = response.ok && !response.redirected ? counterpartUrl : fallbackUrl;
        }).catch(function () {
          // Keep the initial destination when the network is unavailable.
        });
      }
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

  initSiteChrome();
})();
