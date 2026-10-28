import React from 'react';
import styles from './JukeboxPanel.module.css';
import { C418_PLAYLIST, type Track } from './trackCatalog';
import { type PlaybackStatus, type TrackStatus } from './jukeboxController';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface TrackListProps {
  currentTrackId: string;
  playbackStatus: PlaybackStatus;
  trackStatuses: Record<string, TrackStatus>;
  onSelectTrack: (trackId: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  currentTrackId,
  playbackStatus,
  trackStatuses,
  onSelectTrack
}) => {
  return (
    <div className={styles.trackListContainer} role="listbox" aria-label="Minecraft Soundtrack Tracks">
      {C418_PLAYLIST.map((track: Track, index: number) => {
        const isCurrent = track.id === currentTrackId;
        const trackStatus = trackStatuses[track.id] || 'ready';

        let badgeText: string | null = null;
        let badgeClass = styles.badgeReady;

        if (trackStatus === 'embedding_disabled') {
          badgeText = 'DISABLED';
          badgeClass = styles.badgeDisabled;
        } else if (trackStatus === 'unavailable') {
          badgeText = 'UNAVAILABLE';
          badgeClass = styles.badgeUnavailable;
        } else if (isCurrent) {
          if (playbackStatus === 'playing') {
            badgeText = 'PLAYING';
            badgeClass = styles.badgePlaying;
          } else if (playbackStatus === 'buffering') {
            badgeText = 'BUFFERING';
            badgeClass = styles.badgeBuffering;
          } else if (playbackStatus === 'paused') {
            badgeText = 'PAUSED';
            badgeClass = styles.badgePaused;
          } else if (playbackStatus === 'cued') {
            badgeText = 'READY';
            badgeClass = styles.badgeReady;
          }
        }

        return (
          <div
            key={track.id}
            role="option"
            aria-selected={isCurrent}
            title={
              trackStatus === 'embedding_disabled'
                ? 'Owner has disabled embedding for this video (Click to view Watch on YouTube link)'
                : `${track.artist} - ${track.title}`
            }
            className={`${styles.trackItem} ${isCurrent ? styles.trackItemActive : ''}`}
            onClick={() => {
              playButtonClick();
              onSelectTrack(track.id);
            }}
          >
            {/* Minecraft Recessed Disc Slot */}
            <div className={styles.discSlot}>
              <PixelIcon name="disc" dyeColor={track.discColor} size={22} />
            </div>

            {/* Track Info */}
            <div className={styles.trackDetails}>
              <div className={styles.trackTitleRow}>
                <span className={styles.trackIndex}>{index + 1}.</span>
                <span className={styles.trackTitle}>{track.title}</span>
                {badgeText && (
                  <span className={badgeClass}>
                    {badgeText}
                  </span>
                )}
              </div>
              <div className={styles.trackAlbum}>
                {track.artist} — {track.album} ({track.discName})
              </div>
            </div>

            {/* Track Duration */}
            <div className={styles.trackDuration}>{track.duration}</div>
          </div>
        );
      })}
    </div>
  );
};
