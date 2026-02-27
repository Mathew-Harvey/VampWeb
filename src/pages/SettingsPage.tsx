import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import apiClient from '@/api/client';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const { user, organisation, setAuth, accessToken } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateProfile = useMutation({
    mutationFn: (data: { firstName: string; lastName: string }) =>
      apiClient.put(`/users/${user?.id}`, data),
    onSuccess: (res) => {
      const updated = res.data.data;
      if (user && accessToken && organisation) {
        setAuth({
          accessToken,
          user: { ...user, firstName: updated.firstName, lastName: updated.lastName },
          organisation,
        });
      }
      setProfileMsg({ type: 'success', text: 'Profile updated' });
    },
    onError: (err: any) => {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    },
  });

  const changePassword = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', data),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ type: 'success', text: 'Password updated' });
    },
    onError: (err: any) => {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password' });
    },
  });

  const handleSaveProfile = () => {
    setProfileMsg(null);
    if (!firstName.trim() || !lastName.trim()) {
      setProfileMsg({ type: 'error', text: 'First and last name are required' });
      return;
    }
    updateProfile.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  const handleChangePassword = () => {
    setPasswordMsg(null);
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue={user?.email} disabled />
          </div>
          {profileMsg && (
            <div className={`flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {profileMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {profileMsg.text}
            </div>
          )}
          <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
          <CardDescription>Your current organisation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{organisation?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{organisation?.type?.replace(/_/g, ' ')}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {passwordMsg && (
            <div className={`flex items-center gap-2 text-sm ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {passwordMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {passwordMsg.text}
            </div>
          )}
          <Button variant="outline" onClick={handleChangePassword} disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
