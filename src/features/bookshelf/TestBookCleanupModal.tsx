import React, { useState, useMemo } from 'react';
import styles from './TestBookCleanupModal.module.css';
import { type NoteItem, type BookMetadata } from '../../storage/database';
import { BookCoverIcon } from './BookCoverIcon';
import { ConfirmModal } from '../../components/ConfirmModal/ConfirmModal';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { playButtonClick } from '../../utils/sound';

export interface TestBookCleanupModalProps {
  notes: NoteItem[];
  metadataMap: Map<string, BookMetadata>;
  onClose: () => void;
  onDeleteNotes: (ids: string[]) => Promise<void>;
}

export const TestBookCleanupModal: React.FC<TestBookCleanupModalProps> = ({
  notes,
  metadataMap,
  onClose,
  onDeleteNotes
}) => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'empty' | 'all'>('fixtures');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Group notes into confirmed test fixtures and empty/untitled notes
  const confirmedFixtures = useMemo(() => {
    return notes.filter(n => Boolean(n.isTestFixture || n.id.startsWith('test_fixture_')));
  }, [notes]);

  const emptyNotes = useMemo(() => {
    return notes.filter(
      n =>
        n.title === 'Untitled Note' &&
        (n.wordCount === 0 || !n.plainText || n.plainText.trim() === '')
    );
  }, [notes]);

  // Determine displayed notes according to active tab
  const displayedNotes = useMemo(() => {
    if (activeTab === 'fixtures') return confirmedFixtures;
    if (activeTab === 'empty') return emptyNotes;
    return notes;
  }, [activeTab, confirmedFixtures, emptyNotes, notes]);

  const toggleSelectNote = (id: string) => {
    playButtonClick();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllShown = () => {
    playButtonClick();
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const n of displayedNotes) {
        next.add(n.id);
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    playButtonClick();
    setSelectedIds(new Set());
  };

  const handleExecuteDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteNotes(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowConfirm(false);
      onClose();
    } catch (err) {
      console.error('[MineNotes] Error batch deleting notes:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div
          className={styles.modalWindow}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label="Review and Clean Notes"
        >
          {/* Header */}
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              <PixelIcon name="trash" size={18} color="#b02e26" />
              Review & Clean Library Notes
            </h3>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Safety Information Banner */}
          <div className={styles.infoBanner}>
            Review development and empty notes before removing them. Notes containing your real writing
            are never removed automatically. Only individually checked notes will be deleted after confirmation.
          </div>

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${
                activeTab === 'fixtures' ? styles.filterTabBtnActive : ''
              }`}
              onClick={() => {
                playButtonClick();
                setActiveTab('fixtures');
              }}
            >
              Confirmed Fixtures ({confirmedFixtures.length})
            </button>

            <button
              type="button"
              className={`${styles.filterTabBtn} ${
                activeTab === 'empty' ? styles.filterTabBtnActive : ''
              }`}
              onClick={() => {
                playButtonClick();
                setActiveTab('empty');
              }}
            >
              Empty Untitled ({emptyNotes.length})
            </button>

            <button
              type="button"
              className={`${styles.filterTabBtn} ${
                activeTab === 'all' ? styles.filterTabBtnActive : ''
              }`}
              onClick={() => {
                playButtonClick();
                setActiveTab('all');
              }}
            >
              All Notes ({notes.length})
            </button>
          </div>

          {/* Selection Bar */}
          <div className={styles.selectionBar}>
            <span>Showing {displayedNotes.length} notes</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={styles.toggleSelectBtn}
                onClick={handleSelectAllShown}
              >
                Select All Shown
              </button>
              <button
                type="button"
                className={styles.toggleSelectBtn}
                onClick={handleDeselectAll}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Scrollable Note List */}
          <div className={styles.noteList}>
            {displayedNotes.length === 0 ? (
              <div className={styles.emptyList}>
                {activeTab === 'fixtures'
                  ? 'No confirmed test fixtures found. Your library is clean!'
                  : activeTab === 'empty'
                  ? 'No empty untitled notes found.'
                  : 'No notes in library.'}
              </div>
            ) : (
              displayedNotes.map(n => {
                const isSelected = selectedIds.has(n.id);
                const meta = metadataMap.get(n.id);
                const isFixture = Boolean(n.isTestFixture || n.id.startsWith('test_fixture_'));
                const isEmpty = n.wordCount === 0 || !n.plainText?.trim();
                const formattedDate = new Date(n.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <div
                    key={n.id}
                    className={`${styles.noteRow} ${isSelected ? styles.noteRowSelected : ''}`}
                    onClick={() => toggleSelectNote(n.id)}
                  >
                    <div className={styles.pixelCheckbox}>
                      {isSelected ? '✓' : ''}
                    </div>

                    <BookCoverIcon coverId={meta?.coverId} size={28} />

                    <div className={styles.noteRowDetails}>
                      <div className={styles.noteRowHeader}>
                        <span className={styles.noteRowTitle} title={n.title}>
                          {n.title}
                        </span>
                        {isFixture && <span className={styles.badgeFixture}>Test Fixture</span>}
                        {isEmpty && <span className={styles.badgeEmpty}>Empty</span>}
                      </div>

                      <div className={styles.noteRowMeta}>
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>{n.wordCount || 0} words</span>
                        <span>•</span>
                        <span>{n.pageCount || 1} page(s)</span>
                      </div>

                      <div className={styles.noteRowSnippet}>
                        {n.plainText ? n.plainText.slice(0, 70) : '(No text written)'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className={styles.modalFooter}>
            <div className={styles.selectedSummary}>
              Selected: <strong>{selectedIds.size}</strong> book(s)
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <PixelButton size="small" onClick={onClose}>
                Cancel
              </PixelButton>

              <button
                type="button"
                className={styles.deleteBatchBtn}
                disabled={selectedIds.size === 0 || isDeleting}
                onClick={() => {
                  playButtonClick();
                  setShowConfirm(true);
                }}
              >
                <PixelIcon name="trash" size={13} color="#ffffff" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Confirmation Dialog */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Permanently Delete Selected Notes?"
        message={`Are you sure you want to delete ${selectedIds.size} selected note(s)? All other books and their contents will be safely preserved. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Note${selectedIds.size > 1 ? 's' : ''}`}
        variant="danger"
        onConfirm={handleExecuteDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
