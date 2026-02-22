export type DriverApplicationPayload = Record<string, unknown> | null;

export type DriverApplication = {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  status: string;
  payload: DriverApplicationPayload;
  processedBy: number | null;
  processedByEmail: string | null;
  processedByDisplayName: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DriverApplicationListFilter = {
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
};
