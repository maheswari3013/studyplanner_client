import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { validatePassword, getPasswordError } from '../utils/validatePassword';
import { BarChart3, BrainCircuit, CalendarDays, KeyRound, LockKeyhole, Mail, Moon, Palette, Sun, UserRound } from 'lucide-react';

const VAPID_PUBLIC_KEY = 'BOHFuuYR-Esh5cxDIUQKh_Vqmvx5xMo70osWEiEZKmbJGQvKegSio0oGQMUbZuAypHhkp6JcZ5HlBu0A2sShFgs';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem('auth-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const Auth = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'verify' | 'forgot' | 'reset'
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '', otp: '' });
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const { setAuthData, fetchUser } = useAuth();
  const navigate = useNavigate();

  const { username, email, password, confirmPassword, otp } = formData;
  const isDark = theme === 'dark';

  useEffect(() => {
    window.localStorage.setItem('auth-theme', theme);
  }, [theme]);

  useEffect(() => {
    const getApiOrigin = () => {
      const url = import.meta.env.VITE_API_URL || 'https://studyplanner-api-awmh.onrender.com/api';
      try {
        return new URL(url).origin;
      } catch {
        return 'https://studyplanner-api-awmh.onrender.com';
      }
    };
    const apiOrigin = getApiOrigin();

    const handler = async (event) => {
      if (event.origin !== apiOrigin) return;

      if (event.data?.type === 'google-login-success') {
        localStorage.setItem('token', event.data.token);
        if (event.data.user) {
          setAuthData(event.data.token, event.data.user);
        } else {
          await fetchUser?.();
        }
        window.location.href = '/dashboard';
      }

      if (event.data?.type === 'google-calendar-success') {
        toast.success('Google Calendar connected');
        await fetchUser?.();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchUser, navigate, setAuthData]);

  const handleGoogleLogin = () => {
    const getApiOrigin = () => {
      const url = import.meta.env.VITE_API_URL || 'https://studyplanner-api-awmh.onrender.com/api';
      try {
        return new URL(url).origin;
      } catch {
        return 'https://studyplanner-api-awmh.onrender.com';
      }
    };
    const apiOrigin = getApiOrigin();
    const clientOrigin = window.location.origin;
    window.open(`${apiOrigin}/api/auth/google/login?origin=${encodeURIComponent(clientOrigin)}`, '_blank', 'width=500,height=600');
  };

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

  const handleResendRegisterOtp = async () => {
    setResendLoading(true);
    try {
      const res = await API.post('/auth/register', { username, email, password });
      if (res.data.devMode && res.data.otp) {
        setFormData({...formData, otp: res.data.otp });
        toast.success(`OTP: ${res.data.otp}`, { duration: 8000 });
      } else {
        toast.success(res.data.msg || 'OTP resent');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to resend');
    }
    setResendLoading(false);
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

  const handleResendResetOtp = async () => {
    setResendLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email });
      if (res.data.devMode && res.data.otp) {
        setFormData({...formData, otp: res.data.otp });
        toast.success(`OTP: ${res.data.otp}`, { duration: 8000 });
      } else {
        toast.success(res.data.msg || 'OTP resent');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to resend');
    }
    setResendLoading(false);
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
    if (mode === 'login') return 'Plan your exams.\nNever miss a revision.';
    if (mode === 'register') return 'Create your account.';
    if (mode === 'verify') return 'Verify your email.';
    if (mode === 'forgot') return 'Reset access.';
    if (mode === 'reset') return 'Choose a new password.';
  };

  const getSubtitle = () => {
    if (mode === 'login') return 'Add your exam dates and let the planner build a smart revision schedule using spaced repetition - so you study the right things at the right time.';
    if (mode === 'register') return 'Start planning focused study days with a calm workspace.';
    if (mode === 'verify') return 'Enter the one-time code sent to your email address.';
    if (mode === 'forgot') return 'We will send a secure reset code to your inbox.';
    if (mode === 'reset') return 'Use your reset code and create a stronger password.';
  };

  const getSubmitHandler = () => {
    if (mode === 'login') return handleLogin;
    if (mode === 'register') return handleRegister;
    if (mode === 'verify') return handleVerifyRegister;
    if (mode === 'forgot') return handleForgotPassword;
    if (mode === 'reset') return handleResetPassword;
  };

  const featureCards = [
    { title: 'Timetable view', text: 'See all exams laid out by month', icon: CalendarDays },
    { title: 'Smart revision', text: 'Auto-generated spaced sessions', icon: BrainCircuit },
    { title: 'Subject tracking', text: 'Color-coded by subject', icon: Palette },
    { title: 'Progress stats', text: "Track what's coming up", icon: BarChart3 }
  ];

  const themeClasses = {
    section: isDark
      ? 'bg-[#0F1115] text-[#F5F5F2]'
      : 'bg-white text-stone-950',
    glowPrimary: isDark
      ? 'bg-[#6E8A73]/10'
      : 'hidden',
    glowSecondary: isDark
      ? 'bg-[#161A20]'
      : 'hidden',
    toggleTrack: isDark
      ? 'border-white/[0.08] bg-white/[0.04] shadow-[0_14px_34px_rgba(0,0,0,0.26)]'
      : 'border-stone-200 bg-white shadow-[0_10px_28px_rgba(28,25,23,0.08)]',
    toggleThumb: isDark
      ? 'translate-x-8 bg-[#1A1F27] text-[#F5F5F2] shadow-[0_8px_18px_rgba(0,0,0,0.32)]'
      : 'translate-x-0 bg-stone-950 text-white shadow-[0_8px_18px_rgba(28,25,23,0.18)]',
    toggleIconMuted: isDark ? 'text-white/38' : 'text-stone-400',
    badge: isDark
      ? 'border-white/[0.08] bg-white/[0.03] text-[#6E8A73]'
      : 'border-[#556B58]/15 bg-[#556B58]/5 text-[#556B58]',
    heading: isDark ? 'text-[#F5F5F2]' : 'text-stone-950',
    body: isDark ? 'text-white/65' : 'text-stone-500',
    card: isDark
      ? 'border-white/[0.08] bg-[#1A1F27]/88 shadow-[0_24px_70px_rgba(0,0,0,0.34)]'
      : 'border-stone-200/80 bg-white shadow-[0_20px_60px_rgba(28,25,23,0.08)]',
    error: isDark
      ? 'border-red-400/15 bg-red-500/10 text-red-200'
      : 'border-red-100 bg-red-50 text-red-600',
    resend: isDark
      ? 'border-white/[0.08] bg-white/[0.03] text-[#6E8A73] hover:bg-white/[0.06] focus:ring-[#6E8A73]/10'
      : 'border-[#556B58]/20 bg-[#556B58]/5 text-[#556B58] hover:bg-[#556B58]/10 focus:ring-[#556B58]/10',
    submit: isDark
      ? 'bg-[#6E8A73] text-white shadow-[0_14px_28px_rgba(0,0,0,0.28)] hover:bg-[#78977e] hover:shadow-[0_18px_34px_rgba(0,0,0,0.34)] focus:ring-[#6E8A73]/18'
      : 'bg-[#556B58] text-white shadow-[0_12px_24px_rgba(85,107,88,0.18)] hover:bg-[#4b604e] hover:shadow-[0_16px_32px_rgba(85,107,88,0.22)] focus:ring-[#556B58]/15',
    mutedButton: isDark
      ? 'border-white/[0.08] bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-[#F5F5F2] focus:ring-white/[0.05]'
      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-950 focus:ring-stone-100',
    accentButton: isDark
      ? 'border-[#6E8A73]/30 bg-[#6E8A73] text-white shadow-[0_10px_22px_rgba(0,0,0,0.22)] hover:bg-[#78977e] focus:ring-[#6E8A73]/14'
      : 'border-[#556B58]/20 bg-[#556B58]/5 text-[#556B58] hover:bg-[#556B58]/10 focus:ring-[#556B58]/10',
    featureCard: isDark
      ? 'border-white/[0.08] bg-[#1A1F27]/86 shadow-[0_16px_38px_rgba(0,0,0,0.22)] hover:bg-[#1D232C] hover:shadow-[0_22px_48px_rgba(0,0,0,0.28)]'
      : 'border-stone-200 bg-white shadow-[0_10px_30px_rgba(28,25,23,0.04)] hover:shadow-[0_18px_40px_rgba(28,25,23,0.08)]',
    featureIcon: isDark ? 'bg-[#6E8A73]/12 text-[#6E8A73]' : 'bg-[#556B58]/8 text-[#556B58]',
    featureTitle: isDark ? 'text-[#F5F5F2]' : 'text-stone-950',
    featureText: isDark ? 'text-white/55' : 'text-stone-500'
  };

  const inputBaseClass = isDark
    ? 'w-full rounded-xl border border-white/[0.08] bg-[#161A20]/85 px-4 py-4 text-[15px] font-medium text-[#F5F5F2] shadow-[0_1px_0_rgba(255,255,255,0.03)] outline-none transition duration-300 placeholder:text-white/35 focus:border-[#6E8A73] focus:bg-[#1A1F27] focus:shadow-[0_0_0_4px_rgba(110,138,115,0.13)] disabled:cursor-not-allowed disabled:bg-[#161A20] disabled:text-white/40'
    : 'w-full rounded-xl border border-stone-200 bg-white px-4 py-4 text-[15px] font-medium text-stone-900 shadow-[0_1px_0_rgba(28,25,23,0.03)] outline-none transition duration-300 placeholder:text-stone-400 focus:border-[#556B58] focus:shadow-[0_0_0_4px_rgba(85,107,88,0.12)] disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500';
  const iconClass = `pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition duration-300 ${isDark ? 'text-white/35 peer-focus:text-[#6E8A73]' : 'text-stone-400 peer-focus:text-[#556B58]'}`;
  const inputWithIconClass = `${inputBaseClass} pl-11`;

  return (
    <section className={`relative flex min-h-[calc(100vh-40px)] w-full items-center justify-center overflow-hidden px-4 py-14 font-sans transition-colors duration-500 sm:px-6 lg:px-8 ${themeClasses.section}`}>
      <div className={`pointer-events-none absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl transition-colors duration-500 ${themeClasses.glowPrimary}`} />
      <div className={`pointer-events-none absolute bottom-32 right-24 h-96 w-96 rounded-full blur-3xl transition-colors duration-500 ${themeClasses.glowSecondary}`} />

      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`absolute right-4 top-4 z-20 flex h-10 w-18 items-center justify-between rounded-full border px-2 transition duration-500 sm:right-6 sm:top-6 ${themeClasses.toggleTrack}`}
      >
        <Sun size={14} className={`transition duration-300 ${isDark ? themeClasses.toggleIconMuted : 'text-white'}`} />
        <Moon size={14} className={`transition duration-300 ${isDark ? 'text-[#F5F5F2]' : themeClasses.toggleIconMuted}`} />
        <span className={`absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-sm transition duration-500 ease-out ${themeClasses.toggleThumb}`}>
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </span>
      </button>

      <div className="auth-fade-in relative z-10 mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className={`mx-auto mb-7 inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] transition duration-500 ${themeClasses.badge}`}>
            SMART REVISION SCHEDULING
          </div>
          <h1 className={`whitespace-pre-line font-['Cormorant_Garamond',Georgia,serif] text-[3.5rem] font-semibold leading-[0.92] tracking-normal transition-colors duration-500 sm:text-[5.75rem] lg:text-[6.5rem] ${themeClasses.heading}`}>
            {getTitle()}
          </h1>
          <p className={`mx-auto mt-7 max-w-2xl text-base leading-8 transition-colors duration-500 sm:text-lg ${themeClasses.body}`}>
            {getSubtitle()}
          </p>
        </div>

        <div className={`mx-auto mt-10 w-full max-w-md rounded-[1.75rem] border p-5 backdrop-blur transition duration-500 sm:p-6 ${themeClasses.card}`}>
          {error && (
            <p className={`mb-5 rounded-xl border px-4 py-3 text-center text-sm font-semibold transition duration-500 ${themeClasses.error}`}>
              {error}
            </p>
          )}

          <form onSubmit={getSubmitHandler()} className="space-y-4">
        {mode === 'register' && (
          <label className="relative block">
            <span className="sr-only">Username</span>
            <input className={`peer ${inputWithIconClass}`} type="text" name="username" placeholder="Username" value={username} onChange={onChange} required />
            <UserRound className={iconClass} size={16} />
          </label>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
          <label className="relative block">
            <span className="sr-only">Email</span>
            <input
              className={`peer ${inputWithIconClass}`}
              type="email" name="email" placeholder="Email address" value={email} onChange={onChange}
              required disabled={mode === 'verify' || mode === 'reset'}
            />
            <Mail className={iconClass} size={16} />
          </label>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <label className="relative block">
            <span className="sr-only">{mode === 'reset'? 'New Password' : 'Password'}</span>
            <input
              className={`peer ${inputWithIconClass}`}
              type="password" name="password"
              placeholder={mode === 'reset'? 'New password' : 'Password'}
              value={password} onChange={onChange} required
            />
            <LockKeyhole className={iconClass} size={16} />
          </label>
        )}

        {(mode === 'register' || mode === 'reset') && (
          <label className="relative block">
            <span className="sr-only">Confirm Password</span>
            <input
              className={`peer ${inputWithIconClass}`}
              type="password" name="confirmPassword" placeholder="Confirm password"
              value={confirmPassword} onChange={onChange} required
            />
            <LockKeyhole className={iconClass} size={16} />
          </label>
        )}

 {(mode === 'verify' || mode === 'reset') && (
  <>
    <label className="relative block">
      <span className="sr-only">6-digit OTP</span>
      <input
        className={`peer ${inputWithIconClass}`}
        type="text" 
        name="otp" 
        placeholder="6-digit OTP"
        value={otp} 
        onChange={onChange} 
        maxLength="6" 
        required
      />
      <KeyRound className={iconClass} size={16} />
    </label>
    <button 
      type="button" 
      onClick={mode === 'verify'? handleResendRegisterOtp : handleResendResetOtp}
      disabled={resendLoading}
      className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${themeClasses.resend}`}
    >
      {resendLoading? 'Sending...' : 'Resend OTP'}
    </button>
  </>
)}

        <button
          type="submit"
          disabled={submitLoading}
          className={`mt-2 w-full rounded-xl px-5 py-4 text-[15px] font-semibold transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:scale-100 ${themeClasses.submit}`}
        >
          {submitLoading? 'Processing...' :
            mode === 'login'? 'Sign in' :
            mode === 'register'? 'Send OTP' :
            mode === 'verify'? 'Verify & Register' :
            mode === 'forgot'? 'Send Reset OTP' :
            'Reset Password'
          }
        </button>
      </form>

      {mode === 'login' && (
        <button
          type="button"
          onClick={handleGoogleLogin}
          className={`mt-3 flex w-full items-center justify-center gap-3 rounded-xl border px-5 py-4 text-[15px] font-semibold transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-4 ${themeClasses.mutedButton}`}
        >
          <img src="/google-icon.svg" alt="" className="h-5 w-5" />
          Sign in with Google
        </button>
      )}

      <div className="mt-5 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
        {mode === 'login' && (
          <>
            <button type="button" className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-4 ${themeClasses.mutedButton}`} onClick={() => setMode('forgot')}>
              Forgot Password?
            </button>
            <button
              type="button" className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-4 ${themeClasses.accentButton}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Get started free
            </button>
          </>
        )}
        {mode === 'register' && (
          <button
            type="button" className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-4 ${themeClasses.mutedButton}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Sign in
          </button>
        )}
        {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && (
          <button
            type="button" className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-4 ${themeClasses.mutedButton}`}
            onClick={() => { setMode('login'); setError(''); setFormData({...formData, otp: '' }); }}
          >
            Sign in
          </button>
        )}
      </div>
        </div>

        <div className="mx-auto mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map(({ title, text, icon: Icon }) => (
            <div
              key={title}
              className={`rounded-2xl border p-5 text-left transition duration-300 hover:-translate-y-1 ${themeClasses.featureCard}`}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition duration-300 ${themeClasses.featureIcon}`}>
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <h3 className={`text-[15px] font-semibold transition-colors duration-300 ${themeClasses.featureTitle}`}>{title}</h3>
              <p className={`mt-2 text-sm leading-6 transition-colors duration-300 ${themeClasses.featureText}`}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Auth;
