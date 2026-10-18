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

   Use the same title for replays of the same game. Distinguish unrelated games with the same name using their original release year, such as `God of War (2005)` and `God of War (2018)`. The year in the filename remains the year played; `platform` is the device used to play, including emulation. Keep explicitly recorded remakes, remasters, expansions and collections distinct rather than guessing how to divide their hours. See [the catalog identity audit](docs/catalog-audit.md).

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

The compact summary always describes the entire archive. Explore retains its Grid/Timeline views and all existing filters. The separate Statistics section compares any subset of years, independently from Explore's filters. The section, statistics tab and selected years are also stored in the URL.

Statistics includes yearly activity and hours, completion, a numeric histogram with 10–150 adjustable intervals (40 by default), and a ranking expandable from six to fifty distinct games. Histogram granularity is stored in the URL. Changing the interval count preserves the same observations, domain, mean and median.

The ranking sums known hours for each title within the selected years and shows a cover plus a bar segmented by individual experience. Missing hours remain unknown; an available cover from another experience is used when needed. Clicking a ranked game searches its name across all years and platforms in Explore. The archive, timeline and histogram still retain individual entries. Platform evolution and the treemap follow this order: iPad, PS3, PS4, Laptop PC, Desktop PC, Steam Deck.

On phones and smaller tablets, only a compact search row remains sticky. The Filters button opens the existing status, platform, year and screenshot controls in a native modal sheet, with an active count, live result count and reset that preserves the search. Resizing to desktop restores the same controls to the toolbar. The compact layout also applies to short landscape screens up to 1100px wide. Statistics keeps the multi-year selector in a collapsible Period control, and yearly charts scroll horizontally when needed to preserve readable labels. Timeline captions remain visible on touch screens. Screenshot controls respect safe areas and the dynamic viewport; the viewer supports horizontal swipes and retains its buttons and filmstrip.

## Production build

```bash
npm run build
npm run preview
```

The deploy workflow publishes `dist/` to GitHub Pages. The expected production URL is `https://danielepassabi.github.io/games-gallery/`.

## Legacy tools

The previous image-processing notebooks and unused audio files are preserved in `legacy/` for reference. They are not part of the application or deploy output.
