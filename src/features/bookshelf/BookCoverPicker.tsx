import React, { useState, useRef, useEffect } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import styles from './BookCoverPicker.module.css';
import { type BookCoverId } from '../../storage/database';
import { BookCoverIcon } from './BookCoverIcon';
import { BOOK_COVERS, TITLE_COLORS, DEFAULT_BOOK_COVER, DEFAULT_TITLE_COLOR } from './bookCoverCatalog';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { playButtonClick } from '../../utils/sound';

export interface BookCoverPickerProps {
  currentCoverId?: BookCoverId | null;
  currentTitleColor?: string;
  bookTitle: string;
  reducedMotion?: boolean;
  onApply: (coverId: BookCoverId, titleColor: string) => void;
  onCancel: () => void;
}

export const BookCoverPicker: React.FC<BookCoverPickerProps> = ({
  currentCoverId,
  currentTitleColor,
  bookTitle,
  reducedMotion = false,
  onApply,
  onCancel
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedCover, setSelectedCover] = useState<BookCoverId>(
    currentCoverId || DEFAULT_BOOK_COVER
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    currentTitleColor || DEFAULT_TITLE_COLOR
  );

  const standardCovers = BOOK_COVERS.filter(c => c.category === 'standard');
  const dyedCovers = BOOK_COVERS.filter(c => c.category === 'dyed');

  useDialogFocus(dialogRef, true);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleSelectCover = (coverId: BookCoverId) => {
    playButtonClick();
    setSelectedCover(coverId);
  };

  const handleSelectColor = (hex: string) => {
    playButtonClick();
    setSelectedColor(hex);
  };

  const handleApply = () => {
    playButtonClick();
    onApply(selectedCover, selectedColor);
  };

  const handleCancel = () => {
    playButtonClick();
    onCancel();
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div
        ref={dialogRef} aria-modal="true" className={styles.modalWindow}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Choose Book Cover"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <PixelIcon name="book" size={20} />
            Choose Book Cover
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Standard Covers Section */}
        <div className={styles.sectionTitle}>Standard Covers</div>
        <div className={styles.coversGrid}>
          {standardCovers.map(cov => (
            <button
              key={cov.id}
              type="button"
              className={`${styles.coverSlot} ${
                selectedCover === cov.id ? styles.coverSlotActive : ''
              }`}
              onClick={() => handleSelectCover(cov.id)}
              title={cov.description}
            >
              <BookCoverIcon coverId={cov.id} size={36} reducedMotion={reducedMotion} />
              <span className={styles.coverSlotLabel}>{cov.name}</span>
            </button>
          ))}
        </div>

        {/* Dyed Covers Section */}
        <div className={styles.sectionTitle}>Dyed Covers</div>
        <div className={styles.coversGridDyed}>
          {dyedCovers.map(cov => (
            <button
              key={cov.id}
              type="button"
              className={`${styles.coverSlot} ${
                selectedCover === cov.id ? styles.coverSlotActive : ''
              }`}
              onClick={() => handleSelectCover(cov.id)}
              title={cov.description}
            >
              <BookCoverIcon coverId={cov.id} size={34} reducedMotion={reducedMotion} />
              <span className={styles.coverSlotLabel}>{cov.name}</span>
            </button>
          ))}
        </div>

        {/* Title Color Section */}
        <div className={styles.colorPaletteRow}>
          <span className={styles.colorPaletteLabel}>Title Color:</span>
          <div className={styles.colorSwatches}>
            {TITLE_COLORS.map(c => (
              <button
                key={c.hex}
                type="button"
                className={`${styles.colorSwatch} ${
                  selectedColor.toLowerCase() === c.hex.toLowerCase()
                    ? styles.colorSwatchActive
                    : ''
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => handleSelectColor(c.hex)}
                title={c.name}
                aria-label={`Select ${c.name} title color`}
              />
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <div className={styles.previewBar}>
          <BookCoverIcon coverId={selectedCover} size={38} reducedMotion={reducedMotion} />
          <span className={styles.previewTitle} style={{ color: selectedColor }}>
            {bookTitle || 'Untitled Book'}
          </span>
        </div>

        {/* Footer Actions */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className={styles.applyBtn} onClick={handleApply}>
            <PixelIcon name="check" size={14} color="#ffffff" />
            Apply Cover
          </button>
        </div>
      </div>
    </div>
  );
};
