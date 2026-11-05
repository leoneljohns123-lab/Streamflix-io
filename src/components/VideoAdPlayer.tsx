import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Volume2, VolumeX, SkipForward, Play, ShieldAlert } from 'lucide-react';
import type { VideoAdCreative } from '@/lib/ad-manager/types';
import { adManager } from '@/lib/ad-manager/AdManager';

interface VideoAdPlayerProps {
  ad: VideoAdCreative;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  onAdEnded: () => void;
}

export function VideoAdPlayer({ ad, mediaId, mediaType, onAdEnded }: VideoAdPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(ad.durationSeconds || 15);
  const [muted, setMuted] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [secondsUntilSkip, setSecondsUntilSkip] = useState(ad.skipOffsetSeconds || 5);
  const quartilesLogged = useRef<{ [k: string]: boolean }>({});

  useEffect(() => {
    // Record ad impression & start
    adManager.recordAnalyticsEvent({
      event: 'impression',
      provider: ad.provider,
      placement: 'player_preroll',
      mediaId,
      mediaType,
    });
    adManager.recordAnalyticsEvent({
      event: 'start',
      provider: ad.provider,
      placement: 'player_preroll',
      mediaId,
      mediaType,
    });

    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay policy fallback: mute and play
        setMuted(true);
        video.muted = true;
        video.play().catch(() => {
          // If playback fails, gracefully end ad and start movie
          handleAdFinished('error');
        });
      });
    }
  }, [ad, mediaId, mediaType]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const cur = video.currentTime;
    const dur = video.duration || ad.durationSeconds;
    setCurrentTime(cur);
    setDuration(dur);

    // Skip countdown
    const skipOffset = ad.skipOffsetSeconds || 5;
    if (cur >= skipOffset) {
      setCanSkip(true);
      setSecondsUntilSkip(0);
    } else {
      setSecondsUntilSkip(Math.ceil(skipOffset - cur));
    }

    // Quartile tracking
    const progress = cur / dur;
    if (progress >= 0.25 && !quartilesLogged.current['q1']) {
      quartilesLogged.current['q1'] = true;
      adManager.recordAnalyticsEvent({
        event: 'first_quartile',
        provider: ad.provider,
        placement: 'player_preroll',
        mediaId,
        mediaType,
      });
    }
    if (progress >= 0.5 && !quartilesLogged.current['mid']) {
      quartilesLogged.current['mid'] = true;
      adManager.recordAnalyticsEvent({
        event: 'midpoint',
        provider: ad.provider,
        placement: 'player_preroll',
        mediaId,
        mediaType,
      });
    }
    if (progress >= 0.75 && !quartilesLogged.current['q3']) {
      quartilesLogged.current['q3'] = true;
      adManager.recordAnalyticsEvent({
        event: 'third_quartile',
        provider: ad.provider,
        placement: 'player_preroll',
        mediaId,
        mediaType,
      });
    }
  };

  const handleAdFinished = (reason: 'complete' | 'skip' | 'error') => {
    adManager.recordAnalyticsEvent({
      event: reason,
      provider: ad.provider,
      placement: 'player_preroll',
      mediaId,
      mediaType,
    });
    adManager.markPreRollPlayed(mediaId);
    onAdEnded();
  };

  const handleCtaClick = () => {
    adManager.recordAnalyticsEvent({
      event: 'click',
      provider: ad.provider,
      placement: 'player_preroll',
      mediaId,
      mediaType,
    });
    window.open(ad.clickThroughUrl, '_blank', 'noopener,noreferrer');
  };

  const remainingSeconds = Math.max(0, Math.ceil(duration - currentTime));

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between bg-black select-none overflow-hidden">
      {/* Video Content */}
      <video
        ref={videoRef}
        src={ad.videoUrl}
        className="h-full w-full object-cover"
        playsInline
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => handleAdFinished('complete')}
        onError={() => handleAdFinished('error')}
      />

      {/* Top Overlay: Badges and Mute */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-500/90 text-black px-2.5 py-1 text-xs font-black uppercase tracking-wider shadow-lg">
            Advertisement
          </span>
          <span className="rounded-md bg-black/60 backdrop-blur-md border border-white/15 px-2.5 py-1 text-xs font-bold text-slate-200">
            {ad.advertiser}
          </span>
          {ad.isTest && (
            <span className="rounded-md bg-purple-600/80 text-white px-2 py-0.5 text-[10px] font-bold">
              Test Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-md bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/10">
            Ad · {remainingSeconds}s
          </span>
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !muted;
                setMuted(!muted);
              }
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15 hover:bg-black/90 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      {/* Bottom Overlay: Ad Info & Skip Action */}
      <div className="absolute bottom-4 inset-x-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 z-20 pointer-events-auto">
        {/* Left: Headline & Learn More */}
        <div className="max-w-md rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 p-3.5 shadow-2xl">
          <h4 className="text-sm font-black text-white">{ad.title}</h4>
          <p className="mt-0.5 text-xs text-slate-300 line-clamp-1">{ad.description}</p>
          <button
            onClick={handleCtaClick}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-bold text-black hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <span>Learn More</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Right: Skip Action Button */}
        <div className="self-end sm:self-auto">
          {canSkip ? (
            <button
              onClick={() => handleAdFinished('skip')}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xl shadow-blue-600/40 hover:bg-blue-500 transition-all cursor-pointer animate-pulse"
            >
              <span>Skip Ad</span>
              <SkipForward size={16} />
            </button>
          ) : (
            <div className="rounded-xl bg-black/70 backdrop-blur-md border border-white/15 px-4 py-2 text-xs font-bold text-slate-300">
              Skip in {secondsUntilSkip}s
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-20">
        <div
          className="h-full bg-amber-400 transition-all duration-200"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
