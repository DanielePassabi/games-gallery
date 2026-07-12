import { assetUrl } from './catalog.js';

export function createLightbox(dialog) {
  const content = dialog.querySelector('.lightbox-content');
  const closeButton = dialog.querySelector('.lightbox-close');
  const backButton = dialog.querySelector('.lightbox-back');
  const previousButton = dialog.querySelector('.lightbox-prev');
  const nextButton = dialog.querySelector('.lightbox-next');
  const gridControls = dialog.querySelector('.lightbox-grid-controls');
  const sizeButtons = [...dialog.querySelectorAll('[data-grid-size]')];
  const counter = dialog.querySelector('.lightbox-counter');

  let images = [];
  let currentIndex = 0;
  let grid = null;
  let viewer = null;
  let viewerImage = null;
  let filmstrip = null;
  let filmstripButtons = [];
  let gridScrollPosition = 0;
  let gridSize = 'medium';
  let viewMode = 'grid';

  function wrappedIndex(index) {
    return (index + images.length) % images.length;
  }

  function setMode(mode) {
    viewMode = mode;
    const isViewer = mode === 'viewer';
    dialog.dataset.view = mode;
    grid.hidden = isViewer;
    viewer.hidden = !isViewer;
    backButton.hidden = !isViewer;
    previousButton.hidden = !isViewer || images.length < 2;
    nextButton.hidden = !isViewer || images.length < 2;
    gridControls.hidden = isViewer;
    counter.hidden = !isViewer;
    content.classList.toggle('is-viewer', isViewer);
  }

  function createThumbnailButton(image, index, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', `Apri screenshot ${index + 1}`);
    const thumbnail = document.createElement('img');
    thumbnail.src = assetUrl(image.thumbnail);
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    button.append(thumbnail);
    return button;
  }

  function createGrid() {
    const result = document.createElement('div');
    result.className = 'lightbox-grid';
    result.dataset.size = gridSize;
    images.forEach((image, index) => {
      const button = createThumbnailButton(image, index, 'lightbox-thumb');
      button.addEventListener('click', () => {
        gridScrollPosition = content.scrollTop;
        showImage(index);
      });
      result.append(button);
    });
    return result;
  }

  function createViewer() {
    const result = document.createElement('div');
    result.className = 'lightbox-viewer';
    viewerImage = document.createElement('img');
    viewerImage.className = 'lightbox-image';
    filmstrip = document.createElement('div');
    filmstrip.className = 'lightbox-filmstrip';
    filmstrip.setAttribute('aria-label', 'Seleziona uno screenshot');
    filmstripButtons = images.map((image, index) => {
      const button = createThumbnailButton(image, index, 'lightbox-filmstrip-item');
      button.addEventListener('click', () => showImage(index));
      filmstrip.append(button);
      return button;
    });
    result.append(viewerImage, filmstrip);
    return result;
  }

  function showGrid() {
    setMode('grid');
    requestAnimationFrame(() => {
      content.scrollTop = gridScrollPosition;
    });
  }

  function preloadImage(index) {
    if (images.length < 2) return;
    const preload = new Image();
    preload.src = assetUrl(images[wrappedIndex(index)].src);
  }

  function updateFilmstrip() {
    filmstripButtons.forEach((button, index) => {
      button.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
    });
    const active = filmstripButtons[currentIndex];
    requestAnimationFrame(() => {
      filmstrip.scrollTo({
        left: active.offsetLeft - (filmstrip.clientWidth - active.clientWidth) / 2,
        behavior: 'smooth',
      });
    });
  }

  function showImage(index) {
    currentIndex = wrappedIndex(index);
    viewerImage.src = assetUrl(images[currentIndex].src);
    viewerImage.alt = `Screenshot ${currentIndex + 1} di ${images.length}`;
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
    content.scrollTop = 0;
    setMode('viewer');
    updateFilmstrip();
    preloadImage(currentIndex - 1);
    preloadImage(currentIndex + 1);
  }

  function navigate(offset) {
    showImage(currentIndex + offset);
  }

  function setGridSize(size) {
    gridSize = size;
    if (grid) grid.dataset.size = size;
    sizeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.gridSize === size));
    });
  }

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.documentElement.classList.remove('lightbox-open'));
  backButton.addEventListener('click', showGrid);
  previousButton.addEventListener('click', () => navigate(-1));
  nextButton.addEventListener('click', () => navigate(1));
  sizeButtons.forEach((button) => button.addEventListener('click', () => setGridSize(button.dataset.gridSize)));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('keydown', (event) => {
    if (!dialog.open || viewMode !== 'viewer') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
    }
  });

  return {
    open(screenshots) {
      images = screenshots;
      currentIndex = 0;
      gridScrollPosition = 0;
      grid = createGrid();
      viewer = createViewer();
      content.replaceChildren(grid, viewer);
      setGridSize(gridSize);
      setMode('grid');
      content.scrollTop = 0;
      document.documentElement.classList.add('lightbox-open');
      dialog.showModal();
    },
  };
}
