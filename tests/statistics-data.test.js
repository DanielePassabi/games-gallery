import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hoursHistogram, platformDistribution, rankedGames, selectStatisticsYears,
} from '../src/statistics-data.js';

test('compares non-consecutive years in chronological order without changing the catalog', () => {
  const years = [2026, 2025, 2024, 2016].map((year) => ({ year, games: [] }));
  assert.deepEqual(selectStatisticsYears(years, ['2026', '2016', '2025']).map(({ year }) => year), [2016, 2025, 2026]);
  assert.deepEqual(selectStatisticsYears(years, []), []);
  assert.equal(selectStatisticsYears(years).length, 4);
  assert.equal(years[0].year, 2026);
});

test('histogram uses contiguous numeric intervals, including zero, fractions, and the maximum', () => {
  const result = hoursHistogram([0, 0.5, 1, 1.999, 2, null].map((hours) => ({ hours })));
  assert.deepEqual(result.bins, [
    { x0: 0, x1: 1, count: 2 },
    { x0: 1, x1: 2, count: 2 },
    { x0: 2, x1: 3, count: 1 },
  ]);
  assert.equal(result.count, 5);
  assert.equal(result.median, 1);
  assert.ok(Math.abs(result.mean - 1.0998) < 0.000001);
  assert.equal(result.bins.reduce((sum, interval) => sum + interval.count, 0), result.count);
});

test('histogram preserves gaps and outliers rather than dropping long games', () => {
  const result = hoursHistogram([{ hours: 1 }, { hours: 148 }, { hours: null }]);
  assert.equal(result.bins.length, 149);
  assert.equal(result.bins.at(-1).count, 1);
  assert.equal(result.bins[80].count, 0);
  assert.equal(result.mean, 74.5);
});

test('missing hours do not become zero-hour experiences or invented averages', () => {
  assert.equal(hoursHistogram([{ hours: 0 }, { hours: null }]).count, 1);
  const empty = hoursHistogram([{ hours: null }]);
  assert.deepEqual(empty.bins, []);
  assert.equal(empty.mean, null);
  assert.equal(empty.median, null);
});

test('changing histogram granularity preserves every observation, the domain, and the averages', () => {
  const games = [0, 0.5, 1, 12, 47, 148, null].map((hours) => ({ hours }));
  const baseline = hoursHistogram(games);
  for (const binCount of [10, 40, 75, 150]) {
    const result = hoursHistogram(games, { binCount });
    assert.equal(result.bins.length, binCount);
    assert.equal(result.bins.reduce((sum, interval) => sum + interval.count, 0), 6);
    assert.equal(result.mean, baseline.mean);
    assert.equal(result.median, baseline.median);
    assert.equal(result.max, baseline.max);
    assert.equal(result.bins[0].x0, 0);
    assert.equal(result.bins.at(-1).x1, baseline.max);
    result.bins.slice(1).forEach((interval, index) => assert.equal(interval.x0, result.bins[index].x1));
  }
});

test('histogram granularity handles zero-only and unknown durations', () => {
  const result = hoursHistogram([{ hours: 0 }, { hours: 0 }], { binCount: 150 });
  assert.equal(result.bins.length, 150);
  assert.equal(result.bins[0].count, 2);
  assert.equal(result.mean, 0);
  assert.deepEqual(hoursHistogram([{ hours: null }], { binCount: 40 }).bins, []);
  assert.throws(() => hoursHistogram([], { binCount: 0 }), RangeError);
});

test('ranking includes up to fifty distinct games with known hours without changing input', () => {
  const games = Array.from({ length: 60 }, (_, index) => ({ id: String(index), name: `Game ${index}`, hours: index }));
  games.push({ id: 'unknown', name: 'Unknown', hours: null });
  const ranked = rankedGames([{ year: 2025, games }]);
  assert.equal(ranked.length, 50);
  assert.deepEqual(ranked.slice(0, 3).map(({ hours }) => hours), [59, 58, 57]);
  assert.equal(games[0].hours, 0);
});

test('ranking sums each game across years and retains its individual contributions', () => {
  const entry = (name, hours, id = '01') => ({ id, name, hours });
  const years = [
    { year: 2016, games: [entry('The Witcher 3 Wild Hunt', 148), entry('Metal Gear Solid V The Phantom Pain', 65, '02')] },
    { year: 2017, games: [entry('Terraria', 31)] },
    { year: 2019, games: [entry('The Witcher 3 Wild Hunt', 47)] },
    { year: 2022, games: [entry('Metal Gear Solid V The Phantom Pain', 66), entry('Terraria', 60, '02')] },
    { year: 2023, games: [entry('The Witcher 3 Wild Hunt', 135)] },
    { year: 2026, games: [entry('Terraria', 20)] },
  ];
  const ranked = rankedGames(years);
  assert.deepEqual(ranked.map(({ hours }) => hours), [330, 131, 111]);
  assert.deepEqual(ranked[0].experiences.map(({ hours }) => hours), [148, 47, 135]);
  assert.equal(ranked[1].experiences.length, 2);
  const selected = rankedGames(selectStatisticsYears(years, ['2016', '2023']));
  assert.equal(selected[0].hours, 283);
  assert.equal(selected[0].experiences.length, 2);
});

test('same-year replays count separately; missing hours remain unknown and covers can fall back', () => {
  const poster = { thumbnail: 'cover.webp' };
  const ranked = rankedGames([{ year: 2026, games: [
    { id: '01', name: 'Game', hours: 8, poster },
    { id: '02', name: 'game', hours: 30, poster: null },
    { id: '03', name: 'Game', hours: null },
    { id: '04', name: 'Unknown game', hours: null },
    { id: '05', name: 'Game II', hours: 12 },
  ] }]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].hours, 38);
  assert.equal(ranked[0].experiences.length, 3);
  assert.equal(ranked[0].knownHoursCount, 2);
  assert.deepEqual(ranked[0].poster, poster);
});

test('platform distribution respects the requested order and keeps every entry', () => {
  const games = ['Steam_Deck', 'PS4', 'Desktop_PC', 'iPad', 'PS3', 'Laptop_PC', 'Desktop_PC', undefined].map((platform) => ({ platform }));
  const distribution = platformDistribution(games);
  assert.deepEqual(distribution.map(({ key }) => key), ['iPad', 'PS3', 'PS4', 'Laptop_PC', 'Desktop_PC', 'Steam_Deck', 'unknown']);
  assert.equal(distribution.reduce((sum, { count }) => sum + count, 0), games.length);
  assert.equal(distribution.find(({ key }) => key === 'Desktop_PC').count, 2);
});
