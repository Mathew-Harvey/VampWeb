import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const ROLES = [
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ORGANISATION_ADMIN', label: 'Organisation Admin' },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then((r) => r.data.data),
  });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('OPERATOR');
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const invite = useMutation({
    mutationFn: (body: { email: string; role: string }) =>
      apiClient.post('/users/invite', body),
    onSuccess: () => {
      setInviteMsg({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      setInviteRole('OPERATOR');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      setInviteMsg({ type: 'error', text: err.message || 'Failed to send invitation' });
    },
  });

  const handleInvite = () => {
    setInviteMsg(null);
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteMsg({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }
    invite.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const users = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-muted-foreground">Manage team members and access</p>
        </div>
        <Dialog open={showInvite} onOpenChange={(open) => { setShowInvite(open); if (!open) setInviteMsg(null); }}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Invite User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inviteMsg && (
                <div className={`flex items-center gap-2 text-sm ${inviteMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {inviteMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {inviteMsg.text}
                </div>
              )}
              <Button onClick={handleInvite} disabled={invite.isPending} className="w-full">
                {invite.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-2" />
              <p className="text-red-600">Failed to load users</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell><Badge variant={u.isActive ? 'success' : 'secondary'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
