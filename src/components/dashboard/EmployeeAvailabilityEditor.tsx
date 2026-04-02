import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { DayTimeRange } from '@/hooks/use-employee-availability';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface EmployeeAvailabilityEditorProps {
  editing: boolean;
  availability: string[];
  dayRanges: DayTimeRange[];
  onToggleDay: (day: string) => void;
  onChangeTime: (day: string, field: 'start_time' | 'end_time', value: string) => void;
}

export function EmployeeAvailabilityEditor({ editing, availability, dayRanges, onToggleDay, onChangeTime }: EmployeeAvailabilityEditorProps) {
  if (!editing) {
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="h-3.5 w-3.5" /> Availability
        </Label>
        <div className="flex flex-wrap gap-1">
          {ALL_DAYS.map(day => (
            <Badge
              key={day}
              variant={availability.includes(day) ? 'default' : 'outline'}
              className="text-xs"
            >
              {day}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="h-3.5 w-3.5" /> Availability
      </Label>
      <div className="space-y-2">
        {dayRanges.map(dr => (
          <div key={dr.day} className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 w-14 cursor-pointer">
              <Checkbox
                checked={dr.enabled}
                onCheckedChange={() => onToggleDay(dr.day)}
              />
              <span className="text-xs font-medium text-foreground">{dr.day}</span>
            </label>
            {dr.enabled && (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  type="time"
                  value={dr.start_time}
                  onChange={e => onChangeTime(dr.day, 'start_time', e.target.value)}
                  className="h-7 text-xs w-[100px]"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="time"
                  value={dr.end_time}
                  onChange={e => onChangeTime(dr.day, 'end_time', e.target.value)}
                  className="h-7 text-xs w-[100px]"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
