import React, { useState, useEffect, useRef } from 'react';
import styles from './JukeboxPanel.module.css';
import { jukeboxController, type JukeboxState } from './jukeboxController';
import { useMediaQuery, MOBILE_JUKEBOX_QUERY } from '../../hooks/useMediaQuery';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { YouTubePlayer } from './YouTubePlayer';
import { TrackList } from './TrackList';
import { CustomTrackList } from './CustomTrackList';
import { CustomPlaylistList } from './CustomPlaylistList';
import { AddMusicModal } from './AddMusicModal';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

function getStatusLabel(state: JukeboxState): string {
  const trackStatus = state.trackStatuses[state.currentTrack.id];
  if (!state.isOnline) return 'OFFLINE (INTERNET REQUIRED)';
  if (trackStatus === 'embedding_disabled' || state.errorCode === 150 || state.errorCode === 101) {
    return 'EMBEDDING DISABLED BY OWNER';
  }
  if (trackStatus === 'unavailable' || state.errorCode === 100) {
    return 'VIDEO OR PLAYLIST UNAVAILABLE';
  }
  if (state.status === 'playing') {
    return state.isPlaylistMode ? 'PLAYING PLAYLIST' : 'NOW PLAYING';
  }
  if (state.status === 'buffering') return 'BUFFERING...';
  if (state.status === 'paused') return 'PAUSED';
  if (state.status === 'cued') return 'READY TO PLAY';
  if (state.status === 'error') return 'PLAYBACK ERROR';
  return 'JUKEBOX READY';
}

export const PersistentJukebox: React.FC<{ returnLabel?: string }> = ({ returnLabel = 'Back to MineNotes' }) => {
  const mobile = useMediaQuery(MOBILE_JUKEBOX_QUERY);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<JukeboxState>(jukeboxController.getState());
  const [isDocked, setIsDocked] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    return jukeboxController.subscribe(setState);
  }, []);

  useDialogFocus(dialogRef, !isAddModalOpen && state.displayMode !== 'closed' && (mobile || (state.displayMode === 'expanded' && !isDocked)));

  // Keyboard shortcut: Escape in expanded mode minimizes to compact player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else if (state.displayMode === 'expanded' || mobile) {
          if (mobile) jukeboxController.close();
          else jukeboxController.minimize();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.displayMode, isAddModalOpen, mobile]);

  if (state.displayMode === 'closed') {
    return null;
  }

  const isCompact = state.displayMode === 'compact' && !mobile;
  const isPlaying = state.status === 'playing';
  const currentTrackStatus = state.trackStatuses[state.currentTrack.id] || 'ready';
  const isCurrentTrackBlocked =
    currentTrackStatus === 'embedding_disabled' ||
    currentTrackStatus === 'unavailable' ||
    state.errorCode === 150 ||
    state.errorCode === 101;

  const handlePlayPause = () => {
    playButtonClick();
    if (isCurrentTrackBlocked) {
      jukeboxController.nextTrack(true);
      return;
    }
    jukeboxController.togglePlay();
  };

  const handleNext = () => {
    playButtonClick();
    jukeboxController.nextTrack(true);
  };

  const handlePrev = () => {
    playButtonClick();
    jukeboxController.prevTrack(true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    jukeboxController.setVolume(val);
  };

  const handleToggleMute = () => {
    playButtonClick();
    jukeboxController.toggleMute();
  };

  const handleMinimize = () => {
    playButtonClick();
    jukeboxController.minimize();
  };

  const handleExpand = () => {
    playButtonClick();
    jukeboxController.openExpanded();
  };

  const handleClose = () => {
    playButtonClick();
    jukeboxController.close();
  };

  const handleToggleDock = () => {
    playButtonClick();
    setIsDocked(prev => !prev);
  };

  const handleToggleSkipUnavailable = () => {
    playButtonClick();
    jukeboxController.toggleSkipUnavailable();
  };

  return (
    <>
      {/* Click-away backdrop only when in expanded modal mode */}
      {!mobile && !isCompact && !isDocked && (
        <div
          className={styles.modalBackdrop}
          onClick={handleMinimize}
          title="Click to minimize Jukebox"
        />
      )}

      {/* Main Single Persistent Container: Preserves YouTube player DOM identity */}
      <div
        ref={dialogRef}
        className={
          mobile ? styles.mobileScreen : isCompact
            ? styles.compactContainer
            : isDocked
            ? styles.jukeboxDocked
            : styles.jukeboxModalFixed
        }
        role="dialog"
        aria-modal={mobile || (!isCompact && !isDocked) ? true : undefined}
        aria-label="MineNotes Jukebox"
        onClick={e => e.stopPropagation()}
      >
        {/* Child 0: Header Row */}
        {isCompact ? (
          <div className={styles.compactHeaderRow}>
            <h4 className={styles.compactHeaderTitle}>
              <PixelIcon name="disc" dyeColor={state.currentTrack.discColor} size={16} />
              <span>{state.currentTrack.title}</span>
            </h4>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.dockToggleBtn}
                onClick={handleExpand}
                title="Expand Jukebox Playlist (⤢)"
                aria-label="Expand Jukebox"
              >
                ⤢
              </button>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleClose}
                title="Stop & Close Player (✕)"
                aria-label="Close Jukebox"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.headerRow}>
            <h3 className={styles.headerTitle}>
              <PixelIcon name="disc" dyeColor={state.currentTrack.discColor} size={20} />
              MineNotes Jukebox 2.0
            </h3>
            <div className={styles.headerActions}>
              {mobile && <button type="button" className={styles.returnButton} onClick={handleClose}>{returnLabel}</button>}
              <button
                type="button"
                className={`${styles.skipToggleBtn} ${state.skipUnavailable ? styles.skipToggleActive : ''}`}
                onClick={handleToggleSkipUnavailable}
                title={state.skipUnavailable ? "Auto-Skip Restricted Tracks: ON" : "Auto-Skip Restricted Tracks: OFF"}
                aria-label="Toggle Auto-Skip Restricted Tracks"
              >
                Skip Restricted: {state.skipUnavailable ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className={styles.dockToggleBtn}
                hidden={mobile}
                onClick={handleMinimize}
                title="Minimize to Mini-Player (Keep Listening)"
                aria-label="Minimize Jukebox"
              >
                _
              </button>
              <button
                type="button"
                className={styles.dockToggleBtn}
                hidden={mobile}
                onClick={handleToggleDock}
                title={isDocked ? "Expand to Center" : "Dock to Side"}
                aria-label={isDocked ? "Expand to Center" : "Dock to Side"}
              >
                {isDocked ? '⤢' : '⇥'}
              </button>
              <button
                type="button"
                className={styles.closeBtn}
                hidden={mobile}
                onClick={handleClose}
                title="Stop & Close Player (Esc)"
                aria-label="Close Jukebox"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Child 1: Stable YouTube Player Component (NEVER unmounted across minimize/expand) */}
        <YouTubePlayer state={state} isCompact={isCompact} />
        {mobile && <p className={styles.mobileHint}>Returning pauses music and keeps your book open.</p>}

        {/* Child 2: Controls and Playlist Content */}
        {isCompact ? (
          <div className={styles.compactControlsBar}>
            <div className={styles.compactPlaybackButtons}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={handlePrev}
                title="Previous Track"
                aria-label="Previous Track"
              >
                <PixelIcon name="skipPrev" size={12} />
              </button>

              <button
                type="button"
                className={`${styles.controlBtn} ${styles.playPauseBtn}`}
                onClick={handlePlayPause}
                title={
                  isCurrentTrackBlocked
                    ? "Embedding disabled — Click to skip to next track"
                    : isPlaying
                    ? "Pause"
                    : "Play"
                }
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <PixelIcon name={isPlaying ? "pause" : isCurrentTrackBlocked ? "skipNext" : "play"} size={12} />
              </button>

              <button
                type="button"
                className={styles.controlBtn}
                onClick={handleNext}
                title="Next Track"
                aria-label="Next Track"
              >
                <PixelIcon name="skipNext" size={12} />
              </button>
            </div>

            <div className={styles.compactTrackInfo} title={`${state.currentTrack.artist} - ${state.currentTrack.album}`}>
              {state.currentTrack.title}
            </div>

            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleToggleMute}
              title={state.isMuted ? "Unmute" : "Mute"}
              aria-label={state.isMuted ? "Unmute" : "Mute"}
            >
              <PixelIcon name={state.isMuted ? "mute" : "volume"} size={12} />
            </button>
          </div>
        ) : (
          <>
            {/* Library Group Tabs Row */}
            <div className={styles.libraryTabsBar}>
              <button
                type="button"
                className={`${styles.tabButton} ${state.activeTab === 'c418' ? styles.tabButtonActive : ''}`}
                onClick={() => {
                  playButtonClick();
                  jukeboxController.setActiveTab('c418');
                }}
              >
                Minecraft Soundtrack
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${state.activeTab === 'custom_songs' ? styles.tabButtonActive : ''}`}
                onClick={() => {
                  playButtonClick();
                  jukeboxController.setActiveTab('custom_songs');
                }}
              >
                My Music {state.customSongs.length > 0 && <span className={styles.tabBadge}>{state.customSongs.length}</span>}
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${state.activeTab === 'custom_playlists' ? styles.tabButtonActive : ''}`}
                onClick={() => {
                  playButtonClick();
                  jukeboxController.setActiveTab('custom_playlists');
                }}
              >
                My Playlists {state.customPlaylists.length > 0 && <span className={styles.tabBadge}>{state.customPlaylists.length}</span>}
              </button>

              <button
                type="button"
                className={styles.addMusicBtn}
                onClick={() => {
                  playButtonClick();
                  setIsAddModalOpen(true);
                }}
                title="Paste a YouTube video or playlist link"
              >
                + Add Music
              </button>
            </div>

            {/* Now Playing Info Plate */}
            <div className={styles.nowPlayingCard}>
              <PixelIcon name="disc" dyeColor={state.currentTrack.discColor} size={24} />
              <div className={styles.nowPlayingInfo}>
                <div className={styles.nowPlayingLabel}>
                  {getStatusLabel(state)}
                </div>
                <div className={styles.nowPlayingTitle}>{state.currentTrack.title}</div>
                <div className={styles.nowPlayingAlbum}>
                  {state.currentTrack.artist} — {state.currentTrack.album} {state.currentTrack.discName ? `(${state.currentTrack.discName})` : ''}
                </div>
              </div>
            </div>

            {/* Playback Controls & Volume */}
            <div className={styles.controlsBar}>
              <div className={styles.playbackButtons}>
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={handlePrev}
                  title="Previous Track"
                  aria-label="Previous Track"
                >
                  <PixelIcon name="skipPrev" size={14} />
                </button>

                <button
                  type="button"
                  className={`${styles.controlBtn} ${styles.playPauseBtn}`}
                  onClick={handlePlayPause}
                  title={
                    isCurrentTrackBlocked
                      ? "Embedding disabled by owner — Click to skip to next track"
                      : isPlaying
                      ? "Pause"
                      : "Play"
                  }
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  <PixelIcon name={isPlaying ? "pause" : isCurrentTrackBlocked ? "skipNext" : "play"} size={14} />
                </button>

                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={handleNext}
                  title="Next Track"
                  aria-label="Next Track"
                >
                  <PixelIcon name="skipNext" size={14} />
                </button>

                {/* Playlist Loop and Shuffle Controls */}
                {state.isPlaylistMode && (
                  <>
                    <button
                      type="button"
                      className={`${styles.controlBtn} ${state.isLooping ? styles.favActive : ''}`}
                      onClick={() => {
                        playButtonClick();
                        jukeboxController.toggleLoop();
                      }}
                      title={state.isLooping ? "Loop Playlist: ON" : "Loop Playlist: OFF"}
                    >
                      🔁
                    </button>
                    <button
                      type="button"
                      className={`${styles.controlBtn} ${state.isShuffled ? styles.favActive : ''}`}
                      onClick={() => {
                        playButtonClick();
                        jukeboxController.toggleShuffle();
                      }}
                      title={state.isShuffled ? "Shuffle Playlist: ON" : "Shuffle Playlist: OFF"}
                    >
                      🔀
                    </button>
                  </>
                )}
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className={styles.volumeSection}>
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={handleToggleMute}
                  title={state.isMuted ? "Unmute" : "Mute"}
                  aria-label={state.isMuted ? "Unmute" : "Mute"}
                >
                  <PixelIcon name={state.isMuted ? "mute" : "volume"} size={14} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.isMuted ? 0 : state.volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  title={`Volume: ${state.isMuted ? 0 : state.volume}%`}
                  aria-label="Volume Slider"
                />
              </div>
            </div>

            {/* Active Tab View */}
            {state.activeTab === 'c418' && (
              <TrackList
                currentTrackId={state.currentTrack.id}
                playbackStatus={state.status}
                trackStatuses={state.trackStatuses}
                onSelectTrack={(trackId) => jukeboxController.selectTrack(trackId, true)}
              />
            )}

            {state.activeTab === 'custom_songs' && (
              <CustomTrackList
                songs={state.customSongs}
                currentSongId={state.currentCustomSongId}
                isPlaying={isPlaying}
                onSelectSong={(song) => jukeboxController.selectCustomSong(song, true)}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}

            {state.activeTab === 'custom_playlists' && (
              <CustomPlaylistList
                playlists={state.customPlaylists}
                currentPlaylistId={state.currentCustomPlaylistId}
                isPlaying={isPlaying}
                onSelectPlaylist={(pl) => jukeboxController.selectCustomPlaylist(pl, true)}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}
          </>
        )}
      </div>

      {/* Add to Jukebox Modal */}
      <AddMusicModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSongAdded={(song) => {
          jukeboxController.setActiveTab('custom_songs');
          jukeboxController.selectCustomSong(song, true);
        }}
        onPlaylistAdded={(playlist) => {
          jukeboxController.setActiveTab('custom_playlists');
          jukeboxController.selectCustomPlaylist(playlist, true);
        }}
      />
    </>
  );
};
