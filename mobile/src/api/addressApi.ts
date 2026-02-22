import { httpClient } from './httpClient';
import { AddressSearchResponse } from '../types/address';

export async function searchRoadAddresses(query: string, limit = 7): Promise<AddressSearchResponse> {
  const response = await httpClient.get<AddressSearchResponse>('/addresses/road-search', {
    params: {
      query,
      limit,
    },
  });
  return response.data;
}
