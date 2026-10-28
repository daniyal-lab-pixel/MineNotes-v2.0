# Changelog

All notable changes to **MineNotes** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-10-23

### Added
- **Collision-Aware Tooltip Portals**: Book tooltips render through React portals directly into `document.body` with automatic flip (detecting available headroom/footroom) and horizontal clamping to prevent overflow clipping in scrollable bookshelf canvases.
- **Test-Data Isolation Engine**: Automated tests and test suites now operate exclusively on `MineNotesTestDB` (`isTestEnvironment()` check), ensuring real user libraries are never polluted with development fixtures.
- **Developer Tools Quarantine**: Moved developer cleanup actions out of normal user Bookshelf toolbars/sidebars into `Settings → Developer Tools`, conditionally rendered only in development builds (`import.meta.env.DEV`).
- **Version 2 Full-Library Backup**:
  - Upgraded backup schema to v2, exporting complete subsystems (notes, custom covers, custom shelves, user settings, custom YouTube songs and playlists).
  - Backward compatibility with v1 backups.
  - Added `previewBackup()` method providing preview counts before importing.
  - Safe merge restore mode preventing accidental deletion of existing notes.
- **Intelligent Untitled Note Handling**: Derives non-destructive suggested titles from the first written line upon autosave while strictly preserving user-entered custom titles.
- **Debounced Bookshelf Search**: 120ms debounced search with instant clear `[✕]` button to keep UI responsive.
- **Atmosphere Modes**: Clear Day, Rain with ground splashes, Snow with drifting flakes, and Night with twinkling stars and fireflies.
- **Persistent YouTube Jukebox**: Single-player audio architecture with official C418 catalog, custom track/playlist imports, and compliant visible player.
- **Comprehensive Regression Suite**: 74 automated unit & integration tests covering all subsystems.

### Fixed
- **Tooltip Clipping**: Fixed issue where book tooltips on the top row were cut off by `.bookshelfCanvas` overflow boundaries.
- **Neighbor-Shelf Overlap**: Fixed stacking context collisions where lower wooden shelves overlapped upper-shelf tooltips.
- **React 19 Lint Warnings**: Cleaned up ref access during render in `BookItem.tsx` and synchronous `setState` in effects across `BookItemTooltip.tsx` and `BookshelfToolbar.tsx`.
- **Selected-Book Stability**: Resolved duplicate/sticky tooltips appearing when a book was actively selected.

### Changed
- Promoted application version across `package.json`, PWA manifest, Main Menu, and Settings to **v2.0.0**.
- Cleaned Bookshelf toolbar and sidebar, removing test cleanup buttons to present a pure Minecraft library interface.

---

## [1.0.0] - 2026-10-15

### Added
- Initial release of MineNotes.
- Authentic Minecraft Java Edition Book & Quill dual-page and single-page editor.
- Tiptap rich-text formatting with 16 Minecraft dyes.
- Procedural Web Audio sound effects for typewriter typing, page turns, and UI clicks.
- Dexie IndexedDB client-side persistence and autosave.
- Basic v1 JSON backup and restore.
- Installable offline Progressive Web App (PWA) with service worker precaching.
