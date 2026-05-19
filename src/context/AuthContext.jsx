import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = 'https://studyplanner-api-awmh.onrender.com/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; 
        try {
          const res = await axios.get(`${API_URL}/auth/user`);
          setUser(res.data);
          setToken(storedToken);
        } catch (err) {
          console.error('Load user failed:', err);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization']; 
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const setAuthData = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`; 
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization']; 
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuthData, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};