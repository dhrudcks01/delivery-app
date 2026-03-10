import { useMemo } from 'react';
import type { UserAddress } from '../../types/userAddress';

type UseUserAddressManagementDerivedInput = {
  addresses: UserAddress[];
};

export function useUserAddressManagementDerived({ addresses }: UseUserAddressManagementDerivedInput) {
  const primaryAddressId = useMemo(
    () => addresses.find((item) => item.isPrimary)?.id ?? null,
    [addresses],
  );

  return {
    primaryAddressId,
  };
}
