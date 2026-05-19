import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext, lazy, Suspense } from 'react';
import { AuthContext } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
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
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (user?.role!== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  const { user } = useContext(AuthContext);

  const LoadingFallback = () => (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      Loading...
    </div>
  );

  return (
    <>
      <Header />

      <main style={{ padding: '20px' }}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/auth" element={user? <Navigate to="/agenda" /> : <Auth />} />

            <Route path="/agenda" element={user? <TodaysAgenda /> : <Navigate to="/auth" />} />
            <Route path="/calendar" element={user? <CalendarView /> : <Navigate to="/auth" />} />
            <Route path="/dashboard" element={user? <Dashboard /> : <Navigate to="/auth" />} />
            <Route path="/setup" element={user? <PlanSetup /> : <Navigate to="/auth" />} />
            <Route path="/focus" element={user? <FocusModeWrapper /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={user? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/exams" element={user? <Exams /> : <Navigate to="/auth" />} />
            <Route path="/settings" element={user? <Settings /> : <Navigate to="/auth" />} />

            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />

            <Route path="/" element={<Navigate to={user? "/agenda" : "/auth"} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

export default App;