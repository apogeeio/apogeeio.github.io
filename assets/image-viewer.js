import PhotoSwipeLightbox from './vendor/photoswipe/5.4.4/photoswipe-lightbox.esm.js';

const zh = document.documentElement.lang.startsWith('zh');
const lightbox = new PhotoSwipeLightbox({
  gallery: '.blindtest-body, .pixelbench-body',
  children: 'a[data-image-viewer]',
  pswpModule: () => import('./vendor/photoswipe/5.4.4/photoswipe.esm.js'),
  wheelToZoom: true,
  initialZoomLevel: 'fit',
  maxZoomLevel: zoomLevel => Math.max(1, zoomLevel.fit * 4),
  allowPanToNext: false,
  pinchToClose: false,
  loop: false,
  ...(zh ? {
    closeTitle: '关闭',
    zoomTitle: '放大 / 缩小',
    arrowPrevTitle: '上一张',
    arrowNextTitle: '下一张',
    errorMsg: '图片加载失败',
  } : {}),
});
lightbox.init();
