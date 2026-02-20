import { httpClient } from './httpClient';
import { DriverApplication } from '../types/driverApplication';

export async function approveDriverApplication(applicationId: number): Promise<DriverApplication> {
  const response = await httpClient.post<DriverApplication>(
    `/ops-admin/driver-applications/${applicationId}/approve`,
  );
  return response.data;
}

export async function rejectDriverApplication(applicationId: number): Promise<DriverApplication> {
  const response = await httpClient.post<DriverApplication>(
    `/ops-admin/driver-applications/${applicationId}/reject`,
  );
  return response.data;
}
