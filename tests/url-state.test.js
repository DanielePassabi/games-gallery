import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFilterState, parseStatisticsState, serializeFilterState, serializePageState } from '../src/url-state.js';

const choices = { platforms: ['Desktop_PC', 'Steam_Deck'], years: [2026, 2025] };

test('parses a valid filter URL', () => {
  assert.deepEqual(
    parseFilterState('?q=resident&status=completed&platform=Steam_Deck&year=2026&screenshots=1&view=timeline', choices),
    { query: 'resident', status: 'completed', platform: 'Steam_Deck', year: '2026', screenshots: true, view: 'timeline' },
  );
});

test('statistics compare multiple valid years without altering exploration filters', () => {
  const available = { years: [2016, 2025, 2026] };
  const search = '?q=zelda&year=2026&view=timeline&section=statistics&stats-tab=habits&stats-years=2026,2016,2025,2016,1990';
  const statistics = parseStatisticsState(search, available);
  assert.deepEqual(statistics, {
    section: 'statistics', statisticsTab: 'habits', statisticsYears: ['2016', '2025', '2026'], statisticsBins: 40,
  });
  const filters = parseFilterState(search, { ...available, platforms: [] });
  assert.equal(filters.query, 'zelda');
  assert.equal(filters.year, '2026');
  assert.equal(filters.view, 'timeline');
  const roundTrip = serializePageState({ ...filters, ...statistics });
  assert.deepEqual(parseStatisticsState(roundTrip, available), statistics);
  assert.deepEqual(parseFilterState(roundTrip, { ...available, platforms: [] }), filters);
});

test('statistics distinguish all years from an explicitly empty selection and recover invalid values', () => {
  assert.deepEqual(parseStatisticsState('', choices), {
    section: 'explore', statisticsTab: 'trend', statisticsYears: null, statisticsBins: 40,
  });
  assert.deepEqual(parseStatisticsState('?section=oops&stats-tab=oops&stats-years=1990', choices), {
    section: 'explore', statisticsTab: 'trend', statisticsYears: null, statisticsBins: 40,
  });
  const filters = parseFilterState('', choices);
  const state = { ...filters, section: 'statistics', statisticsTab: 'platforms', statisticsYears: [] };
  assert.deepEqual(parseStatisticsState(serializePageState(state), choices), {
    section: 'statistics', statisticsTab: 'platforms', statisticsYears: [], statisticsBins: 40,
  });
});

test('histogram granularity survives URL round trips and rejects invalid values', () => {
  const filters = parseFilterState('', choices);
  for (const statisticsBins of [10, 40, 75, 150]) {
    const state = { ...filters, section: 'statistics', statisticsTab: 'habits', statisticsYears: null, statisticsBins };
    assert.equal(parseStatisticsState(serializePageState(state), choices).statisticsBins, statisticsBins);
  }
  for (const value of ['0', '9', '151', '20.5', 'wrong']) {
    assert.equal(parseStatisticsState(`?stats-bins=${value}`, choices).statisticsBins, 40);
  }
});

test('discards invalid enum values from the URL', () => {
  assert.deepEqual(
    parseFilterState('?status=unknown&platform=GameBoy&year=1990&view=map', choices),
    { query: '', status: 'all', platform: 'all', year: 'all', screenshots: false, view: 'grid' },
  );
});

test('serializes only active filters', () => {
  assert.equal(
    serializeFilterState({ query: ' resident ', status: 'completed', platform: 'all', year: '2026', screenshots: true, view: 'timeline' }),
    '?q=resident&status=completed&year=2026&screenshots=1&view=timeline',
  );
  assert.equal(serializeFilterState({ query: '', status: 'all', platform: 'all', year: 'all', screenshots: false, view: 'grid' }), '');
});
