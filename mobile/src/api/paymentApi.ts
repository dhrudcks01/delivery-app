import { httpClient } from './httpClient';
import {
  PaymentMethodRegistrationStartResponse,
  PaymentMethodRegistrationSuccessResponse,
  PaymentMethodStatusResponse,
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

export async function getMyPaymentMethodStatus(): Promise<PaymentMethodStatusResponse> {
  const response = await httpClient.get<PaymentMethodStatusResponse>('/user/payment-methods');
  return response.data;
}
