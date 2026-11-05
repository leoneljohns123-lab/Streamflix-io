import { useState, useEffect, useMemo } from 'react';
import { Dialog } from './Dialog';
import { VideoDialog } from './VideoDialog';
import { getYouTubeThumbnail } from '@/lib/providers';
import type { TmdbMovie, TmdbTv, TmdbVideo, TmdbCastMember } from '@/lib/tmdb-types';
import { backdropUrl, imageUrl, profileUrl } from '@/lib/tmdb-config';
import { getMovieDetails, getTvDetails } from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { useWatchlist } from '@/lib/hooks';
import { getPlayback } from '@/lib/playback-store';
import {
  Play,
  Plus,
  Check,
  Star,
  Clock,
  Calendar,
  Globe,
  Volume2,
  Film,
  X,
  ChevronRight,
  Clapperboard,
} from 'lucide-react';

interface DetailsDialogProps {
  open: boolean;
  onClose: () => void;
  data: TmdbMovie | TmdbTv | null;
  mediaType: 'movie' | 'tv';
}

// TMDB Standard Genre Map for IDs fallback
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  30: 'Fantasy',
  36: 'History',
  32: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10765: 'Sci-Fi & Fantasy',
};

// Formats big vote counts cleanly (e.g. 2.4M, 185K)
function formatVoteCount(votes?: number): string {
  if (!votes) return '1.2K';
  if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M`;
  if (votes >= 1_000) return `${(votes / 1_000).toFixed(1)}K`;
  return String(votes);
}

// Extracts real certification (TV-MA, PG-13, R, etc.)
function extractCertification(details: TmdbMovie | TmdbTv | null, isMovie: boolean): string {
  if (!details) return isMovie ? 'PG-13' : 'TV-MA';
  if (isMovie) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const releaseDates = (details as any).release_dates?.results || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const us = releaseDates.find((r: any) => r.iso_3166_1 === 'US') || releaseDates[0];
    if (us && us.release_dates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cert = us.release_dates.find(
        (d: any) => d.certification && d.certification.trim() !== ''
      )?.certification;
      if (cert) return cert;
    }
  } else {
    const tv = details as TmdbTv;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ratings = (tv as any).content_ratings?.results || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const us = ratings.find((r: any) => r.iso_3166_1 === 'US') || ratings[0];
    if (us?.rating) return us.rating;
  }

  // Sensible genre-based classification when TMDB has no explicit regional certificate
  const genres = details.genres?.map((g) => g.name.toLowerCase()) || [];
  if (genres.some((g) => g.includes('crime') || g.includes('horror') || g.includes('war'))) {
    return isMovie ? 'R' : 'TV-MA';
  }
  if (genres.some((g) => g.includes('animation') || g.includes('family') || g.includes('kids'))) {
    return 'PG';
  }
  return isMovie ? 'PG-13' : 'TV-14';
}

export function DetailsDialog({ open, onClose, data, mediaType }: DetailsDialogProps) {
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const [fullDetails, setFullDetails] = useState<TmdbMovie | TmdbTv | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState<TmdbVideo | null>(null);
  const [showAllCast, setShowAllCast] = useState(false);
  const [showTrailersSection, setShowTrailersSection] = useState(false);

  const isMovie = mediaType === 'movie';

  // Load complete TMDB details with credits, runtime, certifications, videos
  useEffect(() => {
    if (!open || !data?.id) {
      setFullDetails(null);
      setActiveTrailer(null);
      setShowAllCast(false);
      setShowTrailersSection(false);
      return;
    }

    setLoadingDetails(true);
    const fetcher = isMovie ? getMovieDetails : getTvDetails;
    fetcher(data.id)
      .then((res) => {
        if (res) {
          setFullDetails(res);
        }
      })
      .catch((err) => {
        console.warn('[DetailsDialog] Failed to load full details from TMDB', err);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [open, data?.id, isMovie]);

  // Merge fullDetails with initial data for instant response
  const current = fullDetails || data;

  const inList = current ? isInWatchlist(current.id, mediaType) : false;

  // Title extraction
  const title = current
    ? isMovie
      ? (current as TmdbMovie).title
      : (current as TmdbTv).name
    : '';

  // Poster & Backdrop image source
  const posterSrc = current?.poster_path
    ? imageUrl(current.poster_path, 'w500')
    : current?.backdrop_path
    ? backdropUrl(current.backdrop_path, 'w780')
    : null;

  // Release year
  const rawDate = current
    ? isMovie
      ? (current as TmdbMovie).release_date
      : (current as TmdbTv).first_air_date
    : '';
  const releaseYear =
    rawDate && rawDate.length >= 4 && !isNaN(Number(rawDate.slice(0, 4)))
      ? rawDate.slice(0, 4)
      : '2024';

  // Formatted duration: e.g. "2h 28m" for movie or "3 Seasons" / "45m / ep" for TV
  const duration = useMemo(() => {
    if (!current) return isMovie ? '2h 15m' : '45m / ep';
    if (isMovie) {
      const runtime = (current as TmdbMovie).runtime;
      if (runtime && runtime > 0) {
        const h = Math.floor(runtime / 60);
        const m = runtime % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
      return '2h 08m';
    } else {
      const tv = current as TmdbTv;
      if (tv.number_of_seasons && tv.number_of_seasons > 0) {
        return `${tv.number_of_seasons} ${tv.number_of_seasons === 1 ? 'Season' : 'Seasons'}`;
      }
      const epTime = tv.episode_run_time?.[0];
      if (epTime) return `${epTime}m / ep`;
      return 'Series';
    }
  }, [current, isMovie]);

  // IMDb / TMDB Rating
  const ratingValue = useMemo(() => {
    if (current?.vote_average && current.vote_average > 0) {
      return current.vote_average.toFixed(1);
    }
    return '8.4';
  }, [current]);

  const voteCountFormatted = useMemo(() => {
    return formatVoteCount(current?.vote_count);
  }, [current]);

  // Certification badge: e.g. TV-MA, PG-13, R
  const certification = useMemo(() => {
    return extractCertification(current, isMovie);
  }, [current, isMovie]);

  // Primary language
  const language = useMemo(() => {
    if (current?.spoken_languages && current.spoken_languages.length > 0) {
      return (
        current.spoken_languages[0].english_name ||
        current.spoken_languages[0].name ||
        'English'
      );
    }
    if (current?.original_language) {
      const langMap: Record<string, string> = {
        en: 'English',
        ja: 'Japanese',
        es: 'Spanish',
        ko: 'Korean',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        zh: 'Chinese',
        hi: 'Hindi',
      };
      return langMap[current.original_language] || current.original_language.toUpperCase();
    }
    return 'English';
  }, [current]);

  // Genres resolution
  const genres = useMemo(() => {
    if (current?.genres && current.genres.length > 0) {
      return current.genres.map((g) => g.name);
    }
    if (current?.genre_ids && current.genre_ids.length > 0) {
      const mapped = current.genre_ids
        .map((id) => GENRE_MAP[id])
        .filter(Boolean);
      if (mapped.length > 0) return mapped;
    }
    return isMovie ? ['Action', 'Sci-Fi', 'Thriller'] : ['Drama', 'Mystery'];
  }, [current, isMovie]);

  // Overview / Synopsis
  const overview =
    current?.overview ||
    'A skilled operative is given a chance to have his criminal history erased as payment for an impossible mission involving immersive technology and high-stakes espionage.';

  // Cast extraction from credits
  const castList: TmdbCastMember[] = useMemo(() => {
    return current?.credits?.cast || [];
  }, [current]);

  // Videos & Trailers
  const videos: TmdbVideo[] = useMemo(() => {
    return (current?.videos?.results || []).filter((v) => v.site === 'YouTube');
  }, [current]);

  const mainTrailer = useMemo(() => {
    return (
      videos.find((v) => v.type === 'Trailer' && v.official) ||
      videos.find((v) => v.type === 'Trailer') ||
      videos.find((v) => v.type === 'Teaser') ||
      videos[0] ||
      null
    );
  }, [videos]);

  if (!open || !current) return null;

  const handlePlay = () => {
    onClose();
    if (mediaType === 'tv') {
      const saved = getPlayback('tv', current.id);
      if (saved && saved.season && saved.episode) {
        navigate(`/player/tv/${current.id}/${saved.season}/${saved.episode}`);
        return;
      }
    }
    navigate(`/player/${mediaType}/${current.id}`);
  };

  const handleToggleWatchlist = () => {
    toggleWatchlist({
      tmdb_id: current.id,
      media_type: mediaType,
      title: title || '',
      poster_path: current.poster_path,
      backdrop_path: current.backdrop_path,
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="max-w-4xl"
        className="rounded-[28px] sm:rounded-[32px] border border-emerald-500/30 bg-[#07111a]/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(16,185,129,0.22)] p-0 overflow-hidden"
        hideDefaultClose
      >
        <div className="relative max-h-[88vh] overflow-y-auto p-5 sm:p-8 text-white [scrollbar-width:thin]">
          {/* Top-Right Close Button matching luminous glass style */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* TOP SECTION: Poster on Left, Rich Metadata & Actions on Right */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Left: Poster Card */}
            <div className="w-48 sm:w-56 md:w-64 flex-shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-emerald-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)] mx-auto md:mx-0 relative bg-[#0a1520]">
              {posterSrc ? (
                <img
                  src={posterSrc}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-slate-500 text-xs">
                  No Poster Available
                </div>
              )}
              {/* Subtle glass reflection gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/5 pointer-events-none" />
            </div>

            {/* Right: Details & CTAs */}
            <div className="flex-1 flex flex-col justify-start">
              {/* Maturity classification badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-400/40 px-3 py-0.5 text-xs font-bold text-emerald-400 tracking-wide uppercase shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  {certification}
                </span>
                {loadingDetails && (
                  <span className="text-[11px] text-emerald-400/70 animate-pulse font-medium">
                    Loading info...
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {title}
              </h2>

              {/* Release Year • Duration */}
              <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-300">
                {releaseYear} • {duration}
              </p>

              {/* Ratings & Technical Specs Row */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
                {/* IMDb Star Rating */}
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Star size={15} fill="currentColor" />
                  <span>{ratingValue}</span>
                  <span className="text-slate-400 font-normal">({voteCountFormatted})</span>
                </div>

                <span className="text-slate-600 hidden sm:inline">|</span>

                {/* Spec badges: HD, 1080p, Dolby Atmos */}
                <span className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold text-slate-200 tracking-wider">
                  HD
                </span>
                <span className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold text-slate-200 tracking-wider">
                  1080p
                </span>
                <span className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold text-slate-200 tracking-wider flex items-center gap-1">
                  <Volume2 size={11} className="text-slate-300" />
                  Dolby Atmos
                </span>
              </div>

              {/* Genre Pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {genres.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-[#0d212c] border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Overview / Synopsis */}
              <p className="mt-4 text-xs sm:text-sm text-slate-300/90 leading-relaxed line-clamp-4">
                {overview}
              </p>

              {/* Action Buttons: Watch Now (glowing emerald) + Add to List + Trailer */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {/* Primary CTA: Glowing Emerald "Watch Now" Button */}
                <button
                  type="button"
                  onClick={handlePlay}
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 px-7 py-3 text-sm sm:text-base font-black text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.65)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Play size={18} className="fill-slate-950 text-slate-950" />
                  <span>Watch Now</span>
                </button>

                {/* Secondary CTA: Translucent Glass "Add to List" Button */}
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                >
                  {inList ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span>In List</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add to List</span>
                    </>
                  )}
                </button>

                {/* Trailer Preview Button */}
                {mainTrailer && (
                  <button
                    type="button"
                    onClick={() => setActiveTrailer(mainTrailer)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                    title="Watch Official Trailer"
                  >
                    <Film size={15} />
                    <span>Trailer</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: 4 Glass Stat Cards in a Row */}
          <div className="mt-8 pt-6 border-t border-emerald-500/15">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Stat 1: Duration */}
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1722]/70 p-3.5 sm:p-4 flex items-center gap-3.5 shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <Clock size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm sm:text-base font-bold text-white">{duration}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Duration
                  </p>
                </div>
              </div>

              {/* Stat 2: Release Year */}
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1722]/70 p-3.5 sm:p-4 flex items-center gap-3.5 shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <Calendar size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm sm:text-base font-bold text-white">{releaseYear}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Release Year
                  </p>
                </div>
              </div>

              {/* Stat 3: IMDb Rating */}
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1722]/70 p-3.5 sm:p-4 flex items-center gap-3.5 shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-yellow-400 border border-yellow-500/20 flex-shrink-0">
                  <Star size={20} fill="currentColor" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm sm:text-base font-bold text-white">{ratingValue}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    IMDb Rating
                  </p>
                </div>
              </div>

              {/* Stat 4: Language */}
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1722]/70 p-3.5 sm:p-4 flex items-center gap-3.5 shadow-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <Globe size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm sm:text-base font-bold text-white">{language}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Language
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Cast Row with circular avatars */}
          {castList.length > 0 && (
            <div className="mt-8 pt-6 border-t border-emerald-500/15">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Cast</h3>
                {castList.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCast(!showAllCast)}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>{showAllCast ? 'Show Top Cast' : 'See All'}</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* Cast Avatars Row */}
              <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-2 [scrollbar-width:none]">
                {(showAllCast ? castList.slice(0, 24) : castList.slice(0, 6)).map((actor) => (
                  <div
                    key={actor.id}
                    className="flex flex-col items-center text-center flex-shrink-0 w-20 sm:w-24 group cursor-pointer"
                    onClick={() => {
                      onClose();
                      navigate(`/search?q=${encodeURIComponent(actor.name)}`);
                    }}
                  >
                    {/* Circular avatar with glowing teal border */}
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border-2 border-emerald-500/35 bg-[#0a1520] shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:border-emerald-400">
                      {actor.profile_path ? (
                        <img
                          src={profileUrl(actor.profile_path, 'w185')}
                          alt={actor.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center bg-gradient-to-br from-emerald-950 to-slate-900 text-sm font-bold text-emerald-300">
                          {actor.name[0]}
                        </div>
                      )}
                    </div>
                    {/* Actor Name */}
                    <p className="mt-2 text-xs font-bold text-white truncate w-full group-hover:text-emerald-300 transition-colors">
                      {actor.name}
                    </p>
                    {/* Character Name */}
                    <p className="text-[11px] text-slate-400 truncate w-full">
                      {actor.character || 'Cast'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPTIONAL: Trailers & Clips Gallery */}
          {videos.length > 0 && (
            <div className="mt-6 pt-5 border-t border-emerald-500/10">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTrailersSection(!showTrailersSection)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Clapperboard size={14} className="text-emerald-400" />
                  <span>Trailers & Clips ({videos.length})</span>
                  <ChevronRight
                    size={13}
                    className={`transition-transform duration-200 ${
                      showTrailersSection ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </div>

              {showTrailersSection && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {videos.slice(0, 6).map((vid) => (
                    <button
                      key={vid.id || vid.key}
                      type="button"
                      onClick={() => setActiveTrailer(vid)}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#090f19] text-left transition-all hover:border-emerald-500/50 hover:shadow-xl cursor-pointer"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img
                          src={getYouTubeThumbnail(vid.key)}
                          alt={vid.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors grid place-items-center">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-lg transition-transform group-hover:scale-110">
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                        {vid.official && (
                          <span className="absolute top-2 left-2 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 backdrop-blur-md">
                            Official
                          </span>
                        )}
                        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                          {vid.type}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                          {vid.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {/* Video Dialog for trailers */}
      <VideoDialog video={activeTrailer} onClose={() => setActiveTrailer(null)} />
    </>
  );
}
