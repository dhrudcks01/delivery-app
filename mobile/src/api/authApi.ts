import { httpClient } from './httpClient';
import { AuthTokens, LoginRequest, MeResponse, RefreshTokenRequest } from '../types/auth';

export async function login(payload: LoginRequest): Promise<AuthTokens> {
  const response = await httpClient.post<AuthTokens>('/auth/login', payload);
  return response.data;
}

export async function refresh(payload: RefreshTokenRequest): Promise<AuthTokens> {
  const response = await httpClient.post<AuthTokens>('/auth/refresh', payload);
  return response.data;
}

export async function getMe(): Promise<MeResponse> {
  const response = await httpClient.get<MeResponse>('/me');
  return response.data;
}
