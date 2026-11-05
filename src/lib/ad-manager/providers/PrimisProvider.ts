import type { IVideoAdProvider, VideoAdCreative, VideoAdProviderType, AdEventType, PrimisConfig } from '../types';

export class PrimisProvider implements IVideoAdProvider {
  readonly providerType: VideoAdProviderType = 'primis';
  private config: PrimisConfig;
  private isTestMode: boolean;

  constructor(config: PrimisConfig, isTestMode = false) {
    this.config = config;
    this.isTestMode = isTestMode;
  }

  async initialize(): Promise<boolean> {
    // Check if Primis credentials are configured or in test mode
    if (!this.config.enabled && !this.isTestMode) {
      return false;
    }
    return true;
  }

  async requestPreRollAd(context: {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    title: string;
  }): Promise<VideoAdCreative | null> {
    if (!this.config.enabled && !this.isTestMode) {
      return null;
    }

    return {
      id: `primis_${context.mediaId}_${Date.now()}`,
      title: this.isTestMode ? `[Test Ad] Primis Video - ${context.title}` : 'Primis Video Network Sponsor',
      advertiser: 'Primis Monetization Network',
      description: 'Discover next-generation cinematic streaming technologies powered by Primis.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      clickThroughUrl: 'https://www.primis.tech',
      durationSeconds: 15,
      skipOffsetSeconds: 5,
      provider: 'primis',
      isTest: this.isTestMode,
    };
  }

  trackEvent(event: AdEventType, creativeId?: string) {
    if (this.isTestMode) {
      console.log(`[PrimisProvider] Track event: ${event} for ${creativeId}`);
    }
  }

  destroy() {}
}
