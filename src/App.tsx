import { Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth.store';
import { authApi } from './api/auth';
import { mediaApi } from './api/media';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import JoinWorkOrderPage from './pages/JoinWorkOrderPage';
import DashboardPage from './pages/DashboardPage';
import VesselsPage from './pages/VesselsPage';
import VesselDetailPage from './pages/VesselDetailPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderDetailPage from './pages/WorkOrderDetailPage';
import InspectionPage from './pages/InspectionPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, setToken } = useAuthStore();
  const queryClient = useQueryClient();
  const refreshAttemptedRef = useRef(false);
  const syncCheckInFlightRef = useRef(false);
  const remoteSyncNoticeShownRef = useRef(false);

  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string } | null>(null);
  const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);

  const showAlert = useCallback((message: string, title = 'Notice') => {
    return new Promise<void>((resolve) => {
      alertResolveRef.current = resolve;
      setAlertModal({ title, message });
    });
  }, []);

  const showConfirm = useCallback((message: string, title = 'Confirm') => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ title, message });
    });
  }, []);

  const dismissAlert = useCallback(() => {
    setAlertModal(null);
    alertResolveRef.current?.();
    alertResolveRef.current = null;
  }, []);

  const resolveConfirm = useCallback((value: boolean) => {
    setConfirmModal(null);
    confirmResolveRef.current?.(value);
    confirmResolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated || refreshAttemptedRef.current) return;
    refreshAttemptedRef.current = true;
    authApi.refresh()
      .then((res) => {
        const token = res?.data?.data?.accessToken;
        if (token) setToken(token);
      })
      .catch(() => {});
  }, [isAuthenticated, setToken]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPendingMediaSync = async () => {
      if (syncCheckInFlightRef.current) return;
      syncCheckInFlightRef.current = true;
      try {
        const response = await mediaApi.getPendingSync();
        const payload = response?.data?.data;
        if (!payload) return;

        if (payload.remoteSyncEnabled === false && !remoteSyncNoticeShownRef.current) {
          remoteSyncNoticeShownRef.current = true;
          await showAlert(
            'Cloud sync is not configured. Media will be stored locally.',
            'Cloud Sync',
          );
          return;
        }

        const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        if (jobs.length === 0) return;

        const selected: typeof jobs = [];
        for (const job of jobs) {
          const yes = await showConfirm(
            `Unsynced media found for ${job.referenceNumber} — "${job.title}" (${job.pendingCount} file${job.pendingCount === 1 ? '' : 's'}). Sync now?`,
            'Media Sync',
          );
          if (yes) selected.push(job);
        }
        if (selected.length === 0) return;

        let total = 0;
        let synced = 0;
        let failed = 0;
        let remaining = 0;

        for (const job of selected) {
          try {
            const syncRes = await mediaApi.syncWorkOrder(job.workOrderId);
            const stats = syncRes?.data?.data;
            if (!stats) continue;
            total += stats.total || 0;
            synced += stats.synced || 0;
            failed += stats.failed || 0;
            remaining += stats.remaining || 0;
          } catch {
            failed += job.pendingCount || 0;
            total += job.pendingCount || 0;
            remaining += job.pendingCount || 0;
          }
        }

        await showAlert(
          `Media sync complete.\n\nTotal: ${total}  ·  Synced: ${synced}  ·  Failed: ${failed}  ·  Remaining: ${remaining}` +
          (remaining > 0 ? '\n\nSome media is still pending; you can retry sync later.' : ''),
          'Sync Results',
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['work-form'] }),
          queryClient.invalidateQueries({ queryKey: ['workOrder'] }),
          queryClient.invalidateQueries({ queryKey: ['reports'] }),
        ]);
      } catch {
        // Silent fail: sync prompt is best-effort and should not block app usage.
      } finally {
        syncCheckInFlightRef.current = false;
      }
    };

    checkPendingMediaSync();
    const onReconnect = () => { checkPendingMediaSync(); };
    window.addEventListener('online', onReconnect);
    return () => {
      window.removeEventListener('online', onReconnect);
    };
  }, [isAuthenticated, queryClient, showAlert, showConfirm]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join-work-order" element={<JoinWorkOrderPage />} />

        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vessels" element={<VesselsPage />} />
          <Route path="vessels/:id" element={<VesselDetailPage />} />
          <Route path="work-orders" element={<WorkOrdersPage />} />
          <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
          <Route path="inspections/:id" element={<InspectionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>

      <Dialog open={!!alertModal} onOpenChange={(open) => { if (!open) dismissAlert(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{alertModal?.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {alertModal?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={dismissAlert}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmModal} onOpenChange={(open) => { if (!open) resolveConfirm(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmModal?.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {confirmModal?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => resolveConfirm(false)}>Cancel</Button>
            <Button onClick={() => resolveConfirm(true)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
