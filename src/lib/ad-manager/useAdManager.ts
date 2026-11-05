import { useState, useEffect } from 'react';
import { adManager } from './AdManager';
import type { AdSettings, AdAnalyticsEvent } from './types';

export function useAdSettings() {
  const [settings, setSettings] = useState<AdSettings>(adManager.getSettings());

  useEffect(() => {
    const handler = () => setSettings(adManager.getSettings());
    window.addEventListener('streamflix_ad_settings_updated', handler);
    return () => window.removeEventListener('streamflix_ad_settings_updated', handler);
  }, []);

  const updateSettings = (updates: Partial<AdSettings>) => {
    const current = adManager.getSettings();
    const next = { ...current, ...updates };
    adManager.saveSettings(next);
  };

  return { settings, updateSettings };
}

export function useAdAnalytics() {
  const [analytics, setAnalytics] = useState<AdAnalyticsEvent[]>(adManager.getAnalytics());

  useEffect(() => {
    const handler = () => setAnalytics(adManager.getAnalytics());
    window.addEventListener('streamflix_ad_analytics_updated', handler);
    return () => window.removeEventListener('streamflix_ad_analytics_updated', handler);
  }, []);

  return {
    analytics,
    clearAnalytics: () => adManager.clearAnalytics(),
  };
}
