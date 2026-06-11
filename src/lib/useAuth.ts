import { useState, useEffect } from 'react';
import { signInWithGoogle, signOutUser, onAuthChange, type User } from '../lib/firebase';

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
    const unsubscribe = onAuthChange((user) => {
      setAuthState({ user, loading: false, error: null });
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await signInWithGoogle();
      setAuthState({ user, loading: false, error: null });
      return user;
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      return null;
    }
  };

  const logout = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signOutUser();
      setAuthState({ user: null, loading: false, error: null });
    } catch (error: any) {
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
