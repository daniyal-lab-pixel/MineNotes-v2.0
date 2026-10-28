import { notesRepository, preferencesRepository } from './notesRepository';
import {
  type NoteItem,
  type UserPreferences,
  type BookMetadata,
  type Bookshelf,
  type CustomSongItem,
  type CustomPlaylistItem,
  db
} from './database';

export interface MineNotesBackupPayload {
  format: 'MineNotes_Backup';
  version: number;
  exportedAt: number;
  createdBy: string;
  appVersion: string;
  notes: NoteItem[];
  bookMetadata?: BookMetadata[];
  bookshelves?: Bookshelf[];
  preferences?: UserPreferences;
  customSongs?: CustomSongItem[];
  customPlaylists?: CustomPlaylistItem[];
}

export interface BackupPreview {
  format: string;
  version: number;
  exportedAt: number;
  appVersion: string;
  notesCount: number;
  metadataCount: number;
  shelvesCount: number;
  songsCount: number;
  playlistsCount: number;
  sampleTitles: string[];
}

export interface BackupRestoreResult {
  notesCount: number;
  metadataCount: number;
  shelvesCount: number;
  songsCount: number;
  playlistsCount: number;
  message: string;
}

export const backupService = {
  /**
   * Export all notes, book covers, custom shelves, user settings, and music links into a versioned JSON file.
   */
  async exportBackup(): Promise<string> {
    const notes = await notesRepository.getAllNotes();
    const preferences = await preferencesRepository.getPreferences();
    const bookMetadata = await db.bookMetadata.toArray();
    const bookshelves = await db.bookshelves.toArray();
    const customSongs = await db.customSongs.toArray();
    const customPlaylists = await db.customPlaylists.toArray();

    const payload: MineNotesBackupPayload = {
      format: 'MineNotes_Backup',
      version: 2,
      exportedAt: Date.now(),
      createdBy: 'Crafted by Daniyal',
      appVersion: '2.0.0',
      notes,
      bookMetadata,
      bookshelves,
      preferences,
      customSongs,
      customPlaylists
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `minenotes-backup-v2-${dateStr}.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    return fileName;
  },

  /**
   * Validate and parse a backup file string to inspect its contents without modifying the database.
   */
  previewBackup(jsonString: string): BackupPreview {
    let data: unknown;
    try {
      data = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON file. Please select a valid MineNotes backup file.');
    }

    const payload = data as Partial<MineNotesBackupPayload>;
    if (payload.format !== 'MineNotes_Backup' || !Array.isArray(payload.notes)) {
      throw new Error('Unrecognized backup format. File is not a valid MineNotes backup.');
    }

    const sampleTitles = payload.notes
      .slice(0, 5)
      .map(n => (typeof n.title === 'string' && n.title.trim() ? n.title : 'Untitled Note'));

    return {
      format: payload.format,
      version: payload.version || 1,
      exportedAt: typeof payload.exportedAt === 'number' ? payload.exportedAt : Date.now(),
      appVersion: payload.appVersion || '1.0.0',
      notesCount: payload.notes.length,
      metadataCount: Array.isArray(payload.bookMetadata) ? payload.bookMetadata.length : 0,
      shelvesCount: Array.isArray(payload.bookshelves) ? payload.bookshelves.length : 0,
      songsCount: Array.isArray(payload.customSongs) ? payload.customSongs.length : 0,
      playlistsCount: Array.isArray(payload.customPlaylists) ? payload.customPlaylists.length : 0,
      sampleTitles
    };
  },

  /**
   * Validate and restore notes, shelves, metadata, and music references.
   * Safe merge mode is the default; existing notes are never wiped without explicit mode.
   */
  async importBackup(
    jsonString: string,
    options: { mode?: 'merge' | 'replace' } = { mode: 'merge' }
  ): Promise<BackupRestoreResult> {
    this.previewBackup(jsonString);
    const payload = JSON.parse(jsonString) as MineNotesBackupPayload;

    if (options.mode === 'replace') {
      // Clear stores only if replacement is explicitly requested
      await db.notes.clear();
      await db.bookMetadata.clear();
      await db.bookshelves.clear();
    }

    let importedNotes = 0;
    for (const rawNote of payload.notes) {
      if (typeof rawNote.id === 'string' && typeof rawNote.title === 'string') {
        const validatedNote: NoteItem = {
          id: rawNote.id,
          title: rawNote.title,
          content: typeof rawNote.content === 'string' ? rawNote.content : JSON.stringify({ type: 'doc', content: [] }),
          plainText: typeof rawNote.plainText === 'string' ? rawNote.plainText : '',
          pageCount: typeof rawNote.pageCount === 'number' ? rawNote.pageCount : 1,
          wordCount: typeof rawNote.wordCount === 'number' ? rawNote.wordCount : 0,
          createdAt: typeof rawNote.createdAt === 'number' ? rawNote.createdAt : Date.now(),
          updatedAt: typeof rawNote.updatedAt === 'number' ? rawNote.updatedAt : Date.now(),
          isSigned: Boolean(rawNote.isSigned),
          signedBy: rawNote.signedBy,
          isTestFixture: Boolean(rawNote.isTestFixture),
          schemaVersion: rawNote.schemaVersion || 1
        };

        await db.notes.put(validatedNote);
        importedNotes++;
      }
    }

    let importedMetadata = 0;
    if (Array.isArray(payload.bookMetadata)) {
      for (const m of payload.bookMetadata) {
        if (typeof m.noteId === 'string' && typeof m.coverId === 'string') {
          const validatedMeta: BookMetadata = {
            noteId: m.noteId,
            coverId: m.coverId,
            titleColor: m.titleColor || '#e0d8b0',
            shelfId: m.shelfId ?? null,
            isFavorite: Boolean(m.isFavorite),
            updatedAt: typeof m.updatedAt === 'number' ? m.updatedAt : Date.now()
          };
          await db.bookMetadata.put(validatedMeta);
          importedMetadata++;
        }
      }
    }

    let importedShelves = 0;
    if (Array.isArray(payload.bookshelves)) {
      for (const s of payload.bookshelves) {
        if (typeof s.id === 'string' && typeof s.name === 'string') {
          const validatedShelf: Bookshelf = {
            id: s.id,
            name: s.name.trim() || 'New Shelf',
            createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
            updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now()
          };
          await db.bookshelves.put(validatedShelf);
          importedShelves++;
        }
      }
    }

    let importedSongs = 0;
    if (Array.isArray(payload.customSongs)) {
      for (const cs of payload.customSongs) {
        if (typeof cs.id === 'string' && typeof cs.videoId === 'string') {
          await db.customSongs.put({
            id: cs.id,
            videoId: cs.videoId,
            title: cs.title || `Track ${cs.videoId}`,
            sourceUrl: cs.sourceUrl || '',
            discColor: cs.discColor || '#fed83d',
            isFavorite: Boolean(cs.isFavorite),
            createdAt: typeof cs.createdAt === 'number' ? cs.createdAt : Date.now(),
            updatedAt: typeof cs.updatedAt === 'number' ? cs.updatedAt : Date.now()
          });
          importedSongs++;
        }
      }
    }

    let importedPlaylists = 0;
    if (Array.isArray(payload.customPlaylists)) {
      for (const cp of payload.customPlaylists) {
        if (typeof cp.id === 'string' && typeof cp.playlistId === 'string') {
          await db.customPlaylists.put({
            id: cp.id,
            playlistId: cp.playlistId,
            title: cp.title || `Playlist ${cp.playlistId}`,
            sourceUrl: cp.sourceUrl || '',
            discColor: cp.discColor || '#fed83d',
            isFavorite: Boolean(cp.isFavorite),
            createdAt: typeof cp.createdAt === 'number' ? cp.createdAt : Date.now(),
            updatedAt: typeof cp.updatedAt === 'number' ? cp.updatedAt : Date.now()
          });
          importedPlaylists++;
        }
      }
    }

    if (payload.preferences && typeof payload.preferences === 'object') {
      await preferencesRepository.updatePreferences(payload.preferences);
    }

    return {
      notesCount: importedNotes,
      metadataCount: importedMetadata,
      shelvesCount: importedShelves,
      songsCount: importedSongs,
      playlistsCount: importedPlaylists,
      message: `Successfully restored ${importedNotes} book(s), ${importedShelves} shelf/shelves, and ${importedMetadata} cover(s)!`
    };
  },

  /**
   * Clear all stored notes (for resetting / debug)
   */
  async clearAllData(): Promise<void> {
    await db.notes.clear();
    await db.bookMetadata.clear();
  }
};
