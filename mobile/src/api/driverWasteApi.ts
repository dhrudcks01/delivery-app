import { httpClient } from './httpClient';
import { DriverAssignedWasteRequest } from '../types/waste';

export async function getMyAssignedWasteRequests(): Promise<DriverAssignedWasteRequest[]> {
  const response = await httpClient.get<DriverAssignedWasteRequest[]>('/driver/waste-requests');
  return response.data;
}

export async function getMyAssignedWasteRequestDetail(
  requestId: number,
): Promise<DriverAssignedWasteRequest> {
  const response = await httpClient.get<DriverAssignedWasteRequest>(`/driver/waste-requests/${requestId}`);
  return response.data;
}
