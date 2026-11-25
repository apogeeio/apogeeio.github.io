import PhotoSwipeLightbox from './vendor/photoswipe/5.4.4/photoswipe-lightbox.esm.js';

export function initImageViewer(article) {
  const zh = document.documentElement.lang.startsWith('zh');
  const images = article.querySelectorAll('[data-figure-title], figure > img, figure > a[data-image-viewer] > img');

  for (const image of images) {
    let figure = image.closest('figure');
    if (!figure) {
      const paragraph = image.parentElement;
      if (!paragraph.matches('p') || paragraph.childNodes.length !== 1) continue;
      figure = document.createElement('figure');
      paragraph.replaceWith(figure);
      figure.append(image);
    }
    figure.classList.add('article-figure');

    const title = image.dataset.figureTitle || image.alt;
    if (title && !figure.querySelector(':scope > :is(h4, .fig-title)')) {
      const heading = document.createElement('h4');
      heading.className = 'fig-title';
      heading.textContent = title;
      figure.prepend(heading);
    }

    if (image.dataset.figureTitle && image.alt && !figure.querySelector('figcaption')) {
      const caption = document.createElement('figcaption');
      caption.textContent = image.alt;
      figure.append(caption);
    }

    if (!image.closest('a')) {
      const width = image.dataset.pswpWidth || image.getAttribute('width') || image.naturalWidth;
      const height = image.dataset.pswpHeight || image.getAttribute('height') || image.naturalHeight;
      if (!width || !height) continue;
      const link = document.createElement('a');
      link.href = image.currentSrc || image.src;
      link.dataset.imageViewer = '';
      link.dataset.pswpWidth = width;
      link.dataset.pswpHeight = height;
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-label', zh ? `放大图片：${title}` : `Enlarge image: ${title}`);
      image.replaceWith(link);
      link.append(image);
    }
  }

  if (!article.querySelector('a[data-image-viewer]')) return;

  const lightbox = new PhotoSwipeLightbox({
    gallery: article,
    children: 'a[data-image-viewer]',
    pswpModule: () => import('./vendor/photoswipe/5.4.4/photoswipe.esm.js'),
    wheelToZoom: true,
    initialZoomLevel: 'fit',
    maxZoomLevel: zoomLevel => Math.max(1, zoomLevel.fit * 4),
    allowPanToNext: false,
    pinchToClose: false,
    loop: false,
    paddingFn: ({ x, y }) => ({
      top: 52,
      right: x < 600 ? 10 : 28,
      bottom: Math.min(120, y * 0.19),
      left: x < 600 ? 10 : 28,
    }),
    ...(zh ? {
      closeTitle: '关闭',
      zoomTitle: '放大 / 缩小',
      arrowPrevTitle: '上一张',
      arrowNextTitle: '下一张',
      errorMsg: '图片加载失败',
    } : {}),
  });

  lightbox.on('uiRegister', () => {
    const { pswp } = lightbox;
    pswp.ui.registerElement({
      name: 'caption',
      appendTo: 'root',
      onInit: (caption, gallery) => {
        caption.setAttribute('aria-live', 'polite');
        gallery.on('change', () => {
          const figure = gallery.currSlide.data.element?.closest('figure');
          const description = figure?.querySelector('figcaption');
          if (description) {
            caption.replaceChildren(...Array.from(description.childNodes, node => node.cloneNode(true)));
          } else {
            caption.textContent = figure?.querySelector('.fig-title')?.textContent || '';
          }
        });
      },
    });
  });

  lightbox.init();
}
