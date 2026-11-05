import { useEffect, useState, useRef } from 'react';
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getMovieGenres, getTvGenres } from '@/lib/tmdb';

export interface GenreItem {
  id: number;
  name: string;
}

export const MOVIE_GENRES: GenreItem[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export const TV_GENRES: GenreItem[] = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

interface GenreFilterProps {
  mediaType: 'movie' | 'tv';
  selectedGenreId: number | null;
  onSelectGenre: (genreId: number | null) => void;
  className?: string;
}

export function GenreFilter({
  mediaType,
  selectedGenreId,
  onSelectGenre,
  className = '',
}: GenreFilterProps) {
  const [genres, setGenres] = useState<GenreItem[]>(
    mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync genres on mediaType change and load live list from TMDb API
  useEffect(() => {
    const defaultList = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;
    setGenres(defaultList);

    const fetchGenres = mediaType === 'movie' ? getMovieGenres : getTvGenres;
    fetchGenres()
      .then((res) => {
        if (res && res.genres && res.genres.length > 0) {
          // Normalize short display names (e.g. Science Fiction -> Sci-Fi)
          const formatted = res.genres.map((g) => ({
            id: g.id,
            name: g.name === 'Science Fiction' ? 'Sci-Fi' : g.name,
          }));
          setGenres(formatted);
        }
      })
      .catch((err) => {
        console.warn('[GenreFilter] TMDb genre fetch fallback', err);
      });
  }, [mediaType]);

  // Update scroll arrow buttons visibility
  const checkScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    checkScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollState, { passive: true });
    window.addEventListener('resize', checkScrollState);
    return () => {
      el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [genres]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -280 : 280;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const activeGenre = genres.find((g) => g.id === selectedGenreId);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header bar with Filter Label, Active Badge and View Controls */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal size={13} className="text-[#f52432]" />
            <span>Filter by Category / Genre</span>
          </div>

          {activeGenre && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#f52432]/30 bg-[#f52432]/10 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              <span className="text-[#f52432]">{activeGenre.name}</span>
              <button
                type="button"
                onClick={() => onSelectGenre(null)}
                className="rounded-full p-0.5 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Clear genre filter"
                aria-label="Clear genre filter"
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Scroll navigation arrows (desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => handleScroll('left')}
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => handleScroll('right')}
              className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Toggle All Grid Drawer */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
              isExpanded
                ? 'border-[#f52432]/50 bg-[#f52432]/15 text-white'
                : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers size={12} />
            <span>{isExpanded ? 'Collapse' : 'All Genres'}</span>
          </button>
        </div>
      </div>

      {/* Primary Horizontal Scrolling Ribbon */}
      {!isExpanded && (
        <div className="relative group">
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 [scrollbar-width:none] scroll-smooth"
          >
            {/* "All Genres" quick button */}
            <button
              type="button"
              onClick={() => onSelectGenre(null)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedGenreId === null
                  ? 'bg-gradient-to-r from-[#f52432] to-[#b31420] text-white shadow-lg shadow-red-950/40 scale-[1.02]'
                  : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Sparkles size={12} className={selectedGenreId === null ? 'text-white' : 'text-slate-400'} />
              <span>All Genres</span>
            </button>

            {/* List of genre buttons */}
            {genres.map((genre) => {
              const isSelected = selectedGenreId === genre.id;
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => onSelectGenre(isSelected ? null : genre.id)}
                  className={`flex-shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#f52432] to-[#b31420] text-white shadow-lg shadow-red-950/40 scale-[1.02] border border-red-500/30'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Grid View (Accessible full category drawer) */}
      {isExpanded && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1626]/90 to-[#070c14]/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
          <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-2 text-xs">
            <span className="font-semibold text-slate-300">
              Browse all {genres.length} {mediaType === 'movie' ? 'movie' : 'TV'} genres
            </span>
            {selectedGenreId !== null && (
              <button
                type="button"
                onClick={() => onSelectGenre(null)}
                className="text-xs font-semibold text-[#f52432] hover:underline cursor-pointer"
              >
                Reset to All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectGenre(null);
                setIsExpanded(false);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition-all text-center cursor-pointer ${
                selectedGenreId === null
                  ? 'bg-gradient-to-r from-[#f52432] to-[#b31420] text-white shadow-md'
                  : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              <span>All Genres</span>
            </button>

            {genres.map((genre) => {
              const isSelected = selectedGenreId === genre.id;
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => {
                    onSelectGenre(isSelected ? null : genre.id);
                    setIsExpanded(false);
                  }}
                  className={`rounded-xl p-2.5 text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#f52432] to-[#b31420] text-white shadow-md border border-red-500/30'
                      : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
