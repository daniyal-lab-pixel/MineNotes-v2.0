import React, { useEffect, useState, useRef } from 'react';
import styles from './LoadingScreen.module.css';
import { PixelButton } from '../../components/PixelButton/PixelButton';
import { preferencesRepository } from '../../storage/notesRepository';
import { type UserPreferences } from '../../storage/database';

export interface LoadingScreenProps {
  onLoaded: (preferences: UserPreferences) => void;
}

interface SparkleParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  maxOpacity: number;
  life: number;
  maxLife: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoaded }) => {
  const [progress, setProgress] = useState(15);
  const [statusMsg, setStatusMsg] = useState('Loading MineNotes...');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subtle floating golden embers matching Image A
  useEffect(() => {
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

    const particles: SparkleParticle[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.35 ? 3 : 2,
      speedY: -(0.3 + Math.random() * 0.7),
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: 0,
      maxOpacity: 0.4 + Math.random() * 0.55,
      life: Math.random() * 120,
      maxLife: 120 + Math.random() * 100
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.y += p.speedY;
        p.x += p.speedX;

        // Fade in and fade out
        if (p.life < 30) {
          p.opacity = (p.life / 30) * p.maxOpacity;
        } else if (p.life > p.maxLife - 30) {
          p.opacity = ((p.maxLife - p.life) / 30) * p.maxOpacity;
        }

        if (p.life >= p.maxLife || p.y < -10) {
          p.x = Math.random() * width;
          p.y = height + 10;
          p.life = 0;
          p.opacity = 0;
        }

        ctx.fillStyle = `rgba(254, 216, 61, ${p.opacity.toFixed(2)})`;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, []);

  // Real functional startup sequence
  useEffect(() => {
    let isCancelled = false;

    const bootstrapApp = async () => {
      try {
        setError(null);

        // Stage 1: Database & storage initialization
        setProgress(15);
        setStatusMsg('Loading MineNotes...');
        await new Promise(r => setTimeout(r, 100));
        if (isCancelled) return;

        // Stage 2: Preferences retrieval
        const prefs = await preferencesRepository.getPreferences();
        if (isCancelled) return;
        setProgress(35);
        setStatusMsg('Opening your library...');
        await new Promise(r => setTimeout(r, 100));
        if (isCancelled) return;

        // Stage 3: Core textures preloading
        setProgress(65);
        setStatusMsg('Loading pixel-art textures...');
        const textureUrls = [
          '/textures/loading_backdrop.jpg',
          '/textures/main_menu_backdrop.jpg',
          '/textures/book_single.png',
          '/textures/book_double.png',
          '/textures/stone.png',
          '/textures/charcoal.png',
          '/textures/oak_planks.png',
          '/textures/parchment.png',
          '/textures/turn_right.png',
          '/textures/turn_left.png',
          '/textures/mc_button.png'
        ];
        await Promise.all(
          textureUrls.map(url => {
            return new Promise(resolve => {
              const img = new Image();
              img.src = url;
              img.onload = resolve;
              img.onerror = resolve; // Graceful non-blocking
            });
          })
        );
        if (isCancelled) return;

        // Stage 4: Font readiness
        setProgress(85);
        setStatusMsg('Loading pixel fonts...');
        try {
          if (document.fonts) {
            await Promise.all([
              document.fonts.load('16px Minecraft'),
              document.fonts.load('700 16px Minecraft'),
              document.fonts.ready
            ]);
          }
        } catch {
          // Graceful fallback
        }
        await new Promise(r => setTimeout(r, 100));
        if (isCancelled) return;

        // Stage 5: State readiness
        setProgress(95);
        setStatusMsg('Preparing your books...');
        await new Promise(r => setTimeout(r, 90));
        if (isCancelled) return;

        // Stage 6: Ready!
        setProgress(100);
        setStatusMsg('Ready!');
        await new Promise(r => setTimeout(r, 120));

        if (!isCancelled) {
          onLoaded(prefs);
        }
      } catch (err: unknown) {
        console.error('MineNotes initialization error:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize local storage.');
        }
      }
    };

    bootstrapApp();

    return () => {
      isCancelled = true;
    };
  }, [onLoaded]);

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.vignetteOverlay} aria-hidden="true" />
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

      <div className={styles.centerContent}>
        {/* Authentic pixelated spinner matching Image A */}
        <div className={styles.spinnerWrapper}>
          <svg className={styles.pixelSpinner} viewBox="0 0 24 24" fill="none">
            {/* 8 square pixel dots arranged in circle */}
            <rect x="10" y="2" width="4" height="4" fill="#ffffff" />
            <rect x="16" y="4" width="4" height="4" fill="#e0e0e0" />
            <rect x="18" y="10" width="4" height="4" fill="#c0c0c0" />
            <rect x="16" y="16" width="4" height="4" fill="#909090" />
            <rect x="10" y="18" width="4" height="4" fill="#707070" />
            <rect x="4" y="16" width="4" height="4" fill="#505050" />
            <rect x="2" y="10" width="4" height="4" fill="#383838" />
            <rect x="4" y="4" width="4" height="4" fill="#202020" />
          </svg>
        </div>

        {/* Real dynamic progress bar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Real dynamic percentage & status label */}
        <div className={styles.statusText}>
          <div className={styles.percentageText}>{progress}%</div>
          <div className={styles.statusMessage}>{statusMsg}</div>
        </div>

        {/* Recoverable Minecraft error interface */}
        {error && (
          <div className={styles.errorBox}>
            <p>{error}</p>
            <div style={{ marginTop: '12px' }}>
              <PixelButton
                size="small"
                variant="danger"
                onClick={() => window.location.reload()}
              >
                Retry
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
