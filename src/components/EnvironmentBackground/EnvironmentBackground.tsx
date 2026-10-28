import React, { useEffect, useRef } from 'react';
import styles from './EnvironmentBackground.module.css';
import { type EnvironmentPreset } from '../../storage/database';

export interface EnvironmentBackgroundProps {
  preset: EnvironmentPreset;
  animated?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  alpha: number;
}

interface RainSplash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  wobbleSpeed: number;
  opacity: number;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  width: number;
  height: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  color: string;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

export const EnvironmentBackground: React.FC<EnvironmentBackgroundProps> = ({
  preset,
  animated = true,
  reducedMotion = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const isMotionDisabled = !animated || reducedMotion;

    // --- State Pools ---
    // Rain
    const rainDrops: RainDrop[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * (width + 200) - 100,
      y: Math.random() * height,
      speed: 16 + Math.random() * 8,
      length: 12 + Math.random() * 10,
      alpha: 0.35 + Math.random() * 0.35
    }));
    const splashes: RainSplash[] = [];

    // Snow
    const snowflakes: Snowflake[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.3 ? 3 : Math.random() < 0.7 ? 2 : 1,
      speed: 1.0 + Math.random() * 1.8,
      angle: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.015 + Math.random() * 0.02,
      opacity: 0.5 + Math.random() * 0.5
    }));

    // Day Clouds
    const clouds: Cloud[] = [
      { x: width * 0.05, y: 35, speed: 0.15, width: 140, height: 32 },
      { x: width * 0.45, y: 70, speed: 0.22, width: 180, height: 40 },
      { x: width * 0.75, y: 25, speed: 0.18, width: 120, height: 28 },
      { x: width * 0.25, y: 110, speed: 0.12, width: 160, height: 36 }
    ];

    // Day Pollen
    const pollen = Array.from({ length: 16 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0.2 + Math.random() * 0.4,
      vy: -0.2 - Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    }));

    // Night Stars
    const starColors = ['#ffffff', '#e2ebfc', '#fffee8', '#d0e0ff'];
    const stars: Star[] = Array.from({ length: 100 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.65),
      size: Math.random() < 0.25 ? 2 : 1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.04,
      color: starColors[Math.floor(Math.random() * starColors.length)]
    }));

    // Night Fireflies
    const fireflies: Firefly[] = Array.from({ length: 16 }, () => ({
      x: Math.random() * width,
      y: height * 0.45 + Math.random() * (height * 0.5),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
      size: Math.random() < 0.35 ? 3 : 2
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      if (preset === 'rain') {
        // --- Minecraft Rain ---
        ctx.strokeStyle = 'rgba(165, 205, 245, 0.45)';
        ctx.lineWidth = 1.5;
        const angleDx = -3;

        for (let i = 0; i < rainDrops.length; i++) {
          const d = rainDrops[i];
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + angleDx, d.y + d.length);
          ctx.stroke();

          if (!isMotionDisabled) {
            d.y += d.speed;
            d.x += angleDx * (d.speed / 18);

            // Trigger ground splash
            if (d.y >= height - 25) {
              if (splashes.length < 35 && Math.random() < 0.35) {
                splashes.push({
                  x: d.x,
                  y: height - 15 + Math.random() * 10,
                  vx: (Math.random() - 0.5) * 2.2,
                  vy: -1.2 - Math.random() * 1.6,
                  life: 0,
                  maxLife: 6 + Math.floor(Math.random() * 4)
                });
              }
              d.y = -20;
              d.x = Math.random() * (width + 200) - 100;
            }
          }
        }

        // Render Splashes
        if (!isMotionDisabled) {
          ctx.fillStyle = 'rgba(190, 220, 255, 0.6)';
          for (let i = splashes.length - 1; i >= 0; i--) {
            const s = splashes[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.35; // gravity
            s.life++;

            ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);

            if (s.life >= s.maxLife) {
              splashes.splice(i, 1);
            }
          }
        }
      } else if (preset === 'snow') {
        // --- Minecraft Snow ---
        for (let i = 0; i < snowflakes.length; i++) {
          const s = snowflakes[i];
          ctx.fillStyle = `rgba(245, 250, 255, ${s.opacity})`;
          ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);

          if (!isMotionDisabled) {
            s.y += s.speed;
            s.angle += s.wobbleSpeed;
            s.x += Math.sin(s.angle) * 0.8;

            if (s.y > height) {
              s.y = -6;
              s.x = Math.random() * width;
            }
            if (s.x < 0) s.x = width;
            if (s.x > width) s.x = 0;
          }
        }
      } else if (preset === 'clear') {
        // --- Minecraft Day Clouds & Pollen ---
        // Blocky Clouds
        for (let i = 0; i < clouds.length; i++) {
          const c = clouds[i];
          const cx = Math.floor(c.x);
          const cy = Math.floor(c.y);

          // Top highlight block
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.fillRect(cx, cy, c.width, c.height * 0.7);
          ctx.fillRect(cx + 15, cy - 8, c.width * 0.65, 8);

          // Bottom shadow block
          ctx.fillStyle = 'rgba(195, 215, 238, 0.65)';
          ctx.fillRect(cx, cy + Math.floor(c.height * 0.7), c.width, c.height * 0.3);

          if (!isMotionDisabled) {
            c.x += c.speed;
            if (c.x > width + 50) {
              c.x = -c.width - 50;
            }
          }
        }

        // Summer Pollen Motes
        ctx.fillStyle = 'rgba(255, 245, 180, 0.55)';
        for (let i = 0; i < pollen.length; i++) {
          const p = pollen[i];
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);

          if (!isMotionDisabled) {
            p.phase += 0.03;
            p.x += p.vx + Math.sin(p.phase) * 0.3;
            p.y += p.vy;

            if (p.y < 0) p.y = height + 10;
            if (p.x > width) p.x = 0;
          }
        }
      } else if (preset === 'night') {
        // --- Minecraft Night Stars & Fireflies ---
        // Twinkling Pixel Stars
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const alpha = isMotionDisabled
            ? 0.75
            : 0.3 + 0.65 * Math.abs(Math.sin(frame * s.speed + s.phase));
          ctx.fillStyle = s.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
        }
        ctx.globalAlpha = 1.0;

        // Ambient Warm Fireflies
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          const pulse = isMotionDisabled
            ? 0.8
            : 0.4 + 0.6 * Math.sin(frame * 0.05 + f.phase);
          ctx.fillStyle = `rgba(255, 235, 110, ${pulse})`;
          ctx.fillRect(Math.floor(f.x), Math.floor(f.y), f.size, f.size);

          // Subtle warm glow halo around firefly
          ctx.fillStyle = `rgba(255, 210, 60, ${pulse * 0.25})`;
          ctx.fillRect(Math.floor(f.x) - 1, Math.floor(f.y) - 1, f.size + 2, f.size + 2);

          if (!isMotionDisabled) {
            f.x += f.vx + Math.sin(frame * 0.02 + f.phase) * 0.4;
            f.y += f.vy + Math.cos(frame * 0.02 + f.phase) * 0.3;

            if (f.x < 0) f.x = width;
            if (f.x > width) f.x = 0;
            if (f.y < height * 0.35) f.y = height * 0.85;
            if (f.y > height) f.y = height * 0.4;
          }
        }
      }

      if (!isMotionDisabled && !document.hidden) {
        animId = requestAnimationFrame(render);
      }
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
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [preset, animated, reducedMotion]);

  const skyClass =
    preset === 'rain'
      ? styles.skyRain
      : preset === 'snow'
      ? styles.skySnow
      : preset === 'night'
      ? styles.skyNight
      : styles.skyClear;

  const landscapeClass =
    preset === 'rain'
      ? styles.landscapeRain
      : preset === 'snow'
      ? styles.landscapeSnow
      : preset === 'night'
      ? styles.landscapeNight
      : styles.landscapeClear;

  const fogClass =
    preset === 'rain'
      ? styles.fogRain
      : preset === 'snow'
      ? styles.fogSnow
      : preset === 'night'
      ? styles.fogNight
      : styles.fogClear;

  return (
    <div className={`${styles.envContainer} ${skyClass} ${className}`} aria-hidden="true">
      {/* Landscape Backdrop */}
      <div className={`${styles.landscapeBackdrop} ${landscapeClass}`} />

      {/* Celestial Sun/Moon (For Clear & Night) */}
      <div className={styles.celestialContainer}>
        {preset === 'clear' && <div className={styles.minecraftSun} />}
        {preset === 'night' && (
          <div className={styles.minecraftMoon}>
            <div className={styles.moonCrater1} />
            <div className={styles.moonCrater2} />
            <div className={styles.moonCrater3} />
          </div>
        )}
      </div>

      {/* Particle Canvas Layer */}
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      {/* Atmospheric Vignette & Fog Layer */}
      <div className={`${styles.fogOverlay} ${fogClass}`} />
    </div>
  );
};
