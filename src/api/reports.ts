import apiClient from './client';

const BASE = '/reports';

export type SignoffEntry = {
  name?: string;
  declaration?: string;
  signature?: string;
  mode?: string;
  date?: string;
};

export type ReportConfigPayload = {
  title?: string;
  workInstruction?: string;
  summary?: string;
  overview?: string;
  methodology?: string;
  recommendations?: string;
  visibility?: string;
  clientDetails?: string;
  buyerName?: string;
  reviewerName?: string;
  berthAnchorageLocation?: string;
  togglePhotoName?: boolean;
  supervisorName?: string;
  inspectorName?: string;
  confidential?: string;
  toggleRovUse?: boolean;
  rovDetails?: string;
  repairAgentName?: string;
  coverImage?: { mediaId?: string } | null;
  clientLogo?: { mediaId?: string } | null;
  generalArrangementImage?: { mediaId?: string } | null;
  signoff?: {
    supervisor?: SignoffEntry;
    inspector?: SignoffEntry;
    repair?: SignoffEntry;
  };
};

export const reportsApi = {
  /** Generate a report. Returns { data } with report payload (e.g. html for inspection). */
  generate: (type: 'inspection' | 'work-order', workOrderId: string) =>
    apiClient.post<{ data: any }>(`${BASE}/generate`, { type, workOrderId }),

  /** Debug endpoint: returns report build context payload before HTML rendering. */
  getContext: (workOrderId: string) =>
    apiClient.get<{ data: any }>(`${BASE}/context/${workOrderId}`),

  /** Read report configuration. */
  getConfig: (workOrderId: string) =>
    apiClient.get<{ data: ReportConfigPayload }>(`${BASE}/config/${workOrderId}`),

  /** Update report configuration. */
  updateConfig: (workOrderId: string, payload: ReportConfigPayload) =>
    apiClient.put<{ data: ReportConfigPayload }>(`${BASE}/config/${workOrderId}`, payload),

  /** Absolute URL for report preview (open in new tab; cookies sent same-origin). */
  getPreviewUrl: (workOrderId: string) => {
    const base = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '');
    const path = `${BASE}/preview/${workOrderId}`;
    if (base) return `${base}${path}`;
    if (typeof window !== 'undefined') return `${window.location.origin}/api/v1${path}`;
    return `/api/v1${path}`;
  },

  /** Absolute URL for branded report viewer. */
  getViewUrl: (workOrderId: string) => {
    const base = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '');
    const path = `${BASE}/view/${workOrderId}`;
    if (base) return `${base}${path}`;
    if (typeof window !== 'undefined') return `${window.location.origin}/api/v1${path}`;
    return `/api/v1${path}`;
  },

  /** Absolute URL for report context (debug/integration checks). */
  getContextUrl: (workOrderId: string) => {
    const base = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '');
    const path = `${BASE}/context/${workOrderId}`;
    if (base) return `${base}${path}`;
    if (typeof window !== 'undefined') return `${window.location.origin}/api/v1${path}`;
    return `/api/v1${path}`;
  },
};
