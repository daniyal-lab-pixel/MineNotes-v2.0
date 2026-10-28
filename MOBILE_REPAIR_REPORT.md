# MineNotes v2.0 — Mobile Repair Report

**Date:** 28 October 2026  
**Source:** https://github.com/daniyal-lab-pixel/Minenotes  
**Upstream commit:** `98467fea592b44acd507080f0e3142de01908961`  
**Local branch:** `repair/mobile-optimized`

The existing React/TypeScript project was repaired in an independent clone. The ZIP attachments were unavailable, so the repository supplied in the follow-up message was used as the source. The original upstream branch and its history were preserved. No remote commits, pushes, merges or production deployments were made.

## Result and scope

The phone menu now fits the full existing branding; the Bookshelf has responsive book rows and tap controls; compact screens render a real single-page writing surface; and the phone Jukebox has a dedicated view with a return action that pauses playback. Existing desktop two-page editing, storage, artwork, weather, custom covers, shelves, formatting and music features remain in the project.

**Verification:** TypeScript, lint, 75 unit tests, 14 Chromium browser workflows and the production build pass. This is viewport and browser automation evidence, not physical iPhone or Android verification. Live YouTube streaming could not be verified because the external API request failed in this environment.

## Confirmed problems and repairs

### Main menu and loading

- `MainMenu.tsx` originally rendered an empty branding spacer over `main_menu_backdrop.jpg`. The lettering, book and yellow creator splash are baked into that wide image. CSS `background-size: cover` necessarily cropped that composition on portrait phones.
- The repository already contains `minenotes_3d_logo.png`, including the original 3D lettering, book and angled creator text. Phones and narrow tablets now use this image at its natural aspect ratio over the existing clean jungle panorama. Desktop retains its original backdrop composition.
- Navigation, footer controls and safe areas have explicit room. Short landscape menus use two button columns. No CSS zoom was introduced.
- The loading artwork uses its complete width on compact screens, rather than cropping the lettering. Its loading and error workflow remains present.

### Bookshelf

- Shelf rows were always chunked in groups of six, while individual mobile book slots were only 64px wide. Controls wrapped inefficiently, titles were cramped, and the shelf window stretched almost to the entire phone height even with one book.
- Shelf rows now contain two books below 390px and three from 390px through the tablet breakpoint. Inventory mode uses the same responsive column policy. Existing wood textures and cover artwork are retained.
- The mobile window grows with its contents and becomes scrollable when needed. Search, sorting and view buttons have compact rows with readable 16px form text. Long titles use bounded, separate two-line labels.
- Touch users open a book with one tap. Desktop retains selection, double-click opening and hover tooltips. Book options are visible on phones, keyboard focusable and open a scrollable action sheet.
- Manage Shelves is reachable on mobile. Cover, shelf and confirmation dialogs fit the available viewport and use focus management. Covers, favorites, shelf IDs and saved note content are preserved.

### Editor, pagination and saving

- Fixed book dimensions, a cramped HUD, globally disabled selection and 14px editable text were unsuitable for Safari phones. Viewport metadata also explicitly disabled pinch zoom.
- Compact screens now render a single-page editor in React. The facing editor is inactive and non-editable there; desktop two-page mode remains available. The active facing page is retained when moving to a compact viewport.
- Mobile writing uses selectable 16px text, the original parchment/red stitching, usable page arrows and a compact actions menu. Page position and save status remain visible in the HUD. When a keyboard or short landscape viewport leaves insufficient room, the workspace and page content can scroll without stretching the artwork.
- All content still uses the existing canonical pagination engine, page array and saved format. Pagination measures the canonical page dimensions instead of the phone's changing display geometry. Resizing and changing views do not create document copies or repaginate saved pages.
- Overflow handling no longer ignores input for a fixed 60ms interval. IME composition is allowed to finish before committing the composed content. Rich text is split through the existing HTML-preserving engine.
- Inactive-editor update events are suppressed, avoiding phantom blank facing pages. Intentionally blank middle pages now survive parsing and serialization. Deferred Tiptap initialization and destroyed-instance guards keep the editor compatible with lazy loading and React lifecycle changes.
- Save writes are serialized. Pending work is flushed on Done, signing, backgrounding and page exit where the browser allows it. A failed Done save keeps the editor open and exposes Retry, instead of navigating away from unsaved text. Sudden process termination remains subject to browser persistence limits.

### Jukebox

- The application-level player previously remained in a fixed floating window that covered the phone book. Compact screens now show a full-screen music view while leaving the note editor mounted and inert behind it.
- Back to Book pauses and closes/destroys the phone player before returning to writing. Custom songs and playlists remain stored, and reopening refreshes the library from IndexedDB so restored music is visible without an application reload.
- Desktop minimize/expand preserves the same iframe. Automated tests check a single iframe and its identity through that flow.
- The official player viewport has at least 200px of content height and width in tested layouts. Buffering, offline and error notices are outside the iframe, not over its controls. Inline playback is requested for mobile Safari. Backgrounding pauses playing/buffering media; there is no hidden audio-only playback mode.
- Playing and buffering labels use YouTube player events. An attached player's pause status is also event-derived; destroying a player confirms it has stopped.
- The existing playlist catalog, custom links, volume, mute, loop, shuffle and unavailable-track handling are retained.

Implementation was checked against the [official IFrame API requirements](https://developers.google.com/youtube/iframe_api_reference#Requirements) and [YouTube's developer policies](https://developers.google.com/youtube/terms/developer-policies#i.-additional-prohibitions). This report does not certify platform policy approval or live playback availability.

### Viewports, dialogs and PWA

- Shared safe-area tokens, dynamic viewport sizing and a VisualViewport hook handle changing browser chrome and keyboard-sized layouts. The hook avoids overriding a user's pinch-zoom scale.
- Pinch zoom is enabled again. Compact form controls use at least 16px text to avoid normal Safari input-focus zoom. Text selection is enabled in editing and input surfaces.
- Settings, History, Welcome, loading and modal surfaces were audited for fixed viewport sizing, scrolling, text wrapping and reachable actions. Larger mobile targets were applied in scoped component styles.
- The Dexie database name, schema versions and migration chain are unchanged. No user database deletion, migration reset or cache-clearing workaround was introduced.
- PWA updates now use a user-triggered prompt outside the editor rather than forcing an update while writing. The production service worker precaches the lazy chunks and assets needed for offline editing. Actual offline reload and save were verified.
- PDF and backup object URLs remain valid longer so Safari can begin asynchronous downloads. The existing file-import preview and merge restore workflow is retained.

## Performance

The baseline bundled the editor and PDF exporter into the initial application script. The editor, Bookshelf, Settings, History and PDF exporter now load as separate chunks.

| Build measurement | Before | After |
| --- | ---: | ---: |
| Initial application JavaScript, minified | 1,324.63 kB | about 406.6 kB |
| Initial application JavaScript, gzip | 449.81 kB | about 123.1 kB |
| PDF exporter | included in initial script | about 424.2 kB lazy chunk |
| Editor | included in initial script | about 436.8 kB lazy chunk |

This reduces the initial application script by roughly 69% minified / 73% gzip. These are bundle measurements, not measured LCP or CPU benchmarks. The service worker still caches all required app chunks for offline use, so total offline installation traffic is not reduced by the same percentage.

The main pixel font is preloaded. Menu particles respect reduced motion. Menu and weather animation loops stop when the document is hidden and resume when visible. List debounce/hover timers are cleaned up when components unmount. No replacement artwork or reduction in texture quality was required.

## Checks and evidence

Environment: Node.js 24.22.1; Linux; headless Chromium 153.0.8010.0; Playwright test package recorded in the lockfile.

| Check | Result |
| --- | --- |
| Dependency installation | `npm ci` and added Playwright dependency succeeded |
| `npm run typecheck` | passed |
| `npm run lint` | passed, no source warnings in final run |
| `npm test` | 9 files, 75 tests passed (baseline: 74) |
| Production build | passed; PWA service worker generated |
| Portable Playwright workflows | 14 passed; no failures or skipped workflows |
| PDF verification | browser download succeeded; generated PDF opens with 4 pages and expected title metadata |
| Backup/restore | browser export, import preview and merge restore preserved the saved book |
| Offline | service-worker-controlled reload, editing and save passed with network disabled |
| Source diff | whitespace check passed |

The eight viewport workflows ran at:

| Viewport | Result |
| --- | --- |
| 320 × 568 | passed |
| 375 × 667 | passed |
| 390 × 844 | passed |
| 393 × 852 | passed |
| 430 × 932 | passed |
| 768 × 1024 | passed |
| 1366 × 768 | passed |
| 1920 × 1080 | passed |

Each checks menu layout/navigation, native keyboard typing, saving, Jukebox return, Bookshelf search/opening, reload persistence, History, Settings and horizontal page overflow. Additional workflows cover active facing-page preservation across viewport switches, bold/center formatting, long-paste pagination without lost text, PDF export, backup restore, offline editing, covers/favorites/shelf changes, custom music preservation, four weather presets, a short landscape/keyboard-sized viewport and injected storage failure with retry.

All browser fixtures use `?testMode=true` and `MineNotesTestDB` in fresh browser contexts. The tests assert that `MineNotesDB` was not created in those contexts.

Current screenshots and logs are in `validation/`, including menu/editor/Bookshelf captures at all eight viewport sizes, desktop two-page mode, a keyboard-sized view, and the compact loading screen. `browser-results.json` is the machine-readable result. `mobile-export.pdf` and `mobile-backup.json` contain test fixtures only.

**YouTube test boundary:** deterministic browser tests supply a simulated YouTube IFrame API. They verify UI navigation, event handling, player dimensions and duplicate-player prevention, not streamed media. A separate live API attempt returned `net::ERR_EMPTY_RESPONSE`; `live-youtube-attempt.json` records that failure. Jukebox screenshots from the deterministic tests therefore contain a test iframe.

## Remaining verification before publishing

1. Physical iPhone Safari: predictive text/IME, selection handles, soft-keyboard transitions, rotation and pinch zoom. Chromium touch/viewport emulation is not physical Safari verification.
2. iPhone Home Screen PWA and Android Chrome/installed PWA: install, cold launch, suspended-app resume and real safe-area behavior.
3. WebKit execution could not run here: its browser download succeeded, but required GTK/GStreamer libraries were absent and the environment rejected dependency installation. The logs record that limitation.
4. Live YouTube: check permitted videos and playlists, user-gesture playback, network buffering and return-to-book behavior on the review origin. The external API was unavailable here.
5. Upgrade from the currently deployed service worker to the new prompt-based version using a review deployment. Offline operation passed; a live old-worker-to-new-worker update was not deployed or exercised.
6. Test PDF/backup downloads on actual iOS share/download UI. Automated Chromium downloads passed. Autosave cannot guarantee recovery if a device kills a process before IndexedDB commits.

No production deployment is included. Use `MOBILE_QUICK_START.md` to open the source locally. Localhost has its own storage origin; import a backup if you want to review a copy of your existing live books.

## Files modified or added

- `MOBILE_QUICK_START.md`
- `README.md`
- `MOBILE_REPAIR_REPORT.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `src/App.tsx`
- `src/components/ConfirmModal/ConfirmModal.module.css`
- `src/components/ConfirmModal/ConfirmModal.tsx`
- `src/components/EnvironmentBackground/EnvironmentBackground.tsx`
- `src/components/PixelButton/PixelButton.module.css`
- `src/components/PwaUpdateNotice/PwaUpdateNotice.module.css`
- `src/components/PwaUpdateNotice/PwaUpdateNotice.tsx`
- `src/features/bookshelf/BookActionsMenu.module.css`
- `src/features/bookshelf/BookActionsMenu.tsx`
- `src/features/bookshelf/BookCoverPicker.module.css`
- `src/features/bookshelf/BookCoverPicker.tsx`
- `src/features/bookshelf/BookItem.module.css`
- `src/features/bookshelf/BookItem.tsx`
- `src/features/bookshelf/BookshelfGrid.module.css`
- `src/features/bookshelf/BookshelfGrid.tsx`
- `src/features/bookshelf/BookshelfToolbar.module.css`
- `src/features/bookshelf/BookshelfToolbar.tsx`
- `src/features/bookshelf/BookshelfView.module.css`
- `src/features/bookshelf/ShelfManager.module.css`
- `src/features/bookshelf/ShelfManager.tsx`
- `src/features/bookshelf/ShelfSelector.module.css`
- `src/features/bookshelf/ShelfSelector.tsx`
- `src/features/editor/BookEditor.module.css`
- `src/features/editor/BookEditor.tsx`
- `src/features/editor/EnvironmentSelector/EnvironmentSelector.module.css`
- `src/features/editor/EnvironmentSelector/EnvironmentSelector.tsx`
- `src/features/editor/FormattingDrawer.module.css`
- `src/features/editor/FormattingDrawer.tsx`
- `src/features/editor/SignModal.module.css`
- `src/features/editor/SignModal.tsx`
- `src/features/editor/pagination/paginationEngine.ts`
- `src/features/editor/pdf/pdfExportService.ts`
- `src/features/history/HistoryView.module.css`
- `src/features/jukebox/AddMusicModal.tsx`
- `src/features/jukebox/JukeboxPanel.module.css`
- `src/features/jukebox/PersistentJukebox.tsx`
- `src/features/jukebox/YouTubePlayer.tsx`
- `src/features/jukebox/jukeboxController.ts`
- `src/features/loading/LoadingScreen.module.css`
- `src/features/menu/MainMenu.module.css`
- `src/features/menu/MainMenu.tsx`
- `src/features/settings/SettingsView.module.css`
- `src/features/welcome/WelcomeBook.module.css`
- `src/hooks/useDialogFocus.ts`
- `src/hooks/useMediaQuery.ts`
- `src/hooks/useVisualViewport.ts`
- `src/storage/backupService.ts`
- `src/styles/global.css`
- `src/styles/tokens.css`
- `src/tests/pagination.test.ts`
- `src/vite-env.d.ts`
- `tests/browser/mobile.spec.ts`
- `vite.config.ts`
- `vitest.config.ts`

## Delivery contents

`MineNotes-v2.0-Mobile-Optimized.zip` contains the complete tracked project, repaired React/TypeScript source, public assets, dependency manifest and lockfile, existing and new tests, quick-start guide, this report and selected current verification evidence. It excludes `node_modules`, build output, browser profiles, failed-test traces and transient caches.

`provenance/MineNotes-history.bundle` preserves the upstream history and the local repair commit. `provenance/source-revision.txt` identifies the packaged source revision. The extracted source runs directly without restoring the bundle.
