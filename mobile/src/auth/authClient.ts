import { getMe, login, register } from '../api/authApi';
import { clearTokenState, initializeTokens, setTokens } from './tokenManager';
import { LoginRequest, MeResponse, RegisterRequest } from '../types/auth';

export async function initializeAuth(): Promise<boolean> {
  const tokens = await initializeTokens();
  return Boolean(tokens?.accessToken && tokens?.refreshToken);
}

export async function loginAndStore(payload: LoginRequest): Promise<void> {
  const tokens = await login(payload);
  await setTokens(tokens);
}

export async function registerAndStore(payload: RegisterRequest): Promise<void> {
  const tokens = await register(payload);
  await setTokens(tokens);
}

export async function fetchMe(): Promise<MeResponse> {
  return getMe();
}

export async function logout(): Promise<void> {
  await clearTokenState();
}
