import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { vesselsApi } from '@/api/vessels';
import { reportsApi, type BFMPReportPayload } from '@/api/reports';
import {
  Ship, Building2, Shield, Anchor, Globe, CalendarDays, AlertTriangle,
  ClipboardList, Wrench, Plus, Trash2, ChevronLeft, Loader2, Save,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Niche area helpers                                                 */
/* ------------------------------------------------------------------ */
const NICHE_AREAS = [
  'Sea chests', 'Bow thruster', 'Stern thruster', 'Rudder',
  'Propeller', 'Shaft', 'Bilge keels', 'Cathodic protection',
  'Anchor chain locker', 'Rope guards', 'Gratings / grilles',
  'Dock block areas', 'Waterline area', 'Boot top area',
] as const;

const AFS_TYPES = [
  'Biocidal Anti-Fouling Coating',
  'Non-Biocidal Foul Release Coating',
  'Hard Coating (Inert)',
  'No Anti-Fouling System',
  'Other',
] as const;

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Very High'] as const;

const INSPECTION_FREQUENCIES = [
  'Monthly', 'Quarterly', 'Bi-Annually', 'Annually', 'As Required',
] as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type NicheAreaEntry = {
  area: string;
  afsType: string;
  lastInspected: string;
  condition: string;
  notes: string;
};

type InspectionRecord = {
  date: string;
  location: string;
  method: string;
  areas: string;
  findings: string;
  actions: string;
};

type MaintenanceRecord = {
  date: string;
  activity: string;
  details: string;
  performedBy: string;
};

type FormState = {
  // Plan Information
  planReference: string;
  revision: string;
  planDate: string;
  preparedBy: string;
  approvedBy: string;
  approvalDate: string;

  // Vessel Details
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

  // Company Details
  companyName: string;
  companyAddress: string;
  ismContactName: string;
  ismContactEmail: string;
  ismContactPhone: string;
  designatedPerson: string;

  // Anti-Fouling System
  hullAfsType: string;
  hullCoatingManufacturer: string;
  hullCoatingProduct: string;
  hullApplicationDate: string;
  hullRecoatingDate: string;
  lastDryDockDate: string;
  nextDryDockDate: string;
  nicheAreas: NicheAreaEntry[];

  // Operating Profile
  tradeRoutes: string;
  typicalVoyageDuration: string;
  typicalPortStay: string;
  waterTempRange: string;
  typicalSpeed: string;
  percentTimeAtAnchor: string;
  layUpPeriods: string;

  // Risk Assessment
  operatingProfileRisk: string;
  nicheAreaRisk: string;
  hullCoatingRisk: string;
  overallRisk: string;
  riskNotes: string;

  // Inspection Schedule
  inspectionFrequency: string;
  lastInspectionDate: string;
  nextInspectionDue: string;
  triggerConditions: string;
  inspectionRecords: InspectionRecord[];

  // Maintenance
  cleaningMethod: string;
  approvedContractors: string;
  captureRequirements: string;
  maintenanceRecords: MaintenanceRecord[];

  // Contingency
  foulingThreshold: string;
  emergencyResponse: string;
  portStateNotification: string;
  contingencyNotes: string;
};

const DEFAULT_NICHE: NicheAreaEntry = { area: '', afsType: '', lastInspected: '', condition: '', notes: '' };
const DEFAULT_INSPECTION: InspectionRecord = { date: '', location: '', method: '', areas: '', findings: '', actions: '' };
const DEFAULT_MAINTENANCE: MaintenanceRecord = { date: '', activity: '', details: '', performedBy: '' };

const DEFAULT_FORM: FormState = {
  planReference: '', revision: '1', planDate: new Date().toISOString().slice(0, 10),
  preparedBy: '', approvedBy: '', approvalDate: '',
  vesselId: '', vesselName: '', imoNumber: '', flagState: '', portOfRegistry: '',
  shipType: '', grossTonnage: '', yearBuilt: '', lengthOverall: '', beam: '',
  maxDraft: '', callSign: '',
  companyName: '', companyAddress: '', ismContactName: '', ismContactEmail: '',
  ismContactPhone: '', designatedPerson: '',
  hullAfsType: '', hullCoatingManufacturer: '', hullCoatingProduct: '',
  hullApplicationDate: '', hullRecoatingDate: '', lastDryDockDate: '', nextDryDockDate: '',
  nicheAreas: NICHE_AREAS.map((area) => ({ ...DEFAULT_NICHE, area })),
  tradeRoutes: '', typicalVoyageDuration: '', typicalPortStay: '',
  waterTempRange: '', typicalSpeed: '', percentTimeAtAnchor: '', layUpPeriods: '',
  operatingProfileRisk: '', nicheAreaRisk: '', hullCoatingRisk: '', overallRisk: '', riskNotes: '',
  inspectionFrequency: 'Bi-Annually', lastInspectionDate: '', nextInspectionDue: '',
  triggerConditions: '', inspectionRecords: [],
  cleaningMethod: '', approvedContractors: '', captureRequirements: '', maintenanceRecords: [],
  foulingThreshold: '', emergencyResponse: '', portStateNotification: '', contingencyNotes: '',
};

/* ------------------------------------------------------------------ */
/*  Reusable field helpers                                             */
/* ------------------------------------------------------------------ */
function TextField({ label, value, onChange, placeholder, required, helpText, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; helpText?: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function LongField({ label, value, onChange, placeholder, rows = 3, helpText }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; helpText?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[] | string[]; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
export default function BFMPReportForm({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState('plan-info');
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Vessel list for pre-filling
  const { data: vesselsRes } = useQuery({
    queryKey: ['vessels'],
    queryFn: () => vesselsApi.list(),
  });
  const vessels = (vesselsRes?.data?.data ?? []) as any[];

  // Auto-fill vessel details when selected
  const handleVesselSelect = (vesselId: string) => {
    const vessel = vessels.find((v: any) => v.id === vesselId);
    if (!vessel) return;
    setForm((prev) => ({
      ...prev,
      vesselId,
      vesselName: vessel.name || '',
      imoNumber: vessel.imoNumber || '',
      flagState: vessel.flagState || '',
      portOfRegistry: vessel.portOfRegistry || '',
      shipType: vessel.type || vessel.vesselType || '',
      grossTonnage: vessel.grossTonnage?.toString() || '',
      yearBuilt: vessel.yearBuilt?.toString() || '',
      lengthOverall: vessel.lengthOverall?.toString() || '',
      beam: vessel.beam?.toString() || '',
      maxDraft: vessel.maxDraft?.toString() || '',
      callSign: vessel.callSign || '',
    }));
  };

  // Niche area helpers
  const updateNiche = (idx: number, patch: Partial<NicheAreaEntry>) => {
    setForm((prev) => ({
      ...prev,
      nicheAreas: prev.nicheAreas.map((n, i) => (i === idx ? { ...n, ...patch } : n)),
    }));
  };
  const addNiche = () => setForm((prev) => ({ ...prev, nicheAreas: [...prev.nicheAreas, { ...DEFAULT_NICHE }] }));
  const removeNiche = (idx: number) => setForm((prev) => ({
    ...prev, nicheAreas: prev.nicheAreas.filter((_, i) => i !== idx),
  }));

  // Inspection record helpers
  const addInspection = () => setForm((prev) => ({
    ...prev, inspectionRecords: [...prev.inspectionRecords, { ...DEFAULT_INSPECTION }],
  }));
  const updateInspection = (idx: number, patch: Partial<InspectionRecord>) => {
    setForm((prev) => ({
      ...prev,
      inspectionRecords: prev.inspectionRecords.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  };
  const removeInspection = (idx: number) => setForm((prev) => ({
    ...prev, inspectionRecords: prev.inspectionRecords.filter((_, i) => i !== idx),
  }));

  // Maintenance record helpers
  const addMaintenance = () => setForm((prev) => ({
    ...prev, maintenanceRecords: [...prev.maintenanceRecords, { ...DEFAULT_MAINTENANCE }],
  }));
  const updateMaintenance = (idx: number, patch: Partial<MaintenanceRecord>) => {
    setForm((prev) => ({
      ...prev,
      maintenanceRecords: prev.maintenanceRecords.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  };
  const removeMaintenance = (idx: number) => setForm((prev) => ({
    ...prev, maintenanceRecords: prev.maintenanceRecords.filter((_, i) => i !== idx),
  }));

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generateBFMP(form as BFMPReportPayload),
    onSuccess: (res) => {
      const payload = res?.data?.data;
      if (payload?.html) {
        reportsApi.openHtmlInNewTab(payload.html);
      }
      setSaveMsg({ type: 'success', text: 'BFMP report generated successfully' });
    },
    onError: (err: any) => {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error?.message || 'Failed to generate BFMP report' });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: () => reportsApi.saveBFMPDraft(form as BFMPReportPayload),
    onSuccess: () => setSaveMsg({ type: 'success', text: 'Draft saved successfully' }),
    onError: (err: any) => {
      setSaveMsg({ type: 'error', text: err?.response?.data?.error?.message || 'Failed to save draft' });
    },
  });

  const TABS = [
    { value: 'plan-info', label: 'Plan Info', icon: ClipboardList },
    { value: 'vessel', label: 'Vessel', icon: Ship },
    { value: 'company', label: 'Company', icon: Building2 },
    { value: 'anti-fouling', label: 'Anti-Fouling', icon: Shield },
    { value: 'operating', label: 'Operating Profile', icon: Globe },
    { value: 'risk', label: 'Risk Assessment', icon: AlertTriangle },
    { value: 'inspections', label: 'Inspections', icon: CalendarDays },
    { value: 'maintenance', label: 'Maintenance', icon: Wrench },
    { value: 'contingency', label: 'Contingency', icon: Anchor },
  ] as const;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Biofouling Management Plan</h1>
            <p className="text-sm text-muted-foreground">IMO-compliant BFMP document generation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSaveMsg(null); saveDraftMutation.mutate(); }} disabled={saveDraftMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => { setSaveMsg(null); generateMutation.mutate(); }} disabled={generateMutation.isPending}>
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {generateMutation.isPending ? 'Generating...' : 'Generate BFMP'}
          </Button>
        </div>
      </div>

      {/* Feedback message */}
      {saveMsg && (
        <div className={`rounded-md px-4 py-3 text-sm ${saveMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-lg">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs px-3 py-2">
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ---- Plan Information ---- */}
        <TabsContent value="plan-info">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={ClipboardList} title="Plan Information" description="Reference details and approval status for this BFMP" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Plan Reference" value={form.planReference} onChange={(v) => set('planReference', v)} placeholder="e.g. BFMP-2024-001" required />
                <TextField label="Revision Number" value={form.revision} onChange={(v) => set('revision', v)} placeholder="e.g. 1" />
                <TextField label="Plan Date" value={form.planDate} onChange={(v) => set('planDate', v)} type="date" required />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Prepared By" value={form.preparedBy} onChange={(v) => set('preparedBy', v)} placeholder="Name of preparer" required />
                <TextField label="Approved By" value={form.approvedBy} onChange={(v) => set('approvedBy', v)} placeholder="Name of approver" />
                <TextField label="Approval Date" value={form.approvalDate} onChange={(v) => set('approvalDate', v)} type="date" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Vessel Details ---- */}
        <TabsContent value="vessel">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={Ship} title="Vessel Details" description="Select a vessel to auto-fill or enter details manually" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm">Select Vessel <span className="text-muted-foreground">(auto-fills details)</span></Label>
                <Select value={form.vesselId} onValueChange={handleVesselSelect}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose a vessel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} {v.imoNumber ? `(IMO ${v.imoNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TextField label="Vessel Name" value={form.vesselName} onChange={(v) => set('vesselName', v)} required />
                <TextField label="IMO Number" value={form.imoNumber} onChange={(v) => set('imoNumber', v)} required />
                <TextField label="Flag State" value={form.flagState} onChange={(v) => set('flagState', v)} />
                <TextField label="Port of Registry" value={form.portOfRegistry} onChange={(v) => set('portOfRegistry', v)} />
                <TextField label="Ship Type" value={form.shipType} onChange={(v) => set('shipType', v)} placeholder="e.g. Bulk Carrier, Tanker" />
                <TextField label="Gross Tonnage" value={form.grossTonnage} onChange={(v) => set('grossTonnage', v)} />
                <TextField label="Year Built" value={form.yearBuilt} onChange={(v) => set('yearBuilt', v)} />
                <TextField label="Length Overall (m)" value={form.lengthOverall} onChange={(v) => set('lengthOverall', v)} />
                <TextField label="Beam (m)" value={form.beam} onChange={(v) => set('beam', v)} />
                <TextField label="Maximum Draft (m)" value={form.maxDraft} onChange={(v) => set('maxDraft', v)} />
                <TextField label="Call Sign" value={form.callSign} onChange={(v) => set('callSign', v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Company Details ---- */}
        <TabsContent value="company">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={Building2} title="Company Details" description="Ship operator and ISM management details" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Company Name" value={form.companyName} onChange={(v) => set('companyName', v)} required />
                <TextField label="Designated Person" value={form.designatedPerson} onChange={(v) => set('designatedPerson', v)} helpText="Designated Person Ashore (DPA)" />
              </div>
              <LongField label="Company Address" value={form.companyAddress} onChange={(v) => set('companyAddress', v)} rows={2} />
              <Separator />
              <p className="text-sm font-medium text-slate-700">ISM Contact</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="Contact Name" value={form.ismContactName} onChange={(v) => set('ismContactName', v)} />
                <TextField label="Email" value={form.ismContactEmail} onChange={(v) => set('ismContactEmail', v)} type="email" />
                <TextField label="Phone" value={form.ismContactPhone} onChange={(v) => set('ismContactPhone', v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Anti-Fouling System ---- */}
        <TabsContent value="anti-fouling">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={Shield} title="Anti-Fouling System" description="Hull coating and niche area anti-fouling details" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hull AFS */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Hull Anti-Fouling System</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="AFS Type" value={form.hullAfsType} onChange={(v) => set('hullAfsType', v)} options={AFS_TYPES} required />
                  <TextField label="Coating Manufacturer" value={form.hullCoatingManufacturer} onChange={(v) => set('hullCoatingManufacturer', v)} placeholder="e.g. International, Jotun, Hempel" />
                  <TextField label="Product Name" value={form.hullCoatingProduct} onChange={(v) => set('hullCoatingProduct', v)} placeholder="e.g. Intersmooth 7460HS" />
                  <TextField label="Application Date" value={form.hullApplicationDate} onChange={(v) => set('hullApplicationDate', v)} type="date" />
                  <TextField label="Recoating Due Date" value={form.hullRecoatingDate} onChange={(v) => set('hullRecoatingDate', v)} type="date" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <TextField label="Last Dry Dock Date" value={form.lastDryDockDate} onChange={(v) => set('lastDryDockDate', v)} type="date" />
                  <TextField label="Next Dry Dock Due" value={form.nextDryDockDate} onChange={(v) => set('nextDryDockDate', v)} type="date" />
                </div>
              </div>

              <Separator />

              {/* Niche Areas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Niche Area Assessment</p>
                  <Button variant="outline" size="sm" onClick={addNiche}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Area
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Niche areas are surfaces or structures prone to biofouling accumulation. Assess each area individually.
                </p>
                <div className="space-y-3">
                  {form.nicheAreas.map((niche, idx) => (
                    <div key={idx} className="rounded-md border p-3 space-y-3 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{niche.area || `Area ${idx + 1}`}</Badge>
                        {!NICHE_AREAS.includes(niche.area as any) && (
                          <Button variant="ghost" size="sm" onClick={() => removeNiche(idx)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <TextField label="Area" value={niche.area} onChange={(v) => updateNiche(idx, { area: v })} />
                        <SelectField label="AFS Type" value={niche.afsType} onChange={(v) => updateNiche(idx, { afsType: v })} options={AFS_TYPES} />
                        <TextField label="Last Inspected" value={niche.lastInspected} onChange={(v) => updateNiche(idx, { lastInspected: v })} type="date" />
                        <SelectField label="Condition" value={niche.condition} onChange={(v) => updateNiche(idx, { condition: v })} options={['Good', 'Fair', 'Poor', 'Critical', 'Not Assessed']} />
                      </div>
                      <LongField label="Notes" value={niche.notes} onChange={(v) => updateNiche(idx, { notes: v })} rows={2} placeholder="Observations, maintenance notes..." />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Operating Profile ---- */}
        <TabsContent value="operating">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={Globe} title="Operating Profile" description="Vessel trading patterns and environmental exposure" />
            </CardHeader>
            <CardContent className="space-y-4">
              <LongField label="Trade Routes" value={form.tradeRoutes} onChange={(v) => set('tradeRoutes', v)} placeholder="e.g. Trans-Pacific, North Atlantic, Southeast Asian coastal..." rows={3} helpText="Describe typical trading areas and transit routes" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TextField label="Typical Voyage Duration" value={form.typicalVoyageDuration} onChange={(v) => set('typicalVoyageDuration', v)} placeholder="e.g. 14-21 days" />
                <TextField label="Typical Port Stay" value={form.typicalPortStay} onChange={(v) => set('typicalPortStay', v)} placeholder="e.g. 3-5 days" />
                <TextField label="Water Temperature Range" value={form.waterTempRange} onChange={(v) => set('waterTempRange', v)} placeholder="e.g. 15-30°C" />
                <TextField label="Typical Speed (knots)" value={form.typicalSpeed} onChange={(v) => set('typicalSpeed', v)} placeholder="e.g. 12-14 knots" />
                <TextField label="% Time at Anchor/Idle" value={form.percentTimeAtAnchor} onChange={(v) => set('percentTimeAtAnchor', v)} placeholder="e.g. 10%" helpText="Percentage of operational time spent stationary" />
              </div>
              <LongField label="Lay-Up Periods" value={form.layUpPeriods} onChange={(v) => set('layUpPeriods', v)} rows={2} placeholder="Describe any planned or historical lay-up periods and durations" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Risk Assessment ---- */}
        <TabsContent value="risk">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={AlertTriangle} title="Biofouling Risk Assessment" description="Assess risk factors contributing to biofouling accumulation" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField label="Operating Profile Risk" value={form.operatingProfileRisk} onChange={(v) => set('operatingProfileRisk', v)} options={RISK_LEVELS} required />
                <SelectField label="Niche Area Risk" value={form.nicheAreaRisk} onChange={(v) => set('nicheAreaRisk', v)} options={RISK_LEVELS} required />
                <SelectField label="Hull Coating Risk" value={form.hullCoatingRisk} onChange={(v) => set('hullCoatingRisk', v)} options={RISK_LEVELS} required />
                <SelectField label="Overall Risk Rating" value={form.overallRisk} onChange={(v) => set('overallRisk', v)} options={RISK_LEVELS} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border p-3 bg-amber-50/50">
                  <p className="text-xs font-medium text-amber-800 mb-1">Risk Level Guide</p>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    <li><strong>Low</strong> — Trading in temperate waters, short idle periods, good AFS</li>
                    <li><strong>Medium</strong> — Mixed trading, moderate idle, aging AFS</li>
                    <li><strong>High</strong> — Tropical waters, extended idle, poor AFS condition</li>
                    <li><strong>Very High</strong> — Prolonged lay-up in warm waters, no AFS</li>
                  </ul>
                </div>
                <div />
              </div>
              <LongField label="Risk Assessment Notes" value={form.riskNotes} onChange={(v) => set('riskNotes', v)} rows={4} placeholder="Additional risk factors, mitigating measures, or justification for risk ratings..." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Inspections ---- */}
        <TabsContent value="inspections">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={CalendarDays} title="In-Water Inspection Schedule" description="Planned inspection frequency and historical inspection records" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Inspection Schedule</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SelectField label="Inspection Frequency" value={form.inspectionFrequency} onChange={(v) => set('inspectionFrequency', v)} options={INSPECTION_FREQUENCIES} required />
                  <TextField label="Last Inspection Date" value={form.lastInspectionDate} onChange={(v) => set('lastInspectionDate', v)} type="date" />
                  <TextField label="Next Inspection Due" value={form.nextInspectionDue} onChange={(v) => set('nextInspectionDue', v)} type="date" />
                </div>
                <div className="mt-4">
                  <LongField label="Trigger Conditions for Reactive Inspection" value={form.triggerConditions} onChange={(v) => set('triggerConditions', v)} rows={3} placeholder="e.g. Extended idle period > 30 days in tropical waters, speed loss > 10%, port state requirement..." />
                </div>
              </div>

              <Separator />

              {/* Inspection Records */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Inspection Records</p>
                  <Button variant="outline" size="sm" onClick={addInspection}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Record
                  </Button>
                </div>
                {form.inspectionRecords.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No inspection records added. Click "Add Record" to log a past or upcoming inspection.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.inspectionRecords.map((record, idx) => (
                      <div key={idx} className="rounded-md border p-3 space-y-3 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">Inspection {idx + 1}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => removeInspection(idx)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <TextField label="Date" value={record.date} onChange={(v) => updateInspection(idx, { date: v })} type="date" />
                          <TextField label="Location" value={record.location} onChange={(v) => updateInspection(idx, { location: v })} placeholder="Port / anchorage" />
                          <TextField label="Method" value={record.method} onChange={(v) => updateInspection(idx, { method: v })} placeholder="e.g. Diver, ROV, Drone" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <LongField label="Areas Inspected" value={record.areas} onChange={(v) => updateInspection(idx, { areas: v })} rows={2} />
                          <LongField label="Findings" value={record.findings} onChange={(v) => updateInspection(idx, { findings: v })} rows={2} />
                          <LongField label="Actions Taken" value={record.actions} onChange={(v) => updateInspection(idx, { actions: v })} rows={2} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Maintenance ---- */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={Wrench} title="Cleaning & Maintenance" description="Cleaning procedures, approved contractors, and maintenance history" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LongField label="Cleaning Method" value={form.cleaningMethod} onChange={(v) => set('cleaningMethod', v)} rows={3} placeholder="e.g. In-water grooming, divers with brushes, ROV cleaning system..." />
                <LongField label="Approved Contractors" value={form.approvedContractors} onChange={(v) => set('approvedContractors', v)} rows={3} placeholder="List approved cleaning contractors and their locations" />
              </div>
              <LongField label="Capture & Disposal Requirements" value={form.captureRequirements} onChange={(v) => set('captureRequirements', v)} rows={3} placeholder="Requirements for debris capture, filtration, and waste disposal during cleaning operations" />

              <Separator />

              {/* Maintenance Records */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Maintenance Records</p>
                  <Button variant="outline" size="sm" onClick={addMaintenance}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Record
                  </Button>
                </div>
                {form.maintenanceRecords.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No maintenance records added. Click "Add Record" to log cleaning or maintenance activity.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.maintenanceRecords.map((record, idx) => (
                      <div key={idx} className="rounded-md border p-3 space-y-3 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">Maintenance {idx + 1}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => removeMaintenance(idx)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          <TextField label="Date" value={record.date} onChange={(v) => updateMaintenance(idx, { date: v })} type="date" />
                          <TextField label="Activity" value={record.activity} onChange={(v) => updateMaintenance(idx, { activity: v })} placeholder="e.g. Hull cleaning" />
                          <TextField label="Performed By" value={record.performedBy} onChange={(v) => updateMaintenance(idx, { performedBy: v })} />
                          <div /> {/* spacer */}
                        </div>
                        <LongField label="Details" value={record.details} onChange={(v) => updateMaintenance(idx, { details: v })} rows={2} placeholder="Description of work performed, areas covered, results..." />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Contingency ---- */}
        <TabsContent value="contingency">
          <Card>
            <CardHeader className="pb-4">
              <SectionHeader icon={Anchor} title="Contingency Measures" description="Response procedures for high fouling events" />
            </CardHeader>
            <CardContent className="space-y-4">
              <LongField label="Fouling Threshold for Action" value={form.foulingThreshold} onChange={(v) => set('foulingThreshold', v)} rows={3} placeholder="Define the fouling level (e.g. IMO FR 3+) that triggers cleaning or management action" />
              <LongField label="Emergency Cleaning Response" value={form.emergencyResponse} onChange={(v) => set('emergencyResponse', v)} rows={4} placeholder="Steps to take when fouling exceeds acceptable thresholds, including emergency cleaning procedures and timeline" />
              <LongField label="Port State Notification Procedures" value={form.portStateNotification} onChange={(v) => set('portStateNotification', v)} rows={3} placeholder="Procedure for notifying destination port state authorities if biofouling risk is elevated" />
              <LongField label="Additional Contingency Notes" value={form.contingencyNotes} onChange={(v) => set('contingencyNotes', v)} rows={3} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSaveMsg(null); saveDraftMutation.mutate(); }} disabled={saveDraftMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => { setSaveMsg(null); generateMutation.mutate(); }} disabled={generateMutation.isPending}>
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {generateMutation.isPending ? 'Generating...' : 'Generate BFMP'}
          </Button>
        </div>
      </div>
    </div>
  );
}
