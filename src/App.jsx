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

function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <>
      <Header user={user} logout={logout} />
      
      <main style={{ padding: '20px' }}>
        <Routes>
          <Route path="/auth" element={user ? <Navigate to="/agenda" /> : <Auth />} />
          <Route path="/agenda" element={user ? <TodaysAgenda /> : <Navigate to="/auth" />} />
          <Route path="/calendar" element={user ? <CalendarView /> : <Navigate to="/auth" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
          <Route path="/setup" element={user ? <PlanSetup /> : <Navigate to="/auth" />} />
          <Route path="/focus" element={user ? <FocusModeWrapper /> : <Navigate to="/auth" />} /> // Add this route
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/exams" element={user ? <Exams/> : <Navigate to="/auth" />} />
          <Route path="/" element={<Navigate to={user ? "/agenda" : "/auth"} />} />
        </Routes>
      </main>
    </>
  );
}

export default App;