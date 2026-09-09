import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import GroupAccessGate from '@/components/GroupAccessGate';
import Home from '@/pages/Home';
import LocationDetail from '@/pages/LocationDetail';
import AddLocation from '@/pages/AddLocation';
import Profile from '@/pages/Profile';
import Leaderboard from '@/pages/Leaderboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Guide from '@/pages/Guide';
// Removed Proposals import
import VerbaliList from '@/pages/Verbali/VerbaliList';
import VerbaleEditor from '@/pages/Verbali/VerbaleEditor';
import MembriCoCa from '@/pages/Verbali/MembriCoCa';
import ImpostazioniVerbale from '@/pages/Verbali/ImpostazioniVerbale';
import VerbaliStats from '@/pages/Verbali/VerbaliStats';
import Calendario from '@/pages/Calendario';
import UpdateManager from '@/components/UpdateManager';
import StoricoAttivita from '@/pages/StoricoAttivita';
import Settings from '@/pages/Settings';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Inventario from '@/pages/Inventario';
import Bilancio from '@/pages/Bilancio';
import ListaAttesa from '@/pages/ListaAttesa/ListaAttesa';
import IscrizionePubblica from '@/pages/Public/IscrizionePubblica';

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
    <ThemeProvider>
      <UpdateManager />
      <Router>
        <Routes>
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
      </Router>
    </ThemeProvider>
  );
}

export default App;
