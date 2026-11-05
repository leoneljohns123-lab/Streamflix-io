import { useWatchHistory, useWatchlist } from '@/lib/hooks';
import { imageUrl, backdropUrl } from '@/lib/tmdb-config';
import { PosterCard, SkeletonGrid } from '@/components/Cards';
import { Play, Trash2, History, Bell, Sparkles, Check, RotateCw, Send } from 'lucide-react';
import { navigate } from '@/lib/router';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { useAuth } from '@/lib/auth';
import { formatPlaybackTime } from '@/lib/playback-store';
import { useSeasonNotifications } from '@/lib/notifications';
import { useState } from 'react';

export function MyListPage() {
  const { watchlist, loading } = useWatchlist();
  const { user } = useAuth();
  const {
    permission,
    requestPermission,
    scanWatchlist,
    isScanning,
    sendTestNotification,
    settings,
    updateSettings,
  } = useSeasonNotifications();
  const [testSent, setTestSent] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const tvShowsCount = watchlist.filter((w) => w.media_type === 'tv').length;

  const handleManualScan = async () => {
    setScanMessage(null);
    const newAlerts = await scanWatchlist(watchlist, { forceNotifyLatest: false });
    if (newAlerts && newAlerts.length > 0) {
      setScanMessage(`Found ${newAlerts.length} new season release${newAlerts.length > 1 ? 's' : ''}!`);
    } else {
      setScanMessage('All tracked TV shows are up-to-date!');
    }
    setTimeout(() => setScanMessage(null), 4000);
  };

  const handleTestAlert = () => {
    sendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  if (!user) {
    return (
      <div className="content-section flex flex-col items-center justify-center pt-32 text-center">
        <p className="text-lg text-slate-400">Sign in to view your watchlist</p>
        <button onClick={() => navigate('/')} className="mt-4 primary-button">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="content-section pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My List</h1>
          <p className="text-xs text-slate-400 mt-1">
            {watchlist.length} saved title{watchlist.length === 1 ? '' : 's'} ({tvShowsCount} TV series monitored for new seasons)
          </p>
        </div>
      </div>

      {/* Season Release Alerts Status Banner */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-500/20 p-2.5 text-blue-400 border border-blue-500/30 flex-shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">New Season Browser Notifications</h3>
                {permission === 'granted' ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    <Check size={11} /> Alerts Active
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    Permission Needed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                StreamFlix automatically checks for newly released seasons of TV shows in your Watchlist and delivers browser notifications the moment they drop.
              </p>
              {scanMessage && (
                <p className="text-xs text-blue-300 font-semibold mt-1.5 animate-in fade-in duration-200">
                  {scanMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            {permission !== 'granted' && permission !== 'unsupported' ? (
              <button
                type="button"
                onClick={requestPermission}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
              >
                <Bell size={13} />
                <span>Enable Browser Alerts</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestAlert}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 active:scale-95 transition-all"
                title="Send a sample browser notification"
              >
                <Send size={12} className="text-amber-400" />
                <span>{testSent ? 'Alert Dispatched!' : 'Test Notification'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleManualScan}
              disabled={isScanning || tvShowsCount === 0}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              title="Query TMDB for any newly released seasons of your watchlist shows"
            >
              <RotateCw size={12} className={isScanning ? 'animate-spin text-blue-400' : ''} />
              <span>{isScanning ? 'Checking TMDB...' : 'Check Now'}</span>
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <SkeletonGrid count={6} />
      ) : watchlist.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          Your list is empty. Add movies and shows to watch later.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {watchlist.map((item) => {
            const movie = {
              id: item.tmdb_id,
              title: item.title,
              name: item.title,
              poster_path: item.poster_path,
              backdrop_path: item.backdrop_path,
              overview: '',
              release_date: '',
              first_air_date: '',
              vote_average: 0,
              vote_count: 0,
              popularity: 0,
            } as unknown as TmdbMovie & TmdbTv;
            return (
              <PosterCard key={item.id} item={movie} mediaType={item.media_type} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const { history, loading, removeFromHistory } = useWatchHistory();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="content-section flex flex-col items-center justify-center pt-32 text-center">
        <p className="text-lg text-slate-400">Sign in to view your watch history</p>
        <button onClick={() => navigate('/')} className="mt-4 primary-button">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="content-section pt-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Watch History</h1>
      {loading ? (
        <SkeletonGrid count={6} />
      ) : history.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          No watch history yet. Start watching something!
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
            >
              <button
                onClick={() => {
                  const target =
                    item.media_type === 'tv' && item.season_number && item.episode_number
                      ? `/player/tv/${item.tmdb_id}/${item.season_number}/${item.episode_number}`
                      : `/player/${item.media_type}/${item.tmdb_id}`;
                  navigate(target);
                }}
                className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md sm:w-40"
              >
                {item.backdrop_path ? (
                  <img src={backdropUrl(item.backdrop_path, 'w300')} alt={item.title} className="h-full w-full object-cover" />
                ) : item.poster_path ? (
                  <img src={imageUrl(item.poster_path, 'w185')} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-white/5 text-slate-700">
                    <Play size={20} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play size={24} fill="white" className="text-white" />
                </div>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                {item.episode_name && (
                  <p className="truncate text-xs text-slate-500">
                    S{item.season_number} E{item.episode_number} · {item.episode_name}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {item.completed ? (
                    <span className="text-emerald-400">Completed</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-mono font-bold">
                        {formatPlaybackTime(item.position)}
                      </span>
                      <span>({Math.round((item.position / (item.duration || 1)) * 100)}%)</span>
                    </span>
                  )}
                  <span>·</span>
                  <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                </div>
                {item.duration && !item.completed && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#27303a]">
                    <span
                      className="block h-full rounded-full bg-[#ef2835]"
                      style={{ width: `${Math.min((item.position / item.duration) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeFromHistory(item.id)}
                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Remove from history"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
