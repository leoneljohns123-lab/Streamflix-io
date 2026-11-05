import { TMDB_API_KEY, TMDB_BASE_URL } from './tmdb-config';
import type {
  TmdbMovie,
  TmdbTv,
  TmdbSeason,
  TmdbPerson,
  TmdbSearchResults,
  TmdbCollection,
  TmdbVideo,
} from './tmdb-types';

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data as T;
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDb API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json() as T;
  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

// Movies
export function getTrendingMovies(page = 1): Promise<{ results: TmdbMovie[]; total_pages?: number; page?: number }> {
  return tmdbFetch('/trending/movie/week', { page: String(page) });
}

export function getPopularMovies(page = 1): Promise<{ results: TmdbMovie[]; total_pages: number; page: number }> {
  return tmdbFetch('/movie/popular', { page: String(page) });
}

export function getTopRatedMovies(page = 1): Promise<{ results: TmdbMovie[]; total_pages: number; page: number }> {
  return tmdbFetch('/movie/top_rated', { page: String(page) });
}

export function getNowPlayingMovies(page = 1): Promise<{ results: TmdbMovie[]; total_pages: number; page: number }> {
  return tmdbFetch('/movie/now_playing', { page: String(page) });
}

export function getUpcomingMovies(page = 1): Promise<{ results: TmdbMovie[]; total_pages: number; page: number }> {
  return tmdbFetch('/movie/upcoming', { page: String(page) });
}

export function getMovieDetails(id: number): Promise<TmdbMovie> {
  return tmdbFetch(`/movie/${id}`, {
    append_to_response: 'alternative_titles,credits,external_ids,images,keywords,recommendations,reviews,similar,videos,watch_providers,release_dates',
  });
}

export function getMovieCollection(id: number): Promise<TmdbCollection> {
  return tmdbFetch(`/collection/${id}`);
}

export function getMovieVideos(id: number): Promise<{ id: number; results: TmdbVideo[] }> {
  return tmdbFetch(`/movie/${id}/videos`);
}

// TV
export function getTrendingTv(page = 1): Promise<{ results: TmdbTv[]; total_pages?: number; page?: number }> {
  return tmdbFetch('/trending/tv/week', { page: String(page) });
}

export function getPopularTv(page = 1): Promise<{ results: TmdbTv[]; total_pages: number; page: number }> {
  return tmdbFetch('/tv/popular', { page: String(page) });
}

export function getTopRatedTv(page = 1): Promise<{ results: TmdbTv[]; total_pages: number; page: number }> {
  return tmdbFetch('/tv/top_rated', { page: String(page) });
}

export function getAiringTodayTv(page = 1): Promise<{ results: TmdbTv[]; total_pages: number; page: number }> {
  return tmdbFetch('/tv/airing_today', { page: String(page) });
}

export function getOnTheAirTv(page = 1): Promise<{ results: TmdbTv[]; total_pages: number; page: number }> {
  return tmdbFetch('/tv/on_the_air', { page: String(page) });
}

export function getTvDetails(id: number): Promise<TmdbTv> {
  return tmdbFetch(`/tv/${id}`, {
    append_to_response: 'alternative_titles,credits,external_ids,images,keywords,recommendations,reviews,similar,videos,watch_providers',
  });
}

export function getTvVideos(id: number): Promise<{ id: number; results: TmdbVideo[] }> {
  return tmdbFetch(`/tv/${id}/videos`);
}

export function getTvSeason(tvId: number, seasonNumber: number): Promise<TmdbSeason> {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

// People
export function getPersonDetails(personId: number): Promise<TmdbPerson> {
  return tmdbFetch(`/person/${personId}`, {
    append_to_response: 'movie_credits,tv_credits,combined_credits,images,external_ids',
  });
}

// Search
export function searchMulti(query: string, page = 1): Promise<TmdbSearchResults> {
  return tmdbFetch('/search/multi', { query, page: String(page) });
}

export function searchMovies(query: string, page = 1): Promise<TmdbSearchResults> {
  return tmdbFetch('/search/movie', { query, page: String(page) });
}

export function searchTv(query: string, page = 1): Promise<TmdbSearchResults> {
  return tmdbFetch('/search/tv', { query, page: String(page) });
}

// Discover by genre
export function discoverMovies(genreId: number, page = 1): Promise<{ results: TmdbMovie[]; total_pages: number; page: number }> {
  return tmdbFetch('/discover/movie', { with_genres: String(genreId), page: String(page), sort_by: 'popularity.desc' });
}

export function discoverTv(genreId: number, page = 1): Promise<{ results: TmdbTv[]; total_pages: number; page: number }> {
  return tmdbFetch('/discover/tv', { with_genres: String(genreId), page: String(page), sort_by: 'popularity.desc' });
}

export function discoverMoviesAdvanced(params: Record<string, string> = {}): Promise<{ results: TmdbMovie[]; total_pages: number; page: number }> {
  return tmdbFetch('/discover/movie', { sort_by: 'popularity.desc', ...params });
}

export function discoverTvAdvanced(params: Record<string, string> = {}): Promise<{ results: TmdbTv[]; total_pages: number; page: number }> {
  return tmdbFetch('/discover/tv', { sort_by: 'popularity.desc', ...params });
}

export function getMovieGenres(): Promise<{ genres: { id: number; name: string }[] }> {
  return tmdbFetch('/genre/movie/list');
}

export function getTvGenres(): Promise<{ genres: { id: number; name: string }[] }> {
  return tmdbFetch('/genre/tv/list');
}
