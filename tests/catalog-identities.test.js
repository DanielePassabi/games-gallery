import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { filterYears } from '../src/stats.js';
import { rankedGames } from '../src/statistics-data.js';

const loadYear = async (year) => ({
  year,
  games: JSON.parse(await readFile(new URL(`../data/games_${year}.json`, import.meta.url), 'utf8')),
});

test('God of War replays combine across devices without including the original Greek game', async () => {
  const years = await Promise.all([2019, 2022].map(loadYear));
  const search = filterYears(years, { query: 'god of war', status: 'all' });
  const ranking = rankedGames(search);

  assert.deepEqual(ranking.map(({ name, hours }) => ({ name, hours })), [
    { name: 'God of War (2018)', hours: 67 },
    { name: 'God of War (2005)', hours: 8 },
  ]);
  assert.deepEqual(ranking[0].experiences.map(({ year, platform }) => ({ year, platform })), [
    { year: 2019, platform: 'PS4' },
    { year: 2022, platform: 'Desktop_PC' },
  ]);
  const originalOnly = filterYears(years, { query: ranking[1].name, status: 'all' });
  assert.equal(originalOnly.flatMap(({ games }) => games).length, 1);
});

test('Modern Warfare 2 originals and reboot remain separately searchable without inventing unknown hours', async () => {
  const years = await Promise.all([2016, 2022].map(loadYear));
  const titles = ['Call of Duty: Modern Warfare 2 (2009)', 'Call of Duty: Modern Warfare II (2022)'];
  for (const title of titles) {
    const matches = filterYears(years, { query: title, status: 'all' }).flatMap(({ games }) => games);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, title);
  }
  const rankedTitles = rankedGames(years, 100).map(({ name }) => name);
  assert.ok(rankedTitles.includes(titles[0]));
  assert.ok(!rankedTitles.includes(titles[1]));
});
