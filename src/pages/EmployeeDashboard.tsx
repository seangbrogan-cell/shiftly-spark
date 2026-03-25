import { useEffect, useMemo, useState } from 'react';
import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, startOfMonth, isSameWeek, isSameMonth as isSameMonthFn } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-dashboard-data';
import {
  useCurrentEmployee,
  useEmployeeWeeklySchedule,
  useEmployeeMonthlySchedule,
  useTimeOffRequests,
  useScheduleLastUpdated,
  useEmployeeWorkplacesList,
  useEmployeeApprovedTimeOff,
} from '@/hooks/use-employee-data';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, LogOut, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, CalendarClock, History, Plus, Users, Printer } from 'lucide-react';
import { EmployeeWeeklyView } from '@/components/employee/EmployeeWeeklyView';
import { EmployeeMonthlyView } from '@/components/employee/EmployeeMonthlyView';
import { FullScheduleView } from '@/components/employee/FullScheduleView';
import { TimeOffModal } from '@/components/employee/TimeOffModal';
import { TimeOffHistory } from '@/components/employee/TimeOffHistory';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { getWeekDays } from '@/hooks/use-calendar-data';

export default function EmployeeDashboard() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: employee } = useCurrentEmployee();

  const [calendarView, setCalendarView] = useState<'weekly' | 'monthly'>('weekly');
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'schedule' | 'full-schedule' | 'time-off'>('schedule');
  

  const employeeId = employee?.id;
  const employerId = employee?.employer_id ?? profile?.employer_id;

  const weekDays = getWeekDays(currentWeek);
  const { data: employeeWorkplaces = [] } = useEmployeeWorkplacesList(employeeId, employerId);

  useEffect(() => {
    if (!selectedWorkplaceId && employeeWorkplaces.length > 0) {
      setSelectedWorkplaceId(employeeWorkplaces[0].id);
      return;
    }

    if (
      selectedWorkplaceId &&
      employeeWorkplaces.length > 0 &&
      !employeeWorkplaces.some((wp) => wp.id === selectedWorkplaceId)
    ) {
      setSelectedWorkplaceId(employeeWorkplaces[0].id);
    }
  }, [employeeWorkplaces, selectedWorkplaceId]);

  // Always lock schedule view to a single selected workplace (no combined/all view)
  const activeWorkplaceId = selectedWorkplaceId ?? employeeWorkplaces[0]?.id;
  const scheduleEmployeeId = activeWorkplaceId ? employeeId : undefined;

  // Check if the active workplace has full_schedule_visible enabled
  const { data: workplaceSettings } = useQuery({
    queryKey: ['workplace-settings', activeWorkplaceId],
    queryFn: async () => {
      if (!activeWorkplaceId) return null;
      const { data, error } = await supabase
        .from('workplaces')
        .select('full_schedule_visible')
        .eq('id', activeWorkplaceId)
        .single();
      if (error) throw error;
      return data as { full_schedule_visible: boolean };
    },
    enabled: !!activeWorkplaceId,
  });
  const fullScheduleAllowed = workplaceSettings?.full_schedule_visible ?? false;

  const { data: weeklyAssignmentsRaw = [], isLoading: loadingWeek } = useEmployeeWeeklySchedule(scheduleEmployeeId, currentWeek, activeWorkplaceId);
  const { data: monthlyAssignmentsRaw = [], isLoading: loadingMonth } = useEmployeeMonthlySchedule(scheduleEmployeeId, currentMonth, activeWorkplaceId);
  const { data: timeOffRequests = [], isLoading: loadingRequests } = useTimeOffRequests(employeeId, statusFilter);
  const { data: scheduleUpdated } = useScheduleLastUpdated(employerId ?? undefined);
  const { data: approvedTimeOff = [] } = useEmployeeApprovedTimeOff(employeeId);

  // Build set of dates with approved time off to filter out assignments
  const timeOffDates = useMemo(() => {
    const set = new Set<string>();
    approvedTimeOff.forEach((req) => {
      const start = new Date(req.start_date + 'T00:00:00');
      const end = new Date(req.end_date + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(format(d, 'yyyy-MM-dd'));
      }
    });
    return set;
  }, [approvedTimeOff]);

  const weeklyAssignments = useMemo(
    () => weeklyAssignmentsRaw.filter((a) => !timeOffDates.has(a.assigned_date)),
    [weeklyAssignmentsRaw, timeOffDates]
  );
  const monthlyAssignments = useMemo(
    () => monthlyAssignmentsRaw.filter((a) => !timeOffDates.has(a.assigned_date)),
    [monthlyAssignmentsRaw, timeOffDates]
  );

  if (!employee) {
    return (
      <div className="min-h-screen bg-background">
        <EmployeeHeader email={user?.email} displayName={profile?.display_name} onSignOut={signOut} />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome to WorkSchedule</h1>
          <p className="mt-3 text-muted-foreground">
            Your account isn't linked to an employee record yet. Please contact your manager to get set up.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeHeader email={user?.email} displayName={profile?.display_name ?? employee.name} onSignOut={signOut} employeeId={employeeId} />

      <main className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-8">
        <Tabs defaultValue="schedule" onValueChange={(v) => setActiveTab(v as 'schedule' | 'full-schedule' | 'time-off')}>
          {/* Combined toolbar: tabs + controls on one line */}
          <div className="flex flex-col gap-2 mb-4 print:hidden">
            <div className="overflow-x-auto pb-1 -mb-1">
              <TabsList className="shrink-0">
                <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CalendarDays className="h-4 w-4" /> <span className="hidden xs:inline">My</span> Schedule
                </TabsTrigger>
                {fullScheduleAllowed && (
                  <TabsTrigger value="full-schedule" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Users className="h-4 w-4" /> <span className="hidden xs:inline">Full</span> Schedule
                  </TabsTrigger>
                )}
                <TabsTrigger value="time-off" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <History className="h-4 w-4" /> Time Off
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Schedule controls – visible for schedule tabs */}
            {(activeTab === 'schedule' || activeTab === 'full-schedule') && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Workplace dropdown */}
                <select
                  id="employee-workplace"
                  value={activeWorkplaceId ?? ''}
                  onChange={(e) => setSelectedWorkplaceId(e.target.value || undefined)}
                  disabled={employeeWorkplaces.length === 0}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none max-w-[140px] sm:max-w-none"
                >
                  {employeeWorkplaces.length === 0 ? (
                    <option value="">No workplaces</option>
                  ) : (
                    employeeWorkplaces.map((wp) => (
                      <option key={wp.id} value={wp.id}>{wp.name}</option>
                    ))
                  )}
                </select>

                {/* View toggle – only for My Schedule */}
                {activeTab === 'schedule' && (
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button
                      onClick={() => setCalendarView('weekly')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors ${calendarView === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarView('monthly')}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-border ${calendarView === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                    >
                      Month
                    </button>
                  </div>
                )}

                {/* Navigation */}
                {(activeTab === 'full-schedule' || calendarView === 'weekly') ? (
                  <>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 }) ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs sm:text-sm ${!isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 }) ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50' : ''}`}
                      onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    >
                      Today
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
                      Today
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
                </Button>
              </div>
            )}
          </div>

          {/* Workplace title + date range – visible for schedule tabs */}
          {(activeTab === 'schedule' || activeTab === 'full-schedule') && (
            <div className="flex items-baseline gap-3 mb-4">
              <h1 className="text-xl font-bold text-foreground">
                {(() => {
                  const wpName = employeeWorkplaces.find(wp => wp.id === activeWorkplaceId)?.name ?? 'My';
                  return activeTab === 'full-schedule' ? `${wpName} Full Schedule` : `${wpName} Schedule`;
                })()}
              </h1>
              <span className="text-sm font-medium text-muted-foreground">
                {(activeTab === 'full-schedule' || calendarView === 'weekly')
                  ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`
                  : format(currentMonth, 'MMMM yyyy')
                }
              </span>
            </div>
          )}

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            {calendarView === 'weekly' ? (
              loadingWeek ? (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <EmployeeWeeklyView assignments={weeklyAssignments} weekStart={currentWeek} />
              )
            ) : (
              loadingMonth ? (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <EmployeeMonthlyView assignments={monthlyAssignments} monthDate={currentMonth} />
              )
            )}
          </TabsContent>

          {/* Full Schedule Tab */}
          {fullScheduleAllowed && activeWorkplaceId && (
            <TabsContent value="full-schedule">
              <FullScheduleView workplaceId={activeWorkplaceId} weekStart={currentWeek} />
            </TabsContent>
          )}

          {/* Time Off Tab */}
          <TabsContent value="time-off">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setTimeOffModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Request Time Off
              </Button>
            </div>
            <TimeOffHistory
              requests={timeOffRequests}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              isLoading={loadingRequests}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Time Off Modal */}
      {employeeId && employerId && (
        <TimeOffModal
          open={timeOffModalOpen}
          onOpenChange={setTimeOffModalOpen}
          employeeId={employeeId}
          employerId={employerId}
        />
      )}
    </div>
  );
}

function EmployeeHeader({ email, displayName, onSignOut, employeeId }: { email?: string; displayName?: string | null; onSignOut: () => void; employeeId?: string }) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">WorkSchedule</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-muted-foreground">
            {displayName || email}
          </span>
          <NotificationBell employeeId={employeeId} />
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
