# MineNotes v2.0 Release Notes

**Release Date:** October 23, 2026  
**Status:** **READY — PRODUCTION STABLE**  
**Author:** Crafted by Daniyal  

---

## Executive Summary

MineNotes v2.0 represents the definitive, production-hardened release of the Minecraft-inspired digital notebook and bookshelf ecosystem. This release brings together the immersive dual-page Book & Quill editor, the wooden Bookshelf library update with custom book covers and custom shelves, procedural weather atmospheres, a persistent YouTube Jukebox, and comprehensive data protection.

All interaction bugs, tooltip clipping issues, and developer clutter have been eliminated with **zero redesign**—preserving the visual integrity, sound effects, typography, and theme.

---

## Key Achievements in v2.0

### 1. Zero-Clipping Bookshelf Tooltip Engine
- **Root Cause Eliminated**: Resolved the container overflow boundary clipping on `.bookshelfCanvas` by rendering tooltips via a top-level React portal (`createPortal(..., document.body)`).
- **Collision Detection**: Tooltips dynamically evaluate viewport bounds and available headroom/footroom. If a book on the top row is hovered, the tooltip smoothly flips below; on middle and bottom rows, it chooses the optimal placement and clamps within horizontal viewport margins.
- **Visual Polish**: 70ms hover debounce eliminates rapid flickering; tooltips automatically close on book selection; full keyboard focus support (`onFocus`/`onBlur`) is provided.

### 2. Isolated Test Data Architecture
- **No More Polluted Libraries**: Implemented dynamic database routing in `database.ts`. Test suites and browser automation now operate exclusively on `MineNotesTestDB`.
- **User Library Protected**: Real user notes inside `MineNotesDB` are never contaminated or overwritten during test runs.

### 3. Developer Tools Quarantine
- **Clean Normal UI**: Removed all "Clean Notes" and development test actions from the Bookshelf toolbar and sidebar.
- **Dedicated Dev Tools**: Moved fixture review and safe cleanup utilities into `Settings → Developer Tools`.
- **Tree-Shaken in Production**: Developer utilities are guarded by `import.meta.env.DEV`, automatically excluding them from production user builds.

### 4. Full-Library Backup & Safe Restore (v2)
- **Version 2 Backup Schema**: Backs up all notes, book covers, custom shelves, shelf assignments, user preferences, and custom YouTube playlist metadata.
- **Restore Preview**: Users can inspect the exact number of books, shelves, and covers before confirming restoration.
- **Safe Merge Mode**: Existing notes and preferences are never deleted during restoration.

### 5. Smart Title Derivation
- Automatically suggests note titles derived from the first non-empty text line for new untitled notes upon autosave.
- Existing custom-named notes and user edits are strictly protected against overwrites.

### 6. Performance & Quality Assurance
- **Bundle Optimization**: Production bundle built cleanly with Vite and TypeScript (0 type errors).
- **Linter Clean**: 0 warnings and 0 errors reported by `oxlint src` across 62 files.
- **Test Coverage**: 74 automated unit & integration tests passing 100% across 9 suites.
- **Cross-Platform Responsive**: Tested across desktop (1920x1080, 1280x720) and mobile (390x844).
