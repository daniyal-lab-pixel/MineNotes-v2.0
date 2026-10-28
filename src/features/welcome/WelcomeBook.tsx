import React from 'react';
import styles from './WelcomeBook.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { preferencesRepository } from '../../storage/notesRepository';
import { playPageTurnSound } from '../../utils/sound';

export interface WelcomeBookProps {
  onDone: () => void;
  displayName?: string;
}

export const WelcomeBook: React.FC<WelcomeBookProps> = ({ onDone, displayName }) => {
  const handleDone = async () => {
    playPageTurnSound();
    await preferencesRepository.setWelcomeCompleted();
    onDone();
  };

  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.bookFrame}>
        {/* Red stitch bindings on left edge */}
        <div className={styles.stitchColumn}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.stitchMark} />
          ))}
        </div>

        <div className={styles.pageHeader}>
          Page 1 of 1
        </div>

        <div className={styles.welcomeBody}>
          <div style={{ marginBottom: '4px' }}>
            <PixelIcon name="book" size={36} />
          </div>

          <h2 className={styles.bookTitle}>MineNotes</h2>

          <p className={styles.welcomeHeading}>
            {displayName ? `Welcome, ${displayName}!` : 'Welcome to MineNotes!'}
          </p>

          <p className={styles.welcomeTagline}>
            Your own little world of notes.
          </p>

          <p className={styles.craftedByText}>
            Crafted by Daniyal
          </p>
        </div>

        <div className={styles.cornerCrease}>
          <PixelIcon name="cornerFiligree" size={24} />
        </div>
      </div>

      <div className={styles.actionsContainer}>
        <PixelButton size="large" onClick={handleDone}>
          Done
        </PixelButton>
      </div>
    </div>
  );
};
