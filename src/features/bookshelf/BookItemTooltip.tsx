import React, { useLayoutEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './BookItemTooltip.module.css';
import { type NoteItem, type BookMetadata } from '../../storage/database';
import { BookCoverIcon } from './BookCoverIcon';
import { formatCoverDisplayName } from './bookCoverCatalog';

export interface BookItemTooltipProps {
  note: NoteItem;
  metadata?: BookMetadata;
  shelfName?: string;
  reducedMotion?: boolean;
  anchorEl: HTMLElement | null;
  isOpen: boolean;
}

export const BookItemTooltip: React.FC<BookItemTooltipProps> = ({
  note,
  metadata,
  shelfName,
  reducedMotion = false,
  anchorEl,
  isOpen
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const coverId = metadata?.coverId || 'leather';
  const isFavorite = Boolean(metadata?.isFavorite);

  const formattedDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate collision-aware flip & shift position
  const updatePosition = useCallback(() => {
    if (!anchorEl || typeof window === 'undefined') return;

    const rect = anchorEl.getBoundingClientRect();
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;

    // If anchor is scrolled completely outside the viewport, hide the tooltip
    if (rect.bottom < 0 || rect.top > vHeight || rect.right < 0 || rect.left > vWidth) {
      setCoords(null);
      return;
    }

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 210;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 100;

    const margin = 10;
    const gap = 8;

    // Vertical space check
    const spaceAbove = rect.top;
    const spaceBelow = vHeight - rect.bottom;

    let top = 0;

    // Flip logic: default to above, flip to below if tight on top
    if (spaceAbove >= tooltipHeight + gap + margin) {
      top = rect.top - tooltipHeight - gap;
    } else if (spaceBelow >= tooltipHeight + gap + margin) {
      top = rect.bottom + gap;
    } else {
      // Pick side with maximum space and clamp inside viewport
      if (spaceAbove >= spaceBelow) {
        top = Math.max(margin, rect.top - tooltipHeight - gap);
      } else {
        top = Math.min(vHeight - tooltipHeight - margin, rect.bottom + gap);
      }
    }

    // Horizontal shift & clamping:
    // Center horizontally relative to anchor
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Clamp inside viewport boundaries
    left = Math.max(margin, Math.min(left, vWidth - tooltipWidth - margin));

    setCoords({ top, left });
  }, [anchorEl]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorEl) {
      return;
    }

    // Measure on animation frame to get accurate DOM dimensions
    const animFrame = requestAnimationFrame(updatePosition);

    // Listen to resize and scroll (capture phase catches scrolling inside .bookshelfCanvas)
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true });
    };
  }, [isOpen, anchorEl, updatePosition]);

  if (!isOpen || !anchorEl || typeof document === 'undefined') {
    return null;
  }

  const tooltipElement = (
    <div
      ref={tooltipRef}
      className={styles.portalTooltip}
      style={{
        top: coords ? `${coords.top}px` : '-9999px',
        left: coords ? `${coords.left}px` : '-9999px',
        opacity: coords ? 1 : 0
      }}
      role="tooltip"
      aria-hidden={!coords}
    >
      <div className={styles.tooltipFrame}>
        <div className={styles.tooltipIcon}>
          <BookCoverIcon
            coverId={coverId}
            size={34}
            isFavorite={false}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className={styles.tooltipContent}>
          <div className={styles.tooltipTitle} title={note.title}>
            {note.title}
          </div>
          <div className={styles.tooltipCoverType}>{formatCoverDisplayName(coverId)}</div>

          <div className={styles.tooltipMeta}>
            <div>Shelf: {shelfName || 'Unsorted'}</div>
            <div>Last edited: {formattedDate}</div>
            <div>Pages: {note.pageCount || 1}</div>
          </div>

          {isFavorite && (
            <div className={styles.tooltipFavorite}>
              <span>★</span>
              <span>Favorite</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(tooltipElement, document.body);
};
