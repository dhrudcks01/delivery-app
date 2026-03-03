export type UserAddress = {
  id: number;
  roadAddress: string;
  jibunAddress: string;
  zipCode: string;
  detailAddress: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserAddressUpsertPayload = {
  roadAddress: string;
  jibunAddress?: string;
  zipCode?: string;
  detailAddress?: string;
  isPrimary?: boolean;
};

export type LegacyUserAddress = {
  id: string;
  roadAddress: string;
  jibunAddress: string;
  zipCode: string;
  detailAddress: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};
