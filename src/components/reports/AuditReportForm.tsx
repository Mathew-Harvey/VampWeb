import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { vesselsApi } from '@/api/vessels';
import { workOrdersApi } from '@/api/work-orders';
import { reportsApi, type AuditReportPayload } from '@/api/reports';
import {
  ChevronLeft, Loader2, Download, FileText, Users, Ship,
  ClipboardList, Filter, Settings, CalendarDays, Eye,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const EVENT_TYPES = [
  { id: 'user_login', label: 'User Login / Logout', group: 'Users' },
  { id: 'user_created', label: 'User Created', group: 'Users' },
  { id: 'user_updated', label: 'User Updated', group: 'Users' },
  { id: 'role_changed', label: 'Role / Permission Changes', group: 'Users' },
  { id: 'wo_created', label: 'Work Order Created', group: 'Work Orders' },
  { id: 'wo_updated', label: 'Work Order Updated', group: 'Work Orders' },
  { id: 'wo_status', label: 'Work Order Status Changes', group: 'Work Orders' },
  { id: 'wo_assigned', label: 'Work Order Assignments', group: 'Work Orders' },
  { id: 'insp_created', label: 'Inspection Created', group: 'Inspections' },
  { id: 'insp_completed', label: 'Inspection Completed', group: 'Inspections' },
  { id: 'insp_approved', label: 'Inspection Approved', group: 'Inspections' },
  { id: 'finding_added', label: 'Finding Added / Updated', group: 'Inspections' },
  { id: 'report_generated', label: 'Report Generated', group: 'Documents' },
  { id: 'doc_created', label: 'Document Created', group: 'Documents' },
  { id: 'media_uploaded', label: 'Media Uploaded', group: 'Documents' },
  { id: 'vessel_created', label: 'Vessel Created / Updated', group: 'Vessels' },
  { id: 'vessel_deleted', label: 'Vessel Deleted', group: 'Vessels' },
  { id: 'config_changed', label: 'Configuration Changes', group: 'System' },
  { id: 'settings_changed', label: 'Settings Updated', group: 'System' },
] as const;

const EVENT_GROUPS = ['Users', 'Work Orders', 'Inspections', 'Documents', 'Vessels', 'System'] as const;

const DETAIL_LEVELS = ['Summary', 'Standard', 'Detailed'] as const;
const GROUPING_OPTIONS = ['Chronological', 'By Entity', 'By User', 'By Event Type'] as const;
const EXPORT_FORMATS = ['PDF', 'HTML', 'CSV', 'JSON'] as const;
const PERIOD_PRESETS = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'Year to Date', 'Custom'] as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type FormState = {
  // Report Info
  reportTitle: string;
  preparedBy: string;
  reportDate: string;

  // Period
  periodPreset: string;
  startDate: string;
  endDate: string;

  // Scope
  selectedEventTypes: string[];

  // Entity Filters
  filterByVessel: boolean;
  vesselId: string;
  filterByWorkOrder: boolean;
  workOrderId: string;
  filterByUser: boolean;
  userId: string;

  // Output Options
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

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

const DEFAULT_FORM: FormState = {
  reportTitle: 'Audit Trail Report',
  preparedBy: '',
  reportDate: today,
  periodPreset: 'Last 30 Days',
  startDate: thirtyDaysAgo,
  endDate: today,
  selectedEventTypes: EVENT_TYPES.map((e) => e.id),
  filterByVessel: false,
  vesselId: '',
  filterByWorkOrder: false,
  workOrderId: '',
  filterByUser: false,
  userId: '',
  detailLevel: 'Standard',
  grouping: 'Chronological',
  exportFormat: 'PDF',
  includeTimestamps: true,
  includeIpAddresses: false,
  includeUserAgent: false,
  includePayloadDiffs: false,
  maxResults: '1000',
  additionalNotes: '',
};

/* ------------------------------------------------------------------ */
/*  Reusable helpers                                                   */
/* ------------------------------------------------------------------ */
function TextField({ label, value, onChange, placeholder, type = 'text', helpText }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; helpText?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function Checkbox({ id, label, checked, onChange, description }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
      <div>
        <Label htmlFor={id} className="text-sm cursor-pointer">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: {
  icon: typeof FileText; title: string; description: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ocean/10 text-ocean">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function AuditReportForm({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Data for entity filters
  const { data: vesselsRes } = useQuery({ queryKey: ['vessels'], queryFn: () => vesselsApi.list() });
  const vessels = (vesselsRes?.data?.data ?? []) as any[];

  const { data: workOrdersRes } = useQuery({
    queryKey: ['workOrders', { limit: '100' }],
    queryFn: () => workOrdersApi.list({ limit: '100' }),
  });
  const workOrders = (workOrdersRes?.data?.data ?? []) as any[];

  // Period preset
  const handlePeriodPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();
    switch (preset) {
      case 'Last 7 Days': start = new Date(now.getTime() - 7 * 86400000); break;
      case 'Last 30 Days': start = new Date(now.getTime() - 30 * 86400000); break;
      case 'Last 90 Days': start = new Date(now.getTime() - 90 * 86400000); break;
      case 'Last 6 Months': start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
      case 'Year to Date': start = new Date(now.getFullYear(), 0, 1); break;
      case 'Custom': return set('periodPreset', preset);
    }
    setForm((prev) => ({
      ...prev,
      periodPreset: preset,
      startDate: start.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }));
  };

  // Event type toggle
  const toggleEventType = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedEventTypes: prev.selectedEventTypes.includes(id)
        ? prev.selectedEventTypes.filter((e) => e !== id)
        : [...prev.selectedEventTypes, id],
    }));
  };

  const toggleEventGroup = (group: string) => {
    const groupEvents = EVENT_TYPES.filter((e) => e.group === group).map((e) => e.id);
    const allSelected = groupEvents.every((id) => form.selectedEventTypes.includes(id));
    if (allSelected) {
      setForm((prev) => ({
        ...prev,
        selectedEventTypes: prev.selectedEventTypes.filter((id) => !groupEvents.includes(id)),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        selectedEventTypes: [...new Set([...prev.selectedEventTypes, ...groupEvents])],
      }));
    }
  };

  const selectAllEvents = () => setForm((prev) => ({ ...prev, selectedEventTypes: EVENT_TYPES.map((e) => e.id) }));
  const deselectAllEvents = () => setForm((prev) => ({ ...prev, selectedEventTypes: [] }));

  // Generate
  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generateAudit(form as AuditReportPayload),
    onSuccess: (res) => {
      const payload = res?.data?.data;
      if (payload) {
        const mimeType = form.exportFormat === 'CSV' ? 'text/csv' : 'application/json';
        const content = form.exportFormat === 'CSV' && typeof payload === 'string'
          ? payload
          : JSON.stringify(payload, null, 2);
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      setSaveMsg({ type: 'success', text: 'Audit report generated successfully' });
    },
    onError: (err: any) => {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error?.message || 'Failed to generate audit report' });
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Report</h1>
            <p className="text-sm text-muted-foreground">Filtered audit trail export with configurable scope</p>
          </div>
        </div>
        <Button onClick={() => { setSaveMsg(null); generateMutation.mutate(); }} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {/* Feedback */}
      {saveMsg && (
        <div className={`rounded-md px-4 py-3 text-sm ${saveMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Report Details & Period */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <SectionHeader icon={FileText} title="Report Details" description="Title, author, and report date" />
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField label="Report Title" value={form.reportTitle} onChange={(v) => set('reportTitle', v)} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Prepared By" value={form.preparedBy} onChange={(v) => set('preparedBy', v)} />
              <TextField label="Report Date" value={form.reportDate} onChange={(v) => set('reportDate', v)} type="date" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <SectionHeader icon={CalendarDays} title="Audit Period" description="Time range for the audit trail" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PERIOD_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={form.periodPreset === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodPreset(preset)}
                  className="text-xs"
                >
                  {preset}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Start Date" value={form.startDate} onChange={(v) => set('startDate', v)} type="date" />
              <TextField label="End Date" value={form.endDate} onChange={(v) => set('endDate', v)} type="date" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Types */}
      <Card>
        <CardHeader className="pb-4">
          <SectionHeader icon={ClipboardList} title="Event Types" description="Select which audit events to include" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={selectAllEvents} className="text-xs">Select All</Button>
            <Button variant="outline" size="sm" onClick={deselectAllEvents} className="text-xs">Deselect All</Button>
            <Badge variant="outline">{form.selectedEventTypes.length} of {EVENT_TYPES.length} selected</Badge>
          </div>
          <Separator />
          <div className="space-y-4">
            {EVENT_GROUPS.map((group) => {
              const groupEvents = EVENT_TYPES.filter((e) => e.group === group);
              const selectedCount = groupEvents.filter((e) => form.selectedEventTypes.includes(e.id)).length;
              const allGroupSelected = selectedCount === groupEvents.length;
              return (
                <div key={group}>
                  <div
                    className="flex items-center gap-2 mb-2 cursor-pointer"
                    onClick={() => toggleEventGroup(group)}
                  >
                    <input type="checkbox" checked={allGroupSelected} readOnly className="h-4 w-4 rounded" />
                    <span className="text-sm font-medium text-slate-700">{group}</span>
                    <Badge variant="secondary" className="text-xs">{selectedCount}/{groupEvents.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                    {groupEvents.map((event) => {
                      const isSelected = form.selectedEventTypes.includes(event.id);
                      return (
                        <div
                          key={event.id}
                          onClick={() => toggleEventType(event.id)}
                          className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors text-sm ${
                            isSelected ? 'border-ocean bg-ocean/5' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input type="checkbox" checked={isSelected} readOnly className="h-3.5 w-3.5 rounded" />
                          <span className="truncate">{event.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Entity Filters */}
      <Card>
        <CardHeader className="pb-4">
          <SectionHeader icon={Filter} title="Entity Filters" description="Optionally narrow the audit trail to specific entities" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vessel filter */}
          <div className="space-y-3">
            <Checkbox id="filterByVessel" label="Filter by Vessel" checked={form.filterByVessel} onChange={(v) => set('filterByVessel', v)} description="Only show audit events related to a specific vessel" />
            {form.filterByVessel && (
              <div className="ml-6 space-y-1">
                <Label className="text-sm">Vessel</Label>
                <Select value={form.vesselId} onValueChange={(v) => set('vesselId', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a vessel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="flex items-center gap-2">
                          <Ship className="h-3.5 w-3.5 text-muted-foreground" />
                          {v.name} {v.imoNumber ? `(IMO ${v.imoNumber})` : ''}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Work Order filter */}
          <div className="space-y-3">
            <Checkbox id="filterByWorkOrder" label="Filter by Work Order" checked={form.filterByWorkOrder} onChange={(v) => set('filterByWorkOrder', v)} description="Only show audit events related to a specific work order" />
            {form.filterByWorkOrder && (
              <div className="ml-6 space-y-1">
                <Label className="text-sm">Work Order</Label>
                <Select value={form.workOrderId} onValueChange={(v) => set('workOrderId', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a work order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workOrders.map((wo: any) => (
                      <SelectItem key={wo.id} value={wo.id}>
                        {wo.referenceNumber} — {wo.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* User filter */}
          <div className="space-y-3">
            <Checkbox id="filterByUser" label="Filter by User" checked={form.filterByUser} onChange={(v) => set('filterByUser', v)} description="Only show audit events performed by a specific user" />
            {form.filterByUser && (
              <div className="ml-6">
                <TextField label="User ID or Email" value={form.userId} onChange={(v) => set('userId', v)} placeholder="Enter user ID or email address" helpText="Enter the user's ID or email to filter audit events" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output Options */}
      <Card>
        <CardHeader className="pb-4">
          <SectionHeader icon={Settings} title="Output Options" description="Configure report format and content detail" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Detail Level</Label>
              <Select value={form.detailLevel} onValueChange={(v) => set('detailLevel', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DETAIL_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      <span className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        {level}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {form.detailLevel === 'Summary' && 'Counts and aggregates only'}
                {form.detailLevel === 'Standard' && 'Key fields for each event'}
                {form.detailLevel === 'Detailed' && 'Full event data including payloads'}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Group By</Label>
              <Select value={form.grouping} onValueChange={(v) => set('grouping', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUPING_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Export Format</Label>
              <Select value={form.exportFormat} onValueChange={(v) => set('exportFormat', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map((fmt) => <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <TextField label="Max Results" value={form.maxResults} onChange={(v) => set('maxResults', v)} placeholder="1000" helpText="Maximum number of audit events" />
          </div>

          <Separator />

          <p className="text-sm font-medium text-slate-700">Include in Output</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Checkbox id="includeTimestamps" label="Timestamps" checked={form.includeTimestamps} onChange={(v) => set('includeTimestamps', v)} description="Include precise timestamps for each event" />
            <Checkbox id="includeIpAddresses" label="IP Addresses" checked={form.includeIpAddresses} onChange={(v) => set('includeIpAddresses', v)} description="Include source IP for each event" />
            <Checkbox id="includeUserAgent" label="User Agent" checked={form.includeUserAgent} onChange={(v) => set('includeUserAgent', v)} description="Include browser/client information" />
            <Checkbox id="includePayloadDiffs" label="Payload Diffs" checked={form.includePayloadDiffs} onChange={(v) => set('includePayloadDiffs', v)} description="Include before/after data changes" />
          </div>

          <Separator />

          <div className="space-y-1">
            <Label className="text-sm">Additional Notes</Label>
            <Textarea value={form.additionalNotes} onChange={(e) => set('additionalNotes', e.target.value)} rows={3} placeholder="Any additional context for the audit report..." />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Reports
        </Button>
        <Button onClick={() => { setSaveMsg(null); generateMutation.mutate(); }} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>
    </div>
  );
}
