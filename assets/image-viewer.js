(() => {
  const links = document.querySelectorAll('[data-image-viewer]');
  if (!links.length) return;

  const zh = document.documentElement.lang.startsWith('zh');
  const labels = zh
    ? { preview: '图片预览', original: '原始尺寸', fit: '适应屏幕', open: '打开原图', close: '关闭图片预览' }
    : { preview: 'Image preview', original: 'Actual size', fit: 'Fit to screen', open: 'Open original', close: 'Close image preview' };
  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-label', labels.preview);

  const toolbar = document.createElement('div');
  toolbar.className = 'image-viewer__toolbar';
  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.textContent = labels.original;
  zoom.setAttribute('aria-pressed', 'false');
  const original = document.createElement('a');
  original.textContent = labels.open;
  original.target = '_blank';
  original.rel = 'noopener';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'image-viewer__close';
  close.textContent = '×';
  close.setAttribute('aria-label', labels.close);
  close.autofocus = true;
  toolbar.append(zoom, original, close);

  const viewport = document.createElement('div');
  viewport.className = 'image-viewer__viewport';
  const image = document.createElement('img');
  image.className = 'image-viewer__image';
  image.draggable = false;
  viewport.append(image);
  dialog.append(toolbar, viewport);
  document.body.append(dialog);

  let trigger;
  let drag;
  let dragged = false;

  function setZoom(enabled) {
    dialog.classList.toggle('is-zoomed', enabled);
    zoom.textContent = enabled ? labels.fit : labels.original;
    zoom.setAttribute('aria-pressed', String(enabled));
    viewport.scrollTop = viewport.scrollLeft = 0;
  }

  links.forEach(link => link.addEventListener('click', event => {
    // Modified clicks keep the link's native open-in-new-tab behavior.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    trigger = link;
    image.alt = link.querySelector('img').alt;
    image.src = original.href = link.href;
    setZoom(false);
    dialog.showModal();
    document.documentElement.classList.add('image-viewer-open');
  }));

  function finishClose() {
    if (dialog.open) return;
    document.documentElement.classList.remove('image-viewer-open');
    dialog.classList.remove('is-dragging');
    drag = undefined;
    trigger?.focus({ preventScroll: true });
  }
  function closeViewer() {
    dialog.close();
    finishClose();
  }
  close.addEventListener('click', closeViewer);
  dialog.addEventListener('close', finishClose);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeViewer();
  });
  zoom.addEventListener('click', () => setZoom(!dialog.classList.contains('is-zoomed')));
  dialog.addEventListener('click', event => {
    if (!dragged && (event.target === viewport || event.target === dialog)) closeViewer();
  });
  image.addEventListener('click', () => {
    if (!dragged) setZoom(!dialog.classList.contains('is-zoomed'));
    dragged = false;
  });

  viewport.addEventListener('pointerdown', event => {
    dragged = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !dialog.classList.contains('is-zoomed') || event.target !== image) return;
    drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      dragged = true;
      dialog.classList.add('is-dragging');
      viewport.setPointerCapture(event.pointerId);
    }
    viewport.scrollLeft = drag.left - dx;
    viewport.scrollTop = drag.top - dy;
  });
  function endDrag(event) {
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    drag = undefined;
    dialog.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
})();
