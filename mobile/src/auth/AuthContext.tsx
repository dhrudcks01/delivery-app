import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  completePhoneVerification as completePhoneVerificationApi,
  startPhoneVerification as startPhoneVerificationApi,
} from '../api/authApi';
import { fetchMe, initializeAuth, loginAndStore, logout, registerAndStore } from './authClient';
import { deactivatePushTokenForCurrentDevice, registerPushTokenForCurrentDevice } from '../notifications/pushNotificationService';
import { LoginRequest, MeResponse, PhoneVerificationStartResponse, RegisterRequest } from '../types/auth';
import { PushRegistrationState } from '../types/notification';

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  phoneVerificationRequired: boolean;
  me: MeResponse | null;
  errorMessage: string | null;
  pushRegistration: PushRegistrationState;
};

type AuthContextValue = AuthState & {
  signIn: (payload: LoginRequest) => Promise<void>;
  signUp: (payload: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPushRegistration: () => Promise<void>;
  startPhoneVerification: () => Promise<PhoneVerificationStartResponse>;
  completePhoneVerification: (identityVerificationId: string) => Promise<void>;
};

type ApiErrorResponse = {
  code?: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOGIN_FAILED_MESSAGE = '로그인에 실패했습니다. 아이디/비밀번호를 확인해 주세요.';
const SIGNUP_FAILED_MESSAGE = '회원가입에 실패했습니다. 입력값을 확인해 주세요.';
const AUTH_CHECK_FAILED_MESSAGE = '인증 세션 확인에 실패했습니다. 다시 로그인해 주세요.';
const DEFAULT_PUSH_REGISTRATION_STATE: PushRegistrationState = {
  status: 'idle',
  message: '푸시 알림 설정을 확인해 주세요.',
  pushToken: null,
};

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
    pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
  });

  const refreshPushRegistration = useCallback(async () => {
    const nextState = await registerPushTokenForCurrentDevice();
    setState((prev) => ({
      ...prev,
      pushRegistration: nextState,
    }));
  }, []);

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
          pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
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
        pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
      });
      void refreshPushRegistration();
    } catch (error) {
      if (isPhoneVerificationRequiredError(error)) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          phoneVerificationRequired: true,
          me: null,
          errorMessage: null,
          pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
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
        pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
      });
    }
  }, [refreshPushRegistration]);

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
          pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
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
        pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
      });
      void refreshPushRegistration();
    } catch (error) {
      let loginErrorMessage = LOGIN_FAILED_MESSAGE;
      const errorCode = getApiErrorCode(error);
      if (errorCode === 'LOGIN_IDENTIFIER_NOT_FOUND') {
        loginErrorMessage = '존재하지 않는 아이디입니다.';
      } else if (errorCode === 'LOGIN_PASSWORD_MISMATCH') {
        loginErrorMessage = '비밀번호가 일치하지 않습니다.';
      }

      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        phoneVerificationRequired: false,
        me: null,
        errorMessage: loginErrorMessage,
        pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
      });
    }
  }, [refreshPushRegistration]);

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
          pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
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
        pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
      });
      void refreshPushRegistration();
    } catch {
      await logout();
      setState({
        isLoading: false,
        isAuthenticated: false,
        phoneVerificationRequired: false,
        me: null,
        errorMessage: SIGNUP_FAILED_MESSAGE,
        pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
      });
    }
  }, [refreshPushRegistration]);

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
      void refreshPushRegistration();
    } catch {
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        phoneVerificationRequired: false,
        errorMessage: null,
      }));
      void refreshPushRegistration();
    }
  }, [refreshPushRegistration]);

  const signOut = useCallback(async () => {
    try {
      await deactivatePushTokenForCurrentDevice();
    } catch {
      // Ignore push token deactivation failure during logout.
    }
    await logout();
    setState({
      isLoading: false,
      isAuthenticated: false,
      phoneVerificationRequired: false,
      me: null,
      errorMessage: null,
      pushRegistration: DEFAULT_PUSH_REGISTRATION_STATE,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      refreshPushRegistration,
      startPhoneVerification,
      completePhoneVerification,
    }),
    [state, signIn, signUp, signOut, refreshPushRegistration, startPhoneVerification, completePhoneVerification],
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
