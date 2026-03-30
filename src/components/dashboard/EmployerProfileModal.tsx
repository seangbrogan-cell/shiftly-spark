import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EmployerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string;
  profile: {
    user_id: string;
    display_name: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    employer_id: string | null;
    employers?: { name: string } | null;
  } | null;
}

export function EmployerProfileModal({ open, onOpenChange, email, profile }: EmployerProfileModalProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setDisplayName(profile.display_name ?? '');
      setPhone((profile as any).phone ?? '');
      setCompanyName((profile as any).employers?.name ?? '');
      setAvatarUrl((profile as any).avatar_url ?? null);
    }
  }, [profile, open]);

  const initials = (displayName || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.user_id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Add cache buster
      const url = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);

      await supabase.from('profiles').update({ avatar_url: url } as any).eq('user_id', profile.user_id);
      toast.success('Avatar updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!displayName.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          phone: phone.trim() || null,
        } as any)
        .eq('user_id', profile.user_id);
      if (profileError) throw profileError;

      // Update company name if changed and employer exists
      if (profile.employer_id && companyName.trim()) {
        const { error: employerError } = await supabase
          .from('employers')
          .update({ name: companyName.trim() })
          .eq('id', profile.employer_id);
        if (employerError) throw employerError;
      }

      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20 border-2 border-border">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <p className="text-xs text-muted-foreground">Click to change photo</p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={email ?? ''}
                disabled
                className="bg-muted"
                placeholder="Loading..."
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Your phone number"
              />
            </div>

            {profile?.employer_id && (
              <div className="space-y-2">
                <Label htmlFor="profile-company">Company Name</Label>
                <Input
                  id="profile-company"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                />
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
