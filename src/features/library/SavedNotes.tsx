import React from 'react';
import { BookshelfView } from '../bookshelf/BookshelfView';

export interface SavedNotesProps {
  onOpenNote: (noteId: string) => void;
  onNewNote: () => void;
  onBack: () => void;
  reducedMotion?: boolean;
}

/**
 * SavedNotes (The Bookshelf Update)
 * Evolution of the Saved Notes screen into the authentic Minecraft Bookshelf
 */
export const SavedNotes: React.FC<SavedNotesProps> = ({
  onOpenNote,
  onNewNote,
  onBack,
  reducedMotion
}) => {
  return (
    <BookshelfView
      onOpenNote={onOpenNote}
      onNewNote={onNewNote}
      onBack={onBack}
      reducedMotion={reducedMotion}
    />
  );
};
