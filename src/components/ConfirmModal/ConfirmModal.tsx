import React, { useRef, useEffect } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import styles from './ConfirmModal.module.css';
import { PixelButton } from '../PixelButton/PixelButton';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.buttonRow}>
          <PixelButton size="medium" onClick={onCancel}>
            {cancelLabel}
          </PixelButton>
          <PixelButton 
            size="medium" 
            variant={variant === 'danger' ? 'danger' : 'default'} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </PixelButton>
        </div>
      </div>
    </div>
  );
};
