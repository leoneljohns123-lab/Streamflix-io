import { useState } from 'react';
import { Play, Heart } from 'lucide-react';
import { imageUrl, backdropUrl, profileUrl } from '@/lib/tmdb-config';
import type { TmdbMovie, TmdbTv, TmdbCastMember, TmdbVideo, TmdbReview } from '@/lib/tmdb-types';
import { getYouTubeThumbnail } from '@/lib/providers';
import { useWatchlist } from '@/lib/hooks';
import { DetailsDialog } from './DetailsDialog';

/**
 * Minimalist vertical movie/TV poster card matching Image 1:
 * - Vertical aspect ratio (2:3)
 * - Rounded corners (rounded-xl / rounded-2xl)
 * - Poster image filling card
 * - Smooth bottom dark vignette gradient
 * - Simple clean title text at bottom
 * - Smooth hover zoom
 * - Clicking opens the rich DetailsDialog (styled as Image 2)
 */
export function PosterCard({
  item,
  mediaType,
}: {
  item: TmdbMovie | TmdbTv;
  mediaType: 'movie' | 'tv';
  isHot?: boolean;
  hotThreshold?: number;
}) {
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isMovie = mediaType === 'movie';
  const title = isMovie ? (item as TmdbMovie).title : (item as TmdbTv).name;
  const inList = isInWatchlist(item.id, mediaType);

  // High quality poster, or fallback to backdrop
  const imageSrc = item.poster_path
    ? imageUrl(item.poster_path, 'w500')
    : item.backdrop_path
    ? backdropUrl(item.backdrop_path, 'w780')
    : null;

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist({
      tmdb_id: item.id,
      media_type: mediaType,
      title: title || '',
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
    });
  };

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className="group relative aspect-[2/3] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#090f19] border border-white/[0.08] shadow-lg transition-all duration-300 hover:scale-[1.03] hover:border-emerald-500/50 hover:shadow-[0_12px_32px_rgba(0,0,0,0.85)] cursor-pointer select-none"
      >
        {/* Poster Image */}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#0d1622] p-4 text-center text-xs font-semibold text-slate-400">
            {title}
          </div>
        )}

        {/* Bottom vignette gradient matching Image 1 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />

        {/* Subtle center play icon visible on hover */}
        <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/90 text-slate-950 shadow-xl backdrop-blur-sm transform group-hover:scale-105 transition-transform">
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </div>
        </div>

        {/* Quick Watchlist Heart button (subtle top-right) */}
        <button
          type="button"
          onClick={handleWatchlistClick}
          className={`absolute top-2.5 right-2.5 z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md transition-all hover:bg-black/90 hover:scale-110 active:scale-95 cursor-pointer ${
            inList ? 'opacity-100 text-[#f52432]' : 'opacity-0 group-hover:opacity-100 text-white'
          }`}
          aria-label={inList ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={14} className={inList ? 'fill-[#f52432]' : ''} />
        </button>

        {/* Clean, minimalist title at bottom as seen in Image 1 */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 pointer-events-none">
          <h3 className="truncate text-xs sm:text-sm font-semibold text-white drop-shadow-md">
            {title}
          </h3>
        </div>
      </div>

      {/* Details Dialog designed exactly as in Image 2 */}
      <DetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={item}
        mediaType={mediaType}
      />
    </>
  );
}

// Horizontal scrolling row of posters
export function PosterRow({
  title,
  items,
  mediaType,
}: {
  title: string;
  items: (TmdbMovie | TmdbTv)[];
  mediaType: 'movie' | 'tv';
  hotThreshold?: number;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="content-section">
      <div className="section-heading mb-3 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{title}</h2>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((item) => (
          <div key={item.id} className="w-[135px] sm:w-[165px] md:w-[190px] flex-shrink-0 snap-start">
            <PosterCard item={item} mediaType={mediaType} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Cast card
export function CastCard({ member, onClick }: { member: TmdbCastMember; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group text-left transition-transform hover:-translate-y-1 cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5 border border-white/5">
        {member.profile_path ? (
          <img
            src={profileUrl(member.profile_path, 'w185')}
            alt={member.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-2xl text-slate-700 font-bold">
            {member.name[0]}
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-xs font-bold text-white group-hover:text-emerald-300">{member.name}</p>
      <p className="truncate text-[11px] text-slate-500">{member.character}</p>
    </button>
  );
}

// Video card
export function VideoCard({ video, onClick }: { video: TmdbVideo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-emerald-500/40 hover:scale-[1.02] cursor-pointer"
    >
      <img
        src={getYouTubeThumbnail(video.key)}
        alt={video.name}
        className="h-full w-full object-cover opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/20">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-110">
          <Play size={20} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <p className="truncate text-xs font-bold text-white text-left">{video.name}</p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-300">
          <span className="rounded bg-white/20 px-1.5 py-0.5 uppercase font-bold">{video.type}</span>
          {video.official && <span className="text-emerald-400 font-semibold">Official</span>}
        </div>
      </div>
    </button>
  );
}

// Review card
export function ReviewCard({ review }: { review: TmdbReview }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.content.length > 300;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 text-sm font-black text-white">
          {review.author[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{review.author}</p>
          {review.rating != null && (
            <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
              ⭐ {review.rating}/10
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-300">
        {expanded ? review.content : isLong ? review.content.slice(0, 300) + '...' : review.content}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
        >
          {expanded ? 'Show Less' : 'Read Full Review'}
        </button>
      )}
    </div>
  );
}

// Skeleton loaders matching Image 1 2:3 vertical poster cards
export function SkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="content-section">
      <div className="section-heading mb-3">
        <div className="skeleton h-6 w-44 rounded-md" />
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-hidden pb-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="w-[135px] sm:w-[165px] md:w-[190px] aspect-[2/3] flex-shrink-0 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse"
        />
      ))}
    </div>
  );
}
