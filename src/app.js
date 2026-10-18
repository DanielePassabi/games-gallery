import './styles.css';
import { assetUrl, loadCatalog } from './catalog.js';
import { createStatistics } from './statistics.js';
import { createLightbox } from './lightbox.js';
import { createFilterPanel } from './filter-panel.js';
import { filterYears, summarize, summarizeYear } from './stats.js';
import { parseFilterState, parseStatisticsState, updateFilterUrl } from './url-state.js';

const statusLabels = {
  completed: 'Completato',
  unfinished: 'Non completato',
  multiplayer: 'Multiplayer',
};
const platformOrder = ['Desktop_PC', 'Laptop_PC', 'Steam_Deck', 'PS4', 'PS3', 'iPad'];
const platformLabels = {
  all: 'Tutte',
  Desktop_PC: 'Desktop PC',
  Laptop_PC: 'Laptop PC',
  Steam_Deck: 'Steam Deck',
  PS4: 'PS4',
  PS3: 'PS3',
  iPad: 'iPad',
};

const elements = {
  error: document.querySelector('#error'),
  gallery: document.querySelector('#gallery'),
  loading: document.querySelector('#loading'),
  platformOptions: document.querySelector('#platform-options'),
  platformPicker: document.querySelector('#platform-picker'),
  platformTrigger: document.querySelector('#platform-trigger'),
  platformTriggerIcon: document.querySelector('.platform-trigger-icon'),
  platformTriggerLabel: document.querySelector('.platform-trigger-label'),
  resultCount: document.querySelector('#result-count'),
  screenshots: document.querySelector('#screenshots-filter'),
  search: document.querySelector('#search'),
  summary: document.querySelector('#summary'),
  explore: document.querySelector('#explore-panel'),
  statistics: document.querySelector('#statistics-panel'),
  sectionButtons: document.querySelectorAll('[data-section]'),
  viewButtons: document.querySelectorAll('[data-view]'),
  year: document.querySelector('#year-filter'),
};
const statistics = createStatistics(elements.statistics, {
  onChange: (patch, options) => commitFilters(patch, options),
  onGameSelect: (game) => commitFilters({
    section: 'explore', query: game.name, year: 'all',
    platform: 'all', status: 'all', screenshots: false,
  }),
});
const lightbox = createLightbox(document.querySelector('#lightbox'));
const state = {
  catalog: null,
  platform: 'all',
  query: '',
  screenshots: false,
  status: 'all',
  view: 'grid',
  year: 'all',
  section: 'explore',
  statisticsTab: 'trend',
  statisticsYears: null,
  statisticsBins: 40,
};
let lastGalleryState;
const filterPanel = createFilterPanel({
  onReset: () => commitFilters({ platform: 'all', status: 'all', year: 'all', screenshots: false }),
  onClose: () => closePlatformMenu(),
});

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createScreenshotIcon() {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  const frame = document.createElementNS(namespace, 'rect');
  const landscape = document.createElementNS(namespace, 'path');
  const sun = document.createElementNS(namespace, 'circle');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  frame.setAttribute('x', '4');
  frame.setAttribute('y', '5');
  frame.setAttribute('width', '16');
  frame.setAttribute('height', '14');
  frame.setAttribute('rx', '2');
  landscape.setAttribute('d', 'm5 16 4-4 3 3 2-2 5 5');
  sun.setAttribute('cx', '9');
  sun.setAttribute('cy', '9.5');
  sun.setAttribute('r', '1.5');
  icon.append(frame, landscape, sun);
  return icon;
}

function renderSummary(years) {
  const stats = summarize(years);
  const format = (value) => value.toLocaleString('it-IT', { useGrouping: 'always' });
  const metrics = [
    [format(stats.games), 'giochi registrati'],
    [format(stats.completed), 'completati'],
    [`${format(stats.hours)} h`, 'registrate'],
  ];
  elements.summary.replaceChildren(...metrics.map(([value, label]) => {
    const metric = element('span', 'archive-summary-metric');
    metric.append(element('strong', null, value), document.createTextNode(' '), element('span', 'archive-summary-label', label));
    return metric;
  }));
  const dates = years.map(({ year }) => Number(year));
  if (dates.length) elements.summary.append(element('span', 'archive-summary-period', `${Math.min(...dates)}–${Math.max(...dates)}`));
}

function renderCard(game) {
  const card = element('article', `game-card status-${game.status}`);
  const media = element('div', 'game-media');

  if (game.poster) {
    const poster = element('img', 'game-poster');
    poster.src = assetUrl(game.poster.thumbnail);
    poster.alt = `Copertina di ${game.name}`;
    poster.loading = 'lazy';
    media.append(poster);
  } else {
    media.append(element('div', 'game-poster game-poster-missing', 'Poster non disponibile'));
  }

  if (game.screenshots.length) {
    const screenshotButton = element('button', 'screenshot-button');
    screenshotButton.type = 'button';
    screenshotButton.title = `Apri ${game.screenshots.length} screenshot`;
    screenshotButton.setAttribute('aria-label', `Apri ${game.screenshots.length} screenshot`);
    screenshotButton.append(createScreenshotIcon(), element('span', 'screenshot-count', game.screenshots.length));
    screenshotButton.addEventListener('click', () => lightbox.open(game.screenshots));
    media.append(screenshotButton);
  }

  const details = element('div', 'game-details');
  const info = element('div', 'game-info');
  const metadata = element('div', 'game-meta');
  metadata.append(
    element('span', 'game-chip game-hours', game.hours === null ? 'Ore N/D' : `${game.hours} ore`),
    element('span', `game-chip game-status game-status-${game.status}`, statusLabels[game.status]),
  );
  info.append(element('h3', 'game-title', game.name), metadata);
  if (game.notes) info.append(element('p', 'game-notes', game.notes));
  details.append(info);

  if (game.platform) {
    const platform = element('div', 'platform-icon-container');
    const icon = element('img', 'platform-icon');
    icon.src = assetUrl(`assets/platforms/${game.platform}.png`);
    icon.alt = game.platform.replaceAll('_', ' ');
    platform.title = platformLabels[game.platform] ?? icon.alt;
    platform.append(icon);
    details.append(platform);
  }

  card.append(media, details);
  return card;
}

function renderYear({ year, games }) {
  const stats = summarizeYear(games);
  const section = element('details', 'year-section');
  section.open = true;
  const summary = element('summary', 'year-summary');
  summary.append(
    element('span', 'year-title', year),
    element('span', 'year-metadata', `${stats.games} giochi · ${stats.completed} completati · ${stats.hours}h`),
  );
  const grid = element('div', 'games-grid');
  grid.append(...games.map(renderCard));
  section.append(summary, grid);
  return section;
}

function renderTimelineGame(game, index) {
  const hasScreenshots = game.screenshots.length > 0;
  const tile = element(hasScreenshots ? 'button' : 'div', `timeline-game status-${game.status}`);
  if (hasScreenshots) {
    tile.type = 'button';
    tile.addEventListener('click', () => lightbox.open(game.screenshots));
  }
  tile.title = `${index + 1}. ${game.name}${hasScreenshots ? ` · Apri ${game.screenshots.length} screenshot` : ''}`;
  tile.setAttribute('aria-label', tile.title);

  if (game.poster) {
    const poster = element('img', 'timeline-poster');
    poster.src = assetUrl(game.poster.thumbnail);
    poster.alt = '';
    poster.loading = 'lazy';
    tile.append(poster);
  } else {
    tile.append(element('span', 'timeline-poster-missing', 'Poster non disponibile'));
  }

  const overlay = element('span', 'timeline-game-overlay');
  overlay.append(
    element('strong', null, game.name),
    element('small', null, hasScreenshots ? `${game.screenshots.length} screenshot` : statusLabels[game.status]),
  );
  tile.append(overlay);
  return tile;
}

function timelineYears(filteredYears) {
  const filteredByYear = new Map(filteredYears.map(({ year, games }) => [String(year), games]));
  return state.catalog.years
    .filter(({ year }) => state.year === 'all' || String(year) === String(state.year))
    .map(({ year }) => ({ year, games: filteredByYear.get(String(year)) ?? [] }))
    .reverse();
}

function renderTimeline(filteredYears) {
  const years = timelineYears(filteredYears);
  const currentYear = new Date().getFullYear();
  const timeline = element('div', 'timeline');

  years.forEach(({ year, games }) => {
    const stats = summarizeYear(games);
    const entry = element('section', 'timeline-year');

    const marker = element('div', 'timeline-marker');
    marker.setAttribute('aria-hidden', 'true');
    const heading = element('div', 'timeline-heading');
    const titleRow = element('div', 'timeline-title-row');
    const title = element('h2', 'timeline-year-title', year);
    titleRow.append(title);
    if (Number(year) === currentYear) titleRow.append(element('span', 'timeline-current', 'In corso'));
    const countLabel = `${games.length} ${games.length === 1 ? 'gioco' : 'giochi'}`;
    heading.append(titleRow, element('span', 'timeline-count', countLabel));

    const volume = element('div', 'timeline-volume');
    const volumeFill = element('span', 'timeline-volume-fill');
    volume.setAttribute(
      'aria-label',
      `${stats.completed} completati, ${stats.unfinished} non completati, ${stats.multiplayer} multiplayer`,
    );
    [
      ['completed', stats.completed],
      ['unfinished', stats.unfinished],
      ['multiplayer', stats.multiplayer],
    ].forEach(([status, count]) => {
      if (!count) return;
      const segment = element('span', `timeline-volume-segment timeline-volume-${status}`);
      segment.style.flexBasis = `${(count / games.length) * 100}%`;
      volumeFill.append(segment);
    });
    volume.append(volumeFill);

    const content = element('div', 'timeline-content');
    if (games.length) {
      const mosaic = element('div', 'timeline-mosaic');
      mosaic.append(...games.map(renderTimelineGame));
      content.append(mosaic);
    } else {
      content.append(element('p', 'timeline-empty', 'Nessun gioco con i filtri attivi'));
    }

    entry.append(marker, heading, volume, content);
    timeline.append(entry);
  });
  return timeline;
}

function render() {
  if (!state.catalog) return;
  elements.explore.hidden = state.section !== 'explore';
  elements.statistics.hidden = state.section !== 'statistics';
  renderSummary(state.catalog.years);
  if (state.section === 'statistics') {
    filterPanel.close();
    statistics.render(state.catalog, state);
    return;
  }
  const galleryState = JSON.stringify([state.query, state.status, state.platform, state.year, state.screenshots, state.view]);
  if (galleryState === lastGalleryState) return;
  lastGalleryState = galleryState;
  const filteredYears = filterYears(state.catalog.years, state);
  const filteredCount = filteredYears.reduce((total, { games }) => total + games.length, 0);
  const totalCount = summarize(state.catalog.years).games;
  filterPanel.setResult(filteredCount);
  const isFiltered = state.status !== 'all'
    || state.platform !== 'all'
    || state.year !== 'all'
    || state.screenshots
    || state.query.trim();

  elements.resultCount.textContent = isFiltered
    ? `${filteredCount} risultati su ${totalCount}`
    : `${totalCount} giochi in archivio`;
  elements.gallery.classList.toggle('is-timeline', state.view === 'timeline');
  if (state.view === 'timeline') {
    elements.gallery.replaceChildren(renderTimeline(filteredYears));
  } else {
    elements.gallery.replaceChildren(...filteredYears.map(renderYear));
    if (!filteredCount) elements.gallery.append(element('p', 'message', 'Nessun gioco corrisponde ai filtri selezionati.'));
  }
}

function createPlatformIcon(platform) {
  if (platform === 'all') {
    const icon = element('span', 'platform-all-icon');
    icon.append(...Array.from({ length: 4 }, () => element('i')));
    return icon;
  }
  const icon = element('img', 'platform-menu-icon');
  icon.src = assetUrl(`assets/platforms/${platform}.png`);
  icon.alt = '';
  return icon;
}

function closePlatformMenu({ restoreFocus = false } = {}) {
  elements.platformOptions.hidden = true;
  elements.platformTrigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) elements.platformTrigger.focus();
}

function openPlatformMenu() {
  elements.platformOptions.hidden = false;
  elements.platformTrigger.setAttribute('aria-expanded', 'true');
}

function displayPlatformSelection(platform) {
  elements.platformTriggerIcon.replaceChildren(createPlatformIcon(platform));
  elements.platformTriggerLabel.textContent = platformLabels[platform] ?? platform.replaceAll('_', ' ');
  elements.platformOptions.querySelectorAll('[role="option"]').forEach((option) => {
    option.setAttribute('aria-selected', String(option.dataset.platform === platform));
  });
}

function availableChoices() {
  return {
    platforms: [...new Set(state.catalog.years.flatMap(({ games }) => games.map(({ platform }) => platform).filter(Boolean)))],
    years: state.catalog.years.map(({ year }) => year),
  };
}

function syncControls() {
  filterPanel.sync(state, { status: statusLabels, platform: platformLabels });
  elements.sectionButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.section === state.section));
  });
  elements.search.value = state.query;
  elements.year.value = state.year;
  elements.screenshots.setAttribute('aria-pressed', String(state.screenshots));
  document.querySelectorAll('[data-status]').forEach((button) => {
    const active = button.dataset.status === state.status;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  elements.viewButtons.forEach((button) => {
    const selected = button.dataset.view === state.view;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  displayPlatformSelection(state.platform);
}

function commitFilters(patch, { replace = false } = {}) {
  Object.assign(state, patch);
  syncControls();
  updateFilterUrl(state, { replace });
  render();
}

function populatePlatforms(years) {
  const available = new Set(years.flatMap(({ games }) => games.map(({ platform }) => platform).filter(Boolean)));
  const remaining = [...available].filter((platform) => !platformOrder.includes(platform)).sort();
  const platforms = ['all', ...platformOrder.filter((platform) => available.has(platform)), ...remaining];
  elements.platformOptions.replaceChildren(...platforms.map((platform) => {
    const option = element('button', 'platform-option');
    const check = element('span', 'platform-option-check', '✓');
    option.type = 'button';
    option.dataset.platform = platform;
    option.setAttribute('role', 'option');
    check.setAttribute('aria-hidden', 'true');
    option.append(
      createPlatformIcon(platform),
      element('span', null, platformLabels[platform] ?? platform.replaceAll('_', ' ')),
      check,
    );
    option.addEventListener('click', () => {
      closePlatformMenu();
      commitFilters({ platform });
    });
    return option;
  }));
}

function populateYears(years) {
  elements.year.append(...years.map(({ year }) => {
    const option = element('option', null, year);
    option.value = String(year);
    return option;
  }));
}

document.querySelectorAll('[data-status]').forEach((button) => {
  button.addEventListener('click', () => commitFilters({ status: button.dataset.status }));
});
elements.search.addEventListener('input', () => commitFilters({ query: elements.search.value }, { replace: true }));
elements.year.addEventListener('change', () => commitFilters({ year: elements.year.value }));
elements.screenshots.addEventListener('click', () => commitFilters({ screenshots: !state.screenshots }));
elements.viewButtons.forEach((button) => {
  button.addEventListener('click', () => commitFilters({ view: button.dataset.view }));
});

elements.sectionButtons.forEach((button) => {
  button.addEventListener('click', () => commitFilters({ section: button.dataset.section }));
});
elements.platformTrigger.addEventListener('click', () => {
  if (elements.platformOptions.hidden) openPlatformMenu();
  else closePlatformMenu();
});
elements.platformPicker.addEventListener('keydown', (event) => {
  const options = [...elements.platformOptions.querySelectorAll('[role="option"]')];
  if (event.key === 'Escape' && !elements.platformOptions.hidden) {
    event.preventDefault();
    event.stopPropagation();
    closePlatformMenu({ restoreFocus: true });
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  if (elements.platformOptions.hidden) openPlatformMenu();
  const currentIndex = options.indexOf(document.activeElement);
  const offset = event.key === 'ArrowDown' ? 1 : -1;
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + options.length) % options.length;
  options[nextIndex]?.focus();
});
document.addEventListener('click', (event) => {
  if (!elements.platformPicker.contains(event.target)) closePlatformMenu();
});
window.addEventListener('popstate', () => {
  Object.assign(state, parseFilterState(window.location.search, availableChoices()));
  Object.assign(state, parseStatisticsState(window.location.search, availableChoices()));
  syncControls();
  render();
});

async function initialize() {
  try {
    state.catalog = await loadCatalog();
    populatePlatforms(state.catalog.years);
    populateYears(state.catalog.years);
    Object.assign(state, parseFilterState(window.location.search, availableChoices()));
    Object.assign(state, parseStatisticsState(window.location.search, availableChoices()));
    syncControls();
    updateFilterUrl(state, { replace: true });
    elements.loading.hidden = true;
    render();
  } catch (error) {
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.error.textContent = error.message;
    console.error(error);
  }
}

initialize();
