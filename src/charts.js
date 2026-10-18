import { Chart, registerables } from 'chart.js';
import { summarizeYear } from './stats.js';
import { platformDistribution, statisticsGames } from './statistics-data.js';
import { compactViewportQuery } from './filter-panel.js';

Chart.register(...registerables);

const statusColors = { completed: '#78b795', unfinished: '#e27676', multiplayer: '#6f9fdc' };
const statusLabels = { completed: 'Completati', unfinished: 'Non completati', multiplayer: 'Multiplayer' };
const format = (value) => value.toLocaleString('it-IT', { maximumFractionDigits: 1, useGrouping: 'always' });
const formatBoundary = (value) => value.toLocaleString('it-IT', { maximumFractionDigits: 3, useGrouping: 'always' });
const themeColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function commonOptions({ unit = 'Giochi', legend = true } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180 },
    plugins: {
      legend: { display: legend, labels: { color: themeColor('--text-muted'), usePointStyle: true, boxWidth: 9, padding: 16 } },
    },
    scales: {
      x: { ticks: { color: themeColor('--text-muted'), maxRotation: 0 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        grace: '12%',
        title: { display: true, text: unit, color: themeColor('--text-muted') },
        ticks: { color: themeColor('--text-muted'), precision: 0 },
        grid: { color: themeColor('--border') },
      },
    },
  };
}

const barTotals = {
  id: 'barTotals',
  afterDatasetsDraw(chart) {
    const { ctx, scales: { x, y } } = chart;
    ctx.save();
    ctx.fillStyle = themeColor('--text');
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    chart.data.labels.forEach((label, index) => {
      const total = chart.data.datasets.reduce((sum, dataset, datasetIndex) => (
        sum + (chart.isDatasetVisible(datasetIndex) ? Number(dataset.data[index] ?? 0) : 0)
      ), 0);
      ctx.fillText(total, x.getPixelForValue(index), y.getPixelForValue(total) - 7);
    });
    ctx.restore();
  },
};

const histogramBarWidth = {
  id: 'histogramBarWidth',
  beforeDatasetsUpdate(chart) {
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    const width = dataset.binWidth ?? 1;
    const x = chart.scales.x;
    dataset.barThickness = Math.abs(x.getPixelForValue(width) - x.getPixelForValue(0));
  },
};

export function createCharts(canvases) {
  const charts = new Map();
  const legends = new Map();
  const compact = matchMedia(compactViewportQuery);
  const hasResponsiveLegend = (chart) => [canvases.statusByYear, canvases.platformsByYear].includes(chart.canvas);

  function renderLegend(chart) {
    if (!hasResponsiveLegend(chart)) return;
    if (!legends.has(chart)) {
      const legend = document.createElement('ul');
      legend.className = 'statistics-chart-legend';
      legend.setAttribute('aria-label', 'Serie del grafico');
      chart.canvas.closest('.statistics-chart-scroll').before(legend);
      legends.set(chart, legend);
    }
    const items = chart.data.datasets.map((dataset, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const swatch = document.createElement('i');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(chart.isDatasetVisible(index)));
      swatch.style.backgroundColor = dataset.backgroundColor;
      swatch.setAttribute('aria-hidden', 'true');
      button.append(swatch, document.createTextNode(dataset.label));
      button.addEventListener('click', () => {
        chart.setDatasetVisibility(index, !chart.isDatasetVisible(index));
        button.setAttribute('aria-pressed', String(chart.isDatasetVisible(index)));
        chart.update();
      });
      item.append(button);
      return item;
    });
    legends.get(chart).replaceChildren(...items);
  }

  compact.addEventListener('change', () => {
    charts.forEach((chart) => {
      if (!hasResponsiveLegend(chart)) return;
      chart.options.plugins.legend.display = !compact.matches;
      chart.update('none');
      renderLegend(chart);
    });
  });

  function ensure(key, options, plugins = []) {
    if (!charts.has(key)) charts.set(key, new Chart(canvases[key], {
      type: 'bar', data: { labels: [], datasets: [] }, options, plugins,
    }));
    return charts.get(key);
  }

  function update(chart, labels, datasets, description) {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.canvas.setAttribute('aria-label', description);
    if (hasResponsiveLegend(chart)) chart.options.plugins.legend.display = !compact.matches;
    chart.resize();
    chart.update();
    renderLegend(chart);
  }

  function renderTrend(years) {
    const rows = years.map(({ year, games }) => ({ year, ...summarizeYear(games) }));
    const labels = rows.map(({ year }) => String(year));
    const options = commonOptions();
    options.scales.x.stacked = true;
    options.scales.y.stacked = true;
    const status = ensure('statusByYear', options, [barTotals]);
    update(status, labels, Object.keys(statusLabels).map((key) => ({
      label: statusLabels[key],
      data: rows.map((row) => row[key]),
      backgroundColor: statusColors[key],
      borderRadius: 2,
    })), `Giochi per anno: ${rows.map((row) => `${row.year}: ${row.completed} completati, ${row.unfinished} non completati, ${row.multiplayer} multiplayer`).join('; ')}`);

    const hours = ensure('hoursByYear', commonOptions({ unit: 'Ore', legend: false }));
    update(hours, labels, [{
      label: 'Ore registrate', data: rows.map((row) => row.hours), backgroundColor: '#deb174', borderRadius: 3,
    }], `Ore registrate per anno: ${rows.map((row) => `${row.year}: ${format(row.hours)} ore`).join('; ')}`);
  }

  function renderHistogram(histogram) {
    const options = commonOptions({ legend: false });
    options.scales.x = {
      type: 'linear', min: histogram.min, max: histogram.max, offset: false,
      title: { display: true, text: 'Ore per gioco', color: themeColor('--text-muted') },
      ticks: { color: themeColor('--text-muted'), maxRotation: 0, maxTicksLimit: 9 },
      grid: { display: false },
    };
    options.plugins.tooltip = {
      callbacks: {
        title: ([item]) => `${formatBoundary(item.raw.x0)}–${formatBoundary(item.raw.x1)} ore`,
        label: (item) => `${item.parsed.y} ${item.parsed.y === 1 ? 'gioco' : 'giochi'}`,
      },
    };
    const chart = ensure('histogram', options, [histogramBarWidth]);
    chart.options.scales.x.min = histogram.min;
    chart.options.scales.x.max = histogram.max;
    chart.canvas.dataset.binWidth = String(histogram.binWidth);
    chart.canvas.dataset.binCount = String(histogram.bins.length);
    chart.canvas.dataset.knownHoursGames = String(histogram.count);
    update(chart, [], [{
      label: 'Giochi',
      binWidth: histogram.binWidth,
      data: histogram.bins.map(({ x0, x1, count }) => ({ x: (x0 + x1) / 2, y: count, x0, x1 })),
      backgroundColor: themeColor('--primary'),
      borderWidth: 0,
      barPercentage: 1,
      categoryPercentage: 1,
    }], `Istogramma con ${histogram.bins.length} intervalli, ${histogram.count} durate registrate. Media ${format(histogram.mean ?? 0)} ore, mediana ${format(histogram.median ?? 0)} ore.`);
  }

  function renderPlatforms(years) {
    const platforms = platformDistribution(statisticsGames(years));
    const options = commonOptions({ unit: 'Quota dei giochi (%)' });
    options.scales.x.stacked = true;
    Object.assign(options.scales.y, { stacked: true, min: 0, max: 100, grace: 0 });
    options.scales.y.ticks.callback = (value) => `${value}%`;
    options.plugins.tooltip = { callbacks: { label: (item) => `${item.dataset.label}: ${format(item.parsed.y)}%` } };
    const chart = ensure('platformsByYear', options);
    update(chart, years.map(({ year }) => String(year)), platforms.map((platform) => ({
      label: platform.label,
      backgroundColor: platform.color,
      data: years.map(({ games }) => games.length
        ? games.filter((game) => (game.platform || 'unknown') === platform.key).length / games.length * 100 : 0),
    })), `Piattaforme per anno: ${years.map(({ year, games }) => `${year}: ${platformDistribution(games).map(({ label, count }) => `${label} ${count}`).join(', ')}`).join('; ')}`);
  }

  const appearance = matchMedia('(prefers-color-scheme: dark)');
  appearance.addEventListener('change', () => {
    charts.forEach((chart) => {
      const text = themeColor('--text-muted');
      chart.options.plugins.legend.labels.color = text;
      Object.values(chart.options.scales).forEach((scale) => {
        if (scale.title) scale.title.color = text;
        scale.ticks.color = text;
        if (scale.grid?.display !== false) scale.grid.color = themeColor('--border');
      });
      if (chart === charts.get('histogram')) chart.data.datasets[0].backgroundColor = themeColor('--primary');
      chart.update('none');
    });
  });

  return {
    render(tab, years, histogram) {
      const count = years.reduce((sum, { games }) => sum + games.length, 0);
      Object.values(canvases).forEach((canvas) => { canvas.dataset.gameCount = String(count); });
      [canvases.statusByYear, canvases.hoursByYear, canvases.platformsByYear].forEach((canvas) => {
        canvas.parentElement.style.setProperty('--chart-min-width', `${years.length * 44 + 70}px`);
      });
      if (tab === 'trend') renderTrend(years);
      if (tab === 'habits') renderHistogram(histogram);
      if (tab === 'platforms') renderPlatforms(years);
    },
  };
}
