import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/userApi';
import API from '../api/axios';
import '../assets/Auth.css';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const VAPID_PUBLIC_KEY = 'BOHFuuYR-Esh5cxDIUQKh_Vqmvx5xMo70osWEiEZKmbJGQvKegSio0oGQMUbZuAypHhkp6JcZ5HlBu0A2sShFgs';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const { name, email, password } = formData;

  const onChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value });
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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await API.post('/auth/send-otp', { name, email, password });
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to send OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      const res = await API.post('/auth/verify-otp', { email, otp });
      const payload = res.data.data || res.data;
      const token = payload.token;
      const user = payload.user;

      if (!token || !user) throw new Error('Invalid response');

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
      const res = await userApi.login({ email, password });
      const payload = res.data.data || res.data;
      const token = payload.token;
      const user = payload.user;

      if (!token || !user) throw new Error('Invalid response from server');

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

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : step === 'otp' ? 'Verify OTP' : 'Register'}</h2>
      {error && <p className="error-msg">{error}</p>}
      
      {isLogin ? (
        <form onSubmit={handleLogin} className="auth-form">
          <input type="email" name="email" placeholder="Email" value={email} onChange={onChange} required />
          <input type="password" name="password" placeholder="Password" value={password} onChange={onChange} required />
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Processing...' : 'Login'}
          </button>
        </form>
      ) : step === 'form' ? (
        <form onSubmit={handleSendOTP} className="auth-form">
          <input type="text" name="name" placeholder="Name" value={name} onChange={onChange} required />
          <input type="email" name="email" placeholder="Email" value={email} onChange={onChange} required />
          <input type="password" name="password" placeholder="Password - 8+ chars, 1 upper, 1 number, 1 special" value={password} onChange={onChange} required />
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="auth-form">
          <p>Enter OTP sent to {email}</p>
          <input 
            type="text" 
            placeholder="6-digit OTP" 
            value={otp} 
            onChange={(e) => setOtp(e.target.value)} 
            maxLength="6"
            required 
          />
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Verifying...' : 'Verify & Register'}
          </button>
          <button 
            type="button" 
            className="toggle-auth" 
            onClick={() => setStep('form')}
          >
            Back
          </button>
        </form>
      )}

      <button 
        type="button"
        className="toggle-auth register-link" 
        onClick={() => { 
          setIsLogin(!isLogin); 
          setStep('form');
          setError(''); 
          setOtp('');
        }}
      >
        {isLogin ? 'Need to register?' : 'Already have account?'}
      </button>
    </div>
  );
}

export default Auth;