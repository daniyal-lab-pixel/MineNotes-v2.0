/**
 * MineNotes - YouTube URL Validator and Identifier Extractor
 * Strictly validates official YouTube hostnames, extracts canonical 11-char video IDs
 * and playlist IDs, and rejects malicious or unsupported URL schemes.
 */

export type YouTubeLinkType = 'video' | 'playlist' | 'video_and_playlist' | 'invalid';

export interface YouTubeParseResult {
  isValid: boolean;
  type: YouTubeLinkType;
  videoId?: string;
  playlistId?: string;
  cleanUrl?: string;
  error?: string;
}

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'gaming.youtube.com'
]);

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]{10,64}$/;

/**
 * Validates and extracts identifiers from a user-supplied YouTube link
 */
export function parseYouTubeUrl(input: string): YouTubeParseResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Please enter a valid YouTube URL.'
    };
  }

  const trimmed = input.trim();

  // If user pasted raw 11-char video ID
  if (VIDEO_ID_REGEX.test(trimmed)) {
    return {
      isValid: true,
      type: 'video',
      videoId: trimmed,
      cleanUrl: `https://www.youtube.com/watch?v=${trimmed}`
    };
  }

  // Reject unsupported schemes early
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Unsupported URL scheme. Please paste a standard YouTube link.'
    };
  }

  let parsed: URL;
  try {
    // If missing protocol, prepend https://
    const urlToParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(urlToParse);
  } catch {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Invalid URL format. Check the link and try again.'
    };
  }

  // Check scheme
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Only standard web URLs (http/https) are accepted.'
    };
  }

  // Normalize host
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Only official YouTube links (youtube.com, youtu.be, music.youtube.com) are supported.'
    };
  }

  let extractedVideoId: string | undefined;
  let extractedPlaylistId: string | undefined;

  // 1. youtu.be/VIDEO_ID
  if (host === 'youtu.be') {
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      extractedVideoId = pathParts[0];
    }
    const listParam = parsed.searchParams.get('list');
    if (listParam) {
      extractedPlaylistId = listParam;
    }
  } else {
    // 2. youtube.com/watch?v=VIDEO_ID (&list=PLAYLIST_ID)
    const vParam = parsed.searchParams.get('v');
    if (vParam) {
      extractedVideoId = vParam;
    }

    // 3. youtube.com/embed/VIDEO_ID
    if (!extractedVideoId && parsed.pathname.startsWith('/embed/')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        extractedVideoId = parts[1];
      }
    }

    // 4. youtube.com/shorts/VIDEO_ID
    if (!extractedVideoId && parsed.pathname.startsWith('/shorts/')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        extractedVideoId = parts[1];
      }
    }

    // Playlist parameter (can be standalone playlist or associated with video)
    const listParam = parsed.searchParams.get('list');
    if (listParam) {
      extractedPlaylistId = listParam;
    }
  }

  // Validate extracted video ID
  if (extractedVideoId && !VIDEO_ID_REGEX.test(extractedVideoId)) {
    extractedVideoId = undefined;
  }

  // Validate extracted playlist ID
  if (extractedPlaylistId && !PLAYLIST_ID_REGEX.test(extractedPlaylistId)) {
    extractedPlaylistId = undefined;
  }

  if (extractedVideoId && extractedPlaylistId) {
    return {
      isValid: true,
      type: 'video_and_playlist',
      videoId: extractedVideoId,
      playlistId: extractedPlaylistId,
      cleanUrl: `https://www.youtube.com/watch?v=${extractedVideoId}&list=${extractedPlaylistId}`
    };
  }

  if (extractedVideoId) {
    return {
      isValid: true,
      type: 'video',
      videoId: extractedVideoId,
      cleanUrl: `https://www.youtube.com/watch?v=${extractedVideoId}`
    };
  }

  if (extractedPlaylistId) {
    return {
      isValid: true,
      type: 'playlist',
      playlistId: extractedPlaylistId,
      cleanUrl: `https://www.youtube.com/playlist?list=${extractedPlaylistId}`
    };
  }

  return {
    isValid: false,
    type: 'invalid',
    error: 'Could not find a valid YouTube video ID or playlist ID in that link.'
  };
}
