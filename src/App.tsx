import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import GroupAccessGate from '@/components/GroupAccessGate';
import UpdateManager from '@/components/UpdateManager';
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy load all pages for optimal bundle splitting and fast initial load
const Home = lazy(() => import('@/pages/Home'));
const LocationDetail = lazy(() => import('@/pages/LocationDetail'));
const AddLocation = lazy(() => import('@/pages/AddLocation'));
const Profile = lazy(() => import('@/pages/Profile'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Guide = lazy(() => import('@/pages/Guide'));
const VerbaliList = lazy(() => import('@/pages/Verbali/VerbaliList'));
const VerbaleEditor = lazy(() => import('@/pages/Verbali/VerbaleEditor'));
const MembriCoCa = lazy(() => import('@/pages/Verbali/MembriCoCa'));
const ImpostazioniVerbale = lazy(() => import('@/pages/Verbali/ImpostazioniVerbale'));
const VerbaliStats = lazy(() => import('@/pages/Verbali/VerbaliStats'));
const Calendario = lazy(() => import('@/pages/Calendario'));
const StoricoAttivita = lazy(() => import('@/pages/StoricoAttivita'));
const Settings = lazy(() => import('@/pages/Settings'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Inventario = lazy(() => import('@/pages/Inventario'));
const Bilancio = lazy(() => import('@/pages/Bilancio'));
const ListaAttesa = lazy(() => import('@/pages/ListaAttesa/ListaAttesa'));
const PersonalizzaFormIscrizione = lazy(() => import('@/pages/ListaAttesa/PersonalizzaFormIscrizione'));
const IscrizionePubblica = lazy(() => import('@/pages/Public/IscrizionePubblica'));
const WatchView = lazy(() => import('@/pages/Watch/WatchView'));
import { useSmartwatch } from '@/hooks/useSmartwatch';
import { useLocation, useNavigate } from 'react-router-dom';

function SmartwatchRedirector() {
  const { isSmartwatch, viewMode } = useSmartwatch();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSmartwatch && viewMode !== 'full' && location.pathname !== '/watch' && !location.pathname.startsWith('/iscrizione') && location.pathname !== '/privacy') {
      navigate('/watch', { replace: true });
    }
  }, [isSmartwatch, viewMode, location.pathname, navigate]);

  return null;
}


function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
      <div className="w-10 h-10 border-[3px] border-scout-green border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">Caricamento...</p>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Check and trigger scheduled auto exports on app mount
    import('@/lib/autoExport')
      .then(({ checkAndRunAutoExport }) => {
        checkAndRunAutoExport();
      })
      .catch(err => console.error('Errore avvio auto-export:', err));
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UpdateManager />
        <Router>
          <SmartwatchRedirector />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Smartwatch route */}
              <Route path="/watch" element={<WatchView />} />

              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/mappa" element={<Layout><Home defaultView="map" /></Layout>} />
              <Route path="/location/:id" element={<Layout><LocationDetail /></Layout>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/iscrizione/:groupId" element={<IscrizionePubblica />} />

              {/* Protected routes */}
              <Route path="/leaderboard" element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
              <Route path="/add" element={<ProtectedRoute><Layout><AddLocation /></Layout></ProtectedRoute>} />
              <Route path="/edit/:id" element={<ProtectedRoute><Layout><AddLocation /></Layout></ProtectedRoute>} />
              <Route path="/guide" element={<ProtectedRoute><Layout><Guide /></Layout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
              {/* Private Group Routes (Strictly Isolated to Active CoCa Members) */}
              <Route path="/calendario" element={<ProtectedRoute><Layout><GroupAccessGate><Calendario /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute><Layout><GroupAccessGate><Inventario /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/bilancio" element={<ProtectedRoute><Layout><GroupAccessGate><Bilancio /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/lista-attesa" element={<ProtectedRoute><Layout><GroupAccessGate><ListaAttesa /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/lista-attesa/personalizza" element={<ProtectedRoute><Layout><GroupAccessGate><PersonalizzaFormIscrizione /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali" element={<ProtectedRoute><Layout><GroupAccessGate><VerbaliList /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali/nuovo" element={<ProtectedRoute><Layout><GroupAccessGate><VerbaleEditor /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali/modifica/:id" element={<ProtectedRoute><Layout><GroupAccessGate><VerbaleEditor /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali/visualizza/:id" element={<ProtectedRoute><Layout><GroupAccessGate><VerbaleEditor viewMode={true} /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali/membri" element={<ProtectedRoute><Layout><GroupAccessGate><MembriCoCa /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali/impostazioni" element={<ProtectedRoute><Layout><GroupAccessGate><ImpostazioniVerbale /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/verbali/statistiche" element={<ProtectedRoute><Layout><GroupAccessGate><VerbaliStats /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/storico" element={<ProtectedRoute><Layout><GroupAccessGate><StoricoAttivita /></GroupAccessGate></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
