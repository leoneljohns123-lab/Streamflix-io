import { useCallback, useEffect, useState } from 'react';
import { supabase, type WatchHistoryEntry, type WatchlistEntry } from './supabase';
import { useAuth } from './auth';
import {
  savePlayback,
  getAllContinueWatching,
  removePlayback,
  type SavedPlaybackState,
} from './playback-store';

function mapPlaybackToEntry(p: SavedPlaybackState): WatchHistoryEntry {
  return {
    id: `local_${p.mediaType}_${p.tmdbId}`,
    user_id: 'local_user',
    tmdb_id: p.tmdbId,
    media_type: p.mediaType,
    title: p.title,
    poster_path: p.posterPath ?? null,
    backdrop_path: p.backdropPath ?? null,
    season_number: p.season ?? (p.mediaType === 'tv' ? 1 : null),
    episode_number: p.episode ?? (p.mediaType === 'tv' ? 1 : null),
    episode_name: p.episodeName ?? null,
    runtime: p.duration ? Math.round(p.duration / 60) : null,
    position: p.position || 1,
    duration: p.duration || 100,
    completed: p.completed || false,
    updated_at: new Date(p.updatedAt).toISOString(),
    created_at: new Date(p.updatedAt).toISOString(),
  };
}

export function useWatchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    const localItems = getAllContinueWatching().map(mapPlaybackToEntry);

    if (!user) {
      setHistory(localItems);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('watch_history')
        .select('*')
        .order('updated_at', { ascending: false });

      const remoteEntries = ((data as WatchHistoryEntry[]) ?? []);
      // Merge remote and local without duplicate tmdb_id + media_type
      const seen = new Set<string>();
      const merged: WatchHistoryEntry[] = [];

      for (const entry of remoteEntries) {
        const key = `${entry.media_type}_${entry.tmdb_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(entry);
        }
      }

      for (const local of localItems) {
        const key = `${local.media_type}_${local.tmdb_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(local);
        }
      }

      setHistory(merged);
    } catch {
      setHistory(localItems);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();

    const handleUpdate = () => {
      fetchHistory();
    };

    window.addEventListener('streamflix_playback_updated', handleUpdate);
    return () => {
      window.removeEventListener('streamflix_playback_updated', handleUpdate);
    };
  }, [fetchHistory]);

  const upsertProgress = useCallback(
    async (entry: {
      tmdb_id: number;
      media_type: 'movie' | 'tv';
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
      season_number?: number | null;
      episode_number?: number | null;
      episode_name?: string | null;
      runtime?: number | null;
      position: number;
      duration?: number | null;
      completed?: boolean;
    }) => {
      // 1. Always save to local playback store for persistent resume
      savePlayback({
        tmdbId: entry.tmdb_id,
        mediaType: entry.media_type,
        title: entry.title,
        season: entry.season_number ?? (entry.media_type === 'tv' ? 1 : undefined),
        episode: entry.episode_number ?? (entry.media_type === 'tv' ? 1 : undefined),
        episodeName: entry.episode_name ?? undefined,
        position: entry.position,
        duration: entry.duration ?? (entry.runtime ? entry.runtime * 60 : 100),
        completed: entry.completed,
        posterPath: entry.poster_path,
        backdropPath: entry.backdrop_path,
      });

      // 2. Also save to Supabase if user is authenticated
      if (user) {
        try {
          const payload = {
            user_id: user.id,
            tmdb_id: entry.tmdb_id,
            media_type: entry.media_type,
            title: entry.title,
            poster_path: entry.poster_path,
            backdrop_path: entry.backdrop_path,
            season_number: entry.season_number ?? null,
            episode_number: entry.episode_number ?? null,
            episode_name: entry.episode_name ?? null,
            runtime: entry.runtime ?? null,
            position: entry.position,
            duration: entry.duration ?? null,
            completed: entry.completed ?? false,
            updated_at: new Date().toISOString(),
          };
          await supabase.from('watch_history').upsert(payload, {
            onConflict: 'watch_history_user_content_unique',
          });
        } catch {
          // ignore remote sync errors
        }
      }

      fetchHistory();
    },
    [user, fetchHistory],
  );

  const removeFromHistory = useCallback(
    async (id: string, tmdbId?: number, mediaType?: 'movie' | 'tv') => {
      // Remove from local playback store
      if (tmdbId && mediaType) {
        removePlayback(mediaType, tmdbId);
      } else {
        // Try extracting from id e.g. local_tv_1234
        const parts = id.split('_');
        if (parts.length >= 3 && (parts[1] === 'movie' || parts[1] === 'tv')) {
          removePlayback(parts[1] as 'movie' | 'tv', parseInt(parts[2], 10));
        }
      }

      if (user) {
        try {
          await supabase.from('watch_history').delete().eq('id', id);
        } catch {
          // ignore
        }
      }

      fetchHistory();
    },
    [user, fetchHistory],
  );

  const continueWatching = history.filter((h) => !h.completed && h.position > 0);

  return { history, loading, continueWatching, upsertProgress, removeFromHistory, refetch: fetchHistory };
}

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      try {
        const raw = localStorage.getItem('streamflix-guest-watchlist');
        setWatchlist(raw ? JSON.parse(raw) : []);
      } catch {
        setWatchlist([]);
      }
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('watchlist')
        .select('*')
        .order('created_at', { ascending: false });
      setWatchlist((data as WatchlistEntry[]) ?? []);
    } catch {
      setWatchlist([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const isInWatchlist = useCallback(
    (tmdbId: number, mediaType: string) =>
      watchlist.some((w) => w.tmdb_id === tmdbId && w.media_type === mediaType),
    [watchlist],
  );

  const toggleWatchlist = useCallback(
    async (entry: {
      tmdb_id: number;
      media_type: 'movie' | 'tv';
      title: string;
      poster_path: string | null;
      backdrop_path: string | null;
    }) => {
      if (!user) {
        try {
          const raw = localStorage.getItem('streamflix-guest-watchlist');
          const list: WatchlistEntry[] = raw ? JSON.parse(raw) : [];
          const existsIdx = list.findIndex(
            (w) => w.tmdb_id === entry.tmdb_id && w.media_type === entry.media_type
          );
          if (existsIdx >= 0) {
            list.splice(existsIdx, 1);
          } else {
            list.unshift({
              id: `guest_wl_${entry.media_type}_${entry.tmdb_id}`,
              user_id: 'guest',
              tmdb_id: entry.tmdb_id,
              media_type: entry.media_type,
              title: entry.title,
              poster_path: entry.poster_path,
              backdrop_path: entry.backdrop_path,
              created_at: new Date().toISOString(),
            });
          }
          localStorage.setItem('streamflix-guest-watchlist', JSON.stringify(list));
          setWatchlist(list);
        } catch {
          // ignore
        }
        return;
      }

      const existing = watchlist.find(
        (w) => w.tmdb_id === entry.tmdb_id && w.media_type === entry.media_type,
      );
      if (existing) {
        await supabase.from('watchlist').delete().eq('id', existing.id);
      } else {
        await supabase.from('watchlist').upsert(
          { user_id: user.id, ...entry },
          { onConflict: 'watchlist_user_content_unique' },
        );
      }
      fetchWatchlist();
    },
    [user, watchlist, fetchWatchlist],
  );

  return { watchlist, loading, isInWatchlist, toggleWatchlist, refetch: fetchWatchlist };
}
