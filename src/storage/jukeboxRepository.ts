/**
 * MineNotes - Jukebox Storage Repository
 * Persistent IndexedDB storage for user-added YouTube songs and playlists.
 * Completely decoupled from Note storage.
 */

import { db, type CustomSongItem, type CustomPlaylistItem } from './database';

const DEFAULT_DISC_COLORS = [
  '#fed83d', // Gold
  '#3ab3da', // Light Blue
  '#80c71f', // Lime
  '#b02e26', // Red
  '#f9801d', // Orange
  '#169c9c', // Cyan
  '#8932b8', // Purple
  '#c74ebd', // Magenta
  '#3c44aa', // Blue
  '#474f52'  // Dark Gray / Netherite
];

function getRandomDiscColor(): string {
  const idx = Math.floor(Math.random() * DEFAULT_DISC_COLORS.length);
  return DEFAULT_DISC_COLORS[idx];
}

export const jukeboxRepository = {
  // === CUSTOM SONGS ===

  async getAllCustomSongs(): Promise<CustomSongItem[]> {
    return db.customSongs.orderBy('createdAt').reverse().toArray();
  },

  async addCustomSong(data: { videoId: string; title: string; sourceUrl: string; discColor?: string }): Promise<CustomSongItem> {
    // Check if song with same videoId already exists
    const existing = await db.customSongs.where('videoId').equals(data.videoId).first();
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const song: CustomSongItem = {
      id: crypto.randomUUID(),
      videoId: data.videoId,
      title: data.title.trim() || `YouTube Track (${data.videoId})`,
      sourceUrl: data.sourceUrl,
      discColor: data.discColor || getRandomDiscColor(),
      isFavorite: false,
      createdAt: now,
      updatedAt: now
    };

    await db.customSongs.add(song);
    return song;
  },

  async updateCustomSong(id: string, updates: Partial<Omit<CustomSongItem, 'id' | 'createdAt'>>): Promise<void> {
    await db.customSongs.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  async toggleSongFavorite(id: string): Promise<boolean> {
    const song = await db.customSongs.get(id);
    if (!song) return false;
    const nextFav = !song.isFavorite;
    await db.customSongs.update(id, { isFavorite: nextFav, updatedAt: Date.now() });
    return nextFav;
  },

  async deleteCustomSong(id: string): Promise<void> {
    await db.customSongs.delete(id);
  },

  // === CUSTOM PLAYLISTS ===

  async getAllCustomPlaylists(): Promise<CustomPlaylistItem[]> {
    return db.customPlaylists.orderBy('createdAt').reverse().toArray();
  },

  async addCustomPlaylist(data: { playlistId: string; title: string; sourceUrl: string; discColor?: string }): Promise<CustomPlaylistItem> {
    // Check if playlist with same playlistId already exists
    const existing = await db.customPlaylists.where('playlistId').equals(data.playlistId).first();
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const playlist: CustomPlaylistItem = {
      id: crypto.randomUUID(),
      playlistId: data.playlistId,
      title: data.title.trim() || `YouTube Playlist (${data.playlistId.slice(0, 8)}...)`,
      sourceUrl: data.sourceUrl,
      discColor: data.discColor || getRandomDiscColor(),
      isFavorite: false,
      createdAt: now,
      updatedAt: now
    };

    await db.customPlaylists.add(playlist);
    return playlist;
  },

  async updateCustomPlaylist(id: string, updates: Partial<Omit<CustomPlaylistItem, 'id' | 'createdAt'>>): Promise<void> {
    await db.customPlaylists.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  async togglePlaylistFavorite(id: string): Promise<boolean> {
    const playlist = await db.customPlaylists.get(id);
    if (!playlist) return false;
    const nextFav = !playlist.isFavorite;
    await db.customPlaylists.update(id, { isFavorite: nextFav, updatedAt: Date.now() });
    return nextFav;
  },

  async deleteCustomPlaylist(id: string): Promise<void> {
    await db.customPlaylists.delete(id);
  }
};
