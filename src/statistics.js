import { hierarchy, treemap } from 'd3-hierarchy';
import { createCharts } from './charts.js';
import { assetUrl } from './catalog.js';
import { compactViewportQuery } from './filter-panel.js';
import { summarize } from './stats.js';
import {
  hoursHistogram, platformDistribution, rankedGames, selectStatisticsYears, statisticsGames,
} from './statistics-data.js';

const format = (value) => value.toLocaleString('it-IT', { maximumFractionDigits: 1, useGrouping: 'always' });
const statusLabels = { completed: 'Completati', unfinished: 'Non completati', multiplayer: 'Multiplayer' };

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

export function createStatistics(root, { onChange, onGameSelect }) {
  const find = (selector) => root.querySelector(selector);
  const elements = {
    years: find('#statistics-years'),
    scope: find('#statistics-scope'),
    empty: find('#statistics-empty'),
    completion: find('#statistics-completion'),
    ranking: find('#statistics-ranking'),
    expand: find('#statistics-ranking-expand'),
    treemap: find('#statistics-treemap'),
    platformLegend: find('#statistics-platform-legend'),
    histogramBins: find('#statistics-histogram-bins'),
    histogramCount: find('#statistics-histogram-count'),
    period: find('#statistics-period'),
    periodSummary: find('#statistics-period-summary'),
  };
  const charts = createCharts({
    statusByYear: find('#status-by-year-chart'),
    hoursByYear: find('#hours-by-year-chart'),
    histogram: find('#hours-distribution-chart'),
    platformsByYear: find('#platforms-by-year-chart'),
  });
  let catalog;
  let current;
  let selectedYears = [];
  let expanded = false;
  let platformCounts = [];
  let scheduledChart;
  const compact = matchMedia(compactViewportQuery);
  function layoutPeriod() {
    elements.period.open = !compact.matches;
    elements.period.querySelector('summary').tabIndex = compact.matches ? 0 : -1;
  }
  compact.addEventListener('change', layoutPeriod);
  elements.period.querySelector('summary').addEventListener('click', (event) => {
    if (!compact.matches) event.preventDefault();
  });
  layoutPeriod();

  function populateYears() {
    const all = node('button', null, 'Tutti');
    all.type = 'button';
    all.dataset.statisticsYear = 'all';
    const buttons = selectStatisticsYears(catalog.years).map(({ year }) => {
      const button = node('button', null, year);
      button.type = 'button';
      button.dataset.statisticsYear = String(year);
      return button;
    });
    elements.years.replaceChildren(all, ...buttons);
  }

  elements.years.addEventListener('click', (event) => {
    const button = event.target.closest('[data-statistics-year]');
    if (!button || !current) return;
    const year = button.dataset.statisticsYear;
    if (year === 'all') {
      onChange({ statisticsYears: null });
    } else {
      const selected = new Set(current.statisticsYears ?? []);
      if (selected.has(year)) selected.delete(year);
      else selected.add(year);
      onChange({ statisticsYears: [...selected].sort() });
    }
  });
  root.querySelectorAll('[data-statistics-tab]').forEach((button) => {
    button.addEventListener('click', () => onChange({ statisticsTab: button.dataset.statisticsTab }));
  });
  elements.histogramBins.addEventListener('input', () => {
    onChange({ statisticsBins: Number(elements.histogramBins.value) }, { replace: true });
  });

  function renderCompletion(games, stats) {
    const multiplayer = games.filter(({ status }) => status === 'multiplayer').length;
    const eligible = games.length - multiplayer;
    const netRate = eligible ? `${Math.round(stats.completed / eligible * 100)}%` : 'N/D';
    const rate = node('p', 'statistics-completion-rate');
    rate.append(node('strong', null, `${stats.completionRate}%`), node('span', null, 'complessivo'));
    const subtitle = node('p', 'statistics-caption', `${stats.completed}/${stats.games} registrazioni · ${netRate} esclusi Multiplayer`);
    const rows = Object.keys(statusLabels).map((key) => {
      const count = games.filter(({ status }) => status === key).length;
      const row = node('div', 'statistics-measure');
      const label = node('div', 'statistics-measure-label');
      label.append(node('span', null, statusLabels[key]), node('span', null, `${count} · ${format(count / games.length * 100)}%`));
      const track = node('div', 'statistics-measure-track');
      const fill = node('div', `statistics-measure-fill statistics-status-${key}`);
      fill.style.width = `${count / games.length * 100}%`;
      track.append(fill);
      row.append(label, track);
      return row;
    });
    elements.completion.replaceChildren(rate, subtitle, ...rows);
  }

  function renderRanking() {
    const ranked = rankedGames(selectedYears);
    const visible = ranked.slice(0, expanded ? 50 : 6);
    const largest = ranked[0]?.hours || 1;
    const rows = visible.map((game, index) => {
      const item = node('li');
      const button = node('button', 'statistics-ranked-game');
      button.type = 'button';
      const position = node('span', 'statistics-rank-number', index + 1);
      position.setAttribute('aria-hidden', 'true');
      const cover = node('span', 'statistics-rank-cover');
      cover.setAttribute('aria-hidden', 'true');
      if (game.poster) {
        const image = node('img');
        image.src = assetUrl(game.poster.thumbnail ?? game.poster.src);
        image.alt = '';
        image.loading = 'lazy';
        cover.append(image);
      }
      const copy = node('span', 'statistics-rank-copy');
      const experienceCount = game.experiences.length;
      const unknownCount = experienceCount - game.knownHoursCount;
      const meta = `${experienceCount} ${experienceCount === 1 ? 'esperienza' : 'esperienze'}${unknownCount ? ` · ${unknownCount} con ore N/D` : ''}`;
      const track = node('span', 'statistics-rank-track');
      const fill = node('span', 'statistics-rank-fill');
      fill.style.width = `${game.hours / largest * 100}%`;
      game.experiences.filter(({ hours }) => Number.isFinite(hours) && hours > 0).forEach((experience) => {
        const segment = node('span', 'statistics-rank-segment');
        segment.style.width = `${experience.hours / game.hours * 100}%`;
        segment.title = `${experience.year} · ${format(experience.hours)} h`;
        fill.append(segment);
      });
      track.append(fill);
      copy.append(node('strong', null, game.name), node('small', null, meta), track);
      button.append(position, cover, copy, node('span', 'statistics-rank-hours', `${format(game.hours)} h`));
      button.setAttribute('aria-label', `${game.name}, ${format(game.hours)} ore totali, ${meta}. Cerca in Esplora`);
      button.addEventListener('click', () => onGameSelect(game));
      item.append(button);
      return item;
    });
    if (!ranked.length) rows.push(node('li', 'statistics-caption', 'Nessuna durata registrata.'));
    elements.ranking.replaceChildren(...rows);
    elements.expand.hidden = ranked.length <= 6;
    elements.expand.setAttribute('aria-expanded', String(expanded));
    elements.expand.textContent = expanded ? 'Mostra meno' : `Mostra i primi ${ranked.length}`;
  }

  elements.expand.addEventListener('click', () => {
    expanded = !expanded;
    renderRanking();
  });

  function renderTreemap() {
    if (root.hidden || current?.statisticsTab !== 'platforms') return;
    const width = elements.treemap.clientWidth;
    const height = elements.treemap.clientHeight;
    if (!width || !height) return;
    const total = platformCounts.reduce((sum, item) => sum + item.count, 0);
    const data = hierarchy({ children: platformCounts }).sum((item) => item.count || 0);
    treemap().size([width, height]).paddingInner(3)(data);
    const tiles = data.leaves().filter((leaf) => leaf.data.key).map((leaf) => {
      const { label, count, color, key } = leaf.data;
      const tile = node('div', 'statistics-treemap-tile');
      tile.style.left = `${leaf.x0 / width * 100}%`;
      tile.style.top = `${leaf.y0 / height * 100}%`;
      tile.style.width = `${(leaf.x1 - leaf.x0) / width * 100}%`;
      tile.style.height = `${(leaf.y1 - leaf.y0) / height * 100}%`;
      tile.style.setProperty('--platform-color', color);
      tile.dataset.platform = key;
      tile.title = `${label}: ${count} giochi (${format(count / total * 100)}%)`;
      tile.setAttribute('aria-hidden', 'true');
      if (leaf.x1 - leaf.x0 > 90 && leaf.y1 - leaf.y0 > 55) {
        tile.append(node('strong', null, label), node('span', null, `${count} · ${format(count / total * 100)}%`));
      }
      return tile;
    });
    elements.treemap.replaceChildren(...tiles);
    elements.treemap.setAttribute('aria-label', `Treemap: ${platformCounts.map(({ label, count }) => `${label}: ${count} giochi`).join(', ')}`);
    elements.platformLegend.replaceChildren(...platformCounts.map(({ label, count, color }) => {
      const item = node('li');
      const swatch = node('i');
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, node('span', null, label), node('strong', null, `${count} · ${format(count / total * 100)}%`));
      return item;
    }));
  }

  new ResizeObserver(renderTreemap).observe(elements.treemap);

  return {
    render(nextCatalog, state) {
      if (nextCatalog !== catalog) {
        catalog = nextCatalog;
        populateYears();
      }
      current = state;
      selectedYears = selectStatisticsYears(catalog.years, state.statisticsYears);
      const games = statisticsGames(selectedYears);
      const stats = summarize(selectedYears);
      const isAll = state.statisticsYears === null || selectedYears.length === catalog.years.length;
      elements.periodSummary.textContent = isAll ? 'Intero archivio' : selectedYears.length > 3
        ? `${selectedYears.length} anni selezionati` : selectedYears.map(({ year }) => year).join(', ') || 'Nessun anno';
      elements.scope.textContent = `${isAll ? 'Intero archivio' : selectedYears.map(({ year }) => year).join(', ') || 'Nessun anno'} · ${stats.games} registrazioni · ${format(stats.hours)} h`;
      root.querySelectorAll('[data-statistics-year]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.statisticsYear === 'all'
          ? state.statisticsYears === null : state.statisticsYears?.includes(button.dataset.statisticsYear) ?? false));
      });
      root.querySelectorAll('[data-statistics-tab]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.statisticsTab === state.statisticsTab));
      });
      root.querySelectorAll('[data-statistics-panel]').forEach((panel) => {
        panel.hidden = !games.length || panel.dataset.statisticsPanel !== state.statisticsTab;
      });
      elements.empty.hidden = games.length > 0;
      cancelAnimationFrame(scheduledChart);
      if (!games.length) return;

      let histogram;
      if (state.statisticsTab === 'trend') {
        renderCompletion(games, stats);
        find('#statistics-hours-coverage').textContent = `Ore note: ${stats.knownHoursGames}/${stats.games} giochi · ${format(stats.days)} giorni equivalenti`;
      }
      if (state.statisticsTab === 'habits') {
        elements.histogramBins.value = String(state.statisticsBins);
        elements.histogramCount.value = String(state.statisticsBins);
        histogram = hoursHistogram(games, { binCount: state.statisticsBins });
        find('#statistics-duration-summary').textContent = histogram.count
          ? `Media ${format(histogram.mean)} h · Mediana ${format(histogram.median)} h` : 'Nessuna durata registrata';
        find('#statistics-duration-coverage').textContent = `${histogram.count} durate registrate · ${games.length - histogram.count} N/D`;
        renderRanking();
      }
      if (state.statisticsTab === 'platforms') {
        platformCounts = platformDistribution(games);
        renderTreemap();
      }
      scheduledChart = requestAnimationFrame(() => {
        if (root.hidden) return;
        charts.render(state.statisticsTab, selectedYears, histogram);
      });
    },
  };
}
