export type CreateWasteRequestPayload = {
  address: string;
  note?: string;
};

export type WasteRequest = {
  id: number;
  orderNo: string;
  userId: number;
  address: string;
  contactPhone: string;
  note: string | null;
  disposalItems: string[];
  bagCount: number;
  status: string;
  measuredWeightKg: number | null;
  measuredAt: string | null;
  measuredByDriverId: number | null;
  finalAmount: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type WasteRequestPhoto = {
  url: string;
  type: string;
  createdAt: string | null;
};

export type WasteRequestStatusTimelineItem = {
  fromStatus: string | null;
  toStatus: string;
  at: string;
};

export type WasteRequestDetail = WasteRequest & {
  photos: WasteRequestPhoto[];
  statusTimeline: WasteRequestStatusTimelineItem[];
  driverId: number | null;
  assignedAt: string | null;
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

export type MeasureAssignedWasteRequestPayload = {
  measuredWeightKg: number;
  photoUrls: string[];
};
