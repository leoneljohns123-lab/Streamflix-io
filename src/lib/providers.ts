export type ProviderKey =
  | 'xpass'
  | 'player_4aq'
  | 'vidcore_io'
  | 'multiembed'
  | 'vidsrc_me'
  | 'vidsrc_to'
  | '2embed';

export interface ProviderInfo {
  key: ProviderKey;
  label: string;
  badge?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { key: 'xpass', label: 'XPass', badge: 'Fast HD' },
  { key: 'player_4aq', label: 'Player 4AQ', badge: 'Ultra' },
  { key: 'vidcore_io', label: 'VidCore', badge: '4K' },
  { key: 'multiembed', label: 'MultiEmbed', badge: 'VIP' },
  { key: 'vidsrc_me', label: 'VidSrc.me' },
  { key: 'vidsrc_to', label: 'VidSrc.to' },
  { key: '2embed', label: '2Embed' },
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
    case 'xpass':
      // play.xpass.top verified official route: /e/movie/{id} and /e/tv/{id}/{season}/{episode}
      url = mediaType === 'movie'
        ? `https://play.xpass.top/e/movie/${tmdbId}`
        : `https://play.xpass.top/e/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'player_4aq':
      // Player 4AQ Cloudflare Pages embed
      url = mediaType === 'movie'
        ? `https://player-4aq.pages.dev/?type=movie&id=${tmdbId}#movie/${tmdbId}`
        : `https://player-4aq.pages.dev/?type=tv&id=${tmdbId}&season=${s}&episode=${e}#tv/${tmdbId}/${s}/${e}`;
      break;

    case 'vidcore_io':
      // VidCore next-gen streaming
      url = mediaType === 'movie'
        ? `https://vidcore.io/movie/${tmdbId}`
        : `https://vidcore.io/tv/${tmdbId}/${s}/${e}`;
      break;

    case 'multiembed':
      url = mediaType === 'movie'
        ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`;
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

    case '2embed':
      url = mediaType === 'movie'
        ? `https://www.2embed.cc/embed/${tmdbId}`
        : `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}`;
      break;

    default:
      url = `https://play.xpass.top/e/movie/${tmdbId}`;
  }

  // NOTE: External embed servers reject or trigger infinite redirect
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
