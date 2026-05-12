import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/AppLayout';
import Dashboard from './pages/Dashboard';
import NieuwePatiënt from './pages/NieuwePatiënt';
import NieuweSessie from './pages/NieuweSessie';
import AlleHonden from './pages/AlleHonden';
import NieuweHond from './pages/NieuweHond';
import BewerkSessie from './pages/BewerkSessie';
import Agenda from './pages/Agenda';
import NieuweAfspraak from './pages/NieuweAfspraak';
import HondenProfiel from './pages/HondenProfiel';
import EditHondenProfiel from './pages/EditHondenProfiel';
import HondenDetail from './pages/HondenDetail';
import HondenProfielGastpas from './pages/HondenProfielGastpas';
// Add page imports here

// Auth guard wrapper that also provides the Layout
const AuthGuard = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)' }}>
        <div className="w-8 h-8 border-4 border-pink-200 border-t-blue-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public routes - no auth required */}
            <Route path="/HondenProfielGastpas" element={<HondenProfielGastpas />} />
            <Route path="/gastpas/:slug" element={<HondenProfielGastpas />} />

            {/* Protected routes - wrapped in AuthGuard + Layout */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/Dashboard" element={<Dashboard />} />
              <Route path="/NieuwePatiënt" element={<NieuwePatiënt />} />
              <Route path="/NieuweSessie" element={<NieuweSessie />} />
              <Route path="/AlleHonden" element={<AlleHonden />} />
              <Route path="/NieuweHond" element={<NieuweHond />} />
              <Route path="/BewerkSessie" element={<BewerkSessie />} />
              <Route path="/Agenda" element={<Agenda />} />
              <Route path="/NieuweAfspraak" element={<NieuweAfspraak />} />
              <Route path="/HondenProfiel" element={<HondenProfiel />} />
              <Route path="/EditHondenProfiel" element={<EditHondenProfiel />} />
              <Route path="/HondenDetail" element={<HondenDetail />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;