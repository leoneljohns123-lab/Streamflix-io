import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  typeof supabaseAnonKey === 'string'
);

function createMockSupabaseClient() {
  const STORAGE_KEY_AUTH = 'streamflix-mock-auth-session';
  const STORAGE_KEY_HISTORY = 'streamflix-mock-watch-history';
  const STORAGE_KEY_WATCHLIST = 'streamflix-mock-watchlist';

  const authListeners: Array<(event: string, session: any) => void> = [];

  const getStoredSession = () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const setStoredSession = (session: any) => {
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH);
      }
    } catch {
      // ignore
    }
  };

  const getTableData = (table: string): any[] => {
    if (typeof window === 'undefined') return [];
    const key = table === 'watch_history' ? STORAGE_KEY_HISTORY : STORAGE_KEY_WATCHLIST;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const setTableData = (table: string, data: any[]) => {
    if (typeof window === 'undefined') return;
    const key = table === 'watch_history' ? STORAGE_KEY_HISTORY : STORAGE_KEY_WATCHLIST;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  return {
    auth: {
      async getSession() {
        return { data: { session: getStoredSession() }, error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        authListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authListeners.indexOf(callback);
                if (idx > -1) authListeners.splice(idx, 1);
              },
            },
          },
        };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        const session = {
          user: {
            id: 'user_' + btoa(email).replace(/=/g, '').slice(0, 12),
            email,
          },
          access_token: 'mock_token_' + Date.now(),
        };
        setStoredSession(session);
        authListeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user: session.user, session }, error: null };
      },
      async signUp({ email }: { email: string; password?: string }) {
        const session = {
          user: {
            id: 'user_' + btoa(email).replace(/=/g, '').slice(0, 12),
            email,
          },
          access_token: 'mock_token_' + Date.now(),
        };
        setStoredSession(session);
        authListeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user: session.user, session }, error: null };
      },
      async signOut() {
        setStoredSession(null);
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
    },
    from(table: string) {
      return {
        select(_cols = '*') {
          return {
            order(col: string, { ascending = true }: { ascending?: boolean } = {}) {
              const rows = [...getTableData(table)];
              rows.sort((a, b) => {
                if (a[col] < b[col]) return ascending ? -1 : 1;
                if (a[col] > b[col]) return ascending ? 1 : -1;
                return 0;
              });
              return Promise.resolve({ data: rows, error: null });
            },
            then(resolve: any) {
              const rows = getTableData(table);
              return Promise.resolve({ data: rows, error: null }).then(resolve);
            },
          };
        },
        async upsert(payload: any, options?: { onConflict?: string }) {
          const list = getTableData(table);
          const item = { ...payload };
          if (!item.id) {
            item.id = 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          }
          if (!item.created_at) {
            item.created_at = new Date().toISOString();
          }

          let existingIdx = -1;
          if (options?.onConflict === 'watch_history_user_content_unique') {
            existingIdx = list.findIndex(
              (x) =>
                x.user_id === item.user_id &&
                x.tmdb_id === item.tmdb_id &&
                x.media_type === item.media_type &&
                x.season_number === item.season_number &&
                x.episode_number === item.episode_number
            );
          } else if (options?.onConflict === 'watchlist_user_content_unique') {
            existingIdx = list.findIndex(
              (x) =>
                x.user_id === item.user_id &&
                x.tmdb_id === item.tmdb_id &&
                x.media_type === item.media_type
            );
          } else if (item.id) {
            existingIdx = list.findIndex((x) => x.id === item.id);
          }

          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...item };
          } else {
            list.unshift(item);
          }
          setTableData(table, list);
          return { data: item, error: null };
        },
        delete() {
          return {
            async eq(col: string, val: any) {
              const list = getTableData(table).filter((x) => x[col] !== val);
              setTableData(table, list);
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };
}

export const supabase: any = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'streamflix-auth',
        debug: false,
      },
    })
  : createMockSupabaseClient();

export type WatchHistoryEntry = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  season_number: number | null;
  episode_number: number | null;
  episode_name: string | null;
  runtime: number | null;
  position: number;
  duration: number | null;
  completed: boolean;
  updated_at: string;
  created_at: string;
};

export type WatchlistEntry = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  created_at: string;
};
