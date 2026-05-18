import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import '../assets/styles.css';

const API_URL = import.meta.env.VITE_API_URL;

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setAuthData } = useContext(AuthContext); // Changed: use setAuthData

  const generateOtp = async () => {
    if (!email) {
      setError('Enter email first');
      return;
    }
    
    setOtpLoading(true);
    setError('');
    
    try {
      await axios.post(`${API_URL}/auth/send-otp`, { email });
      alert('OTP sent to your email. Valid for 15 minutes.');
    } catch (err) {
      console.error('OTP Error:', err);
      setError(err.response?.data?.msg || 'Failed to send OTP');
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

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email, password, otp }
        : { name, email, password, otp };

      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      
      // Use response directly - don't call login/register again
      setAuthData(res.data.token, res.data.user); 
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
      }}>
        {isLogin ? 'Need to register?' : 'Already have account?'}
      </button>
    </div>
  );
}

export default Auth;