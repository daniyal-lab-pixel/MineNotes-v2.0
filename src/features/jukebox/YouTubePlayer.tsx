import React, { useEffect } from 'react';
import styles from './JukeboxPanel.module.css';
import { jukeboxController, type JukeboxState } from './jukeboxController';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';

export interface YouTubePlayerProps {
  state: JukeboxState;
  isCompact?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ state, isCompact = false }) => {
  const playerMountId = 'minenotes-yt-iframe-player';

  useEffect(() => {
    // Attach player instance to the visible container
    jukeboxController.attachPlayer(playerMountId);

    return () => {
      // Clean up player on full component unmount
      jukeboxController.detachPlayer();
    };
  }, []);

  const currentTrackStatus = state.trackStatuses[state.currentTrack.id] || 'ready';
  const isBlocked = currentTrackStatus === 'embedding_disabled' || state.errorCode === 150 || state.errorCode === 101;
  const isUnavailable = currentTrackStatus === 'unavailable' || state.errorCode === 100;
  const isErrorState = state.status === 'error' || isBlocked || isUnavailable;

  return (
    <div className={styles.videoPlayerWrapper}>
      {/* Real visible player container matching YouTube minimum 200x200 requirement */}
      <div className={isCompact ? styles.videoContainerCompact : styles.videoContainer}>
        <div id={playerMountId} className={styles.iframeTarget} />
      </div>

        {/* Buffering Indicator */}
        {state.isOnline && state.status === 'buffering' && !isErrorState && (
          <div className={styles.playerStatus}>
            Buffering...
          </div>
        )}

        {/* Offline notice outside the official player */}
        {!state.isOnline && (
          <div className={styles.playerNotice}>
            <PixelIcon name="close" size={24} color="#fed83d" />
            <p className={styles.noticeText}>
              You're offline. Your books are still available, but YouTube music needs internet.
            </p>
          </div>
        )}

        {/* Playback error and restriction notices never cover YouTube controls */}
        {state.isOnline && isErrorState && (
          <div className={styles.playerNotice}>
            <p className={styles.noticeText}>
              {isBlocked
                ? 'Owner has disabled embedding for this video.'
                : isUnavailable
                ? 'This video has been removed or marked private.'
                : state.errorMessage || 'Playback encountered an issue.'}
            </p>

            {/* Official Watch on YouTube link */}
            {state.isPlaylistMode && state.currentCustomPlaylistId ? (
              <a
                href={state.currentTrack.description || `https://www.youtube.com/playlist?list=${state.currentCustomPlaylistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.watchOnYtBtn}
                title="Open playlist directly on YouTube"
              >
                Watch Playlist on YouTube ↗
              </a>
            ) : state.currentTrack.videoId ? (
              <a
                href={`https://www.youtube.com/watch?v=${state.currentTrack.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.watchOnYtBtn}
                title="Watch official video on YouTube in a new tab"
              >
                Watch on YouTube ↗
              </a>
            ) : null}

            {/* Retry Check action for potentially recoverable errors */}
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => jukeboxController.retryCurrentTrack()}
            >
              Retry Check ⟳
            </button>
          </div>
        )}
    </div>
  );
};
