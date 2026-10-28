import React, { useState, useRef, useEffect } from 'react';
import styles from './SettingsView.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { ConfirmModal } from '../../components/ConfirmModal/ConfirmModal';
import { preferencesRepository } from '../../storage/notesRepository';
import { backupService, type BackupPreview } from '../../storage/backupService';
import { notesRepository } from '../../storage/notesRepository';
import { bookMetadataRepository } from '../bookshelf/bookMetadataRepository';
import { TestBookCleanupModal } from '../bookshelf/TestBookCleanupModal';
import { type UserPreferences, type NoteItem, type BookMetadata } from '../../storage/database';
import { playButtonClick, playTypingSound, playPageTurnSound } from '../../utils/sound';

export interface SettingsViewProps {
  onBack: () => void;
  onPreferencesUpdated: (prefs: UserPreferences) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack, onPreferencesUpdated }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [restorePreview, setRestorePreview] = useState<BackupPreview | null>(null);
  const [pendingRestoreText, setPendingRestoreText] = useState<string | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [devNotes, setDevNotes] = useState<NoteItem[]>([]);
  const [devMetadata, setDevMetadata] = useState<Map<string, BookMetadata>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preferencesRepository.getPreferences().then(setPreferences);
  }, []);

  const handleUpdate = async (updates: Partial<UserPreferences>) => {
    const updated = await preferencesRepository.updatePreferences(updates);
    setPreferences(updated);
    onPreferencesUpdated(updated);
  };

  const handleExportBackup = async () => {
    try {
      const fileName = await backupService.exportBackup();
      setStatusMessage(`Backup saved: ${fileName}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Export failed.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const preview = backupService.previewBackup(text);
      setRestorePreview(preview);
      setPendingRestoreText(text);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Invalid backup file.');
      setTimeout(() => setStatusMessage(null), 3500);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreText) return;
    try {
      const res = await backupService.importBackup(pendingRestoreText, { mode: 'merge' });
      setStatusMessage(res.message);
      setTimeout(() => setStatusMessage(null), 4000);
      const updatedPrefs = await preferencesRepository.getPreferences();
      setPreferences(updatedPrefs);
      onPreferencesUpdated(updatedPrefs);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setRestorePreview(null);
      setPendingRestoreText(null);
    }
  };

  const handleOpenDevCleanup = async () => {
    const notes = await notesRepository.getAllNotes();
    const meta = await bookMetadataRepository.getAllMetadata();
    setDevNotes(notes);
    setDevMetadata(meta);
    setShowCleanupModal(true);
  };

  const handleConfirmClear = async () => {
    await backupService.clearAllData();
    setShowClearConfirm(false);
    setStatusMessage('All local notes have been erased.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  if (!preferences) return null;

  return (
    <div className={styles.settingsContainer}>
      <h2 className={styles.title}>Game Settings</h2>

      <div className={styles.settingsPanel}>
        {statusMessage && (
          <div style={{ backgroundColor: '#2d4a22', border: '2px solid #5e7c16', padding: '10px', color: '#80c71f', textAlign: 'center', fontFamily: 'var(--font-pixel)' }}>
            {statusMessage}
          </div>
        )}

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Author Name</label>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Daniyal"
            value={preferences.displayName}
            onChange={e => handleUpdate({ displayName: e.target.value })}
          />
        </div>

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Default Note Font</label>
          <div className={styles.optionsGroup}>
            <PixelButton
              size="small"
              variant={preferences.defaultFont === 'pixel' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ defaultFont: 'pixel' })}
            >
              Pixel Font
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.defaultFont === 'typewriter' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ defaultFont: 'typewriter' })}
            >
              Typewriter
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.defaultFont === 'sans' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ defaultFont: 'sans' })}
            >
              Clean Sans
            </PixelButton>
          </div>
        </div>

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Writing Atmosphere</label>
          <div className={styles.optionsGroup}>
            <PixelButton
              size="small"
              variant={(!preferences.environmentPreset || preferences.environmentPreset === 'clear') ? 'wood' : 'default'}
              onClick={() => handleUpdate({ environmentPreset: 'clear' })}
              icon={<PixelIcon name="sun" size={14} />}
            >
              Clear Day
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.environmentPreset === 'rain' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ environmentPreset: 'rain' })}
              icon={<PixelIcon name="rain" size={14} />}
            >
              Rain
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.environmentPreset === 'snow' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ environmentPreset: 'snow' })}
              icon={<PixelIcon name="snow" size={14} />}
            >
              Snow
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.environmentPreset === 'night' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ environmentPreset: 'night' })}
              icon={<PixelIcon name="moon" size={14} />}
            >
              Night
            </PixelButton>
          </div>
        </div>

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Atmosphere Animation</label>
          <div className={styles.optionsGroup}>
            <PixelButton
              size="small"
              variant={preferences.animatedBackground !== false ? 'wood' : 'default'}
              onClick={() => handleUpdate({ animatedBackground: !(preferences.animatedBackground !== false) })}
              icon={<PixelIcon name="sparkle" size={14} />}
            >
              {preferences.animatedBackground !== false ? 'Animated: ON' : 'Animated: OFF'}
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.reducedMotion ? 'wood' : 'default'}
              onClick={() => handleUpdate({ reducedMotion: !preferences.reducedMotion })}
            >
              {preferences.reducedMotion ? 'Reduced Motion: ON' : 'Reduced Motion: OFF'}
            </PixelButton>
          </div>
        </div>

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Audio &amp; Typing Sound Settings</label>
          <div className={styles.optionsGroup}>
            <PixelButton
              size="small"
              variant={preferences.soundEnabled ? 'wood' : 'default'}
              onClick={() => {
                const next = !preferences.soundEnabled;
                handleUpdate({ soundEnabled: next });
                if (next) playButtonClick();
              }}
              icon={<PixelIcon name={preferences.soundEnabled ? 'soundOn' : 'soundOff'} size={16} />}
            >
              {preferences.soundEnabled ? 'Master: ON' : 'Master: OFF'}
            </PixelButton>

            <PixelButton
              size="small"
              variant={preferences.typingSoundEnabled !== false ? 'wood' : 'default'}
              onClick={() => {
                const next = !(preferences.typingSoundEnabled !== false);
                handleUpdate({ typingSoundEnabled: next });
                if (next) playTypingSound();
              }}
              icon={<PixelIcon name="quill" size={14} />}
            >
              {preferences.typingSoundEnabled !== false ? 'Typing: ON' : 'Typing: OFF'}
            </PixelButton>

            <PixelButton
              size="small"
              variant={preferences.uiSoundEnabled !== false ? 'wood' : 'default'}
              onClick={() => {
                const next = !(preferences.uiSoundEnabled !== false);
                handleUpdate({ uiSoundEnabled: next });
                if (next) playButtonClick();
              }}
            >
              {preferences.uiSoundEnabled !== false ? 'UI Clicks: ON' : 'UI Clicks: OFF'}
            </PixelButton>

            <PixelButton
              size="small"
              variant={preferences.pageTurnSoundEnabled !== false ? 'wood' : 'default'}
              onClick={() => {
                const next = !(preferences.pageTurnSoundEnabled !== false);
                handleUpdate({ pageTurnSoundEnabled: next });
                if (next) playPageTurnSound();
              }}
              icon={<PixelIcon name="book" size={14} />}
            >
              {preferences.pageTurnSoundEnabled !== false ? 'Page Turns: ON' : 'Page Turns: OFF'}
            </PixelButton>

            <PixelButton
              size="small"
              variant={preferences.ambienceSoundEnabled ? 'wood' : 'default'}
              onClick={() => handleUpdate({ ambienceSoundEnabled: !preferences.ambienceSoundEnabled })}
              icon={<PixelIcon name={preferences.ambienceSoundEnabled ? 'soundOn' : 'soundOff'} size={16} />}
            >
              {preferences.ambienceSoundEnabled ? 'Ambience: ON' : 'Ambience: OFF'}
            </PixelButton>
          </div>

          {/* Typing Sound Volume Slider */}
          <div className={styles.sliderContainer}>
            <span className={styles.sliderLabel}>
              Typing Volume: {preferences.typingSoundVolume ?? 12}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={preferences.typingSoundVolume ?? 12}
              onChange={(e) => {
                const val = Number(e.target.value);
                handleUpdate({ typingSoundVolume: val });
                playTypingSound();
              }}
              className={styles.volumeSlider}
              title={`Typing Volume: ${preferences.typingSoundVolume ?? 12}%`}
              aria-label="Typing Sound Volume"
            />
          </div>
        </div>

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Menu Background</label>
          <div className={styles.optionsGroup}>
            <PixelButton
              size="small"
              variant={preferences.themeBackground === 'dirt' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ themeBackground: 'dirt' })}
            >
              Classic Dirt
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.themeBackground === 'stone' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ themeBackground: 'stone' })}
            >
              Smooth Stone
            </PixelButton>
            <PixelButton
              size="small"
              variant={preferences.themeBackground === 'oak' ? 'wood' : 'default'}
              onClick={() => handleUpdate({ themeBackground: 'oak' })}
            >
              Oak Planks
            </PixelButton>
          </div>
        </div>

        <div className={styles.settingRow}>
          <label className={styles.rowLabel}>Data Storage & Backup</label>
          <div className={styles.actionsGroup}>
            <PixelButton
              size="small"
              onClick={handleExportBackup}
              icon={<PixelIcon name="export" size={16} />}
            >
              Export Backup
            </PixelButton>

            <PixelButton
              size="small"
              onClick={handleImportClick}
              icon={<PixelIcon name="import" size={16} />}
            >
              Import Backup
            </PixelButton>

            <PixelButton
              size="small"
              variant="danger"
              onClick={() => setShowClearConfirm(true)}
              icon={<PixelIcon name="trash" size={16} />}
            >
              Clear Notes
            </PixelButton>
          </div>
        </div>

        {import.meta.env.DEV && (
          <div className={styles.settingRow} style={{ borderTop: '2px dashed #666644', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ backgroundColor: '#aa3300', color: '#ffffff', padding: '2px 6px', fontSize: '11px', fontFamily: 'var(--font-pixel)' }}>
                DEV ONLY
              </span>
              <label className={styles.rowLabel} style={{ margin: 0 }}>Developer Tools</label>
            </div>
            <div className={styles.actionsGroup}>
              <PixelButton
                size="small"
                variant="wood"
                onClick={handleOpenDevCleanup}
                icon={<PixelIcon name="trash" size={14} color="#ff9999" />}
              >
                Review &amp; Clean Test Fixtures
              </PixelButton>
            </div>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '6px' }}>
              Inspect and remove development fixtures and empty untitled test notes. Only visible during local development.
            </p>
          </div>
        )}

        <div className={styles.creditsBox}>
          <div className={styles.creditsTitle}>MineNotes v2.0</div>
          <div className={styles.creditsDesc}>Crafted by Daniyal</div>
          <div style={{ fontSize: '11px', color: '#777777', marginTop: '4px' }}>
            Minecraft Java Edition Book &amp; Quill, Bookshelf Library &amp; Persistent Jukebox. Offline PWA.
          </div>
        </div>
      </div>

      <div className={styles.footerActions}>
        <PixelButton size="large" onClick={onBack}>
          Done
        </PixelButton>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className={styles.hiddenFileInput}
        accept=".json"
        onChange={handleFileChange}
      />

      <ConfirmModal
        isOpen={showClearConfirm}
        title="Destroy All Notes?"
        message="This will permanently delete all notes saved in local storage. Make sure to export a backup first!"
        confirmLabel="Erase Everything"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />

      {restorePreview && (
        <ConfirmModal
          isOpen={true}
          title="Restore MineNotes Backup?"
          message={`Backup Details:
• Version: ${restorePreview.version} (MineNotes v${restorePreview.appVersion})
• Exported: ${new Date(restorePreview.exportedAt).toLocaleDateString()}
• Books: ${restorePreview.notesCount}
• Shelves: ${restorePreview.shelvesCount}
• Custom Covers: ${restorePreview.metadataCount}
• Custom Songs: ${restorePreview.songsCount}

Existing notes and settings will be safely preserved (safe merge mode).`}
          confirmLabel="Restore Data"
          variant="default"
          onConfirm={handleConfirmRestore}
          onCancel={() => {
            setRestorePreview(null);
            setPendingRestoreText(null);
          }}
        />
      )}

      {showCleanupModal && (
        <TestBookCleanupModal
          notes={devNotes}
          metadataMap={devMetadata}
          onClose={() => setShowCleanupModal(false)}
          onDeleteNotes={async ids => {
            await notesRepository.deleteNotesBatch(ids);
            setStatusMessage(`Cleaned ${ids.length} development note(s).`);
            setTimeout(() => setStatusMessage(null), 3000);
            const updated = await notesRepository.getAllNotes();
            setDevNotes(updated);
          }}
        />
      )}
    </div>
  );
};
