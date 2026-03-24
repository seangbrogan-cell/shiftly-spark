import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary-foreground" />
          <span className="text-2xl font-bold text-primary-foreground">Shiftly</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight text-primary-foreground">
            Scheduling made<br />simple.
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Manage shifts, teams, and availability — all in one place.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/50">© 2026 Shiftly. All rights reserved.</p>
      </div>

      {/* Right - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-none">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start lg:hidden mb-6">
              <Clock className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">Shiftly</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Don't have an account?{' '}
                <Link to="/auth/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
