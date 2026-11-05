import type {
  AdSettings,
  AdPlacement,
  AdEventType,
  AdAnalyticsEvent,
  VideoAdCreative,
  VideoAdProviderType,
  IVideoAdProvider,
} from './types';
import { GoogleIMAProvider } from './providers/GoogleIMAProvider';
import { PrimisProvider } from './providers/PrimisProvider';
import { DirectAdProvider } from './providers/DirectAdProvider';

const AD_SETTINGS_KEY = 'streamflix_ad_settings';
const AD_ANALYTICS_KEY = 'streamflix_ad_analytics';
const AD_SESSION_TIMESTAMPS_KEY = 'streamflix_ad_sessions';

// Safe environment variable fallbacks (supports both standard and client-side VITE_ prefix)
const ENV_PROVIDER = (
  (import.meta.env.VITE_VIDEO_AD_PROVIDER ||
    import.meta.env.VIDEO_AD_PROVIDER ||
    import.meta.env.VITE_AD_PROVIDER) as VideoAdProviderType
) || 'direct';
const ENV_PRIMIS_ENABLED =
  import.meta.env.VITE_PRIMIS_ENABLED === 'true' ||
  import.meta.env.PRIMIS_ENABLED === 'true';
const ENV_PRIMIS_PLAYER_ID =
  ((import.meta.env.VITE_PRIMIS_PLAYER_ID ||
    import.meta.env.PRIMIS_PLAYER_ID) as string) || '';
const ENV_PRIMIS_TAG =
  ((import.meta.env.VITE_PRIMIS_TAG ||
    import.meta.env.PRIMIS_TAG) as string) || '';
const ENV_PRIMIS_PUB_ID =
  ((import.meta.env.VITE_PRIMIS_PUBLISHER_ID ||
    import.meta.env.PRIMIS_PUBLISHER_ID) as string) || '';
const ENV_GOOGLE_TAG =
  ((import.meta.env.VITE_GOOGLE_IMA_AD_TAG ||
    import.meta.env.GOOGLE_IMA_AD_TAG) as string) || '';
const ENV_GOOGLE_UNIT =
  ((import.meta.env.VITE_GOOGLE_AD_UNIT ||
    import.meta.env.GOOGLE_AD_UNIT) as string) || '';

export const DEFAULT_AD_SETTINGS: AdSettings = {
  advertisingEnabled: true,
  homepageAdsEnabled: true,
  videoAdsEnabled: true,
  preRollEnabled: true,
  midRollEnabled: false,
  postRollEnabled: false,
  activeProvider: (['google', 'primis', 'direct', 'none'].includes(ENV_PROVIDER)
    ? ENV_PROVIDER
    : 'direct') as VideoAdProviderType,
  cooldownMinutes: 10, // 10 minutes frequency cap per title
  testMode: true, // Enabled by default in preview environment for immediate testability
  primisConfig: {
    enabled: ENV_PRIMIS_ENABLED,
    playerId: ENV_PRIMIS_PLAYER_ID,
    tag: ENV_PRIMIS_TAG,
    publisherId: ENV_PRIMIS_PUB_ID,
  },
  googleImaConfig: {
    adTagUrl: ENV_GOOGLE_TAG,
    adUnit: ENV_GOOGLE_UNIT,
  },
};

export class AdManager {
  private static instance: AdManager | null = null;
  private settings: AdSettings;
  private activeProviderInstance: IVideoAdProvider | null = null;

  private constructor() {
    this.settings = this.loadSettings();
    this.setupProvider();
  }

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  private loadSettings(): AdSettings {
    if (typeof window === 'undefined') return DEFAULT_AD_SETTINGS;
    try {
      const raw = localStorage.getItem(AD_SETTINGS_KEY);
      if (!raw) return DEFAULT_AD_SETTINGS;
      return { ...DEFAULT_AD_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_AD_SETTINGS;
    }
  }

  saveSettings(newSettings: AdSettings) {
    this.settings = newSettings;
    if (typeof window !== 'undefined') {
      localStorage.setItem(AD_SETTINGS_KEY, JSON.stringify(newSettings));
      window.dispatchEvent(new Event('streamflix_ad_settings_updated'));
    }
    this.setupProvider();
  }

  getSettings(): AdSettings {
    return { ...this.settings };
  }

  private setupProvider() {
    if (this.activeProviderInstance) {
      this.activeProviderInstance.destroy();
      this.activeProviderInstance = null;
    }

    const { activeProvider, testMode, googleImaConfig, primisConfig } = this.settings;

    switch (activeProvider) {
      case 'google':
        this.activeProviderInstance = new GoogleIMAProvider(googleImaConfig, testMode);
        break;
      case 'primis':
        this.activeProviderInstance = new PrimisProvider(primisConfig, testMode);
        break;
      case 'direct':
        this.activeProviderInstance = new DirectAdProvider(testMode);
        break;
      case 'none':
      default:
        this.activeProviderInstance = null;
        break;
    }

    if (this.activeProviderInstance) {
      this.activeProviderInstance.initialize().catch((err) => {
        console.warn('[AdManager] Provider initialization notice:', err);
      });
    }
  }

  // Frequency and session control:
  // Ensures ads are not re-triggered when user pauses, seeks, changes server, or returns to player within cooldown
  shouldPlayPreRoll(mediaId: number): boolean {
    if (!this.settings.advertisingEnabled) return false;
    if (!this.settings.videoAdsEnabled) return false;
    if (!this.settings.preRollEnabled) return false;
    if (this.settings.activeProvider === 'none') return false;

    if (typeof window === 'undefined') return false;

    try {
      const raw = sessionStorage.getItem(AD_SESSION_TIMESTAMPS_KEY);
      const timestamps: Record<string, number> = raw ? JSON.parse(raw) : {};
      const lastPlayed = timestamps[mediaId];

      if (lastPlayed) {
        const elapsedMinutes = (Date.now() - lastPlayed) / (1000 * 60);
        if (elapsedMinutes < this.settings.cooldownMinutes) {
          // Inside cooldown period: skip advertisement
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }

  markPreRollPlayed(mediaId: number) {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(AD_SESSION_TIMESTAMPS_KEY);
      const timestamps: Record<string, number> = raw ? JSON.parse(raw) : {};
      timestamps[mediaId] = Date.now();
      sessionStorage.setItem(AD_SESSION_TIMESTAMPS_KEY, JSON.stringify(timestamps));
    } catch {
      // Ignore
    }
  }

  // Request Pre-Roll Ad with strict 6-second timeout fallback
  async requestPreRoll(context: {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    title: string;
  }): Promise<VideoAdCreative | null> {
    if (!this.shouldPlayPreRoll(context.mediaId)) {
      return null;
    }

    if (!this.activeProviderInstance) {
      return null;
    }

    this.recordAnalyticsEvent({
      event: 'request',
      provider: this.settings.activeProvider,
      placement: 'player_preroll',
      mediaId: context.mediaId,
      mediaType: context.mediaType,
    });

    try {
      // Enforce 6-second max timeout so user is never stuck
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 6000);
      });

      const adPromise = this.activeProviderInstance.requestPreRollAd(context);
      const ad = await Promise.race([adPromise, timeoutPromise]);

      if (ad) {
        this.recordAnalyticsEvent({
          event: 'loaded',
          provider: this.settings.activeProvider,
          placement: 'player_preroll',
          mediaId: context.mediaId,
          mediaType: context.mediaType,
        });
        return ad;
      } else {
        // No ad returned
        return null;
      }
    } catch (err) {
      this.recordAnalyticsEvent({
        event: 'error',
        provider: this.settings.activeProvider,
        placement: 'player_preroll',
        mediaId: context.mediaId,
        mediaType: context.mediaType,
        errorMessage: err instanceof Error ? err.message : 'Ad request timeout or failure',
      });
      return null;
    }
  }

  // Record analytics events for admin reporting
  recordAnalyticsEvent(data: {
    event: AdEventType;
    provider: VideoAdProviderType;
    placement: AdPlacement;
    mediaId?: number;
    mediaType?: 'movie' | 'tv';
    errorMessage?: string;
  }) {
    if (typeof window === 'undefined') return;

    const deviceType: 'mobile' | 'tablet' | 'desktop' =
      window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';

    const eventRecord: AdAnalyticsEvent = {
      id: `ad_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      deviceType,
      ...data,
    };

    try {
      const raw = localStorage.getItem(AD_ANALYTICS_KEY);
      const history: AdAnalyticsEvent[] = raw ? JSON.parse(raw) : [];
      // Keep latest 250 records
      const updated = [eventRecord, ...history].slice(0, 250);
      localStorage.setItem(AD_ANALYTICS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('streamflix_ad_analytics_updated'));
    } catch {
      // Ignore
    }
  }

  getAnalytics(): AdAnalyticsEvent[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(AD_ANALYTICS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  clearAnalytics() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AD_ANALYTICS_KEY);
    window.dispatchEvent(new Event('streamflix_ad_analytics_updated'));
  }
}

export const adManager = AdManager.getInstance();
