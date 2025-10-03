import React, { createContext, useContext, useEffect, useState } from 'react';
import { clientPortalAPI } from '../utils/api';
import toast from 'react-hot-toast';

const ClientAuthContext = createContext();

export const useClientAuth = () => {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error('useClientAuth must be used within ClientAuthProvider');
  return ctx;
};

export const ClientAuthProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('client_token'));

  useEffect(() => {
    const stored = localStorage.getItem('client_profile');
    if (token && stored) {
      try { setClient(JSON.parse(stored)); } catch { logout(); }
    }
    setLoading(false);
  }, [token]);

  const login = async (credentials) => {
    try {
      const res = await clientPortalAPI.login(credentials);
      const { token: t, client: c } = res.data;
      localStorage.setItem('client_token', t);
      localStorage.setItem('client_profile', JSON.stringify(c));
      setToken(t);
      setClient(c);
      toast.success('Logged in');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_profile');
    setToken(null);
    setClient(null);
  };

  const value = { client, token, loading, isAuthenticated: !!token && !!client, login, logout };
  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
};
