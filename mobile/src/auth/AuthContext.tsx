import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, initializeAuth, loginAndStore, logout } from './authClient';
import { LoginRequest, MeResponse } from '../types/auth';

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  me: MeResponse | null;
  errorMessage: string | null;
};

type AuthContextValue = AuthState & {
  signIn: (payload: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    me: null,
    errorMessage: null,
  });

  const bootstrap = useCallback(async () => {
    try {
      const hasToken = await initializeAuth();
      if (!hasToken) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          me: null,
          errorMessage: null,
        });
        return;
      }

      const me = await fetchMe();
      setState({
        isLoading: false,
        isAuthenticated: true,
        me,
        errorMessage: null,
      });
    } catch {
      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        me: null,
        errorMessage: '인증 정보를 확인할 수 없습니다. 다시 로그인해 주세요.',
      });
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (payload: LoginRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      await loginAndStore(payload);
      const me = await fetchMe();
      setState({
        isLoading: false,
        isAuthenticated: true,
        me,
        errorMessage: null,
      });
    } catch {
      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        me: null,
        errorMessage: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setState({
      isLoading: false,
      isAuthenticated: false,
      me: null,
      errorMessage: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
    }),
    [state, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
