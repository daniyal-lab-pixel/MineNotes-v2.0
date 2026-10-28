import { useState, useEffect, lazy, Suspense } from 'react';
import { PwaUpdateNotice } from './components/PwaUpdateNotice/PwaUpdateNotice';
import { LoadingScreen } from './features/loading/LoadingScreen';
import { WelcomeBook } from './features/welcome/WelcomeBook';
import { MainMenu } from './features/menu/MainMenu';
import { PersistentJukebox } from './features/jukebox/PersistentJukebox';
import { notesRepository, preferencesRepository } from './storage/notesRepository';
import { type UserPreferences } from './storage/database';
import { useVisualViewport } from './hooks/useVisualViewport';
import { useMediaQuery, MOBILE_JUKEBOX_QUERY } from './hooks/useMediaQuery';
import { jukeboxController } from './features/jukebox/jukeboxController';
import { setSoundEnabled } from './utils/sound';

const SavedNotes = lazy(() => import('./features/library/SavedNotes').then(module => ({ default: module.SavedNotes })));
const BookEditor = lazy(() => import('./features/editor/BookEditor').then(module => ({ default: module.BookEditor })));
const HistoryView = lazy(() => import('./features/history/HistoryView').then(module => ({ default: module.HistoryView })));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then(module => ({ default: module.SettingsView })));

export type AppScreen = 'loading' | 'welcome' | 'menu' | 'library' | 'editor' | 'history' | 'settings';

export default function App() {
  useVisualViewport();
  const mobileJukebox = useMediaQuery(MOBILE_JUKEBOX_QUERY);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  useEffect(() => jukeboxController.subscribe(state => {
    setJukeboxOpen(previous => {
      const next = state.displayMode !== 'closed';
      return previous === next ? previous : next;
    });
  }), []);
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const handleLoadingFinished = async (loadedPrefs: UserPreferences) => {
    setPreferences(loadedPrefs);
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen') as AppScreen | null;
    const noteIdParam = params.get('noteId');

    if (screenParam) {
      if (screenParam === 'loading') {
        return;
      }
      if (noteIdParam) {
        setActiveNoteId(noteIdParam);
      } else if (screenParam === 'editor') {
        const notes = await notesRepository.getAllNotes();
        if (notes.length > 0) {
          setActiveNoteId(notes[0].id);
        } else {
          const newNote = await notesRepository.createNote('Untitled Note');
          setActiveNoteId(newNote.id);
        }
      }
      setScreen(screenParam);
      return;
    }

    if (!loadedPrefs.hasCompletedWelcome) {
      setScreen('welcome');
    } else {
      setScreen('menu');
    }
  };

  const handleWelcomeDone = () => {
    setScreen('menu');
  };

  const handleCreateNewNote = async () => {
    const newNote = await notesRepository.createNote('Untitled Note');
    setActiveNoteId(newNote.id);
    setScreen('editor');
  };

  const handleOpenNote = (noteId: string) => {
    setActiveNoteId(noteId);
    setScreen('editor');
  };

  const handleToggleSound = async () => {
    if (!preferences) return;
    const newSoundState = !preferences.soundEnabled;
    setSoundEnabled(newSoundState);
    const updated = await preferencesRepository.updatePreferences({ soundEnabled: newSoundState });
    setPreferences(updated);
  };

  return (
    <main style={{ width: '100%', height: '100%' }}>
      <div className="appContent" inert={mobileJukebox && jukeboxOpen}>
      <Suspense fallback={<div className="screenLoading" role="status">Opening MineNotes...</div>}>
      {screen === 'loading' && (
        <LoadingScreen onLoaded={handleLoadingFinished} />
      )}

      {screen === 'welcome' && preferences && (
        <WelcomeBook
          displayName={preferences.displayName}
          onDone={handleWelcomeDone}
        />
      )}

      {screen === 'menu' && preferences && (
        <MainMenu
          onNewNote={handleCreateNewNote}
          onSavedNotes={() => setScreen('library')}
          onHistory={() => setScreen('history')}
          onSettings={() => setScreen('settings')}
          reducedMotion={preferences.reducedMotion}
          soundActive={preferences.soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {screen === 'library' && (
        <SavedNotes
          onOpenNote={handleOpenNote}
          onNewNote={handleCreateNewNote}
          onBack={() => setScreen('menu')}
          reducedMotion={preferences?.reducedMotion}
        />
      )}

      {screen === 'history' && (
        <HistoryView
          onOpenNote={handleOpenNote}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'settings' && preferences && (
        <SettingsView
          onBack={() => setScreen('menu')}
          onPreferencesUpdated={setPreferences}
        />
      )}

      {screen === 'editor' && activeNoteId && preferences && (
        <BookEditor
          noteId={activeNoteId}
          preferences={preferences}
          onDone={() => setScreen('library')}
          onPreferencesUpdated={setPreferences}
        />
      )}

      </Suspense>
      </div>
      {/* Persistent Application-Level YouTube Jukebox & Compact Mini-Player */}
      <PwaUpdateNotice visible={screen !== 'editor' && screen !== 'loading' && !jukeboxOpen} />
      <PersistentJukebox returnLabel={screen === 'editor' ? 'Back to Book' : 'Back to MineNotes'} />
    </main>
  );
}
