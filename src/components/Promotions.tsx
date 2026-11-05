import { useState, useEffect } from 'react';
import {
  Sparkles,
  ExternalLink,
  X,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  useCampaigns,
  recordCampaignImpression,
  recordCampaignClick,
  recordCampaignConversion,
  type Campaign,
  type Placement,
  getUserTier,
  setUserTier,
} from '@/lib/admin-store';
import { navigate } from '@/lib/router';

// ==========================================
// 1. HOME BANNER PROMOTION
// ==========================================
export function HomeBannerPromotion() {
  const { campaigns } = useCampaigns();
  const [dismissed, setDismissed] = useState(false);

  const bannerCampaign = campaigns.find(
    (c) => c.status === 'active' && c.placements.includes('home') && c.type === 'promotion',
  );

  useEffect(() => {
    if (bannerCampaign && !dismissed) {
      recordCampaignImpression(bannerCampaign.id, 'home');
    }
  }, [bannerCampaign, dismissed]);

  if (!bannerCampaign || dismissed) return null;

  const handleAction = () => {
    recordCampaignClick(bannerCampaign.id, 'home');
    if (bannerCampaign.destinationType === 'premium') {
      recordCampaignConversion(bannerCampaign.id);
      navigate('/premium');
    } else if (bannerCampaign.destinationType === 'external') {
      window.open(bannerCampaign.destinationUrl, '_blank');
    } else {
      window.location.hash = bannerCampaign.destinationUrl;
    }
  };

  return (
    <div className="relative mx-3 sm:mx-6 lg:mx-9 my-6 overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/70 via-black to-[#0c1322] p-6 sm:p-8 shadow-2xl">
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${bannerCampaign.creativeUrl})` }}
      />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-amber-300">
              <Sparkles size={12} />
              Featured Promotion
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {bannerCampaign.headline}
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {bannerCampaign.description}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
          <button
            onClick={handleAction}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-300 hover:to-amber-400 hover:scale-105 active:scale-95"
          >
            <span>{bannerCampaign.ctaText || 'Upgrade Now'}</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white transition-colors"
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. PROMOTIONAL CARD (Between Content Sections)
// ==========================================
export function PromotionalCard({ placement = 'home' }: { placement?: Placement }) {
  const { campaigns } = useCampaigns();
  const [dismissed, setDismissed] = useState(false);

  const cardCampaign = campaigns.find(
    (c) =>
      c.status === 'active' &&
      c.placements.includes(placement) &&
      (c.type === 'advertisement' || c.type === 'sponsored'),
  );

  useEffect(() => {
    if (cardCampaign && !dismissed) {
      recordCampaignImpression(cardCampaign.id, placement);
    }
  }, [cardCampaign, dismissed, placement]);

  if (!cardCampaign || dismissed) return null;

  const handleAction = () => {
    recordCampaignClick(cardCampaign.id, placement);
    if (cardCampaign.destinationType === 'external') {
      window.open(cardCampaign.destinationUrl, '_blank');
    } else {
      window.location.hash = cardCampaign.destinationUrl;
    }
  };

  return (
    <div className="mx-3 sm:mx-6 lg:mx-9 my-8 overflow-hidden rounded-[26px] border border-blue-500/20 bg-gradient-to-r from-[#0d1627] via-[#090f1a] to-[#05080e] p-6 shadow-xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30">
            <Tag size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                {cardCampaign.type === 'sponsored' ? 'Sponsored Placement' : 'Special Offer'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {cardCampaign.headline}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {cardCampaign.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={handleAction}
            className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-600/20 px-5 py-2.5 text-xs font-bold text-blue-200 transition-all hover:bg-blue-600 hover:text-white active:scale-95"
          >
            <span>{cardCampaign.ctaText || 'Learn More'}</span>
            <ExternalLink size={13} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-500 hover:text-slate-300 p-1"
            aria-label="Dismiss offer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. PLAYER PROMOTION (Safe Sidebar / Outside Video Controls)
// ==========================================
export function PlayerPromotion() {
  const { campaigns } = useCampaigns();
  const [dismissed, setDismissed] = useState(false);

  // Placed strictly outside video controls
  const playerCampaign = campaigns.find(
    (c) => c.status === 'active' && c.placements.includes('player'),
  );

  useEffect(() => {
    if (playerCampaign && !dismissed) {
      recordCampaignImpression(playerCampaign.id, 'player');
    }
  }, [playerCampaign, dismissed]);

  if (!playerCampaign || dismissed) return null;

  const handleAction = () => {
    recordCampaignClick(playerCampaign.id, 'player');
    if (playerCampaign.destinationType === 'premium') {
      recordCampaignConversion(playerCampaign.id);
      navigate('/premium');
    } else if (playerCampaign.destinationType === 'external') {
      window.open(playerCampaign.destinationUrl, '_blank');
    } else {
      window.location.hash = playerCampaign.destinationUrl;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1424] to-[#070b13] p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {playerCampaign.type === 'sponsored' ? 'Sponsored' : 'Promotion'}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300"
          aria-label="Dismiss promo"
        >
          <X size={13} />
        </button>
      </div>

      <h4 className="mt-2 text-sm font-bold text-white leading-snug">
        {playerCampaign.headline}
      </h4>
      <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
        {playerCampaign.description}
      </p>

      <button
        onClick={handleAction}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20 active:scale-95"
      >
        <span>{playerCampaign.ctaText || 'Learn More'}</span>
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

// ==========================================
// 4. FULL-SCREEN PROMOTION MODAL
// ==========================================
export function FullScreenPromotionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { campaigns } = useCampaigns();
  const promo = campaigns.find(
    (c) => c.status === 'active' && c.type === 'promotion',
  );

  if (!open || !promo) return null;

  const handleAction = () => {
    recordCampaignClick(promo.id, 'home');
    recordCampaignConversion(promo.id);
    setUserTier('premium');
    onClose();
    navigate('/admin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-amber-500/30 bg-[#090f19] p-7 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full"
        >
          Skip <X size={14} />
        </button>

        <div className="mx-auto mt-4 h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 grid place-items-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Sparkles size={28} />
        </div>

        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-xs font-black uppercase text-amber-300">
          Limited Time Offer
        </span>

        <h3 className="mt-3 text-2xl font-black text-white">{promo.headline}</h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {promo.description}
        </p>

        <div className="mt-5 space-y-2 text-left text-xs text-slate-300 bg-white/[0.04] p-3.5 rounded-xl border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>Watch in 4K Ultra HD & Dolby Atmos</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>Zero ad interruptions & unlimited downloads</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>Simultaneous streaming on 5 screens</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={handleAction}
            className="w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all active:scale-95"
          >
            {promo.ctaText || 'Get Offer'}
          </button>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white py-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
