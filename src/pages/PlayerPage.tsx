import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Keyboard,
  Volume2,
  VolumeX,
  ListPlus,
  Star,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  ExternalLink,
  Calendar,
  Clock,
  Heart,
  Check,
  Film,
  Sparkles,
  Flame,
  Maximize2,
  Minimize2,
  X,
  Share2,
  SlidersHorizontal,
  Copy,
  FastForward,
  Rewind,
  Timer,
  Users,
  Bot,
  GripHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  getMovieDetails,
  getTvDetails,
  getTvSeason,
  getMovieCollection,
} from '@/lib/tmdb';
import { PROVIDERS, getEmbedUrl, type ProviderKey } from '@/lib/providers';
import { imageUrl, backdropUrl, stillUrl } from '@/lib/tmdb-config';
import type {
  TmdbMovie,
  TmdbTv,
  TmdbSeason,
  TmdbVideo,
  TmdbCollection,
} from '@/lib/tmdb-types';
import { useWatchHistory, useWatchlist } from '@/lib/hooks';
import { navigate } from '@/lib/router';
import { CastDialog } from '@/components/CastDialog';
import { DetailsDialog } from '@/components/DetailsDialog';
import { VideoDialog } from '@/components/VideoDialog';
import { CastCard, VideoCard, ReviewCard, PosterCard } from '@/components/Cards';
import { PlayerPromotion } from '@/components/Promotions';
import { VideoAdPlayer } from '@/components/VideoAdPlayer';
import { PlayerAiAssistant } from '@/components/PlayerAiAssistant';
import { WatchPartyPanel, type FloatingReaction } from '@/components/WatchPartyPanel';
import { adManager } from '@/lib/ad-manager/AdManager';
import type { VideoAdCreative } from '@/lib/ad-manager/types';
import {
  getPlayback,
  savePlayback,
  formatPlaybackTime,
  formatPlaybackVerbose,
  splitSecondsToTime,
  parseTimeToSeconds,
} from '@/lib/playback-store';

export function PlayerPage({
  mediaType,
  tmdbId,
  initialSeason,
  initialEpisode,
  initialTime,
  initialPartyCode,
}: {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  initialSeason?: number;
  initialEpisode?: number;
  initialTime?: number;
  initialPartyCode?: string;
}) {
  const [data, setData] = useState<TmdbMovie | TmdbTv | null>(null);
  const [loading, setLoading] = useState(true);

  // Preferred provider (default to Fast Embed.su for smooth zero-loop streaming)
  const [provider, setProvider] = useState<ProviderKey>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('streamflix_preferred_provider') as ProviderKey;
      if (stored && PROVIDERS.some((p) => p.key === stored)) return stored;
    }
    return 'embed_su';
  });

  const [playerKey, setPlayerKey] = useState(0);
  const [season, setSeason] = useState<TmdbSeason | null>(null);

  // Retrieve exact saved playback state (exact minute & second)
  const savedPlayback = useMemo(() => {
    return getPlayback(mediaType, tmdbId);
  }, [mediaType, tmdbId]);

  const defaultSeason = initialSeason ?? savedPlayback?.season ?? 1;
  const defaultEpisode = initialEpisode ?? savedPlayback?.episode ?? 1;
  const defaultTime = initialTime ?? savedPlayback?.position ?? 0;

  const [selectedSeason, setSelectedSeason] = useState<number>(defaultSeason);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(defaultEpisode);

  // Exact minute & second tracking
  const playbackPositionRef = useRef<number>(defaultTime);
  const [activeSeconds, setActiveSeconds] = useState<number>(defaultTime);

  // Freezing initial seek time on mount ensures the iframe embed URL remains rock-solid and stable.
  // It NEVER recomputes on subsequent ticks, eliminating any unwanted reload/refresh loops!
  const initialSeekTimeRef = useRef<number | undefined>(defaultTime > 0 ? defaultTime : undefined);

  // Resume notification banner
  const [resumeNotice, setResumeNotice] = useState<{
    show: boolean;
    season?: number;
    episode?: number;
    position?: number;
  }>(() => {
    const hasProgress = Boolean(
      savedPlayback &&
        ((savedPlayback.position && savedPlayback.position > 5) ||
          (savedPlayback.season && savedPlayback.season > 1) ||
          (savedPlayback.episode && savedPlayback.episode > 1)),
    );
    return {
      show: hasProgress,
      season: defaultSeason,
      episode: defaultEpisode,
      position: defaultTime,
    };
  });

  // Time setter modal state
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [timeInputMinutes, setTimeInputMinutes] = useState('');
  const [timeInputSeconds, setTimeInputSeconds] = useState('');
  const [copiedTimestamp, setCopiedTimestamp] = useState(false);

  const [collection, setCollection] = useState<TmdbCollection | null>(null);
  const [castDialog, setCastDialog] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [videoDialog, setVideoDialog] = useState<TmdbVideo | null>(null);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [miniPlayer, setMiniPlayer] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [pipDismissed, setPipDismissed] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [activeAd, setActiveAd] = useState<VideoAdCreative | null>(null);
  const [companionTab, setCompanionTab] = useState<'ai' | 'watchparty'>(
    initialPartyCode ? 'watchparty' : 'ai'
  );
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const seasonDropdownRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const companionSectionRef = useRef<HTMLDivElement>(null);

  // Draggable PiP Popup State & Handlers
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPosX: number; initialPosY: number } | null>(null);
  const pipContainerRef = useRef<HTMLDivElement>(null);

  const getInitialPipPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 20, y: 20 };
    const pipWidth = pipContainerRef.current?.offsetWidth || 380;
    const pipHeight = pipContainerRef.current?.offsetHeight || 214;
    return {
      x: Math.max(12, window.innerWidth - pipWidth - 20),
      y: Math.max(12, window.innerHeight - pipHeight - 20),
    };
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    const currentPos = pipPosition || getInitialPipPosition();
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialPosX: currentPos.x,
      initialPosY: currentPos.y,
    };
    setIsDraggingPip(true);
  }, [pipPosition, getInitialPipPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;

    const pipWidth = pipContainerRef.current?.offsetWidth || 380;
    const pipHeight = pipContainerRef.current?.offsetHeight || 214;

    const minX = 8;
    const maxX = Math.max(8, window.innerWidth - pipWidth - 8);
    const minY = 8;
    const maxY = Math.max(8, window.innerHeight - pipHeight - 8);

    const nextX = Math.min(Math.max(minX, dragStartRef.current.initialPosX + deltaX), maxX);
    const nextY = Math.min(Math.max(minY, dragStartRef.current.initialPosY + deltaY), maxY);

    setPipPosition({ x: nextX, y: nextY });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragStartRef.current = null;
    setIsDraggingPip(false);
  }, []);

  useEffect(() => {
    if (!isDraggingPip) return;

    const onPointerMove = (e: PointerEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      handleDragEnd();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDraggingPip, handleDragMove, handleDragEnd]);

  useEffect(() => {
    const handleResize = () => {
      if (!pipPosition) return;
      const pipWidth = pipContainerRef.current?.offsetWidth || 380;
      const pipHeight = pipContainerRef.current?.offsetHeight || 214;
      const maxX = Math.max(8, window.innerWidth - pipWidth - 8);
      const maxY = Math.max(8, window.innerHeight - pipHeight - 8);

      setPipPosition((prev) => {
        if (!prev) return null;
        return {
          x: Math.min(Math.max(8, prev.x), maxX),
          y: Math.min(Math.max(8, prev.y), maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pipPosition]);

  const handleReactionBurst = useCallback((reaction: FloatingReaction) => {
    setFloatingReactions((prev) => [...prev.slice(-12), reaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 3200);
  }, []);

  const { upsertProgress } = useWatchHistory();
  const { toggleWatchlist, isInWatchlist } = useWatchlist();

  // Media Player Playback & Global Keyboard Shortcuts State
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  const [isMuted, setIsMuted] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hudTimeoutRef = useRef<any>(null);
  const [hudNotice, setHudNotice] = useState<{
    id: number;
    icon: 'play' | 'pause' | 'seek-fwd' | 'seek-bwd' | 'fullscreen' | 'windowed' | 'mute' | 'unmute' | 'theater';
    text: string;
    subtext?: string;
  } | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const showHud = useCallback(
    (hud: {
      icon: 'play' | 'pause' | 'seek-fwd' | 'seek-bwd' | 'fullscreen' | 'windowed' | 'mute' | 'unmute' | 'theater';
      text: string;
      subtext?: string;
    }) => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      setHudNotice({ ...hud, id: Date.now() });
      hudTimeoutRef.current = setTimeout(() => {
        setHudNotice(null);
      }, 950);
    },
    []
  );

  const sendIframeCommand = useCallback((command: 'play' | 'pause' | 'mute' | 'unmute') => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      const cw = iframeRef.current.contentWindow;
      if (command === 'pause') {
        cw.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        cw.postMessage({ type: 'pause', command: 'pause' }, '*');
      } else if (command === 'play') {
        cw.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        cw.postMessage({ type: 'play', command: 'play' }, '*');
      } else if (command === 'mute') {
        cw.postMessage('{"event":"command","func":"mute","args":""}', '*');
        cw.postMessage({ type: 'mute', command: 'mute' }, '*');
      } else if (command === 'unmute') {
        cw.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        cw.postMessage({ type: 'unmute', command: 'unmute' }, '*');
      }
    } catch {
      // Cross-origin restriction is normal
    }
  }, []);

  // Trigger Video Pre-Roll Ad on movie/episode start (with strict session & frequency capping)
  useEffect(() => {
    setActiveAd(null);
    if (!adManager.shouldPlayPreRoll(tmdbId)) {
      return;
    }

    adManager
      .requestPreRoll({
        mediaId: tmdbId,
        mediaType,
        title: (data as TmdbMovie)?.title || (data as TmdbTv)?.name || 'Featured Movie',
      })
      .then((ad) => {
        if (ad) {
          setActiveAd(ad);
        }
      })
      .catch((err) => {
        console.warn('[PlayerPage] Ad request fallback:', err);
      });
  }, [tmdbId, mediaType, data]);

  // Close season dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(e.target as Node)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch main content
  useEffect(() => {
    setLoading(true);
    setData(null);
    if (mediaType === 'movie') {
      getMovieDetails(tmdbId)
        .then((d) => {
          setData(d);
          if (d.belongs_to_collection) {
            getMovieCollection(d.belongs_to_collection.id).then(setCollection).catch(() => {});
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      getTvDetails(tmdbId)
        .then((d) => {
          setData(d);
          setLoading(false);
          if (d.seasons && d.seasons.length > 0) {
            const hasSelected = d.seasons.some((s) => s.season_number === selectedSeason);
            if (!hasSelected) {
              const firstRealSeason = d.seasons.find((s) => s.season_number > 0) || d.seasons[0];
              setSelectedSeason(firstRealSeason.season_number);
            }
          }
        })
        .catch(() => setLoading(false));
    }
  }, [tmdbId, mediaType, selectedSeason]);

  // Fetch season episodes when selectedSeason changes
  useEffect(() => {
    if (mediaType !== 'tv' || !tmdbId) return;
    getTvSeason(tmdbId, selectedSeason)
      .then((s) => {
        setSeason(s);
      })
      .catch(() => setSeason(null));
  }, [tmdbId, selectedSeason, mediaType]);

  // Immediately persist TV season and episode changes & synchronize URL hash for refresh resilience
  useEffect(() => {
    if (mediaType !== 'tv' || !data) return;

    savePlayback({
      tmdbId,
      mediaType: 'tv',
      title: (data as TmdbTv)?.name,
      season: selectedSeason,
      episode: selectedEpisode,
      episodeName: season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.name,
      position: playbackPositionRef.current,
      posterPath: data?.poster_path,
      backdropPath: data?.backdrop_path,
      silent: true,
    });

    if (typeof window !== 'undefined') {
      const targetHash = `#/player/tv/${tmdbId}/${selectedSeason}/${selectedEpisode}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    }
  }, [mediaType, tmdbId, selectedSeason, selectedEpisode, data, season]);

  // CONTINUOUS ACTIVE EXACT MINUTE & SECOND TRACKING
  // 1. Ticks every 1s when window is visible and active
  // 2. Flushes exact minute and second to localStorage periodically and immediately upon unload/refresh
  useEffect(() => {
    const tickTimer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && isPlayingRef.current) {
        playbackPositionRef.current += 1;
        setActiveSeconds(Math.round(playbackPositionRef.current));
      }
    }, 1000);

    const saveTimer = setInterval(() => {
      if (playbackPositionRef.current > 0) {
        const cur = Math.round(playbackPositionRef.current);
        const duration =
          mediaType === 'movie'
            ? (data as TmdbMovie)?.runtime
              ? (data as TmdbMovie).runtime! * 60
              : 7200
            : 2700;

        savePlayback({
          tmdbId,
          mediaType,
          title: mediaType === 'movie' ? (data as TmdbMovie)?.title : (data as TmdbTv)?.name,
          season: mediaType === 'tv' ? selectedSeason : undefined,
          episode: mediaType === 'tv' ? selectedEpisode : undefined,
          episodeName:
            mediaType === 'tv'
              ? season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.name
              : undefined,
          position: cur,
          duration,
          posterPath: data?.poster_path,
          backdropPath: data?.backdrop_path,
          silent: true,
        });
      }
    }, 4000);

    const flushPosition = () => {
      if (playbackPositionRef.current > 0) {
        const cur = Math.round(playbackPositionRef.current);
        savePlayback({
          tmdbId,
          mediaType,
          title: mediaType === 'movie' ? (data as TmdbMovie)?.title : (data as TmdbTv)?.name,
          season: mediaType === 'tv' ? selectedSeason : undefined,
          episode: mediaType === 'tv' ? selectedEpisode : undefined,
          episodeName:
            mediaType === 'tv'
              ? season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.name
              : undefined,
          position: cur,
          posterPath: data?.poster_path,
          backdropPath: data?.backdrop_path,
          silent: true,
        });
      }
    };

    window.addEventListener('beforeunload', flushPosition);
    window.addEventListener('pagehide', flushPosition);
    document.addEventListener('visibilitychange', flushPosition);

    return () => {
      clearInterval(tickTimer);
      clearInterval(saveTimer);
      flushPosition();
      window.removeEventListener('beforeunload', flushPosition);
      window.removeEventListener('pagehide', flushPosition);
      document.removeEventListener('visibilitychange', flushPosition);
    };
  }, [data, mediaType, tmdbId, selectedSeason, selectedEpisode, season]);

  // Capture postMessage playback progress events from embed providers if emitted
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg && typeof msg === 'object') {
          const time = msg.currentTime || msg.time || msg.position;
          const dur = msg.duration || msg.total;
          if (typeof time === 'number' && time > 0) {
            const cleanTime = Math.round(time);
            playbackPositionRef.current = cleanTime;
            setActiveSeconds(cleanTime);
            savePlayback({
              tmdbId,
              mediaType,
              title: mediaType === 'movie' ? (data as TmdbMovie)?.title : (data as TmdbTv)?.name,
              season: mediaType === 'tv' ? selectedSeason : undefined,
              episode: mediaType === 'tv' ? selectedEpisode : undefined,
              position: cleanTime,
              duration: typeof dur === 'number' ? Math.round(dur) : undefined,
              silent: true,
            });
          }
        }
      } catch {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tmdbId, mediaType, selectedSeason, selectedEpisode, data]);

  // Scroll detection for uninterrupted floating PiP
  useEffect(() => {
    const handler = () => {
      if (!playerRef.current) return;
      const rect = playerRef.current.getBoundingClientRect();
      const isOut = rect.bottom < 40;
      setMiniPlayer(isOut);
      if (!isOut) {
        setPipDismissed(false);
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Safe tracking on iframe load that preserves existing minute and second progress
  const handleIframeLoaded = useCallback(() => {
    if (!data) return;
    const title = mediaType === 'movie' ? (data as TmdbMovie).title : (data as TmdbTv).name;
    const runtime =
      mediaType === 'movie'
        ? (data as TmdbMovie).runtime
        : (data as TmdbTv).episode_run_time?.[0];
    const duration = runtime ? runtime * 60 : null;

    const currentPosition =
      playbackPositionRef.current > 0 ? Math.round(playbackPositionRef.current) : 1;

    upsertProgress({
      tmdb_id: tmdbId,
      media_type: mediaType,
      title,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      season_number: mediaType === 'tv' ? selectedSeason : null,
      episode_number: mediaType === 'tv' ? selectedEpisode : null,
      episode_name:
        mediaType === 'tv'
          ? season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.name
          : null,
      runtime,
      position: currentPosition,
      duration,
      completed: false,
    });
  }, [data, mediaType, tmdbId, selectedSeason, selectedEpisode, season, upsertProgress]);

  // Quick Seek Jump (e.g. -30s, +30s, +5m)
  const handleSeekDelta = useCallback(
    (deltaSeconds: number) => {
      const next = Math.max(0, Math.round(playbackPositionRef.current + deltaSeconds));
      playbackPositionRef.current = next;
      setActiveSeconds(next);
      savePlayback({
        tmdbId,
        mediaType,
        position: next,
        season: mediaType === 'tv' ? selectedSeason : undefined,
        episode: mediaType === 'tv' ? selectedEpisode : undefined,
        silent: true,
      });
      return next;
    },
    [tmdbId, mediaType, selectedSeason, selectedEpisode]
  );

  // Global Media Player Keyboard Shortcuts (Space, F, Arrow Keys, M, T, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in forms, inputs, or chatboxes
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // If any overlay dialog is open, allow Escape to close them and ignore other player shortcuts
      if (
        timeModalOpen ||
        castDialog !== null ||
        detailsOpen ||
        videoDialog !== null ||
        shortcutsModalOpen
      ) {
        if (e.key === 'Escape') {
          setTimeModalOpen(false);
          setCastDialog(null);
          setDetailsOpen(false);
          setVideoDialog(null);
          setShortcutsModalOpen(false);
        }
        return;
      }

      // SPACE: Play / Pause toggle
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => {
          const next = !prev;
          sendIframeCommand(next ? 'play' : 'pause');
          showHud({
            icon: next ? 'play' : 'pause',
            text: next ? 'Playing' : 'Paused',
            subtext: formatPlaybackTime(playbackPositionRef.current),
          });
          return next;
        });
        return;
      }

      // 'F' or 'f': Fullscreen toggle
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          showHud({
            icon: 'windowed',
            text: 'Exit Fullscreen',
          });
        } else {
          const target = playerRef.current || document.documentElement;
          if (target && target.requestFullscreen) {
            target.requestFullscreen().catch(() => {});
            showHud({
              icon: 'fullscreen',
              text: 'Fullscreen Mode',
            });
          }
        }
        return;
      }

      // ArrowRight: Seek forward (+10s, or +30s with Shift)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 30 : 10;
        const newPos = handleSeekDelta(delta);
        showHud({
          icon: 'seek-fwd',
          text: `+${delta}s`,
          subtext: formatPlaybackTime(newPos),
        });
        return;
      }

      // ArrowLeft: Seek backward (-10s, or -30s with Shift)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -30 : -10;
        const newPos = handleSeekDelta(delta);
        showHud({
          icon: 'seek-bwd',
          text: `-${Math.abs(delta)}s`,
          subtext: formatPlaybackTime(newPos),
        });
        return;
      }

      // 'M' or 'm': Mute / Unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((prev) => {
          const next = !prev;
          sendIframeCommand(next ? 'mute' : 'unmute');
          showHud({
            icon: next ? 'mute' : 'unmute',
            text: next ? 'Muted' : 'Sound Active',
          });
          return next;
        });
        return;
      }

      // 'T' or 't': Theater mode toggle
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTheaterMode((prev) => {
          const next = !prev;
          showHud({
            icon: 'theater',
            text: next ? 'Theater Mode' : 'Standard Mode',
          });
          return next;
        });
        return;
      }

      // '?' or '/': Open keyboard shortcuts cheatsheet
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    timeModalOpen,
    castDialog,
    detailsOpen,
    videoDialog,
    shortcutsModalOpen,
    handleSeekDelta,
    sendIframeCommand,
    showHud,
  ]);

  // Set Exact Minute and Second
  const handleSetExactTime = (targetSeconds: number) => {
    const cleanSeconds = Math.max(0, Math.floor(targetSeconds));
    playbackPositionRef.current = cleanSeconds;
    setActiveSeconds(cleanSeconds);
    initialSeekTimeRef.current = cleanSeconds;
    // Re-mount iframe with new initial seek time
    setPlayerKey((k) => k + 1);
    savePlayback({
      tmdbId,
      mediaType,
      position: cleanSeconds,
      season: mediaType === 'tv' ? selectedSeason : undefined,
      episode: mediaType === 'tv' ? selectedEpisode : undefined,
      silent: true,
    });
    setTimeModalOpen(false);
  };

  const handleCopyTimestamp = () => {
    if (typeof window !== 'undefined') {
      const formatted = formatPlaybackTime(activeSeconds);
      navigator.clipboard?.writeText(formatted);
      setCopiedTimestamp(true);
      setTimeout(() => setCopiedTimestamp(false), 2000);
    }
  };

  const isMovie = mediaType === 'movie';
  const title = isMovie ? (data as TmdbMovie)?.title : (data as TmdbTv)?.name;
  const releaseDate = isMovie ? (data as TmdbMovie)?.release_date : (data as TmdbTv)?.first_air_date;
  const year = releaseDate ? releaseDate.slice(0, 4) : '2025';
  const runtime = isMovie ? (data as TmdbMovie)?.runtime : (data as TmdbTv)?.episode_run_time?.[0];
  const formattedRuntime = runtime
    ? `${Math.floor(runtime / 60)}h ${runtime % 60}m`
    : isMovie
    ? '2h 10m'
    : '45m';

  const genres = data?.genres ?? [];
  const cast = data?.credits?.cast ?? [];
  const videos = data?.videos?.results ?? [];
  const reviews = data?.reviews?.results ?? [];
  const recommendations = data?.recommendations?.results ?? [];
  const similar = data?.similar?.results ?? [];

  // STABLE EMBED URL: Uses frozen initialSeekTimeRef so it never shifts or triggers reload loops!
  const embedUrl = useMemo(() => {
    return getEmbedUrl(
      provider,
      tmdbId,
      mediaType,
      mediaType === 'tv' ? selectedSeason : undefined,
      mediaType === 'tv' ? selectedEpisode : undefined,
      initialSeekTimeRef.current,
    );
  }, [provider, tmdbId, mediaType, selectedSeason, selectedEpisode]);

  const inList = data ? isInWatchlist(data.id, mediaType) : false;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const isSandboxed = typeof window !== 'undefined' && window.self !== window.top;

  if (loading) {
    return (
      <div className="pt-4 px-3 sm:px-6 lg:px-8 max-w-[1920px] mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="skeleton h-9 w-24 rounded-full" />
          <div className="skeleton h-5 w-48 rounded" />
        </div>
        <div className="aspect-video w-full rounded-2xl animate-pulse bg-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          <div className="lg:col-span-8 space-y-4">
            <div className="skeleton h-8 w-64 rounded-lg" />
            <div className="skeleton h-4 w-96 rounded" />
            <div className="skeleton h-20 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="skeleton h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pt-16 flex flex-col items-center justify-center text-center px-4">
        <div className="h-16 w-16 rounded-full bg-white/5 grid place-items-center mb-4">
          <Film size={28} className="text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-white">Title not found</h2>
        <p className="mt-1 text-sm text-slate-400">Failed to load content information.</p>
        <button onClick={handleBack} className="mt-5 primary-button">
          <ChevronLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const synopsis = data.overview || '';
  const isLongSynopsis = synopsis.length > 220;

  return (
    <div className="min-h-screen pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8 pb-20 w-full max-w-[1920px] mx-auto">
      {/* TOP NAVIGATION & BREADCRUMB BAR WITH BACK BUTTON */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 hover:border-white/20 hover:scale-105 active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400">
            <button onClick={() => navigate('/')} className="hover:text-white transition-colors">
              Home
            </button>
            <span className="text-slate-600">/</span>
            <button
              onClick={() => navigate(isMovie ? '/movies' : '/tv')}
              className="hover:text-white transition-colors"
            >
              {isMovie ? 'Movies' : 'TV Shows'}
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold truncate max-w-[200px] md:max-w-xs">{title}</span>
            {mediaType === 'tv' && (
              <span className="rounded bg-blue-950/70 border border-blue-500/30 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                S{selectedSeason} E{selectedEpisode}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCompanionTab('ai');
              companionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-600/20 px-3.5 py-1.5 text-xs font-bold text-blue-200 transition-all hover:bg-blue-600/30 hover:text-white cursor-pointer"
          >
            <Bot size={14} className="text-blue-400" />
            <span>Scene AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCompanionTab('watchparty');
              companionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-600/20 px-3.5 py-1.5 text-xs font-bold text-red-200 transition-all hover:bg-red-600/30 hover:text-white cursor-pointer"
          >
            <Users size={14} className="text-red-400" />
            <span>Watch Party</span>
          </button>

          <button
            onClick={() =>
              toggleWatchlist({
                tmdb_id: tmdbId,
                media_type: mediaType,
                title: title || '',
                poster_path: data.poster_path,
                backdrop_path: data.backdrop_path,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/15"
          >
            <Heart size={14} className={inList ? 'fill-[#f52432] text-[#f52432]' : 'text-white'} />
            <span className="hidden sm:inline">{inList ? 'In List' : 'Add to List'}</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/15"
            title="Share title"
          >
            {copiedShare ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{copiedShare ? 'Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={() => setDetailsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/15"
          >
            <Info size={14} />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>

      {/* SANDBOX CONTAINER NOTICE (IF APPLICABLE) */}
      {isSandboxed && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-black">!</span>
              <span>
                Embedded preview sandbox active. If video playback is blocked, open StreamFlix in a standalone tab or pop-out the player.
              </span>
            </p>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 font-bold text-black hover:bg-amber-400"
              >
                <ExternalLink size={12} />
                Open Full Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENT RESUME WHERE YOU LEFT OFF BANNER (EXACT MINUTE & SECOND) */}
      {resumeNotice.show && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-blue-950/70 p-3 sm:px-4 sm:py-3 text-xs text-white shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/10">
              <Play size={15} className="fill-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white flex flex-wrap items-center gap-1.5">
                <span>Resuming where you left off:</span>
                {mediaType === 'tv' ? (
                  <span className="text-emerald-400 font-black">
                    Season {selectedSeason}, Episode {selectedEpisode}
                    {season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.name
                      ? ` · "${season.episodes.find((e) => e.episode_number === selectedEpisode)?.name}"`
                      : ''}
                    {activeSeconds > 5 && ` · ${formatPlaybackTime(activeSeconds)} (${formatPlaybackVerbose(activeSeconds)})`}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-black">
                    {formatPlaybackTime(activeSeconds)}
                    <span className="text-slate-300 font-medium ml-1">
                      ({formatPlaybackVerbose(activeSeconds)})
                    </span>
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exact minute and second are saved automatically across refreshes, relaunches, and visits.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Seek / Adjust Tools */}
            <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/10">
              <button
                type="button"
                onClick={() => handleSeekDelta(-30)}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
                title="Rewind 30 seconds"
              >
                -30s
              </button>
              <button
                type="button"
                onClick={() => handleSeekDelta(30)}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
                title="Fast forward 30 seconds"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={() => {
                  const split = splitSecondsToTime(activeSeconds);
                  setTimeInputMinutes(String(split.hours * 60 + split.minutes));
                  setTimeInputSeconds(String(split.seconds));
                  setTimeModalOpen(true);
                }}
                className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                title="Set exact minute and second"
              >
                <SlidersHorizontal size={11} />
                <span>Exact Time</span>
              </button>
            </div>

            {/* Restart button */}
            {mediaType === 'tv' ? (
              <button
                type="button"
                onClick={() => {
                  playbackPositionRef.current = 0;
                  setActiveSeconds(0);
                  initialSeekTimeRef.current = 0;
                  setSelectedSeason(1);
                  setSelectedEpisode(1);
                  setResumeNotice({ show: false });
                  setPlayerKey((k) => k + 1);
                  savePlayback({ tmdbId, mediaType, season: 1, episode: 1, position: 0 });
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
              >
                ↺ Start from S1 E1
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playbackPositionRef.current = 0;
                  setActiveSeconds(0);
                  initialSeekTimeRef.current = 0;
                  setPlayerKey((k) => k + 1);
                  setResumeNotice({ show: false });
                  savePlayback({ tmdbId, mediaType, position: 0 });
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
              >
                ↺ Restart (0:00)
              </button>
            )}

            <button
              type="button"
              onClick={() => setResumeNotice({ show: false })}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* CINEMA STAGE: PLAYER WITH AMBIENT GLOW & ZERO-REFRESH STABILITY */}
      <div className={`relative mb-6 transition-all duration-300 ${theaterMode ? '-mx-3 sm:-mx-6 lg:-mx-8' : ''}`}>
        {/* Soft atmospheric ambient glow behind the player */}
        {data.backdrop_path && !theaterMode && (
          <div
            className="absolute -inset-6 -z-10 opacity-30 blur-3xl pointer-events-none transition-opacity duration-1000 hidden md:block"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(37,99,235,0.4), rgba(245,36,50,0.2), transparent 70%)`,
            }}
          />
        )}

        <div
          className={`overflow-hidden border border-white/10 bg-[#060a10] shadow-[0_20px_70px_rgba(0,0,0,0.85)] ${
            theaterMode ? 'rounded-none border-x-0' : 'rounded-2xl sm:rounded-3xl'
          }`}
        >
          {/* Main Video Screen & Continuous Seamless PiP */}
          <div ref={playerRef} className="relative aspect-video w-full max-h-[82vh] bg-black">
            <div
              ref={pipContainerRef}
              style={
                miniPlayer && !pipDismissed && pipPosition
                  ? {
                      position: 'fixed',
                      left: `${pipPosition.x}px`,
                      top: `${pipPosition.y}px`,
                      zIndex: 50,
                    }
                  : miniPlayer && !pipDismissed
                  ? {
                      position: 'fixed',
                      bottom: '20px',
                      right: '20px',
                      zIndex: 50,
                    }
                  : undefined
              }
              className={
                miniPlayer && !pipDismissed
                  ? `z-50 w-72 sm:w-88 md:w-[420px] aspect-video rounded-2xl overflow-hidden border border-white/25 bg-black group/pip ${
                      isDraggingPip
                        ? 'shadow-[0_30px_90px_rgba(0,0,0,0.98)] cursor-grabbing select-none scale-[1.01]'
                        : 'shadow-[0_25px_60px_rgba(0,0,0,0.95)] transition-[box-shadow,border-color]'
                    }`
                  : 'relative h-full w-full'
              }
            >
              {/* ROCK-SOLID IFRAME: Never refreshes or loops on playback ticks */}
              <iframe
                ref={iframeRef}
                key={`${provider}-${mediaType}-${tmdbId}-${selectedSeason}-${selectedEpisode}-${playerKey}`}
                src={embedUrl}
                className="h-full w-full"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock; accelerometer; gyroscope"
                allowFullScreen
                onLoad={handleIframeLoaded}
                title={title}
                referrerPolicy="no-referrer"
              />

              {/* KEYBOARD SHORTCUTS HUD ON-SCREEN INDICATOR */}
              {hudNotice && (
                <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center animate-in fade-in zoom-in-95 duration-150 select-none">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-black/85 px-6 py-4 shadow-2xl backdrop-blur-xl text-white">
                    {hudNotice.icon === 'play' && <Play size={38} className="fill-white text-white mb-1" />}
                    {hudNotice.icon === 'pause' && <Pause size={38} className="fill-white text-white mb-1" />}
                    {hudNotice.icon === 'seek-fwd' && <FastForward size={38} className="text-blue-400 mb-1" />}
                    {hudNotice.icon === 'seek-bwd' && <Rewind size={38} className="text-blue-400 mb-1" />}
                    {hudNotice.icon === 'fullscreen' && <Maximize2 size={38} className="text-amber-400 mb-1" />}
                    {hudNotice.icon === 'windowed' && <Minimize2 size={38} className="text-amber-400 mb-1" />}
                    {hudNotice.icon === 'mute' && <VolumeX size={38} className="text-red-400 mb-1" />}
                    {hudNotice.icon === 'unmute' && <Volume2 size={38} className="text-emerald-400 mb-1" />}
                    {hudNotice.icon === 'theater' && <Film size={38} className="text-indigo-400 mb-1" />}
                    <span className="text-sm font-extrabold tracking-wide mt-1">{hudNotice.text}</span>
                    {hudNotice.subtext && (
                      <span className="text-xs font-mono text-slate-300 mt-0.5">{hudNotice.subtext}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Invisible overlay while dragging to prevent iframe from trapping pointer moves */}
              {isDraggingPip && (
                <div className="absolute inset-0 z-40 bg-transparent cursor-grabbing" />
              )}

              {/* VIDEO AD PLAYER (PRE-ROLL OVERLAY) */}
              {activeAd && (
                <VideoAdPlayer
                  ad={activeAd}
                  mediaId={tmdbId}
                  mediaType={mediaType}
                  onAdEnded={() => {
                    setActiveAd(null);
                  }}
                />
              )}

              {/* LIVE WATCH PARTY FLOATING EMOJI REACTIONS OVERLAY */}
              {floatingReactions.length > 0 && (
                <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                  {floatingReactions.map((r) => (
                    <div
                      key={r.id}
                      style={{ left: `${r.leftPercent}%` }}
                      className="absolute bottom-6 flex flex-col items-center animate-bounce transition-all duration-1000"
                    >
                      <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
                        {r.emoji}
                      </span>
                      <span className="mt-0.5 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                        {r.senderName}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {miniPlayer && !pipDismissed && (
                <div
                  className={`absolute top-2 inset-x-2 flex items-center justify-between pointer-events-auto bg-black/85 backdrop-blur-md rounded-xl px-2.5 py-1.5 text-xs text-white z-30 border border-white/10 transition-opacity duration-200 ${
                    isDraggingPip ? 'opacity-100 ring-2 ring-blue-500/50' : 'opacity-0 group-hover/pip:opacity-100'
                  }`}
                >
                  {/* Draggable Grip Handle & Title */}
                  <div
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleDragStart(e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (e.touches[0]) {
                        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                    className="flex flex-1 items-center gap-1.5 min-w-0 cursor-grab active:cursor-grabbing select-none py-0.5 px-1 rounded-lg hover:bg-white/10 transition-colors touch-none"
                    title="Click and drag to move player anywhere on the screen"
                  >
                    <GripHorizontal size={15} className="text-slate-300 flex-shrink-0" />
                    <span className="truncate max-w-[140px] sm:max-w-[200px] font-bold text-[11px] text-white select-none">
                      {title}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 hidden sm:inline select-none">
                      · Drag to move
                    </span>
                  </div>

                  {/* Window Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    {pipPosition && (
                      <button
                        type="button"
                        onClick={() => setPipPosition(null)}
                        className="hover:text-amber-400 p-1 flex items-center gap-1 text-[10px] font-bold text-slate-400 rounded hover:bg-white/10 transition-colors"
                        title="Snap back to bottom-right corner"
                        aria-label="Snap to corner"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="hover:text-blue-400 p-1 flex items-center gap-1 text-[10px] font-bold text-slate-300 rounded hover:bg-white/10 transition-colors"
                      title="Expand to main player"
                      aria-label="Expand player"
                    >
                      <Maximize2 size={13} />
                      <span className="hidden sm:inline">Expand</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPipDismissed(true)}
                      className="hover:text-red-400 p-1 text-slate-300 rounded hover:bg-white/10 transition-colors"
                      title="Dismiss mini player"
                      aria-label="Dismiss mini player"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Cinema Control Bar with Exact Minute & Second Tracker */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#090e17] px-4 py-3 sm:px-6">
            {/* Server Source Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                Server:
              </span>
              {PROVIDERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setProvider(p.key);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('streamflix_preferred_provider', p.key);
                    }
                  }}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                    provider === p.key
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{p.label}</span>
                  {p.badge && (
                    <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                      {p.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick Exact Minute & Second Controls + Utility Tools */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Live Exact Minute and Second Indicator */}
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-mono font-bold text-slate-200">
                <Timer size={13} className="text-emerald-400" />
                <span>{formatPlaybackTime(activeSeconds)}</span>
                <span className="text-[10px] text-slate-400 font-sans hidden md:inline">
                  ({splitSecondsToTime(activeSeconds).minutes}m {splitSecondsToTime(activeSeconds).seconds}s)
                </span>
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Exact Time Setter Button */}
              <button
                type="button"
                onClick={() => {
                  const split = splitSecondsToTime(activeSeconds);
                  setTimeInputMinutes(String(split.hours * 60 + split.minutes));
                  setTimeInputSeconds(String(split.seconds));
                  setTimeModalOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                title="Set exact minute and second"
              >
                <SlidersHorizontal size={12} />
                <span className="hidden sm:inline">Set Time</span>
              </button>

              {/* Quick Seek Rewind / Forward */}
              <button
                type="button"
                onClick={() => handleSeekDelta(-30)}
                className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                title="Rewind 30 seconds"
              >
                <Rewind size={12} />
                <span>30s</span>
              </button>
              <button
                type="button"
                onClick={() => handleSeekDelta(30)}
                className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                title="Forward 30 seconds"
              >
                <span>30s</span>
                <FastForward size={12} />
              </button>

              {/* TV episode quick skipper */}
              {mediaType === 'tv' && season?.episodes && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={selectedEpisode <= 1}
                    onClick={() => {
                      playbackPositionRef.current = 0;
                      setActiveSeconds(0);
                      initialSeekTimeRef.current = 0;
                      setSelectedEpisode((ep) => Math.max(1, ep - 1));
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                    title="Previous Episode"
                  >
                    Prev Ep
                  </button>
                  <button
                    disabled={selectedEpisode >= (season.episodes.length || 1)}
                    onClick={() => {
                      playbackPositionRef.current = 0;
                      setActiveSeconds(0);
                      initialSeekTimeRef.current = 0;
                      setSelectedEpisode((ep) => ep + 1);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                    title="Next Episode"
                  >
                    Next Ep
                  </button>
                </div>
              )}

              <button
                onClick={() => setPlayerKey((k) => k + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Reload video stream"
              >
                <RotateCw size={13} />
                <span className="hidden sm:inline">Reload</span>
              </button>

              <button
                onClick={() => setTheaterMode(!theaterMode)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                  theaterMode
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={theaterMode ? 'Exit theater mode' : 'Edge-to-edge theater mode'}
              >
                {theaterMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden sm:inline">{theaterMode ? 'Standard' : 'Theater'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShortcutsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                title="Keyboard Shortcuts (Space, F, ←, →, M, T, ?)"
              >
                <Keyboard size={13} />
                <span className="hidden sm:inline">Shortcuts</span>
              </button>

              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-600/30 hover:text-white"
                title="Open player in dedicated window"
              >
                <ExternalLink size={13} />
                <span>Pop-out</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* DIRECTLY BELOW THE PLAYER: SERIES EPISODES SELECTOR (NO CONTAINER, HIGH Z-INDEX) */}
      {mediaType === 'tv' && (data as TmdbTv).seasons && (
        <div className="relative z-50 mb-6 flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Season Dropdown Button with red text & dropdown on click/hover */}
          <div
            ref={seasonDropdownRef}
            className="relative"
            onMouseEnter={() => setSeasonDropdownOpen(true)}
          >
            <button
              type="button"
              onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/25 px-3.5 py-2 text-xs sm:text-sm font-black text-[#f52432] hover:bg-red-900/35 transition-all select-none shadow-md cursor-pointer"
            >
              <span>Season {selectedSeason}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  seasonDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Season Dropdown List: Z-[100] so it NEVER appears behind any cards */}
            {seasonDropdownOpen && (
              <div
                onMouseLeave={() => setSeasonDropdownOpen(false)}
                className="absolute left-0 top-full mt-1.5 z-[100] w-56 rounded-xl border border-white/20 bg-[#0c1422] py-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
              >
                <p className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                  Select Season
                </p>
                <div className="max-h-64 overflow-y-auto py-1 [scrollbar-width:thin]">
                  {(data as TmdbTv).seasons!
                    .filter((s) => s.season_number > 0)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          playbackPositionRef.current = 0;
                          setActiveSeconds(0);
                          initialSeekTimeRef.current = 0;
                          setSelectedSeason(s.season_number);
                          setSelectedEpisode(1);
                          setSeasonDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          selectedSeason === s.season_number
                            ? 'bg-[#f52432]/20 text-[#f52432]'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{s.name || `Season ${s.season_number}`}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {s.episode_count} eps
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Horizontal Episode Buttons [1] [2] [3] ... [10] with Hover Description Tooltip */}
          {season?.episodes && season.episodes.length > 0 ? (
            season.episodes.map((ep) => {
              const isSelected = selectedEpisode === ep.episode_number;
              return (
                <div key={ep.id} className="relative group/ep">
                  <button
                    type="button"
                    onClick={() => {
                      playbackPositionRef.current = 0;
                      setActiveSeconds(0);
                      initialSeekTimeRef.current = 0;
                      setSelectedEpisode(ep.episode_number);
                      setResumeNotice({ show: false });
                      if (playerRef.current) {
                        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`min-w-[40px] h-10 px-3 rounded-lg border text-xs sm:text-sm font-black transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'border-slate-300 bg-slate-300 text-black shadow-md shadow-white/10 scale-105'
                        : 'border-white/15 bg-white/[0.04] text-slate-300 hover:border-white/35 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {ep.episode_number}
                  </button>

                  {/* Hover Tooltip: STRICTLY shown only on hover, drops below with z-[90] */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[90] w-72 sm:w-80 rounded-2xl border border-white/20 bg-[#090f19] p-3.5 shadow-2xl backdrop-blur-2xl opacity-0 pointer-events-none group-hover/ep:opacity-100 group-hover/ep:pointer-events-auto transition-all duration-200 ease-out transform translate-y-1 group-hover/ep:translate-y-0">
                    {/* Still Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/60 mb-2.5">
                      {ep.still_path ? (
                        <img
                          src={stillUrl(ep.still_path)}
                          alt={ep.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : data.backdrop_path ? (
                        <img
                          src={backdropUrl(data.backdrop_path, 'w300')}
                          alt={ep.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-600 text-xs">
                          No Preview Available
                        </div>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Episode {ep.episode_number}
                      </span>
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#f52432]">E{ep.episode_number}</span>
                      <p className="truncate text-xs font-bold text-white">{ep.name}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                      {ep.air_date && <span>{ep.air_date}</span>}
                      {ep.runtime != null && ep.runtime > 0 && (
                        <>
                          <span>·</span>
                          <span>{ep.runtime} min</span>
                        </>
                      )}
                    </div>

                    {/* Synopsis / Description: ONLY on hover */}
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300 line-clamp-3">
                      {ep.overview || 'No description provided for this episode.'}
                    </p>

                    {/* Pointer Arrow Indicator */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-solid border-b-[#090f19] border-b-8 border-x-transparent border-x-8 border-t-0 w-0 h-0" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-2 px-3 text-xs text-slate-400">Loading season episodes...</div>
          )}
        </div>
      )}

      {/* TWO-COLUMN MASTER CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PRIMARY COLUMN (8 cols): Metadata, Synopsis, Cast, Videos, Reviews */}
        <div className="lg:col-span-8 space-y-8">
          {/* Title, Rating, Metas, Genres, and Primary Actions */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#090e17]/80 p-5 sm:p-6 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              {data.vote_average >= 8.0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Flame size={12} className="fill-amber-400" />
                  Featured
                </span>
              )}
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300 uppercase">
                {mediaType === 'movie' ? 'Movie' : 'TV Series'}
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {title}
            </h1>

            {/* Metas Row: ⭐ 8.4/10 | 🕒 2h 18m | 📅 2025 */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-300">
              {data.vote_average > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star size={14} fill="currentColor" /> {data.vote_average.toFixed(1)}
                  <span className="text-slate-500 font-medium">/10</span>
                </span>
              )}
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock size={13} className="text-slate-400" /> {formattedRuntime}
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar size={13} className="text-slate-400" /> {year}
              </span>

              {/* Quality & Audio Badges */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-white">
                  4K UHD
                </span>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-slate-300">
                  Dolby Atmos
                </span>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-slate-300">
                  CC
                </span>
              </div>
            </div>

            {/* Genre Pills: Blue Capsules */}
            {genres.length > 0 && (
              <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full bg-blue-950/70 border border-blue-500/30 px-3.5 py-1 text-xs font-semibold text-blue-200"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Primary Action Buttons Row */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (playerRef.current) {
                    playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-white/10 transition-all hover:bg-slate-200 active:scale-95"
              >
                <Play size={16} fill="black" /> Play Video
              </button>

              <button
                onClick={() =>
                  toggleWatchlist({
                    tmdb_id: tmdbId,
                    media_type: mediaType,
                    title: title || '',
                    poster_path: data.poster_path,
                    backdrop_path: data.backdrop_path,
                  })
                }
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-95"
              >
                {inList ? <Check size={16} className="text-emerald-400" /> : <ListPlus size={16} />}
                <span>{inList ? 'In Your List' : 'Add to List'}</span>
              </button>

              <button
                onClick={() => setDetailsOpen(true)}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-95"
              >
                <Info size={16} /> Details
              </button>
            </div>

            {/* Overview / Storyline */}
            {synopsis && (
              <div className="mt-5 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Storyline</p>
                <p
                  className={`text-sm leading-relaxed text-slate-300 ${
                    !showFullSynopsis && isLongSynopsis ? 'line-clamp-3' : ''
                  }`}
                >
                  {synopsis}
                </p>
                {isLongSynopsis && (
                  <button
                    onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                    className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    {showFullSynopsis ? 'Show Less' : 'Read Full Synopsis'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CAST & CREW */}
          {cast.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#090e17]/80 p-5 sm:p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-white">Cast & Crew</h2>
                {cast.length > 8 && (
                  <button
                    onClick={() => setShowAllCast(!showAllCast)}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    {showAllCast ? 'Show Less' : `View All (${cast.length})`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {(showAllCast ? cast : cast.slice(0, 8)).map((member) => (
                  <CastCard
                    key={member.id}
                    member={member}
                    onClick={() => setCastDialog(member.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TRAILERS & CLIPS */}
          {videos.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#090e17]/80 p-5 sm:p-6 backdrop-blur-xl">
              <h2 className="mb-4 text-lg sm:text-xl font-black text-white">Trailers & Behind the Scenes</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos.slice(0, 6).map((video) => (
                  <VideoCard key={video.id} video={video} onClick={() => setVideoDialog(video)} />
                ))}
              </div>
            </div>
          )}

          {/* RATINGS & USER REVIEWS */}
          {reviews.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#090e17]/80 p-5 sm:p-6 backdrop-blur-xl">
              <h2 className="mb-4 text-lg sm:text-xl font-black text-white">Audience Reviews</h2>
              <div className="space-y-4">
                {reviews.slice(0, 4).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR COLUMN (4 cols): Scene AI Companion, Watch Party, Up Next, Quick Facts, Franchise */}
        <div className="lg:col-span-4 space-y-6">
          {/* INTERACTIVE SCENE AI COMPANION & WATCH PARTY HUB */}
          <div ref={companionSectionRef} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#090e17]/90 p-1.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setCompanionTab('ai')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
                  companionTab === 'ai'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/50'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Bot size={15} />
                <span>Ask Movie/Show AI</span>
              </button>
              <button
                type="button"
                onClick={() => setCompanionTab('watchparty')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
                  companionTab === 'watchparty'
                    ? 'bg-gradient-to-r from-[#f52432] to-pink-600 text-white shadow-lg shadow-red-950/50'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Users size={15} />
                <span>Watch Party</span>
              </button>
            </div>

            {companionTab === 'ai' ? (
              <PlayerAiAssistant
                context={{
                  title: title || 'Featured Title',
                  mediaType,
                  year,
                  overview: synopsis,
                  tagline: data.tagline,
                  genres: genres.map((g) => g.name),
                  rating: data.vote_average ? data.vote_average.toFixed(1) : '8.0',
                  season: mediaType === 'tv' ? selectedSeason : undefined,
                  episode: mediaType === 'tv' ? selectedEpisode : undefined,
                  episodeName:
                    mediaType === 'tv'
                      ? season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.name
                      : undefined,
                  episodeOverview:
                    mediaType === 'tv'
                      ? season?.episodes?.find((e) => e.episode_number === selectedEpisode)?.overview
                      : undefined,
                  currentTimestamp: formatPlaybackTime(activeSeconds),
                  cast,
                }}
              />
            ) : (
              <WatchPartyPanel
                mediaType={mediaType}
                tmdbId={tmdbId}
                title={title || 'Featured Title'}
                posterPath={data?.poster_path || undefined}
                backdropPath={data?.backdrop_path || undefined}
                season={mediaType === 'tv' ? selectedSeason : undefined}
                episode={mediaType === 'tv' ? selectedEpisode : undefined}
                activeSeconds={activeSeconds}
                initialPartyCode={initialPartyCode}
                onSyncPlayback={({ season: targetSeason, episode: targetEpisode, position }) => {
                  if (mediaType === 'tv') {
                    if (typeof targetSeason === 'number' && targetSeason !== selectedSeason) {
                      setSelectedSeason(targetSeason);
                    }
                    if (typeof targetEpisode === 'number' && targetEpisode !== selectedEpisode) {
                      setSelectedEpisode(targetEpisode);
                    }
                  }
                  handleSetExactTime(position);
                }}
                onReactionBurst={handleReactionBurst}
              />
            )}
          </div>

          {/* UP NEXT (FOR TV SHOWS) */}
          {mediaType === 'tv' && season?.episodes && selectedEpisode < season.episodes.length && (
            <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-950/30 to-[#090e17] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Up Next · Episode {selectedEpisode + 1}
                </span>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Auto-cue
                </span>
              </div>
              {(() => {
                const next = season.episodes.find((e) => e.episode_number === selectedEpisode + 1);
                if (!next) return null;
                return (
                  <button
                    onClick={() => {
                      playbackPositionRef.current = 0;
                      setActiveSeconds(0);
                      initialSeekTimeRef.current = 0;
                      setSelectedEpisode(next.episode_number);
                      if (playerRef.current) {
                        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="group w-full text-left"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                      {next.still_path ? (
                        <img
                          src={stillUrl(next.still_path)}
                          alt={next.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : data.backdrop_path ? (
                        <img
                          src={backdropUrl(data.backdrop_path, 'w780')}
                          alt={next.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-700">
                          <Play size={24} />
                        </div>
                      )}
                      <div className="absolute inset-0 grid place-items-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-lg transition-transform group-hover:scale-110">
                          <Play size={20} fill="black" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="font-bold text-white group-hover:text-blue-300 transition-colors">
                        E{next.episode_number}. {next.name}
                      </p>
                      {next.overview && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                          {next.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })()}
            </div>
          )}

          {/* KEY DETAILS & FACTS CARD */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#090e17]/80 p-5 sm:p-6 backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-400" />
              About This {isMovie ? 'Movie' : 'Show'}
            </h3>

            {/* Poster & Quick Stats */}
            <div className="flex gap-4 mb-4">
              {data.poster_path && (
                <img
                  src={imageUrl(data.poster_path, 'w185')}
                  alt={title}
                  className="w-20 rounded-xl object-cover shadow-md flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1.5 text-xs text-slate-300">
                <p>
                  <span className="text-slate-500 font-semibold">Status: </span>
                  <span className="text-white font-bold">{data.status || 'Released'}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-semibold">Language: </span>
                  <span className="text-white font-bold uppercase">{data.original_language || 'EN'}</span>
                </p>
                {data.tagline && (
                  <p className="italic text-slate-400 line-clamp-2">
                    &ldquo;{data.tagline}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setDetailsOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
            >
              <span>View Full Metadata & Cast</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* FRANCHISE / COLLECTION SPOTLIGHT */}
          {collection && collection.parts && collection.parts.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#090e17]/80 p-5 backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <Film size={14} className="text-blue-400" />
                {collection.name}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Explore all {collection.parts.length} entries in this cinematic universe.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {collection.parts.slice(0, 4).map((part) => (
                  <button
                    key={part.id}
                    onClick={() => navigate(`/player/movie/${part.id}`)}
                    className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-black/40 text-left"
                  >
                    {part.poster_path ? (
                      <img
                        src={imageUrl(part.poster_path, 'w185')}
                        alt={part.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] text-slate-600">
                        {part.title}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="truncate text-[10px] font-bold text-white group-hover:text-blue-300">
                        {part.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SPONSORED / PROMOTIONAL PLACEMENT */}
          <PlayerPromotion />
        </div>
      </div>

      {/* FULL-WIDTH DISCOVERY SECTIONS: MORE LIKE THIS & RECOMMENDATIONS */}
      {similar.length > 0 && (
        <div className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              More Like This
            </h2>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
            {similar.slice(0, 10).map((item) => (
              <div key={item.id} className="w-[310px] sm:w-[350px] md:w-[370px] flex-shrink-0 snap-start">
                <PosterCard item={item} mediaType={mediaType} />
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Recommended For You
            </h2>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 pt-1 [scrollbar-width:none] snap-x snap-mandatory">
            {recommendations.slice(0, 10).map((item) => (
              <div key={item.id} className="w-[310px] sm:w-[350px] md:w-[370px] flex-shrink-0 snap-start">
                <PosterCard item={item} mediaType={mediaType} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXACT MINUTE & SECOND SETTER MODAL */}
      {timeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-[#0b121e] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Timer size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Jump to Exact Minute & Second</h3>
                  <p className="text-[11px] text-slate-400">
                    Current Position: {formatPlaybackTime(activeSeconds)} ({formatPlaybackVerbose(activeSeconds)})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTimeModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inputs for Minutes and Seconds */}
            <div className="my-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={timeInputMinutes}
                    onChange={(e) => setTimeInputMinutes(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center text-lg font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Seconds
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timeInputSeconds}
                    onChange={(e) => setTimeInputSeconds(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center text-lg font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Timestamp Presets */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '0:00 (Start)', sec: 0 },
                    { label: '5:00', sec: 300 },
                    { label: '15:00', sec: 900 },
                    { label: '30:00', sec: 1800 },
                    { label: '45:00', sec: 2700 },
                    { label: '1:00:00', sec: 3600 },
                    { label: '1:30:00', sec: 5400 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const split = splitSecondsToTime(preset.sec);
                        setTimeInputMinutes(String(split.hours * 60 + split.minutes));
                        setTimeInputSeconds(String(split.seconds));
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleCopyTimestamp}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                {copiedTimestamp ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )}
                <span>{copiedTimestamp ? 'Copied!' : 'Copy Current Time'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimeModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const m = parseInt(timeInputMinutes, 10) || 0;
                    const s = parseInt(timeInputSeconds, 10) || 0;
                    handleSetExactTime(m * 60 + s);
                  }}
                  className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Jump to Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS QUICK CHEATSHEET MODAL */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-[#0b121e] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Keyboard size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Media Player Keyboard Shortcuts</h3>
                  <p className="text-[11px] text-slate-400">Global controls active during playback</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 divide-y divide-white/[0.08]">
              {[
                { key: 'Space', desc: 'Play / Pause stream' },
                { key: 'F', desc: 'Toggle Fullscreen' },
                { key: '← / →', desc: 'Seek 10 seconds backward / forward' },
                { key: 'Shift + ← / →', desc: 'Seek 30 seconds backward / forward' },
                { key: 'M', desc: 'Toggle Mute / Unmute audio' },
                { key: 'T', desc: 'Toggle Theater mode' },
                { key: '?', desc: 'Toggle this shortcuts guide' },
                { key: 'Esc', desc: 'Exit Fullscreen or close dialog' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2.5 text-xs">
                  <span className="text-slate-300 font-medium">{s.desc}</span>
                  <kbd className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-bold text-white shadow-inner">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOGS */}
      <CastDialog
        personId={castDialog}
        characterName={cast.find((c) => c.id === castDialog)?.character}
        onClose={() => setCastDialog(null)}
      />
      <DetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={data}
        mediaType={mediaType}
      />
      <VideoDialog video={videoDialog} onClose={() => setVideoDialog(null)} />
    </div>
  );
}
