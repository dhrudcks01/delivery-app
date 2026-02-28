import { httpClient } from './httpClient';
import {
  AssignWasteRequestPayload,
  DriverAssignmentCandidate,
  FailedPayment,
  OpsWasteListFilter,
  OpsWasteRequest,
  OpsWasteRequestDetail,
  PageResponse,
} from '../types/opsAdmin';

export async function getOpsWasteRequests(
  filter: OpsWasteListFilter = {},
): Promise<PageResponse<OpsWasteRequest>> {
  const response = await httpClient.get<PageResponse<OpsWasteRequest>>('/ops-admin/waste-requests', {
    params: {
      status: filter.status,
      page: filter.page,
      size: filter.size,
    },
  });
  return response.data;
}

export async function getOpsWasteRequestDetail(requestId: number): Promise<OpsWasteRequestDetail> {
  const response = await httpClient.get<OpsWasteRequestDetail>(`/ops-admin/waste-requests/${requestId}`);
  return response.data;
}

export async function assignWasteRequestForOps(
  requestId: number,
  payload: AssignWasteRequestPayload,
): Promise<OpsWasteRequest> {
  const response = await httpClient.post<OpsWasteRequest>(
    `/ops-admin/waste-requests/${requestId}/assign`,
    payload,
  );
  return response.data;
}

export async function getDriverAssignmentCandidatesForOps(params: {
  query?: string;
  page?: number;
  size?: number;
} = {}): Promise<PageResponse<DriverAssignmentCandidate>> {
  const response = await httpClient.get<PageResponse<DriverAssignmentCandidate>>(
    '/ops-admin/waste-requests/driver-candidates',
    {
      params: {
        query: params.query,
        page: params.page,
        size: params.size,
      },
    },
  );
  return response.data;
}

export async function getFailedPaymentsForOps(
  page = 0,
  size = 20,
): Promise<PageResponse<FailedPayment>> {
  const response = await httpClient.get<PageResponse<FailedPayment>>('/ops-admin/payments/failed', {
    params: { page, size },
  });
  return response.data;
}

export async function retryFailedPaymentForOps(wasteRequestId: number): Promise<OpsWasteRequest> {
  const response = await httpClient.post<OpsWasteRequest>(
    `/ops-admin/payments/waste-requests/${wasteRequestId}/retry`,
  );
  return response.data;
}
