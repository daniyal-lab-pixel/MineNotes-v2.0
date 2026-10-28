import React from 'react';
import styles from './ShelfSelector.module.css';
import { type Bookshelf } from '../../storage/database';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export type ShelfFilterId = 'all' | 'favorites' | 'unsorted' | string;

export interface ShelfSelectorProps {
  shelves: Bookshelf[];
  activeShelfId: ShelfFilterId;
  shelfCounts: Record<string, number>;
  onSelectShelf: (shelfId: ShelfFilterId) => void;
  onOpenShelfManager: () => void;
  onNewShelf: () => void;
}

export const ShelfSelector: React.FC<ShelfSelectorProps> = ({
  shelves,
  activeShelfId,
  shelfCounts,
  onSelectShelf,
  onOpenShelfManager,
  onNewShelf
}) => {
  const handleSelect = (id: ShelfFilterId) => {
    playButtonClick();
    onSelectShelf(id);
  };

  const handleNewShelfClick = () => {
    playButtonClick();
    onNewShelf();
  };

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className={styles.shelfSidebar} aria-label="Bookshelf Navigation">
        {/* All Books */}
        <button
          type="button"
          className={`${styles.shelfTabBtn} ${
            activeShelfId === 'all' ? styles.shelfTabBtnActive : ''
          }`}
          onClick={() => handleSelect('all')}
        >
          <div className={styles.tabLeft}>
            <PixelIcon name="book" size={14} />
            <span className={styles.tabLabel}>All Books</span>
          </div>
          <span className={styles.tabBadge}>({shelfCounts.all || 0})</span>
        </button>

        {/* Favorites */}
        <button
          type="button"
          className={`${styles.shelfTabBtn} ${
            activeShelfId === 'favorites' ? styles.shelfTabBtnActive : ''
          }`}
          onClick={() => handleSelect('favorites')}
        >
          <div className={styles.tabLeft}>
            <span style={{ color: '#fed83d' }}>★</span>
            <span className={styles.tabLabel}>Favorites</span>
          </div>
          <span className={styles.tabBadge}>({shelfCounts.favorites || 0})</span>
        </button>

        {/* Unsorted */}
        <button
          type="button"
          className={`${styles.shelfTabBtn} ${
            activeShelfId === 'unsorted' ? styles.shelfTabBtnActive : ''
          }`}
          onClick={() => handleSelect('unsorted')}
        >
          <div className={styles.tabLeft}>
            <PixelIcon name="settings" size={12} />
            <span className={styles.tabLabel}>Unsorted</span>
          </div>
          <span className={styles.tabBadge}>({shelfCounts.unsorted || 0})</span>
        </button>

        {/* Custom Shelves */}
        {shelves.map(shelf => (
          <button
            key={shelf.id}
            type="button"
            className={`${styles.shelfTabBtn} ${
              activeShelfId === shelf.id ? styles.shelfTabBtnActive : ''
            }`}
            onClick={() => handleSelect(shelf.id)}
            title={shelf.name}
          >
            <div className={styles.tabLeft}>
              <PixelIcon name="book" size={13} />
              <span className={styles.tabLabel}>{shelf.name}</span>
            </div>
            <span className={styles.tabBadge}>({shelfCounts[shelf.id] || 0})</span>
          </button>
        ))}

        {/* New Shelf Button */}
        <button
          type="button"
          className={styles.newShelfBtn}
          onClick={handleNewShelfClick}
          title="Create New Shelf"
        >
          <PixelIcon name="plus" size={12} color="#c6b29d" />
          <span>New Shelf</span>
        </button>

        {/* Manage Shelves Link */}
        <button
          type="button"
          className={styles.newShelfBtn}
          style={{ marginTop: '4px', borderStyle: 'solid' }}
          onClick={() => {
            playButtonClick();
            onOpenShelfManager();
          }}
          title="Manage All Shelves"
        >
          <PixelIcon name="settings" size={12} />
          <span>Manage Shelves</span>
        </button>
      </aside>

      {/* Mobile Horizontal Pill Strip */}
      <div className={styles.mobileStrip} role="group" aria-label="Bookshelf Navigation">
        <button
          type="button"
          className={`${styles.mobilePill} ${
            activeShelfId === 'all' ? styles.mobilePillActive : ''
          }`}
          onClick={() => handleSelect('all')}
        >
          All ({shelfCounts.all || 0})
        </button>

        <button
          type="button"
          className={`${styles.mobilePill} ${
            activeShelfId === 'favorites' ? styles.mobilePillActive : ''
          }`}
          onClick={() => handleSelect('favorites')}
        >
          ★ Favs ({shelfCounts.favorites || 0})
        </button>

        <button
          type="button"
          className={`${styles.mobilePill} ${
            activeShelfId === 'unsorted' ? styles.mobilePillActive : ''
          }`}
          onClick={() => handleSelect('unsorted')}
        >
          Unsorted ({shelfCounts.unsorted || 0})
        </button>

        {shelves.map(s => (
          <button
            key={s.id}
            type="button"
            className={`${styles.mobilePill} ${
              activeShelfId === s.id ? styles.mobilePillActive : ''
            }`}
            onClick={() => handleSelect(s.id)}
          >
            {s.name} ({shelfCounts[s.id] || 0})
          </button>
        ))}

        <button
          type="button"
          className={styles.mobilePill}
          onClick={handleNewShelfClick}
        >
          + Shelf
        </button>
        <button type="button" className={styles.mobilePill} onClick={onOpenShelfManager}>
          Manage Shelves
        </button>
      </div>
    </>
  );
};

