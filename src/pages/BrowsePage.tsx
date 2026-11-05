import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getPopularTv,
  getTopRatedTv,
  getAiringTodayTv,
  getOnTheAirTv,
  discoverMoviesAdvanced,
  discoverTvAdvanced,
} from '@/lib/tmdb';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { PosterCard, SkeletonGrid } from '@/components/Cards';
import { GenreFilter, MOVIE_GENRES, TV_GENRES } from '@/components/GenreFilter';
import { RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';

export function BrowsePage({
  mediaType,
  initialGenreId,
}: {
  mediaType: 'movie' | 'tv';
  initialGenreId?: number;
}) {
  const [items, setItems] = useState<(TmdbMovie | TmdbTv)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('popular');
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(
    initialGenreId ?? null
  );

  // Sync initial genre if changed from outside route
  useEffect(() => {
    if (initialGenreId !== undefined) {
      setSelectedGenreId(initialGenreId);
    }
  }, [initialGenreId]);

  // Reset genre when mediaType changes
  useEffect(() => {
    if (initialGenreId === undefined) {
      setSelectedGenreId(null);
    }
  }, [mediaType]);

  const handleGenreSelect = (genreId: number | null) => {
    setSelectedGenreId(genreId);
    // Sync URL hash query without hard reload
    if (typeof window !== 'undefined') {
      const base = mediaType === 'movie' ? '#/movies' : '#/tv';
      const targetHash = genreId ? `${base}?genre=${genreId}` : base;
      window.history.replaceState(null, '', targetHash);
    }
  };

  const fetcher = useMemo(() => {
    return mediaType === 'movie'
      ? {
          popular: getPopularMovies,
          'top_rated': getTopRatedMovies,
          'now_playing': getNowPlayingMovies,
          upcoming: getUpcomingMovies,
        }
      : {
          popular: getPopularTv,
          'top_rated': getTopRatedTv,
          'airing_today': getAiringTodayTv,
          'on_the_air': getOnTheAirTv,
        };
  }, [mediaType]);

  // Unified fetch function for standard categories & genre-filtered discovery
  const fetchPage = useCallback(
    async (targetPage: number) => {
      if (selectedGenreId) {
        let sortParam = 'popularity.desc';
        const extraParams: Record<string, string> = {
          with_genres: String(selectedGenreId),
          page: String(targetPage),
        };

        if (category === 'top_rated') {
          sortParam = 'vote_average.desc';
          extraParams['vote_count.gte'] = '100';
        } else if (category === 'now_playing' || category === 'airing_today') {
          sortParam = 'popularity.desc';
        } else if (category === 'upcoming') {
          sortParam = 'popularity.desc';
          extraParams['primary_release_date.gte'] = new Date().toISOString().split('T')[0];
        } else if (category === 'on_the_air') {
          sortParam = 'popularity.desc';
        }

        extraParams.sort_by = sortParam;

        if (mediaType === 'movie') {
          return await discoverMoviesAdvanced(extraParams);
        } else {
          return await discoverTvAdvanced(extraParams);
        }
      } else {
        const fn = fetcher[category as keyof typeof fetcher];
        if (fn) {
          return await fn(targetPage);
        }
        return { results: [], total_pages: 1, page: targetPage };
      }
    },
    [mediaType, category, selectedGenreId, fetcher]
  );

  // Reset & load on mediaType, category, or selectedGenreId change
  useEffect(() => {
    setLoading(true);
    setPage(1);
    setItems([]);
    setHasMore(true);

    fetchPage(1)
      .then((data) => {
        setItems(data.results);
        setHasMore(1 < (data.total_pages || 1));
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[BrowsePage] Fetch error:', err);
        setItems([]);
        setLoading(false);
      });
  }, [mediaType, category, selectedGenreId, fetchPage]);

  // Load more next page
  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    fetchPage(nextPage)
      .then((data) => {
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueNew = data.results.filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(nextPage < (data.total_pages || 1));
        setLoadingMore(false);
      })
      .catch((err) => {
        console.warn('[BrowsePage] Load more error:', err);
        setLoadingMore(false);
      });
  }, [loading, loadingMore, hasMore, page, fetchPage]);

  // Infinite Scroll IntersectionObserver Sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '400px', threshold: 0.05 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const categories = mediaType === 'movie'
    ? [
        { key: 'popular', label: 'Popular' },
        { key: 'top_rated', label: 'Top Rated' },
        { key: 'now_playing', label: 'Now Playing' },
        { key: 'upcoming', label: 'Upcoming' },
      ]
    : [
        { key: 'popular', label: 'Popular' },
        { key: 'top_rated', label: 'Top Rated' },
        { key: 'airing_today', label: 'Airing Today' },
        { key: 'on_the_air', label: 'On The Air' },
      ];

  const currentGenres = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
  const activeGenre = currentGenres.find((g) => g.id === selectedGenreId);

  return (
    <div className="content-section pt-8 pb-20">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {activeGenre
                ? `${activeGenre.name} ${mediaType === 'movie' ? 'Movies' : 'TV Shows'}`
                : mediaType === 'movie'
                ? 'Movies Catalog'
                : 'TV Series Catalog'}
            </h1>
            {activeGenre && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400">
                <Sparkles size={11} />
                <span>Filtered</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {activeGenre
              ? `Exploring top-rated and trending ${activeGenre.name.toLowerCase()} releases`
              : `Browse the complete collection of ${mediaType === 'movie' ? 'blockbuster movies' : 'television series'}`}
          </p>
        </div>

        <span className="text-xs font-bold text-slate-400 self-start sm:self-auto">
          {items.length} titles loaded {hasMore && '· continuous lazy loading'}
        </span>
      </div>

      {/* Primary Category Sort Pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              category === cat.key
                ? 'bg-white text-black shadow-md'
                : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Dedicated Interactive Genre Filter Ribbon */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <GenreFilter
          mediaType={mediaType}
          selectedGenreId={selectedGenreId}
          onSelectGenre={handleGenreSelect}
        />
      </div>

      {/* Catalog Grid or Empty State */}
      {loading ? (
        <SkeletonGrid count={18} />
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-slate-400 mb-3">
            <SlidersHorizontal size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            No titles found for this category
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            {activeGenre
              ? `We couldn't find any titles in ${activeGenre.name} with the current sorting filter.`
              : 'No titles match the selected criteria.'}
          </p>
          {activeGenre && (
            <button
              type="button"
              onClick={() => handleGenreSelect(null)}
              className="rounded-xl bg-[#f52432] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/50 hover:bg-[#d61b28] transition-all cursor-pointer"
            >
              Clear Genre Filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {items.map((item) => (
              <PosterCard key={`${mediaType}-${item.id}`} item={item} mediaType={mediaType} />
            ))}
          </div>

          {/* Lazy loading status & sentinel */}
          {hasMore && (
            <div className="mt-12 flex flex-col items-center justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-slate-300 backdrop-blur-md">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                  <span>Loading more titles...</span>
                </div>
              ) : (
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-medium text-slate-400 hover:border-white/20 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Scroll or Click to Load More</span>
                </button>
              )}
              <div ref={sentinelRef} className="h-14 w-full pointer-events-none" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
