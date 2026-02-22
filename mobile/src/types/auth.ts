export type AuthTokens = {
  tokenType: string;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type MeResponse = {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
};
