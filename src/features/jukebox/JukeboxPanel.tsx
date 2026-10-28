import React, { useState, useEffect } from 'react';
import styles from './JukeboxPanel.module.css';
import { jukeboxController, type JukeboxState } from './jukeboxController';
import { YouTubePlayer } from './YouTubePlayer';
import { TrackList } from './TrackList';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface JukeboxPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDocked?: boolean;
  onToggleDock?: () => void;
}

export const JukeboxPanel: React.FC<JukeboxPanelProps> = ({
  isOpen,
  onClose,
  isDocked = false,
  onToggleDock
}) => {
  const [state, setState] = useState<JukeboxState>(jukeboxController.getState());

  useEffect(() => {
    const unsubscribe = jukeboxController.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  // Keyboard shortcut: Escape closes jukebox if open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPlaying = state.status === 'playing';

  const handlePlayPause = () => {
    playButtonClick();
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

  const content = (
    <div
      className={isDocked ? styles.jukeboxDocked : styles.jukeboxModal}
      role="dialog"
      aria-label="MineNotes Jukebox"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className={styles.headerRow}>
        <h3 className={styles.headerTitle}>
          <PixelIcon name="disc" dyeColor={state.currentTrack.discColor} size={20} />
          MineNotes Jukebox
        </h3>
        <div className={styles.headerActions}>
          {onToggleDock && (
            <button
              type="button"
              className={styles.dockToggleBtn}
              onClick={() => {
                playButtonClick();
                onToggleDock();
              }}
              title={isDocked ? "Expand to Center" : "Dock to Side"}
              aria-label={isDocked ? "Expand to Center" : "Dock to Side"}
            >
              {isDocked ? '⤢' : '⇥'}
            </button>
          )}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => {
              playButtonClick();
              onClose();
            }}
            title="Close Jukebox (Esc)"
            aria-label="Close Jukebox"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Visible Official YouTube Embedded Player */}
      <YouTubePlayer state={state} />

      {/* Now Playing Info Plate */}
      <div className={styles.nowPlayingCard}>
        <PixelIcon name="disc" dyeColor={state.currentTrack.discColor} size={24} />
        <div className={styles.nowPlayingInfo}>
          <div className={styles.nowPlayingLabel}>
            Now Playing {isPlaying ? '(Active)' : '(Ready)'}
          </div>
          <div className={styles.nowPlayingTitle}>{state.currentTrack.title}</div>
          <div className={styles.nowPlayingAlbum}>
            {state.currentTrack.artist} — {state.currentTrack.album}
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
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <PixelIcon name={isPlaying ? "pause" : "play"} size={14} />
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

      {/* Track List */}
      <TrackList
        currentTrackId={state.currentTrack.id}
        playbackStatus={state.status}
        trackStatuses={state.trackStatuses}
        onSelectTrack={(trackId) => jukeboxController.selectTrack(trackId, true)}
      />
    </div>
  );

  if (isDocked) {
    return content;
  }

  return (
    <div className={styles.jukeboxOverlay} onClick={onClose}>
      {content}
    </div>
  );
};
