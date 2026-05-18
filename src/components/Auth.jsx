import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { userApi } from '../api/userApi';
import '../assets/Auth.css'; // Use dedicated CSS file, not styles.css

// Password validation: 8+ chars, 1 uppercase, 1 number, 1 special char
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

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setAuthData } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill all fields');
      return;
    }

    // Password criteria check - only for register
    if (!isLogin) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setSubmitLoading(true);

    try {
      const res = isLogin 
        ? await userApi.login({ email, password })
        : await userApi.register({ name, email, password });
      
      setAuthData(res.data.token, res.data.user); 
      navigate('/agenda');
      
    } catch (err) {
      setError(err.response?.data?.msg || 'Error occurred');
    } finally {
      setSubmitLoading(false);
    }
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
          placeholder={isLogin ? 'Password' : 'Password - 8+ chars, 1 upper, 1 number, 1 special'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={submitLoading}>
          {submitLoading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      <button className="toggle-auth" onClick={() => {
        setIsLogin(!isLogin);
        setError('');
      }}>
        {isLogin ? 'Need to register?' : 'Already have account?'}
      </button>
    </div>
  );
}

export default Auth;