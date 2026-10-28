import { db, type NoteItem, type UserPreferences, isTestEnvironment } from './database';
import { setSoundEnabled, updateSoundConfig } from '../utils/sound';
import { serializeBookPages } from '../features/editor/pagination/paginationEngine';

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'current',
  displayName: '',
  hasCompletedWelcome: false,
  defaultFont: 'pixel',
  soundEnabled: true,
  typingSoundEnabled: true,
  typingSoundVolume: 12,
  uiSoundEnabled: true,
  pageTurnSoundEnabled: true,
  themeBackground: 'dirt',
  environmentPreset: 'clear',
  animatedBackground: true,
  reducedMotion: false,
  ambienceSoundEnabled: false,
  autoSaveDelay: 500,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

/**
 * Notes CRUD Repository
 */
export const notesRepository = {
  async getAllNotes(): Promise<NoteItem[]> {
    return await db.notes.orderBy('updatedAt').reverse().toArray();
  },

  async getRecentNotes(limit: number = 5): Promise<NoteItem[]> {
    return await db.notes.orderBy('updatedAt').reverse().limit(limit).toArray();
  },

  async getNoteById(id: string): Promise<NoteItem | undefined> {
    return await db.notes.get(id);
  },

  async createNote(
    title: string = 'Untitled Note',
    options?: { isTestFixture?: boolean; content?: string }
  ): Promise<NoteItem> {
    const now = Date.now();
    const isFixture = options?.isTestFixture ?? isTestEnvironment();
    const prefix = isFixture ? 'test_fixture_' : 'note_';
    const newNote: NoteItem = {
      id: prefix + Math.random().toString(36).substring(2, 9) + '_' + now.toString(36),
      title: title.trim() || 'Untitled Note',
      content: options?.content || serializeBookPages(['<p></p>']),
      plainText: '',
      pageCount: 1,
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
      isTestFixture: isFixture,
      schemaVersion: CURRENT_SCHEMA_VERSION
    };

    await db.notes.add(newNote);
    return newNote;
  },

  async saveNote(note: NoteItem): Promise<void> {
    note.updatedAt = Date.now();
    await db.notes.put(note);
  },

  async updateNote(id: string, updates: Partial<NoteItem>): Promise<void> {
    await db.notes.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  async deleteNote(id: string): Promise<void> {
    await db.notes.delete(id);
    try {
      await db.bookMetadata.delete(id);
    } catch {
      // safe ignore if table not initialized
    }
  },

  async duplicateNote(id: string): Promise<NoteItem> {
    const original = await this.getNoteById(id);
    if (!original) {
      throw new Error('Original note not found');
    }
    const now = Date.now();
    const newNote: NoteItem = {
      ...original,
      id: 'note_' + Math.random().toString(36).substring(2, 9) + '_' + now.toString(36),
      title: `${original.title} (Copy)`,
      createdAt: now,
      updatedAt: now
    };
    await db.notes.add(newNote);

    try {
      const originalMeta = await db.bookMetadata.get(id);
      if (originalMeta) {
        await db.bookMetadata.put({
          ...originalMeta,
          noteId: newNote.id,
          updatedAt: now
        });
      }
    } catch {
      // safe fallback
    }

    return newNote;
  },

  async searchNotes(query: string): Promise<NoteItem[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAllNotes();

    return await db.notes
      .filter(note => note.title.toLowerCase().includes(q) || note.plainText.toLowerCase().includes(q))
      .reverse()
      .sortBy('updatedAt');
  },

  async getNotesCount(): Promise<number> {
    return await db.notes.count();
  },

  async deleteNotesBatch(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      await this.deleteNote(id);
      count++;
    }
    return count;
  }
};

function syncSoundPreferences(prefs: UserPreferences) {
  setSoundEnabled(prefs.soundEnabled !== false);
  updateSoundConfig({
    soundEnabled: prefs.soundEnabled !== false,
    typingSoundEnabled: prefs.typingSoundEnabled !== false,
    typingSoundVolume: typeof prefs.typingSoundVolume === 'number' ? prefs.typingSoundVolume / 100 : 0.12,
    uiSoundEnabled: prefs.uiSoundEnabled !== false,
    pageTurnSoundEnabled: prefs.pageTurnSoundEnabled !== false
  });
}

/**
 * User Preferences Repository
 */
export const preferencesRepository = {
  async getPreferences(): Promise<UserPreferences> {
    const stored = await db.preferences.get('current');
    if (!stored) {
      await db.preferences.put(DEFAULT_PREFERENCES);
      syncSoundPreferences(DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    }
    syncSoundPreferences(stored);
    return stored;
  },

  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated: UserPreferences = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };
    await db.preferences.put(updated);
    syncSoundPreferences(updated);
    return updated;
  },

  async setWelcomeCompleted(): Promise<void> {
    await this.updatePreferences({ hasCompletedWelcome: true });
  }
};
