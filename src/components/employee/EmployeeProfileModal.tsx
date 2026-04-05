import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-dashboard-data';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EmployeeProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeProfileModal({ open, onOpenChange }: EmployeeProfileModalProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user?.email ?? ''} disabled className="mt-1 bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
          </div>
          <div>
            <Label htmlFor="profile-name">Display Name</Label>
            <Input
              id="profile-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
