/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import API from '../api/axios'; // Use the same instance

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((userData) => {
    const safeUserData = { ...(userData || {}) };
    delete safeUserData.googleTokens;
    localStorage.setItem('user', JSON.stringify(safeUserData));
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await API.get('/user/me');
      setUser(res.data);
      persistUser(res.data);
      return res.data;
    } catch {
      const res = await API.get('/auth/user');
      setUser(res.data);
      persistUser(res.data);
      return res.data;
    }
  }, [persistUser]);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    persistUser(userData);
  }, [persistUser]);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const userData = await fetchUser();
          console.log('User from API:', userData);
          setToken(storedToken);
        } catch (err) {
          console.error('Load user failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [fetchUser]);

  useEffect(() => {
    const getGoogleAuthOrigin = () => {
      const url = import.meta.env.VITE_API_URL || 'https://studyplanner-api-awmh.onrender.com/api';
      try {
        return new URL(url).origin;
      } catch {
        return 'https://studyplanner-api-awmh.onrender.com';
      }
    };
    const googleAuthOrigin = getGoogleAuthOrigin();

    const handler = async (event) => {
      if (event.origin !== googleAuthOrigin) return;

      if (event.data?.type === 'google-login-success') {
        localStorage.setItem('token', event.data.token);
        setToken(event.data.token);
        window.location.href = '/dashboard';
      }

      if (event.data?.type === 'google-calendar-success') {
        await fetchUser();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchUser]);

  const setAuthData = (token, userData) => {
  const cleanToken = token.trim(); // ADD THIS LINE
  localStorage.setItem('token', cleanToken); // Use cleanToken
  persistUser(userData);
  setToken(cleanToken); // Use cleanToken
  setUser(userData);
};

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuthData, logout, loading, updateUser, fetchUser }}>
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
