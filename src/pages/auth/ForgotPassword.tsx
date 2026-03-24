import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary-foreground" />
          <span className="text-2xl font-bold text-primary-foreground">WorkSchedule</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight text-primary-foreground">
            Reset your<br />password.
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            We'll send you a link to get back into your account.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/50">© 2026 WorkSchedule. All rights reserved.</p>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start lg:hidden mb-6">
              <Clock className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">WorkSchedule</span>
            </div>
            <CardTitle className="text-2xl font-bold">
              {sent ? 'Check your email' : 'Forgot password'}
            </CardTitle>
            <CardDescription>
              {sent
                ? `We sent a password reset link to ${email}`
                : 'Enter your email and we\'ll send you a reset link'}
            </CardDescription>
          </CardHeader>

          {sent ? (
            <CardFooter className="flex flex-col gap-4">
              <div className="flex items-center justify-center w-full py-4">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <Link to="/auth/login" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
                </Button>
              </Link>
            </CardFooter>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
                <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground text-center">
                  <ArrowLeft className="inline mr-1 h-3 w-3" /> Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
