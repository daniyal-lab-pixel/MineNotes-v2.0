import { describe, it, expect, beforeEach } from 'vitest';
import { backupService, type MineNotesBackupPayload } from '../storage/backupService';
import { db, type NoteItem, type BookMetadata, type Bookshelf } from '../storage/database';

function createMockTable<T extends { id?: string; noteId?: string }>() {
  const store = new Map<string, T>();
  return {
    async get(key: string) {
      return store.get(key);
    },
    async put(item: T) {
      const key = (item.id || item.noteId) as string;
      store.set(key, { ...item });
      return key;
    },
    async add(item: T) {
      const key = (item.id || item.noteId) as string;
      store.set(key, { ...item });
      return key;
    },
    async delete(key: string) {
      store.delete(key);
    },
    async toArray() {
      return Array.from(store.values());
    },
    async clear() {
      store.clear();
    }
  };
}

describe('Backup & Restore Service', () => {
  beforeEach(() => {
    (db as any).notes = createMockTable<NoteItem>();
    (db as any).bookMetadata = createMockTable<BookMetadata>();
    (db as any).bookshelves = createMockTable<Bookshelf>();
    (db as any).customSongs = createMockTable<any>();
    (db as any).customPlaylists = createMockTable<any>();
  });

  it('rejects invalid JSON syntax', async () => {
    await expect(backupService.importBackup('{ broken json')).rejects.toThrow(
      'Invalid JSON file. Please select a valid MineNotes backup file.'
    );
  });

  it('rejects unrecognized payload schemas', async () => {
    const invalidPayload = JSON.stringify({ format: 'OtherFormat', data: [] });
    await expect(backupService.importBackup(invalidPayload)).rejects.toThrow(
      'Unrecognized backup format. File is not a valid MineNotes backup.'
    );
  });

  it('accepts valid MineNotes format structure', () => {
    const valid: MineNotesBackupPayload = {
      format: 'MineNotes_Backup',
      version: 1,
      exportedAt: Date.now(),
      createdBy: 'Crafted by Daniyal',
      appVersion: '1.0.0',
      notes: [
        {
          id: 'test_1',
          title: 'Stronghold Coordinates',
          content: '{"pages":["<p>X: 1200, Z: -540</p>"]}',
          plainText: 'X: 1200, Z: -540',
          pageCount: 1,
          wordCount: 4,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          schemaVersion: 1
        }
      ]
    };
    expect(valid.format).toBe('MineNotes_Backup');
    expect(valid.createdBy).toBe('Crafted by Daniyal');
    expect(valid.notes).toHaveLength(1);
  });

  it('correctly generates previews for v2 backups', () => {
    const v2Payload: MineNotesBackupPayload = {
      format: 'MineNotes_Backup',
      version: 2,
      exportedAt: 1700000000000,
      createdBy: 'Crafted by Daniyal',
      appVersion: '2.0.0',
      notes: [
        {
          id: 'note_1',
          title: 'The Nether Fortress',
          content: 'Blaze rods and Nether wart',
          plainText: 'Blaze rods and Nether wart',
          pageCount: 1,
          wordCount: 5,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
          schemaVersion: 1
        }
      ],
      bookMetadata: [
        {
          noteId: 'note_1',
          coverId: 'netherite',
          titleColor: '#e0d8b0',
          shelfId: 'shelf_adventures',
          isFavorite: true
        }
      ],
      bookshelves: [
        {
          id: 'shelf_adventures',
          name: 'Adventures',
          createdAt: 1700000000000,
          updatedAt: 1700000000000
        }
      ]
    };

    const jsonStr = JSON.stringify(v2Payload);
    const preview = backupService.previewBackup(jsonStr);

    expect(preview.version).toBe(2);
    expect(preview.notesCount).toBe(1);
    expect(preview.metadataCount).toBe(1);
    expect(preview.shelvesCount).toBe(1);
    expect(preview.sampleTitles).toContain('The Nether Fortress');
  });

  it('safely restores v2 backup notes, metadata, and shelves without destroying existing unrelated records in merge mode', async () => {
    // Insert an existing book that is NOT in the backup
    await (db as any).notes.put({
      id: 'existing_book',
      title: 'My Secret Diary',
      content: 'Do not touch',
      plainText: 'Do not touch',
      pageCount: 1,
      wordCount: 3,
      createdAt: 1600000000000,
      updatedAt: 1600000000000,
      schemaVersion: 1
    });

    const v2Payload: MineNotesBackupPayload = {
      format: 'MineNotes_Backup',
      version: 2,
      exportedAt: 1700000000000,
      createdBy: 'Crafted by Daniyal',
      appVersion: '2.0.0',
      notes: [
        {
          id: 'restored_book_1',
          title: 'Redstone Circuits',
          content: 'Repeaters and comparators',
          plainText: 'Repeaters and comparators',
          pageCount: 2,
          wordCount: 3,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
          schemaVersion: 1
        }
      ],
      bookMetadata: [
        {
          noteId: 'restored_book_1',
          coverId: 'redstone',
          titleColor: '#ff6666',
          shelfId: 'shelf_redstone',
          isFavorite: true
        }
      ],
      bookshelves: [
        {
          id: 'shelf_redstone',
          name: 'Engineering',
          createdAt: 1700000000000,
          updatedAt: 1700000000000
        }
      ]
    };

    const result = await backupService.importBackup(JSON.stringify(v2Payload), { mode: 'merge' });
    expect(result.notesCount).toBe(1);
    expect(result.shelvesCount).toBe(1);
    expect(result.metadataCount).toBe(1);

    // Verify existing book was preserved!
    const existing = await (db as any).notes.get('existing_book');
    expect(existing).toBeDefined();
    expect(existing?.title).toBe('My Secret Diary');

    // Verify restored book was created with cover and shelf
    const restored = await (db as any).notes.get('restored_book_1');
    expect(restored).toBeDefined();
    expect(restored?.title).toBe('Redstone Circuits');

    const meta = await (db as any).bookMetadata.get('restored_book_1');
    expect(meta?.coverId).toBe('redstone');
    expect(meta?.shelfId).toBe('shelf_redstone');

    const shelf = await (db as any).bookshelves.get('shelf_redstone');
    expect(shelf?.name).toBe('Engineering');
  });
});
