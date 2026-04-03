import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, Building2, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (!displayName.trim()) errs.displayName = 'Your name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    setLoading(true);

    try {
      // 1. Create employer (client-generated id avoids requiring SELECT permission immediately after INSERT)
      const employerId = crypto.randomUUID();
      const { error: empError } = await supabase
        .from('employers')
        .insert({ id: employerId, name: companyName.trim() });

      if (empError) throw empError;

      // 1b. Create default workplace using the company name
      const workplaceId = crypto.randomUUID();
      const { error: wpError } = await supabase
        .from('workplaces')
        .insert({ id: workplaceId, employer_id: employerId, name: companyName.trim() } as any);
      if (wpError) throw wpError;

      // 1c. Seed default shifts into the new workplace
      await supabase.rpc('seed_default_shifts', {
        _employer_id: employerId,
        _workplace_id: workplaceId,
      });

      // 2. Update (or create) profile with employer_id and display_name
      const profilePayload = {
        employer_id: employerId,
        display_name: displayName.trim(),
        role: 'employer',
      };

      const { data: updatedProfiles, error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('user_id', user.id)
        .select('*, employers(*)')
        .limit(1);

      if (profileUpdateError) throw profileUpdateError;

      let nextProfile = updatedProfiles?.[0] ?? null;

      if (!nextProfile) {
        const { data: insertedProfile, error: profileInsertError } = await supabase
          .from('profiles')
          .insert({ ...profilePayload, user_id: user.id })
          .select('*, employers(*)')
          .single();

        if (profileInsertError) throw profileInsertError;
        nextProfile = insertedProfile;
      }

      queryClient.setQueryData(['profile'], nextProfile);

      toast({ title: 'Organization created!', description: `Welcome to ${companyName.trim()}` });

      // Send admin alert about new employer signup (fire-and-forget)
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'new-employer-signup',
          recipientEmail: 'seanandchez@gmail.com',
          idempotencyKey: `new-employer-${employerId}`,
          templateData: {
            companyName: companyName.trim(),
            ownerName: displayName.trim(),
            ownerEmail: user.email,
          },
        },
      }).catch(() => {});

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">WorkSchedule</span>
          </div>
          <CardTitle className="text-2xl font-bold">Set up your organization</CardTitle>
          <CardDescription>Create your company to start managing shifts and employees.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Your Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
              {errors.displayName && <p className="text-sm text-error">{errors.displayName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Company / Organization Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  className="pl-10"
                  required
                />
              </div>
              {errors.companyName && <p className="text-sm text-error">{errors.companyName}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Creating...' : 'Create Organization'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
