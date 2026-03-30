import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-dashboard-data';

export function RoleRouter() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  if (!profile?.employer_id) {
    return <Navigate to="/onboarding" replace />;
  }

  if (profile.role === 'employee') {
    return <Navigate to="/employee" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
