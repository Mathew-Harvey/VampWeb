import apiClient from './client';

type PendingSyncJob = {
  workOrderId: string;
  referenceNumber: string;
  title: string;
  pendingCount: number;
};

type PendingSyncResponse = {
  remoteSyncEnabled: boolean;
  jobs: PendingSyncJob[];
};

type SyncWorkOrderResponse = {
  workOrderId: string;
  total: number;
  synced: number;
  failed: number;
  remaining: number;
};

export const mediaApi = {
  getPendingSync: () =>
    apiClient.get<{ data: PendingSyncResponse }>('/media/sync/pending'),
  syncWorkOrder: (workOrderId: string) =>
    apiClient.post<{ data: SyncWorkOrderResponse }>(`/media/sync/work-order/${workOrderId}`),
};

export type { PendingSyncJob, PendingSyncResponse, SyncWorkOrderResponse };
