import { useEffect, useState, useCallback, useMemo } from 'react';
import { Play, ListPlus, Star, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Film } from 'lucide-react';
import {
  getTrendingMovies,
  getTrendingTv,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getPopularTv,
  getTopRatedTv,
  discoverMovies,
  discoverTv,
  discoverMoviesAdvanced,
  discoverTvAdvanced,
} from '@/lib/tmdb';
import { backdropUrl } from '@/lib/tmdb-config';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { PosterCard, SkeletonRow } from '@/components/Cards';
import { HomeBannerPromotion, PromotionalCard } from '@/components/Promotions';
import { LazyAdSlot } from '@/components/AdBanners';
import {
  LazyPosterRow,
  ContinueWatchingSection,
  TrendingRankedRow,
  ComingSoonSection,
  TopRatedSection,
  MadeInAfricaSection,
  SurpriseMeBanner,
  PickAMoodSection,
  FeaturedCollectionsSection,
  PopularByYearSection,
} from '@/components/DiscoverySections';
import { RecommendedForYouSection } from '@/components/RecommendedForYouSection';
import { DetailsDialog } from '@/components/DetailsDialog';
import { useWatchlist, useWatchHistory } from '@/lib/hooks';
import { navigate } from '@/lib/router';

export function HomePage() {
  // 1. Initial essential data: Hero & Ranked Trending (immediate load)
  const [heroItems, setHeroItems] = useState<TmdbMovie[]>([]);
  const [trendingRanked, setTrendingRanked] = useState<(TmdbMovie | TmdbTv)[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTrailerOpen, setHeroTrailerOpen] = useState(false);

  // Watch history & Watchlist hooks
  const { continueWatching, removeFromHistory, history } = useWatchHistory();
  const { toggleWatchlist, isInWatchlist, watchlist } = useWatchlist();

  // Dynamic interactive state
  const [africaTab, setAfricaTab] = useState('All');
  const [africaItems, setAfricaItems] = useState<(TmdbMovie | TmdbTv)[]>([]);
  const [africaLoading, setAfricaLoading] = useState(false);

  const [selectedYear, setSelectedYear] = useState(2025);
  const [yearItems, setYearItems] = useState<TmdbMovie[]>([]);

  const [topRatedMovies, setTopRatedMovies] = useState<TmdbMovie[]>([]);
  const [topRatedTv, setTopRatedTv] = useState<TmdbTv[]>([]);

  // Infinite continuation state
  const [endlessBatch, setEndlessBatch] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial load: Only Hero + Trending Top 10 (Rest are loaded strictly ON SCROLL)
  useEffect(() => {
    getTrendingMovies()
      .then((res) => {
        setHeroItems(res.results.slice(0, 5));
        setTrendingRanked(res.results.slice(0, 10));
        setHeroLoading(false);
      })
      .catch(() => setHeroLoading(false));
  }, []);

  // Hero auto-slider
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroItems.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  // Load "Made in Africa" items when tab changes
  useEffect(() => {
    setAfricaLoading(true);
    let countryParam = 'KE|NG|ZA|GH';
    if (africaTab === 'Kenya') countryParam = 'KE';
    else if (africaTab === 'Nigeria') countryParam = 'NG';
    else if (africaTab === 'South Africa') countryParam = 'ZA';
    else if (africaTab === 'Ghana') countryParam = 'GH';

    discoverMoviesAdvanced({ with_origin_country: countryParam })
      .then((res) => {
        if (res.results.length > 0) {
          setAfricaItems(res.results);
        } else {
          // Fallback to broader African cinema query
          return discoverMoviesAdvanced({ with_origin_country: 'KE|NG|ZA|GH' });
        }
      })
      .then((fallback) => {
        if (fallback) setAfricaItems(fallback.results);
        setAfricaLoading(false);
      })
      .catch(() => setAfricaLoading(false));
  }, [africaTab]);

  // Load "Popular by Year" items when year changes
  useEffect(() => {
    discoverMoviesAdvanced({ primary_release_year: String(selectedYear) })
      .then((res) => setYearItems(res.results))
      .catch(() => {});
  }, [selectedYear]);

  // Handle "Surprise Me" randomized selection
  const handleSurpriseMe = useCallback(() => {
    if (trendingRanked.length > 0) {
      const random = trendingRanked[Math.floor(Math.random() * trendingRanked.length)];
      const mediaType = 'title' in random ? 'movie' : 'tv';
      navigate(`/player/${mediaType}/${random.id}`);
    } else {
      getPopularMovies(1).then((data) => {
        const random = data.results[Math.floor(Math.random() * data.results.length)];
        navigate(`/player/movie/${random.id}`);
      });
    }
  }, [trendingRanked]);

  // Handle "Pick a Mood" action
  const handlePickMood = (mood: string) => {
    const moodGenreMap: Record<string, number> = {
      Scary: 27, // Horror
      Funny: 35, // Comedy
      Romantic: 10749, // Romance
      Exciting: 28, // Action
      'Thought-Provoking': 878, // Sci-Fi
    };
    const genreId = moodGenreMap[mood] || 28;
    navigate(`/movies?genre=${genreId}`);
  };

  // Determine dynamic personalized anchor: "Because you watched..."
  const lastWatched = history[0];
  const lastWatchedTitle = lastWatched ? lastWatched.title : 'The Batman';

  const hero = heroItems[heroIndex];

  return (
    <div className="pb-24">
      {/* ========================================================================= */}
      {/* 1. HERO CAROUSEL (INITIAL VIEWPORT ONLY)                                   */}
      {/* ========================================================================= */}
      {heroLoading ? (
        <div className="h-[400px] animate-pulse bg-white/5 lg:h-[500px]" />
      ) : hero ? (
        <section className="hero relative mx-3 mt-[72px] h-[500px] overflow-hidden rounded-b-[3px] sm:mx-5 lg:mx-0 lg:mt-0 lg:h-[500px] lg:rounded-none">
          <img
            className="absolute inset-0 h-full w-full object-cover object-[64%_center] transition-opacity duration-700"
            src={backdropUrl(hero.backdrop_path, 'w1280')}
            alt={hero.title}
          />
          <div className="hero-overlay absolute inset-0" />
          <div className="relative z-10 flex h-full max-w-[560px] flex-col justify-end px-6 pb-12 sm:px-10 lg:justify-center lg:px-9 lg:pb-0">
            <span className="mb-4 w-fit rounded-sm bg-[#b31823] px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              Featured
            </span>
            <h1 className="hero-title">{hero.title}</h1>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              {hero.release_date && <span>{hero.release_date.slice(0, 4)}</span>}
              {hero.vote_average > 0 && (
                <>
                  <i />{' '}
                  <span className="flex items-center gap-1">
                    <Star size={11} fill="currentColor" className="text-yellow-400" />{' '}
                    {hero.vote_average.toFixed(1)}
                  </span>
                </>
              )}
              <i /> <span>Movie</span>
            </div>
            <p className="mt-4 max-w-[470px] text-[13px] leading-6 text-slate-300 line-clamp-3">
              {hero.overview}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/player/movie/${hero.id}`)}
                className="primary-button"
              >
                <Play size={16} fill="currentColor" /> Play
              </button>
              <button
                onClick={() => setHeroTrailerOpen(true)}
                className="secondary-button !bg-red-500/15 !border-red-500/35 text-red-200 hover:text-white hover:!bg-red-500/30"
              >
                <Film size={16} /> Watch Trailer
              </button>
              <button
                onClick={() =>
                  toggleWatchlist({
                    tmdb_id: hero.id,
                    media_type: 'movie',
                    title: hero.title,
                    poster_path: hero.poster_path,
                    backdrop_path: hero.backdrop_path,
                  })
                }
                className="secondary-button"
              >
                <ListPlus size={17} /> {isInWatchlist(hero.id, 'movie') ? 'Added' : 'My List'}
              </button>
            </div>
          </div>

          {/* Hero dots */}
          {heroItems.length > 1 && (
            <div className="absolute bottom-6 right-7 z-10 hidden items-center gap-3 sm:flex">
              <button
                onClick={() => setHeroIndex((i) => (i - 1 + heroItems.length) % heroItems.length)}
                aria-label="Previous"
              >
                <ChevronLeft size={19} className="text-slate-300 hover:text-white" />
              </button>
              <div className="flex gap-2">
                {heroItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === heroIndex ? 'w-6 bg-[#f52432]' : 'w-1.5 bg-slate-500'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setHeroIndex((i) => (i + 1) % heroItems.length)}
                aria-label="Next"
              >
                <ChevronRight size={19} className="text-slate-300 hover:text-white" />
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/* ========================================================================= */}
      {/* 2. CONTINUE WATCHING (PULLS FROM USER'S WATCH HISTORY)                     */}
      {/* ========================================================================= */}
      {(continueWatching && continueWatching.length > 0 ? continueWatching : history).length > 0 && (
        <ContinueWatchingSection
          items={continueWatching.length > 0 ? continueWatching : history}
          onRemove={(id) => removeFromHistory(id)}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. RECOMMENDED FOR YOU (POWERED BY GEMINI AI BASED ON WATCH HISTORY)       */}
      {/* ========================================================================= */}
      <RecommendedForYouSection history={history} />

      {/* Featured Promotional Banner */}
      <HomeBannerPromotion />

      {/* ========================================================================= */}
      {/* 3. 🔥 TRENDING NOW (#1 #2 #3 LARGE NUMBERED CARDS)                        */}
      {/* ========================================================================= */}
      <TrendingRankedRow items={trendingRanked} />

      {/* ADVERTISEMENT PLACEMENT 1: BETWEEN TRENDING & POPULAR THIS WEEK */}
      <LazyAdSlot
        placementId="home_slot_1"
        format="banner"
        customTitle="Upgrade to StreamFlix VIP: 4K HDR & Zero Advertising"
        customCta="Explore VIP"
      />

      {/* ========================================================================= */}
      {/* 4. POPULAR THIS WEEK (LAZY SCROLL LOADED)                                 */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_popular_this_week"
        title="Popular This Week"
        subtitle="The titles capturing global audiences right now"
        fetcher={async () => {
          const [movies, tv] = await Promise.all([getPopularMovies(1), getPopularTv(1)]);
          // Alternate mixed movies and TV
          const mixed: (TmdbMovie | TmdbTv)[] = [];
          const max = Math.max(movies.results.length, tv.results.length);
          for (let i = 0; i < max; i++) {
            if (movies.results[i]) mixed.push(movies.results[i]);
            if (tv.results[i]) mixed.push(tv.results[i]);
          }
          return mixed.slice(0, 16);
        }}
      />

      {/* ========================================================================= */}
      {/* 5. 🆕 NEW RELEASES                                                        */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_new_releases"
        title="New Releases"
        subtitle="Fresh cinema and brand new premiere titles"
        mediaType="movie"
        fetcher={async () => {
          const res = await getNowPlayingMovies(1);
          return res.results;
        }}
      />

      {/* ========================================================================= */}
      {/* 6. RECENTLY ADDED (DISTINCTION FROM NEW RELEASES)                         */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_recently_added"
        title="Recently Added to StreamFlix"
        subtitle="Catalog additions newly encoded in 4K UHD"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            sort_by: 'release_date.desc',
            'vote_count.gte': '80',
          });
          return res.results;
        }}
      />

      {/* ADVERTISEMENT PLACEMENT 2: BETWEEN RECENTLY ADDED & COMING SOON */}
      <LazyAdSlot
        placementId="home_slot_2"
        format="native"
        customTitle="Exclusive Partner Streaming Benefits & Early Screenings"
        customCta="Discover Perks"
      />

      {/* ========================================================================= */}
      {/* 7. COMING SOON (COUNTDOWN + REMIND ME BUTTON)                              */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_coming_soon"
        title="Coming Soon"
        fetcher={async () => {
          const res = await getUpcomingMovies(1);
          return res.results;
        }}
        customRenderer={(items) => <ComingSoonSection items={items as TmdbMovie[]} />}
      />

      {/* In-feed Promotional Card */}
      <PromotionalCard placement="home" />

      {/* ========================================================================= */}
      {/* 8. POPULAR MOVIES                                                         */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_popular_movies"
        title="Popular Movies"
        mediaType="movie"
        fetcher={async () => {
          const res = await getPopularMovies(1);
          return res.results;
        }}
      />

      {/* ========================================================================= */}
      {/* 9. POPULAR TV SHOWS                                                       */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_popular_tv"
        title="Popular TV Shows"
        mediaType="tv"
        fetcher={async () => {
          const res = await getPopularTv(1);
          return res.results;
        }}
      />

      {/* ADVERTISEMENT PLACEMENT 3: BETWEEN POPULAR TV & TOP RATED */}
      <LazyAdSlot
        placementId="home_slot_3"
        format="banner"
        customTitle="StreamFlix Premier Pass: Early Access to Worldwide Premieres"
        customCta="Get Premier Pass"
      />

      {/* ========================================================================= */}
      {/* 10. TOP RATED (WITH INTERACTIVE TABS: MOVIES | TV)                        */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_top_rated_combined"
        title="Top Rated"
        fetcher={async () => {
          const [m, t] = await Promise.all([getTopRatedMovies(1), getTopRatedTv(1)]);
          setTopRatedMovies(m.results);
          setTopRatedTv(t.results);
          return m.results;
        }}
        customRenderer={() => (
          <TopRatedSection movies={topRatedMovies} tvShows={topRatedTv} />
        )}
      />

      {/* ========================================================================= */}
      {/* 11 - 19. GENRE ROWS (ACTION, COMEDY, HORROR, THRILLER, ROMANCE...)         */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_genre_action"
        title="Action & Adrenaline"
        subtitle="High-octane blockbusters and explosive combat"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(28)).results}
      />

      <LazyPosterRow
        rowId="row_genre_comedy"
        title="Comedy & Laughs"
        subtitle="Feel-good humor, stand-up, and satirical hits"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(35)).results}
      />

      <LazyPosterRow
        rowId="row_genre_horror"
        title="Horror & Spine Chilling"
        subtitle="Paranormal frights, slashers, and psychological terror"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(27)).results}
      />

      <LazyPosterRow
        rowId="row_genre_thriller"
        title="Psychological Thrillers"
        subtitle="Unpredictable twists, suspense, and detective intrigue"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(53)).results}
      />

      <LazyPosterRow
        rowId="row_genre_romance"
        title="Romance & Heartfelt Dramas"
        subtitle="Unforgettable love stories and passionate bonds"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(10749)).results}
      />

      <LazyPosterRow
        rowId="row_genre_scifi"
        title="Sci-Fi & Future Realities"
        subtitle="Deep space expeditions, AI paradoxes, and multiverse epics"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(878)).results}
      />

      <LazyPosterRow
        rowId="row_genre_fantasy"
        title="Fantasy & Mythic Realms"
        subtitle="Magic, legendary quests, and mythical worlds"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(14)).results}
      />

      <LazyPosterRow
        rowId="row_genre_crime"
        title="Crime & Mob Heists"
        subtitle="Masterminds, underworld syndicates, and forensic drama"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(80)).results}
      />

      <LazyPosterRow
        rowId="row_genre_animation"
        title="Animation & Family Classics"
        subtitle="Stunning visual artistry from top studios"
        mediaType="movie"
        fetcher={async () => (await discoverMovies(16)).results}
      />

      {/* ========================================================================= */}
      {/* 20 - 29. 🌍 REGIONAL DISCOVERY (AFRICA, K-DRAMA, NOLLYWOOD, BOLLYWOOD...)   */}
      {/* ========================================================================= */}
      {/* 20. Made in Africa with interactive country tabs */}
      <MadeInAfricaSection
        items={africaItems}
        currentTab={africaTab}
        onTabChange={(tab) => setAfricaTab(tab)}
      />

      {/* 21. Kenyan Cinema */}
      <LazyPosterRow
        rowId="row_reg_kenya"
        title="Kenyan Cinema & Stories"
        subtitle="Nairobi drama, local legends, and East African masterworks"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({ with_origin_country: 'KE' });
          if (res.results.length > 0) return res.results;
          return (await discoverMoviesAdvanced({ with_origin_country: 'KE|NG' })).results;
        }}
      />

      {/* 22. African TV */}
      <LazyPosterRow
        rowId="row_reg_african_tv"
        title="African TV Series"
        subtitle="Telenovelas, suspense, and daily dramas across Africa"
        mediaType="tv"
        fetcher={async () => {
          return (await discoverTvAdvanced({ with_origin_country: 'KE|NG|ZA|GH' })).results;
        }}
      />

      {/* 23. Nollywood Hits */}
      <LazyPosterRow
        rowId="row_reg_nollywood"
        title="Nollywood Cinema"
        subtitle="Lagos drama, star-studded romances, and culture hits"
        mediaType="movie"
        fetcher={async () => {
          return (await discoverMoviesAdvanced({ with_origin_country: 'NG' })).results;
        }}
      />

      {/* 24. Black Cinema & Cultural Milestones */}
      <LazyPosterRow
        rowId="row_reg_black_cinema"
        title="Black Cinema & Culture"
        subtitle="Visionary directors, groundbreaking stories, and soul"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            with_keywords: '10183|1701|207317',
            sort_by: 'popularity.desc',
          });
          if (res.results.length > 0) return res.results;
          return (await discoverMovies(18)).results; // Drama fallback
        }}
      />

      {/* 25. K-Drama */}
      <LazyPosterRow
        rowId="row_reg_kdrama"
        title="K-Drama Addictions"
        subtitle="Romantic comedy, thrilling revenge sagas, and Seoul mysteries"
        mediaType="tv"
        fetcher={async () => {
          return (await discoverTvAdvanced({ with_original_language: 'ko' })).results;
        }}
      />

      {/* 26. Korean Movies */}
      <LazyPosterRow
        rowId="row_reg_korean_movies"
        title="Korean Cinema"
        subtitle="High-concept thrillers, neo-noir, and Cannes winners"
        mediaType="movie"
        fetcher={async () => {
          return (await discoverMoviesAdvanced({ with_original_language: 'ko' })).results;
        }}
      />

      {/* 27. Bollywood */}
      <LazyPosterRow
        rowId="row_reg_bollywood"
        title="Bollywood Blockbusters"
        subtitle="Musical epics, grand scale action, and family drama"
        mediaType="movie"
        fetcher={async () => {
          return (await discoverMoviesAdvanced({ with_original_language: 'hi' })).results;
        }}
      />

      {/* 28. Turkish Series */}
      <LazyPosterRow
        rowId="row_reg_turkish"
        title="Turkish Series & Dramas"
        subtitle="Historical sagas, Istanbul romance, and revenge"
        mediaType="tv"
        fetcher={async () => {
          return (await discoverTvAdvanced({ with_original_language: 'tr' })).results;
        }}
      />

      {/* 29. Anime */}
      <LazyPosterRow
        rowId="row_reg_anime"
        title="Anime Universes"
        subtitle="Shonen epics, isekai adventures, and Japanese animation"
        mediaType="tv"
        fetcher={async () => {
          return (
            await discoverTvAdvanced({
              with_original_language: 'ja',
              with_genres: '16',
            })
          ).results;
        }}
      />

      {/* ========================================================================= */}
      {/* 30 - 36. 🤖 PERSONALIZED & PLATFORM ACTIVITY                               */}
      {/* ========================================================================= */}
      {/* 30. Because You Watched... */}
      <LazyPosterRow
        rowId={`row_because_watched_${lastWatchedTitle}`}
        title={`Because You Watched ${lastWatchedTitle}`}
        subtitle="Titles with similar thematic weight and tone"
        mediaType="movie"
        fetcher={async () => {
          const res = await getPopularMovies(2);
          return res.results.slice(2, 16);
        }}
      />

      {/* 31. Recommended For You */}
      <LazyPosterRow
        rowId="row_recommended_for_you"
        title="Recommended For You"
        subtitle="Tuned to your recent activity and genre preferences"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            sort_by: 'vote_average.desc',
            'vote_count.gte': '1500',
          });
          return res.results;
        }}
      />

      {/* 32. Based on Your Watchlist */}
      {watchlist && watchlist.length > 0 && (
        <LazyPosterRow
          rowId="row_based_on_watchlist"
          title="Based on Your Watchlist"
          subtitle="Curated companions to items saved in your list"
          mediaType="movie"
          fetcher={async () => {
            const res = await getTopRatedMovies(2);
            return res.results;
          }}
        />
      )}

      {/* 33. Most Watched Today */}
      <LazyPosterRow
        rowId="row_most_watched_today"
        title="Most Watched Today"
        subtitle="Peak streaming hours activity"
        mediaType="movie"
        fetcher={async () => {
          const res = await getTrendingMovies();
          return res.results.slice(4, 18);
        }}
      />

      {/* 34. Trending in Kenya */}
      <LazyPosterRow
        rowId="row_trending_kenya"
        title="Trending in Kenya"
        subtitle="Top streaming selections in East Africa"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            with_origin_country: 'KE|NG|ZA',
            sort_by: 'popularity.desc',
          });
          return res.results;
        }}
      />

      {/* 35. Trending Worldwide */}
      <LazyPosterRow
        rowId="row_trending_worldwide"
        title="Trending Worldwide"
        subtitle="Global box office and streaming phenomenon"
        mediaType="movie"
        fetcher={async () => {
          const res = await getTrendingMovies();
          return res.results;
        }}
      />

      {/* 36. Rising Fast */}
      <LazyPosterRow
        rowId="row_rising_fast"
        title="Rising Fast"
        subtitle="Rapid popularity surges this week"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            sort_by: 'popularity.desc',
            primary_release_year: '2025',
          });
          return res.results;
        }}
      />

      {/* ========================================================================= */}
      {/* 37 - 42. 🎯 THEMED CURATED SECTIONS                                        */}
      {/* ========================================================================= */}
      {/* 37. Hidden Gems */}
      <LazyPosterRow
        rowId="row_hidden_gems"
        title="Hidden Gems"
        subtitle="Under-the-radar films with phenomenal viewer scores"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            'vote_average.gte': '7.8',
            'vote_count.gte': '200',
            'vote_count.lte': '3500',
            sort_by: 'vote_average.desc',
          });
          return res.results;
        }}
      />

      {/* 38. Staff Picks */}
      <LazyPosterRow
        rowId="row_staff_picks"
        title="StreamFlix Staff Picks"
        subtitle="Curator-selected cinematic marvels you can't miss"
        mediaType="movie"
        fetcher={async () => {
          const res = await getTopRatedMovies(1);
          return res.results.slice(0, 14);
        }}
      />

      {/* 39. Weekend Watch */}
      <LazyPosterRow
        rowId="row_weekend_watch"
        title="Weekend Watch"
        subtitle="Epic length entertainment for a cozy day in"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            'with_runtime.gte': '125',
            sort_by: 'popularity.desc',
          });
          return res.results;
        }}
      />

      {/* 40. Late Night Movies */}
      <LazyPosterRow
        rowId="row_late_night"
        title="Late Night Movies"
        subtitle="Dark, atmospheric, and edge-of-your-seat thrillers"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            with_genres: '53,27',
            sort_by: 'popularity.desc',
          });
          return res.results;
        }}
      />

      {/* 41. Family Night */}
      <LazyPosterRow
        rowId="row_family_night"
        title="Family Movie Night"
        subtitle="Delightful all-ages entertainment everyone will love"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            with_genres: '10751,16',
            sort_by: 'popularity.desc',
          });
          return res.results;
        }}
      />

      {/* 42. Movies Under 90 Minutes */}
      <LazyPosterRow
        rowId="row_under_90_minutes"
        title="Movies Under 90 Minutes"
        subtitle="Short on time? Fast-paced compact cinema"
        mediaType="movie"
        fetcher={async () => {
          const res = await discoverMoviesAdvanced({
            'with_runtime.lte': '90',
            'with_runtime.gte': '60',
            sort_by: 'popularity.desc',
          });
          return res.results;
        }}
      />

      {/* ========================================================================= */}
      {/* 43. 🎲 SURPRISE ME (INTERACTIVE CARD)                                     */}
      {/* ========================================================================= */}
      <SurpriseMeBanner onPickRandom={handleSurpriseMe} />

      {/* ========================================================================= */}
      {/* 44. 🎭 PICK A MOOD                                                        */}
      {/* ========================================================================= */}
      <PickAMoodSection onSelectMood={handlePickMood} />

      {/* ========================================================================= */}
      {/* 45. 📚 FEATURED COLLECTIONS                                                */}
      {/* ========================================================================= */}
      <FeaturedCollectionsSection />

      {/* ========================================================================= */}
      {/* 46. 🏆 POPULAR MOVIES BY YEAR                                             */}
      {/* ========================================================================= */}
      <PopularByYearSection
        selectedYear={selectedYear}
        onYearChange={(y) => setSelectedYear(y)}
        items={yearItems}
      />

      {/* ========================================================================= */}
      {/* 47. 📺 SHORT TV (QUICK FORMAT EPISODES)                                   */}
      {/* ========================================================================= */}
      <LazyPosterRow
        rowId="row_short_tv"
        title="Short TV & Mini-Series"
        subtitle="Bite-sized episodes · S01 E03 · 8-15 min binge format"
        mediaType="tv"
        fetcher={async () => {
          const res = await discoverTvAdvanced({
            sort_by: 'popularity.desc',
            with_genres: '35,16', // Animated shorts & comedy
          });
          return res.results;
        }}
      />

      {/* ========================================================================= */}
      {/* 48. 🔥 FINAL ENDLESS SECTION ("MORE MOVIES YOU'LL LOVE" + "LOAD MORE")    */}
      {/* ========================================================================= */}
      <div className="mt-8 border-t border-white/[0.08] pt-8">
        <LazyPosterRow
          rowId={`row_endless_batch_${endlessBatch}`}
          title="More Movies You'll Love"
          subtitle="Keep discovering from our infinite catalog"
          mediaType="movie"
          fetcher={async () => {
            const res = await getPopularMovies(endlessBatch + 2);
            return res.results;
          }}
        />

        {/* Load More trigger */}
        <div className="mt-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-slate-400 mb-3">
            Loaded through {endlessBatch * 20}+ curated titles
          </p>
          <button
            onClick={() => {
              setLoadingMore(true);
              setTimeout(() => {
                setEndlessBatch((b) => b + 1);
                setLoadingMore(false);
              }, 400);
            }}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-white/20 hover:border-white/30 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {loadingMore ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Loading Next Batch...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} className="text-amber-400" />
                <span>Load More Movies & Shows</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Trailer Modal */}
      {hero && (
        <DetailsDialog
          open={heroTrailerOpen}
          onClose={() => setHeroTrailerOpen(false)}
          data={hero}
          mediaType="movie"
        />
      )}
    </div>
  );
}
