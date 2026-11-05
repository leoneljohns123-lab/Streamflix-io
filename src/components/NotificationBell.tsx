import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  Tv,
  ExternalLink,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  RotateCw,
  Clock,
  Calendar,
  CheckCheck,
  Send,
  AlertCircle,
  Users,
  Crown,
  Flame,
  Radio,
} from 'lucide-react';
import { useSeasonNotifications } from '@/lib/notifications';
import { usePartyNotifications } from '@/lib/following';
import { navigate } from '@/lib/router';
import { imageUrl } from '@/lib/tmdb-config';
import { useWatchlist } from '@/lib/hooks';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'party' | 'season'>('party');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { watchlist } = useWatchlist();

  // TV Season Alerts
  const {
    alerts: seasonAlerts,
    unreadCount: unreadSeasonCount,
    settings: seasonSettings,
    permission,
    isScanning,
    requestPermission,
    updateSettings: updateSeasonSettings,
    markAsRead: markSeasonRead,
    markAllRead: markAllSeasonRead,
    clearAlerts: clearSeasonAlerts,
    scanWatchlist,
    sendTestNotification: sendTestSeasonNotification,
  } = useSeasonNotifications();

  // Watch Party Activity Notifications (Followed Hosts & Friends)
  const {
    notifications: partyNotifs,
    unreadCount: unreadPartyCount,
    markAsRead: markPartyRead,
    markAllRead: markAllPartyRead,
    clearAll: clearAllPartyNotifs,
    notify: addPartyNotif,
  } = usePartyNotifications();

  const [testSent, setTestSent] = useState(false);

  const totalUnreadCount = unreadSeasonCount + unreadPartyCount;

  // Automatically default to the tab with unread alerts if one has unread and the other doesn't
  useEffect(() => {
    if (unreadPartyCount > 0 && unreadSeasonCount === 0) {
      setActiveTab('party');
    } else if (unreadSeasonCount > 0 && unreadPartyCount === 0) {
      setActiveTab('season');
    }
  }, [unreadPartyCount, unreadSeasonCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTestAlert = () => {
    if (activeTab === 'party') {
      // Send a simulated host watch party notification
      addPartyNotif({
        type: 'host_started_party',
        actorName: 'PaulMuadDib',
        actorType: 'host',
        roomId: 'SF-4200',
        roomName: 'Dune: Part Two Arrakis Watch Party',
        mediaTitle: 'Dune: Part Two',
        mediaType: 'movie',
        tmdbId: 693134,
        posterPath: '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
      });
    } else {
      sendTestSeasonNotification();
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSeasonAlertClick = (alert: any) => {
    markSeasonRead(alert.id);
    setOpen(false);
    navigate(`/player/tv/${alert.tmdbId}/${alert.seasonNumber}/1`);
  };

  const handlePartyNotifClick = (notif: any) => {
    markPartyRead(notif.id);
    setOpen(false);
    const path =
      notif.mediaType === 'tv'
        ? `/player/tv/${notif.tmdbId}/1/1?party=${notif.roomId}`
        : `/player/movie/${notif.tmdbId}?party=${notif.roomId}`;
    navigate(path);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
          open
            ? 'border-red-500/50 bg-red-600/20 text-red-300 shadow-md shadow-red-500/20'
            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
        }`}
        title="Notifications & Watch Party Activity"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#f52432] px-1 text-[10px] font-black text-white shadow-lg shadow-red-600/50 ring-2 ring-[#080d13] animate-pulse">
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATIONS DROPDOWN */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[330px] sm:w-[430px] overflow-hidden rounded-2xl border border-white/15 bg-[#0b121d]/98 shadow-[0_25px_65px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="border-b border-white/[0.08] bg-[#0f172a]/95 px-4 pt-3.5 pb-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-red-500/20 text-[#f52432] border border-red-500/30">
                  <Bell size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black tracking-wide text-white">Notifications Center</h3>
                    {totalUnreadCount > 0 && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        {totalUnreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Watch party alerts & watchlist releases</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'party') markAllPartyRead();
                    else markAllSeasonRead();
                  }}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} className="inline mr-1" />
                  Read all
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* TAB SELECTOR: PARTY ACTIVITY VS SEASON ALERTS */}
            <div className="mt-3 flex rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('party')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'party'
                    ? 'bg-gradient-to-r from-[#f52432] to-[#ff4757] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio size={12} className={unreadPartyCount > 0 ? 'animate-pulse' : ''} />
                <span>Party Activity</span>
                {unreadPartyCount > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 text-[9px] font-black">
                    {unreadPartyCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('season')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'season'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv size={12} />
                <span>Season Alerts</span>
                {unreadSeasonCount > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 text-[9px] font-black">
                    {unreadSeasonCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Browser Permission Prompt Banner */}
          {permission !== 'granted' && permission !== 'unsupported' && (
            <div className="border-b border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-indigo-950/40 p-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-md bg-blue-500/20 p-1 text-blue-400">
                  <Sparkles size={14} />
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-white">Enable Browser Notifications</p>
                  <p className="text-[11px] text-slate-300">
                    Get instant desktop alerts when a followed host starts a party or friend tunes in.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={requestPermission}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
                    >
                      Allow Notifications
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar: Test notification / Quick tools */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-black/30 px-4 py-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              {activeTab === 'season' && (
                <button
                  type="button"
                  onClick={() => scanWatchlist(watchlist, { forceNotifyLatest: false })}
                  disabled={isScanning}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  title="Check for new seasons across your watchlist"
                >
                  <RotateCw size={12} className={isScanning ? 'animate-spin text-blue-400' : ''} />
                  <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTestAlert}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title={
                  activeTab === 'party'
                    ? 'Trigger a test host watch party alert'
                    : 'Send a sample test notification'
                }
              >
                <Send size={11} className="text-amber-400" />
                <span>{testSent ? 'Sent!' : activeTab === 'party' ? 'Test Host Alert' : 'Test'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/parties');
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              Watch Party Hub →
            </button>
          </div>

          {/* TAB 1: WATCH PARTY ACTIVITY NOTIFICATIONS */}
          {activeTab === 'party' && (
            <div className="max-h-[360px] overflow-y-auto p-2 space-y-1.5 [scrollbar-width:thin]">
              {partyNotifs.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-slate-500 border border-white/10">
                    <Radio size={24} />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">No Watch Party Activity Yet</p>
                  <p className="mt-1 text-[11px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    Follow party hosts and friends in the Watch Party pages! Whenever they host a party or join one, you will be notified right here.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/parties');
                    }}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <Users size={13} />
                    <span>Explore Watch Parties & Hosts</span>
                  </button>
                </div>
              ) : (
                partyNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handlePartyNotifClick(notif)}
                    className={`group relative flex items-start gap-3 rounded-xl border p-2.5 transition-all cursor-pointer ${
                      !notif.read
                        ? 'border-red-500/30 bg-red-950/20 hover:border-red-500/50 hover:bg-red-900/30'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Poster Thumbnail */}
                    <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-black/50 border border-white/10">
                      {notif.posterPath ? (
                        <img
                          src={imageUrl(notif.posterPath, 'w185')}
                          alt={notif.mediaTitle}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-600">
                          <Radio size={16} />
                        </div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-red-600 text-[8px] font-black uppercase text-center text-white py-0.5">
                        {notif.roomId}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        {notif.type === 'host_started_party' ? (
                          <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-500/30">
                            <Crown size={9} /> Host Party
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-blue-300 border border-blue-500/30">
                            <Users size={9} /> Friend Joined
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white truncate mt-1 group-hover:text-red-300 transition-colors">
                        {notif.type === 'host_started_party'
                          ? `${notif.actorName} is hosting ${notif.mediaTitle}`
                          : `${notif.actorName} is watching ${notif.mediaTitle}`}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {notif.roomName}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-red-400 group-hover:text-red-300">
                        <Play size={10} fill="currentColor" />
                        <span>Hop Into Watch Party ({notif.roomId})</span>
                      </div>
                    </div>

                    {!notif.read && (
                      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#f52432] shadow-sm shadow-red-500" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SEASON RELEASE ALERTS */}
          {activeTab === 'season' && (
            <div className="max-h-[360px] overflow-y-auto p-2 space-y-1.5 [scrollbar-width:thin]">
              {seasonAlerts.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-slate-500 border border-white/10">
                    <Tv size={24} />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">No Season Alerts Yet</p>
                  <p className="mt-1 text-[11px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    Add TV shows to your Watchlist. Whenever a new season premieres on TMDb, you'll be alerted right here.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/tv');
                    }}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <Tv size={13} />
                    <span>Explore TV Shows</span>
                  </button>
                </div>
              ) : (
                seasonAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleSeasonAlertClick(alert)}
                    className={`group relative flex items-start gap-3 rounded-xl border p-2.5 transition-all cursor-pointer ${
                      !alert.read
                        ? 'border-blue-500/30 bg-blue-950/20 hover:border-blue-500/50 hover:bg-blue-900/30'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-black/50 border border-white/10">
                      {alert.posterPath ? (
                        <img
                          src={imageUrl(alert.posterPath, 'w185')}
                          alt={alert.showTitle}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-600">
                          <Tv size={16} />
                        </div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-[8px] font-black uppercase text-center text-white py-0.5">
                        S{alert.seasonNumber}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[10px] text-blue-400 uppercase tracking-wide">
                          New Season Premiere
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-blue-300 transition-colors">
                        {alert.showTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        Season {alert.seasonNumber}
                        {alert.seasonName ? ` — "${alert.seasonName}"` : ''}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Play size={10} className="text-emerald-400" />
                        <span>Watch Episode 1</span>
                      </div>
                    </div>

                    {!alert.read && (
                      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-white/[0.08] bg-[#0f172a]/90 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[10px]">StreamFlix Social & Watch Alert System</span>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'party') clearAllPartyNotifs();
                else clearSeasonAlerts();
              }}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Clear Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
