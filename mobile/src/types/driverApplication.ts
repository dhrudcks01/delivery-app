export type DriverApplicationPayload = Record<string, unknown> | null;

export type DriverApplication = {
  id: number;
  userId: number;
  status: string;
  payload: DriverApplicationPayload;
  processedBy: number | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
