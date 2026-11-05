import { useState } from 'react';
import {
  Users,
  Crown,
  UserPlus,
  UserCheck,
  Search,
  Radio,
  Bell,
  Play,
  Sparkles,
  ExternalLink,
  Shield,
  Heart,
  UserX,
} from 'lucide-react';
import { useFollows, FollowRecord } from '@/lib/following';
import { navigate } from '@/lib/router';

interface FollowingManagerProps {
  liveRooms?: Array<{
    roomId: string;
    roomName: string;
    title: string;
    mediaType: 'movie' | 'tv';
    tmdbId: number;
    hostName: string;
    participants?: Array<{ id: string; name: string }>;
  }>;
  onJoinRoom?: (roomId: string) => void;
}

const SUGGESTED_HOSTS = [
  { name: 'PaulMuadDib', type: 'host' as const, bio: 'Sci-Fi & Epic Marathons Host • Dune Specialist', color: '#f59e0b' },
  { name: 'ElevenPower', type: 'host' as const, bio: '80s Nostalgia, Stranger Things & Mystery Screenings', color: '#ec4899' },
  { name: 'DrBrandAstrophysics', type: 'host' as const, bio: 'Nolan Enthusiast & Space Cinema Discussions', color: '#3b82f6' },
  { name: 'MilesWeb99', type: 'host' as const, bio: 'Animation, Marvel & Comic Book Society Host', color: '#ef4444' },
];

export function FollowingManager({ liveRooms = [], onJoinRoom }: FollowingManagerProps) {
  const { follows, toggleFollow, isFollowing } = useFollows();
  const [filterType, setFilterType] = useState<'all' | 'host' | 'friend'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newType, setNewType] = useState<'host' | 'friend'>('host');
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const filteredFollows = follows.filter((f) => {
    if (filterType !== 'all' && f.type !== filterType) return false;
    if (searchQuery.trim() && !f.targetName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAddCustomUser = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsername.trim();
    if (!clean) return;

    toggleFollow(clean, newType);
    setNewUsername('');
    setAddedMessage(`Now following ${clean}! You'll be notified of party activity.`);
    setTimeout(() => setAddedMessage(null), 3500);
  };

  const getActivePartyForUser = (userName: string) => {
    const lower = userName.toLowerCase();
    for (const room of liveRooms) {
      if (room.hostName.toLowerCase() === lower) {
        return {
          room,
          role: 'host' as const,
        };
      }
      if (room.participants?.some((p) => p.name.toLowerCase() === lower)) {
        return {
          room,
          role: 'participant' as const,
        };
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="text-[#f52432]" size={22} />
            Following & Friends Network
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Follow party hosts to get notified when they host another party, and follow friends to see when they are in a watch party
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-[#f52432] to-[#ff4757] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({follows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('host')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterType === 'host'
                ? 'bg-amber-500 text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hosts ({follows.filter((f) => f.type === 'host').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('friend')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterType === 'friend'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Friends ({follows.filter((f) => f.type === 'friend').length})
          </button>
        </div>
      </div>

      {/* QUICK ADD BY USERNAME BOX */}
      <div className="rounded-2xl border border-white/10 bg-[#0e1422]/90 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-500/20 text-[#f52432]">
              <UserPlus size={15} />
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Follow Any Host or Friend
            </span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Bell size={12} className="text-amber-400" />
            Automatic party notifications enabled
          </span>
        </div>

        <form onSubmit={handleAddCustomUser} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter username (e.g. CinemaLover, DustinBuns, PaulMuadDib)..."
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#f52432] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'host' | 'friend')}
              className="rounded-xl border border-white/15 bg-[#121926] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f52432]"
            >
              <option value="host">As Party Host</option>
              <option value="friend">As Friend</option>
            </select>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#f52432] to-[#ff4757] px-4 py-2 text-xs font-bold text-white shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus size={14} />
              <span>Follow User</span>
            </button>
          </div>
        </form>

        {addedMessage && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/15 p-2 text-xs font-semibold text-emerald-300 animate-in fade-in">
            {addedMessage}
          </div>
        )}
      </div>

      {/* LIST OF CURRENTLY FOLLOWED USERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Following ({filteredFollows.length} users)</span>
          <span>Click to unfollow or join live room</span>
        </div>

        {filteredFollows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-12 text-center">
            <Users size={32} className="text-slate-600 mb-3" />
            <p className="text-sm font-bold text-white">No followed users found</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Follow party hosts or friends to stay connected and get notified whenever they start or join a watch party!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFollows.map((user) => {
              const activeParty = getActivePartyForUser(user.targetName);

              return (
                <div
                  key={user.id}
                  className={`group relative overflow-hidden rounded-2xl border p-4 transition-all ${
                    activeParty
                      ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 via-[#0e1622] to-[#0b1019] shadow-lg shadow-emerald-950/20'
                      : 'border-white/10 bg-[#0e1422]/90 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-11 w-11 place-items-center rounded-xl font-bold text-white shadow"
                        style={{ backgroundColor: user.avatarColor || '#ef4444' }}
                      >
                        {user.targetName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-white text-sm">{user.targetName}</h4>
                          {user.type === 'host' ? (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 flex items-center gap-1 border border-amber-500/30">
                              <Crown size={9} /> Host
                            </span>
                          ) : (
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-blue-300 border border-blue-500/30">
                              Friend
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Followed {new Date(user.followedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollow(user.targetName, user.type)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors cursor-pointer"
                      title={`Unfollow ${user.targetName}`}
                    >
                      <UserCheck size={16} className="text-emerald-400 group-hover:hidden" />
                      <UserX size={16} className="hidden group-hover:block" />
                    </button>
                  </div>

                  {/* ACTIVE PARTY STATUS BANNER */}
                  {activeParty ? (
                    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>
                            {activeParty.role === 'host' ? 'Hosting Party Live' : 'In Watch Party'}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {activeParty.room.roomId}
                        </span>
                      </div>

                      <p className="mt-1 font-bold text-white text-xs truncate">
                        {activeParty.room.title}
                      </p>
                      <p className="text-[10px] text-slate-300 truncate">
                        {activeParty.room.roomName}
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          if (onJoinRoom) {
                            onJoinRoom(activeParty.room.roomId);
                          } else {
                            const path =
                              activeParty.room.mediaType === 'tv'
                                ? `/player/tv/${activeParty.room.tmdbId}/1/1?party=${activeParty.room.roomId}`
                                : `/player/movie/${activeParty.room.tmdbId}?party=${activeParty.room.roomId}`;
                            navigate(path);
                          }
                        }}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-1.5 text-xs font-black text-black hover:bg-emerald-400 shadow-md cursor-pointer transition-colors"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Join {user.targetName}&apos;s Watch Party</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 bg-white/[0.02] rounded-lg p-2">
                      <span>Offline / Not in room</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Bell size={10} className="text-amber-400" />
                        Alerts on
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECOMMENDED POPULAR HOSTS TO FOLLOW */}
      <div className="rounded-2xl border border-white/10 bg-[#0e1422]/90 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles size={15} />
          </span>
          <div>
            <h4 className="text-sm font-bold text-white">Recommended Party Hosts & Community Curators</h4>
            <p className="text-[11px] text-slate-400">
              Follow these active hosts to receive real-time notifications for premiere parties
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUGGESTED_HOSTS.map((sug) => {
            const followed = isFollowing(sug.name);
            return (
              <div
                key={sug.name}
                className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 transition-all hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="grid h-9 w-9 place-items-center rounded-xl font-bold text-white shadow"
                      style={{ backgroundColor: sug.color }}
                    >
                      {sug.name.slice(0, 1)}
                    </div>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-500/30">
                      Host
                    </span>
                  </div>

                  <h5 className="font-bold text-white text-xs">{sug.name}</h5>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{sug.bio}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => toggleFollow(sug.name, sug.type, sug.color)}
                    className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      followed
                        ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300'
                        : 'bg-gradient-to-r from-[#f52432] to-[#ff4757] text-white hover:brightness-110 shadow'
                    }`}
                  >
                    {followed ? (
                      <>
                        <UserCheck size={12} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={12} />
                        <span>Follow Host</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
