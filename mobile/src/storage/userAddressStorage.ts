import AsyncStorage from '@react-native-async-storage/async-storage';
import { LegacyUserAddress } from '../types/userAddress';

function getAddressStorageKey(userId: number): string {
  return `@delivery/user-addresses/${userId}`;
}

export async function loadLegacyUserAddresses(userId: number): Promise<LegacyUserAddress[]> {
  const raw = await AsyncStorage.getItem(getAddressStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is LegacyUserAddress => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const address = item as Partial<LegacyUserAddress>;
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

export async function clearLegacyUserAddresses(userId: number): Promise<void> {
  await AsyncStorage.removeItem(getAddressStorageKey(userId));
}
