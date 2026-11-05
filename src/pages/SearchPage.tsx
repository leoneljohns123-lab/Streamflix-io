import { useEffect, useState, useRef, useCallback } from 'react';
import { Search as SearchIcon, RefreshCw } from 'lucide-react';
import { searchMulti } from '@/lib/tmdb';
import { profileUrl } from '@/lib/tmdb-config';
import { PosterCard, SkeletonGrid } from '@/components/Cards';
import { navigate } from '@/lib/router';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';

type SearchResult = {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
};

export function SearchPage({ query }: { query: string }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movie' | 'tv' | 'person'>('all');

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setHasMore(false);
      setPage(1);
      return;
    }
    setLoading(true);
    setPage(1);
    searchMulti(query, 1)
      .then((data) => {
        setResults((data.results || []) as unknown as SearchResult[]);
        setHasMore(1 < (data.total_pages || 1));
        setLoading(false);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
      });
  }, [query]);

  // Load more search results pagination
  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || !query.trim()) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    searchMulti(query, nextPage)
      .then((data) => {
        setResults((prev) => {
          const existingIds = new Set(prev.map((r) => `${r.media_type}-${r.id}`));
          const uniqueNew = ((data.results || []) as unknown as SearchResult[]).filter(
            (r) => !existingIds.has(`${r.media_type}-${r.id}`)
          );
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(nextPage < (data.total_pages || 1));
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [loading, loadingMore, hasMore, query, page]);

  // IntersectionObserver Sentinel
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

  const filtered = results.filter((r) => {
    if (activeTab === 'all') return r.media_type === 'movie' || r.media_type === 'tv' || r.media_type === 'person';
    return r.media_type === activeTab;
  });

  const movies = filtered.filter((r) => r.media_type === 'movie');
  const tvShows = filtered.filter((r) => r.media_type === 'tv');
  const people = filtered.filter((r) => r.media_type === 'person');

  return (
    <div className="content-section pt-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {query ? `Results for "${query}"` : 'Search StreamFlix'}
        </h1>
        {query && (
          <span className="text-xs font-bold text-slate-400">
            {filtered.length} titles loaded {hasMore && '· continuous lazy loading'}
          </span>
        )}
      </div>

      {!query && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <SearchIcon size={48} className="text-slate-700" />
          <p className="mt-4 text-slate-500">Search for movies, TV shows, and people</p>
        </div>
      )}

      {query && (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[
              { key: 'all', label: 'All' },
              { key: 'movie', label: 'Movies' },
              { key: 'tv', label: 'TV Shows' },
              { key: 'person', label: 'People' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'all' | 'movie' | 'tv' | 'person')}
                className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-white text-black shadow'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonGrid count={12} />
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-500">No results found for "{query}".</div>
          ) : (
            <>
              {activeTab !== 'tv' && activeTab !== 'person' && movies.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-3 text-lg font-bold text-white">Movies</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                    {movies.map((m) => (
                      <PosterCard key={`movie-${m.id}`} item={m as unknown as TmdbMovie} mediaType="movie" />
                    ))}
                  </div>
                </div>
              )}
              {activeTab !== 'movie' && activeTab !== 'person' && tvShows.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-3 text-lg font-bold text-white">TV Shows</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                    {tvShows.map((t) => (
                      <PosterCard key={`tv-${t.id}`} item={t as unknown as TmdbTv} mediaType="tv" />
                    ))}
                  </div>
                </div>
              )}
              {activeTab !== 'movie' && activeTab !== 'tv' && people.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-3 text-lg font-bold text-white">People</h2>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {people.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(p.name ?? '')}`)}
                        className="group text-left cursor-pointer"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white/5">
                          {p.profile_path ? (
                            <img
                              src={profileUrl(p.profile_path, 'w185')}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-2xl text-slate-700">{p.name?.[0] ?? '?'}</div>
                          )}
                        </div>
                        <p className="mt-1.5 truncate text-xs font-semibold text-white">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lazy loading status & sentinel */}
              {hasMore && (
                <div className="mt-12 flex flex-col items-center justify-center">
                  {loadingMore ? (
                    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-slate-300 backdrop-blur-md">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      <span>Loading more search results...</span>
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
        </>
      )}
    </div>
  );
}
