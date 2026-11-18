import { assetUrl } from './catalog.js';
import { youtubeUrls } from './media.js';

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
  let videos = [];
  let activeTab = 'photos';
  let mediaHeading;
  let tabButtons = [];
  let videoPanel;
  let videoGrid;
  let videoViewer;
  let currentVideoIndex = 0;
  let currentIndex = 0;
  let grid = null;
  let viewer = null;
  let viewerImage = null;
  let filmstrip = null;
  let filmstripButtons = [];
  let gridScrollPosition = 0;
  let gridSize = 'medium';
  let viewMode = 'grid';
  let swipeStart = null;

  function wrappedIndex(index) {
    return (index + images.length) % images.length;
  }

  function setMode(mode) {
    viewMode = mode;
    const isViewer = mode === 'viewer';
    dialog.dataset.view = mode;
    grid.hidden = isViewer || activeTab !== 'photos';
    viewer.hidden = !isViewer;
    mediaHeading.hidden = isViewer;
    videoPanel.hidden = activeTab !== 'videos';
    videoGrid.hidden = mode === 'video';
    videoViewer.hidden = mode !== 'video';
    backButton.hidden = mode === 'grid';
    backButton.textContent = activeTab === 'videos' ? '← Tutti i video' : '← Tutte le foto';
    previousButton.hidden = !isViewer || images.length < 2;
    nextButton.hidden = !isViewer || images.length < 2;
    gridControls.hidden = mode !== 'grid' || activeTab !== 'photos';
    counter.hidden = !isViewer;
    content.classList.toggle('is-viewer', isViewer);
  }

  function stopVideo() {
    videoViewer?.replaceChildren();
  }

  function selectTab(tab, { focus = false } = {}) {
    stopVideo();
    activeTab = tab;
    tabButtons.forEach((button) => {
      const selected = button.dataset.mediaTab === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
    setMode('grid');
    content.scrollTop = 0;
  }

  function createMediaHeading(name) {
    const heading = document.createElement('div');
    heading.className = 'lightbox-media-heading';
    const title = document.createElement('h2');
    title.textContent = name;
    const tabs = document.createElement('div');
    tabs.className = 'lightbox-media-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Tipo di contenuto');
    tabButtons = [];
    for (const [id, label, count] of [['photos', 'Foto', images.length], ['videos', 'Video', videos.length]]) {
      if (!count) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `media-tab-${id}`;
      button.dataset.mediaTab = id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `media-panel-${id}`);
      button.textContent = `${label} (${count})`;
      button.addEventListener('click', () => selectTab(id));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = tabButtons.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabButtons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length;
        selectTab(tabButtons[next].dataset.mediaTab, { focus: true });
      });
      tabButtons.push(button);
      tabs.append(button);
    }
    heading.append(title, tabs);
    return heading;
  }

  function createVideoPanel() {
    const panel = document.createElement('section');
    panel.id = 'media-panel-videos';
    panel.className = 'lightbox-video-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'media-tab-videos');
    videoGrid = document.createElement('div');
    videoGrid.className = 'lightbox-video-grid';
    videos.forEach((video, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lightbox-video-card';
      button.setAttribute('aria-label', `Guarda ${video.title}`);
      const cover = document.createElement('span');
      cover.className = 'lightbox-video-cover';
      const thumbnail = document.createElement('img');
      thumbnail.src = youtubeUrls(video).thumbnail;
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      thumbnail.addEventListener('error', () => { thumbnail.hidden = true; });
      const play = document.createElement('span');
      play.className = 'lightbox-video-play';
      play.textContent = '▶';
      play.setAttribute('aria-hidden', 'true');
      const title = document.createElement('strong');
      title.textContent = video.title;
      const caption = document.createElement('span');
      caption.className = 'lightbox-video-caption';
      caption.textContent = `Gameplay ${index + 1} · YouTube`;
      cover.append(thumbnail, play);
      button.append(cover, caption, title);
      button.addEventListener('click', () => showVideo(index));
      videoGrid.append(button);
    });
    videoViewer = document.createElement('div');
    videoViewer.className = 'lightbox-video-viewer';
    panel.append(videoGrid, videoViewer);
    return panel;
  }

  function showVideo(index) {
    stopVideo();
    currentVideoIndex = index;
    const video = videos[index];
    const urls = youtubeUrls(video);
    const iframe = document.createElement('iframe');
    iframe.className = 'lightbox-video-player';
    iframe.title = video.title;
    iframe.src = urls.embed;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    const title = document.createElement('h3');
    title.textContent = video.title;
    const link = document.createElement('a');
    link.href = urls.watch;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Apri su YouTube ↗';
    const caption = document.createElement('p');
    caption.className = 'lightbox-video-help';
    caption.append('Se il video non è riproducibile qui, ', link);
    videoViewer.append(iframe, title, caption);
    setMode('video');
    content.scrollTop = 0;
    backButton.focus();
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
    result.id = 'media-panel-photos';
    result.setAttribute('role', 'tabpanel');
    result.setAttribute('aria-labelledby', 'media-tab-photos');
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
    viewerImage.addEventListener('pointerdown', (event) => {
      swipeStart = event.isPrimary && event.pointerType !== 'mouse'
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    });
    viewerImage.addEventListener('pointercancel', () => { swipeStart = null; });
    viewerImage.addEventListener('pointerup', (event) => {
      const start = swipeStart;
      swipeStart = null;
      if (!start || event.pointerId !== start.id || images.length < 2) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.4) navigate(dx < 0 ? 1 : -1);
    });
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
    const wasVideo = viewMode === 'video';
    stopVideo();
    setMode('grid');
    requestAnimationFrame(() => {
      if (!dialog.open) return;
      content.scrollTop = wasVideo ? 0 : gridScrollPosition;
      const buttons = wasVideo ? videoGrid.children : grid.children;
      buttons[wasVideo ? currentVideoIndex : currentIndex]?.focus({ preventScroll: true });
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
      if (!dialog.open || viewMode !== 'viewer') return;
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
    backButton.focus();
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
  dialog.addEventListener('close', () => {
    stopVideo();
    document.documentElement.classList.remove('lightbox-open');
  });
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
    open(game) {
      stopVideo();
      images = game.screenshots ?? [];
      videos = game.videos ?? [];
      if (!images.length && !videos.length) return;
      dialog.setAttribute('aria-label', `Galleria di ${game.name}`);
      currentIndex = 0;
      gridScrollPosition = 0;
      grid = createGrid();
      viewer = createViewer();
      videoPanel = createVideoPanel();
      mediaHeading = createMediaHeading(game.name);
      content.replaceChildren(mediaHeading, grid, viewer, videoPanel);
      setGridSize(gridSize);
      selectTab(images.length ? 'photos' : 'videos');
      content.scrollTop = 0;
      document.documentElement.classList.add('lightbox-open');
      dialog.showModal();
    },
  };
}
