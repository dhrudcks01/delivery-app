import { httpClient } from './httpClient';
import { OpsAdminGrantCandidate, PageResponse, SysAdminGrantCandidate } from '../types/opsAdmin';

type OpsAdminGrantCandidateFilter = {
  query?: string;
  page?: number;
  size?: number;
};

type SysAdminGrantCandidateFilter = {
  query?: string;
  page?: number;
  size?: number;
};

export async function getOpsAdminGrantCandidates(
  filter: OpsAdminGrantCandidateFilter = {},
): Promise<PageResponse<OpsAdminGrantCandidate>> {
  const response = await httpClient.get<PageResponse<OpsAdminGrantCandidate>>(
    '/sys-admin/users/ops-admin-grant-candidates',
    {
      params: {
        query: filter.query,
        page: filter.page,
        size: filter.size,
      },
    },
  );
  return response.data;
}

export async function grantOpsAdminRole(userId: number): Promise<void> {
  await httpClient.post(`/sys-admin/users/${userId}/roles/ops-admin`);
}

export async function revokeOpsAdminRole(userId: number): Promise<void> {
  await httpClient.delete(`/sys-admin/users/${userId}/roles/ops-admin`);
}

export async function getSysAdminGrantCandidates(
  filter: SysAdminGrantCandidateFilter = {},
): Promise<PageResponse<SysAdminGrantCandidate>> {
  const response = await httpClient.get<PageResponse<SysAdminGrantCandidate>>(
    '/sys-admin/users/sys-admin-grant-candidates',
    {
      params: {
        query: filter.query,
        page: filter.page,
        size: filter.size,
      },
    },
  );
  return response.data;
}

export async function grantSysAdminRole(userId: number): Promise<void> {
  await httpClient.post(`/sys-admin/users/${userId}/roles/sys-admin`);
}
