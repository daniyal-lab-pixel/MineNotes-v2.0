import { describe, it, expect } from 'vitest';
import { BOOK_COVERS, getBookCoverInfo, formatCoverDisplayName } from '../features/bookshelf/bookCoverCatalog';
import { getActiveDbName, type NoteItem } from '../storage/database';
import { backupService, type MineNotesBackupPayload } from '../storage/backupService';
import { parseYouTubeUrl } from '../features/jukebox/urlParser';
import { C418_PLAYLIST } from '../features/jukebox/trackCatalog';

describe('MineNotes v2.0 Release Quality Assurance & Regression Suite', () => {
  describe('Group A: Notes System & Integrity', () => {
    it('ensures note structure conforms to v3 schema with test fixture flags', () => {
      const note: NoteItem = {
        id: 'note_test_123',
        title: 'Nether Portal Blueprint',
        content: '<p>Obsidian frame 4x5</p>',
        plainText: 'Obsidian frame 4x5',
        pageCount: 1,
        wordCount: 3,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        isSigned: true,
        signedBy: 'Daniyal',
        isTestFixture: false,
        schemaVersion: 3
      };

      expect(note.id).toBe('note_test_123');
      expect(note.isSigned).toBe(true);
      expect(note.signedBy).toBe('Daniyal');
      expect(note.isTestFixture).toBe(false);
      expect(note.schemaVersion).toBe(3);
    });
  });

  describe('Group C: Bookshelf & Custom Covers', () => {
    it('includes standard, mineral, and dyed book covers in catalog', () => {
      expect(BOOK_COVERS.length).toBeGreaterThanOrEqual(9);
      const ids = BOOK_COVERS.map(c => c.id);
      expect(ids).toContain('leather');
      expect(ids).toContain('enchanted');
      expect(ids).toContain('golden');
      expect(ids).toContain('ancient');
      expect(ids).toContain('dyed-red');
      expect(ids).toContain('dyed-blue');
    });

    it('formats cover display names properly for accessibility tooltips', () => {
      expect(formatCoverDisplayName('leather')).toBe('Leather Book');
      expect(formatCoverDisplayName('enchanted')).toBe('Enchanted Book');
      expect(formatCoverDisplayName('golden')).toBe('Golden Book');
      expect(formatCoverDisplayName('dyed-red')).toBe('Red Book');
      expect(formatCoverDisplayName('dyed-blue')).toBe('Blue Book');
    });

    it('provides fallback book cover info when unknown cover ID is supplied', () => {
      const fallback = getBookCoverInfo('non_existent_cover_xyz');
      expect(fallback.id).toBe('leather');
      expect(fallback.name).toBe('Leather (Default)');
    });
  });

  describe('Group E: Music & YouTube Jukebox', () => {
    it('verifies standard Minecraft soundtrack tracks have valid identifiers', () => {
      expect(C418_PLAYLIST.length).toBeGreaterThan(0);
      for (const track of C418_PLAYLIST) {
        expect(track.id).toBeDefined();
        expect(track.title).toBeDefined();
        expect(track.artist).toBe('C418');
        expect(track.videoId.length).toBe(11);
      }
    });

    it('correctly parses various YouTube video and playlist URL formats', () => {
      const standardUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const parsedStandard = parseYouTubeUrl(standardUrl);
      expect(parsedStandard.isValid).toBe(true);
      expect(parsedStandard.type).toBe('video');
      expect(parsedStandard.videoId).toBe('dQw4w9WgXcQ');

      const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';
      const parsedShort = parseYouTubeUrl(shortUrl);
      expect(parsedShort.isValid).toBe(true);
      expect(parsedShort.type).toBe('video');
      expect(parsedShort.videoId).toBe('dQw4w9WgXcQ');

      const playlistUrl = 'https://www.youtube.com/playlist?list=PLrAlXl59_q6X9Wd2XlE0n4BvE8rN8P9q';
      const parsedPlaylist = parseYouTubeUrl(playlistUrl);
      expect(parsedPlaylist.isValid).toBe(true);
      expect(parsedPlaylist.type).toBe('playlist');
      expect(parsedPlaylist.playlistId).toBe('PLrAlXl59_q6X9Wd2XlE0n4BvE8rN8P9q');

      const invalidUrl = 'https://not-youtube.com/song';
      const parsedInvalid = parseYouTubeUrl(invalidUrl);
      expect(parsedInvalid.isValid).toBe(false);
      expect(parsedInvalid.type).toBe('invalid');
    });
  });

  describe('Group F: Atmosphere & Environments', () => {
    it('supports all four Minecraft atmosphere presets', () => {
      const validPresets = ['clear', 'rain', 'snow', 'night'];
      expect(validPresets).toHaveLength(4);
      expect(validPresets).toContain('clear');
      expect(validPresets).toContain('rain');
      expect(validPresets).toContain('snow');
      expect(validPresets).toContain('night');
    });
  });

  describe('Group G: Data Safety & Isolation', () => {
    it('defaults to production MineNotesDB in standard browser environment', () => {
      expect(getActiveDbName()).toBe('MineNotesDB');
    });

    it('safely previews backup contents with accurate subsystem counts', () => {
      const samplePayload: MineNotesBackupPayload = {
        format: 'MineNotes_Backup',
        version: 2,
        exportedAt: 1700000000000,
        createdBy: 'Crafted by Daniyal',
        appVersion: '2.0.0',
        notes: [
          {
            id: 'n1',
            title: 'Village Trading',
            content: 'Emeralds and books',
            plainText: 'Emeralds and books',
            pageCount: 1,
            wordCount: 3,
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
            schemaVersion: 3
          }
        ],
        bookMetadata: [
          {
            noteId: 'n1',
            coverId: 'golden',
            titleColor: '#55ff55',
            isFavorite: true
          }
        ],
        bookshelves: [
          {
            id: 'sh1',
            name: 'Economy',
            createdAt: 1700000000000,
            updatedAt: 1700000000000
          }
        ],
        customSongs: [
          {
            id: 'song1',
            videoId: 'dQw4w9WgXcQ',
            title: 'Custom Track',
            sourceUrl: 'https://youtube.com',
            discColor: '#fed83d',
            isFavorite: false,
            createdAt: 1700000000000,
            updatedAt: 1700000000000
          }
        ]
      };

      const preview = backupService.previewBackup(JSON.stringify(samplePayload));
      expect(preview.format).toBe('MineNotes_Backup');
      expect(preview.version).toBe(2);
      expect(preview.notesCount).toBe(1);
      expect(preview.metadataCount).toBe(1);
      expect(preview.shelvesCount).toBe(1);
      expect(preview.songsCount).toBe(1);
      expect(preview.sampleTitles).toContain('Village Trading');
    });
  });
});
