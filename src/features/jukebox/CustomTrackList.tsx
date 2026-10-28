import React from 'react';
import styles from './JukeboxPanel.module.css';
import { type CustomSongItem } from '../../storage/database';
import { jukeboxController } from './jukeboxController';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface CustomTrackListProps {
  songs: CustomSongItem[];
  currentSongId: string | null;
  isPlaying: boolean;
  onSelectSong: (song: CustomSongItem) => void;
  onOpenAddModal: () => void;
}

export const CustomTrackList: React.FC<CustomTrackListProps> = ({
  songs,
  currentSongId,
  isPlaying,
  onSelectSong,
  onOpenAddModal
}) => {
  if (songs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>You haven't added any custom songs yet.</p>
        <button
          type="button"
          className={`${styles.pixelModalBtn} ${styles.pixelModalBtnPrimary}`}
          onClick={() => {
            playButtonClick();
            onOpenAddModal();
          }}
          style={{ marginTop: '8px' }}
        >
          + Add Your First Song
        </button>
      </div>
    );
  }

  const handleRename = (e: React.MouseEvent, song: CustomSongItem) => {
    e.stopPropagation();
    playButtonClick();
    const newTitle = window.prompt('Rename song:', song.title);
    if (newTitle && newTitle.trim()) {
      jukeboxController.renameCustomSong(song.id, newTitle.trim());
    }
  };

  const handleDelete = (e: React.MouseEvent, song: CustomSongItem) => {
    e.stopPropagation();
    playButtonClick();
    if (window.confirm(`Remove "${song.title}" from your collection?`)) {
      jukeboxController.removeCustomSong(song.id);
    }
  };

  const handleToggleFav = (e: React.MouseEvent, song: CustomSongItem) => {
    e.stopPropagation();
    playButtonClick();
    jukeboxController.toggleSongFavorite(song.id);
  };

  return (
    <div className={styles.trackListContainer} role="listbox" aria-label="Custom Songs Collection">
      {songs.map((song, index) => {
        const isCurrent = song.id === currentSongId;

        return (
          <div
            key={song.id}
            role="option"
            aria-selected={isCurrent}
            className={`${styles.trackItem} ${isCurrent ? styles.trackItemActive : ''}`}
            onClick={() => {
              playButtonClick();
              onSelectSong(song);
            }}
          >
            {/* Minecraft Recessed Disc Slot */}
            <div className={styles.discSlot}>
              <PixelIcon name="disc" dyeColor={song.discColor} size={22} />
            </div>

            {/* Track Info */}
            <div className={styles.trackDetails}>
              <div className={styles.trackTitleRow}>
                <span className={styles.trackIndex}>{index + 1}.</span>
                <span className={styles.trackTitle}>{song.title}</span>
                {isCurrent && (
                  <span className={styles.badgePlaying}>
                    {isPlaying ? 'PLAYING' : 'READY'}
                  </span>
                )}
              </div>
              <div className={styles.trackAlbum}>
                YouTube ID: {song.videoId}
              </div>
            </div>

            {/* Actions: Favorite, Rename, Delete */}
            <div className={styles.itemActionBtns}>
              <button
                type="button"
                className={`${styles.iconSmallBtn} ${song.isFavorite ? styles.favActive : ''}`}
                onClick={(e) => handleToggleFav(e, song)}
                title={song.isFavorite ? "Remove from favorites" : "Favorite this song"}
              >
                ★
              </button>
              <button
                type="button"
                className={styles.iconSmallBtn}
                onClick={(e) => handleRename(e, song)}
                title="Rename song"
              >
                ✎
              </button>
              <button
                type="button"
                className={styles.iconSmallBtn}
                onClick={(e) => handleDelete(e, song)}
                title="Delete from collection"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
