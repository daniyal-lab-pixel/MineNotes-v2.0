import React from 'react';
import styles from './JukeboxPanel.module.css';
import { type CustomPlaylistItem } from '../../storage/database';
import { jukeboxController } from './jukeboxController';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface CustomPlaylistListProps {
  playlists: CustomPlaylistItem[];
  currentPlaylistId: string | null;
  isPlaying: boolean;
  onSelectPlaylist: (playlist: CustomPlaylistItem) => void;
  onOpenAddModal: () => void;
}

export const CustomPlaylistList: React.FC<CustomPlaylistListProps> = ({
  playlists,
  currentPlaylistId,
  isPlaying,
  onSelectPlaylist,
  onOpenAddModal
}) => {
  if (playlists.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No YouTube playlists added yet.</p>
        <button
          type="button"
          className={`${styles.pixelModalBtn} ${styles.pixelModalBtnPlaylist}`}
          onClick={() => {
            playButtonClick();
            onOpenAddModal();
          }}
          style={{ marginTop: '8px' }}
        >
          + Add Your First Playlist
        </button>
      </div>
    );
  }

  const handleRename = (e: React.MouseEvent, pl: CustomPlaylistItem) => {
    e.stopPropagation();
    playButtonClick();
    const newTitle = window.prompt('Rename playlist:', pl.title);
    if (newTitle && newTitle.trim()) {
      jukeboxController.renameCustomPlaylist(pl.id, newTitle.trim());
    }
  };

  const handleDelete = (e: React.MouseEvent, pl: CustomPlaylistItem) => {
    e.stopPropagation();
    playButtonClick();
    if (window.confirm(`Remove playlist "${pl.title}" from your collection?`)) {
      jukeboxController.removeCustomPlaylist(pl.id);
    }
  };

  const handleToggleFav = (e: React.MouseEvent, pl: CustomPlaylistItem) => {
    e.stopPropagation();
    playButtonClick();
    jukeboxController.togglePlaylistFavorite(pl.id);
  };

  return (
    <div className={styles.trackListContainer} role="listbox" aria-label="Custom Playlists Collection">
      {playlists.map((pl, index) => {
        const isCurrent = pl.id === currentPlaylistId;

        return (
          <div
            key={pl.id}
            role="option"
            aria-selected={isCurrent}
            className={`${styles.trackItem} ${isCurrent ? styles.trackItemActive : ''}`}
            onClick={() => {
              playButtonClick();
              onSelectPlaylist(pl);
            }}
          >
            {/* Minecraft Recessed Disc Slot */}
            <div className={styles.discSlot}>
              <PixelIcon name="disc" dyeColor={pl.discColor} size={22} />
            </div>

            {/* Track Info */}
            <div className={styles.trackDetails}>
              <div className={styles.trackTitleRow}>
                <span className={styles.trackIndex}>{index + 1}.</span>
                <span className={styles.trackTitle}>{pl.title}</span>
                {isCurrent && (
                  <span className={styles.badgePlaying}>
                    {isPlaying ? 'PLAYING' : 'READY'}
                  </span>
                )}
              </div>
              <div className={styles.trackAlbum}>
                YouTube Playlist: {pl.playlistId.slice(0, 16)}...
              </div>
            </div>

            {/* Actions: Favorite, Rename, Delete */}
            <div className={styles.itemActionBtns}>
              <button
                type="button"
                className={`${styles.iconSmallBtn} ${pl.isFavorite ? styles.favActive : ''}`}
                onClick={(e) => handleToggleFav(e, pl)}
                title={pl.isFavorite ? "Remove from favorites" : "Favorite this playlist"}
              >
                ★
              </button>
              <button
                type="button"
                className={styles.iconSmallBtn}
                onClick={(e) => handleRename(e, pl)}
                title="Rename playlist"
              >
                ✎
              </button>
              <button
                type="button"
                className={styles.iconSmallBtn}
                onClick={(e) => handleDelete(e, pl)}
                title="Delete playlist"
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
