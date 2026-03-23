import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useShifts, useShiftAssignmentCounts, useProfile, type Employee, type Shift } from '@/hooks/use-dashboard-data';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, LogOut, Plus, CalendarPlus, Users, Calendar, LayoutGrid } from 'lucide-react';
import { EmployeeSidebar } from '@/components/dashboard/EmployeeSidebar';
import { RoleManager } from '@/components/dashboard/RoleManager';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { DeleteEmployeeDialog } from '@/components/dashboard/DeleteEmployeeDialog';
import { ShiftModal } from '@/components/dashboard/ShiftModal';
import { ShiftList } from '@/components/dashboard/ShiftList';
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar';
import { PublishPanel } from '@/components/publish/PublishPanel';
import { startOfWeek } from 'date-fns';

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
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const employerId = profile?.employer_id;

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeModalOpen(true);
  };

  const handleCloseEmployeeModal = (open: boolean) => {
    setEmployeeModalOpen(open);
    if (!open) setEditingEmployee(null);
  };

  if (profile && !employerId) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader email={user?.email} onSignOut={signOut} />

      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <EmployeeSidebar employees={employees} shiftCounts={shiftCounts} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Tabs defaultValue="schedule" className="w-full">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap print:hidden">
              <TabsList>
                <TabsTrigger value="schedule" className="gap-2">
                  <Calendar className="h-4 w-4" /> Schedule
                </TabsTrigger>
                <TabsTrigger value="employees" className="gap-2">
                  <Users className="h-4 w-4" /> Employees
                </TabsTrigger>
                <TabsTrigger value="shifts" className="gap-2">
                  <LayoutGrid className="h-4 w-4" /> Shifts
                </TabsTrigger>
              </TabsList>
              {employerId && (
                <PublishPanel
                  employerId={employerId}
                  currentWeek={startOfWeek(new Date(), { weekStartsOn: 1 })}
                  employees={employees}
                  shifts={shifts}
                />
              )}
            </div>

            {/* Schedule Tab - Weekly Calendar */}
            <TabsContent value="schedule">
              {employerId && (
                <WeeklyCalendar
                  employees={employees}
                  shifts={shifts}
                  employerId={employerId}
                />
              )}
            </TabsContent>

            {/* Employees Tab */}
            <TabsContent value="employees">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Employees</h2>
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
            </TabsContent>

            {/* Shifts Tab */}
            <TabsContent value="shifts">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Shifts</h2>
                  <p className="text-sm text-muted-foreground mt-1">Create and manage your team's shifts.</p>
                </div>
                <Button onClick={() => { setEditingShift(null); setShiftModalOpen(true); }} disabled={!employerId}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Add Shift
                </Button>
              </div>

              {loadingShifts ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <ShiftList shifts={shifts} onEdit={(s) => { setEditingShift(s); setShiftModalOpen(true); }} />
              )}
            </TabsContent>
          </Tabs>
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
            onOpenChange={(o) => { setShiftModalOpen(o); if (!o) setEditingShift(null); }}
            employerId={employerId}
            editingShift={editingShift}
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
    <header className="border-b border-border bg-card sticky top-0 z-40 print:hidden">
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
