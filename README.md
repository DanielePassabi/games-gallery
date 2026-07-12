# Games Gallery

Standalone static application for the MindMash games archive. It is intentionally independent from Docusaurus so that covers and screenshots are not part of the main MindMash build.

## Local development

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Changes to source files, data and assets are picked up by the development server.

## Add or update a game

1. Edit `data/games_YYYY.json` using this schema:

   ```json
   {
     "id": "01",
     "name": "Game title",
     "hours": 12,
     "status": "completed",
     "platform": "Desktop_PC",
     "notes": "Optional note"
   }
   ```

   `hours` can be `null`. Valid statuses are `completed`, `unfinished` and `multiplayer`. `platform` and `notes` are optional.

2. Add the poster as `public/assets/games/YYYY/ID.jpg` (also supports PNG, JPEG, WebP and GIF).
3. Optionally add screenshots inside `public/assets/games/YYYY/ID/`. The folder is the only signal used to enable the screenshot gallery; no JSON flag is needed.
4. Run validation:

   ```bash
   npm run validate
   ```

Years and asset paths are derived at build time. `public/data/catalog.json` is generated and must not be edited or committed.

The same process creates cached WebP derivatives in `public/generated/`: 640×360 posters for cards and 480×270 thumbnails for screenshot grids. Original screenshots are loaded only by the fullscreen viewer. Generated files are ignored by Git and rebuilt only when their source image changes.

Search, status, platform, year, screenshot-only filters and the selected Grid/Timeline view are stored in the URL, so the current view survives refreshes and browser back/forward navigation.

The Timeline uses each year as a container, from 2016 to the current catalog year. Games keep the order in which they appear in the yearly JSON; no month or day information is inferred.

## Production build

```bash
npm run build
npm run preview
```

The deploy workflow publishes `dist/` to GitHub Pages. The expected production URL is `https://danielepassabi.github.io/games-gallery/`.

## Legacy tools

The previous image-processing notebooks and unused audio files are preserved in `legacy/` for reference. They are not part of the application or deploy output.
