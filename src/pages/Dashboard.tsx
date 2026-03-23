import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useShifts, useShiftAssignmentCounts, useProfile, type Employee } from '@/hooks/use-dashboard-data';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Plus, CalendarPlus } from 'lucide-react';
import { EmployeeSidebar } from '@/components/dashboard/EmployeeSidebar';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { DeleteEmployeeDialog } from '@/components/dashboard/DeleteEmployeeDialog';
import { ShiftModal } from '@/components/dashboard/ShiftModal';
import { ShiftList } from '@/components/dashboard/ShiftList';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: shifts = [], isLoading: loadingShifts } = useShifts();
  const { data: shiftCounts = {} } = useShiftAssignmentCounts();
  const { data: profile } = useProfile();

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);

  const employerId = profile?.employer_id;

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeModalOpen(true);
  };

  const handleCloseEmployeeModal = (open: boolean) => {
    setEmployeeModalOpen(open);
    if (!open) setEditingEmployee(null);
  };

  // Show onboarding prompt if no employer is set
  if (profile && !employerId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader email={user?.email} onSignOut={signOut} />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome to Shiftly</h1>
          <p className="mt-3 text-muted-foreground">
            Your account isn't linked to an employer yet. Please contact your administrator or set up your organization.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader email={user?.email} onSignOut={signOut} />

      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <EmployeeSidebar employees={employees} shiftCounts={shiftCounts} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Employees Section */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Employees</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your team members and their roles.</p>
              </div>
              <Button onClick={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }} disabled={!employerId}>
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </div>

            {loadingEmployees ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <EmployeeTable
                employees={employees}
                shiftCounts={shiftCounts}
                onEdit={handleEdit}
                onDelete={setDeletingEmployee}
              />
            )}
          </div>

          {/* Shifts Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Shifts</h2>
                <p className="text-sm text-muted-foreground mt-1">Create and manage your team's shifts.</p>
              </div>
              <Button onClick={() => setShiftModalOpen(true)} disabled={!employerId}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Add Shift
              </Button>
            </div>

            {loadingShifts ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <ShiftList shifts={shifts} />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {employerId && (
        <>
          <EmployeeModal
            open={employeeModalOpen}
            onOpenChange={handleCloseEmployeeModal}
            employee={editingEmployee}
            employerId={employerId}
          />
          <ShiftModal
            open={shiftModalOpen}
            onOpenChange={setShiftModalOpen}
            employerId={employerId}
          />
        </>
      )}
      <DeleteEmployeeDialog
        open={!!deletingEmployee}
        onOpenChange={(open) => { if (!open) setDeletingEmployee(null); }}
        employee={deletingEmployee}
      />
    </div>
  );
}

function DashboardHeader({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">Shiftly</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-muted-foreground">{email}</span>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
