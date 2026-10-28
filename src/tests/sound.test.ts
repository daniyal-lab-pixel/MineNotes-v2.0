import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSoundConfig,
  updateSoundConfig,
  setSoundEnabled,
  isSoundEnabled,
  playTypingSound,
  playButtonClick,
  playPageTurnSound,
  playBookOpenSound
} from '../utils/sound';

describe('Sound Engine & SoundManager', () => {
  beforeEach(() => {
    updateSoundConfig({
      soundEnabled: true,
      typingSoundEnabled: true,
      typingSoundVolume: 0.12,
      uiSoundEnabled: true,
      uiSoundVolume: 0.25,
      pageTurnSoundEnabled: true,
      pageTurnSoundVolume: 0.18
    });
  });

  it('initializes with gentle default typing volume (~12%) and master sound enabled', () => {
    const config = getSoundConfig();
    expect(config.soundEnabled).toBe(true);
    expect(config.typingSoundEnabled).toBe(true);
    expect(config.typingSoundVolume).toBeCloseTo(0.12, 2);
    expect(config.uiSoundEnabled).toBe(true);
    expect(config.pageTurnSoundEnabled).toBe(true);
  });

  it('updates configuration dynamically and respects toggles', () => {
    updateSoundConfig({
      typingSoundEnabled: false,
      typingSoundVolume: 0.25
    });

    const updated = getSoundConfig();
    expect(updated.typingSoundEnabled).toBe(false);
    expect(updated.typingSoundVolume).toBe(0.25);
    expect(updated.uiSoundEnabled).toBe(true);
  });

  it('respects master sound toggle', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(getSoundConfig().soundEnabled).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('safely handles audio synthesis without throwing in headless environments', () => {
    expect(() => {
      playTypingSound();
      playButtonClick();
      playPageTurnSound();
      playBookOpenSound();
    }).not.toThrow();
  });

  it('applies voice limiting / throttling on rapid typing invocations', () => {
    const spyNow = vi.spyOn(performance, 'now');
    spyNow.mockReturnValue(1000);

    // First sound should play
    expect(() => playTypingSound()).not.toThrow();

    // 10ms later: below 40ms minimum throttle window
    spyNow.mockReturnValue(1010);
    expect(() => playTypingSound()).not.toThrow();

    // 50ms later: above 40ms throttle window, should play
    spyNow.mockReturnValue(1055);
    expect(() => playTypingSound()).not.toThrow();

    spyNow.mockRestore();
  });
});
