import { httpClient } from './httpClient';
import { UserNotification, UserNotificationUnreadCountResponse } from '../types/notification';

export async function getUserNotifications(): Promise<UserNotification[]> {
  const response = await httpClient.get<UserNotification[]>('/user/notifications');
  return response.data;
}

export async function markUserNotificationRead(notificationId: number): Promise<void> {
  await httpClient.post(`/user/notifications/${notificationId}/read`);
}

export async function getUserNotificationUnreadCount(): Promise<number> {
  const response = await httpClient.get<UserNotificationUnreadCountResponse>('/user/notifications/unread-count');
  return response.data.unreadCount;
}
