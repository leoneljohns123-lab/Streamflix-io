import { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Archive,
  Users,
  Lock,
  Globe,
  KeyRound,
  Play,
  Sparkles,
  Search,
  RefreshCw,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  Crown,
  ChevronRight,
  Shield,
  Film,
  Tv,
  MessageSquare,
  Calendar,
  X,
  History,
  Check,
  BarChart3,
  Flame,
  Bell,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { navigate, useRoute } from '@/lib/router';
import { formatPlaybackTime } from '@/lib/playback-store';
import { imageUrl, backdropUrl } from '@/lib/tmdb-config';
import { getTrendingMovies, getTrendingTv, searchMulti } from '@/lib/tmdb';
import type { TmdbMovie, TmdbTv } from '@/lib/tmdb-types';
import { WatchPartyDashboard } from '@/components/WatchPartyDashboard';
import { FollowingManager } from '@/components/FollowingManager';
import { useFollows, checkActiveRoomsForFollows } from '@/lib/following';
import { useAuth } from '@/lib/auth';

interface LiveRoomSummary {
  roomId: string;
  roomName: string;
  title: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  position: number;
  participantCount: number;
  maxParticipants: number;
  hostName: string;
  security: 'public' | 'password' | 'invite';
  isPasswordProtected: boolean;
  hostControlsOnly: boolean;
  genres?: string[];
  participants?: Array<{ id: string; name: string; color?: string; isHost?: boolean }>;
  createdAt: number;
}

interface ClosedPartySummary {
  id: string;
  roomId: string;
  roomName: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  hostName: string;
  totalParticipants: number;
  participantNames: string[];
  startedAt: number;
  closedAt: number;
  durationSeconds: number;
  genres?: string[];
  messageCount: number;
}

interface ClosedPartyFull extends ClosedPartySummary {
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderColor: string;
    text: string;
    timestamp: number;
    type: 'chat' | 'system' | 'reaction';
    isSpoiler?: boolean;
  }>;
}

export function PartiesPage() {
  const route = useRoute();
  const { user } = useAuth();
  const { follows, toggleFollow, isFollowing } = useFollows();
  const initialTab =
    route.params.tab === 'closed'
      ? 'closed'
      : route.params.tab === 'dashboard'
      ? 'dashboard'
      : route.params.tab === 'following'
      ? 'following'
      : 'live';
  const [activeTab, setActiveTab] = useState<'live' | 'closed' | 'dashboard' | 'following'>(initialTab);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string | null>(null);

  // Live Parties State
  const [liveRooms, setLiveRooms] = useState<LiveRoomSummary[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [securityFilter, setSecurityFilter] = useState<'all' | 'public' | 'password'>('all');

  // Closed Parties State
  const [closedParties, setClosedParties] = useState<ClosedPartySummary[]>([]);
  const [closedLoading, setClosedLoading] = useState(true);
  const [closedSearch, setClosedSearch] = useState('');

  // Password Prompt Modal
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; room: LiveRoomSummary | null; error?: string }>({
    open: false,
    room: null,
  });
  const [enteredPassword, setEnteredPassword] = useState('');

  // Replay Modal State
  const [replayParty, setReplayParty] = useState<ClosedPartyFull | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [replaySearch, setReplaySearch] = useState('');

  // Host Watch Party Modal
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [hostStep, setHostStep] = useState<'select_media' | 'configure'>('select_media');
  const [trendingMedia, setTrendingMedia] = useState<Array<TmdbMovie | TmdbTv>>([]);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaSearchResults, setMediaSearchResults] = useState<Array<TmdbMovie | TmdbTv>>([]);
  const [mediaSearching, setMediaSearching] = useState(false);

  // Selected media for hosting
  const [selectedMedia, setSelectedMedia] = useState<{
    id: number;
    title: string;
    mediaType: 'movie' | 'tv';
    posterPath?: string;
    backdropPath?: string;
  } | null>(null);

  const [createRoomName, setCreateRoomName] = useState('');
  const [createSecurity, setCreateSecurity] = useState<'public' | 'password' | 'invite'>('public');
  const [createPassword, setCreatePassword] = useState('');
  const [createMaxLimit, setCreateMaxLimit] = useState(25);
  const [createHostOnly, setCreateHostOnly] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    if (route.params.tab === 'closed') {
      setActiveTab('closed');
    } else if (route.params.tab === 'live') {
      setActiveTab('live');
    } else if (route.params.tab === 'dashboard') {
      setActiveTab('dashboard');
    } else if (route.params.tab === 'following') {
      setActiveTab('following');
    }
  }, [route.params.tab]);

  // Load initial replay if requested via URL params
  useEffect(() => {
    if (route.params.replay) {
      handleOpenReplay(route.params.replay);
    }
  }, [route.params.replay]);

  // Fetch Live Rooms
  const fetchLiveRooms = useCallback(() => {
    setLiveLoading(true);
    fetch('/api/watchparty/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.rooms)) {
          setLiveRooms(data.rooms);
        }
      })
      .catch((err) => console.error('Failed to fetch live watch parties', err))
      .finally(() => setLiveLoading(false));
  }, []);

  // Fetch Closed Parties
  const fetchClosedParties = useCallback(() => {
    setClosedLoading(true);
    fetch('/api/watchparty/closed')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.parties)) {
          setClosedParties(data.parties);
        }
      })
      .catch((err) => console.error('Failed to fetch closed watch parties', err))
      .finally(() => setClosedLoading(false));
  }, []);

  useEffect(() => {
    fetchLiveRooms();
    fetchClosedParties();
  }, [fetchLiveRooms, fetchClosedParties]);

  // Fetch trending media for Host modal picker
  useEffect(() => {
    if (hostModalOpen && trendingMedia.length === 0) {
      Promise.all([getTrendingMovies(1), getTrendingTv(1)])
        .then(([movies, tv]) => {
          const combined = [
            ...(movies?.results || []).slice(0, 8),
            ...(tv?.results || []).slice(0, 8),
          ];
          setTrendingMedia(combined);
        })
        .catch(() => {});
    }
  }, [hostModalOpen, trendingMedia.length]);

  // Debounced media search in Host modal
  useEffect(() => {
    if (!mediaSearchQuery.trim()) {
      setMediaSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setMediaSearching(true);
      searchMulti(mediaSearchQuery.trim())
        .then((res) => {
          const filtered = (res.results || []).filter(
            (item: unknown): item is TmdbMovie | TmdbTv => {
              const obj = item as Record<string, unknown>;
              return obj.media_type === 'movie' || obj.media_type === 'tv' || Boolean(obj.title || obj.name);
            }
          );
          setMediaSearchResults(filtered.slice(0, 10));
        })
        .catch(() => {})
        .finally(() => setMediaSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [mediaSearchQuery]);

  // Handle joining a live party
  const handleJoinParty = async (room: LiveRoomSummary) => {
    if (room.isPasswordProtected) {
      setPasswordModal({ open: true, room });
      setEnteredPassword('');
      return;
    }

    navigateToRoom(room);
  };

  const handleVerifyPasswordAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModal.room) return;

    try {
      const res = await fetch('/api/watchparty/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: passwordModal.room.roomId,
          password: enteredPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.valid) {
        navigateToRoom(passwordModal.room, enteredPassword.trim());
        setPasswordModal({ open: false, room: null });
      } else {
        setPasswordModal((prev) => ({
          ...prev,
          error: data.error || 'Incorrect password entered.',
        }));
      }
    } catch {
      setPasswordModal((prev) => ({ ...prev, error: 'Failed to verify password.' }));
    }
  };

  const navigateToRoom = (room: LiveRoomSummary, _pass?: string) => {
    if (room.mediaType === 'tv') {
      navigate(
        `/player/tv/${room.tmdbId}/${room.season || 1}/${room.episode || 1}?party=${room.roomId}`
      );
    } else {
      navigate(`/player/movie/${room.tmdbId}?party=${room.roomId}`);
    }
  };

  // Open Closed Party Replay
  const handleOpenReplay = async (partyId: string) => {
    setReplayLoading(true);
    try {
      const res = await fetch(`/api/watchparty/closed/${partyId}`);
      const data = await res.json();
      if (data.party) {
        setReplayParty(data.party);
        setRevealedSpoilers(new Set());
      }
    } catch (err) {
      console.error('Failed to load replay', err);
    } finally {
      setReplayLoading(false);
    }
  };

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Host modal submit
  const handleCreateWatchPartySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia) return;
    if (createSecurity === 'password' && !createPassword.trim()) {
      alert('Please specify a password for this party.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch('/api/watchparty/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: createRoomName.trim() || `${selectedMedia.title} Watch Party`,
          mediaType: selectedMedia.mediaType,
          tmdbId: selectedMedia.id,
          title: selectedMedia.title,
          posterPath: selectedMedia.posterPath,
          backdropPath: selectedMedia.backdropPath,
          security: createSecurity,
          password: createPassword.trim(),
          maxParticipants: createMaxLimit,
          hostControlsOnly: createHostOnly,
        }),
      });

      const data = await res.json();
      if (data.success && data.roomId) {
        setHostModalOpen(false);
        if (selectedMedia.mediaType === 'tv') {
          navigate(`/player/tv/${selectedMedia.id}/1/1?party=${data.roomId}`);
        } else {
          navigate(`/player/movie/${selectedMedia.id}?party=${data.roomId}`);
        }
      }
    } catch (err) {
      console.error('Failed to create party', err);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filtered live rooms
  const filteredLiveRooms = liveRooms.filter((r) => {
    if (selectedGenreFilter && (!r.genres || !r.genres.includes(selectedGenreFilter))) return false;
    if (mediaFilter !== 'all' && r.mediaType !== mediaFilter) return false;
    if (securityFilter === 'public' && r.security !== 'public') return false;
    if (securityFilter === 'password' && r.security !== 'password') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchRoom = r.roomId.toLowerCase().includes(q);
      const matchName = r.roomName?.toLowerCase().includes(q);
      const matchHost = r.hostName.toLowerCase().includes(q);
      if (!matchTitle && !matchRoom && !matchName && !matchHost) return false;
    }
    return true;
  });

  // Filtered closed parties
  const filteredClosedParties = closedParties.filter((p) => {
    if (selectedGenreFilter && (!p.genres || !p.genres.includes(selectedGenreFilter))) return false;
    if (closedSearch.trim()) {
      const q = closedSearch.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchRoom = p.roomId.toLowerCase().includes(q);
      const matchName = p.roomName?.toLowerCase().includes(q);
      const matchHost = p.hostName.toLowerCase().includes(q);
      if (!matchTitle && !matchRoom && !matchName && !matchHost) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Title & Navigation Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#f52432] to-[#ff4757] text-white shadow-lg shadow-red-950/40">
              <Radio size={20} className="animate-pulse" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                StreamFlix Watch Parties
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Synchronized cinematic viewing, real-time live chat with spoiler protection & moderation
              </p>
            </div>
          </div>
        </div>

        {/* CTA Host New Party */}
        <button
          type="button"
          onClick={() => {
            setHostStep('select_media');
            setSelectedMedia(null);
            setHostModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f52432] to-[#ff4757] px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95 cursor-pointer"
        >
          <Sparkles size={16} />
          <span>Host a Watch Party</span>
        </button>
      </div>

      {/* QUICK GROUP ANALYTICS BANNER */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-3.5 py-1.5 text-xs font-bold text-red-300 hover:border-red-500/60 hover:bg-red-950/30 transition-all cursor-pointer"
        >
          <Clock size={13} className="text-[#f52432]" />
          <span>Group Watch Time: <strong className="text-white">52.4h Watched Together</strong></span>
          <ChevronRight size={12} className="text-red-400" />
        </div>

        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:border-amber-500/60 hover:bg-amber-950/30 transition-all cursor-pointer"
        >
          <Flame size={13} className="text-amber-400" />
          <span>Top Genre: <strong className="text-white">Sci-Fi (40%)</strong></span>
          <ChevronRight size={12} className="text-amber-400" />
        </div>

        <div
          onClick={() => setActiveTab('following')}
          className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/20 px-3.5 py-1.5 text-xs font-bold text-purple-300 hover:border-purple-500/60 hover:bg-purple-950/30 transition-all cursor-pointer"
        >
          <Bell size={13} className="text-purple-400" />
          <span>Following: <strong className="text-white">{follows.length} Hosts & Friends</strong></span>
          <ChevronRight size={12} className="text-purple-400" />
        </div>

        {selectedGenreFilter && (
          <div className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-500/20 px-3 py-1 text-xs font-bold text-white">
            <span>Filtered by: {selectedGenreFilter}</span>
            <button
              type="button"
              onClick={() => setSelectedGenreFilter(null)}
              className="ml-1 rounded p-0.5 hover:bg-white/20 text-red-200 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Selector: 4 Hub Tabs */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-[#f52432] to-[#ff4757] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio size={14} className={activeTab === 'live' ? 'animate-pulse' : ''} />
            <span>Live Parties</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === 'live' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {liveRooms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'closed'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Archive size={14} />
            <span>Closed Archive</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === 'closed' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-300'
              }`}
            >
              {closedParties.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 size={14} />
            <span>Group Dashboard & Genres</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Following & Friends</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === 'following' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {follows.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (activeTab === 'live') fetchLiveRooms();
            else fetchClosedParties();
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Refresh party rooms"
        >
          <RefreshCw size={13} className={liveLoading || closedLoading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: LIVE WATCH PARTIES */}
      {/* ==================================================================== */}
      {activeTab === 'live' && (
        <div className="mt-6 space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parties by title, room code, or host..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
              />
            </div>

            {/* Filter Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMediaFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    mediaFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('movie')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    mediaFilter === 'movie' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film size={11} /> Movies
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter('tv')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    mediaFilter === 'tv' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tv size={11} /> TV
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setSecurityFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    securityFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Any Mode
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityFilter('public')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    securityFilter === 'public' ? 'bg-emerald-500/30 text-emerald-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe size={11} /> Public
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityFilter('password')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    securityFilter === 'password' ? 'bg-amber-500/30 text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock size={11} /> Protected
                </button>
              </div>
            </div>
          </div>

          {/* Live Parties Grid */}
          {liveLoading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-red-500" />
              <p className="text-sm">Scanning for active watch parties...</p>
            </div>
          ) : filteredLiveRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-20 px-4 text-center">
              <Radio size={36} className="text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Live Parties Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-5">
                {searchQuery
                  ? 'No active rooms match your search query. Try broadening your filter.'
                  : 'There are no live watch parties at this moment. Be the first to start one!'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setHostStep('select_media');
                  setSelectedMedia(null);
                  setHostModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-[#f52432] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#d91b28] transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Host a Watch Party Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLiveRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0e1420] transition-all duration-300 hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-950/20"
                >
                  {/* Backdrop Header Art */}
                  <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                    {room.backdropPath || room.posterPath ? (
                      <img
                        src={backdropUrl(room.backdropPath || room.posterPath, 'w780')}
                        alt={room.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-tr from-[#121926] to-[#1e293b] text-slate-600">
                        <Film size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1420] via-[#0e1420]/40 to-black/30" />

                    {/* Live Badge & Room Code */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                      <span className="rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-md">
                        {room.roomId}
                      </span>
                    </div>

                    {/* Security Badge */}
                    <div className="absolute top-3 right-3">
                      {room.security === 'password' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                          <Lock size={10} /> Password
                        </span>
                      )}
                      {room.security === 'invite' && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300 backdrop-blur-md">
                          <KeyRound size={10} /> Invite Only
                        </span>
                      )}
                      {room.security === 'public' && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur-md">
                          <Globe size={10} /> Public
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Room Body Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                        {room.roomName || `${room.title} Party`}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-300 font-medium line-clamp-1">
                        {room.title}
                        {room.mediaType === 'tv' && ` (S${room.season || 1} E${room.episode || 1})`}
                      </p>

                      {/* Metadata Row */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Crown size={12} className="text-amber-400" />
                          <span>Host: <strong className="text-slate-200">{room.hostName}</strong></span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(room.hostName, 'host');
                            }}
                            className={`ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                              isFollowing(room.hostName)
                                ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300'
                                : 'border border-white/15 bg-white/10 text-slate-300 hover:text-white'
                            }`}
                            title={isFollowing(room.hostName) ? 'Following host' : 'Follow host for party alerts'}
                          >
                            {isFollowing(room.hostName) ? (
                              <>
                                <Check size={10} className="text-blue-400" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={10} />
                                <span>Follow</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Users size={12} />
                          <span>{room.participantCount}/{room.maxParticipants} watching</span>
                        </div>
                      </div>

                      {/* Friend Presence Indicator */}
                      {room.participants && (
                        (() => {
                          const friendsInRoom = room.participants.filter(
                            (p) => p.name.toLowerCase() !== room.hostName.toLowerCase() && isFollowing(p.name)
                          );
                          if (friendsInRoom.length === 0) return null;
                          return (
                            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="font-semibold truncate">
                                Friend{friendsInRoom.length > 1 ? 's' : ''} here: {friendsInRoom.map((f) => f.name).join(', ')}
                              </span>
                            </div>
                          );
                        })()
                      )}

                      {/* Genres tags */}
                      {room.genres && room.genres.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {room.genres.map((g) => (
                            <span
                              key={g}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGenreFilter(selectedGenreFilter === g ? null : g);
                              }}
                              className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold cursor-pointer transition-colors ${
                                selectedGenreFilter === g
                                  ? 'border-red-500 bg-red-500/20 text-red-300'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                              }`}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>At {formatPlaybackTime(room.position)}</span>
                        </div>
                        {room.hostControlsOnly && (
                          <span className="text-[10px] text-blue-400 font-bold">Host Sync Lock</span>
                        )}
                      </div>
                    </div>

                    {/* Join Button */}
                    <button
                      type="button"
                      onClick={() => handleJoinParty(room)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black transition-all hover:bg-slate-200 active:scale-95 cursor-pointer"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>{room.isPasswordProtected ? 'Enter Room PIN to Join' : 'Join Watch Party'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CLOSED PARTIES ARCHIVE (READ-ONLY REPLAY MODE) */}
      {/* ==================================================================== */}
      {activeTab === 'closed' && (
        <div className="mt-6 space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/20 via-[#121926] to-[#0e1420] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Archive size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Archived Watch Party Sessions (Read-Only Replay)</h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Concluded watch parties are archived here. You can open any closed party to replay the chat transcript,
                  revealing spoiler protections, inspecting user reactions, and viewing attendees from that session.
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={closedSearch}
              onChange={(e) => setClosedSearch(e.target.value)}
              placeholder="Search closed parties by title, host, or room ID..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Closed Parties Grid */}
          {closedLoading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-amber-400" />
              <p className="text-sm">Loading closed watch parties archive...</p>
            </div>
          ) : filteredClosedParties.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center text-slate-400">
              <Archive size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No archived watch parties found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClosedParties.map((party) => (
                <div
                  key={party.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0e1420] transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl"
                >
                  <div className="relative h-28 w-full overflow-hidden bg-slate-900">
                    {party.backdropPath || party.posterPath ? (
                      <img
                        src={backdropUrl(party.backdropPath || party.posterPath, 'w780')}
                        alt={party.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-slate-800 text-slate-500">
                        <Film size={28} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1420] via-[#0e1420]/50 to-black/30" />

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-800/90 border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                        CLOSED
                      </span>
                      <span className="rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                        {party.roomId}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      <Archive size={10} /> Replay Ready
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {party.roomName}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {party.title}
                        {party.mediaType === 'tv' && ` (S${party.season || 1} E${party.episode || 1})`}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Host: <strong className="text-slate-200">{party.hostName}</strong></span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFollow(party.hostName, 'host');
                            }}
                            className={`ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                              isFollowing(party.hostName)
                                ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300'
                                : 'border border-white/15 bg-white/10 text-slate-300 hover:text-white'
                            }`}
                            title={isFollowing(party.hostName) ? 'Following host' : 'Follow host for party alerts'}
                          >
                            {isFollowing(party.hostName) ? (
                              <>
                                <Check size={10} className="text-blue-400" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={10} />
                                <span>Follow</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="text-slate-300">{party.totalParticipants} attendees</span>
                      </div>

                      {/* Closed party genres tags */}
                      {party.genres && party.genres.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {party.genres.map((g) => (
                            <span
                              key={g}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGenreFilter(selectedGenreFilter === g ? null : g);
                              }}
                              className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold cursor-pointer transition-colors ${
                                selectedGenreFilter === g
                                  ? 'border-red-500 bg-red-500/20 text-red-300'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                              }`}
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Duration: {Math.floor(party.durationSeconds / 60)} mins</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} /> {party.messageCount} messages
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReplay(party.id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <History size={13} />
                      <span>Replay Party in Read-Only Mode</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: GROUP WATCH PARTY DASHBOARD (TOTAL HOURS & POPULAR GENRES) */}
      {/* ==================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="mt-6">
          <WatchPartyDashboard
            selectedGenreFilter={selectedGenreFilter}
            onSelectGenreFilter={(g) => {
              setSelectedGenreFilter(g);
              if (g) setActiveTab('live');
            }}
            onHostPartyClick={() => {
              setHostStep('select_media');
              setSelectedMedia(null);
              setHostModalOpen(true);
            }}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: FOLLOWING & FRIENDS SOCIAL NETWORK */}
      {/* ==================================================================== */}
      {activeTab === 'following' && (
        <div className="mt-6">
          <FollowingManager
            liveRooms={liveRooms}
            onJoinRoom={(roomId) => {
              const found = liveRooms.find((r) => r.roomId === roomId);
              if (found) handleJoinParty(found);
            }}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* READ-ONLY PARTY REPLAY MODAL */}
      {/* ==================================================================== */}
      {replayParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md">
          <div className="relative flex h-[90vh] max-h-[820px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0b1019] shadow-2xl">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#17141f] via-[#101726] to-[#17141f] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Archive size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{replayParty.roomName}</span>
                    <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300">
                      Read-Only Replay
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Host: {replayParty.hostName} · {replayParty.totalParticipants} attendees · Concluded session
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (replayParty.mediaType === 'tv') {
                      navigate(`/player/tv/${replayParty.tmdbId}/${replayParty.season || 1}/${replayParty.episode || 1}`);
                    } else {
                      navigate(`/player/movie/${replayParty.tmdbId}`);
                    }
                  }}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl bg-[#f52432] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d91b28] cursor-pointer"
                >
                  <Play size={12} fill="currentColor" /> Play Title
                </button>

                <button
                  type="button"
                  onClick={() => setReplayParty(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split view media preview and chat replay */}
            <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
              {/* Left Column: Media Details & Attendees */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 bg-[#080d14] p-4 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 border border-white/10 mb-3">
                    {replayParty.backdropPath || replayParty.posterPath ? (
                      <img
                        src={backdropUrl(replayParty.backdropPath || replayParty.posterPath, 'w780')}
                        alt={replayParty.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-xs font-bold text-white">{replayParty.title}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/[0.06]">
                      <span className="text-slate-500">Party Code:</span>
                      <span className="font-mono font-bold text-white">{replayParty.roomId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.06]">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-bold text-white">{Math.floor(replayParty.durationSeconds / 60)} minutes</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/[0.06]">
                      <span className="text-slate-500">Messages:</span>
                      <span className="font-bold text-white">{replayParty.messages.length} messages</span>
                    </div>
                  </div>

                  {/* Attendees List */}
                  <div className="mt-4">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Party Attendees ({replayParty.participantNames.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {replayParty.participantNames.map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-slate-200"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06] text-[11px] text-slate-500 text-center">
                  Session recorded on StreamFlix
                </div>
              </div>

              {/* Right Column: Replayed Messages Feed */}
              <div className="flex flex-1 flex-col overflow-hidden bg-[#090e17]">
                {/* Search within transcript */}
                <div className="border-b border-white/10 p-2.5 bg-black/30 flex items-center gap-2">
                  <Search size={13} className="text-slate-500 ml-1" />
                  <input
                    type="text"
                    value={replaySearch}
                    onChange={(e) => setReplaySearch(e.target.value)}
                    placeholder="Search in session chat transcript..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  {replaySearch && (
                    <button
                      type="button"
                      onClick={() => setReplaySearch('')}
                      className="text-slate-400 hover:text-white text-xs mr-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Messages list with spoiler toggle support */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
                  {replayParty.messages
                    .filter((m) => {
                      if (!replaySearch.trim()) return true;
                      return (
                        m.text.toLowerCase().includes(replaySearch.toLowerCase()) ||
                        m.senderName.toLowerCase().includes(replaySearch.toLowerCase())
                      );
                    })
                    .map((m) => {
                      if (m.type === 'system') {
                        return (
                          <div
                            key={m.id}
                            className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-center text-[11px] text-slate-400"
                          >
                            {m.text}
                          </div>
                        );
                      }

                      const isSpoiler = Boolean(m.isSpoiler);
                      const isRevealed = revealedSpoilers.has(m.id);

                      return (
                        <div key={m.id} className="flex flex-col items-start">
                          <div className="mb-0.5 flex items-center gap-2 px-1">
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: m.senderColor || '#f52432' }}
                            >
                              {m.senderName}
                            </span>
                            {isSpoiler && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                <AlertTriangle size={9} /> Spoiler
                              </span>
                            )}
                            <span className="text-[9px] text-slate-500">
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {isSpoiler ? (
                            <div className="max-w-[85%] rounded-2xl border border-amber-500/30 bg-[#17121c] p-2.5 text-xs text-slate-200">
                              {!isRevealed ? (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                    <EyeOff size={13} />
                                    <span>Spoiler Warning</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Message flagged as spoiler during the live party.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => toggleSpoiler(m.id)}
                                    className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    <span>Click to Reveal Spoiler</span>
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div className="mb-1 flex items-center justify-between border-b border-white/10 pb-1 text-[10px] text-amber-400">
                                    <span>Spoiler Revealed</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleSpoiler(m.id)}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      Hide
                                    </button>
                                  </div>
                                  <p className="leading-relaxed">{m.text}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200 leading-relaxed">
                              {m.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Read-Only Notice Bar */}
                <div className="border-t border-white/10 bg-black/60 p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Archive size={14} className="text-amber-400" />
                  <span>This watch party has concluded. Chat transcript is in read-only mode.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PASSWORD ENTRY MODAL */}
      {/* ==================================================================== */}
      {passwordModal.open && passwordModal.room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0e1420] p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-amber-400">
              <Lock size={20} />
              <h4 className="text-base font-bold text-white">Enter Party Password</h4>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Watch party <strong className="text-white">{passwordModal.room.roomName}</strong> (Code:{' '}
              <span className="font-mono font-bold text-emerald-400">{passwordModal.room.roomId}</span>) is password
              protected by the host.
            </p>

            {passwordModal.error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/15 p-2 text-xs text-red-300">
                {passwordModal.error}
              </div>
            )}

            <form onSubmit={handleVerifyPasswordAndJoin} className="space-y-4">
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Enter room password"
                autoFocus
                required
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModal({ open: false, room: null })}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-black hover:bg-amber-400 cursor-pointer"
                >
                  Unlock & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* HOST WATCH PARTY MODAL */}
      {/* ==================================================================== */}
      {hostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e1420] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setHostModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            {hostStep === 'select_media' ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-600 text-white">
                    <Film size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Select a Movie or Series to Stream</h3>
                    <p className="text-xs text-slate-400">Step 1: Choose title to watch with friends</p>
                  </div>
                </div>

                {/* Media Search */}
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={mediaSearchQuery}
                    onChange={(e) => setMediaSearchQuery(e.target.value)}
                    placeholder="Search any movie or show (e.g. Inception, Breaking Bad)..."
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
                  />
                </div>

                {/* Media Picker List */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                  {(mediaSearchResults.length > 0 ? mediaSearchResults : trendingMedia).map((item) => {
                    const titleText = 'title' in item ? item.title : item.name;
                    const isTv = 'name' in item;
                    return (
                      <button
                        key={`${item.id}-${isTv ? 'tv' : 'movie'}`}
                        type="button"
                        onClick={() => {
                          setSelectedMedia({
                            id: item.id,
                            title: titleText,
                            mediaType: isTv ? 'tv' : 'movie',
                            posterPath: item.poster_path || undefined,
                            backdropPath: item.backdrop_path || undefined,
                          });
                          setCreateRoomName(`${titleText} Watch Party`);
                          setHostStep('configure');
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 text-left transition-all hover:border-red-500/60 hover:bg-white/[0.06] cursor-pointer"
                      >
                        <img
                          src={imageUrl(item.poster_path, 'w92')}
                          alt={titleText}
                          className="h-14 w-10 rounded-lg object-cover bg-slate-800"
                        />
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{titleText}</h4>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {isTv ? 'TV Series' : 'Movie'} · ★ {item.vote_average?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <ChevronRight size={15} className="text-slate-500" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Step 2: Configure Room Security & Rules */
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-[#f52432] to-[#ff4757] text-white">
                    <Shield size={16} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Configure Party Room Security</h3>
                    <p className="text-xs text-slate-400">Step 2: Security settings for {selectedMedia?.title}</p>
                  </div>
                </div>

                <form onSubmit={handleCreateWatchPartySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Party Room Name
                    </label>
                    <input
                      type="text"
                      value={createRoomName}
                      onChange={(e) => setCreateRoomName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                      Security & Privacy Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCreateSecurity('public')}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                          createSecurity === 'public'
                            ? 'border-emerald-500/60 bg-emerald-500/15 text-white'
                            : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <Globe size={16} className={createSecurity === 'public' ? 'text-emerald-400' : ''} />
                        <span className="text-[11px] font-bold mt-1">Public</span>
                        <span className="text-[9px] text-slate-400">Listed in directory</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCreateSecurity('password')}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                          createSecurity === 'password'
                            ? 'border-amber-500/60 bg-amber-500/15 text-white'
                            : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <Lock size={16} className={createSecurity === 'password' ? 'text-amber-400' : ''} />
                        <span className="text-[11px] font-bold mt-1">Password</span>
                        <span className="text-[9px] text-slate-400">PIN required</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCreateSecurity('invite')}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                          createSecurity === 'invite'
                            ? 'border-purple-500/60 bg-purple-500/15 text-white'
                            : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <KeyRound size={16} className={createSecurity === 'invite' ? 'text-purple-400' : ''} />
                        <span className="text-[11px] font-bold mt-1">Invite Only</span>
                        <span className="text-[9px] text-slate-400">Direct code only</span>
                      </button>
                    </div>
                  </div>

                  {createSecurity === 'password' && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-400 mb-1">
                        Room Password / Passcode
                      </label>
                      <input
                        type="text"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="e.g. cinema123"
                        required
                        className="w-full rounded-xl border border-amber-500/40 bg-white/[0.04] px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Max Capacity
                      </label>
                      <select
                        value={createMaxLimit}
                        onChange={(e) => setCreateMaxLimit(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/15 bg-[#121926] px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value={5}>5 viewers</option>
                        <option value={10}>10 viewers</option>
                        <option value={25}>25 viewers</option>
                        <option value={50}>50 viewers</option>
                        <option value={100}>100 viewers</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Control Mode
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreateHostOnly(!createHostOnly)}
                        className={`flex w-full items-center justify-center rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                          createHostOnly
                            ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                            : 'border-white/10 bg-white/[0.03] text-slate-300'
                        }`}
                      >
                        {createHostOnly ? 'Host Only Sync' : 'Anyone Can Sync'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setHostStep('select_media')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ← Back to media selection
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHostModalOpen(false)}
                        className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createSubmitting}
                        className="rounded-xl bg-[#f52432] px-5 py-2 text-xs font-bold text-white hover:bg-[#d91b28] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {createSubmitting ? 'Launching...' : 'Start Watch Party'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
