// Persistent playback tracking and exact minute & second resume management
// Ensures users always continue movies and TV series exactly where they left off across refreshes and relaunches

export interface SavedPlaybackState {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  position: number; // Exact elapsed playback position in seconds (e.g. 872 = 14m 32s)
  duration: number; // Total duration in seconds
  completed: boolean;
  posterPath?: string | null;
  backdropPath?: string | null;
  updatedAt: number; // Unix timestamp ms
}

const PLAYBACK_STORE_KEY = 'streamflix_playback_state_v2';
const PLAYBACK_EVENT_NAME = 'streamflix_playback_updated';

function getStorage(): Record<string, SavedPlaybackState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PLAYBACK_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[playback-store] Failed to read playback storage', err);
    return {};
  }
}

function setStorage(data: Record<string, SavedPlaybackState>, silent = false): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYBACK_STORE_KEY, JSON.stringify(data));
    if (!silent) {
      window.dispatchEvent(new CustomEvent(PLAYBACK_EVENT_NAME));
    }
  } catch (err) {
    console.warn('[playback-store] Failed to write playback storage', err);
  }
}

export function makePlaybackKey(mediaType: 'movie' | 'tv', tmdbId: number): string {
  return `${mediaType}_${tmdbId}`;
}

/**
 * Retrieve saved progress for a movie or TV series.
 */
export function getPlayback(mediaType: 'movie' | 'tv', tmdbId: number): SavedPlaybackState | null {
  const store = getStorage();
  const key = makePlaybackKey(mediaType, tmdbId);
  return store[key] || null;
}

/**
 * Save or update playback progress with exact minute and second precision.
 */
export function savePlayback(update: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title?: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  position?: number;
  duration?: number;
  completed?: boolean;
  posterPath?: string | null;
  backdropPath?: string | null;
  silent?: boolean;
}): SavedPlaybackState {
  const store = getStorage();
  const key = makePlaybackKey(update.mediaType, update.tmdbId);
  const existing = store[key];

  const now = Date.now();
  let exactPosition = existing?.position ?? 0;
  if (typeof update.position === 'number' && !isNaN(update.position)) {
    exactPosition = Math.max(0, Math.floor(update.position));
  }

  const newState: SavedPlaybackState = {
    tmdbId: update.tmdbId,
    mediaType: update.mediaType,
    title: update.title || existing?.title || 'Featured Title',
    season: update.season ?? existing?.season ?? 1,
    episode: update.episode ?? existing?.episode ?? 1,
    episodeName: update.episodeName || existing?.episodeName,
    position: exactPosition,
    duration: update.duration !== undefined ? Math.floor(update.duration) : (existing?.duration ?? 0),
    completed: update.completed !== undefined ? update.completed : (existing?.completed ?? false),
    posterPath: update.posterPath !== undefined ? update.posterPath : existing?.posterPath,
    backdropPath: update.backdropPath !== undefined ? update.backdropPath : existing?.backdropPath,
    updatedAt: now,
  };

  store[key] = newState;
  setStorage(store, update.silent ?? false);
  return newState;
}

/**
 * Get all active in-progress items for Continue Watching.
 */
export function getAllContinueWatching(): SavedPlaybackState[] {
  const store = getStorage();
  return Object.values(store)
    .filter((item) => !item.completed && item.position > 5)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Remove an item from playback history.
 */
export function removePlayback(mediaType: 'movie' | 'tv', tmdbId: number): void {
  const store = getStorage();
  const key = makePlaybackKey(mediaType, tmdbId);
  if (store[key]) {
    delete store[key];
    setStorage(store);
  }
}

/**
 * Split raw seconds into exact hours, minutes, seconds breakdown.
 */
export function splitSecondsToTime(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  displayVerbose: string;
} {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) {
    return { hours: 0, minutes: 0, seconds: 0, formatted: '0:00', displayVerbose: '0 min 0 sec' };
  }
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const formatted =
    hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const verboseParts: string[] = [];
  if (hours > 0) verboseParts.push(`${hours} hr`);
  if (minutes > 0 || hours > 0) verboseParts.push(`${minutes} min`);
  verboseParts.push(`${seconds} sec`);

  return {
    hours,
    minutes,
    seconds,
    formatted,
    displayVerbose: verboseParts.join(' '),
  };
}

/**
 * Format playback seconds to readable "H:MM:SS" or "MM:SS".
 */
export function formatPlaybackTime(seconds: number): string {
  return splitSecondsToTime(seconds).formatted;
}

/**
 * Format playback seconds to verbose format e.g. "14 min 32 sec" or "1 hr 5 min 42 sec".
 */
export function formatPlaybackVerbose(seconds: number): string {
  return splitSecondsToTime(seconds).displayVerbose;
}

/**
 * Parse flexible user input strings like "14:32", "1:25:10", "14m 32s", or raw seconds into integer seconds.
 */
export function parseTimeToSeconds(input: string): number | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();

  // Pattern: "H:MM:SS" or "MM:SS"
  if (clean.includes(':')) {
    const parts = clean.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p) || p < 0)) return null;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return null;
  }

  // Pattern: "14m 32s", "14m", "32s", "1h 20m 10s"
  let total = 0;
  let matched = false;
  const hMatch = clean.match(/(\d+)\s*(?:h|hr|hour|hours)/);
  if (hMatch) {
    total += parseInt(hMatch[1], 10) * 3600;
    matched = true;
  }
  const mMatch = clean.match(/(\d+)\s*(?:m|min|minute|minutes)/);
  if (mMatch) {
    total += parseInt(mMatch[1], 10) * 60;
    matched = true;
  }
  const sMatch = clean.match(/(\d+)\s*(?:s|sec|second|seconds)/);
  if (sMatch) {
    total += parseInt(sMatch[1], 10);
    matched = true;
  }
  if (matched) return total;

  // Pure integer seconds
  const numeric = parseInt(clean, 10);
  return !isNaN(numeric) && numeric >= 0 ? numeric : null;
}
