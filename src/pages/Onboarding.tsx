import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

      // 2. Update profile with employer_id and display_name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          employer_id: employerId,
          display_name: displayName.trim(),
          role: 'employer',
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Organization created!', description: `Welcome to ${companyName.trim()}` });
      navigate('/dashboard');
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
