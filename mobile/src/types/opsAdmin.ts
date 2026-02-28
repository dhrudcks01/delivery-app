import { WasteRequest, WasteRequestDetail } from './waste';

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
};

export type FailedPayment = {
  paymentId: number;
  wasteRequestId: number;
  userId: number;
  amount: number;
  currency: string;
  failureCode: string | null;
  failureMessage: string | null;
  updatedAt: string;
};

export type OpsWasteListFilter = {
  status?: string;
  page?: number;
  size?: number;
};

export type AssignWasteRequestPayload = {
  driverId: number;
};

export type OpsWasteRequest = WasteRequest;
export type OpsWasteRequestDetail = WasteRequestDetail;

export type DriverAssignmentCandidate = {
  driverId: number;
  loginId: string;
  name: string;
};

export type OpsAdminGrantCandidate = {
  userId: number;
  loginId: string;
  name: string;
};

export type SysAdminGrantCandidate = {
  userId: number;
  loginId: string;
  name: string;
};
