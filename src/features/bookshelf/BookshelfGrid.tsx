import React from 'react';
import styles from './BookshelfGrid.module.css';
import { type NoteItem, type BookMetadata } from '../../storage/database';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BookItem } from './BookItem';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface BookshelfGridProps {
  notes: NoteItem[];
  metadataMap: Map<string, BookMetadata>;
  shelfMap: Map<string, string>;
  selectedNoteId: string | null;
  viewMode?: 'shelf' | 'grid';
  searchQuery?: string;
  reducedMotion?: boolean;
  onSelectNote: (id: string) => void;
  onOpenNote: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, note: NoteItem) => void;
  onNewNote: () => void;
  onClearSearch: () => void;
}

export const BookshelfGrid: React.FC<BookshelfGridProps> = ({
  notes,
  metadataMap,
  shelfMap,
  selectedNoteId,
  viewMode = 'shelf',
  searchQuery = '',
  reducedMotion = false,
  onSelectNote,
  onOpenNote,
  onContextMenu,
  onNewNote,
  onClearSearch
}) => {
  const mobile = useMediaQuery('(max-width: 768px)');
  const threeColumns = useMediaQuery('(min-width: 390px)');
  // 1. Empty States
  if (notes.length === 0) {
    const isSearchEmpty = Boolean(searchQuery.trim());

    return (
      <div className={styles.bookshelfCanvas}>
        <div className={styles.emptyContainer}>
          {/* Cobwebs in corners */}
          {!isSearchEmpty && (
            <>
              <svg className={styles.cobwebTopLeft} width="40" height="40" viewBox="0 0 20 20" fill="none">
                <path d="M0 0H20V2H2V20H0V0Z" fill="#e8e8e8" />
                <path d="M0 6H14V8H2V14H0V6Z" fill="#cfcfcf" />
                <path d="M0 12H8V14H2V20H0V12Z" fill="#b0b0b0" />
                <path d="M4 4L18 18M18 4L4 18" stroke="#ffffff" strokeWidth="0.8" />
              </svg>

              <svg className={styles.cobwebTopRight} width="40" height="40" viewBox="0 0 20 20" fill="none">
                <path d="M0 0H20V2H2V20H0V0Z" fill="#e8e8e8" />
                <path d="M0 6H14V8H2V14H0V6Z" fill="#cfcfcf" />
                <path d="M0 12H8V14H2V20H0V12Z" fill="#b0b0b0" />
                <path d="M4 4L18 18M18 4L4 18" stroke="#ffffff" strokeWidth="0.8" />
              </svg>
            </>
          )}

          {/* Graphic */}
          <div className={styles.emptyBookGraphic}>
            <PixelIcon name="book" size={56} />
          </div>

          <h3 className={styles.emptyTitle}>
            {isSearchEmpty ? 'No matching books found.' : 'Your bookshelf is empty.'}
          </h3>

          <p className={styles.emptySubtitle}>
            {isSearchEmpty
              ? `No books found matching "${searchQuery}". Check spelling or clear your search.`
              : 'Create your first book to get started!'}
          </p>

          {isSearchEmpty ? (
            <button
              type="button"
              className={styles.createFirstBtn}
              onClick={() => {
                playButtonClick();
                onClearSearch();
              }}
            >
              Clear Search
            </button>
          ) : (
            <button
              type="button"
              className={styles.createFirstBtn}
              onClick={() => {
                playButtonClick();
                onNewNote();
              }}
            >
              <PixelIcon name="plus" size={16} color="#ffffff" />
              Create Your First Book
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Shelf View: Arrange into rows with wooden planks
  // We chunk notes into groups (e.g. 6 items per shelf row for wide screens, responsive wraps)
  const chunkSize = mobile ? (threeColumns ? 3 : 2) : 6;
  const rows: NoteItem[][] = [];
  for (let i = 0; i < notes.length; i += chunkSize) {
    rows.push(notes.slice(i, i + chunkSize));
  }

  return (
    <div className={styles.bookshelfCanvas} role="region" aria-label="Book collection">
      {viewMode === 'shelf' ? (
        rows.map((rowNotes, rowIndex) => (
          <div key={`shelf-row-${rowIndex}`} className={styles.shelfRowContainer}>
            <div className={styles.shelfBooksRow}>
              {rowNotes.map(note => {
                const meta = metadataMap.get(note.id);
                const shelfName = meta?.shelfId ? shelfMap.get(meta.shelfId) : undefined;
                return (
                  <BookItem
                    key={note.id}
                    note={note}
                    metadata={meta}
                    shelfName={shelfName}
                    isSelected={selectedNoteId === note.id}
                    reducedMotion={reducedMotion}
                    onSelect={onSelectNote}
                    onOpen={onOpenNote}
                    onContextMenu={onContextMenu}
                  />
                );
              })}
            </div>
            {/* Wooden Shelf Plank Underneath the Row */}
            <div className={styles.woodenPlank} aria-hidden="true" />
          </div>
        ))
      ) : (
        /* Inventory Slot View Mode */
        <div className={styles.inventorySlotGrid}>
          {notes.map(note => {
            const meta = metadataMap.get(note.id);
            const shelfName = meta?.shelfId ? shelfMap.get(meta.shelfId) : undefined;
            return (
              <BookItem
                key={note.id}
                note={note}
                metadata={meta}
                shelfName={shelfName}
                isSelected={selectedNoteId === note.id}
                reducedMotion={reducedMotion}
                onSelect={onSelectNote}
                onOpen={onOpenNote}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
