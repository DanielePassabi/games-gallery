import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeVideos, mediaSummary, youtubeUrls } from '../src/media.js';
import { generateCatalog } from '../scripts/generate-catalog.mjs';

const video = { provider: 'youtube', id: 'wTxTnhp3uck', title: 'Gameplay' };

test('video metadata is optional; order and meaningful titles are preserved', () => {
  assert.deepEqual(normalizeVideos(), []);
  assert.deepEqual(normalizeVideos([{ ...video, title: ' Gameplay ' }, { ...video, id: 'Wx-6PPB0fo0' }]), [video, { ...video, id: 'Wx-6PPB0fo0' }]);
});

test('invalid metadata and injected URLs fail catalog validation', () => {
  for (const input of [null, {}, [null], [{ ...video, provider: 'other' }], [{ ...video, id: 'https://youtu.be/wTxTnhp3uck' }], [{ ...video, id: '../bad?id=1' }], [{ ...video, title: ' ' }], [video, video]]) {
    assert.throws(() => normalizeVideos(input, 'game.videos'), /game.videos/);
  }
  assert.throws(() => youtubeUrls({ ...video, id: 'javascript:alert(1)' }), /invalid/);
  const urls = youtubeUrls(video);
  assert.equal(new URL(urls.embed).hostname, 'www.youtube-nocookie.com');
  assert.equal(new URL(urls.embed).searchParams.has('autoplay'), false);
  assert.equal(new URL(urls.watch).searchParams.get('v'), video.id);
});

test('media discovery supports photos only, videos only, both and neither', () => {
  assert.equal(mediaSummary({ screenshots: [{}] }), '1 foto');
  assert.equal(mediaSummary({ videos: [video] }), '1 video');
  assert.equal(mediaSummary({ screenshots: [{}, {}], videos: [video] }), '2 foto · 1 video');
  assert.equal(mediaSummary({}), '');
});

test('generated catalog includes all PRAGMATA media and keeps legacy entries compatible', async () => {
  const catalog = await generateCatalog({ write: false });
  const games = catalog.years.flatMap(({ games }) => games);
  const pragmata = games.find(({ name }) => name === 'PRAGMATA');
  assert.equal(pragmata.hours, 15);
  assert.equal(pragmata.status, 'completed');
  assert.equal(pragmata.screenshots.length, 7);
  assert.deepEqual(pragmata.videos.map(({ id }) => id), ['wTxTnhp3uck', 'Wx-6PPB0fo0', 'gQqWMnq-pbk']);
  assert.ok(games.some((game) => game.screenshots.length > 0 && game.videos.length === 0));
});
