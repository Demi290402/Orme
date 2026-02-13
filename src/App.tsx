import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import LocationDetail from '@/pages/LocationDetail';
import AddLocation from '@/pages/AddLocation';
import Profile from '@/pages/Profile';
import Leaderboard from '@/pages/Leaderboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import About from '@/pages/About';
import Proposals from '@/pages/Proposals';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/location/:id" element={<ProtectedRoute><Layout><LocationDetail /></Layout></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
        <Route path="/add" element={<ProtectedRoute><Layout><AddLocation /></Layout></ProtectedRoute>} />
        <Route path="/edit/:id" element={<ProtectedRoute><Layout><AddLocation /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><Layout><About /></Layout></ProtectedRoute>} />
        <Route path="/proposals" element={<ProtectedRoute><Layout><Proposals /></Layout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
