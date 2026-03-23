import type { Shift } from '@/hooks/use-dashboard-data';
import { Clock } from 'lucide-react';

interface ShiftListProps {
  shifts: Shift[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ShiftList({ shifts }: ShiftListProps) {
  if (shifts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">No shifts created yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shifts.map((shift) => (
        <div key={shift.id} className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{shift.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
              </p>
              {shift.notes && (
                <p className="mt-1 text-sm text-muted-foreground truncate">{shift.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
