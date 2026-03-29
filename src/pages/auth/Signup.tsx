import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock, ArrowRight } from 'lucide-react';

export default function Signup() {
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [accountType, setAccountType] = useState<'employer' | 'employee' | null>(null);
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const metadata: Record<string, string> = { account_type: accountType! };
    if (accountType === 'employee') {
      metadata.company_name = companyName.trim();
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });

    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
      navigate('/auth/login');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-12">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary-foreground" />
          <span className="text-2xl font-bold text-primary-foreground">WorkSchedule</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight text-primary-foreground">
            Start scheduling<br />in minutes.
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Create your team, set availability, and publish shifts instantly.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/50">© 2026 WorkSchedule. All rights reserved.</p>
      </div>

      {/* Right - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        {step === 'role' ? (
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader className="space-y-1 text-center lg:text-left">
              <div className="flex items-center gap-2 justify-center lg:justify-start lg:hidden mb-6">
                <Clock className="h-7 w-7 text-primary" />
                <span className="text-xl font-bold text-foreground">WorkSchedule</span>
              </div>
              <CardTitle className="text-2xl font-bold">How will you use WorkSchedule?</CardTitle>
              <CardDescription>Choose the option that best describes you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => { setAccountType('employer'); setStep('form'); }}
                className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all text-left group"
              >
                <div className="rounded-full p-2.5 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">I'm an employer</p>
                  <p className="text-sm text-muted-foreground mt-0.5">I want to create an organization and manage my team's schedule</p>
                </div>
              </button>
              <button
                onClick={() => { setAccountType('employee'); setStep('form'); }}
                className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent/50 transition-all text-left group"
              >
                <div className="rounded-full p-2.5 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">I'm an employee</p>
                  <p className="text-sm text-muted-foreground mt-0.5">My employer has invited me and I need to create my account</p>
                </div>
              </button>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground text-center w-full">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader className="space-y-1 text-center lg:text-left">
              <div className="flex items-center gap-2 justify-center lg:justify-start lg:hidden mb-6">
                <Clock className="h-7 w-7 text-primary" />
                <span className="text-xl font-bold text-foreground">WorkSchedule</span>
              </div>
              <button
                onClick={() => setStep('role')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-2"
              >
                ← Back
              </button>
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>
                {accountType === 'employer'
                  ? 'Set up your employer account to start scheduling'
                  : 'Create your employee account to view your shifts'}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                {accountType === 'employee' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Enter your employer's company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="pl-10"
                        required
                        maxLength={100}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the exact company name your employer registered with
                    </p>
                  </div>
                )}
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="showPassword" checked={showPassword} onCheckedChange={(v) => setShowPassword(!!v)} />
                  <Label htmlFor="showPassword" className="text-sm font-normal text-muted-foreground cursor-pointer">Show password</Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{' '}
                  <Link to="/auth/login" className="font-medium text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
      {/* Right - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        {step === 'role' ? <RoleSelection /> : <SignupForm />}
      </div>
    </div>
  );
}