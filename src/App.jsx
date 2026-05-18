import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Header from './components/Header';
import Auth from './components/Auth';
import TodaysAgenda from './components/TodaysAgenda';
import CalendarView from './components/CalendarView';
import Profile from './components/Profile';
import PlanSetup from './components/PlanSetup';
import Exams from './pages/Exams';
import Dashboard from './pages/Dashboard';
import FocusModeWrapper from './pages/FocusModeWrapper';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <>
      <Header user={user} logout={logout} />
      
      <main style={{ padding: '20px' }}>
        <Routes>
          {/* Public Route */}
          <Route path="/auth" element={user ? <Navigate to="/agenda" /> : <Auth />} />

          {/* Protected Routes */}
          <Route path="/agenda" element={user ? <TodaysAgenda /> : <Navigate to="/auth" />} />
          <Route path="/calendar" element={user ? <CalendarView /> : <Navigate to="/auth" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
          <Route path="/setup" element={user ? <PlanSetup /> : <Navigate to="/auth" />} />
          <Route path="/focus" element={user ? <FocusModeWrapper /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/exams" element={user ? <Exams /> : <Navigate to="/auth" />} />
          
          {/* New routes for missing features */}
          <Route path="/analytics" element={user ? <Analytics /> : <Navigate to="/auth" />} />
          <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/auth" />} />

          {/* Default + 404 */}
          <Route path="/" element={<Navigate to={user ? "/agenda" : "/auth"} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default App;