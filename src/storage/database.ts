import Dexie, { type Table } from 'dexie';

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Tiptap JSON string or HTML string
  plainText: string;
  pageCount: number;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  isSigned?: boolean;
  signedBy?: string;
  isTestFixture?: boolean;
  schemaVersion: number;
}

export function isTestEnvironment(): boolean {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('testMode') === 'true' || (window as any).__MINENOTES_TEST_MODE__) {
      return true;
    }
  }
  return false;
}

export function getActiveDbName(): string {
  return isTestEnvironment() ? 'MineNotesTestDB' : 'MineNotesDB';
}

export class MineNotesDatabase extends Dexie {
  notes!: Table<NoteItem, string>;
  preferences!: Table<UserPreferences, string>;
  customSongs!: Table<CustomSongItem, string>;
  customPlaylists!: Table<CustomPlaylistItem, string>;
  bookMetadata!: Table<BookMetadata, string>;
  bookshelves!: Table<Bookshelf, string>;

  constructor(dbName: string = getActiveDbName()) {
    super(dbName);
    this.version(1).stores({
      notes: 'id, title, updatedAt, createdAt',
      preferences: 'id'
    });
    this.version(2).stores({
      notes: 'id, title, updatedAt, createdAt',
      preferences: 'id',
      customSongs: 'id, videoId, isFavorite, createdAt',
      customPlaylists: 'id, playlistId, isFavorite, createdAt'
    });
    this.version(3).stores({
      notes: 'id, title, updatedAt, createdAt, isTestFixture',
      preferences: 'id',
      customSongs: 'id, videoId, isFavorite, createdAt',
      customPlaylists: 'id, playlistId, isFavorite, createdAt',
      bookMetadata: 'noteId, coverId, shelfId, isFavorite',
      bookshelves: 'id, name, createdAt'
    });
  }
}

export const db = new MineNotesDatabase();

export type EnvironmentPreset = 'clear' | 'rain' | 'snow' | 'night';

export type BookCoverId =
  | 'leather'
  | 'enchanted'
  | 'golden'
  | 'ancient'
  | 'dyed-red'
  | 'dyed-blue'
  | 'dyed-green'
  | 'dyed-purple'
  | 'dyed-black';

export interface BookMetadata {
  noteId: string;
  coverId: BookCoverId;
  titleColor?: string;
  shelfId?: string | null;
  isFavorite: boolean;
  updatedAt?: number;
}

export interface Bookshelf {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export type BookshelfSortOption =
  | 'recent_edit'
  | 'oldest_edit'
  | 'title_asc'
  | 'title_desc'
  | 'recent_created'
  | 'favorites_first';

export interface UserPreferences {
  id: string; // 'current'
  displayName: string;
  hasCompletedWelcome: boolean;
  defaultFont: 'pixel' | 'typewriter' | 'sans';
  soundEnabled: boolean;
  typingSoundEnabled?: boolean;
  typingSoundVolume?: number; // 0 - 100
  uiSoundEnabled?: boolean;
  pageTurnSoundEnabled?: boolean;
  themeBackground: 'dirt' | 'stone' | 'oak';
  environmentPreset?: EnvironmentPreset;
  animatedBackground?: boolean;
  reducedMotion?: boolean;
  ambienceSoundEnabled?: boolean;
  autoSaveDelay: number;
  bookshelfSort?: BookshelfSortOption;
  bookshelfViewMode?: 'shelf' | 'grid';
  bookshelfActiveShelfId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomSongItem {
  id: string; // uuid
  videoId: string; // 11-char YouTube ID
  title: string;
  sourceUrl: string;
  discColor: string;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CustomPlaylistItem {
  id: string; // uuid
  playlistId: string;
  title: string;
  sourceUrl: string;
  discColor: string;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}


