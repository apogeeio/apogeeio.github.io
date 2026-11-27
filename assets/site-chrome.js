(function () {
  var scriptUrl = document.currentScript.src;
  var siteRoot = new URL('../', scriptUrl);
  var knownBilingualSlugs = new Set(['wsp-1', 'pixelbench', 'blindtest', 'positional-encoding', 'seeing-or-knowing']);

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

    // Article pageview counter (Busuanzi)
    var isArticlePage = !document.body.classList.contains('page-home') && !document.body.classList.contains('page-blog');
    if (isArticlePage && !document.getElementById('busuanzi_container_page_pv')) {
      var titleHeader = document.getElementById('title-block-header');
      if (titleHeader) {
        var readingRow = document.createElement('div');
        readingRow.className = 'article-reading-row';
        var readingLabel = isZh ? '阅读' : 'Views';
        readingRow.innerHTML =
          '<span class="reading article-reading-count" id="busuanzi_container_page_pv" style="display:none">' +
          '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
          '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>' +
          readingLabel + ' <span id="busuanzi_value_page_pv"></span></span>';
        titleHeader.appendChild(readingRow);
      }
    }

    // Sticky left-aligned stacked footer + site-wide visitor counters
    var navFooter = document.querySelector('.nav-footer');
    if (navFooter) {
      var copyText = isZh
        ? '© 2026 Apogee. 保留所有权利。'
        : '© 2026 Apogee. All rights reserved.';
      var pvLabel = isZh ? '总访问量' : 'Total visits';
      var uvLabel = isZh ? '访客数' : 'Visitors';

      navFooter.innerHTML =
        '<div class="site-footer-stack">' +
        '  <div class="site-footer-github">' +
        '    <a href="https://github.com/apogeeio" target="_blank" rel="noopener">GITHUB</a>' +
        '  </div>' +
        '  <p class="site-footer-copy">' + copyText + '</p>' +
        '  <div class="traffic site-footer-traffic">' +
        '    <span id="busuanzi_container_site_pv" style="display:none">' + pvLabel + ' <span id="busuanzi_value_site_pv"></span></span>' +
        '    <span id="busuanzi_container_site_uv" style="display:none">' + uvLabel + ' <span id="busuanzi_value_site_uv"></span></span>' +
        '  </div>' +
        '</div>';
    }

    // Load Busuanzi after counter containers exist in DOM
    if (!document.querySelector('script[data-busuanzi]')) {
      var bsz = document.createElement('script');
      bsz.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
      bsz.async = true;
      bsz.setAttribute('data-busuanzi', 'true');
      document.head.appendChild(bsz);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiteChrome);
  } else {
    initSiteChrome();
  }
})();
