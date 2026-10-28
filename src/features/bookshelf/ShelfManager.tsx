import React, { useState, useRef, useEffect } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import styles from './ShelfManager.module.css';
import { type Bookshelf } from '../../storage/database';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { ConfirmModal } from '../../components/ConfirmModal/ConfirmModal';
import { playButtonClick } from '../../utils/sound';

export interface ShelfManagerProps {
  shelves: Bookshelf[];
  shelfCounts: Record<string, number>;
  onClose: () => void;
  onCreateShelf: (name: string) => Promise<void>;
  onRenameShelf: (id: string, name: string) => Promise<void>;
  onDeleteShelf: (id: string) => Promise<void>;
}

export const ShelfManager: React.FC<ShelfManagerProps> = ({
  shelves,
  shelfCounts,
  onClose,
  onCreateShelf,
  onRenameShelf,
  onDeleteShelf
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'rename'>('list');
  const [targetShelf, setTargetShelf] = useState<Bookshelf | null>(null);
  const [shelfNameInput, setShelfNameInput] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<Bookshelf | null>(null);

  useDialogFocus(dialogRef, !deleteCandidate);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleStartCreate = () => {
    playButtonClick();
    setShelfNameInput('');
    setMode('create');
  };

  const handleStartRename = (shelf: Bookshelf) => {
    playButtonClick();
    setTargetShelf(shelf);
    setShelfNameInput(shelf.name);
    setMode('rename');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = shelfNameInput.trim();
    if (!trimmed) return;

    if (mode === 'create') {
      await onCreateShelf(trimmed);
      setMode('list');
    } else if (mode === 'rename' && targetShelf) {
      await onRenameShelf(targetShelf.id, trimmed);
      setTargetShelf(null);
      setMode('list');
    }
  };

  const handleDeletePrompt = (shelf: Bookshelf) => {
    playButtonClick();
    setDeleteCandidate(shelf);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    await onDeleteShelf(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div
          ref={dialogRef} aria-modal="true" className={styles.modalWindow}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label="Manage Shelves"
        >
          {/* Header */}
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              <PixelIcon name="book" size={18} />
              {mode === 'list'
                ? 'Manage Shelves'
                : mode === 'create'
                ? 'Create New Shelf'
                : 'Rename Shelf'}
            </h3>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={mode === 'list' ? onClose : () => setMode('list')}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Mode: List */}
          {mode === 'list' && (
            <>
              <div className={styles.shelfList}>
                {/* Built-in Shelves */}
                <div className={`${styles.shelfRow} ${styles.shelfRowFixed}`}>
                  <div className={styles.shelfInfo}>
                    <PixelIcon name="book" size={16} />
                    <span>All Books</span>
                    <span className={styles.shelfCount}>({shelfCounts.all || 0})</span>
                  </div>
                </div>

                <div className={`${styles.shelfRow} ${styles.shelfRowFixed}`}>
                  <div className={styles.shelfInfo}>
                    <span style={{ color: '#fed83d' }}>★</span>
                    <span>Favorites</span>
                    <span className={styles.shelfCount}>({shelfCounts.favorites || 0})</span>
                  </div>
                </div>

                <div className={`${styles.shelfRow} ${styles.shelfRowFixed}`}>
                  <div className={styles.shelfInfo}>
                    <PixelIcon name="settings" size={14} />
                    <span>Unsorted</span>
                    <span className={styles.shelfCount}>({shelfCounts.unsorted || 0})</span>
                  </div>
                </div>

                {/* Custom User Shelves */}
                {shelves.map(s => {
                  const count = shelfCounts[s.id] || 0;
                  return (
                    <div key={s.id} className={styles.shelfRow}>
                      <div className={styles.shelfInfo}>
                        <PixelIcon name="book" size={15} />
                        <span>{s.name}</span>
                        <span className={styles.shelfCount}>({count})</span>
                      </div>

                      <div className={styles.shelfActions}>
                        <button
                          type="button"
                          className={styles.actionIconBtn}
                          title="Rename Shelf"
                          onClick={() => handleStartRename(s)}
                          aria-label={`Rename ${s.name}`}
                        >
                          <PixelIcon name="quill" size={13} />
                        </button>

                        <button
                          type="button"
                          className={`${styles.actionIconBtn} ${styles.actionIconBtnDanger}`}
                          title="Delete Shelf"
                          onClick={() => handleDeletePrompt(s)}
                          aria-label={`Delete ${s.name}`}
                        >
                          <PixelIcon name="trash" size={13} color="#ff9999" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className={styles.createBtn}
                  onClick={handleStartCreate}
                >
                  <PixelIcon name="plus" size={14} color="#ffffff" />
                  Create New Shelf
                </button>
              </div>
            </>
          )}

          {/* Mode: Create / Rename */}
          {(mode === 'create' || mode === 'rename') && (
            <form onSubmit={handleSubmitForm} className={styles.formBody}>
              <input
                type="text"
                className={styles.inputField}
                placeholder="Enter shelf name (e.g. Science, School)..."
                value={shelfNameInput}
                autoFocus
                maxLength={30}
                onChange={e => setShelfNameInput(e.target.value)}
              />

              <div className={styles.footerActions}>
                <PixelButton
                  type="button"
                  size="medium"
                  onClick={() => setMode('list')}
                >
                  Cancel
                </PixelButton>

                <button
                  type="submit"
                  className={styles.createBtn}
                  style={{ width: 'auto', minWidth: '110px' }}
                  disabled={!shelfNameInput.trim()}
                >
                  <PixelIcon name="check" size={14} color="#ffffff" />
                  {mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete Shelf Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Delete Shelf?"
        message={`Are you sure you want to remove shelf "${deleteCandidate?.name}"? Any books on this shelf will be safely moved to Unsorted. No books will be deleted.`}
        confirmLabel="Delete Shelf"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </>
  );
};
