export type CreateWasteRequestPayload = {
  address: string;
  contactPhone: string;
  note?: string;
};

export type WasteRequest = {
  id: number;
  userId: number;
  address: string;
  contactPhone: string;
  note: string | null;
  status: string;
  measuredWeightKg: number | null;
  measuredAt: string | null;
  measuredByDriverId: number | null;
  finalAmount: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorResponse = {
  status: number;
  code: string;
  message: string;
  path: string;
};

export type DriverAssignedWasteRequest = {
  requestId: number;
  status: string;
  address: string;
  contactPhone: string;
  note: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
};
