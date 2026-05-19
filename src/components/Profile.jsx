import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import emailjs from "@emailjs/browser";
import '../assets/profile.css';
import { exportToPDF, exportToICS } from '../utils/exportUtils';

// Same password validation as Auth.jsx
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

  // Email change + OTP states
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const res = await API.get('/schedule/export');
      const blocks = res.data;
      console.log('Blocks received:', blocks);

      if (!blocks.length) {
        alert('No study blocks to export. Create some first.');
        return;
      }
      if (type === 'pdf') {
        exportToPDF(blocks, user.name);
      } else {
        exportToICS(blocks);
      }
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

  const sendOtpToNewEmail = async () => {
    if (!newEmail || newEmail === user.email) {
      alert('Enter a new email address');
      return;
    }

    setOtpLoading(true);
    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000);
      const expiry = Date.now() + 15 * 60 * 1000;
      setSentOtp(String(generatedOtp));
      setOtpExpiry(expiry);

      const time = new Date(expiry);
      const expiryTime = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;

      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        { email: newEmail, otp: generatedOtp, time: expiryTime },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      alert('OTP sent to new email. Valid for 15 minutes.');
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP');
    }
    setOtpLoading(false);
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!sentOtp || otp!== sentOtp) {
      alert('Invalid OTP');
      setLoading(false);
      return;
    }

    if (Date.now() > otpExpiry) {
      alert('OTP expired. Generate a new one.');
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
      setNewEmail('');
      setOtp('');
      setSentOtp('');
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-container">
      <h2>Profile</h2>

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
        <h3>Security</h3>
        <div className="security-btn-group">
          <button onClick={() => { setShowPasswordForm(!showPasswordForm); setShowEmailForm(false); }} className="btn-secondary">
            {showPasswordForm? 'Cancel' : 'Change Password'}
          </button>
          <button onClick={() => { setShowEmailForm(!showEmailForm); setShowPasswordForm(false); }} className="btn-secondary">
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
                  onClick={sendOtpToNewEmail}
                  disabled={otpLoading ||!newEmail}
                  className="btn-secondary"
                >
                  {otpLoading? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </label>
            <label>
              Enter OTP
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                required
              />
            </label>
            <div className="profile-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading? 'Updating...' : 'Update Email'}
              </button>
            </div>
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