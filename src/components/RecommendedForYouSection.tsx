import { useEffect, useState, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, Wand2, Play, Info, Flame, ThumbsUp } from 'lucide-react';
import type { WatchHistoryEntry } from '@/lib/supabase';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { searchMulti, searchMovies, searchTv, getPopularMovies } from '@/lib/tmdb';
import { PosterCard, SkeletonRow } from './Cards';

interface GeminiRecItem {
  title: string;
  mediaType: 'movie' | 'tv';
  genre?: string;
  reason: string;
  tmdbItem?: TmdbMovie | TmdbTv | null;
}

interface RecommendedForYouSectionProps {
  history: WatchHistoryEntry[];
}

export function RecommendedForYouSection({ history }: RecommendedForYouSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasteSummary, setTasteSummary] = useState<string>('');
  const [recommendedItems, setRecommendedItems] = useState<GeminiRecItem[]>([]);
  const hasFetchedRef = useRef(false);

  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Prepare history payload for Gemini
      const historyPayload = history.slice(0, 10).map((h) => ({
        title: h.title,
        mediaType: h.media_type,
        tmdbId: h.tmdb_id,
        season: h.season_number,
        episode: h.episode_number,
      }));

      // 2. Call server-side Gemini API route
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: historyPayload }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API route error: ${response.status}`);
      }

      const data = await response.json();
      const rawRecs: Array<{ title: string; mediaType: 'movie' | 'tv'; genre?: string; reason: string }> =
        data.recommendations || [];

      setTasteSummary(
        data.tasteSummary ||
          (history.length > 0
            ? 'Curated cinematic selections personalized for your viewing style.'
            : 'Explore critically acclaimed and trending masterworks recommended by Gemini AI.')
      );

      // 3. Resolve each Gemini recommendation against TMDB API to get genuine posters, backdrops, and playability
      const resolvedList: GeminiRecItem[] = await Promise.all(
        rawRecs.map(async (rec): Promise<GeminiRecItem> => {
          try {
            const searchFn = rec.mediaType === 'tv' ? searchTv : searchMovies;
            const searchRes = await searchFn(rec.title, 1);
            if (searchRes.results && searchRes.results.length > 0) {
              const bestMatch = searchRes.results[0];
              return {
                ...rec,
                tmdbItem: bestMatch as TmdbMovie | TmdbTv,
              };
            }

            // Fallback to searchMulti if specific search found no match
            const multiRes = await searchMulti(rec.title, 1);
            const multiMatch = multiRes.results?.find(
              (r) => 'poster_path' in r && (r as any).poster_path
            );
            if (multiMatch) {
              return {
                ...rec,
                tmdbItem: multiMatch as unknown as TmdbMovie | TmdbTv,
                mediaType: (multiMatch as any).title ? 'movie' : 'tv',
              };
            }

            return {
              ...rec,
              tmdbItem: null,
            };
          } catch {
            return {
              ...rec,
              tmdbItem: null,
            };
          }
        })
      );

      // Filter items that successfully resolved to TMDB media with posters
      const validItems = resolvedList.filter((item) => item.tmdbItem && (item.tmdbItem.poster_path || item.tmdbItem.backdrop_path));

      if (validItems.length > 0) {
        setRecommendedItems(validItems);
      } else {
        // Fallback to top popular movies if TMDB searches failed
        const fallbackRes = await getPopularMovies(1);
        setRecommendedItems(
          fallbackRes.results.slice(0, 6).map((m) => ({
            title: m.title,
            mediaType: 'movie',
            reason: 'Top trending blockbuster with universal acclaim',
            tmdbItem: m,
          }))
        );
      }
    } catch (err) {
      console.warn('[RecommendedForYou] Gemini recommendations fallback', err);
      try {
        const fallbackRes = await getPopularMovies(1);
        setTasteSummary('Trending masterworks and blockbuster hits curated for you.');
        setRecommendedItems(
          fallbackRes.results.slice(0, 6).map((m) => ({
            title: m.title,
            mediaType: 'movie',
            reason: 'Trending critically acclaimed blockbuster',
            tmdbItem: m,
          }))
        );
      } catch {
        setRecommendedItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [history]);

  useEffect(() => {
    // Only fetch automatically once on mount or when history changes
    if (!hasFetchedRef.current || history.length > 0) {
      hasFetchedRef.current = true;
      fetchRecommendations(false);
    }
  }, [fetchRecommendations, history.length]);

  return (
    <section className="content-section relative my-8">
      {/* Atmospheric Ambient Glow behind AI section */}
      <div
        className="absolute -inset-4 -z-10 opacity-20 blur-3xl pointer-events-none hidden md:block"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, rgba(245,36,50,0.35), rgba(59,130,246,0.3), transparent 70%)`,
        }}
      />

      {/* Section Header */}
      <div className="section-heading mb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-gradient-to-r from-red-600/20 to-blue-600/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm">
              <Sparkles size={13} className="text-[#f52432] animate-pulse" />
              <span>Recommended for You</span>
              <span className="text-slate-400 font-normal">· Powered by Gemini AI</span>
            </span>

            {history.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <ThumbsUp size={11} />
                <span>Personalized from your watch history</span>
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Curated by Gemini AI
          </h2>

          {tasteSummary && (
            <p className="mt-1 text-xs sm:text-sm text-slate-300 italic font-medium leading-relaxed">
              "{tasteSummary}"
            </p>
          )}
        </div>

        {/* Refresh AI Picks Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRecommendations(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-slate-200 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Ask Gemini for fresh recommendations"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-[#f52432]' : ''} />
            <span>{refreshing ? 'Analyzing Taste...' : 'Regenerate AI Picks'}</span>
          </button>
        </div>
      </div>

      {/* Content Ribbon */}
      {loading ? (
        <SkeletonRow count={4} />
      ) : recommendedItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#090f19] p-8 text-center">
          <Wand2 size={28} className="mx-auto mb-2 text-[#f52432]" />
          <p className="text-sm font-bold text-white">Generating Personalized AI Recommendations...</p>
          <p className="text-xs text-slate-400 mt-1">Stream movies or shows to unlock deeper taste predictions.</p>
        </div>
      ) : (
        <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
          {recommendedItems.map((rec, index) => {
            if (!rec.tmdbItem) return null;
            return (
              <div
                key={`${rec.mediaType}-${rec.tmdbItem.id}-${index}`}
                className="w-[140px] sm:w-[170px] md:w-[195px] flex-shrink-0 snap-start flex flex-col"
              >
                {/* Reason Banner on top of card */}
                {rec.reason && (
                  <div className="mb-2 flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                    <Sparkles size={10} className="text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{rec.reason}</span>
                  </div>
                )}

                {/* Standard Rich Poster Card with Play, Trailer Modal, and Watchlist */}
                <div className="flex-1">
                  <PosterCard item={rec.tmdbItem} mediaType={rec.mediaType} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
