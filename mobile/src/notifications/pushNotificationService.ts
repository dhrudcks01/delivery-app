import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { deactivatePushToken, registerPushToken } from '../api/pushTokenApi';
import { clearCurrentPushToken, loadCurrentPushToken, saveCurrentPushToken } from '../storage/pushTokenStorage';
import { PushRegistrationState, PushTokenDeviceType } from '../types/notification';

const UNSUPPORTED_STATE: PushRegistrationState = {
  status: 'unsupported',
  message: '현재 기기에서는 푸시 알림을 사용할 수 없습니다.',
  pushToken: null,
};

const PERMISSION_DENIED_STATE: PushRegistrationState = {
  status: 'permission_denied',
  message: '알림 권한이 거부되어 푸시 알림이 비활성화되었습니다.',
  pushToken: null,
};

function resolveDeviceType(): PushTokenDeviceType | null {
  if (Platform.OS === 'ios') {
    return 'IOS';
  }
  if (Platform.OS === 'android') {
    return 'ANDROID';
  }
  return null;
}

function resolveProjectId(): string | undefined {
  const easConfig = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig;
  const expoExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas;
  const projectId = easConfig?.projectId ?? expoExtra?.projectId;
  return typeof projectId === 'string' && projectId.trim().length > 0 ? projectId : undefined;
}

export async function registerPushTokenForCurrentDevice(): Promise<PushRegistrationState> {
  const deviceType = resolveDeviceType();
  if (!deviceType) {
    await clearCurrentPushToken();
    return UNSUPPORTED_STATE;
  }

  if (Constants.isDevice === false) {
    await clearCurrentPushToken();
    return {
      status: 'unsupported',
      message: '푸시 토큰 발급은 실제 iOS/Android 기기에서만 지원됩니다.',
      pushToken: null,
    };
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (permission.status !== 'granted') {
    await clearCurrentPushToken();
    return PERMISSION_DENIED_STATE;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let expoPushToken: string;
  try {
    const projectId = resolveProjectId();
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    expoPushToken = tokenResult.data;
    if (!expoPushToken || expoPushToken.trim().length === 0) {
      throw new Error('빈 푸시 토큰');
    }
  } catch {
    await clearCurrentPushToken();
    return {
      status: 'token_failed',
      message: '푸시 토큰 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      pushToken: null,
    };
  }

  try {
    await registerPushToken({
      deviceType,
      provider: 'EXPO',
      pushToken: expoPushToken,
    });
    await saveCurrentPushToken({
      deviceType,
      provider: 'EXPO',
      pushToken: expoPushToken,
    });
    return {
      status: 'registered',
      message: '푸시 알림이 활성화되었습니다.',
      pushToken: expoPushToken,
    };
  } catch {
    return {
      status: 'api_failed',
      message: '푸시 토큰 서버 등록에 실패했습니다. 네트워크 상태를 확인해 주세요.',
      pushToken: expoPushToken,
    };
  }
}

export async function deactivatePushTokenForCurrentDevice(): Promise<void> {
  const storedToken = await loadCurrentPushToken();
  if (!storedToken) {
    return;
  }

  try {
    await deactivatePushToken({
      provider: storedToken.provider,
      pushToken: storedToken.pushToken,
    });
  } finally {
    await clearCurrentPushToken();
  }
}
