# Open the mobile repair locally

1. Extract `MineNotes-v2.0-Mobile-Optimized.zip`.
2. Open its `MineNotes-v2.0-Mobile-Optimized` folder in VS Code or Antigravity.
3. Use Node.js 24 (verified with 24.22.1), then run:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production preview, including the service worker:

```bash
npm run build
npm run preview
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests build and start their own local preview. They use a fresh browser context and `?testMode=true`, which selects `MineNotesTestDB`. They do not use your live notes database. `CHROMIUM_PATH` is an optional override when an existing Chromium executable is needed; normal installations can omit it.

## Reviewing your own notes

Browser storage belongs to each website origin. Your live notes do not automatically appear on localhost. Export a backup from your current app, then import that backup into the local preview to review a copy of your books, covers, shelves and custom music. The existing database schema and migration chain are unchanged.

On phones, the Jukebox opens as a separate view. **Back to Book pauses music** and returns to the mounted editor. Desktop compact playback remains available with the official player visible.

## Before publishing

Read `MOBILE_REPAIR_REPORT.md`, especially the verification limits. Check Safari on a real iPhone, Home Screen installation, Android Chrome/PWA, live YouTube streaming and service-worker update behavior. No GitHub push or live deployment was performed.

The `provenance/MineNotes-history.bundle` file preserves the original Git history and the local repair commit. It is optional for running the app. To inspect that history in another directory:

```bash
git clone provenance/MineNotes-history.bundle MineNotes-history
```

Current screenshots and test evidence are in `validation/`. Upstream `TEST_REPORT.md`, `RELEASE_NOTES.md` and older screenshots are retained as historical project files; use the mobile repair report for this delivery's results.
