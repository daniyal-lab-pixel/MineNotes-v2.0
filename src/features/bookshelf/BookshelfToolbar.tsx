import React, { useState, useRef, useEffect } from 'react';
import styles from './BookshelfToolbar.module.css';
import { type BookshelfSortOption } from '../../storage/database';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface BookshelfToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: BookshelfSortOption;
  onSortChange: (option: BookshelfSortOption) => void;
  viewMode: 'shelf' | 'grid';
  onViewModeChange: (mode: 'shelf' | 'grid') => void;
}

export const BookshelfToolbar: React.FC<BookshelfToolbarProps> = ({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange
}) => {
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

  // Sync when parent changes searchQuery (e.g. clear search action)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setLocalQuery(searchQuery);
  }

  const handleInputChange = (val: string) => {
    setLocalQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 120);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setLocalQuery('');
    onSearchChange('');
  };

  return (
    <div className={styles.toolbar} role="search">
      {/* Search Bar */}
      <div className={styles.searchSlot}>
        <PixelIcon name="search" size={14} color="#888888" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search books..."
          value={localQuery}
          onChange={e => handleInputChange(e.target.value)}
          aria-label="Search books by title"
        />
        {localQuery && (
          <button
            type="button"
            className={styles.clearSearchBtn}
            onClick={handleClear}
            title="Clear search"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Right Controls: Sort & View Mode */}
      <div className={styles.rightControls}>
        {/* Sort Select */}
        <div className={styles.sortWrapper}>
          <select
            className={styles.sortSelect}
            value={sortOption}
            onChange={e => {
              playButtonClick();
              onSortChange(e.target.value as BookshelfSortOption);
            }}
            aria-label="Sort books by"
          >
            <option value="recent_edit">Sort: Recently Edited</option>
            <option value="oldest_edit">Sort: Oldest Edited</option>
            <option value="title_asc">Sort: Title A → Z</option>
            <option value="title_desc">Sort: Title Z → A</option>
            <option value="recent_created">Sort: Recently Created</option>
            <option value="favorites_first">Sort: Favorites First</option>
          </select>
        </div>

        {/* View Mode Toggles */}
        <div className={styles.viewToggles} role="group" aria-label="Bookshelf View Mode">
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${
              viewMode === 'shelf' ? styles.viewToggleBtnActive : ''
            }`}
            onClick={() => {
              playButtonClick();
              onViewModeChange('shelf');
            }}
            title="Shelf View"
            aria-label="Shelf View"
            aria-pressed={viewMode === 'shelf'}
          >
            {/* Shelf Lines Icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="3" width="12" height="2" />
              <rect x="2" y="8" width="12" height="2" />
              <rect x="2" y="13" width="12" height="2" />
            </svg>
          </button>

          <button
            type="button"
            className={`${styles.viewToggleBtn} ${
              viewMode === 'grid' ? styles.viewToggleBtnActive : ''
            }`}
            onClick={() => {
              playButtonClick();
              onViewModeChange('grid');
            }}
            title="Grid / Slot View"
            aria-label="Grid / Slot View"
            aria-pressed={viewMode === 'grid'}
          >
            {/* 4-Box Grid Icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="5" height="5" />
              <rect x="9" y="2" width="5" height="5" />
              <rect x="2" y="9" width="5" height="5" />
              <rect x="9" y="9" width="5" height="5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
