import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAddress } from '../types/userAddress';

function getAddressStorageKey(userId: number): string {
  return `@delivery/user-addresses/${userId}`;
}

export async function loadUserAddresses(userId: number): Promise<UserAddress[]> {
  const raw = await AsyncStorage.getItem(getAddressStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is UserAddress => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const address = item as Partial<UserAddress>;
      return (
        typeof address.id === 'string' &&
        typeof address.roadAddress === 'string' &&
        typeof address.jibunAddress === 'string' &&
        typeof address.zipCode === 'string' &&
        typeof address.detailAddress === 'string' &&
        typeof address.isPrimary === 'boolean' &&
        typeof address.createdAt === 'string' &&
        typeof address.updatedAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

export async function saveUserAddresses(userId: number, addresses: UserAddress[]): Promise<void> {
  await AsyncStorage.setItem(getAddressStorageKey(userId), JSON.stringify(addresses));
}
