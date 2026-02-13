import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
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
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/location/:id" element={<LocationDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/add" element={<AddLocation />} />
          <Route path="/edit/:id" element={<AddLocation />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/proposals" element={<Proposals />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
