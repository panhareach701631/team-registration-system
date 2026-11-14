import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './contexts';
import { db } from '../services/db';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function verifyAuth() {
      try {
        const authed = await db.checkAdminAuth();
        if (active) setIsAuthenticated(authed);
      } catch (err) {
        console.error('Auth verification error:', err);
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    verifyAuth();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (accessCode) => {
    const res = await db.verifyAdminCode(accessCode);
    if (res.success) {
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: res.error || 'Invalid access code' };
  }, []);

  const logout = useCallback(async () => {
    await db.logoutAdmin();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
