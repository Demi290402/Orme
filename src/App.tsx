import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import LocationDetail from '@/pages/LocationDetail';
import AddLocation from '@/pages/AddLocation';
import Profile from '@/pages/Profile';
import Leaderboard from '@/pages/Leaderboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Guide from '@/pages/Guide';
import Proposals from '@/pages/Proposals';
import VerbaliList from '@/pages/Verbali/VerbaliList';
import VerbaleEditor from '@/pages/Verbali/VerbaleEditor';
import MembriCoCa from '@/pages/Verbali/MembriCoCa';
import ImpostazioniVerbale from '@/pages/Verbali/ImpostazioniVerbale';
import VerbaliStats from '@/pages/Verbali/VerbaliStats';
import Calendario from '@/pages/Calendario';
import UpdateManager from '@/components/UpdateManager';

function App() {
  return (
    <ThemeProvider>
      <UpdateManager />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/location/:id" element={<Layout><LocationDetail /></Layout>} />

          {/* Protected routes */}
          <Route path="/leaderboard" element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><Layout><AddLocation /></Layout></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><Layout><AddLocation /></Layout></ProtectedRoute>} />
          <Route path="/guide" element={<ProtectedRoute><Layout><Guide /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
          <Route path="/proposals" element={<ProtectedRoute><Layout><Proposals /></Layout></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><Layout><Calendario /></Layout></ProtectedRoute>} />
          <Route path="/verbali" element={<ProtectedRoute><Layout><VerbaliList /></Layout></ProtectedRoute>} />
          <Route path="/verbali/nuovo" element={<ProtectedRoute><Layout><VerbaleEditor /></Layout></ProtectedRoute>} />
          <Route path="/verbali/modifica/:id" element={<ProtectedRoute><Layout><VerbaleEditor /></Layout></ProtectedRoute>} />
          <Route path="/verbali/visualizza/:id" element={<ProtectedRoute><Layout><VerbaleEditor viewMode={true} /></Layout></ProtectedRoute>} />
          <Route path="/verbali/membri" element={<ProtectedRoute><Layout><MembriCoCa /></Layout></ProtectedRoute>} />
          <Route path="/verbali/impostazioni" element={<ProtectedRoute><Layout><ImpostazioniVerbale /></Layout></ProtectedRoute>} />
          <Route path="/verbali/statistiche" element={<ProtectedRoute><Layout><VerbaliStats /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
