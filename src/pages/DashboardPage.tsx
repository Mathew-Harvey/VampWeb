import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ship, ClipboardList, CheckCircle, AlertTriangle, Activity, Loader2 } from 'lucide-react';
import { formatRelative } from '@/utils/formatters';

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview, error: overviewError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiClient.get('/dashboard/overview').then((r) => r.data.data),
  });

  const { data: activity, isLoading: loadingActivity, error: activityError } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => apiClient.get('/dashboard/recent-activity').then((r) => r.data.data),
  });

  const fleet = overview?.fleet;
  const wo = overview?.workOrders;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground">Fleet overview and recent activity</p>
      </div>

      {/* Stats Grid */}
      {overviewError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">Failed to load dashboard overview. Please try refreshing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Vessels</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{fleet?.total ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">managed in fleet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold text-green-600">{fleet?.compliant ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">vessels compliant</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
              <ClipboardList className="h-4 w-4 text-ocean" />
            </CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold text-ocean">{wo?.active ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Due for Inspection</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold text-amber-600">{fleet?.dueForInspection ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">vessels need inspection</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Summary + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fleet Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverview ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-5 w-8 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compliant</span>
                  <Badge variant="success">{fleet?.compliant ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Non-Compliant</span>
                  <Badge variant="destructive">{fleet?.nonCompliant ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Due for Inspection</span>
                  <Badge variant="warning">{fleet?.dueForInspection ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Under Review</span>
                  <Badge variant="info">{fleet?.underReview ?? 0}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activityError ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-2" />
                <p className="text-sm text-red-600">Failed to load activity</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activity?.length > 0 ? activity.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-ocean shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 truncate">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actor?.firstName} {entry.actor?.lastName} &middot; {formatRelative(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No recent activity</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
