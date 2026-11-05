export type VideoAdProviderType = 'google' | 'primis' | 'direct' | 'none';

export type AdPlacement = 'home_banner' | 'home_feed' | 'home_mid' | 'player_preroll' | 'player_sidebar';

export type AdEventType =
  | 'request'
  | 'loaded'
  | 'impression'
  | 'start'
  | 'first_quartile'
  | 'midpoint'
  | 'third_quartile'
  | 'complete'
  | 'skip'
  | 'click'
  | 'error';

export interface PrimisConfig {
  enabled: boolean;
  playerId: string;
  tag: string;
  publisherId: string;
}

export interface GoogleImaConfig {
  adTagUrl: string;
  adUnit: string;
}

export interface AdSettings {
  advertisingEnabled: boolean;
  homepageAdsEnabled: boolean;
  videoAdsEnabled: boolean;
  preRollEnabled: boolean;
  midRollEnabled: boolean;
  postRollEnabled: boolean;
  activeProvider: VideoAdProviderType;
  cooldownMinutes: number; // 0 = every session, > 0 = cooldown in minutes
  testMode: boolean; // Development / test mode with marked mock ads
  primisConfig: PrimisConfig;
  googleImaConfig: GoogleImaConfig;
}

export interface VideoAdCreative {
  id: string;
  title: string;
  advertiser: string;
  description: string;
  videoUrl: string;
  clickThroughUrl: string;
  durationSeconds: number;
  skipOffsetSeconds: number; // e.g. 5 seconds
  provider: VideoAdProviderType;
  isTest?: boolean;
}

export interface AdAnalyticsEvent {
  id: string;
  event: AdEventType;
  provider: VideoAdProviderType;
  placement: AdPlacement;
  timestamp: number;
  mediaId?: number;
  mediaType?: 'movie' | 'tv';
  errorMessage?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface IVideoAdProvider {
  readonly providerType: VideoAdProviderType;
  initialize(): Promise<boolean>;
  requestPreRollAd(context: { mediaId: number; mediaType: 'movie' | 'tv'; title: string }): Promise<VideoAdCreative | null>;
  trackEvent(event: AdEventType, creativeId?: string): void;
  destroy(): void;
}
