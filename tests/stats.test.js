import assert from 'node:assert/strict';
import test from 'node:test';
import { filterYears, summarize, summarizeYear } from '../src/stats.js';

const years = [
  {
    year: 2026,
    games: [
      { name: 'Alpha', hours: 10, platform: 'Desktop_PC', screenshots: [{}], status: 'completed' },
      { name: 'Beta', hours: null, platform: 'Steam_Deck', screenshots: [], status: 'unfinished' },
      { name: 'Gamma', hours: 5.5, platform: 'Desktop_PC', screenshots: [{}], status: 'multiplayer' },
    ],
  },
  {
    year: 2025,
    games: [{ name: 'Another Alpha', hours: 2, platform: 'Steam_Deck', screenshots: [], status: 'completed' }],
  },
];

test('filters by status and removes empty years', () => {
  assert.deepEqual(filterYears(years, { query: '', status: 'multiplayer' }), [
    { year: 2026, games: [years[0].games[2]] },
  ]);
});

test('search is case-insensitive and works across years', () => {
  const result = filterYears(years, { query: 'ALPHA', status: 'all' });
  assert.equal(result.length, 2);
  assert.equal(result.flatMap(({ games }) => games).length, 2);
});

test('filters by platform together with the other filters', () => {
  const result = filterYears(years, { platform: 'Steam_Deck', query: 'alpha', status: 'completed' });
  assert.deepEqual(result, [{ year: 2025, games: [years[1].games[0]] }]);
});

test('filters by year and screenshot availability', () => {
  const result = filterYears(years, {
    platform: 'all',
    query: '',
    screenshots: true,
    status: 'all',
    year: '2026',
  });
  assert.deepEqual(result, [{ year: 2026, games: [years[0].games[0], years[0].games[2]] }]);
});

test('summaries ignore unknown hours and calculate completion rate', () => {
  assert.deepEqual(summarize(years), {
    games: 4,
    completed: 2,
    completionRate: 50,
    knownHoursGames: 3,
    hours: 17.5,
    days: 0.7,
  });
  assert.deepEqual(summarizeYear(years[0].games), {
    games: 3,
    completed: 1,
    unfinished: 1,
    multiplayer: 1,
    hours: 15.5,
  });
});
