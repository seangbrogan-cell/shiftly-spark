import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Send, Mail, Bell } from 'lucide-react';
import type { AssignmentWithDetails } from '@/hooks/use-calendar-data';
import type { Employee } from '@/hooks/use-dashboard-data';

interface PublishPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignments: AssignmentWithDetails[];
  employees: Employee[];
  weekStart: Date;
  weekEnd: Date;
  channels: string[];
  onPublish: () => Promise<void>;
  isPublishing: boolean;
}

export function PublishPreviewModal({
  open,
  onOpenChange,
  assignments,
  employees,
  weekStart,
  weekEnd,
  channels,
  onPublish,
  isPublishing,
}: PublishPreviewModalProps) {
  const [employeeView, setEmployeeView] = useState(false);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekStart]);

  const assignmentsByEmployee = useMemo(() => {
    const map: Record<string, AssignmentWithDetails[]> = {};
    assignments.forEach((a) => {
      if (!map[a.employee_id]) map[a.employee_id] = [];
      map[a.employee_id].push(a);
    });
    return map;
  }, [assignments]);

  const affectedEmployees = employees.filter((e) => assignmentsByEmployee[e.id]?.length > 0);

  const handlePublish = async () => {
    await onPublish();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Schedule Preview</DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Switch checked={employeeView} onCheckedChange={setEmployeeView} id="view-toggle" />
          <Label htmlFor="view-toggle" className="text-xs sm:text-sm">Show as employee sees it</Label>
        </div>

        {/* Mobile: stacked card layout */}
        <div className="sm:hidden space-y-3">
          {(employeeView ? affectedEmployees.slice(0, 1) : affectedEmployees).map((emp) => (
            <div key={emp.id} className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 border-b border-border">
                <p className="text-xs font-semibold text-foreground">{emp.name}</p>
              </div>
              <div className="grid grid-cols-7 divide-x divide-border">
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayAssignments = assignmentsByEmployee[emp.id]?.filter((a) => a.assigned_date === dateStr) ?? [];
                  return (
                    <div key={dateStr} className="p-0.5 min-h-[48px]">
                      <p className="text-[8px] font-semibold text-muted-foreground text-center">{format(day, 'EEE')}</p>
                      <p className="text-[10px] font-bold text-foreground text-center mb-0.5">{format(day, 'd')}</p>
                      {dayAssignments.map((a) => (
                        <div key={a.id} className="rounded bg-primary/10 px-0.5 py-0.5 mb-0.5">
                          <p className="text-[8px] font-semibold text-primary text-center truncate">{a.shifts?.name}</p>
                          {employeeView && a.actual_start && a.actual_end && (
                            <p className="text-[7px] text-muted-foreground text-center">
                              {format(new Date(a.actual_start), 'ha').toLowerCase()}–{format(new Date(a.actual_end), 'ha').toLowerCase()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: grid layout */}
        <div className="hidden sm:block rounded-lg border border-border overflow-x-auto">
          <div className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-border bg-muted/50">
            <div className="p-2 border-r border-border text-xs font-semibold text-muted-foreground">
              {employeeView ? 'Day' : 'Employee'}
            </div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-2 text-center border-r border-border last:border-r-0">
                <p className="text-xs font-semibold text-muted-foreground">{format(day, 'EEE')}</p>
                <p className="text-sm font-bold text-foreground">{format(day, 'd')}</p>
              </div>
            ))}
          </div>

          {employeeView ? (
            affectedEmployees.slice(0, 1).map((emp) => (
              <div key={emp.id} className="grid grid-cols-[140px_repeat(7,1fr)]">
                <div className="p-2 border-r border-b border-border text-sm font-medium text-foreground truncate">
                  {emp.name}
                </div>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayAssignments = assignmentsByEmployee[emp.id]?.filter((a) => a.assigned_date === dateStr) ?? [];
                  return (
                    <div key={dateStr} className="p-1.5 border-r border-b border-border last:border-r-0 min-h-[60px]">
                      {dayAssignments.map((a) => (
                        <div key={a.id} className="rounded bg-primary/10 p-1 mb-1">
                          <p className="text-[10px] font-semibold text-primary">{a.shifts?.name}</p>
                          {a.actual_start && a.actual_end && (
                            <p className="text-[9px] text-muted-foreground">
                              {format(new Date(a.actual_start), 'h:mm a')} – {format(new Date(a.actual_end), 'h:mm a')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            affectedEmployees.map((emp) => (
              <div key={emp.id} className="grid grid-cols-[140px_repeat(7,1fr)]">
                <div className="p-2 border-r border-b border-border text-sm font-medium text-foreground truncate">
                  {emp.name}
                </div>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayAssignments = assignmentsByEmployee[emp.id]?.filter((a) => a.assigned_date === dateStr) ?? [];
                  return (
                    <div key={dateStr} className="p-1.5 border-r border-b border-border last:border-r-0 min-h-[60px]">
                      {dayAssignments.map((a) => (
                        <div key={a.id} className="rounded bg-primary/10 p-1 mb-1">
                          <p className="text-[10px] font-semibold text-primary">{a.shifts?.name}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Notification info */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mt-2">
          <span>Notifications via:</span>
          {channels.includes('in_app') && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Bell className="h-3 w-3" /> In-App
            </Badge>
          )}
          {channels.includes('email') && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Mail className="h-3 w-3" /> Email
            </Badge>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handlePublish} disabled={isPublishing} className="gap-2">
            <Send className="h-4 w-4" />
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
