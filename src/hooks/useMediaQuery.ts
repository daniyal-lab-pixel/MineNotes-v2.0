import { useSyncExternalStore } from 'react';

export const COMPACT_EDITOR_QUERY = '(max-width: 767px), (max-height: 520px)';
export const MOBILE_JUKEBOX_QUERY = '(max-width: 900px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
