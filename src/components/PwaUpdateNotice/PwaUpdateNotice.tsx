import { useRegisterSW } from 'virtual:pwa-register/react';
import { PixelButton } from '../PixelButton/PixelButton';
import styles from './PwaUpdateNotice.module.css';

/** Updates are offered outside the editor, after Done has committed the book. */
export function PwaUpdateNotice({ visible }: { visible: boolean }) {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  if (!visible || !needRefresh) return null;
  return (
    <aside className={styles.notice} aria-label="MineNotes update" role="status">
      <span>A MineNotes update is ready.</span>
      <div className={styles.actions}>
        <PixelButton size="small" onClick={() => updateServiceWorker(true)}>Update MineNotes</PixelButton>
        <PixelButton size="small" onClick={() => setNeedRefresh(false)}>Later</PixelButton>
      </div>
    </aside>
  );
}
