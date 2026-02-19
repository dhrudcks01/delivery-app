import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './config';
import { clearTokenState, getTokens, setTokens } from '../auth/tokenManager';
import { AuthTokens } from '../types/auth';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

const rawClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    return config;
  }

  const headers = new AxiosHeaders(config.headers);
  headers.set('Authorization', `${tokens.tokenType} ${tokens.accessToken}`);
  config.headers = headers;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';
    const isNoRetryPath = NO_RETRY_PATHS.some((path) => requestUrl.includes(path));

    if (!originalRequest || status !== 401 || originalRequest._retry || isNoRetryPath) {
      return Promise.reject(error);
    }

    const tokens = getTokens();
    if (!tokens?.refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await rawClient.post<AuthTokens>('/auth/refresh', {
        refreshToken: tokens.refreshToken,
      });
      await setTokens(refreshResponse.data);

      const headers = new AxiosHeaders(originalRequest.headers);
      headers.set(
        'Authorization',
        `${refreshResponse.data.tokenType} ${refreshResponse.data.accessToken}`,
      );
      originalRequest.headers = headers;

      return httpClient(originalRequest);
    } catch (refreshError) {
      await clearTokenState();
      return Promise.reject(refreshError);
    }
  },
);
