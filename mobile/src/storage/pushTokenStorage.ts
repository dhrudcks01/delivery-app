import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushTokenDeviceType, PushTokenProvider } from '../types/notification';

const PUSH_TOKEN_KEY = '@delivery/pushToken/current';

export type StoredPushToken = {
  provider: PushTokenProvider;
  deviceType: PushTokenDeviceType;
  pushToken: string;
};

export async function saveCurrentPushToken(value: StoredPushToken): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify(value));
}

export async function loadCurrentPushToken(): Promise<StoredPushToken | null> {
  const raw = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPushToken>;
    if (!parsed || typeof parsed.pushToken !== 'string' || parsed.pushToken.trim().length === 0) {
      return null;
    }

    const provider = parsed.provider === 'EXPO' ? 'EXPO' : null;
    const deviceType = parsed.deviceType === 'IOS' || parsed.deviceType === 'ANDROID'
      ? parsed.deviceType
      : null;
    if (!provider || !deviceType) {
      return null;
    }

    return {
      provider,
      deviceType,
      pushToken: parsed.pushToken,
    };
  } catch {
    return null;
  }
}

export async function clearCurrentPushToken(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}
