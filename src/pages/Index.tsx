import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Calendar, Users, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    // Will be routed properly by RoleRouter
    return <Navigate to="/route" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">WorkSchedule</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32 text-center">
        <div className="animate-fade-in">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Simple shift scheduling for modern teams
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground lg:text-6xl">
            Stop juggling<br />spreadsheets.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            WorkSchedule helps you create, manage, and share shift schedules in minutes — 
            so your team always knows when and where to show up.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth/signup">
              <Button size="lg" className="px-8 text-base">
                Start free trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button variant="outline" size="lg" className="px-8 text-base">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-foreground">Everything you need</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            From drag-and-drop scheduling to real-time team notifications.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Calendar, title: 'Smart Scheduling', desc: 'Build weekly schedules with drag-and-drop simplicity. Auto-detect conflicts.' },
              { icon: Users, title: 'Team Management', desc: 'Organize employees by role, department, or location with granular permissions.' },
              { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security with role-based access and data isolation per employer.' },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">WorkSchedule</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 WorkSchedule. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
