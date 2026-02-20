export type PaymentMethodRegistrationStartResponse = {
  customerKey: string;
  registrationUrl: string;
};

export type PaymentMethodRegistrationSuccessResponse = {
  paymentMethodId: number;
  provider: string;
  status: string;
  createdAt: string;
};

export type PaymentMethodStatusItem = {
  id: number;
  provider: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethodStatusResponse = {
  canReregister: boolean;
  paymentMethods: PaymentMethodStatusItem[];
};
