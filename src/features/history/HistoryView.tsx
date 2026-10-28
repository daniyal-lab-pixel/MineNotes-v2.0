import React, { useEffect, useState } from 'react';
import styles from './HistoryView.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { notesRepository } from '../../storage/notesRepository';
import { type NoteItem } from '../../storage/database';

export interface HistoryViewProps {
  onOpenNote: (id: string) => void;
  onBack: () => void;
}

function formatRelativeTime(timestamp: number, now: number) {
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenNote, onBack }) => {
  const [recentNotes, setRecentNotes] = useState<NoteItem[]>([]);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    notesRepository.getRecentNotes(15).then(setRecentNotes);
  }, []);

  return (
    <div className={styles.historyContainer}>
      <h2 className={styles.title}>Recent History</h2>

      <div className={styles.timelineList}>
        {recentNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#a0a0a0' }}>
            No recent note edits recorded yet.
          </div>
        ) : (
          recentNotes.map(note => (
            <div
              key={note.id}
              className={styles.historyItem}
              onClick={() => onOpenNote(note.id)}
            >
              <div className={styles.itemLeft}>
                <PixelIcon name="history" size={24} color="#ffffa0" />
                <div>
                  <div className={styles.itemTitle}>{note.title}</div>
                  <div className={styles.itemTime}>{formatRelativeTime(note.updatedAt, now)}</div>
                </div>
              </div>
              <PixelIcon name="turnRight" size={16} color="#e0e0e0" />
            </div>
          ))
        )}
      </div>

      <div className={styles.footerActions}>
        <PixelButton size="large" onClick={onBack}>
          Done
        </PixelButton>
      </div>
    </div>
  );
};
