import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import emailjs from "@emailjs/browser";
import '../assets/styles.css';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [error, setError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, register } = useContext(AuthContext);

  const generateOtp = async () => {
    if (!email) {
      setError('Enter email first');
      return;
    }
    
    setOtpLoading(true);
    setError('');
    
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
        {
          email: email,
          otp: generatedOtp,
          time: expiryTime,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );

      alert('OTP sent to your email. Valid for 15 minutes.');
    } catch (err) {
      console.error('EmailJS Error:', err);
      setError('Failed to send OTP. Check console for details.');
    }
    setOtpLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    if (!email || !password || (!isLogin && !name) || !otp) {
      setError('Please fill all fields including OTP');
      setSubmitLoading(false);
      return;
    }

    if (!sentOtp || otp !== sentOtp) {
      setError('Invalid OTP');
      setSubmitLoading(false);
      return;
    }

    if (Date.now() > otpExpiry) {
      setError('OTP expired. Generate a new one.');
      setSubmitLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/agenda');
    } catch (err) {
      setError(err.response?.data?.msg || 'Error occurred');
    }
    setSubmitLoading(false);
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      {error && <p className="error-msg">{error}</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        {!isLogin && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password - min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={generateOtp}
            disabled={otpLoading}
            className="btn-secondary"
          >
            {otpLoading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>

        <button type="submit" disabled={submitLoading}>
          {submitLoading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      <button className="toggle-auth" onClick={() => {
        setIsLogin(!isLogin);
        setError('');
        setOtp('');
        setSentOtp('');
      }}>
        {isLogin ? 'Need to register?' : 'Already have account?'}
      </button>
    </div>
  );
}

export default Auth;