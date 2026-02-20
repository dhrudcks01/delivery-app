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
