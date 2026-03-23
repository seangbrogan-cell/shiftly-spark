import { useDroppable } from '@dnd-kit/core';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Shift } from '@/hooks/use-dashboard-data';
import { DraggableShiftTemplate } from './DraggableShiftTemplate';

interface ShiftTemplateSidebarProps {
  shifts: Shift[];
}

export function ShiftTemplateSidebar({ shifts }: ShiftTemplateSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar-templates' });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-colors',
        isOver && 'border-destructive/50 bg-destructive/5'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Shift Templates</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {isOver ? 'Drop to unassign shift' : 'Drag a shift onto the calendar to assign it.'}
      </p>
      {shifts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No shifts created yet. Add shifts in the Shifts tab.
        </p>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <DraggableShiftTemplate key={shift.id} shift={shift} />
          ))}
        </div>
      )}
    </div>
  );
}
