import { defineConfig } from 'vite';
import path from 'node:path';
import { generateCatalog } from './scripts/generate-catalog.mjs';

function catalogPlugin() {
  let regenerationTimer;

  return {
    name: 'games-catalog',
    async buildStart() {
      await generateCatalog();
    },
    configureServer(server) {
      const watchedPaths = ['data', 'public/assets/games', 'public/assets/platforms'];
      server.watcher.add(watchedPaths);

      const regenerate = (changedPath) => {
        const relativePath = path.relative(server.config.root, changedPath).replaceAll('\\', '/');
        if (!watchedPaths.some((watchedPath) => (
          relativePath === watchedPath || relativePath.startsWith(`${watchedPath}/`)
        ))) return;

        clearTimeout(regenerationTimer);
        regenerationTimer = setTimeout(async () => {
          try {
            await generateCatalog();
            server.ws.send({ type: 'full-reload' });
          } catch (error) {
            server.config.logger.error(error.stack ?? error.message);
          }
        }, 100);
      };

      server.watcher.on('add', regenerate);
      server.watcher.on('change', regenerate);
      server.watcher.on('unlink', regenerate);
    },
  };
}

export default defineConfig({
  base: '/games-gallery/',
  plugins: [catalogPlugin()],
});
