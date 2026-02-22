import { httpClient } from './httpClient';
import { RoleApplication, RoleApplicationFilter, RoleApplicationPage } from '../types/roleApplication';

export async function createOpsAdminApplication(reason: string): Promise<RoleApplication> {
  const response = await httpClient.post<RoleApplication>('/user/ops-admin-applications', { reason });
  return response.data;
}

export async function createSysAdminApplication(reason: string): Promise<RoleApplication> {
  const response = await httpClient.post<RoleApplication>('/user/sys-admin-applications', { reason });
  return response.data;
}

export async function getOpsAdminApplicationsForSysAdmin(
  filter: RoleApplicationFilter = {},
): Promise<RoleApplicationPage> {
  const response = await httpClient.get<RoleApplicationPage>('/sys-admin/ops-admin-applications', {
    params: {
      status: filter.status,
      page: filter.page,
      size: filter.size,
      sort: filter.sort,
    },
  });
  return response.data;
}

export async function approveOpsAdminApplicationForSysAdmin(
  applicationId: number,
): Promise<RoleApplication> {
  const response = await httpClient.post<RoleApplication>(
    `/sys-admin/ops-admin-applications/${applicationId}/approve`,
  );
  return response.data;
}

export async function rejectOpsAdminApplicationForSysAdmin(
  applicationId: number,
): Promise<RoleApplication> {
  const response = await httpClient.post<RoleApplication>(
    `/sys-admin/ops-admin-applications/${applicationId}/reject`,
  );
  return response.data;
}

export async function getSysAdminApplicationsForSysAdmin(
  filter: RoleApplicationFilter = {},
): Promise<RoleApplicationPage> {
  const response = await httpClient.get<RoleApplicationPage>('/sys-admin/sys-admin-applications', {
    params: {
      status: filter.status,
      page: filter.page,
      size: filter.size,
      sort: filter.sort,
    },
  });
  return response.data;
}

export async function approveSysAdminApplicationForSysAdmin(
  applicationId: number,
): Promise<RoleApplication> {
  const response = await httpClient.post<RoleApplication>(
    `/sys-admin/sys-admin-applications/${applicationId}/approve`,
  );
  return response.data;
}

export async function rejectSysAdminApplicationForSysAdmin(
  applicationId: number,
): Promise<RoleApplication> {
  const response = await httpClient.post<RoleApplication>(
    `/sys-admin/sys-admin-applications/${applicationId}/reject`,
  );
  return response.data;
}
