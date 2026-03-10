import { useMemo } from 'react';
import type { PaymentMethodStatusResponse } from '../../types/payment';

type UseUserPaymentManagementDerivedInput = {
  status: PaymentMethodStatusResponse | null;
  cardNumber: string;
  formatCardNumberForDisplay: (digits: string) => string;
};

export function useUserPaymentManagementDerived({
  status,
  cardNumber,
  formatCardNumberForDisplay,
}: UseUserPaymentManagementDerivedInput) {
  const hasPaymentMethods = useMemo(
    () => (status?.paymentMethods.length ?? 0) > 0,
    [status?.paymentMethods],
  );

  const canRegisterMethod = useMemo(
    () => !hasPaymentMethods || Boolean(status?.canReregister),
    [hasPaymentMethods, status?.canReregister],
  );

  const cardNumberDisplay = useMemo(
    () => formatCardNumberForDisplay(cardNumber),
    [cardNumber, formatCardNumberForDisplay],
  );

  return {
    hasPaymentMethods,
    canRegisterMethod,
    cardNumberDisplay,
  };
}
