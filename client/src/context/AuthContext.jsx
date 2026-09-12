import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import { verifyMfa as verifyMfaRequest } from '../services/auth';
import AuthContext from './auth-context';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    apiRequest('/api/auth/me')
      .then((data) => {
        if (isMounted) setUser(data.user || null);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function login(credentials) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.user) setUser(data.user);
    return data;
  }

  async function verifyMfa(payload) {
    const data = await verifyMfaRequest(payload);
    setUser(data.user || null);
    return data;
  }

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, verifyMfa, logout }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
