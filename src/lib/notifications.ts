import { useEffect, useState, useCallback } from 'react';
import { getTvDetails } from './tmdb';
import type { WatchlistEntry } from './supabase';
import { navigate } from './router';

export interface SeasonReleaseAlert {
  id: string;
  tmdbId: number;
  showTitle: string;
  seasonNumber: number;
  seasonName?: string;
  airDate?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  timestamp: number;
  read: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  notifyOnNewSeason: boolean;
  sound: boolean;
}

const SETTINGS_KEY = 'streamflix_notification_settings_v1';
const KNOWN_SEASONS_KEY = 'streamflix_known_tv_seasons_v1';
const ALERTS_STORAGE_KEY = 'streamflix_season_alerts_v1';
const NOTIFICATION_EVENT = 'streamflix_notifications_updated';

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return { enabled: true, notifyOnNewSeason: true, sound: true };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return { enabled: true, notifyOnNewSeason: true, sound: true };
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
  } catch {
    // ignore
  }
}

export function getStoredAlerts(): SeasonReleaseAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredAlerts(alerts: SeasonReleaseAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts.slice(0, 50)));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
  } catch {
    // ignore
  }
}

export function markAlertAsRead(alertId: string): void {
  const alerts = getStoredAlerts();
  const updated = alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a));
  saveStoredAlerts(updated);
}

export function markAllAlertsAsRead(): void {
  const alerts = getStoredAlerts();
  const updated = alerts.map((a) => ({ ...a, read: true }));
  saveStoredAlerts(updated);
}

export function clearAllAlerts(): void {
  saveStoredAlerts([]);
}

/**
 * Checks browser permission status safely
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request permission from the user to send browser notifications
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Sends a native browser notification if granted and settings allow
 */
export function sendBrowserNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    url?: string;
    data?: any;
  }
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  const settings = getNotificationSettings();
  if (!settings.enabled || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'streamflix-season-alert',
      badge: options.badge || '/favicon.ico',
      data: options.data || { url: options.url },
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (options.url) {
        navigate(options.url);
      }
    };

    return true;
  } catch (err) {
    console.warn('[notifications] Failed to show browser notification', err);
    return false;
  }
}

/**
 * Trigger a sample test notification to verify browser notification delivery
 */
export function sendTestNotification(): boolean {
  return sendBrowserNotification('StreamFlix Season Alerts Active 🎉', {
    body: 'You will receive instant alerts whenever a new season of a show in your watchlist drops!',
    url: '/mylist',
  });
}

interface KnownSeasonsMap {
  [tmdbId: string]: {
    maxSeasonNumber: number;
    title: string;
    lastUpdated: number;
  };
}

function getKnownSeasons(): KnownSeasonsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KNOWN_SEASONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveKnownSeasons(map: KnownSeasonsMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KNOWN_SEASONS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Scans all TV series in the user's watchlist against TMDB to detect new season releases
 */
export async function checkWatchlistForNewSeasons(
  watchlist: WatchlistEntry[],
  options: { forceNotifyLatest?: boolean } = {}
): Promise<SeasonReleaseAlert[]> {
  if (!watchlist || watchlist.length === 0) return [];

  const tvShows = watchlist.filter((w) => w.media_type === 'tv');
  if (tvShows.length === 0) return [];

  const knownMap = getKnownSeasons();
  const existingAlerts = getStoredAlerts();
  const newAlerts: SeasonReleaseAlert[] = [];
  const settings = getNotificationSettings();

  for (const show of tvShows) {
    try {
      const details = await getTvDetails(show.tmdb_id);
      if (!details || !details.seasons || details.seasons.length === 0) continue;

      const validSeasons = details.seasons.filter((s) => s.season_number > 0);
      if (validSeasons.length === 0) continue;

      const maxSeason = Math.max(...validSeasons.map((s) => s.season_number));
      const latestSeasonData = validSeasons.find((s) => s.season_number === maxSeason);

      const known = knownMap[String(show.tmdb_id)];

      if (!known) {
        // First time seeing this show in watchlist: record current max season
        knownMap[String(show.tmdb_id)] = {
          maxSeasonNumber: maxSeason,
          title: details.name || show.title,
          lastUpdated: Date.now(),
        };

        // If forceNotifyLatest or the latest season was released recently (or multiple seasons exist)
        if (options.forceNotifyLatest && latestSeasonData) {
          const alertId = `alert_${show.tmdb_id}_s${maxSeason}`;
          const alert: SeasonReleaseAlert = {
            id: alertId,
            tmdbId: show.tmdb_id,
            showTitle: details.name || show.title,
            seasonNumber: maxSeason,
            seasonName: latestSeasonData.name,
            airDate: latestSeasonData.air_date,
            posterPath: latestSeasonData.poster_path || show.poster_path,
            backdropPath: details.backdrop_path || show.backdrop_path,
            timestamp: Date.now(),
            read: false,
          };
          if (!existingAlerts.some((a) => a.id === alertId)) {
            newAlerts.push(alert);
          }
        }
      } else if (maxSeason > known.maxSeasonNumber) {
        // A NEW SEASON HAS BEEN RELEASED!
        const releasedSeasonNum = maxSeason;
        const targetSeasonData = validSeasons.find((s) => s.season_number === releasedSeasonNum);

        const alertId = `alert_${show.tmdb_id}_s${releasedSeasonNum}`;
        const alert: SeasonReleaseAlert = {
          id: alertId,
          tmdbId: show.tmdb_id,
          showTitle: details.name || show.title,
          seasonNumber: releasedSeasonNum,
          seasonName: targetSeasonData?.name,
          airDate: targetSeasonData?.air_date,
          posterPath: targetSeasonData?.poster_path || show.poster_path,
          backdropPath: details.backdrop_path || show.backdrop_path,
          timestamp: Date.now(),
          read: false,
        };

        if (!existingAlerts.some((a) => a.id === alertId)) {
          newAlerts.push(alert);

          // Dispatch Native Browser Notification
          if (settings.enabled && settings.notifyOnNewSeason) {
            sendBrowserNotification(
              `New Season Alert: ${details.name || show.title} 🎬`,
              {
                body: `Season ${releasedSeasonNum} is now streaming! Tap to watch Episode 1 on StreamFlix.`,
                url: `/player/tv/${show.tmdb_id}/${releasedSeasonNum}/1`,
                data: {
                  url: `/player/tv/${show.tmdb_id}/${releasedSeasonNum}/1`,
                },
              }
            );
          }
        }

        // Update known state
        knownMap[String(show.tmdb_id)] = {
          maxSeasonNumber: maxSeason,
          title: details.name || show.title,
          lastUpdated: Date.now(),
        };
      }
    } catch (err) {
      console.warn(`[notifications] Failed checking show ${show.tmdb_id}:`, err);
    }
  }

  saveKnownSeasons(knownMap);

  if (newAlerts.length > 0) {
    const merged = [...newAlerts, ...existingAlerts];
    saveStoredAlerts(merged);
  }

  return newAlerts;
}

export function useSeasonNotifications() {
  const [alerts, setAlerts] = useState<SeasonReleaseAlert[]>(() => getStoredAlerts());
  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getBrowserNotificationPermission()
  );
  const [isScanning, setIsScanning] = useState(false);

  const refreshState = useCallback(() => {
    setAlerts(getStoredAlerts());
    setSettings(getNotificationSettings());
    setPermission(getBrowserNotificationPermission());
  }, []);

  useEffect(() => {
    refreshState();
    window.addEventListener(NOTIFICATION_EVENT, refreshState);
    return () => window.removeEventListener(NOTIFICATION_EVENT, refreshState);
  }, [refreshState]);

  const requestPermission = useCallback(async () => {
    const granted = await requestBrowserNotificationPermission();
    refreshState();
    return granted;
  }, [refreshState]);

  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    const current = getNotificationSettings();
    const updated = { ...current, ...patch };
    saveNotificationSettings(updated);
  }, []);

  const markAsRead = useCallback((alertId: string) => {
    markAlertAsRead(alertId);
  }, []);

  const markAllRead = useCallback(() => {
    markAllAlertsAsRead();
  }, []);

  const clearAlerts = useCallback(() => {
    clearAllAlerts();
  }, []);

  const scanWatchlist = useCallback(
    async (watchlist: WatchlistEntry[], options: { forceNotifyLatest?: boolean } = {}) => {
      setIsScanning(true);
      try {
        const found = await checkWatchlistForNewSeasons(watchlist, options);
        refreshState();
        return found;
      } finally {
        setIsScanning(false);
      }
    },
    [refreshState]
  );

  const sendTest = useCallback(() => {
    return sendTestNotification();
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return {
    alerts,
    unreadCount,
    settings,
    permission,
    isScanning,
    requestPermission,
    updateSettings,
    markAsRead,
    markAllRead,
    clearAlerts,
    scanWatchlist,
    sendTestNotification: sendTest,
  };
}
