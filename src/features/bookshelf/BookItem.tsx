import React, { useState, useRef, useEffect } from 'react';
import styles from './BookItem.module.css';
import { type NoteItem, type BookMetadata } from '../../storage/database';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BookCoverIcon } from './BookCoverIcon';
import { BookItemTooltip } from './BookItemTooltip';
import { DEFAULT_TITLE_COLOR } from './bookCoverCatalog';
import { playButtonClick } from '../../utils/sound';

export interface BookItemProps {
  note: NoteItem;
  metadata?: BookMetadata;
  shelfName?: string;
  isSelected?: boolean;
  reducedMotion?: boolean;
  onSelect: (noteId: string) => void;
  onOpen: (noteId: string) => void;
  onContextMenu: (e: React.MouseEvent, note: NoteItem) => void;
}

export const BookItem: React.FC<BookItemProps> = ({
  note,
  metadata,
  shelfName,
  isSelected = false,
  reducedMotion = false,
  onSelect,
  onOpen,
  onContextMenu
}) => {
  const touch = useMediaQuery('(hover: none)');
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  const coverId = metadata?.coverId || 'leather';
  const titleColor = metadata?.titleColor || DEFAULT_TITLE_COLOR;
  const isFavorite = Boolean(metadata?.isFavorite);

  // Smooth hover entry debounce (70ms) to prevent jittery flashing when skimming
  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) {
      return; // Do not trigger hover tooltips on touch devices
    }
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 70);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  const handleFocus = (e: React.FocusEvent) => {
    if (e.target === containerEl || e.currentTarget === e.target) {
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle single-click (select) and double-click (open)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (touch) { playButtonClick(); onOpen(note.id); return; }
    if (clickTimeoutRef.current) {
      // Double click detected!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      onOpen(note.id);
    } else {
      playButtonClick();
      onSelect(note.id);
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
      }, 260);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onOpen(note.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      playButtonClick();
      onSelect(note.id);
    } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      onContextMenu(
        { clientX: rect.right, clientY: rect.bottom, preventDefault: () => {} } as any,
        note
      );
    }
  };

  const handleTriggerMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playButtonClick();
    onContextMenu(e, note);
  };

  // Tooltip is visible when hovered or focused, unless currently selected
  const showTooltip = !touch && (isHovered || isFocused) && !isSelected;

  return (
    <div
      ref={setContainerEl}
      className={`${styles.bookItemContainer} ${isSelected ? styles.bookItemSelected : ''}`}
      onClick={handleClick}
      onContextMenu={e => {
        e.preventDefault();
        onContextMenu(e, note);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Book: ${note.title}. ${touch ? 'Tap' : 'Double-click'} to open.`}
      aria-pressed={isSelected}
    >
      {/* Book Item Stand Slot */}
      <div className={styles.bookSlot}>
        <BookCoverIcon
          coverId={coverId}
          size={42}
          isFavorite={isFavorite}
          showFavoriteBadge={isFavorite}
          reducedMotion={reducedMotion}
        />

        {/* Action Menu Trigger Button */}
        <button
          type="button"
          className={styles.menuTriggerBtn}
          title="Book Options"
          onClick={handleTriggerMenu}
          aria-label="Book Options"
          tabIndex={0}
        >
          ⋮
        </button>
      </div>

      {/* Title Label Under Book */}
      <span className={styles.bookTitleTag} style={{ color: titleColor }} title={note.title}>
        {note.title}
      </span>

      {/* Floating Collision-Aware Tooltip (Portal) */}
      <BookItemTooltip
        note={note}
        metadata={metadata}
        shelfName={shelfName}
        reducedMotion={reducedMotion}
        anchorEl={containerEl}
        isOpen={showTooltip}
      />
    </div>
  );
};
