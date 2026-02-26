import { httpClient } from './httpClient';
import {
  AuthTokens,
  LoginRequest,
  MeResponse,
  PhoneVerificationCompleteRequest,
  PhoneVerificationCompleteResponse,
  PhoneVerificationStartResponse,
  RefreshTokenRequest,
  RegisterRequest,
} from '../types/auth';

export async function login(payload: LoginRequest): Promise<AuthTokens> {
  const response = await httpClient.post<AuthTokens>('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterRequest): Promise<AuthTokens> {
  const response = await httpClient.post<AuthTokens>('/auth/register', payload);
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

export async function startPhoneVerification(): Promise<PhoneVerificationStartResponse> {
  const response = await httpClient.post<PhoneVerificationStartResponse>('/user/phone-verifications/start');
  return response.data;
}

export async function completePhoneVerification(
  payload: PhoneVerificationCompleteRequest,
): Promise<PhoneVerificationCompleteResponse> {
  const response = await httpClient.post<PhoneVerificationCompleteResponse>('/user/phone-verifications/complete', payload);
  return response.data;
}
