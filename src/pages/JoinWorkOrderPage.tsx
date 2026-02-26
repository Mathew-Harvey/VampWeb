import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function JoinWorkOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('inviteToken') || '';
  const { isAuthenticated } = useAuthStore();
  const [code, setCode] = useState('');

  const details = useQuery({
    queryKey: ['invite-resolve', token],
    enabled: !!token,
    queryFn: () => apiClient.get('/invites/work-orders/resolve', { params: { token } }).then((r) => r.data.data),
  });

  const redeem = useMutation({
    mutationFn: () => apiClient.post('/invites/work-orders/redeem', { token, code }),
    onSuccess: (res) => {
      const workOrderId = res.data?.data?.workOrder?.id;
      if (workOrderId) {
        navigate(`/work-orders/${workOrderId}`);
        return;
      }
      navigate('/work-orders');
    },
  });

  const invitedEmail = details.data?.email || '';
  const workOrder = details.data?.workOrder;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Invalid invite link</CardTitle>
            <CardDescription>This link is missing an invite token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Join work order collaboration</CardTitle>
          <CardDescription>
            Open this invite by entering the code shared with you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {details.isLoading && <p className="text-sm text-muted-foreground">Loading invite details...</p>}
          {details.error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">
                {(details.error as any)?.response?.data?.error?.message || 'This invitation is invalid or expired.'}
              </p>
            </div>
          )}

          {details.data && (
            <div className="rounded-md border bg-slate-50 p-3 space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">Invited email:</span> {invitedEmail}</p>
              {workOrder && (
                <>
                  <p className="text-sm"><span className="text-muted-foreground">Work order:</span> {workOrder.referenceNumber}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Title:</span> {workOrder.title}</p>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              placeholder="Enter 6+ character invite code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>

          {redeem.error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">
                {(redeem.error as any)?.response?.data?.error?.message || 'Could not join this work order.'}
              </p>
            </div>
          )}

          {isAuthenticated ? (
            <Button
              className="w-full"
              onClick={() => redeem.mutate()}
              disabled={!code.trim() || redeem.isPending || details.isLoading || !!details.error}
            >
              {redeem.isPending ? 'Joining...' : 'Join work order'}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Sign in or create an account with the invited email before joining.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link to={`/login${invitedEmail ? `?email=${encodeURIComponent(invitedEmail)}` : ''}`}>Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to={`/register${invitedEmail ? `?email=${encodeURIComponent(invitedEmail)}` : ''}`}>Create account</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
