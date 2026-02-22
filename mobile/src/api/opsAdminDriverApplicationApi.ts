import { httpClient } from './httpClient';
import { DriverApplication, DriverApplicationListFilter } from '../types/driverApplication';
import { PageResponse } from '../types/opsAdmin';

export async function getDriverApplicationsForOps(
  filter: DriverApplicationListFilter = {},
): Promise<PageResponse<DriverApplication>> {
  const response = await httpClient.get<PageResponse<DriverApplication>>('/ops-admin/driver-applications', {
    params: {
      status: filter.status,
      page: filter.page,
      size: filter.size,
      sort: filter.sort,
    },
  });
  return response.data;
}

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
