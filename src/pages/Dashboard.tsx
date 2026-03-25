import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useShifts, useShiftAssignmentCounts, useProfile, type Employee, type Shift } from '@/hooks/use-dashboard-data';
import { useWorkplaces } from '@/hooks/use-workplaces';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, LogOut, Plus, CalendarPlus, Users, Calendar, LayoutGrid, Mail, CalendarOff, Bell } from 'lucide-react';
import { EmployeeSidebar } from '@/components/dashboard/EmployeeSidebar';
import { RoleManager } from '@/components/dashboard/RoleManager';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { DeleteEmployeeDialog } from '@/components/dashboard/DeleteEmployeeDialog';
import { ShiftModal } from '@/components/dashboard/ShiftModal';
import { ShiftList } from '@/components/dashboard/ShiftList';
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar';
import { ShiftTemplateSidebar } from '@/components/calendar/ShiftTemplateSidebar';
import { PublishPanel } from '@/components/publish/PublishPanel';
import { WorkplaceSelector } from '@/components/dashboard/WorkplaceSelector';
import { WorkplaceManager } from '@/components/dashboard/WorkplaceManager';
import { EmailEmployeesModal } from '@/components/dashboard/EmailEmployeesModal';
import { TimeOffRequestsManager } from '@/components/dashboard/TimeOffRequestsManager';
import { startOfWeek } from 'date-fns';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data: profile, isFetching: profileIsFetching } = useProfile();
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

  // Pending time-off request count
  const { data: pendingTimeOffCount = 0 } = useQuery({
    queryKey: ['pending-time-off-count', employerId],
    queryFn: async () => {
      if (!employerId) return 0;
      const { count, error } = await supabase
        .from('time_off_requests')
        .select('id', { count: 'exact', head: true })
        .eq('employer_id', employerId)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!employerId,
  });

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
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPreselected, setEmailPreselected] = useState<Employee[]>([]);

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeModalOpen(true);
  };

  const handleCloseEmployeeModal = (open: boolean) => {
    setEmployeeModalOpen(open);
    if (!open) setEditingEmployee(null);
  };

  const handleEmailEmployee = (emp: Employee) => {
    setEmailPreselected([emp]);
    setEmailModalOpen(true);
  };

  const handleEmailAll = () => {
    setEmailPreselected(employees);
    setEmailModalOpen(true);
  };

  if (profile && !employerId && !profileIsFetching) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader email={user?.email} onSignOut={signOut} />

      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 4rem)' }}>
        <EmployeeSidebar employees={employees} shiftCounts={shiftCounts} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">

          <Tabs defaultValue="schedule" className="w-full">
            <div className="flex flex-col gap-3 mb-6 print:hidden">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
                <TabsList className="shrink-0">
                  <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm sm:gap-2">
                    <Calendar className="h-4 w-4" /> <span className="hidden xs:inline">Schedule</span>
                  </TabsTrigger>
                  <TabsTrigger value="employees" className="gap-1.5 text-xs sm:text-sm sm:gap-2">
                    <Users className="h-4 w-4" /> <span className="hidden xs:inline">Employees</span>
                  </TabsTrigger>
                   <TabsTrigger value="shifts" className="gap-1.5 text-xs sm:text-sm sm:gap-2">
                     <LayoutGrid className="h-4 w-4" /> <span className="hidden xs:inline">Shifts</span>
                   </TabsTrigger>
                   <TabsTrigger value="time-off" className="gap-1.5 text-xs sm:text-sm sm:gap-2 relative">
                     <CalendarOff className="h-4 w-4" /> <span className="hidden xs:inline">Time Off</span>
                     {pendingTimeOffCount > 0 && (
                       <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1 animate-pulse">
                         {pendingTimeOffCount}
                       </span>
                     )}
                   </TabsTrigger>
                </TabsList>
                {employerId && (
                  <div className="hidden lg:block">
                    <WorkplaceSelector
                      workplaces={workplaces}
                      selectedId={selectedWorkplaceId}
                      onSelect={setSelectedWorkplaceId}
                      employerId={employerId}
                    />
                  </div>
                )}
              </div>
              {employerId && (
                <div className="lg:hidden">
                  <WorkplaceSelector
                    workplaces={workplaces}
                    selectedId={selectedWorkplaceId}
                    onSelect={setSelectedWorkplaceId}
                    employerId={employerId}
                  />
                </div>
              )}
              {employerId && (
                <div className="flex justify-start">
                  <PublishPanel
                    employerId={employerId}
                    currentWeek={startOfWeek(new Date(), { weekStartsOn: 1 })}
                    employees={employees}
                    shifts={shifts}
                  />
                </div>
              )}
            </div>

            {/* Schedule Tab - Weekly Calendar */}
            <TabsContent value="schedule" className="mt-0">
              {employerId && selectedWorkplaceId && (
                <WeeklyCalendar
                  employees={workplaceEmployees}
                  shifts={shifts}
                  employerId={employerId}
                  companyName={selectedWorkplace?.name ?? ''}
                  workplaceId={selectedWorkplaceId}
                  renderSidebar={(onAssignShift) => (
                    <ShiftTemplateSidebar shifts={shifts} onAssignShift={onAssignShift} />
                  )}
                />
              )}
            </TabsContent>

            {/* Employees Tab */}
            <TabsContent value="employees" className="py-2 sm:py-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Employees</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage your team members and their roles.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEmailAll} disabled={!employerId || employees.length === 0}>
                    <Mail className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Email All</span><span className="sm:hidden">Email</span>
                  </Button>
                  <Button size="sm" onClick={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }} disabled={!employerId}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add
                  </Button>
                </div>
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
                      onEmail={handleEmailEmployee}
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

            {/* Time Off Tab */}
            <TabsContent value="time-off">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Time Off Requests</h2>
                <p className="text-sm text-muted-foreground mt-1">Review and manage employee time-off requests.</p>
              </div>
              {employerId && <TimeOffRequestsManager employerId={employerId} />}
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
      <EmailEmployeesModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        employees={employees}
        preselected={emailPreselected}
        senderName={profile?.display_name || undefined}
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
