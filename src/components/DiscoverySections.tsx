import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Star,
  Clock,
  Calendar,
  X,
  Bell,
  Check,
  Dices,
  Flame,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Globe,
  Film,
  Tv,
  Heart,
} from 'lucide-react';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import type { WatchHistoryEntry } from '@/lib/supabase';
import { imageUrl, backdropUrl } from '@/lib/tmdb-config';
import { navigate } from '@/lib/router';
import { PosterCard, SkeletonRow } from '@/components/Cards';
import { getServicesForTitle } from '@/lib/admin-store';
import { formatPlaybackTime } from '@/lib/playback-store';

// ==========================================
// 1. LAZY POSTER ROW WITH INTERSECTION OBSERVER
// ==========================================
// In-memory cache across row mounts so scrolling back and forth is instantaneous
const globalRowCache = new Map<string, (TmdbMovie | TmdbTv)[]>();

export function LazyPosterRow({
  id,
  rowId,
  title,
  subtitle,
  mediaType = 'movie',
  fetcher,
  headerAction,
  customRenderer,
}: {
  id?: string;
  rowId: string;
  title: string;
  subtitle?: string;
  mediaType?: 'movie' | 'tv';
  fetcher: () => Promise<(TmdbMovie | TmdbTv)[]>;
  headerAction?: React.ReactNode;
  customRenderer?: (items: (TmdbMovie | TmdbTv)[]) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<(TmdbMovie | TmdbTv)[] | null>(() => globalRowCache.get(rowId) || null);
  const [loading, setLoading] = useState(!items);
  const [inView, setInView] = useState(Boolean(items));

  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
          fetcher()
            .then((data) => {
              globalRowCache.set(rowId, data);
              setItems(data);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        }
      },
      { rootMargin: '450px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, fetcher, rowId]);

  return (
    <div ref={containerRef} id={id || rowId} className="content-section min-h-[280px]">
      {loading ? (
        <SkeletonRow count={4} />
      ) : !items || items.length === 0 ? null : customRenderer ? (
        customRenderer(items)
      ) : (
        <div>
          <div className="section-heading mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
          <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
            {items.map((item) => (
              <div key={item.id} className="w-[140px] sm:w-[170px] md:w-[195px] flex-shrink-0 snap-start">
                <PosterCard item={item} mediaType={mediaType} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. CONTINUE WATCHING SECTION
// ==========================================
export function ContinueWatchingSection({
  items,
  onRemove,
}: {
  items: WatchHistoryEntry[];
  onRemove: (id: string) => void;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="content-section">
      <div className="section-heading mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#f52432] animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Continue Watching
          </h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            {items.length}
          </span>
        </div>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-6 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((entry) => {
          const progressPercent = Math.min(
            100,
            Math.max(8, Math.round(((entry.position || 0) / (entry.duration || 100)) * 100)),
          );
          const imgSrc = entry.backdrop_path
            ? backdropUrl(entry.backdrop_path, 'w780')
            : entry.poster_path
            ? imageUrl(entry.poster_path, 'w500')
            : null;

          const episodeLabel =
            entry.media_type === 'tv'
              ? `S${entry.season_number || 1} E${entry.episode_number || 1}${
                  entry.episode_name ? ` · ${entry.episode_name}` : ''
                }`
              : 'Movie';

          const handleResume = () => {
            if (entry.media_type === 'tv') {
              navigate(`/player/tv/${entry.tmdb_id}/${entry.season_number || 1}/${entry.episode_number || 1}`);
            } else {
              navigate(`/player/movie/${entry.tmdb_id}`);
            }
          };

          return (
            <div
              key={entry.id}
              className="group relative w-[280px] sm:w-[320px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#090f19] p-3 shadow-xl transition-all duration-300 hover:border-blue-400/40 hover:-translate-y-1"
            >
              {/* Image banner with overlay */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={entry.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-slate-500">
                    No Preview
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(entry.id);
                  }}
                  className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-slate-300 backdrop-blur-md transition-colors hover:bg-[#f52432] hover:text-white"
                  title="Remove from history"
                >
                  <X size={14} />
                </button>

                {/* Quick Play overlay button */}
                <button
                  type="button"
                  onClick={handleResume}
                  className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                  aria-label="Resume playing"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f52432] text-white shadow-lg shadow-[#f52432]/40 transition-transform group-hover:scale-110">
                    <Play size={20} fill="white" />
                  </div>
                </button>

                {/* Bottom progress bar on image */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-[#f52432]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Title & Info */}
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white group-hover:text-blue-200">
                    {entry.title}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{episodeLabel}</span>
                    {entry.position > 0 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-emerald-400 font-mono font-bold text-[11px]">
                          {formatPlaybackTime(entry.position)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <Play size={11} fill="white" />
                  <span>Resume</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ==========================================
// 3. 🔥 TRENDING NOW (RANKED NUMBERED ROW #1 #2 #3)
// ==========================================
export function TrendingRankedRow({ items, id }: { items: (TmdbMovie | TmdbTv)[]; id?: string }) {
  if (!items || items.length === 0) return null;

  return (
    <section id={id} className="content-section">
      <div className="section-heading mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
            <Flame size={16} />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Trending Top 10
            </h2>
            <p className="text-xs text-slate-400">The most watched titles across the globe today</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.slice(0, 10).map((item, index) => {
          const rank = index + 1;
          const isMovie = 'title' in item;
          const title = isMovie ? (item as TmdbMovie).title : (item as TmdbTv).name;
          const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.2';
          const mediaType = isMovie ? 'movie' : 'tv';
          const poster = item.poster_path ? imageUrl(item.poster_path, 'w500') : null;
          const streamingServices = getServicesForTitle(item.id);

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/player/${mediaType}/${item.id}`)}
              className="group relative flex w-[320px] sm:w-[360px] flex-shrink-0 snap-start cursor-pointer select-none items-end transition-all duration-300 hover:-translate-y-1.5"
            >
              {/* Giant Outlined Typography Number */}
              <div className="relative -mr-6 sm:-mr-8 z-0 flex-shrink-0 select-none pointer-events-none pb-2">
                <span className="text-8xl sm:text-9xl font-black italic tracking-tighter text-transparent [-webkit-text-stroke:2.5px_rgba(255,255,255,0.45)] group-hover:[-webkit-text-stroke:2.5px_#38bdf8] drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] transition-all">
                  {rank}
                </span>
              </div>

              {/* Poster Card */}
              <div className="relative z-10 flex-1 overflow-hidden rounded-[24px] border border-white/15 bg-gradient-to-b from-[#0f172a] via-[#090f19] to-[#040810] p-4 shadow-2xl transition-all group-hover:border-blue-400/50 group-hover:shadow-[0_20px_50px_rgba(37,99,235,0.25)]">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black">
                  {poster ? (
                    <img
                      src={poster}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-slate-500">
                      No Poster
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                    #{rank} Trending
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="rounded bg-white/10 px-2 py-0.5 font-bold uppercase text-[10px] text-white">
                      {isMovie ? 'Movie' : 'TV Series'}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-yellow-400">
                      <Star size={12} fill="currentColor" /> {rating}
                    </span>
                  </div>

                  <h3 className="mt-2 truncate text-base font-black text-white group-hover:text-blue-200">
                    {title}
                  </h3>

                  {streamingServices.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 truncate text-[10px] font-semibold text-slate-400">
                      <span>Stream:</span>
                      {streamingServices.slice(0, 2).map((s) => (
                        <span key={s.id} className="text-white">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-black text-black hover:bg-slate-200 transition-colors">
                    <Play size={13} fill="black" /> Watch Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ==========================================
// 4. COMING SOON WITH COUNTDOWN & REMIND ME
// ==========================================
export function ComingSoonSection({ items }: { items: TmdbMovie[] }) {
  const [remindedIds, setRemindedIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('streamflix_reminders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleReminder = (id: number) => {
    const next = remindedIds.includes(id)
      ? remindedIds.filter((x) => x !== id)
      : [...remindedIds, id];
    setRemindedIds(next);
    localStorage.setItem('streamflix_reminders', JSON.stringify(next));
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="content-section">
      <div className="section-heading mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Coming Soon
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Anticipated releases landing on StreamFlix soon
          </p>
        </div>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-6 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((movie) => {
          const isReminded = remindedIds.includes(movie.id);
          const releaseDate = movie.release_date || '2026-11-20';
          const dateObj = new Date(releaseDate);
          const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          // Compute relative days
          const diffDays = Math.ceil(
            (dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          const countdown = diffDays > 0 ? `In ${diffDays} days` : 'This Month';

          const imageSrc = movie.backdrop_path
            ? backdropUrl(movie.backdrop_path, 'w780')
            : movie.poster_path
            ? imageUrl(movie.poster_path, 'w500')
            : null;

          return (
            <div
              key={movie.id}
              className="group relative w-[300px] sm:w-[340px] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#090f19] p-4 shadow-xl transition-all hover:border-white/20"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={movie.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-slate-500">
                    No Preview
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute bottom-2 left-2 rounded-md bg-purple-500/30 border border-purple-400/40 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                  {countdown}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {formattedDate}
                </p>
                <h3 className="mt-1 truncate text-base font-black text-white group-hover:text-blue-200">
                  {movie.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400 leading-relaxed">
                  {movie.overview || 'Premiere arriving soon with 4K Ultra HD and Dolby Atmos audio.'}
                </p>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <button
                    onClick={() => toggleReminder(movie.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      isReminded
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {isReminded ? <Check size={13} /> : <Bell size={13} />}
                    <span>{isReminded ? 'Reminder Set' : 'Remind Me'}</span>
                  </button>

                  <button
                    onClick={() => navigate(`/player/movie/${movie.id}`)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ==========================================
// 5. TOP RATED WITH INTERACTIVE TABS (MOVIES | TV)
// ==========================================
export function TopRatedSection({
  movies,
  tvShows,
  id,
}: {
  movies: TmdbMovie[];
  tvShows: TmdbTv[];
  id?: string;
}) {
  const [tab, setTab] = useState<'movies' | 'tv'>('movies');
  const items = tab === 'movies' ? movies : tvShows;

  return (
    <section id={id} className="content-section">
      <div className="section-heading mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Top Rated of All Time
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Critically acclaimed masterworks</p>
        </div>

        {/* Movies | TV Shows Tabs */}
        <div className="flex items-center rounded-xl bg-white/[0.06] p-1 border border-white/10">
          <button
            onClick={() => setTab('movies')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              tab === 'movies'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setTab('tv')}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              tab === 'tv'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            TV Shows
          </button>
        </div>
      </div>

      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((item) => (
          <div key={item.id} className="w-[140px] sm:w-[170px] md:w-[195px] flex-shrink-0 snap-start">
            <PosterCard item={item} mediaType={tab === 'movies' ? 'movie' : 'tv'} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ==========================================
// 6. MADE IN AFRICA (TABS: ALL | KENYA | NIGERIA | SOUTH AFRICA | GHANA)
// ==========================================
export function MadeInAfricaSection({
  items,
  currentTab,
  onTabChange,
  id,
}: {
  items: (TmdbMovie | TmdbTv)[];
  currentTab: string;
  onTabChange: (tab: string) => void;
  id?: string;
}) {
  const tabs = ['All', 'Kenya', 'Nigeria', 'South Africa', 'Ghana'];

  return (
    <section id={id} className="content-section">
      <div className="section-heading mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Globe size={20} className="text-amber-400" />
            Made in Africa
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Rich narratives, Nollywood cinema, and African storytellers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                currentTab === t
                  ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((item) => (
          <div key={item.id} className="w-[140px] sm:w-[170px] md:w-[195px] flex-shrink-0 snap-start">
            <PosterCard item={item} mediaType={'title' in item ? 'movie' : 'tv'} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ==========================================
// 7. SURPRISE ME INTERACTIVE BANNER
// ==========================================
export function SurpriseMeBanner({
  onPickRandom,
}: {
  onPickRandom: () => void;
}) {
  return (
    <div className="mx-3 sm:mx-6 lg:mx-9 my-8 overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/80 via-[#0a0f1d] to-[#060a12] p-6 sm:p-8 shadow-2xl relative">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 px-3 py-0.5 text-xs font-black uppercase text-purple-300">
            <Dices size={13} />
            Quick Decision
          </span>
          <h3 className="mt-2 text-2xl sm:text-3xl font-black text-white">
            Don&apos;t know what to watch?
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Let StreamFlix pick an acclaimed movie or trending series for you with one click.
          </p>
        </div>

        <button
          onClick={onPickRandom}
          className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 flex-shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Dices size={18} />
          <span>Surprise Me</span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 8. PICK A MOOD INTERACTIVE ROW
// ==========================================
export function PickAMoodSection({
  onSelectMood,
}: {
  onSelectMood: (mood: string) => void;
}) {
  const moods = [
    { emoji: '😱', label: 'Scary', desc: 'Horror & Chills', color: 'from-red-950 to-slate-900 border-red-500/30' },
    { emoji: '😂', label: 'Funny', desc: 'Laughs & Comedy', color: 'from-amber-950 to-slate-900 border-amber-500/30' },
    { emoji: '❤️', label: 'Romantic', desc: 'Love & Drama', color: 'from-rose-950 to-slate-900 border-rose-500/30' },
    { emoji: '🔥', label: 'Exciting', desc: 'Action & Thrills', color: 'from-orange-950 to-slate-900 border-orange-500/30' },
    { emoji: '🧠', label: 'Thought-Provoking', desc: 'Sci-Fi & Mind Benders', color: 'from-blue-950 to-slate-900 border-blue-500/30' },
  ];

  return (
    <section className="content-section">
      <div className="section-heading mb-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
          Pick a Mood
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Filter by the exact sensation you want tonight</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {moods.map((m) => (
          <button
            key={m.label}
            onClick={() => onSelectMood(m.label)}
            className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all bg-gradient-to-b ${m.color} hover:scale-105 hover:border-white/30 cursor-pointer shadow-lg`}
          >
            <span className="text-3xl mb-1">{m.emoji}</span>
            <span className="text-sm font-black text-white">{m.label}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">{m.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ==========================================
// 9. FEATURED COLLECTIONS CARDS
// ==========================================
export function FeaturedCollectionsSection() {
  const collections = [
    {
      name: 'Marvel Cinematic Universe',
      count: '32 Movies',
      image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80',
      badge: 'Superheroes',
    },
    {
      name: 'DC Extended Universe',
      count: '16 Movies',
      image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
      badge: 'Dark & Gritty',
    },
    {
      name: 'Christopher Nolan Masterworks',
      count: '11 Titles',
      image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
      badge: 'Mind Bending',
    },
    {
      name: 'John Wick Universe',
      count: '4 Chapters',
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
      badge: 'Action Masterclass',
    },
  ];

  return (
    <section className="content-section">
      <div className="section-heading mb-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          Featured Collections
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Binge whole sagas and iconic film franchises</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {collections.map((col) => (
          <div
            key={col.name}
            onClick={() => navigate('/movies')}
            className="group relative h-48 overflow-hidden rounded-2xl border border-white/10 bg-[#090f19] cursor-pointer shadow-xl transition-all hover:border-blue-400/50 hover:scale-[1.02]"
          >
            <img
              src={col.image}
              alt={col.name}
              className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-4 inset-x-4">
              <span className="rounded bg-blue-600/40 border border-blue-400/40 px-2 py-0.5 text-[9px] font-black uppercase text-blue-200">
                {col.badge}
              </span>
              <h4 className="mt-1 text-base font-black text-white group-hover:text-blue-200">
                {col.name}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">{col.count}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ==========================================
// 10. POPULAR BY YEAR (HORIZONTAL SELECTOR)
// ==========================================
export function PopularByYearSection({
  selectedYear,
  onYearChange,
  items,
}: {
  selectedYear: number;
  onYearChange: (y: number) => void;
  items: TmdbMovie[];
}) {
  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

  return (
    <section className="content-section">
      <div className="section-heading mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Popular Movies by Year
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Explore the biggest blockbusters year by year</p>
        </div>

        {/* Year Pills Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-white/[0.04] p-1 border border-white/[0.08] [scrollbar-width:none]">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(y)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                selectedYear === y
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((item) => (
          <div key={item.id} className="w-[140px] sm:w-[170px] md:w-[195px] flex-shrink-0 snap-start">
            <PosterCard item={item} mediaType="movie" />
          </div>
        ))}
      </div>
    </section>
  );
}
