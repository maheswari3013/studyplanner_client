import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext, lazy, Suspense } from 'react';
import { AuthContext } from './context/AuthContext';
import Header from './components/Header';
import Auth from './components/Auth';
import TodaysAgenda from './components/TodaysAgenda';

// Lazy load everything else
const CalendarView = lazy(() => import('./components/CalendarView'));
const Profile = lazy(() => import('./components/Profile'));
const PlanSetup = lazy(() => import('./components/PlanSetup'));
const Exams = lazy(() => import('./pages/Exams'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FocusModeWrapper = lazy(() => import('./pages/FocusModeWrapper'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const { user, logout } = useContext(AuthContext);

  const LoadingFallback = () => (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      Loading...
    </div>
  );

  return (
    <>
      <Header user={user} logout={logout} />
      
      <main style={{ padding: '20px' }}>
        <Suspense fallback={<LoadingFallback />}>
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
            <Route path="/analytics" element={user ? <Analytics /> : <Navigate to="/auth" />} />
            <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/auth" />} />

            {/* Default + 404 */}
            <Route path="/" element={<Navigate to={user ? "/agenda" : "/auth"} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

export default App;