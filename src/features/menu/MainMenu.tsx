import React, { useEffect, useRef } from 'react';
import styles from './MainMenu.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { jukeboxController } from '../jukebox/jukeboxController';
import { playButtonClick } from '../../utils/sound';

export interface MainMenuProps {
  onNewNote: () => void;
  onSavedNotes: () => void;
  onHistory: () => void;
  onSettings: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
  reducedMotion?: boolean;
}

interface ForestParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  angle: number;
  wobble: number;
  color: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onNewNote,
  onSavedNotes,
  onHistory,
  onSettings,
  soundActive,
  onToggleSound,
  reducedMotion = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#85bb38', '#fed83d', '#6ea830', '#f9801d'];
    const leaves: ForestParticle[] = Array.from({ length: 24 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.4 ? 3 : 2,
      speedY: 0.3 + Math.random() * 0.7,
      speedX: 0.2 + Math.random() * 0.5,
      angle: Math.random() * Math.PI * 2,
      wobble: 0.012 + Math.random() * 0.02,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < leaves.length; i++) {
        const l = leaves[i];
        ctx.fillStyle = l.color;
        ctx.fillRect(Math.floor(l.x), Math.floor(l.y), l.size, l.size);

        l.y += l.speedY;
        l.angle += l.wobble;
        l.x += l.speedX + Math.sin(l.angle) * 0.6;

        if (l.y > height) {
          l.y = -10;
          l.x = Math.random() * width;
        }
        if (l.x > width) {
          l.x = -10;
        }
      }

      animId = document.hidden ? null : requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      if (document.hidden && animId !== null) { cancelAnimationFrame(animId); animId = null; }
      else if (!document.hidden && animId === null) render();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [reducedMotion]);

  return (
    <div className={styles.menuContainer}>
      {/* Authentic Minecraft Voxel Jungle Panorama Background from Image B */}
      <div className={styles.panoramaBackdrop} aria-hidden="true" />
      <div className={styles.atmosphereOverlay} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2
        }}
        aria-hidden="true"
      />

      {/* Accessible Title & Top Logo Spacer */}
      <div className={styles.topSection}>
        <img className={styles.mobileBrand} src="/textures/minenotes_3d_logo.png" width="800" height="290" alt="MineNotes — Crafted by Daniyal!" fetchPriority="high" />
        <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
          MineNotes - Minecraft Book &amp; Quill Edition
        </h1>
      </div>

      {/* Main Menu Center Buttons: 100% interactive React UI */}
      <div className={styles.centerSection}>
        <PixelButton 
          size="large" 
          onClick={onNewNote}
        >
          New Note
        </PixelButton>

        <PixelButton 
          size="large" 
          onClick={onSavedNotes}
        >
          Saved Notes
        </PixelButton>

        <PixelButton 
          size="large" 
          onClick={onHistory}
        >
          History
        </PixelButton>

        <PixelButton 
          size="large" 
          onClick={onSettings}
        >
          Settings
        </PixelButton>
      </div>

      {/* Bottom Footer Bar */}
      <div className={styles.bottomSection}>
        <div className={styles.footerLeft}>
          MineNotes v2.0
        </div>
        <div className={styles.footerCenter}>
          Minecraft Book &amp; Quill Edition
        </div>
        <div className={styles.footerRight}>
          <button 
            type="button" 
            className={styles.iconToggleBtn}
            onClick={() => {
              playButtonClick();
              jukeboxController.openExpanded();
            }}
            title="Minecraft Music Discs Jukebox"
            aria-label="Open Music Discs Jukebox"
          >
            <PixelIcon name="disc" size={22} dyeColor="#fed83d" />
          </button>

          <button 
            type="button" 
            className={styles.iconToggleBtn}
            onClick={onToggleSound}
            title={soundActive ? "Mute sounds" : "Enable sounds"}
            aria-label="Toggle Sound"
          >
            <PixelIcon name={soundActive ? "soundOn" : "soundOff"} size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
