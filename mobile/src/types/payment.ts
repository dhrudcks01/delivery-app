export type PaymentMethodType = 'CARD' | 'TRANSFER_TOSS' | 'KAKAOPAY';

export type PaymentMethodRegistrationStartResponse = {
  customerKey: string;
  registrationUrl: string;
  methodType: PaymentMethodType;
};

export type PaymentMethodRegistrationSuccessResponse = {
  paymentMethodId: number;
  provider: string;
  methodType: PaymentMethodType;
  status: string;
  createdAt: string;
};

export type PaymentMethodStatusItem = {
  id: number;
  provider: string;
  methodType: PaymentMethodType;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethodStatusResponse = {
  canReregister: boolean;
  paymentMethods: PaymentMethodStatusItem[];
};
