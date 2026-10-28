import { describe, it, expect, beforeEach } from 'vitest';
import { jukeboxController } from '../features/jukebox/jukeboxController';
import { C418_PLAYLIST } from '../features/jukebox/trackCatalog';

describe('Persistent YouTube Jukebox Controller', () => {
  beforeEach(() => {
    jukeboxController.close();
  });

  it('starts in closed display mode with valid default C418 playlist track', () => {
    const state = jukeboxController.getState();
    expect(state.displayMode).toBe('closed');
    expect(state.currentTrack).toBeDefined();
    expect(state.currentTrack.videoId).toBeTruthy();
    expect(C418_PLAYLIST.some(t => t.id === state.currentTrack.id)).toBe(true);
  });

  it('transitions from closed to expanded mode on openExpanded()', () => {
    jukeboxController.openExpanded();
    expect(jukeboxController.getState().displayMode).toBe('expanded');
  });

  it('minimizes to compact mode while preserving playing state', () => {
    jukeboxController.openExpanded();
    expect(jukeboxController.getState().displayMode).toBe('expanded');

    // Minimize should switch to compact mode without resetting player
    jukeboxController.minimize();
    expect(jukeboxController.getState().displayMode).toBe('compact');
  });

  it('restores back to expanded mode from compact mode', () => {
    jukeboxController.minimize();
    expect(jukeboxController.getState().displayMode).toBe('compact');

    jukeboxController.openExpanded();
    expect(jukeboxController.getState().displayMode).toBe('expanded');
  });

  it('pauses playback and sets displayMode to closed on close()', () => {
    jukeboxController.openExpanded();
    jukeboxController.close();
    const state = jukeboxController.getState();
    expect(state.displayMode).toBe('closed');
    expect(state.status).toBe('paused');
  });

  it('correctly updates volume and mute state', () => {
    jukeboxController.setVolume(45);
    expect(jukeboxController.getState().volume).toBe(45);
    expect(jukeboxController.getState().isMuted).toBe(false);

    jukeboxController.toggleMute();
    expect(jukeboxController.getState().isMuted).toBe(true);

    jukeboxController.toggleMute();
    expect(jukeboxController.getState().isMuted).toBe(false);
  });

  it('cycles through C418 playlist with nextTrack and prevTrack', () => {
    const firstTrack = jukeboxController.getState().currentTrack;
    jukeboxController.nextTrack(false);
    const nextTrack = jukeboxController.getState().currentTrack;
    expect(nextTrack.id).not.toBe(firstTrack.id);

    jukeboxController.prevTrack(false);
    expect(jukeboxController.getState().currentTrack.id).toBe(firstTrack.id);
  });

  it('accurately identifies embedding_disabled tracks when reported by player and marks status as error without false ready state', () => {
    // Select track 'subwoofer-lullaby'
    jukeboxController.selectTrack('subwoofer-lullaby', false);
    // Simulate YouTube player reporting Error 150
    jukeboxController.handlePlayerError(150);
    const state = jukeboxController.getState();
    expect(state.currentTrack.id).toBe('subwoofer-lullaby');
    expect(state.trackStatuses['subwoofer-lullaby']).toBe('embedding_disabled');
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('Owner has disabled embedding for this video.');
    expect(state.errorCode).toBe(150);
  });

  it('toggles skipUnavailable preference and persists state', () => {
    const initialSkip = jukeboxController.getState().skipUnavailable;
    jukeboxController.toggleSkipUnavailable();
    expect(jukeboxController.getState().skipUnavailable).toBe(!initialSkip);
    jukeboxController.toggleSkipUnavailable();
    expect(jukeboxController.getState().skipUnavailable).toBe(initialSkip);
  });

  it('getNextPlayableTrack skips embedding_disabled tracks when skipUnavailable is enabled', () => {
    // Ensure skipUnavailable is true
    if (!jukeboxController.getState().skipUnavailable) {
      jukeboxController.toggleSkipUnavailable();
    }
    // Simulate player having marked subwoofer-lullaby as embedding_disabled
    jukeboxController.selectTrack('subwoofer-lullaby', false);
    jukeboxController.handlePlayerError(150);

    jukeboxController.selectTrack('sweden', false);
    const nextPlayable = jukeboxController.getNextPlayableTrack(1);
    expect(nextPlayable.id).not.toBe('subwoofer-lullaby');
  });

  it('getNextPlayableTrack returns immediate adjacent track when skipUnavailable is disabled', () => {
    if (jukeboxController.getState().skipUnavailable) {
      jukeboxController.toggleSkipUnavailable();
    }
    jukeboxController.selectTrack('sweden', false);
    const nextTrack = jukeboxController.getNextPlayableTrack(1);
    expect(nextTrack.id).toBe('subwoofer-lullaby');
    // Restore
    jukeboxController.toggleSkipUnavailable();
  });
});
