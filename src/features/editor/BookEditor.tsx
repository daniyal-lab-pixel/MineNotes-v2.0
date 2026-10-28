import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import styles from './BookEditor.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { EnvironmentBackground } from '../../components/EnvironmentBackground/EnvironmentBackground';
import { EnvironmentSelector } from './EnvironmentSelector/EnvironmentSelector';
import { SignModal } from './SignModal';
import { FormattingDrawer } from './FormattingDrawer';
import { jukeboxController, type JukeboxDisplayMode } from '../jukebox/jukeboxController';
import { getEditorExtensions } from './extensions/editorConfig';
import {
  parseBookPages,
  serializeBookPages,
  extractPlainTextFromPages,
  countWordsFromPages,
  paginateContent,
  getSpreadInfo,
  DEFAULT_PAGE_HEIGHT
} from './pagination/paginationEngine';
import { useMediaQuery, COMPACT_EDITOR_QUERY } from '../../hooks/useMediaQuery';
import { notesRepository, preferencesRepository } from '../../storage/notesRepository';
import { type NoteItem, type UserPreferences, type EnvironmentPreset } from '../../storage/database';
import {
  playButtonClick,
  playPageTurnSound,
  playTypingSound,
  playBookOpenSound,
  playBookCloseSound,
  startAmbienceAudio,
  stopAmbienceAudio
} from '../../utils/sound';

export interface BookEditorProps {
  noteId: string;
  preferences: UserPreferences;
  onDone: () => void;
  onPreferencesUpdated?: (prefs: UserPreferences) => void;
}

const JukeboxToolbarSlot: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<JukeboxDisplayMode>(() => jukeboxController.getState().displayMode);

  useEffect(() => {
    return jukeboxController.subscribe(s => {
      setDisplayMode(prev => (prev === s.displayMode ? prev : s.displayMode));
    });
  }, []);

  return (
    <button
      type="button"
      className={`${styles.slotButton} ${displayMode !== 'closed' ? styles.slotButtonActive : ''}`}
      onClick={() => {
        playButtonClick();
        if (displayMode === 'expanded') {
          jukeboxController.minimize();
        } else {
          jukeboxController.openExpanded();
        }
      }}
      title="Minecraft Music Discs Jukebox"
      aria-label="Toggle Music Discs Jukebox"
    >
      <PixelIcon name="disc" size={16} dyeColor="#fed83d" />
    </button>
  );
};

export const BookEditor: React.FC<BookEditorProps> = ({
  noteId,
  preferences,
  onDone,
  onPreferencesUpdated
}) => {
  const [, setNote] = useState<NoteItem | null>(null);
  const [title, setTitle] = useState('Untitled Note');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [pages, setPages] = useState<string[]>(['<p></p>']);
  const [pageIndex, setPageIndex] = useState(0); // 0-indexed logical page
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [pdfExportStatus, setPdfExportStatus] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showFormattingDrawer, setShowFormattingDrawer] = useState(false);
  const compactViewport = useMediaQuery(COMPACT_EDITOR_QUERY);
  const [prefersSpread, setIsReadingMode] = useState(false);
  const isReadingMode = prefersSpread && !compactViewport;
  const [showActions, setShowActions] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeEditorTarget, setActiveEditorTarget] = useState<'left' | 'right'>('left');
  const [currentFont, setCurrentFont] = useState<string>(preferences.defaultFont || 'pixel');
  const [envPreset, setEnvPreset] = useState<EnvironmentPreset>(preferences.environmentPreset || 'clear');
  const [animatedBg, setAnimatedBg] = useState<boolean>(preferences.animatedBackground !== false);
  const [reducedMotion] = useState<boolean>(preferences.reducedMotion || false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagesRef = useRef(pages);
  const titleRef = useRef(title);
  const pageIndexRef = useRef(pageIndex);
  const isReadingModeRef = useRef(isReadingMode);
  const isPaginatingRef = useRef(false);
  const leftEditorRef = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);

  // Keep refs up-to-date
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);

  useEffect(() => {
    isReadingModeRef.current = isReadingMode;
  }, [isReadingMode]);



  useEffect(() => {
    playBookOpenSound();
  }, []);

  const hasCustomTitleRef = useRef(false);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const wasReadingModeRef = useRef(isReadingMode);

  // Derive suggested title from first meaningful line of text
  const deriveSuggestedTitle = (text: string): string | null => {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const cleaned = lines[0].replace(/[#*_~`>[\]()]/g, '').trim();
    if (!cleaned || cleaned.length < 2) return null;
    return cleaned.length > 30 ? cleaned.slice(0, 28) + '...' : cleaned;
  };

  // Load Note from IndexedDB
  useEffect(() => {
    let isMounted = true;
    notesRepository.getNoteById(noteId).then(loaded => {
      if (!isMounted || !loaded) return;
      setNote(loaded);
      const initialTitle = loaded.title || 'Untitled Note';
      titleRef.current = initialTitle;
      setTitle(initialTitle);
      if (initialTitle !== 'Untitled Note') {
        hasCustomTitleRef.current = true;
      }
      const parsed = parseBookPages(loaded.content);
      pagesRef.current = parsed.length > 0 ? parsed : ['<p></p>'];
      setPages(pagesRef.current);
      loadedRef.current = true;
      setIsLoaded(true);
      setPageIndex(0);
    });
    return () => {
      isMounted = false;
    };
  }, [noteId]);

  // Autosave execution
  const executeSave = useCallback(async (pagesToSave: string[], currentTitle: string) => {
    if (!loadedRef.current) return false;
    setSaveStatus('saving');
    try {
      const plainText = extractPlainTextFromPages(pagesToSave);
      const wordCount = countWordsFromPages(pagesToSave);
      const serialized = serializeBookPages(pagesToSave);

      let finalTitle = currentTitle.trim() || 'Untitled Note';
      // Suggest title from first line if user hasn't explicitly set one and it's still "Untitled Note"
      if (!hasCustomTitleRef.current && finalTitle === 'Untitled Note') {
        const suggested = deriveSuggestedTitle(plainText);
        if (suggested) {
          finalTitle = suggested;
          titleRef.current = suggested;
          setTitle(suggested);
        }
      }

      const write = saveQueueRef.current.then(() => notesRepository.updateNote(noteId, {
        title: finalTitle,
        content: serialized,
        plainText,
        wordCount,
        pageCount: parseBookPages(serialized).length
      }));
      saveQueueRef.current = write.catch(() => {});
      await write;
      const unchanged = pagesRef.current === pagesToSave && titleRef.current === finalTitle;
      dirtyRef.current = !unchanged;
      if (!unchanged) { setSaveStatus('saving'); return true; }
      setSaveStatus('saved');
      return true;
    } catch (err) {
      console.error('Failed to autosave note:', err);
      setSaveStatus('failed');
      return false;
    }
  }, [noteId]);

  const triggerAutoSave = useCallback((pagesToSave: string[], currentTitle: string) => {
    dirtyRef.current = true;
    setSaveStatus('saving');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      executeSave(pagesToSave, currentTitle);
    }, 500);
  }, [executeSave]);

  const commitPages = useCallback((updated: string[]) => {
    pagesRef.current = updated;
    setPages(updated);
    triggerAutoSave(updated, titleRef.current);
  }, [triggerAutoSave]);

  const handlePageContentChange = useCallback((targetIndex: number, newHtml: string) => {
    const updated = [...pagesRef.current];
    while (updated.length <= targetIndex) updated.push('<p></p>');
    updated[targetIndex] = newHtml;
    commitPages(updated);
  }, [commitPages]);

  // Layout switches read the same logical pages; they never repaginate the book.
  const totalPages = Math.max(1, pages.length);
  const spreadInfo = getSpreadInfo(pageIndex, totalPages);
  const activeLeftIndex = isReadingMode ? spreadInfo.leftPageIndex : pageIndex;
  const activeRightIndex = spreadInfo.rightPageIndex;

  const handleEditorContentUpdate = useCallback(
    (targetIndex: number, html: string, dom: HTMLElement, isLeft: boolean) => {
      if (!loadedRef.current || isPaginatingRef.current) return;
      // Measure canonical 296 x 330 pages, independently of the phone's readable
      // 16px writing surface. Resizing or opening a keyboard cannot change pages.
      const canonicalPages = paginateContent(html, DEFAULT_PAGE_HEIGHT);
      if (canonicalPages.length <= 1) {
        handlePageContentChange(targetIndex, html);
        return;
      }
      const copy = [...pagesRef.current];
      copy[targetIndex] = canonicalPages[0];
      const following = canonicalPages.slice(1).join('') + copy.slice(targetIndex + 1).join('');
      copy.splice(targetIndex + 1, copy.length, ...paginateContent(following, DEFAULT_PAGE_HEIGHT));
      isPaginatingRef.current = true;
      const sourceEditor = isLeft ? leftEditorRef.current : rightEditorRef.current;
      sourceEditor?.commands.setContent(copy[targetIndex], { emitUpdate: false });
      isPaginatingRef.current = false;
      commitPages(copy);
      const nextIndex = targetIndex + 1;
      const focusRight = isReadingModeRef.current && isLeft;
      if (!focusRight) { pageIndexRef.current = nextIndex; setPageIndex(nextIndex); }
      setActiveEditorTarget(focusRight ? 'right' : 'left');
      playPageTurnSound();
      requestAnimationFrame(() => {
        (focusRight ? rightEditorRef.current : leftEditorRef.current)?.commands.focus('start');
      });
      void dom; // canonical measurement intentionally does not use responsive DOM geometry
    }, [handlePageContentChange, commitPages]
  );

  useEffect(() => {
    if (wasReadingModeRef.current && !isReadingMode) {
      const spread = getSpreadInfo(pageIndexRef.current, pagesRef.current.length);
      const index = activeEditorTarget === 'right' && spread.hasRightPage ? spread.rightPageIndex : spread.leftPageIndex;
      pageIndexRef.current = index;
      setPageIndex(index);
    }
    wasReadingModeRef.current = isReadingMode;
  }, [isReadingMode, activeEditorTarget]);

  // Left Page Editor
  const leftPageContent = pages[activeLeftIndex] ?? '<p></p>';
  const leftEditor = useEditor({
    immediatelyRender: false,
    extensions: getEditorExtensions(),
    editable: isLoaded,
    content: leftPageContent,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Book page text', 'aria-multiline': 'true', spellcheck: 'true' },
      handleDOMEvents: {
        compositionend: () => {
          requestAnimationFrame(() => {
            const editor = leftEditorRef.current;
            if (editor) handleEditorContentUpdate(
              isReadingModeRef.current ? getSpreadInfo(pageIndexRef.current, pagesRef.current.length).leftPageIndex : pageIndexRef.current,
              editor.getHTML(), editor.view.dom, true
            );
          });
          return false;
        }
      },
      handleTextInput: (view) => {
        if (view.composing) return false;
        playTypingSound();
        return false;
      },
      handleKeyDown: (view, event) => {
        if (!event.isComposing) {
          if (event.key === 'Backspace' || event.key === 'Delete') {
            const { selection } = view.state;
            if (
              !selection.empty ||
              (event.key === 'Backspace' && selection.$from.pos > 1) ||
              (event.key === 'Delete' && selection.$from.pos < view.state.doc.content.size)
            ) {
              playTypingSound(0.85);
            }
          } else if (event.key === 'Enter') {
            playTypingSound(1.05);
          }
        }

        if (event.key === 'Backspace') {
          const { selection } = view.state;
          if (selection.empty && selection.$from.pos <= 1) {
            if (!isReadingModeRef.current) {
              if (pageIndexRef.current > 0) {
                event.preventDefault();
                playPageTurnSound();
                const prevIdx = pageIndexRef.current - 1;
                setPageIndex(prevIdx);
                setTimeout(() => {
                  leftEditor?.commands.focus('end');
                }, 40);
                return true;
              }
            } else {
              const currentSpread = getSpreadInfo(pageIndexRef.current, pagesRef.current.length);
              if (currentSpread.spreadIndex > 0) {
                event.preventDefault();
                playPageTurnSound();
                const prevSpreadLeft = (currentSpread.spreadIndex - 1) * 2;
                setPageIndex(prevSpreadLeft);
                setTimeout(() => {
                  rightEditor?.commands.focus('end');
                }, 40);
                return true;
              }
            }
          }
        }
        return false;
      }
    },
    onFocus: () => setActiveEditorTarget('left'),
    onUpdate: ({ editor }) => {
      if (editor.view.composing) return;
      setActiveEditorTarget('left');
      handleEditorContentUpdate(activeLeftIndex, editor.getHTML(), editor.view.dom as HTMLElement, true);
    }
  });

  // Right Page Editor for Double-Page Mode
  const rightPageContent = spreadInfo.hasRightPage ? (pages[activeRightIndex] ?? '<p></p>') : '';
  const rightEditor = useEditor({
    immediatelyRender: false,
    extensions: getEditorExtensions(),
    editable: isLoaded,
    content: rightPageContent,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Facing book page text', 'aria-multiline': 'true', spellcheck: 'true' },
      handleDOMEvents: {
        compositionend: () => {
          requestAnimationFrame(() => {
            const editor = rightEditorRef.current;
            if (editor && isReadingModeRef.current) handleEditorContentUpdate(
              getSpreadInfo(pageIndexRef.current, pagesRef.current.length).rightPageIndex,
              editor.getHTML(), editor.view.dom, false
            );
          });
          return false;
        }
      },
      handleTextInput: (view) => {
        if (view.composing) return false;
        playTypingSound();
        return false;
      },
      handleKeyDown: (view, event) => {
        if (!event.isComposing) {
          if (event.key === 'Backspace' || event.key === 'Delete') {
            const { selection } = view.state;
            if (
              !selection.empty ||
              (event.key === 'Backspace' && selection.$from.pos > 1) ||
              (event.key === 'Delete' && selection.$from.pos < view.state.doc.content.size)
            ) {
              playTypingSound(0.85);
            }
          } else if (event.key === 'Enter') {
            playTypingSound(1.05);
          }
        }

        if (event.key === 'Backspace') {
          const { selection } = view.state;
          if (selection.empty && selection.$from.pos <= 1) {
            // Backspace at top of right page moves cursor to end of left page
            event.preventDefault();
            leftEditor?.commands.focus('end');
            return true;
          }
        }
        return false;
      }
    },
    onFocus: () => setActiveEditorTarget('right'),
    onUpdate: ({ editor }) => {
      if (editor.view.composing || !isReadingModeRef.current) return;
      setActiveEditorTarget('right');
      handleEditorContentUpdate(activeRightIndex, editor.getHTML(), editor.view.dom as HTMLElement, false);
    }
  });

  useEffect(() => {
    leftEditorRef.current = leftEditor;
  }, [leftEditor]);

  useEffect(() => {
    rightEditorRef.current = rightEditor;
  }, [rightEditor]);

  useEffect(() => {
    if (leftEditor && !leftEditor.isDestroyed) leftEditor.setEditable(isLoaded, false);
    if (rightEditor && !rightEditor.isDestroyed) rightEditor.setEditable(isLoaded && isReadingMode, false);
  }, [leftEditor, rightEditor, isLoaded, isReadingMode]);

  // Flush pending writes when Safari backgrounds this tab/PWA.
  useEffect(() => {
    const flush = () => {
      if (!loadedRef.current || !dirtyRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void executeSave(pagesRef.current, titleRef.current);
    };
    const onVisibility = () => { if (document.hidden) flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flush();
    };
  }, [executeSave]);

  // Synchronize editor contents when pageIndex, spread, or pages change
  useEffect(() => {
    if (leftEditor && !leftEditor.isDestroyed) {
      const targetContent = pages[activeLeftIndex] ?? '<p></p>';
      if (leftEditor.getHTML() !== targetContent && !isPaginatingRef.current) {
        leftEditor.commands.setContent(targetContent, { emitUpdate: false });
      }
    }
    if (rightEditor && !rightEditor.isDestroyed && isReadingMode) {
      const targetContent = spreadInfo.hasRightPage ? (pages[activeRightIndex] ?? '<p></p>') : '';
      if (rightEditor.getHTML() !== targetContent && !isPaginatingRef.current) {
        rightEditor.commands.setContent(targetContent, { emitUpdate: false });
      }
    }
  }, [activeLeftIndex, activeRightIndex, pages, leftEditor, rightEditor, isReadingMode, spreadInfo.hasRightPage]);

  // Global Keyboard Shortcut: Alt + Q to toggle Quill & Ink formatting panel
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'q' || e.key === 'Q' || e.code === 'KeyQ')) {
        if (!e.isComposing) {
          e.preventDefault();
          e.stopPropagation();
          playButtonClick();
          setShowFormattingDrawer(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, []);

  // Recalculate and reflow all pages on alignment or font change
  const handleReflowAllPages = useCallback(() => {
    setPages(prevPages => {
      const fullHtml = prevPages.join('');
      const reflowed = paginateContent(fullHtml, DEFAULT_PAGE_HEIGHT);
      triggerAutoSave(reflowed, titleRef.current);
      return reflowed;
    });
  }, [triggerAutoSave]);

  // Page Turn Actions
  const handleTurnPrevious = () => {
    playPageTurnSound();
    if (!isReadingMode) {
      if (pageIndex === 0) return;
      setPageIndex(prev => Math.max(0, prev - 1));
    } else {
      if (spreadInfo.spreadIndex === 0) return;
      const prevSpreadLeft = (spreadInfo.spreadIndex - 1) * 2;
      setPageIndex(prevSpreadLeft);
    }
  };

  const handleTurnNext = () => {
    playPageTurnSound();
    if (!isReadingMode) {
      const nextIndex = pageIndex + 1;
      if (nextIndex >= pages.length) {
        setPages(prev => {
          const copy = [...prev, '<p></p>'];
          triggerAutoSave(copy, titleRef.current);
          return copy;
        });
      }
      setPageIndex(nextIndex);
    } else {
      if (spreadInfo.hasRightPage) {
        // Current spread has both pages filled. Turn to next spread.
        const nextSpreadLeft = (spreadInfo.spreadIndex + 1) * 2;
        if (nextSpreadLeft >= pages.length) {
          setPages(prev => {
            const copy = [...prev, '<p></p>'];
            triggerAutoSave(copy, titleRef.current);
            return copy;
          });
        }
        setPageIndex(nextSpreadLeft);
      } else {
        // Current spread has Left, but blank facing page on Right.
        // Clicking next crafts the facing right page on the current spread!
        const targetRightIdx = spreadInfo.rightPageIndex;
        setPages(prev => {
          const copy = [...prev];
          while (copy.length <= targetRightIdx) {
            copy.push('<p></p>');
          }
          triggerAutoSave(copy, titleRef.current);
          return copy;
        });
        setTimeout(() => {
          rightEditor?.commands.focus('start');
        }, 50);
      }
    }
  };

  // Title modification
  const handleTitleSubmit = (newVal: string) => {
    setIsEditingTitle(false);
    const trimmed = newVal.trim() || 'Untitled Note';
    hasCustomTitleRef.current = true;
    titleRef.current = trimmed;
    setTitle(trimmed);
    triggerAutoSave(pagesRef.current, trimmed);
  };

  // Sign & Close Action
  const handleSign = async (signedTitle: string) => {
    playButtonClick();
    hasCustomTitleRef.current = true;
    titleRef.current = signedTitle;
    setTitle(signedTitle);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!await executeSave(pagesRef.current, signedTitle)) return;
    try {
      await notesRepository.updateNote(noteId, {
        isSigned: true, signedBy: preferences.displayName || 'Daniyal'
      });
      setShowSignModal(false);
      playBookCloseSound();
      onDone();
    } catch (error) {
      console.error('Failed to sign book:', error);
      setSaveStatus('failed');
    }
  };

  // Done Action (Save and Exit)
  const handleDone = async () => {
    playButtonClick();
    playBookCloseSound();
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (await executeSave(pagesRef.current, titleRef.current)) onDone();
  };

  // Clear current page content
  const handleClearCurrentPage = () => {
    const targetIdx = activeEditorTarget === 'right' && isReadingMode ? activeRightIndex : activeLeftIndex;
    const targetEditor = activeEditorTarget === 'right' && isReadingMode ? rightEditor : leftEditor;
    if (targetEditor) {
      targetEditor.commands.setContent('<p></p>');
      handlePageContentChange(targetIdx, '<p></p>');
    }
    setShowFormattingDrawer(false);
  };

  // Download complete book as page-accurate PDF
  const handleDownloadPdf = async () => {
    playButtonClick();
    setPdfExportStatus('Crafting PDF...');
    try {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      await executeSave(pagesRef.current, titleRef.current);

      const { downloadBookAsPdf } = await import('./pdf/pdfExportService');
      await downloadBookAsPdf({
        title: titleRef.current,
        pages: pagesRef.current,
        currentFont,
        onProgress: (cur, tot) => {
          setPdfExportStatus(`Exporting page ${cur} of ${tot}...`);
        }
      });

      setPdfExportStatus('Downloaded!');
      setTimeout(() => setPdfExportStatus(null), 2500);
    } catch (err) {
      console.error('Failed to export book as PDF:', err);
      setPdfExportStatus('Export failed');
      setTimeout(() => setPdfExportStatus(null), 3000);
    }
  };

  // Ambience audio lifecycle
  useEffect(() => {
    if (preferences.ambienceSoundEnabled) {
      startAmbienceAudio(envPreset);
    }
    return () => {
      stopAmbienceAudio();
    };
  }, [envPreset, preferences.ambienceSoundEnabled]);

  const handleEnvPresetChange = async (newPreset: EnvironmentPreset) => {
    setEnvPreset(newPreset);
    if (preferences.ambienceSoundEnabled) {
      startAmbienceAudio(newPreset);
    }
    const updated = await preferencesRepository.updatePreferences({ environmentPreset: newPreset });
    onPreferencesUpdated?.(updated);
  };

  const handleToggleAnimated = async () => {
    const nextVal = !animatedBg;
    setAnimatedBg(nextVal);
    const updated = await preferencesRepository.updatePreferences({ animatedBackground: nextVal });
    onPreferencesUpdated?.(updated);
  };

  const activeEditorForDrawer = activeEditorTarget === 'right' && isReadingMode ? rightEditor : leftEditor;

  return (
    <div className={styles.editorContainer}>
      {/* Animated Minecraft Environmental Background */}
      <EnvironmentBackground
        preset={envPreset}
        animated={animatedBg}
        reducedMotion={reducedMotion}
      />

      {/* Background Dim Scrim (Minecraft in-game GUI darkening) */}
      <div className={styles.editorOverlayScrim} />

      {/* Top Title, Formatting Tool, PDF Export & Save Indicator */}
      <div className={styles.topStatusRow} data-testid="editor-toolbar">
        <div
          className={styles.titlePlate}
          onClick={() => setIsEditingTitle(true)}
          title="Rename note"
          role={isEditingTitle ? undefined : 'button'}
          tabIndex={isEditingTitle ? undefined : 0}
          onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) setIsEditingTitle(true); }}
        >
          {isEditingTitle ? (
            <input
              type="text"
              className={styles.titleInput}
              aria-label="Note title"
              defaultValue={title}
              autoFocus
              onBlur={e => handleTitleSubmit(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSubmit(e.currentTarget.value);
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
            />
          ) : (
            <span className={styles.titleText}>{title}</span>
          )}
        </div>

        {/* Unobtrusive HUD Slot Buttons */}
        <div className={styles.topHudButtons}>
          <details className={styles.actionsMenu} open={showActions || !compactViewport} onToggle={e => setShowActions(e.currentTarget.open)}>
            <summary className={styles.slotButton} aria-label="Book actions">⋮</summary>
            <div className={styles.actionsPanel}>
          <EnvironmentSelector
            currentPreset={envPreset}
            animated={animatedBg}
            onPresetChange={handleEnvPresetChange}
            onToggleAnimated={handleToggleAnimated}
          />

          <button
            type="button"
            className={styles.slotButton}
            onClick={handleDownloadPdf}
            title="Download Book as PDF"
            aria-label="Download Book as PDF"
          >
            <PixelIcon name="pdf" size={16} />
          </button>

          <button
            type="button"
            className={styles.slotButton}
            disabled={compactViewport}
            onClick={() => {
              playButtonClick();
              setIsReadingMode(!isReadingMode);
            }}
            title={isReadingMode ? "Single-Page Edit Mode" : "Two-Page Reading Mode"}
            aria-label="Toggle Reading Mode"
          >
            <PixelIcon name="book" size={16} />
          </button>

            </div>
          </details>
          <button
            type="button"
            className={styles.slotButton}
            onClick={() => {
              playButtonClick();
              setShowFormattingDrawer(true);
            }}
            title="Formatting & Dyes Palette (Alt+Q)"
            aria-label="Open Formatting Palette (Alt+Q)"
          >
            <PixelIcon name="quill" size={16} />
          </button>

          {/* Isolated Minecraft Music Discs Jukebox Button (prevents editor rerendering) */}
          <JukeboxToolbarSlot />
        </div>

        <div className={styles.saveStatusText} role="status" aria-live="polite">
          <span className={styles.mobilePageIndicator}>Page {activeLeftIndex + 1} of {totalPages}</span>
          {pdfExportStatus && (
            <span className={styles.pdfExportToast}>{pdfExportStatus}</span>
          )}
          {!pdfExportStatus && saveStatus === 'saving' && (
            <span className={styles.savingText}>Saving...</span>
          )}
          {!pdfExportStatus && saveStatus === 'failed' && (
            <button type="button" onClick={() => executeSave(pagesRef.current, titleRef.current)}>Save failed · Retry</button>
          )}
          {!pdfExportStatus && saveStatus === 'saved' && (
            <span className={styles.savedText}>Saved</span>
          )}
        </div>
      </div>

      {/* Main Book Workspace (Centered, authentic game object) */}
      <div className={styles.bookWorkspace}>
        {/* ========================================================
            1. AUTHENTIC SINGLE-PAGE BOOK & QUILL
            ======================================================== */}
        {!isReadingMode ? (
          <div className={styles.singleBookContainer}>
            {/* Page Header: "Page 1 of 1" aligned right */}
            <div className={styles.pageHeader}>
              <span className={styles.pageNumber}>
                Page {pageIndex + 1} of {totalPages}
              </span>
            </div>

            {/* Editor Writing Area - Finite Usable Content Area */}
            <div
              className={styles.editorContentArea}
              onClick={e => { if (!(e.target as Element).closest('.ProseMirror')) leftEditor?.commands.focus(); }}
            >
              <EditorContent className="allow-select" editor={leftEditor} />
            </div>

            {/* Page Turn Footer: Bottom Corners */}
            <div className={styles.pageFooter}>
              {/* Previous Page Arrow (Left corner) */}
              {pageIndex > 0 ? (
                <button
                  type="button"
                  className={styles.turnArrowLeft}
                  onClick={handleTurnPrevious}
                  title="Previous Page"
                  aria-label="Previous Page"
                />
              ) : (
                <div style={{ width: 36, height: 20 }} />
              )}

              {/* Next Page Arrow (Right corner: creates new page if on last page) */}
              <button
                type="button"
                className={styles.turnArrowRight}
                onClick={handleTurnNext}
                title={pageIndex >= totalPages - 1 ? "Next Page (Craft new page)" : "Next Page"}
                aria-label="Next Page"
              />
            </div>
          </div>
        ) : (
          /* ========================================================
             2. AUTHENTIC TWO-PAGE READING MODE
             ======================================================== */
          <div className={styles.doubleBookContainer}>
            {/* Left Page (Always odd: 1, 3, 5, 7...) */}
            <div className={styles.doubleBookPageHalfLeft}>
              <div className={styles.pageHeader}>
                <span className={styles.pageNumber}>
                  Page {spreadInfo.leftPageIndex + 1} of {totalPages}
                </span>
              </div>

              <div
                className={styles.editorContentArea}
                onClick={e => { if (!(e.target as Element).closest('.ProseMirror')) leftEditor?.commands.focus(); }}
              >
                <EditorContent className="allow-select" editor={leftEditor} />
              </div>

              <div className={styles.pageFooter}>
                {spreadInfo.spreadIndex > 0 ? (
                  <button
                    type="button"
                    className={styles.turnArrowLeft}
                    onClick={handleTurnPrevious}
                    title="Previous Spread"
                    aria-label="Previous Spread"
                  />
                ) : (
                  <div style={{ width: 36, height: 20 }} />
                )}
              </div>
            </div>

            {/* Right Page (Even: 2, 4, 6... or Blank facing page) */}
            <div className={styles.doubleBookPageHalfRight}>
              {/* Top-Right Close Button */}
              <button
                type="button"
                className={styles.doubleCloseBtn}
                onClick={() => setIsReadingMode(false)}
                title="Close Two-Page Mode"
                aria-label="Close Two-Page Mode"
              >
                ✕
              </button>

              <div className={styles.pageHeader}>
                <span className={styles.pageNumber}>
                  {spreadInfo.hasRightPage
                    ? `Page ${spreadInfo.rightPageIndex + 1} of ${totalPages}`
                    : 'Blank facing page'}
                </span>
              </div>

              <div
                className={styles.editorContentArea}
                onClick={() => {
                  if (spreadInfo.hasRightPage) {
                    rightEditor?.commands.focus();
                  }
                }}
              >
                {spreadInfo.hasRightPage ? (
                  <EditorContent className="allow-select" editor={rightEditor} />
                ) : (
                  <div className={styles.blankFacingPage}>
                    <div className={styles.blankFacingPrompt}>
                      Blank facing page<br />
                      <span style={{ fontSize: '11px', color: '#a0907e' }}>
                        Click next arrow to craft page {spreadInfo.rightPageIndex + 1}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.pageFooter}>
                <div style={{ width: 36, height: 20 }} />
                <button
                  type="button"
                  className={styles.turnArrowRight}
                  onClick={handleTurnNext}
                  title={
                    !spreadInfo.hasRightPage || spreadInfo.spreadIndex >= spreadInfo.totalSpreads - 1
                      ? "Next Pages (Craft new page)"
                      : "Next Pages"
                  }
                  aria-label="Next Pages"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar: [ Sign ] and [ Done ] */}
      {!isReadingMode ? (
        <div className={styles.bottomActionBar}>
          <div className={styles.actionBtn}>
            <PixelButton size="medium" onClick={() => setShowSignModal(true)}>
              Sign
            </PixelButton>
          </div>
          <div className={styles.actionBtn}>
            <PixelButton size="medium" onClick={handleDone}>
              Done
            </PixelButton>
          </div>
        </div>
      ) : (
        <div className={styles.doubleBottomActionBar}>
          <div className={styles.doubleSignBtnContainer}>
            <PixelButton size="medium" onClick={() => setShowSignModal(true)}>
              Sign
            </PixelButton>
          </div>
          <div className={styles.doubleRightBtnContainer}>
            <PixelButton size="medium" onClick={handleDone}>
              Done
            </PixelButton>
          </div>
        </div>
      )}

      {/* Formatting & Dye Palette Drawer */}
      <FormattingDrawer
        isOpen={showFormattingDrawer}
        onClose={() => setShowFormattingDrawer(false)}
        editor={activeEditorForDrawer}
        currentFont={currentFont}
        onFontChange={setCurrentFont}
        isReadingMode={isReadingMode}
        canUseSpread={!compactViewport}
        onToggleReadingMode={() => setIsReadingMode(!isReadingMode)}
        onClearPage={handleClearCurrentPage}
        onDownloadPdf={handleDownloadPdf}
        onAlignmentChange={handleReflowAllPages}
      />

      {/* Sign Book Modal */}
      <SignModal
        isOpen={showSignModal}
        initialTitle={title}
        authorName={preferences.displayName || 'Daniyal'}
        onSign={handleSign}
        onCancel={() => setShowSignModal(false)}
      />
    </div>
  );
};
