import { useState, useEffect, useCallback } from 'react';

// Social Following System for Watch Party Hosts and Friends
// Allows following hosts, following friends, notifications when followed host hosts a party,
// and notifications when a friend joins/is in a watch party.

export interface FollowRecord {
  id: string; // unique follow ID or target username
  targetName: string;
  type: 'host' | 'friend';
  avatarColor?: string;
  followedAt: number;
}

export interface WatchPartyActivityNotification {
  id: string;
  type: 'host_started_party' | 'friend_joined_party';
  actorName: string; // Host or Friend name
  actorType: 'host' | 'friend';
  roomId: string;
  roomName: string;
  mediaTitle: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  posterPath?: string;
  backdropPath?: string;
  timestamp: number;
  read: boolean;
}

const FOLLOWS_STORAGE_KEY = 'streamflix_follows_v1';
const ACTIVITY_NOTIFS_KEY = 'streamflix_party_activity_notifs_v1';
const FOLLOWS_EVENT = 'streamflix_follows_updated';
const PARTY_NOTIFS_EVENT = 'streamflix_party_notifs_updated';

// Default initial follows so the user has familiar active hosts/friends right away
const DEFAULT_INITIAL_FOLLOWS: FollowRecord[] = [
  {
    id: 'PaulMuadDib',
    targetName: 'PaulMuadDib',
    type: 'host',
    avatarColor: '#f59e0b',
    followedAt: Date.now() - 1000 * 60 * 60 * 72,
  },
  {
    id: 'ElevenPower',
    targetName: 'ElevenPower',
    type: 'host',
    avatarColor: '#ec4899',
    followedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'DustinBuns',
    targetName: 'DustinBuns',
    type: 'friend',
    avatarColor: '#10b981',
    followedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'Chani_Fremen',
    targetName: 'Chani_Fremen',
    type: 'friend',
    avatarColor: '#3b82f6',
    followedAt: Date.now() - 1000 * 60 * 60 * 96,
  },
];

export function getFollowedUsers(): FollowRecord[] {
  if (typeof window === 'undefined') return DEFAULT_INITIAL_FOLLOWS;
  try {
    const raw = localStorage.getItem(FOLLOWS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Initialize default follows
    localStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_FOLLOWS));
    return DEFAULT_INITIAL_FOLLOWS;
  } catch {
    return DEFAULT_INITIAL_FOLLOWS;
  }
}

export function saveFollowedUsers(list: FollowRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(FOLLOWS_EVENT, { detail: list }));
  } catch (err) {
    console.error('Failed to save followed users', err);
  }
}

export function isFollowing(targetName: string): boolean {
  if (!targetName) return false;
  const list = getFollowedUsers();
  return list.some((f) => f.targetName.toLowerCase() === targetName.toLowerCase());
}

export function getFollowRecord(targetName: string): FollowRecord | undefined {
  if (!targetName) return undefined;
  const list = getFollowedUsers();
  return list.find((f) => f.targetName.toLowerCase() === targetName.toLowerCase());
}

export function toggleFollow(
  targetName: string,
  type: 'host' | 'friend' = 'host',
  avatarColor?: string
): boolean {
  if (!targetName) return false;
  const list = getFollowedUsers();
  const index = list.findIndex((f) => f.targetName.toLowerCase() === targetName.toLowerCase());
  let nowFollowing = false;

  if (index >= 0) {
    // Unfollow
    const updated = list.filter((_, idx) => idx !== index);
    saveFollowedUsers(updated);
    nowFollowing = false;
  } else {
    // Follow
    const newRecord: FollowRecord = {
      id: targetName,
      targetName,
      type,
      avatarColor: avatarColor || '#ef4444',
      followedAt: Date.now(),
    };
    saveFollowedUsers([newRecord, ...list]);
    nowFollowing = true;
  }
  return nowFollowing;
}

// ----------------------------------------------------------------------------
// Activity Notifications (Host started party, friend is in a watch party)
// ----------------------------------------------------------------------------

export function getPartyNotifications(): WatchPartyActivityNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

export function savePartyNotifications(notifs: WatchPartyActivityNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVITY_NOTIFS_KEY, JSON.stringify(notifs.slice(0, 50)));
    window.dispatchEvent(new CustomEvent(PARTY_NOTIFS_EVENT, { detail: notifs }));
  } catch (err) {
    console.error('Failed to save party notifications', err);
  }
}

export function addPartyNotification(notif: Omit<WatchPartyActivityNotification, 'id' | 'timestamp' | 'read'>): void {
  const existing = getPartyNotifications();
  // Prevent duplicate notification for same actor & room within 10 minutes
  const recentDuplicate = existing.find(
    (n) =>
      n.actorName.toLowerCase() === notif.actorName.toLowerCase() &&
      n.roomId === notif.roomId &&
      Date.now() - n.timestamp < 10 * 60 * 1000
  );
  if (recentDuplicate) return;

  const newEntry: WatchPartyActivityNotification = {
    ...notif,
    id: `pnotif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    read: false,
  };

  savePartyNotifications([newEntry, ...existing]);

  // Dispatch browser native notification if permitted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const title =
        notif.type === 'host_started_party'
          ? `🎉 ${notif.actorName} is hosting a Watch Party!`
          : `🍿 ${notif.actorName} is watching ${notif.mediaTitle}!`;

      const body =
        notif.type === 'host_started_party'
          ? `Join "${notif.roomName}" now for ${notif.mediaTitle}`
          : `Hop into party room ${notif.roomId} to watch together with ${notif.actorName}.`;

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `party-act-${notif.roomId}-${notif.actorName}`,
      });
    } catch {
      // ignore
    }
  }
}

export function markPartyNotifAsRead(id: string): void {
  const list = getPartyNotifications();
  const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
  savePartyNotifications(updated);
}

export function markAllPartyNotifsAsRead(): void {
  const list = getPartyNotifications();
  const updated = list.map((n) => ({ ...n, read: true }));
  savePartyNotifications(updated);
}

export function clearAllPartyNotifs(): void {
  savePartyNotifications([]);
}

// ----------------------------------------------------------------------------
// React Hooks
// ----------------------------------------------------------------------------

export function useFollows() {
  const [follows, setFollows] = useState<FollowRecord[]>(() => getFollowedUsers());

  useEffect(() => {
    const handler = () => {
      setFollows(getFollowedUsers());
    };
    window.addEventListener(FOLLOWS_EVENT, handler);
    return () => window.removeEventListener(FOLLOWS_EVENT, handler);
  }, []);

  const handleToggle = useCallback((name: string, type: 'host' | 'friend' = 'host', color?: string) => {
    const result = toggleFollow(name, type, color);
    setFollows(getFollowedUsers());
    return result;
  }, []);

  const checkIfFollowing = useCallback((name: string) => {
    return isFollowing(name);
  }, []);

  return {
    follows,
    isFollowing: checkIfFollowing,
    toggleFollow: handleToggle,
  };
}

export function usePartyNotifications() {
  const [notifications, setNotifications] = useState<WatchPartyActivityNotification[]>(() =>
    getPartyNotifications()
  );

  useEffect(() => {
    const handler = () => {
      setNotifications(getPartyNotifications());
    };
    window.addEventListener(PARTY_NOTIFS_EVENT, handler);
    return () => window.removeEventListener(PARTY_NOTIFS_EVENT, handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead: markPartyNotifAsRead,
    markAllRead: markAllPartyNotifsAsRead,
    clearAll: clearAllPartyNotifs,
    notify: addPartyNotification,
  };
}

/**
 * Scan active rooms to detect if any followed hosts are hosting or followed friends are watching
 */
export function checkActiveRoomsForFollows(
  rooms: Array<{
    roomId: string;
    roomName: string;
    title: string;
    mediaType: 'movie' | 'tv';
    tmdbId: number;
    hostName: string;
    posterPath?: string;
    backdropPath?: string;
    participants?: Array<{ id: string; name: string }>;
  }>,
  currentUserName?: string
) {
  const follows = getFollowedUsers();
  if (!follows || follows.length === 0 || !Array.isArray(rooms)) return;

  for (const room of rooms) {
    // 1. Check if host is followed
    const hostFollow = follows.find(
      (f) =>
        f.targetName.toLowerCase() === room.hostName.toLowerCase() &&
        f.targetName.toLowerCase() !== (currentUserName || '').toLowerCase()
    );

    if (hostFollow) {
      addPartyNotification({
        type: 'host_started_party',
        actorName: hostFollow.targetName,
        actorType: 'host',
        roomId: room.roomId,
        roomName: room.roomName,
        mediaTitle: room.title,
        mediaType: room.mediaType,
        tmdbId: room.tmdbId,
        posterPath: room.posterPath,
        backdropPath: room.backdropPath,
      });
    }

    // 2. Check if any friend is in this room
    if (room.participants && Array.isArray(room.participants)) {
      for (const p of room.participants) {
        if (p.name.toLowerCase() === (currentUserName || '').toLowerCase()) continue;
        if (p.name.toLowerCase() === room.hostName.toLowerCase()) continue; // already notified as host
        const friendFollow = follows.find((f) => f.targetName.toLowerCase() === p.name.toLowerCase());
        if (friendFollow) {
          addPartyNotification({
            type: 'friend_joined_party',
            actorName: friendFollow.targetName,
            actorType: 'friend',
            roomId: room.roomId,
            roomName: room.roomName,
            mediaTitle: room.title,
            mediaType: room.mediaType,
            tmdbId: room.tmdbId,
            posterPath: room.posterPath,
            backdropPath: room.backdropPath,
          });
        }
      }
    }
  }
}

