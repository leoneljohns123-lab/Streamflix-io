import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Tag,
  Tv,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Check,
  X,
  Play,
  Sparkles,
  Search,
  DollarSign,
  Users,
  Eye,
  MousePointer,
  Film,
  Globe,
  Layers,
  Settings,
  Shield,
  Activity,
} from 'lucide-react';
import {
  useStreamingServices,
  useCampaigns,
  getUserTier,
  setUserTier,
  type StreamingService,
  type Campaign,
  type CampaignType,
  type Placement,
  type DestinationType,
  DEFAULT_SERVICES,
} from '@/lib/admin-store';
import { useAdSettings, useAdAnalytics } from '@/lib/ad-manager/useAdManager';
import { adManager } from '@/lib/ad-manager/AdManager';
import type { VideoAdCreative, VideoAdProviderType } from '@/lib/ad-manager/types';
import { GOOGLE_IMA_SAMPLE_VAST } from '@/lib/ad-manager/providers/GoogleIMAProvider';
import { VideoAdPlayer } from '@/components/VideoAdPlayer';
import { getPopularMovies, searchMovies } from '@/lib/tmdb';
import type { TmdbMovie } from '@/lib/tmdb-types';
import { imageUrl } from '@/lib/tmdb-config';
import { navigate } from '@/lib/router';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'marketing' | 'advertising' | 'services' | 'analytics' | 'users'
  >('marketing');

  // Ad Manager Settings & Events
  const { settings: adSettings, updateSettings: updateAdSettings } = useAdSettings();
  const { analytics: adEvents, clearAnalytics } = useAdAnalytics();
  const [simulatingAd, setSimulatingAd] = useState(false);
  const [simulatedAdCreative, setSimulatedAdCreative] = useState<VideoAdCreative | null>(null);

  // Streaming services store
  const { services, movieMap, addCustomService, deleteCustomService, assignServicesToTitle } =
    useStreamingServices();

  // Marketing campaigns store
  const { campaigns, createCampaign, updateCampaign, deleteCampaign, toggleCampaignStatus } =
    useCampaigns();

  // User tier
  const [currentTier, setCurrentTierState] = useState<'free' | 'premium'>(getUserTier());

  // Search & assignment for movies
  const [movieQuery, setMovieQuery] = useState('');
  const [searchedMovies, setSearchedMovies] = useState<TmdbMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);

  // Modals
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showAddCustomService, setShowAddCustomService] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // New Custom Service form state
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceUrl, setCustomServiceUrl] = useState('');
  const [customServiceLogo, setCustomServiceLogo] = useState('');
  const [customServiceColor, setCustomServiceColor] = useState('#3b82f6');
  const [customServiceRegion, setCustomServiceRegion] = useState('Global');
  const [customServiceType, setCustomServiceType] = useState<'subscription' | 'free' | 'rent' | 'buy'>('subscription');
  const [customServiceSubReq, setCustomServiceSubReq] = useState(true);
  const [customServiceDesc, setCustomServiceDesc] = useState('');

  // New Campaign form state
  const [campName, setCampName] = useState('');
  const [campType, setCampType] = useState<CampaignType>('promotion');
  const [campHeadline, setCampHeadline] = useState('');
  const [campDescription, setCampDescription] = useState('');
  const [campCta, setCampCta] = useState('Upgrade Now');
  const [campCreative, setCampCreative] = useState(
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&auto=format&fit=crop&q=80',
  );
  const [campDestType, setCampDestType] = useState<DestinationType>('premium');
  const [campDestUrl, setCampDestUrl] = useState('#/admin');
  const [campPlacements, setCampPlacements] = useState<Placement[]>(['home', 'player']);
  const [campStartDate, setCampStartDate] = useState('2026-09-01');
  const [campEndDate, setCampEndDate] = useState('2026-12-31');
  const [campFrequency, setCampFrequency] = useState('Every 5 sessions');

  // Load sample popular movies for service assignment
  useEffect(() => {
    getPopularMovies(1).then((data) => {
      setSearchedMovies(data.results.slice(0, 10));
      if (data.results.length > 0 && !selectedMovie) {
        setSelectedMovie(data.results[0]);
      }
    });
  }, []);

  // When selected movie changes, update checked services
  useEffect(() => {
    if (selectedMovie) {
      const assigned = movieMap[selectedMovie.id] || ['netflix', 'prime'];
      setAssignedServiceIds(assigned);
    }
  }, [selectedMovie, movieMap]);

  // Handle movie search
  const handleMovieSearch = (query: string) => {
    setMovieQuery(query);
    if (!query.trim()) {
      getPopularMovies(1).then((data) => setSearchedMovies(data.results.slice(0, 10)));
      return;
    }
    searchMovies(query, 1).then((data) =>
      setSearchedMovies(data.results.slice(0, 10) as unknown as TmdbMovie[]),
    );
  };

  // Toggle service checkbox for current selected movie
  const handleToggleServiceForMovie = (serviceId: string) => {
    if (!selectedMovie) return;
    const exists = assignedServiceIds.includes(serviceId);
    const next = exists
      ? assignedServiceIds.filter((id) => id !== serviceId)
      : [...assignedServiceIds, serviceId];
    setAssignedServiceIds(next);
    assignServicesToTitle(selectedMovie.id, next);
  };

  // Add custom service submission
  const handleCreateCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) return;
    addCustomService({
      name: customServiceName,
      url: customServiceUrl || 'https://example.com',
      logo: customServiceLogo || '',
      badgeColor: customServiceColor,
      type: customServiceType,
      region: customServiceRegion,
      subscriptionRequired: customServiceSubReq,
      description: customServiceDesc,
    });
    setCustomServiceName('');
    setCustomServiceUrl('');
    setCustomServiceLogo('');
    setShowAddCustomService(false);
  };

  // Add campaign submission
  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName.trim() || !campHeadline.trim()) return;

    if (editingCampaign) {
      updateCampaign(editingCampaign.id, {
        name: campName,
        type: campType,
        headline: campHeadline,
        description: campDescription,
        ctaText: campCta,
        creativeUrl: campCreative,
        destinationType: campDestType,
        destinationUrl: campDestUrl,
        placements: campPlacements,
        startDate: campStartDate,
        endDate: campEndDate,
        frequency: campFrequency,
      });
      setEditingCampaign(null);
    } else {
      createCampaign({
        name: campName,
        type: campType,
        headline: campHeadline,
        description: campDescription,
        ctaText: campCta,
        creativeUrl: campCreative,
        destinationType: campDestType,
        destinationUrl: campDestUrl,
        placements: campPlacements,
        startDate: campStartDate,
        endDate: campEndDate,
        frequency: campFrequency,
        status: 'active',
      });
    }
    setShowCreateCampaign(false);
  };

  // Open edit modal for campaign
  const handleOpenEditCampaign = (c: Campaign) => {
    setEditingCampaign(c);
    setCampName(c.name);
    setCampType(c.type);
    setCampHeadline(c.headline);
    setCampDescription(c.description);
    setCampCta(c.ctaText);
    setCampCreative(c.creativeUrl);
    setCampDestType(c.destinationType);
    setCampDestUrl(c.destinationUrl);
    setCampPlacements(c.placements);
    setCampStartDate(c.startDate);
    setCampEndDate(c.endDate);
    setCampFrequency(c.frequency);
    setShowCreateCampaign(true);
  };

  // Calculate totals for Advertising Analytics
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0);
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
  // Estimated monetization calculation (e.g. KSh 45,200)
  const estimatedRevenue = (totalClicks * 18.5).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen bg-[#070c12] text-white pt-24 lg:ml-[184px] px-4 sm:px-8 pb-24 max-w-[1600px] mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-blue-400">
              Admin Portal
            </span>
            <span className="text-xs text-slate-500 font-semibold">Unified Management Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            StreamFlix Operations
          </h1>
        </div>

        {/* Global tab navigator */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/[0.04] p-1.5 border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('marketing')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'marketing'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag size={14} />
            <span>Marketing & Campaigns</span>
          </button>

          <button
            onClick={() => setActiveTab('advertising')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'advertising'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>Ad Manager & Providers</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'services'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv size={14} />
            <span>Movie Services</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={14} />
            <span>Ad Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} />
            <span>Tier & Users</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MARKETING & CAMPAIGNS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'marketing' && (
        <div className="space-y-8">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Impressions</p>
              <p className="mt-1 text-2xl font-black text-white">{totalImpressions.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clicks</p>
              <p className="mt-1 text-2xl font-black text-blue-400">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average CTR</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">{overallCtr}%</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversions</p>
              <p className="mt-1 text-2xl font-black text-amber-400">{totalConversions.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Campaigns</p>
              <p className="mt-1 text-2xl font-black text-white">{activeCampaignsCount}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Est. Revenue</p>
              <p className="mt-1 text-2xl font-black text-purple-400">KSh {estimatedRevenue}</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Promotions & Advertising Campaigns</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage promotional banners, in-app sponsored cards, and player offers without polluting movie data.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCampaign(null);
                setCampName('');
                setCampHeadline('');
                setCampDescription('');
                setShowCreateCampaign(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Create Campaign</span>
            </button>
          </div>

          {/* Campaign Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090f19] p-5 flex flex-col justify-between shadow-xl relative"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        camp.type === 'promotion'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : camp.type === 'sponsored'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {camp.type}
                    </span>

                    <button
                      onClick={() => toggleCampaignStatus(camp.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        camp.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${camp.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {camp.status.toUpperCase()}
                    </button>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-white leading-snug">{camp.name}</h3>
                  <p className="text-xs font-semibold text-slate-300 mt-1">&ldquo;{camp.headline}&rdquo;</p>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {camp.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] text-slate-400">
                    <p>
                      <span className="text-slate-500 font-semibold">Placements: </span>
                      <span className="text-slate-300 font-bold uppercase">{camp.placements.join(', ')}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 font-semibold">CTA: </span>
                      <span className="text-white font-bold">{camp.ctaText}</span>
                    </p>
                    <p>
                      <span className="text-slate-500 font-semibold">Schedule: </span>
                      <span>{camp.startDate} ~ {camp.endDate}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-semibold">
                    <span className="text-white font-bold">{camp.clicks.toLocaleString()}</span> clicks ·{' '}
                    <span className="text-emerald-400 font-bold">
                      {camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100).toFixed(1) : 0}% CTR
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditCampaign(camp)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                      title="Edit Campaign"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteCampaign(camp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10"
                      title="Delete Campaign"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ADVERTISING & VIDEO AD PROVIDER ENGINE                                */}
      {/* ========================================================================= */}
      {activeTab === 'advertising' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 text-[10px] font-black uppercase">
                  Modular Ad System
                </span>
                <span className="text-xs text-slate-400">VAST 2.0 / 3.0 / 4.0 Compatibility Layer</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">Advertising Engine & Video Providers</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure video advertising providers (Google IMA, Primis, Direct campaigns) and control homepage monetization.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  const sampleCreative = await adManager.requestPreRoll({
                    mediaId: 101,
                    mediaType: 'movie',
                    title: 'Cyberpunk: Edgerunners (Test Stream)',
                  });
                  if (sampleCreative) {
                    setSimulatedAdCreative(sampleCreative);
                    setSimulatingAd(true);
                  } else {
                    alert('No ad returned under current settings (or provider is set to none).');
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
              >
                <Play size={14} fill="white" />
                <span>Test Live Pre-Roll Ad</span>
              </button>
            </div>
          </div>

          {/* 1. PROVIDER SELECTION: Google IMA vs Primis vs Direct vs None */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Shield size={16} className="text-blue-400" />
                Active Video Ad Provider
              </h3>
              <p className="text-xs text-slate-400">
                Switch between video monetization networks without altering the video player or video streaming sources.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'google',
                  name: 'Google Ad Manager (IMA)',
                  subtitle: 'Google IMA HTML5 SDK',
                  desc: 'Linear VAST 3.0/4.0 pre-rolls powered by Google Ad Manager and official IMA SDK loader.',
                  badge: 'Enterprise',
                  badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                },
                {
                  id: 'primis',
                  name: 'Primis Video Network',
                  subtitle: 'Video Monetization',
                  desc: 'Official Primis Publisher Player integration routing VAST responses through video advertising layer.',
                  badge: 'Monetization',
                  badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                },
                {
                  id: 'direct',
                  name: 'Direct Promotional Ads',
                  subtitle: 'Admin Controlled',
                  desc: 'Custom sponsor campaigns and promotional trailers created and managed from this dashboard.',
                  badge: 'Direct Sold',
                  badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                },
                {
                  id: 'none',
                  name: 'No Advertising (Off)',
                  subtitle: 'Clean Streaming',
                  desc: 'Disable all video pre-roll advertisements. Video player starts immediately with zero delay.',
                  badge: 'Ad-Free',
                  badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
                },
              ].map((prov) => {
                const isSelected = adSettings.activeProvider === prov.id;
                return (
                  <div
                    key={prov.id}
                    onClick={() => updateAdSettings({ activeProvider: prov.id as VideoAdProviderType })}
                    className={`relative cursor-pointer rounded-2xl border p-5 transition-all select-none ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/15 ring-1 ring-blue-500/50'
                        : 'border-white/10 bg-[#090f19] hover:border-white/25 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${prov.badgeColor}`}>
                        {prov.badge}
                      </span>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    <h4 className="text-sm font-black text-white">{prov.name}</h4>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">{prov.subtitle}</p>
                    <p className="text-xs text-slate-300/80 mt-2 leading-relaxed">{prov.desc}</p>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Status</span>
                      <span className={isSelected ? 'text-blue-400 font-bold' : 'text-slate-500'}>
                        {isSelected ? '● Active Provider' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. CORE ADVERTISING TOGGLES & FREQUENCY CAPPING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Global Toggles */}
            <div className="rounded-2xl border border-white/10 bg-[#090f19] p-6 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings size={16} className="text-blue-400" />
                Global Controls & Placements
              </h3>

              <div className="space-y-3 pt-1">
                {[
                  {
                    key: 'advertisingEnabled',
                    label: 'Master Advertising Switch',
                    desc: 'Master toggle to enable or disable all advertising system-wide.',
                    checked: adSettings.advertisingEnabled,
                  },
                  {
                    key: 'homepageAdsEnabled',
                    label: 'Homepage Lazy-Loaded Ad Slots',
                    desc: 'Display responsive banners, sponsored cards, and promotional spotlights between homepage rows.',
                    checked: adSettings.homepageAdsEnabled,
                  },
                  {
                    key: 'preRollEnabled',
                    label: 'Video Player Pre-Roll Ads',
                    desc: 'Display video advertisements before playback begins on movie and show detail pages.',
                    checked: adSettings.preRollEnabled,
                  },
                  {
                    key: 'testMode',
                    label: 'Test Mode & Sandbox Samples',
                    desc: 'Use safe Google IMA test creatives and simulate VAST responses when live tag is pending.',
                    checked: adSettings.testMode,
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start justify-between gap-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{item.label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => updateAdSettings({ [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded accent-blue-600 mt-0.5"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Frequency & Session Control */}
            <div className="rounded-2xl border border-white/10 bg-[#090f19] p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
                  Frequency & Session Control
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  To protect user experience, pre-roll advertisements are <strong>strictly frequency-capped</strong>.
                  Ads are never re-triggered on pause, seeking, quality changes, subtitle switches, or server switches.
                </p>

                <div className="mt-5 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white">Pre-Roll Cooldown (Minutes)</label>
                    <span className="rounded bg-blue-500/20 text-blue-400 px-2 py-0.5 text-xs font-black">
                      {adSettings.cooldownMinutes} min
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={adSettings.cooldownMinutes}
                    onChange={(e) => updateAdSettings({ cooldownMinutes: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                    <span>1 min (aggressive)</span>
                    <span>10 min (recommended)</span>
                    <span>60 min (relaxed)</span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-[11px] text-amber-200/90 leading-relaxed">
                  ✓ <strong>Session Safety:</strong> When a user switches between vidplay, vidsrc, or superembed, or enters fullscreen, playback resumes immediately without a second pre-roll.
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                <span>Active Session State</span>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('streamflix_ad_sessions');
                    alert('Session ad cache cleared. Next playback will show an ad if enabled.');
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold hover:underline"
                >
                  Reset Session History
                </button>
              </div>
            </div>
          </div>

          {/* 3. PROVIDER-SPECIFIC CONFIGURATION PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google IMA Config */}
            <div className="rounded-2xl border border-white/10 bg-[#090f19] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Globe size={15} className="text-emerald-400" />
                  Google Ad Manager (IMA SDK)
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    updateAdSettings({
                      googleImaConfig: {
                        ...adSettings.googleImaConfig,
                        adTagUrl: GOOGLE_IMA_SAMPLE_VAST,
                      },
                    })
                  }
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline"
                >
                  Fill Sample VAST Tag
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    VAST Ad Tag URL (Linear Pre-Roll)
                  </label>
                  <input
                    type="url"
                    placeholder="https://pubads.g.doubleclick.net/gampad/ads?iu=..."
                    value={adSettings.googleImaConfig?.adTagUrl || ''}
                    onChange={(e) =>
                      updateAdSettings({
                        googleImaConfig: {
                          ...adSettings.googleImaConfig,
                          adTagUrl: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Supports linear pre-roll tags conforming to VAST 2.0, 3.0, and 4.0 specifications.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    Google Ad Unit / Inventory Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="/21775744923/streamflix_player_preroll"
                    value={adSettings.googleImaConfig?.adUnit || ''}
                    onChange={(e) =>
                      updateAdSettings({
                        googleImaConfig: {
                          ...adSettings.googleImaConfig,
                          adUnit: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Primis Config */}
            <div className="rounded-2xl border border-white/10 bg-[#090f19] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Tv size={15} className="text-purple-400" />
                  Primis Video Monetization
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-400">Enable Primis</span>
                  <input
                    type="checkbox"
                    checked={adSettings.primisConfig?.enabled || false}
                    onChange={(e) =>
                      updateAdSettings({
                        primisConfig: {
                          ...adSettings.primisConfig,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-purple-600"
                  />
                </label>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">PRIMIS_PLAYER_ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1084201"
                      value={adSettings.primisConfig?.playerId || ''}
                      onChange={(e) =>
                        updateAdSettings({
                          primisConfig: {
                            ...adSettings.primisConfig,
                            playerId: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-purple-500 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">PRIMIS_PUBLISHER_ID</label>
                    <input
                      type="text"
                      placeholder="e.g. pub-7832"
                      value={adSettings.primisConfig?.publisherId || ''}
                      onChange={(e) =>
                        updateAdSettings({
                          primisConfig: {
                            ...adSettings.primisConfig,
                            publisherId: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-purple-500 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">PRIMIS_TAG (Embed URL / Tag)</label>
                  <input
                    type="text"
                    placeholder="https://live.primis.tech/live/liveView.php?s=..."
                    value={adSettings.primisConfig?.tag || ''}
                    onChange={(e) =>
                      updateAdSettings({
                        primisConfig: {
                          ...adSettings.primisConfig,
                          tag: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-purple-500 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Configured with credentials provided directly by your Primis account dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. RECENT ADVERTISING EVENT TELEMETRY */}
          <div className="rounded-2xl border border-white/10 bg-[#090f19] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white">Live Ad Lifecycle Events</h4>
                <p className="text-xs text-slate-400">Real-time impressions, skips, clicks, and quartiles</p>
              </div>
              <button
                type="button"
                onClick={clearAnalytics}
                className="text-xs text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5"
              >
                Clear Events Log
              </button>
            </div>

            {adEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No advertising events recorded in this browser session yet. Start a video stream or click &ldquo;Test Live Pre-Roll Ad&rdquo; above.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-[10px] font-black uppercase text-slate-500">
                    <tr>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Event</th>
                      <th className="pb-2">Provider</th>
                      <th className="pb-2">Placement</th>
                      <th className="pb-2">Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {adEvents.slice(0, 20).map((evt) => (
                      <tr key={evt.id} className="text-slate-300">
                        <td className="py-2 text-[11px] text-slate-500 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              evt.event === 'impression' || evt.event === 'complete'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : evt.event === 'click'
                                ? 'bg-blue-500/20 text-blue-300'
                                : evt.event === 'skip'
                                ? 'bg-amber-500/20 text-amber-300'
                                : evt.event === 'error'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {evt.event}
                          </span>
                        </td>
                        <td className="py-2 uppercase text-[11px] font-bold text-slate-300">
                          {evt.provider}
                        </td>
                        <td className="py-2 text-[11px] text-slate-400">{evt.placement}</td>
                        <td className="py-2 text-[11px] text-slate-500 capitalize">{evt.deviceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MOVIE STREAMING SERVICES                                           */}
      {/* ========================================================================= */}
      {activeTab === 'services' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Movie Streaming Platforms</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign platforms where titles are available and add custom local or regional services.
              </p>
            </div>
            <button
              onClick={() => setShowAddCustomService(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Add Custom Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Col: Interactive Movie Assignment (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#090f19] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Film size={16} className="text-blue-400" />
                  Assign Platforms to Title
                </h3>
                <span className="text-xs text-slate-400 font-semibold">Live Card Sync</span>
              </div>

              {/* Title Search Box */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search movie or TV title to assign platforms..."
                  value={movieQuery}
                  onChange={(e) => handleMovieSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              {/* Searched Movies Scroll List */}
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                {searchedMovies.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMovie(m)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 flex-shrink-0 transition-all ${
                      selectedMovie?.id === m.id
                        ? 'border-blue-500 bg-blue-500/15 shadow-md shadow-blue-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {m.poster_path && (
                      <img
                        src={imageUrl(m.poster_path, 'w92')}
                        alt={m.title}
                        className="h-10 w-7 rounded object-cover"
                      />
                    )}
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">
                      {m.title}
                    </span>
                  </button>
                ))}
              </div>

              {/* Selected Movie Assignment Panel */}
              {selectedMovie && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
                    <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/30 grid place-items-center text-blue-400 font-bold">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Editing Platforms for:</p>
                      <h4 className="text-base font-black text-white">{selectedMovie.title}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-3 mb-3">
                    Check the streaming platforms where <strong>{selectedMovie.title}</strong> is available. This will immediately display on its card under &ldquo;Available on&rdquo;.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {services.map((s) => {
                      const isChecked = assignedServiceIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleToggleServiceForMovie(s.id)}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
                            isChecked
                              ? 'border-blue-500 bg-blue-500/20 text-white font-bold'
                              : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div
                            className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-white/20 bg-transparent'
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.badgeColor || '#38bdf8' }}
                          />
                          <span className="truncate text-xs">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Registered Platforms Directory (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#090f19] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe size={16} className="text-blue-400" />
                  Streaming Platforms Directory
                </h3>
                <span className="text-xs text-slate-400 font-semibold">{services.length} services</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Platforms can be global subscriptions, African services (e.g. Showmax), or local networks.
              </p>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-lg grid place-items-center font-black text-xs text-white flex-shrink-0"
                        style={{ backgroundColor: s.badgeColor || '#2563eb' }}
                      >
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-white">{s.name}</p>
                          {s.isCustom && (
                            <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {s.region} · {s.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-white"
                        title="Visit site"
                      >
                        <ExternalLink size={13} />
                      </a>
                      {s.isCustom && (
                        <button
                          onClick={() => deleteCustomService(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400"
                          title="Delete custom service"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ADVERTISING ANALYTICS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white">Campaign Performance & Revenue</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time analytics for third-party sponsored content, internal premium promotions, and placement metrics.
            </p>
          </div>

          {/* Performance Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#090f19]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.03] text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Campaign</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Placements</th>
                  <th className="py-3.5 px-4">Impressions</th>
                  <th className="py-3.5 px-4">Clicks</th>
                  <th className="py-3.5 px-4">CTR</th>
                  <th className="py-3.5 px-4">Conversions</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300">
                {campaigns.map((c) => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{c.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="rounded bg-white/10 px-2 py-0.5 font-semibold text-[10px] uppercase">
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{c.placements.join(', ')}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{c.impressions.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-blue-400">{c.clicks.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">{ctr}%</td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">{c.conversions.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700/30 text-slate-400'
                          }`}
                        >
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: USER TIER & SETTINGS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#090f19] p-6 space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-blue-400" />
              Subscription Tier Testing
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Switch the current session between <strong>Free User</strong> and <strong>Premium Member</strong> to verify how promotions, banners, and format badges are displayed.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setUserTier('free');
                  setCurrentTierState('free');
                }}
                className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
                  currentTier === 'free'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">Free Plan</p>
                  {currentTier === 'free' && <Check size={16} className="text-blue-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-400">Shows promotional offers and upgrade banners.</p>
              </button>

              <button
                onClick={() => {
                  setUserTier('premium');
                  setCurrentTierState('premium');
                }}
                className={`flex-1 rounded-2xl border p-4 text-left transition-all ${
                  currentTier === 'premium'
                    ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    Premium Member
                  </p>
                  {currentTier === 'premium' && <Check size={16} className="text-amber-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-400">Ad-free streaming with 4K UHD and Dolby Atmos.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT CAMPAIGN                                             */}
      {/* ========================================================================= */}
      {showCreateCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#090f19] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
              </h3>
              <button
                onClick={() => setShowCreateCampaign(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="e.g. Premium Weekend Promo"
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Campaign Type</label>
                  <select
                    value={campType}
                    onChange={(e) => setCampType(e.target.value as CampaignType)}
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="promotion">Promotion</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="sponsored">Sponsored Content</option>
                    <option value="announcement">App Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Call to Action (CTA)</label>
                  <input
                    type="text"
                    value={campCta}
                    onChange={(e) => setCampCta(e.target.value)}
                    placeholder="e.g. Upgrade Now"
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={campHeadline}
                  onChange={(e) => setCampHeadline(e.target.value)}
                  placeholder="e.g. Upgrade to Premium"
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={campDescription}
                  onChange={(e) => setCampDescription(e.target.value)}
                  placeholder="e.g. Get unlimited access to 4K streams today..."
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Creative Image URL</label>
                <input
                  type="url"
                  value={campCreative}
                  onChange={(e) => setCampCreative(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5">Placements</label>
                <div className="flex flex-wrap gap-2">
                  {(['home', 'discover', 'player', 'search', 'profile'] as Placement[]).map((pl) => {
                    const active = campPlacements.includes(pl);
                    return (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => {
                          setCampPlacements(
                            active ? campPlacements.filter((p) => p !== pl) : [...campPlacements, pl],
                          );
                        }}
                        className={`rounded-lg border px-3 py-1.5 font-bold uppercase text-[10px] transition-colors ${
                          active
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaign(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-500 shadow-md shadow-blue-600/30"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM STREAMING SERVICE                                       */}
      {/* ========================================================================= */}
      {showAddCustomService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#090f19] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <h3 className="text-lg font-bold text-white">Add Custom Streaming Service</h3>
              <button
                onClick={() => setShowAddCustomService(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomService} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Showmax or Canal+"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Website URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={customServiceUrl}
                  onChange={(e) => setCustomServiceUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Africa / Global"
                    value={customServiceRegion}
                    onChange={(e) => setCustomServiceRegion(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3.5 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Service Type</label>
                  <select
                    value={customServiceType}
                    onChange={(e) => setCustomServiceType(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-[#060a10] px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="subscription">Subscription</option>
                    <option value="free">Free</option>
                    <option value="rent">Rental</option>
                    <option value="buy">Purchase</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Brand Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customServiceColor}
                    onChange={(e) => setCustomServiceColor(e.target.value)}
                    className="h-8 w-14 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-slate-300 font-mono">{customServiceColor}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomService(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-500 shadow-md shadow-blue-600/30"
                >
                  Add Platform
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIVE PRE-ROLL SIMULATOR                                            */}
      {/* ========================================================================= */}
      {simulatingAd && simulatedAdCreative && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#090f19] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 text-[10px] font-black uppercase">
                  Live Pre-Roll Preview
                </span>
                <span className="text-xs font-bold text-white">
                  Provider: {simulatedAdCreative.provider.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimulatingAd(false);
                  setSimulatedAdCreative(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <VideoAdPlayer
                ad={simulatedAdCreative}
                mediaId={101}
                mediaType="movie"
                onAdEnded={() => {
                  setSimulatingAd(false);
                  setSimulatedAdCreative(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
