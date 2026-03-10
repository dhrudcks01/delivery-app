import { httpClient } from './httpClient';
import { PushTokenDeactivateRequest, PushTokenUpsertRequest } from '../types/notification';

export async function registerPushToken(payload: PushTokenUpsertRequest): Promise<void> {
  await httpClient.post('/user/push-tokens', payload);
}

export async function deactivatePushToken(payload: PushTokenDeactivateRequest): Promise<void> {
  await httpClient.post('/user/push-tokens/deactivate', payload);
}
