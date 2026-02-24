import { httpClient } from './httpClient';
import {
  PaymentMethodType,
  PaymentMethodRegistrationStartResponse,
  PaymentMethodRegistrationSuccessResponse,
  PaymentMethodStatusResponse,
} from '../types/payment';

export async function startPaymentMethodRegistration(
  methodType: PaymentMethodType = 'CARD',
): Promise<PaymentMethodRegistrationStartResponse> {
  const response = await httpClient.post<PaymentMethodRegistrationStartResponse>(
    '/user/payment-methods/registration/start',
    undefined,
    {
      params: { methodType },
    },
  );
  return response.data;
}

export async function completePaymentMethodRegistration(
  customerKey: string,
  authKey: string,
  methodType: PaymentMethodType = 'CARD',
): Promise<PaymentMethodRegistrationSuccessResponse> {
  const response = await httpClient.get<PaymentMethodRegistrationSuccessResponse>(
    '/user/payment-methods/registration/success',
    {
      params: { customerKey, authKey, methodType },
    },
  );
  return response.data;
}

export async function getMyPaymentMethodStatus(): Promise<PaymentMethodStatusResponse> {
  const response = await httpClient.get<PaymentMethodStatusResponse>('/user/payment-methods');
  return response.data;
}
