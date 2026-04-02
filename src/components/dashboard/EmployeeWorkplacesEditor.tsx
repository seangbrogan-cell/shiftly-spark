import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkplaces } from '@/hooks/use-workplaces';
import { useEmployeeWorkplaces } from '@/hooks/use-employee-workplaces';
import { Building2 } from 'lucide-react';

interface EmployeeWorkplacesEditorProps {
  employeeId: string;
  employerId: string;
  editing: boolean;
  selectedIds: string[];
  onChangeIds: (ids: string[]) => void;
}

export function EmployeeWorkplacesEditor({ employeeId, employerId, editing, selectedIds, onChangeIds }: EmployeeWorkplacesEditorProps) {
  const { data: workplaces = [] } = useWorkplaces(employerId);
  const { data: assignedWorkplaces = [] } = useEmployeeWorkplaces(employeeId);

  const assignedNames = assignedWorkplaces
    .map(aw => workplaces.find(w => w.id === aw.workplace_id)?.name)
    .filter(Boolean);

  if (!editing) {
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Building2 className="h-3.5 w-3.5" /> Workplaces
        </Label>
        <p className="text-sm text-foreground">
          {assignedNames.length > 0 ? assignedNames.join(', ') : '—'}
        </p>
      </div>
    );
  }

  const toggle = (wpId: string) => {
    onChangeIds(
      selectedIds.includes(wpId)
        ? selectedIds.filter(id => id !== wpId)
        : [...selectedIds, wpId]
    );
  };

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Building2 className="h-3.5 w-3.5" /> Workplaces
      </Label>
      <div className="space-y-2">
        {workplaces.map(wp => (
          <label key={wp.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selectedIds.includes(wp.id)}
              onCheckedChange={() => toggle(wp.id)}
            />
            <span className="text-foreground">{wp.name}</span>
          </label>
        ))}
        {workplaces.length === 0 && (
          <p className="text-xs text-muted-foreground">No workplaces configured.</p>
        )}
      </div>
    </div>
  );
}
