import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { Employee, Shift } from '@/hooks/use-dashboard-data';
import {
  useCreateAssignment,
  useUpdateAssignment,
  checkConflict,
  type AssignmentWithDetails,
} from '@/hooks/use-calendar-data';

interface EditAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: AssignmentWithDetails | null;
  employees: Employee[];
  shifts: Shift[];
  employerId: string;
  defaultDate?: string;
  defaultEmployeeId?: string;
}

function formatShiftTime(shift: Shift): string {
  const s = new Date(shift.start_time);
  const e = new Date(shift.end_time);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function EditAssignmentModal({
  open,
  onOpenChange,
  assignment,
  employees,
  shifts,
  employerId,
  defaultDate,
  defaultEmployeeId,
}: EditAssignmentModalProps) {
  const isEdit = !!assignment;
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [conflictWarning, setConflictWarning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  // Re-initialize form state when modal opens or assignment changes
  useEffect(() => {
    if (open) {
      if (assignment) {
        setEmployeeId(assignment.employee_id);
        setShiftId(assignment.shift_id);
        setDate(assignment.assigned_date);
        setStartTime(assignment.actual_start ? assignment.actual_start.slice(0, 16) : '');
        setEndTime(assignment.actual_end ? assignment.actual_end.slice(0, 16) : '');
      } else {
        setEmployeeId(defaultEmployeeId ?? '');
        setShiftId('');
        setDate(defaultDate ?? '');
        setStartTime('');
        setEndTime('');
      }
      setConflictWarning(false);
      setErrors({});
    }
  }, [open, assignment, defaultDate, defaultEmployeeId]);

  // When a shift is selected, auto-fill start/end times using the selected date
  const handleShiftChange = (id: string) => {
    setShiftId(id);
    const shift = shifts.find((s) => s.id === id);
    if (shift) {
      const currentDate = date || format(new Date(), 'yyyy-MM-dd');
      const sDate = new Date(shift.start_time);
      const eDate = new Date(shift.end_time);
      const sHours = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
      const eHours = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;
      setStartTime(`${currentDate}T${sHours}`);
      setEndTime(`${currentDate}T${eHours}`);
      if (!date) setDate(currentDate);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!employeeId) errs.employeeId = 'Select an employee';
    if (!shiftId) errs.shiftId = 'Select a shift';
    if (!date) errs.date = 'Select a date';
    if (!startTime) errs.startTime = 'Start time is required';
    if (!endTime) errs.endTime = 'End time is required';
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      errs.endTime = 'End time must be after start time';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const hasConflict = await checkConflict(
        employeeId,
        date,
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString(),
        assignment?.id
      );

      if (hasConflict && !conflictWarning) {
        setConflictWarning(true);
        return;
      }

      if (isEdit && assignment) {
        await updateAssignment.mutateAsync({
          id: assignment.id,
          employee_id: employeeId,
          shift_id: shiftId,
          assigned_date: date,
          actual_start: new Date(startTime).toISOString(),
          actual_end: new Date(endTime).toISOString(),
          conflict_resolved: hasConflict,
        });
        toast({ title: 'Assignment updated' });
      } else {
        await createAssignment.mutateAsync({
          employer_id: employerId,
          employee_id: employeeId,
          shift_id: shiftId,
          assigned_date: date,
          actual_start: new Date(startTime).toISOString(),
          actual_end: new Date(endTime).toISOString(),
          conflict_resolved: hasConflict,
        });
        toast({ title: 'Assignment created' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assignment' : 'Assign Shift'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the shift assignment details.' : 'Select an existing shift to assign to an employee.'}
          </DialogDescription>
        </DialogHeader>

        {conflictWarning && (
          <div className="flex items-start gap-3 rounded-lg border border-warning bg-warning/10 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Schedule Conflict Detected</p>
              <p className="text-sm text-muted-foreground">
                This employee already has an overlapping shift. Submit again to assign anyway.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setConflictWarning(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-sm text-error">{errors.employeeId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Shift *</Label>
            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No shifts created yet. Go to the Shifts tab to create one first.</p>
            ) : (
              <Select value={shiftId} onValueChange={handleShiftChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({formatShiftTime(s)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.shiftId && <p className="text-sm text-error">{errors.shiftId}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setConflictWarning(false); }}
            />
            {errors.date && <p className="text-sm text-error">{errors.date}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Time *</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setConflictWarning(false); }}
              />
              {errors.startTime && <p className="text-sm text-error">{errors.startTime}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Time *</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setConflictWarning(false); }}
              />
              {errors.endTime && <p className="text-sm text-error">{errors.endTime}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAssignment.isPending || updateAssignment.isPending || shifts.length === 0}
              className={conflictWarning ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}
            >
              {conflictWarning
                ? 'Assign Anyway'
                : isEdit
                  ? 'Save Changes'
                  : 'Assign Shift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
