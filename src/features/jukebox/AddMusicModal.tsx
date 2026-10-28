import React, { useState, useRef } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import styles from './JukeboxPanel.module.css';
import { parseYouTubeUrl, type YouTubeParseResult } from './urlParser';
import { jukeboxController } from './jukeboxController';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';
import { type CustomSongItem, type CustomPlaylistItem } from '../../storage/database';

export interface AddMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSongAdded?: (song: CustomSongItem) => void;
  onPlaylistAdded?: (playlist: CustomPlaylistItem) => void;
}

export const AddMusicModal: React.FC<AddMusicModalProps> = ({
  isOpen,
  onClose,
  onSongAdded,
  onPlaylistAdded
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [parseResult, setParseResult] = useState<YouTubeParseResult>({ isValid: false, type: 'invalid' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useDialogFocus(dialogRef, isOpen);

  const handleClose = () => {
    setUrl('');
    setCustomTitle('');
    setParseResult({ isValid: false, type: 'invalid' });
    setSubmitError(null);
    setIsSubmitting(false);
    onClose();
  };

  // Real-time link parsing as user types or pastes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setSubmitError(null);

    if (!val.trim()) {
      setParseResult({ isValid: false, type: 'invalid' });
      return;
    }

    const res = parseYouTubeUrl(val);
    setParseResult(res);
  };

  const handleAddSong = async () => {
    if (!parseResult.videoId) return;
    playButtonClick();
    setIsSubmitting(true);
    setSubmitError(null);

    const res = await jukeboxController.addCustomSong(url, customTitle);
    setIsSubmitting(false);

    if (res.success && res.song) {
      onSongAdded?.(res.song);
      onClose();
    } else {
      setSubmitError(res.error || 'Failed to add song.');
    }
  };

  const handleAddPlaylist = async () => {
    if (!parseResult.playlistId) return;
    playButtonClick();
    setIsSubmitting(true);
    setSubmitError(null);

    const res = await jukeboxController.addCustomPlaylist(url, customTitle);
    setIsSubmitting(false);

    if (res.success && res.playlist) {
      onPlaylistAdded?.(res.playlist);
      onClose();
    } else {
      setSubmitError(res.error || 'Failed to add playlist.');
    }
  };

  if (!isOpen) return null;

  const canAddSong = parseResult.isValid && !!parseResult.videoId && !isSubmitting;
  const canAddPlaylist = parseResult.isValid && !!parseResult.playlistId && !isSubmitting;

  return (
    <div
      className={styles.modalBackdropTop}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add to Jukebox"
    >
      <div ref={dialogRef} aria-modal="true" className={styles.addMusicModal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.addMusicTitle}>
          <PixelIcon name="disc" dyeColor="#fed83d" size={20} />
          Add to Jukebox
        </h3>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="yt-url-input">
            Paste YouTube video or playlist link:
          </label>
          <input
            id="yt-url-input"
            type="text"
            className={styles.minecraftInput}
            placeholder="e.g. https://www.youtube.com/watch?v=... or playlist"
            value={url}
            onChange={handleUrlChange}
            autoFocus
          />
        </div>

        {/* Live validation feedback */}
        {url.trim().length > 0 && (
          <div className={styles.previewBox}>
            {parseResult.isValid ? (
              <div className={styles.previewValid}>
                {parseResult.type === 'video' && (
                  <span>✓ Detected Single Video (ID: {parseResult.videoId})</span>
                )}
                {parseResult.type === 'playlist' && (
                  <span>✓ Detected Playlist (ID: {parseResult.playlistId})</span>
                )}
                {parseResult.type === 'video_and_playlist' && (
                  <span>✓ Detected Video with Playlist! You can add either below.</span>
                )}
              </div>
            ) : (
              <div className={styles.previewInvalid}>
                <span>✕ {parseResult.error || 'Invalid YouTube URL.'}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="yt-title-input">
            Custom Title (Optional):
          </label>
          <input
            id="yt-title-input"
            type="text"
            className={styles.minecraftInput}
            placeholder="Give this song or playlist a custom name"
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
          />
        </div>

        {submitError && (
          <div className={styles.previewBox}>
            <div className={styles.previewInvalid}>✕ {submitError}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.modalActionsRow}>
          <button
            type="button"
            className={styles.pixelModalBtn}
            onClick={() => {
              playButtonClick();
              handleClose();
            }}
          >
            Cancel
          </button>

          {parseResult.type === 'video_and_playlist' ? (
            <>
              <button
                type="button"
                className={`${styles.pixelModalBtn} ${styles.pixelModalBtnPrimary}`}
                onClick={handleAddSong}
                disabled={!canAddSong}
              >
                Add Song
              </button>
              <button
                type="button"
                className={`${styles.pixelModalBtn} ${styles.pixelModalBtnPlaylist}`}
                onClick={handleAddPlaylist}
                disabled={!canAddPlaylist}
              >
                Add Playlist
              </button>
            </>
          ) : parseResult.type === 'playlist' ? (
            <button
              type="button"
              className={`${styles.pixelModalBtn} ${styles.pixelModalBtnPlaylist}`}
              onClick={handleAddPlaylist}
              disabled={!canAddPlaylist}
            >
              Add Playlist
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.pixelModalBtn} ${styles.pixelModalBtnPrimary}`}
              onClick={handleAddSong}
              disabled={!canAddSong}
            >
              Add Song
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
