import { useState, useMemo } from 'react';
import { format, addWeeks, subWeeks, isToday, startOfWeek } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import type { Employee, Shift } from '@/hooks/use-dashboard-data';
import {
  useWeeklyAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  getWeekDays,
  type AssignmentWithDetails,
} from '@/hooks/use-calendar-data';
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
}

export function WeeklyCalendar({ employees, shifts, employerId }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithDetails | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentWithDetails | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>('');
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useWeeklyAssignments(currentWeek);
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const { toast } = useToast();
  const { data: publishStatus } = useWeekPublishStatus(currentWeek);

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

      const startDate = new Date(`${newDate}T${new Date(shiftTemplate.start_time).toISOString().slice(11, 19)}`);
      const endDate = new Date(`${newDate}T${new Date(shiftTemplate.end_time).toISOString().slice(11, 19)}`);

      try {
        await createAssignment.mutateAsync({
          shift_id: shiftTemplate.id,
          employee_id: newEmployeeId,
          employer_id: employerId,
          assigned_date: newDate,
          actual_start: startDate.toISOString(),
          actual_end: endDate.toISOString(),
        });
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
      {/* Calendar Header / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-foreground">Schedule</h2>
            <StatusBadge
              status={publishStatus?.status ?? 'no_schedule'}
              publishedAt={publishStatus?.publishedAt ?? null}
            />
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
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            <CalendarDays className="h-4 w-4 mr-1.5" /> Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingAssignment(null);
              setDefaultDate(format(new Date(), 'yyyy-MM-dd'));
              setDefaultEmployeeId('');
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Assign Shift
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
            <div className="grid grid-cols-[180px_repeat(7,1fr)_80px] border-b border-border sticky top-0 bg-card z-10">
              <div className="p-3 border-r border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</span>
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-r border-border ${isToday(day) ? 'bg-primary-light/30' : ''}`}
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{format(day, 'EEE')}</p>
                  <p className={`text-lg font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
              <div className="p-3 text-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</span>
              </div>
            </div>

            {/* Employee Rows */}
            {employees.map((emp) => (
              <div key={emp.id} className="grid grid-cols-[180px_repeat(7,1fr)_80px]">
                {/* Employee Name Cell */}
                <div className="p-3 border-r border-b border-border flex items-start">
                  <div>
                    <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role}</p>
                  </div>
                </div>

                {/* Day Cells */}
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const cellId = `${emp.id}:${dateStr}`;
                  const cellAssignments = assignmentMap[cellId] ?? [];

                  return (
                    <CalendarCell
                      key={cellId}
                      id={cellId}
                      isToday={isToday(day)}
                      onClick={() => handleCellClick(emp.id, dateStr)}
                    >
                      {cellAssignments.map((a) => (
                        <ShiftCard
                          key={a.id}
                          assignment={a}
                          onClick={() => handleAssignmentClick(a)}
                          onDelete={() => setDeletingAssignment(a)}
                        />
                      ))}
                    </CalendarCell>
                  );
                })}

                {/* Total Hours Cell */}
                <div className="p-3 border-b border-border flex items-center justify-center">
                  {(() => {
                    let totalMinutes = 0;
                    weekDays.forEach((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
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
                      <span className={`text-sm font-semibold ${totalMinutes > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {totalMinutes > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : '0h'}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
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
      <div className="hidden lg:flex lg:flex-col gap-4 w-64 flex-shrink-0">
        <ShiftTemplateSidebar shifts={shifts} />
        <PublishPanel
          employerId={employerId}
          currentWeek={currentWeek}
          employees={employees}
          shifts={shifts}
        />
      </div>
    </div>
    </DndContext>
  );
}
