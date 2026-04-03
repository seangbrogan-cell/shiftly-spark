import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoleTypes, useCreateRoleType, useUpdateRoleTypes, useDeleteRoleType, type RoleType } from '@/hooks/use-role-types';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Plus, Trash2, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RoleManagerProps {
  employerId: string;
}

export function RoleManager({ employerId }: RoleManagerProps) {
  const { data: roles = [], isLoading } = useRoleTypes(employerId);
  const createRole = useCreateRoleType();
  const updateRoles = useUpdateRoleTypes();
  const deleteRole = useDeleteRoleType();
  const { toast } = useToast();
  const [newRoleName, setNewRoleName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleAdd = async () => {
    const name = newRoleName.trim();
    if (!name) return;
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Role already exists', variant: 'destructive' });
      return;
    }
    try {
      await createRole.mutateAsync({
        employer_id: employerId,
        name,
        sort_order: roles.length,
      });
      setNewRoleName('');
      toast({ title: 'Role added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (role: RoleType) => {
    try {
      await deleteRole.mutateAsync({ id: role.id, employer_id: employerId });
      toast({ title: `Removed "${role.name}"` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...roles];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    // Save reorder
    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));
    updateRoles.mutate({ roles: updates, employer_id: employerId });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Manage Role Types
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Drag to reorder. Top roles appear first on the schedule.</p>
        <div className="space-y-1">
          {roles.map((role, index) => (
            <div
              key={role.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-card cursor-grab active:cursor-grabbing ${dragIndex === index ? 'opacity-50' : ''}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm font-medium">{role.name}</span>
              <span className="text-xs text-muted-foreground mr-2">#{index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDelete(role)}
                aria-label={`Remove ${role.name}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="New role name…"
            className="h-9"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <Button size="sm" onClick={handleAdd} disabled={!newRoleName.trim() || createRole.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
