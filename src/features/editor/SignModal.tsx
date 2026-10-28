import React, { useState, useEffect, useRef } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import styles from './SignModal.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';

export interface SignModalProps {
  isOpen: boolean;
  initialTitle: string;
  authorName: string;
  onSign: (signedTitle: string) => void;
  onCancel: () => void;
}

export const SignModal: React.FC<SignModalProps> = ({
  isOpen,
  initialTitle,
  authorName,
  onSign,
  onCancel
}) => {
  const [title, setTitle] = useState(initialTitle);

  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, isOpen);
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (isOpen !== previousOpen) {
    setPreviousOpen(isOpen);
    if (isOpen) setTitle(initialTitle);
  }
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Sign Book" className={styles.signBox} onClick={e => e.stopPropagation()}>
        <PixelIcon name="quill" size={32} />
        <h3 className={styles.signTitle}>Sign Book</h3>

        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#645543', marginBottom: '4px', textAlign: 'left' }}>
            Enter Book Title:
          </label>
          <input
            type="text"
            className={styles.signInput}
            aria-label="Book title"
            value={title}
            placeholder="Title..."
            autoFocus
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.signAuthor}>
          By {authorName || 'Daniyal'}
        </div>

        <p className={styles.signNotice}>
          Note: Signing marks this book as finalized in your library.
        </p>

        <div className={styles.buttonRow}>
          <PixelButton size="small" onClick={onCancel}>
            Cancel
          </PixelButton>
          <PixelButton
            size="small"
            variant="wood"
            disabled={!title.trim()}
            onClick={() => onSign(title.trim())}
          >
            Sign and Close
          </PixelButton>
        </div>
      </div>
    </div>
  );
};
