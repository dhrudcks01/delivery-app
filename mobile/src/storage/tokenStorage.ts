import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '../types/auth';

const ACCESS_TOKEN_KEY = '@delivery/access-token';
const REFRESH_TOKEN_KEY = '@delivery/refresh-token';
const TOKEN_TYPE_KEY = '@delivery/token-type';

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, tokens.accessToken],
    [REFRESH_TOKEN_KEY, tokens.refreshToken],
    [TOKEN_TYPE_KEY, tokens.tokenType],
  ]);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const entries = await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_TYPE_KEY]);
  const map = new Map(entries);
  const accessToken = map.get(ACCESS_TOKEN_KEY);
  const refreshToken = map.get(REFRESH_TOKEN_KEY);
  const tokenType = map.get(TOKEN_TYPE_KEY);

  if (!accessToken || !refreshToken || !tokenType) {
    return null;
  }

  return {
    tokenType,
    accessToken,
    accessTokenExpiresIn: 0,
    refreshToken,
    refreshTokenExpiresIn: 0,
  };
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_TYPE_KEY]);
}
