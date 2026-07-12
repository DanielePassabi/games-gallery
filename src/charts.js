import { Chart, registerables } from 'chart.js';
import { summarize, summarizeYear } from './stats.js';

Chart.register(...registerables);

const colors = {
  completed: 'rgba(120, 183, 149, 0.82)',
  unfinished: 'rgba(226, 118, 118, 0.82)',
  multiplayer: 'rgba(111, 159, 220, 0.82)',
  hours: 'rgba(222, 177, 116, 0.82)',
  platforms: {
    Desktop_PC: 'rgba(111, 159, 220, 0.82)',
    Laptop_PC: 'rgba(120, 183, 149, 0.82)',
    Steam_Deck: 'rgba(222, 177, 116, 0.82)',
    PS4: 'rgba(169, 130, 205, 0.82)',
    PS3: 'rgba(226, 118, 118, 0.82)',
    iPad: 'rgba(76, 190, 181, 0.82)',
    'Non specificata': 'rgba(145, 151, 148, 0.82)',
  },
};

const doughnutValueLabels = {
  id: 'doughnutValueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const values = chart.data.datasets[0]?.data ?? [];
    const arcs = chart.getDatasetMeta(0).data;
    ctx.save();
    ctx.font = '700 13px Inter, ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    arcs.forEach((arc, index) => {
      const value = Number(values[index] ?? 0);
      if (!value || arc.circumference < 0.12) return;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = (arc.innerRadius + arc.outerRadius) / 2;
      const x = arc.x + Math.cos(angle) * radius;
      const y = arc.y + Math.sin(angle) * radius;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(String(value), x, y);
      ctx.fillText(String(value), x, y);
    });
    ctx.restore();
  },
};

function chartTextColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
}

function commonOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 220 },
    plugins: {
      title: { display: true, text: title, color: chartTextColor(), font: { size: 15 } },
      legend: { labels: { color: chartTextColor(), usePointStyle: true, boxWidth: 10 } },
    },
    scales: {
      x: { ticks: { color: chartTextColor() }, grid: { color: 'rgba(127, 127, 127, 0.12)' } },
      y: { beginAtZero: true, ticks: { color: chartTextColor(), precision: 0 }, grid: { color: 'rgba(127, 127, 127, 0.12)' } },
    },
  };
}

function doughnutOptions(title) {
  const options = commonOptions(title);
  delete options.scales;
  options.cutout = '62%';
  options.plugins.legend.position = 'right';
  return options;
}

function replaceData(chart, labels, datasets) {
  chart.data.labels = labels;
  chart.data.datasets = datasets;
  chart.update();
}

export function createCharts(canvases) {
  const statusByYear = new Chart(canvases.statusByYear, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: { ...commonOptions('Giochi per anno e categoria'), scales: {
      x: { stacked: true, ticks: { color: chartTextColor() }, grid: { color: 'rgba(127, 127, 127, 0.12)' } },
      y: { stacked: true, beginAtZero: true, ticks: { color: chartTextColor(), precision: 0 }, grid: { color: 'rgba(127, 127, 127, 0.12)' } },
    } },
  });
  const daysByYear = new Chart(canvases.daysByYear, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: commonOptions('Giorni giocati per anno'),
  });
  const completion = new Chart(canvases.completion, {
    type: 'doughnut',
    data: { labels: [], datasets: [] },
    options: doughnutOptions('Completion status'),
    plugins: [doughnutValueLabels],
  });
  const platform = new Chart(canvases.platform, {
    type: 'doughnut',
    data: { labels: [], datasets: [] },
    options: doughnutOptions('Distribuzione per piattaforma'),
  });

  return {
    render(years) {
      const yearlyStats = [...years].reverse().map(({ year, games }) => ({ year, ...summarizeYear(games) }));
      const labels = yearlyStats.map(({ year }) => String(year));
      const filteredGameCount = yearlyStats.reduce((total, year) => total + year.games, 0);
      Object.values(canvases).forEach((canvas) => {
        canvas.dataset.gameCount = String(filteredGameCount);
      });
      replaceData(statusByYear, labels, [
        { label: 'Completati', data: yearlyStats.map(({ completed }) => completed), backgroundColor: colors.completed },
        { label: 'Non completati', data: yearlyStats.map(({ unfinished }) => unfinished), backgroundColor: colors.unfinished },
        { label: 'Multiplayer', data: yearlyStats.map(({ multiplayer }) => multiplayer), backgroundColor: colors.multiplayer },
      ]);
      replaceData(daysByYear, labels, [{
        label: 'Giorni giocati',
        data: yearlyStats.map(({ hours }) => Math.round((hours / 24) * 10) / 10),
        backgroundColor: colors.hours,
      }]);

      const total = summarize(years);
      const unfinished = years.flatMap(({ games }) => games).filter(({ status }) => status === 'unfinished').length;
      const multiplayer = years.flatMap(({ games }) => games).filter(({ status }) => status === 'multiplayer').length;
      replaceData(completion, ['Completati', 'Non completati', 'Multiplayer'], [{
        data: [total.completed, unfinished, multiplayer],
        backgroundColor: [colors.completed, colors.unfinished, colors.multiplayer],
        borderWidth: 0,
      }]);

      const platformNames = {
        Desktop_PC: 'Desktop PC',
        Laptop_PC: 'Laptop PC',
        Steam_Deck: 'Steam Deck',
      };
      const platformCounts = new Map();
      years.flatMap(({ games }) => games).forEach((game) => {
        const key = game.platform ?? 'Non specificata';
        platformCounts.set(key, (platformCounts.get(key) ?? 0) + 1);
      });
      const platformOrder = ['Desktop_PC', 'Laptop_PC', 'Steam_Deck', 'PS4', 'PS3', 'iPad', 'Non specificata'];
      const orderedPlatforms = [...platformCounts.keys()].sort((left, right) => {
        const leftIndex = platformOrder.indexOf(left);
        const rightIndex = platformOrder.indexOf(right);
        return (leftIndex < 0 ? platformOrder.length : leftIndex) - (rightIndex < 0 ? platformOrder.length : rightIndex);
      });
      replaceData(platform, orderedPlatforms.map((name) => platformNames[name] ?? name), [{
        data: orderedPlatforms.map((name) => platformCounts.get(name)),
        backgroundColor: orderedPlatforms.map((name) => colors.platforms[name] ?? colors.platforms['Non specificata']),
        borderWidth: 0,
      }]);
    },
  };
}
