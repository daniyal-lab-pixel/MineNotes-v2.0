# MineNotes v2.0

> Mobile repair delivery: see [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) to run locally and [MOBILE_REPAIR_REPORT.md](MOBILE_REPAIR_REPORT.md) for current verification and limitations. No live deployment was made.

**Crafted by Daniyal**  
*An authentic Minecraft Java Edition–inspired Book & Quill personal notebook, Bookshelf Library, Persistent YouTube Jukebox, and offline installable Progressive Web Application (PWA).*

---

## 📖 Overview

**MineNotes v2.0** is an authentic, lightweight, pixel-perfect digital notebook inspired directly by the Minecraft Java Edition Book & Quill interface and Bookshelf systems. Rather than a modern web application with generic Minecraft styling slapped on top, MineNotes is architected from the ground up to feel like opening an authentic book and exploring a cozy library inside Minecraft.

### ✨ Highlights

- **Authentic Minecraft Loading Screen**: Near-black charcoal background (`#191919`), 3D stone beveled `MINENOTES` logo, spinning pixel arc indicator, and initialization tracking.
- **First-Launch Welcome Book**: Minecraft Book & Quill onboarding book with authentic red stitching along the left spine and a `[Done]` stone button.
- **Classic Minecraft Main Menu**: Voxel jungle environment with animated falling leaf particles, authentic stone-beveled buttons, audio feedback, and clean game navigation.
- **Desktop Open Book Editor**: Dual-page open book layout with center binding spine, leather rim, page headers (`Page 1 of N`, `Page 2 of N`), turn arrows, quill filigrees, and top-right close `✕` button.
- **Mobile Single-Page Editor**: Responsive portrait book with red stitching on the left edge, page turn controls, and compact toolbar.
- **Logical Pagination Engine**: Shared pagination system calculating exact text height and paragraph wrapping without text truncation or layout shifts.
- **Rich-Text & 16 Minecraft Dyes**: Tiptap-powered rich text with Bold, Italic, Underline, Font Family selector (Pixel font, Typewriter, Clean Sans), Undo/Redo, and a 16-color Minecraft dye hotbar tray.
- **Client-Side Persistence & Autosave**: Built on Dexie IndexedDB with 500ms debounced autosave, visual status indicator (`Saving...` / `Saved` / `Save failed`), and manual Save.
- **Intelligent Untitled Note Handling**: Derives non-destructive suggested titles from the first written line while strictly protecting user-entered titles from overwrites.
- **Authentic Wooden Bookshelf Library**:
  - Wooden shelf planks with aligned book slots and stand slots.
  - Custom Book Covers (Standard Leather, Enchanted Shimmer, Golden, Ancient, and 5 Dyed Leathers).
  - Collision-aware floating Minecraft purple tooltips rendered via portals to eliminate container clipping.
  - Custom Shelves management, favorites markers, live debounced search, and sorting.
- **Atmosphere Modes & Weather Canvas**:
  - Clear Day (blocky drifting clouds and summer pollen motes).
  - Rain (procedural angled raindrops and ground splashes).
  - Snow (gentle drifting wobbling snowflakes).
  - Night (twinkling pixel stars and ambient warm fireflies).
  - Reduced-motion and animation pause support.
- **Persistent YouTube Jukebox**:
  - Official C418 Minecraft soundtrack catalog (`Volume Alpha` & `Volume Beta`).
  - Custom YouTube song and playlist links with custom disc dyes.
  - Visible embedded player complying with YouTube terms (200x200 minimum dimension, zero hidden audio workarounds).
  - Persistent mini-player surviving in-app screen navigation.
  - Accurate error reporting for embedding restrictions (code 150/101) and deleted videos.
- **Data Safety, Isolation & Full Backup (v2)**:
  - Automated tests operate in an isolated test database (`MineNotesTestDB`), never polluting user notes.
  - Version 2 full-library backup exporting notes, covers, custom shelves, user settings, and music links.
  - Safe merge restore with preview dialog (verifying book and shelf counts before importing).
  - Zero automatic deletion of user notes.
- **Offline PWA**: Full offline capability with Web App Manifest, Service Worker caching, and book app icons.
- **Procedural Web Audio Sound Engine**: 100% original procedural Web Audio synthesis for typewriter typing, stone button clicks, and paper page turn sounds.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS Modules + CSS Custom Properties (Design Tokens) + Procedural Pixel Textures
- **Rich-Text Editor**: Tiptap (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, extensions)
- **Local Database**: IndexedDB via Dexie.js (`dexie`, `dexie-react-hooks`)
- **PWA**: `vite-plugin-pwa` + Workbox Service Worker caching
- **Testing**: Vitest + React Testing Library + JSDOM

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally in Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Unit & Regression Tests
```bash
npm run test
```

### 4. Run Code Linter
```bash
npm run lint
```

### 5. Build for Production
```bash
npm run build
```

---

## 📱 Progressive Web App (PWA) & Offline Usage

MineNotes is a certified offline-capable Progressive Web Application:
- **Desktop (Chrome / Edge)**: Click the Install icon in the address bar to install MineNotes as a standalone desktop app.
- **Mobile (iOS Safari)**: Tap the Share button and select **Add to Home Screen**.
- **Mobile (Android Chrome)**: Tap the three dots menu and select **Install App**.

> [!NOTE]
> Offline capability covers the notebook, stored notes, book covers, custom shelves, and local sound effects. YouTube soundtrack streaming requires an active internet connection.

---

## 🔒 Data Privacy & Architecture

- **100% Local**: All notes, custom covers, shelves, and preferences are stored exclusively in your browser's IndexedDB. No remote servers, cloud tracking, or external analytics.
- **Safe Backups**: Use **Settings → Data Storage & Backup → Export Backup** to generate a portable JSON backup file anytime.
- **Developer Tools**: Development and testing fixture cleanup tools are quarantined into `Settings → Developer Tools` and automatically stripped from production builds.

---

## 📜 Credits & License

- **Crafted by**: Daniyal
- **Inspiration**: Minecraft Java Edition Book & Quill and Bookshelf mechanics.
- **Sound Effects**: Original procedural synthesis via Web Audio API.
- **Music**: Embedded playback via official YouTube player; music composed by C418.
