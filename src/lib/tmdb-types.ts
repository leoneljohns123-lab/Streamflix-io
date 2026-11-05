// TMDb API types

export interface TmdbMovie {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  popularity: number;
  original_language?: string;
  status?: string;
  tagline?: string;
  homepage?: string;
  budget?: number;
  revenue?: number;
  imdb_id?: string;
  collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
  production_companies?: TmdbProductionCompany[];
  production_countries?: TmdbProductionCountry[];
  spoken_languages?: TmdbSpokenLanguage[];
  origin_country?: string[];
  alternative_titles?: { titles: TmdbAltTitle[] };
  external_ids?: TmdbExternalIds;
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  recommendations?: { results: TmdbMovie[] };
  similar?: { results: TmdbMovie[] };
  reviews?: { results: TmdbReview[] };
  images?: { posters: TmdbImage[]; backdrops: TmdbImage[]; logos: TmdbImage[] };
  keywords?: { keywords: TmdbKeyword[] };
  watch_providers?: { results: Record<string, { link?: string; flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[] }> };
  belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
}

export interface TmdbTv {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  popularity: number;
  original_language?: string;
  status?: string;
  type?: string;
  tagline?: string;
  homepage?: string;
  networks?: TmdbNetwork[];
  production_companies?: TmdbProductionCompany[];
  production_countries?: TmdbProductionCountry[];
  spoken_languages?: TmdbSpokenLanguage[];
  origin_country?: string[];
  seasons?: TmdbSeason[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
  alternative_titles?: { results: TmdbAltTitle[] };
  external_ids?: TmdbExternalIds;
  videos?: { results: TmdbVideo[] };
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  recommendations?: { results: TmdbTv[] };
  similar?: { results: TmdbTv[] };
  reviews?: { results: TmdbReview[] };
  images?: { posters: TmdbImage[]; backdrops: TmdbImage[]; logos: TmdbImage[] };
  keywords?: { results: TmdbKeyword[] };
  watch_providers?: { results: Record<string, { link?: string; flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[] }> };
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  episode_count: number;
  poster_path: string | null;
  episodes?: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  guest_stars?: TmdbCastMember[];
  crew?: TmdbCrewMember[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
  cast_id?: number;
  credit_id?: string;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  size: number;
}

export interface TmdbReview {
  id: string;
  author: string;
  content: string;
  rating: number | null;
  created_at: string;
  url: string;
  author_details?: { rating: number | null; avatar_path: string | null };
}

export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average: number;
  vote_count: number;
  iso_639_1?: string;
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TmdbSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TmdbNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbAltTitle {
  iso_3166_1: string;
  title: string;
  type: string;
}

export interface TmdbExternalIds {
  imdb_id: string | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
  wikidata_id: string | null;
}

export interface TmdbProvider {
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface TmdbPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  gender: number;
  popularity: number;
  profile_path: string | null;
  also_known_as?: string[];
  movie_credits?: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
  tv_credits?: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
  combined_credits?: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
  images?: { profiles: TmdbImage[] };
  external_ids?: TmdbExternalIds;
}

export interface TmdbPersonCredit {
  id: number;
  title?: string;
  name?: string;
  character?: string;
  job?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type: string;
  vote_average: number;
  popularity: number;
  genre_ids?: number[];
  credit_id: string;
  episode_count?: number;
}

export interface TmdbSearchResults {
  page: number;
  results: (TmdbMovie | TmdbTv | TmdbPersonCredit)[];
  total_pages: number;
  total_results: number;
}

export interface TmdbCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TmdbMovie[];
}
