import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi, type ReportConfigPayload } from '@/api/reports';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AssetField = 'coverImage' | 'clientLogo' | 'generalArrangementImage';
type SignoffRole = 'supervisor' | 'inspector';

const DEFAULT_CONFIG: ReportConfigPayload = {
  title: '',
  workInstruction: '',
  summary: '',
  overview: '',
  methodology: '',
  recommendations: '',
  visibility: '',
  clientDetails: '',
  buyerName: '',
  reviewerName: '',
  berthAnchorageLocation: '',
  togglePhotoName: false,
  supervisorName: '',
  inspectorName: '',
  coverImage: {},
  clientLogo: {},
  generalArrangementImage: {},
  signoff: {
    supervisor: { name: '', declaration: '', signature: '', mode: 'dark', date: '' },
    inspector: { name: '', declaration: '', signature: '', mode: 'dark', date: '' },
  },
};

export default function ReportSettingsPanel({ workOrderId }: { workOrderId: string }) {
  const [config, setConfig] = useState<ReportConfigPayload>(DEFAULT_CONFIG);
  const [initialized, setInitialized] = useState(false);
  const [uploadingField, setUploadingField] = useState<AssetField | null>(null);
  const mediaUpload = useMediaUpload();

  const configQuery = useQuery({
    queryKey: ['report-config', workOrderId],
    queryFn: () => reportsApi.getConfig(workOrderId).then((r) => r.data.data || {}),
    enabled: !!workOrderId,
  });

  useEffect(() => {
    if (initialized || !configQuery.data) return;
    setConfig({
      ...DEFAULT_CONFIG,
      ...configQuery.data,
      signoff: {
        ...DEFAULT_CONFIG.signoff,
        ...(configQuery.data.signoff || {}),
        supervisor: {
          ...DEFAULT_CONFIG.signoff?.supervisor,
          ...(configQuery.data.signoff?.supervisor || {}),
        },
        inspector: {
          ...DEFAULT_CONFIG.signoff?.inspector,
          ...(configQuery.data.signoff?.inspector || {}),
        },
      },
    });
    setInitialized(true);
  }, [configQuery.data, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => reportsApi.updateConfig(workOrderId, config),
    onSuccess: (res) => {
      setConfig((prev) => ({ ...prev, ...(res.data.data || {}) }));
    },
  });

  const setAssetMediaId = (field: AssetField, mediaId: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: mediaId ? { mediaId } : {},
    }));
  };

  const uploadAsset = async (field: AssetField, file: File) => {
    setUploadingField(field);
    try {
      const media = await mediaUpload.mutateAsync({ file, workOrderId });
      setAssetMediaId(field, media.id);
    } finally {
      setUploadingField(null);
    }
  };

  const updateSignoff = (role: SignoffRole, patch: Partial<NonNullable<NonNullable<ReportConfigPayload['signoff']>[SignoffRole]>>) => {
    setConfig((prev) => ({
      ...prev,
      signoff: {
        ...(prev.signoff || {}),
        [role]: {
          ...(prev.signoff?.[role] || {}),
          ...patch,
        },
      },
    }));
  };

  const openViewer = () => window.open(reportsApi.getViewUrl(workOrderId), '_blank', 'noopener,noreferrer');
  const openPreview = () => window.open(reportsApi.getPreviewUrl(workOrderId), '_blank', 'noopener,noreferrer');
  const openContext = () => window.open(reportsApi.getContextUrl(workOrderId), '_blank', 'noopener,noreferrer');

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Report Settings</CardTitle>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={openContext}>Context</Button>
          <Button type="button" size="sm" variant="outline" onClick={openPreview}>Raw HTML</Button>
          <Button type="button" size="sm" onClick={openViewer}>Open Viewer</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField label="Report title" value={config.title || ''} onChange={(v) => setConfig((p) => ({ ...p, title: v }))} />
          <TextField label="Work instruction" value={config.workInstruction || ''} onChange={(v) => setConfig((p) => ({ ...p, workInstruction: v }))} />
          <TextField label="Visibility" value={config.visibility || ''} onChange={(v) => setConfig((p) => ({ ...p, visibility: v }))} />
          <TextField label="Client details" value={config.clientDetails || ''} onChange={(v) => setConfig((p) => ({ ...p, clientDetails: v }))} />
          <TextField label="Buyer name" value={config.buyerName || ''} onChange={(v) => setConfig((p) => ({ ...p, buyerName: v }))} />
          <TextField label="Reviewer name" value={config.reviewerName || ''} onChange={(v) => setConfig((p) => ({ ...p, reviewerName: v }))} />
          <TextField label="Berth/anchorage location" value={config.berthAnchorageLocation || ''} onChange={(v) => setConfig((p) => ({ ...p, berthAnchorageLocation: v }))} />
          <TextField label="Supervisor name" value={config.supervisorName || ''} onChange={(v) => setConfig((p) => ({ ...p, supervisorName: v }))} />
          <TextField label="Inspector name" value={config.inspectorName || ''} onChange={(v) => setConfig((p) => ({ ...p, inspectorName: v }))} />
          <div className="flex items-center gap-2 pt-6">
            <input
              id="togglePhotoName"
              type="checkbox"
              checked={Boolean(config.togglePhotoName)}
              onChange={(e) => setConfig((p) => ({ ...p, togglePhotoName: e.target.checked }))}
            />
            <Label htmlFor="togglePhotoName">Show photo names in report</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LongField label="Summary (HTML supported)" value={config.summary || ''} onChange={(v) => setConfig((p) => ({ ...p, summary: v }))} />
          <LongField label="Overview (HTML supported)" value={config.overview || ''} onChange={(v) => setConfig((p) => ({ ...p, overview: v }))} />
          <LongField label="Methodology (HTML supported)" value={config.methodology || ''} onChange={(v) => setConfig((p) => ({ ...p, methodology: v }))} />
          <LongField label="Recommendations (HTML supported)" value={config.recommendations || ''} onChange={(v) => setConfig((p) => ({ ...p, recommendations: v }))} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AssetPicker
            label="Cover image"
            mediaId={(config.coverImage as any)?.mediaId || ''}
            uploading={uploadingField === 'coverImage'}
            onMediaIdChange={(id) => setAssetMediaId('coverImage', id)}
            onUpload={(file) => uploadAsset('coverImage', file)}
          />
          <AssetPicker
            label="Client logo"
            mediaId={(config.clientLogo as any)?.mediaId || ''}
            uploading={uploadingField === 'clientLogo'}
            onMediaIdChange={(id) => setAssetMediaId('clientLogo', id)}
            onUpload={(file) => uploadAsset('clientLogo', file)}
          />
          <AssetPicker
            label="General arrangement image"
            mediaId={(config.generalArrangementImage as any)?.mediaId || ''}
            uploading={uploadingField === 'generalArrangementImage'}
            onMediaIdChange={(id) => setAssetMediaId('generalArrangementImage', id)}
            onUpload={(file) => uploadAsset('generalArrangementImage', file)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SignoffEditor
            title="Supervisor signoff"
            value={config.signoff?.supervisor || {}}
            onChange={(patch) => updateSignoff('supervisor', patch)}
          />
          <SignoffEditor
            title="Inspector signoff"
            value={config.signoff?.inspector || {}}
            onChange={(patch) => updateSignoff('inspector', patch)}
          />
        </div>

        {configQuery.error && (
          <p className="text-sm text-red-600">{(configQuery.error as any)?.response?.data?.error?.message || 'Failed to load config'}</p>
        )}
        {saveMutation.error && (
          <p className="text-sm text-red-600">{(saveMutation.error as any)?.response?.data?.error?.message || 'Failed to save config'}</p>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || configQuery.isLoading}>
            {saveMutation.isPending ? 'Saving...' : 'Save Report Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LongField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
    </div>
  );
}

function AssetPicker({
  label,
  mediaId,
  uploading,
  onMediaIdChange,
  onUpload,
}: {
  label: string;
  mediaId: string;
  uploading: boolean;
  onMediaIdChange: (id: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-1 rounded-md border p-3">
      <Label>{label}</Label>
      <Input placeholder="Media ID" value={mediaId} onChange={(e) => onMediaIdChange(e.target.value)} />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.currentTarget.value = '';
        }}
      />
      <p className="text-xs text-muted-foreground">{uploading ? 'Uploading...' : 'Upload image or paste media ID'}</p>
    </div>
  );
}

function SignoffEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: { name?: string; declaration?: string; signature?: string; mode?: string; date?: string };
  onChange: (patch: Partial<{ name?: string; declaration?: string; signature?: string; mode?: string; date?: string }>) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <TextField label="Name" value={value.name || ''} onChange={(v) => onChange({ name: v })} />
      <LongField label="Declaration (HTML supported)" value={value.declaration || ''} onChange={(v) => onChange({ declaration: v })} />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Mode" value={value.mode || ''} onChange={(v) => onChange({ mode: v })} />
        <TextField label="Date (ISO)" value={value.date || ''} onChange={(v) => onChange({ date: v })} />
      </div>
      <SignaturePad
        value={value.signature || ''}
        onChange={(sig) => onChange({ signature: sig, date: value.date || new Date().toISOString() })}
      />
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (sig: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  }, []);

  const getPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    drawingRef.current = false;
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label>Signature (sign on glass)</Label>
      <canvas
        ref={canvasRef}
        className="w-full h-32 rounded border bg-white touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={clearSignature}>Clear</Button>
        <Button type="button" size="sm" onClick={saveSignature}>Use signature</Button>
      </div>
      {value && (
        <img src={value} alt="Signature preview" className="h-16 rounded border bg-white" />
      )}
    </div>
  );
}
