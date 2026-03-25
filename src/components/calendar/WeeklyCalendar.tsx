import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, addWeeks, subWeeks, isToday, startOfWeek, isSameWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, PanelRightClose, PanelRight, Printer } from 'lucide-react';
import type { Employee, Shift } from '@/hooks/use-dashboard-data';
import { buildRoleSortPriority } from '@/lib/roles';
import { useRoleTypes } from '@/hooks/use-role-types';
import {
  useWeeklyAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useApprovedTimeOff,
  getWeekDays,
  type AssignmentWithDetails,
} from '@/hooks/use-calendar-data';
import { useAllEmployeeAvailability, type EmployeeAvailabilityRow } from '@/hooks/use-employee-availability';
import { CalendarCell } from './CalendarCell';
import { ShiftCard } from './ShiftCard';
import { ShiftTemplateSidebar } from './ShiftTemplateSidebar';
import { EditAssignmentModal } from './EditAssignmentModal';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/publish/StatusBadge';
import { PublishPanel } from '@/components/publish/PublishPanel';
import { useWeekPublishStatus } from '@/hooks/use-publish-data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WeeklyCalendarProps {
  employees: Employee[];
  shifts: Shift[];
  employerId: string;
  companyName?: string;
  workplaceId?: string;
}

export function WeeklyCalendar({ employees, shifts, employerId, companyName, workplaceId }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithDetails | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentWithDetails | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  const { data: assignments = [], isLoading } = useWeeklyAssignments(currentWeek, workplaceId);
  const { data: dbRoles = [] } = useRoleTypes(employerId);
  const { data: allAvailability = [] } = useAllEmployeeAvailability();
  const { data: approvedTimeOff = [] } = useApprovedTimeOff(currentWeek);
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const { toast } = useToast();
  const { data: publishStatus } = useWeekPublishStatus(currentWeek);

  // Build set of employee:date keys that have approved time off
  const timeOffSet = useMemo(() => {
    const set = new Set<string>();
    approvedTimeOff.forEach((req) => {
      const start = new Date(req.start_date + 'T00:00:00');
      const end = new Date(req.end_date + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(`${req.employee_id}:${format(d, 'yyyy-MM-dd')}`);
      }
    });
    return set;
  }, [approvedTimeOff]);

  // Build availability map: employeeId -> day -> { start_time, end_time }
  const availabilityTimeMap = useMemo(() => {
    const map: Record<string, Record<string, { start_time: string; end_time: string }>> = {};
    allAvailability.forEach((row) => {
      if (!map[row.employee_id]) map[row.employee_id] = {};
      map[row.employee_id][row.day_of_week] = {
        start_time: row.start_time.slice(0, 5),
        end_time: row.end_time.slice(0, 5),
      };
    });
    return map;
  }, [allAvailability]);

  const roleSortPriority = useMemo(() => buildRoleSortPriority(dbRoles), [dbRoles]);

  const weekDays = useMemo(() => getWeekDays(currentWeek), [currentWeek]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group assignments by employee + date
  const assignmentMap = useMemo(() => {
    const map: Record<string, AssignmentWithDetails[]> = {};
    assignments.forEach((a) => {
      const key = `${a.employee_id}:${a.assigned_date}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [assignments]);

  const activeAssignment = useMemo(
    () => assignments.find((a) => a.id === activeId) ?? null,
    [activeId, assignments]
  );

  // Helper: check if a shift's times fit within an employee's availability window for a given day
  const fitsAvailability = (employeeId: string, dateStr: string, shiftStartTime: string | null, shiftEndTime: string | null, isAllDay: boolean): boolean => {
    if (isAllDay) return true; // all-day shifts always allowed on available days
    if (!shiftStartTime || !shiftEndTime) return true;

    const dayAbbr = format(new Date(dateStr + 'T12:00:00'), 'EEE');
    const empAvail = availabilityTimeMap[employeeId]?.[dayAbbr];
    if (!empAvail) return true; // no specific time restriction = full day

    // Check if it's actually restricted (not full day)
    if (empAvail.start_time === '00:00' && empAvail.end_time === '23:59') return true;

    // Extract HH:MM from the shift times
    const shiftStartHHMM = new Date(shiftStartTime).toISOString().slice(11, 16);
    const shiftEndHHMM = new Date(shiftEndTime).toISOString().slice(11, 16);

    // Shift must start at or after availability start, and end at or before availability end
    return shiftStartHHMM >= empAvail.start_time && shiftEndHHMM <= empAvail.end_time;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;

    // Check if this is a shift template being dropped onto calendar
    const shiftTemplate = (active.data.current as any)?.shiftTemplate;
    if (shiftTemplate) {
      if (overId === 'sidebar-templates') return;
      const [newEmployeeId, newDate] = overId.split(':');
      if (!newEmployeeId || !newDate) return;

      const isAllDayShift = (shiftTemplate as any).is_all_day === true;

      // Validate time availability
      if (!fitsAvailability(newEmployeeId, newDate, shiftTemplate.start_time, shiftTemplate.end_time, isAllDayShift)) {
        toast({ title: 'Cannot assign shift', description: 'This shift falls outside the employee\'s available hours for this day.', variant: 'destructive' });
        return;
      }

      let actualStart: string | null = null;
      let actualEnd: string | null = null;

      if (!isAllDayShift && shiftTemplate.start_time && shiftTemplate.end_time) {
        const startDate = new Date(`${newDate}T${new Date(shiftTemplate.start_time).toISOString().slice(11, 19)}`);
        let endDate = new Date(`${newDate}T${new Date(shiftTemplate.end_time).toISOString().slice(11, 19)}`);
        if (endDate <= startDate) {
          endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
        }
        actualStart = startDate.toISOString();
        actualEnd = endDate.toISOString();
      }

      try {
        await createAssignment.mutateAsync({
          shift_id: shiftTemplate.id,
          employee_id: newEmployeeId,
          employer_id: employerId,
          assigned_date: newDate,
          actual_start: actualStart,
          actual_end: actualEnd,
          workplace_id: workplaceId,
        } as any);
        toast({ title: 'Shift assigned' });
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
      return;
    }

    // Existing assignment drag
    const assignment = (active.data.current as any)?.assignment as AssignmentWithDetails;
    if (!assignment) return;

    // Dropped back on sidebar → delete the assignment
    if (overId === 'sidebar-templates') {
      try {
        await deleteAssignment.mutateAsync(assignment.id);
        toast({ title: 'Shift unassigned' });
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
      return;
    }

    const [newEmployeeId, newDate] = overId.split(':');
    if (!newEmployeeId || !newDate) return;

    // Skip if dropped in same cell
    if (newEmployeeId === assignment.employee_id && newDate === assignment.assigned_date) return;

    // Validate time availability for reassigned shift
    const shiftData = assignment.shifts;
    if (shiftData && !fitsAvailability(newEmployeeId, newDate, shiftData.start_time, shiftData.end_time, shiftData.is_all_day)) {
      toast({ title: 'Cannot reassign shift', description: 'This shift falls outside the employee\'s available hours for this day.', variant: 'destructive' });
      return;
    }

    try {
      await updateAssignment.mutateAsync({
        id: assignment.id,
        employee_id: newEmployeeId,
        assigned_date: newDate,
      });
      toast({ title: 'Shift reassigned' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCellClick = (employeeId: string, date: string) => {
    setEditingAssignment(null);
    setDefaultEmployeeId(employeeId);
    setDefaultDate(date);
    setModalOpen(true);
  };

  const handleAssignmentClick = (a: AssignmentWithDetails) => {
    setEditingAssignment(a);
    setDefaultDate('');
    setDefaultEmployeeId('');
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAssignment) return;
    try {
      await deleteAssignment.mutateAsync(deletingAssignment.id);
      toast({ title: 'Assignment deleted' });
      setDeletingAssignment(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-foreground">{companyName ? `${companyName} Schedule` : 'Schedule'}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 }) ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className={isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 }) ? '' : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'}
          >
            <CalendarDays className="h-4 w-4 mr-1.5" /> Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center">
          <p className="text-muted-foreground">Add employees first to start scheduling shifts.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            {/* Day Headers */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)_36px] sm:grid-cols-[110px_repeat(7,1fr)_46px] border-b border-border sticky top-0 bg-card z-10">
              <div className="px-1 sm:px-2 py-1 sm:py-1.5 border-r border-border flex items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</span>
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border-r border-border ${isToday(day) ? 'bg-primary-light/30' : ''}`}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-xs font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
              <div className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/50">Hrs</span>
              </div>
            </div>

            {/* Employee Rows – Sorted by role order, then alphabetically */}
            {[...employees].sort((a, b) => {
              const priorityDiff = roleSortPriority(a.role) - roleSortPriority(b.role);
              if (priorityDiff !== 0) return priorityDiff;
              return a.name.localeCompare(b.name);
            }).map((emp) => (
              <div key={emp.id} className="grid grid-cols-[80px_repeat(7,1fr)_36px] sm:grid-cols-[110px_repeat(7,1fr)_46px]">
                {/* Employee Name Cell */}
                <div className="px-1 sm:px-2 py-1 border-r border-b border-border flex items-start">
                  <div>
                    <p className="text-xs font-medium text-foreground truncate">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                  </div>
                </div>

                {/* Day Cells */}
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const cellId = `${emp.id}:${dateStr}`;
                  const cellAssignments = assignmentMap[cellId] ?? [];
                  const dayAbbr = format(day, 'EEE');
                  const hasApprovedTimeOff = timeOffSet.has(cellId);
                  const isUnavailable = hasApprovedTimeOff || (emp.availability && !emp.availability.includes(dayAbbr));

                  const empTimeAvail = availabilityTimeMap[emp.id]?.[dayAbbr];
                  const hasTimeRestriction = empTimeAvail && (empTimeAvail.start_time !== '00:00' || empTimeAvail.end_time !== '23:59');

                  return (
                    <CalendarCell
                      key={cellId}
                      id={cellId}
                      isToday={isToday(day)}
                      unavailable={isUnavailable}
                      unavailableLabel={hasApprovedTimeOff ? 'Time Off' : undefined}
                      timeRestriction={hasTimeRestriction && cellAssignments.length === 0 ? `${empTimeAvail.start_time}–${empTimeAvail.end_time}` : undefined}
                      onClick={() => handleCellClick(emp.id, dateStr)}
                    >
                      {cellAssignments.map((a) => (
                        <ShiftCard
                          key={a.id}
                          assignment={a}
                          onDelete={() => setDeletingAssignment(a)}
                        />
                      ))}
                    </CalendarCell>
                  );
                })}

                {/* Total Hours Cell */}
                <div className="px-2 py-1 border-b border-border flex items-center justify-center">
                  {(() => {
                    let totalMinutes = 0;
                    weekDays.forEach((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      // Skip days with approved time off
                      if (timeOffSet.has(`${emp.id}:${dateStr}`)) return;
                      const cellAssignments = assignmentMap[`${emp.id}:${dateStr}`] ?? [];
                      cellAssignments.forEach((a) => {
                        if (a.actual_start && a.actual_end) {
                          totalMinutes += (new Date(a.actual_end).getTime() - new Date(a.actual_start).getTime()) / 60000;
                        }
                      });
                    });
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = Math.round(totalMinutes % 60);
                    return (
                      <span className={`text-xs font-semibold ${totalMinutes > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {totalMinutes > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : '0h'}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}

            {/* Daily Shift Category Summary Row */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)_36px] sm:grid-cols-[110px_repeat(7,1fr)_46px] border-t border-border bg-muted/30">
              <div className="p-1 sm:p-2 border-r border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Summary</span>
              </div>
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const counts = { morning: 0, afternoon: 0, evening: 0 };
                employees.forEach((emp) => {
                  if (timeOffSet.has(`${emp.id}:${dateStr}`)) return;
                  const cellAssignments = assignmentMap[`${emp.id}:${dateStr}`] ?? [];
                  cellAssignments.forEach((a) => {
                    if (!a.shifts?.is_all_day && a.shifts?.start_time) {
                      const h = new Date(a.shifts.start_time).getUTCHours();
                      if (h >= 6 && h < 12) counts.morning++;
                      else if (h >= 12 && h < 18) counts.afternoon++;
                      else counts.evening++;
                    }
                  });
                });
                const lines: { short: string; full: string }[] = [];
                if (counts.morning > 0) lines.push({ short: `${counts.morning}M`, full: `${counts.morning} × Morning` });
                if (counts.afternoon > 0) lines.push({ short: `${counts.afternoon}A`, full: `${counts.afternoon} × Afternoon` });
                if (counts.evening > 0) lines.push({ short: `${counts.evening}E`, full: `${counts.evening} × Evening` });
                return (
                  <div key={dateStr} className={`p-0.5 sm:p-2 border-r border-border text-center ${isToday(day) ? 'bg-primary-light/20' : ''}`}>
                    {lines.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col items-center gap-0">
                        {lines.map((line) => (
                          <p key={line.full} className="text-[10px] font-medium text-muted-foreground leading-tight">
                            <span className="sm:hidden">{line.short}</span>
                            <span className="hidden sm:inline">{line.full}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="p-2 flex items-center justify-center">
                {(() => {
                  let totalMinutes = 0;
                  employees.forEach((emp) => {
                    weekDays.forEach((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      if (timeOffSet.has(`${emp.id}:${dateStr}`)) return;
                      const cellAssignments = assignmentMap[`${emp.id}:${dateStr}`] ?? [];
                      cellAssignments.forEach((a) => {
                        if (a.actual_start && a.actual_end) {
                          totalMinutes += (new Date(a.actual_end).getTime() - new Date(a.actual_start).getTime()) / 60000;
                        }
                      });
                    });
                  });
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = Math.round(totalMinutes % 60);
                  return (
                    <span className={`text-xs font-semibold ${totalMinutes > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {totalMinutes > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : '0h'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeId && (() => {
              if (activeAssignment) {
                return (
                  <div className="rounded-md border border-primary bg-primary-light p-2 shadow-lg opacity-90 min-w-[120px]">
                    <p className="text-xs font-semibold text-primary">{activeAssignment.shifts?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{activeAssignment.employees?.name}</p>
                  </div>
                );
              }
              const templateShift = shifts.find(s => `template:${s.id}` === activeId);
              if (templateShift) {
                return (
                  <div className="rounded-md border border-primary bg-primary-light p-2 shadow-lg opacity-90 min-w-[120px]">
                    <p className="text-xs font-semibold text-primary">{templateShift.name}</p>
                    <p className="text-[10px] text-muted-foreground">Drop on calendar</p>
                  </div>
                );
              }
              return null;
            })()}
          </DragOverlay>
        </>
      )}

      {/* Edit/Create Assignment Modal */}
      <EditAssignmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        assignment={editingAssignment}
        employees={employees}
        shifts={shifts}
        employerId={employerId}
        defaultDate={defaultDate}
        defaultEmployeeId={defaultEmployeeId}
        workplaceId={workplaceId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAssignment} onOpenChange={(o) => { if (!o) setDeletingAssignment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-semibold text-foreground">{deletingAssignment?.shifts?.name}</span> assignment
              for <span className="font-semibold text-foreground">{deletingAssignment?.employees?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAssignment.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Right sidebar - Shift Templates + Publish Panel */}
      <div className={cn(
        'hidden lg:flex lg:flex-col gap-4 flex-shrink-0 transition-all duration-200 print-hide',
        rightSidebarCollapsed ? 'w-10' : 'w-52'
      )}>
        {rightSidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mx-auto"
            onClick={() => setRightSidebarCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setRightSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <ShiftTemplateSidebar shifts={shifts} onAssignShift={() => {
              setEditingAssignment(null);
              setDefaultDate(format(new Date(), 'yyyy-MM-dd'));
              setDefaultEmployeeId('');
              setModalOpen(true);
            }} />
          </>
        )}
      </div>
    </div>
    </DndContext>
  );
}
