import { useState, useEffect } from 'react';
import { signInWithGoogle, signOutUser, onAuthChange, checkRedirectResult, type User } from '../lib/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    checkRedirectResult().then((user) => {
      if (user) {
        setAuthState({ user, loading: false, error: null });
      }
    });

    const unsubscribe = onAuthChange((user) => {
      setAuthState({ user, loading: false, error: null });
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await signInWithGoogle();
      setAuthState(prev => ({ ...prev, user: user || prev.user, loading: false, error: null }));
      return user;
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthState(prev => ({ ...prev, loading: false, error: error.message || 'Login failed' }));
      return null;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signOutUser();
      setAuthState({ user: null, loading: false, error: null });
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    isAuthenticated: !!authState.user,
  };
};
