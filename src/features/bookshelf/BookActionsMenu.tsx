import React, { useState, useEffect, useRef } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import styles from './BookActionsMenu.module.css';
import { type NoteItem, type BookMetadata, type Bookshelf } from '../../storage/database';
import { BookCoverIcon } from './BookCoverIcon';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface BookActionsMenuProps {
  note: NoteItem;
  metadata?: BookMetadata;
  shelves: Bookshelf[];
  anchorPos?: { x: number; y: number } | null;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onChangeCover: () => void;
  onToggleFavorite: () => void;
  onMoveToShelf: (shelfId: string | null) => void;
  onDuplicate?: () => void;
  onDelete: () => void;
}

export const BookActionsMenu: React.FC<BookActionsMenuProps> = ({
  note,
  metadata,
  shelves,
  anchorPos,
  onClose,
  onOpen,
  onRename,
  onChangeCover,
  onToggleFavorite,
  onMoveToShelf,
  onDuplicate,
  onDelete
}) => {
  const [showShelfSubmenu, setShowShelfSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDialogFocus(menuRef, true);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Clamp menu inside viewport
  const getStyle = (): React.CSSProperties => {
    if (!anchorPos) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const padding = 16;
    const menuWidth = 240;
    const menuHeight = 280;

    let x = anchorPos.x;
    let y = anchorPos.y;

    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (x < padding) x = padding;

    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }
    if (y < padding) y = padding;

    return {
      top: `${y}px`,
      left: `${x}px`
    };
  };

  const handleAction = (cb: () => void) => {
    playButtonClick();
    cb();
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        className={styles.menuWindow}
        style={getStyle()}
        role="menu"
        aria-label={`Actions for ${note.title}`}
      >
        <div className={styles.menuHeader}>
          <BookCoverIcon coverId={metadata?.coverId} size={24} />
          <span className={styles.menuTitle} title={note.title}>
            {note.title}
          </span>
        </div>

        <div className={styles.menuList}>
          {/* 1. Open Book */}
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemOpen}`}
            onClick={() => handleAction(onOpen)}
            role="menuitem"
          >
            <PixelIcon name="turnRight" size={14} color="#ffffff" />
            <span>Open Book</span>
          </button>

          {/* 2. Rename */}
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => handleAction(onRename)}
            role="menuitem"
          >
            <PixelIcon name="quill" size={14} />
            <span>Rename</span>
          </button>

          {/* 3. Change Cover */}
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => handleAction(onChangeCover)}
            role="menuitem"
          >
            <PixelIcon name="book" size={14} />
            <span>Change Cover</span>
          </button>

          {/* 4. Move to Shelf */}
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => setShowShelfSubmenu(!showShelfSubmenu)}
            role="menuitem"
            aria-expanded={showShelfSubmenu}
          >
            <PixelIcon name="settings" size={14} />
            <span>Move to Shelf</span>
            <span className={styles.chevron}>{showShelfSubmenu ? '▲' : '▶'}</span>
          </button>

          {showShelfSubmenu && (
            <div className={styles.shelfSubmenu} role="menu">
              <button
                type="button"
                className={`${styles.shelfSubItem} ${
                  metadata?.shelfId === null ? styles.shelfSubItemActive : ''
                }`}
                onClick={() => handleAction(() => onMoveToShelf(null))}
              >
                <span>Unsorted</span>
                {metadata?.shelfId === null && <span>✓</span>}
              </button>

              {shelves.map(shelf => (
                <button
                  key={shelf.id}
                  type="button"
                  className={`${styles.shelfSubItem} ${
                    metadata?.shelfId === shelf.id ? styles.shelfSubItemActive : ''
                  }`}
                  onClick={() => handleAction(() => onMoveToShelf(shelf.id))}
                >
                  <span>{shelf.name}</span>
                  {metadata?.shelfId === shelf.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* 5. Favorites Toggle */}
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => handleAction(onToggleFavorite)}
            role="menuitem"
          >
            <span style={{ color: '#fed83d', fontSize: '14px' }}>★</span>
            <span>{metadata?.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
          </button>

          {/* 6. Duplicate */}
          {onDuplicate && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => handleAction(onDuplicate)}
              role="menuitem"
            >
              <PixelIcon name="plus" size={14} />
              <span>Duplicate</span>
            </button>
          )}

          {/* 7. Delete */}
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={() => handleAction(onDelete)}
            role="menuitem"
          >
            <PixelIcon name="trash" size={14} color="#ff9999" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </>
  );
};
