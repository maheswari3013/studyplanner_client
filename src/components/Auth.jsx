import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/userApi';
import '../assets/Auth.css';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const { setAuthData } = useAuth(); 
  const navigate = useNavigate();

  const { name, email, password } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    
    try {
      const res = isLogin
        ? await userApi.login({ email, password })
        : await userApi.register({ name, email, password });

      console.log('Login response:', res.data); // Should show {token: '...', user: {...}}
      
      // This one line handles localStorage + axios headers + context state
      setAuthData(res.data.token, res.data.user); 
      
      navigate('/agenda');

    } catch (err) {
      console.error('Auth error:', err.response);
      setError(err.response?.data?.msg || 'Something went wrong');
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
      name="name" // ADDED
      placeholder="Name"
      value={name}
      onChange={onChange} // CHANGED: was setName
      required
    />
  )}
  <input
    type="email"
    name="email" // ADDED - this fixes email
    placeholder="Email"
    value={email}
    onChange={onChange}
    required
  />
  <input
    type="password"
    name="password" // ADDED
    placeholder={isLogin? 'Password' : 'Password - 8+ chars, 1 upper, 1 number, 1 special'}
    value={password}
    onChange={onChange} // CHANGED: was setPassword
    required
  />

  <button type="submit" disabled={submitLoading}>
    {submitLoading? 'Processing...' : isLogin? 'Login' : 'Register'}
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