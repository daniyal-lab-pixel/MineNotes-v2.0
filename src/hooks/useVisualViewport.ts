import { useEffect } from 'react';

/** Track Safari's keyboard-sized viewport without interfering with pinch zoom. */
export function useVisualViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      if (viewport && viewport.scale !== 1) return;
      root.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty('--app-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--app-top');
    };
  }, []);
}
