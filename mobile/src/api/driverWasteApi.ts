import { httpClient } from './httpClient';
import { DriverAssignedWasteRequest, MeasureAssignedWasteRequestPayload, WasteRequest } from '../types/waste';

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

export async function measureAssignedWasteRequest(
  requestId: number,
  payload: MeasureAssignedWasteRequestPayload,
): Promise<WasteRequest> {
  const response = await httpClient.post<WasteRequest>(`/driver/waste-requests/${requestId}/measure`, payload);
  return response.data;
}
