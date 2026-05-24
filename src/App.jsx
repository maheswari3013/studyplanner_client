import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext, lazy, Suspense, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import Auth from './components/Auth';
import TodaysAgenda from './components/TodaysAgenda';

const CalendarView = lazy(() => import('./components/CalendarView'));
const Profile = lazy(() => import('./components/ProfileandSettings.jsx'));
const Exams = lazy(() => import('./pages/Exams')); // This is now the merged file
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FocusModeWrapper = lazy(() => import('./pages/FocusModeWrapper'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  if (user?.role!== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  const { user } = useContext(AuthContext);

  // Push notification subscription
  useEffect(() => {
    if (!user) return;

    const subscribeToPush = async () => {
      if (!('serviceWorker' in navigator) ||!('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission!== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const keyRes = await fetch('https://studyplanner-api-awmh.onrender.com/api/notifications/vapid-public-key', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (!keyRes.ok) throw new Error('Failed to fetch VAPID key');
          const { publicKey } = await keyRes.json();

          const convertedVapidKey = urlBase64ToUint8Array(publicKey);

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        const res = await fetch('https://studyplanner-api-awmh.onrender.com/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(subscription)
        });

        if (!res.ok) throw new Error('Subscribe request failed');
        console.log('Push subscription successful');

      } catch (error) {
        console.error('Push subscription failed:', error);
      }
    };

    subscribeToPush();
  }, [user]); // Fixed: added user dependency

  const LoadingFallback = () => (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      Loading...
    </div>
  );

  return (
    <>
      <Header />

      <main className="app-shell">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/auth" element={user? <Navigate to="/dashboard" /> : <Auth />} />

            <Route path="/agenda" element={user? <TodaysAgenda /> : <Navigate to="/auth" />} />
            <Route path="/calendar" element={user? <CalendarView /> : <Navigate to="/auth" />} />
            <Route path="/dashboard" element={user? <Dashboard /> : <Navigate to="/auth" />} />
            <Route path="/focus" element={user? <FocusModeWrapper /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={user? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/exams" element={user? <Exams /> : <Navigate to="/auth" />} />

            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
              
            <Route path="/" element={<Navigate to={user? "/dashboard" : "/auth"} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

export default App;
