import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Building2, UserCheck, Mail, Clock, Shield } from 'lucide-react';

interface Stats {
  totalEmployers: number;
  totalProfiles: number;
  employerProfiles: number;
  employeeProfiles: number;
  totalEmployeeRecords: number;
  employeesWithAccounts: number;
}

interface RecentSignup {
  id: string;
  display_name: string | null;
  role: string;
  created_at: string;
  employer_name: string | null;
}

interface RecentOrg {
  id: string;
  name: string;
  created_at: string;
  owner_name: string | null;
}

interface RecentEmail {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  created_at: string;
}

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [recentOrgs, setRecentOrgs] = useState<RecentOrg[]>([]);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth/login'); return; }

    const fetchStats = async () => {
      const { data, error } = await supabase.functions.invoke('get-platform-stats');
      if (error) {
        setError('Access denied or failed to load analytics.');
        setLoading(false);
        return;
      }
      setStats(data.stats);
      setRecentSignups(data.recentSignups || []);
      setRecentOrgs(data.recentOrgs || []);
      setRecentEmails(data.recentEmails || []);
      setLoading(false);
    };

    fetchStats();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-semibold text-foreground">Access Denied</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'sent': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed': case 'dlq': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'suppressed': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statCards = [
    { label: 'Organizations', value: stats?.totalEmployers ?? 0, icon: Building2, color: 'text-primary' },
    { label: 'Employer Accounts', value: stats?.employerProfiles ?? 0, icon: UserCheck, color: 'text-emerald-600' },
    { label: 'Employee Accounts', value: stats?.employeeProfiles ?? 0, icon: Users, color: 'text-blue-600' },
    { label: 'Total Profiles', value: stats?.totalProfiles ?? 0, icon: Users, color: 'text-violet-600' },
    { label: 'Employee Records', value: stats?.totalEmployeeRecords ?? 0, icon: Users, color: 'text-orange-600' },
    { label: 'With Login Access', value: stats?.employeesWithAccounts ?? 0, icon: UserCheck, color: 'text-teal-600' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Platform Analytics
            </h1>
            <p className="text-xs text-muted-foreground">Admin-only overview of all platform activity</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="relative overflow-hidden">
              <CardContent className="pt-5 pb-4 px-4">
                <Icon className={`h-5 w-5 ${color} mb-2`} />
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Organizations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Recent Organizations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {recentOrgs.length === 0 && <p className="text-sm text-muted-foreground">No organizations yet.</p>}
              {recentOrgs.map(org => (
                <div key={org.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40">
                  <div>
                    <p className="text-sm font-medium text-foreground">{org.name}</p>
                    <p className="text-xs text-muted-foreground">Owner: {org.owner_name || 'Unknown'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(org.created_at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Signups */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" /> Recent User Signups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {recentSignups.length === 0 && <p className="text-sm text-muted-foreground">No signups yet.</p>}
              {recentSignups.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.display_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.employer_name && <span>{s.employer_name} · </span>}
                        {s.role}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Emails */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-violet-600" /> Recent Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Template</th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Recipient</th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="py-2 text-xs font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmails.map(e => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-foreground">{e.template_name}</td>
                        <td className="py-2 pr-4 text-muted-foreground truncate max-w-[200px]">{e.recipient_email}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(e.status)}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">{formatDateTime(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
