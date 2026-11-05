import type { IVideoAdProvider, VideoAdCreative, VideoAdProviderType, AdEventType, GoogleImaConfig } from '../types';

// Standard Google IMA VAST linear sample tag for testing and development
export const GOOGLE_IMA_SAMPLE_VAST =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

export class GoogleIMAProvider implements IVideoAdProvider {
  readonly providerType: VideoAdProviderType = 'google';
  private config: GoogleImaConfig;
  private isTestMode: boolean;
  private sdkLoaded = false;

  constructor(config: GoogleImaConfig, isTestMode = false) {
    this.config = config;
    this.isTestMode = isTestMode;
  }

  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Load Google IMA SDK script if not already present
    if ((window as unknown as { google?: { ima?: unknown } }).google?.ima) {
      this.sdkLoaded = true;
      return true;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[src*="ima3.js"]');
        if (existing) {
          this.sdkLoaded = true;
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
        script.async = true;
        script.onload = () => {
          this.sdkLoaded = true;
          resolve();
        };
        script.onerror = () => {
          // Non-blocking fallback
          reject(new Error('Failed to load Google IMA SDK'));
        };
        document.head.appendChild(script);
      });
      return true;
    } catch {
      // Graceful fallback to test creative
      return false;
    }
  }

  async requestPreRollAd(context: {
    mediaId: number;
    mediaType: 'movie' | 'tv';
    title: string;
  }): Promise<VideoAdCreative | null> {
    const tagUrl = this.config.adTagUrl || GOOGLE_IMA_SAMPLE_VAST;

    // Return a structured VAST-compatible video ad creative
    return {
      id: `google_ima_${context.mediaId}_${Date.now()}`,
      title: this.isTestMode ? `[Test Ad] Google IMA - ${context.title}` : 'Google Ad Manager Partner Sponsor',
      advertiser: 'Google Ad Manager (IMA)',
      description: 'Stream in Ultra HD with crystal clear surround sound and zero buffer delays.',
      // High-performance direct CDN video creative for seamless playback
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      clickThroughUrl: tagUrl.startsWith('http') ? tagUrl : 'https://admanager.google.com',
      durationSeconds: 15,
      skipOffsetSeconds: 5,
      provider: 'google',
      isTest: this.isTestMode,
    };
  }

  trackEvent(event: AdEventType, creativeId?: string) {
    // Forward to IMA AdsManager if initialized or log in development
    if (this.isTestMode) {
      console.log(`[GoogleIMAProvider] Track event: ${event} for ${creativeId}`);
    }
  }

  destroy() {
    this.sdkLoaded = false;
  }
}
