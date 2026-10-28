/**
 * MineNotes - Official YouTube IFrame Jukebox Controller 2.0
 * Compliant with YouTube Developer Policies and Terms of Service.
 * Manages C418 soundtrack, user-added custom YouTube songs, and YouTube playlists.
 * Fully event-driven playback state machine, zero permanent blacklists,
 * and seamless background listening with persistent visible player.
 */

import { C418_PLAYLIST, type Track } from './trackCatalog';
import { jukeboxRepository } from '../../storage/jukeboxRepository';
import { type CustomSongItem, type CustomPlaylistItem } from '../../storage/database';
import { parseYouTubeUrl } from './urlParser';

export type PlaybackStatus =
  | 'unstarted'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'cued'
  | 'error'
  | 'offline';

export type TrackStatus =
  | 'not_checked'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'unavailable'
  | 'embedding_disabled'
  | 'error';

export type JukeboxDisplayMode = 'closed' | 'compact' | 'expanded';
export type LibraryTab = 'c418' | 'custom_songs' | 'custom_playlists';

export interface JukeboxState {
  currentTrack: Track;
  status: PlaybackStatus;
  volume: number; // 0 - 100
  isMuted: boolean;
  isApiReady: boolean;
  isOnline: boolean;
  displayMode: JukeboxDisplayMode;
  errorMessage: string | null;
  errorCode: number | null;
  errorVideoId: string | null;
  trackStatuses: Record<string, TrackStatus>;
  skipUnavailable: boolean;
  isRecovering: boolean;

  // Jukebox 2.0 Features
  activeTab: LibraryTab;
  customSongs: CustomSongItem[];
  customPlaylists: CustomPlaylistItem[];
  currentCustomSongId: string | null;
  currentCustomPlaylistId: string | null;
  isPlaylistMode: boolean;
  playlistCurrentIndex: number;
  isLooping: boolean;
  isShuffled: boolean;
}

const STORAGE_KEY = 'minenotes_jukebox_prefs';

interface SavedPrefs {
  volume?: number;
  isMuted?: boolean;
  trackId?: string;
  skipUnavailable?: boolean;
  activeTab?: LibraryTab;
  lastPlaylistId?: string;
}

function loadSavedPrefs(): SavedPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage errors
  }
  return {};
}

function savePrefs(prefs: Partial<SavedPrefs>) {
  try {
    const existing = loadSavedPrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // Ignore storage errors
  }
}

// Global declaration for YouTube IFrame API
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
    jukeboxController?: JukeboxController;
  }
}

class JukeboxController {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private player: any = null;
  private state: JukeboxState;
  private listeners = new Set<(state: JukeboxState) => void>();
  private apiLoadingPromise: Promise<void> | null = null;
  private containerElementId: string | null = null;
  private pendingPlayOnReady: boolean = false;
  private autoSkipTimer: ReturnType<typeof setTimeout> | null = null;
  private currentVideoOperationId = 0;

  constructor() {
    const prefs = loadSavedPrefs();
    const initialTrack = C418_PLAYLIST.find(t => t.id === prefs.trackId) || C418_PLAYLIST[0];

    // Dynamic initial track status dictionary - NO hardcoded permanent blacklist!
    const initialStatuses: Record<string, TrackStatus> = {};
    for (const track of C418_PLAYLIST) {
      initialStatuses[track.id] = 'not_checked';
    }

    this.state = {
      currentTrack: initialTrack,
      status: 'unstarted',
      volume: typeof prefs.volume === 'number' ? prefs.volume : 70,
      isMuted: !!prefs.isMuted,
      isApiReady: typeof window !== 'undefined' && !!(window.YT && window.YT.Player),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      displayMode: 'closed',
      errorMessage: null,
      errorCode: null,
      errorVideoId: null,
      trackStatuses: initialStatuses,
      skipUnavailable: prefs.skipUnavailable !== false, // default true
      isRecovering: false,

      // Jukebox 2.0 State
      activeTab: prefs.activeTab || 'c418',
      customSongs: [],
      customPlaylists: [],
      currentCustomSongId: null,
      currentCustomPlaylistId: null,
      isPlaylistMode: false,
      playlistCurrentIndex: 0,
      isLooping: false,
      isShuffled: false
    };

    if (typeof window !== 'undefined') {
      // Expose to window for testing and verification
      window.jukeboxController = this;

      // Document visibility listener: pause immediately when tab or window is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && (this.state.status === 'playing' || this.state.status === 'buffering')) {
          this.pause();
        }
      });

      // Online / Offline network listeners
      window.addEventListener('online', () => {
        this.updateState({ isOnline: true, errorMessage: null, errorCode: null });
      });

      window.addEventListener('offline', () => {
        this.pause();
        this.updateState({
          isOnline: false,
          status: 'offline',
          errorMessage: "Music needs an internet connection. Your MineNotes books are still available.",
          errorCode: null
        });
      });

      // Load custom songs and playlists from IndexedDB if supported
      if (typeof window.indexedDB !== 'undefined') {
        this.refreshLibrary().catch(() => {});
      }
    }
  }

  public getState(): JukeboxState {
    return this.state;
  }

  public subscribe(listener: (state: JukeboxState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private updateState(partial: Partial<JukeboxState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private clearAutoSkipTimer(): void {
    if (this.autoSkipTimer) {
      clearTimeout(this.autoSkipTimer);
      this.autoSkipTimer = null;
    }
  }

  /**
   * Refreshes custom songs and playlists from IndexedDB
   */
  public async refreshLibrary(): Promise<void> {
    try {
      const [songs, playlists] = await Promise.all([
        jukeboxRepository.getAllCustomSongs(),
        jukeboxRepository.getAllCustomPlaylists()
      ]);
      this.updateState({
        customSongs: songs,
        customPlaylists: playlists
      });
    } catch (err) {
      console.warn('[MineNotes Jukebox] Error loading custom library from IndexedDB:', err);
    }
  }

  /**
   * Switch library tabs: 'c418' | 'custom_songs' | 'custom_playlists'
   */
  public setActiveTab(tab: LibraryTab): void {
    this.updateState({ activeTab: tab });
    savePrefs({ activeTab: tab });
  }

  /**
   * Asynchronously load YouTube IFrame API script
   */
  public loadApi(): Promise<void> {
    if (this.state.isApiReady) {
      return Promise.resolve();
    }
    if (this.apiLoadingPromise) {
      return this.apiLoadingPromise;
    }

    this.apiLoadingPromise = new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();

      if (window.YT && window.YT.Player) {
        this.updateState({ isApiReady: true });
        return resolve();
      }

      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        this.updateState({ isApiReady: true });
        resolve();
      };
    });

    return this.apiLoadingPromise;
  }

  /**
   * Mounts the official player to a visible container element
   */
  public attachPlayer(containerId: string): void {
    this.containerElementId = containerId;
    this.loadApi().then(() => {
      if (!window.YT || !window.YT.Player) return;

      const container = document.getElementById(containerId);
      if (!container) return;

      if (this.player) {
        // Player is already initialized and active
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.player = new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        videoId: this.state.currentTrack.videoId || undefined,
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          origin: origin,
          widget_referrer: origin
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (event: any) => {
            this.updateState({ isApiReady: true, isRecovering: false });
            try {
              event.target.setVolume(this.state.volume);
              if (this.state.isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
            } catch {
              // ignore
            }

            if (this.pendingPlayOnReady) {
              this.pendingPlayOnReady = false;
              if (this.state.isPlaylistMode && this.state.currentCustomPlaylistId) {
                const pl = this.state.customPlaylists.find(p => p.id === this.state.currentCustomPlaylistId);
                if (pl) {
                  this.player.loadPlaylist({ list: pl.playlistId, listType: 'playlist', index: 0 });
                }
              } else {
                event.target.playVideo();
              }
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING), 2 (PAUSED), 3 (BUFFERING), 5 (CUED)
            const currentTrackId = this.state.currentTrack.id;
            switch (event.data) {
              case 1: { // PLAYING
                if (document.hidden || this.state.displayMode === 'closed') { this.pause(); return; }
                this.clearAutoSkipTimer();
                const nextStatuses = { ...this.state.trackStatuses, [currentTrackId]: 'playing' as TrackStatus };

                // Read playlist index if available
                let plIdx = this.state.playlistCurrentIndex;
                if (this.state.isPlaylistMode && this.player && typeof this.player.getPlaylistIndex === 'function') {
                  const idx = this.player.getPlaylistIndex();
                  if (typeof idx === 'number' && idx >= 0) {
                    plIdx = idx;
                  }
                }

                this.updateState({
                  status: 'playing',
                  errorMessage: null,
                  errorCode: null,
                  errorVideoId: null,
                  isRecovering: false,
                  trackStatuses: nextStatuses,
                  playlistCurrentIndex: plIdx
                });
                break;
              }
              case 2: { // PAUSED
                const nextStatuses = { ...this.state.trackStatuses };
                if (nextStatuses[currentTrackId] === 'playing' || nextStatuses[currentTrackId] === 'buffering') {
                  nextStatuses[currentTrackId] = 'paused';
                }
                this.updateState({ status: 'paused', trackStatuses: nextStatuses });
                break;
              }
              case 3: { // BUFFERING
                const nextStatuses = { ...this.state.trackStatuses };
                if (nextStatuses[currentTrackId] !== 'embedding_disabled' && nextStatuses[currentTrackId] !== 'unavailable') {
                  nextStatuses[currentTrackId] = 'buffering';
                }
                this.updateState({ status: 'buffering', trackStatuses: nextStatuses });
                break;
              }
              case 0: { // ENDED
                if (this.state.isPlaylistMode) {
                  // YouTube playlist handles natural track advancement natively
                  if (this.player && typeof this.player.getPlaylistIndex === 'function') {
                    const nextIdx = this.player.getPlaylistIndex();
                    if (typeof nextIdx === 'number') {
                      this.updateState({ playlistCurrentIndex: nextIdx });
                    }
                  }
                } else {
                  this.nextTrack(true);
                }
                break;
              }
              case 5: { // CUED
                const nextStatuses = { ...this.state.trackStatuses };
                if (nextStatuses[currentTrackId] !== 'embedding_disabled' && nextStatuses[currentTrackId] !== 'unavailable') {
                  nextStatuses[currentTrackId] = 'ready';
                }
                this.updateState({ status: 'cued', trackStatuses: nextStatuses });
                break;
              }
              default:
                break;
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (event: any) => {
            this.handlePlayerError(event.data);
          }
        }
      });
    });
  }

  /**
   * Comprehensive handler for YouTube IFrame error codes (2, 5, 100, 101, 150, 153)
   */
  public handlePlayerError(errorCode: number): void {
    console.warn(`[MineNotes Jukebox] YouTube error code ${errorCode} on track "${this.state.currentTrack.title}" (${this.state.currentTrack.videoId})`);

    const currentTrackId = this.state.currentTrack.id;
    let trackStatus: TrackStatus = 'error';
    let msg = 'Playback encountered an issue.';

    if (errorCode === 101 || errorCode === 150) {
      trackStatus = 'embedding_disabled';
      msg = 'Owner has disabled embedding for this video.';
    } else if (errorCode === 100) {
      trackStatus = 'unavailable';
      msg = 'This video or playlist has been removed or marked private.';
    } else if (errorCode === 2) {
      trackStatus = 'error';
      msg = 'Invalid video ID or request parameter.';
    } else if (errorCode === 5) {
      trackStatus = 'error';
      msg = 'HTML5 playback error. Click Retry Check to recover.';
    } else if (errorCode === 153) {
      trackStatus = 'error';
      msg = 'Player identification error (HTTP Referer).';
    }

    const updatedStatuses = {
      ...this.state.trackStatuses,
      [currentTrackId]: trackStatus
    };

    this.updateState({
      status: 'error',
      errorMessage: msg,
      errorCode: errorCode,
      errorVideoId: this.state.currentTrack.videoId,
      trackStatuses: updatedStatuses,
      isRecovering: false
    });

    // If skipUnavailable is enabled and track is owner-disabled or unavailable, cleanly advance
    if (this.state.skipUnavailable && (errorCode === 101 || errorCode === 150 || errorCode === 100)) {
      this.clearAutoSkipTimer();
      this.autoSkipTimer = setTimeout(() => {
        if (this.state.status === 'error' && this.state.currentTrack.id === currentTrackId) {
          const nextTrack = this.getNextPlayableTrack(1);
          if (nextTrack.id !== currentTrackId) {
            this.selectTrack(nextTrack.id, true);
          }
        }
      }, 1500);
    }
  }

  /**
   * Find next playable C418 track based on track status dictionary
   */
  public getNextPlayableTrack(direction: 1 | -1 = 1): Track {
    const currentIndex = C418_PLAYLIST.findIndex(t => t.id === this.state.currentTrack.id);
    const total = C418_PLAYLIST.length;

    if (!this.state.skipUnavailable) {
      const nextIndex = (currentIndex + direction + total) % total;
      return C418_PLAYLIST[nextIndex];
    }

    // Look for next track that is NOT verified embedding_disabled or unavailable
    for (let i = 1; i <= total; i++) {
      const candidateIndex = (currentIndex + (direction * i) + (total * 10)) % total;
      const candidate = C418_PLAYLIST[candidateIndex];
      const status = this.state.trackStatuses[candidate.id];
      if (status !== 'embedding_disabled' && status !== 'unavailable') {
        return candidate;
      }
    }

    const fallbackIndex = (currentIndex + direction + total) % total;
    return C418_PLAYLIST[fallbackIndex];
  }

  public toggleSkipUnavailable(): void {
    const nextVal = !this.state.skipUnavailable;
    this.updateState({ skipUnavailable: nextVal });
    savePrefs({ skipUnavailable: nextVal });
  }

  public setDisplayMode(mode: JukeboxDisplayMode): void {
    if (mode === 'closed') {
      this.pause();
    }
    this.updateState({ displayMode: mode });
  }

  public openExpanded(): void {
    this.updateState({ displayMode: 'expanded' });
    // Backup restore and other tabs may have updated the local music library.
    if (typeof window !== 'undefined' && window.indexedDB) void this.refreshLibrary();
  }

  public minimize(): void {
    this.updateState({ displayMode: 'compact' });
  }

  public close(): void {
    this.clearAutoSkipTimer();
    this.pause();
    this.updateState({ displayMode: 'closed' });
  }

  public detachPlayer(): void {
    this.clearAutoSkipTimer();
    this.pause();
    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // ignore
      }
      this.player = null;
    }
    this.updateState({ status: 'paused', isApiReady: false });
  }

  public play(): void {
    if (!this.state.isOnline) return;

    this.clearAutoSkipTimer();

    if (this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo();
      } catch {
        this.pendingPlayOnReady = true;
      }
    } else {
      this.pendingPlayOnReady = true;
      if (this.containerElementId) {
        this.attachPlayer(this.containerElementId);
      }
    }
  }

  public pause(): void {
    this.pendingPlayOnReady = false;
    this.clearAutoSkipTimer();
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch {
        // ignore
      }
    }
    if (!this.player || !this.state.isApiReady) this.updateState({ status: 'paused' });
  }

  public togglePlay(): void {
    if (this.state.status === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Select and play a C418 soundtrack track.
   * Does NOT assume or hardcode tracks as permanently disabled.
   */
  public selectTrack(trackId: string, autoPlay: boolean = true): void {
    this.clearAutoSkipTimer();
    const track = C418_PLAYLIST.find(t => t.id === trackId);
    if (!track) return;

    // Guard against redundant loadVideoById when already playing/buffering the exact same track
    if (!this.state.isPlaylistMode && this.state.currentTrack.id === trackId && (this.state.status === 'playing' || this.state.status === 'buffering')) {
      return;
    }

    if (!this.state.isPlaylistMode && this.state.currentTrack.id === trackId && this.state.status === 'paused' && autoPlay) {
      this.play();
      return;
    }

    this.currentVideoOperationId++;
    const nextStatuses = { ...this.state.trackStatuses, [track.id]: 'loading' as TrackStatus };

    this.updateState({
      currentTrack: track,
      status: autoPlay ? 'buffering' : 'cued',
      errorMessage: null,
      errorCode: null,
      errorVideoId: null,
      trackStatuses: nextStatuses,
      isPlaylistMode: false,
      currentCustomSongId: null,
      currentCustomPlaylistId: null
    });
    savePrefs({ trackId });

    if (this.player && typeof this.player.loadVideoById === 'function') {
      try {
        if (autoPlay) {
          this.player.loadVideoById(track.videoId);
        } else {
          this.player.cueVideoById(track.videoId);
        }
      } catch (err) {
        console.warn('Error loading video by ID:', err);
      }
    } else {
      this.pendingPlayOnReady = autoPlay;
      if (this.containerElementId) {
        this.attachPlayer(this.containerElementId);
      }
    }
  }

  /**
   * Select and play a user-added custom song from IndexedDB
   */
  public selectCustomSong(song: CustomSongItem, autoPlay: boolean = true): void {
    this.clearAutoSkipTimer();

    const customTrack: Track = {
      id: song.id,
      title: song.title,
      artist: 'User Song',
      album: 'My Music',
      videoId: song.videoId,
      discColor: song.discColor,
      discName: 'custom',
      duration: 'Custom',
      description: song.sourceUrl
    };

    this.currentVideoOperationId++;
    const nextStatuses = { ...this.state.trackStatuses, [song.id]: 'loading' as TrackStatus };

    this.updateState({
      currentTrack: customTrack,
      status: autoPlay ? 'buffering' : 'cued',
      errorMessage: null,
      errorCode: null,
      errorVideoId: null,
      trackStatuses: nextStatuses,
      isPlaylistMode: false,
      currentCustomSongId: song.id,
      currentCustomPlaylistId: null
    });

    if (this.player && typeof this.player.loadVideoById === 'function') {
      try {
        if (autoPlay) {
          this.player.loadVideoById(song.videoId);
        } else {
          this.player.cueVideoById(song.videoId);
        }
      } catch (err) {
        console.warn('Error loading custom video:', err);
      }
    } else {
      this.pendingPlayOnReady = autoPlay;
      if (this.containerElementId) {
        this.attachPlayer(this.containerElementId);
      }
    }
  }

  /**
   * Select and play a user-added custom playlist using official YouTube IFrame API
   */
  public selectCustomPlaylist(playlist: CustomPlaylistItem, autoPlay: boolean = true): void {
    this.clearAutoSkipTimer();

    const playlistTrack: Track = {
      id: playlist.id,
      title: playlist.title,
      artist: 'YouTube Playlist',
      album: 'My Playlists',
      videoId: '',
      discColor: playlist.discColor,
      discName: 'playlist',
      duration: 'Playlist',
      description: playlist.sourceUrl
    };

    this.currentVideoOperationId++;
    this.updateState({
      currentTrack: playlistTrack,
      status: autoPlay ? 'buffering' : 'cued',
      errorMessage: null,
      errorCode: null,
      errorVideoId: null,
      isPlaylistMode: true,
      currentCustomPlaylistId: playlist.id,
      currentCustomSongId: null,
      playlistCurrentIndex: 0
    });
    savePrefs({ lastPlaylistId: playlist.playlistId });

    if (this.player && typeof this.player.loadPlaylist === 'function') {
      try {
        if (autoPlay) {
          this.player.loadPlaylist({
            list: playlist.playlistId,
            listType: 'playlist',
            index: 0
          });
        } else {
          this.player.cuePlaylist({
            list: playlist.playlistId,
            listType: 'playlist',
            index: 0
          });
        }
      } catch (err) {
        console.warn('Error loading custom playlist:', err);
      }
    } else {
      this.pendingPlayOnReady = autoPlay;
      if (this.containerElementId) {
        this.attachPlayer(this.containerElementId);
      }
    }
  }

  /**
   * Playlist controls: next, prev, loop, shuffle
   */
  public nextTrack(autoPlay: boolean = true): void {
    if (this.state.isPlaylistMode && this.player && typeof this.player.nextVideo === 'function') {
      try {
        this.player.nextVideo();
        return;
      } catch {
        // fallback
      }
    }

    if (this.state.currentCustomSongId && this.state.customSongs.length > 0) {
      const idx = this.state.customSongs.findIndex(s => s.id === this.state.currentCustomSongId);
      const nextIdx = (idx + 1) % this.state.customSongs.length;
      this.selectCustomSong(this.state.customSongs[nextIdx], autoPlay);
      return;
    }

    const next = this.getNextPlayableTrack(1);
    this.selectTrack(next.id, autoPlay);
  }

  public prevTrack(autoPlay: boolean = true): void {
    if (this.state.isPlaylistMode && this.player && typeof this.player.previousVideo === 'function') {
      try {
        this.player.previousVideo();
        return;
      } catch {
        // fallback
      }
    }

    if (this.state.currentCustomSongId && this.state.customSongs.length > 0) {
      const idx = this.state.customSongs.findIndex(s => s.id === this.state.currentCustomSongId);
      const prevIdx = (idx - 1 + this.state.customSongs.length) % this.state.customSongs.length;
      this.selectCustomSong(this.state.customSongs[prevIdx], autoPlay);
      return;
    }

    const prev = this.getNextPlayableTrack(-1);
    this.selectTrack(prev.id, autoPlay);
  }

  public toggleLoop(): void {
    const nextLoop = !this.state.isLooping;
    this.updateState({ isLooping: nextLoop });
    if (this.player && typeof this.player.setLoop === 'function') {
      try {
        this.player.setLoop(nextLoop);
      } catch {
        // ignore
      }
    }
  }

  public toggleShuffle(): void {
    const nextShuffle = !this.state.isShuffled;
    this.updateState({ isShuffled: nextShuffle });
    if (this.player && typeof this.player.setShuffle === 'function') {
      try {
        this.player.setShuffle(nextShuffle);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Retry Check action: resets error state and re-verifies playback through the real YouTube player
   */
  public retryCurrentTrack(): void {
    this.clearAutoSkipTimer();
    const track = this.state.currentTrack;

    // Reset status in dictionary to allow fresh check
    const updatedStatuses = { ...this.state.trackStatuses };
    delete updatedStatuses[track.id];

    this.updateState({
      status: 'buffering',
      errorMessage: null,
      errorCode: null,
      errorVideoId: null,
      isRecovering: true,
      trackStatuses: updatedStatuses
    });

    if (this.state.isPlaylistMode && this.state.currentCustomPlaylistId) {
      const pl = this.state.customPlaylists.find(p => p.id === this.state.currentCustomPlaylistId);
      if (pl && this.player && typeof this.player.loadPlaylist === 'function') {
        this.player.loadPlaylist({ list: pl.playlistId, listType: 'playlist', index: this.state.playlistCurrentIndex });
        return;
      }
    }

    if (this.player && typeof this.player.loadVideoById === 'function') {
      try {
        this.player.loadVideoById(track.videoId);
      } catch {
        if (this.containerElementId) {
          this.attachPlayer(this.containerElementId);
        }
      }
    } else if (this.containerElementId) {
      this.attachPlayer(this.containerElementId);
    }
  }

  // === CUSTOM MEDIA ADD / REMOVE / RENAME METHODS ===

  public async addCustomSong(url: string, customTitle?: string): Promise<{ success: boolean; error?: string; song?: CustomSongItem }> {
    const parse = parseYouTubeUrl(url);
    if (!parse.isValid || !parse.videoId) {
      return { success: false, error: parse.error || 'Please enter a valid YouTube video link.' };
    }

    try {
      const song = await jukeboxRepository.addCustomSong({
        videoId: parse.videoId,
        title: customTitle?.trim() || `YouTube Track (${parse.videoId})`,
        sourceUrl: parse.cleanUrl || url
      });
      await this.refreshLibrary();
      return { success: true, song };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save song.' };
    }
  }

  public async addCustomPlaylist(url: string, customTitle?: string): Promise<{ success: boolean; error?: string; playlist?: CustomPlaylistItem }> {
    const parse = parseYouTubeUrl(url);
    if (!parse.isValid || !parse.playlistId) {
      return { success: false, error: parse.error || 'Please enter a valid YouTube playlist link.' };
    }

    try {
      const playlist = await jukeboxRepository.addCustomPlaylist({
        playlistId: parse.playlistId,
        title: customTitle?.trim() || `YouTube Playlist (${parse.playlistId.slice(0, 8)}...)`,
        sourceUrl: parse.cleanUrl || url
      });
      await this.refreshLibrary();
      return { success: true, playlist };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save playlist.' };
    }
  }

  public async removeCustomSong(id: string): Promise<void> {
    await jukeboxRepository.deleteCustomSong(id);
    if (this.state.currentCustomSongId === id) {
      this.selectTrack(C418_PLAYLIST[0].id, false);
    }
    await this.refreshLibrary();
  }

  public async removeCustomPlaylist(id: string): Promise<void> {
    await jukeboxRepository.deleteCustomPlaylist(id);
    if (this.state.currentCustomPlaylistId === id) {
      this.selectTrack(C418_PLAYLIST[0].id, false);
    }
    await this.refreshLibrary();
  }

  public async renameCustomSong(id: string, newTitle: string): Promise<void> {
    if (!newTitle.trim()) return;
    await jukeboxRepository.updateCustomSong(id, { title: newTitle.trim() });
    if (this.state.currentCustomSongId === id) {
      this.updateState({
        currentTrack: { ...this.state.currentTrack, title: newTitle.trim() }
      });
    }
    await this.refreshLibrary();
  }

  public async renameCustomPlaylist(id: string, newTitle: string): Promise<void> {
    if (!newTitle.trim()) return;
    await jukeboxRepository.updateCustomPlaylist(id, { title: newTitle.trim() });
    if (this.state.currentCustomPlaylistId === id) {
      this.updateState({
        currentTrack: { ...this.state.currentTrack, title: newTitle.trim() }
      });
    }
    await this.refreshLibrary();
  }

  public async toggleSongFavorite(id: string): Promise<void> {
    await jukeboxRepository.toggleSongFavorite(id);
    await this.refreshLibrary();
  }

  public async togglePlaylistFavorite(id: string): Promise<void> {
    await jukeboxRepository.togglePlaylistFavorite(id);
    await this.refreshLibrary();
  }

  // === VOLUME AND MUTE ===

  public setVolume(vol: number): void {
    const safeVol = Math.max(0, Math.min(100, Math.round(vol)));
    this.updateState({ volume: safeVol, isMuted: safeVol === 0 });
    savePrefs({ volume: safeVol, isMuted: safeVol === 0 });

    if (this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(safeVol);
        if (safeVol > 0 && typeof this.player.isMuted === 'function' && this.player.isMuted()) {
          this.player.unMute();
        }
      } catch {
        // ignore
      }
    }
  }

  public toggleMute(): void {
    const nextMuted = !this.state.isMuted;
    this.updateState({ isMuted: nextMuted });
    savePrefs({ isMuted: nextMuted });

    if (this.player) {
      try {
        if (nextMuted && typeof this.player.mute === 'function') {
          this.player.mute();
        } else if (!nextMuted && typeof this.player.unMute === 'function') {
          this.player.unMute();
        }
      } catch {
        // ignore
      }
    }
  }
}

export const jukeboxController = new JukeboxController();
