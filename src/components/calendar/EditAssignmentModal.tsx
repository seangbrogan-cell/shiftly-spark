import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
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
  const [employeeId, setEmployeeId] = useState(assignment?.employee_id ?? defaultEmployeeId ?? '');
  const [shiftId, setShiftId] = useState(assignment?.shift_id ?? '');
  const [date, setDate] = useState(assignment?.assigned_date ?? defaultDate ?? '');
  const [startTime, setStartTime] = useState(
    assignment?.actual_start ? assignment.actual_start.slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    assignment?.actual_end ? assignment.actual_end.slice(0, 16) : ''
  );
  const [conflictWarning, setConflictWarning] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  const resetForm = () => {
    setEmployeeId(defaultEmployeeId ?? '');
    setShiftId('');
    setDate(defaultDate ?? '');
    setStartTime('');
    setEndTime('');
    setConflictWarning(false);
    setErrors({});
  };

  // When a shift is selected, auto-fill start/end times
  const handleShiftChange = (id: string) => {
    setShiftId(id);
    const shift = shifts.find((s) => s.id === id);
    if (shift && date) {
      // Use the shift's default times but on the selected date
      const sDate = new Date(shift.start_time);
      const eDate = new Date(shift.end_time);
      const datePrefix = date;
      const sHours = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
      const eHours = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;
      setStartTime(`${datePrefix}T${sHours}`);
      setEndTime(`${datePrefix}T${eHours}`);
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
      // Check for conflicts
      const hasConflict = await checkConflict(
        employeeId,
        date,
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString(),
        assignment?.id
      );

      if (hasConflict && !conflictWarning) {
        setConflictWarning(true);
        return; // Show warning first, user can submit again to force
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
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assignment' : 'Assign Shift'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the shift assignment details.' : 'Assign a shift to an employee.'}
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
            <Select value={shiftId} onValueChange={handleShiftChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAssignment.isPending || updateAssignment.isPending}
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
