import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-[#0f172a]/95 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-xl animate-bounce">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
        <WifiOff size={14} />
      </div>
      <span>Offline Mode — Cached data is being used.</span>
    </div>
  );
};
