import { httpClient } from './httpClient';

export async function grantOpsAdminRole(userId: number): Promise<void> {
  await httpClient.post(`/sys-admin/users/${userId}/roles/ops-admin`);
}

export async function revokeOpsAdminRole(userId: number): Promise<void> {
  await httpClient.delete(`/sys-admin/users/${userId}/roles/ops-admin`);
}
