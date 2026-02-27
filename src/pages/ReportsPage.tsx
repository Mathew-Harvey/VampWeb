import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Download, Loader2, ClipboardCheck, Ship,
  BarChart3, ScrollText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workOrdersApi } from '@/api/work-orders';
import { reportsApi } from '@/api/reports';
import BFMPReportForm from '@/components/reports/BFMPReportForm';
import ComplianceSummaryForm from '@/components/reports/ComplianceSummaryForm';
import AuditReportForm from '@/components/reports/AuditReportForm';

type ReportKind = 'inspection' | 'work-order' | 'bfmp' | 'compliance' | 'audit';
type ActiveView = 'grid' | 'bfmp' | 'compliance' | 'audit';

const REPORT_CONFIG: Array<{
  id: ReportKind;
  title: string;
  desc: string;
  icon: typeof FileText;
  needsWorkOrder: boolean;
  status: 'active' | 'new';
}> = [
  { id: 'inspection', title: 'Inspection Report', desc: 'Detailed inspection findings with photos and measurements', icon: ClipboardCheck, needsWorkOrder: true, status: 'active' },
  { id: 'work-order', title: 'Work Order Report', desc: 'Complete work order lifecycle with all submissions', icon: FileText, needsWorkOrder: true, status: 'active' },
  { id: 'bfmp', title: 'BFMP', desc: 'IMO-compliant Biofouling Management Plan with vessel details, AFS, and risk assessment', icon: Ship, needsWorkOrder: false, status: 'new' },
  { id: 'compliance', title: 'Compliance Summary', desc: 'Fleet-wide compliance status overview across all regulatory categories', icon: BarChart3, needsWorkOrder: false, status: 'new' },
  { id: 'audit', title: 'Audit Report', desc: 'Filtered audit trail export with configurable scope and event types', icon: ScrollText, needsWorkOrder: false, status: 'new' },
];

export default function ReportsPage() {
  const [activeView, setActiveView] = useState<ActiveView>('grid');
  const [reportType, setReportType] = useState<ReportKind | null>(null);
  const [workOrderId, setWorkOrderId] = useState('');

  const { data: workOrdersRes, isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['workOrders', { limit: '100' }],
    queryFn: () => workOrdersApi.list({ limit: '100' }),
    enabled: reportType === 'inspection' || reportType === 'work-order',
  });
  const workOrders = workOrdersRes?.data?.data ?? [];

  const generateMutation = useMutation({
    mutationFn: ({ type, workOrderId }: { type: 'inspection' | 'work-order'; workOrderId: string }) =>
      reportsApi.generate(type, workOrderId),
  });

  const handleGenerateClick = (report: (typeof REPORT_CONFIG)[0]) => {
    if (report.needsWorkOrder) {
      setWorkOrderId('');
      setReportType(report.id as 'inspection' | 'work-order');
      return;
    }
    // Navigate to dedicated form for non-work-order reports
    if (report.id === 'bfmp') setActiveView('bfmp');
    else if (report.id === 'compliance') setActiveView('compliance');
    else if (report.id === 'audit') setActiveView('audit');
  };

  const handleConfirmGenerate = () => {
    if (reportType !== 'inspection' && reportType !== 'work-order') return;
    if (!workOrderId) return;

    if (reportType === 'inspection') {
      const url = reportsApi.getViewUrl(workOrderId);
      window.open(url, '_blank', 'noopener,noreferrer');
      setReportType(null);
      return;
    }

    generateMutation.mutate(
      { type: 'work-order', workOrderId },
      {
        onSuccess: (res) => {
          const payload = res?.data?.data;
          if (payload) {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const u = URL.createObjectURL(blob);
            window.open(u, '_blank');
            setTimeout(() => URL.revokeObjectURL(u), 1000);
          }
          setReportType(null);
        },
      }
    );
  };

  const handleOpenContext = () => {
    if (!workOrderId) return;
    const url = reportsApi.getContextUrl(workOrderId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const needsWorkOrder = reportType === 'inspection' || reportType === 'work-order';
  const canConfirm = workOrderId && needsWorkOrder;
  const isGenerating = generateMutation.isPending;

  // Render active form view
  if (activeView === 'bfmp') return <BFMPReportForm onBack={() => setActiveView('grid')} />;
  if (activeView === 'compliance') return <ComplianceSummaryForm onBack={() => setActiveView('grid')} />;
  if (activeView === 'audit') return <AuditReportForm onBack={() => setActiveView('grid')} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-muted-foreground">Generate and download compliance reports</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_CONFIG.map((report) => {
          const ReportIcon = report.icon;
          return (
            <Card key={report.id} className="relative overflow-hidden transition-shadow hover:shadow-md">
              {report.status === 'new' && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-ocean text-white text-xs">New</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ocean/10 mb-2">
                  <ReportIcon className="h-6 w-6 text-ocean" />
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription className="text-sm">{report.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleGenerateClick(report)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {report.needsWorkOrder ? 'Generate' : 'Configure & Generate'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Work order selection for Inspection / Work Order reports */}
      <Dialog open={needsWorkOrder} onOpenChange={(open) => !open && setReportType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reportType === 'inspection' ? 'Inspection Report' : 'Work Order Report'}
            </DialogTitle>
            <DialogDescription>
              Select a work order. Use context for integration/debug, preview/generate for final output.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Work order</Label>
              <Select
                value={workOrderId}
                onValueChange={setWorkOrderId}
                disabled={loadingWorkOrders}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingWorkOrders ? 'Loading...' : 'Select work order'} />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map((wo: any) => (
                    <SelectItem key={wo.id} value={wo.id}>
                      {wo.referenceNumber} – {wo.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportType(null)}>
              Cancel
            </Button>
            {reportType === 'inspection' && (
              <Button variant="outline" onClick={handleOpenContext} disabled={!canConfirm}>
                Open context (debug)
              </Button>
            )}
            <Button onClick={handleConfirmGenerate} disabled={!canConfirm || (reportType === 'work-order' && isGenerating)}>
              {reportType === 'work-order' && isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reportType === 'inspection' ? 'Open viewer' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
