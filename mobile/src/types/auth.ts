export type AuthTokens = {
  tokenType: string;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  phoneVerificationRequired: boolean;
};

export type LoginRequest = {
  id: string;
  password: string;
};

export type RegisterRequest = {
  id: string;
  password: string;
  displayName: string;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type MeResponse = {
  id: number;
  loginId?: string | null;
  email?: string | null;
  displayName: string;
  roles: string[];
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  phoneVerificationProvider: string | null;
};

export type PhoneVerificationStartResponse = {
  provider: string;
  storeId: string;
  channelKey: string;
  identityVerificationId: string;
};

export type PhoneVerificationCompleteRequest = {
  identityVerificationId: string;
};

export type PhoneVerificationCompleteResponse = {
  identityVerificationId: string;
  status: string;
  phoneNumber: string | null;
  provider: string;
  phoneVerifiedAt: string;
  idempotent: boolean;
};
