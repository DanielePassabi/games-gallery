import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(projectRoot, 'data');
const gamesDirectory = path.join(projectRoot, 'public', 'assets', 'games');
const platformsDirectory = path.join(projectRoot, 'public', 'assets', 'platforms');
const generatedDirectory = path.join(projectRoot, 'public', 'generated');
const outputFile = path.join(projectRoot, 'public', 'data', 'catalog.json');
const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);
const validStatuses = new Set(['completed', 'unfinished', 'multiplayer']);
const naturalSort = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listImages(directory, recursive = false) {
  if (!(await exists(directory))) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const images = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && recursive) {
      images.push(...await listImages(entryPath, true));
    } else if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      images.push(entryPath);
    }
  }
  return images.sort((left, right) => naturalSort(left, right));
}

function toPublicUrl(filePath) {
  return path.relative(path.join(projectRoot, 'public'), filePath).split(path.sep).join('/');
}

function derivedImagePath(sourcePath, category) {
  const relativePath = path.relative(gamesDirectory, sourcePath);
  const parsed = path.parse(relativePath);
  const sourceExtension = parsed.ext.slice(1).toLowerCase();
  return path.join(generatedDirectory, category, parsed.dir, `${parsed.name}-${sourceExtension}.webp`);
}

async function ensureDerivedImage(sourcePath, outputPath, { width, height, quality }) {
  const sourceStats = await stat(sourcePath);
  if (await exists(outputPath)) {
    const outputStats = await stat(outputPath);
    if (outputStats.size > 0 && outputStats.mtimeMs >= sourceStats.mtimeMs) return outputPath;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(sourcePath)
    .rotate()
    .resize({ width, height, fit: 'cover', position: 'centre', withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(outputPath);
  return outputPath;
}

function validateGame(game, context) {
  invariant(game && typeof game === 'object' && !Array.isArray(game), `${context}: expected an object`);
  invariant(typeof game.id === 'string' && game.id.trim(), `${context}: id must be a non-empty string`);
  invariant(typeof game.name === 'string' && game.name.trim(), `${context}: name must be a non-empty string`);
  invariant(validStatuses.has(game.status), `${context}: invalid status "${game.status}"`);
  invariant(game.hours === null || (typeof game.hours === 'number' && Number.isFinite(game.hours) && game.hours >= 0), `${context}: hours must be a non-negative number or null`);
  invariant(game.platform === undefined || (typeof game.platform === 'string' && game.platform.trim()), `${context}: platform must be a non-empty string when present`);
  invariant(game.notes === undefined || (typeof game.notes === 'string' && game.notes.trim()), `${context}: notes must be a non-empty string when present`);
}

async function findPoster(yearDirectory, gameId) {
  const candidates = (await listImages(yearDirectory)).filter(
    (filePath) => path.basename(filePath, path.extname(filePath)) === gameId,
  );
  invariant(candidates.length <= 1, `${path.basename(yearDirectory)}/${gameId}: multiple posters found`);
  return candidates[0] ?? null;
}

async function buildYear(fileName, { write }) {
  const year = Number(fileName.match(/^games_(\d{4})\.json$/)?.[1]);
  invariant(Number.isInteger(year), `${fileName}: invalid filename, expected games_YYYY.json`);

  const source = JSON.parse(await readFile(path.join(dataDirectory, fileName), 'utf8'));
  invariant(Array.isArray(source), `${fileName}: root value must be an array`);

  const ids = new Set();
  const yearDirectory = path.join(gamesDirectory, String(year));
  invariant(await exists(yearDirectory), `${fileName}: missing asset directory public/assets/games/${year}`);

  const games = [];
  for (const [index, game] of source.entries()) {
    const context = `${fileName}[${index}]`;
    validateGame(game, context);
    invariant(!ids.has(game.id), `${context}: duplicate id "${game.id}"`);
    ids.add(game.id);

    const poster = await findPoster(yearDirectory, game.id);
    const screenshots = await listImages(path.join(yearDirectory, game.id), true);
    const platformIcon = game.platform
      ? path.join(platformsDirectory, `${game.platform}.png`)
      : null;

    if (platformIcon) {
      invariant(await exists(platformIcon), `${context}: missing platform icon ${game.platform}.png`);
    }

    let posterAsset = null;
    if (poster) {
      const posterThumbnail = derivedImagePath(poster, 'posters');
      if (write) await ensureDerivedImage(poster, posterThumbnail, { width: 640, height: 360, quality: 78 });
      posterAsset = { src: toPublicUrl(poster), thumbnail: toPublicUrl(posterThumbnail) };
    }

    const screenshotAssets = [];
    for (const screenshot of screenshots) {
      const screenshotThumbnail = derivedImagePath(screenshot, 'screenshots');
      if (write) await ensureDerivedImage(screenshot, screenshotThumbnail, { width: 480, height: 270, quality: 72 });
      screenshotAssets.push({ src: toPublicUrl(screenshot), thumbnail: toPublicUrl(screenshotThumbnail) });
    }

    games.push({
      id: game.id,
      name: game.name.trim(),
      hours: game.hours,
      status: game.status,
      ...(game.notes ? { notes: game.notes.trim() } : {}),
      ...(game.platform ? { platform: game.platform } : {}),
      poster: posterAsset,
      screenshots: screenshotAssets,
    });
  }

  const assetEntries = await readdir(yearDirectory, { withFileTypes: true });
  const assetIds = assetEntries.flatMap((entry) => {
    if (entry.isDirectory()) return [entry.name];
    if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      return [path.basename(entry.name, path.extname(entry.name))];
    }
    return [];
  });
  const orphanIds = [...new Set(assetIds.filter((id) => !ids.has(id)))];
  if (orphanIds.length > 0) {
    console.warn(`${year}: ignoring assets without matching game data: ${orphanIds.join(', ')}`);
  }

  return { year, games };
}

export async function generateCatalog({ write = true } = {}) {
  const dataFiles = (await readdir(dataDirectory))
    .filter((fileName) => /^games_\d{4}\.json$/.test(fileName))
    .sort(naturalSort);
  invariant(dataFiles.length > 0, 'No data/games_YYYY.json files found');

  const years = await Promise.all(dataFiles.map((fileName) => buildYear(fileName, { write })));
  years.sort((left, right) => right.year - left.year);

  const catalog = { schemaVersion: 2, years };
  if (write) {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, `${JSON.stringify(catalog)}\n`, 'utf8');
  }

  const gameCount = years.reduce((total, entry) => total + entry.games.length, 0);
  const screenshotCount = years.reduce(
    (total, entry) => total + entry.games.reduce((sum, game) => sum + game.screenshots.length, 0),
    0,
  );
  console.log(`Catalog valid: ${gameCount} games, ${years.length} years, ${screenshotCount} screenshots.`);
  return catalog;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateCatalog({ write: !process.argv.includes('--check') }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
