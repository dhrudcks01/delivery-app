import { httpClient } from './httpClient';
import { CreateWasteRequestPayload, WasteRequest } from '../types/waste';

export async function createWasteRequest(payload: CreateWasteRequestPayload): Promise<WasteRequest> {
  const response = await httpClient.post<WasteRequest>('/waste-requests', payload);
  return response.data;
}

export async function getMyWasteRequests(): Promise<WasteRequest[]> {
  const response = await httpClient.get<WasteRequest[]>('/waste-requests');
  return response.data;
}

export async function getMyWasteRequestDetail(requestId: number): Promise<WasteRequest> {
  const response = await httpClient.get<WasteRequest>(`/waste-requests/${requestId}`);
  return response.data;
}

export async function cancelMyWasteRequest(requestId: number): Promise<WasteRequest> {
  const response = await httpClient.post<WasteRequest>(`/waste-requests/${requestId}/cancel`);
  return response.data;
}
