import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  completePhoneVerification as completePhoneVerificationApi,
  startPhoneVerification as startPhoneVerificationApi,
} from '../api/authApi';
import { fetchMe, initializeAuth, loginAndStore, logout, registerAndStore } from './authClient';
import { LoginRequest, MeResponse, PhoneVerificationStartResponse, RegisterRequest } from '../types/auth';

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  phoneVerificationRequired: boolean;
  me: MeResponse | null;
  errorMessage: string | null;
};

type AuthContextValue = AuthState & {
  signIn: (payload: LoginRequest) => Promise<void>;
  signUp: (payload: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
  startPhoneVerification: () => Promise<PhoneVerificationStartResponse>;
  completePhoneVerification: (identityVerificationId: string) => Promise<void>;
};

type ApiErrorResponse = {
  code?: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOGIN_FAILED_MESSAGE = 'Login failed. Please check your credentials.';
const SIGNUP_FAILED_MESSAGE = 'Signup failed. Please check your input.';
const AUTH_CHECK_FAILED_MESSAGE = 'Unable to validate auth session. Please login again.';

function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const code = (error.response?.data as ApiErrorResponse | undefined)?.code;
  return typeof code === 'string' ? code : null;
}

function isPhoneVerificationRequiredError(error: unknown): boolean {
  return getApiErrorCode(error) === 'PHONE_VERIFICATION_REQUIRED';
}

function resolvePhoneVerificationRequired(me: MeResponse): boolean {
  return !Boolean(me.phoneVerifiedAt);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    phoneVerificationRequired: false,
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
          phoneVerificationRequired: false,
          me: null,
          errorMessage: null,
        });
        return;
      }

      const me = await fetchMe();
      setState({
        isLoading: false,
        isAuthenticated: true,
        phoneVerificationRequired: resolvePhoneVerificationRequired(me),
        me,
        errorMessage: null,
      });
    } catch (error) {
      if (isPhoneVerificationRequiredError(error)) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          phoneVerificationRequired: true,
          me: null,
          errorMessage: null,
        });
        return;
      }

      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        phoneVerificationRequired: false,
        me: null,
        errorMessage: AUTH_CHECK_FAILED_MESSAGE,
      });
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = useCallback(async (payload: LoginRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      const tokens = await loginAndStore(payload);
      if (tokens.phoneVerificationRequired) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          phoneVerificationRequired: true,
          me: null,
          errorMessage: null,
        });
        return;
      }

      const me = await fetchMe();
      setState({
        isLoading: false,
        isAuthenticated: true,
        phoneVerificationRequired: resolvePhoneVerificationRequired(me),
        me,
        errorMessage: null,
      });
    } catch (error) {
      let loginErrorMessage = LOGIN_FAILED_MESSAGE;
      const errorCode = getApiErrorCode(error);
      if (errorCode === 'LOGIN_IDENTIFIER_NOT_FOUND') {
        loginErrorMessage = 'Identifier not found.';
      } else if (errorCode === 'LOGIN_PASSWORD_MISMATCH') {
        loginErrorMessage = 'Password does not match.';
      }

      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        phoneVerificationRequired: false,
        me: null,
        errorMessage: loginErrorMessage,
      });
    }
  }, []);

  const signUp = useCallback(async (payload: RegisterRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      const tokens = await registerAndStore(payload);
      if (tokens.phoneVerificationRequired) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          phoneVerificationRequired: true,
          me: null,
          errorMessage: null,
        });
        return;
      }

      const me = await fetchMe();
      setState({
        isLoading: false,
        isAuthenticated: true,
        phoneVerificationRequired: resolvePhoneVerificationRequired(me),
        me,
        errorMessage: null,
      });
    } catch {
      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        phoneVerificationRequired: false,
        me: null,
        errorMessage: SIGNUP_FAILED_MESSAGE,
      });
    }
  }, []);

  const startPhoneVerification = useCallback(async () => {
    return startPhoneVerificationApi();
  }, []);

  const completePhoneVerification = useCallback(async (identityVerificationId: string) => {
    await completePhoneVerificationApi({ identityVerificationId });

    try {
      const me = await fetchMe();
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        phoneVerificationRequired: false,
        me,
        errorMessage: null,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        phoneVerificationRequired: false,
        errorMessage: null,
      }));
    }
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setState({
      isLoading: false,
      isAuthenticated: false,
      phoneVerificationRequired: false,
      me: null,
      errorMessage: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      startPhoneVerification,
      completePhoneVerification,
    }),
    [state, signIn, signUp, signOut, startPhoneVerification, completePhoneVerification],
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
