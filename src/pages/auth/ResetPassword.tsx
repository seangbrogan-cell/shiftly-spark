import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/auth/login');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary-foreground" />
          <span className="text-2xl font-bold text-primary-foreground">Shiftly</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight text-primary-foreground">
            Set a new<br />password.
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Choose a strong password to secure your account.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/50">© 2026 Shiftly. All rights reserved.</p>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start lg:hidden mb-6">
              <Clock className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">Shiftly</span>
            </div>
            <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
            <CardDescription>
              {ready ? 'Enter your new password below' : 'Verifying your reset link...'}
            </CardDescription>
          </CardHeader>

          {ready ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Updating...' : 'Update password'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent>
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
