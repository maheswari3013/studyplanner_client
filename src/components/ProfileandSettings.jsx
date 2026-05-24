import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import '../assets/profile.css';
import { exportToPDF, exportToICS } from '../utils/exportUtils';
import toast from 'react-hot-toast';

const getGoogleAuthOrigin = () => {
  const url = import.meta.env.VITE_API_URL || 'https://studyplanner-api-awmh.onrender.com/api';
  try {
    return new URL(url).origin;
  } catch {
    return 'https://studyplanner-api-awmh.onrender.com';
  }
};

const GOOGLE_AUTH_ORIGIN = getGoogleAuthOrigin();
const API_ORIGIN = GOOGLE_AUTH_ORIGIN;

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
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function Profile() {
  const { user, logout, updateUser, fetchUser } = useContext(AuthContext);

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

  const [googleConnectionOverride, setGoogleConnectionOverride] = useState(null);

  const isGoogleConnected =
    googleConnectionOverride ?? !!user?.googleTokens?.access_token;

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        setNotifStatus(sub ? 'enabled' : 'disabled');
      }
    };

    checkSubscription();
  }, []);

  useEffect(() => {
    const handler = async (event) => {
      if (event.origin !== GOOGLE_AUTH_ORIGIN) return;

      if (
        event.data?.type === 'google-calendar-success' ||
        event.data?.type === 'google-auth-success' ||
        event.data?.type === 'GOOGLE_AUTH_SUCCESS'
      ) {
        toast.success('Google Calendar connected');

        setGoogleConnectionOverride(true);

        try {
          await fetchUser?.();
        } catch {
          setGoogleConnectionOverride(true);
        }
      }

      if (
        event.data?.type === 'google-auth-error' ||
        event.data?.type === 'GOOGLE_AUTH_ERROR'
      ) {
        toast.error('Google connect failed');
      }
    };

    window.addEventListener('message', handler);

    return () => {
      window.removeEventListener('message', handler);
    };
  }, [fetchUser]);

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
        toast.error('No study blocks to export');
        return;
      }

      if (type === 'pdf') {
        exportToPDF(blocks, user?.name || 'User');
      } else {
        exportToICS(blocks);
      }
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleConnectGoogle = () => {
    const width = 500;
    const height = 600;

    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const clientOrigin = window.location.origin;
    const popup = window.open(
      `${API_ORIGIN}/api/auth/google?origin=${encodeURIComponent(clientOrigin)}`,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      toast.error('Popup blocked. Please allow popups.');
    }
  };

  const handleSyncCalendar = async () => {
    try {
      const res = await API.get('/schedule/google/sync');

      if (res.data.success) {
        toast.success(`Synced ${res.data.synced} blocks`);
      }
    } catch (err) {
      if (
        err.response?.data?.action === 'CONNECT_CALENDAR' ||
        err.response?.data?.needsAuth
      ) {
        toast('Connect Google Calendar first');

        const clientOrigin = window.location.origin;
        const token = localStorage.getItem('token');
        const popup = window.open(
          `${GOOGLE_AUTH_ORIGIN}/api/auth/google/calendar?origin=${encodeURIComponent(clientOrigin)}&token=${token}`,
          'gcal-connect',
          'width=500,height=600'
        );

        const handler = (event) => {
          if (event.origin !== GOOGLE_AUTH_ORIGIN) return;

          if (event.data?.type === 'google-calendar-success') {
            window.removeEventListener('message', handler);

            popup?.close();

            toast.success('Calendar connected');

            setGoogleConnectionOverride(true);

            handleSyncCalendar();
          }
        };

        window.addEventListener('message', handler);
      } else {
        toast.error(
          err.response?.data?.message ||
            err.response?.data?.msg ||
            'Sync failed'
        );
      }
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await API.delete('/auth/google/disconnect');

      setGoogleConnectionOverride(false);

      await fetchUser?.();

      toast.success('Google Calendar disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
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

      toast.success('Password updated');

      setShowPasswordForm(false);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const sendOtpToOldEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      toast.error('Enter a new email');
      return;
    }

    setOtpLoading(true);

    try {
      const res = await API.post('/auth/request-email-change', {
        newEmail
      });

      setEmailChangeStep(1);

      if (res.data.devMode) {
        toast.success(`DEV OTP: ${res.data.otp}`, {
          duration: 8000
        });
      } else {
        toast.success('OTP sent to current email');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to send OTP');
    }

    setOtpLoading(false);
  };

  const verifyOldEmailAndSendNew = async () => {
    setOtpLoading(true);

    try {
      const res = await API.post('/auth/verify-old-email', {
        otp: oldEmailOtp
      });

      setEmailChangeStep(2);

      if (res.data.devMode) {
        toast.success(`DEV OTP: ${res.data.otp}`, {
          duration: 8000
        });
      } else {
        toast.success('OTP sent to new email');
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
      const res = await API.patch('/auth/confirm-email-change', {
        otp: newEmailOtp
      });

      updateUser(res.data);

      toast.success('Email updated');

      setShowEmailForm(false);

      resetEmailFlow();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_PUBLIC_VAPID_KEY
        )
      });

      await API.post('/notifications/subscribe', subscription);

      setNotifStatus('enabled');

      toast.success('Notifications enabled');
    } catch (err) {
      console.error(err);

      toast.error(`Failed: ${err.message}`);
    }
  };

  if (!user) {
    return <div className="profile-loading">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Profile & Settings</h2>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <div>
            <h3>{user.name}</h3>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="password-card">
        <h3>Notifications</h3>

        <div className="profile-actions">
          {notifStatus === 'enabled' ? (
            <button className="btn-secondary" disabled>
              ✅ Notifications Enabled
            </button>
          ) : (
            <button
              onClick={subscribeToNotifications}
              className="btn-primary"
            >
              Enable Study Reminders
            </button>
          )}
        </div>
      </div>



      <div className="password-card">
        <h3>Security</h3>

        <div className="security-btn-group">
          <button
            onClick={() => {
              setShowPasswordForm(!showPasswordForm);
              setShowEmailForm(false);
              resetEmailFlow();
            }}
            className="btn-secondary"
          >
            {showPasswordForm ? 'Cancel' : user.hasPassword ? 'Change Password' : 'Set Password'}
          </button>

          <button
            onClick={() => {
              setShowEmailForm(!showEmailForm);
              setShowPasswordForm(false);
              resetEmailFlow();
            }}
            className="btn-secondary"
          >
            {showEmailForm ? 'Cancel' : 'Change Email'}
          </button>
        </div>

        {showPasswordForm && (
          <form
            onSubmit={handlePasswordChange}
            className="password-form"
          >
            {user.hasPassword && (
              <label>
                Current Password

                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value
                    })
                  }
                  required
                />
              </label>
            )}

            <label>
              New Password

              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value
                  })
                }
                required
              />
            </label>

            <label>
              Confirm Password

              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value
                  })
                }
                required
              />
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : user.hasPassword ? 'Update Password' : 'Set Password'}
            </button>
          </form>
        )}

        {showEmailForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (emailChangeStep === 0) {
                sendOtpToOldEmail();
              } else if (emailChangeStep === 1) {
                verifyOldEmailAndSendNew();
              } else if (emailChangeStep === 2) {
                handleEmailChange(e);
              }
            }}
            className="password-form"
          >
            {emailChangeStep === 0 && (
              <label>
                New Email

                <div className="email-otp-row">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="email-input-flex"
                    required
                  />

                  <button
                    type="button"
                    onClick={sendOtpToOldEmail}
                    className="btn-secondary"
                    disabled={otpLoading}
                  >
                    {otpLoading ? 'Sending...' : 'Verify Current'}
                  </button>
                </div>
              </label>
            )}

            {emailChangeStep === 1 && (
              <>
                <p>OTP sent to {user.email}</p>

                <div className="email-otp-row">
                  <input
                    type="text"
                    value={oldEmailOtp}
                    onChange={(e) => setOldEmailOtp(e.target.value)}
                    className="email-input-flex"
                    required
                  />

                  <button
                    type="button"
                    onClick={verifyOldEmailAndSendNew}
                    className="btn-secondary"
                    disabled={otpLoading}
                  >
                    {otpLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </>
            )}

            {emailChangeStep === 2 && (
              <>
                <p>OTP sent to {newEmail}</p>

                <input
                  type="text"
                  value={newEmailOtp}
                  onChange={(e) => setNewEmailOtp(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
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
            className="btn-secondary"
            disabled={exporting}
          >
            Download PDF
          </button>

          <button
            onClick={() => handleExport('ics')}
            className="btn-secondary"
            disabled={exporting}
          >
            Download ICS
          </button>
        </div>
      </div>

      <button onClick={logout} className="btn-logout">
        Logout
      </button>
    </div>
  );
}