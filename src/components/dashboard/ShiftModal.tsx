import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCreateShift } from '@/hooks/use-dashboard-data';

interface ShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
}

export function ShiftModal({ open, onOpenChange, employerId }: ShiftModalProps) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const createShift = useCreateShift();

  const resetForm = () => {
    setName('');
    setStartTime('06:00');
    setEndTime('14:00');
    setNotes('');
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Shift name is required';
    if (!startTime) errs.startTime = 'Start time is required';
    if (!endTime) errs.endTime = 'End time is required';
    // Allow overnight shifts (end time before start time means next day)
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Store times using a fixed reference date (only hours/minutes matter)
      const refDate = '2000-01-01';
      const nextDate = '2000-01-02';
      const isOvernight = endTime <= startTime;
      await createShift.mutateAsync({
        employer_id: employerId,
        name: name.trim(),
        start_time: new Date(`${refDate}T${startTime}:00`).toISOString(),
        end_time: new Date(`${isOvernight ? nextDate : refDate}T${endTime}:00`).toISOString(),
        notes: notes.trim() || null,
      });
      toast({ title: 'Shift created' });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Shift</DialogTitle>
          <DialogDescription>Create a reusable shift template for your team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="shift-name">Shift Name *</Label>
            <Input id="shift-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning Shift" />
            {errors.name && <p className="text-sm text-error">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="shift-start">Start Time *</Label>
              <Input id="shift-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              {errors.startTime && <p className="text-sm text-error">{errors.startTime}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shift-end">End Time *</Label>
              <Input id="shift-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              {errors.endTime && <p className="text-sm text-error">{errors.endTime}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-notes">Notes</Label>
            <Textarea id="shift-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createShift.isPending}>
              {createShift.isPending ? 'Creating...' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
