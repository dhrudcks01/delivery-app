import { httpClient } from './httpClient';
import {
  PaymentMethodRegistrationStartResponse,
  PaymentMethodRegistrationSuccessResponse,
} from '../types/payment';

export async function startPaymentMethodRegistration(): Promise<PaymentMethodRegistrationStartResponse> {
  const response = await httpClient.post<PaymentMethodRegistrationStartResponse>(
    '/user/payment-methods/registration/start',
  );
  return response.data;
}

export async function completePaymentMethodRegistration(
  customerKey: string,
  authKey: string,
): Promise<PaymentMethodRegistrationSuccessResponse> {
  const response = await httpClient.get<PaymentMethodRegistrationSuccessResponse>(
    '/user/payment-methods/registration/success',
    {
      params: { customerKey, authKey },
    },
  );
  return response.data;
}
