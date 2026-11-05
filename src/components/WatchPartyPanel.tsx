import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Send,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Crown,
  Radio,
  Sparkles,
  UserCheck,
  Edit3,
  Link2,
  Lock,
  Globe,
  KeyRound,
  Shield,
  ShieldAlert,
  VolumeX,
  Volume2,
  UserX,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  ChevronDown,
  Info,
  Archive,
  BarChart3,
  UserPlus,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatPlaybackTime } from '@/lib/playback-store';
import { navigate } from '@/lib/router';
import { WatchPartyDashboard } from './WatchPartyDashboard';
import { useFollows } from '@/lib/following';

export interface WatchPartyParticipant {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isMuted?: boolean;
  joinedAt: number;
}

export interface WatchPartyMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'reaction';
  isSpoiler?: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

interface WatchPartyPanelProps {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  season?: number;
  episode?: number;
  activeSeconds: number;
  initialPartyCode?: string;
  onSyncPlayback: (opts: { season?: number; episode?: number; position: number }) => void;
  onReactionBurst?: (reaction: FloatingReaction) => void;
}

const AVATAR_COLORS = [
  '#f52432',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

const REACTION_EMOJIS = ['🔥', '😂', '😱', '❤️', '👏', '🤯'];

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'client_ssr';
  const key = 'streamflix_watchparty_client_id';
  let existing = sessionStorage.getItem(key);
  if (!existing) {
    existing = `sf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(key, existing);
  }
  return existing;
}

function getSavedNickname(defaultEmail?: string | null): string {
  if (typeof window === 'undefined') return 'CinemaFan';
  const stored = localStorage.getItem('streamflix_watchparty_nickname');
  if (stored) return stored;
  if (defaultEmail) return defaultEmail.split('@')[0];
  return `Viewer-${Math.floor(100 + Math.random() * 899)}`;
}

export function WatchPartyPanel({
  mediaType,
  tmdbId,
  title,
  posterPath,
  backdropPath,
  season = 1,
  episode = 1,
  activeSeconds,
  initialPartyCode,
  onSyncPlayback,
  onReactionBurst,
}: WatchPartyPanelProps) {
  const { user } = useAuth();
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const colorRef = useRef<string>(
    AVATAR_COLORS[Math.abs(clientIdRef.current.charCodeAt(3) || 0) % AVATAR_COLORS.length]
  );

  const [userName, setUserName] = useState<string>(() => getSavedNickname(user?.email));
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);

  const [roomId, setRoomId] = useState<string | null>(
    initialPartyCode ? initialPartyCode.trim().toUpperCase() : null
  );
  const [roomName, setRoomName] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const { follows, toggleFollow, isFollowing } = useFollows();
  const [inRoomTab, setInRoomTab] = useState<'chat' | 'people' | 'dashboard'>('chat');

  // Security & Room Config State
  const [securityType, setSecurityType] = useState<'public' | 'password' | 'invite'>('public');
  const [hostControlsOnly, setHostControlsOnly] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [roomPasswordPrompt, setRoomPasswordPrompt] = useState<{ open: boolean; roomId: string; error?: string }>({
    open: false,
    roomId: '',
  });
  const [enteredPassword, setEnteredPassword] = useState('');

  // Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitleDraft, setCreateTitleDraft] = useState(`${title} Party`);
  const [createSecurity, setCreateSecurity] = useState<'public' | 'password' | 'invite'>('public');
  const [createPassword, setCreatePassword] = useState('');
  const [createMaxLimit, setCreateMaxLimit] = useState(25);
  const [createHostOnlySync, setCreateHostOnlySync] = useState(false);
  const [creatingLoading, setCreatingLoading] = useState(false);

  // Moderation & Status State
  const [participants, setParticipants] = useState<WatchPartyParticipant[]>([]);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [partyPosition, setPartyPosition] = useState<number>(activeSeconds);
  const [partySeason, setPartySeason] = useState<number>(season);
  const [partyEpisode, setPartyEpisode] = useState<number>(episode);
  const [hostId, setHostId] = useState<string>('');
  const [chatInput, setChatInput] = useState('');

  // Spoiler Protection State
  const [isSpoilerToggle, setIsSpoilerToggle] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  // Moderation state
  const [selectedUserMod, setSelectedUserMod] = useState<WatchPartyParticipant | null>(null);
  const [isMutedSelf, setIsMutedSelf] = useState(false);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [closedNotice, setClosedNotice] = useState<{ message: string; archivedId?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active lobby rooms list
  const [availableRooms, setAvailableRooms] = useState<
    Array<{
      roomId: string;
      roomName?: string;
      title: string;
      participantCount: number;
      hostName: string;
      position: number;
      security?: string;
      isPasswordProtected?: boolean;
    }>
  >([]);

  const wsRef = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const activeSecondsRef = useRef<number>(activeSeconds);
  const autoSyncRef = useRef<boolean>(autoSync);

  useEffect(() => {
    activeSecondsRef.current = activeSeconds;
  }, [activeSeconds]);

  useEffect(() => {
    autoSyncRef.current = autoSync;
  }, [autoSync]);

  // Fetch active rooms for this title
  const fetchActiveRooms = useCallback(() => {
    fetch(`/api/watchparty/rooms?tmdbId=${tmdbId}&mediaType=${mediaType}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.rooms)) {
          setAvailableRooms(d.rooms);
        }
      })
      .catch(() => {});
  }, [tmdbId, mediaType]);

  useEffect(() => {
    if (!roomId) {
      fetchActiveRooms();
    }
  }, [roomId, fetchActiveRooms]);

  // Auto-scroll chat feed container (without scrolling the browser window)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Check self-muted status
  useEffect(() => {
    const me = participants.find((p) => p.id === clientIdRef.current);
    setIsMutedSelf(Boolean(me?.isMuted));
  }, [participants]);

  // Connect WebSocket when roomId is active
  useEffect(() => {
    if (!roomId) {
      setConnected(false);
      setParticipants([]);
      setMessages([]);
      setKickedNotice(null);
      setClosedNotice(null);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSocket = () => {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/watchparty`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);
        setErrorMessage(null);
        ws.send(
          JSON.stringify({
            type: 'room:join',
            payload: {
              roomId,
              clientId: clientIdRef.current,
              userName,
              userColor: colorRef.current,
              mediaType,
              tmdbId,
              title,
              season,
              episode,
              position: activeSecondsRef.current,
              password: enteredPassword || undefined,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          const { type, payload } = msg;

          if (type === 'room:state' && payload) {
            setHostId(payload.hostId || '');
            setRoomName(payload.roomName || `${payload.title || title} Party`);
            setParticipants(payload.participants || []);
            setMessages(payload.messages || []);
            setSecurityType(payload.security || 'public');
            setIsPasswordProtected(Boolean(payload.isPasswordProtected));
            setHostControlsOnly(Boolean(payload.hostControlsOnly));
            setMaxParticipants(payload.maxParticipants || 50);

            if (typeof payload.position === 'number') setPartyPosition(payload.position);
            if (typeof payload.season === 'number') setPartySeason(payload.season);
            if (typeof payload.episode === 'number') setPartyEpisode(payload.episode);
          } else if (type === 'playback:synced' && payload) {
            if (typeof payload.position === 'number') setPartyPosition(payload.position);
            if (typeof payload.season === 'number') setPartySeason(payload.season);
            if (typeof payload.episode === 'number') setPartyEpisode(payload.episode);
            if (Array.isArray(payload.messages)) {
              setMessages(payload.messages);
            }

            // If triggered by another participant and Auto-Sync is enabled, jump player!
            if (
              payload.triggeredBy &&
              payload.triggeredBy !== clientIdRef.current &&
              autoSyncRef.current
            ) {
              onSyncPlayback({
                season: payload.season,
                episode: payload.episode,
                position: payload.position,
              });
            }
          } else if (type === 'chat:new_message' && payload) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
          } else if (type === 'reaction:burst' && payload) {
            if (onReactionBurst) {
              onReactionBurst({
                id: payload.id,
                emoji: payload.emoji,
                senderName: payload.senderName || 'Viewer',
                leftPercent: 15 + Math.floor(Math.random() * 70),
              });
            }
          } else if (type === 'room:kicked') {
            setKickedNotice(payload.reason || 'You were removed from this party by the host.');
            setConnected(false);
          } else if (type === 'room:closed') {
            setClosedNotice({
              message: payload.message || 'This watch party has been concluded by the host.',
              archivedId: payload.archivedId,
            });
            setConnected(false);
          } else if (type === 'room:error') {
            if (payload.code === 'INVALID_PASSWORD') {
              setRoomPasswordPrompt({ open: true, roomId, error: 'Incorrect password entered.' });
              setRoomId(null);
            } else if (payload.code === 'KICKED') {
              setKickedNotice(payload.message || 'You were removed and cannot rejoin.');
            } else {
              setErrorMessage(payload.message || 'Error communicating with room');
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        if (!kickedNotice && !closedNotice) {
          reconnectTimer = setTimeout(connectSocket, 2500);
        }
      };
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId, mediaType, tmdbId, title, enteredPassword, kickedNotice, closedNotice]);

  const isHost = hostId === clientIdRef.current;

  // Toggle revealing an individual spoiler message
  const toggleSpoilerReveal = (msgId: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  // Robust room creation via backend REST endpoint
  const handleCreateRobustParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSecurity === 'password' && !createPassword.trim()) {
      alert('Please enter a password for this protected party.');
      return;
    }

    setCreatingLoading(true);
    try {
      const res = await fetch('/api/watchparty/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: createTitleDraft.trim() || `${title} Party`,
          mediaType,
          tmdbId,
          title,
          posterPath,
          backdropPath,
          season,
          episode,
          security: createSecurity,
          password: createPassword.trim(),
          maxParticipants: createMaxLimit,
          hostControlsOnly: createHostOnlySync,
          initialPosition: activeSeconds,
        }),
      });

      const data = await res.json();
      if (data.success && data.roomId) {
        setRoomId(data.roomId);
        setRoomName(createTitleDraft.trim() || `${title} Party`);
        setSecurityType(createSecurity);
        setIsPasswordProtected(createSecurity === 'password');
        setHostControlsOnly(createHostOnlySync);
        if (createSecurity === 'password') {
          setEnteredPassword(createPassword.trim());
        }
        setCreateModalOpen(false);
        updateUrlPartyParam(data.roomId);
      }
    } catch (err) {
      console.error('Failed to create party', err);
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleJoinRoom = async (code: string, passwordAttempt?: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    // Check if room requires password before joining
    try {
      const roomsRes = await fetch(`/api/watchparty/rooms?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      const roomsData = await roomsRes.json();
      const targetRoom = (roomsData?.rooms || []).find((r: { roomId: string }) => r.roomId === clean);

      if (targetRoom && targetRoom.security === 'password' && !passwordAttempt) {
        setRoomPasswordPrompt({ open: true, roomId: clean });
        return;
      }
    } catch {
      // Proceed directly if check fails
    }

    if (passwordAttempt) {
      setEnteredPassword(passwordAttempt);
    }
    setRoomId(clean);
    setJoinCodeInput('');
    setRoomPasswordPrompt({ open: false, roomId: '' });
    updateUrlPartyParam(clean);
  };

  const handleLeaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setRoomId(null);
    setKickedNotice(null);
    setClosedNotice(null);
    setErrorMessage(null);
    setEnteredPassword('');
    updateUrlPartyParam(null);
  };

  const updateUrlPartyParam = (partyCode: string | null) => {
    if (typeof window === 'undefined') return;
    const baseHash =
      mediaType === 'tv'
        ? `#/player/tv/${tmdbId}/${season}/${episode}`
        : `#/player/movie/${tmdbId}`;
    const nextHash = partyCode ? `${baseHash}?party=${partyCode}` : baseHash;
    window.history.replaceState(null, '', nextHash);
  };

  const handleBroadcastSync = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (hostControlsOnly && !isHost) {
      setErrorMessage('Only the host can sync playback in this party.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'sync:playback',
        payload: {
          mediaType,
          tmdbId,
          title,
          season,
          episode,
          position: activeSeconds,
          isPlaying: true,
          announce: true,
        },
      })
    );
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutedSelf) return;
    const trimmed = chatInput.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    wsRef.current.send(
      JSON.stringify({
        type: 'chat:message',
        payload: {
          id: msgId,
          text: trimmed,
          isSpoiler: isSpoilerToggle,
        },
      })
    );

    setChatInput('');
    setIsSpoilerToggle(false);
  };

  const handleSendReaction = (emoji: string) => {
    if (isMutedSelf) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'reaction:send',
        payload: {
          id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          emoji,
        },
      })
    );
  };

  // Host Moderation Actions
  const handleHostMute = (targetId: string, currentMuted: boolean) => {
    if (!isHost || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'admin:mute',
        payload: {
          targetClientId: targetId,
          isMuted: !currentMuted,
        },
      })
    );
    setSelectedUserMod(null);
  };

  const handleHostKick = (targetId: string, targetName: string) => {
    if (!isHost || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (window.confirm(`Kick ${targetName} from the watch party?`)) {
      wsRef.current.send(
        JSON.stringify({
          type: 'admin:kick',
          payload: {
            targetClientId: targetId,
            reason: 'Removed by room host.',
          },
        })
      );
      setSelectedUserMod(null);
    }
  };

  const handleHostToggleControls = () => {
    if (!isHost || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'admin:toggle_host_controls',
      })
    );
  };

  const handleHostCloseRoom = async () => {
    if (!isHost || !roomId) return;
    if (
      window.confirm(
        'Are you sure you want to conclude this watch party? It will be saved into the Closed Parties archive for replay.'
      )
    ) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'admin:close_room',
          })
        );
      } else {
        // Fallback to REST API
        await fetch(`/api/watchparty/rooms/${roomId}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostClientId: clientIdRef.current }),
        });
      }
    }
  };

  const handleSaveNickname = () => {
    const clean = nameDraft.trim().slice(0, 24);
    if (!clean) return;
    setUserName(clean);
    setEditingName(false);
    localStorage.setItem('streamflix_watchparty_nickname', clean);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'user:rename',
          payload: { newName: clean },
        })
      );
    }
  };

  const handleCopyInviteLink = () => {
    if (typeof window === 'undefined' || !roomId) return;
    const baseHash =
      mediaType === 'tv'
        ? `#/player/tv/${tmdbId}/${season}/${episode}`
        : `#/player/movie/${tmdbId}`;
    const fullUrl = `${window.location.origin}/?#${baseHash.replace('#/', '')}?party=${roomId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2200);
    });
  };

  // --------------------------------------------------------------------------
  // KICKED SCREEN
  // --------------------------------------------------------------------------
  if (kickedNotice) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-[#090e17]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-red-500/20 border border-red-500/40 text-red-400 mb-4">
          <UserX size={26} />
        </div>
        <h3 className="text-base font-bold text-white mb-2">Removed from Watch Party</h3>
        <p className="max-w-xs text-xs text-slate-400 mb-6">{kickedNotice}</p>
        <button
          type="button"
          onClick={handleLeaveRoom}
          className="rounded-xl bg-white px-5 py-2.5 text-xs font-black text-black hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Return to Player
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // CLOSED PARTY SCREEN
  // --------------------------------------------------------------------------
  if (closedNotice) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-amber-500/40 bg-[#090e17]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-4">
          <Archive size={26} />
        </div>
        <h3 className="text-base font-bold text-white mb-2">Watch Party Concluded</h3>
        <p className="max-w-xs text-xs text-slate-400 mb-6">{closedNotice.message}</p>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              handleLeaveRoom();
              navigate('/parties?tab=closed');
            }}
            className="rounded-xl bg-[#f52432] px-4 py-2 text-xs font-bold text-white hover:bg-[#d91b28] transition-colors cursor-pointer"
          >
            View in Closed Parties Archive
          </button>
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LOBBY VIEW (NOT CURRENTLY IN A ROOM)
  // --------------------------------------------------------------------------
  if (!roomId) {
    return (
      <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-red-500/30 bg-[#090e17]/95 shadow-2xl backdrop-blur-xl">
        {/* Lobby Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-[#1a1226] via-[#121929] to-[#1a1226] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-[#f52432] to-[#ff6b76] text-white shadow-md">
                <Users size={16} />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Watch Party
                </h3>
                <p className="text-[11px] text-slate-400">Stream in sync with friends in real-time</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/parties')}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <Radio size={12} className="animate-pulse" />
              All Parties
            </button>
          </div>
        </div>

        {/* Lobby Body */}
        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
          {/* User Nickname Picker */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Your Party Nickname
              </span>
              {!editingName && (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(userName);
                    setEditingName(true);
                  }}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                >
                  <Edit3 size={11} /> Edit
                </button>
              )}
            </div>

            {editingName ? (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={24}
                  className="flex-1 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
                  placeholder="Enter your nickname"
                />
                <button
                  type="button"
                  onClick={handleSaveNickname}
                  className="rounded-lg bg-[#f52432] px-3 py-1 text-xs font-bold text-white hover:bg-[#d91b28] cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colorRef.current }}
                />
                <span className="text-xs font-bold text-white">{userName}</span>
              </div>
            )}
          </div>

          {/* Start New Watch Party Button */}
          <button
            type="button"
            onClick={() => {
              setCreateTitleDraft(`${title} Party`);
              setCreateModalOpen(true);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f52432] to-[#ff4757] py-3 text-xs font-black text-white shadow-lg transition-all hover:scale-[1.01] hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Host a Secure Watch Party</span>
          </button>

          {/* Join Existing Room by Code */}
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Have a Party Room Code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom(joinCodeInput)}
                placeholder="e.g. SF-4821"
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-xs font-mono font-bold uppercase text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleJoinRoom(joinCodeInput)}
                disabled={!joinCodeInput.trim()}
                className="rounded-xl bg-white px-4 py-2 text-xs font-black text-black transition-all hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Join
              </button>
            </div>
          </div>

          {/* Active Live Rooms for this Title */}
          {availableRooms.length > 0 && (
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Radio size={11} className="animate-pulse" />
                  Live Rooms Watching This Title
                </span>
                <button
                  type="button"
                  onClick={fetchActiveRooms}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <div className="space-y-1.5">
                {availableRooms.map((r) => (
                  <div
                    key={r.roomId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">{r.roomId}</span>
                        {r.security === 'password' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400">
                            <Lock size={10} /> Protected
                          </span>
                        )}
                        {r.security === 'invite' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-400">
                            <KeyRound size={10} /> Invite
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Host: {r.hostName} · {r.participantCount} watching
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoinRoom(r.roomId)}
                      className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CREATE PARTY MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0e1420] p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-[#f52432] to-[#ff4757] text-white">
                  <Shield size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Robust Watch Party</h3>
                  <p className="text-[11px] text-slate-400">Configure room security & controls</p>
                </div>
              </div>

              <form onSubmit={handleCreateRobustParty} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={createTitleDraft}
                    onChange={(e) => setCreateTitleDraft(e.target.value)}
                    required
                    placeholder="e.g. Friday Night Movie Marathon"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    Security & Access Mode
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
                      <span className="text-[9px] text-slate-400">Anyone joins</span>
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
                      <span className="text-[9px] text-slate-400">PIN protected</span>
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
                      <span className="text-[9px] text-slate-400">Direct code</span>
                    </button>
                  </div>
                </div>

                {createSecurity === 'password' && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-400 mb-1">
                      Room Password / PIN
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
                      Max Participants
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
                      Control Authority
                    </label>
                    <button
                      type="button"
                      onClick={() => setCreateHostOnlySync(!createHostOnlySync)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        createHostOnlySync
                          ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                          : 'border-white/10 bg-white/[0.03] text-slate-300'
                      }`}
                    >
                      {createHostOnlySync ? 'Host Only Sync' : 'Anyone Can Sync'}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingLoading}
                    className="rounded-xl bg-[#f52432] px-5 py-2 text-xs font-bold text-white hover:bg-[#d91b28] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creatingLoading ? 'Creating...' : 'Launch Watch Party'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PASSWORD PROMPT MODAL */}
        {roomPasswordPrompt.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-[#0e1420] p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <Lock size={18} />
                <h4 className="text-sm font-bold text-white">Password Protected Room</h4>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Room <strong className="text-white">{roomPasswordPrompt.roomId}</strong> requires a password to join.
              </p>
              {roomPasswordPrompt.error && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300">
                  {roomPasswordPrompt.error}
                </div>
              )}
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoomPasswordPrompt({ open: false, roomId: '' })}
                  className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleJoinRoom(roomPasswordPrompt.roomId, enteredPassword)}
                  className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-400 cursor-pointer"
                >
                  Unlock & Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ACTIVE ROOM VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-red-500/30 bg-[#090e17]/95 shadow-2xl backdrop-blur-xl">
      {/* Top Room Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-[#16101c] via-[#101726] to-[#16101c] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-white">
                  {roomId}
                </span>
                {securityType === 'password' && (
                  <span className="inline-flex items-center text-[10px] text-amber-400" title="Password protected">
                    <Lock size={11} />
                  </span>
                )}
                {securityType === 'invite' && (
                  <span className="inline-flex items-center text-[10px] text-purple-400" title="Invite only">
                    <KeyRound size={11} />
                  </span>
                )}
                {isHost && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300">
                    <Crown size={9} /> Host
                  </span>
                )}
              </div>
              {roomName && <span className="text-[10px] text-slate-400 truncate max-w-[160px]">{roomName}</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Copy Watch Party invite link"
            >
              {copiedInvite ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Link2 size={11} />
                  <span>Invite</span>
                </>
              )}
            </button>

            {isHost && (
              <button
                type="button"
                onClick={handleHostCloseRoom}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
                title="End party and archive session"
              >
                End Party
              </button>
            )}

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/20 hover:text-white transition-colors cursor-pointer"
              title="Leave Watch Party"
            >
              <LogOut size={11} />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Playback Sync Control Bar */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-2 text-slate-300">
            <span>Party Time:</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatPlaybackTime(partyPosition)}
              {mediaType === 'tv' && ` (S${partySeason} E${partyEpisode})`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isHost && (
              <button
                type="button"
                onClick={handleHostToggleControls}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  hostControlsOnly
                    ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
                title="Toggle Host-Only Sync Lock"
              >
                Lock: {hostControlsOnly ? 'Host Only' : 'Open'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setAutoSync(!autoSync)}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                autoSync
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10'
              }`}
              title="Automatically jump when someone syncs the room"
            >
              Auto-Sync: {autoSync ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={handleBroadcastSync}
              disabled={hostControlsOnly && !isHost}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f52432] px-2.5 py-1 text-[10px] font-black text-white shadow hover:bg-[#d91b28] transition-all active:scale-95 cursor-pointer disabled:opacity-40"
              title={
                hostControlsOnly && !isHost
                  ? 'Only host can sync'
                  : 'Sync everyone in the room to your current timestamp'
              }
            >
              <RefreshCw size={10} />
              <span>Sync All to {formatPlaybackTime(activeSeconds)}</span>
            </button>
          </div>
        </div>

        {/* Active Participants Strip & Moderation Trigger */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mr-1">
            <UserCheck size={11} className="text-emerald-400" />
            {participants.length}/{maxParticipants} online:
          </span>
          {participants.map((p) => {
            const canModerate = isHost && p.id !== clientIdRef.current;
            return (
              <div key={p.id} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => canModerate && setSelectedUserMod(selectedUserMod?.id === p.id ? null : p)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all ${
                    canModerate ? 'hover:border-amber-400 cursor-pointer' : 'cursor-default'
                  } ${
                    p.isMuted
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-white/10 bg-white/[0.04] text-slate-200'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.name}</span>
                  {p.isHost && <Crown size={9} className="text-amber-400" />}
                  {p.isMuted && <VolumeX size={9} className="text-amber-400" />}
                </button>

                {/* Host Moderation Dropdown */}
                {canModerate && selectedUserMod?.id === p.id && (
                  <div className="absolute left-0 top-6 z-20 w-36 rounded-xl border border-white/15 bg-[#121926] p-1.5 shadow-2xl">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-white/10 mb-1">
                      Moderate {p.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleHostMute(p.id, Boolean(p.isMuted))}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
                    >
                      {p.isMuted ? (
                        <>
                          <Volume2 size={12} className="text-emerald-400" />
                          <span>Unmute User</span>
                        </>
                      ) : (
                        <>
                          <VolumeX size={12} className="text-amber-400" />
                          <span>Mute User</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHostKick(p.id, p.name)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/15 cursor-pointer"
                    >
                      <UserX size={12} />
                      <span>Kick Member</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <div className="mt-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-[11px] text-red-300">
            {errorMessage}
          </div>
        )}
      </div>

      {/* In-Room Sub-Tabs: Chat | People & Follow | Group Dashboard */}
      <div className="flex border-b border-white/10 bg-black/40 px-3 py-1.5 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setInRoomTab('chat')}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
            inRoomTab === 'chat'
              ? 'bg-[#f52432] text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare size={12} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setInRoomTab('people')}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
            inRoomTab === 'people'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={12} />
          <span>People & Follow ({participants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setInRoomTab('dashboard')}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
            inRoomTab === 'dashboard'
              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 size={12} />
          <span>Group Dashboard</span>
        </button>
      </div>

      {inRoomTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          <WatchPartyDashboard compact />
        </div>
      )}

      {inRoomTab === 'people' && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 [scrollbar-width:thin]">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-2">
            <span>Room Members ({participants.length})</span>
            <span>Follow hosts or friends for alerts</span>
          </div>

          {participants.map((p) => {
            const isMe = p.id === clientIdRef.current;
            const following = isFollowing(p.name);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="grid h-8 w-8 place-items-center rounded-lg font-bold text-white text-xs shadow"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      {isMe && <span className="text-[10px] text-slate-400 font-bold">(You)</span>}
                      {p.isHost && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                          <Crown size={9} /> Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {p.isHost ? 'Watch Party Host' : 'Room Participant'}
                    </span>
                  </div>
                </div>

                {!isMe && (
                  <button
                    type="button"
                    onClick={() => toggleFollow(p.name, p.isHost ? 'host' : 'friend')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      following
                        ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300'
                        : 'border border-white/15 bg-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {following ? 'Following' : p.isHost ? '+ Follow Host' : '+ Follow Friend'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {inRoomTab === 'chat' && (
        <>
          {/* Live Chat Messages Feed */}
      <div ref={chatContainerRef} className="flex-1 space-y-2.5 overflow-y-auto p-3.5 [scrollbar-width:thin]">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Share the invite link or room code <strong className="text-white">{roomId}</strong> to watch and chat together!
          </div>
        ) : (
          messages.map((m) => {
            if (m.type === 'system') {
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-center text-[11px] font-medium text-slate-400"
                >
                  {m.text}
                </div>
              );
            }

            const isMe = m.senderId === clientIdRef.current;
            const isSpoiler = Boolean(m.isSpoiler);
            const isRevealed = revealedSpoilers.has(m.id);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-0.5 flex items-center gap-1.5 px-1">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: m.senderColor || '#f52432' }}
                  >
                    {isMe ? 'You' : m.senderName}
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

                {/* Spoiler Masked Message Card */}
                {isSpoiler ? (
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 text-xs transition-all ${
                      isMe
                        ? 'border border-amber-500/40 bg-gradient-to-br from-[#1a1315] to-[#241318] text-white rounded-br-sm'
                        : 'border border-amber-500/30 bg-[#16121a] text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {!isRevealed ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <EyeOff size={13} />
                          <span>Spoiler Warning</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          This message contains plot details or spoilers.
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleSpoilerReveal(m.id)}
                          className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Click to Reveal Spoiler</span>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-white/10 pb-1 text-[10px] text-amber-400 font-bold">
                          <span>Spoiler Unmasked</span>
                          <button
                            type="button"
                            onClick={() => toggleSpoilerReveal(m.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            Hide again
                          </button>
                        </div>
                        <p className="leading-relaxed">{m.text}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-[#f52432] text-white font-medium rounded-br-sm'
                        : 'border border-white/10 bg-white/[0.05] text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Live Emoji Reactions Strip */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#070b12] px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          React Live:
        </span>
        <div className="flex items-center gap-1.5">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={isMutedSelf}
              onClick={() => handleSendReaction(emoji)}
              className="rounded-lg bg-white/[0.04] px-2 py-1 text-sm transition-transform hover:scale-125 hover:bg-white/10 active:scale-95 cursor-pointer disabled:opacity-30"
              title={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Muted Warning Banner */}
      {isMutedSelf && (
        <div className="flex items-center justify-center gap-2 border-t border-amber-500/30 bg-amber-500/15 py-2 text-xs font-bold text-amber-300">
          <VolumeX size={14} />
          <span>You have been muted by the party host.</span>
        </div>
      )}

      {/* Chat Input with Spoiler Toggle */}
      {!isMutedSelf && (
        <form
          onSubmit={handleSendChat}
          className="border-t border-white/10 bg-[#06090f] p-2.5"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={isSpoilerToggle ? 'Type your spoiler message...' : 'Message the watch party...'}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                isSpoilerToggle
                  ? 'border-amber-500/50 bg-amber-500/5 focus:border-amber-400'
                  : 'border-white/10 bg-white/[0.05] focus:border-[#f52432]'
              }`}
            />

            {/* Spoiler Protection Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSpoilerToggle(!isSpoilerToggle)}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-all cursor-pointer ${
                isSpoilerToggle
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-300 shadow'
                  : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
              title="Toggle Spoiler Protection for this message"
            >
              <AlertTriangle size={13} className={isSpoilerToggle ? 'text-amber-400' : ''} />
              <span className="hidden sm:inline">Spoiler</span>
            </button>

            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="grid h-8 w-8 place-items-center rounded-xl bg-[#f52432] text-white transition-all hover:bg-[#d91b28] disabled:opacity-40 cursor-pointer"
              aria-label="Send chat message"
            >
              <Send size={13} />
            </button>
          </div>
          {isSpoilerToggle && (
            <p className="mt-1 text-[10px] text-amber-400 flex items-center gap-1">
              <Info size={11} /> This message will be hidden with a spoiler warning until viewers click to reveal.
            </p>
          )}
        </form>
      )}
        </>
      )}
    </div>
  );
}
