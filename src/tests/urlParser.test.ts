import { describe, it, expect } from 'vitest';
import { parseYouTubeUrl } from '../features/jukebox/urlParser';

describe('YouTube URL Parser & Validator', () => {
  it('parses standard desktop watch URLs', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('video');
    expect(res.videoId).toBe('dQw4w9WgXcQ');
    expect(res.playlistId).toBeUndefined();
  });

  it('parses short youtu.be URLs', () => {
    const res = parseYouTubeUrl('https://youtu.be/LFkIWS0njCc');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('video');
    expect(res.videoId).toBe('LFkIWS0njCc');
  });

  it('parses YouTube Music links', () => {
    const res = parseYouTubeUrl('https://music.youtube.com/watch?v=sgrs4l9BqD8');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('video');
    expect(res.videoId).toBe('sgrs4l9BqD8');
  });

  it('parses standalone playlist links', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/playlist?list=PLnN3NiQZ44TqUnqLZvGM_k5G6IAxcxwtg');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('playlist');
    expect(res.playlistId).toBe('PLnN3NiQZ44TqUnqLZvGM_k5G6IAxcxwtg');
    expect(res.videoId).toBeUndefined();
  });

  it('identifies links containing both video ID and playlist ID', () => {
    const res = parseYouTubeUrl('https://www.youtube.com/watch?v=laZusNy8QiY&list=PLnN3NiQZ44TqUnqLZvGM_k5G6IAxcxwtg');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('video_and_playlist');
    expect(res.videoId).toBe('laZusNy8QiY');
    expect(res.playlistId).toBe('PLnN3NiQZ44TqUnqLZvGM_k5G6IAxcxwtg');
  });

  it('handles raw 11-char video ID input', () => {
    const res = parseYouTubeUrl('eMGRt0A9Yns');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('video');
    expect(res.videoId).toBe('eMGRt0A9Yns');
  });

  it('rejects unsupported domains', () => {
    const res = parseYouTubeUrl('https://vimeo.com/12345678');
    expect(res.isValid).toBe(false);
    expect(res.type).toBe('invalid');
    expect(res.error).toContain('Only official YouTube links');
  });

  it('rejects malicious or javascript schemes', () => {
    const res = parseYouTubeUrl('javascript:alert(1)');
    expect(res.isValid).toBe(false);
    expect(res.type).toBe('invalid');
  });

  it('rejects malformed URLs', () => {
    const res = parseYouTubeUrl('not a url');
    expect(res.isValid).toBe(false);
    expect(res.type).toBe('invalid');
  });
});
