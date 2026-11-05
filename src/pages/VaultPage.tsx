import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FolderArchive,
  ArrowLeft,
  Sparkles,
  Film,
  Tv,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import {
  discoverMovies,
  discoverTv,
  discoverMoviesAdvanced,
  discoverTvAdvanced,
  getTrendingMovies,
  getTrendingTv,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  getTopRatedTv,
  getNowPlayingMovies,
  getUpcomingMovies,
  getOnTheAirTv,
  searchMulti,
  searchMovies,
  searchTv,
} from '@/lib/tmdb';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { PosterCard, SkeletonGrid } from '@/components/Cards';
import { navigate } from '@/lib/router';

export interface VaultFileMeta {
  targetId: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  heroBadge: string;
  accentColor: string;
  defaultMediaType: 'all' | 'movie' | 'tv';
  genreName?: string;
  matchesArchive?: (item: TmdbMovie | TmdbTv) => boolean;
  fetch: (
    page: number,
    filter: 'all' | 'movie' | 'tv',
    sortBy: string
  ) => Promise<{ results: (TmdbMovie | TmdbTv)[]; hasMore: boolean }>;
}

// Complete registry of all Vault files with rich data fetching and archive validation
const VAULT_REGISTRY: Record<string, VaultFileMeta> = {
  // 1. ANIME UNIVERSES
  section_reg_anime: {
    targetId: 'section_reg_anime',
    slug: 'anime',
    name: '⚡ Anime Universes',
    category: 'Regional & World Cinema',
    tagline: 'Shonen epics, isekai adventures, psychological mecha, and acclaimed Japanese animation.',
    heroBadge: 'Pure Anime Archive',
    accentColor: 'from-amber-500/20 via-orange-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Anime',
    matchesArchive: (item) => {
      const isJapanese = item.original_language === 'ja';
      const isAnim = item.genre_ids?.includes(16) || (item.genres && item.genres.some((g) => g.id === 16));
      return Boolean(isJapanese && (isAnim || /anime/i.test(item.overview || '')));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'movie') {
        const res = await discoverMoviesAdvanced({
          with_original_language: 'ja',
          with_genres: '16',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({
          with_original_language: 'ja',
          with_genres: '16',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const [tvRes, movieRes] = await Promise.all([
        discoverTvAdvanced({
          with_original_language: 'ja',
          with_genres: '16',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        }),
        discoverMoviesAdvanced({
          with_original_language: 'ja',
          with_genres: '16',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        }),
      ]);
      const combined: (TmdbMovie | TmdbTv)[] = [];
      const maxLen = Math.max(tvRes.results.length, movieRes.results.length);
      for (let i = 0; i < maxLen; i++) {
        if (tvRes.results[i]) combined.push(tvRes.results[i]);
        if (movieRes.results[i]) combined.push(movieRes.results[i]);
      }
      return {
        results: combined,
        hasMore: page < Math.max(tvRes.total_pages || 1, movieRes.total_pages || 1),
      };
    },
  },

  // 2. K-DRAMA
  section_reg_kdrama: {
    targetId: 'section_reg_kdrama',
    slug: 'kdrama',
    name: '🌸 K-Drama Addictions',
    category: 'Regional & World Cinema',
    tagline: 'Romantic comedy, thrilling revenge sagas, historical court politics, and Seoul mysteries.',
    heroBadge: 'Korean Drama Vault',
    accentColor: 'from-pink-500/20 via-purple-600/10 to-transparent',
    defaultMediaType: 'tv',
    genreName: 'K-Drama',
    matchesArchive: (item) => item.original_language === 'ko',
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverTvAdvanced({
        with_original_language: 'ko',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 3. KOREAN MOVIES
  section_reg_korean_movies: {
    targetId: 'section_reg_korean_movies',
    slug: 'korean-movies',
    name: '🎬 Korean Movies',
    category: 'Regional & World Cinema',
    tagline: 'High-concept thrillers, neo-noir police procedurals, auteur cinema, and Cannes prize winners.',
    heroBadge: 'Korean Cinema Masterworks',
    accentColor: 'from-indigo-500/20 via-blue-600/10 to-transparent',
    defaultMediaType: 'movie',
    genreName: 'Korean Cinema',
    matchesArchive: (item) => item.original_language === 'ko',
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverMoviesAdvanced({
        with_original_language: 'ko',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 4. BOLLYWOOD
  section_reg_bollywood: {
    targetId: 'section_reg_bollywood',
    slug: 'bollywood',
    name: '🇮🇳 Bollywood Blockbusters',
    category: 'Regional & World Cinema',
    tagline: 'Musical epics, grand scale action extravaganzas, emotional family sagas, and Hindi cinema.',
    heroBadge: 'Indian Cinema Spotlight',
    accentColor: 'from-amber-600/20 via-yellow-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Bollywood & Indian Cinema',
    matchesArchive: (item) => item.original_language === 'hi' || item.original_language === 'te' || item.original_language === 'ta',
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({
          with_original_language: 'hi',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({
        with_original_language: 'hi',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 5. TURKISH SERIES
  section_reg_turkish: {
    targetId: 'section_reg_turkish',
    slug: 'turkish',
    name: '🇹🇷 Turkish Series',
    category: 'Regional & World Cinema',
    tagline: 'Historical Ottoman empires, Istanbul high society romance, dramatic revenge, and dizi sagas.',
    heroBadge: 'Turkish Dizi Vault',
    accentColor: 'from-red-600/20 via-rose-700/10 to-transparent',
    defaultMediaType: 'tv',
    genreName: 'Turkish Dizi',
    matchesArchive: (item) => item.original_language === 'tr',
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverTvAdvanced({
        with_original_language: 'tr',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 6. MADE IN AFRICA
  section_made_in_africa: {
    targetId: 'section_made_in_africa',
    slug: 'africa',
    name: '🌍 Made in Africa',
    category: 'Regional & World Cinema',
    tagline: 'Groundbreaking cinema and serial storytelling celebrating African creators across the continent.',
    heroBadge: 'Pan-African Cinema',
    accentColor: 'from-emerald-600/20 via-teal-700/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'African Cinema',
    matchesArchive: (item) => Boolean(item.origin_country?.some((c) => ['NG', 'KE', 'ZA', 'EG', 'GH', 'TZ', 'UG'].includes(c))),
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({
          with_origin_country: 'NG|KE|ZA|EG|GH',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({
        with_origin_country: 'NG|KE|ZA|EG|GH',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 7. KENYAN CINEMA
  section_reg_kenya: {
    targetId: 'section_reg_kenya',
    slug: 'kenya',
    name: '🇰🇪 Kenyan Cinema & Stories',
    category: 'Regional & World Cinema',
    tagline: 'Authentic Kenyan cinema, Nairobi urban dramas, coastal Swahili sagas, and local productions.',
    heroBadge: 'Kenya & East Africa Archive',
    accentColor: 'from-emerald-700/20 via-red-800/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Kenyan Cinema',
    matchesArchive: (item) => Boolean(item.origin_country?.includes('KE') || item.original_language === 'sw'),
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverMoviesAdvanced({
        with_origin_country: 'KE|NG',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 8. AFRICAN TV
  section_reg_african_tv: {
    targetId: 'section_reg_african_tv',
    slug: 'african-tv',
    name: '📺 African TV Series',
    category: 'Regional & World Cinema',
    tagline: 'Top-tier serialized television produced across Nigeria, South Africa, Kenya, and Ghana.',
    heroBadge: 'African Television Vault',
    accentColor: 'from-amber-600/20 via-emerald-800/10 to-transparent',
    defaultMediaType: 'tv',
    genreName: 'African Television',
    matchesArchive: (item) => Boolean(item.origin_country?.some((c) => ['NG', 'KE', 'ZA', 'EG', 'GH'].includes(c))),
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverTvAdvanced({
        with_origin_country: 'NG|ZA|KE|GH',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 9. NOLLYWOOD
  section_reg_nollywood: {
    targetId: 'section_reg_nollywood',
    slug: 'nollywood',
    name: '🇳🇬 Nollywood Hits',
    category: 'Regional & World Cinema',
    tagline: 'The vibrant powerhouse of African storytelling: Lagos drama, comedies, and epic folklore.',
    heroBadge: 'Nollywood Direct',
    accentColor: 'from-green-600/20 via-emerald-700/10 to-transparent',
    defaultMediaType: 'movie',
    genreName: 'Nollywood',
    matchesArchive: (item) => Boolean(item.origin_country?.includes('NG')),
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverMoviesAdvanced({
        with_origin_country: 'NG',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 10. BLACK CINEMA
  section_reg_black_cinema: {
    targetId: 'section_reg_black_cinema',
    slug: 'black-cinema',
    name: '✊ Global Black Cinema',
    category: 'Regional & World Cinema',
    tagline: 'Powerful voices, historical moments, cultural identity, and groundbreaking diaspora stories.',
    heroBadge: 'Diaspora & Black Cinema',
    accentColor: 'from-purple-900/20 via-amber-900/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Black Cinema & Drama',
    matchesArchive: (item) => true,
    fetch: async (page, _filter, sortBy) => {
      const res = await discoverMoviesAdvanced({
        with_genres: '18',
        with_keywords: '10183|1701|207317',
        page: String(page),
        sort_by: sortBy || 'popularity.desc',
      });
      if (res.results.length === 0) {
        const fallback = await discoverMovies(18, page);
        return { results: fallback.results, hasMore: page < fallback.total_pages };
      }
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 11. ACTION
  section_genre_action: {
    targetId: 'section_genre_action',
    slug: 'action',
    name: '💥 Action & Adrenaline',
    category: 'Film & Series Genres',
    tagline: 'High-octane shootouts, car chases, martial arts choreography, and adrenaline spectacles.',
    heroBadge: 'Action & Adventure',
    accentColor: 'from-red-600/20 via-orange-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Action',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [28, 10759, 12].includes(id)) || Boolean(item.genres?.some((g) => [28, 10759, 12].includes(g.id) || /action/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'movie') {
        const res = await discoverMoviesAdvanced({ with_genres: '28', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '10759', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const [mRes, tvRes] = await Promise.all([
        discoverMoviesAdvanced({ with_genres: '28', page: String(page), sort_by: sortBy || 'popularity.desc' }),
        discoverTvAdvanced({ with_genres: '10759', page: String(page), sort_by: sortBy || 'popularity.desc' }),
      ]);
      const mixed: (TmdbMovie | TmdbTv)[] = [];
      const maxLen = Math.max(mRes.results.length, tvRes.results.length);
      for (let i = 0; i < maxLen; i++) {
        if (mRes.results[i]) mixed.push(mRes.results[i]);
        if (tvRes.results[i]) mixed.push(tvRes.results[i]);
      }
      return { results: mixed, hasMore: page < Math.max(mRes.total_pages || 1, tvRes.total_pages || 1) };
    },
  },

  // 12. COMEDY
  section_genre_comedy: {
    targetId: 'section_genre_comedy',
    slug: 'comedy',
    name: '😂 Comedy & Laughs',
    category: 'Film & Series Genres',
    tagline: 'Feel-good comedy, side-splitting satire, stand-up specials, and hilarious misadventures.',
    heroBadge: 'Comedy Central',
    accentColor: 'from-yellow-500/20 via-amber-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Comedy',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      if (gids.includes(35)) return true;
      if (item.genres && item.genres.some((g) => g.id === 35 || /comedy/i.test(g.name))) return true;
      return false;
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'movie') {
        const res = await discoverMoviesAdvanced({
          with_genres: '35',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({
          with_genres: '35',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      // 'all': Interleave comedy movies and TV shows
      const [mRes, tvRes] = await Promise.all([
        discoverMoviesAdvanced({
          with_genres: '35',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        }),
        discoverTvAdvanced({
          with_genres: '35',
          page: String(page),
          sort_by: sortBy || 'popularity.desc',
        }),
      ]);
      const mixed: (TmdbMovie | TmdbTv)[] = [];
      const maxLen = Math.max(mRes.results.length, tvRes.results.length);
      for (let i = 0; i < maxLen; i++) {
        if (mRes.results[i]) mixed.push(mRes.results[i]);
        if (tvRes.results[i]) mixed.push(tvRes.results[i]);
      }
      return {
        results: mixed,
        hasMore: page < Math.max(mRes.total_pages || 1, tvRes.total_pages || 1),
      };
    },
  },

  // 13. HORROR
  section_genre_horror: {
    targetId: 'section_genre_horror',
    slug: 'horror',
    name: '😱 Horror & Spine Chilling',
    category: 'Film & Series Genres',
    tagline: 'Supernatural hauntings, psychological dread, creature features, and slasher icons.',
    heroBadge: 'Horror & Paranormal',
    accentColor: 'from-purple-900/30 via-red-900/15 to-transparent',
    defaultMediaType: 'movie',
    genreName: 'Horror',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [27, 9648].includes(id)) || Boolean(item.genres?.some((g) => [27, 9648].includes(g.id) || /horror/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '9648', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '27', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 14. THRILLER
  section_genre_thriller: {
    targetId: 'section_genre_thriller',
    slug: 'thriller',
    name: '🔍 Psychological Thrillers',
    category: 'Film & Series Genres',
    tagline: 'Edge-of-your-seat suspense, mind-bending twists, noir conspiracies, and cat-and-mouse tension.',
    heroBadge: 'Psychological Thrillers',
    accentColor: 'from-cyan-600/20 via-blue-900/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Thriller',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [53, 9648].includes(id)) || Boolean(item.genres?.some((g) => [53, 9648].includes(g.id) || /thriller/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '9648', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '53', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 15. ROMANCE
  section_genre_romance: {
    targetId: 'section_genre_romance',
    slug: 'romance',
    name: '❤️ Romance & Drama',
    category: 'Film & Series Genres',
    tagline: 'Heartfelt emotional journeys, modern romance, tearjerkers, and unforgettable relationship sagas.',
    heroBadge: 'Romance & Drama',
    accentColor: 'from-rose-500/20 via-pink-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Romance',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [10749, 18].includes(id)) || Boolean(item.genres?.some((g) => [10749, 18].includes(g.id) || /romance/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '18', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '10749', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 16. SCI-FI
  section_genre_scifi: {
    targetId: 'section_genre_scifi',
    slug: 'scifi',
    name: '🚀 Sci-Fi & Future Realities',
    category: 'Film & Series Genres',
    tagline: 'Deep space exploration, cyberpunk cities, parallel dimensions, time travel, and synthetic AI.',
    heroBadge: 'Science Fiction & Cyberpunk',
    accentColor: 'from-cyan-500/20 via-teal-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Sci-Fi',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [878, 10765].includes(id)) || Boolean(item.genres?.some((g) => [878, 10765].includes(g.id) || /sci-fi|science fiction/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '10765', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '878', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 17. FANTASY
  section_genre_fantasy: {
    targetId: 'section_genre_fantasy',
    slug: 'fantasy',
    name: '🧙 Fantasy & Mythic Realms',
    category: 'Film & Series Genres',
    tagline: 'High fantasy, mystical swords, dragons, magical kingdoms, and ancient mythologies.',
    heroBadge: 'Fantasy & Magic',
    accentColor: 'from-purple-600/20 via-violet-700/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Fantasy',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [14, 10765].includes(id)) || Boolean(item.genres?.some((g) => [14, 10765].includes(g.id) || /fantasy/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '10765', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '14', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 18. CRIME
  section_genre_crime: {
    targetId: 'section_genre_crime',
    slug: 'crime',
    name: '🔫 Crime & Mob Heists',
    category: 'Film & Series Genres',
    tagline: 'Undercover operations, syndicate heists, mafia families, and procedural investigations.',
    heroBadge: 'Crime & Heist',
    accentColor: 'from-slate-600/20 via-zinc-700/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Crime',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.some((id) => [80, 53].includes(id)) || Boolean(item.genres?.some((g) => [80, 53].includes(g.id) || /crime/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '80', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '80', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 19. ANIMATION
  section_genre_animation: {
    targetId: 'section_genre_animation',
    slug: 'animation',
    name: '🎨 Animation & Family Classics',
    category: 'Film & Series Genres',
    tagline: 'Visually stunning CGI and hand-drawn masterworks from leading world animation studios.',
    heroBadge: 'Animation Studio',
    accentColor: 'from-sky-500/20 via-blue-600/10 to-transparent',
    defaultMediaType: 'all',
    genreName: 'Animation',
    matchesArchive: (item) => {
      const gids = item.genre_ids || [];
      return gids.includes(16) || Boolean(item.genres?.some((g) => g.id === 16 || /animation/i.test(g.name)));
    },
    fetch: async (page, filter, sortBy) => {
      if (filter === 'tv') {
        const res = await discoverTvAdvanced({ with_genres: '16', page: String(page), sort_by: sortBy || 'popularity.desc' });
        return { results: res.results, hasMore: page < (res.total_pages || 1) };
      }
      const res = await discoverMoviesAdvanced({ with_genres: '16', page: String(page), sort_by: sortBy || 'popularity.desc' });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 20. TRENDING
  section_trending: {
    targetId: 'section_trending',
    slug: 'trending',
    name: '🔥 Trending Top 10',
    category: 'Featured Highlights',
    tagline: 'The absolute hottest titles capturing audience attention across the world today.',
    heroBadge: 'Global Trending',
    accentColor: 'from-amber-500/20 via-red-600/10 to-transparent',
    defaultMediaType: 'all',
    matchesArchive: () => true,
    fetch: async (page, filter) => {
      if (filter === 'tv') {
        const res = await getTrendingTv(page);
        return { results: res.results, hasMore: page < (res.total_pages || 10) };
      }
      if (filter === 'movie') {
        const res = await getTrendingMovies(page);
        return { results: res.results, hasMore: page < (res.total_pages || 10) };
      }
      const [m, t] = await Promise.all([getTrendingMovies(page), getTrendingTv(page)]);
      const mixed: (TmdbMovie | TmdbTv)[] = [];
      for (let i = 0; i < Math.max(m.results.length, t.results.length); i++) {
        if (m.results[i]) mixed.push(m.results[i]);
        if (t.results[i]) mixed.push(t.results[i]);
      }
      return { results: mixed, hasMore: page < Math.max(m.total_pages || 10, t.total_pages || 10) };
    },
  },

  // 21. POPULAR THIS WEEK
  section_popular_this_week: {
    targetId: 'section_popular_this_week',
    slug: 'popular-this-week',
    name: '🌟 Popular This Week',
    category: 'Featured Highlights',
    tagline: 'Most streamed cinema and serial entertainment currently dominating viewing charts.',
    heroBadge: 'Weekly Popularity',
    accentColor: 'from-yellow-500/20 via-amber-600/10 to-transparent',
    defaultMediaType: 'all',
    matchesArchive: () => true,
    fetch: async (page, filter) => {
      if (filter === 'tv') {
        const res = await getPopularTv(page);
        return { results: res.results, hasMore: page < res.total_pages };
      }
      const res = await getPopularMovies(page);
      return { results: res.results, hasMore: page < res.total_pages };
    },
  },

  // 22. NEW RELEASES
  section_new_releases: {
    targetId: 'section_new_releases',
    slug: 'new-releases',
    name: '🆕 New Releases',
    category: 'Featured Highlights',
    tagline: 'Fresh theatrical arrivals, newly dropped seasons, and direct-to-digital premieres.',
    heroBadge: 'Fresh Releases',
    accentColor: 'from-emerald-500/20 via-teal-600/10 to-transparent',
    defaultMediaType: 'all',
    matchesArchive: () => true,
    fetch: async (page, filter) => {
      if (filter === 'tv') {
        const res = await getOnTheAirTv(page);
        return { results: res.results, hasMore: page < res.total_pages };
      }
      const res = await getNowPlayingMovies(page);
      return { results: res.results, hasMore: page < res.total_pages };
    },
  },

  // 23. COMING SOON
  section_coming_soon: {
    targetId: 'section_coming_soon',
    slug: 'coming-soon',
    name: '📅 Coming Soon',
    category: 'Featured Highlights',
    tagline: 'Upcoming blockbuster premieres and scheduled television debuts arriving in theaters.',
    heroBadge: 'Upcoming Slate',
    accentColor: 'from-blue-500/20 via-indigo-600/10 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await getUpcomingMovies(page);
      return { results: res.results, hasMore: page < res.total_pages };
    },
  },

  // 24. TOP RATED
  section_top_rated: {
    targetId: 'section_top_rated',
    slug: 'top-rated',
    name: '⭐ Top Rated Masterworks',
    category: 'Featured Highlights',
    tagline: 'Timeless masterpieces holding the highest critical ratings and audience approval.',
    heroBadge: 'Hall of Fame',
    accentColor: 'from-amber-400/20 via-yellow-500/10 to-transparent',
    defaultMediaType: 'all',
    matchesArchive: () => true,
    fetch: async (page, filter) => {
      if (filter === 'tv') {
        const res = await getTopRatedTv(page);
        return { results: res.results, hasMore: page < res.total_pages };
      }
      const res = await getTopRatedMovies(page);
      return { results: res.results, hasMore: page < res.total_pages };
    },
  },

  // 25. HIDDEN GEMS
  section_hidden_gems: {
    targetId: 'section_hidden_gems',
    slug: 'hidden-gems',
    name: '💎 Hidden Gems',
    category: 'Curated & Special Sections',
    tagline: 'Under-the-radar cinematic treasures with phenomenal scores that deserve your attention.',
    heroBadge: 'Curator Discoveries',
    accentColor: 'from-cyan-400/20 via-blue-500/10 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await discoverMoviesAdvanced({
        'vote_average.gte': '7.8',
        'vote_count.gte': '150',
        'vote_count.lte': '4000',
        sort_by: 'vote_average.desc',
        page: String(page),
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 26. STAFF PICKS
  section_staff_picks: {
    targetId: 'section_staff_picks',
    slug: 'staff-picks',
    name: '✨ StreamFlix Staff Picks',
    category: 'Curated & Special Sections',
    tagline: 'Personal favorites and essential viewings curated weekly by the StreamFlix editorial team.',
    heroBadge: 'Editorial Selection',
    accentColor: 'from-purple-500/20 via-pink-600/10 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await getTopRatedMovies(page);
      return { results: res.results, hasMore: page < res.total_pages };
    },
  },

  // 27. WEEKEND WATCH
  section_weekend_watch: {
    targetId: 'section_weekend_watch',
    slug: 'weekend-watch',
    name: '🛋️ Weekend Watch',
    category: 'Curated & Special Sections',
    tagline: 'Epic length entertainment, multi-part thrillers, and immersive films for your days off.',
    heroBadge: 'Weekend Binge',
    accentColor: 'from-amber-600/20 via-orange-600/10 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await discoverMoviesAdvanced({
        'with_runtime.gte': '125',
        sort_by: 'popularity.desc',
        page: String(page),
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 28. LATE NIGHT MOVIES
  section_late_night: {
    targetId: 'section_late_night',
    slug: 'late-night',
    name: '🌙 Late Night Movies',
    category: 'Curated & Special Sections',
    tagline: 'Atmospheric neo-noir, unsettling psychological thrillers, and dark mysteries after hours.',
    heroBadge: 'After Midnight',
    accentColor: 'from-indigo-950/40 via-blue-900/20 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await discoverMoviesAdvanced({
        with_genres: '53,27',
        sort_by: 'popularity.desc',
        page: String(page),
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 29. FAMILY MOVIE NIGHT
  section_family_night: {
    targetId: 'section_family_night',
    slug: 'family-night',
    name: '🍿 Family Movie Night',
    category: 'Curated & Special Sections',
    tagline: 'Delightful all-ages animated wonders, fantasy quests, and wholesome family adventures.',
    heroBadge: 'All Ages Welcome',
    accentColor: 'from-amber-400/20 via-yellow-500/10 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await discoverMoviesAdvanced({
        with_genres: '10751,16',
        sort_by: 'popularity.desc',
        page: String(page),
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 30. UNDER 90 MINUTES
  section_under_90_minutes: {
    targetId: 'section_under_90_minutes',
    slug: 'under-90-minutes',
    name: '⏱️ Movies Under 90 Minutes',
    category: 'Curated & Special Sections',
    tagline: 'Fast-paced, tight cinema under an hour and a half with zero fluff or pacing lag.',
    heroBadge: 'Compact Cinema',
    accentColor: 'from-emerald-500/20 via-teal-600/10 to-transparent',
    defaultMediaType: 'movie',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await discoverMoviesAdvanced({
        'with_runtime.lte': '90',
        'with_runtime.gte': '60',
        sort_by: 'popularity.desc',
        page: String(page),
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },

  // 31. SHORT TV & MINI-SERIES
  section_short_tv: {
    targetId: 'section_short_tv',
    slug: 'short-tv',
    name: '📱 Short TV & Mini-Series',
    category: 'Curated & Special Sections',
    tagline: 'High-impact limited series, tight anthologies, and bingeable short-format storytelling.',
    heroBadge: 'Limited Series',
    accentColor: 'from-blue-600/20 via-cyan-600/10 to-transparent',
    defaultMediaType: 'tv',
    matchesArchive: () => true,
    fetch: async (page) => {
      const res = await discoverTvAdvanced({
        page: String(page),
        sort_by: 'popularity.desc',
      });
      return { results: res.results, hasMore: page < (res.total_pages || 1) };
    },
  },
};

// Helper to look up metadata by targetId, slug, or search term
function resolveVaultMeta(idOrSlug: string): VaultFileMeta {
  if (!idOrSlug) return VAULT_REGISTRY.section_reg_anime;

  // Direct key lookup
  if (VAULT_REGISTRY[idOrSlug]) {
    return VAULT_REGISTRY[idOrSlug];
  }

  // Lookup by slug (e.g. 'anime', 'kdrama', 'action', 'comedy')
  const bySlug = Object.values(VAULT_REGISTRY).find(
    (v) => v.slug.toLowerCase() === idOrSlug.toLowerCase()
  );
  if (bySlug) return bySlug;

  // Normalized search against targetId
  const cleanId = idOrSlug.replace(/^section_/, '');
  const byClean = Object.values(VAULT_REGISTRY).find((v) =>
    v.targetId.includes(cleanId) || v.slug.includes(cleanId)
  );
  if (byClean) return byClean;

  // Default to Comedy if comedy in name, or Anime if unmatched
  if (/comedy/i.test(idOrSlug)) {
    return VAULT_REGISTRY.section_genre_comedy;
  }
  return VAULT_REGISTRY.section_reg_anime;
}

export function VaultPage({ vaultId }: { vaultId: string }) {
  const meta = resolveVaultMeta(vaultId);

  // Browse state
  const [items, setItems] = useState<(TmdbMovie | TmdbTv)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'tv'>(meta.defaultMediaType);
  const [sortBy, setSortBy] = useState<'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc'>('popularity.desc');

  // Archive Search State
  const [searchFilter, setSearchFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<(TmdbMovie | TmdbTv)[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  // Count of items returned by search that failed this archive's criteria
  const [unmatchedCount, setUnmatchedCount] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchFilter.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Reset & load whenever vaultId changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    setLoading(true);
    setError(null);
    setSearchFilter('');
    setDebouncedSearch('');
    setSearchResults([]);
    setMediaFilter(meta.defaultMediaType);

    meta
      .fetch(1, meta.defaultMediaType, sortBy)
      .then((data) => {
        setItems(data.results);
        setHasMore(data.hasMore);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load vault file', err);
        setError('Failed to load archive content. Please retry.');
        setLoading(false);
      });
  }, [meta.targetId]);

  // Handle media filter or sort change
  const handleFilterOrSortChange = (newFilter: 'all' | 'movie' | 'tv', newSort: typeof sortBy) => {
    setMediaFilter(newFilter);
    setSortBy(newSort);
    setLoading(true);
    setPage(1);

    meta
      .fetch(1, newFilter, newSort)
      .then((data) => {
        setItems(data.results);
        setHasMore(data.hasMore);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  // Lazy loading next page of browse items
  const handleLoadMoreBrowse = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    meta
      .fetch(nextPage, mediaFilter, sortBy)
      .then((data) => {
        setItems((prev) => {
          // Avoid duplicate keys
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueNew = data.results.filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [loading, loadingMore, hasMore, page, meta, mediaFilter, sortBy]);

  // Perform active archive-specific search against TMDB
  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([]);
      setSearchLoading(false);
      setUnmatchedCount(0);
      setSearchHasMore(false);
      return;
    }

    setSearchLoading(true);
    setSearchPage(1);
    setUnmatchedCount(0);

    const executeSearch = async () => {
      try {
        let rawResults: (TmdbMovie | TmdbTv)[] = [];
        let totalPages = 1;

        if (mediaFilter === 'movie') {
          const res = await searchMovies(debouncedSearch, 1);
          rawResults = (res.results || []) as unknown as TmdbMovie[];
          totalPages = res.total_pages || 1;
        } else if (mediaFilter === 'tv') {
          const res = await searchTv(debouncedSearch, 1);
          rawResults = (res.results || []) as unknown as TmdbTv[];
          totalPages = res.total_pages || 1;
        } else {
          const res = await searchMulti(debouncedSearch, 1);
          rawResults = (res.results || [])
            .filter((r) => {
              const mt = (r as { media_type?: string }).media_type;
              return mt === 'movie' || mt === 'tv';
            }) as unknown as (TmdbMovie | TmdbTv)[];
          totalPages = res.total_pages || 1;
        }

        // Apply archive-specific criteria (e.g. is it comedy?)
        const matchesFn = meta.matchesArchive || (() => true);
        const matched: (TmdbMovie | TmdbTv)[] = [];
        let nonMatches = 0;

        for (const item of rawResults) {
          if (matchesFn(item)) {
            matched.push(item);
          } else {
            nonMatches++;
          }
        }

        setSearchResults(matched);
        setUnmatchedCount(nonMatches);
        setSearchHasMore(1 < totalPages);
        setSearchLoading(false);
      } catch (err) {
        console.error('Archive search failed', err);
        setSearchResults([]);
        setSearchLoading(false);
      }
    };

    executeSearch();
  }, [debouncedSearch, mediaFilter, meta]);

  // Lazy loading next page of search items
  const handleLoadMoreSearch = useCallback(() => {
    if (searchLoading || searchLoadingMore || !searchHasMore || !debouncedSearch) return;
    const nextPage = searchPage + 1;
    setSearchLoadingMore(true);

    const loadNext = async () => {
      try {
        let rawResults: (TmdbMovie | TmdbTv)[] = [];
        let totalPages = 1;

        if (mediaFilter === 'movie') {
          const res = await searchMovies(debouncedSearch, nextPage);
          rawResults = (res.results || []) as unknown as TmdbMovie[];
          totalPages = res.total_pages || 1;
        } else if (mediaFilter === 'tv') {
          const res = await searchTv(debouncedSearch, nextPage);
          rawResults = (res.results || []) as unknown as TmdbTv[];
          totalPages = res.total_pages || 1;
        } else {
          const res = await searchMulti(debouncedSearch, nextPage);
          rawResults = (res.results || [])
            .filter((r) => {
              const mt = (r as { media_type?: string }).media_type;
              return mt === 'movie' || mt === 'tv';
            }) as unknown as (TmdbMovie | TmdbTv)[];
          totalPages = res.total_pages || 1;
        }

        const matchesFn = meta.matchesArchive || (() => true);
        const matched: (TmdbMovie | TmdbTv)[] = [];
        for (const item of rawResults) {
          if (matchesFn(item)) {
            matched.push(item);
          }
        }

        setSearchResults((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueNew = matched.filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
        setSearchPage(nextPage);
        setSearchHasMore(nextPage < totalPages);
        setSearchLoadingMore(false);
      } catch {
        setSearchLoadingMore(false);
      }
    };

    loadNext();
  }, [searchLoading, searchLoadingMore, searchHasMore, debouncedSearch, searchPage, mediaFilter, meta]);

  // IntersectionObserver Sentinel for limitless automatic lazy loading
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (debouncedSearch) {
            handleLoadMoreSearch();
          } else {
            handleLoadMoreBrowse();
          }
        }
      },
      { rootMargin: '400px', threshold: 0.05 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [debouncedSearch, handleLoadMoreBrowse, handleLoadMoreSearch]);

  // List of all other vault files for quick switching
  const allVaultFiles = useMemo(() => {
    return Object.values(VAULT_REGISTRY);
  }, []);

  const isSearchActive = Boolean(debouncedSearch);
  const activeItems = isSearchActive ? searchResults : items;
  const isMainLoading = isSearchActive ? searchLoading : loading;
  const isMoreLoading = isSearchActive ? searchLoadingMore : loadingMore;
  const canLoadMore = isSearchActive ? searchHasMore : hasMore;

  return (
    <div className="min-h-screen bg-[#070c12] text-white pb-24">
      {/* HERO ARCHIVE HEADER */}
      <div className={`relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b ${meta.accentColor} px-4 py-10 sm:px-6 lg:px-10`}>
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Home</span>
              </button>
              <span>/</span>
              <span className="text-blue-400 flex items-center gap-1.5">
                <FolderArchive size={14} />
                <span>The Vault</span>
              </span>
              <span>/</span>
              <span className="text-slate-300 font-semibold">{meta.category}</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Sparkles size={13} className="fill-amber-400" />
              <span>{meta.heroBadge}</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="max-w-4xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {meta.name}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {meta.tagline}
            </p>
          </div>

          {/* Quick horizontal switcher across all vault archives */}
          <div className="mt-8 pt-6 border-t border-white/[0.08]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
              Switch Vault Archive File:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {allVaultFiles.map((file) => {
                const isActive = file.targetId === meta.targetId;
                return (
                  <button
                    key={file.targetId}
                    onClick={() => navigate(`/vault/${file.targetId}`)}
                    className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      isActive
                        ? 'border border-blue-400 bg-blue-600/30 text-white shadow-md shadow-blue-500/20'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {file.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR CONTROLS (SEARCH, MEDIA FILTER, SORTING) */}
      <div className="sticky top-[72px] z-20 border-b border-white/[0.08] bg-[#080d13]/95 backdrop-blur-xl px-4 py-3.5 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Media Type Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            <button
              onClick={() => handleFilterOrSortChange('all', sortBy)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                mediaFilter === 'all'
                  ? 'bg-white text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Formats
            </button>
            <button
              onClick={() => handleFilterOrSortChange('tv', sortBy)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                mediaFilter === 'tv'
                  ? 'bg-white text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv size={13} />
              <span>Series</span>
            </button>
            <button
              onClick={() => handleFilterOrSortChange('movie', sortBy)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                mediaFilter === 'movie'
                  ? 'bg-white text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film size={13} />
              <span>Movies</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live in-archive title search */}
            <div className="relative flex-1 sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={`Search ${meta.genreName || meta.slug} titles...`}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            {!isSearchActive && (
              <select
                value={sortBy}
                onChange={(e) =>
                  handleFilterOrSortChange(mediaFilter, e.target.value as typeof sortBy)
                }
                className="rounded-xl border border-white/10 bg-[#0c1422] px-3 py-1.5 text-xs font-bold text-slate-300 focus:border-blue-400 focus:outline-none cursor-pointer"
              >
                <option value="popularity.desc">🔥 Most Popular</option>
                <option value="vote_average.desc">⭐ Highest Rated</option>
                <option value="primary_release_date.desc">🆕 Newest Releases</option>
              </select>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                {activeItems.length} loaded
              </span>
              {canLoadMore && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Continuous lazy loading active" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        {isMainLoading ? (
          <SkeletonGrid count={18} />
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => handleFilterOrSortChange(mediaFilter, sortBy)}
              className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="py-20 px-6 text-center rounded-3xl border border-white/10 bg-white/[0.02] max-w-2xl mx-auto shadow-2xl">
            {isSearchActive ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {unmatchedCount > 0
                    ? `No ${meta.genreName || 'matching'} results found for "${debouncedSearch}"`
                    : `No titles found for "${debouncedSearch}"`}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {unmatchedCount > 0 ? (
                    <>
                      Titles were found matching <span className="text-white font-semibold">"{debouncedSearch}"</span>, but they are <span className="text-amber-400 font-semibold">not {meta.genreName || 'in this category'}</span>. Search in this archive is restricted strictly to {meta.genreName || 'this collection'}.
                    </>
                  ) : (
                    <>
                      No titles in the {meta.genreName || 'vault'} archive matched your query.
                    </>
                  )}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => navigate(`/search?q=${encodeURIComponent(debouncedSearch)}`)}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all cursor-pointer"
                  >
                    <Search size={14} />
                    <span>Search "{debouncedSearch}" Across All Genres</span>
                    <ExternalLink size={12} />
                  </button>

                  <button
                    onClick={() => setSearchFilter('')}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                  >
                    Clear Search & Browse {meta.genreName || 'Archive'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <FolderArchive size={40} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-lg font-bold text-white">No content currently available</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Try adjusting your media format or changing your sorting preference.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {isSearchActive && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs text-blue-200">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-400" />
                  <span>
                    Showing <strong className="text-white font-bold">{activeItems.length}</strong> {meta.genreName || ''} titles matching <strong className="text-white font-bold">"{debouncedSearch}"</strong>
                  </span>
                </div>
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-xs font-bold text-blue-400 hover:text-white cursor-pointer underline"
                >
                  Back to All {meta.genreName || 'Titles'}
                </button>
              </div>
            )}

            {/* Poster Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {activeItems.map((item) => {
                const type =
                  mediaFilter === 'movie'
                    ? 'movie'
                    : mediaFilter === 'tv'
                    ? 'tv'
                    : 'title' in item
                    ? 'movie'
                    : 'tv';

                return <PosterCard key={`${type}-${item.id}`} item={item} mediaType={type} />;
              })}
            </div>

            {/* CONTINUOUS LAZY LOADING STATUS & SENTINEL */}
            {canLoadMore && (
              <div className="mt-12 flex flex-col items-center justify-center">
                {isMoreLoading ? (
                  <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-slate-300 backdrop-blur-md shadow-lg shadow-black/40">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    <span>Loading more {meta.genreName || ''} titles...</span>
                  </div>
                ) : (
                  <button
                    onClick={isSearchActive ? handleLoadMoreSearch : handleLoadMoreBrowse}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-medium text-slate-400 hover:border-white/20 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Scroll or Click to Load More</span>
                  </button>
                )}
                {/* Invisible Intersection Sentinel */}
                <div ref={sentinelRef} className="h-14 w-full pointer-events-none" />
              </div>
            )}

            {!canLoadMore && activeItems.length > 0 && (
              <div className="mt-16 py-8 text-center border-t border-white/[0.06]">
                <p className="text-xs font-bold tracking-wider uppercase text-slate-500">
                  ✓ You've reached the end of the {meta.name.replace(/^[^\w\s]+/, '').trim()} archive catalog
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
