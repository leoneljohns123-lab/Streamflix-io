export type ProviderKey =
  | 'embed_su'
  | 'vidcore_io'
  | 'player_4aq'
  | 'cinemaos'
  | 'xpass'
  | 'vidsrc_cc'
  | 'multiembed'
  | 'vidsrc_me'
  | 'vidsrc_to'
  | '2embed'
  | 'peachify';

export interface ProviderInfo {
  key: ProviderKey;
  label: string;
  badge?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { key: 'embed_su', label: 'Embed.su', badge: 'Fast' },
  { key: 'vidcore_io', label: 'VidCore', badge: '4K HD' },
  { key: 'player_4aq', label: 'Player 4AQ', badge: 'Ultra' },
  { key: 'cinemaos', label: 'CinemaOS', badge: 'Cinema' },
  { key: 'xpass', label: 'XPass', badge: 'Stream' },
  { key: 'vidsrc_cc', label: 'VidSrc.cc', badge: 'HD' },
  { key: 'multiembed', label: 'MultiEmbed', badge: 'VIP' },
  { key: 'vidsrc_me', label: 'VidSrc.me' },
  { key: 'vidsrc_to', label: 'VidSrc.to' },
  { key: '2embed', label: '2Embed' },
  { key: 'peachify', label: 'Peachify' },
];

export function getEmbedUrl(
  provider: ProviderKey,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number,
  time?: number,
): string {
  const s = season ?? 1;
  const e = episode ?? 1;

  let url = '';
  switch (provider) {
    case 'embed_su':
      url = mediaType === 'movie'
        ? `https://embed.su/embed/movie/${tmdbId}`
        : `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'vidcore_io':
      // VidCore API format: https://vidcore.io/movie/{id} or https://vidcore.io/tv/{id}/{season}/{episode}
      url = mediaType === 'movie'
        ? `https://vidcore.io/movie/${tmdbId}`
        : `https://vidcore.io/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'player_4aq':
      // Player 4AQ Cloudflare Pages player: supports both path and query/hash
      url = mediaType === 'movie'
        ? `https://player-4aq.pages.dev/?type=movie&id=${tmdbId}#movie/${tmdbId}`
        : `https://player-4aq.pages.dev/?type=tv&id=${tmdbId}&season=${s}&episode=${e}#tv/${tmdbId}/${s}/${e}`;
      break;

    case 'cinemaos':
      // CinemaOS tech embed player
      url = mediaType === 'movie'
        ? `https://cinemaos.tech/embed/movie/${tmdbId}`
        : `https://cinemaos.tech/embed/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'xpass':
      // ply.xpass.top embed player
      url = mediaType === 'movie'
        ? `https://ply.xpass.top/embed/movie/${tmdbId}`
        : `https://ply.xpass.top/embed/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'vidsrc_cc':
      url = mediaType === 'movie'
        ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}`
        : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'multiembed':
      url = mediaType === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
      break;

    case '2embed':
      url = mediaType === 'movie'
        ? `https://www.2embed.cc/embed/${tmdbId}`
        : `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}`;
      break;

    case 'vidsrc_me':
      url = mediaType === 'movie'
        ? `https://vidsrc.sh/embed/movie?tmdb=${tmdbId}`
        : `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}`;
      break;

    case 'vidsrc_to':
      url = mediaType === 'movie'
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'peachify':
      url = mediaType === 'movie'
        ? `https://peachify.pro/embed/movie/${tmdbId}`
        : `https://peachify.pro/embed/tv/${tmdbId}/${s}/${e}`;
      break;

    default:
      url = `https://embed.su/embed/movie/${tmdbId}`;
  }

  // NOTE: External embed servers (VidSrc, 2embed, etc.) reject or trigger infinite redirect
  // reload loops when unknown HTTP GET query parameters (like ?t= or &t=) are appended.
  // Instead, the W3C Media Fragment URI hash anchor (#t=SECONDS) is client-side only,
  // safe from HTTP server-side redirect loops, and natively interpreted by HTML5 video engines.
  if (time && time > 0) {
    const t = Math.floor(time);
    url += `#t=${t}`;
  }

  return url;
}

export function getYouTubeEmbedUrl(key: string, startSeconds?: number): string {
  const startParam = startSeconds && startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
  return `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&enablejsapi=1&rel=0${startParam}`;
}

export function getYouTubeThumbnail(key: string): string {
  return `https://img.youtube.com/vi/${key}/hqdefault.jpg`;
}
