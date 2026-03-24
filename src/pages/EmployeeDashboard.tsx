import { useState } from 'react';
import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, startOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/use-dashboard-data';
import {
  useCurrentEmployee,
  useEmployeeWeeklySchedule,
  useEmployeeMonthlySchedule,
  useTimeOffRequests,
  useScheduleLastUpdated,
  useEmployeeWorkplacesList,
} from '@/hooks/use-employee-data';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, LogOut, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, CalendarClock, History, Plus, Building2 } from 'lucide-react';
import { EmployeeWeeklyView } from '@/components/employee/EmployeeWeeklyView';
import { EmployeeMonthlyView } from '@/components/employee/EmployeeMonthlyView';
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

  const employeeId = employee?.id;
  const employerId = profile?.employer_id;

  const weekDays = getWeekDays(currentWeek);
  const { data: weeklyAssignments = [], isLoading: loadingWeek } = useEmployeeWeeklySchedule(employeeId, currentWeek);
  const { data: monthlyAssignments = [], isLoading: loadingMonth } = useEmployeeMonthlySchedule(employeeId, currentMonth);
  const { data: timeOffRequests = [], isLoading: loadingRequests } = useTimeOffRequests(employeeId, statusFilter);
  const { data: scheduleUpdated } = useScheduleLastUpdated(employerId ?? undefined);

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

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Tabs defaultValue="schedule">
          <TabsList className="mb-6">
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarDays className="h-4 w-4" /> My Schedule
            </TabsTrigger>
            <TabsTrigger value="time-off" className="gap-2">
              <History className="h-4 w-4" /> Time Off
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">My Schedule</h1>
                {scheduleUpdated && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Schedule last updated {format(new Date(scheduleUpdated), 'MMM d, yyyy · h:mm a')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* View toggle */}
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => setCalendarView('weekly')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${calendarView === 'weekly' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView('monthly')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${calendarView === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                  >
                    <CalendarRange className="h-3.5 w-3.5 inline mr-1" />
                    Month
                  </button>
                </div>

                {/* Navigation */}
                {calendarView === 'weekly' ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <Button size="sm" onClick={() => setTimeOffModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Request Time Off
                </Button>
              </div>
            </div>

            {/* Date range label */}
            <p className="text-sm font-medium text-muted-foreground mb-4">
              {calendarView === 'weekly'
                ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`
                : format(currentMonth, 'MMMM yyyy')
              }
            </p>

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
    <header className="border-b border-border bg-card sticky top-0 z-40">
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
