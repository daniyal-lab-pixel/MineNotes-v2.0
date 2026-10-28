/**
 * MineNotes - Procedural Web Audio Sound Engine
 * Authentic Minecraft Book & Quill, UI click, and paper page turn sound effects.
 * Uses 100% original procedural synthesis with Web Audio API (no external/copyrighted assets).
 * High performance, zero memory leaks, voice limiting, and pitch randomization.
 */

export interface SoundConfig {
  soundEnabled: boolean; // Master toggle
  typingSoundEnabled: boolean;
  typingSoundVolume: number; // 0.0 - 1.0 (default: 0.12 ~ 12%)
  uiSoundEnabled: boolean;
  uiSoundVolume: number; // 0.0 - 1.0 (default: 0.25)
  pageTurnSoundEnabled: boolean;
  pageTurnSoundVolume: number; // 0.0 - 1.0 (default: 0.18)
}

let audioCtx: AudioContext | null = null;

const config: SoundConfig = {
  soundEnabled: true,
  typingSoundEnabled: true,
  typingSoundVolume: 0.12,
  uiSoundEnabled: true,
  uiSoundVolume: 0.25,
  pageTurnSoundEnabled: true,
  pageTurnSoundVolume: 0.18
};

// Throttle tracking for rapid typing to prevent audio voice overload
let lastTypingSoundTime = 0;
const MIN_TYPING_INTERVAL_MS = 40; // max ~25 sounds/sec

export function updateSoundConfig(updates: Partial<SoundConfig>) {
  Object.assign(config, updates);
}

export function getSoundConfig(): SoundConfig {
  return { ...config };
}

export function setSoundEnabled(enabled: boolean) {
  config.soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return config.soundEnabled;
}

/**
 * Lazily obtains and resumes the shared AudioContext after user interaction
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play authentic Minecraft Book & Quill writing tap.
 * Short (20ms), soft, blocky/paper texture with subtle pitch and volume variation.
 */
export function playTypingSound(variantMultiplier: number = 1.0) {
  if (!config.soundEnabled || !config.typingSoundEnabled) return;

  const now = performance.now();
  if (now - lastTypingSoundTime < MIN_TYPING_INTERVAL_MS) {
    return; // voice limiting throttle
  }
  lastTypingSoundTime = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Slight pitch randomization (±7%) to prevent robotic repetition
    const pitchVariation = 0.93 + Math.random() * 0.14;
    // Subtle volume variation (±8%)
    const volumeVariation = 0.92 + Math.random() * 0.16;
    const effectiveVolume = config.typingSoundVolume * variantMultiplier * volumeVariation;

    // 1. Transient click (soft triangle blip dropping fast)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    const startFreq = 540 * pitchVariation;
    const endFreq = 220 * pitchVariation;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + 0.022);

    oscGain.gain.setValueAtTime(effectiveVolume * 0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.025);

    // 2. Micro paper friction tap (filtered white noise burst for quill/paper texture)
    const noiseLen = Math.floor(ctx.sampleRate * 0.015); // 15ms buffer
    const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.25));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2100 * pitchVariation, t);
    noiseFilter.Q.setValueAtTime(2.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(effectiveVolume * 0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 0.02);
  } catch {
    // Graceful fallback
  }
}

/**
 * Play authentic Minecraft button click
 */
export function playButtonClick(pitch: number = 1.0) {
  if (!config.soundEnabled || !config.uiSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(300 * pitch, t + 0.035);

    gain.gain.setValueAtTime(config.uiSoundVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  } catch {
    // Graceful fallback
  }
}

/**
 * Play authentic book page turn sound (soft paper rustle)
 */
export function playPageTurnSound() {
  if (!config.soundEnabled || !config.pageTurnSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(config.pageTurnSoundVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.085);
  } catch {
    // Ignore audio errors
  }
}

/**
 * Play subtle book open / close sound
 */
export function playBookOpenSound() {
  if (!config.soundEnabled || !config.pageTurnSoundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.05);

    gain.gain.setValueAtTime(config.pageTurnSoundVolume * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);
  } catch {
    // Ignore
  }
}

export function playBookCloseSound() {
  playBookOpenSound();
}

/**
 * Procedural Environmental Ambience Audio
 */
let ambienceGain: GainNode | null = null;
let ambienceSource: AudioNode | null = null;
let currentAmbiencePreset: string | null = null;

export function stopAmbienceAudio() {
  if (ambienceGain) {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, ctx.currentTime);
        ambienceGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      }
    } catch {
      // ignore
    }
  }
  setTimeout(() => {
    try {
      if (
        ambienceSource &&
        'stop' in ambienceSource &&
        typeof (ambienceSource as AudioScheduledSourceNode).stop === 'function'
      ) {
        (ambienceSource as AudioScheduledSourceNode).stop();
      }
    } catch {
      // ignore
    }
    ambienceGain = null;
    ambienceSource = null;
    currentAmbiencePreset = null;
  }, 350);
}

export function startAmbienceAudio(preset: string) {
  if (!config.soundEnabled) return;
  if (currentAmbiencePreset === preset && ambienceGain) return;

  stopAmbienceAudio();

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    currentAmbiencePreset = preset;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02; // brown noise
      data[i] = lastOut * 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (preset === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.value = 550;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.8);
    } else if (preset === 'snow') {
      filter.type = 'bandpass';
      filter.frequency.value = 320;
      filter.Q.value = 1.2;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 0.8);
    } else if (preset === 'night') {
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.8);
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.8);
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    ambienceSource = noise;
    ambienceGain = gain;
  } catch {
    // Graceful fallback
  }
}
