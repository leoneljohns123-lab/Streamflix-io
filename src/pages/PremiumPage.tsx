import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Crown,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Zap,
  Tv,
  Smartphone,
  Download,
  Volume2,
  Film,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertCircle,
  RotateCcw,
  Star,
  Users,
  Award,
  Layers,
  MonitorPlay,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  getUserTier,
  setUserTier,
  getSubscriptionDetails,
  saveSubscription,
  cancelSubscription,
  SubscriptionDetails
} from '@/lib/admin-store';
import { navigate } from '@/lib/router';

interface PlanDefinition {
  id: 'starter' | 'pro' | 'ultra';
  name: string;
  tagline: string;
  badge?: string;
  monthlyPrice: number;
  annualPricePerMonth: number;
  annualTotal: number;
  features: string[];
  maxScreens: number;
  quality: string;
  audio: string;
  downloads: string;
  adExperience: string;
}

const PLANS: PlanDefinition[] = [
  {
    id: 'starter',
    name: 'Standard Free',
    tagline: 'Basic catalog browsing with standard ad support',
    monthlyPrice: 0,
    annualPricePerMonth: 0,
    annualTotal: 0,
    quality: '1080p Full HD',
    audio: 'Stereo 2.0',
    maxScreens: 1,
    downloads: 'Not supported',
    adExperience: 'Standard ad breaks',
    features: [
      'Access to standard catalog titles',
      '1080p Full HD streaming',
      'Watch on phone, tablet, or laptop',
      '1 active screen at a time',
      'Ad-supported viewing',
    ],
  },
  {
    id: 'pro',
    name: 'StreamFlix Pro',
    tagline: 'Our most popular plan for cinema lovers and cinephiles',
    badge: 'MOST POPULAR',
    monthlyPrice: 9.99,
    annualPricePerMonth: 7.99,
    annualTotal: 95.88,
    quality: '4K Ultra HD & HDR10+',
    audio: 'Dolby Atmos & 5.1 Surround',
    maxScreens: 4,
    downloads: 'Up to 30 titles / month',
    adExperience: '100% Zero Ads Anywhere',
    features: [
      '100% Ad-Free Experience (Zero Video & Banner Ads)',
      'Ultra HD 4K, HDR10+, and Dolby Vision playback',
      'Dolby Atmos spatial surround sound',
      'Stream on 4 devices simultaneously',
      'Download movies & shows for offline viewing',
      'Day-1 premiere releases included',
      'Fast 60fps streaming servers',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra VIP Cinema',
    tagline: 'The ultimate theater-grade experience for families and home cinemas',
    badge: 'ULTIMATE CINEMA',
    monthlyPrice: 15.99,
    annualPricePerMonth: 12.79,
    annualTotal: 153.48,
    quality: 'IMAX Enhanced 4K UHD',
    audio: 'Dolby Atmos Lossless Studio Sound',
    maxScreens: 6,
    downloads: 'Unlimited offline downloads',
    adExperience: '100% Zero Ads Anywhere',
    features: [
      '100% Ad-Free uninterrupted streaming',
      'IMAX Enhanced & Dolby Vision Cinema Master profiles',
      'Lossless Dolby Atmos studio audio tracks',
      '6 simultaneous screens for the whole family',
      'Unlimited offline downloads across all devices',
      'Kids profiles with PIN protection & parental controls',
      'Priority VIP streaming bandwidth & early director cuts',
      'Concierge customer support 24/7',
    ],
  },
];

const FAQS = [
  {
    q: 'Can I cancel my subscription at any time?',
    a: 'Yes, absolutely. There are no contracts, commitments, or cancellation fees. You can cancel with a single click at any time right from this page or your profile. Your benefits remain active until the end of your billing cycle.',
  },
  {
    q: 'How does the 7-day free trial work?',
    a: 'When you subscribe to StreamFlix Pro or Ultra VIP, your first 7 days are completely free. If you cancel before the 7 days are up, you will not be charged a single penny.',
  },
  {
    q: 'Will all ads disappear immediately across the whole site?',
    a: 'Yes! The moment your subscription activates, our ad manager automatically silences all video pre-rolls, sponsored banners, and Google AdSense ad units. You get pure, instant playback.',
  },
  {
    q: 'What devices can I watch on?',
    a: 'You can stream on Smart TVs (Samsung, LG, Sony, Android TV, Apple TV, Fire TV, Roku), smartphones (iOS and Android), tablets, game consoles (PS5, Xbox Series X), and all desktop web browsers.',
  },
  {
    q: 'What payment methods do you support?',
    a: 'We accept all major credit and debit cards (Visa, MasterCard, American Express, Discover), plus Google Pay, Apple Pay, and PayPal with bank-grade 256-bit encryption.',
  },
];

export function PremiumPage() {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<'free' | 'premium'>(getUserTier());
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(getSubscriptionDetails());

  // Subscription wizard state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [selectedPlanId, setSelectedPlanId] = useState<'pro' | 'ultra'>('pro');
  const [step, setStep] = useState<number>(1); // 1: Plan, 2: Account, 3: Payment, 4: Review, 5: Success

  // Form states
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [profileName, setProfileName] = useState('My Stream Profile');
  const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'gpay' | 'applepay' | 'paypal'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Processing & interactive state
  const [isProcessing, setIsProcessing] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');

  // Sync tier state
  useEffect(() => {
    const handleTierChange = () => {
      setCurrentTier(getUserTier());
      setSubscription(getSubscriptionDetails());
    };
    window.addEventListener('streamflix_tier_updated', handleTierChange);
    return () => window.removeEventListener('streamflix_tier_updated', handleTierChange);
  }, []);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];

  // Price calculations
  const rawPrice = billingCycle === 'annual' ? selectedPlan.annualTotal : selectedPlan.monthlyPrice;
  const discountAmount = appliedPromo ? Number(((rawPrice * appliedPromo.percent) / 100).toFixed(2)) : 0;
  const finalPrice = Math.max(0, Number((rawPrice - discountAmount).toFixed(2)));

  // Card formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
  };

  const handleApplyPromo = () => {
    setPromoError('');
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;

    if (clean === 'STREAMFLIX20' || clean === 'SAVE20') {
      setAppliedPromo({ code: clean, percent: 20, label: '20% Special Discount' });
    } else if (clean === 'VIP50' || clean === 'CINEMA50') {
      setAppliedPromo({ code: clean, percent: 50, label: '50% First Period Discount' });
    } else if (clean === 'FREEVIP' || clean === 'STREAMFREE') {
      setAppliedPromo({ code: clean, percent: 100, label: '100% Free Access Voucher' });
    } else {
      setPromoError('Invalid coupon code. Try STREAMFLIX20 or VIP50');
    }
  };

  // Card brand detection
  const getCardBrand = () => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
    if (/^(34|37)/.test(digits)) return 'Amex';
    if (digits.startsWith('6')) return 'Discover';
    return 'Card';
  };

  // Submission handler
  const handleCompleteSubscription = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const now = new Date();
      const nextDate = new Date();
      if (billingCycle === 'annual') {
        nextDate.setFullYear(now.getFullYear() + 1);
      } else {
        nextDate.setMonth(now.getMonth() + 1);
      }

      const generatedId = `SF-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmationNumber(generatedId);

      const details: SubscriptionDetails = {
        planId: selectedPlanId,
        planName: selectedPlan.name,
        billingCycle,
        price: finalPrice,
        status: 'active',
        startDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        nextBillingDate: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        paymentMethod: {
          type: paymentMethodType,
          last4: paymentMethodType === 'card' ? cardNumber.slice(-4) || '4242' : undefined,
          brand: paymentMethodType === 'card' ? getCardBrand() : paymentMethodType.toUpperCase(),
          email: emailInput || user?.email || 'member@streamflix.tv',
        },
        promoCode: appliedPromo?.code,
        discountApplied: discountAmount,
      };

      saveSubscription(details);
      setCurrentTier('premium');
      setSubscription(details);
      setIsProcessing(false);
      setStep(5); // Go to success view
    }, 1200);
  };

  const handleCancelActiveSubscription = () => {
    cancelSubscription();
    setCurrentTier('free');
    setSubscription(null);
    setShowCancelModal(false);
  };

  return (
    <div className="min-h-screen bg-[#070c12] text-white">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#0c1322] via-[#090f19] to-[#070c12] px-4 py-16 sm:px-6 lg:px-8">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-gradient-to-br from-amber-500/10 via-blue-600/15 to-transparent blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-400 mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Crown size={15} className="fill-amber-400" />
            StreamFlix VIP Membership
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Stream Without Limits.{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              100% Ad-Free in 4K.
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Experience cinema-grade entertainment with zero commercial interruptions, pristine IMAX & 4K HDR playback,
            Dolby Atmos surround audio, and offline downloads on all your devices.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              7-Day Risk-Free Trial
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Cancel Anytime in 1 Click
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Instant Ad Removal Across Entire Site
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* CURRENT ACTIVE SUBSCRIPTION DASHBOARD IF SUBSCRIBED */}
        {currentTier === 'premium' && subscription && step !== 5 && (
          <div className="mb-12 overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#121008] via-[#090f19] to-[#0b1424] p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Subscription Active
                  </span>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {subscription.planName}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white">
                  You are enjoying StreamFlix Premium
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  Billing cycle: <strong className="text-white capitalize">{subscription.billingCycle}</strong> · Next renewal: <strong className="text-white">{subscription.nextBillingDate}</strong> (${subscription.price})
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Payment on file: <span className="font-semibold text-slate-300">{subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4 || 'Active'}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/movies')}
                  className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  Start Watching in 4K
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs sm:text-sm font-bold text-slate-300 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 active:scale-95 cursor-pointer"
                >
                  Manage / Cancel Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCELLATION MODAL */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c121d] p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400 mb-4">
                <AlertCircle size={28} />
                <h3 className="text-lg font-black text-white">Cancel Subscription?</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                If you cancel, your account will revert to the <strong>Standard Free</strong> tier. You will lose 4K Ultra HD access, Dolby Atmos audio, and ads will return to your playback.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                  Keep My Premium
                </button>
                <button
                  onClick={handleCancelActiveSubscription}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 active:scale-95"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP-BY-STEP SUBSCRIPTION FLOW */}
        <div className="rounded-3xl border border-white/10 bg-[#090e18]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
          {/* STEP PROGRESS BAR */}
          {step !== 5 && (
            <div className="mb-10">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                <span className={step >= 1 ? 'text-amber-400' : ''}>1. Select Plan</span>
                <span className={step >= 2 ? 'text-amber-400' : ''}>2. Account</span>
                <span className={step >= 3 ? 'text-amber-400' : ''}>3. Payment</span>
                <span className={step >= 4 ? 'text-amber-400' : ''}>4. Review</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: PLAN SELECTION & BILLING CYCLE TOGGLE */}
          {/* ======================================================== */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-white">Choose the plan that fits you best</h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                  Switch plans or cancel anytime. All paid plans include a 7-day free trial.
                </p>

                {/* Billing cycle segmented toggle */}
                <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`rounded-full px-5 py-2 text-xs font-black transition-all cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-black transition-all cursor-pointer ${
                      billingCycle === 'annual'
                        ? 'bg-amber-400 text-black shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Annual (Save 20%)</span>
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-black uppercase">
                      2 Months Free
                    </span>
                  </button>
                </div>
              </div>

              {/* PLAN CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const priceDisplay =
                    plan.monthlyPrice === 0
                      ? '$0'
                      : billingCycle === 'annual'
                      ? `$${plan.annualPricePerMonth.toFixed(2)}`
                      : `$${plan.monthlyPrice.toFixed(2)}`;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        if (plan.id !== 'starter') {
                          setSelectedPlanId(plan.id);
                        }
                      }}
                      className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 select-none cursor-pointer ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-gradient-to-b from-[#14120a] via-[#090f19] to-[#060a12] shadow-2xl shadow-amber-500/10 scale-[1.02]'
                          : 'border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-lg">
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-white">{plan.name}</h3>
                          <div
                            className={`grid h-6 w-6 place-items-center rounded-full border ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400 text-black'
                                : 'border-white/20 bg-white/5 text-transparent'
                            }`}
                          >
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-slate-400 min-h-[36px]">{plan.tagline}</p>

                        <div className="mt-5 border-y border-white/[0.08] py-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-black text-white">{priceDisplay}</span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>
                          {billingCycle === 'annual' && plan.annualTotal > 0 && (
                            <p className="mt-1 text-[11px] font-bold text-amber-400">
                              Billed annually at ${plan.annualTotal.toFixed(2)}/yr
                            </p>
                          )}
                        </div>

                        {/* KEY SPECS */}
                        <div className="mt-4 space-y-2 text-xs text-slate-300">
                          <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                            <span className="text-slate-400">Resolution</span>
                            <span className="font-bold text-white">{plan.quality}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                            <span className="text-slate-400">Ad Experience</span>
                            <span className={`font-bold ${plan.id === 'starter' ? 'text-slate-300' : 'text-emerald-400'}`}>
                              {plan.adExperience}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                            <span className="text-slate-400">Screens</span>
                            <span className="font-bold text-white">{plan.maxScreens} at once</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-400">Audio Quality</span>
                            <span className="font-bold text-white">{plan.audio}</span>
                          </div>
                        </div>

                        {/* BULLET FEATURES */}
                        <ul className="mt-5 space-y-2 text-xs text-slate-300">
                          {plan.features.map((feat) => (
                            <li key={feat} className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5 text-amber-400 flex-shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8">
                        {plan.id === 'starter' ? (
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                          >
                            Current Free Tier
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanId(plan.id as 'pro' | 'ultra');
                              setStep(2);
                            }}
                            className={`w-full rounded-full py-3 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95'
                                : 'border border-white/20 bg-white/10 text-white hover:bg-white/20 active:scale-95'
                            }`}
                          >
                            Select {plan.name} & Continue
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3.5 text-sm font-black text-black shadow-xl shadow-amber-500/20 transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <span>Continue with {selectedPlan.name}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: ACCOUNT CONFIRMATION & PROFILE */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-white">Confirm Your Account & Devices</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Your StreamFlix subscription will be linked to this profile for instant access on all your screens.
                </p>
              </div>

              <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Your invoice and login credentials will be linked to this email.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Primary Profile Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Living Room, Movie Night"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Supported Devices on {selectedPlan.name} ({selectedPlan.maxScreens} simultaneous)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <Tv size={20} className="mx-auto mb-1 text-amber-400" />
                      <span className="font-bold text-white">Smart TVs</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <Smartphone size={20} className="mx-auto mb-1 text-amber-400" />
                      <span className="font-bold text-white">Phones</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <Layers size={20} className="mx-auto mb-1 text-amber-400" />
                      <span className="font-bold text-white">Tablets</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <MonitorPlay size={20} className="mx-auto mb-1 text-amber-400" />
                      <span className="font-bold text-white">Laptops</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10"
                >
                  Back to Plans
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: PAYMENT METHOD & PROMO CODE */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-white">Choose Payment Method</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Bank-grade 256-bit encrypted. You won&apos;t be charged until after your 7-day free trial.
                </p>
              </div>

              {/* Payment Type Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('card')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethodType === 'card'
                      ? 'border-amber-400 bg-amber-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard size={18} className="mb-1 text-amber-400" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethodType('gpay')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethodType === 'gpay'
                      ? 'border-blue-400 bg-blue-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap size={18} className="mb-1 text-blue-400" />
                  <span>Google Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethodType('applepay')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethodType === 'applepay'
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <Award size={18} className="mb-1 text-white" />
                  <span>Apple Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethodType('paypal')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    paymentMethodType === 'paypal'
                      ? 'border-cyan-400 bg-cyan-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck size={18} className="mb-1 text-cyan-400" />
                  <span>PayPal</span>
                </button>
              </div>

              {/* CARD DETAILS FORM */}
              {paymentMethodType === 'card' ? (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Card Number
                      </label>
                      <span className="text-[11px] font-black uppercase text-amber-400">
                        {getCardBrand()}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 •••• •••• 4242"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold tracking-wider text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                      <Lock size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Security Code (CVC)
                      </label>
                      <input
                        type="password"
                        value={cardCvc}
                        onChange={handleCvcChange}
                        placeholder="CVC"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Postal / ZIP Code
                      </label>
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="90210"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-md">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-amber-400/10 text-amber-400">
                    <ShieldCheck size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-white capitalize">
                    {paymentMethodType === 'gpay' ? 'Google Pay' : paymentMethodType === 'applepay' ? 'Apple Pay' : 'PayPal'} Instant Authorization
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                    You will be prompted to authorize your standard wallet verification in the next step.
                  </p>
                </div>
              )}

              {/* PROMO / COUPON CODE SECTION */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
                  <Tag size={14} className="text-amber-400" />
                  <span>Have a Promo Code or Voucher?</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="e.g. STREAMFLIX20, VIP50"
                    className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-semibold uppercase text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/25 active:scale-95"
                  >
                    Apply
                  </button>
                </div>
                {appliedPromo && (
                  <p className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    Applied: {appliedPromo.label} ({appliedPromo.percent}% off)
                  </p>
                )}
                {promoError && (
                  <p className="mt-2 text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={13} />
                    {promoError}
                  </p>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3 text-xs sm:text-sm font-black text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <span>Review Order</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: REVIEW & CONFIRM */}
          {/* ======================================================== */}
          {step === 4 && (
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-white">Review Your Subscription</h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Double check your details before starting your 7-day free trial.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedPlan.name}</h3>
                    <p className="text-xs text-slate-400 capitalize">
                      {billingCycle} Billing · {selectedPlan.maxScreens} simultaneous screens
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-amber-400 hover:underline"
                  >
                    Change Plan
                  </button>
                </div>

                <div className="py-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Base plan price</span>
                    <span className="font-bold text-white">${rawPrice.toFixed(2)}</span>
                  </div>

                  {appliedPromo && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo Discount ({appliedPromo.code})</span>
                      <span className="font-bold">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-300">
                    <span>Estimated Sales Tax</span>
                    <span className="font-bold text-white">$0.00</span>
                  </div>

                  <div className="border-t border-white/[0.08] pt-3 flex justify-between text-sm">
                    <span className="font-bold text-white">Total due today</span>
                    <span className="font-black text-emerald-400 text-lg">$0.00</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    Your 7-day trial is completely free. After the trial, you will be billed ${finalPrice.toFixed(2)} {billingCycle === 'annual' ? 'yearly' : 'monthly'} unless cancelled.
                  </p>
                </div>

                {/* Account & Payment recap */}
                <div className="border-t border-white/[0.08] pt-4 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Linked Account:</span>
                    <span className="font-bold text-white">{emailInput || user?.email || 'Guest Member'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment:</span>
                    <span className="font-bold text-white capitalize">
                      {paymentMethodType === 'card'
                        ? `${getCardBrand()} ending in ${cardNumber.slice(-4) || '4242'}`
                        : paymentMethodType.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECURITY ASSURANCE */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <Lock size={13} className="text-emerald-400" />
                <span>256-bit SSL encrypted & authorized streaming partner</span>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={isProcessing}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSubscription}
                  disabled={isProcessing}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 px-8 py-3.5 text-xs sm:text-sm font-black text-black shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Activating VIP Access...</span>
                    </>
                  ) : (
                    <>
                      <span>Start 7-Day Free Trial & Subscribe</span>
                      <Sparkles size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: SUCCESS & INSTANT ACTIVATION SCREEN */}
          {/* ======================================================== */}
          {step === 5 && (
            <div className="max-w-lg mx-auto text-center py-6">
              <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-black shadow-2xl shadow-amber-500/40 animate-bounce">
                <Crown size={38} className="fill-black" />
              </div>

              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400">
                Membership Activated
              </span>

              <h2 className="mt-3 text-3xl font-black text-white">
                Welcome to StreamFlix {selectedPlan.name}!
              </h2>

              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Your 7-day free trial has officially started. All commercial ads, pre-rolls, and banners have been completely removed across the site!
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Confirmation #:</span>
                  <span className="font-mono font-bold text-amber-400">{confirmationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-bold text-white">{selectedPlan.name} ({billingCycle})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Free Trial Ends:</span>
                  <span className="font-bold text-white">
                    {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ad Experience:</span>
                  <span className="font-bold text-emerald-400">100% Ad-Free Enabled</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/movies')}
                  className="w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-3.5 text-sm font-black text-black shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  Start Watching in 4K Now
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-slate-300 hover:bg-white/10"
                >
                  Go to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* COMPREHENSIVE FEATURE COMPARISON MATRIX */}
        {/* ======================================================== */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Compare All Membership Tiers</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Clear, transparent comparison between our free and VIP streaming tiers.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#090f18]/60 backdrop-blur-md">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="p-4 sm:p-5 font-bold text-slate-400">Feature Specification</th>
                  <th className="p-4 sm:p-5 font-bold text-slate-400">Standard Free</th>
                  <th className="p-4 sm:p-5 font-bold text-amber-400">StreamFlix Pro</th>
                  <th className="p-4 sm:p-5 font-bold text-yellow-300">Ultra VIP Cinema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-slate-300">
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Video Quality</td>
                  <td className="p-4 sm:p-5">1080p FHD</td>
                  <td className="p-4 sm:p-5 font-bold text-white">4K Ultra HD & HDR10+</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-300">IMAX Enhanced 4K Dolby Vision</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Commercial Ads</td>
                  <td className="p-4 sm:p-5 text-amber-400">Standard ad breaks</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-400">100% Zero Ads</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-400">100% Zero Ads</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Spatial & Surround Audio</td>
                  <td className="p-4 sm:p-5">Stereo 2.0</td>
                  <td className="p-4 sm:p-5 font-bold text-white">Dolby Atmos & 5.1</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-300">Lossless Studio Dolby Atmos</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Simultaneous Screens</td>
                  <td className="p-4 sm:p-5">1 screen</td>
                  <td className="p-4 sm:p-5 font-bold text-white">4 devices at once</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-300">6 devices at once</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Offline Downloads</td>
                  <td className="p-4 sm:p-5 text-slate-500">None</td>
                  <td className="p-4 sm:p-5 font-bold text-white">30 titles / device</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-300">Unlimited downloads</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Day-1 New Releases</td>
                  <td className="p-4 sm:p-5 text-slate-400">Standard wait window</td>
                  <td className="p-4 sm:p-5 font-bold text-white">Included on Premiere Day</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-300">Early Access + Extended Cuts</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-white">Parental Controls & PINs</td>
                  <td className="p-4 sm:p-5 text-slate-500">Basic rating filter</td>
                  <td className="p-4 sm:p-5 font-bold text-white">Included</td>
                  <td className="p-4 sm:p-5 font-bold text-amber-300">Custom Kids Profiles & PINs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CUSTOMER TESTIMONIALS */}
        {/* ======================================================== */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Loved by 250,000+ Cinephiles</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              See what real subscribers say about their StreamFlix Pro experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                &ldquo;Switching to StreamFlix Pro was the best decision for my home theater. 4K HDR playback is instantaneous with no lag, and having zero ad interruptions is priceless.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  MR
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Marcus Vance</p>
                  <p className="text-[10px] text-slate-400">Pro Subscriber · 2 years</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                &ldquo;The Dolby Atmos soundstage is phenomenal through my soundbar. My kids love their own profile on their tablets and I can watch on the OLED TV simultaneously.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  SL
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Sarah Lindqvist</p>
                  <p className="text-[10px] text-slate-400">Ultra VIP Subscriber</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md">
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                &ldquo;The offline download capability saved me on three cross-country flights this month. Crisp 1080p downloads with pristine subtitles every time.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  DT
                </div>
                <div>
                  <p className="text-xs font-bold text-white">David Thorne</p>
                  <p className="text-[10px] text-slate-400">Pro Subscriber</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FAQ ACCORDION */}
        {/* ======================================================== */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Have questions about billing or the 7-day free trial? We have answers.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-white hover:text-amber-300 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.04] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM FINAL CTA */}
        <div className="mt-20 text-center rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-950/40 via-black to-[#0a1324] p-8 sm:p-12 shadow-2xl">
          <h3 className="text-2xl sm:text-4xl font-black text-white">
            Ready to experience cinema without ads?
          </h3>
          <p className="mt-2 text-sm text-slate-300 max-w-xl mx-auto">
            Join thousands of cinephiles streaming in 4K HDR today. Start your 7-day risk-free trial in under 2 minutes.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 px-8 py-3.5 text-sm font-black text-black shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <span>Get Started with 7-Day Free Trial</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
