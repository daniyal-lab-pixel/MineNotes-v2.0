import { useEffect, type RefObject } from 'react';

/** Trap keyboard navigation in an open dialog and restore the invoking control. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean): void {
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
    )).filter(el => el.getClientRects().length > 0);
    (controls()[0] ?? dialog).focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKey);
    return () => {
      dialog.removeEventListener('keydown', handleKey);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
