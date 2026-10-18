import { bin, max, mean, median, range } from 'd3-array';

export const statisticsPlatformOrder = ['iPad', 'PS3', 'PS4', 'Laptop_PC', 'Desktop_PC', 'Steam_Deck'];
export const statisticsPlatformLabels = {
  iPad: 'iPad',
  PS3: 'PS3',
  PS4: 'PS4',
  Laptop_PC: 'Laptop PC',
  Desktop_PC: 'Desktop PC',
  Steam_Deck: 'Steam Deck',
  unknown: 'Non specificata',
};
export const statisticsPlatformColors = {
  iPad: '#4cbeb5',
  PS3: '#e27676',
  PS4: '#a982cd',
  Laptop_PC: '#78b795',
  Desktop_PC: '#6f9fdc',
  Steam_Deck: '#deb174',
  unknown: '#919794',
};

export function selectStatisticsYears(years, selection = null) {
  const selected = selection === null ? null : new Set(selection.map(String));
  return years.filter(({ year }) => selected === null || selected.has(String(year)))
    .sort((left, right) => Number(left.year) - Number(right.year));
}

export function statisticsGames(years) {
  return years.flatMap(({ year, games }) => games.map((game) => ({ ...game, year })));
}

export function hoursHistogram(games, { binWidth = 1, binCount } = {}) {
  if (!Number.isFinite(binWidth) || binWidth <= 0) throw new RangeError('binWidth must be positive');
  if (binCount !== undefined && (!Number.isInteger(binCount) || binCount < 1 || binCount > 500)) {
    throw new RangeError('binCount must be an integer between 1 and 500');
  }
  const known = games.filter(({ hours }) => Number.isFinite(hours) && hours >= 0);
  const upper = known.length ? (Math.floor(max(known, ({ hours }) => hours) / binWidth) + 1) * binWidth : binWidth;
  const thresholds = binCount === undefined ? range(binWidth, upper, binWidth)
    : Array.from({ length: binCount - 1 }, (_, index) => upper * (index + 1) / binCount);
  const bins = known.length ? bin()
    .value(({ hours }) => hours)
    .domain([0, upper])
    .thresholds(thresholds)(known) : [];

  return {
    bins: bins.map(({ x0, x1, length }) => ({ x0, x1, count: length })),
    binWidth: binCount === undefined ? binWidth : upper / binCount,
    min: 0,
    max: upper,
    count: known.length,
    mean: mean(known, ({ hours }) => hours) ?? null,
    median: median(known, ({ hours }) => hours) ?? null,
  };
}

export function rankedGames(years, limit = 50) {
  const groups = new Map();
  statisticsGames(years).forEach((game) => {
    const key = game.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it');
    if (!groups.has(key)) groups.set(key, { key, name: game.name, hours: 0, poster: null, experiences: [], knownHoursCount: 0 });
    const group = groups.get(key);
    group.experiences.push(game);
    if (!group.poster && game.poster) group.poster = game.poster;
    if (Number.isFinite(game.hours)) {
      group.hours += game.hours;
      group.knownHoursCount += 1;
    }
  });
  return [...groups.values()]
    .filter(({ knownHoursCount }) => knownHoursCount > 0)
    .map((game) => ({ ...game, experiences: game.experiences.sort((left, right) => Number(left.year) - Number(right.year)
      || String(left.id).localeCompare(String(right.id), 'it', { numeric: true })) }))
    .sort((left, right) => right.hours - left.hours || left.name.localeCompare(right.name, 'it'))
    .slice(0, limit);
}

export function platformDistribution(games) {
  const counts = new Map();
  games.forEach(({ platform }) => {
    const key = platform || 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const extra = [...counts.keys()].filter((key) => !statisticsPlatformOrder.includes(key)).sort();
  return [...statisticsPlatformOrder, ...extra]
    .filter((key) => counts.has(key))
    .map((key) => ({
      key,
      label: statisticsPlatformLabels[key] ?? key.replaceAll('_', ' '),
      color: statisticsPlatformColors[key] ?? statisticsPlatformColors.unknown,
      count: counts.get(key),
    }));
}
