import type { IVideoAdProvider, VideoAdCreative, VideoAdProviderType, AdEventType } from '../types';
import { getStoredCampaigns } from '@/lib/admin-store';

export class DirectAdProvider implements IVideoAdProvider {
  readonly providerType: VideoAdProviderType = 'direct';
  private isTestMode: boolean;

  constructor(isTestMode = false) {
    this.isTestMode = isTestMode;
  }

  async initialize(): Promise<boolean> {
    return true;
  }

  async requestPreRollAd(context: {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    title: string;
  }): Promise<VideoAdCreative | null> {
    const campaigns = getStoredCampaigns().filter((c) => c.status === 'active');
    const playerCampaign =
      campaigns.find((c) => c.placements?.includes('player')) ||
      campaigns[0] ||
      null;

    if (!playerCampaign && !this.isTestMode) {
      return null;
    }

    return {
      id: playerCampaign ? playerCampaign.id : `direct_${context.mediaId}`,
      title: playerCampaign?.headline || playerCampaign?.title || 'StreamFlix Ultra Cinema Pass',
      advertiser: playerCampaign?.name || 'StreamFlix Premium',
      description: playerCampaign?.description || 'Unlock 4K HDR playback, zero advertising, and offline downloads with StreamFlix VIP.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      clickThroughUrl: playerCampaign?.destinationUrl || playerCampaign?.ctaLink || '#/admin',
      durationSeconds: 12,
      skipOffsetSeconds: 4,
      provider: 'direct',
      isTest: this.isTestMode,
    };
  }

  trackEvent(event: AdEventType, creativeId?: string) {
    if (this.isTestMode) {
      console.log(`[DirectAdProvider] Track event: ${event} for ${creativeId}`);
    }
  }

  destroy() {}
}
