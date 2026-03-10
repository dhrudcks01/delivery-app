export type PushTokenDeviceType = 'IOS' | 'ANDROID';

export type PushTokenProvider = 'EXPO';

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
