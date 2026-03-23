import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Calendar, Users, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Clock className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">Shiftly</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Shiftly</h1>
          <p className="mt-2 text-muted-foreground">
            Your shift scheduling dashboard — everything starts here.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Calendar, label: 'Upcoming Shifts', value: '—', description: 'No shifts scheduled yet' },
            { icon: Users, label: 'Team Members', value: '—', description: 'Add your first team member' },
            { icon: BarChart3, label: 'Hours This Week', value: '0h', description: 'Start scheduling to track' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
