import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Heart, Crown, X, CheckCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getUserTier } from '@/lib/admin-store';
import { navigate } from '@/lib/router';

const DISMISSED_SESSION_KEY = 'streamflix_adblock_notice_dismissed';

export function AdBlockerNotice() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [showHowToWhitelist, setShowHowToWhitelist] = useState(false);
  const baitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Never show to VIP / Premium subscribers who already paid for ad-free access
    if (getUserTier() === 'premium') {
      return;
    }

    // 2. Check if already dismissed in this browsing session
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true') {
      return;
    }

    let detected = false;

    // Detection Test A: Network probe against known ad script
    const checkNetworkProbe = async () => {
      try {
        const url = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (err) {
        // Blocked by browser extension (uBlock, AdBlock, Brave Shields, etc.)
        detected = true;
        setIsBlocked(true);
        setIsDismissed(false);
      }
    };

    // Detection Test B: Cosmetic filtering / Bait DOM element test
    const checkBaitElement = () => {
      const el = baitRef.current;
      if (!el) return;

      const styles = window.getComputedStyle(el);
      const isHidden =
        styles.display === 'none' ||
        styles.visibility === 'hidden' ||
        styles.opacity === '0' ||
        el.offsetHeight === 0 ||
        el.clientHeight === 0;

      if (isHidden) {
        detected = true;
        setIsBlocked(true);
        setIsDismissed(false);
      }
    };

    // Run tests with slight delay to allow extensions to hook DOM
    const timer = setTimeout(() => {
      checkBaitElement();
      if (!detected) {
        checkNetworkProbe();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
    }
  };

  if (!isBlocked || isDismissed) {
    return (
      // Canary Bait Element for cosmetic filter detection
      <div
        ref={baitRef}
        className="adsbox ad-placement pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-banner google-ad"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        &nbsp;
      </div>
    );
  }

  return (
    <>
      {/* Canary Bait element remains in DOM */}
      <div
        ref={baitRef}
        className="adsbox ad-placement pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-banner google-ad"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        &nbsp;
      </div>

      {/* Polite, non-intrusive floating card in bottom-right corner */}
      <aside
        aria-label="Ad blocker notice"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-sm sm:max-w-md rounded-2xl border border-amber-500/25 bg-[#090f19]/95 p-5 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldAlert size={19} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Support Free Streaming</h4>
              <p className="text-[11px] font-semibold text-slate-400">Powered by our viewers</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X size={15} />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-300">
          We noticed you may be using an ad-blocker. StreamFlix is maintained through minimal ads so
          everyone can watch movies &amp; series completely free. Please consider pausing your ad-blocker
          or upgrading to our ad-free VIP tier.
        </p>

        {/* Collapsible Whitelist Instructions */}
        {showHowToWhitelist && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-slate-300 space-y-2">
            <p className="font-bold text-white flex items-center gap-1.5">
              <RefreshCw size={13} className="text-amber-400" />
              How to whitelist StreamFlix in 3 steps:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Click your ad-blocker icon in the browser extensions bar.</li>
              <li>Select <strong className="text-white">&ldquo;Pause on this site&rdquo;</strong> or toggle the power icon.</li>
              <li>Refresh the page to enjoy uninterrupted streaming.</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => navigate('/premium')}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1.5 text-xs font-black text-black shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Crown size={13} className="fill-black" />
            <span>Go VIP Ad-Free</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHowToWhitelist((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span>{showHowToWhitelist ? 'Hide steps' : 'How to whitelist'}</span>
            {showHowToWhitelist ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            I&apos;ll consider later
          </button>
        </div>
      </aside>
    </>
  );
}
