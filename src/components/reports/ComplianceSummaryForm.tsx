import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { vesselsApi } from '@/api/vessels';
import { reportsApi, type ComplianceReportPayload } from '@/api/reports';
import {
  ChevronLeft, Loader2, CheckCircle2, XCircle, Clock,
  Ship, Filter, BarChart3, CalendarDays, Download, FileText,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const COMPLIANCE_CATEGORIES = [
  { id: 'bfmp', label: 'Biofouling Management Plan', description: 'IMO BFMP documentation and implementation' },
  { id: 'classsurvey', label: 'Classification Survey', description: 'Class society survey schedules and status' },
  { id: 'flagstate', label: 'Flag State Requirements', description: 'Flag state regulatory compliance' },
  { id: 'afs', label: 'Anti-Fouling System', description: 'AFS Convention compliance and certificate status' },
  { id: 'mgps', label: 'Marine Growth Protection', description: 'MGPS system maintenance and status' },
  { id: 'inspection', label: 'Inspection Schedules', description: 'In-water and dry-dock inspection compliance' },
] as const;

const STATUS_OPTIONS = ['All', 'Compliant', 'Non-Compliant', 'Due Soon', 'Overdue', 'Not Assessed'] as const;
const PERIOD_PRESETS = ['Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'Last 12 Months', 'Year to Date', 'Custom'] as const;
const EXPORT_FORMATS = ['PDF', 'HTML', 'JSON'] as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type VesselSelection = { id: string; name: string; selected: boolean };

type FormState = {
  // Report Period
  periodPreset: string;
  startDate: string;
  endDate: string;

  // Fleet Selection
  selectAllVessels: boolean;
  vesselSelections: VesselSelection[];

  // Compliance Categories
  selectedCategories: string[];

  // Filters
  statusFilter: string;
  includeOverdue: boolean;
  includeUpcoming: boolean;
  upcomingDays: string;
  includeHistory: boolean;

  // Report Options
  reportTitle: string;
  preparedBy: string;
  reportDate: string;
  exportFormat: string;
  includeCharts: boolean;
  includeSummaryTable: boolean;
  includeDetailedFindings: boolean;
  additionalNotes: string;
};

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

const DEFAULT_FORM: FormState = {
  periodPreset: 'Last 30 Days',
  startDate: thirtyDaysAgo,
  endDate: today,
  selectAllVessels: true,
  vesselSelections: [],
  selectedCategories: COMPLIANCE_CATEGORIES.map((c) => c.id),
  statusFilter: 'All',
  includeOverdue: true,
  includeUpcoming: true,
  upcomingDays: '30',
  includeHistory: false,
  reportTitle: 'Fleet Compliance Summary',
  preparedBy: '',
  reportDate: today,
  exportFormat: 'PDF',
  includeCharts: true,
  includeSummaryTable: true,
  includeDetailedFindings: true,
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
  icon: typeof Ship; title: string; description: string;
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
export default function ComplianceSummaryForm({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Vessel list
  const { data: vesselsRes, isLoading: loadingVessels } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => vesselsApi.list(),
  });
  const vessels = (vesselsRes?.data?.data ?? []) as any[];

  // Initialize vessel selections once loaded
  if (vessels.length > 0 && form.vesselSelections.length === 0) {
    const selections = vessels.map((v: any) => ({ id: v.id, name: v.name || v.id, selected: true }));
    setForm((prev) => ({ ...prev, vesselSelections: selections }));
  }

  // Period preset handler
  const handlePeriodPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();
    switch (preset) {
      case 'Last 30 Days': start = new Date(now.getTime() - 30 * 86400000); break;
      case 'Last 90 Days': start = new Date(now.getTime() - 90 * 86400000); break;
      case 'Last 6 Months': start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()); break;
      case 'Last 12 Months': start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
      case 'Year to Date': start = new Date(now.getFullYear(), 0, 1); break;
      case 'Custom': return setForm((prev) => ({ ...prev, periodPreset: preset }));
    }
    setForm((prev) => ({
      ...prev,
      periodPreset: preset,
      startDate: start.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }));
  };

  // Category toggle
  const toggleCategory = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(id)
        ? prev.selectedCategories.filter((c) => c !== id)
        : [...prev.selectedCategories, id],
    }));
  };

  // Vessel toggle
  const toggleVessel = (vesselId: string) => {
    setForm((prev) => ({
      ...prev,
      selectAllVessels: false,
      vesselSelections: prev.vesselSelections.map((v) =>
        v.id === vesselId ? { ...v, selected: !v.selected } : v
      ),
    }));
  };

  const toggleAllVessels = (all: boolean) => {
    setForm((prev) => ({
      ...prev,
      selectAllVessels: all,
      vesselSelections: prev.vesselSelections.map((v) => ({ ...v, selected: all })),
    }));
  };

  // Generate
  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generateCompliance({
      ...form,
      vesselIds: form.selectAllVessels
        ? vessels.map((v: any) => v.id)
        : form.vesselSelections.filter((v) => v.selected).map((v) => v.id),
    } as ComplianceReportPayload),
    onSuccess: (res) => {
      const payload = res?.data?.data;
      if (payload?.html) {
        const blob = new Blob([payload.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else if (payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      setSaveMsg({ type: 'success', text: 'Compliance report generated successfully' });
    },
    onError: (err: any) => {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error?.message || 'Failed to generate report' });
    },
  });

  const selectedVesselCount = form.selectAllVessels
    ? vessels.length
    : form.vesselSelections.filter((v) => v.selected).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Compliance Summary</h1>
            <p className="text-sm text-muted-foreground">Fleet-wide compliance status overview report</p>
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
            <SectionHeader icon={FileText} title="Report Details" description="Title, author, and output format" />
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField label="Report Title" value={form.reportTitle} onChange={(v) => set('reportTitle', v)} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Prepared By" value={form.preparedBy} onChange={(v) => set('preparedBy', v)} />
              <TextField label="Report Date" value={form.reportDate} onChange={(v) => set('reportDate', v)} type="date" />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <SectionHeader icon={CalendarDays} title="Report Period" description="Time range for compliance assessment" />
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

      {/* Fleet Selection */}
      <Card>
        <CardHeader className="pb-4">
          <SectionHeader icon={Ship} title="Fleet Selection" description={`Select vessels to include in the report (${selectedVesselCount} selected)`} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Checkbox id="selectAll" label="Select All Vessels" checked={form.selectAllVessels} onChange={toggleAllVessels} />
            <Badge variant="outline">{selectedVesselCount} of {vessels.length} vessels</Badge>
          </div>
          {!form.selectAllVessels && (
            <>
              <Separator />
              {loadingVessels ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading vessels...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {form.vesselSelections.map((vessel) => (
                    <div
                      key={vessel.id}
                      onClick={() => toggleVessel(vessel.id)}
                      className={`flex items-center gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors ${
                        vessel.selected ? 'border-ocean bg-ocean/5' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input type="checkbox" checked={vessel.selected} readOnly className="h-4 w-4 rounded" />
                      <span className="text-sm truncate">{vessel.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Compliance Categories */}
      <Card>
        <CardHeader className="pb-4">
          <SectionHeader icon={BarChart3} title="Compliance Categories" description="Select which compliance areas to include in the report" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {COMPLIANCE_CATEGORIES.map((cat) => {
              const isSelected = form.selectedCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                    isSelected ? 'border-ocean bg-ocean/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="checkbox" checked={isSelected} readOnly className="mt-0.5 h-4 w-4 rounded" />
                  <div>
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters & Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <SectionHeader icon={Filter} title="Filters" description="Narrow the scope of the report" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Status Filter</Label>
              <Select value={form.statusFilter} onValueChange={(v) => set('statusFilter', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      <span className="flex items-center gap-2">
                        {opt === 'Compliant' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                        {opt === 'Non-Compliant' && <XCircle className="h-3.5 w-3.5 text-red-600" />}
                        {(opt === 'Due Soon' || opt === 'Overdue') && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        {opt}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <Checkbox id="includeOverdue" label="Include Overdue Items" checked={form.includeOverdue} onChange={(v) => set('includeOverdue', v)} description="Highlight items past their compliance deadline" />
              <Checkbox id="includeUpcoming" label="Include Upcoming Deadlines" checked={form.includeUpcoming} onChange={(v) => set('includeUpcoming', v)} description="Show items approaching their compliance deadline" />
              {form.includeUpcoming && (
                <div className="ml-6">
                  <TextField label="Upcoming Window (days)" value={form.upcomingDays} onChange={(v) => set('upcomingDays', v)} placeholder="30" helpText="Number of days ahead to check for upcoming deadlines" />
                </div>
              )}
              <Checkbox id="includeHistory" label="Include Historical Data" checked={form.includeHistory} onChange={(v) => set('includeHistory', v)} description="Show compliance status changes over the report period" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <SectionHeader icon={BarChart3} title="Report Content" description="What to include in the generated report" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Checkbox id="includeCharts" label="Include Charts & Graphs" checked={form.includeCharts} onChange={(v) => set('includeCharts', v)} description="Visual compliance dashboards and trend charts" />
              <Checkbox id="includeSummaryTable" label="Include Summary Table" checked={form.includeSummaryTable} onChange={(v) => set('includeSummaryTable', v)} description="Fleet-wide compliance status matrix" />
              <Checkbox id="includeDetailedFindings" label="Include Detailed Findings" checked={form.includeDetailedFindings} onChange={(v) => set('includeDetailedFindings', v)} description="Per-vessel detailed compliance breakdown" />
            </div>
            <Separator />
            <div className="space-y-1">
              <Label className="text-sm">Additional Notes</Label>
              <Textarea value={form.additionalNotes} onChange={(e) => set('additionalNotes', e.target.value)} rows={4} placeholder="Any additional context, caveats, or notes to include in the report..." />
            </div>
          </CardContent>
        </Card>
      </div>

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
