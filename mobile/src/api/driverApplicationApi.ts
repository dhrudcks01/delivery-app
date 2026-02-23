import { httpClient } from './httpClient';
import { DriverApplication } from '../types/driverApplication';

export async function createDriverApplication(reason: string): Promise<DriverApplication> {
  const response = await httpClient.post<DriverApplication>('/user/driver-applications', {
    payload: { reason },
  });
  return response.data;
}

export async function getMyDriverApplications(): Promise<DriverApplication[]> {
  const response = await httpClient.get<DriverApplication[]>('/user/driver-applications');
  return response.data;
}
