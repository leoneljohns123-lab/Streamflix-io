import { useState, useEffect } from 'react';

// ==========================================
// 1. STREAMING SERVICES TYPES & STORE
// ==========================================

export type ServiceType = 'subscription' | 'free' | 'rent' | 'buy';

export interface StreamingService {
  id: string;
  name: string;
  logo: string; // URL or brand badge color
  badgeColor: string;
  url: string;
  type: ServiceType;
  region: string;
  subscriptionRequired: boolean;
  description?: string;
  isCustom?: boolean;
}

// Built-in platforms
export const DEFAULT_SERVICES: StreamingService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    logo: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png',
    badgeColor: '#E50914',
    url: 'https://www.netflix.com',
    type: 'subscription',
    region: 'Global',
    subscriptionRequired: true,
  },
  {
    id: 'prime',
    name: 'Prime Video',
    logo: 'https://m.media-amazon.com/images/G/01/digital/video/web/logo-min-remaster.png',
    badgeColor: '#00A8E1',
    url: 'https://www.primevideo.com',
    type: 'subscription',
    region: 'Global',
    subscriptionRequired: true,
  },
  {
    id: 'disney',
    name: 'Disney+',
    logo: 'https://static-assets.bamgrid.com/product/disneyplus/images/disney-plus-logo.svg',
    badgeColor: '#113CCF',
    url: 'https://www.disneyplus.com',
    type: 'subscription',
    region: 'Global',
    subscriptionRequired: true,
  },
  {
    id: 'apple_tv',
    name: 'Apple TV+',
    logo: 'https://tv.apple.com/favicon.ico',
    badgeColor: '#000000',
    url: 'https://tv.apple.com',
    type: 'subscription',
    region: 'Global',
    subscriptionRequired: true,
  },
  {
    id: 'hbo_max',
    name: 'Max',
    logo: 'https://www.max.com/favicon.ico',
    badgeColor: '#002BE7',
    url: 'https://www.max.com',
    type: 'subscription',
    region: 'US / Global',
    subscriptionRequired: true,
  },
  {
    id: 'hulu',
    name: 'Hulu',
    logo: 'https://www.hulu.com/favicon.ico',
    badgeColor: '#1CE783',
    url: 'https://www.hulu.com',
    type: 'subscription',
    region: 'US',
    subscriptionRequired: true,
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    logo: 'https://www.paramountplus.com/favicon.ico',
    badgeColor: '#0064FF',
    url: 'https://www.paramountplus.com',
    type: 'subscription',
    region: 'Global',
    subscriptionRequired: true,
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    logo: 'https://www.crunchyroll.com/favicon.ico',
    badgeColor: '#F47521',
    url: 'https://www.crunchyroll.com',
    type: 'subscription',
    region: 'Global',
    subscriptionRequired: false,
  },
  {
    id: 'showmax',
    name: 'Showmax',
    logo: 'https://www.showmax.com/favicon.ico',
    badgeColor: '#00B2FE',
    url: 'https://www.showmax.com',
    type: 'subscription',
    region: 'Africa',
    subscriptionRequired: true,
  },
];

// ==========================================
// 2. MARKETING: CAMPAIGNS & PLACEMENTS
// ==========================================

export type CampaignType = 'promotion' | 'advertisement' | 'sponsored' | 'announcement';
export type Placement = 'home' | 'discover' | 'search' | 'player' | 'profile';
export type DestinationType = 'premium' | 'movie' | 'series' | 'custom' | 'external';
export type CampaignStatus = 'active' | 'paused' | 'scheduled' | 'ended';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  creativeUrl: string;
  headline: string;
  title?: string;
  description: string;
  ctaText: string;
  destinationType: DestinationType;
  destinationUrl: string;
  ctaLink?: string;
  placements: Placement[];
  startDate: string;
  endDate: string;
  frequency: string;
  status: CampaignStatus;
  // Live analytics counters
  impressions: number;
  clicks: number;
  conversions: number;
  placementImpressions?: Record<string, number>;
  placementClicks?: Record<string, number>;
}

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_premium_weekend',
    name: 'Premium Weekend',
    type: 'promotion',
    creativeUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&auto=format&fit=crop&q=80',
    headline: 'PREMIUM WEEKEND — 20% OFF',
    description: 'Unlock 4K Ultra HD, offline downloads, and ad-free streaming on all your devices.',
    ctaText: 'Upgrade Now',
    destinationType: 'premium',
    destinationUrl: '#/admin',
    placements: ['home', 'discover', 'player'],
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    frequency: 'Every 5 sessions',
    status: 'active',
    impressions: 12450,
    clicks: 1240,
    conversions: 218,
    placementImpressions: { home: 7820, discover: 2410, player: 2220 },
    placementClicks: { home: 780, discover: 260, player: 200 },
  },
  {
    id: 'camp_special_offer',
    name: 'Student & Family Bundle',
    type: 'advertisement',
    creativeUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200&auto=format&fit=crop&q=80',
    headline: 'Family Streaming Bundle',
    description: 'Stream up to 5 screens at once with parental controls and spatial audio.',
    ctaText: 'Learn More',
    destinationType: 'custom',
    destinationUrl: '#/admin',
    placements: ['home', 'discover'],
    startDate: '2026-09-15',
    endDate: '2026-11-15',
    frequency: 'Daily',
    status: 'active',
    impressions: 8200,
    clicks: 742,
    conversions: 94,
    placementImpressions: { home: 5400, discover: 2800 },
    placementClicks: { home: 490, discover: 252 },
  },
  {
    id: 'camp_sponsored_audio',
    name: 'Dolby Atmos Experience',
    type: 'sponsored',
    creativeUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
    headline: 'Experience Sound That Moves You',
    description: 'Immerse yourself in multidimensional sound with Dolby Atmos enabled titles.',
    ctaText: 'Explore Audio',
    destinationType: 'external',
    destinationUrl: 'https://www.dolby.com/technologies/dolby-atmos/',
    placements: ['player'],
    startDate: '2026-09-10',
    endDate: '2026-12-31',
    frequency: 'Always',
    status: 'active',
    impressions: 4200,
    clicks: 449,
    conversions: 72,
    placementImpressions: { player: 4200 },
    placementClicks: { player: 449 },
  },
];

// ==========================================
// 3. PERSISTENT STORAGE KEYS & HELPERS
// ==========================================

const SERVICES_KEY = 'streamflix_admin_services';
const MOVIE_SERVICES_KEY = 'streamflix_movie_services_map';
const CAMPAIGNS_KEY = 'streamflix_admin_campaigns';
const USER_TIER_KEY = 'streamflix_user_tier';

export function getStoredServices(): StreamingService[] {
  if (typeof window === 'undefined') return DEFAULT_SERVICES;
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SERVICES;
  } catch {
    return DEFAULT_SERVICES;
  }
}

export function saveStoredServices(services: StreamingService[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  window.dispatchEvent(new Event('streamflix_services_updated'));
}

export function getMovieServicesMap(): Record<number, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MOVIE_SERVICES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMovieServicesMap(map: Record<number, string[]>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOVIE_SERVICES_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event('streamflix_movie_services_updated'));
}

export function getStoredCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return DEFAULT_CAMPAIGNS;
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CAMPAIGNS;
  } catch {
    return DEFAULT_CAMPAIGNS;
  }
}

export function saveStoredCampaigns(campaigns: Campaign[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  window.dispatchEvent(new Event('streamflix_campaigns_updated'));
}

// Track impressions & clicks for marketing analytics
export function recordCampaignImpression(campaignId: string, placement: Placement) {
  const campaigns = getStoredCampaigns();
  const c = campaigns.find((x) => x.id === campaignId);
  if (!c) return;
  c.impressions = (c.impressions || 0) + 1;
  c.placementImpressions = c.placementImpressions || {};
  c.placementImpressions[placement] = (c.placementImpressions[placement] || 0) + 1;
  saveStoredCampaigns(campaigns);
}

export function recordCampaignClick(campaignId: string, placement: Placement) {
  const campaigns = getStoredCampaigns();
  const c = campaigns.find((x) => x.id === campaignId);
  if (!c) return;
  c.clicks = (c.clicks || 0) + 1;
  c.placementClicks = c.placementClicks || {};
  c.placementClicks[placement] = (c.placementClicks[placement] || 0) + 1;
  saveStoredCampaigns(campaigns);
}

export function recordCampaignConversion(campaignId: string) {
  const campaigns = getStoredCampaigns();
  const c = campaigns.find((x) => x.id === campaignId);
  if (!c) return;
  c.conversions = (c.conversions || 0) + 1;
  saveStoredCampaigns(campaigns);
}

// Smart service assignment:
// Returns the platforms assigned by admin for this title,
// or a realistic default based on title id so every movie card shows clean streaming availability.
export function getServicesForTitle(titleId: number): StreamingService[] {
  const allServices = getStoredServices();
  const map = getMovieServicesMap();
  const assignedIds = map[titleId];

  if (assignedIds && assignedIds.length > 0) {
    return allServices.filter((s) => assignedIds.includes(s.id));
  }

  // Realistic default based on deterministic hash of titleId
  // (e.g. Action/Big hits on Netflix + Prime, Disney on animation, etc.)
  const mod = titleId % 5;
  if (mod === 0) {
    return allServices.filter((s) => ['netflix', 'prime'].includes(s.id));
  } else if (mod === 1) {
    return allServices.filter((s) => ['prime', 'apple_tv'].includes(s.id));
  } else if (mod === 2) {
    return allServices.filter((s) => ['netflix', 'disney'].includes(s.id));
  } else if (mod === 3) {
    return allServices.filter((s) => ['apple_tv', 'paramount'].includes(s.id));
  } else {
    return allServices.filter((s) => ['netflix', 'prime', 'apple_tv'].includes(s.id));
  }
}

// React hooks for reactive UI updates
export function useStreamingServices() {
  const [services, setServices] = useState<StreamingService[]>(getStoredServices());
  const [movieMap, setMovieMap] = useState<Record<number, string[]>>(getMovieServicesMap());

  useEffect(() => {
    const handler = () => {
      setServices(getStoredServices());
      setMovieMap(getMovieServicesMap());
    };
    window.addEventListener('streamflix_services_updated', handler);
    window.addEventListener('streamflix_movie_services_updated', handler);
    return () => {
      window.removeEventListener('streamflix_services_updated', handler);
      window.removeEventListener('streamflix_movie_services_updated', handler);
    };
  }, []);

  const addCustomService = (service: Omit<StreamingService, 'id' | 'isCustom'>) => {
    const newService: StreamingService = {
      ...service,
      id: `custom_${Date.now()}`,
      isCustom: true,
    };
    const next = [...services, newService];
    setServices(next);
    saveStoredServices(next);
    return newService;
  };

  const deleteCustomService = (id: string) => {
    const next = services.filter((s) => s.id !== id);
    setServices(next);
    saveStoredServices(next);
  };

  const assignServicesToTitle = (titleId: number, serviceIds: string[]) => {
    const next = { ...movieMap, [titleId]: serviceIds };
    setMovieMap(next);
    saveMovieServicesMap(next);
  };

  return {
    services,
    movieMap,
    addCustomService,
    deleteCustomService,
    assignServicesToTitle,
  };
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(getStoredCampaigns());

  useEffect(() => {
    const handler = () => setCampaigns(getStoredCampaigns());
    window.addEventListener('streamflix_campaigns_updated', handler);
    return () => window.removeEventListener('streamflix_campaigns_updated', handler);
  }, []);

  const createCampaign = (campaign: Omit<Campaign, 'id' | 'impressions' | 'clicks' | 'conversions'>) => {
    const newCamp: Campaign = {
      ...campaign,
      id: `camp_${Date.now()}`,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      placementImpressions: {},
      placementClicks: {},
    };
    const next = [newCamp, ...campaigns];
    setCampaigns(next);
    saveStoredCampaigns(next);
    return newCamp;
  };

  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    const next = campaigns.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCampaigns(next);
    saveStoredCampaigns(next);
  };

  const deleteCampaign = (id: string) => {
    const next = campaigns.filter((c) => c.id !== id);
    setCampaigns(next);
    saveStoredCampaigns(next);
  };

  const toggleCampaignStatus = (id: string) => {
    const next = campaigns.map((c) =>
      c.id === id ? { ...c, status: (c.status === 'active' ? 'paused' : 'active') as CampaignStatus } : c,
    );
    setCampaigns(next);
    saveStoredCampaigns(next);
  };

  return {
    campaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    toggleCampaignStatus,
  };
}

// User Tier (Free vs Premium) for testing promotions & upgrades
export interface SubscriptionDetails {
  planId: 'pro' | 'ultra';
  planName: string;
  billingCycle: 'monthly' | 'annual';
  price: number;
  status: 'active' | 'trial' | 'canceled';
  startDate: string;
  nextBillingDate: string;
  paymentMethod: {
    type: 'card' | 'gpay' | 'applepay' | 'paypal';
    last4?: string;
    brand?: string;
    email?: string;
  };
  promoCode?: string;
  discountApplied?: number;
}

const SUBSCRIPTION_KEY = 'streamflix_subscription_details';

export function getSubscriptionDetails(): SubscriptionDetails | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SUBSCRIPTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSubscription(details: SubscriptionDetails) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(details));
  setUserTier('premium');
}

export function cancelSubscription() {
  if (typeof window === 'undefined') return;
  const current = getSubscriptionDetails();
  if (current) {
    current.status = 'canceled';
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(current));
  }
  setUserTier('free');
}

export function getUserTier(): 'free' | 'premium' {
  if (typeof window === 'undefined') return 'free';
  return (localStorage.getItem(USER_TIER_KEY) as 'free' | 'premium') || 'free';
}

export function setUserTier(tier: 'free' | 'premium') {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_TIER_KEY, tier);
  window.dispatchEvent(new Event('streamflix_tier_updated'));
}
