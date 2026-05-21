import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import '../assets/Auth.css';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { validatePassword, getPasswordError } from '../utils/validatePassword';

const VAPID_PUBLIC_KEY = 'BOHFuuYR-Esh5cxDIUQKh_Vqmvx5xMo70osWEiEZKmbJGQvKegSio0oGQMUbZuAypHhkp6JcZ5HlBu0A2sShFgs';

const Auth = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify' | 'forgot' | 'reset'
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '', otp: '' });
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const { username, email, password, confirmPassword, otp } = formData;

  const onChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value });
    setError('');
  };

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

  const subscribeUser = async (token) => {
    try {
      if (!('serviceWorker' in navigator) ||!('PushManager' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission!== 'granted') return;

      const sw = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      await API.post('/notifications/subscribe', subscription, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notifications enabled');
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password!== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }
    if (!validatePassword(password)) {
      const msg = getPasswordError(password);
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await API.post('/auth/register', { username, email, password });

      if (res.data.devMode && res.data.otp) {
        setFormData({...formData, otp: res.data.otp });
        setMode('verify');
        toast.success(`Email service down. Use this OTP: ${res.data.otp}`, { duration: 8000 });
      } else {
        setMode('verify');
        toast.success(res.data.msg || 'OTP sent to your email. Check spam too.');
      }
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to send OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVerifyRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      const res = await API.post('/auth/verify-register', { email, otp });
      const { token, user } = res.data;

      if (!token ||!user) throw new Error('Invalid response');

      setAuthData(token, user);
      toast.success('Registration successful');
      navigate('/agenda');
    } catch (err) {
      const msg = err.response?.data?.msg || 'OTP verification failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      const { token, user } = res.data;

      if (!token ||!user) throw new Error('Invalid response from server');

      setAuthData(token, user);
      subscribeUser(token).catch(() => {});
      navigate('/agenda');
    } catch (err) {
      const msg = err.response?.data?.msg || err.message || 'Authentication failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email });

      if (res.data.devMode && res.data.otp) {
        setFormData({...formData, otp: res.data.otp });
        setMode('reset');
        toast.success(`Email service down. Use this OTP: ${res.data.otp}`, { duration: 8000 });
      } else {
        setMode('reset');
        toast.success(res.data.msg || 'Reset OTP sent to your email');
      }
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to send OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password!== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }
    if (!validatePassword(password)) {
      const msg = getPasswordError(password);
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitLoading(true);
    try {
      await API.post('/auth/reset-password', { email, otp, newPassword: password });
      setMode('login');
      setFormData({...formData, password: '', confirmPassword: '', otp: '' });
      toast.success('Password reset successful. Please login.');
    } catch (err) {
      const msg = err.response?.data?.msg || 'Reset failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'login') return 'Login';
    if (mode === 'register') return 'Register';
    if (mode === 'verify') return 'Verify OTP';
    if (mode === 'forgot') return 'Forgot Password';
    if (mode === 'reset') return 'Reset Password';
  };

  const getSubmitHandler = () => {
    if (mode === 'login') return handleLogin;
    if (mode === 'register') return handleRegister;
    if (mode === 'verify') return handleVerifyRegister;
    if (mode === 'forgot') return handleForgotPassword;
    if (mode === 'reset') return handleResetPassword;
  };

  return (
    <div className="auth-container">
      <h2>{getTitle()}</h2>
      {error && <p className="error-msg">{error}</p>}

      <form onSubmit={getSubmitHandler()} className="auth-form">
        {mode === 'register' && (
          <input type="text" name="username" placeholder="Username" value={username} onChange={onChange} required />
        )}

        {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
          <input
            type="email" name="email" placeholder="Email" value={email} onChange={onChange}
            required disabled={mode === 'verify' || mode === 'reset'}
          />
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <input
            type="password" name="password"
            placeholder={mode === 'reset'? 'New Password' : 'Password'}
            value={password} onChange={onChange} required
          />
        )}

        {(mode === 'register' || mode === 'reset') && (
          <input
            type="password" name="confirmPassword" placeholder="Confirm Password"
            value={confirmPassword} onChange={onChange} required
          />
        )}

        {(mode === 'verify' || mode === 'reset') && (
          <input
            type="text" name="otp" placeholder="6-digit OTP"
            value={otp} onChange={onChange} maxLength="6" required
          />
        )}

        <button type="submit" disabled={submitLoading}>
          {submitLoading? 'Processing...' :
            mode === 'login'? 'Login' :
            mode === 'register'? 'Send OTP' :
            mode === 'verify'? 'Verify & Register' :
            mode === 'forgot'? 'Send Reset OTP' :
            'Reset Password'
          }
        </button>
      </form>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        {mode === 'login' && (
          <>
            <button type="button" className="toggle-auth" onClick={() => setMode('forgot')}>
              Forgot Password?
            </button>
            <button
              type="button" className="toggle-auth register-link"
              onClick={() => { setMode('register'); setError(''); }}
            >
              Need to register?
            </button>
          </>
        )}
        {mode === 'register' && (
          <button
            type="button" className="toggle-auth register-link"
            onClick={() => { setMode('login'); setError(''); }}
          >
            Already have account?
          </button>
        )}
        {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && (
          <button
            type="button" className="toggle-auth"
            onClick={() => { setMode('login'); setError(''); setFormData({...formData, otp: '' }); }}
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default Auth;