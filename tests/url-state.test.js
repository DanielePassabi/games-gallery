import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFilterState, serializeFilterState } from '../src/url-state.js';

const choices = { platforms: ['Desktop_PC', 'Steam_Deck'], years: [2026, 2025] };

test('parses a valid filter URL', () => {
  assert.deepEqual(
    parseFilterState('?q=resident&status=completed&platform=Steam_Deck&year=2026&screenshots=1&view=timeline', choices),
    { query: 'resident', status: 'completed', platform: 'Steam_Deck', year: '2026', screenshots: true, view: 'timeline' },
  );
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
