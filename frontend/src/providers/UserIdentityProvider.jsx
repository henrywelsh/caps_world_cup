import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api';

const UserCtx = createContext(null);

export function UserIdentityProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wc_token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('wc_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(userData) {
    localStorage.setItem('wc_token', userData.token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('wc_token');
    setUser(null);
  }

  return (
    <UserCtx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </UserCtx.Provider>
  );
}

export function useUser() {
  return useContext(UserCtx);
}
