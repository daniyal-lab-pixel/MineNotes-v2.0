import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './BookshelfView.module.css';
import {
  type NoteItem,
  type BookMetadata,
  type Bookshelf,
  type BookshelfSortOption,
  type BookCoverId
} from '../../storage/database';
import { notesRepository, preferencesRepository } from '../../storage/notesRepository';
import { bookMetadataRepository } from './bookMetadataRepository';
import { bookshelvesRepository } from './bookshelvesRepository';
import { BookshelfToolbar } from './BookshelfToolbar';
import { ShelfSelector, type ShelfFilterId } from './ShelfSelector';
import { BookshelfGrid } from './BookshelfGrid';
import { BookCoverPicker } from './BookCoverPicker';
import { BookActionsMenu } from './BookActionsMenu';
import { ShelfManager } from './ShelfManager';
import { ConfirmModal } from '../../components/ConfirmModal/ConfirmModal';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { playButtonClick, playPageTurnSound } from '../../utils/sound';

export interface BookshelfViewProps {
  onOpenNote: (noteId: string) => void;
  onNewNote: () => void;
  onBack: () => void;
  reducedMotion?: boolean;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  onOpenNote,
  onNewNote,
  onBack,
  reducedMotion = false
}) => {
  // Data state
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [metadataMap, setMetadataMap] = useState<Map<string, BookMetadata>>(new Map());
  const [shelves, setShelves] = useState<Bookshelf[]>([]);

  // UI state
  const [activeShelfId, setActiveShelfId] = useState<ShelfFilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<BookshelfSortOption>('recent_edit');
  const [viewMode, setViewMode] = useState<'shelf' | 'grid'>('shelf');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Dialog & Modal state
  const [activeCoverPickerNote, setActiveCoverPickerNote] = useState<NoteItem | null>(null);
  const [renameCandidate, setRenameCandidate] = useState<NoteItem | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<NoteItem | null>(null);
  const [showShelfManager, setShowShelfManager] = useState(false);
  const [showNewShelfDialog, setShowNewShelfDialog] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    note: NoteItem;
    anchorPos: { x: number; y: number } | null;
  } | null>(null);

  // Load preferences (saved sort option, view mode, shelf)
  useEffect(() => {
    preferencesRepository.getPreferences().then(prefs => {
      if (prefs.bookshelfSort) setSortOption(prefs.bookshelfSort);
      if (prefs.bookshelfViewMode) setViewMode(prefs.bookshelfViewMode);
      if (prefs.bookshelfActiveShelfId) setActiveShelfId(prefs.bookshelfActiveShelfId);
    });
  }, []);

  // Fetch all notes, metadata, and shelves
  const loadData = useCallback(async () => {
    try {
      const [allNotes, allMeta, allShelves] = await Promise.all([
        notesRepository.getAllNotes(),
        bookMetadataRepository.getAllMetadata(),
        bookshelvesRepository.getAllShelves()
      ]);
      setNotes(allNotes);
      setMetadataMap(allMeta);
      setShelves(allShelves);
    } catch (err) {
      console.error('[MineNotes] Error loading bookshelf data:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    let active = true;
    Promise.all([
      notesRepository.getAllNotes(),
      bookMetadataRepository.getAllMetadata(),
      bookshelvesRepository.getAllShelves()
    ])
      .then(([allNotes, allMeta, allShelves]) => {
        if (!active) return;
        setNotes(allNotes);
        setMetadataMap(allMeta);
        setShelves(allShelves);
      })
      .catch(err => {
        console.error('[MineNotes] Error loading bookshelf data:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Compute Shelf Map (id -> name)
  const shelfMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shelves) {
      map.set(s.id, s.name);
    }
    return map;
  }, [shelves]);

  // Compute Shelf Counts for badges
  const shelfCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: notes.length,
      favorites: 0,
      unsorted: 0
    };

    for (const shelf of shelves) {
      counts[shelf.id] = 0;
    }

    for (const note of notes) {
      const meta = metadataMap.get(note.id);
      if (meta?.isFavorite) {
        counts.favorites++;
      }
      if (!meta?.shelfId) {
        counts.unsorted++;
      } else if (counts[meta.shelfId] !== undefined) {
        counts[meta.shelfId]++;
      } else {
        counts.unsorted++;
      }
    }

    return counts;
  }, [notes, metadataMap, shelves]);

  // Filter & Sort Notes
  const displayNotes = useMemo(() => {
    let result = [...notes];

    // 1. Shelf filter
    if (activeShelfId === 'favorites') {
      result = result.filter(n => metadataMap.get(n.id)?.isFavorite);
    } else if (activeShelfId === 'unsorted') {
      result = result.filter(n => {
        const sid = metadataMap.get(n.id)?.shelfId;
        return !sid || !shelfMap.has(sid);
      });
    } else if (activeShelfId !== 'all') {
      result = result.filter(n => metadataMap.get(n.id)?.shelfId === activeShelfId);
    }

    // 2. Search filter (case-insensitive title and snippet)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          (n.plainText && n.plainText.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      const aMeta = metadataMap.get(a.id);
      const bMeta = metadataMap.get(b.id);

      switch (sortOption) {
        case 'recent_edit':
          return b.updatedAt - a.updatedAt;
        case 'oldest_edit':
          return a.updatedAt - b.updatedAt;
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'recent_created':
          return b.createdAt - a.createdAt;
        case 'favorites_first': {
          const aFav = aMeta?.isFavorite ? 1 : 0;
          const bFav = bMeta?.isFavorite ? 1 : 0;
          if (bFav !== aFav) return bFav - aFav;
          return b.updatedAt - a.updatedAt;
        }
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return result;
  }, [notes, metadataMap, activeShelfId, searchQuery, sortOption, shelfMap]);

  // Handle Sort Change & Persist
  const handleSortChange = async (newSort: BookshelfSortOption) => {
    setSortOption(newSort);
    await preferencesRepository.updatePreferences({ bookshelfSort: newSort });
  };

  // Handle View Mode Change & Persist
  const handleViewModeChange = async (newMode: 'shelf' | 'grid') => {
    setViewMode(newMode);
    await preferencesRepository.updatePreferences({ bookshelfViewMode: newMode });
  };

  // Handle Active Shelf Selection & Persist
  const handleSelectShelf = async (shelfId: ShelfFilterId) => {
    setActiveShelfId(shelfId);
    setSelectedNoteId(null);
    await preferencesRepository.updatePreferences({ bookshelfActiveShelfId: shelfId });
  };

  // Book Item Handlers
  const handleOpenBook = (noteId: string) => {
    playPageTurnSound();
    onOpenNote(noteId);
  };

  const handleSelectBook = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  const handleContextMenu = (e: React.MouseEvent, note: NoteItem) => {
    setContextMenu({
      note,
      anchorPos: { x: e.clientX, y: e.clientY }
    });
  };

  // Action: Toggle Favorite
  const handleToggleFavorite = async (noteId: string) => {
    await bookMetadataRepository.toggleFavorite(noteId);
    await loadData();
  };

  // Action: Move to Shelf
  const handleMoveToShelf = async (noteId: string, shelfId: string | null) => {
    await bookMetadataRepository.moveToShelf(noteId, shelfId);
    await loadData();
  };

  // Action: Duplicate Note
  const handleDuplicateNote = async (noteId: string) => {
    try {
      const duplicated = await notesRepository.duplicateNote(noteId);
      await loadData();
      setSelectedNoteId(duplicated.id);
    } catch (err) {
      console.error('[MineNotes] Error duplicating note:', err);
    }
  };

  // Action: Rename Note
  const handleStartRename = (note: NoteItem) => {
    setRenameCandidate(note);
    setRenameInput(note.title);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameCandidate || !renameInput.trim()) return;
    await notesRepository.updateNote(renameCandidate.id, { title: renameInput.trim() });
    setRenameCandidate(null);
    await loadData();
  };

  // Action: Delete Note
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    await notesRepository.deleteNote(deleteCandidate.id);
    setDeleteCandidate(null);
    if (selectedNoteId === deleteCandidate.id) {
      setSelectedNoteId(null);
    }
    await loadData();
  };

  // Action: Apply Cover
  const handleApplyCover = async (coverId: BookCoverId, titleColor: string) => {
    if (!activeCoverPickerNote) return;
    await bookMetadataRepository.setCover(activeCoverPickerNote.id, coverId, titleColor);
    setActiveCoverPickerNote(null);
    await loadData();
  };

  // Action: Create Shelf
  const handleCreateShelf = async (name: string) => {
    const created = await bookshelvesRepository.createShelf(name);
    await loadData();
    setActiveShelfId(created.id);
  };

  const handleCreateShelfFromQuickDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;
    await handleCreateShelf(newShelfName.trim());
    setNewShelfName('');
    setShowNewShelfDialog(false);
  };

  // Action: Rename Shelf
  const handleRenameShelf = async (id: string, name: string) => {
    await bookshelvesRepository.renameShelf(id, name);
    await loadData();
  };

  // Action: Delete Shelf
  const handleDeleteShelf = async (id: string) => {
    await bookshelvesRepository.deleteShelf(id);
    if (activeShelfId === id) {
      setActiveShelfId('all');
    }
    await loadData();
  };

  return (
    <div className={styles.bookshelfContainer}>
      <div className={styles.bookshelfWindow} role="main" aria-label="Bookshelf Library">
        {/* Header Bar */}
        <header className={styles.windowHeader}>
          <div className={styles.windowTitleGroup}>
            <h2 className={styles.windowTitle}>
              <PixelIcon name="book" size={24} />
              My Bookshelf
            </h2>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.newBookBtn}
              onClick={() => {
                playButtonClick();
                onNewNote();
              }}
            >
              <PixelIcon name="plus" size={15} color="#ffffff" />
              <span>+ New Book</span>
            </button>

            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                playButtonClick();
                onBack();
              }}
            >
              <span>Back</span>
            </button>
          </div>
        </header>

        {/* Toolbar: Search, Sort, View Modes */}
        <div className={styles.toolbarArea}>
          <BookshelfToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={handleSortChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {/* Window Body: Shelf Navigation + Wooden Shelf Canvas */}
        <div className={styles.windowBody}>
          <ShelfSelector
            shelves={shelves}
            activeShelfId={activeShelfId}
            shelfCounts={shelfCounts}
            onSelectShelf={handleSelectShelf}
            onOpenShelfManager={() => setShowShelfManager(true)}
            onNewShelf={() => setShowNewShelfDialog(true)}
          />

          <BookshelfGrid
            notes={displayNotes}
            metadataMap={metadataMap}
            shelfMap={shelfMap}
            selectedNoteId={selectedNoteId}
            viewMode={viewMode}
            searchQuery={searchQuery}
            reducedMotion={reducedMotion}
            onSelectNote={handleSelectBook}
            onOpenNote={handleOpenBook}
            onContextMenu={handleContextMenu}
            onNewNote={onNewNote}
            onClearSearch={() => setSearchQuery('')}
          />
        </div>
      </div>

      {/* Book Context Actions Menu */}
      {contextMenu && (
        <BookActionsMenu
          note={contextMenu.note}
          metadata={metadataMap.get(contextMenu.note.id)}
          shelves={shelves}
          anchorPos={contextMenu.anchorPos}
          onClose={() => setContextMenu(null)}
          onOpen={() => {
            const noteId = contextMenu.note.id;
            setContextMenu(null);
            handleOpenBook(noteId);
          }}
          onRename={() => {
            const note = contextMenu.note;
            setContextMenu(null);
            handleStartRename(note);
          }}
          onChangeCover={() => {
            const note = contextMenu.note;
            setContextMenu(null);
            setActiveCoverPickerNote(note);
          }}
          onToggleFavorite={() => {
            const noteId = contextMenu.note.id;
            setContextMenu(null);
            handleToggleFavorite(noteId);
          }}
          onMoveToShelf={shelfId => {
            const noteId = contextMenu.note.id;
            setContextMenu(null);
            handleMoveToShelf(noteId, shelfId);
          }}
          onDuplicate={() => {
            const noteId = contextMenu.note.id;
            setContextMenu(null);
            handleDuplicateNote(noteId);
          }}
          onDelete={() => {
            const note = contextMenu.note;
            setContextMenu(null);
            setDeleteCandidate(note);
          }}
        />
      )}

      {/* Book Cover Picker Modal */}
      {activeCoverPickerNote && (
        <BookCoverPicker
          currentCoverId={metadataMap.get(activeCoverPickerNote.id)?.coverId}
          currentTitleColor={metadataMap.get(activeCoverPickerNote.id)?.titleColor}
          bookTitle={activeCoverPickerNote.title}
          reducedMotion={reducedMotion}
          onApply={handleApplyCover}
          onCancel={() => setActiveCoverPickerNote(null)}
        />
      )}

      {/* Shelf Manager Modal */}
      {showShelfManager && (
        <ShelfManager
          shelves={shelves}
          shelfCounts={shelfCounts}
          onClose={() => setShowShelfManager(false)}
          onCreateShelf={handleCreateShelf}
          onRenameShelf={handleRenameShelf}
          onDeleteShelf={handleDeleteShelf}
        />
      )}

      {/* Quick Create Shelf Dialog */}
      {showNewShelfDialog && (
        <div className={styles.renameModal} onClick={() => setShowNewShelfDialog(false)}>
          <div className={styles.renameBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.renameTitle}>Create New Shelf</h3>
            <form onSubmit={handleCreateShelfFromQuickDialog}>
              <input
                type="text"
                className={styles.renameInput}
                placeholder="Shelf name (e.g. Science, School)..."
                value={newShelfName}
                autoFocus
                maxLength={30}
                onChange={e => setNewShelfName(e.target.value)}
              />
              <div className={styles.renameActions} style={{ marginTop: '12px' }}>
                <PixelButton
                  type="button"
                  size="medium"
                  onClick={() => setShowNewShelfDialog(false)}
                >
                  Cancel
                </PixelButton>
                <button
                  type="submit"
                  className={styles.newBookBtn}
                  disabled={!newShelfName.trim()}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Book Dialog */}
      {renameCandidate && (
        <div className={styles.renameModal} onClick={() => setRenameCandidate(null)}>
          <div className={styles.renameBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.renameTitle}>Rename Book</h3>
            <form onSubmit={handleSaveRename}>
              <input
                type="text"
                className={styles.renameInput}
                value={renameInput}
                autoFocus
                maxLength={60}
                onChange={e => setRenameInput(e.target.value)}
              />
              <div className={styles.renameActions} style={{ marginTop: '12px' }}>
                <PixelButton
                  type="button"
                  size="medium"
                  onClick={() => setRenameCandidate(null)}
                >
                  Cancel
                </PixelButton>
                <button
                  type="submit"
                  className={styles.newBookBtn}
                  disabled={!renameInput.trim()}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Book Confirmation */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Destroy Book?"
        message={`Are you sure you want to discard "${deleteCandidate?.title}"? This cannot be undone.`}
        confirmLabel="Destroy"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
};
