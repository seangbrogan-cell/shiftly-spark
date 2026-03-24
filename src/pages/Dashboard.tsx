import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useShifts, useShiftAssignmentCounts, useProfile, type Employee, type Shift } from '@/hooks/use-dashboard-data';
import { useWorkplaces } from '@/hooks/use-workplaces';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { WorkplaceSelector } from '@/components/dashboard/WorkplaceSelector';
import { WorkplaceManager } from '@/components/dashboard/WorkplaceManager';
import { startOfWeek } from 'date-fns';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const employerId = profile?.employer_id;

  const { data: workplaces = [] } = useWorkplaces(employerId ?? undefined);
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | undefined>();

  // Auto-select first workplace
  useEffect(() => {
    if (workplaces.length > 0 && !selectedWorkplaceId) {
      setSelectedWorkplaceId(workplaces[0].id);
    }
    // If selected workplace was deleted, switch to first
    if (selectedWorkplaceId && workplaces.length > 0 && !workplaces.find(w => w.id === selectedWorkplaceId)) {
      setSelectedWorkplaceId(workplaces[0].id);
    }
  }, [workplaces, selectedWorkplaceId]);

  const selectedWorkplace = workplaces.find(w => w.id === selectedWorkplaceId);

  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: shifts = [], isLoading: loadingShifts } = useShifts(selectedWorkplaceId);
  const { data: shiftCounts = {} } = useShiftAssignmentCounts();

  // Fetch employee-workplace assignments for the selected workplace
  const { data: workplaceEmployeeIds } = useQuery({
    queryKey: ['employee-workplaces-for-workplace', selectedWorkplaceId],
    queryFn: async () => {
      if (!selectedWorkplaceId) return null;
      const { data, error } = await supabase
        .from('employee_workplaces' as any)
        .select('employee_id')
        .eq('workplace_id', selectedWorkplaceId);
      if (error) throw error;
      return new Set((data as any[]).map(r => r.employee_id));
    },
    enabled: !!selectedWorkplaceId,
  });

  // Filter employees to those assigned to the selected workplace
  const workplaceEmployees = useMemo(() => {
    if (!workplaceEmployeeIds) return employees;
    return employees.filter(e => workplaceEmployeeIds.has(e.id));
  }, [employees, workplaceEmployeeIds]);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

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
              <div className="flex items-center gap-4">
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
                  <WorkplaceSelector
                    workplaces={workplaces}
                    selectedId={selectedWorkplaceId}
                    onSelect={setSelectedWorkplaceId}
                    employerId={employerId}
                  />
                )}
              </div>
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
              {employerId && selectedWorkplaceId && (
                <WeeklyCalendar
                  employees={employees}
                  shifts={shifts}
                  employerId={employerId}
                  companyName={selectedWorkplace?.name ?? ''}
                  workplaceId={selectedWorkplaceId}
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

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                <div>
                  {loadingEmployees ? (
                    <div className="flex justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    <EmployeeTable
                      employees={employees}
                      shiftCounts={shiftCounts}
                      employerId={employerId}
                      onEdit={handleEdit}
                      onDelete={setDeletingEmployee}
                    />
                  )}
                </div>
                <div className="space-y-6">
                  {employerId && <RoleManager employerId={employerId} />}
                  {workplaces.length > 0 && <WorkplaceManager workplaces={workplaces} />}
                </div>
              </div>
            </TabsContent>

            {/* Shifts Tab */}
            <TabsContent value="shifts">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Shifts</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedWorkplace ? `Shifts for ${selectedWorkplace.name}` : 'Create and manage your team\'s shifts.'}
                  </p>
                </div>
                <Button onClick={() => { setEditingShift(null); setShiftModalOpen(true); }} disabled={!employerId || !selectedWorkplaceId}>
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
            workplaceId={selectedWorkplaceId}
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
          <span className="text-xl font-bold text-foreground">WorkSchedule</span>
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
