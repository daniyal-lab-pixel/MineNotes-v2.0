import React, { useState, useRef, useEffect } from 'react';
import styles from './EnvironmentSelector.module.css';
import { PixelIcon } from '../../../components/PixelIcon/PixelIcon';
import { type EnvironmentPreset } from '../../../storage/database';
import { playButtonClick } from '../../../utils/sound';

export interface EnvironmentSelectorProps {
  currentPreset: EnvironmentPreset;
  animated: boolean;
  onPresetChange: (preset: EnvironmentPreset) => void;
  onToggleAnimated: () => void;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  currentPreset,
  animated,
  onPresetChange,
  onToggleAnimated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeIcon =
    currentPreset === 'rain'
      ? 'rain'
      : currentPreset === 'snow'
      ? 'snow'
      : currentPreset === 'night'
      ? 'moon'
      : 'sun';

  const presets: { id: EnvironmentPreset; label: string; icon: 'sun' | 'rain' | 'snow' | 'moon' }[] = [
    { id: 'clear', label: 'Clear / Day', icon: 'sun' },
    { id: 'rain', label: 'Rain Ambience', icon: 'rain' },
    { id: 'snow', label: 'Snow Biome', icon: 'snow' },
    { id: 'night', label: 'Night Sky', icon: 'moon' }
  ];

  return (
    <div className={styles.selectorWrapper} ref={containerRef}>
      {/* Top HUD Recessed Slot Button */}
      <button
        type="button"
        className={styles.triggerButton}
        onClick={() => {
          playButtonClick();
          setIsOpen(!isOpen);
        }}
        title={`Environment Atmosphere: ${currentPreset.toUpperCase()}`}
        aria-label="Toggle Environment Atmosphere"
      >
        <PixelIcon name={activeIcon} size={16} />
      </button>

      {/* Minecraft-Style Popover Panel */}
      {isOpen && (
        <div className={styles.popoverPanel}>
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>Atmosphere</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className={styles.presetList}>
            {presets.map(item => {
              const isActive = currentPreset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ''}`}
                  onClick={() => {
                    playButtonClick();
                    onPresetChange(item.id);
                  }}
                >
                  <PixelIcon name={item.icon} size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.animToggleRow}>
            <span className={styles.animLabel}>Animation</span>
            <button
              type="button"
              className={`${styles.toggleBtn} ${animated ? styles.toggleBtnActive : ''}`}
              onClick={() => {
                playButtonClick();
                onToggleAnimated();
              }}
            >
              {animated ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
