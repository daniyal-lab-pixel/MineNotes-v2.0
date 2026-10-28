import { db, type BookMetadata, type BookCoverId } from '../../storage/database';
import { DEFAULT_BOOK_COVER, DEFAULT_TITLE_COLOR } from './bookCoverCatalog';

export const bookMetadataRepository = {
  getDefaultMetadata(noteId: string): BookMetadata {
    return {
      noteId,
      coverId: DEFAULT_BOOK_COVER,
      titleColor: DEFAULT_TITLE_COLOR,
      shelfId: null,
      isFavorite: false,
      updatedAt: Date.now()
    };
  },

  async getMetadata(noteId: string): Promise<BookMetadata> {
    try {
      const stored = await db.bookMetadata.get(noteId);
      if (stored) {
        return {
          noteId: stored.noteId,
          coverId: stored.coverId || DEFAULT_BOOK_COVER,
          titleColor: stored.titleColor || DEFAULT_TITLE_COLOR,
          shelfId: stored.shelfId ?? null,
          isFavorite: Boolean(stored.isFavorite),
          updatedAt: stored.updatedAt || Date.now()
        };
      }
    } catch (err) {
      console.warn(`[MineNotes] Failed to load metadata for ${noteId}, using fallback:`, err);
    }
    return this.getDefaultMetadata(noteId);
  },

  async getAllMetadata(): Promise<Map<string, BookMetadata>> {
    const map = new Map<string, BookMetadata>();
    try {
      const all = await db.bookMetadata.toArray();
      for (const item of all) {
        map.set(item.noteId, {
          noteId: item.noteId,
          coverId: item.coverId || DEFAULT_BOOK_COVER,
          titleColor: item.titleColor || DEFAULT_TITLE_COLOR,
          shelfId: item.shelfId ?? null,
          isFavorite: Boolean(item.isFavorite),
          updatedAt: item.updatedAt || Date.now()
        });
      }
    } catch (err) {
      console.warn('[MineNotes] Failed to load all book metadata:', err);
    }
    return map;
  },

  async saveMetadata(metadata: BookMetadata): Promise<void> {
    try {
      const sanitized: BookMetadata = {
        ...metadata,
        shelfId: metadata.shelfId ?? null,
        isFavorite: Boolean(metadata.isFavorite),
        updatedAt: Date.now()
      };
      await db.bookMetadata.put(sanitized);
    } catch (err) {
      console.error('[MineNotes] Error saving book metadata:', err);
      throw err;
    }
  },

  async updateMetadata(noteId: string, updates: Partial<BookMetadata>): Promise<BookMetadata> {
    const current = await this.getMetadata(noteId);
    const updated: BookMetadata = {
      ...current,
      ...updates,
      shelfId: updates.shelfId !== undefined ? (updates.shelfId ?? null) : current.shelfId,
      isFavorite: updates.isFavorite !== undefined ? Boolean(updates.isFavorite) : current.isFavorite,
      updatedAt: Date.now()
    };
    await this.saveMetadata(updated);
    return updated;
  },

  async toggleFavorite(noteId: string): Promise<boolean> {
    const current = await this.getMetadata(noteId);
    const nextFavorite = !current.isFavorite;
    await this.updateMetadata(noteId, { isFavorite: nextFavorite });
    return nextFavorite;
  },

  async setCover(noteId: string, coverId: BookCoverId, titleColor?: string): Promise<void> {
    const updates: Partial<BookMetadata> = { coverId };
    if (titleColor !== undefined) {
      updates.titleColor = titleColor;
    }
    await this.updateMetadata(noteId, updates);
  },

  async moveToShelf(noteId: string, shelfId: string | null): Promise<void> {
    await this.updateMetadata(noteId, { shelfId });
  },

  async deleteMetadata(noteId: string): Promise<void> {
    try {
      await db.bookMetadata.delete(noteId);
    } catch (err) {
      console.warn(`[MineNotes] Error deleting metadata for ${noteId}:`, err);
    }
  },

  async moveBooksToUnsorted(shelfId: string): Promise<number> {
    try {
      const matches = await db.bookMetadata.where('shelfId').equals(shelfId).toArray();
      if (matches.length === 0) return 0;
      await db.transaction('rw', db.bookMetadata, async () => {
        for (const item of matches) {
          await db.bookMetadata.update(item.noteId, {
            shelfId: null,
            updatedAt: Date.now()
          });
        }
      });
      return matches.length;
    } catch (err) {
      console.warn(`[MineNotes] Error moving books from shelf ${shelfId} to unsorted:`, err);
      return 0;
    }
  }
};
