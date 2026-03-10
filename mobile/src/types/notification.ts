export type PushTokenDeviceType = 'IOS' | 'ANDROID';

export type PushTokenProvider = 'EXPO';

export type NotificationType =
  | 'WASTE_REQUEST_CREATED'
  | 'WASTE_REQUEST_MEASURED'
  | 'PAYMENT_COMPLETED'
  | 'COUPON_EXPIRING'
  | 'ADMIN_BROADCAST';

export type UserNotification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type UserNotificationUnreadCountResponse = {
  unreadCount: number;
};

export type PushTokenUpsertRequest = {
  deviceType: PushTokenDeviceType;
  provider: PushTokenProvider;
  pushToken: string;
};

export type PushTokenDeactivateRequest = {
  provider: PushTokenProvider;
  pushToken: string;
};

export type PushRegistrationStatus =
  | 'idle'
  | 'registered'
  | 'permission_denied'
  | 'unsupported'
  | 'token_failed'
  | 'api_failed';

export type PushRegistrationState = {
  status: PushRegistrationStatus;
  message: string;
  pushToken: string | null;
};
