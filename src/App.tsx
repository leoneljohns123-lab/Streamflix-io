import { AuthProvider, useAuth } from '@/lib/auth';
import { useRoute, navigate } from '@/lib/router';
import { Sidebar, Header, MobileNav } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { BrowsePage } from '@/pages/BrowsePage';
import { MyListPage, HistoryPage } from '@/pages/MyListPage';
import { PartiesPage } from '@/pages/PartiesPage';
import { PlayerPage } from '@/pages/PlayerPage';
import { AuthPage } from '@/pages/AuthPage';
import { AdminPage } from '@/pages/AdminPage';
import { PremiumPage } from '@/pages/PremiumPage';
import { VaultPage } from '@/pages/VaultPage';
import { AdBlockerNotice } from '@/components/AdBlockerNotice';
import { GlobalAiChatbot } from '@/components/GlobalAiChatbot';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useEffect, useState, useRef } from 'react';
import { useWatchlist } from '@/lib/hooks';
import { useSeasonNotifications } from '@/lib/notifications';

function AppContent() {
  const route = useRoute();
  const { user, loading: authLoading } = useAuth();
  const { watchlist } = useWatchlist();
  const { scanWatchlist } = useSeasonNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const scannedRef = useRef(false);

  // Background season scanner for shows in user's watchlist
  useEffect(() => {
    if (watchlist.length > 0 && !scannedRef.current) {
      scannedRef.current = true;
      // Delay slightly so initial page render is instantaneous
      const timer = setTimeout(() => {
        scanWatchlist(watchlist, { forceNotifyLatest: false });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [watchlist, scanWatchlist]);

  // Update search query from URL
  useEffect(() => {
    if (route.page === 'search' && route.params.q) {
      setSearchQuery(decodeURIComponent(route.params.q));
    }
  }, [route.page, route.params.q]);

  // Pages that require auth
  const authRequiredPages = ['mylist', 'history'];
  const needsAuth = authRequiredPages.includes(route.page) && !user && !authLoading;

  const renderPage = () => {
    if (needsAuth) return <AuthPage />;
    switch (route.page) {
      case 'home':
        return <HomePage />;
      case 'search':
        return <SearchPage query={searchQuery} />;
      case 'movies':
        return (
          <BrowsePage
            mediaType="movie"
            initialGenreId={route.params.genre ? parseInt(route.params.genre, 10) : undefined}
          />
        );
      case 'tv':
        return (
          <BrowsePage
            mediaType="tv"
            initialGenreId={route.params.genre ? parseInt(route.params.genre, 10) : undefined}
          />
        );
      case 'mylist':
        return <MyListPage />;
      case 'parties':
        return <PartiesPage />;
      case 'history':
        return <HistoryPage />;
      case 'admin':
        return <AdminPage />;
      case 'premium':
        return <PremiumPage />;
      case 'vault':
        return <VaultPage vaultId={route.params.id} />;
      case 'player': {
        const id = parseInt(route.params.id, 10);
        const type = route.params.type === 'tv' ? 'tv' : 'movie';
        const initialSeason = route.params.season ? parseInt(route.params.season, 10) : undefined;
        const initialEpisode = route.params.episode ? parseInt(route.params.episode, 10) : undefined;
        const initialTime = route.params.time ? parseFloat(route.params.time) : undefined;
        if (!id) return <HomePage />;
        return (
          <PlayerPage
            mediaType={type}
            tmdbId={id}
            initialSeason={initialSeason}
            initialEpisode={initialEpisode}
            initialTime={initialTime}
            initialPartyCode={route.params.party}
          />
        );
      }
      default:
        return <HomePage />;
    }
  };

  const isPlayerPage = route.page === 'player';

  return (
    <div className="min-h-screen bg-[#070c12] text-white">
      {!isPlayerPage && <Sidebar />}
      {!isPlayerPage && <Header onSearch={setSearchQuery} />}
      <main className={`pb-14 ${isPlayerPage ? '' : 'lg:ml-[184px] lg:pt-[72px]'}`}>
        {renderPage()}
      </main>
      {!isPlayerPage && <MobileNav />}
      {!isPlayerPage && <GlobalAiChatbot />}
      <AdBlockerNotice />
      <OfflineIndicator />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
