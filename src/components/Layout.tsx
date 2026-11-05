import {
  Bell,
  ChevronDown,
  Grid2X2,
  Flame,
  Home,
  ListPlus,
  LogOut,
  Play,
  Search,
  Tv,
  User,
  X,
  ExternalLink,
  Shield,
  FolderArchive,
  FileText,
  Sparkles,
  Film,
  Globe,
  Clock,
  Heart,
  Star,
  Calendar,
  Crown,
  Radio,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { navigate, useRoute } from '@/lib/router';
import { NotificationBell } from './NotificationBell';
import { PWAInstallButton } from './PWAInstallButton';

const navItems = [
  { label: 'Home', icon: Home, page: 'home' },
  { label: 'Watch Parties', icon: Radio, page: 'parties' },
  { label: 'Movies', icon: Grid2X2, page: 'movies' },
  { label: 'TV Shows', icon: Tv, page: 'tv' },
  { label: 'New & Popular', icon: Flame, page: 'movies' },
  { label: 'My List', icon: ListPlus, page: 'mylist' },
  { label: 'VIP Premium', icon: Crown, page: 'premium' },
  { label: 'Admin', icon: Shield, page: 'admin' },
];

export const VAULT_FILES = [
  {
    category: 'Featured Highlights',
    files: [
      { name: '🔥 Trending Top 10', targetId: 'section_trending' },
      { name: '🌟 Popular This Week', targetId: 'section_popular_this_week' },
      { name: '🆕 New Releases', targetId: 'section_new_releases' },
      { name: '📅 Coming Soon', targetId: 'section_coming_soon' },
      { name: '⭐ Top Rated Masterworks', targetId: 'section_top_rated' },
    ],
  },
  {
    category: 'Film & Series Genres',
    files: [
      { name: '💥 Action & Adrenaline', targetId: 'section_genre_action' },
      { name: '😂 Comedy & Laughs', targetId: 'section_genre_comedy' },
      { name: '😱 Horror & Spine Chilling', targetId: 'section_genre_horror' },
      { name: '🔍 Psychological Thrillers', targetId: 'section_genre_thriller' },
      { name: '❤️ Romance & Drama', targetId: 'section_genre_romance' },
      { name: '🚀 Sci-Fi & Future Realities', targetId: 'section_genre_scifi' },
      { name: '🧙 Fantasy & Mythic Realms', targetId: 'section_genre_fantasy' },
      { name: '🔫 Crime & Mob Heists', targetId: 'section_genre_crime' },
      { name: '🎨 Animation & Family Classics', targetId: 'section_genre_animation' },
    ],
  },
  {
    category: 'Regional & World Cinema',
    files: [
      { name: '🌍 Made in Africa', targetId: 'section_made_in_africa' },
      { name: '🇰🇪 Kenyan Cinema & Stories', targetId: 'section_reg_kenya' },
      { name: '📺 African TV Series', targetId: 'section_reg_african_tv' },
      { name: '🇳🇬 Nollywood Hits', targetId: 'section_reg_nollywood' },
      { name: '✊ Black Cinema & Culture', targetId: 'section_reg_black_cinema' },
      { name: '🌸 K-Drama Addictions', targetId: 'section_reg_kdrama' },
      { name: '🎬 Korean Movies', targetId: 'section_reg_korean_movies' },
      { name: '🇮🇳 Bollywood Blockbusters', targetId: 'section_reg_bollywood' },
      { name: '🇹🇷 Turkish Series', targetId: 'section_reg_turkish' },
      { name: '⚡ Anime Universes', targetId: 'section_reg_anime' },
    ],
  },
  {
    category: 'Curated & Special Sections',
    files: [
      { name: '💎 Hidden Gems', targetId: 'section_hidden_gems' },
      { name: '✨ StreamFlix Staff Picks', targetId: 'section_staff_picks' },
      { name: '🛋️ Weekend Watch', targetId: 'section_weekend_watch' },
      { name: '🌙 Late Night Movies', targetId: 'section_late_night' },
      { name: '🍿 Family Movie Night', targetId: 'section_family_night' },
      { name: '⏱️ Movies Under 90 Minutes', targetId: 'section_under_90_minutes' },
      { name: '📱 Short TV & Mini-Series', targetId: 'section_short_tv' },
    ],
  },
];

export function Sidebar() {
  const route = useRoute();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[184px] border-r border-white/[0.06] bg-[#080d13] lg:block">
      <div className="flex h-[72px] items-center px-5">
        <button onClick={() => navigate('/')} className="block">
          <img src="/logo-transparent.png" alt="StreamFlix" className="brand-logo" />
        </button>
      </div>
      <nav className="mt-3 space-y-1 px-2">
        {navItems.map(({ label, icon: Icon, page }) => (
          <button
            key={label}
            onClick={() => navigate(page === 'home' ? '/' : `/${page === 'New & Popular' ? 'movies' : page}`)}
            className={`nav-item ${route.page === page ? 'nav-item-active' : ''}`}
          >
            <Icon size={18} strokeWidth={route.page === page ? 2.4 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="absolute bottom-7 left-6 right-6 border-t border-white/[0.08] pt-5 text-[11px] leading-5 text-slate-500">
        <p>© 2024 StreamFlix</p>
        <p>All rights reserved.</p>
      </div>
    </aside>
  );
}

export function Header({ onSearch }: { onSearch: (query: string) => void }) {
  const route = useRoute();
  const { user, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const vaultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (vaultRef.current && !vaultRef.current.contains(e.target as Node)) {
        setVaultOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      onSearch(value);
    }
  };

  const handleVaultFileClick = (targetId: string) => {
    setVaultOpen(false);
    navigate(`/vault/${targetId}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-[72px] items-center justify-between border-b border-white/[0.06] bg-[#080d13]/95 px-4 sm:px-5 backdrop-blur-xl lg:left-[184px] lg:px-10">
      <div className="flex h-full items-center gap-7 lg:gap-10">
        <button onClick={() => navigate('/')} className="block lg:hidden">
          <img src="/logo-transparent.png" alt="StreamFlix" className="brand-logo-sm" />
        </button>
        <div className="hidden h-full items-center gap-8 text-[13px] text-slate-400 md:flex">
          {[
            { label: 'Home', page: 'home', path: '/' },
            { label: 'Movies', page: 'movies', path: '/movies' },
            { label: 'TV Shows', page: 'tv', path: '/tv' },
            { label: 'My List', page: 'mylist', path: '/mylist' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`top-link ${route.page === item.page ? 'top-link-active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* HEADER ACTIONS: On smaller displays only Logo, Search, and The Vault folder icon are shown */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Mobile search */}
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search..."
              className="h-10 w-36 sm:w-44 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] text-white outline-none placeholder:text-slate-500 focus:border-white/20"
            />
            <button onClick={() => { setSearchOpen(false); setSearchValue(''); }} className="icon-button">
              <X size={18} />
            </button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="icon-button md:hidden" aria-label="Search">
            <Search size={19} />
          </button>
        )}

        {/* Desktop search */}
        <label className="search-box hidden md:flex">
          <Search size={16} className="text-slate-400" />
          <input
            aria-label="Search movies"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for movies, shows, actors..."
          />
        </label>

        {/* THE VAULT ICON & POPOVER (AVAILABLE ON BOTH MOBILE & DESKTOP) */}
        <div ref={vaultRef} className="relative">
          <button
            onClick={() => setVaultOpen(!vaultOpen)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
              vaultOpen
                ? 'border-blue-500/50 bg-blue-600/20 text-blue-300 shadow-md shadow-blue-500/20'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
            }`}
            title="The Vault (Browse All Catalog Sections)"
            aria-label="The Vault"
          >
            <FolderArchive size={19} />
          </button>

          {/* THE VAULT POPOVER */}
          {vaultOpen && (
            <div className="absolute right-0 top-12 z-50 w-[300px] sm:w-[380px] md:w-[440px] overflow-hidden rounded-2xl border border-white/15 bg-[#0b121d]/98 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0f172a]/90 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
                    <FolderArchive size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide text-white">The Vault</h3>
                    <p className="text-[10px] text-slate-400">All Catalog Files & Homepage Sections</p>
                  </div>
                </div>
                <button
                  onClick={() => setVaultOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-3.5 space-y-4 [scrollbar-width:thin]">
                {VAULT_FILES.map((group) => (
                  <div key={group.category}>
                    <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {group.category}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.files.map((file) => (
                        <button
                          key={file.targetId}
                          onClick={() => handleVaultFileClick(file.targetId)}
                          className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold text-slate-300 transition-all hover:border-blue-400/40 hover:bg-blue-600/10 hover:text-white group/vaultfile cursor-pointer"
                        >
                          <FileText size={13} className="text-slate-500 group-hover/vaultfile:text-blue-400 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* In-App PWA Install Button */}
        <PWAInstallButton />

        {/* VIP Upgrade Button */}
        <button
          onClick={() => navigate('/premium')}
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-yellow-500/20 px-3.5 py-1.5 text-xs font-black text-amber-300 transition-all hover:border-amber-400 hover:bg-amber-500/30 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.15)]"
        >
          <Crown size={14} className="fill-amber-400 text-amber-400" />
          <span>VIP Premium</span>
        </button>

        {/* Season Release Notifications */}
        <NotificationBell />

        {/* Profile Avatar (Desktop only: hidden on smaller displays) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="profile-button"
            aria-label="Profile"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f52432] text-sm font-bold text-white ring-1 ring-white/15">
              {user?.email?.[0]?.toUpperCase() ?? 'G'}
            </div>
            <ChevronDown size={14} />
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#0d1117] shadow-2xl">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="truncate text-xs text-slate-500">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-white">{user?.email ?? 'Guest'}</p>
                </div>
                <button
                  onClick={() => { navigate('/premium'); setProfileOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-amber-300 hover:bg-white/5 hover:text-amber-200"
                >
                  <Crown size={16} className="text-amber-400" /> VIP Subscription
                </button>
                <button
                  onClick={() => { navigate('/mylist'); setProfileOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <ListPlus size={16} /> My List
                </button>
                <button
                  onClick={() => { navigate('/history'); setProfileOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <Play size={16} /> Watch History
                </button>
                <button
                  onClick={() => { navigate('/admin'); setProfileOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-blue-400 hover:bg-white/5 hover:text-blue-300"
                >
                  <Shield size={16} /> Admin Operations
                </button>
                {/* NEW TAB BUTTON MOVED INTO PROFILE DROPDOWN */}
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 border-t border-white/[0.06] px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <ExternalLink size={16} /> Open in New Tab
                </a>
                {user && (
                  <button
                    onClick={() => { signOut(); setProfileOpen(false); navigate('/'); }}
                    className="flex w-full items-center gap-3 border-t border-white/[0.06] px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const route = useRoute();
  const mobileNavItems = [
    navItems[0], // Home
    navItems[1], // Movies
    navItems[2], // TV Shows
    navItems[4], // My List
    navItems[5], // VIP Premium
  ];

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-white/[0.08] bg-[#080d13]/95 px-2 py-3 backdrop-blur-xl lg:hidden">
      {mobileNavItems.map(({ label, icon: Icon, page }) => (
        <button
          key={label}
          onClick={() => navigate(page === 'home' ? '/' : `/${page}`)}
          className={`${route.page === page ? 'mobile-nav-active' : ''} ${page === 'premium' ? 'text-amber-400 font-bold' : ''}`}
        >
          <Icon size={19} />
          <span>{label === 'VIP Premium' ? 'VIP' : label}</span>
        </button>
      ))}
    </nav>
  );
}
