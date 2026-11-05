import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Check } from 'lucide-react';
import { usePWAInstall } from '@/lib/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone mode (already installed), hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 3000);
    }
  };

  // Chromium / Desktop / Android native prompt flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all hover:border-emerald-400 hover:bg-emerald-500/30 active:scale-95 cursor-pointer"
        title="Install StreamFlix as a Progressive Web App"
        aria-label="Install App"
      >
        {installSuccess ? (
          <>
            <Check size={14} className="text-emerald-400" />
            <span>Installed!</span>
          </>
        ) : (
          <>
            <Download size={14} className="text-emerald-400" />
            <span>Install App</span>
          </>
        )}
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported on WebKit, show guided overlay)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/25 active:scale-95 cursor-pointer"
          title="Install StreamFlix on iOS Home Screen"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Install on iOS</span>
          <span className="sm:hidden">Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
            <div className="relative w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-[#07111a]/95 p-6 shadow-2xl text-white">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Download size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install StreamFlix</h3>
                  <p className="text-xs text-slate-400">Add to your iPhone / iPad home screen</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold flex-shrink-0">
                    <Share2 size={15} />
                  </div>
                  <span>1. Tap the <strong>Share</strong> button in Safari toolbar</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex-shrink-0">
                    <PlusSquare size={15} />
                  </div>
                  <span>2. Scroll down and tap <strong>Add to Home Screen</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop manual button if browser hasn't fired beforeinstallprompt yet
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowIOSGuide(true);
          }
        }}
        className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
        title="Install StreamFlix as an app"
      >
        <Download size={13} />
        <span>Install App</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-[#07111a]/95 p-6 shadow-2xl text-white">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Download size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install StreamFlix</h3>
                <p className="text-xs text-slate-400">Add to your device home screen</p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-300">
              <p>
                To install StreamFlix on desktop or Android: Click the <strong>Install</strong> icon in your browser address bar or menu.
              </p>
              <p>
                On iOS: Tap <strong>Share</strong> in Safari, then tap <strong>Add to Home Screen</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
