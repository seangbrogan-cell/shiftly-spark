import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCreateShift, useUpdateShift, type Shift } from '@/hooks/use-dashboard-data';
import { SHIFT_COLOR_OPTIONS } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';

interface ShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
  editingShift?: Shift | null;
  workplaceId?: string;
}

function isoToTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ShiftModal({ open, onOpenChange, employerId, editingShift, workplaceId }: ShiftModalProps) {
  const [name, setName] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();

  const isEditing = !!editingShift;

  useEffect(() => {
    if (editingShift) {
      setName(editingShift.name);
      const allDay = (editingShift as any).is_all_day ?? false;
      setIsAllDay(allDay);
      if (!allDay && editingShift.start_time && editingShift.end_time) {
        setStartTime(isoToTimeInput(editingShift.start_time));
        setEndTime(isoToTimeInput(editingShift.end_time));
      }
      setNotes(editingShift.notes ?? '');
      setColor((editingShift as any).color ?? null);
    }
  }, [editingShift]);

  const resetForm = () => {
    setName('');
    setIsAllDay(false);
    setStartTime('06:00');
    setEndTime('14:00');
    setNotes('');
    setColor(null);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Shift name is required';
    if (!isAllDay) {
      if (!startTime) errs.startTime = 'Start time is required';
      if (!endTime) errs.endTime = 'End time is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const refDate = '2000-01-01';
    const nextDate = '2000-01-02';
    const isOvernight = !isAllDay && endTime <= startTime;

    try {
      const shiftData: any = {
        name: name.trim(),
        is_all_day: isAllDay,
        start_time: isAllDay ? null : new Date(`${refDate}T${startTime}:00`).toISOString(),
        end_time: isAllDay ? null : new Date(`${isOvernight ? nextDate : refDate}T${endTime}:00`).toISOString(),
        notes: notes.trim() || null,
        color: color || null,
      };

      if (isEditing) {
        await updateShift.mutateAsync({ id: editingShift.id, ...shiftData });
        toast({ title: 'Shift updated' });
      } else {
        await createShift.mutateAsync({ employer_id: employerId, workplace_id: workplaceId, ...shiftData } as any);
        toast({ title: 'Shift created' });
      }
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const isPending = createShift.isPending || updateShift.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this shift template.' : 'Create a reusable shift template for your team.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="shift-name">Shift Name *</Label>
            <Input id="shift-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={isAllDay ? "e.g. Holiday, Sick Leave" : "Morning Shift"} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="all-day-toggle" className="text-sm font-medium">All Day / No Time</Label>
              <p className="text-xs text-muted-foreground">For holidays, leave, days off, etc.</p>
            </div>
            <Switch id="all-day-toggle" checked={isAllDay} onCheckedChange={setIsAllDay} />
          </div>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="shift-start">Start Time *</Label>
                <Input id="shift-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                {errors.startTime && <p className="text-sm text-destructive">{errors.startTime}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shift-end">End Time *</Label>
                <Input id="shift-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                {errors.endTime && <p className="text-sm text-destructive">{errors.endTime}</p>}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  'h-7 px-2.5 rounded-md border text-xs font-medium transition-all',
                  color === null
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border bg-muted text-muted-foreground hover:border-primary/50'
                )}
              >
                Default
              </button>
              {SHIFT_COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium transition-all',
                    color === c.key
                      ? `${c.border} ${c.bg} ${c.text} ring-1 ring-primary/30`
                      : `border-border hover:${c.border} hover:${c.bg}`
                  )}
                >
                  <div className={`h-3 w-3 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Shift')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
