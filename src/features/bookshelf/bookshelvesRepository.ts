import { db, type Bookshelf } from '../../storage/database';
import { bookMetadataRepository } from './bookMetadataRepository';

export const bookshelvesRepository = {
  async getAllShelves(): Promise<Bookshelf[]> {
    try {
      return await db.bookshelves.orderBy('createdAt').toArray();
    } catch (err) {
      console.warn('[MineNotes] Error fetching bookshelves:', err);
      return [];
    }
  },

  async getShelfById(id: string): Promise<Bookshelf | undefined> {
    try {
      return await db.bookshelves.get(id);
    } catch (err) {
      console.warn(`[MineNotes] Error fetching shelf ${id}:`, err);
      return undefined;
    }
  },

  async createShelf(name: string): Promise<Bookshelf> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Shelf name cannot be empty');
    }

    const now = Date.now();
    const newShelf: Bookshelf = {
      id: 'shelf_' + Math.random().toString(36).substring(2, 9) + '_' + now.toString(36),
      name: trimmed,
      createdAt: now,
      updatedAt: now
    };

    await db.bookshelves.add(newShelf);
    return newShelf;
  },

  async renameShelf(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Shelf name cannot be empty');
    }

    await db.bookshelves.update(id, {
      name: trimmed,
      updatedAt: Date.now()
    });
  },

  /**
   * Delete a shelf. Safely moves all books belonging to this shelf to Unsorted (shelfId = null).
   * Note contents are never deleted.
   */
  async deleteShelf(id: string): Promise<void> {
    try {
      // Safely reassign books to unsorted
      await bookMetadataRepository.moveBooksToUnsorted(id);
      await db.bookshelves.delete(id);
    } catch (err) {
      console.error(`[MineNotes] Error deleting shelf ${id}:`, err);
      throw err;
    }
  }
};
