/**
 * MineNotes - Editor Caret & Selection Mapping
 * Handles seamless cursor positioning across page boundaries, splits, and reflows.
 */

import { type Editor } from '@tiptap/react';

export interface EditorSelectionState {
  from: number;
  to: number;
  empty: boolean;
}

/**
 * Capture the current selection from a TipTap editor safely.
 */
export function captureEditorSelection(editor: Editor | null): EditorSelectionState | null {
  if (!editor || editor.isDestroyed) return null;
  try {
    const { selection } = editor.state;
    return {
      from: selection.from,
      to: selection.to,
      empty: selection.empty
    };
  } catch {
    return null;
  }
}

/**
 * Restores selection to an editor at a specific position, 'start', or 'end'.
 */
export function restoreEditorSelection(
  editor: Editor | null,
  target: 'start' | 'end' | number = 'end'
): void {
  if (!editor || editor.isDestroyed) return;

  try {
    if (target === 'start') {
      editor.commands.focus('start');
    } else if (target === 'end') {
      editor.commands.focus('end');
    } else if (typeof target === 'number') {
      const docSize = editor.state.doc.content.size;
      const safePos = Math.max(1, Math.min(target, docSize - 1));
      editor.chain().focus().setTextSelection(safePos).run();
    }
  } catch (err) {
    console.warn('Failed to restore editor selection:', err);
  }
}

/**
 * Calculates whether the current selection moves to the next page after a page split,
 * and determines its relative position on the destination page.
 */
export function mapSelectionAfterSplit(
  currentPos: number,
  keepContentLength: number
): { targetPage: 'current' | 'next'; newPos: number } {
  if (currentPos <= keepContentLength) {
    return {
      targetPage: 'current',
      newPos: currentPos
    };
  }

  // Moved to next page
  const relativeOffset = Math.max(1, currentPos - keepContentLength);
  return {
    targetPage: 'next',
    newPos: relativeOffset
  };
}
