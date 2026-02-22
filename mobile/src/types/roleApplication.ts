import { PageResponse } from './opsAdmin';

export type RoleApplication = {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  status: string;
  reason: string;
  processedBy: number | null;
  processedByEmail: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleApplicationFilter = {
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
};

export type RoleApplicationPage = PageResponse<RoleApplication>;
