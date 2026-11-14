import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminChecking: boolean;
  signInWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  refreshAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(false);

  const checkAdminOnServer = async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) {
      setIsAdmin(false);
      return false;
    }
    setAdminChecking(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/auth/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setIsAdmin(false);
        return false;
      }
      const data = (await res.json()) as { isAdmin?: boolean };
      const allowed = Boolean(data.isAdmin);
      setIsAdmin(allowed);
      return allowed;
    } catch {
      setIsAdmin(false);
      return false;
    } finally {
      setAdminChecking(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      await checkAdminOnServer(nextUser);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    await checkAdminOnServer(result.user);
    return result.user;
  };

  const logout = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const getIdToken = async (forceRefresh = false): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(forceRefresh);
  };

  const refreshAdminStatus = async () => checkAdminOnServer(auth.currentUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        adminChecking,
        signInWithGoogle,
        logout,
        getIdToken,
        refreshAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
