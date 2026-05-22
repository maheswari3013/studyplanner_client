import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import '../assets/profile.css';
import { exportToPDF, exportToICS } from '../utils/exportUtils';
import toast from 'react-hot-toast';

const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!minLength) return 'Password must be at least 8 characters';
  if (!hasUpper) return 'Password must contain 1 uppercase letter';
  if (!hasNumber) return 'Password must contain 1 number';
  if (!hasSpecial) return 'Password must contain 1 special character';
  return '';
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default function Profile() {
  const { user, logout, updateUser } = useContext(AuthContext);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [newEmail, setNewEmail] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState(0);
  const [oldEmailOtp, setOldEmailOtp] = useState('');
  const [newEmailOtp, setNewEmailOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState('checking');
  const [googleStatus, setGoogleStatus] = useState('checking'); // ADD THIS

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setNotifStatus(sub? 'enabled' : 'disabled');
      }
    };

    // ADD THIS: Check Google Calendar connection
    const checkGoogleStatus = async () => {
      try {
        const res = await API.get('/schedule/google/status');
        setGoogleStatus(res.data.connected? 'connected' : 'disconnected');
      } catch {
        setGoogleStatus('disconnected');
      }
    };

    checkSubscription();
    checkGoogleStatus();
  }, []);

  const resetEmailFlow = () => {
    setEmailChangeStep(0);
    setNewEmail('');
    setOldEmailOtp('');
    setNewEmailOtp('');
  };

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const res = await API.get('/schedule/export');
      const blocks = res.data;
      if (!blocks.length) {
        toast.error('No study blocks to export. Create some first.');
        return;
      }
      if (type === 'pdf') exportToPDF(blocks, user?.name || 'User'); // SAFE ACCESS
      else exportToICS(blocks);
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ADD THIS: Google Calendar Connect
  const handleConnectGoogle = async () => {
    try {
      const res = await API.get('/schedule/google/auth');
      const popup = window.open(res.data.url, '_blank', 'width=500,height=600');

      const handleMessage = (event) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          setGoogleStatus('connected');
          toast.success('Google Calendar connected!');
          window.removeEventListener('message', handleMessage);
          popup?.close();
        }
        if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          toast.error('Google connection failed');
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      toast.error('Failed to connect Google Calendar');
    }
  };

  // ADD THIS: Sync to Google Calendar
  const handleSyncCalendar = async () => {
    try {
      const res = await API.post('/schedule/google/sync');
      toast.success(res.data.msg);
    } catch (err) {
      if (err.response?.data?.needsAuth) {
        toast.error('Connect Google Calendar first');
      } else {
        toast.error('Sync failed');
      }
    }
  };

  // ADD THIS: Disconnect Google
  const handleDisconnectGoogle = async () => {
    try {
      await API.delete('/schedule/google/disconnect');
      setGoogleStatus('disconnected');
      toast.success('Google Calendar disconnected');
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword!== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    const passwordError = validatePassword(passwordData.newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setLoading(true);
    try {
      await API.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const sendOtpToOldEmail = async () => {
    if (!newEmail || newEmail === user?.email) { // SAFE ACCESS
      toast.error('Enter a new email address');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await API.post('/auth/request-email-change', { newEmail });
      setEmailChangeStep(1);
      if (res.data.devMode) {
        toast.success(`DEV OTP: ${res.data.otp}`, { duration: 8000 });
      } else {
        toast.success('OTP sent to your current email');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to send OTP');
    }
    setOtpLoading(false);
  };

  const verifyOldEmailAndSendNew = async () => {
    setOtpLoading(true);
    try {
      const res = await API.post('/auth/verify-old-email', { otp: oldEmailOtp });
      setEmailChangeStep(2);
      if (res.data.devMode) {
        toast.success(`DEV OTP: ${res.data.otp}`, { duration: 8000 });
      } else {
        toast.success('Current email verified. OTP sent to new email');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Verification failed');
    }
    setOtpLoading(false);
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.patch('/auth/confirm-email-change', { otp: newEmailOtp });
      updateUser(res.data);
      toast.success('Email updated successfully');
      setShowEmailForm(false);
      resetEmailFlow();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) ||!('PushManager' in window)) {
      toast.error('Push notifications not supported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission!== 'granted') {
        toast.error('Notification permission denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_PUBLIC_VAPID_KEY)
      });

      await API.post('/notifications/subscribe', subscription);
      setNotifStatus('enabled');
      toast.success('Notifications enabled! You will get study reminders.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to enable notifications: ' + err.message);
    }
  };

  if (!user) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-container">
      <h2>Profile & Settings</h2>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <h3>{user.name}</h3>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="password-card">
        <h3>Notifications</h3>
        <div className="profile-actions">
          {notifStatus === 'enabled'? (
            <button className="btn-secondary" disabled>
              ✅ Notifications Enabled
            </button>
          ) : (
            <button onClick={subscribeToNotifications} className="btn-primary">
              Enable Study Reminders
            </button>
          )}
        </div>
      </div>

      {/* ADD THIS: Google Calendar Section */}
      <div className="password-card">
        <h3>Google Calendar</h3>
        <div className="profile-actions">
          {googleStatus === 'connected'? (
            <>
              <button onClick={handleSyncCalendar} className="btn-primary">
                Sync to Google Calendar
              </button>
              <button onClick={handleDisconnectGoogle} className="btn-secondary">
                Disconnect
              </button>
            </>
          ) : (
            <button onClick={handleConnectGoogle} className="btn-primary">
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      <div className="password-card">
        <h3>Security</h3>
        <div className="security-btn-group">
          <button onClick={() => { setShowPasswordForm(!showPasswordForm); setShowEmailForm(false); resetEmailFlow(); }} className="btn-secondary">
            {showPasswordForm? 'Cancel' : 'Change Password'}
          </button>
          <button onClick={() => { setShowEmailForm(!showEmailForm); setShowPasswordForm(false); resetEmailFlow(); }} className="btn-secondary">
            {showEmailForm? 'Cancel' : 'Change Email'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="password-form">
            <label>
              Current Password
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                required
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="8+ chars, 1 upper, 1 number, 1 special"
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                required
              />
            </label>
            <div className="profile-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {showEmailForm && (
          <form onSubmit={handleEmailChange} className="password-form">
            {emailChangeStep === 0 && (
              <label>
                New Email Address
                <div className="email-otp-row">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    required
                    className="email-input-flex"
                  />
                  <button
                    type="button"
                    onClick={sendOtpToOldEmail}
                    disabled={otpLoading ||!newEmail}
                    className="btn-secondary"
                  >
                    {otpLoading? 'Sending...' : 'Verify Current'}
                  </button>
                </div>
              </label>
            )}

            {emailChangeStep === 1 && (
              <>
                <p>OTP sent to <strong>{user?.email}</strong></p>
                <label>
                  Enter OTP from current email
                  <div className="email-otp-row">
                    <input
                      type="text"
                      value={oldEmailOtp}
                      onChange={e => setOldEmailOtp(e.target.value)}
                      placeholder="6-digit OTP"
                      required
                      className="email-input-flex"
                    />
                    <button
                      type="button"
                      onClick={verifyOldEmailAndSendNew}
                      disabled={otpLoading ||!oldEmailOtp}
                      className="btn-secondary"
                    >
                      {otpLoading? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </label>
              </>
            )}

            {emailChangeStep === 2 && (
              <>
                <p>OTP sent to <strong>{newEmail}</strong></p>
                <label>
                  Enter OTP from new email
                  <input
                    type="text"
                    value={newEmailOtp}
                    onChange={e => setNewEmailOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    required
                  />
                </label>
                <div className="profile-actions">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading? 'Updating...' : 'Update Email'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      <div className="export-card">
        <h3>Export Schedule</h3>
        <div className="profile-actions">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="btn-secondary"
          >
            {exporting? 'Exporting...' : 'Download PDF'}
          </button>
          <button
            onClick={() => handleExport('ics')}
            disabled={exporting}
            className="btn-secondary"
          >
            {exporting? 'Exporting...' : 'Download.ics File'}
          </button>
        </div>
      </div>

      <button onClick={logout} className="btn-logout">
        Logout
      </button>
    </div>
  );
}