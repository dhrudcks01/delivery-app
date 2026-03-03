import { httpClient } from './httpClient';
import { UserAddress, UserAddressUpsertPayload } from '../types/userAddress';

export async function getUserAddresses(): Promise<UserAddress[]> {
  const response = await httpClient.get<UserAddress[]>('/user/addresses');
  return response.data;
}

export async function createUserAddress(payload: UserAddressUpsertPayload): Promise<UserAddress> {
  const response = await httpClient.post<UserAddress>('/user/addresses', payload);
  return response.data;
}

export async function updateUserAddress(
  addressId: number,
  payload: UserAddressUpsertPayload,
): Promise<UserAddress> {
  const response = await httpClient.patch<UserAddress>(`/user/addresses/${addressId}`, payload);
  return response.data;
}

export async function setPrimaryUserAddress(addressId: number): Promise<UserAddress> {
  const response = await httpClient.patch<UserAddress>(`/user/addresses/${addressId}/primary`);
  return response.data;
}

export async function deleteUserAddress(addressId: number): Promise<void> {
  await httpClient.delete(`/user/addresses/${addressId}`);
}

