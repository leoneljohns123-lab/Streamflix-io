import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Sparkles, Megaphone, Star, Play } from 'lucide-react';
import { adManager } from '@/lib/ad-manager/AdManager';
import { useAdSettings } from '@/lib/ad-manager/useAdManager';
import { getStoredCampaigns } from '@/lib/admin-store';
import { navigate } from '@/lib/router';

// ==========================================
// 1. LAZY AD SLOT CONTAINER (INTERSECTION OBSERVER)
// ==========================================
export function LazyAdSlot({
  placementId,
  format = 'banner',
  customTitle,
  customCta,
}: {
  placementId: string;
  format?: 'banner' | 'native' | 'sponsored_movie';
  customTitle?: string;
  customCta?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const { settings } = useAdSettings();

  useEffect(() => {
    if (!settings.advertisingEnabled || !settings.homepageAdsEnabled) {
      return;
    }

    const el = containerRef.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();

          // Record ad request
          adManager.recordAnalyticsEvent({
            event: 'request',
            provider: settings.activeProvider,
            placement: 'home_banner',
          });

          // Simulate slight network initialization
          setTimeout(() => {
            setAdLoaded(true);
            adManager.recordAnalyticsEvent({
              event: 'impression',
              provider: settings.activeProvider,
              placement: 'home_banner',
            });
          }, 150);
        }
      },
      { rootMargin: '300px' }, // Prefetch threshold before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, settings.advertisingEnabled, settings.homepageAdsEnabled, settings.activeProvider]);

  // If advertising is turned off globally or for homepage, collapse to zero height
  if (!settings.advertisingEnabled || !settings.homepageAdsEnabled || adError) {
    return null;
  }

  // Find direct active campaign if any
  const campaigns = getStoredCampaigns().filter((c) => c.status === 'active');
  const activeCampaign = campaigns[0] || null;

  const handleAdClick = () => {
    adManager.recordAnalyticsEvent({
      event: 'click',
      provider: settings.activeProvider,
      placement: 'home_banner',
    });
    const targetUrl = activeCampaign?.destinationUrl || activeCampaign?.ctaLink;
    if (targetUrl) {
      if (targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(targetUrl);
      }
    } else {
      navigate('/admin');
    }
  };

  return (
    <div ref={containerRef} className="my-8 mx-3 sm:mx-6 lg:mx-9 transition-all duration-300">
      {!inView ? (
        // Invisible prefetch boundary with zero layout shift
        <div className="h-2 w-full" />
      ) : !adLoaded ? (
        // Subtle skeleton loading state
        <div className="h-32 sm:h-40 w-full rounded-2xl animate-pulse bg-white/5 border border-white/5" />
      ) : format === 'banner' ? (
        // Format 1: Responsive High-Impact Banner Ad
        <div
          onClick={handleAdClick}
          className="group relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-[#0c1322] via-[#090e18] to-[#111c30] p-6 sm:p-8 shadow-2xl transition-all duration-300 hover:border-blue-400/40 cursor-pointer"
        >
          {/* Subtle ambient lighting */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Advertisement
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {activeCampaign?.name || 'StreamFlix Cinema Partner'}
                </span>
                {settings.testMode && (
                  <span className="rounded bg-purple-500/20 px-2 py-0.2 text-[9px] font-bold text-purple-300">
                    Test Mode ({settings.activeProvider})
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-200 transition-colors">
                {customTitle || activeCampaign?.headline || activeCampaign?.title || 'Upgrade to StreamFlix VIP: 4K HDR & Zero Ads'}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeCampaign?.description ||
                  'Experience theater-quality IMAX enhanced streaming, Dolby Atmos surround audio, and unlimited downloads across all your devices.'}
              </p>
            </div>

            <button className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs sm:text-sm font-black text-black shadow-xl shadow-white/10 transition-all hover:bg-slate-200 active:scale-95 flex-shrink-0 self-start md:self-auto cursor-pointer">
              <span>{customCta || activeCampaign?.ctaText || 'Get Special Offer'}</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      ) : format === 'native' ? (
        // Format 2: Native Promotional Card
        <div
          onClick={handleAdClick}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#090f19] p-5 shadow-xl transition-all hover:border-blue-400/40 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase">
              Sponsored
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Promotional Spotlight</span>
          </div>
          <h4 className="text-base font-black text-white group-hover:text-blue-200">
            {customTitle || activeCampaign?.headline || activeCampaign?.title || 'Exclusive Partner Streaming Benefits'}
          </h4>
          <p className="mt-1 text-xs text-slate-300 line-clamp-2">
            {activeCampaign?.description ||
              'Access private premiere screenings, director commentary audio tracks, and early access episodes.'}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
            <span className="text-xs font-bold text-blue-400 group-hover:underline">
              {customCta || 'Learn More'}
            </span>
            <ExternalLink size={12} className="text-blue-400" />
          </div>
        </div>
      ) : format === 'sponsored_movie' ? (
        // Format 3: Sponsored Movie Card
        <div
          onClick={handleAdClick}
          className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-amber-500/30 bg-gradient-to-b from-[#14120a] via-[#090f19] to-[#040810] p-5 shadow-2xl transition-all duration-300 hover:border-amber-400/60 hover:-translate-y-1 cursor-pointer select-none"
        >
          <div className="z-10 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  Sponsored
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black text-slate-400">
                  4K
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-400/80">Featured Partner</span>
            </div>

            <h3 className="mt-3 truncate text-xl sm:text-2xl font-black tracking-tight text-white transition-colors group-hover:text-amber-200">
              {customTitle || activeCampaign?.headline || activeCampaign?.title || 'Cyberpunk: Edgerunners Experience'}
            </h3>

            <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={13} fill="currentColor" /> 9.1<span className="text-slate-500 font-medium">/10</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">Sponsored Premiere</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">2026</span>
            </div>

            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-300/90 sm:text-[13px]">
              {activeCampaign?.description ||
                'Immerse in breathtaking visual spectacles with high-bitrate spatial audio and zero ads.'}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300 active:scale-95"
              >
                <Play size={14} fill="currentColor" />
                {customCta || activeCampaign?.ctaText || 'Watch Special'}
              </button>
            </div>
          </div>

          <div className="relative mt-4 h-48 w-full overflow-hidden rounded-2xl bg-[#070d17]">
            <img
              src={
                activeCampaign?.creativeUrl ||
                'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&auto=format&fit=crop&q=80'
              }
              alt="Sponsored Media"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
            <div className="absolute bottom-3 inset-x-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                Official Partner Spotlight
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
