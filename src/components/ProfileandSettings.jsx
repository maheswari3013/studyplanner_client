import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import emailjs from "@emailjs/browser";
import '../assets/profile.css';
import { exportToPDF, exportToICS } from '../utils/exportUtils';

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
  const { user, logout, updateUser, token } = useContext(AuthContext);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Email change flow states
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeStep, setEmailChangeStep] = useState(0); // 0=init, 1=verifyOld, 2=verifyNew
  const [oldEmailOtp, setOldEmailOtp] = useState('');
  const [sentOldOtp, setSentOldOtp] = useState('');
  const [newEmailOtp, setNewEmailOtp] = useState('');
  const [sentNewOtp, setSentNewOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState('checking');

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setNotifStatus(sub? 'enabled' : 'disabled');
      }
    };
    checkSubscription();
  }, []);

  const resetEmailFlow = () => {
    setEmailChangeStep(0);
    setNewEmail('');
    setOldEmailOtp('');
    setNewEmailOtp('');
    setSentOldOtp('');
    setSentNewOtp('');
    setOtpExpiry(null);
  };

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const res = await API.get('/schedule/export');
      const blocks = res.data;
      if (!blocks.length) {
        alert('No study blocks to export. Create some first.');
        return;
      }
      if (type === 'pdf') exportToPDF(blocks, user.name);
      else exportToICS(blocks);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword!== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    const passwordError = validatePassword(passwordData.newPassword);
    if (passwordError) {
      alert(passwordError);
      return;
    }
    setLoading(true);
    try {
      await API.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const sendOtpToOldEmail = async () => {
    if (!newEmail || newEmail === user.email) {
      alert('Enter a new email address');
      return;
    }
    setOtpLoading(true);
    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = Date.now() + 15 * 60 * 1000;
      setSentOldOtp(String(generatedOtp));
      setOtpExpiry(expiry);
      const time = new Date(expiry);
      const expiryTime = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
      
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        { 
          email: user.email,
          otp: generatedOtp, 
          time: expiryTime,
          name: user.name,
          message: `Verify this change. Someone requested to change your account email to ${newEmail}. If this wasn't you, secure your account.`
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setEmailChangeStep(1);
      alert('OTP sent to your current email. Please verify.');
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP to current email');
    }
    setOtpLoading(false);
  };

  const verifyOldEmailAndSendNew = async () => {
    if (!sentOldOtp || oldEmailOtp!== sentOldOtp) {
      alert('Invalid OTP for current email');
      return;
    }
    if (Date.now() > otpExpiry) {
      alert('OTP expired. Start over.');
      resetEmailFlow();
      return;
    }
    
    setOtpLoading(true);
    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = Date.now() + 15 * 60 * 1000;
      setSentNewOtp(String(generatedOtp));
      setOtpExpiry(expiry);
      const time = new Date(expiry);
      const expiryTime = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
      
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        { 
          email: newEmail,
          otp: generatedOtp, 
          time: expiryTime,
          name: user.name,
          message: `Verify your new email address for StudyPlanner`
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setEmailChangeStep(2);
      alert('Current email verified. OTP sent to new email.');
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP to new email');
    }
    setOtpLoading(false);
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!sentNewOtp || newEmailOtp!== sentNewOtp) {
      alert('Invalid OTP for new email');
      setLoading(false);
      return;
    }
    if (Date.now() > otpExpiry) {
      alert('OTP expired. Start over.');
      resetEmailFlow();
      setLoading(false);
      return;
    }
    
    try {
      const res = await API.patch('/auth/profile', {
        name: user.name,
        email: newEmail
      });
      updateUser(res.data);
      alert('Email updated successfully');
      setShowEmailForm(false);
      resetEmailFlow();
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) ||!('PushManager' in window)) {
      alert('Push notifications not supported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission!== 'granted') {
        alert('Notification permission denied');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_PUBLIC_VAPID_KEY)
      });
      
      await API.post('/notifications/subscribe', subscription);
      setNotifStatus('enabled');
      alert('Notifications enabled! You will get study reminders.');
    } catch (err) {
      console.error(err);
      alert('Failed to enable notifications: ' + err.message);
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
                <p>OTP sent to <strong>{user.email}</strong></p>
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
            {exporting? 'Exporting...' : 'Add to Calendar'}
          </button>
        </div>
      </div>

      <button onClick={logout} className="btn-logout">
        Logout
      </button>
    </div>
  );
}