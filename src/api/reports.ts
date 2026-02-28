import apiClient from './client';

const BASE = '/reports';

/** Build an absolute URL for API endpoints, ensuring /api/v1 is always included. */
function buildAbsoluteApiUrl(path: string): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()?.replace(/\/+$/, '');
  if (raw) {
    // If VITE_API_URL already ends with /api/v1, use as-is; otherwise append it
    const base = /\/api\/v\d+$/.test(raw) ? raw : `${raw}/api/v1`;
    return `${base}${path}`;
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/api/v1${path}`;
  return `/api/v1${path}`;
}

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

/* ------------------------------------------------------------------ */
/*  BFMP Report                                                        */
/* ------------------------------------------------------------------ */
export type BFMPReportPayload = {
  planReference: string;
  revision: string;
  planDate: string;
  preparedBy: string;
  approvedBy: string;
  approvalDate: string;
  vesselId: string;
  vesselName: string;
  imoNumber: string;
  flagState: string;
  portOfRegistry: string;
  shipType: string;
  grossTonnage: string;
  yearBuilt: string;
  lengthOverall: string;
  beam: string;
  maxDraft: string;
  callSign: string;
  companyName: string;
  companyAddress: string;
  ismContactName: string;
  ismContactEmail: string;
  ismContactPhone: string;
  designatedPerson: string;
  hullAfsType: string;
  hullCoatingManufacturer: string;
  hullCoatingProduct: string;
  hullApplicationDate: string;
  hullRecoatingDate: string;
  lastDryDockDate: string;
  nextDryDockDate: string;
  nicheAreas: Array<{
    area: string;
    afsType: string;
    lastInspected: string;
    condition: string;
    notes: string;
  }>;
  tradeRoutes: string;
  typicalVoyageDuration: string;
  typicalPortStay: string;
  waterTempRange: string;
  typicalSpeed: string;
  percentTimeAtAnchor: string;
  layUpPeriods: string;
  operatingProfileRisk: string;
  nicheAreaRisk: string;
  hullCoatingRisk: string;
  overallRisk: string;
  riskNotes: string;
  inspectionFrequency: string;
  lastInspectionDate: string;
  nextInspectionDue: string;
  triggerConditions: string;
  inspectionRecords: Array<{
    date: string;
    location: string;
    method: string;
    areas: string;
    findings: string;
    actions: string;
  }>;
  cleaningMethod: string;
  approvedContractors: string;
  captureRequirements: string;
  maintenanceRecords: Array<{
    date: string;
    activity: string;
    details: string;
    performedBy: string;
  }>;
  foulingThreshold: string;
  emergencyResponse: string;
  portStateNotification: string;
  contingencyNotes: string;
};

/* ------------------------------------------------------------------ */
/*  Compliance Report                                                  */
/* ------------------------------------------------------------------ */
export type ComplianceReportPayload = {
  periodPreset: string;
  startDate: string;
  endDate: string;
  selectAllVessels: boolean;
  vesselIds: string[];
  selectedCategories: string[];
  statusFilter: string;
  includeOverdue: boolean;
  includeUpcoming: boolean;
  upcomingDays: string;
  includeHistory: boolean;
  reportTitle: string;
  preparedBy: string;
  reportDate: string;
  exportFormat: string;
  includeCharts: boolean;
  includeSummaryTable: boolean;
  includeDetailedFindings: boolean;
  additionalNotes: string;
};

/* ------------------------------------------------------------------ */
/*  Audit Report                                                       */
/* ------------------------------------------------------------------ */
export type AuditReportPayload = {
  reportTitle: string;
  preparedBy: string;
  reportDate: string;
  periodPreset: string;
  startDate: string;
  endDate: string;
  selectedEventTypes: string[];
  filterByVessel: boolean;
  vesselId: string;
  filterByWorkOrder: boolean;
  workOrderId: string;
  filterByUser: boolean;
  userId: string;
  detailLevel: string;
  grouping: string;
  exportFormat: string;
  includeTimestamps: boolean;
  includeIpAddresses: boolean;
  includeUserAgent: boolean;
  includePayloadDiffs: boolean;
  maxResults: string;
  additionalNotes: string;
};

/* ------------------------------------------------------------------ */
/*  API Client                                                         */
/* ------------------------------------------------------------------ */
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

  /** Generate a BFMP report. */
  generateBFMP: (payload: BFMPReportPayload) =>
    apiClient.post<{ data: any }>(`${BASE}/generate`, { type: 'bfmp', ...payload }),

  /** Save a BFMP draft. */
  saveBFMPDraft: (payload: BFMPReportPayload) =>
    apiClient.post<{ data: any }>(`${BASE}/bfmp/draft`, payload),

  /** Generate a compliance summary report. */
  generateCompliance: (payload: ComplianceReportPayload) =>
    apiClient.post<{ data: any }>(`${BASE}/generate`, { type: 'compliance', ...payload }),

  /** Generate an audit report. */
  generateAudit: (payload: AuditReportPayload) =>
    apiClient.post<{ data: any }>(`${BASE}/generate`, { type: 'audit', ...payload }),

  /** Absolute URL for report preview (open in new tab; cookies sent same-origin). */
  getPreviewUrl: (workOrderId: string) => {
    return buildAbsoluteApiUrl(`${BASE}/preview/${workOrderId}`);
  },

  /** Absolute URL for branded report viewer. */
  getViewUrl: (workOrderId: string) => {
    return buildAbsoluteApiUrl(`${BASE}/view/${workOrderId}`);
  },

  /** Absolute URL for report context (debug/integration checks). */
  getContextUrl: (workOrderId: string) => {
    return buildAbsoluteApiUrl(`${BASE}/context/${workOrderId}`);
  },
};
