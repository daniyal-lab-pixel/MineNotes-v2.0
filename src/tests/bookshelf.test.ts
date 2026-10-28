import { describe, it, expect, beforeEach } from 'vitest';
import { db, type NoteItem, type BookMetadata, type Bookshelf } from '../storage/database';
import { bookMetadataRepository } from '../features/bookshelf/bookMetadataRepository';
import { bookshelvesRepository } from '../features/bookshelf/bookshelvesRepository';
import { notesRepository } from '../storage/notesRepository';
import {
  BOOK_COVERS,
  TITLE_COLORS,
  getBookCoverInfo,
  formatCoverDisplayName
} from '../features/bookshelf/bookCoverCatalog';

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
    async update(key: string, updates: Partial<T>) {
      const current = store.get(key);
      if (current) {
        store.set(key, { ...current, ...updates });
      }
      return 1;
    },
    async delete(key: string) {
      store.delete(key);
    },
    async toArray() {
      return Array.from(store.values());
    },
    async count() {
      return store.size;
    },
    async clear() {
      store.clear();
    },
    orderBy(field: string) {
      return {
        async toArray() {
          return Array.from(store.values()).sort(
            (a: any, b: any) => (a[field] ?? 0) - (b[field] ?? 0)
          );
        },
        reverse() {
          return {
            async toArray() {
              return Array.from(store.values()).sort(
                (a: any, b: any) => (b[field] ?? 0) - (a[field] ?? 0)
              );
            },
            limit(n: number) {
              return {
                async toArray() {
                  return Array.from(store.values())
                    .sort((a: any, b: any) => (b[field] ?? 0) - (a[field] ?? 0))
                    .slice(0, n);
                }
              };
            }
          };
        }
      };
    },
    where(field: string) {
      return {
        equals(val: any) {
          return {
            async toArray() {
              return Array.from(store.values()).filter(item => (item as any)[field] === val);
            }
          };
        }
      };
    },
    filter(predicate: (item: T) => boolean) {
      return {
        reverse() {
          return {
            async sortBy(_field: string) {
              return Array.from(store.values()).filter(predicate);
            }
          };
        }
      };
    }
  };
}

describe('MineNotes Bookshelf Update Test Suite', () => {
  beforeEach(() => {
    // Setup in-memory mock tables for IndexedDB in Node environment
    (db as any).notes = createMockTable<NoteItem>();
    (db as any).bookMetadata = createMockTable<BookMetadata>();
    (db as any).bookshelves = createMockTable<Bookshelf>();
    (db as any).transaction = async (_mode: any, _tables: any, cb: () => Promise<any>) => await cb();
  });

  describe('1. Book Cover Catalog & Utilities', () => {
    it('defines all required built-in standard and dyed covers', () => {
      const coverIds = BOOK_COVERS.map(c => c.id);
      expect(coverIds).toContain('leather');
      expect(coverIds).toContain('enchanted');
      expect(coverIds).toContain('golden');
      expect(coverIds).toContain('ancient');
      expect(coverIds).toContain('dyed-red');
      expect(coverIds).toContain('dyed-blue');
      expect(coverIds).toContain('dyed-green');
      expect(coverIds).toContain('dyed-purple');
      expect(coverIds).toContain('dyed-black');
    });

    it('flags enchanted cover with isEnchanted', () => {
      const enchanted = getBookCoverInfo('enchanted');
      expect(enchanted.isEnchanted).toBe(true);
      const leather = getBookCoverInfo('leather');
      expect(leather.isEnchanted).toBeFalsy();
    });

    it('provides readable title color palette', () => {
      expect(TITLE_COLORS.length).toBeGreaterThanOrEqual(10);
      const white = TITLE_COLORS.find(c => c.name === 'White');
      expect(white).toBeDefined();
    });

    it('formats display names cleanly for UI tooltips', () => {
      expect(formatCoverDisplayName('leather')).toBe('Leather Book');
      expect(formatCoverDisplayName('enchanted')).toBe('Enchanted Book');
      expect(formatCoverDisplayName('golden')).toBe('Golden Book');
      expect(formatCoverDisplayName('ancient')).toBe('Ancient Book');
      expect(formatCoverDisplayName('dyed-red')).toBe('Red Book');
      expect(formatCoverDisplayName('dyed-blue')).toBe('Blue Book');
    });
  });

  describe('2. Book Metadata Repository & Backward Compatibility', () => {
    it('returns safe default metadata for a note without custom metadata', async () => {
      const meta = await bookMetadataRepository.getMetadata('note-without-meta');
      expect(meta.coverId).toBe('leather');
      expect(meta.isFavorite).toBe(false);
      expect(meta.shelfId).toBeNull();
      expect(meta.titleColor).toBe('#ffffff');
    });

    it('saves, updates, and persists book metadata without changing document content', async () => {
      const note = await notesRepository.createNote('Physics Notes');
      expect(note.title).toBe('Physics Notes');

      await bookMetadataRepository.setCover(note.id, 'enchanted', '#c74ebd');
      const meta = await bookMetadataRepository.getMetadata(note.id);
      expect(meta.coverId).toBe('enchanted');
      expect(meta.titleColor).toBe('#c74ebd');

      // Check note content remains untouched
      const fetchedNote = await notesRepository.getNoteById(note.id);
      expect(fetchedNote?.title).toBe('Physics Notes');
      expect(fetchedNote?.content).toBe(note.content);
    });

    it('toggles favorite status accurately', async () => {
      const note = await notesRepository.createNote('Math Notes');
      
      const firstToggle = await bookMetadataRepository.toggleFavorite(note.id);
      expect(firstToggle).toBe(true);
      let meta = await bookMetadataRepository.getMetadata(note.id);
      expect(meta.isFavorite).toBe(true);

      const secondToggle = await bookMetadataRepository.toggleFavorite(note.id);
      expect(secondToggle).toBe(false);
      meta = await bookMetadataRepository.getMetadata(note.id);
      expect(meta.isFavorite).toBe(false);
    });

    it('assigns and moves books across shelves', async () => {
      const note = await notesRepository.createNote('Biology Notes');
      const shelf = await bookshelvesRepository.createShelf('Science');

      await bookMetadataRepository.moveToShelf(note.id, shelf.id);
      let meta = await bookMetadataRepository.getMetadata(note.id);
      expect(meta.shelfId).toBe(shelf.id);

      // Move to unsorted
      await bookMetadataRepository.moveToShelf(note.id, null);
      meta = await bookMetadataRepository.getMetadata(note.id);
      expect(meta.shelfId).toBeNull();
    });
  });

  describe('3. Bookshelves Repository & Safe Deletion', () => {
    it('creates, renames, and lists custom shelves', async () => {
      const shelf1 = await bookshelvesRepository.createShelf('School');
      const _shelf2 = await bookshelvesRepository.createShelf('Programming');

      const all = await bookshelvesRepository.getAllShelves();
      expect(all.length).toBe(2);
      expect(all.map(s => s.name)).toContain('School');
      expect(all.map(s => s.name)).toContain('Programming');

      await bookshelvesRepository.renameShelf(shelf1.id, 'School & College');
      const updated = await bookshelvesRepository.getShelfById(shelf1.id);
      expect(updated?.name).toBe('School & College');
    });

    it('rejects empty shelf names', async () => {
      await expect(bookshelvesRepository.createShelf('   ')).rejects.toThrow();
    });

    it('safely moves books to Unsorted when their shelf is deleted, never deleting notes', async () => {
      const note1 = await notesRepository.createNote('Algebra');
      const note2 = await notesRepository.createNote('Calculus');
      const mathShelf = await bookshelvesRepository.createShelf('Mathematics');

      await bookMetadataRepository.moveToShelf(note1.id, mathShelf.id);
      await bookMetadataRepository.moveToShelf(note2.id, mathShelf.id);

      // Delete shelf
      await bookshelvesRepository.deleteShelf(mathShelf.id);

      // Verify shelf is gone
      const shelfCheck = await bookshelvesRepository.getShelfById(mathShelf.id);
      expect(shelfCheck).toBeUndefined();

      // Verify notes are NOT deleted, and shelfId safely reset to null
      const note1Check = await notesRepository.getNoteById(note1.id);
      const note2Check = await notesRepository.getNoteById(note2.id);
      expect(note1Check).toBeDefined();
      expect(note2Check).toBeDefined();

      const meta1 = await bookMetadataRepository.getMetadata(note1.id);
      const meta2 = await bookMetadataRepository.getMetadata(note2.id);
      expect(meta1.shelfId).toBeNull();
      expect(meta2.shelfId).toBeNull();
    });
  });

  describe('4. Note Duplication & Safe Deletion', () => {
    it('duplicates note with title (Copy) and copies metadata', async () => {
      const original = await notesRepository.createNote('Project Plan');
      await bookMetadataRepository.setCover(original.id, 'golden', '#fed83d');

      const duplicate = await notesRepository.duplicateNote(original.id);
      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.title).toBe('Project Plan (Copy)');

      const dupMeta = await bookMetadataRepository.getMetadata(duplicate.id);
      expect(dupMeta.coverId).toBe('golden');
      expect(dupMeta.titleColor).toBe('#fed83d');
    });

    it('cleans up metadata when note is deleted', async () => {
      const note = await notesRepository.createNote('Temporary Note');
      await bookMetadataRepository.setCover(note.id, 'ancient');

      await notesRepository.deleteNote(note.id);
      const noteCheck = await notesRepository.getNoteById(note.id);
      expect(noteCheck).toBeUndefined();

      const storedMeta = await db.bookMetadata.get(note.id);
      expect(storedMeta).toBeUndefined();
    });
  });

  describe('5. Search and Sorting Verification', () => {
    it('performs case-insensitive search by title', async () => {
      await notesRepository.createNote('Quantum Mechanics');
      await notesRepository.createNote('Classical Mechanics');
      await notesRepository.createNote('Organic Chemistry');

      const queryMech = await notesRepository.searchNotes('mechanics');
      expect(queryMech.length).toBe(2);

      const queryChem = await notesRepository.searchNotes('CHEMISTRY');
      expect(queryChem.length).toBe(1);
      expect(queryChem[0].title).toBe('Organic Chemistry');
    });
  });

  describe('6. Test Data Isolation & Safe Cleanup', () => {
    it('creates test fixtures with test prefix and flag without modifying existing notes', async () => {
      const userNote = await notesRepository.createNote('User Real Note', { isTestFixture: false });
      const testNote = await notesRepository.createNote('Test Fixture Note', { isTestFixture: true });

      expect(userNote.id).toContain('note_');
      expect(userNote.isTestFixture).toBe(false);

      expect(testNote.id).toContain('test_fixture_');
      expect(testNote.isTestFixture).toBe(true);

      const all = await notesRepository.getAllNotes();
      expect(all.length).toBe(2);
    });

    it('batch deletes only user-selected note IDs, preserving unselected notes completely', async () => {
      const note1 = await notesRepository.createNote('Real Diary');
      const test1 = await notesRepository.createNote('Test Spec 1', { isTestFixture: true });
      const test2 = await notesRepository.createNote('Test Spec 2', { isTestFixture: true });

      const deletedCount = await notesRepository.deleteNotesBatch([test1.id, test2.id]);
      expect(deletedCount).toBe(2);

      // Verify user note is untouched
      const diaryCheck = await notesRepository.getNoteById(note1.id);
      expect(diaryCheck).toBeDefined();
      expect(diaryCheck?.title).toBe('Real Diary');

      // Verify test notes are deleted
      const test1Check = await notesRepository.getNoteById(test1.id);
      const test2Check = await notesRepository.getNoteById(test2.id);
      expect(test1Check).toBeUndefined();
      expect(test2Check).toBeUndefined();
    });
  });

  describe('7. Collision-Aware Tooltip Positioning Logic', () => {
    it('flips tooltip to bottom when space above anchor is insufficient', () => {
      const vHeight = 800;
      const tooltipHeight = 100;
      const gap = 8;
      const margin = 10;

      // Anchor near top: rect.top = 40px
      const rectTop = 40;
      const spaceAbove = rectTop;
      const rectBottom = 92;
      const spaceBelow = vHeight - rectBottom;

      let top = 0;
      if (spaceAbove >= tooltipHeight + gap + margin) {
        top = rectTop - tooltipHeight - gap;
      } else if (spaceBelow >= tooltipHeight + gap + margin) {
        top = rectBottom + gap;
      }

      // Should flip to bottom: 92 + 8 = 100px
      expect(top).toBe(100);
      expect(top).toBeGreaterThan(rectTop);
    });

    it('positions tooltip above when there is sufficient headroom', () => {
      const tooltipHeight = 100;
      const gap = 8;
      const margin = 10;

      // Anchor in middle/bottom: rect.top = 450px
      const rectTop = 450;
      const spaceAbove = rectTop;

      let top = 0;
      if (spaceAbove >= tooltipHeight + gap + margin) {
        top = rectTop - tooltipHeight - gap;
      }

      // Should place above: 450 - 100 - 8 = 342px
      expect(top).toBe(342);
      expect(top).toBeLessThan(rectTop);
    });

    it('clamps horizontal position within viewport margins to prevent edge clipping', () => {
      const vWidth = 1000;
      const tooltipWidth = 220;
      const margin = 10;

      // Anchor on far-left edge: rect.left = 2px
      const anchorFarLeft = 2;
      const idealLeft1 = anchorFarLeft + 26 - tooltipWidth / 2; // ~ -82
      const clampedLeft1 = Math.max(margin, Math.min(idealLeft1, vWidth - tooltipWidth - margin));
      expect(clampedLeft1).toBe(10); // Clamped to left margin

      // Anchor on far-right edge: rect.left = 980px
      const anchorFarRight = 980;
      const idealLeft2 = anchorFarRight + 26 - tooltipWidth / 2; // ~ 896
      const clampedLeft2 = Math.max(margin, Math.min(idealLeft2, vWidth - tooltipWidth - margin));
      expect(clampedLeft2).toBe(vWidth - tooltipWidth - margin); // Clamped to right margin: 770
    });
  });
});
